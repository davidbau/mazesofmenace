// zap.js -- zapping wands.
// C ref: zap.c
//
// Ported so far: the #zap command up to choosing the wand (zap_ok(),
// dozap()'s getobj()); zapping itself (zappable(), weffects()) is not
// ported yet.  For enlightenment: adtyp_to_prop(),
// u_adtyp_resistance_obj(), item_what().

import { game } from './gstate.js';
import { You } from './display.js';
import { getobj } from './invent.js';
import { check_capacity } from './hack.js';
import { GETOBJ_SUGGEST, GETOBJ_EXCLUDE, GETOBJ_NOFLAGS, ECMD_OK,
         ECMD_CANCEL } from './const.js';
import { WAND_CLASS, DWARVISH_CLOAK } from './objects.js';
import { M1_NOHANDS, AD_COLD, AD_FIRE, AD_ELEC, AD_ACID, AD_DISN } from './monsters.js';
import {
    COLD_RES, FIRE_RES, SHOCK_RES, ACID_RES, DISINT_RES, W_ARMOR, W_ACCESSORY,
    W_WEP, W_ART, W_ARMC, W_ARM, W_ARMU, W_ARMH, W_ARMG, W_ARMF, W_ARMS,
    W_AMUL, W_TOOL, W_RING, W_RINGL,
} from './const.js';
import {
    cloak_simple_name, suit_simple_name, shirt_simple_name, helm_simple_name,
    gloves_simple_name, boots_simple_name, shield_simple_name, simpleonames,
} from './iactions.js';

/* C ref: mondata.h nohands() */
function nohands(ptr) { return (ptr.mflags1 & M1_NOHANDS) !== 0; }

// C ref: zap.c zap_ok() -- getobj callback for object to zap
export function zap_ok(obj) {
    if (obj && obj.oclass === WAND_CLASS)
        return GETOBJ_SUGGEST;
    return GETOBJ_EXCLUDE;
}

// C ref: zap.c dozap() -- #zap command, 'z'
export async function dozap() {
    if (nohands(game.youmonst.data)) {
        await You("aren't able to zap anything in your current form.");
        return ECMD_OK;
    }
    if (await check_capacity(null))
        return ECMD_OK;
    const obj = await getobj("zap", zap_ok, GETOBJ_NOFLAGS);
    if (!obj)
        return ECMD_CANCEL;

    throw new Error('dozap(): zapping a wand (zappable()/weffects()) not ported yet');
}

// C ref: zap.c adtyp_to_prop()
/* convert attack damage AD_foo to property resistance */
function adtyp_to_prop(dmgtyp) {
    switch (dmgtyp) {
    case AD_COLD:
        return COLD_RES;
    case AD_FIRE:
        return FIRE_RES;
    case AD_ELEC:
        return SHOCK_RES;
    case AD_ACID:
        return ACID_RES;
    case AD_DISN:
        return DISINT_RES;
    default:
        break;
    }
    return 0; /* prop_types start at 1 */
}

// C ref: zap.c u_adtyp_resistance_obj()
/* Is hero wearing or wielding an object with resistance to attack
   damage type? Returns the percentage protection that the object gives. */
export function u_adtyp_resistance_obj(dmgtyp) {
    const prop = adtyp_to_prop(dmgtyp);

    if (!prop)
        return 0;

    /* FIXME? these percentages (99 and 90) seem too high... */

    /* items that give an extrinsic resistance when worn or wielded or
       carried give 99% protection to your items */
    if ((game.u.uprops[prop].extrinsic & (W_ARMOR | W_ACCESSORY | W_WEP | W_ART))
        !== 0)
        return 99;

    /* worn dwarvish cloaks give 90% protection against heat and cold to
       carried items */
    if (game.uarmc && game.uarmc.otyp === DWARVISH_CLOAK
        && (dmgtyp === AD_COLD || dmgtyp === AD_FIRE))
        return 90;

    return 0;
}

// C ref: zap.c item_what()
/* for enlightenment; currently only useful in wizard mode; cf from_what() */
export function item_what(dmgtyp) {
    let whatbuf = "";
    let what = null;
    const prop = adtyp_to_prop(dmgtyp);
    const xtrinsic = game.u.uprops[prop].extrinsic;

    if (game.flags.debug) { /* wizard */
        if (!prop || !xtrinsic) {
            ; /* 'what' stays Null */
        } else if (xtrinsic & W_ARMC) {
            what = cloak_simple_name(game.uarmc);
        } else if (xtrinsic & W_ARM) {
            what = suit_simple_name(game.uarm); /* "dragon {scales,mail}" */
        } else if (xtrinsic & W_ARMU) {
            what = shirt_simple_name(game.uarmu);
        } else if (xtrinsic & W_ARMH) {
            what = helm_simple_name(game.uarmh);
        } else if (xtrinsic & W_ARMG) {
            what = gloves_simple_name(game.uarmg);
        } else if (xtrinsic & W_ARMF) {
            what = boots_simple_name(game.uarmf);
        } else if (xtrinsic & W_ARMS) {
            what = shield_simple_name(game.uarms);
        } else if (xtrinsic & (W_AMUL | W_TOOL)) {
            what = simpleonames((xtrinsic & W_AMUL) ? game.uamul : game.ublindf);
        } else if (xtrinsic & W_RING) {
            if ((xtrinsic & W_RING) === W_RING) /* both */
                what = "rings";
            else
                what = simpleonames((xtrinsic & W_RINGL) ? game.uleft : game.uright);
        } else if (xtrinsic & W_WEP) {
            what = simpleonames(game.uwep);
        }
        /* format the output to be ready for enl_msg() to append it to
           "Your items {are,were} protected against <damage-type>" */
        if (what) /* strlen(what) will be less than 30 */
            whatbuf = ` by your ${what.slice(0, 40)}`;
    }
    return whatbuf;
}

// C ref: zap.c exclam()
export function exclam(force) {
    /* force == 0 occurs e.g. with sleep ray */
    /* note that large force is usual with wands so that !! would
            require information about hand/weapon/wand */
    return (force < 0) ? "?" : (force <= 4) ? "." : "!";
}
