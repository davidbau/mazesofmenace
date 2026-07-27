import { obj_extract_self, update_inventory } from './invent.js';
// worn.js — what a monster or the hero currently has on.
// C ref: src/worn.c
//
// Nothing here draws.

import { game } from './gstate.js';
import { Role_if } from './role.js';
import { sgn } from './hacklib.js';
import { MON_WEP } from './monst.js';
import { set_twoweap } from './wield.js';
import { cancel_doff } from './do_wear.js';
import { W_ARM, W_ARMC, W_ARMH, W_ARMS, W_ARMG, W_ARMF, W_ARMU, W_AMUL,
         W_RINGL, W_RINGR, W_WEP, W_SWAPWEP, W_QUIVER, W_TOOL, W_BALL,
         W_CHAIN, W_ARMOR, W_SADDLE, AC_MAX, BOLT_LIM, MFAST, W_ART } from './const.js';
import { OCLASSES, ONAMES } from './objects_data.js';
import { ARM_SUIT, ARM_SHIELD, ARM_HELM, ARM_GLOVES, ARM_BOOTS,
         ARM_CLOAK, ARM_SHIRT, is_elven_armor } from './obj.js';
import { is_weptool } from './mkobj.js';
import { MFLAGS, MONSYMS, PMNAMES, mons } from './monst_data.js';
import { verysmall, nohands, is_animal, mindless, slithy, cantweararm,
         has_horns, raceptr } from './mondata.js';
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

// src/worn.c:1360 racial_exception() — race/object combinations that override
// the normal wear rules. 0 normal, 1 acceptable, -1 unacceptable.
//
// Goes through raceptr(), which is the whole point of the function: for the
// UN-polymorphed hero raceptr returns the permonst of their RACE, and only
// while polymorphed does it return the current form. Reading mon's own species
// instead (what this used to do) collapses that distinction, so a hero
// polymorphed into a hobbit was not granted the exception and a hobbit-shaped
// monster was granted it regardless of the C's intent.
//
// The C keeps its -1 arm commented out, so nothing returns -1 today. The
// three-valued contract is preserved because canwearobj() tests `< 1`.
export function racial_exception(mon, obj) {
    const ptr = raceptr(mon);

    /* Acceptable Exceptions: */
    /* Allow hobbits to wear elven armor - LoTR */
    if (ptr === mons[PMNAMES.PM_HOBBIT] && is_elven_armor(obj))
        return 1;
    /* Unacceptable Exceptions: */
    /* Checks for object that certain races should never use go here */
    /*  return -1; */

    return 0;
}

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
                    /* C wraps this in a gi.in_mklev save/restore so that a
                       `silently` call suppresses the speed message. Our
                       mon_adjust_speed records its message rather than
                       printing one, so the wrapper has nothing to suppress
                       yet -- restore it when the message lands. */
                    mon_adjust_speed(mon, 0, obj);
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
                    /* same call as the `on` arm above; C's two FAST cases
                       are identical, including the in_mklev wrapper. */
                    mon_adjust_speed(mon, 0, obj);
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

const MSLOW = 1;   /* include/monst.h — permspeed value */

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

// src/worn.c extract_from_minvent() — take an object out of a monster's pack.
//
// C's comment: "At its core this is just obj_extract_self(), but it also
// handles any updates that need to happen if the gear is equipped". For an
// object that is NOT worn -- owornmask 0, which is most of what a monster
// carries -- the equipment handling is all skipped and this is exactly
// obj_extract_self.
export function extract_from_minvent(mon, obj, do_extrinsics, silently) {
    const unwornmask = obj.owornmask;

    if (unwornmask) {
        /* the gold dragon scales relight, artifact_light, w_blocks and
           update_mon_extrinsics handling */
        (game.unported ||= new Set()).add('worn:extract_from_minvent:worn');
        obj.owornmask = 0;
    }
    obj_extract_self(obj);
}

// src/worn.c:18 worn[] — the mask-to-slot table.
//
// This is the structure setworn() and recalc_telepat_range() are built
// around: neither names uwep or uarm directly, both walk this array and act
// on whichever slot the mask selects. Porting either without the table means
// replacing the walk with an if-chain per slot, which has no C counterpart
// and would re-diff badly in phase 2.
//
// C stores a POINTER to each global (&uarm). JS has no addresses, so the
// faithful equivalent is the property NAME on the object that holds the
// slots -- js/u_init.js:558 establishes that as game.u, writing game.u.uwep.
// Reading and writing through game.u[wp.w_obj] is what dereferencing
// *(wp->w_obj) does in C.
//
// The order is C's order and must stay that way: setworn walks until
// w_mask is 0, and a mask matching several entries acts on each in sequence.
export const worn = [
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
    /* C terminates on { 0, 0, 0 }; JS iterates the array, so the sentinel
       has no counterpart -- but any loop ported from C must still stop at
       the same place, which is the end of this array. */
];

// src/worn.c:73 setworn() — put `obj` in every slot `mask` selects.
//
// The slot walk is ported exactly, because that is what setuwep() depends on
// and what makes game.u.uwep actually get written. Everything C does through
// the u.uprops[] array is RECORDED instead, for a reason worth stating:
//
//   C:     p = objects[oobj->otyp].oc_oprop;  u.uprops[p].extrinsic &= ~mask;
//   ours:  game.u.uprops is keyed BY NAME (uprops.CLAIRVOYANT), not by the
//          numeric oc_oprop index
//
// Bridging that needs an oc_oprop-number to uprops-name mapping which does
// not exist yet. Guessing at it would silently grant or revoke intrinsics on
// every equip, which is exactly the kind of wrong-but-plausible behaviour
// that reviews clean and diverges on the first draw.
//
// Also recorded: set_twoweap, cancel_doff, monstunseesu_prop and
// recalc_telepat_range, none of which are ported.
/* u.uprops is a C global and therefore zero-initialised; JS has no such
   thing, so entries are created on first write. Reads go through
   js/youprop.js's H/E/B, which optional-chain and so still yield false for
   an entry that does not exist yet. */
function uprop(p) {
    const u = (game.u.uprops ||= []);
    return (u[p] ||= { intrinsic: 0, extrinsic: 0, blocked: 0 });
}

export function setworn(obj, mask) {
    /* C's (W_ARM | I_SPECIAL) arm is the restore-a-saved-game path, which
       assigns uskin and confers nothing. We never restore, so it cannot be
       reached; it is recorded rather than written. */

    for (const wp of worn) {
        if (!(wp.w_mask & mask))
            continue;

        const oobj = game.u[wp.w_obj];
        if (oobj) {
            if (game.u.twoweap && (oobj.owornmask & (W_WEP | W_SWAPWEP)))
                set_twoweap(false);
            oobj.owornmask &= ~wp.w_mask;
            if (wp.w_mask & ~(W_SWAPWEP | W_QUIVER)) {
                /* oc_oprop IS the property number, and uprops is keyed by
                   number, so C's line ports directly with no translation. */
                let p = game.objects[oobj.otyp].oc_oprop;
                uprop(p).extrinsic &= ~wp.w_mask;
                /* monstunseesu_prop(p) — needs monstunseesu and
                   cvt_prop_to_mseenres, neither ported */
                note_unported_worn('setworn:monstunseesu_prop');
                if ((p = w_blocks(oobj, mask)) !== 0)
                    uprop(p).blocked &= ~wp.w_mask;
                if (oobj.oartifact)
                    note_unported_worn('setworn:set_artifact_intrinsic_off');
            }
            cancel_doff(oobj, wp.w_mask);
        }

        game.u[wp.w_obj] = obj;         /* C: *(wp->w_obj) = obj */

        if (obj) {
            obj.owornmask |= wp.w_mask;
            if (wp.w_mask & ~(W_SWAPWEP | W_QUIVER)) {
                /* C guards this: wielding a potion must not confer its
                   property, but weapon-tools and every non-weapon slot do. */
                if (obj.oclass === OCLASSES.WEAPON_CLASS
                    || is_weptool(obj, game.objects) || mask !== W_WEP) {
                    let p = game.objects[obj.otyp].oc_oprop;
                    uprop(p).extrinsic |= wp.w_mask;
                    if ((p = w_blocks(obj, mask)) !== 0)
                        uprop(p).blocked |= wp.w_mask;
                }
                if (obj.oartifact)
                    note_unported_worn('setworn:set_artifact_intrinsic_on');
            }
        }
    }

    if (obj && (obj.owornmask & W_ARMOR) !== 0)
        game.u.uroleplay.nudist = false;
    /* tux -> tuxedo -> "monkey suit" -> monk's suit */
    game.iflags.tux_penalty = !!(game.u.uarm && Role_if(PMNAMES.PM_MONK)
                                 && game.urole.spelarmr);

    update_inventory();
    recalc_telepat_range();
}

// src/worn.c:50 recalc_telepat_range() — how far unblind telepathy reaches.
//
// The first consumer of the worn[] table besides setworn, and the reason the
// table had to come first: C does not enumerate slots here either, it walks
// the same array and counts whichever worn objects confer TELEPAT.
//
// The artifact term (ETelepat & W_ART, counting every SPFX_ESP artifact as
// one) needs the extrinsic bitmask that setworn does not maintain yet, so it
// is recorded. Its absence can only UNDERCOUNT, giving a shorter range or -1
// where C would give a range -- never a longer one.
export function recalc_telepat_range() {
    let nobjs = 0;

    for (const wp of worn) {
        const oobj = game.u?.[wp.w_obj];
        if (oobj && game.objects?.[oobj.otyp]?.oc_oprop === TELEPAT)
            nobjs++;
    }

    /* count all artifacts with SPFX_ESP as one */
    if (uprop(TELEPAT).extrinsic & W_ART)
        nobjs++;

    game.u.unblind_telepat_range = nobjs
        ? (BOLT_LIM * BOLT_LIM) * nobjs
        : -1;
}

// src/worn.c:150 setnotworn() — take `obj` out of every slot it occupies.
//
// setworn()'s counterpart, and note the difference: setworn walks the table
// for slots matching a MASK, this one walks it for slots holding a given
// OBJECT. An object can sit in more than one (a wielded item that is also
// quivered), so the loop does not stop at the first hit and `unworn`
// accumulates every mask cleared.
//
// Everything the extrinsic bookkeeping needs is here now: oc_oprop is the
// property number and uprops is keyed by number, so C's lines port directly.
export function setnotworn(obj) {
    let unworn = 0;

    if (!obj)
        return;
    if (game.u.twoweap && (obj === game.u.uwep || obj === game.u.uswapwep))
        set_twoweap(false);

    for (const wp of worn) {
        if (obj !== game.u[wp.w_obj])
            continue;

        /* in case wearing or removal is in progress, or removal is pending
           via the 'A' command for multiple items */
        cancel_doff(obj, wp.w_mask);

        game.u[wp.w_obj] = null;
        unworn |= wp.w_mask;

        let p = game.objects[obj.otyp].oc_oprop;
        uprop(p).extrinsic &= ~wp.w_mask;
        note_unported_worn('setnotworn:monstunseesu_prop');
        obj.owornmask &= ~wp.w_mask;
        if (obj.oartifact)
            note_unported_worn('setnotworn:set_artifact_intrinsic');
        if ((p = w_blocks(obj, wp.w_mask)) !== 0)
            uprop(p).blocked &= ~wp.w_mask;
    }

    if (!game.u.uarm)
        game.iflags.tux_penalty = false;
    if (unworn !== 0)
        note_unported_worn('setnotworn:botl');

    update_inventory();
    recalc_telepat_range();
}

// src/worn.c:206 wearmask_to_obj() — the object in the FIRST slot the mask
// selects.
//
// Returns on the first hit, unlike setworn and setnotworn which walk the
// whole table. That is deliberate in C: callers pass a single-slot mask and
// want that slot's object, so table ORDER decides the answer for a mask
// spanning several slots. Do not "improve" it into a search.
export function wearmask_to_obj(wornmask) {
    for (const wp of worn)
        if (wp.w_mask & wornmask)
            return game.u[wp.w_obj] ?? null;
    return null;
}

// src/worn.c:218 wornmask_to_armcat() — which armour category a wornmask is.
//
// C switches on `mask & W_ARMOR`, so a mask carrying non-armour bits still
// resolves, and anything that is not an armour slot falls through to 0.
// Note that 0 is ARM_SUIT, not a sentinel: C returns the same value for
// "suit" and "no armour slot", and callers rely on having already checked.
// Do not turn the default into -1.
export function wornmask_to_armcat(mask) {
    switch (mask & W_ARMOR) {
    case W_ARM:   return ARM_SUIT;
    case W_ARMC:  return ARM_CLOAK;
    case W_ARMH:  return ARM_HELM;
    case W_ARMS:  return ARM_SHIELD;
    case W_ARMG:  return ARM_GLOVES;
    case W_ARMF:  return ARM_BOOTS;
    case W_ARMU:  return ARM_SHIRT;
    default:      return 0;
    }
}

// src/worn.c:250 armcat_to_wornmask() — the inverse of wornmask_to_armcat().
//
// NOT symmetric with it, and the asymmetry is C's: the default here returns
// 0, which is NOT a valid wornmask, whereas wornmask_to_armcat's default
// returns 0 meaning ARM_SUIT. Same literal, opposite meaning, in adjacent
// functions. Keep both as they are.
export function armcat_to_wornmask(cat) {
    switch (cat) {
    case ARM_SUIT:   return W_ARM;
    case ARM_CLOAK:  return W_ARMC;
    case ARM_HELM:   return W_ARMH;
    case ARM_SHIELD: return W_ARMS;
    case ARM_GLOVES: return W_ARMG;
    case ARM_BOOTS:  return W_ARMF;
    case ARM_SHIRT:  return W_ARMU;
    default:         return 0;
    }
}

// src/worn.c:282 wearslot() — the bitmask of slots an item MIGHT occupy.
//
// C's own comment matters here: "practically any item can be wielded or
// quivered; it's up to our caller to handle such things -- we assume normal
// usage". So this is not a permission check, and returning 0 does not mean
// the object cannot be held.
//
// Two arms are easy to get wrong. A WEAPON only gains W_QUIVER when its
// objclass entry is oc_merge -- stackable ammo can be quivered, a long sword
// cannot. And a TOOL splits three ways: blindfold/towel/lenses go to W_TOOL,
// weapon-tools and the tin opener to the weapon slots, and the saddle to
// W_SADDLE, which is a monster slot rather than one of the hero's.
export function wearslot(obj) {
    const otyp = obj.otyp;
    let res = 0;                    /* default: can't be worn anywhere */

    switch (obj.oclass) {
    case OCLASSES.AMULET_CLASS:
        res = W_AMUL;
        break;
    case OCLASSES.RING_CLASS:
        res = W_RINGL | W_RINGR;
        break;
    case OCLASSES.ARMOR_CLASS:
        res = armcat_to_wornmask(game.objects[otyp].oc_armcat);
        break;
    case OCLASSES.WEAPON_CLASS:
        res = W_WEP | W_SWAPWEP;
        if (game.objects[otyp].oc_merge)
            res |= W_QUIVER;
        break;
    case OCLASSES.TOOL_CLASS:
        if (otyp === ONAMES.BLINDFOLD || otyp === ONAMES.TOWEL
            || otyp === ONAMES.LENSES)
            res = W_TOOL;
        else if (is_weptool(obj, game.objects) || otyp === ONAMES.TIN_OPENER)
            res = W_WEP | W_SWAPWEP;
        else if (otyp === ONAMES.SADDLE)
            res = W_SADDLE;
        break;
    case OCLASSES.FOOD_CLASS:
        if (otyp === ONAMES.MEAT_RING)
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

// src/worn.c:188 allunworn() — clear every slot pointer without unworning.
//
// Called from game save, after invent has already been freed. C's comment
// is the whole warning: "object is already gone so we don't/can't update
// its owornmask". So this deliberately does NOT do what setnotworn does --
// no owornmask clearing, no extrinsic bookkeeping, no cancel_doff. It is
// pointer hygiene on a half-destroyed state, not an unequip.
//
// Porting it as "call setnotworn for each slot" would touch freed objects
// in C and, here, would revoke extrinsics on a hero who is about to be
// serialised. We never save, so nothing calls this yet.
export function allunworn() {
    game.u.twoweap = 0;         /* uwep and uswapwep are going away */

    for (const wp of worn) {
        /* object is already gone so we don't/can't update its owornmask */
        game.u[wp.w_obj] = null;
    }
}

// src/worn.c:474 mon_set_minvis() — make a monster permanently invisible.
//
// The perminvis/minvis split is the substance and is ported exactly: a
// cursed potion sets perminvis to 0, and minvis only follows perminvis when
// invis_blkd is clear, so a monster whose invisibility is blocked keeps
// showing while still being "permanently invisible" underneath.
//
// newsym() and see_wsegs() are NOT called. Both live in js/display.js, and
// js/worn.js has no edge to it in either direction today; adding one is the
// operation that has repeatedly collapsed the module graph in this tree (see
// NOTES on droppables_fn). So the redraw is recorded, and the monster's
// disappearance is not painted until that edge is safe to add.
export function mon_set_minvis(mon, cursed_potion) {
    mon.perminvis = !cursed_potion ? 1 : 0;
    if (!mon.invis_blkd) {
        mon.minvis = mon.perminvis;
        note_unported_worn('mon_set_minvis:newsym');
        if (mon.wormno)
            note_unported_worn('mon_set_minvis:see_wsegs');
    }
}

// src/worn.c:488 mon_adjust_speed() — change a monster's intrinsic speed.
//
// The switch is the whole thing and its arms are NOT a simple scale. +1 and
// -1 step THROUGH normal rather than past it: a slow monster given +1
// becomes normal, not fast, and only a normal one becomes fast. +2 and -2
// set the extreme outright. -3 is petrification and -4 green slime, and both
// only strip MFAST -- they never make a monster slow.
//
// give_msg is cleared by the arms that fire during creation or as part of a
// larger effect (+2, -2, -4), which is why it is a variable rather than a
// parameter.
//
// The worn-speed-boots check AFTER the switch is what actually sets mspeed:
// permspeed is the intrinsic, mspeed is the effective one, and boots win.
//
// Messages are recorded: canseemon, Monnam, pline_mon and learnwand are all
// in modules js/worn.js has no edge to. The speed change itself is exact.
export function mon_adjust_speed(mon, adjust, obj) {
    let petrify = false;
    const oldspeed = mon.mspeed;

    switch (adjust) {
    case 2:
        mon.permspeed = MFAST;
        break;                       /* special-case monster creation */
    case 1:
        mon.permspeed = (mon.permspeed === MSLOW) ? 0 : MFAST;
        break;
    case 0:                          /* just check for worn speed boots */
        break;
    case -1:
        mon.permspeed = (mon.permspeed === MFAST) ? 0 : MSLOW;
        break;
    case -2:
        mon.permspeed = MSLOW;
        break;
    case -3:                         /* petrification */
        /* take away intrinsic speed but do not reduce normal speed */
        if (mon.permspeed === MFAST)
            mon.permspeed = 0;
        petrify = true;
        break;
    case -4:                         /* green slime */
        if (mon.permspeed === MFAST)
            mon.permspeed = 0;
        break;
    }

    const boots = (mon.minvent || []).find(
        (otmp) => otmp.owornmask && game.objects[otmp.otyp].oc_oprop === FAST);
    mon.mspeed = boots ? MFAST : mon.permspeed;

    if (mon.mspeed !== oldspeed || petrify)
        note_unported_worn('mon_adjust_speed:msg');
}
