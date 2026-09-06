// mhitu.js — a monster attacking the hero.
// C ref: src/mhitu.c
//
// mattacku() and its message/damage helpers are ported in full for the melee
// attack types; the special attack forms (gaze, explosion, engulf, breath,
// spit, cast) and the seduction/disease substitution arms need subsystems
// that are absent and are recorded through note_unported_mhitu() at the
// exact C decision point, so game.unported names what a divergence wanted.

import { unmul, losehp, showdamage } from './hack.js';
import { mimic_obj_name } from './objnam.js';
import { set_ustuck, m_next2u } from './mon.js';
import { m_monnam } from './do_name.js';
import { likes_gold } from './mondata.js';
import { Something } from './const.js';
import { M_AP_OBJECT } from './const.js';
import { M_AP_NOTHING } from './const.js';
import { M_AP_TYPMASK } from './const.js';
import { pline_The, pline_mon, verbalize } from './pline.js';
import { update_inventory } from './invent.js';
import { cloak_simple_name, helm_simple_name, Ring_gone, Ring_on,
         stop_donning } from './do_wear.js';
import { mhitm_ad_poly, mhitm_ad_deth, mhitm_ad_tlpt, mhitm_ad_curs } from './uhitm.js';
import { monsndx } from './makemon.js';
import { split_mon } from './potion.js';
import { Your } from './pline.js';
import { ugolemeffects } from './polyself.js';
import { make_blinded, make_hallucinated, make_stunned, incr_itimeout } from './potion.js';
import { snuff_lit, number_leashed, unleash_all } from './apply.js';
import { engulf_target, failed_grab } from './mhitm.js';
import { unplacebc, placebc } from './do.js';
import { dismount_steed } from './steed.js';
import { reset_occupations } from './cmd.js';
import { mondead, wake_nearto } from './mon.js';
import { resists_blnd } from './mondata.js';
import { is_waterwall } from './dbridge.js';
import { mon_explodes } from './explode.js';
import { game } from './gstate.js';
import { getyear, midnight, night, yyyymmdd } from './calendar.js';
import { breamm, thrwmu, spitmm } from './mthrowu.js';
import { rn2, rn1, rnd, d } from './rng.js';
import { is_animal, is_human, perceives, dmgtype, gender, pronoun_gender,
         is_swimmer, thick_skinned, unsolid, hides_under, is_hider, is_demon,
         nolimbs, is_undead, is_orc, is_whirly, digests, is_flyer,
         defended, resists_acid, resists_cold, resists_elec, resists_fire,
         resists_ston, resists_drli, sticks, haseyes, stagger,
         poly_when_stoned, mhe, noit_mhim, cvt_adtyp_to_mseenres,
         monstseesu, monstunseesu, flaming, amorphous, amphibious }
         from './mondata.js';
import { is_vampshifter, DEADMONSTER, MON_WEP } from './monst.js';
import { poly_gender, body_part, polymon } from './polyself.js';
import { Blind, Blinded, Invis, See_invisible, Underwater, Deaf, Levitation, Flying,
         Cold_resistance, Fire_resistance, Hallucination,
         Reflecting, Shock_resistance, Stone_resistance,
         Acid_resistance, Sick_resistance, Slow_digestion,
         Half_physical_damage, Amphibious, Breathless,
         Unaware, Protection_from_shape_changers, Detect_monsters } from './youprop.js';
import { ATTKS, MONSYMS, PMNAMES, MFLAGS } from './monst_data.js';
import { W_ARMOR, W_AMUL, NON_PM, u_at, is_pit, Upolyd, PRONOUN_HALLU,
         M_ATTK_MISS, M_ATTK_HIT, M_ATTK_AGR_DIED, M_ATTK_AGR_DONE,
         M_ATTK_DEF_DIED,
         TT_PIT, TT_WEB, DISMOUNT_ENGULFED, WATER, P_WHIP, P_POLEARMS, NEED_WEAPON,
         NEED_HTH_WEAPON, LEFT_SIDE, RIGHT_SIDE, LEG,
         MON_EXPLODE, XKILL_NOMSG, SICK_NONVOMITABLE, STONING,
         KILLED_BY, W_ARMG, ERODE_CORRODE, EF_GREASE, EF_VERBOSE,
         STRAT_WAITFORU, NO_MINVENT, MM_EDOG, MM_NOMSG, A_CHAOTIC,
         A_INT, A_WIS, A_CHA, HAND, HAIR, LEFT_RING, RIGHT_RING,
         RLOC_MSG, OBJ_FREE, LARGEST_INT, BOLT_LIM, TIMEOUT,
         M_SEEN_FIRE, M_SEEN_COLD, M_SEEN_ELEC, M_SEEN_ACID } from './const.js';
import { ONAMES, OCLASSES } from './objects_data.js';
import { genders } from './role_data.js';
import { pline, canspotmon, canseemon, mon_visible, sensemon, bot,
         map_invisible, newsym, urgent_pline, shieldeff,
         display_nhwindow_message } from './display.js';
import { cansee, couldsee } from './vision.js';
import { Amonnam, Monnam, pmname, rndmonnam, hliquid, christen_monst,
         upstart, noit_mon_nam, noit_Monnam }
         from './do_name.js';
import { You, You_feel, You_hear, impossible } from './pline.js';
import { attacktype_fordmg, dmgtype_fromattack } from './mondata.js';
import { mon_nam, Some_Monnam } from './do_name.js';
import { Inhell, remove_monster, place_monster, makemon } from './makemon.js';
import { swallowed } from './display.js';
import { vision_recalc } from './vision.js';
import { ACURR, adjalign, adjattrib, exercise, Fast } from './attrib.js';
import { A_CON, A_STR, A_DEX } from './const.js';
import { sobj_at } from './invent.js';
import { s_suffix } from './hacklib.js';
import { an, doname, makeplural, safe_qbuf, simpleonames,
         suit_simple_name, the, xname, yname, vtense } from './objnam.js';
import { nomul } from './hack.js';
import { stop_occupation } from './allmain.js';
import { hitval, mon_wield_item } from './weapon.js';
import { mhitm_ad_phys, mhitm_ad_fire, mhitm_ad_cold, mhitm_ad_elec,
         mhitm_ad_drst,
         mhitm_ad_blnd, mhitm_ad_ston, mhitm_ad_drli,
         mhitm_ad_ench, mhitm_ad_samu, mhitm_ad_sedu, mhitm_ad_wrap,
         mhitm_ad_heal, mhitm_ad_plys, mhitm_ad_slee, mhitm_ad_slim,
         mhitm_knockback,
         mhitm_mgc_atk_negated, attk_protection, erode_armor,
         golemeffects } from './uhitm.js';
import { is_pool, t_at, newcham } from './mon.js';
import { touch_petrifies, initedog } from './dog.js';
import { find_offensive, use_offensive, mon_reflects } from './muse.js';
import { buzzmu, castmu } from './mcastu.js';
import { burnarmor, erode_obj, ignite_items, reset_utrap, minstapetrify } from './trap.js';
import { destroy_items, drain_item } from './zap.js';
import { defends, retouch_equipment } from './artifact.js';
import { set_ulycn } from './were.js';
import { can_blnd } from './mondata.js';
import { currency, freeinv, money_cnt, prinv } from './invent.js';
import { mpickobj, remove_worn_item } from './steal.js';
import { setworn } from './worn.js';
import { welded } from './wield.js';
import { tty_yn_function } from './tty/topl.js';
import { makeknown, observe_object } from './o_init.js';
import { losexp, pluslvl } from './exper.js';
import { splitobj } from './mkobj.js';
import { burn_away_slime } from './timeout.js';





function note_unported_mhitu(what) {
    (game.unported ||= new Set()).add(what);
}

/* include/monst.h:71 U_AP_TYPE; include/you.h:555 Ugender */
const U_AP_TYPE = () => (game.youmonst.m_ap_type & M_AP_TYPMASK);
const Ugender = () => ((Upolyd(game.u) ? game.u.mfemale : game.flags.female) ? 1 : 0);

// src/mhitu.c:1033 diseasemu(). Pestilence gives a fatal illness unless
// sickness resistance blocks it.
export async function diseasemu(mdat) {
    if (Sick_resistance()) {
        await You_feel('a slight illness.');
        return false;
    }
    const { make_sick } = await import('./potion.js');
    const sick = game.u.uprops?.SICK || 0;
    await make_sick(sick ? Math.trunc(sick / 3) + 1 : rn1(ACURR(A_CON), 20), pmname(mdat, 2), true,
                    SICK_NONVOMITABLE);
    return true;
}

// src/uhitm.c:3781 mhitm_ad_famn(), :3808 mhitm_ad_pest(), and :3841
// mhitm_ad_deth(), specialized here for the live monster-versus-hero path.
async function mhitm_ad_famn(magr, mhm) {
    await pline(`${Monnam(magr)} reaches out, and your body shrivels.`);
    exercise(A_CON, false);
    const { is_fainted, morehungry } = await import('./eat.js');
    if (!is_fainted())
        await morehungry(rn1(40, 40));
}

async function mhitm_ad_pest(magr, mhm) {
    await pline(`${Monnam(magr)} reaches out, and you feel fever and chills.`);
    await diseasemu(magr.data);
}

// include/you.h:324 mhis() — possessive pronoun for a monster.
export const mhis = (mtmp) => genders[pronoun_gender(mtmp, PRONOUN_HALLU)].his;
// include/you.h:315 uhim(), :316 uhis()
export const uhim = () => genders[game.flags?.female ? 1 : 0].him;
export const uhis = () => genders[game.flags?.female ? 1 : 0].his;

// include/objclass.h:79 — weapon strike directions.
const PIERCE = 1, SLASH = 2, WHACK = 4;

// include/obj.h is_wet_towel()
const is_wet_towel = (obj) => obj.otyp === ONAMES.TOWEL && (obj.spe | 0) > 0;

// include/hack.h AC_VALUE() — negative AC gives a random bonus, so the draw
// happens only for AC below zero.
const AC_VALUE = (AC) => (AC >= 0 ? AC : -rnd(-AC));

// src/mhitu.c:29 hitmsg() — the "<Monster> hits!" line, with the verb keyed
// to the attack type and " again" appended when the same monster lands the
// NEXT attack slot of the same type in one round. The C tracks that with a
// pointer (mattk == gh.hitmsg_prev + 1). The slot index plays that role for
// attacks from the monster table. A getmattk() substitution uses one shared C
// scratch slot instead, so it can never be adjacent to the previous attack.
// src/mhitu.c:163 u_slow_down()
export async function u_slow_down() {
    (game.u.intrinsic ||= {}).HFast = 0;
    if (!Fast())
        await You('slow down.');
    else /* speed boots */
        await Your('quickness feels less natural.');
    exercise(A_DEX, false);
}

export async function hitmsg(mtmp, mattk, indx) {
    const A = ATTKS;
    let compat;
    let verb = null, punct = '!';
    let Monst_name = Monnam(mtmp);

    /* Note: if opposite gender, "seductively";
       if same gender, "engagingly" for nymph, normal msg for others. */
    if ((compat = could_seduce(mtmp, game.youmonst, mattk)) !== 0
        && !mtmp.mcan && !mtmp.mspec_used) {
        await pline(`${Monst_name} ${
            !game.u.ublind ? 'smiles at' : !Deaf() ? 'talks to' : 'touches'
        } you ${(compat === 2) ? 'engagingly' : 'seductively'}.`);
    } else {
        switch (mattk[0]) {
        case A.AT_BITE:
            verb = 'bites';
            break;
        case A.AT_KICK:
            if (thick_skinned(game.youmonst.data))
                punct = '.';
            verb = 'kicks';
            break;
        case A.AT_STNG:
            verb = 'stings';
            break;
        case A.AT_BUTT:
            verb = 'butts';
            break;
        case A.AT_TUCH:
            verb = 'touches you';
            break;
        case A.AT_TENT:
            verb = 'tentacles suck your brain';
            Monst_name = s_suffix(Monst_name);
            break;
        case A.AT_EXPL:
        case A.AT_BOOM:
            verb = 'explodes';
            break;
        default:
            verb = 'hits';
        }
        /* if a monster hits more than once with similar attack, say so */
        const prev = game.hitmsg_prev;
        const again = (mtmp.m_id === game.hitmsg_mid
                       && prev != null
                       && !prev.alternate && !mattk.getmattk_alternate
                       && indx === prev.indx + 1
                       && mattk[0] === prev.aatyp) ? ' again' : '';
        await pline(`${Monst_name} ${verb}${again}${punct}`);
    }
    game.hitmsg_mid = mtmp.m_id;
    game.hitmsg_prev = {
        indx,
        aatyp: mattk[0],
        alternate: !!mattk.getmattk_alternate,
    };
}

// src/mhitu.c:85 missmu() — monster missed you.
export async function missmu(mtmp, nearmiss, mattk) {
    game.hitmsg_mid = 0;
    game.hitmsg_prev = null;

    if (!canspotmon(mtmp))
        map_invisible(mtmp.mx, mtmp.my);

    if (could_seduce(mtmp, game.youmonst, mattk) && !mtmp.mcan)
        await pline(`${Monnam(mtmp)} pretends to be friendly.`);
    else
        await pline(`${Monnam(mtmp)} ${
            (nearmiss && game.flags?.verbose) ? 'just ' : ''}misses!`);

    await stop_occupation();
}

// src/mhitu.c:105 mswings_verb() — strike types P|S|B: Pierce (pointed:
// stab) => "thrusts", Slash (edged: slice) or whack (blunt: Bash) =>
// "swings". The rn2(2) fires only for weapons with more than one strike
// type, so a pure-pierce dagger draws nothing.
export function mswings_verb(mwep, bash) {
    const oc = game.objects[mwep.otyp];
    const lash = (oc.oc_skill === P_WHIP || is_wet_towel(mwep));
    const thrust = ((oc.oc_dir & PIERCE) !== 0
                    && ((oc.oc_dir & ~PIERCE) === 0 || !rn2(2)));

    return bash ? 'bashes with' /*sigh*/
           : lash ? 'lashes'
             : thrust ? 'thrusts'
               : 'swings';
}

// src/mhitu.c:130 mswings() — monster swings obj.
export async function mswings(mtmp, otemp, bash) {
    if (game.flags?.verbose && !Blind() && mon_visible(mtmp)) {
        await pline(`${Monnam(mtmp)} ${mswings_verb(otemp, bash)} ${
            ((otemp.quan ?? 1) > 1) ? 'one of ' : ''}${mhis(mtmp)} ${
            xname(otemp)}.`);
    }
}

// src/mhitu.c:145 mpoisons_subj() — how a poison attack was delivered.
export function mpoisons_subj(mtmp, mattk) {
    const A = ATTKS;
    if (mattk[0] === A.AT_WEAP) {
        const mwep = (mtmp === game.youmonst) ? game.u.uwep : MON_WEP(mtmp);
        /* "Foo's attack was poisoned." is pretty lame, but at least
           it's better than "sting" when not a stinging attack... */
        return (!mwep || !mwep.opoisoned) ? 'attack' : 'weapon';
    } else {
        return (mattk[0] === A.AT_TUCH) ? 'contact'
                  : (mattk[0] === A.AT_GAZE) ? 'gaze'
                       : (mattk[0] === A.AT_BITE) ? 'bite' : 'sting';
    }
}

// src/mhitu.c:176 wildmiss() — monster attacked the wrong location due to
// monster blindness, hero invisibility, hero displacement, or hero being
// underwater. The rn2(3) in the unseen arm is a draw every wild swing makes
// when the hero is visible-square-adjacent, so this is not just flavor.
async function wildmiss(mtmp, mattk) {
    const A = ATTKS;
    const unotseen = (!mtmp.mcansee
                      || (Invis() && !perceives(game.mons[mtmp.mnum])));
    const unotthere = !!game.u.uprops?.DISPLACED;
    const usubmerged = Underwater();

    if (!unotseen && !unotthere && !usubmerged) {
        /* impossible("%s attacks you without knowing your location?") */
        note_unported_mhitu('wildmiss:impossible');
        return;
    }

    /* no map_invisible() -- no way to tell where _this_ is coming from */

    if (!game.flags?.verbose)
        return;
    /* no feedback if hero doesn't see the monster's spot */
    if (!cansee(mtmp.mx, mtmp.my))
        return;
    /* maybe it's attacking an image around the corner? */

    const compat = ((mattk[1] === A.AD_SEDU || mattk[1] === A.AD_SSEX)
                    ? could_seduce(mtmp, game.youmonst, mattk) : 0);
    const Monst_name = Monnam(mtmp);

    if (unotseen) { /* !mtmp->cansee || (Invis && !perceives(mtmp->data)) */
        const swings = (mattk[0] === A.AT_BITE) ? 'snaps'
                       : (mattk[0] === A.AT_KICK) ? 'kicks'
                         : (mattk[0] === A.AT_STNG
                            || mattk[0] === A.AT_BUTT
                            || nolimbs(game.mons[mtmp.mnum])) ? 'lunges'
                           : 'swings';

        if (compat) {
            await pline(`${Monst_name} tries to touch you and misses!`);
        } else {
            switch (rn2(3)) {
            case 0:
                await pline(`${Monst_name} ${swings} wildly and misses!`);
                break;
            case 1:
                await pline(`${Monst_name} attacks a spot beside you.`);
                break;
            case 2: {
                const lev = game.level.at?.(mtmp.mux, mtmp.muy);
                const waterwall = !!lev && lev.typ === WATER;
                await pline(`${Monst_name} strikes at ${
                    waterwall ? 'empty water' : 'thin air'}!`);
                break;
            }
            default:
                await pline(`${Monst_name} ${swings} wildly!`);
                break;
            }
        }
    } else if (unotthere) { /* Displaced */
        /* give 'displaced' message even if hero is Blind */
        if (compat)
            await pline(`${Monst_name} smiles ${
                (compat === 2) ? 'engagingly' : 'seductively'
            } at your ${Invis() ? 'invisible ' : ''}displaced image...`);
        else
            await pline(`${Monst_name} strikes at your ${
                Invis() ? 'invisible ' : ''}displaced image and misses you!`);
    } else if (usubmerged) { /* Underwater */
        /* monsters may miss especially on water level where
           bubbles shake the player here and there */
        if (compat)
            await pline(`${Monst_name} reaches towards your distorted image.`);
        else
            await pline(`${Monst_name} is fooled by water reflections and misses!`);
    }
}

// src/mhitu.c:1591 explmu(), a monster explodes at (or near) the hero.
async function explmu(mtmp, mattk, ufound, indx) {
    let kill_agr = true;
    let not_affected;
    let tmp;

    if (mtmp.mcan)
        return M_ATTK_MISS;

    tmp = d(mattk[2], mattk[3]);
    not_affected = defended(mtmp, mattk[1]);

    if (!ufound) {
        await pline(`${canseemon(mtmp) ? Monnam(mtmp) : 'It'} explodes at a spot in ${
                    is_waterwall(mtmp.mux, mtmp.muy) ? 'empty water' : 'thin air'}!`);
    } else {
        await hitmsg(mtmp, mattk, indx);
    }

    switch (mattk[1]) {
    case ATTKS.AD_COLD:
    case ATTKS.AD_FIRE:
    case ATTKS.AD_ELEC:
        await mon_explodes(mtmp, mattk);
        if (!DEADMONSTER(mtmp))
            kill_agr = false; /* lifesaving? */
        break;
    case ATTKS.AD_BLND:
        not_affected = resists_blnd(game.youmonst);
        if (ufound && !not_affected) {
            /* sometimes you're affected even if it's invisible */
            if (mon_visible(mtmp) || (rnd(tmp = Math.trunc(tmp / 2)) > game.u.ulevel)) {
                await You('are blinded by a blast of light!');
                await make_blinded(tmp, false);
                if (!Blind())
                    await Your('vision quickly clears.'); /* Your1(vision_clears) */
            } else if (game.flags?.verbose !== false)
                await You('get the impression it was not terribly bright.');
        }
        break;
    case ATTKS.AD_HALU:
        not_affected = not_affected || Blind() || (game.u.umonnum === PMNAMES.PM_BLACK_LIGHT
                                  || game.u.umonnum === PMNAMES.PM_VIOLET_FUNGUS
                                  || dmgtype(game.youmonst.data, ATTKS.AD_STUN));
        if (ufound && !not_affected) {
            let chg;

            if (!Hallucination())
                await You('are caught in a blast of kaleidoscopic light!');
            /* avoid "It explodes.  You are freaked out." */
            await mondead(mtmp);    /* remove it from map now */
            kill_agr = false; /* already killed (maybe lifesaved) */
            chg = await make_hallucinated((game.u.intrinsic?.HHallucination || 0) + tmp, false, 0);
            await You(`${chg ? 'are freaked out' : 'seem unaffected'}.`);
        }
        break;
    default:
        /* impossible("unknown exploder damage type %d", mattk->adtyp); */
        break;
    }
    if (not_affected) {
        await You('seem unaffected by it.');
        await ugolemeffects(mattk[1], tmp);
    }
    if (kill_agr && !DEADMONSTER(mtmp))
        await mondead(mtmp);
    await wake_nearto(mtmp.mx, mtmp.my, 7 * 7);
    return (!DEADMONSTER(mtmp)) ? M_ATTK_MISS : M_ATTK_AGR_DIED;
}

// src/mhitu.c:1680 gazemu(), active monster gaze attacks.
export async function gazemu(mtmp, mattk) {
    const reactions = [
        'confused', 'stunned', 'puzzled', 'dazzled',
        'irritated', 'inflamed', 'tired', 'dulled',
    ];
    const is_medusa = mtmp.mnum === PMNAMES.PM_MEDUSA;
    const reflectable = Reflecting() && couldsee(mtmp.mx, mtmp.my)
                        && is_medusa;
    const mcanseeu = canseemon(mtmp) && couldsee(mtmp.mx, mtmp.my)
                     && !!mtmp.mcansee;
    let cancelled = !!mtmp.mcan;
    let react = -1;
    let already = false;

    const seenres = cvt_adtyp_to_mseenres(mattk[1]);
    if (((mtmp.seen_resistance ?? 0) & seenres) !== 0)
        return M_ATTK_MISS;

    if ((Hallucination() && rn2(4)) || (Unaware() && !reflectable))
        cancelled = true;

    switch (mattk[1]) {
    case ATTKS.AD_STON:
        if (cancelled || !mtmp.mcansee) {
            if (!canseemon(mtmp))
                break;
            if (Unaware()) {
                react = is_medusa ? 4 : 2;
                break;
            }
            if (is_medusa && Hallucination() && !rn2(3))
                await pline('Someone seems overdue for a serpent cut.');
            else
                await pline(`${Monnam(mtmp)} ${
                    is_medusa && mtmp.mcan && !react
                        ? "doesn't look all that ugly"
                        : 'gazes ineffectually'}.`);
            break;
        }

        if (reflectable) {
            const useeit = canseemon(mtmp);
            if (useeit) {
                const { ureflects } = await import('./muse.js');
                await ureflects('%s gaze is reflected by your %s.',
                                s_suffix(Monnam(mtmp)));
            }
            if (await mon_reflects(mtmp, useeit
                ? 'The gaze is reflected away by %s %s!' : null))
                break;

            const monCanSeeHero = (!Invis() || perceives(mtmp.data))
                                  && !Underwater()
                                  && couldsee(mtmp.mx, mtmp.my);
            if (!monCanSeeHero) {
                if (useeit)
                    await pline(`${Monnam(mtmp)} doesn't seem to notice that ${
                        mhis(mtmp)} gaze was reflected.`);
                break;
            }
            if (useeit)
                await pline(`${Monnam(mtmp)} is turned to stone!`);
            game.stoned = true;
            const { killed } = await import('./mon.js');
            await killed(mtmp);
            if (DEADMONSTER(mtmp))
                return M_ATTK_AGR_DIED;
            break;
        }

        if (canseemon(mtmp) && couldsee(mtmp.mx, mtmp.my)
            && !Stone_resistance() && !Unaware()) {
            await You(`meet ${s_suffix(mon_nam(mtmp))} gaze.`);
            await stop_occupation();
            if (poly_when_stoned(game.youmonst.data)
                && await polymon(PMNAMES.PM_STONE_GOLEM))
                return M_ATTK_MISS;
            await urgent_pline('You turn to stone...');
            game.killer = {
                format: KILLED_BY,
                name: pmname(mtmp.data, gender(mtmp)),
            };
            const { done } = await import('./end.js');
            await done(STONING);
        }
        break;

    case ATTKS.AD_CONF:
        if (mcanseeu && !mtmp.mspec_used && rn2(5)) {
            if (cancelled) {
                react = 0;
                already = !!mtmp.mconf;
            } else {
                const conf = d(3, 4);
                mtmp.mspec_used = (mtmp.mspec_used || 0) + conf + rn2(6);
                if (!(game.u.intrinsic?.HConfusion
                      || game.u.uprops?.CONFUSION)) {
                    await pline(`${s_suffix(Monnam(mtmp))} gaze confuses you!`);
                } else {
                    await You('are getting more and more confused.');
                }
                const { make_confused } = await import('./potion.js');
                await make_confused((game.u.intrinsic?.HConfusion || 0)
                                    + conf, false);
                await stop_occupation();
            }
        }
        break;

    case ATTKS.AD_STUN:
        if (mcanseeu && !mtmp.mspec_used && rn2(5)) {
            if (cancelled) {
                react = 1;
                already = !!mtmp.mstun;
            } else {
                const stun = d(2, 6);
                mtmp.mspec_used = (mtmp.mspec_used || 0) + stun + rn2(6);
                await pline(`${Monnam(mtmp)} stares piercingly at you!`);
                await make_stunned(((game.u.intrinsic?.HStun || 0) & TIMEOUT)
                                   + stun, true);
                await stop_occupation();
            }
        }
        break;

    case ATTKS.AD_BLND:
        if (canseemon(mtmp) && !resists_blnd(game.youmonst)
            && mhitu_monmove.mdistu(mtmp) <= BOLT_LIM * BOLT_LIM) {
            if (cancelled) {
                react = rn1(2, 2);
                already = !mtmp.mcansee;
                if (mtmp.mcan && mtmp.mnum === PMNAMES.PM_ARCHON && rn2(5))
                    react = -1;
            } else {
                const blnd = d(mattk[2], mattk[3]);
                await You(`are blinded by ${s_suffix(mon_nam(mtmp))} radiance!`);
                await make_blinded(blnd, false);
                await stop_occupation();
                if (!Blind()) {
                    await Your('vision quickly clears.');
                } else {
                    const oldstun = (game.u.intrinsic?.HStun || 0) & TIMEOUT;
                    const newstun = rnd(3);
                    await make_stunned(Math.max(oldstun, newstun), true);
                }
            }
        }
        break;

    case ATTKS.AD_FIRE:
        if (mcanseeu && !mtmp.mspec_used && rn2(5)) {
            if (cancelled) {
                react = rn1(2, 4);
            } else {
                let dmg = d(2, 6);
                const orig_dmg = dmg;
                const lev = mtmp.m_lev | 0;

                await pline(`${Monnam(mtmp)} attacks you with a fiery gaze!`);
                await stop_occupation();
                if (Fire_resistance()) {
                    await shieldeff(game.u.ux, game.u.uy);
                    await pline_The("fire doesn't feel hot!");
                    monstseesu(M_SEEN_FIRE);
                    await ugolemeffects(ATTKS.AD_FIRE, d(12, 6));
                    dmg = 0;
                } else {
                    monstunseesu(M_SEEN_FIRE);
                }
                await burn_away_slime();
                if (lev > rn2(20))
                    await burnarmor(game.youmonst);
                if (lev > rn2(20)) {
                    await destroy_items(game.youmonst, ATTKS.AD_FIRE, orig_dmg);
                    await ignite_items(game.invent || []);
                }
                if (dmg)
                    await mdamageu(mtmp, dmg);
            }
        }
        break;

    default:
        break;
    }

    if (react >= 0) {
        if (Hallucination() && rn2(3))
            react = rn2(reactions.length);
        let modifier;
        if (!rn2(3)) {
            modifier = '';
        } else if (already) {
            modifier = 'quite ';
        } else {
            modifier = !rn2(2) ? 'a bit ' : 'somewhat ';
        }
        await pline(`${Monnam(mtmp)} looks ${modifier}${reactions[react]}.`);
    }
    return M_ATTK_MISS;
}

// src/mhitu.c:310 getmattk() — the attack for this slot, with substitutions.
//
// The holder cooldown substitution is live because unstuck() sets mspec_used.
// The remaining substitutions are recorded when their conditions fire.
export function getmattk(magr, mdef, indx, prev_result) {
    const A = ATTKS;
    const mptr = game.mons[magr.mnum];
    const attk = mptr.mattk[indx];

    if (mptr.mattk[0][1] === A.AD_SSEX || attk[1] === A.AD_SSEX)
        note_unported_mhitu('getmattk:SEDUCE');
    if (indx > 0 && prev_result[indx - 1] > M_ATTK_MISS
        && (attk[1] === A.AD_DISE || attk[1] === A.AD_PEST
            || attk[1] === A.AD_FAMN)
        && attk[1] === mptr.mattk[indx - 1][1]) {
        const alt = [...attk];
        alt.getmattk_alternate = true;
        alt[1] = A.AD_STUN;
        return alt;
    }

    /* src/mhitu.c:349. Energy-vortex drain scales with the hero's current
       and maximum energy. At level 30 with 99 energy, the ordinary 2d6
       attack becomes 1d6; retaining 2d6 changes both the drained amount and
       the RNG modulus for every later action. */
    if (attk[1] === A.AD_DREN && mdef === game.youmonst) {
        const alt = [...attk];
        alt.getmattk_alternate = true;
        const ulev = Math.max(game.u.ulevel | 0, 6);

        if ((game.u.uen | 0) <= 5 * ulev && alt[2] > 1) {
            alt[2]--;
            if ((game.u.uenmax | 0) <= 2 * ulev && alt[3] > 3)
                alt[3] -= 3;
        } else if ((game.u.uen | 0) > 12 * ulev) {
            alt[2]++;
            if ((game.u.uenmax | 0) > 20 * ulev)
                alt[3] += 3;
        }
        return alt;
    }

    /* src/mhitu.c:368, a holder or engulfer which just released its target
       temporarily substitutes a weak touch or claw attack. */
    if (magr.mspec_used && (attk[0] === A.AT_ENGL
                            || attk[0] === A.AT_HUGS
                            || attk[1] === A.AD_STCK
                            || attk[1] === A.AD_POLY)) {
        const alt = [...attk];
        alt.getmattk_alternate = true;
        const wimpy = alt[3] === 0;

        if (alt[1] === A.AD_ACID || alt[1] === A.AD_ELEC
            || alt[1] === A.AD_COLD || alt[1] === A.AD_FIRE) {
            alt[0] = A.AT_TUCH;
        } else {
            alt[0] = A.AT_CLAW;
            alt[1] = A.AD_PHYS;
        }
        alt[2] = 1;
        alt[3] = 6;
        if (wimpy && alt[0] === A.AT_CLAW) {
            alt[0] = A.AT_TUCH;
            alt[2] = alt[3] = 0;
        }
        return alt;
    }

    /* src/mhitu.c:416: a lich uses weaker physical touch damage when its
       target resists cold, unless the target is a shade. */
    const cold_resistant_target = mdef === game.youmonst
        ? Cold_resistance() : resists_cold(mdef);
    if (indx === 0 && attk[0] === A.AT_TUCH && attk[1] === A.AD_COLD
        && cold_resistant_target
        && mdef.data.pmidx !== PMNAMES.PM_SHADE) {
        const alt = [...attk];
        alt.getmattk_alternate = true;
        alt[1] = A.AD_PHYS;
        alt[2] = Math.trunc((alt[2] + 1) / 2);
        if (alt[3] === 10)
            alt[3] = 6;
        return alt;
    }
    return attk;
}

// src/mhitu.c:448 calc_mattacku_vars() — some variables needed for
// mattacku(), plus the bhitpos/notonhead setup do_attack() also does.
function calc_mattacku_vars(mtmp, out) {
    const { mdistu, monnear } = mhitu_monmove;

    out.ranged = (mdistu(mtmp) > 3);
    out.range2 = !monnear(mtmp, mtmp.mux, mtmp.muy);
    out.foundyou = u_at(mtmp.mux, mtmp.muy);
    out.youseeit = canseemon(mtmp);

    /* do_attack() uses bhitpos to set/clear notonhead; do likewise here */
    game.bhitpos = { x: game.u.ux, y: game.u.uy };
    /* hero poly'd into a long worm isn't allowed to grow a tail, so
       hitting tail instead of head can't happen */
    game.notonhead = false;
}

/* js/monmove.js imports mattacku from this file, so importing mdistu and
   monnear statically here would close a module cycle at evaluation time;
   they are fetched once at first use instead. */
const mhitu_monmove = {};
async function load_monmove() {
    if (!mhitu_monmove.mdistu) {
        const m = await import('./monmove.js');
        mhitu_monmove.mdistu = m.mdistu;
        mhitu_monmove.monnear = m.monnear;
    }
}

// src/mhitu.c:466 mtrapped_in_pit() — TRUE iff monster or hero is trapped
// in a (spiked) pit.
export function mtrapped_in_pit(mtmp) {
    let ttmp = null;

    if (mtmp === game.youmonst)
        ttmp = (game.u.utrap && game.u.utraptype === TT_PIT)
               ? t_at(game.u.ux, game.u.uy) : null;
    else
        ttmp = mtmp.mtrapped ? t_at(mtmp.mx, mtmp.my) : null;

    if (ttmp && is_pit(ttmp.ttyp))
        return true;
    return false;
}

// src/mhitu.c:491 mattacku() — monster attacks you. Returns 1 if the
// monster dies (e.g. "yellow light"), 0 otherwise.
//
// The melee arms (claw family and weapon) are ported in full. The engulf,
// gaze, explosion, breath, spit and spellcast arms, the swallowed/steed
// preambles, and the hider/mimic reveals that need subsystems which are
// absent, are recorded at their exact C decision points.
export async function mattacku(mtmp) {
    const A = ATTKS;
    await load_monmove();
    let mattk;
    let tmp;
    const sum = new Array(6).fill(M_ATTK_MISS);
    let mdat = game.mons[mtmp.mnum];
    /*
     * ranged: Is it near you?  Affects your actions.
     * range2: Does it think it's near you?  Affects its actions.
     * foundyou: Is it attacking you or your image?
     * youseeit: Can you observe the attack?
     * skipnonmagc: Are further physical attack attempts useless?
     */
    const v = {};
    let skipnonmagc = false;

    calc_mattacku_vars(mtmp, v);

    if (!v.ranged)
        nomul(0);
    if (DEADMONSTER(mtmp))
        return 1;
    if (Underwater() && !is_swimmer(mdat))
        return 0;

    /* If swallowed, can only be affected by u.ustuck */
    if (game.u.uswallow) {
        if (mtmp !== game.u.ustuck)
            return 0;
        game.u.ustuck.mux = game.u.ux;
        game.u.ustuck.muy = game.u.uy;
        if (game.u.uinvulnerable)
            return 0; /* stomachs can't hurt you! */
        v.range2 = 0;
        v.foundyou = 1;
    } else if (game.u.usteed) {
        if (mtmp === game.u.usteed)
            /* Your steed won't attack you */
            return 0;
        /* src/mhitu.c:533 — orcs like to steal and eat horses and the like */
        await load_monmove();
        if (!rn2(is_orc(game.mons[mtmp.mnum]) ? 2 : 4)
            && mhitu_monmove.mdistu(mtmp) <= 2 /* m_next2u */) {
            /* attack your steed instead; 'bhitpos' and 'notonhead' are
               already set from targeting hero */
            const { mattackm } = await import('./mhitm.js');
            const i = await mattackm(mtmp, game.u.usteed);
            if ((i & M_ATTK_AGR_DIED) !== 0)
                return 1;
            /* make sure steed is still alive and within range */
            if ((i & M_ATTK_DEF_DIED) !== 0 || !game.u.usteed
                || mhitu_monmove.mdistu(mtmp) > 2)
                return 0;
            /* Let your steed retaliate */
            game.bhitpos = { x: mtmp.mx, y: mtmp.my };
            game.notonhead = false;
            return ((await mattackm(game.u.usteed, mtmp))
                    & M_ATTK_DEF_DIED) ? 1 : 0;
        }
    }

    if (game.u.uundetected && !v.range2 && v.foundyou && !game.u.uswallow) {
        if (!canspotmon(mtmp))
            map_invisible(mtmp.mx, mtmp.my);
        game.u.uundetected = 0;
        if (is_hider(game.youmonst.data)
            && game.u.umonnum !== PMNAMES.PM_TRAPPER) {
            /* ceiling hider: enexto/teleds relocation and the piercer
               counterattack need subsystems that are absent */
            note_unported_mhitu('mattacku:ceiling_hider');
        } else {
            /* surface hider */
            note_unported_mhitu('mattacku:surface_hider_reveal');
            newsym(game.u.ux, game.u.uy);
        }
        return 0;
    }

    /* hero might be a mimic, concealed via #monster */
    if (game.youmonst.data.mlet === MONSYMS.S_MIMIC && U_AP_TYPE() && !v.range2
        && v.foundyou && !game.u.uswallow) {
        const sticky = sticks(game.youmonst.data);

        if (!canspotmon(mtmp))
            map_invisible(mtmp.mx, mtmp.my);
        if (sticky && !v.youseeit)
            await pline('It gets stuck on you.');
        else /* see note about m_monnam() above */
            await pline(`Wait, ${m_monnam(mtmp)}!  That's a ${
                pmname(game.youmonst.data, Ugender())} named ${game.plname}!`);
        if (sticky)
            set_ustuck(mtmp);
        game.youmonst.m_ap_type = M_AP_NOTHING;
        game.youmonst.mappearance = 0;
        newsym(game.u.ux, game.u.uy);
        return 0;
    }

    /* non-mimic hero might be mimicking an object after eating m corpse */
    if (U_AP_TYPE() === M_AP_OBJECT && !v.range2 && v.foundyou && !game.u.uswallow) {
        if (!canspotmon(mtmp))
            map_invisible(mtmp.mx, mtmp.my);
        if (!v.youseeit)
            await pline(`${Something} ${
                (likes_gold(mtmp.data)
                 && game.youmonst.mappearance === ONAMES.GOLD_PIECE)
                ? 'tries to pick you up'
                : 'disturbs you'}!`);
        else /* see note about m_monnam() above */
            await pline(`Wait, ${m_monnam(mtmp)}!  That ${mimic_obj_name(game.youmonst)} is really ${
                an(pmname(game.mons[game.u.umonnum], Ugender()))} named ${game.plname}!`);
        if (game.multi < 0) { /* this should always be the case */
            const buf = `You appear to be ${
                Upolyd(game.u) ? an(pmname(game.youmonst.data, game.flags.female ? 1 : 0))
                               : 'yourself'} again.`;
            await unmul(buf); /* immediately stop mimicking */
        }
        return 0;
    }

    /*  Work out the armor class differential   */
    tmp = AC_VALUE(game.u.uac) + 10; /* tmp ~= 0 - 20 */
    tmp += mtmp.m_lev;
    if (game.multi < 0)
        tmp += 4;
    if ((Invis() && !perceives(mdat)) || !mtmp.mcansee)
        tmp -= 2;
    if (mtmp.mtrapped)
        tmp -= 2;
    if (tmp <= 0)
        tmp = 1;

    /* make eels visible the moment they hit/miss us */
    if (mdat.mlet === MONSYMS.S_EEL && mtmp.minvis
        && cansee(mtmp.mx, mtmp.my)) {
        mtmp.minvis = 0;
        newsym(mtmp.mx, mtmp.my);
    }

    /* when not cancelled and not in current form due to shapechange, many
       demons can summon more demons and were creatures can summon critters */
    if ((mtmp.cham ?? NON_PM) === NON_PM && !mtmp.mcan && !v.range2
        && (is_demon(mdat) || (mdat.mflags2 & MFLAGS.M2_WERE) !== 0)) {
        const already_fleeing = !!mtmp.mflee;

        await summonmu(mtmp, v.youseeit);
        if (mtmp.mflee && !already_fleeing)
            return 0;
        mdat = mtmp.data;
    }

    if (game.u.uinvulnerable) { /* in the midst of successful prayer */
        /* monsters won't attack you */
        if (mtmp === game.u.ustuck) {
            await pline(`${Monnam(mtmp)} loosens its grip slightly.`);
        } else if (!v.range2) {
            if (v.youseeit || sensemon(mtmp))
                await pline(`${Monnam(mtmp)} starts to attack you, but pulls back.`);
            else
                await pline('You feel something move nearby.');
        }
        return 0;
    }

    /* Unlike defensive stuff, don't let them use item _and_ attack. */
    if (find_offensive(mtmp)) {
        const offended = await use_offensive(mtmp);
        if (offended)
            return offended === 1 ? 1 : 0;
    }

    game.skipdrin = false; /* [see mattackm(mhitm.c)] */
    const firstfoundyou = v.foundyou;

    for (let i = 0; i < 6; i++) {
        sum[i] = M_ATTK_MISS;
        /* counterattack against attack [i-1] might have been fatal */
        if (DEADMONSTER(mtmp))
            return 1;
        if (i > 0) {
            /* recalc in case prior attack moved hero */
            calc_mattacku_vars(mtmp, v);
            /* if hero was found but isn't anymore, avoid wildmiss now */
            if (firstfoundyou && !v.foundyou)
                continue;
            if (!u_at(game.bhitpos.x, game.bhitpos.y))
                continue;
        }
        game.mon_currwep = null;
        mattk = getmattk(mtmp, game.youmonst, i, sum);
        if ((game.u.uswallow && mattk[0] !== A.AT_ENGL)
            || (skipnonmagc && mattk[0] !== A.AT_MAGC)
            || (game.skipdrin && mattk[0] === A.AT_TENT
                && mattk[1] === A.AD_DRIN))
            continue;

        let j;
        switch (mattk[0]) {
        case A.AT_CLAW: /* "hand to hand" attacks */
        case A.AT_KICK:
        case A.AT_BITE:
        case A.AT_STNG:
        case A.AT_TUCH:
        case A.AT_BUTT:
        case A.AT_TENT:
            if (mattk[0] === A.AT_KICK && mtrapped_in_pit(mtmp))
                continue;
            if (!v.range2 && (!MON_WEP(mtmp) || mtmp.mconf
                              || game.u.uprops?.CONFLICT
                              || !touch_petrifies(game.youmonst.data))) {
                if (v.foundyou) {
                    if (tmp > (j = rnd(20 + i))) {
                        if (unsolid(game.youmonst.data)) {
                            /* failed_grab() needs the grab bookkeeping */
                            note_unported_mhitu('mattacku:failed_grab');
                        }
                        if (mattk[0] !== A.AT_KICK
                            || !thick_skinned(game.youmonst.data))
                            sum[i] = await hitmu(mtmp, mattk, i);
                    } else
                        await missmu(mtmp, (tmp === j), mattk);
                } else {
                    await wildmiss(mtmp, mattk);
                    /* skip any remaining non-spell attacks */
                    skipnonmagc = true;
                }
            }
            break;

        case A.AT_HUGS: /* automatic if prev two attacks succeed */
            /* Note: if displaced, prev attacks never succeeded */
            if ((!v.range2 && i >= 2 && sum[i - 1] && sum[i - 2])
                || mtmp === game.u.ustuck) {
                if (unsolid(game.youmonst.data))
                    note_unported_mhitu('mattacku:failed_grab');
                sum[i] = await hitmu(mtmp, mattk, i);
            }
            break;

        case A.AT_GAZE: /* can affect you either ranged or not */
            if (mdat !== game.mons[PMNAMES.PM_MEDUSA])
                sum[i] = await gazemu(mtmp, mattk);
            break;

        case A.AT_EXPL: /* automatic hit if next to, and aimed at you */
            if (!v.range2)
                sum[i] = await explmu(mtmp, mattk, v.foundyou, i);
            break;

        case A.AT_ENGL:
            if (!v.range2) {
                if (v.foundyou) {
                    /* src/mhitu.c:848 — the engulf to-hit roll fires
                       before the swallow */
                    if (game.u.uswallow
                        || (!mtmp.mspec_used && tmp > (j = rnd(20 + i)))) {
                        /* flush_screen(1): our writes flush per cell */
                        sum[i] = await gulpmu(mtmp, mattk);
                    } else {
                        await missmu(mtmp, (tmp === j), mattk);
                    }
                } else if (digests(mdat)) {
                    await pline(`${Monnam(mtmp)} gulps some air!`);
                } else {
                    if (v.youseeit)
                        await pline(`${Monnam(mtmp)} lunges forward and recoils!`);
                    else
                        await You_hear(`a ${is_whirly(mdat)
                            ? 'rushing noise' : 'splat'} nearby.`);
                }
            }
            break;
        case A.AT_BREA:
            if (v.range2)
                sum[i] = await breamm(mtmp, mattk, game.youmonst);
            break;
        case A.AT_SPIT:
            if (v.range2)
                sum[i] = await spitmm(mtmp, mattk, game.youmonst);
            break;
        case A.AT_WEAP:
            if (v.range2) {
                if (!game.level?.flags?.is_rogue_level)
                    await thrwmu(mtmp);
            } else {
                let hittmp = 0;

                /* Rare but not impossible.  Normally the monster
                 * wields when 2 spaces away, but it can be
                 * teleported or whatever....
                 */
                if (mtmp.weapon_check === NEED_WEAPON || !MON_WEP(mtmp)) {
                    mtmp.weapon_check = NEED_HTH_WEAPON;
                    /* mon_wield_item resets weapon_check as appropriate */
                    if (await mon_wield_item(mtmp) !== 0)
                        break;
                }
                if (v.foundyou) {
                    game.mon_currwep = MON_WEP(mtmp);
                    if (game.mon_currwep) {
                        /* C also excludes ART_SNICKERSNEE, but that artifact
                           is a katana, which is_pole() already rejects */
                        const bash = (is_pole(game.mon_currwep)
                                      && mhitu_monmove.mdistu(mtmp) <= 2);

                        hittmp = hitval(game.mon_currwep, game.youmonst);
                        tmp += hittmp;
                        await mswings(mtmp, game.mon_currwep, bash);
                    }
                    if (tmp > (j = game.mhitu_dieroll = rnd(20 + i)))
                        sum[i] = await hitmu(mtmp, mattk, i);
                    else
                        await missmu(mtmp, (tmp === j), mattk);
                    /* KMH -- Don't accumulate to-hit bonuses */
                    if (game.mon_currwep)
                        tmp -= hittmp;
                } else {
                    await wildmiss(mtmp, mattk);
                    /* skip any remaining non-spell attacks */
                    skipnonmagc = true;
                }
            }
            break;
        case A.AT_MAGC:
            if (v.range2)
                sum[i] = await buzzmu(mtmp, mattk);
            else
                sum[i] = await castmu(mtmp, mattk, true, v.foundyou);
            break;

        default: /* no attack */
            break;
        }
        if (game.disp?.botl) {
            await bot();
            game.disp.botl = false;
        }
        /* give player a chance of waking up before dying -kaa */
        if (sum[i] === M_ATTK_HIT) { /* successful attack */
            if (game.u.usleep && game.u.usleep < game.moves && !rn2(10)) {
                game.multi = -1;
                game.nomovemsg = 'The combat suddenly awakens you.';
            }
        }
        if ((sum[i] & M_ATTK_AGR_DIED))
            return 1; /* attacker dead */
        if ((sum[i] & M_ATTK_AGR_DONE))
            break; /* attacker teleported, no more attacks */
        /* sum[i] == 0: unsuccessful attack */
    }
    return 0;
}

// src/mhitu.c:956 summonmu(). Demons summon their own kind; were creatures
// can change form and then call compatible animals into adjacent squares.
async function summonmu(mtmp, youseeit) {
    let mdat = mtmp.data;

    if (is_demon(mdat)) {
        if (mdat !== game.mons[PMNAMES.PM_BALROG]
            && mdat !== game.mons[PMNAMES.PM_AMOROUS_DEMON]) {
            if (!rn2(Inhell() ? 10 : 16)) {
                const { msummon } = await import('./minion.js');
                await msummon(mtmp);
            }
        }
        return;
    }

    if ((mdat.mflags2 & MFLAGS.M2_WERE) !== 0) {
        const { new_were, were_summon } = await import('./were.js');
        if (is_human(mdat)) {
            if (!Protection_from_shape_changers()
                && !rn2(5 - (night() ? 2 : 0))) {
                await new_were(mtmp);
            }
        } else if (Protection_from_shape_changers() || !rn2(30)) {
            await new_were(mtmp);
        }
        mdat = mtmp.data;

        if (!rn2(10)) {
            if (youseeit)
                await pline(`${Monnam(mtmp)} summons help!`);
            const { total, visible, generic }
                = await were_summon(mdat, false);
            if (youseeit) {
                if (total > 0) {
                    if (visible === 0)
                        await You_feel('hemmed in.');
                } else {
                    await pline('But none comes.');
                }
            } else {
                let fromNowhere = ' from nowhere';
                if (!Deaf()) {
                    const { growl_sound } = await import('./sounds.js');
                    await pline(`Something ${makeplural(growl_sound(mtmp))}!`);
                    fromNowhere = '';
                }
                if (total > 0) {
                    if (visible < 1) {
                        await You_feel('hemmed in.');
                    } else {
                        const appearance = visible === 1
                            ? `${an(generic)} appears`
                            : `${makeplural(generic)} appear`;
                        await pline(`${upstart(appearance)}${fromNowhere}!`);
                    }
                }
            }
        }
    }
}

/* include/obj.h is_pole() */
export function is_pole(obj) {
    return game.objects[obj.otyp].oc_skill === P_POLEARMS
           || obj.otyp === ONAMES.LANCE;
}


// src/mhitu.c:1089 magic_negation() — the magic cancellation factor worn
// armor gives its wearer; the best a_can among worn pieces. The extrinsic
// Protection arms (rings, amulet of guarding, divine protection) key on
// state fresh heroes lack and are recorded when present.
export function magic_negation(mon) {
    const is_you = (mon === null || mon === game.u || mon === game.youmonst);
    let mc = 0, via_amul = false;
    let gotprot = is_you
        ? !!game.u.uprops?.PROTECTION
        : mon?.data?.pmidx === PMNAMES.PM_HIGH_CLERIC;

    const chain = is_you ? (game.invent || []) : (mon.minvent || []);
    for (const o of chain) {
        if ((o.owornmask ?? 0) & W_ARMOR) {
            const armpro = game.objects[o.otyp].a_can | 0;
            if (armpro > mc)
                mc = armpro;
        } else if ((o.owornmask ?? 0) & W_AMUL) {
            if (o.otyp === ONAMES.AMULET_OF_GUARDING)
                via_amul = true;
        }
        if (!is_you && !gotprot && o.oartifact)
            note_unported_mhitu('magic_negation:monster_artifact_protection');
    }

    if (gotprot) {
        mc += via_amul ? 2 : 1;
        if (mc > 3)
            mc = 3;
    } else if (mc < 1 && is_you
               && ((game.u.intrinsic?.HProtection && game.u.ublessed > 0)
                   || game.u.uspellprot)) {
        mc = 1;
    }

    return mc;
}

// src/mhitu.c:1144 hitmu() — monster hits you. Returns M_ATTK flags.
async function hitmu(mtmp, mattk, indx) {
    const A = ATTKS;
    const mdat = game.mons[mtmp.mnum];
    const olduasmon = game.youmonst.data;
    let res;
    const mhm = {
        damage: 0,
        hitflags: M_ATTK_MISS,
        permdmg: 0,
        specialdmg: 0,
        done: false,
        indx,
    };

    if (!canspotmon(mtmp))
        map_invisible(mtmp.mx, mtmp.my);

    /*  If the monster is undetected & hits you, you should know where
     *  the attack came from.
     */
    if (mtmp.mundetected
        && (hides_under(mdat) || mdat.mlet === MONSYMS.S_EEL)) {
        mtmp.mundetected = 0;
        if (!sensemon(mtmp) && !Detect_monsters()) {
            const obj = (game.level?.objects || [])
                .find(o => o.ox === mtmp.mx && o.oy === mtmp.my);
            if (obj) {
                const what = Blind() && !obj.dknown
                    ? 'something'
                    : is_pool(mtmp.mx, mtmp.my) && !Underwater()
                        ? 'the water'
                        : doname(obj);
                let attacker = Amonnam(mtmp);
                if (attacker === 'It')
                    attacker = 'Something';
                await pline(`${attacker} was hidden under ${what}!`);
            }
            newsym(mtmp.mx, mtmp.my);
        }
    }

    /*  First determine the base damage done */
    mhm.damage = d(mattk[2], mattk[3]);
    if ((is_undead(mdat) || is_vampshifter(mtmp)) && midnight())
        mhm.damage += d(mattk[2], mattk[3]); /* extra dmg */

    /* mhitm_adtyping: dispatch on the damage type */
    if (mattk[1] === A.AD_PHYS) {
        await mhitm_ad_phys(mtmp, mattk, game.youmonst, mhm);
    } else if (mattk[1] === A.AD_HEAL) {
        await mhitm_ad_heal(mtmp, mattk, game.youmonst, mhm);
    } else if (mattk[1] === A.AD_PLYS) {
        await mhitm_ad_plys(mtmp, mattk, game.youmonst, mhm);
    } else if (mattk[1] === A.AD_SLEE) {
        await mhitm_ad_slee(mtmp, mattk, game.youmonst, mhm);
    } else if (mattk[1] === A.AD_SLIM) {
        await mhitm_ad_slim(mtmp, mattk, game.youmonst, mhm);
    } else if (mattk[1] === A.AD_FIRE) {
        await mhitm_ad_fire(mtmp, mattk, game.youmonst, mhm);
    } else if (mattk[1] === A.AD_COLD) {
        await mhitm_ad_cold(mtmp, mattk, game.youmonst, mhm);
    } else if (mattk[1] === A.AD_ELEC) {
        mhm.indx = indx;
        await mhitm_ad_elec(mtmp, mattk, game.youmonst, mhm);
    } else if (mattk[1] === A.AD_DRST || mattk[1] === A.AD_DRDX
               || mattk[1] === A.AD_DRCO) {
        await mhitm_ad_drst(mtmp, mattk, game.youmonst, mhm);
    } else if (mattk[1] === A.AD_BLND) {
        await mhitm_ad_blnd(mtmp, mattk, game.youmonst, mhm);
    } else if (mattk[1] === A.AD_STON) {
        await mhitm_ad_ston(mtmp, mattk, game.youmonst, mhm);
    } else if (mattk[1] === A.AD_WRAP) {
        await mhitm_ad_wrap(mtmp, mattk, game.youmonst, mhm);
    } else if (mattk[1] === A.AD_TLPT) {
        await mhitm_ad_tlpt(mtmp, mattk, game.youmonst, mhm);
    } else if (mattk[1] === A.AD_POLY) {
        await mhitm_ad_poly(mtmp, mattk, game.youmonst, mhm);
    } else if (mattk[1] === A.AD_DRLI) {
        await mhitm_ad_drli(mtmp, mattk, game.youmonst, mhm);
    } else if (mattk[1] === A.AD_ENCH) {
        await mhitm_ad_ench(mtmp, mattk, game.youmonst, mhm);
    } else if (mattk[1] === A.AD_SAMU) {
        await mhitm_ad_samu(mtmp, mattk, game.youmonst, mhm);
    } else if (mattk[1] === A.AD_FAMN) {
        await mhitm_ad_famn(mtmp, mhm);
    } else if (mattk[1] === A.AD_PEST) {
        await mhitm_ad_pest(mtmp, mhm);
    } else if (mattk[1] === A.AD_DETH) {
        await mhitm_ad_deth(mtmp, mattk, game.youmonst, mhm);
    } else if (mattk[1] === A.AD_WERE) {
        // src/uhitm.c:4264 mhitm_ad_were(). The infection roll is made on
        // every landed were bite, before all protection checks.
        await hitmsg(mtmp, mattk, indx);
        if (!rn2(4) && game.u.ulycn === NON_PM
            && !Protection_from_shape_changers()
            && !defends(A.AD_WERE, game.u.uwep)
            && !await mhitm_mgc_atk_negated(
                mtmp, game.youmonst, true)) {
            await urgent_pline('You feel feverish.');
            exercise(A_CON, false);
            set_ulycn(mdat.pmidx);
            await retouch_equipment(2);
        }
    } else if (mattk[1] === A.AD_STCK) {
        await hitmsg(mtmp, mattk, indx);
        const negated = await mhitm_mgc_atk_negated(
            mtmp, game.youmonst, false);
        if (!negated && !game.u.ustuck && !sticks(game.youmonst.data)) {
            set_ustuck_mh(mtmp);
            if (mdat.pmidx === PMNAMES.PM_BARBED_DEVIL)
                await pline('The barbs stick to you!');
        }
    } else if (mattk[1] === A.AD_STUN) {
        await hitmsg(mtmp, mattk, indx);
        if (!mtmp.mcan && !rn2(4)) {
            const { make_stunned } = await import('./potion.js');
            await make_stunned((game.u.intrinsic?.HStun || 0) + mhm.damage,
                               true);
            mhm.damage = Math.trunc(mhm.damage / 2);
        }
    } else if (mattk[1] === A.AD_LEGS) {
        const side = rn2(2) ? RIGHT_SIDE : LEFT_SIDE;
        const sidestr = side === RIGHT_SIDE ? 'right' : 'left';
        const leg = body_part(LEG);

        if ((game.u.usteed || Levitation() || Flying()) && !is_flyer(mdat)) {
            await pline(`${Monnam(mtmp)} tries to reach your ${sidestr} ${leg}!`);
            mhm.damage = 0;
        } else if (mtmp.mcan) {
            await pline(`${Monnam(mtmp)} nuzzles against your ${sidestr} ${leg}!`);
            mhm.damage = 0;
        } else {
            const boots = game.u.uarmf;
            if (boots) {
                if (rn2(2) && (boots.otyp === ONAMES.LOW_BOOTS
                               || boots.otyp === ONAMES.IRON_SHOES)) {
                    await pline(`${Monnam(mtmp)} pricks the exposed part of your ${sidestr} ${leg}!`);
                } else if (!rn2(5)) {
                    await pline(`${Monnam(mtmp)} pricks through your ${sidestr} boot!`);
                } else {
                    await pline(`${Monnam(mtmp)} scratches your ${sidestr} boot!`);
                    mhm.damage = 0;
                    return M_ATTK_HIT;
                }
            } else {
                await pline(`${Monnam(mtmp)} pricks your ${sidestr} ${leg}!`);
            }

            const { set_wounded_legs } = await import('./do.js');
            await set_wounded_legs(side, rnd(60 - ACURR(A_DEX)));
            exercise(A_STR, false);
            exercise(A_DEX, false);
        }
    } else if (mattk[1] === A.AD_SITM || mattk[1] === A.AD_SEDU) {
        await mhitm_ad_sedu(mtmp, mattk, game.youmonst, mhm);
    } else if (mattk[1] === A.AD_SSEX) {
        if (SYSOPT_SEDUCE) {
            if (could_seduce(mtmp, game.youmonst, mattk) === 1
                && !mtmp.mcan && await doseduce(mtmp)) {
                mhm.hitflags = M_ATTK_AGR_DONE;
                mhm.done = true;
            }
        } else {
            await mhitm_ad_sedu(mtmp, mattk, game.youmonst, mhm);
        }
    } else if (mattk[1] === A.AD_CURS) {
        await mhitm_ad_curs(mtmp, mattk, game.youmonst, mhm);
    } else {
        note_unported_mhitu(`hitmu:adtyp=${mattk[1]}`);
        /* the generic arms still print the plain hit message */
        await hitmsg(mtmp, mattk, indx);
        mhm.hitflags |= M_ATTK_HIT;
    }

    await mhitm_knockback(mtmp, game.youmonst, mattk, mhm,
                          (MON_WEP(mtmp) != null));

    if (mhm.done)
        return mhm.hitflags;

    if ((Upolyd(game.u) ? game.u.mh : game.u.uhp) < 1) {
        /* already dead? call rehumanize() or done_in_by() as appropriate */
        await mdamageu(mtmp, 1);
        mhm.damage = 0;
    }

    /*  Negative armor class reduces damage done instead of fully protecting
     *  against hits.
     */
    if (mhm.damage && game.u.uac < 0) {
        mhm.damage -= rnd(-game.u.uac);
        if (mhm.damage < 1)
            mhm.damage = 1;
    }

    if (mhm.damage > 0) {
        /* [Half_physical_damage isn't applied to mhm.permdmg] */
        if (game.u.uprops?.HALF_PHDAM)
            mhm.damage = ((mhm.damage + 1) / 2) | 0;

        if (mhm.permdmg) { /* Death's life force drain */
            mhm.permdmg = rn2(Math.trunc(mhm.damage / 2) + 1);
            if (Upolyd(game.u) || game.u.uhpmax > 25 * game.u.ulevel) {
                mhm.permdmg = mhm.damage;
            } else if (game.u.uhpmax > 10 * game.u.ulevel) {
                mhm.permdmg += Math.trunc(mhm.damage / 2);
            } else if (game.u.uhpmax > 5 * game.u.ulevel) {
                mhm.permdmg += Math.trunc(mhm.damage / 4);
            }

            const lowerlimit = Upolyd(game.u)
                ? Math.min(game.youmonst.data.mlevel, game.u.ulevel)
                : Math.max(game.u.ulevel, 1);
            const hpmaxKey = Upolyd(game.u) ? 'mhmax' : 'uhpmax';
            if (game.u[hpmaxKey] - mhm.permdmg > lowerlimit)
                game.u[hpmaxKey] -= mhm.permdmg;
            else if (game.u[hpmaxKey] > lowerlimit)
                game.u[hpmaxKey] = lowerlimit;
            (game.disp ||= {}).botl = true;
        }

        await mdamageu(mtmp, mhm.damage);
    }

    if (mhm.damage)
        res = await passiveum(olduasmon, mtmp, mattk);
    else
        res = M_ATTK_HIT;
    await stop_occupation();
    return res;
}

// src/mhitu.c:1902 mdamageu() — apply n points of damage to the hero.
export async function mdamageu(mtmp, n) {
    if (n < 0) {
        await impossible(`mdamageu for negative damage? (${n})`);
        n = 0;
    }

    (game.disp ||= {}).botl = true;
    if (Upolyd(game.u)) {
        game.u.mh -= n;
        await showdamage(n);
        if (game.u.mh > game.u.mhmax)
            game.u.mh = game.u.mhmax;
        if (game.u.mh < 1) {
            const { rehumanize } = await import('./polyself.js');
            await rehumanize();
        }
    } else {
        game.u.uhp -= n;
        await showdamage(n);
        if (game.u.uhp > game.u.uhpmax)
            game.u.uhp = game.u.uhpmax;
        if (game.u.uhp < 1) {
            const { done_in_by, DIED } = await import('./end.js');
            await done_in_by(mtmp, DIED);
        }
    }
}

// src/sys.c:100 sysopt.seduce — "if it's compiled in, default to on", and the
// SEDUCE=0 line in sys/unix/sysconf is commented out, so this is 1.
const SYSOPT_SEDUCE = 1;

// src/mhitu.c:1934 could_seduce() — 0 no, 1 yes, 2 "nymph-style".
//
// mattk non-Null asks about THIS attack; Null asks whether the monster has the
// capability at all.
//
// The return value is not a boolean and the two non-zero values differ on
// screen: hitmm prints "engagingly" for 2 and "seductively" for 1.
export function could_seduce(magr, mdef, mattk) {
    let pagr, agrinvis, genagr, defperc, gendef;

    if (is_animal(magr.data))
        return 0;

    if (magr === game.youmonst) {
        pagr = game.youmonst.data;
        agrinvis = Invis();
        genagr = poly_gender();
    } else {
        pagr = magr.data;
        agrinvis = !!magr.minvis;
        genagr = gender(magr);
    }
    if (mdef === game.youmonst) {
        defperc = See_invisible();
        gendef = poly_gender();
    } else {
        defperc = perceives(mdef.data);
        gendef = gender(mdef);
    }

    let adtyp = mattk ? mattk[1]
              : dmgtype(pagr, ATTKS.AD_SSEX) ? ATTKS.AD_SSEX
              : dmgtype(pagr, ATTKS.AD_SEDU) ? ATTKS.AD_SEDU
              : ATTKS.AD_PHYS;
    if (adtyp === ATTKS.AD_SSEX && !SYSOPT_SEDUCE)
        adtyp = ATTKS.AD_SEDU;

    if (agrinvis && !defperc && adtyp === ATTKS.AD_SEDU)
        return 0;

    /* nymphs have two attacks, one for steal-item damage and the other
       for seduction, both pass the could_seduce() test;
       incubi/succubi have three attacks, their claw attacks for damage
       don't pass the test */
    if ((pagr.mlet !== MONSYMS.S_NYMPH && pagr.pmidx !== PMNAMES.PM_AMOROUS_DEMON)
        || (adtyp !== ATTKS.AD_SEDU && adtyp !== ATTKS.AD_SSEX
            && adtyp !== ATTKS.AD_SITM))
        return 0;

    return (genagr === 1 - gendef) ? 1
         : (pagr.mlet === MONSYMS.S_NYMPH) ? 2 : 0;
}

import { unresponsive } from './steal.js';

function carried_gloves() {
    if (game.u.uarmg)
        return game.u.uarmg;
    return (game.invent || []).find(obj =>
        obj.oclass === OCLASSES.ARMOR_CLASS
        && game.objects[obj.otyp].oc_subtyp === 3) || null;
}

async function relocate_seducer(mon) {
    const { rloc, tele_restrict } = await import('./teleport.js');
    if (!await tele_restrict(mon))
        await rloc(mon, RLOC_MSG);
}

async function money2mon_seduction(mon, amount) {
    const gold = (game.invent || []).find(
        obj => obj.oclass === OCLASSES.COIN_CLASS);
    if (!gold || amount <= 0 || gold.quan < amount)
        return 0;

    const paid = gold.quan > amount ? splitobj(gold, amount) : gold;
    freeinv(paid);
    paid.where = OBJ_FREE;
    paid.ocarry = null;
    await mpickobj(mon, paid);
    (game.disp ||= {}).botl = true;
    return amount;
}

// src/mhitu.c:2309 mayberem() -- a seducer tries to remove one worn armor
// item. The two rn2(2) draws in the pet-name prompt short-circuit exactly as
// the nested C conditional does.
async function mayberem(mon, seducer, obj, str) {
    if (!obj || !obj.owornmask)
        return;
    if (game.u.utotype || !m_next2u(mon))
        return;

    if (Deaf()) {
        await pline(`${seducer} takes off your ${str}.`);
    } else if (rn2(20) < ACURR(A_CHA)) {
        const endearment = !rn2(2) ? 'lover' : !rn2(2) ? 'dear' : 'sweetheart';
        const qbuf = `"Shall I remove your ${str}, ${endearment}?"`;
        if (await tty_yn_function(qbuf, 'yn', 'n', true) === 'n')
            return;
    } else {
        const u = game.u;
        const invitation = obj === u.uarm
            ? "let's get a little closer"
            : (obj === u.uarmc || obj === u.uarms)
                ? "it's in the way"
                : obj === u.uarmf
                    ? 'let me rub your feet'
                    : obj === u.uarmg
                        ? "they're too clumsy"
                        : obj === u.uarmu
                            ? 'let me massage you'
                            : `let me run my fingers through your ${
                                body_part(HAIR)}`;
        await verbalize(`Take off your ${str}; ${invitation}.`);
    }
    await remove_worn_item(obj, true);
}

// src/mhitu.c:1985 doseduce() -- the complete succubus/incubus interaction:
// adornment rings, armor removal, all ten outcomes, payment, exhaustion, and
// relocation. It returns 1 on the same paths where C ends the aggressor's
// attack sequence.
export async function doseduce(mon) {
    const u = game.u;
    const fem = mon.data?.pmidx === PMNAMES.PM_AMOROUS_DEMON && !!mon.female;
    let tried_gloves = 0;

    if (mon.mcan || mon.mspec_used) {
        await pline_mon(mon, `${Monnam(mon)} acts as though ${mhe(mon)} has got a ${
            mon.mcan ? 'severe ' : ''}headache.`);
        return 0;
    }
    if (unresponsive()) {
        await pline_mon(mon, `${Monnam(mon)} seems dismayed at your lack of response.`);
        return 0;
    }

    const seewho = canseemon(mon);
    if (!seewho)
        await pline('Someone caresses you...');
    else
        await You_feel(`very attracted to ${mon_nam(mon)}.`);
    const Who = !seewho ? (fem ? 'She' : 'He') : Monnam(mon);

    await stop_donning(null);
    if (welded(u.uwep))
        tried_gloves = 1;

    for (const ring of [...(game.invent || [])]) {
        if (ring.otyp !== ONAMES.RIN_ADORNMENT)
            continue;
        if (fem) {
            if (ring.owornmask && u.uarmg) {
                if (!tried_gloves++)
                    await mayberem(mon, Who, u.uarmg, 'gloves');
                if (u.uarmg)
                    continue;
            }
            if (!Deaf() && rn2(20) < ACURR(A_CHA)) {
                const qbuf = safe_qbuf('"That ',
                    ' looks pretty.  May I have it?"', ring,
                    xname, simpleonames, 'ring');
                makeknown(ONAMES.RIN_ADORNMENT);
                if (await tty_yn_function(qbuf, 'yn', 'n', true) === 'n')
                    continue;
            } else {
                await pline(`${Who} decides she'd like ${yname(ring)}, and takes it.`);
            }
            makeknown(ONAMES.RIN_ADORNMENT);
            if (ring.owornmask)
                await remove_worn_item(ring, false);
            freeinv(ring);
            await mpickobj(mon, ring);
        } else {
            if (u.uleft && u.uright
                && u.uleft.otyp === ONAMES.RIN_ADORNMENT
                && u.uright.otyp === ONAMES.RIN_ADORNMENT)
                break;
            if (ring === u.uleft || ring === u.uright)
                continue;
            if (u.uarmg) {
                if (!tried_gloves++)
                    await mayberem(mon, Who, u.uarmg, 'gloves');
                if (u.uarmg)
                    break;
            }
            if (!Deaf() && rn2(20) < ACURR(A_CHA)) {
                const qbuf = safe_qbuf('"That ',
                    ' looks pretty.  Would you wear it for me?"', ring,
                    xname, simpleonames, 'ring');
                makeknown(ONAMES.RIN_ADORNMENT);
                if (await tty_yn_function(qbuf, 'yn', 'n', true) === 'n')
                    continue;
            } else {
                await pline(`${Who} decides you'd look prettier wearing ${yname(ring)},`);
                await pline('and puts it on your finger.');
            }
            makeknown(ONAMES.RIN_ADORNMENT);
            if (!u.uright) {
                await pline(`${Who} puts ${the(xname(ring))} on your right ${
                    body_part(HAND)}.`);
                setworn(ring, RIGHT_RING);
            } else if (!u.uleft) {
                await pline(`${Who} puts ${the(xname(ring))} on your left ${
                    body_part(HAND)}.`);
                setworn(ring, LEFT_RING);
            } else if (u.uright.otyp !== ONAMES.RIN_ADORNMENT) {
                await pline(`${Who} replaces ${yname(u.uright)} with ${yname(ring)}.`);
                await Ring_gone(u.uright);
                if (u.utotype || !m_next2u(mon))
                    return 1;
                setworn(ring, RIGHT_RING);
            } else if (u.uleft.otyp !== ONAMES.RIN_ADORNMENT) {
                await pline(`${Who} replaces ${yname(u.uleft)} with ${yname(ring)}.`);
                await Ring_gone(u.uleft);
                if (u.utotype || !m_next2u(mon))
                    return 1;
                setworn(ring, LEFT_RING);
            }
            await Ring_on(ring);
            await prinv(null, ring, 0);
        }
    }

    const naked = !u.uarmc && !u.uarmf && !u.uarmg && !u.uarms
        && !u.uarmh && !u.uarmu;
    const murmur = Deaf()
        ? 'seems to murmur into your ear'
        : naked ? 'murmurs sweet nothings into your ear'
                : 'murmurs in your ear';
    await urgent_pline(`${Who} ${murmur}${
        naked ? '' : ', while helping you undress'}.`);
    await mayberem(mon, Who, u.uarmc, cloak_simple_name(u.uarmc));
    if (!u.uarmc)
        await mayberem(mon, Who, u.uarm, suit_simple_name(u.uarm));
    await mayberem(mon, Who, u.uarmf, 'boots');
    if (!tried_gloves)
        await mayberem(mon, Who, u.uarmg, 'gloves');
    await mayberem(mon, Who, u.uarms, 'shield');
    await mayberem(mon, Who, u.uarmh, helm_simple_name(u.uarmh));
    if (!u.uarmc && !u.uarm)
        await mayberem(mon, Who, u.uarmu, 'shirt');

    if (u.utotype || !m_next2u(mon))
        return 1;

    if (u.uarm || u.uarmc) {
        if (!Deaf()) {
            const leapDay = yyyymmdd() - getyear() * 10000 === 0xe5;
            if (!(leapDay && mon.female)) {
                await verbalize(`You're such a ${
                    game.flags.female ? 'sweet lady' : 'nice guy'}; I wish...`);
            } else {
                const gloves = carried_gloves();
                if (gloves)
                    observe_object(gloves);
                await verbalize(`Well, then you owe me ${
                    gloves ? yname(gloves) : 'twelve pairs of gloves'}${
                    gloves ? ' and eleven more pairs of gloves' : ''}!`);
            }
        } else if (seewho) {
            await pline_mon(mon, `${Monnam(mon)} appears to sigh.`);
        }
        await relocate_seducer(mon);
        return 1;
    }

    if (u.ualign.type === A_CHAOTIC)
        adjalign(1);
    await urgent_pline(`Time stands still while you and ${
        noit_mon_nam(mon)} lie in each other's arms...`);

    const attr_tot = ACURR(A_CHA) + ACURR(A_INT);
    if (rn2(35) > Math.min(attr_tot, 32)) {
        await pline(`${noit_Monnam(mon)} seems to have enjoyed it more than you...`);
        switch (rn2(5)) {
        case 0:
            await You_feel('drained of energy.');
            if (!game.disp?.botl && !game.disp?.botlx) {
                game._deferred_status_power_until_dirty = {
                    current: u.uen,
                    max: u.uenmax,
                };
            }
            u.uen = 0;
            u.uenmax -= rnd((game.u.intrinsic?.HHalf_physical_damage
                             || game.u.uprops?.HALF_PHDAM) ? 5 : 10);
            exercise(A_CON, false);
            if (u.uenmax < 0)
                u.uenmax = 0;
            break;
        case 1:
            await You('are down in the dumps.');
            await adjattrib(A_CON, -1, true);
            exercise(A_CON, false);
            (game.disp ||= {}).botl = true;
            break;
        case 2:
            await Your('senses are dulled.');
            await adjattrib(A_WIS, -1, true);
            exercise(A_WIS, false);
            (game.disp ||= {}).botl = true;
            break;
        case 3:
            if (!resists_drli(game.youmonst)) {
                await You_feel('out of shape.');
                await losexp('overexertion');
            } else {
                await You('have a curious feeling...');
            }
            exercise(A_CON, false);
            exercise(A_DEX, false);
            exercise(A_WIS, false);
            break;
        case 4: {
            await You_feel('exhausted.');
            exercise(A_STR, false);
            let damage = rn1(10, 6);
            if (game.u.intrinsic?.HHalf_physical_damage
                || game.u.uprops?.HALF_PHDAM)
                damage = Math.trunc((damage + 1) / 2);
            await losehp(damage, 'exhaustion', KILLED_BY);
            break;
        }
        }
    } else {
        mon.mspec_used = rnd(100);
        await You(`seem to have enjoyed it more than ${noit_mon_nam(mon)}...`);
        switch (rn2(5)) {
        case 0:
            await You_feel('raised to your full potential.');
            exercise(A_CON, true);
            if (!game.disp?.botl && !game.disp?.botlx) {
                game._deferred_status_power_until_dirty = {
                    current: u.uen,
                    max: u.uenmax,
                };
            }
            u.uenmax += rnd(5);
            u.uen = u.uenmax;
            if (u.uenmax > (u.uenpeak ?? 0))
                u.uenpeak = u.uenmax;
            break;
        case 1:
            await You_feel('good enough to do it again.');
            await adjattrib(A_CON, 1, true);
            exercise(A_CON, true);
            (game.disp ||= {}).botl = true;
            break;
        case 2:
            await You(`will always remember ${noit_mon_nam(mon)}...`);
            await adjattrib(A_WIS, 1, true);
            exercise(A_WIS, true);
            (game.disp ||= {}).botl = true;
            break;
        case 3:
            await pline('That was a very educational experience.');
            await pluslvl(false);
            exercise(A_WIS, true);
            break;
        case 4:
            await You_feel('restored to health!');
            u.uhp = u.uhpmax;
            if (Upolyd(u))
                u.mh = u.mhmax;
            exercise(A_STR, true);
            (game.disp ||= {}).botl = true;
            break;
        }
    }

    if (mon.mtame) {
        // Tame seducers do not charge.
    } else if (rn2(20) < ACURR(A_CHA)) {
        await pline(`${noit_Monnam(mon)} demands that you pay ${
            noit_mhim(mon)}, but you refuse...`);
    } else if (u.umonnum === PMNAMES.PM_LEPRECHAUN) {
        await pline_mon(mon, `${noit_Monnam(mon)} tries to take your gold, but fails...`);
    } else {
        const umoney = money_cnt(game.invent);
        let cost = umoney > LARGEST_INT - 10
            ? rnd(LARGEST_INT) + 500 : rnd(umoney + 10) + 500;
        if (mon.mpeaceful) {
            cost = Math.trunc(cost / 5);
            if (!cost)
                cost = 1;
        }
        if (cost > umoney)
            cost = umoney;
        if (!cost) {
            if (!Deaf())
                await verbalize("It's on the house!");
            else
                await pline('No charge.');
        } else {
            await pline_mon(mon, `${noit_Monnam(mon)} takes ${cost} ${
                currency(cost)} for services rendered!`);
            await money2mon_seduction(mon, cost);
            (game.disp ||= {}).botl = true;
        }
    }
    if (!rn2(25))
        mon.mcan = 1;
    await relocate_seducer(mon);
    return 1;
}

// src/mhitu.c:2435 passiveum() — the hero's passive counterattack.
//
// The slot walk lands on the first AT_NONE or AT_BOOM row of the hero's
// possibly former monster form. A normal hero's row is all-zero: no dice,
// AD_PHYS, so nothing happens and nothing is drawn.
async function passiveum_assess_dmg(mtmp, damage) {
    mtmp.mhp -= damage;
    if (mtmp.mhp <= 0) {
        await pline(`${Monnam(mtmp)} dies!`);
        const { xkilled } = await import('./mon.js');
        await xkilled(mtmp, XKILL_NOMSG);
        return DEADMONSTER(mtmp) ? M_ATTK_AGR_DIED : M_ATTK_HIT;
    }
    return M_ATTK_HIT;
}

// src/mhitu.c:2355 paralyze_monst().
function passiveum_paralyze_monst(mtmp, turns) {
    mtmp.mcanmove = 0;
    mtmp.mfrozen = turns;
    mtmp.meating = 0;
    mtmp.mstrategy = (mtmp.mstrategy | 0) & ~STRAT_WAITFORU;
}

// src/mon.c:3748 mon_to_stone().
async function passiveum_mon_to_stone(mtmp) {
    if (mtmp.data.mlet !== MONSYMS.S_GOLEM)
        return;

    if (canseemon(mtmp))
        await pline(`${Monnam(mtmp)} solidifies...`);
    if (await newcham(mtmp, game.mons[PMNAMES.PM_STONE_GOLEM], 0)) {
        if (canseemon(mtmp))
            await pline(`Now it's ${an(pmname(mtmp.data, gender(mtmp)))}.`);
    } else if (canseemon(mtmp)) {
        await pline('... and returns to normal.');
    }
}

// src/mhitu.c:2616 cloneu()
export async function cloneu() {
    const u = game.u;
    let mon;
    const mndx = monsndx(game.youmonst.data);

    if (u.mh <= 1)
        return null;
    if (game.mvitals[mndx].mvflags & MFLAGS.G_EXTINCT)
        return null;
    mon = await makemon(game.youmonst.data, u.ux, u.uy,
                  NO_MINVENT | MM_EDOG | MM_NOMSG);
    if (!mon)
        return null;
    mon.mcloned = 1;
    mon = christen_monst(mon, game.plname);
    initedog(mon, true);
    mon.m_lev = game.youmonst.data.mlevel;
    mon.mhpmax = u.mhmax;
    mon.mhp = Math.trunc(u.mh / 2);
    u.mh -= mon.mhp;
    (game.disp ||= {}).botl = true;
    return mon;
}

async function passiveum(olduasmon, mtmp, mattk) {
    const A = ATTKS;
    let i, oldu_mattk = null;

    for (i = 0; !oldu_mattk; i++) {
        if (i >= 6)
            return M_ATTK_HIT;
        if (olduasmon.mattk[i][0] === A.AT_NONE
            || olduasmon.mattk[i][0] === A.AT_BOOM)
            oldu_mattk = olduasmon.mattk[i];
    }
    let tmp;
    if (oldu_mattk[2])
        tmp = d(oldu_mattk[2], oldu_mattk[3]);
    else if (oldu_mattk[3])
        tmp = d(olduasmon.mlevel + 1, oldu_mattk[3]);
    else
        tmp = 0;

    /* These affect the enemy even if you were "killed" (rehumanized) */
    switch (oldu_mattk[1]) {
    case A.AD_ACID:
        if (!rn2(2)) {
            await pline(`${Monnam(mtmp)} is splashed by ${
                Upolyd(game.u) ? 'your ' : ''}${hliquid('acid')}!`);
            if (resists_acid(mtmp)) {
                await pline(`${Monnam(mtmp)} is not affected.`);
                tmp = 0;
            }
        } else {
            tmp = 0;
        }
        if (!rn2(30))
            await erode_armor(mtmp, ERODE_CORRODE);
        if (!rn2(6))
            await erode_obj(MON_WEP(mtmp), null, ERODE_CORRODE,
                            EF_GREASE | EF_VERBOSE);
        return passiveum_assess_dmg(mtmp, tmp);
    case A.AD_STON: { /* cockatrice */
        const protector = attk_protection(mattk[0]);
        let wornitems = mtmp.misc_worn_check | 0;

        if (MON_WEP(mtmp))
            wornitems |= W_ARMG;
        if (!resists_ston(mtmp)
            && (protector === 0
                || (protector !== -1
                    && (wornitems & protector) !== protector))) {
            if (poly_when_stoned(mtmp.data)) {
                await passiveum_mon_to_stone(mtmp);
                return M_ATTK_HIT;
            }
            await pline(`${Monnam(mtmp)} turns to stone!`);
            game.stoned = true;
            const { xkilled } = await import('./mon.js');
            await xkilled(mtmp, XKILL_NOMSG);
            return DEADMONSTER(mtmp) ? M_ATTK_AGR_DIED : M_ATTK_HIT;
        }
        return M_ATTK_HIT;
    }
    case A.AD_ENCH: /* KMH -- remove enchantment (disenchanter) */
        if (game.mon_currwep)
            await drain_item(game.mon_currwep, true);
        return M_ATTK_HIT;
    default:
        break;
    }
    if (!Upolyd(game.u))
        return M_ATTK_HIT;

    /* These affect the enemy only if you are still a monster */
    if (rn2(3)) {
        switch (oldu_mattk[1]) {
        case A.AD_PHYS:
            if (oldu_mattk[0] === A.AT_BOOM) {
                await You('explode!');
                const { rehumanize } = await import('./polyself.js');
                await rehumanize();
                return passiveum_assess_dmg(mtmp, tmp);
            }
            break;
        case A.AD_PLYS:
            if (tmp > 127)
                tmp = 127;
            if (game.u.umonnum === PMNAMES.PM_FLOATING_EYE) {
                if (!rn2(4))
                    tmp = 127;
                if (mtmp.mcansee && haseyes(mtmp.data) && rn2(3)
                    && (perceives(mtmp.data) || !Invis())) {
                    if (Blind()) {
                        await pline(`As a blind ${pmname(
                            game.youmonst.data, game.flags.female ? 1 : 0
                        )}, you cannot defend yourself.`);
                    } else {
                        if (await mon_reflects(
                            mtmp, 'Your gaze is reflected by %s %s.'))
                            return M_ATTK_HIT;
                        await pline(`${Monnam(mtmp)} is frozen by your gaze!`);
                        passiveum_paralyze_monst(mtmp, tmp);
                        return M_ATTK_AGR_DONE;
                    }
                }
            } else {
                await pline(`${Monnam(mtmp)} is frozen by you.`);
                passiveum_paralyze_monst(mtmp, tmp);
                return M_ATTK_AGR_DONE;
            }
            return M_ATTK_HIT;
        case A.AD_COLD: /* brown mold or blue jelly */
            if (resists_cold(mtmp)) {
                await shieldeff(mtmp.mx, mtmp.my);
                await pline(`${Monnam(mtmp)} is mildly chilly.`);
                await golemeffects(mtmp, A.AD_COLD, tmp);
                tmp = 0;
                break;
            }
            const shownHp = game.u.mh;
            const shownMaxHp = game.u.mhmax;
            await pline(`${Monnam(mtmp)} is suddenly very cold!`);
            const pendingLine = (game._pending_message || '')
                .split('\n').at(-1);
            const cols = game.nhDisplay?.cols ?? 80;
            /* A following "It dies!" adds three separator columns and eight
               text columns. If that forces C's more(), its status row still
               contains the pre-growth polymorph HP. */
            const deathWillForceMore = mtmp.mhp - tmp <= 0
                && !game._topl_cury
                && pendingLine.length + 11 >= cols - 8;
            if (deathWillForceMore) {
                game._deferred_status_hp_until_more = shownHp;
                game._deferred_status_hpmax_until_more = shownMaxHp;
                game._deferred_status_hp_more_count = 1;
            }
            game.u.mh += Math.trunc((tmp + rn2(2)) / 2);
            if (game.u.mhmax < game.u.mh)
                game.u.mhmax = game.u.mh;
            (game.disp ||= {}).botl = true;
            if (game.u.mhmax > (game.youmonst.data.mlevel + 1) * 8)
                await split_mon(game.youmonst, mtmp);
            break;
        case A.AD_STUN:
            if (!mtmp.mstun) {
                mtmp.mstun = 1;
                await pline(`${Monnam(mtmp)} ${
                    makeplural(stagger(mtmp.data, 'stagger'))}.`);
            }
            tmp = 0;
            break;
        case A.AD_FIRE:
            if (resists_fire(mtmp)) {
                await shieldeff(mtmp.mx, mtmp.my);
                await pline(`${Monnam(mtmp)} is mildly warm.`);
                await golemeffects(mtmp, A.AD_FIRE, tmp);
                tmp = 0;
                break;
            }
            await pline(`${Monnam(mtmp)} is suddenly very hot!`);
            break;
        case A.AD_ELEC:
            if (resists_elec(mtmp)) {
                await shieldeff(mtmp.mx, mtmp.my);
                await pline(`${Monnam(mtmp)} is slightly tingled.`);
                await golemeffects(mtmp, A.AD_ELEC, tmp);
                tmp = 0;
                break;
            }
            await pline(`${Monnam(mtmp)} is jolted with your electricity!`);
            break;
        default:
            tmp = 0;
            break;
        }
    } else {
        tmp = 0;
    }

    return passiveum_assess_dmg(mtmp, tmp);
}

// src/mhitu.c:264 expels() — release the hero from an engulfer.
export async function expels(mtmp, mdat, message) {
    (game.disp ||= {}).botl = true;
    if (message) {
        if (digests(mdat)) {
            await pline('You get regurgitated!');
        } else if (enfolds(mdat)) {
            await pline(`${Monnam(mtmp)} unfolds and you are released!`);
        } else {
            const attk = attacktype_fordmg(mdat, ATTKS.AT_ENGL, -1);
            let blast = '';
            if (attk) {
                if (is_whirly(mdat)) {
                    if (attk[1] === ATTKS.AD_ELEC)
                        blast = ' in a shower of sparks';
                    else if (attk[1] === ATTKS.AD_COLD)
                        blast = ' in a blast of frost';
                } else
                    blast = ' with a squelch';
                await pline(`You get expelled from ${mon_nam(mtmp)}${blast}!`);
            }
        }
    }
    const { unstuck, mnexto } = await import('./mon.js');
    await unstuck(mtmp);    /* clears uswallow, moves hero, docrt */
    await mnexto(mtmp, 0 /* RLOC_NOMSG */);
    newsym(game.u.ux, game.u.uy);
    if (Math.max(Math.abs(mtmp.mx - game.u.ux),
                 Math.abs(mtmp.my - game.u.uy)) > 1)
        await pline('Brrooaa...  You land hard at some distance.');
    const { spoteffects } = await import('./hack.js');
    await spoteffects(true);
}

/* include/mondata.h:73 enfolds() — trapper/lurker-above fold-around */
const enfolds = (ptr) =>
    dmgtype_fromattack(ptr, ATTKS.AD_WRAP, ATTKS.AT_ENGL) != null;

// src/mhitu.c:1289 gulpmu() — monster swallows you, or damages you when
// already swallowed.
export async function gulpmu(mtmp, mattk) {
    const u = game.u;
    const mdat = game.mons[mtmp.mnum];
    const t = t_at(u.ux, u.uy);
    let tmp = d(mattk[2], mattk[3]);
    let tim_tmp;
    let physical_damage = false;

    if (!u.uswallow) { /* swallows you */
        const omx = mtmp.mx, omy = mtmp.my;

        if (!engulf_target(mtmp, game.youmonst))
            return M_ATTK_MISS;
        if (t && is_pit(t.ttyp) && sobj_at(ONAMES.BOULDER, u.ux, u.uy))
            return M_ATTK_MISS;
        if (await failed_grab(mtmp, game.youmonst, mattk))
            return M_ATTK_MISS;

        if (u.uball)
            unplacebc();
        remove_monster(omx, omy);
        mtmp.mtrapped = 0; /* no longer on old trap */
        place_monster(mtmp, u.ux, u.uy);
        set_ustuck(mtmp);
        newsym(mtmp.mx, mtmp.my);
        if (u.usteed) {
            const buf = mon_nam(u.usteed);
            await urgent_pline(`${Some_Monnam(mtmp)} ${
                is_animal(mdat) ? 'lunges' : is_whirly(mdat) ? 'whirls'
                : unsolid(mdat) ? 'flows' : amorphous(mdat) ? 'oozes'
                : 'surges'} forward and plucks you off ${buf}!`);
            await dismount_steed(DISMOUNT_ENGULFED);
        } else {
            await urgent_pline(`${Monnam(mtmp)} ${
                digests(mdat) ? 'swallows you whole'
                : enfolds(mdat) ? 'folds itself around you'
                  : 'engulfs you'}!`);
        }
        await stop_occupation();
        reset_occupations();

        if (u.utrap) {
            await pline(`You are released from the ${
                u.utraptype === TT_WEB ? 'web' : 'trap'}!`);
            await reset_utrap(false);
        }
        const i = number_leashed();
        if (i > 0) {
            const s = i > 1 ? 'leashes' : 'leash';
            await pline_The(`${s} ${vtense(s, 'snap')} loose.`);
            unleash_all();
        }
        if (touch_petrifies(game.youmonst.data) && !resists_ston(mtmp)) {
            remove_monster(mtmp.mx, mtmp.my);
            place_monster(mtmp, omx, omy);
            await minstapetrify(mtmp, true);
            if (u.uball)
                await placebc();
            set_ustuck(null);
            return !DEADMONSTER(mtmp) ? M_ATTK_MISS : M_ATTK_AGR_DIED;
        }

        await display_nhwindow_message();
        vision_recalc(2); /* hero can't see anything */
        u.uswallow = 1;
        if (mattk[1] === ATTKS.AD_DGST) {
            /* good armor & high Con make digestion take longer */
            tim_tmp = ACURR(A_CON) + 10 - u.uac + rn2(20);
            if (tim_tmp < 0)
                tim_tmp = 0;
            tim_tmp = Math.trunc(tim_tmp / mtmp.m_lev);
            tim_tmp += 3;
        } else {
            /* higher level attacker takes longer to eject hero;
               C's expression is m_lev + (10 / 2) by precedence */
            tim_tmp = rnd(mtmp.m_lev + 5);
        }
        u.uswldtim = (tim_tmp < 2) ? 2 : tim_tmp;
        await swallowed(1); /* the engulf interior display */
        if (!flaming(mdat))
            for (const obj of [...(game.invent || [])])
                await snuff_lit(obj);
    }

    if (mtmp !== u.ustuck)
        return M_ATTK_MISS;
    if (u.uball) {
        if (u.uchain.where === OBJ_FREE) {
            u.uchain.ox = mtmp.mx;
            u.uchain.oy = mtmp.my;
        }
        if (u.uball.where === OBJ_FREE) {
            u.uball.ox = mtmp.mx;
            u.uball.oy = mtmp.my;
        }
    }
    if (u.uswldtim > 0)
        u.uswldtim -= 1;

    switch (mattk[1]) {
    case ATTKS.AD_DGST:
        physical_damage = true;
        if (Slow_digestion()) {
            u.uswldtim = 0;
            tmp = 0;
        } else if (u.uswldtim === 0) {
            await pline(`${Monnam(mtmp)} totally digests you!`);
            tmp = u.uhp;
            if (Half_physical_damage())
                tmp *= 2;
        } else {
            await pline(`${Monnam(mtmp)}${
                u.uswldtim === 2 ? ' thoroughly'
                : u.uswldtim === 1 ? ' utterly' : ''} digests you!`);
            exercise(A_STR, false);
        }
        break;
    case ATTKS.AD_PHYS:
        physical_damage = true;
        if (mtmp.mnum === PMNAMES.PM_FOG_CLOUD) {
            await You(`are laden with moisture and ${flaming(game.youmonst.data)
                ? 'are smoldering out!' : Breathless() ? 'find it mildly uncomfortable.'
                : amphibious(game.youmonst.data) ? 'feel comforted.' : 'can barely breathe!'}`);
            if ((Amphibious() || Breathless()) && !flaming(game.youmonst.data))
                tmp = 0;
        } else {
            await pline(`You are ${enfolds(mdat) ? 'being squashed'
                                                 : 'pummeled with debris'}!`);
            exercise(A_STR, false);
        }
        break;
    case ATTKS.AD_ACID:
        if (Acid_resistance()) {
            await pline('You are covered with a seemingly harmless goo.');
            monstseesu(M_SEEN_ACID);
            tmp = 0;
        } else {
            if (Hallucination())
                await pline("Ouch!  You've been slimed!");
            else
                await pline('You are covered in slime!  It burns!');
            exercise(A_STR, false);
            monstunseesu(M_SEEN_ACID);
        }
        break;
    case ATTKS.AD_BLND:
        if (can_blnd(mtmp, game.youmonst, mattk[0], null)) {
            if (!Blind()) {
                const was_blinded = Blinded();
                if (!was_blinded)
                    await You("can't see in here!");
                await make_blinded(tmp, false);
                if (!was_blinded && !Blind())
                    await Your('vision quickly clears.');
            } else {
                incr_itimeout('HBlinded', 1);
            }
        }
        tmp = 0;
        break;
    case ATTKS.AD_ELEC:
        if (!mtmp.mcan && rn2(2)) {
            await pline('The air around you crackles with electricity.');
            if (Shock_resistance()) {
                await shieldeff(u.ux, u.uy);
                await You('seem unhurt.');
                monstseesu(M_SEEN_ELEC);
                await ugolemeffects(ATTKS.AD_ELEC, tmp);
                tmp = 0;
            } else
                monstunseesu(M_SEEN_ELEC);
        } else
            tmp = 0;
        break;
    case ATTKS.AD_COLD:
        if (!mtmp.mcan && rn2(2)) {
            if (Cold_resistance()) {
                await shieldeff(u.ux, u.uy);
                await You_feel('mildly chilly.');
                monstseesu(M_SEEN_COLD);
                await ugolemeffects(ATTKS.AD_COLD, tmp);
                tmp = 0;
            } else {
                await pline('You are freezing to death!');
                monstunseesu(M_SEEN_COLD);
            }
        } else
            tmp = 0;
        break;
    case ATTKS.AD_FIRE:
        if (!mtmp.mcan && rn2(2)) {
            if (Fire_resistance()) {
                await shieldeff(u.ux, u.uy);
                await You_feel('mildly hot.');
                monstseesu(M_SEEN_FIRE);
                await ugolemeffects(ATTKS.AD_FIRE, tmp);
                tmp = 0;
            } else {
                await pline('You are burning to a crisp!');
                monstunseesu(M_SEEN_FIRE);
            }
            await burn_away_slime();
        } else
            tmp = 0;
        break;
    case ATTKS.AD_DISE:
        if (!await diseasemu(mdat))
            tmp = 0;
        break;
    case ATTKS.AD_DREN:
        if (!mtmp.mcan && rn2(4)) {
            const { drain_en } = await import('./trap.js');
            await drain_en(tmp, false);
        }
        tmp = 0;
        break;
    default:
        physical_damage = true;
        tmp = 0;
        break;
    }

    if (physical_damage) {
        /* same damage reduction for AC as in hitmu */
        if (u.uac < 0)
            tmp -= rnd(-u.uac);
        if (tmp < 0)
            tmp = 1;
        if (Half_physical_damage())
            tmp = Math.trunc((tmp + 1) / 2); // Maybe_Half_Phys(tmp)
    }

    game.mswallower = mtmp;
    await mdamageu(mtmp, tmp);
    game.mswallower = null;
    if (tmp)
        await stop_occupation();

    if (!u.uswallow) {
        ; /* life-saving has already expelled swallowed hero */
    } else if (touch_petrifies(game.youmonst.data) && !resists_ston(mtmp)) {
        await pline(`${Monnam(mtmp)} very hurriedly ${digests(mdat) ? 'regurgitates'
            : enfolds(mdat) ? 'releases' : 'expels'} you!`);
        await expels(mtmp, mtmp.data, false);
    } else if (!u.uswldtim || game.youmonst.data.msize >= MFLAGS.MZ_HUGE) {
        await pline(`You get ${digests(mdat) ? 'regurgitated'
                    : enfolds(mdat) ? 'released' : 'expelled'}!`);
        if (game.flags?.verbose
            && digests(mdat) && Slow_digestion())
            await pline(`Obviously ${mon_nam(mtmp)} doesn't like your taste.`);
        await expels(mtmp, mdat, false);
    }
    return M_ATTK_HIT;
}

function set_ustuck_mh(mtmp) {
    /* routed through mon.js at call time to avoid deepening the cycle */
    (game.disp ||= {}).botl = true;
    game.u.ustuck = mtmp;
}

// src/mhitu.c u_slip_free(); greased or slippery armor lets the hero slip
// out of a grab
export async function u_slip_free(mtmp, mattk) {
    let obj;

    /* greased armor does not protect against AT_ENGL+AD_WRAP */
    if (mattk[0] === ATTKS.AT_ENGL)
        return false;

    obj = (game.u.uarmc ? game.u.uarmc : game.u.uarm);
    if (!obj)
        obj = game.u.uarmu;
    if (mattk[1] === ATTKS.AD_DRIN)
        obj = game.u.uarmh;

    /* if your cloak/armor is greased, monster slips off; this
       protection might fail (33% chance) when the armor is cursed */
    if (obj && (obj.greased || obj.otyp === ONAMES.OILSKIN_CLOAK)
        && (!obj.cursed || rn2(3))) {
        await pline(`${Monnam(mtmp)} ${
              (mattk[1] === ATTKS.AD_WRAP) ? 'slips off of'
                                           : 'grabs you, but cannot hold onto'} your ${
              obj.greased ? 'greased' : 'slippery'} ${
              /* avoid "slippery slippery cloak"
                 for undiscovered oilskin cloak */
              (obj.greased || game.objects[obj.otyp].oc_name_known)
                  ? xname(obj)
                  : cloak_simple_name(obj)}!`);

        if (obj.greased && !rn2(2)) {
            await pline_The('grease wears off.');
            obj.greased = 0;
            update_inventory();
        }
        return true;
    }
    return false;
}

// src/mhitu.c:1273 gulp_blnd_check(); an engulfer with a blinding attack
// gets its blinding in as soon as the hero can see again
export async function gulp_blnd_check() {
    let mattk;

    if (!Blinded() && game.u.uswallow
        && (mattk = attacktype_fordmg(game.u.ustuck.data, ATTKS.AT_ENGL, ATTKS.AD_BLND))
        && can_blnd(game.u.ustuck, game.youmonst, mattk[0], null)) {
        ++game.u.uswldtim; /* compensate for gulpmu change */
        await gulpmu(game.u.ustuck, mattk);
        return true;
    }
    return false;
}
