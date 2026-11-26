// detect.js — detection and searching.
// C ref: detect.c
//
// Ported so far: dosearch0() (not its feel_location()/unmap_invisible()
// parts), mfind0(), warnreveal() and lock.c cvt_sdoor_to_door().

import { expels } from './mhitu.js';
import { dmgtype_fromattack, hides_under, is_hider } from './mondata.js';
import { Monnam } from './do_name.js';
import { AD_DGST, AT_ENGL } from './monsters.js';
import { feel_newsym } from './display.js';
import { game } from './gstate.js';
import { rnl } from './rng.js';
import { pline, newsym, docrt, flush_screen, glyph_at, glyph_kind, show_glyph,
         back_to_glyph, trap_to_glyph, covers_objects, xy_set_wall_state,
         cmap_to_glyph } from './display.js';
import { cansee } from './vision.js';
import { visible_region_at } from './region.js';
import { getpos } from './getpos.js';
import { COLNO, ROWNO, SVALL, TER_MAP, TER_TRP, TER_OBJ, TER_MON, TER_FULL,
         HALLUC, STUNNED, CONFUSION, Is_waterlevel, M_AP_FURNITURE, IS_WALL } from './const.js';
import { NO_COLOR, CLR_GRAY } from './terminal.js';
import { recalc_block_point } from './vision.js';
import { exercise } from './attrib.js';
import { map_background, map_object, map_trap } from './display.js';
import { sobj_at } from './makemon.js';
import { STONE, W_NONDIGGABLE, W_NONPASSWALL } from './const.js';
import { BOULDER, SchroedingersBox, Is_box } from './objects.js';
import { m_at } from './makemon.js';
import {
    canspotmon, sensemon, warning_of, map_invisible, glyph_is_invisible,
    feel_location
} from './display.js';
import {
    Stunned, Confusion, Blind, Hallucination, Hallucination as Hallucination_ft,
    Hallucination as Hallucination_dt
} from './youprop.js';

import { tty_display_nhwindow, tty_display_map_nhwindow as tty_display_map_nhwindow_dt } from './wintty.js';
import { seemimic } from './mon.js';
import { y_monnam, a_monnam } from './do_name.js';
import { cmd_safety_prevention } from './hack.js';
import { S_EEL, M1_HIDE, M1_CONCEAL } from './monsters.js';
import { t_at, STATUE_TRAP, trapname as trapname_ft } from './trap.js';
import { an as an_ft } from './objnam.js';
import {
    A_WIS, SDOOR, SCORR, DOOR, CORR, WM_MASK, D_NODOOR, D_CLOSED, D_LOCKED,
    BLINDED, isok, Is_rogue_level,
} from './const.js';
import { LENSES } from './objects.js';
import { ARTICLE_YOUR as ARTICLE_YOUR_DT, ARTICLE_THE as ARTICLE_THE_DT,
         SUPPRESS_SADDLE as SUPPRESS_SADDLE_DT } from './const.js';
import { unmap_invisible } from './display.js';
import {
    show_glyph_cell as show_glyph_cell_dt
} from './display.js';
import { rn2_on_display_rng as rn2_on_display_rng_dt } from './rng.js';
import { mons as mons_dt, NUMMONS as NUMMONS_DT, PM_LONG_WORM as PM_LONG_WORM_DT,
         S_WORM_TAIL as S_WORM_TAIL_DT } from './monsters.js';
import { def_monsyms as def_monsyms_dt } from './drawing.js';
import { CLR_WHITE as CLR_WHITE_DT } from './terminal.js';
import { DETECT_MONSTERS as DETECT_MONSTERS_DT,
         I_SPECIAL as I_SPECIAL_DT } from './const.js';
import { magic_map_background, flash_glyph_at, mon_to_glyph, GLYPH_INVISIBLE,
         glyph_at_to_remembered, map_engraving, You_feel as You_feel_dt } from './display.js';
import { rn2, rnd, rn2_fnptr } from './rng.js';
import { unblock_point, do_clear_area_async } from './vision.js';
import { engr_at } from './engrave.js';
import { room_discovered } from './dungeon.js';
import { closed_door as closed_door_dt } from './makemon.js';
import { find_drawbridge as find_drawbridge_dt } from './zap.js';
import { get_obj_location as get_obj_location_dt } from './shk.js';
import { observe_object as observe_object_dt } from './o_init.js';
import { money_cnt as money_cnt_dt } from './u_init.js';
import { hidden_gold as hidden_gold_dt, currency as currency_dt } from './insight.js';
import { x_monnam as x_monnam_dt } from './do_name.js';
import { s_suffix as s_suffix_dt } from './hacklib.js';
import { makeplural as makeplural_dt } from './objnam.js';
import { IS_FURNITURE, ROOMOFFSET, D_TRAPPED as D_TRAPPED_DT, D_ISOPEN as D_ISOPEN_DT,
         BOLT_LIM as BOLT_LIM_DT, BURIED_TOO as BURIED_TOO_DT,
         CONTAINED_TOO as CONTAINED_TOO_DT, FOOT as FOOT_DT, TOE as TOE_DT,
         BEAR_TRAP as BEAR_TRAP_DT } from './const.js';
import { TRAPPED_DOOR, TRAPPED_CHEST } from './trap.js';
import { GOLD_PIECE as GOLD_PIECE_DT, CHEST as CHEST_DT, COIN_CLASS as COIN_CLASS_DT,
         GOLD as GOLD_MAT_DT, NUM_OBJECTS as NUM_OBJECTS_DT,
         FIRST_OBJECT as FIRST_OBJECT_DT } from './objects.js';
import { PM_GOLD_GOLEM as PM_GOLD_GOLEM_DT } from './monsters.js';
import { unmap_object, cls as cls_dt, display_self as display_self_dt } from './display.js';
import { MAXOCLASSES as MAXOCLASSES_DT } from './objects.js';
import { objects as objects_dt, POTION_CLASS as POTION_CLASS_DT,
         FOOD_CLASS as FOOD_CLASS_DT, LARGE_BOX as LARGE_BOX_DT } from './objects.js';
import { CONFUSION as CONFUSION_DT,
         NOSE as NOSE_DT, A_WIS as A_WIS_DT, TER_DETECT as TER_DETECT_DT } from './const.js';
import { body_part as body_part_dt } from './insight.js';
import { strange_feeling as strange_feeling_dt } from './potion.js';
import { openholdingtrap, openfallingtrap, activate_statue_trap } from './trap.js';
import { impossible } from './hack.js';
import { def_oc_syms as def_oc_syms_dt } from './drawing.js';
import { def_oc_names as def_oc_names_dt } from './insight.js';
import { ROCK_CLASS as ROCK_CLASS_DT, SCROLL_CLASS as SCROLL_CLASS_DT,
         SPBOOK_CLASS as SPBOOK_CLASS_DT } from './objects.js';
import { u_at as u_at_dt, M_AP_TYPE as M_AP_TYPE_DT, M_AP_OBJECT as M_AP_OBJECT_DT,
         MCORPSENM as MCORPSENM_DT } from './const.js';
import { PM_TENGU as PM_TENGU_DT } from './monsters.js';

// C ref: lock.c cvt_sdoor_to_door()
export function cvt_sdoor_to_door(lev) {
    let newmask = (lev.doormask || 0) & ~WM_MASK;

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
    lev.arboreal_sdoor = 0; /* clears 'candig' */
}


/* C ref: hack.c nomul(0) */
function nomul0() {
    const g = game;
    if (g.multi < 0)
        return;
    g.multi = 0;
    /* u.uinvulnerable, usleep, multi_reason, travel/run flags: not
       ported yet */
}

// C ref: detect.c mfind0()
/* used by dosearch0() and warnreveal() */
async function mfind0(mtmp, via_warning) {
    const x = mtmp.mx, y = mtmp.my;
    let found_something = false;

    if (via_warning && !warning_of(mtmp))
        return -1;

    if (mtmp.m_ap_type) { /* M_AP_TYPE(mtmp) */
        seemimic(mtmp);
        found_something = true;
    } else {
        /* this used to only be executed if a !canspotmon() test passed
           but that failed to bring sensed monsters out of hiding */
        found_something = !canspotmon(mtmp);
        if (mtmp.mundetected && (is_hider(mtmp.data)
                                 || hides_under(mtmp.data)
                                 || mtmp.data.mlet === S_EEL)) {
            if (via_warning && found_something) {
                /* set_msg_xy(x, y): accessibility only */
                await pline(`Your danger sense causes you to take a second ${
                    Blind() ? "to check nearby" : "look close by"}.`);
                await tty_display_nhwindow(game.WIN_MESSAGE, false); /* flush messages */
            }
            mtmp.mundetected = 0;
            found_something = true;
        }
        newsym(x, y);
    }

    if (found_something) {
        if (!canspotmon(mtmp)
            && glyph_is_invisible(game.level.at(x, y).remembered_glyph))
            return -1; /* Found invisible monster in square which already has
                        * 'I' in it.  Logically, this should still take time
                        * and lead to `return 1', but if we did that the hero
                        * would keep finding the same monster every turn. */
        await exercise(A_WIS, true);
        if (!canspotmon(mtmp)) {
            map_invisible(x, y);
            /* set_msg_xy(x, y) */
            await You_feel_dt("an unseen monster!");
        } else if (!sensemon(mtmp)) {
            /* set_msg_xy(x, y) */
            await pline(`You find ${mtmp.mtame ? y_monnam(mtmp) : a_monnam(mtmp)}.`);
        }
        return 1;
    }
    return 0;
}

// C ref: detect.c dosearch0()
export async function dosearch0(aflag) /* intrinsic autosearch vs explicit searching */ {
    const g = game;
    const u = g.u;
    let x, y, trap, mtmp;

    if (u.uswallow) {
        if (!aflag)
            await pline("What are you looking for?  The exit?");
    } else {
        /* uwep->oartifact && spec_ability(uwep, SPFX_SEARCH): artifacts
           aren't ported yet */
        let fund = 0;
        if (g.ublindf && g.ublindf.otyp === LENSES && !Blind())
            fund += 2; /* JDS: lenses help searching */
        if (fund > 5)
            fund = 5;
        for (x = u.ux - 1; x < u.ux + 2; x++)
            for (y = u.uy - 1; y < u.uy + 2; y++) {
                if (!isok(x, y))
                    continue;
                if (x === u.ux && y === u.uy)
                    continue;

                if (!aflag && (Blind() || visible_region_at(x, y)))
                    feel_location(x, y);
                const lev = g.level.at(x, y);
                if (lev.typ === SDOOR) {
                    if (rnl(7 - fund))
                        continue;
                    cvt_sdoor_to_door(lev); /* .typ = DOOR */
                    recalc_block_point(x, y);
                    await exercise(A_WIS, true);
                    nomul0();
                    feel_location(x, y); /* make sure it shows up */
                    await pline("You find a hidden door.");
                } else if (lev.typ === SCORR) {
                    if (rnl(7 - fund))
                        continue;
                    lev.typ = CORR;
                    recalc_block_point(x, y); /* unblock_point(): vision */
                    await exercise(A_WIS, true);
                    nomul0();
                    feel_newsym(x, y); /* make sure it shows up */
                    await pline("You find a hidden passage.");
                } else {
                    /* Be careful not to find anything in an SCORR or SDOOR */
                    if ((mtmp = m_at(x, y)) && !aflag) {
                        const mfres = await mfind0(mtmp, false);

                        if (mfres === -1)
                            continue;
                        else if (mfres > 0)
                            return mfres;
                    }

                    /* see if an invisible monster has moved--if Blind,
                     * feel_location() already did it
                     */
                    if (!aflag && !mtmp && !Blind())
                        unmap_invisible(x, y);

                    if ((trap = t_at(x, y)) && !trap.tseen && !rnl(8)) {
                        nomul0();
                        if (trap.ttyp === STATUE_TRAP) {
                            if (await activate_statue_trap(trap, x, y, false))
                                await exercise(A_WIS, true);
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

// C ref: detect.c find_trap()
async function find_trap(trap) {
    let cleared = false;

    trap.tseen = 1;
    await exercise(A_WIS, true);
    feel_newsym(trap.tx, trap.ty);

    /* The "Hallucination ||" is to preserve 3.6.1 behavior, but this
       behavior might need a rework in the hallucination case
       (e.g. to not prompt if any trap glyph appears on the square). */
    const rg = game.level.at(trap.tx, trap.ty).remembered_glyph;
    const tg = trap_to_glyph(trap);
    if (Hallucination_ft()
        || !(rg && rg.trap && rg.ch === tg.ch && rg.color === tg.color)) {
        /* There's too much clutter to see your find otherwise */
        await cls_dt();
        map_trap(trap, 1);
        display_self_dt();
        cleared = true;
    }

    /* set_msg_xy(trap->tx, trap->ty): only positions the message for
       screen readers */
    await pline(`You find ${an_ft(trapname_ft(trap.ttyp, false))}.`);

    if (cleared) {
        await tty_display_map_nhwindow_dt(true); /* display_nhwindow(WIN_MAP, TRUE): wait */
        await docrt();
    }
}

// C ref: detect.c dosearch() -- the 's' command
export async function dosearch() {
    if (await cmd_safety_prevention("Searching", "another search",
                                    "You already found a monster.",
                                    "already_found_flag"))
        return 0; /* ECMD_OK */
    return (await dosearch0(0)) ? 1 /* ECMD_TIME */ : 0 /* ECMD_OK */;
}

// C ref: detect.c warnreveal()
export async function warnreveal() {
    const u = game.u;
    let x, y, mtmp;

    for (x = u.ux - 1; x <= u.ux + 1; x++)
        for (y = u.uy - 1; y <= u.uy + 1; y++) {
            if (!isok(x, y) || (x === u.ux && y === u.uy)) /* u_at(x, y) */
                continue;
            if ((mtmp = m_at(x, y)) != null
                && warning_of(mtmp) && mtmp.mundetected)
                await mfind0(mtmp, true); /* via_warning */
        }
}

// C ref: detect.c unconstrain_map()
/* bring hero out from underwater or underground or being engulfed;
   return True iff any change occurred */
function unconstrain_map() {
    const u = game.u, iflags = game.iflags;
    const res = !!(u.uinwater || u.uburied || u.uswallow);

    /* bring Underwater, buried, or swallowed hero to normal map;
       bypass set_uinwater() */
    iflags.save_uinwater = u.uinwater, u.uinwater = 0;
    iflags.save_uburied = u.uburied, u.uburied = 0;
    iflags.save_uswallow = u.uswallow, u.uswallow = 0;

    return res;
}

// C ref: detect.c reconstrain_map()
/* put hero back underwater or underground or engulfed */
function reconstrain_map() {
    const u = game.u, iflags = game.iflags;
    /* if was in water and taken out, put back; bypass set_uinwater() */
    u.uinwater = iflags.save_uinwater || 0, iflags.save_uinwater = 0;
    u.uburied = iflags.save_uburied || 0, iflags.save_uburied = 0;
    u.uswallow = iflags.save_uswallow || 0, iflags.save_uswallow = 0;
}

// C ref: detect.c map_redisplay()
async function map_redisplay() {
    reconstrain_map();
    await docrt(); /* redraw the screen to remove unseen traps from the map */
    if (game.u.uinwater && !Is_waterlevel(game.u.uz)) /* Underwater */
        throw new Error('map_redisplay(): under_water() not ported yet');
    if (game.u.uburied)
        throw new Error('map_redisplay(): under_ground() not ported yet');
}

// C ref: detect.c browse_map()
async function browse_map(ter_typ, ter_explain) {
    /* don't care whether player actually picks a spot */
    const dummy_pos = { x: game.u.ux, y: game.u.uy }; /* starting spot for getpos() */
    const save_autodescribe = game.iflags.autodescribe;
    game.iflags.autodescribe = true;
    game.iflags.terrainmode = ter_typ;
    await getpos(dummy_pos, false, ter_explain);
    game.iflags.terrainmode = 0;
    game.iflags.autodescribe = save_autodescribe;
}

/* C ref: display.h glyph_is_*() for the glyph_at()/lev->glyph forms */
function g_kind(glyph) { return glyph.kind ?? glyph_kind(glyph); }

// C ref: detect.c reveal_terrain_getglyph()
function reveal_terrain_getglyph(x, y, swallowed, default_glyph, which_subset) {
    const g = game;
    const lev = g.level.at(x, y);
    let t;
    let glyph, levl_glyph;
    const keep_traps = (which_subset & TER_TRP) !== 0,
        keep_objs = (which_subset & TER_OBJ) !== 0,
        keep_mons = (which_subset & TER_MON) !== 0,
        full = (which_subset & TER_FULL) !== 0;

    /* for 'full', show the actual terrain for the entire level,
       otherwise what the hero remembers for seen locations with
       monsters, objects, and/or traps removed as caller dictates */
    const seenv = (full || g.level.flags.hero_memory)
                  ? lev.seenv : cansee(x, y) ? SVALL : 0;
    if (full) {
        const save = lev.seenv;
        lev.seenv = SVALL;
        glyph = back_to_glyph(x, y);
        lev.seenv = save;
    } else {
        const reg = visible_region_at(x, y);
        let was_mon = false;

        levl_glyph = g.level.flags.hero_memory
                     ? (lev.remembered_glyph || GLYPH_UNEXPLORED)
                     : seenv ? back_to_glyph(x, y)
                       : default_glyph;
        /* glyph_at() returns the displayed glyph, which might
           be a monster.  levl[][].glyph contains the remembered
           glyph, which will never be a monster (unless it is
           the invisible monster glyph, which is handled like
           an object, replacing any object or trap at its spot) */
        glyph = !swallowed ? glyph_at(x, y) : levl_glyph;
        if (keep_mons && x === g.u.ux && y === g.u.uy && swallowed) {
            throw new Error('reveal_terrain_getglyph(): engulfer glyph not ported yet');
        } else if ((!keep_mons && (g_kind(glyph) === 'mon'
                                   || g_kind(glyph) === 'warning'))
                   || g_kind(glyph) === 'swallow') {
            glyph = levl_glyph;
            was_mon = true;
        }
        if (((!keep_objs && g_kind(glyph) === 'obj')
             || g_kind(glyph) === 'invisible')
            && keep_traps && !covers_objects(x, y) /* covers_traps() */) {
            if ((t = t_at(x, y)) && t.tseen)
                glyph = trap_to_glyph(t);
        }
        if ((!keep_objs && g_kind(glyph) === 'obj')
            /* we either show both traps and visible regions (trap if both
               are present at the same spot) or neither traps nor regions */
            || (!keep_traps && (g_kind(glyph) === 'trap'
                                || (reg && g_kind(glyph) === 'gascloud')))
            || (reg && was_mon)
            || g_kind(glyph) === 'invisible') {
            if (!seenv) {
                /* it's possible to have a visible region shown at an
                   otherwise unexplored location */
                glyph = !reg ? default_glyph : GLYPH_UNEXPLORED;
            } else if (keep_traps && reg
                       && (g_kind(glyph) === 'gascloud' || was_mon)) {
                throw new Error('reveal_terrain_getglyph(): region glyphs not ported yet');
            } else if ((g.level.lastseentyp?.[x]?.[y] ?? 0) === lev.typ) {
                glyph = back_to_glyph(x, y);
            } else {
                /* look for a mimic here posing as furniture;
                   if we don't find one, we'll have to fake it */
                const mtmp = m_at(x, y);
                if (mtmp && mtmp.m_ap_type === M_AP_FURNITURE) {
                    glyph = cmap_to_glyph(mtmp.mappearance);
                } else {
                    /*
                     * We have a topology type but we want a screen symbol
                     * in order to derive a glyph.  Some screen symbols need
                     * the flags field of levl[][] in addition to the type.
                     * An exception is wall_info which can be recalculated and
                     * needs to be.
                     */
                    const save_spot = { ...lev };
                    delete save_spot.doormask;
                    delete save_spot.drawbridgemask;
                    lev.typ = g.level.lastseentyp?.[x]?.[y] ?? 0;
                    if (IS_WALL(lev.typ) || lev.typ === SDOOR)
                        xy_set_wall_state(x, y); /* levl[x][y].wall_info */
                    glyph = back_to_glyph(x, y);
                    Object.assign(lev, save_spot);
                }
            }
        }
    }
    /* FIXME: dirty hack */
    if (glyph.cmap === 'S_darkroom')
        glyph = { ...glyph, cmap: 'S_room' };
    else if (glyph.cmap === 'S_litcorr')
        glyph = back_to_glyph_cmap_corr();
    return glyph;
}

/* cmap_to_glyph(S_corr) in the remembered-glyph form */
function back_to_glyph_cmap_corr() {
    return { ch: '#', color: CLR_GRAY, decgfx: false, cmap: 'S_corr' };
}

/* GLYPH_UNEXPLORED, shown as blank */
const GLYPH_UNEXPLORED = { ch: ' ', color: NO_COLOR, decgfx: false, cmap: 'unexplored' };

// C ref: detect.c reveal_terrain()
/* idea from crawl; show known portion of map without any monsters,
   objects, or traps occluding the view of the underlying terrain;
   in explore or wizard modes, can also display unexplored portion */
export async function reveal_terrain(which_subset) {
    const u = game.u;
    /* 'full' overrides impairment and implies no-traps, no-objs, no-mons */
    const full = (which_subset & TER_FULL) !== 0; /* show whole map */

    if ((Hallucination() || Stunned() || Confusion()) && !full) {
        await pline("You are too disoriented for this."); /* You() */
    } else {
        let glyph;
        /* there is a TER_MAP bit too; we always show map regardless of it */
        const keep_traps = (which_subset & TER_TRP) !== 0,
            keep_objs = (which_subset & TER_OBJ) !== 0,
            keep_mons = (which_subset & TER_MON) !== 0; /* not used */
        const swallowed = u.uswallow; /* before unconstrain_map() */
        /* default_sym = arboreal ? S_tree : S_stone */
        if (game.level.flags.arboreal)
            throw new Error('reveal_terrain(): arboreal default glyph not ported yet');
        const default_glyph = { ch: ' ', color: NO_COLOR, decgfx: false, cmap: 'S_stone' };

        if (unconstrain_map())
            await docrt();

        for (let x = 1; x < COLNO; x++)
            for (let y = 0; y < ROWNO; y++) {
                glyph = reveal_terrain_getglyph(x, y, swallowed,
                                                default_glyph, which_subset);
                show_glyph(x, y, glyph);
            }

        /* hero's location is not highlighted, but getpos() starts with
           cursor there, and after moving it anywhere '@' moves it back */
        await flush_screen(1);
        let buf;
        if (full) {
            buf = "underlying terrain";
        } else {
            buf = "known terrain";
            if (keep_traps)
                buf += `${(keep_objs || keep_mons) ? "," : " and"} traps`;
            if (keep_objs)
                buf += `${(keep_traps || keep_mons) ? "," : ""}${keep_mons ? "" : " and"} objects`;
            if (keep_mons)
                buf += `${(keep_traps || keep_objs) ? "," : ""} and monsters`;
        }
        await pline(`Showing ${buf} only...`);

        /* allow player to move cursor around and get autodescribe feedback
           based on what is visible now rather than what is on 'real' map */
        which_subset |= TER_MAP; /* guarantee non-zero */
        await browse_map(which_subset, "anything of interest");

        await map_redisplay();
    }
}

// C ref: detect.c skip_premap_detect()
function skip_premap_detect(x, y) {
    const lev = game.level.at(x, y);

    if ((lev.typ === STONE)
        && ((lev.wall_info || 0) & (W_NONDIGGABLE | W_NONPASSWALL)) !== 0)
        return true;
    return false;
}

// C ref: detect.c premap_detect()
/* Pre-map (the sokoban) levels */
export function premap_detect() {
    let obj;

    /* Map the background and boulders */
    for (let x = 1; x < COLNO; x++)
        for (let y = 0; y < ROWNO; y++) {
            if (skip_premap_detect(x, y))
                continue;
            const lev = game.level.at(x, y);
            lev.seenv = SVALL;
            lev.waslit = true;
            if (lev.typ === SDOOR) {
                /* see rm.h for explanation: wall_info and doormask are
                   the same field (flags) in C */
                lev.wall_info = 0;
                lev.flags = 0;
            }
            map_background(x, y, 1);
            if ((obj = sobj_at(BOULDER, x, y)) !== null)
                map_object(obj, 1);
        }

    /* Map the traps */
    for (const ttmp of (game.level.traps || [])) {
        ttmp.tseen = 1;
        map_trap(ttmp, 1);
    }
}

/* C ref: obj.h Has_contents(), SchroedingersBox() */
function Has_contents(o) { return !!o.cobj; }

// C ref: detect.c o_in()
/* Recursively search obj for an object in class oclass and return 1st found */
export function o_in(obj, oclass) {
    let otmp, temp;

    if (obj.oclass === oclass)
        return obj;
    /*
     * Note:  we exclude SchroedingersBox because the corpse it contains
     * isn't necessarily a corpse yet.  Resolving the status would lead
     * to complications if it turns out to be a live cat.  We know that
     * that Box can't contain anything else because putting something in
     * would resolve the cat/corpse situation and convert to ordinary box.
     */
    if (Has_contents(obj) && !SchroedingersBox(obj)) {
        for (otmp = obj.cobj; otmp; otmp = otmp.nobj)
            if (otmp.oclass === oclass)
                return otmp;
            else if (Has_contents(otmp) && (temp = o_in(otmp, oclass)) != null)
                return temp;
    }
    return null;
}

// C ref: detect.c o_material()
/* Recursively search obj for an object made of specified material.
 * Return first found.
 */
export function o_material(obj, material) {
    let otmp, temp;

    if (objects_dt[obj.otyp].oc_material === material)
        return obj;

    if (Has_contents(obj)) {
        for (otmp = obj.cobj; otmp; otmp = otmp.nobj)
            if (objects_dt[otmp.otyp].oc_material === material)
                return otmp;
            else if (Has_contents(otmp)
                     && (temp = o_material(otmp, material)) != null)
                return temp;
    }
    return null;
}

// C ref: detect.c observe_recursively()
function observe_recursively(obj) {
    observe_object_dt(obj, Hallucination_dt());
    if (Has_contents(obj)) {
        for (let otmp = obj.cobj; otmp; otmp = otmp.nobj)
            observe_recursively(otmp);
    }
}

/* C ref: display.h glyph_is_object(), glyph_to_obj() for the JS glyph
   form: obj_to_glyph() keeps the objects[] index in 'otyp' */
function glyph_is_object_dt(glyph) { return !!glyph && g_kind(glyph) === 'obj'; }

/* C ref: level.objects[x][y] -- the floor objects at a spot */
function objects_at_dt(x, y) {
    return (game.level.objects || []).filter(o => o.ox === x && o.oy === y
                                               && o.where === 'OBJ_FLOOR');
}

// C ref: detect.c check_map_spot()
/* Check whether the location has an outdated object displayed on it. */
function check_map_spot(x, y, oclass, material) {
    let mtmp;

    const glyph = glyph_at(x, y);
    if (glyph_is_object_dt(glyph)) {
        /* there's some object shown here */
        if (oclass === ALL_CLASSES_DT) {
            return !(objects_at_dt(x, y).length /* stale if nothing here */
                     || ((mtmp = m_at(x, y)) != null && mtmp.minvent?.length));
        } else {
            if (material
                && objects_dt[glyph.otyp].oc_material === material) {
                /* object shown here is of interest because material matches */
                for (const otmp of objects_at_dt(x, y))
                    if (o_material(otmp, GOLD_MAT_DT))
                        return false;
                /* didn't find it; perhaps a monster is carrying it */
                if ((mtmp = m_at(x, y)) != null) {
                    for (const otmp of minvent_dt(mtmp))
                        if (o_material(otmp, GOLD_MAT_DT))
                            return false;
                }
                /* detection indicates removal of this object from the map */
                return true;
            }
            if (oclass && objects_dt[glyph.otyp].oc_class === oclass) {
                /* obj shown here is of interest because its class matches */
                for (const otmp of objects_at_dt(x, y))
                    if (o_in(otmp, oclass))
                        return false;
                /* didn't find it; perhaps a monster is carrying it */
                if ((mtmp = m_at(x, y)) != null) {
                    for (const otmp of minvent_dt(mtmp))
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

// C ref: detect.c clear_stale_map()
/*
 * When doing detection, remove stale data from the map display (corpses
 * rotted away, objects carried away by monsters, etc) so that it won't
 * reappear after the detection has completed.  Return true if noticeable
 * change occurs.
 */
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

/* C ref: monst.h DEADMONSTER() */
function DEADMONSTER_dt(mtmp) { return mtmp.mhp < 1; }

// C ref: detect.c gold_detect()
/* look for gold, on the floor or in monsters' possession */
export async function gold_detect(sobj) {
    const g = game, u = g.u;
    let obj, mtmp, temp = null;
    let ugold = false, steedgold = false;
    let ter_typ = TER_DETECT_DT | TER_OBJ;
    let outgoldmap = false;

    const stale = clear_stale_map(COIN_CLASS_DT, sobj.blessed ? GOLD_MAT_DT : 0);
    g.known = stale;

    /* look for gold carried by monsters (might be in a container) */
    for (mtmp = g.fmon; mtmp && !outgoldmap; mtmp = mtmp.nmon) {
        if (DEADMONSTER_dt(mtmp) || (mtmp.isgd && !mtmp.mx))
            continue;
        if (findgold_dt(mtmp.minvent) || mtmp.data === mons_dt[PM_GOLD_GOLEM_DT]) {
            if (mtmp === u.usteed) {
                steedgold = true;
            } else {
                g.known = true;
                outgoldmap = true; /* goto outgoldmap; skip further searching */
            }
        } else {
            for (obj of minvent_dt(mtmp))
                if ((sobj.blessed && o_material(obj, GOLD_MAT_DT))
                    || o_in(obj, COIN_CLASS_DT)) {
                    if (mtmp === u.usteed) {
                        steedgold = true;
                    } else {
                        g.known = true;
                        outgoldmap = true; /* goto outgoldmap */
                        break;
                    }
                }
        }
    }

    /* look for gold objects */
    if (!outgoldmap)
        for (obj of fobj_dt()) {
            if (sobj.blessed && o_material(obj, GOLD_MAT_DT)) {
                g.known = true;
                if (obj.ox !== u.ux || obj.oy !== u.uy) {
                    outgoldmap = true; /* goto outgoldmap */
                    break;
                }
            } else if (o_in(obj, COIN_CLASS_DT)) {
                g.known = true;
                if (obj.ox !== u.ux || obj.oy !== u.uy) {
                    outgoldmap = true; /* goto outgoldmap */
                    break;
                }
            }
        }

    if (!outgoldmap) {
        if (!g.known) {
            /* no gold found on floor or monster's inventory.
               adjust message if you have gold in your inventory */
            let buf;

            if (g.youmonst?.data === mons_dt[PM_GOLD_GOLEM_DT])
                buf = `You feel like a million ${currency_dt(2)}!`;
            else if (money_cnt_dt(g.invent) || hidden_gold_dt(true))
                buf = "You feel worried about your future financial situation.";
            else if (steedgold)
                buf = `You feel interested in ${s_suffix_dt(x_monnam_dt(u.usteed,
                          u.usteed.mtame ? ARTICLE_YOUR_DT : ARTICLE_THE_DT,
                          null, SUPPRESS_SADDLE_DT, false))} financial situation.`;
            else
                buf = "You feel materially poor.";

            await strange_feeling_dt(sobj, buf);
            return 1;
        }
        /* only under me - no separate display required */
        if (stale)
            await docrt();
        await pline(`You notice some gold between your ${makeplural_dt(body_part_dt(FOOT_DT))}.`);
        return 0;
    }

    /* outgoldmap: */
    await cls_dt();

    unconstrain_map();
    /* Discover gold locations. */
    for (obj of fobj_dt()) {
        if (sobj.blessed && (temp = o_material(obj, GOLD_MAT_DT)) != null) {
            if (temp !== obj) {
                temp.ox = obj.ox;
                temp.oy = obj.oy;
            }
            map_object(temp, 1);
        } else if ((temp = o_in(obj, COIN_CLASS_DT)) != null) {
            if (temp !== obj) {
                temp.ox = obj.ox;
                temp.oy = obj.oy;
            }
            map_object(temp, 1);
        }
        if (temp && temp.ox === u.ux && temp.oy === u.uy)
            ugold = true;
    }
    for (mtmp = g.fmon; mtmp; mtmp = mtmp.nmon) {
        if (DEADMONSTER_dt(mtmp) || (mtmp.isgd && !mtmp.mx))
            continue;
        temp = null;
        if (findgold_dt(mtmp.minvent) || mtmp.data === mons_dt[PM_GOLD_GOLEM_DT]) {
            /* gold = cg.zeroobj; ensure oextra is cleared too */
            const gold = { otyp: GOLD_PIECE_DT, oclass: 0, dknown: 0 };
            gold.quan = rnd(10); /* usually more than 1 */
            gold.ox = mtmp.mx;
            gold.oy = mtmp.my;
            map_object(gold, 1);
            temp = gold;
        } else {
            for (obj of minvent_dt(mtmp))
                if (sobj.blessed && (temp = o_material(obj, GOLD_MAT_DT)) != null) {
                    temp.ox = mtmp.mx;
                    temp.oy = mtmp.my;
                    map_object(temp, 1);
                    break;
                } else if ((temp = o_in(obj, COIN_CLASS_DT)) != null) {
                    temp.ox = mtmp.mx;
                    temp.oy = mtmp.my;
                    map_object(temp, 1);
                    break;
                }
        }
        if (temp && temp.ox === u.ux && temp.oy === u.uy)
            ugold = true;
    }
    if (!ugold) {
        newsym(u.ux, u.uy);
        ter_typ |= TER_MON; /* so autodescribe will recognize hero */
    }
    await You_feel_dt("very greedy, and sense gold!");
    await exercise(A_WIS, true);

    await browse_map(ter_typ, "gold");

    await map_redisplay();
    return 0;
}

/* C ref: invent.c findgold() -- for a linked (nobj) object chain */
function findgold_dt(chain) {
    for (const o of objchain_dt(chain))
        if (o.otyp === GOLD_PIECE_DT)
            return o;
    return null;
}

/* C ref: fobj -- the floor objects, newest first */
function fobj_dt() {
    return (game.level.objects || []).filter(o => o.where === 'OBJ_FLOOR');
}

/* C ref: mtmp->minvent walked via nobj (newest first); JS minvent is an
   array, oldest first */
function minvent_dt(mtmp) {
    return (mtmp.minvent || []).slice().reverse();
}

/* C ref: an object chain as C walks it with ->nobj: an array (fobj,
   buriedobjlist) or a linked (nobj) list (invent, minvent, cobj) */
function* objchain_dt(list) {
    if (Array.isArray(list)) {
        for (const o of list)
            yield o;
    } else {
        for (let o = list; o; o = o.nobj)
            yield o;
    }
}


// C ref: detect.c food_detect()
/* returns 1 if nothing was detected, 0 if something was detected */
export async function food_detect(sobj) {
    const g = game, u = g.u;
    let ct = 0, ctu = 0;
    const confused = !!(Confusion() || (sobj && sobj.cursed));
    const oclass = confused ? POTION_CLASS_DT : FOOD_CLASS_DT;
    const what = confused ? "something" : "food";

    const stale = clear_stale_map(oclass, 0);
    if (u.usteed) /* some situations leave steed with stale coordinates */
        u.usteed.mx = u.ux, u.usteed.my = u.uy;

    for (const obj of g.level.objects || [])
        if (obj.where === 'OBJ_FLOOR' && o_in(obj, oclass)) {
            if (obj.ox === u.ux && obj.oy === u.uy)
                ctu++;
            else
                ct++;
        }
    for (let mtmp = g.fmon; mtmp && (!ct || !ctu); mtmp = mtmp.nmon) {
        if (mtmp.mhp < 1 || (mtmp.isgd && !mtmp.mx))
            continue;
        for (const obj of minvent_dt(mtmp))
            if (o_in(obj, oclass)) {
                if (mtmp.mx === u.ux && mtmp.my === u.uy)
                    ctu++; /* steed or an engulfer with inventory */
                else
                    ct++;
                break;
            }
    }

    if (!ct && !ctu) {
        g.known = stale && !confused;
        if (stale) {
            await docrt();
            await pline(`You sense a lack of ${what} nearby.`);
            if (sobj && sobj.blessed) {
                if (!u.uedibility)
                    await pline(`Your ${body_part_dt(NOSE_DT)} starts to tingle.`);
                u.uedibility = 1;
            }
        } else if (sobj) {
            const buf = `Your ${body_part_dt(NOSE_DT)} twitches${
                (sobj.blessed && !u.uedibility) ? " then starts to tingle" : ""}.`;
            if (sobj.blessed && !u.uedibility) {
                const savebeginner = g.flags.beginner;

                g.flags.beginner = false; /* prevent non-delivery of message */
                await strange_feeling_dt(sobj, buf);
                g.flags.beginner = savebeginner;
                u.uedibility = 1;
            } else
                await strange_feeling_dt(sobj, buf);
        }
        return !stale ? 1 : 0;
    } else if (!ct) {
        g.known = true;
        await pline(`You ${sobj ? "smell" : "sense"} ${what} nearby.`);
        if (sobj && sobj.blessed) {
            if (!u.uedibility)
                await pline(`Your ${body_part_dt(NOSE_DT)} starts to tingle.`);
            u.uedibility = 1;
        }
    } else {
        let temp;
        let ter_typ = TER_DETECT_DT | TER_OBJ;

        g.known = true;
        await cls_dt();
        unconstrain_map();
        for (const obj of g.level.objects || [])
            if (obj.where === 'OBJ_FLOOR' && (temp = o_in(obj, oclass)) != null) {
                if (temp !== obj) {
                    temp.ox = obj.ox;
                    temp.oy = obj.oy;
                }
                map_object(temp, 1);
            }
        for (let mtmp = g.fmon; mtmp; mtmp = mtmp.nmon) {
            if (mtmp.mhp < 1 || (mtmp.isgd && !mtmp.mx))
                continue;
            for (const obj of minvent_dt(mtmp))
                if ((temp = o_in(obj, oclass)) != null) {
                    temp.ox = mtmp.mx;
                    temp.oy = mtmp.my;
                    map_object(temp, 1);
                    break; /* skip rest of this monster's inventory */
                }
        }
        if (!ctu) {
            newsym(u.ux, u.uy);
            ter_typ |= TER_MON; /* for autodescribe of self */
        }
        if (sobj) {
            if (sobj.blessed) {
                await pline(`Your ${body_part_dt(NOSE_DT)} ${
                    u.uedibility ? "continues" : "starts"} to tingle and you smell ${what}.`);
                u.uedibility = 1;
            } else
                await pline(`Your ${body_part_dt(NOSE_DT)} tingles and you smell ${what}.`);
        } else
            await pline(`You sense ${what}.`);
        await exercise(A_WIS_DT, true);

        await browse_map(ter_typ, "food");

        await map_redisplay();
    }
    return 0;
}

// C ref: detect.c object_detect()
/*
 * Used for scrolls, potions, spells, and crystal balls.  Returns:
 *
 *      1 - nothing was detected
 *      0 - something was detected
 */
export async function object_detect(detector, /* object doing the detecting */
                                    oclass) { /* an object class, 0 for all */
    const g = game, u = g.u;
    let x, y;
    let stuff;
    const is_cursed = !!(detector && detector.cursed);
    const do_dknown = !!(detector && (detector.oclass === POTION_CLASS_DT
                                      || detector.oclass === SPBOOK_CLASS_DT)
                         && detector.blessed);
    let ct = 0, ctu = 0;
    let obj, otmp = null;
    let mtmp;
    let sym, boulder = 0, ter_typ = TER_DETECT_DT | TER_OBJ;

    if (oclass < 0 || oclass >= MAXOCLASSES_DT) {
        impossible(`object_detect:  illegal class ${oclass}`);
        oclass = 0;
    }

    /* Special boulder symbol check - does the class symbol happen
     * to match showsyms[SYM_BOULDER + SYM_OFF_X] which is user-defined.
     * If so, that means we aren't sure what they really wanted to
     * detect. Rather than trump anything, show both possibilities.
     * We can exclude checking the buried obj chain for boulders below.
     */
    sym = oclass ? def_oc_syms_dt[oclass] : 0;
    /* gs.showsyms[SYM_BOULDER + SYM_OFF_X]: no boulder symbol override,
       so the default def_oc_syms[ROCK_CLASS].sym */
    if (sym && sym === def_oc_syms_dt[ROCK_CLASS_DT])
        boulder = ROCK_CLASS_DT;

    if (Hallucination_dt() || (Confusion() && oclass === SCROLL_CLASS_DT))
        stuff = "something";
    else
        stuff = oclass ? def_oc_names_dt[oclass] : "objects";
    if (boulder && oclass !== ROCK_CLASS_DT)
        stuff += " and/or large stones";

    if (do_dknown)
        for (obj of objchain_dt(g.invent))
            observe_recursively(obj);

    for (obj of fobj_dt()) {
        if ((!oclass && !boulder) || o_in(obj, oclass) || o_in(obj, boulder)) {
            if (u_at_dt(obj.ox, obj.oy))
                ctu++;
            else
                ct++;
        }
        if (do_dknown)
            observe_recursively(obj);
    }

    for (obj of objchain_dt(g.level.buriedobjlist || [])) {
        if (!oclass || o_in(obj, oclass)) {
            if (u_at_dt(obj.ox, obj.oy))
                ctu++;
            else
                ct++;
        }
        if (do_dknown)
            observe_recursively(obj);
    }

    if (u.usteed)
        u.usteed.mx = u.ux, u.usteed.my = u.uy;

    for (mtmp = g.fmon; mtmp; mtmp = mtmp.nmon) {
        if (DEADMONSTER_dt(mtmp) || (mtmp.isgd && !mtmp.mx))
            continue;
        for (obj of minvent_dt(mtmp)) {
            if ((!oclass && !boulder) || o_in(obj, oclass)
                || o_in(obj, boulder))
                ct++;
            if (do_dknown)
                observe_recursively(obj);
        }
        if ((is_cursed && M_AP_TYPE_DT(mtmp) === M_AP_OBJECT_DT
             && (!oclass || oclass === objects_dt[mtmp.mappearance].oc_class))
            || (findgold_dt(mtmp.minvent) && (!oclass || oclass === COIN_CLASS_DT))) {
            ct++;
            break;
        }
    }

    if (!clear_stale_map(!oclass ? ALL_CLASSES_DT : oclass, 0) && !ct) {
        if (!ctu) {
            if (detector)
                await strange_feeling_dt(detector, "You feel a lack of something.");
            return 1;
        }
        await pline(`You sense ${stuff} nearby.`);
        return 0;
    }

    await cls_dt();

    unconstrain_map();
    /*
     *  Map all buried objects first.
     */
    for (obj of objchain_dt(g.level.buriedobjlist || []))
        if (!oclass || (otmp = o_in(obj, oclass)) != null) {
            if (oclass) {
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
            for (obj of objects_at_dt(x, y))
                if ((!oclass && !boulder) || (otmp = o_in(obj, oclass)) != null
                    || (otmp = o_in(obj, boulder)) != null) {
                    if (oclass || boulder) {
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
    for (mtmp = g.fmon; mtmp; mtmp = mtmp.nmon) {
        if (DEADMONSTER_dt(mtmp) || (mtmp.isgd && !mtmp.mx))
            continue;
        for (obj of minvent_dt(mtmp))
            if ((!oclass && !boulder) || (otmp = o_in(obj, oclass)) != null
                || (otmp = o_in(obj, boulder)) != null) {
                if (!oclass && !boulder)
                    otmp = obj;
                otmp.ox = mtmp.mx; /* at monster location */
                otmp.oy = mtmp.my;
                map_object(otmp, 1);
                break;
            }
        /* Allow a mimic to override the detected objects it is carrying. */
        if (is_cursed && M_AP_TYPE_DT(mtmp) === M_AP_OBJECT_DT
            && (!oclass || oclass === objects_dt[mtmp.mappearance].oc_class)) {
            /* temp = cg.zeroobj */
            const temp = {
                otyp: mtmp.mappearance, /* needed for obj_to_glyph() */
                oclass: 0, dknown: 0, where: 'OBJ_FREE',
                quan: 1,
                ox: mtmp.mx,
                oy: mtmp.my,
                /* used for mimicking a corpse or statue */
                corpsenm: (MCORPSENM_DT(mtmp) !== -1 /* has_mcorpsenm(mtmp) */)
                          ? MCORPSENM_DT(mtmp) : PM_TENGU_DT,
            };
            map_object(temp, 1);
        } else if (findgold_dt(mtmp.minvent)
                   && (!oclass || oclass === COIN_CLASS_DT)) {
            /* gold = cg.zeroobj; ensure oextra is cleared too */
            const gold = { otyp: GOLD_PIECE_DT, oclass: 0, dknown: 0 };
            gold.quan = rnd(10); /* usually more than 1 */
            gold.ox = mtmp.mx;
            gold.oy = mtmp.my;
            map_object(gold, 1);
        }
    }
    if (!glyph_is_object_dt(glyph_at(u.ux, u.uy))) {
        newsym(u.ux, u.uy);
        ter_typ |= TER_MON;
    }
    await pline(`You detect the ${ct ? "presence" : "absence"} of ${stuff}.`);

    if (!ct)
        await tty_display_map_nhwindow_dt(true); /* display_nhwindow(WIN_MAP, TRUE) */
    else
        await browse_map(ter_typ, "object");

    await map_redisplay();
    return 0;
}

// C ref: detect.c map_monst()
/* show a monster on the map (for detection) */
function map_monst(mtmp, showtail) {
    const g = game;
    if (def_monsyms_dt[mtmp.data.mlet] === ' ')
        throw new Error('map_monst(): detected_mon_to_glyph() not ported yet');
    /* mtmp->mtame ? pet_to_glyph(mtmp, newsym_rn2)
                   : mon_to_glyph(mtmp, newsym_rn2) */
    const ptr = Hallucination_dt() ? mons_dt[rn2_on_display_rng_dt(NUMMONS_DT)]
                                   : mtmp.data;
    const attr = (mtmp.mtame && !Hallucination_dt() && g.iflags?.wc_hilite_pet)
                 ? g.iflags.wc2_petattr : 0;
    show_glyph_cell_dt(mtmp.mx, mtmp.my, def_monsyms_dt[ptr.mlet] ?? '?',
                       ptr.mcolor ?? NO_COLOR, false, attr, 'mon', false,
                       { mndx: ptr.pmidx });

    if (showtail && mtmp.data === mons_dt[PM_LONG_WORM_DT] && mtmp.wormno)
        throw new Error('map_monst(): detect_wsegs() not ported yet');
}

// C ref: detect.c monster_detect()
/*
 * Used by: crystal balls, potions, fountains
 *
 * Returns 1 if nothing was detected.
 * Returns 0 if something was detected.
 */
export async function monster_detect(otmp, /* detecting object (if any) */
                                     mclass) { /* monster class, 0 for all */
    const g = game, u = g.u;
    let mtmp;
    let mcnt = 0;

    /* Note: This used to just check fmon for a non-zero value
     * but in versions since 3.3.0 fmon can test TRUE due to the
     * presence of dmons, so we have to find at least one
     * with positive hit-points to know for sure.
     */
    for (mtmp = g.fmon; mtmp; mtmp = mtmp.nmon) {
        if (mtmp.mhp < 1 || (mtmp.isgd && !mtmp.mx))
            continue;
        ++mcnt;
        break; /* no need for full count, just 1 or more vs 0 */
    }

    if (!mcnt) {
        if (otmp)
            await strange_feeling_dt(otmp, Hallucination_dt()
                                           ? "You get the heebie jeebies."
                                           : "You feel threatened.");
        return 1;
    } else {
        let woken = false;
        const swallowed = u.uswallow; /* before unconstrain_map() */

        await cls_dt();
        const unconstrained = unconstrain_map();
        for (mtmp = g.fmon; mtmp; mtmp = mtmp.nmon) {
            if (mtmp.mhp < 1 || (mtmp.isgd && !mtmp.mx))
                continue;
            if (!mclass || mtmp.data.mlet === mclass
                || (mtmp.data === mons_dt[PM_LONG_WORM_DT]
                    && mclass === S_WORM_TAIL_DT))
                map_monst(mtmp, true);

            if (otmp && otmp.cursed
                && (mtmp.msleeping || !mtmp.mcanmove)) { /* helpless() */
                mtmp.msleeping = mtmp.mfrozen = 0;
                mtmp.mcanmove = 1;
                woken = true;
            }
        }
        if (!swallowed) /* display_self() */
            show_glyph_cell_dt(u.ux, u.uy, '@', CLR_WHITE_DT, false, 0, 'mon');
        await pline("You sense the presence of monsters.");
        if (woken)
            await pline("Monsters sense the presence of you.");

        if ((otmp && otmp.blessed) && !unconstrained) {
            /* persistent detection--just show updated map */
            throw new Error('monster_detect(): display_nhwindow(WIN_MAP, TRUE) not ported yet');
        } else {
            /* one-shot detection--allow player to move cursor around and
               get autodescribe feedback */
            const p = u.uprops[DETECT_MONSTERS_DT];
            p.extrinsic |= I_SPECIAL_DT;
            await browse_map(TER_DETECT_DT | TER_MON, "monster of interest");
            p.extrinsic &= ~I_SPECIAL_DT;
        }

        await map_redisplay();
    }
    return 0;
}


/* C ref: detect.c static struct trap dummytrap */
const dummytrap = { ttyp: 0, tx: 0, ty: 0, tseen: 0 };

// C ref: detect.c sense_trap()
function sense_trap(trap, x, y, src_cursed) {
    if (Hallucination_dt() || src_cursed) {
        const obj = { oclass: 0, dknown: 0 }; /* fake object: cg.zeroobj */

        if (trap) {
            obj.ox = trap.tx;
            obj.oy = trap.ty;
        } else {
            obj.ox = x;
            obj.oy = y;
        }
        /* random_object(rn2) */
        obj.otyp = !Hallucination_dt() ? GOLD_PIECE_DT
                   : rn2_fnptr(NUM_OBJECTS_DT - FIRST_OBJECT_DT) + FIRST_OBJECT_DT;
        obj.quan = ((obj.otyp === GOLD_PIECE_DT) ? rnd(10)
                    : objects_dt[obj.otyp].oc_merge ? rnd(2) : 1);
        obj.corpsenm = rn2_fnptr(NUMMONS_DT); /* random_monster(rn2); if otyp == CORPSE */
        map_object(obj, 1);
    } else if (trap) {
        map_trap(trap, 1);
        trap.tseen = 1;
    } else {
        /*
         * OBSOLETE; this was for trapped door or trapped chest
         * but those are handled by 'if (trap) {map_trap()}' now
         * and this block of code shouldn't be reachable anymore.
         */
        dummytrap.tx = x;
        dummytrap.ty = y;
        dummytrap.ttyp = BEAR_TRAP_DT; /* some kind of trap */
        map_trap(dummytrap, 1);
    }
}

const OTRAP_NONE = 0;  /* nothing found */
const OTRAP_HERE = 1;  /* found at hero's location */
const OTRAP_THERE = 2; /* found at any other location */

// C ref: detect.c detect_obj_traps()
/* check a list of objects for chest traps; return 1 if found at <ux,uy>,
   2 if found at some other spot, 3 if both, 0 otherwise; optionally
   update the map to show where such traps were found */
async function detect_obj_traps(objlist, show_them,
                                how, /* 1 for misleading map feedback */
                                ft) { /* being called by findone() when non-Null */
    let x, y, result = OTRAP_NONE;

    /*
     * TODO?  Display locations of unarmed land mine and beartrap objects.
     * If so, should they be displayed as objects or as traps?
     */

    dummytrap.ttyp = TRAPPED_CHEST;
    const trapglyph = ft ? trap_to_glyph(dummytrap) : null; /* GLYPH_NOTHING */
    for (const otmp of objchain_dt(objlist)) {
        x = y = 0; /* lint suppression */
        if ((Is_box(otmp) && otmp.otrapped) || Has_contents(otmp)) {
            /* !get_obj_location and !isok should both be impossible here */
            const loc = get_obj_location_dt(otmp, BURIED_TOO_DT | CONTAINED_TOO_DT);
            if (loc)
                [x, y] = loc;
            if (!loc || !isok(x, y)
                || (ft && (x !== ft.ft_cc.x || y !== ft.ft_cc.y)))
                continue;
        }
        if (Is_box(otmp) && otmp.otrapped) {
            otmp.tknown = 1;
            observe_object_dt(otmp, Hallucination_dt());
            result |= (x === game.u.ux && y === game.u.uy) ? OTRAP_HERE : OTRAP_THERE;
            if (ft) {
                await flash_glyph_at(x, y, trapglyph, FOUND_FLASH_COUNT);
            }
            if (show_them) {
                dummytrap.tx = x, dummytrap.ty = y;
                sense_trap(dummytrap, x, y, how);
            }
            if (ft) {
                foundone(x, y, trapglyph);
                ft.num_traps++;
            }
        }
        if (Has_contents(otmp))
            result |= await detect_obj_traps(otmp.cobj, show_them, how, ft);
    }
    return result;
}

// C ref: detect.c display_trap_map()
async function display_trap_map(cursed_src) {
    const g = game, u = g.u;
    let ter_typ = TER_DETECT_DT | (cursed_src ? TER_OBJ : TER_TRP);

    await cls_dt();

    unconstrain_map();
    /* show chest traps first, first buried chests then floor chests, so
       that subsequent floor trap display will override if both types are
       present at the same location */
    await detect_obj_traps(g.level.buriedobjlist || [], true, cursed_src, null);
    await detect_obj_traps(fobj_dt(), true, cursed_src, null);
    for (let mon = g.fmon; mon; mon = mon.nmon) {
        if (DEADMONSTER_dt(mon) || (mon.isgd && !mon.mx))
            continue;
        await detect_obj_traps(mon.minvent, true, cursed_src, null);
    }
    await detect_obj_traps(g.invent, true, cursed_src, null);

    for (const ttmp of g.level.traps || [])
        sense_trap(ttmp, 0, 0, cursed_src);

    dummytrap.ttyp = TRAPPED_DOOR;
    for (let door = 0; door < (g.level.doorindex || 0); door++) {
        const cc = g.level.doors[door];
        const lev = g.level.at(cc.x, cc.y);
        if (lev.typ === SDOOR) /* can't be trapped; see above */
            continue;
        if ((lev.doormask || 0) & D_TRAPPED_DT) {
            dummytrap.tx = cc.x, dummytrap.ty = cc.y;
            sense_trap(dummytrap, cc.x, cc.y, cursed_src);
        }
    }

    /* redisplay hero unless sense_trap() revealed something at <ux,uy> */
    const glyph = glyph_at(u.ux, u.uy);
    if (!(g_kind(glyph) === 'trap' || g_kind(glyph) === 'obj')) {
        newsym(u.ux, u.uy);
        ter_typ |= TER_MON; /* for autodescribe at <u.ux,u.uy> */
    }
    await You_feel_dt(`${cursed_src ? "very greedy" : "entrapped"}.`);

    await browse_map(ter_typ, cursed_src ? "gold" : "trap of interest");

    await map_redisplay();
}

// C ref: detect.c trap_detect()
/* the detections are pulled out so they can
 * also be used in the crystal ball routine
 * returns 1 if nothing was detected
 * returns 0 if something was detected
 */
export async function trap_detect(sobj) { /* Null if crystal ball, scroll if gold detection */
    const g = game, u = g.u;
    let tr;
    const cursed_src = (sobj && sobj.cursed) ? 1 : 0;
    let found = false;

    if (u.usteed)
        u.usteed.mx = u.ux, u.usteed.my = u.uy;

    /* floor/ceiling traps */
    for (const ttmp of g.level.traps || []) {
        if (ttmp.tx !== u.ux || ttmp.ty !== u.uy) {
            await display_trap_map(cursed_src);
            return 0;
        }
        found = true;
    }
    /* chest traps (might be buried or carried) */
    if ((tr = await detect_obj_traps(fobj_dt(), false, 0, null)) !== OTRAP_NONE) {
        if (tr & OTRAP_THERE) {
            await display_trap_map(cursed_src);
            return 0;
        }
        found = true;
    }
    if ((tr = await detect_obj_traps(g.level.buriedobjlist || [], false, 0, null))
        !== OTRAP_NONE) {
        if (tr & OTRAP_THERE) {
            await display_trap_map(cursed_src);
            return 0;
        }
        found = true;
    }
    for (let mon = g.fmon; mon; mon = mon.nmon) {
        if (DEADMONSTER_dt(mon) || (mon.isgd && !mon.mx))
            continue;
        if ((tr = await detect_obj_traps(mon.minvent, false, 0, null))
            !== OTRAP_NONE) {
            if (tr & OTRAP_THERE) {
                await display_trap_map(cursed_src);
                return 0;
            }
            found = true;
        }
    }
    if (await detect_obj_traps(g.invent, false, 0, null) !== OTRAP_NONE)
        found = true;
    /* door traps */
    for (let door = 0; door < (g.level.doorindex || 0); door++) {
        const cc = g.level.doors[door];
        const lev = g.level.at(cc.x, cc.y);
        /* levl[][].doormask and .wall_info both overlay levl[][].flags;
           the bit in doormask for D_TRAPPED is also a bit in wall_info;
           secret doors use wall_info so can't be marked as trapped */
        if (lev.typ === SDOOR)
            continue;
        if ((lev.doormask || 0) & D_TRAPPED_DT) {
            if (cc.x !== u.ux || cc.y !== u.uy) {
                await display_trap_map(cursed_src);
                return 0;
            }
            found = true;
        }
    }
    if (!found) {
        const buf = `Your ${makeplural_dt(body_part_dt(TOE_DT))} stop itching.`;
        await strange_feeling_dt(sobj, buf);
        return 1;
    }
    /* traps exist, but only under me - no separate display required */
    await pline(`Your ${makeplural_dt(body_part_dt(TOE_DT))} itch.`);
    return 0;
}

// C ref: detect.c show_map_spot()
/* used by magic mapping, clairvoyance, and wand of probing */
export function show_map_spot(x, y, cnf) {
    let t, ep;

    if (cnf && rn2(7))
        return;
    const lev = game.level.at(x, y);

    lev.seenv = SVALL;

    /* Secret corridors are found, but not secret doors. */
    if (lev.typ === SCORR) {
        lev.typ = CORR;
        unblock_point(x, y);
    }

    /*
     * Force the real background, then if it's not furniture and there's
     * a known trap there, display the trap, else if there was an object
     * shown there, redisplay the object.  So during mapping, furniture
     * takes precedence over traps, which take precedence over objects,
     * opposite to how normal vision behaves.
     */
    const oldglyph = glyph_at(x, y);
    if (game.level.flags?.hero_memory) {
        magic_map_background(x, y, 0);
        newsym(x, y); /* show it, if not blocked */
    } else {
        magic_map_background(x, y, 1); /* display it */
    }
    if (!IS_FURNITURE(lev.typ)) {
        if ((t = t_at(x, y)) && t.tseen) {
            map_trap(t, 1);
        } else if ((ep = engr_at(x, y)) && !cnf) {
            map_engraving(ep, 1);
        } else if (g_kind(oldglyph) === 'trap' || g_kind(oldglyph) === 'obj') {
            show_glyph(x, y, oldglyph);
            if (game.level.flags?.hero_memory)
                lev.remembered_glyph = glyph_at_to_remembered(oldglyph);
        }
    }
    /* possibly update #overview */
    if (!cnf && (lev.roomno || 0) >= ROOMOFFSET)
        room_discovered(lev.roomno - ROOMOFFSET);
}

// C ref: detect.c do_mapping()
export async function do_mapping() {
    let zx, zy;

    const unconstrained = unconstrain_map();
    for (zx = 1; zx < COLNO; zx++)
        for (zy = 0; zy < ROWNO; zy++)
            show_map_spot(zx, zy, Confusion());

    if (!game.level.flags?.hero_memory || unconstrained) {
        await flush_screen(1);                 /* flush temp screen */
        /* browse_map() instead of display_nhwindow(WIN_MAP, TRUE) */
        await browse_map(TER_DETECT_DT | TER_MAP | TER_TRP | TER_OBJ,
                         "anything of interest");
        await map_redisplay(); /* calls reconstrain_map() and docrt() */
    } else {
        /* we only get here when unconstrained is False, so reconstrain_map
           will be a no-op; call it anyway */
        reconstrain_map();
    }
    await exercise(A_WIS, true);
}

/* C ref: detect.c FOUND_FLASH_COUNT */
const FOUND_FLASH_COUNT = 6;

// C ref: detect.c foundone()
/* update the map for something which has just been found by wand of secret
   door detection or wizard mode ^E; will be called multiple times during a
   single operation if multiple things of interest are discovered */
function foundone(zx, zy, glyph) {
    /* glyph_is_cmap(glyph) || glyph_is_unexplored(glyph) */
    if (g_kind(glyph) === 'cmap')
        game.level.at(zx, zy).seenv = SVALL;

    {
        const save_viz = game.viz_array[zy][zx];

        if (!Blind())
            game.viz_array[zy][zx] = COULD_SEE_DT | IN_SIGHT_DT;
        newsym(zx, zy);
        game.viz_array[zy][zx] = save_viz;
    }
    /* FOUND_FLASH_COUNT != 0: no tmp_at() */
}

// C ref: detect.c findone()
/* find something at one location; this should find all somethings there
   since it is used for magical detection rather than physical searching */
async function findone(zx, zy, found_p) {
    const u = game.u;
    const lev = game.level.at(zx, zy);
    const ttmp = t_at(zx, zy);
    let mtmp = m_at(zx, zy);

    if (mtmp && (DEADMONSTER_dt(mtmp) || (mtmp.isgd && !mtmp.mx)))
        mtmp = null;
    found_p.ft_cc.x = zx; /* needed by detect_obj_traps() */
    found_p.ft_cc.y = zy;

    if (lev.typ === SDOOR) {
        const sym = lev.horizontal ? 16 /* S_hcdoor */ : 15 /* S_vcdoor */;

        await flash_glyph_at(zx, zy, cmap_to_glyph(sym), FOUND_FLASH_COUNT);
        cvt_sdoor_to_door(lev); /* set lev->typ = DOOR */
        recalc_block_point(zx, zy);
        magic_map_background(zx, zy, 0);
        foundone(zx, zy, back_to_glyph(zx, zy));
        found_p.num_sdoors++;
    } else if (lev.typ === SCORR) {
        await flash_glyph_at(zx, zy, cmap_to_glyph(22 /* S_corr */), FOUND_FLASH_COUNT);
        lev.typ = CORR;
        unblock_point(zx, zy);
        magic_map_background(zx, zy, 0);
        foundone(zx, zy, cmap_to_glyph(22 /* S_corr */));
        found_p.num_scorrs++;
    }

    if (ttmp && !ttmp.tseen
        /* [shouldn't successful 'find' reveal and activate statue traps?] */
        && ttmp.ttyp !== STATUE_TRAP) {
        await flash_glyph_at(zx, zy, trap_to_glyph(ttmp), FOUND_FLASH_COUNT);
        ttmp.tseen = 1;
        sense_trap(ttmp, zx, zy, 0); /* handles Hallucination */
        foundone(zx, zy, trap_to_glyph(ttmp));
        found_p.num_traps++;
    }
    if (closed_door_dt(zx, zy) && ((lev.doormask || 0) & D_TRAPPED_DT) !== 0) {
        dummytrap.ttyp = TRAPPED_DOOR;
        dummytrap.tx = zx, dummytrap.ty = zy;
        await flash_glyph_at(zx, zy, trap_to_glyph(dummytrap), FOUND_FLASH_COUNT);
        dummytrap.tseen = 1;
        sense_trap(dummytrap, zx, zy, 0); /* handles Hallucination */
        foundone(zx, zy, trap_to_glyph(dummytrap));
        found_p.num_traps++;
    }
    /* trapped chests */
    await detect_obj_traps(game.level.buriedobjlist || [], true, 0, found_p);
    await detect_obj_traps(fobj_dt(), true, 0, found_p);
    if (mtmp)
        await detect_obj_traps(mtmp.minvent, true, 0, found_p);
    if (zx === u.ux && zy === u.uy)
        await detect_obj_traps(game.invent, true, 0, found_p);

    if (mtmp && (!canspotmon(mtmp) || mtmp.mundetected || mtmp.m_ap_type)) {
        if (mtmp.m_ap_type) { /* M_AP_TYPE(mtmp) */
            await flash_glyph_at(zx, zy, mon_to_glyph(mtmp, rn2_on_display_rng_dt),
                                 FOUND_FLASH_COUNT);
            seemimic(mtmp);
            /*foundone(zx, zy, mon_to_glyph(mtmp, rn2_on_display_rng);*/
            found_p.num_mons++;
        } else if (mtmp.mundetected && (is_hider(mtmp.data)
                                        || hides_under(mtmp.data)
                                        || mtmp.data.mlet === S_EEL)) {
            await flash_glyph_at(zx, zy, mon_to_glyph(mtmp, rn2_on_display_rng_dt),
                                 FOUND_FLASH_COUNT);
            mtmp.mundetected = 0;
            /*foundone(zx, zy, mon_to_glyph(mtmp, rn2_on_display_rng);*/
            newsym(zx, zy);
            found_p.num_mons++;
        }
        if (!glyph_is_invisible(lev.remembered_glyph)) {
            if (!canspotmon(mtmp)) {
                await flash_glyph_at(zx, zy, GLYPH_INVISIBLE, FOUND_FLASH_COUNT);
                map_invisible(zx, zy);
                found_p.num_invis++;
            }
        } else {
            found_p.num_kept_invis++;
        }
    } else if (unmap_invisible(zx, zy)) {
        /* flash the invisible monster glyph because it is already gone */
        await flash_glyph_at(zx, zy, GLYPH_INVISIBLE, FOUND_FLASH_COUNT);
        found_p.num_cleared_invis++;
    }
}

// C ref: detect.c openone()
async function openone(zx, zy, num_p) {
    const lev = game.level.at(zx, zy);
    let ttmp;

    if (objects_at_dt(zx, zy).length) { /* OBJ_AT(zx, zy) */
        for (const otmp of objects_at_dt(zx, zy)) {
            if (Is_box(otmp) && otmp.olocked) {
                otmp.olocked = 0;
                num_p.v++;
            }
        }
        /* let it fall to the next cases. could be on trap. */
    }
    /* note: secret doors can't be trapped; they use levl[][].wall_info;
       see rm.h for the troublesome overlay of doormask and wall_info */
    if (lev.typ === SDOOR
        || (lev.typ === DOOR && ((lev.doormask || 0) & (D_CLOSED | D_LOCKED)))) {
        if (lev.typ === SDOOR)
            cvt_sdoor_to_door(lev); /* .typ = DOOR */
        if (lev.doormask & D_TRAPPED_DT)
            throw new Error('openone(): trapped door explosion (b_trapped()) not ported yet');
        else
            lev.doormask = D_ISOPEN_DT;
        unblock_point(zx, zy);
        newsym(zx, zy);
        num_p.v++;
    } else if (lev.typ === SCORR) {
        lev.typ = CORR;
        unblock_point(zx, zy);
        newsym(zx, zy);
        num_p.v++;
    } else if ((ttmp = t_at(zx, zy)) != null) {
        if (!ttmp.tseen && ttmp.ttyp !== STATUE_TRAP) {
            ttmp.tseen = 1;
            newsym(zx, zy);
            num_p.v++;
        }
        const mon = (zx === game.u.ux && zy === game.u.uy) ? game.youmonst /* u_at() */
                    : m_at(zx, zy);
        const dummy = { v: false };
        if (await openholdingtrap(mon, dummy)
            || await openfallingtrap(mon, true, dummy))
            num_p.v++;
    } else if (find_drawbridge_dt(zx, zy)) {
        throw new Error('openone(): open_drawbridge() not ported yet');
    }
}

// C ref: detect.c findit()
/* returns number of things found */
export async function findit() {
    const u = game.u;
    let num = 0;
    let buf;

    /*
     *  findit() -> do_clear_area(findone) -> findone() -> foundone()
     *  is used to notify player where various things have been found.
     *  Changing FOUND_FLASH_COUNT to 0 will switch to tmp_at() to
     *  highlight all discoveries for the current operation, but requires
     *  player to respond to --More-- when done.  Neither allows browsing
     *  the map via getpos() autodescribe (until after it has reverted to
     *  normal display, where found traps might be covered by objects).
     */

    if (u.uswallow)
        return 0;

    const found = { num_sdoors: 0, num_scorrs: 0, num_traps: 0, num_mons: 0,
                    num_invis: 0, num_cleared_invis: 0, num_kept_invis: 0,
                    ft_cc: { x: 0, y: 0 } };
    await do_clear_area_async(u.ux, u.uy, BOLT_LIM_DT, findone, found);
    /* count that controls "reveal" punctuation; 0..4 */
    const k = (found.num_sdoors ? 1 : 0) + (found.num_scorrs ? 1 : 0)
              + (found.num_traps ? 1 : 0) + (found.num_mons ? 1 : 0);

    buf = '';
    if (found.num_sdoors) {
        if (found.num_sdoors > 1)
            buf += `${found.num_sdoors} secret doors`;
        else
            buf += "a secret door";
        num += found.num_sdoors;
    }
    /* note: non-\0 *buf implies that at least one previous type is present */
    if (found.num_scorrs) {
        if (buf) /* "doors and corrs" or "doors, corrs ..." */
            buf += (k === 2) ? " and " : ", ";
        if (found.num_scorrs > 1)
            buf += `${found.num_scorrs} secret corridors`;
        else
            buf += "a secret corridor";
        num += found.num_scorrs;
    }
    if (found.num_traps) {
        if (buf) /* "doors, corrs, and traps" or "{doors|corrs} and traps"
                  * or "..., traps ..." */
            buf += (k === 3 && !found.num_mons) ? ", and "
                   : (k === 2) ? " and " : ", ";
        if (found.num_traps > 1)
            buf += `${found.num_traps} traps`;
        else
            buf += "a trap";
        num += found.num_traps;
    }

    if (found.num_mons) {
        if (buf)
            buf += (k > 2) ? ", and " : " and ";
        if (found.num_mons > 1)
            buf += `${found.num_mons} hidden monsters`;
        else
            buf += "a hidden monster";
        num += found.num_mons;
    }
    if (buf)
        await pline(`You reveal ${buf}!`);

    if (found.num_invis) {
        if (found.num_invis > 1)
            buf = `${found.num_invis}${found.num_kept_invis ? " other" : ""} unseen monsters`;
        else
            buf = `${found.num_kept_invis ? "another" : "an"} unseen monster`;
        await pline(`You detect ${buf}!`);
        num += found.num_invis;
    }

    if (found.num_cleared_invis) {
        /* at least 1 "remembered, unseen monster" marker has been removed */
        if (!num)
            await You_feel_dt(`${found.num_kept_invis ? "somewhat " : ""}less paranoid.`);
        num += found.num_cleared_invis;
    }
    /* note: num_kept_invis is not included in the final result */

    if (!num)
        await pline("You don't find anything.");

    return num;
}

// C ref: detect.c openit()
/* returns number of things found and opened */
export async function openit() {
    const u = game.u;
    const num = { v: 0 };

    if (u.uswallow) {
        /* digests(u.ustuck->data) */
        if (dmgtype_fromattack(u.ustuck.data, AD_DGST, AT_ENGL)) {
            /* purple worm */
            if (Blind())
                await pline("Its mouth opens!");
            else
                await pline(`${Monnam(u.ustuck)} opens its mouth!`);
        }
        await expels(u.ustuck, u.ustuck.data, true);
        return -1;
    }

    await do_clear_area_async(u.ux, u.uy, BOLT_LIM_DT, openone, num);
    return num.v;
}

// C ref: detect.c detecting()
/* callback hack for overriding vision in do_clear_area() */
export function detecting(func) {
    return (func === findone || func === openone);
}

/* C ref: vision.h COULD_SEE, IN_SIGHT */
const COULD_SEE_DT = 0x1, IN_SIGHT_DT = 0x2;

/* C ref: detect.c ALL_CLASSES -- wildcard class for clear_stale_map */
const ALL_CLASSES_DT = MAXOCLASSES_DT + 1;
