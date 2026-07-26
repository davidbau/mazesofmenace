import { cantwield } from './mondata.js';
import { is_weptool } from './mkobj.js';
import { pline } from './display.js';
import { ECMD_TIME } from './invent.js';
// wield.js — what the hero is holding.
// C ref: src/wield.c
//
// Only the quiver command so far. doquiver_core's real work is getobj's
// prompt, which is why 'Q' shows "What do you want to ready? [- cd or ?*]"
// before anything is chosen.

import { game } from './gstate.js';
import { will_weld } from './monmove.js';
import { getobj, GETOBJ_SUGGEST, GETOBJ_DOWNPLAY, GETOBJ_EXCLUDE,
         GETOBJ_PROMPT, GETOBJ_ALLOWCNT, prinv } from './invent.js';
import { W_QUIVER } from './const.js';
import { You } from './pline.js';
import { tty_yn_function } from './tty/topl.js';

// include/hack.h:1330 ynq()
const ynq = (query) => tty_yn_function(query, 'ynq', 'q');
import { ECMD_OK, ECMD_CANCEL, ECMD_FAIL, P_BOW, P_CROSSBOW } from './const.js';
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
export const ammo_and_launcher = (a, l) => is_ammo(a) && matching_launcher(a, l);

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
export function setuqwep(obj) {
    if (game.u.uquiver)
        game.u.uquiver.owornmask &= ~W_QUIVER;
    game.u.uquiver = obj;
    if (obj)
        obj.owornmask |= W_QUIVER;
}

// src/wield.c welded() — is this the wielded weapon, and is it stuck?
//
// Only true for the object that IS uwep; a cursed weapon in the pack is not
// welded. The set_bknown(obj, 1) is a real side effect: discovering the weld
// tells you the weapon is cursed, so the B/U/C status becomes known. It is
// recorded, so the weld is detected but the knowledge is not yet recorded on
// the object.
export function welded(obj) {
    if (obj && obj === game.uwep && will_weld(obj)) {
        note_unported_wield('welded:set_bknown');
        return 1;
    }
    return 0;
}

// src/wield.c wield_ok() — the filter behind 'w'.
//
// Note the !obj arm returns SUGGEST, not EXCLUDE: wielding '-' to wield
// nothing is a positive act, so the hands option appears in the prompt.
// read_ok does the opposite. Coins are the only hard exclusion.
export function wield_ok(obj) {
    if (!obj)
        return GETOBJ_SUGGEST;
    if (obj.oclass === OCLASSES.COIN_CLASS)
        return GETOBJ_EXCLUDE;
    if (obj.oclass === OCLASSES.WEAPON_CLASS || is_weptool(obj, game.objects))
        return GETOBJ_SUGGEST;
    return GETOBJ_DOWNPLAY;
}

// src/wield.c dowield() — the 'w' command.
//
// Ported for the same reason as doread: getobj() READS A KEY, so leaving
// 'w' undispatched shifted every later keystroke in the session.
//
// C keeps going even with an empty pack, because wielding '-' is meaningful.
export async function dowield() {
    game.multi = 0;
    /* cantwield(gy.youmonst.data) -- nohands || verysmall. game.youmonst.data
       is not populated until polymorph exists, and an unpolymorphed hero has
       hands and is not verysmall, so a missing form answers FALSE rather than
       throwing. */
    if (game.youmonst?.data && cantwield(game.youmonst.data)) {
        await pline("Don't be ridiculous!");
        return ECMD_FAIL;
    }

    /* THE KEY CONSUMPTION */
    const wep = await getobj('wield', wield_ok, GETOBJ_PROMPT | GETOBJ_ALLOWCNT);
    if (!wep)
        return ECMD_CANCEL;          /* Cancelled */

    if (wep === game.uwep) {
        await You('are already wielding that!');
        if (is_weptool(wep, game.objects))
            game.unweapon = false;   /* [see setuwep()] */
        return ECMD_FAIL;
    }
    if (welded(game.uwep)) {
        /* weldmsg() and the interrupted-armor-removal reset */
        (game.unported ||= new Set()).add('dowield:welded');
        return ECMD_FAIL;
    }

    /* the actual wield: setuwep(), the two-weapon and unweapon updates,
       and the artifact/cockatrice checks */
    (game.unported ||= new Set()).add('dowield:setuwep');
    return ECMD_TIME;
}
