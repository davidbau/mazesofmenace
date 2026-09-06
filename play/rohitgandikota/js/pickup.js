// pickup.js — picking things up off the floor, and looking at what is there.
// C ref: src/pickup.c
//
// Manual and automatic floor pickup share the same carry-limit machinery.
// Rare artifact, fatal-corpse, and remote-shop branches remain
// explicit recorded gaps.

import { self_lookat } from './pager.js';
import { digests } from './mondata.js';
import { engulfing_u } from './const.js';
import { PICK_ANY } from './const.js';
import { CONTAINED_SYM } from './const.js';
import { OBJ_MINVENT, OBJ_FLOOR } from './const.js';
import { AUTOSELECT_SINGLE } from './const.js';
import { USE_INVLET } from './const.js';
import { SIGNAL_NOMENU, SIGNAL_ESCAPE } from './const.js';
import { INCLUDE_HERO } from './const.js';
import { MAY_HIT, MAY_DESTROY } from './const.js';
import { scatter } from './explode.js';
import { def_oc_syms } from './drawing_data.js';
import { game } from './gstate.js';
import { addinv, prinv, obj_extract_self, inv_order, let_to_name,
         freeinv, getobj, update_inventory, loot_classify, weight, mergable, merged, money_cnt,
         useup, useupf, obfree, stackobj, count_unpaid, count_buc, is_worn,
         tally_BUCX, askchain, display_pickinv, currency, obj_here,
         carrying, merge_choice, nxtobj, sortloot, unsortloot, will_feel_cockatrice,
         hold_another_object, feel_cockatrice, sobj_at, g_at,
         GETOBJ_ALLOWCNT, GETOBJ_DOWNPLAY, GETOBJ_EXCLUDE,
         GETOBJ_EXCLUDE_SELECTABLE, GETOBJ_PROMPT, GETOBJ_SUGGEST }
    from './invent.js';
import { observe_object, makeknown } from './o_init.js';
import { doname, xname, cxname, the, yname, singular, an, corpse_xname,
         CXN_ARTICLE, CXN_SINGULAR, otense, vtense, safe_qbuf,
         ysimple_name, Ysimple_name2, Yname2, Tobjnam, thesimpleoname,
         ansimpleoname, Doname2 } from './objnam.js';
import { Is_container, Has_contents, carried, SchroedingersBox,
         age_is_relative } from './obj.js';
import { AUTOUNLOCK_UNTRAP, AUTOUNLOCK_APPLY_KEY,
         AUTOUNLOCK_FORCE } from './const.js';
import { check_capacity, in_rooms, losehp } from './hack.js';
import { ECMD_OK, ECMD_TIME, ECMD_CANCEL, IS_FURNITURE, ICE, POOL, MOAT, WATER,
         LAVAPOOL, nothing_happens, nothing_seems_to_happen } from './const.js';
import { upstart, trycall } from './do_name.js';

/* src/hacklib.c The() — the() with the first letter capitalised. */
const The = (s2) => upstart(the(s2));
import { ONAMES, OCLASSES } from './objects_data.js';
import { newsym, pline, bot, display_nhwindow_message,
         tty_clear_nhwindow_message, urgent_pline }
    from './display.js';
import { UNENCUMBERED, SLT_ENCUMBER, MOD_ENCUMBER, HVY_ENCUMBER,
         EXT_ENCUMBER, SHOPBASE, invlet_basic, HAND, KILLED_BY_AN,
         DOOR, D_CLOSED, D_LOCKED, IS_SINK, IS_ALTAR, PLNMSG_OBJNAM_ONLY, ZAP_POS, isok, xdir, ydir,
         LOST_DROPPED, LOST_THROWN, LOST_STOLEN, LOST_EXPLODING, A_WIS, st_all }
    from './const.js';
import { addtobill, costly_spot, doname_with_price, sellobj,
         sellobj_state } from './shk.js';
import { calc_capacity, exercise, max_capacity, near_capacity, Role_if, encumber_msg } from './attrib.js';
import { In_sokoban, surface, ceiling } from './dungeon.js';
import { Is_mbag, splitobj, unbless, place_object, add_to_container,
         start_corpse_timeout, start_glob_timeout, set_bknown, hornoplenty, add_to_minv }
    from './mkobj.js';
import { PARANOID_AUTOALL, PARANOID_CONFIRM } from './const.js';
import { paranoia_bits, boolean_option, add_menu_heading } from './options.js';
import { PMNAMES } from './monst_data.js';
import { def_char_to_objclass } from './sp_lev.js';
import { read_engr_at } from './engrave.js';
import { rn2, rnd, d, rn2_on_display_rng } from './rng.js';
import { OBJ_AT, LOOKHERE_NOFLAGS, LOOKHERE_PICKED_SOME, LOOKHERE_SKIP_DFEATURE } from './const.js';
import { NO_COLOR } from './terminal.js';
import { There, You, Your, You_cant, verbalize } from './pline.js';
import { flush_screen } from './display.js';
import { look_here } from './invent.js';
import { nomul } from './hack.js';
import { t_at, is_pool, is_lava, m_at, touch_artifact } from './mon.js';
import { unconscious, uteetering_at_seen_pit, uescaped_shaft } from './trap.js';
import { sticks, attacktype, ceiling_hider } from './mondata.js';
import { P_SKILL } from './weapon.js';
import { P_RIDING, P_BASIC, Is_airlevel, Is_waterlevel } from './const.js';
import { ATTKS, MFLAGS } from './monst_data.js';
import { is_pit } from './const.js';
import { Blind, Levitation, Stone_resistance, Flying, Underwater,
         Confusion, Stunned, Half_physical_damage } from './youprop.js';
import { st_gloves, st_corpse, st_petrifies, st_resists, W_ARMG } from './const.js';
import { worn } from './do_wear.js';
import { nohands, notake, poly_when_stoned, throws_rocks,
         touch_petrifies } from './mondata.js';
import { is_rider, hideunder } from './makemon.js';
import { body_part } from './polyself.js';
import { tty_yn_function } from './tty/topl.js';
import { inv_cnt } from './hack.js';
import { freehand, cant_reach_floor } from './engrave.js';
import { Norep, impossible, pline_The, livelog_printf } from './pline.js';
import { MENU_TRADITIONAL, MENU_FULL, MENU_PARTIAL, OBJ_CONTAINED,
         W_ARMOR, W_ACCESSORY, W_WEAPONS, LL_ACHIEVE, NO_MINVENT, MM_ADJACENTOK,
         MM_NOMSG, FOOT, ONAME_NO_FLAGS, has_omonst, OMONST } from './const.js';
import { unsplitobj, get_mtraits, set_corpsenm } from './mkobj.js';
import { setuwep_with_feedback, setuswapwep, setuqwep, welded, weldmsg } from './wield.js';
import { bigmonst } from './mondata.js';
import { obj_is_burning } from './light.js';
import { container_contents } from './end.js';
import { docrt, canspotmon } from './display.js';
import { tty_create_nhwindow, tty_putstr, tty_display_nhwindow,
         tty_next_page, tty_destroy_nhwindow, NHW_MENU, NHW_TEXT,
         tty_start_menu, tty_add_menu, tty_end_menu, tty_select_menu, ATR_NONE } from './tty/wintty.js';
import { xwaitforspace } from './tty/getline.js';
import { getlin, paranoid_ynq, get_adjacent_loc, cmdq_add_ec } from './cmd.js';
import { shop_keeper, stolen_value, pick_pick, check_unpaid_usage, subfrombill, Shk_Your } from './shk.js';
import { is_pick } from './mon.js';
import { uhis } from './mhitu.js';
import { get_obj_location } from './zap.js';
import { makemon, set_malign } from './makemon.js';
import { christen_monst, Monnam, rndmonnam, oname, hliquid } from './do_name.js';
import { more_experienced, newexplevel } from './exper.js';
import { Hallucination } from './youprop.js';
import { STONE, BY_NEXTHERE, FEEL_COCKATRICE, PICK_ONE,
         PICK_NONE, SORTLOOT_LOOT, SORTLOOT_INVLET, SORTLOOT_PACK,
         SORTLOOT_PETRIFY, MENU_BEHAVE_STANDARD, MENU_ITEMFLAGS_NONE } from './const.js';
import { hides_under } from './mondata.js';
import { newsym_force, temporary_object_glyph, mon_to_glyph } from './display.js';
import { which_armor, extract_from_minvent } from './worn.js';
import { nolimbs } from './mondata.js';
import { x_monnam, mon_nam } from './do_name.js';
import { W_SADDLE, ARTICLE_THE, SUPPRESS_SADDLE, IS_GRAVE, IS_THRONE,
         T_LOOTED, CQ_CANNED, NO_MM_FLAGS } from './const.js';

import { rider_cant_reach } from './steed.js';
import { autokey, pick_lock, doforce, u_have_forceable_weapon, boxlock } from './lock.js';
import { remove_worn_item } from './steal.js';
import { dropx } from './do.js';
import { courtmon } from './mkroom.js';
import { distu } from './hacklib.js';

function note_unported_pickup(what) {
    (game.unported ||= new Set()).add(what);
}

// src/hack.c can_reach_floor() — is the floor in reach?
//
// The trap parameter checks objects at a pit's bottom. Riding, holders,
// levitation, ceiling hiding and body size also constrain reach.
export function can_reach_floor(check_pit) {
    const u = game.u;
    const youdata = game.youmonst?.data ?? game.mons[u.umonnum ?? 0];

    if (u.uswallow
        || (u.ustuck && !sticks(youdata)
            /* assume that arms are pinned rather than that the hero
               has been lifted up above the floor [doesn't explain
               how hero can attack the creature holding him or her;
               that's life in nethack...] */
            && attacktype(game.mons[u.ustuck.mnum] ?? u.ustuck.data, ATTKS.AT_HUGS))
        || (Levitation() && !(Is_airlevel(u.uz) || Is_waterlevel(u.uz))))
        return false;
    /* Restricted/unskilled riders can't reach the floor */
    if (u.usteed && (P_SKILL(P_RIDING) ?? 0) < P_BASIC)
        return false;
    if (u.uundetected && ceiling_hider(youdata))
        return false;
    if (Flying() || youdata.msize >= MFLAGS.MZ_HUGE)
        return true;
    let t;
    if (check_pit && (t = t_at(u.ux, u.uy)) != null
        && (uteetering_at_seen_pit(t) || uescaped_shaft(t)))
        return false;
    return true;
}

// src/pickup.c:75 simple_look(); preserve the unsorted chain order.
export async function simple_look(otmp, here) {
    if (!otmp?.length) {
        await impossible('simple_look(null)');
    } else if (otmp.length === 1) {
        await pline(doname(otmp[0]));
    } else {
        const tmpwin = tty_create_nhwindow(NHW_MENU);
        tty_putstr(tmpwin, 0, '');
        for (const obj of otmp)
            tty_putstr(tmpwin, 0, doname(obj));
        await tty_display_nhwindow(tmpwin);
        do {
            await xwaitforspace(' \r\n\x1b');
        } while (game.morc !== '\x1b' && tty_next_page(tmpwin));
        tty_destroy_nhwindow(tmpwin);
        await docrt();
    }
}

// src/pickup.c:101 collect_obj_classes(); lists carry nobj/nexthere order.
export function collect_obj_classes(ilets, otmp, here, filter, itemcount) {
    let iletct = 0;
    itemcount.v = 0;
    ilets.length = 0;
    for (const obj of otmp || []) {
        const c = def_oc_syms[obj.oclass];
        if (!ilets.includes(c) && (!filter || filter(obj)))
            ilets[iletct++] = c;
        itemcount.v += 1;
    }
    return iletct;
}

// src/pickup.c:141 query_classes(); traditional pickup and container selection.
export async function query_classes(oclasses, one_at_a_time, everything,
                                    action, objs, here, menu_on_demand) {
    const ilets = [], itemcount = { v: 0 };
    const bcnt = {}, ucnt = {}, ccnt = {}, xcnt = {}, ocnt = {}, jcnt = {};
    let m_seen = false;
    oclasses.length = 0;
    one_at_a_time.v = everything.v = false;
    if (menu_on_demand) menu_on_demand.v = 0;
    let iletct = collect_obj_classes(ilets, objs, here, null, itemcount);
    if (iletct === 0) return false;
    if (iletct === 1) {
        oclasses[0] = def_char_to_objclass(ilets[0]);
    } else {
        ilets[iletct++] = ' ';
        ilets[iletct++] = 'a';
        ilets[iletct++] = 'A';
        ilets[iletct++] = objs === game.invent ? 'i' : ':';
    }
    if (itemcount.v && menu_on_demand) ilets[iletct++] = 'm';
    if (count_unpaid(objs)) ilets[iletct++] = 'u';
    tally_BUCX(objs, here, bcnt, ucnt, ccnt, xcnt, ocnt, jcnt);
    if (bcnt.v) ilets[iletct++] = 'B';
    if (ucnt.v) ilets[iletct++] = 'U';
    if (ccnt.v) ilets[iletct++] = 'C';
    if (xcnt.v) ilets[iletct++] = 'X';
    if (jcnt.v) ilets[iletct++] = 'P';
    if (iletct > 1) {
        let where = null;
        ask_again: for (;;) {
            oclasses.length = 0;
            one_at_a_time.v = everything.v = false;
            let not_everything = false, filtered = false;
            const inbuf = await getlin(`What kinds of thing do you want to ${action}? [${ilets.join('')}]`);
            if (inbuf[0] === '\x1b') return false;
            for (const sym of inbuf) {
                if (sym === ' ') continue;
                else if (sym === 'A') one_at_a_time.v = true;
                else if (sym === 'a') everything.v = true;
                else if (sym === ':') {
                    await simple_look(objs, here);
                    if (objs[0].where === OBJ_CONTAINED)
                        objs[0].ocontainer.cknown = 1;
                    continue ask_again;
                } else if (sym === 'i') {
                    await display_pickinv(null, null, null, false);
                    continue ask_again;
                } else if (sym === 'm') {
                    m_seen = true;
                } else if ('uBUCXP'.includes(sym)) {
                    add_valid_menu_class(sym);
                    filtered = true;
                } else {
                    const oc_of_sym = def_char_to_objclass(sym);
                    if (ilets.includes(sym)) {
                        add_valid_menu_class(oc_of_sym);
                        oclasses.push(oc_of_sym);
                    } else {
                        if (where === null)
                            where = action === 'pick up' ? 'here'
                                : action === 'take out' ? 'inside' : '';
                        if (where) await There(`are no ${sym}'s ${where}.`);
                        else await You(`have no ${sym}'s.`);
                        not_everything = true;
                    }
                }
            }
            if (m_seen && menu_on_demand) {
                menu_on_demand.v = (everything.v || !oclasses.length) && !filtered ? -2 : -3;
                return false;
            }
            if (!oclasses.length && (!everything.v || not_everything)) {
                one_at_a_time.v = true;
                everything.v = false;
            }
            break;
        }
    }
    return true;
}

// src/pickup.c:272 u_safe_from_fatal_corpse() — can the hero touch this
// (cockatrice) corpse and live? 'tests' selects which outs apply (st_all
// checks gloves, corpse-ness, petrification and stoning resistance).
export function u_safe_from_fatal_corpse(obj, tests) {
    if (((tests & st_gloves) && worn(W_ARMG))
        || ((tests & st_corpse) && obj.otyp !== ONAMES.CORPSE)
        || ((tests & st_petrifies)
            && !touch_petrifies(game.mons[obj.corpsenm]))
        || ((tests & st_resists) && Stone_resistance()))
        return true;
    return false;
}

// src/pickup.c:285 fatal_corpse_mistake().
async function fatal_corpse_mistake(obj, remotely) {
    if (u_safe_from_fatal_corpse(obj, st_all) || remotely)
        return false;

    if (poly_when_stoned(game.youmonst.data)) {
        const { polymon } = await import('./polyself.js');
        if (await polymon(PMNAMES.PM_STONE_GOLEM)) {
            await display_nhwindow_message();
            return false;
        }
    }

    await pline(`Touching ${corpse_xname(
        obj, null, CXN_SINGULAR | CXN_ARTICLE)} is a fatal mistake.`);
    const { instapetrify } = await import('./trap.js');
    await instapetrify(corpse_xname(obj, null, CXN_SINGULAR));
    return true;
}

// src/pickup.c:303 rider_corpse_revival().
export async function rider_corpse_revival(obj, remotely) {
    if (!obj || obj.otyp !== ONAMES.CORPSE
        || !is_rider(game.mons[obj.corpsenm]))
        return false;

    await pline(`At your ${remotely ? 'attempted acquisition' : 'touch'}, `
                + 'the corpse suddenly moves...');
    const { revive_corpse } = await import('./do.js');
    await revive_corpse(obj, false);
    exercise(A_WIS, false);
    return true;
}

// src/pickup.c:430 check_here() — look at the objects at our location.
export async function check_here(picked_some) {
    let ct = 0;
    let lhflags = picked_some ? LOOKHERE_PICKED_SOME : LOOKHERE_NOFLAGS;

    if (game.flags?.mention_decor) {
        if (await describe_decor())
            lhflags |= LOOKHERE_SKIP_DFEATURE;
    }

    /* count the objects here */
    for (const obj of game.level?.objects || []) {
        if (obj.ox === game.u.ux && obj.oy === game.u.uy
            && obj !== game.u.uchain)
            ct++;
    }

    /* If there are objects here, take a look. */
    if (ct) {
        if (game.context.run)
            nomul(0);
        await flush_screen(1);
        await look_here(ct, lhflags);
    } else {
        await read_engr_at(game.u.ux, game.u.uy);
    }
}

// src/pickup.c:475 pickup() — main pickup routine.
//
// `what` > 0 means autopickup is in progress; < 0 means "pick N"; 0 is the
// explicit ',' command. With flags.pickup off (the recorded rc default —
// optlist.h initval is Off in 5.0), an autopickup call lands in the
// check_here() arm and only looks. The true picking flows are recorded.
/* iflags.prev_decor — terrain type of the previous decor mention */
// src/pickup.c:353 describe_decor() — 'mention_decor' feedback when walking
// onto a dungeon feature. Ordinary open doors and doorways are skipped;
// broken (and closed, via Passes_walls) doors are mentioned. Returns true
// when it printed, so check_here can skip look_here's duplicate line.
export async function describe_decor() {
    /* the fumbling deferral needs the Fumbling timeout; recorded */
    const { dfeature_at } = await import('./invent.js');
    const loc = game.level?.at(game.u.ux, game.u.uy);
    const ltyp = loc?.typ ?? 0;
    let dfeature = dfeature_at(game.u.ux, game.u.uy);
    let res = true;

    const doorhere = dfeature && (dfeature === 'open door'
                                  || dfeature === 'doorway');
    const waterhere = dfeature && dfeature === 'pool of water';
    if (doorhere || game.u.uprops?.UNDERWATER)
        dfeature = null;

    const prev = game.iflags.prev_decor ?? 0 /* STONE */;
    if (ltyp === prev && !IS_FURNITURE(ltyp)) {
        res = false;
    } else if (dfeature) {
        if (waterhere) {
            const { waterbody_name } = await import('./pager.js');
            dfeature = waterbody_name(game.u.ux, game.u.uy);
        }
        if (dfeature !== 'swamp' && ltyp !== ICE)
            dfeature = an(dfeature);

        if (game.flags?.verbose !== false) {
            await pline(`There is ${dfeature} here.`);
        } else {
            await pline(`${dfeature[0].toUpperCase()}${dfeature.slice(1)}.`);
        }
    } else if (!game.u.uprops?.UNDERWATER) {
        /* the back-on-ground arm keys on prev_decor being pool/lava/ice */
        if (is_pool_typ(prev) || prev === LAVAPOOL_TYP || prev === ICE)
            note_unported_pickup('describe_decor:back_on_ground');
    }
    /* only adapt the next describe_decor() when the option is On */
    game.iflags.prev_decor = game.flags?.mention_decor ? ltyp : 0;
    return res;
}

// src/pickup.c:317 force_decor() makes probing describe the current ice or
// furniture even when mention_decor is disabled or the same terrain was just
// described. The override flags in C only bypass deferred flavor checks that
// this port does not model yet.
export async function force_decor(via_probing = false) {
    game.iflags ||= {};
    game.iflags.prev_decor = 0; /* STONE */
    const described = await describe_decor();
    game.iflags.prev_decor = game.level?.at(game.u.ux, game.u.uy)?.typ ?? 0;
    void via_probing;
    return described;
}

const is_pool_typ = (t) => t === POOL || t === MOAT || t === WATER;
const LAVAPOOL_TYP = LAVAPOOL;

// src/pickup.c:616 reset_justpicked().
export function reset_justpicked(olist) {
    for (const obj of olist || [])
        obj.pickup_prev = 0;
}

// src/pickup.c:460 n_or_more(), count-prefixed menu pickup callback.
function n_or_more(obj) {
    return obj !== game.u.uchain && obj.quan >= game.val_for_n_or_more;
}

// src/pickup.c:509 all_but_uchain().
function all_but_uchain(obj) {
    return obj !== game.u.uchain;
}

// src/pickup.c:672 pickup(), including traditional and menu selection.
export async function pickup(what) {
    const autopickup = what > 0, count = what < 0 ? -what : 0;
    let n_tried = 0, n_picked = 0, pick_list = null;
    if (autopickup && game.multi < 0 && unconscious()) {
        game.iflags.prev_decor = STONE;
        return 0;
    }
    game.pickup_encumbrance = 0;
    if (!game.u.uswallow) {
        if (autopickup && (game.context.nopick || !OBJ_AT(game.u.ux, game.u.uy)
                           || (is_pool(game.u.ux, game.u.uy) && !Underwater())
                           || is_lava(game.u.ux, game.u.uy))) {
            if (game.flags.mention_decor)
                await describe_decor();
            await read_engr_at(game.u.ux, game.u.uy);
            return 0;
        }
        const t = t_at(game.u.ux, game.u.uy);
        if (!can_reach_floor(!!(t && is_pit(t.ttyp)))) {
            await describe_decor();
            if ((game.multi && !game.context.run)
                || (autopickup && !game.flags.autopickup)
                || (t && (uteetering_at_seen_pit(t) || uescaped_shaft(t))))
                await read_engr_at(game.u.ux, game.u.uy);
            return 0;
        }
        if ((game.multi && !game.context.run)
            || (autopickup && !game.flags.autopickup)
            || notake(game.youmonst.data)) {
            await check_here(false);
            if (notake(game.youmonst.data) && OBJ_AT(game.u.ux, game.u.uy)
                && (autopickup || game.flags.autopickup))
                await You('are physically incapable of picking anything up.');
            return 0;
        }
        if (OBJ_AT(game.u.ux, game.u.uy) && game.context.run
            && game.context.run !== 8 && !game.context.nopick)
            nomul(0);
    }

    add_valid_menu_class(0);
    let objchain, traverse_how;
    if (!game.u.uswallow) {
        objchain = game.level.objects.filter(o => o.ox === game.u.ux && o.oy === game.u.uy);
        // C place_object() keeps boulders ahead of other nexthere entries.
        objchain.sort((a, b) => (b.otyp === ONAMES.BOULDER) - (a.otyp === ONAMES.BOULDER));
        traverse_how = BY_NEXTHERE;
    } else {
        objchain = game.u.ustuck.minvent || [];
        traverse_how = 0;
    }
    if (autopickup) {
        pick_list = autopick(objchain);
    } else if (game.flags.menu_style !== MENU_TRADITIONAL || game.iflags.menu_requested) {
        traverse_how |= AUTOSELECT_SINGLE | (game.flags.sortpack ? INVORDER_SORT : 0);
        if (count) {
            game.val_for_n_or_more = count;
            pick_list = await query_objlist(`Pick ${count} of what?`, objchain,
                traverse_how, PICK_ONE, n_or_more);
            for (const obj of pick_list)
                pick_list.counts.set(obj, count);
        } else {
            pick_list = await query_objlist('Pick up what?', objchain,
                traverse_how | FEEL_COCKATRICE, PICK_ANY, all_but_uchain);
        }
    } else {
        const oclasses = [], all_of_a_type = { v: true }, selective = { v: false };
        if (objchain.length === 1 && count) {
            const obj = objchain[0];
            n_tried++;
            reset_justpicked(game.invent);
            if (await pickup_object(obj, Math.min(obj.quan, count), false) > 0)
                n_picked++;
        } else {
            if (objchain.length >= 2) {
                const via_menu = { v: 0 };
                await There(`are ${objchain.length <= 10 ? 'several' : 'many'} objects here.`);
                if (!await query_classes(oclasses, selective, all_of_a_type,
                    'pick up', objchain, !!(traverse_how & BY_NEXTHERE), via_menu)) {
                    if (!via_menu.v) {
                        game.pickup_encumbrance = 0;
                        add_valid_menu_class(0);
                        return 0;
                    }
                    if (selective.v)
                        traverse_how |= INVORDER_SORT;
                    pick_list = await query_objlist('Pick up what?', objchain,
                        traverse_how, PICK_ANY, via_menu.v === -2 ? allow_all : allow_category);
                }
            }
            if (pick_list === null) {
                const bycat = 'BUCX'.split('').some(menu_class_present);
                for (const obj of [...objchain]) {
                    if (bycat ? !allow_category(obj)
                        : (!selective.v && oclasses.length && !oclasses.includes(obj.oclass)))
                        continue;
                    let lcount = -1;
                    if (!all_of_a_type.v) {
                        const qbuf = safe_qbuf('Pick up ', '?', obj, doname, ansimpleoname, 'something');
                        const sym = await tty_yn_function(qbuf, obj.quan < 2 ? 'ynaq' : 'yn#aq', 'y', true);
                        if (sym === 'q')
                            break;
                        if (sym === 'n')
                            continue;
                        if (sym === 'a') {
                            all_of_a_type.v = true;
                            if (selective.v) {
                                selective.v = false;
                                oclasses.splice(0, oclasses.length, obj.oclass);
                            }
                        } else if (sym === '#') {
                            if (!game.yn_number)
                                continue;
                            lcount = Math.min(game.yn_number, obj.quan);
                        }
                    }
                    if (lcount === -1)
                        lcount = obj.quan;
                    if (!n_tried)
                        reset_justpicked(game.invent);
                    n_tried++;
                    const res = await pickup_object(obj, lcount, false);
                    if (res < 0)
                        break;
                    n_picked += res;
                }
            }
        }
    }
    if (pick_list !== null) {
        if (pick_list.length > 0)
            reset_justpicked(game.invent);
        n_tried = pick_list.length;
        for (const obj of pick_list) {
            const res = await pickup_object(obj, pick_list.counts?.get(obj) ?? obj.quan, false);
            if (res < 0)
                break;
            n_picked += res;
        }
    }
    if (!game.u.uswallow) {
        if (hides_under(game.youmonst.data))
            hideunder(game.youmonst);
        if (n_picked)
            newsym_force(game.u.ux, game.u.uy);
        if (autopickup)
            await check_here(n_picked > 0);
    }
    game.pickup_encumbrance = 0;
    add_valid_menu_class(0);
    return n_tried > 0 ? 1 : 0;
}

// src/pickup.c:2431 loot_mon(), remove a saddle or pick up from an engulfer.
export async function loot_mon(mtmp, passed_info, prev_loot) {
    let timepassed = 0;
    const otmp = mtmp && mtmp !== game.u.usteed && which_armor(mtmp, W_SADDLE);
    if (otmp) {
        if (passed_info)
            passed_info.v = 1;
        const qbuf = `Do you want to remove the saddle from ${
            x_monnam(mtmp, ARTICLE_THE, null, SUPPRESS_SADDLE, false)}?`;
        const c = await tty_yn_function(qbuf, 'ynq', 'n', true);
        if (c === 'y') {
            if (nolimbs(game.youmonst.data)) {
                await You_cant('do that without limbs.');
                return 0;
            }
            if (otmp.cursed) {
                await You(`can't.  The saddle seems to be stuck to ${
                    x_monnam(mtmp, ARTICLE_THE, null, SUPPRESS_SADDLE, false)}.`);
                return 1;
            }
            await extract_from_minvent(mtmp, otmp, true, false);
            if (game.flags.verbose)
                await You(`take ${thesimpleoname(otmp)} off of ${mon_nam(mtmp)}.`);
            await hold_another_object(otmp, 'You drop %s!', doname(otmp), null);
            timepassed = rnd(3);
            if (prev_loot)
                prev_loot.v = true;
        } else if (c === 'q') {
            return 0;
        }
    }
    if (game.u.uswallow)
        timepassed = await pickup(passed_info ? passed_info.v : 0);
    return timepassed;
}

// src/pickup.c:934 autopick_testobj()'s cached cost applies to the whole pile.
let autopick_costly = false;

// src/pickup.c:930 autopick_testobj(), shop and origin guards precede types.
export function autopick_testobj(otmp, calc_costly) {
    const otypes = game.flags?.pickup_types || '';
    if (calc_costly)
        autopick_costly = otmp.where === OBJ_FLOOR && costly_spot(otmp.ox, otmp.oy);
    if (autopick_costly && !otmp.no_charge)
        return false;
    if ((game.flags.pickup_thrown !== false && otmp.how_lost === LOST_THROWN)
        || (game.flags.pickup_stolen !== false && otmp.how_lost === LOST_STOLEN))
        return true;
    if (game.flags.dropped_nopick !== false && otmp.how_lost === LOST_DROPPED)
        return false;
    if (otmp.how_lost === LOST_EXPLODING)
        return false;
    if (game.apelist)
        note_unported_pickup('autopick_testobj:exceptions');
    return !otypes || otypes.includes(def_oc_syms[otmp.oclass]);
}

// src/pickup.c:979 autopick(). Arrays already carry the requested chain order.
function autopick(olist) {
    let n = 0, check_costly = true;
    for (const curr of olist) {
        if (autopick_testobj(curr, check_costly))
            n++;
        check_costly = false;
    }
    const picks = [];
    if (n)
        for (const curr of olist)
            if (autopick_testobj(curr, false))
                picks.push(curr);
    return picks;
}

// src/pickup.c allow_all(); query_objlist() filter that accepts everything
export function allow_all(obj) {
    return true;
}

// src/pickup.c:1025 query_objlist(); arrays carry C menu item pointers and
// counts, with the negative SIGNAL_NOMENU and SIGNAL_ESCAPE return codes.
export async function query_objlist(qstr, olist, qflags = INVORDER_SORT,
                                    how = PICK_ANY, allow = allow_all) {
    const sorted = !!(qflags & INVORDER_SORT), engulfer = !!(qflags & INCLUDE_HERO);
    if (!olist.length && !engulfer)
        return [];
    let n = 0, last = null;
    for (const curr of olist) {
        if (allow(curr)) {
            last = curr;
            n++;
        }
    }
    const engulfer_minvent = olist.length && olist[0].where === OBJ_MINVENT
        && engulfing_u(olist[0].ocarry);
    if (engulfer_minvent && n === 1 && olist[0].owornmask)
        qflags &= ~AUTOSELECT_SINGLE;
    if (engulfer) {
        ++n;
        qflags &= ~AUTOSELECT_SINGLE;
    }
    if (n === 0)
        return qflags & SIGNAL_NOMENU ? -1 : [];
    if (n === 1 && (qflags & AUTOSELECT_SINGLE)) {
        const picks = [last];
        Object.defineProperty(picks, 'counts', { value: new Map([[last, last.quan]]) });
        return picks;
    }

    const mode = String(game.flags.sortloot).charAt(0);
    const sortflags = ((mode === 'f' || (mode === 'l' && !(qflags & USE_INVLET)))
        ? SORTLOOT_LOOT : (qflags & USE_INVLET) ? SORTLOOT_INVLET : 0)
        | (game.flags.sortpack ? SORTLOOT_PACK : 0)
        | ((qflags & FEEL_COCKATRICE) ? SORTLOOT_PETRIFY : 0);
    const sortedolist = sortloot(olist, sortflags, !!(qflags & BY_NEXTHERE), allow);
    const { tty_start_menu, tty_add_menu, tty_add_menu_str,
            tty_end_menu, tty_select_menu, ATR_NONE } = await import('./tty/wintty.js');
    const win = tty_create_nhwindow(NHW_MENU), fake_hero_object = { quan: 1 };
    tty_start_menu(win, MENU_BEHAVE_STANDARD);
    if (game.this_title)
        tty_add_menu_str(win, game.this_title);
    const pack = [...inv_order()];
    if (qflags & INCLUDE_VENOM)
        pack.push(OCLASSES.VENOM_CLASS);
    let first = true;
    for (const oclass of sorted ? pack : [0]) {
        let printed_type_name = false;
        for (const { obj: curr } of sortedolist) {
            if (!curr)
                break;
            if (sorted && curr.oclass !== oclass)
                continue;
            if ((qflags & FEEL_COCKATRICE) && curr.otyp === ONAMES.CORPSE
                && will_feel_cockatrice(curr, false)) {
                tty_destroy_nhwindow(win);
                await look_here(0, LOOKHERE_NOFLAGS);
                unsortloot(sortedolist);
                return [];
            }
            if (allow(curr)) {
                if (sorted && !printed_type_name) {
                    add_menu_heading(win, let_to_name(oclass, false,
                        how !== PICK_NONE && game.iflags.menu_head_objsym));
                    printed_type_name = true;
                }
                const glyphinfo = temporary_object_glyph(curr);
                tty_add_menu(win, glyphinfo, curr,
                    (qflags & USE_INVLET) ? curr.invlet
                        : first && curr.oclass === OCLASSES.COIN_CLASS ? '$' : 0,
                    def_oc_syms[game.objects[curr.otyp].oc_class], ATR_NONE, NO_COLOR,
                    doname_with_price(curr), MENU_ITEMFLAGS_NONE);
                first = false;
            }
        }
    }
    unsortloot(sortedolist);
    if (engulfer) {
        if (sorted && n > 1)
            add_menu_heading(win, `${digests(game.u.ustuck.data) ? 'Swallowed' : 'Engulfed'} Creatures`);
        const glyphinfo = mon_to_glyph(game.youmonst, rn2_on_display_rng);
        tty_add_menu(win, glyphinfo, fake_hero_object, CONTAINED_SYM, 0,
            ATR_NONE, NO_COLOR, an(self_lookat()), MENU_ITEMFLAGS_NONE);
    }
    tty_end_menu(win, qstr);
    const selected = await tty_select_menu(win, how);
    tty_destroy_nhwindow(win);
    if (selected.cancelled)
        return qflags & SIGNAL_ESCAPE ? -2 : [];
    const picks = [], counts = new Map();
    for (const curr of selected) {
        if (curr === fake_hero_object) {
            await You_cant('pick yourself up!');
            continue;
        }
        if (engulfer_minvent && curr.owornmask) {
            await You_cant(`pick ${ysimple_name(curr)} up.`);
            continue;
        }
        let count = selected.counts?.get(curr) ?? -1;
        if (count === -1 || count > curr.quan)
            count = curr.quan;
        picks.push(curr);
        counts.set(curr, count);
    }
    Object.defineProperty(picks, 'counts', { value: counts });
    return picks;
}

const gold_weight = (amount) => Math.trunc((amount + 50) / 100);

// src/pickup.c:1544 delta_cwt(); measure the carried container's weight change.
export function delta_cwt(container, obj) {
    if (container.otyp !== ONAMES.BAG_OF_HOLDING) return obj.owt;
    const owt = container.owt;
    const index = container.cobj.indexOf(obj);
    if (index < 0) throw new Error('delta_cwt: obj not inside container?');
    container.cobj.splice(index, 1);
    const nwt = weight(container);
    container.cobj.splice(index, 0, obj);
    return owt - nwt;
}

// src/pickup.c:1570 carry_count()
export async function carry_count(obj, container, count, telekinesis, wt_before, wt_after) {
    const adjust_wt = container && carried(container);
    const is_gold = obj.oclass === OCLASSES.COIN_CLASS;
    const savequan = obj.quan, saveowt = obj.owt;
    const umoney = money_cnt(game.invent);
    let iw = max_capacity();
    if (count !== savequan) {
        obj.quan = count;
        obj.owt = weight(obj);
    }
    let wt = iw + obj.owt;
    if (adjust_wt) wt -= delta_cwt(container, obj);
    if (is_gold) wt -= gold_weight(umoney) + gold_weight(count) - gold_weight(umoney + count);
    if (count !== savequan) {
        obj.quan = savequan;
        obj.owt = saveowt;
    }
    wt_before.v = iw;
    wt_after.v = wt;
    if (wt < 0) return count;
    let qq;
    if (is_gold) {
        iw -= gold_weight(umoney);
        if (!adjust_wt) {
            qq = iw * -100 - (umoney + 50) - 1;
        } else {
            let oow = 0;
            qq = 50 - (umoney % 100) - 1;
            if (qq < 0) qq += 100;
            for (; qq <= count; qq += 100) {
                obj.quan = qq;
                obj.owt = gold_weight(qq);
                let ow = gold_weight(umoney + qq);
                ow -= delta_cwt(container, obj);
                if (iw + ow >= 0) break;
                oow = ow;
            }
            iw -= oow;
            qq -= 100;
        }
        if (qq < 0) qq = 0;
        else if (qq > count) qq = count;
        wt = iw + gold_weight(umoney + qq);
    } else if (count > 1 || count < obj.quan) {
        for (qq = 1; qq <= count; ++qq) {
            obj.quan = qq;
            let ow = obj.owt = weight(obj);
            if (adjust_wt) ow -= delta_cwt(container, obj);
            if (iw + ow >= 0) break;
            wt = iw + ow;
        }
        --qq;
    } else qq = 0;
    obj.quan = savequan;
    obj.owt = saveowt;
    let obj_nambuf = '', where = '', verb = '';
    if (qq < count) {
        obj_nambuf = doname(obj);
        if (container) {
            where = `in ${the(xname(container))}`;
            verb = 'carry';
        } else {
            where = 'lying here';
            verb = telekinesis ? 'acquire' : 'lift';
        }
    }
    if (qq > 0) {
        if (qq < count)
            await You(`can only ${verb} ${qq === 1 ? 'one' : 'some'} of the ${obj_nambuf} ${where}.`);
        wt_after.v = wt;
        return qq;
    }
    if (!container) where = 'here';
    let prefx1, prefx2, suffx;
    if (game.invent?.length || umoney) {
        prefx1 = 'you cannot ';
        prefx2 = '';
        suffx = ' any more';
    } else {
        prefx1 = obj.quan === 1 ? 'it ' : 'even one ';
        prefx2 = 'is too heavy for you to ';
        suffx = '';
    }
    await There(`${otense(obj, 'are')} ${obj_nambuf} ${where}, but ${prefx1}${prefx2}${verb}${suffx}.`);
    return 0;
}

// src/pickup.c:1705 lift_object()
export async function lift_object(obj, container, cnt_p, telekinesis) {
    let result;
    if (obj.otyp === ONAMES.BOULDER && In_sokoban(game.u.uz)) {
        await You(`cannot get your ${body_part(HAND)} around this ${xname(obj)}.`);
        return -1;
    }
    if (obj.otyp === ONAMES.LOADSTONE
        || (obj.otyp === ONAMES.BOULDER && throws_rocks(game.youmonst.data))) {
        if (inv_cnt(false) < invlet_basic || !carrying(obj.otyp) || merge_choice(game.invent, obj))
            return 1;
        await You(`are carrying too much stuff to pick up ${obj.quan === 1 ? 'another' : 'more'} ${xname(obj)}.`);
        return -1;
    }
    const old_wt = {}, new_wt = {};
    cnt_p.v = await carry_count(obj, container, cnt_p.v, telekinesis, old_wt, new_wt);
    if (cnt_p.v < 1) {
        result = -1;
    } else if (obj.oclass !== OCLASSES.COIN_CLASS && inv_cnt(false) >= invlet_basic
               && !merge_choice(game.invent, obj)) {
        await Your(`knapsack cannot accommodate any more items${
            nxtobj(obj, ONAMES.GOLD_PIECE, obj.where === OBJ_FLOOR) ? ' (except gold)' : ''}.`);
        result = -1;
    } else {
        result = 1;
        let prev_encumbr = near_capacity();
        if (prev_encumbr < (game.flags.pickup_burden ?? MOD_ENCUMBER))
            prev_encumbr = game.flags.pickup_burden ?? MOD_ENCUMBER;
        const next_encumbr = calc_capacity(new_wt.v - old_wt.v);
        if (next_encumbr > prev_encumbr) {
            if (telekinesis) result = 0;
            else {
                const savequan = obj.quan;
                obj.quan = cnt_p.v;
                const prefix = next_encumbr >= EXT_ENCUMBER ? 'You have extreme difficulty'
                    : next_encumbr >= HVY_ENCUMBER ? 'You have much trouble'
                    : next_encumbr >= MOD_ENCUMBER ? 'You have trouble' : 'You have a little trouble';
                const qbuf = safe_qbuf(`${prefix} ${!container ? 'lifting' : 'removing'} `,
                    '.  Continue?', obj, doname, ansimpleoname, 'something');
                obj.quan = savequan;
                const answer = await tty_yn_function(qbuf, 'ynq', 'q');
                if (answer === 'q') result = -1;
                else if (answer === 'n') result = 0;
                tty_clear_nhwindow_message(game._topl_cury || 0);
                game._pending_message = '';
            }
        }
    }
    if (obj.otyp === ONAMES.SCR_SCARE_MONSTER && result <= 0 && !container)
        obj.spe = 0;
    return result;
}

// src/pickup.c:1803 pickup_object() -- take one object off the floor.
// Artifact touch, fatal corpse contact, and Rider revival are checked before
// the ordinary lift path.
export async function pickup_object(obj, count, telekinesis) {
    if (obj.quan < count)
        return 0;                       /* impossible() in C */

    if (!Blind())
        observe_object(obj);

    if (obj === game.u.uchain)
        return 0;                       /* do not pick up attached chain */
    if (obj.oartifact && !await touch_artifact(obj, game.youmonst))
        return 0;
    if (obj.otyp === ONAMES.SCR_SCARE_MONSTER) {
        count = await carry_count(obj, null, count ? count : obj.quan,
                                  telekinesis, {}, {});
        if (count < 1)
            return -1;
        if (count < obj.quan)
            obj = splitobj(obj, count);

        if (obj.blessed) {
            await unbless(obj);
        } else if (!obj.spe && !obj.cursed) {
            obj.spe = 1;
        } else {
            const scroll = `scroll${obj.quan === 1 ? '' : 's'}`;
            await pline(`The ${scroll} ${otense(obj, 'turn')} to dust as you ${
                telekinesis ? 'raise' : 'pick'} ${
                obj.quan === 1 ? 'it' : 'them'} up.`);
            await trycall(obj);
            await useupf(obj, obj.quan);
            return 1;
        }
    }
    if (obj.otyp === ONAMES.CORPSE
        && (await fatal_corpse_mistake(obj, telekinesis)
            || await rider_corpse_revival(obj, telekinesis)))
        return -1;

    const cnt_p = { v: count };
    const res = await lift_object(obj, null, cnt_p, telekinesis);
    if (res <= 0) return res;
    count = cnt_p.v;

    if (obj.quan !== count && obj.otyp !== ONAMES.LOADSTONE)
        obj = splitobj(obj, count);
    obj = await pick_obj(obj);
    await pickup_prinv(obj, count, 'lifting');
    return 1;
}

// src/pickup.c:1897 pick_obj() — off the floor and into inventory.
async function pick_obj(otmp) {
    const ox = otmp.ox, oy = otmp.oy;
    let robshop = !game.u.uswallow && otmp !== game.u.uball
               && costly_spot(ox, oy);

    obj_extract_self(otmp);
    newsym(ox, oy);
    if (robshop) {
        const saveushops = game.u.ushops || '';
        const fakeshop = in_rooms(ox, oy, SHOPBASE).charAt(0);
        game.u.ushops = fakeshop;
        try {
            await addtobill(otmp, true, false, false);
        } finally {
            game.u.ushops = saveushops;
        }
        robshop = !!otmp.unpaid && !saveushops.includes(fakeshop);
    }

    const oldcap = near_capacity();
    const result = await addinv(otmp);
    if (near_capacity() !== oldcap)
        game._encumber_status_stale = true;
    if (robshop)
        note_unported_pickup('pick_obj:remote_burglary');
    return result;
}

// src/pickup.c:1948 pickup_prinv() limits encumbrance feedback to the first
// item in one pickup operation that changes the current load category.
export async function pickup_prinv(obj, count, verb) {
    const nearload = near_capacity();
    let prefix = '';
    if (nearload !== game.pickup_encumbrance) {
        prefix = nearload >= EXT_ENCUMBER ? 'You have extreme difficulty'
               : nearload >= HVY_ENCUMBER ? 'You have much trouble'
                 : nearload >= MOD_ENCUMBER ? 'You have trouble'
                   : nearload >= SLT_ENCUMBER ? 'You have a little trouble'
                     : '';
        game.pickup_encumbrance = nearload;
    }
    await prinv(prefix ? `${prefix} ${verb}` : null, obj, count);
}


// src/pickup.c:2041 able_to_loot(), floor reach and manipulation guards.
export async function able_to_loot(x, y, looting) {
    const verb = looting ? 'loot' : 'tip', t = t_at(x, y);
    if (!can_reach_floor(!!(t && is_pit(t.ttyp)))) {
        if (game.u.usteed && P_SKILL(P_RIDING) < P_BASIC)
            await rider_cant_reach();
        else
            await cant_reach_floor(x, y, false, true, false);
        return false;
    } else if ((is_pool(x, y) && (looting || !Underwater())) || is_lava(x, y)) {
        await You(`cannot ${verb} things that are deep in the ${
            hliquid(is_lava(x, y) ? 'lava' : 'water')}.`);
        return false;
    } else if (nolimbs(game.youmonst.data)) {
        await pline(`Without limbs, you cannot ${verb} anything.`);
        return false;
    } else if (looting && !freehand()) {
        await pline(`Without a free ${body_part(HAND)}, you cannot loot anything.`);
        return false;
    }
    return true;
}

// src/pickup.c:2072 mon_beside().
export function mon_beside(x, y) {
    for (let i = -1; i <= 1; i++)
        for (let j = -1; j <= 1; j++) {
            const nx = x + i, ny = y + j;
            if (isok(nx, ny) && m_at(nx, ny))
                return true;
        }
    return false;
}

// src/pickup.c:2088 do_loot_cont(), including abort and deleted-container state.
export async function do_loot_cont(cobjp, cindex, ccount) {
    const cobj = cobjp.o;
    if (!cobj)
        return ECMD_OK;
    if (cobj.olocked) {
        let res = ECMD_OK;
        if (cobj.lknown)
            await pline(`${The(xname(cobj))} is locked.`);
        else
            await pline(`Hmmm, ${the(xname(cobj))} turns out to be locked.`);
        cobj.lknown = 1;
        const autounlock = game.flags.autounlock;
        if (autounlock) {
            let unlocktool = null;
            const ox = cobj.ox, oy = cobj.oy;
            game.u.dz = 0;
            if (((autounlock & AUTOUNLOCK_APPLY_KEY) !== 0
                 && (unlocktool = autokey(true)) !== null)
                || (autounlock & AUTOUNLOCK_UNTRAP) !== 0) {
                if (await pick_lock(unlocktool, ox, oy, cobj))
                    res = ECMD_TIME;
                if (!obj_here(cobj, ox, oy))
                    cobjp.o = null;
                return res;
            }
            if ((autounlock & AUTOUNLOCK_FORCE) !== 0
                && res !== ECMD_TIME && ccount === 1 && u_have_forceable_weapon()) {
                cmdq_add_ec(CQ_CANNED, doforce);
                game.abort_looting = true;
            }
        }
        return res;
    }
    cobj.lknown = 1;
    if (cobj.otyp === ONAMES.BAG_OF_TRICKS) {
        await You(`carefully open ${the(xname(cobj))}...`);
        await pline('It develops a huge set of teeth and bites you!');
        const tmp = rnd(10);
        await losehp(Half_physical_damage() ? Math.trunc((tmp + 1) / 2) : tmp,
                     'carnivorous bag', KILLED_BY_AN);
        makeknown(ONAMES.BAG_OF_TRICKS);
        game.abort_looting = true;
        return ECMD_TIME;
    }
    return await use_container(cobjp, false, cindex < ccount);
}

// src/pickup.c:2166 doloot(), reset pickup history only for this command.
export async function doloot() {
    game.loot_reset_justpicked = true;
    try {
        return await doloot_core();
    } finally {
        game.loot_reset_justpicked = false;
    }
}

// src/pickup.c:2178 doloot_core(), containers followed by directional looting.
export async function doloot_core() {
    let c = -1, timepassed = 0, underfoot = true;
    const cc = { x: 0, y: 0 }, prev_inquiry = { v: 0 }, prev_loot = { v: false };
    const dont_find_anything = "don't find anything";
    game.abort_looting = false;
    if (await check_capacity(null))
        return ECMD_OK;
    if (nohands(game.youmonst.data)) {
        await You('have no hands!');
        return ECMD_OK;
    }
    if (Confusion()) {
        if (rn2(6) && await reverse_loot())
            return ECMD_TIME;
        if (rn2(2)) {
            await pline('Being confused, you find nothing to loot.');
            return ECMD_TIME;
        }
    }
    cc.x = game.u.ux;
    cc.y = game.u.uy;
    let lootcont = !game.iflags.menu_requested;
    for (;;) {
        if (lootcont) {
            const num_conts = container_at(cc.x, cc.y, true);
            if (num_conts > 0) {
                let anyfound = false;
                if (!await able_to_loot(cc.x, cc.y, true))
                    return ECMD_OK;
                if (Blind() && !worn(W_ARMG)) {
                    for (let obj = sobj_at(ONAMES.CORPSE, cc.x, cc.y); obj;
                         obj = nxtobj(obj, ONAMES.CORPSE, true)) {
                        if (will_feel_cockatrice(obj, false)) {
                            await feel_cockatrice(obj, false);
                            return ECMD_TIME;
                        }
                    }
                }
                if (num_conts > 1) {
                    const win = tty_create_nhwindow(NHW_MENU);
                    tty_start_menu(win, MENU_BEHAVE_STANDARD);
                    for (const obj of game.level.objects)
                        if (obj.ox === cc.x && obj.oy === cc.y && Is_container(obj))
                            tty_add_menu(win, null, obj, 0, 0, ATR_NONE, NO_COLOR,
                                         doname(obj), MENU_ITEMFLAGS_NONE);
                    tty_end_menu(win, 'Loot which containers?');
                    const picks = await tty_select_menu(win, PICK_ANY);
                    const n = picks.cancelled ? -1 : picks.length;
                    tty_destroy_nhwindow(win);
                    for (let i = 1; i <= n; i++) {
                        const cobj = { o: picks[i - 1] };
                        timepassed |= await do_loot_cont(cobj, i, n);
                        if (game.abort_looting)
                            return timepassed ? ECMD_TIME : ECMD_OK;
                    }
                    if (n !== 0)
                        c = 'y';
                } else {
                    for (const obj of [...game.level.objects]) {
                        if (obj.ox !== cc.x || obj.oy !== cc.y)
                            continue;
                        if (Is_container(obj)) {
                            anyfound = true;
                            timepassed |= await do_loot_cont({ o: obj }, 1, 1);
                            if (game.abort_looting)
                                return timepassed ? ECMD_TIME : ECMD_OK;
                        }
                    }
                    if (anyfound)
                        c = 'y';
                }
            } else if (IS_GRAVE(game.level.at(cc.x, cc.y).typ)) {
                await You('need to dig up the grave to effectively loot it...');
            }
        }
        if (c !== 'y' && (mon_beside(game.u.ux, game.u.uy) || game.iflags.menu_requested)) {
            let looted_mon = false;
            if (!await get_adjacent_loc('Loot in what direction?',
                                        'Invalid loot location', game.u.ux, game.u.uy, cc))
                return ECMD_OK;
            underfoot = cc.x === game.u.ux && cc.y === game.u.uy;
            if (underfoot && container_at(cc.x, cc.y, false)) {
                lootcont = true;
                continue;
            }
            if (game.u.dz < 0) {
                await You(`${dont_find_anything} to loot on the ${ceiling(cc.x, cc.y)}.`);
                return ECMD_TIME;
            }
            const mtmp = m_at(cc.x, cc.y);
            if (mtmp) {
                timepassed = await loot_mon(mtmp, prev_inquiry, prev_loot);
                if (timepassed)
                    looted_mon = true;
            }
            if (Confusion() || Stunned())
                timepassed = 1;
            if (!looted_mon) {
                if (!underfoot && container_at(cc.x, cc.y, false)) {
                    if (mtmp) {
                        await You_cant(`loot anything ${prev_inquiry.v ? 'else ' : ''}there with ${
                            mon_nam(mtmp)} in the way.`);
                        return timepassed ? ECMD_TIME : ECMD_OK;
                    } else {
                        await You('have to be at a container to loot it.');
                    }
                } else {
                    await You(`${dont_find_anything} ${prev_inquiry.v || prev_loot.v ? 'else ' : ''}${
                        !underfoot ? 't' : ''}here to loot.`);
                    return timepassed ? ECMD_TIME : ECMD_OK;
                }
            }
        } else if (c !== 'y' && c !== 'n') {
            await You(`${dont_find_anything} ${underfoot ? 'here' : 'there'} to loot.`);
        }
        return timepassed ? ECMD_TIME : ECMD_OK;
    }
}

// src/pickup.c:2350 reverse_loot(), confused discoveries and gold contributions.
export async function reverse_loot() {
    const x = game.u.ux, y = game.u.uy;
    if (!rn2(3)) {
        let n = inv_cnt(true);
        for (const otmp of game.invent) {
            if (!rn2(n + 1)) {
                await prinv('You find old loot:', otmp, 0);
                return true;
            }
            --n;
        }
        return false;
    }
    let goldob = null;
    for (const obj of game.invent) {
        if (obj.oclass === OCLASSES.COIN_CLASS) {
            goldob = obj;
            const contribution = Math.trunc((rnd(5) * goldob.quan + 4) / 5);
            if (contribution < goldob.quan)
                goldob = splitobj(goldob, contribution);
            break;
        }
    }
    if (!goldob)
        return false;
    await remove_worn_item(goldob, false);
    if (!IS_THRONE(game.level.at(x, y).typ)) {
        await dropx(goldob);
        if (g_at(x, y))
            await pline('Ok, now there is loot here.');
    } else {
        let coffers = null, otmp = null;
        for (const obj of game.level.objects) {
            if (obj.otyp === ONAMES.CHEST) {
                if (obj.spe === 2) {
                    coffers = obj;
                    break;
                }
                if (!otmp || distu(obj.ox, obj.oy) < distu(otmp.ox, otmp.oy))
                    otmp = obj;
            }
        }
        if (!coffers)
            coffers = otmp;
        if (coffers) {
            await verbalize('Thank you for your contribution to reduce the debt.');
            freeinv(goldob);
            add_to_container(coffers, goldob);
            coffers.owt = weight(coffers);
            coffers.cknown = 0;
            if (!coffers.olocked)
                await boxlock(coffers, { otyp: ONAMES.SPE_WIZARD_LOCK });
        } else {
            let mon;
            if (game.level.at(x, y).looted !== T_LOOTED
                && (mon = await makemon(courtmon(), x, y, NO_MM_FLAGS))) {
                freeinv(goldob);
                add_to_minv(mon, goldob);
                await pline('The exchequer accepts your contribution.');
                if (!rn2(10))
                    game.level.at(x, y).looted = T_LOOTED;
            } else {
                await You(`drop ${doname(goldob)}.`);
                await dropx(goldob);
            }
        }
    }
    return true;
}

function tip_ok(obj) {
    if (!obj || obj.oclass === OCLASSES.COIN_CLASS)
        return GETOBJ_EXCLUDE;
    if (Is_container(obj)
        || (obj.otyp === ONAMES.HORN_OF_PLENTY && obj.dknown
            && game.objects[obj.otyp].oc_name_known))
        return GETOBJ_SUGGEST;
    return GETOBJ_DOWNPLAY;
}

const TIPCHECK_OK = 0, TIPCHECK_LOCKED = 1, TIPCHECK_TRAPPED = 2,
      TIPCHECK_CANNOT = 3, TIPCHECK_EMPTY = 4;

// src/pickup.c:3871 tipcontainer_gettarget(), including a deselected floor
// entry, which still means floor rather than cancellation.
export async function tipcontainer_gettarget(box, cancelled) {
    const { tty_start_menu, tty_add_menu, tty_add_menu_str, tty_end_menu,
            tty_select_menu, ATR_NONE } = await import('./tty/wintty.js');
    const { MENU_BEHAVE_STANDARD, MENU_ITEMFLAGS_NONE,
            MENU_ITEMFLAGS_SELECTED, PICK_ONE } = await import('./const.js');
    const win = tty_create_nhwindow(NHW_MENU), dummyobj = {};
    tty_start_menu(win, MENU_BEHAVE_STANDARD);
    tty_add_menu(win, null, dummyobj, '-', 0, ATR_NONE, NO_COLOR,
                 'on the floor', MENU_ITEMFLAGS_SELECTED);
    tty_add_menu_str(win, '');
    let n_conts = 0, hands_available = true;
    for (const otmp of game.invent || []) {
        if (otmp === box || !Is_container(otmp)
            || (otmp.otyp === ONAMES.BAG_OF_TRICKS && otmp.dknown
                && game.objects[otmp.otyp].oc_name_known))
            continue;
        if (!n_conts++)
            hands_available = await u_handsy();
        const exclude_it = !hands_available || (otmp.olocked && otmp.lknown);
        tty_add_menu(win, null, exclude_it ? 0 : otmp,
                     exclude_it ? 0 : otmp.invlet, 0, ATR_NONE, NO_COLOR,
                     `${exclude_it ? '    ' : ''}${doname(otmp)}`, MENU_ITEMFLAGS_NONE);
    }
    tty_end_menu(win, `Where to tip the contents of ${doname(box)}`);
    const picks = await tty_select_menu(win, PICK_ONE);
    tty_destroy_nhwindow(win);
    let otmp = picks[0] || null;
    if (picks.length > 1 && otmp === dummyobj)
        otmp = picks[1];
    if (otmp === dummyobj)
        otmp = null;
    cancelled.v = !!picks.cancelled;
    return otmp;
}

// src/pickup.c:3954 tipcontainer_checks(), shared by source and destination.
export async function tipcontainer_checks(box, targetbox, allowempty) {
    const { bagotricks } = await import('./apply.js');
    if (targetbox && targetbox.otyp === ONAMES.BAG_OF_TRICKS) {
        await bagotricks(targetbox, false, { count: 0 });
        return TIPCHECK_CANNOT;
    }
    if (!box.lknown) {
        box.lknown = 1;
        if (carried(box))
            update_inventory();
    }
    if (box.olocked) {
        await pline(`${upstart(thesimpleoname(box))} is locked.`);
        return TIPCHECK_LOCKED;
    } else if (box.otrapped) {
        const { chest_trap } = await import('./trap.js');
        await chest_trap(box, HAND, false);
        if (game.multi >= 0) {
            nomul(-1);
            game.multi_reason = 'tipping a container';
            game.nomovemsg = '';
        }
        return TIPCHECK_TRAPPED;
    } else if (box.otyp === ONAMES.BAG_OF_TRICKS
               || box.otyp === ONAMES.HORN_OF_PLENTY) {
        const bag = box.otyp === ONAMES.BAG_OF_TRICKS, old_spe = box.spe;
        const maybeshopgoods = !carried(box) && costly_spot(box.ox, box.oy);
        const cc = { x: game.u.ux, y: game.u.uy };
        if (targetbox) {
            const res = await tipcontainer_checks(targetbox, null, true);
            if (res !== TIPCHECK_OK)
                return res;
        }
        if (get_obj_location(box, cc, 0)) {
            box.ox = cc.x;
            box.oy = cc.y;
        }
        if (maybeshopgoods && !box.no_charge)
            await addtobill(box, false, false, true);
        const seen = { count: 0 };
        let totseen = 0;
        do {
            if (!(bag ? await bagotricks(box, true, seen)
                      : await hornoplenty(box, true, targetbox)))
                break;
            totseen += seen.count;
        } while (box.spe > 0);
        if (box.spe < old_spe) {
            if (bag && !totseen)
                await pline(nothing_seems_to_happen);
            box.spe = old_spe;
            await check_unpaid_usage(box, true);
            box.spe = 0;
            box.cknown = 1;
        }
        if (maybeshopgoods && !box.no_charge)
            await subfrombill(box, shop_keeper(in_rooms(cc.x, cc.y, SHOPBASE).charCodeAt(0)));
        return TIPCHECK_CANNOT;
    } else if (SchroedingersBox(box)) {
        await observe_quantum_cat(box, true, true);
        const empty_it = !!Has_contents(box);
        if (!empty_it)
            await pline(`${Shk_Your(box)}box is now empty.`);
        box.cknown = 1;
        return empty_it || allowempty ? TIPCHECK_OK : TIPCHECK_EMPTY;
    } else if (!allowempty && !Has_contents(box)) {
        box.cknown = 1;
        await pline(`${upstart(thesimpleoname(box))} is empty.`);
        return TIPCHECK_EMPTY;
    }
    return TIPCHECK_OK;
}

// src/pickup.c:3688 tipcontainer(), route every removed object through
// container insertion, high-drop effects, or the ordinary floor path.
export async function tipcontainer(box) {
    const cc = { x: game.u.ux, y: game.u.uy };
    if (get_obj_location(box, cc, 0)) {
        box.ox = cc.x;
        box.oy = cc.y;
    }
    const cancelled = { v: false };
    let targetbox = await tipcontainer_gettarget(box, cancelled);
    if (cancelled.v)
        return;
    const maybeshopgoods = !carried(box) && costly_spot(box.ox, box.oy);
    if (await tipcontainer_checks(box, targetbox, false) !== TIPCHECK_OK)
        return;
    if (targetbox && await tipcontainer_checks(targetbox, null, true) !== TIPCHECK_OK)
        return;
    let highdrop = !can_reach_floor(true), altarizing = IS_ALTAR(game.level.at(cc.x, cc.y).typ);
    const cursed_mbag = Is_mbag(box) && box.cursed;
    const srcheld = carried(box), dstheld = !!targetbox && carried(targetbox);
    if (game.u.uswallow)
        highdrop = altarizing = false;
    let terse = !(highdrop || altarizing || costly_spot(box.ox, box.oy)), loss = 0;
    box.cknown = 1;
    const contents = [...box.cobj];
    if (targetbox)
        await pline(`${contents.length > 1 ? 'Objects tumble' : 'An object tumbles'} into ${the(xname(targetbox))}.`);
    else
        await pline(`${contents.length > 1 ? 'Objects spill' : 'An object spills'} out${terse ? ':' : '.'}`);
    for (let i = 0; i < contents.length; ++i) {
        const otmp = contents[i];
        let stop = false;
        obj_extract_self(otmp);
        otmp.ox = box.ox;
        otmp.oy = box.oy;
        if (box.otyp === ONAMES.ICE_BOX) {
            await removed_from_icebox(otmp);
        } else if (cursed_mbag && is_boh_item_gone()) {
            loss += await mbag_item_gone(srcheld, otmp, false);
            terse = false;
            continue;
        }
        if (maybeshopgoods) {
            await addtobill(otmp, false, false, true);
            game.iflags.suppress_price = (game.iflags.suppress_price || 0) + 1;
        }
        if (targetbox) {
            if (Is_mbag(targetbox) && mbag_explodes(otmp, 0)) {
                livelog_printf(LL_ACHIEVE, `just blew up ${uhis()} bag of holding via tipping`);
                await urgent_pline(`As ${doname(otmp)} ${otense(otmp, 'tumble')} inside, you are blasted by a magical explosion!`);
                if (otmp.otyp === ONAMES.BAG_OF_HOLDING)
                    await do_boh_explosion(otmp, !srcheld);
                obfree(otmp);
                await do_boh_explosion(targetbox, !dstheld);
                if (dstheld)
                    useup(targetbox);
                else
                    await useupf(targetbox, targetbox.quan);
                targetbox = null;
                stop = true;
                await losehp(d(6, 6), 'magical explosion', KILLED_BY_AN);
            } else {
                add_to_container(targetbox, otmp);
            }
        } else if (highdrop) {
            otmp.how_lost = LOST_DROPPED;
            await hitfloor(otmp, true);
        } else {
            if (altarizing)
                await doaltarobj(otmp);
            else if (!terse)
                await pline(`${Doname2(otmp)} ${otense(otmp, 'drop')} to the ${surface(cc.x, cc.y)}.`);
            else {
                await pline(`${doname(otmp)}${i + 1 < contents.length ? ',' : '.'}`);
                game.iflags.last_msg = PLNMSG_OBJNAM_ONLY;
            }
            otmp.how_lost = LOST_DROPPED;
            await dropy(otmp);
            if (game.iflags.last_msg !== PLNMSG_OBJNAM_ONLY)
                terse = false;
        }
        if (maybeshopgoods)
            game.iflags.suppress_price--;
        if (stop)
            break;
    }
    if (loss)
        await You(`owe ${loss} ${currency(loss)} for lost merchandise.`);
    box.owt = weight(box);
    if (targetbox)
        targetbox.owt = weight(targetbox);
    if (srcheld || dstheld) {
        await encumber_msg();
        update_inventory();
    }
}

// src/pickup.c:3562 dotip(): floor-container selection and carried horn of
// plenty emptying.
export async function dotip() {
    const here = (game.level?.objects || [])
        .filter(o => o.ox === game.u.ux && o.oy === game.u.uy
                     && Is_container(o));
    if (here.length === 1) {
        const { tty_yn_function } = await import('./tty/topl.js');
        const c = await tty_yn_function(
            `There is ${doname(here[0])} here, tip it?`, 'ynq', 'q');
        if (c === 'q')
            return ECMD_OK;
        if (c === 'y') {
            await tipcontainer(here[0]);
            return ECMD_TIME;
        }
    }

    const cobj = await getobj('tip', tip_ok, GETOBJ_PROMPT);
    if (!cobj)
        return ECMD_CANCEL;
    if (Is_container(cobj) || cobj.otyp === ONAMES.HORN_OF_PLENTY) {
        await tipcontainer(cobj);
        return ECMD_TIME;
    }

    let spillage = null;
    if (cobj.otyp === ONAMES.CAN_OF_GREASE && cobj.spe > 0) {
        spillage = 'grease';
    } else if (cobj.otyp === ONAMES.FOOD_RATION
               || cobj.otyp === ONAMES.CRAM_RATION
               || cobj.otyp === ONAMES.LEMBAS_WAFER) {
        spillage = 'crumbs';
    } else if (cobj.oclass === OCLASSES.VENOM_CLASS) {
        spillage = 'venom';
    }
    if (spillage) {
        let suffix = '';
        if (is_pool(game.u.ux, game.u.uy))
            suffix = ` and gradually ${vtense(spillage, 'dissipate')}`;
        else if (is_lava(game.u.ux, game.u.uy))
            suffix = ` and immediately ${vtense(spillage, 'burn')} away`;
        await pline(`Some ${spillage} ${vtense(spillage, 'spill')} onto the ${
            surface(game.u.ux, game.u.uy)}${suffix}.`);
        if (cobj.otyp === ONAMES.CAN_OF_GREASE) {
            const { consume_obj_charge } = await import('./apply.js');
            await consume_obj_charge(cobj, true);
        }
        return ECMD_TIME;
    }

    if (cobj.oclass === OCLASSES.POTION_CLASS) {
        await pline(`${The(xname(cobj))} ${otense(cobj, 'are')} securely sealed.`);
    } else if (cobj.otyp === ONAMES.STATUE) {
        await pline('Nothing interesting happens.');
    } else {
        await pline(nothing_happens);
    }
    return ECMD_OK;
}

/* ================================================================== *
 * Container interaction: src/pickup.c:2558-3480.
 * ================================================================== */


// src/pickup.c:469 menu_class_present()
export function menu_class_present(c) {
    return !!(c && (game.valid_menu_classes || '').includes(
        typeof c === 'number' ? String.fromCharCode(c) : c));
}

// src/pickup.c:475 add_valid_menu_class()
export function add_valid_menu_class(c) {
    if (c === 0) { /* reset */
        game.valid_menu_classes = '';
        game.class_filter = game.bucx_filter = game.shop_filter = false;
        game.picked_filter = false;
    } else if (!menu_class_present(c)) {
        const ch = typeof c === 'number' ? String.fromCharCode(c) : c;
        game.valid_menu_classes = (game.valid_menu_classes || '') + ch;
        switch (ch) {
        case 'B': case 'U': case 'C': case 'X':
            game.bucx_filter = true;
            break;
        case 'P':
            game.picked_filter = true;
            break;
        case 'u':
            game.shop_filter = true;
            break;
        default:
            game.class_filter = true;
            break;
        }
    }
}

/* src/pickup.c:523 allow_category() — see the C's long comment: with more
   than one filter TYPE active, an object must match one entry of EACH type */
export function allow_category(obj) {
    if (!game.class_filter && !game.shop_filter && !game.bucx_filter
        && !game.picked_filter && !(paranoia_bits() & PARANOID_AUTOALL))
        return false;

    if (obj.oclass === OCLASSES.COIN_CLASS && game.class_filter)
        return menu_class_present(OCLASSES.COIN_CLASS);

    /* Role_if(PM_CLERIC): priests automatically sense bless/curse state */
    if (Role_if(PMNAMES.PM_CLERIC) && !obj.bknown)
        set_bknown(obj, 1);

    if (game.class_filter && !menu_class_present(obj.oclass))
        return false;
    if (game.shop_filter && !obj.unpaid
        && !(Has_contents(obj) && count_unpaid(obj.cobj) > 0))
        return false;
    if (game.bucx_filter) {
        let bucx = !obj.bknown ? 'X'
                   : obj.blessed ? 'B' : obj.cursed ? 'C' : 'U';
        /* coins get treated as either 'U' or 'X' depending on goldX */
        if (obj.oclass === OCLASSES.COIN_CLASS)
            bucx = game.flags?.goldX ? 'X' : 'U';
        if (!menu_class_present(bucx))
            return false;
    }
    if (game.picked_filter && !obj.pickup_prev)
        return false;
    return true;
}

// src/pickup.c:609 is_worn_by_type()
export function is_worn_by_type(otmp) {
    return is_worn(otmp) && allow_category(otmp);
}

// src/pickup.c:635 count_justpicked()
export function count_justpicked(olist) {
    let cnt = 0;
    for (const otmp of olist || [])
        if (otmp.pickup_prev) ++cnt;
    return cnt;
}

// src/pickup.c:650 find_justpicked()
export function find_justpicked(olist) {
    for (const otmp of olist || [])
        if (otmp.pickup_prev) return otmp;
    return null;
}

/* src/pickup.c:1511 count_categories() */
export function count_categories(olist, qflags) {
    let ccount = 0;
    const do_worn = (qflags & WORN_TYPES) !== 0;
    for (const oclass of inv_order()) {
        if ((olist || []).some(obj => obj.oclass === oclass
            && (!do_worn || (obj.owornmask
                            & (W_ARMOR | W_ACCESSORY | W_WEAPONS)))))
            ++ccount;
    }
    return ccount;
}

/* include/hack.h query_category qflags */
import { BILLED_TYPES } from './const.js';
const ALL_TYPES = 0x0020, UNPAID_TYPES = 0x0004, WORN_TYPES = 0x0010,
      CHOOSE_ALL = 0x0080,
      BUC_BLESSED = 0x0100, BUC_CURSED = 0x0200, BUC_UNCURSED = 0x0400,
      BUC_UNKNOWN = 0x0800, BUCX_TYPES = 0x0f00, JUSTPICKED = 0x1000,
      INCLUDE_VENOM = 0x0002, INVORDER_SORT = 0x0010;
const ALL_TYPES_SELECTED = -2;

// src/pickup.c:1226 query_category() — the "what type of objects?" menu.
// Returns the list of picked category codes ('A', class symbols' char
// codes, ALL_TYPES_SELECTED, 'B'/'U'/'C'/'X'). Identifiers in the tty
// menu are the codes themselves (offset by +1000 to keep them non-zero
// is unnecessary: all are non-zero already).
export async function query_category(qstr, olist, qflags, how = PICK_ANY) {
    const { tty_create_nhwindow, tty_start_menu, tty_add_menu,
            tty_add_menu_str, tty_end_menu,
            tty_select_menu, tty_destroy_nhwindow, ATR_NONE,
            NHW_MENU } = await import('./tty/wintty.js');
    const { MENU_ITEMFLAGS_SKIPINVERT }
        = await import('./const.js');
    if (!olist || !olist.length)
        return [];

    const do_worn = (qflags & WORN_TYPES) !== 0;
    const ofilter = do_worn ? is_worn : null;
    const do_unpaid = (qflags & UNPAID_TYPES) !== 0 && count_unpaid(olist);
    const do_usedup = (qflags & BILLED_TYPES) !== 0;
    let num_buc_types = 0;
    const do_blessed = (qflags & BUC_BLESSED) !== 0
                       && count_buc(olist, BUC_BLESSED, ofilter) && ++num_buc_types;
    const do_cursed = (qflags & BUC_CURSED) !== 0
                      && count_buc(olist, BUC_CURSED, ofilter) && ++num_buc_types;
    const do_uncursed = (qflags & BUC_UNCURSED) !== 0
                        && count_buc(olist, BUC_UNCURSED, ofilter) && ++num_buc_types;
    const do_buc_unknown = (qflags & BUC_UNKNOWN) !== 0
                           && count_buc(olist, BUC_UNKNOWN, ofilter) && ++num_buc_types;
    const num_justpicked = (qflags & JUSTPICKED) !== 0
        ? count_justpicked(olist) : 0;

    const ccount = count_categories(olist, qflags);
    /* no point in actually showing a menu for a single category */
    if (ccount === 1 && !do_unpaid && !do_usedup && num_buc_types <= 1) {
        const curr = olist.find((obj) => !ofilter || ofilter(obj));
        return curr ? [curr.oclass] : [];
    }

    const win = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(win, MENU_BEHAVE_STANDARD);

    const pack = [...inv_order()];
    if (qflags & INCLUDE_VENOM)
        pack.push(OCLASSES.VENOM_CLASS);
    const show_a = (qflags & ALL_TYPES) !== 0 && ccount > 1;
    let verify_All = false;

    if ((qflags & CHOOSE_ALL) !== 0) {
        tty_add_menu(win, null, 'A'.charCodeAt(0), 'A', 0, ATR_NONE,
                     NO_COLOR, do_worn
                         ? 'Auto-select every item being worn or wielded'
                         : 'Auto-select every relevant item',
                     MENU_ITEMFLAGS_SKIPINVERT);
        verify_All = how === PICK_ANY && !!(paranoia_bits() & PARANOID_AUTOALL);
        if (!verify_All) {
            const prior = game.A_first_hint ?? 0;
            game.A_first_hint = prior + 1;
            if (!prior || boolean_option('cmdassist'))
                tty_add_menu_str(win,
                    '    (ignored unless some other choices are also picked)');
        } else if (show_a) {
            const prior = game.A_second_hint ?? 0;
            game.A_second_hint = prior + 1;
            if (!prior || boolean_option('cmdassist'))
                tty_add_menu_str(win,
                    "    (if no other choices are picked, 'a' is implied)");
        }
        tty_add_menu_str(win, '');
    }

    /* C assigns invlet explicitly, 'a' for All types then b,c,... for
       each class present */
    let invlet = 'a';
    if (show_a) {
        tty_add_menu(win, null, ALL_TYPES_SELECTED, invlet, 0, ATR_NONE,
                     NO_COLOR, do_worn ? 'All worn and wielded types' : 'All types',
                     MENU_ITEMFLAGS_SKIPINVERT);
        invlet = String.fromCharCode(invlet.charCodeAt(0) + 1);
    }

    /* one entry per class present, in packorder (inv_order() already
       yields class numbers) */
    for (const oclass of pack) {
        if (!olist.some(o => o.oclass === oclass
                             && (!ofilter || ofilter(o))))
            continue;
        tty_add_menu(win, null, oclass, invlet, def_oc_syms[oclass],
                     ATR_NONE, NO_COLOR,
                     let_to_name(oclass, false,
                         how !== PICK_NONE && game.iflags.menu_head_objsym),
                     MENU_ITEMFLAGS_NONE);
        invlet = String.fromCharCode(invlet.charCodeAt(0) + 1);
        if (invlet >= 'u') {
            await impossible('query_category: too many categories');
            tty_destroy_nhwindow(win);
            return [];
        }
    }

    if (do_unpaid || do_usedup || num_buc_types > 0 || num_justpicked)
        tty_add_menu_str(win, '');
    if (do_unpaid)
        tty_add_menu(win, null, 'u'.charCodeAt(0), 'u', 0, ATR_NONE,
                     NO_COLOR, 'Unpaid items', MENU_ITEMFLAGS_SKIPINVERT);
    if (do_usedup)
        tty_add_menu(win, null, 'x'.charCodeAt(0), 'x', 0, ATR_NONE,
                     NO_COLOR, 'Unpaid items already used up', MENU_ITEMFLAGS_SKIPINVERT);
    /* the BUCX cluster is in alphabetical order (B, C, U, X), reversing
       the usual U/C sequence, and every entry skips bulk inverts */
    if (do_blessed)
        tty_add_menu(win, null, 'B'.charCodeAt(0), 'B', 0, ATR_NONE,
                     NO_COLOR, 'Items known to be Blessed',
                     MENU_ITEMFLAGS_SKIPINVERT);
    if (do_cursed)
        tty_add_menu(win, null, 'C'.charCodeAt(0), 'C', 0, ATR_NONE,
                     NO_COLOR, 'Items known to be Cursed',
                     MENU_ITEMFLAGS_SKIPINVERT);
    if (do_uncursed)
        tty_add_menu(win, null, 'U'.charCodeAt(0), 'U', 0, ATR_NONE,
                     NO_COLOR, 'Items known to be Uncursed',
                     MENU_ITEMFLAGS_SKIPINVERT);
    if (do_buc_unknown)
        tty_add_menu(win, null, 'X'.charCodeAt(0), 'X', 0, ATR_NONE,
                     NO_COLOR, 'Items of unknown Bless/Curse status',
                     MENU_ITEMFLAGS_SKIPINVERT);
    if (num_justpicked) {
        const jp = find_justpicked(olist);
        const buf = (num_justpicked === 1 && jp)
                    ? `Just picked up: ${doname(jp)}`
                    : 'Items you just picked up';
        tty_add_menu(win, null, 'P'.charCodeAt(0), 'P', 0, ATR_NONE,
                     NO_COLOR, buf, MENU_ITEMFLAGS_SKIPINVERT);
    }
    tty_end_menu(win, qstr);
    let picks = await tty_select_menu(win, how);
    const all = 'A'.charCodeAt(0);
    if (picks.length && verify_All) {
        const i = picks.indexOf(all);
        if (i >= 0) {
            const answer = await paranoid_ynq(paranoia_bits() & PARANOID_CONFIRM,
                'Really autoselect All?', true);
            if (answer === 'n' && picks.length > 1) {
                picks.splice(i, 1);
                picks.counts?.delete(all);
            } else if (answer === 'n' && (qflags & ALL_TYPES)) {
                picks[0] = ALL_TYPES_SELECTED;
                if (picks.counts?.has(all)) {
                    picks.counts.set(ALL_TYPES_SELECTED, picks.counts.get(all));
                    picks.counts.delete(all);
                }
            } else if (answer !== 'y') {
                picks = [];
            }
        }
    } else if (picks.length === 1 && !verify_All && picks[0] === all) {
        picks = [];
        await pline('No relevant items selected.');
    }
    tty_destroy_nhwindow(win);
    /* tty_select_menu() already dismisses the window while status output is
       suppressed. A second docrt() here would repaint status cells which C
       deliberately leaves cleared after a tall category menu. */
    return picks;
}

// src/do_wear.c menu_remarm(), default MENU_FULL category prompt.
export async function query_remove_categories(olist) {
    return query_category(
        'What type of things do you want to take off?', olist,
        WORN_TYPES | ALL_TYPES | UNPAID_TYPES | BUCX_TYPES,
        2 /* PICK_ANY */);
}

// src/do.c:994 menu_drop() category flags for MENU_FULL.
export async function query_drop_categories(olist) {
    return query_category(
        'Drop what type of items?', olist,
        UNPAID_TYPES | ALL_TYPES | CHOOSE_ALL | BUC_BLESSED | BUC_CURSED
        | BUC_UNCURSED | BUC_UNKNOWN | JUSTPICKED | INCLUDE_VENOM);
}

// src/pickup.c:2488 mbag_explodes() -- recursively decide whether an object
// placed into a magical bag triggers an explosion.
function mbag_explodes(obj, depthin) {
    if ((obj.otyp === ONAMES.WAN_CANCELLATION
         || obj.otyp === ONAMES.BAG_OF_TRICKS)
        && obj.spe <= 0)
        return false;

    if ((Is_mbag(obj) || obj.otyp === ONAMES.WAN_CANCELLATION)
        && rn2(1 << Math.min(depthin, 7)) <= depthin)
        return true;

    for (const contained of (obj.cobj || []))
        if (mbag_explodes(contained, depthin + 1))
            return true;

    return false;
}


// src/pickup.c:2510 is_boh_item_gone()
export function is_boh_item_gone() {
    return !rn2(13);
}

// src/pickup.c:2518 do_boh_explosion() -- remove a magical bag's contents,
// destroying a small random fraction and scattering everything else.
async function do_boh_explosion(boh, onFloor) {
    boh.in_use = 1;
    for (const obj of [...(boh.cobj || [])]) {
        if (is_boh_item_gone()) {
            obj_extract_self(obj);
            await mbag_item_gone(!onFloor, obj, true);
        } else {
            obj.ox = game.u.ux;
            obj.oy = game.u.uy;
            await scatter(game.u.ux, game.u.uy, 4, MAY_HIT | MAY_DESTROY, obj);
        }
    }
}

// src/pickup.c:2537 boh_loss() -- opening a cursed magical bag gives every
// contained object an independent one-in-thirteen chance to vanish.
async function boh_loss(container, held) {
    let loss = 0;
    if (Is_mbag(container) && container.cursed && Has_contents(container)) {
        for (const item of [...container.cobj]) {
            if (is_boh_item_gone()) {
                obj_extract_self(item);
                loss += await mbag_item_gone(held, item, false);
            }
        }
    }
    return loss;
}

// src/pickup.c:2558 in_container()
export async function in_container(obj) {
    const floor_container = !game.current_container || !carried(game.current_container);
    let was_unpaid = false;
    if (!game.current_container) {
        await impossible('<in> no gc.current_container?');
        return 0;
    } else if (obj === game.u.uball || obj === game.u.uchain) {
        await You('must be kidding.');
        return 0;
    } else if (obj === game.current_container) {
        await pline('That would be an interesting topological exercise.');
        return 0;
    } else if (obj.owornmask & (W_ARMOR | W_ACCESSORY)) {
        await Norep(`You cannot ${game.current_container.otyp === ONAMES.ICE_BOX ? 'refrigerate' : 'stash'} something you are wearing.`);
        return 0;
    } else if (obj.otyp === ONAMES.LOADSTONE && obj.cursed) {
        set_bknown(obj, 1);
        await pline_The(`stone${obj.quan === 1 ? '' : 's'} won't leave your person.`);
        return 0;
    } else if (obj.otyp === ONAMES.AMULET_OF_YENDOR
        || obj.otyp === ONAMES.CANDELABRUM_OF_INVOCATION
        || obj.otyp === ONAMES.BELL_OF_OPENING
        || obj.otyp === ONAMES.SPE_BOOK_OF_THE_DEAD) {
        await pline(`${The(xname(obj))} cannot be confined in such trappings.`);
        return 0;
    } else if (obj.otyp === ONAMES.LEASH && obj.leashmon) {
        await pline(`${Tobjnam(obj, 'are')} attached to your pet.`);
        return 0;
    } else if (obj === game.u.uwep) {
        if (welded(obj)) {
            await weldmsg(obj);
            return 0;
        }
        await setuwep_with_feedback(null);
        if (game.u.uwep) return 0;
    } else if (obj === game.u.uswapwep) {
        setuswapwep(null);
    } else if (obj === game.u.uquiver) {
        setuqwep(null);
    }
    if (await fatal_corpse_mistake(obj, false)) return -1;
    if (obj.otyp === ONAMES.ICE_BOX || Is_box_p(obj) || obj.otyp === ONAMES.BOULDER
        || (obj.otyp === ONAMES.STATUE && bigmonst(game.mons[obj.corpsenm]))) {
        const buf = the(xname(obj));
        await You(`cannot fit ${buf} into ${the(xname(game.current_container))}.`);
        return 0;
    }
    freeinv(obj);
    if (obj_is_burning(obj)) {
        const { snuff_lit } = await import('./apply.js');
        await snuff_lit(obj);
    }
    if (floor_container && costly_spot(game.u.ux, game.u.uy)) {
        if (obj.oclass !== OCLASSES.COIN_CLASS) {
            was_unpaid = !!obj.unpaid;
            if (game.sellobj_first) {
                sellobj_state(game.current_container.no_charge ? 2 : 1);
                game.sellobj_first = false;
            }
            await sellobj(obj, game.u.ux, game.u.uy);
        }
    }
    if (game.current_container.otyp === ONAMES.ICE_BOX && !age_is_relative(obj)) {
        obj.age = game.moves - obj.age;
        const { stop_timer, ROT_CORPSE, REVIVE_MON, SHRINK_GLOB } = await import('./timeout.js');
        if (obj.otyp === ONAMES.CORPSE) {
            if (obj.timed) {
                stop_timer(ROT_CORPSE, obj);
                stop_timer(REVIVE_MON, obj);
            }
            if (obj.corpsenm === PMNAMES.PM_ICE_TROLL && has_omonst(obj))
                OMONST(obj).mcan = 0;
        } else if (obj.globby && obj.timed) {
            stop_timer(SHRINK_GLOB, obj);
        }
    } else if (Is_mbag(game.current_container) && mbag_explodes(obj, 0)) {
        livelog_printf(LL_ACHIEVE, `just blew up ${uhis()} bag of holding`);
        await urgent_pline(`As you put ${doname(obj)} inside, you are blasted by a magical explosion!`);
        if (was_unpaid) await addtobill(obj, false, false, true);
        if (obj.otyp === ONAMES.BAG_OF_HOLDING)
            await do_boh_explosion(obj, obj.where === OBJ_FLOOR);
        obfree(obj);
        if (floor_container && costly_spot(game.current_container.ox, game.current_container.oy)) {
            const save_no_charge = game.current_container.no_charge;
            await addtobill(game.current_container, false, false, false);
            game.current_container.no_charge = save_no_charge;
        }
        await do_boh_explosion(game.current_container, floor_container);
        if (!floor_container) useup(game.current_container);
        else if (obj_here(game.current_container, game.u.ux, game.u.uy))
            await useupf(game.current_container, game.current_container.quan);
        else throw new Error('in_container:  bag not found.');
        await losehp(d(6, 6), 'magical explosion', KILLED_BY_AN);
        game.current_container = null;
    }
    if (game.current_container) {
        const buf = the(xname(game.current_container));
        await You(`put ${doname(obj)} into ${buf}.`);
        if (floor_container && obj.oclass === OCLASSES.COIN_CLASS)
            await sellobj(obj, game.current_container.ox, game.current_container.oy);
        add_to_container(game.current_container, obj);
        game.current_container.owt = weight(game.current_container);
    }
    await bot();
    return game.current_container ? 1 : -1;
}

// src/pickup.c:2721 ck_bag()
export function ck_bag(obj) {
    return !!game.current_container && obj !== game.current_container;
}

// src/pickup.c:2727 out_container()
export async function out_container(obj) {
    const is_gold = obj.oclass === OCLASSES.COIN_CLASS;
    if (!game.current_container) {
        await impossible('<out> no gc.current_container?');
        return -1;
    } else if (is_gold) obj.owt = weight(obj);
    if (obj.oartifact && !await touch_artifact(obj, game.youmonst)) return 0;
    if (await fatal_corpse_mistake(obj, false)) return -1;
    const count = { v: obj.quan };
    const res = await lift_object(obj, game.current_container, count, false);
    if (res <= 0) return res;
    if (obj.quan !== count.v && obj.otyp !== ONAMES.LOADSTONE)
        obj = splitobj(obj, count.v);
    obj_extract_self(obj);
    game.current_container.owt = weight(game.current_container);
    if (game.current_container.otyp === ONAMES.ICE_BOX) await removed_from_icebox(obj);
    if (!obj.unpaid && !carried(game.current_container)
        && costly_spot(game.current_container.ox, game.current_container.oy)) {
        obj.ox = game.current_container.ox;
        obj.oy = game.current_container.oy;
        await addtobill(obj, false, false, false);
    }
    if (is_pick(obj)) await pick_pick(obj);
    const otmp = await addinv(obj);
    await pickup_prinv(otmp, count.v, 'removing');
    if (is_gold) await bot();
    return 1;
}

// src/pickup.c:2781 removed_from_icebox()
export async function removed_from_icebox(obj) {
    if (!age_is_relative(obj)) {
        obj.age = game.moves - obj.age;
        if (obj.otyp === ONAMES.CORPSE) {
            const m = get_mtraits(obj, false);
            const iceT = m ? m.data === game.mons[PMNAMES.PM_ICE_TROLL]
                : obj.corpsenm === PMNAMES.PM_ICE_TROLL;
            obj.norevive = iceT ? 0 : 1;
            start_corpse_timeout(obj);
        } else if (obj.globby) start_glob_timeout(obj, 0);
    }
}

// src/pickup.c:2803 mbag_item_gone() -- finish deleting one object lost from
// a cursed or exploding magical bag. Shop billing remains explicit.
async function mbag_item_gone(held, item, silent) {
    let loss = 0;
    if (!silent) {
        if (item.dknown) {
            await pline(`${upstart(doname(item))} ${otense(item, 'have')} vanished!`);
        } else {
            await You(`${Blind() ? 'notice' : 'see'} ${doname(item)} disappear!`);
        }
    }
    const shkp = game.u.ushops && shop_keeper(game.u.ushops.charCodeAt(0));
    if (shkp && (held ? !!item.unpaid : costly_spot(game.u.ux, game.u.uy)))
        loss = await stolen_value(item, game.u.ux, game.u.uy, !!shkp.mpeaceful, true);
    obfree(item);
    return loss;
}

// src/pickup.c:2826 observe_quantum_cat()
export async function observe_quantum_cat(box, makecat, givemsg) {
    const sc = "Schroedinger's Cat", cc = {};
    let livecat = null;
    const itsalive = !rn2(2);
    if (get_obj_location(box, cc, 0)) {
        box.ox = cc.x;
        box.oy = cc.y;
    }
    let deadcat = box.cobj?.[0];
    if (itsalive) {
        if (makecat)
            livecat = makemon(game.mons[PMNAMES.PM_HOUSECAT], box.ox, box.oy,
                              NO_MINVENT | MM_ADJACENTOK | MM_NOMSG);
        if (livecat) {
            livecat.mpeaceful = 1;
            set_malign(livecat);
            if (givemsg) {
                if (!canspotmon(livecat)) await You(`think something brushed your ${body_part(FOOT)}.`);
                else await pline(`${Monnam(livecat)} inside the box is still alive!`);
            }
            christen_monst(livecat, sc);
            if (deadcat) {
                obj_extract_self(deadcat);
                obfree(deadcat);
                deadcat = null;
            }
            box.owt = weight(box);
            box.spe = 0;
            if (!game.context.mon_moving) {
                more_experienced(10, 20);
                await newexplevel();
            }
        }
    } else {
        box.spe = 0;
        if (givemsg) await pline_The(`${Hallucination() ? rndmonnam(null) : 'housecat'} inside the box is dead!`);
        if (deadcat) {
            deadcat.age = game.moves;
            set_corpsenm(deadcat, PMNAMES.PM_HOUSECAT);
            deadcat = oname(deadcat, sc, ONAME_NO_FLAGS);
            if (!game.context.mon_moving) {
                more_experienced(20, 10);
                await newexplevel();
            }
        }
    }
}

// src/pickup.c:2903 container_gone()
export function container_gone(fn) {
    return (fn === in_container || fn === out_container) && !game.current_container;
}

/* include/obj.h Is_box() — the local ONAMES spelling */
const Is_box_p = (o) => o.otyp === ONAMES.LARGE_BOX
                        || o.otyp === ONAMES.CHEST;

// src/pickup.c:2911 explain_container_prompt()
export async function explain_container_prompt(more_containers) {
    const explaintext = [
        'Container actions:', '',
        ' : -- Look: examine contents',
        ' o -- Out: take things out',
        ' i -- In: put things in',
        ' b -- Both: first take things out, then put things in',
        ' r -- Reversed: put things in, then take things out',
        ' s -- Stash: put one item in', '',
        ' n -- Next: loot next selected container',
        ' q -- Quit: finished',
        ' ? -- Help: display this text.', '',
    ];
    const win = tty_create_nhwindow(NHW_TEXT);
    for (const text of explaintext) {
        if (!more_containers && text.startsWith(' n ')) continue;
        tty_putstr(win, 0, text);
    }
    await tty_display_nhwindow(win);
    do {
        await xwaitforspace(' \r\n\x1b');
    } while (game.morc !== '\x1b' && tty_next_page(win));
    tty_destroy_nhwindow(win);
    await docrt();
}

// src/pickup.c:2943 u_handsy(); the hero has hands and one of them is free
export async function u_handsy() {
    if (nohands(game.youmonst.data)) {
        await You('have no hands!'); /* not `body_part(HAND)' */
        return false;
    } else if (!freehand()) {
        await You(`have no free ${body_part(HAND)}.`);
        return false;
    }
    return true;
}

// src/pickup.c:2957 stash_ok()
function stash_ok(obj) {
    if (!obj)
        return GETOBJ_EXCLUDE;
    if (!ck_bag(obj))
        return GETOBJ_EXCLUDE_SELECTABLE;
    return GETOBJ_SUGGEST;
}

// src/pickup.c:2972 use_container(); objp.o can be cleared by an explosion.
export async function use_container(objp, held, more_containers) {
    const obj = objp.o;
    let used = ECMD_OK, emptymsg = '';
    game.abort_looting = false;
    game.sellobj_first = true;
    if (!await u_handsy()) return ECMD_OK;
    if (!obj.lknown) {
        obj.lknown = 1;
        if (held) update_inventory();
    }
    if (obj.olocked) {
        await pline(`${Tobjnam(obj, 'are')} locked.`);
        if (held) await You('must put it down to unlock.');
        return ECMD_OK;
    } else if (obj.otrapped) {
        if (held) await You(`open ${the(xname(obj))}...`);
        const { chest_trap } = await import('./trap.js');
        await chest_trap(obj, HAND, false);
        if ((game.multi ?? 0) >= 0) {
            nomul(-1);
            game.multi_reason = 'opening a container';
            game.nomovemsg = '';
        }
        game.abort_looting = true;
        return ECMD_TIME;
    }
    game.current_container = obj;
    const quantum_cat = SchroedingersBox(game.current_container);
    if (quantum_cat) {
        await observe_quantum_cat(game.current_container, true, true);
        used = ECMD_TIME;
    }
    const cursed_mbag = Is_mbag(game.current_container)
        && game.current_container.cursed && Has_contents(game.current_container);
    let loss;
    if (cursed_mbag && (loss = await boh_loss(game.current_container, held)) !== 0) {
        used = ECMD_TIME;
        await You(`owe ${loss} ${currency(loss)} for lost merchandise.`);
        game.current_container.owt = weight(game.current_container);
    }
    let inokay = !!(game.invent?.length
        && (game.invent[0] !== game.current_container || game.invent.length > 1));
    const outokay = Has_contents(game.current_container);
    if (!outokay)
        emptymsg = `${Ysimple_name2(game.current_container)} is ${quantum_cat || cursed_mbag ? 'now ' : ''}empty.`;
    let c;
    for (;;) {
        const outmaybe = outokay || !game.current_container.cknown;
        const qbuf = !outmaybe
            ? safe_qbuf(null, ' is empty.  Do what with it?', game.current_container,
                        Yname2, Ysimple_name2, 'This')
            : safe_qbuf('Do what with ', '?', game.current_container,
                        yname, ysimple_name, 'it');
        if (game.flags.menu_style === MENU_PARTIAL || game.flags.menu_style === MENU_FULL) {
            if (!inokay && !outmaybe) c = 'b';
            else c = await in_or_out_menu(qbuf, game.current_container, outmaybe,
                                          inokay, used !== ECMD_OK, more_containers);
        } else {
            let pbuf = ':', xbuf = '';
            if (outmaybe) pbuf += 'o'; else xbuf += 'o';
            if (inokay) pbuf += 'i'; else xbuf += 'i';
            if (outmaybe) pbuf += 'b'; else xbuf += 'b';
            if (inokay) pbuf += 'rs'; else xbuf += 'rs';
            pbuf += ' ';
            if (more_containers) pbuf += 'n'; else xbuf += 'n';
            pbuf += 'q';
            if (boolean_option('cmdassist')) pbuf += ' or ?';
            else xbuf += '?';
            if (xbuf) pbuf += '\x1b' + xbuf;
            c = await tty_yn_function(qbuf, pbuf, more_containers ? 'n' : 'q', true);
        }
        if (c === '?') {
            await explain_container_prompt(more_containers);
        } else if (c === ':') {
            if (!game.current_container.cknown) used = ECMD_TIME;
            await container_contents([game.current_container], false, false, true);
        } else break;
    }
    if (c === 'q') game.abort_looting = true;
    containerdone: {
        if (c === 'n' || c === 'q') break containerdone;
        let loot_out = c === 'o' || c === 'b' || c === 'r';
        let loot_in = c === 'i' || c === 'b' || c === 'r';
        const loot_in_first = c === 'r';
        let stash_one = c === 's';
        if (loot_out && !loot_in_first) {
            if (!Has_contents(game.current_container)) {
                await pline(emptymsg);
                if (!game.current_container.cknown) used = ECMD_TIME;
                game.current_container.cknown = 1;
            } else {
                add_valid_menu_class(0);
                if (game.flags.menu_style === MENU_TRADITIONAL)
                    used |= await traditional_loot(false);
                else used |= (await menu_loot(0, false)) > 0 ? 1 : 0;
                add_valid_menu_class(0);
            }
            inokay = !!(game.invent?.length
                && (game.invent[0] !== game.current_container || game.invent.length > 1));
        }
        if ((loot_in || stash_one) && !inokay) {
            await You(`don't have anything${game.invent?.length ? ' else' : ''} to ${stash_one ? 'stash' : 'put in'}.`);
            loot_in = stash_one = false;
        }
        if (loot_in) {
            add_valid_menu_class(0);
            if (game.flags.menu_style === MENU_TRADITIONAL)
                used |= await traditional_loot(true);
            else used |= (await menu_loot(0, true)) > 0 ? 1 : 0;
            add_valid_menu_class(0);
        } else if (stash_one) {
            const otmp = await getobj('stash', stash_ok, GETOBJ_PROMPT | GETOBJ_ALLOWCNT);
            if (otmp) {
                if (await in_container(otmp)) used = 1;
                else await unsplitobj(otmp);
            }
        }
        if (!game.current_container) loot_out = false;
        if (loot_out && loot_in_first) {
            if (!Has_contents(game.current_container)) {
                await pline(emptymsg);
                if (!game.current_container.cknown) used = 1;
                game.current_container.cknown = 1;
            } else {
                add_valid_menu_class(0);
                if (game.flags.menu_style === MENU_TRADITIONAL)
                    used |= await traditional_loot(false);
                else used |= (await menu_loot(0, false)) > 0 ? 1 : 0;
                add_valid_menu_class(0);
            }
        }
    }
    if (used) {
        if (game.current_container) game.current_container.cknown = 1;
        update_inventory();
    }
    sellobj_state(0); /* SELL_NORMAL */
    objp.o = game.current_container;
    if (game.current_container) game.current_container = null;
    else game.abort_looting = true;
    return used;
}

// src/pickup.c:3230 traditional_loot()
export async function traditional_loot(put_in) {
    let action, objlist, actionfunc, checkfunc;
    const selection = [], one_by_one = {}, allflag = {}, menu_on_request = { v: 0 };
    let used = ECMD_OK;
    if (put_in) {
        action = 'put in';
        objlist = game.invent;
        actionfunc = in_container;
        checkfunc = ck_bag;
    } else {
        action = 'take out';
        objlist = game.current_container.cobj;
        actionfunc = out_container;
        checkfunc = null;
        game.pickup_encumbrance = 0;
    }
    if (await query_classes(selection, one_by_one, allflag, action, objlist, false, menu_on_request)) {
        if (await askchain(objlist, one_by_one.v ? null : selection, allflag.v,
                           actionfunc, checkfunc, 0, action))
            used = ECMD_TIME;
    } else if (menu_on_request.v < 0) {
        used = (await menu_loot(menu_on_request.v, put_in)) > 0 ? 1 : 0;
    }
    return used;
}

// src/pickup.c:3265 menu_loot()
export async function menu_loot(retry, put_in) {
    let n_looted = 0, all_categories = true, loot_everything = false, autopick = false;
    let loot_justpicked = false, count = 0;
    const action = put_in ? 'Put in' : 'Take out';
    game.pickup_encumbrance = 0;
    if (retry) {
        all_categories = retry === -2;
    } else if (game.flags.menu_style === MENU_FULL) {
        all_categories = false;
        const picks = await query_category(`${action} what type of objects?`,
            put_in ? game.invent : game.current_container.cobj,
            ALL_TYPES | UNPAID_TYPES | BUCX_TYPES | CHOOSE_ALL | JUSTPICKED);
        if (!picks.length) return ECMD_OK;
        for (const pick of picks) {
            if (pick === 'A'.charCodeAt(0)) {
                loot_everything = autopick = true;
            } else if (put_in && pick === 'P'.charCodeAt(0)) {
                loot_justpicked = true;
                count = Math.max(0, picks.counts?.get(pick) ?? -1);
                add_valid_menu_class(pick);
                loot_everything = false;
            } else if (pick === ALL_TYPES_SELECTED) {
                all_categories = true;
            } else {
                add_valid_menu_class(pick);
                loot_everything = false;
            }
        }
    }
    if (autopick) {
        let inout_func, firstobj;
        if (!put_in) {
            game.current_container.cknown = 1;
            inout_func = out_container;
            firstobj = game.current_container.cobj;
        } else {
            inout_func = in_container;
            firstobj = game.invent;
        }
        let otmp = firstobj?.[0];
        while (otmp && game.current_container) {
            const otmp2 = firstobj[firstobj.indexOf(otmp) + 1];
            if (loot_everything || all_categories || allow_category(otmp)) {
                const res = await inout_func(otmp);
                if (res < 0) break;
                n_looted += res;
            }
            otmp = otmp2;
        }
    } else if (put_in && loot_justpicked && count_justpicked(game.invent) === 1) {
        let otmp = find_justpicked(game.invent);
        if (otmp) {
            n_looted = 1;
            if (count > 0 && count < otmp.quan) otmp = splitobj(otmp, count);
            await in_container(otmp);
        }
    } else {
        let mflags = INVORDER_SORT | INCLUDE_VENOM;
        if (put_in && game.flags.fixinv !== false) mflags |= USE_INVLET;
        if (put_in && loot_justpicked) mflags |= JUSTPICKED;
        if (!put_in) game.current_container.cknown = 1;
        const picks = await query_objlist(`${action} what?`,
            put_in ? game.invent : game.current_container.cobj, mflags,
            PICK_ANY, all_categories ? allow_all : allow_category);
        if (picks.length) {
            n_looted = picks.length;
            for (const selected of picks) {
                let otmp = selected;
                count = picks.counts?.get(selected) ?? otmp.quan;
                if (count > 0 && count < otmp.quan) otmp = splitobj(otmp, count);
                const res = put_in ? await in_container(otmp) : await out_container(otmp);
                if (res <= 0) {
                    if (!game.current_container) otmp = null;
                    else if (otmp && otmp !== selected) await unsplitobj(otmp);
                    if (res < 0) break;
                }
            }
        }
    }
    return n_looted ? ECMD_TIME : ECMD_OK;
}

// src/pickup.c:3397 in_or_out_menu() — "Do what with <container>?"
async function in_or_out_menu(prompt, obj, outokay, inokay, alreadyused,
                              more_containers) {
    const { tty_create_nhwindow, tty_start_menu, tty_add_menu,
            tty_add_menu_str, tty_end_menu, tty_display_nhwindow,
            tty_select_menu, tty_destroy_nhwindow, ATR_NONE, NHW_MENU }
        = await import('./tty/wintty.js');
    const { MENU_BEHAVE_STANDARD, MENU_ITEMFLAGS_NONE,
            MENU_ITEMFLAGS_SELECTED, PICK_ONE }
        = await import('./const.js');
    const { docrt } = await import('./display.js');

    /* underscore is not a choice; it's used to skip element [0] */
    const lootchars = '_:oibrsnq', abc_chars = '_:abcdenq';
    const menuselector = game.flags?.lootabc ? abc_chars : lootchars;

    const win = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(win, MENU_BEHAVE_STANDARD);

    tty_add_menu(win, null, 1, menuselector[1], 0, ATR_NONE, NO_COLOR,
                 `Look inside ${thesimpleoname(obj)}`, MENU_ITEMFLAGS_NONE);
    if (outokay)
        tty_add_menu(win, null, 2, menuselector[2], 0, ATR_NONE, NO_COLOR,
                     'take something out', MENU_ITEMFLAGS_NONE);
    if (inokay)
        tty_add_menu(win, null, 3, menuselector[3], 0, ATR_NONE, NO_COLOR,
                     'put something in', MENU_ITEMFLAGS_NONE);
    if (outokay)
        tty_add_menu(win, null, 4, menuselector[4], 0, ATR_NONE, NO_COLOR,
                     `${inokay ? 'both; ' : ''}take out, then put in`,
                     MENU_ITEMFLAGS_NONE);
    if (inokay) {
        tty_add_menu(win, null, 5, menuselector[5], 0, ATR_NONE, NO_COLOR,
                     `${outokay ? 'both reversed; ' : ''}put in, then take out`,
                     MENU_ITEMFLAGS_NONE);
        tty_add_menu(win, null, 6, menuselector[6], 0, ATR_NONE, NO_COLOR,
                     `stash one item into ${thesimpleoname(obj)}`,
                     MENU_ITEMFLAGS_NONE);
    }
    tty_add_menu_str(win, '');
    if (more_containers)
        tty_add_menu(win, null, 7, menuselector[7], 0, ATR_NONE, NO_COLOR,
                     'loot next container', MENU_ITEMFLAGS_SELECTED);
    tty_add_menu(win, null, 8, menuselector[8], 0, ATR_NONE, NO_COLOR,
                 alreadyused ? 'done' : 'do nothing',
                 more_containers ? MENU_ITEMFLAGS_NONE
                                 : MENU_ITEMFLAGS_SELECTED);

    tty_end_menu(win, prompt);
    await tty_display_nhwindow(win);
    const picks = await tty_select_menu(win, PICK_ONE);
    tty_destroy_nhwindow(win);
    await docrt();
    if (picks.length > 0) {
        let k = picks[0];
        /* preselected 'q'/'n' comes back alongside a real pick */
        if (picks.length > 1 && k === (more_containers ? 7 : 8))
            k = picks[1];
        return lootchars[k]; /* :,o,i,b,r,s,n,q */
    }
    return !picks.cancelled && more_containers ? 'n' : 'q';
}

// src/invent.c:403 sortloot_cmp(), the slice active for container and
// pile menus (SORTLOOT_LOOT|SORTLOOT_PACK, class already grouped by the
// caller): subclass, then discovery, then case-insensitive name, then
// BUCX descending.
export function sortloot_items(items, sortByLootName = true) {
    return items
        .map((obj, idx) => {
            const classified = {};
            loot_classify(classified, obj);
            return { obj, idx,
                     sub: classified.subclass,
                     disco: classified.disco,
                     nam: singular(obj, cxname).toLowerCase() };
        })
        .sort((a, b) => {
            if (a.sub !== b.sub) return a.sub - b.sub;
            if (a.disco !== b.disco) return a.disco - b.disco;
            if (!sortByLootName) return a.idx - b.idx;
            const nc = a.nam < b.nam ? -1 : a.nam > b.nam ? 1 : 0;
            if (nc) return nc;
            const v1 = a.obj.bknown ? (a.obj.blessed ? 3
                                       : !a.obj.cursed ? 2 : 1) : 0;
            const v2 = b.obj.bknown ? (b.obj.blessed ? 3
                                       : !b.obj.cursed ? 2 : 1) : 0;
            if (v1 !== v2) return v2 - v1;
            return a.idx - b.idx;   /* stable */
        })
        .map(e => e.obj);
}

// src/pickup.c:2024 container_at() — number of containers at a spot (or
// just whether there is one when !countem)
export function container_at(x, y, countem) {
    let container_count = 0;
    for (const cobj of (game.level?.objects || [])) {
        if (cobj.ox !== x || cobj.oy !== y)
            continue;
        if (Is_container(cobj)) {
            container_count++;
            if (!countem)
                break;
        }
    }
    return container_count;
}

import { hitfloor } from './dothrow.js';
import { dropy, doaltarobj } from './do.js';
