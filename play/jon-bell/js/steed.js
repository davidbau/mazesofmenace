// @ts-nocheck
// steed.js — Riding a steed (monster).
// C ref: steed.c

import { game } from './gstate.js';
import { pline } from './display.js';
import { MONS_NAMES, use_skill } from './uhitm.js';
import { isok, MON_FLOOR, W_SADDLE, P_RIDING } from './const.js';
import { can_saddle } from './makemon.js';
import { mksobj, mpickobj } from './mklev.js';
import { fully_identify_obj } from './cmd.js';
import { update_mon_extrinsics } from './trap.js';
import { describe_level_buf } from './dungeon.js';
import { rn2 } from './rng.js';
import { helpless, y_monnam as y_monnam_real } from './mhitm.js';
import { Monnam } from './mcastu.js';
import { finish_meating } from './dogmove.js';

/* C steed.c:17 — caller has already checked mounted reach and riding skill. */
export async function rider_cant_reach() {
    await pline("You aren't skilled enough to reach from %s.", y_monnam_real(game.u.usteed));
}

/* C steed.c:827-849 maybewakesteed — called before saddling or mounting. */
export async function maybewakesteed(steed) {
    let frozen = steed.mfrozen | 0;
    const wasimmobile = helpless(steed);

    steed.msleeping = 0;
    if (frozen) {
        frozen = Math.trunc((frozen + 1) / 2);
        if (!rn2(frozen)) {
            steed.mfrozen = 0;
            steed.mcanmove = 1;
        } else {
            steed.mfrozen = frozen;
        }
    }
    if (wasimmobile && !helpless(steed))
        await pline('%s wakes up.', Monnam(steed));
    finish_meating(steed);
}

// C do_name.c:y_monnam — "your <mon>" or "the <mon>" with given name exception
function y_monnam(mtmp) {
    if (!mtmp) return 'the ?';
    const givenname = mtmp?.mextra?.mgivenname || mtmp?.mgivenname || '';
    const mndx = (mtmp.mndx ?? mtmp.mnum ?? -1) | 0;
    const species = (mndx >= 0 && mndx < MONS_NAMES.length) ? MONS_NAMES[mndx] : '';

    // C: prefix = mtmp->mtame ? ARTICLE_YOUR : ARTICLE_THE
    const prefix = (mtmp.mtame | 0) ? 'your ' : 'the ';
    // C: suppress_saddle if given name or is u.usteed
    // For simplicity, just use the species name for now
    return prefix + (species || '?');
}

// C do_name.c:YMonnam — y_monnam with first letter capitalized
function YMonnam(mtmp) {
    const s = y_monnam(mtmp);
    return s.charAt(0).toUpperCase() + s.slice(1);
}

// C steed.c:878-895 stucksteed(checkfeeding)
// Decide whether hero's steed is able to move
export function stucksteed(checkfeeding) {
    const steed = game.u.usteed;

    if (steed) {
        // C: helpless(steed) = steed->msleeping || !steed->mcanmove
        if ((steed.msleeping | 0) || !(steed.mcanmove | 0)) {
            pline(`${YMonnam(steed)} won't move!`);
            return true;
        }
        // C: optionally check whether steed is in the midst of a meal
        if (checkfeeding && (steed.meating | 0)) {
            pline(`${YMonnam(steed)} is still eating.`);
            return true;
        }
    }
    return false;
}

/* C steed.c:897-933 place_monster */
export function place_monster(mon, x, y) {
    let buf = "";
    /* normal map bounds are <1..COLNO-1,0..ROWNO-1> but sometimes
       vault guards (either living or dead) are parked at <0,0> */
    if (!isok(x, y) && (x != 0 || y != 0 || !mon.isgd)) {
        buf = describe_level_buf(0);
        impossible("trying to place %s at <%d,%d> mstate:%lx on %s",
                   minimal_monnam(mon, true), x, y, mon.mstate, buf);
        x = 0; y = 0;
    }
    if ((mon === game.u.usteed && !game.in_steed_dismounting)
        || (DEADMONSTER(mon) && !(mon.isgd && x == 0 && y == 0))) {
        buf = describe_level_buf(0);
        impossible("placing %s onto map, mstate:%lx, on %s?",
                   (mon === game.u.usteed) ? "steed" : "defunct monster",
                   mon.mstate, buf);
        return;
    }
    /* svl.level.monsters[x][y] — scan fmon chain.  C reads the monster GRID,
     * which `mon` is by contract absent from at every place_monster call site
     * (its caller ran remove_monster, or it was never placed).  This port has no
     * grid — m_at walks fmon, where `mon` is still linked — so the exclusion has
     * to be stated: without it, dismount_steed's place_monster finds the steed
     * at its own coordinates and takes the impossible() arm, whose
     * minimal_monnam() stub throws and aborts the replay. */
    let othermon = m_at(x, y, mon);
    if (othermon) {
        buf = describe_level_buf(0);
        let monnm = minimal_monnam(mon, false);
        let othnm = (mon !== othermon) ? minimal_monnam(othermon, true) : "itself";
        impossible("placing %s over %s at <%d,%d>, mstates:%lx %lx on %s?",
                   monnm, othnm, x, y, othermon.mstate, mon.mstate, buf);
    }
    mon.mx = x; mon.my = y;
    delete mon._mapRemoved;
    /* svl.level.monsters[x][y] = mon — JS: monster already in fmon */
    mon.mstate = MON_FLOOR;
}

/* helper: MON_AT(x,y) — find monster at position in fmon chain.  `excl` is the
 * monster the caller knows is off C's monster grid (see place_monster above). */
function m_at(x, y, excl) {
    const steed = game.u ? game.u.usteed : null;
    for (let m = game.fmon; m; m = m.nmon) {
        if (m._mapRemoved) continue;
        if ((m.mhp | 0) < 1) continue; /* DEADMONSTER — C m_at/MON_AT reads the grid, which m_detach cleared */
        if (m === excl || (steed && m === steed)) continue;
        if (m.mx === x && m.my === y) return m;
    }
    return null;
}

/* helper: DEADMONSTER macro */
function DEADMONSTER(mon) {
    return mon.mhp < 1;
}

/* stubs for unported helpers */
/* C ref: nethack-c/src/pline.c:587-637 impossible(const char *s, ...) — it
 * paniclog()s the formatted message and pline()s it (plus "Program in
 * disorder!"), then RETURNS.  It never aborts; every caller falls through to
 * its own fallback value and C relies on that.  The message/paniclog side is
 * not modeled (established no-op convention: js/display.js, js/mcastu.js,
 * js/shk.js, js/potion.js); the control-flow contract — log and return — is
 * what callers depend on. */
export function impossible(_msg, ..._args) { }
export function minimal_monnam(mon, ckloc) {
    if (!mon) return '[Null monster]';
    const mndx = (mon.mndx ?? mon.mnum ?? -1) | 0;
    const species = (mndx >= 0 && mndx < MONS_NAMES.length) ? MONS_NAMES[mndx] : '';
    if (!species) return '[Null mon.data]';
    const prefix = (mon.mtame | 0) ? 'tame ' : ((mon.mpeaceful | 0) ? 'peaceful ' : '');
    let name = `${prefix}${species} <${mon.mx | 0},${mon.my | 0}>`;
    if (mon.cham != null && (mon.cham | 0) >= 0)
        name += `{${MONS_NAMES[mon.cham | 0] || '?' }}`;
    return name;
}

/* C panic() logs and returns in this replay terminal; preserve control flow. */
function panic(msg) { impossible(msg); }

/* local: which_armor — C worn.c:998 — walk minvent for owornmask & flag */
function which_armor(mon, flag) {
    for (let o = mon.minvent; o; o = o.nobj) {
        if (((o.owornmask | 0) & flag) !== 0) return o;
    }
    return null;
}

/* mpickobj — C ref: nethack-c/src/steal.c:616.  The real port now lives in
 * js/mklev.js (imported above).  The local stub that used to sit here — a bare
 * minvent prepend that never set obj->where / obj->ocarry and never ran the
 * !mtame unknow_object() branch — was a WRONG TWIN: C put_saddle_on_mon
 * (steed.c:141-164) deliberately calls fully_identify_obj() and then relies on
 * mpickobj to un-identify the saddle again when the monster is out of view
 * ("mpickobj can later override identification if out-of-view", steed.c:150). */

/* local constant: SADDLE object type (objects.c order in 5.0).
 * Was 237, which is STETHOSCOPE (js/oc_name_data.js[237] == "stethoscope",
 * oc_weight 4).  js/u_init.js:1006 and js/sp_lev.js:3175 already carry the
 * correct 235 (oc_name "saddle", oc_weight 200), so this was the odd one out:
 * put_saddle_on_mon() below was mksobj'ing a 4-weight stethoscope into the
 * pony's minvent, and curr_mon_load() (mon.c) summed 4 where C sums 200. */
const SADDLE = 235;

/* C steed.c:387-398 exercise_steed — practice after 100 mounted moves.
 * Await the skill notification before the movement caller continues. */
export async function exercise_steed() {
    const u = game.u;
    if (!u || !u.usteed)
        return;
    u.urideturns = (u.urideturns | 0) + 1;
    if (u.urideturns >= 100) {
        u.urideturns = 0;
        await use_skill(P_RIDING, 1);
    }
}

/* C steed.c:141-164 put_saddle_on_mon */
export async function put_saddle_on_mon(saddle, mtmp) {
    if (!can_saddle(mtmp) || which_armor(mtmp, W_SADDLE)) {
        if (saddle)
            impossible("put_saddle_on_mon: saddle obj could get orphaned");
        return;
    }
    if (!saddle) {
        saddle = (await mksobj(SADDLE, true, false));
        if (saddle) {
            fully_identify_obj(saddle);
            /* mpickobj can later override identification if out-of-view */
        } else {
            return;
        }
    }
    if ((await mpickobj(mtmp, saddle)))
        panic("merged saddle?");
    mtmp.misc_worn_check |= W_SADDLE;
    saddle.owornmask = W_SADDLE;
    saddle.leashmon = mtmp.m_id;
    update_mon_extrinsics(mtmp, saddle, true, false);
}
