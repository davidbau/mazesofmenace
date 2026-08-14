// detect.js — magic detection / search helpers.
// C ref: detect.c.  Ports findit() (secret-door-detection wand / detect-unseen
// spell), which scans the area around the hero for hidden doors, corridors,
// traps and monsters, reveals them, and reports what (if anything) was found.

import { game } from './gstate.js';
import { pline, newsym, terrain_background_glyph, show_glyph_cell,
         object_glyph, vobj_at, trap_glyph, engraving_glyph } from './display.js';
import { engr_at } from './engrave.js';
import { couldsee } from './vision.js';
import { exercise } from './attrib.js';
import { COLNO, ROWNO, BOLT_LIM, SDOOR, SCORR, DOOR, CORR, A_WIS, IS_FURNITURE,
         STONE, W_NONDIGGABLE, W_NONPASSWALL } from './const.js';
import { BOULDER, COIN_CLASS, GOLD_PIECE, objects } from './mkobj.js';
import { NO_COLOR, CLR_WHITE } from './terminal.js';
import { rnd } from './rng.js';

// objclass.h obj_material_types GOLD == 15 (the blessed-scroll "any gold
// object" scan, o_material(obj, GOLD)).
const GOLD_MATERIAL = 15;

// C ref: detect.c findone — reveal a single hidden feature at (zx,zy).
function findone(zx, zy, found) {
    const lev = game.level?.at(zx, zy);
    if (!lev) return;

    if (lev.typ === SDOOR) {
        lev.typ = DOOR;
        newsym(zx, zy);
        found.num_sdoors++;
    } else if (lev.typ === SCORR) {
        lev.typ = CORR;
        newsym(zx, zy);
        found.num_scorrs++;
    }

    const ttmp = (game.level?.traps || []).find(t => t.tx === zx && t.ty === zy);
    if (ttmp && !ttmp.tseen && ttmp.ttyp !== undefined) {
        ttmp.tseen = true;
        newsym(zx, zy);
        found.num_traps++;
    }
    // Hidden / invisible monster detection is not modeled (no such monsters
    // on the covered starting levels), so num_mons stays 0.
}

// C ref: vision.c do_clear_area — apply findone to each cell within range that
// the hero couldsee.  Approximated with a square scan clamped to the bolt
// circle radius; on the covered starts nothing is hidden so exact circle
// geometry is immaterial.
function do_clear_area(scol, srow, range, found) {
    const maxY = Math.min(srow + range, ROWNO - 1);
    const minY = Math.max(srow - range, 0);
    for (let y = minY; y <= maxY; y++) {
        const offset = range;
        const minX = Math.max(scol - offset, 1);
        const maxX = Math.min(scol + offset, COLNO - 1);
        for (let x = minX; x <= maxX; x++)
            if (couldsee(x, y))
                findone(x, y, found);
    }
}

// C ref: detect.c findit — reveal nearby hidden things and report.  Returns
// the count found.
export async function findit() {
    if (game.u?.uswallow) return 0;

    const found = { num_sdoors: 0, num_scorrs: 0, num_traps: 0, num_mons: 0 };
    do_clear_area(game.u.ux, game.u.uy, BOLT_LIM, found);

    const k = (found.num_sdoors ? 1 : 0) + (found.num_scorrs ? 1 : 0)
            + (found.num_traps ? 1 : 0) + (found.num_mons ? 1 : 0);
    let buf = '';
    let num = 0;
    if (found.num_sdoors) {
        buf += found.num_sdoors > 1 ? `${found.num_sdoors} secret doors` : 'a secret door';
        num += found.num_sdoors;
    }
    if (found.num_scorrs) {
        if (buf) buf += (k === 2) ? ' and ' : ', ';
        buf += found.num_scorrs > 1 ? `${found.num_scorrs} secret corridors` : 'a secret corridor';
        num += found.num_scorrs;
    }
    if (found.num_traps) {
        if (buf) buf += (k === 3 && !found.num_mons) ? ', and ' : (k === 2) ? ' and ' : ', ';
        buf += found.num_traps > 1 ? `${found.num_traps} traps` : 'a trap';
        num += found.num_traps;
    }
    if (found.num_mons) {
        if (buf) buf += (k > 2) ? ', and ' : ' and ';
        buf += found.num_mons > 1 ? `${found.num_mons} hidden monsters` : 'a hidden monster';
        num += found.num_mons;
    }
    if (buf)
        await pline(`You reveal ${buf}!`);

    if (!num)
        await pline("You don't find anything.");

    return num;
}

// C ref: detect.c show_map_spot — reveal one cell's terrain into hero memory.
// Secret corridors are exposed (but not secret doors).  Furniture/traps/objects
// layering is simplified to the terrain background, which covers the open-room
// starting levels.  No RNG in the non-confused case.
function show_map_spot(x, y) {
    const lev = game.level?.at(x, y);
    if (!lev) return;
    lev.seenv = 0xff;
    if (lev.typ === SCORR)
        lev.typ = CORR;

    // C ref: detect.c show_map_spot — "force the real background, then if it's
    // not furniture and there's a known trap there, display the trap, else if
    // there was an object shown there, redisplay the object.  So during mapping,
    // furniture takes precedence over traps, which take precedence over objects,
    // opposite to how normal vision behaves."
    let bg = terrain_background_glyph(lev, x, y);
    if (!IS_FURNITURE(lev.typ)) {
        const t = (game.level?.traps || []).find((tr) => tr.tx === x && tr.ty === y);
        const ep = engr_at(x, y);
        if (t && t.tseen) {
            bg = trap_glyph(t);
        } else if (ep) {
            ep.erevealed = 1;                     /* map_engraving(ep, 1) */
            bg = engraving_glyph(lev);
        }
        // C's third arm restores a previously-shown trap/object glyph via
        // glyph_is_trap(oldglyph)/glyph_is_object(oldglyph); this port's
        // remembered_glyph carries no glyph-kind tag, so it is left out rather
        // than guessed at.
    }
    // Remember the background so the cell shows even out of sight (matches the
    // dim "magic-mapped" rendering once the hero looks away).
    lev.remembered_glyph = { ch: bg.ch, color: bg.color, decgfx: bg.dec, mapped: true };
    // Redraw via newsym so visible cells stay live and remembered ones appear.
    newsym(x, y);
    if (lev.disp_ch === ' ' || lev.disp_ch == null)
        show_glyph_cell(x, y, bg.ch, bg.color, bg.dec);
}

// C ref: detect.c do_mapping — reveal the whole level into hero memory, then
// exercise Wisdom (rn2(19) via exercise).
export async function do_mapping() {
    for (let x = 1; x < COLNO; x++)
        for (let y = 0; y < ROWNO; y++)
            show_map_spot(x, y);
    exercise(A_WIS, true);
}

// C ref: detect.c gold_detect(sobj) — the scroll/spell of gold detection.
// Returns TRUE when nothing was detected (C's caller then does the
// strange_feeling()/useup); FALSE when the gold map was shown.
//
// This whole command was previously unported, so seffects() fell through its
// default and the browse_map() cursor loop never ran — the keystrokes C feeds
// to getpos then reached the command parser and moved the hero for real.
export async function gold_detect(sobj, getposFn, docrtFn, updateTopl, moreFn, flushFn) {
    const u = game.u;
    const objs = (game.level?.objects || []).filter((o) => o.where === 'floor');
    const gold = objs.filter((o) => o.oclass === COIN_CLASS
                                 || (sobj?.blessed && objects[o.otyp]?.material === GOLD_MATERIAL));
    // C: monsters carrying gold map a synthetic pile at their square, whose
    // quan is rnd(10) — an RNG draw, so it must only happen when one does.
    const goldmons = (game.level?.monsters || []).filter(
        (m) => !(m.mhp != null && m.mhp <= 0)
            && (m.minvent || []).some((o) => o.oclass === COIN_CLASS));

    // gk.known: any gold anywhere (carried by a monster, or on the floor).
    // "only under me" (every pile is on the hero's square) is not the
    // outgoldmap path — C prints "You notice some gold between your feet."
    const offSelf = gold.some((o) => o.ox !== u.ux || o.oy !== u.uy);
    if (!gold.length && !goldmons.length) return true;
    if (!offSelf && !goldmons.length) {
        await updateTopl(`You notice some gold between your ${makeplural_foot()}.`);
        return false;
    }

    // outgoldmap: cls() first does display_nhwindow(WIN_MESSAGE, FALSE), which
    // fires the pending --More-- (wintty.c:1874) — BEFORE the gold map is
    // painted, so the recorded --More-- frame still shows the ordinary map.
    if (game._toplin === 1) await moreFn();
    // ...then it blanks the map.  Each detected pile is map_object()ed, which
    // writes hero MEMORY as well as the live display, so the '$'s survive the
    // closing map_redisplay()/docrt().
    for (let x = 1; x < COLNO; x++)
        for (let y = 0; y < ROWNO; y++)
            show_glyph_cell(x, y, ' ', NO_COLOR, false);
    let ugold = false;
    const mark = (x, y, obj) => {
        const g = object_glyph(obj);
        const loc = game.level?.at(x, y);
        if (loc) loc.remembered_glyph = { ch: g.ch, color: g.color, decgfx: g.dec };
        show_glyph_cell(x, y, g.ch, g.color, g.dec);
        if (x === u.ux && y === u.uy) ugold = true;
    };
    for (const o of gold) mark(o.ox, o.oy, o);
    for (const m of goldmons) {
        const fake = { otyp: GOLD_PIECE, oclass: COIN_CLASS, quan: rnd(10) };
        mark(m.mx, m.my, fake);
    }
    if (!ugold) {
        // newsym(u.ux, u.uy) redraws the hero on top of the blanked map.
        show_glyph_cell(u.ux, u.uy, '@', CLR_WHITE, false);
    }
    await flushFn(1);
    await updateTopl('You feel very greedy, and sense gold!');
    exercise(A_WIS, true);

    // browse_map(TER_DETECT|TER_OBJ[|TER_MON], "gold")
    await getposFn('gold');
    // map_redisplay() -> docrt()
    await docrtFn();
    return false;
}

// C ref: body_part(FOOT) pluralised — the hero is always humanoid here.
function makeplural_foot() { return 'feet'; }

// C ref: detect.c skip_premap_detect — a STONE cell flagged both nondiggable
// and nonpasswall is outside the special level's own map footprint (the rest
// of the level, solidified at finalize); premap_detect leaves it unmapped.
function skip_premap_detect(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return true;
    return loc.typ === STONE
        && ((loc.wall_info || 0) & (W_NONDIGGABLE | W_NONPASSWALL))
            === (W_NONDIGGABLE | W_NONPASSWALL);
}

// C ref: detect.c premap_detect() — used by splev_initlev() when a special
// level (Sokoban) sets the "premapped" level flag.  Maps every reachable
// cell's background (terrain + a boulder object, if any) into hero memory,
// and marks every trap on the level tseen.  No RNG.
export function premap_detect() {
    for (let x = 1; x < COLNO; x++) {
        for (let y = 0; y < ROWNO; y++) {
            if (skip_premap_detect(x, y)) continue;
            const loc = game.level?.at(x, y);
            if (!loc) continue;
            loc.seenv = 0xff; // SVALL
            loc.waslit = true;
            const bg = terrain_background_glyph(loc, x, y);
            loc.remembered_glyph = { ch: bg.ch, color: bg.color, decgfx: bg.dec };
            const obj = vobj_at(x, y);
            if (obj && obj.otyp === BOULDER) {
                const og = object_glyph(obj);
                if (og) loc.remembered_glyph = { ch: og.ch, color: og.color, decgfx: og.dec };
            }
        }
    }
    for (const trap of game.level?.traps || []) {
        trap.tseen = true;
        const loc = game.level?.at(trap.tx, trap.ty);
        if (!loc || skip_premap_detect(trap.tx, trap.ty)) continue;
        const tg = trap_glyph(trap);
        loc.remembered_glyph = { ch: tg.ch, color: tg.color, decgfx: tg.dec };
    }
}
