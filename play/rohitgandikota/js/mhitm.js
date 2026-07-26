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
import { M_AP_TYPE, M_ATTK_MISS, M_ATTK_HIT, M_ATTK_DEF_DIED } from './const.js';
import { d, rn2 } from './rng.js';
import { mhitm_adtyping, mhitm_knockback } from './uhitm.js';
import { touch_petrifies } from './dog.js';
import { resists_ston } from './mon.js';
import { MON_WEP, mon_offmap } from './monst.js';
import { PMNAMES } from './monst_data.js';
import { helpless, DEADMONSTER } from './monst.js';

import { sensemon, canseemon } from './display.js';
import { m_at, monkilled } from './mon.js';
import { find_mac } from './worn.js';
import { getmattk } from './mhitu.js';
import { hitval } from './weapon.js';
import { distmin } from './hacklib.js';
import { rnd } from './rng.js';
import { unsolid } from './mondata.js';
import { M_ATTK_AGR_DIED } from './const.js';
import { MATTK_AATYP, MATTK_ADTYP, MATTK_DAMN, MATTK_DAMD, NATTK } from './const.js';
import { MATERIALS } from './objects_data.js';
import { shade_miss } from './uhitm.js';
import { s_suffix } from './hacklib.js';
import { mon_hates_silver } from './dog.js';
import { ATTKS } from './monst_data.js';
import { seemimic } from './mon.js';
import { newsym, canspotmon, pline } from './display.js';
import { mdistu } from './monmove.js';
import { Monnam, mon_nam_too } from './do_name.js';
import { could_seduce } from './mhitu.js';

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

    if (!Deaf() && (farq !== game.far_noise || game.moves - (game.noisetime | 0) > 10)) {
        game.far_noise = farq;
        game.noisetime = game.moves;
        await You_hear(
            ((mattk[MATTK_AATYP] === ATTKS.AT_EXPL) ? 'an explosion' : 'some noises')
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

// src/mhitm.c mdamagem() — apply one monster's attack damage to another.
//
// THE FIRST LINE IS THE POINT: d(damn, damd) is the damage roll, and it is
// the first RNG call any monster-vs-monster attack makes. Until this landed
// the whole branch was declined and that draw never happened.
//
// Ported: the roll, the mhitm_data setup, the mhitm_adtyping dispatch, the
// mhitm_knockback call (which draws twice more), and the damage application.
// Recorded: the petrification block, which needs attk_protection/monstone and
// fires only against a petrifying defender, and the death path, which needs
// monkilled.
export function mdamagem(magr, mdef, mattk, mwep, dieroll) {
    const pa = magr.data, pd = mdef.data;
    const mhm = {
        damage: d(mattk[MATTK_DAMN] | 0, mattk[MATTK_DAMD] | 0),
        hitflags: M_ATTK_MISS,
        permdmg: 0,
        specialdmg: 0,
        dieroll: dieroll,
        done: false,
    };

    if ((touch_petrifies(pd)
         || (mattk[MATTK_ADTYP] === ATTKS.AD_DGST && pd.pmidx === PMNAMES.PM_MEDUSA))
        && !resists_ston(magr)) {
        /* attk_protection(), poly_when_stoned(), mon_to_stone() and
           monstone() are unported; the attacker turning to stone is a whole
           death path and is not guessed at. */
        (game.unported ||= new Set()).add('mdamagem:petrify_attacker');
        return M_ATTK_MISS;
    }

    mhitm_adtyping(magr, mattk, mdef, mhm);

    if (mhitm_knockback(magr, mdef, mattk, mhm.hitflags, MON_WEP(magr) !== null)
        && (((mhm.hitflags & (M_ATTK_DEF_DIED | M_ATTK_HIT)) !== 0)
            || mon_offmap(mdef)))
        return mhm.hitflags;

    if (mhm.done)
        return mhm.hitflags;

    if (!mhm.damage)
        return mhm.hitflags;

    mdef.mhp -= mhm.damage;
    if (mdef.mhp < 1) {
        /* src/mhitm.c — the corpse/zombify bookkeeping around this call
           (mkcorpstat_norevive, troll_baned, zombie_form) is still absent
           and records inside monkilled's chain. */
        monkilled(mdef, '', mattk[MATTK_ADTYP]);
        if (!DEADMONSTER(mdef))
            return mhm.hitflags; /* mdef lifesaved */
        return M_ATTK_DEF_DIED;
    }
    return (mhm.hitflags |= M_ATTK_HIT);
}

// src/mhitm.c:644 hitmm() — one monster's attack CONNECTS with another.
//
// The twin of missmm above. It prints the blow, then hands off to mdamagem,
// which is where the damage roll happens.
//
// The message switch is per attack type and the wording is not
// interchangeable: bites, stings, butts, touches and tentacle-sucks each have
// their own verb, AT_HUGS reads "squeezes" unless the attacker already has
// the hero held, and everything else falls through to plain "hits". An
// artifact weapon suppresses the message entirely, because artifact_hit()
// delivers its own.
export function hitmm(magr, mdef, mattk, mwep, dieroll) {
    const weaponhit = (mattk[MATTK_AATYP] === ATTKS.AT_WEAP
                       || (mattk[MATTK_AATYP] === ATTKS.AT_CLAW && mwep));
    const silverhit = !!(weaponhit && mwep
                         && game.objects[mwep.otyp]?.oc_material === MATERIALS.SILVER);

    pre_mm_attack(magr, mdef);

    const compat = !magr.mcan ? could_seduce(magr, mdef, mattk) : 0;
    if (!compat && shade_miss(magr, mdef, mwep, false, game.vis))
        return M_ATTK_MISS; /* bypass mdamagem() */

    if (game.vis) {
        const magr_name = Monnam(magr);
        let buf = '';

        if (compat) {
            /* "%s %s %s." -- smiles at / talks to, then engagingly /
               seductively */
            buf = `${magr_name} ${mdef.mcansee ? 'smiles at' : 'talks to'}`;
            note_mhitm_unported('hitmm:seduce_message');
        } else {
            switch (mattk[MATTK_AATYP]) {
            case ATTKS.AT_BITE: buf = `${magr_name} bites`; break;
            case ATTKS.AT_STNG: buf = `${magr_name} stings`; break;
            case ATTKS.AT_BUTT: buf = `${magr_name} butts`; break;
            case ATTKS.AT_TUCH: buf = `${magr_name} touches`; break;
            case ATTKS.AT_TENT:
                buf = `${s_suffix(magr_name)} tentacles suck`;
                break;
            case ATTKS.AT_HUGS:
                if (magr !== game.u?.ustuck) {
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
                pline(`${buf} ${mon_nam_too(mdef, magr)}.`);

            if (mon_hates_silver(mdef) && silverhit) {
                /* "%s %s sears %s!" -- needs simpleonames() and the
                   himself/his own substitutions */
                note_mhitm_unported('hitmm:silver_sear_message');
            }
        }
    } else {
        noises(magr, mattk);
    }

    return mdamagem(magr, mdef, mattk, mwep, dieroll);
}

function note_mhitm_unported(what) {
    (game.unported ||= new Set()).add(what);
}

// src/mhitm.c:? passivemm() — the DEFENDER's passive counter-attack, run
// after every attack mattackm makes.
//
// Two things here are easy to get wrong.
//
// First, the passive attack is stored in the slot whose aatyp is AT_NONE,
// not in a dedicated field, and the loop scans for it. A monster with no
// such slot -- most monsters, including every early-game pet target --
// returns immediately and DRAWS NOTHING. Rolling unconditionally would add
// a draw to every blow in the game.
//
// Second, when a passive DOES exist the roll has three shapes: d(damn, damd)
// when damn is set, d(mlevel + 1, damd) when only damd is, and 0 when
// neither. The middle one scales with the defender's level and is the one a
// from-memory port would miss.
//
// The per-adtyp switch that follows is recorded by damage type, the same way
// mhitm_adtyping records its arms, so game.unported names which passive was
// reached rather than lumping them together.
export function passivemm(magr, mdef, mhitb, mdead, mwep) {
    const mddat = mdef.data;
    const mhit = mhitb ? M_ATTK_HIT : M_ATTK_MISS;
    let i, tmp;

    for (i = 0; ; i++) {
        if (i >= NATTK)
            return (mdead | mhit); /* no passive attacks */
        if (mddat.mattk[i][MATTK_AATYP] === ATTKS.AT_NONE)
            break;
    }

    const damn = mddat.mattk[i][MATTK_DAMN], damd = mddat.mattk[i][MATTK_DAMD];
    if (damn)
        tmp = d(damn, damd);
    else if (damd)
        tmp = d((mddat.mlevel | 0) + 1, damd);
    else
        tmp = 0;

    const adtyp = mddat.mattk[i][MATTK_ADTYP];
    const adname = Object.entries(ATTKS).find(
        ([n, c]) => n.startsWith('AD_') && c === adtyp)?.[0] ?? 'AD_?';

    /* These affect the enemy even if defender killed. Only AD_ACID and
       AD_ENCH have arms; everything else, AD_PHYS included, falls to
       default and does nothing here. */
    if (adtyp === ATTKS.AD_ACID || adtyp === ATTKS.AD_ENCH)
        (game.unported ||= new Set()).add(`passivemm:always:${adname}`);

    if (mdead || mdef.mcan)
        return (mdead | mhit);

    /* These affect the enemy only if defender is still alive.
       THE rn2(3) IS A DRAW and it happens for EVERY surviving passive,
       whatever the damage type -- the switch inside it is what varies.
       Recording before this roll silently drops one draw from every passive
       counter-attack.

       Only five damage types have an arm here: AD_PLYS, AD_COLD, AD_STUN,
       AD_FIRE and AD_ELEC. Everything else, AD_PHYS included, hits
       `default: tmp = 0` and inflicts nothing -- so recording for those was
       claiming a gap that does not exist. */
    const ALIVE_ARMS = [ATTKS.AD_PLYS, ATTKS.AD_COLD, ATTKS.AD_STUN,
                        ATTKS.AD_FIRE, ATTKS.AD_ELEC];
    if (rn2(3)) {
        if (ALIVE_ARMS.includes(adtyp))
            (game.unported ||= new Set()).add(`passivemm:alive:${adname}`);
        else
            tmp = 0;    /* default: */
    } else {
        tmp = 0;
    }

    /* assess_dmg: the passive damage lands on the ATTACKER, and can kill it */
    if ((magr.mhp -= tmp) <= 0) {
        monkilled(magr, '', adtyp);
        return (mdead | mhit | M_ATTK_AGR_DIED);
    }
    return (mdead | mhit);
}

// src/mhitm.c:? mattackm() — one monster attacks another. THE ENTRY POINT.
//
// Returns M_ATTK_HIT if any of the monster's NATTK attacks connected.
//
// Ported: the whole head, the NATTK loop, getmattk dispatch, the melee arms
// (AT_WEAP falling through to AT_CLAW/KICK/BITE/STNG/TUCH/BUTT/TENT) with
// their to-hit roll, and the passivemm call and result handling that follow
// every attack. Recorded: the ranged and special arms (AT_GAZE, AT_EXPL,
// AT_ENGL, AT_BREA, AT_SPIT), each under its own name.
//
// dieroll = rnd(20 + i) is the to-hit roll and it uses the ATTACK INDEX, so
// later attacks in the same round roll against a wider range. That detail is
// easy to drop and would skew every multi-attack monster.
export function mattackm(magr, mdef) {
    if (!magr || !mdef)
        return M_ATTK_MISS; /* mike@genat */
    if (helpless(magr))
        return M_ATTK_MISS;
    const pa = magr.data, pd = mdef.data;

    /* Grid bugs cannot attack at an angle. */
    if (pa.pmidx === PMNAMES.PM_GRID_BUG
        && magr.mx !== mdef.mx && magr.my !== mdef.my)
        return M_ATTK_MISS;

    /* Calculate the armour class differential. */
    let tmp = find_mac(mdef) + (magr.m_lev | 0);
    if (mdef.mconf || helpless(mdef)) {
        tmp += 4;
        mdef.msleeping = 0;
    }

    /* mundetected monsters become un-hidden if they are attacked */
    if (mdef.mundetected) {
        mdef.mundetected = 0;
        newsym(mdef.mx, mdef.my);
        if (canseemon(mdef) && !sensemon(mdef))
            note_mhitm_unported('mattackm:emerges_message');
    }

    magr.mlstmv = game.moves;
    game.skipdrin = false;

    const res = new Array(NATTK).fill(M_ATTK_MISS);
    let struck = 0;

    /* Now perform all attacks for the monster. */
    for (let i = 0; i < NATTK; i++) {
        res[i] = M_ATTK_MISS;

        /* target might no longer be there */
        if (i > 0 && (m_at(mdef.mx, mdef.my) !== mdef
                      || DEADMONSTER(magr) || DEADMONSTER(mdef)))
            continue;

        const alt_attk = [];
        const mattk = getmattk(magr, mdef, i, res, alt_attk);
        let mwep = null, attk = 1, strike = 0, dieroll = 0;

        switch (mattk[MATTK_AATYP]) {
        case ATTKS.AT_WEAP:
            if ((mwep = MON_WEP(magr)) !== null) {
                if (game.vis)
                    note_mhitm_unported('mattackm:mswingsm');
                tmp += hitval(mwep, mdef);
            }
            /* FALLTHRU */
        case ATTKS.AT_CLAW:
        case ATTKS.AT_KICK:
        case ATTKS.AT_BITE:
        case ATTKS.AT_STNG:
        case ATTKS.AT_TUCH:
        case ATTKS.AT_BUTT:
        case ATTKS.AT_TENT: {
            if (mattk[MATTK_AATYP] === ATTKS.AT_KICK && magr.mtrapped)
                continue;   /* mtrapped_in_pit() unported; mtrapped is its
                               necessary condition, so this is conservative */
            /* Nymph that teleported away on first attack? */
            if (distmin(magr.mx, magr.my, mdef.mx, mdef.my) > 1)
                continue;   /* may still have a ranged attack */
            /* Monsters won't attack cockatrices physically if they
             * have a weapon instead. */
            if (!magr.mconf && mwep
                && mattk[MATTK_AATYP] !== ATTKS.AT_WEAP
                && touch_petrifies(mdef.data)) {
                strike = 0;
                break;
            }
            dieroll = rnd(20 + i);
            strike = (tmp > dieroll) ? 1 : 0;
            /* KMH -- don't accumulate to-hit bonuses */
            if (mwep)
                tmp -= hitval(mwep, mdef);
            if (strike) {
                if (unsolid(mdef.data)) {
                    /* failed_grab() unported */
                    note_mhitm_unported('mattackm:failed_grab');
                }
                res[i] = hitmm(magr, mdef, mattk, mwep, dieroll);
            } else {
                missmm(magr, mdef, mattk);
            }
            break;
        }

        case ATTKS.AT_NONE:
            /* an EMPTY attack slot, not a missing feature. C's switch has no
               case for it and falls to default, which does nothing; recording
               it as unported would put a permanent false entry in the ledger
               for every monster with fewer than NATTK attacks -- which is
               almost all of them. */
            attk = 0;
            break;

        default:
            /* AT_GAZE -> gazemm, AT_EXPL -> explmm, AT_ENGL -> gulpmm,
               AT_BREA/AT_SPIT -> breamm, AT_HUGS. Each records under its own
               name so the reach tool can rank them separately. */
            for (const [name, code] of Object.entries(ATTKS))
                if (name.startsWith('AT_') && code === mattk[MATTK_AATYP]) {
                    note_mhitm_unported(`mattackm:${name}`);
                    break;
                }
            attk = 0;
            break;
        }

        if (attk && !(res[i] & M_ATTK_AGR_DIED)
            && distmin(magr.mx, magr.my, mdef.mx, mdef.my) <= 1)
            res[i] = passivemm(magr, mdef, strike,
                               (res[i] & M_ATTK_DEF_DIED), mwep);

        if (res[i] & M_ATTK_DEF_DIED)
            return res[i];
        if (res[i] & M_ATTK_AGR_DIED)
            return res[i];
        if (helpless(magr))
            return res[i];
        /* eg. defender was knocked into a level teleport trap */
        if (mon_offmap(mdef))
            return res[i];
        if (res[i] & M_ATTK_HIT)
            struck = 1; /* at least one hit */
    }

    return (struck ? M_ATTK_HIT : M_ATTK_MISS);
}
