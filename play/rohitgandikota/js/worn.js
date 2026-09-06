// worn.js — what a monster or the hero currently has on.
// C ref: src/worn.c
//
// Nothing here draws.

import { pline_mon } from './pline.js';
import { learnwand } from './zap.js';
import { see_wsegs } from './worm.js';
import { game } from './gstate.js';
import { sgn, s_suffix } from './hacklib.js';
import { MON_WEP, DEADMONSTER } from './monst.js';
import { OBJ_MINVENT } from './const.js';
import { impossible } from './pline.js';
import { artifact_light } from './artifact.js';
import { begin_burn, end_burn } from './timeout.js';
import { arti_light_description } from './light.js';
import { cansee, vision_recalc } from './vision.js';
import { obj_no_longer_held } from './do.js';
import { mwepgone } from './weapon.js';
import { check_gear_next_turn } from './mon.js';
import { m_useup } from './mthrowu.js';
import { dismount_steed } from './steed.js';
import { ARM_SUIT, ARM_SHIELD, ARM_HELM, ARM_GLOVES, ARM_BOOTS, ARM_CLOAK,
         ARM_SHIRT } from './const.js';
import { W_ARM, W_ARMC, W_ARMH, W_ARMS, W_ARMG, W_ARMF, W_ARMU, W_AMUL,
         W_RINGL, W_RINGR, W_WEP, W_SWAPWEP, W_QUIVER, W_TOOL, W_BALL,
         W_CHAIN, W_ARMOR, W_ART, W_SADDLE, I_SPECIAL, BOLT_LIM, BLINDED,
         AC_MAX, PRONOUN_HALLU, DISMOUNT_FELL, NH_BLACK } from './const.js';
import { OCLASSES, ONAMES } from './objects_data.js';
import { MFLAGS, MONSYMS, PMNAMES } from './monst_data.js';
import { verysmall, nohands, is_animal, mindless, slithy, cantweararm,
         has_horns, breakarm, sliparm, is_whirly, mhim,
         pronoun_gender } from './mondata.js';
import { is_shirt, is_cloak, is_helmet, is_shield, is_gloves, is_boots,
         is_suit, is_flimsy, bimanual, WrappingAllowed, Has_contents } from './obj.js';
import { MCORPSENM, NON_PM } from './const.js';
import { ARM_BONUS, PROP_KEYS, cancel_doff, cloak_simple_name }
    from './do_wear.js';
import { is_weptool, place_object, curse } from './mkobj.js';
import { set_twoweap } from './wield.js';
import { update_inventory, obj_extract_self } from './invent.js';
import { Monnam, mon_nam, hcolor } from './do_name.js';
import { distant_name, doname, simpleonames, otense, Yname2 } from './objnam.js';
import { canseemon, newsym, pline } from './display.js';
import { See_invisible } from './youprop.js';
import { makeknown } from './o_init.js';
import { ART_EYES_OF_THE_OVERWORLD } from './artilist_data.js';
import { genders as genders_tbl } from './role_data.js';
import { set_artifact_intrinsic } from './artifact.js';
import { INVIS, FAST, ANTIMAGIC, REFLECTING, PROTECTION, CLAIRVOYANT,
         STEALTH, TELEPAT, LEVITATION, FLYING, WWALKING, DISPLACED,
         FUMBLING, JUMPING, FIRE_RES, COLD_RES, SLEEP_RES, DISINT_RES,
         SHOCK_RES, POISON_RES, ACID_RES, STONE_RES } from './const.js';

/* src/worn.c:14 — the worn[] table: each W_* slot mask and the hero global
   holding what is worn there. C stores `struct obj **w_obj` pointers to
   globals (&uarm, &uwep, ...); the port's equivalents live as fields on
   game.u, so w_obj carries the field name and setworn reads and writes
   game.u[w_obj]. Same rows, same order. */
const worn = [
    { w_mask: W_ARM,     w_obj: 'uarm',     w_what: 'suit' },
    { w_mask: W_ARMC,    w_obj: 'uarmc',    w_what: 'cloak' },
    { w_mask: W_ARMH,    w_obj: 'uarmh',    w_what: 'helmet' },
    { w_mask: W_ARMS,    w_obj: 'uarms',    w_what: 'shield' },
    { w_mask: W_ARMG,    w_obj: 'uarmg',    w_what: 'gloves' },
    { w_mask: W_ARMF,    w_obj: 'uarmf',    w_what: 'boots' },
    { w_mask: W_ARMU,    w_obj: 'uarmu',    w_what: 'shirt' },
    { w_mask: W_RINGL,   w_obj: 'uleft',    w_what: 'left ring' },
    { w_mask: W_RINGR,   w_obj: 'uright',   w_what: 'right ring' },
    { w_mask: W_WEP,     w_obj: 'uwep',     w_what: 'weapon' },
    { w_mask: W_SWAPWEP, w_obj: 'uswapwep', w_what: 'alternate weapon' },
    { w_mask: W_QUIVER,  w_obj: 'uquiver',  w_what: 'quiver' },
    { w_mask: W_AMUL,    w_obj: 'uamul',    w_what: 'amulet' },
    { w_mask: W_TOOL,    w_obj: 'ublindf',  w_what: 'facewear' },
    { w_mask: W_BALL,    w_obj: 'uball',    w_what: 'chained ball' },
    { w_mask: W_CHAIN,   w_obj: 'uchain',   w_what: 'attached chain' },
];

/* The flat game.u.uprops map stores, under each PROP_KEYS name, C's
   u.uprops[p].extrinsic slot mask itself (a nonzero number, so every
   truthiness read keeps working); the key is deleted when the mask empties.
   game.u.blocked carries the matching blocked slot masks. */

function update_blocked(u, prop, mask, on) {
    const key = PROP_KEYS[prop];
    if (!key)
        return;
    const old = u.blocked?.[key] || 0;
    const next = on ? old | mask : old & ~mask;
    if (next)
        (u.blocked ||= {})[key] = next;
    else if (u.blocked)
        delete u.blocked[key];
}

// src/worn.c:50 recalc_telepat_range() — range of unblind telepathy.
export function recalc_telepat_range() {
    let nobjs = 0;

    for (const wp of worn) {
        const oobj = game.u[wp.w_obj];
        if (oobj && PROP_KEYS[game.objects[oobj.otyp].oc_oprop] === 'TELEPAT')
            nobjs++;
    }
    /* Count all carried artifacts with SPFX_ESP as one. C likewise treats
       ETelepat's W_ART source as one range increment. */
    if ((game.u.uprops?.TELEPAT || 0) & W_ART)
        nobjs++;

    if (nobjs)
        game.u.unblind_telepat_range = (BOLT_LIM * BOLT_LIM) * nobjs;
    else
        game.u.unblind_telepat_range = -1;
}

// src/worn.c:73 setworn() — place obj in every slot in mask, with the
// extrinsic-property bookkeeping. monstunseesu_prop() is omitted: it clears
// mon->seenres bits and nothing in this port ever sets them, so the call
// cannot change any state yet.
export function setworn(obj, mask) {
    const u = game.u;
    let p;

    if ((mask & (W_ARM | I_SPECIAL)) === (W_ARM | I_SPECIAL)) {
        /* restoring saved game; no properties are conferred via skin */
        u.uskin = obj;
    } else {
        for (const wp of worn) {
            if (wp.w_mask & mask) {
                const oobj = u[wp.w_obj];
                /* C: impossible("Setworn: mask=...") when oobj lacks the bit */
                if (oobj) {
                    if (u.twoweap && (oobj.owornmask & (W_WEP | W_SWAPWEP)))
                        set_twoweap(false); /* u.twoweap = FALSE */
                    oobj.owornmask &= ~wp.w_mask;
                    if (wp.w_mask & ~(W_SWAPWEP | W_QUIVER)) {
                        p = game.objects[oobj.otyp].oc_oprop;
                        if (p && PROP_KEYS[p]) {
                            const left = ((u.uprops?.[PROP_KEYS[p]] || 0)
                                          & ~wp.w_mask);
                            if (left)
                                u.uprops[PROP_KEYS[p]] = left;
                            else if (u.uprops)
                                delete u.uprops[PROP_KEYS[p]];
                        }
                        if ((p = w_blocks(oobj, mask)) !== 0)
                            update_blocked(u, p, wp.w_mask, false);
                        if (oobj.oartifact)
                            set_artifact_intrinsic(oobj, false, wp.w_mask);
                    }
                    /* in case wearing or removal is in progress or removal
                       is pending (via 'A' command for multiple items) */
                    cancel_doff(oobj, wp.w_mask);
                }
                u[wp.w_obj] = obj;
                if (obj) {
                    obj.owornmask |= wp.w_mask;
                    /* Prevent getting/blocking intrinsics from wielding
                     * potions, through the quiver, etc.
                     * Allow weapon-tools, too. */
                    if (wp.w_mask & ~(W_SWAPWEP | W_QUIVER)) {
                        if (obj.oclass === OCLASSES.WEAPON_CLASS
                            || is_weptool(obj, game.objects)
                            || mask !== W_WEP) {
                            p = game.objects[obj.otyp].oc_oprop;
                            if (p && PROP_KEYS[p])
                                (u.uprops ||= {})[PROP_KEYS[p]] =
                                    (u.uprops[PROP_KEYS[p]] || 0) | wp.w_mask;
                            if ((p = w_blocks(obj, mask)) !== 0)
                                update_blocked(u, p, wp.w_mask, true);
                        }
                        if (obj.oartifact)
                            set_artifact_intrinsic(obj, true, wp.w_mask);
                    }
                }
            }
        }
        if (obj && (obj.owornmask & W_ARMOR) !== 0)
            (u.uroleplay ||= {}).nudist = false;
        /* tux -> tuxedo -> "monkey suit" -> monk's suit */
        game.iflags.tux_penalty = !!(u.uarm && game.urole?.name?.m === 'Monk'
                                     && game.urole?.spelarmr);
    }
    if ((game.flags.weaponstatus && (mask & W_WEP) !== 0)
        || (game.flags.armorstatus && (mask & W_ARMOR) !== 0))
        (game.disp ||= {}).botl = true;
    update_inventory();
    recalc_telepat_range();
}

// src/worn.c:150 setnotworn() — called e.g. when obj is destroyed.
export function setnotworn(obj) {
    const u = game.u;
    let p;
    let unworn = 0;

    if (!obj)
        return;
    if (u.twoweap && (obj === u.uwep || obj === u.uswapwep))
        set_twoweap(false); /* u.twoweap = FALSE */
    for (const wp of worn)
        if (obj === u[wp.w_obj]) {
            /* in case wearing or removal is in progress or removal
               is pending (via 'A' command for multiple items) */
            cancel_doff(obj, wp.w_mask);

            u[wp.w_obj] = null;
            unworn |= wp.w_mask;
            p = game.objects[obj.otyp].oc_oprop;
            if (p && PROP_KEYS[p]) {
                const left = (u.uprops?.[PROP_KEYS[p]] || 0) & ~wp.w_mask;
                if (left)
                    u.uprops[PROP_KEYS[p]] = left;
                else if (u.uprops)
                    delete u.uprops[PROP_KEYS[p]];
            }
            /* monstunseesu_prop(p): omitted, see setworn */
            obj.owornmask &= ~wp.w_mask;
            if (obj.oartifact)
                set_artifact_intrinsic(obj, false, wp.w_mask);
            if ((p = w_blocks(obj, wp.w_mask)) !== 0)
                update_blocked(u, p, wp.w_mask, false);
        }
    if (!u.uarm)
        game.iflags.tux_penalty = false;
    if ((game.flags.weaponstatus && (unworn & W_WEP) !== 0)
        || (game.flags.armorstatus && (unworn & W_ARMOR) !== 0))
        (game.disp ||= {}).botl = true;
    update_inventory();
    recalc_telepat_range();
}

// src/worn.c which_armor() — the object worn in a given slot, or null.
//
// Monster equipment uses the same slot masks as hero equipment, but scans the
// monster's own inventory instead of the hero's worn-object fields.
export function which_armor(mon, flag) {
    if (mon === game.youmonst) {
        switch (flag) {
        case W_ARM:  return game.u.uarm  || null;
        case W_ARMC: return game.u.uarmc || null;
        case W_ARMH: return game.u.uarmh || null;
        case W_ARMS: return game.u.uarms || null;
        case W_ARMG: return game.u.uarmg || null;
        case W_ARMF: return game.u.uarmf || null;
        case W_ARMU: return game.u.uarmu || null;
        default:     return null;   /* impossible("bad flag in which_armor") */
        }
    } else {
        for (const obj of (mon.minvent || []))
            if (obj.owornmask & flag)
                return obj;
        return null;
    }
}

// src/worn.c:757 m_dowear() — try every armour slot in the C's order.
//
// Reached by 20% of random games (tools/generalize.mjs). Neither this nor
// m_dowear_type contains a single rn2/rnd/rn1, so it cannot move the RNG
// stream directly; what it does is set owornmask and misc_worn_check, which
// nothing else in this port sets, and which which_armor(), can_touch_safely()
// and mfndpos()' dig arm all read.
export function m_dowear(mon, creation) {
    const RACE_EXCEPTION = true;
    const data = game.mons[mon.mnum];

    /* Note the restrictions here are the same as in dowear in do_wear.c
     * except for the additional restriction on intelligence. */
    if (verysmall(data) || nohands(data) || is_animal(data))
        return;
    /* give mummies a chance to wear their wrappings
     * and let skeletons wear their initial armor */
    if (mindless(data)
        && (!creation || (data.mlet !== MONSYMS.S_MUMMY
                          && data.pmidx !== PMNAMES.PM_SKELETON)))
        return;

    const can_wear_armor = !cantweararm(data); /* for suit, cloak, shirt */
    if (!creation)
        return m_dowear_runtime(mon, can_wear_armor);

    m_dowear_type(mon, W_AMUL, true, false);
    /* can't put on shirt if already wearing suit */
    if (can_wear_armor && !(mon.misc_worn_check & W_ARM))
        m_dowear_type(mon, W_ARMU, true, false);
    if (can_wear_armor || WrappingAllowed(data))
        m_dowear_type(mon, W_ARMC, true, false);
    m_dowear_type(mon, W_ARMH, true, false);
    if (!MON_WEP(mon) || !bimanual(MON_WEP(mon)))
        m_dowear_type(mon, W_ARMS, true, false);
    m_dowear_type(mon, W_ARMG, true, false);
    if (!slithy(data) && data.mlet !== MONSYMS.S_CENTAUR)
        m_dowear_type(mon, W_ARMF, true, false);
    if (can_wear_armor)
        m_dowear_type(mon, W_ARM, true, false);
    else
        m_dowear_type(mon, W_ARM, true, RACE_EXCEPTION);
}

async function m_dowear_runtime(mon, can_wear_armor) {
    const data = game.mons[mon.mnum];
    const RACE_EXCEPTION = true;

    await m_dowear_type(mon, W_AMUL, false, false);
    if (can_wear_armor && !(mon.misc_worn_check & W_ARM))
        await m_dowear_type(mon, W_ARMU, false, false);
    if (can_wear_armor || WrappingAllowed(data))
        await m_dowear_type(mon, W_ARMC, false, false);
    await m_dowear_type(mon, W_ARMH, false, false);
    if (!MON_WEP(mon) || !bimanual(MON_WEP(mon)))
        await m_dowear_type(mon, W_ARMS, false, false);
    await m_dowear_type(mon, W_ARMG, false, false);
    if (!slithy(data) && data.mlet !== MONSYMS.S_CENTAUR)
        await m_dowear_type(mon, W_ARMF, false, false);
    if (can_wear_armor)
        await m_dowear_type(mon, W_ARM, false, false);
    else
        await m_dowear_type(mon, W_ARM, false, RACE_EXCEPTION);
}

// include/monst.h:210 MON_WEP() — monsters do not wield in this port yet.

// src/worn.c:799 m_dowear_type() — pick the best item for one slot and wear it.
function m_dowear_type(mon, flag, creation, racialexception) {
    let old, best, oldmask = 0, m_delay = 0;
    const data = game.mons[mon.mnum];

    if (mon.mfrozen)
        return; /* probably putting previous item on */

    /* C copies the monster's name before looking for a better item because
       wearing one can change visibility. Keep that display-RNG side effect
       even when this slot has no candidate. */
    const sawmon = canseemon(mon);
    const sawloc = cansee(mon.mx, mon.my);
    const nambuf = See_invisible() ? Monnam(mon) : mon_nam(mon);

    old = which_armor(mon, flag);
    if (old && old.cursed)
        return;
    if (old && flag === W_AMUL && old.otyp !== ONAMES.AMULET_OF_GUARDING)
        return; /* no amulet better than life-saving or reflection */
    best = old;

    let outer_break = false;
    for (const obj of (mon.minvent || [])) {
        if (outer_break) break;
        switch (flag) {
        case W_AMUL:
            if (obj.oclass !== OCLASSES.AMULET_CLASS
                || (obj.otyp !== ONAMES.AMULET_OF_LIFE_SAVING
                    && obj.otyp !== ONAMES.AMULET_OF_REFLECTION
                    && obj.otyp !== ONAMES.AMULET_OF_GUARDING))
                continue;
            if (!best || obj.otyp !== ONAMES.AMULET_OF_GUARDING) {
                best = obj;
                if (best.otyp !== ONAMES.AMULET_OF_GUARDING) {
                    outer_break = true; /* life-saving or reflection; use it */
                    break;
                }
            }
            continue; /* skip post-switch armor handling */
        case W_ARMU:
            if (!is_shirt(obj)) continue;
            break;
        case W_ARMC:
            if (!is_cloak(obj)) continue;
            /* mummy wrapping is only cloak allowed when bigger than human */
            if (data.msize > MFLAGS.MZ_HUMAN && obj.otyp !== ONAMES.MUMMY_WRAPPING)
                continue;
            if (mon.minvis && w_blocks(obj, W_ARMC) === INVIS
                && !See_invisible() && !creation)
                continue;
            break;
        case W_ARMH:
            if (!is_helmet(obj)) continue;
            if (obj.otyp === ONAMES.HELM_OF_OPPOSITE_ALIGNMENT
                && (mon.ispriest || mon.isminion))
                continue;
            /* (flimsy exception matches polyself handling) */
            if (has_horns(data) && !is_flimsy(obj))
                continue;
            break;
        case W_ARMS:
            if (!is_shield(obj)) continue;
            break;
        case W_ARMG:
            if (!is_gloves(obj)) continue;
            break;
        case W_ARMF:
            if (!is_boots(obj)) continue;
            break;
        case W_ARM:
            if (!is_suit(obj)) continue;
            if (racialexception && (racial_exception(mon, obj) < 1))
                continue;
            break;
        }
        if (outer_break) break;
        if (obj.owornmask)
            continue;
        if (best && (ARM_BONUS(best) + extra_pref(mon, best)
                     >= ARM_BONUS(obj) + extra_pref(mon, obj)))
            continue;
        best = obj;
    }

    if (!best || best === old)
        return;

    /* same auto-cursing behavior as for hero */
    const autocurse = ((best.otyp === ONAMES.HELM_OF_OPPOSITE_ALIGNMENT
                        || best.otyp === ONAMES.DUNCE_CAP) && !best.cursed);
    /* if wearing a cloak, account for the time spent removing and re-wearing
       it when putting on a suit or shirt */
    if ((flag === W_ARM || flag === W_ARMU) && (mon.misc_worn_check & W_ARMC))
        m_delay += 2;
    if (old) {
        m_delay += game.objects[old.otyp].oc_delay;
        oldmask = old.owornmask;        /* needed later by artifact_light() */
        old.owornmask = 0;              /* avoid doname() "(being worn)" */
    }

    const finishWear = () => {
        if (!creation) {
            m_delay += game.objects[best.otyp].oc_delay;
            mon.mfrozen = m_delay;
            if (mon.mfrozen)
                mon.mcanmove = 0;
        }
        if (old) {
            update_mon_extrinsics(mon, old, false, creation);
            old.owornmask = oldmask;
            if (old.lamplit && artifact_light(old))
                end_burn(old, false);
            old.owornmask = 0;
        }
        mon.misc_worn_check |= flag;
        best.owornmask |= flag;
        if (autocurse)
            curse(best); // The two autocursing helmets finish synchronously.
        let lightMessage;
        if (artifact_light(best) && !best.lamplit) {
            begin_burn(best, false);
            vision_recalc(1);
            if (!creation && best.lamplit && cansee(mon.mx, mon.my)) {
                const adesc = arti_light_description(best);
                if (sawmon)
                    lightMessage = pline(`${Yname2(best)} ${otense(best, 'begin')} to shine ${adesc}.`);
                else if (canseemon(mon))
                    lightMessage = pline(`${Yname2(best)} ${otense(best, 'are')} shining ${adesc}.`);
                else if (sawloc)
                    lightMessage = pline(`Something begins to shine ${adesc}.`);
                else
                    lightMessage = pline(`Something is shining ${adesc}.`);
            }
        }
        const finishExtrinsics = () => {
            update_mon_extrinsics(mon, best, true, creation);
            if (!creation && sawmon !== canseemon(mon)
                && mon.minvis && !See_invisible()) {
                const message = pline(`Suddenly you cannot see ${nambuf}.`);
                makeknown(best.otyp);
                return message;
            }
            return null;
        };
        return lightMessage ? lightMessage.then(finishExtrinsics) : finishExtrinsics();
    };

    if (!creation && sawmon) {
        let prefix = '';
        let oldarm = '';
        if (old) {
            oldarm = distant_name(old, doname);
            prefix = ` removes ${oldarm} and`;
        }
        let newarm = distant_name(best, doname);
        if (newarm.toLowerCase() === oldarm.toLowerCase()) {
            if (/^a /i.test(newarm))
                newarm = `another ${newarm.slice(2)}`;
            else if (/^an /i.test(newarm))
                newarm = `another ${newarm.slice(3)}`;
        }
        let message = pline(`${Monnam(mon)}${prefix} puts on ${newarm}.`);
        if (autocurse) {
            message = message.then(() => pline(
                `${s_suffix(Monnam(mon))} ${simpleonames(best)} `
                + `${otense(best, 'glow')} ${hcolor(NH_BLACK)} for a moment.`));
        }
        return message.then(finishWear);
    }
    return finishWear();
}

// src/worn.c extra_pref() — currently only speed boots.
function extra_pref(mon, obj) {
    if (obj) {
        if (obj.otyp === ONAMES.SPEED_BOOTS && mon.permspeed !== MFAST)
            return 20;
    }
    return 0;
}

// src/worn.c racial_exception() — hobbits may wear elven armour (LoTR).
export function racial_exception(mon, obj) {
    /* raceptr(mon) is the monster's own permonst unless it is the hero */
    if (game.mons[mon.mnum].pmidx === PMNAMES.PM_HOBBIT && is_elven_armor(obj))
        return 1;
    return 0;
}

// include/obj.h:299 is_elven_armor()
export const is_elven_armor = (o) =>
    o.otyp === ONAMES.ELVEN_LEATHER_HELM || o.otyp === ONAMES.ELVEN_MITHRIL_COAT
    || o.otyp === ONAMES.ELVEN_CLOAK || o.otyp === ONAMES.ELVEN_SHIELD
    || o.otyp === ONAMES.ELVEN_BOOTS;

// src/worn.c:578 update_mon_extrinsics() — grant or revoke what an item confers.
//
// mon->mextrinsics is a bitmask of MR_* values, and res_to_mr() converts the
// first eight prop_types straight into them because include/prop.h deliberately
// orders FIRE_RES..STONE_RES to match MR_FIRE..MR_STONE.
//
// No draws.
export function update_mon_extrinsics(mon, obj, on, silently) {
    let which = game.objects[obj.otyp].oc_oprop;
    const altwhich = altprop(obj);
    const unseen = !canseemon(mon);
    let speedChange;
    const adjustSpeed = () => {
        const save_in_mklev = game.in_mklev;
        if (silently)
            game.in_mklev = true;
        const pending = mon_adjust_speed(mon, 0, obj);
        const restore = () => { game.in_mklev = save_in_mklev; };
        if (pending?.then)
            speedChange = pending.then(restore);
        else
            restore();
    };

    mon.mextrinsics = mon.mextrinsics || 0;

    if (which || altwhich) {
        for (;;) {                                          /* C's `again:` */
            if (on) {
                switch (which) {
                case INVIS:
                    mon.minvis = !mon.invis_blkd;
                    break;
                case FAST:
                    adjustSpeed();
                    break;
                /* handled elsewhere / no effect for monsters / unimplemented */
                case ANTIMAGIC: case REFLECTING: case PROTECTION:
                case CLAIRVOYANT: case STEALTH: case TELEPAT:
                case LEVITATION: case FLYING: case WWALKING:
                case DISPLACED: case FUMBLING: case JUMPING:
                    break;
                default:
                    mon.mextrinsics |= res_to_mr(which);
                    break;
                }
            } else { /* off */
                switch (which) {
                case INVIS:
                    mon.minvis = mon.perminvis;
                    break;
                case FAST:
                    adjustSpeed();
                    break;
                case FIRE_RES: case COLD_RES: case SLEEP_RES: case DISINT_RES:
                case SHOCK_RES: case POISON_RES: case ACID_RES: case STONE_RES: {
                    /* Another worn item may confer the same resistance, either
                       as its own oc_oprop or as an alternate; only clear the
                       bit when nothing else supplies it. */
                    const mask = res_to_mr(which);
                    let otmp = null;

                    for (const o of (mon.minvent || [])) {
                        if (o === obj || !o.owornmask)
                            continue;
                        if (game.objects[o.otyp].oc_oprop === which
                            || altprop(o) === which) {
                            otmp = o;
                            break;
                        }
                    }
                    if (!otmp)
                        mon.mextrinsics &= ~mask;
                    break;
                }
                default:
                    break;
                }
            }

            /* a worn alchemy smock confers BOTH poison and acid resistance,
               so the whole switch runs a second time for the other one */
            if (altwhich && which !== altwhich) {
                which = altwhich;
                continue;
            }
            break;
        }
    }

    const finish = () => {
        /* maybe_blocks: owornmask is already cleared; monsters don't wield armor. */
        if (w_blocks(obj, ~0) === INVIS) {
            mon.invis_blkd = on ? 1 : 0;
            mon.minvis = on ? 0 : mon.perminvis;
        }
        const redisplay = () => {
            if (!silently && unseen !== !canseemon(mon))
                newsym(mon.mx, mon.my);
        };
        if (!on && mon === game.u.usteed && obj.otyp === ONAMES.SADDLE)
            return dismount_steed(DISMOUNT_FELL).then(redisplay);
        redisplay();
    };
    return speedChange ? speedChange.then(finish) : finish();
}

// include/prop.h:25 res_to_mr() — the first eight props are the MR_ bits.
const res_to_mr = (r) => (FIRE_RES <= r && r <= STONE_RES) ? (1 << (r - 1)) : 0;

// src/worn.c:572 altprop() — the alchemy smock's second property.
const altprop = (o) => (o.otyp === ONAMES.ALCHEMY_SMOCK)
    ? (POISON_RES + ACID_RES - game.objects[o.otyp].oc_oprop)
    : 0;

// src/worn.c:38 w_blocks() — what wearing this SUPPRESSES.
//
// The CORNUTHAUM arm reads the hero's role, which C notes has no real effect
// for monsters since they have no clairvoyance.
function w_blocks(o, m) {
    if (o.otyp === ONAMES.MUMMY_WRAPPING && (m & W_ARMC) !== 0)
        return INVIS;
    if (o.otyp === ONAMES.CORNUTHAUM && (m & W_ARMH) !== 0
        && game.urole?.name?.m !== 'Wizard')    /* !Role_if(PM_WIZARD) */
        return CLAIRVOYANT;
    if (o.oartifact === ART_EYES_OF_THE_OVERWORLD && (m & W_TOOL) !== 0)
        return BLINDED;
    return 0;
}

const MFAST = 2;   /* include/monst.h — permspeed value */
const MSLOW = 1;   /* include/monst.h — permspeed value */

function note_unported_worn(what) {
    (game.unported ||= new Set()).add(what);
}

// src/worn.c:1377 extract_from_minvent()
export async function extract_from_minvent(mon, obj, do_extrinsics, silently) {
    const unwornmask = obj.owornmask || 0;
    if (obj.where !== OBJ_MINVENT) {
        await impossible('extract_from_minvent called on object not in minvent');
        return;
    }
    if ((unwornmask & W_ARM) && obj.lamplit && artifact_light(obj))
        end_burn(obj, false);
    obj_extract_self(obj);
    obj.owornmask = 0;
    if (unwornmask) {
        if (!DEADMONSTER(mon) && do_extrinsics)
            await update_mon_extrinsics(mon, obj, false, silently);
        mon.misc_worn_check = (mon.misc_worn_check || 0) & ~unwornmask;
        check_gear_next_turn(mon);
    }
    await obj_no_longer_held(obj);
    if (unwornmask & W_WEP)
        await mwepgone(mon);
}

function matching_dragon_armor(mon, obj) {
    let dragon = -1;
    if (obj.otyp >= ONAMES.GRAY_DRAGON_SCALES
        && obj.otyp <= ONAMES.YELLOW_DRAGON_SCALES) {
        dragon = PMNAMES.PM_GRAY_DRAGON
            + obj.otyp - ONAMES.GRAY_DRAGON_SCALES;
    } else if (obj.otyp >= ONAMES.GRAY_DRAGON_SCALE_MAIL
               && obj.otyp <= ONAMES.YELLOW_DRAGON_SCALE_MAIL) {
        dragon = PMNAMES.PM_GRAY_DRAGON
            + obj.otyp - ONAMES.GRAY_DRAGON_SCALE_MAIL;
    }
    return dragon === mon.mnum;
}

// src/worn.c:1040 m_lose_armor()
async function m_lose_armor(mon, obj, polyspot) {
    await extract_from_minvent(mon, obj, true, false);
    place_object(obj, mon.mx, mon.my);
    if (polyspot)
        bypass_obj(obj);
    newsym(mon.mx, mon.my);
}

// src/worn.c:1177 mon_break_armor(). A new monster shape destroys armor it
// bursts, drops armor it slips out of, and sheds gear its new body cannot use.
// The order is visible because several messages can share one topline.
export async function mon_break_armor(mon, polyspot) {
    const [{ cansee }, { newsym, pline }, { You, You_hear }, { surface },
           { can_saddle, can_ride, dismount_steed }]
        = await Promise.all([
            import('./vision.js'), import('./display.js'), import('./pline.js'),
            import('./dungeon.js'), import('./steed.js'),
        ]);
    const mdat = mon.data;
    const vis = cansee(mon.mx, mon.my);
    const handless_or_tiny = nohands(mdat) || verysmall(mdat);
    const pronoun = mhim(mon);
    const ppronoun = genders_tbl[pronoun_gender(mon, PRONOUN_HALLU)].his;
    let noride = false;

    let obj;
    if (breakarm(mdat)) {
        if ((obj = which_armor(mon, W_ARM))) {
            if (!matching_dragon_armor(mon, obj)) {
                if (vis)
                    await pline(`${Monnam(mon)} breaks out of ${ppronoun} armor!`);
                else
                    await You_hear('a cracking sound.');
            }
            await m_useup(mon, obj);
        }
        if ((obj = which_armor(mon, W_ARMC))
            && (obj.otyp !== ONAMES.MUMMY_WRAPPING
                || !WrappingAllowed(mdat))) {
            if (obj.oartifact) {
                if (vis)
                    await pline(`${s_suffix(Monnam(mon))} ${
                        cloak_simple_name(obj)} falls off!`);
                await m_lose_armor(mon, obj, polyspot);
            } else {
                if (vis)
                    await pline(`${s_suffix(Monnam(mon))} ${
                        cloak_simple_name(obj)} tears apart!`);
                else
                    await You_hear('a ripping sound.');
                await m_useup(mon, obj);
            }
        }
        if ((obj = which_armor(mon, W_ARMU))) {
            if (vis)
                await pline(`${s_suffix(Monnam(mon))} shirt rips to shreds!`);
            else
                await You_hear('a ripping sound.');
            await m_useup(mon, obj);
        }
    } else if (sliparm(mdat)) {
        const passes_thru_clothes = mdat.msize > MFLAGS.MZ_SMALL;

        if ((obj = which_armor(mon, W_ARM))) {
            if (vis)
                await pline(`${s_suffix(Monnam(mon))} armor falls around ${
                    pronoun}!`);
            else
                await You_hear('a thud.');
            await m_lose_armor(mon, obj, polyspot);
        }
        if ((obj = which_armor(mon, W_ARMC))
            && (obj.otyp !== ONAMES.MUMMY_WRAPPING
                || !WrappingAllowed(mdat))) {
            if (vis) {
                if (is_whirly(mdat))
                    await pline(`${s_suffix(Monnam(mon))} ${
                        cloak_simple_name(obj)} falls, unsupported!`);
                else
                    await pline(`${Monnam(mon)} shrinks out of ${ppronoun} ${
                        cloak_simple_name(obj)}!`);
            }
            await m_lose_armor(mon, obj, polyspot);
        }
        if ((obj = which_armor(mon, W_ARMU))) {
            if (vis) {
                if (passes_thru_clothes)
                    await pline(`${Monnam(mon)} seeps right through ${
                        ppronoun} shirt!`);
                else
                    await pline(`${Monnam(mon)} becomes much too small for ${
                        ppronoun} shirt!`);
            }
            await m_lose_armor(mon, obj, polyspot);
        }
    }

    if (handless_or_tiny) {
        if ((obj = which_armor(mon, W_ARMG))) {
            if (vis)
                await pline(`${Monnam(mon)} drops ${ppronoun} gloves${
                    MON_WEP(mon) ? ' and weapon' : ''}!`);
            await m_lose_armor(mon, obj, polyspot);
        }
        if ((obj = which_armor(mon, W_ARMS))) {
            if (vis)
                await pline(`${Monnam(mon)} can no longer hold ${
                    ppronoun} shield!`);
            else
                await You_hear('a clank.');
            await m_lose_armor(mon, obj, polyspot);
        }
    }
    if (handless_or_tiny || has_horns(mdat)) {
        if ((obj = which_armor(mon, W_ARMH))
            && (handless_or_tiny || !is_flimsy(obj))) {
            if (vis)
                await pline(`${s_suffix(Monnam(mon))} helmet falls to the ${
                    surface(mon.mx, mon.my)}!`);
            else
                await You_hear('a clank.');
            await m_lose_armor(mon, obj, polyspot);
        }
    }
    if (handless_or_tiny || slithy(mdat) || mdat.mlet === MONSYMS.S_CENTAUR) {
        if ((obj = which_armor(mon, W_ARMF))) {
            if (vis) {
                if (is_whirly(mdat))
                    await pline(`${s_suffix(Monnam(mon))} boots fall away!`);
                else
                    await pline(`${s_suffix(Monnam(mon))} boots ${
                        verysmall(mdat) ? 'slide' : 'are pushed'} off ${
                        ppronoun} feet!`);
            }
            await m_lose_armor(mon, obj, polyspot);
        }
    }
    if (!can_saddle(mon)) {
        if ((obj = which_armor(mon, W_SADDLE))) {
            await m_lose_armor(mon, obj, polyspot);
            if (vis)
                await pline(`${s_suffix(Monnam(mon))} saddle falls off.`);
        }
        if (mon === game.u.usteed)
            noride = true;
    }
    if (noride || (mon === game.u.usteed && !can_ride(mon))) {
        await You(`can no longer ride ${mon_nam(mon)}.`);
        note_unported_worn('mon_break_armor:steed-touch-petrification');
        await dismount_steed(DISMOUNT_FELL);
    }
}

// src/worn.c:717 find_mac() — a monster's armour class.
//
// No draws. Subtracting ARM_BONUS RAISES the AC value because the bonus is
// positive and lower AC is better, which is C's own comment and the easiest
// sign to get backwards.
//
// The amulet of guarding is a flat 2 and is deliberately NOT run through
// ARM_BONUS, so erosion cannot reduce it.
export function find_mac(mon) {
    let base = game.mons[mon.mnum].ac;
    const mwflags = mon.misc_worn_check;

    for (const obj of mon.minvent || []) {
        if (obj.owornmask & mwflags) {
            if (obj.otyp === ONAMES.AMULET_OF_GUARDING)
                base -= 2;      /* fixed amount, not impacted by erosion */
            else
                base -= ARM_BONUS(obj);
        }
    }
    /* same cap as for the hero, find_ac() in do_wear.c */
    if (Math.abs(base) > AC_MAX)
        base = sgn(base) * AC_MAX;
    return base;
}

// src/worn.c:206 wearmask_to_obj() — the worn item in a slot mask
export function wearmask_to_obj(wornmask) {
    for (const wp of worn)
        if (wp.w_mask & wornmask)
            return game.u[wp.w_obj] || null;
    return null;
}

// src/worn.c:250 armcat_to_wornmask()
export function armcat_to_wornmask(cat) {
    let mask = 0;
    switch (cat) {
    case ARM_SUIT:
        mask = W_ARM;
        break;
    case ARM_CLOAK:
        mask = W_ARMC;
        break;
    case ARM_HELM:
        mask = W_ARMH;
        break;
    case ARM_SHIELD:
        mask = W_ARMS;
        break;
    case ARM_GLOVES:
        mask = W_ARMG;
        break;
    case ARM_BOOTS:
        mask = W_ARMF;
        break;
    case ARM_SHIRT:
        mask = W_ARMU;
        break;
    }
    return mask;
}

// src/worn.c:474 mon_set_minvis(), a monster becomes permanently invisible
// (or, from a cursed potion, permanently visible).
export function mon_set_minvis(mon, cursed_potion) {
    mon.perminvis = !cursed_potion ? 1 : 0;
    if (!mon.invis_blkd) {
        mon.minvis = mon.perminvis;
        newsym(mon.mx, mon.my); /* make it disappear */
        if (mon.wormno)
            see_wsegs(mon); /* and any tail too */
    }
}

// src/worn.c:488 mon_adjust_speed(), change a monster's intrinsic speed
// and recompute its effective speed from worn speed boots.
export function mon_adjust_speed(mon, adjust, obj) {
    let otmp;
    let give_msg = !game.in_mklev, petrify = false;
    const oldspeed = mon.mspeed | 0;

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

    otmp = (mon.minvent || []).find(o => o.owornmask
                                        && game.objects[o.otyp].oc_oprop === FAST);
    if (otmp) /* speed boots */
        mon.mspeed = MFAST;
    else
        mon.mspeed = mon.permspeed | 0;

    /* no message if monster is immobile (temp or perm) or unseen */
    if (give_msg && (mon.mspeed !== oldspeed || petrify) && mon.data.mmove
        && !(mon.mfrozen || mon.msleeping) && canseemon(mon)) {
        /* fast to slow (skipping intermediate state) or vice versa */
        const howmuch =
            (mon.mspeed + oldspeed === MFAST + MSLOW) ? 'much ' : '';
        let message;

        if (petrify) {
            /* mimic the player's petrification countdown; "slowing down"
               even if fast movement rate retained via worn speed boots */
            if (game.flags?.verbose !== false)
                message = pline_mon(mon, `${Monnam(mon)} is slowing down.`);
        } else if (adjust > 0 || mon.mspeed === MFAST)
            message = pline_mon(mon, `${Monnam(mon)} is suddenly moving ${howmuch}faster.`);
        else
            message = pline_mon(mon, `${Monnam(mon)} seems to be moving ${howmuch}slower.`);

        /* might discover an object if we see the speed change happen */
        const finish = () => { if (obj != null) learnwand(obj); };
        return message ? message.then(finish) : finish();
    }
}

// src/worn.c wearslot(); which slots could obj be worn in
export function wearslot(obj) {
    const otyp = obj.otyp;
    /* practically any item can be wielded or quivered; it's up to
       our caller to handle such things--we assume "normal" usage */
    let res = 0; /* default: can't be worn anywhere */

    switch (obj.oclass) {
    case OCLASSES.AMULET_CLASS:
        res = W_AMUL; /* WORN_AMUL */
        break;
    case OCLASSES.RING_CLASS:
        res = W_RINGL | W_RINGR; /* W_RING, BOTH_SIDES */
        break;
    case OCLASSES.ARMOR_CLASS:
        switch (game.objects[otyp].oc_armcat) {
        case ARM_SUIT:
            res = W_ARM;
            break; /* WORN_ARMOR */
        case ARM_SHIELD:
            res = W_ARMS;
            break; /* WORN_SHIELD */
        case ARM_HELM:
            res = W_ARMH;
            break; /* WORN_HELMET */
        case ARM_GLOVES:
            res = W_ARMG;
            break; /* WORN_GLOVES */
        case ARM_BOOTS:
            res = W_ARMF;
            break; /* WORN_BOOTS */
        case ARM_CLOAK:
            res = W_ARMC;
            break; /* WORN_CLOAK */
        case ARM_SHIRT:
            res = W_ARMU;
            break; /* WORN_SHIRT */
        }
        break;
    case OCLASSES.WEAPON_CLASS:
        res = W_WEP | W_SWAPWEP;
        if (game.objects[otyp].oc_merge)
            res |= W_QUIVER;
        break;
    case OCLASSES.TOOL_CLASS:
        if (otyp === ONAMES.BLINDFOLD || otyp === ONAMES.TOWEL || otyp === ONAMES.LENSES)
            res = W_TOOL; /* WORN_BLINDF */
        else if (is_weptool(obj, game.objects) || otyp === ONAMES.TIN_OPENER)
            res = W_WEP | W_SWAPWEP;
        else if (otyp === ONAMES.SADDLE)
            res = W_SADDLE;
        break;
    case OCLASSES.FOOD_CLASS:
        if (obj.otyp === ONAMES.MEAT_RING)
            res = W_RINGL | W_RINGR;
        break;
    case OCLASSES.GEM_CLASS:
        res = W_QUIVER;
        break;
    case OCLASSES.BALL_CLASS:
        res = W_BALL;
        break;
    case OCLASSES.CHAIN_CLASS:
        res = W_CHAIN;
        break;
    default:
        break;
    }
    return res;
}

// src/worn.c:1055 clear_bypass()
function clear_bypass(objchn) {
    for (const o of objchn || []) {
        o.bypass = 0;
        if (Has_contents(o))
            clear_bypass(o.cobj);
    }
}

// src/worn.c:1070 clear_bypasses()
export function clear_bypasses() {
    clear_bypass(game.level?.objects);
    clear_bypass(game.invent);
    clear_bypass(game.migrating_objs);
    clear_bypass(game.level?.buriedobjs);
    clear_bypass(game.billobjs);
    clear_bypass(game.objs_deleted);
    for (const mtmp of game.level?.monsters || []) {
        if (DEADMONSTER(mtmp)) continue;
        clear_bypass(mtmp.minvent);
        if (mtmp.data === game.mons[PMNAMES.PM_LONG_WORM]
            && MCORPSENM(mtmp) !== NON_PM)
            mtmp.mextra.mcorpsenm = NON_PM;
    }
    for (const mtmp of game.migrating_mons || [])
        clear_bypass(mtmp.minvent);
    for (const mtmp of game.mydogs || [])
        clear_bypass(mtmp.minvent);
    if (game.u.uball) game.u.uball.bypass = 0;
    if (game.u.uchain) game.u.uchain.bypass = 0;
    game.context.bypasses = false;
}

// src/worn.c:1119 bypass_obj()
export function bypass_obj(obj) {
    obj.bypass = 1;
    (game.context ||= {}).bypasses = true;
}

// src/worn.c:1127 bypass_objlist()
export function bypass_objlist(objchain, on) {
    if (on && objchain?.length)
        game.context.bypasses = true;
    for (const obj of objchain || [])
        obj.bypass = on ? 1 : 0;
}

// src/worn.c:1144 nxt_unbypassed_obj()
export function nxt_unbypassed_obj(objchain) {
    for (const obj of objchain || []) {
        if (!obj.bypass) {
            bypass_obj(obj);
            return obj;
        }
    }
    return null;
}

// src/worn.c:1159 nxt_unbypassed_loot()
export function nxt_unbypassed_loot(lootarray, listhead) {
    for (const { obj } of lootarray) {
        if (!obj) break;
        if (listhead?.includes(obj) && !obj.bypass) {
            bypass_obj(obj);
            return obj;
        }
    }
    return null;
}
