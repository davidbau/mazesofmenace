// detect.js — Searching / dosearch0 subset.
// C ref: detect.c — dosearch0, find_trap, cvt_sdoor_to_door; dosearch.
//
// Branch envelope this unit: 8-neighbour SDOOR/SCORR/trap find with fund
// (artifact SPFX_SEARCH + lenses). Named omissions: feel_location /
// visible_region_at / unmap_invisible / Blind feel path; mfind0 body
// (mimic/hider reveal); Hallucination/cls map_trap wait in find_trap;
// activate_statue_trap; cmd_safety_prevention; warnreveal; magic mapping.

import { game } from './gstate.js';
import { rnl } from './rng.js';
import { newsym, pline } from './display.js';
import { vision_recalc } from './vision.js';
import { an } from './objnam.js';
import { A_WIS, exercise } from './attrib.js';
import { t_at } from './trap.js';
import { m_at } from './mon.js';
import { objectNames } from './objects.js';
import {
    isok, SDOOR, SCORR, DOOR, CORR, D_NODOOR, D_CLOSED, D_LOCKED, WM_MASK,
    STATUE_TRAP, NO_TRAP, TRAPNUM, Is_rogue_level,
} from './const.js';

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
function cvt_sdoor_to_door(lev) {
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
