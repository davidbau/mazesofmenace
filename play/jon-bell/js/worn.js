// @ts-nocheck
// C ref: nethack-c-v5/upstream/src/worn.c — shared worn-gear bookkeeping.
import { game } from './gstate.js';
import { cancel_doff, recalc_telepat_range } from './do_wear.js';
import { MKOBJ_OC_OPROP } from './mkobj_erosion_meta.js';
import { is_weptool, monstunseesu, cvt_prop_to_mseenres } from './mhitm.js';
import { update_inventory } from './inventory_refresh.js';
import { set_artifact_intrinsic, set_twoweap } from './cmd.js';
import { impossible } from './pline.js';
import { PM_MONK, PM_WIZARD } from './pm.generated.js';
import {
    W_ARM, W_ARMC, W_ARMH, W_ARMS, W_ARMG, W_ARMF, W_ARMU, W_ARMOR,
    W_RINGL, W_RINGR, W_WEP, W_SWAPWEP, W_QUIVER, W_AMUL, W_TOOL,
    W_BALL, W_CHAIN, I_SPECIAL, INVIS, CLAIRVOYANT, BLINDED,
} from './const.js';

export function bypass_obj(obj) {
    // C body (worn.c:1110):
    //     void bypass_obj(struct obj *obj) {
    //         obj->bypass = 1;
    //         svc.context.bypasses = TRUE;
    //     }
    // A pure in-place arg mutation (no RNG, no return). The observable effect
    // asserts it — the mapstate-only state_after_diff cannot see a per-arg
    // struct-field mutation. This is the proving case for that instrument.
    obj.bypass = 1;
    // svc.context.bypasses = TRUE (worn.c:1115). Modeled on game.context like
    // the other svc.context.* JS mirrors (js/dig.js / js/eat.js). Not in the
    game.context = game.context || {};
    game.context.bypasses = true;
}

/* C's struct obj ** entries are property names into the single hero record. */
const worn = [
    [W_ARM, 'uarm'], [W_ARMC, 'uarmc'], [W_ARMH, 'uarmh'],
    [W_ARMS, 'uarms'], [W_ARMG, 'uarmg'], [W_ARMF, 'uarmf'],
    [W_ARMU, 'uarmu'], [W_RINGL, 'uleft'], [W_RINGR, 'uright'],
    [W_WEP, 'uwep'], [W_SWAPWEP, 'uswapwep'], [W_QUIVER, 'uquiver'],
    [W_AMUL, 'uamul'], [W_TOOL, 'ublindf'], [W_BALL, 'uball'],
    [W_CHAIN, 'uchain'],
];
const WEAPON_CLASS = 2;
const MUMMY_WRAPPING = 138, CORNUTHAUM = 93;
const ART_EYES_OF_THE_OVERWORLD = 26;

// C's u.uprops[] is zero-initialized, including the non-property entry 0.
function uprop(p) {
    const props = game.u.uprops ||= {};
    return props[p] ||= { intrinsic: 0, extrinsic: 0, blocked: 0 };
}

/* This only allows for one blocking item per property. */
function w_blocks(o, m) {
    return o.otyp === MUMMY_WRAPPING && (m & W_ARMC) ? INVIS
        : o.otyp === CORNUTHAUM && (m & W_ARMH)
          && game.urole.mnum !== PM_WIZARD ? CLAIRVOYANT
        : o.oartifact === ART_EYES_OF_THE_OVERWORLD && (m & W_TOOL) ? BLINDED
        : 0;
}

/* C worn.c:setworn. Only the real diagnostic can suspend this body. */
export async function setworn(obj, mask) {
    const u = game.u;
    let p;
    if ((mask & (W_ARM | I_SPECIAL)) === (W_ARM | I_SPECIAL)) {
        // Restoring saved game; no properties are conferred via skin.
        u.uskin = obj;
    } else {
        for (const [w_mask, slot] of worn) {
            if (w_mask & mask) {
                const oobj = u[slot];
                if (oobj && !(oobj.owornmask & w_mask))
                    await impossible('Setworn: mask=0x%08lx.', w_mask);
                if (oobj) {
                    if (u.twoweap && (oobj.owornmask & (W_WEP | W_SWAPWEP)))
                        set_twoweap(false);
                    oobj.owornmask &= ~w_mask;
                    if (w_mask & ~(W_SWAPWEP | W_QUIVER)) {
                        p = MKOBJ_OC_OPROP[oobj.otyp];
                        uprop(p).extrinsic &= ~w_mask;
                        monstunseesu(cvt_prop_to_mseenres(p));
                        if ((p = w_blocks(oobj, mask)) !== 0)
                            uprop(p).blocked &= ~w_mask;
                        if (oobj.oartifact)
                            set_artifact_intrinsic(oobj, 0, mask);
                    }
                    cancel_doff(oobj, w_mask);
                }
                u[slot] = obj;
                if (obj) {
                    obj.owornmask |= w_mask;
                    if (w_mask & ~(W_SWAPWEP | W_QUIVER)) {
                        if (obj.oclass === WEAPON_CLASS || is_weptool(obj)
                            || mask !== W_WEP) {
                            p = MKOBJ_OC_OPROP[obj.otyp];
                            uprop(p).extrinsic |= w_mask;
                            if ((p = w_blocks(obj, mask)) !== 0)
                                uprop(p).blocked |= w_mask;
                        }
                        if (obj.oartifact)
                            set_artifact_intrinsic(obj, 1, mask);
                    }
                }
            }
        }
        if (obj && (obj.owornmask & W_ARMOR))
            (u.uroleplay ||= {}).nudist = false;
        game.iflags.tux_penalty = !!(u.uarm && game.urole.mnum === PM_MONK
                                    && game.urole.spelarmr);
    }
    if ((game.flags.weaponstatus && (mask & W_WEP))
        || (game.flags.armorstatus && (mask & W_ARMOR)))
        game.disp.botl = true;
    update_inventory();
    recalc_telepat_range();
}

/* C worn.c:setnotworn — called when an object is destroyed or leaves inventory. */
export function setnotworn(obj) {
    const u = game.u;
    let p, unworn = 0;
    if (!obj)
        return;
    if (u.twoweap && (obj === u.uwep || obj === u.uswapwep))
        set_twoweap(false);
    for (const [w_mask, slot] of worn) {
        if (obj === u[slot]) {
            cancel_doff(obj, w_mask);
            u[slot] = null;
            unworn |= w_mask;
            p = MKOBJ_OC_OPROP[obj.otyp];
            uprop(p).extrinsic &= ~w_mask;
            monstunseesu(cvt_prop_to_mseenres(p));
            obj.owornmask &= ~w_mask;
            if (obj.oartifact)
                set_artifact_intrinsic(obj, 0, w_mask);
            if ((p = w_blocks(obj, w_mask)) !== 0)
                uprop(p).blocked &= ~w_mask;
        }
    }
    if (!u.uarm)
        game.iflags.tux_penalty = false;
    if ((game.flags.weaponstatus && (unworn & W_WEP))
        || (game.flags.armorstatus && (unworn & W_ARMOR)))
        game.disp.botl = true;
    update_inventory();
    recalc_telepat_range();
}
