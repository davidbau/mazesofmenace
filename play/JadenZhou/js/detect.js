// detect.js — detection and searching.
// C ref: detect.c
//
// Ported so far: dosearch0() for intrinsic autosearch (aflag != 0) and
// lock.c cvt_sdoor_to_door().  The explicit-search parts (aflag == 0:
// feel_location(), mfind0(), unmap_invisible()) are not ported yet.

import { game } from './gstate.js';
import { rnl } from './rng.js';
import { pline, newsym } from './display.js';
import { vision_reset } from './vision.js';
import { exercise } from './attrib.js';
import { m_at } from './makemon.js';
import { canspotmon } from './display.js';
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

/* C ref: vision.c recalc_block_point(), unblock_point() -- the JS
   vision module keeps no incremental block map yet, so rebuild it */
function recalc_block_point(x, y) {
    void x, y;
    vision_reset();
    game.vision_full_recalc = 1;
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
function mfind0(mtmp, via_warning) {
    const x = mtmp.mx, y = mtmp.my;
    let found_something = false;

    if (via_warning)
        throw new Error('mfind0(): warning not ported yet');

    if (mtmp.m_ap_type) {
        /* seemimic(mtmp) */
        throw new Error('mfind0(): seemimic() not ported yet');
    } else {
        /* this used to only be executed if a !canspotmon() test passed
           but that failed to bring sensed monsters out of hiding */
        found_something = !canspotmon(mtmp);
        if (mtmp.mundetected && (is_hider(mtmp.data)
                                 || hides_under(mtmp.data)
                                 || mtmp.data.mlet === S_EEL)) {
            mtmp.mundetected = 0;
            found_something = true;
        }
        newsym(x, y);
    }

    if (found_something) {
        /* exercise(A_WIS, TRUE); map_invisible(); "You feel an unseen
           monster!" / "You find %s." -- not ported yet */
        throw new Error('mfind0(): finding a hidden monster not ported yet');
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
                        const mfres = mfind0(mtmp, false);

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
