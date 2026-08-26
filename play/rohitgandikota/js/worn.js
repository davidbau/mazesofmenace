// worn.js — what a monster or the hero currently has on.
// C ref: src/worn.c
//
// Nothing here draws.

import { game } from './gstate.js';
import { sgn } from './hacklib.js';
import { MON_WEP } from './monst.js';
import { W_ARM, W_ARMC, W_ARMH, W_ARMS, W_ARMG, W_ARMF, W_ARMU, W_AMUL,
         W_RINGL, W_RINGR, W_WEP, W_SWAPWEP, W_QUIVER, W_TOOL, W_BALL,
         W_CHAIN, W_ARMOR, W_ART, I_SPECIAL, BOLT_LIM, BLINDED,
         AC_MAX } from './const.js';
import { OCLASSES, ONAMES } from './objects_data.js';
import { MFLAGS, MONSYMS, PMNAMES } from './monst_data.js';
import { verysmall, nohands, is_animal, mindless, slithy, cantweararm,
         has_horns } from './mondata.js';
import { is_shirt, is_cloak, is_helmet, is_shield, is_gloves, is_boots,
         is_suit, is_flimsy, bimanual, WrappingAllowed } from './obj.js';
import { ARM_BONUS, PROP_KEYS, cancel_doff } from './do_wear.js';
import { is_weptool } from './mkobj.js';
import { set_twoweap } from './wield.js';
import { update_inventory } from './invent.js';
import { Monnam, mon_nam } from './do_name.js';
import { See_invisible } from './youprop.js';
import { ART_EYES_OF_THE_OVERWORLD } from './artilist_data.js';
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
   That makes remove-one-of-two-granting-items exact. The .blocked and
   artifact W_ART bookkeeping have no ported reader yet; their arms record. */

// src/worn.c:50 recalc_telepat_range() — range of unblind telepathy.
export function recalc_telepat_range() {
    let nobjs = 0;

    for (const wp of worn) {
        const oobj = game.u[wp.w_obj];
        if (oobj && PROP_KEYS[game.objects[oobj.otyp].oc_oprop] === 'TELEPAT')
            nobjs++;
    }
    /* count all artifacts with SPFX_ESP as one; ETelepat's W_ART bit is only
       ever set by set_artifact_intrinsic, which is not ported, so this term
       is exact while that is true */
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
                            note_unported_worn('setworn:blocked');
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
                                note_unported_worn('setworn:blocked');
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
                note_unported_worn('setnotworn:blocked');
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
// Monsters do not don armour in this port yet (m_dowear is absent), so the
// minvent scan finds nothing for them. That is the honest answer for a monster
// carrying an unworn shield, and it is the same answer the C gives; it becomes
// wrong only once m_dowear exists, at which point this needs no change.
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

    m_dowear_type(mon, W_AMUL, creation, false);
    const can_wear_armor = !cantweararm(data); /* for suit, cloak, shirt */
    /* can't put on shirt if already wearing suit */
    if (can_wear_armor && !(mon.misc_worn_check & W_ARM))
        m_dowear_type(mon, W_ARMU, creation, false);
    if (can_wear_armor || WrappingAllowed(data))
        m_dowear_type(mon, W_ARMC, creation, false);
    m_dowear_type(mon, W_ARMH, creation, false);
    if (!MON_WEP(mon) || !bimanual(MON_WEP(mon)))
        m_dowear_type(mon, W_ARMS, creation, false);
    m_dowear_type(mon, W_ARMG, creation, false);
    if (!slithy(data) && data.mlet !== MONSYMS.S_CENTAUR)
        m_dowear_type(mon, W_ARMF, creation, false);
    if (can_wear_armor)
        m_dowear_type(mon, W_ARM, creation, false);
    else
        m_dowear_type(mon, W_ARM, creation, RACE_EXCEPTION);
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
    if (See_invisible())
        Monnam(mon);
    else
        mon_nam(mon);

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
            /* the minvis/See_invisible arm needs the invisibility state */
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

    if (!creation) {
        /* the "<Mon> puts on <armour>." messages need doname/Monnam */
        m_delay += game.objects[best.otyp].oc_delay;
        mon.mfrozen = m_delay;
        if (mon.mfrozen)
            mon.mcanmove = 0;
    }
    if (old) {
        update_mon_extrinsics(mon, old, false, creation);
        old.owornmask = 0;
        /* artifact_light()/end_burn() need the light-source code */
    }
    mon.misc_worn_check |= flag;
    best.owornmask |= flag;
    if (autocurse)
        best.cursed = true;             /* curse(best) */
    update_mon_extrinsics(mon, best, true, creation);
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
function racial_exception(mon, obj) {
    /* raceptr(mon) is the monster's own permonst unless it is the hero */
    if (game.mons[mon.mnum].pmidx === PMNAMES.PM_HOBBIT && is_elven_armor(obj))
        return 1;
    return 0;
}

// include/obj.h:299 is_elven_armor()
const is_elven_armor = (o) =>
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
function update_mon_extrinsics(mon, obj, on, silently) {
    let which = game.objects[obj.otyp].oc_oprop;
    const altwhich = altprop(obj);

    mon.mextrinsics = mon.mextrinsics || 0;

    if (which || altwhich) {
        for (;;) {                                          /* C's `again:` */
            if (on) {
                switch (which) {
                case INVIS:
                    mon.minvis = !mon.invis_blkd;
                    break;
                case FAST:
                    /* mon_adjust_speed() needs the speed code */
                    note_unported_worn('update_mon_extrinsics:mon_adjust_speed');
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
                    note_unported_worn('update_mon_extrinsics:mon_adjust_speed');
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

    /* maybe_blocks: obj->owornmask has been cleared by this point, so C passes
       a blanket worn-mask; monsters never wield armour so that is safe. */
    if (w_blocks(obj, ~0) === INVIS) {
        mon.invis_blkd = on ? 1 : 0;
        mon.minvis = on ? 0 : mon.perminvis;
    }

    /* the usteed/SADDLE dismount and the newsym() visibility update need the
       steed and display state */
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

function note_unported_worn(what) {
    (game.unported ||= new Set()).add(what);
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
