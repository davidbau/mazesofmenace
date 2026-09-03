// detect.js — Searching / dosearch0 / findit / openit / do_mapping /
// #terrain / monster_detect / use_crystal_ball.
// C ref: detect.c — dosearch0, find_trap, cvt_sdoor_to_door, findit,
// findone, openit, openone, show_map_spot, do_mapping, do_vicinity_map,
// reveal_terrain, browse_map, monster_detect, object_detect, trap_detect,
// furniture_detect, level_distance, use_crystal_ball; drawing.c def_char_to_*;
// cmd.c doterrain; vision.c do_clear_area (hero-centered).
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
// display_self + browse_map(TER_DETECT|TER_MON) (D-0370 / D-1275);
// empty otmp → strange_feeling threatened / heebie jeebies (D-1418);
// **use_crystal_ball** Blind/fail/hallu/uncharged + charged detect
// via furniture/object/monster/trap/level_distance (D-1010);
// **openit** / **openone** (apply use_bell / knock) boxes+doors+scorr+
// holding/falling traps + drawbridge (D-1028);
// **premap_detect** Sokoban premapped levels (D-0567);
// **cmd_safety_prevention** for explicit `s` beside hostiles (D-0228);
// **do_vicinity_map** clairvoyance 9×5 vicinity + skilled observe/detect
// (D-1391; caller spell.c SPE_CLAIRVOYANCE). allmain seer_turn still named.
// Named omissions: Hallucination/cls
// map_trap wait; artifact SPFX_SEARCH;
// map_trap + map_engraving after furniture (D-0928 #1158); oldglyph
// trap/object restore deferred; unconstrain still named for
// do_mapping/reveal_terrain/monster_detect (do_vicinity_map D-1391
// has save/restore; display_trap_map unconstrain+reconstrain);
// notice_mon_off/on; findone flash_glyph / mimic / hider / invis /
// foundone vision-pulse; FOUND_FLASH_COUNT==0 tmp_at path;
// detecting() vision override for openone; open_drawbridge crush/entity;
// reveal_terrain region/gascloud / trap keep restore /
// M_AP_FURNITURE; wiz_map_levltyp / wiz_levltyp_legend;
// TER_FULL explore-only map body; arboreal default tree;
// monster_detect cursed wake / blessed WIN_MAP /
// TER_DETECT autodescribe; map_monst pet/detect/monsym is D-1765;
// mfind0 set_msg_xy / display_nhwindow flush;
// object_detect buried/minvent/cursed-mimic/gold/clear_stale_map;
// observe_recursively on buried/minvent (invent+floor do_dknown D-1417);
// furniture_detect M_AP_FURNITURE seemimic polish;
// gold_detect; under_water/under_ground after reconstrain.

import { game } from './gstate.js';
import { rnl, rn2, rnd } from './rng.js';
import {
    newsym, pline, magic_map_background, terrain_glyph, obj_glyph,
    show_glyph_cell, display_self, map_trap, map_engraving, canspotmon, sensemon,
    map_invisible, glyph_is_invisible, glyph_is_monster, warning_of, You_feel,
    feel_location, feel_newsym, unmap_invisible, map_object, Norep,
    see_monsters, flush_screen, docrt,
    Hallucination, random_object, random_monster,
    pet_to_glyph, detected_mon_to_glyph, mon_to_glyph, monsym, glyph_tty_attr,
} from './display.js';
import { vision_recalc, couldsee, recalc_block_point, cansee } from './vision.js';
import { visible_region_at } from './region.js';
import { an, the, xname, The, makeplural, vtense, otense } from './objnam.js';
import { body_part } from './polyself.js';
import { A_WIS, A_INT, acurr, exercise } from './attrib.js';
import {
    t_at, activate_statue_trap, b_trapped, openholdingtrap, openfallingtrap,
    trapname,
} from './trap.js';
import { engr_at } from './engrave.js';
import { cmd_safety_prevention, make_blinded } from './do.js';
import { m_at, seemimic, wake_nearto } from './mon.js';
import { find_drawbridge, open_drawbridge } from './dbridge.js';
import { expels, digests } from './mhitu.js';
import { is_hider, hides_under } from './monsters.js';
import { Monnam, x_monnam, x_monnam_tame, trycall } from './do_name.js';
import {
    objectNames, MAXOCLASSES, WEAPON_CLASS, ARMOR_CLASS, RING_CLASS,
    AMULET_CLASS, TOOL_CLASS, FOOD_CLASS, POTION_CLASS, SCROLL_CLASS,
    SPBOOK_CLASS, WAND_CLASS, COIN_CLASS, GEM_CLASS, ROCK_CLASS,
    BALL_CLASS, CHAIN_CLASS, VENOM_CLASS, ILLOBJ_CLASS,
    def_char_to_objclass,
} from './objects.js';
import { objects_at, weight } from './mkobj.js';
import { makeknown, consume_obj_charge, observe_object } from './invent.js';
import { yn_function } from './getline.js';
import { nomul, losehp, maybe_half_phys, is_pool, closed_door } from './hack.js';
import { get_obj_location } from './timeout.js';
import { detect_wsegs } from './worm.js';
import { PM_LONG_WORM_TAIL, monsterNames } from './generated/monsters_data.js';
import { depth, dist2 } from './hacklib.js';
import {
    isok, SDOOR, SCORR, DOOR, CORR, D_NODOOR, D_CLOSED, D_LOCKED, D_ISOPEN,
    D_TRAPPED, WM_MASK, Is_box, NO_PART, u_at,
    STATUE_TRAP, NO_TRAP, TRAPNUM, Is_rogue_level, BOLT_LIM, COLNO, ROWNO,
    SVALL, IS_FURNITURE, STONE, W_NONDIGGABLE, W_NONPASSWALL,
    TER_MAP, TER_TRP, TER_OBJ, TER_MON, TER_FULL, TER_DETECT, ECMD_OK,
    I_SPECIAL, M_AP_TYPE, ARTICLE_A, ROOMOFFSET,
    TIMEOUT, Never_mind, KILLED_BY_AN, TOE, SYM_BOULDER,
    IN_SIGHT, CLAIRVOYANT, LAVAPOOL, LAVAWALL, Has_contents,
    BEAR_TRAP, TRAPPED_DOOR, TRAPPED_CHEST,
    BURIED_TOO, CONTAINED_TOO,
} from './const.js';
import { room_discovered } from './dungeon.js';

const PM_LONG_WORM = monsterNames.indexOf('PM_LONG_WORM');

/** C youprop.h Blind — (H||E) && !B; no sticky u.Blind (D-0716). */
function Blind() {
    const u = game.u || {};
    if (u.uroleplay?.blind) return true;
    if (u.ublind) return true;
    return !!(((u.HBlinded | 0) || (u.EBlinded | 0)) && !(u.BBlinded | 0));
}

/** C youprop.h Deaf — TIMEOUT/extrinsic/intrinsic/roleplay. */
function Deaf() {
    const u = game.u || {};
    return !!((u.HDeaf | 0) || (u.EDeaf | 0) || u.Deaf || u.uroleplay?.deaf);
}

/** C you.h distu — squared distance from hero. */
function distu_detect(x, y) {
    const u = game.u || {};
    return dist2(u.ux | 0, u.uy | 0, x | 0, y | 0);
}

const BOULDER = objectNames.indexOf('BOULDER');
const CRYSTAL_BALL = objectNames.indexOf('CRYSTAL_BALL');
const GOLD_PIECE = objectNames.indexOf('GOLD_PIECE');

/* C detect.c dummytrap — door/chest sense_trap stand-in; fields reset
 * at each use. OTRAP_* are detect.c local #defines. */
const dummytrap = { tx: 0, ty: 0, ttyp: 0, tseen: 0 };
const OTRAP_NONE = 0;
const OTRAP_HERE = 1;
const OTRAP_THERE = 2;
const DEF_MIMIC = 'm';
const DEF_MIMIC_DEF = ']';
const QUITCHARS = ' \r\n\x1b';

/** C drawing.c / objects.h def_oc_syms[].sym */
const DEF_OC_SYMS = {
    [ILLOBJ_CLASS]: ']',
    [WEAPON_CLASS]: ')',
    [ARMOR_CLASS]: '[',
    [RING_CLASS]: '=',
    [AMULET_CLASS]: '"',
    [TOOL_CLASS]: '(',
    [FOOD_CLASS]: '%',
    [POTION_CLASS]: '!',
    [SCROLL_CLASS]: '?',
    [SPBOOK_CLASS]: '+',
    [WAND_CLASS]: '/',
    [COIN_CLASS]: '$',
    [GEM_CLASS]: '*',
    [ROCK_CLASS]: '`',
    [BALL_CLASS]: '0',
    [CHAIN_CLASS]: '_',
    [VENOM_CLASS]: '.',
};

/**
 * C defsym.h MONSYM letters → mlet name (first match wins for
 * def_char_to_monclass). S_MIMIC_DEF ']' remapped to DEF_MIMIC before call.
 */
const DEF_MONSYM_TO_MLET = {
    a: 'S_ANT', b: 'S_BLOB', c: 'S_COCKATRICE', d: 'S_DOG', e: 'S_EYE',
    f: 'S_FELINE', g: 'S_GREMLIN', h: 'S_HUMANOID', i: 'S_IMP', j: 'S_JELLY',
    k: 'S_KOBOLD', l: 'S_LEPRECHAUN', m: 'S_MIMIC', n: 'S_NYMPH', o: 'S_ORC',
    p: 'S_PIERCER', q: 'S_QUADRUPED', r: 'S_RODENT', s: 'S_SPIDER',
    t: 'S_TRAPPER', u: 'S_UNICORN', v: 'S_VORTEX', w: 'S_WORM', x: 'S_XAN',
    y: 'S_LIGHT', z: 'S_ZRUTY',
    A: 'S_ANGEL', B: 'S_BAT', C: 'S_CENTAUR', D: 'S_DRAGON', E: 'S_ELEMENTAL',
    F: 'S_FUNGUS', G: 'S_GNOME', H: 'S_GIANT', I: 'S_invisible',
    J: 'S_JABBERWOCK', K: 'S_KOP', L: 'S_LICH', M: 'S_MUMMY', N: 'S_NAGA',
    O: 'S_OGRE', P: 'S_PUDDING', Q: 'S_QUANTMECH', R: 'S_RUSTMONST',
    S: 'S_SNAKE', T: 'S_TROLL', U: 'S_UMBER', V: 'S_VAMPIRE', W: 'S_WRAITH',
    X: 'S_XORN', Y: 'S_YETI', Z: 'S_ZOMBIE',
    '@': 'S_HUMAN', ' ': 'S_GHOST', "'": 'S_GOLEM', '&': 'S_DEMON',
    ';': 'S_EEL', ':': 'S_LIZARD', '~': 'S_WORM_TAIL',
};

/** C youprop.h BlindedTimeout */
function BlindedTimeout() {
    return (game.u?.HBlinded | 0) & TIMEOUT;
}

/** C invent.c useup — quan-- or remove from invent. */
function useup(otmp) {
    if (!otmp) return;
    if ((otmp.quan || 1) > 1) {
        otmp.quan--;
        otmp.owt = weight(otmp);
        return;
    }
    const inv = game.invent || [];
    const idx = inv.indexOf(otmp);
    if (idx >= 0) inv.splice(idx, 1);
}

/**
 * C ref: potion.c strange_feeling — beginner/Hallucination default
 * text, else txt; trycall if dknown; useup. Crystal-ball callers
 * pass a null detector and skip this.
 */
export async function strange_feeling(obj, txt) {
    const beginner = !!(game.flags?.beginner);
    const Hallucination = !!(game.u?.Hallucination || game.u?.HHallucination);
    if (beginner || !txt) {
        await pline(
            `You have a ${Hallucination ? 'normal' : 'strange'} feeling for a moment, then it passes.`,
        );
    } else {
        await pline(txt);
    }
    if (!obj) return;
    if (obj.dknown) await trycall(obj);
    useup(obj);
}

/**
 * C ref: detect.c observe_recursively — observe_object then contents.
 */
function observe_recursively(obj) {
    if (!obj) return;
    observe_object(obj);
    if (Has_contents(obj)) {
        for (let otmp = obj.cobj; otmp; otmp = otmp.nobj) {
            observe_recursively(otmp);
        }
    }
}

function Tobjnam(obj, verb) {
    const bp = The(xname(obj));
    return verb ? `${bp} ${otense(obj, verb)}` : bp;
}

/** C polyself.c poly_gender — 0 male / 1 female / 2 none. */
function poly_gender() {
    return game.flags?.female ? 1 : 0;
}

/** C potion.c hcolor — Hallucination synonym deferred; null → random. */
function hcolor(colorword) {
    if (colorword) return colorword;
    const colors = [
        'black', 'amber', 'golden', 'light blue', 'red', 'green',
        'silver', 'blue', 'purple', 'white', 'orange',
    ];
    return colors[rn2(colors.length)];
}

/** C mondata.c resists_blnd — Blind/Unaware early true. */
function resists_blnd(_mon) {
    const u = game.u || {};
    if (Blind()) return true;
    if (u.Unaware) return true;
    return false;
}

/** C questpgr.c is_quest_artifact */
function is_quest_artifact(obj) {
    const want = game.urole?.questarti | 0;
    return !!(obj && want && (obj.oartifact | 0) === want);
}

/**
 * C ref: drawing.c def_char_to_monclass — return mlet name or null.
 */
function def_char_to_monclass_mlet(ch) {
    return DEF_MONSYM_TO_MLET[ch] || null;
}

/**
 * C ref: drawing.c def_char_is_furniture — ASCII furniture block.
 * Full defsyms explanation scan deferred; matches standard furniture chars.
 * @returns {number} >=0 if furniture, else -1
 */
function def_char_is_furniture(ch) {
    // C defsyms contiguous furniture: stairs…fountain (`<>_{|\`)
    if ('<>_{|\\'.includes(ch)) return 1;
    return -1;
}

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
                await pline(
                    `Your danger sense causes you to take a second ${
                        Blind() ? 'to check nearby' : 'look close by'}.`,
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
 * C ref: detect.c warnreveal — adjacent mundetected Warning targets.
 * Via_warning mfind0; set_msg_xy / display_nhwindow flush still deferred.
 */
export async function warnreveal() {
    const u = game.u || {};
    const ux = u.ux | 0;
    const uy = u.uy | 0;
    for (let x = ux - 1; x <= ux + 1; x++) {
        for (let y = uy - 1; y <= uy + 1; y++) {
            if (!isok(x, y) || (x === ux && y === uy)) continue;
            const mtmp = m_at(x, y);
            if (mtmp && warning_of(mtmp) && mtmp.mundetected) {
                await mfind0(mtmp, 1); // via_warning
            }
        }
    }
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
    const isBlind = Blind();
    if (ublindf && ublindf.otyp === LENSES && !isBlind) fund += 2;
    if (fund > 5) fund = 5;

    for (let x = u.ux - 1; x < u.ux + 2; x++) {
        for (let y = u.uy - 1; y < u.uy + 2; y++) {
            if (!isok(x, y)) continue;
            if (x === u.ux && y === u.uy) continue;

            const loc = game.level?.at(x, y);
            if (!loc) continue;

            // C: !aflag && (Blind || visible_region_at) → feel_location
            if (!aflag && (isBlind || visible_region_at(x, y))) {
                feel_location(x, y);
            }

            if (loc.typ === SDOOR) {
                if (rnl(7 - fund)) continue;
                cvt_sdoor_to_door(loc);
                recalc_block_point(x, y); // C: recalc_block_point
                exercise(A_WIS, true);
                nomul_clear();
                // C: feel_location — make sure door shows up
                feel_location(x, y);
                await pline('You find a hidden door.');
            } else if (loc.typ === SCORR) {
                if (rnl(7 - fund)) continue;
                loc.typ = CORR;
                recalc_block_point(x, y); // C: unblock_point
                exercise(A_WIS, true);
                nomul_clear();
                // C: feel_newsym — make sure passage shows up
                feel_newsym(x, y);
                await pline('You find a hidden passage.');
            } else {
                let mtmp = null;
                if (!aflag) {
                    mtmp = m_at(x, y);
                    if (mtmp) {
                        const mfres = await mfind0(mtmp, 0);
                        if (mfres === -1) continue;
                        if (mfres > 0) return mfres;
                    }
                    // C: !Blind → unmap_invisible (Blind feel_location already)
                    if (!mtmp && !isBlind) unmap_invisible(x, y);
                }

                const trap = t_at(x, y);
                if (trap && !trap.tseen && !rnl(8)) {
                    nomul_clear();
                    if (trap.ttyp === STATUE_TRAP) {
                        if (await activate_statue_trap(trap, x, y, false)) {
                            exercise(A_WIS, true);
                        }
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
 * C ref: detect.c findone — SDOOR/SCORR/unseen traps + sense_trap.
 * Flash, mimic/hider/invis, foundone vision-pulse deferred.
 */
function findone(zx, zy, found) {
    const lev = game.level?.at(zx, zy);
    if (!lev) return;

    found.ft_cc = { x: zx, y: zy };

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
        sense_trap(ttmp, zx, zy, 0); /* handles Hallucination */
        found.num_traps++;
    }
    if (closed_door(zx, zy) && ((lev.doormask || 0) & D_TRAPPED) !== 0) {
        dummytrap.ttyp = TRAPPED_DOOR;
        dummytrap.tx = zx;
        dummytrap.ty = zy;
        dummytrap.tseen = 1;
        sense_trap(dummytrap, zx, zy, 0);
        found.num_traps++;
    }
    let mtmp = m_at(zx, zy);
    if (mtmp && ((mtmp.mhp | 0) < 1 || (mtmp.isgd && !(mtmp.mx | 0)))) {
        mtmp = null;
    }
    detect_obj_traps(game.level?.buriedobjlist, true, 0, found);
    detect_obj_traps(floor_objects(), true, 0, found);
    if (mtmp) detect_obj_traps(mtmp.minvent, true, 0, found);
    if (u_at(zx, zy)) detect_obj_traps(game.invent, true, 0, found);
}

/**
 * C ref: detect.c findit — reveal secrets in BOLT_LIM clear area.
 * @returns {Promise<number>} count of things found
 */
export async function findit() {
    const u = game.u || {};
    if (u.uswallow) return 0;

    const found = {
        ft_cc: { x: u.ux | 0, y: u.uy | 0 },
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
 * C ref: detect.c openone — unlock boxes; open SDOOR/closed doors / SCORR;
 * reveal unseen traps; openholdingtrap / openfallingtrap; drawbridge.
 * Named omit: detecting() vision override; trapped-door dummytrap.
 */
async function openone(zx, zy, num) {
    for (let otmp = objects_at(zx, zy); otmp; otmp = otmp.nexthere) {
        if (Is_box(otmp) && otmp.olocked) {
            otmp.olocked = 0;
            num.n++;
        }
    }
    const lev = game.level?.at(zx, zy);
    if (lev && (lev.typ === SDOOR
        || (lev.typ === DOOR
            && ((lev.doormask | 0) & (D_CLOSED | D_LOCKED))))) {
        if (lev.typ === SDOOR) cvt_sdoor_to_door(lev);
        if ((lev.doormask | 0) & D_TRAPPED) {
            if (distu_detect(zx, zy) < 3) {
                await b_trapped('door', NO_PART);
            } else {
                const how = cansee(zx, zy)
                    ? 'see'
                    : (!Deaf() ? 'hear' : 'feel the shock of');
                await Norep(`You ${how} an explosion!`);
            }
            await wake_nearto(zx, zy, 11 * 11);
            lev.doormask = D_NODOOR;
        } else {
            lev.doormask = D_ISOPEN;
        }
        recalc_block_point(zx, zy);
        newsym(zx, zy);
        num.n++;
    } else if (lev && lev.typ === SCORR) {
        lev.typ = CORR;
        recalc_block_point(zx, zy);
        newsym(zx, zy);
        num.n++;
    } else if (t_at(zx, zy)) {
        const ttmp = t_at(zx, zy);
        if (ttmp && !ttmp.tseen && ttmp.ttyp !== STATUE_TRAP) {
            ttmp.tseen = 1;
            newsym(zx, zy);
            num.n++;
        }
        const mon = u_at(zx, zy) ? game.youmonst : m_at(zx, zy);
        const hold = await openholdingtrap(mon);
        let fall = { happened: false };
        if (!hold.happened) fall = await openfallingtrap(mon, true);
        if (hold.happened || fall.happened) num.n++;
    } else {
        const xy = { x: zx | 0, y: zy | 0 };
        if (find_drawbridge(xy)) {
            await open_drawbridge(xy.x, xy.y);
            num.n++;
        }
    }
}

/**
 * C ref: detect.c openit — swallow expels (return -1); else do_clear_area
 * openone in BOLT_LIM. Returns count of things opened.
 */
export async function openit() {
    const u = game.u || {};
    if (u.uswallow) {
        const stuck = u.ustuck;
        if (stuck && digests(stuck.data)) {
            if (Blind()) await pline('Its mouth opens!');
            else await pline(`${Monnam(stuck)} opens its mouth!`);
        }
        if (stuck) await expels(stuck, stuck.data, true);
        return -1;
    }
    const num = { n: 0 };
    const cells = [];
    do_clear_area(u.ux, u.uy, BOLT_LIM, (x, y) => { cells.push([x, y]); }, null);
    for (const [x, y] of cells) await openone(x, y, num);
    return num.n;
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
            otyp: obj.otyp | 0,
            boulder: true,
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
 * hero_memory path (default): no browse_map. notice_mon_off/on live
 * in caller seffect_magic_mapping (D-1407), not here (C do_mapping
 * does not wrap them).
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

/** C youprop.h Clairvoyant — (H||E) && !B. */
function Clairvoyant() {
    const u = game.u || {};
    const p = u.uprops?.[CLAIRVOYANT];
    const h = (u.HClairvoyant | 0) || (p?.intrinsic | 0);
    const e = (u.EClairvoyant | 0) || (p?.extrinsic | 0);
    const b = (u.BClairvoyant | 0) || (p?.blocked | 0);
    return !!(h || e) && !b;
}

/** C youprop.h Confusion ≡ HConfusion (sticky u.Confusion kept). */
function Confusion_detect() {
    const u = game.u || {};
    return !!((u.HConfusion | 0) || u.Confusion);
}

/**
 * C display.h covers_objects — pool && !Underwater, or lava.
 * Underwater ≡ u.uinwater (youprop.h).
 */
function covers_objects_detect(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    const t = loc.typ | 0;
    if (t === LAVAPOOL || t === LAVAWALL) return true;
    if (is_pool(x, y) && !(game.u?.uinwater | 0)) {
        return true;
    }
    return false;
}

/**
 * C detect.c unconstrain_map — snapshot/clear uinwater/uburied/uswallow.
 * Return true iff any of those was set.
 */
function unconstrain_map() {
    const u = game.u || {};
    if (!game.iflags) game.iflags = {};
    const res = !!(u.uinwater || u.uburied || u.uswallow);
    game.iflags.save_uinwater = u.uinwater | 0;
    u.uinwater = 0;
    game.iflags.save_uburied = u.uburied | 0;
    u.uburied = 0;
    game.iflags.save_uswallow = u.uswallow;
    u.uswallow = 0;
    return res;
}

/** C detect.c reconstrain_map — restore flags saved by unconstrain_map. */
function reconstrain_map() {
    const u = game.u || {};
    if (!game.iflags) game.iflags = {};
    u.uinwater = game.iflags.save_uinwater | 0;
    game.iflags.save_uinwater = 0;
    u.uburied = game.iflags.save_uburied | 0;
    game.iflags.save_uburied = 0;
    u.uswallow = game.iflags.save_uswallow;
    game.iflags.save_uswallow = 0;
}

/**
 * JS gbuf analogue: loc.disp_* plus integer loc.disp_glyph when set.
 * C ref: display.c glyph_at / gbuf[y][x].glyph.
 */
function glyph_at_disp(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) {
        return { ch: '', color: null, kind: '', invisible: false };
    }
    const invisible = loc.disp_kind === 'invisible'
        || !!loc.remembered_glyph?.invisible;
    return {
        ch: loc.disp_ch ?? '',
        color: loc.disp_color ?? null,
        kind: loc.disp_kind ?? '',
        invisible,
        glyph: loc.disp_glyph,
    };
}

function glyph_disp_changed(a, b) {
    return a.ch !== b.ch || a.color !== b.color || a.kind !== b.kind
        || a.invisible !== b.invisible;
}

/**
 * C ref: detect.c do_vicinity_map — clairvoyance snapshot (spell or timed).
 * Branch envelope: 9×5 rectangle around hero; show_map_spot + top object +
 * map_monst / map_invisible; skilled/blessed/Clairvoyant observe_object +
 * mdetected browse; random_farsight quick_farsight skip; post-loop I-replace
 * + see_monsters; browse_map then docrt.
 * Named omissions: allmain seer_turn caller still named. detect_wsegs is
 * D-1545 (map_monst FALSE here, like C `:1531`). map_monst
 * pet/detected/monsym is D-1765.
 * @param {object|null} sobj fake spellbook (null = random farsight)
 */
export async function do_vicinity_map(sobj) {
    const u = game.u || {};
    const ux = u.ux | 0;
    const uy = u.uy | 0;
    const extended = !!(sobj && (sobj.blessed || Clairvoyant()));
    const random_farsight = !sobj;
    const lo_y = (uy - 5 < 0) ? 0 : uy - 5;
    const hi_y = (uy + 6 >= ROWNO) ? ROWNO - 1 : uy + 6;
    const lo_x = (ux - 9 < 1) ? 1 : ux - 9;
    const hi_x = (ux + 10 >= COLNO) ? COLNO - 1 : ux + 10;
    let ter_typ = TER_DETECT | TER_MAP | TER_TRP | TER_OBJ;
    let mdetected = false;
    let odetected = false;

    const vizRow = game.viz_array?.[uy];
    const save_viz_uyux = vizRow ? vizRow[ux] : 0;
    if (u.uswallow && vizRow) {
        vizRow[ux] = (vizRow[ux] | 0) | IN_SIGHT;
    }
    const save_EDetect_mons = u.EDetect_monsters | 0;
    u.EDetect_monsters = save_EDetect_mons | I_SPECIAL;
    const unconstrained = unconstrain_map();
    const confused = Confusion_detect();
    const hero_memory = !!game.level?.flags?.hero_memory;

    for (let zx = lo_x; zx <= hi_x; zx++) {
        for (let zy = lo_y; zy <= hi_y; zy++) {
            const oldglyph = glyph_at_disp(zx, zy);
            show_map_spot(zx, zy, confused);
            const otmp = objects_at(zx, zy);
            if (otmp) {
                if (extended) observe_object(otmp);
                map_object(otmp, true);
                const newglyph = glyph_at_disp(zx, zy);
                if (glyph_disp_changed(newglyph, oldglyph)
                    && covers_objects_detect(zx, zy)) {
                    odetected = true;
                }
            }
            const mtmp = m_at(zx, zy);
            if (mtmp && (mtmp.mx | 0) === zx && (mtmp.my | 0) === zy) {
                if ((unconstrained || !hero_memory)
                    && !extended && (zx !== ux || zy !== uy)
                    && oldglyph.kind !== 'monster'
                    && !glyph_is_monster(oldglyph.glyph)) {
                    map_invisible(zx, zy);
                } else {
                    map_monst(mtmp, false);
                }
                const newglyph = glyph_at_disp(zx, zy);
                if (extended && glyph_disp_changed(newglyph, oldglyph)
                    && newglyph.kind !== 'invisible' && !newglyph.invisible) {
                    mdetected = true;
                }
            }
        }
    }

    if (random_farsight && game.flags?.quick_farsight) {
        mdetected = false;
        odetected = false;
    }

    let refresh = false;
    if (!hero_memory || unconstrained || mdetected || odetected) {
        await flush_screen(1);
        await pline('You sense your surroundings.');
        const atHero = glyph_at_disp(ux, uy);
        if (extended || atHero.kind === 'monster') {
            ter_typ |= TER_MON;
        }
        await browse_map(ter_typ, 'anything of interest');
        refresh = true;
    }
    reconstrain_map();
    u.EDetect_monsters = save_EDetect_mons;
    if (game.viz_array?.[uy]) {
        game.viz_array[uy][ux] = save_viz_uyux;
    }

    for (let zx = lo_x; zx <= hi_x; zx++) {
        for (let zy = lo_y; zy <= hi_y; zy++) {
            if (u_at(zx, zy)) continue;
            const newglyph = glyph_at_disp(zx, zy);
            if (newglyph.kind !== 'monster') continue;
            const mtmp = m_at(zx, zy);
            const mnum = mtmp?.mnum ?? mtmp?.data?.mndx;
            if (mnum === PM_LONG_WORM_TAIL) continue;
            if (!mtmp || !canspotmon(mtmp)) {
                map_invisible(zx, zy);
            }
        }
    }
    see_monsters();

    if (refresh) await docrt();
}

/**
 * C detect.c :132 / :832 — mtmp->data == &mons[PM_LONG_WORM] (static
 * slot). JS mons() allocates a new object; compare mnum/mndx (D-1549).
 */
function mtmp_is_long_worm(mtmp) {
    return ((mtmp.data?.mndx ?? mtmp.mnum) | 0) === PM_LONG_WORM;
}

/**
 * C ref: detect.c map_monst :120–134 — show_glyph head; showtail &&
 * PM_LONG_WORM → detect_wsegs(mtmp, 0) (D-1545; identity D-1549).
 * monsym==' ' → detected_mon_to_glyph (ghosts); else mtame →
 * pet_to_glyph else mon_to_glyph. Integer GLYPH_*_OFF on `.glyph`.
 */
export function map_monst(mtmp, showtail) {
    const g = (monsym(mtmp.data) === ' ')
        ? detected_mon_to_glyph(mtmp)
        : mtmp.mtame
            ? pet_to_glyph(mtmp)
            : mon_to_glyph(mtmp);
    show_glyph_cell(
        mtmp.mx, mtmp.my, g.ch, g.color, false,
        glyph_tty_attr(mtmp, g.kind), g.glyph,
    );
    if (showtail && mtmp_is_long_worm(mtmp)) {
        detect_wsegs(mtmp, false);
    }
}

/**
 * C ref: detect.c monster_detect — crystal balls / potions / fountains.
 * Returns 1 if nothing detected, 0 if something was.
 * Branch envelope: live-fmon scan + cls + map_monst + You sense +
 * browse_map(TER_DETECT|TER_MON) when !blessed-otmp; map_redisplay.
 * Empty + otmp → strange_feeling (D-1418; hallu heebie jeebies else
 * threatened). Crystal-ball / fountain pass null and skip that.
 * Named omissions: cursed-otmp wake; blessed persistent
 * display_nhwindow; unconstrain underwater/buried/swallow.
 * map_monst pet/detected/monsym is D-1765.
 * detect_wsegs is D-1545 (map_monst TRUE). Long-worm identity is
 * D-1549 (mnum/mndx, not mons() ptr).
 */
export async function monster_detect(otmp, mclass) {
    const { cls, pline, flush_topl_more } =
        await import('./display.js');

    let mcnt = 0;
    for (const mtmp of game.fmon || []) {
        if ((mtmp.mhp | 0) < 1) continue;
        if (mtmp.isgd && !(mtmp.mx | 0)) continue;
        mcnt++;
        break;
    }

    if (!mcnt) {
        if (otmp) {
            const hallu = !!(game.u?.Hallucination || game.u?.HHallucination);
            await strange_feeling(
                otmp,
                hallu
                    ? 'You get the heebie jeebies.'
                    : 'You feel threatened.',
            );
        }
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
        /* C :831–834 — also map a long worm when the class is S_WORM_TAIL */
        if (!mclass || mlet === mclass
            || (mtmp_is_long_worm(mtmp)
                && mclass === 'S_WORM_TAIL')) {
            map_monst(mtmp, true);
        }
        // cursed otmp helpless wake deferred
    }
    if (!swallowed) {
        // C detect.c monster_detect — display_self() (U_AP_TYPE glyphs)
        display_self();
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

/**
 * C ref: detect.c object_detect — crystal-ball / scroll / potion path.
 * Returns 1 if nothing detected, 0 if something was.
 * Branch envelope: floor objects of class (0 = all); cls + map_object +
 * You detect + browse_map(TER_DETECT|TER_OBJ); map_redisplay.
 * Detector (D-1417): blessed potion/spellbook do_dknown observe_recursively
 * on invent + floor; nothing-found → strange_feeling then return 1.
 * Named omissions: buried/minvent/cursed-mimic/findgold; clear_stale_map;
 * do_dknown buried/minvent; boulder dual-class; absence-underfoot.
 */
export async function object_detect(detector, oclass) {
    let class_ = oclass | 0;
    if (class_ < 0 || class_ >= MAXOCLASSES) class_ = 0;

    const do_dknown = !!(detector
        && ((detector.oclass | 0) === POTION_CLASS
            || (detector.oclass | 0) === SPBOOK_CLASS)
        && detector.blessed);

    if (do_dknown) {
        for (const obj of game.invent || []) {
            if (obj) observe_recursively(obj);
        }
    }

    let ct = 0;
    let ctu = 0;
    const ux = game.u?.ux | 0;
    const uy = game.u?.uy | 0;
    for (let x = 1; x < COLNO; x++) {
        for (let y = 0; y < ROWNO; y++) {
            for (let obj = objects_at(x, y); obj; obj = obj.nexthere) {
                if (!class_ || (obj.oclass | 0) === class_) {
                    if (x === ux && y === uy) ctu++;
                    else ct++;
                }
                if (do_dknown) observe_recursively(obj);
            }
        }
    }
    if (!ct && !ctu) {
        if (detector) {
            await strange_feeling(detector, 'You feel a lack of something.');
        }
        return 1;
    }

    const { cls, flush_topl_more } = await import('./display.js');
    await cls();
    for (let x = 1; x < COLNO; x++) {
        for (let y = 0; y < ROWNO; y++) {
            for (let obj = objects_at(x, y); obj; obj = obj.nexthere) {
                if (!class_ || (obj.oclass | 0) === class_) {
                    map_object(obj, 1);
                    break;
                }
            }
        }
    }
    const stuff = class_ ? (DEF_OC_SYMS[class_] ? 'objects' : 'objects') : 'objects';
    // C: def_oc_syms[class].name — class name polish deferred
    await pline(`You detect the ${ct ? 'presence' : 'absence'} of ${stuff}.`);
    await flush_topl_more();
    if (!ct) {
        // C: display_nhwindow(WIN_MAP) — flush only
    } else {
        await browse_map(TER_DETECT | TER_OBJ, 'object');
    }
    await map_redisplay();
    return 0;
}

/**
 * C gf.ftrap / ntrap. JS maketrap pushes `level.traps`.
 */
function ftrap_list() {
    return game.ftrap || game.level?.traps || [];
}

/**
 * C fobj nobj — JS has no fobj chain; walk every cell's nexthere.
 */
function floor_objects() {
    const out = [];
    for (let x = 1; x < COLNO; x++) {
        for (let y = 0; y < ROWNO; y++) {
            for (let o = objects_at(x, y); o; o = o.nexthere) out.push(o);
        }
    }
    return out;
}

function *iter_objs(objlist) {
    if (!objlist) return;
    if (Array.isArray(objlist)) {
        for (const o of objlist) {
            if (o) yield o;
        }
        return;
    }
    for (let o = objlist; o; o = o.nobj) yield o;
}

/**
 * C ref: detect.c sense_trap — Hallu/cursed fake obj (GOLD/random quan)
 * else map_trap + tseen. Dummy BEAR_TRAP arm is C-obsolete but kept.
 */
export function sense_trap(trap, x, y, src_cursed) {
    if (Hallucination() || src_cursed) {
        const obj = {};
        if (trap) {
            obj.ox = trap.tx | 0;
            obj.oy = trap.ty | 0;
        } else {
            obj.ox = x | 0;
            obj.oy = y | 0;
        }
        obj.otyp = !Hallucination() ? GOLD_PIECE : random_object(rn2);
        const def = game.objects?.[obj.otyp];
        obj.quan = (obj.otyp === GOLD_PIECE) ? rnd(10)
            : def?.oc_merge ? rnd(2) : 1;
        obj.corpsenm = random_monster(rn2); /* if otyp == CORPSE */
        map_object(obj, 1);
    } else if (trap) {
        map_trap(trap, 1);
        trap.tseen = 1;
    } else {
        dummytrap.tx = x | 0;
        dummytrap.ty = y | 0;
        dummytrap.ttyp = BEAR_TRAP;
        map_trap(dummytrap, 1);
    }
}

/**
 * C ref: detect.c detect_obj_traps — chest otrapped on a list.
 * flash_glyph_at / foundone when ft non-null named omit (counts still).
 */
function detect_obj_traps(objlist, show_them, how, ft) {
    let result = OTRAP_NONE;
    dummytrap.ttyp = TRAPPED_CHEST;
    for (const otmp of iter_objs(objlist)) {
        let x = 0;
        let y = 0;
        if ((Is_box(otmp) && otmp.otrapped) || Has_contents(otmp)) {
            const loc = get_obj_location(otmp, BURIED_TOO | CONTAINED_TOO);
            if (!loc || !isok(loc.x, loc.y)
                || (ft && ((loc.x | 0) !== (ft.ft_cc.x | 0)
                    || (loc.y | 0) !== (ft.ft_cc.y | 0)))) {
                continue;
            }
            x = loc.x | 0;
            y = loc.y | 0;
        }
        if (Is_box(otmp) && otmp.otrapped) {
            otmp.tknown = 1;
            observe_object(otmp);
            result |= u_at(x, y) ? OTRAP_HERE : OTRAP_THERE;
            if (show_them) {
                dummytrap.tx = x;
                dummytrap.ty = y;
                sense_trap(dummytrap, x, y, how);
            }
            if (ft) {
                ft.num_traps++;
            }
        }
        if (Has_contents(otmp)) {
            result |= detect_obj_traps(otmp.cobj, show_them, how, ft);
        }
    }
    return result;
}

/**
 * C ref: detect.c display_trap_map — cls + sense_trap floor/chest/door.
 * under_water/under_ground after reconstrain named.
 */
async function display_trap_map(cursed_src) {
    const { cls, flush_topl_more } = await import('./display.js');
    let ter_typ = TER_DETECT | (cursed_src ? TER_OBJ : TER_TRP);

    await cls();
    unconstrain_map();
    detect_obj_traps(game.level?.buriedobjlist, true, cursed_src, null);
    detect_obj_traps(floor_objects(), true, cursed_src, null);
    for (const mon of game.fmon || []) {
        if (!mon || (mon.mhp | 0) < 1 || (mon.isgd && !(mon.mx | 0))) continue;
        detect_obj_traps(mon.minvent, true, cursed_src, null);
    }
    detect_obj_traps(game.invent, true, cursed_src, null);

    for (const ttmp of ftrap_list()) {
        if (ttmp) sense_trap(ttmp, 0, 0, cursed_src);
    }

    dummytrap.ttyp = TRAPPED_DOOR;
    const doors = game.level?.doors || [];
    const doorindex = game.level?.doorindex | 0;
    for (let door = 0; door < doorindex; door++) {
        const cc = doors[door];
        if (!cc) continue;
        const loc = game.level?.at(cc.x, cc.y);
        if (!loc || loc.typ === SDOOR) continue;
        if (((loc.doormask ?? loc.flags) | 0) & D_TRAPPED) {
            dummytrap.tx = cc.x;
            dummytrap.ty = cc.y;
            sense_trap(dummytrap, cc.x, cc.y, cursed_src);
        }
    }

    const ux = game.u?.ux | 0;
    const uy = game.u?.uy | 0;
    const loc = game.level?.at(ux, uy);
    /* C glyph_is_trap || glyph_is_object on gbuf after sense_trap;
     * JS has no integer glyph ids — cls left unexplored, paint sets disp. */
    if (!loc || loc.disp_kind === 'unexplored'
        || loc.disp_ch == null || loc.disp_ch === '') {
        newsym(ux, uy);
        ter_typ |= TER_MON;
    }
    await You_feel(`${cursed_src ? 'very greedy' : 'entrapped'}.`);
    await flush_topl_more();
    await browse_map(ter_typ, cursed_src ? 'gold' : 'trap of interest');
    reconstrain_map();
    await map_redisplay();
}

/**
 * C ref: detect.c trap_detect — crystal ball / cursed gold-scroll path.
 * Returns 1 if nothing detected, 0 if something was.
 */
export async function trap_detect(sobj) {
    const cursed_src = !!(sobj && sobj.cursed);
    let found = false;
    const ux = game.u?.ux | 0;
    const uy = game.u?.uy | 0;

    if (game.u?.usteed) {
        game.u.usteed.mx = ux;
        game.u.usteed.my = uy;
    }

    for (const ttmp of ftrap_list()) {
        if (!ttmp) continue;
        if ((ttmp.tx | 0) !== ux || (ttmp.ty | 0) !== uy) {
            await display_trap_map(cursed_src);
            return 0;
        }
        found = true;
    }
    let tr = detect_obj_traps(floor_objects(), false, 0, null);
    if (tr !== OTRAP_NONE) {
        if (tr & OTRAP_THERE) {
            await display_trap_map(cursed_src);
            return 0;
        }
        found = true;
    }
    tr = detect_obj_traps(game.level?.buriedobjlist, false, 0, null);
    if (tr !== OTRAP_NONE) {
        if (tr & OTRAP_THERE) {
            await display_trap_map(cursed_src);
            return 0;
        }
        found = true;
    }
    for (const mon of game.fmon || []) {
        if (!mon || (mon.mhp | 0) < 1 || (mon.isgd && !(mon.mx | 0))) continue;
        tr = detect_obj_traps(mon.minvent, false, 0, null);
        if (tr !== OTRAP_NONE) {
            if (tr & OTRAP_THERE) {
                await display_trap_map(cursed_src);
                return 0;
            }
            found = true;
        }
    }
    if (detect_obj_traps(game.invent, false, 0, null) !== OTRAP_NONE) {
        found = true;
    }
    const doors = game.level?.doors || [];
    const doorindex = game.level?.doorindex | 0;
    for (let door = 0; door < doorindex; door++) {
        const cc = doors[door];
        if (!cc) continue;
        const loc = game.level?.at(cc.x, cc.y);
        if (!loc || loc.typ === SDOOR) continue;
        if (((loc.doormask ?? loc.flags) | 0) & D_TRAPPED) {
            if ((cc.x | 0) !== ux || (cc.y | 0) !== uy) {
                await display_trap_map(cursed_src);
                return 0;
            }
            found = true;
        }
    }
    if (!found) {
        await strange_feeling(
            sobj,
            `Your ${makeplural(body_part(TOE))} stop itching.`,
        );
        return 1;
    }
    await pline(`Your ${makeplural(body_part(TOE))} itch.`);
    return 0;
}

/**
 * C ref: detect.c furniture_detect — crystal ball furniture chars.
 * Always returns 0 (C). Named omissions: M_AP_FURNITURE seemimic;
 * is_cmap_furniture glyph path; display_nhwindow when !revealed.
 */
async function furniture_detect() {
    let found = 0;
    let revealed = 0;
    for (let y = 0; y < ROWNO; y++) {
        for (let x = 1; x < COLNO; x++) {
            const loc = game.level?.at(x, y);
            if (!loc) continue;
            const before = loc.remembered_glyph;
            if (IS_FURNITURE(loc.typ)) {
                found++;
                magic_map_background(x, y, 1);
            }
            if (loc.remembered_glyph !== before) revealed++;
        }
    }
    if (!found) {
        await pline('There seems to be nothing of interest on this level.');
    } else if (!revealed) {
        await pline('Your map already shows all relevant locations.');
    }
    if (!revealed) {
        // C: display_nhwindow(WIN_MAP) — no browse
    } else {
        await browse_map(
            TER_DETECT | TER_MAP | TER_TRP | TER_OBJ | TER_MON,
            'location',
        );
    }
    await map_redisplay();
    return 0;
}

/**
 * C ref: detect.c level_distance — relative depth string for ball fallback.
 */
function level_distance(where) {
    if (!where) return 'in the distance';
    const u = game.u || {};
    const ll = (depth(u.uz) | 0) - (depth(where) | 0);
    const indun = (u.uz?.dnum | 0) === (where.dnum | 0);
    if (ll < 0) {
        if (ll < (-8 - rn2(3))) return indun ? 'far below' : 'far away';
        if (ll < -1) return indun ? 'below you' : 'away below you';
        return indun ? 'just below' : 'in the distance';
    }
    if (ll > 0) {
        if (ll > (8 + rn2(3))) return indun ? 'far above' : 'far away';
        if (ll > 1) return indun ? 'above you' : 'away above you';
        return indun ? 'just above' : 'in the distance';
    }
    return indun ? 'near you' : 'in the distance';
}

const LEVEL_DETECTS = [
    { what: 'Delphi', whereKey: 'oracle_level' },
    { what: "Medusa's lair", whereKey: 'medusa_level' },
    { what: 'a castle', whereKey: 'stronghold_level' },
    { what: "the Wizard of Yendor's tower", whereKey: 'wiz1_level' },
];

/**
 * C ref: detect.c use_crystal_ball — apply / #invoke non-arti ball.
 * Mutates invent via useup on explode/implode; returns possibly-null obj.
 * Named omissions: gulp_blnd; unpaid consume; Eyes vision_clears polish;
 * full object/trap detect arms listed above.
 * @param {object} obj
 * @returns {Promise<object|null>}
 */
export async function use_crystal_ball(obj) {
    if (!obj) return null;
    let otmp = obj;
    const charged = (otmp.spe | 0) > 0;

    if (Blind()) {
        await pline(`Too bad you can't see ${the(xname(otmp))}.`);
        return otmp;
    }

    const oops = is_quest_artifact(otmp) ? 8 : otmp.blessed ? 16 : 20;
    if (charged && (otmp.cursed || rnd(oops) > acurr(A_INT))) {
        const impair = rnd(100 - 3 * acurr(A_INT));
        const ncases = (otmp.oartifact || otmp.blessed) ? 4 : 5;
        switch (rnd(ncases)) {
        case 1:
            await pline(`${Tobjnam(otmp, 'are')} too much to comprehend!`);
            break;
        case 2:
            await pline(`${Tobjnam(otmp, 'confuse')} you!`);
            {
                const { make_confused } = await import('./potion.js');
                await make_confused(
                    ((game.u?.HConfusion | 0) & TIMEOUT) + impair,
                    false,
                );
            }
            break;
        case 3:
            if (!resists_blnd(game.youmonst || { _youmonst: true })) {
                await pline(`${Tobjnam(otmp, 'damage')} your vision!`);
                await make_blinded(BlindedTimeout() + impair, false);
                if (!Blind()) await pline('Your vision clears.');
            } else {
                await pline(`${Tobjnam(otmp, 'assault')} your vision.`);
                await pline('You are unaffected!');
            }
            break;
        case 4:
            await pline(`${Tobjnam(otmp, 'zap')} your mind!`);
            {
                const { make_hallucinated } = await import('./potion.js');
                await make_hallucinated(
                    ((game.u?.HHallucination | 0) & TIMEOUT) + impair,
                    false,
                    0,
                );
            }
            break;
        case 5:
            await pline(`${Tobjnam(otmp, 'explode')}!`);
            useup(otmp);
            otmp = null;
            losehp(
                maybe_half_phys(rnd(30)),
                'exploding crystal ball',
                KILLED_BY_AN,
            );
            break;
        default:
            break;
        }
        if (otmp) await consume_obj_charge(otmp, true);
        return otmp;
    }

    const Hallucination = !!(
        game.u?.Hallucination
        || ((game.u?.HHallucination | 0) & TIMEOUT)
    );
    if (Hallucination) {
        nomul(-rnd(charged ? 4 : 2));
        game.multi_reason = 'gazing into a Magic 8-Ball (tm)';
        game.nomovemsg = '';
        if (!charged) {
            await pline(`All you see is funky ${hcolor(null)} haze.`);
            if ((otmp.spe | 0) < 0) {
                await pline(`${Tobjnam(otmp, 'implode')}!`);
                useup(otmp);
                return null;
            }
        } else {
            switch (rnd(6)) {
            case 1:
                await pline(
                    'You grok some groovy globs of incandescent lava.',
                );
                break;
            case 2:
                await pline(
                    `Whoa!  Psychedelic colors, ${
                        poly_gender() === 1 ? 'babe' : 'dude'
                    }!`,
                );
                break;
            case 3:
                await pline(
                    `The crystal pulses with sinister ${hcolor(null)} light!`,
                );
                break;
            case 4:
                await pline(
                    'You see goldfish swimming above fluorescent rocks.',
                );
                break;
            case 5:
                await pline(
                    'You see tiny snowflakes spinning around a miniature farmhouse.',
                );
                break;
            default:
                await pline('Oh wow... like a kaleidoscope!');
                break;
            }
            await consume_obj_charge(otmp, true);
        }
        return otmp;
    }

    if (game.flags?.verbose !== false) {
        await pline(
            'You may look for an object, monster, or special map symbol.',
        );
    }
    let ch = await yn_function(
        'What do you look for?',
        null,
        '\0',
    );
    // C: ghost space not filtered; other quitchars → Never_mind
    if (ch !== ' ' && QUITCHARS.includes(ch)) {
        if (game.flags?.verbose !== false) await pline(Never_mind);
        return otmp;
    }

    await pline(`You peer into ${the(xname(otmp))}...`);
    nomul(-rnd(charged ? 10 : 2));
    game.multi_reason = 'gazing into a crystal ball';
    game.nomovemsg = '';

    if (!charged) {
        await pline('The vision is unclear.');
        if ((otmp.spe | 0) < 0) {
            await pline(`${Tobjnam(otmp, 'implode')}!`);
            useup(otmp);
            return null;
        }
    } else {
        let ret = 0;
        makeknown(CRYSTAL_BALL);
        await consume_obj_charge(otmp, true);

        if (ch === DEF_MIMIC_DEF) ch = DEF_MIMIC;

        const oclass = def_char_to_objclass(ch);
        const mlet = def_char_to_monclass_mlet(ch);
        const boulderSym = game.gs?.showsyms?.[SYM_BOULDER];

        if (def_char_is_furniture(ch) >= 0) {
            ret = await furniture_detect();
        } else if (oclass !== MAXOCLASSES) {
            ret = await object_detect(null, oclass);
        } else if (mlet) {
            ret = await monster_detect(null, mlet);
        } else if (boulderSym && ch === boulderSym) {
            ret = await object_detect(null, ROCK_CLASS);
        } else if (ch === '^') {
            ret = await trap_detect(null);
        } else {
            const i = rn2(LEVEL_DETECTS.length);
            const det = LEVEL_DETECTS[i];
            const where = game[det.whereKey];
            await pline(
                `You see ${det.what}, ${level_distance(where)}.`,
            );
            ret = 0;
        }

        if (ret) {
            if (!rn2(100)) {
                await pline(
                    'You see the Wizard of Yendor gazing out at you.',
                );
            } else {
                await pline('The vision is unclear.');
            }
        }
    }
    return otmp;
}
