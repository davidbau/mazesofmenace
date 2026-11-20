// dothrow.js -- throwing and firing.
// C ref: dothrow.c
//
// Ported so far: the #fire command's fireassist (swap to or wield the
// launcher and requeue #fire) and throw_obj() up to the direction
// prompt.  Throwing itself (throwit()), autoquiver and doquiver_core()
// are not ported yet.

import { game } from './gstate.js';
import { You, You_cant } from './display.js';
import { check_capacity } from './hack.js';
import { getdir } from './cmd.js';
import { is_ammo, is_pole, ammo_and_launcher, doquiver_core } from './wield.js';
import { ECMD_OK, ECMD_TIME, ECMD_CANCEL, W_WEP } from './const.js';
import { BULLWHIP, BOOMERANG, AKLYS } from './objects.js';
import { M1_NOHANDS, M1_NOTAKE } from './monsters.js';

/* C ref: mondata.h nohands(), notake() */
function nohands(ptr) { return (ptr.mflags1 & M1_NOHANDS) !== 0; }
function notake(ptr) { return (ptr.mflags1 & M1_NOTAKE) !== 0; }

/* C ref: cmd.c cmdq_add_ec(CQ_CANNED, fn), cmdq_add_key(CQ_CANNED, key);
   the extended command is kept by its cmd.c function name */
function cmdq_add_ec(fn) {
    if (!game.cmdq) game.cmdq = [];
    game.cmdq.push({ typ: 'ec', fn });
}
function cmdq_add_key(key) {
    if (!game.cmdq) game.cmdq = [];
    game.cmdq.push({ typ: 'key', key });
}

/* C ref: dothrow.c AutoReturn() -- uwep might already be removed from
   inventory so test for W_WEP instead */
function AutoReturn(o, wmsk) {
    if (o.oartifact)
        throw new Error('AutoReturn(): Mjollnir not ported yet');
    return ((wmsk & W_WEP) !== 0 && o.otyp === AKLYS) || o.otyp === BOOMERANG;
}

// C ref: dothrow.c ok_to_throw() -- common to dothrow() and dofire()
async function ok_to_throw() {
    const shotlimit = Math.max(0, game.command_count || 0);
    game.multi = 0; /* reset; it's been used up */

    if (notake(game.youmonst.data)) {
        await You("are physically incapable of throwing or shooting anything.");
        return { ok: false, shotlimit };
    } else if (nohands(game.youmonst.data)) {
        await You_cant("throw or shoot without hands."); /* not body_part(HAND) */
        return { ok: false, shotlimit };
    }
    if (await check_capacity(null))
        return { ok: false, shotlimit };
    return { ok: true, shotlimit };
}

// C ref: dothrow.c throw_obj() -- up to the direction prompt
async function throw_obj(obj, shotlimit) {
    void shotlimit;
    let res = ECMD_TIME;

    /* ask "in what direction?" */
    if (!(await getdir(null))) {
        /* No direction specified, so cancel the throw */
        res = ECMD_CANCEL; /* no time passes */
        /* unsplit_stack: no partial stack was split off by fire */
        return res;
    }
    throw new Error('throw_obj(): throwing (throwit()) not ported yet');
}

// C ref: dothrow.c find_launcher()
function find_launcher(ammo) {
    let otmp, oX;

    if (!ammo)
        return null;

    for (oX = null, otmp = game.invent; otmp; otmp = otmp.nobj) {
        if (otmp.cursed && otmp.bknown)
            continue; /* known to be cursed, so skip */
        if (ammo_and_launcher(ammo, otmp)) {
            if (otmp.bknown)
                return otmp; /* known-B or known-U (known-C won't get here) */
            if (!oX)
                oX = otmp; /* unknown-BUC; used if no known-BU item found */
        }
    }
    return oX;
}

// C ref: dothrow.c dofire() -- the #fire command
export async function dofire() {
    let obj;
    const uwep = game.uwep;
    /* AutoReturn() verifies Valkyrie if weapon is Mjollnir, but it relies
       on its caller to make sure hero is strong enough to throw that */
    const uwep_Throw_and_Return = !!(uwep && AutoReturn(uwep, uwep.owornmask));
    let skip_fireassist = false;
    let altres, res = ECMD_OK;

    const otr = await ok_to_throw();
    if (!otr.ok)
        return ECMD_OK;
    const shotlimit = otr.shotlimit;

    obj = game.uquiver;
    /* if wielding a throw-and-return weapon, throw it if quiver is empty
       or has ammo rather than missiles */
    if (uwep_Throw_and_Return && (!obj || is_ammo(obj))) {
        obj = uwep;
        skip_fireassist = true;
    } else if (!obj) {
        if (!game.flags?.autoquiver) {
            /* if we're wielding a polearm, apply it */
            if (uwep && is_pole(uwep)) {
                throw new Error('dofire(): use_pole() not ported yet');
            /* if we're wielding a bullwhip, apply it */
            } else if (uwep && uwep.otyp === BULLWHIP) {
                throw new Error('dofire(): use_whip() not ported yet');
            } else if ((game.iflags?.fireassist ?? true)
                       && game.uswapwep && is_pole(game.uswapwep)
                       && !(game.uswapwep.cursed && game.uswapwep.bknown)) {
                /* we have a known not-cursed polearm as swap weapon.
                   swap to it and retry */
                cmdq_add_ec("doswapweapon");
                cmdq_add_ec("dofire");
                return ECMD_OK; /* haven't taken any time yet */
            } else {
                await You("have no ammunition readied.");
            }
        } else {
            throw new Error('dofire(): autoquiver() not ported yet');
        }
    }

    /* if autoquiver is disabled or has failed, prompt for missile */
    if (!obj) {
        /* in case we're using ^A to repeat prior 'f' command, don't
           use direction of previous throw as getobj()'s choice here */
        game.in_doagain = 0;

        /* this gives its own feedback about populating the quiver slot */
        res = await doquiver_core("fire");
        if (res !== ECMD_OK && res !== ECMD_TIME)
            return res;

        obj = game.uquiver;
    }

    if (game.uquiver && is_ammo(game.uquiver) && (game.iflags?.fireassist ?? true)
        && !skip_fireassist) {
        if (uwep && is_pole(uwep))
            throw new Error('dofire(): could_pole_mon() not ported yet');
        /* Try to find a launcher */
        if (ammo_and_launcher(game.uquiver, uwep)) {
            obj = game.uquiver;
        } else if (ammo_and_launcher(game.uquiver, game.uswapwep)) {
            /* swap weapons and retry fire */
            cmdq_add_ec("doswapweapon");
            cmdq_add_ec("dofire");
            return res;
        } else {
            const olauncher = find_launcher(game.uquiver);
            if (olauncher) {
                /* wield launcher, retry fire */
                if (uwep && !game.flags?.pushweapon)
                    cmdq_add_ec("doswapweapon");
                cmdq_add_ec("dowield");
                cmdq_add_key(olauncher.invlet);
                cmdq_add_ec("dofire");
                return res;
            }
        }
    }

    altres = obj ? await throw_obj(obj, shotlimit) : ECMD_CANCEL;
    /* fire can take time by filling quiver (if that causes something which
       was wielded to be unwielded) even if the throw itself gets cancelled */
    return (res === ECMD_TIME) ? res : altres;
}
