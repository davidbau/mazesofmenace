// invent.js — C ref: invent.c.
import { addinv_core1, addinv_core2, carry_obj_effects, freeinv, inv_cnt, mergable, obj_extract_self_general, prinv, reorder_invent } from './cmd.js';
import { FUMBLING, MENU_TRADITIONAL, ONAME, ONAME_SKIP_INVUPD, SHRINK_GLOB, Upolyd, W_QUIVER, W_SWAPWEP, W_WEP, has_oname } from './const.js';
import { dropx, dropy } from './do.js';
import { picked_container } from './dokick.js';
import { hitfloor, throwing_weapon } from './dothrow.js';
import { game } from './gstate.js';
import { COIN_CLASS, _uprop_on, ammo_and_launcher, can_reach_floor, is_ammo, is_missile } from './hold_another_object.js';
import { update_inventory } from './inventory_refresh.js';
import { obj_merge_light_sources } from './light.js';
import { splitobj } from './makemon.js';
import { dealloc_obj, place_object, remove_object, start_glob_timeout } from './mklev.js';
import { pudding_merge_message } from './mkobj.js';
import { observe_object } from './o_init.js';
import { oname } from './objnam.js';
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
import { _sortloot_within_class, fully_identify_obj as fully_identify_obj_cmd, ggetobj, useup } from './cmd.js'; // relocate-fns
import { build_window_screen, menu_search_case, tty_window_offx } from './com_pager.js'; // relocate-fns
import { _topl_joins_committed, docrt, flush_screen, obj_to_glyph, status_r1_menu_docrt, use_last_flush_snapshot } from './display.js'; // relocate-fns
import { nhgetch } from './input.js'; // relocate-fns
import { doname_with_price, not_fully_identified } from './objnam.js'; // relocate-fns
import { map_menu_cmd } from './options.js'; // relocate-fns
import { set_cursor, topline_more_loop } from './read.js'; // relocate-fns
import { menu_heading_text } from './tty_menu.js'; // relocate-fns
import { body_part, carrying as carrying_real, getObjFromGetobj, instapetrify as instapetrify_eat, will_feel_cockatrice as will_feel_cockatrice_real } from './cmd.js'; // relocate-fns
import { HAND } from './const.js'; // relocate-fns
import { poly_when_stoned as poly_when_stoned_eat } from './mondata.js'; // relocate-fns
import { corpse_xname, killer_xname, makeplural } from './objnam.js'; // relocate-fns
import { currency as cmd_currency, _delobj_useupf as delobj_core } from './cmd.js'; // relocate-fns
import { display_minventory, force_decor, instapetrify, mbodypart } from './cmd.js'; // relocate-fns
import { ECMD_OK, ECMD_TIME, ICE, Is_airlevel, Is_waterlevel, LOOKHERE_NOFLAGS, LOOKHERE_PICKED_SOME, LOOKHERE_SKIP_DFEATURE, PLNMSG_ONE_ITEM_HERE, STOMACH, STONE_RES, is_pit } from './const.js'; // relocate-fns
import { s_suffix } from './hacklib.js'; // relocate-fns
import { displayLookWindow } from './look-window.js'; // relocate-fns
import { _dfeature_at, _is_lava_local, _surface_at, _surface_lk, is_pool, read_engr_at } from './look.js'; // relocate-fns
import { trapname } from './makemon.js'; // relocate-fns
import { poly_when_stoned } from './mondata.js'; // relocate-fns
import { CXN_ARTICLE, CXN_PFX_THE, an, doname, vtense } from './objnam.js'; // relocate-fns
import { MSGTYP_MASK_REP_SHOW, hide_unhide_msgtypes } from './options.js'; // relocate-fns
import { reg_damg, visible_region_at } from './region.js'; // relocate-fns
import { t_at } from './trap.js'; // relocate-fns
import { mon_nam } from './uhitm.js'; // relocate-fns
import { _COIN_CLASS, _is_cleric } from './pickup.js'; // relocate-fns

/* ---------------------------------------------------------------------------
 * Constants, each with the C header it comes from.
 * ------------------------------------------------------------------------ */
/* include/hack.h:584 `invlet_basic = 52` — a..z then A..Z. */
const INVLET_BASIC = 52;

/* include/hack.h NOINVSYM '#', GOLD_SYM '$' (defsym.h:479 OBJCLASS2(12,'$',...)). */
const NOINVSYM = 0x23, GOLD_SYM = 0x24;

/* objects.h otyps. */
const CORPSE = 265, LOADSTONE = 471, CRYSKNIFE = 43;

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
 * js/cmd.js _adj_assigninvlet and js/eat.js _eat_assigninvlet forward here
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
    otmp.invlet = inuse[i] ? NOINVSYM : (i < 26 ? (0x61 + i) : (0x41 + i - 26));
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

function _Role_if(role_idx) {
    const ir = (game.flags && game.flags.initrole != null)
        ? (game.flags.initrole | 0) : -1;
    if (ir >= 0) return ir === role_idx;
    return ((game.urole && game.urole.mnum != null)
        ? (game.urole.mnum | 0) : -1) === role_idx;
}

function _Role_if_cleric() { return _Role_if(ROLE_PRIEST); }

/* C obj.h Has_contents(o) — a container with something in it. */
function Has_contents(obj) { return !!obj.cobj; }

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
    if (Has_contents(obj))
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

/* C ref: invent.c useup() / useupall() — consume one scroll from inventory.
 * A stack quan>1 is decremented; a singleton is unlinked from gi.invent. */
// C invent.c:1321-1333 useup(obj) — canonical port in js/cmd.js
export { useup };

/* C ref: invent.c:2698 count_unidentified — number of not-fully-identified items
 * in a chain. */
function count_unidentified(chain) {
    let n = 0;
    for (let o = chain; o; o = o.nobj)
        if (not_fully_identified(o)) n++;
    return n;
}

/* C ref: invent.c:2636 fully_identify_obj(otmp) — make an object actually
 * identified; no display updating.  makeknown(otyp) → discover_object(credit
 * hero=TRUE) → exercise(A_WIS) → rn2(19). */
function fully_identify_obj(otmp) {
    /* invent.c:2636 — the full body (observe_object, set_cknown_lknown, egg) lives in cmd.js */
    fully_identify_obj_cmd(otmp);
}

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
        const pageLines = lines.slice(pageIndex * PAGE_CONTENT, (pageIndex + 1) * PAGE_CONTENT);
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

export function carrying(otyp) { return carrying_real(otyp); }

export async function getobj(verb, callback, flags) {
    return await getObjFromGetobj(verb, callback, flags);
}

export async function feel_cockatrice(obj, force) {
    if (!will_feel_cockatrice(obj, force)) return;
    /* C invent.c:4348-4361: "the <cockatrice> corpse" via corpse_xname */
    const name = corpse_xname(obj, null, 4 /* CXN_PFX_THE */);
    if (game.youmonst?.data && poly_when_stoned_eat(game.youmonst.data))
        await pline(`You touched ${name} with your bare ${makeplural(body_part(HAND))}.`);
    else
        await pline(`Touching ${name} is a fatal mistake...`);
    await instapetrify_eat(`touching ${killer_xname(obj)} bare-handed`);
}

export function will_feel_cockatrice(obj, force) {
    return will_feel_cockatrice_real(obj, force);
}

export function currency(amt) { return cmd_currency(amt); }

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

/* C ref: invent.c:4333 will_feel_cockatrice(otmp, force_touch).  Forwards to
 * js/cmd.js's real port (imported above as will_feel_cockatrice_real).  The
 * local mirror this replaced read Blind via js/vision.js's Blind() while the
 * real port reads the same expression through cmd.js's _u_blind() — both are
 * (HBlinded || EBlinded) && !BBlinded (youprop.h:103), so the answers never
 * diverged; only the body count did. */
function _will_feel_cockatrice_lk(otmp, force_touch) {
    return will_feel_cockatrice_real(otmp, force_touch);
}

async function _feel_cockatrice_lk(otmp, force_touch) {
    if (!_will_feel_cockatrice_lk(otmp, force_touch)) return;
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
            if ((o.otyp | 0) === _CORPSE_OTYP && _will_feel_cockatrice_lk(o, false)) {
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
            if ((o.otyp | 0) === _CORPSE_OTYP && _will_feel_cockatrice_lk(o, false)) {
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
