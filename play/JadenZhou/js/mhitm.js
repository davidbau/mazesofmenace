// mhitm.js — monster-vs-monster melee: mattackm(), hitmm(), missmm(),
// mdamagem(), passivemm(), noises(), pre_mm_attack(); plus the small
// helpers they need (getmattk(), find_mac(), mhitm_knockback(),
// mhitm_ad_phys(), max_passive_dmg()).  Paths that aren't ported yet
// throw a 'not ported yet' error instead of skipping their rolls.

import { game } from './gstate.js';
import { rn2, rnd, rn1, d } from './rng.js';
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
import { STRAT_WAITFORU } from './const.js';
import { mons, AT_NONE, AT_CLAW, AT_BITE, AT_KICK, AT_BUTT, AT_TUCH,
         AT_STNG, AT_HUGS, AT_ENGL, AT_TENT, AT_WEAP, AT_EXPL, AT_BOOM,
         AT_BREA, AT_SPIT,
         AD_PHYS, AD_SSEX, AD_DISE, AD_PEST, AD_FAMN, AD_DREN, AD_STCK,
         AD_POLY, AD_DGST, G_UNIQ } from './monsters.js';
import * as M from './monsters.js';
import { find_mac, which_armor } from './worn.js';
import { mon_wield_item, possibly_unwield, hitval, dmgval } from './weapon.js';
import { mswings_verb, mhis } from './mhitu.js';
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

function helpless(mon) { return !!(mon.msleeping || !mon.mcanmove); }
/* C ref: youprop.h Conflict, Blind */
function Conflict() {
    const p = game.u.uprops[CONFLICT];
    return !!(p.intrinsic || p.extrinsic);
}
function Blind() {
    const p = game.u.uprops[BLINDED];
    return !!((p.intrinsic || p.extrinsic) && !p.blocked);
}
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
function DEADMONSTER(mon) { return mon.mhp < 1; }
// C ref: monst.h mon_offmap()
function mon_offmap(mon) {
    return ((mon.mstate || 0) & (0x01 | 0x02 | 0x04 | 0x08)) !== 0;
}
function Deaf() { return false; }
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
// C ref: mondata.c sticks()
function sticks(ptr) {
    return attacktype(ptr, AT_ENGL) || attacktype(ptr, AT_HUGS)
        || ptr.mattk.some((a) => a.adtyp === AD_STCK);
}


/* C ref: worn.c find_mac() lives in worn.js */
export { find_mac };

// C ref: mhitu.c getmattk()
function getmattk(magr, mdef, indx, prev_result) {
    const mptr = magr.data;
    const attk = mptr.mattk[indx];
    if (mptr.mattk[0].adtyp === AD_SSEX || attk.adtyp === AD_SSEX)
        throw new Error('getmattk(): seduction attacks not ported yet');
    if ((indx > 0 && prev_result[indx - 1] > M_ATTK_MISS
         && (attk.adtyp === AD_DISE || attk.adtyp === AD_PEST
             || attk.adtyp === AD_FAMN)
         && attk.adtyp === mptr.mattk[indx - 1].adtyp)
        || attk.adtyp === AD_DREN
        || (magr.mspec_used && (attk.aatyp === AT_ENGL
                                || attk.aatyp === AT_HUGS
                                || attk.adtyp === AD_STCK
                                || attk.adtyp === AD_POLY))
        || attk.aatyp === M.AT_MAGC)
        throw new Error('getmattk(): attack substitution not ported yet');
    return attk;
}

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
        /* could_seduce() is false: seduction attacks throw in getmattk() */
        await pline(`${Monnam(magr)} misses ${mon_nam_too(mdef, magr)}.`);
    } else {
        await noises(magr, mattk);
    }
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
    if (mdef.mundetected)
        throw new Error('mattackm(): unhiding defender not ported yet');

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
            if (mattk.aatyp === AT_KICK && magr.mtrapped)
                throw new Error('mattackm(): mtrapped_in_pit() not ported yet');
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
                if (unsolid(mdef.data))
                    throw new Error('mattackm(): failed_grab() not ported yet');
                res[i] = await hitmm(magr, mdef, mattk, mwep, dieroll);
                if ((mdef.data === mons[M.PM_BLACK_PUDDING]
                     || mdef.data === mons[M.PM_BROWN_PUDDING])
                    && (mwep && (objects[mwep.otyp].oc_material === IRON
                                 || objects[mwep.otyp].oc_material === METAL))
                    && mdef.mhp > 1 && !mdef.mcan)
                    throw new Error('mattackm(): clone_mon() not ported yet');
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
    /* compat: could_seduce() is 0 (seduction throws in getmattk()) */
    pre_mm_attack(magr, mdef);

    if (mdef.data === mons[M.PM_SHADE])
        throw new Error('hitmm(): shade_miss() not ported yet');

    if (game.mhitm_vis) {
        const magr_name = Monnam(magr);
        let buf = '';
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
            throw new Error('hitmm(): s_suffix() not ported yet');
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
    } else
        await noises(magr, mattk);

    return await mdamagem(magr, mdef, mattk, mwep, dieroll);
}

// C ref: uhitm.c mhitm_ad_phys(), monster-vs-monster part
function mhitm_ad_phys(magr, mattk, mdef, mhm) {
    const pd = mdef.data;
    let mwep = magr.mw || null;

    if (mattk.aatyp !== AT_WEAP && mattk.aatyp !== AT_CLAW)
        mwep = null;

    if (pd === mons[M.PM_SHADE]) {
        throw new Error('mhitm_ad_phys(): shade_miss() not ported yet');
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
        if (mwep.oartifact)
            throw new Error('mhitm_ad_phys(): artifact_hit() not ported yet');
        if (mhm.damage)
            rustm(mdef, mwep);
        if ((mwep.opoisoned || permapoisoned(mwep)) && !rn2(4))
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
export function rustm(mdef, obj) {
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
        throw new Error('rustm(): erode_obj() not ported yet');
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

// C ref: uhitm.c mhitm_adtyping()
function mhitm_adtyping(magr, mattk, mdef, mhm) {
    switch (mattk.adtyp) {
    case AD_PHYS:
        mhitm_ad_phys(magr, mattk, mdef, mhm);
        break;
    default:
        throw new Error(`mhitm_adtyping(): damage type ${mattk.adtyp} not ported yet`);
    }
}

// C ref: uhitm.c mhitm_knockback(), monster-vs-monster subset
function mhitm_knockback(magr, mdef, mattk, hitflags, weapon_used) {
    const knockdistance = rn2(3) ? 1 : 2; /* 67%: 1 step, 33%: 2 steps */
    let chance = 6; /* 1/6 chance of attack knocking back a monster */
    const wep = weapon_used ? magr.mw : null;

    if (wep && wep.oartifact)
        throw new Error('mhitm_knockback(): artifact weapons not ported yet');

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

    const defx = mdef.mx, defy = mdef.my;
    const dx = sgn(defx - magr.mx);
    const dy = sgn(defy - magr.my);

    if (!isok(defx + dx, defy + dy))
        return false;
    if (IS_DOOR(game.level.at(defx, defy).typ)
        && (defx - magr.mx && defy - magr.my))
        throw new Error('mhitm_knockback(): doorless_door() not ported yet');

    /* monsters must be alive */
    if (DEADMONSTER(magr) || DEADMONSTER(mdef))
        return false;

    /* attacker must be much larger than defender */
    if (!(magr.data.msize > (mdef.data.msize + 1)))
        return false;

    void knockdistance; void hitflags;
    throw new Error('mhitm_knockback(): knockback hurtle not ported yet');
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

    mhitm_adtyping(magr, mattk, mdef, mhm);

    if (mhitm_knockback(magr, mdef, mattk, mhm, !!magr.mw)
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
        if (!mwep && zombie_maker(magr)
            && (mattk.aatyp === AT_TUCH
                || mattk.aatyp === AT_CLAW
                || mattk.aatyp === AT_BITE))
            throw new Error('mdamagem(): zombie_form() not ported yet');
        game.zombify = false;
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
    let i, tmp;
    const mhit = mhitb ? M_ATTK_HIT : M_ATTK_MISS;

    void mwep;
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
    case M.AD_ENCH:
        throw new Error('passivemm(): acid/disenchant passives not ported yet');
    default:
        break;
    }
    if (mdead || mdef.mcan)
        return (mdead | mhit);

    /* These affect the enemy only if defender is still alive */
    if (rn2(3))
        switch (mddat.mattk[i].adtyp) {
        case M.AD_PLYS:
        case M.AD_COLD:
        case M.AD_STUN:
        case M.AD_FIRE:
        case M.AD_ELEC:
            throw new Error('passivemm(): elemental passives not ported yet');
        default:
            tmp = 0;
            break;
        }
    else
        tmp = 0;

    /* assess_dmg: */
    if ((magr.mhp -= tmp) <= 0) {
        await monkilled(magr, '', mddat.mattk[i].adtyp);
        return (mdead | mhit | M_ATTK_AGR_DIED);
    }
    return (mdead | mhit);
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
        && !sticks(game.youmonst.data) && !game.u.uswallow)
        throw new Error('slept_monst(): grip relaxes (unstuck()) not ported yet');
}
