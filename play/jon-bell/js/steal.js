// steal.c — stealing and removal of worn items.
// C ref: steal.c:212 remove_worn_item

import { rn1 } from './rng.js';
import { rn2 } from './rnd.js';
import { game } from './gstate.js';
import { s_suffix } from './hacklib.js';
import { cancel_don, donning, Ring_gone, Amulet_off, Blindf_off, Armor_off, Boots_off, Cloak_off, Gloves_off, Helmet_off, Shield_off, Shirt_off, bimanual } from './do_wear.js';
import { yname } from './objnam.js';
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
    HAND,
} from './const.js';
import { artifact_light } from './artifact.js';
import { update_inventory } from './invent.js';
import { OBJ_DELETED } from './const.js';
import { setworn, setnotworn } from './worn.js';
export { setworn } from './worn.js';
import { newsym } from './display.js';
import { pline } from './pline.js';
import { Blind, cansee } from './vision.js';
import { canspotmon, canseemon } from './display.js';
import { Monnam } from './do_name.js';
import { Some_Monnam } from './do_name.js';
import { is_fainted } from './eat.js';
import { unpunish } from './read.js';
import { unconscious } from './trap.js';
import './makemon.js';
import { droppables } from './dogmove.js';
import { extract_from_minvent } from './worn.js';
import { obfree } from './dokick.js';
import { simpleonames, Tobjnam, armor_simple_name, makeplural, otense } from './objnam.js';
import { is_quest_artifact } from './questpgr.js';
import { end_burn } from './timeout.js';
import { goodpos } from './teleport.js';
import { mdrop_obj_md, touch_artifact_mon } from './mklev.js';
import { revive_corpse } from './do.js';
import { remove_object, place_object } from './mkobj.js';
import { obj_extract_self } from './dokick.js';
import { body_part } from './cmd.js';
import { freeinv } from './invent.js';
import { flooreffects } from './do.js';
import { encumber_msg } from './pickup.js';
import { find_objowner, costly_spot, costly_adjacent, inhishop, subfrombill, shop_keeper, addtobill as shk_addtobill, stolen_value } from './shk.js';
import { in_rooms } from './hack.js';
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
import { uqwepgone, uswapwepgone, uwepgone } from './wield.js'; // relocate-fns
import { carry_obj_effects, count_unpaid } from './invent.js'; // relocate-fns
import { engulfing_u } from './const.js'; // relocate-fns
import { mon_pmname } from './do_name.js'; // relocate-fns
import { snuff_light_source } from './light.js'; // relocate-fns
import { Has_contents, MPICKOBJ_AT_ENGL, obj_sheds_light_mp } from './mklev.js';
import { unknow_object } from './mkobj.js';
import { add_to_minv } from './dokick.js'; // relocate-fns
import { attacktype } from './mondata.js'; // relocate-fns
import { impossible as lifecycle_impossible } from './pline.js'; // relocate-fns
import { Blind as Blind_pickup } from './vision.js'; // relocate-fns
import { skinback } from './polyself.js'; // relocate-fns
import { stop_occupation } from './allmain.js';
import { nomul } from './hack.js'; // relocate-fns
import { o_unleash } from './apply.js'; // relocate-fns
import { ARMOR_DATA as ARMOR_DATA_MU } from './armor_data.js'; // relocate-fns
import { inv_cnt as inv_cnt_mu } from './hack.js';
import { freeinv as freeinv_mu } from './invent.js'; // relocate-fns
import { ADORNED as ADORNED_MU, LEFT_RING as LEFT_RING_MU, PLNMSG_MON_TAKES_OFF_ITEM as PLNMSG_MON_TAKES_OFF_ITEM_MU, RIGHT_HANDED as RIGHT_HANDED_MU, RIGHT_RING as RIGHT_RING_MU, TT_BURIEDBALL, W_ACCESSORY as W_ACCESSORY_MU, W_ARMG as W_ARMG_MU, W_ARMOR as W_ARMOR_MU, W_WEAPONS as W_WEAPONS_MU } from './const.js'; // relocate-fns
import { canspotmon as canspotmon_disp } from './display.js'; // relocate-fns
import { armor_simple_name_dw as armor_simple_name_mu, bimanual as bimanual_mu, doffing as doffing_mu, stop_donning } from './do_wear.js'; // relocate-fns
import { can_carry as can_carry_mu } from './mon.js'; // relocate-fns
import { maybe_finished_meal as maybe_finished_meal_mu } from './eat.js'; // relocate-fns
import { strsubst } from './hacklib.js'; // relocate-fns
import { Adjmonnam as Adjmonnam_mu, Some_Monnam as Some_Monnam_mu } from './do_name.js'; // relocate-fns
import { BOULDER_MU, Blind_mu, CORPSE_MK, _conflict_mu, _kb_uball, doname_mu, is_animal_mu, stealarm_mu, touch_petrifies_mk } from './mhitu.js'; // relocate-fns
import { monnear } from './mon.js'; // relocate-fns
import { yname as yname_mu } from './objnam.js'; // relocate-fns
import { impossible as impossible_breath, urgent_pline as urgent_pline_disp } from './pline.js'; // relocate-fns
import { shop_keeper as shop_keeper_real, subfrombill as subfrombill_real } from './shk.js'; // relocate-fns
import { openholdingtrap as openholdingtrap_mu } from './trap.js'; // relocate-fns
import { minstapetrify as minstapetrify_mu } from './trap.js'; // relocate-fns
import { encumber_msg as encumber_msg_mu } from './pickup.js'; // relocate-fns
import { welded } from './wield.js'; // relocate-fns
import { rloco } from './teleport.js'; // relocate-fns
import { mbodypart } from './cmd.js'; // relocate-fns
import { FLYING, FOOT, LEVITATION, RLOC_MSG } from './const.js'; // relocate-fns
import { y_monnam } from './do_name.js'; // relocate-fns
import { money_cnt } from './hack.js'; // relocate-fns
import { g_at } from './invent.js'; // relocate-fns
import { GOLD_PIECE_OTYP } from './makemon.js'; // relocate-fns
import { splitobj } from './mkobj.js'; // relocate-fns
import { monflee } from './monmove.js'; // relocate-fns
import { OC_COST } from './oc_cost_data.js'; // relocate-fns
import { rloc, tele_restrict } from './teleport.js'; // relocate-fns
const ROCK_CLASS = 14; // C objclass.h: boulders and statues

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
    /* C: LARGEST_INT is the 16-bit-era int cap (global.h, 32767); a pile of
     * that much gold or more is clamped to it, as in C. */
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
            impossible_steal("Removing embedded scales?");
            await skinback(true);
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

// C steal.c:119-128: the thief died while the hero was removing armor.
export function thiefdead() {
    game.stealmid = 0;
    if (game.afternmv === 'stealarm') {
        game.afternmv = 'unstolenarm';
        game.nomovemsg = null;
    }
}

export function unresponsive() {
    if (game.multi >= 0)
        return false;

    return (unconscious() || is_fainted()
            || (game.multi_reason
                && (game.multi_reason.substring(0, 6) === "frozen"
                    || game.multi_reason.substring(0, 9) === "paralyzed")));
}

// C steal.c:146-162: finish undressing, but keep the now-unworn armor.
export async function unstolenarm() {
    let obj;
    for (obj = game.invent; obj; obj = obj.nobj)
        if (obj.o_id === game.stealoid)
            break;
    game.stealoid = 0;
    if (obj)
        await pline(`You finish taking off your ${armor_simple_name(obj)}.`);
    return 0;
}

// C steal.c:772-815: a mimic can absorb the tool used to probe its disguise.
export async function maybe_absorb_item(mon, obj, ochance, achance) {
    const u = game.u;
    if (obj === u.uball || obj === u.uchain || obj.oclass === ROCK_CLASS
        || obj_resists(obj, 100 - ochance, 100 - achance)
        || !touch_artifact_mon(obj, mon))
        return;

    if (obj.where === OBJ_INVENT) {
        if (obj.owornmask)
            await remove_worn_item(obj, true);
        if (obj.unpaid)
            await subfrombill(obj, shop_keeper((u.ushops || '')[0]));
        if (cansee(mon.mx, mon.my)) {
            await pline(`${Some_Monnam(mon)} pulls ${yname(obj)} away from you and absorbs ${obj.quan > 1 ? 'them' : 'it'}!`);
        } else {
            let hand_s = body_part(HAND);
            if (bimanual(obj))
                hand_s = makeplural(hand_s);
            const name = yname(obj);
            await pline(`${name.charAt(0).toUpperCase() + name.slice(1)} ${otense(obj, 'are')} pulled from your ${hand_s}!`);
        }
        await freeinv(obj);
        await encumber_msg();
    } else if (canspotmon(mon)) {
        await pline(`${Monnam(mon)} absorbs ${yname(obj)}!`);
    }
    await mpickobj(mon, obj);
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
function impossible_steal(_msg, ..._args) { }






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
            await pline("%s gold %s.", s_suffix(Monnam(mtmp)),
                        canseemon(mtmp) ? "vanishes" : "seems to vanish");
        obj_extract_self(otmp);
        await obfree(otmp, null);
    } /* isgd && has gold */

    while ((otmp = (is_pet ? droppables(mtmp) : mtmp.minvent)) !== null) {
        /* C steal.c:893: is_pet && flags.verbose (the user's verbose option). */
        await mdrop_obj(mtmp, otmp, is_pet && !!game.flags?.verbose);
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









/* obj_resists — MODULE-LOCAL STUB DELETED.  C ref: zap.c:1458-1472.  This file
 * carried `function obj_resists(obj, a, b) { return false; }`, which shadowed
 * the real body for mdrop_special_objs() and answered "nothing resists" — the
 * exact inverse of what that function exists to do (C steal.c:852-874 walks a
 * dying monster's inventory precisely to RESCUE the Amulet, the Book of the
 * Dead, the Candelabrum, the Bell of Opening and Rider corpses from
 * discard_minvent).  It also drew NO RNG where C draws one rn2(100) per
 * non-special minvent node.  Imported from js/zap.js at the head of this file;
 * see the note there for why the zap body and not js/dogmove.js's. */

/* artifact.c: quest artifact predicate — imported from objnam.js */




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



const MPICKOBJ_LOST_NONE = 0, MPICKOBJ_LOST_THROWN = 1;

const MPICKOBJ_LOST_DROPPED = 2, MPICKOBJ_LOST_STOLEN = 3;

export async function mpickobj(mtmp, otmp) {
    let freed_otmp;
    let snuff_otmp = false;

    /* C 622-632 */
    if (!otmp) {
        await lifecycle_impossible('monster (%s) taking or picking up nothing?',
                                   mon_pmname(mtmp));
        return 1;
    } else if (otmp === game.u?.uball || otmp === game.u?.uchain) {
        await lifecycle_impossible('monster (%s) taking or picking up attached %s (%s)?',
                                   mon_pmname(mtmp),
                                   otmp === game.u.uchain ? 'chain' : 'ball', simpleonames(otmp));
        return 0;
    }

    /* C 636-641: if a monster acquires a thrown or kicked object, the throwing
       or kicking code shouldn't continue to track and place it */
    if (otmp === game.thrownobj)
        game.thrownobj = 0;
    else if (otmp === game.kickedobj)
        game.kickedobj = 0;

    if (otmp.unpaid || (Has_contents(otmp) && count_unpaid(otmp.cobj))) {
        await subfrombill(otmp, (await find_objowner(otmp, otmp.ox, otmp.oy)));
    }

    /* C 647-656: don't want a hidden light source inside the monster */
    if (obj_sheds_light_mp(otmp) && attacktype(mtmp.data, MPICKOBJ_AT_ENGL)) {
        /* this is probably a burning object that you dropped or threw */
        if (engulfing_u(mtmp) && !Blind_pickup())
            await pline(`${Tobjnam(otmp, 'go')} out.`);
        snuff_otmp = true;
    }

    otmp.no_charge = 0;

    /* C 660-678: some object handling is only done if mtmp isn't a pet */
    if (!mtmp.mtame) {
        /* if monst is unseen, some info the hero knows about this object
           becomes lost */
        if (!canseemon(mtmp) && mtmp !== game.u?.ustuck)
            unknow_object(otmp);
        /* if otmp has flags set for how it left hero's inventory, change them */
        if (otmp.how_lost === MPICKOBJ_LOST_THROWN)
            otmp.how_lost = MPICKOBJ_LOST_STOLEN;
        else if (otmp.how_lost === MPICKOBJ_LOST_DROPPED)
            otmp.how_lost = MPICKOBJ_LOST_NONE;
    }

    /* C 679-680: must do carrying effects on the object prior to add_to_minv */
    carry_obj_effects(otmp);

    /* C 681-683: add_to_minv() might free otmp [if merged with something
       else], so we have to call it after doing the object checks */
    freed_otmp = (await add_to_minv(mtmp, otmp));

    /* C 684-686: and we had to defer this until the object is in mtmp's
       inventory */
    if (snuff_otmp)
        snuff_light_source(mtmp.mx, mtmp.my);

    return freed_otmp;
}

/* C mondata.h throws_rocks(ptr) — M2_ROCKTHROW. */
const M2_ROCKTHROW_MU = 0x08000000; /* monflag.h; mirrors js/makemon.js:3612 */

function throws_rocks_mu(mdat) { return ((mdat?.mflags2 | 0) & M2_ROCKTHROW_MU) !== 0; }

/* C youprop.h Adornment — the EXTRINSIC mask only (a ring of adornment is worn,
 * never intrinsic), which is what steal.c:405/408 tests against LEFT_RING /
 * RIGHT_RING to find which hand carries it. */
function Adornment_mu() { return game.u?.uprops?.[ADORNED_MU]?.extrinsic | 0; }

const S_NYMPH_ = 14;       /* monsym.h — matches js/makemon.js:1890 */

const COIN_CLASS_ = 12;

/* objects.h is an X-macro file, so both otyps are verified by NAME against
 * js/oc_name_data.js: OC_NAME[236] === 'leash', OC_NAME[475] === 'boulder'. */
const LEASH_MU = 236;

export async function worn_item_removal(mon, obj) {
    const g = game;
    let objbuf = await doname_mu(obj);

    const strip_art = objbuf.startsWith('the ') ? 4
                    : objbuf.startsWith('an ') ? 3
                      : objbuf.startsWith('a ') ? 2
                        : 0;
    if (strip_art) {
        /* C:313 — "an iron chain (attached to you)" becomes "the ...", not
         * "your ...", when the caller passed uchain. */
        objbuf = ((obj === g.u.uchain) ? 'the ' : 'your ') + objbuf.slice(strip_art);
    }
    objbuf = objbuf.replace(' (being worn)', '');
    objbuf = objbuf.replace(' (alternate weapon; not wielded)', '');
    /* C:316-318 — p = strstri(objbuf, " (on ") is CASE-INSENSITIVE, then
     * strsubst(p + 2, "on", "from") replaces the first case-sensitive "on"
     * at or after p + 2. */
    const p = objbuf.toLowerCase().indexOf(' (on ');
    if (p >= 0 && (objbuf.startsWith('left ', p + 5)
                   || objbuf.startsWith('right ', p + 5)))
        objbuf = objbuf.slice(0, p + 2) + strsubst(objbuf.slice(p + 2), 'on', 'from');

    const verb = ((obj.owornmask | 0) & W_WEAPONS_MU) ? 'disarms'
               : ((obj.owornmask | 0) & W_ACCESSORY_MU) ? 'removes'
                 : 'takes off';
    await pline(`${Some_Monnam_mu(mon)} ${verb} ${objbuf}.`);
    (g.iflags ||= {}).last_msg = PLNMSG_MON_TAKES_OFF_ITEM_MU;
    /* removal might trigger more messages (due to loss of Lev|Fly) */
    await remove_worn_item(obj, true);
}

export async function steal(mtmp, objnambuf) {
    const g = game, u = g.u;
    const was_punished = !!_kb_uball();
    let otmp, tmp, named = 0, retrycnt = 0;
    const monkey_business = is_animal_mu(mtmp.data);
    const seen = canspotmon_disp(mtmp);

    if (objnambuf)
        objnambuf.s = '';
    /* C:352 — true if successful on the first of two attacks. */
    if (!monnear(mtmp, u.ux, u.uy))
        return 0;

    /* C:361 — remember the name NOW: stealing a worn item can drop the hero
     * into water, or remove the Eyes of the Overworld, either of which changes
     * whether the thief is visible by the time the message is printed. */
    let Monnambuf = Some_Monnam_mu(mtmp);

    /* C:365-367 — food being eaten may be used up but not yet removed from
     * inventory; don't steal that. */
    if (g.occupation)
        await maybe_finished_meal_mu(false);


    const nothing_to_steal = async () => {
        const punished = !!(u.uball || _kb_uball());
        const is_buried_ball = !!(u.utrap && u.utraptype === TT_BURIEDBALL);
        if (!monkey_business && punished && rn2(4)) {
            const chain = u.uchain || g.uchain;
            if (chain)
                await worn_item_removal(mtmp, chain);
            return 1; /* C falls through to the common flee return. */
        } else if (!monkey_business && is_buried_ball && !rn2(4)) {
            await pline(`${Monnambuf} takes off your unseen chain.`);
            const noticed = { value: false };
            await openholdingtrap_mu(game.youmonst, noticed);
            return 1; /* C's nothing_to_steal label returns immediately. */
        }
        if (Blind_mu())
            await pline('Somebody tries to rob you, but finds nothing to steal.');
        else if (inv_cnt_mu(true) > inv_cnt_mu(false))
            await pline(`${Monnambuf} tries to rob you, but isn't interested in gold.`);
        else
            await pline(`${Monnambuf} tries to rob you, but there is nothing to steal!`);
        return 1; /* let her flee */
    };
    /* C steal.c:476-490 — an animal that cannot overcome a cursed/welded
     * item, or cannot carry it, gives up.  This is also the target of the
     * second boulder retry (the `cant_take:` label), so keep the message and
     * its final flee-roll in one helper. */
    const cant_take = async () => {
        const how = ['steal', 'snatch', 'grab', 'take'];
        const verb = how[rn2(how.length)];
        const worn = !!((otmp.owornmask | 0) & W_ARMOR_MU);
        const what = worn ? `your ${armor_simple_name_mu(otmp)}` : yname_mu(otmp);
        await pline(`${Monnambuf} tries to ${verb} ${what} but gives up.`);
        return rn2(Math.trunc(inv_cnt_mu(false) / 5) + 2) ? 0 : 1;
    };
    const icnt = inv_cnt_mu(false); /* don't include gold */
    if (!icnt || (icnt === 1 && u.uskin))
        return await nothing_to_steal();

    /* C:403-411 — a ring of adornment targets a worn ring directly, skipping
     * the weighted pick (and its rn2). */
    let gotobj = false;
    if (monkey_business || u.uarmg) {
        ; /* skip ring special cases */
    } else if (Adornment_mu() & LEFT_RING_MU) {
        otmp = u.uleft;
        gotobj = true;
    } else if (Adornment_mu() & RIGHT_RING_MU) {
        otmp = u.uright;
        gotobj = true;
    }

    if (!gotobj) {
      for (;;) { /* C's `retry:` label */
        tmp = 0;
        for (otmp = g.invent; otmp; otmp = otmp.nobj)
            if ((!u.uarm || otmp !== u.uarmc) && otmp !== u.uskin
                && otmp.oclass !== COIN_CLASS_)
                tmp += ((otmp.owornmask | 0) & (W_ARMOR_MU | W_ACCESSORY_MU)) ? 5 : 1;
        /* C:421's zero-weight case jumps to nothing_to_steal.  This can
         * occur when inventory contains only skin/excluded objects, even
         * though icnt was nonzero; do not consume an RNG draw or throw. */
        if (!tmp)
            return await nothing_to_steal();
        tmp = rn2(tmp);
        for (otmp = g.invent; otmp; otmp = otmp.nobj)
            if ((!u.uarm || otmp !== u.uarmc) && otmp !== u.uskin
                && otmp.oclass !== COIN_CLASS_) {
                tmp -= ((otmp.owornmask | 0) & (W_ARMOR_MU | W_ACCESSORY_MU)) ? 5 : 1;
                if (tmp < 0)
                    break;
            }
        if (!otmp) {
            await impossible_breath('Steal fails!');
            return 0;
        }

        /* C:432-447 — the "can't take X while wearing Y" substitutions. */
        if ((otmp === u.uleft || otmp === u.uright) && u.uarmg)
            otmp = u.uarmg;
        if (otmp === u.uarmg && u.uwep)
            otmp = u.uwep;
        else if (otmp === u.uarm && u.uarmc)
            otmp = u.uarmc;
        else if (otmp === u.uarmu && u.uarmc)
            otmp = u.uarmc;
        else if (otmp === u.uarmu && u.uarm)
            otmp = u.uarm;

        if (otmp.o_id === g.stealoid)
            return 0;
        if (otmp.otyp === BOULDER_MU && !throws_rocks_mu(mtmp.data)) {
            if (!retrycnt++)
                continue; /* C: goto retry */
            return cant_take(); /* C: goto cant_take */
        }
        break;
    }
    }

    /* C:449-450 `gotobj:` */
    if (otmp.o_id === g.stealoid)
        return 0;
    /* C steal.c:465-490 — animals cannot overcome cursed stickiness (or
     * welded rings) and cannot take objects beyond their carrying capacity.
     * Quiver and an inactive secondary weapon are not really worn for this
     * test, while the ball is effectively worn because its curse is implicit. */
    if (monkey_business) {
        let ostuck;
        if (otmp === u.uball)
            ostuck = true;
        else if (otmp === u.uquiver || (otmp === u.uswapwep && !u.twoweap))
            ostuck = false;
        else
            ostuck = !!(((otmp.cursed | 0) && (otmp.owornmask | 0))
                || (otmp === ((u.uhandedness === RIGHT_HANDED_MU) ? u.uright : u.uleft)
                    && welded_mu(u.uwep))
                || (otmp === ((u.uhandedness === RIGHT_HANDED_MU) ? u.uleft : u.uright)
                    && welded_mu(u.uwep)
                    && bimanual_mu(u.uwep)));
        if (ostuck || can_carry_mu(mtmp, otmp) === 0)
            return cant_take();
    }
    if (otmp.otyp === LEASH_MU && otmp.leashmon) {
        if (monkey_business && otmp.cursed)
            return cant_take();
        o_unleash(otmp);
    }

    const was_doffing = doffing_mu(otmp);
    /* C steal.c:499-501 — stop donning/doffing now so that afternmv won't be
     * clobbered below; stop_occupation doesn't handle donning/doffing. */
    const olddelay = await stop_donning(otmp);
    await stop_occupation();

    if ((otmp.owornmask | 0) & (W_ARMOR_MU | W_ACCESSORY_MU)) {
        /* objclass.h's class ids come from the OBJCLASS() X-macro table
         * (include/defsym.h:466-478), not from a greppable enum:
         *   2 WEAPON  3 ARMOR  4 RING  5 AMULET  6 TOOL  7 FOOD  12 COIN */
        switch (otmp.oclass) {
        case 6:  /* TOOL_CLASS */
        case 5:  /* AMULET_CLASS */
        case 4:  /* RING_CLASS */
        case 7:  /* FOOD_CLASS -- meat ring */
            await worn_item_removal(mtmp, otmp);
            break;
        case 3: {  /* ARMOR_CLASS — C steal.c:513-560 */
            /* C:514-516 —
             *     armordelay = objects[otmp->otyp].oc_delay;
             *     if (olddelay > 0 && olddelay < armordelay)
             *         armordelay = olddelay;
             * `olddelay` is stop_donning()'s return and is 0 on every path this
             * port can reach (nothing tracks a partially-donned item — see the
             * note above), so the clamp cannot fire here. */
            const _row = ARMOR_DATA_MU[otmp.otyp | 0];
            let armordelay = _row ? (_row.delay | 0) : 0;
            if (olddelay > 0 && olddelay < armordelay)
                armordelay = olddelay;
            /* C:517 `if (monkey_business || unresponsive())`.  monkey_business
             * is already refused above (it throws), and unresponsive() is
             * `gm.multi >= 0 ? FALSE : (unconscious() || is_fainted() || ...)`
             * — this port has no multi < 0 state at a monster's attack, so the
             * seduction branch is the one C takes. */
            if (monkey_business || unresponsive()) {
                /* C:517-523 — animals lack the patience for slow armor; this
                 * is the rn2(10) @steal(steal.c:521).  olddelay is 0 here. */
                if (armordelay >= 1 && !olddelay && rn2(10))
                    return cant_take();
                await worn_item_removal(mtmp, otmp);
                break;
            }
            const curssv = otmp.cursed;
            otmp.cursed = 0;
            /* C:527 slowly = (armordelay >= 1 || gm.multi < 0) */
            const slowly = (armordelay >= 1) || ((game.multi | 0) < 0);
            if (game.flags?.female) {
                await urgent_pline_disp(`${!seen ? 'She' : Monnambuf} charms you.  You gladly ${
                    curssv ? 'let her take'
                    : !slowly ? 'hand over'
                    : was_doffing ? 'continue removing'
                    : 'start removing'} your ${armor_simple_name_mu(otmp)}.`);
            } else {
                await urgent_pline_disp(`${!seen ? 'She' : Adjmonnam_mu(mtmp, 'beautiful')} seduces you and ${
                    curssv ? 'helps you to take'
                    : !slowly ? 'you take'
                    : was_doffing ? 'you continue taking'
                    : 'you start taking'} off your ${armor_simple_name_mu(otmp)}.`);
            }
            ++named;
            /* C:551-553 — set multi for later on. */
            nomul(-armordelay);
            game.multi_reason = 'taking off clothes';
            game.nomovemsg = 0;
            await remove_worn_item(otmp, true);
            otmp.cursed = curssv;
            if ((game.multi | 0) < 0) {
                /* C:556-559 — the undressing takes real turns; the theft
                 * itself is finished later by afternmv = stealarm.  This port
                 * has no afternmv channel, so the continuation is NOT
                 * fabricated: record the ids C records and return 0, which is
                 * C's own return value on this path.  The gap is the delayed
                 * completion, not this branch. */
                g.stealoid = otmp.o_id;
                g.stealmid = mtmp.m_id;
                g.afternmv = 'stealarm';
                return 0;
            }
            break;
        }
        default:
            await impossible_breath('Tried to steal a strange worn thing. [%d]', otmp.oclass);
            break;
        }
        /* C steal.c:559-562 — hero's blindfold might have just been stolen;
         * if so, replace cached "Someone" or "Something" with Monnam. */
        if (!seen && canspotmon_disp(mtmp))
            Monnambuf = Monnam(mtmp);
    } else if (otmp.owornmask | 0) {
        const item = (otmp === (u.uball || g.uball) && (u.uchain || g.uchain))
            ? (u.uchain || g.uchain) : otmp;
        await worn_item_removal(mtmp, item);
        if ((otmp.owornmask | 0) & W_WEAPONS_MU)
            await remove_worn_item(otmp, false);
    }

    /* C:566 — do this before removing it from inventory. */
    if (objnambuf)
        objnambuf.s = yname_mu(otmp);
    /* C:569-570 — set mavenge so knights don't take an alignment penalty for
     * retaliating. */
    if (!_conflict_mu() && !(was_punished && !_kb_uball()))
        mtmp.mavenge = 1;
    if (otmp.unpaid) {
        const shops = g.u?.ushops || '';
        const shkp = shops.length ? shop_keeper_real(shops[0]) : null;
        await subfrombill_real(otmp, shkp);
    }
    await freeinv_mu(otmp);

    /* C:578-581 — if worn_item_removal just spoke and nothing has spoken since,
     * shorten "<mon> stole <item>" to "She stole <item>". */
    if ((g.iflags?.last_msg | 0) === PLNMSG_MON_TAKES_OFF_ITEM_MU
        && (mtmp.data?.mlet | 0) === S_NYMPH_)
        ++named;
    await urgent_pline_disp(`${named ? 'She' : Monnambuf} stole ${(await doname_mu(otmp))}.`);
    await encumber_msg_mu();
    const could_petrify = otmp.otyp === CORPSE_MK && touch_petrifies_mk(otmp.corpsenm);
    otmp.how_lost = 3 /* LOST_STOLEN (obj.h:484) */;
    await mpickobj(mtmp, otmp);
    if (could_petrify && !(mtmp.misc_worn_check & W_ARMG_MU)) {
        await minstapetrify_mu(mtmp, true);
        return -1;
    }
    /* C steal.c:591 — `return (gm.multi < 0) ? 0 : 1;` a hero left helpless
     * (savelife's multi = -1 after a declined death) gets no flee/rloc. */
    return ((game.multi | 0) < 0) ? 0 : 1;
}

/* C ref: steal.c:165-208 stealarm(void) — the afternmv continuation scheduled by
 * steal()'s armor arm (steal.c:556-560) once the undressing countdown ends. */
export async function stealarm() {
    /* One C stealarm(); the body is stealarm_mu() above (allmain.js reaches
     * the afternmv continuation under both names). */
    return stealarm_mu();
}

function welded_mu(obj) {
    return !!welded(obj);
}

function _hero_uprop_on(idx) {
    const p = game.u?.uprops?.[idx];
    return !!p && !!((p.intrinsic | 0) || (p.extrinsic | 0)) && !((p.blocked | 0));
}

function _slithy(ptr) { return !!(((ptr?.mflags1 | 0) & 0x00080000)); }

/* C youprop.h:253-255 Flying —
 *     ((HFlying || EFlying || (u.usteed && is_flyer(u.usteed->data))) && !BFlying)
 * A hero riding a flying steed (e.g. a saddled dragon) is Flying; the
 * steed clause is what makes stealgold() say "beneath your <steed>'s feet". */
const M1_FLY_SG = 0x00000001; /* monflag.h M1_FLY */
function _hero_flying() {
    const p = game.u?.uprops?.[FLYING];
    const steed = game.u?.usteed;
    return !!(((p?.intrinsic | 0) || (p?.extrinsic | 0)
               || (steed && ((steed.data?.mflags1 | 0) & M1_FLY_SG)))
              && !(p?.blocked | 0));
}

/** C steal.c findgold — walk argchain (inclusive) via ->nobj, return the first
 *  GOLD_PIECE obj, or null at end. Faithful transliteration:
 *    struct obj *findgold(struct obj *argchain){
 *      struct obj *chain=argchain;
 *      while(chain && chain->otyp != GOLD_PIECE) chain=chain->nobj;
 *      return chain; } */
export function findgold(argchain) {
    let chain = argchain;
    while (chain && chain.otyp !== GOLD_PIECE_OTYP) chain = chain.nobj;
    return chain;
}

/* C: nethack-c/src/steal.c:57 stealgold */
export async function stealgold(mtmp) {
    let fgold = g_at(game.u.ux, game.u.uy);
    let ygold;
    let tmp;
    let who, whose, what;

    while (fgold && fgold.otyp !== GOLD_PIECE_OTYP)
        fgold = fgold.nexthere;

    /* Do you have real gold? */
    ygold = findgold(game.invent);

    if (fgold && (!ygold || fgold.quan > ygold.quan || !rn2(5))) {
        obj_extract_self(fgold);
        await add_to_minv(mtmp, fgold);
        newsym(game.u.ux, game.u.uy);
        if (game.u.usteed) {
            who = game.u.usteed;
            whose = s_suffix(y_monnam(who));
            what = makeplural(mbodypart(who, FOOT));
        } else {
            who = game.youmonst;
            whose = "your";
            what = makeplural(body_part(FOOT));
        }
        /* [ avoid "between your rear regions" :-] */
        if (_slithy(who.data))
            what = "coils";
        /* reduce "rear hooves/claws" to "hooves/claws" */
        if (what.startsWith("rear "))
            what = what.substring(5);
        // C steal.c:91-98: finish the message before teleporting or fleeing.
        await pline("%s quickly snatches some gold from %s %s %s!", Monnam(mtmp),
              (_hero_uprop_on(LEVITATION) || _hero_flying()) ? "beneath" : "between", whose, what);
        if (!ygold || !rn2(5)) {
            if (!tele_restrict(mtmp))
                await rloc(mtmp, RLOC_MSG);
            await monflee(mtmp, 0, false, false);
        }
    } else if (ygold) {
        const gold_price = OC_COST[GOLD_PIECE_OTYP] | 0;
        tmp = Math.trunc((somegold(money_cnt(game.invent)) + gold_price - 1) / gold_price);
        tmp = Math.min(tmp, ygold.quan);
        if (tmp < ygold.quan)
            ygold = (await splitobj(ygold, tmp));
        else
            setnotworn(ygold);
        freeinv(ygold);
        await add_to_minv(mtmp, ygold);
        // C steal.c:109-113: a message stop precedes the thief's relocation.
        await pline("Your purse feels lighter.");
        if (!tele_restrict(mtmp))
            await rloc(mtmp, RLOC_MSG);
        await monflee(mtmp, 0, false, false);
        if (game.disp) game.disp.botl = 1;
    }
}
