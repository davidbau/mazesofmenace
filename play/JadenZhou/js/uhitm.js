// uhitm.js -- hero attacks a monster, and the shared attack-damage
// handlers (C ref: uhitm.c).
//
// Ported so far: the hero's melee attack: do_attack(), attack_checks(),
// check_caitiff(), mon_maybe_unparalyze(), find_roll_to_hit(),
// known_hitum(), double_punch(), hitum(), hmon(), hmon_hitmon() and its
// sub-steps, missum(), passive() and the hero-attacker case of
// mhitm_knockback().  Polymorphed attacks (hmonas()), Cleaver's
// hitum_cleave() and some rarer sub-steps throw 'not ported yet'.
// For the monster-hits-hero (mhitu) case: mhitm_adtyping(),
// mhitm_ad_phys(), mhitm_ad_elec(), mhitm_ad_stck() and
// mhitm_mgc_atk_negated().  The hero-attacks and monster-vs-monster
// (mhitm) branches of those handlers throw a 'not ported yet' error.

import { game } from './gstate.js';
import { cutworm } from './worm.js';
import { rn2, rnd, rn1 } from './rng.js';
import { pline, canspotmon, You } from './display.js';
import { Monnam, y_monnam } from './do_name.js';
import { hitmsg, magic_negation, mpoisons_subj } from './mhitu.js';
import { poisoned } from './attrib.js';
import { pmname, Mgender } from './do_name.js';
import { exercise } from './attrib.js';
import * as M from './monsters.js';
import { mons, AT_CLAW, AT_KICK, AT_BUTT, AT_WEAP, AT_HUGS, AT_ENGL, AT_TUCH,
         AD_PHYS, AD_ELEC, AD_STCK } from './monsters.js';
import { M_ATTK_HIT, SHOCK_RES, M_SEEN_ELEC, A_STR, INVIS, W_ARMG, HALF_PHDAM,
         NON_PM, LOW_PM } from './const.js';
import { objects, CORPSE, GAUNTLETS_OF_POWER, SILVER, IRON, METAL } from './objects.js';
import { permapoisoned } from './mkobj.js';
import { dmgval } from './weapon.js';
import { which_armor } from './worn.js';
import { rustm } from './mhitm.js';
import { couldsee, cansee } from './vision.js';
import { perceives, is_were, is_demon } from './mondata.js';
import { IS_OBSTRUCTED, SHOPBASE, ROOMOFFSET } from './const.js';
import { PM_LONG_WORM, PM_LONG_WORM_TAIL } from './monsters.js';
import { passes_walls } from './mondata.js';
import { ART_STORMBRINGER } from './artilist.js';
import { highc } from './hacklib.js';
import { monflee } from './monmove.js';
import { is_safemon, end_running, in_rooms } from './hack.js';
import { rnl, d } from './rng.js';
import { Your, pline_The, Blind, Hallucination, sensemon, canseemon, newsym,
         glyph_at, glyph_is_warning, glyph_is_invisible, map_invisible,
         tp_sensemon, vobj_at } from './display.js';
import { mon_nam, l_monnam, x_monnam, ARTICLE_A, SUPPRESS_IT,
         SUPPRESS_INVISIBLE, SUPPRESS_HALLUCINATION, SUPPRESS_SADDLE,
         SUPPRESS_NAME } from './do_name.js';
import { adjalign, ACURR } from './attrib.js';
import { STRAT_WAITMASK, MMOVE_DIED, HAND, A_DEX, A_WIS, A_LAWFUL, CONFUSION, A_CON,
         STUNNED, PROT_FROM_SHAPE_CHANGERS, DETECT_MONSTERS, FREE_ACTION,
         REFLECTING, FLYING, LEVITATION, POISON_RES, M_AP_TYPMASK,
         PARANOID_HIT, engulfing_u, HMON_MELEE, HMON_THROWN, HMON_KICKED,
         HMON_APPLIED, M_ATTK_MISS, M_ATTK_DEF_DIED, XKILL_NOMSG, NATTK,
         isok, IS_DOOR, D_NODOOR, D_BROKEN, Is_rogue_level, Is_airlevel,
         Is_waterlevel, W_RINGL, W_RINGR, W_ARM, W_ARMS, W_WEP, W_AMUL,
         P_BARE_HANDED_COMBAT, P_BASIC, P_SKILLED, P_NONE, P_LANCE, P_KNIFE,
         P_DAGGER, P_SABER, P_AXE, P_WHIP, P_SHURIKEN, P_BOW,
         TEST_MOVE } from './const.js';
import { AT_NONE, AD_FIRE, AD_RUST, AD_CORR, AD_ACID, AD_STON, AD_MAGM,
         AD_ENCH, AD_PLYS, AD_COLD, AD_STUN } from './monsters.js';
import { WEAPON_CLASS, TOOL_CLASS, ARMOR_CLASS, GEM_CLASS, POTION_CLASS,
         RING_CLASS, ARM_SHIELD, WHACK, LEATHER, GEMSTONE, MINERAL,
         NO_MATERIAL, RUBBER_HOSE, BOOMERANG, KATANA, YA, YUMI, ELVEN_ARROW,
         ELVEN_BOW, HEAVY_IRON_BALL, BOULDER, IRON_CHAIN, MIRROR,
         CLOVE_OF_GARLIC, LOADSTONE, GOLD_DRAGON_SCALE_MAIL,
         GOLD_DRAGON_SCALES, SHIELD_OF_REFLECTION,
         AMULET_OF_REFLECTION } from './objects.js';
import { is_weptool } from './mkobj.js';
import { abon, dbon, hitval, weapon_hit_bonus, weapon_dam_bonus, use_skill,
         uwep_skill_type, special_dmgval, weapon_type, P_SKILL,
         m_carrying } from './weapon.js';
import { find_mac } from './worn.js';
import { noattacks, check_capacity, overexertion, near_capacity,
         nomul, test_move } from './hack.js';
import { can_twoweapon, untwoweapon, bimanual, is_launcher, is_missile,
         is_ammo, is_pole, is_wet_towel, ammo_and_launcher } from './wield.js';
import { yname, makeplural, an, doname, xname, vtense, The } from './objnam.js';
import { ing_suffix, s_suffix } from './hacklib.js';
import { body_part } from './insight.js';
import { object_from_map, defsyms_explanation } from './pager.js';
import { simpleonames } from './iactions.js';
import { otense } from './objnam.js';
import { a_monnam, EXACT_NAME } from './do_name.js';
import { M_AP_OBJECT, M_AP_FURNITURE, M_AP_MONSTER, MIM_REVEAL, MIM_OMIT_WAIT,
         TELEPAT, SEE_INVIS } from './const.js';
import { STRANGE_OBJECT } from './objects.js';
import { u_wipe_engr } from './engrave.js';
import { m_move } from './monmove.js';
import { wakeup, seemimic, xkilled, killed } from './mon.js';
import { is_pool, m_at } from './makemon.js';
import { paranoid_query } from './cmd.js';
import { is_undead, is_orc, is_elf, is_flyer, is_floater, dmgtype, monsndx,
         mon_hates_silver, Resists_Elem } from './mondata.js';
import { ART_CLEAVER, ART_TROLLSBANE, ART_OGRESMASHER, ART_GIANTSLAYER,
         ART_SNICKERSNEE, ART_SUNSWORD } from './artilist.js';
import { obj_resists } from './dogmove.js';
import { bare_artifactname } from './iactions.js';
import { exclam } from './zap.js';
import { could_seduce } from './mhitu.js';
import { carrying } from './invent.js';
import { abuse_dog } from './dog.js';
import { discover_object } from './o_init.js';
/* C ref: hack.h makeknown() */
function makeknown(x) { discover_object(x, true, true, true); }

function sgn(n) { return n < 0 ? -1 : n > 0 ? 1 : 0; }
/* C ref: mondata.h touch_petrifies() */
function touch_petrifies(ptr) {
    return ptr === mons[M.PM_COCKATRICE] || ptr === mons[M.PM_CHICKATRICE];
}
/* C ref: youprop.h Half_physical_damage, Hate_silver */
function Half_physical_damage() {
    const p = game.u.uprops[HALF_PHDAM];
    return !!((p.intrinsic || p.extrinsic) && !p.blocked);
}
function Hate_silver() {
    const pd = game.youmonst.data;
    return (game.u.ulycn ?? NON_PM) >= LOW_PM
        || is_were(pd) || pd.mlet === M.S_VAMPIRE || is_demon(pd)
        || pd === mons[M.PM_SHADE]
        || (pd.mlet === M.S_IMP && pd !== mons[M.PM_TENGU]);
}
/* C ref: artifact.c artifact_hit() -- returns !artifact_hit() */
function artifact_hit_nyi(magr, mdef, otmp, mhm) {
    void magr; void mdef; void otmp; void mhm;
    throw new Error('mhitm_ad_phys(): artifact_hit() not ported yet');
}
/* C ref: mondata.c attacktype() */
function attacktype(ptr, atyp) {
    return ptr.mattk.some((a) => a.aatyp === atyp);
}
/* C ref: mondata.c sticks() */
function sticks(ptr) {
    return attacktype(ptr, AT_ENGL) || attacktype(ptr, AT_HUGS)
        || ptr.mattk.some((a) => a.adtyp === AD_STCK);
}
/* C ref: youprop.h Shock_resistance */
function Shock_resistance() {
    const p = game.u.uprops[SHOCK_RES];
    return !!((p.intrinsic || p.extrinsic) && !p.blocked);
}
/* C ref: hack.h m_next2u() */
function m_next2u(mon) {
    return Math.abs(mon.mx - game.u.ux) <= 1 && Math.abs(mon.my - game.u.uy) <= 1;
}

// C ref: mon.c set_ustuck()
export function set_ustuck(mtmp) {
    const u = game.u;
    game.disp_botl = true;
    u.ustuck = mtmp;
    if (!u.ustuck) {
        u.uswallow = 0;
        u.uswldtim = 0;
    }
}

// C ref: mondata.c monstseesu()
/* Monsters in line of sight learn hero resistance to M_SEEN_foo */
export function monstseesu(seenres) {
    if (!seenres || game.u.uswallow)
        return;
    for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon)
        if (mtmp.mhp > 0 && m_canseeu_nyi(mtmp))
            mtmp.seen_resistance |= seenres;
}
// C ref: mondata.c monstunseesu()
/* Monsters in line of sight forget hero resistance to M_SEEN_foo */
export function monstunseesu(seenres) {
    if (!seenres || game.u.uswallow)
        return;
    for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon)
        if (mtmp.mhp > 0 && m_canseeu_nyi(mtmp))
            mtmp.seen_resistance &= ~seenres;
}
/* C ref: monmove.h m_canseeu() -- only the cases that don't need
   invisibility/underwater/burial handling */
function m_canseeu_nyi(m) {
    const u = game.u;
    if (u.uinwater || u.uburied || m.mburied)
        throw new Error('monstunseesu(): m_canseeu() underwater/buried not ported yet');
    return m_canseeu_couldsee(m);
}
function m_canseeu_couldsee(m) {
    const p = game.u.uprops[INVIS];
    const Invis = !!((p.intrinsic || p.extrinsic) && !p.blocked);
    return (!Invis || perceives(m.data)) ? couldsee(m.mx, m.my) : false;
}

// C ref: uhitm.c mhitm_mgc_atk_negated()
function mhitm_mgc_atk_negated(magr, mdef, verbosely) {
    /* mcan doesn't apply to youmonst; hero can't be cancelled */
    if (magr !== game.youmonst && magr.mcan)
        return { negated: true, msg: false }; /* no message if cancelled */

    const armpro = magic_negation(mdef);
    const negated = !(rn2(10) >= 3 * armpro);
    if (negated) {
        /* attack has been thwarted by negation, aka magical cancellation */
        return { negated: true, msg: !!verbosely };
    }
    return { negated: false, msg: false };
}
/* the message half of mhitm_mgc_atk_negated(), which needs to await */
async function mgc_atk_negated(magr, mdef, verbosely) {
    const r = mhitm_mgc_atk_negated(magr, mdef, verbosely);
    if (r.negated && r.msg) {
        if (mdef === game.youmonst)
            await pline('You avoid harm.');
        else
            throw new Error('mhitm_mgc_atk_negated(): monster defender message not ported yet');
    }
    return r.negated;
}

// C ref: uhitm.c mhitm_ad_phys()
async function mhitm_ad_phys(magr, mattk, mdef, mhm) {
    const u = game.u;
    const pa = magr.data;
    const pd = mdef.data;

    if (magr === game.youmonst) {
        throw new Error('mhitm_ad_phys(): uhitm branch not ported yet');
    } else if (mdef === game.youmonst) {
        /* mhitu */
        if (mattk.aatyp === AT_HUGS && !sticks(pd)) {
            if (!u.ustuck && rn2(2)) {
                throw new Error('mhitm_ad_phys(): u_slip_free()/grab not ported yet');
            } else if (u.ustuck === magr) {
                exercise(A_STR, false);
                await pline(`You are being ${(pa === mons[M.PM_ROPE_GOLEM]) ? 'choked' : 'crushed'}.`);
            }
        } else { /* hand to hand weapon */
            const otmp = magr.mw || null; /* MON_WEP(magr) */

            if (mattk.aatyp === AT_WEAP && otmp) {
                let marmg;
                let tmp;
                const was_poisoned = (otmp.opoisoned
                                      || permapoisoned(otmp));

                if (otmp.otyp === CORPSE
                    && touch_petrifies(mons[otmp.corpsenm]))
                    throw new Error('mhitm_ad_phys(): cockatrice corpse hit (do_stone_u()) not ported yet');
                mhm.damage += dmgval(otmp, mdef);
                if ((marmg = which_armor(magr, W_ARMG)) != null
                    && marmg.otyp === GAUNTLETS_OF_POWER)
                    mhm.damage += rn1(4, 3); /* 3..6 */
                if (mhm.damage <= 0)
                    mhm.damage = 1;
                if (!otmp.oartifact
                    || artifact_hit_nyi(magr, mdef, otmp, mhm)) {
                    await hitmsg(magr, mattk);
                    mhm.hitflags |= M_ATTK_HIT;
                }
                if (!mhm.damage)
                    return;
                if (objects[otmp.otyp].oc_material === SILVER
                    && Hate_silver())
                    throw new Error('mhitm_ad_phys(): "The silver sears your flesh!" not ported yet');
                /* this redundancy necessary because you have
                   to take the damage _before_ being cloned;
                   need to have at least 2 hp left to split */
                tmp = mhm.damage;
                if (u.uac < 0)
                    tmp -= rnd(-u.uac);
                if (tmp < 1)
                    tmp = 1;
                if (Half_physical_damage())
                    tmp = Math.trunc((tmp + 1) / 2);

                if (u.mh - tmp > 1
                    && (objects[otmp.otyp].oc_material === IRON
                        /* relevant 'metal' objects are scalpel and tsurugi */
                        || objects[otmp.otyp].oc_material === METAL)
                    && (u.umonnum === M.PM_BLACK_PUDDING
                        || u.umonnum === M.PM_BROWN_PUDDING))
                    throw new Error('mhitm_ad_phys(): cloneu() not ported yet');
                rustm(game.youmonst, otmp);
                if (was_poisoned && game.mhitu_dieroll <= 5)
                    throw new Error('mhitm_ad_phys(): poisoned() not ported yet');
            } else if (mattk.aatyp !== AT_TUCH || mhm.damage !== 0
                       || magr !== u.ustuck) {
                await hitmsg(magr, mattk);
                mhm.hitflags |= M_ATTK_HIT;
            }
        }
    } else {
        throw new Error('mhitm_ad_phys(): mhitm branch is in mhitm.js');
    }
}

// C ref: uhitm.c mhitm_ad_elec()
async function mhitm_ad_elec(magr, mattk, mdef, mhm) {
    if (magr === game.youmonst) {
        throw new Error('mhitm_ad_elec(): uhitm branch not ported yet');
    } else if (mdef === game.youmonst) {
        /* mhitu */
        await hitmsg(magr, mattk);
        if (!await mgc_atk_negated(magr, mdef, true)) {
            await pline('You get zapped!');
            if (Shock_resistance()) {
                await pline('The zap doesn\'t shock you!');
                monstseesu(M_SEEN_ELEC);
                mhm.damage = 0;
            } else {
                monstunseesu(M_SEEN_ELEC);
            }
            if (magr.m_lev > rn2(20))
                throw new Error('mhitm_ad_elec(): destroy_items() not ported yet');
        } else
            mhm.damage = 0;
    } else {
        throw new Error('mhitm_ad_elec(): mhitm branch not ported yet');
    }
}

// C ref: uhitm.c mhitm_ad_stck()
async function mhitm_ad_stck(magr, mattk, mdef, mhm) {
    const negated = await mgc_atk_negated(magr, mdef, false);
    const pd = mdef.data;
    const barbs = (magr.data === mons[M.PM_BARBED_DEVIL]);

    void mhm;
    if (magr === game.youmonst) {
        throw new Error('mhitm_ad_stck(): uhitm branch not ported yet');
    } else if (mdef === game.youmonst) {
        /* mhitu */
        await hitmsg(magr, mattk);
        if (!negated && !game.u.ustuck && !sticks(pd)) {
            set_ustuck(magr);
            if (barbs)
                await pline('The barbs stick to you!');
        }
    } else {
        throw new Error('mhitm_ad_stck(): mhitm branch not ported yet');
    }
}

// C ref: uhitm.c mhitm_really_poison()
/* Helper for mhitm_ad_drst(), containing some code that is also called from
   mhitm_ad_phys() */
async function mhitm_really_poison(magr, mattk, mdef, mhm) {
    const vis = game.mhitm_vis;
    if (vis && canspotmon(magr))
        await pline(`${s_suffix(Monnam(magr))} ${mpoisons_subj(magr, mattk)} was poisoned!`);
    if (resists_poison(mdef)) {
        if (vis && canspotmon(mdef) && canspotmon(magr))
            await pline_The(`poison doesn't seem to affect ${mon_nam(mdef)}.`);
    } else {
        mhm.damage += rn1(10, 6);
        if (mhm.damage >= mdef.mhp && vis && canspotmon(mdef))
            await pline_The("poison was deadly...");
    }
}

// C ref: uhitm.c mhitm_ad_drst()
async function mhitm_ad_drst(magr, mattk, mdef, mhm) {
    const negated = mhitm_mgc_atk_negated(magr, mdef, false).negated;
    const pa = magr.data;

    if (magr === game.youmonst) {
        /* uhitm */
        if (!negated && !rn2(8)) {
            await Your(`${mpoisons_subj(magr, mattk)} was poisoned!`);
            if (resists_poison(mdef)) {
                await pline_The(`poison doesn't seem to affect ${mon_nam(mdef)}.`);
            } else {
                if (!rn2(10)) {
                    await Your("poison was deadly...");
                    mhm.damage = mdef.mhp;
                } else
                    mhm.damage += rn1(10, 6);
            }
        }
    } else if (mdef === game.youmonst) {
        /* mhitu */
        let ptmp = A_STR; /* A_STR == 0 */

        switch (mattk.adtyp) {
        case M.AD_DRST: ptmp = A_STR; break;
        case M.AD_DRDX: ptmp = A_DEX; break;
        case M.AD_DRCO: ptmp = A_CON; break;
        }
        await hitmsg(magr, mattk);
        if (!negated && !rn2(8)) {
            const buf = `${s_suffix(Monnam(magr))} ${mpoisons_subj(magr, mattk)}`;
            await poisoned(buf, ptmp, pmname(pa, Mgender(magr)), 30, false);
        }
    } else {
        /* mhitm */
        if (!negated && !rn2(8)) {
            await mhitm_really_poison(magr, mattk, mdef, mhm);
        }
    }
}

// C ref: uhitm.c mhitm_adtyping()
export async function mhitm_adtyping(magr, mattk, mdef, mhm) {
    switch (mattk.adtyp) {
    case AD_PHYS: await mhitm_ad_phys(magr, mattk, mdef, mhm); break;
    case AD_ELEC: await mhitm_ad_elec(magr, mattk, mdef, mhm); break;
    case AD_STCK: await mhitm_ad_stck(magr, mattk, mdef, mhm); break;
    case M.AD_DRST:
    case M.AD_DRDX:
    case M.AD_DRCO: await mhitm_ad_drst(magr, mattk, mdef, mhm); break;
    default:
        throw new Error(`mhitm_adtyping(): damage type ${mattk.adtyp} vs hero not ported yet`);
    }
}

// C ref: uhitm.c mhitm_knockback() -- the hero-attacker and hero-defender
// cases (monster-vs-monster is in mhitm.js); hf.hitflags is C's *hitflags
/* monster hits another monster hard enough to knock it back? */
export async function mhitm_knockback(
    magr,   /* attacker; might be hero */
    mdef,   /* defender; might be hero (only if magr isn't)  */
    mattk,  /* attack type and damage info */
    hf,     /* hf.hitflags: modified if magr or mdef dies */
    weapon_used) /* True: via weapon hit */ {
    const u = game.u;
    const knockdistance = rn2(3) ? 1 : 2; /* 67%: 1 step, 33%: 2 steps */
    let chance = 6; /* 1/6 chance of attack knocking back a monster */
    const u_agr = (magr === game.youmonst);
    const u_def = (mdef === game.youmonst);
    const wep = weapon_used ? (u_agr ? game.uwep : (magr.mw || null)) : null;

    if (!u_agr && !u_def)
        throw new Error('mhitm_knockback(): monster-vs-monster is in mhitm.js');

    if (wep && is_art(wep, ART_OGRESMASHER))
        chance = 2;

    if (rn2(chance))
        return false;

    /* only certain attacks qualify for knockback */
    if (!((mattk.adtyp === AD_PHYS)
          && (mattk.aatyp === AT_CLAW
              || mattk.aatyp === AT_KICK
              || mattk.aatyp === AT_BUTT
              || mattk.aatyp === AT_WEAP)))
        return false;

    /* don't knockback if attacker also wants to grab or engulf */
    if (attacktype(magr.data, AT_ENGL)
        || attacktype(magr.data, AT_HUGS)
        || sticks(magr.data))
        return false;

    /* decide where the first step will place the target; not accurate
       for being knocked out of saddle but doesn't need to be; used for
       test_move() and for message before actual hurtle */
    const defx = u_def ? u.ux : mdef.mx;
    const defy = u_def ? u.uy : mdef.my;
    const dx = sgn(defx - (u_agr ? u.ux : magr.mx));
    const dy = sgn(defy - (u_agr ? u.uy : magr.my));

    /* can't move most targets into or out of a doorway diagonally */
    if (u_def) {
        if (!await test_move(defx, defy, dx, dy, TEST_MOVE))
            return false;
    } else {
        /* subset of test_move() */
        if (!isok(defx + dx, defy + dy))
            return false;
        if (IS_DOOR(game.level.at(defx, defy).typ)
            && (defx - magr.mx && defy - magr.my)
            && !doorless_door(defx, defy))
            return false;
    }

    /* if hero is stuck to a cursed saddle, knock the steed back */
    if (u_def && u.usteed)
        throw new Error('mhitm_knockback(): knocking back a mounted hero not ported yet');

    /* monsters must be alive */
    if ((!u_agr && DEADMONSTER(magr))
        || (!u_def && DEADMONSTER(mdef)))
        return false;

    /* attacker must be much larger than defender */
    if (!(magr.data.msize > (mdef.data.msize + 1)))
        return false;

    /* no knockback with a flimsy or non-blunt weapon */
    if (wep && (is_flimsy(wep) || !is_blunt_weapon(wep)))
        return false;

    /* needs a solid physical hit */
    if (unsolid(magr.data))
        return false;

    /* the attack must have hit */
    /* mon-vs-mon code path doesn't set up hitflags */
    if ((u_agr || u_def) && !(hf.hitflags & M_ATTK_HIT))
        return false;

    /* steadfast defender cannot be pushed around */
    if (m_is_steadfast(mdef)) {
        if (u_def || (u.usteed && mdef === u.usteed)) {
            let mdefbuf = "";
            if (u.usteed)
                mdefbuf = `and ${y_monnam(u.usteed)} `;
            await You(`${mdefbuf}don't budge.`);
        } else if (canseemon(mdef)) {
            await pline(`${Monnam(mdef)} doesn't budge.`);
        }
        return false;
    }

    /* subtly vary the message text if monster won't actually move;
       give the message; do the actual knockback effect */
    void knockdistance;
    throw new Error('mhitm_knockback(): knockback (will_hurtle()/hurtle()/mhurtle()) not ported yet');
}

/* C ref: youprop.h Punished */
function Punished() { return !!game.uball; }
/* C ref: obj.h u_wield_art() */
function u_wield_art(art) { return !!(game.uwep && game.uwep.oartifact === art); }
/* C ref: mondata.h is_longworm() */
function is_longworm(ptr) {
    return ptr === mons[PM_LONG_WORM] || ptr === mons[PM_LONG_WORM_TAIL];
}
/* C ref: monst.h helpless() */
function helpless(mon) { return !!(mon.msleeping || !mon.mcanmove); }

// C ref: shk.c tended_shop() -- shopkeepers aren't created by the JS
// port yet
function tended_shop(sroom) {
    if (sroom.resident)
        throw new Error('tended_shop(): inhishop() not ported yet');
    return false;
}

// C ref: uhitm.c do_attack()
/* try to attack; return False if monster evaded;
   u.dx and u.dy must be set */
export async function do_attack(mtmp) {
    const u = game.u;
    const ctx = game.context;
    const mdat = mtmp.data;

    /* This section of code provides protection against accidentally
     * hitting peaceful (like '@') and tame (like 'd') monsters.
     * Protection is provided as long as player is not: blind, confused,
     * hallucinating or stunned.
     * changes by wwp 5/16/85
     * More changes 12/90, -dkh-. if its tame and safepet, (and protected
     * 07/92) then we assume that you're not trying to attack. Instead,
     * you'll usually just swap places if this is a movement command
     */
    /* Intelligent chaotic weapons (Stormbringer) want blood */
    if (is_safemon(mtmp) && !ctx.forcefight) {
        if (!u_wield_art(ART_STORMBRINGER)) {
            /* There are some additional considerations: this won't work
             * if in a shop or Punished or you miss a random roll or
             * if you can walk thru walls and your pet cannot (KAA) or
             * if your pet is a long worm with a tail.
             * There's also a chance of displacing a "frozen" monster:
             * sleeping monsters might magically walk in their sleep.
             * This block of code used to only be called for pets; now
             * that it also applies to peacefuls, non-pets mustn't be
             * forced to flee.
             */
            const foo = (Punished() || !rn2(7)
                         || (is_longworm(mtmp.data) && mtmp.wormno)
                         || (IS_OBSTRUCTED(game.level.at(u.ux, u.uy).typ)
                             && !passes_walls(mtmp.data)));
            let inshop = false;

            /* only check for in-shop if don't already have reason to stop */
            if (!foo) {
                for (const c of in_rooms(mtmp.mx, mtmp.my, SHOPBASE))
                    if (tended_shop(game.level.rooms[c.charCodeAt(0) - ROOMOFFSET])) {
                        inshop = true;
                        break;
                    }
            }
            if (inshop || foo) {
                if (!ctx.travel && !ctx.run)
                    if (canspotmon(mtmp) && mtmp.isshk)
                        throw new Error('do_attack(): dopay() not ported yet');

                if (mtmp.mtame) /* see 'additional considerations' above */
                    await monflee(mtmp, rnd(6), false, false);
                let buf = y_monnam(mtmp);
                buf = highc(buf[0]) + buf.slice(1);
                await You(`stop.  ${buf} is in the way!`);
                end_running(true);
                return true;
            } else if (mtmp.mfrozen || helpless(mtmp)
                       || (mtmp.data.mmove === 0 && rn2(6))) {
                await pline(`${Monnam(mtmp)} doesn't seem to move!`);
                end_running(true);
                return true;
            } else
                return false;
        }
    }

    /* possibly set in attack_checks;
       examined in known_hitum, called via hitum or hmonas below */
    game.override_confirmation = false;
    /* attack_checks() used to use <u.ux+u.dx,u.uy+u.dy> directly, now
       it uses gb.bhitpos instead; it might map an invisible monster there */
    game.bhitpos = { x: u.ux + u.dx, y: u.uy + u.dy };
    game.notonhead = (game.bhitpos.x !== mtmp.mx || game.bhitpos.y !== mtmp.my);
    if (await attack_checks(mtmp, game.uwep))
        return true;

    atk: {
        if (Upolyd() && noattacks(game.youmonst.data)) {
            /* certain "pacifist" monsters don't attack */
            await You("have no way to attack monsters physically.");
            mtmp.mstrategy &= ~STRAT_WAITMASK;
            break atk; /* goto atk_done */
        }

        if (await check_capacity("You cannot fight while so heavily loaded.")
            /* consume extra nutrition during combat; maybe pass out */
            || await overexertion())
            break atk; /* goto atk_done */

        if (u.twoweap && !await can_twoweapon())
            await untwoweapon();

        if (game.unweapon) {
            game.unweapon = false;
            if (game.flags.verbose) {
                if (game.uwep)
                    await You(`begin bashing monsters with ${yname(game.uwep)}.`);
                else if (!cantwield(game.youmonst.data))
                    await You(`begin ${ing_suffix(Role_if(M.PM_MONK) ? "strike" : "bash")
                              } monsters with your ${
                              game.uarmg ? "gloved" : "bare" /* Del Lamb */} ${
                              makeplural(body_part(HAND))}.`);
            }
        }
        exercise(A_STR, true); /* you're exercising muscles */
        /* andrew@orca: prevent unlimited pick-axe attacks */
        u_wipe_engr(3);

        /* Is the "it died" check actually correct? */
        if (mdat.mlet === M.S_LEPRECHAUN && !mtmp.mfrozen && !helpless(mtmp)
            && !mtmp.mconf && mtmp.mcansee && !rn2(7)
            && ((await m_move(mtmp, 0)) === MMOVE_DIED /* it died */
                || mtmp.mx !== u.ux + u.dx
                || mtmp.my !== u.uy + u.dy)) { /* it moved */
            await You("miss wildly and stumble forwards.");
            return false;
        }

        if (Upolyd())
            await hmonas(mtmp);
        else
            await hitum(mtmp, game.youmonst.data.mattk[0]);
        mtmp.mstrategy &= ~STRAT_WAITMASK;
    }

    /* atk_done: */
    /* see comment in attack_checks() */
    /* we only need to check for this if we did an attack_checks()
     * and it returned 0 (it's okay to attack), and the monster didn't
     * evade.
     */
    if (ctx.forcefight && !DEADMONSTER(mtmp) && !canspotmon(mtmp)
        && !glyph_is_invisible(game.level.at(u.ux + u.dx, u.uy + u.dy).remembered_glyph)
        && !engulfing_u(mtmp))
        map_invisible(u.ux + u.dx, u.uy + u.dy);

    return true;
}

/* C ref: youprop.h and mondata.h/obj.h predicates used below */
function uprop(p) {
    const P = game.u.uprops[p];
    return !!(P && (P.intrinsic || P.extrinsic));
}
function Upolyd() { return game.u.umonnum !== game.u.umonster; }
function Role_if(pm) { return game.urole.mnum === pm; }
function Race_if(pm) { return game.urace.mnum === pm; }
function Confusion() { return uprop(CONFUSION); }
function Stunned() { return uprop(STUNNED); }
function Protection_from_shape_changers() { return uprop(PROT_FROM_SHAPE_CHANGERS); }
function Detect_monsters() { return uprop(DETECT_MONSTERS); }
function Free_action() { return uprop(FREE_ACTION); }
function Underwater() { return !!game.u.uinwater; }
function Luck() { return (game.u.uluck || 0) + (game.u.moreluck || 0); }
function M_AP_TYPE(mon) { return (mon.m_ap_type || 0) & M_AP_TYPMASK; }
function DEADMONSTER(mon) { return mon.mhp < 1; }
function NODIAG(monnum) { return monnum === M.PM_GRID_BUG; }
function is_art(o, art) { return !!(o && o.oartifact === art); }
function martial_bonus() { return Role_if(M.PM_SAMURAI) || Role_if(M.PM_MONK); }
function hides_under(ptr) { return (ptr.mflags1 & M.M1_CONCEAL) !== 0; }
function nohands(ptr) { return (ptr.mflags1 & M.M1_NOHANDS) !== 0; }
function verysmall(ptr) { return ptr.msize < M.MZ_SMALL; }
function bigmonst(ptr) { return ptr.msize >= M.MZ_LARGE; }
function cantwield(ptr) { return nohands(ptr) || verysmall(ptr); }
function thick_skinned(ptr) { return (ptr.mflags1 & M.M1_THICK_HIDE) !== 0; }
function amorphous(ptr) { return (ptr.mflags1 & M.M1_AMORPHOUS) !== 0; }
function unsolid(ptr) { return (ptr.mflags1 & M.M1_UNSOLID) !== 0; }
function noncorporeal(ptr) { return ptr.mlet === M.S_GHOST; }
function is_whirly(ptr) {
    return ptr.mlet === M.S_VORTEX || ptr === mons[M.PM_AIR_ELEMENTAL];
}
function passes_rocks(ptr) { return passes_walls(ptr) && !unsolid(ptr); }
function is_watch(ptr) {
    return ptr === mons[M.PM_WATCHMAN] || ptr === mons[M.PM_WATCH_CAPTAIN];
}
function mon_hates_light(mon) { return mon.data === mons[M.PM_GREMLIN]; }
function is_blade(otmp) {
    return otmp.oclass === WEAPON_CLASS
        && objects[otmp.otyp].oc_skill >= P_DAGGER
        && objects[otmp.otyp].oc_skill <= P_SABER;
}
function is_axe(otmp) {
    return (otmp.oclass === WEAPON_CLASS || otmp.oclass === TOOL_CLASS)
           && objects[otmp.otyp].oc_skill === P_AXE;
}
function is_shield(otmp) {
    return otmp.oclass === ARMOR_CLASS
           && objects[otmp.otyp].oc_armcat === ARM_SHIELD;
}
function is_flimsy(otmp) {
    return objects[otmp.otyp].oc_material <= LEATHER
           || otmp.otyp === RUBBER_HOSE;
}
function is_blunt_weapon(o) {
    return (o.oclass === WEAPON_CLASS || is_weptool(o))
           && (objects[o.otyp].oc_dir & WHACK) !== 0;
}
function is_poisonable(otmp) {
    return (otmp.oclass === WEAPON_CLASS
            && objects[otmp.otyp].oc_skill >= -P_SHURIKEN
            && objects[otmp.otyp].oc_skill <= -P_BOW)
           || permapoisoned(otmp);
}
function stone_missile(o) {
    return (objects[o.otyp].oc_material === GEMSTONE
            || objects[o.otyp].oc_material === MINERAL)
           && o.oclass !== RING_CLASS;
}
function greatest_erosion(otmp) {
    const e1 = otmp.oeroded || 0, e2 = otmp.oeroded2 || 0;
    return e1 > e2 ? e1 : e2;
}
/* C ref: artifact.c artifact_light() */
function artifact_light(obj) {
    if (obj && (obj.otyp === GOLD_DRAGON_SCALE_MAIL
                || obj.otyp === GOLD_DRAGON_SCALES)
        && ((obj.owornmask || 0) & W_ARM) !== 0)
        return true;
    return !!(obj && obj.oartifact) && is_art(obj, ART_SUNSWORD);
}
/* C ref: monst.h troll_baned() */
function troll_baned(m, o) {
    return m.data.mlet === M.S_TROLL && !!o && o.oartifact === ART_TROLLSBANE;
}
/* C ref: objnam.c cxname() */
function cxname(obj) {
    if (obj.otyp === CORPSE)
        throw new Error('cxname(): corpse_xname() not ported yet');
    return xname(obj);
}

// C ref: uhitm.c attack_checks()
/* FALSE means it's OK to attack */
export async function attack_checks(
    mtmp, /* target */
    wep) /* uwep for do_attack(), null for kick_monster() */ {
    const u = game.u;
    let glyph;

    /* if you're close enough to attack, alert any waiting monster */
    mtmp.mstrategy &= ~STRAT_WAITMASK;

    if (engulfing_u(mtmp))
        return false;

    if (game.context.forcefight) {
        /* Do this in the caller, after we have checked that the monster
         * didn't die from the blow.  Reason: putting the 'I' there
         * causes the hero to forget the square's contents since
         * both 'I' and remembered contents are stored in .glyph.
         * If the monster dies immediately from the blow, the 'I' will
         * not stay there, so the player will have suddenly forgotten
         * the square's contents for no apparent reason.
        if (!canspotmon(mtmp)
            && !glyph_is_invisible(levl[gb.bhitpos.x][gb.bhitpos.y].glyph))
            map_invisible(gb.bhitpos.x, gb.bhitpos.y);
         */
        return false;
    }

    /* cache the shown glyph;
       cases which might change it (by placing or removing
       'remembered, unseen monster' glyph or revealing a mimic)
       always return without further reference to this */
    glyph = glyph_at(game.bhitpos.x, game.bhitpos.y);

    /* Put up an invisible monster marker, but with exceptions for
     * monsters that hide and monsters you've been warned about.
     * The former already prints a warning message and
     * prevents you from hitting the monster just via the hidden monster
     * code below; if we also did that here, similar behavior would be
     * happening two turns in a row.  The latter shows a glyph on
     * the screen, so you know something is there.
     */
    if (!canspotmon(mtmp)
        && !glyph_is_warning(glyph) && !glyph_is_invisible(glyph)
        && !(!Blind() && mtmp.mundetected && hides_under(mtmp.data))) {
        await pline("Wait!  There's something there you can't see!");
        map_invisible(game.bhitpos.x, game.bhitpos.y);
        /* if it was an invisible mimic, treat it as if we stumbled
         * onto a visible mimic
         */
        if (M_AP_TYPE(mtmp) && !Protection_from_shape_changers()) {
            if (!u.ustuck && !mtmp.mflee && dmgtype(mtmp.data, AD_STCK)
                /* applied pole-arm attack is too far to get stuck */
                && m_next2u(mtmp))
                set_ustuck(mtmp);
        }
        /* #H7329 - if hero is on engraved "Elbereth", this will end up
         * assessing an alignment penalty and removing the engraving
         * even though no attack actually occurs.  Since it also angers
         * peacefuls, we're operating as if an attack attempt did occur
         * and the Elbereth behavior is consistent.
         */
        await wakeup(mtmp, true); /* always necessary; also un-mimics mimics */
        return true;
    }

    if (M_AP_TYPE(mtmp) && !Protection_from_shape_changers() && !sensemon(mtmp)
        && !glyph_is_warning(glyph)) {
        /* If a hidden mimic was in a square where a player remembers
         * some (probably different) unseen monster, the player is in
         * luck--he attacks it even though it's hidden.
         */
        if (glyph_is_invisible(glyph)) {
            seemimic(mtmp);
            return false;
        }
        await stumble_onto_mimic(mtmp);
        return true;
    }

    if (mtmp.mundetected && !canseemon(mtmp)
        && !glyph_is_warning(glyph)
        && (hides_under(mtmp.data) || mtmp.data.mlet === M.S_EEL)) {
        mtmp.mundetected = mtmp.msleeping = 0;
        newsym(mtmp.mx, mtmp.my);
        if (glyph_is_invisible(glyph)) {
            seemimic(mtmp);
            return false;
        }
        if (!tp_sensemon(mtmp) && !Detect_monsters()) {
            let obj;
            const lmonbuf = l_monnam(mtmp);
            /* might be unseen if invisible and hero can't see invisible */
            const notseen = (lmonbuf === "it"); /* note: not strcmpi() */

            if (!Blind() && Hallucination())
                await pline(`A ${mtmp.mtame ? "tame" : "wild"} ${
                    notseen ? "creature" : lmonbuf} ${
                    notseen ? "is present" : "appears"}!`);
            else if (Blind() || (is_pool(mtmp.mx, mtmp.my) && !Underwater()))
                await pline("Wait!  There's a hidden monster there!");
            else if ((obj = vobj_at(mtmp.mx, mtmp.my)) != null) /* svl.level.objects[][] */
                await pline(`Wait!  There's ${notseen ? "something" : an(lmonbuf)
                            } hiding under ${doname(obj)}!`);
            return true;
        }
    }

    /*
     * make sure to wake up a monster from the above cases if the
     * hero can sense that the monster is there.
     */
    if ((mtmp.mundetected || M_AP_TYPE(mtmp)) && sensemon(mtmp)) {
        mtmp.mundetected = 0;
        await wakeup(mtmp, true);
    }

    if (game.flags.confirm && mtmp.mpeaceful
        && !Confusion() && !Hallucination() && !Stunned()) {
        /* Intelligent chaotic weapons (Stormbringer) want blood */
        if (is_art(wep, ART_STORMBRINGER)) {
            game.override_confirmation = true;
            return false;
        }
        if (canspotmon(mtmp)) {
            const qbuf = `Really attack ${mon_nam(mtmp)}?`;

            if (!await paranoid_query(((game.flags.paranoia_bits || 0)
                                       & PARANOID_HIT) !== 0 /* ParanoidHit */,
                                      qbuf)) {
                game.context.move = 0;
                return true;
            }
        }
    }

    return false;
}

// C ref: uhitm.c that_is_a_mimic()
/* used by stumble_onto_mimic() and bhitm() cases WAN_LOCKING, WAN_OPENING */
export async function that_is_a_mimic(
    mtmp, /* a hidden mimic (nonnull) */
    mimic_flags) { /* 0, MIM_REVEAL, MIM_OMIT_WAIT, REVEAL+OMIT */
    const generic = "a monster";
    /* fmtbuf, with '%s' where 'what' goes */
    let fmtbuf;
    let what = null;
    const reveal_it = (mimic_flags & MIM_REVEAL) !== 0,
        omit_wait = (mimic_flags & MIM_OMIT_WAIT) !== 0;

    fmtbuf = "Wait!  That's %s!";
    if (Blind()) {
        if (!uprop(TELEPAT)) /* !Blind_telepat */
            what = generic; /* with default fmt */
        else if (M_AP_TYPE(mtmp) === M_AP_MONSTER)
            what = a_monnam(mtmp); /* differs from what was sensed */
    } else {
        const x = mtmp.mx, y = mtmp.my;
        const glyph = glyph_at(x, y);

        if (glyph.kind === 'cmap' || glyph.kind === 'trap') { /* glyph_is_cmap() */
            if (M_AP_TYPE(mtmp) === M_AP_FURNITURE
                || (M_AP_TYPE(mtmp) === M_AP_OBJECT && glyph.kind === 'trap')) {
                /* sym = glyph_to_cmap(glyph); the M_AP_OBJECT case needs
                   sym == S_trapped_chest */
                const sym = glyph.cmapidx;
                if (sym === undefined || glyph.kind === 'trap')
                    throw new Error('that_is_a_mimic(): glyph_to_cmap() of this glyph not ported yet');
                fmtbuf = `That ${defsyms_explanation[sym]} actually is %s!`;
            }
        } else if (glyph.kind === 'obj') { /* glyph_is_object() */
            const { fakeobj, otmp } = object_from_map(glyph, x, y);
            const otmp_name = (otmp && otmp.otyp !== STRANGE_OBJECT)
                              ? simpleonames(otmp) : "strange object";

            fmtbuf = `${(otmp && otmp.quan !== 1 /* is_plural() */) ? "Those" : "That"
                     } ${otmp_name} ${otmp ? otense(otmp, "are") : "is"} %s!`;
            if (fakeobj && otmp) {
                otmp.where = 'OBJ_FREE'; /* object_from_map set to OBJ_FLOOR */
                /* dealloc_obj(otmp): JS garbage-collects it */
            }
        } else if (glyph.kind === 'mon') { /* glyph_is_monster() */
            const mndx = glyph.mndx; /* glyph_to_mon() */

            if (mndx === undefined)
                throw new Error('that_is_a_mimic(): glyph_to_mon() of this glyph not ported yet');
            const mtmp_name = pmname(mons[mndx], Mgender(mtmp));
            fmtbuf = `Wait!  That ${mtmp_name} is really %s!`;
        }

        /* cloned Wiz starts out mimicking some other monster and
           might make himself invisible before being revealed */
        if (mtmp.minvis && !uprop(SEE_INVIS)) /* !See_invisible */
            what = generic;
        else if (M_AP_TYPE(mtmp) === M_AP_MONSTER)
            what = x_monnam(mtmp, ARTICLE_A, null, EXACT_NAME, true);
        else if (mtmp.data.mlet === M.S_MIMIC
                 && (M_AP_TYPE(mtmp) === M_AP_OBJECT
                     || M_AP_TYPE(mtmp) === M_AP_FURNITURE)
                 && (mtmp.msleeping || mtmp.mfrozen))
            /* BUG: this will misclassify a paralyzed mimic as sleeping */
            what = x_monnam(mtmp, ARTICLE_A, "sleeping", 0, false);
        else
            what = a_monnam(mtmp);
    }

    if (what) {
        const i = (omit_wait && fmtbuf.startsWith("Wait!  ")) ? 7 : 0;

        await pline(fmtbuf.slice(i).replace('%s', () => what));
    }
    if (reveal_it)
        seemimic(mtmp);
}

// C ref: uhitm.c stumble_onto_mimic()
/* Note: caller must ascertain mtmp is mimicking... */
export async function stumble_onto_mimic(mtmp) {
    const u = game.u;

    await that_is_a_mimic(mtmp, MIM_REVEAL);

    if (!u.ustuck && !mtmp.mflee && dmgtype(mtmp.data, AD_STCK)
        /* must be adjacent; attack via polearm could be from farther away */
        && m_next2u(mtmp))
        set_ustuck(mtmp);

    await wakeup(mtmp, false); /* clears mimicking */
    /* if hero is blind, wakeup() won't display the monster even though
       it's no longer concealed */
    if (!canspotmon(mtmp)
        && !glyph_is_invisible(game.level.at(mtmp.mx, mtmp.my).remembered_glyph))
        map_invisible(mtmp.mx, mtmp.my);
}

// C ref: uhitm.c check_caitiff()
/* it is unchivalrous for a knight to attack the defenseless or from behind */
export async function check_caitiff(mtmp) {
    const u = game.u;
    if (u.ualign.record <= -10)
        return;

    if (Role_if(M.PM_KNIGHT) && u.ualign.type === A_LAWFUL
        && !is_undead(mtmp.data)
        && (helpless(mtmp)
            || (mtmp.mflee && !mtmp.mavenge))) {
        await You("caitiff!");
        adjalign(-1);
    } else if (Role_if(M.PM_SAMURAI) && mtmp.mpeaceful) {
        /* attacking peaceful creatures is bad for the samurai's giri */
        await You("dishonorably attack the innocent!");
        adjalign(-1);
    }
}

// C ref: uhitm.c mon_maybe_unparalyze()
/* maybe unparalyze monster */
export function mon_maybe_unparalyze(mtmp) {
    if (!mtmp.mcanmove) {
        if (!rn2(10)) {
            mtmp.mcanmove = 1;
            mtmp.mfrozen = 0;
        }
    }
}

// C ref: uhitm.c find_roll_to_hit()
/* how easy it is for hero to hit a monster,
   using attack type aatyp and/or weapon.
   larger value == easier to hit */
export async function find_roll_to_hit(
    mtmp,
    aatyp,              /* usually AT_WEAP or AT_KICK */
    weapon,             /* uwep or uswapwep or NULL */
    attk_count,         /* { val } */
    role_roll_penalty) /* { val } */ {
    const u = game.u;
    let tmp, tmp2;

    role_roll_penalty.val = 0; /* default is `none' */

    tmp = 1 + abon() + find_mac(mtmp) + (u.uhitinc || 0)
          + (sgn(Luck()) * Math.trunc((Math.abs(Luck()) + 2) / 3))
          + (Upolyd() ? game.youmonst.data.mlevel : u.ulevel);

    /* some actions should occur only once during multiple attacks */
    if (!(attk_count.val++)) {
        /* knight's chivalry or samurai's giri */
        await check_caitiff(mtmp);
    }

    /* adjust vs. monster state */
    if (mtmp.mstun)
        tmp += 2;
    if (mtmp.mflee)
        tmp += 2;
    if (mtmp.msleeping)
        tmp += 2;
    if (!mtmp.mcanmove)
        tmp += 4;

    /* role/race adjustments */
    if (Role_if(M.PM_MONK) && !Upolyd()) {
        if (game.uarm)
            tmp -= (role_roll_penalty.val = game.urole.spelarmr);
        else if (!game.uwep && !game.uarms)
            tmp += Math.trunc(u.ulevel / 3) + 2;
    }
    if (is_orc(mtmp.data)
        && (Upolyd() ? is_elf(game.youmonst.data) : Race_if(M.PM_ELF)))
        tmp++;

    /* encumbrance: with a lot of luggage, your agility diminishes */
    if ((tmp2 = near_capacity()) !== 0)
        tmp -= (tmp2 * 2) - 1;
    if (u.utrap)
        tmp -= 3;

    /*
     * hitval applies if making a weapon attack while wielding a weapon;
     * weapon_hit_bonus applies if doing a weapon attack even bare-handed
     * or if kicking as martial artist
     */
    if (aatyp === AT_WEAP || aatyp === AT_CLAW) {
        if (weapon)
            tmp += hitval(weapon, mtmp);
        tmp += weapon_hit_bonus(weapon);
    } else if (aatyp === AT_KICK && martial_bonus()) {
        tmp += weapon_hit_bonus(null);
    }

    return tmp;
}

// C ref: uhitm.c known_hitum()
/* really hit target monster; returns TRUE if it still lives */
async function known_hitum(
    mon,          /* target */
    weapon,       /* uwep or uswapwep */
    mhit,         /* { val }: 1 or 0; hit (1) gets changed to miss (0)
                   * for decapitation attack against headless target */
    rollneeded,   /* rollneeded and armorpenalty are used for monks  +*/
    armorpenalty, /*+ wearing suits so miss message can vary for missed
                   *  because of penalty vs would have missed anyway  */
    uattk,
    dieroll) {
    const u = game.u;
    let malive = true;
    /* hmon() might destroy weapon; remember aspect for cutworm */
    const slice_or_chop = (weapon && (is_blade(weapon) || is_axe(weapon)));

    if (game.override_confirmation) {
        /* this may need to be generalized if weapons other than
           Stormbringer acquire similar anti-social behavior... */
        if (game.flags.verbose)
            await Your("bloodthirsty blade attacks!");
    }

    if (!mhit.val) {
        await missum(mon, uattk, (rollneeded + armorpenalty > dieroll));
    } else {
        const oldhp = mon.mhp;
        const oldweaphit = u.uconduct.weaphit || 0;

        /* KMH, conduct */
        if (weapon && (weapon.oclass === WEAPON_CLASS || is_weptool(weapon)))
            u.uconduct.weaphit = oldweaphit + 1;

        /* we hit the monster; be careful: it might die or
           be knocked into a different location */
        game.notonhead = (mon.mx !== game.bhitpos.x || mon.my !== game.bhitpos.y);
        malive = await hmon(mon, weapon, HMON_MELEE, dieroll);
        if (malive) {
            /* monster still alive */
            if (!rn2(25) && mon.mhp < Math.trunc(mon.mhpmax / 2)
                && !engulfing_u(mon)) {
                /* maybe should regurgitate if swallowed? */
                await monflee(mon, !rn2(3) ? rnd(100) : 0, false, true);

                if (u.ustuck === mon && !u.uswallow
                    && !sticks(game.youmonst.data))
                    set_ustuck(null);
            }
            /* Vorpal Blade hit converted to miss */
            /* could be headless monster or worm tail */
            if (mon.mhp === oldhp) {
                mhit.val = 0;
                /* a miss does not break conduct */
                u.uconduct.weaphit = oldweaphit;
            }
            if (mon.wormno && mhit.val)
                await cutworm(mon, game.bhitpos.x, game.bhitpos.y, slice_or_chop);
        }
    }
    return malive;
}

// C ref: uhitm.c hitum_cleave()
async function hitum_cleave(target, uattk) {
    void target; void uattk;
    throw new Error('hitum_cleave(): not ported yet');
}

// C ref: uhitm.c double_punch()
/* returns True if hero is fighting without a weapon and without a shield and
   has sufficient skill in bare-handed/martial arts to attack twice */
function double_punch() {
    /* note: P_BARE_HANDED_COMBAT and P_MARTIAL_ARTS are equivalent */
    const skl_lvl = P_SKILL(P_BARE_HANDED_COMBAT);

    /*
     * Chance to attempt a second bare-handed or martial arts hit:
     *  restricted  (0),        [not applicable; no one is restricted]
     *  unskilled   (1) :  0%
     *  basic       (2) :  0%
     *  skilled     (3) : 20%
     *  expert      (4) : 40%
     *  master      (5) : 60%
     *  grandmaster (6) : 80%
     */
    if (!game.uwep && !game.uarms && skl_lvl > P_BASIC)
        return (skl_lvl - P_BASIC) > rn2(5);
    return false;
}

// C ref: uhitm.c hitum()
/* hit target monster; returns TRUE if it still lives */
async function hitum(mon, uattk) {
    const u = game.u;
    let malive, wep_was_destroyed = false;
    const wepbefore = game.uwep,
        secondwep = u.twoweap ? game.uswapwep : null;
    let tmp, dieroll;
    const mhit = { val: 0 }, armorpenalty = { val: 0 }, attknum = { val: 0 };
    const x = u.ux + u.dx, y = u.uy + u.dy, oldumort = u.umortality;

    /* Cleaver attacks three spots, 'mon' and one on either side of 'mon';
       it can't be part of dual-wielding but we guard against that anyway;
       cleave return value reflects status of primary target ('mon') */
    if (u_wield_art(ART_CLEAVER) && !u.twoweap
        && !u.uswallow && !u.ustuck && !NODIAG(u.umonnum))
        return await hitum_cleave(mon, uattk);

    /* 0: single hit, 1: first of two hits; affects strength bonus and
       silver rings; known_hitum() -> hmon() -> hmon_hitmon() will copy
       gt.twohits into struct _hitmon_data hmd.twohits */
    game.twohits = (game.uwep ? u.twoweap : double_punch()) ? 1 : 0;

    tmp = await find_roll_to_hit(mon, uattk.aatyp, game.uwep, attknum,
                                 armorpenalty);
    mon_maybe_unparalyze(mon);
    dieroll = rnd(20);
    mhit.val = (tmp > dieroll || u.uswallow) ? 1 : 0;
    if (tmp > dieroll)
        exercise(A_DEX, true);

    /* gb.bhitpos is set up by caller */
    malive = await known_hitum(mon, game.uwep, mhit, tmp, armorpenalty.val,
                               uattk, dieroll);
    if (wepbefore && !game.uwep)
        wep_was_destroyed = true;
    await passive(mon, game.uwep, mhit.val, malive, AT_WEAP, wep_was_destroyed);

    /* second attack for two-weapon combat or skilled unarmed combat;
       won't occur if Stormbringer overrode confirmation (assumes
       Stormbringer is primary weapon), or if hero became paralyzed by
       passive counter-attack, or if hero was killed by passive
       counter-attack and got life-saved, or if monster was killed or
       knocked to different location */
    if (game.twohits && !(game.override_confirmation
                          || game.multi < 0 || u.umortality > oldumort
                          || !malive || m_at(x, y) !== mon)) {
        game.twohits = 2; /* second of 2 hits */
        tmp = await find_roll_to_hit(mon, uattk.aatyp, game.uswapwep, attknum,
                                     armorpenalty);
        mon_maybe_unparalyze(mon);
        dieroll = rnd(20);
        mhit.val = (tmp > dieroll || u.uswallow) ? 1 : 0;
        malive = await known_hitum(mon, secondwep, mhit, tmp, armorpenalty.val,
                                   uattk, dieroll);
        /* second passive counter-attack only occurs if second attack hits */
        if (mhit.val)
            await passive(mon, secondwep, mhit.val, malive, AT_WEAP,
                          secondwep && !game.uswapwep);
    }
    game.twohits = 0;
    return malive;
}

// C ref: uhitm.c hmon()
/* general "damage monster" routine; return True if mon still alive */
export async function hmon(mon, obj,
                           thrown, /* HMON_xxx (0 => hand-to-hand, other => ranged) */
                           dieroll) {
    const anger_guards = (mon.mpeaceful
                          && (mon.ispriest || mon.isshk || is_watch(mon.data)));
    const result = await hmon_hitmon(mon, obj, thrown, dieroll);
    if (mon.ispriest && !rn2(2))
        throw new Error('hmon(): ghod_hitsu() not ported yet');
    if (anger_guards)
        throw new Error('hmon(): angry_guards() not ported yet');
    return result;
}

// C ref: uhitm.c hmon_hitmon_barehands()
/* hero hits monster bare handed */
function hmon_hitmon_barehands(hmd, mon) {
    let spcdmgflg;
    const silverhit = { val: 0 }; /* worn masks */

    if (hmd.mdat === mons[M.PM_SHADE]) {
        hmd.dmg = 0;
    } else {
        /* note: 1..2 or 1..4 can be substantially increased by
           strength bonus or skill bonus, usually both... */
        hmd.dmg = rnd(!martial_bonus() ? 2 : 4);
        hmd.use_weapon_skill = true;
        hmd.train_weapon_skill = (hmd.dmg > 1);
    }

    /* Blessed gloves give bonuses when fighting 'bare-handed'.  So do
       silver rings.  Note:  rings are worn under gloves, so you don't
       get both bonuses, and two silver rings don't give double bonus.
       When making only one hit, both rings are checked (backwards
       compatibility => playability), but when making two hits, only the
       ring on the hand making the attack is checked. */
    spcdmgflg = game.uarmg ? W_ARMG
              : (((hmd.twohits === 0 || hmd.twohits === 1) ? W_RINGR : 0)
                 | ((hmd.twohits === 0 || hmd.twohits === 2) ? W_RINGL : 0));
    hmd.dmg += special_dmgval(game.youmonst, mon, spcdmgflg, silverhit);

    /* copy silverhit info back into struct _hitmon_data *hmd */
    switch (hmd.twohits) {
    case 0: /* only one hit being attempted; a silver ring on either hand
             * applies but having silver rings on both is same as just one */
        hmd.barehand_silver_rings = (silverhit.val & (W_RINGR | W_RINGL)) ? 1 : 0;
        break;
    case 1: /* first of two or more hit attempts; right ring applies */
        hmd.barehand_silver_rings = (silverhit.val & W_RINGR) ? 1 : 0;
        break;
    case 2: /* second of two or more hit attempts; left ring applies */
        hmd.barehand_silver_rings = (silverhit.val & W_RINGL) ? 1 : 0;
        break;
    default: /* third or later of more than two hit attempts (poly'd hero);
              * rings were applied on first and second hits */
        hmd.barehand_silver_rings = 0;
        break;
    }
    if (hmd.barehand_silver_rings > 0)
        hmd.silvermsg = true;
}

// C ref: uhitm.c hmon_hitmon_weapon_ranged()
function hmon_hitmon_weapon_ranged(hmd, mon, obj) /* obj is not NULL */ {
    /* then do only 1-2 points of damage and don't use or
       train weapon's skill */
    if (hmd.mdat === mons[M.PM_SHADE] && !shade_glare(obj))
        hmd.dmg = 0;
    else
        hmd.dmg = rnd(2);
    if (hmd.material === SILVER && mon_hates_silver(mon)) {
        hmd.silvermsg = hmd.silverobj = true;
        /* if it will already inflict dmg, make it worse */
        hmd.dmg += rnd((hmd.dmg) ? 20 : 10);
    }
    if (!hmd.thrown && obj === game.uwep && obj.otyp === BOOMERANG
        && rnl(4) === 4 - 1)
        throw new Error('hmon_hitmon_weapon_ranged(): boomerang breaking not ported yet');
}

/* C ref: artifact.c shade_glare() */
function shade_glare(obj) {
    /* silver is hurtful to shades */
    if (objects[obj.otyp].oc_material === SILVER)
        return true;
    /* any lit artifact light source will do */
    if (artifact_light(obj) && obj.lamplit)
        return true;
    return false;
}

// C ref: uhitm.c backstabbable()
/* can monster be stabbed in the back? */
function backstabbable(mon) {
    return !amorphous(mon.data)
        && !is_whirly(mon.data)
        && !noncorporeal(mon.data)
        && mon.data.mlet !== M.S_BLOB
        && mon.data.mlet !== M.S_EYE
        && mon.data.mlet !== M.S_FUNGUS
        && canseemon(mon)
        && (mon.mflee || helpless(mon));
}

// C ref: uhitm.c hmon_hitmon_weapon_melee()
async function hmon_hitmon_weapon_melee(hmd, mon, obj) /* obj is not NULL */ {
    const u = game.u;
    let wtype;
    let monwep;

    /* "normal" weapon usage */
    hmd.use_weapon_skill = true;
    hmd.dmg = dmgval(obj, mon);
    /* a minimal hit doesn't exercise proficiency */
    hmd.train_weapon_skill = (hmd.dmg > 1);

    /* Healer with anatomy knowledge */
    if (Role_if(M.PM_HEALER) && hmd.hand_to_hand
        && obj.oclass === WEAPON_CLASS
        && objects[obj.otyp].oc_skill === P_KNIFE)
        hmd.dmg += Math.min(3, Math.trunc(game.mvitals[monsndx(mon.data)].died / 6));

    /* special attack actions */
    if (!hmd.train_weapon_skill || mon === u.ustuck || u.twoweap
        /* Cleaver can hit up to three targets at once so don't
           let it also hit from behind or shatter foes' weapons */
        || (hmd.hand_to_hand && is_art(obj, ART_CLEAVER))) {
        ; /* no special bonuses */
    } else if (Role_if(M.PM_ROGUE) && backstabbable(mon) && !Upolyd()
               /* multi-shot throwing is too powerful here */
               && hmd.hand_to_hand) {
        await You(`strike ${mon_nam(mon)} from behind!`);
        hmd.dmg += rnd(u.ulevel);
        hmd.hittxt = true;
    } else if (hmd.dieroll === 2 && obj === game.uwep
               && obj.oclass === WEAPON_CLASS
               && (bimanual(obj)
                   || (Role_if(M.PM_SAMURAI) && obj.otyp === KATANA
                       && !game.uarms))
               && ((wtype = uwep_skill_type()) !== P_NONE
                   && P_SKILL(wtype) >= P_SKILLED)
               && ((monwep = (mon.mw || null)) != null
                   && !is_flimsy(monwep)
                   && !obj_resists(monwep,
                                   50 + 15 * (greatest_erosion(obj)
                                              - greatest_erosion(monwep)),
                                   100))) {
        /*
         * 2.5% chance of shattering defender's weapon when
         * using a two-handed weapon; less if uwep is rusted.
         * [dieroll == 2 is most successful non-beheading or
         * -bisecting hit, in case of special artifact damage;
         * the percentage chance is (1/20)*(50/100).]
         * If attacker's weapon is rustier than defender's,
         * the obj_resists chance is increased so the shatter
         * chance is decreased; if less rusty, then vice versa.
         */
        throw new Error('hmon_hitmon_weapon_melee(): shattering the defender\'s weapon not ported yet');
    }

    if (obj.oartifact)
        throw new Error('hmon_hitmon_weapon_melee(): artifact_hit() not ported yet');
    if (hmd.material === SILVER && mon_hates_silver(mon)) {
        hmd.silvermsg = hmd.silverobj = true;
    }
    if (artifact_light(obj) && obj.lamplit
        && mon_hates_light(mon))
        hmd.lightobj = true;
    if (u.usteed && !hmd.thrown && hmd.dmg > 0
        && weapon_type(obj) === P_LANCE && mon !== u.ustuck)
        throw new Error('hmon_hitmon_weapon_melee(): joust() not ported yet');
    if (hmd.thrown === HMON_THROWN
        && (is_ammo(obj) || is_missile(obj))) {
        if (ammo_and_launcher(obj, game.uwep)) {
            /* elves and samurai do extra damage using their own
               bows with their own arrows; they're highly trained */
            if (Role_if(M.PM_SAMURAI) && obj.otyp === YA
                && game.uwep.otyp === YUMI)
                hmd.dmg++;
            else if (Race_if(M.PM_ELF) && obj.otyp === ELVEN_ARROW
                     && game.uwep.otyp === ELVEN_BOW)
                hmd.dmg++;
            hmd.train_weapon_skill = (hmd.dmg > 0);
        }
        if (obj.opoisoned && is_poisonable(obj))
            hmd.ispoisoned = true;
    }
    /* permapoisoned is non-ammo/missile, limit the poison */
    if (permapoisoned(obj) && hmd.dieroll <= 5)
        hmd.ispoisoned = true;
}

// C ref: uhitm.c hmon_hitmon_weapon()
async function hmon_hitmon_weapon(hmd, mon, obj) /* obj is not NULL */ {
    /* is it not a melee weapon? */
    if (/* if you strike with a bow... */
        is_launcher(obj)
        /* or strike with a missile in your hand... */
        || (!hmd.thrown && (is_missile(obj) || is_ammo(obj)))
        /* or use a pole at short range and not mounted... */
        || (!hmd.thrown && !game.u.usteed && is_pole(obj)
            && !is_art(obj, ART_SNICKERSNEE))
        /* or throw a missile without the proper bow... */
        || (is_ammo(obj) && (hmd.thrown !== HMON_THROWN
                             || !ammo_and_launcher(obj, game.uwep)))) {
        hmon_hitmon_weapon_ranged(hmd, mon, obj);
    } else {
        await hmon_hitmon_weapon_melee(hmd, mon, obj);
        if (hmd.doreturn)
            return;
    }
}

// C ref: uhitm.c hmon_hitmon_do_hit()
/* do the actual hitting monster with obj/fists */
async function hmon_hitmon_do_hit(hmd, mon, obj) /* obj can be NULL */ {
    if (!obj) { /* attack with bare hands */
        hmon_hitmon_barehands(hmd, mon);
    } else {
        /* stone missile does not hurt xorn or earth elemental, but doesn't
           pass all the way through and continue on to some further target */
        if ((hmd.thrown === HMON_THROWN
             || hmd.thrown === HMON_KICKED) /* not Applied */
            && stone_missile(obj) && passes_rocks(hmd.mdat))
            throw new Error('hmon_hitmon_do_hit(): stone missile vs. rock passer not ported yet');
        /* remember obj's name since it might end up being destroyed and
           we'll want to use it after that */
        if (!(artifact_light(obj) && obj.lamplit))
            hmd.saved_oname = cxname(obj);
        else
            hmd.saved_oname = bare_artifactname(obj);

        if (obj.oclass === WEAPON_CLASS || is_weptool(obj)
            || obj.oclass === GEM_CLASS) {
            await hmon_hitmon_weapon(hmd, mon, obj);
            if (hmd.doreturn)
                return;
        /* attacking with non-weapons */
        } else if (obj.oclass === POTION_CLASS) {
            throw new Error('hmon_hitmon_do_hit(): hmon_hitmon_potion() not ported yet');
        } else {
            if (hmd.mdat === mons[M.PM_SHADE] && !shade_aware(obj)) {
                hmd.dmg = 0;
            } else {
                throw new Error('hmon_hitmon_do_hit(): hmon_hitmon_misc_obj() not ported yet');
            }
        }
    }
}

// C ref: uhitm.c hmon_hitmon_dmg_recalc()
async function hmon_hitmon_dmg_recalc(hmd, obj) {
    let dmgbonus = 0, strbonus, absbonus;

    /*
     * Potential bonus (or penalty) from worn ring of increase damage
     * (or intrinsic bonus from eating same) or from strength.  Strength
     * bonus is increased for melee with two-handed weapons and decreased
     * for dual attacks (but when both hit, the total for the two is more
     * than the bonus for a regular single hit).
     */
    if (hmd.get_dmg_bonus) {
        /* for dual attacks, udaminc applies to both, and two-handed
           weapons use it as-is */
        dmgbonus = game.u.udaminc || 0;
        /* throwing using a propellor gets an increase-damage bonus
           but not a strength one; other attacks get both;
           for dual attacks, 3/4 of the strength bonus is used; when
           both attacks hit, overall bonus is 3/2 rather than doubled;
           melee hit with two-handed weapon uses 3/2 strength bonus to
           approximately match double hit with two-weapon ('approximate'
           because udaminc skews in favor of two-weapon); the 3/2 factor
           for two-handed strength does not apply to polearms unless
           hero is simply bashing with one of those and does not apply
           to jousting because lances are one-handed */
        if (hmd.thrown !== HMON_THROWN
            || !obj || !game.uwep || !ammo_and_launcher(obj, game.uwep)) {
            strbonus = dbon();
            absbonus = Math.abs(strbonus);
            if (hmd.twohits)
                strbonus = Math.trunc((3 * absbonus + 2) / 4) * sgn(strbonus);
            else if (hmd.thrown === HMON_MELEE && game.uwep && bimanual(game.uwep))
                strbonus = Math.trunc((3 * absbonus + 1) / 2) * sgn(strbonus);
            dmgbonus += strbonus;
        }
    }

    /*
     * Potential bonus (or penalty) from weapon skill.
     * 'use_weapon_skill' is True for hand-to-hand ordinary weapon,
     * applied or jousting polearm or lance, thrown missile (dart,
     * shuriken, boomerang), or shot ammo (arrow, bolt, rock/gem when
     * wielding corresponding launcher).
     * It is False for hand-to-hand or thrown non-weapon, hand-to-hand
     * polearm or lance when not mounted, hand-to-hand missile or ammo
     * or launcher, thrown non-missile, or thrown ammo (including rocks)
     * when not wielding corresponding launcher.
     */
    if (hmd.use_weapon_skill) {
        let skillwep = obj;

        if (obj && is_ammo(obj) /* PROJECTILE(obj) */
            && ammo_and_launcher(obj, game.uwep))
            skillwep = game.uwep;
        dmgbonus += weapon_dam_bonus(skillwep);

        /* hit for more than minimal damage (before being adjusted
           for damage or skill bonus) trains the skill toward future
           enhancement */
        if (hmd.train_weapon_skill) {
            /* [this assumes that `!thrown' implies wielded...] */
            const wtype = hmd.thrown ? weapon_type(skillwep)
                                     : uwep_skill_type();
            await use_skill(wtype, 1);
        }
    }

    /* apply combined damage+strength and skill bonuses */
    hmd.dmg += dmgbonus;
    /* don't let penalty, if bonus is negative, turn a hit into a miss */
    if (hmd.dmg < 1)
        hmd.dmg = 1;
}

// C ref: uhitm.c hmon_hitmon_poison()
async function hmon_hitmon_poison(hmd, mon, obj) /* obj is not NULL */ {
    const u = game.u;
    let nopoison = (10 - Math.trunc(obj.owt / 10));

    if (nopoison < 2)
        nopoison = 2;
    if (Role_if(M.PM_SAMURAI)) {
        await You("dishonorably use a poisoned weapon!");
        adjalign(-sgn(u.ualign.type));
    } else if (u.ualign.type === A_LAWFUL && u.ualign.record > -10) {
        await You("feel like an evil coward for using a poisoned weapon.");
        adjalign(-1);
    }
    if (!permapoisoned(obj) && !rn2(nopoison)) {
        /* remove poison now in case obj ends up in a bones file */
        obj.opoisoned = 0;
        /* defer "obj is no longer poisoned" until after hit message */
        hmd.unpoisonmsg = true;
    }
    if (resists_poison(mon))
        hmd.needpoismsg = true;
    else if (rn2(10))
        hmd.dmg += rnd(6);
    else
        hmd.poiskilled = true;
}

// C ref: uhitm.c hmon_hitmon_stagger()
async function hmon_hitmon_stagger(hmd, mon, obj) {
    void obj;
    /* VERY small chance of stunning opponent if unarmed. */
    if (rnd(100) < P_SKILL(P_BARE_HANDED_COMBAT) && !bigmonst(hmd.mdat)
        && !thick_skinned(hmd.mdat)) {
        if (canspotmon(mon))
            await pline(`${Monnam(mon)} ${makeplural(stagger(mon.data, "stagger"))
                        } from your powerful strike!`);
        if (await mhurtle_to_doom(mon, hmd.dmg, hmd))
            hmd.already_killed = true;
        hmd.hittxt = true;
    }
}

// C ref: uhitm.c hmon_hitmon_pet()
async function hmon_hitmon_pet(hmd, mon, obj) {
    void obj;
    if (mon.mtame && hmd.dmg > 0) {
        /* do this even if the pet is being killed or migrating (affects revival) */
        await abuse_dog(mon); /* reduces tameness */
        /* flee if still alive and still tame; if already suffering from
           untimed fleeing, no effect, otherwise increases timed fleeing */
        if (mon.mtame && !hmd.destroyed)
            await monflee(mon, 10 * rnd(hmd.dmg), false, false);
    }
}

// C ref: uhitm.c hmon_hitmon_splitmon()
function hmon_hitmon_splitmon(hmd, mon, obj) {
    const u = game.u;
    if ((hmd.mdat === mons[M.PM_BLACK_PUDDING]
         || hmd.mdat === mons[M.PM_BROWN_PUDDING])
        /* pudding is alive and healthy enough to split */
        && mon.mhp > 1 && !mon.mcan && !hmd.offmap
        /* iron weapon using melee or polearm hit [3.6.1: metal weapon too;
           also allow either or both weapons to cause split when twoweap] */
        && obj && (obj === game.uwep || (u.twoweap && obj === game.uswapwep))
        && ((hmd.material === IRON
             /* allow scalpel and tsurugi to split puddings */
             || hmd.material === METAL)
            /* but not bashing with darts, arrows or ya */
            && !(is_ammo(obj) || is_missile(obj)))
        && hmd.hand_to_hand)
        throw new Error('hmon_hitmon_splitmon(): clone_mon() not ported yet');
}

// C ref: uhitm.c hmon_hitmon_msg_hit()
async function hmon_hitmon_msg_hit(hmd, mon, obj) {
    if (!hmd.hittxt /*( thrown => obj exists )*/
        && (!hmd.destroyed
            || (hmd.thrown && game.m_shot?.n > 1
                && game.m_shot.o === obj.otyp))) {
        if (hmd.thrown)
            throw new Error('hmon_hitmon_msg_hit(): hit() for a thrown object not ported yet');
        else if (!game.flags.verbose)
            await You("hit it.");
        else /* hand_to_hand */
            await You(`${(obj && (is_shield(obj)
                                  || obj.otyp === HEAVY_IRON_BALL)) ? "bash"
                : (obj && (objects[obj.otyp].oc_skill === P_WHIP
                           || is_wet_towel(obj))) ? "lash"
                  : Role_if(M.PM_BARBARIAN) ? "smite"
                    : "hit"} ${mon_nam(mon)}${
                canseemon(mon) ? exclam(hmd.dmg) : "."}`);
    }
}

// C ref: uhitm.c hmon_hitmon_msg_silver()
async function hmon_hitmon_msg_silver(hmd, mon, obj) {
    void obj;
    let fmt;
    let whom = mon_nam(mon);

    if (canspotmon(mon)) {
        if (hmd.barehand_silver_rings === 1)
            fmt = "Your silver ring sears %s!";
        else if (hmd.barehand_silver_rings === 2)
            fmt = "Your silver rings sear %s!";
        else if (hmd.silverobj && hmd.saved_oname) {
            fmt = `Your ${hmd.saved_oname.includes("silver") ? "" : "silver "}${
                hmd.saved_oname} ${vtense(hmd.saved_oname, "sear")} %s!`;
        } else
            fmt = "The silver sears %s!";
    } else {
        whom = highc(whom[0]) + whom.slice(1); /* "it" -> "It" */
        fmt = "%s is seared!";
    }
    /* note: s_suffix returns a modifiable buffer */
    if (!noncorporeal(hmd.mdat) && !amorphous(hmd.mdat))
        whom = s_suffix(whom) + " flesh";
    await pline(fmt.replace("%s", whom));
}

// C ref: uhitm.c hmon_hitmon_msg_lightobj()
async function hmon_hitmon_msg_lightobj(hmd, mon, obj) {
    void obj;
    let fmt;
    let whom = mon_nam(mon);

    if (canspotmon(mon)) {
        if (hmd.saved_oname) {
            fmt = `${s_suffix(hmd.saved_oname)} radiance penetrates deep into %s!`;
        } else
            fmt = "The light sears %s!";
    } else {
        whom = highc(whom[0]) + whom.slice(1); /* "it" -> "It" */
        fmt = "%s is seared!";
    }
    /* note: s_suffix returns a modifiable buffer */
    if (!noncorporeal(hmd.mdat) && !amorphous(hmd.mdat))
        whom = s_suffix(whom) + " flesh";
    await pline(fmt.replace("%s", whom));
}

// C ref: uhitm.c hmon_hitmon()
/* guts of hmon(); returns True if 'mon' survives */
async function hmon_hitmon(
    mon,
    obj,
    thrown, /* HMON_xxx (0 => hand-to-hand, other => ranged) */
    dieroll) {
    const u = game.u;
    let maybe_knockback = false;
    const hmd = {
        dmg: 0,
        thrown,
        twohits: thrown ? 0 : (game.twohits || 0),
        dieroll,
        mdat: mon.data,
        use_weapon_skill: false,
        train_weapon_skill: false,
        barehand_silver_rings: 0,
        silvermsg: false,
        silverobj: false,
        lightobj: false,
        material: obj ? objects[obj.otyp].oc_material : NO_MATERIAL,
        jousting: 0,
        hittxt: false,
        get_dmg_bonus: true,
        unarmed: !game.uwep && !game.uarm && !game.uarms,
        hand_to_hand: (thrown === HMON_MELEE
                       /* not grapnels; applied implies uwep */
                       || (thrown === HMON_APPLIED && is_pole(game.uwep))),
        ispoisoned: false,
        unpoisonmsg: false,
        needpoismsg: false,
        poiskilled: false,
        already_killed: false,
        offmap: false,
        destroyed: false,
        dryit: false,
        doreturn: false,
        retval: false,
        saved_oname: '',
    };

    await hmon_hitmon_do_hit(hmd, mon, obj);
    if (hmd.doreturn)
        return hmd.retval;

    /*
     ***** NOTE: perhaps obj is undefined! (if !thrown && BOOMERANG)
     *      *OR* if attacking bare-handed!
     * Note too: the cases where obj might get destroyed do not
     *      set 'use_weapon_skill', bare-handed does.
     */

    if (hmd.dmg > 0)
        await hmon_hitmon_dmg_recalc(hmd, obj);

    if (hmd.ispoisoned)
        await hmon_hitmon_poison(hmd, mon, obj);

    if (hmd.dmg < 1) {
        const mon_is_shade = (mon.data === mons[M.PM_SHADE]);

        /* make sure that negative damage adjustment can't result
           in inadvertently boosting the victim's hit points */
        hmd.dmg = (hmd.get_dmg_bonus && !mon_is_shade) ? 1 : 0;
        if (mon_is_shade && !hmd.hittxt
            && thrown !== HMON_THROWN && thrown !== HMON_KICKED)
            /* this gives "harmlessly passes through" feedback even when
               hero doesn't see it happen; presumably sensed by touch? */
            throw new Error('hmon_hitmon(): shade_miss() not ported yet');
    }

    if (hmd.jousting) {
        throw new Error('hmon_hitmon(): hmon_hitmon_jousting() not ported yet');
    } else if (hmd.unarmed && hmd.dmg > 1 && !thrown && !obj && !Upolyd()) {
        await hmon_hitmon_stagger(hmd, mon, obj);
    } else if (!hmd.unarmed && hmd.dmg > 1 && !thrown && !Upolyd()
               && !u.twoweap && game.uwep) {
        maybe_knockback = true;
    }

    if (!hmd.already_killed) {
        /* first_weapon_hit(obj) only writes a livelog entry when this
           hit breaks the never-hit-with-wielded-weapon conduct; it has
           no game effect */
        mon.mhp -= hmd.dmg;
    }
    /* adjustments might have made tmp become less than what
       a level-draining artifact has already done to max HP */
    if (mon.mhp > mon.mhpmax)
        mon.mhp = mon.mhpmax;
    if (mon.mx === 0) {
        /*
         * jousting can lead to:
         *     mhurtle_to_doom()
         *      mhurtle()
         *       mintrap()
         *        trapeffect_hole()
         *         trapeffect_level_telep()
         *          migrate_to_level()
         * Set offmap in that situation so code to follow can test for it.*/
        hmd.offmap = true;
    }
    if (DEADMONSTER(mon))
        hmd.destroyed = true;

    await hmon_hitmon_pet(hmd, mon, obj);

    hmon_hitmon_splitmon(hmd, mon, obj);

    await hmon_hitmon_msg_hit(hmd, mon, obj);

    if (hmd.dryit) /* dryit implies wet towel, so 'obj' is still intact */
        throw new Error('hmon_hitmon(): dry_a_towel() not ported yet');

    if (hmd.silvermsg)
        await hmon_hitmon_msg_silver(hmd, mon, obj);

    if (hmd.lightobj)
        await hmon_hitmon_msg_lightobj(hmd, mon, obj);

    /* if a "no longer poisoned" message is coming, it will be last;
       obj->opoisoned was cleared above and any message referring to
       "poisoned <obj>" has now been given; we want just "<obj>" for
       last message, so reformat while obj is still accessible */
    if (hmd.unpoisonmsg)
        hmd.saved_oname = cxname(obj);

    /* [note: thrown obj might go away during killed()/xkilled() call
       (via 'thrownobj'; if swallowed, it gets added to engulfer's
       minvent and might merge with a stack that's already there)] */
    /* already_killed and poiskilled won't apply for Trollsbane */

    if (hmd.needpoismsg)
        await pline_The(`poison doesn't seem to affect ${mon_nam(mon)}.`);
    if (hmd.poiskilled) {
        await pline_The("poison was deadly...");
        if (!hmd.already_killed)
            await xkilled(mon, XKILL_NOMSG);
        hmd.destroyed = true; /* return FALSE; */
    } else if (hmd.destroyed) {
        if (!hmd.already_killed) {
            if (troll_baned(mon, obj))
                game.mkcorpstat_norevive = true;
            await killed(mon); /* takes care of most messages */
            game.mkcorpstat_norevive = false;
        }
    } else if (u.umconf && hmd.hand_to_hand) {
        throw new Error('hmon_hitmon(): nohandglow()/confusing touch not ported yet');
    }
    if (hmd.unpoisonmsg)
        await Your(`${hmd.saved_oname} ${vtense(hmd.saved_oname, "are")} no longer poisoned.`);

    if (!hmd.destroyed && !hmd.offmap) {
        const hf = { hitflags: M_ATTK_HIT };

        await wakeup(mon, true);
        if (maybe_knockback
            && await mhitm_knockback(game.youmonst, mon,
                                     game.youmonst.data.mattk[0], hf, true)) {
            if ((hf.hitflags & M_ATTK_DEF_DIED) !== 0)
                hmd.destroyed = true;
        }
    }
    return hmd.destroyed ? false : true;
}

// C ref: uhitm.c mhurtle_to_doom()
/* joust or martial arts punch is knocking the target back; that might
   kill 'mon' (via trap) before known_hitum() has a chance to do so;
   return True if we kill mon, False otherwise */
async function mhurtle_to_doom(
    mon,  /* target monster */
    tmp,  /* amount of pending damage */
    hmd) /* caller's cached copy of mon->data is hmd.mdat */ {
    /* only hurtle if pending physical damage (tmp) isn't going to kill mon */
    if (tmp < mon.mhp) {
        void hmd;
        throw new Error('mhurtle_to_doom(): mhurtle() not ported yet');
    }
    return false; /* mon isn't dead yet */
}

// C ref: uhitm.c shade_aware()
function shade_aware(obj) {
    if (!obj)
        return false;
    /*
     * The things in this list either
     * 1) affect shades.
     *  OR
     * 2) are dealt with properly by other routines
     *    when it comes to shades.
     */
    if (obj.otyp === BOULDER
        || obj.otyp === HEAVY_IRON_BALL
        || obj.otyp === IRON_CHAIN      /* dmgval handles those first three */
        || obj.otyp === MIRROR          /* silver in the reflective surface */
        || obj.otyp === CLOVE_OF_GARLIC /* causes shades to flee */
        || objects[obj.otyp].oc_material === SILVER)
        return true;
    return false;
}

// C ref: uhitm.c shade_miss()
/* used for hero vs monster and monster vs monster; also handles
   monster vs hero but that won't happen because hero can't be a shade */
export async function shade_miss(magr, mdef, obj, thrown, verbose) {
    const youagr = (magr === game.youmonst), youdef = (mdef === game.youmonst);

    /* we're using dmgval() for zero/not-zero, not for actual damage amount */
    if (mdef.data !== mons[M.PM_SHADE] || (obj && dmgval(obj, mdef)))
        return false;

    if (verbose
        && ((youdef || cansee(mdef.mx, mdef.my) || sensemon(mdef))
            || (magr === game.youmonst && m_next2u(mdef)))) {
        const harmlessly_thru = " harmlessly through ";

        const what = (!obj || shade_aware(obj)) ? "attack" : cxname(obj);
        const target = youdef ? "you" : mon_nam(mdef);
        if (!thrown) {
            const whose = youagr ? "Your" : s_suffix(Monnam(magr));
            await pline(`${whose} ${what} ${vtense(what, "pass")}${
                harmlessly_thru}${target}.`);
        } else {
            await pline(`${The(what)} ${ /* note: not pline_The() */
                vtense(what, "pass")}${harmlessly_thru}${target}.`);
        }
        if (!youdef && !canspotmon(mdef))
            map_invisible(mdef.mx, mdef.my);
    }
    if (!youdef)
        mdef.msleeping = 0;
    return true;
}

// C ref: uhitm.c passive_obj()
/*
 * Special (passive) attacks on an attacking object by monsters done here.
 * Assumes the attack was successful.
 */
export async function passive_obj(
    mon,
    obj,     /* null means pick uwep, uswapwep or uarmg */
    mattk) { /* null means we find one internally */
    const ptr = mon.data;
    let i;

    /* [this first bit is obsolete; we're not called with Null anymore] */
    /* if caller hasn't specified an object, use uwep, uswapwep or uarmg */
    if (!obj) {
        obj = (game.u.twoweap && game.uswapwep && !rn2(2)) ? game.uswapwep
                                                         : game.uwep;
        if (!obj && mattk.adtyp === AD_ENCH)
            obj = game.uarmg; /* no weapon? then must be gloves */
        if (!obj)
            return; /* no object to affect */
    }

    /* if caller hasn't specified an attack, find one */
    if (!mattk) {
        for (i = 0; ; i++) {
            if (i >= NATTK)
                return; /* no passive attacks */
            if (ptr.mattk[i].aatyp === AT_NONE)
                break; /* try this one */
        }
        mattk = ptr.mattk[i];
    }

    switch (mattk.adtyp) {
    case AD_FIRE:
        if (!rn2(6) && !mon.mcan
            /* steam vortex: fire resist applies, fire damage doesn't */
            && mon.data !== mons[M.PM_STEAM_VORTEX])
            throw new Error('passive_obj(): erode_obj() not ported yet');
        break;
    case AD_ACID:
        if (!rn2(6))
            throw new Error('passive_obj(): erode_obj() not ported yet');
        break;
    case AD_RUST:
        if (!mon.mcan)
            throw new Error('passive_obj(): erode_obj() not ported yet');
        break;
    case AD_CORR:
        if (!mon.mcan)
            throw new Error('passive_obj(): erode_obj() not ported yet');
        break;
    case AD_ENCH:
        if (!mon.mcan)
            throw new Error('passive_obj(): drain_item() not ported yet');
        /* FALLTHRU */
    default:
        break;
    }
}

// C ref: uhitm.c missum()
async function missum(mdef, mattk, wouldhavehit) {
    if (wouldhavehit) /* monk is missing due to penalty for wearing suit */
        await Your("armor is rather cumbersome...");

    if (could_seduce(game.youmonst, mdef, mattk))
        await You(`pretend to be friendly to ${mon_nam(mdef)}.`);
    else if (canspotmon(mdef) && game.flags.verbose)
        await You(`miss ${mon_nam(mdef)}.`);
    else
        await You("miss it.");
    if (!helpless(mdef))
        await wakeup(mdef, true);
}

// C ref: uhitm.c m_is_steadfast()
/* check whether equipment protects against knockback */
function m_is_steadfast(mtmp) {
    const u = game.u;
    const is_u = (mtmp === game.youmonst);
    const otmp = is_u ? game.uwep : (mtmp.mw || null);

    /* must be on the ground (or in water) */
    if ((is_u ? (uprop(FLYING) || uprop(LEVITATION))
              : (is_flyer(mtmp.data) || is_floater(mtmp.data)))
        || Is_airlevel(u.uz) /* air or cloud */
        || (Is_waterlevel(u.uz) && !is_pool(u.ux, u.uy))) /* air bubble */
        return false;

    if (is_art(otmp, ART_GIANTSLAYER))
        return true;

    /* steadfast if carrying any loadstone (and not floating or flying);
       'is_u' test not needed here; m_carrying() is 'youmonst' aware */
    if (is_u ? carrying(LOADSTONE) : m_carrying(mtmp, LOADSTONE))
        return true;
    /* when mounted and steed is target of knockback, check the rider for
       a loadstone too (Giantslayer's protection doesn't extend to steed) */
    if (u.usteed && mtmp === u.usteed && carrying(LOADSTONE))
        return true;

    return false;
}

/* C ref: hack.c doorless_door() */
function doorless_door(x, y) {
    const lev = game.level.at(x, y);

    if (!IS_DOOR(lev.typ))
        return false;
    /* all rogue level doors are doorless but disallow diagonal access, so
       we treat them as if their non-existent doors were actually present */
    if (Is_rogue_level(game.u.uz))
        return false;
    return !(lev.doormask & ~(D_NODOOR | D_BROKEN));
}

// C ref: uhitm.c hmonas()
/* attack monster as a monster; returns True if mon survives */
async function hmonas(mon) {
    void mon;
    throw new Error('hmonas(): attacking while polymorphed not ported yet');
}

// C ref: uhitm.c passive()
/*      Special (passive) attacks on you by monsters done here.
 */
export async function passive(
    mon,
    weapon, /* uwep or uswapwep or uarmg or uarmf or Null */
    mhitb,
    maliveb,
    aatyp,
    wep_was_destroyed) {
    const ptr = mon.data;
    let i, tmp;
    const mhit = mhitb ? M_ATTK_HIT : M_ATTK_MISS;
    const malive = maliveb ? M_ATTK_HIT : M_ATTK_MISS;

    for (i = 0; ; i++) {
        if (i >= NATTK)
            return (malive | mhit); /* no passive attacks */
        if (ptr.mattk[i].aatyp === AT_NONE)
            break; /* try this one */
    }
    /* Note: tmp not always used */
    if (ptr.mattk[i].damn)
        tmp = d(ptr.mattk[i].damn, ptr.mattk[i].damd);
    else if (ptr.mattk[i].damd)
        tmp = d(mon.m_lev + 1, ptr.mattk[i].damd);
    else
        tmp = 0;

    /*  These affect you even if they just died.
     */
    switch (ptr.mattk[i].adtyp) {
    case AD_FIRE:
    case AD_RUST:
    case AD_CORR:
        if (mhitb && !mon.mcan && weapon)
            throw new Error('passive(): erode_obj()/passive_obj() not ported yet');
        break;
    case AD_ACID:
        if (mhitb && rn2(2))
            throw new Error('passive(): acid splash not ported yet');
        if (mhitb && weapon)
            throw new Error('passive(): erode_obj()/passive_obj() not ported yet');
        exercise(A_STR, false);
        break;
    case AD_STON:
        if (mhitb) /* successful attack */
            throw new Error('passive(): touching a petrifier not ported yet');
        break;
    case AD_MAGM:
        /* wrath of gods for attacking Oracle */
        throw new Error('passive(): magic missiles not ported yet');
    case AD_ENCH: /* KMH -- remove enchantment (disenchanter) */
        if (mhitb)
            throw new Error('passive(): passive_obj() disenchanting not ported yet');
        break;
    default:
        break;
    }
    void wep_was_destroyed; void aatyp;

    /*  These only affect you if they still live.
     */
    if (malive && !mon.mcan && rn2(3)) {
        switch (ptr.mattk[i].adtyp) {
        case AD_PLYS:
            if (ptr === mons[M.PM_FLOATING_EYE]) {
                if (!canseemon(mon)) {
                    break;
                }
                if (mon.mcansee) {
                    if (await ureflects("%s gaze is reflected by your %s.",
                                        s_suffix(Monnam(mon)))) {
                        ;
                    } else if (Hallucination() && rn2(4)) {
                        /* [it's the hero who should be getting paralyzed
                           and isn't; this message describes the monster's
                           reaction rather than the hero's escape] */
                        await pline(`${Monnam(mon)} looks ${
                            !rn2(2) ? "" : "rather "}${
                            !rn2(2) ? "numb" : "stupefied"}.`);
                    } else if (Free_action()) {
                        await You(`momentarily stiffen under ${
                            s_suffix(mon_nam(mon))} gaze!`);
                    } else {
                        await You(`are frozen by ${s_suffix(mon_nam(mon))} gaze!`);
                        nomul((ACURR(A_WIS) > 12 || rn2(4)) ? -tmp : -127);
                        /* set gm.multi_reason;
                           3.6.x used "frozen by a monster's gaze" */
                        dynamic_multi_reason(mon, "frozen", true);
                        game.nomovemsg = null;
                    }
                } else {
                    throw new Error('passive(): blind floating eye not ported yet');
                }
            } else if (Free_action()) {
                await You("momentarily stiffen.");
            } else { /* gelatinous cube */
                await You(`are frozen by ${mon_nam(mon)}!`);
                game.nomovemsg = "You can move again.";
                nomul(-tmp);
                /* set gm.multi_reason;
                   3.6.x used "frozen by a monster"; be more specific */
                dynamic_multi_reason(mon, "frozen", false);
                exercise(A_DEX, false);
            }
            break;
        case AD_COLD: /* brown mold or blue jelly */
        case AD_STUN: /* specifically yellow mold */
        case AD_FIRE:
        case AD_ELEC:
            throw new Error(`passive(): passive damage type ${ptr.mattk[i].adtyp} not ported yet`);
        default:
            break;
        }
    }
    return (malive | mhit);
}

// C ref: muse.c ureflects()
/* Check from outermost to innermost objects; fmt has two %s: str and
   the reflecting item */
async function ureflects(fmt, str) {
    const ERefl = game.u.uprops[REFLECTING].extrinsic || 0;
    const msg = (what) => fmt.replace("%s", str).replace("%s", what);

    if (ERefl & W_ARMS) {
        if (fmt && str) {
            await pline(msg("shield"));
            makeknown(SHIELD_OF_REFLECTION);
        }
        return true;
    } else if (ERefl & W_WEP) {
        /* Due to wielded artifact weapon */
        if (fmt && str)
            await pline(msg("weapon"));
        return true;
    } else if (ERefl & W_AMUL) {
        if (fmt && str) {
            await pline(msg("medallion"));
            makeknown(AMULET_OF_REFLECTION);
        }
        return true;
    } else if (ERefl & W_ARM) {
        if (fmt && str)
            await pline(msg(game.uskin ? "luster" : "armor"));
        return true;
    } else if (game.youmonst.data === mons[M.PM_SILVER_DRAGON]) {
        if (fmt && str)
            await pline(msg("scales"));
        return true;
    }
    return false;
}

/* C ref: mondata.c locomotion verb tables used by stagger() */
const levitate = ["float", "Float", "wobble", "Wobble"],
    flys = ["fly", "Fly", "flutter", "Flutter"],
    flyl = ["fly", "Fly", "stagger", "Stagger"],
    slither = ["slither", "Slither", "falter", "Falter"],
    ooze = ["ooze", "Ooze", "tremble", "Tremble"],
    immobile = ["wiggle", "Wiggle", "pulsate", "Pulsate"],
    crawl = ["crawl", "Crawl", "falter", "Falter"];

// C ref: mondata.c stagger()
export function stagger(ptr, def) {
    const locoindx = (def[0] !== highc(def[0])) ? 2 : 3;

    return (is_floater(ptr) ? levitate[locoindx]
            : (is_flyer(ptr) && ptr.msize <= M.MZ_SMALL) ? flys[locoindx]
              : (is_flyer(ptr) && ptr.msize > M.MZ_SMALL) ? flyl[locoindx]
                : (ptr.mflags1 & M.M1_SLITHY) ? slither[locoindx]
                  : amorphous(ptr) ? ooze[locoindx]
                    : !ptr.mmove ? immobile[locoindx]
                      : ((ptr.mflags1 & M.M1_NOLIMBS) === M.M1_NOLIMBS)
                        ? crawl[locoindx]
                        : def);
}

/* C ref: mondata.h resists_poison() */
function resists_poison(mon) { return Resists_Elem(mon, POISON_RES); }

// C ref: uhitm.c dynamic_multi_reason()
/* multi_reason is usually a literal string; here we generate one that
   has the causing monster's type included */
function dynamic_multi_reason(mon, verb, by_gaze) {
    /* combination of noname_monnam() and m_monnam(), more or less;
       accurate regardless of visibility or hallucination (only seen
       if game ends) and without personal name (M2_PNAME excepted) */
    const who = x_monnam(mon, ARTICLE_A, null,
                         (SUPPRESS_IT | SUPPRESS_INVISIBLE
                          | SUPPRESS_HALLUCINATION | SUPPRESS_SADDLE
                          | SUPPRESS_NAME),
                         false);

    /* prefix info for done_in_by() */
    game.multireasonbuf = `${mon.m_id}:${verb} by ${!by_gaze ? who : s_suffix(who)}${
        !by_gaze ? "" : " gaze"}`;
    game.multi_reason = game.multireasonbuf;
}
