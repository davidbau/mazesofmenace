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
import { pline } from './pline.js';
import { observe_object } from './o_init.js';
import { obfree } from './shk.js';
import { globby_bill_fixup } from './shk.js';
import { picked_container } from './dokick.js';
import { mergable, prinv, reorder_invent, freeinv, obj_extract_self_general, inv_cnt, carry_obj_effects, addinv_core1, addinv_core2 } from './cmd.js';
import { setuqwep } from './wield.js';
import { hero_breaks, hitfloor, throwing_weapon } from './dothrow.js';
import { dropx, dropy } from './do.js';
import { encumber_msg_sync, weight } from './weight.js';
import { near_capacity } from './hack.js';
import { splitobj, attacktype } from './makemon.js';
import { u_safe_from_fatal_corpse, reset_justpicked } from './pickup.js';
import { uteetering_at_seen_pit, uescaped_shaft } from './trap.js';
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
import { setnotworn, setworn } from './worn.js';
import { impossible } from './pline.js';
import { touch_artifact_youmonst, _pickup_burden_level } from './wizcmds.js';
import { place_object, remove_object, dealloc_obj, start_glob_timeout } from './mklev.js';
import { update_inventory } from './inventory_refresh.js';
import { obj_merge_light_sources } from './light.js';
import { obj_stop_timers, stop_timer, start_timer } from './timeout.js';
import { SHRINK_GLOB, TIMER_OBJECT, ALTAR } from './const.js';
export { hold_another_object, merged } from './invent.js'; // relocate-fns
export { COIN_CLASS, _uprop_on }; // relocate-fns

/* include/objclass.h enum objclass_classes, via defsym.h:466-484. */
const COIN_CLASS = 12, WEAPON_CLASS = 2, TOOL_CLASS = 6, GEM_CLASS = 13;
/* include/hack.h:458-461 encumbrance levels (MOD_ENCUMBER = "stressed"). */
const MOD_ENCUMBER = 2;
/* include/skills.h:64,95 — P_RIDING = 37, P_BASIC = 2. */
const P_RIDING = 37, P_BASIC = 2;
/* include/monattk.h:19 AT_HUGS. */
const AT_HUGS = 7;
/* include/monflag.h:85,89,92,93,182 and defsym.h:309 MONSYM(13,...,S_MIMIC). */
const M1_FLY = 0x00000001, M1_CLING = 0x00000010, M1_HIDE = 0x00000100;
const MZ_HUGE = 4, S_MIMIC = 13;
/* include/skills.h — P_BOW 20, P_CROSSBOW 22, P_DART 23, P_BOOMERANG 25. */
const P_BOW = 20, P_CROSSBOW = 22, P_DART = 23, P_BOOMERANG = 25;

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
function Flying() {
    // C youprop.h:253: a flying steed confers flight unless BFlying blocks it.
    const u = game.u, p = u?.uprops?.[FLYING];
    return !!((p?.intrinsic | 0) || (p?.extrinsic | 0)
        || ((u?.usteed?.data?.mflags1 | 0) & 0x00000001 /* M1_FLY */))
        && !(p?.blocked | 0);
}

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







