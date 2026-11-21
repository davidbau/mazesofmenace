// pickup.js — picking up objects.
// C ref: pickup.c
//
// Ported so far: the start of pickup(), up to autopickup's early return
// when there's nothing at the hero's spot.  autopick(), query_objlist(),
// check_here() and the rest of pickup.c are not ported yet.

import { game } from './gstate.js';
import { is_pool, is_lava } from './makemon.js';
import { engr_at, read_engr_at } from './engrave.js';
import { near_capacity } from './hack.js';
import { You, Your, You_cant, pline } from './display.js';
import { rn2 } from './rng.js';
import { check_capacity, nomul } from './hack.js';
import { flush_screen } from './display.js';
import { look_here } from './invent.js';
import { M1_NOTAKE, M1_CONCEAL } from './monsters.js';
import { get_adjacent_loc } from './cmd.js';
import { Is_container } from './mkobj.js';
import { isok, IS_GRAVE, CONFUSION, STUNNED, ECMD_OK, ECMD_TIME } from './const.js';
import { m_at } from './makemon.js';
import { mon_nam } from './do_name.js';
import { M1_NOHANDS, M1_NOLIMBS } from './monsters.js';
import { BLINDED, HAND } from './const.js';
import { CORPSE, BAG_OF_TRICKS, HORN_OF_PLENTY, WOODEN_FLUTE, MAGIC_FLUTE,
         TOOLED_HORN, FROST_HORN, FIRE_HORN, WOODEN_HARP, MAGIC_HARP, BUGLE,
         LEATHER_DRUM, DRUM_OF_EARTHQUAKE, SLIME_MOLD, TIN, EGG, ROCK,
         POT_WATER, TOWEL, GEMSTONE, GLASS, OBJ_DESCR, ARM_HELM, ARM_GLOVES,
         ARM_BOOTS, ARM_SHIELD, ARM_CLOAK, ARM_SHIRT, ARM_SUIT } from './objects.js';
import { is_pole, is_wet_towel } from './wield.js';
import { cxname_singular } from './objnam.js';
import { strcmpi } from './hacklib.js';
import { P_BOW, P_CROSSBOW, P_SPEAR, P_DAGGER, P_KNIFE } from './const.js';
import { t_at, is_pit } from './trap.js';
import { can_reach_floor } from './engrave.js';
import { freehand } from './wield.js';
import { body_part } from './insight.js';
import { the } from './iactions.js';
import { xname } from './objnam.js';
import { autokey, AUTOUNLOCK_APPLY_KEY, AUTOUNLOCK_UNTRAP,
         AUTOUNLOCK_FORCE } from './lock.js';
import { costly_spot } from './insight.js';
import { money_cnt } from './u_init.js';
import { max_capacity, calc_capacity, inv_cnt } from './hack.js';
import { weight, splitobj, obj_extract_self } from './mkobj.js';
import { doname, otense } from './objnam.js';
import { There, newsym, newsym_force } from './display.js';
import { carrying, merge_choice, addinv, prinv, reset_justpicked,
         will_feel_cockatrice, def_inv_order, let_to_name,
         add_menu_heading } from './invent.js';
import { doname_with_price } from './objnam.js';
import { def_oc_syms } from './drawing.js';
import { tty_create_nhwindow, tty_start_menu, tty_add_menu, tty_end_menu,
         tty_select_menu, tty_destroy_nhwindow } from './wintty.js';
import { objects, AMULET_CLASS, RING_CLASS, WAND_CLASS, POTION_CLASS,
         SCROLL_CLASS, SPBOOK_CLASS, GEM_CLASS, FOOD_CLASS, TOOL_CLASS,
         WEAPON_CLASS, ARMOR_CLASS, ROCK_CLASS, BALL_CLASS, CHAIN_CLASS,
         VENOM_CLASS } from './objects.js';
import { BY_NEXTHERE, AUTOSELECT_SINGLE, INVORDER_SORT, FEEL_COCKATRICE,
         USE_INVLET, SIGNAL_NOMENU, SIGNAL_ESCAPE, INCLUDE_HERO,
         INCLUDE_VENOM, PICK_ANY, PICK_NONE, NHW_MENU, MENU_BEHAVE_STANDARD,
         MENU_ITEMFLAGS_NONE, MENU_TRADITIONAL, MENU_FULL, SORTLOOT_PACK,
         SORTLOOT_INVLET, SORTLOOT_LOOT, SORTLOOT_INUSE,
         SORTLOOT_PETRIFY } from './const.js';
import { NO_COLOR, ATR_NONE } from './terminal.js';
import { UNPAID_TYPES, BILLED_TYPES, WORN_TYPES, ALL_TYPES, CHOOSE_ALL,
         BUC_BLESSED, BUC_CURSED, BUC_UNCURSED, BUC_UNKNOWN, JUSTPICKED,
         ALL_TYPES_SELECTED, MENU_ITEMFLAGS_SKIPINVERT, W_ARMOR, W_ACCESSORY,
         W_WEAPONS, Has_contents } from './const.js';
import { is_worn, count_unpaid, count_buc } from './invent.js';
import { add_menu_str } from './wintty.js';
import { PM_CLERIC } from './monsters.js';
import { observe_object } from './o_init.js';
import { touch_artifact } from './artifact.js';
import { tty_yn_function, tty_clear_nhwindow } from './wintty.js';
import { COIN_CLASS, BOULDER, LOADSTONE, SCR_SCARE_MONSTER,
         BAG_OF_HOLDING } from './objects.js';
import { mons, M2_ROCKTHROW, PM_COCKATRICE, PM_CHICKATRICE, PM_DEATH,
         PM_FAMINE, PM_PESTILENCE } from './monsters.js';
import { LOST_THROWN, LOST_DROPPED, LOST_STOLEN, LOST_EXPLODING, QBUFSZ,
         SLT_ENCUMBER, MOD_ENCUMBER, HVY_ENCUMBER, EXT_ENCUMBER, HALLUC,
         STONE_RES } from './const.js';

function impossible(msg) { console.error(`impossible: ${msg}`); }

/* C ref: invent.c invlet_basic */
const invlet_basic = 52;

// C ref: display.h OBJ_AT() -> level.objects[x][y] != 0
function OBJ_AT(x, y) {
    for (const o of game.level?.objects || [])
        if (o.ox === x && o.oy === y && o.where === 'OBJ_FLOOR')
            return true;
    return false;
}


// C ref: pickup.c pickup()
/*
 * Pick up objects from the ground (or from a monster's inventory if
 * swallowed).  'what' > 0 means autopickup; < 0 means pick up -what
 * of something.
 */
export async function pickup(what) /* should be a long */ {
    const u = game.u;
    const autopickup = what > 0;

    /* we might have arrived here while fainted or sleeping, via
       random teleport or levitation timeout; if so, skip check_here
       and read_engr_at in addition to bypassing autopickup itself */
    if (autopickup && game.multi < 0 /* && unconscious() */)
        throw new Error('pickup(): unconscious() not ported yet');

    /* used by pickup_object() for encumbrance feedback */
    game.pickup_encumbrance = 0;

    if (!u.uswallow) {
        /* no auto-pick if no-pick move, nothing there, or in a pool */
        if (autopickup && (game.context?.nopick || !OBJ_AT(u.ux, u.uy)
                           || (is_pool(u.ux, u.uy) && !u.uinwater)
                           || is_lava(u.ux, u.uy))) {
            if (game.flags?.mention_decor)
                throw new Error('pickup(): describe_decor() not ported yet');
            await read_engr_at(u.ux, u.uy);
            return 0;
        }
        /* no pickup if levitating & not on air or water level */
        const t = t_at(u.ux, u.uy);
        if (!can_reach_floor(t && is_pit(t.ttyp)))
            throw new Error('pickup(): describe_decor() when the floor is out of reach not ported yet');
        /* multi && !context.run means they are in the middle of some
         * other action, or possibly paralyzed, sleeping, etc.... and they
         * just teleported onto the object.  They shouldn't pick it up.
         */
        if ((game.multi && !game.context.run)
            || (autopickup && !game.flags.pickup)
            || notake(game.youmonst.data)) {
            await check_here(false);
            if (notake(game.youmonst.data) && OBJ_AT(u.ux, u.uy)
                && (autopickup || game.flags.pickup))
                await You("are physically incapable of picking anything up.");
            return 0;
        }

        /* if there's anything here, stop running */
        if (OBJ_AT(u.ux, u.uy) && game.context.run && game.context.run !== 8
            && !game.context.nopick)
            nomul(0);
    }

    let n_tried = 0, n_picked = 0;

    /* add_valid_menu_class(0): reset -- menu classes only matter to the
       interactive menus, which aren't ported */
    let objchain;
    if (!u.uswallow) {
        objchain = objects_at(u.ux, u.uy); /* traverse_how = BY_NEXTHERE */
    } else {
        /* &u.ustuck->minvent, traverse_how = 0 (nobj); JS minvent arrays
           are oldest first, the C chain newest first */
        objchain = (u.ustuck.minvent || []).slice().reverse();
    }
    /*
     * Start the actual pickup process.  This is split into two main
     * sections, the newer menu and the older "traditional" methods.
     * Automatic pickup has been split into its own menu-style routine
     * to make things less confusing.
     */
    const count = (what < 0) ? -what /* pick N of something */
                             : 0; /* pick anything */
    let traverse_how = !u.uswallow ? BY_NEXTHERE : 0;
    const pick_list = [];
    let n;
    let menu_pickup = false;

    if (autopickup) {
        n = autopick(objchain, pick_list);
        menu_pickup = true;
    } else if ((game.flags.menu_style ?? MENU_FULL) !== MENU_TRADITIONAL
               || game.iflags?.menu_requested) {
        /* use menus exclusively */
        traverse_how |= AUTOSELECT_SINGLE
                        | ((game.flags.sortpack ?? true) ? INVORDER_SORT : 0);
        if (count) { /* looking for N of something */
            throw new Error('pickup(): "Pick %d of what?" (n_or_more) not ported yet');
        } else {
            n = await query_objlist("Pick up what?", objchain,
                                    (traverse_how | FEEL_COCKATRICE),
                                    pick_list, PICK_ANY, all_but_uchain);
        }
        menu_pickup = true;
    } else {
        throw new Error('pickup(): menustyle:traditional pickup not ported yet');
    }

    if (menu_pickup) {
        /* menu_pickup: */
        if (n > 0)
            reset_justpicked(game.invent);
        n_tried = n;
        for (let i = 0; i < n; i++) {
            const res = await pickup_object(pick_list[i].obj, pick_list[i].count,
                                            false);
            if (res < 0)
                break; /* can't continue */
            n_picked += res;
        }
    }

    if (!u.uswallow) {
        if (hides_under(game.youmonst.data))
            throw new Error('pickup(): hideunder() not ported yet');

        /* position may need updating (invisible hero) */
        if (n_picked)
            newsym_force(u.ux, u.uy);

        /* check if there's anything else here after auto-pickup is done */
        if (autopickup)
            await check_here(n_picked > 0);
    }
    /* pickupdone: */
    game.pickup_encumbrance = 0;
    /* add_valid_menu_class(0): reset */
    return (n_tried > 0) ? 1 : 0;
}

/* C ref: mondata.h notake(), hides_under() */
function notake(ptr) { return (ptr.mflags1 & M1_NOTAKE) !== 0; }
function hides_under(ptr) { return (ptr.mflags1 & M1_CONCEAL) !== 0; }

// C ref: pickup.c check_here()
async function check_here(picked_some) {
    const u = game.u;
    const lhflags = picked_some ? 1 /* LOOKHERE_PICKED_SOME */ : 0;

    if (game.flags?.mention_decor)
        throw new Error('check_here(): describe_decor() not ported yet');

    /* count the objects here */
    const ct = objects_at(u.ux, u.uy).filter(o => o !== game.uchain).length;

    /* If there are objects here, take a look. */
    if (ct) {
        if (game.context.run)
            nomul(0);
        await flush_screen(1);
        await look_here(ct, lhflags);
    } else {
        await read_engr_at(u.ux, u.uy);
    }
}

/* C ref: pickup.c autopick_testobj() 'static boolean costly' */
let autopick_costly = false;

// C ref: pickup.c autopick_testobj()
export function autopick_testobj(otmp, calc_costly) {
    const flags = game.flags;
    const otypes = flags.pickup_types || '';

    /* calculate 'costly' just once for a given autopickup operation */
    if (calc_costly)
        autopick_costly = (otmp.where === 'OBJ_FLOOR'
                           && costly_spot(otmp.ox, otmp.oy));

    /* first check: reject if an unpaid item in a shop */
    if (autopick_costly && !otmp.no_charge)
        return false;

    /* pickup_thrown/pickup_stolen/nopick_dropped override pickup_types and
       exceptions (all three options default to on) */
    if (((flags.pickup_thrown ?? true) && otmp.how_lost === LOST_THROWN)
        || ((flags.pickup_stolen ?? true) && otmp.how_lost === LOST_STOLEN))
        return true;
    if ((flags.dropped_nopick ?? true) && otmp.how_lost === LOST_DROPPED)
        return false;
    if (otmp.how_lost === LOST_EXPLODING)
        return false;

    /* check for pickup_types (object class numbers) */
    const pickit = (!otypes || otypes.includes(String.fromCharCode(otmp.oclass)));

    /* check for autopickup exceptions: check_autopickup_exceptions() --
       none can be configured yet (ga.apelist is always empty) */
    if (game.apelist)
        throw new Error('autopick_testobj(): check_autopickup_exceptions() not ported yet');
    return pickit;
}

// C ref: pickup.c autopick()
/*
 * Pick from the given list using flags.pickup_types.  Return the number
 * of items picked (not counts).  Fill pick_list with the objects and
 * counts to pick up.
 */
function autopick(olist, /* the object list */
                  pick_list) { /* list of objects and counts to pick up */
    let n = 0, check_costly = true;

    /* first count the number of eligible items */
    for (const curr of olist) {
        if (autopick_testobj(curr, check_costly))
            ++n;
        check_costly = false; /* only need to check once per autopickup */
    }

    if (n) {
        n = 0;
        for (const curr of olist) {
            if (autopick_testobj(curr, false)) {
                pick_list.push({ obj: curr, count: curr.quan });
                n++;
            }
        }
    }
    return n;
}

// C ref: pickup.c all_but_uchain()
/* query_objlist callback: return TRUE if not uchain */
function all_but_uchain(obj) {
    return (obj !== game.uchain);
}

// C ref: invent.c sortloot()
/* the sortloot_item array ('Loot'): each entry has obj, indx (original
   position, the stable-sort tiebreak), orderclass/subclass/disco/inuse
   (set by loot_classify(), 0 = not yet classified) and str (loot_xname(),
   formatted at most once per sort) */
function sortloot(olist, mode, by_nexthere, filterfunc) {
    void by_nexthere; /* olist is already the pile (nexthere) or the chain */
    /* the 'keep cockatrice corpses' flag is overloaded with sort mode */
    const augment_filter = (mode & SORTLOOT_PETRIFY) !== 0;
    mode &= ~SORTLOOT_PETRIFY; /* remove flag, leaving mode */
    /* populate aliarray[0..n-1] */
    const sliarray = [];
    for (const o of olist) {
        if (filterfunc && !filterfunc(o)
            /* caller may be asking us to override filterfunc (in order
               to do a cockatrice corpse touch check during pickup even
               if/when the filter rejects food class) */
            && (!augment_filter || o.otyp !== CORPSE
                || !touch_petrifies(mons[o.corpsenm])))
            continue;
        sliarray.push({ obj: o, indx: sliarray.length, orderclass: 0,
                        subclass: 0, disco: 0, inuse: 0, str: null });
    }

    /* do the sort; if no sorting is requested, we'll just return
       a sortloot_item array reflecting the current ordering */
    if (mode && sliarray.length > 1) {
        game.sortlootmode = mode; /* extra input for sortloot_cmp() */
        sliarray.sort(sortloot_cmp);
        game.sortlootmode = 0; /* reset static mode flags */
        /* if sortloot_cmp formatted any objects, discard their strings now */
        for (const sli of sliarray)
            sli.str = null;
    }
    return sliarray;
}

// C ref: invent.c loot_classify()
/* sortloot() classification; called at most once [per sort] for each object */
function loot_classify(sort_item, obj) {
    const otyp = obj.otyp, oclass = obj.oclass;
    const discovered = !!objects[otyp].oc_name_known;
    let k;

    /*
     * For the value types assigned by this classification, sortloot()
     * will put lower valued ones before higher valued ones.
     */
    if (!pk_Blind())
        observe_object(obj, u_prop(HALLUC)); /* xname(obj) does this; we want it sooner */
    const seen = !!obj.dknown;
    /* class order */
    const classorder = (game.flags.sortpack ?? true) ? def_inv_order
                                                     : def_srt_order;
    const p = classorder.indexOf(oclass);
    if (p >= 0)
        k = 1 + p;
    else
        k = 1 + classorder.length + ((oclass !== VENOM_CLASS) ? 1 : 0);
    sort_item.orderclass = k;
    /* subclass designation; only a few classes have subclasses
       and the non-armor ones we use are fairly arbitrary */
    switch (oclass) {
    case ARMOR_CLASS:
        k = objects[otyp].oc_armcat;
        /* oc_armcat overloads oc_subtyp which is an 'schar' so guard
           against somebody assigning something unexpected to it */
        if (k < 0 || k >= 7)
            k = 7;
        k = armcat[k];
        break;
    case WEAPON_CLASS:
        /* for weapons, group by ammo (arrows, bolts), launcher (bows),
           missile (darts, boomerangs), stackable (daggers, knives, spears),
           'other' (swords, axes, &c), polearms */
        k = objects[otyp].oc_skill;
        k = (k < 0) ? ((k >= -P_CROSSBOW && k <= -P_BOW) ? 1 : 3)
                    : ((k >= P_BOW && k <= P_CROSSBOW) ? 2
                       : (k === P_SPEAR || k === P_DAGGER || k === P_KNIFE) ? 4
                          : !is_pole(obj) ? 5 : 6);
        break;
    case TOOL_CLASS:
        if (seen && discovered
            && (otyp === BAG_OF_TRICKS || otyp === HORN_OF_PLENTY))
            k = 2; /* known pseudo-container */
        else if (Is_container(obj))
            k = 1; /* regular container or unknown bag of tricks */
        else
            switch (otyp) {
            case WOODEN_FLUTE:
            case MAGIC_FLUTE:
            case TOOLED_HORN:
            case FROST_HORN:
            case FIRE_HORN:
            case WOODEN_HARP:
            case MAGIC_HARP:
            case BUGLE:
            case LEATHER_DRUM:
            case DRUM_OF_EARTHQUAKE:
            case HORN_OF_PLENTY: /* not a musical instrument */
                k = 3; /* instrument or unknown horn of plenty */
                break;
            default:
                k = 4; /* 'other' tool */
                break;
            }
        break;
    case FOOD_CLASS:
        /* [what about separating "partly eaten" within each group?] */
        switch (otyp) {
        case SLIME_MOLD:
            k = 1;
            break;
        default:
            /* [maybe separate one-bite foods from rations and such?] */
            k = obj.globby ? 6 : 2;
            break;
        case TIN:
            k = 3;
            break;
        case EGG:
            k = 4;
            break;
        case CORPSE:
            k = 5;
            break;
        }
        break;
    case GEM_CLASS:
        /*
         * Normally subclass takes priority over discovery status, but
         * that would give away information for gems (assuming we'll
         * group them as valuable gems, next glass, then gray stones,
         * and finally rocks once they're all fully identified).
         */
        switch (objects[obj.otyp].oc_material) {
        case GEMSTONE:
            k = !seen ? 1 : !discovered ? 2 : 3;
            break;
        case GLASS:
            k = !seen ? 1 : !discovered ? 2 : 4;
            break;
        default: /* MINERAL */
            k = !seen ? 5 : (obj.otyp !== ROCK) ? (!discovered ? 6 : 7) : 8;
            break;
        }
        break;
    default:
        /* other classes don't have subclasses; we assign a nonzero
           value because sortloot() uses 0 to mean 'not yet classified' */
        k = 1; /* any non-zero would do */
        break;
    }
    sort_item.subclass = k;
    /* discovery status */
    k = !seen ? 1 /* unseen */
        : (discovered || !OBJ_DESCR(objects[otyp])) ? 4
          : (objects[otyp].oc_uname) ? 3 /* named (partially discovered) */
            : 2; /* undiscovered */
    sort_item.disco = k;
    /* not applicable */
    sort_item.inuse = 0;
}
/* C ref: invent.c loot_classify() def_srt_order[] */
const def_srt_order = [
    COIN_CLASS, AMULET_CLASS, RING_CLASS, WAND_CLASS, POTION_CLASS,
    SCROLL_CLASS, SPBOOK_CLASS, GEM_CLASS, FOOD_CLASS, TOOL_CLASS,
    WEAPON_CLASS, ARMOR_CLASS, ROCK_CLASS, BALL_CLASS, CHAIN_CLASS,
];
/* C ref: invent.c loot_classify() armcat[] -- a different order than the
   subclass values defined by objclass.h */
const armcat = [];
armcat[ARM_HELM]   = 1; /* [2] */
armcat[ARM_GLOVES] = 2; /* [3] */
armcat[ARM_BOOTS]  = 3; /* [4] */
armcat[ARM_SHIELD] = 4; /* [1] */
armcat[ARM_CLOAK]  = 5; /* [5] */
armcat[ARM_SHIRT]  = 6; /* [6] */
armcat[ARM_SUIT]   = 7; /* [0] */
armcat[7]          = 8; /* sanity protection */

// C ref: invent.c loot_xname()
/* sortloot() formatting routine; for alphabetizing, not shown to user */
function loot_xname(obj) {
    /*
     * Deal with things that xname() includes as a prefix.  We don't
     * want such because they change alphabetical ordering.  First,
     * remember 'obj's current settings.
     */
    const saveo = { odiluted: obj.odiluted, blessed: obj.blessed,
                    cursed: obj.cursed, spe: obj.spe, owt: obj.owt };
    const save_oname = obj.oname || null;
    const save_debug = game.flags.debug;
    /* suppress "diluted" for potions and "holy/unholy" for water;
       sortloot() will deal with them using other criteria than name */
    if (obj.oclass === POTION_CLASS) {
        obj.odiluted = 0;
        if (obj.otyp === POT_WATER)
            obj.blessed = 0, obj.cursed = 0;
    }
    /* make "wet towel" and "moist towel" format as "towel" so that all
       three group together */
    if (obj.otyp === TOWEL)
        obj.spe = 0;
    /* group globs by monster type rather than by size:  force all to
       have the same size adjective hence same "small glob of " prefix */
    if (obj.globby)
        obj.owt = 20; /* weight of a fresh glob (one pudding's worth) */
    /* suppress user-assigned name */
    if (save_oname && !obj.oartifact)
        obj.oname = null;
    /* avoid wizard mode formatting variations */
    if (save_debug) /* flags.debug */
        game.flags.debug = false;

    let res = cxname_singular(obj);

    if (save_debug)
        game.flags.debug = true;
    /* restore the object */
    if (obj.oclass === POTION_CLASS) {
        obj.odiluted = saveo.odiluted;
        if (obj.otyp === POT_WATER)
            obj.blessed = saveo.blessed, obj.cursed = saveo.cursed;
    }
    if (obj.otyp === TOWEL) {
        obj.spe = saveo.spe;
        /* give "towel" a suffix that will force wet ones to come first,
           moist ones next, and dry ones last regardless of whether
           they've been flagged as having spe known */
        res += is_wet_towel(obj) ? ((obj.spe >= 3) ? "x" : "y") : "z";
    }
    if (obj.globby) {
        obj.owt = saveo.owt;
        /* add a suffix to get such sorted by size (small first) */
        res += (obj.owt <= 100) ? "a"
               : (obj.owt <= 300) ? "b"
                 : (obj.owt <= 500) ? "c"
                   : "d";
    }
    if (save_oname && !obj.oartifact)
        obj.oname = save_oname;

    return res;
}

// C ref: invent.c invletter_value()
/* '$'==1, 'a'-'z'==2..27, 'A'-'Z'==28..53, '#'==54, catchall 55 */
function invletter_value(c) {
    return ('a' <= c && c <= 'z') ? (c.charCodeAt(0) - 97 + 2)
           : ('A' <= c && c <= 'Z') ? (c.charCodeAt(0) - 65 + 2 + 26)
             : (c === '$') ? 1
               : (c === '#') ? 1 + invlet_basic + 1
                 : 1 + invlet_basic + 1 + 1; /* none of the above
                                              * (shouldn't happen) */
}

/* C ref: obj.h greatest_erosion() */
function greatest_erosion(otmp) {
    return Math.max(otmp.oeroded || 0, otmp.oeroded2 || 0);
}

// C ref: invent.c sortloot_cmp()
/* qsort comparison routine for sortloot() */
function sortloot_cmp(sli1, sli2) {
    const obj1 = sli1.obj, obj2 = sli2.obj;
    const mode = game.sortlootmode;
    let val1, val2, namcmp;

    /* in-use takes precedence over all others */
    if ((mode & SORTLOOT_INUSE) !== 0)
        throw new Error('sortloot_cmp(): in-use ordering (inuse_classify()) not ported yet');

    /* order by object class unless we're doing by-invlet without sortpack */
    if ((mode & (SORTLOOT_PACK | SORTLOOT_INVLET)) !== SORTLOOT_INVLET) {
        /* Classify each object at most once no matter how many
           comparisons it is involved in. */
        if (!sli1.orderclass)
            loot_classify(sli1, obj1);
        if (!sli2.orderclass)
            loot_classify(sli2, obj2);

        /* Sort by class. */
        val1 = sli1.orderclass;
        val2 = sli2.orderclass;
        if (val1 !== val2)
            return val1 - val2;

        /* skip sub-classes when ordering by sortpack+invlet */
        if ((mode & SORTLOOT_INVLET) === 0) {
            /* Class matches; sort by subclass. */
            val1 = sli1.subclass;
            val2 = sli2.subclass;
            if (val1 !== val2)
                return val1 - val2;

            /* Class and subclass match; sort by discovery status:
             * first unseen, then seen but not named or discovered,
             * then named, lastly discovered. */
            val1 = sli1.disco;
            val2 = sli2.disco;
            if (val1 !== val2)
                return val1 - val2;
        }
    }

    /* order by assigned inventory letter */
    if ((mode & SORTLOOT_INVLET) !== 0) {
        val1 = invletter_value(obj1.invlet);
        val2 = invletter_value(obj2.invlet);
        if (val1 !== val2)
            return val1 - val2;
    }

    if ((mode & SORTLOOT_LOOT) === 0)
        return sli1.indx - sli2.indx; /* goto tiebreak */

    /*
     * Sort object names in lexicographical order, ignoring quantity.
     *
     * Each obj gets formatted at most once (per sort) no matter how many
     * comparisons it gets subjected to.
     */
    if (sli1.str === null)
        sli1.str = loot_xname(obj1);
    if (sli2.str === null)
        sli2.str = loot_xname(obj2);
    if ((namcmp = strcmpi(sli1.str, sli2.str)) !== 0)
        return namcmp;

    /* Sort by BUCX. */
    val1 = obj1.bknown ? (obj1.blessed ? 3 : !obj1.cursed ? 2 : 1) : 0;
    val2 = obj2.bknown ? (obj2.blessed ? 3 : !obj2.cursed ? 2 : 1) : 0;
    if (val1 !== val2)
        return val2 - val1; /* bigger is better */

    /* Sort by greasing.  This will put the objects in degreasing order. */
    val1 = obj1.greased ? 1 : 0;
    val2 = obj2.greased ? 1 : 0;
    if (val1 !== val2)
        return val2 - val1; /* bigger is better */

    /* Sort by erosion.  The effective amount is what matters. */
    val1 = greatest_erosion(obj1);
    val2 = greatest_erosion(obj2);
    if (val1 !== val2)
        return val1 - val2; /* bigger is WORSE */

    /* Sort by erodeproofing. */
    val1 = (obj1.rknown && obj1.oerodeproof) ? 1 : 0;
    val2 = (obj2.rknown && obj2.oerodeproof) ? 1 : 0;
    if (val1 !== val2)
        return val2 - val1; /* bigger is better */

    /* Sort by enchantment.  Map unknown to -1000, which is comfortably
       below the range of obj->spe. */
    if (objects[obj1.otyp].oc_uses_known
        /* exclude eggs (laid by you) and tins (homemade, pureed, &c) */
        && obj1.oclass !== FOOD_CLASS) {
        val1 = obj1.known ? obj1.spe : -1000;
        val2 = obj2.known ? obj2.spe : -1000;
        if (val1 !== val2)
            return val2 - val1; /* bigger is better */
    }

    /* tiebreak: They're identical, as far as we're concerned.  We want
       to force a deterministic order, and do so by producing a
       stable sort: maintain the original order of equal items. */
    return sli1.indx - sli2.indx;
}

// C ref: pickup.c menu_class_present()
/* gv.valid_menu_classes holds object classes (numbers) and the letters
   'B' 'U' 'C' 'X' 'P' 'u' (as char codes) */
function menu_class_present(c) {
    return !!c && (game.valid_menu_classes || []).includes(c);
}

// C ref: pickup.c add_valid_menu_class()
export function add_valid_menu_class(c) {
    if (!game.valid_menu_classes)
        game.valid_menu_classes = [];
    if (c === 0) { /* reset */
        game.valid_menu_classes.length = 0; /* vmc_count = 0 */
        game.class_filter = game.bucx_filter = game.shop_filter = false;
        game.picked_filter = false;
    } else if (!menu_class_present(c)) {
        game.valid_menu_classes.push(c);
        /* categorize the new class */
        switch (c) {
        case 0x42: /* 'B' */
        case 0x55: /* 'U' */
        case 0x43: /* 'C' */ /*FALLTHRU*/
        case 0x58: /* 'X' */
            game.bucx_filter = true;
            break;
        case 0x50: /* 'P' */
            game.picked_filter = true;
            break;
        case 0x75: /* 'u' */
            game.shop_filter = true;
            break;
        default:
            game.class_filter = true;
            break;
        }
    }
}

// C ref: pickup.c allow_all()
/* query_objlist callback: return TRUE */
export function allow_all(obj) {
    void obj;
    return true;
}

/* C ref: flag.h ParanoidAutoAll -- flags.paranoia_bits does not include
   PARANOID_AUTOALL by default (options.c initoptions_init()); parsing the
   paranoid_confirmation option isn't ported */
function ParanoidAutoAll() {
    if (game.flags.paranoid_confirmation !== undefined
        || game.flags.paranoid_confirm !== undefined)
        throw new Error('paranoia_bits: the paranoid_confirmation option is not ported yet');
    return false;
}

// C ref: pickup.c allow_category()
export function allow_category(obj) {
    /* If no filters are active, nothing will match unless
       paranoid_confirm:A is set. */
    if (!game.class_filter && !game.shop_filter && !game.bucx_filter
        && !game.picked_filter && !ParanoidAutoAll())
        return false;

    /* For coins, if any class filter is specified, accept if coins
     * are included regardless of whether either unpaid or BUC-status
     * is also specified since player has explicitly requested coins.
     */
    if (obj.oclass === COIN_CLASS && game.class_filter)
        return menu_class_present(COIN_CLASS);

    if (game.urole.mnum === PM_CLERIC && !obj.bknown)
        obj.bknown = 1; /* set_bknown(obj, 1); perm_invent isn't kept */

    /* if class is expected but obj's class is not in the list, reject */
    if (game.class_filter && !menu_class_present(obj.oclass))
        return false;
    /* if unpaid is expected and obj isn't unpaid, reject (treat a container
       holding any unpaid object as unpaid even if isn't unpaid itself) */
    if (game.shop_filter && !obj.unpaid
        && !(Has_contents(obj) && count_unpaid(obj.cobj) > 0))
        return false;
    /* check for particular bless/curse state */
    if (game.bucx_filter) {
        /* first categorize this object's bless/curse state */
        let bucx;
        if (obj.oclass === COIN_CLASS) {
            /* If no class filtering is specified but bless/curse state is,
               coins are treated as either unknown or uncursed based on an
               option setting. */
            bucx = game.flags.goldX ? 'X' : 'U';
        } else {
            bucx = !obj.bknown ? 'X'
                     : obj.blessed ? 'B'
                        : obj.cursed ? 'C'
                           : 'U';
        }

        /* if its category is not in the list, reject */
        if (!menu_class_present(bucx.charCodeAt(0)))
            return false;
    }
    if (game.picked_filter && !obj.pickup_prev)
        return false;
    /* obj didn't fail any of the filter checks, so accept */
    return true;
}

// C ref: pickup.c count_justpicked()
export function count_justpicked(olist) {
    let cnt = 0;

    for (let otmp = olist; otmp; otmp = otmp.nobj)
        if (otmp.pickup_prev)
            cnt++;

    return cnt;
}

// C ref: pickup.c find_justpicked()
export function find_justpicked(olist) {
    for (let otmp = olist; otmp; otmp = otmp.nobj)
        if (otmp.pickup_prev)
            return otmp;

    return null;
}

// C ref: pickup.c query_category()
/*
 * For menustyle:Full.
 *
 * allow menu-based category (class) selection (for Drop,take off etc.)
 *
 * If ParanoidAutoAll, requires confirmation when 'A' has been picked.
 *
 * olist is the hero's invent chain (FOLLOW() by nobj); BY_NEXTHERE piles
 * are not ported here. pick_list is filled with { item: a_int, count }.
 */
export async function query_category(qstr, /* query string */
                                     olist, /* the list to pick from */
                                     qflags, /* behavior modification flags */
                                     pick_list, /* return list of items picked */
                                     how) { /* type of query */
    let n;
    let ofilter = null;
    let do_unpaid = false, do_usedup = false,
        do_blessed = false, do_cursed = false,
        do_uncursed = false, do_buc_unknown = false,
        do_worn = false, verify_All = false;
    let num_buc_types = 0, num_justpicked = 0;
    const clr = NO_COLOR;

    pick_list.length = 0;
    if (!olist)
        return 0;
    if ((qflags & BY_NEXTHERE) !== 0)
        throw new Error('query_category(): a floor pile (BY_NEXTHERE) not ported yet');
    if ((qflags & UNPAID_TYPES) !== 0 && count_unpaid(olist))
        do_unpaid = true;
    /* caller only passes BILLED_TYPES when there are some used up items
       on shop's bill */
    if ((qflags & BILLED_TYPES) !== 0)
        do_usedup = true;
    /* for the 'A' command to remove worn/wielded */
    if ((qflags & WORN_TYPES) !== 0) {
        do_worn = true;
        ofilter = is_worn;
    }
    if ((qflags & BUC_BLESSED) !== 0
        && count_buc(olist, BUC_BLESSED, ofilter)) {
        do_blessed = true;
        num_buc_types++;
    }
    if ((qflags & BUC_CURSED) !== 0
        && count_buc(olist, BUC_CURSED, ofilter)) {
        do_cursed = true;
        num_buc_types++;
    }
    if ((qflags & BUC_UNCURSED) !== 0
        && count_buc(olist, BUC_UNCURSED, ofilter)) {
        do_uncursed = true;
        num_buc_types++;
    }
    if ((qflags & BUC_UNKNOWN) !== 0
        && count_buc(olist, BUC_UNKNOWN, ofilter)) {
        do_buc_unknown = true;
        num_buc_types++;
    }
    if ((qflags & JUSTPICKED) !== 0) {
        num_justpicked = count_justpicked(olist);
    }

    const ccount = count_categories(olist, qflags);
    /* no point in actually showing a menu for a single category */
    if (ccount === 1 && !do_unpaid && !do_usedup && num_buc_types <= 1) {
        let curr;
        for (curr = olist; curr; curr = curr.nobj) {
            if (ofilter && !ofilter(curr))
                continue;
            break;
        }
        if (curr) {
            pick_list.push({ item: curr.oclass, count: -1 });
            n = 1;
        } else {
            n = 0;
        }
        /* early return is ok; there's no temp window yet */
        return n;
    }

    const win = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(win, MENU_BEHAVE_STANDARD);

    const pack = def_inv_order.slice(); /* flags.inv_order */
    if ((qflags & INCLUDE_VENOM) !== 0)
        pack.push(VENOM_CLASS); /* venom is not in inv_order */

    const show_a = ((qflags & ALL_TYPES) !== 0 && ccount > 1);

    if ((qflags & CHOOSE_ALL) !== 0) {
        tty_add_menu(win, null, 0x41 /* 'A' */, 'A', 0, ATR_NONE, clr,
                     /* note: menu_remarm() doesn't pass the CHOOSE_ALL flag,
                        so do_worn handling here is moot */
                     do_worn ? "Auto-select every item being worn or wielded"
                             : "Auto-select every relevant item",
                     MENU_ITEMFLAGS_SKIPINVERT);
        verify_All = (how === PICK_ANY) && ParanoidAutoAll();
        if (!verify_All) {
            const hint = game.A_first_hint || 0;
            game.A_first_hint = hint + 1;
            if (!hint || (game.iflags?.cmdassist ?? true))
                add_menu_str(win,
                   "    (ignored unless some other choices are also picked)");
        } else if (show_a) {
            const hint = game.A_second_hint || 0;
            game.A_second_hint = hint + 1;
            if (!hint || (game.iflags?.cmdassist ?? true))
                add_menu_str(win,
                      "    (if no other choices are picked, 'a' is implied)");
        }
        /* blank separator */
        add_menu_str(win, "");
    }

    let invlet = 'a'.charCodeAt(0);
    if (show_a) {
        tty_add_menu(win, null, ALL_TYPES_SELECTED, String.fromCharCode(invlet),
                     0, ATR_NONE, clr,
                     do_worn ? "All worn and wielded types" : "All types",
                     MENU_ITEMFLAGS_SKIPINVERT);
        ++invlet; /* invlet = 'b'; */
    }

    let pi = 0;
    do {
        let collected_type_name = false;
        for (let curr = olist; curr; curr = curr.nobj) {
            if (curr.oclass === pack[pi]) {
                if (ofilter && !ofilter(curr))
                    continue;
                if (!collected_type_name) {
                    const oclass = curr.oclass;

                    tty_add_menu(win, null, oclass, String.fromCharCode(invlet++),
                                 def_oc_syms[oclass], ATR_NONE, clr,
                                 let_to_name(pack[pi], false,
                                             (how !== PICK_NONE
                                              && !!game.iflags?.menu_head_objsym)),
                                 MENU_ITEMFLAGS_NONE);
                    collected_type_name = true;
                }
            }
        }
        pi++;
        if (invlet >= 'u'.charCodeAt(0)) {
            impossible("query_category: too many categories");
            tty_destroy_nhwindow(win); /* goto query_done */
            return 0;
        }
    } while (pi < pack.length);

    if (do_unpaid || do_usedup
        || do_blessed || do_cursed || do_uncursed || do_buc_unknown
        || num_justpicked) {
        add_menu_str(win, "");
    }

    /* unpaid items if there are any */
    if (do_unpaid)
        tty_add_menu(win, null, 0x75 /* 'u' */, 'u', 0, ATR_NONE, clr,
                     "Unpaid items", MENU_ITEMFLAGS_SKIPINVERT);
    /* billed items: checked by caller, so always include if BILLED_TYPES */
    if (do_usedup)
        tty_add_menu(win, null, 0x78 /* 'x' */, 'x', 0, ATR_NONE, clr,
                     "Unpaid items already used up", MENU_ITEMFLAGS_SKIPINVERT);

    /* items with b/u/c/unknown if there are any;
       this cluster of menu entries is in alphabetical order,
       reversing the usual sequence of 'U' and 'C' in BUCX */
    if (do_blessed)
        tty_add_menu(win, null, 0x42 /* 'B' */, 'B', 0, ATR_NONE, clr,
                     "Items known to be Blessed", MENU_ITEMFLAGS_SKIPINVERT);
    if (do_cursed)
        tty_add_menu(win, null, 0x43 /* 'C' */, 'C', 0, ATR_NONE, clr,
                     "Items known to be Cursed", MENU_ITEMFLAGS_SKIPINVERT);
    if (do_uncursed)
        tty_add_menu(win, null, 0x55 /* 'U' */, 'U', 0, ATR_NONE, clr,
                     "Items known to be Uncursed", MENU_ITEMFLAGS_SKIPINVERT);
    if (do_buc_unknown)
        tty_add_menu(win, null, 0x58 /* 'X' */, 'X', 0, ATR_NONE, clr,
                     "Items of unknown Bless/Curse status",
                     MENU_ITEMFLAGS_SKIPINVERT);
    if (num_justpicked) {
        let tmpbuf;

        if (num_justpicked === 1)
            tmpbuf = `Just picked up: ${doname(find_justpicked(olist))}`;
        else
            tmpbuf = "Items you just picked up";
        tty_add_menu(win, null, 0x50 /* 'P' */, 'P', 0, ATR_NONE, clr,
                     tmpbuf, MENU_ITEMFLAGS_SKIPINVERT);
    }
    tty_end_menu(win, qstr);
    const res = await tty_select_menu(win, how);
    n = res.n;
    for (const mi of res.selected)
        pick_list.push({ item: mi.item, count: mi.count });

    /* handle ParanoidAutoAll by confirming 'A' choice if present */
    if (n > 0 && verify_All) {
        throw new Error('query_category(): "Really autoselect All?" (ParanoidAutoAll) not ported yet');
    } else if (n === 1 && !verify_All && pick_list[0].item === 0x41 /* 'A' */) {
        /* without paranoid_confirm:A, choosing 'A' by itself is rejected */
        n = 0;
        pick_list.length = 0;
        /* the menu entry description is "Auto-select every relevant item"
           [not sure whether issuing a message here is a good idea...] */
        await pline("No relevant items selected.");
    }
    /* query_done: */
    tty_destroy_nhwindow(win);
    if (n < 0) /* closed menu with ESC */
        n = 0; /* callers don't expect -1 */
    return n;
}

// C ref: pickup.c count_categories()
function count_categories(olist, qflags) {
    let ccount = 0;
    const do_worn = (qflags & WORN_TYPES) !== 0;

    for (const pack of def_inv_order) { /* flags.inv_order */
        let counted_category = false;
        for (let curr = olist; curr; curr = curr.nobj) {
            if (curr.oclass === pack) {
                if (do_worn && !(curr.owornmask
                                 & (W_ARMOR | W_ACCESSORY | W_WEAPONS)))
                    continue;
                if (!counted_category) {
                    ccount++;
                    counted_category = true;
                }
            }
        }
    }
    return ccount;
}

// C ref: pickup.c query_objlist()
/*
 * Put up a menu using the given object list.  Only those objects on the
 * list that meet the approval of the allow function are displayed.  Return
 * a count of the number of items selected, filling pick_list with the
 * objects selected and counts.  The returned counts are guaranteed to be
 * in bounds and non-zero.
 */
export async function query_objlist(qstr, /* query string */
                                    olist, /* the list to pick from */
                                    qflags, /* options to control the query */
                                    pick_list, /* return list of items picked */
                                    how, /* type of query */
                                    allow) { /* allow function */
    let n, last = null;
    const sorted = (qflags & INVORDER_SORT) !== 0,
        engulfer = (qflags & INCLUDE_HERO) !== 0;

    pick_list.length = 0;
    if (!olist.length && !engulfer)
        return 0;

    /* count the number of items allowed */
    n = 0;
    for (const curr of olist)
        if (allow(curr)) {
            last = curr;
            n++;
        }
    /* can't depend upon 'engulfer' because that's used to indicate whether
       hero should be shown as an extra, fake item */
    const engulfer_minvent = (olist.length > 0 && olist[0].where === 'OBJ_MINVENT'
                              && game.u.uswallow && olist[0].ocarry === game.u.ustuck);
    if (engulfer_minvent && n === 1 && olist[0].owornmask)
        qflags &= ~AUTOSELECT_SINGLE;
    if (engulfer)
        throw new Error('query_objlist(): the engulfed hero as a menu entry not ported yet');

    if (n === 0) /* nothing to pick here */
        return (qflags & SIGNAL_NOMENU) ? -1 : 0;

    if (n === 1 && (qflags & AUTOSELECT_SINGLE)) {
        pick_list.push({ obj: last, count: last.quan });
        return 1;
    }

    const sortloot_opt = game.flags.sortloot ?? 'l';
    const sortflags = (((sortloot_opt === 'f'
                         || (sortloot_opt === 'l' && !(qflags & USE_INVLET)))
                        ? SORTLOOT_LOOT
                        : ((qflags & USE_INVLET) ? SORTLOOT_INVLET : 0))
                       | ((game.flags.sortpack ?? true) ? SORTLOOT_PACK : 0)
                       | ((qflags & FEEL_COCKATRICE) ? SORTLOOT_PETRIFY : 0));
    const sortedolist = sortloot(olist, sortflags,
                                 (qflags & BY_NEXTHERE) !== 0, allow);

    const win = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(win, MENU_BEHAVE_STANDARD);
    if (game.this_title)
        throw new Error('query_objlist(): this_title (dotypeinv) not ported yet');
    /*
     * Run through the list and add the objects to the menu.  If
     * INVORDER_SORT is set, we'll run through the list once for
     * each type so we can group them.  The allow function was
     * called by sortloot() and will be called once per item here.
     */
    const pack = def_inv_order.slice(); /* flags.inv_order */
    if (qflags & INCLUDE_VENOM)
        pack.push(VENOM_CLASS); /* venom is not in inv_order */
    let first = true;
    let pi = 0;
    do {
        let printed_type_name = false;
        for (const srtoli of sortedolist) {
            const curr = srtoli.obj;
            if (sorted && curr.oclass !== pack[pi])
                continue;
            if ((qflags & FEEL_COCKATRICE) && curr.otyp === CORPSE
                && will_feel_cockatrice(curr, false)) {
                tty_destroy_nhwindow(win); /* stop the menu and revert */
                await look_here(0, 0);
                return 0;
            }
            if (allow(curr)) {
                /* if sorting, print type name (once only) */
                if (sorted && !printed_type_name) {
                    const with_oc_sym = (how !== PICK_NONE
                                         && !!game.iflags?.menu_head_objsym);

                    add_menu_heading(win, let_to_name(pack[pi], false, with_oc_sym));
                    printed_type_name = true;
                }

                /* obj_to_glyph(curr, rn2_on_display_rng) and
                   map_glyphinfo(): the display RNG, and tty menus don't
                   show the glyph */
                tty_add_menu(win, null, curr,
                             (qflags & USE_INVLET) ? curr.invlet
                               : (first && curr.oclass === COIN_CLASS) ? '$' : 0,
                             def_oc_syms[objects[curr.otyp].oc_class],
                             ATR_NONE, NO_COLOR, doname_with_price(curr),
                             MENU_ITEMFLAGS_NONE);
                first = false;
            }
        }
        pi++;
    } while (sorted && pi < pack.length);

    tty_end_menu(win, qstr);
    const res = await tty_select_menu(win, how);
    n = res.n;
    tty_destroy_nhwindow(win);

    if (n > 0) {
        let k = 0;

        /* fix up counts:  -1 means no count used => pick all */
        for (const mi of res.selected) {
            const curr = mi.item;
            if (engulfer_minvent && curr.owornmask)
                throw new Error('query_objlist(): You_cant("pick %s up.", ysimple_name()) not ported yet');
            let cnt = mi.count;
            if (cnt === -1 || cnt > curr.quan)
                cnt = curr.quan;
            pick_list.push({ obj: curr, count: cnt });
            ++k;
        }
        n = k;
    } else if (n < 0) {
        /* -1 is used for SIGNAL_NOMENU, so callers don't expect it
           to indicate that the player declined to make a choice */
        n = (qflags & SIGNAL_ESCAPE) ? -2 : 0;
    }
    return n;
}

/* C ref: pickup.c GOLD_WT(), GOLD_CAPACITY() */
function GOLD_WT(n) { return Math.trunc((n + 50) / 100); }
/* if you can carry 'w' and already have 'n' gold, how much more? */
function GOLD_CAPACITY(w, n) { return (w * -100) - (n + 50) - 1; }

/* C ref: pickup.c encumbrance message prefixes */
const slightloadpfx = "You have a little trouble",
    moderateloadpfx = "You have trouble",
    nearloadpfx = "You have much trouble",
    overloadpfx = "You have extreme difficulty";

// C ref: pickup.c delta_cwt()
/*
 *  How much the weight of the given container will change when the given
 *  object is removed from it.
 */
function delta_cwt(container, obj) {
    if (container.otyp !== BAG_OF_HOLDING)
        return obj.owt;
    throw new Error('delta_cwt(): bag of holding weight not ported yet');
}

// C ref: pickup.c carry_count()
/* could we carry `obj'? if not, could we carry some of it/them? */
async function carry_count(obj, /* object to pick up... */
                           container, /* ...bag it is coming out of */
                           count, telekinesis, wts) {
    const adjust_wt = !!(container && container.where === 'OBJ_INVENT'),
        is_gold = obj.oclass === COIN_CLASS;
    let wt, iw, ow, oow;
    let qq;
    let verb, prefx1, prefx2, suffx;
    let obj_nambuf, where;

    const savequan = obj.quan;
    const saveowt = obj.owt;
    const umoney = money_cnt(game.invent);
    iw = max_capacity();

    if (count !== savequan) {
        obj.quan = count;
        obj.owt = weight(obj);
    }
    wt = iw + obj.owt;
    if (adjust_wt)
        wt -= delta_cwt(container, obj);
    /* This will go with silver+copper & new gold weight */
    if (is_gold) /* merged gold might affect cumulative weight */
        wt -= (GOLD_WT(umoney) + GOLD_WT(count) - GOLD_WT(umoney + count));
    if (count !== savequan) {
        obj.quan = savequan;
        obj.owt = saveowt;
    }
    wts.before = iw;
    wts.after = wt;

    if (wt < 0)
        return count;

    /* see how many we can lift */
    if (is_gold) {
        iw -= GOLD_WT(umoney);
        if (!adjust_wt) {
            qq = GOLD_CAPACITY(iw, umoney);
        } else {
            oow = 0;
            qq = 50 - (umoney % 100) - 1;
            if (qq < 0)
                qq += 100;
            for (; qq <= count; qq += 100) {
                obj.quan = qq;
                obj.owt = GOLD_WT(qq);
                ow = GOLD_WT(umoney + qq);
                ow -= delta_cwt(container, obj);
                if (iw + ow >= 0)
                    break;
                oow = ow;
            }
            iw -= oow;
            qq -= 100;
        }
        if (qq < 0)
            qq = 0;
        else if (qq > count)
            qq = count;
        wt = iw + GOLD_WT(umoney + qq);
    } else if (count > 1 || count < obj.quan) {
        /*
         * Ugh. Calc num to lift by changing the quan of the
         * object and calling weight.
         *
         * This works for containers only because containers
         * don't merge.  -dean
         */
        for (qq = 1; qq <= count; qq++) {
            obj.quan = qq;
            obj.owt = (ow = weight(obj));
            if (adjust_wt)
                ow -= delta_cwt(container, obj);
            if (iw + ow >= 0)
                break;
            wt = iw + ow;
        }
        --qq;
    } else {
        /* there's only one, and we can't lift it */
        qq = 0;
    }
    obj.quan = savequan;
    obj.owt = saveowt;

    if (qq < count) {
        /* some message will be given */
        obj_nambuf = doname(obj);
        if (container) {
            where = `in ${the(xname(container))}`;
            verb = "carry";
        } else {
            where = "lying here";
            verb = telekinesis ? "acquire" : "lift";
        }
    } else {
        /* lint suppression */
        obj_nambuf = where = '';
        verb = "";
    }
    /* we can carry qq of them */
    if (qq > 0) {
        if (qq < count)
            await You(`can only ${verb} ${(qq === 1) ? "one" : "some"} of the ${
                obj_nambuf} ${where}.`);
        wts.after = wt;
        return qq;
    }

    if (!container)
        where = "here"; /* slightly shorter form */
    if (game.invent || umoney) {
        prefx1 = "you cannot ";
        prefx2 = "";
        suffx = " any more";
    } else {
        prefx1 = (obj.quan === 1) ? "it " : "even one ";
        prefx2 = "is too heavy for you to ";
        suffx = "";
    }
    await There(`${otense(obj, "are")} ${obj_nambuf} ${where}, but ${prefx1}${
        prefx2}${verb}${suffx}.`);

    /* *wt_after = iw; */
    return 0;
}

// C ref: objnam.c safe_qbuf() -- the case where the formatted object name
// fits (short_oname()'s first step); shortening a long name isn't ported
export function safe_qbuf(qprefix, qsuffix, obj, func, lastR) {
    const lenlimit = QBUFSZ - 1;
    let qbuf = (qprefix || '').slice(0, lenlimit);
    let len = qbuf.length;

    if (len + lastR.length + (qsuffix || '').length > lenlimit)
        throw new Error('safe_qbuf(): truncated last-resort output not ported yet');
    /* suffix and last resort are guaranteed to fit */
    len += (qsuffix || '').length; /* include the pending suffix */
    /* format the object */
    const bufp = func(obj);
    if (bufp.length > lenlimit - len)
        throw new Error('safe_qbuf(): short_oname() not ported yet');
    qbuf += bufp; /* formatted object name fits */
    if (qsuffix)
        qbuf += qsuffix;
    return qbuf;
}

// C ref: pickup.c lift_object()
/* determine whether character is able and player is willing to carry `obj' */
async function lift_object(obj, /* object to pick up... */
                           container, /* ...bag it's coming out of */
                           cnt_p, telekinesis) {
    let result;
    let prev_encumbr, next_encumbr;
    const u = game.u;

    if (obj.otyp === BOULDER && game.level.flags?.sokoban_rules) {
        await You(`cannot get your ${body_part(HAND)} around this ${xname(obj)}.`);
        return -1;
    }
    /* override weight consideration for loadstone picked up by anybody
       and for boulder picked up by hero poly'd into a giant; override
       availability of open inventory slot iff not already carrying one */
    if (obj.otyp === LOADSTONE
        || (obj.otyp === BOULDER
            && (game.youmonst.data.mflags2 & M2_ROCKTHROW) !== 0)) {
        if (inv_cnt(false) < invlet_basic || !carrying(obj.otyp)
            || merge_choice(game.invent, obj))
            return 1; /* lift regardless of current situation */
        /* if we reach here, we're out of slots and already have at least
           one of these, so treat this one more like a normal item */
        await You(`are carrying too much stuff to pick up ${
            (obj.quan === 1) ? "another" : "more"} ${xname(obj)}.`);
        return -1;
    }

    const wts = { before: 0, after: 0 };
    cnt_p.val = await carry_count(obj, container, cnt_p.val, telekinesis, wts);
    const old_wt = wts.before, new_wt = wts.after;
    if (cnt_p.val < 1) {
        result = -1; /* nothing lifted */
    } else if (obj.oclass !== COIN_CLASS
               /* [exception for gold coins will have to change
                   if silver/copper ones ever get implemented] */
               && inv_cnt(false) >= invlet_basic
               && !merge_choice(game.invent, obj)) {
        throw new Error('lift_object(): "Your knapsack cannot accommodate any more items" (nxtobj) not ported yet');
    } else {
        result = 1;
        prev_encumbr = near_capacity();
        const pickup_burden = game.flags.pickup_burden ?? MOD_ENCUMBER;
        if (prev_encumbr < pickup_burden)
            prev_encumbr = pickup_burden;
        next_encumbr = calc_capacity(new_wt - old_wt);
        if (next_encumbr > prev_encumbr) {
            if (telekinesis) {
                result = 0; /* don't lift */
            } else {
                const savequan = obj.quan;

                obj.quan = cnt_p.val;
                let qbuf = `${(next_encumbr >= EXT_ENCUMBER) ? overloadpfx
                              : (next_encumbr >= HVY_ENCUMBER) ? nearloadpfx
                                : (next_encumbr >= MOD_ENCUMBER) ? moderateloadpfx
                                  : slightloadpfx} ${
                    !container ? "lifting" : "removing"} `;
                qbuf = safe_qbuf(qbuf, ".  Continue?", obj, doname, "something");
                obj.quan = savequan;
                switch (await tty_yn_function(qbuf, "ynq", 'q')) {
                case 'q':
                    result = -1;
                    break;
                case 'n':
                    result = 0;
                    break;
                default:
                    break; /* 'y' => result == 1 */
                }
                tty_clear_nhwindow(game.WIN_MESSAGE);
            }
        }
    }

    if (obj.otyp === SCR_SCARE_MONSTER && result <= 0 && !container)
        obj.spe = 0;
    void u;
    return result;
}

// C ref: pickup.c pickup_object()
/*
 * Pick up <count> of obj from the ground and add it to the hero's inventory.
 * Returns -1 if caller should break out of its loop, 0 if nothing picked
 * up, 1 if otherwise.
 */
export async function pickup_object(obj,
                                    count, /* if non-zero, pick up a subset of this amount */
                                    telekinesis) { /* not picking it up directly by hand */
    let res;

    if (obj.quan < count) {
        /* impossible("pickup_object: count %ld > quan %ld?") */
        return 0;
    }

    /* In case of auto-pickup, where we haven't had a chance
       to look at it yet; affects docall(SCR_SCARE_MONSTER). */
    if (!pk_Blind())
        observe_object(obj, u_prop(HALLUC));

    if (obj === game.uchain) { /* do not pick up attached chain */
        return 0;
    } else if (obj.where === 'OBJ_MINVENT' && obj.owornmask
               && game.u.uswallow && obj.ocarry === game.u.ustuck) {
        throw new Error('pickup_object(): ysimple_name() for a worn engulfer item not ported yet');
    } else if (obj.oartifact && !touch_artifact(obj, game.youmonst)) {
        return 0;
    } else if (obj.otyp === CORPSE) {
        if (fatal_corpse_mistake(obj, telekinesis)
            || rider_corpse_revival(obj, telekinesis))
            return -1;
    } else if (obj.otyp === SCR_SCARE_MONSTER) {
        throw new Error('pickup_object(): scroll of scare monster not ported yet');
    }

    /* obj has either already passed autopick_testobj or we are explicitly
       picking it off the floor, so addinv() will override obj->how_lost */
    const cnt_p = { val: count };
    res = await lift_object(obj, null, cnt_p, telekinesis);
    count = cnt_p.val;
    if (res <= 0)
        return res;

    /* What's left of the special case for gold :-) */
    if (obj.oclass === COIN_CLASS)
        game.disp_botl = true;
    if (obj.quan !== count && obj.otyp !== LOADSTONE)
        obj = splitobj(obj, count);

    obj = await pick_obj(obj);

    if (game.uwep && game.uwep === obj)
        game.mrg_to_wielded = true;
    await pickup_prinv(obj, count, "lifting");
    if (obj.ghostly)
        throw new Error('pickup_object(): fix_ghostly_obj() not ported yet');
    game.mrg_to_wielded = false;
    return 1;
}

// C ref: pickup.c pick_obj()
/*
 * Do the actual work of picking otmp from the floor or monster's interior
 * and putting it in the hero's inventory.  Take care of billing.  Return a
 * pointer to the object where otmp ends up.  This may be different
 * from otmp because of merging.
 */
export async function pick_obj(otmp) {
    const u = game.u;
    const fromfloor = otmp.where === 'OBJ_FLOOR';

    /* otmp is either on the floor or in an engulfer's inventory; for the
       latter, its <ox,oy> probably won't be set */
    let ox = 0, oy = 0;
    if (fromfloor) {
        ox = otmp.ox, oy = otmp.oy;
    } else if (otmp.where === 'OBJ_MINVENT' && otmp.ocarry.mx) {
        ox = otmp.ocarry.mx, oy = otmp.ocarry.my;
    }

    const robshop = (!u.uswallow && otmp !== game.uball && costly_spot(ox, oy));
    obj_extract_self(otmp);
    if (fromfloor)
        newsym(ox, oy);

    if (robshop)
        throw new Error('pick_obj(): addtobill() for a shop item not ported yet');

    const result = await addinv(otmp);
    return result;
}

// C ref: pickup.c pickup_prinv()
/* pickup_object()/out_container() helper;
   print an added-to-invent message for current object, limiting feedback
   about encumbrance to the first item which causes that to change */
async function pickup_prinv(obj, count, verb) {
    let pbuf = '';
    let prefix;
    const nearload = near_capacity();

    if (nearload === game.pickup_encumbrance) {
        prefix = null;
    } else {
        prefix = (nearload >= EXT_ENCUMBER) ? overloadpfx
                 : (nearload >= HVY_ENCUMBER) ? nearloadpfx
                   : (nearload >= MOD_ENCUMBER) ? moderateloadpfx
                     : (nearload >= SLT_ENCUMBER) ? slightloadpfx
                       : null;
        game.pickup_encumbrance = nearload;
    }
    if (prefix)
        pbuf = `${prefix} ${verb}`;

    await prinv(pbuf, obj, count);
}

/* C ref: pickup.c u_safe_from_fatal_corpse() test bits */
const st_gloves = 0x1, st_corpse = 0x2, st_petrifies = 0x4, st_resists = 0x8,
    st_all = (st_gloves | st_corpse | st_petrifies | st_resists);

// C ref: pickup.c u_safe_from_fatal_corpse()
export function u_safe_from_fatal_corpse(obj, tests) {
    if (((tests & st_gloves) && game.uarmg)
        || ((tests & st_corpse) && obj.otyp !== CORPSE)
        || ((tests & st_petrifies) && !touch_petrifies(mons[obj.corpsenm]))
        || ((tests & st_resists) && u_prop(STONE_RES)))
        return true;
    return false;
}

// C ref: pickup.c fatal_corpse_mistake()
/* check whether hero is bare-handedly touching a cockatrice corpse */
function fatal_corpse_mistake(obj, remotely) {
    if (u_safe_from_fatal_corpse(obj, st_all) || remotely)
        return false;
    throw new Error('fatal_corpse_mistake(): touching a cockatrice corpse (instapetrify) not ported yet');
}

// C ref: pickup.c rider_corpse_revival()
/* attempting to manipulate a Rider's corpse triggers its revival */
function rider_corpse_revival(obj, remotely) {
    if (!obj || obj.otyp !== CORPSE || !is_rider(mons[obj.corpsenm]))
        return false;
    void remotely;
    throw new Error('rider_corpse_revival(): revive_corpse() not ported yet');
}

/* C ref: mondata.h touch_petrifies(), is_rider() */
function touch_petrifies(ptr) {
    return ptr === mons[PM_COCKATRICE] || ptr === mons[PM_CHICKATRICE];
}
function is_rider(ptr) {
    return ptr === mons[PM_DEATH] || ptr === mons[PM_FAMINE]
           || ptr === mons[PM_PESTILENCE];
}

// C ref: pickup.c encumber_msg()
export async function encumber_msg() {
    const newcap = near_capacity();
    const oldcap = game.oldcap || 0;

    if (oldcap < newcap) {
        switch (newcap) {
        case 1:
            await Your("movements are slowed slightly because of your load.");
            break;
        case 2:
            await You("rebalance your load.  Movement is difficult.");
            break;
        case 3:
            throw new Error('encumber_msg(): stagger() not ported yet');
        default:
            await You(`${newcap === 4 ? "can barely" : "can't even"} move a handspan with this load!`);
            break;
        }
        game.disp_botl = true;
    } else if (oldcap > newcap) {
        switch (newcap) {
        case 0:
            await Your("movements are now unencumbered.");
            break;
        case 1:
            await Your("movements are only slowed slightly by your load.");
            break;
        case 2:
            await You("rebalance your load.  Movement is still difficult.");
            break;
        case 3:
            throw new Error('encumber_msg(): stagger() not ported yet');
        }
        game.disp_botl = true;
    }

    game.oldcap = newcap;
    return newcap;
}

/* C ref: display.h level.objects[x][y] -- the pile at <x,y>, top first */
function objects_at(x, y) {
    return (game.level?.objects || []).filter(
        o => o.ox === x && o.oy === y && o.where === 'OBJ_FLOOR');
}

// C ref: pickup.c container_at() -- is there a container at x,y;
// optional: return count of containers at x,y
export function container_at(x, y, countem) {
    let container_count = 0;

    for (const cobj of objects_at(x, y)) {
        if (Is_container(cobj)) {
            container_count++;
            if (!countem)
                break;
        }
    }
    return container_count;
}

// C ref: pickup.c mon_beside()
function mon_beside(x, y) {
    for (let i = -1; i <= 1; i++)
        for (let j = -1; j <= 1; j++) {
            const nx = x + i, ny = y + j;
            if (isok(nx, ny) && m_at(nx, ny))
                return true;
        }
    return false;
}

/* C ref: you.h Confusion, Stunned */
function u_prop(p) {
    const up = game.u?.uprops?.[p];
    return !!(up?.intrinsic || up?.extrinsic);
}
/* C ref: youprop.h Blind -- ((HBlinded || EBlinded) && !BBlinded) */
function pk_Blind() {
    const up = game.u?.uprops?.[BLINDED];
    return !!((up?.intrinsic || up?.extrinsic) && !up?.blocked);
}

// C ref: pickup.c able_to_loot()
async function able_to_loot(x, y, looting) { /* loot vs tip */
    const verb = looting ? "loot" : "tip";
    const t = t_at(x, y);

    if (!can_reach_floor(!!(t && is_pit(t.ttyp)))) {
        throw new Error('able_to_loot(): cant_reach_floor() not ported yet');
    } else if ((is_pool(x, y) && (looting || !game.u.uinwater)) || is_lava(x, y)) {
        throw new Error('able_to_loot(): looting in water/lava not ported yet');
    } else if ((game.youmonst.data.mflags1 & M1_NOLIMBS) === M1_NOLIMBS) {
        await pline(`Without limbs, you cannot ${verb} anything.`);
        return false;
    } else if (looting && !freehand()) {
        await pline(`Without a free ${body_part(HAND)}, you cannot loot anything.`);
        return false;
    }
    return true;
}

// C ref: pickup.c do_loot_cont() -- a locked container so far;
// use_container() is not ported yet
async function do_loot_cont(cobj, cindex, ccount) {
    void cindex;
    if (!cobj)
        return ECMD_OK;
    if (cobj.olocked) {
        const res = ECMD_OK;

        if (cobj.lknown)
            throw new Error('do_loot_cont(): The() not ported yet');
        else
            await pline(`Hmmm, ${the(xname(cobj))} turns out to be locked.`);
        cobj.lknown = 1;

        const autounlock = game.flags.autounlock ?? AUTOUNLOCK_APPLY_KEY;
        if (autounlock) {
            let unlocktool = null;

            game.u.dz = 0; /* might be non-zero from previous command since
                            * #loot isn't a move command; pick_lock() cares */
            if (((autounlock & AUTOUNLOCK_APPLY_KEY) !== 0
                 && (unlocktool = autokey(true)) !== null)
                || (autounlock & AUTOUNLOCK_UNTRAP) !== 0) {
                throw new Error('do_loot_cont(): pick_lock() not ported yet');
            }
            if ((autounlock & AUTOUNLOCK_FORCE) !== 0 && ccount === 1)
                throw new Error('do_loot_cont(): u_have_forceable_weapon() not ported yet');
        }
        return res;
    }
    cobj.lknown = 1; /* floor container, so no need for update_inventory() */

    if (cobj.otyp === BAG_OF_TRICKS)
        throw new Error('do_loot_cont(): bag of tricks not ported yet');
    throw new Error('do_loot_cont(): use_container() not ported yet');
}

// C ref: pickup.c doloot() -- the #loot command
export async function doloot() {
    let res;

    game.loot_reset_justpicked = true;
    res = await doloot_core();
    game.loot_reset_justpicked = false;
    return res;
}

// C ref: pickup.c doloot_core() -- loot a container on the floor or loot
// saddle from mon; looting containers (able_to_loot(), do_loot_cont())
// and monsters (loot_mon()) are not ported yet
async function doloot_core() {
    let c = -1;
    let timepassed = 0;
    const cc = { x: 0, y: 0 };
    let underfoot = true;
    const dont_find_anything = "don't find anything";
    let mtmp;
    const prev_inquiry = 0;
    const prev_loot = false;
    let num_conts = 0;

    game.abort_looting = false;

    if (await check_capacity(null)) {
        /* "Can't do that while carrying so much stuff." */
        return ECMD_OK;
    }
    if (game.youmonst.data.mflags1 & M1_NOHANDS) {
        await You("have no hands!"); /* not `body_part(HAND)' */
        return ECMD_OK;
    }
    if (u_prop(CONFUSION)) {
        if (rn2(6))
            throw new Error('doloot_core(): reverse_loot() not ported yet');
        if (rn2(2)) {
            await pline("Being confused, you find nothing to loot.");
            return ECMD_TIME; /* costs a turn */
        } /* else fallthrough to normal looting */
    }
    cc.x = game.u.ux;
    cc.y = game.u.uy;

    let goto_lootmon = !!game.iflags?.menu_requested;
    for (;;) {
        if (!goto_lootmon) {
            /* lootcont: */
            if ((num_conts = container_at(cc.x, cc.y, true)) > 0) {
                let anyfound = false;

                if (!(await able_to_loot(cc.x, cc.y, true)))
                    return ECMD_OK;

                if (u_prop(BLINDED) && !game.uarmg
                    && objects_at(cc.x, cc.y).some(o => o.otyp === CORPSE))
                    throw new Error('doloot_core(): will_feel_cockatrice() not ported yet');

                if (num_conts > 1) {
                    throw new Error('doloot_core(): "Loot which containers?" menu not ported yet');
                } else {
                    for (const cobj of objects_at(cc.x, cc.y)) {
                        if (Is_container(cobj)) {
                            anyfound = true;
                            timepassed |= await do_loot_cont(cobj, 1, 1);
                            if (game.abort_looting)
                                /* chest trap or magic bag explosion or <esc> */
                                return (timepassed ? ECMD_TIME : ECMD_OK);
                        }
                    }
                    if (anyfound)
                        c = 'y';
                }
            } else if (IS_GRAVE(game.level.at(cc.x, cc.y).typ)) {
                await You("need to dig up the grave to effectively loot it...");
            }
        }
        goto_lootmon = false;

        /*
         * 3.3.1 introduced directional looting for some things.
         */
        /* lootmon: */
        if (c !== 'y' && (mon_beside(game.u.ux, game.u.uy)
                          || game.iflags?.menu_requested)) {
            const looted_mon = false;
            if (!(await get_adjacent_loc("Loot in what direction?",
                                         "Invalid loot location",
                                         game.u.ux, game.u.uy, cc)))
                return ECMD_OK;
            underfoot = (cc.x === game.u.ux && cc.y === game.u.uy);
            if (underfoot && container_at(cc.x, cc.y, false))
                continue; /* goto lootcont */
            if (game.u.dz < 0)
                throw new Error('doloot_core(): ceiling() not ported yet');
            mtmp = m_at(cc.x, cc.y);
            if (mtmp)
                throw new Error('doloot_core(): loot_mon() not ported yet');
            /* always use a turn when choosing a direction is impaired,
               even if you've successfully targeted a saddled creature
               and then answered "no" to the "remove its saddle?" prompt */
            if (u_prop(CONFUSION) || u_prop(STUNNED))
                timepassed = 1;

            /* Preserve pre-3.3.1 behavior for containers.
             * Adjust this if-block to allow container looting
             * from one square away to change that in the future.
             */
            if (!looted_mon) {
                if (!underfoot && container_at(cc.x, cc.y, false)) {
                    if (mtmp) {
                        await You_cant(`loot anything ${prev_inquiry ? "else " : ""}there with ${mon_nam(mtmp)} in the way.`);
                        return (timepassed ? ECMD_TIME : ECMD_OK);
                    } else {
                        await You("have to be at a container to loot it.");
                    }
                } else {
                    await You(`${dont_find_anything} ${(prev_inquiry || prev_loot) ? "else " : ""}${!underfoot ? "t" : ""}here to loot.`);
                    return (timepassed ? ECMD_TIME : ECMD_OK);
                }
            }
        } else if (c !== 'y' && c !== 'n') {
            await You(`${dont_find_anything} ${underfoot ? "here" : "there"} to loot.`);
        }
        void num_conts;
        return (timepassed ? ECMD_TIME : ECMD_OK);
    }
}
