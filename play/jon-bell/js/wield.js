import { retouch_object_hero } from './display.js';
// wield.js — C ref: wield.c.
import { arti_speak, is_art } from './artifact.js';
import { exercise } from './attrib.js';
import { ART_OGRESMASHER, ART_SNICKERSNEE, GETOBJ_DOWNPLAY, GETOBJ_EXCLUDE, GETOBJ_SUGGEST, HAND, OCLASS_COIN, OCLASS_WEAPON, OTYP_AKLYS, Shk_Your, TWOWEAPOK, W_ARMC_C, W_ARMF_C, W_ARMG_C, W_ARMH_C, W_ARMS_C, W_ARMU_C, W_ARM_C, W_QUIVER_C, W_SWAPWEP_C, W_WEP_C, You_cant, _Blind_cmd, _hero_youmonst, _uprop_active, _wt_bimanual, _wt_cantwield, _wt_sameObj, _ynq_cmd, ammo_and_launcher, bimanual_tw, body_part, could_twoweap, getObjFromGetobj, instapetrify, is_ammo, is_launcher, is_missile, is_plural_obj, is_pole, is_sword, is_weptool, is_wet_towel, pair_of, plur, sr_touch_petrifies_ptr, u_wield_art, will_weld } from './cmd.js';
import { inv_cnt } from './hack.js';
import { freeinv, prinv, splittable } from './invent.js';
import { Your } from './pline.js';
import { Yname2 } from './objnam.js';
import { ECMD_CANCEL, ECMD_FAIL, ECMD_OK, ECMD_TIME, GETOBJ_ALLOWCNT, GETOBJ_PROMPT, RIGHT_HANDED, Upolyd } from './const.js';
import { _pline_flush_frame_record } from './display.js';

import { pline } from './pline.js';
import { dropx } from './do.js';
import { You, reset_remarm, xname } from './do_wear.js';
import { yname } from './objnam.js';
import { shkname as dokick_shkname } from './dokick.js';

import { game } from './gstate.js';
import { addinv_nomerge } from './invent.js';

import { update_inventory } from './invent.js';
import { arti_light_description } from './light.js';
import { artifact_light } from './artifact.js';
import { CORPSE, humanoid, permonstTemplate, splitobj } from './makemon.js';
import { unsplitobj } from './mkobj.js';
import { clear_splitobjs, set_bknown } from './mkobj.js';
import { inside_shop } from './shk.js';


import { The, Yobjnam2, simpleonames as _ia_simpleonames, Tobjnam as _objnam_Tobjnam, aobjnam, corpse_xname, doname, killer_xname, makeplural as makeplural_objnam, otense, vtense, yobjnam } from './objnam.js';
import { shop_keeper as shk_shop_keeper } from './shk.js';
import { begin_burn, end_burn } from './timeout.js';

import { setworn } from './worn.js';
import { W_QUIVER, W_SWAPWEP, W_WEP } from './const.js'; // relocate-fns
import { W_ACCESSORY, W_ARMOR, W_SADDLE } from './const.js';
/* include/hack.h invlet_basic: a..z then A..Z. */
const invlet_basic = 52;
import { Tobjnam } from './objnam.js'; // relocate-fns
import { Blind } from './vision.js'; // relocate-fns
import { _restrict_name, body_part as body_part_fr, costly_alteration, body_part as food_body_part } from './cmd.js';
import { useupall as useupall_cmd } from './invent.js'; // relocate-fns
import { COST_DECHNT, COST_DEGRD, HAND as HAND_FR, ONAME, has_oname } from './const.js'; // relocate-fns
import { hcolor } from './do_name.js'; // relocate-fns
import { hcolor as hcolor_real } from './mhitm.js'; // relocate-fns
import { uncurse as _uncurse } from './mkobj.js'; // relocate-fns
import { an, makeplural, simpleonames } from './objnam.js'; // relocate-fns
import { NH_BLACK, NH_BLUE, SCROLL_CLASS_OC, WEAPON_CLASS_OC, _Blind, _Hallucination, _is_weptool, _makeknown } from './read.js'; // relocate-fns
import { strange_feeling } from './potion.js'; /* C: potion.c strange_feeling, called by chwepon (wield.c:942) */
import { rn2 } from './rnd.js'; // relocate-fns
import { alter_cost as _alter_cost } from './shk.js'; // relocate-fns
import { weight } from './weight.js';
import { encumber_msg } from './pickup.js'; // relocate-fns

/* C ref: wield.c:294 ready_ok(struct obj *obj) — the getobj() callback for
 * doquiver_core().  NOTE what it never returns: GETOBJ_EXCLUDE.  Every carried
 * object is either SUGGEST or DOWNPLAY, so the '?'/'*' prompt is always forced
 * (invent.c:1882-1888) and ANY invlet the player types is a valid selection —
 * which is how C reaches "You cannot fire that!" on a worn cloak.
 *
 * The hand-rolled classifier this replaces (see doquiver_core below) listed
 * every WEAPON_CLASS item and nothing else: it missed the uwep/uswapwep
 * downplay, the ammo/launcher pairing, is_launcher, and COIN_CLASS.  On the
 * 19-run "You have no ammunition readied." cluster the hero's wielded mace made
 * C's "What do you want to fire? [*]" come out "[a or ?*]" here. */
function ready_ok(obj) {
    const u = game.u || {};
    /* wield.c:296-297 — '-' will empty the quiver slot if chosen. */
    if (!obj)
        return u.uquiver ? GETOBJ_SUGGEST : GETOBJ_DOWNPLAY;

    /* wield.c:300-301 — downplay when wielded, unless more than one:
     *     return (obj->quan == 1) ? GETOBJ_DOWNPLAY : GETOBJ_SUGGEST;
     * This was spelled `(quan > 1) ? SUGGEST : DOWNPLAY` — identical for any
     * object whose quan is stamped, DIVERGENT for quan 0/absent, where C says
     * SUGGEST and the inverted form said DOWNPLAY.  The justification given was
     * that this port's synthetic weapon slots do not always stamp quan; that is
     * a defensive deviation papering over a port bug, so the test is now C's
     * and the unstamped slots are stamped at their source
     * (_ensure_ranger_weapons here, _ensure_role_weapons in js/uhitm.js). */
    if (obj === u.uwep || (obj === u.uswapwep && u.twoweap))
        return (obj.quan === 1) ? GETOBJ_DOWNPLAY : GETOBJ_SUGGEST;

    if (is_ammo(obj)) {
        /* wield.c:303-308 — ammo is suggested only when its launcher is in the
         * primary or secondary slot. */
        return ((u.uwep && ammo_and_launcher(obj, u.uwep))
                || (u.uswapwep && ammo_and_launcher(obj, u.uswapwep)))
            ? GETOBJ_SUGGEST
            : GETOBJ_DOWNPLAY;
    } else if (is_launcher(obj)) { /* wield.c:309-310 */
        return GETOBJ_DOWNPLAY;
    } else {
        /* wield.c:312-313 */
        const oclass = obj.oclass | 0;
        if (oclass === OCLASS_WEAPON || oclass === OCLASS_COIN)
            return GETOBJ_SUGGEST;
    }
    return GETOBJ_DOWNPLAY; /* wield.c:326 */
}

// C ref: wield.c:512 doquiver_core(verb) — "guts of #quiver command; also used
// by #fire when refilling empty quiver".
//
// THIS BODY USED TO BE A HAND-ROLLED PROMPT: it built its own bracket string
// from "every WEAPON_CLASS item", rendered it itself, did ONE nhgetch, and
// returned ECMD_CANCEL on any letter it could not resolve.  That is not
// getobj(): C's getobj re-prompts on an unknown letter ("You don't have that
// object." + a --More-- that eats the ack key), handles '?'/'*' menus and the
// '-' hands entry, and pages the caller's standing topline through
// tty_yn_function's more() before it prompts at all.  js/cmd.js:12586
// getObjFromGetobj is invent.c:1752 itself and already carries every one of
// those; route through it, exactly as dowrite/dodip/dozap were routed
// (d3cc7bdc / 5885d8e5 / 176cce2b).
export async function doquiver_core(verb) {
    const g = game;
    const u = g.u || {};
    let qbuf;
    let newquiver;
    let res;
    let was_uwep = false;
    let readyPartial = false;
    const was_twoweap = !!(u.twoweap);
    /* C ref: wield.c:521 gm.multi = 0 */
    g.multi = 0;
    /* C ref: wield.c:522-527 — an empty pack: uquiver is already Null, so say so
     * and take NO key. */
    if (!g.invent) {
        await You('have nothing to ready for firing.');
        return ECMD_OK;
    }
    /* C ref: wield.c:529 clear_splitobjs() */
    clear_splitobjs();
    /* C ref: wield.c:531-532 — the shared getobj reader handles both direct
     * numeric prefixes and counted selections from its inventory menu. */
    newquiver = await getObjFromGetobj(verb, ready_ok, GETOBJ_PROMPT | GETOBJ_ALLOWCNT);

    /* C ref: wield.c:534-536 — cancelled. */
    if (!newquiver)
        return ECMD_CANCEL;
    /* C ref: wield.c:537-545 — `newquiver == &hands_obj`, i.e. the '-' entry.
     * getObjFromGetobj returns the {hands:true} sentinel js/potion.js:3754 and
     * js/engrave.js:213 already read. */
    if (newquiver.hands) {
        if (u.uquiver) {
            await You('now have no ammunition readied.');
            /* skip 'quivering: prinv()' */
            await setuqwep(null);
        } else {
            await You('already have no ammunition readied!');
        }
        return ECMD_OK;
    }
    /* C wield.c:546-560 — getobj returned a child made for a supplied count.
     * A piece of the current quiver is recombined; gold cannot be split into a
     * quiver slot; every other child gets its own inventory slot without
     * merging back into its parent. */
    const split = g.context?.objsplit;
    if (split && (newquiver.o_id | 0) === (split.child_oid | 0)) {
        if (u.uquiver
            && (u.uquiver.o_id | 0) === (split.parent_oid | 0)) {
            await unsplitobj(newquiver);
            await pline('That ammunition is already readied!');
            return ECMD_OK;
        }
        if ((newquiver.oclass | 0) === OCLASS_COIN) {
            await You("can't ready only part of your gold.");
            await unsplitobj(newquiver);
            return ECMD_OK;
        }
        freeinv(newquiver);
        newquiver = (await addinv_nomerge(newquiver));
    }
    /* C ref: wield.c:561-564 */
    if (newquiver === u.uquiver) {
        await pline('That ammunition is already readied!');
        return ECMD_OK;
    }
    if ((newquiver.owornmask | 0) & (W_ARMOR | W_ACCESSORY | W_SADDLE)) {
        await You('cannot %s that!', verb);
        return ECMD_OK;
    }
    /* C ref: wield.c:568-610 — readying the wielded weapon. */
    if (newquiver === u.uwep) {
        /* C wield.c:569-576: save discovery state before welded() reveals it. */
        /* C wield.c:569-575: discovering a welded weapon consumes a turn.
         * Save bknown before welded() reveals the curse. */
        const weld_res = !u.uwep.bknown;
        if (welded(u.uwep)) {
            await weldmsg(u.uwep);
            reset_remarm();
            return weld_res ? ECMD_TIME : ECMD_OK;
        }
        /* wield.c:576-593 — the "Ready N of them?" split offer.  C's `default:
         * break;` (a 'n' answer) falls through to the all-or-nothing confirm
         * below; 'q' returns ECMD_OK; 'y' splits the rest off and does `goto
         * quivering`, skipping the confirm, the unwield and was_uwep. */
        if (newquiver.quan > 1 && inv_cnt(false) < invlet_basic && splittable(newquiver)) {
            qbuf = `You are wielding ${newquiver.quan} ${_ia_simpleonames(newquiver)}.`
                 + `  Ready ${newquiver.quan - 1} of them?`;
            const splitAns = await _ynq_cmd(qbuf);
            if (splitAns === 'q') return ECMD_OK;
            if (splitAns === 'y') {
                /* leave 1 wielded, split the rest off into the quiver */
                newquiver = (await splitobj(newquiver, newquiver.quan - 1));
                /* finish_splitting (wield.c:346-350) */
                await freeinv(newquiver);
                newquiver = await addinv_nomerge(newquiver);
                readyPartial = true;
            } else {
                qbuf = 'Ready all of them instead?';
            }
        } else {
            /* wield.c:594-600 */
            const use_plural = is_plural_obj(newquiver) || pair_of(newquiver);
            qbuf = `You are wielding ${!use_plural ? 'that' : 'those'}.  Ready ${!use_plural ? 'it' : 'them'} instead?`;
        }
        /* wield.c:602-608 — require confirmation to ready the main weapon. */
        if (!readyPartial && (await _ynq_cmd(qbuf)) !== 'y') {
            /* C: Shk_Your(qbuf, uwep) REPLACES qbuf with "Your "/"The " &c, then
             *    pline("%s%s %s wielded.", qbuf, simpleonames(uwep),
             *          otense(uwep, "remain"));   */
            await pline(`${Shk_Your(newquiver)}${_ia_simpleonames(newquiver)} ${otense(newquiver, 'remain')} wielded.`);
            return ECMD_OK;
        }
        /* wield.c:609-612 — quivering the main weapon, so no longer wielding
         * it; skipped on the split path (C's goto quivering). */
        if (!readyPartial) {
            await setuwep(null);
            await untwoweapon();
            was_uwep = true;
        }
    } else if (newquiver === u.uswapwep) {
        /* C ref: wield.c:613-648 */
        if (newquiver.quan > 1 && inv_cnt(false) < invlet_basic && splittable(newquiver)) {
            /* C offers the partial-stack split first.  The old port skipped
             * this prompt and therefore consumed the recorded `y` as the
             * all-or-nothing confirmation, leaving the stack unsplit. */
            const qverb = u.twoweap ? 'You are dual wielding' : 'Your alternate weapon is';
            qbuf = `${qverb} ${newquiver.quan} ${_ia_simpleonames(newquiver)}.`
                 + `  Ready ${newquiver.quan - 1} of them?`;
            const splitAns = await _ynq_cmd(qbuf);
            if (splitAns === 'q') return ECMD_OK;
            if (splitAns === 'y') {
                /* C splitobj() draws next_ident's rnd(2); the shared splitobj
                 * body also links the child into the live inventory chain. */
                newquiver = (await splitobj(newquiver, newquiver.quan - 1));
                /* finish_splitting (wield.c:346-350): freeinv clears and
                 * addinv's `added:` sets pickup_prev. */
                await freeinv(newquiver);
                newquiver = await addinv_nomerge(newquiver);
                readyPartial = true;
            } else {
                qbuf = 'Ready all of them instead?';
            }
        } else {
            const use_plural = is_plural_obj(newquiver) || pair_of(newquiver);
            qbuf = `${!use_plural ? 'That is' : 'Those are'} your ${u.twoweap ? 'second' : 'alternate'} weapon.  Ready ${!use_plural ? 'it' : 'them'} instead?`;
        }
        /* wield.c:640-646 */
        if (!readyPartial && (await _ynq_cmd(qbuf)) !== 'y') {
            await pline(`${Shk_Your(newquiver)}${_ia_simpleonames(newquiver)} ${otense(newquiver, 'remain')} ${u.twoweap ? 'wielded' : 'as secondary weapon'}.`);
            return ECMD_OK;
        }
        /* wield.c:647-649 */
        if (!readyPartial) {
            await setuswapwep(null);
            await untwoweapon();
        }
    }

    /* C ref: wield.c:651-661 `quivering:` — the prinv/setuqwep ORDER differs by
     * verb, and it is load-bearing: "ready" quivers first so the inventory line
     * carries "(at the ready)", "fire" prints "You ready: <obj>" first so it
     * does not. */
    if (verb === 'ready') {
        await setuqwep(newquiver);
        await prinv(null, newquiver, 0);
    } else { /* verb=="fire", manually refilling quiver during 'f'ire */
        await prinv('You ready:', newquiver, 0);
        await setuqwep(newquiver);
    }

    /* C ref: wield.c:663-677 — the quiver slot ordinarily consumes no time, but
     * unwielding the primary or secondary weapon should. */
    res = 0;
    if (was_uwep) {
        await You('are now %s.', empty_handed());
        res = 1;
    } else if (was_twoweap && !u.twoweap) {
        await You('are no longer using two weapons at once.');
        res = 1;
    }
    return res ? ECMD_TIME : ECMD_OK;
}

/* C wield.c:setuwep — shared slot bookkeeping, artifact effects, then
 * weapon classification.  The same-object return must preserve unweapon. */
export async function setuwep(obj) {
    const u = game.u;
    const olduwep = u.uwep || null;

    if (obj === olduwep)
        return;
    await setworn(obj, W_WEP_C);
    // C updates Ogresmasher status before any Sunsword message.
    if (u.uwep === obj
        && ((u.uwep && u.uwep.oartifact === ART_OGRESMASHER)
            || (olduwep && olduwep.oartifact === ART_OGRESMASHER)))
        game.disp.botl = true;
    if (u.uwep === obj && artifact_light(olduwep) && olduwep.lamplit) {
        end_burn(olduwep, false);
        if (!_Blind_cmd())
            await pline("%s shining.", _objnam_Tobjnam(olduwep, "stop"));
    }
    if (u.uwep === obj
        && (u_wield_art(ART_OGRESMASHER) || is_art(olduwep, ART_OGRESMASHER)))
        game.disp.botl = true;
    if (obj) {
        game.unweapon = (obj.oclass | 0) === OCLASS_WEAPON
            ? (is_launcher(obj) || is_ammo(obj) || is_missile(obj)
               || (is_pole(obj) && !u.usteed && !is_art(obj, ART_SNICKERSNEE)))
            : (!is_weptool(obj) && !is_wet_towel(obj));
    } else {
        game.unweapon = true;
    }
}

// C wield.c:461-502: swap slots around the shared ready_weapon operation.
export async function doswapweapon() {
    const g = game, u = g.u;
    g.multi = 0;
    if (_wt_cantwield()) { await pline("Don't be ridiculous!"); return ECMD_FAIL; }
    if (welded(u.uwep)) { await weldmsg(u.uwep); return ECMD_FAIL; }
    const oldwep = u.uwep, oldswap = u.uswapwep;
    await setuswapwep(null);
    const result = await ready_weapon(oldswap);
    if (u.uwep === oldwep) {
        await setuswapwep(oldswap);
    } else {
        await setuswapwep(oldwep);
        if (u.uswapwep) await prinv(null, u.uswapwep, 0);
        else await You('have no secondary weapon readied.');
    }
    if (u.twoweap && !await can_twoweapon()) await untwoweapon();
    return result;
}

// C ref: wield.c dowield() — the 'w' command: wield a weapon.
// C call chain: dowield → getobj("wield", wield_ok, GETOBJ_PROMPT|GETOBJ_ALLOWCNT)
//   → tty_nhgetch (item key) → [dispatch: uswapwep → doswapweapon; else ready_weapon]
//   → ready_weapon → prinv (weapon in right hand) [+ more() if topline occupied]
//
// wield_ok classification (C ref: wield.c:326-338):
//   wield_ok(NULL) = GETOBJ_SUGGEST → adds "- " to prompt buf
//   COIN_CLASS     → GETOBJ_EXCLUDE
//   WEAPON_CLASS or is_weptool → GETOBJ_SUGGEST
//   other          → GETOBJ_DOWNPLAY
//
// Prompt format (C ref: invent.c:1935): "What do you want to wield? [<buf> or ?*]"
//   where buf = "- " + all WEAPON_CLASS/is_weptool invlets in inventory order.
//
//   c=elven_arrows(19), d=elven_arrows2(19) — all WEAPON_CLASS.
//   buf = "- abcd" → prompt = "What do you want to wield? [- abcd or ?*]" (41 chars)
//   cursor at col 42 (C: tty_yn_function positions cursor one past last char).
//
// doswapweapon swaps dagger↔bow, prints bow+(weapon in right hand)+More, then
// dagger+(alternate weapon; not wielded) as result message → context.move=1.
//
// C ref: wield.c:350-453 dowield().
function wield_ok(obj) {
    if (!obj) return GETOBJ_SUGGEST;
    if (obj.oclass === OCLASS_COIN) return GETOBJ_EXCLUDE;
    return obj.oclass === OCLASS_WEAPON || is_weptool(obj) ? GETOBJ_SUGGEST : GETOBJ_DOWNPLAY;
}

export async function dowield() {
    const g = game, u = g.u;
    g.multi = 0;
    if (_wt_cantwield()) {
        await pline("Don't be ridiculous!");
        return ECMD_FAIL;
    }
    clear_splitobjs();
    let wep = await getObjFromGetobj('wield', wield_ok, GETOBJ_PROMPT | GETOBJ_ALLOWCNT);
    if (!wep) return ECMD_CANCEL;
    const already_wielded = async () => {
        await You('are already wielding that!');
        if (is_weptool(wep) || is_wet_towel(wep)) g.unweapon = false;
        return ECMD_FAIL;
    };
    if (wep === u.uwep) return await already_wielded();
    if (welded(u.uwep)) {
        await weldmsg(u.uwep);
        reset_remarm();
        if (wep.o_id && wep.o_id === g.context.objsplit.child_oid) await unsplitobj(wep);
        return ECMD_FAIL;
    }
    wielding: {
        if (wep.o_id && wep.o_id === g.context.objsplit.child_oid) {
            if (u.uwep && u.uwep.o_id === g.context.objsplit.parent_oid) {
                await unsplitobj(wep);
                wep = u.uwep;
                return await already_wielded();
            }
            await finish_splitting(wep);
            break wielding;
        }
        if (wep.hands) {
            wep = null;
        } else if (wep === u.uswapwep) {
            return await doswapweapon();
        } else if (wep === u.uquiver) {
            let qbuf;
            if (u.uquiver.quan > 1 && inv_cnt(false) < invlet_basic && splittable(u.uquiver)) {
                qbuf = `You have ${u.uquiver.quan} ${_ia_simpleonames(u.uquiver)} readied.  Wield one?`;
                const answer = await _ynq_cmd(qbuf);
                if (answer === 'q') return ECMD_OK;
                if (answer === 'y') {
                    wep = await splitobj(u.uquiver, 1);
                    await finish_splitting(wep);
                    break wielding;
                }
                qbuf = 'Wield all of them instead?';
            } else {
                const plural = is_plural_obj(u.uquiver) || pair_of(u.uquiver);
                qbuf = `You have ${plural ? 'those' : 'that'} readied.  Wield ${plural ? 'them' : 'it'} instead?`;
            }
            if (await _ynq_cmd(qbuf) !== 'y') {
                await pline('%s%s %s readied.', Shk_Your(u.uquiver), _ia_simpleonames(u.uquiver), otense(u.uquiver, 'remain'));
                return ECMD_OK;
            }
            await setuqwep(null);
        } else if (wep.owornmask & (W_ARMOR | W_ACCESSORY | W_SADDLE)) {
            await You('cannot wield that!');
            return ECMD_FAIL;
        }
    }
    const oldwep = u.uwep;
    const result = await ready_weapon(wep);
    if (g.flags.pushweapon && oldwep && u.uwep !== oldwep) await setuswapwep(oldwep);
    await untwoweapon();
    return result;
}

/* C wield.c:346-352: give a counted selection its own inventory letter. */
async function finish_splitting(obj) {
    await freeinv(obj);
    await addinv_nomerge(obj);
}

/* C wield.c:164-273: shared primary-weapon operation. Callers own pushweapon
 * and two-weapon cleanup; this function owns the bare-handed status change. */
export async function ready_weapon(wep) {
    const g = game, u = g.u;
    let res = ECMD_OK;
    const was_twoweap = !!u.twoweap, had_wep = !!u.uwep;
    if (!wep) {
        if (u.uwep) {
            await You('are %s.', empty_handed());
            await setuwep(null);
            res = ECMD_TIME;
        } else {
            await You('are already %s.', empty_handed());
        }
    } else if (wep.otyp === CORPSE && await _cant_wield_corpse(wep)) {
        res = ECMD_TIME;
    } else if (u.uarms && _wt_bimanual(wep)) {
        await You('cannot wield a two-handed %s while wearing a shield.',
            is_sword(wep) ? 'sword' : wep.otyp === 45 ? 'axe' : 'weapon');
        res = ECMD_FAIL;
    } else if (!await retouch_object_hero(wep, false)) {
        res = ECMD_TIME;
    } else {
        res = ECMD_TIME;
        if (will_weld(wep)) {
            const tmp = xname(wep);
            const article = !tmp.startsWith('The ') && The(tmp).startsWith('The ') ? 'The ' : '';
            await pline('%s%s %s to your %s%s!', article, aobjnam(wep, 'weld'),
                wep.quan === 1 ? 'itself' : 'themselves',
                _wt_bimanual(wep) ? '' : u.uhandedness === RIGHT_HANDED ? 'dominant right ' : 'dominant left ',
                _wt_bimanual(wep) ? makeplural_objnam(body_part(HAND)) : body_part(HAND));
            set_bknown(wep, 1);
        } else {
            const mask = wep.owornmask;
            wep.owornmask |= W_WEP;
            if (wep.otyp === OTYP_AKLYS && (wep.owornmask & W_WEP)) await You('secure the tether.');
            await prinv(null, wep, 0);
            wep.owornmask = mask;
        }
        await setuwep(wep);
        if (was_twoweap && !u.twoweap && g.flags.verbose && u.uwep)
            await You('%s.', TWOWEAPOK(u.uwep) && !_wt_bimanual(u.uwep)
                ? 'are no longer using two weapons at once' : 'can no longer wield two weapons at once');
        if (wep.oartifact) res |= await arti_speak(wep);
        if (artifact_light(wep) && !wep.lamplit) {
            begin_burn(wep, false);
            if (!_Blind_cmd()) await pline('%s to shine %s!', _objnam_Tobjnam(wep, 'begin'), arti_light_description(wep));
        }
        if (wep.unpaid) {
            const shkp = shk_shop_keeper(inside_shop(u.ux, u.uy));
            if (shkp) await pline('%s says "You be careful with my %s!"', dokick_shkname(shkp), xname(wep));
        }
    }
    if (had_wep !== !!u.uwep && g.flags.cond_barehanded) g.disp.botl = true;
    return res;
}

/* C wield.c:set_twoweap — a changed weapon mode can dirty the status line. */
export function set_twoweap(on_off) {
    const u = game.u;
    if (!!on_off !== !!u.twoweap) {
        u.twoweap = on_off;
        if (game.flags.weaponstatus)
            game.disp.botl = true;
    }
}

/* C wield.c:setuswapwep — setworn owns the inventory refresh. */
export async function setuswapwep(obj) {
    await setworn(obj, W_SWAPWEP_C);
}

/* C wield.c:setuqwep — no additional inventory refresh. */
export async function setuqwep(obj) {
    await setworn(obj, W_QUIVER_C);
}

/* C ref: wield.c:152-161 empty_handed() - description of hands when not wielding anything.
 * Returns pointer to string describing hands (gloves => "empty handed", humanoid => "bare handed",
 * else "not wielding anything"). Used by #seeweapon, #attributes, #takeoffall, ready_weapon. */
export function empty_handed() {
    const u = game.u;

    if (u.uarmg) {
        return "empty handed"; /* gloves imply hands */
    }

    const youmonst_data = game.youmonst.data;

    if (humanoid(youmonst_data)) {
        return "bare handed"; /* hands but no weapon and no gloves */
    }

    return "not wielding anything"; /* alternate phrasing for paws or lack of hands */
}

/* C wield.c:1072 mwelded: obj && (owornmask & W_WEP) && will_weld */
export function mwelded(obj) {
    return !!(obj && ((obj.owornmask | 0) & W_WEP) && will_weld(obj));
}

export async function weldmsg(obj) {
    const part = body_part(HAND);
    const hand = _wt_bimanual(obj) ? makeplural_objnam(part) : part;
    const savewornmask = obj.owornmask;
    obj.owornmask = 0;
    await pline(`${Yobjnam2(obj, 'are')} welded to your ${hand}!`);
    obj.owornmask = savewornmask;
}

export function welded(obj) {
    const u = (game && game.u) || {};
    if (obj && _wt_sameObj(obj, u.uwep || null) && will_weld(obj)) {
        set_bknown(obj, 1);
        return 1;
    }
    return 0;
}

function _wt_xname(obj) {
    return xname(obj);
}

/* C ref: objnam.c:1754 doname(obj) — wield.c:744's `You("now wield %s.",
 * doname(obj))`.  This was a hand-rolled count+enchant+name that appended the
 * "+N " enchantment for EVERY object class whenever obj->known was set; C's
 * doname_base only does that on its WEAPON_CLASS/ARMOR_CLASS arm and for a
 * charged ring (objnam.c:1420-1425, :1501-1503).  A wished magic lamp is
 * TOOL_CLASS, so C says "a lamp" where this said "a +1 lamp".  Now routed to
 * the real body in js/objnam.js. */
async function _wt_doname(obj) {
    return await doname(obj);
}

export async function untwoweapon() {
    const u = game.u || {};
    if (u.twoweap) {
        /* wield.c:82 can_no_longer_twoweap */
        await You('can no longer wield two weapons at once.');
        set_twoweap(false); /* C wield.c:910 */
        update_inventory();
    }
}

/* C wield.c:683-758: implicit tool wielding before rub/apply/eat. */
export async function wield_tool(obj, verb) {
    const g = game;
    const u = g.u || (g.u = {});

    /* C wield.c:685-686 */
    if (u.uwep && _wt_sameObj(obj, u.uwep))
        return true;

    if (!verb) verb = "wield";

    const what = _wt_xname(obj);
    let more_than_1 = (obj.quan > 1) || /pair of |s of /i.test(what);

    const W_ARMOR_MASK = W_ARM_C | W_ARMC_C | W_ARMH_C | W_ARMS_C | W_ARMG_C
        | W_ARMF_C | W_ARMU_C;
    const mask = obj.owornmask | 0;

    if (mask & (W_ARMOR_MASK | W_ACCESSORY)) {
        await pline(`You can't ${verb} ${yname(obj)} while wearing `
              + `${more_than_1 ? "them" : "it"}.`);
        return false;
    }
    if (u.uwep && welded(u.uwep)) {
        const HAND = 6; /* body_part.h enum (const.js HAND=6; local, const.js is frozen) */
        if (g.flags && g.flags.verbose) {
            let hand = body_part(HAND);
            if (_wt_bimanual(u.uwep)) hand = makeplural_objnam(hand);
            if (/pair of /i.test(what)) more_than_1 = false;
            await pline(`Since your weapon is welded to your ${hand}, you cannot `
                  + `${verb} ${more_than_1 ? "those" : "that"} ${what}.`);
        } else {
            await pline("You can't do that.");
        }
        return false;
    }
    if (_wt_cantwield()) {
        await pline(`You can't hold ${more_than_1 ? "them" : "it"} strongly enough.`);
        return false;
    }
    if (u.uarms && _wt_bimanual(obj)) {
        await pline(`You cannot ${verb} a two-handed `
              + `${(obj.oclass | 0) === OCLASS_WEAPON ? "weapon" : "tool"} `
              + `while wearing a shield.`);
        return false;
    }

    if (u.uquiver && _wt_sameObj(u.uquiver, obj))
        await setuqwep(null);
    if (u.uswapwep && _wt_sameObj(u.uswapwep, obj)) {
        g._wieldToolSwap = true;
        try {
            await doswapweapon();
        } finally {
            g._wieldToolSwap = false;
        }
        if (u.uswapwep && _wt_sameObj(u.uswapwep, obj))
            return false;
    } else {
        const oldwep = u.uwep || null;
        if (will_weld(obj)) {
            await ready_weapon(obj);
        } else {
            const _nowWield = `You now wield ${(await _wt_doname(obj))}.`;
            await pline(_nowWield);
            /* use_whip (apply.c:2964-2968) queues doapply and returns ECMD_TIME; the
             * re-apply's getdir yn_function raises this message's more() before its
             * own flush_screen (topl.c:390-392), so the --More-- freezes the map as
             * this pline's flush left it — the world turn's newsyms are unflushed.
             * Map only: bot() has already repainted the status. */
            _pline_flush_frame_record(-2, _nowWield);
            game._plineFlushFrames.at(-1).botl = undefined;
            game._plineFlushFrames.at(-1).mapOnly = true;
            await setuwep(obj);
        }
        if (g.flags && g.flags.pushweapon && oldwep && !_wt_sameObj(u.uwep, oldwep))
            await setuswapwep(oldwep);
    }

    if (u.uwep && !_wt_sameObj(u.uwep, obj))
        return false;
    if (u.twoweap)
        await untwoweapon();
    if ((obj.oclass | 0) !== OCLASS_WEAPON)
        g.unweapon = true;
    return true;
}

/* C wield.c:761-806: validate both weapons, with the same ordered refusals. */
export async function can_twoweapon() {
    const g = game;
    const u = g.u || {};
    let otmp;

    if (!could_twoweap(_hero_youmonst().data)) {
        /* C wield.c:764-769 —
         *     if (Upolyd) You_cant("use two weapons in your current form.");
         *     else pline("%s aren't able to use two weapons at once.",
         *                makeplural((flags.female && gu.urole.name.f)
         *                           ? gu.urole.name.f : gu.urole.name.m));
         * RNG-free.  The comment above this function used to assert "Every
         * player role's monst.c entry carries two AT_WEAP attacks, so this is
         * TRUE for an un-polymorphed hero of any role", i.e. that this arm was
         * dead.  That is FALSE: monsters.h:3405 gives the ranger a single
         * ATTK(AT_WEAP,...) followed by NO_ATTK, so could_twoweap() is 0 for
         * every Ranger and this is the arm a Ranger's #twoweapon lands on
         * ("Rangers aren't able to use two weapons at once.").  Wizard, Monk,
         * Archeologist, Healer, Priest and Tourist are the same shape. */
        if (Upolyd(u)) {
            await You_cant('use two weapons in your current form.');
        } else {
            const rname = ((g.flags && g.flags.female) && g.urole?.name?.f)
                ? g.urole.name.f : g.urole?.name?.m;
            await pline('%s aren\'t able to use two weapons at once.',
                        makeplural_objnam(String(rname ?? '')));
        }
    } else if (!u.uwep || !u.uswapwep) {
        /* C wield.c:770-778 —
         *     const char *hand_s = body_part(HAND);
         *     if (!uwep && !uswapwep) hand_s = makeplural(hand_s);
         *     Your("%s%s %s empty.", uwep ? "left " : uswapwep ? "right " : "",
         *          hand_s, vtense(hand_s, "are"));
         * uwep is the primary (right) hand and uswapwep the secondary (left),
         * so the prefix names the hand that is EMPTY: a wielded primary with no
         * secondary is a bare "left ", a secondary with no primary is "right ",
         * and neither leaves the prefix off and pluralises the body part.
         * RNG-free. */
        let hand_s = body_part(HAND);
        if (!u.uwep && !u.uswapwep)
            hand_s = makeplural_objnam(hand_s);
        await Your('%s%s %s empty.',
                   u.uwep ? 'left ' : u.uswapwep ? 'right ' : '',
                   hand_s, vtense(hand_s, 'are'));
    } else if (!TWOWEAPOK(u.uwep) || !TWOWEAPOK(u.uswapwep)) {
        /* C wield.c:779-784 —
         *     otmp = !TWOWEAPOK(uwep) ? uwep : uswapwep;
         *     pline("%s %s suitable %s weapon%s.", Yname2(otmp),
         *           is_plural(otmp) ? "aren't" : "isn't a",
         *           (otmp == uwep) ? "primary" : "secondary", plur(otmp->quan));
         * RNG-free.  Note C tests the PRIMARY first, so a pair of unsuitable
         * weapons is reported against uwep. */
        otmp = !TWOWEAPOK(u.uwep) ? u.uwep : u.uswapwep;
        await pline('%s %s suitable %s weapon%s.', Yname2(otmp),
                    is_plural_obj(otmp) ? "aren't" : "isn't a",
                    (otmp === u.uwep) ? 'primary' : 'secondary',
                    plur(otmp.quan));
    } else if (bimanual_tw(u.uwep) || bimanual_tw(u.uswapwep)) {
        /* C wield.c:785-787 —
         *     otmp = bimanual(uwep) ? uwep : uswapwep;
         *     pline("%s isn't one-handed.", Yname2(otmp));
         * RNG-free. */
        otmp = bimanual_tw(u.uwep) ? u.uwep : u.uswapwep;
        await pline("%s isn't one-handed.", Yname2(otmp));
    } else if (u.uarms) {
        /* C You_cant(x) is You("can't %s", x) — pline.c:396. */
        await You_cant('use two weapons while wearing a shield.');
    } else if (u.uswapwep.oartifact) {
        /* C wield.c:789 — an artifact resists being held second. */
        await pline('%s being held second to another weapon!',
                    Yobjnam2(u.uswapwep, 'resist'));
    } else if ((u.uswapwep.otyp | 0) === CORPSE && await _cant_wield_corpse(u.uswapwep)) {
        /* [Note: !TWOWEAPOK() check prevents ever getting here...] */
        ; /* must be life-saved to reach here; return FALSE */
    } else if (_uprop_active('GLIB') || u.uswapwep.cursed) {
        /* C wield.c:795-800 — Glib or a cursed secondary: identify the curse
         * (only when not Glib) and drop_uswapwep() reports and drops. */
        if (!_uprop_active('GLIB'))
            set_bknown(u.uswapwep, 1);
        await drop_uswapwep();
    } else {
        return true;
    }
    return false;
}

/* C wield.c:138-153: shared corpse contact check (ready_weapon and can_twoweapon). */
async function _cant_wield_corpse(obj) {
    if (game.u.uarmg || (obj.otyp | 0) !== CORPSE
        || !sr_touch_petrifies_ptr(permonstTemplate(obj.corpsenm))
        || _uprop_active('STONE_RES'))
        return false;
    /* Prevent wielding cockatrice when not wearing gloves --KAA */
    await You('wield %s in your bare %s.', corpse_xname(obj, null, 4 /* CXN_PFX_THE */),
              makeplural_objnam(body_part(HAND)));
    await instapetrify(`wielding ${killer_xname(obj)} bare-handed`);
    return true;
}

/* C wield.c:809-831: a cursed secondary weapon or slippery grasp forces a drop. */
export async function drop_uswapwep() {
    const obj = game.u.uswapwep;
    const left_hand = `left ${body_part(HAND)}`;
    if (!obj.cursed)
        await pline('%s from your %s!', Yobjnam2(obj, 'slip'), left_hand);
    else if (!game.u.twoweap)
        await pline('%s your grasp and %s from your %s!',
                    Yobjnam2(obj, 'evade'), otense(obj, 'drop'), left_hand);
    else
        await Your('%s spasms and drops %s!', left_hand, yobjnam(obj, null));
    await dropx(obj);
}

/* C wield.c:uwepgone — stop artifact light before clearing the slot. */
export async function uwepgone() {
    if (game.u.uwep) {
        if (artifact_light(game.u.uwep) && game.u.uwep.lamplit) {
            end_burn(game.u.uwep, false);
            if (!Blind())
                await pline("%s shining.", Tobjnam(game.u.uwep, "stop"));
        }
        await setworn(null, W_WEP);
        game.unweapon = true;
        update_inventory();
    }
}

/* C wield.c:uswapwepgone — C refreshes again after setworn returns. */
export async function uswapwepgone() {
    if (game.u.uswapwep) {
        await setworn(null, W_SWAPWEP);
        update_inventory();
    }
}

/* C wield.c:uqwepgone */
export async function uqwepgone() {
    if (game.u.uquiver) {
        await setworn(null, W_QUIVER);
        update_inventory();
    }
}

const WORM_TOOTH = 42;

const CRYSKNIFE = 43;

const STRANGE_OBJECT = 0;

const ART_MAGICBANE = 8; /* artilist.h artifact ordinal */

export async function chwepon(otmp, amount) {
    const g = game;
    const uwep = g.u?.uwep;
    const Blind = _Blind();
    const color = hcolor((amount < 0) ? NH_BLACK : NH_BLUE);
    let otyp = STRANGE_OBJECT;

    /* C wield.c:925-946 — nothing enchantable wielded. */
    if (!uwep || ((uwep.oclass | 0) !== WEAPON_CLASS_OC && !_is_weptool(uwep))) {
        let buf;
        if (amount >= 0 && uwep && will_weld(uwep)) { /* cursed tin opener */
            if (!Blind) {
                buf = `${Yobjnam2(uwep, 'glow')} with ${an(hcolor_amber())} aura.`;
                uwep.bknown = _Hallucination() ? 0 : 1; /* ok to bypass set_bknown() */
            } else {
                /* cursed tin opener is wielded in right hand */
                buf = `Your right ${body_part_fr(HAND_FR)} tingles.`;
            }
            await _uncurse(uwep);
            update_inventory(); /* C wield.c:938 */
        } else {
            buf = `Your ${makeplural(body_part_fr(HAND_FR))} `
                + `${(amount >= 0) ? 'twitch' : 'itch'}.`;
        }
        await strange_feeling(otmp, buf); /* pline()+docall()+useup() */
        exercise(A_DEX, amount >= 0);
        return 0;
    }

    if (otmp && (otmp.oclass | 0) === SCROLL_CLASS_OC)
        otyp = otmp.otyp | 0;

    /* C wield.c:951-988 — the worm tooth <-> crysknife transformations. */
    if ((uwep.otyp | 0) === WORM_TOOTH && amount >= 0) {
        const multiple = uwep.quan > 1;
        /* order: message, transformation, shop handling */
        await Your(`%s %s much sharper now.`, simpleonames(uwep),
                  multiple ? 'fuse, and become' : 'is');
        uwep.otyp = CRYSKNIFE;
        uwep.oerodeproof = 0;
        if (multiple) {
            uwep.quan = 1;
            uwep.owt = weight(uwep);
        }
        if (uwep.cursed)
            await _uncurse(uwep);
        if (uwep.unpaid)
            await _alter_cost(uwep, 0);
        if (otyp !== STRANGE_OBJECT)
            _makeknown(otyp);
        if (multiple)
            await encumber_msg();
        return 1;
    } else if ((uwep.otyp | 0) === CRYSKNIFE && amount < 0) {
        const multiple = uwep.quan > 1;
        /* order matters: message, shop handling, transformation */
        await Your(`%s %s much duller now.`, simpleonames(uwep),
                  multiple ? 'fuse, and become' : 'is');
        await costly_alteration(uwep, COST_DEGRD);
        uwep.otyp = WORM_TOOTH;
        uwep.oerodeproof = 0;
        if (multiple) {
            uwep.quan = 1;
            uwep.owt = weight(uwep);
        }
        if (otyp !== STRANGE_OBJECT && otmp.bknown)
            _makeknown(otyp);
        if (multiple)
            await encumber_msg();
        return 1;
    }

    /* C wield.c:990-996 — a named artifact resists disenchantment. */
    const wepname = has_oname(uwep) ? ONAME(uwep) : '';
    if (amount < 0 && (uwep.oartifact | 0) && _restrict_name(uwep, wepname)) {
        if (!Blind)
            await pline(`${Yobjnam2(uwep, 'faintly glow')} ${color}.`);
        return 1;
    }

    /* C wield.c:997-1010 — soft upper/lower limit on uwep->spe. */
    if ((((uwep.spe | 0) > 5 && amount >= 0)
         || ((uwep.spe | 0) < -5 && amount < 0))
        && rn2(3)) {
        if (!Blind)
            await pline(`${Yobjnam2(uwep, 'violently glow')} ${color} `
                        + `for a while and then ${otense(uwep, 'evaporate')}.`);
        else
            await pline(`${Yobjnam2(uwep, 'evaporate')}.`);
        await useupall_cmd(uwep); /* let all of them disappear */
        return 1;
    }

    /* C wield.c:1011-1020 — the feedback pline, and the scroll's self-ID. */
    if (!Blind) {
        const xtime = (amount * amount === 1) ? 'moment' : 'while';
        await pline(`${Yobjnam2(uwep, amount === 0 ? 'violently glow' : 'glow')} `
                    + `${color} for a ${xtime}.`);
        if (otyp !== STRANGE_OBJECT && uwep.known
            && (amount > 0 || (amount < 0 && otmp.bknown)))
            _makeknown(otyp);
    }
    if (amount < 0)
        await costly_alteration(uwep, COST_DECHNT);
    // C obj.h:51: spe is a signed char; assignment converts before cap_spe().
    uwep.spe = (((uwep.spe | 0) + amount) << 24) >> 24;
    if (amount > 0) {
        if (uwep.cursed)
            await _uncurse(uwep);
        /* update shop bill to reflect new higher price */
        if (uwep.unpaid)
            await _alter_cost(uwep, 0);
    }

    /* C wield.c:1036-1039; obj.h u_wield_art tests the primary weapon. */
    if ((uwep.oartifact | 0) === ART_MAGICBANE && (uwep.spe | 0) >= 0) {
        await Your('right %s %sches!', food_body_part(HAND_FR),
                   amount > 1 && (uwep.spe | 0) > 1 ? 'flin' : 'it');
    }

    // C wield.c:1041-1045: preserve the short circuit before rn2(7).
    if ((uwep.spe | 0) > 5
        && (_is_elven_weapon(uwep) || uwep.oartifact || !rn2(7))) {
        await pline(`${Yobjnam2(uwep, 'suddenly vibrate')} unexpectedly.`);
    }

    return 1;
}

/* C objects.h ELVEN_* weapons — is_elven_weapon() (obj.h) is an otyp membership
 * test over the elven weapon run.  JS otyps coincide with C's below 366. */
const _ELVEN_WEAPON_OTYPS = new Set([
    19 /* ELVEN_ARROW */, 28 /* ELVEN_SPEAR */, 35 /* ELVEN_DAGGER */,
    47 /* ELVEN_SHORT_SWORD */, 53 /* ELVEN_BROADSWORD */, 84 /* ELVEN_BOW */,
]);

function _is_elven_weapon(obj) {
    return _ELVEN_WEAPON_OTYPS.has(obj.otyp | 0);
}

/* C wield.c:931, do_name.c:1461-1466: hallucination still draws a color
 * before strange_feeling() replaces the tin opener's aura message. */
function hcolor_amber() {
    return hcolor_real('amber');
}

/* ── Scroll/spell otyp constants for identify (objects.h) ──────────────────────
 * SCR_MAGIC_MAPPING = 337 (see above); identify is the scroll immediately
 * before it → SCR_IDENTIFY = 336.  The spellbook of identify is SPE_IDENTIFY. */
const A_DEX = 3; /* attrib.h A_DEX */
