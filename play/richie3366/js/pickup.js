// pickup.js — Floor look / autopickup / manual `,` pickup.
// C ref: pickup.c — check_here(), pickup(), pickup_object(), pick_obj(),
//        describe_decor(); hack.c — spoteffects(), dopickup(), pickup_checks().

import { game } from './gstate.js';
import {
    objects_at, obj_extract_self, splitobj, weight, add_to_container,
} from './mkobj.js';
import {
    look_here, observe_object, dfeature_at, paint_corner_nhw_menu, sortloot,
    let_to_name, DEF_INV_ORDER, prinv,
} from './invent.js';
import { nomul, check_special_room, is_pool, is_lava } from './hack.js';
import { flush_screen, pline, newsym, docrt } from './display.js';
import { addinv } from './u_init.js';
import { an, doname, xname, cxname, the as theArt } from './objnam.js';
import { can_reach_floor } from './engrave.js';
import {
    ECMD_OK, ECMD_TIME, OBJ_FLOOR, OBJ_INVENT, is_pit,
    STONE, ICE, DRAWBRIDGE_UP,
    IS_POOL, IS_LAVA, IS_FURNITURE, IS_WATERWALL,
    LOOKHERE_PICKED_SOME, LOOKHERE_SKIP_DFEATURE,
    Has_contents,
    SORTLOOT_PACK, SORTLOOT_LOOT,
    ALL_TYPES_SELECTED, BUC_BLESSED, BUC_CURSED, BUC_UNCURSED, BUC_UNKNOWN,
    MENU_INVERT_ALL, MENU_SELECT_ALL, MENU_UNSELECT_ALL,
} from './const.js';
import { t_at, dotrap, NO_TRAP_FLAGS, drown, lava_effects } from './trap.js';
import { nhgetch } from './input.js';
import { oclass_to_sym } from './options.js';
import { objectNames, COIN_CLASS } from './objects.js';
import { ATR_INVERSE } from './terminal.js';

/** C-ish simpleonames — sack family → "bag". */
function simpleonames(obj) {
    const n = objectNames[obj?.otyp];
    if (n === 'SACK' || n === 'OILSKIN_SACK' || n === 'BAG_OF_HOLDING'
        || n === 'BAG_OF_TRICKS') {
        return 'bag';
    }
    return cxname(obj);
}

/** C ref: objnam.c thesimpleoname — "the" + simpleonames. */
function thesimpleoname(obj) {
    return `the ${simpleonames(obj)}`;
}

/**
 * C ref: objnam.c yname + shk.c shk_your — carried → "your ", else "the ".
 * Named omissions: shk/mon ownership prefixes; artifact pname skip.
 */
function yname(obj) {
    const carried = obj?.where === OBJ_INVENT
        || (game.invent || []).includes(obj);
    return `${carried ? 'your' : 'the'} ${cxname(obj)}`;
}

/**
 * C ref: objnam.c ysimple_name — shk_your + minimal_xname.
 * Named omissions: full minimal_xname / shopkeeper ownership.
 */
function ysimple_name(obj) {
    const carried = obj?.where === OBJ_INVENT
        || (game.invent || []).includes(obj);
    return `${carried ? 'your' : 'the'} ${simpleonames(obj)}`;
}

/** C ref: objnam.c Ysimple_name2 — capitalized ysimple_name. */
function Ysimple_name2(obj) {
    return upstart(ysimple_name(obj));
}

/** C ref: pickup.c reset_justpicked — clear pickup_prev on invent chain. */
export function reset_justpicked(olist) {
    const list = olist || game.invent || [];
    for (const otmp of list) {
        if (otmp) otmp.pickup_prev = 0;
    }
}

/** C ref: hacklib.c upstart — capitalize first letter. */
function upstart(str) {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/** C ref: pickup.c count_justpicked / find_justpicked. */
function count_justpicked(olist) {
    let cnt = 0;
    for (const otmp of olist || []) {
        if (otmp?.pickup_prev) cnt++;
    }
    return cnt;
}
function find_justpicked(olist) {
    for (const otmp of olist || []) {
        if (otmp?.pickup_prev) return otmp;
    }
    return null;
}

/** C ref: pickup.c count_buc subset — bknown blessed/cursed/uncursed/unknown.
 * Coins: flags.goldX → UNKNOWN else UNCURSED.
 */
function count_buc(olist, buc) {
    let cnt = 0;
    for (const otmp of olist || []) {
        if (!otmp) continue;
        if (otmp.oclass === COIN_CLASS) {
            const coinBuc = game.flags?.goldX ? BUC_UNKNOWN : BUC_UNCURSED;
            if (buc === coinBuc) cnt++;
            continue;
        }
        if (!otmp.bknown) {
            if (buc === BUC_UNKNOWN) cnt++;
        } else if (buc === BUC_BLESSED && otmp.blessed) cnt++;
        else if (buc === BUC_CURSED && otmp.cursed) cnt++;
        else if (buc === BUC_UNCURSED && !otmp.blessed && !otmp.cursed) cnt++;
    }
    return cnt;
}

/**
 * C ref: rm.h SURFACE_AT — under-typ for DRAWBRIDGE_UP deferred → raw typ.
 */
function surface_at(x, y) {
    const lev = game.level?.at(x, y);
    if (!lev) return STONE;
    // C: DRAWBRIDGE_UP → db_under_typ(drawbridgemask); deferred
    if (lev.typ === DRAWBRIDGE_UP) return lev.typ;
    return lev.typ;
}

/**
 * C ref: pickup.c describe_decor — mention_decor feedback for features.
 * Branch envelope: dfeature_at + skip open door/doorway; furniture/typ
 * change gate; verbose "There is %s here." Named omissions: Fumbling
 * deferred_decor, waterbody_name swamp/pool rename, ice Norep,
 * back_on_ground after pool/lava/ice, decor_fumble/levitate overrides.
 */
export async function describe_decor() {
    const u = game.u;
    if (!u) return false;

    if (!game.iflags) game.iflags = {};
    const iflags = game.iflags;
    if (iflags.prev_decor == null) iflags.prev_decor = STONE;

    const ltyp = surface_at(u.ux, u.uy);
    let dfeature = dfeature_at(u.ux, u.uy);

    // C: skip ordinary open door / doorway (broken/closed still mentioned)
    const doorhere = !!(dfeature && (dfeature === 'open door'
        || dfeature === 'doorway'));
    const waterhere = !!(dfeature && dfeature === 'pool of water');
    if (doorhere || u.Underwater
        || (ltyp === ICE && IS_POOL(iflags.prev_decor))) {
        dfeature = null;
    }

    let res = true;
    if (ltyp === iflags.prev_decor && !IS_FURNITURE(ltyp)) {
        res = false;
    } else if (dfeature) {
        // waterbody_name deferred — keep "pool of water"
        void waterhere;
        if (dfeature !== 'swamp' && ltyp !== ICE) {
            dfeature = an(dfeature);
        }
        let outbuf;
        if (game.flags?.verbose !== false) {
            outbuf = `There is ${dfeature} here.`;
        } else {
            outbuf = `${upstart(dfeature)}.`;
        }
        // C: ICE + mention_decor → Norep; use pline for all (Norep deferred)
        await pline(outbuf);
    } else if (!u.Underwater) {
        // C: back_on_ground when leaving pool/lava/ice — deferred
    }

    // C: only persist prev_decor when mention_decor is On
    iflags.prev_decor = game.flags?.mention_decor ? ltyp : STONE;
    return res;
}

/**
 * C ref: pickup.c check_here — count floor objects and look_here / engr.
 * Named omissions: uchain skip.
 */
export async function check_here(picked_some) {
    const u = game.u;
    if (!u) return;

    let lhflags = picked_some ? LOOKHERE_PICKED_SOME : 0;
    // C: flags.mention_decor → describe_decor; may set LOOKHERE_SKIP_DFEATURE
    if (game.flags?.mention_decor) {
        if (await describe_decor()) {
            lhflags |= LOOKHERE_SKIP_DFEATURE;
        }
    }

    let ct = 0;
    for (let obj = objects_at(u.ux, u.uy); obj; obj = obj.nexthere) {
        // C: if (obj != uchain) ct++;
        ct++;
    }

    if (ct) {
        if (game.context?.run) nomul(0);
        await flush_screen(1);
        await look_here(ct, lhflags);
    } else {
        // C: read_engr_at(u.ux, u.uy) when no floor objects
        const { read_engr_at } = await import('./engrave.js');
        await read_engr_at(u.ux, u.uy);
    }
}

/**
 * C ref: pickup.c pick_obj — extract from floor/minvent, addinv.
 * Named omissions: shop addtobill / remote_burglary; engulfer minvent path.
 */
export async function pick_obj(otmp) {
    if (!otmp) return otmp;
    const ox = otmp.ox | 0;
    const oy = otmp.oy | 0;
    const fromfloor = otmp.where === OBJ_FLOOR;
    obj_extract_self(otmp);
    if (fromfloor) newsym(ox, oy);
    return addinv(otmp);
}

/**
 * C ref: pickup.c pickup_prinv — encumbrance-prefix prinv.
 * Overload/nearload prefix deferred; bare prinv when capacity unchanged.
 * Passes lifted `count` so invent.c prinv can show partial + "(N in total)".
 */
async function pickup_prinv(obj, count) {
    // C: prinv(prefix, obj, count) — null prefix when encumbrance unchanged
    await prinv(null, obj, count | 0);
}

/**
 * C ref: pickup.c pickup_object — lift one floor/minvent object into invent.
 * Branch envelope: observe_object; gold disp.botl; splitobj when count < quan;
 * pick_obj + prinv. Named omissions: uchain; engulfer worn; touch_artifact;
 * CORPSE fatal/rider; SCR_SCARE_MONSTER dust; lift_object carry_count fail;
 * LOADSTONE no-split; ghostly.
 */
export async function pickup_object(obj, count, telekinesis) {
    if (!obj) return 0;
    void telekinesis;

    if (!game.u?.Blind) observe_object(obj);

    let quan = count > 0 ? count : (obj.quan || 1);
    if (quan > (obj.quan || 1)) quan = obj.quan || 1;

    // lift_object carry_count deferred — always liftable for now
    // C: What's left of the special case for gold :-) — botl before pick
    // so prinv→pline→flush_screen paints $:N before any deferred more().
    if (obj.oclass === COIN_CLASS) {
        if (!game.flags) game.flags = {};
        game.flags.botl = true;
    }
    // C: LOADSTONE never splits (named omission: always allow split here;
    // AUTOSELECT full-quan path never hits this branch)
    if (quan > 0 && quan < (obj.quan || 1)) {
        obj = splitobj(obj, quan);
    }

    obj = await pick_obj(obj);
    await pickup_prinv(obj, quan);
    return 1;
}

/**
 * C ref: pickup.c query_objlist + select_menu(PICK_ANY) — floor pickup menu.
 * Letter toggles selection; Return/Enter confirms; ESC cancels.
 * `@` MENU_INVERT_ALL / `.` SELECT_ALL / `-` UNSELECT_ALL (tty wintty).
 * INVORDER_SORT (sortpack): pack-order class headings via let_to_name;
 * menu letters assigned in that display order (no USE_INVLET on floor).
 * Sort: sortloot(SORTLOOT_LOOT|PACK) + nexthere (D-0405).
 * Named omissions: FEEL_COCKATRICE; count-N; allow-filter;
 * menu_head_objsym; INCLUDE_VENOM; traditional query_classes; engulfer;
 * loot_classify subclass/disco/BUCX; SKIPINVERT; page invert/search.
 */
async function query_objlist_pickup(objList) {
    const flags = game.flags || {};
    const doSort = flags.sortpack !== false;
    // C: sortflags — sortloot 'l'/'f' + !USE_INVLET → SORTLOOT_LOOT;
    // sortpack → SORTLOOT_PACK. Floor pile is a nexthere chain.
    const sortlootOpt = flags.sortloot ?? 'l';
    let sortflags = 0;
    if (sortlootOpt === 'l' || sortlootOpt === 'f') sortflags |= SORTLOOT_LOOT;
    if (doSort) sortflags |= SORTLOOT_PACK;

    const allow = new Set(objList);
    const head = objList[0] || null;
    const ranked = head
        ? sortloot(head, sortflags, true).filter((s) => allow.has(s.obj))
        : [];

    const items = [];
    let nextLet = 'a'.charCodeAt(0);
    let first = true;
    for (const { obj } of ranked) {
        let letch;
        // C: !USE_INVLET → '$' only when the first menu item is a coin
        if (first && obj.oclass === COIN_CLASS) {
            letch = '$';
        } else {
            letch = String.fromCharCode(nextLet++);
            if (nextLet > 'z'.charCodeAt(0)) nextLet = 'A'.charCodeAt(0);
        }
        first = false;
        items.push({ obj, letch, selected: false, oclass: obj.oclass });
    }

    for (;;) {
        const entries = [
            { text: 'Pick up what?', attr: ATR_INVERSE },
            { text: '', attr: 0 },
        ];
        if (doSort) {
            let lastClass = null;
            for (const it of items) {
                if (it.oclass !== lastClass) {
                    entries.push({
                        text: let_to_name(it.oclass, false, false),
                        attr: ATR_INVERSE,
                    });
                    lastClass = it.oclass;
                }
                const mark = it.selected ? '+' : '-';
                entries.push({
                    text: `${it.letch} ${mark} ${doname(it.obj)}`,
                    attr: 0,
                });
            }
        } else {
            for (const it of items) {
                const mark = it.selected ? '+' : '-';
                entries.push({
                    text: `${it.letch} ${mark} ${doname(it.obj)}`,
                    attr: 0,
                });
            }
        }
        await paint_corner_nhw_menu(entries, '(end) ');
        await flush_screen(1);
        const key = await nhgetch();
        game._menu_overlay = false;
        await docrt();
        await flush_screen(1);

        if (key === 27) return [];
        if (key === 13 || key === 10 || key === 32) {
            return items.filter((it) => it.selected).map((it) => it.obj);
        }
        const ch = String.fromCharCode(key);
        // C: wintty.c MENU_INVERT_ALL / SELECT_ALL / UNSELECT_ALL
        if (ch === MENU_INVERT_ALL) {
            for (const it of items) it.selected = !it.selected;
            continue;
        }
        if (ch === MENU_SELECT_ALL) {
            for (const it of items) it.selected = true;
            continue;
        }
        if (ch === MENU_UNSELECT_ALL) {
            for (const it of items) it.selected = false;
            continue;
        }
        const hit = items.find((it) => it.letch === ch);
        if (hit) hit.selected = !hit.selected;
        // invalid → re-prompt
    }
}

/**
 * C ref: pickup.c autopick_testobj — pickup_types symbol filter.
 * JS pickup_types is the display-symbol string; empty ⇒ all classes.
 * Deferred: costly_spot shop reject, pickup_thrown/stolen/nopick_dropped,
 * how_lost, autopickup exceptions.
 */
function autopick_testobj(otmp) {
    const otypes = String(game.flags?.pickup_types || '');
    if (!otypes) return true;
    const sym = oclass_to_sym(otmp.oclass);
    return !!(sym && otypes.includes(sym));
}

/**
 * C ref: pickup.c pickup(what).
 * Ported envelope: autopickup && (nopick / !OBJ_AT / pool / lava) →
 * describe_decor + read_engr_at; autopickup && !flags.pickup →
 * check_here(FALSE); autopick filter (D-0368) then **always**
 * check_here(n_picked>0) (D-0387); manual `,` AUTOSELECT_SINGLE /
 * multi query_objlist PICK_ANY (D-0365). Deferred: unconscious skip,
 * notake, traditional yn/query_classes, hideunder, newsym_force,
 * full is_pool.
 */
export async function pickup(what) {
    const autopickup = what > 0;
    const count = what < 0 ? -what : 0;
    const u = game.u;
    if (!u) return 0;

    // C: autopickup && (nopick || !OBJ_AT || pool || lava)
    if (autopickup) {
        const loc = game.level?.at(u.ux, u.uy);
        const typ = loc?.typ;
        const poolish = IS_POOL(typ) && !u.Underwater;
        const lavaish = IS_LAVA(typ);
        if (game.context?.nopick || !objects_at(u.ux, u.uy)
            || poolish || lavaish) {
            if (game.flags?.mention_decor) await describe_decor();
            const { read_engr_at } = await import('./engrave.js');
            await read_engr_at(u.ux, u.uy);
            return 0;
        }
    }

    // C: autopickup && !flags.pickup → check_here(FALSE); return 0
    if (autopickup && !game.flags?.pickup) {
        if (objects_at(u.ux, u.uy)
            && game.context?.run && game.context.run !== 8
            && !game.context?.nopick) {
            nomul(0);
        }
        await check_here(false);
        return 0;
    }

    if (!can_reach_floor(true)) {
        // C: describe_decor even when !mention_decor; read_engr arms partial
        await describe_decor();
        return 0;
    }

    // C: OBJ_AT && run && run != 8 && !nopick → nomul(0) before pick
    if (!u.uswallow && objects_at(u.ux, u.uy)
        && game.context?.run && game.context.run !== 8
        && !game.context?.nopick) {
        nomul(0);
    }

    const objList = [];
    for (let obj = objects_at(u.ux, u.uy); obj; obj = obj.nexthere) {
        objList.push(obj);
    }
    // C: autopick → filter by pickup_types before picking
    const eligible = autopickup
        ? objList.filter((o) => autopick_testobj(o))
        : objList;
    const ct = eligible.length;

    if (autopickup) {
        // C: autopick → menu_pickup loop → check_here(n_picked > 0)
        // even when n==0 (ineligible / filtered objects still shown).
        const nTried = eligible.length; // C: n_tried = n before loop
        let nPicked = 0;
        // C: if (n > 0) reset_justpicked(invent) before pickup_object loop
        if (nTried > 0) reset_justpicked(game.invent);
        for (const otmp of eligible) {
            const res = await pickup_object(otmp, 0, false);
            if (res < 0) break;
            nPicked += res;
        }
        if (!u.uswallow) {
            // hideunder / newsym_force deferred
            await check_here(nPicked > 0);
        }
        return nTried > 0 ? 1 : 0;
    }

    if (ct === 0) return 0;

    // C: menu_style != TRADITIONAL → query_objlist + AUTOSELECT_SINGLE
    // One eligible object: auto-select without menu (no extra keys).
    if (ct === 1) {
        const first = eligible[0];
        const lcount = count > 0
            ? Math.min(first.quan || 1, count)
            : 0;
        // C: if (n > 0) reset_justpicked before pickup_object
        reset_justpicked(game.invent);
        const res = await pickup_object(first, lcount, false);
        return res > 0 ? 1 : 0;
    }

    // C: query_objlist("Pick up what?", …, PICK_ANY) then pickup_object each
    // Traditional query_classes path deferred (default menu ≠ TRADITIONAL).
    const pickList = await query_objlist_pickup(eligible);
    if (!pickList.length) return 0;
    // C: if (n > 0) reset_justpicked(invent)
    reset_justpicked(game.invent);
    let nTried = 0;
    for (const obj of pickList) {
        // Object may already be gone if prior pick extracted a stack sibling
        if (!obj || obj.where !== OBJ_FLOOR) continue;
        const lcount = count > 0
            ? Math.min(obj.quan || 1, count)
            : 0;
        const res = await pickup_object(obj, lcount, false);
        if (res < 0) break;
        nTried += res;
    }
    return nTried > 0 ? 1 : 0;
}

/**
 * C ref: hack.c pickup_checks — preflight for #pickup / `,`.
 * Returns >=0 → dopickup done (1=TIME, 0=OK); -1 → normal pickup;
 * -2 engulfer loot deferred as 0.
 * Named omissions: pool/lava dive plines; furniture-specific nothing msgs
 * (generic "nothing here" used); engulfer tongue/loot_mon.
 */
function pickup_checks() {
    const u = game.u;
    if (!u) return 0;

    if (u.uswallow) {
        // loot_mon / tongue paths deferred
        return 0;
    }
    if (!objects_at(u.ux, u.uy)) return 0; // nothing / furniture → ECMD_OK
    if (!can_reach_floor(true)) return 0;
    return -1;
}

/**
 * C ref: hack.c dopickup — `#pickup` / `,` command.
 * Clears multi + command_count; pickup_checks then pickup(-count).
 */
export async function dopickup() {
    const count = (game.context?.command_count | 0);
    if (game.context) game.context.command_count = 0;
    game.multi = 0;

    const ret = pickup_checks();
    if (ret >= 0) {
        if (ret === 0 && !objects_at(game.u?.ux, game.u?.uy)) {
            await pline('There is nothing here to pick up.');
        }
        return ret ? ECMD_TIME : ECMD_OK;
    }
    // ret == -1: normal floor pickup
    const tried = await pickup(-count);
    return tried ? ECMD_TIME : ECMD_OK;
}

/**
 * C ref: hack.c pooleffects(newspot).
 * Branch envelope: enter pool/lava → drown/lava_effects; leave-water /
 * steed / ceiling_hider / Wwalking arms deferred.
 * @returns {Promise<boolean>} true → skip rest of spoteffects
 */
export async function pooleffects(newspot) {
    const u = game.u;
    if (!u) return false;

    // leaving-water arm deferred

    if (!u.ustuck && !u.Levitation && !u.Flying
        && (is_pool(u.ux, u.uy) || is_lava(u.ux, u.uy))) {
        // steed / ceiling_hider deferred
        if (is_lava(u.ux, u.uy)) {
            if (await lava_effects()) return true;
        } else {
            // C: (!Wwalking || waterwall) && (newspot || !uinwater || !(Swim|…))
            const typ = game.level?.at(u.ux, u.uy)?.typ;
            const waterwall = IS_WATERWALL(typ);
            if (waterwall || newspot || !u.uinwater) {
                if (await drown()) return true;
            }
        }
    }
    return false;
}

/**
 * C ref: hack.c spoteffects(pick).
 * Ported envelope: pooleffects; check_special_room; when
 * !in_steed_dismounting — non-pit pickup then dotrap then pit pickup.
 * Deferred: recursion guards, sink fall, levitation timeout, Warning ice,
 * hidden monster surprise.
 */
export async function spoteffects(pick) {
    if (await pooleffects(true)) return;

    await check_special_room(false);

    // C: entire pickup/dotrap block gated on !gi.in_steed_dismounting
    if (game.in_steed_dismounting) return;
    const u = game.u;
    if (!u) return;

    const trap = t_at(u.ux, u.uy);
    const pit = !!(trap && is_pit(trap.ttyp));
    if (pick && !pit) await pickup(1);
    if (trap) await dotrap(trap, NO_TRAP_FLAGS);
    if (pick && pit) await pickup(1);
}

/**
 * C ref: end.c container_contents — NHW_MENU "Contents of %s:" + doname lines
 * via invent.c sortloot(SORTLOOT_LOOT|SORTLOOT_PACK). display_nhwindow(TRUE).
 * Named omissions: identified discover path; doname_with_price shop;
 * nested containers / Schroedinger / empty pline beyond reportempty=false;
 * sortloot subclass/disco/BUCX.
 */
async function container_contents(box) {
    if (!box) return;
    box.cknown = 1;
    const { doname, xname, the: theArt } = await import('./objnam.js');
    const { show_nhw_menu_text } = await import('./pager.js');
    const lines = [`Contents of ${theArt(xname(box))}:`, ''];
    if (box.cobj) {
        // C: flags.sortloot 'l'/'f' → SORTLOOT_LOOT; sortpack → SORTLOOT_PACK
        const flags = game.flags || {};
        const sortlootOpt = flags.sortloot ?? 'l';
        let sortflags = 0;
        if (sortlootOpt === 'l' || sortlootOpt === 'f') sortflags |= SORTLOOT_LOOT;
        if (flags.sortpack !== false) sortflags |= SORTLOOT_PACK;
        const sorted = sortloot(box.cobj, sortflags, false);
        for (const srtc of sorted) {
            lines.push(`  ${doname(srtc.obj)}`);
        }
    }
    await show_nhw_menu_text(lines);
}

/**
 * C ref: pickup.c out_container — remove one object from current_container
 * into invent. Branch envelope: gold / ordinary; lift always ok. Named
 * omissions: artifact touch; fatal corpse; split count; icebox; shop bill;
 * pick_pick.
 * @returns {number} -1 stop, 1 removed, 0 not removed
 */
async function out_container(obj) {
    if (!obj || !game._current_container) return -1;
    const is_gold = obj.oclass === COIN_CLASS;
    if (is_gold) obj.owt = weight(obj);

    // lift_object deferred — always allow
    // C: count before addinv merge (gold may grow; prinv total_of needs it)
    const count = obj.quan || 1;
    obj_extract_self(obj);
    game._current_container.owt = weight(game._current_container);

    const otmp = addinv(obj);
    await pickup_prinv(otmp, count);
    if (is_gold) {
        // C: bot() — gold count; botl refreshed on next flush
        if (game.botl != null) game.botl = 1;
    }
    return 1;
}

/**
 * C ref: pickup.c in_or_out_menu — NHW_MENU PICK_ONE for bag actions.
 * Branch envelope: look/take-out/put-in/both/reversed/stash/done; lootabc
 * deferred (use :oibrsq letters).
 */
async function in_or_out_menu(prompt, obj, outokay, inokay, alreadyused) {
    // C tty_end_menu: prompt uses tty_menu_promptstyle (= menu_headings,
    // default ATR_INVERSE); blank separator; then add_menu items.
    const entries = [{ text: prompt, attr: ATR_INVERSE }, { text: '', attr: 0 }];
    const simple = thesimpleoname(obj); // "the bag"
    entries.push({ text: `: - Look inside ${simple}`, attr: 0, sel: ':' });
    if (outokay) {
        entries.push({ text: 'o - take something out', attr: 0, sel: 'o' });
    }
    if (inokay) {
        entries.push({ text: 'i - put something in', attr: 0, sel: 'i' });
    }
    if (outokay) {
        entries.push({
            text: inokay
                ? 'b - both; take out, then put in'
                : 'b - take out, then put in',
            attr: 0,
            sel: 'b',
        });
    }
    if (inokay) {
        entries.push({
            text: outokay
                ? 'r - both reversed; put in, then take out'
                : 'r - put in, then take out',
            attr: 0,
            sel: 'r',
        });
        entries.push({
            text: `s - stash one item into ${simple}`,
            attr: 0,
            sel: 's',
        });
    }
    entries.push({ text: '', attr: 0 });
    // C: MENU_ITEMFLAGS_SELECTED on default → process_menu_window paints
    // '*' at the '-' slot (wintty.c n==2 && selected).
    entries.push({
        text: `q * ${alreadyused ? 'done' : 'do nothing'}`,
        attr: 0,
        sel: 'q',
    });

    const bySel = new Map();
    for (const e of entries) {
        if (e.sel) bySel.set(e.sel, e.sel);
    }

    for (;;) {
        await paint_corner_nhw_menu(
            entries.map((e) => ({ text: e.text, attr: e.attr || 0 })),
            '(end) ',
        );
        await flush_screen(1);
        const key = await nhgetch();
        game._menu_overlay = false;
        await docrt();
        await flush_screen(1);

        if (key === 27) return 'q';
        const ch = String.fromCharCode(key);
        if (bySel.has(ch)) return ch;
    }
}

/**
 * C ref: pickup.c menu_loot(0, FALSE) — take out via PICK_ANY object menu.
 * Branch envelope: MENU_PARTIAL-style (no category filter); letter toggle;
 * Return confirms; ESC cancels. put_in / FULL category / autopick deferred.
 */
async function menu_loot_takeout(container) {
    const items = [];
    for (let obj = container.cobj; obj; obj = obj.nobj) {
        let letch = obj.invlet;
        if (obj.oclass === COIN_CLASS) letch = '$';
        if (typeof letch !== 'string' || letch.length !== 1) {
            letch = obj.oclass === COIN_CLASS ? '$' : '?';
        }
        items.push({ obj, letch, selected: false });
    }
    if (!items.length) return ECMD_OK;

    container.cknown = 1;
    let n_looted = 0;
    for (;;) {
        const entries = [
            { text: 'Take out what?', attr: ATR_INVERSE },
            { text: '', attr: 0 },
        ];
        // Group coins header like C INVORDER_SORT
        let coinHdr = false;
        for (const it of items) {
            if (it.obj.oclass === COIN_CLASS && !coinHdr) {
                entries.push({ text: 'Coins', attr: ATR_INVERSE });
                coinHdr = true;
            }
            const mark = it.selected ? '+' : '-';
            entries.push({
                text: `${it.letch} ${mark} ${doname(it.obj)}`,
                attr: 0,
            });
        }
        await paint_corner_nhw_menu(entries, '(end) ');
        await flush_screen(1);
        const key = await nhgetch();
        game._menu_overlay = false;
        await docrt();
        await flush_screen(1);

        if (key === 27) break;
        if (key === 13 || key === 10 || key === 32) {
            const chosen = items.filter((it) => it.selected);
            for (const it of chosen) {
                const res = await out_container(it.obj);
                if (res < 0) break;
                n_looted += res;
            }
            break;
        }
        const ch = String.fromCharCode(key);
        if (ch === MENU_INVERT_ALL) {
            for (const it of items) it.selected = !it.selected;
            continue;
        }
        if (ch === MENU_SELECT_ALL) {
            for (const it of items) it.selected = true;
            continue;
        }
        if (ch === MENU_UNSELECT_ALL) {
            for (const it of items) it.selected = false;
            continue;
        }
        const hit = items.find((it) => it.letch === ch);
        if (hit) hit.selected = !hit.selected;
    }
    return n_looted ? ECMD_TIME : ECMD_OK;
}

/**
 * C ref: pickup.c in_container — move invent obj into current_container.
 * Envelope: held bag only; gold/ordinary; quest/mbag explosion deferred.
 * @returns {number} 1 stashed, 0 refused, -1 stop
 */
async function in_container(obj) {
    const cont = game._current_container;
    if (!cont || !obj) return 0;
    if (obj === cont) {
        await pline('That would be an interesting topological exercise.');
        return 0;
    }
    if (obj.owornmask) {
        await pline('You cannot stash something you are wearing.');
        return 0;
    }

    const inv = game.invent || [];
    const idx = inv.indexOf(obj);
    if (idx < 0) return 0;
    inv.splice(idx, 1);

    const is_gold = obj.oclass === COIN_CLASS;
    if (is_gold) {
        game._goldCount = Math.max(0, (game._goldCount || 0) - (obj.quan || 0));
        if (game.botl != null) game.botl = 1;
    }

    await pline(`You put ${doname(obj)} into ${thesimpleoname(cont)}.`);
    add_to_container(cont, obj);
    cont.owt = weight(cont);
    return 1;
}

/**
 * C ref: pickup.c query_category for MENU_FULL put-in (menu_loot).
 * Branch envelope: CHOOSE_ALL 'A' + hint; ALL_TYPES 'a'; inv_order classes
 * with def_oc_syms group accel; BUCX B/U/X; JUSTPICKED 'P'; PICK_ANY
 * letter/`$` toggle; Return confirms. Named omissions: unpaid/billed;
 * ParanoidAutoAll confirm; WORN_TYPES; venom.
 * @returns {Set<number|string>|null} selected filters, or null if canceled
 */
async function query_putin_category() {
    const cont = game._current_container;
    // C: walk full invent (includes current container) for categories
    const invent = (game.invent || []).filter((o) => o);
    if (!invent.length) return null;

    // Present oclasses in inv_order (skip empty).
    const classes = [];
    for (const oc of DEF_INV_ORDER) {
        if (invent.some((o) => o.oclass === oc)) classes.push(oc);
    }
    
    const showAll = classes.length > 1;

    const doBlessed = count_buc(invent, BUC_BLESSED) > 0;
    const doCursed = count_buc(invent, BUC_CURSED) > 0;
    const doUncursed = count_buc(invent, BUC_UNCURSED) > 0;
    const doUnknown = count_buc(invent, BUC_UNKNOWN) > 0;
    const nJust = count_justpicked(invent);
    const justObj = nJust === 1 ? find_justpicked(invent) : null;

    // Menu rows: { sel, accel, value, label, skipInvert }
    const rows = [];
    rows.push({
        sel: 'A', accel: null, value: 'A', skipInvert: true,
        label: 'Auto-select every relevant item',
    });
    rows.push({ kind: 'hint', label: '    (ignored unless some other choices are also picked)' });
    rows.push({ kind: 'blank' });
    let invlet = 'a'.charCodeAt(0);
    if (showAll) {
        rows.push({
            sel: String.fromCharCode(invlet++), accel: null,
            value: ALL_TYPES_SELECTED, skipInvert: true,
            label: 'All types',
        });
    }
    for (const oc of classes) {
        const sel = String.fromCharCode(invlet++);
        rows.push({
            sel, accel: oclass_to_sym(oc) || null, value: oc, skipInvert: false,
            label: let_to_name(oc, false, false),
        });
    }
    if (doBlessed || doCursed || doUncursed || doUnknown || nJust) {
        rows.push({ kind: 'blank' });
    }
    if (doBlessed) {
        rows.push({
            sel: 'B', accel: null, value: 'B', skipInvert: true,
            label: 'Items known to be Blessed',
        });
    }
    if (doCursed) {
        rows.push({
            sel: 'C', accel: null, value: 'C', skipInvert: true,
            label: 'Items known to be Cursed',
        });
    }
    if (doUncursed) {
        rows.push({
            sel: 'U', accel: null, value: 'U', skipInvert: true,
            label: 'Items known to be Uncursed',
        });
    }
    if (doUnknown) {
        rows.push({
            sel: 'X', accel: null, value: 'X', skipInvert: true,
            label: 'Items of unknown Bless/Curse status',
        });
    }
    if (nJust) {
        const lab = nJust === 1 && justObj
            ? `Just picked up: ${doname(justObj)}`
            : 'Items you just picked up';
        rows.push({
            sel: 'P', accel: null, value: 'P', skipInvert: true,
            label: lab,
        });
    }

    const selected = new Set();
    for (;;) {
        const entries = [
            { text: 'Put in what type of objects?', attr: ATR_INVERSE },
            { text: '', attr: 0 },
        ];
        for (const row of rows) {
            if (row.kind === 'blank') {
                entries.push({ text: '', attr: 0 });
                continue;
            }
            if (row.kind === 'hint') {
                entries.push({ text: row.label, attr: 0 });
                continue;
            }
            const mark = selected.has(row.value) ? '+' : '-';
            entries.push({ text: `${row.sel} ${mark} ${row.label}`, attr: 0 });
        }
        await paint_corner_nhw_menu(entries, '(end) ');
        await flush_screen(1);
        const key = await nhgetch();
        game._menu_overlay = false;
        await docrt();
        await flush_screen(1);

        if (key === 27) return null;
        if (key === 13 || key === 10 || key === 32) {
            return selected.size ? selected : null;
        }
        const ch = String.fromCharCode(key);
        const hit = rows.find((r) => r.sel === ch
            || (r.accel && r.accel === ch));
        if (hit && hit.value != null) {
            if (selected.has(hit.value)) selected.delete(hit.value);
            else selected.add(hit.value);
        }
    }
}

/**
 * C ref: pickup.c menu_loot(0, TRUE) — put in via category + PICK_ANY.
 * Branch envelope: MENU_FULL category filters; invent letter toggle; Return
 * → in_container. Named omissions: unpaid/billed; ParanoidAutoAll; autopick
 * 'A' mass put; justpicked shortcut; BUC filter apply; mbag explosion.
 */
async function menu_loot_putin(container) {
    if (!container) return ECMD_OK;
    const cats = await query_putin_category();
    if (!cats) return ECMD_OK;

    const allTypes = cats.has(ALL_TYPES_SELECTED);
    const items = [];
    for (const obj of game.invent || []) {
        if (!obj || obj === container) continue;
        if (!allTypes && !cats.has(obj.oclass)) continue;
        let letch = obj.invlet;
        if (obj.oclass === COIN_CLASS) letch = '$';
        if (typeof letch !== 'string' || letch.length !== 1) {
            letch = obj.oclass === COIN_CLASS ? '$' : '?';
        }
        items.push({ obj, letch, selected: false });
    }
    if (!items.length) return ECMD_OK;

    let n_looted = 0;
    for (;;) {
        const entries = [
            { text: 'Put in what?', attr: ATR_INVERSE },
            { text: '', attr: 0 },
        ];
        let coinHdr = false;
        for (const it of items) {
            if (it.obj.oclass === COIN_CLASS && !coinHdr) {
                entries.push({ text: 'Coins', attr: ATR_INVERSE });
                coinHdr = true;
            }
            const mark = it.selected ? '+' : '-';
            entries.push({
                text: `${it.letch} ${mark} ${doname(it.obj)}`,
                attr: 0,
            });
        }
        await paint_corner_nhw_menu(entries, '(end) ');
        await flush_screen(1);
        const key = await nhgetch();
        game._menu_overlay = false;
        await docrt();
        await flush_screen(1);

        if (key === 27) break;
        if (key === 13 || key === 10 || key === 32) {
            const chosen = items.filter((it) => it.selected);
            for (const it of chosen) {
                // re-check still in invent (prior put may have merged)
                if (!(game.invent || []).includes(it.obj)) continue;
                const res = await in_container(it.obj);
                if (res < 0) break;
                n_looted += res;
            }
            break;
        }
        const ch = String.fromCharCode(key);
        if (ch === MENU_INVERT_ALL) {
            for (const it of items) it.selected = !it.selected;
            continue;
        }
        if (ch === MENU_SELECT_ALL) {
            for (const it of items) it.selected = true;
            continue;
        }
        if (ch === MENU_UNSELECT_ALL) {
            for (const it of items) it.selected = false;
            continue;
        }
        const hit = items.find((it) => it.letch === ch);
        if (hit) hit.selected = !hit.selected;
    }
    return n_looted ? ECMD_TIME : ECMD_OK;
}

/**
 * C ref: pickup.c use_container — held/floor container loot.
 * Branch envelope: unlocked; in_or_out_menu; ':' look; 'o' menu_loot take-out;
 * 'i' menu_loot put-in; 'q' abort. Named omissions: chest trap; BoT;
 * stash/both/reversed; traditional_loot; MENU_FULL non-coin categories;
 * more_containers 'n'.
 *
 * @param {object} obj container
 * @param {boolean} [held=false] applied from invent
 * @param {boolean} [_more=false] multiple #loot (deferred)
 */
export async function use_container(obj, held = false, _more = false) {
    if (!obj) return ECMD_OK;

    if (obj.olocked) {
        // C ref: pickup.c use_container — lknown vs discover-lock pline
        if (obj.lknown)
            await pline(`${upstart(theArt(xname(obj)))} is locked.`);
        else
            await pline(`Hmmm, ${theArt(xname(obj))} turns out to be locked.`);
        obj.lknown = 1;
        // autounlock / pick_lock deferred
        return ECMD_OK;
    }

    game._current_container = obj;
    let used = ECMD_OK;
    const inokay = (game.invent || []).some((o) => o && o !== obj);
    // C: outokay = Has_contents; outmaybe = outokay || !cknown
    const outokay = Has_contents(obj);
    // C: preformat emptymsg when !outokay — Ysimple_name2 + optional "now "
    // (quantum_cat / cursed_mbag "now " deferred).
    let emptymsg = '';
    if (!outokay) {
        emptymsg = `${Ysimple_name2(obj)} is empty.`;
    }
    let c = 'q';
    for (;;) {
        // C: prompt uses outmaybe, not bare outokay (empty+!cknown →
        // "Do what with your bag?" still offers take-out).
        const outmaybe = outokay || !obj.cknown;
        const qbuf = outmaybe
            ? `Do what with ${yname(obj)}?`
            : `${upstart(yname(obj))} is empty.  Do what with it?`;
        c = await in_or_out_menu(
            qbuf, obj, outmaybe, inokay, used !== ECMD_OK,
        );
        if (c === ':') {
            if (!obj.cknown) used = ECMD_TIME;
            await container_contents(obj);
            continue;
        }
        break;
    }

    if (c === 'q' || c === 'n') {
        game._current_container = null;
        return used;
    }

    const loot_out = (c === 'o' || c === 'b');
    if (loot_out) {
        if (!Has_contents(obj)) {
            // C: pline1(emptymsg) — Ysimple_name2 ("The bag is empty.")
            await pline(emptymsg || `${Ysimple_name2(obj)} is empty.`);
            if (!obj.cknown) used = ECMD_TIME;
            obj.cknown = 1;
        } else {
            used |= await menu_loot_takeout(obj);
        }
    }
    // 'i' put-in; 'b' take-out then put-in. 'r' reversed / stash deferred.
    if (c === 'i' || c === 'b') {
        used |= await menu_loot_putin(obj);
    }

    // C: use_container containerdone — if used, mark contents known
    // (put-in alone does not set cknown in menu_loot; this does).
    if (used && obj) obj.cknown = 1;

    game._current_container = null;
    void held;
    return used;
}

/**
 * C ref: pickup.c doloot / doloot_core — loot container underfoot.
 * Branch envelope: single unlocked floor container → use_container.
 * Named omissions: capacity/nohands/Confusion reverse_loot; multi-cont
 * menu; directional lootmon/get_adjacent_loc; grave; saddle; cockatrice.
 */
export async function doloot() {
    const u = game.u;
    if (!u) return ECMD_OK;

    const { Is_container } = await import('./const.js');
    let cobj = null;
    for (let o = objects_at(u.ux, u.uy); o; o = o.nexthere) {
        if (Is_container(o)) {
            cobj = o;
            break;
        }
    }
    if (!cobj) return ECMD_OK;

    // C: do_loot_cont → use_container for unlocked non-BoT
    return use_container(cobj);
}
