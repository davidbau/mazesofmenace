// pickup.js — picking up objects.
// C ref: pickup.c
//
// Ported so far: the start of pickup(), up to autopickup's early return
// when there's nothing at the hero's spot.  autopick(), query_objlist(),
// check_here() and the rest of pickup.c are not ported yet.

import { impossible } from './hack.js';
import { FUMBLING, TIMEOUT, DRAWBRIDGE_UP, ICE, STONE, IS_POOL, IS_LAVA,
         IS_FURNITURE, PLNMSG_BACK_ON_GROUND, is_pit } from './const.js';
import { db_under_typ, lastseentyp_array } from './display.js';
import { dfeature_at } from './invent.js';
import { waterbody_name } from './pager.js';
import { back_on_ground, unconscious } from './trap.js';
import { an } from './objnam.js';
import { game } from './gstate.js';
import { is_pool, is_lava } from './makemon.js';
import { engr_at, read_engr_at } from './engrave.js';
import { near_capacity } from './hack.js';
import { You, Your, You_cant, pline } from './display.js';
import { rn2, rn2_on_display_rng } from './rng.js';
import { check_capacity, nomul } from './hack.js';
import { flush_screen, obj_to_glyph, menu_glyphinfo, what_mon } from './display.js';
import { self_lookat } from './pager.js';
import { digests } from './mondata.js';
import { CONTAINED_SYM } from './const.js';
import { look_here, feel_cockatrice } from './invent.js';
import { M1_NOTAKE, M1_CONCEAL } from './monsters.js';
import { get_adjacent_loc } from './cmd.js';
import { isok, IS_GRAVE, CONFUSION, STUNNED, ECMD_OK, ECMD_TIME, ECMD_CANCEL, GETOBJ_DOWNPLAY,
         ParanoidAutoAll } from './const.js';
import { W_QUIVER, W_SWAPWEP, W_WEP,
         WORN_SHIRT, WORN_BOOTS, WORN_GLOVES, WORN_HELMET, WORN_SHIELD,
         WORN_CLOAK, WORN_ARMOR, WORN_BLINDF, WORN_AMUL, LEFT_RING,
         RIGHT_RING } from './const.js';
import { m_at } from './makemon.js';
import { mon_nam } from './do_name.js';
import { M1_NOHANDS, M1_NOLIMBS } from './monsters.js';
import { BLINDED, HAND } from './const.js';
import { CORPSE, BAG_OF_TRICKS, HORN_OF_PLENTY, WOODEN_FLUTE, MAGIC_FLUTE,
         TOOLED_HORN, FROST_HORN, FIRE_HORN, WOODEN_HARP, MAGIC_HARP, BUGLE,
         LEATHER_DRUM, DRUM_OF_EARTHQUAKE, SLIME_MOLD, TIN, EGG, ROCK,
         POT_WATER, TOWEL, GEMSTONE, GLASS, OBJ_DESCR, ARM_HELM, ARM_GLOVES,
         ARM_BOOTS, ARM_SHIELD, ARM_CLOAK, ARM_SHIRT, ARM_SUIT,
         greatest_erosion, Is_mbag, Is_box, SchroedingersBox, carried, is_pick,
         Is_container, is_pole, is_wet_towel } from './objects.js';
import { cxname_singular } from './objnam.js';
import { strcmpi, plur } from './hacklib.js';
import { unbless } from './mkobj.js';
import { trycall } from './potion.js';
import { useupf } from './invent.js';
import { P_BOW, P_CROSSBOW, P_SPEAR, P_DAGGER, P_KNIFE } from './const.js';
import { t_at } from './trap.js';
import { can_reach_floor, cant_reach_floor } from './engrave.js';
import { P_SKILL } from './weapon.js';
import { P_RIDING, P_BASIC } from './const.js';
import { freehand } from './wield.js';
import { body_part } from './insight.js';
import { the } from './iactions.js';
import { xname } from './objnam.js';
import { autokey, AUTOUNLOCK_APPLY_KEY, AUTOUNLOCK_UNTRAP,
         AUTOUNLOCK_FORCE } from './lock.js';
import { costly_spot, addtobill, stolen_value } from './shk.js';
import { in_rooms } from './hack.js';
import { SHOPBASE } from './const.js';
import { money_cnt } from './u_init.js';
import { max_capacity, calc_capacity, inv_cnt } from './hack.js';
import { weight, splitobj, obj_extract_self, unsplitobj } from './mkobj.js';
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
/* query_classes(), traditional_loot() */
import { collect_obj_classes as collect_obj_classes_qc,
         tally_BUCX as tally_BUCX_qc, askchain as askchain_qc,
         display_inventory as display_inventory_qc,
         objchain_items as objchain_items_qc } from './invent.js';
import { def_char_to_objclass as def_char_to_objclass_qc } from './drawing.js';
import { tty_getlin as tty_getlin_qc } from './wintty.js';
import { NHW_MENU as NHW_MENU_QC } from './const.js';
import { add_menu_str } from './wintty.js';
import { tty_putstr, tty_display_nhwindow } from './wintty.js';
import { PM_CLERIC } from './monsters.js';
import { observe_object, makeknown } from './o_init.js';
import { touch_artifact } from './artifact.js';
import { tty_yn_function, tty_clear_nhwindow } from './wintty.js';
import { COIN_CLASS, BOULDER, LOADSTONE, SCR_SCARE_MONSTER,
         BAG_OF_HOLDING } from './objects.js';
import { mons, M2_ROCKTHROW, PM_COCKATRICE, PM_CHICKATRICE, PM_DEATH,
         PM_FAMINE, PM_PESTILENCE } from './monsters.js';
import { LOST_THROWN, LOST_DROPPED, LOST_STOLEN, LOST_EXPLODING, QBUFSZ,
         SLT_ENCUMBER, MOD_ENCUMBER, HVY_ENCUMBER, EXT_ENCUMBER, HALLUC,
         STONE_RES } from './const.js';
import { The, Tobjnam, Yname2, yname } from './objnam.js';
import { losehp, Maybe_Half_Phys, chest_trap } from './trap.js';
import { KILLED_BY_AN, W_SADDLE, ARTICLE_THE, SUPPRESS_SADDLE, SELL_NORMAL, SELL_DELIBERATE, SELL_DONTSELL, NO_MINVENT, MM_ADJACENTOK, MM_NOMSG, ONAME_NO_FLAGS, NHW_TEXT, GETOBJ_EXCLUDE, GETOBJ_EXCLUDE_SELECTABLE, GETOBJ_SUGGEST, GETOBJ_PROMPT, GETOBJ_ALLOWCNT, BUCX_TYPES, MENU_ITEMFLAGS_SELECTED, PICK_ONE, MENU_PARTIAL, FOOT } from './const.js';
import { pick_lock, u_have_forceable_weapon, boxlock } from './lock.js';
import { dropx } from './do.js';
import { remove_worn_item } from './steal.js';
import { verbalize } from './display.js';
import { distu } from './hacklib.js';
import { add_to_minv } from './mkobj.js';
import { g_at } from './vault.js';
import { courtmon } from './mklev.js';
import { IS_THRONE, T_LOOTED, NO_MM_FLAGS } from './const.js';
import { SPE_WIZARD_LOCK } from './objects.js';
import { rnd } from './rng.js';
import { stagger } from './uhitm.js';
import { ceiling } from './dungeon.js';
import { which_armor } from './worn.js';
import { x_monnam, Monnam, christen_monst, oname, rndmonnam } from './do_name.js';
import { extract_from_minvent } from './steal.js';
import { thesimpleoname, ysimple_name } from './iactions.js';
import { hold_another_object } from './wizcmds.js';
import { WAN_CANCELLATION, LARGE_BOX, CHEST, ICE_BOX, AMULET_OF_YENDOR, CANDELABRUM_OF_INVOCATION, BELL_OF_OPENING, SPE_BOOK_OF_THE_DEAD, LEASH, STATUE, PICK_AXE, DWARVISH_MATTOCK, BRASS_LANTERN, OIL_LAMP, TALLOW_CANDLE, WAX_CANDLE, POT_OIL } from './objects.js';
import { obfree, freeinv, getobj, objchain_items } from './invent.js';
import { shop_keeper, sellobj, get_obj_location } from './shk.js';
import { Norep, pline_The, bot, canspotmon } from './display.js';
import { welded, setuwep, setuswapwep, setuqwep, weldmsg } from './wield.js';
import { MZ_LARGE, PM_ICE_TROLL, PM_HOUSECAT } from './monsters.js';
import { add_to_container, start_corpse_timeout, set_corpsenm, start_glob_timeout,
         level_objects_at } from './mkobj.js';
import { stop_timer, obj_to_any } from './timeout.js';
import { ROT_CORPSE, REVIVE_MON, SHRINK_GLOB } from './const.js';
import { makemon, set_malign } from './makemon.js';
import { more_experienced, newexplevel } from './exper.js';
import { currency } from './insight.js';
import { container_contents } from './end.js';
import { discover_object } from './o_init.js';
import { hideunder } from './makemon.js';
import { fix_ghostly_obj } from './bones.js';
import { revive_corpse } from './zap.js';
import { exercise } from './attrib.js';
import { A_WIS } from './const.js';
import { uteetering_at_seen_pit, uescaped_shaft } from './engrave.js';
import { hides_under, notake, touch_petrifies, is_rider } from './mondata.js';
import { snuff_lit } from './apply.js';
import { instapetrify } from './trap.js';
import { poly_when_stoned } from './mondata.js';
import { polymon } from './polyself.js';
import { PM_STONE_GOLEM } from './monsters.js';
import { corpse_xname, CXN_SINGULAR, CXN_ARTICLE } from './objnam.js';
import { killer_xname } from './mthrowu.js';
import { obj_is_burning } from './light.js';

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
    if (autopickup && game.multi < 0 && unconscious()) {
        game.iflags.prev_decor = STONE;
        return 0;
    }

    /* used by pickup_object() for encumbrance feedback */
    game.pickup_encumbrance = 0;

    if (!u.uswallow) {
        /* no auto-pick if no-pick move, nothing there, or in a pool */
        if (autopickup && (game.context?.nopick || !OBJ_AT(u.ux, u.uy)
                           || (is_pool(u.ux, u.uy) && !u.uinwater)
                           || is_lava(u.ux, u.uy))) {
            if (game.flags?.mention_decor)
                await describe_decor();
            await read_engr_at(u.ux, u.uy);
            return 0;
        }
        /* no pickup if levitating & not on air or water level */
        const t = t_at(u.ux, u.uy);
        if (!can_reach_floor(t && is_pit(t.ttyp))) {
            await describe_decor(); /* even when !flags.mention_decor */
            if ((game.multi && !game.context?.run)
                || (autopickup && !game.flags?.pickup)
                || (t && (uteetering_at_seen_pit(t) || uescaped_shaft(t))))
                await read_engr_at(u.ux, u.uy);
            return 0;
        }
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

    add_valid_menu_class(0); /* reset */
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
        /* old style interface */
        let ct = 0;
        let lcount;
        let all_of_a_type, selective, bycat;
        let oclasses = [];   /* types to consider (empty for all) */
        let obj;

        all_of_a_type = true; /* take all of considered types */
        selective = false;    /* ask for each item */

        /* check for more than one object */
        ct = objchain.length; /* FOLLOW(obj, traverse_how) */

        end_query: {
            if (ct === 1 && count) {
                /* if only one thing, then pick it */
                obj = objchain[0];
                lcount = Math.min(obj.quan, count);
                n_tried++;
                reset_justpicked(game.invent);
                if (await pickup_object(obj, lcount, false) > 0)
                    n_picked++; /* picked something */
                break end_query;

            } else if (ct >= 2) {
                await There(`are ${(ct <= 10) ? "several" : "many"} objects here.`);
                const q = await query_classes("pick up", objchain,
                                              (traverse_how & BY_NEXTHERE) !== 0,
                                              true);
                oclasses = q.oclasses;
                selective = q.one_at_a_time;
                all_of_a_type = q.everything;
                if (!q.ok) {
                    if (!q.menu_on_demand) {
                        /* goto pickupdone */
                        game.pickup_encumbrance = 0;
                        add_valid_menu_class(0); /* reset */
                        return (n_tried > 0) ? 1 : 0;
                    }
                    if (selective)
                        traverse_how |= INVORDER_SORT;
                    n = await query_objlist("Pick up what?", objchain, traverse_how,
                                            pick_list, PICK_ANY,
                                            (q.menu_on_demand === -2) ? allow_all
                                                                      : allow_category);
                    menu_pickup = true; /* goto menu_pickup */
                    break end_query;
                }
            }
            bycat = (menu_class_present(0x42) || menu_class_present(0x55)
                     || menu_class_present(0x43) || menu_class_present(0x58));

            for (const o of objchain.slice()) { /* obj2 = FOLLOW(obj, ...) */
                obj = o;
                if (bycat ? !allow_category(obj)
                          : (!selective && oclasses.length
                             && !oclasses.includes(obj.oclass)))
                    continue;

                lcount = -1;
                if (!all_of_a_type) {
                    const qbuf = safe_qbuf("Pick up ", "?", obj, doname, something);
                    const c = await tty_yn_function(qbuf,
                                                    (obj.quan < 2) ? "ynaq" : "yn#aq",
                                                    (obj.quan < 2) ? 'y' : 'y');
                    if (c === 'q')
                        break end_query; /* out 2 levels */
                    if (c === 'n')
                        continue;
                    if (c === 'a') {
                        all_of_a_type = true;
                        if (selective) {
                            selective = false;
                            oclasses = [obj.oclass];
                        }
                    } else if (c === '#') {
                        throw new Error('pickup(): a count (yn_number) not ported yet');
                    }
                    /* default: 'y' */
                }
                if (lcount === -1)
                    lcount = obj.quan;

                if (!n_tried) /* reset just before the first item picked */
                    reset_justpicked(game.invent);

                n_tried++;
                const res = await pickup_object(obj, lcount, false);
                if (res < 0)
                    break;
                n_picked += res;
            }
        } /* end_query: */
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
            hideunder(game.youmonst);

        /* position may need updating (invisible hero) */
        if (n_picked)
            newsym_force(u.ux, u.uy);

        /* check if there's anything else here after auto-pickup is done */
        if (autopickup)
            await check_here(n_picked > 0);
    }
    /* pickupdone: */
    game.pickup_encumbrance = 0;
    add_valid_menu_class(0); /* reset */
    return (n_tried > 0) ? 1 : 0;
}

// C ref: pickup.c deferred_decor()
export async function deferred_decor(
    setup) { /* True: deferring, False: catching up */
    if (!game.flags.mention_decor) {
        game.iflags.defer_decor = false;
    } else if (setup) {
        game.iflags.defer_decor = true;
    } else {
        await describe_decor();
        game.iflags.defer_decor = false;
    }
}

// C ref: pickup.c describe_decor()
/* handle 'mention_decor' (when walking onto a dungeon feature such as
   stairs or altar, describe it even if it isn't covered up by an object) */
async function describe_decor() {
    const g = game;
    const u = g.u;
    let outbuf, fbuf;
    let doorhere, waterhere, res = true;
    let dfeature;
    let ltyp;

    if ((u.uprops[FUMBLING].intrinsic & TIMEOUT) === 1 /* about to slip_or_trip */
        && !g.iflags.defer_decor
        && !g.decor_fumble_override) { /* probe_decor() */
        /*
         * Work around a message sequencing issue if Fumbling's periodic
         * timeout is about to kick in:  avoid the combination
         *  |You are back on floor.
         *  |You trip over <object>.  or  You flounder.
         * when the trip is being caused by moving on ice as hero
         * steps off ice onto non-ice.  Defer the back-on-floor part if
         * that is about to happen.
         */
        await deferred_decor(true);
        return false;
    }

    {   /* SURFACE_AT(u.ux, u.uy) */
        const lev = g.level.at(u.ux, u.uy);
        ltyp = (lev.typ === DRAWBRIDGE_UP) ? db_under_typ(lev.drawbridgemask)
                                           : lev.typ;
    }
    dfeature = dfeature_at(u.ux, u.uy);

    /* we don't mention "ordinary" doors but do mention broken ones (and
       closed ones, which will only happen for Passes_walls) */
    doorhere = dfeature && (dfeature === "open door"
                            || dfeature === "doorway");
    waterhere = dfeature && dfeature === "pool of water";
    if (doorhere || u.uinwater /* Underwater */
        || (ltyp === ICE && IS_POOL(g.iflags.prev_decor))) /* pooleffects() */
        dfeature = null;
    /*
     * TODO: if on ice, report moving between thicker and thinner ice (based
     * on ice_descr()'s classification) as if moving onto different terrain.
     */

    if (ltyp === g.iflags.prev_decor && !IS_FURNITURE(ltyp)) {
        res = false;
    } else if (dfeature) {
        if (waterhere)
            dfeature = fbuf = waterbody_name(u.ux, u.uy);
        if (dfeature !== "swamp" && ltyp !== ICE)
            dfeature = an(dfeature);

        if (g.flags.verbose) {
            outbuf = `There is ${dfeature} here.`;
        } else {
            fbuf = dfeature;
            outbuf = `${fbuf[0].toUpperCase() + fbuf.slice(1)}.`; /* upstart() */
        }
        if (ltyp === ICE && g.flags.mention_decor)
            await Norep(outbuf);
        else
            await pline(outbuf);
    } else if (!u.uinwater /* !Underwater */) {
        if (IS_POOL(g.iflags.prev_decor)
            || IS_LAVA(g.iflags.prev_decor)
            || g.iflags.prev_decor === ICE) {
            if (g.iflags.last_msg !== PLNMSG_BACK_ON_GROUND) {
                await back_on_ground(false);
            }
        }
    }
    /* describe_decor() is normally called when moving onto a different
       type of terrain, but it is also called by pickup() even when
       mention_decor is Off if hero can't reach floor; only adapt the next
       describe_decor() by what has just occurred in this one when it's On */
    g.iflags.prev_decor = g.flags.mention_decor ? ltyp : STONE;
    return res;
}

// C ref: pickup.c force_decor()
/* wand of probing zapped down; perhaps hero is levitating while blind */
export async function force_decor(via_probing) {
    const g = game;
    const u = g.u;

    /* we don't want describe_decor() to defer feedback if hero is fumbling
       with 1 turn left until next slip_or_trip(), or for ice_descr() to
       omit thawing details if hero is probing when levitating while blind
       (those will be skipped for look_here() and farlook() or autodescribe);
       we can't control that by temporarily tweaking properties because that
       could become noticeable if status gets updated while decor feedback
       is being delivered */
    g.decor_fumble_override = true;
    g.decor_levitate_override = via_probing;
    /* force current terrain to be different from previous location, or
       uninteresting if previous location was actually inside solid stone */
    g.iflags.prev_decor = STONE;
    /* (void) */ await describe_decor();
    g.decor_fumble_override = g.decor_levitate_override = false;
    lastseentyp_array()[u.ux][u.uy] = g.level.at(u.ux, u.uy).typ;
}

// C ref: pickup.c check_here()
async function check_here(picked_some) {
    const u = game.u;
    let lhflags = picked_some ? 1 /* LOOKHERE_PICKED_SOME */ : 0;

    if (game.flags?.mention_decor) {
        if (await describe_decor())
            lhflags |= 2; /* LOOKHERE_SKIP_DFEATURE */
    }

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
export function sortloot(olist, mode, by_nexthere, filterfunc) {
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

// C ref: invent.c inuse_classify()
/* sortloot() classification for in-use sort;
   called at most once [per sort] for each object */
function inuse_classify(sort_item, obj) {
    const u = game.u;
    const w_mask = ((obj.owornmask || 0) & (W_ACCESSORY | W_WEAPONS | W_ARMOR));
    let rating = 0, altclass = 0;
    /* C's USE_RATING(test): 'rating' advances for each call, and the
       first passing test jumps to assign_rating */
    const tests = [];

    /*
     * In order of importance, least to most, somewhat arbitrarily.
     * (See C for the rationale.)
     */
    /* "Miscellaneous" */
    tests.push([1, () => !w_mask && obj.otyp === LEASH && obj.leashmon]);
    tests.push([1, () => !w_mask && obj.oclass === TOOL_CLASS && obj.lamplit]);
    /* "Armor" */
    tests.push([2, () => w_mask & WORN_SHIRT]);
    tests.push([2, () => w_mask & WORN_BOOTS]);
    tests.push([2, () => w_mask & WORN_GLOVES]);
    tests.push([2, () => w_mask & WORN_HELMET]);
    tests.push([2, () => w_mask & WORN_SHIELD]);
    tests.push([2, () => w_mask & WORN_CLOAK]);
    tests.push([2, () => w_mask & WORN_ARMOR]);
    /* "Weapons" */
    tests.push([3, () => w_mask & W_QUIVER]);
    tests.push([3, () => w_mask & W_SWAPWEP]);
    tests.push([3, () => w_mask & W_WEP]);
    /* "Accessories" */
    tests.push([4, () => w_mask & WORN_BLINDF]);
    tests.push([4, () => w_mask & (u.uhandedness ? RIGHT_RING : LEFT_RING)]); /* off hand (ULEFTY) */
    tests.push([4, () => w_mask & (!u.uhandedness ? RIGHT_RING : LEFT_RING)]); /* main hand (URIGHTY) */
    tests.push([4, () => w_mask & WORN_AMUL]);

    let found = false;
    for (const [cls, test] of tests) {
        altclass = cls;
        ++rating;
        if (test()) {
            found = true;
            break;
        }
    }
    if (!found) {
        /* if we get here, the USE_RATING() checks failed to find a match */
        rating = 0;
        altclass = -1; /* 'orderclass' must end up non-zero */
    }
    /* assign_rating: */
    sort_item.inuse = rating;
    sort_item.orderclass = altclass; /* used for alternate headings */

    /* not applicable for in-use */
    sort_item.subclass = 0;
    sort_item.disco = 0;
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

// C ref: invent.c sortloot_cmp()
/* qsort comparison routine for sortloot() */
function sortloot_cmp(sli1, sli2) {
    const obj1 = sli1.obj, obj2 = sli2.obj;
    const mode = game.sortlootmode;
    let val1, val2, namcmp;

    /* in-use takes precedence over all others */
    if ((mode & SORTLOOT_INUSE) !== 0) {
        /* Classify each object at most once no matter how many
           comparisons it is involved in. */
        if (!sli1.orderclass)
            inuse_classify(sli1, obj1);
        if (!sli2.orderclass)
            inuse_classify(sli2, obj2);

        val1 = sli1.inuse;
        val2 = sli2.inuse;
        if (val1 !== val2)
            return val2 - val1; /* bigger value comes before smaller */
        /* neither item in use (or both are lit lamps/candles or both are
           attached leashes; items using owornmask don't produce ties) */
        return sli1.indx - sli2.indx; /* goto tiebreak */
    }

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
export function menu_class_present(c) {
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

// C ref: pickup.c is_worn_by_type() -- query_objlist callback: return
// TRUE if valid class and worn
export function is_worn_by_type(otmp) {
    return (is_worn(otmp) && allow_category(otmp)) ? true : false;
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

    for (const otmp of objchain_items(olist))
        if (otmp.pickup_prev)
            cnt++;

    return cnt;
}

// C ref: pickup.c find_justpicked()
export function find_justpicked(olist) {
    for (const otmp of objchain_items(olist))
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
    if (!olist || (Array.isArray(olist) && !olist.length))
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
        let curr = null;
        for (const o of objchain_items(olist)) {
            if (ofilter && !ofilter(o))
                continue;
            curr = o;
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
        for (const curr of objchain_items(olist)) {
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
        for (const curr of objchain_items(olist)) {
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
    if (engulfer) {
        ++n;
        /* don't autoselect swallowed hero if it's the only choice */
        qflags &= ~AUTOSELECT_SINGLE;
    }

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
        /* dotypeinv() supplies gt.this_title to display as initial header;
           intentionally avoid the menu_headings highlight attribute here */
        add_menu_str(win, game.this_title);
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

                const tmpglyph = obj_to_glyph(curr, rn2_on_display_rng);
                tty_add_menu(win, menu_glyphinfo(tmpglyph), curr,
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

    let fake_hero_object = null;
    if (engulfer) {
        if (sorted && n > 1)
            add_menu_heading(win, `${digests(game.u.ustuck.data) ? "Swallowed" : "Engulfed"} Creatures`);
        fake_hero_object = { quan: 1 }; /* cg.zeroobj; quan not strictly necessary... */
        /* mon_to_glyph(&gy.youmonst, rn2_on_display_rng); map_glyphinfo():
           tty menus don't show the glyph */
        const tmpglyph = what_mon(game.youmonst.data.pmidx, rn2_on_display_rng);
        void tmpglyph;
        tty_add_menu(win, null, fake_hero_object,
                     /* fake inventory letter, no group accelerator */
                     CONTAINED_SYM, 0, ATR_NONE, NO_COLOR, an(self_lookat()),
                     MENU_ITEMFLAGS_NONE);
    }

    tty_end_menu(win, qstr);
    const res = await tty_select_menu(win, how);
    n = res.n;
    tty_destroy_nhwindow(win);

    if (n > 0) {
        let k = 0;

        /* fix up counts:  -1 means no count used => pick all */
        for (const mi of res.selected) {
            const curr = mi.item;
            if (curr === fake_hero_object) {
                /* this isn't actually possible; fake item representing
                   hero is only included for look here (':'), not pickup,
                   and that's PICK_NONE so we can't get here from there */
                await You_cant("pick yourself up!");
                continue;
            }
            if (engulfer_minvent && curr.owornmask) {
                await You_cant(`pick ${ysimple_name(curr)} up.`);
                continue;
            }
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
    let owt, nwt;

    if (container.otyp !== BAG_OF_HOLDING)
        return obj.owt;

    owt = nwt = container.owt;
    /* find the object so that we can remove it */
    const i = (container.cobj || []).indexOf(obj);
    if (i < 0) {
        throw new Error('delta_cwt: obj not inside container?');
    } else {
        /* temporarily remove the object and calculate resulting weight */
        container.cobj.splice(i, 1);
        nwt = weight(container);
        container.cobj.splice(i, 0, obj); /* put the object back */
    }
    return owt - nwt;
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
        await You_cant(`pick ${ysimple_name(obj)} up.`);
        return 0;
    } else if (obj.oartifact && !(await touch_artifact(obj, game.youmonst))) {
        return 0;
    } else if (obj.otyp === CORPSE) {
        if (await fatal_corpse_mistake(obj, telekinesis)
            || await rider_corpse_revival(obj, telekinesis))
            return -1;
    } else if (obj.otyp === SCR_SCARE_MONSTER) {
        /* process a count before altering/deleting scrolls;
           tricky because being unable to lift full stack imposes an
           implicit count; unliftable ones should be treated as if
           the count excluded them so that they don't change state */
        const wts = { before: 0, after: 0 };
        if ((count = await carry_count(obj, null,
                                       count ? count : obj.quan,
                                       false, wts)) < 1)
            return -1; /* couldn't even pick up 1, so effectively untouched */
        /* all current callers handle a new object sanely when traversing
           a list; other half of a split will be left as-is and whatever
           already follows 'obj' will still be processed next */
        if (count > 0 && count < obj.quan)
            obj = splitobj(obj, count);

        if (obj.blessed) {
            unbless(obj);
        } else if (!obj.spe && !obj.cursed) {
            obj.spe = 1;
        } else {
            await pline_The(`scroll${plur(obj.quan)} ${otense(obj, "turn")} to dust as you ${
                telekinesis ? "raise" : "pick"} ${(obj.quan === 1) ? "it" : "them"} up.`);
            await trycall(obj);
            await useupf(obj, obj.quan);
            return 1; /* tried to pick something up and failed, but
                         don't want to terminate pickup loop yet   */
        }
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
        await fix_ghostly_obj(obj);
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

    /* for shop items, addinv() needs to be after addtobill() (so that
       object merger can take otmp->unpaid into account) but before
       remote_robbery() (which calls rob_shop() which calls setpaid()
       after moving costs of unpaid items to shop debt; setpaid()
       calls clear_unpaid() for lots of object chains, but 'otmp' isn't
       on any of those between obj_extract_self() and addinv(); for
       3.6.0, 'otmp' remained flagged as an unpaid item in inventory
       and triggered impossible() every time inventory was examined) */
    let rob = robshop;
    let fakeshop = '';
    if (rob) {
        /* addtobill cares about your location rather than the object's;
           usually they'll be the same, but not when using telekinesis
           (if ever implemented) or a grappling hook */
        const saveushops = u.ushops;
        fakeshop = in_rooms(ox, oy, SHOPBASE).slice(0, 1);
        u.ushops = fakeshop;
        /* sets obj->unpaid if necessary */
        await addtobill(otmp, true, false, false);
        u.ushops = saveushops;
        rob = otmp.unpaid && !(u.ushops || '').includes(fakeshop || '\0');
    }

    const result = await addinv(otmp);
    /* if you're taking a shop item from outside the shop, make shk notice */
    if (rob)
        throw new Error('pick_obj(): remote_burglary() not ported yet');

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
const st_gloves = 0x1, st_corpse = 0x2, st_petrifies = 0x4, st_resists = 0x8;
export const st_all = (st_gloves | st_corpse | st_petrifies | st_resists);

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
async function fatal_corpse_mistake(obj, remotely) {
    if (u_safe_from_fatal_corpse(obj, st_all) || remotely)
        return false;

    if (poly_when_stoned(game.youmonst.data) && await polymon(PM_STONE_GOLEM)) {
        await tty_display_nhwindow(game.WIN_MESSAGE, false); /* --More-- */
        return false;
    }

    await pline(`Touching ${corpse_xname(obj, null, CXN_SINGULAR | CXN_ARTICLE)
        } is a fatal mistake.`);
    await instapetrify(killer_xname(obj));
    return true;
}

// C ref: pickup.c rider_corpse_revival()
/* attempting to manipulate a Rider's corpse triggers its revival */
async function rider_corpse_revival(obj, remotely) {
    if (!obj || obj.otyp !== CORPSE || !is_rider(mons[obj.corpsenm]))
        return false;

    await pline(`At your ${remotely ? "attempted acquisition" : "touch"}, the corpse suddenly moves...`);
    await revive_corpse(obj);
    await exercise(A_WIS, false);
    return true;
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
            await You(`${stagger(game.youmonst.data, "stagger")} under your heavy load.  Movement is very hard.`);
            break;
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
            await You(`${stagger(game.youmonst.data, "stagger")} under your load.  Movement is still very hard.`);
            break;
        }
        game.disp_botl = true;
    }

    game.oldcap = newcap;
    return newcap;
}

/* C ref: display.h level.objects[x][y] -- the pile at <x,y>, top first */
function objects_at(x, y) {
    return level_objects_at(x, y);
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

// C ref: pickup.c tip_ok()
/* getobj callback for #tip */
function tip_ok(obj) {
    if (!obj || obj.oclass === COIN_CLASS)
        return GETOBJ_EXCLUDE;

    if (Is_container(obj)) {
        return GETOBJ_SUGGEST;
    }

    /* include horn of plenty if sufficiently discovered */
    if (obj.otyp === HORN_OF_PLENTY && obj.dknown
        && objects[obj.otyp].oc_name_known)
        return GETOBJ_SUGGEST;

    /* allow trying anything else in inventory */
    return GETOBJ_DOWNPLAY;
}

// C ref: pickup.c dotip()
/* #tip command -- empty container contents onto floor */
export async function dotip() {
    const u = game.u;
    let cobj;
    let boxes;
    let c;
    const cc = { x: 0, y: 0 };

    /*
     * Doesn't require free hands;
     * limbs are needed to tip floor containers.
     */

    /* at present, can only tip things at current spot, not adjacent ones */
    cc.x = u.ux, cc.y = u.uy;

    /* check floor container(s) first; at most one will be accessed */
    boxes = container_at(cc.x, cc.y, true);
    /* this is iffy for menustyle:traditional; 'm' prefix is ambiguous
       for it: skip floor vs handle multiple containers via menu */
    if (boxes > 0
        && (!game.iflags.menu_requested
            || (game.flags.menu_style === MENU_TRADITIONAL && boxes > 1))) {
        const buf = `You can't tip ${!game.flags.verbose ? "a container"
                                     : (boxes > 1) ? "one" : "it"} while carrying so much.`;
        if (!(await check_capacity(buf)) && (await able_to_loot(cc.x, cc.y, false))) {
            if (boxes > 1) {
                throw new Error('dotip(): choose_tip_container_menu() not ported yet');
            } else {
                for (cobj of objects_at(cc.x, cc.y)) {
                    if (!Is_container(cobj))
                        continue;
                    c = await tty_yn_function(
                        safe_qbuf("There is ", " here, tip it?", cobj,
                                  doname, "container"), "ynq", 'q'); /* ynq() */
                    if (typeof c === 'number')
                        c = String.fromCharCode(c);
                    if (c === 'q')
                        return ECMD_OK;
                    if (c === 'n')
                        continue;
                    throw new Error('dotip(): tipcontainer() not ported yet');
                }
            }
        }
    }

    /* either no floor container(s) or 'm' prefix was used to ignore such
       or couldn't tip one or didn't tip any */
    cobj = await getobj("tip", tip_ok, GETOBJ_PROMPT);
    if (!cobj)
        return ECMD_CANCEL;

    throw new Error('dotip(): tipping a carried object not ported yet');
}

// C ref: pickup.c able_to_loot()
async function able_to_loot(x, y, looting) { /* loot vs tip */
    const verb = looting ? "loot" : "tip";
    const t = t_at(x, y);

    if (!can_reach_floor(!!(t && is_pit(t.ttyp)))) {
        if (game.u.usteed && P_SKILL(P_RIDING) < P_BASIC)
            throw new Error('able_to_loot(): rider_cant_reach() not ported yet');
        else
            await cant_reach_floor(x, y, false, true, false);
        return false;
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

// C ref: pickup.c do_loot_cont()
/* returns the time used; C's *cobjp is cleared there when the container
   got destroyed, which only the caller's loop would look at */
async function do_loot_cont(cobj,
                            cindex, /* index of this container (1..N)... */
                            ccount) { /* ...number of them (N) */
    if (!cobj)
        return ECMD_OK;
    if (cobj.olocked) {
        let res = ECMD_OK;

        if (cobj.lknown)
            await pline(`${The(xname(cobj))} is locked.`);
        else
            await pline(`Hmmm, ${the(xname(cobj))} turns out to be locked.`);
        cobj.lknown = 1;

        const autounlock = game.flags.autounlock ?? AUTOUNLOCK_APPLY_KEY;
        if (autounlock) {
            let unlocktool = null;
            const ox = cobj.ox, oy = cobj.oy;

            game.u.dz = 0; /* might be non-zero from previous command since
                            * #loot isn't a move command; pick_lock() cares */
            /* if both the untrap and apply_key bits are set, untrap
               attempt will be performed first but we need to set up
               unlocktool in case "check for trap?" is declined */
            if (((autounlock & AUTOUNLOCK_APPLY_KEY) !== 0
                 && (unlocktool = autokey(true)) !== null)
                || (autounlock & AUTOUNLOCK_UNTRAP) !== 0) {
                /* pass ox and oy to avoid direction prompt */
                if (await pick_lock(unlocktool, ox, oy, cobj))
                    res = ECMD_TIME;
                /* attempting to untrap or unlock might trigger a trap
                   which destroys 'cobj'; inform caller if that happens */
                return res;
            }
            if ((autounlock & AUTOUNLOCK_FORCE) !== 0
                && res !== ECMD_TIME
                && ccount === 1 && u_have_forceable_weapon()) {
                /* single container, and we could #force it open... */
                /* note: doforce asks for confirmation */
                throw new Error('do_loot_cont(): cmdq_add_ec(doforce) not ported yet');
            }
        }
        return res;
    }
    cobj.lknown = 1; /* floor container, so no need for update_inventory() */

    if (cobj.otyp === BAG_OF_TRICKS) {
        let tmp;

        await You(`carefully open ${the(xname(cobj))}...`);
        await pline("It develops a huge set of teeth and bites you!");
        tmp = rnd(10);
        await losehp(Maybe_Half_Phys(tmp), "carnivorous bag", KILLED_BY_AN);
        makeknown(BAG_OF_TRICKS);
        game.abort_looting = true;
        return ECMD_TIME;
    }
    return await use_container(cobj, false, (cindex < ccount));
}

// C ref: pickup.c doloot() -- the #loot command
export async function doloot() {
    let res;

    game.loot_reset_justpicked = true;
    res = await doloot_core();
    game.loot_reset_justpicked = false;
    return res;
}

// C ref: pickup.c reverse_loot()
/* called when attempting to #loot while confused */
async function reverse_loot() {
    let goldob = null, coffers, otmp;
    let mon;
    let contribution;
    let n;
    const x = game.u.ux, y = game.u.uy;

    if (!rn2(3)) {
        /* n objects: 1/(n+1) chance per object, 1/(n+1) to fall off end */
        for (n = inv_cnt(true), otmp = game.invent; otmp;
             --n, otmp = otmp.nobj)
            if (!rn2(n + 1)) {
                await prinv("You find old loot:", otmp, 0);
                return true;
            }
        return false;
    }

    /* find a money object to mess with */
    for (goldob = game.invent; goldob; goldob = goldob.nobj)
        if (goldob.oclass === COIN_CLASS) {
            contribution = Math.trunc((rnd(5) * goldob.quan + 4) / 5);
            if (contribution < goldob.quan)
                goldob = splitobj(goldob, contribution);
            break;
        }
    if (!goldob)
        return false;

    /* gold might be quivered; dropping would un-wear it, but freeinv()
       expects caller to do that; do so now */
    await remove_worn_item(goldob, false);

    if (!IS_THRONE(game.level.at(x, y).typ)) {
        await dropx(goldob);
        /* the dropped gold might have fallen to lower level */
        if (g_at(x, y))
            await pline("Ok, now there is loot here.");
    } else {
        /* find original coffers chest if present, otherwise use nearest */
        otmp = null;
        coffers = null;
        for (const c of game.level.objects || []) {
            if (c.where !== 'OBJ_FLOOR')
                continue;
            if (c.otyp === CHEST) {
                if (c.spe === 2) {
                    coffers = c;
                    break; /* a throne room chest */
                }
                if (!otmp || (distu(c.ox, c.oy)
                              < distu(otmp.ox, otmp.oy)))
                    otmp = c; /* remember closest ordinary chest */
            }
        }
        if (!coffers)
            coffers = otmp;

        if (coffers) {
            /* SetVoice((struct monst *) 0, 0, 80, 0): no voice interface */
            await verbalize("Thank you for your contribution to reduce the debt.");
            freeinv(goldob);
            add_to_container(coffers, goldob);
            coffers.owt = weight(coffers);
            coffers.cknown = 0;
            if (!coffers.olocked) {
                const boxdummy = { otyp: SPE_WIZARD_LOCK };
                await boxlock(coffers, boxdummy);
            }
        } else if (game.level.at(x, y).flags !== T_LOOTED
                   && (mon = makemon(courtmon(), x, y, NO_MM_FLAGS)) != null) {
            freeinv(goldob);
            add_to_minv(mon, goldob);
            await pline("The exchequer accepts your contribution.");
            if (!rn2(10))
                game.level.at(x, y).flags = T_LOOTED;
        } else {
            await You(`drop ${doname(goldob)}.`);
            await dropx(goldob);
        }
    }
    return true;
}

// C ref: pickup.c doloot_core() -- loot a container on the floor or loot
// saddle from mon
async function doloot_core() {
    let c = -1;
    let timepassed = 0;
    const cc = { x: 0, y: 0 };
    let underfoot = true;
    const dont_find_anything = "don't find anything";
    let mtmp;
    let prev_inquiry = 0;
    let prev_loot = false;
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
        if (rn2(6) && await reverse_loot())
            return ECMD_TIME;
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

                if (pk_Blind() && !game.uarmg) {
                    /* if blind and without gloves, attempting to #loot at the
                       location of a cockatrice corpse is fatal before asking
                       whether to manipulate any containers */
                    for (const nobj of objects_at(cc.x, cc.y))
                        if (nobj.otyp === CORPSE
                            && will_feel_cockatrice(nobj, false)) {
                            await feel_cockatrice(nobj, false);
                            /* if life-saved (or poly'd into stone golem),
                               terminate attempt to loot */
                            return ECMD_TIME;
                        }
                }

                if (num_conts > 1) {
                    /* use a menu to loot many containers */
                    let n;
                    const clr = NO_COLOR;

                    const win = tty_create_nhwindow(NHW_MENU);
                    tty_start_menu(win, MENU_BEHAVE_STANDARD);

                    for (const cobj of objects_at(cc.x, cc.y))
                        if (Is_container(cobj))
                            tty_add_menu(win, null, cobj, 0, 0, ATR_NONE, clr,
                                         doname(cobj), MENU_ITEMFLAGS_NONE);
                    tty_end_menu(win, "Loot which containers?");
                    const res = await tty_select_menu(win, PICK_ANY);
                    n = res.n;
                    tty_destroy_nhwindow(win);

                    if (n > 0) {
                        for (let i = 1; i <= n; i++) {
                            const cobj = res.selected[i - 1].item;
                            timepassed |= await do_loot_cont(cobj, i, n);
                            if (game.abort_looting) {
                                /* chest trap or magic bag explosion or <esc> */
                                return (timepassed ? ECMD_TIME : ECMD_OK);
                            }
                        }
                    }
                    if (n !== 0)
                        c = 'y';
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
            let looted_mon = false;
            if (!(await get_adjacent_loc("Loot in what direction?",
                                         "Invalid loot location",
                                         game.u.ux, game.u.uy, cc)))
                return ECMD_OK;
            underfoot = (cc.x === game.u.ux && cc.y === game.u.uy);
            if (underfoot && container_at(cc.x, cc.y, false))
                continue; /* goto lootcont */
            if (game.u.dz < 0) {
                await You(`${dont_find_anything} to loot on the ${ceiling(cc.x, cc.y)}.`);
                return ECMD_TIME;
            }
            mtmp = m_at(cc.x, cc.y);
            if (mtmp) {
                const info = { passed_info: prev_inquiry, prev_loot };
                timepassed = await loot_mon(mtmp, info, info);
                prev_inquiry = info.passed_info;
                prev_loot = info.prev_loot;
                if (timepassed)
                    looted_mon = true;
            }
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

// C ref: pickup.c loot_mon() -- returns amount of time passed;
// 'passed_info' and 'prev_loot' are { passed_info } / { prev_loot } holders
// (C's int *passed_info, boolean *prev_loot), either may be null
export async function loot_mon(mtmp, passed_info, prev_loot) {
    let c = -1;
    let timepassed = 0;
    let otmp;
    const u = game.u;

    /* 3.3.1 introduced the ability to remove saddle from a steed.
     *  *passed_info is set to TRUE if a loot query was given.
     *  *prev_loot is set to TRUE if something was actually acquired in here.
     */
    if (mtmp && mtmp !== u.usteed && (otmp = which_armor(mtmp, W_SADDLE))) {
        if (passed_info)
            passed_info.passed_info = 1;
        const qbuf = `Do you want to remove the saddle from ${
            x_monnam(mtmp, ARTICLE_THE, null, SUPPRESS_SADDLE, false)}?`;
        if ((c = await tty_yn_function(qbuf, "ynq", 'n')) === 'y') {
            if ((game.youmonst.data.mflags1 & M1_NOLIMBS) === M1_NOLIMBS) {
                await You_cant("do that without limbs."); /* not body_part(HAND) */
                return 0;
            }
            if (otmp.cursed) {
                await You(`can't.  The saddle seems to be stuck to ${
                    x_monnam(mtmp, ARTICLE_THE, null, SUPPRESS_SADDLE, false)}.`);
                /* the attempt costs you time */
                return 1;
            }
            await extract_from_minvent(mtmp, otmp, true, false);
            if (game.flags.verbose ?? true)
                await You(`take ${thesimpleoname(otmp)} off of ${mon_nam(mtmp)}.`);
            otmp = await hold_another_object(otmp, "You drop %s!", doname(otmp),
                                             null);
            timepassed = rnd(3);
            if (prev_loot)
                prev_loot.prev_loot = true;
        } else if (c === 'q') {
            return 0;
        }
    }
    /* 3.4.0 introduced ability to pick things up from swallower's stomach */
    if (u.uswallow) {
        const count = passed_info ? passed_info.passed_info : 0;

        timepassed = await pickup(count);
    }
    return timepassed;
}

/* C ref: pickup.c Icebox */
function Icebox() { return game.current_container.otyp === ICE_BOX; }
/* C ref: decl.c something */
const something = "something";

// C ref: pickup.c mbag_explodes()
/*
 * Decide whether an object being placed into a magic bag will cause
 * it to explode.  If the object is a bag itself, check recursively.
 */
function mbag_explodes(obj, depthin) {
    /* these won't cause an explosion when they're empty */
    if ((obj.otyp === WAN_CANCELLATION || obj.otyp === BAG_OF_TRICKS)
        && obj.spe <= 0)
        return false;

    /* odds: 1/1, 2/2, 3/4, 4/8, 5/16, 6/32, 7/64, 8/128, 9/128, 10/128,... */
    if ((Is_mbag(obj) || obj.otyp === WAN_CANCELLATION)
        && (rn2(1 << (depthin > 7 ? 7 : depthin)) <= depthin))
        return true;
    else if (Has_contents(obj)) {
        for (const otmp of obj.cobj)
            if (mbag_explodes(otmp, depthin + 1))
                return true;
    }
    return false;
}

// C ref: pickup.c is_boh_item_gone()
function is_boh_item_gone() {
    return !rn2(13);
}

// C ref: pickup.c boh_loss()
async function boh_loss(container, held) {
    /* sometimes toss objects if a cursed magic bag */
    if (Is_mbag(container) && container.cursed && Has_contents(container)) {
        let loss = 0;

        for (const curr of container.cobj.slice()) {
            if (is_boh_item_gone()) {
                obj_extract_self(curr);
                loss += await mbag_item_gone(held, curr, false);
            }
        }
        return loss;
    }
    return 0;
}

// C ref: pickup.c mbag_item_gone()
/* an object inside a cursed bag of holding is being destroyed */
async function mbag_item_gone(held, item, silent) {
    let shkp;
    let loss = 0;

    if (!silent) {
        if (item.dknown)
            await pline(`${Doname2(item)} ${otense(item, "have")} vanished!`);
        else
            await You(`${pk_Blind() ? "notice" : "see"} ${doname(item)} disappear!`);
    }

    if (game.u.ushops && game.u.ushops.length
        && (shkp = shop_keeper(game.u.ushops.charCodeAt(0))) != null) {
        if (held ? !!item.unpaid : costly_spot(game.u.ux, game.u.uy))
            loss = await stolen_value(item, game.u.ux, game.u.uy,
                                      !!shkp.mpeaceful, true);
    }
    obfree(item, null);
    return loss;
}

/* C ref: objnam.c Doname2() */
function Doname2(obj) {
    const s = doname(obj);
    return s.charAt(0).toUpperCase() + s.slice(1);
}
/* C ref: objnam.c Ysimple_name2() */
function Ysimple_name2(obj) {
    const s = ysimple_name(obj);
    return s.charAt(0).toUpperCase() + s.slice(1);
}

// C ref: shk.c sellobj_state()
export function sellobj_state(deliberate) {
    /* If we're deliberately dropping something, there's no automatic
       response to the shopkeeper's "want to sell" query; however, if we
       accidentally drop anything, the shk will buy it/them without asking.
       This retains the old pre-query risk that slippery fingers while in
       shops entailed:  you drop it, you've lost it.
     */
    game.sell_response = (deliberate !== SELL_NORMAL) ? '\0' : 'a';
    game.sell_how = deliberate;
    game.auto_credit = false;
}

// C ref: pickup.c in_container()
/* Returns: -1 to stop, 1 item was inserted, 0 item was not inserted. */
async function in_container(obj) {
    const u = game.u;
    const cont = game.current_container;
    const floor_container = cont ? !carried(cont) : false;
    let was_unpaid = false;
    let buf;

    if (!cont) {
        impossible("<in> no current_container?");
        return 0;
    } else if (obj === game.uball || obj === game.uchain) {
        await You("must be kidding.");
        return 0;
    } else if (obj === cont) {
        await pline("That would be an interesting topological exercise.");
        return 0;
    } else if ((obj.owornmask || 0) & (W_ARMOR | W_ACCESSORY)) {
        await Norep(`You cannot ${Icebox() ? "refrigerate" : "stash"} ${something} you are wearing.`);
        return 0;
    } else if ((obj.otyp === LOADSTONE) && obj.cursed) {
        obj.bknown = 1; /* set_bknown(obj, 1) */
        await pline_The(`stone${(obj.quan !== 1) ? "s" : ""} won't leave your person.`);
        return 0;
    } else if (obj.otyp === AMULET_OF_YENDOR
               || obj.otyp === CANDELABRUM_OF_INVOCATION
               || obj.otyp === BELL_OF_OPENING
               || obj.otyp === SPE_BOOK_OF_THE_DEAD) {
        /* Prohibit Amulets in containers; if you allow it, monsters can't
         * steal them.  It also becomes a pain to check to see if someone
         * has the Amulet.  Ditto for the Candelabrum, the Bell and the Book.
         */
        await pline(`${The(xname(obj))} cannot be confined in such trappings.`);
        return 0;
    } else if (obj.otyp === LEASH && obj.leashmon) {
        await pline(`${Tobjnam(obj, "are")} attached to your pet.`);
        return 0;
    } else if (obj === game.uwep) {
        if (welded(obj)) {
            await weldmsg(obj);
            return 0;
        }
        setuwep(null);
        /* This uwep check is obsolete.  It dates to 3.0 and earlier when
         * unwielding Firebrand would be fatal in hell if hero had no other
         * fire resistance.  Life-saving would force it to be re-wielded.
         */
        if (game.uwep)
            return 0; /* unwielded, died, rewielded */
    } else if (obj === game.uswapwep) {
        setuswapwep(null);
    } else if (obj === game.uquiver) {
        setuqwep(null);
    }

    if (await fatal_corpse_mistake(obj, false))
        return -1;

    /* boxes, boulders, and big statues can't fit into any container */
    if (obj.otyp === ICE_BOX || Is_box(obj) || obj.otyp === BOULDER
        || (obj.otyp === STATUE && mons[obj.corpsenm].msize >= MZ_LARGE)) {
        /* consumes multiple obufs but not enough to overwrite the result */
        buf = the(xname(obj));
        await You(`cannot fit ${buf} into ${the(xname(cont))}.`);
        return 0;
    }

    freeinv(obj);

    if (obj_is_burning(obj)) /* this used to be part of freeinv() */
        /* (void) */ await snuff_lit(obj);

    if (floor_container && costly_spot(u.ux, u.uy)) {
        /* defer gold until after put-in message */
        if (obj.oclass !== COIN_CLASS) {
            /* sellobj() will take an unpaid item off the shop bill */
            was_unpaid = !!obj.unpaid;
            if (game.sellobj_first) {
                /* don't sell when putting the item into your own container,
                   but handle billing correctly */
                sellobj_state(cont.no_charge ? SELL_DONTSELL : SELL_DELIBERATE);
                game.sellobj_first = false;
            }
            await sellobj(obj, u.ux, u.uy);
        }
    }
    if (Icebox() && !age_is_relative(obj)) {
        obj.age = (game.moves || 0) - obj.age; /* actual age */
        /* stop any corpse timeouts when frozen */
        if (obj.otyp === CORPSE) {
            if (obj.timed) {
                stop_timer(ROT_CORPSE, obj_to_any(obj));
                stop_timer(REVIVE_MON, obj_to_any(obj));
            }
            /* if this is the corpse of a cancelled ice troll, uncancel it */
            if (obj.corpsenm === PM_ICE_TROLL && obj.oextra?.omonst)
                obj.oextra.omonst.mcan = 0;
        } else if (obj.globby && obj.timed) {
            stop_timer(SHRINK_GLOB, obj_to_any(obj));
        }
    } else if (Is_mbag(cont) && mbag_explodes(obj, 0)) {
        throw new Error('in_container(): magic bag explosion (do_boh_explosion()) not ported yet');
    }

    if (game.current_container) {
        buf = the(xname(cont));
        await You(`put ${doname(obj)} into ${buf}.`);

        /* gold in container always needs to be added to credit */
        if (floor_container && obj.oclass === COIN_CLASS)
            await sellobj(obj, cont.ox, cont.oy);
        add_to_container(cont, obj);
        cont.owt = weight(cont);
    }
    /* gold needs this, and freeinv() many lines above may cause
     * the encumbrance to disappear from the status, so just always
     * update status immediately.
     */
    bot();
    void was_unpaid;
    return (game.current_container ? 1 : -1);
}

// C ref: pickup.c ck_bag()
/* askchain() filter used by in_container();
 * returns True if the container is intact and 'obj' isn't it, False if
 * container is gone (magic bag explosion) or 'obj' is the container itself;
 * also used by getobj() when picking a single item to stash
 */
export function ck_bag(obj) {
    return (game.current_container && obj !== game.current_container);
}

// C ref: pickup.c out_container()
/* Returns: -1 to stop, 1 item was removed, 0 item was not removed. */
async function out_container(obj) {
    let otmp;
    let res;
    let count;
    const is_gold = (obj.oclass === COIN_CLASS);
    const cont = game.current_container;

    if (!cont) {
        impossible("<out> no current_container?");
        return -1;
    } else if (is_gold) {
        obj.owt = weight(obj);
    }

    if (obj.oartifact && !(await touch_artifact(obj, game.youmonst)))
        return 0;

    if (await fatal_corpse_mistake(obj, false))
        return -1;

    count = obj.quan;
    const cnt_p = { val: count };
    if ((res = await lift_object(obj, cont, cnt_p, false)) <= 0)
        return res;
    count = cnt_p.val;

    if (obj.quan !== count && obj.otyp !== LOADSTONE)
        obj = splitobj(obj, count);

    /* Remove the object from the list. */
    obj_extract_self(obj);
    cont.owt = weight(cont);

    if (Icebox())
        removed_from_icebox(obj);

    if (!obj.unpaid && !carried(cont)
        && costly_spot(cont.ox, cont.oy)) {
        obj.ox = cont.ox;
        obj.oy = cont.oy;
        await addtobill(obj, false, false, false);
    }
    if (is_pick(obj) && obj.unpaid)
        throw new Error('out_container(): pick_pick() not ported yet');

    otmp = await addinv(obj);
    await pickup_prinv(otmp, count, "removing");

    if (is_gold) {
        bot(); /* update character's gold piece count immediately */
    }
    return 1;
}

// C ref: pickup.c removed_from_icebox()
/* taking a corpse out of an ice box needs a couple of adjustments */
export function removed_from_icebox(obj) {
    if (!age_is_relative(obj)) {
        obj.age = (game.moves || 0) - obj.age; /* actual age */
        if (obj.otyp === CORPSE) {
            const m = obj.oextra?.omonst || null; /* get_mtraits(obj, FALSE) */
            const iceT = m ? (m.data === mons[PM_ICE_TROLL])
                           : (obj.corpsenm === PM_ICE_TROLL);

            /* start a revive timer if this corpse is for an ice troll,
               otherwise start a rot-away timer (even for other trolls) */
            obj.norevive = iceT ? 0 : 1;
            start_corpse_timeout(obj);
        } else if (obj.globby) {
            /* non-frozen globs gradually shrink away to nothing */
            start_glob_timeout(obj, 0);
        }
    }
}

// C ref: pickup.c observe_quantum_cat()
/* used for #loot/apply, #tip, and final disclosure */
export async function observe_quantum_cat(box, makecat, givemsg) {
    const sc = "Schroedinger's Cat";
    let deadcat;
    let livecat = null;
    const itsalive = !rn2(2);

    const loc = get_obj_location(box, 0);
    if (loc)
        box.ox = loc[0], box.oy = loc[1]; /* in case it's being carried */

    /* SchroedingersBox already has a cat corpse in it */
    deadcat = (box.cobj && box.cobj.length) ? box.cobj[0] : null;
    if (itsalive) {
        if (makecat)
            livecat = await makemon(mons[PM_HOUSECAT], box.ox, box.oy,
                                    NO_MINVENT | MM_ADJACENTOK | MM_NOMSG);
        if (livecat) {
            livecat.mpeaceful = 1;
            set_malign(livecat);
            if (givemsg) {
                if (!canspotmon(livecat))
                    await You(`think ${something} brushed your ${body_part(FOOT)}.`);
                else
                    await pline(`${Monnam(livecat)} inside the box is still alive!`);
            }
            christen_monst(livecat, sc);
            if (deadcat) {
                obj_extract_self(deadcat);
                obfree(deadcat, null), deadcat = null;
            }
            box.owt = weight(box);
            box.spe = 0;

            if (!game.context.mon_moving) {
                /* give experience points for releasing live cat; slightly
                   different amount from what is given for "killing" it */
                more_experienced(10, 20); /* 10:current exp; 20:score bonus */
                await newexplevel();
            }
        }
    } else {
        box.spe = 0; /* now an ordinary box (with a cat corpse inside) */
        if (givemsg)
            await pline_The(`${u_prop(HALLUC) ? rndmonnam(null) : "housecat"} inside the box is dead!`);
        if (deadcat) {
            /* set_corpsenm() will start the rot timer that was removed
               when makemon() created SchroedingersBox; start it from
               now rather than from when this special corpse got created */
            deadcat.age = game.moves || 0;
            set_corpsenm(deadcat, PM_HOUSECAT);
            deadcat = oname(deadcat, sc, ONAME_NO_FLAGS);

            if (!game.context.mon_moving) {
                /* give experience points for the death of the cat since
                   that has been finalized by the hero opening the box */
                more_experienced(20, 10); /* 20:current exp; 10:score bonus */
                await newexplevel();
            }
        }
    }
}

// C ref: pickup.c container_gone()
/* used by askchain() to check for magic bag explosion */
export function container_gone(fn) {
    /* result is only meaningful while use_container() is executing */
    return ((fn === in_container || fn === out_container)
            && !game.current_container);
}

// C ref: pickup.c explain_container_prompt()
async function explain_container_prompt(more_containers) {
    const explaintext = [
        "Container actions:",
        "",
        " : -- Look: examine contents",
        " o -- Out: take things out",
        " i -- In: put things in",
        " b -- Both: first take things out, then put things in",
        " r -- Reversed: put things in, then take things out",
        " s -- Stash: put one item in", "",
        " n -- Next: loot next selected container",
        " q -- Quit: finished",
        " ? -- Help: display this text.",
        ""
    ];

    /* "Do what with <container>? [:oibrsq or ?] (q)" */
    const win = tty_create_nhwindow(NHW_TEXT);
    for (const txt of explaintext) {
        if (!more_containers && txt.startsWith(" n "))
            continue;
        await tty_putstr(win, 0, txt);
    }
    await tty_display_nhwindow(win, false);
    tty_destroy_nhwindow(win);
}

// C ref: pickup.c u_handsy()
export async function u_handsy() {
    if (game.youmonst.data.mflags1 & M1_NOHANDS) {
        await You("have no hands!"); /* not `body_part(HAND)' */
        return false;
    } else if (!freehand()) {
        await You(`have no free ${body_part(HAND)}.`);
        return false;
    }
    return true;
}

// C ref: pickup.c stash_ok()
/* getobj callback for object to be stashed into a container */
function stash_ok(obj) {
    if (!obj)
        return GETOBJ_EXCLUDE;

    /* downplay the container being stashed into */
    if (!ck_bag(obj))
        return GETOBJ_EXCLUDE_SELECTABLE;
    /* Possible extension: downplay things too big to fit into containers (in
     * which case extract in_container()'s logic.) */

    return GETOBJ_SUGGEST;
}

// C ref: pickup.c use_container()
/* C's 'objp' is passed by value here; the result is the time used */
export async function use_container(obj,
                                    held,
                                    more_containers) { /* True iff #loot multiple and this isn't last */
    let otmp;
    let quantum_cat, cursed_mbag, loot_out, loot_in, loot_in_first,
        stash_one, inokay, outokay, outmaybe;
    let c, emptymsg = '', qbuf;
    let used = ECMD_OK;
    let loss;

    game.abort_looting = false;
    game.sellobj_first = true; /* in_container() should call sellobj_state() */

    if (!(await u_handsy()))
        return ECMD_OK;

    if (!obj.lknown) { /* do this in advance */
        obj.lknown = 1;
        /* if (held) update_inventory(); */
    }
    if (obj.olocked) {
        await pline(`${Tobjnam(obj, "are")} locked.`);
        if (held)
            await You("must put it down to unlock.");
        return ECMD_OK;
    } else if (obj.otrapped) {
        if (held)
            await You(`open ${the(xname(obj))}...`);
        await chest_trap(obj, HAND, false);
        /* even if the trap fails, you've used up this turn */
        if ((game.multi || 0) >= 0) { /* in case we didn't become paralyzed */
            nomul(-1);
            game.multi_reason = "opening a container";
            game.nomovemsg = "";
        }
        game.abort_looting = true;
        return ECMD_TIME;
    }

    game.current_container = obj; /* for use by in/out_container */
    /*
     * From here on out, all early returns go through 'containerdone:'.
     */

    /* check for Schroedinger's Cat */
    quantum_cat = SchroedingersBox(game.current_container);
    if (quantum_cat) {
        await observe_quantum_cat(game.current_container, true, true);
        used = ECMD_TIME;
    }

    cursed_mbag = Is_mbag(game.current_container)
        && game.current_container.cursed
        && Has_contents(game.current_container);
    if (cursed_mbag
        && (loss = await boh_loss(game.current_container, held)) !== 0) {
        used = ECMD_TIME;
        await You(`owe ${loss} ${currency(loss)} for lost merchandise.`);
        game.current_container.owt = weight(game.current_container);
    }
    /* might put something in if carrying anything other than just the
       container itself (invent is not the container or has a next object) */
    inokay = (game.invent != null && (game.invent !== game.current_container
                                      || game.invent.nobj));
    /* might take something out if container isn't empty */
    outokay = Has_contents(game.current_container);
    if (!outokay) /* preformat the empty-container message */
        emptymsg = `${Ysimple_name2(game.current_container)} is ${
            (quantum_cat || cursed_mbag) ? "now " : ""}empty.`;

    /*
     * What-to-do prompt's list of possible actions:
     * (see the C source for the details)
     *
     * Do what with <the/your/Shk's container>? [:oibrs nq or ?] (q)
     * or
     * <The/Your/Shk's container> is empty.  Do what with it? [:irs nq or ?]
     */
    const menu_style = game.flags.menu_style ?? MENU_FULL;
    for (;;) { /* repeats iff '?' or ':' gets chosen */
        outmaybe = (outokay || !game.current_container.cknown);
        if (!outmaybe)
            qbuf = safe_qbuf(null, " is empty.  Do what with it?",
                             game.current_container, Yname2, "This");
        else
            qbuf = safe_qbuf("Do what with ", "?", game.current_container,
                             yname, "it");
        /* ask player about what to do with this container */
        if (menu_style === MENU_PARTIAL || menu_style === MENU_FULL) {
            if (!inokay && !outmaybe) {
                /* nothing to take out, nothing to put in;
                   trying to do both will yield proper feedback */
                c = 'b';
            } else {
                c = await in_or_out_menu(qbuf, game.current_container,
                                         outmaybe, inokay,
                                         (used !== ECMD_OK),
                                         more_containers);
            }
        } else { /* TRADITIONAL or COMBINATION */
            let xbuf = ''; /* list of extra acceptable responses */
            let pbuf = ":";                  /* look inside */
            if (outmaybe) pbuf += "o"; else xbuf += "o"; /* take out */
            if (inokay) pbuf += "i"; else xbuf += "i";   /* put in */
            if (outmaybe) pbuf += "b"; else xbuf += "b"; /* both */
            if (inokay) pbuf += "rs"; else xbuf += "rs"; /* reversed, stash */
            pbuf += " ";                     /* separator */
            if (more_containers) pbuf += "n"; else xbuf += "n"; /* next container */
            pbuf += "q";                     /* quit */
            if (game.iflags?.cmdassist ?? true)
                /* this unintentionally allows user to answer with 'o' or
                   'r'; fortunately, those are already valid choices here */
                pbuf += " or ?"; /* help */
            else
                xbuf += "?";
            if (xbuf)
                pbuf += "\x1b" + xbuf;
            c = await tty_yn_function(qbuf, pbuf, more_containers ? 'n' : 'q');
            if (typeof c === 'number')
                c = String.fromCharCode(c);
        } /* PARTIAL|FULL vs other modes */

        if (c === '?') {
            await explain_container_prompt(more_containers);
        } else if (c === ':') { /* note: will set obj->cknown */
            if (!game.current_container.cknown)
                used = ECMD_TIME; /* gaining info */
            await container_contents(game.current_container, false, false, true);
        } else
            break;
    } /* loop until something other than '?' or ':' is picked */

    if (c === 'q')
        game.abort_looting = true;
    if (c !== 'n' && c !== 'q') { /* [not strictly needed; falling thru works] */
        loot_out = (c === 'o' || c === 'b' || c === 'r');
        loot_in = (c === 'i' || c === 'b' || c === 'r');
        loot_in_first = (c === 'r'); /* both, reversed */
        stash_one = (c === 's');

        /* out-only or out before in */
        if (loot_out && !loot_in_first) {
            if (!Has_contents(game.current_container)) {
                await pline(emptymsg); /* <whatever> is empty. */
                if (!game.current_container.cknown)
                    used = ECMD_TIME;
                game.current_container.cknown = 1;
            } else {
                add_valid_menu_class(0); /* reset */
                if (menu_style === MENU_TRADITIONAL)
                    used |= await traditional_loot(false);
                else
                    used |= ((await menu_loot(0, false)) > 0) ? 1 : 0;
                add_valid_menu_class(0);
            }
            /* recalculate 'inokay' in case something was just taken out and
               inventory is no longer empty or no longer just the container */
            inokay = (game.invent && (game.invent !== game.current_container
                                      || game.invent.nobj));
        }

        if ((loot_in || stash_one) && !inokay) {
            await You(`don't have anything${game.invent ? " else" : ""} to ${
                stash_one ? "stash" : "put in"}.`);
            loot_in = stash_one = false;
        }

        /*
         * Gone: being nice about only selecting food if we know we are
         * putting things in an ice chest.
         */
        if (loot_in) {
            add_valid_menu_class(0); /* reset */
            if (menu_style === MENU_TRADITIONAL)
                used |= await traditional_loot(true);
            else
                used |= ((await menu_loot(0, true)) > 0) ? 1 : 0;
            add_valid_menu_class(0);
        } else if (stash_one) {
            /* put one item into container */
            if ((otmp = await getobj("stash", stash_ok,
                                     GETOBJ_PROMPT | GETOBJ_ALLOWCNT)) != null) {
                if (await in_container(otmp)) {
                    used = 1;
                } else {
                    /* couldn't put selected item into container for some
                       reason; might need to undo splitobj() */
                    unsplitobj(otmp);
                }
            }
        }
        /* putting something in might have triggered magic bag explosion */
        if (!game.current_container)
            loot_out = false;

        /* out after in */
        if (loot_out && loot_in_first) {
            if (!Has_contents(game.current_container)) {
                await pline(emptymsg); /* <whatever> is empty. */
                if (!game.current_container.cknown)
                    used = 1;
                game.current_container.cknown = 1;
            } else {
                add_valid_menu_class(0); /* reset */
                if (menu_style === MENU_TRADITIONAL)
                    used |= await traditional_loot(false);
                else
                    used |= ((await menu_loot(0, false)) > 0) ? 1 : 0;
                add_valid_menu_class(0);
            }
        }
    }

    /* containerdone: */
    if (used) {
        /* Not completely correct; if we put something in without knowing
           whatever was already inside, now we suddenly do.  That can't
           be helped unless we want to track things item by item and then
           deal with containers whose contents are "partly known". */
        if (game.current_container)
            game.current_container.cknown = 1;
        /* update_inventory(); */
    }

    sellobj_state(SELL_NORMAL); /* in case in_container() set it */
    if (game.current_container)
        game.current_container = null; /* avoid hanging on to stale pointer */
    else
        game.abort_looting = true;
    return used;
}

// C ref: pickup.c simple_look()
async function simple_look(otmp, /* list of objects */
                           here) { /* flag for type of obj list linkage */
    /* Neither of the first two cases is expected to happen, since
     * we're only called after multiple classes of objects have been
     * detected, hence multiple objects must be present.
     */
    void here; /* JS floor piles and container contents are arrays */
    const list = objchain_items_qc(otmp);
    if (!list.length) {
        throw new Error('simple_look(): impossible("simple_look(null)") not ported yet');
    } else if (list.length === 1) {
        await pline(doname(list[0]));
    } else {
        const tmpwin = tty_create_nhwindow(NHW_MENU_QC);

        await tty_putstr(tmpwin, 0, "");
        for (const o of list)
            await tty_putstr(tmpwin, 0, doname(o));
        await tty_display_nhwindow(tmpwin, true);
        await tty_destroy_nhwindow(tmpwin);
    }
}

// C ref: pickup.c query_classes() -- for menustyle:Traditional and
// menustyle:Combination; returns { ok, oclasses, one_at_a_time,
// everything, menu_on_demand } (oclasses: an array of object classes)
export async function query_classes(
    action, /* verb for what activity needs objects */
    objs, /* invent or container->cobj or level.objects[x][y] */
    here, /* True: traverse by obj->nexthere; False: by obj->nobj */
    want_menu_on_demand) { /* caller passed menu_on_demand */
    const r = { ok: false, oclasses: [], one_at_a_time: false,
                everything: false, menu_on_demand: 0 };
    let ilets, iletct, oclassct;
    let not_everything, filtered;
    let m_seen = false;

    const coc = collect_obj_classes_qc(objs, here, null);
    ilets = coc.ilets;
    const itemcount = coc.itemcount;
    iletct = ilets.length;
    if (iletct === 0)
        return r;

    if (iletct === 1) {
        r.oclasses = [def_char_to_objclass_qc(ilets[0])];
    } else { /* more than one choice available */
        /* additional choices */
        ilets += ' ';
        ilets += 'a';
        ilets += 'A';
        ilets += (objs === game.invent ? 'i' : ':');
    }
    if (itemcount && want_menu_on_demand)
        ilets += 'm';
    if (count_unpaid(objs))
        ilets += 'u';

    const t = tally_BUCX_qc(objs, here);
    if (t.bcnt)
        ilets += 'B';
    if (t.ucnt)
        ilets += 'U';
    if (t.ccnt)
        ilets += 'C';
    if (t.xcnt)
        ilets += 'X';
    if (t.jcnt)
        ilets += 'P';
    iletct = ilets.length;

    if (iletct > 1) {
        let where = null;

        for (;;) { /* ask_again: */
            r.oclasses = [];
            oclassct = 0;
            r.one_at_a_time = r.everything = false;
            not_everything = filtered = false;
            const qbuf = `What kinds of thing do you want to ${action}? [${ilets}]`;
            const inbuf = await tty_getlin_qc(qbuf);
            if (inbuf[0] === '\x1b')
                return r;

            let again = false;
            for (const sym of inbuf) {
                if (sym === ' ')
                    continue;
                else if (sym === 'A')
                    r.one_at_a_time = true;
                else if (sym === 'a')
                    r.everything = true;
                else if (sym === ':') {
                    await simple_look(objs, here); /* dumb if objs==invent */
                    /* if we just scanned the contents of a container
                       then mark it as having known contents */
                    {
                        const o0 = objchain_items_qc(objs)[0];
                        if (o0 && o0.where === 'OBJ_CONTAINED' && o0.ocontainer)
                            o0.ocontainer.cknown = 1;
                    }
                    again = true;
                    break;
                } else if (sym === 'i') {
                    await display_inventory_qc(null, true);
                    again = true;
                    break;
                } else if (sym === 'm') {
                    m_seen = true;
                } else if ("uBUCXP".includes(sym)) {
                    add_valid_menu_class(sym.charCodeAt(0)); /* 'u' or 'B','U','C','X','P' */
                    filtered = true;
                } else {
                    const oc_of_sym = def_char_to_objclass_qc(sym);
                    if (ilets.includes(sym)) {
                        add_valid_menu_class(oc_of_sym);
                        r.oclasses[oclassct++] = oc_of_sym;
                    } else {
                        if (!where)
                            where = (action === "pick up") ? "here"
                                    : (action === "take out") ? "inside" : "";
                        if (where)
                            await There(`are no ${sym}'s ${where}.`);
                        else
                            await You(`have no ${sym}'s.`);
                        not_everything = true;
                    }
                }
            } /* for p:sym in inbuf */
            if (again)
                continue; /* goto ask_again */

            if (m_seen && want_menu_on_demand) {
                r.menu_on_demand = (((r.everything || !oclassct) && !filtered)
                                    ? -2 : -3);
                return r;
            }
            if (!oclassct && (!r.everything || not_everything)) {
                /* didn't pick anything,
                   or tried to pick something that's not present */
                r.one_at_a_time = true; /* force 'A' */
                r.everything = false;   /* inhibit 'a' */
            }
            break;
        }
    }
    r.ok = true;
    return r;
}

// C ref: pickup.c traditional_loot()
/* loot current_container (take things out or put things in), by prompting */
async function traditional_loot(put_in) {
    let actionfunc, checkfunc;
    let objlist;
    let action;
    let used = ECMD_OK;

    if (put_in) {
        action = "put in";
        objlist = () => game.invent;
        actionfunc = in_container;
        checkfunc = ck_bag;
    } else {
        action = "take out";
        objlist = () => game.current_container.cobj;
        actionfunc = out_container;
        checkfunc = null;
        game.pickup_encumbrance = 0; /* used to limit verbosity */
    }

    const q = await query_classes(action, objlist(), false, true);
    if (q.ok) {
        if (await askchain_qc(objlist, (q.one_at_a_time ? null : q.oclasses),
                              q.everything, actionfunc, checkfunc, 0, action))
            used = ECMD_TIME;
    } else if (q.menu_on_demand < 0) {
        used = ((await menu_loot(q.menu_on_demand, put_in)) > 0) ? 1 : 0;
    }
    return used;
}

// C ref: pickup.c menu_loot()
/* loot current_container (take things out or put things in), using a menu */
async function menu_loot(retry, put_in) {
    let n, i, n_looted = 0;
    let all_categories = true, loot_everything = false, autopick = false;
    let buf;
    let loot_justpicked = false;
    const action = put_in ? "Put in" : "Take out";
    let otmp;
    const pick_list = [];
    let mflags, res;
    let count = 0;

    game.pickup_encumbrance = 0; /* used by out_container(); no harm in
                                  * zeroing it if about to use in_container() */
    if (retry) {
        all_categories = (retry === -2);
    } else if ((game.flags.menu_style ?? MENU_FULL) === MENU_FULL) {
        all_categories = false;
        buf = `${action} what type of objects?`;
        mflags = (ALL_TYPES | UNPAID_TYPES | BUCX_TYPES | CHOOSE_ALL
                  | JUSTPICKED);
        n = await query_category(buf,
                                 put_in ? game.invent : game.current_container.cobj,
                                 mflags, pick_list, PICK_ANY);
            /* when paranoid_confirm:A is set, 'A' by itself implies
               'A'+'a' which will be followed by a confirmation prompt;
               when that option isn't set, 'A' by itself is rejected
               by query_categorry() and result here will be n==0 */
        if (!n)
            return ECMD_OK; /* no non-autopick category filters specified */

        for (i = 0; i < n; i++) {
            if (pick_list[i].item === 0x41 /* 'A' */) {
                loot_everything = autopick = true;
            } else if (put_in && pick_list[i].item === 0x50 /* 'P' */) {
                loot_justpicked = true;
                count = Math.max(0, pick_list[i].count);
                add_valid_menu_class(pick_list[i].item);
                loot_everything = false;
            } else if (pick_list[i].item === ALL_TYPES_SELECTED) {
                all_categories = true;
            } else {
                add_valid_menu_class(pick_list[i].item);
                loot_everything = false;
            }
        }
    }

    if (autopick) {
        let inout_func; /* in_container or out_container */
        let firstobj;

        if (!put_in) {
            game.current_container.cknown = 1;
            inout_func = out_container;
            firstobj = game.current_container.cobj.slice();
        } else {
            inout_func = in_container;
            firstobj = objchain_items(game.invent);
        }
        /*
         * Note:  for put_in, current_container might be destroyed during
         * mid-traversal by a magic bag explosion.
         * Note too:  items are processed in internal list order rather
         * than menu display order ('sortpack') or 'sortloot' order;
         * for put_in that should be item->invlet order so reasonable.
         */
        for (otmp of firstobj) {
            if (!game.current_container)
                break;
            if (loot_everything || all_categories || allow_category(otmp)) {
                res = await inout_func(otmp);
                if (res < 0)
                    break;
                n_looted += res;
            }
        }
    } else if (put_in && loot_justpicked
               && count_justpicked(game.invent) === 1) {
        otmp = find_justpicked(game.invent);
        if (otmp) {
            n_looted = 1;
            if (count > 0 && count < otmp.quan) {
                otmp = splitobj(otmp, count);
            }
            await in_container(otmp);
            /* return value doesn't matter, even if container blew up */
        }
    } else {
        mflags = INVORDER_SORT | INCLUDE_VENOM;
        if (put_in && (game.flags.invlet_constant ?? true))
            mflags |= USE_INVLET;
        if (put_in && loot_justpicked)
            mflags |= JUSTPICKED;
        if (!put_in)
            game.current_container.cknown = 1;
        buf = `${action} what?`;
        const olist = [];
        n = await query_objlist(buf,
                                put_in ? objchain_items(game.invent)
                                       : game.current_container.cobj,
                                mflags, olist, PICK_ANY,
                                all_categories ? allow_all : allow_category);
        if (n) {
            n_looted = n;
            for (i = 0; i < n; i++) {
                otmp = olist[i].obj;
                count = olist[i].count;
                if (count > 0 && count < otmp.quan) {
                    otmp = splitobj(otmp, count);
                    /* special split case also handled by askchain() */
                }
                res = put_in ? await in_container(otmp) : await out_container(otmp);
                if (res <= 0) {
                    if (!game.current_container) {
                        /* otmp caused current_container to explode;
                           both are now gone */
                        otmp = null; /* and break loop */
                    } else if (otmp && otmp !== olist[i].obj) {
                        /* split occurred, merge again */
                        unsplitobj(otmp);
                    }
                    if (res < 0)
                        break;
                }
            }
        }
    }
    return n_looted ? ECMD_TIME : ECMD_OK;
}

// C ref: pickup.c in_or_out_menu()
async function in_or_out_menu(prompt, obj,
                              outokay,     /* can take out */
                              inokay,      /* can put in */
                              alreadyused, /* controls phrasing of the decline choice */
                              more_containers) {
    /* underscore is not a choice; it's used to skip element [0] */
    const lootchars = "_:oibrsnq", abc_chars = "_:abcdenq";
    let buf;
    let n;
    const menuselector = game.flags.lootabc ? abc_chars : lootchars;
    const clr = NO_COLOR;

    const win = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(win, MENU_BEHAVE_STANDARD);

    buf = `Look inside ${thesimpleoname(obj)}`;
    tty_add_menu(win, null, 1 /* ':' */, menuselector[1], 0, ATR_NONE, clr,
                 buf, MENU_ITEMFLAGS_NONE);
    if (outokay) {
        buf = `take ${something} out`;
        tty_add_menu(win, null, 2 /* 'o' */, menuselector[2], 0, ATR_NONE, clr,
                     buf, MENU_ITEMFLAGS_NONE);
    }
    if (inokay) {
        buf = `put ${something} in`;
        tty_add_menu(win, null, 3 /* 'i' */, menuselector[3], 0, ATR_NONE, clr,
                     buf, MENU_ITEMFLAGS_NONE);
    }
    if (outokay) {
        buf = `${inokay ? "both; " : ""}take out, then put in`;
        tty_add_menu(win, null, 4 /* 'b' */, menuselector[4], 0, ATR_NONE, clr,
                     buf, MENU_ITEMFLAGS_NONE);
    }
    if (inokay) {
        buf = `${outokay ? "both reversed; " : ""}put in, then take out`;
        tty_add_menu(win, null, 5 /* 'r' */, menuselector[5], 0, ATR_NONE, clr,
                     buf, MENU_ITEMFLAGS_NONE);
        buf = `stash one item into ${thesimpleoname(obj)}`;
        tty_add_menu(win, null, 6 /* 's' */, menuselector[6], 0, ATR_NONE, clr,
                     buf, MENU_ITEMFLAGS_NONE);
    }
    add_menu_str(win, "");
    if (more_containers) {
        tty_add_menu(win, null, 7 /* 'n' */, menuselector[7], 0, ATR_NONE, clr,
                     "loot next container", MENU_ITEMFLAGS_SELECTED);
    }
    buf = alreadyused ? "done" : "do nothing";
    tty_add_menu(win, null, 8 /* 'q' */, menuselector[8], 0, ATR_NONE, clr,
                 buf,
                 more_containers ? MENU_ITEMFLAGS_NONE : MENU_ITEMFLAGS_SELECTED);

    tty_end_menu(win, prompt);
    const res = await tty_select_menu(win, PICK_ONE);
    n = res.n;
    tty_destroy_nhwindow(win);
    if (n > 0) {
        let k = res.selected[0].item;

        if (n > 1 && k === (more_containers ? 7 : 8))
            k = res.selected[1].item;
        return lootchars[k]; /* :,o,i,b,r,s,n,q */
    }
    return (n === 0 && more_containers) ? 'n' : 'q'; /* next or quit */
}

/* C ref: obj.h age_is_relative() */
export function age_is_relative(otmp) {
    return (otmp.otyp === BRASS_LANTERN || otmp.otyp === OIL_LAMP
            || otmp.otyp === CANDELABRUM_OF_INVOCATION
            || otmp.otyp === TALLOW_CANDLE || otmp.otyp === WAX_CANDLE
            || otmp.otyp === POT_OIL);
}
