// steal.js — theft and monster-inventory release.
// C ref: src/steal.c
//
// Only the release half is here so far: mdrop_obj() and relobj(), reached by
// a pet putting down what it fetched (dogmove.c:420). The theft half (stealing
// nymphs, seducers) belongs to monster attacks that are not ported.

import { game } from './gstate.js';
import { cansee } from './vision.js';
import { doname } from './objnam.js';
import { Monnam } from './do_name.js';
import { pline_xy } from './pline.js';
import { newsym } from './display.js';
import { place_object } from './mkobj.js';
import { stackobj, obj_extract_self } from './invent.js';
import { droppables } from './dog.js';
import { costly_spot } from './shk.js';
import { W_SADDLE } from './const.js';

function note_unported_steal(what) {
    (game.unported ||= new Set()).add(what);
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

    /* flooreffects(obj, x, y, "fall") consumes the object when it lands in
       water, lava or on an altar; every current drop square is plain floor. */
    note_unported_steal('mdrop_obj:flooreffects');
    place_object(obj, omx, omy);
    stackobj(obj);

    /* removing worn gear adjusts the monster's properties */
    if (mon.mhp > 0 && unwornmask)
        note_unported_steal('mdrop_obj:update_mon_extrinsics');
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
