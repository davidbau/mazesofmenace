// mhitm.js — one monster attacking another.
// C ref: src/mhitm.c
//
// This is the monster-vs-monster twin of js/uhitm.js. A pet attacking a newt
// runs through here, which is why it matters well before the hero fights
// anything unusual: dog_move()'s attack branch and pet_ranged_attk() both end
// in mattackm(), and until that lands a pet that decides to attack does
// nothing instead.
//
// Ported so far: the three leaves below. mattackm() itself, hitmm(), mdamagem()
// and passivemm() are NOT here yet -- see docs/plan/STATUS.md for the sizing.

import { game } from './gstate.js';
import { Deaf } from './youprop.js';
import { You_hear } from './pline.js';
import { M_AP_TYPE, NORMAL_SPEED } from './const.js';
import { ATTKS } from './monst_data.js';
import { resist_conflict } from './mondata.js';
import { seemimic, set_ustuck } from './mon.js';
import { newsym, canspotmon, pline } from './display.js';
import { mdistu, monnear, itsstuck } from './monmove.js';
import { engulfing_u } from './const.js';
import { Monnam, mon_nam_too } from './do_name.js';
import { could_seduce, getmattk, mswings_verb } from './mhitu.js';
import { MON_WEP, DEADMONSTER } from './monst.js';
import { hitval, mon_wield_item, possibly_unwield } from './weapon.js';
import { mon_nam } from './do_name.js';
import { xname } from './objnam.js';
import { pronoun_gender } from './mondata.js';
import { genders } from './role_data.js';
import { mon_visible } from './display.js';
import { NEED_WEAPON, NEED_HTH_WEAPON, PRONOUN_HALLU,
         P_POLEARMS } from './const.js';
import { ONAMES } from './objects_data.js';
import { dist2 } from './hacklib.js';
import { rn2, rnd, d } from './rng.js';
import { helpless } from './monst.js';
import { PMNAMES, MFLAGS } from './monst_data.js';
import { find_mac } from './worn.js';
import { canseemon, sensemon } from './display.js';
import { cansee } from './vision.js';
import { m_at, monkilled } from './mon.js';
import { touch_petrifies } from './dog.js';
import { is_orc, unsolid, resists_ston } from './mondata.js';
import { distmin, s_suffix } from './hacklib.js';
import { mhitm_ad_phys, mhitm_knockback } from './uhitm.js';
import { grow_up } from './makemon.js';
import { M_ATTK_MISS, M_ATTK_HIT, M_ATTK_DEF_DIED, M_ATTK_AGR_DIED, M_ATTK_AGR_DONE } from './const.js';

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

// src/display.c:378 map_invisible() — remember an unseen monster as 'I'.
//
// Needs the glyph layer (GLYPH_INVISIBLE and show_glyph), which is not ported,
// so it is recorded rather than guessed. Painting the wrong thing here would
// put an 'I' on the map that C does not put there, or miss one it does.
function map_invisible(x, y) {
    (game.unported ||= new Set()).add('display:map_invisible');
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

    for (let i = 0; i < 6; i++) {
        res[i] = M_ATTK_MISS;

        /* target might no longer be there */
        if (i > 0 && (m_at(game.bhitpos?.x ?? mdef.mx,
                           game.bhitpos?.y ?? mdef.my) !== mdef
                      || magr.mhp <= 0 || mdef.mhp <= 0))
            continue;

        const mattk = getmattk(magr, mdef, i, res);
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
            possibly_unwield(magr, false);
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
                if (unsolid(pd)) {
                    /* failed_grab: eel wrap vs unsolid target */
                    note_unported_mhitm('mattackm:failed_grab');
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
            if (strike)
                res[i] = await hitmm(magr, mdef, mattk, null, 0);
            break;

        case A.AT_GAZE: case A.AT_EXPL: case A.AT_ENGL:
        case A.AT_BREA: case A.AT_SPIT: case A.AT_MAGC:
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
            && distmin(magr.mx, magr.my, mdef.mx, mdef.my) <= 1)
            res[i] = await passivemm(magr, mdef, !!strike,
                                     (res[i] & M_ATTK_DEF_DIED), mwep);

        if (res[i] & M_ATTK_DEF_DIED)
            return res[i];
        if (res[i] & M_ATTK_AGR_DIED)
            return res[i];
        if ((res[i] & M_ATTK_AGR_DONE) || helpless(magr))
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

    if (touch_petrifies(pd) && !resists_ston(magr))
        note_unported_mhitm('mdamagem:petrify_agr');

    /* mhitm_adtyping: dispatch on the damage type */
    if (mattk[1] === A.AD_PHYS) {
        await mhitm_ad_phys(magr, mattk, mdef, mhm);
    } else {
        note_unported_mhitm(`mdamagem:adtyp=${mattk[1]}`);
    }

    if (mhitm_knockback(magr, mdef, mattk, mhm, !!mwep)
        && ((mhm.hitflags & (M_ATTK_DEF_DIED | M_ATTK_HIT)) !== 0))
        return mhm.hitflags;

    if (mhm.done)
        return mhm.hitflags;

    if (!mhm.damage)
        return mhm.hitflags;

    mdef.mhp -= mhm.damage;
    if (mdef.mhp < 1) {
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
