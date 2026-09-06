import { DISMOUNT_KNOCKED } from './const.js';
import { NEUTRAL } from './const.js';
import { A_CON } from './const.js';
import { RLOC_MSG } from './const.js';
import { OBJ_INVENT } from './const.js';
import { W_WEP } from './const.js';
import { CXN_ARTICLE } from './const.js';
import { Mgender } from './const.js';
import { G_UNIQ } from './const.js';
import { KILLED_BY } from './const.js';
import { KILLED_BY_AN } from './const.js';
import { POTHIT_HERO_THROW } from './const.js';
import { POTHIT_HERO_BASH } from './const.js';
import { MMOVE_DIED } from './const.js';
import { dismount_steed } from './steed.js';
import { cloneu } from './mhitu.js';
import { mpickobj } from './steal.js';
import { findgold } from './makemon.js';
import { the } from './objnam.js';
import { type_is_pname } from './mondata.js';
import { adjattrib } from './attrib.js';
import { losespells } from './spell.js';
import { eat_brains } from './eat.js';
import { locomotion } from './mondata.js';
import { mdistu } from './monmove.js';
import { steal } from './steal.js';
import { rloc } from './teleport.js';
import { tele_restrict, tele, u_teleport_mon } from './teleport.js';
import { could_seduce } from './mhitu.js';
import { u_slip_free } from './mhitu.js';
import { failed_grab, sleep_monst, slept_monst, engulf_target,
         xdrainenergym } from './mhitm.js';
import { snuff_lit } from './apply.js';
import { eating_conducts, newuhs, Finish_digestion } from './eat.js';
import { m_useup } from './mthrowu.js';
import { done } from './end.js';
import { touch_of_death } from './mcastu.js';
import { explode, adtyp_to_expltype } from './explode.js';
import { rehumanize } from './polyself.js';
import { is_vampshifter } from './monst.js';
import { DISP_ALWAYS, DISP_END, NO_NC_FLAGS, NO_KILLER_PREFIX, DIED,
         STOMACH, XKILL_GIVEMSG, MON_EXPLODE } from './const.js';
import { drain_weapon_skill } from './weapon.js';
import { silver_sears } from './weapon.js';
import { polymon } from './polyself.js';
import { uunstick } from './polyself.js';
import { mhe } from './mondata.js';
import { gender } from './mondata.js';
import { is_animal } from './mondata.js';
import { can_be_strangled } from './mondata.js';
import { stagger } from './mondata.js';
import { make_stoned, make_slimed } from './potion.js';
import { potionhit } from './potion.js';
import { hold_another_object } from './invent.js';
import { freeinv } from './invent.js';
import { splitobj } from './mkobj.js';
import { find_artifact } from './artifact.js';
import { artifact_hit } from './artifact.js';
import { artifact_light } from './artifact.js';
import { corpse_xname } from './objnam.js';
import { bare_artifactname } from './objnam.js';
import { cutworm } from './worm.js';
import { mon_nam_too } from './do_name.js';
import { noit_Monnam } from './do_name.js';
import { MHID_ALTMON } from './pager.js';
import { mhidden_description } from './pager.js';
import { m_move } from './monmove.js';
import { setuwep } from './wield.js';
import { untwoweapon } from './wield.js';
import { can_twoweapon } from './wield.js';
import { monkilled } from './mon.js';
import { angry_guards } from './mon.js';
import { ghod_hitsu } from './priest.js';
import { bigmonst } from './mondata.js';
import { mon_hates_light } from './mondata.js';
import { hurtle, mhurtle, will_hurtle } from './dothrow.js';
import { mon_poly } from './mhitm.js';
import { split_mon } from './potion.js';
import { change_luck, exercise, poisoned } from './attrib.js';
import { A_DEX, A_STR, A_INT, A_WIS, ERODE_NONE, ERODE_BURN, ERODE_RUST,
         ERODE_CORRODE, EF_NONE, EF_GREASE, EF_VERBOSE, ER_NOTHING,
         M_SEEN_ACID, M_SEEN_MAGR, M_SEEN_COLD, M_SEEN_FIRE,
         M_SEEN_ELEC, STONING, Upolyd } from './const.js';
// uhitm.js — the hero attacking, or declining to attack, a monster.
// C ref: src/uhitm.c
//
// Hero melee, attack checks, weapon handling, and the monster's passive
// response are ported along the deterministic C-reference paths exercised by
// the public and supplemental suites. Remaining unsupported branches record
// explicit markers so coverage work can find them.

import { game } from './gstate.js';
import { helpless, MON_WEP } from './monst.js';
import { rn1 } from './rng.js';
import { dmgtype, monstseesu, monstunseesu } from './mondata.js';
import { touch_petrifies, abuse_dog, slimeproof } from './dog.js';
import { munslime } from './muse.js';
import { delayed_killer } from './end.js';
import { SLIMED, NC_SHOW_MSG } from './const.js';
import { which_armor, extract_from_minvent } from './worn.js';
import { hitmsg, magic_negation, mdamageu, mpoisons_subj, mhis } from './mhitu.js';
import { You, Your, You_feel, You_hear, livelog_add, pline_The,
         pline_mon, verbalize } from './pline.js';
import { end_running } from './hack.js';
import { Adjmonnam, mon_nam, Monnam, y_monnam, m_monnam, upstart, a_monnam,
         x_monnam, hliquid, hcolor, pmname, Some_Monnam,
         some_mon_nam } from './do_name.js';
import { destroy_items, drain_item, exclam, hit, obj_resists,
         resist } from './zap.js';
import { Acid_resistance, Antimagic, Blind, Cold_resistance, Deaf,
         Fire_resistance, Free_action, Fumbling, Hallucination, Flying, Levitation,
         Invisible, Shock_resistance, Swimming, Amphibious, Breathless,
         Sleep_resistance, Stone_resistance, Sick_resistance,
         Slow_digestion, Unchanging, Teleport_control, Stunned } from './youprop.js';
import { canseemon, canspotmon, glyph_at, sensemon, newsym, pline, shieldeff,
         flush_screen, glyph_is_invisible_at, map_invisible,
         unmap_invisible, urgent_pline, map_location, mon_to_glyph,
         tmp_at } from './display.js';
import { wakeup, wake_nearto, killed, xkilled, seemimic, setmangry, mongone,
         shieldeff_mon, is_pool, m_carrying, t_at, minliquid,
         healmon, monstone, mondied, newcham, mlifesaver, corpse_chance } from './mon.js';
import { DEADMONSTER } from './monst.js';
import { is_pole } from './u_init.js';
import { bimanual, carried, is_plural, is_flimsy, is_shield,
         is_poisonable, stone_missile } from './obj.js';
import { is_ammo, is_missile, ammo_and_launcher, set_twoweap,
         uwepgone } from './wield.js';
import { obj_extract_self, update_inventory, useup } from './invent.js';
import { rnl } from './rng.js';
import { ART_CLEAVER, ART_SNICKERSNEE, ART_GIANTSLAYER,
         artifact_names,
         ART_OGRESMASHER } from './artilist_data.js';
import { an, aobjnam, yname, cxname, xname, The, makeplural, simpleonames,
         obj_is_pname, otense, mshot_xname, Yname2, Yobjnam2,
         doname } from './objnam.js';
import { mintrap, instapetrify, minstapetrify, mselftouch, erode_obj,
         ignite_items, unconscious } from './trap.js';
import { clone_mon, goodpos, place_monster, remove_monster,
         is_rider, grow_up, monsndx } from './makemon.js';
import { rn2, rnd, d, rn2_on_display_rng } from './rng.js';
import { is_safemon } from './display.js';
import { monflee, set_apparxy } from './monmove.js';
import { monnear } from './monmove.js';
import { IS_OBSTRUCTED, MON_POLE_DIST, M_ATTK_HIT, M_ATTK_MISS,
         M_ATTK_DEF_DIED, M_ATTK_AGR_DIED, M_ATTK_AGR_DONE,
         NATTK, MM_IGNOREWATER,
         MM_IGNORELAVA, Is_airlevel, Is_waterlevel, isok,
         FORCEBUNGLE, HURTLING, IS_DOOR, SHOPBASE, ROOMOFFSET,
         TEST_MOVE, ROOM, CORR, xdir, ydir, STRAT_WAITFORU,
         M_SEEN_SLEEP } from './const.js';
import { PMNAMES, MFLAGS } from './monst_data.js';
import { adjalign, near_capacity } from './attrib.js';
import { abon, hitval, weapon_hit_bonus, dmgval, weapon_dam_bonus, P_SKILL,
         setmnotwielded, special_dmgval, use_skill, uwep_skill_type,
         weapon_type, possibly_unwield } from './weapon.js';
import { find_mac } from './worn.js';
import { greatest_erosion, worn, helm_simple_name,
         cloak_simple_name } from './do_wear.js';
import { is_orc, is_elf, unsolid, noncorporeal, nonliving, amorphous,
         thick_skinned, attacktype,
         sticks, haseyes, cantwield, is_flyer, is_floater,
         is_whirly, mon_hates_blessings, resists_blnd, has_head, mindless,
         resists_blnd_by_arti, resists_fire, resists_cold, resists_elec,
         resists_acid, resists_poison, resists_drli, resists_ston,
         defended, completelyburns,
         noattacks, poly_when_stoned, flesh_petrifies, slithy,
         is_swimmer, amphibious, breathless, digests, enfolds, flaming,
         can_blnd } from './mondata.js';
import { mon_hates_silver } from './dog.js';
import { s_suffix } from './hacklib.js';
import { vtense } from './objnam.js';
import { hides_under } from './mondata.js';
import { MONSYMS } from './monst_data.js';
import { u_wipe_engr } from './engrave.js';
import { check_capacity, overexertion, doorless_door, test_move,
         check_special_room, nomul } from './hack.js';
import { is_blade, is_axe, set_ustuck, m_at } from './mon.js';
import { is_weptool, mksobj } from './mkobj.js';
import { OCLASSES, MATERIALS, ONAMES, SKILLS } from './objects_data.js';
import { dist2, sgn, distu } from './hacklib.js';
import { ATTKS } from './monst_data.js';
import { STR18 } from './const.js';
import { ACURR } from './attrib.js';
import { W_ARM, W_ARMS, W_ARMC, W_ARMF, W_ARMU,
         P_BARE_HANDED_COMBAT, P_BASIC,
         HMON_MELEE, HMON_APPLIED, HMON_THROWN, HMON_KICKED,
         W_ARMG, W_ARMH, W_RINGR, W_RINGL, W_AMUL, W_SADDLE,
         P_NONE, P_KNIFE, P_WHIP, P_SKILLED,
         P_LANCE, P_TWO_WEAPON_COMBAT, P_ISRESTRICTED, P_UNSKILLED,
         NEED_WEAPON, XKILL_NOMSG, XKILL_NOCORPSE, STRAT_WAITMASK,
         engulfing_u, NEW_MOON, MSLOW, MFAST, ARTICLE_THE,
         RLOC_NOMSG, DISMOUNT_POLY, SICK_ALL } from './const.js';
import { is_undead } from './mondata.js';
import { A_LAWFUL } from './const.js';
import { FACE, HAND, LEG, POOL } from './const.js';
import { NH_RED } from './const.js';
import { body_part, mbodypart, ugolemeffects } from './polyself.js';
import { M_AP_TYPE, M_AP_NOTHING, M_AP_FURNITURE, M_AP_OBJECT,
         M_AP_MONSTER, MIM_REVEAL, MIM_OMIT_WAIT, ARTICLE_A, ARTICLE_YOUR,
         EXACT_NAME, SUPPRESS_NAME, SUPPRESS_IT, SUPPRESS_INVISIBLE,
         SUPPRESS_HALLUCINATION, SUPPRESS_SADDLE } from './const.js';
import { defsyms } from './drawing_data.js';
import { defends, get_artifact, permapoisoned,
         spec_dbon } from './artifact.js';
import { cansee, vision_recalc } from './vision.js';
import { make_stunned, paralyze_monst } from './potion.js';
import { stop_occupation } from './allmain.js';
import { fall_asleep } from './timeout.js';

function note_unported_uhitm(what) {
    (game.unported ||= new Set()).add(`uhitm:${what}`);
}

// src/uhitm.c:1963 first_weapon_hit() records the first wielded-weapon hit
// after damage has been resolved but before a possible kill is logged. Its
// name deliberately excludes player-supplied object names from the chronicle.
export function first_weapon_hit(weapon) {
    let name = weapon.cursed && weapon.bknown ? 'cursed ' : '';

    if (obj_is_pname(weapon)) {
        name += weapon.oname;
    } else {
        name += simpleonames(weapon);
        if (weapon.oartifact && weapon.dknown) {
            const artifactName = artifact_names[weapon.oartifact]
                || weapon.oname || '';
            if (artifactName)
                name += ` named ${artifactName.replace(/^The /, 'the ')}`;
        }
    }
    livelog_add(
        `hit with a wielded weapon (${name}) for the first time`);
}

// src/uhitm.c:6341 flash_hits_mon(), camera and wand-light flashes wake,
/* include/youprop.h */
const Stoned = () => !!game.u.uprops?.STONED;
const Half_physical_damage = () =>
    !!(game.u.intrinsic?.HHalf_physical_damage || game.u.uprops?.HALF_PHDAM);
/* include/mondata.h:70 hug_throttles() */
const hug_throttles = (ptr) => ptr === game.mons[PMNAMES.PM_ROPE_GOLEM];

// src/uhitm.c do_stone_u()
export async function do_stone_u(mtmp) {
    if (!Stoned() && !Stone_resistance()
        && !(poly_when_stoned(game.youmonst.data)
             && await polymon(PMNAMES.PM_STONE_GOLEM))) {
        let kformat = KILLED_BY_AN;
        let kname = pmname(mtmp.data, Mgender(mtmp));

        if (mtmp.data.geno & G_UNIQ) {
            if (!type_is_pname(mtmp.data))
                kname = the(kname);
            kformat = KILLED_BY;
        }
        await make_stoned(5, null, kformat, kname);
        return 1;
        /* done_in_by(mtmp, STONING); */
    }
    return 0;
}

// src/uhitm.c mhitm_really_poison()
async function mhitm_really_poison(magr, mattk, mdef, mhm) {
    if (game.vis && canspotmon(magr))
        await pline(`${s_suffix(Monnam(magr))} ${mpoisons_subj(magr, mattk)} was poisoned!`);
    if (resists_poison(mdef)) {
        if (game.vis && canspotmon(mdef) && canspotmon(magr))
            await pline_The(`poison doesn't seem to affect ${mon_nam(mdef)}.`);
    } else {
        mhm.damage += rn1(10, 6);
        if (mhm.damage >= mdef.mhp && game.vis && canspotmon(mdef))
            await pline_The('poison was deadly...');
    }
}

// src/uhitm.c:2148 theft_petrifies()
async function theft_petrifies(otmp) {
    if (game.u.uarmg || otmp.otyp !== ONAMES.CORPSE
        || !touch_petrifies(game.mons[otmp.corpsenm]) || Stone_resistance())
        return false;

    /* stealing this corpse is fatal... */
    await instapetrify(corpse_xname(otmp, 'stolen', CXN_ARTICLE));
    /* apparently wasn't fatal after all... */
    return true;
}

// src/uhitm.c:2174 steal_it(); a nymph- or succubus-formed hero steals
async function steal_it(mdef, mattk) {
    let otmp, gold = null, ustealo;
    let unwornmask;

    otmp = (mdef.minvent || [])[0];
    if (!otmp || (otmp.oclass === OCLASSES.COIN_CLASS && mdef.minvent.length === 1))
        return; /* nothing to take */

    /* look for worn body armor */
    ustealo = null;
    if (could_seduce(game.youmonst, mdef, mattk) && mdef.mcanmove) {
        /* find armor, and move it to end of inventory in the process */
        const inv = mdef.minvent;
        for (let i = 0; i < inv.length; ) {
            if (inv[i].owornmask & W_ARM) {
                /* if (ustealo) panic("steal_it: multiple worn suits") */
                ustealo = inv[i];
                inv.splice(i, 1); /* take armor out of minvent */
            } else {
                i++;
            }
        }
        if (ustealo)
            inv.push(ustealo); /* put armor back into minvent */
    }
    gold = findgold(mdef.minvent);

    if (ustealo) { /* we will be taking everything */
        /* 5.0: this uses hero's base gender rather than nymph femininity
           but was using hardcoded pronouns She/her for target monster;
           switch to dynamic pronoun */
        if (gender(mdef) === (game.u.mfemale ? 1 : 0)
            && game.youmonst.data.mlet === MONSYMS.S_NYMPH)
            await You(`charm ${mon_nam(mdef)}.  ${upstart(mhe(mdef))} gladly hands over ${
                !gold ? '' : 'most of '}${mhis(mdef)} possessions.`);
        else
            await You(`seduce ${mon_nam(mdef)} and ${mhe(mdef)} starts to take off ${mhis(mdef)} clothes.`);
    }

    /* prevent gold from being stolen so that steal-item isn't a superset
       of steal-gold; shuffling it out of minvent before selecting next
       item, and then back in case hero or monster dies (hero touching
       stolen c'trice corpse or monster wielding one and having gloves
       stolen) is less bookkeeping than skipping it within the loop or
       taking it out once and then trying to figure out how to put it back */
    if (gold)
        obj_extract_self(gold);

    while ((otmp = (mdef.minvent || [])[0]) != null) {
        if (gold) /* put 'mdef's gold back after remembering mdef->minvent */
            await mpickobj(mdef, gold), gold = null;
        if (!Upolyd(game.u))
            break; /* no longer have ability to steal */
        unwornmask = otmp.owornmask;
        /* this would take place when doname() formats the object for
           the hold_another_object() call, but we want to do it before
           otmp gets removed from mdef's inventory */
        if (otmp.oartifact && !Blind())
            find_artifact(otmp);
        /* take the object away from the monster */
        await extract_from_minvent(mdef, otmp, true, false);
        /* special message for final item; no need to check owornmask because
         * ustealo is only set on objects with (owornmask & W_ARM) */
        if (otmp === ustealo)
            await pline(`${Monnam(mdef)} finishes taking off ${mhis(mdef)} suit.`);
        /* give the object to the character */
        otmp = await hold_another_object(otmp, 'You snatched but dropped %s.',
                                         doname(otmp), 'You steal: ');
        /* might have dropped otmp, and it might have broken or left level */
        if (!otmp || otmp.where !== OBJ_INVENT)
            continue;
        if (await theft_petrifies(otmp))
            break; /* stop thieving even though hero survived */
        /* more take-away handling, after theft message */
        if (unwornmask & W_WEP) { /* stole wielded weapon */
            await possibly_unwield(mdef, false);
        } else if (unwornmask & W_ARMG) { /* stole worn gloves */
            await mselftouch(mdef, null, true);
            if (DEADMONSTER(mdef)) /* it's now a statue */
                break; /* can't continue stealing */
        }

        if (!ustealo)
            break; /* only taking one item */

        /* take gold out of minvent before making next selection; if it
           is the only thing left, the loop will terminate and it will be
           put back below */
        if ((gold = findgold(mdef.minvent)) != null)
            obj_extract_self(gold);
    }

    /* put gold back; won't happen if either hero or 'mdef' dies because
       gold will be back in monster's inventory at either of those times
       (so will be present in mdef's minvent for bones, or in its statue
       now if it has just been turned into one) */
    if (gold)
        await mpickobj(mdef, gold);
}

// src/uhitm.c:6425 light_hits_gremlin()
export async function light_hits_gremlin(mon, dmg) {
    if (!Deaf() && mdistu(mon) <= 90) {
        /* cry of pain can be heard somewhat farther than the waking radius */
        await pline(`${Monnam(mon)} ${
                  (dmg > Math.trunc(mon.mhp / 2)) ? 'wails in agony'
                                                  : 'cries out in pain'}!`);
    } else if (canseemon(mon)) {
        await pline(`${Monnam(mon)} recoils from the light!`);
    }
    mon.mhp -= dmg;
    wake_nearto(mon.mx, mon.my, 30);
    if (DEADMONSTER(mon)) {
        if (game.context?.mon_moving)
            await monkilled(mon, null, ATTKS.AD_BLND);
        else
            await killed(mon);
    } else if (cansee(mon.mx, mon.my) && !canspotmon(mon)) {
        map_invisible(mon.mx, mon.my);
    }
}

// blind, anger, and sometimes frighten the first visible monster in the ray.
export async function flash_hits_mon(mtmp, otmp) {
    if (game.notonhead)
        return 0;

    const mx = mtmp.mx, my = mtmp.my;
    const ptr = game.mons[mtmp.mnum];
    const useeit = canseemon(mtmp);
    let res = 0;

    if (M_AP_TYPE(mtmp) !== M_AP_NOTHING) {
        const oldglyph = JSON.stringify(glyph_at(mx, my));

        /* 'altmon' probably doesn't matter here because 'whatbuf' will
           only be shown if the glyph changes and wakeup() doesn't call
           seemimic() for M_AP_MONSTER */
        const whatbuf = mhidden_description(mtmp, MHID_ALTMON);

        await wakeup(mtmp, false); /* -> seemimic() -> newsym(); also calls
                                    * finish_meating() to end quickmimic */

        /* if glyph has changed then hero saw something happen */
        if (JSON.stringify(glyph_at(mx, my)) !== oldglyph) {
            await pline(`That ${whatbuf} is really ${
                  /* y_monnam()+a_monnam() */
                  x_monnam(mtmp, mtmp.mtame ? ARTICLE_YOUR : ARTICLE_A,
                           null, 0, false)}${mtmp.mtame ? '.' : '!'}`);
            res = 1;
        }
    }

    if (mtmp.msleeping && haseyes(ptr)) {
        mtmp.msleeping = 0;
        if (useeit) {
            await pline(`The flash awakens ${mon_nam(mtmp)}.`);
            res = 1;
        }
    } else if (ptr.mlet !== MONSYMS.S_LIGHT) {
        if (!resists_blnd(mtmp)) {
            const distance = dist2(otmp.ox, otmp.oy, mx, my);
            if (useeit) {
                await pline(`${Monnam(mtmp)} is blinded by the flash!`);
                res = 1;
            }

            if (mtmp.mnum === PMNAMES.PM_GREMLIN) {
                const amount = otmp.otyp === ONAMES.WAN_LIGHT
                    ? d(1 + otmp.spe, 4)
                    : rnd(Math.min(mtmp.mhp, 4));
                if (!Deaf() && dist2(game.u.ux, game.u.uy, mx, my) <= 90) {
                    await pline(`${Monnam(mtmp)} ${
                        amount > mtmp.mhp / 2 ? 'wails in agony'
                                             : 'cries out in pain'}!`);
                } else if (canseemon(mtmp)) {
                    await pline(`${Monnam(mtmp)} recoils from the light!`);
                }
                mtmp.mhp -= amount;
                wake_nearto(mx, my, 30);
                if (DEADMONSTER(mtmp))
                    await killed(mtmp);
                else if (cansee(mx, my) && !canspotmon(mtmp))
                    map_invisible(mx, my);
            }

            if (!DEADMONSTER(mtmp)) {
                if (!game.context?.mon_moving)
                    await setmangry(mtmp, true);
                if (distance < 9 && !mtmp.isshk && rn2(4)) {
                    await monflee(mtmp, rn2(4) ? rnd(100) : 0,
                                  false, true);
                }
                mtmp.mcansee = 0;
                mtmp.mblinded = distance < 3
                    ? 0 : rnd(1 + Math.trunc(50 / distance));
            }
        } else if (useeit) {
            if (resists_blnd_by_arti(mtmp))
                await shieldeff_mon(mtmp);
            if (game.flags.verbose) {
                const lit = !!game.level?.at(mx, my)?.lit;
                await pline(lit
                    ? `The flash of light shines on ${mon_nam(mtmp)}.`
                    : `${Monnam(mtmp)} is illuminated.`);
            }
        }
    }

    return res ? 1 : 0;
}

// include/mondata.h:29 passes_walls()
const passes_walls = (ptr) => (ptr.mflags1 & MFLAGS.M1_WALLWALK) !== 0;

// include/mondata.h:150 is_longworm() — an identity test against three
// specific permonst entries, NOT a flag test.
const is_longworm = (ptr) =>
    ptr.pmidx === PMNAMES.PM_BABY_LONG_WORM
    || ptr.pmidx === PMNAMES.PM_LONG_WORM
    || ptr.pmidx === PMNAMES.PM_LONG_WORM_TAIL;

// src/mon.c helpless()
/* helpless() lives in js/monst.js, matching include/monst.h:251. */

// src/uhitm.c:462 do_attack() — returns TRUE if the hero's move is used up.
//
// Returning FALSE is what lets the caller swap places with the monster, so the
// three arms below are "you stop", "it doesn't budge", and "go ahead and swap".
export async function do_attack(mtmp) {
    if (is_safemon(mtmp) && !game.context?.forcefight) {
        /* u_wield_art(ART_STORMBRINGER) — no artifact is wielded this early */
        const mdat = game.mons[mtmp.mnum];

        /* src/uhitm.c:474 — the rn2(7) fires on EVERY step onto a peaceful,
           before any of the cheaper terms, because || evaluates left to right
           and Punished is false for an unpunished hero.

           include/youprop.h:77 defines Punished as (uball != 0): it is the
           heavy iron ball, NOT a uprops intrinsic. This first read it as
           game.u.uprops.PUNISHED, which is permanently undefined -- falsy, so
           the rn2(7) did still draw and the common path was right by accident,
           but the term could never become true once punishment is ported.
           The ball subsystem does not exist yet, so u.uball is absent and this
           is false for the same reason C is false. */
        const foo = !!(game.u.uball || !rn2(7)
                       || (is_longworm(mdat) && mtmp.wormno)
                       || (IS_OBSTRUCTED(game.level.at(game.u.ux, game.u.uy)?.typ)
                           && !passes_walls(mdat)));

        /* The in-shop check only runs when foo is false. Peaceful monsters
           cannot be displaced inside a tended shop, and bumping the resident
           shopkeeper starts payment when this is an ordinary move. */
        let inshop = false;
        if (!foo) {
            const [{ in_rooms }, { tended_shop }] = await Promise.all([
                import('./hack.js'), import('./shk.js'),
            ]);
            for (const roomno of in_rooms(mtmp.mx, mtmp.my, SHOPBASE) || '') {
                const room = game.level?.rooms?.[roomno.charCodeAt(0) - ROOMOFFSET];
                if (room && tended_shop(room)) {
                    inshop = true;
                    break;
                }
            }
        }

        if (inshop || foo) {
            if (!game.context?.travel && !game.context?.run
                && canspotmon(mtmp) && mtmp.isshk) {
                const { dopay } = await import('./shk.js');
                await dopay();
                return true;
            }
            if (mtmp.mtame)     /* see 'additional considerations' in the C */
                monflee(mtmp, rnd(6), false, false);
            /* You("stop.  %s is in the way!", highc(y_monnam(mtmp))) */
            {
                const buf = upstart(y_monnam(mtmp));
                await You(`stop.  ${buf} is in the way!`);
            }
            end_running(true);
            return true;
        } else if (mtmp.mfrozen || helpless(mtmp)
                   || (mdat.mmove === 0 && rn2(6))) {
            await pline(`${Monnam(mtmp)} doesn't seem to move!`);
            end_running(true);
            return true;
        } else {
            return false;       /* caller swaps places with it */
        }
    }

    /* possibly set in attack_checks; examined in known_hitum */
    game.override_confirmation = false;
    /* attack_checks() reads gb.bhitpos, which might map an invisible
       monster there */
    game.bhitpos = { x: game.u.ux + game.u.dx, y: game.u.uy + game.u.dy };
    game.notonhead = (game.bhitpos.x !== mtmp.mx || game.bhitpos.y !== mtmp.my);
    if (await attack_checks(mtmp, game.u.uwep))
        return true;

    if (Upolyd(game.u) && noattacks(game.youmonst.data)) {
        await You('have no way to attack monsters physically.');
        mtmp.mstrategy &= ~STRAT_WAITMASK;
        return true;
    }

    /* src/uhitm.c:530 — check_capacity() prints and returns 1 when the hero
       is overloaded; overexertion() calls gethungry(), which DRAWS, so an
       attack costs a hunger tick the plain step does not. */
    if (await check_capacity('You cannot fight while so heavily loaded.')
        || await overexertion())
        return true;                            /* goto atk_done */

    if (game.u.twoweap && !(await can_twoweapon()))
        untwoweapon();

    if (game.unweapon) {
        game.unweapon = false;
        if (game.flags?.verbose) {
            if (game.u.uwep) {
                await You(`begin bashing monsters with ${yname(game.u.uwep)}.`);
            } else if (!cantwield(game.youmonst.data)) {
                const action = Role_if(PMNAMES.PM_MONK)
                    ? 'striking' : 'bashing';
                await You(`begin ${action} monsters with your ${
                    game.u.uarmg ? 'gloved' : 'bare'} ${
                    makeplural(body_part(HAND))}.`);
            }
        }
    }
    exercise(A_STR, true);  /* you're exercising muscles */
    /* andrew@orca: prevent unlimited pick-axe attacks */
    u_wipe_engr(3);

    /* Is the "it died" check actually correct? */
    if (mdat_of(mtmp).mlet === MONSYMS.S_LEPRECHAUN && !mtmp.mfrozen
        && !helpless(mtmp) && !mtmp.mconf && mtmp.mcansee && !rn2(7)
        && ((await m_move(mtmp, 0)) === MMOVE_DIED /* it died */
            || mtmp.mx !== game.u.ux + game.u.dx
            || mtmp.my !== game.u.uy + game.u.dy)) { /* it moved */
        await You('miss wildly and stumble forwards.');
        return false;
    }

    if (Upolyd(game.u))
        await hmonas(mtmp);
    else
        await hitum(mtmp, mattk_row(game.youmonst.data.mattk[0]));

    if (game.context?.forcefight && !DEADMONSTER(mtmp) && !canspotmon(mtmp)
        && !glyph_is_invisible_at(game.u.ux + game.u.dx,
                                  game.u.uy + game.u.dy)
        && !engulfing_u(mtmp))
        map_invisible(game.u.ux + game.u.dx, game.u.uy + game.u.dy);
    return true;
}

const mdat_of = (mtmp) => game.mons[mtmp.mnum];

// src/uhitm.c disguised_as_mon(); a mimic posing as a monster
export function disguised_as_mon(mtmp) {
    return (M_AP_TYPE(mtmp)
            && M_AP_TYPE(mtmp) === M_AP_MONSTER);
}

// src/uhitm.c:6201 that_is_a_mimic() and :6282 stumble_onto_mimic().
// Naming an object-shaped mimic manufactures the temporary object which the
// map glyph claims is present. Even with init=false, mksobj() allocates an
// object id, so this visible message spends one rnd(2) before revealing it.
export async function that_is_a_mimic(mtmp, mimic_flags) {
    let fmt = "Wait!  That's %s!";
    let what = null;
    const reveal_it = (mimic_flags & MIM_REVEAL) !== 0;
    const omit_wait = (mimic_flags & MIM_OMIT_WAIT) !== 0;

    if (game.u.ublind) {
        /* Blind telepathy can identify a monster-shaped disguise. That branch
           needs the full telepathy property model; the generic wording is the
           exact non-telepathic result. */
        what = 'a monster';
    } else {
        const glyph = glyph_at(mtmp.mx, mtmp.my);

        if (glyph?.kind === 'cmap') {
            if (M_AP_TYPE(mtmp) === M_AP_FURNITURE) {
                const explanation = defsyms[glyph.cmap]?.explain || 'object';
                fmt = `That ${explanation} actually is %s!`;
            }
        } else if (glyph?.kind === 'obj') {
            const fake = mksobj(glyph.otyp, false, false);
            if (fake.oclass === OCLASSES.COIN_CLASS)
                fake.quan = 2;
            else if (fake.otyp === ONAMES.SLIME_MOLD)
                fake.spe = game.context?.current_fruit || 0;
            const fake_name = simpleonames(fake);
            fmt = `${is_plural(fake) ? 'Those' : 'That'} ${fake_name} `
                + `${otense(fake, 'are')} %s!`;
        } else if (glyph?.kind === 'mon') {
            const shown = game.mons[mtmp.mappearance];
            if (shown)
                fmt = `Wait!  That ${pmname(shown, 0)} is really %s!`;
        }

        if (M_AP_TYPE(mtmp) === M_AP_MONSTER) {
            what = x_monnam(mtmp, ARTICLE_A, null, 0, true);
        } else if ((M_AP_TYPE(mtmp) === M_AP_OBJECT
                    || M_AP_TYPE(mtmp) === M_AP_FURNITURE)
                   && (mtmp.msleeping || mtmp.mfrozen)) {
            what = x_monnam(mtmp, ARTICLE_A, 'sleeping', 0, false);
        } else {
            what = a_monnam(mtmp);
        }
    }

    if (what) {
        const shown_fmt = omit_wait && fmt.startsWith('Wait!  ')
                        ? fmt.slice(7) : fmt;
        await pline(shown_fmt.replace('%s', what));
    }
    if (reveal_it)
        seemimic(mtmp);
}

export async function stumble_onto_mimic(mtmp) {
    await that_is_a_mimic(mtmp, MIM_REVEAL);

    if (!game.u.ustuck && !mtmp.mflee
        && dmgtype(mdat_of(mtmp), ATTKS.AD_STCK)
        && distu(mtmp.mx, mtmp.my) <= 2)
        set_ustuck(mtmp);

    await wakeup(mtmp, false); /* clears mimicking */
    /* if hero is blind, wakeup() won't display the monster even though
       it's no longer concealed */
    if (!canspotmon(mtmp)
        && !glyph_is_invisible_at(mtmp.mx, mtmp.my))
        map_invisible(mtmp.mx, mtmp.my);
}

// src/uhitm.c:432 force_attack(); attack even a peaceful (or, if pets_too,
// tame) monster the way 'F' would
export async function force_attack(mtmp, pets_too) {
    let attacked, save_Forcefight;

    save_Forcefight = game.context?.forcefight;
    /* always set forcefight On for hostiles and peacefuls, maybe for pets */
    if (pets_too || !mtmp.mtame)
        (game.context ||= {}).forcefight = true;
    attacked = await do_attack(mtmp);
    game.context.forcefight = save_Forcefight;
    return attacked;
}

// src/uhitm.c:189 attack_checks() — everything that can stop an attack before
// it starts. Returns TRUE when the hero's move is used up without a blow.
//
// It draws NOTHING: every arm is a message or a state change. The forcefight
// arm returns early, which is why a forced attack on an empty square never
// asks anything.
export async function attack_checks(mtmp, wep) {
    /* if you're close enough to attack, alert any waiting monster */
    mtmp.mstrategy &= ~STRAT_WAITMASK;

    if (engulfing_u(mtmp))
        return false;

    if (game.context?.forcefight)
        return false;

    /* cache the shown glyph; the cases that CHANGE it all return without
       looking at it again */
    const glyph = glyph_at(game.bhitpos.x, game.bhitpos.y);
    const glyph_is_warning = (g) => g?.kind === 'warn';
    const glyph_is_invisible = (g) => g?.kind === 'invis';

    if (!canspotmon(mtmp)
        && !glyph_is_warning(glyph) && !glyph_is_invisible(glyph)
        && !(!game.u.ublind && mtmp.mundetected
             && hides_under(mdat_of(mtmp)))) {
        await pline("Wait!  There's something there you can't see!");
        map_invisible(game.bhitpos.x, game.bhitpos.y);
        if (mtmp.m_ap_type
            && !game.u.uprops?.PROT_FROM_SHAPE_CHANGERS
            && !game.u.ustuck && !mtmp.mflee
            && dmgtype(mdat_of(mtmp), ATTKS.AD_STCK)
            && distu(mtmp.mx, mtmp.my) <= 2)
            set_ustuck(mtmp);
        /* always necessary; also un-mimics mimics */
        await wakeup(mtmp, true);
        return true;
    }

    if (mtmp.m_ap_type && !sensemon(mtmp) && !glyph_is_warning(glyph)) {
        if (glyph_is_invisible(glyph)) {
            seemimic(mtmp);
            return false;
        }
        await stumble_onto_mimic(mtmp);
        return true;
    }

    if (mtmp.mundetected && !canseemon(mtmp) && !glyph_is_warning(glyph)
        && (hides_under(mdat_of(mtmp))
            || mdat_of(mtmp).mlet === MONSYMS.S_EEL)) {
        mtmp.mundetected = mtmp.msleeping = 0;
        newsym(mtmp.mx, mtmp.my);
        if (glyph_is_invisible(glyph)) {
            seemimic(mtmp);
            return false;
        }
        if (!sensemon(mtmp)) {
            await pline("Wait!  There's something there you can't see!");
            map_invisible(game.bhitpos.x, game.bhitpos.y);
            return true;
        }
    }

    /* wake a monster from the above cases if the hero can sense it */
    if ((mtmp.mundetected || mtmp.m_ap_type) && sensemon(mtmp)) {
        mtmp.mundetected = 0;
        await wakeup(mtmp, true);
    }

    if (game.flags?.confirm !== false && mtmp.mpeaceful
        && !game.u.uprops?.CONFUSION && !game.u.uprops?.HALLUC
        && !game.u.uprops?.STUNNED) {
        /* is_art(wep, ART_STORMBRINGER) — no artifact is wielded this early */
        if (canspotmon(mtmp)) {
            const { tty_yn_function } = await import('./tty/topl.js');
            const answer = await tty_yn_function(
                `Really attack ${mon_nam(mtmp)}?`, 'yn', 'n');
            if (answer !== 'y') {
                game.context.move = 0;
                return true;
            }
        }
    }

    return false;
}

// src/uhitm.c:331 check_caitiff() — a Knight's chivalry and a Samurai's giri.
//
// Draws nothing, but it calls adjalign(-1), which moves the hero's alignment
// record AND raises ualign.abuse. find_roll_to_hit calls it once per attack
// sequence, guarded by `if (!(*attk_count)++)`, so it must not fire on the
// second and later attacks of a multi-attack turn.
//
// The two You() messages are displayed before the alignment change, matching
// the C call order and preserving message-window boundaries.
export async function check_caitiff(mtmp) {
    if (game.u.ualign.record <= -10)
        return;

    const d = game.mons[mtmp.mnum];

    if (Role_if(PMNAMES.PM_KNIGHT) && game.u.ualign.type === A_LAWFUL
        && !is_undead(d)
        && (helpless(mtmp) || (mtmp.mflee && !mtmp.mavenge))) {
        await You('caitiff!');
        adjalign(-1);
    } else if (Role_if(PMNAMES.PM_SAMURAI) && mtmp.mpeaceful) {
        /* attacking peaceful creatures is bad for the samurai's giri */
        await You('dishonorably attack the innocent!');
        adjalign(-1);
    }
}

// src/role.c Role_if()
//
// The role's monster number lives in urole.mnum; this used to read malenum
// and pmidx, neither of which js/role_data.js defines, so EVERY Role_if in
// this file was false. That silently disabled check_caitiff's Knight and
// Samurai arms, find_roll_to_hit's Monk bonus, and martial_bonus() -- which
// is why a Monk's bare hand rolled rnd(2) where C rolls rnd(4).
const Role_if = (pm) => {
    const m = game.urole?.mnum;
    return m === pm || m === PMNAMES[pm];
};

// src/uhitm.c find_roll_to_hit() — the number the d20 must beat.
//
// Draws nothing itself; hitum rolls rnd(20) against the value it returns.
// attk_count and role_roll_penalty are C out-parameters, passed here as a
// single mutable object so the caller sees both.
//
// The check_caitiff() call is guarded by `if (!(*attk_count)++)`, so it fires
// on the FIRST attack of a sequence only -- a multi-attack turn must not
// penalise the hero's alignment repeatedly.
export async function find_roll_to_hit(mtmp, aatyp, weapon, out) {
    const ptr = game.mons[mtmp.mnum];
    out.role_roll_penalty = 0;              /* default is `none' */

    /* include/you.h:464 Luck is uluck + moreluck */
    const Luck = (game.u.uluck || 0) + (game.u.moreluck || 0);

    let tmp = 1 + abon() + find_mac(mtmp) + (game.u.uhitinc || 0)
              + (sgn(Luck) * Math.trunc((Math.abs(Luck) + 2) / 3))
              + (Upolyd(game.u) ? game.youmonst.data.mlevel
                                 : game.u.ulevel);

    /* some actions should occur only once during multiple attacks */
    if (!(out.attk_count++))
        await check_caitiff(mtmp);

    /* adjust vs. monster state */
    if (mtmp.mstun)      tmp += 2;
    if (mtmp.mflee)      tmp += 2;
    if (mtmp.msleeping)  tmp += 2;
    if (!mtmp.mcanmove)  tmp += 4;

    /* role/race adjustments */
    if (Role_if(PMNAMES.PM_MONK) && !Upolyd(game.u)) {
        if (worn(W_ARM))
            tmp -= (out.role_roll_penalty = game.urole.spelarmr);
        else if (!game.u.uwep && !worn(W_ARMS))
            tmp += Math.trunc(game.u.ulevel / 3) + 2;
    }
    if (is_orc(ptr)
        && (Upolyd(game.u) ? is_elf(game.youmonst.data)
                            : Race_if(PMNAMES.PM_ELF)))
        tmp++;

    /* encumbrance: with a lot of luggage, your agility diminishes */
    const tmp2 = near_capacity();
    if (tmp2 !== 0)
        tmp -= (tmp2 * 2) - 1;
    if (game.u.utrap)
        tmp -= 3;

    /* hitval applies when wielding a weapon; weapon_hit_bonus applies to any
       weapon attack, bare-handed included, and to a martial artist's kick */
    if (aatyp === ATTKS.AT_WEAP || aatyp === ATTKS.AT_CLAW) {
        if (weapon)
            tmp += hitval(weapon, mtmp);
        tmp += weapon_hit_bonus(weapon);
    } else if (aatyp === ATTKS.AT_KICK && martial_bonus()) {
        tmp += weapon_hit_bonus(null);
    }

    return tmp;
}

// src/role.c Race_if()
const Race_if = (pm) => game.urace?.malenum === pm || game.urace?.pmidx === pm;

/* include/skills.h:81 martial_bonus() — mirrored from js/weapon.js, which
   cannot be imported here without closing a cycle. */
const martial_bonus = () =>
    Role_if(PMNAMES.PM_SAMURAI) || Role_if(PMNAMES.PM_MONK);

// src/uhitm.c mon_maybe_unparalyze() — a paralysed monster may snap out of it.
//
// DRAWS, and the draw is unconditional on the monster being unable to move:
// hitum calls this between find_roll_to_hit and its own rnd(20), so a frozen
// target costs an rn2(10) that a mobile one does not.
export function mon_maybe_unparalyze(mtmp) {
    if (!mtmp.mcanmove) {
        if (!rn2(10)) {
            mtmp.mcanmove = 1;
            mtmp.mfrozen = 0;
        }
    }
}

// src/uhitm.c double_punch() — chance of a second bare-handed hit.
//
// DRAWS rn2(5), but ONLY when bare-handed above Basic skill. C's own table:
// unskilled and basic 0%, skilled 20%, expert 40%, master 60%, grandmaster
// 80%. Note the guard is `!uwep && !uarms` -- a shield suppresses it as
// surely as a weapon does.
export function double_punch() {
    /* P_BARE_HANDED_COMBAT and P_MARTIAL_ARTS are the same skill */
    const skl_lvl = game.u.weapon_skills[P_BARE_HANDED_COMBAT].skill;

    if (!game.u.uwep && !worn(W_ARMS) && skl_lvl > P_BASIC)
        return (skl_lvl - P_BASIC) > rn2(5);
    return false;
}

// src/uhitm.c:4891 explum()
export async function explum(mdef, mattk) {
    const tmp = d(mattk[2], mattk[3]);
    switch (mattk[1]) {
    case ATTKS.AD_BLND:
        if (mdef && !resists_blnd(mdef)) {
            await pline(`${Monnam(mdef)} is blinded by your flash of light!`);
            mdef.mblinded = Math.min(mdef.mblinded + tmp, 127);
            mdef.mcansee = 0;
        }
        break;
    case ATTKS.AD_HALU:
        if (mdef && haseyes(mdef.data) && mdef.mcansee) {
            await pline(`${Monnam(mdef)} is affected by your flash of light!`);
            mdef.mconf = 1;
        }
        break;
    case ATTKS.AD_COLD:
    case ATTKS.AD_FIRE:
    case ATTKS.AD_ELEC:
        await explode(game.u.ux, game.u.uy, mattk[1] - 1 + 20, tmp,
            MON_EXPLODE, adtyp_to_expltype(mattk[1]));
        if (mdef && DEADMONSTER(mdef))
            return M_ATTK_DEF_DIED;
        break;
    }
    await wake_nearto(game.u.ux, game.u.uy, 7 * 7);
    return M_ATTK_HIT;
}

// src/uhitm.c:4931 start_engulf()
async function start_engulf(mdef) {
    const u_digest = digests(game.youmonst.data);
    const u_enfold = enfolds(game.youmonst.data);
    if (!Invisible()) {
        map_location(game.u.ux, game.u.uy, true);
        await tmp_at(DISP_ALWAYS, mon_to_glyph(game.youmonst, rn2_on_display_rng));
        await tmp_at(mdef.mx, mdef.my);
    }
    await You(`${u_digest ? 'swallow' : u_enfold ? 'enclose' : 'engulf'} ${
        mon_nam(mdef)}${u_digest ? ' whole' : ''}!`);
    if (game.animationFrame) {
        await game.animationFrame();
        await game.animationFrame();
    }
}

// src/uhitm.c:4949 end_engulf()
async function end_engulf() {
    if (!Invisible()) {
        await tmp_at(DISP_END, 0);
        newsym(game.u.ux, game.u.uy);
    }
}

// src/uhitm.c:4958 gulpum()
export async function gulpum(mdef, mattk) {
    let msgbuf, tmp, otmp;
    let dam = d(mattk[2], mattk[3]);
    const u_digest = digests(game.youmonst.data);
    const u_enfold = enfolds(game.youmonst.data);
    const pd = mdef.data;
    const expel_verb = u_digest ? 'regurgitate' : u_enfold ? 'release' : 'expel';

    if (!engulf_target(game.youmonst, mdef))
        return M_ATTK_MISS;
    if (!(u_digest && game.u.uhunger >= 1500) && !game.u.uswallow) {
        if (!flaming(game.youmonst.data)) {
            for (otmp of mdef.minvent || [])
                await snuff_lit(otmp);
        }
        if (is_vampshifter(mdef)
            && await newcham(mdef, game.mons[mdef.cham], NO_NC_FLAGS)) {
            await You(`${u_digest ? 'swallow' : u_enfold ? 'enclose' : 'engulf'} it, then ${expel_verb} it.`);
            if (canspotmon(mdef)) {
                await pline(`It turns into ${x_monnam(mdef, ARTICLE_A, null,
                    SUPPRESS_NAME | SUPPRESS_IT | SUPPRESS_INVISIBLE, false)}.`);
            } else {
                map_invisible(mdef.mx, mdef.my);
            }
            return M_ATTK_HIT;
        }
        const fatal_gulp = (touch_petrifies(pd) && !Stone_resistance())
            || (mattk[1] === ATTKS.AD_DGST
                && (is_rider(pd) || (monsndx(pd) === PMNAMES.PM_MEDUSA
                                     && !Stone_resistance())));
        if (mattk[1] === ATTKS.AD_DGST && (!Slow_digestion() || fatal_gulp))
            await eating_conducts(pd);
        if (fatal_gulp && !is_rider(pd)) {
            let mnam = pmname(pd, Mgender(mdef));
            if (!type_is_pname(pd))
                mnam = an(mnam);
            await You(`${u_digest ? 'englut' : 'engulf'} ${mon_nam(mdef)}.`);
            await instapetrify(`${u_digest ? 'swallowing' : u_enfold ? 'enclosing'
                : 'engulfing'} ${mnam}${u_digest ? ' whole' : ''}`);
        } else {
            await start_engulf(mdef);
            switch (mattk[1]) {
            case ATTKS.AD_DGST:
                if (is_rider(pd)) {
                    await pline('Unfortunately, digesting any of it is fatal.');
                    await end_engulf();
                    (game.killer ||= {}).name = `unwisely tried to eat ${pmname(pd, Mgender(mdef))}`;
                    game.killer.format = NO_KILLER_PREFIX;
                    await done(DIED);
                    return M_ATTK_MISS;
                }
                if (Slow_digestion()) {
                    dam = 0;
                    break;
                }
                if ((otmp = mlifesaver(mdef)))
                    await m_useup(mdef, otmp);
                await newuhs(false);
                game.mswallower = game.youmonst;
                await xkilled(mdef, XKILL_GIVEMSG | XKILL_NOCORPSE);
                if (!DEADMONSTER(mdef)) {
                    await You(`hurriedly regurgitate the sizzling in your ${body_part(STOMACH)}.`);
                } else {
                    tmp = 1 + (pd.cwt >> 8);
                    if (await corpse_chance(mdef, game.youmonst, true)
                        && !(game.mvitals[monsndx(pd)].mvflags & MFLAGS.G_NOCORPSE)) {
                        game.u.uhunger += Math.trunc((pd.cnutrit + 1) / 2);
                    } else {
                        tmp = 0;
                    }
                    msgbuf = `You totally digest ${mon_nam(mdef)}.`;
                    if (tmp !== 0) {
                        await You(`digest ${mon_nam(mdef)}.`);
                        if (Slow_digestion())
                            tmp *= 2;
                        nomul(-tmp);
                        game.multi_reason = 'digesting something';
                        game.nomovemsg = msgbuf;
                        game.corpsenm_digested = monsndx(pd);
                        game.afternmv = Finish_digestion;
                    } else {
                        await pline(msgbuf);
                    }
                    if (monsndx(pd) === PMNAMES.PM_GREEN_SLIME) {
                        msgbuf = `${The(pmname(pd, Mgender(mdef)))} isn't sitting well with you.`;
                        /* C's nomovemsg points into this same static buffer. */
                        if (tmp !== 0)
                            game.nomovemsg = msgbuf;
                        if (!Unchanging())
                            await make_slimed(5, null);
                    } else {
                        await exercise(A_CON, true);
                    }
                }
                game.mswallower = null;
                await end_engulf();
                return M_ATTK_DEF_DIED;
            case ATTKS.AD_PHYS:
                if (game.youmonst.mnum === PMNAMES.PM_FOG_CLOUD) {
                    await pline(`${Monnam(mdef)} is laden with your moisture.`);
                    if ((breathless(pd) || amphibious(pd)) && !flaming(pd)) {
                        dam = 0;
                        await pline(`${Monnam(mdef)} seems unharmed.`);
                    }
                } else {
                    await pline(`${Monnam(mdef)} is ${enfolds(game.youmonst.data)
                        ? 'being squashed' : 'pummeled with your debris'}!`);
                }
                break;
            case ATTKS.AD_ACID:
                await pline(`${Monnam(mdef)} is covered with your goo!`);
                if (resists_acid(mdef)) {
                    await pline(`It seems harmless to ${mon_nam(mdef)}.`);
                    dam = 0;
                }
                break;
            case ATTKS.AD_BLND:
                if (can_blnd(game.youmonst, mdef, mattk[0], null)) {
                    if (mdef.mcansee)
                        await pline(`${Monnam(mdef)} can't see in there!`);
                    mdef.mcansee = 0;
                    dam += mdef.mblinded;
                    if (dam > 127)
                        dam = 127;
                    mdef.mblinded = dam;
                }
                dam = 0;
                break;
            case ATTKS.AD_ELEC:
                if (rn2(2)) {
                    await pline_The(`air around ${mon_nam(mdef)} crackles with electricity.`);
                    if (resists_elec(mdef)) {
                        await pline(`${Monnam(mdef)} seems unhurt.`);
                        dam = 0;
                    }
                    await golemeffects(mdef, mattk[1], dam);
                } else {
                    dam = 0;
                }
                break;
            case ATTKS.AD_COLD:
                if (rn2(2)) {
                    if (resists_cold(mdef)) {
                        await pline(`${Monnam(mdef)} seems mildly chilly.`);
                        dam = 0;
                    } else {
                        await pline(`${Monnam(mdef)} is freezing to death!`);
                    }
                    await golemeffects(mdef, mattk[1], dam);
                } else {
                    dam = 0;
                }
                break;
            case ATTKS.AD_FIRE:
                if (rn2(2)) {
                    if (resists_fire(mdef)) {
                        await pline(`${Monnam(mdef)} seems mildly hot.`);
                        dam = 0;
                    } else {
                        await pline(`${Monnam(mdef)} is burning to a crisp!`);
                    }
                    await golemeffects(mdef, mattk[1], dam);
                } else {
                    dam = 0;
                }
                break;
            case ATTKS.AD_DREN:
                if (!rn2(4))
                    await xdrainenergym(mdef, true);
                dam = 0;
                break;
            }
            await end_engulf();
            mdef.mhp -= dam;
            if (DEADMONSTER(mdef)) {
                await killed(mdef);
                if (DEADMONSTER(mdef))
                    return M_ATTK_DEF_DIED;
            }
            await You(`${expel_verb} ${mon_nam(mdef)}!`);
            if ((Slow_digestion() || is_animal(game.youmonst.data)) && u_digest)
                await pline(`Obviously, you didn't like ${s_suffix(mon_nam(mdef))} taste.`);
        }
    }
    return M_ATTK_MISS;
}

// src/uhitm.c:5199 missum()
export async function missum(mdef, mattk, wouldhavehit) {
    if (wouldhavehit)   /* a monk missing due to the body-armour penalty */
        await Your('armor is rather cumbersome...');

    /* could_seduce() needs the succubus/incubus arms; nothing ported can be
       one, so the middle branch is recorded rather than guessed */
    if (canspotmon(mdef) && game.flags?.verbose !== false)
        await You(`miss ${mon_nam(mdef)}.`);
    else
        await You('miss it.');

    if (!helpless(mdef))
        await wakeup(mdef, true);
}

// src/uhitm.c known_hitum() — resolve a hit or miss that the hero knows about.
//
// THE FIRST FUNCTION IN THIS CHAIN THAT DRAWS, and the draws are nested:
// rn2(25) gates the flee check, and only if that passes does rn2(3) decide
// whether monflee gets rnd(100) or 0. So a healthy monster costs one draw, a
// wounded one that passes the gate costs two or three.
//
// mhit is C's in/out parameter: a Vorpal Blade hit against a headless target
// is converted back to a miss. It is passed as a one-element array so the
// caller sees the change, and the conduct counter is rolled back with it --
// a miss must not count as having hit with a weapon.
//
// hmon (the damage) and cutworm (long worms) are recorded, not approximated.
// Without hmon the monster takes no damage, so mhp stays equal to oldhp and
// the Vorpal-miss branch fires every time; that is noted at the branch so the
// behaviour is not mistaken for a bug later.
export async function known_hitum(mon, weapon, mhit, rollneeded, armorpenalty,
                            uattk, dieroll) {
    let malive = true;
    /* hmon() might destroy the weapon; remember the aspect for cutworm */
    const slice_or_chop = !!(weapon && (is_blade(weapon) || is_axe(weapon)));

    if (game.override_confirmation) {
        /* this may need to be generalized if weapons other than
           Stormbringer acquire similar anti-social behavior... */
        if (game.flags?.verbose !== false)
            await Your('bloodthirsty blade attacks!');
    }

    if (!mhit[0]) {
        await missum(mon, uattk, (rollneeded + armorpenalty > dieroll));
    } else {
        const oldhp = mon.mhp;
        const oldweaphit = game.u.uconduct?.weaphit ?? 0;

        /* KMH, conduct */
        if (weapon && (weapon.oclass === OCLASSES.WEAPON_CLASS
                       || is_weptool(weapon, game.objects))) {
            game.u.uconduct = game.u.uconduct || {};
            game.u.uconduct.weaphit = oldweaphit + 1;
        }

        /* src/uhitm.c:1039 — hmon() applies the damage and may kill the
           monster; it returns whether the monster survived. */
        malive = await hmon(mon, weapon, HMON_MELEE, dieroll);

        if (malive) {
            /* C integer division: a 3-hp-max jackal at 1 hp is NOT below
               mhpmax/2 (3/2 == 1, 1 < 1 false); float division made it
               flee and spend rn2(3)+rnd(100) C never drew */
            if (!rn2(25) && mon.mhp < Math.trunc(mon.mhpmax / 2)
                && !game.u.uswallow) {
                await monflee(mon, !rn2(3) ? rnd(100) : 0, false, true);

                if (game.u.ustuck === mon && !game.u.uswallow)
                    set_ustuck(null);
            }
            /* Vorpal Blade hit converted to miss: headless monster or worm
               tail. NOTE: with hmon unported the monster never loses hp, so
               this fires on every hit. It is faithful to the C given no
               damage was applied. */
            if (mon.mhp === oldhp) {
                mhit[0] = 0;
                /* a miss is not a hit; uconduct is a zeroed struct in C */
                (game.u.uconduct ||= {}).weaphit = oldweaphit;
            }
            if (mon.wormno && mhit[0])
                await cutworm(mon, game.bhitpos.x, game.bhitpos.y, slice_or_chop);
        }
    }
    return malive;
}

// src/uhitm.c hitum() — one melee attack sequence, possibly two hits.
//
// This is where the chain's draws finally land in order:
//     find_roll_to_hit   (no draw)
//     mon_maybe_unparalyze   rn2(10), ONLY if the target cannot move
//     rnd(20)                the die
//     known_hitum            rn2(25), then rn2(3) and rnd(100) if it gates
// and the whole sequence repeats for a second hit when twohits is set.
//
// twohits is 0 for a single hit and 1 for the first of two, and known_hitum's
// callees read it, which is why it is game state rather than a local. It is
// set to 2 before the second hit and cleared at the end.
//
// Passive monster counter-attacks are only partly ported below.

/* monst_data stores each attack as [aatyp, adtyp, damn, damd]; the C reads
   them as named fields. */
const mattk_row = (a) => ({ aatyp: a[0], adtyp: a[1], damn: a[2], damd: a[3] });

// src/uhitm.c hitum_cleave(). Attack the primary square and the adjacent
// squares on either side, reversing the sweep direction on each Cleaver hit.
async function hitum_cleave(target, uattk) {
    let i = xdir.findIndex((dx, dir) => dx === game.u.dx
                                        && ydir[dir] === game.u.dy);
    if (i < 0)
        return true;

    const clockwise = !!game.cleave_clockwise;
    i = (i + (clockwise ? 6 : 2)) % 8;
    const oldumort = game.u.umortality || 0;
    const save_bhitpos = { ...game.bhitpos };
    const save_notonhead = game.notonhead;

    for (let count = 0; count < 3; count++) {
        i = (i + (clockwise ? 1 : 7)) % 8;
        const tx = game.u.ux + xdir[i];
        const ty = game.u.uy + ydir[i];
        if (!isok(tx, ty))
            continue;

        const mtmp = m_at(tx, ty);
        if (!mtmp) {
            if (glyph_is_invisible_at(tx, ty))
                unmap_invisible(tx, ty);
            continue;
        }

        const out = { attk_count: 0, role_roll_penalty: 0 };
        const tmp = await find_roll_to_hit(mtmp, uattk.aatyp,
                                           game.u.uwep, out);
        mon_maybe_unparalyze(mtmp);
        const dieroll = rnd(20);
        const mhit = [(tmp > dieroll) ? 1 : 0];
        game.bhitpos = { x: tx, y: ty };
        game.notonhead = (mtmp.mx !== tx || mtmp.my !== ty);
        await known_hitum(mtmp, game.u.uwep, mhit, tmp,
                          out.role_roll_penalty, uattk, dieroll);
        await passive(mtmp, game.u.uwep, mhit[0], !DEADMONSTER(mtmp),
                      ATTKS.AT_WEAP, !game.u.uwep);

        if (!game.u.uwep || (game.multi || 0) < 0
            || (game.u.umortality || 0) > oldumort)
            break;
    }

    game.cleave_clockwise = !clockwise;
    game.bhitpos = save_bhitpos;
    game.notonhead = save_notonhead;
    return !(target && DEADMONSTER(target));
}

export async function hitum(mon, uattk) {
    const wepbefore = game.u.uwep;
    const secondwep = game.u.twoweap ? game.u.uswapwep : null;
    const x = game.u.ux + game.u.dx, y = game.u.uy + game.u.dy;
    const oldumort = game.u.umortality || 0;
    const out = { attk_count: 0, role_roll_penalty: 0 };

    if (game.u.uwep?.oartifact === ART_CLEAVER && !game.u.twoweap
        && !game.u.uswallow && !game.u.ustuck
        && game.u.umonnum !== PMNAMES.PM_GRID_BUG)
        return hitum_cleave(mon, uattk);

    /* 0: single hit, 1: first of two; hmon_hitmon reads it downstream */
    game.twohits = (game.u.uwep ? game.u.twoweap : double_punch()) ? 1 : 0;

    let tmp = await find_roll_to_hit(mon, uattk.aatyp, game.u.uwep, out);
    mon_maybe_unparalyze(mon);
    let dieroll = rnd(20);
    const mhit = [(tmp > dieroll || game.u.uswallow) ? 1 : 0];
    if (tmp > dieroll)
        exercise(A_DEX, true);          /* src/uhitm.c hitum() */

    let malive = await known_hitum(mon, game.u.uwep, mhit, tmp,
                             out.role_roll_penalty, uattk, dieroll);
    const wep_was_destroyed = !!(wepbefore && !game.u.uwep);
    await passive(mon, game.u.uwep, mhit[0], malive, ATTKS.AT_WEAP,
                  wep_was_destroyed);

    /* second attack for two-weapon combat or skilled unarmed combat */
    if (game.twohits && !(game.override_confirmation
                          || (game.multi || 0) < 0
                          || (game.u.umortality || 0) > oldumort
                          || !malive || m_at(x, y) !== mon)) {
        game.twohits = 2;               /* second of 2 hits */
        tmp = await find_roll_to_hit(mon, uattk.aatyp, game.u.uswapwep, out);
        mon_maybe_unparalyze(mon);
        dieroll = rnd(20);
        mhit[0] = (tmp > dieroll || game.u.uswallow) ? 1 : 0;
        malive = await known_hitum(mon, secondwep, mhit, tmp,
                             out.role_roll_penalty, uattk, dieroll);
        /* the second counter-attack only happens if the second hit lands */
        if (mhit[0])
            await passive(mon, secondwep, mhit[0], malive, ATTKS.AT_WEAP,
                          !!(secondwep && !game.u.uswapwep));
    }
    game.twohits = 0;
    return malive;
}

// src/uhitm.c:5424 hmonas(), the polymorphed hero's natural attack loop.
//
// Weapon-capable forms use a wielded weapon for their first claw, then use
// the remaining natural attacks. Each attack has its own passive response and
// knockback check. Keeping those outside known_hitum() is important because
// hmon_hitmon() deliberately suppresses its ordinary weapon knockback while
// the hero is polymorphed.
export async function hmonas(mon) {
    const attacks = game.youmonst.data.mattk;
    const sum = Array(NATTK).fill(M_ATTK_MISS);
    const roll = { attk_count: 0, role_roll_penalty: 0 };
    const multi_claw = attacks.filter((a) =>
        a[0] === ATTKS.AT_WEAP || a[0] === ATTKS.AT_CLAW
        || a[0] === ATTKS.AT_TUCH).length > 1;
    let weapon_used = false;
    let odd_claw = true;

    game.twohits = 0;
    game.skipdrin = false;

    for (let i = 0; i < NATTK; i++) {
        if (i > 0 && (m_at(game.bhitpos.x, game.bhitpos.y) !== mon
                      || DEADMONSTER(mon)))
            continue;

        let mattk = attacks[i];
        const aatyp = mattk[0];
        let weapon = null;
        let dhit = 0;

        if (aatyp === ATTKS.AT_NONE || aatyp === ATTKS.AT_BOOM) {
            continue;
        }
        if (game.skipdrin && aatyp === ATTKS.AT_TENT
            && mattk[1] === ATTKS.AD_DRIN)
            continue;

        const use_weapon = aatyp === ATTKS.AT_WEAP
            || (aatyp === ATTKS.AT_CLAW && game.u.uwep
                && !cantwield(game.youmonst.data) && !weapon_used)
            || (aatyp === ATTKS.AT_TUCH && game.u.uwep
                && game.youmonst.data.mlet === MONSYMS.S_LICH
                && !weapon_used);

        if (aatyp === ATTKS.AT_BREA || aatyp === ATTKS.AT_SPIT
            || aatyp === ATTKS.AT_GAZE) {
            /* These active abilities are only used through #monster. During
               an ordinary polymorphed melee turn C records a miss, then still
               applies the defender's live passive response and knockback
               gate for this attack slot. */
            sum[i] = M_ATTK_MISS;
        } else if (use_weapon) {
            odd_claw = !odd_claw;
            weapon_used = true;
            weapon = game.u.uwep;
            const tmp = await find_roll_to_hit(mon, ATTKS.AT_WEAP,
                                               weapon, roll);
            mon_maybe_unparalyze(mon);
            const dieroll = rnd(20);
            const mhit = [(tmp > dieroll || game.u.uswallow) ? 1 : 0];
            const malive = await known_hitum(
                mon, weapon, mhit, tmp, roll.role_roll_penalty,
                mattk_row(mattk), dieroll);
            weapon = game.u.uwep;
            sum[i] = malive
                ? (mhit[0] ? M_ATTK_HIT : M_ATTK_MISS)
                : M_ATTK_DEF_DIED;
            dhit = mhit[0];
        } else if (aatyp === ATTKS.AT_CLAW || aatyp === ATTKS.AT_TUCH
                   || aatyp === ATTKS.AT_KICK || aatyp === ATTKS.AT_BITE
                   || aatyp === ATTKS.AT_STNG || aatyp === ATTKS.AT_BUTT
                   || aatyp === ATTKS.AT_TENT) {
            const tmp = await find_roll_to_hit(mon, aatyp, null, roll);
            mon_maybe_unparalyze(mon);
            const dieroll = rnd(20);
            dhit = (tmp > dieroll || game.u.uswallow) ? 1 : 0;

            if (dhit) {
                await wakeup(mon, true);
                let specialdmg = 0;
                if (aatyp === ATTKS.AT_CLAW || aatyp === ATTKS.AT_TUCH) {
                    odd_claw = !odd_claw;
                    const armask = W_ARMG
                        | ((odd_claw || !multi_claw) ? W_RINGL : 0)
                        | ((!odd_claw || !multi_claw) ? W_RINGR : 0);
                    specialdmg = special_dmgval(
                        game.youmonst, mon, armask);
                } else if (aatyp === ATTKS.AT_KICK) {
                    specialdmg = special_dmgval(
                        game.youmonst, mon, W_ARMF);
                }

                const verb = aatyp === ATTKS.AT_TUCH ? 'touch'
                    : aatyp === ATTKS.AT_KICK ? 'kick'
                    : aatyp === ATTKS.AT_BITE ? 'bite'
                    : aatyp === ATTKS.AT_STNG ? 'sting'
                    : aatyp === ATTKS.AT_BUTT ? 'head butt'
                    : aatyp === ATTKS.AT_TENT ? 'tentacles suck'
                    : 'hit';
                if (aatyp === ATTKS.AT_TENT)
                    await Your(`${verb} ${mon_nam(mon)}.`);
                else
                    await You(`${verb} ${mon_nam(mon)}.`);
                sum[i] = await damageum(mon, mattk, specialdmg);
            } else {
                await missum(mon, mattk_row(mattk),
                             tmp + roll.role_roll_penalty > dieroll);
            }
        } else if (aatyp === ATTKS.AT_EXPL) {
            dhit = -1;
            await wakeup(mon, true);
            await You('explode!');
            sum[i] = await explum(mon, mattk);
        } else if (aatyp === ATTKS.AT_ENGL) {
            const tmp = await find_roll_to_hit(mon, aatyp, null, roll);
            mon_maybe_unparalyze(mon);
            dhit = tmp > rnd(20 + i);
            if (dhit) {
                await wakeup(mon, true);
                if (mon.mnum === PMNAMES.PM_SHADE) {
                    await Your(`attempt to surround ${mon_nam(mon)} is harmless.`);
                } else if (!(await failed_grab(game.youmonst, mon, mattk))) {
                    sum[i] = await gulpum(mon, mattk);
                    if (sum[i] === M_ATTK_DEF_DIED
                        && (mon.data.mlet === MONSYMS.S_ZOMBIE
                            || mon.data.mlet === MONSYMS.S_MUMMY)
                        && rn2(5) && !Sick_resistance()) {
                        await You_feel(`${game.u.uprops?.SICK ? 'very ' : ''}sick.`);
                        await mdamageu(mon, rnd(8));
                    }
                }
            } else {
                await missum(mon, mattk_row(mattk), false);
            }
        } else if (aatyp === ATTKS.AT_HUGS) {
            let specialdmg;
            const silverhit = { v: 0 };
            const byhand = hug_throttles(game.mons[game.u.umonnum]); /* rope golem */
            let unconcerned = (byhand && !can_be_strangled(mon));

            if (sticks(mon.data) || game.u.uswallow || game.notonhead
                || (byhand && (game.u.uwep || !has_head(mon.data)))) {
                /* can't hold a holder due to subsequent ambiguity over
                   who is holding whom; can't hug engulfer from inside;
                   can't hug a worm tail (would immobilize entire worm!);
                   byhand: can't choke something that lacks a head;
                   not allowed to make a choking hug if wielding a weapon
                   (but might have grabbed w/o weapon, then wielded one,
                   and may even be attacking a different monster now) */
                if (byhand && game.u.uwep && game.u.ustuck
                    && !(sticks(game.u.ustuck.data) || game.u.uswallow))
                    await uunstick();
                continue; /* not 'break'; bypass passive counter-attack */
            }
            /* automatic if prev two attacks succeed, or if
               already grabbed in a previous attack */
            dhit = 1;
            await wakeup(mon, true);
            /* choking hug/throttling grab uses hands (gloves or rings);
               normal hug uses outermost of cloak/suit/shirt */
            specialdmg = special_dmgval(game.youmonst, mon,
                                        byhand ? (W_ARMG | W_RINGL | W_RINGR)
                                               : (W_ARMC | W_ARM | W_ARMU),
                                        silverhit);
            if (unconcerned) {
                /* strangling something which can't be strangled */
                mattk = [...mattk]; /* alt_attk */
                /* change damage to 1d1; not strangling but still
                   doing [minimal] physical damage to victim's body */
                mattk[2] = mattk[3] = 1;
                /* don't give 'unconcerned' feedback if there is extra damage
                   or if it is nearly destroyed or if creature doesn't have
                   the mental ability to be concerned in the first place */
                if (specialdmg || mindless(mon.data)
                    || mon.mhp <= 1 + Math.max(game.u.udaminc | 0, 1))
                    unconcerned = false;
            }
            if (mon.data === game.mons[PMNAMES.PM_SHADE]) {
                const verb = byhand ? 'grasp' : 'hug';

                /* hugging a shade; successful if blessed outermost armor
                   for normal hug, or blessed gloves or silver ring(s) for
                   choking hug; deals damage but never grabs hold */
                if (specialdmg) {
                    await You(`${verb} ${mon_nam(mon)}${exclam(specialdmg)}`);
                    if (silverhit.v && game.flags?.verbose !== false)
                        await silver_sears(game.youmonst, mon, silverhit.v);
                    sum[i] = await damageum(mon, mattk, specialdmg);
                } else {
                    await Your(`${verb} passes harmlessly through ${mon_nam(mon)}.`);
                }
            } else if (!(await failed_grab(game.youmonst, mon, mattk))) {
                /* can't grab unsolid creatures (checked after shade handling);
                   otherwise, use the hug attack against an ordinary foe */
                if (mon === game.u.ustuck) {
                    await pline(`${Monnam(mon)} is being ${byhand ? 'throttled' : 'crushed'}${
                          /* extra feedback for non-breather being choked */
                          unconcerned ? " but doesn't seem concerned" : ''}.`);
                    if (silverhit.v && game.flags?.verbose !== false)
                        await silver_sears(game.youmonst, mon, silverhit.v);
                    sum[i] = await damageum(mon, mattk, specialdmg);
                } else if (i >= 2 && (sum[i - 1] > M_ATTK_MISS)
                           && (sum[i - 2] > M_ATTK_MISS)) {
                    /* in case we're hugging a new target while already
                       holding something else; yields feedback
                       "<u.ustuck> is no longer in your clutches" */
                    if (game.u.ustuck && game.u.ustuck !== mon)
                        await uunstick();
                    await You(`grab ${mon_nam(mon)}!`);
                    set_ustuck(mon);
                    if (silverhit.v && game.flags?.verbose !== false)
                        await silver_sears(game.youmonst, mon, silverhit.v);
                    sum[i] = await damageum(mon, mattk, specialdmg);
                }
            }
        } else {
            note_unported_uhitm(`hmonas:aatyp=${aatyp}`);
            continue;
        }

        if (dhit === -1) {
            game.u.mh = -1;
            await rehumanize();
        }
        await passive(mon, weapon, sum[i] !== M_ATTK_MISS,
                      !DEADMONSTER(mon), aatyp, false);
        const mhm = { hitflags: sum[i] };
        if (await mhitm_knockback(game.youmonst, mon, mattk, mhm,
                                 weapon_used))
            break;
        sum[i] = mhm.hitflags;
        if (DEADMONSTER(mon))
            break;
        if (!Upolyd(game.u))
            break;
        if ((game.multi || 0) < 0)
            break;
    }

    game.twohits = 0;
    return !DEADMONSTER(mon);
}

// src/uhitm.c:4819 damageum(), the damage tail for a natural hero attack.
// The physical arm covers claws, kicks, touches, and hugs. Other damage types
// retain their base dice while their special side effects remain explicit in
// the unported ledger.
export async function damageum(mon, mattk, specialdmg) {
    let damage = d(mattk[2], mattk[3]);
    const aatyp = mattk[0];

    if (mattk[1] === ATTKS.AD_PHYS) {
        damage += specialdmg;
        if (aatyp === ATTKS.AT_KICK || aatyp === ATTKS.AT_CLAW
            || aatyp === ATTKS.AT_TUCH || aatyp === ATTKS.AT_HUGS) {
            if (thick_skinned(game.mons[mon.mnum])) {
                damage = aatyp === ATTKS.AT_KICK
                    ? 0 : Math.trunc((damage + 1) / 2);
            }
            const bonus = game.u.udaminc || 0;
            if (bonus > 0)
                damage += bonus;
            else if (damage > 0)
                damage = Math.max(1, damage + bonus);
        }
    } else {
        if (mattk[1] === ATTKS.AD_FIRE) {
            const mhm = { damage, hitflags: M_ATTK_MISS, permdmg: 0,
                          specialdmg, done: false };
            await mhitm_ad_fire(game.youmonst, mattk, mon, mhm);
            damage = mhm.damage;
        } else if (mattk[1] === ATTKS.AD_COLD) {
            const mhm = { damage, hitflags: M_ATTK_MISS, permdmg: 0,
                          specialdmg, done: false };
            await mhitm_ad_cold(game.youmonst, mattk, mon, mhm);
            damage = mhm.damage;
        } else if (mattk[1] === ATTKS.AD_ELEC) {
            const mhm = { damage, hitflags: M_ATTK_MISS, permdmg: 0,
                          specialdmg, done: false };
            await mhitm_ad_elec(game.youmonst, mattk, mon, mhm);
            damage = mhm.damage;
        } else if (mattk[1] === ATTKS.AD_DRST || mattk[1] === ATTKS.AD_DRDX
                   || mattk[1] === ATTKS.AD_DRCO) {
            const mhm = { damage, hitflags: M_ATTK_MISS, permdmg: 0,
                          specialdmg, done: false };
            await mhitm_ad_drst(game.youmonst, mattk, mon, mhm);
            damage = mhm.damage;
        } else if (mattk[1] === ATTKS.AD_DRLI) {
            const mhm = { damage, hitflags: M_ATTK_MISS, permdmg: 0,
                          specialdmg, done: false };
            await mhitm_ad_drli(game.youmonst, mattk, mon, mhm);
            damage = mhm.damage;
        } else if (mattk[1] === ATTKS.AD_DRIN) {
            const mhm = { damage, hitflags: M_ATTK_MISS, permdmg: 0,
                          specialdmg, done: false };
            await mhitm_ad_drin(game.youmonst, mattk, mon, mhm);
            damage = mhm.damage;
        } else if (mattk[1] === ATTKS.AD_STON) {
            const mhm = { damage, hitflags: M_ATTK_MISS, permdmg: 0,
                          specialdmg, done: false };
            await mhitm_ad_ston(game.youmonst, mattk, mon, mhm);
            damage = mhm.damage;
        } else if (mattk[1] === ATTKS.AD_WRAP) {
            const mhm = { damage, hitflags: M_ATTK_MISS, permdmg: 0,
                          specialdmg, done: false };
            await mhitm_ad_wrap(game.youmonst, mattk, mon, mhm);
            damage = mhm.damage;
        } else if (mattk[1] === ATTKS.AD_TLPT) {
            const mhm = { damage, hitflags: M_ATTK_MISS, permdmg: 0,
                          specialdmg, done: false };
            await mhitm_ad_tlpt(game.youmonst, mattk, mon, mhm);
            damage = mhm.damage;
        } else if (mattk[1] === ATTKS.AD_POLY) {
            const mhm = { damage, hitflags: M_ATTK_MISS, permdmg: 0,
                          specialdmg, done: false };
            await mhitm_ad_poly(game.youmonst, mattk, mon, mhm);
            damage = mhm.damage;
            if (mhm.done)
                return mhm.hitflags;
        } else if (mattk[1] === ATTKS.AD_HEAL) {
            const mhm = { damage, hitflags: M_ATTK_MISS, permdmg: 0,
                          specialdmg, done: false };
            await mhitm_ad_heal(game.youmonst, mattk, mon, mhm);
            damage = mhm.damage;
            if (mhm.done)
                return mhm.hitflags;
        } else if (mattk[1] === ATTKS.AD_PLYS) {
            const mhm = { damage, hitflags: M_ATTK_MISS, permdmg: 0,
                          specialdmg, done: false };
            await mhitm_ad_plys(game.youmonst, mattk, mon, mhm);
            damage = mhm.damage;
        } else if (mattk[1] === ATTKS.AD_SLEE) {
            const mhm = { damage, hitflags: M_ATTK_MISS, permdmg: 0,
                          specialdmg, done: false };
            await mhitm_ad_slee(game.youmonst, mattk, mon, mhm);
            damage = mhm.damage;
        } else if (mattk[1] === ATTKS.AD_SLIM) {
            const mhm = { damage, hitflags: M_ATTK_MISS, permdmg: 0,
                          specialdmg, done: false };
            await mhitm_ad_slim(game.youmonst, mattk, mon, mhm);
            damage = mhm.damage;
            if (mhm.done)
                return mhm.hitflags;
        } else {
            note_unported_uhitm(`damageum:adtyp=${mattk[1]}`);
        }
    }

    mon.mstrategy &= ~STRAT_WAITFORU;
    mon.mhp -= damage;
    if (DEADMONSTER(mon)) {
        if (damage)
            await killed(mon);
        return M_ATTK_DEF_DIED;
    }
    return M_ATTK_HIT;
}

// src/mhitm.c attk_protection(), the armor slots which keep an aggressive
// passive defense from touching the attacker.
export function attk_protection(aatyp) {
    switch (aatyp) {
    case ATTKS.AT_NONE:
    case ATTKS.AT_SPIT:
    case ATTKS.AT_EXPL:
    case ATTKS.AT_BOOM:
    case ATTKS.AT_GAZE:
    case ATTKS.AT_BREA:
    case ATTKS.AT_MAGC:
        return -1;
    case ATTKS.AT_CLAW:
    case ATTKS.AT_TUCH:
    case ATTKS.AT_WEAP:
        return W_ARMG;
    case ATTKS.AT_KICK:
        return W_ARMF;
    case ATTKS.AT_BUTT:
        return W_ARMH;
    case ATTKS.AT_HUGS:
        return W_ARMC | W_ARMG;
    default:
        return 0;
    }
}

// src/uhitm.c erode_armor(), including its retry loop. Body armor is the one
// branch which terminates even when there is no eligible object.
export async function erode_armor(mdef, hurt) {
    for (;;) {
        let target;
        switch (rn2(5)) {
        case 0:
            target = which_armor(mdef, W_ARMH);
            if (!target || await erode_obj(target, xname(target), hurt,
                                           EF_GREASE) === ER_NOTHING)
                continue;
            break;
        case 1:
            target = which_armor(mdef, W_ARMC);
            if (target) {
                await erode_obj(target, xname(target), hurt,
                                EF_GREASE | EF_VERBOSE);
            } else {
                target = which_armor(mdef, W_ARM)
                         || which_armor(mdef, W_ARMU);
                if (target)
                    await erode_obj(target, xname(target), hurt,
                                    EF_GREASE | EF_VERBOSE);
            }
            break;
        case 2:
            target = which_armor(mdef, W_ARMS);
            if (!target || await erode_obj(target, xname(target), hurt,
                                           EF_GREASE) === ER_NOTHING)
                continue;
            break;
        case 3:
            target = which_armor(mdef, W_ARMG);
            if (!target || await erode_obj(target, xname(target), hurt,
                                           EF_GREASE) === ER_NOTHING)
                continue;
            break;
        case 4:
            target = which_armor(mdef, W_ARMF);
            if (!target || await erode_obj(target, xname(target), hurt,
                                           EF_GREASE) === ER_NOTHING)
                continue;
            break;
        }
        return;
    }
}

// src/uhitm.c passive() — the monster's counter-attack after the hero hits it.
//
// hitum calls this unconditionally, so its FIRST action matters on every
// single melee swing: it scans the monster's attack table for an AT_NONE
// slot, which is how a passive attack is encoded. Most monsters have none and
// the function returns having drawn NOTHING. That early return is the common
// path and is why porting the head alone is worth doing.
//
// When a passive attack IS present, the damage roll happens BEFORE the switch
// and regardless of which arm runs:
//     d(damn, damd)        if damn is set
//     d(m_lev + 1, damd)   otherwise, if damd is set
//     0                    if neither
// C's own comment notes tmp is not always used, but the DRAW still happens.
// That is the trap: a port that computed the damage inside the arm that needs
// it would skip a draw for every arm that does not.
//
// The supported switch arms preserve those draws and their visible and state
// effects. Resistant golem-form side effects remain explicit unported markers.
export async function passive(mon, weapon, mhitb, maliveb, aatyp,
                              wep_was_destroyed) {
    const ptr = game.mons[mon.mnum];
    const mhit = mhitb ? M_ATTK_HIT : M_ATTK_MISS;
    const malive = maliveb ? M_ATTK_HIT : M_ATTK_MISS;

    let i;
    for (i = 0; ; i++) {
        if (i >= NATTK)
            return malive | mhit;       /* no passive attacks: NO DRAW */
        if (ptr.mattk[i] && ptr.mattk[i][0] === ATTKS.AT_NONE)
            break;                      /* try this one */
    }

    /* Note: tmp is not always used, but the draw happens regardless */
    const damn = ptr.mattk[i][2], damd = ptr.mattk[i][3];
    let tmp = 0;
    if (damn)
        tmp = d(damn, damd);
    else if (damd)
        tmp = d(mon.m_lev + 1, damd);

    /*  These affect you even if they just died.  */
    const adtyp = ptr.mattk[i][1];
    switch (adtyp) {
    case ATTKS.AD_FIRE:
        /* every draw here is behind THREE guards: the hit landed, the monster
           is not cancelled, and the hero was using an object. A bare-handed
           miss against a red mold draws nothing past the d() above. */
        if (mhitb && !mon.mcan && weapon) {
            if (aatyp === ATTKS.AT_KICK) {
                if (game.u.uarmf && !rn2(6))
                    await erode_obj(game.u.uarmf, xname(game.u.uarmf),
                                    ERODE_BURN, EF_GREASE | EF_VERBOSE);
            } else if (aatyp === ATTKS.AT_WEAP || aatyp === ATTKS.AT_CLAW
                       || aatyp === ATTKS.AT_MAGC || aatyp === ATTKS.AT_TUCH)
                await passive_obj(mon, weapon, ptr.mattk[i]);
        }
        break;
    case ATTKS.AD_ACID:
        /* NOTE the asymmetry with AD_FIRE: this arm's first block is guarded
           by mhitb alone -- no !mcan, no weapon -- so a cancelled acid blob
           still splashes you, and the rn2(2) fires bare-handed. The second
           block then repeats the weapon test separately. Folding the two
           blocks together would lose the rn2(2) on every bare-handed hit. */
        if (mhitb && rn2(2)) {
            if (Blind() || !game.flags.verbose)
                await You('are splashed!');
            else
                await You(`are splashed by ${s_suffix(mon_nam(mon))} ${
                    hliquid('acid')}!`);
            if (!Acid_resistance()) {
                await mdamageu(mon, tmp);
                monstunseesu(M_SEEN_ACID);
            } else {
                monstseesu(M_SEEN_ACID);
            }
            if (!rn2(30))
                await erode_armor(game.youmonst, ERODE_CORRODE);
        }
        if (mhitb && weapon) {
            if (aatyp === ATTKS.AT_KICK) {
                if (game.u.uarmf && !rn2(6))
                    await erode_obj(game.u.uarmf, xname(game.u.uarmf),
                                    ERODE_CORRODE,
                                    EF_GREASE | EF_VERBOSE);
            } else if (aatyp === ATTKS.AT_WEAP || aatyp === ATTKS.AT_CLAW
                       || aatyp === ATTKS.AT_MAGC || aatyp === ATTKS.AT_TUCH)
                await passive_obj(mon, weapon, ptr.mattk[i]);
        }
        exercise(A_STR, false);
        break;
    case ATTKS.AD_STON:
        /* no draw of its own. The protection test decides whether you are
           stoned, and returns a THIRD value, M_ATTK_DEF_DIED, which neither
           of the two flag words above can express. */
        if (mhitb) {
            let protector = attk_protection(aatyp);
            if (aatyp === ATTKS.AT_MAGC)
                protector = W_ARMG;
            if (protector === 0
                || (protector === W_ARMG && !game.u.uarmg
                    && !game.u.uwep && !wep_was_destroyed)
                || (protector === W_ARMF && !game.u.uarmf)
                || (protector === W_ARMH && !game.u.uarmh)
                || (protector === (W_ARMC | W_ARMG)
                    && (!game.u.uarmc || !game.u.uarmg))) {
                if (!Stone_resistance()) {
                    if (poly_when_stoned(game.youmonst.data)) {
                        const { polymon } = await import('./polyself.js');
                        if (await polymon(PMNAMES.PM_STONE_GOLEM))
                            break;
                    }
                    const { done_in_by } = await import('./end.js');
                    await done_in_by(mon, STONING);
                    return M_ATTK_DEF_DIED;
                }
            }
        }
        break;
    case ATTKS.AD_RUST:
    case ATTKS.AD_CORR:
        /* Same three guards as AD_FIRE, but WITHOUT its !rn2(6): rust and
           corrosion erode the boots every time, fire and acid only one kick
           in six. Sharing one helper across all four arms -- they are
           otherwise character-for-character identical -- would silently add
           a draw to these two or drop it from the other two. */
        if (mhitb && !mon.mcan && weapon) {
            if (aatyp === ATTKS.AT_KICK) {
                if (game.u.uarmf)
                    await erode_obj(game.u.uarmf, xname(game.u.uarmf),
                                    adtyp === ATTKS.AD_RUST
                                        ? ERODE_RUST : ERODE_CORRODE,
                                    EF_GREASE | EF_VERBOSE);
            } else if (aatyp === ATTKS.AT_WEAP || aatyp === ATTKS.AT_CLAW
                       || aatyp === ATTKS.AT_MAGC || aatyp === ATTKS.AT_TUCH)
                await passive_obj(mon, weapon, ptr.mattk[i]);
        }
        break;
    case ATTKS.AD_MAGM:
        /* wrath of gods for attacking Oracle -- no draw either way */
        if (Antimagic()) {
            await shieldeff(game.u.ux, game.u.uy);
            monstseesu(M_SEEN_MAGR);
            await pline('A hail of magic missiles narrowly misses you!');
        } else {
            await You('are hit by magic missiles appearing from thin air!');
            await mdamageu(mon, tmp);
            monstunseesu(M_SEEN_MAGR);
        }
        break;
    case ATTKS.AD_ENCH:     /* KMH -- remove enchantment (disenchanter) */
        /* The `break`s inside this if leave the SWITCH, not the if, so they
           skip passive_obj entirely. A kick with no weapon, and any bite,
           butt or sting, involve no object and get nothing. */
        if (mhitb) {
            if (aatyp === ATTKS.AT_KICK) {
                if (!weapon)
                    break;
            } else if (aatyp === ATTKS.AT_BITE || aatyp === ATTKS.AT_BUTT
                       || (aatyp >= ATTKS.AT_STNG && aatyp < ATTKS.AT_WEAP)) {
                break;                  /* no object involved */
            }
            await passive_obj(mon, weapon, ptr.mattk[i]);
        }
        break;
    default:
        break;      /* C's default arm is empty (src/uhitm.c passive()) */
    }

    /*  These only affect you if they still live.
     *
     *  A SECOND switch, and its guard holds an rn2(3) that fires on every
     *  passive encounter where the monster survives and is not cancelled --
     *  far more often than any single arm of the switch above. Reading
     *  passive as one switch loses this draw on essentially every melee
     *  exchange with a passive monster.
     */
    if (malive && !mon.mcan && rn2(3)) {   /* C tests malive, the flag word,
           not maliveb. M_ATTK_MISS is 0x0 and M_ATTK_HIT is 0x1, so their
           truthiness is identical and this is behaviourally the same; written
           as C writes it so a grep for the C line finds this one. */
        switch (adtyp) {
        case ATTKS.AD_PLYS:
            if (mon.mnum === PMNAMES.PM_FLOATING_EYE) {
                if (!canseemon(mon))
                    break;
                if (mon.mcansee) {
                    const { ureflects } = await import('./muse.js');
                    if (await ureflects('%s gaze is reflected by your %s.',
                                        s_suffix(Monnam(mon)))) {
                        ;
                    } else if (Hallucination() && rn2(4)) {
                        await pline(`${Monnam(mon)} looks ${
                            rn2(2) ? 'rather ' : ''}${
                            rn2(2) ? 'stupefied' : 'numb'}.`);
                    } else if (Free_action()) {
                        await You(`momentarily stiffen under ${
                            s_suffix(mon_nam(mon))} gaze!`);
                    } else {
                        await You(`are frozen by ${
                            s_suffix(mon_nam(mon))} gaze!`);
                        const duration = ACURR(A_WIS) > 12 || rn2(4)
                            ? -tmp : -127;
                        nomul(duration);
                        game.multi_reason = `frozen by ${
                            s_suffix(mon_nam(mon))} gaze`;
                        game.nomovemsg = null;
                    }
                } else {
                    await pline(`${Adjmonnam(mon, 'blind')} cannot defend itself.`);
                    if (!rn2(500))
                        change_luck(-1);
                }
            } else if (Free_action()) {
                await You('momentarily stiffen.');
            } else {
                await You(`are frozen by ${mon_nam(mon)}!`);
                game.nomovemsg = 'You can move again.';
                nomul(-tmp);
                game.multi_reason = `frozen by ${mon_nam(mon)}`;
                exercise(A_DEX, false);
            }
            break;
        case ATTKS.AD_COLD:
            if (monnear(mon, game.u.ux, game.u.uy)) {
                if (Cold_resistance()) {
                    await shieldeff(game.u.ux, game.u.uy);
                    await You_feel('a mild chill.');
                    monstseesu(M_SEEN_COLD);
                    await ugolemeffects(ATTKS.AD_COLD, tmp);
                    break;
                }
                monstunseesu(M_SEEN_COLD);
                await You('are suddenly very cold!');
                await mdamageu(mon, tmp);
                healmon(mon, Math.trunc((tmp + rn2(2)) / 2),
                        Math.trunc((tmp + 1) / 2));
                if (mon.mhpmax > ((mon.m_lev | 0) + 1) * 8)
                    await split_mon(mon, game.youmonst);
            }
            break;
        case ATTKS.AD_STUN:
            if (!(game.u.intrinsic?.HStun || game.u.uprops?.STUNNED))
                await make_stunned(tmp, true);
            break;
        case ATTKS.AD_FIRE:
            if (monnear(mon, game.u.ux, game.u.uy)) {
                if (Fire_resistance()) {
                    await shieldeff(game.u.ux, game.u.uy);
                    await You_feel('mildly warm.');
                    monstseesu(M_SEEN_FIRE);
                    await ugolemeffects(ATTKS.AD_FIRE, tmp);
                    break;
                }
                monstunseesu(M_SEEN_FIRE);
                await You('are suddenly very hot!');
                await mdamageu(mon, tmp);
            }
            break;
        case ATTKS.AD_ELEC:
            if (Shock_resistance()) {
                await shieldeff(game.u.ux, game.u.uy);
                await You_feel('a mild tingle.');
                monstseesu(M_SEEN_ELEC);
                await ugolemeffects(ATTKS.AD_ELEC, tmp);
                break;
            }
            monstunseesu(M_SEEN_ELEC);
            await You('are jolted with electricity!');
            await mdamageu(mon, tmp);
            break;
        default:
            break;  /* C's default arm is empty */
        }
    }

    return malive | mhit;
}

// src/uhitm.c:6127 passive_obj() applies a monster's AT_NONE defense to
// the object that struck it.
export async function passive_obj(mon, obj, mattk = null) {
    if (!mon)
        return;

    const ptr = mon.data || game.mons[mon.mnum];
    if (!mattk)
        mattk = ptr?.mattk?.find((attk) => attk?.[0] === ATTKS.AT_NONE);
    if (!mattk)
        return;

    if (!obj) {
        obj = game.u.twoweap && game.u.uswapwep && !rn2(2)
            ? game.u.uswapwep : game.u.uwep;
        if (!obj && mattk[1] === ATTKS.AD_ENCH)
            obj = game.u.uarmg;
        if (!obj)
            return;
    }

    switch (mattk[1]) {
    case ATTKS.AD_FIRE:
        if (!rn2(6) && !mon.mcan
            && ptr !== game.mons[PMNAMES.PM_STEAM_VORTEX])
            await erode_obj(obj, null, ERODE_BURN, EF_NONE);
        break;
    case ATTKS.AD_ACID:
        if (!rn2(6))
            await erode_obj(obj, null, ERODE_CORRODE, EF_GREASE);
        break;
    case ATTKS.AD_RUST:
        if (!mon.mcan)
            await erode_obj(obj, null, ERODE_RUST, EF_GREASE);
        break;
    case ATTKS.AD_CORR:
        if (!mon.mcan)
            await erode_obj(obj, null, ERODE_CORRODE, EF_GREASE);
        break;
    case ATTKS.AD_ENCH:
        if (!mon.mcan && await drain_item(obj, true)
            && carried(obj)
            && (obj.known || obj.oclass === OCLASSES.ARMOR_CLASS))
            await pline(`${Yobjnam2(obj, 'seem')} less effective.`);
        break;
    default:
        break;
    }
}

// src/uhitm.c hmon() — the damage entry point.
//
// Thin, but not empty: the anger_guards flag is captured BEFORE hmon_hitmon
// runs, because hmon_hitmon can kill the monster or change its peacefulness,
// and the guards must be angered based on what it was when struck.
//
// The rn2(2) for a priest is unconditional on the priest existing, so it fires
// whether or not ghod_hitsu does anything.
//
// hmon_hitmon (the damage itself), ghod_hitsu and angry_guards are recorded.
export async function hmon(mon, obj, thrown, dieroll) {
    const anger_guards = !!(mon.mpeaceful
                            && (mon.ispriest || mon.isshk
                                || is_watch(game.mons[mon.mnum])));

    const result = await hmon_hitmon(mon, obj, thrown, dieroll);        /* hmon_hitmon returns whether mon survives */

    if (mon.ispriest && !rn2(2))
        await ghod_hitsu(mon);
    if (anger_guards)
        await angry_guards(!!Deaf());

    return result;
}

// include/mondata.h:159 is_watch() — an IDENTITY test against two specific
// permonst entries, not a msound test. The first draft of this wrote it as
// `d.msound === MFLAGS.MS_WATCH`, and MS_WATCH does not exist, so it would
// have been silently false for every monster forever.
const is_watch = (d) =>
    d.pmidx === PMNAMES.PM_WATCHMAN || d.pmidx === PMNAMES.PM_WATCH_CAPTAIN;

// src/uhitm.c:1754 hmon_hitmon() — the melee damage path.
//
// 181 lines in C, but almost all of it is a struct init followed by a fixed
// dispatch order into helpers. Both halves are ported here; the helpers
// themselves are recorded and land one at a time.
//
// The struct init is pure assignment and draws nothing, but the field VALUES
// are not defaults to be filled in later -- several encode real conditions
// that the helpers branch on, and getting one wrong misroutes the dispatch
// rather than producing a slightly wrong number:
//
//   twohits        thrown ? 0 : gt.twohits  -- a thrown weapon never twohits
//   unarmed        !uwep && !uarm && !uarms -- a SHIELD makes you not unarmed
//   hand_to_hand   HMON_MELEE, or HMON_APPLIED with a POLEARM. An applied
//                  grapnel is explicitly not hand-to-hand.
//   get_dmg_bonus  starts TRUE and is cleared by helpers, not set by them.
//
// The dispatch order is fixed and each step can short-circuit the rest:
// do_hit (which may set doreturn), then dmg_recalc only if dmg > 0, then
// poison only if ispoisoned, then the dmg < 1 branch, then exactly one of
// jousting / stagger / the two-weapon arm, then the kill handling, then pet,
// splitmon and msg_hit.
export async function hmon_hitmon(mon, obj, thrown, dieroll) {
    let maybe_knockback = false;
    const hmd = {
        dmg: 0,
        thrown: thrown,
        twohits: thrown ? 0 : (game.twohits || 0),
        dieroll: dieroll,
        mdat: game.mons[mon.mnum],
        use_weapon_skill: false,
        train_weapon_skill: false,
        barehand_silver_rings: 0,
        silvermsg: false,
        silverobj: false,
        lightobj: false,
        material: obj ? game.objects[obj.otyp].oc_material : MATERIALS.NO_MATERIAL,
        jousting: 0,
        hittxt: false,
        get_dmg_bonus: true,
        /* src/uhitm.c:1779 — `!uwep && !uarm && !uarms`.
           KNOWN WRONG, deliberately left as-is for now: game.uwep,
           game.uarm and game.uarms do NOT exist (the real accessors are
           game.u.uwep and worn(W_ARM)/worn(W_ARMS)), so this is always
           true and every armed branch below is dead. Correcting it to
              !game.u.uwep && !worn(W_ARM) && !worn(W_ARMS)
           makes hmon_hitmon's knockback arm fire, which matches C's draws
           at uhitm.c:5258/5269 -- and then diverges one draw later at
           known_hitum's rn2(25) because our monster dies where C's lives.
           Net -2 screens (seed0360), so it is reverted until that
           downstream gap is fixed with it. See docs/plan/STATUS.md. */
        unarmed: !game.u.uwep && !worn(W_ARM) && !worn(W_ARMS),
        hand_to_hand: (thrown === HMON_MELEE
                       /* not grapnels; applied implies uwep */
                       || (thrown === HMON_APPLIED && is_pole(game.u.uwep))),
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

    if (hmd.dmg > 0)
        await hmon_hitmon_dmg_recalc(hmd, obj);

    if (hmd.ispoisoned)
        await hmon_hitmon_poison(hmd, mon, obj);

    if (hmd.dmg < 1) {
        const monIsShade = hmd.mdat === game.mons[PMNAMES.PM_SHADE];

        hmd.dmg = hmd.get_dmg_bonus && !monIsShade ? 1 : 0;
        if (monIsShade && !hmd.hittxt
            && thrown !== HMON_THROWN && thrown !== HMON_KICKED)
            hmd.hittxt = await shade_miss(game.youmonst, mon, obj,
                                          false, true);
    }

    if (hmd.jousting) {
        await hmon_hitmon_jousting(hmd, mon, obj);
    } else if (hmd.unarmed && hmd.dmg > 1 && !thrown && !obj
               && !Upolyd(game.u)) {
        await hmon_hitmon_stagger(hmd, mon, obj);
    } else if (!hmd.unarmed && hmd.dmg > 1 && !thrown && !Upolyd(game.u)
               && !game.u.twoweap && game.u.uwep) {
        maybe_knockback = true;
    }

    if (!hmd.already_killed) {
        /* the conduct test that gates first_weapon_hit is NOT just "did you
           hit with a weapon": it also requires the object to be the wielded
           one (or the offhand while two-weaponing), a melee or applied blow
           rather than a throw, no jousting (already logged), real damage, and
           weaphit <= 1 -- the caller has already incremented it, which is why
           the first hit tests as 1 rather than 0. */
        if (obj && (obj === game.u.uwep
                    || (obj === game.u.uswapwep && game.u.twoweap))
            && (obj.oclass === OCLASSES.WEAPON_CLASS
                || is_weptool(obj, game.objects))
            && (thrown === HMON_MELEE || thrown === HMON_APPLIED)
            && !hmd.jousting
            && hmd.dmg > 0 && (game.u.uconduct?.weaphit ?? 0) <= 1)
            first_weapon_hit(obj);
        mon.mhp -= hmd.dmg;
    }
    /* adjustments might have made tmp become less than what a level-draining
       artifact has already done to max HP */
    if (mon.mhp > mon.mhpmax)
        mon.mhp = mon.mhpmax;

    /* src/uhitm.c:1863 — the flag the kill tail below reads. Without it the
       hero's melee kills never reached killed(). */
    if (DEADMONSTER(mon))
        hmd.destroyed = true;

    /* src/uhitm.c hmon_hitmon_pet() — abuse and flight, even if the pet is
       being killed (affects revival) */
    if (mon.mtame && hmd.dmg > 0) {
        await abuse_dog(mon); /* reduces tameness */
        /* flee if still alive and still tame */
        if (mon.mtame && !hmd.destroyed)
            monflee(mon, 10 * rnd(hmd.dmg), false, false);
    }

    /* src/uhitm.c hmon_hitmon_splitmon() — puddings split on iron/metal
       melee hits from the wielded weapon (or either hand when twoweap) */
    if ((hmd.mdat === game.mons[PMNAMES.PM_BLACK_PUDDING]
         || hmd.mdat === game.mons[PMNAMES.PM_BROWN_PUDDING])
        /* pudding is alive and healthy enough to split */
        && mon.mhp > 1 && !mon.mcan && !hmd.offmap
        && obj && (obj === game.u.uwep
                   || (game.u.twoweap && obj === game.u.uswapwep))
        && ((hmd.material === MATERIALS.IRON
             /* allow scalpel and tsurugi to split puddings */
             || hmd.material === MATERIALS.METAL)
            /* but not bashing with darts, arrows or ya */
            && !(is_ammo(obj) || is_missile(obj)))
        && hmd.hand_to_hand) {
        const mclone = clone_mon(mon, 0, 0);

        if (mclone) {
            let withwhat = '';
            if (game.u.twoweap && game.flags.verbose)
                withwhat = ` with ${yname(obj)}`;
            await pline(`${Monnam(mon)} divides as you hit it${withwhat}!`);
            hmd.hittxt = true;
            /* mintrap(mclone, NO_TRAP_FLAGS) */
            await mintrap(mclone, 0);
        }
    }
    await hmon_hitmon_msg_hit(hmd, mon, obj);

    if (hmd.dryit)
        await dry_a_towel(obj, -1, true);

    if (hmd.silvermsg)
        await hmon_hitmon_msg_silver(hmd, mon, obj);
    if (hmd.lightobj)
        await hmon_hitmon_msg_lightobj(hmd, mon, obj);

    if (hmd.unpoisonmsg)
        hmd.saved_oname = cxname(obj);

    /* src/uhitm.c:1897 -- the kill/survive tail.
       poiskilled and destroyed are separate branches, and BOTH check
       already_killed again before calling the kill, because an earlier stage
       may have done it. */
    if (hmd.needpoismsg)
        await pline_The(`poison doesn't seem to affect ${mon_nam(mon)}.`);
    if (hmd.poiskilled) {
        await pline_The('poison was deadly...');
        if (!hmd.already_killed)
            await xkilled(mon, XKILL_NOMSG);
        hmd.destroyed = true;
    } else if (hmd.destroyed) {
        if (!hmd.already_killed)
            await killed(mon);
    } else if (game.u.umconf && hmd.hand_to_hand) {
        await nohandglow(mon);
        if (!mon.mconf
            && !await resist(mon, OCLASSES.SPBOOK_CLASS, 0, false)) {
            mon.mconf = 1;
            if (!mon.mstun && !helpless(mon) && canseemon(mon))
                await pline(`${Monnam(mon)} appears confused.`);
        }
    }
    if (hmd.unpoisonmsg)
        await Your(`${hmd.saved_oname} ${vtense(hmd.saved_oname, 'are')} no longer poisoned.`);

    /* A monster that is still here gets woken and angered. This is the piece
       that makes a swing have consequences beyond damage: wakeup calls
       setmangry, which turns a peaceful monster hostile and costs alignment.
       Both are ported, so this is a real call chain. */
    if (!hmd.destroyed && !hmd.offmap) {
        await wakeup(mon, true);
        /* src/uhitm.c:1926 — a solid weapon hit can hurl the defender. The
           two leading draws inside mhitm_knockback happen unconditionally,
           so skipping the call loses them for every armed hit. */
        if (maybe_knockback) {
            const mhm = { hitflags: M_ATTK_HIT };
            if (await mhitm_knockback(game.youmonst, mon,
                                     game.youmonst.data.mattk[0], mhm, true)
                && (mhm.hitflags & M_ATTK_DEF_DIED))
                hmd.destroyed = true;
        }
    }

    /* src/uhitm.c:1934 — `return hmd.destroyed ? FALSE : TRUE`. This used to
       return hmd.retval, which is initialised false and only set true on the
       hit_no_harm path, so EVERY ordinary hit reported the monster dead and
       known_hitum's whole post-hit block (its rn2(25) flee check among
       others) was unreachable. */
    return hmd.destroyed ? false : true;
}

/* include/obj.h is_pole() — the real predicate lives in js/u_init.js; this
   file used to carry a stub that always returned false after recording. */

// src/uhitm.c:1387 hmon_hitmon_do_hit() — routes the blow by what is in hand.
//
// Pure dispatch, no draw of its own; everything it calls draws. Three things
// in it are load-bearing:
//
// The stone-missile early return is the only path here that ends the blow. It
// applies to THROWN and KICKED but explicitly NOT Applied, and it calls
// wakeup(mon, TRUE) -- so a rock bouncing off a xorn still angers it, and
// still costs alignment through setmangry, even though it does no damage.
//
// saved_oname is captured BEFORE the helpers run because the object may be
// destroyed by them and the name is still needed afterwards. The lamplit
// artifact case takes the bare name so a lit Sunsword does not announce
// itself.
//
// The GEM_CLASS in the weapon test is not a mistake: gems are thrown at
// unicorns and go through the weapon path.
// src/uhitm.c hmon_hitmon_potion(); obj is not NULL
async function hmon_hitmon_potion(hmd, mon, obj) {
    if (obj.quan > 1)
        obj = splitobj(obj, 1);
    else
        setuwep(null);
    freeinv(obj);
    await potionhit(mon, obj,
                    hmd.hand_to_hand ? POTHIT_HERO_BASH : POTHIT_HERO_THROW);
    if (DEADMONSTER(mon)) {
        hmd.doreturn = true;
        hmd.retval = false; /* killed */
        return;
    }
    hmd.hittxt = true;
    /* in case potion effect causes transformation */
    hmd.mdat = mon.data;
    hmd.dmg = (hmd.mdat === game.mons[PMNAMES.PM_SHADE]) ? 0 : 1;
}

async function hmon_hitmon_do_hit(hmd, mon, obj) {
    if (!obj) {                         /* attack with bare hands */
        hmon_hitmon_barehands(hmd, mon);
    } else {
        if ((hmd.thrown === HMON_THROWN || hmd.thrown === HMON_KICKED)
            && stone_missile(obj) && passes_rocks(hmd.mdat)) {
            await hit(mshot_xname(obj), mon, ' but does no harm.');
            await wakeup(mon, true);
            hmd.doreturn = true;
            hmd.retval = true;
            return;
        }
        /* remember obj's name since it might end up being destroyed and
           we'll want to use it after that */
        if (!(artifact_light(obj) && obj.lamplit))
            hmd.saved_oname = cxname(obj);
        else
            hmd.saved_oname = bare_artifactname(obj);

        if (obj.oclass === OCLASSES.WEAPON_CLASS || is_weptool(obj, game.objects)
            || obj.oclass === OCLASSES.GEM_CLASS) {
            await hmon_hitmon_weapon(hmd, mon, obj);
            if (hmd.doreturn)
                return;
        /* attacking with non-weapons */
        } else if (obj.oclass === OCLASSES.POTION_CLASS) {
            await hmon_hitmon_potion(hmd, mon, obj);
            if (hmd.doreturn)
                return;
        } else {
            if (hmd.mdat === game.mons[PMNAMES.PM_SHADE] && !shade_aware(obj)) {
                hmd.dmg = 0;
            } else {
                await hmon_hitmon_misc_obj(hmd, mon, obj);
            }
        }
    }
}

// src/uhitm.c:1280 hmon_hitmon_misc_obj() - non-weapon impact effects.
async function hmon_hitmon_misc_obj(hmd, mon, obj) {
    switch (obj.otyp) {
    case ONAMES.CREAM_PIE:
    case ONAMES.BLINDING_VENOM: {
        mon.msleeping = 0;
        const can_blind = haseyes(hmd.mdat)
                          && !(!mon.mcansee && !(mon.mblinded || 0));

        if (can_blind) {
            if (game.u.ublind) {
                await pline(obj.otyp === ONAMES.CREAM_PIE ? 'Splat!'
                                                          : 'Splash!');
            } else if (obj.otyp === ONAMES.BLINDING_VENOM) {
                await pline(`The venom blinds ${mon_nam(mon)}${
                    mon.mcansee ? '' : ' further'}!`);
            } else {
                let whom = mon_nam(mon);
                const what = The(xname(obj));

                if (haseyes(hmd.mdat)
                    && hmd.mdat !== game.mons[PMNAMES.PM_FLOATING_EYE])
                    whom = `${s_suffix(whom)} ${mbodypart(mon, FACE)}`;
                await pline(`${what} ${vtense(what, 'splash')} over ${whom}!`);
            }
            await setmangry(mon, true);
            mon.mcansee = 0;
            const duration = rn1(25, 21);
            mon.mblinded = Math.min(127, (mon.mblinded || 0) + duration);
        } else {
            await pline(obj.otyp === ONAMES.CREAM_PIE ? 'Splat!' : 'Splash!');
            await setmangry(mon, true);
        }

        if (hmd.thrown) {
            if (obj === game.thrownobj)
                game.thrownobj = null;
        } else {
            useup(obj);
        }
        hmd.hittxt = true;
        hmd.get_dmg_bonus = false;
        hmd.dmg = 0;
        break;
    }
    default: {
        const material = game.objects[obj.otyp].oc_material;

        if ((material === MATERIALS.VEGGY || material === MATERIALS.PAPER)
            && obj.oclass !== OCLASSES.SPBOOK_CLASS) {
            hmd.dmg = 0;
            hmd.get_dmg_bonus = false;
            break;
        }

        hmd.dmg = Math.ceil(obj.owt / 100);
        hmd.dmg = hmd.dmg <= 1 ? 1 : rnd(hmd.dmg);
        hmd.dmg = Math.min(hmd.dmg, 6);

        if (is_wet_towel(obj)) {
            const doubled = hmd.mdat === game.mons[PMNAMES.PM_IRON_GOLEM];

            hmd.dmg += obj.spe * (doubled ? 2 : 1);
            hmd.dmg = rnd(hmd.dmg);
            hmd.dryit = rn2(obj.spe + 1) > 0;
        }
        if (hmd.material === MATERIALS.SILVER && mon_hates_silver(mon)) {
            hmd.dmg += rnd(20);
            hmd.silvermsg = hmd.silverobj = true;
        }
        if (obj.blessed && mon_hates_blessings(mon))
            hmd.dmg += rnd(4);
        break;
    }
    }
}

const is_wet_towel = (obj) => obj.otyp === ONAMES.TOWEL && obj.spe > 0;

// src/weapon.c:1067 dry_a_towel(), restricted to the hero-attack path here.
async function dry_a_towel(obj, amount, verbose) {
    const newspe = amount < 0 ? obj.spe + amount : amount;

    if (newspe < obj.spe && verbose && carried(obj))
        await pline(`${Yobjnam2(obj, null)} dries${newspe ? '' : ' out'}.`);
    if (newspe !== obj.spe) {
        obj.spe = Math.max(0, Math.min(newspe, 7));
        if (obj === game.u.uwep)
            game.unweapon = !is_wet_towel(obj);
    }
}

// include/mondata.h:208 passes_rocks() — a header macro with no JS home yet.
// Both halves exist: passes_walls is in this file, unsolid in js/mondata.js.
export const passes_rocks = (ptr) => passes_walls(ptr) && !unsolid(ptr);

// src/uhitm.c:1978 shade_aware(), objects which can affect a shade or whose
// shade interaction is handled by another routine.
const shade_aware = (obj) => !!obj && (
    obj.otyp === ONAMES.BOULDER
    || obj.otyp === ONAMES.HEAVY_IRON_BALL
    || obj.otyp === ONAMES.IRON_CHAIN
    || obj.otyp === ONAMES.MIRROR
    || obj.otyp === ONAMES.CLOVE_OF_GARLIC
    || game.objects[obj.otyp].oc_material === MATERIALS.SILVER
);

// src/uhitm.c:2000 shade_miss(), report an attack that cannot touch a shade.
export async function shade_miss(magr, mdef, obj, thrown, verbose) {
    const youagr = magr === game.youmonst;
    const youdef = mdef === game.youmonst;

    if (mdef.data !== game.mons[PMNAMES.PM_SHADE]
        || (obj && dmgval(obj, mdef)))
        return false;

    if (verbose
        && (youdef || cansee(mdef.mx, mdef.my) || sensemon(mdef)
            || (youagr && distu(mdef.mx, mdef.my) <= 2))) {
        const what = !obj || shade_aware(obj) ? 'attack' : cxname(obj);
        const target = youdef ? 'you' : mon_nam(mdef);

        if (!thrown) {
            const whose = youagr ? 'Your' : s_suffix(Monnam(magr));
            await pline(`${whose} ${what} ${vtense(what, 'pass')} harmlessly through ${target}.`);
        } else {
            await pline(`${The(what)} ${vtense(what, 'pass')} harmlessly through ${target}.`);
        }
        if (!youdef && !canspotmon(mdef))
            map_invisible(mdef.mx, mdef.my);
    }
    if (!youdef)
        mdef.msleeping = 0;
    return true;
}

// src/uhitm.c:1702 hmon_hitmon_msg_lightobj()
async function hmon_hitmon_msg_lightobj(hmd, mon, obj) {
    let fmt;
    let whom = mon_nam(mon);

    if (canspotmon(mon)) {
        if (hmd.saved_oname) {
            fmt = `${s_suffix(hmd.saved_oname)} radiance penetrates deep into %s!`;
        } else
            fmt = 'The light sears %s!';
    } else {
        whom = upstart(whom); /* "it" -> "It" */
        fmt = '%s is seared!';
    }
    /* note: s_suffix returns a modifiable buffer */
    if (!noncorporeal(hmd.mdat) && !amorphous(hmd.mdat))
        whom = s_suffix(whom) + ' flesh';
    await pline(fmt.replace('%s', whom));
}

// src/uhitm.c:1663 hmon_hitmon_msg_silver() — "Your silver X sears ...".
async function hmon_hitmon_msg_silver(hmd, mon, obj) {
    let fmt_head;
    let whom = mon_nam(mon);

    if (canspotmon(mon)) {
        if (hmd.barehand_silver_rings === 1)
            fmt_head = 'Your silver ring sears ';
        else if (hmd.barehand_silver_rings === 2)
            fmt_head = 'Your silver rings sear ';
        else if (hmd.silverobj && hmd.saved_oname) {
            fmt_head = `Your ${hmd.saved_oname.includes('silver') ? ''
                              : 'silver '}${hmd.saved_oname} `
                       + `${vtense(hmd.saved_oname, 'sear')} `;
        } else
            fmt_head = 'The silver sears ';
    } else {
        whom = whom[0].toUpperCase() + whom.slice(1); /* "it" -> "It" */
        fmt_head = null; /* "%s is seared!" */
    }
    if (!noncorporeal(hmd.mdat) && !amorphous(hmd.mdat))
        whom = s_suffix(whom) + ' flesh';
    if (fmt_head === null)
        await pline(`${whom} is seared!`);
    else
        await pline(`${fmt_head}${whom}!`);
}

// src/uhitm.c:1541 hmon_hitmon_jousting(). A successful mounted lance
// attack adds its joust dice before announcing the hit. A broken lance is
// removed before the target is displaced, and a trap can kill that target
// before the pending weapon damage is applied by the caller.
async function hmon_hitmon_jousting(hmd, mon, obj) {
    hmd.dmg += d(2, obj === game.u.uwep ? 10 : 2);
    await You(`joust ${mon_nam(mon)}${
        canseemon(mon) ? exclam(hmd.dmg) : '.'}`);

    if ((game.u.uconduct?.weaphit ?? 0) <= 1)
        first_weapon_hit(obj);

    if (hmd.jousting < 0) {
        set_twoweap(false);
        if (obj === game.u.uwep)
            await uwepgone();
        await pline(`${Yname2(obj)} shatters on impact!`);
        useup(obj);
    }
    if (await mhurtle_to_doom(mon, hmd.dmg, hmd))
        hmd.already_killed = true;
    hmd.hittxt = true;
}

// src/uhitm.c:1942 mhurtle_to_doom(). Only displace a monster which will
// survive the pending physical damage. The displacement itself can trigger a
// trap, including one which changes the monster's form or kills it outright.
async function mhurtle_to_doom(mon, pendingDamage, hmd) {
    if (pendingDamage < mon.mhp) {
        await mhurtle(mon, game.u.dx, game.u.dy, 1);
        hmd.mdat = mon.data || game.mons[mon.mnum];
        return DEADMONSTER(mon);
    }
    return false;
}

// src/uhitm.c:1570 hmon_hitmon_stagger() — a very small chance of stunning an
// unarmed opponent. The rnd(100) is spent BEFORE the size and hide tests, so
// it costs a draw on every qualifying bare-handed hit whatever the target is.
async function hmon_hitmon_stagger(hmd, mon, obj) {
    const sk = game.u.weapon_skills;
    const P_SKILL = (t) => sk[t].skill;

    if (rnd(100) < P_SKILL(P_BARE_HANDED_COMBAT) && !bigmonst(hmd.mdat)
        && !thick_skinned(hmd.mdat)) {
        if (canspotmon(mon))
            await pline(`${Monnam(mon)} ${makeplural(stagger(mon.data, 'stagger'))} from your powerful strike!`);
        if (await mhurtle_to_doom(mon, hmd.dmg, hmd))
            hmd.already_killed = true;
        hmd.hittxt = true;
    }
}

// src/uhitm.c:838 hmon_hitmon_barehands() — the bare-handed damage roll.
//
// The rnd() sits in the ELSE of the shade test, so punching a shade draws
// NOTHING. That is the whole shape of the function: a shade is immune to
// bare hands, and C does not roll damage it would discard.
//
// train_weapon_skill is set from the ROLL, not from a constant: you only
// train bare-handed combat when the d2/d4 came up above 1. A port that set
// it TRUE unconditionally would train skill on every punch.
//
// The glove/ring mask is a priority, not a sum. Gloves shadow rings
// entirely -- rings are worn UNDER gloves -- and two silver rings never
// stack. Which ring counts depends on twohits: 0 checks both (C calls this
// backwards compatibility for playability), 1 the right, 2 the left, and a
// polymorphed hero's third or later hit gets neither.
//
function hmon_hitmon_barehands(hmd, mon) {
    const silverhitOut = { value: 0 };  /* worn masks */

    if (hmd.mdat === game.mons[PMNAMES.PM_SHADE]) {
        hmd.dmg = 0;                    /* NO DRAW on this path */
    } else {
        /* note: 1..2 or 1..4 can be substantially increased by
           strength bonus or skill bonus, usually both... */
        hmd.dmg = rnd(!martial_bonus() ? 2 : 4);
        hmd.use_weapon_skill = true;
        hmd.train_weapon_skill = (hmd.dmg > 1);
    }

    /* gloves shadow rings; two silver rings do not stack */
    const spcdmgflg = game.u.uarmg ? W_ARMG
                    : (((hmd.twohits === 0 || hmd.twohits === 1) ? W_RINGR : 0)
                       | ((hmd.twohits === 0 || hmd.twohits === 2) ? W_RINGL : 0));
    hmd.dmg += special_dmgval(game.youmonst, mon, spcdmgflg, silverhitOut);
    const silverhit = silverhitOut.value;

    switch (hmd.twohits) {
    case 0:     /* one hit attempted; either hand's silver ring applies, and
                 * wearing two is the same as wearing one */
        hmd.barehand_silver_rings = (silverhit & (W_RINGR | W_RINGL)) ? 1 : 0;
        break;
    case 1:     /* first of two or more; right ring applies */
        hmd.barehand_silver_rings = (silverhit & W_RINGR) ? 1 : 0;
        break;
    case 2:     /* second of two or more; left ring applies */
        hmd.barehand_silver_rings = (silverhit & W_RINGL) ? 1 : 0;
        break;
    default:    /* third or later hit of a polymorphed hero; the rings were
                 * already applied on the first and second */
        hmd.barehand_silver_rings = 0;
        break;
    }
    if (hmd.barehand_silver_rings > 0)
        hmd.silvermsg = true;
}

// src/uhitm.c:1070 hmon_hitmon_weapon() — melee blow, or wrong-tool blow?
//
// Pure routing, no draw. The four OR'd clauses are the ways to hit something
// with a weapon that is not being used as one:
//
//   is_launcher                 swinging a bow like a club
//   !thrown && missile/ammo     jabbing with an arrow held in hand
//   !thrown && !usteed && pole  a polearm at arm's length, on foot. Mounted
//                               is fine, and ART_SNICKERSNEE is exempt.
//   ammo without its launcher   thrown, but not from the matching bow
//
// The polearm clause needs BOTH !u.usteed and the artifact test; dropping
// either turns a legitimate mounted lance charge into a fumble.
//
// is_launcher, is_missile, is_ammo, is_art and ammo_and_launcher are live,
// so the four routing cases above follow the C decision directly.
async function hmon_hitmon_weapon(hmd, mon, obj) {
    /* is it not a melee weapon? */
    if (/* if you strike with a bow... */
        is_launcher_w(obj)
        /* or strike with a missile in your hand... */
        || (!hmd.thrown && (is_missile(obj) || is_ammo(obj)))
        /* or use a pole at short range and not mounted... */
        || (!hmd.thrown && !game.u.usteed && is_pole(obj)
            && obj.oartifact !== ART_SNICKERSNEE)
        /* or throw a missile without the proper bow... */
        || (is_ammo(obj) && (hmd.thrown !== HMON_THROWN
                             || !ammo_and_launcher(obj, game.u.uwep)))) {
        await hmon_hitmon_weapon_ranged(hmd, mon, obj);
    } else {
        await hmon_hitmon_weapon_melee(hmd, mon, obj);
        if (hmd.doreturn)
            return;
    }
}

// src/uhitm.c:891 hmon_hitmon_weapon_ranged() — 1-2 points, no skill use.
async function hmon_hitmon_weapon_ranged(hmd, mon, obj) {
    /* shade_glare() (silver/blessed passes) is recorded; a shade takes 0 */
    if (hmd.mdat === game.mons[PMNAMES.PM_SHADE]
        && !shade_aware(obj))
        hmd.dmg = 0;
    else
        hmd.dmg = rnd(2);
    if (hmd.material === MATERIALS.SILVER && mon_hates_silver(mon)) {
        hmd.silvermsg = hmd.silverobj = true;
        /* if it will already inflict dmg, make it worse */
        hmd.dmg += rnd(hmd.dmg ? 20 : 10);
    }
    if (!hmd.thrown && obj === game.u.uwep
        && obj.otyp === ONAMES.BOOMERANG && rnl(4) === 4 - 1) {
        const more_than_1 = (obj.quan > 1);

        await pline(`As you hit ${mon_nam(mon)}, `
                    + `${more_than_1 ? 'one of ' : ''}${yname(obj)}`
                    + ` breaks into splinters.`);
        if (!more_than_1)
            await uwepgone(); /* set gu.unweapon */
        useup(obj);
        hmd.hittxt = true;
        if (hmd.mdat !== game.mons[PMNAMES.PM_SHADE])
            hmd.dmg++;
    }
}

/* include/obj.h:235 is_launcher() — same one-liner js/wield.js keeps. */
const is_launcher_w = (o) =>
    o.oclass === OCLASSES.WEAPON_CLASS
    && game.objects[o.otyp].oc_skill >= SKILLS.P_BOW
    && game.objects[o.otyp].oc_skill <= SKILLS.P_CROSSBOW;

// src/uhitm.c:934 hmon_hitmon_weapon_melee() — "normal" weapon usage.
//
// The base damage comes from dmgval (src/weapon.c), and train_weapon_skill is
// set from the result: a minimal hit does not exercise proficiency, the same
// rule as the bare-handed path. The common tail applies launcher-specific
// role and race damage, then marks temporary or permanent poison for the
// ordered poison stage in hmon_hitmon().
//
// The Healer knife bonus is not a draw but it is not a constant either --
// it scales with how many of THIS species you have already killed,
// min(3, mvitals[monsndx].died / 6), so it needs the mvitals table.
//
// The special-attack chain below the head is a single if/else if ladder, so
// AT MOST ONE of backstab, weapon-shatter and the rest can fire. Its first
// arm is a guard that disables all of them: no skill training, or the
// monster is holding you, or you are two-weaponing, or the weapon is
// Cleaver. Porting the arms as independent ifs would let several fire at
// once and would draw where C draws nothing.
function backstabbable(mon) {
    const ptr = game.mons[mon.mnum];
    return !amorphous(ptr) && !is_whirly(ptr) && !noncorporeal(ptr)
           && ptr.mlet !== MONSYMS.S_BLOB
           && ptr.mlet !== MONSYMS.S_EYE
           && ptr.mlet !== MONSYMS.S_FUNGUS
           && canseemon(mon)
           && (mon.mflee || helpless(mon));
}

async function hmon_hitmon_weapon_melee(hmd, mon, obj) {
    let wtype, monwep;

    /* "normal" weapon usage */
    hmd.use_weapon_skill = true;
    hmd.dmg = dmgval(obj, mon);
    /* a minimal hit doesn't exercise proficiency */
    hmd.train_weapon_skill = (hmd.dmg > 1);

    /* Healer with anatomy knowledge */
    if (Role_if(PMNAMES.PM_HEALER) && hmd.hand_to_hand
        && obj.oclass === OCLASSES.WEAPON_CLASS
        && game.objects[obj.otyp].oc_skill === P_KNIFE) {
        const kills = game.mvitals?.[mon.mnum]?.died ?? 0;
        hmd.dmg += Math.min(3, Math.floor(kills / 6));
    }

    /* special attack actions -- an if/else ladder: at most one fires */
    if (!hmd.train_weapon_skill || mon === game.u.ustuck || game.u.twoweap
        || (hmd.hand_to_hand && obj.oartifact === ART_CLEAVER)) {
        ;   /* no special bonuses */
    } else if (Role_if(PMNAMES.PM_ROGUE) && backstabbable(mon)
               && !Upolyd(game.u) && hmd.hand_to_hand) {
        await You(`strike ${mon_nam(mon)} from behind!`);
        hmd.dmg += rnd(game.u.ulevel);
        hmd.hittxt = true;
    } else if (hmd.dieroll === 2 && obj === game.u.uwep
               && obj.oclass === OCLASSES.WEAPON_CLASS
               && (bimanual(obj)
                   || (Role_if(PMNAMES.PM_SAMURAI)
                       && obj.otyp === ONAMES.KATANA && !worn(W_ARMS)))
               && ((wtype = uwep_skill_type()) !== P_NONE
                   && P_SKILL(wtype) >= P_SKILLED)
               && ((monwep = MON_WEP(mon)) != null
                   && !is_flimsy(monwep)
                   && !obj_resists(monwep,
                                   50 + 15 * (greatest_erosion(obj)
                                              - greatest_erosion(monwep)),
                                   100))) {
        await setmnotwielded(mon, monwep);
        mon.weapon_check = NEED_WEAPON;

        const owner = s_suffix(Monnam(mon));
        const shatter = canseemon(mon)
            ? `${owner} ${aobjnam(monwep, 'shatter')}`
            : `${owner} weapon${monwep.quan === 1 ? '' : 's'} ${
                otense(monwep, 'shatter')}`;
        await pline(`${shatter} from the force of your blow!`);
        obj_extract_self(monwep);
        if (rn2(4)) {
            const fleetime = d(2, 3);
            if (!mon.mflee && canseemon(mon)
                && M_AP_TYPE(mon) !== M_AP_FURNITURE
                && M_AP_TYPE(mon) !== M_AP_OBJECT) {
                if (!mon.mcanmove || !hmd.mdat.mmove) {
                    const name = Monnam(mon);
                    const immobile = name.startsWith('The ')
                        ? `The immobile ${name.slice(4)}`
                        : `Immobile ${name}`;
                    await pline(`${immobile} seems to flinch.`);
                } else {
                    await pline(`${Monnam(mon)} turns to flee.`);
                }
            }
            monflee(mon, fleetime, true, false);
        }
        hmd.hittxt = true;
    }

    let arti = false;
    if (obj.oartifact) {
        const dmgbox = { v: hmd.dmg };
        arti = await artifact_hit(game.youmonst, mon, obj, dmgbox, hmd.dieroll);
        hmd.dmg = dmgbox.v;
    }
    if (arti) {
        if (DEADMONSTER(mon)) {
            hmd.doreturn = true;
            hmd.retval = false;
            return;
        }
        if (hmd.dmg === 0) {
            hmd.doreturn = true;
            hmd.retval = true;
            return;
        }
        hmd.hittxt = true;
    }

    /* src/uhitm.c:1035 — silver weapon against a silver-hater flags the
       sear message; the extra damage itself came from dmgval's rnd(20) */
    if (hmd.material === MATERIALS.SILVER && mon_hates_silver(mon))
        hmd.silvermsg = hmd.silverobj = true;
    if (artifact_light(obj) && obj.lamplit
        && mon_hates_light(mon))
        hmd.lightobj = true;

    if (game.u.usteed && !hmd.thrown && hmd.dmg > 0
        && weapon_type(obj) === P_LANCE && mon !== game.u.ustuck) {
        hmd.jousting = joust(mon, obj);
        if (hmd.jousting)
            hmd.train_weapon_skill = true;
    }

    if (hmd.thrown === HMON_THROWN && (is_ammo(obj) || is_missile(obj))) {
        if (ammo_and_launcher(obj, game.u.uwep)) {
            if (Role_if(PMNAMES.PM_SAMURAI) && obj.otyp === ONAMES.YA
                && game.u.uwep?.otyp === ONAMES.YUMI)
                hmd.dmg++;
            else if (Race_if(PMNAMES.PM_ELF) && obj.otyp === ONAMES.ELVEN_ARROW
                     && game.u.uwep?.otyp === ONAMES.ELVEN_BOW)
                hmd.dmg++;
            hmd.train_weapon_skill = hmd.dmg > 0;
        }
        if (obj.opoisoned && is_poisonable(obj))
            hmd.ispoisoned = true;
    }
    if (permapoisoned(obj) && hmd.dieroll <= 5)
        hmd.ispoisoned = true;
}

// src/uhitm.c:2098 joust(). Return 1 for a normal joust, -1 when the lance
// shatters, and 0 when the hit remains an ordinary mounted lance attack.
function joust(mon, obj) {
    if (Fumbling()
        || game.u.intrinsic?.HStun || game.u.uprops?.STUNNED)
        return 0;
    if (obj !== game.u.uwep
        && (obj !== game.u.uswapwep || !game.u.twoweap))
        return 0;
    if (game.u.utrap)
        return 0;

    let skillRating = P_SKILL(weapon_type(obj));
    if (game.u.twoweap
        && P_SKILL(P_TWO_WEAPON_COMBAT) < skillRating)
        skillRating = P_SKILL(P_TWO_WEAPON_COMBAT);
    if (skillRating === P_ISRESTRICTED)
        skillRating = P_UNSKILLED;

    const joustDieroll = rn2(5);
    if (joustDieroll < skillRating) {
        if (joustDieroll === 0 && rnl(50) === 49
            && !unsolid(mon.data || game.mons[mon.mnum])
            && !obj_resists(obj, 0, 100))
            return -1;
        return 1;
    }
    return 0;
}


// src/uhitm.c:1436 hmon_hitmon_dmg_recalc() — damage, strength and skill
// bonuses applied on top of the base roll.
//
// No draw of its own; dbon() and weapon_dam_bonus() are table lookups.
// What matters here is the arithmetic, and the two scaling cases round
// DIFFERENTLY:
//
//   dual attack        (3 * abs + 2) / 4    3/4 of the strength bonus
//   two-handed melee   (3 * abs + 1) / 2    3/2 of the strength bonus
//
// The +2 and the +1 are not interchangeable rounding fudge -- they are what
// make two hits at 3/4 each total more than one regular hit, while a
// two-handed blow approximately matches a double hit. Both use sgn() so a
// NEGATIVE strength bonus stays negative through the scaling; taking abs()
// and dropping the sign would turn a penalty into a bonus.
//
// The strength bonus is skipped entirely for ammo fired from its matching
// launcher: that gets the ring-of-increase-damage bonus but no strength.
//
// dbon, weapon_dam_bonus, ammo_and_launcher, PROJECTILE, weapon_type,
// uwep_skill_type and use_skill are recorded.
async function hmon_hitmon_dmg_recalc(hmd, obj) {
    let dmgbonus = 0, strbonus, absbonus;

    if (hmd.get_dmg_bonus) {
        /* for dual attacks, udaminc applies to both, and two-handed
           weapons use it as-is */
        dmgbonus = game.u.udaminc || 0;
        if (hmd.thrown !== HMON_THROWN
            || !obj || !game.u.uwep
            || !ammo_and_launcher(obj, game.u.uwep)) {
            strbonus = dbon();
            absbonus = Math.abs(strbonus);
            if (hmd.twohits)
                strbonus = (((3 * absbonus + 2) / 4) | 0) * sgn(strbonus);
            else if (hmd.thrown === HMON_MELEE && game.u.uwep
                     && bimanual(game.u.uwep))
                strbonus = (((3 * absbonus + 1) / 2) | 0) * sgn(strbonus);
            dmgbonus += strbonus;
        }
    }

    if (hmd.use_weapon_skill) {
        let skillwep = obj;

        /* PROJECTILE() null-guards in C: bare-handed hits pass obj null */
        if (obj && (is_ammo(obj) || is_missile(obj))
            && ammo_and_launcher(obj, game.u.uwep))
            skillwep = game.u.uwep;
        dmgbonus += weapon_dam_bonus(skillwep);

        /* hit for more than minimal damage (before being adjusted for
           damage or skill bonus) trains the skill toward future
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

// src/uhitm.c:1510 hmon_hitmon_poison().
async function hmon_hitmon_poison(hmd, mon, obj) {
    let nopoison = 10 - Math.trunc(obj.owt / 10);

    if (nopoison < 2)
        nopoison = 2;
    if (Role_if(PMNAMES.PM_SAMURAI)) {
        await You('dishonorably use a poisoned weapon!');
        adjalign(-sgn(game.u.ualign.type));
    } else if (game.u.ualign.type === A_LAWFUL
               && game.u.ualign.record > -10) {
        await You_feel('like an evil coward for using a poisoned weapon.');
        adjalign(-1);
    }
    if (!permapoisoned(obj) && !rn2(nopoison)) {
        obj.opoisoned = false;
        hmd.unpoisonmsg = true;
    }
    if (resists_poison(mon))
        hmd.needpoismsg = true;
    else if (rn2(10))
        hmd.dmg += rnd(6);
    else
        hmd.poiskilled = true;
}

// src/weapon.c:993 dbon() — the Strength damage bonus. A weak hero takes a
// PENALTY, which is why stubbing this at 0 made light hits kill monsters C
// leaves alive.
export function dbon() {
    const str = ACURR(A_STR);

    if (Upolyd(game.u))
        return 0;

    if (str < 6)
        return -1;
    else if (str < 16)
        return 0;
    else if (str < 18)
        return 1;
    else if (str === 18)
        return 2;                       /* up to 18 */
    else if (str <= STR18(75))
        return 3;                       /* up to 18/75 */
    else if (str <= STR18(90))
        return 4;                       /* up to 18/90 */
    else if (str < STR18(100))
        return 5;                       /* up to 18/99 */
    else
        return 6;
}

// src/uhitm.c:1637 hmon_hitmon_msg_hit() — the "You hit it!" line.
//
// SCREEN-VISIBLE, so unlike the rest of this chain the scoreboard can see it
// once do_attack is wired.
//
// The verb is chosen by what is in your hand, in a fixed priority: a shield
// or a heavy iron ball BASHES, a whip or wet towel LASHES, a Barbarian
// SMITES, and everything else HITS. The Barbarian arm is only reached when
// the object tests fail, so a Barbarian swinging a whip lashes.
//
// The punctuation is exclam(dmg), which reports the damage band: "." for 4
// or less, "!" above. It is only used when you can SEE the monster;
// otherwise the line ends in a plain period regardless of how hard you hit.
//
// The guard is subtle: the message is suppressed when hittxt is already set
// (a special attack printed its own line) OR when the object was destroyed --
// except for a multishot volley still in flight, which keeps announcing.
//
// mon_nam, mshot_xname, is_shield and is_wet_towel are recorded; the whip
// and heavy-iron-ball tests are real.
async function hmon_hitmon_msg_hit(hmd, mon, obj) {
    if (!hmd.hittxt
        && (!hmd.destroyed
            || (hmd.thrown && (game.m_shot?.n ?? 0) > 1
                && game.m_shot?.o === obj?.otyp))) {
        if (hmd.thrown) {
            await hit(mshot_xname(obj), mon, exclam(hmd.dmg));
        } else if (!game.flags?.verbose) {
            await You('hit it.');
        } else {    /* hand_to_hand */
            const verb =
                (obj && (is_shield(obj)
                         || obj.otyp === ONAMES.HEAVY_IRON_BALL)) ? 'bash'
                : (obj && (game.objects[obj.otyp].oc_skill === P_WHIP
                           || is_wet_towel(obj))) ? 'lash'
                  : Role_if(PMNAMES.PM_BARBARIAN) ? 'smite'
                    : 'hit';
            await You(`${verb} ${mon_nam(mon)}`
                      + (canseemon(mon) ? exclam(hmd.dmg) : '.'));
        }
    }
}

// src/uhitm.c:6315 nohandglow() — one charge of confuse-monster is spent.
//
// The messages need makeplural/body_part/hcolor and are recorded, but the
// DECREMENT is behaviour a later turn depends on, so it is real: without it
// a single confuse-monster casting would confuse every monster you touch
// forever.
//
// The early return is doing two jobs. No charges left is obvious; the second,
// mon->mconf, means touching an ALREADY-confused monster spends nothing --
// so the charge is consumed per monster newly confused, not per touch.
//
// u.umconf == 1 is the last charge and gets a different message from the
// others ("stop glowing" versus "no longer glow so brightly"), which is why
// the decrement happens AFTER the message rather than before.
export async function nohandglow(mon) {
    if (!game.u.umconf || mon.mconf)
        return;

    const hands = makeplural(body_part(HAND));
    const altfeedback = Blind() || Invisible();

    if (game.u.umconf === 1) {
        if (altfeedback)
            await Your(`${hands} stop tingling.`);
        else
            await Your(`${hands} stop glowing ${hcolor(NH_RED)}.`);
    } else if (altfeedback) {
        await pline_The(`tingling in your ${hands} lessens.`);
    } else {
        await Your(`${hands} no longer glow so brightly ${hcolor(NH_RED)}.`);
    }
    game.u.umconf--;
}

// src/uhitm.c:3981 mhitm_ad_phys() — the AD_PHYS arm of mhitm_adtyping.
//
// The mhitu (monster hits hero) and mhitm (monster vs monster) branches are
// live; the uhitm branch is only reached by a polymorphed hero using hmonas()
// and is recorded. Within the mhitu branch, the corpse-petrification, silver,
// pudding-clone and poison arms need absent subsystems and are recorded at
// their C decision points.
// src/uhitm.c:75 mhitm_mgc_atk_negated() — magical cancellation.
//
// It DRAWS: rn2(10) against three times the defender's magic negation, and
// the draw happens whatever that value is. An attacker that has itself been
// cancelled returns early WITHOUT drawing.
export async function mhitm_mgc_atk_negated(magr, mdef, verbosely) {
    /* mcan doesn't apply to youmonst; the hero can't be cancelled */
    if (magr !== game.youmonst && magr.mcan)
        return true;                    /* no message; attacker cancelled */

    const armpro = magic_negation(mdef === game.youmonst ? null : mdef);
    const negated = !(rn2(10) >= 3 * armpro);
    if (negated) {
        if (verbosely) {
            if (mdef === game.youmonst)
                await You('avoid harm.');
            else if (canseemon(mdef))
                await pline(`${Monnam(mdef)} avoids harm.`);
        }
        return true;
    }
    return false;
}

// src/mondata.c:1411 on_fire(), the wording for a fire attack's target.
function on_fire(ptr, mattk) {
    switch (ptr.pmidx) {
    case PMNAMES.PM_FLAMING_SPHERE:
    case PMNAMES.PM_FIRE_VORTEX:
    case PMNAMES.PM_FIRE_ELEMENTAL:
    case PMNAMES.PM_SALAMANDER:
        return 'already on fire';
    case PMNAMES.PM_WATER_ELEMENTAL:
    case PMNAMES.PM_FOG_CLOUD:
    case PMNAMES.PM_STEAM_VORTEX:
        return 'boiling';
    case PMNAMES.PM_ICE_VORTEX:
    case PMNAMES.PM_GLASS_GOLEM:
        return 'melting';
    case PMNAMES.PM_STONE_GOLEM:
    case PMNAMES.PM_CLAY_GOLEM:
    case PMNAMES.PM_GOLD_GOLEM:
    case PMNAMES.PM_AIR_ELEMENTAL:
    case PMNAMES.PM_EARTH_ELEMENTAL:
    case PMNAMES.PM_DUST_VORTEX:
    case PMNAMES.PM_ENERGY_VORTEX:
        return 'heating up';
    default:
        return mattk[0] === ATTKS.AT_HUGS ? 'being roasted' : 'on fire';
    }
}

// src/mon.c:5680 golemeffects(), elemental healing and slowing for flesh
// and iron golems.
export async function golemeffects(mon, adtyp, damage) {
    let heal = 0, slow = false;

    if (mon.mnum === PMNAMES.PM_FLESH_GOLEM) {
        if (adtyp === ATTKS.AD_ELEC)
            heal = Math.trunc((damage + 5) / 6);
        else if (adtyp === ATTKS.AD_FIRE || adtyp === ATTKS.AD_COLD)
            slow = true;
    } else if (mon.mnum === PMNAMES.PM_IRON_GOLEM) {
        if (adtyp === ATTKS.AD_ELEC)
            slow = true;
        else if (adtyp === ATTKS.AD_FIRE)
            heal = damage;
    } else {
        return;
    }

    if (slow && (mon.mspeed | 0) !== MSLOW) {
        const oldspeed = mon.mspeed | 0;
        mon.permspeed = (mon.permspeed | 0) === MFAST ? 0 : MSLOW;
        const boots = which_armor(mon, W_ARMF);
        mon.mspeed = boots?.otyp === ONAMES.SPEED_BOOTS
            ? MFAST : mon.permspeed;
        if (mon.mspeed !== oldspeed && game.mons[mon.mnum].mmove
            && !mon.mfrozen && !mon.msleeping && canseemon(mon)) {
            const howmuch = mon.mspeed + oldspeed === MFAST + MSLOW
                ? 'much ' : '';
            await pline(`${Monnam(mon)} seems to be moving ${howmuch}slower.`);
        }
    }
    if (heal && healmon(mon, heal, 0) && cansee(mon.mx, mon.my))
        await pline(`${Monnam(mon)} seems healthier.`);
}

/* include/hack.h:1236 Maybe_Half_Phys() */
const Maybe_Half_Phys = (dmg) =>
    (game.u.intrinsic?.HHalf_physical_damage || game.u.uprops?.HALF_PHDAM)
        ? Math.trunc((dmg + 1) / 2) : dmg;

// src/uhitm.c:3524 mhitm_ad_slim()
export async function mhitm_ad_slim(magr, mattk, mdef, mhm) {
    const negated = await mhitm_mgc_atk_negated(magr, mdef, false);
    let pd = mdef.data;
    if (magr === game.youmonst) {
        if (negated)
            return;
        if (!rn2(4) && !slimeproof(pd)) {
            if (!(await munslime(mdef, true)) && !DEADMONSTER(mdef)) {
                await You(`turn ${mon_nam(mdef)} into slime.`);
                if (await newcham(mdef, game.mons[PMNAMES.PM_GREEN_SLIME], NO_NC_FLAGS))
                    pd = mdef.data;
            }
            if (DEADMONSTER(mdef)) {
                mhm.hitflags = M_ATTK_DEF_DIED;
                mhm.done = true;
                return;
            }
            mhm.damage = 0;
        }
    } else if (mdef === game.youmonst) {
        await hitmsg(magr, mattk);
        if (negated) {
            if (!magr.mcan)
                await You('escape harm.');
            return;
        }
        if (flaming(pd)) {
            await pline_The('slime burns away!');
            mhm.damage = 0;
        } else if (Unchanging() || noncorporeal(pd)
                   || monsndx(pd) === PMNAMES.PM_GREEN_SLIME) {
            await You('are unaffected.');
            mhm.damage = 0;
        } else if (!game.u.uprops?.SLIMED) {
            await You("don't feel very well.");
            await make_slimed(10, null);
            delayed_killer(SLIMED, KILLED_BY_AN, pmname(magr.data, Mgender(magr)));
        } else {
            await pline('Yuck!');
        }
    } else {
        if (negated)
            return;
        if (!rn2(4) && !slimeproof(pd)) {
            if (!(await munslime(mdef, false)) && !DEADMONSTER(mdef)) {
                let ncflags = NO_NC_FLAGS;
                if (game.vis && canseemon(mdef))
                    ncflags |= NC_SHOW_MSG;
                if (await newcham(mdef, game.mons[PMNAMES.PM_GREEN_SLIME], ncflags))
                    pd = mdef.data;
                mdef.mstrategy &= ~STRAT_WAITFORU;
                mhm.hitflags = M_ATTK_HIT;
            }
            if (DEADMONSTER(magr))
                mhm.hitflags |= M_ATTK_AGR_DIED;
            if (DEADMONSTER(mdef))
                mhm.hitflags |= M_ATTK_DEF_DIED;
            mhm.damage = 0;
        }
    }
}

// src/uhitm.c:3729 mhitm_ad_poly()
export async function mhitm_ad_poly(magr, mattk, mdef, mhm) {
    const negated = (await mhitm_mgc_atk_negated(magr, mdef, false))
                    || !!magr.mspec_used;

    if (magr === game.youmonst) {
        /* uhitm */
        if (!game.u.uwep && mhm.damage < mdef.mhp) {
            if (negated) {
                await pline(`${Monnam(mdef)} is not transformed.`);
            } else {
                mhm.damage = await mon_poly(game.youmonst, mdef, mhm.damage);
                if (DEADMONSTER(mdef))
                    mhm.hitflags |= M_ATTK_DEF_DIED;
                mhm.hitflags |= M_ATTK_HIT;
                mhm.done = true;
            }
        }
    } else if (mdef === game.youmonst) {
        /* mhitu */
        await hitmsg(magr, mattk);
        if (Maybe_Half_Phys(mhm.damage) < (Upolyd(game.u) ? game.u.mh : game.u.uhp)) {
            if (negated) {
                if (magr.mcan)
                    await You("aren't transformed.");
            } else {
                mhm.damage = await mon_poly(magr, game.youmonst, mhm.damage);
                mhm.hitflags |= M_ATTK_HIT;
                mhm.done = true;
            }
        }
    } else {
        /* mhitm */
        if (mhm.damage < mdef.mhp && !negated) {
            mhm.damage = await mon_poly(magr, mdef, mhm.damage);
            if (DEADMONSTER(mdef))
                mhm.hitflags |= M_ATTK_DEF_DIED;
            mhm.hitflags |= M_ATTK_HIT;
            mhm.done = true;
        }
    }
}

// src/uhitm.c:3838 mhitm_ad_deth()
export async function mhitm_ad_deth(magr, mattk, mdef, mhm) {
    const pd = mdef.data;
    if (magr !== game.youmonst && mdef === game.youmonst) {
        await pline_mon(magr, `${Monnam(magr)} reaches out with its deadly touch.`);
        if (is_undead(pd)) {
            mhm.damage = Math.trunc((mhm.damage + 1) / 2);
            await pline('Was that the touch of death?');
            return;
        }
        switch (rn2(20)) {
        case 19:
        case 18:
        case 17:
            if (!Antimagic()) {
                await touch_of_death(magr);
                mhm.damage = 0;
                return;
            }
            // fall through
        default:
            await You_feel('your life force draining away...');
            mhm.permdmg = 1;
            return;
        case 4:
        case 3:
        case 2:
        case 1:
        case 0:
            if (Antimagic())
                await shieldeff(game.u.ux, game.u.uy);
            await pline("Lucky for you, it didn't work!");
            mhm.damage = 0;
            return;
        }
    } else {
        if (is_undead(pd) && mhm.damage > 1)
            mhm.damage = rnd(Math.trunc(mhm.damage / 2));
        await mhitm_ad_drli(magr, mattk, mdef, mhm);
    }
}

// src/uhitm.c:2445 mhitm_ad_drli(), a monster draining the hero's life.
// The one-in-three gate precedes drain resistance and magical cancellation,
// so most successful touches do not spend the cancellation draw.
export async function mhitm_ad_drli(magr, mattk, mdef, mhm) {
    if (magr === game.youmonst) {
        if (!rn2(3) && !resists_drli(mdef)
            && !(await mhitm_mgc_atk_negated(magr, mdef, true))) {
            mhm.damage = d(2, 6);
            await pline(`${Monnam(mdef)} becomes weaker!`);
            if (mdef.mhpmax - mhm.damage > mdef.m_lev) {
                mdef.mhpmax -= mhm.damage;
            } else if (mdef.mhpmax > mdef.m_lev) {
                mdef.mhpmax = mdef.m_lev + 1;
            }
            mdef.mhp -= mhm.damage;
            if (DEADMONSTER(mdef) || !mdef.m_lev) {
                await pline(`${Monnam(mdef)} ${
                    nonliving(game.mons[mdef.mnum]) ? 'expires' : 'dies'}!`);
                await xkilled(mdef, XKILL_NOMSG);
            } else {
                mdef.m_lev--;
            }
            mhm.damage = 0;
        }
    } else if (mdef === game.youmonst) {
        await hitmsg(magr, mattk, mhm.indx);
        if (!rn2(3) && !game.u.uprops?.DRAIN_RES
            && !(await mhitm_mgc_atk_negated(magr, mdef, true))) {
            const { losexp } = await import('./exper.js');
            await losexp('life drainage');
        }
    } else {
        const isDeath = mattk[1] === ATTKS.AD_DETH;
        if (isDeath
            || (!rn2(3)
                && !(resists_drli(mdef) || defended(mdef, ATTKS.AD_DRLI))
                && !(await mhitm_mgc_atk_negated(magr, mdef, true)))) {
            if (!isDeath)
                mhm.damage = d(2, 6);
            if (game.vis && canspotmon(mdef))
                await pline(`${Monnam(mdef)} becomes weaker!`);
            if (mdef.mhpmax - mhm.damage > mdef.m_lev) {
                mdef.mhpmax -= mhm.damage;
            } else if (mdef.mhpmax > mdef.m_lev) {
                mdef.mhpmax = mdef.m_lev + 1;
            }
            if (!mdef.m_lev)
                mhm.damage = mdef.mhp;
            else
                mdef.m_lev--;
        }
    }
}

// src/uhitm.c:2859 mhitm_ad_tlpt(), teleportation attacks in all three
// combat directions. A successful teleport must leave its target alive.
export async function mhitm_ad_tlpt(magr, mattk, mdef, mhm) {
    if (magr === game.youmonst) {
        if (mhm.damage <= 0)
            mhm.damage = 1;
        if (await mhitm_mgc_atk_negated(magr, mdef, true)) {
            await pline(`${Monnam(mdef)} is not affected.`);
        } else {
            const u_saw_mon = canseemon(mdef) || engulfing_u(mdef);
            const nambuf = Monnam(mdef);
            if (await u_teleport_mon(mdef, false) && u_saw_mon
                && !(canseemon(mdef) || engulfing_u(mdef)))
                await pline(`${nambuf} suddenly disappears!`);
            if (mhm.damage >= mdef.mhp) {
                if (mdef.mhp === 1)
                    ++mdef.mhp;
                mhm.damage = mdef.mhp - 1;
            }
        }
    } else if (mdef === game.youmonst) {
        await hitmsg(magr, mattk, mhm.indx);
        if (await mhitm_mgc_atk_negated(magr, mdef, false)) {
            await You('are not affected.');
        } else {
            if (game.flags.verbose)
                await Your(`position suddenly seems ${
                    Teleport_control() && !Stunned() && !unconscious()
                        ? '' : 'very '}uncertain!`);
            await tele();
            const tmphp = Upolyd(game.u) ? game.u.mh : game.u.uhp;
            if ((Half_physical_damage() ? Math.trunc((mhm.damage - 1) / 2)
                                       : mhm.damage) >= tmphp) {
                mhm.damage = tmphp - 1;
                if (Half_physical_damage())
                    mhm.damage *= 2;
                if (mhm.damage < 1) {
                    mhm.damage = 1;
                    if (Upolyd(game.u) && game.u.mh === 1)
                        ++game.u.mh;
                    else if (!Upolyd(game.u) && game.u.uhp === 1)
                        ++game.u.uhp;
                }
            }
        }
    } else {
        if (magr.mcan || mhm.damage >= mdef.mhp
            || await tele_restrict(mdef)) {
            // C emits no negation message on these early exits.
        } else if (await mhitm_mgc_atk_negated(magr, mdef, true)) {
            if (game.vis)
                await pline_mon(mdef, `${Monnam(mdef)} is not affected.`);
        } else {
            const wasseen = canspotmon(mdef);
            const mdef_Monnam = game.vis && wasseen ? Monnam(mdef) : '';
            mdef.mstrategy &= ~STRAT_WAITFORU;
            await rloc(mdef, RLOC_NOMSG);
            if (game.vis && wasseen && !canspotmon(mdef)
                && mdef !== game.u.usteed)
                await pline(`${mdef_Monnam} suddenly disappears!`);
            if (mhm.damage >= mdef.mhp) {
                if (mdef.mhp === 1)
                    ++mdef.mhp;
                mhm.damage = mdef.mhp - 1;
            }
        }
    }
}

// src/uhitm.c:4623 mhitm_ad_sedu(), shared hero and monster seduction and
// theft handling. Against another monster, a nymph takes the first eligible
// object, updates worn and wielded state, then teleports away.
export async function mhitm_ad_sedu(magr, mattk, mdef, mhm) {
    const pa = magr.data;

    if (magr === game.youmonst) {
        /* uhitm */
        await steal_it(mdef, mattk);
        mhm.damage = 0;
        return;
    } else if (mdef === game.youmonst) {
        /* mhitu */
        const buf = { v: '' };

        if (is_animal(magr.data)) {
            await hitmsg(magr, mattk, mhm.indx);
            if (magr.mcan)
                return;
            /* Continue below */
        } else if (dmgtype(game.youmonst.data, ATTKS.AD_SEDU)
                   /* !SYSOPT_SEDUCE: when hero is attacking and AD_SSEX
                      is disabled, it would be changed to another damage
                      type, but when defending, it remains as-is */
                   || dmgtype(game.youmonst.data, ATTKS.AD_SSEX)) {
            await pline(`${Monnam(magr)} ${
                  Deaf() ? "says something but you can't hear it"
                  : (magr.minvent && magr.minvent.length)
                    ? 'brags about the goods some dungeon explorer provided'
                  : 'makes some remarks about how difficult theft is lately'}.`);
            if (!(await tele_restrict(magr)))
                await rloc(magr, RLOC_MSG);
            mhm.hitflags = M_ATTK_AGR_DONE; /* return 3??? */
            mhm.done = true;
            return;
        } else if (magr.mcan) {
            if (!Blind())
                await pline(`${Adjmonnam(magr, 'plain')} tries to ${
                      game.flags.female ? 'charm' : 'seduce'} you, but you seem ${
                      game.flags.female ? 'unaffected' : 'uninterested'}.`);
            if (rn2(3)) {
                if (!(await tele_restrict(magr)))
                    await rloc(magr, RLOC_MSG);
                mhm.hitflags = M_ATTK_AGR_DONE; /* return 3??? */
                mhm.done = true;
                return;
            }
            return;
        }
        switch (await steal(magr, buf)) {
        case -1:
            mhm.hitflags = M_ATTK_AGR_DIED; /* return 2??? */
            mhm.done = true;
            return;
        case 0:
            return;
        default:
            if (!is_animal(magr.data) && !(await tele_restrict(magr)))
                await rloc(magr, RLOC_MSG);
            if (is_animal(magr.data) && buf.value) {
                if (canseemon(magr))
                    await pline(`${Monnam(magr)} tries to ${
                                  locomotion(magr.data, 'run')} away with ${buf.value}.`);
            }
            await monflee(magr, 0, false, false);
            mhm.hitflags = M_ATTK_AGR_DONE; /* return 3??? */
            mhm.done = true;
            return;
        }
    }
    if (magr.mcan)
        return;

    const obj = (mdef.minvent || []).find(item => !magr.mtame || !item.cursed);
    if (obj) {
        const defenderName = x_monnam(mdef, ARTICLE_THE, null, 0, false);
        if (game.u.usteed === mdef && obj === which_armor(mdef, W_SADDLE)) {
            const { dismount_steed } = await import('./steed.js');
            await dismount_steed(DISMOUNT_POLY);
        }

        await extract_from_minvent(mdef, obj, true);
        const objectName = game.vis ? doname(obj) : '';
        const { mpickobj } = await import('./steal.js');
        await mpickobj(magr, obj);
        const attackerName = Monnam(magr);
        if (game.vis && canseemon(mdef)) {
            await pline(`${attackerName} steals ${objectName} from ${
                defenderName}!`);
        }

        await possibly_unwield(mdef, false);
        mdef.mstrategy = (mdef.mstrategy | 0) & ~STRAT_WAITFORU;
        await mselftouch(mdef, null, false);
        if (DEADMONSTER(mdef)) {
            mhm.hitflags = M_ATTK_DEF_DIED
                | (grow_up(magr, mdef) ? 0 : M_ATTK_AGR_DIED);
            mhm.done = true;
            return;
        }

        if (game.mons[magr.mnum].mlet === MONSYMS.S_NYMPH) {
            const { tele_restrict, rloc } = await import('./teleport.js');
            if (!await tele_restrict(magr)) {
                const couldSpot = canspotmon(magr);
                mhm.hitflags = M_ATTK_AGR_DONE;
                await rloc(magr, RLOC_NOMSG);
                if (game.vis && couldSpot && !canspotmon(magr))
                    await pline(`${attackerName} suddenly disappears!`);
            }
        }
    }
    mhm.damage = 0;
}

// src/do_wear.c:2630 some_armor(), restricted to the hero target used by
// mhitm_ad_ench(). Body armor supplies the initial candidate. Each smaller
// slot replaces it only on its independent one-in-four roll.
function some_hero_armor() {
    const u = game.u;
    let obj = u.uarmc || u.uarm || u.uarmu || null;
    for (const candidate of [u.uarmh, u.uarmg, u.uarmf, u.uarms]) {
        if (candidate && (!obj || !rn2(4)))
            obj = candidate;
    }
    return obj;
}

// src/uhitm.c:3602 mhitm_ad_ench(). A disenchanter claw first checks magical
// cancellation, then selects worn armor or one of the ring and accessory
// slots before draining a positive enchantment.
export async function mhitm_ad_ench(magr, mattk, mdef, mhm) {
    if (magr === game.youmonst) {
        return;
    }
    if (mdef !== game.youmonst) {
        return;
    }

    const negated = await mhitm_mgc_atk_negated(magr, mdef, false);
    await hitmsg(magr, mattk, mhm.indx);
    if (negated)
        return;

    let obj = some_hero_armor();
    if (!obj) {
        switch (rn2(5)) {
        case 1:
            obj = game.u.uright;
            break;
        case 2:
            obj = game.u.uleft;
            break;
        case 3:
            obj = game.u.uamul;
            break;
        case 4:
            obj = game.u.ublindf;
            break;
        default:
            break;
        }
    }
    if (obj && await drain_item(obj, false))
        await pline(`${Yobjnam2(obj, 'seem')} less effective.`);
}

// src/uhitm.c:4565 mhitm_ad_samu(). A successful special hit always prints
// its hit message, then has a one-in-twenty chance to take an invocation item.
export async function mhitm_ad_samu(magr, mattk, mdef, mhm) {
    if (magr === game.youmonst) {
        mhm.damage = 0;
    } else if (mdef === game.youmonst) {
        await hitmsg(magr, mattk, mhm.indx);
        if (!rn2(20)) {
            const { stealamulet } = await import('./steal.js');
            await stealamulet(magr);
        }
    } else {
        mhm.damage = 0;
    }
}

// src/uhitm.c:2521 mhitm_ad_fire(), fire carried by a natural attack.
export async function mhitm_ad_fire(magr, mattk, mdef, mhm) {
    const pd = game.mons[mdef.mnum];
    const orig_dmg = mhm.damage;

    if (magr === game.youmonst) {
        if (await mhitm_mgc_atk_negated(magr, mdef, true)) {
            mhm.damage = 0;
            return;
        }
        if (!Blind())
            await pline(`${Monnam(mdef)} is ${on_fire(pd, mattk)}!`);
        if (completelyburns(pd)) {
            if (!Blind()) {
                await pline(`${Monnam(mdef)} burns completely!`);
            } else {
                await You(`smell burning${
                    pd.pmidx === PMNAMES.PM_PAPER_GOLEM ? ' paper'
                    : pd.pmidx === PMNAMES.PM_STRAW_GOLEM ? ' straw' : ''}.`);
            }
            await xkilled(mdef, XKILL_NOMSG | XKILL_NOCORPSE);
            mhm.damage = 0;
            return;
        }
        if (resists_fire(mdef) || defended(mdef, ATTKS.AD_FIRE)) {
            if (!Blind())
                await pline_The(`fire doesn't heat ${mon_nam(mdef)}!`);
            await golemeffects(mdef, ATTKS.AD_FIRE, mhm.damage);
            await shieldeff(mdef.mx, mdef.my);
            mhm.damage = 0;
        }
        mhm.damage += await destroy_items(mdef, ATTKS.AD_FIRE, orig_dmg);
        await ignite_items(mdef.minvent || []);
    } else if (mdef === game.youmonst) {
        await hitmsg(magr, mattk, mhm.indx);
        if (!(await mhitm_mgc_atk_negated(magr, mdef, true))) {
            await pline(`You're ${on_fire(pd, mattk)}!`);
            if (completelyburns(pd)) {
                await You('go up in flames!');
                monstunseesu(M_SEEN_FIRE);
                const { rehumanize } = await import('./polyself.js');
                await rehumanize();
                return;
            }
            if (Fire_resistance()) {
                await pline_The(`fire doesn't feel hot!`);
                monstseesu(M_SEEN_FIRE);
                mhm.damage = 0;
            } else {
                monstunseesu(M_SEEN_FIRE);
            }
            if (magr.m_lev > rn2(20)) {
                await destroy_items(game.youmonst, ATTKS.AD_FIRE, orig_dmg);
                await ignite_items(game.invent);
            }
            if (game.u.uprops?.SLIMED)
                game.u.uprops.SLIMED = 0;
        } else {
            mhm.damage = 0;
        }
    } else {
        /* mhitm */
        if (await mhitm_mgc_atk_negated(magr, mdef, true)) {
            mhm.damage = 0;
            return;
        }
        if (game.vis && canseemon(mdef))
            await pline(`${Monnam(mdef)} is ${on_fire(pd, mattk)}!`);
        if (completelyburns(pd)) {
            if (game.vis && canseemon(mdef))
                await pline(`${Monnam(mdef)} burns completely!`);
            await monkilled(mdef, '', ATTKS.AD_FIRE);
            if (!DEADMONSTER(mdef)) {
                mhm.hitflags = M_ATTK_MISS;
            } else {
                mhm.hitflags = M_ATTK_DEF_DIED
                    | (grow_up(magr, mdef) ? 0 : M_ATTK_AGR_DIED);
            }
            mhm.done = true;
            return;
        }
        if (resists_fire(mdef) || defended(mdef, ATTKS.AD_FIRE)) {
            if (game.vis && canseemon(mdef))
                await pline_The(`fire doesn't seem to burn ${mon_nam(mdef)}!`);
            await shieldeff(mdef.mx, mdef.my);
            await golemeffects(mdef, ATTKS.AD_FIRE, mhm.damage);
            mhm.damage = 0;
        }
        mhm.damage += await destroy_items(mdef, ATTKS.AD_FIRE, orig_dmg);
        await ignite_items(mdef.minvent || []);
    }
}

// src/uhitm.c:2626 mhitm_ad_cold(), cold carried by a natural attack.
export async function mhitm_ad_cold(magr, mattk, mdef, mhm) {
    const orig_dmg = mhm.damage;

    if (magr === game.youmonst) {
        if (await mhitm_mgc_atk_negated(magr, mdef, true)) {
            mhm.damage = 0;
            return;
        }
        if (!Blind())
            await pline(`${Monnam(mdef)} is covered in frost!`);
        if (resists_cold(mdef) || defended(mdef, ATTKS.AD_COLD)) {
            await shieldeff(mdef.mx, mdef.my);
            if (!Blind())
                await pline_The(`frost doesn't chill ${mon_nam(mdef)}!`);
            await golemeffects(mdef, ATTKS.AD_COLD, mhm.damage);
            mhm.damage = 0;
        }
        mhm.damage += await destroy_items(mdef, ATTKS.AD_COLD, orig_dmg);
    } else if (mdef === game.youmonst) {
        await hitmsg(magr, mattk, mhm.indx);
        if (!(await mhitm_mgc_atk_negated(magr, mdef, true))) {
            await pline("You're covered in frost!");
            if (Cold_resistance()) {
                await pline("The frost doesn't seem cold!");
                monstseesu(M_SEEN_COLD);
                mhm.damage = 0;
            } else {
                monstunseesu(M_SEEN_COLD);
            }
            if (magr.m_lev > rn2(20))
                await destroy_items(game.youmonst, ATTKS.AD_COLD, orig_dmg);
        } else {
            mhm.damage = 0;
        }
    } else {
        /* mhitm */
        if (await mhitm_mgc_atk_negated(magr, mdef, true)) {
            mhm.damage = 0;
            return;
        }
        if (game.vis && canseemon(mdef))
            await pline(`${Monnam(mdef)} is covered in frost!`);
        if (resists_cold(mdef) || defended(mdef, ATTKS.AD_COLD)) {
            if (game.vis && canseemon(mdef))
                await pline_The(`frost doesn't seem to chill ${mon_nam(mdef)}!`);
            await shieldeff(mdef.mx, mdef.my);
            await golemeffects(mdef, ATTKS.AD_COLD, mhm.damage);
            mhm.damage = 0;
        }
        mhm.damage += await destroy_items(mdef, ATTKS.AD_COLD, orig_dmg);
    }
}

// src/uhitm.c:2684 mhitm_ad_elec(), electricity carried by an attack.
//
// The mhitu branch is the one a grid bug takes against the hero: the hit
// message first, then "You get zapped!", then the resistance test and, when
// the attacker is high enough level, destroy_items with an rn2(20) gate.
export async function mhitm_ad_elec(magr, mattk, mdef, mhm) {
    const orig_dmg = mhm.damage;

    if (magr === game.youmonst) {
        if (await mhitm_mgc_atk_negated(magr, mdef, true)) {
            mhm.damage = 0;
            return;
        }
        if (!Blind())
            await pline(`${Monnam(mdef)} is zapped!`);
        if (resists_elec(mdef) || defended(mdef, ATTKS.AD_ELEC)) {
            if (!Blind())
                await pline_The(`zap doesn't shock ${mon_nam(mdef)}!`);
            await golemeffects(mdef, ATTKS.AD_ELEC, mhm.damage);
            await shieldeff(mdef.mx, mdef.my);
            mhm.damage = 0;
        }
        mhm.damage += await destroy_items(mdef, ATTKS.AD_ELEC, orig_dmg);
    } else if (mdef === game.youmonst) {
        /* mhitu */
        await hitmsg(magr, mattk, mhm.indx);
        if (!(await mhitm_mgc_atk_negated(magr, mdef, true))) {
            await You('get zapped!');
            if (Shock_resistance()) {
                await pline_The(`zap doesn't shock you!`);
                monstseesu(M_SEEN_ELEC);
                mhm.damage = 0;
            } else {
                monstunseesu(M_SEEN_ELEC);
            }
            if (magr.m_lev > rn2(20))
                await destroy_items(game.youmonst, ATTKS.AD_ELEC, orig_dmg);
        } else {
            mhm.damage = 0;
        }
    } else {
        /* mhitm */
        if (await mhitm_mgc_atk_negated(magr, mdef, true)) {
            mhm.damage = 0;
            return;
        }
        if (game.vis && canseemon(mdef))
            await pline(`${Monnam(mdef)} gets zapped!`);
        if (resists_elec(mdef) || defended(mdef, ATTKS.AD_ELEC)) {
            if (game.vis && canseemon(mdef))
                await pline_The(`zap doesn't shock ${mon_nam(mdef)}!`);
            await shieldeff(mdef.mx, mdef.my);
            await golemeffects(mdef, ATTKS.AD_ELEC, mhm.damage);
            mhm.damage = 0;
        }
        mhm.damage += await destroy_items(mdef, ATTKS.AD_ELEC, orig_dmg);
    }
}

// src/uhitm.c:2742 mhitm_ad_acid(), acid carried by an engulfing or other
// natural attack. Monster-versus-monster acid always spends its two equipment
// erosion gates, even when the defender resists and the hit damage becomes 0.
export async function mhitm_ad_acid(magr, mattk, mdef, mhm) {
    if (magr === game.youmonst) {
        if (resists_acid(mdef) || defended(mdef, ATTKS.AD_ACID))
            mhm.damage = 0;
    } else if (mdef === game.youmonst) {
        await hitmsg(magr, mattk, mhm.indx);
        if (!magr.mcan && !rn2(3)) {
            if (Acid_resistance()) {
                await pline(`You're covered in ${hliquid('acid')}, but it seems harmless.`);
                monstseesu(M_SEEN_ACID);
                mhm.damage = 0;
            } else {
                await pline(`You're covered in ${hliquid('acid')}!  It burns!`);
                exercise(A_STR, false);
                monstunseesu(M_SEEN_ACID);
            }
        } else {
            mhm.damage = 0;
        }
    } else {
        if (magr.mcan) {
            mhm.damage = 0;
            return;
        }
        if (resists_acid(mdef) || defended(mdef, ATTKS.AD_ACID)) {
            if (game.vis && canseemon(mdef)) {
                await pline(`${Monnam(mdef)} is covered in ${
                    hliquid('acid')}, but it seems harmless.`);
            }
            mhm.damage = 0;
        } else if (game.vis && canseemon(mdef)) {
            await pline(`${Monnam(mdef)} is covered in ${hliquid('acid')}!`);
            await pline(`It burns ${mon_nam(mdef)}!`);
        }
        if (!rn2(30))
            await erode_armor(mdef, ERODE_CORRODE);
        if (!rn2(6)) {
            await erode_obj(MON_WEP(mdef), null, ERODE_CORRODE,
                            EF_GREASE | EF_VERBOSE);
        }
    }
}

// src/uhitm.c:3122 mhitm_ad_drst(), poison carried by a natural attack.
// Magical cancellation is checked before the one-in-eight poison gate.
export async function mhitm_ad_drst(magr, mattk, mdef, mhm) {
    const negated = await mhitm_mgc_atk_negated(magr, mdef, false);

    if (magr === game.youmonst) {
        if (!negated && !rn2(8)) {
            await Your(`${mpoisons_subj(magr, mattk)} was poisoned!`);
            if (resists_poison(mdef)) {
                await pline_The(`poison doesn't seem to affect ${mon_nam(mdef)}.`);
            } else if (!rn2(10)) {
                await Your('poison was deadly...');
                mhm.damage = mdef.mhp;
            } else {
                mhm.damage += rn1(10, 6);
            }
        }
    } else if (mdef === game.youmonst) {
        await hitmsg(magr, mattk, mhm.indx);
        mhm.hitflags |= M_ATTK_HIT;
        if (!negated && !rn2(8)) {
            const ptmp = mattk[1] === ATTKS.AD_DRDX ? A_DEX
                       : mattk[1] === ATTKS.AD_DRCO ? A_CON : A_STR;
            const reason = `${s_suffix(Monnam(magr))} ${
                (await import('./mhitu.js')).mpoisons_subj(magr, mattk)}`;
            await poisoned(reason, ptmp,
                pmname(game.mons[magr.mnum], magr.female ? 1 : 0), 30, false);
        }
    } else if (!negated && !rn2(8)) {
        if (game.vis && canspotmon(magr)) {
            await pline(`${s_suffix(Monnam(magr))} ${
                mpoisons_subj(magr, mattk)} was poisoned!`);
        }
        if (resists_poison(mdef)) {
            if (game.vis && canspotmon(mdef) && canspotmon(magr)) {
                await pline_The(`poison doesn't seem to affect ${
                    mon_nam(mdef)}.`);
            }
        } else {
            mhm.damage += rn1(10, 6);
            if (mhm.damage >= mdef.mhp && game.vis && canspotmon(mdef))
                await pline_The('poison was deadly...');
        }
    }
}

// src/eat.c:603 eat_brains(), monster against monster. rnd(10) is spent even
// for targets without a usable brain. A tame attacker gains a separate
// rnd(60) worth of nutrition only after an intelligent ordinary target.

// src/uhitm.c:3174 mhitm_ad_drin(), mind-flayer brain drain.
export async function mhitm_ad_drin(magr, mattk, mdef, mhm) {
    const pd = game.mons[mdef.mnum];

    if (magr !== game.youmonst && mdef !== game.youmonst) {
        if (game.notonhead || !has_head(pd)) {
            if (game.vis && canspotmon(mdef))
                await pline(`${Monnam(mdef)} doesn't seem harmed.`);
            mhm.damage = 0;
            game.skipdrin = true;
            return;
        }
        if (((mdef.misc_worn_check | 0) & W_ARMH) && rn2(8)) {
            if (game.vis && canspotmon(magr) && canseemon(mdef)) {
                await pline(`${s_suffix(Monnam(mdef))} helmet blocks ${
                    s_suffix(mon_nam(magr))} attack to ${mhis(mdef)} head.`);
            }
            return;
        }
        const amulet = which_armor(mdef, W_AMUL);
        const lifeSaved = amulet?.otyp === ONAMES.AMULET_OF_LIFE_SAVING;
        {
            const dmgbox = { v: mhm.damage };
            mhm.hitflags = await eat_brains(magr, mdef, !!game.vis, dmgbox);
            mhm.damage = dmgbox.v;
        }
        if (lifeSaved && !which_armor(mdef, W_AMUL))
            game.skipdrin = true;
        return;
    }
    if (mdef === game.youmonst) {
        /* mhitu */
        await hitmsg(magr, mattk, mhm.indx);
        if (defends(ATTKS.AD_DRIN, game.u.uwep) || !has_head(pd)) {
            await You("don't seem harmed.");
            /* attacker should skip remaining AT_TENT+AD_DRIN attacks */
            game.skipdrin = true;
            /* Not clear what to do for green slimes */
            return;
        }
        if (await u_slip_free(magr, mattk))
            return;

        if (game.u.uarmh && rn2(8)) {
            /* not body_part(HEAD) */
            await Your(`${helm_simple_name(game.u.uarmh)} blocks the attack to your head.`);
            return;
        }
        /* negative armor class doesn't reduce this damage */
        if (Half_physical_damage())
            mhm.damage = Math.trunc((mhm.damage + 1) / 2);
        await mdamageu(magr, mhm.damage);
        mhm.damage = 0; /* don't inflict a second dose below */

        if (!game.u.uarmh || game.u.uarmh.otyp !== ONAMES.DUNCE_CAP) {
            const oldmort = game.u.umortality | 0;
            const mhitu = await eat_brains(magr, mdef, true, { v: 0 });

            /* skip further AD_DRIN if hero's number of deaths went up */
            if ((game.u.umortality | 0) > oldmort)
                game.skipdrin = true;
            /* eat_brains() will miss if target is mindless (won't
               happen here--hero is considered to retain his mind
               regardless of current shape) or is noncorporeal
               (can't happen here--no one can poly into a ghost
               or shade) so this check for missing is academic */
            if (mhitu === M_ATTK_MISS)
                return;
        }
        /* adjattrib gives dunce cap message when appropriate */
        await adjattrib(A_INT, -rnd(2), false);
        if (!rn2(5)) {
            losespells();
            game.skipdrin = true;
        }
        if (!rn2(5)) {
            await drain_weapon_skill(rnd(2));
            game.skipdrin = true;
        }
        return;
    }
    if (game.notonhead || !has_head(pd)) {
        await pline(`${Monnam(mdef)} doesn't seem harmed.`);
        game.skipdrin = true;
        mhm.damage = 0;
        return;
    }

    const helmet = which_armor(mdef, W_ARMH);
    if (helmet && rn2(8)) {
        await pline(`${s_suffix(Monnam(mdef))} ${helm_simple_name(helmet)} `
                    + `blocks your attack to ${mhis(mdef)} head.`);
        return;
    }

    const amu = which_armor(mdef, W_AMUL);
    const lifsav = amu && amu.otyp === ONAMES.AMULET_OF_LIFE_SAVING;

    const dmgbox = { v: mhm.damage };
    await eat_brains(game.youmonst, mdef, true, dmgbox);
    mhm.damage = dmgbox.v;

    /* skip further AD_DRIN if amulet of life-saving got used up */
    if (lifsav && !which_armor(mdef, W_AMUL))
        game.skipdrin = true;

}

// src/mondata.c:305 can_blnd(), restricted to a monster's physical
// blindness attack against the hero. Ravens use AT_CLAW; facewear and a
// visored helmet protect the hero's eyes.
function can_blnd_u(magr, mattk) {
    if (!haseyes(game.youmonst.data))
        return false;
    if (mattk[0] === ATTKS.AT_CLAW) {
        if (game.u.ublindf)
            return false;
        const helm = game.u.uarmh;
        if (helm && game.objects[helm.otyp]?.oc_descr === 'visored helmet')
            return false;
    } else if ((mattk[0] === ATTKS.AT_TUCH
                || mattk[0] === ATTKS.AT_STNG) && magr.mcan) {
        return false;
    }
    return true;
}

// src/mondata.c:305 can_blnd(), monster-target arms. This keeps the permanent
// blindness, raven, cancellation, light-resistance, and visor protections at
// the same point where C decides whether a special attack can affect eyes.
function can_blnd_m(magr, mattk, mdef) {
    if (!haseyes(mdef.data) || (!mdef.mcansee && !mdef.mblinded))
        return false;
    if (magr?.mnum === PMNAMES.PM_RAVEN && mdef.mnum === PMNAMES.PM_RAVEN)
        return false;

    switch (mattk[0]) {
    case ATTKS.AT_EXPL:
    case ATTKS.AT_GAZE:
    case ATTKS.AT_MAGC:
    case ATTKS.AT_BREA:
        return !magr?.mcan && !resists_blnd(mdef);
    case ATTKS.AT_ENGL:
        if (mdef.msleeping)
            return false;
        break;
    case ATTKS.AT_CLAW: {
        const visor = (mdef.minvent || []).some(obj =>
            (obj.owornmask & W_ARMH)
            && game.objects[obj.otyp]?.oc_descr === 'visored helmet');
        if (visor)
            return false;
        break;
    }
    case ATTKS.AT_TUCH:
    case ATTKS.AT_STNG:
        if (magr?.mcan)
            return false;
        break;
    default:
        break;
    }
    return true;
}

// src/uhitm.c:2958 mhitm_ad_blnd(), monster against hero arm.
export async function mhitm_ad_blnd(magr, mattk, mdef, mhm) {
    if (magr === game.youmonst) {
        if (can_blnd_m(magr, mattk, mdef)) {
            if (!Blind() && mdef.mcansee)
                await pline(`${Monnam(mdef)} is blinded.`);
            mdef.mcansee = 0;
            mdef.mblinded = Math.min(127,
                mhm.damage + (mdef.mblinded | 0));
        }
        mhm.damage = 0;
    } else if (mdef === game.youmonst) {
        if (can_blnd_u(magr, mattk)) {
            if (!game.u.ublind)
                await pline(`${Monnam(magr)} blinds you!`);
            const intr = (game.u.intrinsic ||= {});
            const { make_blinded } = await import('./potion.js');
            await make_blinded((intr.HBlinded | 0) + mhm.damage, false);
            if (!game.u.ublind)
                await Your('vision clears.');
        }
        mhm.damage = 0;
    } else {
        if (can_blnd_m(magr, mattk, mdef)) {
            if (game.vis && mdef.mcansee && canspotmon(mdef)) {
                let message = `${Monnam(mdef)} is blinded`;
                if (mdef.mnum === PMNAMES.PM_ARCHON && canseemon(mdef))
                    message += ` by ${s_suffix(mon_nam(magr))} radiance`;
                await pline(`${message}.`);
            }
            const duration = d(mattk[2], mattk[3]);
            mdef.mblinded = Math.min(127,
                duration + (mdef.mblinded | 0));
            mdef.mcansee = 0;
            mdef.mstrategy = (mdef.mstrategy | 0) & ~STRAT_WAITFORU;
        }
        mhm.damage = 0;
    }
}

// src/uhitm.c:3945 do_stone_mon(), active monster petrification.
async function do_stone_mon(magr, mattk, mdef, mhm) {
    const { munstone } = await import('./muse.js');
    if (await munstone(mdef, false)) {
        if (!DEADMONSTER(mdef)) {
            mhm.hitflags = M_ATTK_MISS;
            mhm.done = true;
            return;
        }
        if (mdef.mtame && !game.vis)
            await You('have a peculiarly sad feeling for a moment, then it passes.');
        mhm.hitflags = M_ATTK_DEF_DIED
            | (grow_up(magr, mdef) ? 0 : M_ATTK_AGR_DIED);
        mhm.done = true;
        return;
    }

    if (poly_when_stoned(game.mons[mdef.mnum])) {
        await minstapetrify(mdef, false);
        mhm.damage = 0;
        return;
    }
    if (!resists_ston(mdef)) {
        if (game.vis && canseemon(mdef))
            await pline(`${Monnam(mdef)} turns to stone!`);
        await monstone(mdef);
        if (!DEADMONSTER(mdef)) {
            mhm.hitflags = M_ATTK_MISS;
            mhm.done = true;
            return;
        }
        if (mdef.mtame && !game.vis)
            await You('have a peculiarly sad feeling for a moment, then it passes.');
        mhm.hitflags = M_ATTK_DEF_DIED
            | (grow_up(magr, mdef) ? 0 : M_ATTK_AGR_DIED);
        mhm.done = true;
        return;
    }
    mhm.damage = mattk[1] === ATTKS.AD_STON ? 0 : 1;
}

// src/uhitm.c:4203 mhitm_ad_ston(), the cockatrice hiss attack.
export async function mhitm_ad_ston(magr, mattk, mdef, mhm) {
    if (magr === game.youmonst) {
        const { munstone } = await import('./muse.js');
        if (!await munstone(mdef, true))
            await minstapetrify(mdef, true);
        mhm.damage = 0;
    } else if (mdef === game.youmonst) {
        await hitmsg(magr, mattk, mhm.indx);
        if (!rn2(3)) {
            if (magr.mcan) {
                if (!Deaf())
                    await You_hear(`a cough from ${mon_nam(magr)}!`);
            } else {
                if (Hallucination() && !Blind()) {
                    await You_hear('hissing.');
                    await pline(`${Monnam(magr)} appears to be blowing you a kiss...`);
                } else if (!Deaf()) {
                    await You_hear(`${s_suffix(mon_nam(magr))} hissing!`);
                } else if (!Blind()) {
                    await pline(`${Monnam(magr)} seems to grimace.`);
                }
                if (!rn2(10) || game.flags?.moonphase === NEW_MOON) {
                    if (await do_stone_u(magr)) {
                        mhm.hitflags = M_ATTK_HIT;
                        mhm.done = true;
                        return;
                    }
                }
            }
        }
    } else {
        if (magr.mcan)
            return;
        await do_stone_mon(magr, mattk, mdef, mhm);
    }
}

// src/uhitm.c:2056 m_slips_free(). Greased or oilskin body armor can
// protect a monster from the hero's wrap attack.
async function m_slips_free(mdef, mattk) {
    let obj;

    if (mattk[1] === ATTKS.AD_DRIN) {
        obj = which_armor(mdef, W_ARMH);
    } else {
        obj = which_armor(mdef, W_ARMC);
        if (!obj)
            obj = which_armor(mdef, W_ARM);
        if (!obj)
            obj = which_armor(mdef, W_ARMU);
    }

    if (obj && (obj.greased || obj.otyp === ONAMES.OILSKIN_CLOAK)
        && (!obj.cursed || rn2(3))) {
        await You(`${mattk[1] === ATTKS.AD_WRAP
                    ? 'slip off of' : 'grab, but cannot hold onto'} ${
                  s_suffix(mon_nam(mdef))} ${obj.greased
                    ? 'greased' : 'slippery'} ${
                  (obj.greased || game.objects[obj.otyp].oc_name_known)
                    ? xname(obj) : cloak_simple_name(obj)}!`);
        if (obj.greased && !rn2(2)) {
            await pline_The('grease wears off.');
            obj.greased = 0;
        }
        return true;
    }
    return false;
}

// src/uhitm.c:3337 mhitm_ad_wrap(). Shared wrap handling for a polymorphed
// hero, a monster attacking the hero, and one monster attacking another.
export async function mhitm_ad_wrap(magr, mattk, mdef, mhm) {
    const pd = mdef.data;
    const pa = magr.data;
    const coil = slithy(pa)
        && (pa.mlet === MONSYMS.S_SNAKE || pa.mlet === MONSYMS.S_NAGA);

    if (magr === game.youmonst) {
        if (!sticks(pd)) {
            const tailmiss = !game.notonhead;

            if (!game.u.ustuck && !tailmiss && !rn2(10)) {
                if (await m_slips_free(mdef, mattk)) {
                    mhm.damage = 0;
                } else {
                    await You(`${coil ? 'coil' : 'swing'} yourself around ${
                              mon_nam(mdef)}!`);
                    set_ustuck(mdef);
                }
            } else if (game.u.ustuck === mdef && !tailmiss) {
                const cant_drown = is_swimmer(pd) || amphibious(pd)
                    || breathless(pd);
                if (is_pool(game.u.ux, game.u.uy) && !cant_drown) {
                    await You(`drown ${mon_nam(mdef)}...`);
                    mhm.damage = mdef.mhp;
                } else if (mattk[0] === ATTKS.AT_HUGS) {
                    await pline(`${Monnam(mdef)} is being crushed.`);
                }
            } else {
                mhm.damage = 0;
                if (game.flags?.verbose) {
                    if (coil && !tailmiss)
                        await You(`brush against ${mon_nam(mdef)}.`);
                    else
                        await You(`brush against ${s_suffix(mon_nam(mdef))} ${
                                  tailmiss ? 'tail' : mbodypart(mdef, LEG)}.`);
                }
            }
        } else {
            mhm.damage = 0;
        }
    } else if (mdef === game.youmonst) {
        if ((!magr.mcan || game.u.ustuck === magr) && !sticks(pd)) {
            if (!game.u.ustuck && !rn2(10)) {
                if (await u_slip_free(magr, mattk)) {
                    mhm.damage = 0;
                } else {
                    set_ustuck(magr);
                    await urgent_pline(`${Some_Monnam(magr)} ${
                        coil ? 'coils' : 'swings'} itself around you!`);
                }
            } else if (game.u.ustuck === magr) {
                if (is_pool(magr.mx, magr.my) && !Swimming()
                    && !Amphibious() && !Breathless()) {
                    const [{ is_waterwall }, { on_level }, { done, DROWNING }]
                        = await Promise.all([
                            import('./dbridge.js'), import('./dungeon.js'),
                            import('./end.js'),
                        ]);
                    const moat = game.level.at(magr.mx, magr.my).typ !== POOL
                        && !is_waterwall(magr.mx, magr.my)
                        && !on_level(game.u.uz, game.medusa_level)
                        && !Is_waterlevel(game.u.uz);
                    await urgent_pline(`${Monnam(magr)} drowns you...`);
                    game.killer = {
                        format: KILLED_BY_AN,
                        name: `${moat ? 'moat' : 'pool of water'} by ${
                              an(pmname(pa, Mgender(magr)))}`,
                    };
                    await done(DROWNING);
                } else if (mattk[0] === ATTKS.AT_HUGS) {
                    await You('are being crushed.');
                }
            } else {
                mhm.damage = 0;
                if (game.flags?.verbose) {
                    if (coil)
                        await pline(`${Monnam(magr)} brushes against you.`);
                    else
                        await pline(`${Monnam(magr)} brushes against your ${
                                    body_part(LEG)}.`);
                }
            }
        } else {
            mhm.damage = 0;
        }
    } else {
        if (magr.mcan)
            mhm.damage = 0;
        if (!mhm.damage && (canseemon(magr) || canseemon(mdef))) {
            await pline(`${Some_Monnam(magr)} brushes against ${
                        some_mon_nam(mdef)}.`);
        }
    }
}

// src/uhitm.c:3431 mhitm_ad_plys(). Active paralysis attacks share their
// damage but not their status rules across the three combat directions.
export async function mhitm_ad_plys(magr, mattk, mdef, mhm) {
    if (magr === game.youmonst) {
        if (!rn2(3) && mhm.damage < mdef.mhp
            && !(await mhitm_mgc_atk_negated(magr, mdef, true))) {
            if (!Blind())
                await pline(`${Monnam(mdef)} is frozen by you!`);
            paralyze_monst(mdef, rnd(10));
        }
    } else if (mdef === game.youmonst) {
        await hitmsg(magr, mattk, mhm.indx);
        if ((game.multi ?? 0) >= 0 && !rn2(3)
            && !(await mhitm_mgc_atk_negated(magr, mdef, true))) {
            if (Free_action()) {
                await You('momentarily stiffen.');
            } else {
                if (Blind())
                    await You('are frozen!');
                else
                    await You(`are frozen by ${mon_nam(magr)}!`);
                game.nomovemsg = 'You can move again.';
                nomul(-rnd(10));
                dynamic_multi_reason(magr, 'paralyzed', false);
                exercise(A_DEX, false);
            }
        }
    } else if (mdef.mcanmove && !rn2(3)
               && !(await mhitm_mgc_atk_negated(magr, mdef, true))) {
        if (game.vis && canspotmon(mdef)) {
            const defender = Monnam(mdef);
            await pline(`${defender} is frozen by ${mon_nam(magr)}.`);
        }
        paralyze_monst(mdef, rnd(10));
    }
}

// src/uhitm.c:3479 mhitm_ad_slee(). The monster-versus-monster arm contains
// two consecutive sleep_monst() calls in C. The first successful timed sleep
// makes the defender unable to move, so the second call fails. Keep both calls
// and both possible draws in that order.
export async function mhitm_ad_slee(magr, mattk, mdef, mhm) {
    if (magr === game.youmonst) {
        if (!mdef.msleeping
            && !(await mhitm_mgc_atk_negated(magr, mdef, false))
            && await sleep_monst(mdef, rnd(10), -1)) {
            if (!Blind())
                await pline(`${Monnam(mdef)} is put to sleep by you!`);
            await slept_monst(mdef);
        }
    } else if (mdef === game.youmonst) {
        await hitmsg(magr, mattk, mhm.indx);
        if ((game.multi ?? 0) >= 0 && !rn2(5)
            && !(await mhitm_mgc_atk_negated(magr, mdef, true))) {
            if (Sleep_resistance()) {
                monstseesu(M_SEEN_SLEEP);
                return;
            }
            monstunseesu(M_SEEN_SLEEP);
            await fall_asleep(-rnd(10), true);
            if (Blind())
                await You('are put to sleep!');
            else
                await You(`are put to sleep by ${mon_nam(magr)}!`);
        }
    } else if (!mdef.msleeping
               && await sleep_monst(mdef, rnd(10), -1)
               && await sleep_monst(mdef, rnd(10), -1)) {
        if (game.vis && canspotmon(mdef)) {
            const defender = Monnam(mdef);
            await pline(`${defender} is put to sleep by ${mon_nam(magr)}.`);
        }
        mdef.mstrategy = (mdef.mstrategy | 0) & ~STRAT_WAITFORU;
        await slept_monst(mdef);
    }
}

// src/uhitm.c:105 dynamic_multi_reason(). Keep the monster-id prefix for
// death attribution while exposing the reason text used by normal messages.
function dynamic_multi_reason(mon, verb, byGaze) {
    const who = x_monnam(mon, ARTICLE_A, null,
                         SUPPRESS_IT | SUPPRESS_INVISIBLE
                         | SUPPRESS_HALLUCINATION | SUPPRESS_SADDLE
                         | SUPPRESS_NAME, false);
    const reason = `${verb} by ${byGaze ? `${s_suffix(who)} gaze` : who}`;
    game.multireasonbuf = `${mon.m_id}:${reason}`;
    game.multi_reason = reason;
}

export async function mhitm_ad_phys(magr, mattk, mdef, mhm) {
    const A = ATTKS;
    const pa = magr.data;
    const pd = mdef.data;

    if (magr === game.youmonst) {
        /* uhitm */
        if (pd === game.mons[PMNAMES.PM_SHADE]) {
            mhm.damage = 0;
            /* if (!mhm->specialdmg) impossible("bad shade attack function flow?") */
        }
        mhm.damage += (mhm.specialdmg | 0);

        if (mattk[0] === A.AT_WEAP) {
            /* hmonas() uses known_hitum() to deal physical damage,
               then also damageum() for non-AD_PHYS; don't inflict
               extra physical damage for unusual damage types */
            mhm.damage = 0;
        } else if (mattk[0] === A.AT_KICK
                   || mattk[0] === A.AT_CLAW
                   || mattk[0] === A.AT_TUCH
                   || mattk[0] === A.AT_HUGS) {
            if (thick_skinned(pd))
                mhm.damage = (mattk[0] === A.AT_KICK) ? 0
                             : Math.trunc((mhm.damage + 1) / 2);
            /* add ring(s) of increase damage */
            if ((game.u.udaminc | 0) > 0) {
                /* applies even if damage was 0 */
                mhm.damage += game.u.udaminc;
            } else if (mhm.damage > 0) {
                /* ring(s) might be negative; avoid converting
                   0 to non-0 or positive to non-positive */
                mhm.damage += (game.u.udaminc | 0);
                if (mhm.damage < 1)
                    mhm.damage = 1;
            }
        }
    } else if (mdef === game.youmonst) {
        /* mhitu */
        if (mattk[0] === A.AT_HUGS && !sticks(pd)) {
            if (!game.u.ustuck && rn2(2)) {
                if (await u_slip_free(magr, mattk)) {
                    mhm.damage = 0;
                    mhm.hitflags |= M_ATTK_MISS;
                } else {
                    set_ustuck(magr);
                    await pline(`${Monnam(magr)} grabs you!`);
                    mhm.hitflags |= M_ATTK_HIT;
                }
            } else if (game.u.ustuck === magr) {
                exercise(A_STR, false);
                await You(`are being ${
                    (pa === game.mons[PMNAMES.PM_ROPE_GOLEM]) ? 'choked' : 'crushed'}.`);
            }
        } else { /* hand to hand weapon */
            const otmp = MON_WEP(magr);

            if (mattk[0] === A.AT_WEAP && otmp) {
                let marmg;
                let tmp;
                const was_poisoned = (otmp.opoisoned || permapoisoned(otmp));

                if (otmp.otyp === ONAMES.CORPSE
                    && touch_petrifies(game.mons[otmp.corpsenm])) {
                    mhm.damage = 1;
                    await pline(`${Monnam(magr)} hits you with the ${
                              game.mons[otmp.corpsenm].pmnames[NEUTRAL]} corpse.`);
                    if (!Stoned()) {
                        if (await do_stone_u(magr)) {
                            mhm.hitflags = M_ATTK_HIT;
                            mhm.done = 1;
                            return;
                        }
                    }
                }
                mhm.damage += dmgval(otmp, mdef);
                if ((marmg = which_armor(magr, W_ARMG)) != null
                    && marmg.otyp === ONAMES.GAUNTLETS_OF_POWER)
                    mhm.damage += rn1(4, 3); /* 3..6 */
                if (mhm.damage <= 0)
                    mhm.damage = 1;
                {
                    const dmgbox = { v: mhm.damage };
                    const arti = otmp.oartifact
                        && await artifact_hit(magr, mdef, otmp, dmgbox, game.mhitu_dieroll);
                    mhm.damage = dmgbox.v;
                    if (!otmp.oartifact || !arti) {
                        await hitmsg(magr, mattk, mhm.indx);
                        mhm.hitflags |= M_ATTK_HIT;
                    }
                }
                if (!mhm.damage)
                    return;
                if (game.objects[otmp.otyp].oc_material === MATERIALS.SILVER
                    && hates_silver_you()) {
                    await pline_The('silver sears your flesh!');
                    exercise(A_CON, false);
                }
                /* this redundancy necessary because you have
                   to take the damage _before_ being cloned;
                   need to have at least 2 hp left to split */
                tmp = mhm.damage;
                if (game.u.uac < 0)
                    tmp -= rnd(-game.u.uac);
                if (tmp < 1)
                    tmp = 1;
                if (Half_physical_damage())
                    tmp = Math.trunc((tmp + 1) / 2);

                if (game.u.mh - tmp > 1
                    && (game.objects[otmp.otyp].oc_material === MATERIALS.IRON
                        /* relevant 'metal' objects are scalpel and tsurugi */
                        || game.objects[otmp.otyp].oc_material === MATERIALS.METAL)
                    && (game.u.umonnum === PMNAMES.PM_BLACK_PUDDING
                        || game.u.umonnum === PMNAMES.PM_BROWN_PUDDING)) {
                    if (tmp > 1)
                        exercise(A_STR, false);
                    /* inflict damage now; we know it can't be fatal */
                    game.u.mh -= tmp;
                    (game.disp ||= {}).botl = true;
                    mhm.damage = 0; /* don't inflict more damage below */
                    if (await cloneu())
                        await You(`divide as ${mon_nam(magr)} hits you!`);
                }
                await rustm(game.youmonst, otmp);
                if (was_poisoned && game.mhitu_dieroll <= 5) {
                    /* similar to mhitm_really_poison, but we don't use the
                     * exact same values, nor do we want same 1/8 chance of
                     * poison taking (use 1/4, same as in the mhitm case). */
                    const buf = `${s_suffix(Monnam(magr))} ${mpoisons_subj(magr, mattk)}`;
                    /* arbitrary, but most poison sources in the game are
                     * strength-based. With hpdamchance = 10, HP damage occurs
                     * 1/2 of the time and it will hit Str rest of the time.
                     * (This is the same as poisoned ammo.) */
                    await poisoned(buf, A_STR, pmname(magr.data, Mgender(magr)),
                                   10, false);
                }
            } else if (mattk[0] !== A.AT_TUCH || mhm.damage !== 0
                       || magr !== game.u.ustuck) {
                await hitmsg(magr, mattk, mhm.indx);
                mhm.hitflags |= M_ATTK_HIT;
            }
        }
    } else {
        /* mhitm */
        let mwep = MON_WEP(magr);
        const vis = canseemon(magr) && canseemon(mdef);

        if (mattk[0] !== A.AT_WEAP && mattk[0] !== A.AT_CLAW)
            mwep = null;

        if (await shade_miss(magr, mdef, mwep, false, vis)) {
            mhm.damage = 0;
        } else if (mattk[0] === A.AT_KICK && thick_skinned(pd)) {
            /* [no 'kicking boots' check needed; monsters with kick attacks
               can't wear boots and monsters that wear boots don't kick] */
            mhm.damage = 0;
        } else if (mwep) { /* non-Null 'mwep' implies AT_WEAP || AT_CLAW */
            let marmg;

            if (mwep.otyp === ONAMES.CORPSE
                && touch_petrifies(game.mons[mwep.corpsenm])) {
                await do_stone_mon(magr, mattk, mdef, mhm);
                if (mhm.done)
                    return;
            }

            mhm.damage += dmgval(mwep, mdef);
            if ((marmg = which_armor(magr, W_ARMG)) != null
                && marmg.otyp === ONAMES.GAUNTLETS_OF_POWER)
                mhm.damage += rn1(4, 3); /* 3..6 */
            if (mhm.damage < 1) /* is this necessary?  mhitu.c has it... */
                mhm.damage = 1;
            if (mwep.oartifact) {
                /* when magr's weapon is an artifact, caller suppressed its
                   usual 'hit' message in case artifact_hit() delivers one;
                   now we'll know and might need to deliver skipped message
                   (note: if there's no message there'll be no auxiliary
                   damage so the message here isn't coming too late) */
                const dmgbox = { v: mhm.damage };
                const arti = await artifact_hit(magr, mdef, mwep, dmgbox, mhm.dieroll);
                mhm.damage = dmgbox.v;
                if (!arti) {
                    if (game.vis)
                        await pline(`${Monnam(magr)} hits ${mon_nam_too(mdef, magr)}.`);
                    mhm.hitflags |= M_ATTK_HIT;
                }
                /* artifact_hit updates 'tmp' but doesn't inflict any
                   damage; however, it might cause carried items to be
                   destroyed and they might do so */
                if (DEADMONSTER(mdef)) {
                    mhm.hitflags = (M_ATTK_DEF_DIED
                                    | (grow_up(magr, mdef) ? 0
                                       : M_ATTK_AGR_DIED));
                    mhm.done = true;
                    return;
                }
            }
            if (mhm.damage)
                await rustm(mdef, mwep);
            if ((mwep.opoisoned || permapoisoned(mwep)) && !rn2(4)) {
                /* 1/4 chance of weapon poison applying is the same as in
                 * uhitm and mhitu cases. But since we don't need to call
                 * any special functions or go through tangled hmon_hitmon
                 * code, we can just jump straight to the poisoning. */
                await mhitm_really_poison(magr, mattk, mdef, mhm);
            }
        } else if (pa === game.mons[PMNAMES.PM_PURPLE_WORM] && pd === game.mons[PMNAMES.PM_SHRIEKER]) {
            /* hack to enhance mm_aggression(); we don't want purple
               worm's bite attack to kill a shrieker because then it
               won't swallow the corpse; but if the target survives,
               the subsequent engulf attack should accomplish that */
            if (mhm.damage >= mdef.mhp && mdef.mhp > 1)
                mhm.damage = mdef.mhp - 1;
        }
    }
}

/* include/youprop.h Hate_silver — hero form that hates silver; base heroes
   never do, and the polymorph state that could is recorded elsewhere. */
function hates_silver_you() {
    return false;
}

// src/mhitm.c:1260 rustm() — the defender's rust/corrode/burn passive
// against the weapon that just hit it. The hero (or a monster) without such
// a passive exits before the rn2(chance) gate, which is why this draws
// nothing in ordinary fights; erode_obj() itself is absent and recorded.
async function rustm(mdef, obj) {
    const A = ATTKS;
    if (!mdef || !obj)
        return; /* just in case */
    const pd = (mdef === game.youmonst) ? game.youmonst.data
                                        : game.mons[mdef.mnum];
    let dmgtyp = ERODE_NONE, chance = 1;
    if (dmgtype(pd, A.AD_CORR)) {
        dmgtyp = ERODE_CORRODE;
    } else if (dmgtype(pd, A.AD_RUST)) {
        dmgtyp = ERODE_RUST;
    } else if (dmgtype(pd, A.AD_FIRE)
               && pd !== game.mons[PMNAMES.PM_STEAM_VORTEX]) {
        dmgtyp = ERODE_BURN;
        chance = 6;
    }

    if (dmgtyp !== ERODE_NONE && !rn2(chance))
        await erode_obj(obj, null, dmgtyp, EF_GREASE | EF_VERBOSE);
}

// src/uhitm.c:4296 mhitm_ad_heal(), nurse attacks. A nurse treats an
// unequipped hero, but attacks normally when cancelled, when touching the
// hero's current form would petrify it, or when the defender is a monster.
export async function mhitm_ad_heal(magr, mattk, mdef, mhm) {
    const pd = mdef.data;

    if (magr === game.youmonst) {
        await mhitm_ad_phys(magr, mattk, mdef, mhm);
        return;
    }
    if (mdef !== game.youmonst) {
        await mhitm_ad_phys(magr, mattk, mdef, mhm);
        return;
    }

    if (magr.mcan || (Upolyd(game.u) && touch_petrifies(pd))) {
        await hitmsg(magr, mattk, mhm.indx);
        return;
    }

    const uwep = game.u.uwep;
    const equipped = (uwep
                      && (uwep.oclass === OCLASSES.WEAPON_CLASS
                          || is_weptool(uwep, game.objects)))
        || game.u.uarmu || game.u.uarm || game.u.uarmc
        || game.u.uarms || game.u.uarmg || game.u.uarmf || game.u.uarmh;

    if (!equipped) {
        let goaway = false;

        await pline_mon(magr,
                        `${Monnam(magr)} hits!  (I hope you don't mind.)`);
        if (Upolyd(game.u)) {
            game.u.mh += rnd(7);
            if (!rn2(7)) {
                game.u.mhmax++;
                if (!rn2(13))
                    goaway = true;
            }
            if (game.u.mh > game.u.mhmax)
                game.u.mh = game.u.mhmax;
        } else {
            game.u.uhp += rnd(7);
            if (!rn2(7)) {
                if (game.u.uhpmax < 5 * game.u.ulevel
                                      + d(2 * game.u.ulevel, 10)) {
                    game.u.uhpmax++;
                    if (game.u.uhpmax > (game.u.uhppeak | 0))
                        game.u.uhppeak = game.u.uhpmax;
                }
                if (!rn2(13))
                    goaway = true;
            }
            if (game.u.uhp > game.u.uhpmax)
                game.u.uhp = game.u.uhpmax;
        }
        if (!rn2(3))
            exercise(A_STR, true);
        if (!rn2(3))
            exercise(A_CON, true);
        if (game.u.uprops?.SICK) {
            const { make_sick } = await import('./potion.js');
            await make_sick(0, null, false, SICK_ALL);
        }
        (game.disp ||= {}).botl = true;

        if (goaway) {
            mongone(magr);
            mhm.done = true;
            mhm.hitflags = M_ATTK_DEF_DIED;
            return;
        }
        if (!rn2(33)) {
            if (!await tele_restrict(magr))
                await rloc(magr, RLOC_MSG);
            await monflee(magr, d(3, 6), true, false);
            mhm.done = true;
            mhm.hitflags = M_ATTK_HIT | M_ATTK_DEF_DIED;
            return;
        }
        mhm.damage = 0;
    } else if (Role_if(PMNAMES.PM_HEALER)) {
        if (!Deaf() && !(game.moves % 5))
            await verbalize("Doc, I can't help you unless you cooperate.");
        mhm.damage = 0;
    } else {
        await hitmsg(magr, mattk, mhm.indx);
    }
}

// src/uhitm.c:5218 m_is_steadfast(). Grounded Giantslayer wielders and
// loadstone carriers resist knockback.
export function m_is_steadfast(mtmp) {
    const is_u = mtmp === game.youmonst;
    const mdat = mtmp.data || game.mons[mtmp.mnum];
    const wep = is_u ? game.u.uwep : MON_WEP(mtmp);

    if ((is_u ? (Flying() || Levitation())
              : (is_flyer(mdat) || is_floater(mdat)))
        || Is_airlevel(game.u.uz)
        || (Is_waterlevel(game.u.uz) && !is_pool(game.u.ux, game.u.uy)))
        return false;

    if (wep?.oartifact === ART_GIANTSLAYER)
        return true;
    if (is_u) {
        const invent = game.invent || game.u.invent || [];
        if (invent.some((obj) => obj.otyp === ONAMES.LOADSTONE))
            return true;
    } else if (m_carrying(mtmp, ONAMES.LOADSTONE)) {
        return true;
    }
    return !!(game.u.usteed && mtmp === game.u.usteed
              && (game.invent || game.u.invent || [])
                     .some((obj) => obj.otyp === ONAMES.LOADSTONE));
}

function is_blunt_weapon(obj) {
    return !!obj
        && (obj.oclass === OCLASSES.WEAPON_CLASS
            || is_weptool(obj, game.objects))
        && !!(game.objects[obj.otyp].oc_dir & 4 /* WHACK */);
}




// src/uhitm.c:5247 mhitm_knockback(). Can this hit hurl the defender?
// The two leading draws precede every qualification test. Message variation
// draws also precede the blocking pline, matching C's argument evaluation.
export async function mhitm_knockback(magr, mdef, mattk, mhm, weapon_used) {
    const A = ATTKS;
    const attack = Array.isArray(mattk?.[0]) ? mattk[0] : mattk;
    const u_agr = magr === game.youmonst;
    let u_def = mdef === game.youmonst;
    let was_u = false, dismount = false;
    const magrdata = magr.data || game.mons[magr.mnum];
    const mdefdata = mdef.data || game.mons[mdef.mnum];
    const wep = weapon_used ? (u_agr ? game.u.uwep : MON_WEP(magr)) : null;
    const knockdistance = rn2(3) ? 1 : 2;
    const chance = wep?.oartifact === ART_OGRESMASHER ? 2 : 6;

    if (rn2(chance))
        return false;
    if (!(attack?.[1] === A.AD_PHYS
          && (attack[0] === A.AT_CLAW || attack[0] === A.AT_KICK
              || attack[0] === A.AT_BUTT || attack[0] === A.AT_WEAP)))
        return false;
    if (attacktype(magrdata, A.AT_ENGL) || attacktype(magrdata, A.AT_HUGS)
        || sticks(magrdata))
        return false;

    const defx = u_def ? game.u.ux : mdef.mx;
    const defy = u_def ? game.u.uy : mdef.my;
    const agrx = u_agr ? game.u.ux : magr.mx;
    const agry = u_agr ? game.u.uy : magr.my;
    const dx = sgn(defx - agrx), dy = sgn(defy - agry);

    if (u_def) {
        if (!(await test_move(defx, defy, dx, dy, TEST_MOVE)))
            return false;
    } else if (!isok(defx + dx, defy + dy)) {
        return false;
    } else if (IS_DOOR(game.level.at(defx, defy).typ)
               && (defx - agrx) && (defy - agry)
               && !doorless_door(defx, defy)) {
        return false;
    }

    /* if hero is stuck to a cursed saddle, knock the steed back */
    if (u_def && game.u.usteed) {
        let otmp;
        if ((otmp = which_armor(game.u.usteed, W_SADDLE)) != null && otmp.cursed) {
            mdef = game.u.usteed;
            was_u = true;
            u_def = false;
        } else {
            dismount = true; /* saddle is not cursed; knock hero out of it */
        }
    }

    /* monsters must be alive */
    if ((!u_agr && DEADMONSTER(magr)) || (!u_def && DEADMONSTER(mdef)))
        return false;
    if (!((magr.data || game.mons[magr.mnum]).msize > (mdef.data || game.mons[mdef.mnum]).msize + 1))
        return false;
    if (wep && (is_flimsy(wep) || !is_blunt_weapon(wep)))
        return false;
    if (unsolid(magrdata))
        return false;
    if ((u_agr || u_def) && !(mhm.hitflags & M_ATTK_HIT))
        return false;

    if (m_is_steadfast(mdef)) {
        if (u_def || (game.u.usteed && mdef === game.u.usteed)) {
            let mdefbuf = '';
            if (game.u.usteed)
                mdefbuf = `and ${y_monnam(game.u.usteed)} `;
            await You(`${mdefbuf}don't budge.`);
        } else if (canseemon(mdef))
            await pline(`${Monnam(mdef)} doesn't budge.`);
        return false;
    }

    const knockedhow = dismount ? 'out of your saddle'
                 : will_hurtle(mdef, defx + dx, defy + dy) ? 'backward'
                   : 'back';
    if (u_def || canseemon(mdef)) {
        const magrbuf = u_agr ? 'You' : Monnam(magr);
        let mdefbuf = (u_def || was_u) ? 'you' : y_monnam(mdef);
        if (was_u)
            mdefbuf += ` and ${y_monnam(game.u.usteed)}`;
        const force = rn2(2) ? 'forceful' : 'powerful';
        const hitkind = rn2(2) ? 'blow' : 'strike';
        await pline(`${magrbuf} ${vtense(magrbuf, 'knock')} ${mdefbuf} ${
            knockedhow} with a ${force} ${hitkind}!`);
    } else if (u_agr) {
        await You(`feel ${m_monnam(mdef)} be knocked ${knockedhow}!`);
    }

    if (game.u.ustuck && (u_def || u_agr))
        set_ustuck(null);

    if (u_def) {
        if (dismount) {
            /* normally u.dx,u.dy indicates the direction hero is throwing,
               zapping, &c but here it is used to pass preferred direction
               for dismount to dismount_steed (for DISMOUNT_KNOCKED only) */
            game.u.dx = dx;
            game.u.dy = dy;
            await dismount_steed(DISMOUNT_KNOCKED);
        } else {
            await hurtle(dx, dy, knockdistance, false);
            mhm.hitflags |= M_ATTK_HIT;
        }
        set_apparxy(magr);
        if (!(game.u.intrinsic?.HStun || 0) && !rn2(4)) {
            const { make_stunned } = await import('./potion.js');
            await make_stunned(knockdistance + 1, true);
        }
    } else {
        await mhurtle(mdef, dx, dy, knockdistance);
        if (!u_agr)
            mhm.hitflags |= M_ATTK_HIT;
        if (DEADMONSTER(mdef)) {
            mhm.hitflags |= M_ATTK_DEF_DIED;
        } else if (!rn2(4)) {
            mdef.mstun = 1;
        }
    }
    if (!u_agr && DEADMONSTER(magr))
        mhm.hitflags |= M_ATTK_AGR_DIED;
    return true;
}

// src/uhitm.c:6300 disguised_as_non_mon(), a mimic posing as something
// that isn't a monster and not sensed through the disguise.
export function disguised_as_non_mon(mtmp) {
    return (!sensemon(mtmp)
            && M_AP_TYPE(mtmp)
            && M_AP_TYPE(mtmp) !== M_AP_MONSTER);
}

/* src/dothrow.c mhurtle() lives in js/dothrow.js; re-exported for wizcmds */
export { mhurtle };
