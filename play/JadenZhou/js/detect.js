// detect.js — detection and searching.
// C ref: detect.c
//
// Ported so far: dosearch0() (not its feel_location()/unmap_invisible()
// parts), mfind0(), warnreveal() and lock.c cvt_sdoor_to_door().

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
import { BOULDER } from './objects.js';
import { m_at } from './makemon.js';
import { canspotmon, sensemon, warning_of, Blind, map_invisible,
         glyph_is_invisible } from './display.js';
import { tty_display_nhwindow } from './wintty.js';
import { seemimic } from './mon.js';
import { y_monnam, a_monnam } from './do_name.js';
import { cmd_safety_prevention } from './hack.js';
import { S_EEL, M1_HIDE, M1_CONCEAL } from './monsters.js';

// C ref: mondata.h is_hider(), hides_under()
function is_hider(ptr) { return (ptr.mflags1 & M1_HIDE) !== 0; }
function hides_under(ptr) { return (ptr.mflags1 & M1_CONCEAL) !== 0; }
import { t_at, STATUE_TRAP } from './trap.js';
import {
    A_WIS, SDOOR, SCORR, DOOR, CORR, WM_MASK, D_NODOOR, D_CLOSED, D_LOCKED,
    BLINDED, isok, Is_rogue_level,
} from './const.js';
import { LENSES } from './objects.js';

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
        exercise(A_WIS, true);
        if (!canspotmon(mtmp)) {
            map_invisible(x, y);
            /* set_msg_xy(x, y) */
            await pline("You feel an unseen monster!");
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
        const Blind = u.uprops[BLINDED].intrinsic || u.uprops[BLINDED].extrinsic;

        if (g.ublindf && g.ublindf.otyp === LENSES && !Blind)
            fund += 2; /* JDS: lenses help searching */
        if (fund > 5)
            fund = 5;
        for (x = u.ux - 1; x < u.ux + 2; x++)
            for (y = u.uy - 1; y < u.uy + 2; y++) {
                if (!isok(x, y))
                    continue;
                if (x === u.ux && y === u.uy)
                    continue;

                if (!aflag && (Blind /* || visible_region_at(x, y) */))
                    throw new Error('dosearch0(): feel_location() not ported yet');
                const lev = g.level.at(x, y);
                if (lev.typ === SDOOR) {
                    if (rnl(7 - fund))
                        continue;
                    cvt_sdoor_to_door(lev); /* .typ = DOOR */
                    recalc_block_point(x, y);
                    exercise(A_WIS, true);
                    nomul0();
                    newsym(x, y); /* feel_location(): make sure it shows up */
                    await pline("You find a hidden door.");
                } else if (lev.typ === SCORR) {
                    if (rnl(7 - fund))
                        continue;
                    lev.typ = CORR;
                    recalc_block_point(x, y); /* unblock_point(): vision */
                    exercise(A_WIS, true);
                    nomul0();
                    newsym(x, y); /* feel_newsym(): make sure it shows up */
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
                     * (!aflag && !mtmp && !Blind): unmap_invisible() --
                     * the JS map has no remembered 'I' glyphs yet */

                    if ((trap = t_at(x, y)) && !trap.tseen && !rnl(8)) {
                        nomul0();
                        if (trap.ttyp === STATUE_TRAP) {
                            /* activate_statue_trap(): statue traps aren't
                               created by the JS port yet */
                            throw new Error('dosearch0(): activate_statue_trap() not ported yet');
                        } else {
                            /* find_trap(): the "You find <trap>." message
                               isn't ported yet */
                            trap.tseen = 1;
                            newsym(x, y);
                        }
                    }
                }
            }
    }
    return 1;
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
    const uprop = (p) => !!(u.uprops?.[p]?.intrinsic || u.uprops?.[p]?.extrinsic);

    if ((uprop(HALLUC) || uprop(STUNNED) || uprop(CONFUSION)) && !full) {
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
