// detect.js — Searching / dosearch0 / findit / do_mapping subset.
// C ref: detect.c — dosearch0, find_trap, cvt_sdoor_to_door, findit,
// findone, show_map_spot, do_mapping; vision.c do_clear_area
// (hero-centered).
//
// Branch envelope: 8-neighbour SDOOR/SCORR/trap search with fund
// (lenses); findit clear-area reveal of SDOOR/SCORR/unseen traps +
// empty "don't find anything" path; do_mapping hero_memory path
// (no browse_map) + show_map_spot SCORR uncover / seenv=SVALL /
// magic_map_background. Named omissions: feel_location /
// visible_region_at / unmap_invisible / Blind feel; mfind0 body;
// Hallucination/cls map_trap wait; activate_statue_trap; artifact
// SPFX_SEARCH; cmd_safety_prevention; warnreveal; room_discovered;
// map_trap/map_engraving restore after furniture; browse_map /
// unconstrain underwater-buried-swallow; notice_mon_off/on;
// findone flash_glyph / mimic / hider / invis / chest-trap detect;
// trapped-door dummytrap; FOUND_FLASH_COUNT==0 tmp_at path.

import { game } from './gstate.js';
import { rnl, rn2 } from './rng.js';
import { newsym, pline, magic_map_background } from './display.js';
import { vision_recalc, couldsee } from './vision.js';
import { an } from './objnam.js';
import { A_WIS, exercise } from './attrib.js';
import { t_at } from './trap.js';
import { m_at } from './mon.js';
import { objectNames } from './objects.js';
import {
    isok, SDOOR, SCORR, DOOR, CORR, D_NODOOR, D_CLOSED, D_LOCKED, WM_MASK,
    STATUE_TRAP, NO_TRAP, TRAPNUM, Is_rogue_level, BOLT_LIM, COLNO, ROWNO,
    SVALL, IS_FURNITURE,
} from './const.js';

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
 * C ref: detect.c mfind0 — stub returns 0 (nothing found).
 * Mimic/hider/invisible reveal + messages deferred (named in C-JS-MAP).
 */
function mfind0(_mtmp, _via_warning) {
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
                vision_recalc(1); // C: recalc_block_point
                exercise(A_WIS, true);
                nomul_clear();
                newsym(x, y);
                await pline('You find a hidden door.');
            } else if (loc.typ === SCORR) {
                if (rnl(7 - fund)) continue;
                loc.typ = CORR;
                vision_recalc(1); // C: unblock_point
                exercise(A_WIS, true);
                nomul_clear();
                newsym(x, y);
                await pline('You find a hidden passage.');
            } else {
                if (!aflag) {
                    const mtmp = m_at(x, y);
                    if (mtmp) {
                        const mfres = mfind0(mtmp, 0);
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
    // cmd_safety_prevention deferred
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
        vision_recalc(1);
        newsym(zx, zy);
        found.num_sdoors++;
    } else if (lev.typ === SCORR) {
        lev.typ = CORR;
        vision_recalc(1);
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
 * C ref: detect.c show_map_spot — magic mapping / clairvoyance cell update.
 * Confusion path rolls rn2(7) skip; furniture trap/engraving restore deferred.
 */
export function show_map_spot(x, y, cnf) {
    if (cnf && rn2(7)) return;
    const lev = game.level?.at(x, y);
    if (!lev) return;

    lev.seenv = SVALL;

    // Secret corridors are found, but not secret doors.
    if (lev.typ === SCORR) {
        lev.typ = CORR;
        vision_recalc(1); // C: unblock_point
    }

    if (game.level?.flags?.hero_memory) {
        magic_map_background(x, y, 0);
        newsym(x, y);
    } else {
        magic_map_background(x, y, 1);
    }

    // Non-furniture trap.tseen / engraving / oldglyph restore deferred
    if (!IS_FURNITURE(lev.typ)) {
        const trap = t_at(x, y);
        if (trap && trap.tseen) {
            newsym(x, y); // map_trap subset: redisplay via newsym
        }
    }
    // room_discovered deferred
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
