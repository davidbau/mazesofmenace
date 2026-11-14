// invent.js — C ref: invent.c.
import { obj_extract_self_general } from './cmd.js';
import { inv_cnt } from './hack.js';
import { FUMBLING, MENU_TRADITIONAL, ONAME, ONAME_SKIP_INVUPD, SHRINK_GLOB, Upolyd, W_QUIVER, W_SWAPWEP, W_WEP, has_oname } from './const.js';
import { dropx, dropy } from './do.js';
import { picked_container } from './dokick.js';
import { hitfloor, throwing_weapon } from './dothrow.js';
import { game } from './gstate.js';
import { COIN_CLASS, _uprop_on, ammo_and_launcher, is_ammo, is_missile } from './hold_another_object.js';
import { can_reach_floor } from './engrave.js';
import './inventory_refresh.js';
import { obj_merge_light_sources } from './light.js';
import { splitobj } from './makemon.js';
import { dealloc_obj, place_object, remove_object, start_glob_timeout } from './mkobj.js';
import { pudding_merge_message } from './mkobj.js';
import { observe_object } from './o_init.js';
import { oname } from './do_name.js';
import { reset_justpicked, u_safe_from_fatal_corpse } from './pickup.js';
import { There, impossible, pline } from './pline.js';
import { globby_bill_fixup, obfree } from './shk.js';
import { obj_stop_timers, stop_timer } from './timeout.js';
import { Blind } from './vision.js';
import { encumber_msg_sync, weight } from './weight.js';
import { near_capacity } from './hack.js';
import { setuqwep } from './wield.js';
import { _pickup_burden_level, touch_artifact_youmonst } from './wizcmds.js';
import { setnotworn, setworn } from './worn.js';
import { _sortloot_within_class } from './cmd.js'; // relocate-fns
import { build_window_screen, menu_search_case, tty_window_offx } from './com_pager.js'; // relocate-fns
import { _topl_joins_committed, docrt, flush_screen, obj_to_glyph, status_r1_menu_docrt, use_last_flush_snapshot } from './display.js'; // relocate-fns
import { nhgetch } from './input.js'; // relocate-fns
import { doname_with_price, not_fully_identified } from './objnam.js'; // relocate-fns
import { map_menu_cmd } from './options.js'; // relocate-fns
import { set_cursor, topline_more_loop } from './read.js'; // relocate-fns
import { menu_heading_text } from './tty_menu.js'; // relocate-fns
import { getObjFromGetobj, instapetrify as instapetrify_eat } from './cmd.js'; // relocate-fns
import { body_part } from './polyself.js';
import { HAND } from './const.js'; // relocate-fns
import { corpse_xname, killer_xname, makeplural } from './objnam.js'; // relocate-fns
import './cmd.js'; // relocate-fns
import { instapetrify, mbodypart } from './cmd.js';
import { force_decor } from './pickup.js'; // relocate-fns
import { ECMD_OK, ECMD_TIME, ICE, Is_airlevel, Is_waterlevel, LOOKHERE_NOFLAGS, LOOKHERE_PICKED_SOME, LOOKHERE_SKIP_DFEATURE, PLNMSG_ONE_ITEM_HERE, STOMACH, STONE_RES, is_pit } from './const.js'; // relocate-fns
import { s_suffix } from './hacklib.js'; // relocate-fns
import { displayLookWindow } from './look-window.js'; // relocate-fns
import { _dfeature_at, _is_lava_local, _surface_at, _surface_lk, read_engr_at } from './look.js'; // relocate-fns
import { is_pool } from './dbridge.js';
import { trapname } from './trap.js'; // relocate-fns
import { poly_when_stoned } from './mondata.js'; // relocate-fns
import { CXN_ARTICLE, CXN_PFX_THE, an, doname, vtense } from './objnam.js'; // relocate-fns
import { MSGTYP_MASK_REP_SHOW, hide_unhide_msgtypes } from './options.js'; // relocate-fns
import { reg_damg, visible_region_at } from './region.js'; // relocate-fns
import { t_at } from './trap.js'; // relocate-fns
import { mon_nam } from './uhitm.js'; // relocate-fns
import { _COIN_CLASS, _is_cleric } from './pickup.js'; // relocate-fns
import { menucolor_row } from './coloratt.js';
import { SPE_NOVEL_OTYP } from './cmd.js'; // relocate-fns

/* ---------------------------------------------------------------------------
 * Constants, each with the C header it comes from.
 * ------------------------------------------------------------------------ */
/* include/hack.h:584 `invlet_basic = 52` — a..z then A..Z. */
const INVLET_BASIC = 52;

/* include/hack.h NOINVSYM '#', GOLD_SYM '$' (defsym.h:479 OBJCLASS2(12,'$',...)). */
const NOINVSYM_invent = 0x23;
export const GOLD_SYM = 0x24;

/* objects.h otyps. */
const CORPSE = 265, CRYSKNIFE = 43;
import { LOADSTONE } from './cmd.js';
import { suppress_map_output } from './display.js'; // relocate-fns
import { shim_update_inventory, tty_update_inventory } from './inventory_refresh.js'; // relocate-fns
import { Has_contents, OBJ_CONTAINED, OBJ_FLOOR } from './const.js'; // relocate-fns
import { _get_obj_location_shk, costly_spot } from './shk.js'; // relocate-fns
import { confers_luck, discover_artifact, set_artifact_intrinsic } from './artifact.js'; // relocate-fns
import { acurr, set_moreluck } from './attrib.js'; // relocate-fns
import { BUCT_BLESSED, BUCT_CURSED, BUCT_UNCURSED, BUCT_UNKNOWN, COIN_CLASS_C, INV_ORDER, Is_container, OCLASS_COIN, OCLASS_NAME, OCLASS_TOOL, OTYP_LEASH, PICKINV_CLASS_HEADER, PICKINV_CLASS_ORDER, QBUFSZ_CMD, SET_BOTL, STATUE, TIN, Underwater, W_AMUL_C, W_QUIVER_C, W_RINGL_C, W_RINGR_C, W_SADDLE_C, W_SWAPWEP_C, W_TOOL_C, W_WEP_C, _ADDINV_AMULET_OF_YENDOR, _Blind_cmd, _Is_candle, _MG_COIN_CLASS, _MG_FOOD_CLASS, _MONS, _Role_if, _SL_POTION_CLASS, _SL_POT_WATER, _SL_TOWEL, _cmd_Hallucination, _digests, _hero_youmonst, _hidesUnder_useupf, _invlet_constant, _ld_carried, _levlAt, _pickinv_item_text, _plineVFmt, _run_pickinv_menu, _u_blind, _uprop_active, cmdq_clear, cmdq_pop, dbase_display_window, doname_body, flooreffects_is_plural, get_count, impossible_cmd, inhishop, inventory_menu_legacy, inventory_special_choice, is_mines_prize, is_soko_prize, is_wet_towel, pair_of, sortloot_invlet_chain, stolen_value, yn_function } from './cmd.js';
import { count_categories } from './pickup.js';
import { obj_to_any } from './hack.js';
import { check_unpaid } from './shk.js'; // relocate-fns
import { ACH_AMUL, ACH_BELL, ACH_BOOK, ACH_CNDL, ACH_MINE_PRIZE, ACH_SOKO_PRIZE, AM_SHRINE, Amask2align, CMDQ_KEY, CQ_CANNED, D_BROKEN, D_ISOPEN, D_NODOOR, ECMD_CANCEL, ECMD_FAIL, ESHK, GC_CONDHIST, GC_ECHOFIRST, GETOBJ_ALLOWCNT, GETOBJ_EXCLUDE, GETOBJ_NOFLAGS, GETOBJ_PROMPT, GETOBJ_SUGGEST, HALLUC, HALLUC_RES, IS_ALTAR, IS_DOOR, IS_FOUNTAIN, IS_GRAVE, IS_SINK, IS_THRONE, LL_CONDUCT, LOW_PM, MENU_COMBINATION, MENU_FULL, NON_PM, PICK_ONE, RIGHT_HANDED, ROOMOFFSET, SHOPBASE, W_ACCESSORY, W_ARMC as W_ARMC_C, W_ARMF as W_ARMF_C, W_ARMG as W_ARMG_C, W_ARMH as W_ARMH_C, W_ARMOR, W_ARMS as W_ARMS_C, W_ARMU as W_ARMU_C, W_ARM as W_ARM_C, W_ART, W_SADDLE, W_WEAPONS, engulfing_u, otrapped_of, u_at } from './const.js'; // relocate-fns
import { is_drawbridge_wall as dbridge_is_drawbridge_wall, is_ice, is_lava, is_pool_or_lava } from './dbridge.js'; // relocate-fns
import { _strengthStr, _threeStatusLines, await_menu_key, force_more, newsym, putmsghistory, status_r1_docorner, topl_park_cursor, tty_yn_count_echo } from './display.js'; // relocate-fns
import { hliquid, noit_Monnam } from './do_name.js'; // relocate-fns
import { fingers_or_gloves, is_gloves, xname } from './do_wear.js'; // relocate-fns
import { shkname as dokick_shkname } from './dokick.js'; // relocate-fns
import { def_char_to_objclass, def_oc_syms_chars } from './drawing.js'; // relocate-fns
import { money_cnt } from './hack.js'; // relocate-fns
import { ing_suffix, letter } from './hacklib.js'; // relocate-fns
import { itemactions } from './iactions.js'; // relocate-fns
import { align_str, record_achievement } from './insight.js'; // relocate-fns
import { makeknown, permonstTemplate } from './makemon.js'; // relocate-fns
import monsPack from './makemon_mons.json' with { type: 'json' }; // relocate-fns
import { in_rooms, shtype_name } from './mklev.js';
import { erosion_matters } from './objnam.js'; // relocate-fns
import { obj_extract_self as _objExtractSelf_useupf, clear_splitobjs, curse as curse_obj, extract_nobj, unknwn_contnr_contents, unsplitobj } from './mkobj.js'; // relocate-fns
import { dead_species, hideunder, maybe_unhide_at } from './mon.js'; // relocate-fns
import { doname_with_price as _doname_with_price, distant_name as _fw_distant_name, simpleonames as _ia_simpleonames, cxname_singular as _sl_cxname_singular, ansimpleoname, makeplural as makeplural_objnam, maybereleaseobuf, with_distant_name, yname } from './objnam.js'; // relocate-fns
import { oc_merge } from './oc_merge.generated.js'; // relocate-fns
import { ice_descr, self_lookat } from './pager.js'; // relocate-fns
import { add_valid_menu_class, allow_category, container_gone, menu_class_present } from './pickup.js'; // relocate-fns
import { You, Your, livelog_printf, impossible as real_impossible } from './pline.js'; // relocate-fns
import { PM_DEATH, PM_FAMINE, PM_PESTILENCE } from './pm.generated.js'; // relocate-fns
import { a_gname } from './pray.js'; // relocate-fns
import { artitouch } from './quest.js'; // relocate-fns
import { is_quest_artifact } from './questpgr.js'; // relocate-fns
import { unpunish as unpunish_invent } from './read.js'; // relocate-fns
import { rn2, rn2_on_display_rng } from './rnd.js'; // relocate-fns
import { inside_shop, next_shkp, addtobill as shk_addtobill, doinvbill as shk_doinvbill, onbill as shk_onbill, unpaid_cost as shk_unpaid_cost, shop_keeper } from './shk.js';
import { safe_qbuf as inventory_safe_qbuf, safe_qbuf as safe_qbuf_invent } from './objnam.js'; // relocate-fns
import { stairs_description, stairway_at } from './stairs.js'; // relocate-fns
import { attach_fig_transform_timeout, learn_egg_type } from './timeout.js'; // relocate-fns
import { TtyMenu } from './tty_menu.js'; // relocate-fns
import { hidden_gold } from './vault.js'; // relocate-fns
import { empty_handed, welded } from './wield.js'; // relocate-fns
import { getlin } from './windows.js'; // relocate-fns
import { bypass_objlist, clear_bypasses as clear_bypasses_invent } from './worn.js'; // relocate-fns
import { obj_resists } from './zap.js'; // relocate-fns
import { count_justpicked, find_justpicked } from './pickup.js'; // relocate-fns
import { shopper_financial_report } from './shk.js'; // relocate-fns

/* include/pickup.h / hack.h — u_safe_from_fatal_corpse test mask.
 * st_gloves 0x1 | st_corpse 0x2 | st_petrifies 0x4 | st_resists 0x8. */
const ST_ALL = 0xf;

/* include/obj.h:481-482 how_lost. */
const LOST_NONE = 0, LOST_THROWN = 1, LOST_EXPLODING = 4;

const OBJ_FREE = 0, OBJ_INVENT = 3;

/* ---------------------------------------------------------------------------
 * C invent.c:694 assigninvlet(otmp).  Ported verbatim, INCLUDING the two parts
 * the three existing hand-copies in this port drop: the loop's
 * `if (i == otmp->invlet) otmp->invlet = 0;` (a letter already held by another
 * object is taken away from the incoming one) and the early return that KEEPS
 * an already-valid letter.  The free-letter scan starts just AFTER
 * gl.lastinvnr and wraps — it does not restart at 'a', so a freed slot is
 * reused only once the cursor comes back around to it.  RNG-free.
 *
 * THE one port (invent.c audit a2_invent_30): the file-local hand copies
 * js/cmd.js doorganize calls this directly and js/eat.js _eat_assigninvlet forwards here
 * rather than carrying the body a second and third time.
 * ------------------------------------------------------------------------ */
export function assigninvlet(otmp) {
    /* there should be at most one of these in inventory... */
    if ((otmp.oclass | 0) === COIN_CLASS) {
        otmp.invlet = GOLD_SYM;
        return;
    }

    const inuse = new Array(INVLET_BASIC).fill(false);
    for (let obj = game.invent; obj; obj = obj.nobj) {
        if (obj === otmp)
            continue;
        const i = obj.invlet | 0;
        if (0x61 /* 'a' */ <= i && i <= 0x7a /* 'z' */)
            inuse[i - 0x61] = true;
        else if (0x41 /* 'A' */ <= i && i <= 0x5a /* 'Z' */)
            inuse[i - 0x41 + 26] = true;
        if (i === (otmp.invlet | 0))
            otmp.invlet = 0;
    }
    {
        const i = otmp.invlet | 0;
        if (i && ((0x61 <= i && i <= 0x7a) || (0x41 <= i && i <= 0x5a)))
            return;
    }
    /* C: gl.lastinvnr, tracked on the game record as _lastinvnr — the same
     * rolling cursor js/u_init.js _assigninvlet_ini and js/cmd.js's dopickup
     * insert already share.  C's gl.lastinvnr is BSS-zero at game start and
     * u_init sets it; `?? 51` reproduces the pre-first-assignment wrap this
     * port's other two copies use. */
    const last = (game._lastinvnr ?? 51) | 0;
    let i;
    for (i = last + 1; i !== last; i++) {
        if (i === INVLET_BASIC) {
            i = -1;
            continue;
        }
        if (!inuse[i])
            break;
    }
    otmp.invlet = inuse[i] ? NOINVSYM_invent : (i < 26 ? (0x61 + i) : (0x41 + i - 26));
    game._lastinvnr = i;
}

/* ---------------------------------------------------------------------------
 * C invent.c:814 merged(&otmp, &obj) — fold `obj` into the carried stack
 * `otmp`.  Returns TRUE when the merge happened.
 *
 * Name transfer, glob absorption and worn-slot fixup follow C invent.c.
 * mergable() itself is the shared export from js/cmd.js, which reads the real
 * per-otyp oc_merge column, so this never merges a pair C would refuse.
 * RNG-free.
 * ------------------------------------------------------------------------ */
export async function merged(potmp, pobj, nomsg = false) {
    const otmp = potmp.o, obj = pobj.o;
    // obj_meld's nomsg path is obj_absorb (mkobj.c:3702), without merged's
    // name, knowledge, worn-slot, or bypass transfer.  In particular, the
    // absorption below must see the original bknown/rknown disagreement.
    if (!nomsg && !(await mergable(otmp, obj)))
        return false;
    if (nomsg && obj.globby) await globby_bill_fixup(otmp, obj); // mkobj.c:3714, before extraction

    /* C:831-833 — weighted-average age, weighted by quantity.  C's arithmetic is
     * integer division on longs; Math.trunc matches (both operands are
     * non-negative here, but trunc is the rule this project uses). */
    if (!obj.lamplit && !obj.globby) {
        const q = (otmp.quan ?? 0) + (obj.quan ?? 0);
        if (q)
            otmp.age = Math.trunc((((otmp.age ?? 0) * (otmp.quan ?? 0))
                + ((obj.age ?? 0) * (obj.quan ?? 0))) / q);
    }

    if (!otmp.globby)
        otmp.quan = (otmp.quan ?? 0) + (obj.quan ?? 0);
    /* C:838-842 — the gold special case, then the non-pudding weight recompute. */
    if ((otmp.oclass | 0) === COIN_CLASS) {
        otmp.owt = weight(otmp);
        otmp.bknown = 0;
    } else if (!otmp.globby) { /* C's `else if (!Is_pudding(otmp))` */
        otmp.owt = weight(otmp);
    }
    if (!nomsg && !has_oname(otmp) && has_oname(obj))
        /* C oname(..., ONAME_SKIP_INVUPD) allocates the survivor's oextra and
         * copies the discarded stack's name without refreshing inventory.
         * The latter matters because merged() is still midway through its
         * bookkeeping and C's update_inventory happens in addinv's caller. */
        await oname(otmp, ONAME(obj), ONAME_SKIP_INVUPD);

    /* C invent.c:845: extraction runs for the merged() path (!nomsg), including
     * OBJ_FREE (skipped in obj_meld's nomsg path). */
    if (!nomsg) obj_extract_self_general(obj);

    /* C:847-848 */
    if (!nomsg && obj.pickup_prev && (otmp.where | 0) === OBJ_INVENT)
        otmp.pickup_prev = 1;

    /* C:851-854 — extinguish the absorbed light source and stop any remaining
     * object timers after the merge.  The helpers also maintain the live light
     * source/timer registries and the timed count. */
    if (!nomsg && obj.lamplit)
        obj_merge_light_sources(obj, otmp);
    /* obj_meld (nomsg) reaches obj_absorb without merged(), so a glob's
     * SHRINK_GLOB timer is still live for obj_absorb's stop_timer averaging
     * (mkobj.c:3737-3742); stopping it here made tm2 0 instead of ~23. */
    if (obj.timed && !(nomsg && obj.globby))
        obj_stop_timers(obj);
    /* C:862-875 — "objects can be identified by comparing them": each
     * dimension that differs becomes known on the combined stack, and (with
     * the two exceptions C spells out) that counts as a DISCOVERY. */
    let discovered = false;
    if (!nomsg && (obj.known | 0) !== (otmp.known | 0)) {
        otmp.known = 1;
        discovered = true;
    }
    if (!nomsg && (obj.rknown | 0) !== (otmp.rknown | 0)) {
        otmp.rknown = 1;
        if (otmp.oerodeproof)
            discovered = true;
    }
    if (!nomsg && (obj.bknown | 0) !== (otmp.bknown | 0)) {
        otmp.bknown = 1;
        if (!_Role_if_cleric())
            discovered = true;
    }

    /* C:878-901 — the #adjust worn-slot fixup.  A returned stack can merge
     * with a wielded/quivered stack; the surviving stack keeps the preferred
     * weapon slot and the discarded node is fully unworn. */
    if (!nomsg && obj.owornmask && (otmp.where | 0) === OBJ_INVENT) {
        const wmask = (otmp.owornmask | 0) | (obj.owornmask | 0);
        let chosen;
        if (wmask & W_WEP) chosen = W_WEP;
        else if (wmask & W_SWAPWEP) chosen = W_SWAPWEP;
        else if (wmask & W_QUIVER) chosen = W_QUIVER;
        else {
            await impossible('merging strangely worn items (%lx)', wmask);
            chosen = otmp.owornmask | 0;
        }
        if ((otmp.owornmask | 0) & ~chosen)
            setnotworn(otmp);
        await setworn(otmp, chosen);
        setnotworn(obj);
    }

    /* C:922-923 */
    if (!nomsg && obj.bypass)
        otmp.bypass = 1;

    /* C:928-931 / mkobj.c:3702 — pudding globs absorb rather than add
     * quantity.  Preserve the weighted age and edible mass, combine status
     * flags, and average the two shrink timers before freeing the absorbed
     * object. */
    if (obj.globby) {
        /* obj_meld() reaches obj_absorb directly (mkobj.c:3789,3794) with no message; only invent.c merged() prints */
        if (!nomsg)
            await pudding_merge_message(otmp, obj); /* invent.c:929 */
        if (!nomsg) await globby_bill_fixup(otmp, obj);
        const w1 = (otmp.oeaten | 0) || (otmp.owt | 0);
        const w2 = (obj.oeaten | 0) || (obj.owt | 0);
        const total = w1 + w2;
        if (total)
            otmp.age = (game.moves | 0) - Math.trunc((((game.moves | 0) - (otmp.age | 0)) * w1
                + ((game.moves | 0) - (obj.age | 0)) * w2) / total);
        otmp.owt = (otmp.owt | 0) + w2;
        if (otmp.oeaten || obj.oeaten)
            otmp.oeaten = w1 + w2;
        otmp.quan = 1;
        /* C mkobj.c:3715-3721 — absorption loses a knowledge/grease
         * property only when the two globs disagree; matching values remain
         * intact on both objects before the absorbed node is freed. */
        if ((otmp.bknown | 0) !== (obj.bknown | 0))
            otmp.bknown = obj.bknown = 0;
        if ((otmp.rknown | 0) !== (obj.rknown | 0))
            otmp.rknown = obj.rknown = 0;
        if ((otmp.greased | 0) !== (obj.greased | 0))
            otmp.greased = obj.greased = 0;
        if (otmp.orotten || obj.orotten)
            otmp.orotten = obj.orotten = 1;
        /* a_long must be null to match the timer's own obj_to_any() key */
        const tm1 = stop_timer(SHRINK_GLOB, { a_obj: otmp, a_long: null });
        const tm2 = stop_timer(SHRINK_GLOB, { a_obj: obj, a_long: null });
        const tm = Math.trunc(((tm1 || 25) + (tm2 || 25) + 1) / 2);
        start_glob_timeout(otmp, tm); /* mkobj.c:3742 */
        obj_extract_self_general(obj); /* mkobj.c:3745, after absorption */
        await dealloc_obj(obj); pobj.o = null; potmp.o = otmp; return true; /* mkobj.c:3746-3749 */
    }

    /* C:935-942 — and C's own reason for the how_lost exclusion: monsters
     * un-identify thrown items constantly, so this would be spam. */
    if (discovered && (otmp.where | 0) === OBJ_INVENT
        && (obj.how_lost | 0) !== LOST_THROWN
        && (otmp.how_lost | 0) !== LOST_THROWN)
        await pline('You learn more about your items by comparing them.');

    await obfree(obj, otmp);
    potmp.o = otmp;
    return true;
}

/* C role index, NOT a PM_ mons[] index — see [[PM_ prefix hides a role index]].
 * role.c lists Archeologist(0) Barbarian(1) Caveman(2) Healer(3) Knight(4)
 * Monk(5) Priest(6) Rogue(7) ...  js/cmd.js's _MG_PM_CLERIC uses 6 for the
 * same test on the same contract. */
const ROLE_PRIEST = 6;

function _Role_if_invent(role_idx) {
    const ir = (game.flags && game.flags.initrole != null)
        ? (game.flags.initrole | 0) : -1;
    if (ir >= 0) return ir === role_idx;
    return ((game.urole && game.urole.mnum != null)
        ? (game.urole.mnum | 0) : -1) === role_idx;
}

function _Role_if_cleric() { return _Role_if_invent(ROLE_PRIEST); }

/* C obj.h Has_contents(o) — a container with something in it. */
function Has_contents_invent(obj) { return !!obj.cobj; }

/* ---------------------------------------------------------------------------
 * C invent.c:1056 addinv_core0(obj, other_obj, update_perm_invent).
 *
 * RNG-free.
 * ------------------------------------------------------------------------ */
export async function addinv_core0(obj, other_obj, update_perm_invent) {
    const g = game;
    const u = g.u || {};
    const saved_otyp = obj.otyp | 0;

    /* C:1064-1065 panic("addinv: obj not free") — a real invariant, not a
     * defensive check: everything below assumes the object is unlinked. */
    if ((obj.where | 0) !== OBJ_FREE)
        throw new Error('addinv: obj not free');
    /* C:1066-1067 */
    if ((obj.how_lost | 0) === LOST_EXPLODING)
        return null;

    obj.no_charge = 0;
    /* C:1072-1073 picked_container(obj) — clears no_charge on the contents. */
    if (Has_contents_invent(obj))
        picked_container(obj);
    const obj_was_thrown = ((obj.how_lost | 0) === LOST_THROWN);
    obj.how_lost = LOST_NONE;

    /* C:1077-1080 — gl.loot_reset_justpicked is set by the #loot menus
     * (js/pickup.js:242 uses the same name) and cleared here by the first
     * addinv that follows. */
    if (g.loot_reset_justpicked) {
        g.loot_reset_justpicked = false;
        reset_justpicked(g.invent);
    }

    await addinv_core1(obj); /* C:1082 — most side effects of carrying obj */

    let added = false;
    /* C:1087-1096 addinv_before()'s insert-in-place arm; other_obj is NULL on
     * every call this port makes. */
    if (other_obj) {
        for (let otmp = g.invent; otmp; otmp = otmp.nobj) {
            if (otmp.nobj === other_obj) {
                obj.nobj = other_obj;
                otmp.nobj = obj;
                obj.where = OBJ_INVENT;
                added = true;
                break;
            }
        }
    }

    if (!added) {
        /* C:1101-1106 — merge with the quiver in preference to any other slot. */
        if (u.uquiver) {
            const pq = { o: u.uquiver }, po = { o: obj };
            if (await merged(pq, po)) {
                u.uquiver = pq.o;
                obj = pq.o;
                if (!obj) throw new Error(`addinv: null obj after quiver merge otyp=${saved_otyp}`); /* invent.c:1104 */
                added = true;
            }
        }
    }
    if (!added) {
        /* C:1108-1114 — merge if possible; find the end of the chain on the way. */
        let prev = null;
        for (let otmp = g.invent; otmp; prev = otmp, otmp = otmp.nobj) {
            const pt = { o: otmp }, po = { o: obj };
            if (await merged(pt, po)) {
                obj = pt.o;
                if (!obj) throw new Error(`addinv: null obj after merge otyp=${saved_otyp}`); /* invent.c:1112 */
                added = true;
                break;
            }
        }
        if (!added) {
            /* C:1116-1125 — didn't merge, so insert into the chain. */
            assigninvlet(obj);
            /* C `flags.invlet_constant || !prev`.  optlist.h:312 `fixinv` has
             * initval On and this port has no writer for it, so an absent
             * field reads as C's default rather than as false — the same
             * reading js/cmd.js:_invlet_constant takes, and for the same
             * reason (reading it raw takes the tail-append arm every time). */
            const invlet_constant = (g.flags?.invlet_constant ?? true) !== false;
            if (invlet_constant || !prev) {
                obj.nobj = g.invent ?? null;
                g.invent = obj;
                if (invlet_constant)
                    reorder_invent();
            } else {
                prev.nobj = obj;
                obj.nobj = null;
            }
            obj.where = OBJ_INVENT;

            /* C invent.c:1128-1140 — autoquiver hero-thrown weapons or ammo,
             * excluding Mjollnir and aklys, which must be wielded to return. */
            if (obj_was_thrown && (g.flags?.pickup_thrown ?? true) /* optlist.h:579 initval On */ && !u.uquiver
                && (obj.oartifact | 0) !== 3 /* ART_MJOLLNIR */
                && (obj.otyp | 0) !== 80 /* AKLYS */
                && (throwing_weapon(obj) || is_ammo(obj)))
                await setuqwep(obj);
        }
    }

    /* C:1142-1146 `added:` */
    obj.pickup_prev = 1;
    addinv_core2(obj);
    carry_obj_effects(obj);
    if (update_perm_invent)
        update_inventory();
    return obj;
}

export async function addinv(obj) {
    return await addinv_core0(obj, null, true);
}

/* C invent.c:1160 addinv_before(obj, other_obj) — "add obj to the hero's
 * inventory by inserting in front of a specific item; used for
 * throw-and-return in case '!fixinv' is in effect".  C's own comment: "if
 * 'other_obj' is present this will implicitly be 'nomerge'" — true here too,
 * since addinv_core0's `other_obj` arm (C:1087-1096, ported above) inserts
 * obj directly rather than routing it through merged(). RNG-free. */
export async function addinv_before(obj, other_obj) {
    return await addinv_core0(obj, other_obj, true);
}

/* C invent.c:1169 addinv_nomerge(obj) — "return value will always be 'obj'".
 * Ported verbatim, including the save/restore of obj.nomerge around the
 * addinv() call (obj can legitimately have nomerge already set — e.g. a
 * partly-eroded stack fragment — and C restores exactly that prior value,
 * not unconditionally 0). RNG-free. */
export async function addinv_nomerge(obj) {
    const save_nomerge = obj.nomerge;
    obj.nomerge = 1;
    const result = await addinv(obj);
    obj.nomerge = save_nomerge;
    return result;
}

export async function hold_another_object(obj, drop_fmt, drop_arg, hold_msg) {
    const g = game;
    const u = g.u || {};
    let dropIt = false;

    /* C:1216-1217 */
    if (!Blind())
        observe_object(obj); /* maximize mergeability */

    if (obj.oartifact) {
        const wasUpolyd = Upolyd(u);
        const crysknife = (obj.otyp | 0) === CRYSKNIFE;
        const oerodeproof = obj.oerodeproof;
        place_object(obj, u.ux | 0, u.uy | 0);
        // C invent.c:1227 / artifact.c:951: touching prints the blast before
        // hold/drop messages, even when the artifact accepts the hero.
        g._rt_blast_page_standing = true;
        let canTouch;
        try { canTouch = await touch_artifact_youmonst(obj); }
        finally { g._rt_blast_page_standing = false; }
        const blast = g._touch_artifact_blast_msg;
        if (blast) {
            g._touch_artifact_blast_msg = null;
            await pline(blast);
        }
        if (!canTouch) {
            remove_object(obj);
            await dropy(obj);
            return obj;
        }
        if (wasUpolyd && !Upolyd(u)) {
            /* C:1232-1238 — losing the polymorphed form loses the grip. */
            if (drop_fmt)
                await pline(_fmt1(drop_fmt, drop_arg));
            remove_object(obj);
            await dropy(obj);
            return obj;
        }
        remove_object(obj);
        if (crysknife) {
            obj.otyp = CRYSKNIFE;
            obj.oerodeproof = oerodeproof;
        }
    }

    if (_uprop_on(FUMBLING)) {
        /* C:1244-1249 */
        obj.nomerge = 1;
        obj = (await addinv_core0(obj, null, false));
        dropIt = true;
    } else if ((obj.otyp | 0) === CORPSE
               && (obj.wishedfor | 0)
               && !u_safe_from_fatal_corpse(obj, ST_ALL)) {
        /* C:1250-1255.  C's conjunct order is
         *     otyp == CORPSE && !u_safe_from_fatal_corpse(...) && wishedfor
         * and this reads the last two in the other order.  That is legal and
         * deliberate: u_safe_from_fatal_corpse is four table lookups with no
         * side effects and no RNG (pickup.c:273), so its evaluation is
         * unobservable, and putting the cheap `wishedfor` test first keeps
         * every non-wished corpse out of a predicate whose petrification half
         * is the expensive one. */
        obj.wishedfor = 0;
        obj = (await addinv_core0(obj, null, false));
        dropIt = true;
    } else {
        /* C:1257-1294 */
        const oquan = obj.quan; /* C invent.c:1257: long, including merged gold. */
        let prev_encumbr = near_capacity(); /* before addinv() */

        const pickup_burden = _pickup_burden_level(g.flags?.pickup_burden);
        if (prev_encumbr < pickup_burden)
            prev_encumbr = pickup_burden;

        /* C:1266-1272 `drop_arg = strcpy(buf, drop_arg)` — a defensive copy
         * against addinv() redrawing the inventory over doname()'s obuf.  JS
         * strings are values, so the copy is already implicit. */

        obj = (await addinv_core0(obj, null, false));
        if (inv_cnt(false) > INVLET_BASIC
            || (((obj.otyp | 0) !== LOADSTONE || !obj.cursed)
                && near_capacity() > prev_encumbr)) {
            /* C:1277-1279 — undo any merge which took place.
             * THIS IS THE ONLY RNG ON THE PATH: splitobj() -> next_ident()
             * draws `rnd(2) @ mkobj.c:521`. */
            if (obj.quan > oquan)
                obj = (await splitobj(obj, oquan));
            dropIt = true;
        } else {
            /* C:1282-1286 */
            if (g.flags?.autoquiver && !u.uquiver && !obj.owornmask
                && (is_missile(obj) || ammo_and_launcher(obj, u.uwep)
                    || ammo_and_launcher(obj, u.uswapwep)))
                await setuqwep(obj);
            /* C:1287-1288 */
            if (hold_msg || drop_fmt)
                await prinv(hold_msg, obj, oquan);
            update_inventory(); // C invent.c:1290, after the object stays in inventory.
            encumber_msg_sync();
            return obj;
        }
    }

    if (!dropIt)
        return obj;

    /* C:1296 `drop_it:` */
    if (drop_fmt)
        await pline(_fmt1(drop_fmt, drop_arg));
    obj.nomerge = 0;
    if (can_reach_floor(true) || u.uswallow) {
        await dropx(obj);
    } else {
        // C invent.c:1302-1303: the shared impact path owns breakage and landing.
        freeinv(obj);
        await hitfloor(obj, false);
    }
    return null; /* C: "might be gone" */
}

/* C's drop_fmt/drop_arg pair is a printf format plus its single %s argument
 * ("You catch, but drop, the %s." + simpleonames(otmp)).  Callers in this port
 * pass the same shape; substitute the one argument. */
function _fmt1(fmt, arg) {
    return String(fmt).replace('%s', arg == null ? '' : String(arg));
}


/* C ref: invent.c:2698 count_unidentified — number of not-fully-identified items
 * in a chain. */
function count_unidentified(chain) {
    let n = 0;
    for (let o = chain; o; o = o.nobj)
        if (not_fully_identified(o)) n++;
    return n;
}

/* C ref: invent.c:2637 fully_identify_obj(otmp) — the single port is
 * js/cmd.js's fully_identify_obj (imported above); no local copy. */

/* C ref: invent.c:2650 identify(otmp) — identify one object and give immediate
 * feedback via prinv (the "n - a blessed scroll of enchant weapon." line). */
export async function identify(otmp) {
    fully_identify_obj(otmp);
    await prinv(null, otmp, 0);
    return 1;
}

export async function identify_pack(id_limit, learning_id) {
    const g = game;
    const unid_cnt = count_unidentified(g.invent);
    if (!unid_cnt) {
        await pline(`You have already identified ${learning_id ? 'the rest' : 'all'} of your possessions.`);
    } else if (!id_limit || id_limit >= unid_cnt) {
        /* Identify everything (C invent.c:2724-2730). */
        let remaining = unid_cnt;
        for (let o = g.invent; o; o = o.nobj) {
            if (not_fully_identified(o)) {
                await identify(o);
                if (--remaining < 1) break;
            }
        }
    } else {
        // C invent.c:2734-2744: traditional selection precedes the menu.
        let n = 0;
        if (g.flags.menu_style === MENU_TRADITIONAL)
            do {
                n = await ggetobj('identify', identify, id_limit, false);
                if (n < 0) break;
            } while ((id_limit -= n) > 0);
        if (n === 0 || n < -1) await menu_identify(id_limit);
    }
    update_inventory(); // C invent.c:2744, including the nothing-to-identify arm.
}

/* C invent.c:2669 query_objlist(..., SIGNAL_NOMENU, ...) returns -1 when the
 * filter matched nothing, which is NOT the same answer as 0 ("menu shown, no
 * selection"); this sentinel keeps the two apart across the JS return value. */
const NO_ELIGIBLE_ITEMS = Symbol('query_objlist n == -1');

function wait_synch() {}

/* C ref: invent.c:2659 menu_identify(id_limit) — pop the "What would you like to
 * identify first?" PICK_ANY menu over the not_fully_identified inventory, take up
 * to id_limit picks, and identify each (firing its discover_object exercise +
 * prinv). */
async function menu_identify(id_limit) {
    const g = game;
    let first = true;
    /* C invent.c:2663 `int n, i, first = 1, tryct = 5;` — the re-prompt budget. */
    let tryct = 5;
    while (id_limit > 0) {
        const prompt = `What would you like to identify ${first ? 'first' : 'next'}?`;
        const picks = await _identify_objlist_menu(prompt);
        if (picks === null) break; /* ESC — player quit the menu (n == -2) */
        if (picks === NO_ELIGIBLE_ITEMS) {
            /* C n == -1 — query_objlist found nothing to offer. */
            await pline('That was all.');
            break;
        }
        if (picks.length === 0) {
            if (!--tryct) {
                await pline("That's enough tries!");
                break;
            }
            await pline('Choose an item; use ESC to decline.');
            continue;
        }
        let n = picks.length;
        if (n > id_limit) n = id_limit;
        for (let i = 0; i < n; i++, id_limit--)
            await identify(picks[i]);
        /* C invent.c:2680-2681: if (id_limit) wait_synch(); — display sync, no RNG. */
        if (id_limit)
            wait_synch();
        /* C invent.c:2682 — `first = 0` sits INSIDE the n > 0 arm, so a
         * no-selection round re-asks "identify first?", not "next?". */
        first = false;
    }
}

/* C ref: invent.c query_objlist over gi.invent with not_fully_identified filter,
 * PICK_ANY | USE_INVLET | INVORDER_SORT, rendered as a full-screen tty menu with
 * per-class headers (Scrolls, Potions, Rings, ...).  Returns the array of picked
 * objects (in menu order), or null if the player ESCs (C n == -2).
 *
 * The menu consumes navigation keystrokes (letter toggles, page keys) but no RNG;
 * RNG is fired only later by identify() per pick. */
async function _identify_objlist_menu(promptText) {
    /* tty_display_nhwindow(NHW_MENU) does no flush_screen/bot(): the status
     * rows under the menu stay as of the last real flush while the just-read
     * scroll's useup (setnotworn) has only set the pending botl flag. */
    const releaseFlush = use_last_flush_snapshot();
    try {
        return await _identify_objlist_menu_body(promptText);
    } finally { releaseFlush(); }
}

async function _identify_objlist_menu_body(promptText) {
    const g = game;
    /* Collect in inventory-letter order; query_objlist uses SORTLOOT_INVLET
     * unless sortloot:full requests SORTLOOT_LOOT (pickup.c:1079-1086). */
    let eligible = [];
    for (let o = g.invent; o; o = o.nobj)
        if (not_fully_identified(o)) eligible.push(o);
    /* C pickup.c query_objlist: `if (!olist ...) return 0;` / the n == -1
     * SIGNAL_NOMENU arm — with nothing to offer, NO window is opened at all
     * and the caller gets -1.  Distinguish that from "menu shown, nothing
     * picked" (n == 0), which menu_identify handles very differently. */
    if (!eligible.length)
        return NO_ELIGIBLE_ITEMS;

    if (g._pending_message) {
        const full = String(g._pending_message);
        const joins = (g._topl_joins_src === full && Array.isArray(g._topl_joins))
            ? g._topl_joins : [];
        const segs = [];
        let start = 0;
        for (const j of joins) { segs.push(full.slice(start, j)); start = j + 2; }
        segs.push(full.slice(start));
        let page = segs[0];
        let stopped = false;
        for (let i = 1; i < segs.length; i++) {
            if (_topl_joins_committed(page, segs[i])) {
                page += '  ' + segs[i];
            } else {
                /* topl.c:232-235: ESC at a --More-- sets WIN_STOP; the later
                 * messages are suppressed and the menu's more() is a no-op
                 * (topl.c:150) until the next tty_nhgetch. */
                if (await topline_more_loop(page) === 27) { stopped = true; break; }
                page = segs[i];
            }
        }
        if (!stopped) await topline_more_loop(page);
        g._pending_message = '';
    }

    /* C invent.c:447-469: full sorting compares subclass and discovery
     * before names, so armor such as cloaks precedes suits regardless of
     * inventory letter. Reuse the same comparator as other object menus. */
    if (g.flags.sortloot === 'f') {
        const classes = [...new Set(eligible.map(o => o.oclass | 0))];
        eligible = classes.flatMap(oc => _sortloot_within_class(eligible, oc));
    }

    /* C pickup.c:1101 query_objlist — `pack = strcpy(packbuf, flags.inv_order)`
     * and the `do { ... pack++; } while (sorted && *pack)` loop walk the CLASS
     * ORDER, not the invent order: one pass per class in flags.inv_order, each
     * pass scanning the sorted item list for members of that class.
     * flags.inv_order is def_inv_order (options.c:136-140):
     *   COIN, AMULET, WEAPON, ARMOR, FOOD, SCROLL, SPBOOK, POTION, RING, WAND,
     *   TOOL, GEM, ROCK, BALL, CHAIN
     * so TOOL_CLASS(6) comes AFTER WAND_CLASS(11) even though gi.invent is held
     * in invlet order (invent.c reorder_invent) and a tool can hold an early
     * letter.  Grouping by first-appearance-in-invent instead put the hero's
     * magic marker ('m', TOOL) and wished large box ('Q', TOOL) at the TOP of
     * page 1, shifting every later row down by 4. */
    /* oclass values, NOT otyps (objclass.h enum objclass_classes, generated from
     * defsym.h:466-483 OBJCLASS()); listed in def_inv_order sequence. */
    const INV_ORDER = [
        12, /* COIN_CLASS   */ 5,  /* AMULET_CLASS */
        2,  /* WEAPON_CLASS */ 3,  /* ARMOR_CLASS  */
        7,  /* FOOD_CLASS   */ 9,  /* SCROLL_CLASS */
        10, /* SPBOOK_CLASS */ 8,  /* POTION_CLASS */
        4,  /* RING_CLASS   */ 11, /* WAND_CLASS   */
        6,  /* TOOL_CLASS   */ 13, /* GEM_CLASS    */
        14, /* ROCK_CLASS   */ 15, /* BALL_CLASS   */
        16, /* CHAIN_CLASS  */
    ];
    const present = new Set(eligible.map(o => o.oclass | 0));
    const classOrder = (g.flags.inv_order || INV_ORDER).filter(oc => present.has(oc));
    /* C invent.c:4789-4793 names[] (indexed by oclass), via let_to_name(). */
    const CLASS_HEADER = {
        1: 'Illegal objects', 2: 'Weapons', 3: 'Armor', 4: 'Rings',
        5: 'Amulets', 6: 'Tools', 7: 'Comestibles', 8: 'Potions',
        9: 'Scrolls', 10: 'Spellbooks', 11: 'Wands', 12: 'Coins',
        13: 'Gems/Stones', 14: 'Boulders/Statues', 15: 'Iron balls',
        16: 'Chains', 17: 'Venoms',
    };

    /* Build display rows: header + items, plus selection state per item. */
    const entries = []; /* {obj, selected} */
    function buildLines() {
        const lines = [];
        lines.push(menu_heading_text(promptText));
        lines.push('');
        for (const oc of classOrder) {
            lines.push(menu_heading_text(CLASS_HEADER[oc] ?? 'Items'));
            for (const e of entries) {
                if ((e.obj.oclass | 0) !== oc) continue;
                const letter = String.fromCharCode(e.obj.invlet | 0);
                /* C wintty.c:2722-2726 tty_end_menu: "cut off any lines that are too
                 * long" -- str is cut to cols - 2 = 78 characters. */
                lines.push(`${letter} ${e.selected ? (e.count > 0 ? '#' : '+') : '-'} ${e.name}`.slice(0, 78));
            }
        }
        return lines;
    }
    for (const o of eligible) { obj_to_glyph(o); entries.push({ obj: o, selected: false }); }
    /* C pickup.c:1137 query_objlist add_menu(..., doname_with_price(curr), ...):
     * each row is the REAL doname text (BUC/enchantment/"(being worn)"/known
     * type names), not the appearance-only partial namer, so the menu width
     * and hence offx match C.  Names are built once in class order; a toggle
     * cannot change them. */
    for (const oc of classOrder)
        for (const e of entries)
            if ((e.obj.oclass | 0) === oc)
                e.name = await doname_with_price(e.obj);

    const LETTERSET = new Map(entries.map(e => [e.obj.invlet | 0, e]));
    let escaped = false;
    /* C ref: win/tty/getline.c:213 — a MENU_SEARCH's tty_getlin ends with
     * clear_nhwindow(WIN_MESSAGE), which blanks SCREEN row 0.  When this menu
     * is full-screen (offx == 0) row 0 is the prompt line, and
     * process_menu_window only repaints on a page change — which this renderer
     * now handles by restoring the erased text. */
    let titleErased = false;
    const SCREEN_ROWS = 24;
    /* C tty_end_menu: lmax = min(52, rows - 1) = 23 lines per page. */
    const PAGE_CONTENT = SCREEN_ROWS - 1;
    let pageIndex = 0;
    /* offx is computed ONCE when the window is displayed and does not change
     * as selections toggle (a '+'/'-' swap cannot change a line's width), so
     * measure it from the un-erased first frame. */
    const GEOM_LINES = buildLines();
    /* wintty.c:1908-1921 offx = min(40, cols - maxcol - 1), clamped to 0; a
     * widest line of 77+ columns (maxcol = len + 2 >= 79) gives offx 0 and the
     * menu paints on a cleared screen (wintty.c:1407). */
    const FULL_SCREEN = (GEOM_LINES.length + 1) >= SCREEN_ROWS
        || GEOM_LINES.some(l => l.length >= 77);
    const WIN_COL = FULL_SCREEN
        ? 1
        : tty_window_offx([...GEOM_LINES.slice(0, PAGE_CONTENT), '(end)'], 'end');
    /* The entries whose row falls on the current page (line 0 is the prompt, line 1 the
     * separator, then one heading line per class ahead of its items). */
    const onPage = () => {
        const onPage = new Set();
        let line = 2;
        for (const oc of classOrder) {
            line++;
            for (const e of entries) {
                if ((e.obj.oclass | 0) !== oc) continue;
                if (line >= pageIndex * PAGE_CONTENT && line < (pageIndex + 1) * PAGE_CONTENT) onPage.add(e);
                line++;
            }
        }
        return onPage;
    };
    const frameRows = () => {
        const lines = buildLines();
        const pageCount = Math.max(1, Math.ceil(lines.length / PAGE_CONTENT));
        /* C windows.c:1803 add_menu() applies MENUCOLOR to each item row (not headings/prompt);
         * wintty.c:1449 paints it from char 4 on. */
        const pageLines = lines.slice(pageIndex * PAGE_CONTENT, (pageIndex + 1) * PAGE_CONTENT)
            .map(l => (/^. [-+#] /.test(l)
                /* a selected marker is coloured too (recorded: `n \x1b[36m+\x1b[39m ...`) */
                ? menucolor_row(/^. [+#*] /.test(l) ? `${l.slice(0, 2)}\x01${l.slice(2)}` : l) : l));
        const footer = (pageCount > 1) ? `(${pageIndex + 1} of ${pageCount})` : '(end)';
        const footerRow = pageLines.length;
        if (FULL_SCREEN) {
            /* C: term_clear_screen() then each row at column offx + 1 = 1. */
            const rows = new Array(SCREEN_ROWS).fill('');
            for (let i = 0; i < pageLines.length; i++) rows[i] = ` ${pageLines[i]}`;
            rows[footerRow] = ` ${footer}`;
            if (titleErased) rows[0] = '';
            return { rows, footer, footerRow, pageCount };
        }
        const winLines = pageLines.slice();
        winLines.push(footer);
        if (titleErased) winLines[0] = '';
        const rows = build_window_screen(winLines, WIN_COL, g.u?.uac ?? 0, undefined,
            g._spellPwStale || undefined).split('\n');
        return { rows, footer, footerRow, pageCount };
    };
    /* C wintty.c:1334-1399 counting/count/reset_count */
    let counting = false, count = 0, reset_count = true;
    while (true) {
        if (reset_count) { counting = false; count = 0; }
        else reset_count = true;
        const { rows, footer, footerRow, pageCount } = frameRows();
        g._screen_output = rows.join('\n');
        set_cursor(WIN_COL + footer.length + (pageCount > 1 ? 0 : 1), footerRow);

        const k = await nhgetch();
        const raw = typeof k === 'number' ? k : (k?.charCodeAt(0) ?? 0);
        const kc = onPage().has(LETTERSET.get(raw)) ? raw : map_menu_cmd(raw);
        /* C wintty.c:1570-1602: digits build a count (not a selector here). */
        if (kc >= 48 && kc <= 57 && !onPage().has(LETTERSET.get(raw))) {
            count = count * 10 + (kc - 48);
            if (count !== 0) { counting = true; reset_count = false; }
            continue;
        }
        /* C: ESC while counting only stops the count. */
        if (kc === 27) g._ttyDismissMore = 1; /* getline.c:245-247 */
        if (kc === 27 && counting) continue;
        if (kc === 27 /* ESC */) { escaped = true; break; }
        /* RETURN / ENTER finishes the menu with current selections. */
        if (kc === 10 || kc === 13) break;
        /* C wintty.c:1621-1650: Space accepts only on the last page. */
        if ([32, 62, 60, 94, 124].includes(kc)) {
            if (kc === 32 && pageIndex === pageCount - 1) break;
            const target = kc === 94 ? 0 : kc === 124 ? pageCount - 1 : pageIndex + (kc === 60 ? -1 : 1);
            if (target >= 0 && target < pageCount && target !== pageIndex) {
                pageIndex = target; titleErased = false;
            }
            continue;
        }
        /* C wintty.c:1739-1747 group_accel: query_objlist passes each item's
         * def_oc_syms class symbol as its group accelerator (pickup.c:1135-1136);
         * invert_all() flips every entry of that class, on any page. */
        const GACC = ' )[="(%!?+/$*`0_';
        if (kc > 32 && kc < 127 && !onPage().has(LETTERSET.get(kc))) {
            const gch = String.fromCharCode(kc);
            const goc = GACC.indexOf(gch) + 1;
            const grp = goc > 1 ? entries.filter(en => (en.obj.oclass | 0) === goc) : [];
            if (grp.length) {
                for (const en of grp) {
                    if (en.selected) { en.selected = false; en.count = -1; }
                    else if (counting && count > 0) { en.count = count; en.selected = true; }
                    else if (!counting) en.selected = true;
                }
                continue;
            }
        }
        const e = LETTERSET.get(kc);
        if (onPage().has(e)) {
            /* C toggle_menu_curr(.., counting, count) */
            if (e.selected) {
                if (counting && count > 0) e.count = count;
                else { e.selected = false; e.count = -1; }
            } else if (counting && count > 0) { e.count = count; e.selected = true; }
            else if (!counting) e.selected = true;
            continue;
        }
        const BULK = {
            46: [false, 'set'], 45: [false, 'clear'], 64: [false, 'invert'],
            44: [true, 'set'], 92: [true, 'clear'], 126: [true, 'invert'],
        };
        if (BULK[kc]) {
            const [pageOnly, mode] = BULK[kc];
            const targets = pageOnly ? onPage() : entries;
            for (const t of targets)
                { t.selected = mode === 'invert' ? !t.selected : mode === 'set'; if (!t.selected) t.count = -1; }
            continue;
        }
        if (kc === 0x3a /* ':' MENU_SEARCH */) {
            /* C ref: win/tty/wintty.c:1700-1730 — tty_getlin("Search for:"),
             * "*%s*", then pmatchi() over the whole mlist toggling every
             * selectable hit.  query_objlist opens this menu PICK_ANY
             * (pickup.c:1101), so it never finishes early.  pmatchi matches
             * what tty_add_menu STORED, "%c - %s" (wintty.c:2596-2600): no
             * leading margin space (that is paint-time putchar(' ')), and a
             * literal " - " rather than the '+' a selected row is drawn with. */
            await menu_search_case(
                'ANY',
                entries.map((en) => ({
                    str: `${String.fromCharCode(en.obj.invlet | 0)} - ${en.name}`,
                    en,
                })),
                () => frameRows().rows,
                (curr) => { curr.en.selected = !curr.en.selected; });
            titleErased = true;
            continue;
        }
        /* C: non-accelerator keys ring the bell inside xwaitforspace (getline.c
         * :250-254) and are re-read there, so a live count survives them. */
        reset_count = false;
    }
    g._pending_message = '';
    /* C wintty.c:966-980 erase_menu_or_text: a full-screen menu closes
     * with docrt() and flush_screen(1).  windows.c:1859-1863 keeps bot()
     * disabled through that redraw, including its hallucinated glyphs. */
    if (FULL_SCREEN) {
        const oldBotDisabled = g._bot_disabled;
        g._bot_disabled = true;
        try {
            await docrt(false, g._screen_output);
            await flush_screen(1);
        } finally {
            g._bot_disabled = oldBotDisabled;
        }
        status_r1_menu_docrt();
        g._r1botAfterMap = g.level;
        g._r1textOver = true;
        g._statusBlankAfterDocrt = true;
    }
    await flush_screen(1);
    if (escaped) return null; /* C n == -2 */
    /* C tty_select_menu / process_menu_window hand back the picks in MENU order
     * (the class-grouped order query_objlist added them), not invent order. */
    const picked = [];
    for (const oc of classOrder)
        for (const e of entries)
            if (e.selected && (e.obj.oclass | 0) === oc) picked.push(e.obj);
    return picked;
}


export async function getobj(verb, callback, flags) {
    return await getObjFromGetobj(verb, callback, flags);
}

export async function feel_cockatrice(obj, force) {
    if (!will_feel_cockatrice(obj, force)) return;
    /* C invent.c:4348-4361: "the <cockatrice> corpse" via corpse_xname */
    const name = corpse_xname(obj, null, 4 /* CXN_PFX_THE */);
    if (game.youmonst?.data && poly_when_stoned(game.youmonst.data))
        await pline(`You touched ${name} with your bare ${makeplural(body_part(HAND))}.`);
    else
        await pline(`Touching ${name} is a fatal mistake...`);
    await instapetrify_eat(`touching ${killer_xname(obj)} bare-handed`);
}



/* C invent.c:1430 delobj() — use the canonical object extraction/deallocation
 * path, including resistance, map redraw, and nested-container cleanup. */
export async function delobj(otmp) {
    return await delobj_core(otmp);
}

const _CORPSE_OTYP = 265;

const _PM_CHICKATRICE = 9;

const _PM_COCKATRICE = 10;

/* C ref: hack.h Underwater = !!u.uinwater.  Mirrored locally (established
 * convention: js/cmd.js and js/pickup.js each carry their own copy rather
 * than import one another for a one-line field read). */
function _Underwater() {
    return !!(game.u && game.u.uinwater);
}

async function _feel_cockatrice_lk(otmp, force_touch) {
    if (!will_feel_cockatrice(otmp, force_touch)) return;
    const name = corpse_xname(otmp, null, CXN_PFX_THE);
    if (poly_when_stoned(game.youmonst?.data))
        await pline(`You touched ${name} with your bare ${makeplural(body_part(HAND))}.`);
    else
        await pline(`Touching ${name} is a fatal mistake...`);
    /* C invent.c:4357 overwrites kbuf with killer_xname(otmp) — "a cockatrice
     * corpse", the indefinite article — for the killer; the CXN_PFX_THE form
     * above is only for the two plines. */
    await instapetrify(`touching ${killer_xname(otmp)} bare-handed`);
}

/* C ref: invent.c:4105 look_here(int obj_cnt, unsigned lookhere_flags).
 * Full body: uswallow stomach-contents arm, the region/trap pre-message, the
 * Blind preamble, dfeature line construction, the lava/pool/no-object
 * short-circuit, the skip_objects (pile_limit) summary, the single-object
 * arm, and the multi-object arm.
 *
 * obj_cnt > 0 means "autopickup in progress" (only used for skip_objects'
 * threshold test and its "two/a few/several/many [more]" wording).
 *
 * Returns ECMD_TIME when blind, otherwise ECMD_OK; callers decide whether
 * that result controls command timing. Pickup ignores it, as in C. */
export async function look_here(obj_cnt = 0, lookhere_flags = LOOKHERE_NOFLAGS) {
    const g = game;
    const u = g.u || {};
    const x = u.ux | 0, y = u.uy | 0;
    const blind = Blind();
    const verb = blind ? 'feel' : 'see';
    const picked_some = !!(lookhere_flags & LOOKHERE_PICKED_SOME);
    let skip_dfeature = !!(lookhere_flags & LOOKHERE_SKIP_DFEATURE);
    const pile_limit = (g.flags && g.flags.pile_limit != null) ? (g.flags.pile_limit | 0) : 5;
    const skip_objects = pile_limit > 0 && obj_cnt >= pile_limit;

    g.context = g.context || {};

    /* C invent.c:4120-4160 — u.uswallow: "Contents of <mon>'s stomach". */
    if (u.uswallow) {
        const mtmp = u.ustuck;
        const possessive = s_suffix(mon_nam(mtmp));
        const stomach = mbodypart(mtmp, STOMACH);
        const suffix = `${possessive} ${stomach}`; /* fbuf sans "Contents of " (12 chars) */
        await pline(`You ${blind ? 'try' : 'look around'} to ${verb} what is lying in ${suffix}.`);
        let otmp = mtmp ? (mtmp.minvent ?? null) : null;
        if (otmp) {
            for (let o = otmp; o; o = o.nobj) {
                if ((o.otyp | 0) === _CORPSE_OTYP) await _feel_cockatrice_lk(o, false);
            }
            // C invent.c:4153: MINV_ALL | PICK_NONE includes the hero and
            // suppresses prices while naming items with the engulfer's body.
            await display_minventory(mtmp, blind ? 'You feel:' : `Contents of ${suffix}:`);
        } else {
            await pline(`You ${verb} no objects here.`);
        }
        return Blind() ? ECMD_TIME : ECMD_OK;
    }

    /* C invent.c:4162-4178 — visible poison-gas/vapor cloud and/or a seen
     * trap: "There is <a poison gas cloud>[ and ][an arrow trap] here." */
    if (!skip_objects) {
        const reg = visible_region_at(x, y);
        let trap = t_at(x, y);
        if (trap && !trap.tseen) trap = null;
        if (reg || trap) {
            const regPart = reg ? `a ${reg_damg(reg) ? 'poison gas' : 'vapor'} cloud` : '';
            const joiner = (reg && trap) ? ' and ' : '';
            const trapPart = trap ? an(trapname(trap.ttyp | 0, false)) : '';
            /* C invent.c:4171 There("is %s%s%s here.", ...) */
            await There('is %s%s%s here.', regPart, joiner, trapPart);
        }
    }

    let otmp = g.level?.levelObjects?.[x]?.[y] ?? null;
    const df = _dfeature_at(x, y);
    let dfeature = df ? df.text : null;
    /* C invent.c:4180-4181 — Underwater suppresses "pool of water". */
    if (dfeature === 'pool of water' && _Underwater()) dfeature = null;

    /* C invent.c:4184-4218 — the Blind preamble. Runs before arm selection,
     * for every arm. */
    if (blind) {
        const drift = Is_airlevel(u.uz) || Is_waterlevel(u.uz);
        if (dfeature && dfeature.slice(0, 6) === 'altar ') {
            await pline('You try to feel what is here.');
        } else if (_surface_at(g.level?.at ? g.level.at(x, y) : {}) === ICE) {
            /* C invent.c:4190-4198. */
            if (!g.flags?.mention_decor || (g.iflags?.prev_decor | 0) === ICE)
                await force_decor(false);
            await pline('You try to feel what is on it.');
            skip_dfeature = true;
        } else {
            const cant_reach = !can_reach_floor(true);
            const surf = _surface_lk(x, y);
            const where = cant_reach ? 'lying beneath you' : 'lying here on the ';
            const onwhat = cant_reach ? '' : surf;
            await pline(`You try to feel what is ${drift ? 'floating here' : where}${drift ? '' : onwhat}.`);
            if (dfeature && !drift && dfeature === surf) skip_dfeature = true;
        }
        const trap2 = t_at(x, y);
        if (!can_reach_floor(!!trap2 && is_pit(trap2.ttyp | 0))) {
            await pline("But you can't reach it!");
            return ECMD_OK;
        }
    }

    /* C invent.c:4220-4239 — "There <is/are> <a dfeature> here." */
    let fbuf = null;
    if (dfeature && !skip_dfeature) {
        const p = dfeature.indexOf(' ');
        const article0 = dfeature === 'molten lava' || dfeature === 'iron bars'
            || dfeature === 'ice' || dfeature.startsWith('frozen ')
            || (p >= 0 && dfeature.slice(p).toLowerCase() === ' ice');
        const phrase = article0 ? dfeature : an(dfeature);
        fbuf = `There ${vtense(phrase, 'are')} ${phrase} here.`;
    }

    /* C invent.c:4241-4250 — no object, or lava, or (pool && !Underwater). */
    if (!otmp || _is_lava_local(x, y) || (is_pool(x, y) && !_Underwater())) {
        if (fbuf) await pline(fbuf);
        await read_engr_at(x, y);
        if (!skip_objects && (blind || !dfeature))
            await pline(`You ${verb} no objects here.`);
        return Blind() ? ECMD_TIME : ECMD_OK;
    }
    /* we know there is something here */

    if (skip_objects) {
        /* C invent.c:4252-4276 */
        if (fbuf) await pline(fbuf);
        await read_engr_at(x, y);
        const quan1 = (otmp.quan == null ? 1 : (otmp.quan | 0)) === 1;
        if (obj_cnt === 1 && quan1) {
            await There('is %s object here.', picked_some ? 'another' : 'an');
        } else {
            const word = (obj_cnt === 2) ? 'two'
                : (obj_cnt < 5) ? 'a few'
                : (obj_cnt < 10) ? 'several' : 'many';
            await There('are %s%s objects here.', word, picked_some ? ' more' : '');
        }
        for (let o = otmp; o; o = o.nexthere) {
            if ((o.otyp | 0) === _CORPSE_OTYP && will_feel_cockatrice(o, false)) {
                const quan = o.quan == null ? 1 : (o.quan | 0);
                const subj = obj_cnt > 1 ? 'Including' : (quan > 1 ? "They're" : "It's");
                const heroData = (g.youmonst && g.youmonst.data) ? g.youmonst.data : null;
                const suffix = poly_when_stoned(heroData) ? '' : ', unfortunately';
                await pline(`${subj} ${corpse_xname(o, null, CXN_ARTICLE)}${suffix}.`);
                await _feel_cockatrice_lk(o, false);
                break;
            }
        }
    } else if (!otmp.nexthere) {
        /* C invent.c:4278-4285 — only one object. */
        if (fbuf) await pline(fbuf);
        await read_engr_at(x, y);
        await pline(`You ${verb} here ${(await doname_with_price(otmp))}.`);
        g.iflags = g.iflags || {};
        g.iflags.last_msg = PLNMSG_ONE_ITEM_HERE;
        if ((otmp.otyp | 0) === _CORPSE_OTYP) await _feel_cockatrice_lk(otmp, false);
    } else {
        // C invent.c:4286-4313: these are putstr lines in a menu window,
        // not plines joined onto the command topline.
        const lines = [
            ...(fbuf ? [fbuf, ''] : []),
            `${picked_some ? 'Other things' : 'Things'} that ${blind ? 'you feel' : 'are'} here:`,
        ];
        let felt = false;
        let o = otmp;
        for (; o; o = o.nexthere) {
            if ((o.otyp | 0) === _CORPSE_OTYP && will_feel_cockatrice(o, false)) {
                felt = true;
                lines.push(`${(await doname(o))}...`);
                break;
            }
            lines.push((await doname_with_price(o)));
        }
        await displayLookWindow(lines);
        if (felt) await _feel_cockatrice_lk(o, false); /* C reuses the loop var itself */
        await read_engr_at(x, y);
    }
    return Blind() ? ECMD_TIME : ECMD_OK;
}

// C ref: invent.c:4319 dolook(void) — explicit look-here command (':')
//   hide_unhide_msgtypes(TRUE, MSGTYP_MASK_REP_SHOW);
//   res = look_here(0, LOOKHERE_NOFLAGS);
//   hide_unhide_msgtypes(FALSE, MSGTYP_MASK_REP_SHOW);
//   return res;  // ECMD_OK or ECMD_TIME
export async function dolook() {
    hide_unhide_msgtypes(true, MSGTYP_MASK_REP_SHOW);
    const res = await look_here();
    hide_unhide_msgtypes(false, MSGTYP_MASK_REP_SHOW);
    return res;
}

/* C invent.c:1465-1475 sobj_at — find a particular type of object at a map
 * location by walking the per-tile nexthere chain (svl.level.objects[x][y]),
 * returning the first obj whose otyp matches, or NULL (null) if none.
 *   for (otmp = svl.level.objects[x][y]; otmp; otmp = otmp->nexthere)
 *       if (otmp->otyp == otyp) break;
 *   return otmp;
 * game.level.levelObjects[x][y] is the JS mirror of C's objects[x][y]
 * (js/game.js GameMap.levelObjects). When the tile chain is empty the loop
 * exhausts and we return null, matching C's NULL pointer. */
export function sobj_at(otyp, x, y) {
    let otmp = game.level?.levelObjects?.[x]?.[y] ?? null;
    while (otmp) {
        if (otmp.otyp === otyp)
            break;
        otmp = otmp.nexthere ?? null;
    }
    return otmp;
}

/* C invent.c:1479-1489 — find the next object of a given type in one of the
 * two object chains.  The traversal advances before testing, matching C's
 * `obj` starting point and preserving its null behavior. */
export function nxtobj(otmp, otyp, by_nexthere) {
    let next = otmp;
    do {
        next = by_nexthere ? next?.nexthere : next?.nobj;
        if (!next)
            break;
    } while ((next.otyp | 0) !== (otyp | 0));
    return next || null;
}

/* C ref: invent.c:3580 tally_BUCX() */
export function tally_BUCX(list, by_nexthere) {
    const t = { b: 0, u: 0, c: 0, x: 0, o: 0, j: 0 };
    const goldX = !!game.flags?.goldX;
    for (; list; list = by_nexthere ? list.nexthere : list.nobj) {
        if (_is_cleric())
            list.bknown = ((list.oclass | 0) !== _COIN_CLASS) ? 1 : 0;
        if (list.pickup_prev) t.j++;
        if ((list.oclass | 0) === _COIN_CLASS) {
            if (goldX) t.x++; else t.u++;
            continue;
        }
        if (!list.bknown) t.x++;
        else if (list.blessed) t.b++;
        else if (list.cursed) t.c++;
        else t.u++;
    }
    return t;
}

export function perm_invent_toggled(negated) {
    const g = game;
    if (!g.iflags?.window_inited)
        return;
    if (negated) {
        if (g.WIN_INVEN != null)
            g.WIN_INVEN = null;
    }
}

export function u_have_novel() {
    for (let o = game.invent; o; o = o.nobj)
        if (o.otyp === SPE_NOVEL_OTYP) return o;
    return null;
}

export const NOINVSYM = 0x23; // '#'; hack.h

// invent.c:4855. Only the first gold stack is moved; a second stack participates
// in ordinary lettering, just as in C. gl.lastinvnr lives at game._lastinvnr.
export function reassign() {
    let i;
    let obj, prevobj, goldobj;

    prevobj = goldobj = null;
    for (obj = game.invent; obj; prevobj = obj, obj = obj.nobj) {
        if (obj.oclass === COIN_CLASS) {
            goldobj = obj;
            if (prevobj)
                prevobj.nobj = goldobj.nobj;
            else
                game.invent = goldobj.nobj;
            break;
        }
    }
    for (obj = game.invent, i = 0; obj; obj = obj.nobj, i++)
        obj.invlet = (i < 26) ? ('a'.charCodeAt(0) + i) : (i < 52) ? ('A'.charCodeAt(0) + i - 26) : NOINVSYM;
    if (goldobj) {
        goldobj.invlet = GOLD_SYM;
        goldobj.nobj = game.invent;
        game.invent = goldobj;
    }
    if (i >= 52)
        i = 52 - 1;
    game._lastinvnr = i;
}

function inventory_window_function() {
    const procs = game.windowprocs;
    if (typeof procs?.win_update_inventory === 'function')
        return procs.win_update_inventory;
    if (!procs || procs.name === 'tty')
        return tty_update_inventory;
    if (procs.name === 'shim')
        return shim_update_inventory;
    throw new Error(`Unported inventory window: ${procs.name}`);
}

// receive the call which disables their persistent inventory window.
export function update_inventory() {
    if (!game.program_state.in_moveloop)
        return;
    if (suppress_map_output())
        return;

    // Legacy partial iflags objects omit C's zero-initialized scalar.
    const save_suppress_price = game.iflags.suppress_price ?? 0;
    game.iflags.suppress_price = 0;
    const win_update_inventory = inventory_window_function();
    win_update_inventory(0);
    game.iflags.suppress_price = save_suppress_price;
}

/* C invent.c:1587 o_on(id, objchn) — the object with that o_id anywhere on the
 * chain, recursing into containers. */
export function o_on(id, objchn) {
    for (let o = objchn; o; o = o.nobj) {
        if ((o.o_id >>> 0) === (id >>> 0))
            return o;
        if (Has_contents(o)) {
            const temp = o_on(id, o.cobj);
            if (temp)
                return temp;
        }
    }
    return null;
}

export function count_contents(container, nested, quantity, everything, newdrop) {
    let shoppy = false;
    if (!everything && !newdrop) {
        let top = container;
        while ((top.where | 0) === OBJ_CONTAINED && top.ocontainer) top = top.ocontainer;
        const loc = _get_obj_location_shk(top, 0);
        if ((top.where | 0) === OBJ_FLOOR && loc) shoppy = costly_spot(loc.x, loc.y);
    }
    let count = 0;
    for (let ot = container?.cobj; ot; ot = ot.nobj) {
        if (nested && Has_contents(ot))
            count += count_contents(ot, nested, quantity, everything, newdrop);
        if (everything || ot.unpaid || (shoppy && !ot.no_charge))
            count += quantity ? ot.quan : 1;
    }
    return count;
}

export async function stackobj(obj) {
    if (!obj)
        return;
    const xi = obj.ox | 0, yi = obj.oy | 0;
    const cell = game.level?.levelObjects?.[xi];
    for (let otmp = cell ? cell[yi] : null; otmp; otmp = otmp.nexthere) {
        if (otmp !== obj && (await _merged_floor(obj, otmp)))
            break;
    }
}

async function _merged_floor(survivor, victim) {
    if (!(await mergable(survivor, victim)))
        return false;

    /* C: age is quantity-weighted unless lit or globby. */
    if (!victim.lamplit && !victim.globby) {
        const sq = survivor.quan | 0, vq = victim.quan | 0;
        if (sq + vq > 0)
            survivor.age = Math.trunc((((survivor.age | 0) * sq)
                                       + ((victim.age | 0) * vq)) / (sq + vq));
    }
    if (!survivor.globby)
        survivor.quan = (survivor.quan | 0) + (victim.quan | 0);
    /* C: gold re-weighs and forgets bknown; puddings keep their owt. */
    if ((survivor.oclass | 0) === 12 /* COIN_CLASS */) {
        survivor.owt = weight(survivor);
        survivor.bknown = 0;
    } else if (!survivor.globby) {
        survivor.owt = weight(survivor);
    }

    remove_object(victim);

    if (victim.timed)
        obj_stop_timers(victim);

    /* C: identification states union; the `discovered` pline is OBJ_INVENT-only. */
    if ((victim.known | 0) !== (survivor.known | 0))
        survivor.known = 1;
    if ((victim.rknown | 0) !== (survivor.rknown | 0))
        survivor.rknown = 1;
    if ((victim.bknown | 0) !== (survivor.bknown | 0))
        survivor.bknown = 1;
    if (victim.bypass)
        survivor.bypass = 1;
    /* C invent.c:930 obfree(obj, otmp) — the absorbed object is FREED, not just
     * unlinked.  Omitting it left the victim alive in whatever else still
     * referenced it (a timer, above; C's own dealloc_obj is what stops those). */
    await obfree(victim, survivor);
    /* Bump bridge objs_deleted.count to match C's delobj counter (mirrors
     * js/cmd.js:6249 _bumpObjsDeletedCount_useupf and js/potion.js:1782's
     * useup_potion).  obfree() bottoms out in js/dokick.js's obfree ->
     * js/mklev.js dealloc_obj(), and dealloc_obj deliberately does NOT bump
     * this counter itself (js/mklev.js:3609's own comment: a single-point bump
     * there would double-count every existing hand-bumped caller).  This is
     * the one and only free this function performs, so bump once, here. */
    const store = game.__bridge__ || (game.__bridge__ = {});
    const key = 'objs_deleted.count';
    const cur = store[key] !== undefined ? Number(store[key]) : 0;
    store[key] = String(cur + 1);
    return true;
}

/* C ref: hacklib.c:804 strstri() — case-insensitive substring search */
function strstri_cmd(haystack, needle) {
    const idx = String(haystack ?? '').toLowerCase().indexOf(String(needle ?? '').toLowerCase());
    return idx >= 0 ? idx : null;
}

/* C ref: invent.c:2118 noarmor(boolean report_uskin).  The uskin arm is
 * dragon-scale-embedded-in-skin (polymorph); this port has no uskin writer, so
 * only the plain arm can be reached. */
async function noarmor(_report_uskin) {
    const u = game.u || {};
    if (!u.uskin || !_report_uskin) {
        await pline('You are not wearing any armor.');
        return;
    }
    /* C invent.c:4582-4592 — shorten the two dragon-scale spellings before
     * reporting the embedded skin armor. */
    let skin = _ia_simpleonames(u.uskin);
    if (skin.startsWith('set of ')) skin = skin.slice(7);
    const p = strstri_cmd(skin, ' dragon ');
    if (p !== null) {
        skin = skin.slice(0, p + 1) + skin.slice(p + 8);
    }
    await You(`are not wearing armor but have ${skin} embedded in your skin.`);
}

async function _dispinv_one(obj) {
    await pline((await xprname(obj, null, String.fromCharCode(obj.invlet | 0), true, 0, 0)));
}



/* C ref: invent.c:1560 doprgold() — the '$' command. */
export async function doprgold() {
    const g = game;
    const umoney = money_cnt(g.invent ?? null) | 0;
    /* "Only list the money you know about." */
    const hmoney = hidden_gold(false) | 0;
    if (g.flags?.verbose) {
        let buf = umoney
            ? `Your wallet contains ${umoney} ${currency(umoney)}`
            : 'Your wallet is empty';
        if (hmoney)
            buf += `, ${umoney ? 'and' : 'but'} you have ${hmoney} `
                 + `${umoney ? 'more' : currency(hmoney)} stashed away in your pack`;
        await pline(`${buf}.`);
    } else {
        const total = umoney + hmoney;
        if (total)
            await pline(`You are carrying a total of ${total} ${currency(total)}.`);
        else
            await pline('You have no money.');
    }
    /* C invent.c:1589 shopper_financial_report() (shk.c:1003) */
    await shopper_financial_report();
    /* C invent.c:1591-1597 — the 'm $' form displays the carried coin stack
     * through dispinv_with_action("$", FALSE, NULL).  The shared inventory
     * renderer supplies the coin line and dispatches the selected stack's
     * context-sensitive item actions, just like the other inventory commands. */
    if (umoney && game.iflags?.menu_requested) {
        // wintty.c:1921: acknowledge the financial report before the menu.
        if (g._pending_message) await force_more(g._pending_message);
        g._pending_message = '';
        await dispinv_with_action('$', false, null);
    }
    /* C: this handler returns ECMD_OK on every path; rhack() maps it. */
    return ECMD_OK;
}

/* C ref: invent.c:2035 doprwep() — the ')' command. */
export async function doprwep() {
    const g = game;
    const u = g.u || {};
    if (!u.uwep) {
        await pline(`You are ${empty_handed()}.`);
        return ECMD_OK;
    }
    if (!g.iflags?.menu_requested) {
        /* C: prinv((char *) 0, uwep, 0L); and the twoweap second line. */
        await prinv(null, u.uwep, 0);
        if (u.twoweap && u.uswapwep)
            await prinv(null, u.uswapwep, 0);
        return ECMD_OK;
    }
    /* C invent.c:2044-2057 — the 'm )' form lists uwep/uswapwep/uquiver in a
     * SORTLOOT_INUSE menu.  obj_to_let() is called on uwep only: under fixinv
     * it letters the whole pack if it needs to, so the other two just read
     * their invlet. */
    let lets = obj_to_let(u.uwep);
    if (u.uswapwep) lets += String.fromCharCode(u.uswapwep.invlet | 0);
    if (u.uquiver) lets += String.fromCharCode(u.uquiver.invlet | 0);
    await dispinv_with_action(lets, true, null);
    /* C: this handler returns ECMD_OK on every path; rhack() maps it. */
    return ECMD_OK;
}

/* C ref: invent.c:2170 doprarm() — the '[' command. */
export async function doprarm() {
    const g = game;
    if (!wearing_armor()) {
        await noarmor(true);
        return ECMD_OK;
    }
    const u = g.u;
    /* C: SORTPACK_INUSE order — uarm, uarmc, uarms, uarmh, uarmg, uarmf, uarmu. */
    const worn = [u.uarm, u.uarmc, u.uarms, u.uarmh, u.uarmg, u.uarmf, u.uarmu]
        .filter(Boolean);
    /* C invent.c:4618-4632 — each slot's letter comes from obj_to_let(), which
     * under !fixinv re-letters the whole pack (invent.c:2861) before the
     * letter is read. */
    const lets = worn.map((o) => obj_to_let(o)).join('');
    if (worn.length === 1 && !g.iflags?.menu_requested) {
        await _dispinv_one(worn[0]);
        return ECMD_OK;
    }
    /* C invent.c:2185-2205 — n > 1 (or the 'm [' form): the inuse-ordered
     * NHW_MENU.  C builds `lets` in SORTPACK_INUSE slot order; the menu itself
     * re-sorts by inuse_classify() rating, so the order of the letters only
     * decides which objects are shown. */
    await dispinv_with_action(lets, true, null);
    /* C: this handler returns ECMD_OK on every path; rhack() maps it. */
    return ECMD_OK;
}

/* C ref: invent.c:2215 doprring() — the '=' command. */
export async function doprring() {
    const g = game;
    const u = g.u || {};
    if (!u.uleft && !u.uright) {
        await pline('You are not wearing any rings.');
        return ECMD_OK;
    }
    /* C invent.c:2224-2247: a single ring still goes through
     * dispinv_with_action(lets, use_inuse_mode, "Ring"), and use_inuse_mode is
     * only forced TRUE for two rings, a meat ring, or the 'm' prefix — but
     * dispinv_with_action's menumode is keyed on strlen(lets), so one ring is
     * still the message_menu line. */
    const worn = [u.uright, u.uleft].filter(Boolean);
    /* C invent.c:4653-4662 — lets[] via obj_to_let() (re-letters under !fixinv). */
    const lets = worn.map((o) => obj_to_let(o)).join('');
    if (worn.length === 1 && !g.iflags?.menu_requested) {
        await _dispinv_one(worn[0]);
        return ECMD_OK;
    }
    /* C invent.c:2237-2247 — the alternate label is "Ring" for one and "Rings"
     * for two, replacing inuse_headers[4] ("Accessories") for this call. */
    await dispinv_with_action(lets, true, worn.length === 1 ? 'Ring' : 'Rings');
    /* C: this handler returns ECMD_OK on every path; rhack() maps it. */
    return ECMD_OK;
}

/* C ref: invent.c:2260 dopramulet() — the '"' command. */
export async function dopramulet() {
    const g = game;
    const u = g.u || {};
    if (!u.uamul) {
        await pline('You are not wearing an amulet.');
        return ECMD_OK;
    }
    /* C invent.c:4690 — lets[0] = obj_to_let(uamul) (re-letters under !fixinv). */
    const lets = obj_to_let(u.uamul);
    if (!g.iflags?.menu_requested) {
        await _dispinv_one(u.uamul);
        return ECMD_OK;
    }
    /* C invent.c:2275-2281 — "using display_inventory() instead of prinv()
     * allows player to use 'm "' to force a menu and be able to choose amulet
     * in order to perform a context-sensitive item action". */
    await dispinv_with_action(lets, true, 'Amulet');
    /* C: this handler returns ECMD_OK on every path; rhack() maps it. */
    return ECMD_OK;
}

const INUSE_HEADERS = ['', 'Miscellaneous', 'Worn Armor',
                       'Wielded/Readied Weapons', 'Accessories'];

/* C ref: invent.c:4698 tool_being_used(obj). */
function tool_being_used(obj) {
    if (((obj.owornmask | 0) & (W_TOOL_C | W_SADDLE_C)) !== 0)
        return true;
    if ((obj.oclass | 0) !== OCLASS_TOOL)
        return false;
    /* C: "[don't actually need to check uwep here; caller catches it]" */
    return obj === (game.u?.uwep ?? null) || !!obj.lamplit
        || ((obj.otyp | 0) === OTYP_LEASH && !!obj.leashmon);
}

/* C ref: invent.c:2158 is_worn(obj). */
function is_worn_obj(obj) {
    const W_ARMOR_C = W_ARM_C | W_ARMC_C | W_ARMH_C | W_ARMS_C
                    | W_ARMG_C | W_ARMF_C | W_ARMU_C;
    const W_ACCESSORY_C = W_AMUL_C | W_RINGL_C | W_RINGR_C | W_TOOL_C;
    const W_WEAPONS_C = W_WEP_C | W_SWAPWEP_C | W_QUIVER_C;
    return ((obj.owornmask | 0)
            & (W_ARMOR_C | W_ACCESSORY_C | W_SADDLE_C | W_WEAPONS_C)) !== 0;
}

/* C ref: invent.c:2167 is_inuse(obj).  carried() holds for every object on the
 * gi.invent chain, which is the only list these menus walk. */
export function is_inuse(obj) { return _ld_carried(obj) && (is_worn_obj(obj) || tool_being_used(obj)); }

/* C ref: invent.c:70 inuse_classify(sort_item, obj) — returns C's
 * { sort_item->inuse, sort_item->orderclass } pair.  USE_RATING(test) is
 * "++rating; if (test) goto assign_rating", so `rating` is this table's
 * 1-based row number and `altclass` the value ++altclass had reached by then.
 * Falling off the end sets rating 0 / altclass -1. */
function inuse_classify(obj) {
    const w_mask = (obj.owornmask | 0)
                 & ((W_AMUL_C | W_RINGL_C | W_RINGR_C | W_TOOL_C)   /* W_ACCESSORY */
                    | (W_WEP_C | W_SWAPWEP_C | W_QUIVER_C)          /* W_WEAPONS */
                    | (W_ARM_C | W_ARMC_C | W_ARMH_C | W_ARMS_C
                       | W_ARMG_C | W_ARMF_C | W_ARMU_C));          /* W_ARMOR */
    const URIGHTY = ((game.u?.uhandedness) === RIGHT_HANDED);
    const main_ring = URIGHTY ? W_RINGR_C : W_RINGL_C;
    const off_ring = URIGHTY ? W_RINGL_C : W_RINGR_C;
    /* [altclass, test] in USE_RATING order; rating = index + 1. */
    const RATINGS = [
        /* "Miscellaneous" — a lamp or leash may be doubly used, as a tool and
         * also wielded/quivered; these two tests require !w_mask so that
         * used-as-weapon takes precedence. */
        [1, !w_mask && (obj.otyp | 0) === OTYP_LEASH && !!obj.leashmon],
        [1, !w_mask && (obj.oclass | 0) === OCLASS_TOOL && !!obj.lamplit],
        /* "Armor" */
        [2, w_mask & W_ARMU_C],   /* WORN_SHIRT */
        [2, w_mask & W_ARMF_C],   /* WORN_BOOTS */
        [2, w_mask & W_ARMG_C],   /* WORN_GLOVES */
        [2, w_mask & W_ARMH_C],   /* WORN_HELMET */
        [2, w_mask & W_ARMS_C],   /* WORN_SHIELD */
        [2, w_mask & W_ARMC_C],   /* WORN_CLOAK */
        [2, w_mask & W_ARM_C],    /* WORN_ARMOR */
        /* "Weapons" */
        [3, w_mask & W_QUIVER_C],
        [3, w_mask & W_SWAPWEP_C],
        [3, w_mask & W_WEP_C],
        /* "Accessories" */
        [4, w_mask & W_TOOL_C],   /* WORN_BLINDF */
        [4, w_mask & off_ring],
        [4, w_mask & main_ring],
        [4, w_mask & W_AMUL_C],   /* WORN_AMUL */
    ];
    for (let i = 0; i < RATINGS.length; i++)
        if (RATINGS[i][1])
            return { inuse: i + 1, orderclass: RATINGS[i][0] };
    return { inuse: 0, orderclass: -1 };
}

/* C ref: invent.c:2964 dispinv_with_action() with use_inuse_ordering TRUE and
 * a menu (len != 1 || iflags.menu_requested).  Returns the selected object, or
 * null; the caller runs itemactions() on it exactly as C does at invent.c:2998.
 *
 * `lets` is C's letter filter (null shows everything in use); `altLabel`
 * replaces inuse_headers[4] ("Accessories") for the duration of the call, which
 * is how '=' labels its section "Ring"/"Rings" and '"' labels it "Amulet". */
async function dispinv_inuse_menu(lets, altLabel, want_reply = true) {
    const g = game;
    const u = g.u || {};
    const headers = INUSE_HEADERS.slice();
    if (altLabel)
        headers[4] = altLabel;
    /* sortloot()'s filter (invent.c:3189) over the invent chain. */
    const chain = [];
    for (let o = g.invent; o; o = o.nobj)
        chain.push(o);
    let entries = chain.filter(is_inuse);
    /* C invent.c:3190-3204 — inuse_only with no wielded weapon inserts a fake
     * "bare hands" object at the head of invent so that sortloot can place it
     * in the primary-weapon slot; it needs custom formatting below. */
    let fakeobj = null;
    if (!u.uwep) {
        fakeobj = { _inuse_fakeobj: true, oclass: 0, otyp: 0,
                    invlet: HANDS_SYM.charCodeAt(0), owornmask: W_WEP_C };
        entries.unshift(fakeobj);
    }
    /* SORTLOOT_INUSE (invent.c:413-428): rating descending, stable. */
    const classified = entries.map((obj, indx) => {
        const c = inuse_classify(obj);
        return { obj, indx, inuse: c.inuse, orderclass: c.orderclass };
    });
    classified.sort((a, b) => (b.inuse - a.inuse) || (a.indx - b.indx));
    /* C invent.c:416-419 — inuse_classify() runs only inside sortloot_cmp(),
     * and qsort() never calls the comparator for a single element (invent.c:
     * 635), so a lone entry keeps orderclass 0 == prevorderclass and
     * display_pickinv() emits no class heading (invent.c:3289). */
    if (classified.length === 1)
        classified[0].orderclass = 0;
    /* C invent.c:3208-3218 — if the fake bare hands is the only thing in the
     * sorted list, drop it (so a menu is never built out of it alone). */
    if (fakeobj && classified.length === 1 && classified[0].obj === fakeobj)
        classified.length = 0;
    const hand = (u.uhandedness === RIGHT_HANDED) ? 'right' : 'left';
    const windowLines = [];
    const lineItems = [];
    let inusecount = 0, prevorderclass = 0;
    for (const srt of classified) {
        const obj = srt.obj;
        /* C invent.c:3271-3272 — "for showing a set of specific letters, skip
         * ones not in the set". */
        if (lets && !lets.includes(String.fromCharCode(obj.invlet | 0)))
            continue;
        if (!inusecount++) {
            windowLines.push(menu_heading_text('Inventory in use'));
            lineItems.push(null);
        }
        if (srt.orderclass !== prevorderclass) {
            windowLines.push(menu_heading_text(headers[srt.orderclass] ?? ''));
            lineItems.push(null);
            prevorderclass = srt.orderclass;
        }
        if (obj === fakeobj) {
            /* C invent.c:3311-3320 — "%s %s (no weapon)". */
            const hands = makeplural_objnam(body_part(HAND));
            windowLines.push(`${HANDS_SYM} - ${u.uarmg ? 'gloved' : 'bare'} `
                             + `${hands} (no weapon)`);
        } else {
            let txt = await _pickinv_item_text(obj, hand);
            /* C wintty.c:1383-1390,1475-1483 show_obj_syms: with
             * iflags.use_menu_glyphs (menu_objsyms 2 'entries' / 3 'both')
             * the entry's object glyph (invent.c:3316 obj_to_glyph ->
             * map_glyphinfo) replaces the "-" separator at str[2], drawn in
             * glyphinfo.gm.sym.color.  This menu always carries identifier-0
             * heading lines ("Inventory in use", inuse_headers[]), so the
             * conditional modes (bit 4) draw none; the fake bare-hands entry
             * passes nul_glyphinfo (invent.c:3312) and keeps its plain "-". */
            if (g.iflags?.use_menu_glyphs
                && !((g.iflags.menuobjsyms | 0) & 4)) {
                const og = obj_to_glyph(obj);
                const sym = og.ch;
                const gc = g.iflags?.use_color === false ? 8 : og.color | 0;
                const symTxt = gc === 0 ? `\x1b[${(g.iflags?.wc2_darkgray ?? true) ? 90 : 34}m${sym}\x1b[39m`
                    : (gc >= 1 && gc <= 6) ? `\x1b[${30 + gc}m${sym}\x1b[39m`
                    : (gc >= 9 && gc <= 15) ? `\x1b[${90 + gc - 8}m${sym}\x1b[39m` : sym;
                txt = txt.replace(/^(.) - /, (_m, c) => `${c} ${symTxt} `);
            }
            windowLines.push(txt);
        }
        lineItems.push(obj);
    }
    const special = inventory_special_choice(lets, want_reply);
    if (special) {
        windowLines.push(menu_heading_text('Special'),
            menucolor_row(`${String.fromCharCode(special.invlet)} - ${special.text}`));
        lineItems.push(null, special);
    }
    windowLines.push('(end)');
    lineItems.push(null);
    const selectables = new Set(lineItems.filter(Boolean)
                                        .map((it) => it.invlet | 0));
    const { selectedObj, cancelled, WIN_COL, winRows } =
        await _run_pickinv_menu(windowLines, lineItems, selectables, {pickNone: !want_reply});
    /* The fake bare-hands entry is not a real object; C's post-menu loop walks
     * gi.invent looking for the returned invlet and finds nothing, so no
     * itemactions() runs (invent.c:2993-3000). */
    return { selectedObj: (selectedObj === fakeobj) ? null : selectedObj,
             cancelled, WIN_COL, winRows };
}

// Rendering bridge while full display_pickinv (permanent inventory, wizard
// identification, glyphs and sortloot) is still being ported. The core entry
// below keeps C's char result and queue behavior; this is not its substitute.
async function _display_pickinv_window(lets, want_reply) {
    const g = game;
    g._pickinv_window = null;
    if (lets === '') lets = null;
    let n = lets != null ? lets.length : !g.invent ? 0 : !g.invent.nobj ? 1 : 2;
    if (n === 1 && !lets) n++;
    if (n === 0) {
        await pline('Not carrying anything.');
        return 0;
    }
    if (!_invlet_constant()) reassign();
    if (n === 1 && !g.iflags.force_invmenu && !g.iflags.menu_requested) {
        let otmp;
        for (otmp = g.invent; otmp; otmp = otmp.nobj)
            if (!lets || otmp.invlet === lets.charCodeAt(0)) break;
        if (!otmp) return 0;
        const text = await xprname(otmp, null, lets[0], true, 0, 0);
        if (!want_reply) {await pline(text); return 0;}
        const morc = await force_more(text, otmp.invlet);
        g._topl_win_stop = g._topl_win_stop_armed = false; /* wintty.c:2843 WIN_CANCELLED == WIN_STOP */
        return morc === otmp.invlet || morc === 27 ? morc : 0;
    }
    if (g.flags.sortloot !== 'i' && g.flags.sortpack !== false && !_Blind_cmd()
        && g.invent && g.invent.nobj) {
        /* The sort's comparator classifies (observe_object) each object the
         * first time it is compared (invent.c:433-438), so the discovery
         * order follows libc qsort's comparison order: glibc msort splits
         * n into n/2 and n-n/2, sorting the first half then the second, then
         * merges.  Walk that order with the class-order key. */
        const arr = [];
        for (let o = g.invent; o; o = o.nobj) arr.push(o);
        const order = g.flags.inv_order || INV_ORDER;
        const done = new Set();
        const cmp = (a, b) => {
            for (const o of [a, b]) if (!done.has(o)) { done.add(o); observe_object(o); }
            const k = (o) => { const i = order.indexOf(o.oclass | 0); return i < 0 ? 99 : i; };
            return k(a) - k(b);
        };
        const msort = (v) => {
            if (v.length <= 1) return v;
            const n1 = v.length >> 1;
            const l = msort(v.slice(0, n1)), r = msort(v.slice(n1));
            const out = [];
            while (l.length && r.length) out.push(cmp(l[0], r[0]) <= 0 ? l.shift() : r.shift());
            return out.concat(l, r);
        };
        msort(arr);
        /* C sorts once (invent.c:3207) and loot_xname()s each object at most
         * once per sort (invent.c:480-497).  The msort above has already
         * observed every object; inventory_menu_legacy's sortloot is that
         * one naming sort.  A second ranking sort here named every
         * same-class tin again, an extra tin_variety() rn2 (eat.c:1503). */
    }
    const result = g.flags.sortloot === 'i'
        ? await dispinv_inuse_menu(lets, INUSE_HEADERS[4], want_reply)
        : await inventory_menu_legacy({displayPickinv: true, lets, filter: o => !lets || lets.includes(String.fromCharCode(o.invlet)), pickNone: !want_reply, statusStaysBlank: !!want_reply && !g.program_state?.gameover, gameover: !!g.program_state?.gameover});
    g._pickinv_window = result;
    /* docorner() clears from offx, then row_refresh() restores the map glyphs
     * (wintty.c:3684-3710). The later bot() covers only the status text;
     * render_status() leaves the restored map tail when finalx did not shrink
     * (wintty.c:5251-5256). Retain that tail for corner menus too. */
    /* tty_dismiss_nhwindow -> docorner(offx, maxrow+1) erased status row 1 from
     * the menu's column, row_refresh() reprinted map y=20 there
     * (wintty.c:3684-3702), and bot() then rewrote the text; render_status
     * cl_end()s only when finalx shrank (wintty.c:5252-5255), so the map
     * stays past the status end. */
    if ((result.winRows | 0) >= 22 && _threeStatusLines())
        status_r1_docorner(Math.max(1, (result.WIN_COL | 0) - 1), true);
    return result.selectedObj ? result.selectedObj.invlet : result.cancelled ? 27 : 0;
}

// C invent.c:display_inventory. A queued key is tested against class symbols
// in lets, even though the window path filters inventory letters. Keep that C
// behavior. A failed selection clears CANNED, including during repeat input.
export async function display_inventory(lets, want_reply) {
    game._pickinv_window = null;
    const cmdq = cmdq_pop();
    if (cmdq) {
        if (cmdq.typ === CMDQ_KEY) {
            for (let otmp = game.invent; otmp; otmp = otmp.nobj)
                if (otmp.invlet === cmdq.key
                    && (!lets || lets.includes(def_oc_syms_chars[otmp.oclass])))
                    return otmp.invlet;
        }
        cmdq_clear(CQ_CANNED);
        return 0;
    }
    return await _display_pickinv_window(lets, want_reply);
}

// C invent.c:dispinv_with_action. Only the dispatcher owns context.move.
export async function dispinv_with_action(lets, use_inuse_ordering, alt_label) {
    let save_accessories = null, save_sortloot = null;
    const len = lets ? lets.length : 0;
    const menumode = len !== 1 || !!game.iflags.menu_requested;
    const save_force_invmenu = game.iflags.force_invmenu;
    if (use_inuse_ordering) {
        save_accessories = INUSE_HEADERS[4];
        save_sortloot = game.flags.sortloot;
        game.flags.sortloot = 'i';
        if (alt_label) INUSE_HEADERS[4] = alt_label;
    }
    game.iflags.force_invmenu = false;
    const c = await display_inventory(lets, menumode);
    if (use_inuse_ordering) {
        game.flags.sortloot = save_sortloot;
        INUSE_HEADERS[4] = save_accessories;
    }
    game.iflags.force_invmenu = save_force_invmenu;
    if (c && c !== 27) {
        for (let otmp = game.invent, nextobj; otmp; otmp = nextobj) {
            nextobj = otmp.nobj;
            if (otmp.invlet === c) {
                /* docrt's blank status rows persist into the itemactions menu
                 * (no flush_screen between, invent.c:2998). */
                const res = await itemactions(otmp);
                game._status_blanked = false;
                return res;
            }
        }
    }
    game._status_blanked = false;
    return ECMD_OK;
}

/* C ref: invent.c:4740 doprinuse() — the '*' / #seeall command.  "combines the
 * ')' + '[' + '=' + '"' + '(' commands; show inventory of all currently
 * wielded, worn, or used objects".  GENERALCMD|IFBURIED: no turn, no RNG. */
export async function doprinuse() {
    const g = game;
    let ct = 0;
    for (let o = g.invent; o; o = o.nobj)
        if (is_inuse(o)) { ++ct; break; }
    if (!ct) {
        await pline('You are not wearing or wielding anything.');
        return ECMD_OK;
    }
    await dispinv_with_action(null, true, null);
    /* C: this handler returns ECMD_OK on every path; rhack() maps it. */
    return ECMD_OK;
}

/* C ref: invent.c:4712 doprtool() — the '(' / #seetools command. */
export async function doprtool() {
    const g = game;
    const lets = [];
    for (let o = g.invent; o; o = o.nobj)
        if (tool_being_used(o)) {
            /* C invent.c:4727: sizeof lets is invlet_basic + 1. */
            if (lets.length >= 52)
                break;
            lets.push(obj_to_let(o));
        }
    if (!lets.length) {
        await pline('You are not using any tools.');
        return ECMD_OK;
    }
    await dispinv_with_action(lets.join(''), true, null);
    /* C: this handler returns ECMD_OK on every path; rhack() maps it. */
    return ECMD_OK;
}

export async function ddoinv() {
    return await dispinv_with_action(null, false, null);
}

/* C invent.c:5289 and pickup.c:1166: PICK_NONE inventory menus share the
 * existing tty layout/dismissal path. TtyMenu supplies heading attributes,
 * menu colors, line clipping, and per-page accelerator assignment. */
async function inventory_display_menu(menu) {
    const lines = [];
    for (let page = 0; page < menu.npages; ++page)
        lines.push(...menu._drawPage(page).map(line => line.slice(1)));
    lines.push('(end)');
    if (game._pending_message)
        await force_more(game._pending_message);
    game._pending_message = '';
    await _run_pickinv_menu(lines, lines.map(() => null), new Set(), { pickNone: true });
}

// C invent.c:5289: the empty monster/container inventory window.
// C invent.c:5295-5296 create_nhwindow(NHW_MENU); start_menu(win, MENU_BEHAVE_STANDARD) —
// TtyMenu constructor initializes fresh menu state.
async function invdisp_nothing(hdr, txt) {
    const menu = new TtyMenu();
    menu.add_menu_heading(hdr);
    menu.add_menu_str('');
    menu.add_menu_str(txt);
    menu.end_menu(null);
    await inventory_display_menu(menu);
}

/* C pickup.c:1024 query_objlist's PICK_NONE, no-USE_INVLET paths used by
 * display_cinventory/display_binventory. Reuse the inventory sort and name
 * functions; the actual object chains are never reordered. */
async function inventory_query_objects(title, items, sorted) {
    if (!items.length) return;
    const order = game.flags.inv_order || INV_ORDER;
    const loot = game.flags.sortloot === 'f' || game.flags.sortloot === 'l';
    let sortedItems = items;
    if ((loot || game.flags.sortpack) && items.length > 1) {
        // C sortloot_cmp classifies every compared object before naming rows.
        if (!_Blind_cmd())
            for (const obj of items) observe_object(obj);
        const sortOrder = game.flags.sortpack ? order
            : [12, 5, 4, 11, 8, 9, 10, 13, 7, 6, 2, 3, 14, 15, 16];
        const classes = [...sortOrder, 17];
        for (const obj of items)
            if (!classes.includes(obj.oclass)) classes.push(obj.oclass);
        sortedItems = classes.flatMap(oc => _sortloot_within_class(items, oc, loot));
    }
    const menu = new TtyMenu();
    let first = true;
    for (const oc of sorted ? order : [null]) {
        const group = sorted ? sortedItems.filter(obj => obj.oclass === oc) : sortedItems;
        if (sorted && group.length)
            menu.add_menu_heading(PICKINV_CLASS_HEADER[oc]);
        for (const obj of group) {
            obj_to_glyph(obj);
            menu.add_menu(obj, first && obj.oclass === OCLASS_COIN ? '$' : 0,
                          0, await _doname_with_price(obj));
            first = false;
        }
    }
    menu.end_menu(title);
    await inventory_display_menu(menu);
}

// C invent.c:5390: probing temporarily includes the container's trap in its name.
async function cinv_doname(obj) {
    let result = await doname(obj);
    if (obj.otrapped && result.length + 'trapped '.length + 1 <= QBUFSZ_CMD) {
        const lower = result.toLowerCase();
        const p = lower.indexOf(' locked'), q = lower.indexOf(' unlocked');
        if (p >= 0 && (q < 0 || p < q))
            result = result.slice(0, p) + result.slice(p).replace(' locked ', ' trapped locked ');
        else if (q >= 0)
            result = result.slice(0, q) + result.slice(q).replace(' unlocked ', ' trapped unlocked ');
        result = result.replace('an trapped ', 'a trapped ');
    }
    return result;
}

// C invent.c:5422: preserve the nonzero strncmp tests, including their bug.
function cinv_ansimpleoname(obj) {
    let result = ansimpleoname(obj);
    if (obj.otrapped) {
        if (!result.startsWith('a ')) result = result.replace('a ', 'a trapped ');
        else if (!result.startsWith('an ')) result = result.replace('an ', 'an trapped ');
        else if (!result.startsWith('the ')) result = result.replace('the ', 'the trapped ');
        else result = 'trapped ' + result;
    }
    return result;
}

// C invent.c:5445: wand-of-probing contents display, without recursive probing.
export async function display_cinventory(obj) {
    const title = await inventory_safe_qbuf('', 'Contents of ', ':', obj,
                                          cinv_doname, cinv_ansimpleoname, 'that');
    if (obj.cobj) {
        const items = [];
        for (let o = obj.cobj; o; o = o.nobj) items.push(o);
        await inventory_query_objects(title, items, true);
    } else {
        await invdisp_nothing(title, '(empty)');
    }
    obj.cknown = 1;
    return null; // PICK_NONE cannot select an object.
}

// C invent.c:5476: pass the query coordinates instead of C's temporary go.only.
function only_here(obj, x, y) {
    return obj.ox === x && obj.oy === y;
}

// C invent.c:5488: downward probing reveals submerged and buried objects.
export async function display_binventory(x, y, as_if_seen) {
    let underwhat = 'here', n2 = 0;
    const head = game.level.levelObjects?.[x]?.[y];
    if (is_pool_or_lava(x, y) && !Underwater() && head) {
        const liquid = hliquid(is_pool(x, y) ? 'water' : 'lava');
        if (!head.nexthere) {
            let plural = flooreffects_is_plural(head);
            await pline(`There ${plural ? 'are' : 'is'} ${await doname(head)} under the ${liquid} here.`);
            n2 = 1;
            if (pair_of(head)) plural = true;
            underwhat = plural ? 'under them' : 'beneath it';
        } else {
            const items = [];
            for (let obj = head; obj; obj = obj.nexthere) items.push(obj);
            await inventory_query_objects(`Things that are under the ${liquid} here:`, items, false);
            for (let obj = head; obj; obj = obj.nexthere) ++n2;
            underwhat = 'beneath them';
        }
    }
    const buried = [];
    for (let obj = game.level.buriedobjlist; obj; obj = obj.nobj) {
        if (only_here(obj, x, y)) {
            if (as_if_seen) observe_object(obj);
            buried.push(obj);
        }
    }
    if (buried.length)
        await inventory_query_objects(`Things that are buried ${underwhat}:`, buried, true);
    return buried.length + n2;
}

export async function display_minventory(mon, title) {
    const fallback = `${s_suffix(noit_Monnam(mon))} possessions:`;
    title ??= fallback;
    if (!mon.minvent && !engulfing_u(mon)) { await invdisp_nothing(title, '(none)'); return null; }
    const youmonst = game.youmonst ||= _hero_youmonst();
    youmonst.data = mon.data;
    game.iflags.suppress_price = (game.iflags.suppress_price || 0) + 1;
    const hand = (game.u.uhandedness === RIGHT_HANDED) ? 'right' : 'left';
    const items = [];
    for (let o = mon.minvent; o; o = o.nobj)
        items.push(o);
    // invent.c:170, pickup.c:1079: classify the whole list before naming rows.
    const loot = ['f', 'l'].includes(game.flags.sortloot ?? 'l');
    const sorting = loot || game.flags.sortpack;
    if (sorting && items.length > 1 && !_Blind_cmd())
        for (const obj of items) observe_object(obj);
    const windowLines = [menu_heading_text(title), ''];
    const lineItems = [null, null];
    let menuAccel = 'a'.charCodeAt(0);
    let first = true;
    for (const oclass of (game.flags.inv_order || PICKINV_CLASS_ORDER)) {
        const group = sorting ? _sortloot_within_class(items, oclass, loot)
            : items.filter(obj => obj.oclass === oclass);
        if (!group.length) continue;
        // C tty_end_menu: every 23 rows starts a new page's accelerators.
        if (windowLines.length % 23 === 0) menuAccel = 97;
        windowLines.push(menu_heading_text(PICKINV_CLASS_HEADER[oclass]));
        lineItems.push(null);
        for (const o of group) {
            obj_to_glyph(o);
            if (windowLines.length % 23 === 0) menuAccel = 97;
            const accel = first && (o.oclass | 0) === OCLASS_COIN
                ? '$' : String.fromCharCode(menuAccel);
            if (accel !== '$') menuAccel = menuAccel === 122 ? 65 : menuAccel + 1;
            first = false;
            windowLines.push(`${accel} - ${(await doname_body(o, hand))}`);
            lineItems.push(null);
        }
    }
    if (engulfing_u(mon)) {
        if (items.length) { windowLines.push(menu_heading_text(`${_digests(mon.data) ? 'Swallowed' : 'Engulfed'} Creatures`)); lineItems.push(null); }
        if (_cmd_Hallucination()) rn2_on_display_rng(monsPack.mons.length);
        windowLines.push(`> - ${an(await self_lookat())}`); lineItems.push(null);
    }
    youmonst.data = permonstTemplate(game.u.umonnum);
    --game.iflags.suppress_price;
    windowLines.push('(end)');
    lineItems.push(null);
    /* C wintty.c:1921-1922: acknowledge WIN_MESSAGE before the monster's
     * inventory menu overwrites it (probe_monster just called mstatusline). */
    if (game._pending_message)
        await force_more(game._pending_message);
    game._pending_message = ''; /* tty_clear_nhwindow(WIN_MESSAGE), :1940-1942 */
    await _run_pickinv_menu(windowLines, lineItems, new Set(), { pickNone: true });
    return null;
}

// C ref: invent.c:4745-4755 useup(obj)
export async function useup(obj) {
    /* Note:  This works correctly for containers because they (containers)
       don't merge. */
    if ((obj.quan | 0) > 1) {
        obj.in_use = false; /* no longer in use */
        obj.quan--;
        obj.owt = weight(obj);
        update_inventory();
    } else {
        await useupall(obj);
    }
}

export async function useupall(obj) {
    /* C invent.c:1312-1317: shared worn cleanup, inventory extraction, then
     * full object teardown including food/book state, contents and billing. */
    setnotworn(obj);
    await freeinv(obj);
    await obfree(obj, null);
}

// C ref: invent.c:4762-4794 useupf(obj, numused) — consume `numused` of a
// carried items via useup(), never useupf()).  Called unconditionally
// (unlike catch_lit/costly_spot's other call sites) so every helper it needs
// (billed/undiscovered items, containers, worn objects, etc.) rather than
// silently faking them — see delobj_core/obfree/splitobj source for the
// deferred paths.
// void useupf(struct obj *obj, long numused)
export async function useupf(obj, numused) {
    const g = game;
    const u = g.u;
    /* C invent.c:4766 — boolean at_u = u_at(obj->ox, obj->oy); */
    const at_u = u_at(obj.ox | 0, obj.oy | 0);
    let otmp;
    /* C invent.c:4770-4773 */
    if ((obj.quan | 0) > numused)
        otmp = await splitobj(obj, numused);
    else
        otmp = obj;
    /* C invent.c:4774 — if (!svc.context.mon_moving && costly_spot(otmp->ox, otmp->oy)) */
    const mon_moving = !!(g.context && g.context.mon_moving);
    if (!mon_moving && costly_spot(otmp.ox | 0, otmp.oy | 0)) {
        /* C invent.c:4775 — strchr(u.urooms, *in_rooms(otmp->ox, otmp->oy, 0)) */
        const rooms = in_rooms(otmp.ox | 0, otmp.oy | 0, 0);
        const firstRoom = rooms && rooms.length ? rooms[0] : 0;
        /* strchr(s, '\0') finds the terminator: an empty in_rooms() list
         * (first char NUL) is a hit in C, never a miss. */
        if ((firstRoom | 0) === 0
            || (u.urooms && u.urooms.indexOf(String.fromCharCode(firstRoom | 0)) !== -1))
            await addtobill(otmp, false, false, false);
        else
            await stolen_value(otmp, otmp.ox | 0, otmp.oy | 0, false, false);
    }
    /* C invent.c:4780 — delobj(otmp); */
    await delobj_core(otmp);
    /* C invent.c:4781-4782 — if (at_u && u.uundetected && hides_under(gy.youmonst.data)) hideunder(&gy.youmonst); */
    const ymData = g.youmonst && g.youmonst.data;
    if (at_u && u.uundetected && _hidesUnder_useupf(ymData))
        hideunder(g.youmonst);
}

/* C ref: invent.c:1430 delobj(obj) → delobj_core(obj, FALSE). */
export async function delobj_core(obj, force = false) {
    /* C invent.c:1446 — if (!force && obj_resists(obj, 0, 0)) { obj->in_use = 0; return; } */
    if (!force && obj_resists(obj, 0, 0)) {
        obj.in_use = 0;
        return;
    }
    const update_map = (obj.where | 0) === 1;
    _objExtractSelf_useupf(obj);
    if (update_map) {
        maybe_unhide_at(obj.ox | 0, obj.oy | 0);
        newsym(obj.ox | 0, obj.oy | 0);
    }
    await obfree(obj, null);
}

// C ref: shk.c:3470-3600 addtobill(obj, ininv, dummy, silent) and
// shk.c:3800 stolen_value(obj, x, y, peaceful, silent) — the two shop-billing
// arms of useupf (invent.c:4774-4779).
//
// CORRECTION (the previous comment here was FALSE).  It claimed "costly_spot
// shk.c:3585.  Two separate facts were conflated:
//   * costly_spot has THREE bodies in js/ — js/shk.js:545 `return false`,
//     js/dokick.js:1142 a throw, and js/cmd.js:16791.  The one THIS file's
//     useupf resolves is the local js/cmd.js:16791 definition (a local
//     declaration shadows the import), and it does NOT always return false: it
//     returns false only while level.flags.has_shop is unset, and THROWS on a
//     shop level.  So the guard above these stubs is itself a landmine.
//     arrives through the pickup path.  useupf's arm stays unreached today.
//
// KNOWN GAP — NOT PORTED, AND C DRAWS RNG HERE.  addtobill consumes
// rn2(SIZE(honored) - 1) = rn2(4) at shk.c:3612, inside append_honorific(),
// reached from the shk.c:3574 "For you, <honorific>; only ..." price quote.
// append_honorific(shk.c:3612)` immediately before `>pline @
// addtobill(shk.c:3585)`.  Porting it faithfully needs the shop-billing
// subsystem this file does not have — shop_keeper/inhishop/ESHK (js/cmd.js:
// 16787 shop_keeper is itself a throw), add_one_tobill, get_cost,
// contained_cost (js/shk.js:546 throws), costly_gold, currency, Shknam,
// set_voice — so this port CANNOT emit that draw, and says so rather than
// faking it.  The bodies below return C's no-action value (void; both C
// functions return nothing) instead of throwing: an exception here would cost
// single missing rn2(4) that a no-op costs.  Anything reaching these will
// signal the old throw was pretending to provide.
/* C shk.c:3490 addtobill(obj, ininv, dummy, silent).  NO LONGER A GAP — the
 * shop-billing subsystem lives in js/shk.js; forward to the canonical port. */
const addtobill = shk_addtobill;

const MAXOCLASSES_C = 18;

const PM_CLERIC_ROLEIDX = 6;

export function count_buc(list, type, filterfunc) {
    let count = 0;
    const cleric = ((game.flags?.initrole ?? -1) | 0) === PM_CLERIC_ROLEIDX;
    const goldX = !!(game.flags && game.flags.goldX);
    for (let o = list; o; o = o.nobj) {
        /* priests always know bless/curse state */
        if (cleric)
            o.bknown = ((o.oclass | 0) !== COIN_CLASS_C) ? 1 : 0;
        /* some actions exclude some or most items */
        if (filterfunc && !filterfunc(o))
            continue;
        /* coins are either uncursed or unknown based upon option setting */
        if ((o.oclass | 0) === COIN_CLASS_C) {
            if (type === (goldX ? BUCT_UNKNOWN : BUCT_UNCURSED))
                ++count;
            continue;
        }
        /* check whether this object matches the requested type */
        if (!o.bknown ? (type === BUCT_UNKNOWN)
            : o.blessed ? (type === BUCT_BLESSED)
            : o.cursed ? (type === BUCT_CURSED)
            : (type === BUCT_UNCURSED))
            ++count;
    }
    return count;
}



/* C ref: invent.c:2156 is_worn(otmp) —
 *   otmp->owornmask & (W_ARMOR | W_ACCESSORY | W_SADDLE | W_WEAPONS)
 * query_category's ofilter when WORN_TYPES is passed (menu_remarm). */
export function is_worn(otmp) {
    return (((otmp.owornmask | 0) & (W_ARMOR | W_ACCESSORY | W_SADDLE | W_WEAPONS)) !== 0);
}

// C ref: invent.c:3827 dotypeinv() — the 'I' command.
// "What type of object do you want an inventory of?"
// Since flags.menu_style defaults to MENU_FULL (options.c:7263), the non-
// traditional branch runs: query_category(prompt, gi.invent, i, &pick_list,
// PICK_ONE) (invent.c:3873) builds an NHW_MENU window.  The menu lists one
// entry per object class the hero carries (in flags.inv_order order, skipping
// classes with no items), then a blank separator, then BUC entries (B/U/C/X)
// for whichever BUC categories are present.  ESC cancels with no inventory
// shown.  GENERALCMD: consumes no turn and no RNG.
// C ref: pickup.c:1226 query_category(); pickup.c:1350-1377 class loop;
//   pickup.c:1379-1433 BUC entries; invent.c:3853 tally_BUCX().
export async function dotypeinv() {
    const g = game;
    const u = g.u || {};
    /* C invent.c:3844-3856: inspect the live inventory, including an empty chain. */
    /* C invent.c:3838 — billx = *u.ushops && doinvbill(0) */
    const billx = !!(u.ushops?.[0]) && !!(await shk_doinvbill(0));
    const u_carried = count_unpaid(g.invent), u_floor = count_unpaid(g.fobj);
    const u_buried = count_unpaid(g.level?.buriedobjlist);
    const any_unpaid = u_carried + u_floor + u_buried; // invent.c:3849-3852
    let carried;   /* array of oclass values present, ordered by INV_ORDER */
    let bcnt = 0, ucnt = 0, ccnt = 0, xcnt = 0;
    if (g.invent) {
        const present = new Set();
        for (let o = g.invent; o; o = o.nobj) {
            const oc = o.oclass | 0;
            present.add(oc);
        }
        bcnt = count_buc(g.invent, BUCT_BLESSED, null);
        ucnt = count_buc(g.invent, BUCT_UNCURSED, null);
        ccnt = count_buc(g.invent, BUCT_CURSED, null);
        xcnt = count_buc(g.invent, BUCT_UNKNOWN, null);
        carried = [...(g.flags?.inv_order || INV_ORDER), 17 /* INCLUDE_VENOM */].filter((oc) => present.has(oc));
    } else {
        carried = [];
    }
    /* C ref: invent.c:3844 — "aren't carrying anything" if no invent. */
    if (!g.invent && !billx) {
        await pline("You aren't carrying anything.");
        return ECMD_OK;
    }
    /* C invent.c:3883-3946 — menustyle:traditional asks a yn_function with the
     * carried class symbols (then BUC/unpaid letters) instead of a category
     * menu; letters after the <esc> are accepted but not displayed. */
    let tradChoice = null;
    // C pickup.c:1257: query_category returns no selection for an empty chain.
    if (!g.invent && (g.flags?.menu_style ?? MENU_FULL) >= MENU_FULL) return ECMD_OK;
    if (g.flags?.menu_style === MENU_TRADITIONAL || g.flags?.menu_style === MENU_COMBINATION) {
        const unpaidT = any_unpaid;
        const jcntT = count_justpicked(g.invent);
        let types = '';
        for (let o = g.invent; o; o = o.nobj) {
            const sym = def_oc_syms_chars[o.oclass | 0];
            if (!types.includes(sym)) types += sym;
        }
        let class_count = types.length;
        if (unpaidT || billx || bcnt + ccnt + ucnt + xcnt !== 0 || jcntT) types += ' ';
        if (unpaidT) types += 'u';
        if (billx) types += 'x';
        if (bcnt) types += 'B';
        if (ucnt) types += 'U';
        if (ccnt) types += 'C';
        if (xcnt) types += 'X';
        if (jcntT) types += 'P';
        class_count = types.length;
        let extra = '\x1b';
        if (!unpaidT) extra += 'u';
        if (!billx) extra += 'x';
        if (!bcnt) extra += 'B';
        if (!ucnt) extra += 'U';
        if (!ccnt) extra += 'C';
        if (!xcnt) extra += 'X';
        if (!jcntT) extra += 'P';
        for (let i = 1; i < 18; i++)
            if (!types.includes(def_oc_syms_chars[i])) extra += def_oc_syms_chars[i];
        const typesAll = types + extra;
        let c;
        if (class_count > 1) {
            c = await yn_function('What type of object do you want an inventory of?',
                typesAll, '\0', true);
            if (c === '\0') {
                g._pending_message = '';
                await flush_screen(1);   /* clear_nhwindow(WIN_MESSAGE) */
                return ECMD_OK;
            }
        } else {
            c = unpaidT ? 'u' : billx ? 'x' : types[0];
        }
        if (c === 'x' || (c === 'X' && billx && !xcnt)) {
            if (billx) { await shk_doinvbill(1); return ECMD_OK; }
            await pline(`No used-up objects${unpaidT ? ' on your shopping bill' : ''}.`);
            return ECMD_OK;
        }
        if (c === 'u' || (c === 'U' && unpaidT && !ucnt)) {
            if (unpaidT)
                await dounpaid(u_carried, u_floor, u_buried);
            else
                await You('are not carrying any unpaid objects.');
            return ECMD_OK;
        }
        if (typesAll.indexOf(c) > typesAll.indexOf('\x1b')) {
            const before = { B: 'known to be blessed ', U: 'known to be uncursed ',
                C: 'known to be cursed ' }[c];
            const after = c === 'X' ? ' whose blessed/uncursed/cursed status is unknown'
                : c === 'P' ? ' that were just picked up' : '';
            await You(`have no ${before ?? (after ? '' : 'such ')}objects${after}.`);
            return ECMD_OK;
        }
        tradChoice = c;
    }
    /* C pickup.c:1280-1309 — one category with at most one BUC category is
     * returned directly, so no category window or dismissal key is consumed. */
    const directCategory = g.invent && count_categories(g.invent, false) === 1
        && [bcnt, ccnt, ucnt, xcnt].filter(n => n > 0).length <= 1
        && count_unpaid(g.invent) === 0
        && !billx;   /* C pickup.c:1289 !do_usedup */
    /* Build the menu window lines.
     * C ref: pickup.c:1307 create_nhwindow(NHW_MENU); the title (qstr) is the
     * prompt, passed to end_menu(win, qstr) and shown reverse-video on row 0. */
    const prompt = 'What type of object do you want an inventory of?';
    const windowLines = [];
    windowLines.push(menu_heading_text(prompt));  /* row 0: end_menu prompt, wintty.c:2688 */
    windowLines.push('');                          /* blank line after title */
    /* One menu entry per carried class: "<invlet> - <ClassName>".
     * C ref: pickup.c:1350-1370 — invlet starts at 'a', increments per class. */
    let invlet = 97; /* 'a' */
    for (const oc of carried) {
        /* C pickup.c:1362-1364: let_to_name(.., how != PICK_NONE && menu_head_objsym) */
        let cname = OCLASS_NAME[oc];
        if (g.iflags?.menu_head_objsym)
            cname += ' '.repeat(Math.max(0, 7 - cname.length)) + `  ('${def_oc_syms_chars[oc]}')`;
        windowLines.push(menucolor_row(`${String.fromCharCode(invlet++)} - ${cname}`));
    }
    /* BUC cluster: separated by a blank line, in alphabetical B/C/U/X order
     * but C emits B, then C, then U, then X (pickup.c:1405-1433).             */
    /* C pickup.c:1379-1391 — UNPAID_TYPES is always requested (invent.c:3859);
     * do_unpaid = count_unpaid(olist) and its 'u' row precedes the BUC rows,
     * sharing the blank separator. */
    const unpaidCnt = g.invent ? count_unpaid(g.invent) : 0;
    if (unpaidCnt || billx || bcnt || ccnt || ucnt || xcnt) {
        windowLines.push('');
        if (unpaidCnt) windowLines.push(menucolor_row('u - Unpaid items'));
        /* C pickup.c:1393-1400 — BILLED_TYPES row */
        if (billx) windowLines.push(menucolor_row('x - Unpaid items already used up'));
        if (bcnt) windowLines.push(menucolor_row('B - Items known to be Blessed'));
        if (ccnt) windowLines.push(menucolor_row('C - Items known to be Cursed'));
        if (ucnt) windowLines.push(menucolor_row('U - Items known to be Uncursed'));
        if (xcnt) windowLines.push(menucolor_row('X - Items of unknown Bless/Curse status'));
    }
    /* C invent.c:3853-3868 tally_BUCX's jcnt -> JUSTPICKED; pickup.c:1433-1445
     * adds the 'P' row last, after the BUC cluster (and its separator). */
    const jcnt = g.invent ? count_justpicked(g.invent) : 0;
    if (jcnt && !directCategory && tradChoice === null) {
        if (!(unpaidCnt || billx || bcnt || ccnt || ucnt || xcnt)) windowLines.push('');
        windowLines.push(menucolor_row(jcnt === 1
            ? `P - Just picked up: ${(await doname(find_justpicked(g.invent)))}`
            : 'P - Items you just picked up'));
    }
    windowLines.push('(end)');
    /* C wintty.c:2728-2734 tty_end_menu: reserve the two margin cells,
     * truncating each stored entry before computing the window geometry.
     * SGR is JS's rendering metadata, not part of C's curr->str. */
    for (let i = 0; i < windowLines.length; i++) {
        let col = 0;
        windowLines[i] = windowLines[i].replace(/\x1b\[[0-9;]*m|[\s\S]/g,
            ch => ch.startsWith('\x1b') || col++ < 78 ? ch : '');
    }
    const WIN_COL = tty_window_offx(windowLines, 'end');
    const uac = u.uac ?? 0;
    /* C wintty.c:1927 — `!iflags.menu_overlay` drops the NHW_MENU to offx 0 and
     * clears the whole screen: one-space margin, "(end) " footer. */
    const tiFullScreen = WIN_COL === 1 || game.iflags?.menu_overlay === false
        || game.iflags?.menu_overlay === 0;
    const tiBuild = (lines) => tiFullScreen
        ? lines.map((ln) => (ln === '' ? '' : ' ' + ln)).join('\n')
        : build_window_screen(lines, WIN_COL, uac);
    const screenOutput = tiBuild(windowLines);
    /* Cursor after '(end)': WIN_COL + len('(end)') + 1, row = last line. */
    const endRow = windowLines.length - 1;
    const endCursorCol = tiFullScreen ? 1 + '(end) '.length : WIN_COL + 5 + 1;
    /* C wintty.c:1700-1730 MENU_SEARCH: getline.c:213 blanks row 0 (the window's
     * title with it) and process_menu_window does not repaint the page, so once
     * a search has run the title stays erased. */
    let typeinvTitleErased = false;
    const typeinvBlankTitle = () => tiBuild(['', ...windowLines.slice(1)]);
    const showTypeinvMenu = async () => {
        g._screen_output = typeinvTitleErased ? typeinvBlankTitle() : screenOutput;
        set_cursor(endCursorCol, endRow);
    };
    if (!directCategory && tradChoice === null)
        await showTypeinvMenu();
    /* Read the dismiss/selection keypress.  ESC cancels (goto doI_done) with no
     * inventory shown — C ref: invent.c:3874 if(!n) goto doI_done.
     *
     * This was a BARE nhgetch(), so ANY key closed the menu.  C's is
     * query_category -> select_menu(win, PICK_ONE) -> process_menu_window
     * (wintty.c:1336): a key outside the response set rings tty_nhbell() and the
     * same page stays up (:1738).  Only the selectors of the rows this menu
     * actually added, their group accelerators, and CR/LF/ESC/space close it.
     *
     * The class rows (pickup.c:1355-1367) pass def_oc_syms[oclass].sym as the
     * GROUP ACCELERATOR — so ')' also picks Weapons, '!' Potions, and so on.
     * The B/C/U/X rows (pickup.c:1405-1433) pass 0, i.e. no accelerator.  Each
     * class appears exactly once, so gcnt == 1 for every gselector and
     * wintty.c:1373-1376 admits all of them even for a PICK_ONE. */
    const typeinvSelectors =
        carried.map((_, i) => String.fromCharCode(97 + i)).join('')
        + (unpaidCnt ? 'u' : '') + (billx ? 'x' : '')
        + (bcnt ? 'B' : '') + (ccnt ? 'C' : '') + (ucnt ? 'U' : '') + (xcnt ? 'X' : '')
        + (jcnt ? 'P' : '');
    const typeinvGacc = carried.map((oc) => def_oc_syms_chars[oc] ?? '').join('');
    /* MENU_SEARCH over the class menu: pmatchi() sees tty_add_menu's stored
     * "%c - %s" (wintty.c:2596-2600) for each selectable row, in call order;
     * a PICK_ONE hit finishes the menu with that row's identifier. */
    let typeinvSearchPick = null;
    const typeinvSearch = async () => {
        const mlist = [];
        for (let i = 2; i < windowLines.length; i++) {
            const m = /^(.) - /.exec(windowLines[i]);
            if (m) mlist.push({ str: windowLines[i], ch: m[1] });
        }
        const finished = await menu_search_case('ONE', mlist,
            () => typeinvBlankTitle().split('\n'),
            (curr) => { typeinvSearchPick = curr.ch; });
        typeinvTitleErased = true;
        return finished;
    };
    let typeinvKey = 0;
    if (!directCategory && tradChoice === null) {
        typeinvKey = await await_menu_key(showTypeinvMenu, typeinvSelectors,
            typeinvGacc, PICK_ONE, undefined, typeinvSearch);
        if (typeinvKey === 0x3a && typeinvSearchPick !== null)
            typeinvKey = typeinvSearchPick.charCodeAt(0);
    }
    const choice = tradChoice !== null ? tradChoice : directCategory ? String.fromCharCode(97)
        : String.fromCharCode(typeinvKey);
    if (!directCategory && tradChoice === null) {
        g._pending_message = '';
        /* C windows.c:1859-1863 holds bot_disabled through select_menu's
         * dismissal; wintty.c:971-978 redraws a full-screen menu via docrt.
         * Its cleared status rows stay blank until the next enabled bot(). */
        const savedBotDisabled = g._bot_disabled;
        g._bot_disabled = true;
        try {
            if (tiFullScreen) {
                await docrt();
                g._statusBlankAfterDocrt = true;
            }
            await flush_screen(1);
        } finally { g._bot_disabled = savedBotDisabled; }
    }
    // invent.c dotypeinv: query_category's selected identifier feeds
    // this_type_only, then query_objlist(PICK_ONE) and itemactions.
    /* C invent.c:3948-3957 — 'u' lists the unpaid items via dounpaid(). */
    if (choice === 'x') {   /* C invent.c:3943-3948 */
        await shk_doinvbill(1);
        return ECMD_OK;
    }
    if (choice === 'u') {
        if (any_unpaid)
            await dounpaid(u_carried, u_floor, u_buried);
        else
            await You('are not carrying any unpaid objects.');
        return ECMD_OK;
    }
    const classIndex = tradChoice !== null ? -1 : choice.charCodeAt(0) - 97;
    const selectedClass = directCategory && tradChoice === null ? g.invent.oclass
        : classIndex >= 0 && classIndex < carried.length
        ? carried[classIndex]
        : carried.find(oc => def_oc_syms_chars[oc] === choice);
    const bucChoice = 'BUCXP'.includes(choice) && (tradChoice !== null || typeinvSelectors.includes(choice));
    if (selectedClass != null || bucChoice) {
        const filter = (o) => {
            /* C invent.c:3796-3798 this_type_only: 'P' selects pickup_prev. */
            if (choice === 'P') return !!o.pickup_prev;
            if (!bucChoice) return (o.oclass | 0) === selectedClass;
            if ((o.oclass | 0) === COIN_CLASS_C)
                return choice === (g.flags?.goldX ? 'X' : 'U');
            return choice === 'B' ? !!(o.bknown && o.blessed)
                : choice === 'C' ? !!(o.bknown && o.cursed)
                : choice === 'U' ? !!(o.bknown && !o.blessed && !o.cursed)
                : !o.bknown;
        };
        const title = bucChoice ? {
            B: 'Items known to be blessed:', C: 'Items known to be cursed:',
            U: 'Items known to be uncursed:',
            X: 'Items whose blessed/uncursed/cursed status is unknown:',
            P: 'Items that were just picked up:',
        }[choice] : null;
        const { selectedObj, WIN_COL, winRows } = await inventory_menu_legacy({
            filter, title, queryObjlist: true, thisTitle: bucChoice, useInvlet: _invlet_constant(),
        });
        if (selectedObj) await itemactions(selectedObj, WIN_COL, winRows);
    }
    /* C: this handler returns ECMD_OK on every path; rhack() maps it. */
    return ECMD_OK;
}

// C ref: invent.c:1627 compactify() — collapse runs of consecutive invlets in
// the getobj suggestion buffer into ranges ("abcdefg" -> "a-g") and runs of
// three or more '#' (NOINVSYM) into "#-#".  Applied when suggested > 5
// (invent.c:1908).  Faithful char-for-char port operating on a JS string;
// returns the compactified string.  RNG-neutral, pure formatting.
export function compactify(s) {
    // C operates in-place on a char buffer with two cursors (i1 read, i2 write).
    const buf = s.split('');
    let i1 = 1, i2 = 1;
    let ilet, ilet1, ilet2;
    const cc = (ch) => (ch === undefined ? 0 : ch.charCodeAt(0));
    ilet2 = buf[0];
    ilet1 = buf[1];
    buf[++i2] = buf[++i1];
    ilet = buf[i1];
    while (ilet) {
        if (cc(ilet) === cc(ilet1) + 1) {
            if (cc(ilet1) === cc(ilet2) + 1) {
                buf[i2 - 1] = ilet1 = '-';
            } else if (ilet2 === '-') {
                ilet1 = String.fromCharCode(cc(ilet1) + 1);
                buf[i2 - 1] = ilet1;
                buf[i2] = buf[++i1];
                ilet = buf[i1];
                continue;
            }
        } else if (cc(ilet) === NOINVSYM) {
            if (i2 >= 2 && cc(buf[i2 - 2]) === NOINVSYM && cc(buf[i2 - 1]) === NOINVSYM)
                buf[i2 - 1] = '-';
            else if (i2 >= 3 && cc(buf[i2 - 3]) === NOINVSYM && buf[i2 - 2] === '-'
                && cc(buf[i2 - 1]) === NOINVSYM)
                --i2;
        }
        ilet2 = ilet1;
        ilet1 = ilet;
        buf[++i2] = buf[++i1];
        ilet = buf[i1];
    }
    // C terminates at buf[i2] = '\0' implicitly via the trailing copy; the
    // written prefix is buf[0..i2-1] (ilet==0 stops before writing the NUL slot).
    return buf.slice(0, i2).join('');
}

const invlet_basic = 52; /* include/hack.h:584 invlet_basic = 52 */

export function invletter_value(c) {
    return (c >= 97 && c <= 122) ? c - 95
        : (c >= 65 && c <= 90) ? c - 37
        : c === 36 ? 1 : c === 35 ? 1 + invlet_basic + 1 : 1 + invlet_basic + 1 + 1;
}

/* C win/tty/topl.c:478-531 tty_yn_function's '#' arm: echo '#', read digits
 * until a non-digit; 'y', SPACE, CR or ESC end the number.  Returns the count
 * (> 0), 0 for "no", or -1 for an abort (the caller must re-ask). */
async function yn_count_tail(qbuf) {
    const g = game;
    let text = qbuf + ' #';
    let value = 0n, n_len = 1;
    if (g._yn_lead_digit !== undefined) { /* topl.c:486-489 */
        value = BigInt(g._yn_lead_digit);
        text += String(value); n_len++;
        g._yn_lead_digit = undefined;
    }
    for (;;) {
        g._pending_message = text;
        await tty_yn_count_echo(qbuf, text);
        // topl.c:490-521 addtopl() edits only; history is written at clean_up.
        const savedHist = g._topl_suppress_history;
        g._topl_suppress_history = true;
        let raw;
        try { raw = await nhgetch(); }
        finally { g._topl_suppress_history = savedHist; }
        const key = typeof raw === 'number' ? raw : (raw?.charCodeAt(0) ?? 0);
        if (key >= 48 && key <= 57) {
            /* C integer.h AppendLongDigit: past LONG_MAX -> -1, which
             * topl.c:522 turns into "remove the number, ask again". */
            const nv = value * 10n + BigInt(key - 48);
            if (nv > 9223372036854775807n) { value = -1n; break; }
            value = nv;
            text += String.fromCharCode(key); n_len++;
        } else if (key === 121 || key === 32 || key === 13 || key === 10) {
            break;
        } else if (key === 27) {
            value = -1n;
            break;
        } else if (key === 8 || key === 127) {
            if (n_len <= 1) { value = -1n; break; }
            value = value / 10n;
            text = text.slice(0, -1); n_len--;
        } else {
            value = -1n;
            break;
        }
    }
    if (value >= 0n) { // topl.c:533-539: only the final answer enters gt.toplines.
        putmsghistory(qbuf + ' ' + (value > 0n ? '#' + value : 'n'));
        g._toplEmptyAfterSuppress = false;
    }
    await tty_yn_count_echo(qbuf, text, value);
    return Number(value);
}

/* C invent.c:1412-1426: unpunish may delete the next object (the chain),
 * so obtain nexthere only after that call. */
export async function delallobj(x, y) {
    for (let otmp = game.level.levelObjects[x][y], next; otmp; otmp = next) {
        if (otmp === game.u.uball) await unpunish_invent();
        next = otmp.nexthere;
        if (otmp === game.u.uchain) continue;
        await delobj(otmp);
    }
}

/* C invent.c:1556-1584.  These searches inspect only top-level inventory. */
export function u_carried_gloves() {
    if (game.u.uarmg) return game.u.uarmg;
    for (let o = game.invent; o; o = o.nobj)
        if (is_gloves(o)) return o;
    return null;
}

/* C invent.c:2551-2615.  Rendering uses the same tty menu as other commands;
 * override_ID and distantname are temporary, including when formatting throws. */
export async function reroll_menu() {
    const g = game, m = new TtyMenu({ overlay: true });
    m.add_menu('n', g.flags.lootabc ? 0 : 'p', 0, 'start the game with this character');
    m.add_menu('y', g.flags.lootabc ? 0 : 'r', 0, 'reroll another character');
    m.add_menu_str('');
    g.iflags.override_ID = (g.iflags.override_ID || 0) + 1;
    try {
        await with_distant_name(async () => {
            for (let o = g.invent; o; o = o.nobj) {
                obj_to_glyph(o);
                m.add_menu_str(await doname(o));
            }
        });
    } finally {
        --g.iflags.override_ID;
    }
    m.add_menu_str('');
    m.add_menu_str(`St:${_strengthStr(acurr(g.u, 0))} Dx:${acurr(g.u, 3)} Co:${acurr(g.u, 4)} In:${acurr(g.u, 1)} Wi:${acurr(g.u, 2)} Ch:${acurr(g.u, 5)}`);
    m.end_menu('Reroll this character?');
    const { count, picks } = await m.select_menu(PICK_ONE);
    const option = count > 0 ? picks[0] : await yn_function('Reroll this character?', 'yn', 'n');
    if (option === 'y') {
        g.u.uroleplay.numrerolls = (g.u.uroleplay.numrerolls || 0) + 1;
        return true;
    }
    return false;
}

/* C invent.c:1671,2133-2145 — shared selection predicates. */
function taking_off(action) {
    return action === 'take off' || action === 'remove';
}

function ckvalidcat(obj) { return allow_category(obj) ? 1 : 0; }

export function ckunpaid(obj) {
    return obj.unpaid || (obj.cobj && count_unpaid(obj.cobj)) ? 1 : 0;
}

/* C invent.c:2172-2191: context shared by the safe_qbuf callbacks. */
const safeq_xprn_ctx = { let: '', dot: false };

async function safeq_xprname(obj) {
    return xprname(obj, null, safeq_xprn_ctx.let, safeq_xprn_ctx.dot, 0, 0);
}

async function safeq_shortxprname(obj) {
    return xprname(obj, ansimpleoname(obj), safeq_xprn_ctx.let,
                   safeq_xprn_ctx.dot, 0, 0);
}

/* C invent.c:2201-2366.  resultflags.value is ALL_FINISHED (1); the
 * additional category fields serve menu_drop's existing JS retry interface. */
export async function ggetobj(word, fn, mx, combo, resultflags = null) {
    const g = game, u = g.u;
    if (!g.invent) {
        await You('have nothing to %s.', word);
        if (resultflags) resultflags.value = 1;
        return 0;
    }
    if (resultflags) resultflags.value = 0;
    add_valid_menu_class(0);
    const takeoff = taking_off(word), ident = word === 'identify';
    const ofilter = takeoff ? is_worn : ident ? not_fully_identified : null;
    let ilets = '';
    for (let o = g.invent; o; o = o.nobj) {
        const sym = def_oc_syms_chars[o.oclass | 0];
        if (!ilets.includes(sym) && (!ofilter || ofilter(o))) ilets += sym;
    }
    if (ident && !ilets) return -1;
    ilets += ' ';
    if (count_unpaid(g.invent)) ilets += 'u';
    if (count_buc(g.invent, BUCT_BLESSED, ofilter)) ilets += 'B';
    if (count_buc(g.invent, BUCT_UNCURSED, ofilter)) ilets += 'U';
    if (count_buc(g.invent, BUCT_CURSED, ofilter)) ilets += 'C';
    if (count_buc(g.invent, BUCT_UNKNOWN, ofilter)) ilets += 'X';
    if (count_justpicked(g.invent)) ilets += 'P';
    ilets += 'ai' + (combo ? '' : 'm');
    let buf;
    for (;;) {
        buf = await getlin(`What kinds of thing do you want to ${word}? [${ilets}]`);
        if (buf == null || buf.charCodeAt(0) === 27) return 0;
        if (!buf.includes('i')) break;
        let ailets = '';
        if (ofilter)
            for (let o = g.invent; o; o = o.nobj) {
                const letter = String.fromCharCode(o.invlet | 0);
                if (ofilter(o) && !ailets.includes(letter)) ailets += letter;
            }
        if (await display_inventory(ailets || null, true) === 27) {
            /* the menu's docrt() left the status blank only until the next
             * flush_screen()->bot(); an ESC ends the command, so that flush
             * follows (dispinv_with_action clears it the same way). */
            g._status_blanked = false;
            return 0;
        }
    }
    const extra = takeoff ? [u.uwep, u.uswapwep, u.uquiver].filter(Boolean)
        .map(o => o.oclass | 0) : [];
    const olets = [];
    let allflag = false, m_seen = false, ckfn = null, bucs = '', unpaidOnly = false;
    for (const sym of buf) {
        if (sym === ' ') continue;
        const oc = def_char_to_objclass(sym.charCodeAt(0));
        if (takeoff && oc !== MAXOCLASSES_C && !extra.includes(oc)) {
            if (![3, 2, 4, 5, 6].includes(oc)) {
                await pline('Not applicable.'); return 0;
            } else if (oc === 3 && !wearing_armor()) {
                await noarmor(false); return 0;
            } else if (oc === 2 && !u.uwep && !u.uswapwep && !u.uquiver) {
                await You('are not wielding anything.'); return 0;
            } else if (oc === 4 && !u.uright && !u.uleft) {
                await You('are not wearing rings.'); return 0;
            } else if (oc === 5 && !u.uamul) {
                await You('are not wearing an amulet.'); return 0;
            } else if (oc === 6 && !u.ublindf) {
                await You('are not wearing a blindfold.'); return 0;
            }
        }
        if (sym === 'a') allflag = true;
        else if (sym === 'A') { /* same as the default */ }
        else if (sym === 'u') {
            add_valid_menu_class(sym.charCodeAt(0)); ckfn = ckunpaid; unpaidOnly = true;
        } else if ('BUCXP'.includes(sym)) {
            add_valid_menu_class(sym.charCodeAt(0)); ckfn = ckvalidcat; bucs += sym;
        } else if (sym === 'm') m_seen = true;
        else if (oc === MAXOCLASSES_C) await You("don't have any %s's.", sym);
        else if (!olets.includes(oc)) {
            add_valid_menu_class(oc); olets.push(oc);
        }
    }
    if (resultflags) Object.assign(resultflags, { olets, bucs, unpaidOnly });
    if (m_seen)
        return (allflag || (!olets.length && ckfn !== ckunpaid && ckfn !== ckvalidcat)) ? -2 : -3;
    if (g.flags.menu_style !== MENU_TRADITIONAL && combo && !allflag) return 0;
    const cnt = await askchain(() => g.invent, olets, allflag, fn, ckfn, mx, word);
    if (combo && allflag && resultflags) resultflags.value |= 1;
    return cnt;
}

/* C invent.c:2376-2535.  A getter stands for struct obj ** so actions may
 * unlink the head.  Retain one sorted snapshot across every class pass. */
export async function askchain(objchn, olets, allflag, fn, ckfn, mx, word) {
    const takeoff = taking_off(word), ident = word === 'identify';
    const take_out = word === 'take out', put_in = word === 'put in';
    const nodot = word === 'nodot' || word === 'drop' || ident || takeoff || take_out || put_in;
    const ininv = objchn() === game.invent;
    const bycat = [...'uBUCXP'].some(c => menu_class_present(c.charCodeAt(0)));
    const sortedchn = sortloot_invlet_chain(objchn());
    let cnt = 0, dud = 0, first = true, quit = false;
    for (const cls of (olets.length ? olets : [null])) {
        let ilet = 96 - (objchn()?.oclass === COIN_CLASS_C ? 1 : 0);
        bypass_objlist(objchn(), false);
        for (;;) {
            // C worn.c:nxt_unbypassed_loot rescans after every action: an
            // action may delete items or clear bypass bits on the chain.
            let otmp = null;
            for (const candidate of sortedchn) {
                for (let o = objchn(); o; o = o.nobj)
                    if (o === candidate && !o.bypass) { otmp = o; break; }
                if (otmp) break;
            }
            if (!otmp) break;
            otmp.bypass = 1;
            game.context.bypasses = true;
            ilet = ilet === 122 ? 65 : ilet === 90 ? 35 : ilet + 1;
            if (cls != null && otmp.oclass !== cls) continue;
            if (takeoff && !is_worn(otmp)) continue;
            if (ident && !not_fully_identified(otmp)) continue;
            if (ckfn && !ckfn(otmp)) continue;
            if (bycat && !ckvalidcat(otmp)) continue;
            let sym = 'y', yn_number = 0;
            if (!allflag) {
                safeq_xprn_ctx.let = String.fromCharCode(ilet);
                safeq_xprn_ctx.dot = !nodot;
                let qpfx = '';
                if (first) {
                    if (take_out || put_in) qpfx = word[0].toUpperCase() + word.slice(1) + ': ';
                    first = false;
                }
                const q = await safe_qbuf_invent('', qpfx, '?', otmp,
                    ininv ? safeq_xprname : doname,
                    ininv ? safeq_shortxprname : ansimpleoname, 'item');
                const rs = takeoff || ident || otmp.quan < 2 ? 'ynaq' : 'yn#aq';
                // C topl.c:526-531 clears an aborted count and retries the
                // same question before askchain can act on the response.
                do {
                    yn_number = 0;
                    sym = await yn_function(q, rs, 'n', false);
                    /* topl.c:549-550: a wrapped prompt (cury != 0) is cleared. */
                    if (q.length + rs.length + 8 <= 79) game._topl_sticky = `${q} [${rs}] (n)`;
                    /* topl.c:549 clean_up clears WIN_MESSAGE when the prompt wrapped
                     * onto a second row (cury != 0). */
                    game._topl_sticky = (q.length + rs.length + 8 <= 79)
                        ? `${q} [${rs}] (n)` : null;
                    /* C topl.c:547-548 clears WIN_MESSAGE when the prompt wrapped (cury != 0). */
                    game._topl_sticky = topl_park_cursor(null, `${q} [${rs}] (n) `)[1] > 0 ? null : `${q} [${rs}] (n)`;
                    /* C topl.c:547-548 — a WRAPPED prompt is erased by
                     * clean_up's tty_clear_nhwindow(WIN_MESSAGE); only a
                     * single-row prompt survives as dead topline text. */
                    game._topl_sticky = game._topl_yn_wraprow > 0
                        ? null : `${q} [${rs}] (n)`;
                    if (sym === '#') yn_number = await yn_count_tail(`${q} [${rs}] (n)`);
                } while (yn_number < 0);
            }
            const otmpo = otmp;
            if (sym === '#') {
                if (!yn_number) sym = 'n';
                else {
                    sym = 'y';
                    if (yn_number < otmp.quan && splittable(otmp))
                        otmp = await splitobj(otmp, yn_number);
                }
            }
            if (sym === 'q') {
                if (ident) cnt = -1;
                quit = true; break;
            }
            if (sym === 'a' || sym === 'y') {
                if (sym === 'a') allflag = true;
                const tmp = await fn(otmp);
                if (tmp <= 0) {
                    if (!container_gone(fn) && otmp !== otmpo) await unsplitobj(otmp);
                    if (tmp < 0) { quit = true; break; }
                }
                cnt += tmp;
                if (--mx === 0) { quit = true; break; }
            }
            if (nodot && (sym === 'a' || sym === 'y' || sym === 'n')) dud++;
        }
        if (quit) break;
    }
    if (!quit) {
        if (!takeoff && (dud || cnt)) await pline('That was all.');
        else if (!dud && !cnt) await pline('No applicable objects.');
    }
    // The action can move an object to another chain (or split a stack).
    clear_bypasses_invent();
    game.context.bypasses = false;
    bypass_objlist(game.invent, false);
    for (const o of sortedchn) o.bypass = 0;
    return cnt;
}

/* C invent.c:1960-1999 — getobj()'s `redo_menu` arm, as one reusable block.
 *
 * Every getobj re-implementation must call this the moment its prompt read
 * yields '?' or '*'; neither key is looked up as an invlet, because C's invlet
 * walk is at invent.c:2002, AFTER this block.  C:
 *
 *   redo_menu:
 *     if (ilet == '?' || ilet == '*') {
 *         allowed_choices = (ilet == '?') ? lets : NULL;          (invent.c:1964)
 *         if (ilet == '?' && !*lets && *altlets)
 *             allowed_choices = altlets;                          (invent.c:1969)
 *         ilet = display_pickinv(allowed_choices, handsbuf, ...);  (invent.c:1979)
 *         if (!ilet) { if (oneloop) return NULL; continue; }      (invent.c:1982)
 *         if (ilet == HANDS_SYM) return &hands_obj;               (invent.c:1987)
 *         if (ilet == '\033') { pline1(Never_mind); return NULL; }(invent.c:1989)
 *         if (ilet == '*' || ilet == '?') goto redo_menu;         (invent.c:1994)
 *     }
 *
 * `lets` is the NON-compacted suggested-letter string that invent.c:1904 snapshots
 * BEFORE the >5 compactify() the prompt bracket shows; `altlets` is the
 * GETOBJ_DOWNPLAY set collected at invent.c:1884.
 *
 * Returns the charcode display_pickinv settled on, in C's own encoding:
 *   0  → no selection; the caller must `continue` its outer prompt loop
 *        (invent.c:1985 — `oneloop` is only set by iflags.force_invmenu, off);
 *   27 → ESC; invent.c:1990-1992 has ALREADY been done here (flags.verbose is On
 *        by default, so "Never mind." is plined) and the caller just cancels
 *        getobj with no object;
 *   45 → HANDS_SYM; the caller returns hands_obj — only reachable where the
 *        callback made '-' a choice (getobj's `allownone`), which no getobj site
 *        in this file does;
 *   otherwise the picked invlet, which falls through to the caller's invlet
 *   lookup exactly as C falls through to invent.c:2002.
 *
 * RNG-neutral: display_pickinv's only draw is obj_to_glyph(otmp,
 * rn2_on_display_rng) (invent.c:3319), which is the separate display RNG.
 *
 * KNOWN GAP: display_pickinv walks gi.invent (invent.c:3264).  Where a command
 * still models inventory as synthetic slots instead of a chain there is nothing
 * to walk, and the menu renders C's empty-pack case ("Not carrying anything.",
 * invent.c:3141) for a hero who is in fact carrying things. */
/* C ref: invent.c:1719 getobj_hands_txt() — describes "hands" for the action. */
export function getobj_hands_txt(action) {
    const u = game.u || {};
    if (action === 'grease') return `your ${fingers_or_gloves(false)}`;
    if (action === 'write with') return `your ${body_part(FINGERTIP)}`;
    if (action === 'wield')
        return `your ${u.uarmg ? 'gloved' : 'bare'} ${makeplural_objnam(body_part(HAND))}${!u.uwep ? ' (wielded)' : ''}`;
    if (action === 'ready')
        return `empty quiver${!u.uquiver ? ' (nothing readied)' : ''}`;
    return `your ${makeplural_objnam(body_part(HAND))}`;
}

/* C ref: invent.c:1752 getobj(word, obj_ok, flags) — ONE function taking the
 * per-command classifier callback.  Our port had inlined it per command site
 * (dowieldquiver, dothrow, dodrop, doeat, dowear/doputon), so a newly ported
 * command had no getobj to call; this is the same body the 'W'/'P' path has
 * always run, with the hardwired equip_ok lifted into the callback C already
 * passes.  Callbacks return the local GETOBJ_* classes (SUGGEST is listed in
 * the prompt bracket, DOWNPLAY is selectable via '?'/'*' but unlisted,
 * EXCLUDE is neither). */
export async function mime_action(word) {
    let buf = String(word);
    let pfx = null, sfx = null, bp;

    if ((bp = buf.indexOf(' on the ')) >= 0) {
        /* "rub on the stone[s]" */
        sfx = buf.slice(bp + 1);   /* "something <sfx>" */
        buf = buf.slice(0, bp);
    }
    if ((buf.startsWith('rub the ') && buf.slice(8).includes(' on'))
        || (buf.startsWith('dip ') && buf.slice(4).includes(' into'))) {
        /* "rub the royal jelly on" -> "rubbing the royal jelly on";
           "dip <foo> into" -> "dipping <foo> into" */
        pfx = buf.slice(4);        /* "<pfx> something" */
        buf = buf.slice(0, 3);
    }
    let head = buf;
    if ((bp = buf.indexOf(' or ')) >= 0)
        head = rn2(2) ? buf.slice(0, bp) : buf.slice(bp + 4);

    /* C: You("mime %s%s%s something%s%s.", ing_suffix(bp), pfx?" ":"", pfx?:"",
     *        sfx?" ":"", sfx?:"")  — note " something" sits BETWEEN pfx and sfx. */
    await pline(`You mime ${ing_suffix(head)}${pfx ? ' ' : ''}${pfx || ''}`
                + ` something${sfx ? ' ' : ''}${sfx || ''}.`);
}

/* C ref: invent.c:1612 g_at() — find the first COIN_CLASS object at (x, y).
 * Returns the object if found, null otherwise. Walks the per-tile nexthere chain
 * looking for the first coin. */
export function g_at(x, y) {
    const g = game;
    const xi = x | 0;
    const yi = y | 0;
    let obj = (g.level?.levelObjects?.[xi]?.[yi]) ?? null;

    while (obj) {
        if ((obj.oclass | 0) === OCLASS_COIN)
            return obj;
        obj = obj.nexthere ?? null;
    }
    return null;
}

/* C invent.c:309-387 loot_xname(obj) — cxname_singular() with the prefixes that
 * would perturb alphabetical order suppressed.  The user-assigned name is
 * suppressed by cxname_singular's own CXN_SINGULAR path only for artifacts, so
 * it is cleared here the way C clears ONAME. */
export function loot_xname(obj) {
    const oclass = obj.oclass | 0, otyp = obj.otyp | 0;
    const save = { odiluted: obj.odiluted, blessed: obj.blessed,
                   cursed: obj.cursed, spe: obj.spe, owt: obj.owt,
                   /* C invent.c:324 save_oname = has_oname(obj) ? ONAME(obj) : 0;
                    * oname is not a struct obj field; it lives one level down
                    * in oextra (obj.h:191,196), so has_oname's two-part test
                    * (oextra present AND oname non-null) is what decides whether
                    * this snapshot carries a name at all. */
                   oname: has_oname(obj) ? ONAME(obj) : null };
    if (oclass === _SL_POTION_CLASS) {
        obj.odiluted = 0;
        if (otyp === _SL_POT_WATER) { obj.blessed = 0; obj.cursed = 0; }
    }
    if (otyp === _SL_TOWEL)
        obj.spe = 0;
    if (obj.globby)
        obj.owt = 20;
    /* C invent.c:342-343 if (save_oname && !obj->oartifact) ONAME(obj) = 0;
     * save.oname truthy implies has_oname(obj) was true at the snapshot
     * above, so obj.oextra is already present here; this only nulls the
     * field, it never frees or reallocates oextra. */
    if (save.oname && !obj.oartifact)
        obj.oextra.oname = null;
    const save_debug = game.flags.debug;
    if (save_debug) {
        game.program_state.something_worth_saving = 0;
        game.flags.debug = false;
    }
    let res;
    try {
        res = String(_sl_cxname_singular(obj) ?? '');
    } finally {
        if (save_debug) {
            game.flags.debug = true;
            game.program_state.something_worth_saving = 1;
        }
        if (oclass === _SL_POTION_CLASS) {
            obj.odiluted = save.odiluted;
            if (otyp === _SL_POT_WATER) { obj.blessed = save.blessed; obj.cursed = save.cursed; }
        }
        if (otyp === _SL_TOWEL) obj.spe = save.spe;
        if (obj.globby) obj.owt = save.owt;
        /* C invent.c:383-384 if (save_oname && !obj->oartifact) ONAME(obj) = save_oname; */
        if (save.oname && !obj.oartifact) obj.oextra.oname = save.oname;
    }
    if (otyp === _SL_TOWEL)
        res += is_wet_towel(obj) ? (((obj.spe | 0) >= 3) ? 'x' : 'y') : 'z';
    if (obj.globby)
        res += ((obj.owt | 0) <= 100) ? 'a' : ((obj.owt | 0) <= 300) ? 'b'
               : ((obj.owt | 0) <= 500) ? 'c' : 'd';
    return res;
}

/* C invent.c:2148 - wearing_armor(void): returns true if wearing any armor piece */
export function wearing_armor() {
    const u = game.u;
    return !!(u.uarm || u.uarmc || u.uarmf || u.uarmg
              || u.uarmh || u.uarms || u.uarmu);
}

/* C invent.c:1601 - obj_here(struct obj *obj, coordxy x, coordxy y): check if an object
 * is at a specific location in the level.
 * Returns TRUE if obj is found in the object chain at level.objects[x][y], FALSE otherwise. */
export function obj_here(obj, x, y) {
    const g = game;
    // Ensure level and levelObjects are initialized
    if (!g.level) g.level = {};
    if (!g.level.levelObjects) {
        const COLNO = 80, ROWNO = 21;
        g.level.levelObjects = [];
        for (let i = 0; i < COLNO; i++) {
            g.level.levelObjects[i] = [];
            for (let j = 0; j < ROWNO; j++) {
                g.level.levelObjects[i][j] = null;
            }
        }
    }

    // C: for (otmp = svl.level.objects[x][y]; otmp; otmp = otmp->nexthere)
    // JS: g.level.levelObjects[x][y]
    let otmp = g.level.levelObjects?.[x]?.[y] ?? null;
    while (otmp) {
        // C: if (obj == otmp)
        if (obj === otmp) {
            // C: return TRUE;
            return 1;
        }
        // C: otmp = otmp->nexthere
        otmp = otmp.nexthere ?? null;
    }
    // C: return FALSE;
    return 0;
}

/* C ref: invent.c carrying(int type) — return first invent obj of otyp==type, else null */
export function carrying(type) {
    const g = game;
    for (let otmp = g.invent; otmp; otmp = otmp.nobj) {
        if (otmp.otyp === type)
            return otmp;
    }
    return null;
}

/* C ref: invent.c:4333 will_feel_cockatrice(struct obj *otmp, boolean force_touch)
 * Check if hero will feel petrification from touching a cockatrice corpse.
 * Returns TRUE if the hero is blind or force_touch, unarmored (no gloves),
 * lacks stone resistance, and the object is a cockatrice corpse.
 */
export function will_feel_cockatrice(otmp, force_touch) {
    const u = game.u;
    const flags = game.flags;
    const CORPSE = 265;
    const PM_COCKATRICE = 10;
    const PM_CHICKATRICE = 9;

    // C: if ((Blind || force_touch) && !uarmg && !Stone_resistance
    //        && (otmp->otyp == CORPSE && touch_petrifies(&mons[otmp->corpsenm])))
    //        return TRUE;
    const isBlind = _u_blind();
    const hasGloves = !!(u && u.uarmg);
    const stone = u?.uprops?.[STONE_RES];
    const hasStoneResistance = !!(stone?.intrinsic || stone?.extrinsic); /* youprop.h:65 */
    const isCorpse = otmp && otmp.otyp === CORPSE;
    const corpsenm = otmp ? otmp.corpsenm : -1;
    const touchPetrifies = corpsenm === PM_COCKATRICE || corpsenm === PM_CHICKATRICE;

    if ((isBlind || force_touch) && !hasGloves && !hasStoneResistance
        && isCorpse && touchPetrifies) {
        return true;
    }
    return false;
}

/* C ref: invent.c:1507 carrying_stoning_corpse(void)
 * Iterate inventory for a cockatrice corpse (CORPSE + touch_petrifies).
 * Returns the first such object, or null.
 */
export function carrying_stoning_corpse() {
    const g = game;
    const CORPSE = 265;
    const PM_COCKATRICE = 10;
    const PM_CHICKATRICE = 9;

    for (let otmp = g.invent; otmp; otmp = otmp.nobj) {
        if (otmp.otyp === CORPSE) {
            const corpsenm = otmp.corpsenm | 0;
            if (corpsenm === PM_COCKATRICE || corpsenm === PM_CHICKATRICE) {
                return otmp;
            }
        }
    }
    return null;
}

const _MG_CORPSE = 265, _MG_EGG = 266, _MG_TIN = 296, _MG_POT_OIL = 321, _MG_SCR_MAIL = 364;

const _MG_LOST_NONE = 0, _MG_LOST_EXPLODING = 4;

const _MG_PM_CLERIC = 6; /* role index; matches this file's _Role_if contract */

/* C mondata.h:170 — is_reviver(ptr) is (is_rider(ptr) || ptr->mlet == S_TROLL);
 * mondata.h:161 is_rider is data == mons[PM_DEATH|PM_FAMINE|PM_PESTILENCE].
 * MONS row[0] is mlet (js/mklev.js:1069 special_corpse reads the same column).
 * This replaces an `UNPORTED-CALLEE: mergable corpse is_reviver(...)` throw:
 * the C predicate is two comparisons over a table already in this file. */
const _MG_S_TROLL = 46; /* monsym.h S_TROLL; mirrors js/mklev.js:129 */

function _is_reviver_mndx(mndx) {
    const n = mndx | 0;
    if (n < 0 || n >= _MONS.length)
        return false;
    return (_MONS[n][0] | 0) === _MG_S_TROLL
        || n === PM_DEATH || n === PM_FAMINE || n === PM_PESTILENCE;
}

/* C shk.c:955-979 same_price() — unpaid stacks may merge only when their
 * bill entries have the same per-item price and belong to the same keeper. */
async function _same_price(obj1, obj2) {
    let owner1 = null, bill1 = null;
    // C shk.c:215-230: visiting a billed angry keeper applies its surcharge.
    for (let m = next_shkp(game.fmon, true); m; m = next_shkp(m.nmon, true)) {
        const bp = await shk_onbill(obj1, m, true);
        if (bp) {
            owner1 = m;
            bill1 = bp;
            break;
        }
    }
    let owner2 = owner1, bill2 = owner1 && await shk_onbill(obj2, owner1, true);
    if (!bill2) {
        for (owner2 = next_shkp(game.fmon, true); owner2;
             owner2 = next_shkp(owner2.nmon, true))
            if ((bill2 = await shk_onbill(obj2, owner2, true))) break;
    }
    if (!bill1 || !bill2) {
        await real_impossible("same_price: object wasn't on any bill!");
        return false;
    }
    return owner1 === owner2 && bill1.price === bill2.price;
}

export async function mergable(otmp, obj) {
    /* C 4386-4390: same object, different type, explicit nomerge, or not
       mergable in general */
    if (obj === otmp || (obj.otyp | 0) !== (otmp.otyp | 0)
        || obj.nomerge || otmp.nomerge
        || !oc_merge(obj.otyp | 0))
        return false;

    /* C 4393: coins of the same kind always merge */
    if ((obj.oclass | 0) === _MG_COIN_CLASS)
        return true;

    if ((obj.cursed | 0) !== (otmp.cursed | 0)
        || (obj.blessed | 0) !== (otmp.blessed | 0))
        return false;

    if ((obj.how_lost | 0) === _MG_LOST_EXPLODING
        || (otmp.how_lost | 0) === _MG_LOST_EXPLODING)
        return false;
    if ((otmp.how_lost | 0) !== _MG_LOST_NONE
        && (obj.how_lost | 0) !== (otmp.how_lost | 0))
        return false;
    /* C 4403-4408: the `bypass` comparison is #if 0'd out in C. */

    if (obj.globby)
        return true;

    if ((obj.unpaid | 0) !== (otmp.unpaid | 0) || (obj.spe | 0) !== (otmp.spe | 0)
        || (obj.no_charge | 0) !== (otmp.no_charge | 0)
        || (obj.obroken | 0) !== (otmp.obroken | 0)
        || otrapped_of(obj) !== otrapped_of(otmp)
        || (obj.lamplit | 0) !== (otmp.lamplit | 0))
        return false;

    if ((obj.oclass | 0) === _MG_FOOD_CLASS
        && ((obj.oeaten | 0) !== (otmp.oeaten | 0)
            || (obj.orotten | 0) !== (otmp.orotten | 0)))
        return false;

    const Blind = _uprop_active('BLINDED');
    const Hallucination = _uprop_active('HALLUC') && !_uprop_active('HALLUC_RES'); /* youprop.h:120 */

    if ((obj.dknown | 0) !== (otmp.dknown | 0)
        || ((obj.bknown | 0) !== (otmp.bknown | 0) && !_Role_if(_MG_PM_CLERIC)
            && (Blind || Hallucination))
        || (obj.oeroded | 0) !== (otmp.oeroded | 0)
        || (obj.oeroded2 | 0) !== (otmp.oeroded2 | 0)
        || (obj.greased | 0) !== (otmp.greased | 0))
        return false;

    if (erosion_matters(obj)
        && ((obj.oerodeproof | 0) !== (otmp.oerodeproof | 0)
            || ((obj.rknown | 0) !== (otmp.rknown | 0)
                && (Blind || Hallucination))))
        return false;

    const ot = obj.otyp | 0;
    if (ot === _MG_CORPSE || ot === _MG_EGG || ot === _MG_TIN) {
        if ((obj.corpsenm ?? -1) !== (otmp.corpsenm ?? -1))
            return false;
    }

    /* C 4442-4446: hatching eggs don't merge; ditto revivable corpses. */
    if (ot === _MG_EGG && (obj.timed || otmp.timed))
        return false;
    if (ot === _MG_CORPSE && (otmp.corpsenm ?? -1) >= LOW_PM
        && _is_reviver_mndx(otmp.corpsenm | 0))
        return false;

    /* C 4450: candles merge only when their ages are close (begin_burn's 25). */
    if (_Is_candle(obj)
        && Math.trunc((obj.age | 0) / 25) !== Math.trunc((otmp.age | 0) / 25))
        return false;

    /* C 4454: burning potions of oil never merge */
    if (ot === _MG_POT_OIL && obj.lamplit)
        return false;

    /* C 4458: don't merge a surcharged item with a base-cost item */
    if (obj.unpaid && !(await _same_price(obj, otmp)))
        return false;

    /* C 4462: some additional information is always incompatible */
    if (obj.oextra?.omonst || obj.oextra?.omid
        || otmp.oextra?.omonst || otmp.oextra?.omid)
        return false;

    /* C 4467-4477: if they have names, make sure they're the same.  C compares
       strlen(safe_oname()) — safe_oname yields "" for an unnamed object. */
    const objname = obj.oextra?.oname ?? '';
    const otmpname = otmp.oextra?.oname ?? '';
    if (((objname.length !== otmpname.length)
         && ((objname.length && otmpname.length) || ot === _MG_CORPSE))
        || (objname.length && otmpname.length && objname !== otmpname))
        return false;

    /* C 4480-4483: attached mail command must match on both or neither. */
    const objmail = obj.oextra?.omailcmd ?? null;
    const otmpmail = otmp.oextra?.omailcmd ?? null;
    if (objmail === null ? otmpmail !== null : (otmpmail === null || objmail !== otmpmail))
        return false;
    /* C 4483-4489: MAIL_STRUCTURES is defined (global.h:430); wished or bones
       mail keeps its two flavors apart by o_id parity.  o_id is unsigned
       (obj.h:43), so preserve parity across the signed 32-bit boundary. */
    if ((obj.otyp | 0) === _MG_SCR_MAIL
        && (obj.spe | 0) > 0 && ((obj.o_id >>> 0) % 2) !== ((otmp.o_id >>> 0) % 2))
        return false;

    if ((obj.oartifact | 0) !== (otmp.oartifact | 0))
        return false;

    if ((obj.known | 0) !== (otmp.known | 0) && (Blind || Hallucination))
        return false;

    return true;
}

const SCR_SCARE_MONSTER = 326;

export async function merge_choice(objlist, obj) {
    const g = game;
    let shkp;
    let save_nocharge;

    if (!objlist) /* might be checking 'obj' against empty inventory */
        return null;
    if (obj.otyp === SCR_SCARE_MONSTER) /* punt on these */
        return null;
    save_nocharge = obj.no_charge;
    if (objlist === g.invent && obj.where === OBJ_FLOOR
        && (shkp = shop_keeper(inside_shop(obj.ox, obj.oy)))) {
        if (obj.no_charge)
            obj.no_charge = 0;
        /* A billable object won't have its `unpaid' bit set, so would
           erroneously seem to be a candidate to merge with a similar
           ordinary object.  That's no good, because once it's really
           picked up, it won't merge after all.  It might merge with
           another unpaid object, but we can't check that here (depends
           too much upon shk's bill) and if it doesn't merge it would
           end up in the '#' overflow inventory slot, so reject it now. */
        else if (inhishop(shkp))
            return null;
    }
    do {
        /*assert(objlist != NULL);*/
        if (await mergable(objlist, obj))
            break;
        objlist = objlist.nobj;
    } while (objlist);
    obj.no_charge = save_nocharge;
    return objlist;
}

export function any_obj_ok(obj) {
    return obj ? 2 /*GETOBJ_SUGGEST*/ : -3 /*GETOBJ_EXCLUDE (C hack.h:515)*/;
}

export function splittable(obj) {
    const g = game;
    return !((obj.otyp === LOADSTONE && obj.cursed)
             || (obj === g.u.uwep && welded(g.u.uwep)));
}

export function set_cknown_lknown(obj) {
    const otyp = (obj.otyp | 0);
    if (Is_container(obj) || otyp === STATUE) {
        obj.cknown = obj.lknown = 1;
    } else if (otyp === TIN) {
        obj.cknown = 1;
    }
}

/* C ref: invent.c fully_identify_obj() — make an object actually be identified;
 * no display updating. */
export function fully_identify_obj(otmp) {
    const EGG = 266;
    makeknown(otmp.otyp);
    if (otmp.oartifact)
        discover_artifact(otmp.oartifact | 0);
    observe_object(otmp);
    otmp.known = otmp.bknown = otmp.rknown = 1;
    set_cknown_lknown(otmp); /* set otmp->{cknown,lknown} if applicable */
    if (otmp.otyp === EGG && otmp.corpsenm !== NON_PM)
        learn_egg_type(otmp.corpsenm);
}

/* C ref: invent.c:1186-1196 — carry_obj_effects(struct obj *obj) */
export function carry_obj_effects(obj) {
    const FIGURINE = 241;

    /* Cursed figurines can spontaneously transform when carried. */
    if (obj.otyp === FIGURINE) {
        if (obj.cursed && obj.corpsenm !== NON_PM
            && !dead_species(obj.corpsenm, true)) {
            attach_fig_transform_timeout(obj);
        }
    }
}

// C invent.c:1355-1400 freeinv_core(obj) — un-register obj from any
// special-item tracking (u.uhave.*, artifact intrinsics, luckstone luck,
// figurine timer, the eaten-tin context) as it is about to leave the
// hero's inventory (via drop, sell, stack-merge into a new object, etc.)
export function freeinv_core(obj) {
    let pending;
    const g = game;
    const u = g.u || (g.u = {});
    const uh = _ensure_uhave(u);
    const COIN_CLASS = 12;
    const AMULET_OF_YENDOR = 213;
    const CANDELABRUM_OF_INVOCATION = 262;
    const BELL_OF_OPENING = 263;
    const SPE_BOOK_OF_THE_DEAD = 409;
    const W_ART = 0x00001000;

    if (obj.oclass === COIN_CLASS) {
        /* C invent.c:1391 — `if (obj->oclass == COIN_CLASS) { SET_BOTL; return; }`
         * and botl.c reads money_cnt(gi.invent), which extract_nobj has already
         * shortened.  That is now literally true of this port too: the
         * _ini_inv_chain SHADOW the '$:' field used to read was retired with
         * this commit (see js/display.js _statusLine2()), so freeinv()'s own
         * unlink is what the status row sees and the hand-mirror that used to
         * stand here — deducting obj.quan from the shadow's coin node — is
         * gone.  freeinv() remains the single door every object leaves the
         * hero's inventory through (invent.c:1401), which is why C puts its
         * SET_BOTL here.  Because C's SET_BOTL here makes bot() run and rewrite
         * the '$:' field, it also ends any staleness latched by the one C site
         * that changes gold WITHOUT it (js/potion.js's dipfountain bath arm). */
        g._botlGoldStale = undefined;
        SET_BOTL();
        return;
    } else if (obj.otyp === AMULET_OF_YENDOR) {
        if (!uh.amulet)
            pending = real_impossible("don't have amulet?");
        uh.amulet = 0;
    } else if (obj.otyp === CANDELABRUM_OF_INVOCATION) {
        if (!uh.menorah)
            pending = real_impossible("don't have candelabrum?");
        uh.menorah = 0;
    } else if (obj.otyp === BELL_OF_OPENING) {
        if (!uh.bell)
            pending = real_impossible("don't have silver bell?");
        uh.bell = 0;
    } else if (obj.otyp === SPE_BOOK_OF_THE_DEAD) {
        if (!uh.book)
            pending = real_impossible("don't have the book?");
        uh.book = 0;
    } else if (obj.oartifact) {
        if (is_quest_artifact(obj)) {
            if (!uh.questart)
                pending = real_impossible("don't have quest artifact?");
            uh.questart = 0;
        }
        /* C artifact.c:881-885 completes the invoked-power shutdown before
         * freeinv_core resumes; float_down can block on landing messages. */
        pending = pending ? pending.then(() => set_artifact_intrinsic(obj, 0, W_ART))
            : set_artifact_intrinsic(obj, 0, W_ART);
    }

    if (pending) return pending.then(() => _freeinv_core_finish(obj));
    _freeinv_core_finish(obj);
}

/* C invent.c:1386-1400 follows any blocking artifact shutdown. */
function _freeinv_core_finish(obj) {
    const g = game;
    const LOADSTONE = 471, FIGURINE = 241, FIG_TRANSFORM = 6;
    if (obj.otyp === LOADSTONE) {
        curse_obj(obj);
    } else if (confers_luck(obj)) {
        set_moreluck();
        SET_BOTL();
    } else if (obj.otyp === FIGURINE && obj.timed) {
        stop_timer(FIG_TRANSFORM, obj_to_any(obj));
    }

    if (!g.context) g.context = {};
    if (!g.context.tin) g.context.tin = { tin: null, o_id: 0 };
    if (obj === g.context.tin.tin) {
        g.context.tin.tin = null;
        g.context.tin.o_id = 0;
    }
}

export function freeinv(obj) {
    extract_nobj(obj, game, 'invent');
    obj.pickup_prev = 0;
    const pending = freeinv_core(obj);
    if (pending) return pending.then(() => update_inventory());
    update_inventory();
}

/* C ref: invent.c:3526-3538 count_unpaid(struct obj *list) — count unpaid items recursively.
 * Walks a linked list of objects, counting those with unpaid flag set, and recursively
 * counting unpaid items within contained objects (cobj). */
export function count_unpaid(list) {
    let count = 0;

    while (list) {
        if (list.unpaid)
            count++;
        if (list.cobj)
            count += count_unpaid(list.cobj);
        list = list.nobj;
    }
    return count;
}

export function consume_obj_charge(obj, maybe_unpaid) {
    if (maybe_unpaid)
        check_unpaid(obj);
    obj.spe -= 1;
    if (obj.known)
        update_inventory(); // C invent.c:1344.
}

/* C ref: invent.c learn_unseen_invent() — called when regaining sight */
export function learn_unseen_invent() {
    const g = game;
    
    /* C: if (Blind) return; */
    const Blind = _Blind_cmd();
    if (Blind)
        return;
    
    /* Renamed from PM_ARCHEOLOGIST/PM_CLERIC: these are roles.js ROLE INDICES
     * compared against g.flags.initrole, NOT the PM_ (mons[]) indices that C's
     * Role_if() compares -- PM_ARCHEOLOGIST is 331 in js/pm.generated.js.  Under
     * the old names they shadowed the module import and silently won. */
    const ROLEIDX_CLERIC = 6;
    const ROLEIDX_ARCHEOLOGIST = 0;
    const SCROLL_CLASS = 9; /* OCLASS_SCROLL */
    
    let invupdated = false;
    for (let otmp = g.invent; otmp; otmp = otmp.nobj) {
        /* C: if (otmp->dknown && (otmp->bknown || !Role_if(PM_CLERIC)) &&
               (otmp->oclass != SCROLL_CLASS || !Role_if(PM_ARCHEOLOGIST)))
               continue; */
        const initrole = (g.flags?.initrole ?? -1) | 0;
        if (otmp.dknown && (otmp.bknown || initrole !== ROLEIDX_CLERIC) &&
            (otmp.oclass !== SCROLL_CLASS || initrole !== ROLEIDX_ARCHEOLOGIST))
            continue;
        
        invupdated = true;
        /* xname() will set dknown, perhaps bknown (for priest[ess]) */
        maybereleaseobuf(xname(otmp));
        addinv_core2(otmp);
    }
    if (invupdated)
        update_inventory();
}

export function addinv_core2(obj, msgSink) {
    const g = game;
    
    /* invent.c:1027 if (confers_luck(obj)) — a luckstone OR a SPFX_LUCK artifact */
    if (confers_luck(obj)) {
        /* new luckstone must be in inventory by this point
           for correct calculation */
        set_moreluck();
    }
    
    /* Archeologists can decipher the writing on a scroll label to work out
       what they are (exception: unlabeled scrolls don't have a label to
       decipher) */
    const initrole = (g.flags?.initrole ?? -1) | 0;
    /* Renamed from PM_ARCHEOLOGIST/PM_CLERIC: these are roles.js ROLE INDICES
     * compared against g.flags.initrole, NOT the PM_ (mons[]) indices that C's
     * Role_if() compares -- PM_ARCHEOLOGIST is 331 in js/pm.generated.js.  Under
     * the old names they shadowed the module import and silently won. */
    const ROLEIDX_ARCHEOLOGIST = 0;
    const SCROLL_CLASS = 9;
    const SCR_BLANK_PAPER = 365;
    const Blind = _Blind_cmd();
    
    if (initrole === ROLEIDX_ARCHEOLOGIST && obj.oclass === SCROLL_CLASS &&
        obj.otyp !== SCR_BLANK_PAPER && !Blind &&
        !(game._oc_name_known && game._oc_name_known[obj.otyp])) {
        observe_object(obj);
        /* js/display.js:3124 pline(msg) takes ONE string, so the varargs form
         * printed the literal "%s" to the topline.  C ref: read.c:206
         * pline("You decipher the label on %s.", yname(obj)). */
        const _decipher = _plineVFmt("You decipher the label on %s.", [yname(obj)]);
        if (msgSink)
            msgSink.push(_decipher);
        else
            pline(_decipher);
        /* C invent.c:1041 makeknown(obj->otyp) — hack.h:1530 expands to
         * discover_object(otyp, TRUE, TRUE, TRUE), and that fourth TRUE draws
         * exercise()'s rn2(19).  C evaluates yname(obj) for the pline BEFORE
         * this, which is why the message names the unidentified appearance
         * ("your scrolls labeled JUYED AWK YACC") and the prinv that follows
         * names the identified type. */
        makeknown(obj.otyp);
        
        /* conduct: this is avoidable via not picking up / wishing for
           scrolls */
        const u = g.u || {};
        u.uconduct = u.uconduct || {};
        if (u.uconduct.literate == null)
            u.uconduct.literate = 0;
        if (!u.uconduct.literate++)
            livelog_printf(LL_CONDUCT,
                           "became literate by deciphering a scroll label");
    }
}

const FINGERTIP = 4;

// prinv — C ref: invent.c:2874
export async function prinv(prefix, obj, quan) {
    let total_of = (quan && (quan < obj.quan));
    let totalbuf = "";

    if (!prefix)
        prefix = "";

    if (total_of)
        totalbuf = ` (${obj.quan} in total).`;

    /* returned so an async caller can await the pline (C prinv is void; the
     * only difference here is that our pline is a promise). */
    return pline(prefix + (prefix ? " " : "") +
          (await xprname(obj, null, obj_to_let(obj), !total_of, 0, quan)) +
          (game.flags.verbose ? totalbuf : ""));
}

/* C ref: invent.c:2861 obj_to_let(obj) — the letter prinv prints for an object.
 * Under fixinv it is just obj->invlet; the !invlet_constant arm re-letters the
 * whole pack through the shared reassign(). Was a stub
 * returning the constant 'a', so every prinv line named slot 'a' whatever the
 * object's real slot was. */
export function obj_to_let(obj) {
    if (!_invlet_constant()) {
        obj.invlet = NOINVSYM; /* NOINVSYM while reassign() scans the chain */
        reassign();
    }
    return String.fromCharCode(obj.invlet | 0);
}

const XPRNAME_BUFSZ = 256;      /* C config.h BUFSZ */

const CONTAINED_SYM = '>';      /* C invent.c:44 */

const HANDS_SYM = '-';          /* C hack.h */

/* C ref: invent.c:2895 xprname(obj, txt, let, dot, cost, quan) — the single
 * "<invlet> - <name>." inventory line.  Was a stub returning the literal
 * "<let> - item."; doname() has since landed (d3392780), so the real
 * `txt = doname(obj)` of invent.c:2924 is what runs now.  doname -> xname ->
 * xname_flags (objnam.c:627-628) is also where the `if (!Blind &&
 * !gd.distantname) observe_object(obj)` side effect lives, so the stub's
 * hand-rolled observe_object() call is gone rather than duplicated.
 * The cost / let=='*' branch (the shop-bill and total lines, invent.c:2930-2940)
 * uses the same currency formatter as doprgold and preserves the menu-tab
 * spacing option. */
export async function xprname(obj, txt, let_, dot, cost, quan) {
    const use_invlet = (_invlet_constant() && obj != null
                        && let_ !== CONTAINED_SYM && let_ !== HANDS_SYM);
    let savequan = 0;
    let fmt45 = false;
    if (quan && obj) {
        savequan = obj.quan;
        obj.quan = quan;
    }
    if (!txt)
        txt = (await doname(obj));
    let txtlen = txt.length;
    let suffix;
    if (cost !== 0 || let_ === '*') {
        if (dot && use_invlet)
            let_ = String.fromCharCode(obj.invlet | 0);
        suffix = `${game.iflags?.menu_tab_sep ? '\t' : ' '}${String(cost).padStart(6)} ${currency(cost).slice(0, 50)}`;
        if (!game.iflags?.menu_tab_sep) {
            /* fmt = "%c - %-45.*s%s" (invent.c:2930-2935) */
            fmt45 = true;
            txtlen = Math.max(txtlen, 45);
        }
    } else {
        /* ordinary inventory display or pickup message */
        if (use_invlet)
            let_ = String.fromCharCode(obj.invlet | 0);
        suffix = dot ? '.' : '';
    }
    /* C: 4 is the "c - " prefix */
    if (txtlen > XPRNAME_BUFSZ - 1 - (4 + suffix.length))
        txtlen = XPRNAME_BUFSZ - 1 - (4 + suffix.length);
    const body = txt.slice(0, txtlen);
    const li = `${let_} - ${fmt45 ? body.padEnd(txtlen) : body}${suffix}`;
    if (savequan)
        obj.quan = savequan;
    return li;
}

/* C ref: invent.c:3633 find_unpaid(list, &last_found); `marker` is {v}. */
function find_unpaid(list, marker) {
    while (list) {
        if (list.unpaid) {
            if (marker.v) {
                if (list === marker.v)
                    marker.v = null;
            } else
                return (marker.v = list);
        }
        if (Has_contents(list)) {
            const o = find_unpaid(list.cobj, marker);
            if (o) return o;
        }
        list = list.nobj;
    }
    return null;
}

/* C ref: invent.c:3654 dounpaid() — the 'u' arm of I. */
async function dounpaid(count, floorcount, buriedcount) {
    const g = game;
    const xtracount = floorcount + buriedcount;
    const marker = { v: null };
    let otmp = null;
    if (count === 1 && !xtracount)
        otmp = find_unpaid(g.invent, marker);
    /* unknwn_contnr_contents(): a container whose contents are not known */
    const contnr = otmp && unknwn_contnr_contents(otmp);
    g.iflags = g.iflags || {};
    if (otmp && !contnr) {
        const cost = await shk_unpaid_cost(otmp, 0);
        g.iflags.suppress_price = (g.iflags.suppress_price | 0) + 1;
        const nm = await _fw_distant_name(otmp, doname);
        const line = await xprname(otmp, nm, (otmp.where | 0) === 3
            ? String.fromCharCode(otmp.invlet | 0) : CONTAINED_SYM, true, cost, 0);
        await pline(line);
        g.iflags.suppress_price = (g.iflags.suppress_price | 0) - 1;
        return;
    }
    const lines = [];
    let totcost = 0, num_so_far = 0;
    // C invent.c:3683-3695: reletter the pack, then walk it once or per class.
    if (!_invlet_constant()) reassign();
    const sortpack = g.flags.sortpack ?? true;
    const order = sortpack ? (g.flags.inv_order || INV_ORDER) : [0];
    for (const oc of order) {
        let classcount = 0;
        for (let o = g.invent; o; o = o.nobj) {
            if (o.unpaid && (!sortpack || (o.oclass | 0) === oc)) {
                if (sortpack && !classcount) {
                    lines.push(`Unpaid ${OCLASS_NAME[oc]}`);
                    classcount++;
                }
                const cost = await shk_unpaid_cost(o, 0);
                totcost += cost;
                g.iflags.suppress_price = (g.iflags.suppress_price | 0) + 1;
                const nm = await _fw_distant_name(o, doname);
                lines.push(await xprname(o, nm, String.fromCharCode(o.invlet | 0), true, cost, 0));
                g.iflags.suppress_price = (g.iflags.suppress_price | 0) - 1;
                num_so_far++;
            }
        }
    }
    if (count > num_so_far) {
        if (sortpack) lines.push('Unpaid Bagged/Boxed items');
        for (let o = g.invent; o; o = o.nobj) {
            if (Has_contents(o)) {
                let contcost = 0;
                const mk = { v: null };
                let m;
                while ((m = find_unpaid(o.cobj, mk))) {
                    const cost = await shk_unpaid_cost(m, 0);
                    totcost += cost;
                    contcost += cost;
                    if (o.cknown) {
                        g.iflags.suppress_price = (g.iflags.suppress_price | 0) + 1;
                        lines.push(await xprname(m, await _fw_distant_name(m, doname), CONTAINED_SYM, true, cost, 0));
                        g.iflags.suppress_price = (g.iflags.suppress_price | 0) - 1;
                    }
                }
                if (!o.cknown)
                    lines.push(await xprname(null, `${s_suffix(xname(o))} contents`, CONTAINED_SYM, true, contcost, 0));
            }
        }
    }
    if (count > 0) {
        lines.push('');
        lines.push(await xprname(null, 'Total:', '*', false, totcost, 0));
    }
    if (xtracount > 0) {
        const floorverb = xtracount > 1 ? 'are' : 'is';
        const where = buriedcount === 0 ? 'on the floor'
            : floorcount === 0 ? 'under the floor' : 'on or under the floor';
        if (!count) {
            await You(`aren't carrying any unpaid items but there ${floorverb} ${xtracount} ${where}.`);
        } else {
            lines.push('');
            lines.push(`(There ${floorverb} ${xtracount} more unpaid object${xtracount === 1 ? '' : 's'} ${where}.)`);
        }
    }
    if (count > 0)
        await dbase_display_window(lines);
}

/* ══ #adjust — C ref: invent.c doorganize() / doorganize_core() ═════════════
 * The inventory organizer.  Had no dispatch arm and no handler, so '#adjust\n'
 * consumed only the typed name and every key C spends inside the command ran as
 * a top-level command.
 */
const _ADJ_COIN_CLASS = 12;        /* defsym.h OBJCLASS(12, '$', COIN, ...) */

const _ADJ_GOLD_SYM = '$';         /* defsym.h COIN_CLASS symbol */

const _ADJ_INVLET_BASIC = 52;      /* C invent.c invlet_basic — 'a'-'z' + 'A'-'Z' */

const _ADJ_QUITCHARS = ' \r\n\x1b';/* C decl.c:96 const char quitchars[] */

/* C ref: invent.c:4891 check_invent_gold(why) — TRUE when gold is in a wonky
 * state (more than one stack, or a stack outside the '$' slot), which is the
 * only condition under which gold may be #adjusted.  C also impossible()s a
 * description of the problem on the way out; impossible() is a paniclog+pline
 * for a state this port cannot construct (there is exactly one coin stack and
 * addinv forces it into '$'), so the diagnostic is named here rather than
 * guessed at. */
export function check_invent_gold(why) {
    let goldstacks = 0, wrongslot = 0;

    for (let otmp = game.invent; otmp; otmp = otmp.nobj)
        if ((otmp.oclass | 0) === _ADJ_COIN_CLASS) {
            ++goldstacks;
            if (String.fromCharCode(otmp.invlet | 0) !== _ADJ_GOLD_SYM)
                ++wrongslot;
        }

    if (goldstacks > 1 || wrongslot > 0) {
        impossible_cmd('%s: %s%s%s', why,
                   (wrongslot > 1) ? 'gold in wrong slots'
                      : (wrongslot > 0) ? 'gold in wrong slot' : '',
                   (wrongslot > 0 && goldstacks > 1) ? ' and ' : '',
                   (goldstacks > 1) ? 'multiple gold stacks' : '');
        return true;  /* gold can be #adjusted */
    }

    return false;     /* gold can't be #adjusted */
}

/* C ref: invent.c:4915 adjust_ok(obj) — getobj callback, excludes gold. */
function adjust_ok(obj) {
    if (!obj || (obj.oclass | 0) === _ADJ_COIN_CLASS)
        return GETOBJ_EXCLUDE;

    return GETOBJ_SUGGEST;
}

/* C ref: invent.c:4925 adjust_gold_ok(obj) — as above but gold is allowed. */
function adjust_gold_ok(obj) {
    if (!obj)
        return GETOBJ_EXCLUDE;

    return GETOBJ_SUGGEST;
}

async function _display_used_invlets(avoidlet) {
    const candidates = [];
    for (let o = game.invent; o; o = o.nobj)
        if ((o.invlet | 0) !== (avoidlet | 0)) candidates.push(o);
    if (!candidates.length) return '\0';
    const { selectedObj, cancelled } = await inventory_menu_legacy({
        title: 'Inventory letters used:',
        endMenuPrompt: true,
        /* display_used_invlets (invent.c:3480) walks gi.invent per class: no sortloot */
        invChainOrder: true,
        filter: (o) => (o.invlet | 0) !== (avoidlet | 0),
    });
    /* C invent.c:3510-3513: n > 0 → the picked letter; n == 0 (menu finished
     * with nothing picked, e.g. ' ' on the last page) → '\0', which the caller
     * re-prompts on; n < 0 (ESC) → '\033', which cancels the adjust. */
    if (selectedObj) return String.fromCharCode(selectedObj.invlet | 0);
    return cancelled ? '\x1b' : '\0';
    return selectedObj ? String.fromCharCode(selectedObj.invlet | 0) : '\0';
    if (selectedObj) return String.fromCharCode(selectedObj.invlet | 0);
    /* C invent.c:3515 `ret = !n ? '\0' : '\033'`: ESC cancels the menu
     * (wintty n == -1 -> '\033', "Never mind."), but a menu finished with
     * nothing picked (n == 0, e.g. ' ' on the last page) is '\0', which the
     * caller turns into a re-prompt (invent.c:5147 `if (!let) continue`). */
    return cancelled ? '\x1b' : '\0';
    return selectedObj ? String.fromCharCode(selectedObj.invlet | 0) : '\0';
}

/* C ref: invent.c:731 `#define inv_rank(o) ((o)->invlet ^ 040)` and invent.c:737
 * reorder_invent() — the bubble pass that puts gi.invent back into invlet order
 * after doorganize's inline insertion.  XOR 040 is what sorts '$' (0x04) first
 * and interleaves 'a' (0x41) before 'A' (0x61). */
function _adj_inv_rank(o) { return (o.invlet | 0) ^ 0o40; }

/* Exported: this is the ONE C-faithful reorder_invent() the addinv paths share.
 * C runs it from BOTH doorganize() (invent.c:5266/5275) and addinv_core0()
 * (invent.c:1120), and the addinv callers in this port were each hand-rolling a
 * tail-append in its place. */
export function reorder_invent() {
    const g = game;
    let need_more_sorting;

    do {
        need_more_sorting = false;
        let otmp = g.invent, prev = null, next;
        while (otmp) {
            next = otmp.nobj;
            if (next && _adj_inv_rank(next) < _adj_inv_rank(otmp)) {
                need_more_sorting = true;
                if (prev)
                    prev.nobj = next;
                else
                    g.invent = next;
                otmp.nobj = next.nobj;
                next.nobj = otmp;
                prev = next;
            } else {
                prev = otmp;
                otmp = next;
            }
        }
    } while (need_more_sorting);
}

/* C ref: mkobj.c:2600 extract_nobj(obj, &gi.invent) — unlink one object from the
 * inventory chain WITHOUT freeinv's side effects (that is the whole point of
 * doorganize using it: no double-touching artifacts, dousing lamps, &c). */
function _adj_extract_nobj_invent(obj) {
    const g = game;
    if (g.invent === obj) {
        g.invent = obj.nobj;
    } else {
        let prev = g.invent;
        while (prev && prev.nobj !== obj) prev = prev.nobj;
        if (!prev)
            throw new Error('extract_nobj: object lost');
        prev.nobj = obj.nobj;
    }
    obj.nobj = null;
    obj.where = 0; /* OBJ_FREE */
}

/* C ref: invent.c:4981 doorganize() — the #adjust command, "inventory organizer
 * by Del Lamb". */
export async function doorganize() {
    const g = game;
    let adjust_filter;

    /* when no invent, or just gold in '$' slot, there's nothing to adjust */
    if (!g.invent || ((g.invent.oclass | 0) === _ADJ_COIN_CLASS
                      && String.fromCharCode(g.invent.invlet | 0) === _ADJ_GOLD_SYM
                      && !g.invent.nobj)) {
        await You(`aren't carrying anything ${!g.invent ? 'to adjust' : 'adjustable'}.`);
        return ECMD_OK;
    }

    if (!_invlet_constant())
        reassign();

    /* filter passed to getobj() depends upon gold sanity */
    adjust_filter = check_invent_gold('adjust') ? adjust_gold_ok : adjust_ok;

    /* C passes GETOBJ_PROMPT | GETOBJ_ALLOWCNT; the shared reader returns the
     * split child for either a direct numeric prefix or a counted menu pick. */
    const obj = await getObjFromGetobj('adjust', adjust_filter, GETOBJ_PROMPT | GETOBJ_ALLOWCNT); /* invent.c:5001 */

    return doorganize_core(obj);
}

// C invent.c:5008 — alternate #adjust, entered with the source letter queued.
export async function adjust_split() {
    let splitamount = 0n;
    let obj = await getObjFromGetobj('split', adjust_ok, GETOBJ_NOFLAGS);
    if (!obj || obj.quan < 2 || obj.otyp === 438) // GOLD_PIECE (objects.h)
        return ECMD_FAIL;

    if (obj.quan === 2) {
        splitamount = 1n;
    } else {
        const dig = await yn_function('Split off how many?', null, '\0', true);
        if (dig < '0' || dig > '9') {
            await pline('Never mind.');
            return ECMD_CANCEL;
        }
        const count = {value: 0n};
        const let_ = await get_count(null, dig.charCodeAt(0), 0, count,
                                     GC_ECHOFIRST | GC_CONDHIST);
        splitamount = count.value;
        if (!let_ || let_ === 27 || !' \r\n\x1b'.includes(String.fromCharCode(let_))) {
            await pline('Never mind.');
            return ECMD_CANCEL;
        }
    }
    if (splitamount < 1n || splitamount >= BigInt(obj.quan)) {
        const amount = 'Amount to split from current stack must be';
        await pline(splitamount < 1n ? `${amount} at least 1.`
                                    : `${amount} less than ${obj.quan}.`);
        return ECMD_CANCEL;
    }
    obj = (await splitobj(obj, Number(splitamount)));
    return doorganize_core(obj);
}

/* C ref: invent.c:5068 doorganize_core(obj). */
async function doorganize_core(obj) {
    const g = game;
    const GOLD_INDX = 0, GOLD_OFFSET = 1;
    const OVRFLW_INDX = GOLD_OFFSET + _ADJ_INVLET_BASIC; /* past gold+2*26 letters */
    let otmp, splitting = null, bumped = null;
    let ix, cur, trycnt;
    let let_;
    let qbuf;
    let adj_type;
    let ever_mind = false, collect, isgold;

    if (!obj)
        return ECMD_CANCEL;

    /* can only be gold if check_invent_gold() found a problem */
    isgold = ((obj.oclass | 0) === _ADJ_COIN_CLASS);

    /* figure out whether user gave a split count to getobj() */
    for (otmp = g.invent; otmp; otmp = otmp.nobj)
        if (otmp.nobj === obj) { /* knowledge of splitobj() operation */
            if ((otmp.invlet | 0) === (obj.invlet | 0))
                splitting = otmp;
            break;
        }

    /* initialize the list with all lower and upper case letters.  C's `lets` is
     * a char[1 + 52 + 1 + 1] laid out as [gold][a-zA-Z][overflow][NUL]; the
     * index arithmetic below is that layout, kept literal. */
    const lets = new Array(1 + _ADJ_INVLET_BASIC + 1 + 1).fill('\0');
    lets[GOLD_INDX] = isgold ? _ADJ_GOLD_SYM : ' ';
    ix = GOLD_OFFSET;
    for (let c = 0x61 /* 'a' */; c <= 0x7a /* 'z' */; c++) lets[ix++] = String.fromCharCode(c);
    for (let c = 0x41 /* 'A' */; c <= 0x5a /* 'Z' */; c++) lets[ix++] = String.fromCharCode(c);
    lets[OVRFLW_INDX] = ' ';
    lets[lets.length - 1] = '\0';
    /* for floating inv letters, truncate list after the first open slot
       (invent.c:5108-5110) */
    if (!_invlet_constant() && (ix = inv_cnt(false)) < _ADJ_INVLET_BASIC)
        lets[ix + (splitting ? 1 : 2)] = '\0';

    /* blank out all the letters currently in use in the inventory
       except those that will be merged with the selected object */
    for (otmp = g.invent; otmp; otmp = otmp.nobj)
        if (otmp !== obj && !(await mergable(otmp, obj))) {
            const l = otmp.invlet | 0;
            if (l >= 0x61 && l <= 0x7a)
                lets[GOLD_OFFSET + l - 0x61] = ' ';
            else if (l >= 0x41 && l <= 0x5a)
                lets[GOLD_OFFSET + l - 0x41 + 26] = ' ';
            /* overflow defaults to off, but if we find a stack using that
               slot, switch to on -- the opposite of normal invlet handling */
            else if (String.fromCharCode(l) === String.fromCharCode(NOINVSYM))
                lets[OVRFLW_INDX] = String.fromCharCode(NOINVSYM);
        }

    /* compact the list by removing all the blanks */
    for (ix = cur = 0; lets[ix] !== '\0'; ix++)
        if (lets[ix] !== ' ' && cur++ < ix)
            lets[cur - 1] = lets[ix];
    let letsStr = lets.slice(0, cur).join('');
    /* and by dashing runs of letters */
    if (cur > 5)
        letsStr = compactify(letsStr);

    /* get 'to' slot to use as destination */
    if (!splitting)
        qbuf = 'Adjust letter';
    else /* note: splitting->quan is the amount being left in original slot */
        qbuf = `Split ${obj.quan}`;
    qbuf += ` to what [${letsStr}]${g.invent ? ' (? see used letters)' : ''}?`;
    for (trycnt = 1; ; ++trycnt) {
        let noadjust = false;
        // C invent.c:5144; tty_yn_function (topl.c:397-399) pages prior plines.
        let_ = !isgold ? await yn_function(qbuf, null, '\0', true) : _ADJ_GOLD_SYM;
        if (let_ === '?' || let_ === '*') {
            /* C: let = display_used_invlets(splitting ? obj->invlet : 0);
             * if (!let) continue;  (invent.c:5146-5147) — re-prompt, do not
             * treat as quit. */
            let_ = await _display_used_invlets(splitting ? obj.invlet : 0);
            /* C invent.c:5146-5148: `if (!let) continue;` — nothing picked
             * from the used-letters menu re-asks the adjust prompt. */
            if (let_ === '\0') continue;
            if (let_ === '\0') continue; /* C invent.c:5143 if (!let) continue; */
            if (let_ === '\0') continue;
            if (let_ === '\0') continue; /* C invent.c:5143 if (!let) continue; */
        }
        /* C strchr(quitchars, let): note strchr also matches the terminating
           NUL, so a '\0' response is a quitchar in C too. */
        if (let_ === '\0' || _ADJ_QUITCHARS.includes(let_)
            /* adjusting to same slot is meaningful since all
               compatible stacks get collected along the way,
               but splitting to same slot is not */
            || (splitting && let_ === String.fromCharCode(obj.invlet | 0))) {
            noadjust = true;
        } else if (let_ === _ADJ_GOLD_SYM && (obj.oclass | 0) !== _ADJ_COIN_CLASS) {
            await pline(`Only gold coins may be moved into the '${_ADJ_GOLD_SYM}' slot.`);
            ever_mind = true;
            noadjust = true;
        }
        if (noadjust) {
            if (splitting)
                await merged({ o: splitting }, { o: obj });
            if (!ever_mind)
                await pline('Never mind.');
            return ECMD_OK;
        }
        /* letter() classifies '@' as one; compactify() can put '-' in lets;
           the only thing of interest that strchr() might find is '$' or '#'
           since letter() catches everything else that we put into lets[] */
        if ((letter(let_) && let_ !== '@') || (letsStr.includes(let_) && let_ !== '-'))
            break; /* got one */
        if (trycnt === 5) {
            if (splitting)
                await merged({ o: splitting }, { o: obj });
            if (!ever_mind)
                await pline('Never mind.');
            return ECMD_OK;
        }
        await pline('Select an inventory slot letter.'); /* else try again */
    }

    collect = (let_ === String.fromCharCode(obj.invlet | 0));
    /* change the inventory and print the resulting item */
    adj_type = collect ? 'Collecting:'
        : !splitting ? 'Moving:'
            : 'Splitting:';

    /*
     * don't use freeinv/addinv to avoid double-touching artifacts,
     * dousing lamps, losing luck, cursing loadstone, etc.
     */
    _adj_extract_nobj_invent(obj);

    for (otmp = g.invent; otmp; ) {
        /* C reads the two ONAMEs fresh each pass because merged() can free
         * ONAME(obj) and replace it with ONAME(otmp). */
        const otmpname = has_oname(otmp) ? otmp.oextra.oname : null;
        const objname = has_oname(obj) ? obj.oextra.oname : null;

        if (collect) {
            if ((!otmpname || (objname && objname === otmpname))
                && (await mergable(otmp, obj))
                && (await merged({ o: otmp }, { o: obj }))) {
                obj = otmp;
                otmp = otmp.nobj;
                _adj_extract_nobj_invent(obj);
                continue;
            }
        } else if ((otmp.invlet | 0) === let_.charCodeAt(0)) {
            /* Merging: when from and to are compatible */
            if ((!otmpname || (objname && objname === otmpname))
                && (await mergable(otmp, obj))
                && (await merged({ o: otmp }, { o: obj }))) {
                adj_type = 'Merging:';
                obj = otmp;
                otmp = otmp.nobj;
                _adj_extract_nobj_invent(obj);
                break;
            }
            /* Moving or splitting: don't merge extra compatible stacks.
               Found 'otmp' in destination slot; merge if compatible,
               otherwise bump whatever is there to an open slot. */
            if (!splitting) {
                adj_type = 'Swapping:';
                otmp.invlet = obj.invlet | 0;
            } else {
                const savedName = objname;
                if (savedName && !obj.oartifact && obj.oextra)
                    obj.oextra.oname = null;
                if (!(await mergable(otmp, obj)) && savedName)
                    obj.oextra.oname = savedName; // C invent.c:5232-5235: restore before merged().
                if (await merged({ o: otmp }, { o: obj })) {
                    adj_type = 'Splitting and merging:';
                    obj = otmp;
                    _adj_extract_nobj_invent(obj);
                } else if (inv_cnt(false) >= _ADJ_INVLET_BASIC) {
                    await merged({ o: splitting }, { o: obj });
                    await Your('pack is too full.');
                    return ECMD_OK;
                } else {
                    bumped = otmp;
                    _adj_extract_nobj_invent(bumped);
                }
            }
            break; /* not collecting and found 'to' slot */
        } /* collect */
        otmp = otmp.nobj;
    }

    /* inline addinv; insert loose object at beginning of inventory */
    obj.invlet = let_.charCodeAt(0);
    obj.nobj = g.invent;
    obj.where = 3 /* OBJ_INVENT */;
    g.invent = obj;
    reorder_invent();
    if (bumped) {
        /* C invent.c:5271 assigninvlet(bumped) — the one port, js/invent.js */
        assigninvlet(bumped);
        bumped.nobj = g.invent;
        bumped.where = 3;
        g.invent = bumped;
        reorder_invent();
    }

    /* messages deferred until inventory has been fully reestablished */
    await prinv(adj_type, obj, 0);
    if (bumped)
        await prinv('Moving:', bumped, 0);
    if (splitting)
        clear_splitobjs(); /* reset splitobj context */
    update_inventory();
    return ECMD_OK;
}

// ─── addinv_core1 (C ref: invent.c:959) ───────────────────────────────────
// C ref: obj.h:435-436 — svc.context.achieveo is a plain embedded struct
// it's lazily shaped here the same way game.u is elsewhere in this file
// (e.g. pooleffects' `const u = g.u || (g.u = {})`).
const _ADDINV_COIN_CLASS = 12;

const _ADDINV_CANDELABRUM_OF_INVOCATION = 262;

const _ADDINV_BELL_OF_OPENING = 263;

const _ADDINV_SPE_BOOK_OF_THE_DEAD = 409;

// C ref: invent.c:959 addinv_core1(struct obj *obj)
/* C ref: you.h:30-37 `struct u_have` — a plain BSS-zeroed bitfield struct
 * embedded in `struct you` (you.h:446), so it always exists for the life of
 * the process; C code never null-checks `u.uhave`.  This port creates
 * `game.u` itself lazily (the `g.u || (g.u = {})` idiom used throughout this
 * file), so nothing guaranteed `game.u.uhave` existed before its first
 * touch — cmd.js:10892 already lazy-inits it at ONE read site, but
 * addinv_core1/freeinv_core read five of its fields unconditionally and, on
 * whichever code path reaches either of them BEFORE that other site has run,
 * `u.uhave` is `undefined` and the read throws.  Fix it at the source
 * (both readers, same lazy-init idiom, all five C fields zeroed) rather than
 * `?.`-guarding each read — a per-site guard would silently swallow the
 * missing initialiser and only relocate the next crash to the next
 * unguarded reader. */
function _ensure_uhave(u) {
    return u.uhave || (u.uhave = {
        amulet: 0, bell: 0, book: 0, menorah: 0, questart: 0,
    });
}

/* Returns a promise only when C's impossible() fires or a quest-artifact
 * pickup chains its intrinsic grant behind the gotit pager (both must
 * complete before the caller proceeds, as they do synchronously in C);
 * async callers await it, the sync ones keep the old fall-through. */
export function addinv_core1(obj) {
    let pending;
    const u = game.u || (game.u = {});
    const uh = _ensure_uhave(u);
    if ((obj.oclass | 0) === _ADDINV_COIN_CLASS) {
        SET_BOTL();
    } else if ((obj.otyp | 0) === _ADDINV_AMULET_OF_YENDOR) {
        if (uh.amulet)
            pending = real_impossible("already have amulet?");
        uh.amulet = 1;
        record_achievement(ACH_AMUL);
    } else if ((obj.otyp | 0) === _ADDINV_CANDELABRUM_OF_INVOCATION) {
        if (uh.menorah)
            pending = real_impossible("already have candelabrum?");
        uh.menorah = 1;
        record_achievement(ACH_CNDL);
    } else if ((obj.otyp | 0) === _ADDINV_BELL_OF_OPENING) {
        if (uh.bell)
            pending = real_impossible("already have silver bell?");
        uh.bell = 1;
        record_achievement(ACH_BELL);
    } else if ((obj.otyp | 0) === _ADDINV_SPE_BOOK_OF_THE_DEAD) {
        if (uh.book)
            pending = real_impossible("already have the book?");
        uh.book = 1;
        record_achievement(ACH_BOOK);
    } else if (obj.oartifact) {
        if (is_quest_artifact(obj)) {
            if (uh.questart)
                pending = real_impossible("already have quest artifact?");
            uh.questart = 1;
            const pager = artitouch(obj);
            if (pager)
                pending = pending ? Promise.all([pending, pager]) : pager;
        }
        /* C invent.c:986-991 — artitouch() runs qt_pager("gotit") to
         * completion BEFORE set_artifact_intrinsic() confers the carry
         * intrinsics: the pager's docrt()/see_monsters() paints with
         * ETelepat still unset, so a blind hero senses nothing there and
         * only the grant's own see_monsters() draws.  Keep the grant behind
         * the pager's promise so awaiters observe C's order; with nothing
         * pending it stays synchronous like C. */
        if (pending)
            pending = pending.then(
                () => set_artifact_intrinsic(obj, 1, W_ART));
        else
            set_artifact_intrinsic(obj, 1, W_ART);
    }

    /* "special achievements"; revealed in end of game disclosure and
       dumplog, originally just recorded in XLOGFILE */
    if (is_mines_prize(obj)) {
        record_achievement(ACH_MINE_PRIZE);
        game.context.achieveo.mines_prize_oid = 0; /* done w/ luckstone o_id */
        obj.nomerge = 0; /* was set in create_object(sp_lev.c) */
    } else if (is_soko_prize(obj)) {
        record_achievement(ACH_SOKO_PRIZE);
        game.context.achieveo.soko_prize_oid = 0; /* done w/ bag/amulet o_id */
        obj.nomerge = 0; /* (got set in sp_lev.c) */
    }
    return pending;
}

/* Fictional and not-so-fictional currencies.
 * http://concord.wikia.com/wiki/List_of_Fictional_Currencies
 */
const currencies = [
    "Altarian Dollar",       /* The Hitchhiker's Guide to the Galaxy */
    "Ankh-Morpork Dollar",   /* Discworld */
    "auric",                 /* The Domination of Draka */
    "buckazoid",             /* Space Quest */
    "cirbozoid",             /* Starslip */
    "credit chit",           /* Deus Ex */
    "cubit",                 /* Battlestar Galactica */
    "Flanian Pobble Bead",   /* The Hitchhiker's Guide to the Galaxy */
    "fretzer",               /* Jules Verne */
    "imperial credit",       /* Star Wars */
    "Hong Kong Luna Dollar", /* The Moon is a Harsh Mistress */
    "kongbuck",              /* Snow Crash */
    "nanite",                /* System Shock 2 */
    "quatloo",               /* Star Trek, Sim City */
    "simoleon",              /* Sim City */
    "solari",                /* Spaceballs */
    "spacebuck",             /* Spaceballs */
    "sporebuck",             /* Spore */
    "Triganic Pu",           /* The Hitchhiker's Guide to the Galaxy */
    "woolong",                /* Cowboy Bebop */
    "zorkmid",                /* Zork, NetHack */
];

// C ref: invent.c:1545 currency
export function currency(amount) {
    const u = game.u || {};
    const hallucProp = u.uprops && u.uprops[HALLUC];
    const HHallucination = hallucProp ? (hallucProp.intrinsic | 0) : 0;
    const hallucResProp = u.uprops && u.uprops[HALLUC_RES];
    const HHalluc_resistance = hallucResProp ? (hallucResProp.intrinsic | 0) : 0;
    const EHalluc_resistance = hallucResProp ? (hallucResProp.extrinsic | 0) : 0;
    const Halluc_resistance = HHalluc_resistance || EHalluc_resistance;
    const Hallucination = HHallucination && !Halluc_resistance;

    let res = Hallucination ? currencies[rn2(currencies.length)] : "zorkmid";
    if (amount !== 1 && amount !== 1n)
        res = makeplural_objnam(res);
    return res;
}

// ── dfeature_at (invent.c) ─────────────────────────────────────────────────
// C ref: invent.c dfeature_at(coordxy x, coordxy y, char *buf)
export function dfeature_at(x, y, buf) {
    const lev = _levlAt(x, y);
    if (!lev) return null;
    const ltyp = lev.typ;
    let dfeature = null;
    const stway = stairway_at(x, y);

    if (IS_DOOR(ltyp)) {
        switch (lev.doormask) {
        case D_NODOOR:
            dfeature = "doorway";
            break;
        case D_ISOPEN:
            dfeature = "open door";
            break;
        case D_BROKEN:
            dfeature = "broken door";
            break;
        default:
            dfeature = "closed door";
            break;
        }
        /* override door description for open drawbridge */
        if (dbridge_is_drawbridge_wall(x, y) >= 0)
            dfeature = "open drawbridge portcullis";
    } else if (IS_FOUNTAIN(ltyp)) {
        dfeature = "fountain";
    } else if (IS_THRONE(ltyp)) {
        dfeature = "opulent throne";
    } else if (is_lava(x, y)) {
        dfeature = "molten lava";
    } else if (is_ice(x, y)) {
        dfeature = ice_descr(x, y);
    } else if (is_pool(x, y)) {
        dfeature = "pool of water";
    } else if (IS_SINK(ltyp)) {
        dfeature = "sink";
    } else if (IS_ALTAR(ltyp)) {
        const high = (lev.altarmask & 0x10) ? "high " : "";
        dfeature = high + "altar to " + a_gname() + " (" + align_str(Amask2align(lev.altarmask & ~AM_SHRINE)) + ")";
    } else if (stway) {
        /* C invent.c:4082 — stairs_description(stway, altbuf, TRUE). */
        dfeature = stairs_description(stway, null, true);
    } else if (ltyp === 34) {  // DRAWBRIDGE_DOWN
        dfeature = "lowered drawbridge";
    } else if (ltyp === 12) {  // DBWALL
        dfeature = "raised drawbridge";
    } else if (IS_GRAVE(ltyp)) {
        dfeature = "grave";
    } else if (ltyp === 13) {  // TREE
        dfeature = "tree";
    } else if (ltyp === 22) {  // IRONBARS
        dfeature = "set of iron bars";
    }

    return dfeature;
}

/* C ref: invent.c:646 unsortloot(Loot **loot_array_p) — free sortloot()'s
 * allocated Loot array and null the CALLER's pointer, so a later
 * `if (*loot_array_p)` test fails.  The Loot ** is a reference cell
 * `{ value: <Loot[]> }`; truncating the array in place (the old body) left
 * the caller's reference truthy. */
export function unsortloot(loot_array_p) {
    if (loot_array_p.value)
        /* free((genericptr_t) *loot_array_p) is a no-op in JS */
        loot_array_p.value = null;
}
export { delobj_core as _delobj_useupf };
