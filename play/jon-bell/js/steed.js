// @ts-nocheck
// steed.js — Riding a steed (monster).
// C ref: steed.c

import { game } from './gstate.js';
import { YMonnam } from './do_name.js';
import { impossible_sync as impossible } from './display.js';
import { pline, You } from './pline.js';
import { MONS_NAMES, m_at as monster_at } from './uhitm.js';
import { use_skill } from './weapon.js';
import { isok, MON_FLOOR, W_SADDLE, P_RIDING, DISMOUNT_FELL,
         ARTICLE_YOUR, SUPPRESS_SADDLE, NON_PM } from './const.js';
import { PM_LONG_WORM, PM_LONG_WORM_TAIL } from './pm.generated.js';
import { monPmname } from './makemon.js';
import { which_armor } from './worn.js';
import { mksobj } from './mkobj.js';
import { mpickobj } from './steal.js';
import { steed_vs_stealth } from './cmd.js';
import { fully_identify_obj } from './invent.js';
import { update_mon_extrinsics } from './worn.js';
import { describe_level_buf } from './dungeon.js';
import { rn2 } from './rnd.js';
import { helpless } from './mhitm.js';
import { x_monnam, y_monnam as y_monnam_real } from './do_name.js';
import { Monnam } from './do_name.js';
import { finish_meating } from './dogmove.js';
import { canSaddleMndx, monsndx } from './makemon.js'; // relocate-fns
import { minimal_monnam } from './do_name.js'; // relocate-fns
import { m_unleash } from './apply.js'; // relocate-fns
import { acurr, adjalign, exercise } from './attrib.js'; // relocate-fns
import { BOTH_SIDES, PM_KNIGHT, Underwater, _Flying, _Levitation, _Mgender, _Role_if, _SUPPRESS_INVISIBLE, _SUPPRESS_IT, _cmd_Hallucination, _eprop, _hero_Blind, _hero_youmonst, _hprop, _objdescr_is, _pmname, _sprintf, _st_Punished, _st_Stealth, _st_Wounded_legs, _st_a_monnam, _st_is_floater, _st_is_flyer, _st_slithy, _st_throws_rocks, _uprop_active, bigmonst_cmd, flooreffects_Maybe_Half_Phys, humanoid_cmd, is_metallic_st, is_pole, pooleffects_amphibious, pooleffects_breathless, pooleffects_grounded, pooleffects_is_swimmer, pooleffects_likes_lava, sr_touch_petrifies_ptr, verysmall_cmd, y_n_default, yn_function } from './cmd.js';
import { u_handsy } from './pickup.js';
import { test_move, u_locomotion } from './hack.js';
import { freeinv } from './invent.js'; // relocate-fns
import { ARTICLE_A, A_CHA, A_DEX, A_WIS, CONFUSION, DIR_ERR, DISMOUNT_BONES, DISMOUNT_BYCHOICE, DISMOUNT_ENGULFED, DISMOUNT_GENERIC, DISMOUNT_KNOCKED, DISMOUNT_POLY, DISMOUNT_THROWN, ECMD_CANCEL, ECMD_OK, ECMD_TIME, GLIB, I_SPECIAL, KILLED_BY_AN, LEVITATION, MAXULEV, M_AP_FURNITURE, M_AP_OBJECT, M_AP_TYPE, NO_KILLER_PREFIX, N_DIRS, P_BASIC, P_EXPERT, P_ISRESTRICTED, P_SKILLED, P_UNSKILLED, RLOC_ERR, SLT_ENCUMBER, SUPPRESS_HALLUCINATION, TELEDS_ALLOW_DRAG, TEST_MOVE, TIMEOUT, TT_BEARTRAP, TT_PIT, TT_WEB, Upolyd, VIBRATING_SQUARE, WOUNDED_LEGS, W_ARTI as W_ARTI_FW, has_mgivenname, u_at, xdir, ydir } from './const.js'; // relocate-fns
import { is_lava, is_pool } from './dbridge.js'; // relocate-fns
import { BOULDER } from './dig.js'; // relocate-fns
import { canspotmon, newsym } from './display.js'; // relocate-fns
import { heal_legs, legs_in_no_shape, set_wounded_legs } from './do.js'; // relocate-fns
import { hliquid } from './do_name.js'; // relocate-fns
import { surface } from './dungeon.js'; // relocate-fns
import { wizard } from './gstate.js'; // relocate-fns
import { losehp, near_capacity } from './hack.js'; // relocate-fns
import { dist2 } from './hacklib.js'; // relocate-fns
import { sobj_at } from './invent.js'; // relocate-fns
import { getdir } from './cmd.js'; // relocate-fns
import { mhe, permonstTemplate } from './makemon.js'; // relocate-fns
import { killed } from './mon.js'; // relocate-fns
import { poly_when_stoned } from './mondata.js'; // relocate-fns
import { accessible } from './monmove.js'; // relocate-fns
import { an } from './objnam.js'; // relocate-fns
import { encumber_msg } from './pickup.js'; // relocate-fns
import { You_cant } from './pline.js'; // relocate-fns
import { PM_BAT, PM_GHOST, PM_STONE_GOLEM } from './pm.generated.js'; // relocate-fns
import { body_part, polymon, steed_vs_stealth as steed_vs_stealth_real } from './polyself.js'; // relocate-fns
import { rn1 } from './rng.js';
import { rnd } from './rnd.js'; // relocate-fns
import { P_SKILL } from './skills.js'; // relocate-fns
import { remove_worn_item as _remove_worn_item_thrown } from './steal.js'; // relocate-fns
import { RLOC_NOMSG, enexto_out, rloc, rloc_to, teleds } from './teleport.js'; // relocate-fns
import { float_down, instapetrify, mintrap, monkilled_trap, sokoban_guilt, t_at, trapname } from './trap.js'; // relocate-fns
import { m_at, mon_nam } from './uhitm.js'; // relocate-fns

/* C steed.c:852-875 — newcham has already handled the saddle/armor. */
export async function poly_steed(steed, oldshape) {
    if (!can_saddle(steed) || !can_ride(steed)) {
        await dismount_steed(DISMOUNT_FELL);
    } else {
        let name = x_monnam(steed, ARTICLE_YOUR, null, SUPPRESS_SADDLE, false);
        if (oldshape !== steed.data)
            name = name.replace('your ', 'your new ');
        await pline('You adjust yourself in the saddle on %s.', name);
        steed_vs_stealth();
    }
}

/* C steed.c:16-20 rider_cant_reach — caller has decided hero can't reach while mounted. */
export async function rider_cant_reach() {
    await You("aren't skilled enough to reach from %s.", y_monnam_real(game.u.usteed));
}

/* C steed.c:827-849 maybewakesteed — called before saddling or mounting. */
export async function maybewakesteed(steed) {
    let frozen = steed.mfrozen | 0;
    const wasimmobile = helpless(steed);

    steed.msleeping = 0;
    if (frozen) {
        frozen = Math.trunc((frozen + 1) / 2);
        if (!rn2(frozen)) {
            steed.mfrozen = 0;
            steed.mcanmove = 1;
        } else {
            steed.mfrozen = frozen;
        }
    }
    if (wasimmobile && !helpless(steed))
        await pline('%s wakes up.', Monnam(steed));
    finish_meating(steed);
}



// C steed.c:878-895 stucksteed(checkfeeding)
// Decide whether hero's steed is able to move
export function stucksteed(checkfeeding) {
    const steed = game.u.usteed;

    if (steed) {
        // C: helpless(steed) = steed->msleeping || !steed->mcanmove
        if ((steed.msleeping | 0) || !(steed.mcanmove | 0)) {
            pline(`${YMonnam(steed)} won't move!`);
            return true;
        }
        // C: optionally check whether steed is in the midst of a meal
        if (checkfeeding && (steed.meating | 0)) {
            pline(`${YMonnam(steed)} is still eating.`);
            return true;
        }
    }
    return false;
}

/* C steed.c:897-933 place_monster */
export function place_monster(mon, x, y, selfInGrid) {
    let buf = "";
    /* normal map bounds are <1..COLNO-1,0..ROWNO-1> but sometimes
       vault guards (either living or dead) are parked at <0,0> */
    if (!isok(x, y) && (x != 0 || y != 0 || !mon.isgd)) {
        buf = describe_level_buf(0);
        impossible("trying to place %s at <%d,%d> mstate:%lx on %s",
                   minimal_monnam(mon, true), x, y, mon.mstate, buf);
        x = 0; y = 0;
    }
    if ((mon === game.u.usteed && !game.in_steed_dismounting)
        || (DEADMONSTER(mon) && !(mon.isgd && x == 0 && y == 0))) {
        buf = describe_level_buf(0);
        impossible("placing %s onto map, mstate:%lx, on %s?",
                   (mon === game.u.usteed) ? "steed" : "defunct monster",
                   mon.mstate, buf);
        return;
    }
    /* svl.level.monsters[x][y] — scan fmon chain.  C reads the monster GRID,
     * which `mon` is by contract absent from at every place_monster call site
     * (its caller ran remove_monster, or it was never placed).  This port has no
     * grid — m_at walks fmon, where `mon` is still linked — so the exclusion has
     * to be stated: without it, dismount_steed's place_monster finds the steed
     * at its own coordinates and takes the impossible() arm, whose
     * minimal_monnam() stub throws and aborts the replay. */
    let othermon = m_at_steed(x, y, mon);
    /* caller knows the grid cell still holds `mon` itself (e.g. mon_leave after
     * wormgone removed only the stale head-segment square). */
    if (!othermon && selfInGrid) othermon = mon;
    if (othermon) {
        buf = describe_level_buf(0);
        let monnm = minimal_monnam(mon, false);
        let othnm = (mon !== othermon) ? minimal_monnam(othermon, true) : "itself";
        impossible("placing %s over %s at <%d,%d>, mstates:%lx %lx on %s?",
                   monnm, othnm, x, y, othermon.mstate, mon.mstate, buf);
    }
    mon.mx = x; mon.my = y;
    /* C steed.c:930 overwrites the grid slot even after a collision diagnostic.
     * The displaced monster stays on fmon with its coordinates and mstate,
     * but m_at must no longer find it until it is placed again. */
    if (othermon && othermon !== mon) othermon._mapRemoved = true;
    delete mon._mapRemoved;
    /* svl.level.monsters[x][y] = mon — only mon now occupies this grid slot. */
    mon.mstate = MON_FLOOR;
}

/* helper: MON_AT(x,y) — find monster at position in fmon chain.  `excl` is the
 * monster the caller knows is off C's monster grid (see place_monster above). */
function m_at_steed(x, y, excl) {
    const steed = game.u ? game.u.usteed : null;
    for (let m = game.fmon; m; m = m.nmon) {
        if (m._mapRemoved) continue;
        if ((m.mhp | 0) < 1) continue; /* DEADMONSTER — C m_at/MON_AT reads the grid, which m_detach cleared */
        if (m === excl || (steed && m === steed)) continue;
        if (m.mx === x && m.my === y) return m;
    }
    return null;
}

/* helper: DEADMONSTER macro */
function DEADMONSTER(mon) {
    return mon.mhp < 1;
}

/* C pline.c:584-633: queue diagnostics in order and return to the caller's
 * fallback. Async callers flush any resulting message pages before proceeding.
 * This is js/display.js's synchronous impossible_sync (the old one-line wrapper
 * here forwarded to it unchanged and returned undefined, as it does); kept
 * distinct from js/pline.js's async impossible, which sync callers cannot await. */
export { impossible };

/* C panic() logs and returns in this replay terminal; preserve control flow. */
function panic(msg) { impossible(msg); }

/* C worn.c:1006-1035 which_armor — canonical port imported from worn.js */

/* mpickobj — C ref: nethack-c/src/steal.c:616.  The real port now lives in
 * js/mklev.js (imported above).  The local stub that used to sit here — a bare
 * minvent prepend that never set obj->where / obj->ocarry and never ran the
 * !mtame unknow_object() branch — was a WRONG TWIN: C put_saddle_on_mon
 * (steed.c:141-164) deliberately calls fully_identify_obj() and then relies on
 * mpickobj to un-identify the saddle again when the monster is out of view
 * ("mpickobj can later override identification if out-of-view", steed.c:150). */

/* local constant: SADDLE object type (objects.c order in 5.0).
 * Was 237, which is STETHOSCOPE (js/oc_name_data.js[237] == "stethoscope",
 * oc_weight 4).  js/u_init.js:1006 and js/sp_lev.js:3175 already carry the
 * correct 235 (oc_name "saddle", oc_weight 200), so this was the odd one out:
 * put_saddle_on_mon() below was mksobj'ing a 4-weight stethoscope into the
 * pony's minvent, and curr_mon_load() (mon.c) summed 4 where C sums 200. */
const SADDLE = 235;

/* C steed.c:387-398 exercise_steed — practice after 100 mounted moves.
 * Await the skill notification before the movement caller continues. */
export async function exercise_steed() {
    const u = game.u;
    if (!u || !u.usteed)
        return;
    u.urideturns = (u.urideturns | 0) + 1;
    if (u.urideturns >= 100) {
        u.urideturns = 0;
        await use_skill(P_RIDING, 1);
    }
}

/* C steed.c:141-164 put_saddle_on_mon */
export async function put_saddle_on_mon(saddle, mtmp) {
    if (!can_saddle(mtmp) || which_armor(mtmp, W_SADDLE)) {
        if (saddle)
            impossible("put_saddle_on_mon: saddle obj could get orphaned");
        return;
    }
    if (!saddle) {
        saddle = (await mksobj(SADDLE, true, false));
        if (saddle) {
            fully_identify_obj(saddle);
            /* mpickobj can later override identification if out-of-view */
        } else {
            return;
        }
    }
    if ((await mpickobj(mtmp, saddle)))
        panic("merged saddle?");
    mtmp.misc_worn_check |= W_SADDLE;
    saddle.owornmask = W_SADDLE;
    saddle.leashmon = mtmp.m_id;
    await update_mon_extrinsics(mtmp, saddle, true, false);
}

export function can_saddle(mtmp) {
    return canSaddleMndx(mtmp, mtmp.data?.pmidx ?? monsndx(mtmp));
}

/* C ref: apply.c use_saddle(struct obj *otmp) — saddle an adjacent monster.
 * Returns ECMD_OK/ECMD_CANCEL/ECMD_TIME like other apply handlers. */
export async function use_saddle(obj) {
    const g = game;
    const u = g.u = g.u || {};
    g.context = g.context || {};

    /* C: if (!u_handsy()) return ECMD_OK; */
    if (!(await u_handsy()))
        return ECMD_OK;

    /* Select an animal */
    if (u.uswallow || (u.uinwater | 0) || !(await getdir(null))) {
        await pline("Never mind.");
        return ECMD_CANCEL;
    }
    if (!u.dx && !u.dy) {
        await pline("Saddle yourself?  Very funny...");
        return ECMD_OK;
    }

    const tx = (u.ux | 0) + (u.dx | 0);
    const ty = (u.uy | 0) + (u.dy | 0);
    let mtmp;
    if (!isok(tx, ty)
        || !(mtmp = m_at(tx, ty))
        || !canspotmon(mtmp)) {
        await pline("I see nobody there.");
        return ECMD_TIME;
    }

    /* Is this a valid monster? */
    if (((mtmp.misc_worn_check | 0) & W_SADDLE) !== 0
        || which_armor(mtmp, W_SADDLE)) {
        await pline(`${Monnam(mtmp)} doesn't need another one.`);
        return ECMD_TIME;
    }

    const ptr = mtmp.data;
    if (sr_touch_petrifies_ptr(ptr) && !u.uarmg && !_uprop_active('STONE_RES')) {
        await pline(`You touch ${mon_nam(mtmp)}.`);
        if (!(poly_when_stoned(_hero_youmonst().data)
              && await polymon(PM_STONE_GOLEM))) {
            const kbuf = _sprintf("attempting to saddle %s",
                an(_pmname(ptr, _Mgender(mtmp))));
            await instapetrify(kbuf);
        }
    }

    const PM_AMOROUS_DEMON = 290;
    if ((mtmp.mnum | 0) === PM_AMOROUS_DEMON) {
        await pline("Shame on you!");
        exercise(A_WIS, false);
        return ECMD_TIME;
    }

    /* isminion/isshk/ispriest/isgd/iswiz */
    if (mtmp.isminion || mtmp.isshk || mtmp.ispriest || mtmp.isgd || mtmp.iswiz) {
        await pline(`I think ${mon_nam(mtmp)} would mind.`);
        return ECMD_TIME;
    }

    /* can_saddle check */
    if (!can_saddle(mtmp)) {
        await You_cant("saddle such a creature.");
        return ECMD_TIME;
    }

    /* Calculate your chance */
    // C steed.c:93: ACURR includes attribute bonuses and temporary changes.
    const dex = acurr(u, A_DEX);
    const cha = acurr(u, A_CHA);
    let chance = dex + Math.trunc(cha / 2) + 2 * (mtmp.mtame | 0);
    chance += (u.ulevel | 0) * ((mtmp.mtame | 0) ? 20 : 5);
    if (!(mtmp.mtame | 0))
        chance -= 10 * (mtmp.m_lev | 0);
    if (_Role_if(PM_KNIGHT))
        chance += 20;

    /* P_SKILL(P_RIDING) */
    switch (P_SKILL(P_RIDING)) {
    case P_ISRESTRICTED:
    case P_UNSKILLED:
    default:
        chance -= 20;
        break;
    case P_BASIC:
        break;
    case P_SKILLED:
        chance += 15;
        break;
    case P_EXPERT:
        chance += 30;
        break;
    }

    if (_uprop_active('CONFUSION') || _uprop_active('FUMBLING') || _uprop_active('GLIB'))
        chance -= 20;
    else if (u.uarmg && _objdescr_is(u.uarmg, "riding gloves"))
        chance += 10;
    else if (u.uarmf && _objdescr_is(u.uarmf, "riding boots"))
        chance += 10;

    if (obj.cursed)
        chance -= 50;

    /* [intended] steed becomes alert if possible */
    await maybewakesteed(mtmp);

    /* Make the attempt */
    if (rn2(100) < chance) {
        await You("put the saddle on %s.", mon_nam(mtmp));
        if (obj.owornmask)
            await _remove_worn_item_thrown(obj, false);
        freeinv(obj);
        await put_saddle_on_mon(obj, mtmp);
    } else {
        await pline(`${Monnam(mtmp)} resists!`);
    }
    return ECMD_TIME;
}

/* C ref: steed.c:168 can_ride(mtmp) — caller also checks can_saddle(). */
export function can_ride(mtmp) {
    const ym = _hero_youmonst().data;
    return !!(mtmp.mtame && humanoid_cmd(ym) && !verysmall_cmd(ym) && !bigmonst_cmd(ym)
              && (!Underwater() || pooleffects_is_swimmer(mtmp.data)));
}

async function mount_steed(mtmp, force) {
    const g = game;
    const u = g.u = g.u || {};

    /* C steed.c:205 */
    if (u.usteed) {
        await pline(`You are already riding ${mon_nam(u.usteed)}.`);
        return false;
    }
    /* C steed.c:211 */
    if (_cmd_Hallucination() && !force) {
        await pline("Maybe you should find a designated driver.");
        return false;
    }
    /* C steed.c:229-239 — Wounded_legs blocks mounting unless a forced
     * wizard-mode mount answers 'y' to the heal prompt.  The plural test reads
     * HWounded_legs (the timeout word), as C does. */
    if (_st_Wounded_legs()) {
        await legs_in_no_shape('riding', false);
        const qbuf = `Heal your leg${((_st_HWounded_legs() & BOTH_SIDES) === BOTH_SIDES) ? 's' : ''}?`;
        if (force && wizard()) {
            const answer = await y_n_default(qbuf, 'n');
            if (answer === 'y')
                heal_legs(0);
            else {
                /* C topl.c:537-547 leaves the latest answered prompt painted.
                 * Keep it instead of doride's earlier force-mount question. */
                if (!g._pending_message && !g._resultMessage)
                    g._resultMessage = g._ynStaleTopline = `${qbuf} [yn] (n)`;
                return false;
            }
        } else
            return false;
    }
    /* C steed.c:241 */
    const ym = _hero_youmonst().data;
    if (Upolyd(u) && (!humanoid_cmd(ym) || verysmall_cmd(ym) || bigmonst_cmd(ym)
                   || _st_slithy(ym))) {
        await pline("You won't fit on a saddle.");
        return false;
    }
    /* C steed.c:248-251 */
    if (!force && near_capacity() > SLT_ENCUMBER) {
        await You_cant("do that while carrying so much stuff.");
        return false;
    }
    if (!mtmp || (!force && ((_hero_Blind() && !_uprop_active('TELEPAT'))
                             || mtmp.mundetected
                             || M_AP_TYPE(mtmp) === M_AP_FURNITURE
                             || M_AP_TYPE(mtmp) === M_AP_OBJECT))) {
        await pline("I see nobody there.");
        return false;
    }
    if ((mtmp.data?.pmidx | 0) === PM_LONG_WORM_ST
        && ((u.ux | 0) + (u.dx | 0) !== (mtmp.mx | 0)
            || (u.uy | 0) + (u.dy | 0) !== (mtmp.my | 0))) {
        await pline(`You couldn't ride ${_st_a_monnam(mtmp)}, let alone its tail.`);
        return false;
    }
    if (u.uswallow || u.ustuck || u.utrap || _st_Punished()
        || !test_move(u.ux | 0, u.uy | 0,
                      (mtmp.mx | 0) - (u.ux | 0), (mtmp.my | 0) - (u.uy | 0),
                      TEST_MOVE)) {
        if (_st_Punished() || !(u.uswallow || u.ustuck || u.utrap))
            await pline(`You are unable to swing your ${body_part(LEG_ST)} over.`);
        else
            await pline("You are stuck here for now.");
        return false;
    }
    /* C steed.c:283 — which_armor(mtmp, W_SADDLE): no saddle object, no ride. */
    const otmp = which_armor(mtmp, W_SADDLE);
    if (!otmp) {
        await pline(`${Monnam(mtmp)} is not saddled.`);
        return false;
    }

    const ptr = mtmp.data;
    /* C steed.c:290 */
    if (sr_touch_petrifies_ptr(ptr) && !_uprop_active('STONE_RES')) {
        await pline(`You touch ${mon_nam(mtmp)}.`);
        await instapetrify(_sprintf("attempting to ride %s",
                                    an(_pmname(ptr, _Mgender(mtmp)))));
    }
    /* C steed.c:299 */
    if (!mtmp.mtame || mtmp.isminion) {
        await pline(`I think ${mon_nam(mtmp)} would mind.`);
        return false;
    }
    /* C steed.c:303; you.h:322 mhe uses mondata.c:1191 pronoun_gender. */
    if (mtmp.mtrapped) {
        const t = t_at(mtmp.mx | 0, mtmp.my | 0);
        await pline(`You can't mount ${mon_nam(mtmp)} while ${mhe(mtmp)}'s trapped in `
                    + `${an(trapname(t ? (t.ttyp | 0) : 0, false))}.`);
        return false;
    }
    if (!force && !_Role_if(PM_KNIGHT) && !(--mtmp.mtame)) {
        newsym(mtmp.mx | 0, mtmp.my | 0);
        await pline(`${Monnam(mtmp)} resists${mtmp.mleashed ? " and its leash comes off" : ""}!`);
        if (mtmp.mleashed)
            m_unleash(mtmp, false);
        return false;
    }
    /* C steed.c:317-321 — this refusal precedes can_ride's water check. */
    if (!force && Underwater() && !pooleffects_is_swimmer(ptr)) {
        await pline(`You can't ride that creature while under ${hliquid('water')}.`);
        return false;
    }
    /* C steed.c:322-325 */
    if (!can_saddle(mtmp) || !can_ride(mtmp)) {
        await You_cant("ride such a creature.");
        return false;
    }
    /* C steed.c:330 */
    const Levitation = _Levitation();
    /* C youprop.h:242-245 — blessed potion or invoked artifact only,
     * with no additional source of levitation keeping the hero aloft. */
    const hlev = _hprop(LEVITATION), elev = _eprop(LEVITATION);
    const levAtWill = ((hlev & I_SPECIAL) !== 0 || (elev & W_ARTI_FW) !== 0)
        && (hlev & ~(I_SPECIAL | TIMEOUT)) === 0
        && (elev & ~W_ARTI_FW) === 0;
    if (!force && !_st_is_floater(ptr) && !_st_is_flyer(ptr) && Levitation
        && !levAtWill) {
        await pline(`You cannot reach ${mon_nam(mtmp)}.`);
        return false;
    }
    /* C steed.c:333 */
    if (!force && u.uarm && is_metallic_st(u.uarm) && greatest_erosion_st(u.uarm)) {
        await pline(`Your ${u.uarm.oeroded ? "rusty" : "corroded"} armor is too stiff `
                    + `to be able to mount ${mon_nam(mtmp)}.`);
        return false;
    }
    /* C steed.c:338-356 — the impairment / slip block.  MAXULEV is 30
     * (you.h), so the roll is rnd(MAXULEV / 2 + 5) = rnd(20). */
    if (!force
        && (_hprop(CONFUSION) || _uprop_active('FUMBLING')
            || _hprop(GLIB) || _st_Wounded_legs()
            || otmp.cursed || otmp.greased
            || ((u.ulevel | 0) + (mtmp.mtame | 0) < rnd(Math.trunc(MAXULEV / 2) + 5)))) {
        if (Levitation) {
            await pline(`${Monnam(mtmp)} slips away from you.`);
            return false;
        }
        await pline(`You slip while trying to get on ${mon_nam(mtmp)}.`);
        /* C steed.c:348 — the death-reason string; x_monnam(ARTICLE_A, ...). */
        const buf = `slipped while mounting ${x_monnam(mtmp, ARTICLE_A, null,
            _SUPPRESS_IT | _SUPPRESS_INVISIBLE | SUPPRESS_HALLUCINATION, true)}`;
        await losehp(flooreffects_Maybe_Half_Phys(rn1(5, 10)), buf, NO_KILLER_PREFIX);
        return false;
    }

    /* Success — C steed.c:358-382 */
    await maybewakesteed(mtmp);
    if (!force) {
        if (Levitation && !_st_is_floater(ptr) && !_st_is_flyer(ptr))
            await pline(`${Monnam(mtmp)} magically floats up!`);
        await pline(`You mount ${mon_nam(mtmp)}.`);
        if (_Flying())
            await pline(`You and ${mon_nam(mtmp)} take flight together.`);
    }
    /* C steed.c:369 — setuwep handles polearms differently when mounted. */
    if (u.uwep && is_pole(u.uwep))
        g.unweapon = false;
    u.usteed = mtmp;
    {
        const was_stealthy = _st_Stealth();
        steed_vs_stealth_real();
        if (was_stealthy && !_st_Stealth())
            await pline("You aren't stealthy anymore.");
    }
    /* C steed.c:380-381 remove_monster(mtmp->mx, mtmp->my) + teleds(..., ALLOW_DRAG).
     * C's remove_monster clears svl.level.monsters[x][y] but LEAVES the steed on
     * the fmon chain with its <mx,my> tracking the hero (mon.c:272-277 asserts
     * exactly that).  This port has no separate monsters[][] grid — m_at() walks
     * fmon — so retain the removal with _mapRemoved as well as skipping
     * u.usteed in m_at().  dismount_steed clears u.usteed before checking for
     * an engulfer on the hero's square; the steed stays off-grid until
     * place_monster() puts it back (steed.c:656-705).
     * KNOWN GAP (documented, not silent): the world-turn loop does not yet skip
     * the steed the way C's movemon does (mon.c:2031), and riding movement
     * (hack.c domove's u.usteed arms, u.ugallop, exercise_steed) is unported.
     * So the frames from the mount onward can still diverge — but the mount
     * itself, and every frame BEFORE it, now match, where previously the
     * unconsumed direction key walked the hero and shifted the whole map. */
    const sx = mtmp.mx | 0, sy = mtmp.my | 0;
    mtmp._mapRemoved = true;
    newsym(sx, sy);
    await teleds(sx, sy, TELEDS_ALLOW_DRAG);
    /* C has no assignment here (u_on_newpos keeps a still-riding steed on the
     * hero); a dismount from teleds (float_up: "You cannot stay on") has already
     * placed the steed beside the hero, which this must not overwrite. */
    if (u.usteed === mtmp) {
        mtmp.mx = u.ux | 0;
        mtmp.my = u.uy | 0;
    }
    (g.disp ||= {}).botl = 1; /* C steed.c:381 disp.botl = TRUE */
    return true;
}

/* C ref: steed.c:178 doride() — the #ride command. */
export async function doride() {
    const g = game;
    const u = g.u = g.u || {};
    let forcemount = false;

    if (u.usteed) {
        /* C steed.c:183 — `dismount_steed(DISMOUNT_BYCHOICE); return ECMD_TIME;` */
        await dismount_steed(DISMOUNT_BYCHOICE);
        return ECMD_TIME;
    } else if ((await getdir(null)) && isok((u.ux | 0) + (u.dx | 0), (u.uy | 0) + (u.dy | 0))) {
        let _ynPrompt = null;
        if (wizard()) {
            /* C cmd.c:5459-5460: the query_menu route clears WIN_MESSAGE;
             * only the tty route leaves an answered prompt to preserve. */
            if (!(g.iflags?.query_menu && g.iflags?.window_inited))
                _ynPrompt = "Force the mount to succeed? [yn] (n)";
            const c = await yn_function("Force the mount to succeed?", ynchars_st, 'n', true);
            /* topl.c:537-549 leaves a single-row tty question painted.
             * Publish that residue before mount_steed's teleds/spoteffects:
             * look_here can open a pile window over it (invent.c:4289).
             * It is physical text, not an unacknowledged pline to page. */
            if (_ynPrompt) g._topl_sticky = _ynPrompt;
            if (c === 'y') forcemount = true;
        }
        const _prevAtMount = g._prevmsg;
        const res = await mount_steed(m_at((u.ux | 0) + (u.dx | 0), (u.uy | 0) + (u.dy | 0)),
                                      forcemount);
        /* tty_yn_function (topl.c) never clears the answered prompt: with no
         * later pline (a forced mount prints nothing, steed.c:360-365) the
         * prompt text stays on the topline until the next key is read. */
        /* a pline during mount_steed (pony wakes, teleport prompt) already
         * overwrote the dead prompt text. Keep any physical residue in its
         * sticky channel: a pile window may have marked it EMPTY without
         * erasing it (wintty.c:1879-1880), so silent commands retain it. */
        if (_ynPrompt && !g._pending_message && !g._resultMessage && !g._topl_sticky
            && g._prevmsg === _prevAtMount)
            g._resultMessage = g._ynStaleTopline = _ynPrompt;
        return res ? ECMD_TIME : ECMD_OK;
    } else {
        return ECMD_CANCEL;
    }
}

function _st_landing_spot(reason, forceit) {
    const u = game.u;
    const cand = [];
    let n = 0;
    let j = _st_xytodir(u.dx | 0, u.dy | 0);
    let best_j, clockwise_j, counterclk_j;
    if (reason === DISMOUNT_KNOCKED && j !== DIR_ERR) {
        /* C steed.c:476-489 — the knocked-out-of-the-saddle preference order:
         * the knockback direction first, then its two neighbours in an order
         * chosen by rn2(2).  Nothing in this port calls DISMOUNT_KNOCKED yet
         * (it is the knockback effect of a hit), but the arm is here because
         * its rn2(2) sits AHEAD of the tie-break draw below — omitting it would
         * put the whole dismount one draw out of step the day it is reached. */
        best_j = j;
        cand[0] = { x: u.dx | 0, y: u.dy | 0 };
        const i0 = rn2(2);
        clockwise_j = (j + 1) % N_DIRS;          /* C hack.h DIR_RIGHT */
        cand[1 + i0] = { x: xdir[clockwise_j], y: ydir[clockwise_j] };
        counterclk_j = (j + N_DIRS - 1) % N_DIRS; /* C hack.h DIR_LEFT */
        cand[2 - i0] = { x: xdir[counterclk_j], y: ydir[counterclk_j] };
        n = 3;
    } else {
        best_j = clockwise_j = counterclk_j = -1;
    }
    for (j = 0; j < N_DIRS; ++j) {
        if (j === best_j || j === clockwise_j || j === counterclk_j)
            continue;
        /* C steed.c:500-501 —
         *     if (reason == DISMOUNT_POLY && NODIAG(u.umonnum) && (j % 1) != 0)
         *         continue;
         * `j % 1` is ALWAYS 0, so this test can never fire; C evidently meant
         * `j % 2` (the comment two lines up says "odd j values are diagonal
         * directions here").  Port the bug: skipping nothing is what C does. */
        cand[n++] = { x: xdir[j], y: ydir[j] };
    }

    /* C steed.c:518-524 — up to three passes.  viable / min_distance / found are
     * declared OUTSIDE the pass loop in C and are deliberately NOT reset between
     * passes; `viable` in particular keeps counting across passes, which is what
     * the rn2(viable) tie-break sees. */
    const impaird = !!(_uprop_active('STUNNED') || _uprop_active('CONFUSION')
                       || _uprop_active('FUMBLING'));
    let viable = 0;
    let found = false;
    let min_distance = -1;
    const spot = { x: 0, y: 0 };
    for (let i = (reason === DISMOUNT_BYCHOICE && !impaird) ? 0
                 : ((reason === DISMOUNT_BYCHOICE && impaird)
                    || reason === DISMOUNT_KNOCKED) ? 1
                   : 2;
         i <= 2 && !found; ++i) {
        for (let k = 0; k < n; ++k) {
            const x = (u.ux | 0) + (cand[k].x | 0);
            const y = (u.uy | 0) + (cand[k].y | 0);
            if (!isok(x, y) || u_at(x, y))
                continue;
            if (accessible(x, y) && !m_at(x, y)
                && test_move(u.ux | 0, u.uy | 0, x - (u.ux | 0), y - (u.uy | 0),
                             TEST_MOVE)) {
                ++viable;
                const distance = dist2(x, y, u.ux | 0, u.uy | 0); /* C distu() */
                if (min_distance < 0
                    || ((best_j === -1) ? (distance < min_distance) : (k < 3))
                    || (distance === min_distance && !rn2(viable))) {
                    const t = t_at(x, y);
                    /* traps avoided on pass 0; boulders avoided on 0 and 1 */
                    const kn_trap = i === 0 && !!(t && (t.tseen | 0)
                                                  && (t.ttyp | 0) !== VIBRATING_SQUARE);
                    const boulder = i <= 1 && !!(sobj_at(BOULDER, x, y)
                                                 && !_st_throws_rocks(_hero_youmonst().data));
                    if (!kn_trap && !boulder) {
                        spot.x = x;
                        spot.y = y;
                        min_distance = distance;
                        found = true;
                        if (best_j !== -1 && k < 3)
                            break;
                    }
                }
            }
        }
    }

    /* C steed.c:566-568 — last resort. */
    if (forceit && !found) {
        const cc = enexto_out(u.ux | 0, u.uy | 0, _hero_youmonst().data);
        if (cc) {
            spot.x = cc.x;
            spot.y = cc.y;
            found = true;
        }
    }
    return found ? spot : null;
}

export async function dismount_steed(reason) {
    const g = game;
    const u = g.u;
    const save_utrap = u.utrap | 0;
    const repair_leg_damage_init = _st_Wounded_legs();
    let repair_leg_damage = repair_leg_damage_init;
    /* C steed.c:586 — landing_spot() runs in the INITIALISER list, i.e. before
     * any of the switch arms below, so its rn2 comes first in the stream. */
    let cc = _st_landing_spot(reason, 0);
    let have_spot = !!cc;

    const mtmp = u.usteed;
    if (!mtmp)
        return;                       /* C steed.c:589 — just return silently */
    /* C steed.c:591-596 — Flying/Levitation are read with u.usteed cleared,
     * because both macros consult the steed.  `verb` is only used by the
     * _FELL / _KNOCKED / _THROWN arms. */
    u.usteed = null;
    const ufly = !!_Flying();
    const ulev = !!_uprop_active('LEVITATION');
    let verb = u_locomotion('fall'); /* C steed.c:595 */
    u.usteed = mtmp;

    const otmp = which_armor(mtmp, W_SADDLE);
    switch (reason) {
    case DISMOUNT_THROWN:
        verb = 'are thrown';
        /* FALLTHROUGH */
    case DISMOUNT_KNOCKED:
    case DISMOUNT_FELL:
        await pline(`You ${verb} off of ${mon_nam(mtmp)}!`);
        if (!have_spot) {
            cc = _st_landing_spot(reason, 1);
            have_spot = !!cc;
        }
        if (!ulev && !ufly) {
            await losehp(flooreffects_Maybe_Half_Phys(rn1(10, 10)), 'riding accident',
                   KILLED_BY_AN);
            set_wounded_legs(BOTH_SIDES, _st_HWounded_legs() + rn1(5, 5));
            repair_leg_damage = false;
        }
        break;
    case DISMOUNT_POLY:
        await pline(`You can no longer ride ${mon_nam(u.usteed)}.`);
        if (!have_spot) {
            cc = _st_landing_spot(reason, 1);
            have_spot = !!cc;
        }
        break;
    case DISMOUNT_ENGULFED:           /* C: caller displays message */
    case DISMOUNT_BONES:              /* C: hero has just died */
    case DISMOUNT_GENERIC:            /* C: no messages, just make it so */
        break;
    case DISMOUNT_BYCHOICE:
    default:
        if (otmp && (otmp.cursed | 0)) {
            await pline(`You can't.  The saddle ${(otmp.bknown | 0) ? 'is' : 'seems to be'} cursed.`);
            otmp.bknown = 1;          /* C: ok to skip set_bknown() here */
            return;
        }
        if (!have_spot) {
            await pline("You can't.  There isn't anywhere for you to stand.");
            return;
        }
        if (!has_mgivenname(mtmp)) {
            await pline('You\'ve been through the dungeon on '
                        + `${an(_pmname(mtmp.data, _Mgender(mtmp)))} with no name.`);
            if (_uprop_active('HALLUC'))
                await pline('It felt good to get out of the rain.');
        } else {
            await pline(`You dismount ${mon_nam(mtmp)}.`);
        }
    }
    /* C steed.c:651-653 — "While riding, Wounded_legs refers to the steed's
     * legs; after dismounting, it reverts to the hero's legs." */
    if (repair_leg_damage)
        heal_legs(1);

    /* C steed.c:656-666 — release the steed. */
    u.usteed = null;
    u.ugallop = 0;
    {
        const was_stealthy = _st_Stealth();
        steed_vs_stealth_real();
        if (_st_Stealth() && !was_stealthy)
            await pline('You seem less noisy now.');
    }

    /* C steed.c:668-672 — the hero's trap becomes the steed's. */
    if ((u.utraptype | 0) === TT_BEARTRAP || (u.utraptype | 0) === TT_PIT
        || (u.utraptype | 0) === TT_WEB)
        mtmp.mtrapped = 1;

    const steedcc = { x: u.ux | 0, y: u.uy | 0 };
    /* C reads the monster grid here, from which the steed is absent (it has
     * been off-grid since mount_steed's remove_monster); js/uhitm.js's m_at
     * models that absence by explicitly skipping u.usteed in the fmon walk; a long-worm
     * steed's own tail segment on the hero's square is in C's grid and must
     * still answer (steed.c:689). */
    if (m_at(u.ux | 0, u.uy | 0)) {
        let alt = enexto_out(u.ux | 0, u.uy | 0, mtmp.data);
        if (!alt) /* C steed.c:694-698 — flyer, then any in-bounds spot. */
            alt = enexto_out(u.ux | 0, u.uy | 0, permonstTemplate(PM_BAT))
                || enexto_out(u.ux | 0, u.uy | 0, permonstTemplate(PM_GHOST));
        if (alt) {
            steedcc.x = alt.x;
            steedcc.y = alt.y;
        }
    }

    if ((mtmp.mhp | 0) >= 1) {        /* C: !DEADMONSTER(mtmp) */
        g.in_steed_dismounting = (g.in_steed_dismounting | 0) + 1;
        place_monster(mtmp, steedcc.x, steedcc.y);
        g.in_steed_dismounting = (g.in_steed_dismounting | 0) - 1;

        if (reason === DISMOUNT_BONES) {
            /* C steed.c:707-714 — make room for the hero's ghost. */
            const dest = enexto_out(u.ux | 0, u.uy | 0, mtmp.data);
            if (dest)
                await rloc_to(mtmp, dest.x, dest.y);
            else
                await rloc(mtmp, RLOC_ERR | RLOC_NOMSG);
            return;
        }

        /* C steed.c:717-773 — "Set hero's and/or steed's positions.  Usually
         * try moving the hero first." */
        if (!(u.uswallow | 0) && !u.ustuck && have_spot) {
            /* C steed.c:721-741 — resolve the steed's fall before moving the
             * hero; a fatal fall leaves the hero on the liquid square. */
            const mdat = mtmp.data;
            if (pooleffects_grounded(mdat)) {
                if (is_pool(u.ux, u.uy)) {
                    if (!Underwater())
                        await pline('%s falls into the %s!', Monnam(mtmp),
                                    surface(u.ux, u.uy));
                    if (!(pooleffects_is_swimmer(mdat) || pooleffects_amphibious(mdat)
                          || pooleffects_breathless(mdat))) {
                        await killed(mtmp);
                        adjalign(-1);
                    }
                } else if (is_lava(u.ux, u.uy)) {
                    await pline('%s is pulled into the %s!', Monnam(mtmp), hliquid('lava'));
                    if (!pooleffects_likes_lava((mtmp.mndx ?? mtmp.mnum) | 0)) {
                        await killed(mtmp);
                        adjalign(-1);
                    }
                }
            }
            if ((mtmp.mhp | 0) >= 1) {
                /* C steed.c:761-768 — keep the steed here, move the hero to cc;
                 * teleds() clears u.utrap.  in_steed_dismounting is C's kludge
                 * for "only one pickup attempt" (hack.c:3355). */
                g.in_steed_dismounting = 1;
                await teleds(cc.x, cc.y, TELEDS_ALLOW_DRAG);
                if (sobj_at(BOULDER, cc.x, cc.y))
                    sokoban_guilt();
                g.in_steed_dismounting = 0;

                /* C steed.c:771-772 — put your steed in your trap. */
                if (save_utrap)
                    await mintrap(mtmp, 0 /* NO_TRAP_FLAGS */);
            }
        }
        /* C steed.c:775-790 — move the steed, or kill it if no room remains. */
        else {
            const cc2 = enexto_out(u.ux | 0, u.uy | 0, mtmp.data);
            if (cc2)
                await rloc_to(mtmp, cc2.x, cc2.y);
            else if (reason === DISMOUNT_BYCHOICE) {
                await killed(mtmp);
                adjalign(-1);
            } else {
                await monkilled_trap(mtmp, '', false); /* -AD_PHYS: ordinary death */
            }
        }
    }

    /* C steed.c:807-816 — "usually return the hero to the surface". */
    if (reason !== DISMOUNT_ENGULFED && reason !== DISMOUNT_BONES) {
        g.in_steed_dismounting = 1;
        await float_down(0, W_SADDLE_MASK_ST);
        g.in_steed_dismounting = 0;
        (g.disp ||= {}).botl = 1; /* C steed.c:813 disp.botl = TRUE */
        await encumber_msg();
        g.vision_full_recalc = 1;
    } else {
        (g.disp ||= {}).botl = 1; /* C steed.c:816 */
    }
    /* C steed.c:818-819 — polearms behave differently when not mounted. */
    if (u.uwep && is_pole(u.uwep))
        g.unweapon = true;
}

/* C rm.h:534 W_SADDLE — the worn-mask bit for a saddle. */
const W_SADDLE_MASK_ST = 0x00100000;

/* C hack.c:xytodir — index of <x,y> in the xdir[]/ydir[] direction tables. */
function _st_xytodir(x, y) {
    for (let dd = 0; dd < N_DIRS; dd++)
        if (x === xdir[dd] && y === ydir[dd])
            return dd;
    return DIR_ERR;
}

/* C youprop.h HWounded_legs = u.uprops[WOUNDED_LEGS].intrinsic (the timeout the
 * _FELL arm adds rn1(5,5) to). */
function _st_HWounded_legs() {
    return (game.u?.uprops?.[WOUNDED_LEGS]?.intrinsic | 0);
}

/* Constants and small predicates the two functions above need.  Each is the C
 * macro restated, following this file's convention for header macros. */
const PM_LONG_WORM_ST = 114;        /* pm.h PM_LONG_WORM (234 is the ape) */

const LEG_ST = 9;                   /* body_part.h LEG (8 is the preceding part) */

const ynchars_st = "yn";            /* decl.c ynchars */

/* C ref: obj.h greatest_erosion(otmp) — max(oeroded, oeroded2). */
function greatest_erosion_st(obj) {
    return Math.max(obj.oeroded | 0, obj.oeroded2 | 0);
}
