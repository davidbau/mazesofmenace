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
import { INCLUDE_HERO } from './const.js';
import { MAY_HIT, MAY_DESTROY } from './const.js';
import { scatter } from './explode.js';
import { def_oc_syms } from './drawing_data.js';
import { game } from './gstate.js';
import { addinv, prinv, obj_extract_self, inv_order, let_to_name,
         freeinv, getobj, update_inventory, loot_classify, weight, mergable, merged, money_cnt,
         useup, useupf, obfree, stackobj,
         GETOBJ_ALLOWCNT, GETOBJ_DOWNPLAY, GETOBJ_EXCLUDE,
         GETOBJ_EXCLUDE_SELECTABLE, GETOBJ_PROMPT, GETOBJ_SUGGEST }
    from './invent.js';
import { observe_object } from './o_init.js';
import { doname, xname, cxname, the, yname, singular, an, corpse_xname,
         CXN_ARTICLE, CXN_SINGULAR, otense, vtense } from './objnam.js';
import { Is_container, Has_contents, carried } from './obj.js';
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
         DOOR, D_CLOSED, D_LOCKED, IS_SINK, ZAP_POS, isok, xdir, ydir,
         LOST_DROPPED, LOST_THROWN, LOST_STOLEN, LOST_EXPLODING, A_WIS, st_all }
    from './const.js';
import { addtobill, costly_spot, doname_with_price, sellobj,
         sellobj_state } from './shk.js';
import { calc_capacity, exercise, max_capacity, near_capacity } from './attrib.js';
import { In_sokoban, surface } from './dungeon.js';
import { Is_mbag, splitobj, unbless, place_object, add_to_container,
         start_corpse_timeout, start_glob_timeout }
    from './mkobj.js';
import { PMNAMES } from './monst_data.js';
import { def_char_to_objclass } from './sp_lev.js';
import { read_engr_at } from './engrave.js';
import { rn2, rnd, d } from './rng.js';
import { OBJ_AT, LOOKHERE_NOFLAGS, LOOKHERE_PICKED_SOME, LOOKHERE_SKIP_DFEATURE } from './const.js';
import { NO_COLOR } from './terminal.js';
import { There, You, Your } from './pline.js';
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
import { Blind, Levitation, Stone_resistance, Flying } from './youprop.js';
import { st_gloves, st_corpse, st_petrifies, st_resists, W_ARMG } from './const.js';
import { worn } from './do_wear.js';
import { nohands, notake, poly_when_stoned, throws_rocks,
         touch_petrifies } from './mondata.js';
import { is_rider } from './makemon.js';
import { body_part } from './polyself.js';
import { tty_yn_function } from './tty/topl.js';
import { inv_cnt } from './hack.js';
import { freehand } from './wield.js';





function note_unported_pickup(what) {
    (game.unported ||= new Set()).add(what);
}

// src/hack.c can_reach_floor() — is the floor in reach?
//
// The trap parameter widens reach inside a pit. Riding, being stuck to a
// ceiling clinger, and polyform reach limits are states that cannot occur
// yet; levitation can, via potions and rings.
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
            && obj !== game.uchain)
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

// src/pickup.c:616 reset_justpicked() -- a new successful pickup attempt
// replaces the previous "just picked up" inventory group.
function reset_justpicked() {
    for (const obj of game.invent || [])
        obj.pickup_prev = 0;
}

export async function pickup(what) {
    const autopickup = what > 0;

    /* we might have arrived here while fainted or sleeping */
    if (autopickup && game.multi < 0 && unconscious()) {
        return 0;
    }

    /* src/pickup.c:691: only the first object that changes encumbrance in
       this pickup operation gets the verbose lifting prefix. */
    game.pickup_encumbrance = 0;

    if (!game.u.uswallow) {
        /* no auto-pick if no-pick move, nothing there, or in a pool */
        if (autopickup && (game.context.nopick || !OBJ_AT(game.u.ux, game.u.uy)
                           || (is_pool(game.u.ux, game.u.uy) && !game.u.uinwater)
                           || is_lava(game.u.ux, game.u.uy))) {
            if (game.flags?.mention_decor)
                await describe_decor();
            await read_engr_at(game.u.ux, game.u.uy);
            return 0;
        }
        /* no pickup if levitating & not on air or water level */
        const t = t_at(game.u.ux, game.u.uy);
        if (!can_reach_floor(!!(t && is_pit(t.ttyp)))) {
            note_unported_pickup('pickup:cant_reach_floor');
            return 0;
        }
        const cannotTake = notake(game.youmonst.data);
        if ((game.multi && !game.context.run)
            || (autopickup && !game.flags?.autopickup)
            || cannotTake) {
            await check_here(false);
            if (cannotTake && OBJ_AT(game.u.ux, game.u.uy)
                && (autopickup || game.flags?.autopickup))
                await You('are physically incapable of picking anything up.');
            return 0;
        }

        /* if there's anything here, stop running */
        if (OBJ_AT(game.u.ux, game.u.uy) && game.context.run
            && game.context.run !== 8 && !game.context.nopick)
            nomul(0);
    }

    /* src/pickup.c:1085 query_objlist() — with AUTOSELECT_SINGLE set, a
       single candidate is taken WITHOUT a menu; two or more raise one. */
    let here = (game.level?.objects || [])
        .filter(o => o.ox === game.u.ux && o.oy === game.u.uy
                     && o !== game.uchain);
    /* src/pickup.c:975 autopick() — autopickup takes the eligible objects
       with no menu at all, so the class filter has to run here or every
       object on the square gets grabbed regardless of pickup_types. */
    if (autopickup)
        here = autopick(here);
    let n_picked = 0, n_tried = 0;
    if (here.length > 1 && !autopickup) {
        const picked = await query_objlist('Pick up what?', here, INVORDER_SORT, PICK_ANY, allow_all);
        if (picked.length)
            reset_justpicked();
        for (const obj of picked) {
            n_tried++;
            const count = picked.counts?.get(obj) ?? obj.quan;
            if ((await pickup_object(obj, count, false)) > 0)
                n_picked++;
        }
    } else {
        /* autopick(): no menu, take every eligible object */
        if (here.length)
            reset_justpicked();
        for (const obj of here) {
            n_tried++;
            if ((await pickup_object(obj, obj.quan, false)) > 0)
                n_picked++;
        }
    }

    /* src/pickup.c:903 — check if there's anything else here after
       auto-pickup is done; this is what prints "You see here a jackal
       corpse." when autopickup took nothing */
    if (autopickup && !game.u.uswallow)
        await check_here(n_picked > 0);

    game.pickup_encumbrance = 0;
    return n_tried > 0 ? 1 : 0;
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

// src/pickup.c:1025 query_objlist() — the PICK_ANY menu over a pile.
//
// C sorts the list into class order with a heading per class, exactly as the
// inventory menu does, and assigns a,b,c... down the list rather than reusing
// any inventory letter. Returns the chosen objects in menu order.
export async function query_objlist(qstr,   /* query string */
                                    olist,  /* the list to pick from */
                                    qflags = INVORDER_SORT, /* options to control the query */
                                    how = PICK_ANY,         /* type of query */
                                    allow = allow_all)      /* allow function */
{
    const use_invlet = (qflags & USE_INVLET) !== 0;
    const sorted = (qflags & INVORDER_SORT) !== 0,
          engulfer = (qflags & INCLUDE_HERO) !== 0;
    let engulfer_minvent;
    let n, last;

    if (!olist.length && !engulfer)
        return [];

    /* count the number of items allowed */
    n = 0, last = null;
    for (const curr of olist)
        if (allow(curr)) {
            last = curr;
            n++;
        }
    /* can't depend upon 'engulfer' because that's used to indicate whether
       hero should be shown as an extra, fake item */
    engulfer_minvent = (olist.length && olist[0].where === OBJ_MINVENT
                        && engulfing_u(olist[0].ocarry));
    if (engulfer_minvent && n === 1 && olist[0].owornmask) {
        qflags &= ~AUTOSELECT_SINGLE;
    }
    if (engulfer) {
        ++n;
        /* don't autoselect swallowed hero if it's the only choice */
        qflags &= ~AUTOSELECT_SINGLE;
    }

    if (n === 0) /* nothing to pick here */
        return [];

    if (n === 1 && (qflags & AUTOSELECT_SINGLE)) {
        const picks = [last];
        Object.defineProperty(picks, 'counts', { value: new Map([[last, last.quan]]) });
        return picks;
    }
    olist = olist.filter(allow);

    const { tty_create_nhwindow, tty_start_menu, tty_add_menu, tty_end_menu,
            tty_display_nhwindow, tty_select_menu, tty_destroy_nhwindow,
            ATR_NONE, ATR_INVERSE, NHW_MENU } = await import('./tty/wintty.js');
    const { MENU_BEHAVE_STANDARD, MENU_ITEMFLAGS_NONE, PICK_ANY }
        = await import('./const.js');
    const { docrt } = await import('./display.js');

    const win = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(win, MENU_BEHAVE_STANDARD);

    /* sortloot's class grouping: C walks flags.inv_order and emits a heading
       for each class that has anything in the pile */
    const bylet = new Map();
    let let_ = 'a';
    let id = 1;
    const byid = new Map();
    const sortlootMode = String(game.flags?.sortloot ?? 'loot')
        .charAt(0).toLowerCase();
    const sortByLootName = sortlootMode === 'l' || sortlootMode === 'f';
    for (const oclass of inv_order()) {
        const items = olist.filter(o => o.oclass === oclass);
        if (use_invlet) {
            items.sort((a, b) => ((a.invlet.charCodeAt(0) ^ 0o40)
                                  - (b.invlet.charCodeAt(0) ^ 0o40)));
        } else {
            items.splice(0, items.length,
                         ...sortloot_items(items, sortByLootName));
        }
        if (!items.length)
            continue;
        tty_add_menu(win, null, 0, 0, 0, ATR_INVERSE, NO_COLOR,
                     let_to_name(oclass), MENU_ITEMFLAGS_NONE);
        let first_of_class = true;
        for (const o of items) {
            if (!game.u?.ublind)
                observe_object(o);
            byid.set(id, o);
            /* the first coin entry keeps GOLD_SYM as its selector
               (query_objlist: "(first && oclass == COIN_CLASS) ?
               GOLD_SYM : 0"); everything else auto-assigns letters */
            const sel = use_invlet ? o.invlet
                        : (first_of_class && oclass === OCLASSES.COIN_CLASS)
                          ? '$' : let_;
            tty_add_menu(win, null, id, sel, 0, ATR_NONE,
                         NO_COLOR, doname_with_price(o),
                         MENU_ITEMFLAGS_NONE);
            if (!use_invlet && sel !== '$')
                let_ = String.fromCharCode(let_.charCodeAt(0) + 1);
            first_of_class = false;
            id++;
        }
    }
    if (engulfer) {
        if (sorted && n > 1) {
            tty_add_menu(win, null, 0, 0, 0, ATR_INVERSE, NO_COLOR,
                         `${digests(game.u.ustuck.data) ? 'Swallowed' : 'Engulfed'} Creatures`,
                         MENU_ITEMFLAGS_NONE);
        }
        /* fake inventory letter, no group accelerator */
        tty_add_menu(win, null, 0, CONTAINED_SYM, 0, ATR_NONE, NO_COLOR,
                     an(self_lookat()), MENU_ITEMFLAGS_NONE);
    }

    tty_end_menu(win, qstr);
    await tty_display_nhwindow(win);

    const ids = await tty_select_menu(win, how);
    tty_destroy_nhwindow(win);
    await docrt();

    const picks = [];
    const counts = new Map();
    for (const id of ids) {
        const obj = byid.get(id);
        if (!obj)
            continue;
        let count = ids.counts?.get(id) ?? -1;
        if (count < 0 || count > obj.quan)
            count = obj.quan;
        picks.push(obj);
        counts.set(obj, count);
    }
    Object.defineProperty(picks, 'counts', { value: counts });
    return picks;
}

const gold_weight = (amount) => Math.trunc((amount + 50) / 100);

// src/pickup.c:1580 carry_count(), for a floor object. It finds the largest
// liftable prefix of a stack without changing the stack while it measures.
async function carry_count_floor(obj, count) {
    const savequan = obj.quan;
    const saveowt = obj.owt;
    const isGold = obj.oclass === OCLASSES.COIN_CLASS;
    const umoney = money_cnt(game.invent);
    let iw = max_capacity();
    const oldWeight = iw;

    if (count !== savequan) {
        obj.quan = count;
        obj.owt = weight(obj);
    }
    let wt = iw + obj.owt;
    if (isGold) {
        wt -= gold_weight(umoney) + gold_weight(count)
              - gold_weight(umoney + count);
    }
    obj.quan = savequan;
    obj.owt = saveowt;

    if (wt < 0)
        return { count, oldWeight, newWeight: wt };

    let canLift = 0;
    if (isGold) {
        iw -= gold_weight(umoney);
        canLift = (iw * -100) - (umoney + 50) - 1;
        canLift = Math.max(0, Math.min(canLift, count));
        wt = iw + gold_weight(umoney + canLift);
    } else if (count > 1 || count < savequan) {
        let q;
        for (q = 1; q <= count; ++q) {
            obj.quan = q;
            obj.owt = weight(obj);
            const candidate = iw + obj.owt;
            if (candidate >= 0)
                break;
            wt = candidate;
        }
        canLift = q - 1;
        obj.quan = savequan;
        obj.owt = saveowt;
    }

    if (canLift < count) {
        const objName = doname(obj);
        if (canLift > 0) {
            await You(`can only lift ${canLift === 1 ? 'one' : 'some'} of the ${
                objName} lying here.`);
        } else if ((game.invent || []).length || umoney) {
            await There(`${otense(obj, 'are')} ${objName} here, but you cannot lift any more.`);
        } else {
            await There(`${otense(obj, 'are')} ${objName} here, but ${
                obj.quan === 1 ? 'it ' : 'even one '}is too heavy for you to lift.`);
        }
    }
    return { count: canLift, oldWeight, newWeight: wt };
}

// src/pickup.c:1705 lift_object(), floor-object slice. Loadstones bypass
// weight, ordinary objects can ask before worsening the configured burden,
// and objects beyond the absolute limit stay on the floor.
async function lift_floor_object(obj, count, telekinesis) {
    if (obj.otyp === ONAMES.BOULDER && In_sokoban(game.u.uz)) {
        await You(`cannot get your ${body_part(HAND)} around this ${xname(obj)}.`);
        return { result: -1, count };
    }

    if (obj.otyp === ONAMES.LOADSTONE
        || (obj.otyp === ONAMES.BOULDER
            && throws_rocks(game.youmonst.data))) {
        const canMerge = (game.invent || []).some((carriedObj) =>
            mergable(carriedObj, obj));
        const alreadyCarrying = (game.invent || []).some((carriedObj) =>
            carriedObj.otyp === obj.otyp);
        if (inv_cnt(false) < invlet_basic || !alreadyCarrying || canMerge)
            return { result: 1, count };
        await You(`are carrying too much stuff to pick up ${
            obj.quan === 1 ? 'another' : 'more'} ${xname(obj)}.`);
        return { result: -1, count };
    }

    const carried = await carry_count_floor(obj, count);
    count = carried.count;
    if (count < 1)
        return { result: -1, count };

    const canMerge = (game.invent || []).some((carriedObj) =>
        mergable(carriedObj, obj));
    if (obj.oclass !== OCLASSES.COIN_CLASS
        && inv_cnt(false) >= invlet_basic && !canMerge) {
        await Your('knapsack cannot accommodate any more items.');
        return { result: -1, count };
    }

    let result = 1;
    const previous = Math.max(near_capacity(),
                              game.flags?.pickup_burden ?? MOD_ENCUMBER);
    const next = calc_capacity(carried.newWeight - carried.oldWeight);
    if (next > previous) {
        if (telekinesis) {
            result = 0;
        } else {
            const prefix = next >= EXT_ENCUMBER ? 'You have extreme difficulty'
                         : next >= HVY_ENCUMBER ? 'You have much trouble'
                           : next >= MOD_ENCUMBER ? 'You have trouble'
                             : 'You have a little trouble';
            const savequan = obj.quan;
            obj.quan = count;
            const query = `${prefix} lifting ${doname(obj)}.  Continue?`;
            obj.quan = savequan;
            const answer = await tty_yn_function(query, 'ynq', 'q');
            tty_clear_nhwindow_message(game._topl_cury || 0);
            game._pending_message = '';
            if (answer === 'q') result = -1;
            else if (answer === 'n') result = 0;
        }
    }
    return { result, count };
}

// src/pickup.c:1803 pickup_object() -- take one object off the floor.
// Artifact touch, fatal corpse contact, and Rider revival are checked before
// the ordinary lift path.
export async function pickup_object(obj, count, telekinesis) {
    if (obj.quan < count)
        return 0;                       /* impossible() in C */

    if (!Blind())
        observe_object(obj);

    if (obj === game.uchain)
        return 0;                       /* do not pick up attached chain */
    if (obj.oartifact && !await touch_artifact(obj, game.youmonst))
        return 0;
    if (obj.otyp === ONAMES.SCR_SCARE_MONSTER) {
        const carried = await carry_count_floor(
            obj, count ? count : obj.quan);
        count = carried.count;
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

    const lifted = await lift_floor_object(obj, count, telekinesis);
    if (lifted.result <= 0)
        return lifted.result;
    count = lifted.count;

    if (obj.quan !== count && obj.otyp !== ONAMES.LOADSTONE)
        obj = splitobj(obj, count);
    obj = await pick_obj(obj);
    await pickup_prinv(obj, count);
    return 1;
}

// src/pickup.c:1897 pick_obj() — off the floor and into inventory.
async function pick_obj(otmp) {
    const ox = otmp.ox, oy = otmp.oy;
    let robshop = !game.u.uswallow && otmp !== game.uball
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
async function pickup_prinv(obj, count) {
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
    await prinv(prefix ? `${prefix} lifting` : null, obj, count);
}


// src/pickup.c:2075 do_loot_cont() / loot_container() — open one container.
//
// The locked arm is what a chest the hero has not opened before hits: the
// message differs by whether its locked state was already known, and either
// way lknown becomes set. autounlock, the chest trap and use_container's
// menu are recorded.
async function do_loot_cont(cobj, ccount, ci) {
    if (!cobj)
        return false;
    if (cobj.olocked) {
        let res = false;
        if (cobj.lknown)
            await pline(`${The(xname(cobj))} is locked.`);
        else
            await pline(`Hmmm, ${the(xname(cobj))} turns out to be locked.`);
        cobj.lknown = 1;

        /* src/pickup.c:2112 — flags.autounlock defaults to APPLY_KEY */
        const autounlock = game.flags?.autounlock ?? AUTOUNLOCK_APPLY_KEY;
        if (autounlock) {
            const { autokey, pick_lock } = await import('./lock.js');
            const ox = cobj.ox, oy = cobj.oy;
            let unlocktool = null;

            game.u.dz = 0; /* #loot isn't a move command; pick_lock cares */
            if (((autounlock & AUTOUNLOCK_APPLY_KEY) !== 0
                 && (unlocktool = autokey(true)) != null)
                || (autounlock & AUTOUNLOCK_UNTRAP) !== 0) {
                /* pass ox and oy to avoid direction prompt */
                if (await pick_lock(unlocktool, ox, oy, cobj))
                    res = true;
                return res;
            }
            if ((autounlock & AUTOUNLOCK_FORCE) !== 0)
                note_unported_pickup('do_loot_cont:autounlock_force');
        }
        return res;
    }
    cobj.lknown = 1; /* floor container, so no need for update_inventory() */

    if (cobj.otyp === ONAMES.BAG_OF_TRICKS) {
        /* "It develops a huge set of teeth and bites you!" rnd(10) losehp */
        note_unported_pickup('do_loot_cont:bag_of_tricks');
        return true;
    }
    return ((await use_container(cobj, false, ci < ccount)) !== ECMD_OK);
}

// src/pickup.c:2166 doloot() — the #loot command.
//
// The container-underfoot path and ordinary directional tail are ported. The
// confused arm, blind cockatrice check, multi-container menu, grave digging,
// and saddle removal are recorded.
export async function doloot() {
    game.loot_reset_justpicked = true;
    try {
        return await doloot_core();
    } finally {
        game.loot_reset_justpicked = false;
    }
}

async function doloot_core() {
    if (await check_capacity(null))
        return ECMD_OK;

    if (nohands(game.youmonst.data)) {
        await You('have no hands!');
        return ECMD_OK;
    }

    if (game.u.uprops?.CONFUSION) {
        note_unported_pickup('doloot:confused');
        return ECMD_OK;
    }

    const here = (game.level?.objects || [])
        .filter(o => o.ox === game.u.ux && o.oy === game.u.uy
                     && Is_container(o));

    if (here.length > 1) {
        note_unported_pickup('doloot:multiple_containers');
        return ECMD_OK;
    }
    if (here.length === 1) {
        const timepassed = await do_loot_cont(here[0], 1, 1);
        return timepassed ? ECMD_TIME : ECMD_OK;
    }

    let monBeside = false;
    for (let dx = -1; dx <= 1 && !monBeside; ++dx)
        for (let dy = -1; dy <= 1; ++dy)
            if (m_at(game.u.ux + dx, game.u.uy + dy)) {
                monBeside = true;
                break;
            }

    if (monBeside || game.iflags.menu_requested) {
        const cc = { x: game.u.ux, y: game.u.uy };
        const { get_adjacent_loc } = await import('./cmd.js');
        if (!await get_adjacent_loc('Loot in what direction?',
                                    'Invalid loot location',
                                    game.u.ux, game.u.uy, cc))
            return ECMD_OK;

        const underfoot = cc.x === game.u.ux && cc.y === game.u.uy;
        const mtmp = m_at(cc.x, cc.y);
        if (mtmp)
            note_unported_pickup('doloot:loot_mon_saddle');
        await You(`don't find anything ${underfoot ? 'here' : 'there'} to loot.`);
        return ECMD_OK;
    }

    await You("don't find anything here to loot.");
    return ECMD_OK;
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

async function choose_tip_target(box, includeTargets = false) {
    const { tty_create_nhwindow, tty_start_menu, tty_add_menu,
            tty_add_menu_str, tty_end_menu, tty_display_nhwindow,
            tty_select_menu, tty_destroy_nhwindow, ATR_NONE, NHW_MENU }
        = await import('./tty/wintty.js');
    const { MENU_BEHAVE_STANDARD, MENU_ITEMFLAGS_NONE,
            MENU_ITEMFLAGS_SELECTED, PICK_ONE }
        = await import('./const.js');
    const { docrt } = await import('./display.js');
    const targets = includeTargets
        ? (game.invent || []).filter(obj => obj !== box && Is_container(obj)
            && !(obj.otyp === ONAMES.BAG_OF_TRICKS && obj.dknown
                 && game.objects[obj.otyp].oc_name_known))
        : [];

    const win = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(win, MENU_BEHAVE_STANDARD);
    tty_add_menu(win, null, 1, '-', 0, ATR_NONE, NO_COLOR,
                 'on the floor', MENU_ITEMFLAGS_SELECTED);
    tty_add_menu_str(win, '');
    for (let i = 0; i < targets.length; ++i) {
        const target = targets[i];
        const excluded = target.olocked && target.lknown;
        tty_add_menu(win, null, excluded ? null : i + 2,
                     excluded ? 0 : target.invlet, 0, ATR_NONE, NO_COLOR,
                     `${excluded ? '    ' : ''}${doname(target)}`,
                     MENU_ITEMFLAGS_NONE);
    }
    tty_end_menu(win, `Where to tip the contents of ${doname(box)}`);
    await tty_display_nhwindow(win);
    const picks = await tty_select_menu(win, PICK_ONE);
    tty_destroy_nhwindow(win);
    await docrt();
    if (!picks.length)
        return { accepted: false, target: null };
    let picked = picks[0];
    if (picks.length > 1 && picked === 1)
        picked = picks[1];
    return {
        accepted: true,
        target: picked === 1 ? null : targets[picked - 2] || null,
    };
}

async function tip_horn(box) {
    if (!(await choose_tip_target(box)).accepted)
        return ECMD_OK;
    box.lknown = 1;
    const oldSpe = box.spe;
    const { hornoplenty } = await import('./apply.js');
    do {
        if (!await hornoplenty(box, true))
            break;
    } while (box.spe > 0);

    if (box.spe < oldSpe) {
        box.spe = oldSpe;
        const { check_unpaid_usage } = await import('./shk.js');
        await check_unpaid_usage(box, true);
        box.spe = 0;
        box.cknown = 1;
        update_inventory();
    }
    return ECMD_TIME;
}

async function trigger_tip_trap(box) {
    const { chest_trap } = await import('./trap.js');
    await chest_trap(box, HAND, false);
    if ((game.multi ?? 0) >= 0) {
        nomul(-1);
        game.multi_reason = 'tipping a container';
        game.nomovemsg = '';
    }
}

function age_is_relative(obj) {
    return obj.otyp === ONAMES.BRASS_LANTERN
        || obj.otyp === ONAMES.OIL_LAMP
        || obj.otyp === ONAMES.CANDELABRUM_OF_INVOCATION
        || obj.otyp === ONAMES.TALLOW_CANDLE
        || obj.otyp === ONAMES.WAX_CANDLE
        || obj.otyp === ONAMES.POT_OIL;
}

async function freeze_in_icebox(obj) {
    if (age_is_relative(obj))
        return;

    obj.age = (game.moves ?? 0) - (obj.age ?? 0);
    const { stop_timer, ROT_CORPSE, REVIVE_MON, SHRINK_GLOB }
        = await import('./timeout.js');
    if (obj.otyp === ONAMES.CORPSE) {
        if (obj.timed) {
            stop_timer(ROT_CORPSE, obj);
            stop_timer(REVIVE_MON, obj);
        }
        if (obj.corpsenm === PMNAMES.PM_ICE_TROLL) {
            const saved = obj.omonst || obj.oextra?.omonst;
            if (saved)
                saved.mcan = 0;
        }
    } else if (obj.globby && obj.timed) {
        stop_timer(SHRINK_GLOB, obj);
    }
}

export async function removed_from_icebox(obj) {
    if (age_is_relative(obj))
        return;

    obj.age = (game.moves ?? 0) - (obj.age ?? 0);
    if (obj.otyp === ONAMES.CORPSE) {
        const saved = obj.omonst || obj.oextra?.omonst;
        const iceTroll = saved
            ? saved.mnum === PMNAMES.PM_ICE_TROLL
            : obj.corpsenm === PMNAMES.PM_ICE_TROLL;
        obj.norevive = iceTroll ? 0 : 1;
        start_corpse_timeout(obj);
    } else if (obj.globby)
        start_glob_timeout(obj, 0);
}

async function tip_bag_of_tricks(box) {
    const oldSpe = box.spe;
    const seen = { count: 0 };
    const { bagotricks } = await import('./apply.js');
    do {
        if (!await bagotricks(box, true, seen))
            break;
    } while (box.spe > 0);

    if (box.spe < oldSpe) {
        if (!seen.count)
            await pline(nothing_seems_to_happen);
        box.spe = oldSpe;
        const { check_unpaid_usage } = await import('./shk.js');
        await check_unpaid_usage(box, true);
        box.spe = 0;
        box.cknown = 1;
        update_inventory();
    }
}

// src/pickup.c tipcontainer() - tip a container onto the floor or into another
// container. Ice boxes and shop billing stay explicit until each has a C
// oracle.
async function tipcontainer(box) {
    const choice = await choose_tip_target(box, true);
    if (!choice.accepted)
        return;
    let targetbox = choice.target;

    if (targetbox?.otyp === ONAMES.BAG_OF_TRICKS) {
        const { bagotricks } = await import('./apply.js');
        await bagotricks(targetbox);
        return;
    }

    if (!box.lknown) {
        box.lknown = 1;
        if (carried(box))
            update_inventory();
    }
    if (box.olocked) {
        await pline(`${The(xname(box))} is locked.`);
        return;
    }
    if (box.otrapped) {
        await trigger_tip_trap(box);
        return;
    }
    if (targetbox && !targetbox.lknown) {
        targetbox.lknown = 1;
        if (carried(targetbox))
            update_inventory();
    }
    if (targetbox?.olocked) {
        await pline(`${The(xname(targetbox))} is locked.`);
        return;
    }
    if (targetbox?.otrapped) {
        await trigger_tip_trap(targetbox);
        return;
    }
    if (box.otyp === ONAMES.BAG_OF_TRICKS) {
        await tip_bag_of_tricks(box);
        return;
    }
    if (!Has_contents(box)) {
        box.cknown = 1;
        await pline(`${The(xname(box))} is empty.`);
        return;
    }
    if ((game.level?.flags?.has_shop)
        && costly_spot(game.u.ux, game.u.uy)) {
        note_unported_pickup('tipcontainer:shop-billing');
        return;
    }

    const contents = [...box.cobj];
    const sourceHeld = carried(box);
    const targetHeld = targetbox && carried(targetbox);
    const cursedMbag = Is_mbag(box) && box.cursed;
    let terse = true;
    box.cknown = 1;
    if (targetbox)
        await pline(`${contents.length > 1 ? 'Objects tumble' : 'An object tumbles'} into ${
            the(xname(targetbox))}.`);
    else
        await pline(`${contents.length > 1 ? 'Objects spill' : 'An object spills'} out:`);
    const { dropy } = targetbox ? {} : await import('./do.js');
    for (let i = 0; i < contents.length; ++i) {
        const obj = contents[i];
        obj_extract_self(obj);
        obj.ox = game.u.ux;
        obj.oy = game.u.uy;
        if (box.otyp === ONAMES.ICE_BOX) {
            await removed_from_icebox(obj);
        } else if (cursedMbag && !rn2(13)) {
            await mbag_item_gone(sourceHeld, obj, false);
            terse = false;
            continue;
        }
        if (targetbox) {
            if (Is_mbag(targetbox) && mbag_explodes(obj, 0)) {
                await urgent_pline(`As ${doname(obj)} ${otense(obj, 'tumble')} inside, you are blasted by a magical explosion!`);
                if (obj.otyp === ONAMES.BAG_OF_HOLDING)
                    await do_boh_explosion(obj, !sourceHeld);
                obfree(obj);

                await do_boh_explosion(targetbox, !targetHeld);
                if (targetHeld)
                    useup(targetbox);
                else
                    await useupf(targetbox, targetbox.quan);
                targetbox = null;

                await losehp(d(6, 6), 'magical explosion', KILLED_BY_AN);
                break;
            }
            add_to_container(targetbox, obj);
        } else {
            if (terse) {
                await pline(`${doname(obj)}${i + 1 < contents.length ? ',' : '.'}`);
            } else {
                await pline(`${upstart(doname(obj))} ${otense(obj, 'drop')} to the ${
                    surface(game.u.ux, game.u.uy)}.`);
            }
            obj.how_lost = LOST_DROPPED;
            await dropy(obj);
        }
    }
    box.owt = weight(box);
    if (targetbox)
        targetbox.owt = weight(targetbox);
    if (sourceHeld || targetHeld)
        update_inventory();
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
    if (cobj.otyp === ONAMES.HORN_OF_PLENTY)
        return await tip_horn(cobj);
    if (Is_container(cobj)) {
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

/* C keeps the container being looted in gc.current_container */
let current_container = null;

/* src/pickup.c:475 add_valid_menu_class() and its filter state */
let valid_menu_classes = '';
let class_filter = false, bucx_filter = false, shop_filter = false,
    picked_filter = false;

export function add_valid_menu_class(c) {
    if (c === 0) { /* reset */
        valid_menu_classes = '';
        class_filter = bucx_filter = shop_filter = picked_filter = false;
    } else if (!valid_menu_classes.includes(
                   typeof c === 'number' ? String.fromCharCode(c) : c)) {
        const ch = typeof c === 'number' ? String.fromCharCode(c) : c;
        valid_menu_classes += ch;
        switch (ch) {
        case 'B': case 'U': case 'C': case 'X':
            bucx_filter = true;
            break;
        case 'P':
            picked_filter = true;
            break;
        case 'u':
            shop_filter = true;
            break;
        default:
            class_filter = true;
            break;
        }
    }
}

/* src/pickup.c:523 allow_category() — see the C's long comment: with more
   than one filter TYPE active, an object must match one entry of EACH type */
export function allow_category(obj) {
    if (!class_filter && !shop_filter && !bucx_filter && !picked_filter)
        return false;

    if (obj.oclass === OCLASSES.COIN_CLASS && class_filter)
        return valid_menu_classes.includes(
            String.fromCharCode(OCLASSES.COIN_CLASS));

    /* Role_if(PM_CLERIC): priests automatically sense bless/curse state */
    if (game.urole?.mnum === 'PM_CLERIC' && !obj.bknown)
        obj.bknown = 1;

    if (class_filter
        && !valid_menu_classes.includes(String.fromCharCode(obj.oclass)))
        return false;
    if (shop_filter && !obj.unpaid
        && !(Has_contents(obj) && count_unpaid(obj.cobj) > 0))
        return false;
    if (bucx_filter) {
        let bucx = !obj.bknown ? 'X'
                   : obj.blessed ? 'B' : obj.cursed ? 'C' : 'U';
        /* coins get treated as either 'U' or 'X' depending on goldX */
        if (obj.oclass === OCLASSES.COIN_CLASS)
            bucx = game.flags?.goldX ? 'X' : 'U';
        if (!valid_menu_classes.includes(bucx))
            return false;
    }
    if (picked_filter && !obj.pickup_prev)
        return false;
    return true;
}

/* src/pickup.c count_unpaid() */
function count_unpaid(olist) {
    let count = 0;
    for (const otmp of olist || []) {
        if (otmp.unpaid)
            count++;
        if (Has_contents(otmp))
            count += count_unpaid(otmp.cobj);
    }
    return count;
}

/* src/pickup.c count_buc() over a list (no worn filter needed yet) */
function count_buc(olist, type, filter = null) {
    let count = 0;
    for (const otmp of olist || []) {
        if (filter && !filter(otmp))
            continue;
        /* coins are either uncursed or unknown based upon option setting */
        if (otmp.oclass === OCLASSES.COIN_CLASS) {
            if (type === (game.flags?.goldX ? 'X' : 'U'))
                count++;
            continue;
        }
        switch (type) {
        case 'B':
            if (otmp.bknown && otmp.blessed) count++;
            break;
        case 'C':
            if (otmp.bknown && otmp.cursed) count++;
            break;
        case 'U':
            if (otmp.bknown && !otmp.blessed && !otmp.cursed) count++;
            break;
        case 'X':
            if (!otmp.bknown) count++;
            break;
        }
    }
    return count;
}

/* src/pickup.c:1511 count_categories() */
function count_categories(olist, filter = null) {
    let ccount = 0;
    const seen = new Set();
    for (const curr of olist || []) {
        if (filter && !filter(curr))
            continue;
        if (!seen.has(curr.oclass)) {
            seen.add(curr.oclass);
            ccount++;
        }
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
async function query_category(qstr, olist, qflags, how = null) {
    const { tty_create_nhwindow, tty_start_menu, tty_add_menu,
            tty_add_menu_str, tty_end_menu, tty_display_nhwindow,
            tty_select_menu, tty_destroy_nhwindow, ATR_NONE, ATR_INVERSE,
            NHW_MENU } = await import('./tty/wintty.js');
    const { MENU_BEHAVE_STANDARD, MENU_ITEMFLAGS_NONE,
            MENU_ITEMFLAGS_SKIPINVERT, PICK_ONE, PICK_ANY }
        = await import('./const.js');
    if (!olist || !olist.length)
        return [];

    const do_worn = (qflags & WORN_TYPES) !== 0;
    const ofilter = do_worn ? (obj) => !!obj.owornmask : null;
    const do_unpaid = (qflags & UNPAID_TYPES) !== 0 && count_unpaid(olist);
    const do_usedup = (qflags & BILLED_TYPES) !== 0;
    let num_buc_types = 0;
    const do_blessed = (qflags & BUC_BLESSED) !== 0
                       && count_buc(olist, 'B', ofilter) && ++num_buc_types;
    const do_cursed = (qflags & BUC_CURSED) !== 0
                      && count_buc(olist, 'C', ofilter) && ++num_buc_types;
    const do_uncursed = (qflags & BUC_UNCURSED) !== 0
                        && count_buc(olist, 'U', ofilter) && ++num_buc_types;
    const do_buc_unknown = (qflags & BUC_UNKNOWN) !== 0
                           && count_buc(olist, 'X', ofilter) && ++num_buc_types;
    const num_justpicked = (qflags & JUSTPICKED) !== 0
        ? olist.filter(o => o.pickup_prev).length : 0;

    const ccount = count_categories(olist, ofilter);
    /* no point in actually showing a menu for a single category */
    if (ccount === 1 && !do_unpaid && !do_usedup && num_buc_types <= 1) {
        const curr = olist.find((obj) => !ofilter || ofilter(obj));
        return curr ? [curr.oclass] : [];
    }

    const win = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(win, MENU_BEHAVE_STANDARD);

    const pack = inv_order();
    const show_a = (qflags & ALL_TYPES) !== 0 && ccount > 1;

    if ((qflags & CHOOSE_ALL) !== 0) {
        tty_add_menu(win, null, 'A'.charCodeAt(0), 'A', 0, ATR_NONE,
                     NO_COLOR, do_worn
                         ? 'Auto-select every item being worn or wielded'
                         : 'Auto-select every relevant item',
                     MENU_ITEMFLAGS_SKIPINVERT);
        /* verify_All needs paranoid_confirm:A which defaults off */
        tty_add_menu_str(win,
            '    (ignored unless some other choices are also picked)');
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
                     let_to_name(oclass), MENU_ITEMFLAGS_NONE);
        invlet = String.fromCharCode(invlet.charCodeAt(0) + 1);
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
        const jp = olist.find(o => o.pickup_prev);
        const buf = (num_justpicked === 1 && jp)
                    ? `Just picked up: ${doname(jp)}`
                    : 'Items you just picked up';
        tty_add_menu(win, null, 'P'.charCodeAt(0), 'P', 0, ATR_NONE,
                     NO_COLOR, buf, MENU_ITEMFLAGS_SKIPINVERT);
    }
    tty_end_menu(win, qstr);
    await tty_display_nhwindow(win);
    const picks = await tty_select_menu(win, how ?? PICK_ANY);
    tty_destroy_nhwindow(win);
    /* tty_select_menu() already dismisses the window while status output is
       suppressed. A second docrt() here would repaint status cells which C
       deliberately leaves cleared after a tall category menu. */
    return picks;
}

// src/invent.c dotypeinv(), default MENU_FULL category prompt. Unlike the
// drop and loot callers this accepts exactly one class or BUC filter.
export async function query_inventory_category(olist, billx = false) {
    return query_category(
        'What type of object do you want an inventory of?', olist,
        UNPAID_TYPES | BUC_BLESSED | BUC_CURSED | BUC_UNCURSED | BUC_UNKNOWN
        | JUSTPICKED | INCLUDE_VENOM | (billx ? BILLED_TYPES : 0),
        1 /* PICK_ONE */);
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

// src/pickup.c:1705 lift_object() — the reachable slice: ordinary items
// within carrying capacity lift cleanly; the encumbrance confirmations
// and knapsack-full refusals record.
function lift_object(obj) {
    if (near_capacity() > (game.flags?.pickup_burden ?? 2))
        note_unported_pickup('lift_object:encumbrance_query');
    return 1;
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


// src/pickup.c:2803 mbag_item_gone() -- finish deleting one object lost from
// a cursed or exploding magical bag. Shop billing remains explicit.
async function mbag_item_gone(held, item, silent) {
    if (!silent) {
        if (item.dknown) {
            await pline(`${upstart(doname(item))} ${otense(item, 'have')} vanished!`);
        } else {
            await You(`${Blind() ? 'notice' : 'see'} ${doname(item)} disappear!`);
        }
    }
    if (item.unpaid || (!held && costly_spot(game.u.ux, game.u.uy)))
        note_unported_pickup('mbag_item_gone:shop-billing');
    obfree(item);
    return 0;
}

// src/pickup.c:2537 boh_loss() -- opening a cursed magical bag gives every
// contained object an independent one-in-thirteen chance to vanish.
async function boh_loss(container, held) {
    let loss = 0;
    if (Is_mbag(container) && container.cursed && Has_contents(container)) {
        for (const item of [...container.cobj]) {
            if (!rn2(13)) {
                obj_extract_self(item);
                loss += await mbag_item_gone(held, item, false);
            }
        }
    }
    return loss;
}

// src/pickup.c:2515 do_boh_explosion() -- remove a magical bag's contents,
// destroying a small random fraction and scattering everything else.
async function do_boh_explosion(boh, onFloor) {
    boh.in_use = 1;
    for (const obj of [...(boh.cobj || [])]) {
        if (!rn2(13)) {
            obj_extract_self(obj);
            await mbag_item_gone(!onFloor, obj, true);
        } else {
            obj.ox = game.u.ux;
            obj.oy = game.u.uy;
            await scatter(game.u.ux, game.u.uy, 4, MAY_HIT | MAY_DESTROY, obj);
        }
    }
}

// src/pickup.c:2558 in_container() — put obj into current_container.
async function in_container(obj) {
    const floor_container = obj !== current_container
                            && current_container.where === 1 /* OBJ_FLOOR */;

    if (!current_container) {
        return 0;
    } else if (obj === current_container) {
        await pline('That would be an interesting topological exercise.');
        return 0;
    } else if (obj.owornmask) {
        note_unported_pickup('in_container:worn');
        return 0;
    } else if (obj.otyp === ONAMES.AMULET_OF_YENDOR
               || obj.otyp === ONAMES.CANDELABRUM_OF_INVOCATION
               || obj.otyp === ONAMES.BELL_OF_OPENING
               || obj.otyp === ONAMES.SPE_BOOK_OF_THE_DEAD) {
        await pline(`${The(xname(obj))} cannot be confined in such trappings.`);
        return 0;
    } else if (obj.otyp === ONAMES.ICE_BOX || Is_box_p(obj)
               || obj.otyp === ONAMES.BOULDER) {
        await You(`cannot fit ${the(xname(obj))} into ${
            the(xname(current_container))}.`);
        return 0;
    }

    freeinv(obj);

    if (floor_container && costly_spot(game.u.ux, game.u.uy)
        && obj.oclass !== OCLASSES.COIN_CLASS) {
        if (game.sellobj_first) {
            sellobj_state(current_container.no_charge
                          ? 2 /* SELL_DONTSELL */
                          : 1 /* SELL_DELIBERATE */);
            game.sellobj_first = false;
        }
        await sellobj(obj, game.u.ux, game.u.uy);
    }
    if (current_container.otyp === ONAMES.ICE_BOX) {
        await freeze_in_icebox(obj);
    } else if (Is_mbag(current_container) && mbag_explodes(obj, 0)) {
        await urgent_pline(`As you put ${doname(obj)} inside, you are blasted by a magical explosion!`);
        if (obj.otyp === ONAMES.BAG_OF_HOLDING)
            await do_boh_explosion(obj, obj.where === 1 /* OBJ_FLOOR */);
        obfree(obj);

        await do_boh_explosion(current_container, floor_container);
        if (floor_container)
            await useupf(current_container, current_container.quan);
        else
            useup(current_container);

        await losehp(d(6, 6), 'magical explosion', KILLED_BY_AN);
        current_container = null;
    }

    if (!current_container)
        return -1;

    current_container.cknown = 1;

    await You(`put ${doname(obj)} into ${the(xname(current_container))}.`);
    if (floor_container && obj.oclass === OCLASSES.COIN_CLASS)
        await sellobj(obj, current_container.ox, current_container.oy);

    /* src/mkobj.c add_to_container() prepends and merges like the C chain. */
    add_to_container(current_container, obj);
    current_container.owt = weight(current_container);

    update_inventory();
    return current_container ? 1 : -1;
}

// src/pickup.c:2727 out_container() — take obj out of current_container.
async function out_container(obj) {
    const is_gold = (obj.oclass === OCLASSES.COIN_CLASS);

    if (!current_container)
        return -1;
    else if (is_gold)
        obj.owt = weight(obj);

    /* touch_artifact / fatal_corpse_mistake: no artifacts, and corpses
       of dangerous species record inside pickup_object too */
    if (obj.otyp === ONAMES.CORPSE)
        note_unported_pickup('out_container:corpse_checks');

    const count = obj.quan;
    const res = lift_object(obj);
    if (res <= 0)
        return res;

    /* Remove the object from the container's list. */
    obj_extract_self(obj);
    current_container.owt = weight(current_container);

    if (current_container.otyp === ONAMES.ICE_BOX)
        await removed_from_icebox(obj);

    if (!obj.unpaid && !carried(current_container)
        && costly_spot(current_container.ox, current_container.oy)) {
        obj.ox = current_container.ox;
        obj.oy = current_container.oy;
        await addtobill(obj, false, false, false);
    }

    const otmp = await addinv(obj);
    await prinv(null, otmp, count);

    if (is_gold)
        await bot(); /* update character's gold piece count immediately */
    return 1;
}

/* include/obj.h Is_box() — the local ONAMES spelling */
const Is_box_p = (o) => o.otyp === ONAMES.LARGE_BOX
                        || o.otyp === ONAMES.CHEST;

// src/pickup.c:3265 menu_loot() — MENU_FULL: category query, then either
// autopick everything or the item menu.
async function menu_loot(retry, put_in) {
    let n_looted = 0;
    let all_categories = true, loot_everything = false, autopick = false;
    const action = put_in ? 'Put in' : 'Take out';

    if (retry) {
        all_categories = (retry === -2);
    } else { /* flags.menu_style === MENU_FULL (the default) */
        all_categories = false;
        const mflags = (ALL_TYPES | UNPAID_TYPES | BUCX_TYPES | CHOOSE_ALL
                        | JUSTPICKED);
        const olist = put_in ? (game.invent || [])
                             : (current_container.cobj || []);
        const picks = await query_category(
            `${action} what type of objects?`, olist, mflags);
        if (!picks.length)
            return ECMD_OK;
        for (const pick of picks) {
            if (pick === 'A'.charCodeAt(0)) {
                loot_everything = autopick = true;
            } else if (put_in && pick === 'P'.charCodeAt(0)) {
                note_unported_pickup('menu_loot:justpicked');
            } else if (pick === ALL_TYPES_SELECTED) {
                all_categories = true;
            } else {
                add_valid_menu_class(pick);
                loot_everything = false;
            }
        }
    }

    if (autopick) {
        const firstlist = put_in ? (game.invent || []).slice()
                                 : (current_container.cobj || []).slice();
        if (!put_in)
            current_container.cknown = 1;
        for (const otmp of firstlist) {
            if (!current_container)
                break;
            if (loot_everything || all_categories || allow_category(otmp)) {
                const res = put_in ? await in_container(otmp)
                                   : await out_container(otmp);
                if (res < 0)
                    break;
                n_looted += res;
            }
        }
    } else {
        if (!put_in)
            current_container.cknown = 1;
        const src = put_in ? (game.invent || [])
                           : (current_container.cobj || []);
        const eligible = src.filter(o => all_categories || allow_category(o));
        const picks = await query_objlist(`${action} what?`, eligible,
                                          INVORDER_SORT | ((put_in && game.flags?.fixinv !== false) ? USE_INVLET : 0),
                                          PICK_ANY, allow_all);
        if (picks.length) {
            n_looted = picks.length;
            for (let otmp of picks) {
                const original = otmp;
                const count = picks.counts?.get(otmp) ?? otmp.quan;
                if (count > 0 && count < otmp.quan)
                    otmp = splitobj(otmp, count);
                const res = put_in ? await in_container(otmp)
                                   : await out_container(otmp);
                if (res <= 0 && current_container && otmp !== original)
                    merged({ o: original }, { o: otmp });
                if (res < 0)
                    break;
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
    return more_containers ? 'n' : 'q';
}

/* src/objnam.c thesimpleoname() — "the <simple name>" */
function thesimpleoname(obj) {
    return `the ${xname(obj)}`;
}

/* src/pickup.c stash_ok() - allow every inventory item except the
   container currently receiving the stashed object. */
function stash_ok(obj) {
    if (!obj)
        return GETOBJ_EXCLUDE;
    if (!current_container || obj === current_container)
        return GETOBJ_EXCLUDE_SELECTABLE;
    return GETOBJ_SUGGEST;
}

// src/pickup.c:2972 use_container() — the "Do what with <container>?" loop.
export async function use_container(obj, held, more_containers) {
    let used = ECMD_OK;

    game.sellobj_first = true;

    /* u_handsy() always true un-polymorphed */
    if (!obj.lknown) { /* do this in advance */
        obj.lknown = 1;
        if (held)
            update_inventory();
    }
    if (obj.olocked) {
        await pline(`${The(xname(obj))} ${obj.quan > 1 ? 'are' : 'is'} locked.`);
        if (held)
            await You('must put it down to unlock.');
        return ECMD_OK;
    } else if (obj.otrapped) {
        if (held)
            await You(`open ${the(xname(obj))}...`);
        const { chest_trap } = await import('./trap.js');
        const { HAND } = await import('./const.js');
        await chest_trap(obj, HAND, false);
        if ((game.multi ?? 0) >= 0) {
            nomul(-1);
            game.multi_reason = 'opening a container';
            game.nomovemsg = '';
        }
        return ECMD_TIME;
    }

    current_container = obj; /* for use by in/out_container */

    /* Schroedinger's box remains unavailable. */
    const cursedMbag = Is_mbag(obj) && obj.cursed && Has_contents(obj);
    if (cursedMbag) {
        const loss = await boh_loss(obj, held);
        if (loss) {
            used = ECMD_TIME;
            note_unported_pickup('use_container:cursed_mbag_shop_loss');
        }
    }

    let inokay = (game.invent || []).some(o => o !== current_container);
    const outokay0 = Has_contents(current_container);
    const emptymsg = `${upstart(yname(current_container))} is ${
        cursedMbag ? 'now ' : ''}empty.`;

    let c;
    for (;;) { /* repeats iff '?' or ':' gets chosen */
        const outmaybe = (outokay0 || !current_container.cknown);
        const qbuf = !outmaybe
            ? `${emptymsg}  Do what with it?`
            : `Do what with ${yname(current_container)}?`;
        /* flags.menu_style defaults to MENU_FULL -> the menu variant */
        c = await in_or_out_menu(qbuf, current_container, outmaybe, inokay,
                                 used !== ECMD_OK, more_containers);

        if (c === ':') { /* note: will set obj->cknown */
            if (!current_container.cknown)
                used = ECMD_TIME; /* gaining info */
            await container_contents(current_container);
        } else
            break;
    }

    if (c === 'q' || c === 'n') {
        /* 'q' would set abort_looting for multi-container loops */
    } else {
        const loot_out = (c === 'o' || c === 'b' || c === 'r');
        let loot_in = (c === 'i' || c === 'b' || c === 'r');
        const loot_in_first = (c === 'r'); /* both, reversed */
        let stash_one = (c === 's');

        /* out-only or out before in */
        if (loot_out && !loot_in_first) {
            if (!Has_contents(current_container)) {
                await pline(emptymsg); /* <whatever> is empty. */
                if (!current_container.cknown)
                    used = ECMD_TIME;
                current_container.cknown = 1;
            } else {
                add_valid_menu_class(0); /* reset */
                if ((await menu_loot(0, false)) !== ECMD_OK)
                    used = ECMD_TIME;
                add_valid_menu_class(0);
            }
            inokay = (game.invent || [])
                .some(o => o !== current_container);
        }

        if ((loot_in || stash_one) && !inokay) {
            await You(`don't have anything${game.invent?.length ? ' else' : ''} to ${
                stash_one ? 'stash' : 'put in'}.`);
            loot_in = stash_one = false;
        }

        if (loot_in) {
            add_valid_menu_class(0); /* reset */
            if ((await menu_loot(0, true)) !== ECMD_OK)
                used = ECMD_TIME;
            add_valid_menu_class(0);
        } else if (stash_one) {
            const stashed = await getobj('stash', stash_ok,
                                         GETOBJ_PROMPT | GETOBJ_ALLOWCNT);
            if (stashed) {
                if (await in_container(stashed))
                    used = ECMD_TIME;
                else
                    note_unported_pickup('use_container:stash_one_unsplit');
            }
        }

        /* out after in */
        if (loot_out && loot_in_first && current_container) {
            if (!Has_contents(current_container)) {
                await pline(emptymsg);
                if (!current_container.cknown)
                    used = ECMD_TIME;
                current_container.cknown = 1;
            } else {
                add_valid_menu_class(0);
                if ((await menu_loot(0, false)) !== ECMD_OK)
                    used = ECMD_TIME;
                add_valid_menu_class(0);
            }
        }
    }

    if (used !== ECMD_OK) {
        if (current_container)
            current_container.cknown = 1;
        update_inventory();
    }
    sellobj_state(0);
    current_container = null; /* avoid hanging on to stale pointer */
    return used;
}

// src/invent.c container_contents() — the ':' look-inside listing: a
// plain text window (putstr lines, --More--), sorted in loot order, with
// no class headings and no selectors.
async function container_contents(obj) {
    const { tty_create_nhwindow, tty_putstr, tty_display_nhwindow,
            tty_dismiss_nhwindow, tty_destroy_nhwindow, ATR_NONE, NHW_MENU }
        = await import('./tty/wintty.js');
    const { nhgetch } = await import('./input.js');
    const { docrt } = await import('./display.js');

    obj.cknown = 1;
    if (!Has_contents(obj)) {
        /* pline("%s is empty.", upstart(thesimpleoname(box))) */
        await pline(`${upstart(thesimpleoname(obj))} is empty.`);
        return;
    }
    const win = tty_create_nhwindow(NHW_MENU);
    tty_putstr(win, 0, `Contents of ${the(xname(obj))}:`);
    tty_putstr(win, 0, '');
    /* buf[0] = buf[1] = ' ' — two leading spaces on every item line */
    for (const oclass of inv_order()) {
        for (const o of sortloot_items(
                 (obj.cobj || []).filter(c => c.oclass === oclass))) {
            if (!game.u?.ublind)
                observe_object(o);
            tty_putstr(win, 0, `  ${doname(o)}`);
        }
    }
    await tty_display_nhwindow(win);
    await nhgetch();            /* the --More-- acknowledgement */
    tty_dismiss_nhwindow(win);
    tty_destroy_nhwindow(win);
    await docrt();
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
