import { cantwield, humanoid } from './mondata.js';
import { touch_petrifies } from './dog.js';
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
import { W_QUIVER, W_WEP } from './const.js';
import { is_missile } from './obj.js';
import { is_pole } from './u_init.js';
import { setworn } from './worn.js';
import { Stone_resistance } from './youprop.js';
import { retouch_object } from './artifact.js';
import { update_inventory } from './invent.js';
import { bimanual } from './obj.js';
import { You } from './pline.js';
import { tty_yn_function } from './tty/topl.js';

// include/hack.h:1330 ynq()
const ynq = (query) => tty_yn_function(query, 'ynq', 'q');
import { ECMD_OK, ECMD_CANCEL, ECMD_FAIL, P_BOW, P_CROSSBOW } from './const.js';
import { OCLASSES, ONAMES } from './objects_data.js';

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

    /* src/wield.c dowield() tail. C calls ready_weapon(), NOT setuwep() --
       setuwep is called from inside it. An earlier version here called
       setuwep directly, which skipped ready_weapon's whole body; harmless
       for the stream, since ready_weapon makes no draws, but it skipped
       every message and check. */
    const oldwep = game.u.uwep;
    const result = await ready_weapon(wep);

    if (oldwep && game.u.uwep !== oldwep)
        /* flags.pushweapon moves the old weapon to the swap slot */
        (game.unported ||= new Set()).add('dowield:pushweapon_setuswapwep');
    await untwoweapon();

    return result;
}

// src/wield.c:100 setuwep() — make `obj` the wielded weapon.
//
// The early return is load-bearing and easy to drop: re-wielding what is
// already wielded returns WITHOUT touching gu.unweapon, so the "bashing"
// state survives. C comments it as "necessary to not set gu.unweapon".
//
// The unweapon computation at the end is the part that matters downstream --
// js/uhitm.js:780 reads the wielded weapon in the melee path, and unweapon
// decides whether the hero gets the bashing message. Note the structure: for
// a WEAPON_CLASS object unweapon is TRUE when the thing is not meant for
// melee (a launcher, ammo, a missile, or a polearm on foot), and for anything
// else it is TRUE unless the object is a weapon-tool or a wet towel.
//
// Not ported, each recorded: the Ogresmasher botl updates and the Sunsword
// end_burn, both artifact-only.
export function setuwep(obj) {
    const olduwep = game.u.uwep;

    if (obj === game.u.uwep)
        return;                     /* necessary to not set gu.unweapon */

    setworn(obj, W_WEP);

    if (obj && obj.oclass !== OCLASSES.WEAPON_CLASS && !is_weptool(obj, game.objects))
        note_unported_wield('setuwep:is_wet_towel');

    if (olduwep?.oartifact || obj?.oartifact)
        note_unported_wield('setuwep:artifact_botl_and_light');

    /* Note: explicitly wielding a pick-axe gives no "bashing" message;
       wielding one via 'a'pplying it does. */
    if (obj) {
        game.unweapon = (obj.oclass === OCLASSES.WEAPON_CLASS)
            ? (is_launcher(obj) || is_ammo(obj) || is_missile(obj)
               || (is_pole(obj) && !game.u.usteed))
            /* C also excludes a wet towel here; is_wet_towel is not
               exported anywhere in the port, so that arm is recorded. A
               wet towel therefore reads as unweapon where C says it is
               not, which changes only the bashing message. */
            : !is_weptool(obj, game.objects);
    } else {
        game.unweapon = true;       /* for the "bare hands" message */
    }
}

// src/wield.c:834 set_twoweap() — turn two-weapon fighting on or off.
//
// Guarded on a real change, so a redundant call touches nothing. That guard
// is why setworn() can call it unconditionally when unwielding.
export function set_twoweap(on_off) {
    if (on_off !== game.u.twoweap) {
        game.u.twoweap = on_off;
        /* flags.weaponstatus gates a botl refresh; the status line does not
           read twoweap yet, so the refresh is recorded rather than forced. */
        note_unported_wield('set_twoweap:botl');
    }
}

// src/wield.c:158 empty_handed() — how to describe having no weapon.
//
// Three phrasings, and the order is the logic: gloves imply hands, so a
// gloved hero is "empty handed" even though a pawed one is not; a humanoid
// without gloves is "bare handed"; anything else gets the neutral phrasing
// because it may have paws or no hands at all.
//
// Used by ready_weapon, #seeweapon (')'), #attributes (^X) and #takeoffall.
export function empty_handed() {
    return game.u.uarmg ? 'empty handed'          /* gloves imply hands */
         : (game.youmonst?.data && humanoid(game.youmonst.data))
             ? 'bare handed'                      /* hands, no weapon, no gloves */
             : 'not wielding anything';           /* paws, or no hands */
}

// src/wield.c:75 TWOWEAPOK() — may this object be the SECONDARY weapon?
//
// File-local in C and file-local here, deliberately: it is a wield.c macro,
// not a header one, so exporting it would put a symbol in the tree that the
// C does not have.
//
// Note what it is NOT: it looks like the negation of setuwep's unweapon
// computation and is not quite. unweapon also excludes polearms on foot
// (is_pole && !u.usteed); TWOWEAPOK does not, because a polearm is a fine
// second weapon even though swinging it bashes. Reusing one for the other
// would be wrong in exactly the case that is hard to notice.
const TWOWEAPOK = (obj) =>
    (obj.oclass === OCLASSES.WEAPON_CLASS)
        ? !(is_launcher(obj) || is_ammo(obj) || is_missile(obj))
        : is_weptool(obj, game.objects);

// src/wield.c cant_wield_corpse() — refuse a petrifying corpse in bare hands.
//
// The guard is ported exactly and is the whole of the common path: gloves,
// a non-corpse, a non-petrifying corpse, or stoning resistance all return
// FALSE and the wield proceeds.
//
// The TRUE branch is where the hero touches a cockatrice corpse bare-handed,
// and in C that calls instapetrify() -- which usually KILLS. instapetrify,
// corpse_xname and killer_xname are all absent, so the death is RECORDED and
// does not happen. The return value still matches C, so the corpse is still
// refused; what is missing is the hero dying of it.
//
// That is a real and deliberate gap, not an approximation: inventing a death
// path would end games C does not end, which is far worse than failing to end
// one it does.
export function cant_wield_corpse(obj) {
    if (game.u.uarmg || obj.otyp !== ONAMES.CORPSE
        || !touch_petrifies(game.mons[obj.corpsenm]))
        return false;

    if (Stone_resistance())
        return false;

    /* Prevent wielding cockatrice when not wearing gloves --KAA */
    note_unported_wield('cant_wield_corpse:instapetrify');
    return true;
}

// src/wield.c:169 ready_weapon() — the shared body behind wielding.
//
// Separated in C so swapping works easily, and dowield() calls THIS rather
// than setuwep() directly. It makes NO DRAWS, which is why an error here
// shows up as a wrong message rather than a desynced stream.
//
// The order of the early tests is the logic and must not be rearranged:
// no-weapon, then corpse, then shield-vs-two-handed, then retouch_object.
// retouch_object returning false costs a TURN without wielding, which is
// why it is ECMD_TIME rather than ECMD_FAIL.
export async function ready_weapon(wep) {
    let res = ECMD_OK;
    const was_twoweap = game.u.twoweap, had_wep = (game.u.uwep != null);

    if (!wep) {
        if (game.u.uwep) {
            await You(`are ${empty_handed()}.`);
            setuwep(null);
            res = ECMD_TIME;
        } else {
            await You(`are already ${empty_handed()}.`);
        }
    } else if (wep.otyp === ONAMES.CORPSE && cant_wield_corpse(wep)) {
        /* the hero must have been life-saved to get here; uses a turn */
        res = ECMD_TIME;                    /* corpse won't be wielded */
    } else if (game.u.uarms && bimanual(wep)) {
        note_unported_wield('ready_weapon:two_handed_with_shield_msg');
        res = ECMD_FAIL;
    } else if (!retouch_object(wep, false).ok) {
        res = ECMD_TIME;      /* takes a turn even though it is not wielded */
    } else {
        /* the weapon WILL be wielded after this point */
        res = ECMD_TIME;
        if (will_weld(wep)) {
            /* the weld message names the body part and pluralises for a
               two-handed weapon; xname/aobjnam/body_part are not ported */
            note_unported_wield('ready_weapon:weld_msg');
            note_unported_wield('ready_weapon:set_bknown');
        } else {
            /* C sets W_WEP on a scratch copy of owornmask so prinv() reads
               "weapon in hand", then restores it -- the comment calls its
               own kludge obsolete but the behaviour stays. */
            const dummy = wep.owornmask;
            wep.owornmask |= W_WEP;
            if (wep.otyp === ONAMES.AKLYS)
                note_unported_wield('ready_weapon:aklys_tether_msg');
            /* prinv is already imported at the top of this file; C passes a
               null prefix and 0L quantity, so the line is just the object's
               inventory description. */
            await prinv(null, wep, 0);
            wep.owornmask = dummy;
        }

        setuwep(wep);

        if (was_twoweap && !game.u.twoweap && game.u.uwep)
            note_unported_wield('ready_weapon:no_longer_twoweap_msg');

        if (wep.oartifact) {
            /* arti_speak sets the ECMD_TIME bit when the artifact speaks,
               and DRAWS via getrumor; recorded rather than ported so no
               draw is invented. */
            note_unported_wield('ready_weapon:arti_speak');
        }
        if (wep.oartifact)
            note_unported_wield('ready_weapon:artifact_light');
        if (wep.unpaid)
            note_unported_wield('ready_weapon:shk_be_careful_msg');
    }

    if (had_wep !== (game.u.uwep != null))
        note_unported_wield('ready_weapon:botl_barehanded');
    return res;
}

/* src/wield.c:80 — the two messages the two-weapon code shares. Kept as
   file-scope constants because C keeps them that way and both are used from
   more than one function. */
const are_no_longer_twoweap = "are no longer using two weapons at once";
const can_no_longer_twoweap = "can no longer wield two weapons at once";

// src/wield.c untwoweapon() — stop two-weaponing, if we were.
//
// Guarded on u.twoweap, so calling it when not two-weaponing does nothing at
// all -- which is why dowield's tail can call it unconditionally.
export async function untwoweapon() {
    if (game.u.twoweap) {
        await You(`${can_no_longer_twoweap}.`);
        set_twoweap(false);                 /* u.twoweap = FALSE */
        update_inventory();
    }
}
