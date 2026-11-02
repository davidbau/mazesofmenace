// detect.js — detection redraw helpers and clairvoyance map scan.
// C ref: nethack-c-v5/upstream/src/detect.c.
import { game } from './gstate.js';
import { COLNO, ROWNO, POOL, MOAT, WATER, LAVAPOOL, LAVAWALL,
         TER_DETECT, TER_MAP, TER_TRP, TER_OBJ, TER_MON, I_SPECIAL, IN_SIGHT,
         CLAIRVOYANT, CONFUSION, DETECT_MONSTERS, SVALL, COULD_SEE } from './const.js';
import { force_more, flush_screen, docrt, map_invisible, map_object, see_monsters, canspotmon, newsym, GLYPHCLS_MON, GLYPHCLS_INVIS, GLYPHCLS_CMAP, GLYPHCLS_TRAP, GLYPHCLS_ENGR } from './display.js';
import { pline } from './pline.js';
import { Blind } from './vision.js';
import { show_map_spot } from './read.js';
import { browse_map } from './cmd.js';
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
import { seemimic } from './mhitm.js'; // relocate-fns
import { magic_map_background, sense_trap } from './read.js'; // relocate-fns
import { NO_COLOR } from './terminal.js'; // relocate-fns
import { t_at } from './trap.js'; // relocate-fns
import { do_clear_area, recalc_block_point, unblock_point } from './vision.js'; // relocate-fns
import { DEADMONSTER } from './zap.js'; // relocate-fns
import { STONE, W_NONDIGGABLE, W_NONPASSWALL } from './const.js'; // relocate-fns
import { map_background, map_trap } from './display.js'; // relocate-fns
import { sobj_at } from './invent.js'; // relocate-fns
import { BOULDER } from './sp_lev.js'; // relocate-fns
import { D_NODOOR, Is_rogue_level, WM_MASK } from './const.js'; // relocate-fns

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
const Is_box = (o) => o && (((o.otyp | 0) === LARGE_BOX) || ((o.otyp | 0) === CHEST));
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
        const box = Is_box(otmp);
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
