// mhitm.js — monster-vs-monster melee: mattackm(), hitmm(), missmm(),
// mdamagem(), passivemm(), noises(), pre_mm_attack(); plus the small
// helpers they need (getmattk(), find_mac(), mhitm_knockback(),
// mhitm_ad_phys(), max_passive_dmg()).  Paths that aren't ported yet
// throw a 'not ported yet' error instead of skipping their rolls.

import { failed_grab } from './mhitu.js';
import { clone_mon } from './makemon.js';
import { mintrap, erode_obj } from './trap.js';
import { NO_TRAP_FLAGS, EF_GREASE, EF_VERBOSE, DISMOUNT_POLY } from './const.js';
import { shade_miss } from './uhitm.js';
import { artifact_hit } from './artifact.js';
import { dismount_steed } from './steed.js';
import { zombie_form } from './mon.js';
import { DEADMONSTER } from './mon.js';
import { helpless } from './monmove.js';
import { game } from './gstate.js';
import { rn2, rnd, rn1, d } from './rng.js';
import { ACURR as ACURR_mm } from './attrib.js';
import { A_CHA as A_CHA_mm, NORMAL_SPEED as NORMAL_SPEED_mm } from './const.js';
import { distmin, isok } from './hacklib.js';
import { cansee } from './vision.js';
import { m_at, grow_up } from './makemon.js';
import { monkilled, zombie_maker, monnear, seemimic } from './mon.js';
import { thrwmm, spitmm, breamm } from './mthrowu.js';
import { canspotmon, newsym, pline, map_invisible } from './display.js';
import { Monnam, mon_nam, mon_nam_too } from './do_name.js';
import { is_elf, is_orc } from './mondata.js';
import { M_AP_TYPE, IS_DOOR, M_ATTK_MISS, M_ATTK_HIT, M_ATTK_DEF_DIED,
         M_ATTK_AGR_DIED, M_ATTK_AGR_DONE, NATTK, HALLUC, W_SADDLE, W_ARMG,
         NEED_WEAPON, NEED_HTH_WEAPON, P_POLEARMS, P_LANCE, ERODE_BURN,
         ERODE_RUST, ERODE_CORRODE, CONFLICT, BLINDED } from './const.js';
import { STRAT_WAITFORU, DEAF } from './const.js';
import { mons, AT_NONE, AT_CLAW, AT_BITE, AT_KICK, AT_BUTT, AT_TUCH,
         AT_STNG, AT_HUGS, AT_ENGL, AT_TENT, AT_WEAP, AT_EXPL, AT_BOOM,
         AT_BREA, AT_SPIT,
         AD_PHYS, AD_SSEX, AD_DISE, AD_PEST, AD_FAMN, AD_DREN, AD_STCK,
         AD_POLY, AD_DGST, G_UNIQ } from './monsters.js';
import * as M from './monsters.js';
import { find_mac, which_armor } from './worn.js';
import { mon_wield_item, possibly_unwield, hitval, dmgval } from './weapon.js';
import { mswings_verb, mhis, could_seduce, mtrapped_in_pit } from './mhitu.js';
import { objects, CORPSE, GAUNTLETS_OF_POWER, SILVER, IRON, METAL,
         WEAPON_CLASS, TOOL_CLASS } from './objects.js';
import { permapoisoned } from './mkobj.js';
import { xname } from './objnam.js';
import { ART_SNICKERSNEE } from './artilist.js';
import { dist2 } from './hacklib.js';
import { mon_visible } from './display.js';
import { dmgtype, is_were, is_demon, is_vampshifter } from './mondata.js';
import { completelyburns, completelyrots, completelyrusts } from './mon.js';
import { resists_acid, resists_cold, resists_fire, resists_elec } from './mondata.js';
import { x_monnam, ARTICLE_THE, ARTICLE_NONE, noname_monnam, a_monnam } from './do_name.js';
import { sensemon } from './display.js';
import { Unaware } from './youprop.js';
import { makeplural } from './objnam.js';
import { PLNMSG_HIDE_UNDER } from './const.js';
import { extract_from_minvent } from './steal.js';
import { add_to_minv } from './mkobj.js';
import { doname } from './objnam.js';
import { canseemon } from './display.js';
import { mselftouch } from './trap.js';
import { tele_restrict, rloc } from './teleport.js';
import { RLOC_NOMSG } from './const.js';
import { Blind, Deaf, Conflict } from './youprop.js';
import { sticks } from './engrave.js';
import { getmattk } from './mhitu.js';
import { mhitm_ad_stck } from './uhitm.js';
import { ANTIMAGIC as ANTIMAGIC_MP, UNCHANGING as UNCHANGING_MP,
         POLY_NOFLAGS as POLY_NOFLAGS_MP, NO_NC_FLAGS as NO_NC_FLAGS_MP,
         XKILL_GIVEMSG as XKILL_GIVEMSG_MP, XKILL_NOCORPSE as XKILL_NOCORPSE_MP,
         RLOC_MSG as RLOC_MSG_MP, nothing_happens as nothing_happens_mp,
         NON_PM as NON_PM_MP, TELL as TELL_MP } from './const.js';
import { AD_RBRE as AD_RBRE_MP } from './monsters.js';
import { You as You_mp, You_feel as You_feel_mp } from './display.js';
import { polyself as polyself_mp } from './polyself.js';
import { resists_magm as resists_magm_mp, can_teleport as can_teleport_mp,
         monsndx as monsndx_mp } from './mondata.js';
import { resist as resist_mp } from './zap.js';
import { pm_to_cham as pm_to_cham_mp } from './makemon.js';
import { xkilled as xkilled_mp, newcham as newcham_mp } from './mon.js';
import { tele as tele_mp } from './teleport.js';
import { ARTICLE_A as ARTICLE_A_MP, SUPPRESS_NAME as SUPPRESS_NAME_MP,
         SUPPRESS_IT as SUPPRESS_IT_MP,
         SUPPRESS_INVISIBLE as SUPPRESS_INVISIBLE_MP } from './do_name.js';
import { WAND_CLASS as WAND_CLASS_MP } from './objects.js';
import { AT_NONE as AT_NONE_AP, AT_SPIT as AT_SPIT_AP, AT_EXPL as AT_EXPL_AP,
         AT_BOOM as AT_BOOM_AP, AT_GAZE as AT_GAZE_AP, AT_BREA as AT_BREA_AP,
         AT_MAGC as AT_MAGC_AP, AT_CLAW as AT_CLAW_AP, AT_TUCH as AT_TUCH_AP,
         AT_WEAP as AT_WEAP_AP, AT_KICK as AT_KICK_AP, AT_BUTT as AT_BUTT_AP,
         AT_HUGS as AT_HUGS_AP, AT_BITE as AT_BITE_AP, AT_STNG as AT_STNG_AP,
         AT_ENGL as AT_ENGL_AP, AT_TENT as AT_TENT_AP } from './monsters.js';
import { W_ARMG as W_ARMG_AP, W_ARMF as W_ARMF_AP, W_ARMH as W_ARMH_AP,
         W_ARMC as W_ARMC_AP } from './const.js';
import { seemimic as seemimic_md } from './mon.js';
import { finish_meating as finish_meating_md } from './dog.js';
import { canspotmon as canspotmon_md, newsym as newsym_md,
         flush_screen as flush_screen_md } from './display.js';
import { M_AP_MONSTER as M_AP_MONSTER_MD, STRAT_WAITMASK as STRAT_WAITMASK_MD,
         W_ARMG as W_ARMG_MD } from './const.js';
import { remove_worm as remove_worm_md,
         place_worm_tail_randomly as place_worm_tail_randomly_md } from './worm.js';
import { place_monster as place_monster_md } from './makemon.js';
import { update_monster_region as update_monster_region_md } from './region.js';
import { mhis as mhis_md } from './mhitu.js';
import { which_armor as which_armor_md } from './worn.js';
import { touch_petrifies as touch_petrifies_md, resists_ston as resists_ston_md } from './mondata.js';
import { s_suffix as s_suffix_sm } from './hacklib.js';
import { unstuck as unstuck_sm } from './mhitu.js';
import { mhitm_adtyping as mhitm_adtyping_uh } from './uhitm.js';
import { mhitm_knockback, stagger } from './uhitm.js';
import { mon_reflects } from './muse.js';
import { golemeffects, healmon } from './mon.js';
import { split_mon } from './potion.js';
import { haseyes, perceives } from './mondata.js';
import { erode_armor } from './uhitm.js';
import { acid_damage } from './trap.js';
import { drain_item } from './zap.js';
import { hliquid } from './potion.js';

/* C ref: obj.h is_pole() */
function is_pole(otmp) {
    return (otmp.oclass === WEAPON_CLASS || otmp.oclass === TOOL_CLASS)
           && (objects[otmp.otyp].oc_skill === P_POLEARMS
               || objects[otmp.otyp].oc_skill === P_LANCE
               || otmp.oartifact === ART_SNICKERSNEE);
}
// C ref: mondata.c mon_hates_silver(), hates_silver()
function mon_hates_silver(mon) {
    const ptr = mon.data;
    return is_vampshifter(mon)
        || (is_were(ptr) || ptr.mlet === M.S_VAMPIRE || is_demon(ptr)
            || ptr === mons[M.PM_SHADE]
            || (ptr.mlet === M.S_IMP && ptr !== mons[M.PM_TENGU]));
}
// C ref: monst.h mon_offmap()
function mon_offmap(mon) {
    return ((mon.mstate || 0) & (0x01 | 0x02 | 0x04 | 0x08)) !== 0;
}
function mdistu(mon) {
    const dx = mon.mx - game.u.ux, dy = mon.my - game.u.uy;
    return dx * dx + dy * dy;
}
function sgn(n) { return n < 0 ? -1 : n > 0 ? 1 : 0; }
// C ref: mondata.h touch_petrifies()
function touch_petrifies(ptr) {
    return ptr === mons[M.PM_COCKATRICE] || ptr === mons[M.PM_CHICKATRICE];
}
// C ref: mondata.h unsolid()
function unsolid(ptr) { return (ptr.mflags1 & M.M1_UNSOLID) !== 0; }
// C ref: mondata.c attacktype()
function attacktype(ptr, atyp) {
    return ptr.mattk.some((a) => a.aatyp === atyp);
}
/* C ref: mondata.c sticks() is engrave.js sticks() */


/* C ref: worn.c find_mac() lives in worn.js */
export { find_mac };

/* C ref: mhitu.c getmattk() is mhitu.js getmattk() (any defender) */

// C ref: mondata.c max_passive_dmg()
export function max_passive_dmg(mdef, magr) {
    let i, dmg, multi2 = 0;
    let adtyp;

    /* each attack by magr can result in passive damage */
    for (i = 0; i < NATTK; i++)
        switch (magr.data.mattk[i].aatyp) {
        case AT_CLAW:
        case AT_BITE:
        case AT_KICK:
        case AT_BUTT:
        case AT_TUCH:
        case AT_STNG:
        case AT_HUGS:
        case AT_ENGL:
        case AT_TENT:
        case AT_WEAP:
            multi2++;
            break;
        default:
            break;
        }

    dmg = 0;
    for (i = 0; i < NATTK; i++)
        if (mdef.data.mattk[i].aatyp === AT_NONE
            || mdef.data.mattk[i].aatyp === AT_BOOM) {
            adtyp = mdef.data.mattk[i].adtyp;
            if ((adtyp === M.AD_FIRE && completelyburns(magr.data))
                || (adtyp === M.AD_DCAY && completelyrots(magr.data))
                || (adtyp === M.AD_RUST && completelyrusts(magr.data))) {
                dmg = magr.mhp;
            } else if ((adtyp === M.AD_ACID && !resists_acid(magr))
                       || (adtyp === M.AD_COLD && !resists_cold(magr))
                       || (adtyp === M.AD_FIRE && !resists_fire(magr))
                       || (adtyp === M.AD_ELEC && !resists_elec(magr))
                       || adtyp === AD_PHYS) {
                dmg = mdef.data.mattk[i].damn;
                if (!dmg)
                    dmg = mdef.data.mlevel + 1;
                dmg *= mdef.data.mattk[i].damd;
            }
            dmg *= multi2;
            break;
        }
    return dmg;
}

// C ref: mhitm.c noises()
async function noises(magr, mattk) {
    const farq = (mdistu(magr) > 15);

    if (!Deaf() && (farq !== !!game.far_noise
                    || game.moves - (game.noisetime || 0) > 10)) {
        game.far_noise = farq;
        game.noisetime = game.moves;
        await pline(`You hear ${(mattk.aatyp === AT_EXPL) ? 'an explosion'
                                                          : 'some noises'}${
            farq ? ' in the distance' : ''}.`);
    }
}

// C ref: mhitm.c pre_mm_attack()
function pre_mm_attack(magr, mdef) {
    let showit = false;

    /* unhiding or unmimicking happens even if hero can't see it
       because the formerly concealed monster is now in action */
    if (M_AP_TYPE(mdef)) {
        seemimic(mdef);
        showit ||= game.mhitm_vis;
    } else if (mdef.mundetected) {
        mdef.mundetected = 0;
        showit ||= game.mhitm_vis;
    }
    if (M_AP_TYPE(magr)) {
        seemimic(magr);
        showit ||= game.mhitm_vis;
    } else if (magr.mundetected) {
        magr.mundetected = 0;
        showit ||= game.mhitm_vis;
    }

    if (game.mhitm_vis) {
        if (!canspotmon(magr))
            map_invisible(magr.mx, magr.my);
        else if (showit)
            newsym(magr.mx, magr.my);
        if (!canspotmon(mdef))
            map_invisible(mdef.mx, mdef.my);
        else if (showit)
            newsym(mdef.mx, mdef.my);
    }
}

// C ref: mhitm.c missmm()
async function missmm(magr, mdef, mattk) {
    pre_mm_attack(magr, mdef);

    if (game.mhitm_vis) {
        await pline(`${Monnam(magr)} ${
            (magr.mcan || !could_seduce(magr, mdef, mattk)) ? "misses"
                : "pretends to be friendly to"} ${mon_nam_too(mdef, magr)}.`);
    } else {
        await noises(magr, mattk);
    }
}

// C ref: mondata.c resist_conflict()
export function resist_conflict(mtmp) {
    /* always a small chance at 19 */
    const resist_chance = Math.min(19, (ACURR_mm(A_CHA_mm) - mtmp.m_lev
                                        + game.u.ulevel));

    return (rnd(20) > resist_chance);
}

// C ref: mhitm.c fightm()
/* have monsters fight each other */
export async function fightm(mtmp) {
    const u = game.u;
    let mon, nmon;
    let result, has_u_swallowed;
    /* perhaps the monster will resist Conflict */
    if (resist_conflict(mtmp))
        return 0;

    if (u.ustuck === mtmp) {
        /* perhaps we're holding it... */
        throw new Error('fightm(): itsstuck() not ported yet');
    }
    has_u_swallowed = !!(u.uswallow && u.ustuck === mtmp); /* engulfing_u() */

    for (mon = game.fmon; mon; mon = nmon) {
        nmon = mon.nmon;
        if (nmon === mtmp)
            nmon = mtmp.nmon;
        /* Be careful to ignore monsters that are already dead, since we
         * might be calling this before we've cleaned them up.  This can
         * happen if the monster attacked a cockatrice bare-handedly, for
         * instance.
         */
        if (mon !== mtmp && !(mon.mhp < 1)) { /* !DEADMONSTER(mon) */
            if (monnear(mtmp, mon.mx, mon.my)) {
                if (!u.uswallow && (mtmp === u.ustuck)) {
                    throw new Error('fightm(): releasing a held hero not ported yet');
                }

                /* mtmp can be killed */
                game.bhitpos = { x: mon.mx, y: mon.my };
                game.notonhead = false;
                result = await mattackm(mtmp, mon);

                if (result & M_ATTK_AGR_DIED)
                    return 1; /* mtmp died */
                /*
                 * If mtmp has the hero swallowed, lie and say there
                 * was no attack (this allows mtmp to digest the hero).
                 */
                if (has_u_swallowed)
                    return 0;

                /* allow attacked monsters a chance to hit back, primarily
                   to allow monsters that resist conflict to respond */
                if ((result & (M_ATTK_HIT | M_ATTK_DEF_DIED)) === M_ATTK_HIT
                    && rn2(4) && mon.movement > rn2(NORMAL_SPEED_mm)) {
                    if (mon.movement > NORMAL_SPEED_mm)
                        mon.movement -= NORMAL_SPEED_mm;
                    else
                        mon.movement = 0;
                    game.bhitpos = { x: mtmp.mx, y: mtmp.my };
                    game.notonhead = false;
                    await mattackm(mon, mtmp); /* return attack */
                }

                return (result & M_ATTK_HIT) ? 1 : 0;
            }
        }
    }
    return 0;
}

// C ref: mhitm.c mattackm()
export async function mattackm(magr, mdef) {
    let i,          /* loop counter */
        tmp,        /* armor class difference */
        strike = 0, /* hit this attack */
        attk,       /* attempted this time */
        struck = 0, /* hit at least once */
        dieroll = 0;
    const res = new Array(NATTK).fill(M_ATTK_MISS);
    let mattk, mwep;

    if (!magr || !mdef)
        return M_ATTK_MISS; /* mike@genat */
    if (helpless(magr))
        return M_ATTK_MISS;
    const pa = magr.data;
    const pd = mdef.data;

    /* Grid bugs cannot attack at an angle. */
    if (pa === mons[M.PM_GRID_BUG] && magr.mx !== mdef.mx
        && magr.my !== mdef.my)
        return M_ATTK_MISS;

    /* Calculate the armour class differential. */
    tmp = find_mac(mdef) + magr.m_lev;
    if (mdef.mconf || helpless(mdef)) {
        tmp += 4;
        mdef.msleeping = 0;
    }

    /* mundetected monsters become un-hidden if they are attacked */
    if (mdef.mundetected) {
        mdef.mundetected = 0;
        newsym(mdef.mx, mdef.my);
        if (canseemon(mdef) && !sensemon(mdef)) {
            if (Unaware()) {
                const justone = (mdef.data.geno & G_UNIQ) !== 0;
                let montype;

                montype = noname_monnam(mdef, justone ? ARTICLE_THE
                                                      : ARTICLE_NONE);
                if (!justone)
                    montype = makeplural(montype);
                await You_mp(`dream of ${montype}.`);
            } else {
                if (game.iflags.last_msg === PLNMSG_HIDE_UNDER
                    && mdef.m_id === game.last_hider)
                    await pline(`${Monnam(mdef)} emerges from hiding.`); /* pline_mon() */
                else if (mdef.m_id === game.last_hider)
                    await You_mp(`notice ${mon_nam(mdef)}.`);
                else
                    await pline(`Suddenly, you notice ${a_monnam(mdef)}.`);
            }
        }
    }

    /* Elves hate orcs. */
    if (is_elf(pa) && is_orc(pd))
        tmp++;

    /* Set up the visibility of action */
    game.mhitm_vis = ((cansee(magr.mx, magr.my) && canspotmon(magr))
                      || (cansee(mdef.mx, mdef.my) && canspotmon(mdef)));

    /* Set flag indicating monster has moved this turn. */
    magr.mlstmv = game.moves;

    game.skipdrin = false;

    /* Now perform all attacks for the monster. */
    for (i = 0; i < NATTK; i++) {
        res[i] = M_ATTK_MISS;

        /* target might no longer be there */
        if (i > 0 && (m_at(game.bhitpos.x, game.bhitpos.y) !== mdef
                      || DEADMONSTER(magr) || DEADMONSTER(mdef)))
            continue;

        mattk = getmattk(magr, mdef, i, res);
        if (game.skipdrin && mattk.aatyp === AT_TENT
            && mattk.adtyp === M.AD_DRIN)
            continue;
        mwep = null;
        attk = 1;

        switch (mattk.aatyp) {
        case AT_WEAP: /* "hand to hand" attacks */
            if (distmin(magr.mx, magr.my, mdef.mx, mdef.my) > 1) {
                /* D: Do a ranged attack here! */
                strike = (await thrwmm(magr, mdef) === M_ATTK_MISS) ? 0 : 1;
                if (strike)
                    /* don't really know if we hit or not; pretend we did */
                    res[i] |= M_ATTK_HIT;
                if (DEADMONSTER(mdef))
                    res[i] = M_ATTK_DEF_DIED;
                if (DEADMONSTER(magr))
                    res[i] |= M_ATTK_AGR_DIED;
                break;
            }
            if (magr.weapon_check === NEED_WEAPON || !magr.mw) {
                magr.weapon_check = NEED_HTH_WEAPON;
                if (await mon_wield_item(magr) !== 0)
                    return M_ATTK_MISS;
            }
            await possibly_unwield(magr, false);
            if ((mwep = magr.mw || null) != null) {
                if (game.mhitm_vis)
                    await mswingsm(magr, mdef, mwep);
                tmp += hitval(mwep, mdef);
            }
            /* FALLTHRU */
        case AT_CLAW:
        case AT_KICK:
        case AT_BITE:
        case AT_STNG:
        case AT_TUCH:
        case AT_BUTT:
        case AT_TENT:
            if (mattk.aatyp === AT_KICK && mtrapped_in_pit(magr))
                continue;
            /* Nymph that teleported away on first attack? */
            if (distmin(magr.mx, magr.my, mdef.mx, mdef.my) > 1)
                /* Continue because the monster may have a ranged attack. */
                continue;
            /* Monsters won't attack cockatrices physically if they
             * have a weapon instead.  This instinct doesn't work for
             * players, or under conflict or confusion.
             */
            if (!magr.mconf && !Conflict() && mwep && mattk.aatyp !== AT_WEAP
                && touch_petrifies(mdef.data)) {
                strike = 0;
                break;
            }
            dieroll = rnd(20 + i);
            strike = (tmp > dieroll);
            /* KMH -- don't accumulate to-hit bonuses */
            if (mwep)
                tmp -= hitval(mwep, mdef);
            if (strike) {
                /* for eel AT_TUCH+AD_WRAP attack: can't grab an unsolid
                   target; the unsolid test is redundant since failed_grab
                   checks it too, but is cheap and avoids calling failed_grab
                   for ordinary targets */
                if (unsolid(mdef.data) && await failed_grab(magr, mdef, mattk)) {
                    strike = 0;
                    break;
                }
                res[i] = await hitmm(magr, mdef, mattk, mwep, dieroll);
                if ((mdef.data === mons[M.PM_BLACK_PUDDING]
                     || mdef.data === mons[M.PM_BROWN_PUDDING])
                    && (mwep && (objects[mwep.otyp].oc_material === IRON
                                 || objects[mwep.otyp].oc_material === METAL))
                    && mdef.mhp > 1 && !mdef.mcan) {
                    let mclone;

                    if ((mclone = await clone_mon(mdef, 0, 0)) != null) {
                        if (game.mhitm_vis && canspotmon(mdef))
                            await pline(`${Monnam(mdef)} divides as ${mon_nam(magr)} hits it!`); /* pline_mon() */
                        await mintrap(mclone, NO_TRAP_FLAGS);
                        if (DEADMONSTER(magr))
                            res[i] |= M_ATTK_AGR_DIED;
                    }
                }
            } else
                await missmm(magr, mdef, mattk);
            break;

        case AT_BREA:
        case AT_SPIT:
            /*
             * Ranged attacks aren't allowed at point blank range.
             *
             * That impacts pet use of ranged attacks.  It's rather arbitrary
             * but various parts of the code assume it to be the case, not to
             * mention a part of player tactics when fighting dragons.
             */
            if (!monnear(magr, mdef.mx, mdef.my)) {
                const mmtmp = ((mattk.aatyp === AT_BREA)
                               ? await breamm(magr, mattk, mdef)
                               : await spitmm(magr, mattk, mdef));

                strike = (mmtmp === M_ATTK_MISS) ? 0 : 1;
                /* We don't really know if we hit or not; pretend we did. */
                if (strike)
                    res[i] |= M_ATTK_HIT;
                if (DEADMONSTER(mdef))
                    res[i] = M_ATTK_DEF_DIED;
                if (DEADMONSTER(magr))
                    res[i] |= M_ATTK_AGR_DIED;
            } else {
                strike = 0;
                attk = 0;
            }
            break;

        case AT_NONE:
        case M.AT_MAGC: /* C: default: no attack */
            strike = 0;
            attk = 0;
            break;

        default:
            throw new Error(`mattackm(): attack type ${mattk.aatyp} not ported yet`);
        }

        if (attk && !(res[i] & M_ATTK_AGR_DIED)
            && distmin(magr.mx, magr.my, mdef.mx, mdef.my) <= 1)
            res[i] = await passivemm(magr, mdef, strike,
                                     (res[i] & M_ATTK_DEF_DIED), mwep);

        if (res[i] & M_ATTK_DEF_DIED)
            return res[i];
        if (res[i] & M_ATTK_AGR_DIED)
            return res[i];
        /* return if aggressor can no longer attack */
        if ((res[i] & M_ATTK_AGR_DONE) || helpless(magr))
            return res[i];
        /* eg. defender was knocked into a level teleport trap */
        if (mon_offmap(mdef))
            return res[i];
        if (res[i] & M_ATTK_HIT)
            struck = 1; /* at least one hit */
    } /* for (;i < NATTK;) loop */

    return (struck ? M_ATTK_HIT : M_ATTK_MISS);
}

// C ref: mhitm.c hitmm()
async function hitmm(magr, mdef, mattk, mwep, dieroll) {
    const weaponhit = (mattk.aatyp === AT_WEAP
                       || (mattk.aatyp === AT_CLAW && mwep)),
        silverhit = (weaponhit && mwep
                     && objects[mwep.otyp].oc_material === SILVER);
    pre_mm_attack(magr, mdef);

    const compat = !magr.mcan ? could_seduce(magr, mdef, mattk) : 0;
    if (!compat && await shade_miss(magr, mdef, mwep, false, game.mhitm_vis))
        return M_ATTK_MISS; /* bypass mdamagem() */

    if (game.mhitm_vis) {
        const magr_name = Monnam(magr);
        let buf = '';
        if (compat) {
            buf = `${magr_name} ${mdef.mcansee ? "smiles at" : "talks to"}`;
            await pline(`${buf} ${mon_nam(mdef)} ${
                (compat === 2) ? "engagingly" : "seductively"}.`);
        } else {
        switch (mattk.aatyp) {
        case AT_BITE:
            buf = `${magr_name} bites`;
            break;
        case AT_STNG:
            buf = `${magr_name} stings`;
            break;
        case AT_BUTT:
            buf = `${magr_name} butts`;
            break;
        case AT_TUCH:
            buf = `${magr_name} touches`;
            break;
        case AT_TENT:
            buf = `${s_suffix_sm(magr_name)} tentacles suck`;
            break;
        case AT_HUGS:
            if (magr !== game.u.ustuck) {
                buf = `${magr_name} squeezes`;
                break;
            }
            /* FALLTHRU */
        default:
            if (!weaponhit || !mwep || !mwep.oartifact)
                buf = `${magr_name} hits`;
            break;
        }
        if (buf)
            await pline(`${buf} ${mon_nam_too(mdef, magr)}.`);

        if (mon_hates_silver(mdef) && silverhit)
            throw new Error('hitmm(): silver sears message not ported yet');
        }
    } else
        await noises(magr, mattk);

    return await mdamagem(magr, mdef, mattk, mwep, dieroll);
}

// C ref: uhitm.c mhitm_ad_phys(), monster-vs-monster part
async function mhitm_ad_phys(magr, mattk, mdef, mhm) {
    const pd = mdef.data;
    let mwep = magr.mw || null;

    if (mattk.aatyp !== AT_WEAP && mattk.aatyp !== AT_CLAW)
        mwep = null;

    const vis = canseemon(magr) && canseemon(mdef);

    if (await shade_miss(magr, mdef, mwep, false, vis)) {
        mhm.damage = 0;
    } else if (mattk.aatyp === AT_KICK && (pd.mflags1 & M.M1_THICK_HIDE)) {
        /* [no 'kicking boots' check needed; monsters with kick attacks
           can't wear boots and monsters that wear boots don't kick] */
        mhm.damage = 0;
    } else if (mwep) { /* non-Null 'mwep' implies AT_WEAP || AT_CLAW */
        let marmg;

        if (mwep.otyp === CORPSE
            && touch_petrifies(mons[mwep.corpsenm]))
            throw new Error('mhitm_ad_phys(): do_stone_mon() not ported yet');

        mhm.damage += dmgval(mwep, mdef);
        if ((marmg = which_armor(magr, W_ARMG)) != null
            && marmg.otyp === GAUNTLETS_OF_POWER)
            mhm.damage += rn1(4, 3); /* 3..6 */
        if (mhm.damage < 1) /* is this necessary?  mhitu.c has it... */
            mhm.damage = 1;
        if (mwep.oartifact) {
            /* when magr's weapon is an artifact, caller suppressed its
               usual 'hit' message in case artifact_hit() delivers one;
               now we'll know and might need to deliver skipped message
               (note: if there's no message there'll be no auxiliary
               damage so the message here isn't coming too late) */
            const dmgp = { val: mhm.damage };
            const arthit = await artifact_hit(magr, mdef, mwep, dmgp, mhm.dieroll);
            mhm.damage = dmgp.val;
            if (!arthit) {
                if (vis)
                    await pline(`${Monnam(magr)} hits ${mon_nam_too(mdef, magr)}.`); /* pline_mon() */
                mhm.hitflags |= M_ATTK_HIT;
            }
            /* artifact_hit updates 'tmp' but doesn't inflict any
               damage; however, it might cause carried items to be
               destroyed and they might do so */
            if (DEADMONSTER(mdef)) {
                mhm.hitflags = (M_ATTK_DEF_DIED
                                | ((await grow_up(magr, mdef)) ? 0
                                   : M_ATTK_AGR_DIED));
                mhm.done = true;
                return;
            }
        }
        if (mhm.damage)
            await rustm(mdef, mwep);
        if ((mwep.otrapped /* opoisoned */ || permapoisoned(mwep)) && !rn2(4))
            throw new Error('mhitm_ad_phys(): mhitm_really_poison() not ported yet');
    } else if (magr.data === mons[M.PM_PURPLE_WORM]
               && pd === mons[M.PM_SHRIEKER]) {
        /* hack to enhance mm_aggression(); we don't want purple
           worm's bite attack to kill a shrieker because then it
           won't swallow the corpse; but if the target survives,
           the subsequent engulf attack should accomplish that */
        if (mhm.damage >= mdef.mhp && mdef.mhp > 1)
            mhm.damage = mdef.mhp - 1;
    }
}

// C ref: mhitm.c rustm()
export async function rustm(mdef, obj) {
    let dmgtyp = -1 /* ERODE_NONE */, chance = 1;

    if (!mdef || !obj)
        return; /* just in case */
    /* AD_ACID and AD_ENCH are handled in passivemm() and passiveum() */
    if (dmgtype(mdef.data, M.AD_CORR)) {
        dmgtyp = ERODE_CORRODE;
    } else if (dmgtype(mdef.data, M.AD_RUST)) {
        dmgtyp = ERODE_RUST;
    } else if (dmgtype(mdef.data, M.AD_FIRE)
               /* steam vortex: fire resist applies, fire damage doesn't */
               && mdef.data !== mons[M.PM_STEAM_VORTEX]) {
        dmgtyp = ERODE_BURN;
        chance = 6;
    }

    if (dmgtyp !== -1 && !rn2(chance))
        await erode_obj(obj, null, dmgtyp, EF_GREASE | EF_VERBOSE);
}

// C ref: mhitm.c mswingsm()
async function mswingsm(
    magr,  /* attacker */
    mdef,  /* defender */
    otemp) /* attacker's weapon */
{
    if (game.flags.verbose && !Blind() && mon_visible(magr)) {
        const bash = (is_pole(otemp) && otemp.oartifact !== ART_SNICKERSNEE
                      && (dist2(magr.mx, magr.my, mdef.mx, mdef.my)
                          <= 2));

        await pline(`${Monnam(magr)} ${mswings_verb(otemp, bash)} ${
            (otemp.quan > 1) ? "one of " : ""}${mhis(magr)} ${xname(otemp)} at ${
            mon_nam(mdef)}.`);
    }
}

// C ref: uhitm.c mhitm_ad_sedu(), monster-vs-monster part
/* seduce and also steal item */
async function mhitm_ad_sedu(magr, mattk, mdef, mhm) {
    const pa = magr.data;
    let obj = null;

    void mattk;
    if (magr.mcan)
        return;
    /* find an object to steal, non-cursed if magr is tame;
       C walks mdef->minvent from its head, the newest object, and
       JS minvent arrays are oldest first */
    for (const o of (mdef.minvent || []).slice().reverse())
        if (!magr.mtame || !o.cursed) {
            obj = o;
            break;
        }

    if (obj) {
        let onambuf = '';

        /* make a special x_monnam() call that never omits
           the saddle, and save it for later messages */
        const mdefnambuf = x_monnam(mdef, ARTICLE_THE, null, 0, false);

        if (game.u.usteed === mdef && obj === which_armor(mdef, W_SADDLE))
            /* "You can no longer ride <steed>." */
            await dismount_steed(DISMOUNT_POLY);
        extract_from_minvent(mdef, obj, true, false);
        /* add_to_minv() might free 'obj' [if it merges] */
        if (game.mhitm_vis)
            onambuf = doname(obj);
        add_to_minv(magr, obj);
        const buf = Monnam(magr);
        if (game.mhitm_vis && canseemon(mdef)) {
            await pline(`${buf} steals ${onambuf} from ${mdefnambuf}!`);
        }
        await possibly_unwield(mdef, false);
        mdef.mstrategy &= ~STRAT_WAITFORU;
        await mselftouch(mdef, null, false);
        if (DEADMONSTER(mdef)) {
            mhm.hitflags = (M_ATTK_DEF_DIED
                            | ((await grow_up(magr, mdef)) ? 0
                               : M_ATTK_AGR_DIED));
            mhm.done = true;
            return;
        }
        if (pa.mlet === M.S_NYMPH && !await tele_restrict(magr)) {
            const couldspot = canspotmon(magr);

            mhm.hitflags = M_ATTK_AGR_DONE;
            await rloc(magr, RLOC_NOMSG);
            /* TODO: use RLOC_MSG instead? */
            if (game.mhitm_vis && couldspot && !canspotmon(magr))
                await pline(`${buf} suddenly disappears!`);
        }
    }
    mhm.damage = 0;
}

// C ref: uhitm.c mhitm_ad_ssex(), monster-vs-monster part
async function mhitm_ad_ssex(magr, mattk, mdef, mhm) {
    /* mhitm */
    await mhitm_ad_sedu(magr, mattk, mdef, mhm);
    if (mhm.done)
        return;
}


// C ref: uhitm.c mhitm_adtyping()
async function mhitm_adtyping(magr, mattk, mdef, mhm) {
    switch (mattk.adtyp) {
    case AD_PHYS:
        await mhitm_ad_phys(magr, mattk, mdef, mhm);
        break;
    case AD_SSEX: await mhitm_ad_ssex(magr, mattk, mdef, mhm); break;
    case AD_STCK: await mhitm_ad_stck(magr, mattk, mdef, mhm); break;
    case M.AD_SITM:
    case M.AD_SEDU: await mhitm_ad_sedu(magr, mattk, mdef, mhm); break;
    default:
        /* the rest of C's switch: uhitm.js mhitm_adtyping() dispatches to
           the mhitm_ad_*() handlers (unported mhitm branches stop there) */
        await mhitm_adtyping_uh(magr, mattk, mdef, mhm);
        break;
    }
}

// C ref: mhitm.c mdamagem()
async function mdamagem(magr, mdef, mattk, mwep, dieroll) {
    const pd = mdef.data;
    const mhm = {
        damage: d(mattk.damn, mattk.damd),
        hitflags: M_ATTK_MISS,
        permdmg: 0,
        specialdmg: 0,
        dieroll,
        done: false,
    };

    if (touch_petrifies(pd)
        || (mattk.adtyp === AD_DGST && pd === mons[M.PM_MEDUSA]))
        throw new Error('mdamagem(): petrification not ported yet');

    await mhitm_adtyping(magr, mattk, mdef, mhm);

    if (await mhitm_knockback(magr, mdef, mattk, mhm, !!magr.mw)
        && ((mhm.hitflags & (M_ATTK_DEF_DIED | M_ATTK_HIT)) !== 0
            || mon_offmap(mdef)))
        return mhm.hitflags;

    if (mhm.done)
        return mhm.hitflags;

    if (!mhm.damage)
        return mhm.hitflags;

    mdef.mhp -= mhm.damage;
    if (mdef.mhp < 1) {
        if (m_at(mdef.mx, mdef.my) === magr) /* see gulpmm() */
            throw new Error('mdamagem(): engulfed defender dying not ported yet');
        if (mattk.aatyp === AT_WEAP || mattk.aatyp === AT_CLAW) {
            /* troll_baned(mdef, mwep) */
            if (mdef.data.mlet === M.S_TROLL && mwep)
                throw new Error('mdamagem(): troll_baned() not ported yet');
            game.mkcorpstat_norevive = false;
        }
        game.zombify = (!mwep && zombie_maker(magr)
                        && (mattk.aatyp === AT_TUCH
                            || mattk.aatyp === AT_CLAW
                            || mattk.aatyp === AT_BITE)
                        && zombie_form(mdef.data) !== NON_PM_MP);
        await monkilled(mdef, '', mattk.adtyp);
        game.zombify = false; /* reset */
        game.mkcorpstat_norevive = false;
        if (!DEADMONSTER(mdef))
            return mhm.hitflags; /* mdef lifesaved */
        else if (mhm.hitflags === M_ATTK_AGR_DIED)
            return (M_ATTK_DEF_DIED | M_ATTK_AGR_DIED);

        if (mattk.adtyp === AD_DGST)
            throw new Error('mdamagem(): digestion after kill not ported yet');
        /* caveat: above digestion handling doesn't keep `pa' up to date */

        return (M_ATTK_DEF_DIED
                | ((await grow_up(magr, mdef)) ? 0 : M_ATTK_AGR_DIED));
    }
    return (mhm.hitflags === M_ATTK_AGR_DIED) ? M_ATTK_AGR_DIED : M_ATTK_HIT;
}

// C ref: mhitm.c passivemm()
async function passivemm(magr, mdef, mhitb, mdead, mwep) {
    const mddat = mdef.data;
    const madat = magr.data;
    let i, tmp;
    const mhit = mhitb ? M_ATTK_HIT : M_ATTK_MISS;

    for (i = 0; ; i++) {
        if (i >= NATTK)
            return (mdead | mhit); /* no passive attacks */
        if (mddat.mattk[i].aatyp === AT_NONE)
            break;
    }
    if (mddat.mattk[i].damn)
        tmp = d(mddat.mattk[i].damn, mddat.mattk[i].damd);
    else if (mddat.mattk[i].damd)
        tmp = d(mddat.mlevel + 1, mddat.mattk[i].damd);
    else
        tmp = 0;

    /* These affect the enemy even if defender killed */
    switch (mddat.mattk[i].adtyp) {
    case M.AD_ACID:
        if (mhitb && !rn2(2)) {
            const buf = Monnam(magr);
            if (canseemon(magr))
                await pline(`${buf} is splashed by ${s_suffix_sm(mon_nam(mdef))} ${
                    hliquid("acid")}!`);
            if (resists_acid(magr)) {
                if (canseemon(magr))
                    await pline(`${Monnam(magr)} is not affected.`);
                tmp = 0;
            }
        } else
            tmp = 0;
        if (!rn2(30))
            await erode_armor(magr, ERODE_CORRODE);
        if (!rn2(6))
            await acid_damage(magr.mw || null); /* MON_WEP(magr) */
        return assess_dmg();
    case M.AD_ENCH: /* KMH -- remove enchantment (disenchanter) */
        if (mhitb && !mdef.mcan && mwep) {
            drain_item(mwep, false);
            /* No message */
        }
        break;
    default:
        break;
    }
    if (mdead || mdef.mcan)
        return (mdead | mhit);

    /* These affect the enemy only if defender is still alive */
    if (rn2(3))
        switch (mddat.mattk[i].adtyp) {
        case M.AD_PLYS: /* Floating eye */
            if (tmp > 127)
                tmp = 127;
            if (mddat === mons[M.PM_FLOATING_EYE]) {
                if (!rn2(4))
                    tmp = 127;
                if (magr.mcansee && haseyes(madat) && mdef.mcansee
                    && (perceives(madat) || !mdef.minvis)) {
                    /* construct format string; guard against '%' in Monnam */
                    let buf = s_suffix_sm(Monnam(mdef));
                    buf += " gaze is reflected by %s %s.";
                    if (await mon_reflects(magr,
                                           canseemon(magr) ? buf : null))
                        return (mdead | mhit);
                    buf = Monnam(magr);
                    if (canseemon(magr))
                        await pline(`${buf} is frozen by ${s_suffix_sm(mon_nam(mdef))} gaze!`);
                    paralyze_monst(magr, tmp);
                    return (mdead | mhit);
                }
            } else { /* gelatinous cube */
                const buf = Monnam(magr);
                if (canseemon(magr))
                    await pline(`${buf} is frozen by ${mon_nam(mdef)}.`);
                paralyze_monst(magr, tmp);
                return (mdead | mhit);
            }
            return 1;
        case M.AD_COLD:
            if (resists_cold(magr)) {
                if (canseemon(magr)) {
                    await pline(`${Monnam(magr)} is mildly chilly.`); /* pline_mon() */
                    await golemeffects(magr, M.AD_COLD, tmp);
                }
                tmp = 0;
                break;
            }
            if (canseemon(magr))
                await pline(`${Monnam(magr)} is suddenly very cold!`); /* pline_mon() */
            healmon(mdef, Math.trunc(tmp / 2), Math.trunc(tmp / 2));
            if (mdef.mhpmax > ((mdef.m_lev + 1) * 8))
                await split_mon(mdef, magr);
            break;
        case M.AD_STUN:
            if (!magr.mstun) {
                magr.mstun = 1;
                if (canseemon(magr))
                    await pline(`${Monnam(magr)} ${makeplural(stagger(magr.data, "stagger"))}...`); /* pline_mon() */
            }
            tmp = 0;
            break;
        case M.AD_FIRE:
            if (resists_fire(magr)) {
                if (canseemon(magr)) {
                    await pline(`${Monnam(magr)} is mildly warmed.`); /* pline_mon() */
                    await golemeffects(magr, M.AD_FIRE, tmp);
                }
                tmp = 0;
                break;
            }
            if (canseemon(magr))
                await pline(`${Monnam(magr)} is suddenly very hot!`); /* pline_mon() */
            break;
        case M.AD_ELEC:
            if (resists_elec(magr)) {
                if (canseemon(magr)) {
                    await pline(`${Monnam(magr)} is mildly tingled.`); /* pline_mon() */
                    await golemeffects(magr, M.AD_ELEC, tmp);
                }
                tmp = 0;
                break;
            }
            if (canseemon(magr))
                await pline(`${Monnam(magr)} is jolted with electricity!`); /* pline_mon() */
            break;
        default:
            tmp = 0;
            break;
        }
    else
        tmp = 0;

    return assess_dmg();

    /* assess_dmg: (C's goto label) */
    async function assess_dmg() {
        if ((magr.mhp -= tmp) <= 0) {
            await monkilled(magr, '', mddat.mattk[i].adtyp);
            return (mdead | mhit | M_ATTK_AGR_DIED);
        }
        return (mdead | mhit);
    }
}

// C ref: mhitm.c mon_poly()
/* monster or hero hit by a polymorph attack (genetic engineer) */
export async function mon_poly(magr, mdef, dmg) {
    const freaky = " undergoes a freakish metamorphosis";
    const oldform = mdef.data;
    const u = game.u;

    if (mdef === game.youmonst) {
        const up = (p) => !!(u.uprops[p]?.intrinsic || u.uprops[p]?.extrinsic);
        if (up(ANTIMAGIC_MP)) { /* Antimagic */
            /* shieldeff(u.ux, u.uy): transient display only */
        } else if (up(UNCHANGING_MP)) { /* Unchanging */
            ; /* just take a little damage */
        } else {
            /* system shock might take place in polyself() */
            if ((u.ulycn ?? NON_PM_MP) === NON_PM_MP) {
                await You_mp("are subjected to a freakish metamorphosis.");
                await polyself_mp(POLY_NOFLAGS_MP);
            } else if (u.umonnum !== u.ulycn) {
                await You_feel_mp("an unnatural urge coming on.");
                throw new Error('mon_poly(): you_were() not ported yet');
            } else {
                await You_feel_mp("a natural urge coming on.");
                throw new Error('mon_poly(): you_unwere() not ported yet');
            }
            dmg = 0;
        }
    } else {
        const Before = Monnam(mdef);

        if (resists_magm_mp(mdef)) {
            /* Magic resistance */
            /* if (gv.vis) shieldeff_mon(mdef): transient display only */
        } else if (resist_mp(mdef, WAND_CLASS_MP, 0, TELL_MP)) {
            /* general resistance to magic... */
            ;
        } else if (!rn2(25) && mdef.cham === NON_PM_MP
                   && (mdef.mcan
                       || pm_to_cham_mp(monsndx_mp(mdef.data)) !== NON_PM_MP)) {
            /* system shock; this variation takes away half of mon's HP
               rather than kill outright */
            if (game.mhitm_vis)
                await pline(`${Before} shudders!`);

            dmg += Math.trunc((mdef.mhpmax + 1) / 2);
            mdef.mhp -= dmg;
            dmg = 0;
            if (mdef.mhp < 1) { /* DEADMONSTER(mdef) */
                if (magr === game.youmonst)
                    await xkilled_mp(mdef, XKILL_GIVEMSG_MP | XKILL_NOCORPSE_MP);
                else
                    await monkilled(mdef, "", AD_RBRE_MP);
            }
        } else if (await newcham_mp(mdef, null, NO_NC_FLAGS_MP)) {
            if (game.mhitm_vis) { /* either seen or adjacent */
                const was_seen = Before.toLowerCase() !== "it", /* strcmpi() */
                      verbosely = game.flags.verbose || !was_seen;

                if (canspotmon(mdef))
                    await pline(`${Before}${verbosely ? freaky : ""}${
                        verbosely ? " and" : ""} turns into ${
                        x_monnam(mdef, ARTICLE_A_MP, null,
                                 (SUPPRESS_NAME_MP | SUPPRESS_IT_MP
                                  | SUPPRESS_INVISIBLE_MP), false)}.`);
                else if (was_seen || magr === game.youmonst)
                    await pline(`${Before}${freaky}${
                        !was_seen ? "" : " and disappears"}.`);
            }
            dmg = 0;
            if (can_teleport_mp(magr.data)) {
                if (magr === game.youmonst)
                    await tele_mp();
                else if (!(await tele_restrict(magr)))
                    await rloc(magr, RLOC_MSG_MP);
            }
        } else {
            if (game.mhitm_vis && game.flags.verbose)
                await pline(nothing_happens_mp);
        }
    }
    /* when a transformation has happened, can't attack again for poly
       effect during next turn or two; not enforced for poly'd hero */
    if (mdef.data !== oldform && magr !== game.youmonst)
        magr.mspec_used += rnd(2);

    return dmg;
}

// C ref: mhitm.c paralyze_monst()
export function paralyze_monst(mon, amt) {
    if (amt > 127)
        amt = 127;

    mon.mcanmove = 0;
    mon.mfrozen = amt;
    mon.meating = 0; /* terminate any meal-in-progress */
    mon.mstrategy &= ~STRAT_WAITFORU;
}

// C ref: mhitm.c slept_monst() -- sleeping grabber releases, engulfer
// doesn't; don't use for paralysis!
export async function slept_monst(mon) {
    if (helpless(mon) && mon === game.u.ustuck
        && !sticks(game.youmonst.data) && !game.u.uswallow) {
        await pline(`${s_suffix_sm(Monnam(mon))} grip relaxes.`); /* pline_mon() */
        await unstuck_sm(mon);
    }
}

// C ref: mhitm.c attk_protection()
/* "aggressive defense"; what type of armor prevents specified attack
   from touching its target? */
export function attk_protection(aatyp) {
    let w_mask = 0;

    switch (aatyp) {
    case AT_NONE_AP:
    case AT_SPIT_AP:
    case AT_EXPL_AP:
    case AT_BOOM_AP:
    case AT_GAZE_AP:
    case AT_BREA_AP:
    case AT_MAGC_AP:
        w_mask = ~0; /* special case; no defense needed */
        break;
    case AT_CLAW_AP:
    case AT_TUCH_AP:
    case AT_WEAP_AP:
        w_mask = W_ARMG_AP; /* caller needs to check for weapon */
        break;
    case AT_KICK_AP:
        w_mask = W_ARMF_AP;
        break;
    case AT_BUTT_AP:
        w_mask = W_ARMH_AP;
        break;
    case AT_HUGS_AP:
        w_mask = (W_ARMC_AP | W_ARMG_AP); /* attacker needs both to be protected */
        break;
    case AT_BITE_AP:
    case AT_STNG_AP:
    case AT_ENGL_AP:
    case AT_TENT_AP:
    default:
        w_mask = 0; /* no defense available */
        break;
    }
    return w_mask;
}

// C ref: mhitm.c mdisplacem()
/* monster attempting to displace another monster out of its way */
export async function mdisplacem(magr, mdef, quietly) {
    let pa, pd;
    let tx, ty, fx, fy;

    /* sanity checks; could matter if we unexpectedly get a long worm */
    if (!magr || !mdef || magr === mdef)
        return M_ATTK_MISS;
    pa = magr.data, pd = mdef.data;
    tx = mdef.mx, ty = mdef.my; /* destination */
    fx = magr.mx, fy = magr.my; /* current location */
    if (m_at(fx, fy) !== magr || m_at(tx, ty) !== mdef)
        return M_ATTK_MISS;

    /* The 1 in 7 failure below matches the chance in do_attack()
     * for pet displacement.
     */
    if (!rn2(7))
        return M_ATTK_MISS;

    /* Grid bugs cannot displace at an angle. */
    if (pa === mons[M.PM_GRID_BUG] && magr.mx !== mdef.mx
        && magr.my !== mdef.my)
        return M_ATTK_MISS;

    /* undetected monster becomes un-hidden if it is displaced */
    if (mdef.mundetected)
        mdef.mundetected = 0;
    if (mdef.m_ap_type && mdef.m_ap_type !== M_AP_MONSTER_MD)
        seemimic_md(mdef);
    /* wake up the displaced defender */
    mdef.msleeping = 0;
    mdef.mstrategy &= ~STRAT_WAITMASK_MD;
    finish_meating_md(mdef);

    /*
     * Set up the visibility of action.
     * You can observe monster displacement if you can see both of
     * the monsters involved.
     */
    game.vis = (canspotmon_md(magr) && canspotmon_md(mdef));

    if (touch_petrifies_md(pd) && !resists_ston_md(magr)) {
        if (!which_armor_md(magr, W_ARMG_MD))
            /* poly_when_stoned()/mon_to_stone(), monstone() */
            throw new Error('mdisplacem(): displacing a petrifier not ported yet');
    }

    /* remove_monster(fx, fy); pick up from orig position --
       game.level.monsters is a list keyed by mx/my, so place_monster()
       moving it is enough */
    if (mdef.wormno)
        remove_worm_md(mdef);
    /* else remove_monster(tx, ty) */
    place_monster_md(magr, tx, ty); /* put down at target spot */
    place_monster_md(mdef, fx, fy);
    if (mdef.wormno) /* now put down tail */
        place_worm_tail_randomly_md(mdef, fx, fy);
    /* either creature might move into or out of a poison gas cloud */
    update_monster_region_md(magr);
    update_monster_region_md(mdef);

    if (game.vis && !quietly)
        await pline(`${Monnam(magr)} moves ${mon_nam(mdef)} out of ${
            is_rider_md(pa) ? "the" : mhis_md(magr)} way!`);
    newsym_md(fx, fy);  /* see it       */
    newsym_md(tx, ty);  /*   all happen */
    await flush_screen_md(0); /* make sure it shows up */

    return M_ATTK_HIT;
}
/* C ref: mondata.h is_rider() */
function is_rider_md(ptr) {
    return ptr === mons[M.PM_DEATH] || ptr === mons[M.PM_FAMINE]
        || ptr === mons[M.PM_PESTILENCE];
}
