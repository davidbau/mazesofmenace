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
import { CORPSE, BAG_OF_TRICKS } from './objects.js';
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

// C ref: invent.c sortloot() with sortloot_cmp()/loot_classify() -- the
// class ordering; ordering objects within one class (subclass, discovery
// state, loot_xname(), BUCX, ...) is not ported yet
function sortloot(olist, mode, by_nexthere, filterfunc) {
    void by_nexthere; /* olist is already the pile (nexthere) or minvent */
    /* the 'keep cockatrice corpses' flag is overloaded with sort mode */
    const augment_filter = (mode & SORTLOOT_PETRIFY) !== 0;
    mode &= ~SORTLOOT_PETRIFY; /* remove flag, leaving mode */
    const sliarray = [];
    for (const o of olist) {
        if (filterfunc && !filterfunc(o)
            /* caller may be asking us to override filterfunc (in order
               to do a cockatrice corpse touch check during pickup even
               if/when the filter rejects food class) */
            && (!augment_filter || o.otyp !== CORPSE
                || !touch_petrifies(mons[o.corpsenm])))
            continue;
        sliarray.push({ obj: o, indx: sliarray.length, orderclass: 0 });
    }

    /* do the sort; if no sorting is requested, we'll just return
       a sortloot_item array reflecting the current ordering */
    if (mode && sliarray.length > 1) {
        if ((mode & SORTLOOT_INUSE) !== 0
            || (mode & (SORTLOOT_PACK | SORTLOOT_INVLET)) === SORTLOOT_INVLET)
            throw new Error('sortloot(): in-use/invlet-only ordering not ported yet');
        const seen = new Set();
        for (const sli of sliarray) {
            if (seen.has(sli.obj.oclass))
                throw new Error('sortloot(): ordering objects of one class (loot_classify subclass, loot_xname) not ported yet');
            seen.add(sli.obj.oclass);
        }
        /* loot_classify(): every item takes part in some comparison */
        const classorder = (game.flags.sortpack ?? true) ? def_inv_order
                                                         : def_srt_order;
        for (const sli of sliarray) {
            if (!pk_Blind())
                observe_object(sli.obj, u_prop(HALLUC)); /* xname(obj) does this; we want it sooner */
            const k = classorder.indexOf(sli.obj.oclass);
            sli.orderclass = (k >= 0) ? 1 + k
                : 1 + classorder.length + (sli.obj.oclass !== VENOM_CLASS ? 1 : 0);
        }
        /* distinct classes: orderclass decides, indx is the tiebreak */
        sliarray.sort((a, b) => (a.orderclass - b.orderclass) || (a.indx - b.indx));
    }
    return sliarray;
}
/* C ref: invent.c loot_classify() def_srt_order[] */
const def_srt_order = [
    COIN_CLASS, AMULET_CLASS, RING_CLASS, WAND_CLASS, POTION_CLASS,
    SCROLL_CLASS, SPBOOK_CLASS, GEM_CLASS, FOOD_CLASS, TOOL_CLASS,
    WEAPON_CLASS, ARMOR_CLASS, ROCK_CLASS, BALL_CLASS, CHAIN_CLASS,
];

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
function safe_qbuf(qprefix, qsuffix, obj, func, lastR) {
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
