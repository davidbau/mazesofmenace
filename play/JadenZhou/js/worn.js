// worn.js — monster armor: which_armor(), find_mac(), m_dowear(),
// m_dowear_type(), mon_set_minvis(), mon_adjust_speed(),
// update_mon_extrinsics(), extra_pref() and racial_exception().
// C ref: worn.c.  Also the hero's setworn()/setnotworn().
//
// m_dowear_type(), mon_adjust_speed() and update_mon_extrinsics() can print
// messages but have synchronous callers (makemon() and friends, with
// creation/silently set, where C prints nothing).  Their bodies are
// generators that yield each message where C calls pline(): the async
// entry points print every yielded message in order (run_msgs()), and the
// synchronous ones (run_msgs_sync()) run the same body, where no message
// can come up.

import { has_horns } from './polyself.js';
import { impossible } from './hack.js';
import { is_art } from './artifact.js';
import { minv } from './mon.js';
import { objchain_items } from './invent.js';
import { game } from './gstate.js';
import { objects } from './objects.js';
import * as O from './objects.js';
import * as M from './monsters.js';
import { mons } from './monsters.js';
import { NON_PM } from './const.js';
import { FIRE_RES, COLD_RES, SLEEP_RES, DISINT_RES, SHOCK_RES, POISON_RES,
         ACID_RES, STONE_RES, INVIS, FAST, ANTIMAGIC, REFLECTING, PROTECTION,
         CLAIRVOYANT, STEALTH, TELEPAT, LEVITATION, FLYING, WWALKING,
         DISPLACED, FUMBLING, JUMPING, BLINDED, SEE_INVIS, AC_MAX, MFAST,
         MSLOW, W_ARM, W_ARMC, W_ARMH, W_ARMS, W_ARMG, W_ARMF, W_ARMU,
         W_AMUL, W_TOOL } from './const.js';
import { ART_SUNSWORD, ART_EYES_OF_THE_OVERWORLD } from './artilist.js';
import { set_artifact_intrinsic_sync } from './artifact.js';
import { newsym, pline } from './display.js';
import { cansee } from './vision.js';
import { canseemon } from './display.js';
import { Monnam, mon_nam } from './do_name.js';
import { distant_name, doname } from './objnam.js';
import { curse } from './mkobj.js';
import { strncmpi, strcmpi } from './hacklib.js';
import { monsndx } from './mondata.js';
import { W_RINGL, W_RINGR, W_WEP, W_SWAPWEP, W_QUIVER, W_BALL, W_CHAIN,
         W_ARMOR, I_SPECIAL, W_ART, BOLT_LIM, M_SEEN_NOTHING, M_SEEN_MAGR,
         M_SEEN_FIRE, M_SEEN_COLD, M_SEEN_SLEEP, M_SEEN_DISINT, M_SEEN_ELEC,
         M_SEEN_POISON, M_SEEN_ACID, M_SEEN_REFL } from './const.js';
import { monstunseesu } from './uhitm.js';
import { mhim, mhis } from './mhitu.js';
import { learnwand } from './zap.js';
import { cancel_doff } from './do_wear.js';
import { is_weptool } from './wield.js';
import { DEAF, W_SADDLE } from './const.js';
import { extract_from_minvent_g } from './steal.js';
import { place_object } from './mkobj.js';
import { m_useup_g } from './mthrowu.js';
import { cloak_simple_name } from './objnam.js';
import { s_suffix } from './hacklib.js';
import { can_saddle } from './makemon.js';
import { can_ride } from './steed.js';
import { surface } from './iactions.js';
import { See_invisible, Unaware } from './youprop.js';
import { Role_if } from './const.js';
import { uprop } from './youprop.js';
import { dismount_steed } from './steed.js';
import { DISMOUNT_FELL } from './const.js';
import { begin_burn, end_burn } from './timeout.js';
import { vision_recalc } from './vision.js';
import { arti_light_description } from './light.js';
import { Yname2, otense } from './objnam.js';
import { discover_object } from './o_init.js';

/* print each message a worn.c generator yields, in order; a yielded
   { newcham_async: () => promise, what } asks the driver to await an
   async callee (the same convention as mon.js newcham()) */
async function run_msgs(gen) {
    for (const msg of gen) {
        if (msg?.newcham_async)
            await msg.newcham_async();
        else
            await pline(msg);
    }
}
/* run a worn.c generator in a synchronous caller (creation/silently) */
function run_msgs_sync(gen) {
    for (const msg of gen) {
        if (msg?.newcham_async)
            throw new Error(`worn.c: async ${msg.what} in a synchronous caller not ported yet`);
        throw new Error(`worn.c message in a synchronous caller not ported yet: ${msg}`);
    }
}

/* C ref: monst.h MON_WEP() */
export function MON_WEP(mon) { return mon.mw || null; }
function sgn(n) { return n < 0 ? -1 : n > 0 ? 1 : 0; }

/* C ref: obj.h greatest_erosion() */
function greatest_erosion(otmp) {
    const e1 = otmp.oeroded || 0, e2 = otmp.oeroded2 || 0;
    return e1 > e2 ? e1 : e2;
}
/* C ref: hack.h ARM_BONUS() */
function ARM_BONUS(obj) {
    return objects[obj.otyp].a_ac + (obj.spe || 0)
           - Math.min(greatest_erosion(obj), objects[obj.otyp].a_ac);
}
/* C ref: obj.h is_shirt() ... is_suit(), bimanual(), is_flimsy() */
function is_armcat(otmp, cat) {
    return otmp.oclass === O.ARMOR_CLASS && objects[otmp.otyp].oc_armcat === cat;
}
function is_shield(otmp) { return is_armcat(otmp, O.ARM_SHIELD); }
function is_helmet(otmp) { return is_armcat(otmp, O.ARM_HELM); }
function is_boots(otmp) { return is_armcat(otmp, O.ARM_BOOTS); }
function is_gloves(otmp) { return is_armcat(otmp, O.ARM_GLOVES); }
function is_cloak(otmp) { return is_armcat(otmp, O.ARM_CLOAK); }
function is_shirt(otmp) { return is_armcat(otmp, O.ARM_SHIRT); }
function is_suit(otmp) { return is_armcat(otmp, O.ARM_SUIT); }
function bimanual(otmp) {
    return (otmp.oclass === O.WEAPON_CLASS || otmp.oclass === O.TOOL_CLASS)
           && !!objects[otmp.otyp].oc_bimanual;
}
function is_flimsy(otmp) {
    return objects[otmp.otyp].oc_material <= O.LEATHER
           || otmp.otyp === O.RUBBER_HOSE;
}
/* C ref: obj.h is_elven_armor() */
function is_elven_armor(otmp) {
    return otmp.otyp === O.ELVEN_LEATHER_HELM
        || otmp.otyp === O.ELVEN_MITHRIL_COAT || otmp.otyp === O.ELVEN_CLOAK
        || otmp.otyp === O.ELVEN_SHIELD || otmp.otyp === O.ELVEN_BOOTS;
}

/* mondata.h / mondata.c */
function verysmall(ptr) { return ptr.msize < M.MZ_SMALL; }
function bigmonst(ptr) { return ptr.msize >= M.MZ_LARGE; }
function nohands(ptr) { return (ptr.mflags1 & M.M1_NOHANDS) !== 0; }
function is_animal(ptr) { return (ptr.mflags1 & M.M1_ANIMAL) !== 0; }
function mindless(ptr) { return (ptr.mflags1 & M.M1_MINDLESS) !== 0; }
function humanoid(ptr) { return (ptr.mflags1 & M.M1_HUMANOID) !== 0; }
function slithy(ptr) { return (ptr.mflags1 & M.M1_SLITHY) !== 0; }
function noncorporeal(ptr) { return ptr.mlet === M.S_GHOST; }
function is_whirly(ptr) {
    return ptr.mlet === M.S_VORTEX || ptr === mons[M.PM_AIR_ELEMENTAL];
}
// C ref: mondata.c sliparm()
function sliparm(ptr) {
    return is_whirly(ptr) || ptr.msize <= M.MZ_SMALL || noncorporeal(ptr);
}
// C ref: mondata.c breakarm()
function breakarm(ptr) {
    if (sliparm(ptr))
        return false;

    return (bigmonst(ptr)
            || (ptr.msize > M.MZ_SMALL && !humanoid(ptr))
            /* special cases of humanoids that cannot wear suits */
            || ptr === mons[M.PM_MARILITH]
            || ptr === mons[M.PM_WINGED_GARGOYLE]);
}
/* C ref: mondata.h cantweararm() */
export function cantweararm(ptr) { return breakarm(ptr) || sliparm(ptr); }
// C ref: mondata.c num_horns()
function num_horns(ptr) {
    switch (monsndx(ptr)) {
    case M.PM_HORNED_DEVIL: /* ? "more than one" */
    case M.PM_MINOTAUR:
    case M.PM_ASMODEUS:
    case M.PM_BALROG:
        return 2;
    case M.PM_WHITE_UNICORN:
    case M.PM_GRAY_UNICORN:
    case M.PM_BLACK_UNICORN:
    case M.PM_KI_RIN:
        return 1;
    default:
        break;
    }
    return 0;
}
/* C ref: obj.h WrappingAllowed() */
function WrappingAllowed(mptr) {
    return humanoid(mptr) && mptr.msize >= M.MZ_SMALL && mptr.msize <= M.MZ_HUGE
        && !noncorporeal(mptr) && mptr.mlet !== M.S_CENTAUR
        && mptr !== mons[M.PM_WINGED_GARGOYLE] && mptr !== mons[M.PM_MARILITH];
}
// C ref: mondata.c raceptr()
function raceptr(mtmp) {
    if (mtmp === game.youmonst && game.u.umonnum === game.u.umonster)
        return mons[game.urace.mnum];
    return mtmp.data;
}
/* C ref: prop.h res_to_mr() */
function res_to_mr(r) {
    return (FIRE_RES <= r && r <= STONE_RES) ? (1 << (r - 1)) : 0x00;
}

/* C ref: worn.c w_blocks() -- This only allows for one blocking item per
   property */
export function w_blocks(o, m) {
    return (o.otyp === O.MUMMY_WRAPPING && (m & W_ARMC) !== 0) ? INVIS
        : (o.otyp === O.CORNUTHAUM && (m & W_ARMH) !== 0
           && !Role_if(M.PM_WIZARD)) ? CLAIRVOYANT
        : (is_art(o, ART_EYES_OF_THE_OVERWORLD)
           && (m & W_TOOL) !== 0) ? BLINDED
        : 0;
}
/* note: monsters don't have clairvoyance, so dependency on hero's role here
   has no significant effect on their use of w_blocks() */

/* C ref: worn.c worn[] -- the hero's equipment slots */
const worn = [
    { w_mask: W_ARM, w_obj: 'uarm' },
    { w_mask: W_ARMC, w_obj: 'uarmc' },
    { w_mask: W_ARMH, w_obj: 'uarmh' },
    { w_mask: W_ARMS, w_obj: 'uarms' },
    { w_mask: W_ARMG, w_obj: 'uarmg' },
    { w_mask: W_ARMF, w_obj: 'uarmf' },
    { w_mask: W_ARMU, w_obj: 'uarmu' },
    { w_mask: W_RINGL, w_obj: 'uleft' },
    { w_mask: W_RINGR, w_obj: 'uright' },
    { w_mask: W_WEP, w_obj: 'uwep' },
    { w_mask: W_SWAPWEP, w_obj: 'uswapwep' },
    { w_mask: W_QUIVER, w_obj: 'uquiver' },
    { w_mask: W_AMUL, w_obj: 'uamul' },
    { w_mask: W_TOOL, w_obj: 'ublindf' }, /* blindfold|towel|lenses */
    { w_mask: W_BALL, w_obj: 'uball' },
    { w_mask: W_CHAIN, w_obj: 'uchain' },
];

// C ref: mondata.c cvt_prop_to_mseenres()
function cvt_prop_to_mseenres(prop) {
    switch (prop) {
    case ANTIMAGIC: return M_SEEN_MAGR;
    case FIRE_RES: return M_SEEN_FIRE;
    case COLD_RES: return M_SEEN_COLD;
    case SLEEP_RES: return M_SEEN_SLEEP;
    case DISINT_RES: return M_SEEN_DISINT;
    case POISON_RES: return M_SEEN_POISON;
    case SHOCK_RES: return M_SEEN_ELEC;
    case ACID_RES: return M_SEEN_ACID;
    case REFLECTING: return M_SEEN_REFL;
    default: return M_SEEN_NOTHING;
    }
}

// C ref: worn.c setworn()
/* Updated to use the extrinsic and blocked fields. */
export function setworn(obj, mask) {
    const g = game;
    const u = g.u;
    let oobj, p;

    if ((mask & (W_ARM | I_SPECIAL)) === (W_ARM | I_SPECIAL)) {
        /* restoring saved game; no properties are conferred via skin */
        g.uskin = obj;
        /* assert( !uarm ); */
    } else {
        for (const wp of worn) {
            if (wp.w_mask & mask) {
                oobj = g[wp.w_obj] || null;
                if (oobj && !(oobj.owornmask & wp.w_mask))
                    impossible(`Setworn: mask=0x${wp.w_mask.toString(16)}.`);
                if (oobj) {
                    if (u.twoweap && (oobj.owornmask & (W_WEP | W_SWAPWEP)))
                        u.twoweap = false; /* set_twoweap(FALSE) */
                    oobj.owornmask &= ~wp.w_mask;
                    if (wp.w_mask & ~(W_SWAPWEP | W_QUIVER)) {
                        p = objects[oobj.otyp].oc_oprop;
                        uprop(p).extrinsic = uprop(p).extrinsic & ~wp.w_mask;
                        /* if the hero removed an extrinsic-granting item,
                           nearby monsters will notice and attempt attacks of
                           that type again */
                        monstunseesu(cvt_prop_to_mseenres(p)); /* monstunseesu_prop(p) */
                        if ((p = w_blocks(oobj, mask)) !== 0)
                            uprop(p).blocked &= ~wp.w_mask;
                        if (oobj.oartifact)
                            set_artifact_intrinsic_sync(oobj, 0, mask);
                    }
                    /* in case wearing or removal is in progress or removal
                       is pending (via 'A' command for multiple items) */
                    cancel_doff(oobj, wp.w_mask);
                }
                g[wp.w_obj] = obj;
                if (obj) {
                    obj.owornmask = (obj.owornmask || 0) | wp.w_mask;
                    /* Prevent getting/blocking intrinsics from wielding
                     * potions, through the quiver, etc.
                     * Allow weapon-tools, too.
                     * wp_mask should be same as mask at this point.
                     */
                    if (wp.w_mask & ~(W_SWAPWEP | W_QUIVER)) {
                        if (obj.oclass === O.WEAPON_CLASS || is_weptool(obj)
                            || mask !== W_WEP) {
                            p = objects[obj.otyp].oc_oprop;
                            uprop(p).extrinsic = uprop(p).extrinsic | wp.w_mask;
                            if ((p = w_blocks(obj, mask)) !== 0)
                                uprop(p).blocked |= wp.w_mask;
                        }
                        if (obj.oartifact)
                            set_artifact_intrinsic_sync(obj, 1, mask);
                    }
                }
            }
        }
        if (obj && (obj.owornmask & W_ARMOR) !== 0)
            u.uroleplay.nudist = false;
        /* tux -> tuxedo -> "monkey suit" -> monk's suit */
        g.iflags.tux_penalty = !!(g.uarm && Role_if(M.PM_MONK)
                                  && g.urole.spelarmr);
    }
    if ((g.flags.weaponstatus && (mask & W_WEP) !== 0)
        || (g.flags.armorstatus && (mask & W_ARMOR) !== 0))
        g.disp_botl = true;
    /* update_inventory(): no perm_invent */
    recalc_telepat_range();
}

// C ref: worn.c setnotworn()
/* called e.g. when obj is destroyed */
/* Updated to use the extrinsic and blocked fields. */
export function setnotworn(obj) {
    const g = game;
    const u = g.u;
    let p;
    let unworn = 0;

    if (!obj)
        return;
    if (u.twoweap && (obj === g.uwep || obj === g.uswapwep))
        u.twoweap = false; /* set_twoweap(FALSE) */
    for (const wp of worn)
        if (obj === g[wp.w_obj]) {
            /* in case wearing or removal is in progress or removal
               is pending (via 'A' command for multiple items) */
            cancel_doff(obj, wp.w_mask);

            g[wp.w_obj] = null;
            unworn |= wp.w_mask;
            p = objects[obj.otyp].oc_oprop;
            uprop(p).extrinsic = uprop(p).extrinsic & ~wp.w_mask;
            monstunseesu(cvt_prop_to_mseenres(p)); /* remove this extrinsic from seenres */
            obj.owornmask &= ~wp.w_mask;
            if (obj.oartifact)
                set_artifact_intrinsic_sync(obj, 0, wp.w_mask);
            if ((p = w_blocks(obj, wp.w_mask)) !== 0)
                uprop(p).blocked &= ~wp.w_mask;
        }
    if (!g.uarm)
        g.iflags.tux_penalty = false;
    if ((g.flags.weaponstatus && (unworn & W_WEP) !== 0)
        || (g.flags.armorstatus && (unworn & W_ARMOR) !== 0))
        g.disp_botl = true;
    /* update_inventory(): no perm_invent */
    recalc_telepat_range();
}

// C ref: worn.c recalc_telepat_range()
/* calc the range of hero's unblind telepathy */
export function recalc_telepat_range() {
    const g = game;
    let nobjs = 0;

    for (const wp of worn) {
        const oobj = g[wp.w_obj];

        if (oobj && objects[oobj.otyp].oc_oprop === TELEPAT)
            nobjs++;
    }
    /* count all artifacts with SPFX_ESP as one */
    if (uprop(TELEPAT).extrinsic & W_ART)
        nobjs++;

    if (nobjs)
        g.u.unblind_telepat_range = (BOLT_LIM * BOLT_LIM) * nobjs;
    else
        g.u.unblind_telepat_range = -1;
}

// C ref: artifact.c artifact_light()
export function artifact_light(obj) {
    /* not artifacts but treat them as if they were because they emit
       light without burning */
    if (obj && (obj.otyp === O.GOLD_DRAGON_SCALE_MAIL
                || obj.otyp === O.GOLD_DRAGON_SCALES)
        && ((obj.owornmask || 0) & W_ARM) !== 0)
        return true;

    return !!(obj && obj.oartifact) && is_art(obj, ART_SUNSWORD);
}

// C ref: worn.c mon_set_minvis()
export function mon_set_minvis(mon, cursed_potion) {
    mon.perminvis = !cursed_potion ? 1 : 0;
    if (!mon.invis_blkd) {
        mon.minvis = mon.perminvis;
        newsym(mon.mx, mon.my); /* make it disappear */
        /* if (mon->wormno) see_wsegs(mon): worm tails aren't ported */
    }
}

// C ref: worn.c mon_adjust_speed()
export async function mon_adjust_speed(mon, adjust, obj) {
    await run_msgs(mon_adjust_speed_g(mon, adjust, obj));
}
/* mon_adjust_speed() from a synchronous caller (makemon()) */
export function mon_adjust_speed_sync(mon, adjust, obj) {
    run_msgs_sync(mon_adjust_speed_g(mon, adjust, obj));
}
function* mon_adjust_speed_g(
    mon,
    adjust, /* positive => increase speed, negative => decrease */
    obj)    /* item to make known if effect can be seen */
{
    let otmp;
    let give_msg = !game.in_mklev, petrify = false;
    const oldspeed = mon.mspeed || 0;

    switch (adjust) {
    case 2:
        mon.permspeed = MFAST;
        give_msg = false; /* special-case monster creation */
        break;
    case 1:
        if (mon.permspeed === MSLOW)
            mon.permspeed = 0;
        else
            mon.permspeed = MFAST;
        break;
    case 0: /* just check for worn speed boots */
        break;
    case -1:
        if (mon.permspeed === MFAST)
            mon.permspeed = 0;
        else
            mon.permspeed = MSLOW;
        break;
    case -2:
        mon.permspeed = MSLOW;
        give_msg = false; /* (not currently used) */
        break;
    case -3: /* petrification */
        /* take away intrinsic speed but don't reduce normal speed */
        if (mon.permspeed === MFAST)
            mon.permspeed = 0;
        petrify = true;
        break;
    case -4: /* green slime */
        if (mon.permspeed === MFAST)
            mon.permspeed = 0;
        give_msg = false;
        break;
    }

    otmp = null;
    for (const o of minv(mon))
        if (o.owornmask && objects[o.otyp].oc_oprop === FAST) {
            otmp = o;
            break;
        }
    if (otmp) /* speed boots */
        mon.mspeed = MFAST;
    else
        mon.mspeed = mon.permspeed || 0;

    /* no message if monster is immobile (temp or perm) or unseen */
    if (give_msg && (mon.mspeed !== oldspeed || petrify) && mon.data.mmove
        && !(mon.mfrozen || mon.msleeping) && canseemon(mon)) {
        /* fast to slow (skipping intermediate state) or vice versa */
        const howmuch =
            (mon.mspeed + oldspeed === MFAST + MSLOW) ? "much " : "";

        if (petrify) {
            /* mimic the player's petrification countdown; "slowing down"
               even if fast movement rate retained via worn speed boots */
            if (game.flags?.verbose)
                yield `${Monnam(mon)} is slowing down.`; /* pline_mon() */
        } else if (adjust > 0 || mon.mspeed === MFAST)
            yield `${Monnam(mon)} is suddenly moving ${howmuch}faster.`;
        else
            yield `${Monnam(mon)} seems to be moving ${howmuch}slower.`;

        /* might discover an object if we see the speed change happen */
        if (obj)
            learnwand(obj);
    }
}

/* alchemy smock confers two properties, poison and acid resistance
   but objects[ALCHEMY_SMOCK].oc_oprop can only describe one of them;
   if it is poison resistance, alternate property is acid resistance;
   if someone changes it to acid resistance, alt becomes poison resist;
   if someone changes it to hallucination resistance, all bets are off
   [TODO: handle alternate properties conferred by dragon scales/mail] */
function altprop(o) {
    return (o.otyp === O.ALCHEMY_SMOCK)
        ? (POISON_RES + ACID_RES - objects[o.otyp].oc_oprop)
        : 0;
}

// C ref: worn.c update_mon_extrinsics()
/* armor put on or taken off; might be magical variety */
export async function update_mon_extrinsics(mon, obj, on, silently) {
    await run_msgs(update_mon_extrinsics_g(mon, obj, on, silently));
}
/* silently set: for synchronous callers */
export function update_mon_extrinsics_sync(mon, obj, on) {
    run_msgs_sync(update_mon_extrinsics_g(mon, obj, on, true));
}
export function* update_mon_extrinsics_g(
    mon,
    obj, /* armor being worn or taken off */
    on,
    silently)
{
    let which = objects[obj.otyp].oc_oprop;
    const altwhich = altprop(obj);

    const unseen = !canseemon(mon);
    if (which || altwhich) {
        for (;;) { /* again: */
            if (on) {
                switch (which) {
                case INVIS:
                    mon.minvis = !mon.invis_blkd;
                    break;
                case FAST: {
                    const save_in_mklev = game.in_mklev;
                    if (silently)
                        game.in_mklev = true;
                    try {
                        yield* mon_adjust_speed_g(mon, 0, obj);
                    } finally {
                        game.in_mklev = save_in_mklev;
                    }
                    break;
                }
                /* properties handled elsewhere */
                case ANTIMAGIC:
                case REFLECTING:
                case PROTECTION:
                    break;
                /* properties which have no effect for monsters */
                case CLAIRVOYANT:
                case STEALTH:
                case TELEPAT:
                    break;
                /* properties which should have an effect but aren't
                   implemented */
                case LEVITATION:
                case FLYING:
                case WWALKING:
                    break;
                /* properties which maybe should have an effect but don't */
                case DISPLACED:
                case FUMBLING:
                case JUMPING:
                    break;
                default:
                    mon.mextrinsics = (mon.mextrinsics || 0) | res_to_mr(which);
                    break;
                }
            } else { /* off */
                switch (which) {
                case INVIS:
                    mon.minvis = mon.perminvis;
                    break;
                case FAST: {
                    const save_in_mklev = game.in_mklev;
                    if (silently)
                        game.in_mklev = true;
                    try {
                        yield* mon_adjust_speed_g(mon, 0, obj);
                    } finally {
                        game.in_mklev = save_in_mklev;
                    }
                    break;
                }
                case FIRE_RES:
                case COLD_RES:
                case SLEEP_RES:
                case DISINT_RES:
                case SHOCK_RES:
                case POISON_RES:
                case ACID_RES:
                case STONE_RES: {
                    /*
                     * Update monster's extrinsics (for worn objects only;
                     * 'obj' itself might still be worn or already unworn).
                     */
                    const mask = res_to_mr(which);
                    let found = null;
                    for (const otmp of minv(mon)) {
                        if (otmp === obj || !otmp.owornmask)
                            continue;
                        if (objects[otmp.otyp].oc_oprop === which) {
                            found = otmp;
                            break;
                        }
                        /* check whether 'otmp' confers target property as an
                           extra one rather than as the one specified for it
                           in objects[] */
                        if (altprop(otmp) === which) {
                            found = otmp;
                            break;
                        }
                    }
                    if (!found)
                        mon.mextrinsics = (mon.mextrinsics || 0) & ~mask;
                    break;
                }
                default:
                    break;
                }
            }

            /* worn alchemy smock/apron confers both poison resistance and
               acid resistance to the hero so do likewise for monster who
               wears one */
            if (altwhich && which !== altwhich) {
                which = altwhich;
                continue; /* goto again */
            }
            break;
        }
    }

    /* maybe_blocks: */
    /* obj->owornmask has been cleared by this point, so we can't use it.
       However, since monsters don't wield armor, we don't have to guard
       against that and can get away with a blanket worn-mask value. */
    switch (w_blocks(obj, ~0)) {
    case INVIS:
        mon.invis_blkd = on ? 1 : 0;
        mon.minvis = on ? 0 : mon.perminvis;
        break;
    default:
        break;
    }

    if (!on && mon === game.u.usteed && obj.otyp === O.SADDLE)
        yield { newcham_async: () => dismount_steed(DISMOUNT_FELL),
                what: 'dismount_steed()' };

    /* if couldn't see it but now can, or vice versa, update display */
    if (!silently && (unseen ^ !canseemon(mon)))
        newsym(mon.mx, mon.my);
}

// C ref: worn.c find_mac()
export function find_mac(mon) {
    let base = mon.data.ac;
    const mwflags = mon.misc_worn_check || 0;

    for (const obj of minv(mon)) {
        if ((obj.owornmask || 0) & mwflags) {
            if (obj.otyp === O.AMULET_OF_GUARDING)
                base -= 2; /* fixed amount, not impacted by erosion */
            else
                base -= ARM_BONUS(obj);
            /* since ARM_BONUS is positive, subtracting it increases AC */
        }
    }
    /* same cap as for hero [find_ac(do_wear.c)] */
    if (Math.abs(base) > AC_MAX)
        base = sgn(base) * AC_MAX;
    return base;
}

/*
 * weapons are handled separately;
 * rings and eyewear aren't used by monsters
 */

// C ref: worn.c m_dowear()
/* Wear the best object of each type that the monster has.  During creation,
 * the monster can put everything on at once; otherwise, wearing takes time.
 * This doesn't affect monster searching for objects--a monster may very well
 * search for objects it would not want to wear, because we don't want to
 * check which_armor() each round.
 *
 * We'll let monsters put on shirts and/or suits under worn cloaks, but
 * not shirts under worn suits.  This is somewhat arbitrary, but it's
 * too tedious to have them remove and later replace outer garments,
 * and preventing suits under cloaks makes it a little bit too easy for
 * players to influence what gets worn.  Putting on a shirt underneath
 * already worn body armor is too obviously buggy...
 *
 * With creation set this is synchronous (see the top of this file), so
 * synchronous callers may call it without await.  The C body is the
 * generator m_dowear_slots() below; each yield is one m_dowear_type() call,
 * so every condition is tested after the previous slot is done, as in C.
 */
export function m_dowear(mon, creation) {
    if (creation) {
        for (const [flag, racialexception] of m_dowear_slots(mon, creation))
            run_msgs_sync(m_dowear_type(mon, flag, creation, racialexception));
        return undefined;
    }
    return (async () => {
        for (const [flag, racialexception] of m_dowear_slots(mon, creation))
            await run_msgs(m_dowear_type(mon, flag, creation, racialexception));
    })();
}

/* C ref: worn.c m_dowear() body; yields [flag, racialexception] for each
   m_dowear_type(mon, flag, creation, racialexception) call */
function* m_dowear_slots(mon, creation) {
    let can_wear_armor;
    const RACE_EXCEPTION = true;

    /* Note the restrictions here are the same as in dowear in do_wear.c
     * except for the additional restriction on intelligence.  (Players
     * are always intelligent, even if polymorphed).
     */
    if (verysmall(mon.data) || nohands(mon.data) || is_animal(mon.data))
        return;
    /* give mummies a chance to wear their wrappings
     * and let skeletons wear their initial armor */
    if (mindless(mon.data)
        && (!creation || (mon.data.mlet !== M.S_MUMMY
                          && mon.data !== mons[M.PM_SKELETON])))
        return;

    yield [W_AMUL, false];
    can_wear_armor = !cantweararm(mon.data); /* for suit, cloak, shirt */
    /* can't put on shirt if already wearing suit */
    if (can_wear_armor && !((mon.misc_worn_check || 0) & W_ARM))
        yield [W_ARMU, false];
    /* WrappingAllowed() makes any size between small and huge eligible;
       treating small as a special case allows hobbits, gnomes, and
       kobolds to wear all cloaks; large and huge allows giants and such
       to wear mummy wrappings but not other cloaks */
    if (can_wear_armor || WrappingAllowed(mon.data))
        yield [W_ARMC, false];
    yield [W_ARMH, false];
    if (!MON_WEP(mon) || !bimanual(MON_WEP(mon)))
        yield [W_ARMS, false];
    yield [W_ARMG, false];
    if (!slithy(mon.data) && mon.data.mlet !== M.S_CENTAUR)
        yield [W_ARMF, false];
    if (can_wear_armor)
        yield [W_ARM, false];
    else
        yield [W_ARM, RACE_EXCEPTION];
}

// C ref: worn.c m_dowear_type()
function* m_dowear_type(
    mon,
    flag,             /* wornmask value */
    creation,         /* no wear messages when mon is being created */
    racialexception)  /* small monsters that are allowed for player
                       * races (gnomes) can wear suits */
{
    let old, best;
    let oldmask = 0;
    let m_delay = 0;
    const sawmon = canseemon(mon), sawloc = cansee(mon.mx, mon.my);
    let autocurse;
    let nambuf = null;

    if (mon.mfrozen)
        return; /* probably putting previous item on */

    /* Get a copy of monster's name before altering its visibility;
       only the "Suddenly you cannot see" message below uses it, which needs
       !creation and sawmon (mon was seen and now isn't), so it isn't
       formatted otherwise */
    if (!creation && sawmon)
        nambuf = See_invisible() ? Monnam(mon) : mon_nam(mon);

    old = which_armor(mon, flag);
    if (old && old.cursed)
        return;
    if (old && flag === W_AMUL && old.otyp !== O.AMULET_OF_GUARDING)
        return; /* no amulet better than life-saving or reflection */
    best = old;

    outer: for (const obj of minv(mon)) {
        switch (flag) {
        case W_AMUL:
            if (obj.oclass !== O.AMULET_CLASS
                || (obj.otyp !== O.AMULET_OF_LIFE_SAVING
                    && obj.otyp !== O.AMULET_OF_REFLECTION
                    && obj.otyp !== O.AMULET_OF_GUARDING))
                continue;
            /* for 'best' to be non-Null, it must be an amulet of guarding;
               life-saving and reflection don't get here due to early return
               and other amulets of guarding can't be any better */
            if (!best || obj.otyp !== O.AMULET_OF_GUARDING) {
                best = obj;
                if (best.otyp !== O.AMULET_OF_GUARDING)
                    break outer; /* life-saving or reflection; use it */
            }
            continue; /* skip post-switch armor handling */
        case W_ARMU:
            if (!is_shirt(obj))
                continue;
            break;
        case W_ARMC:
            if (!is_cloak(obj))
                continue;
            /* mummy wrapping is only cloak allowed when bigger than human */
            if (mon.data.msize > M.MZ_HUMAN && obj.otyp !== O.MUMMY_WRAPPING)
                continue;
            /* avoid mummy wrapping if it will allow hero to see mon (unless
               this is a new mummy; an invisible one is feasible via ^G) */
            if (mon.minvis && w_blocks(obj, W_ARMC) === INVIS
                && !See_invisible() && !creation)
                continue;
            break;
        case W_ARMH:
            if (!is_helmet(obj))
                continue;
            /* changing alignment is not implemented for monsters;
               priests and minions could change alignment but wouldn't
               want to, so they reject helms of opposite alignment */
            if (obj.otyp === O.HELM_OF_OPPOSITE_ALIGNMENT
                && (mon.ispriest || mon.isminion))
                continue;
            /* (flimsy exception matches polyself handling) */
            if (has_horns(mon.data) && !is_flimsy(obj))
                continue;
            break;
        case W_ARMS:
            if (!is_shield(obj))
                continue;
            break;
        case W_ARMG:
            if (!is_gloves(obj))
                continue;
            break;
        case W_ARMF:
            if (!is_boots(obj))
                continue;
            break;
        case W_ARM:
            if (!is_suit(obj))
                continue;
            if (racialexception && (racial_exception(mon, obj) < 1))
                continue;
            break;
        }
        if (obj.owornmask)
            continue;
        /* I'd like to define a VISIBLE_ARM_BONUS which doesn't assume the
         * monster knows obj->spe, but if I did that, a monster would keep
         * switching forever between two -2 caps since when it took off one
         * it would forget spe and once again think the object is better
         * than what it already has.
         */
        if (best && (ARM_BONUS(best) + extra_pref(mon, best)
                     >= ARM_BONUS(obj) + extra_pref(mon, obj)))
            continue;
        best = obj;
    }
    /* outer_break: */
    if (!best || best === old)
        return;

    /* same auto-cursing behavior as for hero */
    autocurse = ((best.otyp === O.HELM_OF_OPPOSITE_ALIGNMENT
                  || best.otyp === O.DUNCE_CAP) && !best.cursed);
    /* if wearing a cloak, account for the time spent removing
       and re-wearing it when putting on a suit or shirt */
    if ((flag === W_ARM || flag === W_ARMU)
        && ((mon.misc_worn_check || 0) & W_ARMC))
        m_delay += 2;
    /* when upgrading a piece of armor, account for time spent
       taking off current one */
    if (old) {
        m_delay += objects[old.otyp].oc_delay;

        oldmask = old.owornmask; /* needed later by artifact_light() */
        old.owornmask = 0; /* avoid doname() showing "(being worn)" */
    }

    if (!creation) {
        if (sawmon) {
            let buf, oldarm, newarm;

            /* "<Mon> [removes <oldarm> and ]puts on <newarm>."
               uses accessory verbs for armor but we can live with that */
            if (old) {
                oldarm = distant_name(old, doname);
                buf = ` removes ${oldarm} and`;
            } else {
                buf = oldarm = '';
            }
            newarm = distant_name(best, doname);
            /* a monster will swap an item of the same type as the one it
               is replacing when the enchantment is better;
               if newarm and oldarm have identical descriptions, substitute
               "another <newarm>" for "a|an <newarm>" */
            if (!strcmpi(newarm, oldarm)) {
                if (!strncmpi(newarm, "a ", 2))
                    newarm = newarm.replace("a ", "another ");
                else if (!strncmpi(newarm, "an ", 3))
                    newarm = newarm.replace("an ", "another ");
            }
            yield `${Monnam(mon)}${buf} puts on ${newarm}.`; /* pline_mon() */
            if (autocurse)
                throw new Error('m_dowear_type(): autocurse glow message not ported yet');
        } /* can see it */
        m_delay += objects[best.otyp].oc_delay;
        mon.mfrozen = m_delay;
        if (mon.mfrozen)
            mon.mcanmove = 0;
    }
    if (old) {
        yield* update_mon_extrinsics_g(mon, old, false, creation);

        /* owornmask was cleared above but artifact_light() expects it */
        old.owornmask = oldmask;
        if (old.lamplit && artifact_light(old))
            end_burn(old, false);
        old.owornmask = 0;
    }
    mon.misc_worn_check = (mon.misc_worn_check || 0) | flag;
    best.owornmask = (best.owornmask || 0) | flag;
    if (autocurse)
        curse(best);
    if (artifact_light(best) && !best.lamplit) {
        begin_burn(best, false);
        vision_recalc(1);
        if (!creation && best.lamplit && cansee(mon.mx, mon.my)) {
            const adesc = arti_light_description(best);

            if (sawmon) /* could already see monster */
                yield `${Yname2(best)} ${otense(best, "begin")} to shine ${adesc}.`;
            else if (canseemon(mon)) /* didn't see it until new light */
                yield `${Yname2(best)} ${otense(best, "are")} shining ${adesc}.`;
            else if (sawloc) /* saw location but not invisible monster */
                yield `Something begins to shine ${adesc}.`;
            else /* didn't see location until new light */
                yield `Something is shining ${adesc}.`;
        }
    }
    yield* update_mon_extrinsics_g(mon, best, true, creation);
    /* if couldn't see it but now can, or vice versa */
    if (!creation && (sawmon ^ canseemon(mon))) {
        if (mon.minvis && !See_invisible()) {
            yield `Suddenly you cannot see ${nambuf}.`;
            discover_object(best.otyp, true, true, true); /* makeknown() */
        /* } else if (!mon->minvis) {
         *     pline("%s suddenly appears!", Amonnam(mon)); */
        }
    }
}

/* C ref: pline.c You_hear() -- worn.c generators yield { you_hear: line }
   where C calls You_hear() */
async function You_hear_wn(line) {
    const u = game.u;
    const P = u.uprops[DEAF];
    const Deaf = !!(P.intrinsic || P.extrinsic || u.uroleplay?.deaf);

    if ((Deaf && !Unaware()) || !game.flags.acoustics)
        return;
    if (u.uinwater) /* Underwater */
        await pline(`You barely hear ${line}`);
    else if (Unaware())
        await pline(`You dream that you hear ${line}`);
    else
        await pline(`You hear ${line}`); /* Deaf-aware */
}

// print one message yielded by a worn.c generator
export async function worn_pline(msg) {
    if (msg?.newcham_async) /* an async callee (see run_msgs()) */
        await msg.newcham_async();
    else if (typeof msg === 'object' && msg.you_hear !== undefined)
        await You_hear_wn(msg.you_hear);
    else
        await pline(msg);
}

/* C ref: worn.c m_lose_armor() */
function* m_lose_armor_g(mon, obj, polyspot) {
    yield* extract_from_minvent_g(mon, obj, true, false);
    place_object(obj, mon.mx, mon.my);
    if (polyspot)
        bypass_obj(obj);
    /* call stackobj() if we ever drop anything that can merge */
    newsym(mon.mx, mon.my);
}

/* C ref: obj.h Is_dragon_scales() ... Dragon_mail_to_pm() */
function Is_dragon_scales(o) {
    return o.otyp >= O.GRAY_DRAGON_SCALES && o.otyp <= O.YELLOW_DRAGON_SCALES;
}
function Is_dragon_mail(o) {
    return o.otyp >= O.GRAY_DRAGON_SCALE_MAIL
           && o.otyp <= O.YELLOW_DRAGON_SCALE_MAIL;
}
function Dragon_scales_to_pm(o) {
    return mons[M.PM_GRAY_DRAGON + o.otyp - O.GRAY_DRAGON_SCALES];
}
function Dragon_mail_to_pm(o) {
    return mons[M.PM_GRAY_DRAGON + o.otyp - O.GRAY_DRAGON_SCALE_MAIL];
}
// C ref: worn.c mon_break_armor()
/* the monster's new form (mon->data) may break, slip out of or drop its
   worn armor and saddle, or stop carrying the hero */
export async function mon_break_armor(mon, polyspot) {
    for (const msg of mon_break_armor_g(mon, polyspot))
        await worn_pline(msg);
}
/* the body of mon_break_armor(); yields its messages */
export function* mon_break_armor_g(mon, polyspot) {
    let otmp;
    const mdat = mon.data;
    const vis = cansee(mon.mx, mon.my),
          handless_or_tiny = (nohands(mdat) || verysmall(mdat));
    let noride = false;
    const pronoun = mhim(mon), ppronoun = mhis(mon);

    if (breakarm(mdat)) {
        if ((otmp = which_armor(mon, W_ARM)) != null) {
            if ((Is_dragon_scales(otmp) && mdat === Dragon_scales_to_pm(otmp))
                || (Is_dragon_mail(otmp) && mdat === Dragon_mail_to_pm(otmp))) {
                ; /* no message here;
                     "the dragon merges with his scaly armor" is odd
                     and the monster's previous form is already gone */
            } else {
                /* Soundeffect(se_cracking_sound, 100); */
                if (vis)
                    yield `${Monnam(mon)} breaks out of ${ppronoun} armor!`;
                else
                    yield { you_hear: "a cracking sound." };
            }
            yield* m_useup_g(mon, otmp);
        }
        if ((otmp = which_armor(mon, W_ARMC)) != null
            /* mummy wrapping adapts to small and very big sizes */
            && (otmp.otyp !== O.MUMMY_WRAPPING || !WrappingAllowed(mdat))) {
            if (otmp.oartifact) {
                if (vis)
                    yield `${s_suffix(Monnam(mon))} ${cloak_simple_name(otmp)} falls off!`;
                yield* m_lose_armor_g(mon, otmp, polyspot);
            } else {
                /* Soundeffect(se_ripping_sound, 100); */
                if (vis)
                    yield `${s_suffix(Monnam(mon))} ${cloak_simple_name(otmp)} tears apart!`;
                else
                    yield { you_hear: "a ripping sound." };
                yield* m_useup_g(mon, otmp);
            }
        }
        if ((otmp = which_armor(mon, W_ARMU)) != null) {
            if (vis)
                yield `${s_suffix(Monnam(mon))} shirt rips to shreds!`;
            else
                yield { you_hear: "a ripping sound." };
            yield* m_useup_g(mon, otmp);
        }
    } else if (sliparm(mdat)) {
        /* sliparm checks whirly, noncorporeal, and small or under */
        const passes_thru_clothes = !(mdat.msize <= M.MZ_SMALL);

        if ((otmp = which_armor(mon, W_ARM)) != null) {
            /* Soundeffect(se_thud, 50); */
            if (vis)
                yield `${s_suffix(Monnam(mon))} armor falls around ${pronoun}!`;
            else
                yield { you_hear: "a thud." };
            yield* m_lose_armor_g(mon, otmp, polyspot);
        }
        if ((otmp = which_armor(mon, W_ARMC)) != null
            /* mummy wrapping adapts to small and very big sizes */
            && (otmp.otyp !== O.MUMMY_WRAPPING || !WrappingAllowed(mdat))) {
            if (vis) {
                if (is_whirly(mon.data))
                    yield `${s_suffix(Monnam(mon))} ${cloak_simple_name(otmp)} falls, unsupported!`;
                else
                    yield `${Monnam(mon)} shrinks out of ${ppronoun} ${cloak_simple_name(otmp)}!`;
            }
            yield* m_lose_armor_g(mon, otmp, polyspot);
        }
        if ((otmp = which_armor(mon, W_ARMU)) != null) {
            if (vis) {
                if (passes_thru_clothes)
                    yield `${Monnam(mon)} seeps right through ${ppronoun} shirt!`;
                else
                    yield `${Monnam(mon)} becomes much too small for ${ppronoun} shirt!`;
            }
            yield* m_lose_armor_g(mon, otmp, polyspot);
        }
    }
    if (handless_or_tiny) {
        /* [caller needs to handle weapon checks] */
        if ((otmp = which_armor(mon, W_ARMG)) != null) {
            if (vis)
                yield `${Monnam(mon)} drops ${ppronoun} gloves${
                    MON_WEP(mon) ? " and weapon" : ""}!`;
            yield* m_lose_armor_g(mon, otmp, polyspot);
        }
        if ((otmp = which_armor(mon, W_ARMS)) != null) {
            /* Soundeffect(se_clank, 50); */
            if (vis)
                yield `${Monnam(mon)} can no longer hold ${ppronoun} shield!`;
            else
                yield { you_hear: "a clank." };
            yield* m_lose_armor_g(mon, otmp, polyspot);
        }
    }
    if (handless_or_tiny || has_horns(mdat)) {
        if ((otmp = which_armor(mon, W_ARMH)) != null
            /* flimsy test for horns matches polyself handling */
            && (handless_or_tiny || !is_flimsy(otmp))) {
            if (vis)
                yield `${s_suffix(Monnam(mon))} helmet falls to the ${
                    surface(mon.mx, mon.my)}!`;
            else
                yield { you_hear: "a clank." };
            yield* m_lose_armor_g(mon, otmp, polyspot);
        }
    }
    if (handless_or_tiny || slithy(mdat) || mdat.mlet === M.S_CENTAUR) {
        if ((otmp = which_armor(mon, W_ARMF)) != null) {
            if (vis) {
                if (is_whirly(mon.data))
                    yield `${s_suffix(Monnam(mon))} boots fall away!`;
                else
                    yield `${s_suffix(Monnam(mon))} boots ${
                        verysmall(mdat) ? "slide" : "are pushed"} off ${ppronoun} feet!`;
            }
            yield* m_lose_armor_g(mon, otmp, polyspot);
        }
    }
    if (!can_saddle(mon)) {
        if ((otmp = which_armor(mon, W_SADDLE)) != null) {
            yield* m_lose_armor_g(mon, otmp, polyspot);
            if (vis)
                yield `${s_suffix(Monnam(mon))} saddle falls off.`;
        }
        if (mon === game.u.usteed)
            noride = true;
    }
    if (noride || (mon === game.u.usteed && !can_ride(mon)))
        /* "You can no longer ride <mon>.", instapetrify(), dismount_steed() */
        throw new Error('mon_break_armor(): no longer riding the steed not ported yet');
    return;
}

// C ref: worn.c which_armor()
export function which_armor(mon, flag) {
    if (mon === game.youmonst) {
        switch (flag) {
        case W_ARM:
            return game.uarm || null;
        case W_ARMC:
            return game.uarmc || null;
        case W_ARMH:
            return game.uarmh || null;
        case W_ARMS:
            return game.uarms || null;
        case W_ARMG:
            return game.uarmg || null;
        case W_ARMF:
            return game.uarmf || null;
        case W_ARMU:
            return game.uarmu || null;
        default:
            impossible("bad flag in which_armor");
            return null;
        }
    } else {
        for (const obj of minv(mon))
            if ((obj.owornmask || 0) & flag)
                return obj;
        return null;
    }
}

// C ref: worn.c extra_pref()
function extra_pref(mon, obj) {
    /* currently only does speed boots, but might be expanded if monsters
     * get to use more armor abilities
     */
    if (obj) {
        if (obj.otyp === O.SPEED_BOOTS && mon.permspeed !== MFAST)
            return 20;
    }
    return 0;
}

// C ref: worn.c racial_exception()
/*
 * Exceptions to things based on race.
 * Correctly checks polymorphed player race.
 * Returns:
 *       0 No exception, normal rules apply.
 *       1 If the race/object combination is acceptable.
 *      -1 If the race/object combination is unacceptable.
 */
export function racial_exception(mon, obj) {
    const ptr = raceptr(mon);

    /* Acceptable Exceptions: */
    /* Allow hobbits to wear elven armor - LoTR */
    if (ptr === mons[M.PM_HOBBIT] && is_elven_armor(obj))
        return 1;
    /* Unacceptable Exceptions: */
    /* Checks for object that certain races should never use go here */
    /*  return -1; */

    return 0;
}

/* an object chain as an array: JS keeps invent and the migrating lists as
   nobj chains and floor piles, minvent and container contents as arrays */

// C ref: worn.c clear_bypass()
/* clear bypass bits for an object chain, plus contents if applicable */
function clear_bypass(objchn) {
    for (const o of objchain_items(objchn)) {
        o.bypass = 0;
        if (o.cobj && o.cobj.length) /* Has_contents() */
            clear_bypass(o.cobj);
    }
}

// C ref: worn.c clear_bypasses()
/* all objects with their bypass bit set should now be reset to normal;
   this can be a relatively expensive operation so is only called if
   svc.context.bypasses is set */
export function clear_bypasses() {
    const g = game;
    /*
     * 'Object' bypass is also used for one monster function:
     * polymorph control of long worms.  Activated via setting
     * svc.context.bypasses even if no specific object has been
     * bypassed.
     */

    clear_bypass(g.level?.objects);
    clear_bypass(g.invent);
    clear_bypass(g.migrating_objs);
    clear_bypass(g.level?.buriedobjlist);
    clear_bypass(g.billobjs);
    clear_bypass(g.objs_deleted);
    for (const mtmp of g.level?.monsters || []) {
        if (mtmp.dead) /* DEADMONSTER() */
            continue;
        clear_bypass(mtmp.minvent);
        /* long worm created by polymorph has mon->mextra->mcorpsenm set
           to PM_LONG_WORM to flag it as not being subject to further
           polymorph; clearing mcorpsenm reverts worm to normal */
        if (mtmp.data === mons[M.PM_LONG_WORM] && mtmp.mextra
            && mtmp.mextra.mcorpsenm !== undefined
            && mtmp.mextra.mcorpsenm !== NON_PM) /* has_mcorpsenm() */
            mtmp.mextra.mcorpsenm = NON_PM;
    }
    for (let mtmp = g.migrating_mons; mtmp; mtmp = mtmp.nmon)
        clear_bypass(mtmp.minvent);
    /* this is a no-op since mydogs is only non-Null during level change or
       final ascension and we aren't called at those times, but be thorough */
    for (let mtmp = g.mydogs; mtmp; mtmp = mtmp.nmon)
        clear_bypass(mtmp.minvent);
    /* ball and chain can be "floating", not on any object chain (when
       hero is swallowed by an engulfing monster, for instance) */
    if (g.uball)
        g.uball.bypass = 0;
    if (g.uchain)
        g.uchain.bypass = 0;

    g.context.bypasses = false;
}

// C ref: worn.c bypass_objlist()
export function bypass_objlist(objchain, on) { /* TRUE => set, FALSE => clear */
    const list = objchain_items(objchain);
    if (on && list.length)
        game.context.bypasses = true;
    for (const o of list)
        o.bypass = on ? 1 : 0;
}

// C ref: worn.c bypass_obj()
/* set an object's bypass bit so that it will be skipped by later calls */
export function bypass_obj(obj) {
    obj.bypass = 1;
    game.context.bypasses = true;
}

// C ref: worn.c nxt_unbypassed_obj()
/* return the first object without its bypass bit set; set that bit
   before returning so that successive calls will find further objects */
export function nxt_unbypassed_obj(objchain) {
    for (const o of objchain_items(objchain)) {
        if (!o.bypass) {
            bypass_obj(o);
            return o;
        }
    }
    return null;
}
