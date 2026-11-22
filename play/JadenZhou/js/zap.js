// zap.js -- zapping wands.
// C ref: zap.c
//
// Ported so far: the #zap command (dozap(), zap_ok(), zappable(),
// backfire()), learnwand(), zapyourself() (the cases sessions reach),
// zapnodir() (subset), zapsetup()/zapwrapup(), weffects() (IMMEDIATE
// wands go through bhit() in dothrow.js; rays and digging aren't ported
// yet).  For enlightenment: adtyp_to_prop(), u_adtyp_resistance_obj(),
// item_what().

import { game } from './gstate.js';
import { You, Your, pline, pline_The, Blind, Hallucination } from './display.js';
import { getobj, useupall } from './invent.js';
import { check_capacity } from './hack.js';
import { rn2, rnd, rn1, d } from './rng.js';
import { getdir } from './cmd.js';
import { exercise } from './attrib.js';
import { losehp, Maybe_Half_Phys } from './trap.js';
import { more_experienced } from './exper.js';
import { observe_object, discover_object } from './o_init.js';
import { The, xname, Tobjnam, vtense } from './objnam.js';
import { mon_nam } from './do_name.js';
import { resists_blnd, resists_blnd_by_arti } from './mondata.js';
import { make_blinded } from './potion.js';
import { body_part } from './insight.js';
import { ARM } from './const.js';
import { fall_asleep } from './timeout.js';
import { monstseesu, monstunseesu } from './uhitm.js';
import { bhit } from './dothrow.js';
import { GETOBJ_SUGGEST, GETOBJ_EXCLUDE, GETOBJ_NOFLAGS, ECMD_OK,
         ECMD_CANCEL, ECMD_TIME, WAND_BACKFIRE_CHANCE, WAND_WREST_CHANCE,
         A_STR, A_WIS, KILLED_BY_AN, SLEEP_RES, M_SEEN_SLEEP,
         ZAPPED_WAND } from './const.js';
import { objects, WAND_CLASS, SPBOOK_CLASS, DWARVISH_CLOAK, NODIR, IMMEDIATE,
         WAN_SLEEP, SPE_SLEEP, WAN_NOTHING, WAN_OPENING, WAN_LOCKING,
         WAN_STASIS, WAN_CREATE_MONSTER, WAN_WISHING, WAN_ENLIGHTENMENT,
         WAN_LIGHT, WAN_SECRET_DOOR_DETECTION, WAN_DIGGING, SPE_DIG,
         WAN_MAGIC_MISSILE, WAN_LIGHTNING, SPE_MAGIC_MISSILE,
         SPE_FINGER_OF_DEATH, SPE_FORCE_BOLT, WAN_STRIKING, BOULDER,
         WAN_CANCELLATION, SPE_CANCELLATION, SPE_KNOCK, SPE_WIZARD_LOCK,
         WAN_PROBING } from './objects.js';
import { PIT, SPIKED_PIT, STATUE_TRAP, HEADSTONE, DOOR, DBWALL,
         DB_DIR, DB_NORTH, DB_SOUTH, DB_EAST, DB_WEST, IS_DRAWBRIDGE,
         isok } from './const.js';
import { t_at } from './trap.js';
import { sobj_at, is_pool, is_lava } from './makemon.js';
import { delobj } from './invent.js';
import { mkobj, splitobj, weight, rnd_class, erosion_matters, is_flammable,
         is_rustprone, is_crackable, is_corrodeable, is_rottable,
         is_damageable, is_poisonable } from './mkobj.js';
import { obj_resists } from './dogmove.js';
import { cansee, does_block, block_point, unblock_point } from './vision.js';
import { newsym } from './display.js';
import { costly_spot } from './shk.js';
import { LARGEST_INT, MAX_SPELL_STUDY, Has_contents } from './const.js';
import { STRANGE_OBJECT, WAN_POLYMORPH, SPE_POLYMORPH, POT_POLYMORPH,
         AMULET_OF_UNCHANGING, LARGE_BOX, CHEST, WAN_SLOW_MONSTER,
         SPE_SLOW_MONSTER, WAN_SPEED_MONSTER, SPE_HEALING, SPE_EXTRA_HEALING,
         WEAPON_CLASS, ARMOR_CLASS, TOOL_CLASS, POTION_CLASS, GEM_CLASS,
         UNICORN_HORN, EGG, CORPSE, LOW_BOOTS, LEASH, MAGIC_LAMP, OIL_LAMP,
         MAGIC_MARKER, POT_GAIN_ABILITY, POT_WATER, POT_OIL, SPE_BLANK_PAPER,
         SPE_NOVEL, ROCK, MINERAL } from './objects.js';
import { PM_CROCODILE } from './monsters.js';
import { AC_VALUE } from './rng.js';
import { m_at, closed_door } from './makemon.js';
import { canspotmon, map_invisible, unmap_invisible } from './display.js';
import { find_mac } from './worn.js';
import { tmp_at, DISP_BEAM, DISP_CHANGE, DISP_END } from './display.js';
import { zap_dig } from './dig.js';
import { couldsee } from './vision.js';
import { SCROLL_CLASS, FOOD_CLASS, GLOB_OF_GREEN_SLIME, SCR_FIRE, SPE_FIREBALL,
         BRASS_LANTERN, CANDELABRUM_OF_INVOCATION, TALLOW_CANDLE,
         WAX_CANDLE } from './objects.js';
import { nomul } from './hack.js';
import { stop_occupation } from './allmain.js';
import { wakeup } from './mon.js';
import { STONE, LAVAWALL, IRONBARS, FOUNTAIN, ICE, STRAT_WAITMASK, WEB,
         IS_ROOM, IS_WALL, In_mines, Is_airlevel, ZAP_POS, SDOOR } from './const.js';
import { engr_at } from './engrave.js';
import { M1_NOHANDS, M1_CONCEAL, AD_COLD, AD_FIRE, AD_ELEC, AD_ACID,
         AD_DISN } from './monsters.js';
import {
    COLD_RES, FIRE_RES, SHOCK_RES, ACID_RES, DISINT_RES, W_ARMOR, W_ACCESSORY,
    W_WEP, W_ART, W_ARMC, W_ARM, W_ARMU, W_ARMH, W_ARMG, W_ARMF, W_ARMS,
    W_AMUL, W_TOOL, W_RING, W_RINGL,
} from './const.js';
import {
    cloak_simple_name, suit_simple_name, shirt_simple_name, helm_simple_name,
    gloves_simple_name, boots_simple_name, shield_simple_name, simpleonames,
} from './iactions.js';

/* C ref: mondata.h nohands() */
function nohands(ptr) { return (ptr.mflags1 & M1_NOHANDS) !== 0; }

// C ref: zap.c learnwand()
export function learnwand(obj) {
    /* For a wand (or wand-like tool) zapped by the player, if the
       effect was observable (determined by caller; usually seen, but
       possibly heard or felt if the hero is blinded) then discover the
       object type provided that the object itself is known (as more
       than just "a wand").  If object type is already discovered and
       we observed the effect, mark the individual wand as having been
       seen.  Suppress spells (which use fake spellbook object for `obj')
       so that casting a spell won't re-discover its forgotten book. */
    if (obj.oclass !== SPBOOK_CLASS) {
        /* if type already discovered, treat this item has having been seen
           even if hero is currently blinded (skips redundant makeknown) */
        if (objects[obj.otyp].oc_name_known) {
            observe_object(obj, Hallucination()); /* will usually be dknown already */

        /* otherwise discover it if item itself has been or can be seen */
        } else {
            /* in case it was picked up while blind and then zapped without
               examining inventory after regaining sight (bypassing xname) */
            if (!Blind())
                observe_object(obj, Hallucination());
            /* make the discovery iff we know what we're manipulating */
            if (obj.dknown)
                discover_object(obj.otyp, true, true, true); /* makeknown() */
        }
        /* update_inventory(): no perm_invent */
    }
}

// C ref: zap.c bhitm() -- monster mtmp was hit by the effect of wand or
// spell otmp
export async function bhitm(mtmp, otmp) {
    void mtmp;
    throw new Error(`bhitm(): wand/spell ${otmp.otyp} hitting a monster not ported yet`);
}

// C ref: zap.c bhito() -- object obj was hit by the effect of the wand
// or spell otmp; returns nonzero if obj was affected
export async function bhito(obj, otmp) {
    const g = game;
    const u = g.u;
    let res = 1; /* affected object by default */
    let learn_it = false;

    /* fundamental: a wand effect hitting itself doesn't do anything;
       otherwise we need to guard against accessing otmp after something
       strange has happened to it (along the lines of polymorph or
       stone-to-flesh [which aren't good examples since polymorph wands
       aren't affected by polymorph zaps and stone-to-flesh isn't
       available in wand form, but the concept still applies...]) */
    if (obj === otmp)
        return 0;

    if (obj.bypass) {
        /* The bypass bit is currently only used as follows: (see C) */
        if (g.context.bypasses) {
            return 0;
        } else {
            /* debugpline1("%s for a moment.", Tobjnam(obj, "pulsate")) */
            obj.bypass = 0;
        }
    }

    /*
     * Some parts of this function expect the object to be on the floor
     * obj->{ox,oy} to be valid.  The exception to this (so far) is
     * for the STONE_TO_FLESH spell.
     */
    if (obj === g.uball) {
        res = 0;
    } else if (obj === g.uchain) {
        throw new Error('bhito(): zapping the iron chain (unpunish()) not ported yet');
    } else
        switch (otmp.otyp) {
        case WAN_POLYMORPH:
        case SPE_POLYMORPH:
            if (obj_unpolyable(obj)) {
                res = 0;
                break;
            }
            /* KMH, conduct */
            u.uconduct.polypiles = (u.uconduct.polypiles || 0) + 1;
            /* livelog_printf(LL_CONDUCT, ...) on the first: no livelog */

            /* any saved lock context will be dangerously obsolete */
            if (Is_box(obj))
                throw new Error('bhito(): boxlock() on a polymorphed box not ported yet');

            if (obj_shudders(obj)) {
                const top = (g.level.objects || []).find(o => o.ox === u.ux
                                                         && o.oy === u.uy);
                const cover = ((obj === top) && u.uundetected
                               && (g.youmonst.data.mflags1 & M1_CONCEAL) !== 0);

                if (cansee(obj.ox, obj.oy))
                    learn_it = true;
                do_osshock(obj);
                /* eek - your cover might have been blown */
                if (cover)
                    throw new Error('bhito(): hideunder() after do_osshock() not ported yet');
                break;
            }
            obj = await poly_obj(obj, STRANGE_OBJECT);
            newsym(obj.ox, obj.oy);
            break;
        case WAN_SLOW_MONSTER: /* no effect on objects */
        case SPE_SLOW_MONSTER:
        case WAN_SPEED_MONSTER:
        case WAN_NOTHING:
        case SPE_HEALING:
        case SPE_EXTRA_HEALING:
            res = 0;
            break;
        default:
            throw new Error(`bhito(): wand/spell ${otmp.otyp} hitting an object not ported yet`);
        }
    /* if effect was observable then discover the wand type provided
       that the wand itself has been seen */
    if (learn_it)
        learnwand(otmp);
    return res;
}

/* C ref: obj.h Is_box() */
function Is_box(otmp) { return otmp.otyp === LARGE_BOX || otmp.otyp === CHEST; }

/* C ref: obj.h unpolyable() */
function unpolyable(o) {
    return o.otyp === WAN_POLYMORPH || o.otyp === SPE_POLYMORPH
        || o.otyp === POT_POLYMORPH || o.otyp === AMULET_OF_UNCHANGING;
}

// C ref: zap.c obj_shudders()
export function obj_shudders(obj) {
    let zap_odds;

    if (game.context.bypasses && obj.bypass)
        return false;

    if (obj.oclass === WAND_CLASS)
        zap_odds = 3; /* half-life = 2 zaps */
    else if (obj.cursed)
        zap_odds = 3; /* half-life = 2 zaps */
    else if (obj.blessed)
        zap_odds = 12; /* half-life = 8 zaps */
    else
        zap_odds = 8; /* half-life = 6 zaps */

    /* adjust for "large" quantities of identical things */
    if (obj.quan > 4)
        zap_odds = Math.trunc(zap_odds / 2);

    return !rn2(zap_odds);
}

/* C ref: you.h Luck */
function Luck() { return (game.u.uluck || 0) + (game.u.moreluck || 0); }

// C ref: zap.c do_osshock() -- assumes obj is on the floor
export function do_osshock(obj) {
    const g = game;

    /* MAIL_STRUCTURES: SCR_MAIL isn't in this build */
    g.obj_zapped = true;

    if (g.poly_zapped < 0) {
        /* some may metamorphose */
        for (let i = obj.quan; i; i--)
            if (!rn2(Luck() + 45)) {
                g.poly_zapped = objects[obj.otyp].oc_material;
                break;
            }
    }

    /* if quan > 1 then some will survive intact */
    if (obj.quan > 1) {
        if (obj.quan > LARGEST_INT)
            obj = splitobj(obj, rnd(30000));
        else
            obj = splitobj(obj, rnd(obj.quan - 1));
    }

    /* appropriately add damage to bill */
    if (costly_spot(obj.ox, obj.oy))
        throw new Error('do_osshock(): billing for shop goods not ported yet');

    /* zap the object */
    delobj(obj);
}

// C ref: zap.c obj_unpolyable() -- returns TRUE if obj resists polymorphing
export function obj_unpolyable(obj) {
    return (unpolyable(obj)
            || obj === game.uball || obj === game.uskin
            || obj_resists(obj, 5, 95));
}

/* classes of items whose current charge count carries over across polymorph
 */
const charged_objs = [WAND_CLASS, WEAPON_CLASS, ARMOR_CLASS];

// C ref: mkobj.c replace_object() -- the floor and free cases
function replace_object(obj, otmp) {
    otmp.where = obj.where;
    switch (obj.where) {
    case 'OBJ_FREE':
        /* do nothing */
        break;
    case 'OBJ_FLOOR': {
        /* otmp takes obj's place in fobj and in the pile at <ox,oy> */
        const fobj = game.level.objects;
        otmp.ox = obj.ox;
        otmp.oy = obj.oy;
        const i = fobj.indexOf(otmp);
        if (i >= 0)
            fobj.splice(i, 1);
        fobj.splice(fobj.indexOf(obj), 1, otmp);
        break;
    }
    default:
        throw new Error(`replace_object(): where=${obj.where} not ported yet`);
    }
}

// C ref: zap.c poly_obj()
/*
 * Polymorph the object to the given object ID.  If the ID is STRANGE_OBJECT
 * then pick random object from the source's class (this is the standard
 * "polymorph" case).  If ID is set to a specific object, inhibit fusing
 * n objects into 1.  This could have been added as a flag, but currently
 * it is tied to not being the standard polymorph case. The new polymorphed
 * object replaces obj in its link chains.  Return value is a pointer to
 * the new object.
 */
export async function poly_obj(obj, id) {
    const g = game;
    let otmp;
    let ox = 0, oy = 0;
    const can_merge = (id === STRANGE_OBJECT);
    const obj_location = obj.where;

    if (obj.otyp === BOULDER && g.level.flags.sokoban_rules)
        throw new Error('poly_obj(): sokoban_guilt() not ported yet');
    if (id === STRANGE_OBJECT) { /* preserve symbol */
        let try_limit = 3;
        let magic_obj = !!objects[obj.otyp].oc_magic;

        if (obj.otyp === UNICORN_HORN && obj.degraded_horn)
            magic_obj = false;
        /* Try up to 3 times to make the magic-or-not status of
           the new item the same as the old item. */
        otmp = null;
        do {
            if (otmp)
                delobj(otmp);
            otmp = mkobj(obj.oclass, false);
        } while (--try_limit > 0
                 && !!objects[otmp.otyp].oc_magic !== magic_obj);
    } else {
        throw new Error('poly_obj(): polymorph into a specific object not ported yet');
    }

    /* preserve quantity */
    otmp.quan = obj.quan;
    /* preserve the shopkeeper's (lack of) interest */
    otmp.no_charge = obj.no_charge;
    /* preserve inventory letter if in inventory */
    if (obj_location === 'OBJ_INVENT')
        otmp.invlet = obj.invlet;
    /* MAIL_STRUCTURES: SCR_MAIL isn't in this build */

    /* avoid abusing eggs laid by you */
    if (obj.otyp === EGG && obj.spe)
        throw new Error('poly_obj(): hero-laid egg not ported yet');

    /* keep special fields (including charges on wands) */
    if (charged_objs.includes(otmp.oclass))
        otmp.spe = obj.spe;
    otmp.recharged = obj.recharged;

    otmp.cursed = obj.cursed;
    otmp.blessed = obj.blessed;

    if (erosion_matters(otmp)) {
        if (is_flammable(otmp) || is_rustprone(otmp) || is_crackable(otmp))
            otmp.oeroded = obj.oeroded;
        if (is_corrodeable(otmp) || is_rottable(otmp))
            otmp.oeroded2 = obj.oeroded2;
        if (is_damageable(otmp))
            otmp.oerodeproof = obj.oerodeproof;
    }

    /* Keep chest/box traps and poisoned ammo if we may */
    if (obj.otrapped && Is_box(otmp))
        otmp.otrapped = 1;
    if (obj.opoisoned && is_poisonable(otmp))
        otmp.opoisoned = 1;

    if (id === STRANGE_OBJECT && obj.otyp === CORPSE) {
        /* turn crocodile corpses into shoes */
        if (obj.corpsenm === PM_CROCODILE) {
            otmp.otyp = LOW_BOOTS;
            otmp.oclass = ARMOR_CLASS;
            otmp.spe = 0;
            otmp.oeroded = 0;
            otmp.oerodeproof = 1;
            otmp.quan = 1;
            otmp.cursed = 0;
        }
    }
    if (obj.otyp === LEASH && obj.leashmon)
        throw new Error('poly_obj(): polymorphing a leash in use not ported yet');

    /* no box contents --KAA */
    if (Has_contents(otmp) && otmp.cobj.length)
        throw new Error('poly_obj(): delete_contents() not ported yet');

    /* 'n' merged objects may be fused into 1 object */
    if (otmp.quan > 1 && (!objects[otmp.otyp].oc_merge
                          || (can_merge && otmp.quan > rn2(1000))))
        otmp.quan = 1;

    switch (otmp.oclass) {
    case TOOL_CLASS:
        if (otmp.otyp === MAGIC_LAMP) {
            otmp.otyp = OIL_LAMP;
            otmp.age = 1500; /* "best" oil lamp possible */
        } else if (otmp.otyp === MAGIC_MARKER) {
            otmp.recharged = 1; /* degraded quality */
        }
        /* don't care about the recharge count of other tools */
        break;

    case WAND_CLASS:
        while (otmp.otyp === WAN_WISHING || otmp.otyp === WAN_POLYMORPH)
            otmp.otyp = rnd_class(WAN_LIGHT, WAN_LIGHTNING);
        /* altering the object tends to degrade its quality
           (analogous to spellbook `read count' handling) */
        if ((otmp.recharged || 0) < rn2(7)) /* recharge_limit */
            otmp.recharged = (otmp.recharged || 0) + 1;
        break;

    case POTION_CLASS:
        while (otmp.otyp === POT_POLYMORPH)
            otmp.otyp = rnd_class(POT_GAIN_ABILITY, POT_WATER);
        /* potions of oil use obj->age field differently from other potions */
        if (otmp.otyp === POT_OIL || obj.otyp === POT_OIL)
            throw new Error('poly_obj(): fixup_oil() not ported yet');
        break;

    case SPBOOK_CLASS:
        while (otmp.otyp === SPE_POLYMORPH)
            otmp.otyp = rnd_class(g.bases[SPBOOK_CLASS], SPE_BLANK_PAPER);
        /* reduce spellbook abuse; non-blank books degrade;
           5.0: novels don't use spestudied so shouldn't degrade to blank
           (but don't force spestudied to zero for them since a non-zero
           value could get passed along to a future polymorph) */
        if (otmp.otyp !== SPE_BLANK_PAPER && otmp.otyp !== SPE_NOVEL) {
            otmp.spestudied = (obj.spestudied || 0) + 1;
            if (otmp.spestudied > MAX_SPELL_STUDY) {
                otmp.otyp = SPE_BLANK_PAPER;
                /* writing a new book over it will yield an unstudied
                   one; re-polymorphing this one as-is may or may not
                   get something non-blank */
                otmp.spestudied = rn2(otmp.spestudied);
            }
        }
        break;

    case GEM_CLASS:
        if (otmp.quan > rnd(4)
            && objects[obj.otyp].oc_material === MINERAL
            && objects[otmp.otyp].oc_material !== MINERAL) {
            otmp.otyp = ROCK; /* transmutation backfired */
            otmp.quan = Math.trunc(otmp.quan / 2); /* some material has been lost */
        }
        break;
    }

    /* update the weight */
    otmp.owt = weight(otmp);

    /*
     * ** we are now done adjusting the object (except possibly wearing it) **
     */

    /* get_obj_location(obj, &ox, &oy, BURIED_TOO | CONTAINED_TOO) */
    if (obj_location === 'OBJ_FLOOR') {
        ox = obj.ox, oy = obj.oy;
    } else {
        throw new Error(`poly_obj(): object at where=${obj_location} not ported yet`);
    }
    /* swap otmp for obj */
    replace_object(obj, otmp);
    if (obj_location === 'OBJ_FLOOR') {
        if (obj.otyp === BOULDER && otmp.otyp !== BOULDER) {
            if (!does_block(ox, oy, g.level.at(ox, oy)))
                unblock_point(ox, oy);
        } else if (obj.otyp !== BOULDER && otmp.otyp === BOULDER) {
            /* leaving boulder in liquid would trigger sanity_check warning */
            if (is_pool(ox, oy) || is_lava(ox, oy)) /* is_pool_or_lava() */
                throw new Error('poly_obj(): fracture_rock() not ported yet');
            if (does_block(ox, oy, g.level.at(ox, oy)))
                block_point(ox, oy);
        }
    }

    /* note: if otmp is gone, billing for it was handled by useup() */
    if (((otmp && otmp.where !== 'OBJ_INVENT') || obj.unpaid)
        && costly_spot(ox, oy))
        throw new Error('poly_obj(): shopkeeper reaction not ported yet');
    delobj(obj);
    return otmp;
}

// C ref: zap.c bhitpile()
export async function bhitpile(
    obj,          /* wand or fake spellbook for type of zap */
    fhito,        /* callback for each object being hit */
    tx, ty,       /* target location */
    zz) {         /* direction for up/down zaps */
    const g = game;
    const u = g.u;
    let otmp;
    let first;
    let hitanything = 0;
    /* svl.level.objects[tx][ty] chain, top of the pile first */
    const pile_at = () => (g.level.objects || []).filter(o => o.ox === tx
                                                         && o.oy === ty);

    if (!pile_at().length)
        return 0;

    /* if hiding underneath an object and zapping up or down, the top item
       is either the only thing hit (up) or is skipped (down) */
    const hidingunder = (zz !== 0 && u.uundetected
                         && (g.youmonst.data.mflags1 & M1_CONCEAL) !== 0);
    first = true;

    if (obj.otyp === SPE_FORCE_BOLT || obj.otyp === WAN_STRIKING) {
        const t = t_at(tx, ty);
        if (t && t.ttyp === STATUE_TRAP)
            throw new Error('bhitpile(): activate_statue_trap() not ported yet');
    }

    g.poly_zapped = -1;
    /* next_obj = otmp->nexthere is taken before each call, so iterate
       over a snapshot of the pile */
    for (otmp of pile_at()) {
        if (hidingunder) {
            if (first) {
                first = false; /* reset for next item */
                if (zz > 0) /* down when hiding-under skips first item */
                    continue;
            } else {
                /* !first */
                if (zz < 0) /* up when hiding-under skips rest of pile */
                    continue;
            }
        }
        if (otmp.where !== 'OBJ_FLOOR' || otmp.ox !== tx || otmp.oy !== ty)
            continue;
        hitanything += await fhito(otmp, obj);
    }

    if (g.poly_zapped >= 0)
        throw new Error('bhitpile(): create_polymon() not ported yet');

    /* when boulders are present they're expected to be on top; with
       multiple boulders it's possible for some to have been changed into
       non-boulders (polymorph, stone-to-flesh) while ones beneath resist,
       so re-stack pile if there are any non-boulders above boulders */
    let prevotyp = BOULDER;
    for (otmp of pile_at()) {
        if (otmp.otyp === BOULDER && prevotyp !== BOULDER)
            throw new Error('bhitpile(): recreate_pile_at() not ported yet');
        prevotyp = otmp.otyp;
    }

    if (hidingunder) /* pile might have been destroyed or dispersed */
        throw new Error('bhitpile(): maybe_unhide_at() not ported yet');

    /* fill_pit(tx, ty) */
    {
        const t = t_at(tx, ty);
        if (t && (t.ttyp === PIT || t.ttyp === SPIKED_PIT)
            && sobj_at(BOULDER, tx, ty))
            throw new Error('bhitpile(): fill_pit() not ported yet');
    }

    return hitanything;
}

// C ref: dbridge.c find_drawbridge() -- returns the drawbridge location
// (in *pos) for a drawbridge span or its wall, or null
export function find_drawbridge(x, y) {
    const lev = (xx, yy) => game.level.at(xx, yy);

    if (IS_DRAWBRIDGE(lev(x, y).typ))
        return { x, y };
    /* is_drawbridge_wall() */
    if (lev(x, y).typ !== DOOR && lev(x, y).typ !== DBWALL)
        return null;
    const dbdir = (xx, yy) => (lev(xx, yy).drawbridgemask ?? 0) & DB_DIR;
    if (isok(x + 1, y) && IS_DRAWBRIDGE(lev(x + 1, y).typ)
        && dbdir(x + 1, y) === DB_WEST)
        return { x: x + 1, y };
    if (isok(x - 1, y) && IS_DRAWBRIDGE(lev(x - 1, y).typ)
        && dbdir(x - 1, y) === DB_EAST)
        return { x: x - 1, y };
    if (isok(x, y - 1) && IS_DRAWBRIDGE(lev(x, y - 1).typ)
        && dbdir(x, y - 1) === DB_SOUTH)
        return { x, y: y - 1 };
    if (isok(x, y + 1) && IS_DRAWBRIDGE(lev(x, y + 1).typ)
        && dbdir(x, y + 1) === DB_NORTH)
        return { x, y: y + 1 };
    return null;
}

// C ref: zap.c zap_map() -- occurs before hitting monsters or objects and
// handles wands or spells that don't dish out 'elemental' damage
export async function zap_map(x, y, obj) { /* zapped wand, or book for cast spell */
    const u = game.u;
    const ttmp = t_at(x, y);

    /* cancellation: maybe_explode_trap(ttmp, obj, &learn_it) */
    if (ttmp && (obj.otyp === WAN_CANCELLATION || obj.otyp === SPE_CANCELLATION))
        throw new Error('zap_map(): maybe_explode_trap() not ported yet');

    if (u.dz > 0) { /* zapping down */
        const e = engr_at(x, y);
        if (e && e.engr_type !== HEADSTONE)
            throw new Error('zap_map(): zapping down at an engraving not ported yet');
    } else if (!u.dz) {
        if (find_drawbridge(x, y)) {
            switch (obj.otyp) {
            case WAN_OPENING:
            case SPE_KNOCK:
            case WAN_LOCKING:
            case SPE_WIZARD_LOCK:
            case WAN_STRIKING:
            case SPE_FORCE_BOLT:
                throw new Error('zap_map(): zapping a drawbridge not ported yet');
            }
        } /* find_drawbridge */
    } /* !u.uz */

    if (obj.otyp === WAN_PROBING)
        throw new Error('zap_map(): probing (show_map_spot()) not ported yet');
    /* learn_it is only set by the unported cases above */
}

// C ref: zap.c zappable()
/*
 * zappable - returns 1 if zap is available, 0 otherwise.
 *            it removes a charge from the wand if zappable.
 * added by GAN 11/03/86
 */
export async function zappable(wand) {
    if (wand.spe < 0 || (wand.spe === 0 && rn2(WAND_WREST_CHANCE)))
        return 0;
    if (wand.spe === 0)
        await You("wrest one last charge from the worn-out wand.");
    wand.spe--;
    return 1;
}

// C ref: zap.c zapnodir()
/*
 * zapnodir - zaps a NODIR wand/spell.
 * Won't get here if wand has no charges (unless wresting 1 last charge).
 */
export async function zapnodir(obj) {
    const known = false;

    switch (obj.otyp) {
    case WAN_LIGHT:
        throw new Error('zapnodir(): wand of light (litroom()) not ported yet');
    case WAN_SECRET_DOOR_DETECTION:
        throw new Error('zapnodir(): secret door detection (findit()) not ported yet');
    case WAN_STASIS: {
        const tmp_until = game.moves + rn1(21, 10);

        /* no immediately obvious effect, and no message so that it isn't
           distinguishable from other NODIR wands that produce no message;
           for multiple zaps, keep the longest duration rather than latest */
        if (tmp_until > (game.level.flags.stasis_until || 0))
            game.level.flags.stasis_until = tmp_until;
        break;
    }
    case WAN_CREATE_MONSTER:
        throw new Error('zapnodir(): wand of create monster (create_critters()) not ported yet');
    case WAN_WISHING:
        throw new Error('zapnodir(): wand of wishing (makewish()) not ported yet');
    case WAN_ENLIGHTENMENT:
        throw new Error('zapnodir(): wand of enlightenment not ported yet');
    default:
        break;
    }

    if (known) {
        if (!objects[obj.otyp].oc_name_known)
            more_experienced(0, 10);
        /* effect was observable; discover the wand type provided
           that the wand itself has been seen */
        learnwand(obj);
    }
}

// C ref: zap.c backfire()
async function backfire(otmp) {
    otmp.in_use = 1; /* in case losehp() is fatal */
    await pline(`${The(xname(otmp))} suddenly explodes!`);
    const dmg = d(otmp.spe + 2, 6);
    await losehp(Maybe_Half_Phys(dmg), "exploding wand", KILLED_BY_AN);
    useupall(otmp);
}

// C ref: zap.c zap_ok() -- getobj callback for object to zap
export function zap_ok(obj) {
    if (obj && obj.oclass === WAND_CLASS)
        return GETOBJ_SUGGEST;
    return GETOBJ_EXCLUDE;
}

// C ref: zap.c dozap() -- #zap command, 'z'
export async function dozap() {
    const g = game;
    const u = g.u;
    let obj, damage;

    if (nohands(g.youmonst.data)) {
        await You("aren't able to zap anything in your current form.");
        return ECMD_OK;
    }
    if (await check_capacity(null))
        return ECMD_OK;
    obj = await getobj("zap", zap_ok, GETOBJ_NOFLAGS);
    if (!obj)
        return ECMD_CANCEL;

    check_unpaid(obj);

    const need_dir = objects[obj.otyp].oc_dir !== NODIR;
    if (!(await zappable(obj))) {
        await pline("Nothing happens."); /* pline1(nothing_happens) */
    } else if (obj.cursed && !rn2(WAND_BACKFIRE_CHANCE)) {
        await backfire(obj); /* the wand blows up in your face! */
        exercise(A_STR, false);
        /* 'obj' is gone; skip update_inventory() because
           backfire() -> useupall() -> freeinv() did it */
        return ECMD_TIME;
    } else if (need_dir && !(await getdir(null))) {
        if (!Blind())
            await pline(`${The(xname(obj))} glows and fades.`);
        /* make him pay for knowing !NODIR */
    } else if (need_dir && !u.dx && !u.dy && !u.dz) {
        if ((damage = await zapyourself(obj, true)) !== 0) {
            /* Sprintf(buf, "zapped %sself with %s", uhim(), killer_xname(obj));
               losehp(Maybe_Half_Phys(damage), buf, NO_KILLER_PREFIX); */
            throw new Error('dozap(): self-zap damage (killer_xname()) not ported yet');
        }
    } else {
        /*      Are we having fun yet?
         * weffects -> buzz(obj->otyp) -> zhitm (temple priest) ->
         * attack -> hitum -> known_hitum -> ghod_hitsu ->
         * buzz(AD_ELEC) -> destroy_items(AD_ELEC) ->
         * useup -> obfree -> dealloc_obj -> free(obj)
         */
        g.current_wand = obj;
        await weffects(obj);
        obj = g.current_wand;
        g.current_wand = null;
    }
    if (obj && obj.spe < 0) {
        await pline(`${Tobjnam(obj, "turn")} to dust.`);
        useupall(obj); /* calls freeinv() -> update_inventory() */
    } /* else update_inventory(): no perm_invent; maybe used a charge */
    return ECMD_TIME;
}

// C ref: shk.c check_unpaid() -> check_unpaid_usage(otmp, FALSE)
function check_unpaid(otmp) {
    if (!otmp.unpaid || !game.u.ushops || !game.u.ushops[0]
        || (otmp.spe <= 0 && objects[otmp.otyp].oc_charged))
        return;
    throw new Error('check_unpaid(): usage fee for unpaid item not ported yet');
}

/* C ref: youprop.h Sleep_resistance */
function Sleep_resistance() {
    const p = game.u.uprops[SLEEP_RES];
    return !!(p.intrinsic || p.extrinsic);
}

// C ref: zap.c zapyourself() -- the cases sessions reach so far
export async function zapyourself(obj, ordinary) {
    let learn_it = false;
    const damage = 0;

    switch (obj.otyp) {
    case WAN_SLEEP:
    case SPE_SLEEP:
        learn_it = true;
        if (Sleep_resistance()) {
            /* shieldeff(u.ux, u.uy): transient display only */
            await You("don't feel sleepy!");
            monstseesu(M_SEEN_SLEEP);
        } else {
            if (ordinary)
                await pline_The("sleep ray hits you!");
            else
                await You("fall asleep!");
            monstunseesu(M_SEEN_SLEEP);
            await fall_asleep(-rnd(50), true);
        }
        break;

    case WAN_NOTHING:
        break;

    case WAN_OPENING:
    case WAN_LOCKING:
    default:
        throw new Error(`zapyourself(): object ${obj.otyp} self-zap not ported yet`);
    }
    /* if effect was observable then discover the wand type provided
       that the wand itself has been seen */
    if (learn_it)
        learnwand(obj);
    return damage;
}

// C ref: zap.c zapsetup() -- used by do_break_wand() was well as by weffects()
export function zapsetup() {
    game.obj_zapped = false;
}

// C ref: zap.c zapwrapup()
export async function zapwrapup() {
    /* if do_osshock() set obj_zapped while polying, give a message now */
    if (game.obj_zapped)
        await You("feel shuddering vibrations."); /* You_feel() */
    game.obj_zapped = false;
}

// C ref: zap.c weffects() -- called for various wand and spell effects
export async function weffects(obj) {
    const g = game;
    const u = g.u;
    const otyp = obj.otyp;
    let disclose = false;
    const was_unkn = !objects[otyp].oc_name_known;

    exercise(A_WIS, true);
    if (u.usteed && (objects[otyp].oc_dir !== NODIR) && !u.dx && !u.dy
        && (u.dz > 0)) {
        throw new Error('weffects(): zap_steed() not ported yet');
    } else if (objects[otyp].oc_dir === IMMEDIATE) {
        zapsetup(); /* reset obj_zapped */
        if (u.uswallow) {
            throw new Error('weffects(): bhitm() on engulfer not ported yet');
        } else if (u.dz) {
            throw new Error('weffects(): zap_updown() not ported yet');
        } else {
            const pobj = { obj };
            await bhit(u.dx, u.dy, rn1(8, 6), ZAPPED_WAND, bhitm, bhito, pobj);
            obj = pobj.obj;
        }
        await zapwrapup(); /* give feedback for obj_zapped */

    } else if (objects[otyp].oc_dir === NODIR) {
        await zapnodir(obj);

    } else {
        /* neither immediate nor directionless */

        if (otyp === WAN_DIGGING || otyp === SPE_DIG)
            await zap_dig();
        else if (otyp >= SPE_MAGIC_MISSILE && otyp <= SPE_FINGER_OF_DEATH)
            /* BZ_U_SPELL(BZ_OFS_SPE(otyp)) */
            await ubuzz(10 + Math.abs(otyp - SPE_MAGIC_MISSILE) % 10,
                        Math.trunc(u.ulevel / 2) + 1);
        else if (otyp >= WAN_MAGIC_MISSILE && otyp <= WAN_LIGHTNING)
            /* BZ_U_WAND(BZ_OFS_WAN(otyp)) */
            await ubuzz(Math.abs(otyp - WAN_MAGIC_MISSILE) % 10,
                        (otyp === WAN_MAGIC_MISSILE) ? 2 : 6);
        else
            throw new Error('weffects: unexpected spell or wand'); /* impossible() */
        disclose = true;
    }
    if (disclose) {
        learnwand(obj);
        if (was_unkn)
            more_experienced(0, 10);
    }
}

// C ref: zap.c adtyp_to_prop()
/* convert attack damage AD_foo to property resistance */
function adtyp_to_prop(dmgtyp) {
    switch (dmgtyp) {
    case AD_COLD:
        return COLD_RES;
    case AD_FIRE:
        return FIRE_RES;
    case AD_ELEC:
        return SHOCK_RES;
    case AD_ACID:
        return ACID_RES;
    case AD_DISN:
        return DISINT_RES;
    default:
        break;
    }
    return 0; /* prop_types start at 1 */
}

// C ref: zap.c u_adtyp_resistance_obj()
/* Is hero wearing or wielding an object with resistance to attack
   damage type? Returns the percentage protection that the object gives. */
export function u_adtyp_resistance_obj(dmgtyp) {
    const prop = adtyp_to_prop(dmgtyp);

    if (!prop)
        return 0;

    /* FIXME? these percentages (99 and 90) seem too high... */

    /* items that give an extrinsic resistance when worn or wielded or
       carried give 99% protection to your items */
    if ((game.u.uprops[prop].extrinsic & (W_ARMOR | W_ACCESSORY | W_WEP | W_ART))
        !== 0)
        return 99;

    /* worn dwarvish cloaks give 90% protection against heat and cold to
       carried items */
    if (game.uarmc && game.uarmc.otyp === DWARVISH_CLOAK
        && (dmgtyp === AD_COLD || dmgtyp === AD_FIRE))
        return 90;

    return 0;
}

// C ref: zap.c item_what()
/* for enlightenment; currently only useful in wizard mode; cf from_what() */
export function item_what(dmgtyp) {
    let whatbuf = "";
    let what = null;
    const prop = adtyp_to_prop(dmgtyp);
    const xtrinsic = game.u.uprops[prop].extrinsic;

    if (game.flags.debug) { /* wizard */
        if (!prop || !xtrinsic) {
            ; /* 'what' stays Null */
        } else if (xtrinsic & W_ARMC) {
            what = cloak_simple_name(game.uarmc);
        } else if (xtrinsic & W_ARM) {
            what = suit_simple_name(game.uarm); /* "dragon {scales,mail}" */
        } else if (xtrinsic & W_ARMU) {
            what = shirt_simple_name(game.uarmu);
        } else if (xtrinsic & W_ARMH) {
            what = helm_simple_name(game.uarmh);
        } else if (xtrinsic & W_ARMG) {
            what = gloves_simple_name(game.uarmg);
        } else if (xtrinsic & W_ARMF) {
            what = boots_simple_name(game.uarmf);
        } else if (xtrinsic & W_ARMS) {
            what = shield_simple_name(game.uarms);
        } else if (xtrinsic & (W_AMUL | W_TOOL)) {
            what = simpleonames((xtrinsic & W_AMUL) ? game.uamul : game.ublindf);
        } else if (xtrinsic & W_RING) {
            if ((xtrinsic & W_RING) === W_RING) /* both */
                what = "rings";
            else
                what = simpleonames((xtrinsic & W_RINGL) ? game.uleft : game.uright);
        } else if (xtrinsic & W_WEP) {
            what = simpleonames(game.uwep);
        }
        /* format the output to be ready for enl_msg() to append it to
           "Your items {are,were} protected against <damage-type>" */
        if (what) /* strlen(what) will be less than 30 */
            whatbuf = ` by your ${what.slice(0, 40)}`;
    }
    return whatbuf;
}

// C ref: zap.c exclam()
export function exclam(force) {
    /* force == 0 occurs e.g. with sleep ray */
    /* note that large force is usual with wands so that !! would
            require information about hand/weapon/wand */
    return (force < 0) ? "?" : (force <= 4) ? "." : "!";
}

// C ref: zap.c flashburn()
/* light blinding: returns True if it blinds */
export async function flashburn(duration, via_lightning) {
    if (!resists_blnd(game.youmonst)) {
        await You("are blinded by the flash!"); /* are_blinded_by_the_flash */
        await make_blinded(duration, false);
        if (!Blind())
            await Your("vision quickly clears."); /* Your1(vision_clears) */
        return true;
    }
    /* if blinding is resisted due to magical equipment (Sunsword), give
       a sparkle animation (even if also resisted due to being blind)
       _unless_ this is lightning-induced */
    if (!via_lightning && resists_blnd_by_arti(game.youmonst)) {
        /* shieldeff(u.ux, u.uy): transient display only */
        return true;
    }
    return false;
}

// C ref: zap.c hit()
export async function hit(
    str,     /* zap text or missile name */
    mtmp,    /* target; for missile, might be hero */
    force) { /* usually either "." or "!" via exclam() */
    const g = game;
    const verbosely = (mtmp === g.youmonst
                       || ((g.flags.verbose ?? true)
                           && (cansee(g.bhitpos.x, g.bhitpos.y)
                               || canspotmon(mtmp)
                               /* engulfing_u(mtmp) */
                               || (g.u.uswallow && mtmp === g.u.ustuck))));

    await pline(`${The(str)} ${vtense(str, "hit")} ${
        verbosely ? mon_nam(mtmp) : "it"}${force}`);
}

// C ref: zap.c miss()
export async function miss(str, mtmp) {
    const g = game;
    await pline(`${The(str)} ${vtense(str, "miss")} ${
        ((cansee(g.bhitpos.x, g.bhitpos.y) || canspotmon(mtmp))
         && (g.flags.verbose ?? true)) ? mon_nam(mtmp) : "it"}.`);
}

/* C ref: zap.c ZT_* -- zap types (AD_foo - 1) */
const ZT_MAGIC_MISSILE = 0, ZT_FIRE = 1, ZT_COLD = 2, ZT_SLEEP = 3,
    ZT_DEATH = 4, ZT_LIGHTNING = 5, ZT_POISON_GAS = 6, ZT_ACID = 7;
void ZT_MAGIC_MISSILE; void ZT_SLEEP;
function ZT_SPELL(x) { return 10 + x; }
function ZT_BREATH(x) { return 20 + x; }
/* C ref: zap.c is_hero_spell() */
function is_hero_spell(type) { return type >= 10 && type < 20; }
/* C ref: hack.h PHYS_EXPL_TYPE */
const PHYS_EXPL_TYPE = -1;

const flash_types = [
    "magic missile", /* Wands must be 0-9 */
    "bolt of fire", "bolt of cold", "sleep ray", "death ray",
    "bolt of lightning", "", "", "", "",

    "magic missile", /* Spell equivalents must be 10-19 */
    "fireball", "cone of cold", "sleep ray", "finger of death",
    "bolt of lightning", /* there is no spell, used for retribution */
    "", "", "", "",

    "blast of missiles", /* Dragon breath equivalents 20-29*/
    "blast of fire", "blast of frost", "blast of sleep gas",
    "blast of disintegration", "blast of lightning",
    "blast of poison gas", "blast of acid", "", ""
];

// C ref: zap.c zaptype() -- convert monster zap/spell/breath value to hero
// zap/spell/breath value
function zaptype(type) {
    if (type <= -30 && -39 <= type) /* monster wand zap */
        type += 30; /* first convert -39..-30 to -9..0 so that abs()
                     * will yield 0..9 (hero wand zap) for it */
    type = Math.abs(type);
    return type;
}

// C ref: zap.c flash_str()
export function flash_str(typ, nohallu) { /* suppress hallucination (for death reasons) */
    typ = zaptype(typ);
    if (Hallucination() && !nohallu)
        throw new Error('flash_str(): rnd_hallublast() not ported yet');
    return flash_types[typ];
}

// C ref: zap.c bounce_dir()
function bounce_dir(sx, sy, dd, bounceback) {
    const lev = (x, y) => game.level.at(x, y);
    if (!dd.dx || !dd.dy || (bounceback > 0 && !rn2(bounceback))) {
        dd.dx = -dd.dx;
        dd.dy = -dd.dy;
    } else {
        let rmn;
        let bounce = 0;
        const lsy = sy - dd.dy;
        const lsx = sx - dd.dx;

        if (isok(sx, lsy) && ZAP_POS(rmn = lev(sx, lsy).typ)
            && !closed_door(sx, lsy)
            && (IS_ROOM(rmn) || (isok(sx + dd.dx, lsy)
                                 && ZAP_POS(lev(sx + dd.dx, lsy).typ))))
            bounce = 1;
        if (isok(lsx, sy) && ZAP_POS(rmn = lev(lsx, sy).typ)
            && !closed_door(lsx, sy)
            && (IS_ROOM(rmn) || (isok(lsx, sy + dd.dy)
                                 && ZAP_POS(lev(lsx, sy + dd.dy).typ))))
            if (!bounce || rn2(2))
                bounce = 2;
        switch (bounce) {
        case 0:
            dd.dx = -dd.dx;
            /*FALLTHRU*/
        case 1: // eslint-disable-line no-fallthrough
            dd.dy = -dd.dy;
            break;
        case 2:
            dd.dx = -dd.dx;
            break;
        }
    }
}

// C ref: zap.c zap_hit() -- will zap/spell/breath attack score a hit
// against armor class `ac'?
function zap_hit(ac, type) { /* either hero cast spell type or 0 */
    const chance = rn2(20);
    if (type)
        throw new Error('zap_hit(): spell_hit_bonus() not ported yet');
    const spell_bonus = 0;

    /* small chance for naked target to avoid being hit */
    if (!chance)
        return rnd(10) < ac + spell_bonus;

    /* very high armor protection does not achieve invulnerability */
    ac = AC_VALUE(ac);

    return (3 - chance < ac + spell_bonus);
}

// C ref: zap.c ubuzz()
export async function ubuzz(type, nd) {
    await dobuzz(type, nd, game.u.ux, game.u.uy, game.u.dx, game.u.dy,
                 true, false, false);
}

// C ref: zap.c buzz()
export async function buzz(type, nd, sx, sy, dx, dy) {
    await dobuzz(type, nd, sx, sy, dx, dy, true, false, false);
}

// C ref: zap.c dobuzz()
/*
 * type ==   0 to   9 : you zapping a wand
 * type ==  10 to  19 : you casting a spell
 * type ==  20 to  29 : you breathing as a monster
 * type == -10 to -19 : monster casting spell
 * type == -20 to -29 : monster breathing at you
 * type == -30 to -39 : monster zapping a wand
 * called with dx = dy = 0 for vertical bolts
 */
export async function dobuzz(
    type,              /* 0..29 (by hero) or -39..-10 (by monster) */
    nd,                /* damage strength ('number of dice') */
    sx, sy,            /* starting point */
    dx, dy,            /* direction delta */
    sayhit, saymiss,   /* report out of sight hit/miss events */
    forcemiss) {
    const g = game;
    const u = g.u;
    let range;
    const fltyp = zaptype(type), damgtype = fltyp % 10;
    let lsx = sx, lsy = sy;
    let mon;
    const shopdamage = { v: false };
    const fireball = (type === ZT_SPELL(ZT_FIRE)); /* set once */
    let gas_hit = false; /* will be set during each iteration */
    void sayhit; void saymiss; void nd;
    /* hdmgtype only picks the transient beam glyph */
    const hdmgtype = Hallucination() ? rn2(6) : damgtype;
    void hdmgtype;

    /* if it's a hero spell then get its SPE_TYPE */
    const spell_type = is_hero_spell(type) ? SPE_MAGIC_MISSILE + damgtype : 0;

    if (u.uswallow) {
        if (type < 0)
            return;
        throw new Error('dobuzz(): zapping a ray while engulfed (zhitm()) not ported yet');
    }
    if (type < 0)
        newsym(u.ux, u.uy);
    range = rn1(7, 7);
    if (dx === 0 && dy === 0)
        range = 1;
    const save_bhitpos = g.bhitpos ? { x: g.bhitpos.x, y: g.bhitpos.y } : g.bhitpos;

    tmp_at(DISP_BEAM, 0); /* zapdir_to_glyph(dx, dy, hdmgtype) */
    while (range-- > 0) {
        lsx = sx;
        sx += dx;
        lsy = sy;
        sy += dy;
        let make_bounce = false;
        if (!isok(sx, sy) || g.level.at(sx, sy).typ === STONE) {
            make_bounce = true; /* goto make_bounce */
        } else {
            mon = m_at(sx, sy);
            if (cansee(sx, sy)) {
                /* reveal/unreveal invisible monsters before tmp_at() */
                if (mon && !canspotmon(mon))
                    map_invisible(sx, sy);
                else if (!mon)
                    unmap_invisible(sx, sy);
                if (ZAP_POS(g.level.at(sx, sy).typ)
                    || (isok(lsx, lsy) && cansee(lsx, lsy)))
                    tmp_at(sx, sy);
                /* nh_delay_output(): wait a little */
            }

            /* hit() and miss() need gb.bhitpos to match the target */
            g.bhitpos = { x: sx, y: sy };
            gas_hit = (damgtype === ZT_POISON_GAS);
            /* fireballs only damage when they explode; poison gas leaves
               a trail of 1x1 clouds via zap_over_floor(), but that gets
               skipped for a hit that is reflected so is deferred until we
               know whether reflection is happening */
            if (!fireball && !gas_hit) {
                range += await zap_over_floor(sx, sy, type, shopdamage, true, 0);
                /* zap with fire -> melt ice -> drown monster, so monster
                   found and cached above might not be here any more */
                mon = m_at(sx, sy);
            }

            if (mon) {
                if (fireball)
                    break;
                if (type >= 0)
                    mon.mstrategy = (mon.mstrategy || 0) & ~STRAT_WAITMASK;
                /* buzzmonst: */
                g.notonhead = (mon.mx !== g.bhitpos.x || mon.my !== g.bhitpos.y);
                if (!forcemiss && zap_hit(find_mac(mon), spell_type)) {
                    throw new Error('dobuzz(): ray hitting a monster (mon_reflects()/zhitm()) not ported yet');
                } else {
                    throw new Error('dobuzz(): ray missing a monster (miss()) not ported yet');
                }
            } else if (u.ux === sx && u.uy === sy && range >= 0) {
                nomul(0);
                if (u.usteed)
                    throw new Error('dobuzz(): ray hitting the steed not ported yet');
                if (!forcemiss && zap_hit(u.uac, 0)) {
                    throw new Error('dobuzz(): ray hitting you (zhitu()) not ported yet');
                } else if (!Blind()) {
                    await pline(`${The(flash_str(fltyp, false))} whizzes by you!`);
                } else if (damgtype === ZT_LIGHTNING) {
                    await Your(`${body_part(ARM)} tingles.`);
                }
                if (damgtype === ZT_LIGHTNING)
                    await flashburn(d(nd, 50), true);
                await stop_occupation();
                nomul(0);
            }
            /* gas that missed or that hit without being reflected will leave
               a 1x1 cloud here; the earlier zap_over_floor() was deferred */
            if (gas_hit)
                await zap_over_floor(sx, sy, type, shopdamage, true, 0);
        }

        if (make_bounce
            || !ZAP_POS(g.level.at(sx, sy).typ)
            || (closed_door(sx, sy) && range >= 0)) {
            /* make_bounce: */
            const bchance = (!isok(sx, sy) || g.level.at(sx, sy).typ === STONE) ? 10
                : (In_mines(u.uz) && IS_WALL(g.level.at(sx, sy).typ)) ? 20
                    : 75;
            if ((--range > 0 && isok(lsx, lsy) && cansee(lsx, lsy))
                || fireball) {
                if (Is_airlevel(u.uz)) { /* nothing to bounce off of */
                    throw new Error('dobuzz(): ray on the Plane of Air not ported yet');
                } else if (fireball) {
                    sx = lsx;
                    sy = lsy;
                    break; /* fireballs explode before the obstacle */
                } else
                    await pline_The(`${flash_str(fltyp, false)} bounces!`);
            }
            const dd = { dx, dy };
            bounce_dir(sx, sy, dd, bchance);
            dx = dd.dx, dy = dd.dy;
            tmp_at(DISP_CHANGE, 0); /* zapdir_to_glyph(dx, dy, hdmgtype) */
        }
    }
    tmp_at(DISP_END, 0);
    if (fireball)
        throw new Error('dobuzz(): fireball explode() not ported yet');
    if (shopdamage.v)
        throw new Error('dobuzz(): pay_for_damage() not ported yet');
    g.bhitpos = save_bhitpos;
}

// C ref: zap.c zap_over_floor() -- the cases with no terrain/object
// effects; everything else throws until ported
async function zap_over_floor(
    x, y,              /* location */
    type,              /* damage type plus {wand|spell|breath} info */
    shopdamage,        /* extra output if shop door is destroyed */
    ignoremon,         /* ignore any monster here */
    exploding_wand_typ) { /* supplied when breaking a wand; or POT_OIL
                           * when a lit potion of oil explodes */
    const g = game;
    const lev = g.level.at(x, y);
    const see_it = cansee(x, y);
    let rangemod = 0;
    const damgtype = zaptype(type) % 10;
    const lavawall = (lev.typ === LAVAWALL);
    void shopdamage;

    if (type === PHYS_EXPL_TYPE) {
        /* this won't have any effect on the floor */
        return -1000; /* not a zap anyway, shouldn't matter */
    }

    switch (damgtype) {
    case ZT_FIRE: {
        const t = t_at(x, y);
        if (t && t.ttyp === WEB)
            throw new Error('zap_over_floor(): burning a web not ported yet');
        if (lev.typ === ICE || is_pool(x, y) || lev.typ === FOUNTAIN)
            throw new Error('zap_over_floor(): fire over ice/water/fountain not ported yet');
        break; /* ZT_FIRE */
    }
    case ZT_COLD:
        if (is_pool(x, y) || is_lava(x, y) || lavawall || lev.typ === ICE)
            throw new Error('zap_over_floor(): cold over water/lava/ice not ported yet');
        break; /* ZT_COLD */

    case ZT_POISON_GAS:
        if (ZAP_POS(lev.typ))
            throw new Error('zap_over_floor(): create_gas_cloud() not ported yet');
        break;

    case ZT_LIGHTNING:
    case ZT_ACID:
        if (lev.typ === IRONBARS)
            throw new Error('zap_over_floor(): ray hitting iron bars not ported yet');
        break; /* ZT_ACID */

    default:
        break;
    }

    /* set up zap text for possible door feedback; for exploding wand, we
       want "the blast" rather than "your blast" even if hero caused it */
    const yourzap = (type >= 0 && !exploding_wand_typ);
    let zapverb = "blast"; /* breath attack or wand explosion */
    if (!exploding_wand_typ) {
        const ztype = zaptype(type); /* 0..29 for both hero and monsters */

        if (ztype < ZT_SPELL(0))
            zapverb = "bolt"; /* wand zap */
        else if (ztype < ZT_BREATH(0))
            zapverb = "spell";
    } else {
        throw new Error('zap_over_floor(): exploding wand/oil not ported yet');
    }

    /* secret door gets revealed, converted into regular door */
    if (lev.typ === SDOOR)
        throw new Error('zap_over_floor(): revealing a secret door not ported yet');

    /* regular door absorbs remaining zap range, possibly gets destroyed */
    if (closed_door(x, y)) {
        rangemod = -1000;
        switch (damgtype) {
        case ZT_FIRE:
        case ZT_COLD:
        case ZT_LIGHTNING:
            throw new Error('zap_over_floor(): ray destroying a door not ported yet');
        case ZT_DEATH:
            /* death spells/wands don't disintegrate */
            if (Math.abs(type) === ZT_BREATH(ZT_DEATH))
                throw new Error('zap_over_floor(): ray destroying a door not ported yet');
            /* goto def_case */
            // eslint-disable-next-line no-fallthrough
        default:
            /* def_case: (exploding_wand_typ is 0 here) */
            if (see_it) {
                /* "the door absorbs the blast" would be
                   inaccurate for an exploding wand since
                   other adjacent locations still get hit */
                await pline_The(`door absorbs ${yourzap ? "your" : "the"} ${zapverb}!`);
            } else
                await You("feel vibrations."); /* You_feel() */
            break;
        }
    }

    if ((g.level.objects || []).some(o => o.ox === x && o.oy === y) /* OBJ_AT() */
        && damgtype === ZT_FIRE)
        if (await burn_floor_objects(x, y, false, type > 0) && couldsee(x, y)) {
            newsym(x, y);
            await You(`${!Blind() ? "see a puff" : "smell a whiff"} of smoke.`);
        }
    let mon;
    if (!ignoremon && (mon = m_at(x, y)) !== null && mon !== undefined)
        await wakeup(mon, (type >= 0) ? true : false);
    return rangemod;
}

/* C ref: obj.h ignitable() */
function ignitable(otmp) {
    return otmp.otyp === BRASS_LANTERN || otmp.otyp === OIL_LAMP
        || (otmp.otyp === MAGIC_LAMP && otmp.spe > 0)
        || otmp.otyp === CANDELABRUM_OF_INVOCATION
        || otmp.otyp === TALLOW_CANDLE || otmp.otyp === WAX_CANDLE
        || otmp.otyp === POT_OIL;
}

// C ref: zap.c burn_floor_objects() -- burn scrolls and spellbooks on
// floor at position x,y; return the number of scrolls and spellbooks burned
async function burn_floor_objects(
    x, y,
    give_feedback, /* caller needs to decide about visibility checks */
    u_caused) {
    let cnt = 0;

    for (const obj of (game.level.objects || []).filter(o => o.ox === x
                                                        && o.oy === y)) {
        if (obj.oclass === SCROLL_CLASS || obj.oclass === SPBOOK_CLASS
            || (obj.oclass === FOOD_CLASS
                && obj.otyp === GLOB_OF_GREEN_SLIME)) {
            if (obj.otyp === SCR_FIRE || obj.otyp === SPE_FIREBALL
                || obj_resists(obj, 2, 100))
                continue;
            const scrquan = obj.quan; /* number present */
            let delquan = 0;          /* number to destroy */
            for (let i = scrquan; i > 0; i--)
                if (!rn2(3))
                    delquan++;
            if (delquan) {
                if (give_feedback)
                    throw new Error('burn_floor_objects(): feedback messages not ported yet');
                /* useupf(), which charges, only if hero caused damage */
                if (u_caused)
                    throw new Error('burn_floor_objects(): useupf() not ported yet');
                else if (delquan < scrquan) {
                    obj.quan -= delquan;
                    obj.owt = weight(obj);
                } else
                    delobj(obj);
                cnt += delquan;
            }
        }
    }
    /* This also ignites floor items, but does not change cnt
       because they weren't consumed. */
    /* ignite_items(svl.level.objects[x][y]) -> catch_lit() */
    for (const obj of (game.level.objects || []).filter(o => o.ox === x
                                                        && o.oy === y))
        if (!obj.lamplit && !obj.in_use && ignitable(obj))
            throw new Error('burn_floor_objects(): catch_lit() not ported yet');
    return cnt;
}
