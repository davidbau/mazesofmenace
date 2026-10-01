// steal.c — stealing and removal of worn items.
// C ref: steal.c:212 remove_worn_item

import { rn1, rn2 } from './rng.js';
import { game } from './gstate.js';
import { s_suffix } from './hacklib.js';
import {
    cancel_don,
    donning,
    Ring_gone,
    Amulet_off,
    Blindf_off,
    Armor_off,
    Boots_off,
    Cloak_off,
    Gloves_off,
    Helmet_off,
    Shield_off,
    Shirt_off,
} from './do_wear.js';
import {
    W_ARMOR,
    W_AMUL,
    W_RING,
    W_TOOL,
    W_WEP,
    W_SWAPWEP,
    W_QUIVER,
    W_WEAPONS,
    W_BALL,
    W_CHAIN,
    COLNO,
    ROWNO,
    OBJ_FREE,
    OBJ_FLOOR,
    OBJ_CONTAINED,
    OBJ_INVENT,
    OBJ_LUAFREE,
    OBJ_MINVENT,
    OBJ_MIGRATING,
    OBJ_BURIED,
    OBJ_ONBILL,
    SHOPBASE,
    isok,
    ESHK,
    I_SPECIAL,
} from './const.js';
import { artifact_light } from './light.js';
import { update_inventory } from './inventory_refresh.js';
import { OBJ_DELETED } from './const.js';
import { setworn, setnotworn } from './worn.js';
export { setworn } from './worn.js';
import { newsym, pline } from './display.js';
import { Blind, cansee } from './vision.js';
import { canspotmon, canseemon } from './display.js';
import { Monnam } from './mcastu.js';
import { is_fainted } from './eat.js';
import { unpunish } from './dig.js';
import { unconscious } from './pickup.js';
import { findgold } from './makemon.js';
import { droppables } from './dogmove.js';
import { extract_from_minvent } from './trap.js';
import { obfree, stolen_value } from './dokick.js';
import { simpleonames, Tobjnam, is_quest_artifact as is_quest_artifact_real } from './objnam.js';
import { end_burn } from './timeout.js';
import { goodpos } from './trap.js';
import { obj_extract_self, remove_object, place_object, mdrop_obj_md, revive_corpse } from './mklev.js';
import { flooreffects } from './cmd.js';
import { find_objowner, costly_spot, in_rooms, inhishop, subfrombill, addtobill as shk_addtobill } from './shk.js';
import { within_bounded_area } from './rect.js';
import { PM_DEATH, PM_FAMINE, PM_PESTILENCE } from './pm.generated.js';
/* C zap.c:1458 obj_resists — the body WITH C's Rider-corpse clause
 * (js/zap.js:372).  js/dogmove.js:506 exports a second body of the same name
 * that deliberately OMITS that clause; at this file's one call site,
 * mdrop_special_objs()'s `obj_resists(obj, 0, 0)`, the clause is the whole
 * point — with ochance == achance == 0 the rn2(100) can never make the
 * predicate true, so the special-otyp list (which C's is_rider() arm belongs
 * to) is the ONLY thing that can, and C's own comment at that call site names
 * "Rider corpses" alongside the Amulet and the invocation tools.  So the
 * dogmove body is NOT interchangeable here.  js/zap.js already imports rloco
 * from this file, so this closes a two-module cycle; safe because this file's
 * only module-level statement is a numeric const (RLOCO_CORPSE) and nothing
 * here or there calls across the cycle during module evaluation. */
import { obj_resists } from './zap.js';

/**
 * C ref: steal.c:212 remove_worn_item()
 *
 * An object you're wearing has been taken off by a monster (theft or
 * seduction). Also used if a worn item gets transformed (stone to flesh).
 *
 * Port notes:
 * - obj.owornmask field is reconstructed and available
 * - obj.in_use and obj.bypass are mutable state fields
 * - obj.where is available in the obj record
 */
/* C ref: steal.c:12-34 somegold(lmoney) — "proportional subset of gold; return
 * value actually fits in an int".  RNG: ONE rn1(), and only when the pile is 50
 * or more; under 50 C returns the whole amount without drawing.
 * js/makemon.js carried `export function somegold() { throw ... }` and nothing
 * else defined it, so dipfountain's fate-28 gold loss (fountain.c:510) could
 * not be ported at all. */
export function somegold(lmoney) {
    /* C: LARGEST_INT is the 16-bit-era int cap (global.h); the clamp cannot
     * fire for any amount this port can hold. */
    const LARGEST_INT = 0x7fff;
    let igold = (lmoney >= LARGEST_INT) ? LARGEST_INT : (lmoney | 0);
    if (igold < 50)
        ; /* all gold */
    else if (igold < 100)
        igold = rn1(igold - 25 + 1, 25);
    else if (igold < 500)
        igold = rn1(igold - 50 + 1, 50);
    else if (igold < 1000)
        igold = rn1(igold - 100 + 1, 100);
    else if (igold < 5000)
        igold = rn1(igold - 500 + 1, 500);
    else if (igold < 10000)
        igold = rn1(igold - 1000 + 1, 1000);
    else
        igold = rn1(igold - 5000 + 1, 5000);
    return igold;
}
export async function remove_worn_item(obj, unchain_ball) {
    if (!obj) return;

    // C steal.c:219-220: if (donning(obj)) cancel_don();
    if (donning(obj)) {
        cancel_don();
    }

    // C: if (!obj->owornmask) return;
    if (!obj.owornmask) {
        return;
    }

    // C: unsigned oldinuse = obj->in_use;
    const oldinuse = obj.in_use || 0;

    // C: obj->in_use = 1;
    obj.in_use = 1;

    // C: if (obj->owornmask & W_ARMOR)
    if (obj.owornmask & W_ARMOR) {
        // C: if (obj == uskin) { impossible(...); skinback(TRUE); }
        if (obj === game.u.uskin) {
            impossible("Removing embedded scales?");
            skinback(true);
        }

        // C: if (obj == uarm) Armor_off();
        if (obj === game.u.uarm) {
            await Armor_off();
        } else if (obj === game.u.uarmc) {
            await Cloak_off();
        } else if (obj === game.u.uarmf) {
            await Boots_off();
        } else if (obj === game.u.uarmg) {
            await Gloves_off();
        } else if (obj === game.u.uarmh) {
            await Helmet_off();
        } else if (obj === game.u.uarms) {
            await Shield_off();
        } else if (obj === game.u.uarmu) {
            await Shirt_off();
        } else {
            // C: catchall -- should never happen
            // C: setworn((struct obj *) 0, obj->owornmask & W_ARMOR);
            await setworn(null, obj.owornmask & W_ARMOR);
        }
    } else if (obj.owornmask & W_AMUL) {
        // C: Amulet_off();
        await Amulet_off();
    } else if (obj.owornmask & W_RING) {
        // C: Ring_gone(obj);
        await Ring_gone(obj);
    } else if (obj.owornmask & W_TOOL) {
        // C: Blindf_off(obj);
        await Blindf_off(obj);
    } else if (obj.owornmask & W_WEAPONS) {
        // C: if (obj == uwep) uwepgone();
        if (obj === game.u.uwep) {
            await uwepgone();
        }
        // C: if (obj == uswapwep) uswapwepgone();
        if (obj === game.u.uswapwep) {
            await uswapwepgone();
        }
        // C: if (obj == uquiver) uqwepgone();
        if (obj === game.u.uquiver) {
            await uqwepgone();
        }
    }

    // C: if (obj->owornmask & (W_BALL | W_CHAIN))
    if (obj.owornmask & (W_BALL | W_CHAIN)) {
        // C: if (unchain_ball) unpunish();
        if (unchain_ball) {
            await unpunish();
        }
    } else if (obj.owornmask) {
        // C: else catchall: setnotworn(obj);
        setnotworn(obj);
    }

    // C: if (obj->where == OBJ_DELETED) debugpline1(...);
    if (obj.where === OBJ_DELETED) {
        debugpline1("remove_worn_item() \"%s\" deleted!", simpleonames(obj));
    }

    // C: obj->in_use = oldinuse;
    obj.in_use = oldinuse;
}

export function unresponsive() {
    if (game.multi >= 0)
        return false;

    return (unconscious() || is_fainted()
            || (game.multi_reason
                && (game.multi_reason.substring(0, 6) === "frozen"
                    || game.multi_reason.substring(0, 9) === "paralyzed")));
}

// Stubs for unported helpers — these will be ported separately or imported
// from modules that define them.

/* donning() was a throw-stub here, SHADOWING the real body in js/do_wear.js
 * (:2912) -- and because remove_worn_item() wrapped the call in a try/catch
 * that re-threw whenever obj->owornmask was set, the ONE case the stub could
 * not be skipped in was a WORN item, which is the only case remove_worn_item
 * exists for at all.  A water nymph stealing a worn ring hit it head-on.  It is
 * imported at the head of this file now; do not re-add a stub (same trap as
 * freeinv()/put_saddle_on_mon in cmd.js).
 *
 * cancel_don (do_wear.c:3020-3040) was ALSO a throw-stub here, SHADOWING a
 * real, general, RNG-free, synchronous body at js/do_wear.js:4426 -- the
 * earlier comment above claiming "no real body anywhere in js/" was stale
 * (js/polyself.js's copy is a throw-stub, but do_wear.js's is not). Verified
 * by reading it: it models ga.afternmv as a string tag against
 * ARMCAT_TO_AFTERNMV_ON rather than a function pointer, one membership test
 * standing in for C's seven comparisons, otherwise a direct transliteration.
 * Now imported at the head of this file; do not re-add a stub. */

/* C ref: nethack-c/src/pline.c:587-637 — impossible() logs and RETURNS; it
 * never aborts.  C's uskin arm calls impossible() and then continues into
 * skinback(TRUE). */
function impossible(_msg, ..._args) { }

function skinback(val) {
    const u = game.u || {};
    const skin = u.uskin;
    if (!skin)
        return;
    if (!val)
        pline('Your skin returns to its original form.');
    /* C polyself.c:1942-1953: restore the embedded armor as uarm and clear
     * the temporary I_SPECIAL marker used while polymorphed. */
    u.uarm = skin;
    u.uskin = null;
    skin.owornmask = (skin.owornmask | 0) & ~I_SPECIAL;
}

/* C wield.c:uwepgone — stop artifact light before clearing the slot. */
export async function uwepgone() {
    if (game.u.uwep) {
        if (artifact_light(game.u.uwep) && game.u.uwep.lamplit) {
            end_burn(game.u.uwep, false);
            if (!Blind())
                await pline("%s shining.", Tobjnam(game.u.uwep, "stop"));
        }
        await setworn(null, W_WEP);
        game.unweapon = true;
        update_inventory();
    }
}

/* C wield.c:uswapwepgone — C refreshes again after setworn returns. */
export async function uswapwepgone() {
    if (game.u.uswapwep) {
        await setworn(null, W_SWAPWEP);
        update_inventory();
    }
}

/* C wield.c:uqwepgone */
export async function uqwepgone() {
    if (game.u.uquiver) {
        await setworn(null, W_QUIVER);
        update_inventory();
    }
}


function debugpline1(msg, ...args) {
    /* C debugpline1() writes only to the optional debug log; this port has no
     * debug log sink, so preserve the call as an intentional no-op. */
}


/* is_fainted (eat.c:3347) was a throw-stub, SHADOWING a real, general,
 * RNG-free body at js/eat.js:2280 (`u.uhs === FAINTED`). Now imported at the
 * head of this file. */

/* unconscious (trap.c:6756) was a throw-stub, SHADOWING a real, general,
 * RNG-free body at js/pickup.js:1549 -- already live-imported by js/uhitm.js
 * for the AD_TELE hit message. js/teleport.js and js/eat.js carry their own
 * module-private duplicates of the same logic; outside this file's ownership,
 * not touched. Now imported at the head of this file. */

export async function relobj(mtmp, show, is_pet) {
    let otmp;
    const omx = mtmp.mx, omy = mtmp.my;

    /* vault guard's gold goes away rather than be dropped... */
    if (mtmp.isgd && (otmp = findgold(mtmp.minvent)) !== null) {
        if (canspotmon(mtmp))
            pline("%s gold %s.", s_suffix(Monnam(mtmp)),
                  canseemon(mtmp) ? "vanishes" : "seems to vanish");
        obj_extract_self(otmp);
        await obfree(otmp, null);
    } /* isgd && has gold */

    while ((otmp = (is_pet ? droppables(mtmp) : mtmp.minvent)) !== null) {
        await mdrop_obj(mtmp, otmp, is_pet && flags.verbose);
    }

    if (show && cansee(omx, omy))
        newsym(omx, omy);
}

/* findgold (steal.c:44-52) was a throw-stub, SHADOWING a real, general,
 * RNG-free body at js/makemon.js:2172 -- an exact transliteration (walk the
 * ->nobj chain for the first GOLD_PIECE). js/makemon.js already imports
 * remove_worn_item/somegold from this file, so this completes an existing
 * runtime call-cycle rather than opening a new one; nothing here or there
 * calls across the cycle at module-init time. Now imported at the head of
 * this file. */

/* mdrop_obj: use the complete steal.c:812 implementation hosted in mklev.js. */
async function mdrop_obj(mon, obj, verbose) {
    return await mdrop_obj_md(mon, obj, verbose);
}

export async function mdrop_special_objs(mon) {
    let obj, otmp;
    for (obj = mon.minvent; obj; obj = otmp) {
        otmp = obj.nobj;
        /* the Amulet, invocation tools, and Rider corpses resist even when
           artifacts and ordinary objects are given 0% resistance chance;
           current role's quest artifact is rescued too--quest artifacts
           for the other roles are not */
        if (obj_resists(obj, 0, 0) || is_quest_artifact(obj)) {
            if (mon.mx) {
                await mdrop_obj(mon, obj, false);
            } else { /* migrating monster not on map */
                await extract_from_minvent(mon, obj, true, true);
                await rloco(obj);
            }
        }
    }
}


function _rloco_on_W_tower_level(lev) {
    if (!lev)
        return false;
    const g = game;
    const same = (a) => !!(a && (a.dnum | 0) === (lev.dnum | 0)
                            && (a.dlevel | 0) === (lev.dlevel | 0));
    return same(g.wiz1_level) || same(g.wiz2_level) || same(g.wiz3_level);
}

/* C ref: shk.c:5368-5381 costly_adjacent(shkp, x, y) — unexported file-local
 * in js/shk.js (which itself notes it "was a WRONG TWIN" pattern for
 * costly_spot); copied here rather than exported across files, same
 * one-file-scope reasoning as On_W_tower_level above. */
function _rloco_costly_adjacent(shkp, x, y) {
    if (!shkp || !inhishop(shkp) || !isok(x, y))
        return false;
    const eshkp = ESHK(shkp);
    const loc = game.level?.at ? game.level.at(x, y) : null;
    return !!(loc?.edge)
        || (x === (eshkp?.shk?.x | 0) && y === (eshkp?.shk?.y | 0));
}

/* First entry of in_rooms(x, y, typewanted), or 0 if the list is empty --
 * mirrors C's `*in_rooms(...)` (in_rooms returns a room-number string; the
 * leading char is the "primary" room, 0 == none). */
function _rloco_room0(x, y, typewanted) {
    const rooms = in_rooms(x, y, typewanted);
    return rooms && rooms.length ? (rooms[0] | 0) : 0;
}

/* True iff nonzero room `roomno` appears anywhere in in_rooms(x, y,
 * typewanted)'s list -- mirrors C's `strchr(in_rooms(...), roomno)` (a room
 * number of 0 never matches, same as every call site's own `h &&`/`oo &&`
 * guard ahead of it). */
function _rloco_room_has(x, y, typewanted, roomno) {
    if (!roomno)
        return false;
    const rooms = in_rooms(x, y, typewanted);
    return !!(rooms && rooms.includes(roomno));
}

/* C ref: mondata.h is_rider(ptr), used by teleport.c:2107. */
function _rloco_is_rider(obj) {
    const n = obj?.corpsenm | 0;
    return n === PM_DEATH || n === PM_FAMINE || n === PM_PESTILENCE;
}

const RLOCO_CORPSE = 265; /* objects[].otyp CORPSE -- same literal js/dig.js,
                              js/dog.js and js/hold_another_object.js each use
                              locally for this otyp. */

export async function rloco(obj) {
    /* teleport.c:2107-2110 -- a Rider corpse revives instead of relocating;
     * C returns FALSE when revival consumes the object. */
    if ((obj.otyp | 0) === RLOCO_CORPSE && _rloco_is_rider(obj)) {
        if (await revive_corpse(obj))
            return false;
    }

    obj_extract_self(obj);
    const otx = obj.ox | 0;
    const oty = obj.oy | 0;
    const dndest = game.dndest || {};
    const restrictedFall = (otx === 0 && dndest.lx);

    let tx, ty;
    let tryLimit = 4000;
    for (;;) {
        tx = rn1(COLNO - 3, 2);
        ty = rn2(ROWNO);
        if (!--tryLimit)
            break;
        if (!goodpos(tx, ty, null, 0))
            continue;
        if (restrictedFall) {
            const inDn = within_bounded_area(tx, ty, dndest.lx, dndest.ly, dndest.hx, dndest.hy);
            const inNear = dndest.nlx
                ? within_bounded_area(tx, ty, dndest.nlx, dndest.nly, dndest.nhx, dndest.nhy)
                : false;
            if (!inDn || inNear)
                continue;
        }
        if (dndest.nlx && _rloco_on_W_tower_level(game.u?.uz)) {
            const nowIn = within_bounded_area(tx, ty, dndest.nlx, dndest.nly, dndest.nhx, dndest.nhy);
            const wasIn = within_bounded_area(otx, oty, dndest.nlx, dndest.nly, dndest.nhx, dndest.nhy);
            if (nowIn !== wasIn)
                continue;
        }
        break;
    }

    if (await flooreffects(obj, tx, ty, 'fall')) {
        if (!(otx === 0 && oty === 0))
            newsym(otx, oty);
        return false;
    } else if (otx === 0 && oty === 0) {
        /* fell through a trap door; no update of old loc needed */
    } else {
        const shkp = await find_objowner(obj, otx, oty);
        const objinshop = !!(shkp && costly_spot(otx, oty));
        const onboundary = !!(shkp && _rloco_costly_adjacent(shkp, otx, oty));

        if (objinshop || (obj.unpaid && onboundary)) {
            const u = game.u || {};
            const h = _rloco_room0(u.ux | 0, u.uy | 0, SHOPBASE);
            const oo = _rloco_room0(otx, oty, 0);
            const hinshop = !!(h && _rloco_room_has(shkp.mx | 0, shkp.my | 0, 0, h));

            if (hinshop && costly_spot(tx, ty) && oo && _rloco_room_has(tx, ty, 0, oo)) {
                if (obj.unpaid)
                    await subfrombill(obj, shkp);
            } else if (hinshop && _rloco_costly_adjacent(shkp, tx, ty)
                       && oo && _rloco_room_has(tx, ty, 0, oo)) {
                if (!obj.unpaid) {
                    /* C: addtobill(obj, FALSE, FALSE, FALSE).  rloco is
                     * intentionally synchronous because its callers consume
                     * the boolean return value.  The canonical billing body
                     * performs all accounting before its first await (the
                     * remaining await only emits the price quote), so invoke
                     * it without awaiting here and preserve rloco's return
                     * contract while still linking the object to the bill. */
                    void shk_addtobill(obj, false, false, false);
                }
            } else {
                await stolen_value(obj, otx, oty, false, false);
            }
        }

        newsym(otx, oty);
    }

    place_object(obj, tx, ty);
    newsym(tx, ty);
    return true;
}

/* obj_resists — MODULE-LOCAL STUB DELETED.  C ref: zap.c:1458-1472.  This file
 * carried `function obj_resists(obj, a, b) { return false; }`, which shadowed
 * the real body for mdrop_special_objs() and answered "nothing resists" — the
 * exact inverse of what that function exists to do (C steal.c:852-874 walks a
 * dying monster's inventory precisely to RESCUE the Amulet, the Book of the
 * Dead, the Candelabrum, the Bell of Opening and Rider corpses from
 * discard_minvent).  It also drew NO RNG where C draws one rn2(100) per
 * non-special minvent node.  Imported from js/zap.js at the head of this file;
 * see the note there for why the zap body and not js/dogmove.js's. */

/* artifact.c: quest artifact predicate — use objnam.js's role-aware body. */
function is_quest_artifact(obj) { return is_quest_artifact_real(obj); }




/* cansee, newsym, canspotmon, canseemon, Monnam, pline were file-local stubs
 * here, SHADOWING their real exported bodies (js/vision.js, js/display.js,
 * js/mcastu.js) with always-true / always-visible / no-op fakes. relobj()'s
 * vault-guard-gold-vanish branch (steal.c:876-880) is the only call site that
 * reaches them, and the fakes made canspotmon/canseemon ALWAYS true (so the
 * "seems to vanish" invisible-guard arm could never fire), newsym a no-op (so
 * the square never got its post-vanish redraw), and pline a no-op (so the
 * "%s gold %s." message was silently dropped). Now imported at the head of
 * this file; do not re-add stubs (same trap as donning()/setnotworn() above).
 *
 * js/display.js's pline is `export async function pline(msg, ...args)`, but
 * it has no `await` anywhere in its body — every state mutation (topline
 * buffer, _pending_message, _prevmsg) happens synchronously before the
 * wrapping promise resolves — so the unawaited call below (relobj() is not
 * async, and its only caller js/vault.js:253 grddead() does not await it
 * either) still applies every side effect before pline() returns; only the
 * promise itself, which nothing here reads, is deferred. */

/* C ref: hacklib.c:343-359 s_suffix — imported from js/hacklib.js.  The stub
 * that used to sit here carried only C's last arm, and the one call site
 * (:350, "%s gold %s." with Monnam(mtmp)) takes a monster name that can end in
 * 's — "Juiblex", no, but "the gnome lords" after a plural Monnam does. */


function flags() {
    return { verbose: false };
}
