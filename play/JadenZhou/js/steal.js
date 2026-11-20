// steal.js — monsters acquiring and releasing objects.
// C ref: steal.c mpickobj(), mdrop_obj(), relobj();
// invent.c carry_obj_effects(); worn.c extract_from_minvent()

import { game } from './gstate.js';
import { add_to_minv, obj_extract_self, place_object } from './mkobj.js';
import * as O from './objects.js';
import { cansee } from './vision.js';
import { newsym, pline } from './display.js';
import { distant_name, doname } from './objnam.js';
import { Monnam } from './mhitm.js';
import { stackobj } from './invent.js';
import { flooreffects, obj_no_longer_held } from './do.js';
import { droppables } from './dogmove.js';

// C ref: invent.c carry_obj_effects()
function carry_obj_effects(obj) {
    /* Cursed figurines can spontaneously transform when carried. */
    if (obj.otyp === O.FIGURINE) {
        if (obj.cursed && obj.corpsenm !== -1 /* NON_PM */)
            throw new Error('carry_obj_effects(): attach_fig_transform_timeout() not ported yet');
    }
}

// C ref: steal.c mpickobj()
/* Returns 1 if otmp is free'd, 0 otherwise. */
export function mpickobj(mtmp, otmp) {
    if (!otmp)
        throw new Error('mpickobj(): monster taking or picking up nothing?');
    /* if monster is acquiring a thrown or kicked object, the throwing
       or kicking code shouldn't continue to track and place it */
    if (otmp === game.thrownobj)
        game.thrownobj = null;
    else if (otmp === game.kickedobj)
        game.kickedobj = null;
    /* an unpaid item can be on the floor; if a monster picks it up, take
       it off the shop bill */
    if (otmp.unpaid || (otmp.cobj && otmp.cobj.some(o => o.unpaid)))
        throw new Error('mpickobj(): subfrombill() not ported yet');
    /* don't want hidden light source inside the monster */
    if (otmp.lamplit)
        throw new Error('mpickobj(): obj_sheds_light() not ported yet');
    /* for hero owned object on shop floor, mtmp is taking possession
       and if it's eventually dropped in a shop, shk will claim it */
    otmp.no_charge = 0;
    /* some object handling is only done if mtmp isn't a pet */
    if (!mtmp.mtame)
        throw new Error('mpickobj(): non-pet pickup (unknow_object()) not ported yet');
    /* Must do carrying effects on object prior to add_to_minv() */
    carry_obj_effects(otmp);
    /* add_to_minv() might free otmp [if merged with something else],
       so we have to call it after doing the object checks */
    const freed_otmp = add_to_minv(mtmp, otmp);
    return freed_otmp;
}

// C ref: worn.c extract_from_minvent() -- removing worn or wielded gear
// (update_mon_extrinsics(), mwepgone()) is not ported yet
/* Remove an object from a monster's inventory. */
function extract_from_minvent(mon, obj, do_extrinsics, silently) {
    const unwornmask = obj.owornmask || 0;

    void do_extrinsics; /* only used for worn gear */
    void silently;
    if (obj.where !== 'OBJ_MINVENT')
        throw new Error('extract_from_minvent called on object not in minvent');
    if (unwornmask)
        throw new Error('extract_from_minvent(): worn or wielded gear not ported yet');
    obj_extract_self(obj);
    obj.owornmask = 0;
    obj_no_longer_held(obj);
}

// C ref: steal.c mdrop_obj()
/* drop one object taken from a (possibly dead) monster's inventory */
export async function mdrop_obj(mon, obj, verbosely) {
    const omx = mon.mx, omy = mon.my;
    const unwornmask = obj.owornmask || 0;
    /* call distant_name() for its possible side-effects even if the result
       might not be printed, and do it before extracting obj from minvent */
    const obj_name = distant_name(obj, doname);

    extract_from_minvent(mon, obj, false, true);
    /* don't charge for an owned saddle on dead steed: the saddle is worn,
       which extract_from_minvent() doesn't handle yet */
    /* obj_no_longer_held(obj); -- done by place_object */
    if (verbosely && cansee(omx, omy))
        await pline(`${Monnam(mon)} drops ${obj_name}.`); /* pline_mon() */
    if (!await flooreffects(obj, omx, omy, "fall")) {
        place_object(obj, omx, omy);
        stackobj(obj);
    }
    /* do this last, after placing obj on floor: update_mon_extrinsics()
       for worn gear -- unreachable, extract_from_minvent() stops on it */
    void unwornmask;
}

// C ref: steal.c relobj()
/* release the objects the creature is carrying */
export async function relobj(mtmp, show,
                             is_pet) { /* If true, pet should keep wielded/worn items */
    const omx = mtmp.mx, omy = mtmp.my;

    /* vault guard's gold goes away rather than be dropped... */
    if (mtmp.isgd && (mtmp.minvent || []).some(o => o.oclass === O.COIN_CLASS))
        throw new Error('relobj(): vault guard gold not ported yet');

    /* C's minvent chain head is the newest object, the last one in the
       JS minvent array */
    const minvent_head = () => (mtmp.minvent?.length
                                ? mtmp.minvent[mtmp.minvent.length - 1] : null);
    let otmp;
    while ((otmp = (is_pet ? droppables(mtmp) : minvent_head())) != null) {
        await mdrop_obj(mtmp, otmp, is_pet && game.flags.verbose);
    }

    if (show && cansee(omx, omy))
        newsym(omx, omy);
}
