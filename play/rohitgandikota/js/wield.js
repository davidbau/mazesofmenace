// wield.js — what the hero is holding.
// C ref: src/wield.c
//
// Only the quiver command so far. doquiver_core's real work is getobj's
// prompt, which is why 'Q' shows "What do you want to ready? [- cd or ?*]"
// before anything is chosen.

import { game } from './gstate.js';
import { getobj, GETOBJ_SUGGEST, GETOBJ_DOWNPLAY,
         GETOBJ_PROMPT, GETOBJ_ALLOWCNT, prinv } from './invent.js';
import { W_QUIVER } from './const.js';
import { You } from './pline.js';
import { tty_yn_function } from './tty/topl.js';

// include/hack.h:1330 ynq()
const ynq = (query) => tty_yn_function(query, 'ynq', 'q');
import { ECMD_OK, ECMD_CANCEL, P_BOW, P_CROSSBOW } from './const.js';
import { OCLASSES } from './objects_data.js';

// src/wield.c ready_ok() — which objects getobj should suggest for the quiver.
//
// The '-' case answers for "empty the quiver": suggested only when something
// IS quivered, downplayed otherwise. That is what puts the "- " at the front
// of the prompt's letter list.
export function ready_ok(obj) {
    if (!obj)
        return game.u.uquiver ? GETOBJ_SUGGEST : GETOBJ_DOWNPLAY;

    /* downplay when wielded, unless more than one */
    if (obj === game.u.uwep || (obj === game.u.uswapwep && game.u.twoweap))
        return (obj.quan === 1) ? GETOBJ_DOWNPLAY : GETOBJ_SUGGEST;

    if (is_ammo(obj)) {
        return ((game.u.uwep && ammo_and_launcher(obj, game.u.uwep))
                || (game.u.uswapwep && ammo_and_launcher(obj, game.u.uswapwep)))
               ? GETOBJ_SUGGEST : GETOBJ_DOWNPLAY;
    } else if (is_launcher(obj)) {
        return GETOBJ_DOWNPLAY;
    } else {
        if (obj.oclass === OCLASSES.WEAPON_CLASS
            || obj.oclass === OCLASSES.COIN_CLASS)
            return GETOBJ_SUGGEST;
    }

    return GETOBJ_DOWNPLAY;
}

// include/obj.h:235 — a launcher has a POSITIVE oc_skill in the bow..crossbow
// range; its ammo carries the same value NEGATED, which is what pairs them.
const is_launcher = (o) =>
    o.oclass === OCLASSES.WEAPON_CLASS
    && game.objects[o.otyp].oc_skill >= P_BOW
    && game.objects[o.otyp].oc_skill <= P_CROSSBOW;

// include/obj.h:238 is_ammo()
const is_ammo = (o) =>
    (o.oclass === OCLASSES.WEAPON_CLASS || o.oclass === OCLASSES.GEM_CLASS)
    && game.objects[o.otyp].oc_skill >= -P_CROSSBOW
    && game.objects[o.otyp].oc_skill <= -P_BOW;

// include/obj.h:243 matching_launcher() and :244 ammo_and_launcher()
const matching_launcher = (a, l) =>
    !!l && game.objects[a.otyp].oc_skill === -game.objects[l.otyp].oc_skill;
const ammo_and_launcher = (a, l) => is_ammo(a) && matching_launcher(a, l);

// src/wield.c:512 doquiver_core() — "ready" or "fire".
export async function doquiver_core(verb) {
    if (!(game.invent || []).length) {
        await You('have nothing to ready for firing.');
        return ECMD_OK;
    }

    const newquiver = await getobj(verb, ready_ok,
                                   GETOBJ_PROMPT | GETOBJ_ALLOWCNT);
    if (!newquiver)
        return ECMD_CANCEL;

    /* src/wield.c:633 — readying the ALTERNATE weapon needs confirmation.
       The wording tracks two/one-handed use and singular/plural. */
    if (newquiver === game.u.uswapwep) {
        const use_plural = false;       /* is_plural/pair_of need objnam */
        const qbuf = `${!use_plural ? 'That is' : 'Those are'} your `
                   + `${game.u.twoweap ? 'second' : 'alternate'} weapon.  `
                   + `Ready ${!use_plural ? 'it' : 'them'} instead?`;

        if (await ynq(qbuf) !== 'y') {
            note_unported_wield('doquiver_core:decline message');
            return ECMD_OK;
        }
        /* quivering the alternate weapon, so no more uswapwep */
        game.u.uswapwep = null;
        note_unported_wield('doquiver_core:untwoweapon');
    }

    /* src/wield.c:652 — place the item in the quiver BEFORE printing, so the
       inventory line already reads "(at the ready)". */
    setuqwep(newquiver);
    await prinv(null, newquiver, 0);
    return ECMD_OK;
}

// src/wield.c:505 dowieldquiver() — the 'Q' command.
export async function dowieldquiver() {
    return await doquiver_core('ready');
}

function note_unported_wield(what) {
    (game.unported ||= new Set()).add(what);
}

// src/wield.c setuqwep() — put an object in the quiver slot.
function setuqwep(obj) {
    if (game.u.uquiver)
        game.u.uquiver.owornmask &= ~W_QUIVER;
    game.u.uquiver = obj;
    if (obj)
        obj.owornmask |= W_QUIVER;
}
