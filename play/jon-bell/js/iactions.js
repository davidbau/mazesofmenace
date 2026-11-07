// iactions.js — C ref: iactions.c.
import { ARMOR_DATA } from './armor_data.js';
import { FINGER, GETOBJ_SUGGEST, HAND, IA_ADJUST_OBJ, IA_ADJUST_STACK, IA_APPLY_OBJ, IA_BUY_OBJ, IA_DIP_OBJ, IA_DROP_OBJ, IA_EAT_OBJ, IA_ENGRAVE_OBJ, IA_FIRE_OBJ, IA_INVOKE_OBJ, IA_NAME_OBJ, IA_NAME_OTYP, IA_NONE, IA_QUAFF_OBJ, IA_QUIVER_OBJ, IA_READ_OBJ, IA_RUB_OBJ, IA_SACRIFICE, IA_SWAPWEAPON, IA_TAKEOFF_OBJ, IA_THROW_OBJ, IA_TIP_CONTAINER, IA_TWOWEAPON, IA_UNWIELD, IA_WEAR_OBJ, IA_WHATIS_OBJ, IA_WIELD_OBJ, IA_ZAP_OBJ, OCLASS_ARMOR, OCLASS_COIN, OCLASS_GEM, OCLASS_POTION, OCLASS_RING, OCLASS_SCROLL, OCLASS_SPBOOK, OCLASS_WAND, OCLASS_WEAPON, SPE_NOVEL_OTYP, W_AMUL_C, W_ARMC_C, W_ARMF_C, W_ARMG_C, W_ARMH_C, W_ARMS_C, W_ARMU_C, W_ARM_C, W_RINGL_C, W_RINGR_C, W_TOOL_C, _IA_ALCHEMY_SMOCK_OTYP, _IA_BAG_OF_TRICKS_OTYP, _IA_BEARTRAP_OTYP, _IA_BELL_OF_OPENING_OTYP, _IA_BELL_OTYP, _IA_BLINDFOLD_OTYP, _IA_BRASS_LANTERN_OTYP, _IA_BULLWHIP_OTYP, _IA_CANDELABRUM_OTYP, _IA_CAN_OF_GREASE_OTYP, _IA_CREAM_PIE_OTYP, _IA_CREDIT_CARD_OTYP, _IA_CRYSTAL_BALL_OTYP, _IA_DRUM_OF_EARTHQUAKE_OTYP, _IA_DWARVISH_MATTOCK_OTYP, _IA_EUCALYPTUS_LEAF_OTYP, _IA_EXPENSIVE_CAMERA_OTYP, _IA_FIGURINE_OTYP, _IA_FORTUNE_COOKIE_OTYP, _IA_GRAPPLING_HOOK_OTYP, _IA_HAWAIIAN_SHIRT_OTYP, _IA_HEAVY_IRON_BALL_OTYP, _IA_HORN_OF_PLENTY_OTYP, _IA_LAND_MINE_OTYP, _IA_LARGE_BOX_OTYP, _IA_LEASH_OTYP, _IA_LENSES_OTYP, _IA_LOCK_PICK_OTYP, _IA_MAGIC_LAMP_OTYP, _IA_MAGIC_MARKER_OTYP, _IA_MAGIC_WHISTLE_OTYP, _IA_MEAT_RING_OTYP, _IA_MIRROR_OTYP, _IA_OIL_LAMP_OTYP, _IA_PICK_AXE_OTYP, _IA_POT_OIL_OTYP, _IA_SADDLE_OTYP, _IA_SCR_BLANK_PAPER_OTYP, _IA_SCR_MAIL_OTYP, _IA_SKELETON_KEY_OTYP, _IA_SPE_BLANK_PAPER_OTYP, _IA_SPE_BOOK_OF_THE_DEAD_OTYP, _IA_STETHOSCOPE_OTYP, _IA_TALLOW_CANDLE_OTYP, _IA_TINNING_KIT_OTYP, _IA_TIN_OPENER_OTYP, _IA_TIN_OTYP, _IA_TIN_WHISTLE_OTYP, _IA_TOWEL_OTYP, _IA_T_SHIRT_OTYP, _IA_UNICORN_HORN_OTYP, _IA_WAX_CANDLE_OTYP, _IA_WOODEN_FLUTE_OTYP, _OCLASS_AMULET, _hero_youmonst, _levlAt, _wt_cantwield, ammo_and_launcher, bimanual_tw, body_part, carrying, cmdq_add_ec, cmdq_add_key, could_twoweap, impossible, is_ammo, is_blade, is_graystone, is_launcher, is_missile, is_plural_obj, is_weptool, set_cursor, singular_xname, surface } from './cmd.js';
import { build_window_screen, menu_search_case } from './com_pager.js';
import { CQ_CANNED, ECMD_OK, HANDS_SYM, Has_contents, IS_ALTAR, ONAME, PICK_ONE, ROOMOFFSET, SHOPBASE, has_oname } from './const.js';
import { ia_checkfile } from './pager.js';
import { _threeStatusLines, await_menu_key, docorner_blank_utf8_captures, docrt, flush_screen, force_more } from './display.js';
import { call_ok, name_ok } from './do_name.js';
import { is_edible } from './eat.js';
import { game } from './gstate.js';
import { object_tough } from './o_init.js';
import { cxname as _ia_cxname, simpleonames as _ia_simpleonames, the as _the_objnam, an, armor_simple_name, makeplural as makeplural_objnam, the_unique_obj } from './objnam.js';
import { inhishop as shk_inhishop, shop_keeper as shk_shop_keeper } from './shk.js';
import { in_rooms as shk_in_rooms } from './hack.js';
import { menu_heading_text } from './tty_menu.js';

/* C obj.h Is_container(o): LARGE_BOX <= otyp <= BAG_OF_TRICKS. */
function _ia_is_container(o) {
    const t = o.otyp | 0;
    return t >= _IA_LARGE_BOX_OTYP && t <= _IA_BAG_OF_TRICKS_OTYP;
}

// C iactions.c:itemactions_pushkeys. Function-pointer arguments use the same
// symbolic C identities as cmdq_add_ec and the shared command dispatcher.
// This produces input for a later rhack; it never performs the action itself.
export function itemactions_pushkeys(otmp, act) {
    switch (act) {
    default:
        impossible('Unknown item action %d', act);
        break;
    case IA_NONE:
        break;
    case IA_UNWIELD:
        cmdq_add_ec(CQ_CANNED, otmp === game.u.uwep ? 'dowield'
            : otmp === game.u.uswapwep ? 'remarm_swapwep'
            : otmp === game.u.uquiver ? 'dowieldquiver'
            : 'donull');
        cmdq_add_key(CQ_CANNED, HANDS_SYM);
        break;
    case IA_APPLY_OBJ:
        cmdq_add_ec(CQ_CANNED, 'doapply');
        cmdq_add_key(CQ_CANNED, otmp.invlet);
        break;
    case IA_DIP_OBJ:
        cmdq_add_ec(CQ_CANNED, 'dip_into');
        cmdq_add_key(CQ_CANNED, otmp.invlet);
        break;
    case IA_NAME_OBJ:
    case IA_NAME_OTYP:
        cmdq_add_ec(CQ_CANNED, 'docallcmd');
        cmdq_add_key(CQ_CANNED, (act === IA_NAME_OBJ) ? 'i' : 'o');
        cmdq_add_key(CQ_CANNED, otmp.invlet);
        break;
    case IA_DROP_OBJ:
        cmdq_add_ec(CQ_CANNED, 'dodrop');
        cmdq_add_key(CQ_CANNED, otmp.invlet);
        break;
    case IA_EAT_OBJ:
        cmdq_add_ec(CQ_CANNED, 'do_reqmenu');
        cmdq_add_ec(CQ_CANNED, 'doeat');
        cmdq_add_key(CQ_CANNED, otmp.invlet);
        break;
    case IA_ENGRAVE_OBJ:
        cmdq_add_ec(CQ_CANNED, 'doengrave');
        cmdq_add_key(CQ_CANNED, otmp.invlet);
        break;
    case IA_FIRE_OBJ:
        cmdq_add_ec(CQ_CANNED, 'dofire');
        break;
    case IA_ADJUST_OBJ:
        cmdq_add_ec(CQ_CANNED, 'doorganize');
        cmdq_add_key(CQ_CANNED, otmp.invlet);
        break;
    case IA_ADJUST_STACK:
        cmdq_add_ec(CQ_CANNED, 'adjust_split');
        cmdq_add_key(CQ_CANNED, otmp.invlet);
        break;
    case IA_SACRIFICE:
        cmdq_add_ec(CQ_CANNED, 'dosacrifice');
        cmdq_add_key(CQ_CANNED, otmp.invlet);
        break;
    case IA_BUY_OBJ:
        cmdq_add_ec(CQ_CANNED, 'dopay');
        cmdq_add_key(CQ_CANNED, otmp.invlet);
        break;
    case IA_QUAFF_OBJ:
        // m-prefix: ignore a fountain or sink and drink from inventory.
        cmdq_add_ec(CQ_CANNED, 'do_reqmenu');
        cmdq_add_ec(CQ_CANNED, 'dodrink');
        cmdq_add_key(CQ_CANNED, otmp.invlet);
        break;
    case IA_QUIVER_OBJ:
        cmdq_add_ec(CQ_CANNED, 'dowieldquiver');
        cmdq_add_key(CQ_CANNED, otmp.invlet);
        break;
    case IA_READ_OBJ:
        cmdq_add_ec(CQ_CANNED, 'doread');
        cmdq_add_key(CQ_CANNED, otmp.invlet);
        break;
    case IA_RUB_OBJ:
        cmdq_add_ec(CQ_CANNED, 'dorub');
        cmdq_add_key(CQ_CANNED, otmp.invlet);
        break;
    case IA_THROW_OBJ:
        cmdq_add_ec(CQ_CANNED, 'dothrow');
        cmdq_add_key(CQ_CANNED, otmp.invlet);
        break;
    case IA_TAKEOFF_OBJ:
        cmdq_add_ec(CQ_CANNED, 'ia_dotakeoff'); // #altdotakeoff
        cmdq_add_key(CQ_CANNED, otmp.invlet);
        break;
    case IA_TIP_CONTAINER:
        cmdq_add_ec(CQ_CANNED, 'do_reqmenu');
        cmdq_add_ec(CQ_CANNED, 'dotip');
        cmdq_add_key(CQ_CANNED, otmp.invlet);
        break;
    case IA_INVOKE_OBJ:
        cmdq_add_ec(CQ_CANNED, 'doinvoke');
        cmdq_add_key(CQ_CANNED, otmp.invlet);
        break;
    case IA_WIELD_OBJ:
        cmdq_add_ec(CQ_CANNED, 'dowield');
        cmdq_add_key(CQ_CANNED, otmp.invlet);
        break;
    case IA_WEAR_OBJ:
        cmdq_add_ec(CQ_CANNED, 'dowear');
        cmdq_add_key(CQ_CANNED, otmp.invlet);
        break;
    case IA_SWAPWEAPON:
        cmdq_add_ec(CQ_CANNED, 'doswapweapon');
        break;
    case IA_TWOWEAPON:
        cmdq_add_ec(CQ_CANNED, 'dotwoweapon');
        break;
    case IA_ZAP_OBJ:
        cmdq_add_ec(CQ_CANNED, 'dozap');
        cmdq_add_key(CQ_CANNED, otmp.invlet);
        break;
    case IA_WHATIS_OBJ:
        cmdq_add_ec(CQ_CANNED, 'dowhatis');
        cmdq_add_key(CQ_CANNED, 'i');
        cmdq_add_key(CQ_CANNED, otmp.invlet);
        break;
    }
}

// C ref: iactions.c:278 itemactions(struct obj *otmp).
// priorWinCol: WIN_COL of the inventory menu we were invoked from (if any);
// used to clip status line 1 to the corner-clear column the inventory dismiss
// left behind (C tty docorner xmin = priorWinCol-1 → keep priorWinCol-2 cols).
export async function itemactions(otmp, priorWinCol, priorWinRows) {
    const g = game;
    // Window-port carryover belongs to the dismissed window, not to the
    // inventory command's arguments. Legacy callers can still pass it here.
    priorWinCol ??= g._pickinv_window?.WIN_COL;
    priorWinRows ??= g._pickinv_window?.winRows;
    const u = g.u || {};
    const oclass = otmp.oclass | 0;
    const otyp = (typeof otmp.otyp === 'number') ? (otmp.otyp | 0) : null;
    const quan = (otmp.quan ?? 1) | 0;
    const mask = otmp.owornmask | 0;
    /* C ref: iactions.c:286 already_worn = owornmask & (W_ARMOR | W_ACCESSORY).
     * W_ARMOR = all armor slots; W_ACCESSORY = amulet|ring|eyewear-tool
     * (obj.h W_ACCESSORY = W_RING | W_AMUL | W_TOOL, W_RING = both fingers).
     * This read `W_ACCESSORY = W_QUIVER_C` under a "placeholder; refined below"
     * comment and was never refined, so a WORN amulet/ring/blindfold counted as
     * not-worn and kept the 'd'/'t'/'w' rows C suppresses for it. */
    const W_ARMOR_MASK = W_ARM_C | W_ARMC_C | W_ARMH_C | W_ARMS_C | W_ARMG_C | W_ARMF_C | W_ARMU_C;
    const W_ACCESSORY_MASK = W_RINGL_C | W_RINGR_C | W_AMUL_C | W_TOOL_C;
    const already_worn = (mask & (W_ARMOR_MASK | W_ACCESSORY_MASK)) !== 0;
    const is_uwep = (otmp === u.uwep);
    const is_uquiver = (otmp === u.uquiver);
    const is_uswapwep = (otmp === u.uswapwep);

    /* Each entry: { let: accelerator char, act: action id, txt: menu text }.
     * The action ids drive itemactions_pushkeys dispatch below. */
    const menu = [];
    const add = (ch, act, txt) => menu.push({ let: ch, act, txt });

    /* -: unwield / un-ready (iactions.c:290-306).  Offered for the wielded,
     *    alternate-wielded or quivered item; picking it queues 'w-' / 'Q-'.
     *        verb   = uquiver ? "Quiver" : "Wield"
     *        action = uquiver ? "un-ready" : "un-wield"
     *        which  = is_plural ? "these" : "this"
     *        what   = (WEAPON_CLASS || is_weptool) ? "weapon" : "item", pluralised
     *        "%s '%c' to %s %s %s"  with HANDS_SYM == '-' */
    if (is_uwep || is_uswapwep || is_uquiver) {
        const _verb = is_uquiver ? 'Quiver' : 'Wield';
        const _action = is_uquiver ? 'un-ready' : 'un-wield';
        const _which = is_plural_obj(otmp) ? 'these' : 'this';
        const _what = (oclass === OCLASS_WEAPON || is_weptool(otmp)) ? 'weapon' : 'item';
        add('-', IA_UNWIELD,
            `${_verb} '-' to ${_action} ${_which} `
            + `${is_plural_obj(otmp) ? makeplural_objnam(_what) : _what}`);
    }

    /* a: apply / break / dip (iactions.c:308-394).  C's chain is a single
     * if/else-if ladder, so ORDER is load-bearing: BAG_OF_TRICKS-when-discovered
     * outranks the generic container arm, POT_OIL-when-discovered outranks the
     * generic potion dip, and an unrecognised tool falls out with NO 'a' row.
     * Ported ladder-for-ladder rather than as a lookup so that stays true. */
    const _ia_light = otmp.lamplit ? 'Extinguish' : 'Light';
    const _ia_known = (t) => !!(g._oc_name_known && g._oc_name_known[t | 0]);
    if (oclass === OCLASS_COIN) {
        add('a', IA_APPLY_OBJ, 'Flip a coin');
    } else if (otyp === _IA_CREAM_PIE_OTYP) {
        add('a', IA_APPLY_OBJ, 'Hit yourself with this cream pie');
    } else if (otyp === _IA_BULLWHIP_OTYP) {
        add('a', IA_APPLY_OBJ, 'Lash out with this whip');
    } else if (otyp === _IA_GRAPPLING_HOOK_OTYP) {
        add('a', IA_APPLY_OBJ, 'Grapple something with this hook');
    } else if (otyp === _IA_BAG_OF_TRICKS_OTYP && _ia_known(otyp)) {
        add('a', IA_APPLY_OBJ, 'Reach into this bag');
    } else if (_ia_is_container(otmp)) {
        add('a', IA_APPLY_OBJ, 'Open this container');
    } else if (otyp === _IA_CAN_OF_GREASE_OTYP) {
        add('a', IA_APPLY_OBJ, 'Use the can to grease an item');
    } else if (otyp === _IA_LOCK_PICK_OTYP || otyp === _IA_CREDIT_CARD_OTYP
               || otyp === _IA_SKELETON_KEY_OTYP) {
        add('a', IA_APPLY_OBJ, 'Use this tool to pick a lock');
    } else if (otyp === _IA_TINNING_KIT_OTYP) {
        add('a', IA_APPLY_OBJ, 'Use this kit to tin a corpse');
    } else if (otyp === _IA_LEASH_OTYP) {
        add('a', IA_APPLY_OBJ, 'Tie a pet to this leash');
    } else if (otyp === _IA_SADDLE_OTYP) {
        add('a', IA_APPLY_OBJ, 'Place this saddle on a pet');
    } else if (otyp === _IA_MAGIC_WHISTLE_OTYP || otyp === _IA_TIN_WHISTLE_OTYP) {
        add('a', IA_APPLY_OBJ, 'Blow this whistle');
    } else if (otyp === _IA_EUCALYPTUS_LEAF_OTYP) {
        add('a', IA_APPLY_OBJ, 'Use this leaf as a whistle');
    } else if (otyp === _IA_STETHOSCOPE_OTYP) {
        add('a', IA_APPLY_OBJ, 'Listen through the stethoscope');
    } else if (otyp === _IA_MIRROR_OTYP) {
        add('a', IA_APPLY_OBJ, 'Show something its reflection');
    } else if (otyp === _IA_BELL_OTYP || otyp === _IA_BELL_OF_OPENING_OTYP) {
        add('a', IA_APPLY_OBJ, 'Ring the bell');
    } else if (otyp === _IA_CANDELABRUM_OTYP) {
        add('a', IA_APPLY_OBJ, `${_ia_light} the candelabrum`);
    } else if (otyp === _IA_WAX_CANDLE_OTYP || otyp === _IA_TALLOW_CANDLE_OTYP) {
        const _multiple = quan !== 1;
        const _s = _multiple ? 'these' : 'this';
        const _cand = carrying(_IA_CANDELABRUM_OTYP);
        add('a', IA_APPLY_OBJ, (_cand && (_cand.spe | 0) < 7)
            ? `Attach ${_s} to your candelabrum, or `
              + `${!otmp.lamplit ? 'light' : 'extinguish'} ${_multiple ? 'them' : 'it'}`
            : `${_ia_light} ${_s} ${_ia_simpleonames(otmp)}`);
    } else if (otyp === _IA_OIL_LAMP_OTYP || otyp === _IA_MAGIC_LAMP_OTYP
               || otyp === _IA_BRASS_LANTERN_OTYP) {
        add('a', IA_APPLY_OBJ, `${_ia_light} this light source`);
    } else if (otyp === _IA_POT_OIL_OTYP && _ia_known(otyp)) {
        add('a', IA_APPLY_OBJ, `${_ia_light} this oil`);
    } else if (oclass === OCLASS_POTION) {
        /* C: "Dip something into %s potion%s", is_plural ? "one of these"
         *    : "this", plur(quan) */
        add('a', IA_DIP_OBJ,
            `Dip something into ${is_plural_obj(otmp) ? 'one of these' : 'this'} `
            + `potion${quan !== 1 ? 's' : ''}`);
    } else if (otyp === _IA_EXPENSIVE_CAMERA_OTYP) {
        add('a', IA_APPLY_OBJ, 'Take a photograph');
    } else if (otyp === _IA_TOWEL_OTYP) {
        add('a', IA_APPLY_OBJ, 'Clean yourself off with this towel');
    } else if (otyp === _IA_CRYSTAL_BALL_OTYP) {
        add('a', IA_APPLY_OBJ, 'Peer into this crystal ball');
    } else if (otyp === _IA_MAGIC_MARKER_OTYP) {
        add('a', IA_APPLY_OBJ, 'Write on something with this marker');
    } else if (otyp === _IA_FIGURINE_OTYP) {
        add('a', IA_APPLY_OBJ, 'Make this figurine transform');
    } else if (otyp === _IA_UNICORN_HORN_OTYP) {
        add('a', IA_APPLY_OBJ, 'Use this unicorn horn');
    } else if (otyp === _IA_HORN_OF_PLENTY_OTYP && _ia_known(otyp)) {
        add('a', IA_APPLY_OBJ, 'Blow into the horn of plenty');
    } else if (otyp !== null && otyp >= _IA_WOODEN_FLUTE_OTYP
               && otyp <= _IA_DRUM_OF_EARTHQUAKE_OTYP) {
        add('a', IA_APPLY_OBJ, 'Play this musical instrument');
    } else if (otyp === _IA_LAND_MINE_OTYP || otyp === _IA_BEARTRAP_OTYP) {
        add('a', IA_APPLY_OBJ, 'Arm this trap');
    } else if (otyp === _IA_PICK_AXE_OTYP || otyp === _IA_DWARVISH_MATTOCK_OTYP) {
        add('a', IA_APPLY_OBJ, 'Dig with this digging tool');
    } else if (oclass === OCLASS_WAND) {
        add('a', IA_APPLY_OBJ, 'Break this wand');
    }

    if (name_ok(otmp) === GETOBJ_SUGGEST) {
        const _named = has_oname(otmp) && !!ONAME(otmp);
        add('c', IA_NAME_OBJ,
            `${_named ? 'Rename or un-name' : 'Name'} `
            + `${the_unique_obj(otmp) ? 'the'
                 : !is_plural_obj(otmp) ? 'this specific' : 'this stack of'} `
            + `${_ia_simpleonames(otmp)}`);
    }

    // C do_name.c:429-495, iactions.c:68-81: type naming is offered
    // only for a seen, callable appearance which is unknown or already called.
    const calledType = g._oc_uname?.[otyp];
    if (call_ok(otmp) === GETOBJ_SUGGEST) {
        let callname = _ia_simpleonames(otmp);
        if (the_unique_obj(otmp)) callname = _the_objnam(callname);
        else if (!is_plural_obj(otmp)) callname = makeplural_objnam(callname);
        add('C', IA_NAME_OTYP, `${calledType ? 'Re-call or un-call' : 'Call'} the type for ${callname}`);
    }

    /* d: drop (iactions.c:417) — everything not worn. */
    if (!already_worn)
        add('d', IA_DROP_OBJ, `Drop this ${quan > 1 ? 'stack' : 'item'}`);

    /* e: eat (iactions.c:419-428).  C splits the TIN case out ahead of the
     * generic is_edible() arm; the tin text names the wielded tin opener when
     * there is one.  Polymorphed heroes can also eat non-food objects. */
    if (otyp === _IA_TIN_OTYP) {
        const _opener = (u.uwep && (u.uwep.otyp | 0) === _IA_TIN_OPENER_OTYP)
            ? ' with your tin opener' : '';
        add('e', IA_EAT_OBJ,
            `Open ${quan > 1 ? 'one of these tins' : 'this tin'}${_opener}`
            + ' and eat the contents');
    } else if (is_edible(otmp)) {
        add('e', IA_EAT_OBJ, `Eat ${quan > 1 ? 'one of these' : 'this'}`);
    }

    if (otyp === _IA_TOWEL_OTYP) {
        add('E', IA_ENGRAVE_OBJ, 'Wipe the floor with this towel');
    } else if (otyp === _IA_MAGIC_MARKER_OTYP) {
        add('E', IA_ENGRAVE_OBJ, 'Scribble graffiti on the floor');
    } else if (oclass === OCLASS_WEAPON || oclass === OCLASS_WAND
               || oclass === OCLASS_GEM || oclass === OCLASS_RING) {
        const _oc_tough = object_tough(otyp);
        const _verb = (is_blade(otmp) || oclass === OCLASS_WAND
                       || ((oclass === OCLASS_GEM || oclass === OCLASS_RING) && _oc_tough))
            ? 'Engrave' : 'Write';
        add('E', IA_ENGRAVE_OBJ,
            `${_verb} on the ${surface(u.ux | 0, u.uy | 0)} with `
            + `${quan > 1 ? 'one of these items' : 'this item'}`);
    }

    /* f: fire the quivered item (iactions.c:448-460).
     *     Sprintf(buf, "%s %s", shoot ? "Shoot" : "Throw",
     *             (quan > 1) ? "one of these" : "this");
     *     if (shoot) Sprintf(eos(buf), " with your wielded %s", simpleonames(uwep));
     * where shoot = ammo_and_launcher(otmp, uwep). */
    if (is_uquiver) {
        const _shoot = ammo_and_launcher(otmp, u.uwep);
        add('f', IA_FIRE_OBJ,
            `${_shoot ? 'Shoot' : 'Throw'} ${quan > 1 ? 'one of these' : 'this'}`
            + (_shoot ? ` with your wielded ${_ia_simpleonames(u.uwep)}` : ''));
    }

    /* i: #adjust inventory letter (iactions.c:462-466) — everything but gold.
     * (C's gold arm also admits check_invent_gold("item-action"), which can only
     * be true when gold sits in a non-'$' slot; that is unreachable in play.) */
    if (oclass !== OCLASS_COIN)
        add('i', IA_ADJUST_OBJ, 'Adjust inventory by assigning new letter');

    if (quan > 1 && oclass !== OCLASS_COIN)
        add('I', IA_ADJUST_STACK, 'Adjust inventory by splitting this stack');

    /* O: offer sacrifice (iactions.c:474-484) */
    const _iaAlt = _levlAt(u.ux, u.uy);
    if (_iaAlt && IS_ALTAR(_iaAlt.typ) && !u.uswallow) {
        if (otyp === 265 /* CORPSE */)
            add('O', IA_SACRIFICE, 'Offer this corpse as a sacrifice at this altar');
        else if (otyp === 213 /* AMULET_OF_YENDOR */ || otyp === 212 /* FAKE_AMULET_OF_YENDOR */)
            add('O', IA_SACRIFICE, 'Offer this amulet as a sacrifice at this altar');
    }

    /* p: pay for unpaid items (iactions.c:486-494) */
    let _iaShk;
    if (otmp.unpaid
        && (_iaShk = _shopKeeper_useupf(shk_in_rooms(u.ux, u.uy, SHOPBASE)?.[0] | 0)) != null
        && shk_inhishop(_iaShk))
        add('p', IA_BUY_OBJ, `Buy this unpaid ${quan > 1 ? 'stack' : 'item'}`);

    /* P: put on accessory (iactions.c:496-524).  C emits the row
     * even when the slot is FULL -- with a bracketed unavailability text instead
     * of an action -- because "item actions can be used to learn commands"
     * (iactions.c:498-501), so the row's presence is not conditional on the
     * hero being able to do it. */
    if (!already_worn) {
        let _pbuf = '';
        if (oclass === _OCLASS_AMULET) {
            _pbuf = !u.uamul ? 'Put this amulet on' : '[already wearing an amulet]';
        } else if (oclass === OCLASS_RING || otyp === _IA_MEAT_RING_OTYP) {
            _pbuf = (!u.uleft || !u.uright)
                ? 'Put this ring on'
                : `[both ring ${makeplural_objnam(body_part(FINGER))} in use]`;
        } else if (otyp === _IA_BLINDFOLD_OTYP || otyp === _IA_TOWEL_OTYP
                   || otyp === _IA_LENSES_OTYP) {
            if (u.ublindf)
                _pbuf = '[already wearing eyewear]';
            else if (otyp === _IA_LENSES_OTYP)
                _pbuf = 'Put these lenses on';
            else
                _pbuf = `Put this on${otyp === _IA_TOWEL_OTYP ? ' to blindfold yourself' : ''}`;
        }
        if (_pbuf)
            add('P', IA_WEAR_OBJ, _pbuf);
    }

    /* q: quaff (iactions.c:506) — potions. */
    if (oclass === OCLASS_POTION)
        add('q', IA_QUAFF_OBJ, `Quaff (drink) ${quan > 1 ? 'one of these potions' : 'this potion'}`);

    /* Q: quiver a throwable (iactions.c:533-541).
     *     "Quiver this %s for easy %s with 'f'ire",
     *     (quan > 1) ? "stack" : "item",
     *     ammo_and_launcher(otmp, uwep) ? "shooting" : "throwing" */
    if ((oclass === OCLASS_GEM || oclass === OCLASS_WEAPON) && !is_uquiver)
        add('Q', IA_QUIVER_OBJ,
            `Quiver this ${quan > 1 ? 'stack' : 'item'} for easy `
            + `${ammo_and_launcher(otmp, u.uwep) ? 'shooting' : 'throwing'} with 'f'ire`);

    /* r: read (iactions.c:84-124 item_reading_classification).  The four
     * read-a-slogan otyps are checked ahead of the scroll/spellbook classes. */
    if (otyp === _IA_FORTUNE_COOKIE_OTYP) {
        add('r', IA_READ_OBJ, 'Read the message inside this cookie');
    } else if (otyp === _IA_T_SHIRT_OTYP) {
        add('r', IA_READ_OBJ, 'Read the slogan on the shirt');
    } else if (otyp === _IA_ALCHEMY_SMOCK_OTYP) {
        add('r', IA_READ_OBJ, 'Read the slogan on the apron');
    } else if (otyp === _IA_HAWAIIAN_SHIRT_OTYP) {
        add('r', IA_READ_OBJ, 'Look at the pattern on the shirt');
    } else if (oclass === OCLASS_SCROLL) {
        // C iactions.c:97-108; MAIL_STRUCTURES is enabled in global.h.
        const magic = otmp.dknown && otyp !== _IA_SCR_MAIL_OTYP
            && (otyp !== _IA_SCR_BLANK_PAPER_OTYP || !_ia_known(otyp));
        add('r', IA_READ_OBJ, `Read this scroll${magic ? ' to activate its magic' : ''}`);
    } else if (oclass === OCLASS_SPBOOK) {
        // C iactions.c:109-120: only blank paper and the tome require discovery.
        const novel = otyp === SPE_NOVEL_OTYP;
        const blank = otyp === _IA_SPE_BLANK_PAPER_OTYP && _ia_known(otyp);
        const tome = otyp === _IA_SPE_BOOK_OF_THE_DEAD_OTYP && _ia_known(otyp);
        add('r', IA_READ_OBJ,
            `${novel || blank ? 'Read' : tome ? 'Examine' : 'Study'} this `
            + `${novel ? _ia_simpleonames(otmp) : tome ? 'tome' : 'spellbook'}`);
    }

    /* R: remove accessory, or rub a lamp / graystone (iactions.c:547-561). */
    if ((mask & W_ACCESSORY_MASK) !== 0) {
        add('R', IA_TAKEOFF_OBJ,
            `Remove this ${(mask & W_AMUL_C) ? 'amulet'
                : (mask & (W_RINGL_C | W_RINGR_C)) ? 'ring'
                : (mask & W_TOOL_C) ? 'eyewear' : 'accessory'}`);
    }
    if (otyp === _IA_OIL_LAMP_OTYP || otyp === _IA_MAGIC_LAMP_OTYP
        || otyp === _IA_BRASS_LANTERN_OTYP) {
        add('R', IA_RUB_OBJ, `Rub this ${_ia_simpleonames(otmp)}`);
    } else if (oclass === OCLASS_GEM && is_graystone(otmp)) {
        add('R', IA_RUB_OBJ, 'Rub something on this stone');
    }

    /* t: throw (iactions.c:563-587) — everything not worn.
     *     "%s %s%s", shoot ? "Shoot" : "Throw",
     *     quan == 1 ? "this item" : otyp == GOLD_PIECE ? "them" : "one of these",
     *     (otmp == uquiver && (otyp != GOLD_PIECE || quan == 1))
     *       ? " (same as 'f')" : ""
     * This site had neither the Shoot/gold wording nor the "(same as 'f')" tail,
     * which C appends whenever 't' duplicates the 'f' row it now also emits. */
    if (!already_worn) {
        const _shoot = ammo_and_launcher(otmp, u.uwep);
        const _isGold = (oclass === OCLASS_COIN);
        add('t', IA_THROW_OBJ,
            `${_shoot ? 'Shoot' : 'Throw'} `
            + `${quan === 1 ? 'this item' : _isGold ? 'them' : 'one of these'}`
            + `${(is_uquiver && (!_isGold || quan === 1)) ? " (same as 'f')" : ''}`);
    }

    /* C iactions.c:589-595 — take off armor or tip a carried container. */
    if ((mask & W_ARMOR_MASK) !== 0)
        add('T', IA_TAKEOFF_OBJ, 'Take off this armor');
    if ((_ia_is_container(otmp) && (Has_contents(otmp) || !otmp.cknown))
        || (otyp === _IA_HORN_OF_PLENTY_OTYP && (otmp.spe > 0 || !otmp.known)))
        add('T', IA_TIP_CONTAINER, 'Tip all the contents out of this container');

    /* V: invoke (iactions.c:597-605) */
    if ((otyp === 212 /* FAKE_AMULET_OF_YENDOR */ && !otmp.known)
        || (otmp.oartifact | 0) || game._oc_unique?.[otyp]
        || otyp === _IA_CRYSTAL_BALL_OTYP)
        add('V', IA_INVOKE_OBJ, 'Try to invoke a unique power of this object');

    /* w: wield (iactions.c:606-628) — skip if already wielded.  C's
     * "as your weapon" arm is WEAPON_CLASS || is_weptool || is_wet_towel ||
     * HEAVY_IRON_BALL, with a TIN_OPENER arm of its own; this site tested
     * WEAPON_CLASS alone, so a pick-axe or other weptool read "Wield this item
     * in your hands" where C reads "as your weapon".  The trailing body part is
     * makeplural(body_part(HAND)). */
    if (!is_uwep && !_wt_cantwield()) {
        const _hands = makeplural_objnam(body_part(HAND));
        if (oclass === OCLASS_WEAPON || is_weptool(otmp)
            || (otyp === _IA_TOWEL_OTYP && (otmp.spe | 0) > 0)
            || otyp === _IA_HEAVY_IRON_BALL_OTYP) {
            add('w', IA_WIELD_OBJ, `Wield this ${quan > 1 ? 'stack' : 'item'} as your weapon`);
        } else if (otyp === _IA_TIN_OPENER_OTYP) {
            add('w', IA_WIELD_OBJ, 'Wield the tin opener to easily open tins');
        } else if (!already_worn) {
            add('w', IA_WIELD_OBJ,
                `Wield this ${quan > 1 ? 'stack' : 'item'} in your ${_hands}`);
        }
    }

    if (!already_worn && oclass === OCLASS_ARMOR) {
        const armcat = (otyp !== null && ARMOR_DATA[otyp])
            ? (ARMOR_DATA[otyp].armcat | 0) : -1;
        /* worn.c:242 armcat_to_wornmask + worn.c:198 wearmask_to_obj, inlined
         * as the category→slot-object map (ARM_SUIT 0 … ARM_SHIRT 6). */
        const slotObj = [u.uarm, u.uarms, u.uarmh, u.uarmg,
                         u.uarmf, u.uarmc, u.uarmu][armcat] || null;
        add('W', IA_WEAR_OBJ, slotObj
            ? `[already wearing ${an(armor_simple_name(slotObj))}]`
            : 'Wear this armor');
    }

    /* x: swap main and readied weapon (iactions.c:650-660). */
    if (is_uwep && u.uswapwep)
        add('x', IA_SWAPWEAPON, 'Swap this with your alternate weapon');
    else if (is_uwep)
        add('x', IA_SWAPWEAPON, 'Ready this as an alternate weapon');
    else if (is_uswapwep)
        add('x', IA_SWAPWEAPON, 'Swap this with your main weapon');

    /* X: toggle two-weapon combat (iactions.c:662-696).
     *     MAYBETWOWEAPON(o) = (o->oclass == WEAPON_CLASS
     *                            ? !(is_launcher || is_ammo || is_missile)
     *                            : is_weptool(o)) && !bimanual(o)
     *     if ((otmp == uwep || otmp == uswapwep)
     *         && (u.twoweap
     *             || (could_twoweap(youmonst.data) && !uarms
     *                 && uwep && MAYBETWOWEAPON(uwep)
     *                 && uswapwep && MAYBETWOWEAPON(uswapwep)))) */
    if (is_uwep || is_uswapwep) {
        const _maybeTwo = (o) => !!o
            && (((o.oclass | 0) === OCLASS_WEAPON)
                ? !(is_launcher(o) || is_ammo(o) || is_missile(o))
                : is_weptool(o))
            && !bimanual_tw(o);
        if (u.twoweap
            || (could_twoweap(_hero_youmonst().data) && !u.uarms
                && u.uwep && _maybeTwo(u.uwep)
                && u.uswapwep && _maybeTwo(u.uswapwep)))
            add('X', IA_TWOWEAPON,
                `Toggle two-weapon combat ${u.twoweap ? 'off' : 'on'}`);
    }

    /* z: zap (iactions.c:711) — wands. */
    if (oclass === OCLASS_WAND)
        add('z', IA_ZAP_OBJ, 'Zap this wand to release its magic');

    if (ia_checkfile(singular_xname(otmp)))
        add('/', IA_WHATIS_OBJ,
            `Look up information about ${quan > 1 ? 'these' : 'this'}`);

    /* ── Build the menu window (same geometry as doinv) ── */
    const windowLines = [];
    for (const m of menu)
        windowLines.push(`${m.let} - ${m.txt}`.slice(0, 78));
    windowLines.push('(end)');
    /* tty_end_menu (wintty.c:2726-2731) sizes cw->cols over every mlist entry,
     * and the end_menu title (iactions.c:699) is one of them, so a long
     * "Do what with ...?" title widens the window and moves offx left. */
    /* tty_end_menu (wintty.c:2728-2732) truncates each entry, including the
     * prompt, to cols - 2 before measuring the window. */
    const _iaTitleText = `Do what with ${_the_objnam(_ia_cxname(otmp))}?`.slice(0, 78);
    const maxLen = Math.max(windowLines.reduce((mx, ln) => Math.max(mx, ln.length), 0),
                            _iaTitleText.length);
    /* C wintty.c:1927 — `!iflags.menu_overlay` drops the NHW_MENU to offx 0 and
     * clears the whole screen, however short the menu is. */
    /* wintty.c:13 defines H2344_BROKEN, so the `cw->offx == 10` clear-screen
     * test (wintty.c:1927) is #else-dead; a 70-column menu keeps offx 9. */
    /* wintty.c:1908-1918 gives offx 0 when cols - (maxLen + 2) - 1
     * is nonpositive; process_menu_window (:1406-1412) then clears the
     * whole screen, and erase_menu_or_text (:971-978) uses docrt. */
    const iaFullScreen = game.iflags?.menu_overlay === false
        || game.iflags?.menu_overlay === 0 || maxLen >= 77;
    /* wintty.c:1917 `if (cw->offx < 0) cw->offx = 0;` — a window wider than the
     * screen starts at offx 0, i.e. content column 1, never negative. */
    const WIN_COL = iaFullScreen ? 0 : Math.max(1, Math.min(41,
        80 - maxLen - 2));
    /* C iactions.c:698 — Sprintf(buf, "Do what with %s?", the(cxname(otmp))).
     * This read `"Do what with the " + _cxname_base(otmp)`, a file-local partial
     * namer that never pluralises: a stack of 2 tripe rations titled the menu
     * "Do what with the tripe ration?" where C reads "...tripe rations?".
     * cxname() is the real objnam.js namer (xname_flags, or corpse_xname for a
     * corpse), and the() supplies the article C's `the` supplies — including
     * declining to add one for a proper-named or unique object, which the
     * hardcoded "the " could not. */
    const title = _iaTitleText;
    const uac = u.uac ?? 0;
    /* Title is row 0 (reverse video); a blank line; then the menu body. */
    const fullLines = [menu_heading_text(title), '', ...windowLines]; /* iactions.c:698 end_menu; wintty.c:2688 */
    /* statusClip: only when the itemactions window is shorter than the prior
     * inventory window AND does not itself cover status line 1 (row 22).  The
     * inventory dismiss cleared the corner from priorWinCol-1; status line 1
     * keeps its leftmost priorWinCol-2 columns. */
    const priorReachedStatus = (priorWinRows == null) || (priorWinRows >= (_threeStatusLines() ? 21 : 22));
    /* A full-screen (offx 0) inventory menu is erased by erase_menu_or_text()'s
     * docrt() (wintty.c:971-978), whose cls() blanks BOTH status rows until the
     * next bot(); no leftmost-columns remnant survives (the docorner arm above
     * is the offx != 0 case).  build_window_screen's statusStillBlank paints
     * rows 22/23 blank while _statusBlankAfterDocrt holds. */
    const priorFullScreen = priorWinCol === 0 && priorReachedStatus && priorWinRows != null;
    if (priorFullScreen) g._statusBlankAfterDocrt = true;
    const statusClip = (priorWinCol != null && priorReachedStatus && !priorFullScreen
                        && fullLines.length <= 22)
        ? (priorWinRows === 22
           ? (priorWinCol <= 34 ? -1 : (priorWinCol - 2))
           : (priorWinCol - 2)) : undefined;
    /* offx 0: one-space left margin, "(end) " footer, cursor after it
     * (same layout as the full-screen 'i' / getobj '*' menus). */
    /* clip to 79 visible columns, keeping SGR sequences whole */
    const _iaClip79 = (ln) => {
        let out = '', vis = 0;
        for (const m of ln.matchAll(/\x1b\[[0-9;]*m|[^\x1b]/g)) {
            if (m[0].length > 1) { out += m[0]; } else if (vis < 79) { out += m[0]; vis++; }
        }
        return out;
    };
    const iaBuild = (lines) => iaFullScreen
        ? Array.from({ length: 24 }, (_, i) => (i < lines.length ? _iaClip79(` ${lines[i]}`) : '')).join('\n')
        : build_window_screen(lines, WIN_COL, uac, statusClip, undefined,
                                  /* offx 0 over a dismissed full-screen window: the terminal is still blank */
                                  priorFullScreen && WIN_COL === 1, 0, (priorWinRows ?? 0) >= 23,
                                  _threeStatusLines() && priorWinRows === 21 ? 21 : 23);
    /* C wintty.c:1921-1922 tty_display_nhwindow(NHW_MENU): a standing topline
     * (TOPLINE_NEED_MORE) is paged out with --More-- before the menu opens. */
    if (g._pending_message)
        await force_more(g._pending_message);
    const screenOutput = iaBuild(fullLines);
    g._screen_output = screenOutput;
    const endRow = fullLines.length - 1;
    const endCursorCol = iaFullScreen ? 1 + '(end) '.length : WIN_COL + 5 + 1; /* WIN_COL + len("(end)") + 1 */
    set_cursor(endCursorCol, endRow);

    /* ── tty PICK_ONE select loop: ignore non-accelerator keys, ESC cancels ── */
    const SEL = new Map(menu.map(m => [m.let.charCodeAt(0), m]));
    let chosen = null;
    let iaTitleErased = false;
    const iaFrameRows = () => iaBuild(
        iaTitleErased ? ['', ...fullLines.slice(1)] : fullLines).split('\n');
    const iaRepaint = () => {
        g._screen_output = iaFrameRows().join('\n');
        set_cursor(endCursorCol, endRow);
    };
    /* C wintty.c:1547 dmore -> getline.c:230-257 xwaitforspace(resp): keys
     * outside resp bell and are re-read inside the wait, so a live count
     * ("n10") survives them and ESC then only stops the count.  The shared
     * await_menu_key models that; ':' MENU_SEARCH is its `search` thunk
     * (wintty.c:1700-1730), whose first pmatchi() hit finishes this PICK_ONE
     * menu.  pmatchi is matched against what tty_add_menu STORED, "%c - %s"
     * (wintty.c:2596-2600) == windowLines[]. */
    /* C windows.c:1859-1863 holds bot_disabled through tty_select_menu,
     * including its dismissal. Leave the pending status redraw for the
     * moveloop's bot() after the inventory command has finished. */
    const savedBotDisabled = g._bot_disabled;
    g._bot_disabled = true;
    try {
    const iaKey = await await_menu_key(
        iaRepaint, menu.map(m => m.let).join(''), '', PICK_ONE, undefined,
        async () => {
            const finished = await menu_search_case(
                'ONE',
                menu.map((m, i) => ({ str: windowLines[i], m })),
                iaFrameRows,
                (curr) => { chosen = curr.m; });
            iaTitleErased = true;
            return finished;
        });
    if (chosen === null && SEL.has(iaKey)) chosen = SEL.get(iaKey);

    /* Erase the menu back to the map. */
    g._pending_message = '';
    if (iaFullScreen) await docrt();
    else docorner_blank_utf8_captures(WIN_COL - 1, fullLines.length + 1);
    await flush_screen(1);
    } finally { g._bot_disabled = savedBotDisabled; }
    if (chosen) itemactions_pushkeys(otmp, chosen.act);
    // C: cancellation also finishes the inventory command with ECMD_OK.
    return ECMD_OK;
}

function _shopKeeper_useupf(rmno) {
    if ((rmno | 0) < ROOMOFFSET)
        return null;
    return shk_shop_keeper(rmno);
}
