// detect.js — searching and detection.
// C ref: src/detect.c

import { trapname } from './trap.js';
import { find_drawbridge, open_drawbridge } from './dbridge.js';
import { expels } from './mhitu.js';
import { is_drawbridge_wall } from './dbridge.js';
import { b_trapped, openholdingtrap, openfallingtrap } from './trap.js';
import { def_char_to_objclass } from './sp_lev.js';
import { def_char_is_furniture, def_char_to_monclass } from './drawing.js';
import { tty_yn_function } from './tty/topl.js';
import { losehp } from './hack.js';
import { consume_obj_charge } from './apply.js';
import { is_quest_artifact } from './questpgr.js';
import { depth } from './dungeon.js';
import { do_clear_area, IN_SIGHT, COULD_SEE } from './vision.js';
import { closed_door } from './cmd.js';
import { resists_blnd, digests } from './mondata.js';
import { ATR_INVERSE as TERM_INVERSE } from './terminal.js';
import { showsym } from './symbols.js';
import { def_oc_syms } from './drawing_data.js';
import { detect_wsegs } from './worm.js';
import { is_cmap_furniture } from './pager.js';
import { get_obj_location } from './zap.js';
import { Is_box } from './obj.js';
import { observe_object, makeknown } from './o_init.js';
import { ACURR } from './attrib.js';
import { body_part, poly_gender } from './polyself.js';
import { makeplural, the, xname, Tobjnam } from './objnam.js';
import { s_suffix, distu } from './hacklib.js';
import { x_monnam, Monnam, hcolor } from './do_name.js';
import { money_cnt, hidden_gold, currency, useup, sobj_at } from './invent.js';
import { findgold } from './makemon.js';
import { wake_nearto } from './mon.js';
import { Your, You_see, pline_The, There, Norep } from './pline.js';
import { rnd, rn2_on_display_rng } from './rng.js';
import { I_SPECIAL, A_INT, u_at, OBJ_AT, Has_contents, TRAPPED_CHEST, TRAPPED_DOOR, BEAR_TRAP, D_BROKEN, D_ISOPEN, DRAWBRIDGE_UP, IS_DOOR, M_AP_OBJECT, M_AP_MONSTER, ARTICLE_YOUR, ARTICLE_THE, SUPPRESS_SADDLE, FOOT, NOSE, TOE, TIMEOUT, KILLED_BY_AN, BURIED_TOO, CONTAINED_TOO, NO_PART, BOLT_LIM, TOPLINE_EMPTY, TOPLINE_NEED_MORE } from './const.js';
import { display_self, more, unmap_object, glyph_at, see_monsters, covers_objects, flash_glyph_at } from './display.js';
import { OCLASSES, MATERIALS } from './objects_data.js';
import { PMNAMES, NUMMONS } from './monst_data.js';
import { Deaf } from './youprop.js';
import { strange_feeling, make_confused, make_blinded, make_hallucinated } from './potion.js';
import { DEADMONSTER, helpless } from './monst.js';
import { game } from './gstate.js';
import { rnl } from './rng.js';
import { isok } from './hacklib.js';
import { newsym, cls, docrt, canspotmon, sensemon, map_invisible,
         glyph_is_invisible_at, unmap_invisible, feel_location } from './display.js';
import { cmap_names, def_monsyms, defsyms } from './drawing_data.js';
import { You, You_feel } from './pline.js';
import { m_at, t_at, seemimic } from './mon.js';
import { Is_rogue_level, WM_MASK, D_LOCKED, D_CLOSED, ROWNO, COLNO,
         STONE, W_NONDIGGABLE, W_NONPASSWALL, D_TRAPPED } from './const.js';
import { SDOOR, SCORR, DOOR, CORR, D_NODOOR, SVALL, IS_FURNITURE, A_WIS,
         STATUE_TRAP } from './const.js';
import { rn2 } from './rng.js';
import { magic_map_background, map_background, map_object,
         map_trap } from './display.js';
import { exercise } from './attrib.js';
import { Blind, Hallucination } from './youprop.js';
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
import { TER_MAP, TER_TRP, TER_OBJ, TER_MON, TER_FULL, TER_DETECT, IS_WALL,
         M_AP_FURNITURE } from './const.js';
import { NO_COLOR, CLR_GREEN, CLR_WHITE } from './terminal.js';
import { cansee, couldsee } from './vision.js';
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

// src/detect.c:798 monster_detect(), used by potions and fountains;
// returns 1 when nothing was detected.
export async function monster_detect(otmp, mclass = 0) {
    let mcnt = 0;

    for (const mtmp of (game.level?.monsters || [])) {
        if (DEADMONSTER(mtmp) || (mtmp.isgd && !mtmp.mx))
            continue;
        ++mcnt;
        break; /* no need for full count, just 1 or more vs 0 */
    }

    if (!mcnt) {
        if (otmp)
            await strange_feeling(otmp, Hallucination()
                                        ? 'You get the heebie jeebies.'
                                        : 'You feel threatened.');
        return 1;
    } else {
        let unconstrained, woken = false;
        const swallowed = game.u.uswallow; /* before unconstrain_map() */

        await cls();
        unconstrained = unconstrain_map();
        for (const mtmp of (game.level?.monsters || [])) {
            if (DEADMONSTER(mtmp) || (mtmp.isgd && !mtmp.mx))
                continue;
            if (!mclass || mtmp.data.mlet === mclass
                || (mtmp.data.pmidx === PMNAMES.PM_LONG_WORM
                    && mclass === MONSYMS.S_WORM_TAIL))
                map_monst(mtmp, true);

            if (otmp && otmp.cursed && helpless(mtmp)) {
                mtmp.msleeping = mtmp.mfrozen = 0;
                mtmp.mcanmove = 1;
                woken = true;
            }
        }
        if (!swallowed)
            display_self();
        await You('sense the presence of monsters.');
        if (woken)
            await pline('Monsters sense the presence of you.');

        if ((otmp && otmp.blessed) && !unconstrained) {
            /* for a blessed potion, uswallow or uinwater or uburied
               are still in effect and hero won't be able to see the
               'monster of interest' */
            await display_nhwindow_map(true);
        } else {
            /* let hero move cursor to a monster of interest and
               get autodescribe feedback */
            (game.u.uprops ||= {}).DETECT_MONSTERS =
                (game.u.uprops.DETECT_MONSTERS | 0) | I_SPECIAL; /* EDetect_monsters */
            await browse_map(TER_DETECT | TER_MON, 'monster of interest');
            game.u.uprops.DETECT_MONSTERS &= ~I_SPECIAL;
        }
        await map_redisplay();
    }
    return 0;
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

/* src/trap.c:7100 trapname() lives in js/trap.js; re-exported for callers */
export { trapname };

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

            /* src/detect.c:2040: blind searching first refreshes each
               adjacent square by touch. This clears stale invisible-monster
               glyphs before mfind0 decides whether a monster is newly found. */
            if (!aflag && Blind())
                feel_location(x, y);

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
                if (!aflag && !mtmp && !Blind())
                    unmap_invisible(x, y);

                const trap = t_at(x, y);
                if (trap && !trap.tseen && !rnl(8)) {
                    nomul(0);
                    if (trap.ttyp === STATUE_TRAP) {
                        const { activate_statue_trap } = await import('./trap.js');
                        if (await activate_statue_trap(trap, x, y, false))
                            exercise(A_WIS, true);
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
                                    'You already found a monster.',
                                    'already_found_flag'))
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

// src/detect.c:1639 findone(), the wand of secret door detection's (and
// the crystal ball's) per-square reveal.
async function findone(zx, zy, found_p) {
    const lev = game.level.at(zx, zy);
    const ttmp = t_at(zx, zy);
    let mtmp = m_at(zx, zy);

    if (!lev)
        return;
    if (mtmp && (DEADMONSTER(mtmp) || (mtmp.isgd && !mtmp.mx)))
        mtmp = null;
    found_p.ft_cc.x = zx; /* needed by detect_obj_traps() */
    found_p.ft_cc.y = zy;

    if (lev.typ === SDOOR) {
        const sym = lev.horizontal ? cmap_names.S_hcdoor : cmap_names.S_vcdoor;

        await flash_glyph_at(zx, zy, cmap_cell(sym), FOUND_FLASH_COUNT);
        cvt_sdoor_to_door(lev); /* set lev->typ = DOOR */
        recalc_block_point(zx, zy);
        magic_map_background(zx, zy, 0);
        foundone(zx, zy, back_cell(lev, zx, zy));
        found_p.num_sdoors++;
    } else if (lev.typ === SCORR) {
        await flash_glyph_at(zx, zy, cmap_cell(cmap_names.S_corr), FOUND_FLASH_COUNT);
        lev.typ = CORR;
        unblock_point(zx, zy);
        magic_map_background(zx, zy, 0);
        foundone(zx, zy, cmap_cell(cmap_names.S_corr));
        found_p.num_scorrs++;
    }

    if (ttmp && !ttmp.tseen
        /* [shouldn't successful 'find' reveal and activate statue traps?] */
        && ttmp.ttyp !== STATUE_TRAP) {
        await flash_glyph_at(zx, zy, trap_cell(ttmp), FOUND_FLASH_COUNT);
        ttmp.tseen = 1;
        sense_trap(ttmp, zx, zy, 0); /* handles Hallucination */
        foundone(zx, zy, trap_cell(ttmp));
        found_p.num_traps++;
    }
    if (closed_door(zx, zy) && (lev.doormask & D_TRAPPED) !== 0) {
        dummytrap.ttyp = TRAPPED_DOOR;
        dummytrap.tx = zx, dummytrap.ty = zy;
        await flash_glyph_at(zx, zy, trap_cell(dummytrap), FOUND_FLASH_COUNT);
        dummytrap.tseen = 1;
        sense_trap(dummytrap, zx, zy, 0); /* handles Hallucination */
        foundone(zx, zy, trap_cell(dummytrap));
        found_p.num_traps++;
    }
    await detect_obj_traps(game.level.buriedobjs || [], true, 0, found_p);
    await detect_obj_traps(game.level.objects || [], true, 0, found_p);
    if (mtmp)
        await detect_obj_traps(mtmp.minvent || [], true, 0, found_p);
    if (u_at(zx, zy))
        await detect_obj_traps(game.invent || [], true, 0, found_p);

    if (mtmp && (!canspotmon(mtmp) || mtmp.mundetected || M_AP_TYPE(mtmp))) {
        if (M_AP_TYPE(mtmp)) {
            await flash_glyph_at(zx, zy, mon_cell(mtmp), FOUND_FLASH_COUNT);
            seemimic(mtmp);
            found_p.num_mons++;
        } else if (mtmp.mundetected && (is_hider(mtmp.data)
                                         || hides_under(mtmp.data)
                                         || mtmp.data.mlet === MONSYMS.S_EEL)) {
            await flash_glyph_at(zx, zy, mon_cell(mtmp), FOUND_FLASH_COUNT);
            mtmp.mundetected = 0;
            newsym(zx, zy);
            found_p.num_mons++;
        }
        if (!glyph_is_invisible_at(zx, zy)) {
            if (!canspotmon(mtmp)) {
                await flash_glyph_at(zx, zy, invis_cell(), FOUND_FLASH_COUNT);
                map_invisible(zx, zy);
                found_p.num_invis++;
            }
        } else {
            found_p.num_kept_invis++;
        }
    } else if (glyph_is_invisible_at(zx, zy)) {
        unmap_invisible(zx, zy);
        await flash_glyph_at(zx, zy, invis_cell(), FOUND_FLASH_COUNT);
        found_p.num_cleared_invis++;
    }
}

// src/detect.c:1792 findit() — the wand of secret door detection sweep.
export async function findit() {
    let num = 0;

    if (game.u.uswallow)
        return 0;

    const found = { ft_cc: { x: 0, y: 0 }, num_sdoors: 0, num_scorrs: 0,
                    num_traps: 0, num_mons: 0, num_invis: 0,
                    num_kept_invis: 0, num_cleared_invis: 0 };
    /* do_clear_area(u.ux, u.uy, BOLT_LIM=8, findone) — hero-centered
       circle walk (src/vision.c:2107) */
    const range = 8;
    const limits = circle_start[range];
    const uy = game.u.uy, ux = game.u.ux;
    for (let y = Math.max(0, uy - range);
         y <= Math.min(ROWNO - 1, uy + range); y++) {
        const offset = circle_data_findit[limits + Math.abs(y - uy)];
        for (let x = Math.max(1, ux - offset);
             x <= Math.min(COLNO - 1, ux + offset); x++) {
            if (couldsee(x, y))
                await findone(x, y, found);
        }
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
    if (found.num_invis) {
        if (found.num_invis > 1)
            buf = `${found.num_invis}${found.num_kept_invis ? ' other' : ''} unseen monsters`;
        else
            buf = `${found.num_kept_invis ? 'another' : 'an'} unseen monster`;
        await You(`detect ${buf}!`);
        num += found.num_invis;
    }
    if (found.num_cleared_invis) {
        if (!num)
            await You_feel(`${found.num_kept_invis ? 'somewhat ' : ''}less paranoid.`);
        num += found.num_cleared_invis;
    }
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
            map_trap(t, 1);
        } else if ((game.level?.lev_engr || [])
                       .some(e => e.x === x && e.y === y)) {
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

// src/detect.c:1422 do_mapping(), reveal the level's terrain.
export async function do_mapping() {
    let zx, zy;
    let unconstrained;

    unconstrained = unconstrain_map();
    for (zx = 1; zx < COLNO; zx++)
        for (zy = 0; zy < ROWNO; zy++)
            show_map_spot(zx, zy, Confusion());

    if (!game.level?.flags?.hero_memory || unconstrained) {
        await flush_screen(1);                 /* flush temp screen */
        /* browse_map() instead of display_nhwindow(WIN_MAP, TRUE) */
        await browse_map(TER_DETECT | TER_MAP | TER_TRP | TER_OBJ,
                         'anything of interest');
        await map_redisplay(); /* calls reconstrain_map() and docrt() */
    } else {
        /* [technically we should do this anyway; usually it's a no-op] */
        reconstrain_map();
    }
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

/* include/obj.h:340 SchroedingersBox() */
const SchroedingersBox = (o) => (o.otyp === ONAMES.LARGE_BOX && o.spe === 1);

/* src/detect.c:65 ALL_CLASSES (MAXOCLASSES + 1) */
const ALL_CLASSES = OCLASSES.MAXOCLASSES + 1;

/* src/detect.c:19 FOUND_FLASH_COUNT */
const FOUND_FLASH_COUNT = 6;
/* src/detect.c:24 dummytrap, a fake trap for the trapped-door and
   trapped-chest map glyphs */
const dummytrap = { ttyp: 0, tx: 0, ty: 0, tseen: 0 };
/* src/decl.c:96 quitchars[], :45 "something" */
const quitchars = ' \r\n\x1b';
const something = 'something';
/* src/drawing.c def_oc_syms[].name, indexed by object class */
const def_oc_names = [
    'illegal objects', 'weapon', 'armor', 'ring', 'amulet', 'tool', 'food',
    'potion', 'scroll', 'spellbook', 'wand', 'coin', 'gem or rock',
    'boulder or statue', 'iron ball', 'iron chain', 'splash of venom',
];
/* include/youprop.h Confusion */
const Confusion = () => !!(game.u.intrinsic?.HConfusion
                           || game.u.uprops?.CONFUSION);
/* include/hack.h:1236 Maybe_Half_Phys() */
const Maybe_Half_Phys = (dmg) =>
    (!!(game.u.intrinsic?.HHalf_physical_damage || game.u.uprops?.HALF_PHDAM)
     ? Math.trunc((dmg + 1) / 2) : dmg);

/* cells for flash_glyph_at()/foundone(): the JS map keeps
   {ch,color,decgfx,glyph} cells where C keeps glyph numbers */
function cmap_cell(cmap) {
    const s = showsym(cmap);
    return { ch: s ? s.ch : '?', color: defsyms[cmap]?.color ?? NO_COLOR,
             decgfx: s ? !!s.dec : false, glyph: { kind: 'cmap', cmap } };
}
function trap_cell(trap) {
    const tg = trap_glyph(trap);
    return { ch: tg.ch, color: tg.color, decgfx: !!tg.dec,
             glyph: { kind: 'cmap', cmap: tg.cmap } };
}
function back_cell(lev, x, y) {
    const b = back_to_glyph(lev, x, y);
    return { ch: b.ch, color: b.color, decgfx: !!b.dec,
             glyph: b.glyph ?? { kind: 'cmap', cmap: b.cmap } };
}
function mon_cell(mtmp) { /* mon_to_glyph(mtmp, rn2_on_display_rng) */
    const shown = game.mons[Hallucination() ? rn2_on_display_rng(NUMMONS)
                            : (M_AP_TYPE(mtmp) === M_AP_MONSTER
                               ? mtmp.mappearance : mtmp.mnum)];
    return { ch: def_monsyms[shown.mlet] || '?', color: shown.mcolor ?? NO_COLOR,
             decgfx: false, glyph: { kind: 'mon', mon: mtmp } };
}
function invis_cell() { /* GLYPH_INVISIBLE */
    return { ch: 'I', color: NO_COLOR, decgfx: false, glyph: { kind: 'invis' } };
}
/* win/tty/wintty.c tty_display_nhwindow(), the NHW_MAP arm: a blocking map
   display flushes it and puts a --More-- on any pending message */
async function display_nhwindow_map(blocking) {
    await flush_screen(1);
    if (blocking) {
        if (game._toplin !== TOPLINE_EMPTY)
            game._toplin = TOPLINE_NEED_MORE;
        if (game._toplin === TOPLINE_NEED_MORE)
            await more();
    }
}

// src/detect.c:122 map_monst(), show a detected monster (and its tail).
function map_monst(mtmp, showtail) {
    /* monsym(mtmp->data) == ' ' (ghosts, shades) uses the detected glyph;
       pets use pet_to_glyph(); the rest mon_to_glyph(), all with newsym_rn2 */
    const shown = game.mons[Hallucination() ? rn2_on_display_rng(NUMMONS)
                                            : mtmp.mnum];
    const detected = (def_monsyms[mtmp.data.mlet] === ' ');
    const attr = (detected && game.flags?.use_inverse !== false)
                 ? TERM_INVERSE : 0;

    show_glyph_cell(mtmp.mx, mtmp.my, def_monsyms[shown.mlet] || '?',
                    shown.mcolor ?? NO_COLOR, false, attr,
                    { kind: 'mon', mon: mtmp });
    if (showtail && mtmp.data.pmidx === PMNAMES.PM_LONG_WORM)
        detect_wsegs(mtmp, 0);
}

// src/detect.c:139 trapped_chest_at(), a trap glyph at <x,y> might be a
// trapped chest (this tests plausibility, not whether one is really here).
export function trapped_chest_at(ttyp, x, y) {
    let mtmp;

    if (glyph_at(x, y)?.kind !== 'cmap' || !glyph_is_trap_cmap(glyph_at(x, y).cmap))
        return false;
    if (ttyp !== TRAPPED_CHEST || (Hallucination() && rn2(20)))
        return false;
    /* presence of any trappable container will do */
    if (sobj_at(ONAMES.CHEST, x, y) || sobj_at(ONAMES.LARGE_BOX, x, y))
        return true;
    /* a box might be contained in hero's inventory or steed's */
    if (u_at(x, y)) {
        for (const otmp of (game.invent || []))
            if (Is_box(otmp) && otmp.otrapped)
                return true;
        if (game.u.usteed) { /* steed isn't on map so won't be found by m_at() */
            for (const otmp of (game.u.usteed.minvent || []))
                if (Is_box(otmp) && otmp.otrapped)
                    return true;
        }
    }
    /* a box might be contained in a monster's inventory */
    if ((mtmp = m_at(x, y)) != null)
        for (const otmp of (mtmp.minvent || []))
            if (Is_box(otmp) && otmp.otrapped)
                return true;
    return false;
}

// src/detect.c:182 trapped_door_at(), a trap glyph at <x,y> might be a
// trapped door.
export function trapped_door_at(ttyp, x, y) {
    let lev;

    if (glyph_at(x, y)?.kind !== 'cmap' || !glyph_is_trap_cmap(glyph_at(x, y).cmap))
        return false;
    if (ttyp !== TRAPPED_DOOR || (Hallucination() && rn2(20)))
        return false;
    lev = game.level.at(x, y);
    if (!IS_DOOR(lev.typ))
        return false;
    if ((lev.doormask & (D_NODOOR | D_BROKEN | D_ISOPEN)) !== 0
         && trapped_chest_at(ttyp, x, y))
        return false;
    return true;
}

/* include/display.h glyph_is_trap() on a cmap index */
const glyph_is_trap_cmap = (cmap) =>
    cmap >= cmap_names.S_arrow_trap && cmap <= cmap_names.S_trapped_chest;

// src/detect.c:201 o_in(), obj (or something it contains) of class oclass.
export function o_in(obj, oclass) {
    let temp;

    if (obj.oclass === oclass)
        return obj;

    /*
     * Note:  we exclude SchroedingersBox because the corpse it contains
     * isn't necessarily a corpse yet.  Ideally we'd include it if the
     * corpse is already there, but we can't tell that here.
     */
    if (Has_contents(obj) && !SchroedingersBox(obj)) {
        for (const otmp of (obj.cobj || []))
            if (otmp.oclass === oclass)
                return otmp;
            else if (Has_contents(otmp) && (temp = o_in(otmp, oclass)) != null)
                return temp;
    }
    return null;
}

// src/detect.c:229 o_material(), obj (or something it contains) made of
// material.
export function o_material(obj, material) {
    let temp;

    if (game.objects[obj.otyp].oc_material === material)
        return obj;

    if (Has_contents(obj)) {
        for (const otmp of (obj.cobj || []))
            if (game.objects[otmp.otyp].oc_material === material)
                return otmp;
            else if (Has_contents(otmp)
                     && (temp = o_material(otmp, material)) != null)
                return temp;
    }
    return null;
}

// src/detect.c:249 observe_recursively()
function observe_recursively(obj) {
    observe_object(obj);
    if (Has_contents(obj)) {
        for (const otmp of (obj.cobj || []))
            observe_recursively(otmp);
    }
}

// src/detect.c:262 check_map_spot(), is the remembered object at <x,y>
// stale for this detection?
function check_map_spot(x, y, oclass, material) {
    let glyph;
    let mtmp;
    const pile_at = (px, py) => (game.level.objects || [])
        .filter(o => o.ox === px && o.oy === py);

    glyph = glyph_at(x, y);
    if (glyph?.kind === 'obj') {
        /* there's some object shown here */
        if (oclass === ALL_CLASSES) {
            return !(pile_at(x, y).length /* stale if nothing here */
                     || ((mtmp = m_at(x, y)) != null && (mtmp.minvent || []).length));
        } else {
            if (material
                && game.objects[glyph.otyp].oc_material === material) {
                /* the object shown here is of interest because material
                   matches */
                for (const otmp of pile_at(x, y))
                    if (o_material(otmp, MATERIALS.GOLD))
                        return false;
                /* didn't find it; perhaps a monster is carrying it */
                if ((mtmp = m_at(x, y)) != null) {
                    for (const otmp of (mtmp.minvent || []))
                        if (o_material(otmp, MATERIALS.GOLD))
                            return false;
                }
                /* detection indicates removal of this object from the map */
                return true;
            }
            if (oclass && game.objects[glyph.otyp].oc_class === oclass) {
                /* the object shown here is of interest because its class
                   matches */
                for (const otmp of pile_at(x, y))
                    if (o_in(otmp, oclass))
                        return false;
                /* didn't find it; perhaps a monster is carrying it */
                if ((mtmp = m_at(x, y)) != null) {
                    for (const otmp of (mtmp.minvent || []))
                        if (o_in(otmp, oclass))
                            return false;
                }
                /* detection indicates removal of this object from the map */
                return true;
            }
        }
    }
    return false;
}

// src/detect.c:318 clear_stale_map(), forget remembered objects of this
// class/material that are no longer there; true if the map changed.
function clear_stale_map(oclass, material) {
    let zx, zy;
    let change_made = false;

    for (zx = 1; zx < COLNO; zx++)
        for (zy = 0; zy < ROWNO; zy++)
            if (check_map_spot(zx, zy, oclass, material)) {
                unmap_object(zx, zy);
                change_made = true;
            }

    return change_made;
}

/* the live monster list, C's fmon scan with its usual skips */
function live_monsters() {
    return (game.level?.monsters || [])
        .filter(mtmp => !(DEADMONSTER(mtmp) || (mtmp.isgd && !mtmp.mx)));
}

// src/detect.c:335 gold_detect(), the scroll of gold detection (blessed:
// anything made of gold); returns 1 when nothing was found.
export async function gold_detect(sobj) {
    let temp = null;
    let stale, ugold = false, steedgold = false;
    let ter_typ = TER_DETECT | TER_OBJ;
    let found_map = false;

    game.known = stale = clear_stale_map(OCLASSES.COIN_CLASS,
                                         (sobj.blessed ? MATERIALS.GOLD : 0));

    /* look for gold carried by monsters (might be in a container) */
    outer:
    for (const mtmp of live_monsters()) {
        if (findgold(mtmp.minvent) || mtmp.data.pmidx === PMNAMES.PM_GOLD_GOLEM) {
            if (mtmp === game.u.usteed) {
                steedgold = true;
            } else {
                game.known = true;
                found_map = true;
                break outer; /* skip further searching */
            }
        } else {
            for (const obj of (mtmp.minvent || []))
                if ((sobj.blessed && o_material(obj, MATERIALS.GOLD))
                    || o_in(obj, OCLASSES.COIN_CLASS)) {
                    if (mtmp === game.u.usteed) {
                        steedgold = true;
                    } else {
                        game.known = true;
                        found_map = true;
                        break outer; /* skip further searching */
                    }
                }
        }
    }

    /* look for gold objects */
    if (!found_map)
        for (const obj of (game.level.objects || [])) {
            if (sobj.blessed && o_material(obj, MATERIALS.GOLD)) {
                game.known = true;
                if (obj.ox !== game.u.ux || obj.oy !== game.u.uy) {
                    found_map = true;
                    break;
                }
            } else if (o_in(obj, OCLASSES.COIN_CLASS)) {
                game.known = true;
                if (obj.ox !== game.u.ux || obj.oy !== game.u.uy) {
                    found_map = true;
                    break;
                }
            }
        }

    if (!found_map) {
        if (!game.known) {
            /* no gold found on floor or monster's inventory.
               adjust message if you have gold in your inventory */
            let buf;

            if (game.youmonst.data.pmidx === PMNAMES.PM_GOLD_GOLEM)
                buf = `You feel like a million ${currency(2)}!`;
            else if (money_cnt(game.invent) || hidden_gold(game.invent, true))
                buf = 'You feel worried about your future financial situation.';
            else if (steedgold)
                buf = `You feel interested in ${
                      s_suffix(x_monnam(game.u.usteed,
                                        game.u.usteed.mtame ? ARTICLE_YOUR
                                                            : ARTICLE_THE,
                                        null, SUPPRESS_SADDLE, false))
                      } financial situation.`;
            else
                buf = 'You feel materially poor.';
            await strange_feeling(sobj, buf);
            return 1;
        }
        /* only under me - no separate display required */
        if (stale)
            await docrt();
        await You(`notice some gold between your ${makeplural(body_part(FOOT))}.`);
        return 0;
    }

 /* outgoldmap: */
    await cls();

    unconstrain_map();
    /* Discover gold locations. */
    for (const obj of (game.level.objects || [])) {
        if (sobj.blessed && (temp = o_material(obj, MATERIALS.GOLD)) != null) {
            if (temp !== obj) {
                temp.ox = obj.ox;
                temp.oy = obj.oy;
            }
            map_object(temp, 1);
        } else if ((temp = o_in(obj, OCLASSES.COIN_CLASS)) != null) {
            if (temp !== obj) {
                temp.ox = obj.ox;
                temp.oy = obj.oy;
            }
            map_object(temp, 1);
        }
        if (temp && u_at(temp.ox, temp.oy))
            ugold = true;
    }
    for (const mtmp of live_monsters()) {
        temp = null;
        if (findgold(mtmp.minvent) || mtmp.data.pmidx === PMNAMES.PM_GOLD_GOLEM) {
            const gold = { otyp: ONAMES.GOLD_PIECE, oclass: OCLASSES.COIN_CLASS,
                           quan: rnd(10), /* usually more than 1 */
                           ox: mtmp.mx, oy: mtmp.my };
            map_object(gold, 1);
            temp = gold;
        } else {
            for (const obj of (mtmp.minvent || []))
                if (sobj.blessed && (temp = o_material(obj, MATERIALS.GOLD)) != null) {
                    temp.ox = mtmp.mx;
                    temp.oy = mtmp.my;
                    map_object(temp, 1);
                    break;
                } else if ((temp = o_in(obj, OCLASSES.COIN_CLASS)) != null) {
                    temp.ox = mtmp.mx;
                    temp.oy = mtmp.my;
                    map_object(temp, 1);
                    break;
                }
        }
        if (temp && u_at(temp.ox, temp.oy))
            ugold = true;
    }
    if (!ugold) {
        newsym(game.u.ux, game.u.uy);
        ter_typ |= TER_MON; /* so autodescribe will recognize hero */
    }
    await You_feel('very greedy, and sense gold!');
    exercise(A_WIS, true);

    await browse_map(ter_typ, 'gold');

    await map_redisplay();
    return 0;
}

// src/detect.c:479 food_detect(), the scroll of food detection (potions
// when confused or cursed); returns 1 when nothing was found.
export async function food_detect(sobj) {
    let ct = 0, ctu = 0;
    const confused = (Confusion() || (sobj && sobj.cursed));
    let stale;
    const oclass = confused ? OCLASSES.POTION_CLASS : OCLASSES.FOOD_CLASS;
    const what = confused ? something : 'food';

    stale = clear_stale_map(oclass, 0);
    if (game.u.usteed) /* some situations leave steed with stale coordinates */
        game.u.usteed.mx = game.u.ux, game.u.usteed.my = game.u.uy;

    for (const obj of (game.level.objects || []))
        if (o_in(obj, oclass)) {
            if (u_at(obj.ox, obj.oy))
                ctu++;
            else
                ct++;
        }
    for (const mtmp of live_monsters()) {
        if (ct && ctu)
            break;
        /* no DEADMONSTER(mtmp) check needed since dmonsfree() spells
           the demise of any dead ones (also skipped: vault guard at <0,0>) */
        for (const obj of (mtmp.minvent || []))
            if (o_in(obj, oclass)) {
                if (u_at(mtmp.mx, mtmp.my))
                    ctu++; /* steed or an engulfer with inventory */
                else
                    ct++;
                break;
            }
    }

    if (!ct && !ctu) {
        game.known = stale && !confused;
        if (stale) {
            await docrt();
            await You(`sense a lack of ${what} nearby.`);
            if (sobj && sobj.blessed) {
                if (!game.u.uedibility)
                    await Your(`${body_part(NOSE)} starts to tingle.`);
                game.u.uedibility = 1;
            }
        } else if (sobj) {
            const buf = `Your ${body_part(NOSE)} twitches${
                        (sobj.blessed && !game.u.uedibility)
                            ? ' then starts to tingle' : ''}.`;
            if (sobj.blessed && !game.u.uedibility) {
                const savebeginner = game.flags?.beginner;

                (game.flags ||= {}).beginner = false; /* prevent non-delivery of message */
                await strange_feeling(sobj, buf);
                game.flags.beginner = savebeginner;
                game.u.uedibility = 1;
            } else
                await strange_feeling(sobj, buf);
        }
        return !stale ? 1 : 0;
    } else if (!ct) {
        game.known = true;
        await You(`${sobj ? 'smell' : 'sense'} ${what} nearby.`);
        if (sobj && sobj.blessed) {
            if (!game.u.uedibility)
                await Your(`${body_part(NOSE)} starts to tingle.`);
            game.u.uedibility = 1;
        }
    } else {
        let temp;
        let ter_typ = TER_DETECT | TER_OBJ;

        game.known = true;
        await cls();
        unconstrain_map();
        for (const obj of (game.level.objects || []))
            if ((temp = o_in(obj, oclass)) != null) {
                if (temp !== obj) {
                    temp.ox = obj.ox;
                    temp.oy = obj.oy;
                }
                map_object(temp, 1);
            }
        for (const mtmp of live_monsters()) {
            /* no DEADMONSTER() check needed -- see above */
            for (const obj of (mtmp.minvent || []))
                if ((temp = o_in(obj, oclass)) != null) {
                    temp.ox = mtmp.mx;
                    temp.oy = mtmp.my;
                    map_object(temp, 1);
                    break; /* skip rest of this monster's inventory */
                }
        }
        if (!ctu) {
            newsym(game.u.ux, game.u.uy);
            ter_typ |= TER_MON; /* for autodescribe of self */
        }
        if (sobj) {
            if (sobj.blessed) {
                await Your(`${body_part(NOSE)} ${
                           game.u.uedibility ? 'continues' : 'starts'} to tingle and you smell ${what}.`);
                game.u.uedibility = 1;
            } else
                await Your(`${body_part(NOSE)} tingles and you smell ${what}.`);
        } else
            await You(`sense ${what}.`);
        exercise(A_WIS, true);
        await browse_map(ter_typ, 'food');
        await map_redisplay();
    }
    return 0;
}

// src/detect.c:603 object_detect(), detect objects of one class (0 for
// all); detector is the potion/spellbook/crystal ball (or null); returns 1
// when nothing was found.
export async function object_detect(detector, cls_) {
    let x, y;
    let stuff;
    const is_cursed = (detector && detector.cursed);
    const do_dknown = (detector && (detector.oclass === OCLASSES.POTION_CLASS
                                    || detector.oclass === OCLASSES.SPBOOK_CLASS)
                       && detector.blessed);
    let ct = 0, ctu = 0;
    let otmp = null;
    let sym, boulder = 0, ter_typ = TER_DETECT | TER_OBJ;
    /* gs.showsyms[SYM_BOULDER + SYM_OFF_X]: the boulder option is not
       modelled (js/options.js), so the default (unset) symbol stands */
    const boulder_sym = 0;

    if (cls_ < 0 || cls_ >= def_oc_syms.length) {
        /* impossible("object_detect:  illegal class %d", class); */
        cls_ = 0;
    }

    /* Special boulder symbol check - does the class symbol happen
     * to match showsyms[SYM_BOULDER + SYM_OFF_X] which is a user-defined
     * symbol.  If so, that means we aren't sure what they really wanted to
     * detect.  Rather than trump anything, show both possibilities.
     * We can exclude checking the buried obj chain for boulders below.
     */
    sym = cls_ ? def_oc_syms[cls_] : 0;
    if (sym && sym === boulder_sym)
        boulder = OCLASSES.ROCK_CLASS;

    if (Hallucination() || (Confusion() && cls_ === OCLASSES.SCROLL_CLASS))
        stuff = something;
    else
        stuff = cls_ ? def_oc_names[cls_] : 'objects';
    if (boulder && cls_ !== OCLASSES.ROCK_CLASS)
        stuff += ' and/or large stones';

    if (do_dknown)
        for (const obj of (game.invent || []))
            observe_recursively(obj);

    for (const obj of (game.level.objects || [])) {
        if ((!cls_ && !boulder) || o_in(obj, cls_) || o_in(obj, boulder)) {
            if (u_at(obj.ox, obj.oy))
                ctu++;
            else
                ct++;
        }
        if (do_dknown)
            observe_recursively(obj);
    }

    for (const obj of (game.level.buriedobjs || [])) {
        if (!cls_ || o_in(obj, cls_)) {
            if (u_at(obj.ox, obj.oy))
                ctu++;
            else
                ct++;
        }
        if (do_dknown)
            observe_recursively(obj);
    }

    if (game.u.usteed)
        game.u.usteed.mx = game.u.ux, game.u.usteed.my = game.u.uy;

    for (const mtmp of live_monsters()) {
        for (const obj of (mtmp.minvent || [])) {
            if ((!cls_ && !boulder) || o_in(obj, cls_)
                || o_in(obj, boulder))
                ct++;
            if (do_dknown)
                observe_recursively(obj);
        }
        if ((is_cursed && M_AP_TYPE(mtmp) === M_AP_OBJECT
             && (!cls_ || cls_ === game.objects[mtmp.mappearance].oc_class))
            || (findgold(mtmp.minvent) && (!cls_ || cls_ === OCLASSES.COIN_CLASS))) {
            ct++;
            break;
        }
    }

    if (!clear_stale_map(!cls_ ? ALL_CLASSES : cls_, 0) && !ct) {
        if (!ctu) {
            if (detector)
                await strange_feeling(detector, 'You feel a lack of something.');
            return 1;
        }

        await You(`sense ${stuff} nearby.`);
        return 0;
    }

    await cls();

    unconstrain_map();
    /*
     *  Map all buried objects first.
     */
    for (const obj of (game.level.buriedobjs || []))
        if (!cls_ || (otmp = o_in(obj, cls_)) != null) {
            if (cls_) {
                if (otmp !== obj) {
                    otmp.ox = obj.ox;
                    otmp.oy = obj.oy;
                }
                map_object(otmp, 1);
            } else
                map_object(obj, 1);
        }
    /*
     * If we are mapping all objects, map only the top object of a pile or
     * the first object in a monster's inventory.  Otherwise, go looking
     * for a matching object class and display the first one encountered
     * at each location.
     *
     * Objects on the floor override buried objects.
     */
    for (x = 1; x < COLNO; x++)
        for (y = 0; y < ROWNO; y++)
            for (const obj of (game.level.objects || []).filter(o => o.ox === x && o.oy === y))
                if ((!cls_ && !boulder) || (otmp = o_in(obj, cls_)) != null
                    || (otmp = o_in(obj, boulder)) != null) {
                    if (cls_ || boulder) {
                        if (otmp !== obj) {
                            otmp.ox = obj.ox;
                            otmp.oy = obj.oy;
                        }
                        map_object(otmp, 1);
                    } else
                        map_object(obj, 1);
                    break;
                }

    /* Objects in the monster's inventory override floor objects. */
    for (const mtmp of live_monsters()) {
        for (const obj of (mtmp.minvent || []))
            if ((!cls_ && !boulder) || (otmp = o_in(obj, cls_)) != null
                || (otmp = o_in(obj, boulder)) != null) {
                if (!cls_ && !boulder)
                    otmp = obj;
                otmp.ox = mtmp.mx; /* at monster location */
                otmp.oy = mtmp.my;
                map_object(otmp, 1);
                break;
            }
        /* Allow a mimic to override the detected objects it is carrying. */
        if (is_cursed && M_AP_TYPE(mtmp) === M_AP_OBJECT
            && (!cls_ || cls_ === game.objects[mtmp.mappearance].oc_class)) {
            const temp = { otyp: mtmp.mappearance, /* needed for obj_to_glyph() */
                           oclass: OCLASSES.RANDOM_CLASS, quan: 1,
                           ox: mtmp.mx, oy: mtmp.my,
                           corpsenm: mtmp.mcorpsenm ?? PMNAMES.PM_TENGU };
            map_object(temp, 1);
        } else if (findgold(mtmp.minvent)
                   && (!cls_ || cls_ === OCLASSES.COIN_CLASS)) {
            const gold = { otyp: ONAMES.GOLD_PIECE, oclass: OCLASSES.COIN_CLASS,
                           quan: rnd(10), /* usually more than 1 */
                           ox: mtmp.mx, oy: mtmp.my };
            map_object(gold, 1);
        }
    }
    if (glyph_at(game.u.ux, game.u.uy)?.kind !== 'obj') {
        newsym(game.u.ux, game.u.uy);
        ter_typ |= TER_MON;
    }
    await You(`detect the ${ct ? 'presence' : 'absence'} of ${stuff}.`);
    if (!ct)
        await display_nhwindow_map(true);
    else
        await browse_map(ter_typ, 'object');

    await map_redisplay();
    return 0;
}

// src/detect.c:865 sense_trap(), map a trap (or, when hallucinating or
// from a cursed source, a fake object) at the trap's spot.
function sense_trap(trap, x, y, src_cursed) {
    if (Hallucination() || src_cursed) {
        const obj = { otyp: 0, oclass: OCLASSES.RANDOM_CLASS, ox: 0, oy: 0,
                      quan: 1, corpsenm: 0 }; /* fake object */

        if (trap) {
            obj.ox = trap.tx;
            obj.oy = trap.ty;
        } else {
            obj.ox = x;
            obj.oy = y;
        }
        /* random_object(rn2): NUM_OBJECTS - FIRST_OBJECT + FIRST_OBJECT */
        obj.otyp = !Hallucination() ? ONAMES.GOLD_PIECE
                   : rn2(ONAMES.NUM_OBJECTS - (ONAMES.LAST_GENERIC + 1))
                     + (ONAMES.LAST_GENERIC + 1);
        obj.quan = ((obj.otyp === ONAMES.GOLD_PIECE) ? rnd(10)
                    : game.objects[obj.otyp].oc_merge ? rnd(2) : 1);
        obj.corpsenm = rn2(NUMMONS); /* random_monster(rn2): if otyp == CORPSE */
        map_object(obj, 1);
    } else if (trap) {
        map_trap(trap, 1);
        trap.tseen = 1;
    } else {
        /* trapped door or trapped container */
        dummytrap.tx = x;
        dummytrap.ty = y;
        dummytrap.ttyp = BEAR_TRAP; /* some kind of trap */
        map_trap(dummytrap, 1);
    }
}

const OTRAP_NONE = 0,  /* nothing found */
      OTRAP_HERE = 1,  /* found at hero's location */
      OTRAP_THERE = 2; /* found at any other location */

// src/detect.c:907 detect_obj_traps(), look for trapped boxes in objlist
// (recursing into containers); 1 if found at hero's spot, 2 elsewhere,
// 3 both, 0 otherwise; optionally map them.
async function detect_obj_traps(objlist, show_them, how, ft) {
    const cc = { x: 0, y: 0 };
    let result = OTRAP_NONE;

    dummytrap.ttyp = TRAPPED_CHEST;
    const trapcell = ft ? trap_cell(dummytrap) : null;
    /*
     * TODO?  Display locations of unseen-but-detected trapped chests (and
     * doors) via tmp_at() while returning to caller, then have caller erase
     * them via tmp_at(DISP_END) after--or before--the next input?
     */
    for (const otmp of objlist) {
        cc.x = cc.y = 0; /* lint suppression */
        if ((Is_box(otmp) && otmp.otrapped) || Has_contents(otmp)) {
            if (!get_obj_location(otmp, cc, BURIED_TOO | CONTAINED_TOO)
                || !isok(cc.x, cc.y)
                || (ft && (cc.x !== ft.ft_cc.x || cc.y !== ft.ft_cc.y)))
                continue;
        }
        if (Is_box(otmp) && otmp.otrapped) {
            otmp.tknown = 1;
            observe_object(otmp);
            result |= u_at(cc.x, cc.y) ? OTRAP_HERE : OTRAP_THERE;
            if (ft) {
                await flash_glyph_at(cc.x, cc.y, trapcell, FOUND_FLASH_COUNT);
            }
            if (show_them) {
                dummytrap.tx = cc.x, dummytrap.ty = cc.y;
                sense_trap(dummytrap, cc.x, cc.y, how);
            }
            if (ft) {
                foundone(cc.x, cc.y, trapcell);
                ft.num_traps++;
            }
        }
        if (Has_contents(otmp))
            result |= await detect_obj_traps(otmp.cobj || [], show_them, how, ft);
    }
    return result;
}

// src/detect.c:956 display_trap_map(), show every trap on the level.
async function display_trap_map(cursed_src) {
    let glyph, ter_typ = TER_DETECT | (cursed_src ? TER_OBJ : TER_TRP);

    await cls();

    unconstrain_map();
    /* show chest traps first, so that subsequent floor trap display
       will override if both types are present at the same location */
    await detect_obj_traps(game.level.buriedobjs || [], true, cursed_src, null);
    await detect_obj_traps(game.level.objects || [], true, cursed_src, null);
    for (const mon of live_monsters()) {
        await detect_obj_traps(mon.minvent || [], true, cursed_src, null);
    }
    await detect_obj_traps(game.invent || [], true, cursed_src, null);

    for (const ttmp of (game.level.traps || []))
        sense_trap(ttmp, 0, 0, cursed_src);

    dummytrap.ttyp = TRAPPED_DOOR;
    for (let door = 0; door < (game.level.doorindex | 0); door++) {
        const cc = game.level.doors[door];

        if (!cc)
            continue;
        if (game.level.at(cc.x, cc.y).typ === SDOOR) /* can't be trapped; see above */
            continue;
        if (game.level.at(cc.x, cc.y).doormask & D_TRAPPED) {
            dummytrap.tx = cc.x, dummytrap.ty = cc.y;
            sense_trap(dummytrap, cc.x, cc.y, cursed_src);
        }
    }

    /* redisplay hero unless sense_trap() revealed something at <ux,uy> */
    glyph = glyph_at(game.u.ux, game.u.uy);
    if (!((glyph?.kind === 'cmap' && glyph_is_trap_cmap(glyph.cmap))
          || glyph?.kind === 'obj')) {
        newsym(game.u.ux, game.u.uy);
        ter_typ |= TER_MON; /* for autodescribe at <u.ux,u.uy> */
    }
    await You_feel(`${cursed_src ? 'very greedy' : 'entrapped'}.`);
    await browse_map(ter_typ, cursed_src ? 'gold' : 'trap of interest');

    await map_redisplay();
}

// src/detect.c:1011 trap_detect(), the crystal ball's '^' and the
// confused/cursed scroll of gold detection; returns 1 when nothing was
// found (the scroll is used up by strange_feeling()).
export async function trap_detect(sobj) {
    let tr;
    const cursed_src = sobj && sobj.cursed;
    let found = false;

    if (game.u.usteed)
        game.u.usteed.mx = game.u.ux, game.u.usteed.my = game.u.uy;

    /* floor/ceiling traps */
    for (const ttmp of (game.level.traps || [])) {
        if (ttmp.tx !== game.u.ux || ttmp.ty !== game.u.uy) {
            await display_trap_map(cursed_src);
            return 0;
        }
        found = true;
    }
    /* chest traps (might be buried or carried) */
    if ((tr = await detect_obj_traps(game.level.objects || [], false, 0, null)) !== OTRAP_NONE) {
        if (tr & OTRAP_THERE) {
            await display_trap_map(cursed_src);
            return 0;
        }
        found = true;
    }
    if ((tr = await detect_obj_traps(game.level.buriedobjs || [], false, 0, null))
        !== OTRAP_NONE) {
        if (tr & OTRAP_THERE) {
            await display_trap_map(cursed_src);
            return 0;
        }
        found = true;
    }
    for (const mon of live_monsters()) {
        if ((tr = await detect_obj_traps(mon.minvent || [], false, 0, null))
            !== OTRAP_NONE) {
            if (tr & OTRAP_THERE) {
                await display_trap_map(cursed_src);
                return 0;
            }
            found = true;
        }
    }
    if ((await detect_obj_traps(game.invent || [], false, 0, null)) !== OTRAP_NONE)
        found = true;
    /* door traps */
    for (let door = 0; door < (game.level.doorindex | 0); door++) {
        const cc = game.level.doors[door];

        if (!cc)
            continue;
        /* levl[][].doormask and .wall_info both overlay levl[][].flags;
           the bit in doormask for D_TRAPPED is also a bit in wall_info;
           secret doors use wall_info so can't be marked as trapped */
        if (game.level.at(cc.x, cc.y).typ === SDOOR)
            continue;
        if (game.level.at(cc.x, cc.y).doormask & D_TRAPPED) {
            if (cc.x !== game.u.ux || cc.y !== game.u.uy) {
                await display_trap_map(cursed_src);
                return 0;
            }
            found = true;
        }
    }
    if (!found) {
        const buf = `Your ${makeplural(body_part(TOE))} stop itching.`;

        await strange_feeling(sobj, buf);
        return 1;
    }
    /* traps exist, but only under me - no separate display required */
    await Your(`${makeplural(body_part(TOE))} itch.`);
    return 0;
}

// src/detect.c:1091 furniture_detect(), the crystal ball's furniture
// symbols.
async function furniture_detect() {
    let mon;
    let x, y;
    let glyph, sym, found = 0, revealed = 0;

    unconstrain_map();

    for (y = 0; y < ROWNO; ++y)
        for (x = 1; x < COLNO; ++x) {
            glyph = glyph_at(x, y);
            sym = (glyph?.kind === 'cmap') ? glyph.cmap : -1;
            if (IS_FURNITURE(game.level.at(x, y).typ)) {
                ++found;
                magic_map_background(x, y, 1);
            } else if (sym >= 0 && is_cmap_furniture(sym)) {
                ++found;
                if ((mon = m_at(x, y)) != null
                    && M_AP_TYPE(mon) === M_AP_FURNITURE)
                    seemimic(mon);
                if (!mon || !canspotmon(mon))
                    map_invisible(x, y);
            }
            if (glyph_at(x, y) !== glyph)
                ++revealed;
        }

    if (!found)
        await There('seems to be nothing of interest on this level.');
    else if (!revealed)
        /* [if this happens, should we force revealed to be non-zero
            and set 'found' back to 0 in order to repeat the 'browse'
            operation which then results in wiping the map memory of
            those other locations that are not in the currently
            shown area?] */
        await Your('map already shows all relevant locations.');

    if (!revealed)
        await display_nhwindow_map(true);
    else /* we need to browse all types because we haven't redrawn the map
          * and the user might browse to a boulder or monster location */
        await browse_map(TER_DETECT | TER_MAP | TER_TRP | TER_OBJ | TER_MON,
                         'location');

    await map_redisplay();
    return 0;
}

// src/detect.c:1142 level_distance(), how far away another level is.
export function level_distance(where) {
    const ll = depth(game.u.uz) - depth(where);
    const indun = (game.u.uz.dnum === where.dnum);
    let res = ''; /* always replaced by some other non-Null value */

    if (ll < 0) {
        if (ll < (-8 - rn2(3)))
            if (!indun)
                res = 'far away';
            else
                res = 'far below';
        else if (ll < -1)
            if (!indun)
                res = 'away below you';
            else
                res = 'below you';
        else if (!indun)
            res = 'in the distance';
        else
            res = 'just below';
    } else if (ll > 0) {
        if (ll > (8 + rn2(3)))
            if (!indun)
                res = 'far away';
            else
                res = 'far above';
        else if (ll > 1)
            if (!indun)
                res = 'away above you';
            else
                res = 'above you';
        else if (!indun)
            res = 'in the distance';
        else
            res = 'just above';
    } else { /* l1 == 0 */
        if (!indun)
            res = 'in the distance';
        else
            res = 'near you';
    }
    return res;
}

/* src/detect.c:1196 level_detects[] */
const level_detects = [
    { what: 'Delphi', where: () => game.oracle_level },
    { what: "Medusa's lair", where: () => game.medusa_level },
    { what: 'a castle', where: () => game.stronghold_level },
    { what: "the Wizard of Yendor's tower", where: () => game.wiz1_level },
];

// src/detect.c:1206 use_crystal_ball(), gaze into a crystal ball.
export async function use_crystal_ball(obj) {
    let ch;
    let oops;
    const charged = (obj.spe > 0);

    if (Blind()) {
        await pline(`Too bad you can't see ${the(xname(obj))}.`);
        return;
    }
    oops = is_quest_artifact(obj) ? 8 : obj.blessed ? 16 : 20;
    if (charged && (obj.cursed || rnd(oops) > ACURR(A_INT))) {
        const impair = rnd(100 - 3 * ACURR(A_INT));

        switch (rnd((obj.oartifact || obj.blessed) ? 4 : 5)) {
        case 1:
            await pline(`${Tobjnam(obj, 'are')} too much to comprehend!`);
            break;
        case 2:
            await pline(`${Tobjnam(obj, 'confuse')} you!`);
            await make_confused(((game.u.intrinsic?.HConfusion || 0) & TIMEOUT)
                                + impair, false);
            break;
        case 3:
            if (!resists_blnd(game.youmonst)) {
                await pline(`${Tobjnam(obj, 'damage')} your vision!`);
                await make_blinded(((game.u.intrinsic?.HBlinded || 0) & TIMEOUT)
                                   + impair, false);
                if (!Blind())
                    await Your('vision quickly clears.'); /* Your1(vision_clears) */
            } else {
                await pline(`${Tobjnam(obj, 'assault')} your vision.`);
                await You('are unaffected!');
            }
            break;
        case 4:
            await pline(`${Tobjnam(obj, 'zap')} your mind!`);
            await make_hallucinated(((game.u.intrinsic?.HHallucination || 0) & TIMEOUT)
                                    + impair, false, 0);
            break;
        case 5:
            await pline(`${Tobjnam(obj, 'explode')}!`);
            useup(obj);
            obj = null;
            await losehp(Maybe_Half_Phys(rnd(30)), 'exploding crystal ball',
                         KILLED_BY_AN);
            break;
        }
        if (obj)
            await consume_obj_charge(obj, true);
        return;
    }

    if (Hallucination()) {
        nomul(-rnd(charged ? 4 : 2));
        game.multi_reason = 'gazing into a Magic 8-Ball (tm)';
        game.nomovemsg = '';
        if (!charged) {
            await pline(`All you see is funky ${hcolor(null)} haze.`);
            if (obj.spe < 0) {
                /* implode: destroy it when it has been cancelled */
                await pline(`${Tobjnam(obj, 'implode')}!`);
                useup(obj);
                return;
            }
        } else {
            switch (rnd(6)) {
            case 1:
                await You('grok some groovy globs of incandescent lava.');
                break;
            case 2:
                await pline(`Whoa!  Psychedelic colors, ${
                            poly_gender() === 1 ? 'babe' : 'dude'}!`);
                break;
            case 3:
                await pline_The(`crystal pulses with sinister ${hcolor(null)} light!`);
                break;
            case 4:
                await You_see('goldfish swimming above fluorescent rocks.');
                break;
            case 5:
                await You_see('tiny snowflakes spinning around a miniature farmhouse.');
                break;
            default:
                await pline('Oh wow... like a kaleidoscope!');
                break;
            }
            await consume_obj_charge(obj, true);
        }
        return;
    }

    /* read a single character */
    if (game.flags?.verbose !== false)
        await You('may look for an object, monster, or special map symbol.');
    ch = await tty_yn_function('What do you look for?', null, '\0', true);
    /* Don't filter out ' ' here; it has a use */
    if ((ch !== def_monsyms[MONSYMS.S_GHOST]) && quitchars.includes(ch)) {
        if (game.flags?.verbose !== false)
            await pline('Never mind.');
        return;
    }
    await You(`peer into ${the(xname(obj))}...`);
    nomul(-rnd(charged ? 10 : 2));
    game.multi_reason = 'gazing into a crystal ball';
    game.nomovemsg = '';
    if (!charged) {
        await pline_The('vision is unclear.');
        if (obj.spe < 0) { /* destroy ball if used after being cancelled */
 /* implode: */ /* no damage to hero but 'multi' has a small negative value */
            await pline(`${Tobjnam(obj, 'implode')}!`);
            useup(obj);
            return;
        }
    } else {
        let cls_, i;
        let ret = 0;

        makeknown(ONAMES.CRYSTAL_BALL);
        await consume_obj_charge(obj, true);

        /* special case: accept ']' as synonym for mimic
         * we have to do this before the def_char_to_objclass check
         */
        if (ch === ']') /* DEF_MIMIC_DEF */
            ch = 'm'; /* DEF_MIMIC */

        /* another special case: check for furniture (altars, fountains,
           &c) before checking for objects so that iron chain symbol
           finds stairs and ladders and drawbridge and iron bars
           (along with other furniture) instead of finding iron chains */
        if (def_char_is_furniture(ch) >= 0) {
            ret = await furniture_detect();
        } else if ((cls_ = def_char_to_objclass(ch)) !== def_oc_syms.length) {
            ret = await object_detect(null, cls_);
        } else if ((cls_ = def_char_to_monclass(ch)) !== def_monsyms.length) {
            ret = await monster_detect(null, cls_);
        } else if (boulder_sym_set() && ch === boulder_sym_set()) {
            ret = await object_detect(null, OCLASSES.ROCK_CLASS);
        } else if (ch === '^') {
            ret = await trap_detect(null);
        } else {
            i = rn2(level_detects.length);
            await You_see(`${level_detects[i].what}, ${
                          level_distance(level_detects[i].where())}.`);
            ret = 0;
        }

        if (ret) {
            if (!rn2(100)) /* make them nervous */
                await You_see('the Wizard of Yendor gazing out at you.');
            else
                await pline_The('vision is unclear.');
        }
    }
    return;
}
/* gs.showsyms[SYM_BOULDER + SYM_OFF_X]: unset unless the boulder option is
   used (not modelled, see js/options.js) */
const boulder_sym_set = () => 0;

// src/detect.c:1448 do_vicinity_map(), clairvoyance: map the vicinity.
export async function do_vicinity_map(sobj) {
    let zx, zy;
    let mtmp;
    let otmp;
    let save_EDetect_mons;
    let save_viz_uyux;
    let unconstrained, refresh = false,
        mdetected = false, odetected = false;
        /* extended (blessed, or skilled/expert) clairvoyance shows objects
           and monsters; if already clairvoyant, non-skilled spell acts
           like skilled */
    const extended = (sobj && (sobj.blessed || game.u.uprops?.CLAIRVOYANT)),
        random_farsight = !sobj;
    let newglyph, oldglyph;
    const lo_y = ((game.u.uy - 5 < 0) ? 0 : game.u.uy - 5),
        hi_y = ((game.u.uy + 6 >= ROWNO) ? ROWNO - 1 : game.u.uy + 6),
        lo_x = ((game.u.ux - 9 < 1) ? 1 : game.u.ux - 9), /* avoid column 0 */
        hi_x = ((game.u.ux + 10 >= COLNO) ? COLNO - 1 : game.u.ux + 10);
    let ter_typ = TER_DETECT | TER_MAP | TER_TRP | TER_OBJ;

    /*
     * 3.6.0 attempted to include hero's spot when swallowed by relaxing
     * couldsee() for that spot; now we just set IN_SIGHT for it here
     * and rely on show_map_spot() being an inclusive test.
     */
    save_viz_uyux = viz_array_get(game.u.uy, game.u.ux);
    if (game.u.uswallow)
        viz_array_set(game.u.uy, game.u.ux, save_viz_uyux | IN_SIGHT); /* <x,y> are reversed, [y][x] */
    save_EDetect_mons = game.u.uprops?.DETECT_MONSTERS;
    /* for skilled spell, getpos() scanning of the map will display all
       monsters within range; otherwise, "unseen creature" will be shown */
    (game.u.uprops ||= {}).DETECT_MONSTERS =
        (game.u.uprops.DETECT_MONSTERS | 0) | I_SPECIAL; /* EDetect_monsters */

    unconstrained = unconstrain_map();
    for (zx = lo_x; zx <= hi_x; zx++)
        for (zy = lo_y; zy <= hi_y; zy++) {
            oldglyph = glyph_at(zx, zy);
            /* this will remove 'remembered, unseen mon' (and objects) */
            show_map_spot(zx, zy, Confusion());
            /* if there are any objects here, see the top one */
            if (OBJ_AT(zx, zy)) {
                /* not vobj_at(); this is not vision-based access;
                   unlike object detection, we don't notice buried items */
                otmp = (game.level.objects || []).find(o => o.ox === zx && o.oy === zy);
                if (extended)
                    observe_object(otmp);
                map_object(otmp, true);

                newglyph = glyph_at(zx, zy);
                if (newglyph !== oldglyph && covers_objects(zx, zy))
                    odetected = true;
            }
            /* if there is a monster here, see or remember it,
               possibly as "remembered, unseen monster" */
            if ((mtmp = m_at(zx, zy)) != null
                && mtmp.mx === zx && mtmp.my === zy) { /* skip worm tails */
                /* if hero is swallowed, show engulfer at <u.ux,u.uy>;
                   if hero has hero_memory disabled and can't see
                   the map and we're not doing extended/blessed clairvoyance
                   (hence must be swallowed or underwater), show "unseen
                   creature" unless map already displayed a monster here */
                if ((unconstrained || !game.level?.flags?.hero_memory)
                    && !extended && (zx !== game.u.ux || zy !== game.u.uy)
                    && !(oldglyph?.kind === 'mon' || oldglyph?.kind === 'hero'))
                    map_invisible(zx, zy);
                else
                    map_monst(mtmp, false);

                newglyph = glyph_at(zx, zy);
                if (extended && newglyph !== oldglyph
                    && newglyph?.kind !== 'invis')
                    mdetected = true;
            }
        }

    /* if the map has been zapped clear (uswallow or uinwater or uburied)
       the only reason to browse the map is that previously undetected
       monster(s) or object(s) have been revealed, player can prevent
       the you-sense-your-surroundings message and browse operation from
       happening by setting 'quick_farsight' option; for clairvoyance
       spell, that option is ignored because the message and the pause
       for map browsing isn't as intrusive in that circumstance */
    if (random_farsight && game.flags?.quick_farsight)
        mdetected = odetected = false;

    if (!game.level?.flags?.hero_memory || unconstrained
        || mdetected || odetected) {
        await flush_screen(1);                 /* flush temp screen */
        /* the getpos() prompt from browse_map() is only shown when
           flags.verbose is set, but make this unconditional so that
           not-verbose users become aware of the prompting situation */
        await You('sense your surroundings.');
        if (extended || (glyph_at(game.u.ux, game.u.uy)?.kind === 'mon'
                         || glyph_at(game.u.ux, game.u.uy)?.kind === 'hero'))
            ter_typ |= TER_MON;
        await browse_map(ter_typ, 'anything of interest');
        refresh = true;
    }
    reconstrain_map();
    game.u.uprops.DETECT_MONSTERS = save_EDetect_mons;
    viz_array_set(game.u.uy, game.u.ux, save_viz_uyux);

    /* replace monsters with remembered,unseen monster, then run
       see_monsters() to update visible ones and warned-of ones */
    for (zx = lo_x; zx <= hi_x; zx++)
        for (zy = lo_y; zy <= hi_y; zy++) {
            if (u_at(zx, zy))
                continue;
            newglyph = glyph_at(zx, zy);
            if (newglyph?.kind === 'mon'
                && newglyph.mon?.mnum !== PMNAMES.PM_LONG_WORM_TAIL) {
                /* map_invisible() unless there's a visible monster
                   here; that lets the map memory be left alone instead
                   of being reset to 'I' during the see_monsters() cleanup
                   remembered objects be forgotten for the case where a
                   monster is immediately redrawn by see_monsters() */
                if ((mtmp = m_at(zx, zy)) == null || !canspotmon(mtmp))
                    map_invisible(zx, zy);
            }
        }
    see_monsters();
    if (refresh)
        await docrt();
}

// src/detect.c:1610 foundone(), reveal a found map spot right away.
function foundone(zx, zy, cell) {
    const lev = game.level.at(zx, zy);

    if (cell?.glyph?.kind === 'cmap' || cell?.glyph?.kind === 'unexplored')
        lev.seenv = SVALL;
    {
        const save_viz = viz_array_get(zy, zx);

        if (!Blind())
            viz_array_set(zy, zx, COULD_SEE | IN_SIGHT);
        newsym(zx, zy);
        viz_array_set(zy, zx, save_viz);
    }
}

// src/detect.c:1729 openone(), the spell/wand of opening's per-square
// effect: unlock boxes, open doors, reveal traps, open drawbridges.
async function openone(zx, zy, num_p) {
    let ttmp;

    if (OBJ_AT(zx, zy)) {
        for (const otmp of (game.level.objects || []).filter(o => o.ox === zx && o.oy === zy)) {
            if (Is_box(otmp) && otmp.olocked) {
                otmp.olocked = 0;
                num_p.value++;
            }
        }
        /* let it fall to the next cases. could be on trap. */
    }
    const lev = game.level.at(zx, zy);
    /* check for both secret doors and closed/locked doors, but not both;
       see rm.h for the troublesome overlay of doormask and wall_info */
    if (lev.typ === SDOOR
        || (lev.typ === DOOR
            && (lev.doormask & (D_CLOSED | D_LOCKED)))) {
        if (lev.typ === SDOOR)
            cvt_sdoor_to_door(lev); /* .typ = DOOR */
        if (lev.doormask & D_TRAPPED) {
            if (distu(zx, zy) < 3)
                await b_trapped('door', NO_PART);
            else
                await Norep(`You ${cansee(zx, zy) ? 'see' : (!Deaf() ? 'hear'
                                                              : 'feel the shock of')} an explosion!`);
            await wake_nearto(zx, zy, 11 * 11);
            lev.doormask = D_NODOOR;
        } else
            lev.doormask = D_ISOPEN;
        unblock_point(zx, zy);
        newsym(zx, zy);
        num_p.value++;
    } else if (lev.typ === SCORR) {
        lev.typ = CORR;
        unblock_point(zx, zy);
        newsym(zx, zy);
        num_p.value++;
    } else if ((ttmp = t_at(zx, zy)) != null) {
        let mon;
        const dummy = { v: false }; /* unneeded "you notice it arg" */

        if (!ttmp.tseen && ttmp.ttyp !== STATUE_TRAP) {
            ttmp.tseen = 1;
            newsym(zx, zy);
            num_p.value++;
        }
        mon = u_at(zx, zy) ? game.youmonst : m_at(zx, zy);
        if ((await openholdingtrap(mon, dummy))
            || (await openfallingtrap(mon, true, dummy)))
            num_p.value++;
    } else {
        const cc = { x: zx, y: zy };

        if (find_drawbridge(cc)) {
            /* make sure it isn't an open drawbridge */
            await open_drawbridge(cc.x, cc.y);
            num_p.value++;
        }
    }
}

// src/detect.c:1902 openit(), the wand/spell of opening (knock).
export async function openit() {
    const num = { value: 0 };

    if (game.u.uswallow) {
        if (digests(game.u.ustuck.data)) {
            if (Blind())
                await pline('Its mouth opens!');
            else
                await pline(`${Monnam(game.u.ustuck)} opens its mouth!`);
        }
        await expels(game.u.ustuck, game.u.ustuck.data, true);
        return -1;
    }

    await do_clear_area(game.u.ux, game.u.uy, BOLT_LIM, openone, num);
    return num.value;
}

// src/detect.c:1929 detecting(), is func one of the detection callbacks?
export function detecting(func) {
    return (func === findone || func === openone);
}

/* gv.viz_array[y][x] accessors; js/vision.js keeps the array on the game */
function viz_array_get(y, x) {
    return game.viz_array?.[y]?.[x] ?? 0;
}
function viz_array_set(y, x, v) {
    if (game.viz_array?.[y])
        game.viz_array[y][x] = v;
}
