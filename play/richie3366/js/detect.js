// detect.js — Searching / dosearch0 / findit / do_mapping / #terrain /
// monster_detect.
// C ref: detect.c — dosearch0, find_trap, cvt_sdoor_to_door, findit,
// findone, show_map_spot, do_mapping, reveal_terrain, browse_map,
// monster_detect; cmd.c doterrain; vision.c do_clear_area (hero-centered).
//
// Branch envelope: 8-neighbour SDOOR/SCORR/trap search with fund
// (lenses); findit clear-area reveal of SDOOR/SCORR/unseen traps +
// empty "don't find anything" path; do_mapping hero_memory path
// (no browse_map) + show_map_spot SCORR uncover / seenv=SVALL /
// magic_map_background; **#terrain / doterrain** View which? PICK_ONE
// (a/b/c + explore/wizard extras) + Esc cancel; reveal_terrain
// impairment gate + getglyph/show rewrite + Showing pline +
// browse_map/getpos + docrt;
// **monster_detect** (fountain case 26) live-fmon + map_monst +
// browse_map(TER_DETECT|TER_MON) (D-0370);
// **premap_detect** Sokoban premapped levels (D-0567);
// **cmd_safety_prevention** for explicit `s` beside hostiles (D-0228).
// Named omissions: feel_location / visible_region_at /
// unmap_invisible / Blind feel; Hallucination/cls
// map_trap wait; activate_statue_trap; artifact SPFX_SEARCH;
// warnreveal body (mfind0 via_warning wired);
// map_trap + map_engraving after furniture (D-0928 #1158); oldglyph
// trap/object restore deferred; unconstrain underwater-buried-swallow;
// notice_mon_off/on; findone flash_glyph / mimic / hider / invis /
// chest-trap detect;
// trapped-door dummytrap; FOUND_FLASH_COUNT==0 tmp_at path;
// reveal_terrain region/gascloud / trap keep restore /
// M_AP_FURNITURE; wiz_map_levltyp / wiz_levltyp_legend;
// TER_FULL explore-only map body; arboreal default tree;
// monster_detect strange_feeling / cursed wake / blessed WIN_MAP /
// worm segs / pet_to_glyph / TER_DETECT autodescribe;
// mfind0 set_msg_xy / display_nhwindow flush.

import { game } from './gstate.js';
import { rnl, rn2 } from './rng.js';
import {
    newsym, pline, magic_map_background, terrain_glyph, obj_glyph,
    show_glyph_cell, map_trap, map_engraving, canspotmon, sensemon,
    map_invisible, glyph_is_invisible, warning_of, You_feel,
} from './display.js';
import { vision_recalc, couldsee, recalc_block_point } from './vision.js';
import { an } from './objnam.js';
import { A_WIS, exercise } from './attrib.js';
import { t_at } from './trap.js';
import { engr_at } from './engrave.js';
import { cmd_safety_prevention } from './do.js';
import { m_at, seemimic } from './mon.js';
import { is_hider, hides_under } from './monsters.js';
import { x_monnam, x_monnam_tame } from './do_name.js';
import { objectNames } from './objects.js';
import { objects_at } from './mkobj.js';
import {
    isok, SDOOR, SCORR, DOOR, CORR, D_NODOOR, D_CLOSED, D_LOCKED, WM_MASK,
    STATUE_TRAP, NO_TRAP, TRAPNUM, Is_rogue_level, BOLT_LIM, COLNO, ROWNO,
    SVALL, IS_FURNITURE, STONE, W_NONDIGGABLE, W_NONPASSWALL,
    TER_MAP, TER_TRP, TER_OBJ, TER_MON, TER_FULL, TER_DETECT, ECMD_OK,
    I_SPECIAL, M_AP_TYPE, ARTICLE_A, ROOMOFFSET,
} from './const.js';
import { CLR_WHITE } from './terminal.js';
import { room_discovered } from './dungeon.js';

const BOULDER = objectNames.indexOf('BOULDER');

/** C ref: mkobj.c sobj_at — first floor object of otyp at (x,y). */
function sobj_at(otyp, x, y) {
    for (let obj = objects_at(x, y); obj; obj = obj.nexthere) {
        if (obj.otyp === otyp) return obj;
    }
    return null;
}

// C ref: vision.c circle_data[] / circle_start[] — radius→row half-width
const CIRCLE_DATA = [
    0,
    1, 1,
    2, 2, 1,
    3, 3, 2, 1,
    4, 4, 4, 3, 2,
    5, 5, 5, 4, 3, 2,
    6, 6, 6, 5, 5, 4, 2,
    7, 7, 7, 6, 6, 5, 4, 2,
    8, 8, 8, 7, 7, 6, 6, 4, 2,
];
const CIRCLE_START = [0, 1, 3, 6, 10, 15, 21, 28, 36];

const LENSES = objectNames.indexOf('LENSES');

// C ref: defsym.h trap explanations (non-hallucination trapname)
const TRAP_EXPLANATIONS = [
    '', // NO_TRAP
    'arrow trap',
    'dart trap',
    'falling rock trap',
    'squeaky board',
    'bear trap',
    'land mine',
    'rolling boulder trap',
    'sleeping gas trap',
    'rust trap',
    'fire trap',
    'pit',
    'spiked pit',
    'hole',
    'trap door',
    'teleportation trap',
    'level teleporter',
    'magic portal',
    'web',
    'statue trap',
    'magic trap',
    'anti-magic field',
    'polymorph trap',
    'vibrating square',
    'trapped door',
    'trapped chest',
];

/** C ref: trap.c trapname(ttyp, override) — non-hallucination only */
function trapname(ttyp, _override) {
    if (ttyp > NO_TRAP && ttyp < TRAPNUM) return TRAP_EXPLANATIONS[ttyp] || 'trap';
    return 'trap';
}

/** C ref: detect.c cvt_sdoor_to_door */
export function cvt_sdoor_to_door(lev) {
    let newmask = (lev.doormask || 0) & ~WM_MASK;
    if (Is_rogue_level(game.u?.uz)) {
        newmask = D_NODOOR;
    } else if (!(newmask & D_LOCKED)) {
        newmask |= D_CLOSED;
    }
    lev.typ = DOOR;
    lev.doormask = newmask;
}

/** Clear counted search / multi — C nomul(0) subset for find paths */
function nomul_clear() {
    game.multi = 0;
    game._repeat_search = false;
    if (game.context) {
        game.context.mv = 0;
        game.context.run = 0;
    }
}

/**
 * C ref: detect.c find_trap — mark seen, exercise, message.
 * Hallucination/cls/map_trap/display_nhwindow wait deferred.
 */
async function find_trap(trap) {
    trap.tseen = true;
    exercise(A_WIS, true);
    newsym(trap.tx, trap.ty);
    await pline(`You find ${an(trapname(trap.ttyp, false))}.`);
}

/**
 * C ref: detect.c mfind0 — reveal mimic / hider / unseen mon on search.
 * Returns -1 continue, 1 found (took time), 0 nothing.
 * Named omissions: set_msg_xy; display_nhwindow flush on via_warning.
 */
async function mfind0(mtmp, via_warning) {
    if (!mtmp) return 0;
    const x = mtmp.mx | 0;
    const y = mtmp.my | 0;
    let found_something = false;

    if (via_warning && !warning_of(mtmp)) return -1;

    if (M_AP_TYPE(mtmp)) {
        seemimic(mtmp);
        found_something = true;
    } else {
        // C: found_something = !canspotmon; then clear mundetected hiders
        found_something = !canspotmon(mtmp);
        const ptr = mtmp.data;
        if (mtmp.mundetected && (is_hider(ptr)
            || hides_under(ptr)
            || ptr?.mlet === 'S_EEL')) {
            if (via_warning && found_something) {
                const Blind = !!(game.u?.Blind || game.u?.ublind);
                await pline(
                    `Your danger sense causes you to take a second ${
                        Blind ? 'to check nearby' : 'look close by'}.`,
                );
            }
            mtmp.mundetected = 0;
            found_something = true;
        }
        newsym(x, y);
    }

    if (found_something) {
        const loc = game.level?.at(x, y);
        if (!canspotmon(mtmp) && glyph_is_invisible(loc)) {
            // C: already-mapped 'I' — do not re-find every turn
            return -1;
        }
        exercise(A_WIS, true);
        if (!canspotmon(mtmp)) {
            map_invisible(x, y);
            await You_feel('an unseen monster!');
        } else if (!sensemon(mtmp)) {
            const nam = mtmp.mtame
                ? x_monnam_tame(mtmp)
                : x_monnam(mtmp, ARTICLE_A, null, 0, false);
            await pline(`You find ${nam}.`);
        }
        return 1;
    }
    return 0;
}

/**
 * C ref: detect.c dosearch0(aflag)
 * aflag: 0 = explicit #search / `s`; 1 = intrinsic Searching autosearch.
 * @returns {Promise<number>} 1 = took time / continue; early find may return 1
 */
export async function dosearch0(aflag) {
    const u = game.u || {};
    if (u.uswallow) {
        if (!aflag) await pline('What are you looking for?  The exit?');
        return 1;
    }

    // Artifact SPFX_SEARCH fund deferred (no artifact table wired yet) → 0.
    let fund = 0;
    const ublindf = u.ublindf;
    const Blind = !!(u.Blind || u.ublind);
    if (ublindf && ublindf.otyp === LENSES && !Blind) fund += 2;
    if (fund > 5) fund = 5;

    for (let x = u.ux - 1; x < u.ux + 2; x++) {
        for (let y = u.uy - 1; y < u.uy + 2; y++) {
            if (!isok(x, y)) continue;
            if (x === u.ux && y === u.uy) continue;

            const loc = game.level?.at(x, y);
            if (!loc) continue;

            // feel_location / Blind / visible_region_at deferred

            if (loc.typ === SDOOR) {
                if (rnl(7 - fund)) continue;
                cvt_sdoor_to_door(loc);
                recalc_block_point(x, y); // C: recalc_block_point
                exercise(A_WIS, true);
                nomul_clear();
                newsym(x, y);
                await pline('You find a hidden door.');
            } else if (loc.typ === SCORR) {
                if (rnl(7 - fund)) continue;
                loc.typ = CORR;
                recalc_block_point(x, y); // C: unblock_point
                exercise(A_WIS, true);
                nomul_clear();
                newsym(x, y);
                await pline('You find a hidden passage.');
            } else {
                if (!aflag) {
                    const mtmp = m_at(x, y);
                    if (mtmp) {
                        const mfres = await mfind0(mtmp, 0);
                        if (mfres === -1) continue;
                        if (mfres > 0) return mfres;
                    }
                    // unmap_invisible deferred
                }

                const trap = t_at(x, y);
                if (trap && !trap.tseen && !rnl(8)) {
                    nomul_clear();
                    if (trap.ttyp === STATUE_TRAP) {
                        // activate_statue_trap deferred — still mark seen so
                        // we do not re-roll forever; return 1 like C.
                        trap.tseen = true;
                        exercise(A_WIS, true);
                        newsym(trap.tx, trap.ty);
                        return 1;
                    }
                    await find_trap(trap);
                }
            }
        }
    }
    return 1;
}

/** C ref: detect.c dosearch — explicit `s` / #search */
export async function dosearch() {
    if (await cmd_safety_prevention(
        'Searching', 'another search',
        'You already found a monster.',
        'already_found_flag',
    )) {
        return false; // ECMD_OK — no time
    }
    const took = await dosearch0(0);
    return !!took;
}

/**
 * C ref: vision.c do_clear_area — hero-centered path only.
 * Off-hero view_from deferred (findit always centers on u).
 */
function do_clear_area(scol, srow, range, func, arg) {
    const u = game.u || {};
    if (scol !== u.ux || srow !== u.uy) {
        // Non-hero center deferred
        return;
    }
    if (range < 1 || range >= CIRCLE_START.length) return;
    if (game.vision_full_recalc) vision_recalc(0);
    const limitsStart = CIRCLE_START[range];
    let max_y = srow + range;
    if (max_y >= ROWNO) max_y = ROWNO - 1;
    let y = srow - range;
    if (y < 0) y = 0;
    for (; y <= max_y; y++) {
        const offset = CIRCLE_DATA[limitsStart + Math.abs(y - srow)] | 0;
        let min_x = scol - offset;
        if (min_x < 1) min_x = 1;
        let max_x = scol + offset;
        if (max_x >= COLNO) max_x = COLNO - 1;
        for (let x = min_x; x <= max_x; x++) {
            if (couldsee(x, y)) func(x, y, arg);
        }
    }
}

/**
 * C ref: detect.c findone — SDOOR/SCORR/unseen traps only.
 * Flash, mimic/hider/invis, chest traps, trapped doors deferred.
 */
function findone(zx, zy, found) {
    const lev = game.level?.at(zx, zy);
    if (!lev) return;

    if (lev.typ === SDOOR) {
        cvt_sdoor_to_door(lev);
        recalc_block_point(zx, zy); // C: unblock_point / recalc
        newsym(zx, zy);
        found.num_sdoors++;
    } else if (lev.typ === SCORR) {
        lev.typ = CORR;
        recalc_block_point(zx, zy); // C: unblock_point
        newsym(zx, zy);
        found.num_scorrs++;
    }

    const ttmp = t_at(zx, zy);
    if (ttmp && !ttmp.tseen && ttmp.ttyp !== STATUE_TRAP) {
        ttmp.tseen = true;
        newsym(zx, zy);
        found.num_traps++;
    }
}

/**
 * C ref: detect.c findit — reveal secrets in BOLT_LIM clear area.
 * @returns {Promise<number>} count of things found
 */
export async function findit() {
    const u = game.u || {};
    if (u.uswallow) return 0;

    const found = {
        num_sdoors: 0,
        num_scorrs: 0,
        num_traps: 0,
        num_mons: 0,
        num_invis: 0,
        num_cleared_invis: 0,
        num_kept_invis: 0,
    };
    do_clear_area(u.ux, u.uy, BOLT_LIM, findone, found);

    const k = (!!found.num_sdoors) + (!!found.num_scorrs)
        + (!!found.num_traps) + (!!found.num_mons);
    let buf = '';
    let num = 0;

    if (found.num_sdoors) {
        buf += found.num_sdoors > 1
            ? `${found.num_sdoors} secret doors`
            : 'a secret door';
        num += found.num_sdoors;
    }
    if (found.num_scorrs) {
        if (buf) buf += k === 2 ? ' and ' : ', ';
        buf += found.num_scorrs > 1
            ? `${found.num_scorrs} secret corridors`
            : 'a secret corridor';
        num += found.num_scorrs;
    }
    if (found.num_traps) {
        if (buf) {
            buf += (k === 3 && !found.num_mons) ? ', and '
                : (k === 2) ? ' and ' : ', ';
        }
        buf += found.num_traps > 1
            ? `${found.num_traps} traps`
            : 'a trap';
        num += found.num_traps;
    }
    if (found.num_mons) {
        if (buf) buf += k > 2 ? ', and ' : ' and ';
        buf += found.num_mons > 1
            ? `${found.num_mons} hidden monsters`
            : 'a hidden monster';
        num += found.num_mons;
    }
    if (buf) await pline(`You reveal ${buf}!`);

    // invis / cleared_invis messages deferred (counts stay 0 here)

    if (!num) await pline("You don't find anything.");
    return num;
}

/**
 * C ref: detect.c skip_premap_detect — skip solidified outside-map stone.
 */
function skip_premap_detect(x, y) {
    const lev = game.level?.at(x, y);
    if (!lev || lev.typ !== STONE) return false;
    const wi = (lev.wall_info | 0) || (lev.flags | 0);
    return (wi & (W_NONDIGGABLE | W_NONPASSWALL)) !== 0;
}

/**
 * C ref: display.c map_background — remember real terrain; show if directed.
 */
function map_background(x, y, show) {
    const lev = game.level?.at(x, y);
    if (!lev) return;
    const tg = terrain_glyph(lev, x, y);
    if (game.level?.flags?.hero_memory) {
        lev.remembered_glyph = {
            ch: tg.ch, color: tg.color, decgfx: !!tg.dec,
        };
    }
    if (show) show_glyph_cell(x, y, tg.ch, tg.color, !!tg.dec);
}

/**
 * C ref: display.c map_object — remember boulder glyph for premap path.
 */
function map_object_premap(obj, show) {
    if (!obj) return;
    const x = obj.ox | 0;
    const y = obj.oy | 0;
    const lev = game.level?.at(x, y);
    if (!lev) return;
    const og = obj_glyph(obj);
    if (game.level?.flags?.hero_memory) {
        lev.remembered_glyph = {
            ch: og.ch, color: og.color, decgfx: !!og.dec,
        };
    }
    if (show) show_glyph_cell(x, y, og.ch, og.color, !!og.dec);
}

/**
 * C ref: detect.c premap_detect — Sokoban (and other premapped) levels.
 * Sets seenv/waslit, maps background + boulders, marks traps seen.
 * Caller must solidify_map first so outside STONE is skipped.
 */
export function premap_detect() {
    for (let x = 1; x < COLNO; x++) {
        for (let y = 0; y < ROWNO; y++) {
            if (skip_premap_detect(x, y)) continue;
            const lev = game.level?.at(x, y);
            if (!lev) continue;
            lev.seenv = SVALL;
            lev.waslit = true;
            if (lev.typ === SDOOR) {
                // C: wall_info = 0 so door orientation is visible once found
                lev.wall_info = 0;
            }
            map_background(x, y, 1);
            const boulder = sobj_at(BOULDER, x, y);
            if (boulder) map_object_premap(boulder, 1);
        }
    }
    const ftrap = game.ftrap;
    const trapList = [];
    if (Array.isArray(game.level?.traps)) {
        trapList.push(...game.level.traps);
    } else if (Array.isArray(ftrap)) {
        trapList.push(...ftrap);
    } else {
        for (let ttmp = ftrap; ttmp; ttmp = ttmp.ntrap) trapList.push(ttmp);
    }
    for (const ttmp of trapList) {
        if (!ttmp) continue;
        ttmp.tseen = 1;
        map_trap(ttmp, 1);
    }
}

/**
 * C ref: detect.c show_map_spot — magic mapping / clairvoyance cell update.
 * Confusion path rolls rn2(7) skip; oldglyph trap/object restore deferred.
 */
export function show_map_spot(x, y, cnf) {
    if (cnf && rn2(7)) return;
    const lev = game.level?.at(x, y);
    if (!lev) return;

    lev.seenv = SVALL;

    // Secret corridors are found, but not secret doors.
    if (lev.typ === SCORR) {
        lev.typ = CORR;
        recalc_block_point(x, y); // C: unblock_point
    }

    if (game.level?.flags?.hero_memory) {
        magic_map_background(x, y, 0);
        newsym(x, y);
    } else {
        magic_map_background(x, y, 1);
    }

    // C: !IS_FURNITURE → tseen trap else engraving (even !erevealed)
    // else oldglyph trap/object restore. newsym alone would keep floor
    // when erevealed is still clear (D-0814 / D-0928 #1158).
    if (!IS_FURNITURE(lev.typ)) {
        const trap = t_at(x, y);
        if (trap && trap.tseen) {
            map_trap(trap, 1);
        } else {
            const ep = engr_at(x, y);
            if (ep && !cnf) {
                map_engraving(ep, 1);
            }
            // else glyph_is_trap/object(oldglyph) restore deferred
        }
    }
    // C: possibly update #overview when mapping a room cell
    if (!cnf && ((lev.roomno | 0) >= ROOMOFFSET)) {
        room_discovered((lev.roomno | 0) - ROOMOFFSET);
    }
}

/**
 * C ref: detect.c do_mapping — full-level magic mapping.
 * hero_memory path (default): no browse_map. notice_mon_off/on deferred.
 */
export function do_mapping() {
    const u = game.u || {};
    // C: unconstrain_map — underwater/buried/swallow; return if any change
    const unconstrained = !!(u.uinwater || u.uburied || u.uswallow);
    if (unconstrained) {
        // save/clear flags deferred — ordinary start is never constrained
    }

    const confused = !!(u.Confusion);
    for (let zx = 1; zx < COLNO; zx++) {
        for (let zy = 0; zy < ROWNO; zy++) {
            show_map_spot(zx, zy, confused);
        }
    }

    if (!game.level?.flags?.hero_memory || unconstrained) {
        // browse_map / map_redisplay deferred
    }
    // reconstrain_map no-op when unconstrained was false

    exercise(A_WIS, true);
}

/**
 * C ref: detect.c map_monst — show_glyph mon/pet/detected; worm segs deferred.
 */
function map_monst(mtmp, mon_glyph, show_glyph_cell) {
    const g = mon_glyph(mtmp);
    show_glyph_cell(mtmp.mx, mtmp.my, g.ch, g.color, false);
}

/**
 * C ref: detect.c monster_detect — crystal balls / potions / fountains.
 * Returns 1 if nothing detected, 0 if something was.
 * Branch envelope: live-fmon scan + cls + map_monst + You sense +
 * browse_map(TER_DETECT|TER_MON) when !blessed-otmp; map_redisplay.
 * Named omissions: strange_feeling when !mcnt+otmp; cursed-otmp wake;
 * blessed persistent display_nhwindow; unconstrain underwater/buried/
 * swallow; worm detect_wsegs; pet_to_glyph / detected_mon_to_glyph
 * (plain mon_glyph); Hallucination strange_feeling text.
 */
export async function monster_detect(otmp, mclass) {
    const { cls, pline, mon_glyph, show_glyph_cell, flush_topl_more } =
        await import('./display.js');

    let mcnt = 0;
    for (const mtmp of game.fmon || []) {
        if ((mtmp.mhp | 0) < 1) continue;
        if (mtmp.isgd && !(mtmp.mx | 0)) continue;
        mcnt++;
        break;
    }

    if (!mcnt) {
        // strange_feeling(otmp, ...) deferred — fountain uses return 1 only
        void otmp;
        return 1;
    }

    const u = game.u || {};
    const swallowed = !!(u.uswallow);
    await cls();
    // unconstrain_map deferred (ordinary start not underwater/buried)

    for (const mtmp of game.fmon || []) {
        if ((mtmp.mhp | 0) < 1) continue;
        if (mtmp.isgd && !(mtmp.mx | 0)) continue;
        const mlet = mtmp.data?.mlet;
        if (!mclass || mlet === mclass) {
            map_monst(mtmp, mon_glyph, show_glyph_cell);
        }
        // cursed otmp helpless wake deferred
    }
    if (!swallowed) {
        // C: display_self() — hero '@' (usteed deferred)
        show_glyph_cell(u.ux | 0, u.uy | 0, '@', CLR_WHITE, false);
    }
    await pline('You sense the presence of monsters.');
    // C session: sense message --More-- before getpos tip
    await flush_topl_more();

    // otmp&&blessed && !unconstrained → display_nhwindow(WIN_MAP) deferred
    u.EDetect_monsters = (u.EDetect_monsters | 0) | I_SPECIAL;
    await browse_map(TER_DETECT | TER_MON, 'monster of interest');
    u.EDetect_monsters = (u.EDetect_monsters | 0) & ~I_SPECIAL;

    await map_redisplay();
    return 0;
}

/**
 * C ref: detect.c browse_map — getpos autodescribe over current map.
 * Sets terrainmode + autodescribe; getpos auto_describe uses display glyphs.
 */
async function browse_map(ter_typ, ter_explain) {
    const { getpos } = await import('./getpos.js');
    const u = game.u || {};
    const dummy = { x: u.ux | 0, y: u.uy | 0 };
    if (!game.iflags) game.iflags = {};
    const save_autodescribe = !!game.iflags.autodescribe;
    game.iflags.autodescribe = true;
    game.iflags.terrainmode = ter_typ | 0;
    await getpos(dummy, false, ter_explain);
    game.iflags.terrainmode = 0;
    game.iflags.autodescribe = save_autodescribe;
}

/**
 * C ref: detect.c map_redisplay — reconstrain + docrt.
 * Underwater/buried under_* deferred with unconstrain.
 */
async function map_redisplay() {
    // reconstrain_map no-op when unconstrain was not applied
    const { docrt, flush_screen } = await import('./display.js');
    await docrt();
    await flush_screen(1);
}

/**
 * C ref: detect.c reveal_terrain — known/full map without selected layers.
 * Branch envelope: Hallucination/Stunned/Confusion gate; getglyph/show_glyph
 * rewrite; flush; Showing pline; browse_map; map_redisplay.
 * Named omissions: unconstrain_map underwater/buried/swallow; region/
 * gascloud; trap_to_glyph keep_traps restore; M_AP_FURNITURE; TER_FULL
 * explore body beyond getglyph; arboreal default tree.
 */
export async function reveal_terrain(which_subset) {
    const full = (which_subset & TER_FULL) !== 0;
    const u = game.u || {};
    if ((u.Hallucination || u.Stunned || u.Confusion) && !full) {
        await pline('You are too disoriented for this.');
        return;
    }

    const keep_traps = (which_subset & TER_TRP) !== 0;
    const keep_objs = (which_subset & TER_OBJ) !== 0;
    const keep_mons = (which_subset & TER_MON) !== 0;
    // C: swallowed captured before unconstrain_map (unconstrain deferred)
    const swallowed = !!(u.uswallow);

    const { reveal_terrain_show_map, flush_screen } = await import('./display.js');
    reveal_terrain_show_map(which_subset, swallowed);
    await flush_screen(1);

    let buf;
    if (full) {
        buf = 'underlying terrain';
    } else {
        buf = 'known terrain';
        if (keep_traps) {
            buf += `${(keep_objs || keep_mons) ? ',' : ' and'} traps`;
        }
        if (keep_objs) {
            buf += `${(keep_traps || keep_mons) ? ',' : ''}${keep_mons ? '' : ' and'} objects`;
        }
        if (keep_mons) {
            buf += `${(keep_traps || keep_objs) ? ',' : ''} and monsters`;
        }
    }
    await pline(`Showing ${buf} only...`);

    which_subset |= TER_MAP;
    await browse_map(which_subset, 'anything of interest');
    await map_redisplay();
}

/**
 * C ref: cmd.c doterrain — #terrain View which? menu then reveal_terrain.
 * Branch envelope: recalc_mapseen; normal a/b/c choices (a preselected *);
 * explore/discover + wizard extras 4–6; Esc cancel (which=-1);
 * space/return → preselected 1; letter pick. wiz_map_levltyp /
 * wiz_levltyp_legend bodies deferred.
 */
export async function doterrain() {
    const { nhgetch } = await import('./input.js');
    const { flush_screen, flush_topl_more, docrt } = await import('./display.js');
    const { paint_corner_nhw_menu } = await import('./invent.js');
    const { ATR_INVERSE } = await import('./terminal.js');
    const { recalc_mapseen } = await import('./dungeon.js');

    await flush_topl_more();
    recalc_mapseen();

    const items = [
        { which: 1, text: 'known map without monsters, objects, and traps', selected: true },
        { which: 2, text: 'known map without monsters and objects', selected: false },
        { which: 3, text: 'known map without monsters', selected: false },
    ];
    const discover = !!(game.flags?.explore || game.flags?.discover);
    const wizard = !!(game.flags?.debug || game.flags?.wizard);
    if (discover || wizard) {
        items.push({
            which: 4,
            text: 'full map without monsters, objects, and traps',
            selected: false,
        });
        if (wizard) {
            items.push({
                which: 5,
                text: 'internal levl[][].typ codes in base-36',
                selected: false,
            });
            items.push({
                which: 6,
                text: 'legend of base-36 levl[][].typ codes',
                selected: false,
            });
        }
    }

    const choices = [];
    const body = [];
    for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const letter = String.fromCharCode(97 + i); // a, b, c, …
        const mark = it.selected ? '*' : '-'; // contest nomux: selected → '*'
        body.push({ text: `${letter} ${mark} ${it.text}`, attr: 0 });
        choices.push({
            key: letter,
            which: it.which,
            preselected: !!it.selected,
        });
    }

    const entries = [
        { text: 'View which?', attr: ATR_INVERSE },
        { text: '', attr: 0 },
        ...body,
    ];

    let which = -1;
    for (;;) {
        await paint_corner_nhw_menu(entries, '(end) ');
        const key = await nhgetch();
        game._menu_overlay = false;
        await docrt();
        await flush_screen(1);
        const ch = String.fromCharCode(key);
        if (key === 27) {
            which = -1; // C: n < 0
            break;
        }
        // C: space/return with preselected still on → n==1 → sel[0]==1
        //    or n==0 (toggled off) still maps to which=1
        if (ch === ' ' || key === 13 || key === 10) {
            const pre = choices.find((c) => c.preselected);
            which = pre ? pre.which : 1;
            break;
        }
        const hit = choices.find((c) => c.key === ch || c.key === ch.toLowerCase());
        if (hit) {
            which = hit.which;
            break;
        }
        // invalid → re-prompt (C select_menu stays open)
    }

    switch (which) {
    case 1:
        await reveal_terrain(TER_MAP);
        break;
    case 2:
        await reveal_terrain(TER_MAP | TER_TRP);
        break;
    case 3:
        await reveal_terrain(TER_MAP | TER_TRP | TER_OBJ);
        break;
    case 4:
        await reveal_terrain(TER_MAP | TER_FULL);
        break;
    case 5:
    case 6:
        // wiz_map_levltyp / wiz_levltyp_legend deferred
        break;
    default:
        break;
    }
    return ECMD_OK;
}
