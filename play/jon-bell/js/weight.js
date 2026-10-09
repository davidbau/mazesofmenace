// @ts-nocheck
// weight.js — carrying-capacity / encumbrance model.
// C ref: nethack-c/src/hack.c — weight_cap(), inv_weight(), calc_capacity(),
// near_capacity(), max_capacity().
//
// This is the single shared, C-faithful implementation; the old per-file
import { game } from './gstate.js';
import { acurr } from './attrib.js';
import { UNENCUMBERED, OVERLOADED, LEVITATION, LOW_PM, Upolyd, WOUNDED_LEGS, LEFT_SIDE, RIGHT_SIDE, Is_airlevel } from './const.js';
import { OC_WEIGHT, OTYP_LARGE_BOX, OTYP_BAG_OF_TRICKS, OTYP_BAG_OF_HOLDING, OTYP_STATUE, OTYP_BOULDER } from './oc_weight.generated.js';
import corpseData from './eat_corpse_data.json' with { type: 'json' };
import monMsizePack from './makemon_msize.json' with { type: 'json' };
import { pline } from './display.js';
import { stagger, float_vs_flight } from './mhitm.js';
/* eaten_stat (C eat.c:3788) is js/eat.js's faithful port; eat.js imports
 * near_capacity from this file, so this is a late-bound ES-module cycle. */
import { eaten_stat } from './eat.js';

/* C attrib.h: A_STR=0, A_CON=4 */
const A_STR = 0;
const A_CON = 4;

/* C include/weight.h */
const WT_WEIGHTCAP_STRCON = 25; /* str+con multiplied by this */
const WT_WEIGHTCAP_SPARE = 50;
const WT_WOUNDEDLEG_REDUCT = 100;
const MAX_CARR_CAP = 1000;
const LARGEST_INT = 32767; /* C global.h:135 */
const WT_HUMAN = 1450; /* C weight.h — weight of human body; Upolyd cap rescale */

/* C monflag.h sizes / mlets / mflags2 used by the Upolyd capacity rescale. */
const MZ_HUMAN = 2; /* == MZ_MEDIUM */
const S_NYMPH = 14;
const M2_STRONG = 0x04000000;
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

/* C mkobj.c:1889 weight(obj) — full weight of one object incl. container
 * contents.
 *
 * Unlike C's inv_weight(), which reads the cached otmp->owt, we recompute
 * weight() from objects[].oc_weight because the replay-reconstructed hero
 * inventory carries a placeholder owt (=1), not the live cached value. */
export function weight(obj) {
    if (!obj) return 0;
    const otyp = obj.otyp | 0;
    let wt = (otyp >= 0 && otyp < OC_WEIGHT.length) ? (OC_WEIGHT[otyp] | 0) : 0;

    if (obj.quan != null && (obj.quan | 0) < 1) {
        return 0; /* C impossible() path */
    }
    /* C: globby → return owt as-is (glob weight managed elsewhere). */
    if (obj.globby) return obj.owt | 0;

    const isContainer = (otyp >= OTYP_LARGE_BOX && otyp <= OTYP_BAG_OF_TRICKS);
    if (isContainer || otyp === OTYP_STATUE) {
        if (otyp === OTYP_STATUE && _ismnum_cwt(obj.corpsenm)) {
            const msize = monMsizePack.msize[obj.corpsenm];
            const minwt = (msize + msize + 1) * 100;
            wt = Math.trunc(3 * _cwt(obj.corpsenm) / 2);
            if (wt < minwt) wt = minwt;
            wt = Math.imul(wt, obj.quan | 0);
        }
        let cwt = 0;
        for (let c = obj.cobj; c; c = c.nobj)
            cwt += weight(c);
        if (otyp === OTYP_BAG_OF_HOLDING) {
            cwt = obj.cursed ? (cwt * 2)
                  : obj.blessed ? Math.trunc((cwt + 3) / 4)
                    : Math.trunc((cwt + 1) / 2);
        }
        return wt + cwt;
    }
    if (otyp === CORPSE && _ismnum_cwt(obj.corpsenm)) {
        const long_wt = (obj.quan | 0) * _cwt(obj.corpsenm | 0);
        let cwt = (long_wt > LARGEST_INT) ? LARGEST_INT : long_wt;
        if (obj.oeaten | 0)
            cwt = eaten_stat(cwt, obj);
        return cwt;
    }
    if ((obj.oclass | 0) === FOOD_CLASS && (obj.oeaten | 0))
        return eaten_stat((obj.quan | 0) * wt, obj);
    if ((obj.oclass | 0) === COIN_CLASS) {
        const cw = Math.trunc(((obj.quan | 0) + 50) / 100);
        return Math.max(cw, 1);
    }
    if (otyp === HEAVY_IRON_BALL && (obj.owt | 0) !== 0) {
        return obj.owt | 0;
    }
    if (otyp === CANDELABRUM_OF_INVOCATION && (obj.spe | 0)) {
        return wt + (obj.spe | 0) * (OC_WEIGHT[TALLOW_CANDLE] | 0);
    }
    const quan = obj.quan | 0;
    return wt ? (wt * quan) : ((quan + 1) >> 1);
}

/* C attrib.c:1251 acurrstr() — condense ACURR(A_STR) (3..125) into 3..25. */
function acurrstr(u) {
    const str = acurr(u, A_STR) | 0;
    if (str <= 18 /* STR18(0) */) return Math.max(str, 3);
    if (str <= 121 /* STR19(21) */) return 19 + Math.trunc(str / 50);
    return Math.min(str, 125) - 100;
}

export function weight_cap() {
    const u = game.u;
    if (!u) return 1;

    let carrcap = (WT_WEIGHTCAP_STRCON * (acurrstr(u) + (acurr(u, A_CON) | 0)))
                  + WT_WEIGHTCAP_SPARE;

    /* Upolyd branch (hack.c:4277-4287) — consistent with can_carry() in mon.c.
     *   if (youmonst.data->mlet == S_NYMPH)            carrcap = MAX_CARR_CAP;
     *   else if (!youmonst.data->cwt)                  carrcap *= msize / MZ_HUMAN;
     *   else if (!strongmonst || (strongmonst && cwt > WT_HUMAN))
     *                                                  carrcap *= cwt / WT_HUMAN; */
    if (Upolyd(u)) {
        const yd = game.youmonst && game.youmonst.data;
        if (yd) {
            const cwt = _cwt(yd.pmidx | 0);
            const strong = ((yd.mflags2 | 0) & M2_STRONG) !== 0;
            if ((yd.mlet | 0) === S_NYMPH) {
                carrcap = MAX_CARR_CAP;
            } else if (!cwt) {
                carrcap = Math.trunc((carrcap * (yd.msize | 0)) / MZ_HUMAN);
            } else if (!strong || (strong && cwt > WT_HUMAN)) {
                carrcap = Math.trunc((carrcap * cwt) / WT_HUMAN);
            }
        }
    }

    /* Levitation || Is_airlevel || strong-steed (hack.c:4289).
     * C youprop.h:240: Levitation = ((HLevitation || ELevitation) && !BLevitation).
     * Read the conferred property (e.g. ring of levitation just worn → ELevitation
     * set by setworn); this gives the hero MAX carrying capacity, dropping the
     * encumbrance state.  weight_cap also masks BLevitation&I_SPECIAL (hack.c:4273)
     * — the I_SPECIAL bit is cleared for the capacity check. */
    const I_SPECIAL_BIT = 0x20000000;
    const levProp = (u.uprops && u.uprops[LEVITATION]) ? u.uprops[LEVITATION] : null;
    const HLevitation = levProp ? (levProp.intrinsic | 0) : 0;
    const ELevitation = levProp ? (levProp.extrinsic | 0) : 0;
    const BLevitation = levProp ? ((levProp.blocked | 0) & ~I_SPECIAL_BIT) : 0;
    const Levitation = (HLevitation || ELevitation) && !BLevitation;
    const Is_airlevel_wc = Is_airlevel(game.u?.uz);
    /* C hack.c:4326 `u.usteed && strongmonst(u.usteed->data)` */
    const _steedData = u.usteed ? (u.usteed.data || null) : null;
    const strongSteed = !!(_steedData && ((_steedData.mflags2 | 0) & M2_STRONG));
    if (Levitation || Is_airlevel_wc || strongSteed) {
        carrcap = MAX_CARR_CAP;
    } else {
        if (carrcap > MAX_CARR_CAP)
            carrcap = MAX_CARR_CAP;
        const Flying = false;
        if (!Flying) {
            /* hack.c:4293-4296 — EWounded_legs & LEFT_SIDE / RIGHT_SIDE. */
            const wprop = u.uprops ? u.uprops[WOUNDED_LEGS] : null;
            const eWoundedLegs = wprop ? (wprop.extrinsic | 0) : 0;
            if (eWoundedLegs & LEFT_SIDE) carrcap -= WT_WOUNDEDLEG_REDUCT;
            if (eWoundedLegs & RIGHT_SIDE) carrcap -= WT_WOUNDEDLEG_REDUCT;
        }
    }

    /* hack.c:4338-4343 — BLevitation was masked above; C restores the saved
     * value and calls float_vs_flight(), which RECOMPUTES the I_SPECIAL block
     * from the current u.utrap.  So a weight_cap() call (bot() via
     * near_capacity) after trapmove() zeroed u.utrap but before reset_utrap()
     * drops the block, and reset_utrap(TRUE) then sees was_Lev true and prints
     * no float_up message. */
    if (levProp && ((levProp.blocked | 0) & I_SPECIAL_BIT)) float_vs_flight();

    return Math.max(carrcap, 1); /* never return 0 */
}

/* C hack.c:4315 inv_weight() — total carried object weight (no wc subtraction).
 * For COIN_CLASS uses (quan+50)/100; else otmp->owt (the cached object weight).
 * The BOULDER/throws_rocks exclusion is off for the un-polymorphed hero. */
export function inv_weight_raw() {
    let wt = 0;
    /* throws_rocks(youmonst.data) is FALSE for the un-polymorphed hero. */
    const throwsRocks = false;
    for (let otmp = game.invent; otmp; otmp = otmp.nobj) {
        if ((otmp.oclass | 0) === COIN_CLASS) {
            /* C hack.c:4322 — wt += (quan + 50) / 100 (integer division). */
            wt += Math.trunc(((otmp.quan | 0) + 50) / 100);
        } else if ((otmp.otyp | 0) !== OTYP_BOULDER || !throwsRocks) {
            /* C hack.c:4323-4324 — wt += otmp->owt, where owt == weight(otmp).
             * The reconstructed inventory carries a placeholder owt; recompute
             * the real weight() from objects[].oc_weight. */
            wt += weight(otmp);
        }
    }
    return wt;
}

/* C hack.c:4315 inv_weight() — returns (sum_owt - weight_cap). */
export function inv_weight() {
    return inv_weight_raw() - weight_cap();
}

/* C hack.c:4336 calc_capacity(xtra_wt). */
export function calc_capacity(xtra_wt) {
    const wc = weight_cap();        /* C: gw.wc set inside inv_weight() */
    const wt = (inv_weight_raw() - wc) + (xtra_wt | 0);
    if (wt <= 0)
        return UNENCUMBERED;
    if (wc <= 1)
        return OVERLOADED;
    const cap = Math.trunc((wt * 2) / wc) + 1;
    return Math.min(cap, OVERLOADED);
}

/* C hack.c:4348 near_capacity() = calc_capacity(0). */
export function near_capacity() {
    return calc_capacity(0);
}

/* C hack.c:4354 max_capacity() = inv_weight() - 2*weight_cap(). */
export function max_capacity() {
    const wc = weight_cap();
    return (inv_weight_raw() - wc) - (2 * wc);
}

export async function encumber_msg() {
    return encumber_msg_sync();
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
        pline(msg);
        if (game.disp) game.disp.botl = true;
    }
    u._oldcap = newcap;
}
