// pickup.js — picking things up off the floor, and looking at what is there.
// C ref: src/pickup.c
//
// Only the paths a session with autopickup OFF can reach are here so far:
// stepping onto objects routes pickup(1) -> check_here() -> look_here().
// The actual pick-up machinery (query_objlist, pickup_object, autopickup
// exceptions) is absent and recorded, never faked.

import { def_oc_syms } from './drawing_data.js';
import { game } from './gstate.js';
import { addinv, prinv, obj_extract_self, inv_order, let_to_name,
         freeinv, update_inventory, weight } from './invent.js';
import { observe_object } from './o_init.js';
import { doname, xname, the, yname, singular, an } from './objnam.js';
import { Is_container, Has_contents, carried } from './obj.js';
import { AUTOUNLOCK_UNTRAP, AUTOUNLOCK_APPLY_KEY,
         AUTOUNLOCK_FORCE } from './const.js';
import { check_capacity } from './hack.js';
import { ECMD_OK, ECMD_TIME, IS_FURNITURE, ICE, POOL, MOAT, WATER, LAVAPOOL } from './const.js';
import { upstart } from './do_name.js';

/* src/hacklib.c The() — the() with the first letter capitalised. */
const The = (s2) => upstart(the(s2));
import { ONAMES, OCLASSES } from './objects_data.js';
import { newsym, pline, bot } from './display.js';
import { UNENCUMBERED } from './const.js';
import { costly_spot } from './shk.js';
import { near_capacity } from './attrib.js';
import { In_sokoban } from './dungeon.js';
import { Is_mbag } from './mkobj.js';
import { def_char_to_objclass } from './sp_lev.js';
import { read_engr_at } from './engrave.js';
import { rn2 } from './rng.js';
import { OBJ_AT, LOOKHERE_NOFLAGS, LOOKHERE_PICKED_SOME } from './const.js';
import { You } from './pline.js';
import { flush_screen } from './display.js';
import { look_here } from './invent.js';
import { nomul } from './hack.js';
import { t_at, is_pool, is_lava } from './mon.js';
import { unconscious } from './trap.js';
import { is_pit } from './const.js';
import { Levitation, Stone_resistance } from './youprop.js';
import { st_gloves, st_corpse, st_petrifies, st_resists, W_ARMG } from './const.js';
import { worn } from './do_wear.js';
import { touch_petrifies } from './mondata.js';

function note_unported_pickup(what) {
    (game.unported ||= new Set()).add(what);
}

// src/hack.c can_reach_floor() — is the floor in reach?
//
// The trap parameter widens reach inside a pit. Riding, being stuck to a
// ceiling clinger, and polyform reach limits are states that cannot occur
// yet; levitation can, via potions and rings.
export function can_reach_floor(check_pit) {
    if (game.u.uswallow)
        return false;
    if (Levitation())
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

const is_pool_typ = (t) => t === POOL || t === MOAT || t === WATER;
const LAVAPOOL_TYP = LAVAPOOL;

export async function pickup(what) {
    const autopickup = what > 0;

    /* we might have arrived here while fainted or sleeping */
    if (autopickup && game.multi < 0 && unconscious()) {
        return 0;
    }

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
        if ((game.multi && !game.context.run)
            || (autopickup && !game.flags?.autopickup)) {
            await check_here(false);
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
        here = here.filter(o => autopick_testobj(o));
    let n_picked = 0, n_tried = 0;
    if (here.length > 1 && !autopickup) {
        const picked = await query_objlist('Pick up what?', here);
        for (const obj of picked) {
            n_tried++;
            if ((await pickup_object(obj, obj.quan, false)) > 0)
                n_picked++;
        }
    } else {
        /* autopick(): no menu, take every eligible object */
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

    return n_tried > 0 ? 1 : 0;
}

// src/pickup.c:930 autopick_testobj() — is this object eligible for
// autopickup? Only the pickup_types test is live: costly_spot() needs shop
// floors, and the pickup_thrown / pickup_stolen / dropped_nopick overrides
// need obj.how_lost, which nothing sets yet.
function autopick_testobj(otmp) {
    const otypes = game.flags?.pickup_types || '';

    if (otmp.how_lost)
        note_unported_pickup('autopick_testobj:how_lost');
    if (game.apelist)
        note_unported_pickup('autopick_testobj:exceptions');

    /* check for pickup_types */
    return !otypes || otypes.includes(def_oc_syms[otmp.oclass]);
}

// src/pickup.c:1025 query_objlist() — the PICK_ANY menu over a pile.
//
// C sorts the list into class order with a heading per class, exactly as the
// inventory menu does, and assigns a,b,c... down the list rather than reusing
// any inventory letter. Returns the chosen objects in menu order.
async function query_objlist(qstr, olist) {
    const { tty_create_nhwindow, tty_start_menu, tty_add_menu, tty_end_menu,
            tty_display_nhwindow, tty_select_menu, tty_destroy_nhwindow,
            ATR_NONE, ATR_INVERSE, NHW_MENU } = await import('./tty/wintty.js');
    const { MENU_BEHAVE_STANDARD, MENU_ITEMFLAGS_NONE, NO_COLOR, PICK_ANY }
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
    for (const oclass of inv_order()) {
        const items = sortloot_items(olist.filter(o => o.oclass === oclass));
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
            const sel = (first_of_class && oclass === OCLASSES.COIN_CLASS)
                        ? '$' : let_;
            tty_add_menu(win, null, id, sel, 0, ATR_NONE,
                         NO_COLOR, doname(o), MENU_ITEMFLAGS_NONE);
            if (sel !== '$')
                let_ = String.fromCharCode(let_.charCodeAt(0) + 1);
            first_of_class = false;
            id++;
        }
    }
    tty_end_menu(win, qstr);
    await tty_display_nhwindow(win);

    const ids = await tty_select_menu(win, PICK_ANY);
    tty_destroy_nhwindow(win);
    await docrt();

    return ids.map(i => byid.get(i)).filter(Boolean);
}

// src/pickup.c:1803 pickup_object() — take one object off the floor.
//
// The Sokoban boulder, loadstone, artifact-touch, cockatrice and scroll of
// scare monster arms are recorded; lift_object's encumbrance messages too.
export async function pickup_object(obj, count, telekinesis) {
    if (obj.quan < count)
        return 0;                       /* impossible() in C */

    if (obj === game.uchain)
        return 0;                       /* do not pick up attached chain */
    if (obj.oartifact || obj.otyp === ONAMES.SCR_SCARE_MONSTER
        || obj.otyp === ONAMES.LOADSTONE
        || (obj.otyp === ONAMES.BOULDER && In_sokoban(game.u.uz))) {
        note_unported_pickup('pickup_object:special_object');
        return 0;
    }
    if (obj.otyp === ONAMES.CORPSE)
        note_unported_pickup('pickup_object:corpse_checks');

    /* lift_object(obj, NULL, &count, telekinesis) — its weight arms print
       and can refuse; the plain case returns 1 */
    if (near_capacity() > UNENCUMBERED)
        note_unported_pickup('pickup_object:lift_object_encumbered');

    obj = await pick_obj(obj);
    await pickup_prinv(obj, count);
    return 1;
}

// src/pickup.c:1897 pick_obj() — off the floor and into inventory.
function pick_obj(otmp) {
    const ox = otmp.ox, oy = otmp.oy;

    if (costly_spot(ox, oy))
        note_unported_pickup('pick_obj:shop');
    obj_extract_self(otmp);
    newsym(ox, oy);
    return addinv(otmp);
}

// src/pickup.c pickup_prinv() — "k - a goblin corpse."
async function pickup_prinv(obj, count) {
    await prinv(null, obj, count);
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
// Only the container-underfoot path is ported. The confused arm, the blind
// cockatrice check, the multi-container menu, grave digging and the
// directional monster-looting tail are recorded.
export async function doloot() {
    if (check_capacity(null))
        return ECMD_OK;

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

    /* the grave arm and the directional "Loot in what direction?" tail */
    note_unported_pickup('doloot:nothing_underfoot');
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
function allow_category(obj) {
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
function count_buc(olist, type) {
    let count = 0;
    for (const otmp of olist || []) {
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
function count_categories(olist) {
    let ccount = 0;
    const seen = new Set();
    for (const curr of olist || []) {
        if (!seen.has(curr.oclass)) {
            seen.add(curr.oclass);
            ccount++;
        }
    }
    return ccount;
}

/* include/hack.h query_category qflags */
const ALL_TYPES = 0x0020, UNPAID_TYPES = 0x0004, CHOOSE_ALL = 0x0080,
      BUC_BLESSED = 0x0100, BUC_CURSED = 0x0200, BUC_UNCURSED = 0x0400,
      BUC_UNKNOWN = 0x0800, BUCX_TYPES = 0x0f00, JUSTPICKED = 0x1000,
      INCLUDE_VENOM = 0x0002, INVORDER_SORT = 0x0010;
const ALL_TYPES_SELECTED = -2;

// src/pickup.c:1226 query_category() — the "what type of objects?" menu.
// Returns the list of picked category codes ('A', class symbols' char
// codes, ALL_TYPES_SELECTED, 'B'/'U'/'C'/'X'). Identifiers in the tty
// menu are the codes themselves (offset by +1000 to keep them non-zero
// is unnecessary: all are non-zero already).
async function query_category(qstr, olist, qflags) {
    const { tty_create_nhwindow, tty_start_menu, tty_add_menu,
            tty_add_menu_str, tty_end_menu, tty_display_nhwindow,
            tty_select_menu, tty_destroy_nhwindow, ATR_NONE, ATR_INVERSE,
            NHW_MENU } = await import('./tty/wintty.js');
    const { MENU_BEHAVE_STANDARD, MENU_ITEMFLAGS_NONE,
            MENU_ITEMFLAGS_SKIPINVERT, NO_COLOR, PICK_ANY }
        = await import('./const.js');
    const { docrt } = await import('./display.js');

    if (!olist || !olist.length)
        return [];

    const do_unpaid = (qflags & UNPAID_TYPES) !== 0 && count_unpaid(olist);
    let num_buc_types = 0;
    const do_blessed = (qflags & BUC_BLESSED) !== 0
                       && count_buc(olist, 'B') && ++num_buc_types;
    const do_cursed = (qflags & BUC_CURSED) !== 0
                      && count_buc(olist, 'C') && ++num_buc_types;
    const do_uncursed = (qflags & BUC_UNCURSED) !== 0
                        && count_buc(olist, 'U') && ++num_buc_types;
    const do_buc_unknown = (qflags & BUC_UNKNOWN) !== 0
                           && count_buc(olist, 'X') && ++num_buc_types;
    const num_justpicked = (qflags & JUSTPICKED) !== 0
        ? olist.filter(o => o.pickup_prev).length : 0;

    const ccount = count_categories(olist);
    /* no point in actually showing a menu for a single category */
    if (ccount === 1 && !do_unpaid && num_buc_types <= 1) {
        const curr = olist[0];
        return curr ? [curr.oclass] : [];
    }

    const win = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(win, MENU_BEHAVE_STANDARD);

    const pack = inv_order();
    const show_a = (qflags & ALL_TYPES) !== 0 && ccount > 1;

    if ((qflags & CHOOSE_ALL) !== 0) {
        tty_add_menu(win, null, 'A'.charCodeAt(0), 'A', 0, ATR_NONE,
                     NO_COLOR, 'Auto-select every relevant item',
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
                     NO_COLOR, 'All types', MENU_ITEMFLAGS_SKIPINVERT);
        invlet = String.fromCharCode(invlet.charCodeAt(0) + 1);
    }

    /* one entry per class present, in packorder (inv_order() already
       yields class numbers) */
    for (const oclass of pack) {
        if (!olist.some(o => o.oclass === oclass))
            continue;
        tty_add_menu(win, null, oclass, invlet, 0, ATR_NONE, NO_COLOR,
                     let_to_name(oclass), MENU_ITEMFLAGS_NONE);
        invlet = String.fromCharCode(invlet.charCodeAt(0) + 1);
    }

    if (do_unpaid || num_buc_types > 0 || num_justpicked)
        tty_add_menu_str(win, '');
    if (do_unpaid)
        tty_add_menu(win, null, 'u'.charCodeAt(0), 'u', 0, ATR_NONE,
                     NO_COLOR, 'Unpaid items', MENU_ITEMFLAGS_SKIPINVERT);
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
    const picks = await tty_select_menu(win, PICK_ANY);
    tty_destroy_nhwindow(win);
    await docrt();
    return picks;
}

// src/pickup.c:1705 lift_object() — the reachable slice: ordinary items
// within carrying capacity lift cleanly; the encumbrance confirmations
// and knapsack-full refusals record.
function lift_object(obj) {
    if (near_capacity() > (game.flags?.pickup_burden ?? 2))
        note_unported_pickup('lift_object:encumbrance_query');
    return 1;
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

    if (floor_container && costly_spot(game.u.ux, game.u.uy))
        note_unported_pickup('in_container:sellobj');
    if (current_container.otyp === ONAMES.ICE_BOX) {
        note_unported_pickup('in_container:icebox_age');
    } else if (Is_mbag(current_container)) {
        /* mbag_explodes() rolls are recorded when a magic bag is used */
        note_unported_pickup('in_container:mbag_explodes');
    }

    current_container.cknown = 1;

    /* boxes with quantity would need splitobj; boxes are quan 1 */
    (current_container.cobj ||= []).push(obj);
    obj.where = 2; /* OBJ_CONTAINED */
    obj.ocontainer = current_container;
    current_container.owt = weight(current_container);

    await You(`put ${doname(obj)} into ${the(xname(current_container))}.`);
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
        note_unported_pickup('out_container:removed_from_icebox');

    if (!obj.unpaid && !carried(current_container)
        && costly_spot(current_container.ox, current_container.oy))
        note_unported_pickup('out_container:addtobill');

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
        const picks = await query_objlist(`${action} what?`, eligible);
        if (picks.length) {
            n_looted = picks.length;
            for (let otmp of picks) {
                /* count splitting needs menu counts; whole stacks only */
                const res = put_in ? await in_container(otmp)
                                   : await out_container(otmp);
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
            MENU_ITEMFLAGS_SELECTED, NO_COLOR, PICK_ONE }
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

// src/pickup.c:2972 use_container() — the "Do what with <container>?" loop.
export async function use_container(obj, held, more_containers) {
    let used = ECMD_OK;

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
        /* chest_trap() and the paralysis follow-up */
        note_unported_pickup('use_container:chest_trap');
        return ECMD_TIME;
    }

    current_container = obj; /* for use by in/out_container */

    /* SchroedingersBox / cursed bag of holding loss: neither container
       type is reachable yet */
    if (Is_mbag(obj) && obj.cursed && Has_contents(obj))
        note_unported_pickup('use_container:cursed_mbag');

    let inokay = (game.invent || []).some(o => o !== current_container);
    const outokay0 = Has_contents(current_container);
    const emptymsg = `${upstart(yname(current_container))} is empty.`;

    let c;
    for (;;) { /* repeats iff '?' or ':' gets chosen */
        const outmaybe = (outokay0 || !current_container.cknown);
        const qbuf = !outmaybe
            ? `${upstart(yname(current_container))} is empty.  `
              + 'Do what with it?'
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
            /* getobj("stash") one item */
            note_unported_pickup('use_container:stash_one');
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

/* ---- sortloot's within-class ordering: src/invent.c:149-500 ---- */

/* src/invent.c:184 loot_classify(), the subclass arm. Armor uses armcat
   remapping; weapons group by skill family; food and gems have their own
   fixed groupings; everything else is one group. */
function loot_subclass(obj) {
    const otyp = obj.otyp, oclass = obj.oclass;
    const od = game.objects[otyp] || {};
    switch (oclass) {
    case OCLASSES.ARMOR_CLASS: {
        /* armcat[helm]=1 gloves=2 boots=3 shield=4 cloak=5 shirt=6 suit=7 */
        const armcat = { 2: 1, 3: 2, 4: 3, 1: 4, 5: 5, 6: 6, 0: 7 };
        let k = od.oc_armcat ?? od.oc_subtyp ?? 7;
        if (k < 0 || k >= 7) k = 7;
        return armcat[k] ?? 8;
    }
    case OCLASSES.WEAPON_CLASS: {
        const k = od.oc_skill | 0;
        /* P_BOW..P_CROSSBOW are 24..28ish; mirror the C banding */
        const P_BOW = 24, P_CROSSBOW = 28, P_SPEAR = 6, P_DAGGER = 1,
              P_KNIFE = 2;
        return (k < 0) ? ((k >= -P_CROSSBOW && k <= -P_BOW) ? 1 : 3)
               : ((k >= P_BOW && k <= P_CROSSBOW) ? 2
                  : (k === P_SPEAR || k === P_DAGGER || k === P_KNIFE) ? 4
                    : (od.oc_skill !== 20 /* !is_pole approximation via
                         P_POLEARMS/P_LANCE families */) ? 5 : 6);
    }
    case OCLASSES.TOOL_CLASS: {
        const seen = !!obj.dknown, discovered = !!od.oc_name_known;
        if (seen && discovered
            && (otyp === ONAMES.BAG_OF_TRICKS || otyp === ONAMES.HORN_OF_PLENTY))
            return 2;
        if (Is_container(obj))
            return 1;
        switch (otyp) {
        case ONAMES.WOODEN_FLUTE: case ONAMES.MAGIC_FLUTE:
        case ONAMES.TOOLED_HORN: case ONAMES.FROST_HORN:
        case ONAMES.FIRE_HORN: case ONAMES.WOODEN_HARP:
        case ONAMES.MAGIC_HARP: case ONAMES.BUGLE:
        case ONAMES.LEATHER_DRUM: case ONAMES.DRUM_OF_EARTHQUAKE:
        case ONAMES.HORN_OF_PLENTY:
            return 3;
        default:
            return 4;
        }
    }
    case OCLASSES.FOOD_CLASS:
        switch (otyp) {
        case ONAMES.SLIME_MOLD: return 1;
        case ONAMES.TIN:        return 3;
        case ONAMES.EGG:        return 4;
        case ONAMES.CORPSE:     return 5;
        default:                return obj.globby ? 6 : 2;
        }
    case OCLASSES.GEM_CLASS: {
        const seen = !!obj.dknown, discovered = !!od.oc_name_known;
        const GEMSTONE = 18, GLASS = 16; /* objclass.h materials */
        switch (od.oc_material) {
        case GEMSTONE: return !seen ? 1 : !discovered ? 2 : 3;
        case GLASS:    return !seen ? 1 : !discovered ? 2 : 4;
        default:       return !seen ? 5
                              : (otyp !== ONAMES.ROCK)
                                ? (!discovered ? 6 : 7) : 8;
        }
    }
    default:
        return 1;
    }
}

/* src/invent.c:297 — discovery status rank */
function loot_disco(obj) {
    const od = game.objects[obj.otyp] || {};
    const seen = !!obj.dknown;
    const discovered = !!od.oc_name_known;
    return !seen ? 1
           : (discovered || !od.oc_descr) ? 4
             : od.oc_uname ? 3 : 2;
}

// src/invent.c:403 sortloot_cmp(), the slice active for container and
// pile menus (SORTLOOT_LOOT|SORTLOOT_PACK, class already grouped by the
// caller): subclass, then discovery, then case-insensitive name, then
// BUCX descending.
export function sortloot_items(items) {
    return items
        .map((obj, idx) => ({ obj, idx,
                              sub: loot_subclass(obj),
                              disco: loot_disco(obj),
                              nam: singular(obj, xname).toLowerCase() }))
        .sort((a, b) => {
            if (a.sub !== b.sub) return a.sub - b.sub;
            if (a.disco !== b.disco) return a.disco - b.disco;
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
