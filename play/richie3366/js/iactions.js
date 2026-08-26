// iactions.js — inventory item-action menu (partial).
// C ref: iactions.c itemactions / item_naming_classification /
//        item_reading_classification / itemactions_pushkeys; invent.c
//        dispinv_with_action.
//
// Branch envelope: build + show "Do what with …?" PICK_ONE menu; ESC /
// Return / Space cancel; itemactions_pushkeys for throw (and selected arms).
// Named omissions: full pushkeys catalogue (offer/tip/invoke/…);
// shop pay; tip/invoke/two-weapon edge cases.

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { flush_screen, docrt, clear_committed_status } from './display.js';
import { paint_corner_nhw_menu } from './invent.js';
import { cxname, the, xname, makeplural, singular } from './objnam.js';
import { ia_checkfile } from './pager.js';
import { ammo_and_launcher } from './wield.js';
import {
    objects, objectNames, objectDescrs,
    WEAPON_CLASS, ARMOR_CLASS, RING_CLASS, AMULET_CLASS, TOOL_CLASS,
    POTION_CLASS, SCROLL_CLASS, SPBOOK_CLASS, WAND_CLASS,
    GEM_CLASS, COIN_CLASS, VENOM_CLASS,
} from './objects.js';
import {
    ECMD_OK, GETOBJ_EXCLUDE, GETOBJ_DOWNPLAY, GETOBJ_SUGGEST,
    CMDQ_EXTCMD,
    W_ARMOR, W_ACCESSORY, W_AMUL, W_RING, W_TOOL, Is_container,
    Has_contents, has_oname, ONAME, HANDS_SYM,
} from './const.js';
import { ATR_INVERSE } from './terminal.js';

/** C ref: cmd.c cmdq_add_ec / cmdq_add_key for itemed canned follow-up. */
function cmdq_add_ec(fn) {
    if (!game._cmdq_canned) game._cmdq_canned = [];
    game._cmdq_canned.push(fn);
}

/**
 * C cmd.c cmdq_add_ec: typ=CMDQ_EXTCMD, ec_entry=ext_func_tab_from_func.
 * Only IA_DIP_OBJ (#altdip INTERNALCMD) uses this; other arms stay
 * bare-function clones (do not write a sixth cmdq_add_ec module).
 */
function cmdq_add_ec_entry(txt, fn) {
    if (!game._cmdq_canned) game._cmdq_canned = [];
    game._cmdq_canned.push({ typ: CMDQ_EXTCMD, txt, run: fn });
}
function cmdq_add_key(ch) {
    if (!game._cmdq_canned) game._cmdq_canned = [];
    const key = typeof ch === 'string' ? ch.charCodeAt(0) : ch;
    game._cmdq_canned.push({ typ: 'key', key });
}

/**
 * C ref: iactions.c itemactions_pushkeys — queue CQ_CANNED ec + invlet.
 * Named omissions: most arms beyond throw/drop/apply/read/quaff/wield/
 * wear/takeoff/zap/quiver/fire/dip (offer/tip/invoke still named).
 */
async function itemactions_pushkeys(act, otmp) {
    switch (act) {
    case IA_THROW_OBJ: {
        const { dothrow } = await import('./dothrow.js');
        cmdq_add_ec(dothrow);
        cmdq_add_key(otmp.invlet);
        break;
    }
    case IA_DROP_OBJ: {
        const { dodrop } = await import('./do.js');
        cmdq_add_ec(dodrop);
        cmdq_add_key(otmp.invlet);
        break;
    }
    case IA_APPLY_OBJ: {
        const { doapply } = await import('./apply.js');
        cmdq_add_ec(doapply);
        cmdq_add_key(otmp.invlet);
        break;
    }
    case IA_READ_OBJ: {
        const { doread } = await import('./read.js');
        cmdq_add_ec(doread);
        cmdq_add_key(otmp.invlet);
        break;
    }
    case IA_QUAFF_OBJ: {
        const { dodrink } = await import('./potion.js');
        cmdq_add_ec(dodrink);
        cmdq_add_key(otmp.invlet);
        break;
    }
    case IA_DIP_OBJ: {
        /* C iactions.c `:159–166` — cmdq_add_ec(dip_into) looks up
           INTERNALCMD "altdip"; potion invlet answers getobj drink_ok. */
        const { dip_into } = await import('./potion.js');
        cmdq_add_ec_entry('altdip', dip_into);
        cmdq_add_key(otmp.invlet);
        break;
    }
    case IA_WIELD_OBJ: {
        const { dowield } = await import('./wield.js');
        cmdq_add_ec(dowield);
        cmdq_add_key(otmp.invlet);
        break;
    }
    case IA_WEAR_OBJ: {
        const { dowear } = await import('./do_wear.js');
        cmdq_add_ec(dowear);
        cmdq_add_key(otmp.invlet);
        break;
    }
    case IA_TAKEOFF_OBJ: {
        const { dotakeoff } = await import('./do_wear.js');
        cmdq_add_ec(dotakeoff);
        cmdq_add_key(otmp.invlet);
        break;
    }
    case IA_ZAP_OBJ: {
        const { dozap } = await import('./zap.js');
        cmdq_add_ec(dozap);
        cmdq_add_key(otmp.invlet);
        break;
    }
    case IA_QUIVER_OBJ: {
        const { dowieldquiver } = await import('./wield.js');
        cmdq_add_ec(dowieldquiver);
        cmdq_add_key(otmp.invlet);
        break;
    }
    case IA_FIRE_OBJ: {
        const { dofire } = await import('./dothrow.js');
        cmdq_add_ec(dofire);
        break;
    }
    default:
        // remaining arms deferred
        break;
    }
}
const IA_NONE = 0;
const IA_UNWIELD = 1;
const IA_APPLY_OBJ = 2;
const IA_DIP_OBJ = 3;
const IA_NAME_OBJ = 4;
const IA_NAME_OTYP = 5;
const IA_DROP_OBJ = 6;
const IA_EAT_OBJ = 7;
const IA_ENGRAVE_OBJ = 8;
const IA_FIRE_OBJ = 9;
const IA_ADJUST_OBJ = 10;
const IA_ADJUST_STACK = 11;
const IA_SACRIFICE = 12;
const IA_BUY_OBJ = 13;
const IA_QUAFF_OBJ = 14;
const IA_QUIVER_OBJ = 15;
const IA_READ_OBJ = 16;
const IA_RUB_OBJ = 17;
const IA_THROW_OBJ = 18;
const IA_TAKEOFF_OBJ = 19;
const IA_TIP_CONTAINER = 20;
const IA_INVOKE_OBJ = 21;
const IA_WIELD_OBJ = 22;
const IA_WEAR_OBJ = 23;
const IA_SWAPWEAPON = 24;
const IA_TWOWEAPON = 25;
const IA_ZAP_OBJ = 26;
const IA_WHATIS_OBJ = 27;

const SPE_NOVEL = objectNames.indexOf('SPE_NOVEL');
const SPE_BLANK_PAPER = objectNames.indexOf('SPE_BLANK_PAPER');
const SPE_BOOK_OF_THE_DEAD = objectNames.indexOf('SPE_BOOK_OF_THE_DEAD');
const AMULET_OF_YENDOR = objectNames.indexOf('AMULET_OF_YENDOR');
const FAKE_AMULET_OF_YENDOR = objectNames.indexOf('FAKE_AMULET_OF_YENDOR');
const CRYSTAL_BALL = objectNames.indexOf('CRYSTAL_BALL');
const TIN = objectNames.indexOf('TIN');
const TIN_OPENER = objectNames.indexOf('TIN_OPENER');
const TOWEL = objectNames.indexOf('TOWEL');
const MAGIC_MARKER = objectNames.indexOf('MAGIC_MARKER');
const OIL_LAMP = objectNames.indexOf('OIL_LAMP');
const MAGIC_LAMP = objectNames.indexOf('MAGIC_LAMP');
const BRASS_LANTERN = objectNames.indexOf('BRASS_LANTERN');
const HORN_OF_PLENTY = objectNames.indexOf('HORN_OF_PLENTY');
const MEAT_RING = objectNames.indexOf('MEAT_RING');
const BLINDFOLD = objectNames.indexOf('BLINDFOLD');
const LENSES = objectNames.indexOf('LENSES');
const GOLD_PIECE = objectNames.indexOf('GOLD_PIECE');
const HEAVY_IRON_BALL = objectNames.indexOf('HEAVY_IRON_BALL');

/** C ref: objnam.c simpleonames — type name without quan/BUC (xname quan=1). */
function simpleonames(obj) {
    return singular(obj, xname);
}

function is_plural(obj) {
    return (obj?.quan || 1) > 1;
}

/** C ref: do_name.c objtyp_is_callable — class + OBJ_DESCR / oc_uname. */
function objtyp_is_callable(i) {
    const ocl = game.objects?.[i] || objects[i];
    if (!ocl) return false;
    if (ocl.oc_uname) return true;
    const oc = ocl.oc_class;
    if (oc === AMULET_CLASS) {
        if (i === AMULET_OF_YENDOR || i === FAKE_AMULET_OF_YENDOR) return false;
    }
    if (
        oc === AMULET_CLASS || oc === SCROLL_CLASS || oc === POTION_CLASS
        || oc === WAND_CLASS || oc === RING_CLASS || oc === GEM_CLASS
        || oc === SPBOOK_CLASS || oc === ARMOR_CLASS || oc === TOOL_CLASS
        || oc === VENOM_CLASS
    ) {
        const di = ocl.oc_descr_idx ?? i;
        return !!(objectDescrs[di] || ocl.oc_descr);
    }
    return false;
}

/** C ref: do_name.c name_ok */
function name_ok(obj) {
    if (!obj || obj.oclass === COIN_CLASS) return GETOBJ_EXCLUDE;
    if (!obj.dknown || obj.oartifact || obj.otyp === SPE_NOVEL) {
        return GETOBJ_DOWNPLAY;
    }
    return GETOBJ_SUGGEST;
}

/** C ref: do_name.c call_ok */
function call_ok(obj) {
    if (!obj || !objtyp_is_callable(obj.otyp)) return GETOBJ_EXCLUDE;
    const ocl = game.objects?.[obj.otyp] || objects[obj.otyp];
    if (!obj.dknown || (ocl?.oc_name_known && !ocl?.oc_uname)) {
        return GETOBJ_DOWNPLAY;
    }
    return GETOBJ_SUGGEST;
}

/**
 * C ref: iactions.c item_naming_classification.
 * Fills oname/ocall buffers; returns true if either set.
 */
function item_naming_classification(obj, onamebuf, ocallbuf) {
    onamebuf.s = '';
    ocallbuf.s = '';
    if (name_ok(obj) === GETOBJ_SUGGEST) {
        const named = has_oname(obj) && ONAME(obj);
        const verb = !named ? 'Name' : 'Rename or un-name';
        const which = 'this specific'; // the_unique / plural deferred
        onamebuf.s = `${verb} ${which} ${simpleonames(obj)}`;
    }
    if (call_ok(obj) === GETOBJ_SUGGEST) {
        let callname = simpleonames(obj);
        if (!is_plural(obj)) callname = makeplural(callname);
        const ocl = game.objects?.[obj.otyp] || objects[obj.otyp];
        const verb = !ocl?.oc_uname ? 'Call' : 'Re-call or un-call';
        ocallbuf.s = `${verb} the type for ${callname}`;
    }
    return !!(onamebuf.s || ocallbuf.s);
}

/**
 * C ref: iactions.c item_reading_classification.
 * @returns {number} IA_READ_OBJ or IA_NONE
 */
function item_reading_classification(obj, out) {
    const otyp = obj.otyp;
    out.s = '';
    if (obj.oclass === SCROLL_CLASS) {
        const ocl = game.objects?.[otyp] || objects[otyp];
        const magic = (obj.dknown
            && (otyp !== objectNames.indexOf('SCR_BLANK_PAPER')
                || !ocl?.oc_name_known))
            ? ' to activate its magic' : '';
        out.s = `Read this scroll${magic}`;
        return IA_READ_OBJ;
    }
    if (obj.oclass === SPBOOK_CLASS) {
        const ocl = game.objects?.[otyp] || objects[otyp];
        const novel = otyp === SPE_NOVEL;
        const blank = otyp === SPE_BLANK_PAPER && ocl?.oc_name_known;
        const tome = otyp === SPE_BOOK_OF_THE_DEAD && ocl?.oc_name_known;
        const verb = (novel || blank) ? 'Read' : tome ? 'Examine' : 'Study';
        const what = novel ? simpleonames(obj) : tome ? 'tome' : 'spellbook';
        out.s = `${verb} this ${what}`;
        return IA_READ_OBJ;
    }
    // cookie / shirt slogan branches deferred
    return IA_NONE;
}

function is_weptool(obj) {
    if (!obj || obj.oclass !== TOOL_CLASS) return false;
    const ocl = game.objects?.[obj.otyp] || objects[obj.otyp];
    return (ocl?.oc_skill ?? 0) !== 0;
}

function is_graystone(obj) {
    const n = objectNames[obj?.otyp];
    return n === 'LUCKSTONE' || n === 'LOADSTONE' || n === 'TOUCHSTONE'
        || n === 'FLINT' || n === 'HEALTHSTONE';
}

/**
 * C ref: iactions.c itemactions — NHW_MENU PICK_ONE of context actions.
 * Named omissions: full apply-otyp catalogue polish; eat/is_edible; altar
 * offer; shop pay; tip/invoke/two-weapon edge cases; remaining pushkeys.
 */
export async function itemactions(otmp) {
    if (!otmp) return ECMD_OK;
    const u = game.u || {};
    const already_worn = ((otmp.owornmask || 0) & (W_ARMOR | W_ACCESSORY)) !== 0;
    const light = otmp.lamplit ? 'Extinguish' : 'Light';
    const items = []; // { act, let, text }

    // C: after fullscreen invent destroy, WIN_STATUS stays blank until
    // bot() when this menu closes (D-0467).
    clear_committed_status();

    const add = (act, letch, txt) => {
        items.push({ act, let: letch, text: `${letch} - ${txt}` });
    };

    // -: unwield
    if (otmp === u.uwep || otmp === u.uswapwep || otmp === u.uquiver) {
        const verb = otmp === u.uquiver ? 'Quiver' : 'Wield';
        const action = otmp === u.uquiver ? 'un-ready' : 'un-wield';
        const which = is_plural(otmp) ? 'these' : 'this';
        const what = (otmp.oclass === WEAPON_CLASS || is_weptool(otmp))
            ? 'weapon' : 'item';
        const whats = is_plural(otmp) ? makeplural(what) : what;
        add(IA_UNWIELD, '-', `${verb} '${HANDS_SYM}' to ${action} ${which} ${whats}`);
    }

    // a: apply — subset of common tools; full catalogue deferred
    if (otmp.oclass === COIN_CLASS) {
        add(IA_APPLY_OBJ, 'a', 'Flip a coin');
    } else if (Is_container(otmp)) {
        const ocl = game.objects?.[otmp.otyp] || objects[otmp.otyp];
        if (objectNames[otmp.otyp] === 'BAG_OF_TRICKS' && ocl?.oc_name_known) {
            add(IA_APPLY_OBJ, 'a', 'Reach into this bag');
        } else {
            add(IA_APPLY_OBJ, 'a', 'Open this container');
        }
    } else if (otmp.oclass === WAND_CLASS) {
        add(IA_APPLY_OBJ, 'a', 'Break this wand');
    } else if (otmp.oclass === POTION_CLASS) {
        add(
            IA_DIP_OBJ,
            'a',
            `Dip something into ${is_plural(otmp) ? 'one of these' : 'this'} potion${(otmp.quan || 1) !== 1 ? 's' : ''}`,
        );
    } else if (
        otmp.otyp === OIL_LAMP || otmp.otyp === MAGIC_LAMP
        || otmp.otyp === BRASS_LANTERN
    ) {
        add(IA_APPLY_OBJ, 'a', `${light} this light source`);
    }
    // other apply otyps deferred

    // c / C: name / call
    const oname = { s: '' };
    const ocall = { s: '' };
    if (item_naming_classification(otmp, oname, ocall)) {
        if (oname.s) add(IA_NAME_OBJ, 'c', oname.s);
        if (ocall.s) add(IA_NAME_OTYP, 'C', ocall.s);
    }

    // d: drop
    if (!already_worn) {
        add(IA_DROP_OBJ, 'd', `Drop this ${(otmp.quan || 1) > 1 ? 'stack' : 'item'}`);
    }

    // e: eat — tin / is_edible deferred (no entry unless tin)
    if (otmp.otyp === TIN) {
        const withOpener = u.uwep && u.uwep.otyp === TIN_OPENER
            ? ' with your tin opener' : '';
        add(
            IA_EAT_OBJ,
            'e',
            `Open ${(otmp.quan || 1) > 1 ? 'one of these tins' : 'this tin'}${withOpener} and eat the contents`,
        );
    }

    // E: engrave
    if (otmp.otyp === TOWEL) {
        add(IA_ENGRAVE_OBJ, 'E', 'Wipe the floor with this towel');
    } else if (otmp.otyp === MAGIC_MARKER) {
        add(IA_ENGRAVE_OBJ, 'E', 'Scribble graffiti on the floor');
    } else if (
        otmp.oclass === WEAPON_CLASS || otmp.oclass === WAND_CLASS
        || otmp.oclass === GEM_CLASS || otmp.oclass === RING_CLASS
    ) {
        add(
            IA_ENGRAVE_OBJ,
            'E',
            `Write on the floor with ${(otmp.quan || 1) > 1 ? 'one of these items' : 'this item'}`,
        );
    }

    // f: fire quivered
    if (otmp === u.uquiver) {
        const shoot = ammo_and_launcher(otmp, u.uwep);
        let buf = `${shoot ? 'Shoot' : 'Throw'} ${(otmp.quan || 1) > 1 ? 'one of these' : 'this'}`;
        if (shoot && u.uwep) {
            buf += ` with your wielded ${simpleonames(u.uwep)}`;
        }
        add(IA_FIRE_OBJ, 'f', buf);
    }

    // i / I: adjust
    if (otmp.oclass !== COIN_CLASS) {
        add(IA_ADJUST_OBJ, 'i', 'Adjust inventory by assigning new letter');
    }
    if ((otmp.quan || 1) > 1 && otmp.oclass !== COIN_CLASS) {
        add(IA_ADJUST_STACK, 'I', 'Adjust inventory by splitting this stack');
    }

    // O: offer — altar corpse/amulet deferred

    // p: pay unpaid — shop deferred

    // P: put on accessory
    if (!already_worn) {
        let buf = '';
        if (otmp.oclass === AMULET_CLASS) {
            buf = !u.uamul ? 'Put this amulet on' : '[already wearing an amulet]';
        } else if (otmp.oclass === RING_CLASS || otmp.otyp === MEAT_RING) {
            buf = (!u.uleft || !u.uright)
                ? 'Put this ring on'
                : '[both ring fingers in use]';
        } else if (
            otmp.otyp === BLINDFOLD || otmp.otyp === TOWEL || otmp.otyp === LENSES
        ) {
            if (u.ublindf) buf = '[already wearing eyewear]';
            else if (otmp.otyp === LENSES) buf = 'Put these lenses on';
            else {
                buf = `Put this on${otmp.otyp === TOWEL ? ' to blindfold yourself' : ''}`;
            }
        }
        if (buf) add(IA_WEAR_OBJ, 'P', buf);
    }

    // q: quaff
    if (otmp.oclass === POTION_CLASS) {
        add(
            IA_QUAFF_OBJ,
            'q',
            `Quaff (drink) ${(otmp.quan || 1) > 1 ? 'one of these potions' : 'this potion'}`,
        );
    }

    // Q: quiver
    if (
        (otmp.oclass === GEM_CLASS || otmp.oclass === WEAPON_CLASS)
        && otmp !== u.uquiver
    ) {
        const shoot = ammo_and_launcher(otmp, u.uwep);
        add(
            IA_QUIVER_OBJ,
            'Q',
            `Quiver this ${(otmp.quan || 1) > 1 ? 'stack' : 'item'} for easy ${shoot ? 'shooting' : 'throwing'} with 'f'ire`,
        );
    }

    // r: read / study
    const rbuf = { s: '' };
    if (item_reading_classification(otmp, rbuf) === IA_READ_OBJ) {
        add(IA_READ_OBJ, 'r', rbuf.s);
    }

    // R: remove / rub
    if ((otmp.owornmask || 0) & W_ACCESSORY) {
        const kind = (otmp.owornmask & W_AMUL) ? 'amulet'
            : (otmp.owornmask & W_RING) ? 'ring'
                : (otmp.owornmask & W_TOOL) ? 'eyewear' : 'accessory';
        add(IA_TAKEOFF_OBJ, 'R', `Remove this ${kind}`);
    }
    if (
        otmp.otyp === OIL_LAMP || otmp.otyp === MAGIC_LAMP
        || otmp.otyp === BRASS_LANTERN
    ) {
        add(IA_RUB_OBJ, 'R', `Rub this ${simpleonames(otmp)}`);
    } else if (otmp.oclass === GEM_CLASS && is_graystone(otmp)) {
        add(IA_RUB_OBJ, 'R', 'Rub something on this stone');
    }

    // t: throw
    if (!already_worn) {
        const shoot = ammo_and_launcher(otmp, u.uwep);
        let buf = `${shoot ? 'Shoot' : 'Throw'} `;
        if ((otmp.quan || 1) === 1) buf += 'this item';
        else if (otmp.otyp === GOLD_PIECE) buf += 'them';
        else buf += 'one of these';
        if (
            otmp === u.uquiver
            && (otmp.otyp !== GOLD_PIECE || (otmp.quan || 1) === 1)
        ) {
            buf += " (same as 'f')";
        }
        add(IA_THROW_OBJ, 't', buf);
    }

    // T: take off / tip
    if ((otmp.owornmask || 0) & W_ARMOR) {
        add(IA_TAKEOFF_OBJ, 'T', 'Take off this armor');
    }
    if (
        (Is_container(otmp) && (Has_contents(otmp) || !otmp.cknown))
        || (otmp.otyp === HORN_OF_PLENTY && ((otmp.spe | 0) > 0 || !otmp.known))
    ) {
        add(IA_TIP_CONTAINER, 'T', 'Tip all the contents out of this container');
    }

    // V: invoke
    if (
        (otmp.otyp === FAKE_AMULET_OF_YENDOR && !otmp.known)
        || otmp.oartifact
        || (game.objects?.[otmp.otyp] || objects[otmp.otyp])?.oc_unique
        || otmp.otyp === CRYSTAL_BALL
    ) {
        add(IA_INVOKE_OBJ, 'V', 'Try to invoke a unique power of this object');
    }

    // w: wield
    if (otmp === u.uwep) {
        // already wielded — skip
    } else if (
        otmp.oclass === WEAPON_CLASS || is_weptool(otmp)
        || otmp.otyp === HEAVY_IRON_BALL
    ) {
        add(
            IA_WIELD_OBJ,
            'w',
            `Wield this ${(otmp.quan || 1) > 1 ? 'stack' : 'item'} as your weapon`,
        );
    } else if (otmp.otyp === TIN_OPENER) {
        add(IA_WIELD_OBJ, 'w', 'Wield the tin opener to easily open tins');
    } else if (!already_worn) {
        add(
            IA_WIELD_OBJ,
            'w',
            `Wield this ${(otmp.quan || 1) > 1 ? 'stack' : 'item'} in your hands`,
        );
    }

    // W: wear armor — deferred slot-occupied polish
    if (!already_worn && otmp.oclass === ARMOR_CLASS) {
        add(IA_WEAR_OBJ, 'W', 'Wear this armor');
    }

    // x: swap weapon
    if (otmp === u.uwep && u.uswapwep) {
        add(IA_SWAPWEAPON, 'x', 'Swap this with your alternate weapon');
    } else if (otmp === u.uwep) {
        add(IA_SWAPWEAPON, 'x', 'Ready this as an alternate weapon');
    } else if (otmp === u.uswapwep) {
        add(IA_SWAPWEAPON, 'x', 'Swap this with your main weapon');
    }

    // z: zap
    if (otmp.oclass === WAND_CLASS) {
        add(IA_ZAP_OBJ, 'z', 'Zap this wand to release its magic');
    }

    // /: whatis
    if (ia_checkfile(otmp)) {
        add(
            IA_WHATIS_OBJ,
            '/',
            `Look up information about ${(otmp.quan || 1) > 1 ? 'these' : 'this'}`,
        );
    }

    const prompt = `Do what with ${the(cxname(otmp))}?`;
    const byLet = new Map();
    for (const it of items) byLet.set(it.let, it);

    // C tty_end_menu: prompt ATR_INVERSE, blank, then items.
    // After fullscreen invent, WIN_STATUS stays blank until bot() after
    // this menu closes (clear_committed_status from display_pickinv_reply).
    for (;;) {
        const entries = [
            { text: prompt, attr: ATR_INVERSE },
            { text: '', attr: 0 },
            ...items.map((it) => ({ text: it.text, attr: 0 })),
        ];
        await paint_corner_nhw_menu(entries, '(end) ');
        await flush_screen(1);
        const key = await nhgetch();
        game._menu_overlay = false;
        await docrt();
        await flush_screen(1);

        if (key === 27 || key === 13 || key === 10 || key === 32) {
            // cancel — docrt/flush above restored status via bot()
            return ECMD_OK;
        }
        const ch = String.fromCharCode(key);
        if (byLet.has(ch)) {
            await itemactions_pushkeys(byLet.get(ch).act, otmp);
            return ECMD_OK;
        }
        // invalid → re-prompt; keep status blank like C select_menu
        clear_committed_status();
    }
}

/**
 * C ref: invent.c dispinv_with_action(NULL, FALSE, NULL) via ddoinv.
 * display_inventory(lets, menumode=TRUE) → itemactions on letter.
 */
export async function dispinv_with_action(
    lets = null,
    _use_inuse_ordering = false,
    _alt_label = null,
) {
    const { display_pickinv_reply } = await import('./invent.js');
    // C: menumode = (len != 1 || menu_requested) — ddoinv lets=NULL → TRUE
    const c = await display_pickinv_reply(lets == null ? null : lets);
    if (c && c !== '\x1b') {
        const otmp = (game.invent || []).find((o) => o && o.invlet === c);
        if (otmp) await itemactions(otmp);
    }
    return ECMD_OK;
}
