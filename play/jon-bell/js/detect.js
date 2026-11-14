// detect.js — detection redraw helpers and clairvoyance map scan.
// C ref: nethack-c-v5/upstream/src/detect.c.
import { game } from './gstate.js';
import { COLNO, ROWNO, POOL, MOAT, WATER, LAVAPOOL, LAVAWALL,
         TER_DETECT, TER_MAP, TER_TRP, TER_OBJ, TER_MON, I_SPECIAL, IN_SIGHT,
         CLAIRVOYANT, CONFUSION, DETECT_MONSTERS, SVALL, COULD_SEE } from './const.js';
import { force_more, flush_screen, docrt, map_invisible, map_object, see_monsters, canspotmon, newsym, GLYPHCLS_MON, GLYPHCLS_INVIS, GLYPHCLS_CMAP, GLYPHCLS_TRAP, GLYPHCLS_ENGR } from './display.js';
import { pline } from './pline.js';
import { Blind } from './vision.js';
import './read.js';
import './cmd.js';
import { observe_object } from './o_init.js';
import { m_at } from './uhitm.js';
import { PM_LONG_WORM_TAIL } from './pm.generated.js';
import { is_moat } from './dbridge.js';
import { _glyph_ident } from './cmd.js';
import { pushRngLogEntry } from './rng.js';
import { ENV } from './hostenv.js';
import { DEF_MONSYM_CHARS, MON_MLET, _hallucinating_dsp, random_monster, show_detected_monster_glyph, under_ground, under_water } from './display.js'; // relocate-fns
import { detect_wsegs } from './worm.js'; // relocate-fns
import { BOLT_LIM, BURIED_TOO, CONTAINED_TOO, CORR, DOOR, D_CLOSED, D_LOCKED, D_TRAPPED, Has_contents, SCORR, SDOOR, STATUE_TRAP, TRAPPED_CHEST, TRAPPED_DOOR, isok, u_at } from './const.js'; // relocate-fns
import './dig.js'; // relocate-fns
import { Unaware, cmap_glyph, flash_glyph_at, mon_to_glyph, trap_to_glyph, unmap_invisible } from './display.js'; // relocate-fns
import { get_obj_location } from './zap.js'; // relocate-fns
import { seemimic } from './mon.js'; // relocate-fns
import { sense_trap } from './read.js';
import { magic_map_background } from './display.js'; // relocate-fns
import { NO_COLOR } from './terminal.js'; // relocate-fns
import { t_at } from './trap.js'; // relocate-fns
import { do_clear_area, recalc_block_point, unblock_point } from './vision.js'; // relocate-fns
import { DEADMONSTER } from './zap.js'; // relocate-fns
import { STONE, W_NONDIGGABLE, W_NONPASSWALL } from './const.js'; // relocate-fns
import { map_background, map_trap } from './display.js'; // relocate-fns
import { sobj_at } from './invent.js'; // relocate-fns
import { BOULDER } from './sp_lev.js'; // relocate-fns
import { D_NODOOR, Is_rogue_level, WM_MASK } from './const.js'; // relocate-fns
import { nomul } from './hack.js'; // relocate-fns
import { acurr, exercise, spec_ability } from './attrib.js'; // relocate-fns
import { CMD_CHEST, CMD_LARGE_BOX, CRYSTAL_BALL_OTYP, Is_box, SPFX_SEARCH_ART, TER_FULL, _Blind_cmd, _CB_TER_DETECT, _LENSES_OTYP, _MONS, _cb_object_detect_class, _cmd_Hallucination, _digests, _glyph_at, _hero_Deaf, _hprop, _is_cmap_furniture, _is_hider_mndx, _levlAt, _st_a_monnam, _steth_cvt_sdoor_to_door, _steth_seemimic, _uprop_active, flooreffects_Maybe_Half_Phys, flooreffects_distu, yn_function } from './cmd.js';
import { getpos } from './getpos.js';
import { consume_obj_charge, useup } from './invent.js';
import { set_msg_xy } from './pline.js'; // relocate-fns
import { A_INT, A_STR, A_WIS, DRAWBRIDGE_UP, D_BROKEN, D_ISOPEN, ECMD_OK, ECMD_TIME, HALLUC, IS_DOOR, IS_FURNITURE, IS_WALL, KILLED_BY_AN, M_AP_FURNITURE, M_AP_TYPE, ROOM, STUNNED, SYM_BOULDER, TIMEOUT, TREE } from './const.js'; // relocate-fns
import { find_drawbridge, is_pool } from './dbridge.js'; // relocate-fns
import { open_drawbridge } from './dbridge.js'; // relocate-fns
import { GLYPHCLS_OBJ, GLYPHCLS_SWALLOW, GLYPHCLS_UNEXPLORED, GLYPHCLS_WARNING, cls as display_cls, display_self, feel_location, feel_newsym, glyph_cmap_at, glyph_is_gascloud, glyph_is_this_trap, objpile_attr, pager_boulder_symbol, pager_showsyms, region_glyph, sensemon, show_glyph_cell, terrain_glyph, topl_force_break_now, trap_glyph_entry, use_last_flush_snapshot, warning_of as warning_of_real, xy_set_wall_state } from './display.js'; // relocate-fns
import { cmd_safety_prevention } from './do.js'; // relocate-fns
import { Monnam } from './do_name.js'; // relocate-fns
import { xname } from './do_wear.js'; // relocate-fns
import { MAXMCLASSES, MAXOCLASSES, def_char_to_monclass, def_char_to_objclass } from './drawing.js'; // relocate-fns
import { depth, level_difficulty } from './dungeon.js'; // relocate-fns
import { losehp } from './hack.js'; // relocate-fns
import { makeknown } from './makemon.js';
import { trapname as makemon_trapname } from './trap.js';
import { poly_gender } from './polyself.js'; // relocate-fns
import { hcolor } from './mhitm.js';
import { y_monnam } from './do_name.js'; // relocate-fns
import { expels_gu } from './mhitu.js'; // relocate-fns
import { ROCK_CLASS } from './mklev.js'; // relocate-fns
import { wake_nearby, wake_nearto } from './mon.js'; // relocate-fns
import { resists_blnd } from './mondata.js'; // relocate-fns
import { Tobjnam as _objnam_Tobjnam, an, the } from './objnam.js';
import { is_quest_artifact } from './questpgr.js'; // relocate-fns
import { You, You_feel, You_see, Norep as _Norep } from './pline.js'; // relocate-fns
import { make_confused, make_hallucinated, make_stunned } from './potion.js'; // relocate-fns
import './read.js'; // relocate-fns
import { visible_region_at } from './region.js'; // relocate-fns
import { rn2, rnd, rnl } from './rnd.js'; // relocate-fns
import { SYM_OFFSETS } from './symbols.js'; // relocate-fns
import { CLR_BLACK, CLR_WHITE } from './terminal.js'; // relocate-fns
import { activate_statue_trap, openfallingtrap, openholdingtrap } from './trap.js'; // relocate-fns
import { cansee, do_clear_area_async } from './vision.js'; // relocate-fns
import { BlindedTimeout, make_blinded } from './zap.js'; // relocate-fns
import { MCORPSENM, M_AP_OBJECT, NON_PM } from './const.js'; // relocate-fns
import { cls, unmap_object } from './display.js'; // relocate-fns
import { def_oc_syms_chars } from './drawing.js'; // relocate-fns
import { findgold } from './steal.js'; // relocate-fns
import { MKOBJ_OC_CLASS } from './mkobj_data.js'; // relocate-fns
import { SchroedingersBox } from './pickup_container.js'; // relocate-fns
import { PM_LONG_WORM, PM_TENGU } from './pm.generated.js'; // relocate-fns
import { COIN_CLASS, POTION_CLASS, SPBOOK_CLASS, _detect_monsters_uprop, _hallucination, strange_feeling } from './potion.js'; // relocate-fns
import { body_part as food_body_part } from './cmd.js'; // relocate-fns
import { ARTICLE_THE as ARTICLE_THE_GD, ARTICLE_YOUR as ARTICLE_YOUR_GD, D_TRAPPED as D_TRAPPED_RD, FOOT as FOOT_GD, NOSE, ROOMOFFSET, SUPPRESS_SADDLE as SUPPRESS_SADDLE_GD, TOE as TOE_RD, otrapped_of } from './const.js'; // relocate-fns
import { map_engraving } from './display.js'; // relocate-fns
import { x_monnam as x_monnam_gd } from './do_name.js'; // relocate-fns
import { room_discovered } from './dungeon.js'; // relocate-fns
import { engr_at } from './engrave.js'; // relocate-fns
import { money_cnt as money_cnt_gd } from './hack.js'; // relocate-fns
import { findgold as findgold_gd } from './steal.js'; // relocate-fns
import { s_suffix } from './mhitm.js'; // relocate-fns
import { MKOBJ_OC_MATERIAL as MKOBJ_OC_MATERIAL_GD } from './mkobj_erosion_meta.js'; // relocate-fns
import { makeplural } from './objnam.js'; // relocate-fns
import { Your } from './pline.js'; // relocate-fns
import { PM_GOLD_GOLEM as PM_GOLD_GOLEM_GD } from './pm.generated.js'; // relocate-fns
import { COIN_CLASS_GD, GOLD_MAT_GD, GOLD_PIECE_GD, _Confusion, _sense_trap, _strange_feeling } from './read.js'; // relocate-fns
import { currency as currency_gd } from './shk.js'; // relocate-fns
import { hidden_gold as hidden_gold_gd } from './vault.js'; // relocate-fns

/* glyph_is_monster() excludes warning glyphs (a Warning digit is stored with
 * cls MON plus disp_is_warning here). */
const _isMonGlyph = (loc) => loc?.disp_cls === GLYPHCLS_MON && !loc.disp_is_warning;
const _isInvisibleGlyph = (loc) => loc?.disp_cls === GLYPHCLS_INVIS;
/* JS has no numeric gbuf glyph; this is the full rendered identity available
 * here (the shared cmd.js _glyph_ident additionally canonicalizes cmap IDs). */
const _coversObjects = (loc, u, x, y) => {
    const typ = loc?.typ | 0;
    const pool = typ === POOL || typ === MOAT || typ === WATER || is_moat(x, y);
    return (pool && !u.uinwater) || typ === LAVAPOOL || typ === LAVAWALL;
};
const _topObject = (g, x, y) => g.level?.levelObjects?.[x]?.[y] || null;

const FOUND_FLASH_COUNT = 6; /* C detect.c:19 */
const OTRAP_NONE = 0;        /* C detect.c:899 */
const OTRAP_HERE = 1;        /* C detect.c:900 */
const OTRAP_THERE = 2;       /* C detect.c:901 */
const LARGE_BOX = 214;       /* onames.h */
const CHEST = 215;           /* onames.h */
const Is_box_detect = (o) => o && (((o.otyp | 0) === LARGE_BOX) || ((o.otyp | 0) === CHEST));
const S_vcdoor = 15;         /* defsym.h */
const S_hcdoor = 16;         /* defsym.h */
const S_corr = 22;           /* defsym.h */
const S_EEL = 57;            /* monsym.h */
const M1_HIDE = 0x100;       /* mondata.h */
const M1_CONCEAL = 0x80;     /* mondata.h */
const is_hider = (ptr) => (((ptr?.mflags1 | 0) & M1_HIDE) !== 0);
const hides_under = (ptr) => (((ptr?.mflags1 | 0) & M1_CONCEAL) !== 0);

function _unconstrainMap(u) {
    const saved = { uinwater: u.uinwater | 0, uburied: u.uburied | 0,
                    uswallow: u.uswallow | 0 };
    u.uinwater = 0; u.uburied = 0; u.uswallow = 0;
    return saved;
}

function _reconstrainMap(u, saved) {
    u.uinwater = saved.uinwater;
    u.uburied = saved.uburied;
    u.uswallow = saved.uswallow;
}

/* C detect.c:1609-1635 foundone(). The port carries glyph families rather
 * than numeric glyphs; traps and engravings are also C cmap glyphs. The
 * FOUND_FLASH_COUNT == 0 alternative is not enabled in the target build. */
export function foundone(zx, zy, glyphClass) {
    if (glyphClass === GLYPHCLS_CMAP || glyphClass === GLYPHCLS_TRAP
        || glyphClass === GLYPHCLS_ENGR || glyphClass === 'unexplored')
        game.level.at(zx, zy).seenv = SVALL;

    const row = game.viz_array[zy];
    const save_viz = row[zx];
    if (!Blind()) row[zx] = COULD_SEE | IN_SIGHT;
    try {
        newsym(zx, zy);
    } finally {
        row[zx] = save_viz;
    }
}

/* C detect.c:1449 do_vicinity_map().  `sobj` is the fake spellbook for a
 * cast, or null for timed clairvoyance. */
export async function do_vicinity_map(sobj) {
    const g = game, u = g.u || {};
    const clair = u.uprops?.[CLAIRVOYANT];
    const extended = !!(sobj && (sobj.blessed
        || ((clair?.intrinsic | 0) || (clair?.extrinsic | 0)) && !(clair?.blocked | 0)));
    const randomFarsight = !sobj;
    const loY = Math.max(0, (u.uy | 0) - 5), hiY = Math.min(ROWNO - 1, (u.uy | 0) + 6);
    const loX = Math.max(1, (u.ux | 0) - 9), hiX = Math.min(COLNO - 1, (u.ux | 0) + 10);
    if (typeof process !== 'undefined' && ENV?.FF_VISION_TRACE === '1')
        pushRngLogEntry(`^vision_vicinity[entry=1 moves=${g.moves | 0} incomingMove=${g.context?.move ? 1 : 0} loX=${loX} hiX=${hiX} loY=${loY} hiY=${hiY} random=${randomFarsight ? 1 : 0} active=${extended ? 1 : 0}]`);
    const savedViz = g.viz_array?.[u.uy]?.[u.ux];
    u.uprops = u.uprops || {};
    const detectProp = u.uprops[DETECT_MONSTERS]
        || (u.uprops[DETECT_MONSTERS] = { intrinsic: 0, extrinsic: 0, blocked: 0 });
    const savedDetect = detectProp?.extrinsic | 0;
    const saved = _unconstrainMap(u);
    let mdetected = false, odetected = false, refresh = false;
    if (saved.uswallow && g.viz_array?.[u.uy])
        g.viz_array[u.uy][u.ux] = (savedViz | 0) | IN_SIGHT;
    if (detectProp) detectProp.extrinsic = savedDetect | I_SPECIAL;
    try {
        for (let x = loX; x <= hiX; x++) for (let y = loY; y <= hiY; y++) {
            const loc = g.level?.at(x, y);
            if (!loc) continue;
            const oldIsMon = _isMonGlyph(loc), oldIdentity = _glyph_ident(x, y);
            const confused = !!(u.uprops?.[CONFUSION]?.intrinsic | 0);
            show_map_spot(loc, x, y, confused);
            const obj = _topObject(g, x, y);
            if (obj) {
                if (extended) observe_object(obj);
                map_object(obj, true);
                if (_glyph_ident(x, y) !== oldIdentity && _coversObjects(loc, u, x, y)) odetected = true;
            }
            const mon = m_at(x, y);
            if (mon && (mon.mx | 0) === x && (mon.my | 0) === y) {
                if ((saved.uinwater || saved.uburied || saved.uswallow
                     || !g.level?.flags?.hero_memory) && !extended
                    && (x !== u.ux || y !== u.uy) && !oldIsMon)
                    map_invisible(x, y);
                else map_monst(mon, false);
                if (extended && _glyph_ident(x, y) !== oldIdentity && !_isInvisibleGlyph(loc)) mdetected = true;
            }
        }
        if (randomFarsight && g.flags?.quick_farsight) mdetected = odetected = false;
        const unconstrained = !!(saved.uinwater || saved.uburied || saved.uswallow);
        if (!g.level?.flags?.hero_memory || unconstrained || mdetected || odetected) {
            await flush_screen(1);
            await pline('You sense your surroundings.');
            let terrain = TER_DETECT | TER_MAP | TER_TRP | TER_OBJ;
            if (extended || _isMonGlyph(g.level?.at(u.ux, u.uy))) terrain |= TER_MON;
            await browse_map(terrain, 'anything of interest');
            refresh = true;
        }
    } finally {
        _reconstrainMap(u, saved);
        if (detectProp) detectProp.extrinsic = savedDetect;
        if (g.viz_array?.[u.uy]) g.viz_array[u.uy][u.ux] = savedViz;
    }
    /* docrt() -> cls() pages the standing "Done." of browse_map's getpos
     * (getpos.c:1136; wintty.c:1874).  C's see_monsters() below only updates
     * the glyph buffer, which tty flushes after that --More--, so the page
     * shows the browse screen; this port paints at once, so page first. */
    if (refresh && game._pending_message)
        await force_more(game._pending_message);
    for (let x = loX; x <= hiX; x++) for (let y = loY; y <= hiY; y++) {
        if (x === u.ux && y === u.uy) continue;
        const loc = g.level?.at(x, y), mon = m_at(x, y);
        /* C: glyph_to_mon(glyph_at(zx, zy)) — the species DISPLAYED (a random
         * one under Hallucination), not the occupant's own */
        const mndx = loc?.disp_mon_pm ?? mon?.mndx ?? mon?.mnum ?? mon?.data?.pmidx;
        if (loc && _isMonGlyph(loc) && (mndx | 0) !== PM_LONG_WORM_TAIL
            && (!mon || !canspotmon(mon))) map_invisible(x, y);
    }
    see_monsters();
    game._seerMapSeq = (game._seerMapSeq | 0) + 1;
    if (refresh) {
        game._topl_sticky = null;
        await docrt();
        game._pending_message = '';
    }
}

/* PM_LONG_WORM = 114 (js/pm.generated.js:120); map_monst's showtail arm. */
const PM_LONG_WORM_DISP = 114;

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

/* ---------------------------------------------------------------------------
 * findone — find/reveal every "something" at one location (detect.c:1640).
 * C ref: nethack-c/src/detect.c:1640-1727 findone(zx, zy, whatfound).
 *
 * This is the do_clear_area() callback used by findit().  It reveals and counts
 * secret doors (SDOOR→DOOR), secret corridors (SCORR→CORR), unseen traps,
 * trapped closed doors, and hidden / not-currently-spottable monsters.  It
 * draws core RNG when sense_trap hallucinates an object. Discovery flashes
 * use FOUND_FLASH_COUNT=6; monster glyphs draw from the display RNG. */
/* C detect.c:906-953 detect_obj_traps(), findone() call only (ft set,
 * show_them, how 0), including sense_trap's Hallucination arm.
 * Returns result bits: OTRAP_NONE, OTRAP_HERE, OTRAP_THERE. */
function detect_obj_traps(objlist, ft, show_them = true, how = 0) {
    let result = OTRAP_NONE;
    const trapglyph = trap_to_glyph({ ttyp: TRAPPED_CHEST });
    for (let otmp = objlist; otmp; otmp = otmp.nobj) {
        const xp = { value: 0 }, yp = { value: 0 };
        const box = Is_box_detect(otmp);
        if ((box && otmp.otrapped) || Has_contents(otmp)) {
            if (!get_obj_location(otmp, xp, yp, BURIED_TOO | CONTAINED_TOO)
                || !isok(xp.value, yp.value)
                || (ft && (xp.value !== ft.x || yp.value !== ft.y)))
                continue;
        }
        if (box && otmp.otrapped) {
            otmp.tknown = 1;
            observe_object(otmp);
            result |= u_at(xp.value, yp.value) ? OTRAP_HERE : OTRAP_THERE;
            if (ft) {
                flash_glyph_at(xp.value, yp.value, trapglyph, FOUND_FLASH_COUNT);
            }
            if (show_them) {
                sense_trap({ tx: xp.value, ty: yp.value, ttyp: TRAPPED_CHEST, tseen: 1 }, xp.value, yp.value, how);
            }
            if (ft) {
                foundone(xp.value, yp.value, GLYPHCLS_TRAP);
                ft.num_traps++;
            }
        }
        if (Has_contents(otmp))
            result |= detect_obj_traps(otmp.cobj, ft, show_them, how);
    }
    return result;
}

function findone(zx, zy, found) {
    found.x = zx; found.y = zy; /* ft_cc, detect.c:1648 */
    const lev = game.level?.at(zx, zy);
    if (!lev) return;
    let mtmp = m_at(zx, zy);
    const ttmp = t_at(zx, zy);
    /* C detect.c:1648: drop dead monsters / dormant guards. */
    if (mtmp && (DEADMONSTER(mtmp) || (mtmp.isgd && !mtmp.mx)))
        mtmp = null;

    if (lev.typ === SDOOR) {
        flash_glyph_at(zx, zy, cmap_glyph(lev.horizontal ? S_hcdoor : S_vcdoor), FOUND_FLASH_COUNT);
        /* C detect.c:1657-1662: cvt_sdoor_to_door → typ=DOOR; reveal. */
        cvt_sdoor_to_door(lev);
        recalc_block_point(zx, zy);
        /* C detect.c:1663-1666: magic_map_background(zx, zy, 0) — the door glyph
         * becomes the remembered glyph, so an unseen door is painted. */
        magic_map_background(lev, zx, zy);
        /* C detect.c:1610-1624 foundone(): cmap glyph => seenv = SVALL, newsym
         * with temporary visibility, then the incoming bitmap returns. */
        lev.seenv = SVALL;
        const row = game.viz_array?.[zy];
        const saved = row?.[zx];
        if (row && !Blind()) row[zx] = COULD_SEE | IN_SIGHT;
        try {
            newsym(zx, zy);
        } finally {
            if (row) row[zx] = saved;
        }
        found.num_sdoors++;
    } else if (lev.typ === SCORR) {
        flash_glyph_at(zx, zy, cmap_glyph(S_corr), FOUND_FLASH_COUNT);
        /* C detect.c:1663-1670: magic_map_background, then foundone. */
        lev.typ = CORR;
        unblock_point(zx, zy);
        /* C detect.c:1664: retain magic mapping's glyph identity and memory rules. */
        magic_map_background(lev, zx, zy);
        /* C detect.c:1610-1624: the discovered cmap has all faces seen;
         * newsym gets temporary visibility, then the incoming bitmap returns. */
        lev.seenv = SVALL;
        const row = game.viz_array?.[zy];
        const saved = row?.[zx];
        if (row && !Blind()) row[zx] = COULD_SEE | IN_SIGHT;
        try {
            newsym(zx, zy);
        } finally {
            if (row) row[zx] = saved;
        }
        found.num_scorrs++;
    }

    /* C detect.c:1672-1679: an unseen, non-statue trap is revealed. */
    if (ttmp && !ttmp.tseen && (ttmp.ttyp | 0) !== STATUE_TRAP) {
        flash_glyph_at(zx, zy, trap_to_glyph(ttmp), FOUND_FLASH_COUNT);
        ttmp.tseen = 1;
        sense_trap(ttmp, zx, zy, 0);
        foundone(zx, zy, GLYPHCLS_TRAP);
        found.num_traps++;
    }
    /* C detect.c:1680-1687: a trapped CLOSED/LOCKED door counts as a trap. */
    if (lev.typ === DOOR
        && (lev.doormask & (D_CLOSED | D_LOCKED))
        && (lev.doormask & D_TRAPPED)) {
        flash_glyph_at(zx, zy, trap_to_glyph({ ttyp: TRAPPED_DOOR }), FOUND_FLASH_COUNT);
        sense_trap({ tx: zx, ty: zy, ttyp: TRAPPED_DOOR, tseen: 1 }, zx, zy, 0);
        foundone(zx, zy, GLYPHCLS_TRAP);
        found.num_traps++;
    }

    /* C detect.c:1687-1693: trapped chests. */
    detect_obj_traps(game.level?.buriedobjlist, found);
    detect_obj_traps(game.fobj, found);
    if (mtmp) detect_obj_traps(mtmp.minvent, found);
    if (u_at(zx, zy)) detect_obj_traps(game.invent, found);

    /* C detect.c:1695-1721: hidden / unspottable monster. */
    if (mtmp && (!canspotmon(mtmp) || mtmp.mundetected || mtmp.m_ap_type)) {
        if (mtmp.m_ap_type) {
            flash_glyph_at(zx, zy, mon_to_glyph(mtmp), FOUND_FLASH_COUNT);
            seemimic(mtmp); /* detect.c:1699: also unblocks a boulder-mimic's vision */
            found.num_mons++;
        } else if (mtmp.mundetected
                   && (is_hider(mtmp.data) || hides_under(mtmp.data) || mtmp.data?.mlet === S_EEL)) {
            flash_glyph_at(zx, zy, mon_to_glyph(mtmp), FOUND_FLASH_COUNT);
            mtmp.mundetected = 0;
            newsym(zx, zy);
            found.num_mons++;
        }
        /* C5 detect.c:1712-1720 tests the remembered glyph, not the screen. */
        if (lev.remembered_glyph?.cls !== GLYPHCLS_INVIS) {
            if (!canspotmon(mtmp)) {
                flash_glyph_at(zx, zy, { ch: 'I', color: NO_COLOR, cls: GLYPHCLS_INVIS }, FOUND_FLASH_COUNT);
                map_invisible(zx, zy);
                found.num_invis++;
            }
        } else {
            found.num_kept_invis++;
        }
    } else if (unmap_invisible(zx, zy)) {
        flash_glyph_at(zx, zy, { ch: 'I', color: NO_COLOR, cls: GLYPHCLS_INVIS }, FOUND_FLASH_COUNT);
        found.num_cleared_invis++;
    }
}

/* ---------------------------------------------------------------------------
 * findit — reveal secret doors/corridors/traps/hidden monsters around the hero.
 * C ref: nethack-c/src/detect.c:1793-1893 findit(void)
 *
 * findit() consumes RNG for hallucinated traps through do_clear_area(findone)'s
 * map scan within BOLT_LIM that counts and reveals secret features, then plines
 * the result.  Returns the number of things found.  The exact reveal text is
 * built from the do_clear_area counts exactly as C does — never scraped.
 * ---------------------------------------------------------------------------
 */
export async function findit() {
    const g = game;
    if (g.u?.uswallow) return 0;

    const found = {
        num_sdoors: 0, num_scorrs: 0, num_traps: 0,
        num_mons: 0, num_invis: 0, num_cleared_invis: 0, num_kept_invis: 0,
    };
    /* C detect.c:1816: do_clear_area(u.ux, u.uy, BOLT_LIM, findone, &found). */
    do_clear_area(g.u.ux | 0, g.u.uy | 0, BOLT_LIM,
                  findone, found, true);

    /* C detect.c:1819-1822: k = count of distinct categories present (0..4). */
    const k = (found.num_sdoors ? 1 : 0) + (found.num_scorrs ? 1 : 0)
            + (found.num_traps ? 1 : 0) + (found.num_mons ? 1 : 0);

    let num = 0;
    let buf = '';
    /* C detect.c:1824-1833: secret doors. */
    if (found.num_sdoors) {
        buf += (found.num_sdoors > 1)
            ? `${found.num_sdoors} secret doors` : 'a secret door';
        num += found.num_sdoors;
    }
    /* C detect.c:1835-1844: secret corridors. */
    if (found.num_scorrs) {
        if (buf) buf += (k === 2) ? ' and ' : ', ';
        buf += (found.num_scorrs > 1)
            ? `${found.num_scorrs} secret corridors` : 'a secret corridor';
        num += found.num_scorrs;
    }
    /* C detect.c:1845-1855: traps. */
    if (found.num_traps) {
        if (buf) buf += (k === 3 && !found.num_mons) ? ', and '
                      : (k === 2) ? ' and ' : ', ';
        buf += (found.num_traps > 1)
            ? `${found.num_traps} traps` : 'a trap';
        num += found.num_traps;
    }
    /* C detect.c:1862-1871: hidden monsters. */
    if (found.num_mons) {
        if (buf) buf += (k > 2) ? ', and ' : ' and ';
        buf += (found.num_mons > 1)
            ? `${found.num_mons} hidden monsters` : 'a hidden monster';
        num += found.num_mons;
    }
    if (buf) {
        /* C detect.c:1865: You("reveal %s!", buf). */
        pushRngLogEntry('>pline @ findit(detect.c:1865)');
        await pline(`You reveal ${buf}!`);
    }

    /* C5 detect.c:1867-1885: kept markers qualify wording, not the return. */
    if (found.num_invis) {
        const unseen = found.num_invis > 1
            ? `${found.num_invis}${found.num_kept_invis ? ' other' : ''} unseen monsters`
            : `${found.num_kept_invis ? 'another' : 'an'} unseen monster`;
        await pline(`You detect ${unseen}!`);
        num += found.num_invis;
    }
    if (found.num_cleared_invis) {
        if (!num) {
            /* C pline.c:387-400 You_feel uses the actual Unaware predicate. */
            const feel = Unaware() ? 'You dream that you feel ' : 'You feel ';
            await pline(`${feel}${found.num_kept_invis ? 'somewhat ' : ''}less paranoid.`);
        }
        num += found.num_cleared_invis;
    }

    /* C detect.c:1888: if (!num) You("don't find anything."). */
    if (!num) {
        pushRngLogEntry('>findit @ js/detect.js (detect.c:1888)');
        await pline("You don't find anything.");
    }
    return num;
}

/* C ref: detect.c:2122-2129 skip_premap_detect() — "skip premap detection of
 * areas outside Sokoban map": undiggable/unpassable STONE is the frame Sokoban
 * solidifies around its map, and C leaves it unmapped. */
function skip_premap_detect(loc) {
    return (loc.typ === STONE)
        && ((loc.wall_info | 0) & (W_NONDIGGABLE | W_NONPASSWALL)) !== 0;
}

/* C ref: detect.c:2131-2159 premap_detect() — pre-map a level whose .lua set
 * `premapped` (des.level_flags("premapped"), i.e. every Sokoban level).  Marks
 * the whole grid seen+waslit, paints the terrain and any boulder into the
 * hero's map memory, and reveals every trap.  Consumes NO RNG. */
export function premap_detect() {
    /* C 2140-2151: map the background and boulders */
    for (let x = 1; x < COLNO; x++) {
        for (let y = 0; y < ROWNO; y++) {
            const loc = game.level?.at(x, y);
            if (!loc || skip_premap_detect(loc))
                continue;
            loc.seenv = SVALL;
            loc.waslit = true;
            /* C 2147-2148: an SDOOR loses its wall_info here — see rm.h */
            if (loc.typ === SDOOR)
                loc.wall_info = 0;
            map_background(x, y, 1);
            const obj = sobj_at(BOULDER, x, y);
            if (obj)
                map_object(obj, 1);
        }
    }
    /* C 2154-2157: map the traps */
    for (let ttmp = game.ftrap; ttmp; ttmp = ttmp.ntrap) {
        ttmp.tseen = 1;
        map_trap(ttmp, 1);
    }
}

/* C ref: detect.c:1589-1604 cvt_sdoor_to_door(lev) — a secret door becomes a
 * real door.  RNG-free. */
export function cvt_sdoor_to_door(lev) {
    let newmask = (lev.doormask | 0) & ~WM_MASK;

    if (Is_rogue_level(game.u?.uz)) {
        /* rogue didn't have doors, only doorways */
        newmask = D_NODOOR;
    } else {
        /* newly exposed door is closed */
        if (!(newmask & D_LOCKED))
            newmask |= D_CLOSED;
    }
    lev.typ = DOOR;
    lev.doormask = newmask;
    lev.arboreal_sdoor = 0; /* clears 'candig' */
}

/* Copy of a level location with some fields overridden.  Object spread drops
 * the location class prototype (accessors such as doormask), which made
 * back_to_glyph render every closed door as a doorway. */
function _loc_with(loc, over) {
    return Object.assign(Object.create(Object.getPrototypeOf(loc)), loc, over);
}

function reveal_terrain_getglyph(x, y, which_subset, swallowed = false) {
    const loc = game.level?.at(x, y);
    if (!loc) return null;
    const keep_traps = (which_subset & TER_TRP) !== 0,
          keep_objs = (which_subset & TER_OBJ) !== 0,
          keep_mons = (which_subset & TER_MON) !== 0,
          full = (which_subset & TER_FULL) !== 0;
    /* C: seenv = (full || hero_memory) ? levl[x][y].seenv : cansee ? SVALL : 0 */
    const hero_memory = !!game.level?.flags?.hero_memory;
    const seenv = (full || hero_memory) ? (loc.seenv | 0) : cansee(x, y) ? 0xff : 0;
    let glyph;
    if (full) {
        /* C detect.c:2196-2200 — force seenv to SVALL and take the raw
         * terrain, i.e. the whole level regardless of what has been seen. */
        /* No early return: C falls through to the detect.c:2282-2286 hack
         * below, so a full-map lit corridor is drawn as S_corr too. */
        const tg = terrain_glyph(_loc_with(loc, { seenv: 0xff }), x, y);
        glyph = { ch: tg.ch, color: tg.color, decgfx: tg.dec, cls: GLYPHCLS_CMAP, cmap: tg.cmap };
    } else {
    /* C detect.c:2204-2211 — levl_glyph is hero memory, glyph is the display
     * buffer.  A cell with nothing painted is C's GLYPH_UNEXPLORED (blank). */
    /* print_glyph re-derives the MG_BW_ENGR inverse from the remembered flag. */
    const reg = visible_region_at(x, y); // C detect.c:2203
    /* C detect.c:2202-2203 levl_glyph = hero_memory ? levl.glyph
     * : seenv ? back_to_glyph : default_glyph (Plane of Air/Water). */
    const levl_glyph = !hero_memory
        ? (() => {
            // C detect.c:2202-2204: unseen cells without hero memory use
            // default_glyph (S_stone, or S_tree on an arboreal level).
            // Preserve its identity even though S_stone paints a blank.
            const tg = terrain_glyph(_loc_with(loc, {
                typ: seenv ? loc.typ : (game.level?.flags?.arboreal ? TREE : STONE), seenv: 0xff,
            }), x, y);
            return { ch: tg.ch, color: tg.color, decgfx: tg.dec,
                     cls: GLYPHCLS_CMAP, cmap: tg.cmap };
        })()
        : loc.remembered_glyph
        ? { ...loc.remembered_glyph,
            attr: (loc.remembered_glyph.bwengr && game.iflags?.wc_inverse !== false) ? 1
                : loc.remembered_glyph.objpile ? objpile_attr(true) /* MG_OBJPILE, paint-time hilite_pile */
                : (loc.remembered_glyph.attr | 0) }
        : null;
    /* C detect.c:2204 `glyph = !swallowed ? glyph_at(x, y) : levl_glyph` — a
     * swallowed hero (fog cloud, engulfer) has no display buffer to read, so
     * the remembered glyph stands in for it. */
    glyph = swallowed ? levl_glyph
        : (loc.disp_ch && (loc.disp_ch !== ' ' || loc.disp_cls === GLYPHCLS_MON))
        ? { ch: loc.disp_glyph_ch ?? loc.disp_ch, color: loc.disp_glyph_color ?? loc.disp_color,
            decgfx: loc.disp_glyph_decgfx ?? !!loc.disp_decgfx,
            attr: loc.disp_attr | 0, cls: loc.disp_cls || GLYPHCLS_CMAP,
            /* C's glyph_at() is the full glyph number: keep the object identity
             * so a repaint (and lookat() on it) still knows the otyp. */
            otyp: loc.disp_obj_otyp, corpsenm: loc.disp_obj_corpsenm,
            objpile: loc.disp_obj_pile,
            otyp: loc.disp_obj_otyp, corpsenm: loc.disp_obj_corpsenm,
            objpile: !!loc.disp_obj_pile, ttyp: loc.disp_trap_type,
            /* glyph_is_gascloud() needs the cmap identity (S_cloud) of a
             * displayed cloud cell whose producer left disp_cmap unset. */
            cmap: loc.disp_cmap ?? (loc.disp_cls === GLYPHCLS_CMAP ? glyph_cmap_at(x, y) : undefined) }
        : null;
    if (!glyph && !swallowed && loc.disp_ch === ' ' && loc.disp_cls !== GLYPHCLS_MON
        && loc.typ === ROOM && levl_glyph && levl_glyph.ch === ' '
        && levl_glyph.color === CLR_BLACK) {
        const tg = terrain_glyph(loc, x, y);
        return { ch: tg.ch, color: NO_COLOR, decgfx: tg.dec, cls: GLYPHCLS_CMAP };
    }
    /* C detect.c:2204 — glyph_at() returns the display glyph itself, so a
     * terrain glyph kept as-is (an engraved corridor, S_engrcorr) still carries
     * the MG_BW_ENGR flag that wintty.c:3930 paints ATR_INVERSE.  The attribute
     * rides with the glyph; the terrain fallbacks below build fresh glyphs and
     * correctly carry none. */
    if (!swallowed && glyph && (glyph.cls === GLYPHCLS_CMAP || glyph.cls === GLYPHCLS_ENGR))
        glyph.attr = loc.disp_attr | 0;
    let was_mon = false;
    /* C detect.c:2213-2218 — drop monsters (and the hero) back to memory. */
    if (glyph && ((!keep_mons && (glyph.cls === GLYPHCLS_MON
                                 || glyph.cls === GLYPHCLS_WARNING))
                  || glyph.cls === GLYPHCLS_SWALLOW)) {
        glyph = levl_glyph;
        was_mon = true;
    }
    /* C detect.c:2221-2227 — when traps are kept but objects are not, an object
     * (or the invisible-monster marker) that is hiding a seen trap is replaced
     * by the trap rather than by the terrain. */
    /* C display.h:218-222 covers_traps(x,y) == covers_objects(x,y) ==
     * ((is_pool(x,y) && !Underwater) || typ == LAVAPOOL || typ == LAVAWALL). */
    const _covers = ((loc.typ === POOL || loc.typ === MOAT || loc.typ === WATER
                      || (loc.typ === DRAWBRIDGE_UP && is_pool(x, y))) && !game.u?.uinwater)
                 || loc.typ === LAVAPOOL || loc.typ === LAVAWALL;
    if (glyph && ((!keep_objs && glyph.cls === GLYPHCLS_OBJ)
                  || glyph.cls === GLYPHCLS_INVIS)
        && keep_traps && !_covers) {
        const t = t_at(x, y);
        if (t && (t.tseen | 0)) {
            const tg = trap_glyph_entry(t.ttyp);
            if (tg) glyph = { ch: tg.ch, color: tg.color, decgfx: false,
                              cls: GLYPHCLS_TRAP, ttyp: t.ttyp };
        }
    }
    /* C detect.c:2225-2280 — the cases that fall back to bare terrain.
     * A removed monster whose remembered glyph is GLYPH_UNEXPLORED (null
     * here) keeps that glyph; it does not satisfy any of C's tests below. */
    if ((glyph && !keep_objs && glyph.cls === GLYPHCLS_OBJ)
        || (!keep_traps && (glyph?.cls === GLYPHCLS_TRAP
                           || (reg && glyph_is_gascloud(glyph))))
        || (reg && was_mon)
        || (glyph && glyph.cls === GLYPHCLS_INVIS)) {
        if (!seenv) {
            if (!reg && game.level?.flags?.arboreal) {
                /* C reveal_terrain builds default_glyph from S_tree on an
                 * arboreal level. Reuse the canonical terrain renderer with
                 * the tree terrain substituted for this unseen cell. */
                const tg = terrain_glyph(_loc_with(loc, { typ: TREE }), x, y);
                glyph = { ch: tg.ch, color: tg.color, decgfx: tg.dec,
                          cls: GLYPHCLS_CMAP };
            } else {
                /* default_glyph == cmap_to_glyph(S_stone): a real cmap glyph,
                 * unlike the GLYPH_UNEXPLORED a never-painted cell keeps. */
                glyph = { ch: ' ', color: NO_COLOR, decgfx: false,
                          cls: reg ? GLYPHCLS_UNEXPLORED : GLYPHCLS_CMAP, ...(!reg && { cmap: 0 }) };
            }
        } else if (keep_traps && reg && (glyph_is_gascloud(glyph) || was_mon)) {
            // C detect.c:2243-2251: a seen trap takes precedence over the region.
            const t = t_at(x, y), tg = t?.tseen ? trap_glyph_entry(t.ttyp) : null;
            glyph = tg ? { ch: tg.ch, color: tg.color, decgfx: false, cls: GLYPHCLS_TRAP, ttyp: t.ttyp }
                       : region_glyph(reg);
        } else if ((loc.lastseentyp | 0) === (loc.typ | 0)) {
            const tg = terrain_glyph(loc, x, y);
            glyph = { ch: tg.ch, color: tg.color, decgfx: tg.dec,
                      cls: GLYPHCLS_CMAP, cmap: tg.cmap };
        } else {
            /* C detect.c:2252-2278 — rebuild the cell from svl.lastseentyp
             * (a remembered 'I' over a corridor the hero only felt, say, has
             * lastseentyp STONE and typ CORR).  A mimic posing as furniture
             * (M_AP_FURNITURE) shows its mappearance instead. */
            const mon = m_at(x, y);
            if (mon && M_AP_TYPE(mon) === M_AP_FURNITURE) {
                glyph = cmap_glyph(mon.mappearance);
            } else {
                const saved = { typ: loc.typ, wall_info: loc.wall_info };
                let tg;
                try {
                    loc.typ = loc.lastseentyp | 0;
                    if (IS_WALL(loc.typ) || loc.typ === SDOOR) xy_set_wall_state(x, y);
                    tg = terrain_glyph(loc, x, y);
                } finally {
                    Object.assign(loc, saved);
                }
                glyph = { ch: tg.ch, color: tg.color, decgfx: tg.dec,
                          cls: GLYPHCLS_CMAP, cmap: tg.cmap };
            }
        }
    }
    } /* !full */
    if (glyph) {
        const isRoomFloor = (glyph.ch === '.' && !glyph.decgfx)
                         || (glyph.ch === '~' && glyph.decgfx);
        const S_room = 19, S_darkroom = 20, S_corr = 22, S_litcorr = 23;
        // C detect.c:2282-2284 tests glyph identity even when S_darkroom
        // paints blank (!dark_room), including memory revealed under a monster.
        if (glyph.cls === GLYPHCLS_CMAP && glyph.cmap === S_darkroom)
            glyph = cmap_glyph(S_room); // S_darkroom -> S_room
        else if (glyph.cls === GLYPHCLS_CMAP && glyph.cmap === S_litcorr)
            glyph = cmap_glyph(S_corr); // S_litcorr -> S_corr, by identity (symset-independent)
        else if (isRoomFloor && glyph.color === CLR_BLACK)
            glyph = { ...glyph, color: NO_COLOR, ...(glyph.cmap != null && { cmap: S_room }) };
        else if (glyph.ch === '#' && !glyph.decgfx && glyph.color === CLR_WHITE)
            glyph = { ...glyph, color: NO_COLOR, ...(glyph.cmap != null && { cmap: S_corr }) };
    }
    return glyph;
}

/* C detect.c:106 browse_map(ter_typ, ter_explain) — "use getpos()'s
 * 'autodescribe' to view whatever is currently shown on map".
 *
 * iflags.autodescribe is forced on for the duration and restored after.  That
 * save/restore used to be a no-op here because getpos() latched autodescribe to
 * a literal true; now that the '#' key (NHKF_GETPOS_AUTODESC) really toggles the
 * option, a hero who had turned autodescribe OFF and then ran #terrain would
 * have had it silently turned back on for good without it.  iflags.terrainmode
 * is set and cleared the same way — getpos reads nothing from it, but do_look's
 * terrain arms do. */
export async function browse_map(ter_typ, ter_explain) {
    const g = game, u = g.u || {};
    const dummy_pos = { x: u.ux | 0, y: u.uy | 0 };
    g.iflags = g.iflags || {};
    const save_autodescribe = g.iflags.autodescribe;
    g.iflags.autodescribe = true;
    g.iflags.terrainmode = ter_typ;
    await getpos(dummy_pos, false, ter_explain);
    g.iflags.terrainmode = 0;
    g.iflags.autodescribe = save_autodescribe;
}

export async function reveal_terrain(which_subset) {
    const g = game;
    const full = (which_subset & TER_FULL) !== 0;
    /* C detect.c:2362-2364: check impairment before changing the map.
     * C youprop.h:120: a hallucination timeout is suppressed by resistance;
     * Stunned and Confusion test their intrinsic words only. */
    if ((_cmd_Hallucination() || _hprop(STUNNED) || _hprop(CONFUSION)) && !full) {
        await You('are too disoriented for this.');
        return;
    }
    const keep_traps = (which_subset & TER_TRP) !== 0,
          keep_objs = (which_subset & TER_OBJ) !== 0,
          keep_mons = (which_subset & TER_MON) !== 0;
    /* C detect.c:2372 `unsigned swallowed = u.uswallow;` is read BEFORE
     * unconstrain_map(), and detect.c:2375 then does `if (unconstrain_map())
     * docrt();` (detect.c:70-82). */
    const swallowed = !!game.u?.uswallow;
    const _uc = { uinwater: game.u?.uinwater, uburied: game.u?.uburied,
                  uswallow: game.u?.uswallow };
    const unconstrained = !!(_uc.uinwater || _uc.uburied || _uc.uswallow);
    if (unconstrained) {
        game.u.uinwater = 0;
        game.u.uburied = 0;
        game.u.uswallow = 0;
        await docrt();
    }
    for (let x = 1; x < COLNO; x++) {
        for (let y = 0; y < ROWNO; y++) {
            const _loc = game.level?.at(x, y);
            /* C detect.c:2204 glyph_at() — a cell nothing was ever painted on is
             * GLYPH_UNEXPLORED and stays so (show_glyph keeps it), which
             * pager.c:730-737 lookat() answers "unexplored area"; only the
             * default_glyph branch (detect.c:2238) yields S_stone. */
            const _neverPainted = !!_loc && _loc.disp_ch === ' '
                && _loc.disp_cls === GLYPHCLS_CMAP && _loc.disp_cmap == null
                && !_loc.remembered_glyph && !(_loc.seenv | 0);
            // C detect.c:2214: retained monsters show the engulfer at the hero.
            if (!full && swallowed && keep_mons && u_at(x, y)) {
                const mon = g.u.ustuck;
                show_detected_monster_glyph(x, y, mon.mnum ?? mon.mndx ?? mon.data?.pmidx, { female: mon.female }, false);
                continue;
            }
            const gl = reveal_terrain_getglyph(x, y, which_subset, swallowed);
            if (!gl && _neverPainted)
                show_glyph_cell(x, y, ' ', NO_COLOR, false, 0, 'unexplored');
            else if (gl) {
                /* C detect.c:2381-2383 passes the complete glyph to
                 * show_glyph, including retained object/trap identity.
                 * pager.c:317 needs the object type to make a temporary
                 * object when only its remembered glyph remains. */
                show_glyph_cell(x, y, gl.ch, gl.color, gl.decgfx, gl.attr | 0, gl.cls,
                                false, gl.otyp ?? null, gl.corpsenm ?? null,
                                gl.ttyp ?? null, gl.cmap, !!gl.objpile);
                /* detect.c:2196-2200: a 'full' view paints back_to_glyph(), so an
                 * unmapped STONE square is cmap S_stone here, never
                 * GLYPH_UNEXPLORED; lookat() (pager.c:779-783) says "unexplored". */
                if (full && _loc) _loc.disp_unmapped = false;
                /* C detect.c:2196-2200 'full': back_to_glyph() yields a real
                 * cmap S_stone glyph (not GLYPH_UNEXPLORED), so pager.c:780-782
                 * lookat() answers "unexplored" (no "area") from !seenv. */
                if (full && _loc)
                /* A cmap S_stone glyph here (detect.c:2238 default_glyph) is a
                 * real glyph, not GLYPH_UNEXPLORED: lookat() answers pager.c:781
                 * "unexplored" (no "area") for it while !seenv. */
                if (gl.cls === GLYPHCLS_CMAP && gl.cmap === 0 && _loc)
                    _loc.disp_unmapped = false;
            } else if (!full && !swallowed && _loc && _loc.disp_cls === GLYPHCLS_CMAP
                       && _loc.disp_ch === ' ') {
                /* C detect.c:2204 glyph_at() returns the displayed blank S_stone
                 * glyph itself; show_glyph() (display.c:1930) sees it unchanged,
                 * so nothing is repainted over the status row's map-row-20 overlap. */
            } else
                show_glyph_cell(x, y, ' ', NO_COLOR, false, 0, GLYPHCLS_UNEXPLORED);
            /* detect.c:2238 paints default_glyph (cmap S_stone), not
             * GLYPH_UNEXPLORED, so pager.c:779-781 lookat() reads it as
             * "unexplored" (!seenv), never "unexplored area". */
            if (gl && _loc && gl.cmap === 0)
            /* A real cmap S_stone (detect.c:2194-2195 full view, or default_glyph) is
             * not GLYPH_UNEXPLORED: pager.c:781 lookat() answers "unexplored", not
             * "unexplored area", for it when !seenv. */
            if (gl && _loc && gl.cls === GLYPHCLS_CMAP && gl.cmap === 0)
                _loc.disp_unmapped = false;
        }
    }
    /* C detect.c:2387-2389 — "hero's location is not highlighted, but getpos()
     * starts with cursor there". */
    await flush_screen(1);
    /* C detect.c:2390-2405 — the message names the subsets that were KEPT. */
    let buf;
    if (full) {
        buf = 'underlying terrain';
    } else {
        buf = 'known terrain';
        if (keep_traps)
            buf += `${(keep_objs || keep_mons) ? ',' : ' and'} traps`;
        if (keep_objs)
            buf += `${(keep_traps || keep_mons) ? ',' : ''}`
                 + `${keep_mons ? '' : ' and'} objects`;
        if (keep_mons)
            buf += `${(keep_traps || keep_objs) ? ',' : ''} and monsters`;
    }
    await pline(`Showing %s only...`, buf);
    /* C detect.c:2409 — `which_subset |= TER_MAP; browse_map(...)`.  The pline
     * above is unacknowledged, and browse_map's getpos opens with a TIP_GETPOS
     * text window, so the tty pages the topline with its own --More-- and its
     * own dismiss keystroke first.  getpos() already predicts and forces that
     * (see its handle_tip block), so nothing extra is needed here. */
    which_subset |= TER_MAP;
    await browse_map(which_subset, 'anything of interest');
    Object.assign(game.u, _uc);
    if (g._pending_message)
        await force_more(g._pending_message);
    /* C detect.c:94-102 map_redisplay() — reconstrain_map() (detect.c:85-90)
     * puts the swallowed/buried/underwater state back, then docrt() repaints
     * the real map from hero memory. */
    g._topl_sticky = null;
    g._pending_message = '';
    await docrt();
    if (g.u.uinwater) under_water(2);
    if (g.u.uburied) under_ground(2);
}

/* C detect.c:1899-1918 openit() — the callback driver for a Bell of Opening.
 * "returns number of things found and opened." u.uswallow is not modelled
 * (throws below rather than in here, since it needs the mouth-opens/expels
 * digestion machinery this file does not have). */
export async function openit() {
    const g = game, u = g.u || {};
    if (u.uswallow) {
        const engulfer = u.ustuck;
        if (engulfer) {
            if (_digests(engulfer.data)) {
                await pline(_uprop_active('BLINDED')
                    ? 'Its mouth opens!'
                    : `${Monnam(engulfer)} opens its mouth!`);
            }
            /* C detect.c:1908-1915: Bell of Opening uses expels(), not merely
             * unstuck().  Besides releasing the hero it relocates the engulfer
             * with mnexto(), whose enexto candidate shuffle consumes the
             * collect_coords RNG ladder. */
            await expels_gu(engulfer,
                (engulfer.mndx ?? engulfer.mnum ?? engulfer.data?.pmidx ?? -1) | 0,
                true);
        }
        return -1;
    }
    const numRef = { value: 0 };
    await do_clear_area_async(u.ux | 0, u.uy | 0, BOLT_LIM,
        openone, numRef, true);
    return numRef.value;
}

/* C trap.c:b_trapped — opening a trapped door detonates it.  The same
 * helper is used by door-opening callers elsewhere, so keep the RNG and
 * physical side effects in one small local body. */
async function _openone_b_trapped_door(x, y) {
    const lvl = level_difficulty() | 0;
    const dmg = rnd(5 + (lvl < 5 ? lvl : 2 + Math.trunc(lvl / 2)));
    await pline('KABOOM!!  The door was booby-trapped!');
    wake_nearby(false);
    await losehp(flooreffects_Maybe_Half_Phys(dmg), 'explosion', KILLED_BY_AN);
    exercise(A_STR, false);
    make_stunned((_hprop(STUNNED) & TIMEOUT) + dmg, true);
}

/* C detect.c:1729-1780 openone(zx, zy, num) — do_clear_area's per-square
 * callback: unlock a box, open a closed/locked door (or reveal+open a secret
 * one), open a secret corridor, spring/open a trap, or open a drawbridge.
 */
async function openone(zx, zy, numRef) {
    const g = game;
    const lev = g.level && g.level.at ? g.level.at(zx, zy) : null;
    if (!lev) return;
    /* C detect.c:1736-1743 — OBJ_AT(zx,zy): unlock every locked box/chest. */
    const cell = g.level?.levelObjects?.[zx]?.[zy];
    if (cell) {
        for (let otmp = cell; otmp; otmp = otmp.nexthere) {
            if (Is_box(otmp) && otmp.olocked) {
                otmp.olocked = 0;
                numRef.value++;
            }
        }
    }
    const typ = lev.typ | 0;
    if (typ === SDOOR
        || (typ === DOOR && ((lev.doormask | 0) & (D_CLOSED | D_LOCKED)) !== 0)) {
        if (typ === SDOOR) _steth_cvt_sdoor_to_door(lev);
        if ((lev.doormask | 0) & D_TRAPPED) {
            if (flooreffects_distu(zx, zy) < 3)
                await _openone_b_trapped_door(zx, zy);
            else
                await _Norep('You %s an explosion!',
                    cansee(zx, zy) ? 'see' : (!_hero_Deaf() ? 'hear' : 'feel the shock of'));
            wake_nearto(zx, zy, 11 * 11);
            lev.doormask = D_NODOOR;
        } else {
            /* C detect.c:1761 — the UNTRAPPED door is left OPEN.  D_NODOOR is
             * the TRAPPED arm's value (detect.c:1760, the door is blown away). */
            lev.doormask = D_ISOPEN;
        }
        unblock_point(zx, zy);
        newsym(zx, zy);
        numRef.value++;
    } else if (typ === SCORR) {
        lev.typ = CORR;
        unblock_point(zx, zy);
        newsym(zx, zy);
        numRef.value++;
    } else {
        const ttmp = t_at(zx, zy);
        if (ttmp) {
            if (!ttmp.tseen && ttmp.ttyp !== STATUE_TRAP) {
                ttmp.tseen = 1;
                newsym(zx, zy);
                numRef.value++;
            }
            const mon = u_at(zx, zy) ? g.youmonst : m_at(zx, zy);
            const noticed = { value: false };
            if (await openholdingtrap(mon, noticed) || await openfallingtrap(mon, true, noticed)) {
                numRef.value++;
            }
        } else {
            const xr = { value: zx }, yr = { value: zy };
            if (find_drawbridge(xr, yr)) {
                await open_drawbridge(xr.value, yr.value);
                numRef.value++;
            }
        }
    }
}

/* C detect.c:1090-1134 furniture_detect(): disp_cmap carries glyph_to_cmap. */
async function furniture_detect() {
    const g = game, u = g.u;
    const saved = { uinwater: u.uinwater, uburied: u.uburied, uswallow: u.uswallow };
    u.uinwater = u.uburied = u.uswallow = 0;
    let found = 0, revealed = 0;
    for (let y = 0; y < ROWNO; ++y)
        for (let x = 1; x < COLNO; ++x) {
            const before = _glyph_ident(x, y);
            const loc = g.level?.at ? g.level.at(x, y) : null;
            if (loc && IS_FURNITURE(loc.typ)) {
                ++found;
                magic_map_background(loc, x, y, true);
            } else if (loc?.disp_cls === GLYPHCLS_CMAP && _is_cmap_furniture(loc.disp_cmap)) {
                ++found;
                const mon = m_at(x, y);
                if (mon && M_AP_TYPE(mon) === M_AP_FURNITURE) seemimic(mon);
                if (!mon || !canspotmon(mon)) map_invisible(x, y);
            }
            if (_glyph_ident(x, y) !== before)
                ++revealed;
        }
    if (!found)
        await pline('There seems to be nothing of interest on this level.');
    else if (!revealed)
        await pline('Your map already shows all relevant locations.');
    /* C detect.c:1126: if (!revealed) display_nhwindow(WIN_MAP, TRUE)
     * (tty: acknowledges a pending topline with --More--), handled by
     * force_more(g._pending_message); else browse_map; then map_redisplay() == docrt(). */
    if (revealed)
        await browse_map(_CB_TER_DETECT | TER_MAP | TER_TRP | TER_OBJ | TER_MON, 'location');
    if (!revealed) await force_more(g._pending_message);
    Object.assign(u, saved);
    if (g._pending_message)
        await force_more(g._pending_message);
    g._topl_sticky = null;
    await docrt();
    if (u.uinwater) await under_water(2);
    if (u.uburied) await under_ground(2);
    return 0;
}

/* C ref: detect.c:1139-1182 level_distance(where) */
function level_distance(where) {
    const u = game.u;
    const ll = depth(u.uz) - depth(where);
    const indun = (u.uz.dnum === where.dnum);
    let res = '';
    if (ll < 0) {
        if (ll < (-8 - rn2(3)))
            res = !indun ? 'far away' : 'far below';
        else if (ll < -1)
            res = !indun ? 'away below you' : 'below you';
        else
            res = !indun ? 'in the distance' : 'just below';
    } else if (ll > 0) {
        if (ll > (8 + rn2(3)))
            res = !indun ? 'far away' : 'far above';
        else if (ll > 1)
            res = !indun ? 'away above you' : 'above you';
        else
            res = !indun ? 'in the distance' : 'just above';
    } else {
        res = !indun ? 'in the distance' : 'near you';
    }
    return res;
}

/* C ref: detect.c:1206-1368 use_crystal_ball(optr).  void; the caller's turn
 * accounting is doapply's. */
export async function use_crystal_ball(obj) {
    const g = game, u = g.u;
    const charged = (obj.spe | 0) > 0;

    if (_Blind_cmd()) {
        await pline(`Too bad you can't see ${await the(await xname(obj))}.`);
        return;
    }
    const intl = acurr(u, A_INT);
    const oops = is_quest_artifact(obj) ? 8 : obj.blessed ? 16 : 20;
    if (charged && (obj.cursed || rnd(oops) > intl)) {
        const impair = rnd(100 - 3 * intl);
        switch (rnd((obj.oartifact || obj.blessed) ? 4 : 5)) {
        case 1:
            await pline(`${await _objnam_Tobjnam(obj, 'are')} too much to comprehend!`);
            break;
        case 2:
            await pline(`${await _objnam_Tobjnam(obj, 'confuse')} you!`);
            make_confused(((u.uprops?.[CONFUSION]?.intrinsic | 0) & TIMEOUT) + impair, false);
            break;
        case 3:
            if (!resists_blnd(g.youmonst)) {
                await pline(`${await _objnam_Tobjnam(obj, 'damage')} your vision!`);
                make_blinded(BlindedTimeout() + impair, false);
                if (!_Blind_cmd())
                    await pline('Your vision quickly clears.');
            } else {
                await pline(`${await _objnam_Tobjnam(obj, 'assault')} your vision.`);
                await You('are unaffected!');
            }
            break;
        case 4:
            await pline(`${await _objnam_Tobjnam(obj, 'zap')} your mind!`);
            await make_hallucinated(((u.uprops?.[HALLUC]?.intrinsic | 0) & TIMEOUT) + impair, false, 0);
            break;
        case 5:
            await pline(`${await _objnam_Tobjnam(obj, 'explode')}!`);
            await useup(obj);
            obj = null;
            await losehp(flooreffects_Maybe_Half_Phys(rnd(30)), 'exploding crystal ball', KILLED_BY_AN);
            break;
        }
        if (obj)
            consume_obj_charge(obj, true);
        return;
    }

    let implode = false;
    if (_cmd_Hallucination()) {
        nomul(-rnd(charged ? 4 : 2));
        g.multi_reason = 'gazing into a Magic 8-Ball (tm)';
        g.nomovemsg = '';
        if (!charged) {
            await pline(`All you see is funky ${hcolor(null)} haze.`);
            if ((obj.spe | 0) < 0)
                implode = true; /* destroy it when it has been cancelled */
        } else {
            switch (rnd(6)) {
            case 1: await You('grok some groovy globs of incandescent lava.'); break;
            case 2: await pline(`Whoa!  Psychedelic colors, ${poly_gender() === 1 ? 'babe' : 'dude'}!`); break;
            case 3: await pline(`The crystal pulses with sinister ${hcolor(null)} light!`); break;
            case 4: await You_see('goldfish swimming above fluorescent rocks.'); break;
            case 5: await You_see('tiny snowflakes spinning around a miniature farmhouse.'); break;
            default: await pline('Oh wow... like a kaleidoscope!'); break;
            }
            consume_obj_charge(obj, true);
        }
        if (!implode)
            return;
    }
    if (!implode) {
        /* read a single character */
        if (g.flags?.verbose !== false)
            await You('may look for an object, monster, or special map symbol.');
        let ch = await yn_function('What do you look for?', null, '\0', true);
        /* Don't filter out ' ' here; it has a use */
        if (ch !== ' ' && ' \x1b\n\r'.includes(ch)) {
            /* topl.c:537-545 leaves the prompt on the topline; nhgetch's clear has
             * dropped it from _pending_message, so hand it to the paint fallback. */
            g._topl_sticky = 'What do you look for?';
            if (g.flags?.verbose !== false)
                await pline('Never mind.');
            return;
        }
        await You(`peer into ${await the(await xname(obj))}...`);
        nomul(-rnd(charged ? 10 : 2));
        g.multi_reason = 'gazing into a crystal ball';
        g.nomovemsg = '';
        if (!charged) {
            await pline('The vision is unclear.');
            if ((obj.spe | 0) < 0)
                implode = true; /* destroy ball if used after being cancelled */
        } else {
            let ret = 0, cls_;
            makeknown(CRYSTAL_BALL_OTYP);
            consume_obj_charge(obj, true);
            if (ch === ']')             /* DEF_MIMIC_DEF -> DEF_MIMIC */
                ch = 'm';
            const cc = ch.charCodeAt(0);
            const bouldersym = g.symbolOverrides?.S_boulder ? pager_boulder_symbol()
                : String.fromCharCode(pager_showsyms()?.[SYM_OFFSETS.X + SYM_BOULDER] || 0);
            /* def_char_is_furniture (drawing.c:120): stairs/ladders '<' '>', altar '_', grave '|',
             * throne '\\', sink and fountain '{' — NOT '#' (S_corr/S_bars/S_tree are before
             * "staircase up"; the 5.0 sink symbol is '{'). */
            if ('<>_|\\{'.includes(ch)) {
                ret = await furniture_detect();
            } else if ((cls_ = def_char_to_objclass(cc)) !== MAXOCLASSES) {
                ret = await _cb_object_detect_class(cls_);
            } else if ((cls_ = def_char_to_monclass(cc)) !== MAXMCLASSES) {
                ret = await monster_detect(null, cls_);
            } else if (bouldersym !== '\0' && ch === bouldersym) {
                ret = await _cb_object_detect_class(ROCK_CLASS);
            } else if (ch === '^') {
                ret = await trap_detect(null);
            } else {
                /* detect.c:1384-1389 — level_detects[] (detect.c:1190-1197) */
                const level_detects = [
                    ['Delphi', g.oracle_level], ["Medusa's lair", g.medusa_level],
                    ['a castle', g.stronghold_level],
                    ["the Wizard of Yendor's tower", g.wiz1_level],
                ];
                const i = rn2(level_detects.length);
                await You_see(`${level_detects[i][0]}, ${level_distance(level_detects[i][1])}.`);
                ret = 0;
            }
            if (ret) {
                if (!rn2(100)) /* make them nervous */
                    await You_see('the Wizard of Yendor gazing out at you.');
                else
                    await pline('The vision is unclear.');
            }
        }
    }
    if (implode) {
        /* no damage to hero but 'multi' has a small negative value */
        await pline(`${await _objnam_Tobjnam(obj, 'implode')}!`);
        await useup(obj);
    }
}

// C ref: detect.c:2107 warnreveal()
/* async because mfind0() is now a real (async) port; warnreveal itself has no
 * caller in js.; the warning helper is canonical, so this path remains
 * dead either way — but a floating promise in a dead path is still a defect. */
export async function warnreveal() {
    const g = game;
    const u = g.u || {};
    const ux = u.ux | 0, uy = u.uy | 0;
    for (let x = ux - 1; x <= ux + 1; x++) {
        for (let y = uy - 1; y <= uy + 1; y++) {
            if (!isok(x, y) || (x === ux && y === uy))
                continue;
            const mtmp = m_at(x, y);
            if (mtmp && warning_of_real(mtmp) && (mtmp.mundetected | 0))
                await mfind0(mtmp, 1); /* via_warning */
        }
    }
}

// C ref: rnd.c:674 rnl(x).  The main draw is `i = RND(x)` — an internal,
// UNLOGGED reduction (like d()'s internal RND), and C records ONE `rnl(x)=i`
// log line, NOT an inner `rn2(x)` line.  The earlier local copy below called
// comparison (C logs `rnl(8)`, JS logged `rn2(8)` — same value, wrong label;
// in rng.js, which uses RND(x) internally and emits the correct `rnl(x)` line
// (and the Luck-adjustment rn2(37+|adj|) when Luck != 0, exactly as C).
function rnl_dosearch(x) {
    return rnl(x);
}

export async function find_trap(trap) {
    let cleared = false;
    const tx = trap.tx | 0, ty = trap.ty | 0;

    trap.tseen = 1;
    /* C detect.c:1939 exercise(A_WIS, TRUE) — the rn2(19) this whole stub
     * dropped.  attrib.c:509: AEXE(i) += (rn2(19) > ACURR(i)). */
    exercise(A_WIS, true);
    feel_newsym(tx, ty);

    /* C detect.c:1945-1953 */
    const loc = game.level?.at ? game.level.at(tx, ty) : null;
    const remembered = (game.level?.flags?.hero_memory) ? (loc ? loc.remembered_glyph : null) : null;
    /* C detect.c:1945 uses Hallucination, including hallucination resistance. */
    if (_cmd_Hallucination()
        || !glyph_is_this_trap(remembered, trap.ttyp | 0)) {
        /* There's too much clutter to see your find otherwise */
        /* display.c:2196 cls() -> display_nhwindow(WIN_MESSAGE, FALSE)
         * (wintty.c:1873): an unacknowledged topline (monster attacks earlier
         * this turn) is --More--'d BEFORE the clear; display_cls() alone just
         * discards it. */
        /* The message of the command in progress (e.g. "You drop a towel.")
         * is held in _resultMessage until flushed, not in _pending_message. */
        const _topl = game._pending_message || game._resultMessage;
        if (_topl) {
            /* tty more() freezes the PHYSICAL screen as of the last flush;
             * feel_newsym() above only wrote the gbuf. */
            const release = use_last_flush_snapshot();
            if (game._paintedSnapshot && game._lastPaintedBotl)
                game._paintedSnapshot.botl = game._lastPaintedBotl;
            game._moreFromCls = true;
            try { await force_more(_topl, undefined, false, false, null, true); } finally { game._moreFromCls = false; }
            release();
            /* cls()'s more() (wintty.c:1873) ran BEFORE "You find ..." reaches
             * update_topl, so an ESC it read has WIN_STOP live (topl.c:232-235)
             * and skip is TRUE for that message: it is not painted. */
            if (game._topl_win_stop_armed) {
                game._topl_win_stop_armed = false;
                game._topl_win_stop = true;
            }
            /* The more() wiped the topline (topl.c:241-245); the message that
             * was on it must not be joined to "You find ..." below. */
            game._resultMessage = '';
            game._topl_joins = [];
        }
        await display_cls();
        map_trap(trap, 1);
        display_self();
        cleared = true;
    }

    /* C detect.c:1955-1956 */
    set_msg_xy(tx, ty);
    /* C detect.c:1956 trapname(trap->ttyp, FALSE): hallucination draws the display RNG */
    const msg = `You find ${an(makemon_trapname(trap.ttyp | 0, false))}.`;
    await pline(msg);

    /* C detect.c:1958-1961 */
    if (cleared) {
        await force_more(game._pending_message || msg, undefined, false, false, null, true);
        await docrt();
    }
}

// C ref: detect.c:2017 dosearch0(aflag) — intrinsic autosearch vs explicit
// searching.  Scans the 3x3 grid centred on the hero; for each non-self
// tile, fires rnl(7-fund) on SDOOR, rnl(7-fund) on SCORR, else rnl(8) on
// an unseen trap.  Returns 1 in the normal path (turn consumed).
//
// CRITICAL — iteration order matches C exactly: x outer (ux-1, ux, ux+1),
// y inner (uy-1, uy, uy+1).  RNG order divergence is the first signal
// (Cardinal Rule 2).
//
//   for (x = u.ux - 1; x < u.ux + 2; x++)
//       for (y = u.uy - 1; y < u.uy + 2; y++) { ... }
//
// fund = (uwep && oartifact && SPFX_SEARCH) ? uwep->spe : 0
//        + (ublindf->LENSES && !Blind ? 2 : 0)
//        capped at 5.
// Helpers used below (secret-door conversion is inline):
//   feel_location, cvt_sdoor_to_door, recalc_block_point, nomul,
//   set_msg_xy, unblock_point, feel_newsym, unmap_invisible, find_trap,
//   activate_statue_trap, mfind0.
// exercise(A_WIS, true) is already ported (attrib.js).
export async function dosearch0(aflag) {
    const g = game;
    const u = g.u || {};
    const COLNO_L = 80;
    const ROWNO_L = 21;

    /* C: if (u.uswallow) { if (!aflag) Norep("..."); } */
    if (u.uswallow) {
        if (!aflag) {
            await _Norep("What are you looking for?  The exit?");
        }
        return 1;
    }

    /* C: int fund = (uwep && uwep->oartifact && spec_ability(uwep, SPFX_SEARCH))
     *               ? uwep->spe : 0;
     *    if (ublindf && ublindf->otyp == LENSES && !Blind) fund += 2;
     *    if (fund > 5) fund = 5;
     */
    const SPFX_SEARCH = SPFX_SEARCH_ART;
    let fund = (u.uwep?.oartifact && spec_ability(u.uwep, SPFX_SEARCH))
        ? u.uwep.spe : 0;
    if (u.ublindf?.otyp === _LENSES_OTYP && !_Blind_cmd()) fund += 2;
    if (fund > 5) fund = 5;

    const ux = u.ux | 0;
    const uy = u.uy | 0;

    /* C: for (x = u.ux - 1; x < u.ux + 2; x++)
     *        for (y = u.uy - 1; y < u.uy + 2; y++) — x outer, y inner */
    for (let x = ux - 1; x < ux + 2; x++) {
        for (let y = uy - 1; y < uy + 2; y++) {
            /* C: if (!isok(x, y)) continue; */
            if (x < 1 || x >= COLNO_L || y < 0 || y >= ROWNO_L) continue;
            /* C: if (u_at(x, y)) continue;  (u_at = (x == u.ux && y == u.uy)) */
            if (x === ux && y === uy) continue;

            /* C detect.c:1583-1584:
             *     if (!aflag && (Blind || visible_region_at(x, y)))
             *         feel_location(x, y);
             * No RNG.  Was skipped as "a screen-update side-effect" while
             * feel_location was a throwing stub; it is a real port now. */
            if (!aflag && (_Blind_cmd() || visible_region_at(x, y) !== null))
                feel_location(x, y);

            const loc = g.level && g.level.at ? g.level.at(x, y) : null;
            const typ = loc ? (loc.typ | 0) : 0;

            /* C ref: rm.h — SDOOR=14, SCORR=15, CORR=24, DOOR=23 */
            const SDOOR_T = 14;
            const SCORR_T = 15;
            const CORR_T  = 24;
            const DOOR_T  = 23;

            if (typ === SDOOR_T) {
                /* C: if (rnl(7 - fund)) continue; */
                if (rnl_dosearch(7 - fund)) continue;
                if (loc) {
                    let newmask = (loc.doormask | 0) & ~WM_MASK;
                    if (Is_rogue_level(game.u?.uz)) {
                        newmask = D_NODOOR;
                    } else if (!(newmask & D_LOCKED)) {
                        newmask |= D_CLOSED;
                    }
                    loc.typ = DOOR_T;
                    loc.doormask = newmask;
                    loc.candig = false; /* C: lev->arboreal_sdoor = 0 */
                }
                /* C detect.c:1591 recalc_block_point(x, y); — no RNG */
                recalc_block_point(x, y);
                /* C detect.c:1592 exercise(A_WIS, TRUE); — no RNG */
                exercise(A_WIS, true);
                nomul(0);
                feel_location(x, y); /* make sure it shows up */
                set_msg_xy(x, y);
                await pline('You find a hidden door.');
            } else if (typ === SCORR_T) {
                /* C: if (rnl(7 - fund)) continue; */
                if (rnl_dosearch(7 - fund)) continue;
                if (loc) loc.typ = CORR_T;
                /* C detect.c:1600 unblock_point(x, y); — vision, no RNG */
                unblock_point(x, y);
                /* C detect.c:1601 exercise(A_WIS, TRUE); */
                exercise(A_WIS, true);
                /* C detect.c:1602-1605 — the same four calls as the SDOOR
                 * arm above; see the note there. */
                nomul(0);
                feel_newsym(x, y); /* make sure it shows up */
                set_msg_xy(x, y);
                await pline('You find a hidden passage.');
            } else {
                /* C: if ((mtmp = m_at(x, y)) != 0 && !aflag) {
                 *        int mfres = mfind0(mtmp, 0);
                 *        if (mfres == -1) continue;
                 *        else if (mfres > 0) return mfres;
                 *    } */
                const mtmp = m_at(x, y);
                if (mtmp && !aflag) {
                    const mfres = await mfind0(mtmp, false);
                    if (mfres === -1) continue;
                    else if (mfres > 0) return mfres;
                }

                /* C: if (!aflag && !mtmp && !Blind) (void) unmap_invisible(x, y); */
                if (!aflag && !mtmp && !_Blind_cmd())
                    unmap_invisible(x, y);

                /* C: if ((trap = t_at(x, y)) && !trap->tseen && !rnl(8)) {
                 *        nomul(0);
                 *        if (trap->ttyp == STATUE_TRAP) {
                 *            if (activate_statue_trap(trap, x, y, FALSE))
                 *                exercise(A_WIS, TRUE);
                 *            return 1;
                 *        } else {
                 *            find_trap(trap);
                 *        }
                 *    } */
                const trap = t_at(x, y);
                if (trap && !trap.tseen && !rnl_dosearch(8)) {
                    /* C detect.c:2081 nomul(0) — stop a counted search ('20s')
                     * the instant something is found, exactly as the SDOOR and
                     * SCORR arms above already do. */
                    nomul(0);
                    if ((trap.ttyp | 0) === STATUE_TRAP) {
                        /* C detect.c:2083-2085:
                         *     if (activate_statue_trap(trap, x, y, FALSE))
                         *         exercise(A_WIS, TRUE);
                         *     return 1;
                         * activate_statue_trap is exported by js/trap.js
                         * (animate_statue, trap.c:725-899, is ported there). */
                        if (await activate_statue_trap(trap, x, y, false))
                            exercise(A_WIS, true);
                        return 1;
                    } else {
                        await find_trap(trap);
                    }
                }
            }
        }
    }
    return 1;
}

// C ref: detect.c:2098 dosearch() — the #search ('s') command.
//
//   int dosearch(void) {
//       if (cmd_safety_prevention("Searching", "another search",
//                                 "You already found a monster.",
//                                 &ga.already_found_flag))
//           return ECMD_OK;
//       return dosearch0(0) ? ECMD_TIME : ECMD_OK;
//   }
//
// cmd_safety_prevention's FALSE path (no adjacent hostile, no
// danger_uprops, default flags.safe_wait) means search proceeds to
// dosearch0(0).  dosearch0 returns 1 on the normal path → ECMD_TIME →
// context.move=1.
export async function dosearch() {
    const g = game;
    g.ga = g.ga || {};
    if (g.ga.already_found_flag === undefined) g.ga.already_found_flag = 0;
    const ref = { value: g.ga.already_found_flag };
    const aborted = cmd_safety_prevention(
        "Searching",
        "another search",
        "You already found a monster.",
        ref
    );
    g.ga.already_found_flag = ref.value;
    g.context = g.context || {};
    if (aborted) {
        g.context.move = 0;
        return ECMD_OK;
    }
    const r = await dosearch0(0);
    if (r) {
        g.context.move = 1;
    } else {
        g.context.move = 0;
    }
    return r ? ECMD_TIME : ECMD_OK;
}

// Stub: mfind0 (unported helper for warnreveal)
export async function mfind0(mtmp, via_warning) {
    const x = mtmp.mx | 0, y = mtmp.my | 0;
    const mndx = (mtmp.mndx ?? mtmp.mnum ?? -1) | 0;
    let found_something = false;

    if (via_warning && !warning_of_real(mtmp))
        return -1;

    if (M_AP_TYPE(mtmp)) {
        _steth_seemimic(mtmp);
        found_something = true;
    } else {
        /* C:1977-1979 — "this used to only be executed if a !canspotmon() test
         * passed but that failed to bring sensed monsters out of hiding". */
        found_something = !canspotmon(mtmp);
        const mlet = (mndx >= 0 && mndx < _MONS.length) ? (_MONS[mndx][0] | 0) : -1;
        const mf1 = (mndx >= 0 && mndx < _MONS.length) ? (_MONS[mndx][6] | 0) : 0;
        if ((mtmp.mundetected | 0)
            && (_is_hider_mndx(mndx) || (mf1 & _M1_CONCEAL_SRCH) !== 0
                || mlet === _S_EEL_SRCH)) {
            if (via_warning && found_something) {
                set_msg_xy(x, y);
                await pline('Your danger sense causes you to take a second '
                    + (_Blind_cmd() ? 'to check nearby' : 'look close by') + '.');
                /* C detect.c:1987 display_nhwindow(WIN_MESSAGE, FALSE) — page-ack
                 * BEFORE the newsym below repaints the revealed hider. */
                topl_force_break_now();
            }
            mtmp.mundetected = 0;
            found_something = true;
        }
        newsym(x, y);
    }

    if (found_something) {
        /* C:1996-2000 — "Found invisible monster in square which already has 'I'
         * in it.  Logically, this should still take time ... but if we did that
         * the hero would keep finding the same monster every turn." */
        /* C detect.c:1997 reads levl[x][y].glyph (hero memory), not the painted
         * gbuf cell glyph_is_invisible_at() consults: underwater, under_water()
         * blanks gbuf while memory keeps the 'I'. */
        const _rg = game.level?.at?.(x, y)?.remembered_glyph;
        if (!canspotmon(mtmp) && _rg && _rg.ch === 'I' && _rg.cls === GLYPHCLS_INVIS)
            return -1;
        exercise(A_WIS, true);
        if (!canspotmon(mtmp)) {
            map_invisible(x, y);
            set_msg_xy(x, y);
            // C detect.c:2004: You_feel also handles warning while Unaware.
            await You_feel('an unseen monster!');
        } else if (!sensemon(mtmp)) {
            set_msg_xy(x, y);
            await pline(`You find ${mtmp.mtame ? y_monnam(mtmp) : _st_a_monnam(mtmp)}.`);
        }
        return 1;
    }
    return 0;
}

/* C monflag.h:92 M1_CONCEAL / defsym.h:362 S_EEL — mfind0's other two
 * hider tests.  (This file's other M1_CONCEAL spelling is a function-local in
 * domonability(); _M1_HIDE beside _is_hider_mndx is the module-level twin.) */
const _M1_CONCEAL_SRCH = 0x00000080;

const _S_EEL_SRCH = 57;

export function trapped_chest_at(ttyp, x, y) {
    let otmp;
    let mtmp;
    if (_glyph_at(x, y)?.cls !== GLYPHCLS_TRAP)
        return false;
    const Hallucination = _cmd_Hallucination();
    if (ttyp !== TRAPPED_CHEST || (Hallucination && rn2(20)))
        return false;
    /* on map, presence of any trappable container will do */
    if (sobj_at(CMD_CHEST, x, y) || sobj_at(CMD_LARGE_BOX, x, y))
        return true;
    /* in inventory, we need to find one which is actually trapped */
    if (u_at(x, y)) {
        for (otmp = game.invent; otmp; otmp = otmp.nobj)
            if (Is_box(otmp) && otmp.otrapped)
                return true;
        if (game.u.usteed) { /* steed isn't on map so won't be found by m_at() */
            for (otmp = game.u.usteed.minvent; otmp; otmp = otmp.nobj)
                if (Is_box(otmp) && otmp.otrapped)
                    return true;
        }
    }
    /* C detect.c:172: a null monster pointer must skip the inventory scan. */
    if ((mtmp = m_at(x, y)))
        for (otmp = mtmp.minvent; otmp; otmp = otmp.nobj)
            if (Is_box(otmp) && otmp.otrapped)
                return true;
    return false;
}

/* C ref: detect.c:182 trapped_door_at(ttyp, x, y) — is (x,y) showing a
 * trapped-door trap symbol, and is there a real door there? */
export function trapped_door_at(ttyp, x, y) {
    if (_glyph_at(x, y)?.cls !== GLYPHCLS_TRAP)
        return false;
    const Hallucination = _cmd_Hallucination();
    if (ttyp !== TRAPPED_DOOR || (Hallucination && rn2(20)))
        return false;
    const lev = _levlAt(x, y);
    if (!lev || !IS_DOOR(lev.typ))
        return false;
    if ((lev.doormask & (D_NODOOR | D_BROKEN | D_ISOPEN)) !== 0
         && trapped_chest_at(ttyp, x, y))
        return false;
    return true;
}

export async function monster_detect(otmp, mclass) {
    const g = game;
    const u = g.u;
    /* C detect.c:809-816 — DEADMONSTER(mon) is (mon)->mhp < 1; the isgd test
     * skips a vault guard that has been moved off-map. */
    let mcnt = 0;
    for (let mtmp = g.fmon; mtmp; mtmp = mtmp.nmon) {
        if ((mtmp.mhp | 0) < 1 || (mtmp.isgd && !mtmp.mx))
            continue;
        ++mcnt;
        break;
    }
    if (!mcnt) {
        /* C detect.c:818-823 — only an object source gets the consolation
         * message; the fountain (otmp == NULL) is silent here. */
        if (otmp)
            await strange_feeling(otmp, _hallucination()
                ? 'You get the heebie jeebies.' : 'You feel threatened.');
        return 1;
    }
    let woken = false;
    /* C detect.c:826 — read BEFORE unconstrain_map() clears it. */
    const swallowed = u.uswallow;
    /* C display.c:2064-2072 cls() opens with display_nhwindow(WIN_MESSAGE, FALSE):
     * a standing topline (e.g. "You peer into the glass orb...") gets its --More--. */
    if (g._pending_message)
        await force_more(g._pending_message);
    await cls();
    const unconstrained = !!(u.uinwater || u.uburied || u.uswallow);
    g.iflags = g.iflags || {};
    g.iflags.save_uinwater = u.uinwater; u.uinwater = 0;
    g.iflags.save_uburied = u.uburied; u.uburied = 0;
    g.iflags.save_uswallow = u.uswallow; u.uswallow = 0;
    for (let mtmp = g.fmon; mtmp; mtmp = mtmp.nmon) {
        if ((mtmp.mhp | 0) < 1 || (mtmp.isgd && !mtmp.mx))
            continue;
        /* C detect.c:833-836: '~' detects long worms as well as their tails. */
        const S_WORM_TAIL = 59; /* defsym.h */
        if (!mclass || (mtmp.data && mtmp.data.mlet === mclass)
            || ((mtmp.mnum ?? mtmp.mndx ?? mtmp.data?.pmidx) === PM_LONG_WORM
                && mclass === S_WORM_TAIL))
            map_monst(mtmp, true);
        /* C detect.c:838-842 — a CURSED detector wakes the helpless. */
        if (otmp && otmp.cursed && (mtmp.msleeping || mtmp.mfrozen
                                    || !mtmp.mcanmove)) {
            mtmp.msleeping = 0;
            mtmp.mfrozen = 0;
            mtmp.mcanmove = 1;
            woken = true;
        }
    }
    if (!swallowed)
        display_self();
    await pline('You sense the presence of monsters.');
    if (woken)
        await pline('Monsters sense the presence of you.');
    if ((otmp && otmp.blessed) && !unconstrained) {
        await force_more(g._pending_message);
    } else {
        /* C detect.c:855-859 — one-shot detection: let the player move the
         * cursor around with autodescribe feedback.  EDetect_monsters gets
         * I_SPECIAL for the duration so canspotself()/senseself() and the
         * monster-visibility tests treat every monster as sensed while the
         * cursor is being moved. */
        const p = _detect_monsters_uprop(u);
        p.extrinsic = (p.extrinsic | 0) | I_SPECIAL;
        g.iflags = g.iflags || {};
        const savedTerrainmode = g.iflags.terrainmode;
        g.iflags.terrainmode = TER_DETECT | TER_MON;
        /* detect.c:112-117 browse_map: autodescribe forced on, then restored */
        const save_autodescribe = g.iflags.autodescribe;
        g.iflags.autodescribe = true;
        try {
            /* browse_map: dummy_pos starts on the hero's own square. */
            await getpos({ x: u.ux, y: u.uy }, false, 'monster of interest');
        } finally {
            g.iflags.terrainmode = savedTerrainmode;
            g.iflags.autodescribe = save_autodescribe;
            p.extrinsic = (p.extrinsic | 0) & ~I_SPECIAL;
        }
    }
    if (g._pending_message) {
        const morc = await force_more(g._pending_message);
        /* detect.c:859 map_redisplay -> display.c:2196 cls flushes WIN_MESSAGE.
         * This more() has no incoming update_topl owner: ESC's WIN_STOP is
         * already live for the next pline (topl.c:232-235,257), including
         * monster messages during the crystal ball's remaining busy turns. */
        if (morc === 27 && g._topl_win_stop_armed) {
            g._topl_win_stop_armed = false;
            g._topl_win_stop = true;
            g._topl_win_stop_buf = g._topl_last_more_committed;
        }
    }
    /* docrt() -> cls() -> tty_clear_nhwindow(WIN_MAP) is clear_screen(), which
     * blanks the physical topline too: getpos's exit left the autodescribe /
     * "Move cursor to ..." text standing (msg_given FALSE), and C's frame after
     * the '.' pick shows an empty row 0. */
    g._topl_sticky = null;
    /* C detect.c:85-90 reconstrain_map(), then docrt(), then the restored
     * Underwater / buried view (detect.c:94-102 map_redisplay). */
    u.uinwater = g.iflags.save_uinwater; g.iflags.save_uinwater = 0;
    u.uburied = g.iflags.save_uburied; g.iflags.save_uburied = 0;
    u.uswallow = g.iflags.save_uswallow; g.iflags.save_uswallow = 0;
    await docrt();
    if (u.uinwater)
        under_water(2);
    if (u.uburied)
        under_ground(2);
    return 0;
}

function _observe_recursively_det(obj) {
    observe_object(obj);
    if (Has_contents(obj)) {
        for (let o = obj.cobj; o; o = o.nobj)
            _observe_recursively_det(o);
    }
}

/* C ref: detect.c:214-227 o_in(obj, oclass) */
function _o_in_det(obj, oclass) {
    if (!oclass) return null;
    if ((obj.oclass | 0) === oclass) return obj;
    if (Has_contents(obj) && !SchroedingersBox(obj)) {
        for (let otmp = obj.cobj; otmp; otmp = otmp.nobj) {
            if ((otmp.oclass | 0) === oclass) return otmp;
            if (Has_contents(otmp)) {
                const temp = _o_in_det(otmp, oclass);
                if (temp) return temp;
            }
        }
    }
    return null;
}

/* C ref: detect.c:260-306 check_map_spot(x, y, oclass, material) — handles
 * both ALL_CLASSES (!oclass) and class-specific detection. */
function _check_map_spot_alldetect(x, y, oclass = 0) {
    const g = game;
    const loc = g.level && g.level.at ? g.level.at(x, y) : null;
    if (oclass) {
        const rg = loc && loc.remembered_glyph;
        if (!rg || rg.cls !== GLYPHCLS_OBJ)
            return false;
        if (Number.isInteger(rg.otyp) ? (MKOBJ_OC_CLASS[rg.otyp] | 0) !== oclass
            : rg.ch !== def_oc_syms_chars[oclass])
            return false;
        for (let otmp = g.level.levelObjects?.[x]?.[y] ?? null; otmp; otmp = otmp.nexthere)
            if (_o_in_det(otmp, oclass))
                return false;
        const mtmp = m_at(x, y);
        if (mtmp)
            for (let otmp = mtmp.minvent; otmp; otmp = otmp.nobj)
                if (_o_in_det(otmp, oclass))
                    return false;
        return true;
    }
    if (!loc || loc.disp_cls !== GLYPHCLS_OBJ)
        return false;
    const hasFloorObj = !!(g.level && g.level.levelObjects
                            && g.level.levelObjects[x] && g.level.levelObjects[x][y]);
    if (hasFloorObj)
        return false;
    const mtmp = m_at(x, y);
    return !(mtmp && mtmp.minvent);
}

/* C ref: detect.c:311-330 clear_stale_map(!class ? ALL_CLASSES : class, 0). RNG-free. */
function _clear_stale_map_alldetect(oclass = 0) {
    let change_made = false;
    for (let zx = 1; zx < COLNO; zx++) {
        for (let zy = 0; zy < ROWNO; zy++) {
            if (_check_map_spot_alldetect(zx, zy, oclass)) {
                unmap_object(zx, zy);
                change_made = true;
            }
        }
    }
    return change_made;
}

const ROCK_CLASS_DET = 14, SCROLL_CLASS_DET = 9;

const _DET_OC_NAMES = [null, 'illegal objects', 'weapons', 'armor', 'rings', 'amulets',
    'tools', 'food', 'potions', 'scrolls', 'spellbooks', 'wands', 'coins', 'rocks',
    'large stones', 'iron balls', 'chains', 'venoms'];

/* C objects.h GOLD_PIECE otyp — same value js/makemon.js:1404's local
 * GOLD_PIECE_OTYP carries (MKOBJ_SVB_BASES[COIN_CLASS]=438); this file's own
 * name to avoid importing a non-exported local from another module. */
const GOLD_PIECE_OTYP_DET = 438;

/* C ref: detect.c:603-788 object_detect(detector, class).
 *
 * Returns 1 ("nothing detected"), 0 ("something detected").
 * RNG: rnd(10) once per monster whose minvent contains gold (the mapping
 * loop's "usually more than 1" roll, detect.c:766) — clear_stale_map and
 * the counting loop draw nothing.  exercise(A_WIS, TRUE) is the CALLER's
 * draw (peffect_object_detection), not this function's — matches C, where
 * object_detect() itself never calls exercise(). */
export async function object_detect(detector, oclass) {
    const g = game;
    const u = g.u;
    if (oclass < 0 || oclass >= 18 /* MAXOCLASSES */) {
        /* C detect.c:619 reports an impossible class and resets class to 0
         * (after impossible()) and continues into normal detection. */
        oclass = 0;
    }
    const is_cursed = !!(detector && detector.cursed);
    const do_dknown = !!(detector
        && (detector.oclass === POTION_CLASS || detector.oclass === SPBOOK_CLASS)
        && detector.blessed);
    let ct = 0, ctu = 0;
    let otmp = null;

    /* C detect.c:628-637: boulder symbol check and stuff string */
    const sym = oclass ? def_oc_syms_chars[oclass] : 0;
    const bouldersym = g.symbolOverrides?.S_boulder ? pager_boulder_symbol()
        : String.fromCharCode(pager_showsyms()?.[192 /* SYM_OFF_X + SYM_BOULDER */] || 96);
    const boulder = (sym && sym === bouldersym) ? ROCK_CLASS_DET : 0;
    const confused = ((u.uprops?.[CONFUSION]?.intrinsic | 0) || (u.uprops?.[CONFUSION]?.extrinsic | 0)) !== 0;
    let stuff = (_hallucination() || (confused && oclass === SCROLL_CLASS_DET))
        ? 'something' : (oclass ? _DET_OC_NAMES[oclass] : 'objects');
    if (boulder && oclass !== ROCK_CLASS_DET)
        stuff += ' and/or large stones';

    if (do_dknown) {
        for (let o = g.invent; o; o = o.nobj)
            _observe_recursively_det(o);
    }
    for (let o = g.fobj; o; o = o.nobj) {
        if ((!oclass && !boulder) || _o_in_det(o, oclass) || _o_in_det(o, boulder)) {
            if (u_at(o.ox, o.oy)) ctu++; else ct++;
        }
        if (do_dknown) _observe_recursively_det(o);
    }
    for (let o = g.level && g.level.buriedobjlist; o; o = o.nobj) {
        if (!oclass || _o_in_det(o, oclass)) {
            if (u_at(o.ox, o.oy)) ctu++; else ct++;
        }
        if (do_dknown) _observe_recursively_det(o);
    }

    if (u.usteed) {
        u.usteed.mx = u.ux;
        u.usteed.my = u.uy;
    }

    for (let mtmp = g.fmon; mtmp; mtmp = mtmp.nmon) {
        if ((mtmp.mhp | 0) < 1 || (mtmp.isgd && !mtmp.mx))
            continue;
        for (let o = mtmp.minvent; o; o = o.nobj) {
            if ((!oclass && !boulder) || _o_in_det(o, oclass) || _o_in_det(o, boulder))
                ct++;
            if (do_dknown) _observe_recursively_det(o);
        }
        /* C detect.c:668-676 — the `break` exits the OUTER mtmp loop the
         * instant ANY monster is a cursed-detector mimic-of-object or
         * carries gold.  Ported as-is (Cardinal Rule 1: port the bug). */
        if ((is_cursed && M_AP_TYPE(mtmp) === M_AP_OBJECT
             && (!oclass || oclass === (MKOBJ_OC_CLASS[mtmp.mappearance | 0] | 0)))
            || (findgold(mtmp.minvent) && (!oclass || oclass === COIN_CLASS))) {
            ct++;
            break;
        }
    }

    const stale = _clear_stale_map_alldetect(oclass);
    if (!stale && !ct) {
        if (!ctu) {
            if (detector)
                await strange_feeling(detector, 'You feel a lack of something.');
            return 1;
        }
        await You(`sense ${stuff} nearby.`);
        return 0;
    }

    if (g._pending_message)
        await force_more(g._pending_message);
    await cls();
    unconstrain_map();
    for (let o = g.level && g.level.buriedobjlist; o; o = o.nobj) {
        if (!oclass || (otmp = _o_in_det(o, oclass)) !== null) {
            if (oclass) {
                if (otmp !== o) { otmp.ox = o.ox; otmp.oy = o.oy; }
                map_object(otmp, 1);
            } else {
                map_object(o, 1);
            }
        }
    }
    for (let x = 1; x < COLNO; x++) {
        for (let y = 0; y < ROWNO; y++) {
            for (let o = g.level?.levelObjects?.[x]?.[y]; o; o = o.nexthere) {
                if ((!oclass && !boulder) || (otmp = _o_in_det(o, oclass)) !== null
                    || (otmp = _o_in_det(o, boulder)) !== null) {
                    if (oclass || boulder) {
                        if (otmp !== o) { otmp.ox = o.ox; otmp.oy = o.oy; }
                        map_object(otmp, 1);
                    } else {
                        map_object(o, 1);
                    }
                    break;
                }
            }
        }
    }
    for (let mtmp = g.fmon; mtmp; mtmp = mtmp.nmon) {
        if ((mtmp.mhp | 0) < 1 || (mtmp.isgd && !mtmp.mx))
            continue;
        for (let o = mtmp.minvent; o; o = o.nobj) {
            if ((!oclass && !boulder) || (otmp = _o_in_det(o, oclass)) !== null
                || (otmp = _o_in_det(o, boulder)) !== null) {
                if (!oclass && !boulder)
                    otmp = o;
                otmp.ox = mtmp.mx;
                otmp.oy = mtmp.my;
                map_object(otmp, 1);
                break;
            }
        }
        if (is_cursed && M_AP_TYPE(mtmp) === M_AP_OBJECT
            && (!oclass || oclass === (MKOBJ_OC_CLASS[mtmp.mappearance | 0] | 0))) {
            /* set_mimic_sym() (js/mklev.js) stores the disguise species flat on
             * the monster, not in mextra; has_mcorpsenm() is MCORPSENM != NON_PM. */
            const mcn = (MCORPSENM(mtmp) !== NON_PM) ? MCORPSENM(mtmp) : (mtmp.mcorpsenm ?? NON_PM);
            const corpsenm = (mcn !== NON_PM) ? mcn : PM_TENGU;
            map_object({ otyp: mtmp.mappearance | 0, quan: 1,
                          ox: mtmp.mx, oy: mtmp.my, corpsenm }, 1);
        } else if (findgold(mtmp.minvent) && (!oclass || oclass === COIN_CLASS)) {
            map_object({ otyp: GOLD_PIECE_OTYP_DET, oclass: COIN_CLASS,
                          quan: rnd(10), ox: mtmp.mx, oy: mtmp.my }, 1);
        }
    }

    /* C detect.c:775-778 tests the displayed glyph, including objects mapped
     * from a steed's inventory or the buried-object chain. */
    let ter_typ = TER_DETECT | TER_OBJ;
    const heroHasObjGlyph = g.level?.at(u.ux, u.uy)?.disp_cls === GLYPHCLS_OBJ;
    if (!heroHasObjGlyph) {
        newsym(u.ux, u.uy);
        ter_typ |= TER_MON;
    }
    await You(`detect the ${ct ? 'presence' : 'absence'} of ${stuff}.`);

    /* C detect.c:782-785 — `if (!ct) display_nhwindow(WIN_MAP, TRUE); else
     * browse_map(ter_typ, "object");`  display_nhwindow(WIN_MAP,...) is not
     * reachable from this module (private to js/cmd.js); browse_map's own
     * body is just a getpos() autodescribe pass (mirrors monster_detect's
     * inline copy above).  The absence arm only acknowledges the message. */
    if (!ct) {
        await force_more(g._pending_message);
    } else {
        g.iflags = g.iflags || {};
        g.iflags.terrainmode = ter_typ;
        /* detect.c:112-117 browse_map: autodescribe forced on, then restored */
        const save_autodescribe = g.iflags.autodescribe;
        g.iflags.autodescribe = true;
        try {
            await getpos({ x: u.ux, y: u.uy }, false, 'object');
        } finally {
            g.iflags.terrainmode = 0;
            g.iflags.autodescribe = save_autodescribe;
        }
    }

    if (g._pending_message) {
        const morc = await force_more(g._pending_message);
        /* No incoming update_topl owns this more(): ESC's WIN_STOP
         * (topl.c:232-235) is live for the turn's later monster plines. */
        if (morc === 27 && g._topl_win_stop_armed) {
            g._topl_win_stop_armed = false;
            g._topl_win_stop = true;
            g._topl_win_stop_buf = g._topl_last_more_committed;
        }
    }
    /* docrt() -> cls() -> clear_nhwindow(WIN_MAP) blanks the physical topline
     * too, so browse_map's standing getpos autodescribe line is gone
     * (detect.c:787, display.c:2196; same as monster_detect above). */
    g._topl_sticky = null;
    await map_redisplay();
    return 0;
}

/* C ref: detect.c:201-221 o_in(obj, oclass) — recursively search obj (and, for
 * a container, its contents) for an object of class `oclass`, first found.
 * SchroedingersBox is excluded because the corpse it might contain hasn't
 * resolved live/dead yet (obj.h SchroedingersBox: LARGE_BOX && spe===1). */
const LARGE_BOX_OTYP_RD = 214;

function _SchroedingersBox_rd(o) {
    return (o.otyp | 0) === LARGE_BOX_OTYP_RD && (o.spe | 0) === 1;
}

function o_in_rd(obj, oclass) {
    if ((obj.oclass | 0) === oclass)
        return obj;
    if (Has_contents(obj) && !_SchroedingersBox_rd(obj)) {
        for (let otmp = obj.cobj; otmp; otmp = otmp.nobj) {
            if ((otmp.oclass | 0) === oclass)
                return otmp;
            if (Has_contents(otmp)) {
                const temp = o_in_rd(otmp, oclass);
                if (temp)
                    return temp;
            }
        }
    }
    return null;
}

const FOOD_CLASS_RD = 7, POTION_CLASS_RD = 8;

/* C detect.c:262-306 check_map_spot(x, y, oclass, 0): glyph_at reads the
 * displayed glyph; glyph_to_obj decodes its type regardless of symset. */
function _check_map_spot_rd(x, y, oclass) {
    const g = game;
    const loc = g.level && g.level.at ? g.level.at(x, y) : null;
    if (!loc || loc.disp_cls !== GLYPHCLS_OBJ)
        return false;
    if (!oclass || MKOBJ_OC_CLASS[loc.disp_obj_otyp] !== oclass)
        return false;
    for (let otmp = g.level.levelObjects?.[x]?.[y] ?? null; otmp; otmp = otmp.nexthere)
        if (o_in_rd(otmp, oclass))
            return false;
    const mtmp = m_at(x, y);
    if (mtmp)
        for (let otmp = mtmp.minvent; otmp; otmp = otmp.nobj)
            if (o_in_rd(otmp, oclass))
                return false;
    return true;
}

/* C ref: detect.c:318-330 clear_stale_map(oclass, 0). RNG-free. */
function clear_stale_map_rd(oclass) {
    let change_made = false;
    for (let zx = 1; zx < COLNO; zx++) {
        for (let zy = 0; zy < ROWNO; zy++) {
            if (_check_map_spot_rd(zx, zy, oclass)) {
                unmap_object(zx, zy);
                change_made = true;
            }
        }
    }
    return change_made;
}

/* C ref: detect.c:70-82 unconstrain_map() / detect.c:85-90 reconstrain_map() --
 * bring a swallowed/buried/underwater hero out to (and back from) the normal
 * map for the duration of a detection's display. */
function unconstrain_map_rd() {
    const g = game, u = g.u || {};
    const res = !!(u.uinwater || u.uburied || u.uswallow);
    g.iflags = g.iflags || {};
    g.iflags.save_uinwater = u.uinwater; u.uinwater = 0;
    g.iflags.save_uburied = u.uburied; u.uburied = 0;
    g.iflags.save_uswallow = u.uswallow; u.uswallow = 0;
    return res;
}

function reconstrain_map_rd() {
    const g = game, u = g.u || {};
    const saved = {
        uinwater: !!g.iflags?.save_uinwater,
        uburied: !!g.iflags?.save_uburied,
        uswallow: !!g.iflags?.save_uswallow,
    };
    u.uinwater = g.iflags?.save_uinwater; if (g.iflags) g.iflags.save_uinwater = 0;
    u.uburied = g.iflags?.save_uburied; if (g.iflags) g.iflags.save_uburied = 0;
    u.uswallow = g.iflags?.save_uswallow; if (g.iflags) g.iflags.save_uswallow = 0;
    return saved;
}

async function map_redisplay_rd() {
    const saved = reconstrain_map_rd();
    if (game._pending_message) {
        const morc = await force_more(game._pending_message);
        /* docrt()'s flush is a separate blocking display_nhwindow; ESC there
         * sets WIN_STOP (topl.c more():232-235), so later plines this turn
         * are buffered, not painted. */
        /* topl.c:264 more(): ESC on this cls() page sets WIN_STOP, so later
         * plines this turn (mattacku) are buffered, not painted. */
        if (morc === 27) {
            game._topl_win_stop = true;
            game._topl_win_stop_armed = false;
        }
    }
    await docrt();
    /* docrt -> cls() -> clear_nhwindow(WIN_MAP) is tty clear_screen() (wintty.c
     * tty_clear_nhwindow NHW_MAP), which wipes the physical topline too, so the
     * getpos autodescribe line browse_map left standing (_topl_sticky) is gone. */
    game._topl_sticky = null;
    // C detect.c:101-102 restores the constrained view after docrt().
    if (saved.uinwater)
        await under_water(2);
    if (saved.uburied)
        await under_ground(2);
}

/* C ref: detect.c:106-118 browse_map(ter_typ, ter_explain) -- getpos()'s
 * autodescribe pass over whatever is currently shown on the map. */
async function browse_map_rd(ter_typ, ter_explain) {
    const g = game, u = g.u || {};
    const dummy_pos = { x: u.ux | 0, y: u.uy | 0 };
    g.iflags = g.iflags || {};
    const save_autodescribe = g.iflags.autodescribe;
    g.iflags.autodescribe = true;
    g.iflags.terrainmode = ter_typ;
    await getpos(dummy_pos, false, ter_explain);
    g.iflags.terrainmode = 0;
    g.iflags.autodescribe = save_autodescribe;
}

/* C ref: detect.c:479-591 food_detect(sobj) -- "returns 1 if nothing was
 * detected, 0 if something was detected".  sobj is null for the crystal-ball
 * caller (not reached from seffects, which always passes the scroll/spell). */
export async function food_detect(sobj) {
    const g = game, u = g.u || {};
    let ct = 0, ctu = 0;
    const confused = (_Confusion() !== 0) || !!(sobj && sobj.cursed);
    const oclass = confused ? POTION_CLASS_RD : FOOD_CLASS_RD;
    const what = confused ? 'something' : 'food';

    const stale = clear_stale_map_rd(oclass);
    if (u.usteed) { u.usteed.mx = u.ux; u.usteed.my = u.uy; }

    for (let obj = g.fobj; obj; obj = obj.nobj)
        if (o_in_rd(obj, oclass)) {
            if (u_at(obj.ox | 0, obj.oy | 0)) ctu++; else ct++;
        }
    for (let mtmp = g.fmon; mtmp && (!ct || !ctu); mtmp = mtmp.nmon) {
        if ((mtmp.mhp | 0) < 1 || (mtmp.isgd && !mtmp.mx))
            continue;
        for (let obj = mtmp.minvent; obj; obj = obj.nobj) {
            if (o_in_rd(obj, oclass)) {
                if (u_at(mtmp.mx | 0, mtmp.my | 0)) ctu++; else ct++;
                break;
            }
        }
    }

    if (!ct && !ctu) {
        g._gk_known = stale && !confused;
        if (stale) {
            if (g._pending_message) await force_more(g._pending_message);
            await docrt();
            await You('sense a lack of %s nearby.', what);
            if (sobj && sobj.blessed) {
                if (!u.uedibility)
                    await Your('%s starts to tingle.', food_body_part(NOSE));
                u.uedibility = 1;
            }
        } else if (sobj) {
            const tingle = (sobj.blessed && !u.uedibility) ? ' then starts to tingle' : '';
            const buf = `Your ${food_body_part(NOSE)} twitches${tingle}.`;
            if (sobj.blessed && !u.uedibility) {
                const savebeginner = !!(g.flags && g.flags.beginner);
                if (g.flags) g.flags.beginner = false;
                await _strange_feeling(sobj, buf);
                if (g.flags) g.flags.beginner = savebeginner;
                u.uedibility = 1;
            } else {
                await _strange_feeling(sobj, buf);
            }
        }
        return !stale;
    } else if (!ct) {
        g._gk_known = true;
        await You('%s %s nearby.', sobj ? 'smell' : 'sense', what);
        if (sobj && sobj.blessed) {
            if (!u.uedibility)
                await Your('%s starts to tingle.', food_body_part(NOSE));
            u.uedibility = 1;
        }
    } else {
        g._gk_known = true;
        /* cls() (display.c:2064-2072) clears WIN_MAP only, never the message
         * window -- but this port's cls() also zeroes _pending_message (see
         * its own comment), which C's does not.  Page the still-pending
         * "As you read the scroll, it disappears." here, the same guard
         * js/potion.js's object_detect and js/cmd.js's reveal_terrain use
         * around their own cls()/docrt(), so the message this port would
         * otherwise silently drop instead pages exactly as C's next pline()
         * (the "smell food" one below) would force it via update_topl's
         * overflow check. */
        if (g._pending_message)
            await force_more(g._pending_message);
        await cls();
        const wasConstrained = unconstrain_map_rd();
        try {
            for (let obj = g.fobj; obj; obj = obj.nobj) {
                const temp = o_in_rd(obj, oclass);
                if (temp) {
                    if (temp !== obj) { temp.ox = obj.ox; temp.oy = obj.oy; }
                    map_object(temp, 1);
                }
            }
            for (let mtmp = g.fmon; mtmp; mtmp = mtmp.nmon) {
                if ((mtmp.mhp | 0) < 1 || (mtmp.isgd && !mtmp.mx))
                    continue;
                for (let obj = mtmp.minvent; obj; obj = obj.nobj) {
                    const temp = o_in_rd(obj, oclass);
                    if (temp) {
                        temp.ox = mtmp.mx; temp.oy = mtmp.my;
                        map_object(temp, 1);
                        break;
                    }
                }
            }
            let ter_typ = TER_DETECT | TER_OBJ;
            if (!ctu) {
                newsym(u.ux | 0, u.uy | 0);
                ter_typ |= TER_MON;
            }
            if (sobj) {
                if (sobj.blessed) {
                    await Your('%s %s to tingle and you smell %s.', food_body_part(NOSE),
                               u.uedibility ? 'continues' : 'starts', what);
                    u.uedibility = 1;
                } else {
                    await Your('%s tingles and you smell %s.', food_body_part(NOSE), what);
                }
            } else {
                await You('sense %s.', what);
            }
            exercise(A_WIS, true);

            await browse_map_rd(ter_typ, 'food');

            await map_redisplay_rd();
        } finally {
            // map_redisplay_rd() consumes the saved flags; if an earlier
            // display/message operation throws, restore them here instead.
            if (wasConstrained && (g.iflags?.save_uinwater
                                   || g.iflags?.save_uburied
                                   || g.iflags?.save_uswallow))
                reconstrain_map_rd();
        }
    }
    return 0;
}

function _oc_material_gd(o) { return MKOBJ_OC_MATERIAL_GD[o.otyp | 0] | 0; }

/* C detect.c:229-246 o_material() */
function o_material_gd(obj, material) {
    if (_oc_material_gd(obj) === material)
        return obj;
    if (Has_contents(obj)) {
        for (let otmp = obj.cobj; otmp; otmp = otmp.nobj) {
            if (_oc_material_gd(otmp) === material)
                return otmp;
            else if (Has_contents(otmp)) {
                const temp = o_material_gd(otmp, material);
                if (temp) return temp;
            }
        }
    }
    return null;
}

/* C detect.c:262-306 check_map_spot(x, y, COIN_CLASS, material) */
function _check_map_spot_gd(x, y, material) {
    const g = game;
    const loc = g.level && g.level.at ? g.level.at(x, y) : null;
    const rg = loc && loc.remembered_glyph;
    if (!rg || rg.cls !== GLYPHCLS_OBJ)
        return false;
    /* C detect.c:275-291 decodes glyph_to_obj(glyph): the remembered otyp's
     * oc_material / oc_class, not the rendered symbol (a boulder symbol may
     * be '$').  Gold piece is the only COIN_CLASS object. */
    if (rg.otyp != null) {
        const ot = rg.otyp | 0;
        if (material ? (MKOBJ_OC_MATERIAL_GD[ot] | 0) !== material : ot !== GOLD_PIECE_GD)
            return false;
    } else if (rg.ch !== '$')
        return false;
    const here = g.level.levelObjects?.[x]?.[y] ?? null;
    if (material) {
        for (let o = here; o; o = o.nexthere)
            if (o_material_gd(o, GOLD_MAT_GD)) return false;
        const mt = m_at(x, y);
        if (mt) for (let o = mt.minvent; o; o = o.nobj)
            if (o_material_gd(o, GOLD_MAT_GD)) return false;
        return true;
    }
    for (let o = here; o; o = o.nexthere)
        if (o_in_rd(o, COIN_CLASS_GD)) return false;
    const mt = m_at(x, y);
    if (mt) for (let o = mt.minvent; o; o = o.nobj)
        if (o_in_rd(o, COIN_CLASS_GD)) return false;
    return true;
}

function _clear_stale_map_gd(material) {
    let change_made = false;
    for (let zx = 1; zx < COLNO; zx++)
        for (let zy = 0; zy < ROWNO; zy++)
            if (_check_map_spot_gd(zx, zy, material)) {
                unmap_object(zx, zy);
                change_made = true;
            }
    return change_made;
}

/* C detect.c:341-475 gold_detect(sobj): returns 1 if nothing was detected. */
export async function gold_detect(sobj) {
    const g = game, u = g.u || {};
    let temp = null, ugold = false, steedgold = false;
    let ter_typ = TER_DETECT | TER_OBJ;
    const blessed = !!sobj.blessed;
    const stale = _clear_stale_map_gd(blessed ? GOLD_MAT_GD : 0);
    g._gk_known = stale;
    let outgoldmap = false;

    for (let mtmp = g.fmon; mtmp && !outgoldmap; mtmp = mtmp.nmon) {
        if ((mtmp.mhp | 0) < 1 || (mtmp.isgd && !mtmp.mx)) continue;
        if (findgold_gd(mtmp.minvent) || (mtmp.mnum | 0) === PM_GOLD_GOLEM_GD) {
            if (mtmp === u.usteed) steedgold = true;
            else { g._gk_known = true; outgoldmap = true; }
        } else {
            for (let obj = mtmp.minvent; obj && !outgoldmap; obj = obj.nobj)
                if ((blessed && o_material_gd(obj, GOLD_MAT_GD))
                    || o_in_rd(obj, COIN_CLASS_GD)) {
                    if (mtmp === u.usteed) steedgold = true;
                    else { g._gk_known = true; outgoldmap = true; }
                }
        }
    }
    if (!outgoldmap) {
        for (let obj = g.fobj; obj; obj = obj.nobj) {
            if (blessed && o_material_gd(obj, GOLD_MAT_GD)) {
                g._gk_known = true;
                if ((obj.ox | 0) !== (u.ux | 0) || (obj.oy | 0) !== (u.uy | 0)) { outgoldmap = true; break; }
            } else if (o_in_rd(obj, COIN_CLASS_GD)) {
                g._gk_known = true;
                if ((obj.ox | 0) !== (u.ux | 0) || (obj.oy | 0) !== (u.uy | 0)) { outgoldmap = true; break; }
            }
        }
    }

    if (!outgoldmap) {
        if (!g._gk_known) {
            let buf;
            if ((u.umonnum | 0) === PM_GOLD_GOLEM_GD && u.umonnum != null)
                buf = `You feel like a million ${currency_gd(2)}!`;
            else if (money_cnt_gd(g.invent) || hidden_gold_gd(true))
                buf = 'You feel worried about your future financial situation.';
            else if (steedgold)
                buf = `You feel interested in ${s_suffix(x_monnam_gd(u.usteed,
                    u.usteed.mtame ? ARTICLE_YOUR_GD : ARTICLE_THE_GD, null,
                    SUPPRESS_SADDLE_GD, false))} financial situation.`;
            else
                buf = 'You feel materially poor.';
            await _strange_feeling(sobj, buf);
            return 1;
        }
        if (stale) {
            /* C detect.c:409: docrt() reaches cls(), which flushes the
             * message window before repainting the map (display.c:1748,2196;
             * wintty.c:1873-1880). The swallowed/underwater/buried branches
             * also reach cls() through their mode-1 helpers (display.c:1338,
             * 1407,1455). Preserve docrt_flags' early bypass as well. */
            if (u.ux && !g.program_state?.in_docrt && g._pending_message)
                await force_more(g._pending_message);
            await docrt();
        }
        await You('notice some gold between your %s.', makeplural(food_body_part(FOOT_GD)));
        return 0;
    }

    /* outgoldmap: */
    if (g._pending_message) await force_more(g._pending_message);
    await cls();
    const wasConstrained = unconstrain_map_rd();
    try {
        for (let obj = g.fobj; obj; obj = obj.nobj) {
            if (blessed && (temp = o_material_gd(obj, GOLD_MAT_GD)) != null) {
                if (temp !== obj) { temp.ox = obj.ox; temp.oy = obj.oy; }
                map_object(temp, 1);
            } else if ((temp = o_in_rd(obj, COIN_CLASS_GD)) != null) {
                if (temp !== obj) { temp.ox = obj.ox; temp.oy = obj.oy; }
                map_object(temp, 1);
            }
            if (temp && u_at(temp.ox | 0, temp.oy | 0)) ugold = true;
        }
        for (let mtmp = g.fmon; mtmp; mtmp = mtmp.nmon) {
            if ((mtmp.mhp | 0) < 1 || (mtmp.isgd && !mtmp.mx)) continue;
            temp = null;
            if (findgold_gd(mtmp.minvent) || (mtmp.mnum | 0) === PM_GOLD_GOLEM_GD) {
                const gold = { otyp: GOLD_PIECE_GD, oclass: COIN_CLASS_GD, quan: rnd(10),
                               ox: mtmp.mx, oy: mtmp.my, o_id: 0, nobj: null, cobj: null };
                map_object(gold, 1);
                temp = gold;
            } else {
                for (let obj = mtmp.minvent; obj; obj = obj.nobj)
                    if (blessed && (temp = o_material_gd(obj, GOLD_MAT_GD)) != null) {
                        temp.ox = mtmp.mx; temp.oy = mtmp.my;
                        map_object(temp, 1);
                        break;
                    } else if ((temp = o_in_rd(obj, COIN_CLASS_GD)) != null) {
                        temp.ox = mtmp.mx; temp.oy = mtmp.my;
                        map_object(temp, 1);
                        break;
                    }
            }
            if (temp && u_at(temp.ox | 0, temp.oy | 0)) ugold = true;
        }
        if (!ugold) {
            newsym(u.ux | 0, u.uy | 0);
            ter_typ |= TER_MON;
        }
        await You_feel('very greedy, and sense gold!');
        exercise(A_WIS, true);

        await browse_map_rd(ter_typ, 'gold');

        await map_redisplay_rd();
    } finally {
        if (wasConstrained && (g.iflags?.save_uinwater
                               || g.iflags?.save_uburied
                               || g.iflags?.save_uswallow))
            reconstrain_map_rd();
    }
    return 0;
}

const OTRAP_NONE_RD = 0, OTRAP_HERE_RD = 1, OTRAP_THERE_RD = 2;

const CHEST_OTYP_RD = 215;

function _Is_box_rd(otmp) {
    const otyp = otmp.otyp | 0;
    return otyp === LARGE_BOX_OTYP_RD || otyp === CHEST_OTYP_RD;
}

/* C detect.c:907-953 detect_obj_traps(list, FALSE, 0, NULL): OTRAP_NONE=0,
 * OTRAP_HERE=1, OTRAP_THERE=2.  Only the show_them == FALSE scan is ported. */
function _detect_obj_traps_scan(objlist, show_them = false, how = 0) {
    const u = game.u || {};
    let result = OTRAP_NONE_RD;
    for (let otmp = objlist; otmp; otmp = otmp.nobj) {
        const isbox = _Is_box_rd(otmp);
        const xp = { value: 0 }, yp = { value: 0 };
        if ((isbox && otrapped_of(otmp)) || Has_contents(otmp)) {
            if (!get_obj_location(otmp, xp, yp, BURIED_TOO | CONTAINED_TOO)
                || !isok(xp.value, yp.value)) continue;
        }
        if (isbox && otrapped_of(otmp)) {
            otmp.tknown = 1; /* C detect.c:934 */
            observe_object(otmp);
            const x = xp.value, y = yp.value;
            result |= (x === (u.ux | 0) && y === (u.uy | 0)) ? OTRAP_HERE_RD : OTRAP_THERE_RD;
            if (show_them) /* C detect.c:938-942: dummytrap.ttyp == TRAPPED_CHEST */
                _sense_trap({ tx: x, ty: y, ttyp: TRAPPED_CHEST_RD }, x, y, how);
        }
        if (Has_contents(otmp))
            result |= _detect_obj_traps_scan(otmp.cobj, show_them, how);
    }
    return result;
}

const TRAPPED_CHEST_RD = 25, TRAPPED_DOOR_RD = 24;

/* C detect.c:956-1003 display_trap_map(cursed_src) */
async function display_trap_map(cursed_src) {
    const g = game, u = g.u || {};
    let ter_typ = TER_DETECT | (cursed_src ? TER_OBJ : TER_TRP);
    if (g._pending_message) await force_more(g._pending_message);
    await cls();
    const wasConstrained = unconstrain_map_rd();
    g._sensed_at_hero = false;
    try {
        _detect_obj_traps_scan(g.level?.buriedobjlist, true, cursed_src);
        _detect_obj_traps_scan(g.fobj, true, cursed_src);
        for (let mon = g.fmon; mon; mon = mon.nmon) {
            if ((mon.mhp | 0) < 1 || (mon.isgd && !mon.mx)) continue;
            _detect_obj_traps_scan(mon.minvent, true, cursed_src);
        }
        _detect_obj_traps_scan(g.invent, true, cursed_src);
        for (let t = g.ftrap; t; t = t.ntrap)
            _sense_trap(t, 0, 0, cursed_src);
        const doors = g.level?.doors || [];
        for (let d = 0; d < (g.level?.doorindex | 0) && d < doors.length; d++) {
            const cc = doors[d];
            const loc = g.level.at ? g.level.at(cc.x, cc.y) : null;
            if (!loc || (loc.typ | 0) === SDOOR) continue;
            if ((loc.doormask | 0) & D_TRAPPED_RD)
                _sense_trap({ tx: cc.x, ty: cc.y, ttyp: TRAPPED_DOOR_RD }, cc.x, cc.y, cursed_src);
        }
        if (!g._sensed_at_hero) {
            newsym(u.ux | 0, u.uy | 0);
            ter_typ |= TER_MON;
        }
        await You_feel(cursed_src ? 'very greedy.' : 'entrapped.');
        await browse_map_rd(ter_typ, cursed_src ? 'gold' : 'trap of interest');
        await map_redisplay_rd();
    } finally {
        if (wasConstrained && (g.iflags?.save_uinwater
                               || g.iflags?.save_uburied
                               || g.iflags?.save_uswallow))
            reconstrain_map_rd();
    }
}

/* C detect.c:1010-1077 trap_detect(sobj): returns 1 if nothing was detected.
 * The display arm is display_trap_map above. */
export async function trap_detect(sobj) {
    const g = game, u = g.u || {};
    let found = false;
    const cursed_src = sobj && sobj.cursed ? 1 : 0;
    if (u.usteed) { u.usteed.mx = u.ux; u.usteed.my = u.uy; }
    for (let t = g.ftrap; t; t = t.ntrap) {
        if ((t.tx | 0) !== (u.ux | 0) || (t.ty | 0) !== (u.uy | 0))
        { await display_trap_map(cursed_src); return 0; }
        found = true;
    }
    const lists = [g.fobj, g.level?.buriedobjlist];
    for (let mon = g.fmon; mon; mon = mon.nmon) {
        if ((mon.mhp | 0) < 1 || (mon.isgd && !mon.mx)) continue;
        lists.push(mon.minvent);
    }
    for (const l of lists) {
        const tr = _detect_obj_traps_scan(l);
        if (tr & OTRAP_THERE_RD) { await display_trap_map(cursed_src); return 0; }
        if (tr) found = true;
    }
    if (_detect_obj_traps_scan(g.invent)) found = true;
    const doors = g.level?.doors || [];
    for (let d = 0; d < (g.level?.doorindex | 0) && d < doors.length; d++) {
        const cc = doors[d];
        const loc = g.level.at ? g.level.at(cc.x, cc.y) : null;
        if (!loc || (loc.typ | 0) === SDOOR) continue;
        if ((loc.doormask | 0) & D_TRAPPED_RD) {
            if (cc.x !== (u.ux | 0) || cc.y !== (u.uy | 0))
            { await display_trap_map(cursed_src); return 0; }
            found = true;
        }
    }
    if (!found) {
        await _strange_feeling(sobj, `Your ${makeplural(food_body_part(TOE_RD))} stop itching.`);
        return 1;
    }
    await Your('%s itch.', makeplural(food_body_part(TOE_RD)));
    return 0;
}

/* C ref: detect.c:1373 show_map_spot(x,y,cnf) — reveal one cell during mapping.
 * cnf (Confusion) is FALSE here, so no rn2(7) skip fires.  Sets seenv=SVALL,
 * converts secret corridors to corridors, then forces the remembered terrain
 * glyph and re-renders via newsym. */
export function show_map_spot(loc, x, y, cnf) {
    if (!loc) return;
    if (cnf && rn2(7)) return; /* C detect.c:1381 — not taken (cnf=0) */
    loc.seenv = SVALL; /* C detect.c:1383 */
    if (loc.typ === SCORR) { /* C detect.c:1388-1391 */
        loc.typ = CORR;
        unblock_point(x, y); /* C detect.c:1390 */
    }
    const oldCls = loc.disp_cls;
    const oldRemembered = loc.remembered_glyph;
    const oldGlyph = { ch: loc.disp_glyph_ch ?? loc.disp_ch, color: loc.disp_glyph_color ?? loc.disp_color, decgfx: loc.disp_glyph_decgfx ?? !!loc.disp_decgfx,
                       cls: oldCls, attr: loc.disp_attr | 0,
                       /* the glyph NUMBER carries piletop-ness (MG_OBJPILE) */
                       objpile: !!loc.disp_obj_pile && oldCls === GLYPHCLS_OBJ,
                       /* the glyph number encodes the object type (and a statue's
                          or corpse's species), which object farlook decodes */
                       otyp: loc.disp_obj_otyp, corpsenm: loc.disp_obj_corpsenm, ttyp: loc.disp_trap_type };
    /* C detect.c:1400-1405: hero_memory path — magic_map_background then newsym. */
    if (game.level?.flags?.hero_memory) {
        magic_map_background(loc, x, y);
        newsym(x, y);
    } else {
        /* C detect.c:1403-1405 — no hero_memory: magic_map_background(x,y,1) displays it */
        magic_map_background(loc, x, y, true);
    }
    /* C detect.c:1406-1416 — "force the real background, then if it's not
     * furniture and there's a KNOWN trap there, display the trap, else if there
     * was an object shown there, redisplay the object.  So during mapping,
     * furniture takes precedence over traps, which take precedence over objects,
     * opposite to how normal vision behaves." */
    if (!IS_FURNITURE(loc.typ)) {
        const t = t_at(x, y);
        let ep;
        if (t !== null && (t.tseen | 0)) {
            map_trap(t, 1);                               /* C detect.c:1408 */
        } else if ((ep = engr_at(x, y)) !== null && !cnf) {
            map_engraving(ep, 1);                         /* C detect.c:1410 */
        } else if (oldCls === GLYPHCLS_TRAP || oldCls === GLYPHCLS_OBJ) {
            /* C detect.c:1412-1414 show_glyph(x,y,oldglyph) + (hero_memory)
             * lev->glyph = oldglyph — put back the trap/object the background
             * overwrite just wiped. */
            show_glyph_cell(x, y, oldGlyph.ch, oldGlyph.color, oldGlyph.decgfx,
                            objpile_attr(oldGlyph.objpile), oldCls,
                            false, oldGlyph.otyp, oldGlyph.corpsenm, oldGlyph.ttyp, null,
                            oldGlyph.objpile);
            /* lev->glyph = oldglyph keeps the glyph ID: a hallucinated object memory
             * (random_obj_to_glyph) must not be re-derived from otyp later. */
            if (game.level?.flags?.hero_memory && oldRemembered && oldRemembered.cls === oldCls
                && oldRemembered.otyp === oldGlyph.otyp && oldRemembered.ch === oldGlyph.ch)
                loc.remembered_glyph = oldRemembered;
            else if (game.level?.flags?.hero_memory)
                loc.remembered_glyph = { ch: oldGlyph.ch, color: oldGlyph.color,
                                         decgfx: oldGlyph.decgfx, cls: oldCls,
                                         otyp: oldGlyph.otyp,
                                         objpile: oldGlyph.objpile,
                                         /* null (no species) must read as undefined: a hallucinated
                                          * rock-class STATUE glyph (display.h random_obj_to_glyph)
                                          * is told from a real statue by having no corpsenm */
                                         corpsenm: oldGlyph.corpsenm ?? undefined, ttyp: oldGlyph.ttyp };
        }
    }
    if (!cnf && (loc.roomno | 0) >= ROOMOFFSET)
        room_discovered((loc.roomno | 0) - ROOMOFFSET);
}

/* C ref: detect.c:1423 do_mapping() — reveal the whole level into memory, then
 * exercise(A_WIS).  cnf = Confusion (FALSE here).  After revealing, docrt()
 * re-renders the map from the freshly-set remembered glyphs. */
export async function do_mapping() {
    const g = game;
    const cnf = _Confusion(); /* C detect.c:1430 show_map_spot(zx, zy, Confusion) */
    /* C detect.c:1427 unconstrained = unconstrain_map() — an underwater / buried
     * / engulfed hero is brought out to the normal map first. */
    const unconstrained = unconstrain_map_rd();
    for (let zx = 1; zx < COLNO; zx++) {
        for (let zy = 0; zy < ROWNO; zy++) {
            const loc = g.level?.at(zx, zy);
            if (loc) show_map_spot(loc, zx, zy, cnf);
        }
    }
    if (!g.level?.flags?.hero_memory || unconstrained) {
        /* C detect.c:1432-1438 */
        await flush_screen(1);
        await browse_map_rd(TER_DETECT | TER_MAP | TER_TRP | TER_OBJ,
                            'anything of interest');
        await map_redisplay_rd();
    } else {
        reconstrain_map_rd();
        /* C display.c:2033-2052: unchanged glyphs do not print again.
         * flush_screen's pending row-20 glyphs retire the status coverage
         * only when show_map_spot actually changed that row. */
    }
    /* C detect.c:1443: exercise(A_WIS, TRUE) → rn2(19) */
    exercise(A_WIS, true);
}
