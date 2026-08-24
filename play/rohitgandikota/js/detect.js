// detect.js — searching and detection.
// C ref: src/detect.c

import { game } from './gstate.js';
import { rnl } from './rng.js';
import { isok } from './hacklib.js';
import { newsym, cls, docrt, canspotmon, sensemon, map_invisible,
         glyph_is_invisible_at, unmap_invisible } from './display.js';
import { cmap_names, defsyms } from './drawing_data.js';
import { You, You_feel } from './pline.js';
import { m_at, t_at, seemimic } from './mon.js';
import { Is_rogue_level, WM_MASK, D_LOCKED, D_CLOSED, ROWNO, COLNO,
         STONE, W_NONDIGGABLE, W_NONPASSWALL } from './const.js';
import { SDOOR, SCORR, DOOR, CORR, D_NODOOR, SVALL, IS_FURNITURE, A_WIS,
         STATUE_TRAP } from './const.js';
import { rn2 } from './rng.js';
import { magic_map_background, map_background, map_object,
         map_trap } from './display.js';
import { exercise } from './attrib.js';
import { Hallucination } from './youprop.js';
import { an } from './objnam.js';
import { ONAMES } from './objects_data.js';
import { y_monnam, a_monnam } from './do_name.js';
import { is_hider, hides_under } from './mondata.js';
import { MONSYMS } from './monst_data.js';
import { M_AP_TYPE } from './const.js';
import { recalc_block_point, unblock_point } from './vision.js';
import { nomul } from './hack.js';
import { back_to_glyph, show_glyph_cell, flush_screen, trap_glyph,
         xy_set_wall_state, pline, covers_traps } from './display.js';
import { TER_MAP, TER_TRP, TER_OBJ, TER_MON, TER_FULL, IS_WALL,
         M_AP_FURNITURE } from './const.js';
import { NO_COLOR, CLR_GREEN } from './terminal.js';
import { cansee } from './vision.js';
import { getpos } from './getpos.js';
const CM = cmap_names;

// src/detect.c:65 unconstrain_map() — lift the swallowed/underwater/buried
// display constraint so the whole map can be drawn; the state is stashed for
// reconstrain_map() to put back.
function unconstrain_map() {
    const u = game.u;
    const restriction = !!(u.uswallow || u.uinwater || u.uburied);

    game.iflags = game.iflags || {};
    game.iflags.save_uswallow = u.uswallow;
    game.iflags.save_uinwater = u.uinwater;
    game.iflags.save_uburied = u.uburied;
    /* bypass set_uinwater() */
    u.uswallow = u.uinwater = u.uburied = 0;

    return restriction;
}

// src/detect.c:84 reconstrain_map()
function reconstrain_map() {
    const u = game.u;
    /* if was in water and taken out, put back; bypass set_uinwater() */
    u.uinwater = game.iflags?.save_uinwater || 0;
    u.uswallow = game.iflags?.save_uswallow || 0;
    u.uburied = game.iflags?.save_uburied || 0;
    if (game.iflags) {
        game.iflags.save_uinwater = 0;
        game.iflags.save_uswallow = 0;
        game.iflags.save_uburied = 0;
    }
}

// src/detect.c:93 map_redisplay()
async function map_redisplay() {
    reconstrain_map();
    await docrt(); /* redraw the screen to remove unseen traps from the map */
    if (game.u.uinwater || game.u.uburied)
        /* under_water(2) / under_ground(2) — the constrained-view repaint;
           no session reaches the terrain browser while submerged */
        note_unported_detect('map_redisplay:constrained');
}

// src/detect.c:106 browse_map() — use getpos()'s 'autodescribe' to view
// whatever is currently shown on map.
async function browse_map(ter_typ, ter_explain) {
    const dummy_pos = { x: game.u.ux, y: game.u.uy };
    game.iflags = game.iflags || {};
    const save_autodescribe = game.iflags.autodescribe;
    game.iflags.autodescribe = true;
    game.iflags.terrainmode = ter_typ;
    await getpos(dummy_pos, false, ter_explain);
    game.iflags.terrainmode = 0;
    game.iflags.autodescribe = save_autodescribe;
}

// src/detect.c:1893 dosearch0() — intrinsic autosearch vs explicit searching.
//
// Returns non-zero when the search consumed a turn, which is what makes
// dosearch() return ECMD_TIME and the move loop advance svm.moves.
//
// The only randomness is rnl(7 - fund) per adjacent secret door or corridor,
// so a search with nothing hidden nearby draws nothing at all — which is what
// the recordings show for seed8000's two 's' keys.
// src/detect.c:1934 find_trap() — reveal a trap found by searching.
export async function find_trap(trap) {
    let cleared = false;

    trap.tseen = 1;
    exercise(A_WIS, true);
    newsym(trap.tx, trap.ty);   /* feel_newsym */

    /* src/detect.c:1946 — if the remembered glyph at the spot is not this
       trap (an object or monster memory covers it), clear the screen, show
       just the trap, and redraw everything after the message */
    const loc = game.level?.at(trap.tx, trap.ty);
    const trapcmap = CM.S_arrow_trap + trap.ttyp - 1;
    if (Hallucination() || loc?.remembered_glyph?.glyph?.cmap !== trapcmap) {
        await cls();
        newsym(trap.tx, trap.ty);   /* map_trap(trap, 1) */
        newsym(game.u.ux, game.u.uy);   /* display_self() */
        cleared = true;
    }

    await You(`find ${an(trapname(trap.ttyp))}.`);

    if (cleared) {
        /* display_nhwindow(WIN_MAP, TRUE): tty flushes the map; our writes
           flush per cell, so only the redraw remains */
        await docrt();
    }
}

/* src/drawing.c trapname() — defsyms explanation for the trap's cmap */
function trapname(ttyp) {
    const base = defsyms.findIndex(d => d.name === 'S_arrow_trap');
    return defsyms[base + ttyp - 1]?.explain ?? 'trap';
}

// src/detect.c:1964 mfind0() — reveal a hidden/mimicking/unseen monster
// found by searching. Returns -1 skip, 0 nothing, 1 found (uses the turn).
async function mfind0(mtmp, via_warning) {
    const x = mtmp.mx, y = mtmp.my;
    let found_something = false;

    if (via_warning)
        return -1;      /* warning_of() is not ported; dosearch0 passes 0 */

    if (M_AP_TYPE(mtmp)) {
        seemimic(mtmp);
        found_something = true;
    } else {
        /* this used to only be executed if a !canspotmon() test passed
           but that failed to bring sensed monsters out of hiding */
        found_something = !canspotmon(mtmp);
        if (mtmp.mundetected && (is_hider(mtmp.data)
                                 || hides_under(mtmp.data)
                                 || mtmp.data.mlet === MONSYMS.S_EEL)) {
            mtmp.mundetected = 0;
            found_something = true;
        }
        newsym(x, y);
    }

    if (found_something) {
        if (!canspotmon(mtmp) && glyph_is_invisible_at(x, y))
            return -1; /* already has 'I' here; avoid re-finding each turn */
        exercise(A_WIS, true);
        if (!canspotmon(mtmp)) {
            map_invisible(x, y);
            await You_feel('an unseen monster!');
        } else if (!sensemon(mtmp)) {
            await You(`find ${mtmp.mtame ? y_monnam(mtmp)
                                         : a_monnam(mtmp)}.`);
        }
        return 1;
    }
    return 0;
}

export async function dosearch0(aflag) {
    const u = game.u;
    let x, y;

    if (u.uswallow) {
        /* Norep("What are you looking for?  The exit?") — no draw */
        return 1;
    }

    /* fund: artifact search bonus plus lenses. Neither is reachable until
       artifacts and eyewear are ported, so it is 0 here; the expression is
       kept in the C's shape so the bonus slots in where C puts it. */
    let fund = 0;
    if (fund > 5)
        fund = 5;

    for (x = u.ux - 1; x < u.ux + 2; x++)
        for (y = u.uy - 1; y < u.uy + 2; y++) {
            if (!isok(x, y))
                continue;
            if (x === u.ux && y === u.uy)
                continue;

            const loc = game.level?.at(x, y);
            if (!loc) continue;

            if (loc.typ === SDOOR) {
                if (rnl(7 - fund))
                    continue;
                /* src/detect.c:2046 — C calls cvt_sdoor_to_door() here. This
                   used to inline `typ = DOOR; doormask = D_NODOOR`, which is
                   wrong on every level except the rogue one: a newly exposed
                   secret door is CLOSED (or stays LOCKED), not a doorway.
                   mfndpos excludes a D_CLOSED square, so leaving it D_NODOOR
                   handed every monster on the level an extra candidate square
                   and shifted its rn2(4 * (cnt - j)) backtrack draw. */
                cvt_sdoor_to_door(loc);
                recalc_block_point(x, y);
                exercise(A_WIS, true);
                nomul(0);
                newsym(x, y);   /* feel_location: make sure it shows up */
                await You('find a hidden door.');
            } else if (loc.typ === SCORR) {
                if (rnl(7 - fund))
                    continue;
                loc.typ = CORR;
                unblock_point(x, y);    /* vision */
                exercise(A_WIS, true);
                nomul(0);
                newsym(x, y);   /* feel_newsym: make sure it shows up */
                await You('find a hidden passage.');
            } else {
                /* Be careful not to find anything in an SCORR or SDOOR */
                let mtmp = m_at(x, y);
                if (mtmp && !aflag) {
                    const mfres = await mfind0(mtmp, 0);
                    if (mfres === -1)
                        continue;
                    else if (mfres > 0)
                        return mfres;
                }

                /* see if an invisible monster has moved--if Blind,
                   feel_location() already did it */
                if (!aflag && !mtmp && !game.u.ublind)
                    unmap_invisible(x, y);

                const trap = t_at(x, y);
                if (trap && !trap.tseen && !rnl(8)) {
                    nomul(0);
                    if (trap.ttyp === STATUE_TRAP) {
                        note_unported_detect('dosearch0:activate_statue_trap');
                        return 1;
                    } else {
                        await find_trap(trap);
                    }
                }
            }
        }
    return 1;
}

// src/detect.c dosearch()
export async function dosearch() {
    /* src/detect.c:2097 — the safe_wait gate: plain 's' next to a spotted
       monster refuses (no time) unless m-prefixed */
    const { cmd_safety_prevention } = await import('./do.js');
    if (await cmd_safety_prevention('Searching', 'another search',
                                    'You already found a monster.'))
        return 0;                      /* ECMD_OK — no time passes */
    return dosearch0(0);
}

/* src/vision.c:27 circle_data start offsets — circle_ptr(z) */
const circle_start = [0, 1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 66, 78, 91];
const circle_data_findit = [
    0, 1, 1, 2, 2, 1, 3, 3, 2, 1, 4, 4, 4, 3, 2, 5, 5, 5, 4, 3, 2,
    6, 6, 6, 5, 5, 4, 2, 7, 7, 7, 6, 6, 5, 4, 2, 8, 8, 8, 7, 7, 6, 6, 4, 2,
];

// src/detect.c:1589 cvt_sdoor_to_door()
export function cvt_sdoor_to_door(lev) {
    let newmask = lev.doormask & ~WM_MASK;

    if (Is_rogue_level(game.u.uz)) {
        /* rogue didn't have doors, only doorways */
        newmask = D_NODOOR;
    } else {
        /* newly exposed door is closed */
        if (!(newmask & D_LOCKED))
            newmask |= D_CLOSED;
    }
    lev.typ = DOOR;
    lev.doormask = newmask;
}

// src/detect.c:1639 findone() — reveal what hides on one square.
function findone(zx, zy, found) {
    const lev = game.level.at(zx, zy);
    if (!lev)
        return;
    const ttmp = t_at(zx, zy);
    let mtmp = m_at(zx, zy);
    if (mtmp && mtmp.mhp <= 0)
        mtmp = null;

    if (lev.typ === SDOOR) {
        cvt_sdoor_to_door(lev);         /* sets lev.typ = DOOR */
        lev.seenv = 0xff;               /* foundone: SVALL */
        newsym(zx, zy);
        found.num_sdoors++;
    } else if (lev.typ === SCORR) {
        lev.typ = CORR;
        lev.seenv = 0xff;
        newsym(zx, zy);
        found.num_scorrs++;
    }

    if (ttmp && !ttmp.tseen && ttmp.ttyp !== STATUE_TRAP_T) {
        ttmp.tseen = 1;
        newsym(zx, zy);
        found.num_traps++;
    }
    /* trapped doors and trapped containers add dummy-trap reveals */
    if (lev.typ === DOOR && (lev.doormask & 0x10 /* D_TRAPPED */))
        note_unported_detect('findone:trapped_door');

    if (mtmp && (mtmp.mundetected || M_AP_TYPE_D(mtmp))) {
        if (M_AP_TYPE_D(mtmp)) {
            note_unported_detect('findone:seemimic');
        } else if (mtmp.mundetected) {
            mtmp.mundetected = 0;
            newsym(zx, zy);
        }
        found.num_mons++;
    }
}

const M_AP_TYPE_D = (m) => (m.m_ap_type ?? 0);
const STATUE_TRAP_T = 11;   /* include/trap.h STATUE_TRAP */

// src/detect.c:1792 findit() — the wand of secret door detection sweep.
export async function findit() {
    let num = 0;

    if (game.u.uswallow)
        return 0;

    const found = { num_sdoors: 0, num_scorrs: 0, num_traps: 0,
                    num_mons: 0 };
    /* do_clear_area(u.ux, u.uy, BOLT_LIM=8, findone) — hero-centered
       circle walk (src/vision.c:2107) */
    const range = 8;
    const limits = circle_start[range];
    const uy = game.u.uy, ux = game.u.ux;
    for (let y = Math.max(0, uy - range);
         y <= Math.min(ROWNO - 1, uy + range); y++) {
        const offset = circle_data_findit[limits + Math.abs(y - uy)];
        for (let x = Math.max(1, ux - offset);
             x <= Math.min(COLNO - 1, ux + offset); x++)
            findone(x, y, found);
    }

    const k = (found.num_sdoors ? 1 : 0) + (found.num_scorrs ? 1 : 0)
            + (found.num_traps ? 1 : 0) + (found.num_mons ? 1 : 0);
    let buf = '';
    if (found.num_sdoors) {
        buf += (found.num_sdoors > 1) ? `${found.num_sdoors} secret doors`
                                      : 'a secret door';
        num += found.num_sdoors;
    }
    if (found.num_scorrs) {
        if (buf) buf += (k === 2) ? ' and ' : ', ';
        buf += (found.num_scorrs > 1) ? `${found.num_scorrs} secret corridors`
                                      : 'a secret corridor';
        num += found.num_scorrs;
    }
    if (found.num_traps) {
        if (buf) buf += (k === 3 && !found.num_mons) ? ', and '
                        : (k === 2) ? ' and ' : ', ';
        buf += (found.num_traps > 1) ? `${found.num_traps} traps` : 'a trap';
        num += found.num_traps;
    }
    if (found.num_mons) {
        if (buf) buf += (k > 2) ? ', and ' : ' and ';
        buf += (found.num_mons > 1) ? `${found.num_mons} hidden monsters`
                                    : 'a hidden monster';
        num += found.num_mons;
    }
    if (buf)
        await You(`reveal ${buf}!`);
    if (!num)
        await You("don't find anything.");
    return num;
}

function note_unported_detect(what) {
    (game.unported ||= new Set()).add('detect:' + what);
}

// src/detect.c:1372 show_map_spot() — one cell of a magic map.
//
// seenv goes to SVALL, secret corridors are found (not secret doors), the
// true background is written into memory, and then the non-furniture layers
// re-assert in the mapping's own precedence: seen traps over engravings
// over remembered objects. The confusion arm (rn2(7) skip per cell) is
// gated on Confusion, which cannot be set yet.
export function show_map_spot(x, y, cnf) {
    const loc = game.level?.at(x, y);
    if (!loc) return;

    if (cnf && rn2(7))
        return;

    loc.seenv = SVALL;

    /* Secret corridors are found, but not secret doors. */
    if (loc.typ === SCORR)
        loc.typ = CORR;

    magic_map_background(x, y, 0);
    newsym(x, y);

    if (!IS_FURNITURE(loc.typ)) {
        const t = t_at(x, y);
        if (t && t.tseen) {
            note_unported_detect('show_map_spot:map_trap');
        } else if ((game.level?.engravings || [])
                       .some(e => e.engr_x === x && e.engr_y === y)) {
            /* map_engraving(ep, 1) — engraving_glyph via newsym covers the
               visible case; write the engraving into memory too */
            const eg = { ch: loc.typ === CORR ? '#' : '`',
                         color: 12 /* CLR_BRIGHT_BLUE */, decgfx: false,
                         glyph: { kind: 'cmap',
                                  cmap: cmap_names[loc.typ === CORR
                                      ? 'S_engrcorr' : 'S_engroom'] } };
            if (game.level?.flags?.hero_memory)
                loc.remembered_glyph = eg;
            newsym(x, y);
        }
        /* the remembered-object re-show is already handled: memory keeps
           object glyphs (magic_map_background skips them) and newsym shows
           remembered glyphs for unseen cells */
    }
}

// src/detect.c:2124 skip_premap_detect() — areas outside the Sokoban map:
// solid stone that solidify_map() marked nondiggable/nonpasswall.
function skip_premap_detect(x, y) {
    const loc = game.level?.at(x, y);
    return !!loc && loc.typ === STONE
           && ((loc.wall_info ?? 0) & (W_NONDIGGABLE | W_NONPASSWALL)) !== 0;
}

// src/detect.c:2134 premap_detect() — pre-map (the sokoban) levels: every
// square inside the map gets full seenv and waslit, the background and any
// boulder are written into map memory, and every trap is marked seen.
export function premap_detect() {
    for (let x = 1; x < COLNO; x++)
        for (let y = 0; y < ROWNO; y++) {
            if (skip_premap_detect(x, y))
                continue;
            const loc = game.level.at(x, y);
            loc.seenv = SVALL;
            loc.waslit = true;
            if (loc.typ === SDOOR)
                loc.wall_info = 0; /* see rm.h for explanation */
            map_background(x, y, 1);
            const obj = (game.level?.objects || []).find(
                (o) => o.ox === x && o.oy === y
                       && o.otyp === ONAMES.BOULDER);
            if (obj)
                map_object(obj, 1);
        }

    /* Map the traps */
    for (const ttmp of game.level?.traps || []) {
        ttmp.tseen = 1;
        map_trap(ttmp, 1);
    }
}

// src/detect.c:1422 do_mapping() — reveal the level's terrain.
export function do_mapping() {
    /* unconstrain_map() differs only underwater/underground */
    for (let zx = 1; zx < COLNO; zx++)
        for (let zy = 0; zy < ROWNO; zy++)
            show_map_spot(zx, zy,
                          !!game.u.uprops?.CONFUSION?.intrinsic);

    /* hero_memory is set, so C only reconstrains (a no-op) here */
    exercise(A_WIS, true);
}

// src/detect.c:2167 reveal_terrain_getglyph() — what to show at x,y for the
// terrain view: the hero's memory with monsters, objects, and/or traps
// stripped as which_subset dictates.
//
// C works in glyph numbers; this port's display buffer keeps cells
// ({ch,color,dec}) with a provenance descriptor ({kind,...}), so the same
// decision tree runs on descriptors and returns a cell. back_to_glyph()
// already folds in wall_angle() and the per-dungeon wall colour.
function reveal_terrain_getglyph(x, y, swallowed, default_cell, which_subset) {
    const keep_traps = (which_subset & TER_TRP) !== 0,
          keep_objs = (which_subset & TER_OBJ) !== 0,
          keep_mons = (which_subset & TER_MON) !== 0,
          full = (which_subset & TER_FULL) !== 0;
    const loc = game.level?.at(x, y);
    if (!loc)
        return { ...default_cell };
    const hero_memory = !!game.level?.flags?.hero_memory;

    const btg_cell = () => {
        const b = back_to_glyph(loc, x, y);
        return { ch: b.ch, color: b.color, dec: !!b.dec,
                 glyph: { kind: 'cmap', cmap: b.cmap } };
    };

    /* for 'full', show the actual terrain for the entire level, otherwise
       what the hero remembers for seen locations */
    const seenv = (full || hero_memory) ? (loc.seenv || 0)
                  : (cansee(x, y) ? SVALL : 0);
    let cell;
    if (full) {
        const sv = loc.seenv;
        loc.seenv = SVALL;
        cell = btg_cell();
        loc.seenv = sv;
    } else {
        /* levl[][].glyph — the remembered glyph, never a monster */
        const rem = loc.remembered_glyph;
        const levl_cell = hero_memory
            ? (rem ? { ch: rem.ch, color: rem.color, dec: !!rem.decgfx,
                       glyph: rem.glyph }
                   : { ...default_cell })
            : (seenv ? btg_cell() : { ...default_cell });
        /* glyph_at() — the displayed cell, which might be a monster */
        cell = !swallowed
            ? (loc.disp_glyph !== undefined || loc.disp_ch !== undefined
                   ? { ch: loc.disp_ch ?? ' ', color: loc.disp_color,
                       dec: !!loc.disp_decgfx, glyph: loc.disp_glyph }
                   : { ...default_cell })
            : levl_cell;
        let was_mon = false;
        const kind = () => cell.glyph?.kind;
        if (keep_mons && x === game.u.ux && y === game.u.uy && swallowed) {
            /* mon_to_glyph(u.ustuck) — detection while engulfed */
            note_unported_detect('reveal_terrain:swallowed_keepmons');
        } else if ((!keep_mons && (kind() === 'mon' || kind() === 'hero'
                                   || kind() === 'warn'))
                   || kind() === 'swallow') {
            cell = { ...levl_cell };
            was_mon = true;
        }
        const is_trap_cell = () => cell.glyph?.kind === 'cmap'
            && cell.glyph.cmap >= CM.S_arrow_trap
            && cell.glyph.cmap <= CM.S_trapped_chest;
        /* NhRegion gas clouds (visible_region_at) cannot exist: region.c is
           unported, so no region is ever created */
        if (((!keep_objs && kind() === 'obj') || kind() === 'invis')
            && keep_traps && !covers_traps(x, y)) {
            const t = t_at(x, y);
            if (t && t.tseen) {
                const tg = trap_glyph(t);
                cell = { ch: tg.ch, color: tg.color, dec: !!tg.dec,
                         glyph: { kind: 'cmap', cmap: tg.cmap } };
            }
        }
        if ((!keep_objs && kind() === 'obj')
            || (!keep_traps && is_trap_cell())
            || kind() === 'invis') {
            if (!seenv) {
                cell = { ...default_cell };
            } else if (loc.lastseentyp === loc.typ) {
                cell = btg_cell();
            } else {
                /* look for a mimic here posing as furniture; if we don't
                   find one, we'll have to fake it */
                const mtmp = m_at(x, y);
                if (mtmp && M_AP_TYPE(mtmp) === M_AP_FURNITURE) {
                    const ds = defsyms[mtmp.mappearance];
                    cell = { ch: ds?.ch ?? '?', color: ds?.color,
                             dec: false,
                             glyph: { kind: 'cmap',
                                      cmap: mtmp.mappearance } };
                } else {
                    /* we have a topology type but want a screen symbol:
                       temporarily swap in lastseentyp for back_to_glyph(),
                       recalculating wall_info as C does */
                    const save_typ = loc.typ,
                          save_wall = loc.wall_info,
                          save_horiz = loc.horizontal;
                    loc.typ = loc.lastseentyp ?? STONE;
                    if (IS_WALL(loc.typ) || loc.typ === SDOOR)
                        xy_set_wall_state(x, y);
                    cell = btg_cell();
                    loc.typ = save_typ;
                    loc.wall_info = save_wall;
                    loc.horizontal = save_horiz;
                }
            }
        }
    }
    /* FIXME: dirty hack (C's words) — the darkroom and lit-corridor
       variants read as their plain forms in the terrain view */
    if (cell.glyph?.kind === 'cmap' && cell.glyph.cmap === CM.S_darkroom)
        cell = { ch: '~', color: NO_COLOR, dec: true,
                 glyph: { kind: 'cmap', cmap: CM.S_room } };
    else if (cell.glyph?.kind === 'cmap' && cell.glyph.cmap === CM.S_litcorr)
        cell = { ch: '#', color: NO_COLOR, dec: false,
                 glyph: { kind: 'cmap', cmap: CM.S_corr } };
    return cell;
}

// src/detect.c:2356 reveal_terrain() — idea from crawl; show known portion
// of map without monsters, objects, or traps occluding the view of the
// underlying terrain.
export async function reveal_terrain(which_subset) {
    /* 'full' overrides impairment and implies no-traps, no-objs, no-mons */
    const full = (which_subset & TER_FULL) !== 0;
    const u = game.u;
    const intr = u.intrinsics || {};
    const props = u.uprops || {};

    if ((Hallucination() || intr.HStun || props.STUNNED
         || intr.HConfusion || props.CONFUSION) && !full) {
        await You('are too disoriented for this.');
    } else {
        const keep_traps = (which_subset & TER_TRP) !== 0,
              keep_objs = (which_subset & TER_OBJ) !== 0,
              keep_mons = (which_subset & TER_MON) !== 0;
        const swallowed = u.uswallow ? 1 : 0; /* before unconstrain_map() */

        if (unconstrain_map())
            await docrt();
        /* nhsym default: S_tree on arboreal levels, S_stone otherwise */
        const default_cell = game.level?.flags?.arboreal
            ? { ch: 'g', color: CLR_GREEN, dec: true,
                glyph: { kind: 'cmap', cmap: CM.S_tree } }
            : { ch: ' ', color: NO_COLOR, dec: false,
                glyph: { kind: 'cmap', cmap: CM.S_stone } };

        for (let x = 1; x < COLNO; x++)
            for (let y = 0; y < ROWNO; y++) {
                const cell = reveal_terrain_getglyph(x, y, swallowed,
                                                     default_cell,
                                                     which_subset);
                show_glyph_cell(x, y, cell.ch, cell.color, cell.dec, 0,
                                cell.glyph);
            }

        /* hero's location is not highlighted, but getpos() starts with
           cursor there */
        await flush_screen(1);
        let buf;
        if (full) {
            buf = 'underlying terrain';
        } else {
            buf = 'known terrain';
            if (keep_traps)
                buf += `${(keep_objs || keep_mons) ? ',' : ' and'} traps`;
            if (keep_objs)
                buf += `${(keep_traps || keep_mons) ? ',' : ''}${
                    keep_mons ? '' : ' and'} objects`;
            if (keep_mons)
                buf += `${(keep_traps || keep_objs) ? ',' : ''} and monsters`;
        }
        await pline(`Showing ${buf} only...`);

        /* allow player to move cursor around and get autodescribe feedback
           based on what is visible now rather than what is on 'real' map */
        which_subset |= TER_MAP; /* guarantee non-zero */
        await browse_map(which_subset, 'anything of interest');

        await map_redisplay();
    }
}

