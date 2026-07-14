// detect.js — Searching / dosearch0 / findit / do_mapping / #terrain.
// C ref: detect.c — dosearch0, find_trap, cvt_sdoor_to_door, findit,
// findone, show_map_spot, do_mapping, reveal_terrain, browse_map;
// cmd.c doterrain; vision.c do_clear_area (hero-centered).
//
// Branch envelope: 8-neighbour SDOOR/SCORR/trap search with fund
// (lenses); findit clear-area reveal of SDOOR/SCORR/unseen traps +
// empty "don't find anything" path; do_mapping hero_memory path
// (no browse_map) + show_map_spot SCORR uncover / seenv=SVALL /
// magic_map_background; **#terrain / doterrain** View which? PICK_ONE
// (a/b/c + explore/wizard extras) + Esc cancel; reveal_terrain
// impairment gate + Showing pline + browse_map/getpos + docrt;
// **cmd_safety_prevention** for explicit `s` beside hostiles (D-0228).
// Named omissions: feel_location / visible_region_at /
// unmap_invisible / Blind feel; mfind0 body; Hallucination/cls
// map_trap wait; activate_statue_trap; artifact SPFX_SEARCH;
// warnreveal; room_discovered;
// map_trap/map_engraving restore after furniture; unconstrain
// underwater-buried-swallow; notice_mon_off/on; findone
// flash_glyph / mimic / hider / invis / chest-trap detect;
// trapped-door dummytrap; FOUND_FLASH_COUNT==0 tmp_at path;
// reveal_terrain_getglyph / show_glyph map rewrite; wiz_map_levltyp /
// wiz_levltyp_legend; TER_FULL explore-only map body.

import { game } from './gstate.js';
import { rnl, rn2 } from './rng.js';
import { newsym, pline, magic_map_background } from './display.js';
import { vision_recalc, couldsee } from './vision.js';
import { an } from './objnam.js';
import { A_WIS, exercise } from './attrib.js';
import { t_at } from './trap.js';
import { cmd_safety_prevention } from './do.js';
import { m_at } from './mon.js';
import { objectNames } from './objects.js';
import {
    isok, SDOOR, SCORR, DOOR, CORR, D_NODOOR, D_CLOSED, D_LOCKED, WM_MASK,
    STATUE_TRAP, NO_TRAP, TRAPNUM, Is_rogue_level, BOLT_LIM, COLNO, ROWNO,
    SVALL, IS_FURNITURE,
    TER_MAP, TER_TRP, TER_OBJ, TER_MON, TER_FULL, ECMD_OK,
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

/**
 * C ref: detect.c browse_map — getpos autodescribe over current map.
 * terrainmode / describe-at-glyph deferred (getpos uses ordinary look).
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
 * Branch envelope: Hallucination/Stunned/Confusion gate; Showing pline;
 * browse_map; map_redisplay. Map-cell rewrite via
 * reveal_terrain_getglyph/show_glyph deferred (named omission).
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
    // unconstrain_map / docrt + reveal_terrain_getglyph loop deferred

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
