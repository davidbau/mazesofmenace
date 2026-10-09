// hold_another_object.js — C ref: nethack-c-v5/upstream/src/invent.c
//
//   invent.c:1208  hold_another_object(obj, drop_fmt, drop_arg, hold_msg)
//   invent.c:1056  addinv_core0(obj, other_obj, update_perm_invent)
//   invent.c:1152  addinv(obj)
//   invent.c:1160  addinv_before(obj, other_obj)
//   invent.c:1169  addinv_nomerge(obj)
//   invent.c:814   merged(&otmp, &obj)
//   invent.c:694   assigninvlet(otmp)
//
// WHY THIS FILE EXISTS, AND WHY IT IS A FILE.
// `hold_another_object` is the "an object arrives in the hero's hands from
// somewhere that is not a pickup" entry point.  It had no JS counterpart at
// all, and three separate call sites in this port were standing on THROWING
// STUBS because of it:
//
//   js/mhitu.js:4434   u_catch_thrown_obj  — every monster that throws
//                      something at the hero, on the 1-in-(100-DEX) branch
//                      where the hero catches it.  This is the one that
//   js/cmd.js:18745    use_tinning_kit tin creation
//   js/wizcmds.js      makewish (has its own hand-rolled equivalent)
//
// It lives in its own module rather than in js/mhitu.js because it is
// invent.c, not mthrowu.c, and rather than in js/cmd.js (which hosts the
// other 521 invent.c references and would be its natural long-term home)
// dopickup copy of addinv_core0 and js/pickup_container.js's `_addinv` into
// the export below is the right follow-up; see the fleet-feedback note in
// this change's commit message.
//
// Inventory merging awaits the shared weapon setters and its messages.
// Callers must await these entries before using the survivor or continuing
// with deletion, weight, status, or input bookkeeping.
//
// RNG.  Read against the C, the whole reachable path draws EXACTLY ONCE, and
// only in one arm: `splitobj()` (invent.c:1275, the "undo any merge which
// took place" line) calls next_ident(), which is `rnd(2) @ mkobj.c:521`.
// Everything else here — observe_object/discover_object with
// mark_as_known=FALSE and credit_hero=FALSE, addinv_core1, addinv_core2,
// carry_obj_effects, merged, assigninvlet, reorder_invent, near_capacity,
// inv_cnt, prinv/xprname/doname and encumber_msg — is bookkeeping and text.
//
// 10 times across the 44 public ones, and NOT ONE of those 56 draws returned
// 0 — i.e. no recording in this repo contains a successful catch, so nothing
// downstream of the `!rn2(catch_chance)` branch can be checked against C.
// This port is therefore written from the C source and from the C source
// only; it is not calibrated against a recording and must not be treated as
// if it were.
//
// @ts-nocheck — js sibling imports.
import { game } from './gstate.js';
import { pudding_merge_message } from './mkobj.js';
import { pline } from './display.js';
import { observe_object } from './o_init.js';
import { obfree } from './shk.js';
import {
    mergable, prinv, reorder_invent, dropx, dropy, freeinv, hero_breaks,
    hitfloor, obj_extract_self_general,
    inv_cnt, setuqwep, setuwep,
    setuswapwep,
    carry_obj_effects, addinv_core1, addinv_core2, throwing_weapon,
} from './cmd.js';
import { near_capacity, encumber_msg_sync, weight } from './weight.js';
import { splitobj, attacktype } from './makemon.js';
import {
    u_safe_from_fatal_corpse, uteetering_at_seen_pit, uescaped_shaft,
    reset_justpicked,
} from './pickup.js';
import { sticks } from './dog.js';
import { t_at } from './trap.js';
import {
    Is_airlevel, Is_waterlevel, LEVITATION, FLYING, FUMBLING,
    ONAME, has_oname,
    Upolyd,
    BRK_FROM_INV, ESHK,
} from './const.js';
import { P_SKILL } from './skills.js';
import { oid_price_adjustment } from './shk.js';
import { onbill } from './shk.js';
import { oname, obj_typename } from './objnam.js';
/* C youprop.h Blind — js/vision.js's is the ONE live spelling in this port
 * (js/ball.js:425 records why: two file-local copies read the STRING key
 * `uprops.BLINDED` while every writer indexes numerically, so they were
 * dead code).  It is the same expression the botl "Blind" condition and
 * js/mhitu.js's own Blind_mu use. */
import { Blind } from './vision.js';
import { MKOBJ_OC_SKILL } from './mkobj_erosion_meta.js';
import { setnotworn } from './worn.js';
import { touch_artifact_youmonst } from './wizcmds.js';
import { place_object, remove_object, dealloc_obj } from './mklev.js';
import { update_inventory } from './inventory_refresh.js';
import { obj_merge_light_sources } from './light.js';
import { obj_stop_timers, stop_timer, start_timer } from './timeout.js';
import { SHRINK_GLOB, TIMER_OBJECT, ALTAR } from './const.js';

/* ---------------------------------------------------------------------------
 * Constants, each with the C header it comes from.
 * ------------------------------------------------------------------------ */
/* include/hack.h:584 `invlet_basic = 52` — a..z then A..Z. */
const INVLET_BASIC = 52;
/* include/hack.h NOINVSYM '#', GOLD_SYM '$' (defsym.h:479 OBJCLASS2(12,'$',...)). */
const NOINVSYM = 0x23, GOLD_SYM = 0x24;
/* include/objclass.h enum objclass_classes, via defsym.h:466-484. */
const COIN_CLASS = 12, WEAPON_CLASS = 2, TOOL_CLASS = 6, GEM_CLASS = 13;
/* objects.h otyps. */
const CORPSE = 265, LOADSTONE = 471;
/* include/hack.h:458-461 encumbrance levels (MOD_ENCUMBER = "stressed"). */
const MOD_ENCUMBER = 2;
/* include/pickup.h / hack.h — u_safe_from_fatal_corpse test mask.
 * st_gloves 0x1 | st_corpse 0x2 | st_petrifies 0x4 | st_resists 0x8. */
const ST_ALL = 0xf;
/* include/skills.h:64,95 — P_RIDING = 37, P_BASIC = 2. */
const P_RIDING = 37, P_BASIC = 2;
/* include/monattk.h:19 AT_HUGS. */
const AT_HUGS = 7;
/* include/monflag.h:85,89,92,93,182 and defsym.h:309 MONSYM(13,...,S_MIMIC). */
const M1_FLY = 0x00000001, M1_CLING = 0x00000010, M1_HIDE = 0x00000100;
const MZ_HUGE = 4, S_MIMIC = 13;
/* include/skills.h — P_BOW 20, P_CROSSBOW 22, P_DART 23, P_BOOMERANG 25. */
const P_BOW = 20, P_CROSSBOW = 22, P_DART = 23, P_BOOMERANG = 25;
/* include/obj.h:481-482 how_lost. */
const LOST_NONE = 0, LOST_THROWN = 1, LOST_EXPLODING = 4;
const OBJ_FREE = 0, OBJ_INVENT = 3;

/* ---------------------------------------------------------------------------
 * Hero-property readers.  u.uprops[<numeric>] is the ONE live spelling in this
 * port — see [[uprops has three spellings, one live]] and js/mhitu.js's
 * _uprop_on_mu, which reads the same shape.
 * ------------------------------------------------------------------------ */
function _uprop_on(idx) {
    const p = game.u?.uprops?.[idx];
    return !!p && !!((p.intrinsic | 0) || (p.extrinsic | 0)) && !(p.blocked | 0);
}
/* C youprop.h Levitation / Flying. */
function Levitation() { return _uprop_on(LEVITATION); }
function Flying() { return _uprop_on(FLYING); }

function _hero_data() {
    const ym = game.youmonst;
    return (ym && ym.data) ? ym.data : null;
}

/* C mondata.h:38-45.  is_hider/is_clinger/is_flyer are single mflags1 bits;
 * ceiling_hider adds the S_MIMIC exclusion on the clinger half.  An absent
 * permonst (a partially-seeded replay world) reads as "no flags", which is the
 * same convention js/eat.js is_clinger and js/mhitu.js nohands_mu use. */
function is_hider(ptr) { return (((ptr?.mflags1 | 0) >>> 0) & M1_HIDE) !== 0; }
function is_clinger(ptr) { return (((ptr?.mflags1 | 0) >>> 0) & M1_CLING) !== 0; }
function is_flyer(ptr) { return (((ptr?.mflags1 | 0) >>> 0) & M1_FLY) !== 0; }
function ceiling_hider(ptr) {
    return is_hider(ptr)
        && ((is_clinger(ptr) && (ptr?.mlet | 0) !== S_MIMIC) || is_flyer(ptr));
}

export function can_reach_floor(check_pit) {
    const u = game.u || {};
    const youdata = _hero_data();

    if (u.uswallow
        || (u.ustuck && !sticks(youdata)
            && attacktype(u.ustuck.data, AT_HUGS))
        || (Levitation() && !(Is_airlevel(u.uz) || Is_waterlevel(u.uz))))
        return false;
    if (u.usteed && P_SKILL(P_RIDING) < P_BASIC)
        return false;
    if (u.uundetected && ceiling_hider(youdata))
        return false;

    if (Flying() || (youdata && (youdata.msize | 0) >= MZ_HUGE))
        return true;

    if (check_pit) {
        const t = t_at(u.ux | 0, u.uy | 0);
        if (t && (uteetering_at_seen_pit(t) || uescaped_shaft(t)))
            return false;
    }
    return true;
}

/* ---------------------------------------------------------------------------
 * C invent.c:694 assigninvlet(otmp).  Ported verbatim, INCLUDING the two parts
 * the three existing hand-copies in this port drop: the loop's
 * `if (i == otmp->invlet) otmp->invlet = 0;` (a letter already held by another
 * object is taken away from the incoming one) and the early return that KEEPS
 * an already-valid letter.  The free-letter scan starts just AFTER
 * gl.lastinvnr and wraps — it does not restart at 'a', so a freed slot is
 * reused only once the cursor comes back around to it.  RNG-free.
 * ------------------------------------------------------------------------ */
function assigninvlet(otmp) {
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
 * Scoped, and the scope is named rather than hidden: the globby (pudding
 * absorb), oname-transfer and worn-slot-fixup arms are NOT ported, and each is
 * a named throw below rather than a silent skip, because each one changes the
 * OBJECT GRAPH and a wrong answer there survives into later turns (and, on a
 * level with bones, into the bones file — see js/oc_merge.generated.js's own
 * note about an unmerged arrow stack costing a `rnd(2) @ next_ident`).
 * mergable() itself is the shared export from js/cmd.js, which reads the real
 * per-otyp oc_merge column, so this never merges a pair C would refuse.
 * RNG-free.
 * ------------------------------------------------------------------------ */
export async function merged(potmp, pobj) {
    const otmp = potmp.o, obj = pobj.o;
    if (!(await mergable(otmp, obj)))
        return false;

    /* C:831-833 — approximate age, weighted by quantity.  C's arithmetic is
     * integer division on longs; Math.trunc matches (both operands are
     * non-negative here, but trunc is the rule this project uses). */
    if (!obj.lamplit && !obj.globby) {
        const q = (otmp.quan | 0) + (obj.quan | 0);
        if (q)
            otmp.age = Math.trunc((((otmp.age | 0) * (otmp.quan | 0))
                + ((obj.age | 0) * (obj.quan | 0))) / q);
    }

    if (!otmp.globby)
        otmp.quan = (otmp.quan | 0) + (obj.quan | 0);
    /* C:838-842 — the gold special case, then the non-pudding weight recompute. */
    if ((otmp.oclass | 0) === COIN_CLASS) {
        otmp.owt = weight(otmp);
        otmp.bknown = 0;
    } else if (!otmp.globby) { /* C's `else if (!Is_pudding(otmp))` */
        otmp.owt = weight(otmp);
    }
    if (!has_oname(otmp) && has_oname(obj))
        /* C oname(..., ONAME_SKIP_INVUPD) allocates the survivor's oextra and
         * copies the discarded stack's name without refreshing inventory.
         * The latter matters because merged() is still midway through its
         * bookkeeping and C's update_inventory happens in addinv's caller. */
        oname(otmp, ONAME(obj), 0x0200 /* ONAME_SKIP_INVUPD */);

    /* C invent.c:845: extraction is unconditional, including OBJ_FREE. */
    obj_extract_self_general(obj);

    /* C:847-848 */
    if (obj.pickup_prev && (otmp.where | 0) === OBJ_INVENT)
        otmp.pickup_prev = 1;

    /* C:851-854 — extinguish the absorbed light source and stop any remaining
     * object timers after the merge.  The helpers also maintain the live light
     * source/timer registries and the timed count. */
    if (obj.lamplit)
        obj_merge_light_sources(obj, otmp);
    if (obj.timed)
        obj_stop_timers(obj);
    /* C:862-875 — "objects can be identified by comparing them": each
     * dimension that differs becomes known on the combined stack, and (with
     * the two exceptions C spells out) that counts as a DISCOVERY. */
    let discovered = false;
    if ((obj.known | 0) !== (otmp.known | 0)) {
        otmp.known = 1;
        discovered = true;
    }
    if ((obj.rknown | 0) !== (otmp.rknown | 0)) {
        otmp.rknown = 1;
        if (otmp.oerodeproof)
            discovered = true;
    }
    if ((obj.bknown | 0) !== (otmp.bknown | 0)) {
        otmp.bknown = 1;
        if (!_Role_if_cleric())
            discovered = true;
    }

    /* C:878-901 — the #adjust worn-slot fixup.  A returned stack can merge
     * with a wielded/quivered stack; the surviving stack keeps the preferred
     * weapon slot and the discarded node is fully unworn. */
    if (obj.owornmask && (otmp.where | 0) === OBJ_INVENT) {
        const W_WEP = 0x00000100, W_QUIVER = 0x00000200,
              W_SWAPWEP = 0x00000400;
        const wmask = (otmp.owornmask | 0) | (obj.owornmask | 0);
        let chosen;
        if (wmask & W_WEP) chosen = W_WEP;
        else if (wmask & W_SWAPWEP) chosen = W_SWAPWEP;
        else if (wmask & W_QUIVER) chosen = W_QUIVER;
        else chosen = otmp.owornmask | 0;
        if ((otmp.owornmask | 0) & ~chosen)
            setnotworn(otmp);
        if (chosen === W_WEP) await setuwep(otmp);
        else if (chosen === W_SWAPWEP) await setuswapwep(otmp);
        else if (chosen === W_QUIVER) await setuqwep(otmp);
        setnotworn(obj);
    }

    /* C:922-923 */
    if (obj.bypass)
        otmp.bypass = 1;

    /* C:928-931 / mkobj.c:3702 — pudding globs absorb rather than add
     * quantity.  Preserve the weighted age and edible mass, combine status
     * flags, and average the two shrink timers before freeing the absorbed
     * object. */
    if (obj.globby) {
        await pudding_merge_message(otmp, obj); /* invent.c:929 */
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
        const tm1 = stop_timer(SHRINK_GLOB, { a_obj: otmp });
        const tm2 = stop_timer(SHRINK_GLOB, { a_obj: obj });
        const tm = Math.trunc(((tm1 || 25) + (tm2 || 25) + 1) / 2);
        start_timer(tm, TIMER_OBJECT, SHRINK_GLOB, { a_obj: otmp });

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

function _oc_skill(obj) { return MKOBJ_OC_SKILL[obj.otyp | 0] | 0; }
export function is_ammo(obj) {
    if (!obj) return false;
    const oc = obj.oclass | 0;
    return (oc === WEAPON_CLASS || oc === GEM_CLASS)
        && _oc_skill(obj) >= -P_CROSSBOW && _oc_skill(obj) <= -P_BOW;
}
function matching_launcher(a, l) {
    return !!l && _oc_skill(a) === -_oc_skill(l);
}
export function ammo_and_launcher(a, l) { return is_ammo(a) && matching_launcher(a, l); }
export function is_missile(obj) {
    if (!obj) return false;
    const oc = obj.oclass | 0;
    return (oc === WEAPON_CLASS || oc === TOOL_CLASS)
        && _oc_skill(obj) >= -P_BOOMERANG && _oc_skill(obj) <= -P_DART;
}

/* C obj.h Has_contents(o) — a container with something in it. */
function Has_contents(obj) { return !!obj.cobj; }

/* C shk.c:3084-3100 picked_container().  When a container itself is being
 * added to inventory, shop billing has already handled the outer object; this
 * recursive walk clears no_charge from non-gold contents, including nested
 * containers.  Gold is intentionally skipped by the C loop. */
function picked_container(obj) {
    for (let otmp = obj?.cobj; otmp; otmp = otmp.nobj) {
        if ((otmp.oclass | 0) === COIN_CLASS)
            continue;
        otmp.no_charge = 0;
        if (Has_contents(otmp))
            picked_container(otmp);
    }
}

/* ---------------------------------------------------------------------------
 * C invent.c:1056 addinv_core0(obj, other_obj, update_perm_invent).
 *
 * RNG-free.
 * ------------------------------------------------------------------------ */
export async function addinv_core0(obj, other_obj, update_perm_invent) {
    const g = game;
    const u = g.u || {};

    /* C:1064-1065 panic("addinv: obj not free") — a real invariant, not a
     * defensive check: everything below assumes the object is unlinked. */
    if ((obj.where | 0) !== OBJ_FREE)
        throw new Error(`addinv_core0: obj not free (where=${obj.where | 0})`);
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

            /* C:1128-1140 — fill an empty quiver if obj was thrown BY THE HERO.
             * `how_lost` is set to LOST_THROWN only in dothrow.c:1563, so an
             * object a MONSTER threw arrives here with LOST_NONE and this arm
             * cannot fire for u_catch_thrown_obj, which is the only live
             * caller.  Its remaining conjuncts need throwing_weapon()'s oc_dir
             * column (obj.h:249) and the ART_MJOLLNIR artilist index, neither
             * of which has a generated JS table — so it is NAMED rather than
             * approximated.  Reaching it requires flags.pickup_thrown AND a
             * hero-thrown object arriving through hold_another_object. */
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
        const crysknife = (obj.otyp | 0) === 43;
        const oerodeproof = obj.oerodeproof;
        place_object(obj, u.ux | 0, u.uy | 0);
        const canTouch = await touch_artifact_youmonst(obj);
        remove_object(obj);
        if (!canTouch) {
            await dropy(obj);
            return obj;
        }
        if (wasUpolyd && !Upolyd(u)) {
            /* C:1232-1238 — losing the polymorphed form loses the grip. */
            if (drop_fmt)
                pline(_fmt1(drop_fmt, drop_arg));
            await dropy(obj);
            return obj;
        }
        if (crysknife) {
            obj.otyp = 43;
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
        const oquan = obj.quan | 0;
        let prev_encumbr = near_capacity(); /* before addinv() */

        const pickup_burden = (g.flags?.pickup_burden ?? MOD_ENCUMBER) | 0;
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
            if ((obj.quan | 0) > oquan)
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
            /* C:1290-1291 update_inventory(); encumber_msg(); */
            encumber_msg_sync();
            return obj;
        }
    }

    if (!dropIt)
        return obj;

    /* C:1296 `drop_it:` */
    if (drop_fmt)
        pline(_fmt1(drop_fmt, drop_arg));
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
