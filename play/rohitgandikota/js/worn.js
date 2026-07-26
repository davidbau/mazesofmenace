// worn.js — what a monster or the hero currently has on.
// C ref: src/worn.c
//
// Nothing here draws.

import { game } from './gstate.js';
import { sgn } from './hacklib.js';
import { MON_WEP } from './monst.js';
import { W_ARM, W_ARMC, W_ARMH, W_ARMS, W_ARMG, W_ARMF, W_ARMU, W_AMUL,
         AC_MAX } from './const.js';
import { OCLASSES, ONAMES } from './objects_data.js';
import { MFLAGS, MONSYMS, PMNAMES } from './monst_data.js';
import { verysmall, nohands, is_animal, mindless, slithy, cantweararm,
         has_horns } from './mondata.js';
import { is_shirt, is_cloak, is_helmet, is_shield, is_gloves, is_boots,
         is_suit, is_flimsy, bimanual, WrappingAllowed } from './obj.js';
import { ARM_BONUS } from './do_wear.js';
import { INVIS, FAST, ANTIMAGIC, REFLECTING, PROTECTION, CLAIRVOYANT,
         STEALTH, TELEPAT, LEVITATION, FLYING, WWALKING, DISPLACED,
         FUMBLING, JUMPING, FIRE_RES, COLD_RES, SLEEP_RES, DISINT_RES,
         SHOCK_RES, POISON_RES, ACID_RES, STONE_RES } from './const.js';

// src/worn.c which_armor() — the object worn in a given slot, or null.
//
// Monsters do not don armour in this port yet (m_dowear is absent), so the
// minvent scan finds nothing for them. That is the honest answer for a monster
// carrying an unworn shield, and it is the same answer the C gives; it becomes
// wrong only once m_dowear exists, at which point this needs no change.
export function which_armor(mon, flag) {
    if (mon === game.youmonst) {
        switch (flag) {
        case W_ARM:  return game.uarm  || null;
        case W_ARMC: return game.uarmc || null;
        case W_ARMH: return game.uarmh || null;
        case W_ARMS: return game.uarms || null;
        case W_ARMG: return game.uarmg || null;
        case W_ARMF: return game.uarmf || null;
        case W_ARMU: return game.uarmu || null;
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
// for monsters since they have no clairvoyance; the artifact arm needs ART_*.
function w_blocks(o, m) {
    if (o.otyp === ONAMES.MUMMY_WRAPPING && (m & W_ARMC) !== 0)
        return INVIS;
    if (o.otyp === ONAMES.CORNUTHAUM && (m & W_ARMH) !== 0)
        return CLAIRVOYANT;
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
