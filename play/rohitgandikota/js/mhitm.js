// mhitm.js — one monster attacking another.
// C ref: src/mhitm.c
//
// This is the monster-vs-monster twin of js/uhitm.js. A pet attacking a newt
// runs through here, which is why it matters well before the hero fights
// anything unusual: dog_move()'s attack branch and pet_ranged_attk() both end
// in mattackm(), and until that lands a pet that decides to attack does
// nothing instead.
//
// The ordinary attack loop and several elemental and special damage paths are
// ported below. Gaze, explosion, breath, and spell branches remain recorded in
// the coverage ledger until their C behavior is implemented.

import { unstuck } from './mon.js';
import { pline_mon } from './pline.js';
import { sticks } from './mondata.js';
import { some_mon_nam } from './do_name.js';
import { mhitm_ad_poly } from './uhitm.js';
import { MONSYMS } from './monst_data.js';
import { finish_meating } from './dogmove.js';
import { tele, tele_restrict, rloc } from './teleport.js';
import { OCLASSES } from './objects_data.js';
import { x_monnam } from './do_name.js';
import { monsndx } from './makemon.js';
import { resist } from './zap.js';
import { shieldeff_mon, xkilled, newcham, pm_to_cham } from './mon.js';
import { resists_magm, can_teleport, resists_sleep, defended } from './mondata.js';
import { NON_PM, POLY_NOFLAGS, TELL, NOTELL, NO_NC_FLAGS, XKILL_GIVEMSG, XKILL_NOCORPSE, ARTICLE_A, SUPPRESS_NAME, SUPPRESS_IT, SUPPRESS_INVISIBLE, RLOC_MSG, nothing_happens, M_AP_FURNITURE, M_AP_OBJECT } from './const.js';
import { you_were, you_unwere } from './were.js';
import { polyself } from './polyself.js';
import { You_feel } from './pline.js';
import { shieldeff } from './display.js';
import { Antimagic, Unchanging } from './youprop.js';
import { game } from './gstate.js';
import { Deaf } from './youprop.js';
import { You, You_hear } from './pline.js';
import { M_AP_TYPE, NORMAL_SPEED } from './const.js';
import { ATTKS } from './monst_data.js';
import { resist_conflict } from './mondata.js';
import { seemimic, set_ustuck } from './mon.js';
import { newsym, canspotmon, pline, map_invisible } from './display.js';
import { mdistu, monnear, itsstuck } from './monmove.js';
import { engulfing_u } from './const.js';
import { Monnam, mon_nam_too } from './do_name.js';
import { could_seduce, getmattk, mswings_verb } from './mhitu.js';
import { MON_WEP, DEADMONSTER, mon_offmap } from './monst.js';
import { hitval, mon_wield_item, possibly_unwield } from './weapon.js';
import { mon_nam } from './do_name.js';
import { xname } from './objnam.js';
import { pronoun_gender } from './mondata.js';
import { genders } from './role_data.js';
import { mon_visible } from './display.js';
import { NEED_WEAPON, NEED_HTH_WEAPON, PRONOUN_HALLU,
         P_POLEARMS, IS_OBSTRUCTED, IS_TREE, IRONBARS,
         MM_IGNOREWATER, W_ARMG } from './const.js';
import { ONAMES } from './objects_data.js';
import { dist2 } from './hacklib.js';
import { rn2, rnd, d } from './rng.js';
import { helpless } from './monst.js';
import { PMNAMES, MFLAGS } from './monst_data.js';
import { find_mac } from './worn.js';
import { canseemon, sensemon } from './display.js';
import { cansee } from './vision.js';
import { m_at, monkilled, monstone } from './mon.js';
import { touch_petrifies } from './dog.js';
import { is_orc, unsolid, resists_ston, is_whirly, passes_walls,
         poly_when_stoned } from './mondata.js';
import { distmin, s_suffix } from './hacklib.js';
import { mhitm_ad_phys, mhitm_ad_fire, mhitm_ad_cold, mhitm_ad_elec,
         mhitm_ad_acid, mhitm_ad_drst, mhitm_ad_blnd,
         mhitm_ad_sedu, mhitm_ad_drli, mhitm_ad_drin,
         mhitm_ad_ston, mhitm_ad_wrap, mhitm_ad_heal,
         mhitm_ad_plys, mhitm_ad_slee, attk_protection,
         mhitm_knockback } from './uhitm.js';
import { grow_up, goodpos, remove_monster, place_monster } from './makemon.js';
import { M_ATTK_MISS, M_ATTK_HIT, M_ATTK_DEF_DIED, M_ATTK_AGR_DIED, M_ATTK_AGR_DONE } from './const.js';
import { spitmm } from './mthrowu.js';
import { closed_door } from './cmd.js';
import { minstapetrify } from './trap.js';

// src/mhitm.c:27 noises() — the message when a fight happens out of sight.
//
// The rate limit is the interesting part and it is stateful in a way that is
// easy to drop: a noise is reported only when the far/near classification
// CHANGES, or when more than 10 moves have passed since the last one. So a
// long brawl in the next room produces one message, not one per blow.
//
// gf.far_noise and gn.noisetime are C globals; they live on `game` here.
export async function noises(magr, mattk) {
    const farq = (mdistu(magr) > 15);

    if (!Deaf() && (farq !== (game.far_noise ?? false)
                    || game.moves - (game.noisetime | 0) > 10)) {
        game.far_noise = farq;
        game.noisetime = game.moves;
        await You_hear(
            ((mattk.aatyp === ATTKS.AT_EXPL) ? 'an explosion' : 'some noises')
            + (farq ? ' in the distance' : '') + '.');
    }
}

// src/mhitm.c:40 pre_mm_attack() — bring both parties out of hiding.
//
// C's comment is worth keeping: this happens even when the hero cannot see it,
// "because the formerly concealed monster is now in action". A mimic that
// attacks stops being a mimic whether or not anyone is watching.
//
// Note `showit` is only ever set when gv.vis is already true, so the newsym()
// calls it guards are for the case where the hero CAN see the square but the
// creature was concealed a moment ago.
export function pre_mm_attack(magr, mdef) {
    let showit = false;

    /* unhiding or unmimicking happens even if hero can't see it
       because the formerly concealed monster is now in action */
    if (M_AP_TYPE(mdef)) {
        seemimic(mdef);
        showit ||= game.vis;
    } else if (mdef.mundetected) {
        mdef.mundetected = 0;
        showit ||= game.vis;
    }
    if (M_AP_TYPE(magr)) {
        seemimic(magr);
        showit ||= game.vis;
    } else if (magr.mundetected) {
        magr.mundetected = 0;
        showit ||= game.vis;
    }

    if (game.vis) {
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

// src/mhitm.c:76 missmm() — feedback for a monster-vs-monster attack that misses.
//
// The seduction arm is not a flavour detail: could_seduce() decides between
// "misses" and "pretends to be friendly to", and a mcan'd (cancelled) monster
// always misses regardless.
export async function missmm(magr, mdef, mattk) {
    pre_mm_attack(magr, mdef);

    if (game.vis) {
        await pline(`${Monnam(magr)} ${
            (magr.mcan || !could_seduce(magr, mdef, mattk))
                ? 'misses' : 'pretends to be friendly to'
        } ${mon_nam_too(mdef, magr)}.`);
    } else {
        await noises(magr, mattk);
    }
}

// include/mondata.h is_elf()
const is_elf = (ptr) => (ptr.mflags2 & MFLAGS.M2_ELF) !== 0;

/* getmattk() lives in src/mhitu.c and is shared with mattacku(); it is
   imported from js/mhitu.js above. */

// src/mhitm.c:106 fightm() — have monsters fight each other under
// Conflict. Returns 1 if mtmp made an attack (it might have died).
export async function fightm(mtmp) {
    /* perhaps the monster will resist Conflict */
    if (resist_conflict(mtmp))
        return 0;

    if (game.u.ustuck === mtmp) {
        /* perhaps we're holding it... */
        if (await itsstuck(mtmp))
            return 0;
    }
    const has_u_swallowed = engulfing_u(mtmp);

    const roster = (game.level?.monsters || []).slice();
    for (const mon of roster) {
        /* Be careful to ignore monsters that are already dead, since we
         * might be calling this before we've cleaned them up.  This can
         * happen if the monster attacked a cockatrice bare-handedly, for
         * instance.
         */
        if (mon !== mtmp && !DEADMONSTER(mon)) {
            if (monnear(mtmp, mon.mx, mon.my)) {
                if (!game.u.uswallow && mtmp === game.u.ustuck) {
                    if (!rn2(4)) {
                        set_ustuck(null);
                        await pline(`${Monnam(mtmp)} releases you!`);
                    } else
                        break;
                }

                /* mtmp can be killed */
                game.bhitpos = { x: mon.mx, y: mon.my };
                game.notonhead = false;
                const result = await mattackm(mtmp, mon);

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
                    && rn2(4) && mon.movement > rn2(NORMAL_SPEED)) {
                    if (mon.movement > NORMAL_SPEED)
                        mon.movement -= NORMAL_SPEED;
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

// src/mhitm.c:293 mattackm() — one monster performs all its attacks on
// another. Returns the M_ATTK_* result bits.
//
// The melee arms (claw/kick/bite/sting/touch/butt/tentacle and the hug
// follow-up) are ported in full; weapon, gaze, explosion, engulf, breath,
// spit and magic attacks need subsystems that are absent and are recorded
// when a monster with one gets this far.
export async function mattackm(magr, mdef) {
    const A = ATTKS;
    const res = new Array(6).fill(M_ATTK_MISS);
    let struck = 0;

    if (!magr || !mdef)
        return M_ATTK_MISS;
    if (helpless(magr))
        return M_ATTK_MISS;
    const pa = game.mons[magr.mnum], pd = game.mons[mdef.mnum];

    /* Grid bugs cannot attack at an angle. */
    if (pa === game.mons[PMNAMES.PM_GRID_BUG] && magr.mx !== mdef.mx
        && magr.my !== mdef.my)
        return M_ATTK_MISS;

    /* Calculate the armour class differential. */
    let tmp = find_mac(mdef) + magr.m_lev;
    if (mdef.mconf || helpless(mdef)) {
        tmp += 4;
        mdef.msleeping = 0;
    }

    /* mundetected monsters become un-hidden if they are attacked */
    if (mdef.mundetected) {
        mdef.mundetected = 0;
        newsym(mdef.mx, mdef.my);
        if (canseemon(mdef) && !sensemon(mdef))
            note_unported_mhitm('mattackm:unhide_msg');
    }

    /* Elves hate orcs. */
    if (is_elf(pa) && is_orc(pd))
        tmp++;

    /* Set up the visibility of action */
    game.vis = ((cansee(magr.mx, magr.my) && canspotmon(magr))
                || (cansee(mdef.mx, mdef.my) && canspotmon(mdef)));

    /* the attack out of sequence still counts as this round's move */
    magr.mlstmv = game.moves;
    game.skipdrin = false;

    for (let i = 0; i < 6; i++) {
        res[i] = M_ATTK_MISS;

        /* target might no longer be there */
        if (i > 0 && (m_at(game.bhitpos?.x ?? mdef.mx,
                           game.bhitpos?.y ?? mdef.my) !== mdef
                      || magr.mhp <= 0 || mdef.mhp <= 0))
            continue;

        const mattk = getmattk(magr, mdef, i, res);
        if (game.skipdrin && mattk[0] === A.AT_TENT
            && mattk[1] === A.AD_DRIN) {
            continue;
        }
        let mwep = null;
        let attk = 1;
        let strike = 0;
        let dieroll;

        switch (mattk[0]) {
        case A.AT_WEAP:
            if (distmin(magr.mx, magr.my, mdef.mx, mdef.my) > 1) {
                /* D: Do a ranged attack here! — thrwmm needs the throwing
                   subsystem */
                note_unported_mhitm('mattackm:thrwmm');
                strike = 0;
                attk = 0;
                break;
            }
            if (magr.weapon_check === NEED_WEAPON || !MON_WEP(magr)) {
                magr.weapon_check = NEED_HTH_WEAPON;
                if (await mon_wield_item(magr) !== 0)
                    return M_ATTK_MISS;
            }
            await possibly_unwield(magr, false);
            if ((mwep = MON_WEP(magr)) != null) {
                if (game.vis)
                    await mswingsm(magr, mdef, mwep);
                tmp += hitval(mwep, mdef);
            }
            /*FALLTHRU*/
        case A.AT_CLAW: case A.AT_KICK: case A.AT_BITE: case A.AT_STNG:
        case A.AT_TUCH: case A.AT_BUTT: case A.AT_TENT:
            if (mattk[0] === A.AT_KICK
                && (game.level?.traps || []).some(t => t.tx === magr.mx
                        && t.ty === magr.my && magr.mtrapped))
                continue;
            /* Nymph that teleported away on first attack? */
            if (distmin(magr.mx, magr.my, mdef.mx, mdef.my) > 1)
                continue;
            /* Monsters won't attack cockatrices physically if they
             * have a weapon instead.  This instinct doesn't work for
             * players, or under conflict or confusion.
             */
            if (!magr.mconf && !game.u.uprops?.CONFLICT && mwep
                && mattk[0] !== A.AT_WEAP && touch_petrifies(pd)) {
                strike = 0;
                break;
            }
            dieroll = rnd(20 + i);
            strike = (tmp > dieroll) ? 1 : 0;
            /* KMH -- don't accumulate to-hit bonuses */
            if (mwep)
                tmp -= hitval(mwep, mdef);
            if (strike) {
                if (unsolid(pd) && await failed_grab(magr, mdef, mattk)) {
                    strike = 0;
                    break;
                }
                res[i] = await hitmm(magr, mdef, mattk, mwep, dieroll);
            } else {
                await missmm(magr, mdef, mattk);
            }
            break;

        case A.AT_HUGS:
            strike = (i >= 2 && res[i - 1] === M_ATTK_HIT
                      && res[i - 2] === M_ATTK_HIT) ? 1 : 0;
            if (strike) {
                if (await failed_grab(magr, mdef, mattk))
                    strike = 0;
                else
                    res[i] = await hitmm(magr, mdef, mattk, null, 0);
            }
            break;

        case A.AT_SPIT:
            if (!monnear(magr, mdef.mx, mdef.my)) {
                const mmtmp = await spitmm(magr, mattk, mdef);
                strike = (mmtmp === M_ATTK_MISS) ? 0 : 1;
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

        case A.AT_ENGL:
            if (mdef.mnum === PMNAMES.PM_SHADE) {
                if (game.vis) {
                    await pline(`${s_suffix(Monnam(magr))} attempt to engulf ${
                        mon_nam(mdef)} is futile.`);
                }
                strike = 0;
                break;
            }
            if (game.u.usteed && mdef === game.u.usteed) {
                strike = 0;
                break;
            }
            if (distmin(magr.mx, magr.my, mdef.mx, mdef.my) > 1)
                continue;
            if (engulfing_u(magr)) {
                strike = 0;
            } else if ((strike = tmp > rnd(20 + i) ? 1 : 0)) {
                if (await failed_grab(magr, mdef, mattk)) {
                    strike = 0;
                } else {
                    res[i] = await gulpmm(magr, mdef, mattk);
                }
            } else {
                await missmm(magr, mdef, mattk);
            }
            break;

        case A.AT_GAZE: case A.AT_EXPL:
        case A.AT_BREA: case A.AT_MAGC:
            note_unported_mhitm(`mattackm:aatyp=${mattk[0]}`);
            strike = 0;
            attk = 0;
            break;

        default: /* no attack */
            strike = 0;
            attk = 0;
            break;
        }

        if (attk && !(res[i] & M_ATTK_AGR_DIED)
            && distmin(magr.mx, magr.my, mdef.mx, mdef.my) <= 1) {
            res[i] = await passivemm(magr, mdef, !!strike,
                                     (res[i] & M_ATTK_DEF_DIED), mwep);
        }

        if (res[i] & M_ATTK_DEF_DIED)
            return res[i];
        if (res[i] & M_ATTK_AGR_DIED)
            return res[i];
        if ((res[i] & M_ATTK_AGR_DONE) || helpless(magr))
            return res[i];
        if (mon_offmap(mdef))
            return res[i];
        if (res[i] & M_ATTK_HIT)
            struck = 1;
    }

    return struck ? M_ATTK_HIT : M_ATTK_MISS;
}

// src/mhitm.c:1283 mswingsm() — one monster swings its weapon at another.
async function mswingsm(magr, mdef, otemp) {
    if (game.flags?.verbose && !game.u.ublind && mon_visible(magr)) {
        const bash = (is_pole_mm(otemp)
                      && (dist2(magr.mx, magr.my, mdef.mx, mdef.my) <= 2));
        await pline(`${Monnam(magr)} ${mswings_verb(otemp, bash)} ${
            ((otemp.quan ?? 1) > 1) ? 'one of ' : ''}${mhis_mm(magr)} ${
            xname(otemp)} at ${mon_nam(mdef)}.`);
    }
}

/* include/obj.h is_pole() — C also excludes ART_SNICKERSNEE, a katana that
   is_pole() already rejects. */
function is_pole_mm(obj) {
    return game.objects[obj.otyp].oc_skill === P_POLEARMS
           || obj.otyp === ONAMES.LANCE;
}

// include/you.h:324 mhis()
const mhis_mm = (mtmp) => genders[pronoun_gender(mtmp, PRONOUN_HALLU)].his;

// src/mhitm.c:644 hitmm() — a monster's attack lands: the message, then
// mdamagem() for the damage. The seduction, shade and silver arms are gated
// on monster types that record when reached.
export async function hitmm(magr, mdef, mattk, mwep, dieroll) {
    const A = ATTKS;
    pre_mm_attack(magr, mdef);

    const compat = !magr.mcan ? could_seduce(magr, mdef, mattk) : 0;
    if (game.vis && compat) {
        await pline(`${Monnam(magr)} ${mdef.mcansee ? 'smiles at' : 'talks to'} ${
            mon_nam(mdef)} ${compat === 2 ? 'engagingly' : 'seductively'}.`);
    } else if (game.vis) {
        let buf = '';
        switch (mattk[0]) {
        case A.AT_BITE: buf = `${Monnam(magr)} bites`; break;
        case A.AT_STNG: buf = `${Monnam(magr)} stings`; break;
        case A.AT_BUTT: buf = `${Monnam(magr)} butts`; break;
        case A.AT_TUCH: buf = `${Monnam(magr)} touches`; break;
        case A.AT_TENT: buf = `${s_suffix(Monnam(magr))} tentacles suck`;
            break;
        case A.AT_HUGS: buf = `${Monnam(magr)} squeezes`; break;
        default: buf = `${Monnam(magr)} hits`; break;
        }
        await pline(`${buf} ${mon_nam_too(mdef, magr)}.`);
    } else if (!game.vis) {
        await noises(magr, mattk);
    }
    return await mdamagem(magr, mdef, mattk, mwep, dieroll);
}

function engulfSquareAllowed(mon, x, y, otherData) {
    const loc = game.level?.at(x, y);
    if (!loc || passes_walls(mon.data))
        return !!loc;
    return !IS_OBSTRUCTED(loc.typ) && !closed_door(x, y)
           && !IS_TREE(loc.typ)
           && !(loc.typ === IRONBARS && !is_whirly(otherData));
}

// src/mhitm.c:807 engulf_target(), the shared size, trap, and terrain gate
// used before one monster can move onto another monster's square.
function engulf_target(magr, mdef) {
    if (mdef.data.msize >= MFLAGS.MZ_HUGE
        || (magr.data.msize < mdef.data.msize && !is_whirly(magr.data)))
        return false;
    if (mdef.mtrapped || magr.mtrapped)
        return false;
    return engulfSquareAllowed(mdef, mdef.mx, mdef.my, magr.data)
           && engulfSquareAllowed(magr, magr.mx, magr.my, mdef.data);
}

function engulfVerb(ptr) {
    for (const attack of ptr.mattk || []) {
        if (attack[0] !== ATTKS.AT_ENGL)
            continue;
        if (attack[1] === ATTKS.AD_DGST)
            return ['swallows', 'regurgitated'];
        if (attack[1] === ATTKS.AD_WRAP)
            return ['encloses', 'released'];
    }
    return ['engulfs', 'expelled'];
}

// src/mhitm.c:849 gulpmm(). Temporarily co-locate the aggressor and defender
// so death, corpse, and display handling see the same map topology as C, then
// restore both monsters when the defender survives.
export async function gulpmm(magr, mdef, mattk) {
    if (!engulf_target(magr, mdef))
        return M_ATTK_MISS;

    const [verb, release] = engulfVerb(magr.data);
    if (game.vis)
        await pline(`${Monnam(magr)} ${verb} ${mon_nam(mdef)}.`);
    if ((mdef.minvent || []).some(obj => obj.lamplit))
        note_unported_mhitm('gulpmm:snuff_lit');

    const ax = magr.mx, ay = magr.my;
    let dx = mdef.mx, dy = mdef.my;
    remove_monster(dx, dy);
    remove_monster(ax, ay);
    place_monster(magr, dx, dy);
    newsym(ax, ay);
    newsym(dx, dy);

    game.mswallower = magr;
    const status = await mdamagem(magr, mdef, mattk, null, 0);
    game.mswallower = null;

    if ((status & (M_ATTK_AGR_DIED | M_ATTK_DEF_DIED))
        === (M_ATTK_AGR_DIED | M_ATTK_DEF_DIED)) {
        return status;
    }
    if (status & M_ATTK_DEF_DIED) {
        if (!goodpos(dx, dy, magr, MM_IGNOREWATER)) {
            if (m_at(dx, dy) === magr) {
                remove_monster(dx, dy);
                newsym(dx, dy);
            }
            dx = ax;
            dy = ay;
        }
        if (m_at(dx, dy) !== magr) {
            place_monster(magr, dx, dy);
            newsym(dx, dy);
        }
        return status;
    }
    if (status & M_ATTK_AGR_DIED) {
        place_monster(mdef, dx, dy);
        newsym(dx, dy);
        return status;
    }

    if (cansee(dx, dy))
        await pline(`${Monnam(mdef)} is ${release}!`);
    remove_monster(dx, dy);
    place_monster(magr, ax, ay);
    place_monster(mdef, dx, dy);
    newsym(ax, ay);
    newsym(dx, dy);
    return status;
}

// src/mhitm.c:1016 mdamagem() — roll the damage, apply the damage-type
// specials, then the hit points. The petrification arm and the non-physical
// damage types are recorded; AD_PHYS runs the real path.
export async function mdamagem(magr, mdef, mattk, mwep, dieroll) {
    const A = ATTKS;
    const pd = game.mons[mdef.mnum];
    const mhm = {
        damage: d(mattk[2], mattk[3]),
        hitflags: M_ATTK_MISS,
        done: false,
    };

    if ((touch_petrifies(pd)
         || (mattk[1] === A.AD_DGST && pd === game.mons[PMNAMES.PM_MEDUSA]))
        && !resists_ston(magr)) {
        const protector = attk_protection(mattk[0]);
        let wornitems = magr.misc_worn_check | 0;
        if (mwep)
            wornitems |= W_ARMG;
        if (protector === 0
            || (protector !== -1
                && (wornitems & protector) !== protector)) {
            if (poly_when_stoned(game.mons[magr.mnum])) {
                await minstapetrify(magr, false);
                return M_ATTK_HIT;
            }
            if (game.vis && canspotmon(magr))
                await pline(`${Monnam(magr)} turns to stone!`);
            await monstone(magr);
            if (!DEADMONSTER(magr))
                return M_ATTK_HIT;
            if (magr.mtame && !game.vis) {
                await You('have a peculiarly sad feeling for a moment, then it passes.');
            }
            return M_ATTK_AGR_DIED;
        }
    }

    /* mhitm_adtyping: dispatch the shared damage-type implementations. */
    if (mattk[1] === A.AD_PHYS) {
        await mhitm_ad_phys(magr, mattk, mdef, mhm);
    } else if (mattk[1] === A.AD_HEAL) {
        await mhitm_ad_heal(magr, mattk, mdef, mhm);
    } else if (mattk[1] === A.AD_PLYS) {
        await mhitm_ad_plys(magr, mattk, mdef, mhm);
    } else if (mattk[1] === A.AD_SLEE) {
        await mhitm_ad_slee(magr, mattk, mdef, mhm);
    } else if (mattk[1] === A.AD_FIRE) {
        await mhitm_ad_fire(magr, mattk, mdef, mhm);
    } else if (mattk[1] === A.AD_COLD) {
        await mhitm_ad_cold(magr, mattk, mdef, mhm);
    } else if (mattk[1] === A.AD_ELEC) {
        await mhitm_ad_elec(magr, mattk, mdef, mhm);
    } else if (mattk[1] === A.AD_ACID) {
        await mhitm_ad_acid(magr, mattk, mdef, mhm);
    } else if (mattk[1] === A.AD_DRST
               || mattk[1] === A.AD_DRDX
               || mattk[1] === A.AD_DRCO) {
        await mhitm_ad_drst(magr, mattk, mdef, mhm);
    } else if (mattk[1] === A.AD_BLND) {
        await mhitm_ad_blnd(magr, mattk, mdef, mhm);
    } else if (mattk[1] === A.AD_DRLI) {
        await mhitm_ad_drli(magr, mattk, mdef, mhm);
    } else if (mattk[1] === A.AD_DRIN) {
        await mhitm_ad_drin(magr, mattk, mdef, mhm);
    } else if (mattk[1] === A.AD_STON) {
        await mhitm_ad_ston(magr, mattk, mdef, mhm);
    } else if (mattk[1] === A.AD_WRAP) {
        await mhitm_ad_wrap(magr, mattk, mdef, mhm);
    } else if (mattk[1] === A.AD_POLY) {
        await mhitm_ad_poly(magr, mattk, mdef, mhm);
    } else if (mattk[1] === A.AD_SITM
               || mattk[1] === A.AD_SEDU
               || mattk[1] === A.AD_SSEX) {
        await mhitm_ad_sedu(magr, mattk, mdef, mhm);
    } else {
        note_unported_mhitm(`mdamagem:adtyp=${mattk[1]}`);
    }

    if (await mhitm_knockback(magr, mdef, mattk, mhm, !!mwep)
        && ((mhm.hitflags & (M_ATTK_DEF_DIED | M_ATTK_HIT)) !== 0))
        return mhm.hitflags;

    if (mhm.done)
        return mhm.hitflags;

    if (!mhm.damage)
        return mhm.hitflags;

    mdef.mhp -= mhm.damage;
    if (mdef.mhp < 1) {
        if (m_at(mdef.mx, mdef.my) === magr) {
            const hp = mdef.mhp;
            remove_monster(mdef.mx, mdef.my);
            mdef.mhp = 1;
            place_monster(mdef, mdef.mx, mdef.my);
            mdef.mhp = hp;
        }
        await monkilled(mdef, '', mattk[1]);
        if (mdef.mhp > 0)
            return mhm.hitflags;        /* mdef lifesaved */
        else if (mhm.hitflags === M_ATTK_AGR_DIED)
            return (M_ATTK_DEF_DIED | M_ATTK_AGR_DIED);

        return (M_ATTK_DEF_DIED
                | (grow_up(magr, mdef) ? 0 : M_ATTK_AGR_DIED));
    }
    return (mhm.hitflags === M_ATTK_AGR_DIED) ? M_ATTK_AGR_DIED : M_ATTK_HIT;
}

// src/mhitm.c:1304 passivemm() — the defender's passive counterattack.
//
// The slot walk lands on the first AT_NONE row, which for a monster without
// a passive attack is an all-zero row: no damage dice, AD_PHYS, so the only
// draw is the rn2(3) gate — one per attack against a live defender. The
// elemental arms are recorded.
export async function passivemm(magr, mdef, mhitb, mdead, mwep) {
    const A = ATTKS;
    const mddat = game.mons[mdef.mnum];
    const mhit = mhitb ? M_ATTK_HIT : M_ATTK_MISS;
    let i;

    for (i = 0;; i++) {
        if (i >= 6)
            return (mdead | mhit); /* no passive attacks */
        if (mddat.mattk[i][0] === A.AT_NONE)
            break;
    }
    let tmp;
    if (mddat.mattk[i][2])
        tmp = d(mddat.mattk[i][2], mddat.mattk[i][3]);
    else if (mddat.mattk[i][3])
        tmp = d(mddat.mlevel + 1, mddat.mattk[i][3]);
    else
        tmp = 0;

    /* These affect the enemy even if defender killed */
    if (mddat.mattk[i][1] === A.AD_ACID) {
        if (mhitb && !rn2(2))
            note_unported_mhitm('passivemm:AD_ACID');
        if (!rn2(30))
            note_unported_mhitm('passivemm:erode_armor');
        if (!rn2(6))
            note_unported_mhitm('passivemm:acid_damage');
        /* goto assess_dmg — the acid passive damage arm */
        if (tmp)
            note_unported_mhitm('passivemm:acid_assess');
        return (mdead | mhit);
    } else if (mddat.mattk[i][1] === A.AD_ENCH) {
        if (mhitb && !mdef.mcan && mwep)
            note_unported_mhitm('passivemm:AD_ENCH');
    }

    if (mdead || mdef.mcan)
        return (mdead | mhit);

    /* These affect the enemy only if defender is still alive */
    if (rn2(3)) {
        switch (mddat.mattk[i][1]) {
        case A.AD_PHYS:
            break;
        default:
            if (mddat.mattk[i][1])
                note_unported_mhitm(`passivemm:adtyp=${mddat.mattk[i][1]}`);
            break;
        }
    }
    return (mdead | mhit);
}

function note_unported_mhitm(what) {
    (game.unported ||= new Set()).add(what);
}

// src/mhitm.c:1118 mon_poly(); magr attacks mdef with AD_POLY; return the
// (possibly changed) damage
export async function mon_poly(magr, mdef, dmg) {
    const freaky = ' undergoes a freakish metamorphosis';
    const oldform = mdef.data;

    if (mdef === game.youmonst) {
        if (Antimagic()) {
            await shieldeff(game.u.ux, game.u.uy);
        } else if (Unchanging()) {
            ; /* just take a little damage */
        } else {
            if (game.u.ulycn === NON_PM) {
                await You('are subjected to a freakish metamorphosis.');
                await polyself(POLY_NOFLAGS);
            } else if (game.u.umonnum !== game.u.ulycn) {
                await You_feel('an unnatural urge coming on.');
                await you_were();
            } else {
                await You_feel('a natural urge coming on.');
                await you_unwere(false);
            }
            dmg = 0;
        }
    } else {
        const Before = Monnam(mdef);

        if (resists_magm(mdef)) {
            if (game.vis)
                await shieldeff_mon(mdef);
        } else if (await resist(mdef, OCLASSES.WAND_CLASS, 0, TELL)) {
            ;
        } else if (!rn2(25) && (mdef.cham ?? NON_PM) === NON_PM
                   && (mdef.mcan
                       || pm_to_cham(monsndx(mdef.data)) !== NON_PM)) {
            /* Chameleons or canceled shapeshifters take extra damage
               rather than kill outright */
            if (game.vis)
                await pline(`${Before} shudders!`);
            dmg += Math.trunc((mdef.mhpmax + 1) / 2);
            mdef.mhp -= dmg;
            dmg = 0;
            if (DEADMONSTER(mdef)) {
                if (magr === game.youmonst)
                    await xkilled(mdef, XKILL_GIVEMSG | XKILL_NOCORPSE);
                else
                    await monkilled(mdef, '', ATTKS.AD_RBRE);
            }
        } else if (newcham(mdef, null, NO_NC_FLAGS)) {
            if (game.vis) { /* either seen or adjacent */
                const was_seen = Before.toLowerCase() !== 'it',
                      verbosely = game.flags.verbose || !was_seen;

                if (canspotmon(mdef))
                    await pline(`${Before}${verbosely ? freaky : ''}${
                        verbosely ? ' and' : ''} turns into ${
                        x_monnam(mdef, ARTICLE_A, null,
                                 (SUPPRESS_NAME | SUPPRESS_IT
                                  | SUPPRESS_INVISIBLE), false)}.`);
                else if (was_seen || magr === game.youmonst)
                    await pline(`${Before}${freaky}${
                        !was_seen ? '' : ' and disappears'}.`);
            }
            dmg = 0;
            if (can_teleport(magr.data)) {
                if (magr === game.youmonst)
                    await tele();
                else if (!(await tele_restrict(magr)))
                    await rloc(magr, RLOC_MSG);
            }
        } else {
            if (game.vis && game.flags.verbose)
                await pline(nothing_happens);
        }
    }
    /* prevent attacker from repeating the attack on the changed form of
       effect during next turn or two; not enforced for poly'd hero */
    if (mdef.data !== oldform && magr !== game.youmonst)
        magr.mspec_used += rnd(2);
    return dmg;
}

// src/mhitm.c:1223 sleep_monst(); Returns 1 if monster fell asleep, 0
// otherwise; how < 0 means the monster resists via resist() is skipped
export async function sleep_monst(mon, amt, how) {
    if (how >= 0 && !mon.msleeping && !mon.mfrozen
        && mon.data.mlet === MONSYMS.S_MIMIC
        && (M_AP_TYPE(mon) === M_AP_FURNITURE
            || M_AP_TYPE(mon) === M_AP_OBJECT))
        seemimic(mon);

    if (resists_sleep(mon) || defended(mon, ATTKS.AD_SLEE)
        || (how >= 0 && await resist(mon, how, 0, NOTELL))) {
        await shieldeff(mon.mx, mon.my);
    } else if (mon.mcanmove) {
        finish_meating(mon); /* terminate any meal-in-progress */
        amt += (mon.mfrozen | 0);
        if (amt > 0) { /* sleep for N turns */
            mon.mcanmove = 0;
            mon.mfrozen = Math.min(amt, 127);
        } else { /* sleep until awakened */
            mon.msleeping = 1;
        }
        return 1;
    }
    return 0;
}

// src/mhitm.c:597 failed_grab(); grabs pass through unsolid targets and
// fail to hold a long worm's tail
export async function failed_grab(magr, mdef, mattk) {
    if ((unsolid(mdef.data) || game.notonhead)
        /* hug attack: most holders (owlbear, python, pit fiend, &c);
           wrap damage: eel grabbing, trapper/lurker-above engulfing;
           stick-to damage: mimic, lichen;
           digestion damage: purple worm swallowing */
        && (mattk[0] === ATTKS.AT_HUGS || mattk[1] === ATTKS.AD_WRAP
            || mattk[1] === ATTKS.AD_STCK  || mattk[1] === ATTKS.AD_DGST)) {
        if ((game.vis && canspotmon(mdef)) /* mon-vs-mon */
            || magr === game.youmonst || mdef === game.youmonst) {
            let magrnam, mdefnam;
            const tailmiss = !!game.notonhead;
            const verb = (mattk[1] === ATTKS.AD_DGST) ? 'gulp'
                         : (mattk[1] === ATTKS.AD_STCK) ? 'adhere'
                           : 'grab';

            magrnam = (magr === game.youmonst) ? 'Your' : s_suffix(Monnam(magr));
            if (!tailmiss) {
                mdefnam = (mdef === game.youmonst) ? 'you' : mon_nam(mdef);
            } else {
                /* hero poly'd into long worm can't grow tail
                   so no 'youmonst' handling is needed here */
                mdefnam = `${s_suffix(some_mon_nam(mdef))} tail`;
            }
            /* unsolid grab misses are actually somewhat iffy--how come
               ordinary attacks don't also pass right through? */
            await pline(`${magrnam.slice(0, 99)} ${verb} attempt ${
                  !tailmiss ? 'passes right through' : 'fails to hold'} ${mdefnam.slice(0, 99)}!`);
        }
        return true;
    }
    return false;
}

// src/mhitm.c slept_monst(); a sleeping or paralyzed holder loses its grip
export async function slept_monst(mon) {
    if (helpless(mon) && mon === game.u.ustuck
        && !sticks(game.youmonst.data) && !game.u.uswallow) {
        await pline_mon(mon, `${s_suffix(Monnam(mon))} grip relaxes.`);
        await unstuck(mon);
    }
}
