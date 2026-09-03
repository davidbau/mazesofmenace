// dogmove.js — pet movement and the eating bookkeeping that goes with it.
// C ref: src/dogmove.c
//
// The file exists now but holds only what has been ported. dog_move itself
// (the pet's per-turn decision, src/dogmove.c around line 1150) is NOT here,
// and it is the first divergence for 7 of the 44 public sessions -- the
// single largest blocker in the port. See docs/plan/STATUS.md for its shape
// and the traps in it (the reservoir sampler at dogmove.c:1255 uses a
// PRE-increment, rn2(++chcnt)).

import { game } from './gstate.js';
import { M_AP_TYPE, M_AP_NOTHING } from './const.js';
import { newsym } from './display.js';
import { MONSYMS } from './monst_data.js';
import { PMNAMES } from './monst_data.js';
import { M_AP_MONSTER } from './const.js';
import { M_AP_FURNITURE } from './const.js';
import { M_AP_OBJECT } from './const.js';
import { LOW_PM } from './const.js';
import { DISMOUNT_POLY } from './const.js';
import { Mgender } from './const.js';
import { something } from './const.js';
import { TOPLINE_NEED_MORE } from './const.js';
import { cmap_names } from './drawing_data.js';
import { ONAMES } from './objects_data.js';
import { unsolid } from './mondata.js';
import { nolimbs } from './mondata.js';
import { has_head } from './mondata.js';
import { monsndx } from './makemon.js';
import { Protection_from_shape_changers } from './youprop.js';
import { dismount_steed } from './steed.js';
import { y_monnam } from './do_name.js';
import { pmname } from './do_name.js';
import { canspotmon } from './display.js';
import { glyph_at } from './display.js';
import { flush_screen } from './display.js';
import { more } from './display.js';
import { cansee } from './vision.js';
import { defsyms } from './drawing_data.js';
import { OBJ_DESCR } from './objnam.js';
import { OBJ_NAME } from './objnam.js';
import { an } from './objnam.js';
import { m_unleash } from './apply.js';
import { Your } from './pline.js';
import { You } from './pline.js';
import { rn2 } from './rng.js';


































// src/dogmove.c:1448 finish_meating() — the monster stops eating.
//
// Not just a flag clear. A monster that was eating a MIMIC has taken on the
// mimic's appearance, and that appearance has to be reset and the square
// redrawn, or the pet keeps rendering as whatever it was chewing on.
//
// The mlet test excludes real mimics: an actual mimic that stops eating keeps
// its disguise, because the disguise is what it is rather than what it ate.
export function finish_meating(mtmp) {
    mtmp.meating = 0;
    if (M_AP_TYPE(mtmp) !== M_AP_NOTHING
        && game.mons[mtmp.mnum].mlet !== MONSYMS.S_MIMIC) {
        /* was eating a mimic and now appearance needs resetting */
        mtmp.m_ap_type = M_AP_NOTHING;
        mtmp.mappearance = 0;
        newsym(mtmp.mx, mtmp.my);
    }
}

// dog_hunger() is NOT here either. js/dog.js:964 already has it, and
// js/dog.js's dog_move calls that one. A second copy was written here and
// removed; the two were functionally identical (mdat vs ptr, Math.trunc vs
// |0) so dup-defs reported them as DIFFERING on formatting alone. Verified
// the live one against the C before deleting the duplicate: the non-eater
// arm, the mhpmax/3 penalty with its stored delta, and the DEADMONSTER check
// inside that arm are all present.

// dog_move() and its position-scoring loop are NOT here. They already exist
// in js/dog.js (dog_move at :994, ~211 lines, 10 draws, full chcnt and
// uncursedcnt logic) and js/monmove.js:950 calls that one.
//
// A duplicate dog_move plus a standalone dog_scoring_loop were written here
// and then removed: they were less complete than the existing implementation
// and nothing called them. ARCHITECTURALLY dog_move belongs in this file,
// since src/dogmove.c is what it mirrors, but moving a working 211-line
// function to satisfy that is a separate change with its own risk, and the
// existing one is not broken by being in the wrong file.
//
// The real work on the dog_move divergence is DEBUGGING js/dog.js's version,
// not writing a new one. It already draws; it draws differently from C
// somewhere around dogmove.c:1255. See docs/plan/STATUS.md.

/* src/dogmove.c:1425 qm[]: things that some pets might be thinking about
   at the time (mndx 0 means any pet, mlet 0 means any symbol) */
const qm = [
    { mndx: PMNAMES.PM_LITTLE_DOG, mlet: 0, mappearance: PMNAMES.PM_KITTEN, m_ap_type: M_AP_MONSTER },
    { mndx: PMNAMES.PM_DOG, mlet: 0, mappearance: PMNAMES.PM_HOUSECAT, m_ap_type: M_AP_MONSTER },
    { mndx: PMNAMES.PM_LARGE_DOG, mlet: 0, mappearance: PMNAMES.PM_LARGE_CAT, m_ap_type: M_AP_MONSTER },
    { mndx: PMNAMES.PM_KITTEN, mlet: 0, mappearance: PMNAMES.PM_LITTLE_DOG, m_ap_type: M_AP_MONSTER },
    { mndx: PMNAMES.PM_HOUSECAT, mlet: 0, mappearance: PMNAMES.PM_DOG, m_ap_type: M_AP_MONSTER },
    { mndx: PMNAMES.PM_LARGE_CAT, mlet: 0, mappearance: PMNAMES.PM_LARGE_DOG, m_ap_type: M_AP_MONSTER },
    { mndx: PMNAMES.PM_HOUSECAT, mlet: 0, mappearance: PMNAMES.PM_GIANT_RAT, m_ap_type: M_AP_MONSTER },
    { mndx: 0, mlet: MONSYMS.S_DOG, mappearance: cmap_names.S_sink, m_ap_type: M_AP_FURNITURE }, /* sorry, no fire hydrants */
    { mndx: 0, mlet: 0, mappearance: ONAMES.TRIPE_RATION, m_ap_type: M_AP_OBJECT }, /* leave this at end */
];

// src/dogmove.c:1461 mnum_leashable(); variation of leashable() that takes
// a PM_ index
function mnum_leashable(mnum) {
    return ((mnum >= LOW_PM && mnum <= PMNAMES.HIGH_PM)
            && mnum !== PMNAMES.PM_LONG_WORM && !unsolid(game.mons[mnum])
            && (!nolimbs(game.mons[mnum]) || has_head(game.mons[mnum])))
               ? true
               : false;
}

// src/dogmove.c:1472 quickmimic(); a pet that ate a mimic corpse mimics
// something for a while
export async function quickmimic(mtmp) {
    let idx = 0, trycnt = 5, spotted, seeloc;
    const was_leashed = mtmp.mleashed;
    let buf;

    if (Protection_from_shape_changers() || !mtmp.meating)
        return;

    /* with polymorph, the steed's equipment would be re-checked and its
       saddle would come off, triggering DISMOUNT_FELL, but mimicking
       doesn't impact monster's equipment; normally DISMOUNT_POLY is for
       rider taking on an unsuitable shape, but its message works fine
       for this and also avoids inflicting damage during forced dismount;
       do this before changing so that dismount refers to original shape */
    if (mtmp === game.u.usteed)
        await dismount_steed(DISMOUNT_POLY);

    do {
        idx = rn2(qm.length);
        if (qm[idx].mndx !== 0 && monsndx(mtmp.data) === qm[idx].mndx)
            break;
        if (qm[idx].mlet !== 0 && mtmp.data.mlet === qm[idx].mlet)
            break;
        if (qm[idx].mndx === 0 && qm[idx].mlet === 0)
            break;
    } while (--trycnt > 0);
    if (trycnt === 0)
        idx = qm.length - 1;

    buf = y_monnam(mtmp); /* "your <pet>" or "the <mon>" or "Fang" */
    spotted = canspotmon(mtmp);
    seeloc = cansee(mtmp.mx, mtmp.my);

    mtmp.m_ap_type = qm[idx].m_ap_type;
    mtmp.mappearance = qm[idx].mappearance;

    if (spotted || seeloc || canspotmon(mtmp)) {
        const prev_glyph = glyph_at(mtmp.mx, mtmp.my);
        const what = (M_AP_TYPE(mtmp) === M_AP_FURNITURE)
                     ? defsyms[mtmp.mappearance].explain
                     : (M_AP_TYPE(mtmp) === M_AP_OBJECT
                        && OBJ_DESCR(game.objects[mtmp.mappearance]))
                       ? OBJ_DESCR(game.objects[mtmp.mappearance])
                       : (M_AP_TYPE(mtmp) === M_AP_OBJECT
                          && OBJ_NAME(game.objects[mtmp.mappearance]))
                         ? OBJ_NAME(game.objects[mtmp.mappearance])
                         : (M_AP_TYPE(mtmp) === M_AP_MONSTER)
                           ? pmname(game.mons[mtmp.mappearance],
                                    Mgender(mtmp))
                           : something;

        newsym(mtmp.mx, mtmp.my);
        if (was_leashed
            && (M_AP_TYPE(mtmp) !== M_AP_MONSTER
                || !mnum_leashable(mtmp.mappearance))) {
            await Your('leash goes slack.');
            await m_unleash(mtmp, false);
        }
        /* the C compares glyph integers; our glyph_at() returns descriptors */
        if (JSON.stringify(glyph_at(mtmp.mx, mtmp.my)) !== JSON.stringify(prev_glyph))
            await You(`${seeloc ? 'see' : 'sense that'} ${
                (what !== something) ? an(what) : what} ${
                seeloc ? 'appear' : 'has appeared'} where ${buf} was!`);
        else
            await You(`sense that ${buf} feels rather ${what}-ish.`);

        /* display_nhwindow(WIN_MAP, TRUE): flush the map, then a --More-- */
        await flush_screen(0);
        game._toplin = TOPLINE_NEED_MORE;
        await more();
    }
}
