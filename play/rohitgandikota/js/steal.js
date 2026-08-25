// steal.js: theft and monster-inventory release.
// C ref: src/steal.c

import { game } from './gstate.js';
import { cansee } from './vision.js';
import { doname } from './objnam.js';
import { Monnam } from './do_name.js';
import { pline_xy } from './pline.js';
import { newsym, pline } from './display.js';
import { place_object, unknow_object } from './mkobj.js';
import { freeinv, stackobj, obj_extract_self } from './invent.js';
import { flooreffects } from './do.js';
/* src/light.c obj_sheds_light() == obj_is_burning(): a lit lamp/candle/
   artifact. The port tracks lamplit; artifact light records elsewhere. */
const obj_sheds_light = (o) => !!o.lamplit;
import { attacktype, is_animal } from './mondata.js';
import { ATTKS, MONSYMS } from './monst_data.js';
import { canseemon } from './display.js';
import { merged } from './invent.js';
import { LOST_NONE, LOST_THROWN, LOST_DROPPED, LOST_STOLEN,
         OBJ_MINVENT, W_ARMOR, W_ACCESSORY, W_WEAPONS } from './const.js';
import { OCLASSES, ONAMES } from './objects_data.js';
import { droppables } from './dog.js';
import { costly_spot } from './shk.js';
import { obj_resists } from './zap.js';
import { is_quest_artifact } from './questpgr.js';
import { W_SADDLE } from './const.js';
import { rn2, rn1 } from './rng.js';
import { setnotworn } from './worn.js';
import { stop_occupation } from './allmain.js';
import { encumber_msg } from './attrib.js';

function note_unported_steal(what) {
    (game.unported ||= new Set()).add(what);
}

// src/steal.c:14 somegold() — choose the proportional amount used by theft
// and by a fountain taking part of the hero's money.
export function somegold(lmoney) {
    let gold = Math.min(lmoney, 0x7fffffff);

    if (gold < 50)
        return gold;
    if (gold < 100)
        return rn1(gold - 25 + 1, 25);
    if (gold < 500)
        return rn1(gold - 50 + 1, 50);
    if (gold < 1000)
        return rn1(gold - 100 + 1, 100);
    if (gold < 5000)
        return rn1(gold - 500 + 1, 500);
    if (gold < 10000)
        return rn1(gold - 1000 + 1, 1000);
    return rn1(gold - 5000 + 1, 5000);
}

function theft_removal_name(obj) {
    let name = doname(obj);
    name = name.replace(/^(?:an?|the) /, 'your ')
               .replace(' (being worn)', '')
               .replace(' (alternate weapon; not wielded)', '')
               .replace(' (on left hand)', ' (from left hand)')
               .replace(' (on right hand)', ' (from right hand)');
    return name;
}

// src/steal.c:306 worn_item_removal(), ordinary worn object path.
async function worn_item_removal(mon, obj) {
    const name = theft_removal_name(obj);
    const verb = (obj.owornmask & W_WEAPONS) ? 'disarms'
               : (obj.owornmask & W_ACCESSORY) ? 'removes' : 'takes off';
    await pline(`${Monnam(mon)} ${verb} ${name}.`);
    setnotworn(obj);
}

// src/steal.c:343 steal(). This covers the nymph and monkey weighted item
// choice, immediate worn-item removal, inventory transfer, and messages.
// Multi-turn armor seduction remains marked at the exact selected object.
export async function steal(mtmp, objnambuf = null) {
    const u = game.u;
    const monkey_business = is_animal(mtmp.data);
    const inventory = game.invent || [];
    const noncoin = inventory.filter(o => o.oclass !== OCLASSES.COIN_CLASS);

    if (!noncoin.length) {
        await pline(`${Monnam(mtmp)} tries to rob you, but there is nothing to steal!`);
        return 1;
    }

    const candidates = inventory.filter(obj =>
        (!u.uarm || obj !== u.uarmc)
        && obj !== u.uskin && obj.oclass !== OCLASSES.COIN_CLASS);
    let total = 0;
    for (const obj of candidates)
        total += (obj.owornmask & (W_ARMOR | W_ACCESSORY)) ? 5 : 1;
    if (!total)
        return 1;

    let pick = rn2(total), otmp = null;
    for (const obj of candidates) {
        pick -= (obj.owornmask & (W_ARMOR | W_ACCESSORY)) ? 5 : 1;
        if (pick < 0) {
            otmp = obj;
            break;
        }
    }
    if (!otmp)
        return 0;

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

    if (otmp.otyp === ONAMES.BOULDER && !monkey_business) {
        note_unported_steal('steal:boulder');
        return 0;
    }

    await stop_occupation();
    let named = false;
    if (otmp.owornmask & (W_ARMOR | W_ACCESSORY)) {
        if (otmp.oclass === OCLASSES.ARMOR_CLASS
            && (game.objects[otmp.otyp].oc_delay | 0) > 0
            && !monkey_business) {
            note_unported_steal('steal:delayed_armor');
            return 0;
        }
        await worn_item_removal(mtmp, otmp);
        named = mtmp.data.mlet === MONSYMS.S_NYMPH;
    } else if (otmp.owornmask) {
        await worn_item_removal(mtmp, otmp);
    }

    const lost_name = doname(otmp);
    if (objnambuf && typeof objnambuf === 'object')
        objnambuf.value = lost_name;
    mtmp.mavenge = 1;
    freeinv(otmp);
    await pline(`${named ? 'She' : Monnam(mtmp)} stole ${doname(otmp)}.`);
    await encumber_msg();
    otmp.how_lost = LOST_STOLEN;
    mpickobj(mtmp, otmp);
    return 1;
}

// src/steal.c:814 mdrop_obj() — monster puts one object on its own square.
export async function mdrop_obj(mon, obj, verbosely) {
    const omx = mon.mx, omy = mon.my;
    const unwornmask = obj.owornmask || 0;
    /* C calls distant_name(obj, doname) BEFORE extraction for its possible
       side-effects (find_artifact); this tree has no artifact discovery, so
       doname supplies the name the pline uses. */
    const obj_name = doname(obj);

    /* extract_from_minvent(mon, obj, FALSE, TRUE) — unlink, keep intrinsics
       for the update_mon_extrinsics call below. */
    obj_extract_self(obj);
    obj.owornmask = 0;

    /* don't charge for an owned saddle on dead steed (provided that the
       hero is within the same shop at the time) */
    if (unwornmask && mon.mtame && (unwornmask & W_SADDLE) !== 0
        && !obj.unpaid && costly_spot(omx, omy)) {
        /* the in_rooms() membership test needs shop room chains */
        note_unported_steal('mdrop_obj:saddle_no_charge');
        obj.no_charge = 1;
    }

    if (verbosely && cansee(omx, omy))
        /* pline_mon(mon, ...) — a message anchored at the monster */
        await pline_xy(omx, omy, `${Monnam(mon)} drops ${obj_name}.`);

    /* src/steal.c — flooreffects(obj, x, y, "fall") consumes the object when
       it lands in water, lava or a pit; only place it when it survived */
    if (!await flooreffects(obj, omx, omy, 'fall')) {
        place_object(obj, omx, omy);
        stackobj(obj);
    }

    /* removing worn gear adjusts the monster's properties */
    if (mon.mhp > 0 && unwornmask)
        note_unported_steal('mdrop_obj:update_mon_extrinsics');
}

// src/steal.c:852 mdrop_special_objs() — rescue the Amulet, invocation
// tools, Rider corpses and the current role's quest artifact before a pack
// is discarded.
//
// The DRAW is obj_resists(obj, 0, 0): one rn2(100) per ordinary object even
// though a 0% chance can never pass, so scanning a monster's pack costs one
// call per item. The rescue arm itself (mdrop_obj / rloco) is only reachable
// when one of those unique objects is actually carried — never during quest
// START generation — and is recorded rather than half-done, because
// mdrop_obj is async and this runs inside the synchronous create_monster.
export function mdrop_special_objs(mon) {
    /* C caches obj->nobj before the body because the drop unlinks obj;
       walking a snapshot of the chain is the same traversal. */
    for (const obj of [...(mon.minvent || [])]) {
        if (obj_resists(obj, 0, 0) || is_quest_artifact(obj)) {
            note_unported_steal('mdrop_special_objs:rescue');
        }
    }
}

// src/steal.c:875 relobj() — release the objects the creature is carrying.
export async function relobj(mtmp, show, is_pet) {
    const omx = mtmp.mx, omy = mtmp.my;

    /* vault guard's gold goes away rather than be dropped */
    if (mtmp.isgd)
        note_unported_steal('relobj:vault_guard_gold');

    let otmp;
    while ((otmp = is_pet ? droppables(mtmp) : (mtmp.minvent || [])[0])) {
        await mdrop_obj(mtmp, otmp, is_pet && !!game.flags?.verbose);
    }

    if (show && cansee(omx, omy))
        newsym(omx, omy);
}

// src/steal.c:618 mpickobj() — a monster takes possession of an object.
// Returns 1 when the object merged into an existing stack (and is gone).
//
// subfrombill (shop billing), unknow_object, the engulfer light snuff and
// the cursed-figurine timer record, each behind its own gate.
export function mpickobj(mtmp, otmp) {
    /* C: impossible() on null or on taking the hero's ball & chain */
    /* if monster is acquiring a thrown or kicked object, the throwing
       or kicking code shouldn't continue to track and place it */
    if (otmp === game.thrownobj)
        game.thrownobj = null;
    else if (otmp === game.kickedobj)
        game.kickedobj = null;
    /* an unpaid item can be on the floor; if a monster picks it up, take
       it off the shop bill */
    if (otmp.unpaid)
        note_unported_steal('mpickobj:subfrombill');
    /* don't want hidden light source inside the monster */
    if (obj_sheds_light(otmp)
        && attacktype(game.mons[mtmp.mnum], ATTKS.AT_ENGL))
        note_unported_steal('mpickobj:snuff_light');
    /* for hero owned object on shop floor, mtmp is taking possession */
    otmp.no_charge = 0;
    /* some object handling is only done if mtmp isn't a pet */
    if (!mtmp.mtame) {
        if (!canseemon(mtmp) && mtmp !== game.u.ustuck)
            unknow_object(otmp);   /* hero loses knowledge of it */
        if (otmp.how_lost === LOST_THROWN)
            otmp.how_lost = LOST_STOLEN;
        else if (otmp.how_lost === LOST_DROPPED)
            otmp.how_lost = LOST_NONE;
    }
    /* Must do carrying effects on object prior to add_to_minv() */
    if (otmp.otyp === ONAMES.FIGURINE && otmp.cursed
        && (otmp.corpsenm ?? -1) !== -1)
        note_unported_steal('mpickobj:fig_transform');
    /* add_to_minv (src/mkobj.c:2648): merge if possible, else insert */
    for (const held of (mtmp.minvent || [])) {
        if (merged({ o: held }, { o: otmp }))
            return 1; /* obj merged and then free'd */
    }
    /* add_to_minv() prepends to the nobj chain. Inventory order controls
       both which item a monster drops first and which item is drawn on top. */
    (mtmp.minvent ||= []).unshift(otmp);
    otmp.where = OBJ_MINVENT;
    otmp.ocarry = mtmp;
    return 0;
}
