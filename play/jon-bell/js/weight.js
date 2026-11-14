// @ts-nocheck
// weight.js — carrying-capacity / encumbrance model.
// C ref: nethack-c/src/hack.c — weight_cap(), inv_weight(), calc_capacity(),
// near_capacity(), max_capacity().
//
// This is the single shared, C-faithful implementation; the old per-file
import { game } from './gstate.js';
import { acurr } from './attrib.js';
import { acurrstr } from './dokick.js';
import { UNENCUMBERED, OVERLOADED, LEVITATION, FLYING, LOW_PM, Upolyd, WOUNDED_LEGS, LEFT_SIDE, RIGHT_SIDE, Is_airlevel, W_ARMF } from './const.js';
import { OC_WEIGHT, OTYP_LARGE_BOX, OTYP_BAG_OF_TRICKS, OTYP_BAG_OF_HOLDING, OTYP_STATUE, OTYP_BOULDER } from './oc_weight.generated.js';
import corpseData from './eat_corpse_data.json' with { type: 'json' };
import monMsizePack from './makemon_msize.json' with { type: 'json' };
import { impossible_sync } from './display.js';
import { pline } from './pline.js';
import { simpleonames } from './objnam.js';
import { float_vs_flight } from './polyself.js';
import { stagger } from './mondata.js';
/* eaten_stat (C eat.c:3788) is js/eat.js's faithful port; eat.js imports
 * near_capacity from this file, so this is a late-bound ES-module cycle. */
import { eaten_stat } from './eat.js';
import { near_capacity } from './hack.js'; // relocate-fns
export { calc_capacity, inv_weight, max_capacity, near_capacity, weight_cap } from './hack.js'; // relocate-fns
export { _cwt }; // relocate-fns

/* C attrib.h: A_STR=0, A_CON=4 */
const A_STR = 0;

const LARGEST_INT = 32767; /* C global.h:135 */

/* permonst.cwt (corpse weight) keyed by PM index — js/eat_corpse_data.json
 * (the same source eat.js reads).  C weight_cap() reads youmonst.data->cwt. */
const MONS_CWT = /** @type {number[]} */ (corpseData.cwt || []);
function _cwt(pmidx) {
    return (pmidx >= 0 && pmidx < MONS_CWT.length) ? (MONS_CWT[pmidx] | 0) : 0;
}
/* C monst.h:285 `#define ismnum(x) ((x) >= LOW_PM && (x) < NUMMONS)`.  Spelled
 * locally against MONS_CWT.length rather than js/const.js ismnum(), which drops
 * C's upper bound (it tests only `>= LOW_PM`): weight()'s corpse arm indexes
 * mons[] with the result, so an out-of-range corpsenm must fail the guard here
 * the way it does in C, not read past the table. */
function _ismnum_cwt(pmidx) {
    return Number.isInteger(pmidx) && pmidx >= LOW_PM && pmidx < MONS_CWT.length;
}

/* C include/objclass.h: COIN_CLASS = 12, FOOD_CLASS = 7 */
const COIN_CLASS = 12;
const FOOD_CLASS = 7;
/* C objects.h otyp landmarks for weight(). */
const HEAVY_IRON_BALL = 477;
const CANDELABRUM_OF_INVOCATION = 262;
const TALLOW_CANDLE = 224;
const CORPSE = 265;

export { weight } from './mkobj.js';
import { weight } from './mkobj.js';
export { encumber_msg } from './pickup.js'; // relocate-fns

/* C hack.c:4315 inv_weight() — total carried object weight (no wc subtraction).
 * For COIN_CLASS uses (quan+50)/100; else otmp->owt (the cached object weight).
 * The BOULDER/throws_rocks exclusion is off for the un-polymorphed hero. */
export function inv_weight_raw() {
    let wt = 0;
    // C hack.c:4360 / mondata.h:134: rock throwers ignore carried boulders.
    const throwsRocks = !!((game.youmonst?.data?.mflags2 | 0)
        & 0x08000000 /* M2_ROCKTHROW */);
    for (let otmp = game.invent; otmp; otmp = otmp.nobj) {
        if ((otmp.oclass | 0) === COIN_CLASS) {
            /* C hack.c:4358: divide the long quantity before casting to int. */
            wt = (wt + Math.trunc((otmp.quan + 50) / 100)) | 0;
        } else if ((otmp.otyp | 0) !== OTYP_BOULDER || !throwsRocks) {
            /* C hack.c:4360 sums cached owt for EVERY class, not just food.
             * Food's nutrition can change before its weight: eat.c:1970
             * reduces rotten-corpse oeaten, then bite()'s lesshungry() can
             * page before recalc_wt() at :3157.  And bones.c:184-186 turns a
             * Bell of Opening (oc_weight 10) into a plain bell (oc_weight 30)
             * WITHOUT refreshing owt — C keeps summing the stale 10 until an
             * owt=weight() site updates it.  Objects whose owt is still the
             * zero-template placeholder (never passed mksobj's tail) have no
             * C counterpart cached value, so derive theirs. */
            wt += (otmp.owt ?? 0) !== 0 ? (otmp.owt | 0) : weight(otmp);
        }
    }
    return wt;
}






/* The SYNCHRONOUS entry point onto the same body.
 *
 * C's encumber_msg() is an ordinary void function and half its call sites are
 * in synchronous C code — attrib.c:516 exercise() is one, and exercise() is
 * reached from 325 sites in js/, none of which is async.  Nothing in the body
 * below awaits: pline() (js/display.js:6157) is declared `async` but contains
 * no `await` anywhere between its `{` and its `}`, so it runs to completion
 * synchronously and only its (already-resolved) promise is deferred.  Calling
 * it unawaited therefore leaves the topline, `_prevmsg` and the message ring
 * in exactly the state `await pline(...)` would, and — because the statements
 * after it stay in this same synchronous run — `disp.botl` and `u._oldcap`
 * are still updated before control returns to the caller.
 *
 * This is ONE body with two entry points on purpose: the seven hand-derived
 * copies of this message table that already exist in js/ (cmd.js
 * _encumber_msg_text, wizcmds.js _wish_encumber_text, potion.js:3036 ...) are
 * the failure mode a second copy would join. */
/* C pickup.c:1982/2003 — You("%s under your ...", stagger(gy.youmonst.data, "stagger")). */
export function stagger_verb() {
    const yd = game.youmonst && game.youmonst.data;
    return yd ? stagger(yd, 'stagger') : 'stagger';
}

export function encumber_msg_sync() {
    const u = game.u;
    if (!u) return;
    const oldcap = u._oldcap | 0;
    const newcap = near_capacity();
    let msg = null;
    if (oldcap < newcap) {
        switch (newcap) {
        case 1: msg = 'Your movements are slowed slightly because of your load.'; break;
        case 2: msg = 'You rebalance your load.  Movement is difficult.'; break;
        case 3: msg = `You ${stagger_verb()} under your heavy load.  Movement is very hard.`; break;
        default: msg = `You ${newcap === 4 ? 'can barely' : "can't even"} move a handspan with this load!`; break;
        }
    } else if (oldcap > newcap) {
        switch (newcap) {
        case 0: msg = 'Your movements are now unencumbered.'; break;
        case 1: msg = 'Your movements are only slowed slightly by your load.'; break;
        case 2: msg = 'You rebalance your load.  Movement is still difficult.'; break;
        case 3: msg = `You ${stagger_verb()} under your load.  Movement is still very hard.`; break;
        }
    }
    if (msg) {
        game._encumber_pline = true;
        try { pline(msg); } finally { game._encumber_pline = false; }
    }
    // C pickup.c:1999,2016: both changes flag status, even the silent 5 -> 4.
    if (oldcap !== newcap) {
        if (game.disp) game.disp.botl = true;
    }
    u._oldcap = newcap;
}
