// @ts-nocheck
// display.js — Map rendering and terminal output.
// C ref: display.c — newsym, show_glyph, docrt, cls, flush_screen.
import { game } from './gstate.js';
import { getnow } from './allmain.js';
import { nh_basename } from './files.js';
import { pmatch } from './strutil.js';
import { status_fieldname, COND_NAMES } from './options.js';
import { newuexp } from './exper_pure.js';
import { classifyTerrain } from './terrain-status.js';
import { collectScreenDescriptionClasses as collectDescriptionClasses } from './look-class-description.js';
import { is_pool } from './look.js';
import { PM_HUMAN, PM_ELF } from './pm.generated.js';
import * as pmNumbers from './pm.generated.js';
import { waterbody_name, key2txt, invocation_pos, recalc_mapseen_rooms, set_msg_xy } from './cmd.js';
import { On_stairs, strNsubst } from './mklev.js';
import { Inhell } from './makemon.js';
import { glyph_to_cmap as glyph_to_cmap_real, glyphmap } from './glyphs.js';
import { symbol_name, primary_showsym, primary_unicode_symbol, rogue_showsyms, symset_cell, defsym_char, SYM_OFFSETS } from './symbols.js';
import { see_wsegs, worm_seg_at, worm_known as worm_known_real, detect_wsegs } from './worm.js';
import { cansee, couldsee, vision_recalc, Blind, unblock_point } from './vision.js';
import { rloc } from './teleport.js';
import { RLOC_NOMSG, IN_SIGHT, COULD_SEE } from './const.js';
import { NON_PM, MIGR_EXACT_XY, MALE, FEMALE, NEUTRAL, has_mgivenname, MGIVENNAME } from './const.js';
import monsPack from './makemon_mons.json' with { type: 'json' };
import monPmnamesPack from './makemon_pmnames.json' with { type: 'json' };
import monAcPack from './makemon_ac.json' with { type: 'json' };
import monMattkPack from './makemon_mattk.json' with { type: 'json' };
import { observe_object } from './o_init.js';
import { sticks } from './dog.js';
import { can_reach_floor } from './hold_another_object.js';
import { SEE_INVIS, TELEPAT, DETECT_MONSTERS, INVIS, INTRINSIC, I_SPECIAL, BOLT_LIM, PROT_FROM_SHAPE_CHANGERS } from './const.js';
import { MAX_TYPE, TT_LAVA, TT_BURIEDBALL } from './const.js';
import { W_QUIVER, W_SWAPWEP, W_BALL, W_SADDLE, DISMOUNT_THROWN } from './const.js';
import { PICK_ONE, PICK_ANY, DEVTEAM_EMAIL, BOTL_NSIZ, TERMINAL_ROWS, TERMINAL_COLS } from './const.js';
import { u_at, is_pit, BEAR_TRAP, WEB } from './const.js';
/* C ref: include/align.h:29-39 — altar_to_glyph's alignment-mask tests. */
import { AM_MASK, AM_SANCTUM, AM_LAWFUL, AM_NEUTRAL, AM_CHAOTIC } from './const.js';
import { SICK, STONED, STRANGLED, SLIMED, SICK_VOMITABLE, SICK_NONVOMITABLE } from './const.js';
import { BLINDED, CONFUSION, STUNNED, WOUNDED_LEGS, INFRAVISION, WARNING, WARN_OF_MON, FLYING, LEVITATION, HALLUC, HALLUC_RES, DEAF, Is_rogue_level, Is_waterlevel, Is_airlevel, LA_DOWN, In_mines, In_sokoban, Is_knox_level } from './const.js';

function _display_hallucinating() {
    const u = game.u;
    const hp = u?.uprops?.[HALLUC];
    const hrp = u?.uprops?.[HALLUC_RES];
    return !!(((hp?.intrinsic | 0) || (hp?.extrinsic | 0))
              && !((hrp?.intrinsic | 0) || (hrp?.extrinsic | 0)));
}
import { COLNO, ROWNO, STONE, ROOM, CORR, ICE, DOOR, STAIRS, LADDER, SDOOR, SCORR, TREE, POOL, MOAT, WATER, DRAWBRIDGE_UP, DBWALL, LAVAPOOL, LAVAWALL, IRONBARS, FOUNTAIN, THRONE, SINK, GRAVE, ALTAR, DRAWBRIDGE_DOWN, AIR, CLOUD, HWALL, VWALL, TLCORNER, TRCORNER, BLCORNER, BRCORNER, CROSSWALL, TUWALL, TDWALL, TLWALL, TRWALL, D_ISOPEN, D_CLOSED, D_LOCKED, gs, H_DEC, H_IBM, PRIMARYSET, WM_MASK, WM_T_LONG, WM_T_BL, WM_T_BR, WM_C_OUTER, WM_C_INNER, WM_X_TL, WM_X_TR, WM_X_BL, WM_X_BR, WM_X_TLBR, WM_X_BLTR, SV0, SV1, SV2, SV3, SV4, SV5, SV6, SV7, SVALL, isok, } from './const.js';
import { NO_COLOR, CLR_GRAY, CLR_RED, CLR_GREEN, CLR_BROWN, CLR_BLUE, CLR_CYAN, CLR_WHITE, CLR_YELLOW, CLR_BRIGHT_BLUE, CLR_BLACK, CLR_MAGENTA, CLR_ORANGE, CLR_BRIGHT_GREEN, CLR_BRIGHT_MAGENTA, DEC_TO_UNICODE, ATR_BOLD, ATR_INVERSE } from './terminal.js';
import { match_str2clr, rgbstr_to_int32, clr2colorname, attrnames } from './coloratt.js';
import { OC_NAME } from './oc_name_data.js';
import { OC_DESCR } from './oc_descr_data.js';
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
/* PM_LONG_WORM = 114 (js/pm.generated.js:120); map_monst's showtail arm. */
const PM_LONG_WORM_DISP = 114;
import { engr_at, engravings_list } from './mklev.js';
import { acurr } from './attrib.js';
import { A_STR, A_INT, A_WIS, A_DEX, A_CON, A_CHA } from './const.js';
import { CORPSTAT_GENDER, CORPSTAT_FEMALE } from './const.js';
import { t_at } from './trap.js';
import { visible_region_at } from './region.js';
import { is_pool_or_lava } from './look.js';
/* C rnd.c:64 rn2_on_display_rng — the DISP isaac64 context, deliberately NOT
 * the scored stream (js/rng.js:239).  Used by swallow_to_glyph's what_mon. */
import { rn2_on_display_rng, cosmic_display_push_owner as cosmic_push_owner_real, cosmic_display_pop_owner as cosmic_pop_owner_real, pushRngLogEntry, getRngLog } from './rng.js';
import { nhgetch } from './input.js';
import { raw_print } from './rawterm.js';
import { near_capacity } from './weight.js';
import { describe_level_buf } from './dungeon.js';
import { update_inventory, hcolor, is_youmonst } from './mhitm.js';
import { ARTILIST, otense, helm_simple_name, bare_artifactname } from './objnam.js';
import { weapon_type, weapon_descr } from './uhitm.js';
import { bimanual } from './do_wear.js';
import { humanoid } from './makemon.js';
import { P_QUARTERSTAFF, P_MORNING_STAR, P_POLEARMS, P_UNICORN_HORN, P_LANCE } from './const.js';
// WRITE-ONLY route-attribution telemetry (inert unless NH_ROUTE_TELEMETRY=1 —
import { routeTag } from './route_telemetry.js';
/* C youprop.h:399 Unaware = (gm.multi < 0 && (unconscious() || is_fainted())).
 * Both leaves are ported; these are the exported bodies js/cmd.js's
 * _goto_level_You_hear already calls, so You_hear below reads the same state
 * that file does rather than growing a tenth private approximation. */
import { unconscious } from './pickup.js';
import { MKOBJ_OC_MATERIAL } from './mkobj_erosion_meta.js';
import { KILLED_BY, HALF_PHDAM, LOW_PM, RUN_CRAWL } from './const.js';
import { rnd as _rt_rnd } from './rng.js';
import { touch_artifact_youmonst as _rt_touch_artifact_youmonst, bane_applies_hero as _rt_bane_applies_hero } from './wizcmds.js';
import { hates_silver as _rt_hates_silver, which_armor as _rt_which_armor } from './makemon.js';
import { losehp as _rt_losehp, is_ice, db_under_typ } from './dokick.js';
import { exercise as _rt_exercise, arti_cary_adtyp, arti_cspfx, arti_inv_prop } from './attrib.js';
import { W_ARTI, LAST_PROP } from './const.js';
import { arti_invoke as _rt_arti_invoke } from './cmd.js';
import { coord_desc as _rt_coord_desc, yname as _rt_yname, dropx as _rt_dropx, hitfloor as _rt_hitfloor, freeinv as _rt_freeinv, surface as _rt_surface, maybe_lvltport_feedback as _rt_maybe_lvltport_feedback, dismount_steed as _rt_dismount_steed } from './cmd.js';
import { killer_xname as _rt_killer_xname, Tobjnam as _rt_Tobjnam } from './objnam.js';
import { remove_worn_item as _rt_remove_worn_item } from './steal.js';
import { bypass_obj as _rt_bypass_obj } from './worn.js';
import { clear_bypasses as _rt_clear_bypasses, nxt_unbypassed_obj as _rt_nxt_unbypassed_obj, selftouch as _rt_selftouch } from './trap.js';
import { uncurse as _rt_uncurse } from './mkobj.js';
import { is_fainted } from './eat.js';
import { ENV } from './hostenv.js';
import { dat_content } from './dat_source.js';
import { xcrypt } from './mklev.js';
import { display_text_window, money_cnt } from './com_pager.js';
import { impossible as rumor_impossible } from './pline.js';
import { paniclog, livelog_add } from './files.js';
import { BUFSZ, ECMD_OK } from './const.js';
import { D_TRAPPED } from './const.js';

/* C detect.c:70-102: detection temporarily displays the unconstrained map. */
export function unconstrain_map() {
    const u = game.u;
    const changed = !!(u.uinwater || u.uburied || u.uswallow);
    game.iflags ||= {};
    game.iflags.save_uinwater = u.uinwater;
    game.iflags.save_uburied = u.uburied;
    game.iflags.save_uswallow = u.uswallow;
    u.uinwater = u.uburied = u.uswallow = 0;
    return changed;
}

export async function map_redisplay() {
    const u = game.u, flags = game.iflags;
    u.uinwater = flags.save_uinwater;
    u.uburied = flags.save_uburied;
    u.uswallow = flags.save_uswallow;
    flags.save_uinwater = flags.save_uburied = flags.save_uswallow = 0;
    await docrt();
    if (u.uinwater) await under_water(2);
    if (u.uburied) await under_ground(2);
}

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
    { ch: '^', color: CLR_ORANGE },         // 24 TRAPPED_DOOR (defsym.h:181)
    { ch: '^', color: CLR_ORANGE },         // 25 TRAPPED_CHEST (defsym.h:182)
];
const TRAP_SYM_NAMES = [
    'S_arrow_trap', 'S_dart_trap', 'S_falling_rock_trap', 'S_squeaky_board',
    'S_bear_trap', 'S_land_mine', 'S_rolling_boulder_trap', 'S_sleeping_gas_trap',
    'S_rust_trap', 'S_fire_trap', 'S_pit', 'S_spiked_pit', 'S_hole', 'S_trap_door',
    'S_teleportation_trap', 'S_level_teleporter', 'S_magic_portal', 'S_web',
    'S_statue_trap', 'S_magic_trap', 'S_anti_magic_trap', 'S_polymorph_trap',
    'S_vibrating_square', 'S_trapped_door', 'S_trapped_chest',
];
/* C symbols.c:236-239: a SYMBOLS=S_<trap>:<char> override (ov_primary_syms)
 * replaces the symset character; the colour stays defsym's. */
function trap_table_entry(ttyp) {
    const t = ttyp | 0;
    const tg = (t >= 1 && t <= TRAP_GLYPHS.length) ? TRAP_GLYPHS[t - 1] : null;
    const ov = tg && !rogue_graphics() && game.symbolOverrides?.[TRAP_SYM_NAMES[t - 1]];
    return ov ? { ch: ov, color: tg.color } : tg;
}
/* C ref: display.h trap_to_glyph(trap) → the trap's defsym symbol.  Exported for
 * pager.c's look_traps(), which re-glyphs an obscured trap to its own symbol. */
/* {ch, color} of trap_to_glyph(trap) for a trap type, or null. */
export function trap_glyph_entry(ttyp) {
    return trap_table_entry(ttyp);
}
/* C display.h:630 trap_to_glyph(): unlike sense_trap(), this never hallucinates. */
export function trap_to_glyph(trap) {
    const ttyp = trap.ttyp | 0;
    return { ...trap_table_entry(ttyp), decgfx: false, cls: GLYPHCLS_TRAP, ttyp };
}
export function trap_glyph_char(ttyp) {
    const tg = trap_table_entry(ttyp);
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
    const tg = trap_table_entry(ttyp);
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
// monst_globals_init() (monst.c memcpy from mons_init[]).  The prior table had
// 19 entries stuck at the CLR_GRAY (7) fallback where the real monster carries a
// distinct color (e.g. mndx 333 "caveman" / 337 "priest" = CLR_WHITE(15), used to
// color a caveman/priest *corpse* glyph via mon_color(corpsenm) — display.c:3059).
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
// All entries verified against nethack-c/include/defsym.h PCHAR2 entries 90-152.
// Walls (HWALL/VWALL/corners): defsym CLR_GRAY → JS NO_COLOR (ANSI default=39).
//   NO_COLOR renders at terminal default (no color code emitted), matching
// Stairs: defsym CLR_GRAY (idx 7) but C emits ANSI 93 (CLR_YELLOW idx 11).
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
// 'stone' renders as blank (S_stone).  No RNG.
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
const _WALL_SYM_IBM = {
    vwall: '3', hwall: 'D', tlcorn: 'Z', trcorn: '?', blcorn: '@', brcorn: 'Y',
    crwall: 'E', tuwall: 'A', tdwall: 'B', tlwall: '4', trwall: 'C',
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
/* C pline.c:584-633.  Wall rendering, regions, and resistance checks are synchronous:
 * queue each pline in C order rather than suspending the caller. */
export { _wall_impossible as impossible_sync };
function _wall_impossible(fmt, ...args) {
    const state = game.program_state;
    if (state.in_impossible)
        throw new Error('panic: impossible called impossible');
    state.in_impossible = 1;
    const text = nh_sprintf(fmt, args).slice(0, BUFSZ - 1);
    paniclog('impossible', text);
    if (game.iflags?.debug_fuzzer === 1)
        throw new Error('panic: ' + text);
    urgent_pline('%s', text);
    if (!state.in_sanity_check) {
        pline('%s', 'Program in disorder!' + (state.something_worth_saving
            ? '  (Saving and reloading may fix this problem.)' : ''));
        pline('Please report these messages to %s.', DEVTEAM_EMAIL);
        if (game.sysopt?.support)
            pline('Alternatively, contact local support: %s', game.sysopt.support);
        if (game.sysopt?.crashreporturl)
            throw new Error('impossible: crash-report interface is not ported');
    }
    state.in_impossible = 0;
}

/* C display.c:3453-3502 t_warn(), including the original, unrotated seenv. */
function t_warn(loc) {
    const names = {
        [TUWALL]: 'tuwall', [TLWALL]: 'tlwall', [TRWALL]: 'trwall',
        [TDWALL]: 'tdwall', [VWALL]: 'vwall', [HWALL]: 'hwall',
        [TLCORNER]: 'tlcorner', [TRCORNER]: 'trcorner',
        [BLCORNER]: 'blcorner', [BRCORNER]: 'brcorner',
    };
    _wall_impossible('wall_angle: %s: case %d: seenv = 0x%x',
        names[loc.typ] ?? 'unknown', (loc.flags | 0) & WM_MASK, loc.seenv | 0);
}

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
                else { t_warn(loc); col = 0; }
                break;
            case WM_T_LONG:
                if ((seenv & (SV3 | SV4)) && !(seenv & (SV5 | SV6 | SV7))) col = 1;
                else if ((seenv & (SV6 | SV7)) && !(seenv & (SV3 | SV4 | SV5))) col = 2;
                else if ((seenv & SV5) || ((seenv & (SV3 | SV4)) && (seenv & (SV6 | SV7)))) col = 4;
                else {
                    if (!only(seenv, SV0 | SV1 | SV2)) t_warn(loc);
                    col = 0;
                }
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
            default:
                _wall_impossible('wall_angle: unknown T wall mode %d', wm);
                col = 0;
                break;
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
            default:
                _wall_impossible('wall_angle: unknown vwall mode %d', wm);
                return 'stone';
        }
    }
    if (isHoriz) {
        switch (wm) {
            case 0: return seenv ? 'hwall' : 'stone';
            case 1: return (seenv & (SV3 | SV4 | SV5 | SV6 | SV7)) ? 'hwall' : 'stone';
            case 2: return (seenv & (SV0 | SV1 | SV2 | SV3 | SV7)) ? 'hwall' : 'stone';
            default:
                _wall_impossible('wall_angle: unknown hwall mode %d', wm);
                return 'stone';
        }
    }
    // Corners (display.c:3697-3726 set_corner macro).
    const setCorner = (which, outer, inner) => {
        switch (wm) {
            case 0: return which;
            case WM_C_OUTER: return (seenv & outer) ? which : 'stone';
            case WM_C_INNER: return (seenv & ~inner) ? which : 'stone';
            default:
                _wall_impossible('wall_angle: unknown %s mode %d', which, wm);
                return 'stone';
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
                } else {
                    _wall_impossible('wall_angle: bottom of crwall check');
                    col = 5;
                }
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
            default:
                _wall_impossible('wall_angle: unknown crosswall mode');
                return 'stone';
        }
    }
    _wall_impossible('wall_angle: unexpected wall type %d', typ);
    return 'stone';
}
/* C ref: display.c:2372 back_to_glyph wall arm — TRUE when wall_angle() yields
 * S_stone for this wall/SDOOR (nothing seen yet, or the seen faces show none). */
export function wall_angle_is_stone(loc) {
    if (!(loc.seenv | 0))
        return true;
    return _wall_angle(loc) === 'stone';
}
const _PLAIN_PLUS = new Set(['tlcorn', 'trcorn', 'blcorn', 'brcorn', 'crwall',
                              'tuwall', 'tdwall', 'tlwall', 'trwall']);
function _wall_angle_glyph(loc, decMode) {
    // C ref: display.c:2372 — wall/SDOOR glyph = seenv ? wall_angle : S_stone.
    // SDOOR arboreal -> S_tree (display.c:3650); not present on these levels but
    // mirrored for faithfulness.
    if (loc.typ === SDOOR && loc.candig) /* arboreal_sdoor alias of candig (rm.h:224) */
        return ibm_mode() ? { ch: 'q', color: CLR_GREEN, dec: false } // IBM S_tree \xf1
            : decMode ? { ch: 'g', color: CLR_GREEN, dec: true } // S_tree
            : { ch: '#', color: CLR_GREEN, dec: false };
    // SDOOR arboreal -> S_tree (display.c:2305 back_to_glyph).  rm.h aliases
    // arboreal_sdoor to candig; the port stores it as loc.candig (mkmaze.js).
    if (loc.typ === SDOOR && (loc.arboreal_sdoor || loc.candig))
        return ibm_mode() ? { ch: 'q', color: CLR_GREEN, dec: false } // IBM S_tree \xf1
            : decMode ? { ch: 'g', color: CLR_GREEN, dec: true }
            : { ch: '#', color: CLR_GREEN, dec: false }; // S_tree
    if (!(loc.seenv | 0))
        return { ch: ' ', color: NO_COLOR, dec: false, cmap: 0 }; // S_stone
    const key = _wall_angle(loc);
    return { ..._wall_symbol_glyph(key, decMode, _wall_color()), wallSymbol: key,
             cmap: _WALL_KEY_CMAP[key] };
}
/* C display.c:2609 map_glyphinfo resolves the remembered glyph through the
 * current glyphmap. Keep the wall symbol identity separately from its paint:
 * changing symbol sets must not recompute wall_angle from unseen terrain. */
function _wall_symbol_glyph(key, decMode, wallColor) {
    const sym = _WALL_SYM[key] || _WALL_SYM.stone;
    if (key === 'stone')
        return { ch: (!rogue_graphics() && game.symbolOverrides?.S_stone) || ' ',
                 color: NO_COLOR, dec: false, cmap: 0 };
    /* C ref: display.c:2949-2965 wall_color(<branch>_walls) — a wall cmap glyph
     * is coloured from wallcolors[] per dungeon branch, not from
     * defsyms[S_vwall].color.  See _wall_color() below. */
    /* C ref: symbols.c loadsyms — an explicit SYMBOLS=S_<name>:<char> replaces
     * the symset glyph for that cmap symbol, a plain tty character (not a DEC
     * byte).  The rc's SYMBOLS=S_trcorn:% makes C draw '%' at the intro box's
     * top-right corner (display.c:3688 wall_angle -> S_trcorn). */
    const override = game.symbolOverrides?.[`S_${key}`];
    if (override)
        return { ch: override, color: wallColor, dec: false };
    if (blank_symbols())
        return { ch: ' ', color: wallColor, dec: false };
    /* C dat/symbols `start: plain` (lines 43-54): S_tlcorn..S_trwall are '+',
     * every other symbol keeps its default. */
    if (!decMode && !rogue_graphics()
        && String(gs?.symset?.[PRIMARYSET]?.name ?? '').toLowerCase() === 'plain'
        && _PLAIN_PLUS.has(key))
        return { ch: '+', color: wallColor, dec: false };
    /* C dat/symbols:242-263 IBMgraphics — plain 7-bit letters (see
     * _WALL_SYM_IBM), so dec is false: no charset shift. */
    if (!decMode && ibm_mode())
        return { ch: _WALL_SYM_IBM[key] ?? sym.a, color: wallColor, dec: false };
    return decMode
        ? { ch: sym.d, color: wallColor, dec: true }
        : { ch: sym.a, color: wallColor, dec: false };
}
/* ibm_mode() arm for remembered walls: the IBMgraphics table, consulted on
 * every repaint exactly like the DEC letters (see _refresh_remembered_wall). */
function _refresh_remembered_wall(rg) {
    if (!rg) return;
    if (rg.wallSymbol) {
        const glyph = _wall_symbol_glyph(rg.wallSymbol, dec_mode(), rg.color);
        rg.ch = rogue_ibm_terrain() && _EPYX_WALL[rg.wallSymbol]
            ? _EPYX_WALL[rg.wallSymbol] : glyph.ch;
        rg.decgfx = rogue_ibm_terrain() ? false : glyph.dec;
        return;
    }
    _remap_remembered_ibm(rg);
}
function _remap_remembered_ibm(rg) {
    if (!rg || rg.wallSymbol || !ibm_mode())
        return;
    if ((rg.cls ?? GLYPHCLS_CMAP) !== GLYPHCLS_CMAP)
        return;
    const dec = !!rg.decgfx;
    switch (rg.ch) {
        case '.': case '~':
            /* S_room '.'/'~' and the whole \xfa family land on 'z'; only the
             * pre-alias S_darkroom glyph still paints '.'.  '~' with decgfx
             * already false is an IBM S_vodoor a previous pass wrote. */
            if (rg.ch === '.' || dec) {
                rg.ch = (rg.color === CLR_BLACK && game._symsetDarkroomPending) ? '.' : 'z';
                rg.decgfx = false;
            }
            break;
        case 'a': /* DEC S_vodoor/S_hodoor \xe1 → IBM \xfe '~' */
            if (dec) { rg.ch = '~'; rg.decgfx = false; }
            break;
        case '#': /* S_corr/S_litcorr (ASCII and DEC both '#'); S_vcdbridge/
                   * S_hcdbridge ('#' CLR_BROWN) and S_cloud ('#' CLR_GRAY) are
                   * not in the IBM block and keep '#'. */
            if (rg.color === CLR_WHITE || rg.color === NO_COLOR)
                rg.ch = rg.color === CLR_WHITE ? '1' : '0';
            break;
        case 'g': /* DEC S_tree \xe7 → IBM \xf1 */
            if (dec && rg.color === CLR_GREEN) { rg.ch = 'q'; rg.decgfx = false; }
            break;
        case '|': /* DEC S_bars \xfc → \xf0; S_grave ('|' CLR_WHITE) untouched */
            if (rg.color === CLR_CYAN) { rg.ch = 'p'; rg.decgfx = false; }
            break;
        case '`': /* DEC S_pool/S_water/S_lava/S_lavawall \xe0 → \xf7 */
            if (rg.color === CLR_BLUE || rg.color === CLR_BRIGHT_BLUE
                || rg.color === CLR_RED || rg.color === CLR_ORANGE) {
                rg.ch = 'w'; rg.decgfx = false;
            }
            break;
        case '{': /* S_fountain/S_sink '{' → 't'; DEC S_altar \xfb → defsym '_' */
            if (rg.color === CLR_BRIGHT_BLUE || rg.color === CLR_WHITE) {
                /* C display.c:2884-2888 resolves the remembered cmap through
                 * showsyms; symbols.c:239 gives SYMBOLS overrides precedence
                 * over IBMgraphics, just as for newly seen terrain. */
                const cmap = rg.color === CLR_BRIGHT_BLUE ? 37 : 36;
                const cell = symset_cell(primary_showsym(cmap));
                rg.ch = cell.ch; rg.decgfx = cell.dec;
            } else if (dec) {
                rg.ch = '_'; rg.decgfx = false;
            }
            break;
        case 'y': case 'z': /* DEC S_upladder/S_dnladder → defsym '<'/'>' */
            if (dec && (rg.color === CLR_BROWN || rg.color === CLR_YELLOW)) {
                rg.ch = rg.ch === 'y' ? '<' : '>';
                rg.decgfx = false;
            }
            break;
        default:
            break;
    }
}
/* dat/symbols — which symsets define the per-branch `G_*_sokoban: /blue`,
 * `G_*_gehennom: /red`, `G_*_mines: /brown` colour overrides that populate
 * wallcolors[].  The plain/default set defines none.  Read off the loaded
 * symset's name (gs.symset[PRIMARYSET].name), which js/display.js already
 * derives from the rc's `OPTIONS=symset:`; an unset name is the default set. */
/* dat/symbols:467-609: RogueIBM, RogueEpyx and RogueWindows only define
 * S_* symbols, with no G_* branch-wall color customizations. Even if loaded
 * as the primary set, they retain display.c:2677's default wall colors. */
const _WALLCOLOR_SYMSETS = new Set(['IBMgraphics', 'IBMGraphics_1', 'IBMGraphics_2',
                                    'DECgraphics', 'curses']);
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
        return CLR_YELLOW; /* dat/symbols G_*_knox: /yellow -> wallcolors[knox_walls] */
    if (In_sokoban(uz))
        return CLR_BLUE;
    return NO_COLOR;       /* wallcolors[main_walls] = CLR_GRAY */
}

/* C display.c:2620-2635 map_glyphinfo: the hero tweak runs AFTER reset_glyphmap's
 * rogue-level NO_COLOR clearing, so with showrace an un-polymorphed hero's own
 * cell keeps HI_DOMESTIC (CLR_WHITE) on a Rogue level without PC graphics. */
export function rogue_hero_showrace_cell(x, y, heldCell) {
    const u = game.u;
    if (heldCell) { if (!heldCell.hero) return false; }
    else if (!u || (u.ux | 0) !== x || (u.uy | 0) !== y) return false;
    /* C display.c:2597-2602 is_you needs glyph_is_monster(glyph): an invisible
     * hero's square shows the object/terrain underneath, which gets no tweak. */
    else if (game.level?.at(x, y)?.disp_cls !== GLYPHCLS_MON) return false;
    if (game.iflags?.use_color === false || !game.flags?.showrace) return false;
    return (u.umonnum | 0) === (u.umonster | 0);
}
export function rogue_graphics() {
    const snap = game?._inMovemonMore ? game._paintedSnapshot : null;
    if (snap && snap.dlevel !== undefined && snap.dnum !== undefined)
        return !!Is_rogue_level({ dnum: snap.dnum, dlevel: snap.dlevel });
    return !!Is_rogue_level(game?.u?.uz);
}
/* C symbols.c:570-579,629-635 loads dat/symbols:56-239 (Blank),
 * case-insensitively, into the selected primary/rogue set. Every ordinary
 * terrain, monster and object symbol in that set is a space. Warning digits,
 * S_goodpos and the trapped-door/chest symbols retain their defaults. */
function blank_symbols() {
    const which = rogue_graphics() ? 1 : PRIMARYSET;
    return String(gs.symset?.[which]?.name ?? '').toLowerCase() === 'blank';
}
function monster_symbol(mlet) {
    /* dat/symbols:573: RogueEpyx S_human is a control byte for every human
     * glyph, including hallucinations; g_putch leaves the old cell intact. */
    if (rogue_ibm_color() && mlet === 53)
        return ROGUE_HERO_CH;
    /* C symbols.c:236-239 showsyms[i] = ov_primary_syms[i] ?: primary_syms[i];
     * display.c:2653,2754 map_glyphinfo reads showsyms[SYM_OFF_M + mlet].
     * A generic symset remaps the default letter in symset_remap_cell. */
    const ov = !rogue_graphics() && !generic_symset()
        && game.go?.ov_primary_syms?.[SYM_OFFSETS.M + mlet];
    if (ov)
        return symset_cell(ov).ch;
    return blank_symbols() ? ' ' : (DEF_MONSYM_CHARS[mlet] ?? '@');
}
function engraving_symbol(corridor) {
    if (ibm_mode()) return corridor ? '0' : 'n';
    /* dat/symbols RogueEpyx S_engroom \xee ('n'), S_engrcorr \xb1 ('1');
     * RogueIBM sets only S_engrcorr \xb1, S_engroom stays '`'. */
    if (rogue_ibm_terrain())
        return corridor ? '1' : (rogue_ibm_color() ? 'n' : '`');
    return blank_symbols() ? ' ' : (corridor ? '#' : '`');
}
/* C display.c:2747,2934 has_rogue_color: cmap_to_roguecolor (display.c:2712)
 * makes S_engroom and S_engrcorr green; otherwise defsym's CLR_BRIGHT_BLUE. */
function engraving_color() {
    return rogue_ibm_color() ? CLR_GREEN : CLR_BRIGHT_BLUE;
}
/* The DEC line-drawing set is in force only with primary graphics. */
export function dec_mode() {
    return !rogue_graphics() && gs.symset?.[PRIMARYSET]?.handling === H_DEC
        && !generic_symset();
}
/* A primary symset loaded from dat/symbols (symbols.js load_symset) that the
 * hand-modelled DEC/IBM/plain/Blank paths above do not describe: its glyphs
 * come from gs.showsyms (primary_syms + SYMBOLS= overrides, symbols.c:236-239)
 * through symset_remap_cell(), and wintty.c g_putch() decides the SO shift. */
const _HAND_MODELLED_SYMSETS = new Set(['decgraphics', 'ibmgraphics', 'plain', 'blank']);
export function generic_symset() {
    const name = game._symsetLoaded;
    return !!name && !rogue_graphics()
        && !_HAND_MODELLED_SYMSETS.has(String(name).toLowerCase());
}
export function ibm_mode() {
    return !rogue_graphics() && gs.symset?.[PRIMARYSET]?.handling === H_IBM
        && !generic_symset();
}
/* wall_angle() keys -> defsym.h cmap index */
const _WALL_KEY_CMAP = { stone: 0, vwall: 1, hwall: 2, tlcorn: 3, trcorn: 4, blcorn: 5,
    brcorn: 6, crwall: 7, tuwall: 8, tdwall: 9, tlwall: 10, trwall: 11 };
/* The cmap index C's back_to_glyph() (display.c:2340-2440) picked for a cell
 * this port painted with defsyms[idx].sym at loc; -1 when the cell is not
 * that terrain glyph (another glyph was painted instead). */
function _default_cmap_at(loc, ch, color) {
    let idx = -1;
    switch (loc.typ) {
    case VWALL: case HWALL: case TLCORNER: case TRCORNER: case BLCORNER: case BRCORNER:
    case CROSSWALL: case TUWALL: case TDWALL: case TLWALL: case TRWALL:
        idx = _WALL_KEY_CMAP[_wall_angle(loc)] ?? -1; break;
    case SDOOR:
        idx = (loc.arboreal_sdoor || loc.candig) ? 18 : (_WALL_KEY_CMAP[_wall_angle(loc)] ?? -1); break;
    case ROOM: idx = 19; break;
    case CORR: idx = color === CLR_WHITE ? 23 : 22; break;
    case DOOR:
        /* C display.c:2375-2383 back_to_glyph picks the door cmap from doormask,
         * not from the painted char: a Rogue-level doorway paints '+' yet is S_ndoor. */
        idx = (loc.doormask & D_ISOPEN) ? (loc.horizontal ? 14 : 13)
            : (loc.doormask & (D_CLOSED | D_LOCKED)) ? (loc.horizontal ? 16 : 15)
            : 12;
        /* C display.c:2375-2383 back_to_glyph picks the door cmap from doormask.
         * On a Rogue level the open/doorless symbols are all '+', so the glyph
         * character cannot tell a closed door from S_ndoor/S_vodoor/S_hodoor. */
        if (rogue_graphics()) {
            const dm = loc.doormask;
            return (dm & D_ISOPEN) ? (loc.horizontal ? 14 : 13)
                : (dm & (D_CLOSED | D_LOCKED)) ? (loc.horizontal ? 16 : 15) : 12;
        }
        idx = (ch === '.' || (ibm_mode() && ch === symset_cell(primary_showsym(12)).ch))
            ? 12 : ch === '+' ? (loc.horizontal ? 16 : 15)
            : (loc.horizontal ? 14 : 13);
        break;
    case STAIRS: idx = ch === '<' ? 25 : 26; break;
    case LADDER: idx = ch === '<' ? 27 : 28; break;
    case IRONBARS: idx = 17; break;
    case TREE: idx = 18; break;
    case ALTAR: idx = 33; break;
    case GRAVE: idx = 34; break;
    case THRONE: idx = 35; break;
    case SINK: idx = 36; break;
    case FOUNTAIN: idx = 37; break;
    case POOL: case MOAT: idx = 38; break;
    case ICE: idx = 39; break;
    case LAVAPOOL: idx = 40; break;
    case LAVAWALL: idx = 41; break;
    case DRAWBRIDGE_DOWN: idx = loc.horizontal ? 43 : 42; break;
    case DBWALL: idx = loc.horizontal ? 45 : 44; break;
    case AIR: idx = 46; break;
    case CLOUD: idx = 47; break;
    case WATER: idx = 48; break;
    default: break;
    }
    /* symbols.c:236-239 changes the tty symbol for SYMBOLS= overrides, but
     * leaves the glyph's Unicode customization intact (glyphs.c:68-83).
     * wintty.c:3946-3955 still selects g_pututf8 ahead of that tty symbol. */
    /* A control-byte symbol (AmigaFont doors) reads back as ' ' from
     * symset_cell, which must not claim a blank S_stone cell as this terrain. */
    const symCell = idx > 0 ? symset_cell(primary_showsym(idx)) : null;
    return (idx > 0 && (defsym_char(idx) === ch
                       || (!symCell.ctl && symCell.ch === ch))) ? idx : -1;
    /* A control-byte symbol's blank placeholder is not a match for a blank
     * S_stone cell: an unseen doorway painted from stone paints a real ' '. */
    const sc = idx > 0 ? symset_cell(primary_showsym(idx)) : null;
    return (idx > 0 && (defsym_char(idx) === ch
                       || (sc.ch === ch && !sc.ctl))) ? idx : -1;
}
/* Re-value a default-symbol cell through the loaded symset's showsyms
 * (symbols.c:236-239) and wintty.c:3740 g_putch().  Returns null to keep the
 * cell as painted. */
function symset_remap_cell(loc, ch, color, cls, objectType, trapType, cmap = null, objectCorpsenm = null) {
    /* C glyphs.c:552 applies UTF8 customizations only with customsymbols on.
     * Keep the applied state until reset_customsymbols() (utf8map.c:211),
     * including redraws during the options menu's pending pick walk. */
    const customsymbols = game._gm_customsymbols ??= game.iflags?.customsymbols !== false;
    let idx = -1;
    if (cls === GLYPHCLS_CMAP) {
        /* C display.c:1095-1096 paints the remembered glyph even if terrain
         * changed out of sight. Its cmap, including a producer's wall_angle
         * choice, takes precedence over the live square's terrain. The same
         * applies to S_expl_* during explosions (display.c:2842-2863). */
        if (Number.isInteger(cmap) && cmap >= 0) idx = cmap;
        else idx = _default_cmap_at(loc, ch, color);
    } else if (cls === GLYPHCLS_SWALLOW) {
        idx = cmap ?? -1; /* display.c:2864 symidx = S_sw_tl + (offset & 7) */
    } else if (cls === GLYPHCLS_MON) {
        const mlet = DEF_MONSYM_CHARS.indexOf(ch);
        if (mlet > 0) idx = SYM_OFFSETS.M + mlet;
    } else if (cls === GLYPHCLS_WARNING) {
        idx = SYM_OFFSETS.W + Number(ch);
    } else if (cls === GLYPHCLS_OBJ) {
        if (objectType === STATUE) {
            /* C display.c:2782-2787,2825-2833: statue glyphs use their species. */
            idx = SYM_OFFSETS.M + MON_MLET[objectCorpsenm | 0];
        } else if (objectType === BOULDER_OTYP) {
            const b = primary_showsym(SYM_OFFSETS.X + 2 /* SYM_BOULDER */);
            return b ? symset_cell(b) : null;
        } else {
            /* C display.c:2969 uses the glyph's object type, even when detect.c's
             * show_map_spot re-shows a cell whose character was already remapped.
             * A custom food symbol can coincide with another class's symbol. */
            const oc = Number.isInteger(objectType) ? MKOBJ_OC_CLASS[objectType]
                : OCLASS_CHAR.indexOf(ch, 1);
            if (oc > 0) idx = SYM_OFFSETS.O + oc;
        }
    } else if (cls === GLYPHCLS_TRAP) {
        /* defsym.h: trap_to_defsym(ttyp) = S_arrow_trap + ttyp - 1 */
        if (trapType >= 1 && defsym_char(49 + trapType - 1) === ch) idx = 49 + trapType - 1;
    } else if (cls === GLYPHCLS_ENGR) {
        idx = ch === '`' ? 21 : ch === '#' ? 24 : -1;
    } else if (cls === GLYPHCLS_INVIS) {
        /* display.c:3030 maps GLYPH_INVISIBLE to SYM_INVISIBLE + SYM_OFF_X, so
         * the 'I' marker is whatever the loaded symset's showsyms holds there
         * (symbols.c:151 get_othersym default), not a fixed 'I'. */
        idx = SYM_OFFSETS.X + 3 /* SYM_INVISIBLE */;
    } else if (cls === GLYPHCLS_UNEXPLORED) {
        idx = SYM_OFFSETS.X + 1; /* display.c:2778-2781 SYM_UNEXPLORED */
    } else if (cls === GLYPHCLS_NOTHING) {
        idx = SYM_OFFSETS.X; /* display.c:2774-2777 SYM_NOTHING */
    }
    if (idx < 0)
        return null;
    /* reglyph_darkroom (display.c:1850-1853) aliases showsyms only;
     * primary_showsym reads the unaliased primary_syms table. */
    const symidx = idx === 20 && !game._symsetDarkroomPending
        ? (_darkroom_alias_blank() ? SYM_OFFSETS.X : 19) : idx;
    const sym = primary_showsym(symidx);
    if (!sym) return null;
    /* glyphs.c:258-261 glyph_find_core() find_oc compares glyph_to_obj(glyph)
     * -- the object TYPE -- with parse_id's val, the class's position in the
     * SYM_OC loadsyms run (ILLOBJ = 0).  So a UTF8 S_<oclass> customization
     * reaches only the one object whose otyp equals that position, not the
     * whole class. */
    const ocUtf8 = cls !== GLYPHCLS_OBJ
        || (objectType != null && objectType === idx - SYM_OFFSETS.O - 1);
    const out = { ...symset_cell(sym), ttychar: sym,
                  utf8: customsymbols && ocUtf8 && !!primary_unicode_symbol(idx) };
    /* display.c:2938-2941: S_litcorr is CLR_WHITE only when it shares the dark
     * corridor's symbol; a symset giving it its own symbol keeps defsym gray. */
    if (cls === GLYPHCLS_CMAP && idx === 23 && sym !== primary_showsym(22))
        out.color = NO_COLOR;
    return out;
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
/* The character botl.c:131 labels the gold field with: '$' on RogueEpyx (its
 * S_coin is \x0f, so check_gold_symbol() sets invis_goldsym), else the live
 * COIN_CLASS object symbol.  Shared by bot() and the window-screen status row
 * (com_pager.js) so both read the same label on a Rogue level. */
export function gold_status_char(gold) {
    /* botl.c:1564-1568: the tty field cache is refreshed only when the gold
     * amount changes (compare_blstats) or showsyms[COIN_CLASS] differs from
     * oldgoldsym, or status reassessment requests update_all.
     * check_gold_symbol() flipping invis_goldsym at a level change does not
     * invalidate the cached field, so the old label stays until such an update. */
    if (gold === undefined)
        return _gold_label_now();
    const symKey = `${rogue_ibm_color()}|${generic_symset()
        ? primary_showsym(SYM_OFFSETS.O + COIN_CLASS_DISP) : oclass_sym(COIN_CLASS_DISP)}`;
    const c = game._goldLabelCache;
    if (!c || c.gold !== gold || c.symKey !== symKey)
        game._goldLabelCache = { gold, symKey, label: _gold_label_now() };
    return game._goldLabelCache.label;
}
function _gold_label_now() {
    if (game.iflags?.invis_goldsym || game.iflags?.in_dumplog)
        return '$';
    /* RogueEpyx S_coin is \x0f; check_gold_symbol() has not run after a restore
     * (only do.c:1668 / options.c call it), so invis_goldsym is still FALSE and
     * botl.c:131 emits the raw control byte, which the tty leaves blank. */
    if (rogue_ibm_color())
        return ' ';
    /* botl.c:131 encglyph(objnum_to_glyph(GOLD_PIECE)) -> showsyms[S_coin] */
    if (generic_symset())
        return symset_cell(primary_showsym(SYM_OFFSETS.O + COIN_CLASS_DISP)).ch;
    return oclass_sym(COIN_CLASS_DISP) ?? '$';
}
export function oclass_sym(oc) {
    if (blank_symbols() && oc > 0 && oc < OCLASS_CHAR.length) return ' ';
    if (rogue_graphics()) {
        const r = ROGUE_OCLASS_CHAR[oc | 0];
        if (r)
            return r;
    }
    /* C symbols.c:236-239 showsyms[SYM_OFF_O + oc] = ov_primary_syms ?: primary;
     * SYMBOLS=S_venom:? etc. override the object-class letter. */
    const ov = !generic_symset() && game.go?.ov_primary_syms?.[SYM_OFFSETS.O + (oc | 0)];
    if (ov)
        return symset_cell(ov).ch;
    return OCLASS_CHAR[oc];
}
/* C display.c:2805-2806,2970-2971: boulders have their own symbol slot,
 * including pile-top glyphs. SYMBOLS overrides the primary set only;
 * symbols.c:132-150 get_othersym defaults the boulder slot to ROCK_CLASS. */
function _object_sym(otyp, oc) {
    if (otyp === BOULDER_OTYP)
        return (rogue_graphics() ? game.symbolOverrides?.S_boulder_rogue
                                 : game.symbolOverrides?.S_boulder) || oclass_sym(oc);
    return oclass_sym(oc);
}
export function pager_boulder_symbol() {
    return (!rogue_graphics() && game.symbolOverrides?.S_boulder) || '`';
}
/* C symbols.c:236-239 and pager.c:1329: class matching uses the active
 * symbol table, including control bytes, rather than the ASCII defaults. */
export function pager_showsyms() {
    if (rogue_graphics())
        return rogue_showsyms();
    if (!generic_symset() && !ibm_mode()) {
        if (gs.showsyms) return gs.showsyms;
        /* symbols.c:236-239: overrides replace the primary ASCII defaults;
         * unset slots fall back to those defaults in the class collector. */
        const syms = game.go?.ov_primary_syms?.map(ov => ov || undefined) ?? [];
        /* dat/symbols `start: plain`: the default set except '+' for the nine
         * corner/junction walls (S_tlcorn..S_trwall). */
        if (String(game._symsetLoaded).toLowerCase() === 'plain') {
            for (let i = 3; i <= 11; i++)
                if (!syms[i]) syms[i] = '+';
        }
        /* C display.c:1850-1853 aliases S_darkroom in the active ASCII table
         * too, including a custom S_nothing when dark_room or color is off. */
        /* Under DECgraphics S_room has no ASCII override slot (its glyph is
         * the DEC '~'), so the alias stays unset and the class collector
         * resolves it to DEC S_room instead of a plain '.'. */
        if (!game._symsetDarkroomPending)
            syms[20] = _darkroom_alias_blank()
                ? (syms[SYM_OFFSETS.X] ?? ' ')
                : (syms[19] ?? (dec_mode() && !rogue_graphics() ? undefined : '.'));
        return syms;
    }
    const symbols = Array.from({ length: 196 }, (_, i) => primary_showsym(i));
    /* C display.c:1850-1853: reglyph_darkroom aliases the active table,
     * leaving primary_syms unchanged. A newly loaded set awaits that pass. */
    if (!game._symsetDarkroomPending)
        symbols[20] = symbols[_darkroom_alias_blank()
            ? SYM_OFFSETS.X : 19];
    return symbols;
}
/* C windows.c:1483-1489 decode_mixed resolves a glyph through showsyms.
 * The map-scan lists put it inside an indented text-window line, where
 * process_text_window (wintty.c:1830-1831) uses putchar, not g_putch.
 * Its NOMUX hook passes the signed char unchanged (patch 006); control
 * and high-bit bytes therefore leave the cleared text-window cell blank.
 * In particular, an IBM engraving's raw 0xee is not its map paint 'n'. */
export function pager_text_glyph(glyph) {
    if (!glyph) return ' ';
    const cmap = glyph.cmap;
    const symbol = cmap != null
        ? (pager_showsyms()?.[cmap] ?? (primary_showsym(cmap) || defsym_char(cmap)))
        : (glyph.symbol ?? (glyph.dec ? glyph.ch.charCodeAt(0) | 0x80 : glyph.ch));
    const byte = typeof symbol === 'number' ? symbol : symbol?.charCodeAt(0);
    return byte >= 32 && byte < 128 ? String.fromCharCode(byte) : ' ';
}
/* C windows.c:1475-1510 / utf8map.c:98-151: putmixed consumes a backslash
 * before an ordinary character, including another backslash. A trailing
 * backslash and an unrecognized \G sequence survive. Apply this to literal
 * text, before combining it with symbols already decoded by pager_text_glyph;
 * a backslash supplied by a glyph must not be interpreted a second time. */
export function pager_mixed_text(text) {
    return text.replace(/\\([\s\S])/g, (pair, next) => next === 'G' ? pair : next);
}
/* C pager.c:1350-1354,1539-1576: even a typed hero override retries the
 * class scans using the active human symbol, retaining earlier matches. */
export function collectScreenDescriptionClasses(options = {}) {
    const u = game.u, race = game.urace?.mnum;
    const overrides = Is_rogue_level(u?.uz)
        ? game.go?.ov_rogue_syms : game.go?.ov_primary_syms;
    return collectDescriptionClasses({
        // C pager.c:1408: clairvoyance marks EDetect_monsters with I_SPECIAL.
        usealt: !!((u?.uprops?.[DETECT_MONSTERS]?.extrinsic | 0) & I_SPECIAL),
        darkroomAlias: !game._symsetDarkroomPending && !_darkroom_alias_blank(),
        heroOverride: overrides?.[SYM_OFFSETS.X + 5],
        heroSymbol: pager_showsyms()?.[SYM_OFFSETS.M + 53] ?? '@',
        heroNeedsYou: race != null && race !== PM_HUMAN && race !== PM_ELF
            && u?.umonnum === u?.umonster,
        ...options,
        isHero: options.looked === false ? !game.flags?.showrace : options.isHero,
    });
}
/* C pager.c:1462-1509 matches every cmap explanation against the active
 * tty symbol, then lookat() supplies the location-specific description.
 * Stair and ladder symbols can coincide, depending on the loaded symset. */
export function pager_cmap_description(glyph) {
    const classes = collectScreenDescriptionClasses({
        ch: glyph.ch, symbol: glyph.symbol, dec: !!glyph.dec,
        showsyms: pager_showsyms(),
        terrainmode: game.iflags?.terrainmode, glyphKind: 'cmap',
        decMode: dec_mode(), rogueMode: rogue_graphics(),
        blind: Blind(), boulderSymbol: pager_boulder_symbol(),
        allowVibratingSquare: Inhell(),
    });
    return {
        glyphChar: glyph.ch, glyphDec: !!glyph.dec,
        classText: classes.classes.join(' or '),
        classCount: classes.matchCount, needsLook: classes.needsLook,
    };
}
/* C pager.c:1325-1528: warning glyphs undergo the same symbol-class scans
 * as objects and terrain, including collisions with a custom boulder symbol. */
export function pager_warning_classes(x, y, glyph) {
    const classes = collectScreenDescriptionClasses({
        ch: glyph.ch, symbol: glyph.symbol, dec: !!glyph.dec,
        showsyms: pager_showsyms(),
        terrainmode: game.iflags?.terrainmode, glyphKind: 'warning',
        decMode: dec_mode(), rogueMode: rogue_graphics(), blind: Blind(),
        boulderSymbol: pager_boulder_symbol(),
        boulderAt: !!_sobj_at(BOULDER_OTYP, x, y),
        allowVibratingSquare: Inhell(),
    });
    return { classText: classes.classes.join(' or '),
             classCount: classes.matchCount, needsLook: classes.needsLook };
}
/* C pager.c:1169-1205 add_cmap_descr(): describe each matching water cmap
 * using its own terrain, with hallucination suppressed.  The pool's second
 * (moat) description is appended without increasing the match count.
 * Class matching must still include monsters, objects and other terrain
 * symbols (pager.c:1325-1509), including collisions with SYMBOLS overrides. */
export function pager_water_classes(x, y, glyph) {
    const loc = game.level.at(x, y);
    const resistance = game.u.uprops[HALLUC_RES];
    const savedTyp = loc.typ, savedResistance = resistance.extrinsic;
    const waterbodyNames = {};
    try {
        resistance.extrinsic = 1;
        for (const [idx, types] of [[38, [POOL, MOAT]], [39, [ICE]],
                                    [48, [WATER]], [40, [LAVAPOOL]], [41, [LAVAWALL]]]) {
            waterbodyNames[idx] = types.map(typ => {
                loc.typ = typ;
                const text = waterbody_name(x, y);
                return text === 'pool of water' ? 'pool' : text === 'molten lava' ? 'lava' : text;
            });
        }
    } finally {
        loc.typ = savedTyp;
        resistance.extrinsic = savedResistance;
    }
    const showsyms = !rogue_graphics() && game._symsetLoaded
        ? Array.from({ length: 196 }, (_, i) => primary_showsym(i)) : (pager_showsyms()?.slice() ?? []);
    /* Without a named symset the display still applies SYMBOLS=S_pool. */
    if (!rogue_graphics() && game.symbolOverrides?.S_pool)
        showsyms[38] = game.symbolOverrides.S_pool;
    const classes = collectScreenDescriptionClasses({
        ch: glyph.ch, symbol: glyph.symbol, dec: !!glyph.dec,
        showsyms, waterbodyNames,
        terrainmode: game.iflags?.terrainmode, glyphKind: 'terrain',
        decMode: dec_mode(), rogueMode: rogue_graphics(),
        blind: Blind(), boulderSymbol: pager_boulder_symbol(),
        allowVibratingSquare: Inhell(),
    });
    return { classText: classes.classes.join(' or '), classCount: classes.matchCount };
}
/* C windows.c:1483-1489 decode_mixed(), tty/topl.c:305-343 topl_putsym():
 * a control-byte glyph advances tty's logical column without painting the
 * terminal cell. Preserve that cell from the preceding physical topline. */
export function pager_glyph_prefix(ch, dec) {
    let glyph = dec ? `\x0e${ch}\x0f` : ch;
    if (ch && ch.charCodeAt(0) < 0x20 && !dec) {
        glyph = ' ';
        let style = '';
        const row = String(game._screen_output || '').split('\n')[0];
        for (const token of row.match(/\x1b\[[0-9;]*[A-Za-z]|[\s\S]/g) || []) {
            if (token.startsWith('\x1b[')) {
                if (token.endsWith('C')) break;
                if (token.endsWith('m')) style += token;
            } else if (token === '\x0e' || token === '\x0f') {
                style += token;
            } else {
                glyph = `${style}${token}\x0f\x1b[0m`;
                break;
            }
        }
    }
    return glyph === ' ' ? '\x1b[9C' : `${glyph}\x1b[8C`;
}
/* dat/symbols "start: RogueIBM" (Handling: IBM, no Color): same CP437 terrain
 * bytes as RogueEpyx (walls \xba..\xcc, S_room \xfa, S_corr \xb1, doors \xce,
 * stairs \xf0), high bit stripped by the terminal; but has_rogue_color is false,
 * so the map stays uncoloured. */
function rogue_ibm_terrain() {
    return rogue_graphics() && gs.symset?.[1]?.handling === 1
        && (gs.symset[1].name === 'RogueEpyx' || gs.symset[1].name === 'RogueIBM');
}
export function rogue_ibm_color() {
    return rogue_graphics() && gs.symset?.[1]?.name === 'RogueEpyx'
        && gs.symset[1].handling === 1;
}
const _EPYX_WALL = {
    vwall: ':', hwall: 'M', tlcorn: 'I', trcorn: ';', blcorn: 'H', brcorn: '<',
    crwall: 'N', tuwall: 'J', tdwall: 'K', tlwall: '9', trwall: 'L',
};
/* dat/symbols:550-572 RogueEpyx object-class bytes, before tty strips
 * the high bit. Control bytes leave the previous physical cell intact. */
const _EPYX_OBJECT_SYMBOLS = [
    0, 0x5d, 0x18, 0x5b, 0x3d, 0x0c, 0x28, 0x05, 0xad,
    0x0e, 0x2b, 0xe7, 0x0f, 0x0f, 0x60, 0x30, 0x5f, 0x2e,
];
function _epyx_terrain(loc, g) {
    const typ = loc.typ;
    if ((typ >= VWALL && typ <= TRWALL) || typ === SDOOR) {
        if (!g.ch || g.ch === ' ')
            return g;
        const key = _wall_angle(loc);
        const ch = _EPYX_WALL[key];
        return ch ? { ch, color: CLR_BROWN, dec: false, wallSymbol: key } : g;
    }
    switch (typ) {
        case DOOR:
            /* S_ndoor = S_vodoor = S_hodoor = \xce; S_vcdoor/S_hcdoor keep '+' */
            if (!(loc.doormask & (D_CLOSED | D_LOCKED)))
                return { ch: 'N', color: CLR_BROWN, dec: false };
            return { ch: g.ch, color: CLR_BROWN, dec: false };
        case ROOM: return { ch: 'z', color: CLR_GREEN, dec: false };
        case CORR: return { ch: g.color === CLR_WHITE ? '2' : '1', color: NO_COLOR, dec: false };
        case STAIRS: return g.color === CLR_YELLOW ? g
            : { ch: 'p', color: CLR_GREEN, dec: false };
        default: return g;
    }
}
export function terrain_glyph(loc, x, y, assumeVisible = false) {
    const g = _terrain_glyph_base(loc, x, y, assumeVisible);
    g.cmap ??= _default_cmap_at(loc, g.ch, g.color);
    /* Blank defines every back_to_glyph terrain symbol. Wall overrides are
     * already resolved by _wall_symbol_glyph; S_pool is the other supported
     * explicit terrain override (symbols.c:239 gives overrides precedence). */
    /* C symbols.c:236-239: a SYMBOLS= override (ov_primary_syms) replaces the
     * primary symset's character for that cmap index; the colour is defsym's.
     * Rogue levels use ov_rogue_syms instead (symbols.c:224-226). */
    const ovName = !rogue_graphics() && game.symbolOverrides && _terrain_cmap_name(loc, g);
    const ov = ovName && game.symbolOverrides[ovName];
    if (ov)
        return { ...g, ch: ov, dec: false };
    if (blank_symbols() && !g.wallSymbol
        && !((loc.typ === POOL || loc.typ === MOAT)
             && !rogue_graphics() && game.symbolOverrides?.S_pool))
        return { ...g, ch: ' ', dec: false };
    return rogue_ibm_terrain() ? { ..._epyx_terrain(loc, g), cmap: g.cmap } : g;
}
/* The cmap index back_to_glyph chose (display.c:2349-2383) for the terrain
 * kinds whose SYMBOLS= override terrain_glyph applies. */
function _terrain_cmap_name(loc, g) {
    switch (loc.typ) {
        case ROOM: return 'S_room';
        case CORR: return g.color === CLR_WHITE || g.ch === '1' ? 'S_litcorr' : 'S_corr';
        case FOUNTAIN: return 'S_fountain';
        case ALTAR: return 'S_altar';
        /* C display.c:2375-2383, 2390-2391 back_to_glyph cmap indices */
        case WATER: return 'S_water';
        case LAVAPOOL: return 'S_lava';
        case LAVAWALL: return 'S_lavawall';
        case ICE: return 'S_ice';
        case TREE: return 'S_tree';
        case DOOR:
            if (loc.doormask & D_ISOPEN) return loc.horizontal ? 'S_hodoor' : 'S_vodoor';
            if (loc.doormask & (D_CLOSED | D_LOCKED)) return loc.horizontal ? 'S_hcdoor' : 'S_vcdoor';
            return 'S_ndoor';
        default: return null;
    }
}
function _terrain_glyph_base(loc, x, y, assumeVisible) {
    const typ = loc.typ;
    const decMode = dec_mode();
    const ibmMode = ibm_mode();
    const rogueGfx = rogue_graphics();
    /* Colour for every S_vwall..S_trwall glyph (and SDOOR) below. */
    const wallColor = _wall_color();
    // C ref: display.c:2354-2372 back_to_glyph — every wall case (VWALL..TRWALL)
    // and SDOOR resolve their glyph via `ptr->seenv ? wall_angle(ptr) : S_stone`.
    // wall_angle (display.c:3563) selects the displayed wall glyph from the
    // wall type, its wall_info orientation mode, AND the seen-vector; depending
    // on which faces have been seen it can yield a different corner/T glyph or
    // S_stone (blank).  Without this JS drew a fixed wall glyph for a partly-seen
    // WM_W_LEFT seenv SV6 -> S_stone).  DBWALL has its own back_to_glyph case
    if ((typ >= VWALL && typ <= TRWALL) || typ === SDOOR)
        return _wall_angle_glyph(loc, decMode);
    switch (typ) {
        // C ref: display.c:2294-2296 back_to_glyph — SCORR/STONE are
        // `svl.level.flags.arboreal ? S_tree : S_stone`.
        case STONE:
            if (game.level?.flags?.arboreal)
                return ibmMode ? { ch: 'q', color: CLR_GREEN, dec: false } /* IBM S_tree \xf1 */
                : decMode ? { ch: 'g', color: CLR_GREEN, dec: true }
                : { ch: '#', color: CLR_GREEN, dec: false };
            // C back_to_glyph: S_stone stays distinct from GLYPH_UNEXPLORED.
            /* symbols.c:236-239: SYMBOLS=S_stone:<char> overrides defsym ' '. */
            return { ch: (!rogueGfx && game.symbolOverrides?.S_stone) || ' ',
                     color: NO_COLOR, dec: false, cmap: 0 };
        case ROOM:
            // C ref: defsym.h S_room = '.' (ASCII); DECgraphics S_room = \xfe → DEC '~' (centered dot)
            const roomOverride = game.symbolOverrides?.S_room;
            if (roomOverride)
                return { ch: roomOverride, color: NO_COLOR, dec: false };
            if (ibmMode) {
                return { ch: 'z', color: NO_COLOR, dec: false };
            }
            return decMode ? { ch: '~', color: NO_COLOR, dec: true }
                : { ch: '.', color: NO_COLOR, dec: false };
        case CORR: {
            // C ref: display.c:2349 back_to_glyph CORR case —
            //   idx = (ptr->waslit || flags.lit_corridor) ? S_litcorr : S_corr;
            // S_litcorr (lit corridor) renders bright-white (CLR_WHITE → ANSI 97)
            // back_to_glyph "assumes hero can see x,y", so the lit form only
            // applies in-sight; an out-of-sight remembered corridor is dark
            // (display.c:1109 downgrades remembered S_litcorr → S_corr when
            // flags.lit_corridor comes from OPTIONS=lit_corridor (options.js →
            // g.flags.lit_corridor); loc.waslit is the per-cell lit-memory bit
            // (the light-spell litroom path sets white corridors directly).
            const litCorr = (assumeVisible || cansee(x, y))
                && (loc.waslit || game.flags?.lit_corridor);
            const corrIdx = litCorr ? 23 /* S_litcorr */ : 22 /* S_corr */;
            /* C symbols.c loadsyms: SYMBOLS=S_corr/S_litcorr:<char> replaces the
             * per-cell symset glyph with a plain tty char.  The two symbols are
             * independent in C (no corr↔litcorr showsyms alias; reglyph_darkroom
             * only re-glyphs memory between the two cmap glyphs), so pick the
             * one this cell resolves to. */
            const corrOverride = game.symbolOverrides?.[litCorr ? 'S_litcorr' : 'S_corr'];
            if (corrOverride)
                return { ch: corrOverride, color: litCorr ? CLR_WHITE : NO_COLOR,
                         dec: false, cmap: corrIdx };
            if (ibmMode) /* C dat/symbols:242 S_corr \xb0 → '0', S_litcorr \xb1 → '1' */
                return litCorr
                    ? { ch: '1', color: NO_COLOR, dec: false, cmap: corrIdx }
                    : { ch: '0', color: NO_COLOR, dec: false, cmap: corrIdx };
            return litCorr
                ? { ch: '#', color: CLR_WHITE, dec: false, cmap: corrIdx } // S_litcorr
                : { ch: '#', color: NO_COLOR, dec: false, cmap: corrIdx };  // S_corr (dark)
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
                /* C symbols.c loadsyms: an explicit SYMBOLS=S_vodoor/S_hodoor:<char>
                 * replaces the symset glyph (plain tty char, not a DEC byte). */
                const doorOverride = game.symbolOverrides?.[loc.horizontal ? 'S_hodoor' : 'S_vodoor'];
                if (doorOverride)
                    return { ch: doorOverride, color: CLR_BROWN, dec: false };
                if (decMode)
                    return { ch: 'a', color: CLR_BROWN, dec: true };
                /* C dat/symbols:242 — S_vodoor = S_hodoor = \xfe → '~'
                 * (both orientations, IBMgraphics). */
                if (ibmMode)
                    return { ch: '~', color: CLR_BROWN, dec: false };
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
            /* C dat/symbols:242 — S_ndoor = \xfa → 'z' (IBMgraphics). */
            if (ibmMode)
                return { ch: 'z', color: NO_COLOR, dec: false };
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
            // C display.c:2347-2351 retains the cmap identity independently
            // of showsyms: Rogue's '%' represents either stair direction.
            const cmap = _branch ? (_isUp ? 29 : 30) : (_isUp ? 25 : 26);
            /* C symbols.c:198 — rogue_syms[S_upstair] = rogue_syms[S_dnstair]
             * = '%'.  S_brupstair / S_brdnstair are NOT in that override list,
             * so a BRANCH stair keeps defsyms' '<' / '>' even on a Rogue
             * level. */
            if (rogueGfx && !_branch)
                return { ch: '%', color: _color, dec: false, cmap };
            return { ch: _isUp ? '<' : '>', color: _color, dec: false, cmap };
        }
        case LADDER: {
            const _isUp = !(((game.level?.at?.(x, y)?.ladder) | 0) & LA_DOWN);
            let _sway = null;
            for (let s = game.stairs; s; s = s.next) {
                if (s.sx === x && s.sy === y) { _sway = s; break; }
            }
            const _uzdnum = (game.u?.uz?.dnum | 0);
            const _branch = !!(_sway && (_sway.tolev?.dnum | 0) !== _uzdnum
                && _sway.u_traversed);
            const _color = _branch ? CLR_YELLOW : CLR_BROWN;
            // C display.c:2354-2358 selects ladder identity before symbols.
            const cmap = _branch ? (_isUp ? 31 : 32) : (_isUp ? 27 : 28);
            if (rogueGfx)
                return { ch: _isUp ? '<' : '>', color: _color, dec: false, cmap };
            return decMode
                ? { ch: _isUp ? 'y' : 'z', color: _color, dec: true, cmap }
                : { ch: _isUp ? '<' : '>', color: _color, dec: false, cmap };
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
        case SDOOR:
            if (loc.candig) /* arboreal_sdoor (display.c:2305) -> S_tree */
                return decMode ? { ch: 'g', color: CLR_GREEN, dec: true }
                    : { ch: '#', color: CLR_GREEN, dec: false };
            return loc.horizontal
            ? (decMode ? { ch: 'q', color: wallColor, dec: true } // horizontal → HWALL ─
                : { ch: '-', color: wallColor, dec: false })
            : (decMode ? { ch: 'x', color: wallColor, dec: true } // vertical → VWALL │
                : { ch: '|', color: wallColor, dec: false });
        // C ref: display.c:2338 back_to_glyph — SCORR falls through to STONE → S_stone = ' '.
        case SCORR:
            if (game.level?.flags?.arboreal) /* display.c:2296 */
                return ibmMode ? { ch: 'q', color: CLR_GREEN, dec: false } /* IBM S_tree \xf1 */
                : decMode ? { ch: 'g', color: CLR_GREEN, dec: true }
            : { ch: '#', color: CLR_GREEN, dec: false };
            /* symbols.c:236-239: SYMBOLS=S_stone:<char> applies to SCORR as well. */
            return { ch: (!rogueGfx && game.symbolOverrides?.S_stone) || ' ',
                     color: NO_COLOR, dec: false, cmap: 0 }; // S_stone
        // C ref: defsym.h PCHAR entries — remaining terrain types.
        // HI_METAL=CLR_CYAN, HI_GOLD=CLR_YELLOW (color.h).
        // C ref: dat/symbols:707 S_bars: \xfc (meta-|, not-equals); defsym.h:110 HI_METAL.
        case IRONBARS: return ibmMode ? { ch: 'p', color: CLR_CYAN, dec: false } /* IBM \xf0 */
            : decMode ? { ch: '|', color: CLR_CYAN, dec: true }
            : { ch: '#', color: CLR_CYAN, dec: false };
        // C ref: dat/symbols:708 S_tree: \xe7 (meta-g, plus-or-minus); defsym.h:111 CLR_GREEN.
        case TREE: return ibmMode ? { ch: 'q', color: CLR_GREEN, dec: false } /* IBM \xf1 */
            : decMode ? { ch: 'g', color: CLR_GREEN, dec: true }
            : { ch: '#', color: CLR_GREEN, dec: false };
        // C ref: dat/symbols:715 S_pool: \xe0 (meta-\, diamond); defsym.h:136 CLR_BLUE.
        case POOL:
        case MOAT: {
            /* C symbols.c:225-227,238-240: SYMBOLS overrides only the primary
             * set; Rogue levels use ov_rogue_syms and rogue_syms instead.
             * The override is an ordinary tty character. */
            const override = !rogueGfx && game.symbolOverrides?.S_pool;
            if (override)
                return { ch: override, color: CLR_BLUE, dec: false };
            if (ibmMode) /* C dat/symbols:242 S_pool = \xf7 → 'w' */
                return { ch: 'w', color: CLR_BLUE, dec: false };
            return decMode ? { ch: '`', color: CLR_BLUE, dec: true }
                : { ch: '}', color: CLR_BLUE, dec: false };
        }
        // C ref: dat/symbols:721 S_water: \xe0; defsym.h:152 CLR_BRIGHT_BLUE.
        case WATER: return ibmMode ? { ch: 'w', color: CLR_BRIGHT_BLUE, dec: false } /* IBM \xf7 */
            : decMode ? { ch: '`', color: CLR_BRIGHT_BLUE, dec: true }
            : { ch: '}', color: CLR_BRIGHT_BLUE, dec: false };
        // C ref: dat/symbols:717 S_lava: \xe0; defsym.h:138 CLR_RED.
        case LAVAPOOL: return ibmMode ? { ch: 'w', color: CLR_RED, dec: false, bwspec: true } /* IBM \xf7 */
            : decMode ? { ch: '`', color: CLR_RED, dec: true, bwspec: true }
            : { ch: '}', color: CLR_RED, dec: false, bwspec: true };
        case LAVAWALL: return ibmMode ? { ch: 'w', color: CLR_ORANGE, dec: false, bwspec: true } /* IBM \xf7 */
            : decMode ? { ch: '`', color: CLR_ORANGE, dec: true, bwspec: true }
            : { ch: '}', color: CLR_ORANGE, dec: false, bwspec: true };
        /* C dat/symbols:242 — IBMgraphics DOES define S_fountain/S_sink \xf4
         * → 't' (unlike DECgraphics, which keeps the defsym '{'). */
        case FOUNTAIN: return ibmMode ? { ch: 't', color: CLR_BRIGHT_BLUE, dec: false }
            : { ch: '{', color: CLR_BRIGHT_BLUE, dec: false }; // S_fountain CLR_BRIGHT_BLUE (no DEC override)
        case SINK: return ibmMode ? { ch: 't', color: CLR_WHITE, dec: false, bwspec: true }
            : { ch: '{', color: CLR_WHITE, dec: false, bwspec: true }; // S_sink CLR_WHITE (no DEC override)
        case THRONE: return { ch: '\\', color: CLR_YELLOW, dec: false }; // S_throne HI_GOLD=CLR_YELLOW (no DEC override)
        case GRAVE: return { ch: '|', color: CLR_WHITE, dec: false }; // S_grave CLR_WHITE (no DEC override)
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
        case ICE: return ibmMode ? { ch: 'z', color: CLR_CYAN, dec: false, bwspec: true } /* IBM \xfa */
            : decMode ? { ch: '~', color: CLR_CYAN, dec: true, bwspec: true }
            : { ch: '.', color: CLR_CYAN, dec: false, bwspec: true };
        case DRAWBRIDGE_UP: {
            const under = ((loc.drawbridgemask ?? loc.flags ?? 0) | 0) & DB_UNDER;
            const utyp = under === DB_MOAT ? MOAT : under === DB_LAVA ? LAVAPOOL
                : under === DB_ICE ? ICE : ROOM;
            return terrain_glyph({ ...loc, typ: utyp }, x, y);
        }
        case DBWALL: return { ch: '#', color: CLR_BROWN, dec: false };
        // C ref: dat/symbols:719-720 S_vodbridge/S_hodbridge: \xfe; defsym.h:140 CLR_BROWN.
        case DRAWBRIDGE_DOWN: return ibmMode ? { ch: 'z', color: CLR_BROWN, dec: false } /* IBM \xfa */
            : decMode ? { ch: '~', color: CLR_BROWN, dec: true }
            : { ch: '.', color: CLR_BROWN, dec: false };
        case AIR: return { ch: ' ', color: CLR_CYAN, dec: false }; // S_air CLR_CYAN
        case CLOUD: return { ch: '#', color: CLR_GRAY, dec: false }; // S_cloud CLR_GRAY
        default: return { ch: '?', color: NO_COLOR, dec: false };
    }
}
// ── Dark-room re-glyph (S_darkroom) ──
// C display.c:1168-1171: showsyms[S_darkroom] is the dark-room symbol only when
// flags.dark_room && iflags.use_color; otherwise it is SYM_NOTHING and the glyph
// paints blank. The S_darkroom glyph itself is still assigned in memory.
/* C display.c:1850-1853,2774: the SYM_NOTHING symbol (S_nothing, blank by
 * default) that GLYPH_NOTHING and the unaliased S_darkroom paint with. */
function _nothing_ch() {
    const sym = primary_showsym(SYM_OFFSETS.X);
    return sym ? symset_cell(sym).ch : ' ';
}
/* C display.c:1850-1853: gs.showsyms[S_darkroom] is re-aliased only inside
 * reglyph_darkroom(), so between the dark_room flag flip and that call (e.g.
 * the toggle's own pline flush) the OLD alias is still what tty paints. */
function _darkroom_alias_blank() {
    return game._darkroomSymBlank
        ?? !(game.flags?.dark_room && game.iflags?.use_color);
}
function _darkroom_paints() {
    return (game.flags?.dark_room ?? true) && (game.iflags?.use_color ?? true);
}
// C ref: display.c:1116-1123 newsym() out-of-sight branch + sym.h:96 DARKROOMSYM
// + defsym.h:113 PCHAR(20,'.',S_darkroom,...,CLR_BLACK).
//   if (!waslit || (flags.dark_room && iflags.use_color))
//       else if (glyph == S_room && typ == ROOM) glyph = DARKROOMSYM (S_darkroom)
// DARKROOMSYM = (Is_rogue_level ? S_stone : S_darkroom).  flags.dark_room (flag.h:27)
// convention as the rest of this file's always-emit-color rendering).  Dlvl-1
// rooms are never rogue-level, so DARKROOMSYM resolves to S_darkroom.
// (ANSI 90 — bright black "dark gray"); the underlying char/decgfx is unchanged
// from S_room, only the color darkens.  RNG-neutral (pure render).
// Returns true if `rg` (a remembered_glyph {ch,color,decgfx}) was the plain S_room
export function _darken_room_floor(loc, rg, fromNewsym = false) {
    if (!loc || loc.typ !== ROOM || !rg)
        return false;
    // ASCII '.' (decgfx false) or DECgraphics '~' (decgfx true).  Already-dark
    // (CLR_BLACK) cells are left as-is (idempotent re-glyph).
    const isAsciiFloor = rg.ch === '.' && !rg.decgfx;
    const isDecFloor = rg.ch === '~' && rg.decgfx;
    // IBMgraphics S_room \xfa paints 'z' (dat/symbols:242); only a cmap glyph is
    const isIbmFloor = rg.ch === 'z' && !rg.decgfx && ibm_mode()
        && (rg.cls ?? GLYPHCLS_CMAP) === GLYPHCLS_CMAP;
    if ((isAsciiFloor || isDecFloor || isIbmFloor) && rg.color === NO_COLOR) {
        if (_darkroom_paints()) {
            rg.color = CLR_BLACK; // S_darkroom color → ANSI 90
            rg.cmap = 20; // S_darkroom
            /* C display.c:1850-1853: showsyms[S_darkroom] stays SYM_NOTHING's
             * blank until reglyph_darkroom() re-aliases it, so a cell newsym'd
             * after dark_room flips on but before the reglyph paints blank. */
            if (game._darkroomSymBlank) {
                rg.ch = _nothing_ch();
                rg.decgfx = false;
            }
            return true;
        }
        if (loc.waslit)
            return false;
        // C newsym (display.c:1087-1093) uses DARKROOMSYM even with !dark_room;
        // sym.h:96 makes that S_darkroom off Rogue. Its symbol is blank, but
        // its CLR_BLACK identity survives for reveal_terrain_getglyph's
        // S_darkroom -> S_room conversion (detect.c:2283-2284). feel_location
        // instead explicitly chooses S_stone with !dark_room (:895-897).
        rg.ch = _nothing_ch();
        rg.color = fromNewsym ? CLR_BLACK : NO_COLOR;
        rg.decgfx = false;
        rg.cmap = fromNewsym ? 20 : 0;
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
// (typ==CORR, glyph==S_litcorr).  The C `!waslit` precondition is enforced by
// the caller: a waslit corridor keeps its lit memory (light-spell litroom path).
// S_litcorr renders '#' CLR_WHITE; S_corr renders '#' NO_COLOR — only the color
// darkens, char/decgfx are unchanged.  RNG-neutral (pure render).
// Returns true if `rg` was the lit-corridor glyph and has been mutated in place.
export function _darken_corridor(loc, rg) {
    if (!loc || loc.typ !== CORR || !rg)
        return false;
    // C: glyph == cmap_to_glyph(S_litcorr) — the bright-white corridor glyph
    // ('#', CLR_WHITE, ASCII).  S_corr ('#', NO_COLOR) is already dark and left
    // as-is (idempotent re-glyph).
    if (rg.ch === '#' && !rg.decgfx && rg.color === CLR_WHITE) {
        rg.color = NO_COLOR; // S_corr color → default/gray
        rg.cmap = 22;
        return true;
    }
    /* RogueEpyx: S_litcorr \xb2 '2' -> S_corr \xb1 '1' (dat/symbols RogueEpyx;
     * see _epyx_terrain), the same display.c:1080 demotion on the Rogue level. */
    if (rg.ch === '2' && !rg.decgfx && rg.cmap === 23 && rogue_ibm_terrain()) {
        rg.ch = '1';
        rg.cmap = 22;
        return true;
    }
    /* IBMgraphics: S_litcorr \xb1 '1' (gray) → S_corr \xb0 '0' (symbols:264-265) */
    if (rg.ch === '1' && !rg.decgfx && rg.color === NO_COLOR && ibm_mode()) {
        rg.ch = '0';
        rg.cmap = 22;
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
                    rg.cmap = 23;
                }
            } else {
                // S_litcorr: '#' CLR_WHITE
                if (rg.ch === '#' && !rg.decgfx && rg.color === CLR_WHITE
                    && !cansee(x, y)) {
                    // → S_corr: '#' NO_COLOR
                    rg.color = NO_COLOR;
                    rg.cmap = 22;
                }
            }

            // C: if (!dark_room || !use_color || Is_rogue_level) { demote darkroom }
            // C: else { promote room/nothing → darkroom }
            if (!dark_room || !use_color || is_rogue) {
                // C display.c:1838-1840 tests glyph identity: S_darkroom
                // can also paint 'z' (IBM) or blank under the current options.
                if (_rg_is_cmap(rg, S_DARKROOM_C)) {
                    if (loc.waslit) {
                        loc.remembered_glyph = _feel_cmap_glyph(S_ROOM_C);
                    } else {
                        // → GLYPH_NOTHING: ' ' NO_COLOR
                        rg.ch = _nothing_ch();
                        rg.color = NO_COLOR;
                        rg.decgfx = false;
                        // GLYPH_NOTHING is distinct from S_stone (a plain blank ' '
                        // glyph); only this demotion makes it (display.c:1836-1840).
                        rg.nothing = true;
                        delete rg.cmap;
                    }
                }
            } else {
                // dark_room && use_color && !is_rogue
                // S_room → S_darkroom: '.' NO_COLOR → '.' CLR_BLACK (or '~')
                const isRoomAscii = rg.ch === '.' && !rg.decgfx && rg.color === NO_COLOR;
                const isRoomDec = rg.ch === '~' && rg.decgfx && rg.color === NO_COLOR;
                if (rg.ch === ' ' && rg.color === CLR_BLACK && !rg.nothing
                    && (rg.cls ?? GLYPHCLS_CMAP) === GLYPHCLS_CMAP && loc.typ === ROOM) {
                    // S_darkroom painted blank under the stale showsyms alias
                    rg.ch = dec_mode() ? '~' : '.';
                    rg.decgfx = dec_mode();
                } else if ((isRoomAscii || isRoomDec) && loc.typ === ROOM
                    && loc.seenv && loc.waslit && !cansee(x, y)) {
                    rg.color = CLR_BLACK; // → S_darkroom
                    rg.cmap = 20;
                } else if (rg.nothing && rg.ch === ' ' && !rg.decgfx && rg.color === NO_COLOR
                    && loc.typ === ROOM && loc.seenv && !cansee(x, y)) {
                    // GLYPH_NOTHING + typ==ROOM + seenv + !cansee → S_darkroom
                    rg.ch = dec_mode() ? '~' : '.';
                    rg.color = CLR_BLACK;
                    rg.decgfx = dec_mode();
                    rg.cmap = 20;
                    delete rg.nothing;
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

    game._darkroomSymBlank = !(dark_room && use_color);
    if (gs.showsyms) {
        if (dark_room && use_color)
            gs.showsyms[S_darkroom] = gs.showsyms[S_room];
        else
            gs.showsyms[S_darkroom] = gs.showsyms[SYM_NOTHING + SYM_OFF_X];
    }
    /* C display.c:1860-1897: this alias is what restores S_darkroom's value
     * after do_symset's init_primary_symbols() reset — until it runs, a
     * freshly loaded set paints S_darkroom's defsym.h:113 default '.' (set by
     * handler_symset, optmenu.js; see _remap_remembered_ibm). */
    game._symsetDarkroomPending = false;
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
export const GLYPHCLS_WARNING = 'warning';   /* warning_to_glyph(level) */
export const GLYPHCLS_OBJ = 'obj';     /* object, corpse, or statue */
export const GLYPHCLS_TRAP = 'trap';   /* seen trap */
export const GLYPHCLS_ENGR = 'engr';   /* cmap glyph with is_cmap_engraving(sym) */
export const GLYPHCLS_INVIS = 'invis'; /* GLYPH_INVISIBLE "I" marker */
export const GLYPHCLS_UNEXPLORED = 'unexplored'; /* not a live terrain/cmap glyph */
const GLYPHCLS_NOTHING = 'nothing';
export const GLYPHCLS_SWALLOW = 'swallow';
// ── show_glyph_cell ──
export function show_glyph_cell(x, y, ch, color = NO_COLOR, decgfx = false, attr = 0,
                                cls = GLYPHCLS_CMAP, isWarning = false,
                                objectType = null, objectCorpsenm = null, trapType = null,
                                cmap = null, objpile = false) {
    // C display.c:1885-1887: resolved cells use the same output guard as glyph IDs.
    if (suppress_map_output())
        return;
    const loc = game.level?.at(x, y);
    if (!loc)
        return;
    invalidate_map_row(y);
    /* C display.c:3079-3084 resolves color in glyphmap, and show_glyph stores
     * that glyphinfo in gbuf. Changing the option cannot recolor cells already
     * buffered: cls() may page a message before docrt paints the new glyphs. */
    // Preserve the logical color used to distinguish room/darkroom glyphs.
    /* C writes gbuf here but prints it only in flush_screen(), so a cell
     * changed twice between flushes puts just the last glyph on the terminal.
     * Remember the cell as the terminal held it at the last flush. */
    if (loc.disp_flush_epoch !== _flush_epoch) {
        loc.disp_flushed_cell = _buffered_capture_cell(loc);
        loc.disp_flush_epoch = _flush_epoch;
    }
    loc.disp_glyph_color = color;
    /* C glyph_at() returns the logical glyph, before map_glyphinfo resolves
     * its symset character. Keep that spelling for callers which substitute
     * glyphs (detect.c:2282-2286 S_litcorr -> S_corr in #terrain). */
    loc.disp_glyph_ch = ch;
    loc.disp_glyph_decgfx = !!decgfx;
    /* C display.c:2890-2916 map_glyphinfo derives MG_BW_LAVA/ICE/SINK
     * from the cmap glyph and active symbols. #terrain's back_to_glyph
     * reconstruction retains the cmap even when it has no baked attribute.
     * wintty.c:3930-3936 paints these flags with ATR_INVERSE. */
    if (cls === GLYPHCLS_CMAP && !attr)
        attr = _bw_terrain_hilite(cmap ?? _default_cmap_at(loc, ch, color));
    /* C wintty.c:3923-3926: with use_color, a cell with a frame colour
     * (getpos's valid-position background, getpos.c:57) skips the whole
     * MG_PET/MG_OBJPILE/MG_DETECT/MG_BW_* attribute chain. */
    if (game.iflags?.use_color !== false
        && game._getpos_frame_sel?.has(y * COLNO + x))
        attr = 0;
    /* C display.c:2594-2655 map_glyphinfo: only the hero's colour is tweaked on the fly;
     * every other glyph's colour was fixed by the last reset_glyphmap(), so a use_color
     * toggle leaves buffered/redrawn non-hero cells coloured until the option walk
     * ends (game._gm_use_color holds the pre-toggle value until then). */
    if ((cls === GLYPHCLS_MON ? game.iflags?.use_color
         : (game._gm_use_color ?? game.iflags?.use_color)) === false)
        color = NO_COLOR;
    /* dat/symbols Blank does not redefine S_trapped_door/S_trapped_chest. */
    if (blank_symbols() && (cls === GLYPHCLS_INVIS
        || (cls === GLYPHCLS_TRAP && trapType >= 1 && trapType <= 23))) {
        ch = ' ';
        decgfx = false;
    }
    let utf8 = false;
    // map_glyphinfo's ttychar survives even when g_putch paints no character.
    loc.disp_ttychar = null;
    /* dat/symbols:467-476 RogueIBM redefines only S_potion \xad and S_wand
     * \xe7 beyond what def_r_oc_syms already gives (no Color: the map stays
     * uncoloured); tty strips the high bit, so they paint as '-' and 'g'. */
    if (rogue_ibm_terrain() && !rogue_ibm_color() && cls === GLYPHCLS_OBJ
        && Number.isInteger(objectType)) {
        const oc = MKOBJ_OC_CLASS[objectType];
        if (objectType !== STATUE && (oc === 8 || oc === 11)) {
            const sym = oc === 8 ? 0xad : 0xe7;
            loc.disp_ttychar = sym;
            ch = String.fromCharCode(sym & 0x7f);
            decgfx = false;
        }
    }
    if (rogue_ibm_color() && cls === GLYPHCLS_OBJ
        && Number.isInteger(objectType)) {
        const oc = MKOBJ_OC_CLASS[objectType];
        /* display.c:2782-2830,2966-2984: statues/corpses are red;
         * ordinary objects are yellow for coins, red for food, blue otherwise. */
        if ((game._gm_use_color ?? game.iflags?.use_color) !== false)
            color = objectType === STATUE || objectType === CORPSE || oc === 7
                ? CLR_RED : oc === COIN_CLASS_DISP ? CLR_YELLOW : CLR_BRIGHT_BLUE;
        if (objectType !== STATUE && oc > 0 && oc < _EPYX_OBJECT_SYMBOLS.length) {
            const sym = _EPYX_OBJECT_SYMBOLS[oc];
            loc.disp_ttychar = sym;
            const byte = sym & 0x7f;
            ch = byte < 0x20 ? ROGUE_HERO_CH : String.fromCharCode(byte);
            decgfx = false;
        }
    }
    /* dat/symbols:524-545 RogueEpyx: every S_*_trap through S_polymorph_trap is
     * \x04, a control byte tty strips to nothing, so the cell keeps its
     * physical content (as for the object classes above). */
    if (rogue_ibm_color() && cls === GLYPHCLS_TRAP
        && Number.isInteger(trapType) && trapType >= 1 && trapType <= 22) {
        loc.disp_ttychar = 4;
        ch = ROGUE_HERO_CH;
        decgfx = false;
    }
    /* C symbols.c:238-240 and display.c:2653: decoded cmap overrides
     * apply with every primary symset, including default ASCII and DEC.
     * Resolve by glyph identity so remembered terrain uses the same override. */
    const cmapOverride = cls === GLYPHCLS_CMAP && !rogue_graphics()
        && game.go?.ov_primary_syms?.[cmap ?? _default_cmap_at(loc, ch, loc.disp_glyph_color)];
    /* C display.c:2653,2864: stomach cells use showsyms for every set,
     * including the hand-modelled IBM/DEC sets and SYMBOLS overrides. */
    if (cmapOverride || ((generic_symset() || (!rogue_graphics()
        && (cls === GLYPHCLS_SWALLOW || cls === GLYPHCLS_UNEXPLORED
            || cls === GLYPHCLS_NOTHING))) && !decgfx)) {
        /* C display.c:2925-2930 selects the cmap symbol before :3082 clears
         * color for !use_color. Keep the logical color which distinguishes
         * S_litcorr from S_corr when resolving this port's glyph identity. */
        const sc = symset_remap_cell(loc, ch, loc.disp_glyph_color, cls, objectType, trapType, cmap, objectCorpsenm);
        if (sc) { ch = sc.ch; decgfx = sc.dec; utf8 = !!sc.utf8; loc.disp_ttychar = sc.ttychar; if (sc.color !== undefined) color = sc.color; }
        /* C wintty.c:3758-3763 strips the high bit before writing an
         * alternate-charset symbol. A resulting control byte paints nothing,
         * just like an unshifted control byte: retain the physical cell. */
        /* A control-byte symbol paints nothing: the cell keeps its physical
         * content (_snapCellAt), as for the RogueEpyx hero. */
        if (sc?.ctl && !utf8) ch = ROGUE_HERO_CH;
    } else if ((ibm_mode() || rogue_ibm_terrain()) && cls === GLYPHCLS_CMAP) {
        /* C display.c:2653 keeps showsyms' full byte in glyphinfo;
         * pager.c:1266-1271 compares that byte before tty strips its high bit.
         * The hand-modelled IBM paint already contains the terminal character,
         * so retain the corresponding symbol without remapping that paint. */
        const idx = cmap ?? _default_cmap_at(loc, ch, color);
        if (idx >= 0) {
            /* C display.c:1850-1853,2925-2930: map_glyphinfo reads the
             * active showsyms alias, not primary_syms' default S_darkroom.
             * Retain the full symbol byte for pager.c's class matching. */
            const symidx = idx === 20 && !game._symsetDarkroomPending
                ? (_darkroom_alias_blank() ? SYM_OFFSETS.X : 19) : idx;
            // C display.c:2653 reads the active set before tty strips bit 7.
            const sym = rogue_ibm_terrain()
                ? pager_showsyms()[symidx] : primary_showsym(symidx);
            if (sym && (rogue_ibm_terrain()
                ? String.fromCharCode(sym & 0x7f) === ch
                : symset_cell(sym).ch === ch))
                loc.disp_ttychar = sym;
        }
    }
    /* C display.c:1930-1940 show_glyph() leaves gbuf (and gnew) alone when the
     * glyph is unchanged, so re-showing an unexplored cell does not repaint the
     * blank docorner()'s cl_end() left on the terminal. */
    const sameUnexplored = cls === GLYPHCLS_UNEXPLORED
        && loc.disp_cls === GLYPHCLS_UNEXPLORED && loc.disp_ch === ch
        && !utf8;
    if (!sameUnexplored && (cls === GLYPHCLS_UNEXPLORED
        || loc.disp_cls === GLYPHCLS_UNEXPLORED))
        loc[_CAPTURE_CELL_CACHE] = null;
    if (utf8)
        loc.disp_capture_cell = loc.disp_flushed_cell;
    else if (!sameUnexplored)
        loc.disp_capture_cell = null;
    /* C display.c:2033-2052 compares glyph identity AND buffered paint.
     * An unexplored symbol override differs from nul_gbuf's literal blank
     * even when the glyph family is unchanged. Its flush follows bot(). */
    /* display.c:2031-2052: a nul_gbuf entry (customcolor 0) differs from a
     * mapped GLYPH_UNEXPLORED that carries a glyph:G_unexplored/r-g-b
     * customcolor (glyphs.c:531-575), so even an unexplored-to-unexplored
     * show_glyph() after cls() is gnew and flush_screen prints the blank. */
    const nulCustom = loc.disp_nul_gbuf && cls === GLYPHCLS_UNEXPLORED
        && game.iflags?.customcolors !== false
        && !!glyphmap[GLYPH_UNEXPLORED_OFF]?.customcolor;
    loc.disp_nul_gbuf = false;
    if (y === ROWNO - 1 && (nulCustom || loc.disp_cls !== cls || loc.disp_ch !== ch
        || loc.disp_color !== color || !!loc.disp_decgfx !== !!decgfx
        || (loc.disp_attr | 0) !== (attr | 0))
        && !utf8 && ch !== ROGUE_HERO_CH) {
        let repaint = game._r1GlyphRepaint;
        if (!repaint || repaint.level !== game.level)
            repaint = game._r1GlyphRepaint = { level: game.level, xs: new Set() };
        /* A map-row-20 print after a menu dismissal's bot() (wiz_map's
         * show_map_spot) is a display.c:2236-2256 gnew print AFTER the next
         * bot(), so the dismissal's "status stays on top" note is spent. */
        game._r1botAfterMap = false;
        repaint.xs.add(x);
    }
    /* A glyph changed and restored before a flush is still gnew in C.
     * feel_location followed by display_self is one such pair (display.c:1042). */
    if (game._docrtTextBackdrop && (loc.disp_ch !== ch || loc.disp_color !== color
        || !!loc.disp_decgfx !== !!decgfx || (loc.disp_attr | 0) !== (attr | 0)
        || loc.disp_cls !== cls || (cls === GLYPHCLS_CMAP && loc.disp_cmap !== cmap)))
        game._docrtTextBackdrop.dirty.add(y * COLNO + x);
    loc.disp_ch = ch;
    loc.disp_color = color;
    loc.disp_decgfx = !!decgfx;
    loc.disp_attr = attr | 0;
    loc.disp_cls = cls;
    loc.disp_unmapped = undefined; // painted on this level; see goto_level's gbuf carry
    // C's gbuf retains glyph identity even when colors are disabled.
    loc.disp_cmap = cls === GLYPHCLS_CMAP ? cmap
        : cls === GLYPHCLS_ENGR ? (loc.typ === CORR ? 24 : 21) : null;
    loc.disp_mon_pm = null; // C gbuf's species; filled by monster glyph producers.
    loc.disp_mon_female = null;
    // display.h:554-565: normal, pet, detected and ridden glyphs have
    // distinct offsets even when their terminal symbol and color agree.
    loc.disp_mon_kind = cls === GLYPHCLS_MON ? 'normal' : null;
    // C gbuf keeps the trap identity even when no ftrap node exists.
    loc.disp_trap_type = cls === GLYPHCLS_TRAP ? trapType : null;
    /* C's display buffer retains the full glyph number.  Object farlook needs
     * its encoded otyp, which cannot be recovered from the rendered symbol or
     * colour (many object types share both). */
    loc.disp_obj_otyp = (cls === GLYPHCLS_OBJ && Number.isInteger(objectType))
        ? objectType : null;
    loc.disp_obj_corpsenm = ((loc.disp_obj_otyp === CORPSE
                              || loc.disp_obj_otyp === STATUE)
                             && Number.isInteger(objectCorpsenm))
        ? objectCorpsenm : null;
    /* C display.h:538-542: a pile top has its own glyph range
     * (GLYPH_OBJ_PILETOP_OFF...), so glyph_at() tells a boulder that sits on
     * another boulder (obj_is_piletop, display.h:798) from a lone one;
     * getpos.c:463 gather_locs_interesting compares against the plain
     * objnum_to_glyph(BOULDER) only. */
    loc.disp_obj_pile = loc.disp_obj_otyp !== null && !!objpile;
    loc.disp_is_warning = !!isWarning;
    loc.gnew = 1;
    /* #wizloaddes: C's gbuf survives clear_level_structures() and every
     * newsym()/show_glyph() the loader's makemon/mksobj calls make updates it
     * (makemon.c:1473), so the frozen pre-load frame must absorb those cells
     * (wizcmds.js wiz_load_splua sets liveGbuf).  C's show_glyph() returns
     * early under _suppress_map_output() (display.c:703-708, in_mklev) so
     * premap_detect's map_background() writes nothing to gbuf there. */
    const frz = game._levelgenPaintFreeze;
    if (frz && frz.liveGbuf && frz.cells && !suppress_map_output()) {
        /* C flush_screen() returns at once while in_mklev (display.c:2220), so
         * a gbuf update made before the loader raised in_mklev (the
         * makemap_remove_mons newsym()s) reaches the physical screen only at
         * the first unsuppressed flush: stage it in `pending`. */
        const pend = (frz.pending ||= new Map());
        pend.set(y * COLNO + x, ch === ' ' ? null
                 : { ch, color, dec: !!decgfx, attr: attr | 0 });
    }
}
/* Apply the gbuf updates staged by show_glyph_cell once a flush can run. */
function _levelgen_freeze_flush(frz) {
    if (!frz || !frz.pending || suppress_map_output()) return;
    for (const [k, c] of frz.pending) {
        if (c === null) frz.cells.delete(k); else frz.cells.set(k, c);
    }
    frz.pending = null;
}
function _levelgen_window_flush_note() {
    const g = game;
    if (!g || !g._levelgenWindowOpen || !g.u?.uz) return;
    /* display.c:2220 — flush_screen paints nothing (no bot()) while in_mklev
     * or restoring; getbones (mklev.c:1583) runs before in_mklev is set. */
    if (suppress_map_output()) return;
    // The same flush paints pending map glyphs too (display.c:2244-2253).
    g._levelgenWindowUz = { dnum: g.u.uz.dnum | 0, dlevel: g.u.uz.dlevel | 0,
                           cells: _capture_painted_cells() };
}
// C ref: display.c:378-385 map_invisible(x,y) — place the "I" (GLYPH_INVISIBLE)
// marker at (x,y) when a monster at that position cannot be spotted by the hero.
// Called from pre_mm_attack (mhitm.c:63-64) when !canspotmon(magr/mdef) and gv.vis.
// In C: if hero_memory, sets levl[x][y].glyph=GLYPH_INVISIBLE; then show_glyph(x,y,I).
// Simplified JS: display 'I' (dim, no color) at that tile, skip if it's the hero's pos.
export function map_invisible(x, y) {
    const u = game?.u;
    if (u && (x | 0) === (u.ux | 0) && (y | 0) === (u.uy | 0)) return; /* skip hero's tile */
    const loc = game?.level?.at(x, y);
    if (loc && game.level?.flags?.hero_memory)
        loc.remembered_glyph = { ch: 'I', color: NO_COLOR, decgfx: false,
                                 cls: GLYPHCLS_INVIS };
    show_glyph_cell(x, y, 'I', NO_COLOR, false, 0, GLYPHCLS_INVIS);
}

/* C dokick.c:1377,1415-1417: save glyph_at() before attacking and
 * show_glyph(oldglyph) after killing a newly marked invisible monster.
 * Save the logical buffer cell, independently of hero memory; restoring
 * it must neither recompute the terrain nor erase a remembered 'I'. */
export function save_glyph_cell(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return null;
    return {
        args: [loc.disp_glyph_ch ?? loc.disp_ch ?? ' ',
               loc.disp_glyph_color ?? loc.disp_color ?? NO_COLOR,
               loc.disp_glyph_decgfx ?? loc.disp_decgfx, loc.disp_attr,
               loc.disp_cls, loc.disp_is_warning, loc.disp_obj_otyp,
               loc.disp_obj_corpsenm, loc.disp_trap_type, loc.disp_cmap,
               loc.disp_obj_pile],
        mon: [loc.disp_mon_pm, loc.disp_mon_female, loc.disp_mon_kind],
    };
}

export function restore_glyph_cell(x, y, glyph) {
    if (!glyph || suppress_map_output()) return;
    show_glyph_cell(x, y, ...glyph.args);
    const loc = game.level?.at(x, y);
    if (loc)
        [loc.disp_mon_pm, loc.disp_mon_female, loc.disp_mon_kind] = glyph.mon;
}

/* C ref: display.c:387-397 unmap_invisible(x,y) — remove the invisible-monster
   marker from (x,y) when the hero realizes the monster is no longer there. */
/* C ref: display.h glyph_is_invisible(glyph) — is the tile's REMEMBERED glyph
 * the "remembered, unseen monster" marker?  js/ stores hero memory as
 * loc.remembered_glyph, and 'I' is the marker map_invisible() writes.  Exported
 * because C tests it at four sites outside display.c (mon.c:3170 mondead,
 * mon.c:3358 the statue path, uhitm.c:210/231), and each of those was
 * re-deriving or omitting the test. */
// are BOTH `glyph_is_invisible(glyph)` where `glyph = glyph_at(bhitpos.x,
// bhitpos.y)` -- the TRANSIENT SCREEN BUFFER (gg.gbuf), not hero memory. The
// memory-only body below is a real approximation for those two call sites
// -- the difference is visible only when a cell's current gbuf glyph
// can expose but ordinary single-pass gameplay rarely does, since JS
// repaints memory and screen together in the same call.
// the real gg.gbuf value for do_attack; the replay bridge
// (js/mapstate_game_bridge.js applyGbufGlyphsToGame) stores it as
// game.__gbuf__ (a flat {"x,y":glyph} map, present ONLY during a replay of
// cell -- more faithful than the memory approximation for the two call
// for any cell it does not cover (every other call site, and every record
// completely unaffected).
const GBUF_GLYPH_INVISIBLE = 1532; // LOCKSTEP with js/mapstate_game_bridge.js's
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
/* C display.h glyph_is_cmap(glyph_at(x,y)) + glyph_to_cmap(): traps and
 * engravings belong to the cmap ranges too. Return -1 for other families.
 * Read the displayed identity, which can differ from a mimic's disguise. */
export function glyph_cmap_at(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return -1;
    if (loc.disp_cls === GLYPHCLS_TRAP) {
        const ttyp = loc.disp_trap_type;
        return Number.isInteger(ttyp) && ttyp >= 1 && ttyp <= 25
            ? 49 + ttyp - 1 : -1;
    }
    if (loc.disp_cls === GLYPHCLS_ENGR)
        return loc.disp_cmap ?? -1;
    if (loc.disp_cls !== GLYPHCLS_CMAP) return -1;
    return loc.disp_cmap ?? _default_cmap_at(loc,
        loc.disp_glyph_ch ?? loc.disp_ch, loc.disp_glyph_color ?? loc.disp_color);
}
/* C getpos.c:1073-1101: match the displayed cmap, then hero memory, then
 * (in a separate pass after the vibrating-square test) seen bare terrain.
 * A nonmatching cmap must not mask either of the later glyph sources. */
export function getpos_cmap_matches(x, y, matching, terrain_only = false) {
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    const matches = cmap => Number.isInteger(cmap) && cmap >= 0 && !!matching[cmap];
    if (terrain_only)
        return !!loc.seenv && matches(terrain_glyph(loc, x, y, true).cmap);
    if (matches(glyph_cmap_at(x, y)))
        return true;
    if (!game.level.flags.hero_memory || game.iflags?.terrainmode)
        return false;
    const rg = loc.remembered_glyph;
    if (!rg) return false;
    if (rg.cls === GLYPHCLS_TRAP)
        return matches(Number.isInteger(rg.ttyp) ? 49 + rg.ttyp - 1 : -1);
    if (rg.cls === GLYPHCLS_ENGR)
        return matches(rg.cmap ?? (rg.bwengr ? 24 : 21));
    return matching.some((match, cmap) => match && _rg_is_cmap(rg, cmap));
}
export function glyph_is_invisible_at(x, y) {
    if (!isok(x, y)) return false;
    const gbuf = game.__gbuf__;
    if (gbuf) {
        const v = gbuf[`${x | 0},${y | 0}`];
        if (v !== undefined) return v === GBUF_GLYPH_INVISIBLE;
    }
    const loc = game.level?.at?.(x, y);
    /* C glyph_at() reads gg.gbuf, the PAINTED glyph.  On a !hero_memory level
     * (the Plane of Air) map_invisible() paints the 'I' without writing it to
     * hero memory, so the painted cell is the only place it lives. */
    if (loc && loc.disp_cls === GLYPHCLS_INVIS && loc.disp_ch === 'I') return true;
    /* Underwater, under_water() blanks the painted cells (gbuf) while hero
     * memory keeps the 'I'; glyph_at() sees only the blanked cell. */
    if (loc && game.u?.uinwater && loc.disp_cls !== undefined) return false;
    /* under_water()'s limited update (display.c:1411-1415) show_glyph()s
     * GLYPH_UNEXPLORED over the old 3x3, erasing a painted 'I' from gbuf while
     * hero memory (levl[x][y].glyph) still holds it. */
    if (loc && loc.disp_cls === GLYPHCLS_UNEXPLORED) return false;
    return !!(loc && loc.remembered_glyph && loc.remembered_glyph.ch === 'I'
              && loc.remembered_glyph.cls === GLYPHCLS_INVIS);
}
export function unmap_invisible(x, y) {
    if (isok(x, y)) {
        const loc = game.level.at(x, y);
        const rg = loc?.remembered_glyph;
        if (rg && rg.ch === 'I' && rg.cls === GLYPHCLS_INVIS) {
            unmap_object(x, y);
            newsym(x, y);
            return true;
        }
    }
    return false;
}

/* ---- helpers for map_object ---- */

const POTION_CLASS_OC = 8;
const FIRST_REAL_GEM_OTYP = 439;  /* DILITHIUM_CRYSTAL (js/dokick.js:242, js/makemon.js:1747) */
const LAST_GLASS_GEM_OTYP = 469;  /* worthless piece of violet glass (js/makemon.js:1749 LUCKSTONE=470, -1) */
const FIRST_SPELL_OTYP = 366;     /* SPE_DIG (js/zap.js:85, js/spell.js:18) */
const LAST_SPELL_OTYP = 407;      /* SPE_BLANK_PAPER (js/mklev.js:184, js/spell.js:20, js/u_init.js:1000) */
function _obj_is_generic(otyp, oclass) {
    return oclass === POTION_CLASS_OC
        || (otyp >= FIRST_REAL_GEM_OTYP && otyp <= LAST_GLASS_GEM_OTYP)
        || (otyp >= FIRST_SPELL_OTYP && otyp <= LAST_SPELL_OTYP);
}
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
/* The paint-time attribute of an MG_OBJPILE glyph, for callers outside this
 * file that re-show a remembered object glyph (detect.c:1412 show_glyph of
 * oldglyph): print_glyph re-derives it from the live hilite_pile option. */
export function objpile_attr(objpile) {
    return _pile_hilite(objpile);
}
function _bw_engr_hilite(bwengr) {
    if (!bwengr || rogue_ibm_color())
        return 0;
    const symbols = [24, 22, 23].map(idx => /* S_engrcorr, S_corr, S_litcorr */
        (rogue_graphics()
            ? (game.go?.ov_rogue_syms?.[idx] || game.gr?.rogue_syms?.[idx])
            : primary_showsym(idx)) || defsym_char(idx).charCodeAt(0));
    if (symbols[0] !== symbols[1] && symbols[0] !== symbols[2])
        return 0;
    if (game.iflags?.wc_inverse === false)
        return 0;
    return 1; /* ATR_INVERSE */
}
function _bw_terrain_hilite(cmap) {
    if (game.iflags?.use_color !== false || game.iflags?.wc_inverse === false)
        return 0;
    let peers;
    switch (cmap) {
    case 36: peers = [37]; break;       /* S_sink vs S_fountain */
    case 39: peers = [19, 20]; break;   /* S_ice vs S_room/S_darkroom */
    case 40: case 41: peers = [38, 48]; break; /* lava vs pool/water */
    default: return 0;
    }
    const symbol = (idx) => {
        /* reglyph_darkroom aliases S_darkroom to SYM_NOTHING without color. */
        if (idx === 20 && !game._symsetDarkroomPending) idx = SYM_OFFSETS.X;
        return (rogue_graphics()
            ? (game.go?.ov_rogue_syms?.[idx] || game.gr?.rogue_syms?.[idx])
            : primary_showsym(idx)) || defsym_char(idx).charCodeAt(0);
    };
    return peers.some(idx => symbol(cmap) === symbol(idx)) ? 1 : 0;
}
/* The attribute a remembered glyph paints with: MG_OBJPILE and MG_BW_ENGR are
 * re-derived, any other baked attr is passed through. */
function _glyph_attr(rg) {
    if (!rg)
        return 0;
    if (rg.bwspec && rg.cmap != null)
        return _bw_terrain_hilite(rg.cmap); /* display.c:2893-2916 compares the live symbols */
    if (rg.bwspec)
        return game.iflags?.use_color === false && game.iflags?.wc_inverse !== false
            ? 1 : 0; /* MG_BW_LAVA/ICE/SINK -> ATR_INVERSE (display.c:2894-2916, wintty.c:3930-3936) */
    if (rg.objpile)
        return _pile_hilite(true);
    if (rg.bwengr)
        return _bw_engr_hilite(true);
    return (rg.attr | 0);
}
function _obj_to_glyph(obj, raw = false) {
    const otyp = (obj.otyp | 0);
    /* C display.c:2788-2821 — MG_OBJPILE, applied by the tty as ATR_INVERSE. */
    const pileTop = _obj_is_piletop(obj);
    if (!raw && _hallucinating_dsp())
        return _hallucinated_obj_glyph(obj);
    if (otyp === STATUE) {
        const scnm = (obj.corpsenm | 0);
        const smlet = (scnm >= 0 && scnm < MON_MLET.length) ? MON_MLET[scnm] : 53;
        return { ch: monster_symbol(smlet), color: CLR_WHITE, decgfx: false,
                 objpile: pileTop, cls: GLYPHCLS_OBJ, otyp,
                 corpsenm: scnm }; /* glyph_to_statue_corpsenm() carries the species (pager.c:340) */
    }
    const oc = (otyp >= 0 && otyp < MKOBJ_OC_CLASS.length)
        ? MKOBJ_OC_CLASS[otyp] : (obj.oclass | 0);
    const och = _object_sym(otyp, oc) ?? '?';
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

function _hallucinated_obj_glyph(obj) {
    if (typeof process !== 'undefined' && ENV?.FF_DISPLAY_TRACE === '1') {
        const seq = game.__ff_display_trace_seq = (game.__ff_display_trace_seq | 0) + 1;
        const caller = String(new Error().stack || '').split('\n')[2]?.trim()
            .replace(/^at\s+/, '').replace(/\s+\([^)]*\)$/, '') || '?';
        const line = `^hallu_obj[seq=${seq} moves=${game.moves | 0} xy=${obj?.ox ?? '?'},${obj?.oy ?? '?'} otyp=${obj?.otyp | 0} id=${obj?.o_id ?? 0} statue=${(obj?.otyp | 0) === STATUE ? 1 : 0} caller=${caller} newsymCaller=${game.__ff_display_newsym_caller ?? '?'}]`;
        pushRngLogEntry(line);
        console.error(line);
    }
    if ((obj.otyp | 0) === STATUE) {
        const hmndx = random_monster();
        const female = rn2_on_display_rng(2);
        const hmlet = (hmndx >= 0 && hmndx < MON_MLET.length) ? MON_MLET[hmndx] : 53;
        return { ch: monster_symbol(hmlet),
                 color: (hmndx >= 0 && hmndx < MON_MCOLOR.length) ? MON_MCOLOR[hmndx] : CLR_GRAY,
                 decgfx: false, objpile: false, cls: GLYPHCLS_MON,
                 glyph: hmndx + (female ? GLYPH_MON_FEM_OFF : GLYPH_MON_MALE_OFF) };
    }
    return random_obj_to_glyph();
}

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
 * a hallucinated pile top loses its MG_OBJPILE hilite, exactly as in C.
 * The returned cell also carries the drawn GLYPH id, because this is the glyph
 * map_object() REMEMBERS (display.c:354-362) — the id's RANGE is what
 * distinguishes a plain-object draw from a statue draw when the memory is
 * re-resolved later (see _remembered_glyph_cell). */
function random_obj_to_glyph() {
    const otyp = random_object();
    if (otyp === CORPSE) {
        const mndx = random_monster();
        const oc = MKOBJ_OC_CLASS[CORPSE];
        return { ch: oclass_sym(oc) ?? '?',
                 color: (mndx >= 0 && mndx < MON_MCOLOR.length) ? MON_MCOLOR[mndx] : CLR_GRAY,
                 decgfx: false, objpile: false, cls: GLYPHCLS_OBJ, otyp,
                 corpsenm: mndx, glyph: mndx + GLYPH_BODY_OFF };
    }
    const oc = MKOBJ_OC_CLASS[otyp];
    /* Same colour resolution normal_obj_to_glyph gets below: the shuffled
     * appearance colour when this otyp's description was randomised, else the
     * objects[] column. */
    const shufCol = game._objColors?.[otyp];
    const ocol = (shufCol !== undefined) ? shufCol
        : ((otyp >= 0 && otyp < MKOBJ_OC_COLOR.length) ? MKOBJ_OC_COLOR[otyp]
           : (OCLASS_COLOR[oc] ?? CLR_GRAY));
    return { ch: _object_sym(otyp, oc) ?? '?', color: ocol, decgfx: false,
             objpile: false, cls: GLYPHCLS_OBJ, otyp,
             glyph: otyp + GLYPH_OBJ_OFF };
}

/* C display.h:966 obj_to_glyph(obj, rng) — the glyph an object shows as.
 * This port models a "glyph" as a resolved {ch,color,decgfx,cls} cell (see
 * tmp_at()'s own comment below), so this returns that cell.  Exported for
 * mthrowu.c's tmp_at(DISP_FLASH, obj_to_glyph(...)) missile animation.
 * Resolve the logical glyph through C's cached map_glyphinfo below;
 * reroll_menu's nonselectable rows do not paint the resolved menu glyph
 * (wintty.c:1474-1483). Hallucination uses the display RNG above. */
export function obj_to_glyph(obj) {
    const cell = _obj_to_glyph(obj);
    let glyph = cell.glyph;
    if (glyph == null) {
        if ((obj.otyp | 0) === STATUE && !_hallucinating_dsp()) {
            const female = ((obj.spe | 0) & CORPSTAT_GENDER) === CORPSTAT_FEMALE;
            glyph = (obj.corpsenm | 0) + (cell.objpile
                ? (female ? GLYPH_STATUE_FEM_PILETOP_OFF : GLYPH_STATUE_MALE_PILETOP_OFF)
                : (female ? GLYPH_STATUE_FEM_OFF : GLYPH_STATUE_MALE_OFF));
        } else if (cell.otyp === CORPSE) {
            glyph = cell.corpsenm + (cell.objpile ? GLYPH_BODY_PILETOP_OFF : GLYPH_BODY_OFF);
        } else {
            glyph = cell.otyp + (cell.objpile ? GLYPH_OBJ_PILETOP_OFF : GLYPH_OBJ_OFF);
        }
    }
    // C pickup.c:1125-1126: menu glyphs use (0,0), outside the hero square.
    // Keep the already-rolled identity: mapping must not draw hallucinations again.
    const info = {};
    map_glyphinfo(0, 0, glyph, 0, info);
    let symbol = typeof info.ttychar === 'string' ? info.ttychar.charCodeAt(0) : info.ttychar;
    // carries drawing.c's default character until a symset populates them.
    if (!symbol && rogue_ibm_color()) {
        const idx = info.gm.sym.symidx;
        if (idx >= SYM_OFFSETS.O && idx < SYM_OFFSETS.M)
            symbol = _EPYX_OBJECT_SYMBOLS[idx - SYM_OFFSETS.O];
        else if (idx === SYM_OFFSETS.M + 53)
            symbol = 1; // dat/symbols RogueEpyx S_human
    }
    const painted = symbol ? symset_cell(symbol) : { ch: cell.ch, dec: cell.decgfx };
    if (rogue_ibm_terrain()) painted.dec = false;
    return { ...cell, ch: painted.ch, decgfx: painted.dec, color: info.gm.sym.color };
}

/* C wintty.c:1474-1483: draw an object's resolved menu glyph in its own
 * color.  Selection markers are drawn by the caller instead of the glyph. */
function menu_glyph_text(glyph) {
    const color = game.iflags?.use_color === false ? NO_COLOR : glyph.color;
    let sgr;
    if (color === CLR_BLACK)
        sgr = (game.iflags?.wc2_darkgray ?? true) ? 90 : 34;
    else if (color >= CLR_RED && color <= CLR_CYAN)
        sgr = 30 + color;
    else if (color >= CLR_ORANGE && color <= CLR_WHITE)
        sgr = 90 + color - 8;
    return sgr === undefined ? glyph.ch : `\x1b[${sgr}m${glyph.ch}\x1b[39m`;
}

/* C wintty.c:1177-1194 set_item_state updates only the marker: '+' on a
 * toggle, '#' for a count, '-' on deselection.  A page redraw (1470-1483)
 * instead paints '*' for selected items and restores unselected glyphs. */
export function menu_item_marker(item, page, showGlyph) {
    const previous = item._menuGlyphState;
    const selected = !!item.selected;
    const count = item.count > 0 ? item.count : -1;
    let marker;
    if (!previous || previous.page !== page)
        marker = selected ? (count > 0 ? '#' : '*')
            : showGlyph ? menu_glyph_text(item.glyph) : '-';
    else if (previous.selected !== selected || (selected && previous.count !== count))
        marker = selected ? (count > 0 ? '#' : '+') : '-';
    else
        marker = previous.marker;
    item._menuGlyphState = { page, selected, count, marker };
    return marker;
}

// C dig.c:28-137: animate the Earth plane's expanding or collapsing cave.
function rm_waslit() {
    const { ux, uy } = game.u;
    const here = game.level.at(ux, uy);
    if (here.typ === ROOM && here.waslit)
        return true;
    for (let x = ux - 2; x < ux + 3; ++x)
        for (let y = uy - 1; y < uy + 2; ++y)
            if (isok(x, y) && game.level.at(x, y).waslit)
                return true;
    return false;
}

async function mkcavepos(x, y, dist, waslit, rockit) {
    if (!isok(x, y))
        return;
    const lev = game.level.at(x, y);
    if (rockit) {
        if (IS_OBSTRUCTED(lev.typ) || t_at(x, y))
            return;
        const mon = _m_at(x, y);
        if (mon && !(mon.data.mflags1 & 0x00000008 /* M1_WALLWALK */))
            await rloc(mon, RLOC_NOMSG);
    } else if (lev.typ === ROOM) {
        return;
    }
    unblock_point(x, y);
    lev.seenv = 0;
    lev.doormask = 0;
    if (dist < 3)
        lev.lit = !rockit;
    if (waslit)
        lev.waslit = !rockit;
    lev.horizontal = false;
    game.viz_array[y][x] = dist < 3 ? (IN_SIGHT | COULD_SEE) : COULD_SEE;
    lev.typ = rockit ? STONE : ROOM;
    if (dist >= 3)
        await rumor_impossible('mkcavepos called with dist %d', dist);
    feel_newsym(x, y);
}

export async function mkcavearea(rockit) {
    const { ux, uy } = game.u;
    let xmin = ux, xmax = ux, ymin = uy, ymax = uy;
    const waslit = rm_waslit();
    if (rockit)
        await pline('Crash!  The ceiling collapses around you!');
    else
        await pline('A mysterious force %s cave around you!',
            game.level.at(ux, uy).typ === CORR ? 'creates a' : 'extends the');
    if (game._pending_message)
        await force_more(game._pending_message); // WIN_MESSAGE, TRUE

    for (let dist = 1; dist <= 2; ++dist) {
        --xmin;
        ++xmax;
        if (dist < 2) {
            --ymin;
            ++ymax;
            for (let i = xmin + 1; i < xmax; ++i) {
                await mkcavepos(i, ymin, dist, waslit, rockit);
                await mkcavepos(i, ymax, dist, waslit, rockit);
            }
        }
        for (let i = ymin; i <= ymax; ++i) {
            await mkcavepos(xmin, i, dist, waslit, rockit);
            await mkcavepos(xmax, i, dist, waslit, rockit);
        }
        await flush_screen(1);
        nh_delay_output();
    }
    const here = game.level.at(ux, uy);
    if (!rockit && here.typ === CORR) {
        here.typ = ROOM;
        if (waslit)
            here.waslit = true;
        newsym(ux, uy);
    }
    game.vision_full_recalc = 1;
}

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

function _sparkle_on() {
    return game.flags?.sparkle !== false;
}

export function explode_shield_effect(cells) {
    if (!_sparkle_on() || !cells.length)
        return false;
    for (let k = 0; k < shield_symbols.length; ++k) {
        for (const c of cells)
            show_shield_frame(c.x, c.y, k);
        flush_screen_point(1); /* C: curs_on_u() */
        nh_delay_output();
    }
    /* Cover last shield glyph with blast symbol. */
    for (const c of cells) {
        const zc = _expl_glyph_cell(c.glyph);
        if (zc)
            show_glyph_cell(c.x, c.y, zc.ch, zc.color, zc.dec, 0, GLYPHCLS_CMAP,
                            false, null, null, null, zc.cmap ?? null);
        else
            show_glyph(c.x, c.y, c.glyph);
    }
    return true;
}

export function shieldeff(x, y) {
    if (!_sparkle_on() || !cansee(x, y))
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
    if (!_sparkle_on())
        count = Math.trunc(count / 2);
    const row = game.viz_array?.[y];
    const saved = row?.[x] | 0;
    if (row)
        row[x] = saved | IN_SIGHT | COULD_SEE;
    try {
        flash_glyph_at(x, y, mon_to_glyph(mon), count);
    } finally {
        if (row)
            row[x] = saved;
    }
    newsym(x, y);
}

/* C display.c:1305-1324.  Leave the remembered background displayed without
 * newsym(): detection callers may be changing the square's visibility. */
export function flash_glyph_at(x, y, glyph, repeatcount) {
    const loc = game.level.at(x, y);
    const background = game.level.flags?.hero_memory
        ? (loc.remembered_glyph ?? { ch: ' ', color: NO_COLOR, cls: GLYPHCLS_UNEXPLORED })
        : _terrain_memory_glyph(loc, terrain_glyph(loc, x, y, true));
    for (let i = 0; i < repeatcount * 2; ++i) {
        /* C show_glyph resolves the stored glyph through the current glyphmap,
         * including GLYPH_NOTHING and symbols changed since it was mapped.
         * back_to_glyph (the no-memory arm above) does not test cansee(). */
        if (i & 1) {
            _show_remembered_glyph(x, y, background);
        } else {
            show_glyph_cell(x, y, glyph.ch, glyph.color, !!(glyph.decgfx ?? glyph.dec),
                            _glyph_attr(glyph), glyph.cls ?? GLYPHCLS_CMAP, !!glyph.isWarning,
                            glyph.otyp, glyph.corpsenm, glyph.ttyp, glyph.cmap, !!glyph.objpile);
        }
        flush_screen_point(1);
        nh_delay_output();
    }
}

/* C display.h:554 mon_to_glyph(mon, rn2_on_display_rng): a plain monster,
 * including for pets and mimics, with one display draw while hallucinating. */
export function mon_to_glyph(mon) {
    const mndx = _hallucinating_dsp() ? random_monster()
        : (mon.data?.pmidx ?? mon.mnum ?? mon.mndx);
    const color = rogue_ibm_color() ? (mon.female ? NO_COLOR : CLR_YELLOW)
        : MON_MCOLOR[mndx];
    return { ch: monster_symbol(MON_MLET[mndx]), color, decgfx: false,
             cls: GLYPHCLS_MON, attr: _wizmgender_attr(mon.female) };
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
                        glyph.corpsenm, null, null, glyph.objpile);
    /* A hallucinated statue is stored as a random MONSTER glyph (display.h:950-953);
     * glyph_to_mon() on it (uhitm.c:6245 that_is_a_mimic) needs the species. */
    if (show && glyph.cls === GLYPHCLS_MON && Number.isInteger(glyph.glyph)) {
        const loc = game.level?.at(x, y);
        if (loc && loc.disp_cls === GLYPHCLS_MON) {
            const fem = glyph.glyph >= GLYPH_MON_FEM_OFF;
            loc.disp_mon_pm = glyph.glyph - (fem ? GLYPH_MON_FEM_OFF : GLYPH_MON_MALE_OFF);
            loc.disp_mon_female = fem;
        }
    }
}

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
            if (typeof process !== 'undefined' && ENV?.FF_NEAR_TRACE === '1' && obj) {
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
    const tg = trap_table_entry(ttyp);
    const glyph = tg ? { ch: tg.ch, color: tg.color, decgfx: false,
                         cls: GLYPHCLS_TRAP, ttyp } : null;

    if (glyph) {
        if (game.level?.flags?.hero_memory) {
            const loc = game.level.at(x, y);
            if (loc) loc.remembered_glyph = glyph;
        }
        if (show)
            show_glyph_cell(x, y, glyph.ch, glyph.color, glyph.decgfx, _glyph_attr(glyph), glyph.cls, false, null, null, glyph.ttyp);
    }
}

/* unmap_object - ported from display.c:408-436 */
export function unmap_object(x, y) {
    if (!game.level?.flags?.hero_memory)
        return;

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
                map_background(x, y, 0);
            }

            /* turn remembered dark room squares dark */
            if (!loc.waslit && loc.typ === ROOM) {
                if (_rg_is_cmap(loc.remembered_glyph, S_ROOM_C))
                    loc.remembered_glyph = _feel_cmap_glyph(S_STONE_C);
            }
        } else {
            loc.remembered_glyph = _feel_cmap_glyph(S_STONE_C);
        }
    }
}

// C ref: display.c:455-477 _map_location MAP_OBJECT_AT — compute the glyph that
// the hero REMEMBERS at (x,y): object (vobj_at) > seen trap > engraving > terrain.
// This is what map_object()/map_trap()/map_background() write to lev->glyph, used
// for the remembered-terrain layer under a monster and for out-of-sight cells.
function _map_location_glyph(x, y, loc, tg) {
    const obj = game.level?.levelObjects?.[x]?.[y] ?? null;
    if (obj !== null && !covers_objects(x, y)) {
        const otyp = (obj.otyp | 0);
        /* C display.c:2788-2821 MG_OBJPILE -> wintty.c:3930 ATR_INVERSE. */
        const pileTop = _obj_is_piletop(obj);
        if (otyp === STATUE) {
            const scnm = (obj.corpsenm | 0);
            const smlet = (scnm >= 0 && scnm < MON_MLET.length) ? MON_MLET[scnm] : 53;
            return { ch: monster_symbol(smlet), color: CLR_WHITE, decgfx: false,
                     objpile: pileTop, cls: GLYPHCLS_OBJ, otyp,
                     corpsenm: scnm };
        }
        const oc = (otyp >= 0 && otyp < MKOBJ_OC_CLASS.length)
            ? MKOBJ_OC_CLASS[otyp] : (obj.oclass | 0);
        const och = _object_sym(otyp, oc) ?? '?';
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
        const tg2 = trap_table_entry(ttyp);
        if (tg2) return { ch: tg2.ch, color: tg2.color, decgfx: false, cls: GLYPHCLS_TRAP, ttyp };
    }
    const styp = loc.typ;
    /* C display.c:462-464 — the engraving arm takes covers_traps() too.  It can
     * never fire here (spot_shows_engravings is ROOM/CORR/ICE and none of those
     * is a pool or lava), so this is structural faithfulness, not a behaviour
     * change; kept so the cascade reads arm-for-arm against C. */
    if ((styp === ROOM || styp === CORR || styp === ICE) && !covers_traps(x, y)) {
        const ep = engr_at(x, y);
        if (ep !== null) {
            const eCh = engraving_symbol(styp === CORR);
            return { ch: eCh, color: engraving_color(), decgfx: false,
                     bwengr: (styp === CORR), cls: GLYPHCLS_ENGR };
        }
    }
    return _terrain_memory_glyph(loc, tg);
}
// C display.c show_mon_or_warn: showing a monster or warning retires the
// remembered invisible marker, while preserving a visible object beneath it.
function show_mon_or_warn(x, y, ch, color, decgfx, attr, cls, warning = false) {
    /* detect.c:120-134 map_monst calls show_glyph() directly, never
     * show_mon_or_warn(), so a remembered 'I' under a detected monster survives. */
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
// not exercise the pet-vs-normal color distinction that pet_to_glyph adds).
function _render_monster_glyph(x, y, mon, loc, tg, map_memory, worm_tail, detectedOnly = false) {
    const _apType = (mon.m_ap_type | 0) & M_AP_TYPMASK;
    const mon_mimic = _apType !== M_AP_NOTHING;
    /* C display.c:522-523 — protection reveals a disguise just as sensing does. */
    const shapeProtection = _uprop(PROT_FROM_SHAPE_CHANGERS);
    const sensed = mon_mimic
        && (shapeProtection.i || shapeProtection.e || sensemon(mon));
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
                corpsenm: (mon.mextra?.mcorpsenm != null && mon.mextra.mcorpsenm !== -1)
                    ? (mon.mextra.mcorpsenm | 0) : PM_TENGU_DISP,
                oclass: 0, dknown: 0, quan: 1,
            };
            map_object(fake, !sensed);
            if (!sensed)
                return;
        } else if (_apType === M_AP_MONSTER) {
            /* C display.c:578-583 — show_glyph(monnum_to_glyph(what_mon(
             * mappearance, rn2_on_display_rng), mgendercode)).  what_mon is the
             * hallucination indirection; non-hallucinating it is the identity. */
            const amndx = _hallucinating_dsp() ? random_monster() : mon.mappearance | 0;
            const amlet = (amndx >= 0 && amndx < MON_MLET.length) ? MON_MLET[amndx] : 53;
            show_glyph_cell(x, y, monster_symbol(amlet),
                (amndx >= 0 && amndx < MON_MCOLOR.length) ? MON_MCOLOR[amndx] : 7,
                false, 0, GLYPHCLS_MON);
            loc.disp_mon_pm = amndx;
            loc.disp_mon_female = !!mon.female;
            if (!sensed)
                return;
        }
        else if (_apType === M_AP_FURNITURE) {
            const _sym = mon.mappearance | 0;
            const _g = cmap_to_glyph_disp(_sym);
            if (_g) {
                loc.remembered_glyph = { ch: _g.ch, color: _g.color, bwspec: _g.bwspec,
                                         decgfx: _g.dec, cls: GLYPHCLS_CMAP, cmap: _sym };
                if (!sensed) {
                    show_glyph_cell(x, y, _g.ch, _g.color, _g.dec,
                                    _glyph_attr(loc.remembered_glyph),
                                    GLYPHCLS_CMAP, false, null, null, null, _sym);
                    loc.lastseentyp = cmap_to_type(_sym);
                    return;
                }
            }
            /* Invalid furniture supplies no disguise glyph; the real monster
             * below still requires C's sensed test. */
        }
    }
    /* C display.c:588 — only !mon_mimic || sensed draws the real monster.
     * Infravision alone can reach here without PHYSICALLY_SEEN: C then
     * paints neither the disguise nor the monster. detect.c:map_monst bypasses
     * display_monster entirely and draws its glyph separately. */
    if (mon_mimic && !sensed)
        return;
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
    const mch = monster_symbol(mlet);
    let mcol = (mndx >= 0 && mndx < MON_MCOLOR.length) ? MON_MCOLOR[mndx] : 7;
    /* C display.c:3010-3065: detected, pet and female Rogue glyphs have
     * NO_COLOR; normal male glyphs are yellow. Hallucination randomizes the
     * species, but retains gender and uses a normal/detected glyph for pets
     * (display.c:599-618), so Rogue colors still apply. */
    if (rogue_ibm_color())
        mcol = ((mon.mtame && !_hallu) || detectedOnly || mon.female)
            ? NO_COLOR : CLR_YELLOW;
    const _pa = (game.iflags?.wc2_petattr | 0) || 7 /* ATR_INVERSE */;
    /* wc2_petattr holds C's ATR_* numbering (wintype.h); terminal.js's differ. */
    const petAttr = (mon.mtame && !_hallu && game.iflags?.wc_hilite_pet)
        ? (_pa === 7 ? 1 : _pa === 1 ? 2 : _pa === 4 ? 4 : 0) : 0;
    // C display_monster gives pets precedence over DETECTED; tty applies
    // use_inverse to a detection glyph even when pet highlighting is off.
    const detectedAttr = detectedOnly && !(mon.mtame && !_hallu)
        && game.iflags?.wc_inverse !== false ? 1 : 0;
    const petOrDet = petAttr || (mon.mtame && !_hallu && game.iflags?.wc_hilite_pet ? 0 : (detectedAttr || _wizmgender_attr(mon.female)));
    show_mon_or_warn(x, y, mch, mcol, false, petOrDet, GLYPHCLS_MON);
    if (loc.disp_cls === GLYPHCLS_MON && !loc.disp_is_warning) {
        loc.disp_mon_pm = mndx;
        loc.disp_mon_female = !!mon.female;
        loc.disp_mon_kind = mon.mtame && !_hallu ? 'pet'
            : detectedOnly ? 'detected' : 'normal';
    }
    mon.meverseen = 1;
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
/* C detect.c:120-134 map_monst(): select a glyph directly, independently
 * of display_monster's vision, mimic, memory and recognition rules.  Unlike
 * display_monster, pet_to_glyph is used even during hallucination. */
export function map_monst(mtmp, showtail) {
    const actual = (mtmp.mnum ?? mtmp.mndx) | 0;
    const detected = DEF_MONSYM_CHARS[MON_MLET[actual]] === ' ';
    const shown = _hallucinating_dsp() ? random_monster() : actual;
    show_detected_monster_glyph(mtmp.mx | 0, mtmp.my | 0, shown, mtmp, detected);
    if (showtail && actual === PM_LONG_WORM_DISP)
        detect_wsegs(mtmp, false);
}

/* C worm.c:511-518 glyph selection; display.c:3010-3068 and tty glyph attrs. */
export function show_detected_monster_glyph(x, y, mndx, mon, detected) {
    if (suppress_map_output() || !isok(x, y)) return;
    const pet = !detected && !!mon.mtame;
    let color = MON_MCOLOR[mndx];
    if (rogue_ibm_color())
        color = (detected || pet || mon.female) ? NO_COLOR : CLR_YELLOW;
    let attr = detected && game.iflags?.wc_inverse !== false
        ? 1 : _wizmgender_attr(mon.female);
    if (pet && game.iflags?.wc_hilite_pet) {
        const pa = game.iflags.wc2_petattr ?? 7;
        attr = pa === 7 ? 1 : pa === 1 ? 2 : pa === 4 ? 4 : 0;
    }
    show_glyph_cell(x, y, monster_symbol(MON_MLET[mndx]), color, false, attr, GLYPHCLS_MON);
    const loc = game.level?.at(x, y);
    if (loc) {
        loc.disp_mon_pm = mndx;
        loc.disp_mon_female = !!mon.female;
        loc.disp_mon_kind = detected ? 'detected' : pet ? 'pet' : 'normal';
    }
}

/* C ref: display.c:1180-1189 display_self(void) — paint the hero's own square
 * with hero_glyph, bypassing the canspotself() test the caller already made. */
/* C wintty.c:3930-3935 — (special & MG_FEMALE) && wizard && iflags.wizmgender,
 * with iflags.use_inverse, paints a female monster (and a female hero) reversed.
 * Reached only when the MG_PET/hilite_pet arm above it did not fire. */
function _wizmgender_attr(female) {
    return (female && game.flags?.debug && game.iflags?.wizmgender
            && game.iflags?.wc_inverse !== false) ? 1 : 0;
}
export function display_self() {
    const u = game.u || {};
    /* C display.h:251-261 — the U_AP_TYPE ladder inside maybe_display_usteed's
     * otherwise_self: a hero polymorphed into a mimic who used #monster to
     * imitate something (polyself.c:2286, domonability -> dohide) is drawn as
     * that object / furniture / monster instead of hero_glyph. */
    const ap = ((game.youmonst?.m_ap_type | 0) & M_AP_TYPMASK);
    if (ap !== M_AP_NOTHING && !(u.usteed && mon_visible(u.usteed))) {
        const app = (game.youmonst.mappearance | 0);
        if (ap === M_AP_OBJECT) {
            /* objnum_to_glyph(mappearance): the generic object glyph, no pile flag */
            /* objnum_to_glyph() is a raw glyph: no Hallucination substitution */
            const og = _obj_to_glyph({ otyp: app, corpsenm: PM_TENGU_DISP, oclass: 0, dknown: 0, quan: 1 }, true);
            show_glyph_cell(u.ux | 0, u.uy | 0, og.ch, og.color, og.decgfx,
                            0, og.cls, false, og.otyp, og.corpsenm);
            return;
        }
        if (ap === M_AP_FURNITURE) {
            const fg = cmap_to_glyph_disp(app);
            if (fg) {
                show_glyph_cell(u.ux | 0, u.uy | 0, fg.ch, fg.color, fg.dec,
                                _glyph_attr({ ch: fg.ch, color: fg.color, decgfx: fg.dec, cls: GLYPHCLS_CMAP, bwspec: fg.bwspec }),
                                GLYPHCLS_CMAP);
                return;
            }
        } else {
            const mlet = (app >= 0 && app < MON_MLET.length) ? MON_MLET[app] : 53;
            show_glyph_cell(u.ux | 0, u.uy | 0, monster_symbol(mlet),
                (app >= 0 && app < MON_MCOLOR.length) ? MON_MCOLOR[app] : 7,
                false, 0, GLYPHCLS_MON);
            const loc = game.level.at(u.ux, u.uy);
            loc.disp_mon_pm = app;
            loc.disp_mon_female = !!((u.umonnum | 0) !== (u.umonster | 0)
                ? u.mfemale : game.flags?.female);
            return;
        }
    }
    const hg = _maybe_display_usteed();
    show_glyph_cell(u.ux | 0, u.uy | 0, hg.ch, hg.color, false,
                    _wizmgender_attr(!u.usteed && game.flags?.female), GLYPHCLS_MON);
    /* dat/symbols RogueEpyx S_human = \x01 (a control byte, painted as a blank);
     * map_glyphinfo makes the unpolymorphed hero CLR_YELLOW under
     * has_rogue_color (display.c:2624-2627). */
    if (rogue_ibm_color() && (u.umonnum | 0) === (u.umonster | 0) && !(u.usteed && mon_visible(u.usteed))) {
        show_glyph_cell(u.ux | 0, u.uy | 0, hg.ch === '@' ? ROGUE_HERO_CH : hg.ch, CLR_YELLOW,
                        false, 0, GLYPHCLS_MON);
    }
    // Retain hero_glyph's identity after either ordinary or Rogue rendering.
    const loc = game.level.at(u.ux, u.uy);
    loc.disp_mon_pm = hg.mndx;
    loc.disp_mon_female = !!(u.usteed && mon_visible(u.usteed) ? u.usteed.female
        : (u.umonnum | 0) !== (u.umonster | 0) ? u.mfemale : game.flags?.female);
    if (u.usteed && mon_visible(u.usteed))
        game.level.at(u.ux, u.uy).disp_mon_kind = 'ridden';
}

function _maybe_display_usteed() {
    const u = game.u || {};
    const steed = u.usteed;
    if (steed && mon_visible(steed)) {
        /* C display.h:560-562 ridden_mon_to_glyph(mon, rng) -> what_mon(), i.e.
         * Hallucination ? random_monster(rng) : mon (display.h:197): one
         * rn2(NUMMONS) on the DISPLAY stream per paint of the rider's square. */
        const mndx = _hallucinating_dsp()
            ? rn2_on_display_rng(MON_MCOLOR.length)
            : (steed.mnum ?? steed.mndx) | 0;
        const mlet = (mndx >= 0 && mndx < MON_MLET.length) ? MON_MLET[mndx] : 53;
        return {
            mndx,
            ch: monster_symbol(mlet),
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
// does, so display_self() reduces to hero_glyph here.
function _hero_glyph() {
    const u = game.u || {};
    const Upolyd = (u.umonnum | 0) !== (u.umonster | 0);
    const _race = (!Upolyd && game.flags?.showrace) ? (game.urace?.mnum ?? -1) | 0 : -1;
    if (!Upolyd && _race < 0)
        return { ch: monster_symbol(53), color: CLR_WHITE, mndx: u.umonnum | 0 };
    const mndx = Upolyd ? (u.umonnum | 0) : _race;
    const mlet = (mndx >= 0 && mndx < MON_MLET.length) ? MON_MLET[mndx] : 53;
    return {
        mndx,
        ch: monster_symbol(mlet),
        /* showrace: recorded hero cell is white, not the race monster's colour */
        color: !Upolyd ? CLR_WHITE : (mndx >= 0 && mndx < MON_MCOLOR.length) ? MON_MCOLOR[mndx] : CLR_WHITE,
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
export function MATCH_WARN_OF_MON(mon) {
    if (!mon || !Warn_of_mon()) return false;
    const wt = game.context?.warntype;
    const mask = (wt?.obj | 0) | (wt?.polyd | 0);
    const species = wt?.species;
    return !!((mask & (mon.data?.mflags2 | 0))
        || (species && (species === mon.data
            || (species.pmidx != null && mon.data?.pmidx === species.pmidx))));
}
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

    return game.level?.at(mx, my)?.remembered_glyph?.cls === GLYPHCLS_INVIS;
}
// ── newsym ──
export function newsym(x, y) {
    /* Diagnostic-only visibility provenance; inert unless explicitly enabled. */
    if (typeof process !== 'undefined' && ENV?.FF_VISION_TRACE === '1') {
        const t = game.__vision_trace_newsym || (game.__vision_trace_newsym = []);
        t.push([x | 0, y | 0]);
    }
    if (typeof process !== 'undefined' && ENV?.FF_DISPLAY_TRACE === '1') {
        game.__ff_display_newsym_caller = String(new Error().stack || '').split('\n')[2]?.trim()
            .replace(/^at\s+/, '').replace(/\s+\([^)]*\)$/, '') || '?';
    }
    if (suppress_map_output())
        return;
    if (!isok(x, y)) {
        const text = nh_sprintf('newsym: attempting screen update for <%d,%d>', [x, y]);
        /* C display.c:930-935: column zero is an impossible(), while an
         * out-of-bounds position is fatal.  As in pline.js, abort the JS
         * caller for C's panic path rather than continue after a warning. */
        if (x < 0 || y < 0 || x > COLNO - 1 || y > ROWNO - 1) {
            // C end.c:394 panic() never returns. Unwind synchronous map
            // callers to moveloop's async boundary to finish tty output.
            const error = new Error('panic: ' + text);
            error.nhPanic = true;
            throw error;
        }
        _wall_impossible('%s', text);
        return;
    }
    if (game.u?.uswallow | 0) {
        if ((x | 0) === (game.u.ux | 0) && (y | 0) === (game.u.uy | 0))
            display_self();
        return;
    }
    if (game.u?.uinwater && !Is_waterlevel(game.u?.uz)) {
        const ux = game.u.ux | 0, uy = game.u.uy | 0;
        const d2 = (x - ux) * (x - ux) + (y - uy) * (y - uy);
        if (!(is_pool_or_lava(x, y) || is_ice(x, y)) || d2 > 2)
            return;
    }
    const loc = game.level?.at(x, y);
    if (!loc)
        return;
    if (cansee(x, y)) {
        loc.waslit = (loc.lit != 0) ? 1 : 0;
        {
            const ep = engr_at(x, y);
            if (ep !== null && ep !== undefined)
                ep.erevealed = 1;
        }
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
        if (see_self)
            display_self();
        return;
    }
    // C ref: display.c newsym — monster > object > terrain priority (display.c:982-1065).
    // Walk g.fmon chain to find a monster at (x, y).
    // Walk game.level.levelObjects[x][y] to find an object.
    // C ref: display.c:1034–1065 (visible branch), display.c:455–457 MAP_OBJECT_AT macro.
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
        if (mon !== null) {
            const see_it = mon_visible(mon)
                || (!worm_tail && (tp_sensemon(mon) || MATCH_WARN_OF_MON(mon)));
            if (see_it || (!worm_tail && _newsym_Detect_monsters())) {
                /* C newsym: map the underlying square before displaying its
                 * monster. map_object must run even with show=false: it updates
                 * memory and consumes hallucinated object glyph draws. */
                /* C display.c:1017-1024: if monster is in a physical trap, you see
                 * the trap too (tseen set before the location is mapped). */
                if (mon.mtrapped) {
                    const trap = t_at(x, y);
                    if (trap && (trap.ttyp === BEAR_TRAP || is_pit(trap.ttyp)
                                 || trap.ttyp === WEB))
                        trap.tseen = true;
                }
                _map_location(x, y, false);
                _render_monster_glyph(x, y, mon, loc, null, true, worm_tail, !see_it);
                return;
            }
            /* C display.c:1053-1054 — `else if (mon && mon_warning(mon)
             * && !worm_tail) display_warning(mon);`  Warning floats a level
             * digit over a hostile the hero cannot otherwise make out. */
            if (!worm_tail && mon_warning(mon)) {
                const wl = _display_warning_level(mon);
                const sym = DEF_WARNSYMS[wl] || DEF_WARNSYMS[0];
                show_mon_or_warn(x, y, sym.ch, _warn_color(sym), false, 0, GLYPHCLS_MON, true);
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
        if (loc.remembered_glyph?.cls === GLYPHCLS_INVIS) {
            map_invisible(x, y);
            return;
        }
        /* C display.c:1035: use the shared mapper for objects, traps,
         * engravings, terrain, lastseentyp and the final region overlay.
         * In particular map_object retains a hallucinated statue's monster
         * species and gender, needed by glyph_to_mon() and cursor targeting. */
        _map_location(x, y, true);
    }
    else if (_oos_sensed_monster(x, y, loc)) {
        // C ref: display.c:1072-1081 — hero can't SEE the cell, but a monster is
        // there and is sensed.  see_it = tp_sensemon(mon) || MATCH_WARN_OF_MON(mon)
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
        // intrinsic Warning and falsifies that — C paints '1' at step 822.)
    }
    else if (loc.remembered_glyph) {
        /* C display.c:1079-1096 compares glyph identities, independently
         * of their rendered symbols. Blank and customized symsets can make
         * S_room look unlike '.', or make another cmap look exactly like it. */
        const rg = loc.remembered_glyph;
        if (Is_rogue_level(game.u?.uz)) {
            if (loc.typ === CORR && _rg_is_cmap(rg, S_LITCORR_C)) {
                _feel_show_cmap(x, y, S_CORR_C);
                return;
            } else if (loc.typ === ROOM && !loc.waslit && _rg_is_cmap(rg, S_ROOM_C)) {
                _feel_show_cmap(x, y, S_STONE_C);
                return;
            }
        } else if (!loc.waslit || _darkroom_paints()) {
            if (loc.typ === CORR && _rg_is_cmap(rg, S_LITCORR_C)) {
                _feel_show_cmap(x, y, S_CORR_C);
                return;
            } else if (loc.typ === ROOM && _rg_is_cmap(rg, S_ROOM_C)) {
                _feel_show_cmap(x, y, S_DARKROOM_C);
                return;
            }
        }
        _show_remembered_glyph(x, y, rg);
    }
    else {
        /* C newsym's show_mem tail always paints lev->glyph. Without a
         * remembered glyph that is unexplored, including after a visible
         * region (which is displayed without mapping the square) leaves
         * sight. Keep GLYPH_UNEXPLORED's identity: it must not be resolved as
         * the live terrain's symbol (such as an AmigaFont control-byte door).
         * C display.c:1095-1096 shows the remembered glyph unchanged. */
        show_glyph_cell(x, y, ' ', NO_COLOR, false, 0, GLYPHCLS_UNEXPLORED);
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

/* C display.c:2838-2842 (reset_glyphmap, warning glyphs): has_rogue_color
 * (RogueEpyx on the Rogue level) paints them NO_COLOR, else warn_color(). */
function _warn_color(sym) {
    return rogue_ibm_color() ? NO_COLOR : sym.color;
}

// C ref: display.c:638-656 display_warning(mon) — "not a map_XXXX() function":
// the warning glyph FLOATS over the terrain via show_mon_or_warn() → show_glyph()
// and is deliberately NOT written into levl[][].glyph, so it vanishes from the
// hero's memory as soon as the monster's old square gets its next newsym().  We
// therefore preserve map memory except for retiring an invisible marker.
// Hallucination's rn2_on_display_rng arm is display-RNG only (a separate stream
// from the scored rn2 sequence).
function _oos_warning_monster(x, y) {
    /* C display.c:1046-1056 reuses m_at() for the warning fallback.
     * A life-saving monster still occupies the grid while wary_dog() calls
     * newsym(), before its zero HP is restored (mon.c:2870-2874).
     * Use the same lookup as the sensed-monster arm, including worm tails;
     * the coordinate test below excludes tails, not whole worms. */
    const mon = _m_at(x, y);
    if (!mon) return false;
    const worm_tail = (x !== (mon.mx | 0)) || (y !== (mon.my | 0));
    if (worm_tail) return false;
    if (!mon_warning(mon)) return false;
    const wl = _display_warning_level(mon);
    const sym = DEF_WARNSYMS[wl] || DEF_WARNSYMS[0];
    show_mon_or_warn(x, y, sym.ch, _warn_color(sym), false, 0, GLYPHCLS_MON, true);
    return true;
}

/* see_wsegs' real body is js/worm.js (C home worm.c:213), where wtails/wheads
 * live; re-exported through this module's own name so see_monsters() below is
 * unchanged. */

// C artifact.c:2427-2462; artilist.h gives only these three artifacts a color.
export function glow_color(arti) {
    const color = arti === 5 ? CLR_RED
        : (arti === 6 || arti === 7) ? CLR_BRIGHT_BLUE : NO_COLOR;
    return hcolor(clr2colorname(color));
}

export function glow_verb(count, ingsfx) {
    const verb = count > 12 ? 'gleam' : count > 4 ? 'glimmer'
        : count > 0 ? 'flicker' : 'quiver';
    return verb + (ingsfx ? 'ing' : '');
}

export function Sting_effects(cnt) {
    /* C artifact.c:2466-2507.  Sting, Orcrist, and Grimtooth all use the
     * weapon's warning intrinsic.  Messages track blindness toggles and
     * strength changes across C's three thresholds (1, 5, 13 monsters).
     * This is display-only and consumes no scored RNG. */
    const wep = game.u?.uwep;
    const arti = wep?.oartifact | 0;
    if (arti !== 5 && arti !== 6 && arti !== 7)
        return;

    const oldCount = game.warn_obj_cnt | 0;
    const oldStrength = oldCount > 12 ? 3 : oldCount > 4 ? 2 : oldCount > 0 ? 1 : 0;
    const newStrength = cnt > 12 ? 3 : cnt > 4 ? 2 : cnt > 0 ? 1 : 0;
    const name = bare_artifactname(wep);
    const pluralVerb = (verb) => otense(wep, verb);

    if (cnt === -1 && oldCount > 0) {
        /* Blindness toggled: continue the existing glow, with quiver while
         * blind, so the eventual stop message has the matching verb. */
        void pline(`${name} is ${glow_verb(_disp_Blind() ? 0 : oldCount, true)}.`);
    } else if (newStrength > 0 && newStrength !== oldStrength) {
        /* C artifact.c:2482 — goto_level() -> docrt() -> see_monsters() ->
         * Sting_effects(): deliver a pending "You materialize on a different
         * level" first so the start-glowing message comes after it. */
        void _rt_maybe_lvltport_feedback();
        if (!_disp_Blind()) {
            // C artifact.c:2487-2490 only chooses a glow color when sighted.
            const color = glow_color(arti);
            const punctuation = newStrength > oldStrength ? '!' : '.';
            void pline(`${name} ${pluralVerb(glow_verb(cnt, false))} ${color}${punctuation}`);
        } else if (oldStrength === 0) {
            void pline(`${name} ${pluralVerb(glow_verb(0, false))} slightly.`);
        }
    } else if (cnt === 0 && oldCount > 0) {
        void pline(`${name} stops ${glow_verb(_disp_Blind() ? 0 : oldCount, true)}.`);
    }
}

/* C artifact.c:2709-2749 count_surround_traps(): count locations, including
 * the hero's square, but ignore traps already shown in the glyph buffer. */
function count_surround_traps(x, y) {
    let count = 0;
    for (let dx = x - 1; dx < x + 2; ++dx) {
        for (let dy = y - 1; dy < y + 2; ++dy) {
            if (!isok(dx, dy)) continue;
            const loc = game.level.at(dx, dy);
            // C glyph_is_trap(glyph_at(dx, dy)): inspect the displayed class.
            if (loc.disp_cls === GLYPHCLS_TRAP) continue;
            if (t_at(dx, dy)) {
                ++count;
                continue;
            }
            if (IS_DOOR(loc.typ) && (loc.doormask & D_TRAPPED)) {
                ++count;
                continue;
            }
            for (let o = vobj_at(dx, dy); o; o = o.nexthere) {
                // C obj.h Is_container: LARGE_BOX through BAG_OF_TRICKS.
                if (o.otyp >= 214 && o.otyp <= 220 && o.otrapped) {
                    ++count;
                    break;
                }
            }
        }
    }
    return count;
}

/* C artifact.c:2753-2770 mkot_trap_warn(), called at allmain.c:351. */
export async function mkot_trap_warn() {
    const u = game.u;
    if (!u.uarmg && u.uwep?.oartifact === 29 /* ART_MASTER_KEY_OF_THIEVERY */) {
        const heat = ['cool', 'slightly warm', 'warm', 'very warm',
                      'hot', 'very hot', 'like fire'];
        const ntraps = count_surround_traps(u.ux, u.uy);
        if (ntraps !== (game.mkot_trap_warn_count || 0))
            await pline(`The Key feels ${heat[Math.min(ntraps, heat.length - 1)]}${ntraps > 3 ? '!' : '.'}`);
        game.mkot_trap_warn_count = ntraps;
    } else {
        game.mkot_trap_warn_count = 0;
    }
}

// ── see_monsters ──
// C ref: display.c:1520-1564 see_monsters
export function see_monsters() {
    if (game.defer_see_monsters) // C display.c:1492-1493: wait until moveloop.
        return;
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
    game._swallowCageRow1 = false;

    if (!game.u.ux || (game.program_state && game.program_state.in_docrt))
        return; /* display isn't ready yet */

    if (!game.program_state) game.program_state = {};
    game.program_state.in_docrt = true;
    game._map_blanked = false; /* display.c docrt_flags repaints the physical map */
    game._map_corner = null;
    cosmic_push_owner_real("docrt_flags");

    let skip_to_post = false;

    if (redrawonly) {
        redraw_map(false);
        skip_to_post = true;
    }
    if (!skip_to_post && game.u.uswallow) {
        /* C display.c:1727 -> swallowed(1) -> cls(): page the physical
         * topline before clearing the map and painting the new stomach. */
        topl_force_break_now(true, capture_flushed_cells(), game._lastPaintedBotl || null);
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
        game._r1botAfterMap = false;
        game._r1docrtSeen = null;
        /* shut down vision */
        vision_recalc(2);

        if (!nocls)
            cls();

        /* display memory */
        for (let x = 1; x < COLNO; x++) {
            for (let y = 0; y < ROWNO; y++) {
                const loc = game.level.at(x, y);
                if (loc && loc.remembered_glyph) {
                    _show_remembered_glyph(x, y, loc.remembered_glyph);
                } else if (loc) {
                    /* show_glyph(x, y, GLYPH_UNEXPLORED), display.c:1752 */
                    show_glyph_cell(x, y, ' ', NO_COLOR, false, 0, GLYPHCLS_UNEXPLORED);
                }
            }
        }

        /* display.c:2236-2256: a pline during vision/monster redisplay can
         * flush these glyphs before post_map requests the status reset.
         * Mark the map pending now so that flush consumes the marker. */
        game._docrtMapPending = true;
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
        if (redrawonly) game._status1WholeNext = true;
    }
    game._status1Whole = false; /* every map row, y=20 included, was reprinted */
    game._r1textOver = false; /* a later bot() precedes this repaint's map print */
    cosmic_pop_owner_real("docrt_flags");
    game.program_state.in_docrt = false;
}

// ── docrt ──
// C ref: display.c:docrt_flags — show_glyph(memory) → vision_recalc(0) → see_monsters().
// Step 1: render remembered terrain glyphs for all cells.
// Step 2: overlay visible monsters via newsym() (mirrors C see_monsters()).
// Step 3: show hero.
export async function docrt(pageTopl = false, physicalScreen = null) {
    /* C display.c:1740-1757: cls() and the following vision_recalc()
     * happen after the caller's message more() has returned.  A notice
     * emitted by that redraw is a new update_topl(), so it samples the
     * WIN_STOP set by ESC; it does not own the acknowledged page.  more()
     * leaves gt.toplines intact (topl.c:232-246) even when it wipes the screen. */
    if (game._topl_win_stop_armed) {
        game._topl_win_stop_armed = false;
        game._topl_win_stop = true;
        game._topl_win_stop_buf ??= String(game._topl_last_more_committed || '');
    }
    /* cls() below pages before it clears: that page keeps this latch */
    const r1wholeAtCls = !!game._status1Whole;
    game._status1Whole = false; /* every map row, y=20 included, is reprinted */
    /* flush_screen() runs bot() BEFORE the map repaint (display.c:2236-2239),
     * so map row 20 goes back on top of a status row 1 that an earlier
     * bot-disabled menu dismissal left to be rewritten (cmd.js print_dungeon). */
    game._r1textOver = false;
    if (!game.level)
        return;
    if (game.u?.uswallow | 0) {
        /* C display.c:1727 -> swallowed(1) -> cls() flushes messages before
         * clearing the map; its more() does not flush pending glyphs. */
        topl_force_break_now(true, capture_flushed_cells(), game._lastPaintedBotl || null);
        /* swallowed(1)'s cls() pages a standing message before it clears,
         * so the --More-- frame still shows the old stomach (rloc_to_core's
         * swallow arm, teleport.c:1694, on the Plane of Water). */
        /* tty more() does not run bot(): the status row is the last one
         * painted (allmain.c:294 regen_hp precedes movebubbles at :375, but
         * bot() waits for :474). */
        if (pageTopl && game._pending_message)
            topl_force_break_now(true, null, game._lastPaintedBotl);
        swallowed(1);
        /* post_map (display.c:1771-1778) requests another status paint after
         * swallowed()'s bot(). wiz_map restores HHallucination before that
         * next paint, so its temporary zero must not remain on status. */
        update_inventory();
        game.disp.botlx = 1;
        return;
    }
    if (game.u?.uinwater && !Is_waterlevel(game.u.uz)) {
        const pagedMsg = (pageTopl && game._pending_message) || '';
        if (pagedMsg) {
            game._status1Whole = r1wholeAtCls;
            topl_force_break_now(true, capture_flushed_cells(),
                                 game._lastPaintedBotl || null);
            game._status1Whole = false;
        }
        under_water(1);
        /* cls() drops the pending text; the caller still owns paging it */
        if (pagedMsg && !game._topl_win_stop) game._pending_message = pagedMsg;
        update_inventory();
        game.disp ??= {};
        game.disp.botlx = 1;
        game._status1Whole = false;
        return;
    }
    /* C display.c:1740: shut down vision BEFORE cls() and the memory paint.
     * Shutdown newsym()s formerly visible cells with no line of sight, which
     * can paint warning glyphs.  The subsequent memory paint must erase them:
     * an unsensed mimic seen only by infravision draws nothing when vision
     * returns (display_monster(), display.c:532,588). */
    const pendingBeforeShutdown = game._pending_message;
    /* tty erase_menu_or_text calls docrt while the text is still on screen
     * (wintty.c:978). vision_recalc(2)'s notices precede cls(), and their
     * vpline flushes print only changed glyphs over that text (vision.c:856,
     * pline.c:273-276, display.c:2250-2270). Keep that physical background
     * until cls has acknowledged the notices. */
    const backdrop = physicalScreen === null ? null : {
        rows: physicalScreen.split('\n'), cells: _capture_painted_cells(), dirty: new Set(),
        botSeq: game._botlPaintSeq | 0,
    };
    if (backdrop) game._docrtTextBackdrop = backdrop;
    try {
        vision_recalc(2);
        if (backdrop && game._pending_message) {
            await force_more_pages(game._pending_message);
            pageTopl = false;
        }
    } finally {
        if (backdrop) game._docrtTextBackdrop = null;
    }
    /* vision_recalc(2) ends with notice_all_mons(TRUE) (vision.c:856): a
     * monster it newly announces leaves a standing topline that cls() pages
     * (display.c:2064 -> tty_clear_nhwindow -> more()) whoever called docrt(). */
    if (!pageTopl && game._pending_message
        && game._pending_message !== pendingBeforeShutdown)
        pageTopl = true;
    game._r1wipe = null;
    game._r1botAfterMap = false;
    game._r1docrtSeen = null;
    /* the same cls() erases whatever status_r1_docorner() recorded as already blank */
    game._r1clean = null;
    /* C docrt_flags(): `if (!nocls) cls();` clears the PHYSICAL screen, so the
     * RogueEpyx hero's \x01 square (which paints no glyph) is blank again until
     * something is drawn there -- display.js cls() resets _epyxPhys likewise. */
    /* C display.c:1748,2196: cls() pages WIN_MESSAGE before clearing the map.
     * Retain the last flushed physical screen, not the live glyph buffer:
     * vision_recalc(2) above can newsym() the hero (vision.c:850) without
     * flushing it.  When leaving water, back_on_ground() flushed while
     * u.uinwater was still set (hack.c:3247-3265), so that physical screen
     * need not contain the hero at the new, dry location yet. */
    /* tty_clear_nhwindow(WIN_MAP) (cls(), display.c:2064) also blanks a topline
     * that is standing (wintty.c: `if (ttyDisplay->toplin) { home(); cl_end();
     * ... toplin = TOPLINE_EMPTY }`).  A getpos() autodescribe line left
     * physically on screen (msg_given FALSE, getpos.c:1156) is gone once the
     * swallowed hero's teleds() docrt()s (teleport.c:503). */
    if (pageTopl && !game._pending_message)
        game._topl_sticky = null;
    /* cls() erases physical text even when WIN_MESSAGE is already EMPTY. */
    if (game._topl_sticky === game._topl_empty_sticky)
        game._topl_sticky = null;
    game._topl_empty_sticky = null;
    if (pageTopl && game._pending_message) {
        /* cls() -> more() shows the physical screen as of the last flush_screen,
         * not the gbuf that vision_recalc(2) just newsym()'d (wizterrainwish). */
        /* the page shows status row 1 as the last flush left it: the whole-row
         * bot() rewrite of a menu dismissal still sits over map y=20 until
         * cls() clears it (wizcmds.c:1081 pline -> :1098 docrt) */
        game._status1Whole = r1wholeAtCls;
        topl_force_break_now(true, capture_flushed_cells(),
                             game._lastPaintedBotl || null); /* cls() follows: wipes the line if more() was a WIN_STOP no-op */
        game._status1Whole = false;
        const r1wholeLive = game._status1Whole;
        if (game._lastFlushFrame?.r1whole !== undefined)
            game._status1Whole = game._lastFlushFrame.r1whole;
        topl_force_break_now(true, capture_flushed_cells(),
                             game._lastPaintedBotl || null); /* cls() follows: wipes the line if more() was a WIN_STOP no-op */
        game._status1Whole = r1wholeLive;
        game.nhDisplay?.clearScreen?.();
        clear_glyph_buffer();
    }
    game._epyxPhys = null;
    game._map_blanked = false;
    game._map_corner = null;
    game._statusCornerClips = null; /* docrt's cls() clears the physical screen */
    /* display.c:1748 -> cls() -> wintty.c:1074-1083 clears status too.
     * botl.c:259 can decline the next paint (u.uhp == -1 even while
     * polymorphed), leaving these physical rows blank. */
    game._statusBlankAfterDocrt = true;
    /* display.c:1748,2197-2198 / wintty.c:1074-1087: cls() clears status
     * before vision/monster redisplay can raise a pline. A menu dismissal
     * keeps bot() disabled, so those messages still see blank status rows. */
    game._statusBlankAfterDocrt = true;
    game.disp ??= {};
    game.disp.botlx = 1;
    /* display.c:1748 cls() -> clear_nhwindow(WIN_MAP) erases the physical
     * status rows too (wintty.c:1074-1087).  The botlx set below makes the
     * next flush_screen() bot() repaint them, which this port renders from
     * live state; but botl.c:259 declines that paint while u.uhp == -1
     * (self-genocide while polymorphed), so the rows stay blank. */
    if ((game.u?.uhp | 0) === -1)
        game._statusBlankAfterDocrt = true;
    // C display.c:1742-1754: cls() clears gbuf before restoring memory.
    // Unexplored cells have no remembered_glyph here, so they must be blanked
    // too; otherwise temporary terrain/detection glyphs survive the redraw.
    clear_glyph_buffer();
    // Step 1: remembered terrain (mirrors C docrt_flags: show_glyph(x,y,lev->glyph))
    for (let y = 0; y < ROWNO; y++)
        for (let x = 1; x < COLNO; x++) {
            const loc = game.level.at(x, y);
            if (loc?.remembered_glyph) {
                _show_remembered_glyph(x, y, loc.remembered_glyph);
            } else if (loc) {
                /* C docrt_flags show_glyph(x,y,lev->glyph): GLYPH_UNEXPLORED
                 * repaints when its symbol differs from the cleared gbuf. */
                show_glyph_cell(x, y, ' ', NO_COLOR, false, 0, GLYPHCLS_UNEXPLORED);
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
    // line-of-sight wedge C leaves blank.
    /* display.c:2236-2256: a pline during vision/monster redisplay (a vault
     * guard parked at <0,0> makes see_monsters' newsym() impossible(),
     * display.c:930) flushes these gnew glyphs through pline.c:273-274
     * before post_map requests the status reset.  Mark them pending now, as
     * docrt_flags() does, so that flush consumes the markers and the final
     * flush's bot() stays on top of map y=20. */
    game._docrtMapPending = true;
    /* cls() + show_glyph left every map cell gnew (display.c:1745-1752); the
     * next flush_screen prints them AFTER its bot() (display.c:2236-2256). */
    game._docrtGnewPending = true;
    vision_recalc(0);
    // Step 2: C display.c:2074 `see_monsters()` — the real routine, not a bare
    // newsym walk: it also paints worm tails (see_wsegs) and ends with the
    // hero's newsym (display.c:1581-1583), each a display-RNG consumer under
    if (!game.defer_see_monsters) /* C display.c see_monsters(): deferred during dorecover */
        see_monsters();
    // Step 3 (removed): C's docrt_flags() has no hero paint of its own; the
    // hero is newsym()ed by vision_recalc (vision.c:850) and see_monsters().
    /* C docrt_flags post_map: refresh inventory and request a full status
     * repaint.  The next flush/bot must observe state restored since the
     * previous paint, including HConfusion after magic-trap remove curse. */
    update_inventory();
    game.disp ??= {};
    game.disp.botlx = 1;
    game._status1Whole = false; /* docrt reprinted every map row, y=20 included */
}
// ── Painted-screen snapshot (C tty physical-terminal-vs-gbuf decouple) ──
// C ref: win/tty/topl.c more() / display.c print_glyph — NetHack's tty backend
// paints each newsym() to the physical terminal AS it happens, but when a
// message overflows the topline it calls more() *at that instant*, freezing the
// physical screen at the glyphs painted SO FAR.  Subsequent monster moves /
// deaths within the same per-turn movemon block update the internal gbuf but are
// at such a --More-- is the screen as of the OVERFLOWING pline, not the
// post-movemon gbuf.
//
// Our replay accumulates the whole turn's messages and runs the whole movemon
// block before paging at flush_screen, so the gbuf is already post-movemon by
// then.  To match C we snapshot the rendered map cells (+ turn counter) at the
// MOMENT a pline first overflows the topline *during a movemon block*, and emit
// that snapshot for the movemon --More-- frame(s).  DISPLAY-ONLY: snapshots a
// copy of the disp_* cells; consumes no RNG, mutates no game state.
/* C display.c:2220: an in_mklev prompt cannot flush the pending gbuf.
 * goto_level's vision_recalc(2) (do.c:1631) has already changed that buffer,
 * but the terminal still holds its last flush until map output resumes. */
function _levelgen_paint_frame() {
    const frame = game?._levelgenPaintFreeze;
    return frame && suppress_map_output() && game._lastFlushFrame?.cells
        ? game._lastFlushFrame : frame;
}
// the C tty physical terminal's last flush.  DISPLAY-ONLY: reads disp_* only,
// consumes no RNG, mutates no game state.  Returns a Map keyed y*COLNO+x.
function _capture_painted_cells() {
    if (game?._physBlankToDocrt) return new Map();
    const frz = _levelgen_paint_frame();
    if (frz && frz.cells) return new Map(frz.cells);
    const lvl = game?.level;
    const cells = new Map();
    if (!lvl) return cells;
    if (!game._epyxPhys) {
        const paint = _map_paint_cache(lvl);
        const ux = game.u?.ux | 0, uy = game.u?.uy | 0;
        for (let y = 0; y < ROWNO; y++) {
            let row = paint.captures[y];
            if (!row || row.version !== paint.versions[y]) {
                row = { version: paint.versions[y], entries: [] };
                for (let x = 1; x < COLNO; x++) {
                    const cell = _buffered_capture_cell(lvl.at(x, y));
                    // This glyph needs history even before the first render.
                    if (cell.ch === ROGUE_HERO_CH) {
                        row.entries.push([x, _EMPTY_CAPTURE_CELL]);
                    } else if (cell.ch && (cell.ch !== ' ' || (cell.attr & 1))) {
                        row.entries.push([x, cell]);
                    }
                }
                paint.captures[y] = row;
            }
            for (const [x, cell] of row.entries) {
                if (cell.ch && (cell.ch !== ' ' || (cell.attr & 1)))
                    cells.set(y * COLNO + x, x === ux && y === uy
                        && lvl.at(x, y)?.disp_cls === GLYPHCLS_MON
                        ? { ...cell, hero: true } : { ...cell });
            }
        }
        return cells;
    }
    for (let y = 0; y < ROWNO; y++) {
        for (let x = 1; x < COLNO; x++) {
            const loc = lvl.at(x, y);
            let cell = _buffered_capture_cell(loc);
            /* A control-byte hero (RogueEpyx S_human) paints nothing: the
             * terminal keeps what it held there.  Resolve that NOW — _epyxPhys
             * keeps changing as later flushes repaint, and a paged frame
             * must show the cell as of the pline that raised it. */
            if (cell.ch === ROGUE_HERO_CH)
                cell = game._epyxPhys?.get(y * COLNO + x)
                    ?? { ch: ' ', color: NO_COLOR, dec: false, attr: 0 };
            /* An inverse blank (sensed ghost/shade, S_ghost ' ' with ATR_INVERSE)
             * is a painted glyph in C (wintty.c:3930-3964), not a gap. */
            if (cell.ch && (cell.ch !== ' ' || (cell.attr & 1)))
                cells.set(y * COLNO + x, (x === (game.u?.ux | 0) && y === (game.u?.uy | 0)
                    && loc?.disp_cls === GLYPHCLS_MON)
                    ? { ...cell, hero: true } : { ...cell });
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
// live g.moves exactly as before.
//
// west from T:1; the pet's "The kitten bites the jackal.  The jackal is killed!"
// overflows the topline during the third step's movemon, and C's frozen frame
// reads T:1 while svm.moves is already 3.  Same shape on
// DISPLAY-ONLY: no RNG, no game-state mutation beyond this display latch.
function _painted_moves(live) {
    const g = game;
    /* nhlua.c's tutorial gamestate restore changes svm.moves before its reset
     * message pages, while the physical status window retains the tutorial
     * clock.  Keep that page-local display value ahead of every live/run latch. */
    const tutorial = g?._tutorialStatusOverride?.moves;
    if (tutorial != null) return tutorial | 0;
    /* tty getlin's more() precedes its prompt flush (getline.c:53-67).
     * A held status paint retains BL_TIME along with the other fields even
     * when allmain.c:244 has already advanced the live turn counter. */
    /* botl.c:259-271: bot() also leaves BL_TIME untouched at uhp == -1
     * (including self-genocide while polymorphed).  A later timebot() can
     * still update that field, so read its paint latch rather than live moves. */
    if ((g?._botlPaintHeld || (g?.u?.uhp | 0) === -1 || g?._botlFrozenDeath)
        && g._botlPaintedMoves != null)
        return g._botlPaintedMoves | 0;
    const f = g ? g._timeBotlFrozenMoves : null;
    if (f != null) return f | 0;
    /* movemon() runs before svm.moves++ (allmain.c:252-295); a caller that bumps
     * g.moves first pins the status clock the pass's more() frames still show. */
    if (live == null && g && g._movemonStatusMoves != null) return g._movemonStatusMoves | 0;
    return (live != null) ? (live | 0) : ((g && g.moves) | 0);
}
// C allmain.c:261-263, called at each svm.moves++ with the PRE-increment value
// (the number the status line is currently showing).
export function time_botl_moves_incremented(preMoves) {
    const g = game;
    if (!g) return;
    const _runTrace = ENV.FF_RUN_TRACE === '1';
    if (!g.flags || !g.flags.time) { g._timeBotlFrozenMoves = null; return; }
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
    if (ENV.FF_RUN_TRACE === '1')
        pushRngLogEntry(`^time_botl_run_ended[moves=${g.moves|0} run=${g.context?.run|0} multi=${g.multi|0} timeBotl=${g.disp?.time_botl|0}]`);
}
function _snap_key_stamp() {
    const g = game;
    /* `bs` stamps the bot() paint epoch the snapshot was pinned at, so a
     * --More-- raised after a later real paint can refresh its status row to
     * the terminal's current one (see _topl_more).  Without it the first-
     * overflow pin would survive damage that landed later in the same window
     * and show a status row C has already overwritten. */
    return { nk: g._ff_last_input_frame ?? -1, mk: g._snapMoreKeys | 0,
             bs: g._botlPaintSeq | 0 };
}
function _snap_is_stale(snap) {
    const g = game;
    if (!snap || snap.nk == null) return false;
    return ((g._ff_last_input_frame ?? -1) - snap.nk) > ((g._snapMoreKeys | 0) - snap.mk);
}
function _maybe_snapshot_painted_screen() {
    const g = game;
    if (!g) return;
    if (!g.level) return;
    const _pend = g._pending_message || '';
    let msg = _pend;
    /* Post-meal cross-turn more() (allmain.js, _occ_committed_topl.postMeal):
     * the FIRST pline of the turn after an occupation ended meets the
     * still-committed occupation topline.  When it does not join, update_topl
     * calls more() inside that pline, after vpline's flush_screen (pline.c:
     * 273-276) painted every newsym made so far this turn -- and nothing
     * later (a monster moving after the pet's pickup stays unpainted).  Pin
     * the gbuf at that instant for occupation_force_more.  This also applies
     * to nh_timeout's plines (allmain.c:273), after moves++ and outside
     * movemon: vomiting_dialogue's message must keep that newer clock.
     * DISPLAY-ONLY. */
    const _pm = g._occ_committed_topl;
    if (_pm?.postMeal && !g.occupation && _pend && g._postMealPlineFrame === null) {
        g._postMealPlineFrame = _topl_joins_committed(_pm.text, _pend.split('  ')[0])
            ? false : { cells: _capture_painted_cells(), moves: _painted_moves() };
    }
    // Other snapshots belong to the monster-movement block.
    /* #wizloaddes: load_special's makemon/newsym run under a frozen physical
     * paint (wizcmds.js wiz_load_splua); each overflowing pline's flush_screen
     * (pline.c:273-274) freezes the terminal at that instant, exactly as in a
     * movemon block, so the later newsyms must not reach that page's frame. */
    if (!g._inMovemonBlock && !g._levelgenPaintFreeze?.liveGbuf) return;
    if (_topl_split_for_more(msg) === null) {
        /* C pline.c:274-277: a line already committed to the topline (the eat
         * occupation's fprefx text) joins the monster's pline, and the overflow
         * that fires more() is frozen BEFORE that pline's damage lands.  Only
         * the first-overflow botl/cells pin is taken from the joined line; page
         * accounting still follows the pending line alone. */
        const _res = g.occupation ? (g._occ_committed_topl?.text || '') : '';
        if (/ corpse (?:tastes|is) /.test(_res)) {
            /* corpse flavor has _eatPreEffectFrame.  Its first overflow can fire a
             * turn later than the pin (see _eb below), so pin the botl here too. */
            if (!_pend.startsWith(_res)
                && (_topl_split_for_more(_res + '  ' + _pend) !== null
                    || !_topl_joins_committed(_res, _pend.split('  ')[0]))
                && (!g._earlyBotl || !g._earlyBotl.corpse || g._earlyBotl.turn !== (g.moves | 0)))
                g._earlyBotl = { turn: g.moves | 0, botl: _capture_botl(), corpse: true,
                    cells: _capture_painted_cells(), moves: _painted_moves() };
            return;
        }
        if (!_res || _pend.startsWith(_res)
            || _topl_split_for_more(_res + '  ' + _pend, [_res.length]) === null) return;
        if (!g._earlyBotl || g._earlyBotl.turn !== (g.moves | 0))
            g._earlyBotl = { turn: g.moves | 0, botl: _capture_botl(),
                cells: _capture_painted_cells(), moves: _painted_moves() };
        return;
    }
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
    // "The kitten picks up an uncursed spellbook of sleep.--More--" page (the
    // FIRST overflow, frozen before the hero's later magic-portal trap stuns
    // them) carries no Stun; this port rendered live post-stun state and
    // showed it.
    //
    // SIDE EFFECT, declared rather than hidden behind "no game state".
    // not inert: it ADVANCES three paint-cache fields, and all three are read
    // here moves them to the movemon-page instant.
    //                                u.uhp == -1 death path (see its header's
    //                                later death frame renders.
    //   game._botlPaintedCap       — the encumbrance latch every later
    // That advance is C-FAITHFUL, and it is C-faithful for the same reason the
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
    // command re-latches cap/deaf where C's second flush_screen would have found
    // has that property; these two add to it rather than create it.
    const _eb = (g._earlyBotl && (g._earlyBotl.turn === (g.moves | 0) || g._earlyBotl.corpse))
        ? g._earlyBotl.botl : null;
    if (!g._paintedSnapshot)
        g._paintedSnapshot = { cells: _capture_painted_cells(), moves: _painted_moves(),
            botl: _eb || _capture_botl(), r1whole: !!g._status1Whole, epoch: _flush_epoch, ..._snap_key_stamp() };
    // ── Per-PAGE painted frames (a multi-page movemon window) ────────────────
    // C ref: win/tty/topl.c update_topl() — EVERY pline that does not fit the
    // remaining topline calls more() AT THAT INSTANT, so a movemon window that
    // pages N times freezes the physical terminal N separate times, each at the
    // gbuf as of that page's overflowing pline.  Our replay accumulates the whole
    // window's messages and pages them all later at flush_screen, so the single
    // first-overflow snapshot above is correct for page 1 and STALE for pages
    // 2..N.  Record one frame per overflow instant here; flush_screen's paging
    // ~20 pet pickup/drop messages, and C shows the pet at a different square on
    // every one of them.)  DISPLAY-ONLY: snapshots a copy of the disp_* cells;
    // consumes no RNG.  `botl` pinned for the same reason as the first-overflow
    // snapshot above, and carrying the same declared paint-cache advance — see
    // the SIDE EFFECT note there; this site is the second of the two.
    const pages = _topl_page_count(msg);
    let logged = g._movemonPagesLogged | 0;
    /* topl.c:257-275 — a pline that overflowed the COMMITTED occupation topline
     * (above: pend alone fit, committed + pend did not) already raised more()
     * at its own pline.c:274 flush, before the kill's mondead repainted the map.
     * That page is frame 0, not the one frozen by a later pline whose pending
     * text alone overflows (eatcorpse's "You cannibal!" + "The kitten bites the
     * newt." + "The newt is killed!" + "Your kitten eats a newt corpse."). */
    const _ebp = g._earlyBotl;
    if (logged === 0 && _ebp && !_ebp.corpse && _ebp.cells && _ebp.turn === (g.moves | 0)
        && g.occupation && g._occ_committed_topl?.text) {
        (g._movemonPageFrames ||= []).push({ cells: _ebp.cells, moves: _ebp.moves,
            botl: _ebp.botl, r1whole: !!g._status1Whole, occBase: true });
        g._movemonPagesLogged = logged = 1;
    }
    /* The committed-occupation overflow above is page 0 of the window but is not
     * part of the pending line `msg`, so every later page of `msg` is one further
     * along the frame log. */
    const _occBase = g._movemonPageFrames?.[0]?.occBase ? 1 : 0;
    if (pages + _occBase > logged) {
        const frame = { cells: _capture_painted_cells(), moves: _painted_moves(),
            botl: _eb || _capture_botl(), r1whole: !!g._status1Whole };
        if (!g._movemonPageFrames) g._movemonPageFrames = [];
        // A single over-long pline can cross several page boundaries at once; all
        // of those pages are frozen at this one instant in C too.
        while (logged < pages + _occBase) { g._movemonPageFrames.push(frame); logged++; }
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
export function _movemon_page_frames_reset() {
    const g = game;
    if (!g) return;
    g._movemonPageFrames = null;
    g._movemonPagesLogged = 0;
    g._earlyBotl = null;
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
export function occupation_painted_tick() {
    const g = game;
    if (!g) return;
    g._occCurFrame = _capture_painted_cells();
    g._occCurR1Whole = !!g._status1Whole; /* row-1 latch at the frame's own instant */
    /* Pair the map with the status paint from the same per-turn flush. */
    g._occCurBotl = _capture_botl();
}
export function occupation_freeze_snapshot() {
    const g = game;
    if (!g) return;
    const frame = g._occCurFrame;
    if (!frame) return;
    if (g._paintedSnapshot) return;
    g._paintedSnapshot = { cells: frame, moves: _painted_moves(),
                           r1whole: g._occCurR1Whole };
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
        r1whole: !!g._status1Whole,
        ..._snap_key_stamp(),
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
    if (_snap_is_stale(frames[frames.length - 1])) return null;
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
// = the level-1 map + Dlvl:1, identical to step 18's last flush, with the descend
// topline; step 20 (post-dismiss) = the level-2 vision-masked map + Dlvl:2.
//
// its dlevel BEFORE mklev()/clear_level_structures destroys it.  Then, after the
// hero is placed on the new level, level_transition_arrival_more(msg) emits the
// arrival message and drives the forced more() over that frozen frame — reusing
// the same _paintedSnapshot machinery as the movemon/occupation --More-- windows
// (render_map_row's _snapCellAt + _statusLine2's snapshot dlevel).  DISPLAY-ONLY:
// on the goto_level caller invoking it → ZERO effect on any non-transition path.
export function level_transition_capture_old_paint() {
    const g = game;
    if (!g || !g.level) return null;
    return {
        cells: _capture_painted_cells(),
        moves: _painted_moves(),
        dlevel: g.u?.uz?.dlevel | 0,
        dnum: g.u?.uz?.dnum | 0,
        level: g.level,
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
// pager in dofire's getdir flush can freeze the swap-prinv page on it.
// DISPLAY-ONLY: snapshots disp_* cells, consumes no RNG, mutates no game state.
/* C topl.c:397-399: tty_yn_function() calls more() before custompline's
 * flush. Its page keeps the saved physical map, including warning glyphs;
 * display.c:634-650 gives warnings no separate flush or repaint path. */
export function capture_painted_frame() {
    const g = game;
    if (!g || !g.level) return null;
    return { cells: _capture_painted_cells(), moves: _painted_moves() };
}
/* The status half of a pre-movemon frame (pickup-encumber prinv page). C ref:
 * pline.c:273-274 flush_screen() -> bot() at the encumber_msg instant. */
export function capture_pre_movemon_botl() {
    return game?.level ? _capture_botl() : null;
}
/* Install the map as of the last flush_screen() and the last painted status
 * as the frozen frame for ONE
 * following force_more()/--More-- render.  C ref: tty_display_nhwindow(NHW_TEXT)
 * does no flush_screen, so the more() in update_topl (topl.c:390) shows the
 * gbuf as of the last flush, not the live map (later movemon moves unseen).
 * Returns a release function the caller MUST call right after that frame is
 * emitted (restores the prior snapshot state); returns a no-op when no flush
 * has been recorded.  DISPLAY-ONLY: no RNG, no game-state mutation.
 * Usage (js/com_pager.js display_text_window, g._resultMessage arm, around
 * force_more at ~471):  const release = use_last_flush_snapshot();
 * await force_more(...); release(); */
export function use_last_flush_snapshot() {
    const g = game;
    let frame = g?._lastFlushFrame;
    const m = g?._movemonPlinePhys;
    if (m && m.cells && (!frame || !frame.cells || ((m.seq | 0) > (frame.seq ?? Infinity))))
        frame = m;
    if (!frame) return () => {};
    const prevSnap = g._paintedSnapshot;
    const prevIn = g._inMovemonMore;
    g._paintedSnapshot = { cells: frame.cells, moves: frame.moves,
                           r1whole: frame.r1whole, botl: g._lastPaintedBotl,
                           epoch: frame.epoch };
    g._inMovemonMore = true;
    let released = false;
    return () => {
        if (released) return;
        released = true;
        g._paintedSnapshot = prevSnap;
        g._inMovemonMore = prevIn;
    };
}
/* C display.c:2196 cls() -> wintty.c:1873-1875: display_nhwindow's
 * message more() does not flush the map or pending status changes. */
export async function force_more_from_cls(message) {
    if (_topl_more_pages(String(message), _topl_joins_snapshot(String(message))).length > 1) {
        await force_more_pages(String(message));
        return 0;
    }
    const release = use_last_flush_snapshot();
    const oldFromCls = game._moreFromCls;
    /* C display.c:2196 / wintty.c:1873: more() holds the latest bot()
     * paint. A direct bot() can update that paint without rebuilding
     * _screen_output (mhitu.c:937), so use its cached fields in the snapshot. */
    if (game._paintedSnapshot && game._lastPaintedBotl)
        game._paintedSnapshot.botl = game._lastPaintedBotl;
    game._moreFromCls = true;
    /* C botl.c:254-270: bot() paints the status window directly.  The
     * snapshot above includes that paint even when the serialized whole
     * screen still predates it; prefer it to those older status rows. */
    game._statusHeldPhysical = !game._paintedSnapshot?.botl;
    try {
        return await force_more(message);
    } finally {
        game._moreFromCls = oldFromCls;
        release();
    }
}
// paint snapshot.  Shows "<msg>--More--" over the frozen OLD-level frame (old map
// + old Dlvl), consuming the dismiss key via nhgetch (no RNG).  After dismissal
// the snapshot is dropped so the next flush_screen/docrt renders the live (new)
// level.  This mirrors the C ordering (pline → more() over last flush → docrt of
// new level).  msg is the already-formatted arrival line (e.g. "You descend the
// stairs.").  oldPaint is the object returned by
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
// recorded keys as fresh top-level commands instead.
//
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
    /* docrt()'s cls() flushes WIN_MESSAGE through tty_display_nhwindow, which
     * returns at once under WIN_STOP (wintty.c:2282; WIN_STOP == WIN_CANCELLED).
     * An ESC at the --More-- raised inside the last pline's own update_topl
     * (topl.c:232-235) leaves WIN_STOP live, and that pline still drew its
     * text (skip was sampled before more()), so no further page is shown. */
    if (g._topl_win_stop || g._topl_win_stop_armed) {
        /* WIN_STOP skips only the message-window display. The following
         * docrt() -> cls() still clears WIN_MAP (display.c:2196-2198;
         * wintty.c:1074-1087), erasing the physical topline as well. */
        g._pending_message = '';
        return;
    }
    // C do.c:1693-1720: a pline before delayed flushing updates the physical
    // map as well as status. docrt's cls() pages that latest terminal image.
    if (g._levelgenWindowUz?.cells)
        oldPaint = { ...oldPaint, cells: g._levelgenWindowUz.cells };
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
    /* This is cls() acknowledging existing text, not a new update_topl().
     * After ESC, suppressed messages cannot raise an arrival page
     * (topl.c:257-300; wintty.c:1873-1879), as in force_more_pages(). */
    const _pages = (g._topl_win_stop || g._topl_win_stop_armed)
        ? [] : _topl_more_pages(msg, _joins);
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
    // the LAST outstanding page — its overflow instant is "right before the
    // arrival redraw" by construction — and is the fallback everywhere else.
    const _ambientSnap = g._paintedSnapshot;
    const _pageFrames = g._movemonPageFrames;
    g._pending_message = '';
    let _arrConsumed = 0;      /* offset of the current page within `msg` */
    // Drive the forced more() over each committed page in turn.  _topl_more shows
    // "<committed>--More--", marks _inMovemonMore (because _paintedSnapshot is
    // key, then restores _inMovemonMore.  After the last one, page-cleanup drops the
    // snapshot so the post-dismiss render uses the live new-level buffer.
    for (let i = 0; i < _pages.length; i++) {
        const _pg = _pages[i];
        const _arrEnd = _arrConsumed + (_pg ? _pg.length : 0);
        _arrConsumed = _arrEnd + 2;
        if (!_pg) continue;
        /* C pline.c:273-274: a non-last page whose more() was raised by a later
         * pline of the COMMAND (not a movemon block) shows the terminal as that
         * pline's flush_screen() left it — the pline-flush log's record at this
         * page's committed end (use_pick_axe2's "You start digging downward."
         * paged by shopdig's verbalize shows the pre-turn shopkeeper and HP,
         * dig.c:1348-1350, shk.c:5048).  Only a record taken on the level being
         * LEFT qualifies: once goto_level has switched levels nothing repaints
         * the physical map until docrt() (do.c:1840), so a pline flushed during
         * the transition (dokick.c:439-454 "You hear something shatter!") still
         * shows the old level, which is oldPaint. */
        let _flushPf = (i < _pages.length - 1)
            ? _pline_flush_frame_select(_arrEnd, msg) : null;
        if (_flushPf && _flushPf.level !== oldPaint.level) _flushPf = null;
        /* _movemonPageFrames is indexed by movemon-window overflow, not by page
         * of this line: a page raised by a pline made OUTSIDE movemon (exerchk's
         * "You must have been very observant." over "You feel wise!") must keep
         * its own flush frame, not take a later movemon pline's frame. */
        if (_flushPf && _flushPf.mm && _pageFrames && _pageFrames[i]) _flushPf = null;
        const _isLast = (i === _pages.length - 1);
        /* A page raised by a C display_nhwindow(WIN_MESSAGE) / docrt()'s cls()
         * (topl_force_break_after) froze the physical screen at that instant;
         * it outranks the later pline's flush frame (hack.c:3247-3265
         * back_on_ground, then display.c:2064 cls() -> more(), before the
         * trap door's pline repainted the map). */
        const _fbk = _isLast ? -1 : _topl_force_break_entry(_pg);
        const _fbFrame = _fbk >= 0 ? (g._topl_force_breaks[_fbk].frame || null) : null;
        if (_fbFrame) g._topl_force_breaks.splice(_fbk, 1);
        const _frame = _isLast ? oldPaint
            : _fbFrame ? _fbFrame
            : _flushPf ? _flushPf
            : (_pageFrames && _pageFrames[i]) ? _pageFrames[i]
            : (i === 0 && _ambientSnap) ? _ambientSnap
            : oldPaint;
        const _heldBotl = _isLast && g._botlPaintHeld ? g._lastPaintedBotl : null;
        const _winUz = g._levelgenWindowUz || null;
        g._paintedSnapshot = {
            cells: _frame.cells,
            level: _frame.level ?? oldPaint.level,
            moves: _frame.moves,
            dlevel: _heldBotl?.dlevel ?? _winUz?.dlevel ?? _frame.dlevel ?? oldPaint.dlevel,
            dnum: _heldBotl?.dnum ?? _winUz?.dnum ?? _frame.dnum ?? oldPaint.dnum,
            /* do.c:1717-1720 delay_flushing: a page raised by a pline inside
             * u_on_rndspot (no flush frame logged) shows the status as the last
             * flush before the hold left it, not the half-arrived hero. */
            botl: _heldBotl ?? _frame.botl
                ?? (g._rndspotHeldBotl || null),
            /* Row-1 whole-rewrite latch at the page frame's own instant
             * (oldPaint deliberately un-pinned, same reasoning as botl). */
            r1whole: _frame.r1whole,
            r1physical: _frame.r1physical,
        };
        const _morc = await _topl_more(_pg);
        if (_morc === 27) {
            g._arrival_more_suppress = true;
            break;
        }
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
    if (g._tutorialStatusOverride)
        g._tutorialStatusOverride = null;
    _movemon_page_frames_reset();
}
// Snapshot-aware cell accessor: during a movemon --More-- frame returns the
// snapshot cell (the C-flushed physical paint); otherwise the live disp_* cell.
const ROGUE_HERO_CH = '\x01';
const _PHYS_BLANK = { cells: new Map() };
// Cell descriptions are immutable: each change publishes a new value so
// saved physical frames can retain the previous paint. Validate the scalar
// fields on reads too, since buffer clears also write them directly.
const _CAPTURE_CELL_CACHE = Symbol('capture cell cache');
const _SERIALIZED_MAP_ROWS = new WeakMap();
const _EMPTY_CAPTURE_CELL = { ch: ' ', color: NO_COLOR, dec: false, attr: 0 };
// Versions belong to display buffers rather than serialized game state.
// Every writer of the live disp_* paint invalidates its row. New/restored
// levels have new identities and therefore start with an empty cache.
const _MAP_PAINT_CACHE = new WeakMap();
function _map_paint_cache(level) {
    let cache = _MAP_PAINT_CACHE.get(level);
    if (!cache) {
        cache = { versions: Array(ROWNO).fill(0), captures: [] };
        _MAP_PAINT_CACHE.set(level, cache);
    }
    return cache;
}
export function invalidate_map_row(y) {
    const cache = game.level && _MAP_PAINT_CACHE.get(game.level);
    if (cache) cache.versions[y]++;
}
function _buffered_capture_cell(loc) {
    if (!loc) return _EMPTY_CAPTURE_CELL;
    if (loc.disp_capture_cell != null) return loc.disp_capture_cell;
    const ch = loc.disp_ch ?? ' ';
    const color = loc.disp_color ?? NO_COLOR;
    const dec = !!loc.disp_decgfx;
    const attr = loc.disp_attr | 0;
    const prev = loc[_CAPTURE_CELL_CACHE];
    if (prev && prev.ch === ch && prev.color === color
        && prev.dec === dec && prev.attr === attr) return prev;
    return loc[_CAPTURE_CELL_CACHE] = { ch, color, dec, attr,
        unexplored: loc.disp_cls === GLYPHCLS_UNEXPLORED ? {} : null };
}
/* The terminal's frozen paint while goto_level's mklev()/losedogs span holds
 * the old flush (see _levelgen_paint_frame); null when no freeze is active. */
export function levelgen_frozen_cell(x, y) {
    const frame = _levelgen_paint_frame();
    if (!frame || !frame.cells) return null;
    return frame.cells.get(y * COLNO + x) ?? _EMPTY_CAPTURE_CELL;
}
/* C tty_display_nhwindow (wintty.c:1902-1940) opens a menu without flushing
 * gbuf. All pending glyph changes, including furniture_detect's mapping
 * (detect.c:1105), stay off the background until a flush or row_refresh. */
export function unflushed_forced_cell(x, y) {
    const loc = game.level?.at(x, y);
    const cell = loc?.disp_flush_epoch === _flush_epoch ? loc.disp_flushed_cell : null;
    /* g_putch's control-byte symbols leave the preceding paint in place. */
    return cell?.ch === ROGUE_HERO_CH
        ? (game._epyxPhys?.get(y * COLNO + x) ?? _EMPTY_CAPTURE_CELL) : cell;
}
/* wintty.c:3684-3687: docorner erases status rows too, including the row
 * below the footer (erase_menu_or_text passes maxrow + 1).  select_menu's
 * bot_disabled and getlin's inread leave these physical rows clipped until
 * the next bot() paint (windows.c:1861, getline.c:63). */
export function docorner_status_rows(xmin, ymax) {
    if (!game._screen_output) return;
    const rows = game._screen_output.split('\n');
    const width = Math.max(0, xmin - 1);
    for (let r = _threeStatusLines() ? 21 : 22; r < Math.min(ymax, 24); r++) {
        /* cl_end's erased cells survive map rebuilds and subsequent windows
         * until an enabled bot() repaints them (windows.c:1861-1863). */
        const clips = game._statusCornerClips ??= {};
        clips[r] = Math.min(clips[r] ?? COLNO, width);
        rows[r] = docorner_status_row(r, rows[r] || '');
    }
    game._screen_output = rows.join('\n');
}
export function docorner_status_row(row, line) {
    const width = game._statusCornerClips?.[row];
    if (width === undefined) return line;
    let out = '', col = 0;
    for (const token of line.match(/\x1b\[[0-9;]*[A-Za-z]|[\s\S]/g) || []) {
        if (col >= width) break;
        const forward = /^\x1b\[(\d*)C$/.exec(token);
        if (forward) {
            const n = Math.min(Number(forward[1] || 1), width - col);
            out += `\x1b[${n}C`;
            col += n;
        } else {
            out += token;
            if (!token.startsWith('\x1b') && token !== '\x0e' && token !== '\x0f') col++;
        }
    }
    /* A clip inside a highlighted field must close its SGR run. */
    if (out.includes('\x1b[')) out += '\x1b[0m';
    if (out.includes('\x0e')) out += '\x0f';
    /* With three status lines, row_refresh() restores map y=20 over the
     * erased portion of status row 1 (wintty.c:3703-3714). */
    if (row === 21 && _threeStatusLines()) {
        const tail = render_map_row(ROWNO - 1, width + 1, COLNO - 1);
        const leading = /^(?:\x1b\[(\d+)C|( +))/.exec(tail);
        const gap = Number(leading?.[1] || leading?.[2]?.length || 0) - col;
        if (tail) out += (gap > 0 ? `\x1b[${gap}C` : '')
            + tail.slice(leading?.[0].length || 0);
    }
    return out;
}
export function docorner_blank_utf8_captures(xmin, ymax) {
    const lvl = game.level;
    if (!lvl) return;
    /* topl.c:237-238 clears the wrapped message before later plines flush.
     * Those flushes can already be recorded by our deferred pager. Carry
     * row_refresh's skipped unexplored cells into the later frames, retaining
     * any glyph rewritten in between (show_glyph gives it a new paint token).
     * Earlier frames still describe the terminal before this docorner. */
    const pageCells = game._paintedSnapshot?.cells;
    const frames = game._plineFlushFrames || [];
    const pageIndex = frames.findIndex(f => f.cells === pageCells);
    const laterFrames = pageIndex >= 0 ? frames.slice(pageIndex + 1) : [];
    /* docorner()'s row_refresh() reprints the glyph buffer, so a frozen
     * pre-docrt terminal (goto_level -> losedogs -> control_mon_tele prompt)
     * takes the gbuf cells left by vision_recalc(2)/keepdogs() there. */
    const frz = game._levelgenPaintFreeze;
    if (frz && frz.cells && frz.gbufCells) {
        for (let y = 0; y < ROWNO && y + 1 < ymax; y++)
            for (let x = Math.max(1, xmin); x < COLNO; x++) {
                const k = y * COLNO + x;
                const c = frz.gbufCells.get(k);
                if (c) frz.cells.set(k, c); else frz.cells.delete(k);
            }
    }
    for (let y = 0; y < ROWNO && y + 1 < ymax; y++)
        for (let x = Math.max(1, xmin); x < COLNO; x++) {
            const loc = lvl.at(x, y);
            const key = y * COLNO + x;
            const erased = pageCells?.get(key)?.unexplored;
            if (erased)
                for (const frame of laterFrames)
                    if (frame.level === lvl && frame.cells.get(key)?.unexplored === erased)
                        frame.cells.delete(key);
            invalidate_map_row(y);
            /* C display.c:2182-2185 row_refresh skips GLYPH_UNEXPLORED.
             * The erased terminal stays blank even with S_unexplored set. */
            if (loc?.disp_capture_cell || loc?.disp_cls === GLYPHCLS_UNEXPLORED)
                loc.disp_capture_cell = { ch: ' ', color: NO_COLOR, dec: false, attr: 0 };
            game._epyxPhys?.delete(y * COLNO + x);
            /* row_refresh prints this part of gbuf even without a flush. */
            if (loc) {
                loc.disp_flushed_cell = _buffered_capture_cell(loc);
                loc.disp_flush_epoch = _flush_epoch;
            }
        }
}
function _snapCellAt(x, y) {
    const snap = (game._inMovemonMore && game._paintedSnapshot) ? game._paintedSnapshot
               : (_levelgen_paint_frame() || (game._physBlankToDocrt ? _PHYS_BLANK : null));
    if (snap) {
        const c = snap.cells.get(y * COLNO + x);
        if (c && c.ch === ROGUE_HERO_CH)
            return game._epyxPhys?.get(y * COLNO + x)
                ?? { ch: ' ', color: NO_COLOR, dec: false, attr: 0 };
        if (c) return { ch: c.ch, color: c.color, dec: c.dec, attr: c.attr, hero: !!c.hero, held: true };
        return { ch: ' ', color: NO_COLOR, dec: false, attr: 0 };
    }
    const loc = game.level?.at(x, y);
    const cell = _buffered_capture_cell(loc);
    /* C wintty.c:3740-3783 g_putch writes control bytes without painting a
     * glyph. Track physical cells before the first such write too: RogueEpyx
     * S_coin (\x0f), like S_human (\x01), preserves whatever was painted
     * here previously, even when no control-byte hero has appeared. */
    const phys = (game._epyxPhys ??= new Map());
    const key = y * COLNO + x;
    if (cell.ch === ROGUE_HERO_CH)
        return phys.get(key) ?? { ch: ' ', color: NO_COLOR, dec: false, attr: 0 };
    phys.set(key, cell);
    return cell;
}
// ── Serialize a map row with DEC line-drawing and ANSI colors ──
function render_map_row(y, xlo = 1, xhi = COLNO - 1, noGap = false) {
    if (!game.level && !game._levelgenPaintFreeze)
        return '';
    // During a movemon --More-- frame, read the C-flushed physical-paint snapshot
    // instead of the live (post-movemon) disp_* buffer.  _snapCellAt falls back to
    // the live buffer when no snapshot is active, so the non-paging path is
    // byte-identical to before.
    let rows = _SERIALIZED_MAP_ROWS.get(game);
    if (!rows) _SERIALIZED_MAP_ROWS.set(game, rows = []);
    let cache = rows[y];
    if (!cache || cache.xlo !== xlo || cache.xhi !== xhi || cache.noGap !== noGap)
        cache = rows[y] = { xlo, xhi, noGap, cells: [] };
    const rogueMap = rogue_graphics();
    const rogueColor = rogue_ibm_color();
    const decAllowed = !rogueMap && (dec_mode() || generic_symset()
        || (game._decStaleFrom != null && y + 1 >= game._decStaleFrom));
    const u = game.u;
    const heroColor = rogueMap && !rogueColor && game.iflags?.use_color !== false
        && !!game.flags?.showrace && (u?.umonnum | 0) === (u?.umonster | 0);
    const heroX = heroColor ? u?.ux | 0 : -1;
    const heroY = heroColor ? u?.uy | 0 : -1;
    const live = !(game._inMovemonMore && game._paintedSnapshot)
        && !game._levelgenPaintFreeze && !game._physBlankToDocrt && !game._epyxPhys;
    const version = game.level ? _map_paint_cache(game.level).versions[y] : -1;
    const sameMode = cache.rogueMap === rogueMap && cache.rogueColor === rogueColor
        && cache.decAllowed === decAllowed && cache.heroColor === heroColor
        && cache.heroX === heroX && cache.heroY === heroY;
    if (live && cache.live && cache.level === game.level
        && cache.version === version && sameMode) return cache.output;
    const cells = cache.cells;
    let same = cache.output !== undefined;
    let firstCol = -1, lastCol = -1;
    for (let x = xlo; x <= xhi; x++) {
        const cell = _snapCellAt(x, y);
        const prev = cells[x];
        if (prev !== cell && (!prev || prev.ch !== cell.ch
            || prev.color !== cell.color || prev.dec !== cell.dec
            || prev.attr !== cell.attr || prev.hero !== cell.hero
            || prev.held !== cell.held)) same = false;
        cells[x] = cell;
        /* C wintty.c:3930-3964 prints inverse spaces too (for example,
         * MG_BW_ENGR with Blank symbols). Include them in the row bounds,
         * just as the serialization loop below includes them in its output. */
        if (cell.ch && (cell.ch !== ' ' || (cell.attr & 1))) {
            if (firstCol < 0)
                firstCol = x;
            lastCol = x;
        }
    }
    if (firstCol < 0) {
        Object.assign(cache, { rogueMap, rogueColor, decAllowed, heroColor,
            heroX, heroY, live, level: game.level, version, output: '' });
        return '';
    }
    let output = '';
    /* C symbols.c:217-233 assign_graphics(ROGUESET): gs.showsyms comes from
     * gr.rogue_syms, which is defsyms[] — plain ASCII, no DEC line-drawing —
     * and display.c:3077-3081 clears every glyph colour.  Both are properties
     * of the whole map, so they are applied once here for the row. */
    if (same && sameMode) {
        Object.assign(cache, { live, level: game.level, version });
        return cache.output;
    }
    Object.assign(cache, { rogueMap, rogueColor, decAllowed, heroColor,
        heroX, heroY, live, level: game.level, version });
    let activeColor = ANSI_DEFAULT; // default
    let activeDec = false;
    let activeInverse = false; // ATR_INVERSE (hilite_pet pet glyph) — C \e[7m..\e[0m
    // Leading gap
    const gap = noGap ? 0 : firstCol - 1;
    if (gap > 4)
        output += `\x1b[${gap}C`;
    else if (gap > 0)
        output += ' '.repeat(Math.max(0, gap));
    for (let x = firstCol; x <= lastCol; x++) {
        const cell = cells[x];
        const ch = cell.ch ?? ' ';
        /* C display.c:3077-3081 — on a Rogue level without PC graphics every
         * glyphmap colour is forced to NO_COLOR (see rogue_graphics() above). */
        const color = (rogueMap && !rogueColor)
            ? (rogue_hero_showrace_cell(x, y, cell.held ? cell : null) ? CLR_WHITE : NO_COLOR) : (cell.color ?? NO_COLOR);
        /* rogue_syms is defsyms[] — plain ASCII, so nothing on a Rogue level's
         * map is ever in DEC line-drawing mode (C symbols.c:186-207). */
        /* C g_putch: SO shift follows the live symset handling; rows untouched since
         * a DEC->other change keep their old bytes (com_pager render_map_row_clipped) */
        const dec = !!cell.dec && decAllowed;
        const inverse = !!(cell.attr & 1 /* ATR_INVERSE */);
        /* A blank glyph carrying ATR_INVERSE (a sensed ghost/shade, S_ghost ' ',
         * with the detected-monster highlight) is a painted glyph in C, not a
         * gap: tty wraps it \e[7m \e[0m (display.c:3092 map_glyphinfo). */
        if (ch === ' ' && !inverse) {
            // Space runs. A blank map cell (S_stone / dark void) is always
            // emitted at the terminal default color in C — close any open
            // color run before the gap so the preceding glyph's color does
            // not bleed onto the adjacent void cell (e.g. the cell right of
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
            while (x + run <= lastCol && (cells[x + run].ch ?? ' ') === ' '
                   && !(cells[x + run].attr & 1))
                run++;
            if (activeDec) {
                output += '\x0f';
                activeDec = false;
            }
            if (run > 4)
                output += `\x1b[${run}C`;
            else
                output += ' '.repeat(Math.max(0, run));
            x += run - 1;
            continue;
        }
        /* The recorded screen collapses a run of five or more blank cells into
         * one cursor-forward even when they carry ATR_INVERSE (ghosts shown by
         * monster detection): \e[7m\e[15C\e[0m.  The decoder leaves those cells
         * unpainted, so spelling them out as \e[7m \e[0m over-paints. */
        if (ch === ' ' && inverse) {
            let irun = 1;
            while (x + irun <= lastCol && (cells[x + irun].ch ?? ' ') === ' '
                   && (cells[x + irun].attr & 1))
                irun++;
            if (irun > 4) {
                if (activeDec) { output += '\x0f'; activeDec = false; }
                output += `\x1b[7m\x1b[${irun}C\x1b[0m`;
                activeInverse = false; activeColor = ANSI_DEFAULT;
                x += irun - 1;
                continue;
            }
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
        /* petattr:bold (wintty.c term_start_attr(ATR_BOLD)): the recording has
         * the bold SGR fused with the colour, \e[1;97m, and closed by \e[0m
         * right after the glyph.  attr bit 2 is terminal.js's ATR_BOLD. */
        const bold = !inverse && !!(cell.attr & (2 | 4)); /* 4: petattr:underline, same fused-SGR shape */
        const sgrAttr = (cell.attr & 2) ? 1 : 4;
        if (bold) {
            output += `\x1b[${sgrAttr};${wantAnsi}m`;
            activeColor = wantAnsi;
        } else if (wantAnsi !== activeColor) {
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
        if (bold) {
            if (activeDec) { output += '\x0f'; activeDec = false; }
            output += '\x1b[0m';
            activeColor = ANSI_DEFAULT;
        }
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
    return cache.output = output;
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
    /* C botl.c:338-340 scans roles[] for monnum == role->mnum; the mnums are
     * PM_ARCHEOLOGIST (331 in js/pm.generated.js) .. PM_WIZARD in roles[] order,
     * so a player-monster index maps to its role ordinal.  Callers that already
     * hold a role ordinal pass 0..12. */
    if (monnum >= 331 && monnum <= 343) {
        /* monst.h order is ...Priest, Ranger, Rogue, Samurai..., while the
         * role ordinals here follow roles[] (Rogue before Ranger). */
        monnum -= 331;
        if (monnum === 7) monnum = 8;
        else if (monnum === 8) monnum = 7;
    }
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
export function botl_pmname(mndx, mgender) { return _pmname(mndx, mgender); }
export function botl_upstart_words(s) { return _upstart_words(s); }
export function botl_mon_mlevel(mndx) { return _mon_mlevel(mndx); }
// C botl.c:992-999: shorten only the name to fit a 30-character title,
// preserving at least BOTL_NSIZ name characters even for a long rank.
export function botl_title(name, role) {
    return `${name.slice(0, Math.max(BOTL_NSIZ, 30 - 5 - role.length))} the ${role}`;
}
/* C wintty.c:4818-4828 tty_putstatusfield(): x is 1-based and n < ncols
 * leaves the final terminal column unwritten.  Count the title's padding
 * (or hitpointbar brackets) before limiting the remaining fields.  The
 * three-row assembler moves alignment to row 2, so keep it intact there. */
export function botl_status1_tail(stats, align, column) {
    const text = `${stats} ${align}`;
    return _threeStatusLines() ? text : text.slice(0, Math.max(0, COLNO - 1 - column));
}
// ── Status lines ──
/* C wintty.c:4562-4565, 5124-5190 — with hitpointbar the title field is
 * forced to exactly 30 chars ("%-30.30s", botl.c:1714), drawn between '['
 * and ']' (32 columns), and the next field follows after one space.
 * Shared with js/com_pager.js's menu-covered status row. */
export function hitpointbar_status1(title, stats, align, ulevel, Upolyd) {
    const u = game.u;
    let bar = title.slice(0, 30).padEnd(30, ' ');
    const _hs = (game._inMovemonMore && game._paintedSnapshot
                 && game._paintedSnapshot.botl
                 && game._paintedSnapshot.botl.mtimedone != null)
        ? game._paintedSnapshot.botl
        /* botl.c:279 — u.uhp == -1 leaves the last paint (bar percent
         * included) on the terminal; the title text already comes from it. */
        : ((((game.u.uhp | 0) === -1 || game._botlFrozenDeath) && game._lastPaintedBotl
            && game._lastPaintedBotl.umonnum != null) ? game._lastPaintedBotl : null);
    /* repad_with_dashes (botl.c:2168) when critically_low_hp(TRUE) (pray.c:113) */
    /* botl.c:1036-1038: gameover sets u.uhp to -1; the blstat is clamped to 0 */
    const curhp = Math.max(0, Upolyd ? ((_hs ? _hs.mh : u.mh) | 0) : ((_hs ? _hs.uhp : u.uhp) | 0));
    let maxhp = Upolyd ? ((_hs ? _hs.mhmax : u.mhmax) | 0) : ((_hs ? _hs.uhpmax : u.uhpmax) | 0);
    const maxhp0 = maxhp;
    if (maxhp > 15 * ulevel) maxhp = 15 * ulevel;
    const r = _xlev_to_rank(ulevel);
    const divisor = r <= 1 ? 5 : r <= 3 ? 6 : r <= 5 ? 7 : r <= 7 ? 8 : 9;
    if (curhp <= 5 || curhp * divisor <= maxhp) {
        const c = bar.split('');
        let n = c.length;
        while (n >= 2 && c[n - 1] === ' ' && c[n - 2] === ' ') { c[n - 1] = '-'; n -= 2; }
        bar = c.join('');
    }
    /* wintty.c:5155-5190: percent comes from botl.c (hp*100/hpmax); the first
     * bar_pos chars are drawn in inverse (tty_status[BL_TITLE].attr =
     * HL_INVERSE), the rest plain.  Trailing blanks of the inverse part reach
     * the terminal as cursor-forward (recorded: ESC[7m<title>ESC[10CESC[0m). */
    let pct = maxhp0 > 0 ? Math.trunc((curhp * 100) / maxhp0) : 100;
    if (pct === 0 && curhp !== 0) pct = 1; /* botl.c:2042 percentage() */
    let pos = bar.length;
    if (pct < 100) {
        pos = Math.trunc((bar.length * pct) / 100);
        if (pos < 1 && pct > 0) pos = 1;
        if (pos >= bar.length) pos = bar.length - 1;
    }
    let p1 = bar.slice(0, pos);
    const trail = p1.length - p1.trimEnd().length;
    if (trail > 4) p1 = `${p1.slice(0, p1.length - trail)}\x1b[${trail}C`;
    /* wintty.c:4536-4543,5136-5150: the bar takes the BL_HP field's highlight
     * colour (attr forced to inverse) and starts it only when hilite_delta. */
    let sgr = '\x1b[7m';
    if (game.iflags?.hilite_delta) {
        const hh = _status_field_hilites(`HP:${curhp}(${maxhp0})`).get(0);
        if (hh && hh.color !== NO_COLOR) sgr = `\x1b[7;${ANSI_COLOR[hh.color] ?? ANSI_DEFAULT}m`;
    }
    return `[${p1 ? sgr + p1 : ''}\x1b[0m${bar.slice(pos)}] ${botl_status1_tail(stats, align, 33)}`;
}
/* C botl.c:2364-2560 get_hilite() + tty_putstatusfield: persistent
 * (always / absolute-threshold) hilite_status rules, applied to the painted
 * status text.  Percentage rules and the temporary up/down/changed rules (which
 * need the per-field blstats history and hilite_delta timers) are NOT modelled;
 * a rule of those kinds is ignored here. */
const _HL_COLORS = { black: 30, red: 31, green: 32, brown: 33, blue: 34, magenta: 35,
    cyan: 36, orange: 91, 'bright-green': 92, yellow: 93, 'bright-blue': 94,
    'bright-magenta': 95, 'bright-cyan': 96, white: 97 };
let _hlCacheRc = null, _hlCacheRules = null;
function _hilite_rules() {
    const rc = String(game._hilite_rc || '');
    if (rc === _hlCacheRc) return _hlCacheRules;
    const rules = [];
    for (const m of rc.matchAll(/^\s*OPTIONS\s*=\s*hilite_status\s*:\s*([^\n\r]*)/gim)) {
        for (const spec of m[1].split(/\s+/)) {
            const parts = spec.toLowerCase().split('/');
            if (parts.length < 3) continue;
            if (parts[0] === 'condition' || parts[0] === 'conditions') {
                /* botl.c condition rules: cond1+cond2/color&attr; each named
                 * condition is coloured separately by tty render_status. */
                const [cn, ...ca] = parts[2].split('&');
                const ccol = _HL_COLORS[cn];
                if (ccol === undefined) continue;
                rules.push({ fld: 'cond', beh: 'cond', names: parts[1].split('+'), col: ccol,
                    bold: ca.includes('bold') });
                continue;
            }
            const fld = { charisma: 'Ch', cha: 'Ch', strength: 'St', dexterity: 'Dx', dx: 'Dx',
                constitution: 'Co', con: 'Co', co: 'Co', intelligence: 'In', wisdom: 'Wi',
                gold: 'gold', title: 'title', 'hitpoints-max': 'hpmax', 'hp-max': 'hpmax' }[status_fieldname(parts[0])];
            const col = _HL_COLORS[parts[2].split('&')[0]];
            if (!fld || col === undefined) continue;
            const t = /^(always|([<>]=?|=)?(-?\d+))$/.exec(parts[1]);
            if (!t) continue;
            rules.push(t[1] === 'always' ? { fld, beh: 'always', col }
                : { fld, beh: 'abs', rel: t[2] || '=', val: +t[3], col });
        }
    }
    _hlCacheRc = rc; _hlCacheRules = rules;
    return rules;
}
/* get_hilite()'s best-fit pick among persistent rules for one field value. */
function _hilite_pick(fld, v) {
    let rule = null, exact = false, minV = Infinity, maxV = -Infinity, abs = false;
    for (const r of _hilite_rules()) {
        if (r.fld !== fld) continue;
        if (abs && r.beh === 'always') continue;
        if (r.beh === 'always') { rule = r; continue; }
        if (r.rel === '=' && v === r.val) { rule = r; exact = abs = true; minV = maxV = r.val; }
        else if (exact) continue;
        else if (r.rel === '<' && v < r.val && r.val <= minV) { rule = r; minV = r.val; abs = true; }
        else if (r.rel === '<=' && v <= r.val && r.val <= minV) { rule = r; minV = r.val; abs = true; }
        else if (r.rel === '>' && v > r.val && r.val >= maxV) { rule = r; maxV = r.val; abs = true; }
        else if (r.rel === '>=' && v >= r.val && r.val >= maxV) { rule = r; maxV = r.val; abs = true; }
    }
    return rule;
}
export function _hilite_status_wrap(row) {
    // C wintty.c:5213-5234: all field highlighting requires hilite_delta.
    if (!game.iflags?.hilite_delta || !row || !_hilite_rules().length) return row;
    const w = (fld, v, text) => {
        const r = _hilite_pick(fld, v);
        return r ? `\x1b[${r.col}m${text}\x1b[39m` : text;
    };
    /* C botl.c BL_TITLE: the title field is the leading text up to the padding. */
    if (/St:\d/.test(row)) row = row.replace(/^[^\x1b]+(?:\x1b\[\d+C)?/, (m) => w('title', 0, m));
    /* BL_TITLE: the colour spans the title field's padding (botl.c:2364), so
     * the field ends one column short of the first stat. */
    row = row.replace(/^(.*?)(?:\x1b\[(\d+)C|( +))(?=St:)/, (m, t, n, sp) => {
        const r = _hilite_pick('title', 0);
        if (!r) return m;
        const pad = n ? +n : sp.length;
        const gap = pad - 1 > 4 ? `\x1b[${pad - 1}C` : ' '.repeat(pad - 1);
        return `\x1b[${r.col}m${t}${gap}\x1b[39m `;
    });
    for (const r of _hilite_rules()) {
        if (r.beh !== 'cond') continue;
        for (const n of r.names) {
            const long = { hallu: 'Hallu', blind: 'Blind' }[n];
            if (!long) continue;
            row = row.replace(new RegExp(` ${long}(?= |$)`),
                ` \x1b[${r.bold ? '1;' : ''}${r.col}m${long}\x1b[${r.bold ? '22;' : ''}39m`);
        }
    }
    return row
        .replace(/^(.*?)(\x1b\[\d+C| *)(?= St:|St:)/, (m, t, pad) => (t ? w('title', 0, t + pad) : m))
        .replace(/\b(St|Dx|Co|In|Wi|Ch):(\d+)(?:\/\d+)?/g, (m, f, n) => w(f, +n, m))
        .replace(/\$:(\d+)/, (m, n) => w('gold', +n, m))
        .replace(/(HP:\d+)(\((\d+)\))/, (m, a, b, n) => a + w('hpmax', +n, b));
}
function _statusLine1() { return _hilite_status_wrap(_statusLine1Raw()); }
function _statusLine2() { return _hilite_status_wrap(_statusLine2Raw()); }
/* C botl.c:259-270: HP -1 suppresses painting, leaving the previous status
 * on the terminal. done() can then zero HP without another paint (end.c:1073).
 * Menu overlays must keep those same rows, including their frozen fields. */
export function botl_frozen_status_line(row) {
    /* cls() erases the previous paint; a suppressed bot() cannot restore it
     * (display.c:2198, botl.c:259). Pager windows retain those blank rows. */
    if (game._status_blanked || _status_blank_after_docrt())
        return '';
    if (((game.u?.uhp | 0) === -1 || game._botlFrozenDeath || game._botlPaintHeld)
        && game._lastPaintedBotl)
        return _status_sgr(row === 1 ? _statusLine1() : _statusLine2());
    return null;
}
function _statusLine1Raw() {
    const u = game.u;
    /* C botl.c:259-260 bot(): nothing is painted while !iflags.status_updates,
     * so the physical status rows stay blank for the whole game. */
    if (!u || game.iflags?.status_updates === false)
        return '';
    /* C botl.c:260 — bot() paints only when iflags.status_updates; with
     * OPTIONS=!status_updates nothing ever reaches the tty status window,
     * so both rows stay blank for the whole game. */
    if (game.iflags?.status_updates === false)
        return '';
    // C ref: botl.c:58-60 — capitalize first letter of plname
    const rawName = game.plname || 'Hero';
    const name = (rawName.length > 0 && rawName[0] >= 'a' && rawName[0] <= 'z')
        ? rawName[0].toUpperCase() + rawName.slice(1)
        : rawName;
    // C ref: botl.c:rank() → rank_of(u.ulevel, Role_switch, flags.female)
    // Use role name to index into _ROLE_RANKS (game.urole has no mnum field).
    let female = !!(game.flags?.female);
    // Match by male name first, then female name for roles with gendered names.
    const roleNameM = game.urole?.name?.m || '';
    const roleNameF = game.urole?.name?.f || '';
    const lookupName = roleNameM || roleNameF;
    // C ref: botl.c:777 — titl = !Upolyd ? rank() : pmname(&mons[u.umonnum],
    // Ugender); botl.c:788-792 capitalizes every word of the monster name.
    const _b1s = (game._inMovemonMore && game._paintedSnapshot
                  && game._paintedSnapshot.botl
                  && game._paintedSnapshot.botl.mtimedone != null)
        ? game._paintedSnapshot.botl
        /* botl.c:279 — u.uhp == -1 leaves the last paint on the terminal, title
         * (rank of the painted level) included. */
        : ((((u.uhp | 0) === -1 || game._botlFrozenDeath) && game._lastPaintedBotl
            && game._lastPaintedBotl.umonnum != null) ? game._lastPaintedBotl : null);
    /* botl.c:777 rank() reads flags.female at bot() PAINT time; polymon flips it
     * (polyself.c:785-793) before the pline whose --More-- freezes the old title. */
    if (_b1s && _b1s.female != null) female = _b1s.female;
    else if (game._botlPaintedFemale !== undefined) female = game._botlPaintedFemale;
    // Rank and experience must come from the same painted status snapshot.
    const ulevel = (_b1s?.ulevel ?? u.ulevel) || 1;
    /* C you.h:554 (u.umonnum != u.umonster), not the u.mtimedone timer. */
    const _umonnum = (_b1s ? _b1s.umonnum : u.umonnum) | 0;
    const Upolyd = _umonnum !== (((_b1s && _b1s.umonster != null) ? _b1s.umonster : u.umonster) | 0);
    const role = Upolyd
        ? _upstart_words(_pmname(_umonnum, (u.mfemale ? 1 : 0) /* you.h:555 Ugender, Upolyd arm */))
        : (_rank_of(ulevel, lookupName, female)
           || _rank_of(ulevel, roleNameF, female)
           || (female ? game.urole?.name?.f : null)
           || game.urole?.name?.m
           || 'Adventurer');
    const title = botl_title(name, role);
    const _a1s = (game._inMovemonMore && game._paintedSnapshot
                  && game._paintedSnapshot.botl
                  && game._paintedSnapshot.botl.attrs)
        /* botl.c:279 — a bot() that declined to paint (u.uhp == -1, or the death
         * freeze) leaves the six attributes as the last paint put them. */
        || ((((u.uhp | 0) === -1 || game._botlFrozenDeath) && game._lastPaintedBotl
             && game._lastPaintedBotl.attrs) || null);
    const _hasAttrs = !!(_a1s || (u.acurr && u.acurr.a));
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
    /* C botl.c:1023-1027 BL_ALIGN: a pending more() retains the alignment
     * painted by that pline's flush, before a later uchangealign() runs. */
    const alignType = _b1s?.alignType ?? u.ualign?.type;
    const align = alignType === 0 ? 'Neutral' : alignType > 0 ? 'Lawful' : 'Chaotic';
    if (game?.iflags?.wc2_hitpointbar)
        return hitpointbar_status1(title, stats, align, ulevel, Upolyd);
    // C uses cursor-forward for gap between title and stats
    // C pads to align stats starting at a fixed column
    const gap = Math.max(1, 31 - title.length);
    const tail = botl_status1_tail(stats, align, title.length + gap);
    if (gap > 4)
        return `${title}\x1b[${gap}C${tail}`;
    return `${title}${' '.repeat(Math.max(0, gap))}${tail}`;
}
/* C ref: botl.c:872 — mons[u.umonnum].mlevel, read from the shared mons pack
 * (the same table js/makemon.js permonstTemplate builds from). */
function _mon_mlevel(mndx) {
    const row = monsPack.mons?.[mndx];
    return row ? (row[1] | 0) : 0;   /* row[1] = mlevel (js/makemon.js permonstTemplate) */
}
function _statusLine2Raw() {
    const p = _statusLine2Parts();
    if (p === null)
        return '';
    return status_row_finish(`${p.desc} ${p.mid}${p.time}${p.hunger}${p.conds}`);
}
/* C wintty.c:4277-4298 — the 3-row layout (iflags.wc2_statuslines == 3) moves
 * Align to row 2 and puts Leveldesc + Time + Conditions on row 3, so the pieces
 * of the 2-row bottom line are kept apart. */
function _statusLine2Parts() {
    const u = game.u;
    /* C botl.c:259-260 bot(): nothing is painted while !iflags.status_updates,
     * so the physical status rows stay blank for the whole game. */
    if (!u || game.iflags?.status_updates === false)
        return null;
    /* C botl.c:260 — bot() paints only when iflags.status_updates; with
     * OPTIONS=!status_updates nothing ever reaches the tty status window,
     * so both rows stay blank for the whole game. */
    if (game.iflags?.status_updates === false)
        return null;
    // C ref: botl.c:bot2() — gold via money_cnt(gi.invent); Xp: always shows level;
    //   /exp shown only when showexp set; T: (turn count) shown only when time set.
    // C ref: do.c goto_level — the descend/climb "You descend the stairs.--More--"
    // is shown by more() BEFORE docrt/bot redraw the new level (the message window
    // is more()'d as it is cleared for the redraw).  At that instant the physical
    // bottom status line still shows whatever the LAST bot() paint left on it: the
    // OLD Dlvl on a fresh-level descent (no pline between assign_level and the
    // delay_flushing toggle), but the NEW one when a pline flushed inside the
    // do.c:1693-1720 window — getbones' wizard queries paint exactly there
    // (bones.c:671/740 -> pline.c:273-274 -> display.c:2237 bot()), which is why
    // Dlvl:3 over the OLD map.  level_transition_arrival_more() carries the
    // window paint (g._levelgenWindowUz) or oldPaint's dlevel in the snapshot;
    // with a dlevel override (only set during the descend/climb --More--
    // window), so it has ZERO effect on any non-transition render.
    const _snap2 = (game._inMovemonMore && game._paintedSnapshot) ? game._paintedSnapshot : null;
    /* A pline page's botl snapshot contains the level bot() painted too.
     * During goto_level's delayed flushes it can still be the old level;
     * a later direct bot() in done() must not rewrite an earlier page.
     * C display.c:2223-2226; do.c:1720; end.c:1045-1046. */
    const _uzFrozen = ((!_snap2 || _snap2.dlevel == null)
        && (game._botlUzFrozen || _snap2?.botl
            || (game._botlPaintHeld && game._lastPaintedBotl))) || null;
    const _dnum = (_snap2 && _snap2.dnum != null) ? _snap2.dnum : _uzFrozen ? _uzFrozen.dnum : (u.uz?.dnum);
    const _dlevelRaw = (_snap2 && _snap2.dlevel != null) ? _snap2.dlevel : _uzFrozen ? _uzFrozen.dlevel : (u.uz?.dlevel ?? 1);
    /* C ref: wintty.c:4546-4556 — for BL_LEVELDESC the tty windowport strips the
     * trailing blanks the core sends ("The core sends trailing blanks for some
     * fields.  Let's suppress the trailing blanks"), so describe_level's %-2d pad
     * and its dflgs&1 trailing space never reach the screen; the single separator
     * space below is the status layout's own. */
    const _leveldescField = describe_level_buf(1, { dnum: _dnum | 0, dlevel: _dlevelRaw })
        .replace(/ +$/, '');
    /* C ref: botl.c:145-146 — hp/hpmax come from u.mh/u.mhmax while polymorphed:
     *   hp = Upolyd ? u.mh : u.uhp;  hpmax = Upolyd ? u.mhmax : u.uhpmax; */
    /* C botl.c:279 — while bot() declines to paint (u.uhp == -1, or a held
     * paint) the CONDITIONS on the physical line are the last paint's as well,
     * not only HP.  mhitu.c:1193 knockback: make_stunned (potion.c:123) plines
     * "You stagger..." before set_itimeout, then mdamageu leaves u.uhp at -1,
     * so C's "You stagger..." and "You die..." pages carry no Stun. */
    const _frozenPaint = (((u.uhp | 0) === -1 || game._botlFrozenDeath || game._botlHeldEat
                           || game._botlPaintHeld)
                          && game._lastPaintedBotl) ? game._lastPaintedBotl : null;
    const _p2s = (game._inMovemonMore && game._paintedSnapshot
                  && game._paintedSnapshot.botl
                  && game._paintedSnapshot.botl.mtimedone != null)
        ? game._paintedSnapshot.botl
        : (_frozenPaint && _frozenPaint.mtimedone != null) ? _frozenPaint : null;
    /* C you.h:554 (u.umonnum != u.umonster), not the u.mtimedone timer. */
    const Upolyd = (((_p2s ? _p2s.umonnum : u.umonnum) | 0)
                    !== (((_p2s && _p2s.umonster != null) ? _p2s.umonster : u.umonster) | 0));
    const _frozenAtMinusOne = _frozenPaint;
    const _bs = (game._inMovemonMore && game._paintedSnapshot
                 && game._paintedSnapshot.botl) ? game._paintedSnapshot.botl
        : _frozenAtMinusOne;
    /* C botl.c:1051-1054: a paged status row retains the gold painted by
     * vpline's flush_screen, before later payments change the inventory. */
    const _staleGold = _bs?.gold ?? game._tutorialStatusOverride?.gold ?? game._botlGoldStale;
    const gold = (_staleGold === undefined || _staleGold === null)
        ? money_cnt(game.invent ?? null)
        : (_staleGold | 0);
    const _bu = _bs || u;
    let _hp = Upolyd ? (_bu.mh | 0) : (_bu.uhp || 0);
    /* trap.c sink_into_lava writes u.uhp with no SET_BOTL: the physical line keeps
     * the last bot()'s HP (js/trap.js records it in _botlStaleUhp). */
    if (!Upolyd && !_bs && game._botlStaleUhp !== undefined) _hp = game._botlStaleUhp | 0;
    const _staleHpmax = (!_bs && game._botlStaleHp !== undefined)
        ? game._botlStaleHpmax | 0 : undefined;
    if (_staleHpmax !== undefined) _hp = game._botlStaleHp | 0;
    /* C botl.c:1037-1044 reads HP from the current form at paint time.
     * Earlier --More-- paints retain their HP through _bs above; reverting
     * form does not subtract regeneration from a later status paint. */
    if (_hp < 0)
        _hp = 0;
    _hp = Math.min(_hp, 9999);
    const _hpmax = Math.min(_staleHpmax !== undefined ? _staleHpmax
        : Upolyd ? (_bu.mhmax | 0) : (_bu.uhpmax || 0), 9999);
    const _pw = Math.min((!_bs && game._botlStaleUen !== undefined
                          ? game._botlStaleUen : _bu.uen) || 0, 9999);
    const _pwmax = Math.min((!_bs && game._botlStaleUenmax !== undefined
                             ? game._botlStaleUenmax : _bu.uenmax) || 0, 9999);
    const _lp = game._lastPaintedBotl;
    const _uac = (_bs && _bs.uac != null) ? _bs.uac
        : (_lp && _lp.uacUnset && u.uac != null && game.disp && (game.disp.botl | 0))
            ? _lp.uac : (u.uac ?? 0);
    const _xpLevel = ((_bs && _bs.ulevel != null) ? _bs.ulevel : u.ulevel) || 1;
    /* RogueEpyx S_coin = \x0f <= ' ': check_gold_symbol() sets invis_goldsym
     * (botl.c:42-44) and the field is labelled "$" (botl.c:131). */
    const _goldch = (game._inMovemonMore && _bs?.goldLabel != null)
        ? _bs.goldLabel : gold_status_char(gold);
    let s = `${_goldch}:${gold} HP:${_hp}(${_hpmax}) Pw:${_pw}(${_pwmax}) AC:${_uac}`;
    let _timeStr = '';
    /* botl.c:1705-1706 enables XP/HD only at status_initialize(), whereas
     * :1635-1636 skips updates using the live form.  A raw hero restore
     * (nhlua.c:1753) can therefore leave an enabled field holding its old
     * value until the next reassessment. */
    const _xpFields = _p2s?.experienceFields ?? game._statusExperienceFields;
    const _hdEnabled = _xpFields?.polymorphed ?? Upolyd;
    const _shownLevel = Upolyd && !_hdEnabled ? (_xpFields?.level ?? 0) : _xpLevel;
    const _shownExp = Upolyd && !_hdEnabled ? (_xpFields?.experience ?? 0)
        : (_bs && _bs.uexp != null) ? _bs.uexp : (u.uexp || 0);
    if (_hdEnabled) {
        s += ` HD:${Upolyd ? _mon_mlevel(((_p2s ? _p2s.umonnum : u.umonnum) | 0))
            : (_xpFields?.hd ?? 0)}`;
    } else if (game.flags?.showexp) {
        s += ` Xp:${_shownLevel}/${_shownExp}`;
    }
    else {
        s += ` Xp:${_shownLevel}`;
    }
    if (game.flags?.time) {
        // C ref: botl.c bot2() — `T:` shows svm.moves.  Normally that equals the
        // RNG-gating game.moves.  The one exception is the per-turn movemon-message
        // --More-- paging window: C runs turn N's movemon and only increments
        // svm.moves AFTER each turn's HEAD, so the physical screen at the
        // overflowing pline shows the svm.moves in effect at that instant.  The
        // overflow); prefer it.  Otherwise fall back to the tagged movemon turn
        // (_movemonMsgTurn) for windows with no snapshot, then live game.moves.
        // DISPLAY-ONLY; no RNG.
        let displayMoves;
        if (game._tutorialStatusOverride?.moves != null)
            displayMoves = game._tutorialStatusOverride.moves | 0;
        else if (game._inMovemonMore && game._paintedSnapshot)
            displayMoves = game._paintedSnapshot.moves;
        /* The tag names the turn whose movemon raised the page (moves-1 once the
         * head has run ahead).  A multi-turn action (sleep ray, multi < 0) runs
         * many turns inside one command, leaving the tag stale: C's bot() at the
         * page's flush shows the live svm.moves.  A later bot()/timebot() paint
         * also supersedes the tag (botl.c:259-268,285-290), even if only one
         * turn has elapsed. */
        else if (game._inMovemonMore && game._movemonMsgTurn != null
                 && (game._movemonMsgTurn | 0) >= (game.moves | 0) - 1
                 && (game._botlPaintedMoves == null
                     || (game._botlPaintedMoves | 0) <= (game._movemonMsgTurn | 0)))
            displayMoves = game._movemonMsgTurn;
        else
            displayMoves = (_painted_moves() || game.moves || 1);
        _timeStr = ` T:${displayMoves || 1}`;
    }
    /* C botl.c:186-187 — hunger status: if (u.uhs != NOT_HUNGRY) append " <hu_stat[uhs]>".
     * hu_stat[] (eat.c:70) carries trailing spaces; the tty trims trailing blanks
     * per line (the scorer's normScreen does too), so emit the trimmed word.
     * C ref index order: SATIATED=0, NOT_HUNGRY=1, HUNGRY=2, WEAK=3, FAINTING=4,
     * FAINTED=5, STARVED=6. */
    // During a forced occupation/post-meal --More-- that froze the hunger state, render
    // the FROZEN uhs (the per-turn bot() value) rather than the live one — C shows the
    // "Satiated" even though lesshungry's newuhs() has already crossed the threshold).
    let _uhs = (u.uhs | 0);
    if (game._saved_hs && game._botlPaintedUhs != null && !game.occupation
        && !(game.disp && ((game.disp.botl | 0) || (game.disp.botlx | 0))))
        _uhs = (game._botlPaintedUhs | 0);
    /* A fainting transition can finish its countdown in the same dispatch
     * that publishes a teleport result.  C paints that result frame before
     * the subsequent unfaint callback, so retain the FAINTED label while the
     * faint message is still the committed topline. */
    const _faintTop = `${game._resultMessage || ''} ${game._pending_message || ''}`;
    /* ...but a lone faint pline with no frozen frame behind it is the frame
     * AFTER the countdown ran out: unfaint (eat.c:3336-3343) has already
     * clamped u.uhs to FAINTING and Hear_again may have cleared Deaf, and C's
     * status row shows exactly that ("Fainting", no Deaf). */
    /* A drained more() may retain its snapshot.  Only an active page freezes
     * status; after unfaint's SET_BOTL, bot() paints FAINTING (eat.c:3339-3342,
     * allmain.c:473-475) even if WIN_STOP hides the wake-up message. */
    const _postUnfaint = !game._resultMessage
        && !(game._inMovemonMore && game._paintedSnapshot)
        && (/^You faint from lack of food.(  You regain consciousness.)?$/.test(game._pending_message || '')
            || /You faint from lack of food\..*  You regain consciousness\.$/.test(game._pending_message || ''));
    /* unmul's wake-up pline paged --More-- (the unfaint callback's Hear_again
     * pline raised it): unfaint already clamped u.uhs to FAINTING (eat.c:3336). */
    const _wakePage = !game._resultMessage
        && /You regain consciousness\.--More--$/.test(game._pending_message || '')
        && (u.uhs | 0) === 4;
    if (_uhs === 4 && !_postUnfaint && !_wakePage
        && _faintTop.includes('You faint from lack of food.'))
        _uhs = 5;
    if (game._inMovemonMore && game._paintedSnapshot
        && (game._paintedSnapshot.uhs != null
            || game._paintedSnapshot.botl?.uhs != null)) {
        _uhs = ((game._movemonPageFrames?.length
                || game._saved_hs)
                && game._paintedSnapshot.botl?.uhs != null)
            ? (game._paintedSnapshot.botl.uhs | 0)
            : (game._paintedSnapshot.uhs != null)
                ? (game._paintedSnapshot.uhs | 0)
                : (game._paintedSnapshot.botl.uhs | 0);
    }
    let _cap = game._botlPaintedCap;
    if (game._inMovemonMore && game._paintedSnapshot
        && game._paintedSnapshot.cap != null)
        _cap = game._paintedSnapshot.cap | 0;
    else if (_bs && _bs.cap != null)
        _cap = _bs.cap | 0;
    /* newuhs() sets HDeaf after its fainting message has begun but before the
     * status repaint.  That specific page is post-update in C; don't let the
     * pre-message snapshot hide the new Deaf condition. */
    const _wakeMore = !game._resultMessage && !!game._paintedSnapshot
        && (game._pending_message || '').endsWith('--More--')
        && (!(u.HDeaf | 0) || (game._pending_message || '').includes('You regain consciousness.'));
    const _faintingPage = !_postUnfaint && !_wakePage && !_wakeMore && _faintTop.includes('You faint from lack of food.');
    const _suffix = botl_status_suffix(_uhs, _cap, _p2s ? !!_p2s.blinded : undefined,
                            (!_faintingPage && _p2s && _p2s.deaf !== undefined)
                                ? !!_p2s.deaf
                                /* eat.c:3421-3423: the page is flushed before newuhs's
                                 * incr_itimeout(&HDeaf, duration) lands here, but C paints
                                 * it post-update (duration = 10 - uhunger/10 > 0). */
                                : ((_faintingPage && (u.uhs | 0) === 4) ? true : undefined),
                            (_p2s && _p2s.stunned !== undefined) ? !!_p2s.stunned : undefined,
                            (_p2s && _p2s.hallucinating !== undefined)
                                ? !!_p2s.hallucinating : undefined,
                            (_p2s && _p2s.confused !== undefined)
                                ? !!_p2s.confused : undefined,
                            (_p2s && _p2s.flying !== undefined) ? !!_p2s.flying
                                /* a --More-- page shows the last bot() paint's Fly: switch_terrain's
                                 * "You start flying." (hack.c:3205) plines before the arrival bot() */
                                : ((game._pending_message || '').endsWith('--More--') && game._botlPaintedFlying != null
                                   /* mount_steed (steed.c:354-382): the "You mount" page is raised after
                                    * bot() saw u.usteed (Ride is live here), so a flying steed's Fly
                                    * (youprop.h Flying) is live too, not the pre-mount paint */
                                   && !(u.usteed && _live_flying())
                                   ? !!game._botlPaintedFlying : undefined),
                            (_p2s && _p2s.sickType !== undefined) ? _p2s.sickType | 0 : undefined,
                            (_p2s && _p2s.levitating !== undefined) ? !!_p2s.levitating : undefined,
                            (_p2s && _p2s.slimed !== undefined) ? !!_p2s.slimed
                                : (game._botlPaintedSlimed != null ? !!game._botlPaintedSlimed : undefined),
                            /* botl.c:1156 bl_inlava: a --More-- frame holds the last bot() paint (goto_level clears utrap before the flush) */
                            (_p2s && _p2s.inLava !== undefined) ? !!_p2s.inLava : (game._botlPaintedInLava != null ? !!game._botlPaintedInLava : undefined),
                            (_p2s && _p2s.woundedLegs !== undefined) ? !!_p2s.woundedLegs : undefined,
                            (_p2s && _p2s.strangled !== undefined) ? !!_p2s.strangled : undefined,
                            (_p2s && _p2s.busy !== undefined) ? !!_p2s.busy : undefined,
                            (_p2s && _p2s.grabbed !== undefined) ? !!_p2s.grabbed : undefined,
                            (_p2s && _p2s.stoned !== undefined) ? !!_p2s.stoned : undefined,
                            (_p2s && _p2s.riding !== undefined) ? !!_p2s.riding : undefined);
    const _m = /^((?: (?:Satiated|Hungry|Weak|Fainting|Fainted|Starved))?(?: (?:Burdened|Stressed|Strained|Overtaxed|Overloaded))?)(.*)$/.exec(_suffix);
    return { desc: _leveldescField, mid: s, time: _timeStr, hunger: _m[1], conds: _m[2] };
}
/* C botl.c:480-553 weapon_status() — terse wielded-weapon description. */
/* At step 0 C's bot() ran before ini_inv (uacStep0 in com_pager.js), so the
 * painted weapon/armor/Bare fields read an empty equipment set. */
function _equipView() {
    const u = game.u;
    if (!game._botlPreInv) return u;
    return { ...u, uwep: null, uswapwep: null, uarm: null, uarmc: null, uarmh: null,
             uarms: null, uarmg: null, uarmf: null, uarmu: null, uleft: null,
             uright: null, uamul: null, twoweap: false };
}
export function weapon_status() {
    const u = _equipView();
    const uwep = u.uwep;
    let res;
    let out = '';
    if (!uwep) {
        res = u.uarmg ? 'Empty-hnd'
            : humanoid(game.youmonst?.data) ? 'Bare-hnds' : 'No-weapon';
        return res;
    } else if (u.twoweap) {
        res = 'Dual-weps';
        if (u.usteed && (weapon_type(uwep) === P_LANCE || weapon_type(u.uswapwep) === P_LANCE))
            res = 'Dual+joust';
        return res;
    }
    const skill = weapon_type(uwep);
    const otyp = uwep.otyp | 0;
    if (u.usteed && skill === P_LANCE) {
        res = 'joust';
    } else if (otyp === 80 /* AKLYS */) {
        res = 'aklys';
    } else if ((uwep.oclass | 0) === 2 && otyp >= 46 && otyp <= 58 /* is_sword */) {
        res = 'sword';
    } else {
        switch (skill) {
        case P_QUARTERSTAFF: res = 'staff'; break;
        case P_MORNING_STAR: res = 'mrng-star'; break;
        case P_POLEARMS: res = 'pole'; break;
        case P_UNICORN_HORN: res = 'unihorn'; break;
        default:
            res = weapon_descr(uwep);
            if (res.toLowerCase() === 'food' && otyp === 306 /* CREAM_PIE */)
                res = 'pie';
            break;
        }
    }
    // C botl.c:544, obj.h:249: is_weptool is TOOL_CLASS with a nonzero skill.
    if (((uwep.oclass | 0) === 2 /* WEAPON_CLASS */
         || ((uwep.oclass | 0) === 6 /* TOOL_CLASS */ && skill !== 0 /* P_NONE */))
        && bimanual(uwep) && res[0] !== '2' && res.slice(0, 3).toLowerCase() !== 'two')
        out += '2H-';
    out += res[0].toUpperCase() + res.slice(1);
    return out.replace(/ /g, '-');
}
/* C botl.c:556-610 armor_status(). */
export function armor_status() {
    const u = _equipView();
    const n = !!u.uarmg + !!u.uarmc + !!u.uarm + !!u.uarmu + !!u.uarmh + !!u.uarmf + !!u.uarms;
    let b = '';
    if (n === 0) b = 'naked';
    else if (n === 1)
        b = u.uarmg ? 'gloves' : u.uarmc ? 'cloak' : u.uarm ? 'suit' : u.uarmu ? 'shirt'
            : u.uarmh ? helm_simple_name(u.uarmh) : u.uarmf ? 'boots' : u.uarms ? 'shield' : '';
    else {
        if (u.uarmg) b += 'G';
        if (u.uarmc) b += 'C';
        if (u.uarm) b += 'A';
        if (u.uarmu) b += 'U';
        if (u.uarmh) b += 'H';
        if (u.uarmf) b += 'B';
        if (u.uarms) b += 'S';
    }
    if ((u.uright && (u.uright.otyp | 0) === 178 /* RIN_PROTECTION */)
        || (u.uleft && (u.uleft.otyp | 0) === 178)
        || (u.uamul && (u.uamul.otyp | 0) === 210 /* AMULET_OF_GUARDING */)
        || (u.uarmc && (u.uarmc.otyp | 0) === 146 /* CLOAK_OF_PROTECTION */)
        || (u.uarmh && (u.uarmh.oartifact | 0) === 27 /* ART_MITRE_OF_HOLINESS */)
        || (u.uwep && (u.uwep.oartifact | 0) === 30 /* ART_TSURUGI_OF_MURAMASA */))
        b += '+';
    return b[0].toUpperCase() + b.slice(1);
}
/* C version.c:89 status_version() without its indent: VI_NAME adds the game
 * name (nh_basename(hname) = "nethack"), VI_BRANCH adds nomakedefs.git_branch
 * (none in this build, so it drops out), and VI_NUMBER adds "5.0.0" -- which
 * is also forced when neither name nor branch survives (version.c:128-132). */
function status_version_text() {
    const vi = game.flags?.versinfo ?? 1;
    const showname = !!(vi & 2);
    const shownum = !!(vi & 1) || !showname;
    return [showname ? 'nethack' : '', shownum ? '5.0.0' : ''].filter(Boolean).join(' ');
}
/* C botl.c:1251-1259 optional weapon/armor fields, appended after
 * BL_CONDITION in twolineorder (wintty.c:4284). */
export function status_row_finish(base) {
    const v = game.flags?.showvers ? status_version_text() : '';
    const _vlen = v ? v.length + 1 : 0;
    const _row = fit_status_line_width(`${base}${_statusExtras()}`, 79 - _vlen);
    /* wintty.c:5185-5210: BL_VERS last in its row is right-justified to the terminal width. */
    if (v) {
        return _row.length < 79 - v.length ? _row.padEnd(79 - v.length, ' ') + v : `${_row} ${v}`;
    }
    return _row;
}
/* C botl.c status_hilite(): a hilite_status rule
 * condition/<name>/<colour>&<attr> colours the condition's own text in the
 * status row (botl.c:2593 parse_status_hl1 stores it; options.js keeps the
 * rule in game.status_condition_hilites).  Returns Map(col -> {color, attr}).
 * Only the colour and the normal/bold/inverse attrs are modelled. */
const _HL_ATTR = { normal: 0, none: 0, bold: ATR_BOLD, inverse: ATR_INVERSE, reverse: ATR_INVERSE };
/* C botl.c:1097-1103,2820-2824,2912-2916: BL_HUNGER has an integer
 * value and an unlabelled hu_stat[] string. Match the painted field so a
 * status row held across a prompt keeps its displayed hunger value.
 * wintty.c:4284,4297 places it after experience (and optional time). */
function _status_hunger_hilites(row) {
    const cells = new Map();
    const fm = /(?:Xp:\d+(?:\/\d+)?|HD:\d+)(?: T:\d+)? (Satiated|Hungry|Weak|Fainting|Fainted|Starved)(?= |$)/.exec(row);
    if (!fm) return cells;
    const text = fm[1], start = fm.index + fm[0].length - text.length;
    const value = ['Satiated', '', 'Hungry', 'Weak', 'Fainting', 'Fainted', 'Starved'].indexOf(text);
    let rule = null, exact = false, absolute = false, min = Infinity, max = -Infinity;
    for (const spec of game.status_field_hilites || []) {
        const parts = spec.toLowerCase().split('/');
        if (status_fieldname(parts[0].trim()) !== 'hunger') continue;
        if (parts.length === 2) parts.splice(1, 0, 'always');
        for (let i = 1; i + 1 < parts.length; i += 2) {
            const thr = parts[i].trim();
            const [colName, ...attrNames] = parts[i + 1].trim().split(/[&+]/);
            const color = match_str2clr(colName.trim(), true);
            if (color >= 16) continue;
            const attr = attrNames.reduce((a, n) => a | (_HL_ATTR[n.trim()] ?? 0), 0);
            const h = { color, attr };
            /* C get_hilite(): text matches are exact; only numeric matches
             * suppress a subsequent always rule. Last matching text wins. */
            if (thr === 'always') {
                if (!absolute) rule = h;
            } else if (thr === text.toLowerCase()) {
                rule = h;
                exact = true;
            } else {
                const pm = /^(<=|>=|<|>|=)?([+-]?\d+)$/.exec(thr);
                if (!pm) continue;
                const want = +pm[2], rel = pm[1] || '=';
                if (rel === '=' && value === want) {
                    rule = h;
                    min = max = want;
                    exact = absolute = true;
                } else if (!exact && ((rel === '<' && value < want)
                           || (rel === '<=' && value <= want)) && want <= min) {
                    rule = h; min = want; absolute = true;
                } else if (!exact && ((rel === '>' && value > want)
                           || (rel === '>=' && value >= want)) && want >= max) {
                    rule = h; max = want; absolute = true;
                }
            }
        }
    }
    // C wintty.c:5213-5234 excludes the field's leading space from its hilite.
    if (rule)
        for (let c = start; c < start + text.length; c++) cells.set(c, rule);
    return cells;
}
/* C botl.c get_hilite() for a hilite_status FIELD rule
 * <field>/<threshold>/<colour>&<attr>[/<threshold>/<colour>&<attr>...].
 * The rule paints the whole text of the field, label included (C
 * "St:18/02" is 7;93 in full).  Modelled: 'always', and =/</>/<=/>= on the
 * field value, and N% on value/max.  NOT modelled: up/down/changed and
 * critical-HP (botl.c:2420-2440 temp highlights), and get_hilite's best-fit
 * precedence among matching thresholds (the first matching threshold wins). */
const _HL_FIELD_LABEL = {
    strength: 'St:', dexterity: 'Dx:', constitution: 'Co:', intelligence: 'In:',
    wisdom: 'Wi:', charisma: 'Ch:', power: 'Pw:', hitpoints: 'HP:',
    'armor-class': 'AC:', 'experience-level': 'Xp:', 'dungeon-level': 'Dlvl:',
};
function _status_field_hilites(row) {
    const cells = _status_hunger_hilites(row);
    let titleHl = null;
    for (const spec of game.status_field_hilites || []) {
        const parts = spec.split('/');
        if (status_fieldname(parts[0].trim()) === 'title') {
            /* C botl.c:1007 pads BL_TITLE to "%-30s"; the 'always' rule
             * (botl.c:2548) colours the whole padded field.  Text-match
             * title rules are not modelled. */
            for (let i = 1; i + 1 < parts.length; i += 2) {
                if (parts[i].trim().toLowerCase() !== 'always') continue;
                const [colName, ...attrNames] = parts[i + 1].trim().split(/[&+]/);
                const color = match_str2clr(colName.trim(), true);
                if (color >= 16) continue;
                const attr = attrNames.reduce((a, n) => a | (_HL_ATTR[n.trim().toLowerCase()] ?? 0), 0);
                titleHl = { color, attr };
                break;
            }
            continue;
        }
        const label = _HL_FIELD_LABEL[status_fieldname(parts[0].trim())];
        if (!label) continue;
        const fm = new RegExp(`(?:^| )(${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\S*)`).exec(row);
        if (!fm) continue;
        const text = fm[1];
        const start = fm.index + fm[0].length - text.length;
        const body = text.slice(label.length);
        const sm = /^(\d+)\/(\d+)/.exec(body);
        const cur = sm ? (+sm[1] === 18 ? 18 + +sm[2] : +sm[1]) : parseInt(body, 10);
        const max = /\((\d+)\)/.exec(body);
        let always = null, hit = null, exact = false;
        /* C botl.c:2395-2470 get_hilite() best fit: among percentage/absolute
         * rules an exact match wins, else the tightest bound (smallest limit
         * for < / <=, largest for > / >=); min/max start at 101/-1 (pc) and
         * +-LARGEST_INT (abs) and are tracked separately per kind. */
        let minPc = 101, maxPc = -1, minAbs = Infinity, maxAbs = -Infinity;
        for (let i = 1; i + 1 < parts.length; i += 2) {
            const thr = parts[i].trim().toLowerCase();
            const [colName, ...attrNames] = parts[i + 1].trim().split(/[&+]/);
            const color = match_str2clr(colName.trim(), true);
            if (color >= 16) continue; /* CLR_MAX: unknown colour name, C rejects the rule */
            const attr = attrNames.reduce((a, n) => a | (_HL_ATTR[n.trim().toLowerCase()] ?? 0), 0);
            const rule = { color, attr };
            if (thr === 'always') { always ??= rule; continue; }
            const pm = /^(<=|>=|<|>|=)?(-?\d+)(%?)$/.exec(thr);
            if (!pm) continue;
            let v = cur;
            if (pm[3]) {
                if (!max || !(+max[1] > 0)) continue;
                v = Math.trunc((cur * 100) / +max[1]);
            }
            const want = +pm[2], rel = pm[1] || '=';
            if (rel === '=' ? v === want : false) {
                hit = rule; exact = true;
                if (pm[3]) minPc = maxPc = want; else minAbs = maxAbs = want;
            } else if (exact) {
                /* already found best fit */
            } else if (rel === '<' || rel === '<=') {
                if (rel === '<' ? v < want : v <= want) {
                    if (pm[3] ? want <= minPc : want <= minAbs) {
                        hit = rule;
                        if (pm[3]) minPc = want; else minAbs = want;
                    }
                }
            } else if (rel === '>' || rel === '>=') {
                if (rel === '>' ? v > want : v >= want) {
                    if (pm[3] ? want >= maxPc : want >= maxAbs) {
                        hit = rule;
                        if (pm[3]) maxPc = want; else maxAbs = want;
                    }
                }
            }
        }
        const h = hit || always;
        if (!h) continue;
        /* C botl.c:715-724: HP/Pw and their parenthesized maxima are
         * separate fields; wintty.c:5216-5240 highlights each independently.
         * Keep the maximum above for percentage thresholds, not for paint. */
        const fieldText = (label === 'HP:' || label === 'Pw:')
            ? text.split('(')[0] : label === 'Xp:' ? text.split('/')[0] : text;
        for (let c = start; c < start + fieldText.length; c++)
            cells.set(c, h);
    }
    /* C botl.c:1575-1619 only delivers a new field color on update_all,
     * a value change, or temporary-hilite expiry.  Enabling hilite_delta
     * alone does not resend unchanged fields.  Keep the tty's delivered
     * colors even when a later render has a different set of rules. */
    const delivered = (game._statusFieldColors ||= {});
    const result = new Map();
    /* the title field heads the first status row only (row 2 starts at Dlvl:) */
    if (titleHl && /\bSt:\d/.test(row))
        for (let c = 0; c < 30; c++) result.set(c, titleHl);
    for (const [field, label] of Object.entries(_HL_FIELD_LABEL)) {
        const fm = new RegExp(`(?:^| )(${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\S*)`).exec(row);
        if (!fm) continue;
        const text = fm[1], start = fm.index + fm[0].length - text.length;
        let saved = delivered[field];
        if (!saved || saved.text !== text) {
            const colors = [];
            for (let i = 0; i < text.length; i++)
                colors.push(cells.get(start + i));
            saved = delivered[field] = { text, colors };
        }
        for (let i = 0; i < saved.colors.length; i++)
            if (saved.colors[i]) result.set(start + i, saved.colors[i]);
    }
    /* C botl.c BL_TITLE: an 'always' rule colours the whole padded title field
     * (wintty.c:5213-5234), i.e. up to the space that leads the St: field. */
    /* C botl.c BL_TITLE (always rule): the title field is the leading text up
     * to the St: field, painted with its padding (wintty.c emits the colour
     * around "Dox the Rambler" and the following \e[15C). */
    for (const spec of game.status_field_hilites || []) {
        const parts = spec.split('/');
        if (status_fieldname(parts[0].trim()) !== 'title') continue;
        const end = row.indexOf(' St:');
        if (end <= 0) continue;
        for (let i = 1; i + 1 < parts.length; i += 2) {
            if (parts[i].trim().toLowerCase() !== 'always') continue;
            const [colName, ...attrNames] = parts[i + 1].trim().split(/[&+]/);
            const color = match_str2clr(colName.trim(), true);
            if (color >= 16) continue;
            const attr = attrNames.reduce((a, n) => a | (_HL_ATTR[n.trim().toLowerCase()] ?? 0), 0);
            for (let c = 0; c < end; c++) result.set(c, { color, attr });
            break;
        }
    }
    // Hunger has its own text/value matcher; temporary rules run afterwards.
    for (const [c, h] of _status_hunger_hilites(row)) result.set(c, h);
    return result;
}
/* C botl.c:2052-2085 exp_percentage(), using the painted level and points.
 * percentage() preserves a nonzero numerator as 1% after truncation, and the
 * last point before a level gain is treated as 100%. */
function _status_exp_percentage(row) {
    const m = /Xp:(\d+)\/(\d+)/.exec(row);
    if (!m || +m[1] >= 30) return 0;
    const level = +m[1], start = newuexp(level - 1);
    const value = BigInt(m[2]) - start;
    const max = newuexp(level) - start;
    if (value === max - 1n) return 100;
    const pc = Number(100n * value / max);
    return pc === 0 && value !== 0n ? 1 : pc;
}
/* C botl.c:1514-1584,2280-2305,2446-2458: BL_TH_UPDOWN rules (up/down/changed)
 * on the gold and experience-points fields.  A changed value picks the rule
 * by sign of the change, stamps time = moves + hilite_delta, and the highlight
 * holds until moves passes that time (hilite_reset_needed, botl.c:2271).
 * The first sighting of a value is the baseline (update_all => chg 0). */
function _status_temp_hilites(row, cells) {
    if (!game.iflags?.hilite_delta) return;
    const hist = (game._blTemp ||= {});
    const fields = [
        ['gold', /\$:(\d+)/, (m) => [m.index, m[0].length]],
        ['experience', /Xp:\d+\/(\d+)/, (m) => [m.index + m[0].length - m[1].length, m[1].length]],
    ];
    for (const [fname, re, span] of fields) {
        const m = re.exec(row);
        if (!m) continue;
        const val = +m[1];
        const pc = fname === 'experience' ? _status_exp_percentage(row) : 0;
        const h = hist[fname] ||= { val, percent: pc, rule: null, time: 0 };
        let chg = val < h.val ? -1 : val > h.val ? 1 : 0;
        /* C botl.c:1523-1541: BL_EXP is percent_matters even for up/down
         * rules. A changed percentage overrides the points' direction; only
         * BL_XP restores the raw-value direction (1592-1595). */
        if (chg && fname === 'experience') {
            if (pc !== h.percent) chg = pc < h.percent ? -1 : 1;
            h.percent = pc;
        }
        if (chg) {
            let rule = null, changed = null;
            for (const spec of game.status_field_hilites || []) {
                const parts = spec.split('/');
                if (status_fieldname(parts[0].trim()) !== fname) continue;
                for (let i = 1; i + 1 < parts.length; i += 2) {
                    const thr = parts[i].trim().toLowerCase();
                    const [colName, ...attrNames] = parts[i + 1].trim().split(/[&+]/);
                    const color = match_str2clr(colName.trim(), true);
                    if (color >= 16) continue;
                    const attr = attrNames.reduce((a, n) => a | (_HL_ATTR[n.trim().toLowerCase()] ?? 0), 0);
                    if ((chg < 0 && thr === 'down') || (chg > 0 && thr === 'up')) rule = { color, attr };
                    else if (thr === 'changed') changed = { color, attr };
                }
            }
            rule ||= changed;
            h.rule = rule;
            h.expired = null;
            if (rule && h.lastPaintMoves != null
                && h.lastPaintMoves < (game.moves | 0)) {
                h.time = (game.moves | 0) + game.iflags.hilite_delta;
                h.chg = false;
            } else {
                h.chg = true;
            }
            h.val = val;
        }
        h.lastPaintMoves = game.moves | 0;
        const tm = /\sT:(\d+)/.exec(row);
        const rowMoves = tm ? +tm[1] : (game.moves | 0);
        if (h.rule && h.time && !game.multi && h.time < (game.moves | 0)) {
            h.expired = { rule: h.rule, time: h.time };
            h.rule = null; h.time = 0; h.chg = true;
        }
        const shown = h.rule
            || (h.expired && rowMoves <= h.expired.time ? h.expired.rule : null);
        if (!shown) continue;
        const [st, len] = span(m);
        for (let c = st; c < st + len; c++) cells.set(c, shown);
    }
}
function _status_condition_hilites(row) {
    const cells = new Map();
    const fields = _status_field_hilites(row);
    // C wintty.c:5080-5097,5213-5234: zero disables conditions and fields.
    if (!game.iflags?.hilite_delta) return cells;
    for (const spec of game.status_condition_hilites || []) {
        if (status_fieldname(spec.split('/')[0]) !== 'condition') continue;
        const m = /^[^/]+\/([^/]+)\/([^&]*)(?:&(.*))?$/i.exec(spec);
        if (!m) continue;
        const color = match_str2clr(m[2].trim(), true);
        if (color >= 16) continue; /* CLR_MAX: unknown colour name, C rejects the rule */
        const attr = _HL_ATTR[(m[3] || 'normal').trim().toLowerCase()] ?? 0;
        /* C botl.c parse_condition(): "Conf+Stun+Hallu" is a bitmask of conditions,
         * each highlighted when set. */
        for (const cname of m[1].split('+')) {
            const at = new RegExp(` (${cname.trim()})(?= |$)`).exec(row);
            if (!at) continue;
            for (let c = at.index + 1; c < at.index + 1 + cname.trim().length; c++)
                cells.set(c, { color, attr });
        }
    }
    for (const [c, h] of fields) cells.set(c, h);
    _status_temp_hilites(row, cells);
    return cells;
}
/* C botl.c:749-770 condition_aliases[], as bitmasks over the botl.c:781-815
 * conditions[] table order that options.js keeps in COND_NAMES. */
const _COND_ALIAS_BITS = [
    ['strangled', 'Strngl'],
    ['all', null],
    ['major_troubles', 'FoodPois Grab InLava Slime Stone Strngl TermIll'],
    ['minor_troubles', 'Blind Conf Deaf Hallu Parlyz Stun Submrg'],
    ['movement', 'Lev Fly Ride'],
    ['opt_in', 'Bare Busy Glow Held Icy Parlyz Zzz Slip Submrg Teth Trap Out WLegs UHold'],
].map(([id, names]) => [id, (names === null ? COND_NAMES : names.split(' '))
    .reduce((m, n) => m | (1 << COND_NAMES.indexOf(n)), 0)]);
/* C botl.c:3167-3201 match_str2conditionbitmask(): canonical conditions[].text[0]
 * names first (fuzzymatch over " -_", case-insensitive), then whole aliases,
 * then alias prefixes; every match ORs into the mask. */
function _str2condbits(str) {
    const fz = (t) => t.toLowerCase().replace(/[ \-_]/g, '');
    const f = fz(str);
    if (!f) return 0;
    let mask = 0, hits = 0;
    COND_NAMES.forEach((nm, i) => { if (fz(nm) === f) { mask |= 1 << i; hits++; } });
    if (!hits) for (const [id, bm] of _COND_ALIAS_BITS)
        if (fz(id) === f) { mask |= bm; hits++; }
    if (!hits) for (const [id, bm] of _COND_ALIAS_BITS)
        if (id.toLowerCase().startsWith(str.toLowerCase())) mask |= bm;
    return mask;
}
/* C botl.c:3144-3166 conditionbitmask2str(): conditions[].text[0] names in
 * table order joined by '+', replaced wholesale by the LAST alias (the i=1
 * start skips "strangled") whose bitmask equals the value. */
function _condbitmask2str(bm) {
    let alias = null;
    for (let i = 1; i < _COND_ALIAS_BITS.length; i++)
        if (_COND_ALIAS_BITS[i][1] === bm) alias = _COND_ALIAS_BITS[i][0];
    const names = COND_NAMES.filter((nm, i) => bm & (1 << i));
    return names.length && alias ? alias : names.join('+');
}
/* C botl.c:3243-3373 parse_condition(): a condition rule is kept not as text
 * but as bits in the gc.cond_hilites[] array — one slot per color index
 * 0..CLR_MAX-1 and six attribute slots HL_ATTCLR_BOLD..HL_ATTCLR_INVERSE
 * (= CLR_MAX+2 .. CLR_MAX+7, botl.h:241-247; CLR_MAX is 16, color.h:30) — so
 * "normal"/"none" (ATR_NONE) stores no bit and only clears the attribute
 * slots.  Rebuilt here from the specs options.js kept, for the serializer. */
const _ATR_COND_SLOT = { 1: 18, 2: 19, 3: 20, 4: 21, 5: 22, 7: 23 };
function _cond_hilites_array() {
    const ch = new Array(24).fill(0);
    const fz = (t) => t.toLowerCase().replace(/[ \-_]/g, '');
    for (const spec of game.status_condition_hilites || []) {
        const t = spec.split('/');
        for (let i = 1; i + 1 < t.length; i += 2) {
            let cond = 0;
            for (const sub of t[i].split(/[+&]/)) cond |= _str2condbits(sub);
            if (!cond) continue;
            let clr = 8; /* NO_COLOR, color.h:22 */
            for (const sf of t[i + 1].split(/[&+]/)) {
                const a = attrnames.find((x) => x.name && fz(x.name) === fz(sf));
                if (!a) {
                    const k = match_str2clr(sf, true);
                    if (k < 16) clr = k;
                } else if (a.attr) ch[_ATR_COND_SLOT[a.attr]] |= cond;
                else for (let s = 18; s < 24; s++) ch[s] &= ~cond;
            }
            ch[clr] |= cond;
        }
    }
    return ch;
}
/* C botl.c:3487-3566 status_hilite_linestr_gather_conditions(): one
 * "condition/<names>/<color>&<attr>" line per DISTINCT color/attribute, the
 * conditions regrouped in conditions[] order into first-free slots.  The
 * attribute half always serializes: hlattr2attrname() (botl.c:3370) treats
 * HL_NONE (0x01, botl.h:252) as a real bit and returns "normal", so a rule
 * with no attribute paints "&normal". */
export function gather_condition_hilite_lines() {
    const ch = _cond_hilites_array();
    const groups = [];
    for (let i = 0; i < COND_NAMES.length; i++) {
        const bit = 1 << i;
        let clr = 8 /* NO_COLOR */, atr = 1 /* HL_NONE */;
        for (let j = 0; j < 16; j++)
            if (ch[j] & bit) { clr = j; break; }
        for (let s = 18; s < 24; s++)
            if (ch[s] & bit) atr |= 1 << (s - 17); /* HL_BOLD..HL_INVERSE */
        if (atr !== 1) atr &= ~1;
        if (clr === 8 && atr === 1) continue; /* neither color nor attribute */
        const ca = clr | (atr << 8);
        const g = groups.find((x) => x.bm && x.ca === ca);
        if (g) g.bm |= bit;
        else groups.push({ bm: bit, ca });
    }
    return groups.map(({ bm, ca }) => {
        let clrbuf = (clr2colorname(ca & 0xff) || '').replace(/ /g, '-');
        const atr = ca >> 8;
        clrbuf += '&' + (atr === 1 ? 'normal'
            : ['bold', 'dim', 'italic', 'underline', 'blink', 'inverse']
                .filter((n, k) => atr & (2 << k)).join('+'));
        return `condition/${_condbitmask2str(bm)}/${clrbuf}`;
    });
}
/* The screen text carries the highlight as SGR (tty term_start_attr/term_end):
 * C emits \e[33mStun\e[39m for a brown Stun rule and \e[7;93m for an
 * inverse yellow strength rule (attr codes first, then the colour).  Grid
 * cells are written from the plain row, so only the text output is decorated. */
function _status_sgr_open(h) {
    const codes = [];
    if (h.attr & ATR_INVERSE) codes.push(7);
    if (h.attr & ATR_BOLD) codes.push(1);
    codes.push(ANSI_COLOR[h.color] ?? ANSI_DEFAULT);
    return `\x1b[${codes.join(';')}m`;
}
export function _status_sgr(raw) {
    /* C botl.c writes the fields after a cursor-forward (\e[nC) to the next
     * column; the grid paint path reads the row with those moves as blanks, so
     * the hilite match and its columns must see the same blanks (a field whose
     * label follows \e[11C is otherwise not at a word start). */
    // tty_putstatusfield (wintty.c:4818) leaves cursor-forward gaps unpainted.
    // Expand them for field matching, then retain the original escape on output:
    // painting spaces here would give a hitpointbar's padding inverse pixels.
    const gaps = new Map();
    let shift = 0;
    const row = raw.replace(/\x1b\[(\d+)C/g, (code, n, offset) => {
        gaps.set(offset + shift, { code, length: +n });
        shift += +n - code.length;
        return ' '.repeat(+n);
    });
    const hl = _status_condition_hilites(row);
    if (!hl.size) return raw;
    /* term_end_attr: an attribute run closes with \e[0m (C's "St:18/02\e[0m"),
     * a colour-only run with \e[39m (C's "\e[35mIn:8\e[39m"). */
    const _close = (h) => `\x1b[${h.attr ? 0 : ANSI_DEFAULT}m`;
    let out = '', cur = null;
    for (let c = 0; c < row.length; c++) {
        const h = hl.get(c) ?? null;
        if (h?.color !== cur?.color || h?.attr !== cur?.attr) {
            if (cur) out += _close(cur);
            if (h) out += _status_sgr_open(h);
            cur = h;
        }
        const gap = gaps.get(c);
        if (gap) {
            out += gap.code;
            c += gap.length - 1;
        } else out += row[c];
    }
    return cur ? out + _close(cur) : out;
}
/* C botl.c:974-975,1261-1274,1774-1779: the two BL_TERRAIN buffers
 * start with index zero and empty text.  In particular, restoring a game
 * does not classify terrain until terrain_typ is invalidated or changes.
 * Keep this process-local cache in iflags, which savegamestate omits. */
function _terrain_status_text(paint = false, pending = false) {
    const f = game.iflags ||= {};
    const cache = f._blTerrain ||= {
        idx: 0, fields: [{ typ: 0, text: '' }, { typ: 0, text: '' }],
    };
    if (paint || pending) {
        const idx = 1 - cache.idx;
        /* A snapshot of a flagged flush previews its bot() without
         * advancing the buffers a second time when bot() actually runs. */
        const field = paint ? cache.fields[idx] : { ...cache.fields[idx] };
        if (paint) cache.idx = idx;
        if (game.flags?.terrainstatus) {
            const typ = f.terrain_typ === MAX_TYPE ? classifyTerrain()
                : (f.terrain_typ | 0);
            if (field.typ !== typ) {
                field.typ = typ;
                field.text = TERRAIN_DESCR[typ] || '';
            }
        } else {
            field.typ = MAX_TYPE;
            field.text = '';
        }
        return field.text;
    }
    return cache.fields[cache.idx].text;
}
function _statusExtras(split = false) {
    const parts = [];
    if (game.flags?.weaponstatus) {
        /* A paged --More-- holds the weapon field of its flush's bot() paint:
         * eatspecial's "delicious!" page precedes uwepgone() (eat.c:2471). */
        const text = (game._inMovemonMore && game._paintedSnapshot?.botl?.weapon != null)
            ? game._paintedSnapshot.botl.weapon : weapon_status();
        parts.push(['weapon', ` ${text}`]);
    }
    /* BL_ARMOR (botl.c:1256) is likewise a bot()-time field: a paged --More--
     * keeps the armor string of its own flush's bot() paint (pray.c:661-666
     * disintegrates the cloak while the god's messages page). */
    if (game.flags?.armorstatus) {
        const text = (game._inMovemonMore && game._paintedSnapshot?.botl?.armor != null)
            ? game._paintedSnapshot.botl.armor : armor_status();
        parts.push(['armor', ` ${text}`]);
    }
    /* C botl.c:1261-1274 BL_TERRAIN, last of the extra fields. */
    if (game.flags?.terrainstatus) {
        /* A more() keeps the terrain field painted by bot(), even if
         * set_uinwater() has since classified a different terrain. */
        const frozen = game._inMovemonMore ? game._paintedSnapshot?.botl
            : ((game.u?.uhp | 0) === -1 || game._botlFrozenDeath
               || game._botlHeldEat || game._botlPaintHeld)
                ? game._lastPaintedBotl : null;
        const d = frozen?.terrainText ?? _terrain_status_text();
        parts.push(['terrain', d ? ` ${d}` : '']);
    }
    return split ? parts : parts.map(([, text]) => text).join('');
}
/* C botl.c:863-915 terrain_descr[] */
const TERRAIN_DESCR = ['Stone', ...Array(11).fill('Wall'), 'Portcullis', 'Tree',
    'Wall', 'Stone', 'Pool', 'Moat', 'Water', '(gap)', 'Lava', 'LavaWall', 'Bars',
    'Doorway', 'Corridor', 'Room', 'Stairs', 'Ladder', 'Fountain', 'Throne', 'Sink',
    'Grave', 'Altar', 'Ice', 'Bridge', 'Air', 'Cloud', '', 'Wall', 'Floor', 'Ground',
    'Open-door', 'Shut-door', 'Swamp', 'Submerged', 'Sea', 'WaterWall'];
/* C wintty.c:4289-4298 threelineorder: row 1 Title+attrs, row 2 Align Gold HP Pw
 * AC Xp Hunger Cap, row 3 Leveldesc Time Conditions. */
/* A --More-- page pinned by a pline flush keeps the physical third status row
 * of that flush (wintty.c:5251 leaves the row alone until the next render). */
function _status_rows3_pinned() {
    const r = _statusRows3();
    const pinned = game._inMovemonMore ? game._paintedSnapshot?.botl?.row3 : undefined;
    return pinned != null && r[2] !== '' ? [r[0], r[1], pinned] : r;
}
export function _statusRows3() {
    const p = _statusLine2Parts();
    const l1 = _statusLine1();
    if (p === null)
        return ['', '', ''];
    const ai = l1.lastIndexOf(' ');
    const align = l1.slice(ai + 1);
    /* C tty_putstatusfield() moves the cursor over the trailing blanks of the
     * inverse title (ESC[nC): they are not painted, so keep the sequence. */
    const row1 = l1.slice(0, ai);
    /* C wintty.c:4296 threelineorder row 3: LEVELDESC TIME CONDITION WEAPON
     * ARMOR TERRAIN VERS — the optional fields follow the conditions. */
    const row2 = `${align} ${p.mid}${p.hunger}`;
    const extras = _statusExtras(true);
    if (extras.length) return [row1, row2, _statusRow3(p, row1, row2, extras)];
    /* With no equipment/terrain fields, retain the ordinary width fitting
     * and version placement after indenting the condition field. */
    const front = `${p.desc}${p.time}`;
    if (p.conds) {
        const x = front.length + 1, hungerX = row2.length - p.hunger.length + 1;
        const start = x < hungerX && hungerX + p.conds.length < 79
            ? hungerX : x + p.conds.length < 79 ? 80 - p.conds.length : x;
        if (start > x)
            return [row1, row2, status_row_finish(front.padEnd(start - 1, ' ') + p.conds)];
    }
    return [row1, row2, status_row_finish(`${front}${p.conds}`)];
}
function _statusRow3(p, row1, row2, extras) {
    const seq = game._botlPaintSeq | 0;
    const st = game._st3 ||= { fields: {}, row: '', seq: -1 };
    const reset = st.seq !== seq && !!game.disp?.botlx;
    const fields = [['desc', p.desc], ['time', p.time], ['conditions', p.conds],
        ...extras];
    if (game.flags?.showvers) fields.push(['version', ` ${status_version_text()}`]);
    const signature = JSON.stringify([row1, row2, fields]);
    if (signature === st.signature && !reset) { st.seq = seq; return st.row; }
    const force = reset || !st.signature;
    let col = 0, updateRight = false;
    const measured = fields.map(([id, text]) => {
        const prev = st.fields[id];
        let redraw = false;
        if (!prev || col + text.length !== prev.x + prev.text.length)
            updateRight = true;
        else if (text.length !== prev.text.length || col !== prev.x)
            redraw = true;
        else
            updateRight = false;
        redraw ||= force || updateRight || !prev || text !== prev.text;
        const field = { id, text, x: col, redraw };
        col += text.length;
        return field;
    });
    let row = st.row, finalx = 0;
    const put = (x, text) => {
        row = row.padEnd(x + text.length, ' ');
        row = row.slice(0, x) + text + row.slice(x + text.length);
    };
    for (const f of measured) {
        let x = f.x;
        if (f.redraw) {
            if (f.id === 'conditions' && f.text) {
                const hungerX = row2.length - p.hunger.length;
                const start = x < hungerX && hungerX + f.text.length < 78
                    ? hungerX : x + f.text.length < 78 ? 80 - f.text.length - 1 : x;
                if (start > x) { put(x, ' '.repeat(start - x)); x = start; }
                f.x = x;
            } else if (f.id === 'version') {
                /* wintty.c:5185-5210: version is right justified; only a
                 * directly preceding condition supplies its indented end. */
                const prev = measured[measured.indexOf(f) - 1];
                if (prev?.id === 'conditions') x = prev.x + prev.text.length;
                const start = 79 - f.text.length;
                if (start > x) { put(x, ' '.repeat(start - x)); x = start; }
                f.x = x;
            }
            put(x, f.text);
        }
        finalx = x + f.text.length;
        st.fields[f.id] = { x: f.x, text: f.text };
    }
    /* wintty.c:5251-5255: erase the tail only when finalx shrinks. */
    if (!st.finalx || finalx < st.finalx) row = row.slice(0, finalx);
    st.finalx = finalx;
    st.seq = seq;
    st.signature = signature;
    st.row = row.slice(0, 79).trimEnd();
    return st.row;
}
export function _threeStatusLines() {
    /* C options.c optfn_statuslines sets iflags.wc2_statuslines; js/options.js
     * does not parse it yet (out-of-file), so until it does fall back to the
     * last OPTIONS statuslines:N of the startup rc, which is what C read. */
    const f = game?.iflags?.wc2_statuslines;
    if (f)
        return (f | 0) === 3;
    if (game._statuslines_rc === undefined) {
        const m = [...String(game._nethackrc || '').matchAll(/statuslines\s*:\s*(\d)/g)].pop();
        game._statuslines_rc = m ? (+m[1] === 3) : false;
    }
    return game._statuslines_rc;
}
/* Flying (youprop.h:253) as the status line tests it. */
function _live_flying() {
    const u = game.u, fp = u?.uprops?.[FLYING];
    return !!((fp?.intrinsic | 0) || (fp?.extrinsic | 0)
              || (u?.usteed && ((u.usteed.data?.mflags1 | 0) & 0x00000001 /* M1_FLY */)))
        && !(fp?.blocked | 0);
}
function _busy_condition() {
    if (!game.flags?.cond_busy || (game.multi | 0) >= 0) return false;
    const reason = game.multi_reason || '';
    const unconsc = !!game.flags?.cond_unconscious && !!game.nomovemsg
        && !game.u?.usleep && unconscious();
    const parlyz = !!game.flags?.cond_paralyzed
        && (reason.startsWith('paralyzed') || reason.startsWith('frozen'));
    const asleep = !!game.flags?.cond_sleep && !!game.u?.usleep;
    return !unconsc && !parlyz && !asleep;
}
function _live_lev(u) {
    const lp = u && u.uprops && u.uprops[LEVITATION];
    return !!lp && !!((lp.intrinsic | 0) || (lp.extrinsic | 0)) && !(lp.blocked | 0);
}
export function botl_status_suffix(uhs, cap, blindFrozen, deafFrozen, stunFrozen,
                                   halluFrozen, confFrozen, flyFrozen, sickTypeFrozen, levFrozen,
                                   slimedFrozen, inLavaFrozen, wLegsFrozen, strangledFrozen, busyFrozen, grabFrozen, stonedFrozen, rideFrozen) {
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
    /* C ref: botl.c:1149-1153,1198-1200 + conditions[] (botl.c:789-807): the
     * rank-4 and rank-6 conditions sort ahead of every rank-10 one in cond_cmp
     * (botl.c:1332): Strngl(4), then rank 6 alphabetical by useroption —
     * foodpois, slime, stone, termIll.  Sick is HSick-intrinsic (youprop.h:108)
     * split by u.usick_type; Stoned/Slimed/Strangled are the intrinsic words. */
    {
        const ip = (p) => !!(u.uprops?.[p]?.intrinsic | 0);
        /* C ref: botl.c:792 conditions[] bl_grab ranking 2 (sorts first) and
         * botl.c:1164-1188: with u.ustuck and !u.uswallow and not a
         * Upolyd sticks() form, Grab == (u.ustuck->data->mlet == S_EEL). */
        if ((grabFrozen !== undefined) ? grabFrozen
            : (u.ustuck && !u.uswallow
               && !(((u.umonnum | 0) !== (u.umonster | 0)) && sticks(game.youmonst?.data))
               && (u.ustuck.data?.mlet | 0) === 57 /* S_EEL */))
            s += ' Grab';
        /* `strangledFrozen` is the value bot() painted at a frozen --More-- pline,
         * threaded in like slimedFrozen; undefined for every other render. */
        if ((strangledFrozen !== undefined) ? strangledFrozen : ip(STRANGLED)) s += ' Strngl';
        /* `sickTypeFrozen` is the usick_type bits bot() had painted at a frozen
         * --More-- pline (0 when not sick); undefined reads the live state.
         * make_sick (potion.c:292-302) plines "You feel deathly sick" BEFORE it
         * sets Sick and SET_BOTL()s, so the earlier engulf --More-- page keeps
         * the status line without TermIll. */
        const sick = (sickTypeFrozen !== undefined) ? (sickTypeFrozen | 0) !== 0 : ip(SICK);
        const sty = (sickTypeFrozen !== undefined) ? (sickTypeFrozen | 0) : (u.usick_type | 0);
        if (sick && (sty & SICK_VOMITABLE)) s += ' FoodPois';
        if ((slimedFrozen !== undefined) ? slimedFrozen : ip(SLIMED)) s += ' Slime';
        if ((stonedFrozen !== undefined) ? stonedFrozen : ip(STONED)) s += ' Stone';
        if (sick && (sty & SICK_NONVOMITABLE)) s += ' TermIll';
    }
    /* C ref: botl.c:1156-1157 test_if_enabled(bl_inlava) = (u.utraptype == TT_LAVA)
     * when u.utrap; conditions[] ranking 8 (botl.c:796) sorts after rank 6, before 10. */
    if ((inLavaFrozen !== undefined) ? inLavaFrozen : (u.utrap && (u.utraptype | 0) === TT_LAVA))
        s += ' InLava';
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
    {
        const dp = u.uprops?.[DEAF];
        const deaf = (deafFrozen !== undefined) ? !!deafFrozen
            : !!((dp?.intrinsic | 0) || (dp?.extrinsic | 0) || (u.HDeaf | 0)
                 || (u.uroleplay && u.uroleplay.deaf));
        if (deaf)
            s += ' Deaf';
    }
    {
        const fp = u.uprops && u.uprops[FLYING];
        /* flyFrozen: the value the last bot() PAINTED — polymorph's set_uasmon
         * grants HFlying before the --More-- pline, whose flush does not repaint. */
        const flying = (flyFrozen !== undefined) ? flyFrozen
            : (!!((fp?.intrinsic | 0) || (fp?.extrinsic | 0)
                   /* youprop.h Flying: (u.usteed && is_flyer(u.usteed->data)) */
                   || (u.usteed && ((u.usteed.data?.mflags1 | 0) & 0x00000001 /* M1_FLY */)))
               && !(fp?.blocked | 0));
        if (flying)
            s += ' Fly';
    }
    {
        /* `halluFrozen` is the value bot() painted at a frozen --More-- pline,
         * threaded in the same way `stunFrozen` is; undefined for every other
         * caller, which uses the last status paint. */
        const hallucinating = (halluFrozen !== undefined) ? !!halluFrozen
            : (game._botlPaintedHallu ?? _hallucinating_dsp());
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

        /* levFrozen: the value bot() PAINTED at the frozen --More-- pline —
         * steal.c's seduce arm remove_worn_item()s the levitation boots
         * after its pline, so the page's status still says Lev. */
        const levitating = (levFrozen !== undefined) ? levFrozen
            : (game._botlPaintedLev ?? _live_lev(u));
        if (levitating)
            s += ' Lev';
    }
    /* C steed.c:657 clears u.usteed before its liquid-fall messages, but
     * flags botl only at :814.  display.c:2236 therefore retains the last
     * botl.c:1198 bl_ride paint during those messages. */
    if (rideFrozen ?? !!u.usteed)
        s += ' Ride';
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
    /* C botl.c:1198 test_if_enabled(bl_bareh) = (!uarmg && !uwep); rank 20
     * sorts after every rank<=15 condition above.  Enabled by cond_barehanded. */
    if (game.flags?.cond_barehanded
        && !_equipView().uarmg && !_equipView().uwep) {
        if (game._botlPreInv && (game.u.uarmg || game.u.uwep)) {
            if (_threeStatusLines()) s += '     ';
            else s += ' Bare';
        } else
            s += ' Bare';
    }
    if (busyFrozen !== undefined ? busyFrozen : _busy_condition())
        s += ' Busy';
    /* C botl.c:1154-1163: bl_tethered (opt_in) is u.utraptype == TT_BURIEDBALL;
     * bl_trapped (opt_in) is any other u.utrap, tethered/in-lava lumped in
     * only when their own condition is disabled.  Rank 20, after barehanded. */
    if (u.utrap) {
        const buried = (u.utraptype | 0) === TT_BURIEDBALL;
        const teth = !!game.flags?.cond_tethered && buried;
        if (teth) s += ' Teth';
        if (game.flags?.cond_trap && !teth && !((u.utraptype | 0) === TT_LAVA))
            s += ' Trap';
    }
    /* C botl.c:1208 test_if_enabled(bl_woundedl) = (Wounded_legs) (youprop.h:138
     * HWounded_legs || EWounded_legs); opt_in, rank 20, after Trap/Out. */
    if (game.flags?.cond_woundedlegs) {
        const wl = u.uprops && u.uprops[WOUNDED_LEGS];
        if ((wLegsFrozen !== undefined) ? wLegsFrozen
            : (wl && ((wl.intrinsic | 0) || (wl.extrinsic | 0))))
            s += ' WLegs';
    }
    return s;
}

/* The tty status compositor contracts condition labels when its 80-column
 * second line would overflow.  botl.c supplies the long/medium/short spellings
 * in conditions[]; apply the short spelling one condition at a time, in status
 * order, until the physical line fits. */
let _dlvlField = null; /* { src, cur }: status_vals[BL_LEVELDESC] across frames */
/* C wintty.c:4860-4868 shrink_enc(): BL_CAP becomes " " + encvals[lvl][enclev]
 * even when unencumbered (the empty word), so once a shrink pass has run a
 * lone extra blank (lth 1) sits between the fields before the conditions and
 * the first condition, until BL_CAP is re-sent. */
function _insertEncSpace(str) {
    const encRe = / (?:Burdened|Burden|Brd|Stressed|Stress|Strs|Strained|Strain|Strn|Overtaxed|Overtax|Ovtx|Overloaded|Overload|Ovld)(?= |$)/;
    if (encRe.test(str)) return str;
    const names = ['Grab','Grb','Gr','Stone','Ston','Sto','Slime','Slim','Slm','Strngl','Stngl','Str',
        'FoodPois','Fpois','Poi','TermIll','Ill','Blind','Blnd','Bl','Deaf','Def','Df','Stun','St',
        'Conf','Cnf','Cf','Hallu','Hal','Hl','Lev','Lv','Fly','Fl','Ride','Rid','Rd','Bare','Bar','Bh',
        'Busy','Bsy','By','Iron','Irn','Fe','Glow','Glo','Gl','Held','Hld','Hd','Icy','Ic','InLava','Lav','La',
        'Parlyz','Para','Par','Zzz','Zz','Slip','Slp','Sl','Submrg','Subm','Sm','Teth','Tth','Te',
        'Trap','Trp','Tr','Out','KO','WLegs','Leg','Lg','UHold','UHld','UHd'];
    const m = new RegExp(` (?:${names.join('|')})(?= |$)`).exec(str);
    return m ? `${str.slice(0, m.index)} ${str.slice(m.index)}` : str;
}
let _fitMemo = null; /* repeated identical renders of one frame must not re-run the shrink state */
export function fit_status_line_width(s, width = 79) {
    if (_fitMemo && _fitMemo.s === s && _fitMemo.width === width) return _fitMemo.out;
    const out = _fit_status_line_width(s, width);
    _fitMemo = { s, width, out };
    return out;
}
function _fit_status_line_width(s, width) {
    /* C wintty.c:4546-4547, 4594-4595, 4870-4884: BL_LEVELDESC is only
     * re-sent when its value changes (full-length, dlvl_shrinklvl = 0).
     * Otherwise make_things_fit() starts with shrink_dlvl(0), which rewrites
     * "Dl:n" -> "Dlvl:n" (and "Tutorial:n" has already become "Dlvl:n" once
     * shrunk), so the shrunken label never returns to "Tutorial". */
    const lm = /^(Dlvl|Tutorial|Dl):/.exec(s);
    if (lm) {
        const src = s.slice(0, s.indexOf(' ') < 0 ? s.length : s.indexOf(' '));
        const full = _dlvlField && _dlvlField.fresh === src ? _dlvlField : null;
        if (!full) _dlvlField = { src, fresh: src, cur: lm[1] };
        else if (_dlvlField.cur === 'Dl' && (_dlvlField.at !== (game._ff_last_input_frame | 0) || _dlvlField.lastIn !== s)) _dlvlField.cur = 'Dlvl';
        _dlvlField.lastIn = s; /* a changed status flush re-runs make_things_fit, which starts at shrink_dlvl(0) */
        if (_dlvlField.cur !== lm[1])
            s = _dlvlField.cur + s.slice(lm[1].length);
        if (_dlvlField.encSpace) s = _insertEncSpace(s);
    } else if (_dlvlField?.encSpace && s.length > width) {
        /* named-level rows ("Astral Plane") share the same BL_CAP blank: shrink_enc() set it
         * globally (wintty.c:4860-4868), so an overflowing row keeps it before truncation. */
        s = _insertEncSpace(s);
    }
    if (s.length <= width) return s;
    /* C wintty.c make_things_fit() advances cond_shrinklvl globally: it
     * retries the complete condition field at medium spelling, then at short
     * spelling.  Per-condition shortening changes the selected text and can
     * disagree even when only one condition is present (for example Blind ->
     * Blnd at the medium level). */
    const conditions = [
        ['Grab', 'Grb', 'Gr'], ['Stone', 'Ston', 'Sto'], ['Slime', 'Slim', 'Slm'],
        ['Strngl', 'Stngl', 'Str'], ['FoodPois', 'Fpois', 'Poi'],
        ['TermIll', 'Ill', 'Ill'], ['Blind', 'Blnd', 'Bl'],
        ['Deaf', 'Def', 'Df'], ['Stun', 'Stun', 'St'],
        ['Conf', 'Cnf', 'Cf'], ['Hallu', 'Hal', 'Hl'],
        ['Lev', 'Lev', 'Lv'], ['Fly', 'Fly', 'Fl'],
        ['Ride', 'Rid', 'Rd'],
        /* the rest of botl.c:781-815 conditions[] txt1/txt2/txt3 */
        ['Bare', 'Bar', 'Bh'], ['Busy', 'Bsy', 'By'], ['Iron', 'Irn', 'Fe'],
        ['Glow', 'Glo', 'Gl'], ['Held', 'Hld', 'Hd'], ['Icy', 'Icy', 'Ic'],
        ['InLava', 'Lav', 'La'], ['Parlyz', 'Para', 'Par'],
        ['Zzz', 'Zzz', 'Zz'], ['Slip', 'Slp', 'Sl'], ['Submrg', 'Subm', 'Sm'],
        ['Teth', 'Tth', 'Te'], ['Trap', 'Trp', 'Tr'], ['Out', 'Out', 'KO'],
        ['WLegs', 'Leg', 'Lg'], ['UHold', 'UHld', 'UHd'],
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
    let encBase = last;
    if (!_dlvlField?.encSpace) {
        encBase = _insertEncSpace(encBase);
        if (_dlvlField) _dlvlField.encSpace = encBase !== last;
    }
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
    /* C wintty.c:4628 / :4870-4884 shrink_dlvl(1): the third "other option"
     * rewrites the level label ("Dlvl:1", "Tutorial:1") to "Dl" + the text
     * from its ':' on. */
    {
        /* shrink_dlvl() searches only BL_LEVELDESC, not later fields such
         * as gold.  Named levels ("Home 3", "Air") have no colon to shrink. */
        const candidate = last.replace(/^(?:Dlvl|Tutorial|Dl):/, 'Dl:');
        if (_dlvlField && /^(Dlvl|Tutorial|Dl):/.test(last)) { _dlvlField.cur = 'Dl'; _dlvlField.at = game._ff_last_input_frame | 0; }
        if (candidate.length <= width)
            return candidate;
        last = candidate;
    }
    return last.length > width ? last.slice(0, width) : last;
}
// C win/tty/wintty.c:1401-1433: corner menus clear from offx, then
// paint their content one column to the right.  Preserve the base window
// outside that rectangle; a full-width menu clears the entire screen.
// `background` contains plain base-window rows, not the menu's own text.
export function tty_menu_overlay(frame, background, offx) {
    if (offx <= 0) background.fill('');
    const rows = frame.screen.split('\n');
    const height = rows.length;
    for (let r = 0; r < height; r++) {
        const prefix = (background[r] || '').slice(0, Math.max(0, offx));
        background[r] = prefix;
        // renderMenuAt encodes leading blanks as either spaces or CSI n C.
        const leading = rows[r].match(/^(?:\x1b\[(\d+)C|( +))/);
        const col = leading ? Number(leading[1] || leading[2].length) : 0;
        rows[r] = rows[r] ? prefix + ' '.repeat(Math.max(0, col - prefix.length))
            + rows[r].slice(leading?.[0].length || 0) : prefix;
    }
    for (let r = height; r < background.length; r++) rows[r] = background[r];
    while (rows.length && !rows.at(-1).trim()) rows.pop();
    return { ...frame, screen: rows.join('\n'), dismiss() {
        // C erase_menu_or_text:982 -> docorner:3684-3687. BASE_WINDOW's
        // cursor is one-based, so dismissal also erases column offx - 1
        // and one row below the menu (cw->maxrow + 1).
        for (let r = 0; r <= height && r < background.length; r++)
            background[r] = background[r].slice(0, Math.max(0, offx - 1));
    } };
}

// C tty_askname writes on BASE_WINDOW; it does not repaint the banner.
export function tty_base_window_prompt(background, row, text, cursor) {
    background[row] = text;
    return { screen: background.join('\n'), cursor };
}

/* C restore.c:1536-1638 restore_menu(), called by wintty.c:658 tty_askname.
 * This is a BASE_WINDOW menu: there is no map or status window to repaint
 * underneath it.  Read the same VFS save files that dorecover will consume;
 * save.c:998-1018 stores the current gender/alignment in the menu label. */
export async function tty_restore_menu() {
    const { vfsListFiles, vfsReadFile } = await import('./storage.js');
    const { saved_state_for } = await import('./save.js');
    const { roles, races, genders, aligns } = await import('./roles.js');
    const { TtyMenu, ATR_NONE } = await import('./tty_menu.js');
    const { COPYRIGHT_BANNER_A, COPYRIGHT_BANNER_B, COPYRIGHT_BANNER_D } = await import('./const.js');
    const { PORT_ID } = await import('./platform_identity.js');
    const saves = [];
    for (const path of vfsListFiles('save/')) {
        const state = saved_state_for(vfsReadFile(path));
        if (!state) continue;
        const flags = state.flags, u = state.u;
        const label = [state.plname, roles[flags.initrole].filecode,
            races[flags.initrace].filecode, genders[+!!flags.female].filecode,
            aligns[1 - u.ualign.type].filecode].join('-');
        saves.push({ plname: state.plname, label,
            mode: flags.debug ? 'D' : flags.explore ? 'X' : '-' });
    }
    if (!saves.length) return null;
    // C files.c:1528-1530 sorts the saved character descriptions with strcmp.
    saves.sort((a, b) => a.label < b.label ? -1 : a.label > b.label ? 1 : 0);
    const allNormal = saves.every(save => save.mode === '-');
    const menu = new TtyMenu({ overlay: true, baseWindow: true });
    for (const line of [COPYRIGHT_BANNER_A, COPYRIGHT_BANNER_B,
        `         Version 5.0.0 ${PORT_ID}, built May  2 2026 12:00:00.`,
        COPYRIGHT_BANNER_D, '', 'Select one of your saved games']) menu.add_menu_str(line);
    saves.forEach((save, i) => menu.add_menu(i + 1, 0, ATR_NONE,
        allNormal ? save.label : `${save.mode} ${save.label}`));
    // Saved descriptions have MENU_ITEMFLAGS_SKIPMENUCOLORS (restore.c:1591).
    menu.mlist.forEach(item => { item.menuColor = null; });
    const newKey = saves.length <= 13 ? 'n' : saves.length <= 39 ? 'N' : 0;
    const quitKey = saves.length + 1 <= 16 && newKey === 'n' ? 'q'
        : saves.length + 1 <= 42 && newKey === 'N' ? 'Q' : 0;
    menu.add_menu(-1, newKey, ATR_NONE, 'Start a new character');
    menu.mlist.at(-1).groupSelector = 'N';
    menu.add_menu(-2, quitKey, ATR_NONE, 'Never mind (quit)', false, true);
    menu.mlist.at(-1).groupSelector = 'Q';
    menu.end_menu(null);
    const selected = await menu.select_menu(PICK_ONE);
    const choice = selected.picks[0];
    return choice > 0 ? { plname: saves[choice - 1].plname }
        : { quit: choice !== -1, background: [COPYRIGHT_BANNER_A, '', ''] };
}

/* A getlin over a menu writes incrementally; rebuilding its single topline
 * loses both topl_putsym's wrap and the menu rows that wrap erased.
 * C refs: win/tty/topl.c:305-355; getline.c:143-207 (no completion hook). */
export function tty_getlin_prompt(query) {
    const painted = new Map();
    let x = 0, y = 0;
    const append = (text) => {
        for (const ch of text) {
            if (ch === '\b') {
                // tty_curs(BASE_WINDOW, CO, cury - 1), then backsp().
                if (x === 0 && y > 0) { x = TOPL_CO - 1; y--; }
                x--;
                continue;
            }
            if (ch === '\n' || x === TOPL_CO - 1) {
                painted.set(y, (painted.get(y) || '').slice(0, x));
                x = 0;
                painted.set(++y, ''); // cl_end() on the newly entered row
                if (ch === '\n') continue;
            }
            const row = (painted.get(y) || '').padEnd(x, ' ');
            painted.set(y, row.slice(0, x) + ch + row.slice(x + 1));
            x++;
        }
    };
    const reset = () => {
        // clear_nhwindow(WIN_MESSAGE): home/cl_end, then docorner for the
        // current message height (wintty.c:1047-1056), restoring map rows.
        for (let r = 1; r <= y; r++) painted.set(r, render_map_row(r - 1));
        x = y = 0;
        painted.set(0, '');
        append(query + ' ');
    };
    reset();
    return { append, reset, rowsWrapped: () => y,
        erase(count) { while (count-- > 0) append('\b \b'); },
        render(background, recall = null) {
            const rows = background.slice();
            for (const [r, text] of painted) rows[r] = _toplStr(text);
            if (recall !== null) rows[0] = recall;
            return { screen: rows.join('\n'), cursor: recall !== null
                ? [recall.length, 0] : [x, y] };
        },
    };
}

// Before newgame(), messages share the copyright/name base window rather
// than the map.  Keep their topline and pager on that same window.  C refs:
// topl.c:251-301 update_topl(), :209-247 more(); wintty.c:1920-1921 pages
// a pending message before displaying a selection menu.
export function tty_base_window_messages(background, read) {
    let text = '', previous = '', stopped = false, pending = false;
    const remember = () => {
        if (text) _msg_history_arr().push(text);
    };
    async function more() {
        if (!pending) return;
        const rows = _topl_wordwrap(text, TOPL_CO - 1);
        if (rows.at(-1).length >= TOPL_CO - TOPL_MORE.length) rows.push('');
        const last = rows.length - 1;
        // C: more() wraps TOPL_MORE in standoutbeg/standoutend (topl.c:224-228), but
        // SO/SE are empty under the recorded terminal, so --More-- is plain even
        const indicator = TOPL_MORE;
        const screen = [...background];
        rows.forEach((line, row) => { screen[row] = line + (row === last ? indicator : ''); });
        for (;;) {
            const key = await read(screen.join('\n'), [rows[last].length + TOPL_MORE.length, last, 1]);
            if (key === 27 || key === 32 || key === 10 || key === 13) {
                stopped = key === 27;
                break;
            }
        }
        remember();
        for (let row = 0; row <= last; row++) background[row] = '';
        text = '';
        pending = false;
    }
    async function put(message) {
        const type = msgtype_type(message);
        if (type === 'hide' || (type === 'norep' && previous === message)) return;
        previous = message;
        const skip = stopped;
        const joins = (pending || skip) && !text.includes('\n')
            && text.length + 2 + message.length < TOPL_LIMIT
            && !message.startsWith('You die');
        if (joins) text += '  ' + message;
        else {
            // update_topl samples WIN_STOP before its own more(), so the
            // message which raises that page is still drawn after Escape.
            if (!skip) await more();
            text = message;
        }
        if (!skip) {
            background[0] = text;
            pending = true;
            if (_topl_wordwrap(text, TOPL_CO - 1).length > 1) await more();
        }
        if (type === 'stop' && !stopped) await more();
    }
    return { put, finish: remember, async flush() {
        if (!pending) return;
        // WIN_STOP aliases WIN_CANCELLED (wintty.h:75-76), so the message
        // window's display returns immediately after an Escape.  The menu
        // still clears that topline before painting its own contents.
        if (!stopped) await more();
        else remember();
        background[0] = '';
        text = '';
        pending = false;
    } };
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
            output += ' '.repeat(Math.max(0, firstCol));
        for (let c = firstCol; c <= lastCol; c++)
            output += display.grid[r][c].ch;
        if (r < lastRow)
            output += '\n';
    }
    return output;
}
// Reconcile complete desired rows with the terminal's current cells. Reading
// the current grid also accounts for menus and other direct terminal writers.
function _paint_grid_row(display, row, mapCells, text = '', hilites = null) {
    if (row >= display.rows) return;
    const current = display.grid[row];
    const cols = display.cols;
    for (let c = 0; c < cols; c++) {
        let ch = ' ', color = CLR_GRAY, attr = 0;
        if (c < text.length) {
            if (text[c] === '\t') {
                /* topl_putsym('\n') clears the wrapped row (cl_end at curx 0). */
                if (row > 0) { display.setCell(c, row, ' ', CLR_GRAY, 0); continue; }
                const prior = game._topl_tab_background?.text === text
                    ? game._topl_tab_background.cells?.[row]?.[c] : current[c];
                if (prior) display.setCell(c, row, prior.ch, prior.color, prior.attr);
                continue;
            }
            const h = hilites?.get(c);
            ch = text[c]; color = h?.color ?? NO_COLOR; attr = h?.attr ?? 0;
        }
        const glyph = mapCells?.[c];
        if (glyph) { ch = glyph.ch; color = glyph.color; attr = glyph.attr; }
        const old = current[c];
        if (old.ch !== ch || old.color !== color || old.attr !== attr)
            display.setCell(c, row, ch, color, attr);
    }
}
function _live_grid_map_row(y) {
    const level = game.level;
    if (!level) return null;
    const paint = _map_paint_cache(level);
    const rows = paint.gridRows ??= [];
    let row = rows[y];
    if (!row || row.version !== paint.versions[y]) {
        row = { version: paint.versions[y], cells: [] };
        for (let x = 1; x < COLNO; x++) {
            const loc = level.at(x, y);
            if (!loc?.disp_ch || loc.disp_ch === ' ') continue;
            row.cells[x - 1] = {
                ch: loc.disp_decgfx ? (DEC_TO_UNICODE[loc.disp_ch] || loc.disp_ch) : loc.disp_ch,
                color: loc.disp_color ?? NO_COLOR, attr: loc.disp_attr ?? 0,
            };
        }
        rows[y] = row;
    }
    return row.cells;
}
// ── Build screen output ──
// C ref: win/tty/topl.c — the tty topline never paints trailing blanks to the
// terminal row, so the recorded row-0 message has trailing spaces stripped (the
// cursor column is tracked independently and is set by the getlin/render caller).
// Only trailing spaces are removed; embedded and leading spaces (prompt layout)
// are preserved.  A normal pline never ends in a space, so this is a no-op for
// every non-getlin frame; it only affects getlin echo of a typed trailing space.
// the 24x80 dump, row 0 included: a run of MORE THAN FOUR blank cells is emitted
// as a cursor-forward escape instead of literal spaces.  com_pager.js's map,
// menu and text-window builders already obey it at `gap > 4`; the topline did
// not, so any pline with a >=5-space interior gap rendered with literal spaces
// where C records "\x1b[nC" — dowhatdoes' "%-8s%s." key field is exactly that
// case ("i" + 7 blanks: C records "i\x1b[7Cshow your inventory (#inventory).",
// row-0 lines contain a literal run of >=5 spaces, so the rule is unconditional.
// Trailing blanks are stripped first (the tty never paints them; the cursor
// column is tracked independently and set by the getlin/render caller), so only
// INTERIOR gaps reach the encoder.
function _toplStr(msg, row = 0) {
    let s = String(msg || '');
    const CTRL_BYTE = /[\x01-\x09\x0b-\x0d\x10-\x1a\x1c-\x1f]/g;
    if (s.search(CTRL_BYTE) >= 0) {
        const background = game._topl_tab_background;
        const previous = String(background?.text === game._pending_message
            ? background.output : game._screen_output || '').split('\n')[row] || '';
        const cells = [];
        let col = 0, style = '';
        /* topl_putsym('\n') + cl_end() blank a wrapped row before it is written. */
        for (const token of row > 0 ? [] : previous.match(/\x1b\[[0-9;]*[A-Za-z]|[\s\S]/g) || []) {
            if (token.startsWith('\x1b[')) {
                if (token.endsWith('C')) col += parseInt(token.slice(2), 10) || 1;
                else if (token.endsWith('m')) style += token;
            } else if (token === '\x0e' || token === '\x0f') {
                style += token;
            } else {
                cells[col++] = `${style}${token}\x0f\x1b[0m`;
            }
        }
        const original = s;
        s = s.replace(CTRL_BYTE, (_, offset) => cells[_topl_visualLen(original.slice(0, offset))] || ' ');
    }
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
/* display_nhwindow(WIN_MESSAGE) can page before a deferred cls() clears
 * status (display.c:2196-2198). Keep that page's physical blankness with its
 * map/status snapshot. */
function _status_blank_after_docrt() {
    const snap = game._paintedSnapshot?.statusBlankAfterDocrt;
    return (game._inMovemonMore || snap !== undefined ? snap : undefined)
        ?? (game._statusBlankAfterDocrt === true);
}
/* hooked_tty_getlin sets ttyDisplay->inread before custompline paints its
 * prompt.  Core bot() processing is suppressed during that paint, so the two
 * physical status rows remain byte-for-byte what the terminal already held.
 * `_screen_output` is that physical frame; unlike `_lastPaintedBotl`, it also
 * includes paints produced by page dismissal and other terminal-only paths. */
function _prompt_physical_status_rows() {
    /* `_statusHeldPhysical`: cls()'s display_nhwindow(WIN_MESSAGE) more()
     * (display.c cls(), wintty.c:1873) runs no bot() either, so the status rows
     * hold their last paint (js/options_runtime.js reset_needed_visuals). */
    if (!game?._topl_prompt_echo && !game?._statusHeldPhysical)
        return null;
    /* A menu dismissal blanks the status windows before the following getlin;
     * `_screen_output` can still contain the menu which occupied those rows. */
    /* tty_menu.js sets _statusBlankAfterDocrt on a full-screen menu dismiss
     * (wintty.c:966-983 erase_menu_or_text -> docrt cls()); it holds until
     * the next bot() paint. */
    if (game._status_blanked || _status_blank_after_docrt())
        return _threeStatusLines() ? ['', '', ''] : ['', ''];
    /* end.c:1045-1075: done() paints status before zeroing HP. Deferred
     * message pages can subsequently serialize older status rows, but the
     * following getlin prompt retains done()'s paint. The normal renderers
     * read that paint from _lastPaintedBotl while _botlFrozenDeath is set. */
    if (game._topl_prompt_echo && !game._inMovemonMore
        && game._botlFrozenDeath && game._lastPaintedBotl)
        return null;
    if (!game._screen_output)
        return null;
    const rows = String(game._screen_output).split('\n');
    /* wintty.c:4289-4298: with statuslines:3 the physical status rows are
     * 21/22/23, so the held frame's third row is rows[21]. */
    if (_threeStatusLines())
        return rows.length >= 24 ? [rows[21], rows[22], rows[23]] : null;
    return rows.length >= 24 ? [rows[22], rows[23]] : null;
}
/* Repaint the physical frame after a display latch (the painted tutorial hero)
 * is released between a flush and the next key read. */
export function rebuild_screen_output() { _buildScreenOutput(); }
function _tty_row_cells(row) {
    const cells = [];
    let style = '', dec = false;
    for (const token of String(row || '').match(/\x1b\[[0-9;]*[A-Za-z]|[\x0e\x0f]|[^\x1b]/g) || []) {
        if (token.startsWith('\x1b[')) {
            if (token.endsWith('C')) {
                const n = parseInt(token.slice(2), 10) || 1;
                for (let i = 0; i < n; i++) cells.push({ ch: ' ', paint: ' ' });
            } else if (token.endsWith('m')) {
                style += token;
            }
        } else if (token === '\x0e' || token === '\x0f') {
            dec = token === '\x0e';
        } else {
            cells.push({ ch: token, paint: style + (dec ? '\x0e' : '') + token
                + (dec ? '\x0f' : '') + (style ? '\x1b[0m' : '') });
        }
    }
    return cells;
}

/* A pre-cls flush changes gbuf's dirty cells, not the text window underneath.
 * The ordinary map reconstruction is still used to spell each changed glyph. */
function _docrt_text_frame(output, messageRows = 1) {
    const bg = game._docrtTextBackdrop;
    if (!bg) return output;
    const rows = output.split('\n');
    const statusRow = _threeStatusLines() ? 21 : 22;
    /* bot() precedes the dirty-glyph loop, including glyphs on status row 1
     * when three status rows share the map's last screen row. */
    if (bg.botSeq !== (game._botlPaintSeq | 0)) {
        for (let r = statusRow; r < 24; r++) bg.rows[r] = rows[r] || '';
        bg.botSeq = game._botlPaintSeq | 0;
    }
    const physical = bg.rows.map(_tty_row_cells);
    const current = _capture_painted_cells();
    for (const key of new Set([...bg.cells.keys(), ...current.keys(), ...bg.dirty])) {
        const a = bg.cells.get(key), b = current.get(key);
        if (a?.ch === b?.ch && a?.color === b?.color
            && !!a?.dec === !!b?.dec && (a?.attr | 0) === (b?.attr | 0)
            && !bg.dirty.has(key)) continue;
        const y = Math.trunc(key / COLNO), x = key % COLNO;
        const row = y + 1;
        if (row < messageRows) continue;
        const glyph = _tty_row_cells(rows[row])[x - 1] || { ch: ' ', paint: ' ' };
        physical[row] ??= [];
        while (physical[row].length < x) physical[row].push({ ch: ' ', paint: ' ' });
        physical[row][x - 1] = glyph;
    }
    for (let r = messageRows; r < 24; r++) {
        const cells = physical[r] || [];
        while (cells.length && cells.at(-1).ch === ' ') cells.pop();
        rows[r] = cells.map(c => c.paint).join('');
    }
    return rows.join('\n');
}
function _buildScreenOutput() {
    const display = game?.nhDisplay;
    if (!display)
        return;
    /* A getlin/extcmd prompt echo that has run past column 79 occupies more
     * than one physical row (topl_putsym's hard wrap).  Lay it out the way the
     * multi-row --More-- frame does, minus the indicator. */
    if (game._topl_prompt_echo
        || (game._topl_show_only && game._topl_show_only === game._pending_message)) {
        const written = game._topl_prompt_written;
        const promptLine = String(written ?? game._pending_message ?? '');
        /* getline.c:67 writes query + space once; :174-176 echoes only the typed
         * bytes.  The extended-command echo already includes that separator
         * in _pending_message.  Do not append another space at column 79:
         * topl.c:331-332 wraps only BEFORE writing the next character. */
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
    // records "...wish? blessed" (trimmed) with the cursor at the space column,
    // while an untrimmed JS string would carry the trailing " ".  Match C by
    // stripping trailing spaces from the row-0 message text.
    /* `_topl_sticky` is topline text C left PHYSICALLY on the terminal but that
     * our per-read clear (js/input.js nhgetch) has already dropped from
     * _pending_message.  It is a paint-time fallback ONLY: a live
     * _pending_message always wins, so a later pline neither joins onto it nor
     * is shadowed by it. Usually nhgetch drops it on the next key; when
     * _topl_empty_sticky matches, C has marked the message window EMPTY
     * without erasing the physical text (wintty.c:1879-1882), so it survives
     * silent commands until overwritten or explicitly erased. */
    output += _toplStr(game._pending_message || game._topl_sticky || '') + '\n';
    // Rows 1-21: map (rendered with DEC + ANSI, per-row SO/SI)
    /* wintty.c:3814 — with 3 status rows the map window loses its last row. */
    const _rows3 = _threeStatusLines();
    /* `_map_blanked`: read_wizkit()'s raw_printf/wait_synch (files.c:2487) left
     * the physical terminal blank; tty repaints map cells only from newsym()
     * changes or docrt(), so the map stays blank until the next docrt. */
    for (let y = 0; y < (_rows3 ? ROWNO - 1 : ROWNO); y++) {
        output += (game._map_blanked && !(game._map_corner && y + 1 < game._map_corner.ymax)
            ? '' : render_map_row(y)) + '\n';
    }
    // Row 22-23: status
    /* C's tutorial gamestate memcpy restores the live hero before the next
     * turn, but every outstanding pre-redraw page is painted while the old
     * tutorial status is still physically on the terminal.  Keep the override
     * through internal repaints and page-acks; the level-transition pager
     * clears it after the final dismissal. */
    const _tutorialStatusOverride = game._tutorialStatusOverride;
    const _promptStatusRows = _prompt_physical_status_rows();
    /* erase_menu_or_text -> docrt clears status; windows.c:1861 keeps bot()
     * disabled during its flush.  Only a later status paint ends the blank. */
    /* No bot() has painted yet and the hero is not placed (mklev's getbones
     * "Get bones?" prompt, bones.c:671; pline.c:270 `if (u.ux) flush_screen`):
     * the physical status rows are still blank. */
    const _blankStatus = game._status_blanked || _status_blank_after_docrt()
        || (!game._lastPaintedBotl && !game.u?.ux);
    let _status1 = '', _status2 = '', _status3 = '';
    if (_tutorialStatusOverride && !game._status_blanked) {
        const _liveU = game.u;
        /* The painted hero predates goto_level's assign_level(&u.uz, newlevel)
         * (do.c:1675); once docrt()'s flush has run bot() (do.c:1840) the level
         * field names the arrival level (Tutorial:1) while the other fields stay
         * the painted hero's.  Before the assignment live uz == painted uz. */
        game.u = { ..._tutorialStatusOverride.u, uz: _liveU.uz };
        /* wintty.c:4289-4298 — statuslines:3 keeps three physical status rows
         * (Align on row 2, Dlvl/Time/conds on row 3) under the old hero too. */
        if (_rows3) {
            [_status1, _status2, _status3] = _statusRows3();
        } else {
            _status1 = _statusLine1();
            _status2 = _statusLine2();
        }
        game.u = _liveU;
    } else if (_promptStatusRows) {
        [_status1, _status2] = _promptStatusRows;
        if (_rows3) _status3 = _promptStatusRows[2];
    } else if (!_blankStatus) {
        _status1 = _statusLine1();
        _status2 = _statusLine2();
    }
    if (_rows3 && !_promptStatusRows && !_blankStatus && !_tutorialStatusOverride)
        [_status1, _status2, _status3] = _status_rows3_pinned();
    const _row1Live = _rows3 && !_promptStatusRows && !_tutorialStatusOverride && !_blankStatus;
    const _r1Whole = (game._inMovemonMore && game._paintedSnapshot
                      && game._paintedSnapshot.r1whole !== undefined)
        ? game._paintedSnapshot.r1whole : !!game._status1Whole;
    const _r1Physical = game._inMovemonMore ? game._paintedSnapshot?.r1physical : undefined;
    output += (_row1Live && _r1Physical !== undefined ? _r1Physical
               : _row1Live && !_r1Whole ? _status_row1_map_overlay(_status1)
               : _row1Live ? _status_row1_whole_with_tail(_status1)
               : _status_sgr(_status1)) + '\n';
    /* wintty.c:5260 finalx[row][BEFORE] is only advanced by render_status,
     * i.e. by a bot() paint; a flush that ran no bot() leaves it alone. */
    if (_row1Live && game._status1FinalXSeq !== (game._botlPaintSeq | 0)) {
        game._status1FinalX = _status_plain_len(_status1);
        game._status1FinalXSeq = game._botlPaintSeq | 0;
    }
    output += _status_sgr(_status2);
    if (_rows3) output += '\n' + _status_sgr(_status3);
    game._screen_output = _docrt_text_frame(game._statusCornerClips
        ? output.split('\n').map((line, row) => docorner_status_row(row, line)).join('\n')
        : output);
    // Preserve the browser grid as well as the serialized screen, updating
    // only cells whose final character, color or attributes changed.
    if (display.grid) {
        display.setCursor(0, 0);
        _paint_grid_row(display, 0, null, game._pending_message || '');
        for (let y = 0; y < (_rows3 ? ROWNO - 1 : ROWNO); y++)
            _paint_grid_row(display, y + 1, _live_grid_map_row(y));
        const r0 = _rows3 ? 21 : 22;
        const s1 = _status1.replace(/\x1b\[[0-9;]*[A-Za-z]/g,
            m => m.match(/\x1b\[\d+C/) ? ' '.repeat(Math.max(0, parseInt(m.slice(2)))) : '');
        _paint_grid_row(display, r0, _rows3 ? _live_grid_map_row(ROWNO - 1) : null,
            s1, _status_condition_hilites(s1));
        _paint_grid_row(display, r0 + 1, null, _status2, _status_condition_hilites(_status2));
        const h3 = _status_condition_hilites(_status3);
        if (_rows3)
            _paint_grid_row(display, 23, null, _status3, h3);
        for (let r = 24; r < display.rows; r++) display.clearRow(r);
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
/* wintty.c:3814 shrinks the map window by a row under statuslines:3, but
 * tty_print_glyph still prints map y=20 at screen row 21 (cw->offy + y), on
 * top of status row 1; tty only repaints the status fields that changed, so
 * the unchanged text around the map glyphs stays.  Overlay the non-blank
 * map-row-20 cells onto the first status row. */
/* Column just past the last rewritten status field: the end of the token
 * (space- or '('-delimited) holding the last cell that differs from the
 * previous paint; the whole text length when there is no previous paint. */
function _status_changed_end(prevRows, last) {
    const strip = (r) => String(r || '').replace(/\x1b\[(\d+)C/g, (_, n) => ' '.repeat(+n))
        .replace(/\x1b\[[0-9;]*[A-Za-z]/g, '');
    const cur = strip(last).trimEnd();
    if (!prevRows || prevRows.length !== 24)
        return cur.length;
    const prev = strip(prevRows[23]);
    let d = -1;
    for (let i = 0; i < cur.length; i++)
        if (cur[i] !== prev[i]) d = i;
    if (d < 0)
        return strip(prevRows[23]).trimEnd() === cur ? -1 : cur.length;
    let e = d + 1;
    while (e < cur.length && cur[e] !== ' ' && cur[e] !== '(')
        e++;
    return e;
}
function _status_plain_len(status1) {
    return String(status1 || '').replace(/\x1b\[(\d+)C/g, (_, n) => ' '.repeat(+n))
        .replace(/\x1b\[[0-9;]*[A-Za-z]/g, '').trimEnd().length;
}
/* wintty.c:489-506 new_status_window(), called by tty_preference_update()
 * before newclipping() when statuslines is set.  Recreating the tty status
 * window also reassesses the core fields, forcing unchanged values to be
 * sent again (including gold's label after check_gold_symbol()). */
export function new_status_window() {
    status_reassess();
}
/* C wintty.c:471-487 newclipping(), called from tty_preference_update()
 * (wintty.c:599-604) when statuslines changes in play — NOT for the startup
 * rc, which runs before iflags.window_inited.  A 24-row terminal is one row
 * short of 1 + ROWNO + 3, so statuslines:3 turns CLIPPING (config.h:538) on:
 * setclipped() (wintty.c:3809-3815) sets clipymax = LI - 1 - 3 = 20, and
 * tty_print_glyph (wintty.c:3869-3871) then drops every map y >= 20, so map
 * row 20 never reaches status row 1.  Switching back to 2 turns it off. */
export function newclipping() {
    const g = game;
    const sl = g.iflags?.wc2_statuslines ?? 2;
    if (TERMINAL_COLS < COLNO || TERMINAL_ROWS < 1 + ROWNO + sl)
        g._ttyClipYmax = TERMINAL_ROWS - 1 - sl; /* setclipped(); clipy stays 0 */
    else
        g._ttyClipYmax = undefined;
}
function _map_row20_clipped() {
    return game._ttyClipYmax !== undefined && ROWNO - 1 >= game._ttyClipYmax;
}
export function _status_row1_whole_with_tail(status1) {
    /* A whole status paint replaces the field values retained by the partial
     * map overlay; its next comparison must start from this status paint. */
    game._r1wipe = null;
    if (_map_row20_clipped()) return _status_sgr(status1);
    if ((game.u?.uswallow || game._swallowCageRow1) && game.level) {
        const y = ROWNO - 1, ux = game.u.ux | 0;
        const plain = status1.replace(/\x1b\[(\d+)C/g, (_, n) => ' '.repeat(+n)).padEnd(COLNO - 1, ' ');
        const isMap = (x) => {
            /* swallowed() (display.c:1357-1378) draws the cage at uy-1..uy+1 only */
            if (Math.abs((game.u.uy | 0) - y) > 1) return false;
            if (x < ux - 1 || x > ux + 1) return false;
            const cell = _snapCellAt(x, y);
            return !!(cell.ch && (cell.ch !== ' ' || (cell.attr & 1)));
        };
        let out = '', x = 1;
        while (x < COLNO) {
            const m = isMap(x);
            let e = x;
            while (e + 1 < COLNO && isMap(e + 1) === m) e++;
            out += m ? render_map_row(y, x, e, true) : plain.slice(x - 1, e);
            x = e + 1;
        }
        return out.replace(/ +$/, '');
    }
    const head = _status_sgr(status1);
    const len = _status_plain_len(status1);
    const before = game._status1FinalX;
    if (!game.level)
        return head;
    const painted = game._status1FinalXSeq !== (game._botlPaintSeq | 0);
    if (!before || (len < before && painted)) {
        status_r1_docorner(len + 1);
        return head;
    }
    const y = ROWNO - 1;
    const erased = (x) => {
        const cell = _snapCellAt(x, y);
        return !!game._r1clean && game._r1clean.get(x) === cell.ch + '/' + (cell.attr | 0);
    };
    let out = head.replace(/ +$/, ''), pad = len + 1;
    for (let x = len + 1; x < COLNO; x++) {
        const cell = _snapCellAt(x, y);
        if (erased(x) || !(cell.ch && (cell.ch !== ' ' || (cell.attr & 1)))) continue;
        let e = x;
        while (e + 1 < COLNO && !erased(e + 1)) e++;
        out += ' '.repeat(x - pad) + render_map_row(y, x, e, true);
        pad = e + 1;
        x = e;
    }
    return out;
}
export function _status_row1_map_overlay(status1) {
    /* a pending whole-row rewrite (BL_RESET, botl.c:1670) already painted every row-1 field over map y=20 */
    /* a frozen --More-- page carries its own latch (see _r1Whole in the caller) */
    const _latch = (game._inMovemonMore && game._paintedSnapshot
                    && game._paintedSnapshot.r1whole !== undefined)
        ? game._paintedSnapshot.r1whole : !!game._status1Whole;
    if (_latch || _map_row20_clipped()) return _status_row1_whole_with_tail(status1);
    const y = ROWNO - 1;
    /* do.c:1720,1840-1841: delayed flushing keeps the departure map on
     * the terminal until docrt(). Its blank cells must use that level's
     * metadata too; the destination's seen stone has not been printed yet. */
    const level = (game._inMovemonMore && game._paintedSnapshot?.level) || game.level;
    const cellSig = (cell) => cell.ch + '|' + cell.attr;
    const mapAt = (x) => {
        const cell = _snapCellAt(x, y);
        /* A dismissed full-screen/tall menu's docrt()/docorner() erased row 21
         * and bot() rewrote the status text; map cells unchanged since are not
         * on the terminal (wintty.c:3684-3687). */
        if (game._r1clean && game._r1clean.get(x) === cell.ch + '/' + (cell.attr | 0))
            return false;
        const over = game._r1wipe?.over;
        if (over && over.has(x)) {
            /* bot() rewrote this status cell after docrt printed the map, so the
             * text stays on top until the map cell is drawn again. */
            if (over.get(x) === cellSig(cell)) return false;
            const covered = over.get(x);
            over.delete(x);
            (game._r1wipe.overDel ||= new Map()).set(x, covered);
        } else if (cell.held && !cell.hero && game._r1wipe?.overDel?.get(x) === cellSig(cell)) {
            return false;
        }
        return !!(cell.ch && (cell.ch !== ' ' || (cell.attr & 1)));
    };
    let any = false;
    for (let x = 1; x < COLNO && !any; x++)
        any = mapAt(x);
    const plain0 = status1.replace(/\x1b\[(\d+)C/g, (_, n) => ' '.repeat(+n)).padEnd(COLNO - 1, ' ');
    let wiped = false;
    if (game.level) {
        const st = game._r1wipe || (game._r1wipe = { phys: plain0.split(''), last: plain0, cell: new Map(), lvl: game.level });
        /* a full-screen menu's docrt() printed the map first, then bot() rewrote the text */
        const skipBlank = game._r1botAfterMap === game.level;
        game._r1botAfterMap = false;
        /* true, or the level whose redraw the text was rewritten over */
        const repaint = game._r1GlyphRepaint;
        /* a menu dismissal's docrt() printed its row-20 glyph changes before
         * the botlx bot() rewrote status row 1 (skipBlank), so they are not
         * display.c:2236-2256 prints that follow bot() */
        const flushed = repaint?.flushed && repaint.level === level && !skipBlank;
        const textOver = game._r1textOver === true || (game._r1textOver && game._r1textOver === game.level)
            || (flushed && repaint.whole);
        game._r1textOver = false;
        if (textOver) {
            st.over = new Map();
            st.overDel = null;
            const lastTxt = plain0.trimEnd().length;
            /* display.c:2236-2256: under a whole rewrite this same flush prints
             * the dirty glyphs after bot(), so the text never stood over them */
            for (let x = 1; x <= lastTxt; x++)
                if (!(flushed && repaint.whole && repaint.xs.has(x)))
                    st.over.set(x, cellSig(_snapCellAt(x, y)));
            if (flushed && repaint.whole) {
                /* botl.c:1670 BL_RESET: render_status rewrote every row-1
                 * field over map y=20, so the retained physical row is the
                 * whole text again before the dirty glyphs print over it */
                st.phys = plain0.split('');
                for (let x = 1; x < COLNO; x++) st.cell.set(x, 'b');
            }
        }
        if (game._r1docrtSeen && game._r1docrtLvl !== game.level)
            game._r1docrtSeen = null; /* the menu's docrt was on a level we have since left */
        if (game._r1docrtSeen) {
            for (const x of game._r1docrtSeen) st.cell.set(x, 'b');
            game._r1docrtSeen = null;
        }
        /* render_status (wintty.c:5122-5236) rewrites a changed field whole, not
         * just the characters that differ: St:18/01 -> St:14 puts "St:14" over a
         * wiped "St:1".  Fields are the title (up to " St:") and the blank-
         * separated words after it. */
        const stAt = plain0.indexOf(' St:');
        const fieldRe = stAt > 0 ? /\S+/g : null;
        const changed = new Array(plain0.length).fill(false);
        for (let i = 0; i < plain0.length; i++)
            if (plain0[i] !== st.last[i]) changed[i] = true;
        if (fieldRe) {
            const spans = [[0, stAt]];
            fieldRe.lastIndex = stAt;
            /* a field's text carries its leading blank (botl.c field format), written with it */
            for (let m; (m = fieldRe.exec(plain0)); ) spans.push([m.index - 1, m.index + m[0].length]);
            for (const [a, b] of spans)
                if (changed.slice(a, b).some(Boolean))
                    for (let i = a; i < b; i++) changed[i] = true;
        }
        /* a field rewritten by render_status (title padding included) lands on
         * top of any map glyph there until that map cell is drawn again */
        for (let i = 0; i < plain0.length; i++)
            if (changed[i]) {
                st.phys[i] = plain0[i];
                (st.over || (st.over = new Map())).set(i + 1, cellSig(_snapCellAt(i + 1, y)));
                st.overDel?.delete(i + 1);
            }
        st.last = plain0;
        /* display.c:2236-2256 prints dirty map glyphs AFTER bot(). A changed
         * glyph family must invalidate retained coverage even when its tty
         * character is unchanged (unexplored and stone are both blank). */
        if (flushed) {
            for (const x of repaint.xs) {
                if (st.over?.has(x)) {
                    (st.overDel ||= new Map()).set(x, st.over.get(x));
                    st.over.delete(x);
                }
                game._r1clean?.delete(x);
                st.cell.delete(x);
                any ||= mapAt(x);
            }
        }
        for (let x = 1; x < COLNO; x++) {
            const loc = level.at(x, y);
            if (mapAt(x)) { st.cell.set(x, 'n'); continue; }
            const dirty = flushed && repaint.xs.has(x);
            if (loc && (dirty || (loc.seenv | 0))
                && loc.disp_ch === ' ' && st.cell.get(x) !== 'b') {
                st.cell.set(x, 'b');
                if (!skipBlank || dirty) st.phys[x - 1] = ' ';
            }
        }
        wiped = st.phys.join('') !== plain0;
    }
    if (!any && !wiped)
        return _status_sgr(status1);
    if (!game.level)
        return _status_sgr(status1);
    const plain = wiped ? game._r1wipe.phys.join('') : plain0;
    let out = '';
    let x = 1;
    while (x < COLNO) {
        const isMap = mapAt(x);
        let e = x;
        while (e + 1 < COLNO && mapAt(e + 1) === isMap)
            e++;
        out += isMap ? render_map_row(y, x, e, true) : plain.slice(x - 1, e);
        x = e + 1;
    }
    return out.replace(/ +$/, '');
}
function _buildScreenOutputWithMoreRows(rows) {
    const display = game?.nhDisplay;
    if (!display)
        return;
    const M = rows.length;
    let output = '';
    for (let r = 0; r < M; r++)
        output += _toplStr(rows[r], r) + '\n';        /* rows 0..M-1: message */
    /* wintty.c:3814 — with 3 status rows the map window loses its last row;
     * the physical status rows are then 21/22/23. */
    const _rows3 = _threeStatusLines();
    for (let y = M - 1; y < (_rows3 ? ROWNO - 1 : ROWNO); y++) /* rows M..21: map y=(M-1)..20 */
        output += render_map_row(y) + '\n';
    const _promptStatusRows3 = _prompt_physical_status_rows();
    if (_rows3) {
        const _blank3 = !!(game._status_blanked || _status_blank_after_docrt());
        const _r3 = _promptStatusRows3 || (_blank3 ? ['', '', ''] : _status_rows3_pinned());
        /* row 21 is status row 1 with map y=20 printed over it, as in
         * _buildScreenOutput (wintty.c:3814). */
        const _r1Live = !_promptStatusRows3 && !_blank3;
        const _r1Whole = (game._inMovemonMore && game._paintedSnapshot
                          && game._paintedSnapshot.r1whole !== undefined)
            ? game._paintedSnapshot.r1whole : !!game._status1Whole;
        const _r1Physical = game._inMovemonMore ? game._paintedSnapshot?.r1physical : undefined;
        output += (_r1Live && _r1Physical !== undefined ? _r1Physical
                   : _r1Live && !_r1Whole ? _status_row1_map_overlay(_r3[0])
                   : _r1Live ? _status_row1_whole_with_tail(_r3[0])
                   : _status_sgr(_r3[0])) + '\n' + _status_sgr(_r3[1]) + '\n' + _status_sgr(_r3[2]);
        game._screen_output = _docrt_text_frame(output, M);
        return;
    }
    const _promptStatusRows = _promptStatusRows3?.slice(-2);
    const _blankStatus = !!(game._status_blanked || _status_blank_after_docrt());
    /* tty paints the hilite_status SGR on every status refresh, a multi-row
     * --More-- frame included (wintty.c tty_putstatusfield / term_start_color). */
    output += (_promptStatusRows?.[0] ?? (_blankStatus ? '' : _status_sgr(_statusLine1()))) + '\n'; /* row 22 */
    output += (_promptStatusRows?.[1] ?? (_blankStatus ? '' : _status_sgr(_statusLine2())));        /* row 23 */
    game._screen_output = _docrt_text_frame(output, M);
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
        const s1 = _statusLine1().replace(/\x1b\[[0-9;]*[A-Za-z]/g, m => m.match(/\x1b\[\d+C/) ? ' '.repeat(Math.max(0, parseInt(m.slice(2)))) : '');
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
export const TOPL_LIMIT = TOPL_CO - 1 - TOPL_MORE.length; /* 71 = CO-1-8 reserve */

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
// the word wrap.  It is not — topl_putsym hard-wraps at column CO-1 with no
// regard for word boundaries (see topl_park_cursor below).  The word-splitting
// is update_topl's `for (tl = gt.toplines; n0 >= CO; )` loop (topl.c:277-291),
// which scans BACKWARDS from gt.toplines[CO-1] for a space and substitutes a
// '\n' for it.  The distinction is load-bearing rather than pedantic: a message
// carrying SUPPRESS_HISTORY skips update_topl entirely (wintty.c:2289-2297
// routes it to show_topl -> addtopl -> putsyms), so it never word-wraps at all.
// Every yn/getlin prompt is such a message.
//
// wrap point is exactly "would the NEXT space-delimited word push this row
// past 79 visual columns" — never a mid-word split, and never the CO-1-8=71
// --More-- reserve (that reserve only governs the separate join-driven
// _topl_split_for_more decision above, not raw text layout). update_topl
// leaves a token wider than one row intact, then topl_putsym hard-wraps it
// at CO-1 while painting. Apply that physical wrap after word splitting.
function _topl_wordwrap(text, width) {
    /* C ref: topl.c:284-297 update_topl — search BACK from tl+CO-1 for the
     * LAST blank and replace just that one with '\n'.  A run of blanks
     * therefore keeps its earlier blanks on the upper row and the rest leads
     * the next row (a recorded topline wrapping "following:  -More"). */
    const plain = String(text || '');
    if (width === TOPL_CO - 1 && plain.length >= TOPL_CO && !/[\x1b\x0e\x0f]/.test(plain)) {
        const rows = [];
        let rest = plain;
        while (rest.length >= TOPL_CO) {
            let i = TOPL_CO - 1;
            while (i > 0 && rest[i] !== ' ') i--;
            if (i === 0) {
                i = rest.indexOf(' ');
                if (i < 0) break;
            }
            rows.push(rest.slice(0, i));
            rest = rest.slice(i + 1);
        }
        rows.push(rest);
        return rows.flatMap(_topl_hardwrap);
    }
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
    // "rings out: --More--".  Split rows keep their trim (C consumes the break
    // space at each split).
    if (cur) rows.push(cur);
    return rows.length ? rows.flatMap(_topl_hardwrap) : [''];
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
    const res = _topl_result_head(g._resultMessage, prev);
    /* C topl.c keeps ONE topline; here the command result (_resultMessage) and the
     * live pending line are separate buffers that _topl_merge_result joins as
     * `result + "  " + pending`.  When the pending line is the append target
     * (g._pending_message === prev) and the result head survives
     * _topl_result_head's snapshot strip, the result is a genuine PREFIX even if
     * its text equals the pending line's — a counted search repeating "You feel
     * an unseen monster!" made res === prev, so the equality test below filed
     * every later flush frame 29 columns early and the first --More-- painted the
     * live map instead of the map as of the overflowing pline. */
    const _resIsPrefix = !!res && g._pending_message === prev && res === prev
        && !g._toplResultSnapshot;
    const prefix = (res && (_resIsPrefix || (res !== prev && res !== joined))) ? res.length + 2 : 0;
    const off = prefix + prev.length;
    const msg = joined.slice(prev.length + 2);
    _pline_flush_frame_record(off, msg);
    /* `off` already counts the result head, so the merge must not rebase it again. */
    if (prefix && g._plineFlushFrames?.length) g._plineFlushFrames[g._plineFlushFrames.length - 1].prefixed = true;
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
// ("You were wearing a blessed +3 small shield.", 43 chars) is committed as the
// command result and the water nymph's steal message opens the next world block,
// so the page-1 select asked for off 43 and the log's earliest record was 108.
export function _pline_flush_frame_record(off, msg) {
    const g = game;
    if (!g || !g.level) return;
    if (!g._plineFlushFrames) g._plineFlushFrames = [];
    /* C pline.c:273-276 / tty/topl.c:274 blocks at each overflowing pline.
     * Our deferred pager needs every flush until this window is acknowledged;
     * a long command (such as emptying a horn) must not evict its first pages. */
    g._plineFlushFrames.push({
        off,
        msg,
        level: g.level,     /* the level whose map was painted (arrival pager) */
        rngMark: (getRngLog() || []).length, /* draws made before this pline: C's more() blocks inside it */
        flushEpoch: _flush_epoch, /* later flush_screen paints supersede a standing line */
        mm: !!g._inMovemonBlock,   /* plined from inside movemon (allmain.c:250) */
        cells: _capture_painted_cells(),
        moves: _painted_moves(),
        /* display.c:2237 — flush_screen() runs bot() only when botl/botlx is set;
         * otherwise the physical status keeps the previous paint (polymon sets
         * u.mh/u.mhmax with no flag after the sick pline's flush). */
        /* pline.c:273 `if (u.ux) flush_screen()`: before the hero is placed (a
         * monpolycontrol prompt during the first mklev) no bot() has run, so
         * the physical status rows are still blank when more() blocks. */
        statusBlankAfterDocrt: g._statusBlankAfterDocrt === true
            || (!g._lastPaintedBotl && !g.u?.ux),
        botl: (g.disp && !(g.disp.botl | 0) && !(g.disp.botlx | 0) && !(g.disp.time_botl | 0)
               && g._lastPaintedBotl && (g._lastPaintedBotl.mh | 0) === 0 && g.u && (g.u.mh | 0) !== 0)
            ? g._lastPaintedBotl : _capture_botl(),
        statusSeq: g._statusPaintSeq | 0,
        runFlush: g._runFlushSeq | 0,
        /* Row 1's whole-rewrite latch as of THIS pline's flush: the paging
         * loop installs this record for the page's --More-- frame, and C's
         * later end-of-turn bot() BL_RESET (allmain.c:474) is invisible until
         * that page is dismissed. */
        r1whole: !!g._status1Whole,
        botlSeq: g._botlPaintSeq | 0,   /* bot() paints as of this flush */
        /* pline.c:273-276 flushes before more() blocks. With three status
         * rows, map y=20 can erase unchanged fields (display.c:2236-2255,
         * wintty.c:5018,5237-5238). Keep that physical row: rendering its old
         * field values against a later live overlay would mistake them for new writes. */
        r1physical: _threeStatusLines() && !_map_row20_clipped()
            ? String(g._screen_output || '').split('\n')[21] : undefined,
    });
}
/* C youprop.h:125  Deaf = (HDeaf || EDeaf || u.uroleplay.deaf).  HDeaf is the
 * flat u.HDeaf slot in this port (js/allmain.js:1591 nh_timeout_deaf counts it
 * down; js/eat.js:1183 and js/music.js's leather drum set it). */
export { _live_deaf as Deaf };
function _live_deaf() {
    const u = game?.u;
    if (!u) return false;
    const dp = u.uprops?.[DEAF];
    return !!((dp?.intrinsic | 0) || (dp?.extrinsic | 0) || (u.HDeaf | 0)
              || (u.uroleplay && u.uroleplay.deaf));
}
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
// "Your cloak smoulders!", which zhitu (zap.c:4415-4429) emits BEFORE its closing
// losehp() (zap.c:4581), so C's status still reads HP:127 while this port had
// already applied the 19 damage and rendered HP:108.  Both orderings are the same;
// only the render instant differed.
//
// pline-flush frames ... the movemon / occupation / run frames keep rendering
// live status and are byte-unchanged", which stopped being true when the
// movemon page-freeze started pinning it):
//   RECORDED, instant exact — the pline-flush frames (_pline_flush_frame_record),
//     the forced-break frames (topl_force_break_after's display_nhwindow page),
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
//     caller is byte-unchanged).  Those approximate the pline instant at
//
// SCOPE — hp/pw and the encumbrance level, deliberately NOT the whole status
// line.  Freezing a field mid-command is only correct where this port maintains
// that field at C's own call sites.  u.uhp/u.uen are (losehp/healup/spell cost
// all write them where C does).  So is the encumbrance level: it is not stored
// state at all but a pure function of the inventory chain
// (near_capacity() -> inv_weight() -> the gi.invent walk), and this port adds to
// and frees from gi.invent at C's addinv()/freeinv() sites, so its value at the
// plines "You drop a scroll labeled FOOBIE BLETCH." BEFORE dropx()->freeinv()
// (do.c:773-777), so the frozen page still reads the pre-drop cap and shows
// " Stressed"; only after dropz()'s encumber_msg (do.c:840, pickup.c:1990) does
// the next flush repaint " Burdened".  This port paged the accumulated topline
// after the whole command and rendered the live post-drop cap.
//
// no painted latch.  The asymmetry is C's, not a heuristic: near_capacity() is a
// derived quantity that nothing flags the status line for, so its painted value can
// lag the live one arbitrarily; u.uac is stored state whose ONLY writer is find_ac()
// (do_wear.c:2504-2506), and that writer runs SET_BOTL() on every change.  Since
// vpline() calls flush_screen() BEFORE putmesg() (pline.c:274-277) and flush_screen
// opens with `if (disp.botl || disp.botlx) bot();` (display.c:2286), a pline can
// never observe a stale AC: whatever find_ac last stored is repainted by that
// break_armor() BEFORE find_ac(), so the "The clasp on your cloak breaks open!"
// pline pages a frame that already carries the warhorse's HP:20(20)/HD:7/St:18/**
// but still the hero's AC:10; find_ac() drops it to the warhorse's mons[].ac == 4
// (monsters.h LVL(7,24,4)) only afterwards, which is what step 870 shows.
// find_ac after the "You feel yourself speed up." pline where C had already run it.
// Fixing a divergence here means moving a find_ac() to its C site, never widening
// DISPLAY-ONLY: reads u + the inventory chain, consumes no RNG, mutates no state.
function _capture_botl(paint = false) {
    const u = game?.u;
    if (!u) return null;
    /* pline.c:273 skips flush_screen() before the hero is placed.  A
     * message snapshot during mklev must retain the unpainted status window,
     * rather than turn its pending botlx into a fictitious first paint. */
    if (!paint && !u.ux)
        return game._lastPaintedBotl || null;
    if (suppress_map_output())
        return game._lastPaintedBotl || null;
    const Upolyd = (u.umonnum | 0) !== (u.umonster | 0);
    if ((u.uhp | 0) === -1 || (!paint && game._botlFrozenDeath))
        return game._lastPaintedBotl || null;
    if (!paint && game._botlPaintHeld && game._lastPaintedBotl)
        return game._lastPaintedBotl;
    const _d = game.disp;
    /* C display.c:2236-2239: an unflagged flush does not run bot(), so HP
     * stays at its last paint.  throne_sit_effect (sit.c:89-100) heals before
     * make_blinded's sight message, and flags status only afterwards.
     * A direct bot() paint still reads the current HP (botl.c:254-270). */
    const hpPaint = !paint && !((_d?.botl | 0) || (_d?.botlx | 0))
        ? game._lastPaintedBotl : null;
    if (paint || (_d && ((_d.botl | 0) || (_d.botlx | 0)))) {
        game._botlPaintedAttrs = (u.acurr && u.acurr.a)
            ? [acurr(u, A_STR), acurr(u, A_DEX), acurr(u, A_CON),
               acurr(u, A_INT), acurr(u, A_WIS), acurr(u, A_CHA)]
            : null;
    }
    if (_d && ((_d.botl | 0) || (_d.botlx | 0))) {
        /* This pline's flush_screen() runs bot() (display.c:2286), whose paint
         * restores the status cells docorner() cl_end()ed (wintty.c:3715-3719,
         * the wish-history menu's dismissal), exactly as bot() itself does. */
        game._statusCornerClips = null;
        game._botlStaleUen = undefined;
        game._botlStaleUenmax = undefined;
        game._botlStaleUhp = undefined;
        game._botlStaleHp = undefined;
        game._botlStaleHpmax = undefined;
        game._botlPaintedCap = near_capacity() | 0;
        game._botlPaintedFemale = !!(game.flags?.female);
        /* Same PAINT-time rule for the Deaf condition — see the `deaf` field
         * below and botl_status_suffix's note. */
        game._botlPaintedDeaf = _live_deaf();
        game._botlPaintedFlying = _live_flying();
        game._botlPaintedRiding = !!u.usteed;
        game._botlPaintedConfused = !!(u.uprops?.[CONFUSION]?.intrinsic | 0);
        game._botlPaintedHallu = _hallucinating_dsp();
        game._botlPaintedLev = _live_lev(u);
        game._botlPaintedBlind = _disp_Blind();
        game._botlPaintedSlimed = !!(u.uprops?.[SLIMED]?.intrinsic | 0);
        game._botlPaintedSickType = (u.uprops?.[SICK]?.intrinsic | 0) ? (u.usick_type | 0) : 0;
        game._botlPaintedLevel = u.ulevel | 0;
        game._botlPaintedInLava = !!(u.utrap && (u.utraptype | 0) === TT_LAVA);
        game._botlPaintedUhs = u.uhs | 0;
        game._botlPaintedExp = u.uexp ?? 0n;
    }
    /* A snapshot taken before the hero is placed and before any bot() paint
     * (a pline inside mklev, e.g. the wizard-mode monpolycontrol getlin) is
     * not a paint: the physical status rows are still blank (see the
     * _blankStatus test in _buildScreenOutput), so it must not be recorded
     * as the last painted status. */
    const _unpainted = !paint && !game._lastPaintedBotl && !game.u?.ux;
    const _snap = {
        dnum: u.uz?.dnum, dlevel: u.uz?.dlevel,
        /* C botl.c:1261-1274: BL_TERRAIN is cached at this status paint,
         * just like HP and conditions, rather than read again by more().
         * hack.c:3165-3170 changes terrain_typ during a run without
         * requesting bot().  An unflagged pline flush (display.c:2237)
         * must retain the previous paint, including in its page snapshot. */
        /* tty keeps the third status row physically on the terminal between
         * bot() paints (wintty.c:4992 render_status); a pinned --More-- page
         * shows the row as of its own flush, not a later paint's. */
        row3: game._st3?.row,
        terrainText: hpPaint?.terrainText ?? _terrain_status_text(paint,
            !!((_d?.botl | 0) || (_d?.botlx | 0))),
        /* attrib.c:1329-1337 flags status before changing alignment; keep
         * this paint's value when later messages in the same command page. */
        alignType: u.ualign?.type,
        /* C botl.c:188 — (cap = near_capacity()) > UNENCUMBERED, read by bot()
         * at PAINT time. */
        cap: (game._botlPaintedCap != null)
            ? (game._botlPaintedCap | 0) : (near_capacity() | 0),
        /* healup() (potion.c:1428) flags botl only at its tail: a pline inside
         * it freezes the pre-heal HP/max (js/potion.js records _botlStaleHp). */
        uhp: hpPaint ? hpPaint.uhp
            : (game._botlStaleHp !== undefined && !Upolyd) ? game._botlStaleHp : u.uhp,
        uhpmax: hpPaint ? hpPaint.uhpmax
            : (game._botlStaleHp !== undefined && !Upolyd) ? game._botlStaleHpmax : u.uhpmax,
        gold: game._tutorialStatusOverride?.gold ?? game._botlGoldStale
            ?? money_cnt(game.invent ?? null),
        /* botl.c:1564-1584: the gold field's label is part of the painted
         * field cache; a status_reassess() (polyself.c set_uasmon) after this
         * pline must not relabel a page frozen at this paint. */
        goldLabel: game._goldLabelCache?.label,
        mh: hpPaint ? hpPaint.mh
            : (game._botlStaleHp !== undefined && Upolyd) ? game._botlStaleHp : u.mh,
        mhmax: hpPaint ? hpPaint.mhmax
            : (game._botlStaleHp !== undefined && Upolyd) ? game._botlStaleHpmax : u.mhmax,
        uen: game._botlStaleUen !== undefined ? game._botlStaleUen : u.uen,
        uenmax: game._botlStaleUenmax !== undefined ? game._botlStaleUenmax : u.uenmax,
        /* C botl.c:867-869 BL_AC — bot() reads u.uac, which only find_ac() writes
         * and which SET_BOTL()s on every change; see the SCOPE note above. */
        uac: u.uac ?? 0,
        /* u.uac is still unset (C: memset-zero, u_init.c:954) when newgame's
         * first bot() (allmain.c:819) paints; find_ac() then runs inside
         * u_init_skills_discoveries() (allmain.c:821) and only flags the line.
         * Marks that paint so the first frame keeps AC:0. */
        uacUnset: u.uac == null,
        ulevel: (game._botlPaintedLevel != null)
            ? (game._botlPaintedLevel | 0) : (u.ulevel | 0),
        uexp: (game._botlPaintedExp != null)
            ? game._botlPaintedExp : (u.uexp ?? 0n),
        uhs: game._saved_hs
            && !(_d && ((_d.botl | 0) || (_d.botlx | 0)))
            ? (game._botlPaintedUhs != null ? (game._botlPaintedUhs | 0) : (game._save_hs | 0))
            : (u.uhs | 0),
        attrs: (game._botlPaintedAttrs !== undefined)
            ? game._botlPaintedAttrs
            : ((u.acurr && u.acurr.a)
                ? [acurr(u, A_STR), acurr(u, A_DEX), acurr(u, A_CON),
                   acurr(u, A_INT), acurr(u, A_WIS), acurr(u, A_CHA)]
                : null),
        mtimedone: u.mtimedone | 0,
        umonnum: u.umonnum | 0,
        /* C you.h:554 Upolyd is (u.umonnum != u.umonster); the snapshot carried
         * only umonnum and the mtimedone TIMER, so the frozen-frame status line
         * could not spell C's macro.  u.umonster never changes after
         * u_init.c:991 but is snapshotted with the rest for symmetry. */
        umonster: u.umonster | 0,
        experienceFields: game._statusExperienceFields
            ? { ...game._statusExperienceFields } : null,
        /* painted gender, like every neighbour (botl.c:777 rank(); polymon flips
         * flags.female at polyself.c:785-793 before the next bot()) */
        female: game._botlPaintedFemale !== undefined
            ? game._botlPaintedFemale : !!(game.flags && game.flags.female),
        deaf: (game._botlPaintedDeaf != null) ? !!game._botlPaintedDeaf : _live_deaf(),
        riding: game._botlPaintedRiding ?? !!u.usteed,
        confused: game._botlPaintedConfused ?? !!(u.uprops?.[CONFUSION]?.intrinsic | 0),
        /* C botl.c:975 condtests[bl_blind] — same PAINT-time rule. */
        blinded: (() => {
            const bp = u.uprops && u.uprops[BLINDED];
            /* Blindf_off clears the worn property before its off-message,
             * while C's physical status remains unchanged until the blindness
             * redraw. Preserve that status for the message's frozen frame. */
            if (game._blindfoldOffFrameBlind !== undefined)
                return !!game._blindfoldOffFrameBlind;
            /* polyman()'s make_blinded() (polyself.c:258-261) pline()s "You can see
             * again." with HBlinded=1 stored but SET_BOTL only in toggle_blindness
             * afterwards, so the --More-- frame keeps the previous bot() paint. */
            if (game._botlPaintedBlind != null) return !!game._botlPaintedBlind;
            return (!!bp && !!((bp.intrinsic | 0) || (bp.extrinsic | 0))
                    && !(bp.blocked | 0));
        })(),
        stunned: (() => {
            const sp = u.uprops && u.uprops[STUNNED];
            return !!sp && (sp.intrinsic | 0) !== 0;
        })(),
        /* C botl.c:1229 condtests[bl_busy] — latched with the other conditions so a
         * frozen --More-- keeps the Busy the hero had at the pline (see _busy_condition). */
        busy: _busy_condition(),
        /* botl.c:1164-1188 bl_grab, painted-time like the rest: the eel's
         * AD_WRAP sets u.ustuck mid-attack-chain, after earlier plines flushed. */
        grabbed: !!(u.ustuck && !u.uswallow
            && !(((u.umonnum | 0) !== (u.umonster | 0)) && sticks(game.youmonst?.data))
            && (u.ustuck.data?.mlet | 0) === 57 /* S_EEL */),
        flying: (game._botlPaintedFlying != null) ? !!game._botlPaintedFlying : _live_flying(),
        // timeout.c:670-671 expires Sick without flagging botl before the
        // death pline at :703. Its flush retains the painted condition word.
        sickType: game._botlPaintedSickType
            ?? ((u.uprops?.[SICK]?.intrinsic | 0) ? (u.usick_type | 0) : 0),
        /* botl.c:1149-1157 Slimed (intrinsic only) and bl_inlava, painted-time like Sick. */
        /* C timeout.c:655-672: the Slimed countdown is decremented BEFORE
         * slimed_to_death()'s polymon pline, and nothing SET_BOTLs for that
         * decrement, so the --More-- frame still shows the Slime word that bot()
         * last painted.  Latched like Blind above; live when nothing was painted. */
        slimed: (game._botlPaintedSlimed != null)
            ? !!game._botlPaintedSlimed : !!(u.uprops?.[SLIMED]?.intrinsic | 0),
        /* botl.c:1151 Strangled (intrinsic only), painted-time like Slimed: the
         * prayer that cures it runs fix_worst_trouble (pray.c:1139) only AFTER
         * pleased()'s "You feel that X is pleased." pline (pray.c:1077), so that
         * --More-- frame must still show Strngl. */
        strangled: !!(u.uprops?.[STRANGLED]?.intrinsic | 0),
        /* C uhitm.c:4225-4246 prints the attack/hiss before do_stone_u sets
         * Stoned.  Keep botl.c:1200's value at that flush for the frozen page. */
        stoned: !!(u.uprops?.[STONED]?.intrinsic | 0),
        inLava: !!(u.utrap && (u.utraptype | 0) === TT_LAVA),
        /* botl.c:1208 bl_woundedl, painted-time: a bear trap's pline precedes
         * set_wounded_legs (trap.c), so the --More-- page shows no WLegs. */
        woundedLegs: !!((u.uprops?.[WOUNDED_LEGS]?.intrinsic | 0) || (u.uprops?.[WOUNDED_LEGS]?.extrinsic | 0)),
        levitating: (() => {
            const lq = u.uprops && u.uprops[LEVITATION];
            return !!lq && !!((lq.intrinsic | 0) || (lq.extrinsic | 0)) && !(lq.blocked | 0);
        })(),
        hallucinating: game._botlPaintedHallu ?? _hallucinating_dsp(),
        weapon: game.flags?.weaponstatus ? weapon_status() : undefined,
        armor: game.flags?.armorstatus ? armor_status() : undefined,
    };
    return _unpainted ? _snap : (game._lastPaintedBotl = _snap);
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
// a crisp...--More--" frame still reads HP:14(14); HP:0(14) is C's NEXT frame.
//
// its existing cmdq-fireassist caller keeps rendering the live status).
// DISPLAY-ONLY: copies disp_* cells and hero scalars, consumes no RNG, mutates
// no game state.
export function capture_painted_frame_with_status() {
    const g = game;
    if (!g || !g.level) return null;
    /* end.c:1043-1046 calls bot() without flushing the map before the death
     * prompt's more() (tty/topl.c:390-392).  Preserve the last flushed cells;
     * newsym() since that flush has changed only gbuf (display.c:2237-2260). */
    return { cells: capture_flushed_cells(), moves: _painted_moves(), botl: _capture_botl(),
             r1whole: !!g._status1Whole };
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
// The pline-flush frame of the LAST message joined strictly inside one page
// (start offset in (lo, hi)), i.e. the most recent flush that page's text saw.
function _pline_flush_frame_select_within(lo, hi, full, frames) {
    if (!frames || !frames.length || typeof full !== 'string') return null;
    let best = null;
    for (const f of frames) {
        if (!(f.off > lo && f.off < hi)) continue;
        if (full.slice(f.off + 2, f.off + 2 + f.msg.length) !== f.msg) continue;
        if (!best || f.off >= best.off) best = f;
    }
    return best;
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
// hits!  ...again!..." shown with no --More-- while C paged at 60 cols).
//
// The merged joins are: a's own internal joins (if recorded for `a`), then the
// genuine a→b message boundary at offset a.length, then each of b's internal
// joins rebased by a.length+2.  We KEY _topl_joins_src to the MERGED string, which
// is exactly what the moveloop stores into _resultMessage and later restores into
// _pending_message unchanged — so the split machinery is armed at flush time.
//
// BEFORE b's own plines ran.  The join side-channel is single-slot ("tracks one
// string at a time" — see below), so once b (e.g. a movemon window) accumulates
// its OWN join chain via pline(), `_topl_joins_src` no longer equals `a` and the
// live lookup below returns [] — silently dropping a's internal boundaries and
// collapsing a multi-message command result (e.g. a spell's self-hit + pet-kill
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
    if (!b) {
        /* C topl.c:261-274 tests each pline against the standing topline.
         * Restoring a saved line without a live suffix must restore its
         * message boundaries too, so its earlier update_topl pages survive. */
        if (g && Array.isArray(aJoinsHint)) {
            g._topl_joins = aJoinsHint.slice();
            g._topl_joins_src = a;
        }
        return a;
    }
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
    if (g && Array.isArray(g._plineFlushFrames)) {
        for (const f of g._plineFlushFrames) {
            const fm = String(f?.msg || '');
            if (f && fm && !f.prefixed && b.slice((f.off | 0) + 2,
                                   (f.off | 0) + 2 + fm.length) === fm)
                f.off = (f.off | 0) + base;
        }
    }
    if (g) { g._topl_joins = joins; g._topl_joins_src = merged; }
    return merged;
}

// C lock.c:247,181,1284 prints these messages before potionbreathe(), which
// can enter docall() (potion.c:2111) and page the topline before returning.
// Publish the staged occupation prefix before calling that subtree; moving its
// output back into the queue afterwards is too late for an intervening prompt.
export function commit_force_messages() {
    const g = game;
    if (!g._forceMsgs?.length) return;
    let full = _topl_merge_result(g._resultMessage, g._pending_message,
        g._resultMessageJoins?.src === g._resultMessage
            ? g._resultMessageJoins.joins
            : _topl_joins_snapshot(g._resultMessage) || undefined);
    pline_flush_point();
    for (const [i, msg] of g._forceMsgs.entries()) {
        const off = full.length;
        full = _topl_merge_result(full, msg, _topl_joins_snapshot(full) || undefined);
        if (off) {
            _pline_flush_frame_record(off, msg);
            // Each staged pline retains the status from its own C flush.
            const frame = g._plineFlushFrames[g._plineFlushFrames.length - 1];
            frame.botl = g._forceMsgBotls?.[i] ?? frame.botl;
        }
    }
    g._pending_message = full;
    g._resultMessage = null;
    g._resultMessageJoins = null;
    g._forceMsgs = [];
    g._forceMsgBotls = [];
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

// C tty/topl.c:389-402: a blocking question acknowledges the one topline,
// including messages which a command has parked in the result channel.
export function restore_command_topline() {
    const g = game;
    const full = String(g._resultMessage || '');
    if (!full) return;
    const live = String(g._pending_message || '');
    const head = _topl_result_head(full, live);
    const stored = g._resultMessageJoins;
    const joins = stored?.src === full ? stored.joins : _topl_joins_snapshot(full);
    g._pending_message = head
        ? _topl_merge_result(head, live, joins?.filter(o => o < head.length))
        : live;
    g._resultMessage = null;
    g._resultMessageJoins = null;
    g._toplResultSnapshot = null;
    if (head) g._topl_unacknowledged = true;
}

// A blocking query inside eatfood runs before the occupation driver's normal
// message fold. C has only gt.toplines (topl.c:389-392); restore that prefix
// before the query's width paging and final TOPLINE_NEED_MORE acknowledgement.
export function restore_occupation_topline() {
    const g = game;
    const take = g._occBeforeInput;
    if (!take) return;
    g._occBeforeInput = null;
    const held = take();
    if (!held.text) return;
    const live = String(g._pending_message || '');
    const full = String(g._resultMessage || '');
    const head = _topl_result_head(full, live);
    const stored = g._resultMessageJoins;
    const joins = stored?.src === full ? stored.joins : _topl_joins_snapshot(full);
    const current = head
        ? _topl_merge_result(head, live, joins?.filter(offset => offset < head.length))
        : live;
    g._pending_message = _topl_merge_result(held.text, current, held.joins);
    /* _topl_merge_result returns `a` untouched when `current` is empty, leaving
     * the join side-channel keyed to some other string; the restored line's own
     * boundaries (update_topl's per-pline fit tests) must survive for the
     * plines that follow it, or they page against a single atomic message. */
    if (!current && Array.isArray(held.joins) && held.joins.length) {
        g._topl_joins = held.joins.slice();
        g._topl_joins_src = g._pending_message;
    }
    g._resultMessage = null;
    g._resultMessageJoins = null;
    g._toplResultSnapshot = null;
}

// Complete queued pline/update_topl pages before an awaited state transition.
// The port splits C's single topline into command-result and live channels;
// flush_screen alone only pages the latter. Preserve their joins and remove
// any result snapshot already present in the live channel before draining.
export async function flush_pending_messages() {
    const g = game;
    // pline.c:283-284 blocks inside MSGTYP_STOP before its caller resumes.
    // Synchronous callers can leave that pline in flight; finish its clear
    // before folding or paging the next message.
    if (g._blockingPline) await g._blockingPline;
    const live = String(g._pending_message || '');
    const full = String(g._resultMessage || '');
    /* The fprefx taste line (eat.c:2002) is still the committed topline when the
     * first eating turn's movemon pages before the stop_occupation fold runs
     * (losehp's flush on a lethal hit): C holds it IN FRONT of those plines.
     * The occupation is still set at that flush (stop_occupation comes after the
     * hit's pline), so only the occupation callback itself (_occBeforeInput,
     * which drains the committed line on its own) is excluded. */
    const _oc = g._occ_committed_topl;
    if (_oc && !_oc.postMeal && !g._occBeforeInput && !full && live
        && !live.startsWith(_oc.text)) {
        g._pending_message = _topl_merge_result(_oc.text, live, _topl_joins_snapshot(_oc.text));
        g._occ_committed_topl = null;
        return flush_pending_messages();
    }
    const head = _topl_result_head(full, live);
    const stored = g._resultMessageJoins;
    const joins = stored?.src === full ? stored.joins : _topl_joins_snapshot(full);
    g._pending_message = head
        ? _topl_merge_result(head, live, joins?.filter(offset => offset < head.length))
        : live;
    g._resultMessage = null;
    g._resultMessageJoins = null;
    g._toplResultSnapshot = null;
    /* C win/tty/topl.c:204-247 more() does not flush pending map glyphs.
     * vpline already flushed before update_topl (pline.c:273-276); draining
     * its deferred pages must not print glyphs buffered since that flush. */
    await flush_screen(1, false);
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
export function topl_force_break_after(msg, clears = false, fullLine = null, cells = null, botl = null) {
    const t = String(msg ?? '');
    if (!t) return;
    /* C display.c:2196 / wintty.c:1873-1879: the first message-window
     * display blocks in more(); another display without a new putmesg cannot
     * page that same line again. Deferred repaint callers can reach us more
     * than once before that page is drained. Keep its FIRST physical frame. */
    const shownSeq = game._toplShownSeq | 0;
    if (fullLine != null && (game._topl_force_breaks || []).some(
        (e) => e.fullLine === fullLine && e.text === t && e.fromEnd === 0
            && e.shownSeq === shownSeq))
        return;
    /* C wintty.c:1873-1879 acknowledges the message standing at EACH call.
     * Count all identical plines since an earlier break, including ones with
     * no display_nhwindow call of their own. Counting only registrations can
     * attach that earlier break and its physical frame to a later occurrence.
     * Use actual join boundaries: spaces inside one pline are not messages. */
    if (fullLine != null) {
        const joins = _topl_joins_for(fullLine) || [];
        for (const e of (game._topl_force_breaks || [])) {
            if (e.text === t && e.fullLine != null && fullLine.startsWith(e.fullLine + '  ')) {
                e.fromEnd = joins.reduce((n, j, i) => n + (j >= e.fullLine.length
                    && fullLine.slice(j + 2, joins[i + 1] ?? fullLine.length) === t ? 1 : 0), 0);
            }
        }
    }
    (game._topl_force_breaks ||= []).push({
        text: t,
        /* Registrations are made for the message that is currently last on
         * the topline.  Match that occurrence from the END so repeated combat
         * text ("It bites!", etc.) cannot force a page at its first copy. */
        fromEnd: 0,
        shownSeq,
        fullLine,
        /* the flush is followed by a cls() (gulpmu's swallowed(1)), which
         * wipes the line if more() was a no-op under WIN_STOP */
        clears,
        /* tty_display_nhwindow(WIN_MESSAGE) does not run bot()/timebot().
         * When the caller supplies the last physical status paint, retain its
         * clock too: allmain.c:244 advances moves before movebubbles() at :375
         * can reach rloc_to_core -> docrt -> swallowed -> cls -> more(). */
        frame: { cells: cells || _capture_painted_cells(),
                 statusBlankAfterDocrt: game._statusBlankAfterDocrt === true,
                 moves: botl && botl === game._lastPaintedBotl
                     && game._botlPaintedMoves != null
                     ? game._botlPaintedMoves : _painted_moves(),
                 botl: botl || _capture_botl(),
                 r1whole: !!game._status1Whole,
                 /* wintty.c:5018,5237-5238: the physical row 1 as last flushed;
                  * a later swallowed(1) BL_RESET must not reach this page */
                 r1physical: _threeStatusLines() && !_map_row20_clipped()
                     ? String(game._screen_output || '').split('\n')[21] : undefined },
    });
}
/* The usual caller shape: "C flushed the message window right here", i.e. after
 * whatever pline it just emitted.  The topline accumulator holds the WHOLE
 * window's text by then, so the break belongs after its LAST segment — the
 * boundary _topl_joins records. */
/* The terminal as of the last flush, for callers whose display_nhwindow(WIN_MESSAGE)
 * runs after newsym() calls that C's gbuf has not yet flushed to the screen. */
export function capture_flushed_cells() {
    const f = game?._lastFlushFrame;
    /* A vpline that ran inside the movemon block flushed the physical screen
     * after the last real flush_screen (pline.c:273-274; see the stamp in
     * pline()) — its frame is what a mid-movemon more() freezes.  A
     * _lastFlushFrame without a seq was installed by a caller that owns the
     * physical screen outright (js/cmd.js goto_level), so it always wins. */
    const m = game?._movemonPlinePhys;
    if (m && m.cells && (!f || !f.cells || ((m.seq | 0) > (f.seq ?? Infinity))))
        return new Map(m.cells);
    return f && f.cells ? new Map(f.cells) : _capture_painted_cells();
}
export function topl_force_break_now(clears = false, cells = null, botl = null) {
    const g = game;
    /* C ref: win/tty/topl.c tty_display_nhwindow(WIN_MESSAGE) — more() fires
     * whenever the topline is occupied, whether or not the caller blocks.  A
     * message plined earlier in the SAME command can already have been banked
     * into _resultMessage (it is painted at the next input frame), leaving
     * _pending_message empty; hand it back to the live accumulator first so
     * the break lands on it (same carry as allmain.js's amulet-wish block). */
    if (!g?._pending_message && g?._resultMessage) {
        g._pending_message = String(g._resultMessage);
        g._resultMessage = null;
    }
    const line = String(g?._pending_message || '');
    if (!line) return;
    if (ENV.FF_MLTRACE === '1')
        pushRngLogEntry(`^topl_force_break[line=${encodeURIComponent(line.slice(-96))}]`);
    const joins = (g._topl_joins_src === line && Array.isArray(g._topl_joins))
        ? g._topl_joins : null;
    const start = (joins && joins.length) ? joins[joins.length - 1] + 2 : 0;
    topl_force_break_after(line.slice(start), clears, line, cells, botl);
}
function _topl_force_break_here(seg, laterSegments = []) {
    /* topl.c:150 — more() is a no-op while WIN_STOP is live (ESC at an earlier
     * --More--), and update_topl's skip arm raises no page either. */
    if (game?._topl_win_stop) return false;
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
function _topl_force_break_entry(committed, laterSegments = null, fb = game?._topl_force_breaks) {
    if (!fb || !fb.length || !committed) return -1;
    const _owns = (e) => laterSegments == null
        || ((e.fromEnd ?? 0) | 0) === laterSegments.reduce(
            (n, later) => n + (later === e.text ? 1 : 0), 0);
    const _last = (pred) => { for (let i = fb.length - 1; i >= 0; --i) if (pred(fb[i])) return i; return -1; };
    let k = _last((e) => e.text === committed && _owns(e));
    if (k > 0) {
        const mv = fb[k].frame?.moves;
        while (k > 0 && fb[k - 1].text === committed && fb[k - 1].frame?.moves === mv) --k;
    }
    if (k < 0)
        k = _last((e) => e.text && committed.endsWith('  ' + e.text) && _owns(e));
    return k;
}
/* The pline segments of a split remainder, at its re-based join offsets. */
function _topl_remainder_segments(rem, joins) {
    if (!rem) return [];
    const out = [];
    let start = 0;
    for (const j of (joins || [])) { out.push(rem.slice(start, j)); start = j + 2; }
    out.push(rem.slice(start));
    return out;
}
function _topl_split_for_more(line, joins) {
    if (joins === undefined) joins = _topl_joins_for(line);
    if (!joins || joins.length === 0) {
        if (line && !game?._topl_prompt_echo && game?._topl_show_only !== line
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
    /* topl.c:262's strlen(toplines) counts COLUMNS: putmixed's blank-run
     * escape (\x1b[NC, pager.c:1271's glyph + 8-space pad) is N blanks on the
     * terminal, so measure the fit on the expanded text while `cum` stays
     * the raw index used to slice below. */
    const _cols = (t) => t.replace(/\x1b\[(\d+)C/g, (_, n) => ' '.repeat(+n)).length;
    let cum = joins[0];         /* length of the first pline */
    let colCum = _cols(line.slice(0, joins[0]));
    for (let i = 0; i < joins.length; i++) {
        // The pline that starts after join i (its "  " is at offset joins[i]).
        const segStart = joins[i] + 2;
        const segEnd = (i + 1 < joins.length) ? joins[i + 1] : line.length;
        const nextLen = _cols(line.slice(segStart, segEnd));
        const diesHere = line.startsWith('You die', segStart);
        /* A display_nhwindow(WIN_MESSAGE) after the segment that ends here —
         * see topl_force_break_after() above. */
        const forcedHere = _topl_force_break_here(
            segments[i], segments.slice(i + 1));
        if (diesHere || forcedHere || colCum + 2 + nextLen >= TOPL_LIMIT) {
            // Appending this pline would meet or exceed the reserve → commit here & more().
            // C ref: win/tty/topl.c update_topl fires more() when total reaches CO-1-8=71
            // (i.e., when combined_length >= TOPL_LIMIT, not > TOPL_LIMIT).
            // the sewer rat." = exactly 71 chars; C fires more() at this length.
            const committed = line.slice(0, cum);
            const remainder = line.slice(segStart);
            // Re-base the remaining join offsets to the new (remainder) string.
            const remJoins = [];
            for (let j = i + 1; j < joins.length; j++)
                remJoins.push(joins[j] - segStart);
            return [committed, remainder, remJoins];
        }
        cum += 2 + (segEnd - segStart);
        colCum += 2 + nextLen;
    }
    const _lastSeg = line.slice(joins[joins.length - 1] + 2);
    if (_lastSeg && _topl_force_break_here(_lastSeg, []))
        return [line, '', []];
    return null;                /* every joined pline fits → no more() */
}

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
// True when this is a headless replay (onEmptyQueue ends the input) and no key
// still queued is one C's more() accepts: xwaitforspace("\033 ") (getline.c,
// topl.c:230) breaks only on '\n', '\r', ESC or ' ' and beeps at the rest, so
// a --More-- raised now is never dismissed and C stays parked in it for the
// rest of the recorded input.  The generalization of cmd.js's empty-queue test
// for the zoo/court wake loop.
export function _more_never_dismissed() {
    const disp = game?.nhDisplay;
    if (!disp?.onEmptyQueue) return false;
    const q = disp.terminal?._inputQueue || [];
    return !q.some(c => c === 10 || c === 13 || c === 27 || c === 32);
}

// True when the accumulated topline owes MORE --More-- page-acks than the
// remaining input holds (headless replay only): C parks inside the first
// un-dismissable more() and never runs the statements after that pline.
// Counts every pending page break, not just whether one exists, because an
// earlier break in the same turn consumes a queued dismiss key first.
// DISPLAY-ONLY: reads only, no RNG, no state mutation.
export function _more_pages_exceed_input() {
    const disp = game?.nhDisplay;
    if (!disp?.onEmptyQueue) return false;
    const breaks = _topl_more_pages(game?._pending_message || '').length - 1;
    if (breaks <= 0) return false;
    const q = disp.terminal?._inputQueue || [];
    return breaks > q.filter(c => c === 10 || c === 13 || c === 27 || c === 32).length;
}

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
// player never presses a dismiss key), the queue is never drained — and that is
// C-faithful: C is still parked in more() there and never runs the effect
export function _defer_until_more_dismissed(fn) {
    (game._deferred_post_more ||= []).push(fn);
    if (ENV.FF_MATTACK_TRACE === '1')
        pushRngLogEntry(`^topl_more_queue[count=${game._deferred_post_more.length|0}]`);
}

// C ref: win/tty/topl.c more() — display "<topline>--More--", wait for a dismiss
// key, consuming (but ignoring) any non-dismiss keys.  No RNG is consumed.
async function _topl_more(committed, dismissMore) {
    routeTag('_topl_more', committed); /* telemetry only; inert when env unset */
    /* nhgetch clears the snapshot marker, including on a page's dismiss read.
     * Keep its identity until this more() acknowledges the copied line. */
    const resultSnapshot = game._toplResultSnapshot;
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
    if (_snap_is_stale(game._paintedSnapshot))
        game._paintedSnapshot = null;
    if (game._paintedSnapshot && game._paintedSnapshot.botl != null
        && game._paintedSnapshot.bs != null
        && (game._botlPaintSeq | 0) > (game._paintedSnapshot.bs | 0)
        && game._lastPaintedBotl) {
        game._paintedSnapshot.botl = game._lastPaintedBotl;
        game._paintedSnapshot.bs = game._botlPaintSeq | 0;
    }
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
    game._topl_last_more_committed = String(committed ?? '');
    if (ENV.FF_MLTRACE === '1')
        pushRngLogEntry(`^topl_more_enter[committed=${encodeURIComponent(String(committed).slice(0,80))} stop=${game._topl_win_stop?1:0} armed=${game._topl_win_stop_armed?1:0} urgent=${game._topl_urgent_next?1:0} pending=${encodeURIComponent(String(game._pending_message || '').slice(0,80))}]`);
    while (true) {
        const key = await nhgetch();
        game._snapMoreKeys = (game._snapMoreKeys | 0) + 1;
        if (ENV.FF_MLTRACE === '1')
            pushRngLogEntry(`^topl_more_key[key=${key == null ? 'null' : (key | 0)} stop=${game._topl_win_stop?1:0} armed=${game._topl_win_stop_armed?1:0} urgent=${game._topl_urgent_next?1:0} pending=${encodeURIComponent(String(game._pending_message || '').slice(0,80))}]`);
        if (key === 10 /* \n */ || key === 13 /* \r */) {
            morc = 0;                      /* getline.c:240-241 — break, morc stays 0 */
            break;
        }
        if (key === 27 /* ESC */ || key === 32 /* space */) {
            morc = key;                    /* getline.c:247 / :251 */
            if (key === 27)
                game._ttyDismissMore = 1;  /* getline.c:245-247 */
            break;
        }
        if ((_dismissMore && key === _dismissMore)
            || (key !== 0 && key === (game._ttyDismissMore | 0))) {
            morc = key;                    /* getline.c:238 — `c == x` */
            break;
        }
        _renderMore();
        /* C topl.c:230 xwaitforspace() retries without remember_topl().
         * nhgetch already filed this page on its first read; restoring it for
         * another key must not insert another copy into message history. */
        game._topl_history_recall = committed;
    }
    if (_dismissMore)
        game._ttyDismissMore = 0;          /* wintty.c:2844 tty_message_menu */
    /* topl.c:237-240: more() restores every covered map row with docorner,
     * including when only the --More-- marker wrapped. row_refresh skips
     * unchanged GLYPH_UNEXPLORED cells, leaving the erased terminal blank. */
    if (_moreRow > 0)
        docorner_blank_utf8_captures(1, _moreRow + 1);
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
    /* The eat occupation's committed taste line (fprefx, eat.c:2002) lives only
     * while it is still the topline; once a page that begins with it has been
     * dismissed (more() topl.c:274 runs before :290 replaces gt.toplines) the
     * stop_occupation fold (allmain.js) must not re-join it in front of later
     * plines. */
    {
        const _oc = game._occ_committed_topl;
        if (_oc && !_oc.postMeal && _oc.text
            && String(committed ?? '').startsWith(_oc.text))
            game._occ_committed_topl = null;
    }
    /* C topl.c:246 sets TOPLINE_EMPTY after more(), so update_topl:262
     * cannot join the acknowledged text to the next message.  A saved copy
     * of this same live line must expire too, including when later plines
     * joined it before the page (e.g. a pet swap followed by look_here).
     * Separate earlier result lines are not snapshots of this page. */
    if (resultSnapshot && game._resultMessage === resultSnapshot
        && (committed === resultSnapshot
            || String(committed).startsWith(resultSnapshot + '  '))) {
        game._resultMessage = null;
        game._resultMessageJoins = null;
        game._toplResultSnapshot = null;
    }
    return morc;
}

/* C hack.c:2996-3016: a RUN_LEAP step's curs_on_u() -> flush_screen(1) repaints
 * the terminal without a pline, so a --More-- raised later by a yn prompt
 * (tty_yn_function more() runs BEFORE its own flush) shows THAT paint, not the
 * pline-time one.  Refresh the lone pline frame's cells in place after such a
 * flush; its msg/seq stay, the topline is untouched. */
export function lone_frame_run_flush() {
    const f = game?._lonePlineFrame;
    if (!f || f.ux === undefined || !game.level) return;
    f.cells = _capture_painted_cells();
    f.moves = _painted_moves();
    f.botl = _capture_botl();
    f.ux = game.u?.ux;
    f.uy = game.u?.uy;
    f.runFlush = game._runFlushSeq | 0;
}

/* C win/tty/topl.c:397-398 tty_yn_function: a still-unacknowledged topline is
 * more()'d BEFORE the prompt's custompline -> flush_screen, so the --More-- is
 * drawn over the terminal as last flushed.  allmain.c:473 bot() writes the status
 * directly, so the status is live; the map is the pline-time frame.  Falls back
 * to the live-map force_more when no frame matches `msg`. */
/* Record the terminal as it stands after a flush_screen() that showed `msg`
 * (pline.c:274), for a later tty_yn_function more() to re-show (see above).
 * For callers whose message rides the result channel instead of pline(). */
export function note_lone_pline_frame(msg) {
    if (!game.level) return;
    game._lonePlineFrame = { msg: String(msg), cells: _capture_painted_cells(),
                             moves: _painted_moves(), botl: _capture_botl(),
                             ux: game.u?.ux, uy: game.u?.uy,
                             seq: (game._toplShownSeq | 0) + 1,
                             runFlush: game._runFlushSeq | 0,
                             statusSeq: game._statusPaintSeq | 0,
                             flushEpoch: _flush_epoch };
}
export async function force_more_lone_frame(msg) {
    const f = game?._lonePlineFrame;
    /* tty_yn_function's more() precedes its prompt's vpline flush
     * (topl.c:390-420).  Without a lone-message frame, preserve the latest
     * flushed map and bot() paint; pending movement/regen is not painted yet. */
    /* detect.c:1433 flushes the revealed map before browse_map's getpos tip.
     * That paint supersedes the pline's map even with no intervening hero
     * movement or status change. tty more() keeps the latest physical paint
     * (topl.c:205-248), rather than restoring the earlier message-time map. */
    /* bot() can invalidate the saved status without flushing pending map
     * changes (botl.c:259-277). Use the last flushed map and latest painted
     * status in that case too: tty_yn_function's more() precedes its prompt's
     * flush (win/tty/topl.c:390-420), so live gbuf is not yet visible. */
    if (!f || (f.msg !== msg && !(f.tail && String(msg).endsWith(f.msg)))
        || (f.flushEpoch !== undefined
            && game._lastFlushFrame?.epoch > f.flushEpoch)
        || f.botStale
        || (f.statusSeq !== undefined && (game._statusPaintSeq | 0) !== f.statusSeq)) {
        const saved = game._paintedSnapshot;
        const release = use_last_flush_snapshot();
        if (game._paintedSnapshot && game._paintedSnapshot !== saved)
            game._paintedSnapshot.lone = true;
        try {
            return await force_more(msg);
        } finally {
            release();
        }
    }
    /* A mapOnly flush frame (see force_more) goes stale once the time option's
     * clock advance flushed the screen: let force_more pick the live map. */
    const _mo = game._plineFlushFrames?.at(-1);
    if (_mo?.mapOnly && _mo.msg === f.msg && game.flags?.time
        && (_mo.moves | 0) !== (_painted_moves() | 0)) return force_more(msg);
    if (f.ux !== undefined && (f.ux !== game.u?.ux || f.uy !== game.u?.uy)
        && ((game._toplShownSeq | 0) !== (f.seq | 0)
            || (game._runFlushSeq | 0) !== (f.runFlush | 0)))
        return force_more(msg);
    const saved = game._paintedSnapshot;
    /* C topl.c:390-392 more() keeps the physical status window.  A direct
     * curs_on_u()/bot() since this pline (end.c:743 savelife) can repaint it
     * without advancing moveloop's statusSeq; retain that latest paint. */
    /* lone: this IS the terminal as last flushed (checked above), not a
     * leftover movemon snapshot, so force_more must not drop it as stale. */
    game._paintedSnapshot = { cells: f.cells, moves: f.moves, lone: true,
                              botl: game._lastPaintedBotl || f.botl || _capture_botl() };
    try {
        return await force_more(msg);
    } finally {
        game._paintedSnapshot = saved;
    }
}

// C tty display_nhwindow: acknowledge all pending message pages in order.
function _botl_text_window_open() {
    // wintty.c:1921-1922 calls more() without flushing pending status changes.
    return game._lastPaintedBotl || _capture_botl();
}
export async function force_more_pages(full, retainFinalFrame = true, textWindowOpens = false,
                                       acknowledgedPrefix = null) {
    /* wintty.c:1921,1873-1882: opening a window acknowledges the existing
     * topline without emitting it again. Under WIN_STOP the standing text
     * has already been accounted for in the hidden history buffer. */
    if (game._topl_win_stop && full === game._pending_message) return;
    const joins = _topl_joins_snapshot(full);
    const pages = _topl_more_pages(full, joins);
    const frames = game._plineFlushFrames?.slice() || [];
    /* nhgetch clears the live registrations at each read. C blocks inside
     * each display_nhwindow(WIN_MESSAGE) (wintty.c:1873-1879), so later
     * deferred pages still own their boundaries and pre-clear frames. */
    const forcedBreaks = game._topl_force_breaks?.slice() || [];
    let consumed = 0;
    /* The previous page's more() result, and whether that page was raised by
     * the incoming message's own update_topl (topl.c:274). */
    let prevMorc = 0, prevOwned = false;
    for (let i = 0; i < pages.length; ++i) {
        if (i > 0 && i + 1 < pages.length && (game._topl_win_stop || game._topl_win_stop_armed)
            && _topl_force_break_entry(pages[i], null, forcedBreaks) < 0) {
            const um = (game._topl_urgent_marks || []).find(
                (m) => m && pages[i].length > m.length + 2 && pages[i].endsWith('  ' + m));
            if (um) {
                const prefix = pages[i].slice(0, pages[i].length - um.length - 2);
                const tail = um + '  ' + pages[i + 1];
                const tailStart = consumed + prefix.length + 2;
                const tailJoins = joins.filter(j => j >= tailStart && j < tailStart + tail.length)
                    .map(j => j - tailStart);
                const tailPages = _topl_more_pages(tail, tailJoins);
                if (tailPages[0] !== um)
                    pages.splice(i, 2, prefix, ...tailPages);
            }
        }
        /* topl.c:300: when the display_nhwindow(WIN_MESSAGE) that raised these
         * pages acknowledged only acknowledgedPrefix (docrt's cls() more(),
         * display.c:2196), each later pline pages its predecessor and the
         * last one stands on the topline, unacknowledged. */
        /* An ESC at the prefix's more() set WIN_STOP, so those
         * later plines skip redotoplin (topl.c:232-234,257,300): the
         * suppression path below owns them, and nothing stands. */
        if (acknowledgedPrefix !== null && i === pages.length - 1
            && consumed >= acknowledgedPrefix.length + 2 && pages[i]
            && !game._topl_win_stop) {
            game._pending_message = pages[i];
            return true;
        }
        const page = pages[i];
        const end = consumed + page.length;
        const laterSegments = _topl_remainder_segments(full.slice(end + 2),
            (joins || []).filter(j => j >= end + 2).map(j => j - end - 2));
        // Explicit WIN_MESSAGE flushes retain their own physical frame,
        // including an engulf page emitted before swallowed(1) cleared it.
        const forcedIndex = _topl_force_break_entry(page, laterSegments, forcedBreaks);
        let frame = forcedIndex >= 0
            ? forcedBreaks[forcedIndex].frame
            : _pline_flush_frame_select(end, full, frames);
        /* topl.c:139-140: a wrapped atomic message blocks inside its OWN
         * redotoplin(), before the following pline can flush a newer turn.
         * Its frame is keyed at the preceding separator, including -2 for
         * the first message (pline.c:273-276). */
        if (forcedIndex < 0 && _topl_wordwrap(page, TOPL_CO - 1).length > 1
            && !(joins || []).some(j => j >= consumed && j < end))
            frame = _pline_flush_frame_select(consumed - 2, full, frames) || frame;
        if (!retainFinalFrame && i === pages.length - 1) frame = null;
        if (!frame && retainFinalFrame && i === pages.length - 1) {
            // No following pline forces the last page; display_nhwindow
            // retains the physical screen flushed by its last message.
            for (let j = frames.length - 1; j >= 0; --j) {
                const f = frames[j];
                /* a later flush than this pline's own (tmp_at's flush_screen,
                 * display.c:1292) is what the terminal still shows */
                if (f.flushEpoch < (game._paintedSnapshot?.epoch ?? 0)) continue;
                if (f.off >= consumed - 2 && full.slice(f.off + 2) === f.msg) {
                    // The final message has no later pline forcing its page.
                    // Retain its map, but use the current physical status: an
                    // explicit bot() (for example newuhs after fainting) may
                    // have repainted that window since this pline flush.
                    frame = { ...f, botl: game._lastPaintedBotl || f.botl };
                    break;
                }
            }
            /* C display.c:2196 / wintty.c:1873-1879: acknowledging the
             * standing topline does not flush pending status or map changes.
             * A lone message may have no per-pline frame; keep the terminal's
             * last paint rather than letting force_more read live regen HP.
             * A caller's installed snapshot already is that last paint
             * (artifact.c:951-953 flushes the blast pline before losehp). */
            if (!frame && !game._paintedSnapshot) frame = { cells: capture_flushed_cells(),
                moves: game._botlPaintedMoves ?? _painted_moves(),
                botl: game._lastPaintedBotl || null };
            /* C display.c:2196 / wintty.c:1873-1879: display_nhwindow's
             * message more() does not flush pending map or status changes.
             * A short first pline has no keyed flush frame; retain the last
             * physical paint rather than rendering live post-turn state. */
            if (!frame && game._lastPaintedBotl && !game._paintedSnapshot) {
                frame = { cells: capture_flushed_cells(),
                          moves: game._botlPaintedMoves ?? _painted_moves(),
                          botl: game._lastPaintedBotl, r1whole: !!game._status1Whole };
            }
        }
        if (typeof process !== 'undefined' && ENV?.FF_PAGE_TRACE === '1') {
            pushRngLogEntry(`^force_pages_select[i=${i} consumed=${consumed} end=${end}`
                + ` page=${encodeURIComponent(String(page).slice(0,72))}`
                + ` forced=${forcedIndex} frame=${frame ? 1 : 0} off=${frame?.off ?? -1}`
                + ` fhp=${frame?.botl?.uhp ?? -1} livehp=${game.u?.uhp ?? -1}`
                + ` savedhp=${game._paintedSnapshot?.botl?.uhp ?? -1}]`);
        }
        const saved = game._paintedSnapshot;
        const savedTurn = game._movemonMsgTurn;
        const savedInMore = game._inMovemonMore;
        const savedFullCtx = game._moreFullCtx;
        /* display_nhwindow(WIN_MESSAGE) does not flush pending status
         * (wintty.c:1873-1881). If the pline log was already drained, the
         * last page still holds the terminal's last flush, not live HP. */
        const releasePhysical = !frame && retainFinalFrame && !textWindowOpens
            && i === pages.length - 1
            ? use_last_flush_snapshot() : () => {};
        // A prompt entered after the world turn uses the current screen for
        // its final outstanding message; earlier overflow pages retain their
        // original pline flushes.
        if (!retainFinalFrame && i === pages.length - 1) {
            game._paintedSnapshot = null;
            game._movemonMsgTurn = null;
            game._inMovemonMore = false;
        }
        /* C wintty.c:1921-1922: opening a text window acknowledges the standing
         * message without flushing.  Keep the last painted status, including
         * any bot() since the message, while pending damage stays unpainted. */
        if (frame) game._paintedSnapshot = {
            cells: frame.cells, moves: frame.moves, r1whole: frame.r1whole,
            statusBlankAfterDocrt: frame.statusBlankAfterDocrt,
            page: true,
            botl: (textWindowOpens && i === pages.length - 1) ? _botl_text_window_open()
                : (frame.botl || null),
        };
        /* wintty.c:2277-2283: an URGENT message wipes a live WIN_STOP and holds
         * WIN_NOSTOP across its own update_topl, so an ESC'd earlier page does
         * not suppress it (mhitu.c:1337 "engulfs you!" after ESC at the page
         * before it). */
        if (i > 0 && page && (game._topl_urgent_marks || []).some(
            (u) => page === u || page.startsWith(u + '  '))) {
            game._topl_win_stop_armed = false;
            game._topl_win_stop = false;
        }
        let pageShown = page;
        if (i > 0 && page && (game._topl_win_stop || game._topl_win_stop_armed)) {
            const u = (game._topl_urgent_marks || []).find(
                (m) => m && page.endsWith('  ' + m));
            if (u) {
                pageShown = u;
                game._topl_win_stop_armed = false;
                game._topl_win_stop = false;
            }
        }
        // Keep the remaining message occurrences visible to force_more's
        // registration lookup too (wintty.c:1873-1879 acknowledges this
        // occurrence of the standing line, not an earlier identical pline).
        game._moreFullCtx = { full, start: consumed, joins };
        /* topl.c:257,274,300: ESC at the more() this page's first message
         * raised from its own update_topl set WIN_STOP after that message
         * sampled skip, so redotoplin() still draws it.  When it wraps,
         * redotoplin's own more() (topl.c:139-140) reads a key, and
         * tty_nhgetch clears WIN_STOP (wintty.c:4065-4066): this page and
         * the ones after it page normally (stealamulet's 81-column
         * worn_item_removal pline, steal.c:328, after ESC at "hits!"). */
        if (prevMorc === 27 && prevOwned && pageShown === page
            && (game._topl_win_stop || game._topl_win_stop_armed)
            && _topl_wordwrap(_topl_remainder_segments(page,
                (joins || []).filter(j => j >= consumed && j < end)
                    .map(j => j - consumed))[0] || '', TOPL_CO - 1).length > 1) {
            game._topl_win_stop_armed = false;
            game._topl_win_stop = false;
        }
        prevMorc = 0;
        try {
            if (pageShown && (game._topl_win_stop || game._topl_win_stop_armed)) {
                /* topl.c:262-290 still joins or replaces gt.toplines for EACH
                 * suppressed pline. A page can contain several messages;
                 * treating it as one changes the hidden buffer's length and
                 * the later "You die" fit test (topl.c:264,298-299). */
                const pageJoins = pageShown === page
                    ? (joins || []).filter(j => j >= consumed && j < end)
                        .map(j => j - consumed) : [];
                for (const message of _topl_remainder_segments(pageShown, pageJoins))
                    await force_more(message);
            } else if (pageShown) {
                prevMorc = await force_more(pageShown);
            }
        } finally {
            releasePhysical();
            game._paintedSnapshot = saved;
            game._movemonMsgTurn = savedTurn;
            game._inMovemonMore = savedInMore;
            game._moreFullCtx = savedFullCtx;
        }
        const consumedBreak = _topl_force_break_entry(page, laterSegments);
        if (consumedBreak >= 0) game._topl_force_breaks.splice(consumedBreak, 1);
        /* An explicit display_nhwindow break, or a page whose more() was its
         * own wrap, has no incoming owner past its skip sample. */
        prevOwned = forcedIndex < 0 && _topl_wordwrap(page, TOPL_CO - 1).length === 1;
        if (forcedIndex >= 0) forcedBreaks.splice(forcedIndex, 1);
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
export async function force_more(committed, dismissMore, alreadyPainted = false,
                                 keepLastStanding = false, incomingFrame = null,
                                 acknowledgeOnly = false) {
    const g = game;
    if (!g) return 0;
    /* wintty.c:1873-1882 display_nhwindow only acknowledges existing text.
     * An already-plined message must not re-enter update_topl's history
     * bookkeeping when the suppressed-page path below runs. */
    if (acknowledgeOnly && (g._topl_win_stop || g._topl_win_stop_armed)) return 0;
    /* Single-shot: done()'s forced bot() (end.c:1043-1046, transferred in
     * bot()) repainted the restored hero between the tutorial reset pline
     * (nhlua.c:1738) and this drain, so THIS window's last page — the standing
     * "Resetting time to move #N." line, paged here rather than by its own
     * pline — shows that paint while earlier pages keep their frozen pins.
     * Consume at entry so the mark can never outlive the first drain. */
    const _tutFreshLastPage = !!g._tutorialFreshLastPage;
    g._tutorialFreshLastPage = false;
    if (typeof process !== 'undefined' && ENV?.FF_PAGE_TRACE === '1'
        && String(committed || '').includes('crackles with electricity')) {
        pushRngLogEntry(`^force_more_stack[${encodeURIComponent(String(new Error().stack || '').split('\n').slice(1, 7).join(' <- '))}]`);
    }
    // MSGTYP_STOP pages a line already painted by update_topl.  That call
    // can have sampled skip=false before its own more() set WIN_STOP;
    // tty_display_nhwindow tests TOPLINE_NEED_MORE, not WIN_STOP (wintty.c:1873).
    if (!alreadyPainted && (g._topl_win_stop || g._topl_win_stop_armed)) {
        routeTag('force_more', committed); /* telemetry only; inert when env unset */
        g._topl_win_stop_armed = false;
        g._topl_win_stop = true;
        g._pline_no_vision_recalc = true;
        try {
            await pline(String(committed ?? ''));
        } finally {
            g._pline_no_vision_recalc = false;
        }
        return 0;                          /* no page raised, so no morc */
    }
    routeTag('force_more', committed); /* telemetry only; inert when env unset */
    const _full = String(committed ?? '');
    const _joins = _topl_joins_snapshot(_full);
    const _pages = _topl_more_pages(_full, _joins);
    let _morc = 0;
    const _frameLog = g._movemonPageFrames;
    const _flushFrames = g._plineFlushFrames?.slice() || [];
    let _consumed = 0;
    let _prevEnd = -1;
    for (let i = 0; i < _pages.length; ++i) {
        if (keepLastStanding && _pages.length >= 2 && i === _pages.length - 1) {
            if (_pages[i])
                g._pending_message = _pages[i];
            break;
        }
        const _end = _consumed + _pages[i].length;
        const _ownOff = _prevEnd;
        _prevEnd = _end;
        _consumed = _end + 2;
        /* _topl_more_pages ends a wrapped single pline with an empty remainder
         * (already fully shown by the page before it); it owes no more(). */
        if (!_pages[i] && i) continue;
        g._pending_message = _pages[i];
        /* done()'s forced bot() (end.c:1043-1046) runs after the tutorial
         * restore's "Resetting time" pline (nhlua.c:1738) and before the more()
         * that pages it, so the LAST page shows the restored hero while the
         * earlier pages (raised by plines before the memcpy) keep the old one. */
        if (g._tutorialStatusOverride?.freshOnLastPage
            && !_pages.slice(i + 1).some(Boolean))
            g._tutorialStatusOverride = null;
        /* C vpline() flushes the screen before the putmesg() whose update_topl
         * raises this page's more() (pline.c:273-274), so a page that was
         * raised by a pline of the COMMAND (teleds' "You materialize..." then
         * intemple's "intones:") froze the map as of that pline — not the
         * map after the world block's movemon, which is what the movemon
         * snapshot installed below holds.  The pline-flush log records the
         * exact frame (the same select force_more_pages uses); a page with no
         * record falls through to the existing per-page / ambient choice. */
        /* A caller that pages a joined topline one page at a time (look_here's
         * window, js/look-window.js) hands each page in alone; the flush frame
         * recorded for the NEXT message lives in the joined line's offsets, so
         * select against that line (pline.c:273-274 froze the frame there). */
        const _mfc = g._moreFullCtx;
        const _useCtx = !!_mfc && _mfc.full.slice(_mfc.start, _mfc.start + _full.length) === _full;
        let _pf = _useCtx
            ? _pline_flush_frame_select(_end + _mfc.start, _mfc.full, _flushFrames)
            : null;
        if (!_pf) _pf = _pline_flush_frame_select(_end, _full, _flushFrames);
        /* A queued incoming vpline already flushed before this drain. Its
         * update_topl() raises the LAST page here; earlier pages still belong
         * to the intervening messages (pline.c:266-276, topl.c:274). */
        // A wrapped message has an empty trailing page, which raises no more().
        if (incomingFrame && !_pages.slice(i + 1).some(Boolean))
            _pf = incomingFrame;
        // C pline.c:273-276 flushes before update_topl() raises more()
        // (topl.c:273-275). An exact following-message frame owns this page
        // even when no movemon/occupation snapshot was installed beforehand.
        /* topl.c:139-140: width wrapping raises more() in this message's
         * redotoplin(), before any following message's flush.  Match the
         * same own-message selection used by flush_screen's pager. */
        if (_topl_wordwrap(_pages[i], TOPL_CO - 1).length > 1
            && !(_joins || []).some(j => j >= _end - _pages[i].length && j < _end))
            _pf = _pline_flush_frame_select(_end - _pages[i].length - 2, _full, _flushFrames) || _pf;
        const _nextPlineFrame = !!_pf;
        /* The LAST page has no later pline; its more() comes from its OWN
         * pline's redotoplin/yn prompt, after that pline's flush_screen
         * (pline.c:273-277), so the frame is the one keyed at the end of the
         * text before it. */
        /* g._moreFromCls: this more() is cls()'s display_nhwindow(WIN_MESSAGE)
         * (display.c:2196), not a pline's, so the last page shows the status as of
         * the latest bot(), not the flush frame of its own pline. */
        const _lastFromCls = g._moreFromCls && i === _pages.length - 1;
        /* A page holding several joined plines was last flushed by its LAST
         * pline (pline.c:273-274), not its first: the more() raised after it
         * (a prompt or tip) shows the map as of that latest flush. */
        /* end.c:1043-1046's bot() updates only status before the death
         * prompt.  Its first page also keeps the last joined pline's map:
         * tty_yn_function's more() precedes the prompt flush (topl.c:390).
         * Later vision_recalc/newsym changes are still only in gbuf. */
        /* A first page holding several joined plines whose keyed -2 lone frame
         * only prefixes it: the lone frame froze the map at the FIRST pline's
         * flush, but the more() raised by the next prompt (getlin's '#',
         * tty_getlin) shows the terminal as the LAST joined pline flushed it
         * (pline.c:273-274) -- here after the pet had already moved.
         * Not when force_more_pages already installed this page's frame
         * (`page`): that is the flush of the FOLLOWING pline whose
         * update_topl raised this more() (pline.c:273-274, topl.c:274), so
         * its bot() status -- after mdamageu -- is what the page shows. */
        const _loneFramePrefixOnly = i === 0 && !_pf && !g._paintedSnapshot?.page
            && (_flushFrames.find((f) => f.off === -2
                && _full.startsWith(f.msg) && f.msg !== _full) !== undefined);
        const _joinedPlineFrame = !_pf && (i > 0 || g._liveStatusMore || _loneFramePrefixOnly) && !_lastFromCls
            ? _pline_flush_frame_select_within(_ownOff, _end, _full, _flushFrames) : null;
        if (_joinedPlineFrame) _pf = _joinedPlineFrame;
        if (!_pf && i > 0 && !_lastFromCls) _pf = _pline_flush_frame_select(_ownOff, _full, _flushFrames);
        if (!_pf && i > 0 && !_lastFromCls) _pf = _frameLog?.[i];
        /* ...and when cls()'s caller installed that terminal (find_trap,
         * use_last_flush_snapshot: the latest flush, vpline stamps included,
         * plus the latest bot()), its own pline's flush frame is OLDER than
         * what C shows: the more() comes after every later flush. */
        const _clsOwnsFrame = _lastFromCls && !!g._paintedSnapshot;
        let _ownFlushPf = false;
        if (!_pf && i > 0 && !_clsOwnsFrame) { _pf = _pline_flush_frame_select(_ownOff, _full, _flushFrames); _ownFlushPf = !!_pf; }
        if (!_pf && i > 0 && !_clsOwnsFrame) _pf = _frameLog?.[i];
        /* A lone first message whose more() is raised by the NEXT prompt (not by a
         * later pline) froze the map at its own pline's flush; the keyed -2 frame
         * records that (see _pline_flush_frame_record callers). */
        let _lonePf = false;
        let _standCells = null;
        if (!_pf && i === 0 && _pages.length === 1 && _full === _pages[0]) {
            const _nf = _flushFrames[_flushFrames.length - 1];
            /* C pline.c:273-276 / topl.c:205-248: more() retains the
             * latest physical paint. An older joined line can have identical
             * text and status; it must not replace a later flush's map. */
            if (_nf && _nf.off > 0 && _nf.msg === _full
                && _nf.flushEpoch >= (g._lastFlushFrame?.epoch ?? 0)
                && _nf.statusSeq === (g._statusPaintSeq | 0))
                _standCells = _nf.cells;
        }
        if (!_pf && i === 0) {
            /* tty bot()/timebot() before the prompt repaints status and, with it,
             * the physical map (allmain.c:473-478): the frozen frame holds only
             * while neither the status scalars nor (with the time option) the
             * turn counter moved since that pline. */
            const _bi = (o) => JSON.stringify(o, (k, v) => typeof v === 'bigint' ? String(v) : v);
            const _lf = _pline_flush_frame_select(-2, _full, _flushFrames);
            /* C allmain.c:473-480: either botl/botlx or time_botl causes
             * curs_on_u() to flush the post-turn map.  Regeneration can do
             * this even without the time option, invalidating the pline's
             * mapOnly frame before the next prompt's more(). */
            /* C hack.c:3000-3008: runmode_delay_output() also flushes before
             * a repeated command, including fast moves within the same turn.
             * That paint supersedes the map even when status and moves match. */
            if (_lf && ((_lf.mapOnly
                && _lf.runFlush === (g._runFlushSeq | 0)
                && (_lf.statusSeq === undefined || _lf.statusSeq === (g._statusPaintSeq | 0))
                && !(g.flags?.time && (_lf.moves | 0) !== (_painted_moves() | 0))) || (_lf.turn !== undefined && !(g.flags?.time && _lf.turn !== g.moves)
                && _bi(_capture_botl()) === _bi(_lf.botl ?? _capture_botl())))) {
                _pf = _lf; _lonePf = true;
            }
        }
        const _sv = g._paintedSnapshot;
        /* C pline.c:273-276 flushes before each joined message.  The final
         * page retains that map even without an ambient snapshot: later
         * newsym() updates have not reached the terminal (display.c:2237-2260). */
        /* done()'s early bot() (end.c:1043-1046) paints only the status; the
         * map stays as the LAST page's own pline flushed it (pline.c:273-274)
         * until paranoid_query's more() (topl.c:397-402).  Stoning with a
         * blindness timeout ending the same turn: make_blinded's "You can see
         * again." flushes the blind map, then toggle_blindness's vision_recalc
         * (potion.c:348) only updates gbuf, never the terminal. */
        const _doneOwnFrame = !!_pf && _pf.off === _ownOff && g._liveStatusMore
            && i === _pages.length - 1
            && (_pf.statusSeq | 0) === (g._statusPaintSeq | 0);
        /* A LAST page raised by the next prompt rather than a later pline: if
         * moveloop's guarded bot() + curs_on_u() flush (allmain.c:474-480) ran
         * after its own pline's flush, the terminal shows the post-turn map. */
        const _ownFlushSuperseded = !_nextPlineFrame && !_lastFromCls && _pf && i > 0 && i === _pages.length - 1
            && _pf.statusSeq !== undefined && _pf.statusSeq !== (g._statusPaintSeq | 0);
        const _usePlineFrame = _pf && !_ownFlushSuperseded
            && (_nextPlineFrame || _joinedPlineFrame || _sv || _lonePf || _doneOwnFrame);
        /* A mapOnly frame froze only the MAP at its pline; bot() repainted the status
         * afterwards (allmain.c:473-478), so its clock is the live one. */
        if (_usePlineFrame) g._paintedSnapshot = { cells: _pf.cells, moves: (_lonePf && _pf.mapOnly) ? _painted_moves() : _pf.moves, botl: _pf.botl || null };
        /* A mapOnly frame (cmd.js wield_tool, "You now wield") freezes the MAP as
         * of its pline, but its more() is raised by the re-applied command's
         * getdir prompt AFTER the wield turn's bot() (allmain.c:474) — so the
         * status turn counter is the post-turn value, not the wield-time one.
         * C ref: use_whip apply.c:2964-2968 (ECMD_TIME + cmdq re-apply). */
        if (_usePlineFrame) g._paintedSnapshot = { cells: _pf.cells, moves: _pf.mapOnly ? (g.moves | 0) : _pf.moves, botl: _pf.botl || null };
        /* A LAST page whose more() was not raised by a later pline of this window
         * and which fits the line (no width-wrap more() inside its own
         * redotoplin, topl.c:157-160) is paged at the next flush_screen(1) —
         * pline.c:274 of the NEXT message, or the input-time bot() — so its
         * status row is the one painted THEN, after any mdamageu/losehp that
         * ran between this message and that flush, not as of its own pline. */
        const _ownStatusLive = _ownFlushPf && i === _pages.length - 1
            && _pages[i].length < 80;
        /* C topl.c:274,390-392: a standing joined line keeps its last pline's
         * map, but a later bot() replaces the physical status before more().
         * The within-page frame above is that line's OWN flush, not the
         * following message's flush. Preserve the latest painted status
         * (pline.c:274, display.c:2236-2237), including a lethal hit's HP. */
        const _joinedStatusPaint = _joinedPlineFrame && i === _pages.length - 1
            && _pages[i].length < 80
            && !(_sv && _sv.page && _sv.botl) ? g._lastPaintedBotl : null;
        /* The tutorial-exit mark from force_more's entry: the LAST page is the
         * standing reset line, and a bot() (done()'s) painted since its pline,
         * so its status row renders the live line (botl:null) while its map
         * keeps the page's own pline-flush cells (the paint moved no map). */
        const _tutFreshLive = _tutFreshLastPage && i === _pages.length - 1;
        /* The T: ladder (bot2()'s time field) reads _paintedSnapshot.moves even
         * when botl is null, so the live-paint mark must refresh the clock too:
         * _painted_moves() here is exactly what done()'s bot() put on the line. */
        if (_usePlineFrame) g._paintedSnapshot = { cells: _pf.cells, moves: _tutFreshLive ? (_painted_moves() | 0) : _pf.moves, botl: (_ownStatusLive || _tutFreshLive || (g._liveStatusMore && i === _pages.length - 1)) ? null : (_joinedStatusPaint || _pf.botl || null),
            /* pline.c:274: this page predates a later docrt()'s cls(). */
            statusBlankAfterDocrt: (_ownStatusLive || _tutFreshLive || _joinedStatusPaint
                || (g._liveStatusMore && i === _pages.length - 1))
                ? g._statusBlankAfterDocrt === true : _pf.statusBlankAfterDocrt };
        if (_usePlineFrame) g._paintedSnapshot = { cells: _pf.cells, moves: _tutFreshLive ? (_painted_moves() | 0) : _pf.moves, botl: (_ownStatusLive || _tutFreshLive || (g._liveStatusMore && i === _pages.length - 1)) ? null : (_joinedStatusPaint || _pf.botl || null) };
        /* C pline.c:273-276 flushes status before update_topl() raises more().
         * A later deferred docrt()->cls() may have cleared it by the time we
         * drain this page; retain the blankness of the selected flush too. */
        if (_usePlineFrame)
            g._paintedSnapshot.statusBlankAfterDocrt = _pf.statusBlankAfterDocrt;
        if (_usePlineFrame && !_pf.mapOnly && g._paintedSnapshot.botl === _pf.botl)
        if (_usePlineFrame) g._paintedSnapshot = { cells: _pf.cells, moves: _tutFreshLive ? (_painted_moves() | 0) : _pf.moves, botl: (_ownStatusLive || _tutFreshLive || (g._liveStatusMore && i === _pages.length - 1)) ? null : (_joinedStatusPaint || _pf.botl || null) };
        /* topl.c:205-248: more() holds the physical status at its pline
         * flush, including whether a later cls() has since cleared it. */
        if (_usePlineFrame && !_pf.mapOnly && g._paintedSnapshot.botl === _pf.botl) {
            g._paintedSnapshot.statusBlankAfterDocrt = _pf.statusBlankAfterDocrt;
            /* The LAST page's more() comes after everything since its flush:
             * a BL_RESET bot() there (done()'s forced botlx, end.c:1045-1046
             * -> botl.c:1670-1672) rewrote every row-1 field over map y=20
             * (wintty.c FORCE_RESET), so the pline-time physical row is gone
             * even when no status value changed.  Any page more()'d by the next
             * pline (topl.c:274) -- an earlier page, or a last page whose
             * follower's flush frame was found (pline.c:273-274) -- blocked
             * there, before that bot(). */
            if (!(i === _pages.length - 1 && !_nextPlineFrame && g._status1Whole && _pf.botlSeq !== undefined
                  && (_pf.botlSeq | 0) !== (g._botlPaintSeq | 0)))
                g._paintedSnapshot.r1physical = _pf.r1physical;
        }
        /* A page raised by a C display_nhwindow(WIN_MESSAGE) (topl_force_break_after)
         * froze the terminal at that flush: gulpmu's "The <foo> engulfs you!"
         * pages (mhitu.c:1370) BEFORE swallowed(1)'s cls(), so the whole level
         * is still on screen (as force_more_pages / the split loop do). */
        const _breakFull = _useCtx ? _mfc.full : _full;
        const _breakEnd = _end + (_useCtx ? _mfc.start : 0) + 2;
        const _breakJoins = _useCtx ? (_mfc.joins ?? _topl_joins_snapshot(_breakFull)) : _joins;
        const _breakLater = _topl_remainder_segments(_breakFull.slice(_breakEnd),
            (_breakJoins || []).filter(j => j >= _breakEnd)
                .map(j => j - _breakEnd));
        const _fbk = _topl_force_break_entry(_pages[i], _breakLater);
        const _fbFrame = _fbk >= 0 ? (g._topl_force_breaks[_fbk].frame || null) : null;
        if (_fbFrame) {
            g._paintedSnapshot = { cells: _fbFrame.cells, moves: _fbFrame.moves,
                                   statusBlankAfterDocrt: _fbFrame.statusBlankAfterDocrt,
                                   botl: _fbFrame.botl || null, r1whole: _fbFrame.r1whole,
                                   r1physical: _fbFrame.r1physical };
            g._topl_force_breaks.splice(_fbk, 1);
        }
        /* pline.c:273-274 flushes the screen before every message, so a fresh lone
         * message paged after the hero's turn counter advanced (prayer's
         * pleased() after the 3-turn nomul) shows the CURRENT map; a first-
         * overflow snapshot left over from an earlier turn's movemon window
         * (T:31 here, C T:34) is stale. */
        /* force_more_pages selected its frame for this exact page. C blocks
         * inside the raising pline's more() (pline.c:273-276, topl.c:274),
         * before subsequent turns run, so its older move count is valid. */
        const _staleSnap = !_usePlineFrame && !_fbFrame && i === 0 && !!_sv
            && !_sv.lone && !_sv.page && !g._inMovemonMore && !g._inMovemonBlock
            && (_sv.moves | 0) < (g.moves | 0);
        if (_staleSnap || _ownFlushSuperseded) g._paintedSnapshot = null;
        /* force_more_pages already installed THIS page's own frame (`page`): a
         * later flush frame with identical text (two "A kobold zombie suddenly
         * appears close by!" in a zoo fill) is not this page's flush. */
        const _standSnap = !!_standCells && !_usePlineFrame && !_fbFrame && !_staleSnap && !!_sv
            && !_sv.page;
        if (_standSnap) g._paintedSnapshot = { ..._sv, cells: _standCells };
        _morc = await _topl_more(_pages[i], dismissMore);
        if (_usePlineFrame || _fbFrame || _staleSnap || _ownFlushSuperseded) g._paintedSnapshot = _sv;
        if (_morc === 27 && i === _pages.length - 2 && _pages[i + 1] === 'You die...'
            && _pages[i].length + 2 + _pages[i + 1].length >= TOPL_LIMIT) {
            g._pending_message = '';
            break;
        }
        const _dieClears = String(_pages[i + 1] ?? '').startsWith('You die')
            && _pages[i].length + 2 + _pages[i + 1].length < TOPL_LIMIT;
        const _remaining = _full.slice(_consumed);
        const _remainingJoins = (_joins || []).filter(j => j >= _consumed)
            .map(j => j - _consumed);
        const _messages = _topl_remainder_segments(_remaining, _remainingJoins);
        const _owner = _messages[0] || '';
        const _urgent = g._topl_urgent_marks || [];
        const _ownerUrgent = _urgent.includes(_owner);
        if (_morc === 27) {
            /* C wintty.c:2277-2283: an urgent owner holds WIN_NOSTOP
             * during more(), so ESC cannot set WIN_STOP.  A later urgent
             * message instead clears WIN_STOP and wipes everything before
             * it.  Deferred paging must resume at that message, retaining
             * its original offsets for the pline-time frame lookup. */
            let urgentOffset = _ownerUrgent ? 0 : -1;
            let offset = _owner.length + 2;
            let suppressed = _owner;
            for (let j = 1; urgentOffset < 0 && !_dieClears
                 && _owner.length < TOPL_CO && j < _messages.length; ++j) {
                /* topl.c:264,298-299: a fitting "You die" clears STOP
                 * before a later urgent message can wipe the line. */
                const fits = suppressed.length + 2 + _messages[j].length < TOPL_LIMIT;
                /* wintty.c:2277-2283 clears WIN_STOP for ATR_URGENT before
                 * update_topl's fitting "You die" test (topl.c:264). */
                if (_urgent.includes(_messages[j])) urgentOffset = offset;
                else if (fits && _messages[j].startsWith('You die')) break;
                suppressed = fits ? suppressed + '  ' + _messages[j] : _messages[j];
                offset += _messages[j].length + 2;
            }
            if (urgentOffset >= 0) {
                g._topl_win_stop_armed = false;
                g._topl_win_stop = false;
                if (urgentOffset > 0) {
                    _consumed += urgentOffset;
                    _prevEnd = _consumed - 2;
                    _pages.splice(i + 1, _pages.length,
                        ..._topl_more_pages(_remaining.slice(urgentOffset),
                            _remainingJoins.filter(j => j >= urgentOffset)
                                .map(j => j - urgentOffset)));
                }
                continue;
            }
        }
        /* wintty.c:2277-2282: an URGENT owner holds WIN_NOSTOP across its own
         * update_topl, so ESC on the page before it does not suppress it
         * (lava_effects trap.c:6933 "You burn to a crisp..." after ESC at
         * "Other items in your inventory have been destroyed."). */
        const _lastUrgent = (g._topl_urgent_marks || []).some(
            (u) => String(_pages[i + 1] ?? '') === u);
        /* A final page may contain several plines that fit together. Only
         * its first message entered update_topl before this ESC set WIN_STOP
         * (topl.c:257,274,300); later joined messages are buffered, not drawn. */
        /* topl.c:257,274,300: a deferred join overflow has an incoming
         * update_topl owner even when this drain is not MSGTYP_STOP. Its
         * skip was sampled before more() set WIN_STOP, so it still paints.
         * Explicit display_nhwindow breaks and a message's own wrapping
         * have no incoming owner. */
        const _paintOwner = alreadyPainted || (_fbk < 0
            && (_joins || []).includes(_end)
            && _topl_wordwrap(_pages[i], TOPL_CO - 1).length === 1);
        const _joinedOwner = _paintOwner && _messages.length > 1
            && _owner.length < TOPL_CO;
        if (_morc === 27 && i === _pages.length - 2 && !_dieClears && !_lastUrgent
            && !_joinedOwner) {
            g._topl_win_stop_armed = false;
            g._topl_win_stop = true;
            /* The owner is the pline whose own
             * update_topl raised this more(), so skip was sampled FALSE and
             * :300 redotoplin() draws it after the ESC (seed fx-mattackm
             * "You see here ..." after the look_here dfeature page). */
            if (_paintOwner && _pages[i + 1]) {
                g._pending_message = _pages[i + 1];
                g._topl_win_stop_buf = _pages[i + 1];
            } else
                g._pending_message = '';
            break;
        }
        /* update_topl samples skip once PER MESSAGE (topl.c:257), not per
         * page.  Only the first message after this page was already inside
         * update_topl when more() set WIN_STOP; later messages which would
         * have joined it must still be buffered without addtopl (:266-270).
         * Keep the genuine join boundaries: a message can itself contain
         * two spaces, and a page can contain several messages. */
        if (_morc === 27 && (i < _pages.length - 2 || _joinedOwner) && _owner
            && _owner.length < TOPL_CO && !_dieClears && !_ownerUrgent) {
            let _buf = _owner;
            for (let j = 1; j < _messages.length; ++j) {
                const _p = _messages[j];
                if (!_p) continue;
                if (_buf.length + 2 + _p.length < TOPL_LIMIT) _buf = _buf + '  ' + _p;
                else { putmsghistory(_buf); _buf = _p; } /* topl.c:289 remember_topl() */
            }
            /* The history's last entry tracks gt.toplines while WIN_STOP holds
             * (see pline()'s WIN_STOP arm); the painted owner is not re-filed. */
            putmsghistory(_buf);
            g._topl_history_recall = _owner;
            g._topl_win_stop_armed = false;
            g._topl_win_stop = true;
            g._topl_win_stop_buf = _buf;
            g._pending_message = _owner;
            break;
        }
    }
    return _morc;
}

function _topl_stop_clear_after_more() {
    const g = game;
    if (!g || (g._topl_win_stop && g._topl_win_stop_buf != null))
        return;
    if (ENV.FF_MLTRACE === '1')
        pushRngLogEntry(`^stop_clear[fired frame=${g._ff_last_input_frame ?? -1}]`);
    g._pending_message = '';
    /* wintty.c:1877-1880 clears the acknowledged message window. Its
     * deferred paging frames belong to that completed topline: retaining
     * them lets a later MSGTYP_STOP reuse an earlier turn's map and clock. */
    g._paintedSnapshot = null;
    _movemon_page_frames_reset();
    _pline_flush_frames_reset();
    const _sticky = g._topl_sticky;
    g._topl_sticky = null;      /* cl_end wiped the physical row */
    _buildScreenOutput();       /* re-parks the display cursor, as bot()+curs_on_u() do */
    g._topl_sticky = _sticky;
}

// Keep the complete MSGTYP_STOP operation available to an asynchronous
// caller that must wait for a synchronous helper's un-awaited pline().
async function _pline_stop() {
    const g = game;
    const task = (async () => {
        await force_more(g._pending_message, undefined, true);
        _topl_stop_clear_after_more();
    })();
    g._blockingPline = task;
    try {
        await task;
    } finally {
        if (g._blockingPline === task) g._blockingPline = null;
    }
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
        game._snapMoreKeys = (game._snapMoreKeys | 0) + 1;
        const c = typeof raw === 'number' ? raw : (raw?.charCodeAt(0) ?? 0);
        /* getline.c:238 `c == x` — x is ttyDisplay->dismiss_more, which ESC
         * left at 1 (getline.c:245-247) and nothing but wintty.c:544/2844 and
         * topl.c:78/100/116 resets, so ^A (0x01) pages a later --More--. */
        if (c === 32 /* space */ || c === 10 /* \n */ ||
            c === 13 /* \r */ || c === 27 /* ESC */ ||
            (c !== 0 && c === (game._ttyDismissMore | 0))) {
            if (c === 27)
                game._ttyDismissMore = 1;          /* getline.c:245-247 */
            if (c === 27 && toplMore)
                game._topl_win_stop_armed = true;   /* topl.c more():232-235 */
            return c;
        }
        if (rerender) {
            await rerender();
            /* C topl.c:230 xwaitforspace() retries without remember_topl(); the
             * page was filed on the first read, so the restored copy must not
             * be filed again (same guard as _topl_more's bell arm). */
            const _again = String(game._pending_message || '').replace(/--More--$/, '');
            if (_again) game._topl_history_recall = _again;
        }
    }
}

// The topline-more() spelling of await_more_dismiss (see `toplMore` above).
export async function await_topl_more_dismiss(rerender) {
    return await await_more_dismiss(rerender, true);
}

// C pline.c:549 raw_printf + wintty.c:3624 tty_wait_synch's rawprint arm.
// accepts the same keys as await_more_dismiss, without stopping WIN_MESSAGE.
export async function raw_print_wait(text) {
    raw_print(text);
    await await_more_dismiss();
}

/* C ref: win/tty/wintty.c:287-292 default_menu_cmds[] — MENU_FIRST_PAGE '^',
 * MENU_LAST_PAGE '|', MENU_NEXT_PAGE '>', MENU_PREVIOUS_PAGE '<',
 * MENU_SELECT_ALL '.', MENU_UNSELECT_ALL '-', MENU_INVERT_ALL '@',
 * MENU_SELECT_PAGE ',', MENU_UNSELECT_PAGE '\\', MENU_INVERT_PAGE '~',
 * MENU_SEARCH ':' (include/wintype.h:151-163).  Every one of these is in the tty
 * menu's `resp`, so every one of them is CONSUMED at a menu without closing it. */
export const DEFAULT_MENU_CMDS = '^|><.-@,\\~:';

/* C cmd.c:5394-5465 — query_menu replaces the standard response sets with
 * a PICK_ONE menu. JS represents decl.c's response arrays as strings. */
export async function yn_function_menu(query, resp, def) {
    const g = game;
    if (!g.iflags?.query_menu || !g.iflags?.window_inited
        || !['yn', 'ynq', 'ynaq', 'rl', 'hsq'].includes(resp))
        return null;
    // C wintty.c:1921-1940: drain the message before opening a menu.
    if (g._pending_message) {
        await flush_screen(1);
        if (g._pending_message) await force_more(g._pending_message);
    }
    g._pending_message = '';
    g._topl_sticky = null;
    const { TtyMenu, ATR_NONE } = await import('./tty_menu.js');
    const menu = new TtyMenu({ overlay: g.iflags.menu_overlay !== false
        && g.iflags.menu_overlay !== 0 });
    const entries = resp === 'rl' ? [['r', 'Right'], ['l', 'Left']]
        : resp === 'hsq' ? [['h', 'Hide'], ['s', 'Spin a web']]
        : [['y', 'Yes'], ['n', 'No']];
    if (resp === 'ynaq') entries.push(['a', 'All']);
    if (resp.includes('q')) entries.push(['q', 'Quit']);
    for (const [key, text] of entries)
        menu.add_menu(key, key, ATR_NONE, text, false, key === def);
    menu.end_menu(query);
    const { count, picks } = await menu.select_menu(PICK_ONE);
    let res = count > 0 ? picks[0] : def;
    if (count > 1 && res === def) res = picks[1];
    // C logs the answered query, then clears WIN_MESSAGE immediately.
    await pline('%s %s', query, key2txt(res.charCodeAt(0)));
    if (g._pending_message) putmsghistory(g._pending_message);
    g._pending_message = '';
    g._topl_unacknowledged = false;
    _buildScreenOutput();
    return res;
}

export async function await_menu_key(rerender, selectors, gacc, how, onToggle, search) {
    const sel = String(selectors ?? '');
    const grp = String(gacc ?? '');
    const resp = sel + grp + ' ' + '0123456789\x1b\n\r' + DEFAULT_MENU_CMDS;
    /* C wintty.c:1334-1399,1565-1612 counting/count/reset_count: digits build
     * a count; ESC while counting only stops the count (the next loop turn
     * clears `counting`), so a second ESC is needed to cancel. */
    let counting = false, count = 0, reset_count = true;
    for (;;) {
        if (reset_count) { counting = false; count = 0; }
        else reset_count = true;
        const raw = await nhgetch();
        const c = typeof raw === 'number' ? raw : (raw?.charCodeAt(0) ?? 0);
        /* getline.c:245-247: menu dmore() uses xwaitforspace too.  ESC
         * changes the tty's extra dismissal key even when it only cancels
         * a pending menu count (wintty.c:1604-1610). */
        if (c === 27) game._ttyDismissMore = 1;
        if (c === 27 /* ESC */ && counting) {
            if (rerender) await rerender();
            continue;
        }
        /* getline.c:236-237 — LF/CR break before the cbreak block, so they end
         * the read whether or not they are in `resp`. */
        if (c === 10 || c === 13 || c === 27 /* ESC */ || c === 32 /* space */)
            return c;
        if (c >= 48 && c <= 57 && (counting || !(grp.includes(String.fromCharCode(c))
                                                   || sel.includes(String.fromCharCode(c))))) {
            count = count * 10 + (c - 48);
            if (count !== 0) { counting = true; reset_count = false; }
            if (rerender) await rerender();
            continue;
        }
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
        /* A key outside `resp` is bell+re-read INSIDE xwaitforspace (getline.c:
         * 250-254), so process_menu_window's loop never turns over and a live
         * count survives it (wintty.c:1396 reset_count stays FALSE). */
        if (!resp.includes(ch)) reset_count = false;
        /* consumed, page unchanged (or a toggle the caller models itself) */
        if (onToggle && how === PICK_ANY && resp.includes(ch))
            await onToggle(ch, counting && count > 0 ? count : -1);
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
export async function occupation_force_more(committed, frame, framesMoves, framesUhs, postNewuhs, plineContext) {
    const g = game;
    if (!g) return 0;
    routeTag('occupation_force_more', committed); /* telemetry only */
    // Install the prior turn's painted frame as the snapshot so the map shown during
    // the --More-- is that turn's map (not the live, already-advanced one), and
    // _statusLine2 renders that turn's T: and hunger state.  Mirrors the
    // level-transition forced more().  framesUhs (optional) is the hunger state (u.uhs)
    // as of the per-turn bot() flush — C froze the status line at that flush, so the
    // --More-- shows the pre-message hunger (e.g. NOT_HUNGRY at the lesshungry page,
    const _hadSnap = g._paintedSnapshot;
    if (frame && g._occ_committed_topl?.postMeal && g._postMealPlineFrame) {
        /* The raising pline's own flush_screen (pline.c:273-274) ran bot() at ITS
         * clock: an nh_timeout pline (after svm.moves++, allmain.c:295) shows the
         * new T:, a movemon pline the old one. */
        if (g._postMealPlineFrame.moves != null) framesMoves = g._postMealPlineFrame.moves;
        frame = g._postMealPlineFrame.cells;
    }
    else if (frame && g._occ_committed_topl?.postMeal && g._lastFlushFrame)
        frame = g._lastFlushFrame.cells;
    if (frame) {
        g._paintedSnapshot = { cells: frame, moves: (framesMoves | 0),
            uhs: (framesUhs == null ? null : (framesUhs | 0)),
            botl: g._occCurBotl || null };
        /* done_eating (eat.c:549-556) runs newuhs(FALSE) — botl = TRUE — BEFORE
         * its "You finish eating" pline, whose flush_screen repaints the status
         * with the NEW hunger before more() pages the prior line. */
        /* The raising pline's own flush_screen() ran bot() (pline.c:273-274), so
         * attributes that changed since the tick's frame (heal_legs' ATEMP(A_DEX)
         * from nh_timeout) show on this page: take the incoming pline's recorded
         * attrs.  Only the post-meal cross-turn more() is such a deferred page. */
        if (g._occ_committed_topl?.postMeal && g._paintedSnapshot.botl) {
            const _inc = (g._plineFlushFrames || []).findLast(
                (f) => f.off === committed.length && f.botl?.attrs);
            if (_inc) g._paintedSnapshot.botl = { ...g._paintedSnapshot.botl, attrs: _inc.botl.attrs };
        }
        if (postNewuhs && framesUhs != null && g._paintedSnapshot.botl) {
            /* The same pline's flush_screen() runs bot() (pline.c:273-274), so HP
             * is live too: a pet pickup/drop page mid-meal must not keep the
             * corpse-flavor frame's HP when regen ran since (display.c:2237). */
            /* The raising pline's own recorded flush has HP as of that bot() call;
             * the live values can be later (done_eating's cpostfx nurse heal
             * runs after "You finish eating" but before this page is drained). */
            const _rec = (g._plineFlushFrames || []).findLast(
                (f) => f.off === committed.length && f.botl);
            const _live = _rec ? _rec.botl : _capture_botl();
            g._paintedSnapshot.botl = { ...g._paintedSnapshot.botl, uhs: (framesUhs | 0),
                ...(_live ? { uhp: _live.uhp, uhpmax: _live.uhpmax, mh: _live.mh, mhmax: _live.mhmax } : {}) };
            /* Keep the attributes from the incoming pline's recorded flush.
             * done_eating's newuhs repair precedes that flush (eat.c:549-559),
             * but cpostfx follows it (eat.c:563): live attributes can already
             * belong to a later polymorph when this deferred page is drained. */
        }
    }
    // At meal start, a later pline may already have flushed a newer map than
    // the flavor frame. C pline.c:273-274 flushes before update_topl's more()
    // (topl.c:274); use that exact boundary's paint when the caller has it.
    const plineFrame = plineContext
        ? _pline_flush_frame_select(plineContext.end, plineContext.full) : null;
    if (plineFrame)
        g._paintedSnapshot = { cells: plineFrame.cells, moves: plineFrame.moves,
                              botl: plineFrame.botl, r1whole: plineFrame.r1whole,
                              r1physical: plineFrame.r1physical };
    const morc = await _topl_more(committed);
    // Page-cleanup: drop the snapshot we installed (so the post-dismiss render uses the
    // live buffer), matching flush_screen's post-more() snapshot drop.  Leave any
    // pre-existing snapshot we did not install alone.
    if (frame || plineFrame) g._paintedSnapshot = null;
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
/* Depth counter, not a saved/restored boolean: async flush_screen() calls can
 * interleave (an un-awaited call suspended in its pager while another runs), and
 * a save/restore pair then restores a stale `true` after the outer one returns,
 * leaving the reentrancy guard (display.c:2226) stuck on and silencing every
 * later pline flush point. */
let _flush_screen_flushing = 0;
/* Count of flush_screen() paints.  show_glyph_cell() uses it to know what the
 * physical terminal held at the last flush (C's gbuf is only printed there). */
let _flush_epoch = 0;
export function _flush_screen_in_progress() { return _flush_screen_flushing > 0; }
/* C wintty.c:3923-3926 + getpos.c:57: the getpos frame colour reaches the
 * terminal when flush_screen next prints the cells (pline.c:274 included). */
function _apply_getpos_frame_pending() {
    if (game._getpos_frame_pending) {
        /* C wintty.c:3923-3926 + getpos.c:57: with use_color, valid getpos
         * cells print with a frame colour, which skips inverse attributes. */
        const sel = game._getpos_frame_sel = game._getpos_frame_pending;
        game._getpos_frame_pending = null;
        for (const k of sel) {
            const loc = game.level?.at(k % COLNO, Math.trunc(k / COLNO));
            if (loc && game.iflags?.use_color !== false) {
                loc.disp_attr = 0;
                invalidate_map_row(Math.trunc(k / COLNO));
            }
        }
    }
}
function flush_screen_point(mode) {
    _apply_getpos_frame_pending();
    _levelgen_freeze_flush(game?._levelgenPaintFreeze);
    _levelgen_window_flush_note();
    _flush_screen_flushing++;
    try { _flush_screen_repaint(mode); }
    finally { _flush_screen_flushing--; }
}
export async function flush_screen(mode, repaint = true) {
    /* C pline.c:274 -> topl.c:257-274: the occupation's last message is
     * still gt.toplines when movemon plines, including when docall's flush
     * (do_name.c:644) drains those messages before the occupation driver runs.
     * Restore that prefix before applying the deferred update_topl pages. */
    const oc = game._occ_committed_topl;
    const live = game._pending_message;
    if (oc && !oc.postMeal && !game._occBeforeInput && !game._resultMessage
        && live && !live.startsWith(oc.text)) {
        game._pending_message = _topl_merge_result(oc.text, live,
                                                  _topl_joins_snapshot(oc.text));
        game._occ_committed_topl = null;
    }
    _apply_getpos_frame_pending();
    _levelgen_freeze_flush(game?._levelgenPaintFreeze);
    _levelgen_window_flush_note();
    // C ref: update_topl/more() — if the accumulated topline won't fit on one
    // row, flush the committed portion with --More-- before showing the rest.
    _flush_screen_flushing++;
    try {
        return await _flush_screen_body(mode, repaint);
    } finally { _flush_screen_flushing--; }
}
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
    /* C pline.c:273-276: this flush supersedes the fireassist swap's
     * pre-movemon paint.  getdir's tty_yn_function more() (topl.c:390-392)
     * retains that newer terminal, including any intervening pet moves.
     * Keep the flush's map rather than later, still-buffered newsym changes. */
    if (game._fireSwapPending && game._fireSwapPreFrame)
        game._fireSwapPreFrame = game._lastFlushFrame;
}
async function _flush_screen_body(mode, repaint = true) {
    if (typeof process !== 'undefined' && ENV?.FF_TOPL_TRACE === '1') {
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
    if (game._topl_force_breaks && game._topl_force_breaks.length)
        game._topl_force_breaks = game._topl_force_breaks.filter(
            (e) => !e.frame || (e.frame.moves | 0) >= (game.moves | 0)
                || e.fullLine == null
                || String(game._pending_message || '').startsWith(e.fullLine)
                || String(game._resultMessage || '').startsWith(e.fullLine));
    let split = _topl_split_for_more(game._pending_message || '');
    const hadMore = split !== null;
    // The whole accumulated topline being paged, in the coordinate space the
    // per-message flush frames were recorded in (see _pline_flush_frame_tick).
    let fullTopl = game._pending_message || '';
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
    let pageIdx = 0;
    while (split) {
        let [committed, remainder, remainderJoins] = split;
        // topl.c:139: a wrapped message pages inside its own redotoplin(),
        // before the next update_topl() samples WIN_STOP.  The remainder
        // therefore has no incoming message already past that skip test.
        const pageWrapped = _topl_wordwrap(committed, TOPL_CO - 1).length > 1;
        // Install this page's per-run-turn painted frame (if a run-frame log exists) so
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
        let plineFrame = _pline_flush_frame_select(consumed + committed.length, fullTopl);
        const _plineFrameRaisedPage = !!plineFrame;
        if (!plineFrame)
            plineFrame = _pline_flush_frame_select(consumed - 2, fullTopl);
        else if (committed.length >= 80
                 && !(_topl_joins_for(fullTopl) || []).some((j) => j > consumed && j < consumed + committed.length)) {
            const ownFrame = _pline_flush_frame_select(consumed - 2, fullTopl);
            if (ownFrame) plineFrame = ownFrame;
        }
        const _savedSnap = game._paintedSnapshot;
        const _savedInMM = game._inMovemonMore;
        // ── pickup-encumber prinv page: freeze on the pre-movemon frame + cap ────
        // The dopickup prinv (committed last turn) pages here; C froze the physical
        // screen + the bottom encumbrance status at the pre-movemon / pre-encumber
        // bot() (the pet had not moved, cap not yet repainted).  Install the
        let _pickupFrozen = false;
        let _pageFrozen = false;
        const _forcedFrameIdx = _topl_force_break_entry(committed,
            _topl_remainder_segments(remainder, remainderJoins));
        let _forcedFrame = (_forcedFrameIdx >= 0)
            ? (game._topl_force_breaks[_forcedFrameIdx].frame || null) : null;
        if (_forcedFrame && plineFrame && _plineFrameRaisedPage
            && (_forcedFrame.moves | 0) > (plineFrame.moves | 0))
            _forcedFrame = null;
        if (ENV.FF_MLTRACE === '1') {
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
        /* The pre-movemon frame is only the right freeze when the more() came
         * from encumber_msg at the top of the turn (allmain.c:208), before
         * movemon.  A following message plined from INSIDE movemon (a pet
         * falling through a trap door, trap.c/teleport.c:2085), or after the
         * turn advanced (nh_timeout, timeout.c:752-758), flushes a newer
         * screen before raising more().  Its frame wins (pline.c:273-276). */
        if (_pep && pickupPrinv && !(plineFrame && _plineFrameRaisedPage
                && (plineFrame.mm || (plineFrame.moves | 0) > (_pep.moves | 0)))
            && (committed === pickupPrinv || committed.endsWith('  ' + pickupPrinv))) {
            game._paintedSnapshot = { cells: _pep.cells, moves: _pep.moves | 0, cap: _pep.cap | 0,
                botl: _pep.botl || null };
            game._inMovemonMore = true;
            _pickupFrozen = true;
        } else if (_forcedFrame) {
            /* This page was raised by a C display_nhwindow(WIN_MESSAGE), not by
             * a width overflow, so its frozen frame came from
             * topl_force_break_after() rather than from the overflow log. */
            game._paintedSnapshot = { cells: _forcedFrame.cells, moves: _forcedFrame.moves,
                                      statusBlankAfterDocrt: _forcedFrame.statusBlankAfterDocrt,
                                      botl: _forcedFrame.botl || null,
                                      r1whole: _forcedFrame.r1whole,
                                      r1physical: _forcedFrame.r1physical };
            _pageFrozen = true;
        } else if (plineFrame) {
            game._paintedSnapshot = { cells: plineFrame.cells, moves: plineFrame.moves,
                statusBlankAfterDocrt: plineFrame.statusBlankAfterDocrt,
                botl: plineFrame.botl || null, r1whole: plineFrame.r1whole,
                r1physical: plineFrame.r1physical };
            _pageFrozen = true;
        } else if (runFrame) {
            game._paintedSnapshot = { cells: runFrame.cells, moves: runFrame.moves,
                r1whole: runFrame.r1whole };
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
                botl: pf.botl || null, r1whole: pf.r1whole };
            _pageFrozen = true;
        }
        routeTag('_topl_split_for_more', committed); /* telemetry only */
        if (ENV.FF_MATTACK_TRACE === '1' || ENV.FF_MLTRACE === '1') {
            pushRngLogEntry(`^topl_page_ready[page=${pageIdx | 0} snap=${game._paintedSnapshot ? 1 : 0}`
                + ` cells=${game._paintedSnapshot?.cells?.size ?? -1} inMore=${game._inMovemonMore ? 1 : 0}]`);
            pushRngLogEntry(`^topl_more_commit[page=${pageIdx|0} committed=${encodeURIComponent(String(committed).slice(0,96))} remainder=${encodeURIComponent(String(remainder).slice(0,96))}]`);
        }
        /* A pline that fires while this page's --More-- awaits its key (the
         * flush came from tmp_at inside an un-awaited caller, e.g. m_throw's
         * return_from_mtoss between rn2(100) draws) lands on the displayed
         * page text and is overwritten by `remainder` below.  C emits it AFTER
         * the not-yet-shown messages, so queue it for the remainder. */
        game._flushLateMsgs = [];
        /* pline.c:274-277 + topl.c update_topl more(): C blocks INSIDE the pline that raised this
         * page, so when the recording ends here no later draw happens (runSegment trims to it). */
        game._moreRngMark = (_plineFrameRaisedPage && plineFrame && plineFrame.rngMark != null) ? plineFrame.rngMark : null;
        const _morc = await _topl_more(committed);
        game._moreRngMark = null;
        const _late = game._flushLateMsgs;
        game._flushLateMsgs = null;
        if (_late && _late.length) {
            remainderJoins = remainderJoins ? remainderJoins.slice() : [];
            for (const _m of _late) {
                /* pline() filed this message's flush frame against the page
                 * text it landed on; re-key it to its real place in the line. */
                const _fr = (game._plineFlushFrames || []).findLast((f) => f.msg === _m);
                if (_fr) _fr.off = consumed + committed.length + 2 + remainder.length;
                if (remainder) remainderJoins.push(remainder.length);
                fullTopl += '  ' + _m;
                remainder = remainder ? remainder + '  ' + _m : _m;
            }
        }
        if (ENV.FF_MATTACK_TRACE === '1' || ENV.FF_MLTRACE === '1') {
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
        if (ENV.FF_MATTACK_TRACE === '1' || ENV.FF_MLTRACE === '1')
            pushRngLogEntry(`^topl_page_restored[page=${pageIdx | 0} snap=${game._paintedSnapshot ? 1 : 0}`
                + ` cells=${game._paintedSnapshot?.cells?.size ?? -1} inMore=${game._inMovemonMore ? 1 : 0}]`);
        pageIdx++;
        // Advance past this dismissed page's committed text + the "  " message-boundary
        // separator that _topl_split_for_more trims when starting the remainder.
        consumed += committed.length + 2;
        game._pending_message = remainder;
        /* topl.c:139 redotoplin() leaves the shown remainder TOPLINE_NEED_MORE, so a
         * following tty_yn_function more()s it first (topl.c:398-401). */
        if (remainder) game._topl_unacknowledged = true;
        // Re-base the join record onto the remainder so a later read of
        // _topl_joins (and the next split iteration) reflects the new string.
        if (remainder && remainderJoins && remainderJoins.length) {
            game._topl_joins = remainderJoins;
            game._topl_joins_src = remainder;
        } else {
            game._topl_joins = [];
            game._topl_joins_src = remainder;
        }
        let _pageWasForcedBreak = false;
        if (game._topl_force_breaks && game._topl_force_breaks.length) {
            const k = _topl_force_break_entry(committed,
                _topl_remainder_segments(remainder, remainderJoins));
            if (k >= 0) { game._topl_force_breaks.splice(k, 1); _pageWasForcedBreak = true; }
        }
        const pageHasIncomingOwner = !pageWrapped && !_pageWasForcedBreak;
        if (_morc === 27 /* ESC */) {
            if (ENV.FF_MLTRACE === '1')
                pushRngLogEntry(`^topl_stop_after_esc[committed=${encodeURIComponent(String(committed).slice(0,80))} rem=${encodeURIComponent(String(remainder).slice(0,80))} joins=${(remainderJoins || []).join(',')}]`);
            const _urgent = game._topl_urgent_marks || [];
            // wintty.c:2282-2300 holds WIN_NOSTOP through the urgent
            // message's own redotoplin(), including its wrapped more().
            if (pageWrapped && _urgent.includes(committed)) {
                game._topl_win_stop_armed = false;
                split = remainder ? _topl_split_for_more(remainder, remainderJoins) : null;
                continue;
            }
            /* topl.c:257 samples skip before the incoming owner's more(), so
             * that owner is still drawn after ESC.  If it wraps, redotoplin
             * (topl.c:139-140) blocks in its OWN more() before any later pline.
             * tty_nhgetch (wintty.c:4065-4066) clears WIN_STOP during that read;
             * retain the later messages until its dismissal decides whether
             * they are suppressed, rather than dropping them before the read. */
            const ownerEnd = remainderJoins?.[0] ?? remainder.length;
            const owner = remainder.slice(0, ownerEnd);
            if (pageHasIncomingOwner && owner
                && _topl_wordwrap(owner, TOPL_CO - 1).length > 1) {
                const tailStart = Math.min(ownerEnd + 2, remainder.length);
                game._pending_message = owner;
                game._topl_joins = [];
                game._topl_joins_src = owner;
                game._topl_win_stop_armed = false;
                game._topl_win_stop = !_urgent.includes(owner);
                game._topl_win_stop_buf = owner;
                split = [owner, remainder.slice(tailStart),
                    (remainderJoins || []).filter(j => j > ownerEnd)
                        .map(j => j - tailStart)];
                continue;
            }
            let _rel = -1;
            /* The head of the remainder is the message that RAISED this page.
             * If it is urgent, wintty.c:2282 holds WIN_NOSTOP across its
             * update_topl, so more() (topl.c:233) did not set WIN_STOP and
             * nothing after it is suppressed: it is drawn and the next
             * message pages it (impossible()'s "newsym: ..." line, whose
             * successor does not fit, wears its own --More--). */
            if (_urgent.length && _urgent.includes(remainder.slice(0, (remainderJoins && remainderJoins.length)
                ? remainderJoins[0] : remainder.length)))
                _rel = 0;
            else if (_urgent.length && remainderJoins && remainderJoins.length) {
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
                /* wintty.c:2282 holds WIN_NOSTOP across the urgent head's
                 * update_topl, so more() (topl.c:233) never set WIN_STOP:
                 * disarm what _topl_more armed for this ESC. */
                game._topl_win_stop_armed = false;
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
            const _keepEnd = !pageHasIncomingOwner ? 0 : (remainderJoins && remainderJoins.length)
                ? remainderJoins[0] : remainder.length;
            game._pending_message = remainder.slice(0, _keepEnd);
            game._topl_joins = [];
            game._topl_joins_src = game._pending_message;
            {
                let _wsBuf = game._pending_message;
                let _wsRemembered = !pageHasIncomingOwner;
                let _bounds = (remainderJoins && remainderJoins.length)
                    ? remainderJoins.slice() : [];
                if (!pageHasIncomingOwner) {
                    /* Both explicit and wrapped more() leave gt.toplines
                     * holding the acked page (topl.c:205-248). */
                    _wsBuf = String(committed ?? '');
                    if (remainder) _bounds = [-2, ..._bounds];
                }
                for (let _i = 0; _i < _bounds.length; _i++) {
                    const _s = _bounds[_i] + 2;
                    const _e = (_i + 1 < _bounds.length) ? _bounds[_i + 1] : remainder.length;
                    const _m = remainder.slice(_s, _e);
                    if (_wsBuf.length + 2 + _m.length < TOPL_LIMIT) {
                        _wsBuf = _wsBuf + '  ' + _m;
                        if (_wsRemembered) _msg_history_arr()[_msg_history_arr().length - 1] = _wsBuf;
                    } else {
                        /* nhgetch already filed a wrapped page. C's
                         * remember_topl (:280) stores it only once. */
                        if (_wsBuf && !_wsRemembered) putmsghistory(_wsBuf);
                        _wsBuf = _m;
                        _wsRemembered = false;
                    }
                }
                /* History's last entry tracks gt.toplines under WIN_STOP (see
                 * pline()); the painted owner is not filed again by nhgetch. */
                if (_wsBuf && !_wsRemembered) putmsghistory(_wsBuf);
                game._topl_history_recall = game._pending_message;
                game._topl_win_stop_buf = _wsBuf;
            }
            /* ...unless the message that raised this page was URGENT: C's
             * more() only sets WIN_STOP `if (!(cw->flags & WIN_NOSTOP))`
             * (topl.c:233), and tty_putstr holds NOSTOP across the whole
             * urgent update_topl (wintty.c:2282-2300). */
            const _headEnd = (remainderJoins && remainderJoins.length)
                ? remainderJoins[0] : remainder.length;
            /* mhitu.c:1370-1372 gulpmu: the head was drawn (it owned the page),
             * then display_nhwindow(WIN_MESSAGE)'s more() returns at once under
             * WIN_STOP (topl.c:150) and swallowed(1)'s cls() wipes the line. */
            if (pageHasIncomingOwner && game._pending_message) {
                const _fk = _topl_force_break_entry(remainder.slice(0, _headEnd));
                if (_fk >= 0 && game._topl_force_breaks[_fk].clears)
                    game._pending_message = '';
                /* The cls() can also follow a LATER, suppressed pline: allmain.c
                 * :383 unmul's "You survived that attempt on your life." owns
                 * the ESC'd page and is drawn, then Boots_on -> pooleffects
                 * (hack.c:3256) plines "You slowly rise above the surface."
                 * under WIN_STOP (topl.c:257 skip) and its docrt() -> cls()
                 * (display.c:1731, 2196) wipes the drawn head all the same. */
                else if (remainderJoins && remainderJoins.length) {
                    const _fb = game._topl_force_breaks || [];
                    for (let _i = 0; _i < remainderJoins.length; _i++) {
                        const _s = remainderJoins[_i] + 2;
                        const _e = (_i + 1 < remainderJoins.length)
                            ? remainderJoins[_i + 1] : remainder.length;
                        const _seg = remainder.slice(_s, _e);
                        if (_fb.some((e) => e.clears && e.text === _seg)) {
                            game._pending_message = '';
                            break;
                        }
                    }
                }
            }
            if (!(game._topl_urgent_marks || []).includes(remainder.slice(0, _headEnd))) {
                game._topl_win_stop_armed = false;
                game._topl_win_stop = true;
            }
            break;
        }
        split = remainder ? _topl_split_for_more(remainder, remainderJoins) : null;
    }
    // later --More-- does not reuse it.  DISPLAY-ONLY.
    if (hadMore && (game._pickupEncPreFrame || game._pickupEncMorePending)) {
        game._pickupEncPreFrame = null;
        game._pickupEncMorePending = null;
    }
    // The run's accumulated topline has now been fully paged; drop the per-run-turn
    // or a fresh movemon overflow) does not reuse this run's stale frames.  C ref: the
    // topline is cleared at the next tty_nhgetch; the physical terminal tracks the
    // live hero from there.  DISPLAY-ONLY.
    if (hadMore && game._runPageFrames) {
        game._runPageFrames = null;
    }
    /* C ref: win/tty/topl.c more():218-247 — a dismissed page is GONE from
     * gt.toplines; only the undismissed remainder stays on the topline.  A
     * command-result SNAPSHOT of the whole accumulated line (domove_core's
     * pet-swap stash copies _pending_message without clearing it) therefore
     * still carries text this loop just paged, and the next stash/merge would
     * re-join the dismissed pages (and lose their join record) in front of the
     * new plines.  Drop the snapshot: the live remainder now owns the line.
     * DISPLAY-ONLY: no RNG, no game state. */
    const _resHeadPaged = hadMore && fullTopl && game._resultMessage
        && String(game._resultMessage) !== fullTopl
        && fullTopl.startsWith(game._resultMessage + '  ')
        && consumed >= String(game._resultMessage).length + 2
        && !String(game._pending_message || '').startsWith(game._resultMessage);
    if (hadMore && fullTopl && (game._resultMessage === fullTopl || _resHeadPaged)) {
        game._resultMessage = null;
        game._resultMessageJoins = null;
        game._toplResultSnapshot = null;
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
        if (ENV.FF_MATTACK_TRACE === '1')
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
    // A deferred update_topl drain need not be a C flush_screen call.  In
    // particular, allmain.c's occupation return does not repaint the map
    // unless its guarded bot()/timebot() called curs_on_u() first.
    if (repaint) _flush_screen_repaint(mode);
}
function _flush_screen_repaint(mode) {
    _flush_ran_bot = false;
    let _mapPrinted = false;
    /* A text-window dismissal only prints docrt's map after bot() if no
     * intervening pline already flushed it (pline.c:273-274). */
    const docrtMapAfterBot = game._docrtMapAfterBot && game._docrtMapPending;
    // C ref: flush_screen — if status is flagged, update it before rendering
    // display.c:2225: delayed flushes leave the pending status update alone.
    if (game && game.disp && !game._botlPaintHeld) {
        if (game.disp.botl || game.disp.botlx) {
            /* an armed latch means that docrt's map was already printed by
             * a bot-disabled flush (tty_select_menu's erase_menu_or_text) */
            _mapPrinted = !!game._status1WholeNext;
            _flush_had_botlx = !!game.disp.botlx;
            if (game.disp.botlx && game._status1WholeNext) game._status1Whole = true;
            game._status1WholeNext = false;
            bot();
            _flush_ran_bot = true;
            /* A docrt() whose erase_menu_or_text flush_screen(1) runs with bot()
             * ENABLED (a dismissed NHW_TEXT window, com_pager.js): bot() sends
             * BL_RESET first, then the gnew loop (display.c:2250-2270) prints
             * every docrt-reprinted map cell, row y=20 included, over the
             * rewritten status text — not the tail-only case above, where the
             * map was printed by an earlier bot-disabled flush. */
            bot();
            if (docrtMapAfterBot) game._status1Whole = false;
            if (game._docrtGnewPending && !_mapPrinted
                && !game._bot_disabled && !game._topl_prompt_echo)
                game._status1Whole = false;
        } else if (game.disp.time_botl)
            timebot();
    }
    /* display.c:2237-2256: bot() precedes the pending gnew map writes, even
     * when a caller already ran bot() directly after docrt() (options.c:9007).
     * select_menu's dismissal flushed its map with bot disabled, represented
     * by _r1botAfterMap; its later status paint therefore stays on top.
     * The cmd.js full-screen menus (wiz_intrinsic's tty_menu_pick_any) record
     * the same dismissal flush via _status1WholeNext, consumed above as
     * _mapPrinted: their whole-row bot() also stays on top of map y=20
     * (wizcmds.c:994 select_menu -> wintty.c:2794 dismiss -> :979 flush; the
     * def_feedback pline's flush, wizcmds.c:1081-1082, then rewrites row 1). */
    if (docrtMapAfterBot
        || (game._docrtMapPending && !game._r1botAfterMap && !_mapPrinted)) {
        game._status1Whole = false;
        game._r1textOver = false;
        game._r1wipe = null;
    }
    game._docrtMapPending = false;
    // C ref: display.c:2241-2263 — the gnew repaint loop runs here, between
    // bot() and display_nhwindow(WIN_MAP), and leaves the tty cursor one column
    // past the last glyph it printed; `if (cursor_on_u) curs(WIN_MAP, u.ux,
    // u.uy)` only overrides that for a flush_screen(1).  Ordinary changed
    // glyphs and forced glyphs participate in the same row-major traversal,
    // whether or not bot() ran (display.c:2241-2263).
    let _forcedCurs = _take_forced_gnew_cursor();
    const _gnewCurs = !mode ? _last_changed_gnew_cursor() : null;
    if (_gnewCurs && (!_forcedCurs
        || _gnewCurs[1] > _forcedCurs[1]
        || (_gnewCurs[1] === _forcedCurs[1] && _gnewCurs[0] > _forcedCurs[0])))
        _forcedCurs = _gnewCurs;
    /* Published for callers that placed the cursor with curs() BEFORE this
     * flush.  C's repaint loop only moves the tty cursor when it actually
     * prints a cell, so with no pending glyphs the curs() position stands; this
     * port's _buildScreenOutput re-parks the cursor unconditionally, so a
     * caller has to re-assert.  See getpos()'s prologue (js/cmd.js). */
    _last_flush_forced_cursor = !!(_forcedCurs && !mode);
    /* C display.c:2236-2256: pending row-20 glyphs paint over even a full
     * status reset performed by bot() above. Preserve coverage elsewhere. */
    const repaint = game._r1GlyphRepaint;
    if (repaint?.level === game.level && _threeStatusLines() && !_map_row20_clipped()) {
        repaint.flushed = true;
        repaint.whole = !!game._status1Whole;
        game._status1Whole = false;
    }
    const _prevRows = _flush_ran_bot ? String(game._screen_output || '').split('\n') : null;
    _buildScreenOutput();
    game._r1GlyphRepaint = null;
    /* wintty.c render_status leaves the tty cursor just past the last status
     * field it rewrote (changed fields only); flush_screen(0) does not move it
     * back to the hero. */
    _last_flush_status_end = null;
    if (_flush_ran_bot && !mode && !_forcedCurs) {
        const rows = String(game._screen_output || '').split('\n');
        const last = rows[rows.length - 1];
        /* wintty.c:4660-4730: bot() with no changed field writes nothing, so
         * the tty cursor stays where the caller's curs() put it. */
        const _sce = rows.length === 24 ? _status_changed_end(_prevRows, last) : 0;
        if (rows.length === 24 && _sce >= 0 && _status_plain_len(last) > 0)
            _last_flush_status_end = [_sce, 23];
        /* wintty.c:4660-4730 check_fields() redraws changed fields only.
         * BL_RESET forces every field, including the unchanged row tail;
         * an ordinary BL_FLUSH retains the changed-field endpoint above. */
        /* a blanked status (nothing to print) leaves the caller's curs() standing */
        if (rows.length === 24 && _flush_had_botlx && _status_plain_len(last) > 0)
            _last_flush_status_end = [_status_plain_len(last), 23];
    }
    if (game) game._docrtGnewPending = false; /* gnew cells printed (display.c:2256) */
    _flush_epoch++;
    if (game?.level)
        game._lastFlushFrame = { cells: _capture_painted_cells(), moves: _painted_moves(),
                                 epoch: _flush_epoch,
                                 seq: game._toplShownSeq | 0,
                                 r1whole: !!game._status1Whole };
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
    _flush_epoch++; /* the cleared terminal is the new baseline for show_glyph_cell */
    game._r1GlyphRepaint = null;
    const lev = game.level;
    if (!lev || !lev.at)
        return;
    /* C display.c:2110-2133: gnew compares gbuf[0][0]'s BUFFERED glyphinfo
     * (not a freshly mapped GLYPH_UNEXPLORED) with nul_gbuf's blank.  Column 0
     * is never shown, so only the first clear (zero-initialized gbuf, ttychar
     * 0) marks cells dirty, and that is init_sound_disp_gamewindows()'s
     * (allmain.c:757), before any level exists.  Every cls() modelled here
     * leaves the terminal blank until show_glyph() repaints a cell
     * (under_water, detection, a customized GLYPH_UNEXPLORED). */
    for (let y = 0; y < ROWNO; y++) {
        invalidate_map_row(y);
        for (let x = 1; x < COLNO; x++) {
            const loc = lev.at(x, y);
            if (!loc)
                continue;
            /* C display.c:2089-2103,2140: copy nul_gbuf verbatim; its ttychar
             * is a literal blank, independent of the active symbol set. */
            loc.disp_ch = ' ';
            loc[_CAPTURE_CELL_CACHE] = null;
            loc.disp_capture_cell = null;
            loc.disp_color = NO_COLOR;
            loc.disp_glyph_color = NO_COLOR;
            loc.disp_glyph_ch = ' ';
            loc.disp_glyph_decgfx = false;
            loc.disp_decgfx = false;
            loc.disp_attr = 0;
            loc.disp_cls = GLYPHCLS_UNEXPLORED;
            loc.disp_cmap = null;
            loc.disp_unmapped = undefined;
            loc.disp_is_warning = false;
            /* the buffered glyphinfo is nul_gbuf's (display.c:2137) until
             * show_glyph() stores a mapped one; see show_glyph_cell */
            loc.disp_nul_gbuf = true;
            loc.gnew = 1;
        }
    }
}
// ── cls ──
export async function cls() {
    /* C display.c:2196 flushes WIN_MESSAGE before clearing the screen.
     * An ESC at that explicit more() sets WIN_STOP (tty/topl.c:232-235);
     * the next pline samples it at update_topl entry. Unlike an overflow
     * inside update_topl, this page has no incoming message left to paint. */
    if (game._topl_win_stop_armed) {
        game._topl_win_stop_armed = false;
        game._topl_win_stop = true;
        game._topl_win_stop_buf ??= String(game._topl_last_more_committed || '');
    }
    /* C display.c:2197: clearing the map also requests a full status redraw. */
    game.disp ??= {};
    game.disp.botlx = 1;
    const display = game?.nhDisplay;
    if (display?.clearScreen)
        display.clearScreen();
    /* wintty.c:1074-1087: clearing WIN_MAP erases the physical status too.
     * It stays blank until bot() actually paints, including when select_menu
     * disables bot() during a diagnostic raised by docrt(). */
    game._statusBlankAfterDocrt = true;
    game._statusCornerClips = null; /* clear_nhwindow(WIN_MAP) erased the screen */
    /* C display.c:2064-2072 cls(): clear_nhwindow(WIN_MAP) clears the physical
     * screen and clear_glyph_buffer() forces every gbuf cell to unexplored.
     * Only the first half was ported, so a cls() that was NOT immediately
     * followed by a full repaint left the previous map standing in the glyph
     * buffer — which is every detection caller. */
    clear_glyph_buffer();
    game._epyxPhys = null;
    game._r1wipe = null; /* physical status row 1 is rebuilt after the clear */
    game._r1clean = null;
    game._pending_message = '';
    /* The physical screen is now blank, so a painted-screen snapshot taken
     * BEFORE the clear (movemon's per-overflow frame, topl.c:1262) no longer
     * describes what a later more() shows: C's gbuf holds only what was
     * painted since (you_aggravate's engineer + hero, display.c:2196-2201). */
    game._paintedSnapshot = null;
    if (game._topl_sticky === game._topl_empty_sticky)
        game._topl_sticky = null;
    game._topl_empty_sticky = null;
}
export function status_r1_docorner(fromX, toStatusEnd = false) {
    const m = game._r1clean || new Map();
    /* wintty.c:5251-5256: render_status cl_end()s past the last field only when
     * finalx shrank; an unchanged-width status row keeps the map cells docrt
     * printed beyond it. */
    let lim = COLNO - 1;
    if (toStatusEnd)
        lim = (_threeStatusLines() ? _statusRows3()[0] : _statusLine1Raw()).replace(/\x1b\[[0-9;]*m/g, '')
            .replace(/\x1b\[(\d+)C/g, (_, n) => ' '.repeat(+n)).trimEnd().length;
    for (let x = Math.max(1, fromX); x <= lim; x++) {
        const c = _snapCellAt(x, ROWNO - 1);
        m.set(x, c.ch + '/' + (c.attr | 0));
    }
    /* docorner()'s row_refresh() reprinted the cells past the status end, so an
     * earlier cl_end() erasure there no longer holds (wintty.c:3684-3710). */
    if (toStatusEnd)
        for (let x = lim + 1; x < COLNO; x++) m.delete(x);
    game._r1clean = m;
}
export function status_r1_menu_docrt() {
    const seen = new Set();
    for (let x = 1; x < COLNO; x++) {
        const loc = game.level?.at(x, ROWNO - 1);
        if (loc && (loc.seenv | 0) && loc.disp_ch === ' ')
            seen.add(x);
    }
    game._r1docrtSeen = seen;
    game._r1docrtLvl = game.level;
}
/* C botl.c:2321-2334: rule edits request a redraw; they resend all field
 * values and discard temporary highlights only when highlighting is enabled. */
export function reset_status_hilites() {
    if (game.iflags?.hilite_delta) {
        delete game._blTemp;
        delete game._statusFieldColors;
    }
    game.disp.botlx = true;
}
export function status_reassess() {
    delete game._statusFieldColors; // C botl.c:1719 update_all = TRUE
    game.disp.botlx = true;
    /* C botl.c:1705-1706 status_initialize(REASSESS_ONLY): enablement is
     * independent of the values last delivered to the tty status window. */
    (game._statusExperienceFields ??= {}).polymorphed =
        (game.u.umonnum | 0) !== (game.u.umonster | 0);
    /* botl.c:1718,1584: update_all re-sends BL_GOLD even when its amount
     * and symbol are unchanged, using the current invis_goldsym fallback. */
    game._goldLabelCache = null;
    /* botl.c:1719: status_initialize(REASSESS_ONLY) also arms the whole row-1
     * rewrite — at the next bot() the pending botlx sends BL_RESET (botl.c:1670)
     * and wintty's FORCE_RESET redraws every field over the map row.  Arm the
     * same latch the wiz_intrinsic path uses (js/cmd.js) so the consuming bot()
     * fires it from wherever C calls it: were_change -> set_uasmon()
     * (allmain.c:348-350, polyself.c:121-123) reaches its end-of-turn bot()
     * through moveloop_status_paint's direct call, not _flush_screen_repaint. */
    game._status1WholeNext = true;
    /* botl.c:1719 sets gu.update_all, so the next bot() re-sends every field
     * (botl.c:1584) including BL_CAP and BL_LEVELDESC; wintty.c:4573-4574 and
     * :4546 then reset enc_shrinklvl / dlvl_shrinklvl, dropping the lone blank
     * shrink_enc() left in BL_CAP and the shrunken "Dl:" label. */
    _dlvlField = null;
    _fitMemo = null;
}

// ── bot ──
export async function bot() {
    // C botl.c:255-256: select_menu() suppresses status even during dismissal.
    if (game?._bot_disabled)
        return;
    /* getline.c:63: custompline() reaches flush_screen()->bot(), but the core
     * disables bot processing while ttyDisplay->inread is nonzero.  Prompt
     * repainting must therefore leave status and pending disp flags alone. */
    if (game?._topl_prompt_echo)
        return;
    /* botl.c:1670-1672: disp.botlx sends BL_RESET -> FORCE_RESET (wintty.c:4476-4477),
     * so every row-1 field is redrawn whole (check_fields forcefields). */
    /* botl.c:259: with u.uhp == -1 (dosave's flag, or a death that landed on
     * exactly -1) bot() paints nothing, so no BL_RESET rewrite happens. */
    if (game.disp.botlx && (game.u?.uhp | 0) !== -1)
        game._status1Whole = true;
    /* the BL_RESET that -1 swallowed is gone (bot() clears botlx either way),
     * so done()'s later HP:0 paint is a plain BL_FLUSH, not a row-1 rewrite */
    if (game.disp.botlx && (game.u?.uhp | 0) === -1)
        game._botlResetLost = true;
    else if ((game.u?.uhp | 0) > 0)
        game._botlResetLost = false;
    game._status1WholeNext = false;
    // Status line updates happen in _buildScreenOutput
    // C ref: botl.c:188 — bot2() reads (cap = near_capacity()) HERE, at paint
    // time, and the physical bottom line then holds that value until the NEXT
    // bot().  Latch it so a later frozen --More-- page can render what the last
    // paint actually put on the screen rather than the live inventory weight:
    // C's encumber_msg (pickup.c:1990) emits its pline BEFORE its SET_BOTL, and
    // drop() has already run freeinv() by then, so between the drop and the next
    // bot() the screen shows the PRE-drop encumbrance while near_capacity()
    // value " Burdened").  DISPLAY-ONLY; near_capacity() consumes no RNG.
    game._botlPaintedCap = near_capacity() | 0;
    /* Same latch for '$:' (botl.c:837 money_cnt(gi.invent)): goto_level's
     * tutorial exit raises its --More-- before bot() reruns. */
    game._botlPaintedGold = money_cnt(game.invent ?? null);
    game._botlGoldStale = undefined;
    /* A bot() paint ends the tutorial-entry window (do.c:1510 tutorial(TRUE)
     * stashed invent, nothing repainted yet): keepdogs' pline flush_screen()
     * -> bot() (display.c:2286) shows the stashed hero's '$:0'.  done()'s
     * forced paint (end.c:1043-1046) marks the override first: the standing
     * "Resetting time" line (nhlua.c:1738) pages only at a LATER drain, so
     * its page must render THIS paint, not the frozen pre-restore one.  The
     * override dies here either way; carry the mark across for the drain. */
    const _tutFreshLastPage = !!game._tutorialStatusOverride?.freshOnLastPage;
    game._tutorialStatusOverride = null;
    /* botl.c:259-268: only an actual paint replaces the physical BL_TIME.
     * bot() still clears the pending time update when uhp == -1. */
    if ((game.u?.uhp | 0) !== -1 && game.iflags?.status_updates !== false
        && !suppress_map_output())
        game._botlPaintedMoves = game.moves | 0;
    game._botlPaintedDeaf = _live_deaf();
    game._botlPaintedFlying = _live_flying();
    game._botlPaintedRiding = !!game.u?.usteed;
    /* C botl.c condtests[bl_conf]: retain the last painted condition when
     * HConfusion is restored without SET_BOTL after a magic-trap effect. */
    game._botlPaintedConfused = !!(game.u?.uprops?.[CONFUSION]?.intrinsic | 0);
    /* wizcmds.c:184 temporarily clears HHallucination during do_mapping()
     * without flagging status. botl.c:1196's Hallu remains on the physical
     * status line until bot() next paints, just like Conf above. */
    game._botlPaintedHallu = _hallucinating_dsp();
    game._botlPaintedLev = _live_lev(game.u);
    game._botlPaintedBlind = _disp_Blind();
    game._botlPaintedSlimed = !!(game.u?.uprops?.[SLIMED]?.intrinsic | 0);
    game._botlPaintedSickType = (game.u?.uprops?.[SICK]?.intrinsic | 0) ? (game.u.usick_type | 0) : 0;
    if ((game?.u?.uhp | 0) !== -1 && !game._botlHeldEat) {
        /* botl.c:1635-1636 and wintty.c:4472: only a live, enabled XP/HD
         * field receives a new value; the other field's text survives. */
        const poly = (game.u.umonnum | 0) !== (game.u.umonster | 0);
        const fields = game._statusExperienceFields ??=
            { polymorphed: poly };
        if (poly && fields.polymorphed)
            fields.hd = _mon_mlevel(game.u.umonnum | 0);
        else if (!poly && !fields.polymorphed) {
            fields.level = game.u.ulevel | 0;
            if (game.flags?.showexp) fields.experience = game.u.uexp || 0;
        }
        /* C botl.c:259-268: a status paint replaces the pre-cast Pw still
         * visible behind a spell's menu. Later menus retain this new paint. */
        game._spellPwStale = null;
        /* end.c:1045-1046 calls bot() directly even while goto_level delays
         * flush_screen().  botl.c:254-270 has no delay_flushing guard: paint
         * the live status, including the new level, and hold that new paint
         * for subsequent delayed flushes. */
        game._lastPaintedBotl = _capture_botl(true);
        /* The tutorial-exit mark only transfers when the paint really ran
         * (botl.c:259's u.uhp != -1 guard): a declined paint leaves C's
         * physical line at the frozen pre-restore hero. */
        if (_tutFreshLastPage)
            game._tutorialFreshLastPage = true;
        /* The physical status row moved; every --More-- raised from here on
         * shows THIS paint (a more() always follows the flush that painted
         * it — pline.c:273-274).  Stamped snapshots refresh off this epoch. */
        game._botlPaintSeq = (game._botlPaintSeq | 0) + 1;
        /* a bot() after the pline (done()'s forced one, end.c:1043-1046)
         * repainted the terminal the lone frame recorded */
        if (game._lonePlineFrame) game._lonePlineFrame.botStale = true;
        game._botlUzFrozen = null;
        /* This IS C's next real paint: whatever done() left pending is now on
         * the physical line, so the death freeze (see js/end.js
         * _done_force_hp_zero) is over. */
        game._botlFrozenDeath = false;
    } else if ((game?.u?.uhp | 0) === -1) {
        /* C botl.c:259 declines this paint. done() then changes HP to zero
         * (end.c:1073), but tty_yn_function's more() precedes its next flush
         * (topl.c:390-392). Keep the physical status until bot() paints again. */
        game._botlFrozenDeath = true;
    }
    /* C botl.c:259 bot() writes the status rows to the terminal at once, even
     * while WIN_STOP suppresses messages after an ESC'd --More-- (topl.c:232).
     * The physical rows must be updated now: a following getlin/yn prompt keeps
     * them (_prompt_physical_status_rows) and showed the pre-bot() HP where C's
     * done() -> bot() had painted the death-time one ("Die?" prompt, C HP:92
     * against 103 painted before the suppressed attacks). */
    if ((game._topl_win_stop || game._topl_win_stop_armed) && game._screen_output
        && !game._status_blanked && !game._statusBlankAfterDocrt
        && (game?.u?.uhp | 0) !== -1 && !game._botlHeldEat) {
        const _rows = String(game._screen_output).split('\n');
        if (_rows.length >= 24 && !_threeStatusLines()) {
            _rows[22] = _status_sgr(_statusLine1());
            _rows[23] = _status_sgr(_statusLine2());
            game._screen_output = _rows.join('\n');
        }
    }
    if (game.u && (game.u.uhp | 0) <= 0 && (game.u.uhp | 0) !== -1 && _threeStatusLines()
        && game.disp?.botlx)
        game._status1Whole = true;
    /* C botl.c:260-269 — bot() repaints the WHOLE status line, `T:' included, so
     * the run-suppression latch above is discharged by any paint that gets here. */
    if (game) game._timeBotlFrozenMoves = null;
    if (game && (game.u?.uhp | 0) !== -1 && game.iflags?.status_updates !== false
        && !suppress_map_output()) {
        _status_note_pushed_fields();
        /* C tty status updates happen at bot(), before its reset is cleared. */
        if (_threeStatusLines() && (game.flags?.weaponstatus
            || game.flags?.armorstatus || game.flags?.terrainstatus)) {
            _statusRows3();
            if (game._lastPaintedBotl) game._lastPaintedBotl.row3 = game._st3?.row;
        }
        /* C botl.c:259-268: a status paint replaces the blank rows left by
         * the level-teleport menu. A pline before delayed flushing starts
         * (nhlua.c:1738, do.c:1720) can repaint them before u_on_rndspot;
         * the menu must no longer make that arrival blank them again. */
        game._levtele_menu = false;
        /* botl.c:259-268: only a real status paint replaces the blank rows
         * left by cls(); u.uhp == -1 suppresses it even while polymorphed. */
        /* C botl.c:259-271: only an enabled status paint replaces the blank
         * rows left by cls().  In particular, self-genocide while polymorphed
         * leaves u.uhp == -1, so bot() clears its flags without painting. */
        game._statusBlankAfterDocrt = false;
        game._statusCornerClips = null; /* botlx's BL_RESET restores every field */
        game._getobj_menu_win = null; // the clipped status rows were repainted
        game._carryStatusClip = null;
    }
    // C ref: botl.c:277 — bot() resets disp flags after rendering
    if (game && game.disp) {
        /* Count the bot() calls that had a pending botl/botlx to discharge:
         * C moveloop_core runs `bot(); curs_on_u();` (a flush_screen) for
         * exactly those (allmain.c:474-478); doapply's wield turn reads it. */
        if (game.disp.botl || game.disp.botlx)
            game._botlDischarges = ((game._botlDischarges | 0) + 1) | 0;
        /* goto_level sets botlx (do.c), so bot() rewrites the whole status row
         * for the new level, undoing blanks the previous level's map row 20
         * printed over it (wintty.c render_status). */
        if (game.disp.botlx && game._r1wipe && game._r1wipe.lvl !== game.level)
            game._r1wipe = null;
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
    // C topl.c:677-715: remember_topl() stores every nonempty topline,
    // including consecutive identical messages (topl.c:170-191).
    _msg_history_arr().push(text);
}
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
/* C pline.c:514-525: chronicle keeps the original formatted message; only
 * the live log replaces tabs, which otherwise delimit its fields. */
export function livelog_printf(ll_type, line, ...args) {
    const buf = { value: nh_sprintf(line, args).split('\0', 1)[0].slice(0, BUFSZ * 2 - 1) };
    gamelog_add(ll_type, game.moves | 0, buf.value);
    strNsubst(buf, "\t", "_", 0);
    livelog_add(ll_type, buf.value);
}
export async function urgent_pline(msg, ...args) {
    const g = game;
    if (args.length > 0)
        msg = nh_sprintf(msg, args);
    if (ENV.FF_MLTRACE === '1')
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
        /* The wipe also takes the line a command stashed into the result
         * channel (float_down's "You float gently..." drawn past the ESC). */
        g._resultMessage = null;
        g._resultMessageJoins = null;
        /* wintty.c:2278-2281 clears the sole message window.  The eating
         * driver's saved topline is another copy of that wiped line. */
        g._occ_committed_topl = null;
        /* ...and so is the fireassist swap's ESC-owner line (cmd.js cmdq_clear
         * would otherwise re-present it after this wipe). */
        g._fireSwapOwnerLine = null;
    }
    g._topl_win_stop_armed = false;           /* NOSTOP also pre-empts the arm */
    g._topl_urgent_next = true;               /* one-shot; pline() consumes it */
    await pline(msg);
}

export async function getobj_never_mind(qbuf) {
    /* invent.c:1944-1953: get_count may have replaced the prompt with its
     * echo (cmd.c:5070-5080). Silent cancellation leaves that text standing;
     * qbuf is only a fallback when the caller hasn't retained the painted line. */
    if (qbuf && !game._topl_sticky)
        game._topl_sticky = String(qbuf);
    if (game.flags?.verbose !== false)
        await pline('Never mind.');
}

// C options.c:7797-7810: the newest matching rule overrides the default,
// including an explicit "show" overriding Norep's no-repeat default.
// but its negative msgtype is none of NOREP/NOSHOW/STOP, so it acts as normal.
function msgtype_type(msg, norepeat = false) {
    const rule = game.msgtypes?.find(rule => rule.regex.test(String(msg)));
    if (rule) return rule.negated ? 'show' : rule.type;
    return norepeat ? 'norep' : 'show';
}

/* C pline.c:246-262 vpline(): a non-URGENT message whose MSGTYPE rule is
 * hide (MSGTYP_NOSHOW), or norep with the same text as gp.prevmsg, is dropped
 * before anything is drawn.  Exported for the direct topline writers that
 * bypass pline() (js/eat.js You()), so they honour the same rc rules. */
export function msgtype_suppressed(msg) {
    if (game._topl_urgent_next)
        return false;
    const msgtyp = msgtype_type(msg);
    return msgtyp === 'hide'
        || (msgtyp === 'norep' && game._prevmsg === String(msg));
}

/* C pline.c:283 vpline(): MSGTYP_STOP rule matched -> display_nhwindow(WIN_MESSAGE, TRUE).
 * For direct topline writers that bypass pline() (js/cmd.js look_here). */
export function msgtype_is_stop(msg) {
    return msgtype_type(msg) === 'stop';
}

/* A caller which defers putmesg must still flush where C calls vpline
 * (pline.c:266-274).  Remember that flush so publishing the queued message
 * does not paint changes made between the two halves, such as losehp(). */
export function prepare_deferred_pline(msg) {
    const msgtyp = msgtype_type(msg);
    if (!game._topl_urgent_next && (msgtyp === 'hide'
        || (msgtyp === 'norep' && game._prevmsg === String(msg))))
        return; // pline.c:250-264 suppresses the message before flushing.
    if (game.vision_full_recalc) vision_recalc(0);
    pline_flush_point();
    game._deferredPline = { msg, botl: _capture_botl(), seq: game._botlPaintSeq | 0,
        frame: capture_painted_frame_with_status() };
}

export function debugcore(filename, wildcards) {
    if (!game.flags?.debug || !filename)
        return false;
    const debugfiles = game.sysopt?.debugfiles;
    if (!debugfiles)
        return false;
    filename = nh_basename(filename, true);
    if (wildcards && pmatch(debugfiles, filename))
        return true;
    const p = debugfiles.indexOf(filename);
    const end = p + filename.length;
    return p >= 0
        && (p === 0 || debugfiles[p - 1] === ' ' || debugfiles[p - 1] === '/')
        && (end === debugfiles.length || debugfiles[end] === ' ');
}

/* C include/lint.h:29-38,60-64: debugpline's ifdebug wrapper preserves
 * the previous message code around the diagnostic message. */
export async function debugpline(filename, fmt, ...args) {
    if (!debugcore(filename, true))
        return;
    const saved = game.iflags.last_msg;
    await pline(fmt, ...args);
    game.iflags.last_msg = saved;
}

export async function pline(msg, ...args) {
    const deferred = args.length === 0 && game._deferredPline;
    if (!deferred || deferred.msg !== msg)
        return await _pline_body(msg, false, null, ...args);
    game._deferredPline = null;
    const held = game._botlPaintHeld;
    // A real bot() between preparation and publication supersedes this paint.
    if (deferred.seq === (game._botlPaintSeq | 0))
        game._lastPaintedBotl = deferred.botl;
    game._botlPaintHeld = true;
    try {
        return await _pline_body(msg, true);
    } finally {
        game._botlPaintHeld = held;
    }
}

async function _pline_body(msg, alreadyFlushed, putmesg = null, ...args) {
    if (args.length > 0)
        msg = nh_sprintf(msg, args);
    // The food-result adapter handles ordinary messages; exceptional messages
    if (game.a11y?.msg_loc?.x || game.a11y?.msg_loc?.y
        || (typeof msg === 'string' && msg.length > BUFSZ - 1))
        putmesg = null;
    /* C pline.c:162-190 vpline(): save a11y.msg_loc and always reset it; with
     * accessiblemsg and a valid location, prefix the message with
     * coord_desc(GPCOORDS_COMFULL) + ": ". */
    if (game.a11y?.msg_loc) {
        const mxy = game.a11y.msg_loc;
        game.a11y.msg_loc = { x: 0, y: 0 };
        if (msg && game.a11y.accessiblemsg && isok(mxy.x, mxy.y)) {
            const gp = game.iflags?.getpos_coords;
            msg = _rt_coord_desc(mxy.x, mxy.y, (!gp || gp === 'n') ? 'f' : gp) + ': ' + msg;
        }
    }
    if (msg === '') return; /* pline.c:166 !line || !*line */
    // C pline.c:212-225 vpline(): keep the final three characters on overflow.
    if (typeof msg === 'string' && msg.length > BUFSZ - 1)
        msg = msg.slice(0, BUFSZ - 7) + '...' + msg.slice(-3);
    // C pline.c:247-264: urgent messages bypass hide and no-repeat suppression.
    const msgtyp = msgtype_type(msg);
    if (!game._topl_urgent_next && (msgtyp === 'hide'
        || (msgtyp === 'norep' && game._prevmsg === String(msg))))
        return;
    if (putmesg && msgtyp !== 'stop')
        return putmesg(msg);
    /* C has only gt.toplines (topl.c:257-301): an eat occupation's committed
     * flavor line (fprefx, eat.c:2002) is still ON the topline when eatfood's
     * done_eating/cpostfx plines run, so it pages in FRONT of them, not after
     * (small mimic corpse: "fatty--More--" precedes "You finish eating"). */
    /* topl.c:257-300: a WIN_STOP-suppressed pline leaves the painted line
     * standing. Do not consume the occupation driver's committed prefix for
     * that pline; its silent-turn fold must retain that same visible line. */
    if (!game._topl_win_stop && game._occBeforeInput && game._occ_committed_topl
        && !game._pending_message && !game._occ_committed_topl.postMeal)
        restore_occupation_topline();
    else if (game.occupation && game._occ_committed_topl && !game._occBeforeInput
        && !game._pending_message && !game._occ_committed_topl.postMeal
        && (game._topl_urgent_next
            /* topl.c:257-300: under a live WIN_STOP (ESC at an earlier
             * --More--) a non-urgent pline is skipped -- neither joined nor
             * paged -- so the standing line must not be folded in front. */
            || (!game._topl_win_stop && !game._topl_win_stop_armed
                && (game._encumber_pline || game._inMovemonBlock)))) {
        /* allmain.c:208 encumber_msg() runs before the first eating turn; the
         * fprefx flavor line is still gt.toplines, so the load message pages
         * BEHIND it (topl.c:257-301) instead of being plined ahead of it. */
        /* The same holds for movemon's messages (allmain.c:212): no nhgetch
         * has acknowledged the occupation's topline before that world turn. */
        game._pending_message = game._occ_committed_topl.text;
        game._occ_committed_topl = null;
    }
    else if (game.occupation == null && game._occ_committed_topl?.postMeal
        && game._inMovemonBlock && !game._pending_message && !game._resultMessage) {
        game._pending_message = game._occ_committed_topl.text;
        game._occ_committed_topl = null;
    }
    if (typeof process !== 'undefined' && ENV?.FF_TOPL_TRACE === '1') {
        const _enc = (v) => encodeURIComponent(String(v ?? '').slice(0, 100));
        pushRngLogEntry(`^topl_pline[msg=${_enc(msg)} pending=${_enc(game._pending_message)} stop=${game._topl_win_stop ? 1 : 0} armed=${game._topl_win_stop_armed ? 1 : 0} arrival=${game._arrival_more_suppress ? 1 : 0}]`);
    }
    if (typeof process !== 'undefined' && ENV?.FF_MLTRACE === '1'
        && (String(msg).includes('carrot') || String(msg).includes('see again'))) {
        const _p = String(game._pending_message || ''), _r = String(game._resultMessage || '');
        pushRngLogEntry(`^ml_pline[msglen=${String(msg).length} msghead=${encodeURIComponent(String(msg).slice(0,80))} plen=${_p.length} phead=${encodeURIComponent(_p.slice(0,80))} rlen=${_r.length} rhead=${encodeURIComponent(_r.slice(0,80))} joins=${(game._topl_joins || []).join(',')}]`);
    }
    /* C ref: pline.c:266-272 — vpline() recalcs vision BEFORE update_topl()
     * decides anything, so a message swallowed by WIN_STOP (an ESC-dismissed
     * --More--) still runs it.  Leaving it to the paint path below skipped it
     * for every swallowed message and deferred its newsym() draws (display rng
     * under Hallucination) past the explosion's rndmonnam() draws. */
    if (game._topl_win_stop && game.vision_full_recalc && !game._pline_no_vision_recalc)
        vision_recalc(0);
    if (game._topl_win_stop) {
        /* C pline.c:273-274 flushes before putmesg() samples WIN_STOP in
         * topl.c:257.  Suppressing text still paints pending map/status changes;
         * botl.c:259 then preserves that last paint if later damage leaves -1 HP. */
        if (!alreadyFlushed)
            pline_flush_point();
        /* topl.c:257-301: skip suppresses drawing but leaves the physical
         * topline standing.  An input-free moveloop turn can have moved that
         * painted line into the result channel; restore it before returning
         * from a suppressed pline, so a later prompt flush retains it and
         * the next nhgetch retires it along with the live message. */
        if (!game._pending_message && game._resultMessage) {
            game._pending_message = game._resultMessage;
            game._resultMessage = null;
            game._resultMessageJoins = null;
            game._toplResultSnapshot = null;
        }
        /* topl.c:266-280: suppressed messages update gt.toplines, whose
         * history entries are maintained below.  The still-painted line is
         * no longer that buffer; nhgetch must not file it again after these
         * entries.  Use the same already-remembered marker as a recalled
         * line or a more() retry. */
        game._topl_history_recall = game._pending_message;
        const _txt = String(msg);
        const _buf = (game._topl_win_stop_buf != null)
            ? String(game._topl_win_stop_buf)
            : String(game._pending_message || game._topl_last_more_committed || '');
        /* C: n0 + strlen(gt.toplines) + 3 < CO - 8, i.e. buf + 2 + msg < 71. */
        const _fits = (_buf.length + 2 + _txt.length) < TOPL_LIMIT;
        const _notdied = (_fits && _txt.startsWith('You die')) ? 0 : 1;
        game._prevmsg = _txt;                 /* pline.c:282 runs regardless */
        if (game.iflags) game.iflags.last_msg = 0; /* pline.c:281 runs after putmesg() even when WIN_STOP swallowed it */
        if (_fits && _notdied !== 0) {
            /* JOIN arm with skip set: both Strcat()s, no addtopl(). */
            game._topl_win_stop_buf = _buf ? (_buf + '  ' + _txt) : _txt;
            const h = _msg_history_arr();
            /* nhgetch() files the acknowledged topline early.  C has not
             * remembered it yet: update_topl:266-269 extends gt.toplines,
             * and remember_topl:170-191 will store that entire joined line.
             * Extend our early entry too, including repeated messages. */
            if (h.length && h[h.length - 1] === _buf)
                h[h.length - 1] = game._topl_win_stop_buf;
            else if (_txt.length > 0)
                h.push(game._topl_win_stop_buf);
            return;
        }
        /* Fall-through arm.  `else if (!skip)` is skipped entirely, so there is
         * no more() and no page-ack; gt.toplines is REPLACED. */
        game._topl_win_stop_buf = _txt;
        /* topl.c:289 remember_topl() files the buffer being replaced.  The
         * ESC'd page's owner was painted but no key read has filed it yet. */
        if (_buf) {
            const h = _msg_history_arr();
            if (h.length === 0 || h[h.length - 1] !== _buf)
                h.push(_buf);
        }
        if (_notdied !== 0) {
            /* skip is still TRUE at :300 -> redotoplin() does not run: the
             * message is buffered and never painted. */
            const h = _msg_history_arr();
            /* remember_topl (topl.c:170-191) keeps exact repeats; the _buf arm
             * above already skips only the early-filed copy of the buffer. */
            if (_txt.length > 0)
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
        if (msgtyp === 'stop') {
            await _pline_stop();
        }
        return;
    } else if (game._topl_win_stop_armed) {
        game._topl_win_stop_armed = false;
        const _isDie = String(msg).startsWith('You die');
        const _deathEscape = _isDie
            && (String(game._topl_last_more_committed || '').length + 2
                + String(msg).length) < TOPL_LIMIT;
        if (_isDie) {
            game._topl_win_stop = false;
            game._topl_win_stop_buf = null;
            game._arrival_more_suppress = false;
        }
        if (game._arrival_more_suppress && !_isDie) {
            game._arrival_more_suppress = false;
            game._topl_win_stop = true;
            return await pline(msg);
        }
        if (!_deathEscape) game._topl_win_stop = true;
    }
    if (!alreadyFlushed && game.vision_full_recalc)
        vision_recalc(0);
    /* C's pre-message flush (pline.c:273-274) updates the map/status without
     * erasing the physical topline. Keep it for bytes that paint no cell;
     * our repaint reconstructs that row from the already-cleared input buffer. */
    const tabBackground = /[\x01-\x09\x0b-\x0d\x10-\x1a\x1c-\x1f]/.test(String(msg)) ? {
        output: game._screen_output,
        cells: game.nhDisplay?.grid?.map(row => row.map(cell => ({ ...cell }))),
    } : null;
    if (!alreadyFlushed) pline_flush_point();
    /* update_topl/redotoplin replaces EMPTY-window residue and makes the
     * message live again (topl.c:270-300,139). Suppressed messages above do
     * not reach this paint path and must leave the residue standing. */
    game._topl_empty_sticky = null;
    /* WIN_NOSTOP is a ONE-SHOT (wintty.c:2300).  Record the urgent message's
     * TEXT so the flush loop's ESC arm can find it among the messages still
     * standing on the accumulated topline.  Deliberately the text and not an
     * offset: the flush loop's string is re-composed from _resultMessage plus
     * the pending line and does not share pline()'s base — a 54-column prefix
     * from an earlier page made an offset point at the wrong message. */
    const _urgentNow = !!game._topl_urgent_next;
    game._topl_urgent_next = false;
    if (game._flushLateMsgs) {
        game._flushLateMsgs.push(String(msg));
        /* pline.c:274 froze the terminal at THIS pline's flush too: a message
         * arriving while a page's --More-- awaits its key (tmp_at's flush inside
         * m_throw's return_from_mtoss) is what raises the NEXT page, so that page
         * shows the map as of here.  The late-message splice below re-keys this
         * record to the message's place in the line; without one the page fell
         * back to the stale first-overflow snapshot (a later map_invisible 'I'
         * leaked onto a warned monster's square). */
        _pline_flush_frame_record(-3, String(msg));
    }
    let prev = game._pending_message;
    let adoptedResult = false;
    if ((!prev || prev.length === 0) && game._resultMessage
        && game._resultMessage !== msg) {
        const result = String(game._resultMessage);
        const joins = game._resultMessageJoins?.src === result
            ? game._resultMessageJoins.joins : _topl_joins_snapshot(result);
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
    const previousLoneFrame = game._lonePlineFrame;
    if (prev && prev.length > 0) {
        /* The result-channel merge above has already appended this message. */
        if (adoptedResult) {
            // keep the join record created by _topl_merge_result()
            /* Same pline.c:274 freeze for the yn prompt's more() as the join arm
             * below: the gush's first message pushes the command result into More,
             * and the later Dry-up prompt shows the terminal as flushed here. */
            if (!game._inMovemonBlock && game._inGushforth && game.level)
                game._lonePlineFrame = { msg: String(msg), tail: true,
                                         cells: _capture_painted_cells(),
                                         moves: _painted_moves() };
        } else {
        const joined = prev + '  ' + msg;
        // Record the JOIN offset (the index of the "  " separator within the
        // resulting topline) so the per-pline update_topl reserve rule can split
        // ONLY at genuine message boundaries — never at a "  " that lies inside a
        // single atomic pline (e.g. the 72-col welcome line).  C ref:
        // win/tty/topl.c — each pline()→update_topl() makes an independent
        // fit/more() decision per message, not per "  " in the rendered text.
        _topl_record_join(prev, joined);
        /* pline.c:274 flush_screen() precedes update_topl(), so a more() raised
         * by THIS join freezes the map as of here (drown: "You sink like a
         * rock." pages before the crawl-out teleds moves the hero). */
        if (!game._inMovemonBlock && !game._inGushforth && game.level
            && _topl_split_for_more(joined) !== null)
            _pline_flush_frame_record(prev.length, String(msg));
        /* pline.c:274 — each pline flushes the screen before update_topl()'s
         * more(); a page raised by THIS message froze the map as of here, not
         * as of the end of the hero's command (fountain gush: later pools). */
        /* The same freeze holds for ANY join that raises more(): a later
         * tty_yn_function more() (topl.c:397-398) precedes its own flush, so it
         * shows the terminal as THIS pline flushed it, not monsters made since
         * (fountain.c:51 dowatersnakes -> wizard-mode "Dry up fountain?"). */
        const _joinMore = !game._inMovemonBlock && !game._inGushforth && game.level
            && _topl_split_for_more(joined) !== null;
        /* pline.c:274's flush_screen(1) also runs bot(), so the status as of
         * this pline is on the physical line; a later losehp's SET_BOTL is not
         * (fountain.c:299-308 poison_strdmg: losestr's encumber_msg pline, then
         * losehp -> "Dry up fountain?" more() still shows the pre-damage HP). */
        if (!game._inMovemonBlock && !game._inGushforth && game.level)
            game._lonePlineFrame = { msg: String(msg), tail: true,
                                     cells: _capture_painted_cells(),
                                     moves: _painted_moves(), botl: _capture_botl() };
        /* A message joined onto the topline INSIDE the movemon block (a pet's
         * "picks up a gold piece.  X suddenly disappears!") still flushed the
         * terminal at pline.c:274 before putmesg, i.e. before mtele_trap's
         * seetrap() (teleport.c:1962-1996).  A later paranoid-trap yn more()
         * (topl.c:390-392) shows THAT terminal.  `tail` lets the joined text
         * match this frame (seq/ux/uy staleness as in the fresh arm). */
        if (game._inMovemonBlock && !game._inGushforth && !_joinMore && game.level)
            game._lonePlineFrame = { msg: String(msg), tail: true,
                                     cells: _capture_painted_cells(),
                                     moves: _painted_moves(), botl: _capture_botl(),
                                     ux: game.u?.ux, uy: game.u?.uy,
                                     seq: (game._toplShownSeq | 0) + 1,
                                     runFlush: game._runFlushSeq | 0,
                                     statusSeq: game._statusPaintSeq | 0 };
        if (!game._inMovemonBlock && game._inGushforth) {
            _pline_flush_frame_record(prev.length, String(msg));
            /* A later yn prompt's more() shows the terminal as the LAST pline
             * flushed it; `tail` lets the joined remainder match this frame. */
            if (game.level)
                game._lonePlineFrame = { msg: String(msg), tail: true,
                                         cells: _capture_painted_cells(),
                                         moves: _painted_moves() };
        }
        game._pending_message = joined;
        }
    } else {
        // First message of a new world block on top of a committed command
        // result: record the flushed frame for the boundary it opens (see
        // _pline_flush_frame_record).  No-op when there is no separate result
        // line to page ahead of it.
        const _res = game._resultMessage;
        /* The post-meal committed topline (_occ_committed_topl.postMeal, e.g.
         * eat.c:2128's "This satiates your stomach!" + stop_occupation's "You
         * stop eating ...") is still on C's ONE topline, so this pline's
         * update_topl pages it -- frozen at this pline's pline.c:274 flush,
         * i.e. BEFORE the damage this hit message precedes (mhitu.c hitmsg
         * then mdamageu).  It is folded in front later (fastforward.js
         * drain_pending_death_in_place); key the frame where that fold puts
         * the boundary. */
        const _pmc = game._occ_committed_topl;
        /* The same topline is committed while eating: encumber_msg's pline
         * (allmain.c:208, pickup.c:2003) flushes before setting botl.  Preserve
         * that frame before the occupation tick repaints the changed load. */
        if (!_res && _pmc?.text && (_pmc.postMeal ? !game.occupation : !!game.occupation)
            && _pmc.text !== msg)
            _pline_flush_frame_record(String(_pmc.text).length, String(msg));
        /* C pline.c:273-276 / topl.c:262-274: an identical repeated pline
         * still flushes before paging the committed line.  Equal text in the
         * result channel is a previous message, not this incoming call. */
        if (_res)
            _pline_flush_frame_record(_res.length, String(msg));
        else if (!_res && String(msg).length >= 80)
            /* A lone message that wraps onto a second row raises more() from
             * inside its OWN redotoplin (topl.c:157-160), after its own
             * flush_screen (pline.c:274) and before the turn's movemon.  Its
             * frame is keyed -2: the "  " separator would end at 0. */
            _pline_flush_frame_record(-2, String(msg));
        /* C pline.c:274 froze the physical screen at this pline.  A later
         * tty_yn_function more() (topl.c:397-398) runs BEFORE its own
         * custompline flush, so it shows THIS frame, not the map after any
         * turn that ran in between (see force_more_lone_frame). */
        if (!_res && game.level)
            game._lonePlineFrame = { msg: String(msg), cells: _capture_painted_cells(),
                                     moves: _painted_moves(), botl: _capture_botl(),
                                     ux: game.u?.ux, uy: game.u?.uy,
                                     seq: (game._toplShownSeq | 0) + 1,
                                     runFlush: game._runFlushSeq | 0,
                                     statusSeq: game._statusPaintSeq | 0 };
        game._pending_message = msg;
    }
    if (tabBackground)
        game._topl_tab_background = { ...tabBackground, text: game._pending_message };
    if (game._lonePlineFrame && game._lonePlineFrame !== previousLoneFrame)
        game._lonePlineFrame.flushEpoch = _flush_epoch;
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
    /* Sequence stamp of the shown-pline flush (pline.c:273-274): every shown
     * message flushed the terminal immediately before its putmesg, so this
     * counter is "how many plines have painted since startup". force_more_
     * lone_frame compares it against the lone frame's seq to tell a hero who
     * stepped WITHOUT a later pline (terminal still at the lone frame) from
     * one a later pline repainted (terminal moved on; use the live map). */
    game._toplShownSeq = (game._toplShownSeq | 0) + 1;
    if (game._inMovemonBlock && game.level)
        game._movemonPlinePhys = { cells: _capture_painted_cells(),
                                   moves: _painted_moves(),
                                   seq: game._toplShownSeq,
                                   r1whole: !!game._status1Whole };
    _maybe_snapshot_painted_screen();
    // C pline.c:283-284: stop/more blocks immediately after putmesg and
    // prevmsg, before the caller can continue or consume another command.
    if (msgtyp === 'stop') {
        await _pline_stop();
    }
}
export async function Norep(msg, ...args) {
    const text = (args.length > 0) ? nh_sprintf(msg, args) : String(msg);
    if (msgtype_type(text, true) === 'norep' && game._prevmsg === text)
        return;
    await pline(text);
}

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
/* C pline.c:364-385,414-424: prefix the format before vpline formats it. */
export function You(line, ...args) {
    return _You(null, line, args);
}
/* The eating occupation has a separate putmesg adapter for its result channel.
 * Share C's You()/vpline() prefix, formatting, origin, length and MSGTYPE work;
 * the adapter only receives the finished message (pline.c:366-374,162-264). */
export function You_with_output(putmesg, line, ...args) {
    return _You(putmesg, line, args);
}
function _You(putmesg, line, args) {
    const msg = 'You ' + line;
    return putmesg ? _pline_body(msg, false, putmesg, ...args)
                  : pline(msg, ...args);
}
export function Your(line, ...args) {
    return pline('Your ' + line, ...args);
}
/* C pline.c:403-412: prefix the format, then let vpline substitute once. */
export function You_cant(line, ...args) {
    return pline("You can't " + line, ...args);
}
export function pline_The(line, ...args) {
    return pline('The ' + line, ...args);
}
/* C pline.c:475-492: quote the format before substituting its arguments.
 * PLINE_VERBALIZE is consumed only by SoundSpeak (sndprocs.h:239-247);
 * this port has no sound backend.  Deafness is the caller's responsibility. */
export function verbalize(line, ...args) {
    return pline('"' + line + '"', ...args);
}
/* C pline.c:425-434: prefix before formatting, like You() and pline_The(). */
export function There(line, ...args) {
    return pline('There ' + line, ...args);
}
/* C pline.c:138-154: the hero has no map-origin prefix; other monsters do. */
export function pline_mon(mon, line, ...args) {
    if (is_youmonst(mon)) set_msg_xy(0, 0);
    else set_msg_xy(mon.mx, mon.my);
    return pline(line, ...args);
}
/* C pline.c:388-400 You_feel(): sensations use dream wording while unaware. */
export async function You_feel(line, ...args) {
    const prefix = Unaware() ? 'You dream that you feel ' : 'You feel ';
    return pline(prefix + String(line), ...args);
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

/* C display.c:207-211 / display.h:146-151.  The distance arm deliberately
 * tests HTelepat & ~INTRINSIC, not extrinsic telepathy (ETelepat). */
export function knowninvisible(mon) {
    const si = _uprop(SEE_INVIS);
    const detect = _uprop(DETECT_MONSTERS);
    return !!(mon.minvis
        && ((cansee(mon.mx, mon.my) && (si.i || si.e || detect.i || detect.e))
            || (!Blind() && (_uprop(TELEPAT).i & ~INTRINSIC)
                && distu_sensemon(mon.mx, mon.my) <= BOLT_LIM * BOLT_LIM)));
}

// C ref: display.h:106-108 _see_with_infrared macro
//   (!Blind && Infravision && infravisible(mon->data) && couldsee(mon->mx, mon->my))
// Infravision (youprop.h:186) = HInfravision || EInfravision; racial infravision
// (orc/elf/dwarf/gnome) is the INTRINSIC bit, set by set_uasmon() at u_init
// (polyself.c:92 PROPSET(INFRAVISION, infravision(&mons[urace.mnum]))).
export function see_with_infrared(mon) {
    if (!mon) return false;
    const u = game.u || {};
    // C display.h:107: Blind includes !BBlinded (Eyes of the Overworld).
    if (Blind()) return false;
    const infraP = u.uprops?.[INFRAVISION];
    const infravision = !!(infraP && (infraP.intrinsic || infraP.extrinsic));
    if (!infravision) return false;
    /* infravisible(mon->data): monster is warm-blooded (M3_INFRAVISIBLE). */
    if (!infravisible_mon(mon)) return false;
    /* couldsee(mon->mx, mon->my): hero has line-of-sight to the monster's cell. */
    return !!couldsee(mon.mx | 0, mon.my | 0);
}

function worm_known(mon) { return worm_known_real(mon); }

// C ref: display.h:117-120 _canseemon macro
// Checks hero can see the monster's location AND mon_visible.
// canseemon = (wormno ? worm_known : (cansee(mx,my) || see_with_infrared)) && mon_visible
export function canseemon(mon) {
    if (!mon) return false;
    /* C display.h:122-125 reads cansee()'s current vision bits even
     * between a blindness change and the next vision_recalc().  Only the
     * infravision arm has its own Blind test. */
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

    const mnum = mon.mnum | 0;
    if (mnum < 0) return 0; // Invalid monster number
    if (_tp_mindless(mon)) return 0;

    /* C display.h:46 uses Blind, including !BBlinded (youprop.h:103):
     * the Eyes of the Overworld suppress blindness and therefore also the
     * blind-only telepathy arm, even while HBlinded has a timeout. */
    const telP = _uprop(TELEPAT);
    const blind = Blind();
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
export function sensemon(mon) {
    if (!mon) return false;
    const u = game.u || {};
    /* (!u.uswallow || mon == u.ustuck) */
    if (u.uswallow && mon !== u.ustuck) return false;
    /* (!Underwater || (mdistu(mon) <= 2 && is_pool(mon->mx, mon->my))); Underwater = u.uinwater */
    if (u.uinwater) {
        const md = distu_sensemon(mon.mx | 0, mon.my | 0);
        if (!(md <= 2 && is_pool(mon.mx | 0, mon.my | 0))) return false;
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
// goto_level checks the destination's graphics before assigning u.uz (do.c:1666-1675).
export function check_gold_symbol(level = game.u?.uz) {
    const g = game || {};
    // gs.showsyms[SYM_OFF_O + COIN_CLASS] = gs.showsyms[105 + 12] = gs.showsyms[117]
    // nhsym goldch = gs.showsyms[COIN_CLASS + SYM_OFF_O];
    // Default COIN symbol is '$' (ASCII 36) from defsym.h OBJCLASS(12, '$', COIN, ...)
    const showsyms = gs.showsyms;
    let goldch;
    if (Is_rogue_level(level)) {
        /* symbols.c:217-233 selects rogue_syms before this check. Resolve
         * that set directly, as the renderer does, rather than the departing
         * level's primary symset. drawing.c:79 defaults Rogue gold to '*'. */
        const idx = SYM_OFFSETS.O + COIN_CLASS_DISP;
        const set = gs.symset?.[1];
        goldch = g.go?.ov_rogue_syms?.[idx] || g.gr?.rogue_syms?.[idx]
            || (String(set?.name ?? '').toLowerCase() === 'blank' ? 32
                : set?.name === 'RogueEpyx' ? 15 : '*'.charCodeAt(0));
    } else if (primary_showsym(SYM_OFFSETS.O + COIN_CLASS_DISP)) {
        goldch = primary_showsym(SYM_OFFSETS.O + COIN_CLASS_DISP);
    } else if (showsyms && showsyms.length > 117) {
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
export function suppress_map_output() {
    const g = game || {};
    const program_state = g.program_state || {};
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
// show_glyph_cell tracks ordinary paint changes below.  Forced repaints also
// matter when the glyph is unchanged, as with getpos_sethilite's
// selection_force_newsyms (getpos.c:60-62 via selvar.c:801-810).
//
// Tracked here as the row-major maximum of the forced cells; flush_screen
// consumes it, which is also where C clears gnew.
let _forced_gnew = null; /* {x, y} in MAP coordinates, or null */

export function newsym_force(x, y) {
    newsym(x, y);
    const loc = game.level?.at(x, y);
    if (loc) loc.disp_forced_epoch = _flush_epoch;
    if (!_forced_gnew || y > _forced_gnew.y
        || (y === _forced_gnew.y && x > _forced_gnew.x))
        _forced_gnew = { x: x | 0, y: y | 0 };
}

// C ref: display.c:2330 `gptr->gnew = 0` — the flag is cleared by the repaint,
// so the residue applies to exactly one flush_screen.  Returns the screen
// [col, row] that repaint leaves the cursor at, or null when nothing was forced.
/* True when the LAST flush_screen() left the cursor where its repaint loop put
 * it (a changed or forced-gnew cell) rather than at _buildScreenOutput's
 * default. Read by getpos(), which models C's
 * `curs(WIN_MAP, cx, cy); flush_screen(0)` pair. */
let _last_flush_forced_cursor = false;
let _flush_ran_bot = false;
let _flush_had_botlx = false;
let _last_flush_status_end = null;
/* [col,row] where the LAST flush_screen(0)'s bot() left the tty cursor, or null. */
export function last_flush_status_end() {
    return _last_flush_status_end;
}
export function last_flush_forced_cursor() {
    return _last_flush_forced_cursor;
}

/* C display.c:2240-2256: the row-major last cell whose buffered paint differs
 * from what the terminal held at the last flush (gnew), as the screen
 * [col, row] tty_print_glyph's g_putch leaves the cursor at; null if none. */
function _last_changed_gnew_cursor() {
    const lev = game?.level;
    if (!lev?.at) return null;
    for (let y = ROWNO - 1; y >= 0; y--)
        for (let x = COLNO - 1; x >= 1; x--) {
            const loc = lev.at(x, y);
            if (!loc || loc.disp_flush_epoch !== _flush_epoch) continue;
            const a = loc.disp_flushed_cell, b = _buffered_capture_cell(loc);
            if (!a || a.ch !== b.ch || a.color !== b.color
                || !!a.dec !== !!b.dec || (a.attr | 0) !== (b.attr | 0))
                return [x, y + 1];
        }
    return null;
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

export function see_objects() {
    cosmic_push_owner_real("see_objects");
    for (let obj = game.fobj; obj; obj = obj.nobj ?? null) {
        if (vobj_at(obj.ox, obj.oy) === obj)
            newsym(obj.ox, obj.oy);
    }
    update_inventory();
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
        // C steed.c:379 removes the mount from the monster grid, not fmon.
        if (m === game.u?.usteed) continue;
        if (m._mapRemoved) continue;
        /* DEADMONSTER — C m_at reads the grid, which m_detach cleared; but a
         * zero-HP monster stays on the grid until mon_leaving_level: inside
         * lifesaved_monster (mon.c:2839) and mongone's inventory teardown
         * (mon.c:3267-3282). */
        if ((m.mhp | 0) < 1 && !m._zeroHpOnGrid) continue;
        if (m.mx === x && m.my === y)
            return m;
    }
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

    /* C display.c:754: use the same level-creation/save/restore guards. */
    if (suppress_map_output())
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
    if (game.u?.uinwater && !Is_waterlevel(game.u?.uz)
        && !is_pool_or_lava(x, y) && !is_ice(x, y))
        return;

    /* Set the seen vector as if the hero had seen it.
       It doesn't matter if the hero is levitating or not.
       C display.c:3369-3377 set_seenv(lev, u.ux, u.uy, x, y). */
    {
        const ux = game.u?.ux | 0, uy = game.u?.uy | 0;
        const dx = x - ux, dy = uy - y;
        const sgn = (z) => (z < 0 ? -1 : (z !== 0 ? 1 : 0));
        lev.seenv = (lev.seenv | 0) | SEENV_MATRIX[sgn(dy) + 1][sgn(dx) + 1];
    }

    if (!can_reach_floor(false)) {
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
            let do_room_glyph = false;
            const rg = lev.remembered_glyph;
            if (_rg_is_boulder(rg) || rg?.cls === GLYPHCLS_INVIS) {
                if (typ !== ROOM && (lev.seenv | 0))
                    map_background(x, y, 1);
                else
                    do_room_glyph = true;
            } else if (_rg_in_stone_to_room_range(rg)) {
                do_room_glyph = true;
            }
            if (do_room_glyph) {
                /* C: flags.dark_room && iflags.use_color && !Is_rogue_level →
                 * S_darkroom (display.c:836-843); otherwise S_room or S_stone. */
                const dark = _darkroom_paints() && !Is_rogue_level(game.u?.uz);
                const glyph = _feel_cmap_glyph(dark ? S_DARKROOM_C
                    : (lev.waslit ? S_ROOM_C : S_STONE_C));
                lev.remembered_glyph = glyph;
                show_glyph_cell(x, y, glyph.ch, glyph.color, glyph.decgfx, _glyph_attr(glyph),
                                glyph.cls, false, null, null, null, glyph.cmap);
            }
        } else {
            /* We feel it (I think hallways are the only things left). */
            map_background(x, y, 1);
            /* Corridors are never felt as lit (unless remembered that way) */
            const rg = lev.remembered_glyph;
            if (typ === CORR && !lev.waslit && _rg_is_cmap(rg, S_LITCORR_C))
                _feel_show_cmap(x, y, S_CORR_C);
            else if (typ === ROOM && _darkroom_paints() && _rg_is_cmap(rg, S_ROOM_C))
                _feel_show_cmap(x, y, S_DARKROOM_C);
        }
    } else {
        if ((ep = engr_at(x, y)) !== null && ep !== undefined
            && _engr_can_be_felt(ep))
            ep.erevealed = 1;

        _map_location(x, y, 1);

        if (game.u?.uball) { /* C youprop.h:77 Punished */
            /*
             * A ball or chain is only felt if it is first on the object
             * location list.  Otherwise clear the felt bit — something has
             * been dropped on the ball/chain.
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

        /* C display.c:893-900 chooses the glyph by dark_room alone, after
         * testing both dark_room and use_color in the branch condition. */
        const rg = lev.remembered_glyph;
        const typ = lev.typ | 0;
        if (typ === ROOM && _rg_is_cmap(rg, S_ROOM_C)
            && (!lev.waslit || _darkroom_paints()))
            _feel_show_cmap(x, y, (game.flags?.dark_room ?? true)
                ? S_DARKROOM_C : S_STONE_C);
        else if (typ === CORR && !lev.waslit && _rg_is_cmap(rg, S_LITCORR_C))
            _feel_show_cmap(x, y, S_CORR_C);
    }

    /* draw monster on top if we can sense it */
    if (!(game.u?.ux === x && game.u?.uy === y)
        && (mon = _m_at(x, y)) !== null && sensemon(mon)) {
        /* C feel_location distinguishes detection from telepathy/warning.
         * Detection-only glyphs carry inverse highlighting, with pet priority. */
        const tg = terrain_glyph(lev, x, y);
        _render_monster_glyph(x, y, mon, lev, tg,
                              !!(tp_sensemon(mon) || MATCH_WARN_OF_MON(mon)),
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

/* C display.c:3383-3393.  Vault corridor removal clears the view from
 * (x0,y0), including all bits at the removed square itself (SVALL). */
export function unset_seenv(lev, x0, y0, x1, y1) {
    const dx = x1 - x0, dy = y0 - y1;
    lev.seenv &= ~SEENV_MATRIX[dy + 1][dx + 1];
}

/* C display.c:829: lev->glyph == objnum_to_glyph(BOULDER) compares the
 * object identity, independently of its configured display character. */
function _rg_is_boulder(rg) {
    return !!rg && rg.cls === GLYPHCLS_OBJ && rg.otyp === BOULDER_OTYP && !rg.objpile;
}

/* C's feel_location/unmap_object assign cmap glyphs, retaining their identity
 * even when a symset or !color makes two of them look the same. */
function _feel_cmap_glyph(cmap) {
    let cell = cmap_to_glyph_disp(cmap)
        ?? { ch: defsym_char(cmap), color: _CMAP_COLORS[cmap] ?? NO_COLOR, dec: false };
    if (rogue_ibm_terrain()) {
        /* symbols RogueEpyx: S_ndoor = S_vodoor = S_hodoor = \xce ('N'); the
         * closed doors keep '+'. */
        if (cmap === S_NDOOR_C || cmap === S_VODOOR_C || cmap === S_HODOOR_C)
            cell = { ch: 'N', color: CLR_BROWN, dec: false };
        else if (cmap === S_ROOM_C)
            cell = _epyx_terrain({ typ: ROOM }, cell);
        else if (cmap === S_UPSTAIR_C || cmap === S_DNSTAIR_C)
            cell = _epyx_terrain({ typ: STAIRS }, cell);
        else if (cmap === S_CORR_C || cmap === S_LITCORR_C)
            cell = _epyx_terrain({ typ: CORR }, { ...cell,
                color: cmap === S_LITCORR_C ? CLR_WHITE : NO_COLOR });
    }
    if (!rogue_graphics()) {
        /* C symbols.c:1067 do_symset resets S_darkroom to its own symbol until
         * display.c:1850-1853 reglyph_darkroom restores the active alias. */
        const idx = cmap === S_DARKROOM_C && !game._symsetDarkroomPending
            ? (_darkroom_alias_blank() ? SYM_OFFSETS.X : S_ROOM_C) : cmap;
        const sym = primary_showsym(idx);
        if (sym)
            cell = { ...cell, ...symset_cell(sym) };
    }
    if (cmap === S_DARKROOM_C && !game._symsetDarkroomPending
        && _darkroom_alias_blank())
        cell = { ...cell, ch: _nothing_ch(), dec: false };
    if (cmap === S_LITCORR_C && !ibm_mode())
        cell = { ...cell, color: CLR_WHITE };
    /* C map_glyphinfo (display.c:2890-2916) retains the monochrome
     * distinction when #terrain reconstructs a furniture mimic's glyph. */
    return { ch: cell.ch, color: cell.color, decgfx: cell.dec,
             cls: GLYPHCLS_CMAP, cmap, bwspec: cell.bwspec,
             attr: _glyph_attr({ ...cell, cmap }) };
}
// C detect.c:2257: terrain views use the same cmap glyph as map memory.
export { _feel_cmap_glyph as cmap_glyph };

/* C display.c:1096,1754: newsym and docrt both show the stored glyph
 * through map_glyphinfo, resolving its paint in the current symbol set. */
function _show_remembered_glyph(x, y, rg) {
    _refresh_remembered_wall(rg);
    const glyph = _remembered_glyph_cell(rg);
    show_glyph_cell(x, y, glyph.ch, glyph.color, glyph.decgfx,
                    _glyph_attr(glyph),
                    glyph.nothing ? GLYPHCLS_NOTHING : glyph.cls ?? GLYPHCLS_CMAP,
                    false, glyph.otyp, glyph.corpsenm, glyph.ttyp,
                    glyph.wallSymbol ? (_WALL_KEY_CMAP[glyph.wallSymbol] ?? null)
                        : glyph.cmap ?? null,
                    glyph.objpile);
}

/* C display.c:2004 map_glyphinfo resolves the stored glyph, rather than
 * re-mapping live objects or terrain which may have changed out of sight.
 * raw=true preserves remembered hallucinated object/species identities and
 * consumes no new display RNG. */
function _remembered_glyph_cell(rg) {
    /* C display.h random_obj_to_glyph() can roll STATUE as a plain object
     * glyph (GLYPH_OBJ_OFF + STATUE, the rock-class '`'), distinct from a real
     * statue glyph, which carries a species.  Only the latter has corpsenm. */
    if (rg.cls === GLYPHCLS_OBJ && rg.otyp === STATUE && rg.corpsenm === undefined)
        return rg;
    if (rg.cls === GLYPHCLS_OBJ && Number.isInteger(rg.otyp)) {
        if (Number.isInteger(rg.glyph)) {
            const g = rg.glyph;
            if (g >= GLYPH_OBJ_OFF && g < GLYPH_STATUE_MALE_OFF) {
                const otyp = g - GLYPH_OBJ_OFF;
                const oc = MKOBJ_OC_CLASS[otyp];
                const shufCol = game._objColors?.[otyp];
                const ocol = (shufCol !== undefined) ? shufCol
                    : ((otyp >= 0 && otyp < MKOBJ_OC_COLOR.length)
                       ? MKOBJ_OC_COLOR[otyp] : (OCLASS_COLOR[oc] ?? CLR_GRAY));
                return { ...rg, ch: _object_sym(otyp, oc) ?? '?', color: ocol,
                         decgfx: false, otyp, objpile: rg.objpile };
            }
            if (g >= GLYPH_BODY_OFF && g < GLYPH_RIDDEN_MALE_OFF) {
                const mndx = g - GLYPH_BODY_OFF;
                return { ...rg, ch: oclass_sym(MKOBJ_OC_CLASS[CORPSE]) ?? '?',
                         color: (mndx >= 0 && mndx < MON_MCOLOR.length)
                             ? MON_MCOLOR[mndx] : CLR_GRAY,
                         decgfx: false, corpsenm: mndx, objpile: rg.objpile };
            }
        }
        const obj = { otyp: rg.otyp, corpsenm: rg.corpsenm, dknown: 1,
                      oclass: MKOBJ_OC_CLASS[rg.otyp], quan: 1 };
        return { ...rg, ..._obj_to_glyph(obj, true), objpile: rg.objpile };
    }
    if (rg.cls === GLYPHCLS_TRAP && Number.isInteger(rg.ttyp))
        return { ...rg, ...trap_to_glyph({ ttyp: rg.ttyp }) };
    if (rg.cls === GLYPHCLS_ENGR)
        return { ...rg, ch: engraving_symbol(!!rg.bwengr), color: engraving_color(),
                 decgfx: false };
    if (rg.cls === GLYPHCLS_INVIS)
        return { ...rg, ch: 'I', color: NO_COLOR, decgfx: false };
    if ((rg.cls === GLYPHCLS_CMAP || rg.cls === undefined)
        && Number.isInteger(rg.cmap) && rg.cmap >= 0
        && !rg.wallSymbol && !rg.nothing) {
        const cell = _feel_cmap_glyph(rg.cmap);
        /* C display.h altar_to_glyph encodes alignment as well as cmap.
         * This cell model retains that variant in its remembered color. */
        return { ...rg, ...cell, color: rg.cmap === S_ALTAR_C ? rg.color : cell.color };
    }
    return rg;
}

function _rg_is_cmap(rg, cmap) {
    if (!rg || (rg.cls !== undefined && rg.cls !== GLYPHCLS_CMAP) || rg.nothing)
        return false;
    if (Number.isInteger(rg.cmap))
        return rg.cmap === cmap;
    const glyph = _feel_cmap_glyph(cmap);
    return rg.ch === glyph.ch && rg.color === glyph.color && !!rg.decgfx === !!glyph.decgfx;
}

function _feel_show_cmap(x, y, cmap) {
    const glyph = _feel_cmap_glyph(cmap);
    game.level.at(x, y).remembered_glyph = glyph;
    show_glyph_cell(x, y, glyph.ch, glyph.color, glyph.decgfx, _glyph_attr(glyph),
                    glyph.cls, false, null, null, null, cmap);
}

/* C: lev->glyph >= cmap_to_glyph(S_stone) && < cmap_to_glyph(S_darkroom) —
 * defsym.h cmap indices 0..19: S_stone, the eleven wall symbols, S_ndoor,
 * the four door symbols, S_bars, S_tree, S_room.  S_darkroom (20) and every
 * later cmap (S_corr onward) are OUTSIDE the range.  In this port's
 * {ch,color} glyph model that set is identified by char+color.  Two char
 * collisions need the colour: '#' is S_bars (CLR_CYAN) / S_tree (CLR_GREEN) —
 * in range — versus S_corr / S_litcorr (NO_COLOR / CLR_WHITE) — out of range;
 * '|' is walls (CLR_GRAY) and horizontal open doors (CLR_BROWN) — in range —
 * versus S_grave (CLR_WHITE, defsym.h:131, index 34) — out of range. */
function _rg_in_stone_to_room_range(rg) {
    if (!rg || (rg.cls !== GLYPHCLS_CMAP && rg.cls !== undefined))
        return false;
    if (rg.nothing)
        return false;
    if (Number.isInteger(rg.cmap))
        return rg.cmap >= S_STONE_C && rg.cmap < S_DARKROOM_C;
    switch (rg.ch) {
    case ' ':  return rg.color === NO_COLOR;                 /* S_stone */
    case '|':  return rg.color !== CLR_WHITE;  /* walls / open doors; S_grave is CLR_WHITE */
    case '-':  return true;    /* walls (CLR_GRAY), open doors (CLR_BROWN) */
    case '+':  return true;    /* closed doors */
    case '.':  return rg.color !== CLR_BLACK;   /* S_ndoor / S_room, not dark */
    case '~':  return rg.decgfx && rg.color !== CLR_BLACK;   /* DEC S_room */
    case '#':  return rg.color === CLR_CYAN || rg.color === CLR_GREEN;
    /* DECgraphics wall cells (S_vwall..S_trwall, dat/symbols line-drawing) */
    case 'j': case 'k': case 'l': case 'm': case 'n': case 'q':
    case 't': case 'u': case 'v': case 'w': case 'x':
        return !!rg.decgfx;
    default:   return false;
    }
}


/* C display.h:497-545 — glyph_offsets, NUMMONS=383, NUM_OBJECTS=481.
 * Keep the arithmetic ordering: reset_glyphmap and show_glyph classify glyphs
 * by descending offsets, not by their rendered character. */
const GLYPH_MON_MALE_OFF = 0;
const GLYPH_MON_FEM_OFF = MON_MLET.length;
const GLYPH_PET_MALE_OFF = GLYPH_MON_FEM_OFF + MON_MLET.length;
const GLYPH_PET_FEM_OFF = GLYPH_PET_MALE_OFF + MON_MLET.length;
const GLYPH_INVIS_OFF = GLYPH_PET_FEM_OFF + MON_MLET.length;
const GLYPH_DETECT_MALE_OFF = GLYPH_INVIS_OFF + 1;
const GLYPH_DETECT_FEM_OFF = GLYPH_DETECT_MALE_OFF + MON_MLET.length;
const GLYPH_BODY_OFF = GLYPH_DETECT_FEM_OFF + MON_MLET.length;
const GLYPH_RIDDEN_MALE_OFF = GLYPH_BODY_OFF + MON_MLET.length;
const GLYPH_RIDDEN_FEM_OFF = GLYPH_RIDDEN_MALE_OFF + MON_MLET.length;
const GLYPH_OBJ_OFF = GLYPH_RIDDEN_FEM_OFF + MON_MLET.length;
const GLYPH_CMAP_STONE_OFF = GLYPH_OBJ_OFF + MKOBJ_OC_CLASS.length;
const GLYPH_CMAP_MAIN_OFF = GLYPH_CMAP_STONE_OFF + 1;
const GLYPH_CMAP_MINES_OFF = GLYPH_CMAP_MAIN_OFF + 11;
const GLYPH_CMAP_GEH_OFF = GLYPH_CMAP_MINES_OFF + 11;
const GLYPH_CMAP_KNOX_OFF = GLYPH_CMAP_GEH_OFF + 11;
const GLYPH_CMAP_SOKO_OFF = GLYPH_CMAP_KNOX_OFF + 11;
const GLYPH_CMAP_A_OFF = GLYPH_CMAP_SOKO_OFF + 11;
const GLYPH_ALTAR_OFF = GLYPH_CMAP_A_OFF + 21;
const GLYPH_CMAP_B_OFF = GLYPH_ALTAR_OFF + 5;
const GLYPH_ZAP_OFF = GLYPH_CMAP_B_OFF + 40;
const GLYPH_CMAP_C_OFF = GLYPH_ZAP_OFF + 32;
const GLYPH_SWALLOW_OFF = GLYPH_CMAP_C_OFF + 10;
const GLYPH_EXPLODE_DARK_OFF = GLYPH_SWALLOW_OFF + MON_MLET.length * 8;
const GLYPH_EXPLODE_NOXIOUS_OFF = GLYPH_EXPLODE_DARK_OFF + 9;
const GLYPH_EXPLODE_MUDDY_OFF = GLYPH_EXPLODE_NOXIOUS_OFF + 9;
const GLYPH_EXPLODE_WET_OFF = GLYPH_EXPLODE_MUDDY_OFF + 9;
const GLYPH_EXPLODE_MAGICAL_OFF = GLYPH_EXPLODE_WET_OFF + 9;
const GLYPH_EXPLODE_FIERY_OFF = GLYPH_EXPLODE_MAGICAL_OFF + 9;
const GLYPH_EXPLODE_FROSTY_OFF = GLYPH_EXPLODE_FIERY_OFF + 9;
const GLYPH_WARNING_OFF = GLYPH_EXPLODE_FROSTY_OFF + 9;
const GLYPH_STATUE_MALE_OFF = GLYPH_WARNING_OFF + 6;
const GLYPH_STATUE_FEM_OFF = GLYPH_STATUE_MALE_OFF + MON_MLET.length;
const GLYPH_OBJ_PILETOP_OFF = GLYPH_STATUE_FEM_OFF + MON_MLET.length;
const GLYPH_BODY_PILETOP_OFF = GLYPH_OBJ_PILETOP_OFF + MKOBJ_OC_CLASS.length;
const GLYPH_STATUE_MALE_PILETOP_OFF = GLYPH_BODY_PILETOP_OFF + MON_MLET.length;
const GLYPH_STATUE_FEM_PILETOP_OFF = GLYPH_STATUE_MALE_PILETOP_OFF + MON_MLET.length;
const GLYPH_UNEXPLORED_OFF = GLYPH_STATUE_FEM_PILETOP_OFF + MON_MLET.length;
const GLYPH_NOTHING_OFF = GLYPH_UNEXPLORED_OFF + 1;
const MAX_GLYPH = GLYPH_NOTHING_OFF + 1;

/* C display.h:995-1012 — glyph_map.glyphflags. */
const MG_HERO = 0x1, MG_CORPSE = 0x2, MG_INVIS = 0x4, MG_DETECT = 0x8,
    MG_PET = 0x10, MG_RIDDEN = 0x20, MG_STATUE = 0x40, MG_OBJPILE = 0x80,
    MG_BW_LAVA = 0x100, MG_BW_ICE = 0x200, MG_BW_SINK = 0x200,
    MG_BW_ENGR = 0x200, MG_NOTHING = 0x400, MG_UNEXPL = 0x800,
    MG_MALE = 0x1000, MG_FEMALE = 0x2000;

/* C defsym.h:90-247 defsyms[].color; shared with the glyph-ID listing. */
const _CMAP_COLORS = [8,7,7,7,7,7,7,7,7,7,7,7,7,3,3,3,3,6,2,7,0,12,7,7,12,
    7,7,3,3,11,11,11,11,7,15,11,15,12,4,6,1,9,3,3,3,3,6,7,12,
    ...TRAP_GLYPHS.map(t => t.color), 7,7,7,7,15,15,3,3,12,12,12,12,10,12];

/* C display.c:2698-2716; only Rogue IBM graphics uses these colors. */
function _cmap_to_roguecolor(cmap) {
    const current = game.gc?.currentgraphics ?? (Is_rogue_level(game.u?.uz) ? 1 : 0);
    if ((game.gs?.symset ?? gs.symset)?.[current]?.nocolor)
        return NO_COLOR;
    if (cmap >= 1 && cmap <= 16) return CLR_BROWN;
    if (cmap >= 49 && cmap <= 70) return CLR_MAGENTA;
    if (cmap === 22 || cmap === 23) return CLR_GRAY;
    if (cmap >= 19 && cmap <= 48 && cmap !== 20) return CLR_GREEN;
    return NO_COLOR;
}

/* C display.c:2739-3092. Rebuild only the derived symbol/color/flags;
 * customcolor, color256idx, Unicode and tile metadata survive a reset. */
export function reset_glyphmap(trigger) {
    const current = game.gc?.currentgraphics ?? (Is_rogue_level(game.u?.uz) ? 1 : 0);
    const symset = (game.gs?.symset ?? gs.symset)?.[current];
    const has_rogue_color = current === 1 && symset?.handling === H_IBM
        && !symset.nocolor;
    const gg = game.gg ||= {};
    if (trigger === 2) /* gm_levelchange */
        gg.glyphmap_perlevel_flags = 0;
    if (!gg.glyphmap_perlevel_flags)
        gg.glyphmap_perlevel_flags = 1 | (Is_rogue_level(game.u?.uz) ? 2 : 0);
    const showsyms = game.gs?.showsyms ?? gs.showsyms;
    const sym = idx => showsyms?.[idx] ?? primary_showsym(idx);
    const objcolor = idx => game._objColors?.[idx] ?? MKOBJ_OC_COLOR[idx];
    const objroguecolor = idx => MKOBJ_OC_CLASS[idx] === 12 ? CLR_YELLOW
        : MKOBJ_OC_CLASS[idx] === 7 ? CLR_RED : CLR_BRIGHT_BLUE;
    const wallcolors = game.wallcolors ?? [CLR_GRAY, CLR_GRAY, CLR_GRAY, CLR_GRAY, CLR_GRAY];
    for (let glyph = 0; glyph < MAX_GLYPH; ++glyph) {
        const gmap = glyphmap[glyph] ||= {};
        let offset, symidx, color = NO_COLOR, flags = 0;
        if (glyph >= GLYPH_NOTHING_OFF) {
            symidx = SYM_OFFSETS.X;
            flags = MG_NOTHING;
        } else if (glyph >= GLYPH_UNEXPLORED_OFF) {
            symidx = SYM_OFFSETS.X + 1;
            flags = MG_UNEXPL;
        } else if (glyph >= GLYPH_STATUE_MALE_PILETOP_OFF) {
            const female = glyph >= GLYPH_STATUE_FEM_PILETOP_OFF;
            offset = glyph - (female ? GLYPH_STATUE_FEM_PILETOP_OFF : GLYPH_STATUE_MALE_PILETOP_OFF);
            symidx = MON_MLET[offset] + SYM_OFFSETS.M;
            color = has_rogue_color ? CLR_RED : objcolor(STATUE);
            flags = MG_STATUE | MG_OBJPILE | (female ? MG_FEMALE : MG_MALE);
        } else if (glyph >= GLYPH_BODY_PILETOP_OFF) {
            offset = glyph - GLYPH_BODY_PILETOP_OFF;
            symidx = MKOBJ_OC_CLASS[CORPSE] + SYM_OFFSETS.O;
            color = has_rogue_color ? CLR_RED : MON_MCOLOR[offset];
            flags = MG_CORPSE | MG_OBJPILE;
        } else if (glyph >= GLYPH_OBJ_PILETOP_OFF) {
            offset = glyph - GLYPH_OBJ_PILETOP_OFF;
            symidx = offset === BOULDER_OTYP ? SYM_OFFSETS.X + 2 : MKOBJ_OC_CLASS[offset] + SYM_OFFSETS.O;
            color = has_rogue_color ? objroguecolor(offset) : objcolor(offset);
            flags = MG_OBJPILE;
        } else if (glyph >= GLYPH_STATUE_MALE_OFF) {
            const female = glyph >= GLYPH_STATUE_FEM_OFF;
            offset = glyph - (female ? GLYPH_STATUE_FEM_OFF : GLYPH_STATUE_MALE_OFF);
            symidx = MON_MLET[offset] + SYM_OFFSETS.M;
            color = has_rogue_color ? CLR_RED : objcolor(STATUE);
            flags = MG_STATUE | (female ? MG_FEMALE : MG_MALE);
        } else if (glyph >= GLYPH_WARNING_OFF) {
            symidx = glyph - GLYPH_WARNING_OFF + SYM_OFFSETS.W;
            color = has_rogue_color ? NO_COLOR : DEF_WARNSYMS[glyph - GLYPH_WARNING_OFF].color;
        } else if (glyph >= GLYPH_EXPLODE_DARK_OFF) {
            offset = glyph - GLYPH_EXPLODE_DARK_OFF;
            symidx = 96 + offset % 9;
            color = _EXPL_COLORS[Math.trunc(offset / 9)];
        } else if (glyph >= GLYPH_SWALLOW_OFF) {
            offset = glyph - GLYPH_SWALLOW_OFF;
            symidx = 88 + (offset & 7);
            color = has_rogue_color ? NO_COLOR : MON_MCOLOR[offset >> 3];
        } else if (glyph >= GLYPH_CMAP_C_OFF) {
            offset = glyph - GLYPH_CMAP_C_OFF + 78;
            symidx = offset;
            color = has_rogue_color ? _cmap_to_roguecolor(offset) : _CMAP_COLORS[offset];
        } else if (glyph >= GLYPH_ZAP_OFF) {
            offset = glyph - GLYPH_ZAP_OFF;
            symidx = 74 + (offset & 3);
            color = has_rogue_color ? NO_COLOR : _ZAP_COLORS[offset >> 2];
        } else if (glyph >= GLYPH_CMAP_B_OFF) {
            offset = glyph - GLYPH_CMAP_B_OFF + 34;
            symidx = offset;
            color = _CMAP_COLORS[offset];
            if (game.iflags?.use_color === false) {
                if ((offset === 40 || offset === 41)
                    && (sym(offset) === sym(38) || sym(offset) === sym(48))) flags |= MG_BW_LAVA;
                else if (offset === 39 && (sym(offset) === sym(19) || sym(offset) === sym(20))) flags |= MG_BW_ICE;
                else if (offset === 36 && sym(offset) === sym(37)) flags |= MG_BW_SINK;
            } else if (has_rogue_color) color = _cmap_to_roguecolor(offset);
        } else if (glyph >= GLYPH_ALTAR_OFF) {
            symidx = 33;
            color = has_rogue_color ? _cmap_to_roguecolor(33)
                : [CLR_RED, CLR_GRAY, CLR_GRAY, CLR_GRAY, CLR_BRIGHT_MAGENTA][glyph - GLYPH_ALTAR_OFF];
        } else if (glyph >= GLYPH_CMAP_A_OFF) {
            offset = glyph - GLYPH_CMAP_A_OFF + 12;
            symidx = offset;
            color = _CMAP_COLORS[offset];
            if (has_rogue_color) color = _cmap_to_roguecolor(offset);
            else if (offset === 23 && sym(23) === sym(22)) color = CLR_WHITE;
            else if (offset === 24 && (sym(24) === sym(22) || sym(24) === sym(23))) flags |= MG_BW_ENGR;
        } else if (glyph >= GLYPH_CMAP_MAIN_OFF) {
            offset = glyph - GLYPH_CMAP_MAIN_OFF;
            const branch = Math.trunc(offset / 11);
            symidx = 1 + offset % 11;
            color = branch === 0 && has_rogue_color ? _cmap_to_roguecolor(symidx) : wallcolors[branch];
        } else if (glyph >= GLYPH_CMAP_STONE_OFF) {
            symidx = 0;
            color = _CMAP_COLORS[0];
        } else if (glyph >= GLYPH_OBJ_OFF) {
            offset = glyph - GLYPH_OBJ_OFF;
            symidx = offset === BOULDER_OTYP ? SYM_OFFSETS.X + 2 : MKOBJ_OC_CLASS[offset] + SYM_OFFSETS.O;
            color = has_rogue_color ? objroguecolor(offset) : objcolor(offset);
        } else if (glyph >= GLYPH_RIDDEN_MALE_OFF) {
            const female = glyph >= GLYPH_RIDDEN_FEM_OFF;
            offset = glyph - (female ? GLYPH_RIDDEN_FEM_OFF : GLYPH_RIDDEN_MALE_OFF);
            symidx = MON_MLET[offset] + SYM_OFFSETS.M;
            color = has_rogue_color ? NO_COLOR : MON_MCOLOR[offset];
            flags = MG_RIDDEN | (female ? MG_FEMALE : MG_MALE);
        } else if (glyph >= GLYPH_BODY_OFF) {
            offset = glyph - GLYPH_BODY_OFF;
            symidx = MKOBJ_OC_CLASS[CORPSE] + SYM_OFFSETS.O;
            color = has_rogue_color ? CLR_RED : MON_MCOLOR[offset];
            flags = MG_CORPSE;
        } else if (glyph >= GLYPH_DETECT_MALE_OFF) {
            const female = glyph >= GLYPH_DETECT_FEM_OFF;
            offset = glyph - (female ? GLYPH_DETECT_FEM_OFF : GLYPH_DETECT_MALE_OFF);
            symidx = MON_MLET[offset] + SYM_OFFSETS.M;
            color = has_rogue_color ? NO_COLOR : MON_MCOLOR[offset];
            flags = MG_DETECT | (female ? MG_FEMALE : MG_MALE);
        } else if (glyph >= GLYPH_INVIS_OFF) {
            symidx = SYM_OFFSETS.X + 3;
            flags = MG_INVIS;
        } else {
            const pet = glyph >= GLYPH_PET_MALE_OFF;
            const female = pet ? glyph >= GLYPH_PET_FEM_OFF : glyph >= GLYPH_MON_FEM_OFF;
            offset = glyph - (pet ? (female ? GLYPH_PET_FEM_OFF : GLYPH_PET_MALE_OFF)
                : (female ? GLYPH_MON_FEM_OFF : GLYPH_MON_MALE_OFF));
            symidx = MON_MLET[offset] + SYM_OFFSETS.M;
            color = has_rogue_color ? (!pet && !female ? CLR_YELLOW : NO_COLOR) : MON_MCOLOR[offset];
            flags = (pet ? MG_PET : 0) | (female ? MG_FEMALE : MG_MALE);
        }
        if (game.sysopt?.accessibility === 1 && (flags & MG_PET)) {
            const pet_override = ((gg.glyphmap_perlevel_flags & 2)
                ? game.go?.ov_rogue_syms : game.go?.ov_primary_syms)?.[SYM_OFFSETS.X + 4] || 0;
            /* Preserve C's indirect showsyms[pet_override] test, including
             * when the override byte is zero. */
            if (sym(pet_override) !== 32) symidx = SYM_OFFSETS.X + 4;
        }
        if (color < 0 || color >= 16 || ((gg.glyphmap_perlevel_flags & 2) && !has_rogue_color)
            || game.iflags?.use_color === false) color = NO_COLOR;
        gmap.glyphflags = flags;
        gmap.sym = { symidx, color };
    }
    gg.glyph_reset_timestamp = game.moves ?? 0;
    game._gm_use_color = game._gm_corner = undefined;
}

/* show_glyph(x, y, mon_to_glyph(...)) for a plain monster glyph, rendered
 * through the same disp_* cell buffer newsym()'s monster arm writes (the
 * numeric show_glyph() below feeds a separate gbuf the screen never reads).
 * C ref: display.c:2196-2201 you_aggravate(). */
export function show_monster_glyph_at(x, y, mndx) {
    const mlet = (mndx >= 0 && mndx < MON_MLET.length) ? MON_MLET[mndx] : 53;
    const mcol = (mndx >= 0 && mndx < MON_MCOLOR.length) ? MON_MCOLOR[mndx] : 7;
    show_glyph_cell(x, y, monster_symbol(mlet), mcol, false, 0, GLYPHCLS_MON);
    const loc = game.level?.at(x, y); if (loc) loc.disp_mon_pm = mndx;
}
export function show_glyph(x, y, glyph) {
    if (suppress_map_output())
        return;
    const gg = game.gg ||= {};
    const gbuf = gg.gbuf ||= game["gg.gbuf"] || [];
    const gbuf_start = gg.gbuf_start ||= game["gg.gbuf_start"] || Array(ROWNO).fill(COLNO - 1);
    const gbuf_stop = gg.gbuf_stop ||= game["gg.gbuf_stop"] || Array(ROWNO).fill(0);
    const a11y = game.a11y || {};
    const program_state = game.program_state || {};
    const iflags = game.iflags || {};


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
        return _wall_impossible("show_glyph:  bad pos <%d,%d> with glyph %d [%s %d].",
                                x, y, glyph, text, offset);
    } else if (glyph < 0 || glyph >= MAX_GLYPH) {
        return _wall_impossible("show_glyph:  bad glyph %d [max %d] at <%d,%d>.",
                                glyph, MAX_GLYPH, x, y);
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
        if (gbuf_start[y] > x)
            gbuf_start[y] = x;
        if (gbuf_stop[y] < x)
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
/* C pline.c:126-135 — the message keeps the map coordinate as its origin. */
function pline_xy(x, y, msg, ...args) {
    set_msg_xy(x, y);
    return pline(msg, ...args);
}
/* C display.c:2588-2655 — copy the cached map, then apply the hero-only
 * color and accessibility adjustments without changing the shared entry. */
function map_glyphinfo(x, y, glyph, mgflags, glyphinfo) {
    if (!game.gg?.glyphmap_perlevel_flags || !glyphmap[glyph]?.sym)
        reset_glyphmap(0); /* initial map before the first graphics switch */
    const gmap = glyphmap[glyph];
    const gm = { ...gmap, sym: { ...gmap.sym } };
    const u = game.u || {};
    const rogue = !!(game.gg?.glyphmap_perlevel_flags & 2);
    if (u_at(x, y) && glyph_is_monster(glyph)) {
        const upolyd = (u.umonnum | 0) !== (u.umonster | 0);
        const female = upolyd ? u.mfemale : game.flags?.female;
        const hero = _hero_glyph().mndx
            + (female ? GLYPH_MON_FEM_OFF : GLYPH_MON_MALE_OFF);
        const current = game.gc?.currentgraphics ?? (rogue ? 1 : 0);
        const symset = (game.gs?.symset ?? gs.symset)?.[current];
        if (game.iflags?.use_color !== false && !upolyd && glyph === hero) {
            if (current === 1 && symset?.handling === H_IBM && !symset.nocolor)
                gm.sym.color = CLR_YELLOW;
            else if (game.flags?.showrace)
                gm.sym.color = CLR_WHITE;
        }
        if (game.sysopt?.accessibility === 1 && !(mgflags & 1)) {
            const offset = SYM_OFFSETS.X + 5;
            if ((rogue ? game.go?.ov_rogue_syms : game.go?.ov_primary_syms)?.[offset])
                gm.sym.symidx = offset;
        }
        gm.glyphflags |= MG_HERO;
    }
    if (game.sysopt?.accessibility === 1 && (mgflags & 1) && (gm.glyphflags & MG_PET)) {
        const offset = glyph >= GLYPH_PET_FEM_OFF ? GLYPH_PET_FEM_OFF : GLYPH_PET_MALE_OFF;
        gm.sym.symidx = MON_MLET[glyph - offset] + SYM_OFFSETS.M;
    }
    glyphinfo.gm = gm;
    glyphinfo.ttychar = (game.gs?.showsyms ?? gs.showsyms)?.[gm.sym.symidx]
        ?? primary_showsym(gm.sym.symidx);
    glyphinfo.glyph = glyph;
}
/* C display.h/sym.h glyph and cmap predicates. */
export function glyph_is_nothing(glyph) { return (glyph | 0) === GLYPH_NOTHING_OFF; }
export function glyph_is_unexplored(glyph) { return (glyph | 0) === GLYPH_UNEXPLORED_OFF; }
// C sym.h:104: stairs through fountains; doors, bars and trees precede them.
export function is_cmap_furniture(c) { return (c | 0) >= S_UPSTAIR_C && (c | 0) <= S_FOUNTAIN_C; }
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
/* C pager.c:666-667 compares glyph_at(x,y) with mon_to_glyph(mon,
 * rn2_on_display_rng).  Evaluate what_mon BEFORE inspecting the buffer:
 * even an unequal glyph consumes the hallucination draw.  Species, gender
 * and glyph family all participate in C's numeric glyph identity. */
export function glyph_matches_monster_at(x, y, mon) {
    const mndx = _hallucinating_dsp() ? random_monster()
        : (mon.data?.pmidx ?? mon.mnum ?? mon.mndx);
    const loc = game.level?.at(x, y);
    return loc?.disp_cls === GLYPHCLS_MON && !loc.disp_is_warning
        && loc.disp_mon_kind === 'normal' && loc.disp_mon_pm === mndx
        && loc.disp_mon_female === !!mon.female;
}
/* C cmd.c:4650 and display.h:657-659: compare glyph_at(x,y) with
 * hero_glyph, including species, gender and the normal monster glyph family.
 * hero_glyph does not use what_mon(), even during hallucination. */
export function glyph_matches_hero_at(x, y) {
    const u = game.u || {};
    const female = (u.umonnum | 0) !== (u.umonster | 0)
        ? u.mfemale : game.flags?.female;
    const loc = game.level?.at(x, y);
    return loc?.disp_cls === GLYPHCLS_MON && !loc.disp_is_warning
        && loc.disp_mon_kind === 'normal' && loc.disp_mon_pm === _hero_glyph().mndx
        && loc.disp_mon_female === !!female;
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
    /* The coordinate-keyed engraving store (mklev.js engr_at) hands back a
     * record without C's struct fields engr_x/engr_y; engravings_list() tags
     * every live record with them.  Callers such as read.js show_map_spot
     * (detect.c:1410) pass engr_at()'s result straight in, and without the
     * tag the glyph was silently never mapped. */
    if (ep.engr_x === undefined) engravings_list();
    const x = ep.engr_x, y = ep.engr_y;
    const loc = game.level?.at(x, y);
    if (!loc) return;
    const ch = engraving_symbol(loc.typ === CORR);
    const color = engraving_color();
    /* C display.c:2942-2945 MG_BW_ENGR — see _bw_engr_hilite. */
    const bwengr = (loc.typ === CORR);
    if (game.level?.flags?.hero_memory)     /* C display.c:318-319 */
        loc.remembered_glyph = { ch, color, decgfx: false, bwengr, cls: GLYPHCLS_ENGR };
    if (show)                                /* C display.c:320-321 */
        show_glyph_cell(x, y, ch, color, false, _bw_engr_hilite(bwengr), GLYPHCLS_ENGR);
}

/* C display.c:279-281 stores back_to_glyph's identity in levl[].glyph.
 * Keep that cmap independently of the terrain, which can change unseen
 * (do.c:486-488 teleport_sink), and of the symset's rendered character. */
function _terrain_memory_glyph(loc, tg) {
    const cmap = tg.cmap ?? _default_cmap_at(loc, tg.ch, tg.color);
    return { ch: tg.ch, color: tg.color, decgfx: tg.dec,
             cls: GLYPHCLS_CMAP, wallSymbol: tg.wallSymbol, bwspec: tg.bwspec,
             cmap: cmap >= 0 ? cmap : null };
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
    /* back_to_glyph never tests cansee (display.c:2300-2302), including
     * when feeling a lit corridor while blind. */
    const tg = terrain_glyph(loc, x, y, true);
    const glyph = _terrain_memory_glyph(loc, tg);
    if (loc.typ === CORR)
        glyph.cmap = loc.waslit || game.flags?.lit_corridor ? S_LITCORR_C : S_CORR_C;
    if (game.level?.flags?.hero_memory)
        loc.remembered_glyph = glyph;
    if (show)
        show_glyph_cell(x, y, glyph.ch, glyph.color, glyph.decgfx, _glyph_attr(glyph), glyph.cls,
                        false, null, null, null, glyph.cmap);
}

export function map_location(x, y, show) {
    _map_location(x, y, show);
}

/* C uhitm.c:4931-4943 start_engulf(mdef) — the DISPLAY half only; the
 * "You engulf/swallow <mdef>!" message is printed by the caller in the C order.
 *     if (!Invisible) {
 *         map_location(u.ux, u.uy, TRUE);
 *         tmp_at(DISP_ALWAYS, mon_to_glyph(&gy.youmonst, rn2_on_display_rng));
 *         tmp_at(mdef->mx, mdef->my);
 *     }
 * The hero's own square is re-mapped (it stops showing the hero while
 * engulfing) and the hero's glyph is flashed on the target's square until
 * end_engulf().  Unlike hero_glyph, mon_to_glyph applies what_mon(), so the
 * temporary monster is randomized while hallucinating. */
export function start_engulf(mdef) {
    const u = game.u || {};
    const invisP = _uprop(INVIS);
    const Invis = !!((invisP.i || invisP.e) && !invisP.b);
    const siP = _uprop(SEE_INVIS);
    const Invisible = Invis && !(siP.i || siP.e);
    if (!Invisible) {
        map_location(u.ux, u.uy, true);
        /* C display.h:554-556: use what_mon()'s result as well as its draw. */
        const mndx = _hallucinating_dsp() ? random_monster() : (u.umonnum | 0);
        tmp_at(DISP_ALWAYS, {
            ch: monster_symbol(MON_MLET[mndx]), color: MON_MCOLOR[mndx],
            cls: GLYPHCLS_MON, attr: _wizmgender_attr(game.youmonst?.female),
        });
        tmp_at(mdef.mx, mdef.my);
    }
}

/* C uhitm.c:4947-4956 end_engulf(void): clear the engulf flash and repaint the
 * hero's square.  Called from gulpum() after xkilled() on the digest arm and
 * unconditionally before the damage on the non-digest arms. */
export function end_engulf() {
    const u = game.u || {};
    const invisP = _uprop(INVIS);
    const Invis = !!((invisP.i || invisP.e) && !invisP.b);
    const siP = _uprop(SEE_INVIS);
    const Invisible = Invis && !(siP.i || siP.e);
    if (!Invisible) {
        tmp_at(DISP_END, 0);
        newsym(u.ux, u.uy);
    }
}

/* C ref: display.h:218-222
 *   #define covers_objects(xx, yy) \
 *       ((is_pool(xx, yy) && !Underwater) || levl[xx][yy].typ == LAVAPOOL \
 *        || levl[xx][yy].typ == LAVAWALL)
 *   #define covers_traps(xx, yy) covers_objects(xx, yy)
 * is_pool() is dbridge.c:45-59, including its is_moat() test. */
function covers_objects(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    const typ = loc.typ | 0;
    return (is_pool(x, y) && !game.u?.uinwater)
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
    const cell = _cmap_to_glyph_disp_base(sym);
    if (cell && blank_symbols()) return { ...cell, ch: ' ', dec: false };
    if (cell && rogue_ibm_terrain()) {
        const symbol = rogue_showsyms()[sym | 0];
        if (symbol)
            return { ...cell, ch: String.fromCharCode(symbol & 0x7f),
                     color: _cmap_to_roguecolor(sym | 0), dec: false };
    }
    /* C symbols.c:196-198 init_rogue_symbols — on a Rogue level showsyms is
     * gr.rogue_syms: defsyms plus doorways/open doors -> '+' and both plain
     * stairs -> '%'.  A furniture mimic (display.c:553 cmap_to_glyph) posing
     * as stairs there paints '%', not '>'. */
    if (cell && rogue_graphics() && !rogue_ibm_terrain()) {
        const s = sym | 0;
        if (s === S_NDOOR_C || s === S_VODOOR_C || s === S_HODOOR_C)
            return { ...cell, ch: '+', dec: false };
        if (s === S_UPSTAIR_C || s === S_DNSTAIR_C)
            return { ...cell, ch: '%', dec: false };
    }
    if (cell && ibm_mode()) {
        const rg = { ch: cell.ch, color: cell.color, decgfx: !!cell.dec, cls: GLYPHCLS_CMAP };
        _remap_remembered_ibm(rg);
        return { ...cell, ch: rg.ch, dec: rg.decgfx };
    }
    return cell;
}
function _cmap_to_glyph_disp_base(sym) {
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
    case S_SINK_C:     return { ch: '{', color: CLR_WHITE, dec: false, bwspec: true }; /* display.c:2909-2912 MG_BW_SINK: sink sym == fountain sym */
    case S_FOUNTAIN_C: return { ch: '{', color: CLR_BRIGHT_BLUE, dec: false };
    default:           return null;
    }
}

/* C dungeon.c:2943-2946 — refresh the whole level's overview knowledge
 * before returning the remembered terrain at the requested square.  The
 * refresh also records level annotations while the hero can still see. */
export function update_mapseen_for(x, y) {
    recalc_mapseen_rooms();
    return game.level?.at(x, y)?.lastseentyp | 0;
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
export function region_glyph(reg) {
    const poison = (reg?.glyph | 0) === REGION_GLYPH_POISONCLOUD;
    return { ch: '#', color: poison ? CLR_BRIGHT_GREEN : CLR_GRAY,
             decgfx: false, cls: GLYPHCLS_CMAP, cmap: poison ? 86 : 47 };
}
// C detect.c:2162-2164 glyph_is_gascloud; corridors can share both color and '#'.
export function glyph_is_gascloud(glyph) {
    return glyph?.cls === GLYPHCLS_CMAP && (glyph.cmap === 47 || glyph.cmap === 86);
}
function show_region(reg, x, y) {
    const glyph = region_glyph(reg);
    show_glyph_cell(x, y, glyph.ch, glyph.color, glyph.decgfx, 0,
                    glyph.cls, false, null, null, null, glyph.cmap);
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

function _zap_glyph_cell(glyph) {
    const off = (glyph | 0) - GLYPH_ZAP_OFF_C;
    if (off < 0 || off >= NUM_ZAP * 4)
        return null;
    const sym = _ZAP_SYM[off % 4];
    /* C display.c:2879: retain S_vbeam + direction so map_glyphinfo can
     * resolve the beam through showsyms, independently of its background. */
    const cmap = 74 + (off % 4);
    const decMode = dec_mode();
    if (!decMode && ibm_mode() && (off % 4) < 2)
        return { ch: (off % 4) === 0 ? '3' : 'D', color: _ZAP_COLORS[off >> 2], dec: false, cmap };
    return {
        ch: decMode ? sym.d : sym.a,
        color: _ZAP_COLORS[off >> 2],
        dec: decMode && (off % 4) < 2,   /* only vbeam/hbeam have DEC forms */
        cmap,
    };
}

/* C display.c:2842-2863 — an explosion glyph (GLYPH_EXPLODE_<TYPE>_OFF +
 * S_expl_* offset; js/zap.js explosion_to_glyph, DARK base 7157, MAXEXPCHARS
 * 9 per type in EXPL_* order) resolved to a cell: defsym.h:239-247 symbols,
 * dat/symbols DECgraphics overrides (tc \xef, ml/mr \xf8, bc \xf3) and
 * display.h:338-344 explodecolors[]. */
const _GLYPH_EXPLODE_DARK_OFF_C = 7157;
const _EXPL_SYM = [
    { a: '/' }, { a: '-', d: 'o' }, { a: '\\' },
    { a: '|', d: 'x' }, { a: ' ' }, { a: '|', d: 'x' },
    { a: '\\' }, { a: '-', d: 's' }, { a: '/' },
];
const _EXPL_COLORS = [CLR_BLACK, CLR_GREEN, CLR_BROWN, CLR_BLUE, CLR_MAGENTA,
                      CLR_ORANGE, CLR_WHITE];
function _expl_glyph_cell(glyph) {
    const off = (glyph | 0) - _GLYPH_EXPLODE_DARK_OFF_C;
    if (off < 0 || off >= _EXPL_SYM.length * _EXPL_COLORS.length)
        return null;
    const sym = _EXPL_SYM[off % 9];
    const dec = dec_mode() && sym.d !== undefined;
    /* glyphs.js: S_expl_tl = 96; the symset lookup (and a UTF8 customization,
     * wintty.c:3946-3955 g_pututf8) keys on the S_expl_* index. */
    return { ch: dec ? sym.d : sym.a, color: _EXPL_COLORS[Math.trunc(off / 9)], dec,
             cmap: 96 + (off % 9) };
}

/* boomhit()'s tmp_at(DISP_FLASH, cmap_to_glyph(S_boomleft/S_boomright)) glyphs
 * (js/zap.js _bh_cmap_to_glyph: S_boomleft 80 -> 4085, S_boomright 81 -> 4086).
 * defsym.h:197-198: S_boomleft ')' and S_boomright '(', both HI_WOOD (brown).
 * Without a cell the flash went to show_glyph()'s unread gbuf, so a --More--
 * raised mid-flight showed the square's own contents instead of the boomerang. */
function _boom_glyph_cell(glyph) {
    if (glyph === 4085) return { ch: ')', color: CLR_BROWN, dec: false };
    if (glyph === 4086) return { ch: '(', color: CLR_BROWN, dec: false };
    /* defsym.h:195 PCHAR2(78, '*', S_digbeam, ..., CLR_WHITE): 4005 + 78 */
    if (glyph === 4083) return { ch: '*', color: CLR_WHITE, dec: false };
    /* defsym.h:196 PCHAR2(79, '!', S_flashbeam, ..., CLR_WHITE): 4005 + 79 */
    if (glyph === 4084) return { ch: '!', color: CLR_WHITE, dec: false };
    /* cmap_to_glyph(S_goodpos): (87 - S_digbeam 78) + GLYPH_CMAP_C_OFF 4083;
     * defsym.h:207 PCHAR(87, '$', S_goodpos, "valid position", HI_ZAP).
     * getpos's '$' toggle shows valid spots with it (apply.c:1971). */
    if (glyph === 4092) return { ch: '$', color: CLR_BRIGHT_BLUE, dec: false };
    return null;
}

/* Paint a tmp_at() glyph through this port's cell model (see tmp_at's
 * show_glyph note): objects pass a resolved cell, zap/boom glyphs are numbers. */
function _tmp_show(x, y, glyph) {
    if (glyph && typeof glyph === 'object' && glyph.ch !== undefined) {
        show_glyph_cell(x, y, glyph.ch, glyph.color, glyph.decgfx,
                        _glyph_attr(glyph), glyph.cls, !!glyph.isWarning, glyph.otyp,
                        glyph.corpsenm, glyph.ttyp, null, glyph.objpile);
        return;
    }
    const zc = _zap_glyph_cell(glyph) || _boom_glyph_cell(glyph) || _expl_glyph_cell(glyph);
    if (zc)
        show_glyph_cell(x, y, zc.ch, zc.color, zc.dec, 0, GLYPHCLS_CMAP,
                        false, null, null, null, zc.cmap ?? null);
    else
        show_glyph(x, y, glyph);
}

/* C hack.c:1430-1445,1491-1507: travel's DEBUG overlays.  Like obj_to_glyph,
 * resolve warning_to_glyph to this port's cell representation for tmp_at. */
export function show_travel_debug(xs, ys, count, warningLevel) {
    if (!game.iflags?.trav_debug) return;
    const sym = DEF_WARNSYMS[warningLevel];
    tmp_at(DISP_ALL, { ch: sym.ch, color: _warn_color(sym),
                       cls: GLYPHCLS_WARNING, isWarning: true });
    for (let i = 0; i < count; ++i)
        tmp_at(xs[i], ys[i]);
    nh_delay_output();
    if (game.flags?.runmode === RUN_CRAWL)
        for (let i = 0; i < 2 * warningLevel; ++i)
            nh_delay_output();
    tmp_at(DISP_END, 0);
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
        // C display.c:1194: flush the buffer before starting the effect.
        /* C display.c:1194: commit buffered glyphs before the effect starts.
         * Use the synchronous repaint, as tmp_at does not page the topline. */
        flush_screen_point(0);
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
                        _tmp_show(_tglyph.saved[i - 1].x,
                                 _tglyph.saved[i - 1].y, _tglyph.glyph);
                        flush_screen_point(0); /* make sure it shows up */
                        flush_screen_point(0); /* C display.c:1234 */
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
                    _tmp_show(px, py, tether_glyph(px, py));
                    const tc = _zap_glyph_cell(tether_glyph(px, py));
                    if (tc)
                        show_glyph_cell(px, py, tc.ch, tc.color, tc.dec, 0, GLYPHCLS_CMAP,
                                        false, null, null, null, tc.cmap ?? null);
                    else
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

            _tmp_show(x, y, _tglyph.glyph);
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
                                    _glyph_attr(g), g.cls, !!g.isWarning, g.otyp,
                                    g.corpsenm);
                    flush_screen_point(0);
                    break;
                }
                const zc = _zap_glyph_cell(_tglyph.glyph) || _boom_glyph_cell(_tglyph.glyph)
                    || _expl_glyph_cell(_tglyph.glyph);
                if (zc)
                    show_glyph_cell(x, y, zc.ch, zc.color, zc.dec, 0, GLYPHCLS_CMAP,
                                    false, null, null, null, zc.cmap ?? null);
                else
                    show_glyph(x, y, _tglyph.glyph);
            }
            flush_screen_point(0);
            break;
        } /* end switch */
    }
}

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
    // C botl.c:277-278: the menu's status suppression covers time updates too.
    if (game?._bot_disabled)
        return;
    /* C ref: timebot() — update time display; resets disp.time_botl */
    const g = game || {};
    const flags = g.flags || {};
    const iflags = g.iflags || {};
    if (flags.time && iflags.status_updates && !suppress_map_output()) {
        g._botlPaintedMoves = g.moves | 0;
        /* VIA_WINDOWPORT() is always true in JS GUI environment;
           stat_update_time() is a windowport-specific no-op in JS.  It IS the
           paint, though: whatever the run suppressed is now on the line. */
        g._timeBotlFrozenMoves = null;
        /* botl.c:1285-1294 stat_update_time(): BL_TIME alone goes through
         * eval_notify_windowport_field, so a changed clock marks it chg. */
        _status_note_pushed_time();
    }
    if (g.disp)
        g.disp.time_botl = 0;
}

function _status_note_pushed_fields() {
    const g = game;
    const p = _statusLine2Parts();
    const sig = _statusLine1Raw() + '\n'
        + (p ? `${p.desc} ${p.mid}${p.hunger}${p.conds}` : '');
    if (g._blPushedSig !== sig) g._blChg = true;
    g._blPushedSig = sig;
    _status_note_pushed_time();
}
function _status_note_pushed_time() {
    const g = game;
    if (!g.flags?.time) return;
    const m = g.moves | 0;
    if (g._blPushedMoves !== m) g._blChg = true;
    g._blPushedMoves = m;
}
export function status_eval_next_unhilite() {
    const g = game;
    if (!g) return;
    g.bl_hilite_moves = g.moves | 0;
    /* C botl.c:2293-2303 — a field whose change paint raised chg gets its
     * expiry stamped HERE (time = bl_hilite_moves + hilite_delta for an
     * active temporary rule, 0 otherwise); chg clears and botl is forced. */
    const hist = g._blTemp;
    if (hist && g.iflags?.hilite_delta) {
        for (const k in hist) {
            const h = hist[k];
            if (!h || !h.chg) continue;
            h.time = h.rule ? g.bl_hilite_moves + g.iflags.hilite_delta : 0;
            h.chg = false;
            if (g.disp) g.disp.botl = 1;
        }
    }
    if (g._blChg) {
        g._blChg = false;
        if (g.disp) g.disp.botl = 1;
    }
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
                            loc.disp_obj_corpsenm, loc.disp_trap_type, null,
                            loc.disp_obj_pile);
        }
    }
    flush_screen_point(cursor_on_u ? 1 : 0);
}
/* Paint one stomach cell.  C reaches the tty through
 * swallow_to_glyph(swallower, S_sw_*) -> map_glyphinfo (display.c:2864), whose
 * swallow arm sets sym.symidx = S_sw_tl + (offset & 7) and the colour to
 * mon_color(offset >> 3) — the SWALLOWER's own mcolor, not a cmap colour.
 * That is why the ice vortex's cage renders cyan. */
function _show_swallow_sym(x, y, idx, mndx) {
    if (!isok(x, y))
        return;
    const shown = _hallucinating_dsp()
        ? rn2_on_display_rng(MON_MCOLOR.length)
        : mndx;
    const color = (shown >= 0 && shown < MON_MCOLOR.length) ? MON_MCOLOR[shown] : CLR_GRAY;
    /* defsym.h:221-228: retain the logical stomach symbol; show_glyph_cell
     * resolves S_sw_tl + idx through the active primary symbols. */
    show_glyph_cell(x, y, defsym_char(88 + idx), color, false, 0, GLYPHCLS_SWALLOW,
                    false, null, null, null, 88 + idx);
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
export function swallowed(first) {
    const g = game;
    const u = g.u || {};
    const ux = u.ux | 0, uy = u.uy | 0;

    if (first) {
        game?.nhDisplay?.clearScreen?.();
        /* cls() clears the physical status too (wintty.c:1074-1087).
         * bot() below can decline to repaint it, notably when self-genocide
         * leaves a polymorphed hero at u.uhp == -1 (botl.c:259-260). */
        game._statusBlankAfterDocrt = true;
        game._topl_sticky = null;
        clear_glyph_buffer();
        game.disp ??= {};
        game.disp.botlx = 1;
        game._status1WholeNext = true;
        /* the cage stays on the terminal until docrt (unstuck's more() pages
         * before it), after u.uswallow is already 0 */
        game._swallowCageRow1 = true;
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
    const mndx = (stuck?.data?.pmidx ?? stuck?.data_mndx
                  ?? stuck?.mnum ?? stuck?.mndx ?? -1) | 0;
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
    const delayed = !!game._under_water_delayed;
    if (mode === 1 || delayed) {
        game._under_water_delayed = false;
        /* C display.c:1407 -> cls(): page WIN_MESSAGE before clearing the
         * physical map (display.c:2196). Keep the deferred message until its
         * page is consumed, with the map and status from the last flush. */
        topl_force_break_now(true, capture_flushed_cells(), game._lastPaintedBotl || null);
        const pending = game._pending_message;
        void cls();
        /* WIN_STOP suppresses new text (topl.c:257,300), and cls() clears
         * the old physical topline with WIN_MAP (display.c:2196-2198).
         * Only keep text that still owes a deferred page acknowledgment. */
        if (!game._topl_win_stop) game._pending_message = pending;
    } else if (mode === 2) {
        game._under_water_delayed = true;
        return;
    } else {
        const lx = game._under_water_lastx | 0, ly = game._under_water_lasty | 0;
        for (let y = ly - 1; y <= ly + 1; y++)
            for (let x = lx - 1; x <= lx + 1; x++)
                if (isok(x, y)) show_glyph_cell(x, y, ' ', NO_COLOR, false, 0, GLYPHCLS_UNEXPLORED);
    }
    for (let x = (u.ux | 0) - 1; x <= (u.ux | 0) + 1; x++)
        for (let y = (u.uy | 0) - 1; y <= (u.uy | 0) + 1; y++) {
            if (!isok(x, y)) continue;
            if (is_pool_or_lava(x, y) || is_ice(x, y)) {
                const bp = u.uprops?.[BLINDED];
                const blind = (!!bp && !!((bp.intrinsic | 0) || (bp.extrinsic | 0))
                               && !(bp.blocked | 0));
                if (blind && !u_at(x, y)) show_glyph_cell(x, y, ' ', NO_COLOR, false, 0, GLYPHCLS_UNEXPLORED);
                else newsym(x, y);
            }
        }
    game._under_water_lastx = u.ux | 0;
    game._under_water_lasty = u.uy | 0;
}

export async function cast_chain_lightning() {
    const { _zhitm } = await import('./zap.js');
    const { defended, wakeup } = await import('./mhitm.js');
    const { m_at, mon_nam, exclam, xkilled } = await import('./uhitm.js');
    const { xdir, ydir } = await import('./const.js');
    const u = game.u;
    const N_DIRS = 8, LIMIT = 100, MR_ELEC = 0x10;
    const resists_elec = (m) => ((((m.data ? m.data.mresists : 0) | m.mextrinsics | m.mintrinsics) & MR_ELEC) !== 0);
    const cell = (x, y) => (game.level && typeof game.level.at === 'function')
        ? game.level.at(x, y) : game.level.locations[x]?.[y];
    const POS = (x, y) => {
        if (!isok(x, y)) return false;
        const l = cell(x, y), t = l.typ;
        return (t > DOOR) || t === POOL || t === MOAT || t === DRAWBRIDGE_UP || t === LAVAPOOL
            || (IS_DOOR(t) && !((l.doormask | 0) & (D_CLOSED | D_LOCKED)));
    };
    const halluc = !!(u.uprops?.[HALLUC]?.intrinsic)
        && !(u.uprops?.[HALLUC_RES]?.intrinsic || u.uprops?.[HALLUC_RES]?.extrinsic);
    const clq = { q: [], head: 0, displayed_beam: halluc ? rn2_on_display_rng(6) : 5 /* AD_ELEC - 1 */ };
    const DIR_LEFT = (d) => (d + N_DIRS - 1) % N_DIRS;
    const DIR_RIGHT2 = (d) => (d + 2) % N_DIRS;
    const propagate = (zap0) => {
        const zap = { ...zap0 };
        zap.x += xdir[zap.dir];
        zap.y += ydir[zap.dir];
        if (clq.q.length >= LIMIT) return;
        if (!POS(zap.x, zap.y)) return;
        const mon = m_at(zap.x, zap.y);
        if (mon && mon.mpeaceful) return;
        if (mon && !resists_elec(mon) && !defended(mon, 6 /* AD_ELEC */)) zap.strength = 3;
        else if (mon) zap.strength = 0;
        if (!mon && !zap.strength) return;
        for (const z of clq.q) if (z.x === zap.x && z.y === zap.y) return;
        clq.q.push(zap);
        tmp_at(DISP_CHANGE, zapdir_to_glyph(xdir[zap.dir], ydir[zap.dir], clq.displayed_beam));
        tmp_at(zap.x, zap.y);
    };
    if (u.uswallow) return;
    tmp_at(DISP_BEAM, zapdir_to_glyph(0, 1, clq.displayed_beam));
    for (let dir = 0; dir < N_DIRS; dir++)
        propagate({ dir, x: u.ux, y: u.uy, strength: 2 });
    nh_delay_output();
    while (clq.head < clq.q.length) {
        const delay_tail = clq.q.length;
        while (clq.head < delay_tail) {
            const zap = { ...clq.q[clq.head++] };
            const mon = m_at(zap.x, zap.y);
            if (mon) {
                const _bp = game.gb?.bhitpos ?? game.bhitpos;
                game.notonhead = (mon.mx !== _bp?.x || mon.my !== _bp?.y);
                /* C spell.c:1039-1040 uses the shared impact position, even
                 * though this spell never updates it to the current zap. */
                const bhitpos = game.gb?.bhitpos || game.bhitpos || { x: 0, y: 0 };
                (game.gn ||= {}).notonhead = (mon.mx !== bhitpos.x || mon.my !== bhitpos.y);
                const dmg = await _zhitm(mon, 10 + 5 /* BZ_U_SPELL(AD_ELEC - 1) */, 2);
                if (dmg) {
                    if ((mon.mhp | 0) < 1) await xkilled(mon, 0 /* XKILL_GIVEMSG */);
                    else {
                        await pline(`You shock ${mon_nam(mon)}${exclam(dmg)}`);
                        if (!canseemon(mon) && !game.gn.notonhead) map_invisible(zap.x, zap.y);
                    }
                } else if (canseemon(mon)) {
                    await pline(`${mon_nam(mon).replace(/^./, (c) => c.toUpperCase())} resists.`);
                }
                if ((mon.mhp | 0) >= 1) {
                    game.context.forcefight = (game.context.forcefight | 0) + 1;
                    await wakeup(mon, false);
                    game.context.forcefight--;
                }
            }
            if (!zap.strength) continue;
            zap.strength--;
            propagate(zap);
            if (zap.strength < 2) zap.strength = 0;
            else if ((u.uen | 0) > 0) {
                if (!(game.disp && ((game.disp.botl | 0) || (game.disp.botlx | 0)))
                    && game._botlStaleUen === undefined)
                    game._botlStaleUen = u.uen | 0;
                u.uen--;
            }
            zap.dir = DIR_LEFT(zap.dir);
            propagate(zap);
            zap.dir = DIR_RIGHT2(zap.dir);
            propagate(zap);
        }
        nh_delay_output();
    }
    nh_delay_output();
    nh_delay_output();
    tmp_at(DISP_END, 0);
}

/* C artifact.c:2503-2578 retouch_object() for the hero. */
export async function retouch_object_hero(obj, loseit) {
    /* C artifact.c:2514-2516: even silver-hating forms may do the ritual. */
    if (obj.otyp === 263 /* BELL_OF_OPENING */
        && invocation_pos(game.u.ux, game.u.uy)
        && !On_stairs(game.u.ux, game.u.uy)) return 1;
    game._rt_blast_page_standing = true;
    let touched;
    try { touched = await _rt_touch_artifact_youmonst(obj); }
    finally { game._rt_blast_page_standing = false; }
    /* C artifact.c:951 You("are blasted by %s power!") is printed inside
     * touch_artifact; js/wizcmds.js defers it on game._touch_artifact_blast_msg
     * (post-losehp, so the next message's --More-- shows the damaged HP). */
    const _blast = game._touch_artifact_blast_msg;
    if (_blast) {
        game._touch_artifact_blast_msg = null;
        await pline(_blast);
    }
    if (touched) {
        const ag = ((MKOBJ_OC_MATERIAL[obj.otyp | 0] | 0) === 14 /* SILVER */) && (((game.u?.ulycn ?? -1) | 0) >= LOW_PM || !!(game.youmonst?.data && _rt_hates_silver(game.youmonst.data)));
        const bane = _rt_bane_applies_hero(obj.oartifact | 0);
        if (!ag && !bane) return 1;
        await pline(`You can't handle ${_rt_yname(obj)}${obj.owornmask ? ' anymore' : ''}!`);
        /* C artifact.c:2537: damage only if touch_artifact did not blast. */
        if (!_blast) {
            const half = game.u?.uprops?.[HALF_PHDAM];
            let dmg = 0;
            let what = _rt_killer_xname(obj);
            /* C artifact.c:2540-2548: randomized silver rings/wands. */
            if (ag && !obj.oartifact && !bane) {
                if ((obj.oclass | 0) === 4 /* RING_CLASS */) what = 'a silver ring';
                else if ((obj.oclass | 0) === 11 /* WAND_CLASS */) what = 'a silver wand';
            }
            if (ag) {
                const tmp = _rt_rnd(10);
                dmg += (half && (half.intrinsic || half.extrinsic)) ? Math.trunc((tmp + 1) / 2) : tmp;
            }
            if (bane) dmg += _rt_rnd(10);
            await _rt_losehp(dmg, `handling ${what}`, KILLED_BY);
            _rt_exercise(A_CON, false);
        }
    }
    if (obj.owornmask) {
        await _rt_remove_worn_item(obj, false);
        let found = false;
        for (let o = game.invent; o; o = o.nobj) if (o === obj) { found = true; break; }
        if (!found) return 0;
    }
    if (loseit) {
        const lev = game.u?.uprops?.[LEVITATION];
        /* youprop.h:240 Levitation = (H || E) && !BLevitation */
        if (lev && (lev.intrinsic || lev.extrinsic) && !lev.blocked) {
            await _rt_freeinv(obj);
            await _rt_hitfloor(obj, true);
        } else {
            if (game.level?.at(game.u.ux, game.u.uy)?.typ !== ALTAR)
                await pline(`${_rt_Tobjnam(obj, 'fall')} to the ${_rt_surface(game.u.ux, game.u.uy)}.`);
            await _rt_dropx(obj);
        }
    }
    return 0;
}

/* C artifact.c:2596-2635 untouchable(). */
async function untouchable_hero(obj, drop) {
    const u = game.u;
    const wearmask = ~(W_QUIVER | (u.twoweap ? 0 : W_SWAPWEP) | W_BALL);
    if (!obj) return false;
    const beingworn = (obj.owornmask & wearmask) !== 0;
    /* carryeffect/invoked: get_artifact(obj) != ART_NONARTIFACT, artifact.c:2610-2616 */
    const art = obj.oartifact | 0;
    const carryeffect = art > 0 && (arti_cary_adtyp(art) !== 0 || arti_cspfx(art) !== 0);
    const ip = art > 0 ? arti_inv_prop(art) : 0;
    const invoked = ip > 0 && ip <= LAST_PROP
        && ((u.uprops?.[ip]?.extrinsic | 0) & W_ARTI) !== 0;
    if (!(beingworn || carryeffect || invoked)) return false;
    if (await retouch_object_hero(obj, drop)) return false;
    /* C artifact.c:2630-2631: reverse invocation if retouch left the object
     * carried.  Dropping it already reverses invocation through freeinv(). */
    if (invoked) {
        for (let carried = game.invent; carried; carried = carried.nobj) {
            if (carried === obj) {
                await _rt_arti_invoke(obj);
                break;
            }
        }
    }
    return true;
}

/* C artifact.c:2640-2705 retouch_equipment(dropflag): 0 none, 1 all, 2 weapon. */
export async function retouch_equipment(dropflag) {
    const u = game.u;
    const had_gloves = !!u.uarmg;
    const had_rings = Number(!!u.uleft) + Number(!!u.uright);
    if (!_rt_nesting++) _rt_clear_bypasses();
    let dropit = dropflag > 0;
    try {
        if (u.twoweap && u.uswapwep) { _rt_bypass_obj(u.uswapwep); await untouchable_hero(u.uswapwep, dropit); }
        if (u.uwep) { _rt_bypass_obj(u.uwep); await untouchable_hero(u.uwep, dropit); }
        // C artifact.c:2674-2680: a saddle is checked without dropping it.
        const saddle = u.usteed && _rt_which_armor(u.usteed, W_SADDLE);
        if (saddle && await untouchable_hero(saddle, false))
            await _rt_dismount_steed(DISMOUNT_THROWN);
        dropit = dropflag === 1;
        let obj;
        while ((obj = _rt_nxt_unbypassed_obj(game.invent)) !== null && obj !== undefined)
            await untouchable_hero(obj, dropit);
        if (had_rings !== Number(!!u.uleft) + Number(!!u.uright)
            && u.uarmg && u.uarmg.cursed)
            _rt_uncurse(u.uarmg);
        if (had_gloves && !u.uarmg)
            await _rt_selftouch('After losing your gloves, you');
    } finally {
        if (!--_rt_nesting) _rt_clear_bypasses();
    }
}
let _rt_nesting = 0;

/* C rumors.c:94 init_rumors(), using the compiled file in the data bundle.
 * Keep the offsets and failed-init sentinel shared with getrumor(). */
export function rumor_fgets(file, bufsiz = BUFSZ) {
    if (file.pos >= file.text.length) return null;
    const nl = file.text.indexOf('\n', file.pos);
    const end = Math.min(file.pos + bufsiz - 1, nl < 0 ? file.text.length : nl + 1);
    const line = file.text.slice(file.pos, end).split('\0', 1)[0];
    file.pos = end;
    return line;
}
export function init_rumors(file) {
    rumor_fgets(file); /* skip "don't edit" comment */
    const line = rumor_fgets(file) || '';
    const dec = '\\s*([+-]?\\d+)', hex = '\\s*([+-]?(?:0[xX])?[0-9a-fA-F]+)';
    const header = new RegExp(`^${dec},${dec},${hex};${dec},${dec},${hex};0,0,${hex}`).exec(line);
    if (header) {
        game.true_rumor_size = Number(header[2]);
        game.true_rumor_start = parseInt(header[3], 16);
        game.false_rumor_size = Number(header[5]);
        game.false_rumor_start = parseInt(header[6], 16);
        if (game.true_rumor_size > 0 && game.false_rumor_size > 0) {
            game.true_rumor_end = game.true_rumor_start + game.true_rumor_size;
            game.false_rumor_end = game.false_rumor_start + game.false_rumor_size;
            return true;
        }
    }
    game.true_rumor_size = -1;
    return false;
}
/* C rumors.c:770 couldnt_open_file(): suppress impossible's reload advice. */
async function rumor_couldnt_open_file(fname) {
    const state = game.program_state;
    const save_something = state.something_worth_saving;
    if (!game.iflags?.debug_fuzzer) state.something_worth_saving = 0;
    try {
        await rumor_impossible("Can't open '%s' file.", fname);
    } finally {
        state.something_worth_saving = save_something;
    }
}
export async function rumor_file_open() {
    const text = dat_content('rumors');
    if (text !== null) return { text, pos: 0 };
    await rumor_couldnt_open_file('rumors');
    game.true_rumor_size = -1;
    return null;
}
/* C rumors.c:420 get_rnd_line(): fgets is bounded even for malformed records. */
export function rumor_rnd_line(file, truth, rng) {
    const start = truth ? game.true_rumor_start : game.false_rumor_start;
    const end = truth ? game.true_rumor_end : game.false_rumor_end;
    const size = end - start;
    if (size < 1) return '';
    let line = '';
    for (let tries = 10; tries > 0; --tries) {
        file.pos = start + rng(size);
        line = rumor_fgets(file) ?? line;
        if (line.length <= 61) break; /* MD_PAD_RUMORS+1 */
    }
    const next = file.pos < end ? rumor_fgets(file) : null;
    if (next === null) {
        file.pos = start;
        line = rumor_fgets(file) ?? line;
    } else line = next;
    return xcrypt(line.split('\n', 1)[0]).replace(/_+$/, '');
}
const rumor6 = (n) => String(n).padStart(6, '0');
const rumor6x = (n) => n.toString(16).padStart(6, '0');
/* C rumors.c:308-408; out is the lazily created text window's line buffer. */
async function others_check(ftype, fname, out) {
    const text = dat_content(fname);
    if (text === null) {
        await rumor_couldnt_open_file(fname);
        return;
    }
    out.push('');
    out.push(ftype);
    let pos = 0;
    /* dlb_fgets() includes the newline and reads at most BUFSZ-1 bytes. */
    function fgets() {
        if (pos >= text.length) return null;
        const nl = text.indexOf('\n', pos);
        const end = Math.min(pos + BUFSZ - 1, nl < 0 ? text.length : nl + 1);
        const line = text.slice(pos, end).split('\0', 1)[0];
        pos = end;
        return line;
    }
    const error = (message) => out.push(`others_check("${fname}"): ${message}`);
    let line = fgets();
    if (line === null) {
        error("error; can't read comment line");
        return;
    }
    if (line[0] !== '#') {
        error('malformed; first line is not a comment line:');
        line = line.split('\n', 1)[0];
        out.push('- first line, as is', line, '- xcrypt of first line', xcrypt(line));
        return;
    }
    line = fgets();
    if (line === null || line[0] === '\n') {
        error(!line ? "can't read first non-comment line" : 'first non-comment line is empty');
        return;
    }
    out.push(xcrypt(line.split('\n', 1)[0]));
    line = fgets();
    if (line === null) {
        out.push('(no second entry)');
        return;
    }
    let entrycount = 2;
    let xbuf = xcrypt(line.split('\n', 1)[0]);
    out.push(xbuf);
    while ((line = fgets()) !== null) {
        ++entrycount;
        xbuf = xcrypt(line.split('\n', 1)[0]);
    }
    if (entrycount === 2) {
        out.push('(only two entries)');
    } else {
        if (entrycount > 3) out.push(' ...');
        out.push(xbuf);
    }
}
export async function wiz_rumor_check() {
    const out = [];
    /* C rumors.c:205-292: a failed open is reported once; failed init and
       subsequent checks still show the other three files after a --More--. */
    const failed = (game.true_rumor_size ?? 0) < 0;
    const file = failed ? null : await rumor_file_open();
    if (file && ((game.true_rumor_size ?? 0) !== 0 || init_rumors(file))) {
        const tStart = game.true_rumor_start, tEnd = game.true_rumor_end;
        const fStart = game.false_rumor_start, fEnd = game.false_rumor_end;
        out.push(`T start=${rumor6(tStart)} (${rumor6x(tStart)}), end=${rumor6(tEnd)} (${rumor6x(tEnd)}), size=${rumor6(game.true_rumor_size)} (${rumor6x(game.true_rumor_size)})`);
        out.push(`F start=${rumor6(fStart)} (${rumor6x(fStart)}), end=${rumor6(fEnd)} (${rumor6x(fEnd)}), size=${rumor6(game.false_rumor_size)} (${rumor6x(game.false_rumor_size)})`);
        for (const [label, start, end] of [['T', tStart, tEnd], ['F', fStart, fEnd]]) {
            file.pos = start;
            let line = rumor_fgets(file) || '';
            out.push(`${label} ${rumor6(start)} ${xcrypt(line.split('\n', 1)[0])}`);
            let next;
            while ((next = rumor_fgets(file)) !== null) {
                line = next;
                if (file.pos >= end) break;
            }
            out.push(`  ${''.padStart(6)} ${xcrypt(line.split('\n', 1)[0])}`);
        }
    } else if (failed || file) {
        await pline('rumors not accessible.');
        await force_more(game._pending_message); /* WIN_MESSAGE, TRUE */
    }
    await others_check('Engravings:', 'engrave', out);
    await others_check('Epitaphs:', 'epitaph', out);
    await others_check('Bogus monsters:', 'bogusmon', out);
    await display_text_window(out);
    return ECMD_OK;
}

/* C mondata.c:501 mstrength_ranged_attk() */
function mstrength_ranged_attk(mattk) {
    const atk_mask = (1 << 12 /* AT_BREA */) | (1 << 10 /* AT_SPIT */) | (1 << 15 /* AT_GAZE */);
    for (let i = 0; i < 6; i++) {
        const j = mattk[i].aatyp;
        if (j >= 254 /* AT_WEAP */ || (j < 32 && (atk_mask & (1 << j)) !== 0))
            return true;
    }
    return false;
}
/* C mondata.c:428 mstrength(ptr) — rows from makemon_{mons,ac,mattk,pmnames}.json */
function mstrength(mndx) {
    const row = monsPack.mons[mndx], ac = monAcPack.ac[mndx];
    const mattk = monMattkPack.mattk[mndx], name = monPmnamesPack.pmnames[mndx][2];
    const geno = row[3], mflags2 = row[7] >>> 0, mmove = row[9];
    let tmp = row[1], n;
    if (tmp > 49) /* special fixed hp monster */
        tmp = Math.trunc(2 * (tmp - 6) / 4);
    n = (geno & 0x0080 /* G_SGROUP */) ? 1 : 0;
    n += ((geno & 0x0040 /* G_LGROUP */) ? 1 : 0) << 1;
    if (mstrength_ranged_attk(mattk)) n++;
    n += (ac < 4) ? 1 : 0;
    n += (ac < 0) ? 1 : 0;
    n += (mmove >= 18) ? 1 : 0;
    for (let i = 0; i < 6; i++) {
        const tmp2 = mattk[i].aatyp;
        n += (tmp2 > 0) ? 1 : 0;
        n += (tmp2 === 255 /* AT_MAGC */) ? 1 : 0;
        n += (tmp2 === 254 /* AT_WEAP */ && (mflags2 & 0x04000000 /* M2_STRONG */)) ? 1 : 0;
        if (tmp2 === 13 /* AT_EXPL */) {
            const tmp3 = mattk[i].adtyp;
            n += (tmp3 === 3 /* AD_COLD */ || tmp3 === 2 /* AD_FIRE */) ? 3
                : (tmp3 === 6 /* AD_ELEC */) ? 5 : 0;
        }
    }
    for (let i = 0; i < 6; i++) {
        const tmp2 = mattk[i].adtyp;
        if (tmp2 === 15 || tmp2 === 18 || tmp2 === 7 || tmp2 === 30
            || tmp2 === 31 || tmp2 === 29) /* DRLI STON DRST DRDX DRCO WERE */
            n += 2;
        else if (name !== "grid bug")
            n += (tmp2 !== 0 /* AD_PHYS */) ? 1 : 0;
        n += (mattk[i].damd * mattk[i].damn > 23) ? 1 : 0;
    }
    if (name === "leprechaun") n -= 2;
    if (name === "killer bee" || name === "soldier ant") n += 2;
    if (n === 0) tmp -= 1;
    else if (n < 6) tmp += Math.trunc(n / 3) + 1;
    else tmp += Math.trunc(n / 2);
    return (tmp >= 0) ? tmp : 0;
}
/* C wizcmds.c:1790 wiz_mon_diff() — #wizmondiff; NHW_TEXT, ECMD_OK, no turn/RNG. */
export async function wiz_mon_diff() {
    const out = [];
    let trouble = 0;
    const rows = monsPack.mons;
    for (let cnt = 0; cnt < rows.length; cnt++) {
        const mcalculated = mstrength(cnt);
        const mhardcoded = rows[cnt][2];
        const mdiff = mhardcoded - mcalculated;
        if (mdiff) {
            if (!trouble++)
                out.push("Review of monster difficulty ratings [index:level]:");
            let mlev = rows[cnt][1];
            if (mlev > 50) /* hack for named demons */
                mlev = 50;
            out.push(`${monPmnamesPack.pmnames[cnt][2].padEnd(18)} [${String(cnt).padStart(3)}:${String(mlev).padStart(2)}]: calculated: ${String(mcalculated).padStart(2)}, hardcoded: ${String(mhardcoded).padStart(2)} (${mdiff > 0 ? '+' : ''}${mdiff})`);
        }
    }
    if (!trouble)
        out.push("No monster difficulty discrepancies were detected.");
    await display_text_window(out);
    return ECMD_OK;
}

/* C wizcmds.c:1540-1605 list_migrating_mons(): the selected NHW_TEXT list.
 * The command owns the counts and prompt; this owns its display and ordering. */
export async function display_migrating_mons(choice, nextlevel) {
    const current = game.u.uz;
    const selected = [];
    for (let mon = game.migrating_mons; mon; mon = mon.nmon) {
        const destination = mon.mux === current.dnum && mon.muy === current.dlevel ? 'c'
            : mon.mux === nextlevel.dnum && mon.muy === nextlevel.dlevel ? 'n' : 'o';
        if (choice === 'a' || choice === destination) selected.push(mon);
    }
    if (!selected.length) {
        if (choice !== 'q') await pline('None.');
        return;
    }
    selected.sort((a, b) => a.mux - b.mux || a.muy - b.muy
        || (a.m_id < b.m_id ? -1 : a.m_id > b.m_id ? 1 : 0));
    const destination = choice === 'c' ? 'current level'
        : choice === 'n' ? 'next level' : "'other' levels";
    const heading = choice === 'a' ? 'All migrating monsters:'
        : `Monster${selected.length === 1 ? '' : 's'} migrating to ${destination}:`;
    const lines = [heading, ''];
    for (const mon of selected) {
        // C do_name.c:1254 minimal_monnam(mon, FALSE), including shapechangers.
        let name;
        if (!mon.data) {
            name = '[Null mon->data]';
        } else {
            const gender = mon.female ? FEMALE : MALE;
            const names = mon.data.pmnames || monPmnamesPack.pmnames[mon.data.pmidx];
            name = (mon.mtame ? 'tame ' : mon.mpeaceful ? 'peaceful ' : '')
                + (names[gender] || names[NEUTRAL]) + ` <${mon.mx},${mon.my}>`;
            if ((mon.cham ?? NON_PM) !== NON_PM) {
                const forms = monPmnamesPack.pmnames[mon.cham];
                name += `{${forms[gender] || forms[NEUTRAL]}}`;
            }
        }
        let line = `  ${name}`.replace(' <0,0>', '');
        if (has_mgivenname(mon)) line += ` named ${MGIVENNAME(mon)}`;
        if (choice === 'o' || choice === 'a') line += ` to ${mon.mux}:${mon.muy}`;
        if (mon.mtrack?.[0]?.x === MIGR_EXACT_XY)
            line += ` at <${mon.mtrack[1].x},${mon.mtrack[1].y}>`;
        lines.push(line);
    }
    await display_text_window(lines);
}

function _sunday_of_month(y, m, n) { /* n > 0: nth Sunday; n < 0: last */
    if (n > 0)
        return 1 + (7 - new Date(Date.UTC(y, m, 1)).getUTCDay()) % 7 + 7 * (n - 1);
    const dim = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    return dim - new Date(Date.UTC(y, m, dim)).getUTCDay();
}
export function recorder_localtime(t) {
    const y = new Date((t - 5 * 3600) * 1000).getUTCFullYear();
    const [sm, sn, em, en] = y >= 2007 ? [2, 2, 10, 1]
        : y >= 1987 ? [3, 1, 9, -1] : [3, -1, 9, -1];
    const start = Date.UTC(y, sm, _sunday_of_month(y, sm, sn), 7) / 1000; /* 2:00 EST */
    const end = Date.UTC(y, em, _sunday_of_month(y, em, en), 6) / 1000;   /* 2:00 EDT */
    const d = new Date((t + ((t >= start && t < end) ? -4 : -5) * 3600) * 1000);
    const yr = d.getUTCFullYear(), mon = d.getUTCMonth(), mday = d.getUTCDate();
    return { tm_year: yr - 1900, tm_mon: mon, tm_mday: mday,
             tm_hour: d.getUTCHours(), tm_min: d.getUTCMinutes(), tm_sec: d.getUTCSeconds(),
             tm_yday: Math.floor((Date.UTC(yr, mon, mday) - Date.UTC(yr, 0, 1)) / 86400000),
             tm_wday: d.getUTCDay() };
}

/* C calendar.c:95-116: savegamestate writes birthdays as local date text,
 * rather than preserving the epoch value through the save/restore boundary. */
export function yyyymmddhhmmss(date) {
    const lt = recorder_localtime(date || getnow());
    const year = lt.tm_year + (lt.tm_year < 70 ? 2000 : 1900);
    return String(year).padStart(4, '0')
        + [lt.tm_mon + 1, lt.tm_mday, lt.tm_hour, lt.tm_min, lt.tm_sec]
            .map(n => String(n).padStart(2, '0')).join('');
}

/* C muse.c:3269 green_mon(): mons[].mcolor is CLR_GREEN or CLR_BRIGHT_GREEN.
 * permonst templates carry no mcolor, so read the MON_MCOLOR table by mndx. */
export function green_mon(mon) {
    if (_display_hallucinating()) return false;
    const mndx = (mon.mndx ?? mon.mnum ?? -1) | 0;
    const c = (mndx >= 0 && mndx < MON_MCOLOR.length) ? MON_MCOLOR[mndx] : -1;
    return c === CLR_GREEN || c === CLR_BRIGHT_GREEN;
}

/* C glyphs.c:808-819,890-1118 and wizcmds.c:1987-2031: enumerate the
 * customized glyphs, not just the symbols used on the current level.  The map
 * renderer resolves glyphs on demand rather than keeping C's glyphmap array;
 * build the same identities here for the diagnostic window. */
export function wizcustom_glyphids(menu) {
    const nm = MON_MLET.length, no = MKOBJ_OC_CLASS.length;
    /* monsdump[].nm is the enum's bareword, not the gendered monster name. */
    /* v5 monsters.h renamed these enum entries; pm.generated.js retains the
     * older aliases used by the rest of the port. */
    const renamed = {
        DWARF_LORD: 'DWARF_LEADER', DWARF_KING: 'DWARF_RULER', KOBOLD_LORD: 'KOBOLD_LEADER',
        GNOME_LORD: 'GNOME_LEADER', GNOME_KING: 'GNOME_RULER', OGRE_LORD: 'OGRE_LEADER',
        OGRE_KING: 'OGRE_TYRANT', VAMPIRE_LORD: 'VAMPIRE_LEADER', ELF_LORD: 'ELF_NOBLE',
        ELVENKING: 'ELVEN_MONARCH', PRIEST: 'ALIGNED_CLERIC', HIGH_PRIEST: 'HIGH_CLERIC',
        INCUBUS: 'AMOROUS_DEMON', CAVEMAN: 'CAVE_DWELLER',
    };
    const monNames = [];
    for (const [name, value] of Object.entries(pmNumbers))
        if (name.startsWith('PM_')) monNames[value] = renamed[name.slice(3)] ?? name.slice(3);
    const glyphs = [];
    const fixname = name => name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const add = (name, symidx, color, u = 0, customidx = null) => {
        glyphs.push({ customidx, id: 'G_' + fixname(name), symidx, color, u, customcolor: 0 });
    };
    const monsterSet = prefix => {
        for (let i = 0; i < nm; i++) {
            const idx = SYM_OFFSETS.M + MON_MLET[i];
            add(prefix + monNames[i], idx, MON_MCOLOR[i], primary_unicode_symbol(idx), idx);
        }
    };
    monsterSet('male_'); monsterSet('female_');
    monsterSet('pet_male_'); monsterSet('pet_female_');
    add('invisible', SYM_OFFSETS.X + 3, NO_COLOR);
    monsterSet('detected_male_'); monsterSet('detected_female_');
    const bodies = prefix => {
        for (let i = 0; i < nm; i++)
            add(prefix + monNames[i], SYM_OFFSETS.O + 7, MON_MCOLOR[i]);
    };
    bodies('body_');
    monsterSet('ridden_male_'); monsterSet('ridden_female_');
    const objects = prefix => {
        for (let i = 0; i < no; i++) {
            let name = OC_NAME[i] ?? OC_DESCR[i];
            /* C parse_id skips the unused scroll and wand descriptions. */
            const skip = (i > 343 && i < 364) || (i > 434 && i < 438);
            if (i >= 410 && i <= 434) name = 'wand of ' + name;
            else if (i >= 366 && i < 407) name = 'spellbook of ' + name;
            else if (i >= 323 && i <= 343) name = 'scroll of ' + name;
            else if (i >= 297 && i <= 322) name = (i === 322 ? 'flask of n' : 'potion of ') + name;
            else if (i >= 173 && i <= 200) name = 'ring of ' + name;
            else if (i === 243) name = 'unset ' + name;
            if (i === 365) name = 'blank scroll';
            if (i === 407) name = 'blank spellbook';
            if (i === 285) name = 'slime mold';
            const symidx = i === BOULDER_OTYP ? SYM_OFFSETS.X + 2
                : SYM_OFFSETS.O + MKOBJ_OC_CLASS[i];
            /* glyph_find_core's find_oc compares the object TYPE to the
             * position of S_<class> in loadsyms, not to objects[i].oc_class. */
            const customidx = i < 17 ? SYM_OFFSETS.O + i + 1 : null;
            const u = customidx !== null ? primary_unicode_symbol(customidx) : 0;
            add(prefix + name, symidx, MKOBJ_OC_COLOR[i], u, customidx);
            if (skip || name == null) glyphs[glyphs.length - 1].id = null;
        }
    };
    objects('');
    /* defsym.h:90-155; traps/effects share the renderer's existing tables. */
    const cmapColors = _CMAP_COLORS;
    const cmap = (name, idx, color = cmapColors[idx]) =>
        add(name, idx, color, primary_unicode_symbol(idx), idx);
    cmap('stone substrate', 0);
    for (const branch of ['main', 'mines', 'gehennom', 'knox', 'sokoban'])
        for (let i = 1; i <= 11; i++) cmap(symbol_name(i).slice(2) + '_' + branch, i);
    for (let i = 12; i <= 32; i++) cmap(symbol_name(i).slice(2), i);
    const altarColors = [1,7,7,7,13]; /* display.h altar_colors */
    for (const [i, alignment] of ['unaligned', 'chaotic', 'neutral', 'lawful', 'other'].entries())
        cmap(i === 4 ? 'altar other' : alignment + '_altar', 33, altarColors[i]);
    for (let i = 34; i <= 73; i++) cmap(symbol_name(i).slice(2), i);
    for (const [i, type] of ['missile', 'fire', 'frost', 'sleep', 'death', 'lightning', 'poison gas', 'acid'].entries())
        for (let j = 0; j < 4; j++) cmap(type + ' zap ' + symbol_name(74 + j).slice(2), 74 + j, _ZAP_COLORS[i]);
    for (let i = 78; i <= 87; i++) cmap(symbol_name(i).slice(2), i);
    const swallowParts = ['top left', 'top center', 'top right', 'middle left',
        'middle right', 'bottom left', 'bottom center', 'bottom right'];
    for (let i = 0; i < nm; i++)
        for (let j = 0; j < 8; j++)
            cmap('swallow ' + monNames[i] + ' ' + swallowParts[j], 88 + j, MON_MCOLOR[i]);
    for (const [i, type] of ['dark', 'noxious', 'muddy', 'wet', 'magical', 'fiery', 'frosty'].entries())
        for (let j = 0; j < 9; j++) cmap(type + ' ' + symbol_name(96 + j).slice(2), 96 + j, _EXPL_COLORS[i]);
    for (let i = 0; i < 6; i++) add('warning' + i, SYM_OFFSETS.W + i, DEF_WARNSYMS[i].color);
    const statues = prefix => {
        for (let i = 0; i < nm; i++) add(prefix + monNames[i], SYM_OFFSETS.M + MON_MLET[i], MKOBJ_OC_COLOR[STATUE]);
    };
    statues('statue_of_male_'); statues('statue_of_female_');
    objects('piletop_'); bodies('piletop_body_');
    statues('piletop_statue_of_male_'); statues('piletop_statue_of_female_');
    add('unexplored', SYM_OFFSETS.X + 1, NO_COLOR);
    add('nothing', SYM_OFFSETS.X, NO_COLOR);

    /* symbols.c parse_sym_line -> glyphs.c glyphrep_to_custom_map_entries:
     * S_ lines match a glyph family; G_ lines override a single glyph.
     * Read the bundled symset, just as the symbol loader does. */
    const byId = new Map(glyphs.map(g => [g.id?.toLowerCase(), g]));
    const bySymbol = new Map();
    for (const gm of glyphs) {
        if (gm.customidx === null) continue;
        const key = symbol_name(gm.customidx)?.toLowerCase();
        if (!bySymbol.has(key)) bySymbol.set(key, []);
        bySymbol.get(key).push(gm);
    }
    const set = gs.symset[PRIMARYSET] || {};
    let active = false;
    for (const raw of (dat_content('symbols') || '').split('\n')) {
        const line = raw.replace(/\s+#.*$/, '').trim();
        const start = /^(?:start|begin)\s*:\s*(.*)$/i.exec(line);
        if (start) { active = start[1].toLowerCase() === set.name?.toLowerCase(); continue; }
        if (/^finish\b/i.test(line)) { active = false; continue; }
        const match = active && /^([GS]_\w+)\s*[:=]\s*([^/]*)\/?(.*)$/i.exec(line);
        if (!match) continue;
        const key = match[1].toLowerCase();
        const targets = key.startsWith('g_') ? [byId.get(key)].filter(Boolean)
            : set.handling === 5 ? (bySymbol.get(key) || []) : [];
        const u = /^U\+([0-9a-f]+)/i.exec(match[2].trim());
        const color = match[3].trim() && rgbstr_to_int32(match[3].trim());
        for (const gm of targets) {
            if (u && set.handling === 5) gm.u = parseInt(u[1], 16);
            if (color !== '' && color !== -1) gm.customcolor = color || 0x1000000;
        }
    }
    const unicode = (game._gm_customsymbols ?? game.iflags.customsymbols) !== false;
    const colors = game.iflags.customcolors !== false;
    const useColor = (game._gm_use_color ?? game.iflags.use_color) !== false;
    for (let glyphnum = 0; glyphnum < glyphs.length; glyphnum++) {
        const gm = glyphs[glyphnum];
        const u = unicode ? gm.u : 0, color = colors ? gm.customcolor : 0;
        if (!gm.id || (!u && !color)) continue;
        let sym = primary_showsym(gm.symidx);
        if (gm.symidx === 20 && !game._symsetDarkroomPending)
            sym = primary_showsym(_darkroom_alias_blank() ? SYM_OFFSETS.X : 19);
        let clr = useColor ? gm.color : NO_COLOR;
        if (gm.symidx === 23 && sym === primary_showsym(22) && useColor) clr = CLR_WHITE;
        const bufa = `[${String(glyphnum).padStart(4, '0')}] ${gm.id.padEnd(44)}`;
        const bufb = `'\\${String(sym).padStart(3, '0')}' ${String(clr).padStart(2, '0')}`;
        const bufc = color.toString(16).padStart(11, '0');
        let bufu = '';
        if (u) {
            const bytes = new TextEncoder().encode(String.fromCodePoint(u));
            bufu = 'U+' + u.toString(16).padStart(4, '0') + [...bytes].map(b => ` <${b}>`).join('');
        }
        menu.add_menu(glyphnum + 1, 0, 0, `${bufa} ${bufb} ${bufc} ${bufu}`);
    }
}
