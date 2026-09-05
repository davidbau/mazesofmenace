// iactions.js — inventory item-action menu (partial).
// C ref: iactions.c itemactions / item_naming_classification /
//        item_reading_classification / itemactions_pushkeys; invent.c
//        dispinv_with_action.
//
// Branch envelope: build + show "Do what with …?" PICK_ONE menu; ESC /
// Return / Space cancel; itemactions_pushkeys throw/drop/apply/read/…
// + IA_SACRIFICE / IA_TIP_CONTAINER / IA_INVOKE_OBJ (D-1665) +
// IA_UNWIELD / IA_NAME_OBJ / IA_NAME_OTYP / IA_EAT_OBJ /
// IA_ENGRAVE_OBJ (D-1675) + IA_BUY_OBJ shop pay (D-1676) +
// IA_TWOWEAPON (D-1677) + IA_RUB_OBJ / IA_SWAPWEAPON / IA_WHATIS_OBJ
// (D-1686). Corner process_menu_window cl_end from offx (D-1831).
// Named omissions: W already-wearing armor_simple_name; dungeon.c
// surface terrain nouns; cantwield skip of `'w'`; doengrave non-hands
// stylus body; Traditional itemize yn. `'i'` getobj is D-1681.

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { flush_screen, set_bot_disabled, tty_nhbell } from './display.js';
import { paint_corner_nhw_menu, dismiss_nhw_menu, inuse_headers_accessories, inuse_headers_set_accessories, check_invent_gold, process_menu_search } from './invent.js';
import { cxname, the, xname, makeplural, singular, is_plural, the_unique_obj } from './objnam.js';
import { body_part } from './polyself.js';
import { ia_checkfile } from './pager.js';
import { call_ok, name_ok } from './do_name.js';
import { ammo_and_launcher, could_twoweap, TWOWEAPOK, bimanual } from './wield.js';
import {
    objects, objectNames,
    WEAPON_CLASS, ARMOR_CLASS, RING_CLASS, AMULET_CLASS, TOOL_CLASS,
    POTION_CLASS, SCROLL_CLASS, SPBOOK_CLASS, WAND_CLASS,
    GEM_CLASS, COIN_CLASS,
} from './objects.js';
import {
    ECMD_OK, GETOBJ_SUGGEST,
    CMDQ_EXTCMD,
    W_ARMOR, W_ACCESSORY, W_AMUL, W_RING, W_TOOL, Is_container,
    Has_contents, has_oname, ONAME, HANDS_SYM, IS_ALTAR, SHOPBASE,
    MENU_SEARCH, PICK_ONE, HAND, FINGER, P_DAGGER, P_SABER,
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
function cmdq_add_ec_entry(txt, fn, flags = 0) {
    if (!game._cmdq_canned) game._cmdq_canned = [];
    game._cmdq_canned.push({ typ: CMDQ_EXTCMD, txt, run: fn, flags: flags | 0 });
}
function cmdq_add_key(ch) {
    if (!game._cmdq_canned) game._cmdq_canned = [];
    const key = typeof ch === 'string' ? ch.charCodeAt(0) : ch;
    game._cmdq_canned.push({ typ: 'key', key });
}

/**
 * C ref: iactions.c itemactions_pushkeys — queue CQ_CANNED ec + invlet.
 * IA_SACRIFICE / IA_TIP_CONTAINER / IA_INVOKE_OBJ are D-1665.
 * IA_UNWIELD / IA_NAME_* / IA_EAT_OBJ / IA_ENGRAVE_OBJ are D-1675.
 * IA_BUY_OBJ is D-1676. IA_TWOWEAPON is D-1677.
 * IA_RUB_OBJ / IA_SWAPWEAPON / IA_WHATIS_OBJ are D-1686.
 */
async function itemactions_pushkeys(act, otmp) {
    switch (act) {
    case IA_UNWIELD: {
        /* C iactions.c `:150–156` — uwep→dowield, uswapwep→remarm_swapwep
           (#altunwield), uquiver→dowieldquiver, else donull; then HANDS_SYM. */
        const u = game.u || {};
        if (otmp === u.uwep) {
            const { dowield } = await import('./wield.js');
            cmdq_add_ec(dowield);
        } else if (otmp === u.uswapwep) {
            const { remarm_swapwep } = await import('./do_wear.js');
            cmdq_add_ec_entry('altunwield', remarm_swapwep);
        } else if (otmp === u.uquiver) {
            const { dowieldquiver } = await import('./wield.js');
            cmdq_add_ec(dowieldquiver);
        } else {
            const { donull } = await import('./do.js');
            cmdq_add_ec(donull);
        }
        cmdq_add_key(HANDS_SYM);
        break;
    }
    case IA_NAME_OBJ:
    case IA_NAME_OTYP: {
        /* C iactions.c `:167–171` — docallcmd then 'i'/'o' then invlet. */
        const { docallcmd } = await import('./do_name.js');
        cmdq_add_ec(docallcmd);
        cmdq_add_key(act === IA_NAME_OBJ ? 'i' : 'o');
        cmdq_add_key(otmp.invlet);
        break;
    }
    case IA_EAT_OBJ: {
        /* C iactions.c `:177–182` — do_reqmenu PREFIXCMD then #eat +
           invlet (m-prefix skips floor food). */
        const { do_reqmenu, ext_func_tab_from_txt } = await import('./cmd.js');
        const { doeat } = await import('./eat.js');
        const tab = ext_func_tab_from_txt('reqmenu');
        cmdq_add_ec_entry('reqmenu', do_reqmenu, tab?.flags | 0);
        cmdq_add_ec(doeat);
        cmdq_add_key(otmp.invlet);
        break;
    }
    case IA_ENGRAVE_OBJ: {
        /* C iactions.c `:184–187` — cmdq_add_ec(doengrave) + invlet. */
        const { doengrave } = await import('./engrave.js');
        cmdq_add_ec(doengrave);
        cmdq_add_key(otmp.invlet);
        break;
    }
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
    case IA_ADJUST_OBJ: {
        /* C iactions.c `:191–194` — cmdq_add_ec(doorganize) #adjust. */
        const { doorganize } = await import('./invent.js');
        cmdq_add_ec(doorganize);
        cmdq_add_key(otmp.invlet);
        break;
    }
    case IA_ADJUST_STACK: {
        /* C iactions.c `:194–197` — cmdq_add_ec(adjust_split) looks up
           INTERNALCMD "altadjust"; invlet answers getobj("split"). */
        const { adjust_split } = await import('./invent.js');
        cmdq_add_ec_entry('altadjust', adjust_split);
        cmdq_add_key(otmp.invlet);
        break;
    }
    case IA_SACRIFICE: {
        /* C iactions.c `:198–201` — cmdq_add_ec(dosacrifice) #offer. */
        const { dosacrifice } = await import('./pray.js');
        cmdq_add_ec(dosacrifice);
        cmdq_add_key(otmp.invlet);
        break;
    }
    case IA_TIP_CONTAINER: {
        /* C iactions.c `:233–243` — do_reqmenu PREFIXCMD then #tip +
           invlet (m-prefix skips floor containers). */
        const { do_reqmenu, ext_func_tab_from_txt } = await import('./cmd.js');
        const { dotip } = await import('./pickup.js');
        const tab = ext_func_tab_from_txt('reqmenu');
        cmdq_add_ec_entry('reqmenu', do_reqmenu, tab?.flags | 0);
        cmdq_add_ec(dotip);
        cmdq_add_key(otmp.invlet);
        break;
    }
    case IA_INVOKE_OBJ: {
        /* C iactions.c `:245–248` — cmdq_add_ec(doinvoke) #invoke. */
        const { doinvoke } = await import('./artifact.js');
        cmdq_add_ec(doinvoke);
        cmdq_add_key(otmp.invlet);
        break;
    }
    case IA_BUY_OBJ: {
        /* C iactions.c `:203–206` — cmdq_add_ec(dopay) + invlet. */
        const { dopay } = await import('./shk.js');
        cmdq_add_ec(dopay);
        cmdq_add_key(otmp.invlet);
        break;
    }
    case IA_TWOWEAPON: {
        /* C iactions.c `:260–262` — cmdq_add_ec(dotwoweapon); no invlet. */
        const { dotwoweapon } = await import('./wield.js');
        cmdq_add_ec(dotwoweapon);
        break;
    }
    case IA_RUB_OBJ: {
        /* C iactions.c `:221–224` — cmdq_add_ec(dorub) + invlet. */
        const { dorub } = await import('./apply.js');
        cmdq_add_ec(dorub);
        cmdq_add_key(otmp.invlet);
        break;
    }
    case IA_SWAPWEAPON: {
        /* C iactions.c `:257–258` — cmdq_add_ec(doswapweapon); no invlet. */
        const { doswapweapon } = await import('./wield.js');
        cmdq_add_ec(doswapweapon);
        break;
    }
    case IA_WHATIS_OBJ: {
        /* C iactions.c `:267–271` — cmdq_add_ec(dowhatis) then 'i'
           (inventory look) then invlet. do_look pops the 'i';
           display_inventory pops the invlet (D-1686). */
        const { dowhatis } = await import('./pager.js');
        cmdq_add_ec(dowhatis);
        cmdq_add_key('i');
        cmdq_add_key(otmp.invlet);
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
const FAKE_AMULET_OF_YENDOR = objectNames.indexOf('FAKE_AMULET_OF_YENDOR');
const AMULET_OF_YENDOR = objectNames.indexOf('AMULET_OF_YENDOR');
const CORPSE = objectNames.indexOf('CORPSE');
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
const CREAM_PIE = objectNames.indexOf('CREAM_PIE');
const BULLWHIP = objectNames.indexOf('BULLWHIP');
const GRAPPLING_HOOK = objectNames.indexOf('GRAPPLING_HOOK');
const BAG_OF_TRICKS = objectNames.indexOf('BAG_OF_TRICKS');
const CAN_OF_GREASE = objectNames.indexOf('CAN_OF_GREASE');
const LOCK_PICK = objectNames.indexOf('LOCK_PICK');
const CREDIT_CARD = objectNames.indexOf('CREDIT_CARD');
const SKELETON_KEY = objectNames.indexOf('SKELETON_KEY');
const TINNING_KIT = objectNames.indexOf('TINNING_KIT');
const LEASH = objectNames.indexOf('LEASH');
const SADDLE = objectNames.indexOf('SADDLE');
const MAGIC_WHISTLE = objectNames.indexOf('MAGIC_WHISTLE');
const TIN_WHISTLE = objectNames.indexOf('TIN_WHISTLE');
const EUCALYPTUS_LEAF = objectNames.indexOf('EUCALYPTUS_LEAF');
const STETHOSCOPE = objectNames.indexOf('STETHOSCOPE');
const MIRROR = objectNames.indexOf('MIRROR');
const BELL = objectNames.indexOf('BELL');
const BELL_OF_OPENING = objectNames.indexOf('BELL_OF_OPENING');
const CANDELABRUM_OF_INVOCATION = objectNames.indexOf('CANDELABRUM_OF_INVOCATION');
const WAX_CANDLE = objectNames.indexOf('WAX_CANDLE');
const TALLOW_CANDLE = objectNames.indexOf('TALLOW_CANDLE');
const POT_OIL = objectNames.indexOf('POT_OIL');
const EXPENSIVE_CAMERA = objectNames.indexOf('EXPENSIVE_CAMERA');
const FIGURINE = objectNames.indexOf('FIGURINE');
const UNICORN_HORN = objectNames.indexOf('UNICORN_HORN');
const WOODEN_FLUTE = objectNames.indexOf('WOODEN_FLUTE');
const DRUM_OF_EARTHQUAKE = objectNames.indexOf('DRUM_OF_EARTHQUAKE');
const LAND_MINE = objectNames.indexOf('LAND_MINE');
const BEARTRAP = objectNames.indexOf('BEARTRAP');
const PICK_AXE = objectNames.indexOf('PICK_AXE');
const DWARVISH_MATTOCK = objectNames.indexOf('DWARVISH_MATTOCK');
const FORTUNE_COOKIE = objectNames.indexOf('FORTUNE_COOKIE');
const T_SHIRT = objectNames.indexOf('T_SHIRT');
const ALCHEMY_SMOCK = objectNames.indexOf('ALCHEMY_SMOCK');
const HAWAIIAN_SHIRT = objectNames.indexOf('HAWAIIAN_SHIRT');
const SCR_MAIL = objectNames.indexOf('SCR_MAIL');
const SCR_BLANK_PAPER = objectNames.indexOf('SCR_BLANK_PAPER');

/**
 * C ref: objnam.c simpleonames — minimal_xname, then makeplural if
 * quan != 1. Local clone (pickup.js also); the objnam export omits
 * makeplural (pretty_base only). Do not add another clone.
 */
function simpleonames(obj) {
    let n = singular(obj, xname);
    if ((obj?.quan ?? 1) !== 1) n = makeplural(n);
    return n;
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
        const which = the_unique_obj(obj) ? 'the'
            : !is_plural(obj) ? 'this specific'
            : 'this stack of';
        onamebuf.s = `${verb} ${which} ${simpleonames(obj)}`;
    }
    if (call_ok(obj) === GETOBJ_SUGGEST) {
        let callname = simpleonames(obj);
        if (the_unique_obj(obj)) callname = the(callname);
        else if (!is_plural(obj)) callname = makeplural(callname);
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
    /* C iactions.c `:91–124` cookie/shirt/apron/hawaiian before scroll. */
    if (otyp === FORTUNE_COOKIE) {
        out.s = 'Read the message inside this cookie';
        return IA_READ_OBJ;
    }
    if (otyp === T_SHIRT) {
        out.s = 'Read the slogan on the shirt';
        return IA_READ_OBJ;
    }
    if (otyp === ALCHEMY_SMOCK) {
        out.s = 'Read the slogan on the apron';
        return IA_READ_OBJ;
    }
    if (otyp === HAWAIIAN_SHIRT) {
        out.s = 'Look at the pattern on the shirt';
        return IA_READ_OBJ;
    }
    if (obj.oclass === SCROLL_CLASS) {
        const ocl = game.objects?.[otyp] || objects[otyp];
        /* C MAIL_STRUCTURES: SCR_MAIL is not "magic". */
        const magic = (obj.dknown
            && otyp !== SCR_MAIL
            && (otyp !== SCR_BLANK_PAPER
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
 * C ref: iactions.c MAYBETWOWEAPON — TWOWEAPOK && !bimanual.
 * Local #define in itemactions; do not clone TWOWEAPOK/bimanual.
 */
function MAYBETWOWEAPON(obj) {
    return TWOWEAPOK(obj) && !bimanual(obj);
}

/**
 * C ref: iactions.c itemactions — NHW_MENU PICK_ONE of context actions.
 * Named omissions: W already-wearing `armor_simple_name`;
 * dungeon.c `surface` terrain nouns (ROOM → "floor" here, matching
 * the four existing `surface` stubs). `cantwield` skip of `'w'`.
 * O/T/V pushkeys are D-1665. Unwield/name/eat/engrave are D-1675.
 * Shop pay is D-1676. Two-weapon `'X'` is D-1677. Rub/swap/whatis
 * pushkeys are D-1686.
 */
export async function itemactions(otmp) {
    if (!otmp) return ECMD_OK;
    const u = game.u || {};
    const already_worn = ((otmp.owornmask || 0) & (W_ARMOR | W_ACCESSORY)) !== 0;
    const light = otmp.lamplit ? 'Extinguish' : 'Light';
    const items = []; // { act, let, text }

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

    // a: apply — C iactions.c `:309–400` otyp catalogue (order matters)
    const ocl_a = game.objects?.[otmp.otyp] || objects[otmp.otyp];
    if (otmp.oclass === COIN_CLASS) {
        add(IA_APPLY_OBJ, 'a', 'Flip a coin');
    } else if (otmp.otyp === CREAM_PIE) {
        add(IA_APPLY_OBJ, 'a', 'Hit yourself with this cream pie');
    } else if (otmp.otyp === BULLWHIP) {
        add(IA_APPLY_OBJ, 'a', 'Lash out with this whip');
    } else if (otmp.otyp === GRAPPLING_HOOK) {
        add(IA_APPLY_OBJ, 'a', 'Grapple something with this hook');
    } else if (otmp.otyp === BAG_OF_TRICKS && ocl_a?.oc_name_known) {
        add(IA_APPLY_OBJ, 'a', 'Reach into this bag');
    } else if (Is_container(otmp)) {
        add(IA_APPLY_OBJ, 'a', 'Open this container');
    } else if (otmp.otyp === CAN_OF_GREASE) {
        add(IA_APPLY_OBJ, 'a', 'Use the can to grease an item');
    } else if (otmp.otyp === LOCK_PICK
        || otmp.otyp === CREDIT_CARD
        || otmp.otyp === SKELETON_KEY) {
        add(IA_APPLY_OBJ, 'a', 'Use this tool to pick a lock');
    } else if (otmp.otyp === TINNING_KIT) {
        add(IA_APPLY_OBJ, 'a', 'Use this kit to tin a corpse');
    } else if (otmp.otyp === LEASH) {
        add(IA_APPLY_OBJ, 'a', 'Tie a pet to this leash');
    } else if (otmp.otyp === SADDLE) {
        add(IA_APPLY_OBJ, 'a', 'Place this saddle on a pet');
    } else if (otmp.otyp === MAGIC_WHISTLE || otmp.otyp === TIN_WHISTLE) {
        add(IA_APPLY_OBJ, 'a', 'Blow this whistle');
    } else if (otmp.otyp === EUCALYPTUS_LEAF) {
        add(IA_APPLY_OBJ, 'a', 'Use this leaf as a whistle');
    } else if (otmp.otyp === STETHOSCOPE) {
        add(IA_APPLY_OBJ, 'a', 'Listen through the stethoscope');
    } else if (otmp.otyp === MIRROR) {
        add(IA_APPLY_OBJ, 'a', 'Show something its reflection');
    } else if (otmp.otyp === BELL || otmp.otyp === BELL_OF_OPENING) {
        add(IA_APPLY_OBJ, 'a', 'Ring the bell');
    } else if (otmp.otyp === CANDELABRUM_OF_INVOCATION) {
        add(IA_APPLY_OBJ, 'a', `${light} the candelabrum`);
    } else if (otmp.otyp === WAX_CANDLE || otmp.otyp === TALLOW_CANDLE) {
        const multiple = (otmp.quan ?? 1) !== 1;
        const s = multiple ? 'these' : 'this';
        const { carrying } = await import('./hack.js');
        const o = carrying(CANDELABRUM_OF_INVOCATION);
        if (o && (o.spe | 0) < 7) {
            add(
                IA_APPLY_OBJ,
                'a',
                `Attach ${s} to your candelabrum, or ${!otmp.lamplit ? 'light' : 'extinguish'} ${multiple ? 'them' : 'it'}`,
            );
        } else {
            add(IA_APPLY_OBJ, 'a', `${light} ${s} ${simpleonames(otmp)}`);
        }
    } else if (otmp.otyp === OIL_LAMP || otmp.otyp === MAGIC_LAMP
        || otmp.otyp === BRASS_LANTERN) {
        add(IA_APPLY_OBJ, 'a', `${light} this light source`);
    } else if (otmp.otyp === POT_OIL && ocl_a?.oc_name_known) {
        add(IA_APPLY_OBJ, 'a', `${light} this oil`);
    } else if (otmp.oclass === POTION_CLASS) {
        add(
            IA_DIP_OBJ,
            'a',
            `Dip something into ${is_plural(otmp) ? 'one of these' : 'this'} potion${(otmp.quan ?? 1) === 1 ? '' : 's'}`,
        );
    } else if (otmp.otyp === EXPENSIVE_CAMERA) {
        add(IA_APPLY_OBJ, 'a', 'Take a photograph');
    } else if (otmp.otyp === TOWEL) {
        add(IA_APPLY_OBJ, 'a', 'Clean yourself off with this towel');
    } else if (otmp.otyp === CRYSTAL_BALL) {
        add(IA_APPLY_OBJ, 'a', 'Peer into this crystal ball');
    } else if (otmp.otyp === MAGIC_MARKER) {
        add(IA_APPLY_OBJ, 'a', 'Write on something with this marker');
    } else if (otmp.otyp === FIGURINE) {
        add(IA_APPLY_OBJ, 'a', 'Make this figurine transform');
    } else if (otmp.otyp === UNICORN_HORN) {
        add(IA_APPLY_OBJ, 'a', 'Use this unicorn horn');
    } else if (otmp.otyp === HORN_OF_PLENTY && ocl_a?.oc_name_known) {
        add(IA_APPLY_OBJ, 'a', 'Blow into the horn of plenty');
    } else if (otmp.otyp >= WOODEN_FLUTE && otmp.otyp <= DRUM_OF_EARTHQUAKE) {
        add(IA_APPLY_OBJ, 'a', 'Play this musical instrument');
    } else if (otmp.otyp === LAND_MINE || otmp.otyp === BEARTRAP) {
        add(IA_APPLY_OBJ, 'a', 'Arm this trap');
    } else if (otmp.otyp === PICK_AXE || otmp.otyp === DWARVISH_MATTOCK) {
        add(IA_APPLY_OBJ, 'a', 'Dig with this digging tool');
    } else if (otmp.oclass === WAND_CLASS) {
        add(IA_APPLY_OBJ, 'a', 'Break this wand');
    }

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

    // e: eat — C iactions.c `:417–427` tin then is_edible
    if (otmp.otyp === TIN) {
        const withOpener = u.uwep && u.uwep.otyp === TIN_OPENER
            ? ' with your tin opener' : '';
        add(
            IA_EAT_OBJ,
            'e',
            `Open ${(otmp.quan || 1) > 1 ? 'one of these tins' : 'this tin'}${withOpener} and eat the contents`,
        );
    } else {
        const { is_edible } = await import('./eat.js');
        if (is_edible(otmp)) {
            add(
                IA_EAT_OBJ,
                'e',
                `Eat ${(otmp.quan || 1) > 1 ? 'one of these' : 'this'}`,
            );
        }
    }

    // E: engrave — C iactions.c `:429–445` is_blade / wand / oc_tough
    if (otmp.otyp === TOWEL) {
        add(IA_ENGRAVE_OBJ, 'E', 'Wipe the floor with this towel');
    } else if (otmp.otyp === MAGIC_MARKER) {
        add(IA_ENGRAVE_OBJ, 'E', 'Scribble graffiti on the floor');
    } else if (
        otmp.oclass === WEAPON_CLASS || otmp.oclass === WAND_CLASS
        || otmp.oclass === GEM_CLASS || otmp.oclass === RING_CLASS
    ) {
        const ocl_e = game.objects?.[otmp.otyp] || objects[otmp.otyp];
        const skill = ocl_e?.oc_skill | 0;
        /* C obj.h is_blade: WEAPON_CLASS && P_DAGGER..P_SABER. Inline the
           macro at this one site; objects.js is_blade stays the export. */
        const blade = otmp.oclass === WEAPON_CLASS
            && skill >= P_DAGGER && skill <= P_SABER;
        const verb = (blade || otmp.oclass === WAND_CLASS
            || ((otmp.oclass === GEM_CLASS || otmp.oclass === RING_CLASS)
                && ocl_e?.oc_tough)) ? 'Engrave' : 'Write';
        /* dungeon.c surface: ROOM → "floor"; full terrain is the four
           existing stubs (always "floor"). Do not add clone #5. */
        add(
            IA_ENGRAVE_OBJ,
            'E',
            `${verb} on the floor with ${(otmp.quan ?? 1) > 1 ? 'one of these items' : 'this item'}`,
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

    // i / I: adjust — gold only when check_invent_gold (C `:462–470`)
    if (otmp.oclass !== COIN_CLASS || await check_invent_gold('item-action')) {
        add(IA_ADJUST_OBJ, 'i', 'Adjust inventory by assigning new letter');
    }
    if ((otmp.quan || 1) > 1 && otmp.oclass !== COIN_CLASS) {
        add(IA_ADJUST_STACK, 'I', 'Adjust inventory by splitting this stack');
    }

    // O: offer — C iactions.c `:472–483`
    const loc = game.level?.at(u.ux, u.uy);
    if (IS_ALTAR(loc?.typ) && !u.uswallow) {
        if (otmp.otyp === CORPSE) {
            add(IA_SACRIFICE, 'O',
                'Offer this corpse as a sacrifice at this altar');
        } else if (otmp.otyp === AMULET_OF_YENDOR
            || otmp.otyp === FAKE_AMULET_OF_YENDOR) {
            add(IA_SACRIFICE, 'O',
                'Offer this amulet as a sacrifice at this altar');
        }
    }

    // p: pay unpaid — C iactions.c `:485–494`
    if (otmp.unpaid) {
        const { shop_keeper, inhishop } = await import('./shk.js');
        const { in_rooms } = await import('./hack.js');
        const mtmp = shop_keeper(in_rooms(u.ux, u.uy, SHOPBASE));
        if (mtmp && inhishop(mtmp)) {
            add(
                IA_BUY_OBJ,
                'p',
                `Buy this unpaid ${(otmp.quan || 1) > 1 ? 'stack' : 'item'}`,
            );
        }
    }

    // P: put on accessory
    if (!already_worn) {
        let buf = '';
        if (otmp.oclass === AMULET_CLASS) {
            buf = !u.uamul ? 'Put this amulet on' : '[already wearing an amulet]';
        } else if (otmp.oclass === RING_CLASS || otmp.otyp === MEAT_RING) {
            buf = (!u.uleft || !u.uright)
                ? 'Put this ring on'
                : `[both ring ${makeplural(body_part(FINGER))} in use]`;
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

    // w: wield — C iactions.c `:606–630` skip uwep / cantwield named
    if (otmp === u.uwep) {
        /* already wielded — skip. cantwield(youmonst.data) named omit. */
    } else if (
        otmp.oclass === WEAPON_CLASS || is_weptool(otmp)
        || (otmp.otyp === TOWEL && (otmp.spe | 0) > 0) /* is_wet_towel */
        || otmp.otyp === HEAVY_IRON_BALL
    ) {
        add(
            IA_WIELD_OBJ,
            'w',
            `Wield this ${(otmp.quan ?? 1) > 1 ? 'stack' : 'item'} as your weapon`,
        );
    } else if (otmp.otyp === TIN_OPENER) {
        add(IA_WIELD_OBJ, 'w', 'Wield the tin opener to easily open tins');
    } else if (!already_worn) {
        add(
            IA_WIELD_OBJ,
            'w',
            `Wield this ${(otmp.quan ?? 1) > 1 ? 'stack' : 'item'} in your ${makeplural(body_part(HAND))}`,
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

    /* X: Toggle two-weapon — C iactions.c `:653–682`. Based on
       TWOWEAPOK; do not call can_twoweapon (verbose). Toggle-off
       skips the filter. */
    if (
        (otmp === u.uwep || otmp === u.uswapwep)
        && (u.twoweap
            || (could_twoweap(game.youmonst?.data) && !u.uarms
                && u.uwep && MAYBETWOWEAPON(u.uwep)
                && u.uswapwep && MAYBETWOWEAPON(u.uswapwep)))
    ) {
        add(
            IA_TWOWEAPON,
            'X',
            `Toggle two-weapon combat ${u.twoweap ? 'off' : 'on'}`,
        );
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
    // C windows.c select_menu `:1858–1863` gb.bot_disabled; wintty.c
    // process_menu_window `:1329–1768` loops on tty_nhgetch without
    // redraw on an unhandled key (default: tty_nhbell). Corner cl_end
    // from offx; leftover WIN_STATUS stays. D-0467 fullscreen blank
    // is `_statusSuppressed`, not a per-key docrt/cls.
    const entries = [
        { text: prompt, attr: ATR_INVERSE },
        { text: '', attr: 0 },
        ...items.map((it) => ({ text: it.text, attr: 0 })),
    ];
    const _botPrev = set_bot_disabled(true);
    try {
        await paint_corner_nhw_menu(entries, '(end) ');
        await flush_screen(1);
        for (;;) {
            const key = await nhgetch();
            const ch = String.fromCharCode(key);
            // C process_menu_window MENU_SEARCH `:1698–1731` before dismiss.
            if (ch === MENU_SEARCH) {
                const searchItems = items.map((it) => ({
                    selectable: true,
                    selector: it.let,
                    menuStr: it.text,
                    act: it.act,
                }));
                const res = await process_menu_search(searchItems, PICK_ONE);
                if (res.kind === 'finish' && res.item) {
                    await dismiss_nhw_menu();
                    await itemactions_pushkeys(res.item.act, otmp);
                    return ECMD_OK;
                }
                continue;
            }
            if (key === 27 || key === 13 || key === 10 || key === 32) {
                await dismiss_nhw_menu();
                return ECMD_OK;
            }
            if (byLet.has(ch)) {
                await dismiss_nhw_menu();
                await itemactions_pushkeys(byLet.get(ch).act, otmp);
                return ECMD_OK;
            }
            // C process_menu_window default: tty_nhbell(); page_start stays.
            tty_nhbell();
        }
    } finally {
        set_bot_disabled(_botPrev);
    }
}

/**
 * C ref: invent.c dispinv_with_action.
 * use_inuse_ordering → flags.sortloot='i' + optional Accessories alt_label;
 * menumode = (len != 1 || menu_requested); force_invmenu FALSE during menu.
 */
export async function dispinv_with_action(
    lets = null,
    use_inuse_ordering = false,
    alt_label = null,
) {
    const flags = game.flags || (game.flags = {});
    const iflags = game.iflags || (game.iflags = {});
    const save_sortloot = flags.sortloot;
    const save_accessories = inuse_headers_accessories();
    const save_force_invmenu = iflags.force_invmenu;
    if (use_inuse_ordering) {
        flags.sortloot = 'i';
        if (alt_label) inuse_headers_set_accessories(alt_label);
    }
    iflags.force_invmenu = false;
    const len = lets ? lets.length : 0;
    const menumode = (len !== 1 || !!iflags.menu_requested);
    try {
        const { display_pickinv_reply } = await import('./invent.js');
        const c = await display_pickinv_reply(
            lets == null ? null : lets,
            null,
            null,
            { want_reply: menumode },
        );
        if (c && c !== '\x1b') {
            const otmp = (game.invent || []).find((o) => o && o.invlet === c);
            if (otmp) await itemactions(otmp);
        }
    } finally {
        if (use_inuse_ordering) {
            flags.sortloot = save_sortloot;
            inuse_headers_set_accessories(save_accessories);
        }
        iflags.force_invmenu = save_force_invmenu;
    }
    return ECMD_OK;
}
