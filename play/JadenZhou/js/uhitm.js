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

import { DEADMONSTER } from './mon.js';
import { helpless } from './monmove.js';
import { is_art } from './artifact.js';
import { passes_rocks } from './trap.js';
import { resists_poison } from './mondata.js';
import { game } from './gstate.js';
import { livelog_printf } from './display.js';
import { LL_CONDUCT, ONAME } from './const.js';
import { obj_is_pname } from './objnam.js';
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
import { rustm, mon_poly } from './mhitm.js';
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
import {
    Your, pline_The, sensemon, canseemon, newsym, glyph_at, glyph_is_warning,
    glyph_is_invisible, map_invisible, tp_sensemon, vobj_at
} from './display.js';
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
import { u_wipe_engr, sticks } from './engrave.js';
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
import { steal, stealgold, stealamulet } from './steal.js';
import { tele_restrict, rloc } from './teleport.js';
import { locomotion } from './trap.js';
import { Adjmonnam } from './do_name.js';
import { doseduce } from './mhitu.js';
import { You_hear } from './sounds.js';
import { make_stoned } from './potion.js';
import { poly_when_stoned } from './mondata.js';
import { the } from './iactions.js';
import { RLOC_MSG, M_ATTK_AGR_DONE, M_ATTK_AGR_DIED, KILLED_BY_AN, KILLED_BY,
         NEW_MOON, STONED, STONE_RES, DEAF } from './const.js';
import { DRAIN_RES, M_SEEN_FIRE, M_SEEN_COLD, M_SEEN_ACID, M_SEEN_SLEEP,
         FIRE_RES, COLD_RES, ACID_RES, SLEEP_RES, TELEPORT_CONTROL, BLINDED,
         TIMEOUT, LEG, SWIMMING, UNCHANGING, SLIMED, FAST, SICK, SICK_ALL,
         RIGHT_SIDE, LEFT_SIDE, ANTIMAGIC, A_INT,
         W_ARMH, W_ARMC, W_ARMU, W_ARMF, ERODE_RUST, ERODE_CORRODE, ERODE_ROT,
         ER_NOTHING, EF_GREASE, EF_VERBOSE, MAGICAL_BREATHING }
       from './const.js';
import { GRAY_DRAGON_SCALE_MAIL, YELLOW_DRAGON_SCALES, DUNCE_CAP, LOW_BOOTS,
         IRON_SHOES } from './objects.js';
import { erode_obj, drain_en, set_wounded_legs, Maybe_Half_Phys } from './trap.js';
import { losexp } from './exper.js';
import { completelyrusts, completelyrots, completelyburns, mon_give_prop,
         mongone } from './mon.js';
import { burn_away_slime, hliquid, make_blinded, make_confused, make_stunned,
         make_slimed, make_sick, delayed_killer } from './potion.js';
import { tele } from './teleport.js';
import { unconscious, is_fainted, morehungry } from './eat.js';
import { can_blnd } from './mondata.js';
import { night } from './calendar.js';
import { attrcurse } from './sit.js';
import { mdamageu, u_slip_free, u_slow_down, diseasemu } from './mhitu.js';
import { adjattrib } from './attrib.js';
import { losespells } from './spell.js';
import { drain_weapon_skill } from './weapon.js';
import { helm_simple_name } from './objnam.js';
import { urgent_pline, You_feel } from './display.js';
import { Some_Monnam } from './do_name.js';
import { fall_asleep, obj_stop_timers } from './timeout.js';
import { some_armor } from './do_wear.js';
import { touch_of_death } from './mcastu.js';
import { set_uasmon } from './polyself.js';
import { splitobj, weight, place_object } from './mkobj.js';
import { setuwep } from './wield.js';
import { freeinv, useup, useupall, obfree } from './invent.js';
import { potionhit } from './potion.js';
import { POTHIT_HERO_BASH, POTHIT_HERO_THROW, CXN_PFX_THE, CXN_ARTICLE,
         NEUTRAL, FACE, EXPL_FIERY, ismnum } from './const.js';
import { breaktest } from './dothrow.js';
import { ysimple_name } from './iactions.js';
import { change_luck } from './attrib.js';
import { EXPENSIVE_CAMERA, EGG, CREAM_PIE, BLINDING_VENOM, ACID_VENOM, ROCK,
         VEGGY, PAPER, SPBOOK_CLASS } from './objects.js';
import { corpse_xname, An, singular, cxname } from './objnam.js';
import { observe_object } from './o_init.js';
import { munstone } from './muse.js';
import { stale_egg } from './eat.js';
import { explode } from './explode.js';
import { is_vampshifter, haseyes, resists_acid,
         mon_hates_blessings } from './mondata.js';
import { AT_SPIT } from './monsters.js';
import { mbodypart } from './shk.js';
import { setmangry } from './mon.js';
import { mlifesaver, golemeffects } from './mon.js';
import { destroy_items } from './zap.js';
import { ignite_items } from './trap.js';
import { resists_fire, resists_cold, resists_elec, defended } from './mondata.js';
import { XKILL_NOCORPSE } from './const.js';
import { artifact_hit, defends, shade_glare, retouch_equipment } from './artifact.js';
import { will_hurtle, hurtle, mhurtle } from './dothrow.js';
import { some_mon_nam } from './do_name.js';
import { unstuck } from './mhitu.js';
import { set_apparxy } from './monmove.js';
import {
    Fire_resistance, Cold_resistance, Sleep_resistance, Shock_resistance, Drain_resistance,
    Antimagic, Acid_resistance, Stone_resistance, Punished, Stunned, Confusion, Blind, Stoned,
    Slimed, Hallucination, Deaf, See_invisible, Blind_telepat, Detect_monsters,
    Teleport_control, Levitation, Flying, Swimming, Amphibious, Breathless, Underwater,
    Half_physical_damage, Protection_from_shape_changers, Unchanging, Free_action, Hate_silver
} from './youprop.js';
import { m_next2u, Upolyd, Role_if, Race_if, Luck } from './const.js';
import { AT_MAGC, AT_BITE, AT_STNG } from './monsters.js';
import { ERODE_BURN, EF_NONE, M_SEEN_MAGR, STONING } from './const.js';
import { done_in_by } from './end.js';
import { polymon } from './polyself.js';
import { attk_protection } from './mhitm.js';
import { drain_item } from './zap.js';
import { healmon, monnear } from './mon.js';
import { ugolemeffects } from './mhitu.js';
import { Yobjnam2 } from './objnam.js';
import { split_mon } from './potion.js';
import { hit as hit_uh } from './zap.js';
import { mshot_xname as mshot_xname_uh } from './mthrowu.js';
import { tended_shop } from './shk.js';
/* flash_hits_mon(), light_hits_gremlin() */
import { canseemon as canseemon_fh, glyph_at as glyph_at_fh, pline as pline_fh,
         canspotmon as canspotmon_fh, map_invisible as map_invisible_fh } from './display.js';
import { M_AP_TYPE as M_AP_TYPE_FH, M_AP_NOTHING as M_AP_NOTHING_FH,
         MHID_ALTMON as MHID_ALTMON_FH, ARTICLE_YOUR as ARTICLE_YOUR_FH,
         ARTICLE_A as ARTICLE_A_FH } from './const.js';
import { mhidden_description as mhidden_description_fh } from './pager.js';
import { wakeup as wakeup_fh, setmangry as setmangry_fh, DEADMONSTER as DEADMONSTER_fh,
         wake_nearto as wake_nearto_fh, monkilled as monkilled_fh,
         killed as killed_fh } from './mon.js';
import { x_monnam as x_monnam_fh, mon_nam as mon_nam_fh, Monnam as Monnam_fh } from './do_name.js';
import { haseyes as haseyes_fh, resists_blnd as resists_blnd_fh,
         resists_blnd_by_arti as resists_blnd_by_arti_fh } from './mondata.js';
import { mons as mons_fh, S_LIGHT as S_LIGHT_FH, PM_GREMLIN as PM_GREMLIN_FH,
         AD_BLND as AD_BLND_FH } from './monsters.js';
import { WAN_LIGHT as WAN_LIGHT_FH } from './objects.js';
import { dist2 as dist2_fh } from './hacklib.js';
import { d as d_fh, rnd as rnd_fh, rn2 as rn2_fh } from './rng.js';
import { monflee as monflee_fh } from './monmove.js';
import { Deaf as Deaf_fh } from './youprop.js';
import { cansee as cansee_fh } from './vision.js';
import { tty_display_nhwindow as tty_display_nhwindow_fh } from './wintty.js';
import { m_canseeu as m_canseeu_mm } from './monmove.js';
import { rehumanize } from './polyself.js';
import { dopay } from './shk.js';
import { angry_guards } from './mon.js';
import { clone_mon } from './makemon.js';
import { mintrap } from './trap.js';
import { NO_TRAP_FLAGS } from './const.js';
/* C ref: mondata.h slithy(), flaming(), has_head() */
function slithy(ptr) { return (ptr.mflags1 & M.M1_SLITHY) !== 0; }
function flaming(ptr) {
    return ptr === mons[M.PM_FIRE_VORTEX] || ptr === mons[M.PM_FLAMING_SPHERE]
           || ptr === mons[M.PM_FIRE_ELEMENTAL] || ptr === mons[M.PM_SALAMANDER];
}
function has_head(ptr) { return (ptr.mflags1 & M.M1_NOHEAD) === 0; }
/* C ref: mondata.h is_animal(), type_is_pname() */
function is_animal(ptr) { return (ptr.mflags1 & M.M1_ANIMAL) !== 0; }
function type_is_pname(ptr) { return (ptr.mflags2 & M.M2_PNAME) !== 0; }
/* C ref: hack.h makeknown() */
function makeknown(x) { discover_object(x, true, true, true); }

function sgn(n) { return n < 0 ? -1 : n > 0 ? 1 : 0; }
/* C ref: mondata.h touch_petrifies() */
function touch_petrifies(ptr) {
    return ptr === mons[M.PM_COCKATRICE] || ptr === mons[M.PM_CHICKATRICE];
}
/* C ref: mondata.h resists_ston() */
function resists_ston(mon) { return !!Resists_Elem(mon, STONE_RES); }
/* C ref: uhitm.c mhitm_ad_phys() -- !artifact_hit(magr, mdef, otmp,
   &mhm->damage, gm.mhitu_dieroll) */
async function not_artifact_hit(magr, mdef, otmp, mhm) {
    const dmgp = { val: mhm.damage };
    const r = await artifact_hit(magr, mdef, otmp, dmgp, game.mhitu_dieroll);
    mhm.damage = dmgp.val;
    return !r;
}
/* C ref: mondata.c attacktype() */
function attacktype(ptr, atyp) {
    return ptr.mattk.some((a) => a.aatyp === atyp);
}
/* C ref: mondata.c sticks() is engrave.js sticks() */

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
/* C ref: monmove.h m_canseeu() is monmove.js m_canseeu() */
function m_canseeu_nyi(m) {
    return m_canseeu_mm(m);
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
                if (await u_slip_free(magr, mattk)) {
                    mhm.damage = 0;
                    mhm.hitflags |= M_ATTK_MISS;
                } else {
                    set_ustuck(magr);
                    await pline(`${Monnam(magr)} grabs you!`); /* pline_mon() */
                    mhm.hitflags |= M_ATTK_HIT;
                }
            } else if (u.ustuck === magr) {
                exercise(A_STR, false);
                await pline(`You are being ${(pa === mons[M.PM_ROPE_GOLEM]) ? 'choked' : 'crushed'}.`);
            }
        } else { /* hand to hand weapon */
            const otmp = magr.mw || null; /* MON_WEP(magr) */

            if (mattk.aatyp === AT_WEAP && otmp) {
                let marmg;
                let tmp;
                const was_poisoned = (otmp.otrapped /* opoisoned */
                                      || permapoisoned(otmp));

                if (otmp.otyp === CORPSE
                    && touch_petrifies(mons[otmp.corpsenm])) {
                    mhm.damage = 1;
                    await pline(`${Monnam(magr)} hits you with the ${
                        mons[otmp.corpsenm].pmnames[NEUTRAL]} corpse.`); /* pline_mon() */
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
                    && marmg.otyp === GAUNTLETS_OF_POWER)
                    mhm.damage += rn1(4, 3); /* 3..6 */
                if (mhm.damage <= 0)
                    mhm.damage = 1;
                if (!otmp.oartifact
                    || await not_artifact_hit(magr, mdef, otmp, mhm)) {
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
    const orig_dmg = mhm.damage;

    if (magr === game.youmonst) {
        /* uhitm */
        if (await mgc_atk_negated(magr, mdef, true)) {
            mhm.damage = 0;
            return;
        }
        if (!Blind())
            await pline(`${Monnam(mdef)} is zapped!`);
        if (resists_elec(mdef) || defended(mdef, AD_ELEC)) {
            if (!Blind())
                await pline_The(`zap doesn't shock ${mon_nam(mdef)}!`);
            await golemeffects(mdef, AD_ELEC, mhm.damage);
            /* shieldeff(mdef->mx, mdef->my): transient display only */
            mhm.damage = 0;
        }
        mhm.damage += await destroy_items(mdef, AD_ELEC, orig_dmg);
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
                await destroy_items(game.youmonst, AD_ELEC, orig_dmg);
        } else
            mhm.damage = 0;
    } else {
        throw new Error('mhitm_ad_elec(): mhitm branch not ported yet');
    }
}

// C ref: uhitm.c mhitm_ad_stck()
export async function mhitm_ad_stck(magr, mattk, mdef, mhm) {
    const negated = await mgc_atk_negated(magr, mdef, false);
    const pd = mdef.data;
    const barbs = (magr.data === mons[M.PM_BARBED_DEVIL]);

    if (magr === game.youmonst) {
        /* uhitm */
        if (!negated && !sticks(pd) && m_next2u(mdef)) {
            set_ustuck(mdef); /* it's now stuck to you */
            if (barbs)
                await Your(`barbs stick to ${y_monnam(mdef)}!`);
        }
    } else if (mdef === game.youmonst) {
        /* mhitu */
        await hitmsg(magr, mattk);
        if (!negated && !game.u.ustuck && !sticks(pd)) {
            set_ustuck(magr);
            if (barbs)
                await pline('The barbs stick to you!');
        }
    } else {
        /* mhitm */
        if (negated)
            mhm.damage = 0;
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

// C ref: uhitm.c mhitm_ad_sgld()
async function mhitm_ad_sgld(magr, mattk, mdef, mhm) {
    const pa = magr.data;
    const pd = mdef.data;

    if (magr === game.youmonst) {
        throw new Error('mhitm_ad_sgld(): uhitm branch not ported yet');
    } else if (mdef === game.youmonst) {
        /* mhitu */
        await hitmsg(magr, mattk);
        if (pd.mlet === pa.mlet)
            return;
        if (!magr.mcan)
            await stealgold(magr);
    } else {
        throw new Error('mhitm_ad_sgld(): mhitm branch not ported yet');
    }
    void mhm;
}

// C ref: uhitm.c mhitm_ad_samu()
async function mhitm_ad_samu(magr, mattk, mdef, mhm) {
    if (magr === game.youmonst) {
        /* uhitm */
        mhm.damage = 0;
    } else if (mdef === game.youmonst) {
        /* mhitu */
        await hitmsg(magr, mattk);
        /* when the Wizard or quest nemesis hits, there's a 1/20 chance
           to steal a quest artifact (any, not just the one for the hero's
           own role) or the Amulet or one of the invocation tools */
        if (!rn2(20))
            await stealamulet(magr);
    } else {
        /* mhitm */
        mhm.damage = 0;
    }
}

// C ref: uhitm.c mhitm_ad_sedu()
/* seduce and also steal item */
async function mhitm_ad_sedu(magr, mattk, mdef, mhm) {
    if (magr === game.youmonst) {
        throw new Error('mhitm_ad_sedu(): uhitm branch (steal_it()) not ported yet');
    } else if (mdef === game.youmonst) {
        /* mhitu */
        const buf = { buf: '' };

        if (is_animal(magr.data)) {
            await hitmsg(magr, mattk);
            if (magr.mcan)
                return;
            /* Continue below */
        } else if (dmgtype(game.youmonst.data, M.AD_SEDU)
                   /* !SYSOPT_SEDUCE: when hero is attacking and AD_SSEX
                      is disabled, it would be changed to another damage
                      type, but when defending, it remains as-is */
                   || dmgtype(game.youmonst.data, M.AD_SSEX)) {
            await pline(`${Monnam(magr)} ${
                Deaf() ? "says something but you can't hear it"
                : (magr.minvent && magr.minvent.length)
                  ? "brags about the goods some dungeon explorer provided"
                : "makes some remarks about how difficult theft is lately"}.`); /* pline_mon() */
            if (!await tele_restrict(magr))
                await rloc(magr, RLOC_MSG);
            mhm.hitflags = M_ATTK_AGR_DONE; /* return 3??? */
            mhm.done = true;
            return;
        } else if (magr.mcan) {
            if (!Blind())
                await pline(`${Adjmonnam(magr, "plain")} tries to ${
                    game.flags.female ? "charm" : "seduce"} you, but you seem ${
                    game.flags.female ? "unaffected" : "uninterested"}.`);
            if (rn2(3)) {
                if (!await tele_restrict(magr))
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
            if (!is_animal(magr.data) && !await tele_restrict(magr))
                await rloc(magr, RLOC_MSG);
            if (is_animal(magr.data) && buf.buf) {
                if (canseemon(magr))
                    await pline(`${Monnam(magr)} tries to ${
                        locomotion(magr.data, "run")} away with ${buf.buf}.`); /* pline_mon() */
            }
            await monflee(magr, 0, false, false);
            mhm.hitflags = M_ATTK_AGR_DONE; /* return 3??? */
            mhm.done = true;
            return;
        }
    } else {
        throw new Error('mhitm_ad_sedu(): mhitm branch not ported yet');
    }
}

// C ref: uhitm.c mhitm_ad_ssex()
async function mhitm_ad_ssex(magr, mattk, mdef, mhm) {
    if (magr === game.youmonst) {
        /* uhitm */
        await mhitm_ad_sedu(magr, mattk, mdef, mhm);
        if (mhm.done)
            return;
    } else if (mdef === game.youmonst) {
        /* mhitu */
        if (true /* SYSOPT_SEDUCE: on in the recorded games */) {
            if (could_seduce(magr, mdef, mattk) === 1 && !magr.mcan)
                if (await doseduce(magr)) {
                    mhm.hitflags = M_ATTK_AGR_DONE;
                    mhm.done = true;
                    return;
                }
            return;
        }
    } else {
        /* mhitm */
        await mhitm_ad_sedu(magr, mattk, mdef, mhm);
        if (mhm.done)
            return;
    }
}

// C ref: uhitm.c do_stone_u()
async function do_stone_u(mtmp) {
    const u = game.u;
    if (!Stoned() && !Stone_resistance()
        && !(poly_when_stoned(game.youmonst.data)
             && await polymon(M.PM_STONE_GOLEM))) {
        let kformat = KILLED_BY_AN;
        let kname = pmname(mtmp.data, Mgender(mtmp));

        if (mtmp.data.geno & M.G_UNIQ) {
            if (!type_is_pname(mtmp.data))
                kname = the(kname);
            kformat = KILLED_BY;
        }
        await make_stoned(5, null, kformat, kname);
        return 1;
        /* done_in_by(mtmp, STONING); */
    }
    void u;
    return 0;
}

// C ref: uhitm.c mhitm_ad_ston()
async function mhitm_ad_ston(magr, mattk, mdef, mhm) {
    if (magr === game.youmonst) {
        throw new Error('mhitm_ad_ston(): uhitm branch not ported yet');
    } else if (mdef === game.youmonst) {
        /* mhitu */
        await hitmsg(magr, mattk);
        if (!rn2(3)) {
            if (magr.mcan) {
                if (!Deaf())
                    await You_hear(`a cough from ${mon_nam(magr)}!`);
            } else {
                if (Hallucination() && !Blind()) {
                    /* Soundeffect(se_cockatrice_hiss, 50); */
                    await You_hear("hissing."); /* You_hear() deals with Deaf */
                    await pline(`${Monnam(magr)} appears to be blowing you a kiss...`);
                } else if (!Deaf()) {
                    await You_hear(`${s_suffix(mon_nam(magr))} hissing!`);
                } else if (!Blind()) {
                    await pline(`${Monnam(magr)} seems to grimace.`);
                }
                /*
                 * 5.0:  New moon is no longer overridden by carrying a
                 * lizard corpse.
                 */
                if (!rn2(10) || game.flags.moonphase === NEW_MOON) {
                    if (await do_stone_u(magr)) {
                        mhm.hitflags = M_ATTK_HIT;
                        mhm.done = true;
                        return;
                    }
                }
            }
        }
    } else {
        throw new Error('mhitm_ad_ston(): mhitm branch (do_stone_mon()) not ported yet');
    }
}


// C ref: uhitm.c erode_armor()
export async function erode_armor(mdef, hurt) {
    let target;

    /* What the following code does: it keeps looping until it
     * finds a target for the rust monster.
     * Head, feet, etc... not covered by metal, or covered by
     * rusty metal, are not targets.  However, your body always
     * is, no matter what covers it.
     */
    for (;;) {
        switch (rn2(5)) {
        case 0:
            target = which_armor(mdef, W_ARMH);
            if (!target
                || await erode_obj(target, xname(target), hurt, EF_GREASE)
                       === ER_NOTHING)
                continue;
            break;
        case 1:
            target = which_armor(mdef, W_ARMC);
            if (target) {
                await erode_obj(target, xname(target), hurt,
                                EF_GREASE | EF_VERBOSE);
                break;
            }
            if ((target = which_armor(mdef, W_ARM)) != null) {
                await erode_obj(target, xname(target), hurt,
                                EF_GREASE | EF_VERBOSE);
            } else if ((target = which_armor(mdef, W_ARMU)) != null) {
                await erode_obj(target, xname(target), hurt,
                                EF_GREASE | EF_VERBOSE);
            }
            break;
        case 2:
            target = which_armor(mdef, W_ARMS);
            if (!target
                || await erode_obj(target, xname(target), hurt, EF_GREASE)
                       === ER_NOTHING)
                continue;
            break;
        case 3:
            target = which_armor(mdef, W_ARMG);
            if (!target
                || await erode_obj(target, xname(target), hurt, EF_GREASE)
                       === ER_NOTHING)
                continue;
            break;
        case 4:
            target = which_armor(mdef, W_ARMF);
            if (!target
                || await erode_obj(target, xname(target), hurt, EF_GREASE)
                       === ER_NOTHING)
                continue;
            break;
        }
        break; /* Out of while loop */
    }
}

// C ref: uhitm.c mhitm_ad_rust()
async function mhitm_ad_rust(magr, mattk, mdef, mhm) {
    const pd = mdef.data;

    if (magr === game.youmonst) {
        throw new Error('mhitm_ad_rust(): uhitm branch not ported yet');
    } else if (mdef === game.youmonst) {
        /* mhitu */
        await hitmsg(magr, mattk);
        if (magr.mcan) {
            return;
        }
        if (completelyrusts(pd)) {
            await You("rust!");
            /* KMH -- this is okay with unchanging */
            await rehumanize();
            return;
        }
        await erode_armor(game.youmonst, ERODE_RUST);
    } else {
        throw new Error('mhitm_ad_rust(): mhitm branch not ported yet');
    }
    void mhm;
}

// C ref: uhitm.c mhitm_ad_corr()
async function mhitm_ad_corr(magr, mattk, mdef, mhm) {
    if (magr === game.youmonst) {
        throw new Error('mhitm_ad_corr(): uhitm branch not ported yet');
    } else if (mdef === game.youmonst) {
        /* mhitu */
        await hitmsg(magr, mattk);
        if (magr.mcan)
            return;
        await erode_armor(mdef, ERODE_CORRODE);
    } else {
        throw new Error('mhitm_ad_corr(): mhitm branch not ported yet');
    }
    void mhm;
}

// C ref: uhitm.c mhitm_ad_dcay()
async function mhitm_ad_dcay(magr, mattk, mdef, mhm) {
    const pd = mdef.data;

    if (magr === game.youmonst) {
        throw new Error('mhitm_ad_dcay(): uhitm branch not ported yet');
    } else if (mdef === game.youmonst) {
        /* mhitu */
        await hitmsg(magr, mattk);
        if (magr.mcan)
            return;
        if (completelyrots(pd)) {
            await You("rot!");
            /* KMH -- this is okay with unchanging */
            await rehumanize();
            return;
        }
        await erode_armor(mdef, ERODE_ROT);
    } else {
        throw new Error('mhitm_ad_dcay(): mhitm branch not ported yet');
    }
    void mhm;
}

// C ref: uhitm.c mhitm_ad_dren()
async function mhitm_ad_dren(magr, mattk, mdef, mhm) {
    const negated = mhitm_mgc_atk_negated(magr, mdef, false).negated;

    if (magr === game.youmonst) {
        throw new Error('mhitm_ad_dren(): uhitm branch not ported yet');
    } else if (mdef === game.youmonst) {
        /* mhitu */
        await hitmsg(magr, mattk);
        if (!negated && !rn2(4)) /* 25% chance */
            await drain_en(mhm.damage, false);
        mhm.damage = 0;
    } else {
        throw new Error('mhitm_ad_dren(): mhitm branch not ported yet');
    }
}

// C ref: uhitm.c mhitm_ad_drli()
async function mhitm_ad_drli(magr, mattk, mdef, mhm) {
    if (magr === game.youmonst) {
        throw new Error('mhitm_ad_drli(): uhitm branch not ported yet');
    } else if (mdef === game.youmonst) {
        /* mhitu */
        await hitmsg(magr, mattk);
        if (!rn2(3) && !Drain_resistance()
            && !await mgc_atk_negated(magr, mdef, true)) {
            await losexp("life drainage");
            /* unlike hitting with Stormbringer, wounded attacker doesn't
               heal any from the drained life */
        }
    } else {
        throw new Error('mhitm_ad_drli(): mhitm branch not ported yet');
    }
    void mhm;
}

// C ref: mondata.c on_fire()
export function on_fire(mptr, mattk) {
    let what;

    switch (monsndx(mptr)) {
    case M.PM_FLAMING_SPHERE:
    case M.PM_FIRE_VORTEX:
    case M.PM_FIRE_ELEMENTAL:
    case M.PM_SALAMANDER:
        what = "already on fire";
        break;
    case M.PM_WATER_ELEMENTAL:
    case M.PM_FOG_CLOUD:
    case M.PM_STEAM_VORTEX:
        what = "boiling";
        break;
    case M.PM_ICE_VORTEX:
    case M.PM_GLASS_GOLEM:
        what = "melting";
        break;
    case M.PM_STONE_GOLEM:
    case M.PM_CLAY_GOLEM:
    case M.PM_GOLD_GOLEM:
    case M.PM_AIR_ELEMENTAL:
    case M.PM_EARTH_ELEMENTAL:
    case M.PM_DUST_VORTEX:
    case M.PM_ENERGY_VORTEX:
        what = "heating up";
        break;
    default:
        what = (mattk.aatyp === AT_HUGS) ? "being roasted" : "on fire";
        break;
    }
    return what;
}

// C ref: uhitm.c mhitm_ad_fire()
async function mhitm_ad_fire(magr, mattk, mdef, mhm) {
    const pd = mdef.data;
    const orig_dmg = mhm.damage; /* damage coming into the function */

    if (magr === game.youmonst) {
        /* uhitm */
        if (await mgc_atk_negated(magr, mdef, true)) {
            mhm.damage = 0;
            return;
        }
        if (!Blind())
            await pline(`${Monnam(mdef)} is ${on_fire(pd, mattk)}!`);
        if (completelyburns(pd)) { /* paper golem or straw golem */
            if (!Blind())
                /* note: the life-saved case is hypothetical because
                   life-saving doesn't work for golems */
                await pline(`${Monnam(mdef)} ${
                    !mlifesaver(mdef) ? "burns completely"
                                      : "is totally engulfed in flames"}!`);
            else
                await You(`smell burning${
                    (pd === mons[M.PM_PAPER_GOLEM]) ? " paper"
                      : (pd === mons[M.PM_STRAW_GOLEM]) ? " straw" : ""}.`);
            await xkilled(mdef, XKILL_NOMSG | XKILL_NOCORPSE);
            mhm.damage = 0;
            return;
            /* Don't return yet; keep hp<1 and mhm.damage=0 for pet msg */
        }
        if (resists_fire(mdef) || defended(mdef, AD_FIRE)) {
            if (!Blind())
                await pline_The(`fire doesn't heat ${mon_nam(mdef)}!`);
            await golemeffects(mdef, AD_FIRE, mhm.damage);
            /* shieldeff(mdef->mx, mdef->my): transient display only */
            mhm.damage = 0;
        }
        mhm.damage += await destroy_items(mdef, AD_FIRE, orig_dmg);
        await ignite_items(mdef.minvent);
    } else if (mdef === game.youmonst) {
        /* mhitu */
        await hitmsg(magr, mattk);
        if (!await mgc_atk_negated(magr, mdef, true)) {
            await pline(`You're ${on_fire(pd, mattk)}!`);
            if (completelyburns(pd)) { /* paper or straw golem */
                await You("go up in flames!");
                monstunseesu(M_SEEN_FIRE);
                /* KMH -- this is okay with unchanging */
                await rehumanize();
                return;
            } else if (Fire_resistance()) {
                await pline_The("fire doesn't feel hot!");
                monstseesu(M_SEEN_FIRE);
                mhm.damage = 0;
            } else {
                monstunseesu(M_SEEN_FIRE);
            }
            if (magr.m_lev > rn2(20)) {
                await destroy_items(game.youmonst, AD_FIRE, orig_dmg);
                await ignite_items(game.invent);
            }
            await burn_away_slime();
        } else {
            mhm.damage = 0;
        }
    } else {
        throw new Error('mhitm_ad_fire(): mhitm branch not ported yet');
    }
}

// C ref: uhitm.c mhitm_ad_cold()
async function mhitm_ad_cold(magr, mattk, mdef, mhm) {
    const orig_dmg = mhm.damage;

    if (magr === game.youmonst) {
        /* uhitm */
        if (await mgc_atk_negated(magr, mdef, true)) {
            mhm.damage = 0;
            return;
        }
        if (!Blind())
            await pline(`${Monnam(mdef)} is covered in frost!`);
        if (resists_cold(mdef) || defended(mdef, AD_COLD)) {
            /* shieldeff(mdef->mx, mdef->my): transient display only */
            if (!Blind())
                await pline_The(`frost doesn't chill ${mon_nam(mdef)}!`);
            await golemeffects(mdef, AD_COLD, mhm.damage);
            mhm.damage = 0;
        }
        mhm.damage += await destroy_items(mdef, AD_COLD, orig_dmg);
    } else if (mdef === game.youmonst) {
        /* mhitu */
        await hitmsg(magr, mattk);
        if (!await mgc_atk_negated(magr, mdef, true)) {
            await pline("You're covered in frost!");
            if (Cold_resistance()) {
                await pline_The("frost doesn't seem cold!");
                monstseesu(M_SEEN_COLD);
                mhm.damage = 0;
            } else {
                monstunseesu(M_SEEN_COLD);
            }
            if (magr.m_lev > rn2(20))
                await destroy_items(game.youmonst, AD_COLD, orig_dmg);
        } else
            mhm.damage = 0;
    } else {
        throw new Error('mhitm_ad_cold(): mhitm branch not ported yet');
    }
}

// C ref: uhitm.c mhitm_ad_acid()
async function mhitm_ad_acid(magr, mattk, mdef, mhm) {
    if (magr === game.youmonst) {
        throw new Error('mhitm_ad_acid(): uhitm branch not ported yet');
    } else if (mdef === game.youmonst) {
        /* mhitu */
        await hitmsg(magr, mattk);
        if (!magr.mcan && !rn2(3))
            if (Acid_resistance()) {
                await pline(`You're covered in ${hliquid("acid")}, but it seems harmless.`);
                monstseesu(M_SEEN_ACID);
                mhm.damage = 0;
            } else {
                await pline(`You're covered in ${hliquid("acid")}!  It burns!`);
                exercise(A_STR, false);
                monstunseesu(M_SEEN_ACID);
            }
        else
            mhm.damage = 0;
    } else {
        throw new Error('mhitm_ad_acid(): mhitm branch not ported yet');
    }
}

// C ref: uhitm.c mhitm_ad_tlpt()
async function mhitm_ad_tlpt(magr, mattk, mdef, mhm) {
    const u = game.u;

    if (magr === game.youmonst) {
        throw new Error('mhitm_ad_tlpt(): uhitm branch not ported yet');
    } else if (mdef === game.youmonst) {
        /* mhitu */
        let tmphp;

        await hitmsg(magr, mattk);
        if (await mgc_atk_negated(magr, mdef, false)) {
            await You("are not affected.");
        } else {
            if (game.flags.verbose)
                await Your(`position suddenly seems ${
                    (Teleport_control() && !Stunned() && !unconscious())
                        ? "" : "very "}uncertain!`);
            await tele();
            /* As of 3.6.2:  make sure damage isn't fatal; previously, it
               was possible to be teleported and then drop dead at
               the destination when QM's 1d4 damage gets applied below */
            if ((Half_physical_damage() ? Math.trunc((mhm.damage - 1) / 2) : mhm.damage)
                >= (tmphp = (Upolyd() ? u.mh : u.uhp))) {
                mhm.damage = tmphp - 1;
                if (Half_physical_damage())
                    mhm.damage *= 2; /* doesn't actually increase damage */
                if (mhm.damage < 1) { /* implies (tmphp <= 1) */
                    mhm.damage = 1;
                    /* this might increase current HP beyond maximum HP but it
                       will be immediately reduced by caller */
                    if (Upolyd() && u.mh === 1)
                        ++u.mh;
                    else if (!Upolyd() && u.uhp === 1)
                        ++u.uhp;
                    /* [don't set context.botl here] */
                }
            }
        }
    } else {
        throw new Error('mhitm_ad_tlpt(): mhitm branch not ported yet');
    }
}

// C ref: uhitm.c mhitm_ad_blnd()
async function mhitm_ad_blnd(magr, mattk, mdef, mhm) {
    if (magr === game.youmonst) {
        throw new Error('mhitm_ad_blnd(): uhitm branch not ported yet');
    } else if (mdef === game.youmonst) {
        /* mhitu */
        if (can_blnd(magr, mdef, mattk.aatyp, null)) {
            if (!Blind())
                await pline(`${Monnam(magr)} blinds you!`);
            await make_blinded((game.u.uprops[BLINDED].intrinsic & TIMEOUT)
                               + mhm.damage, false);
            if (!Blind()) /* => Eyes of the Overworld */
                await Your("vision quickly clears."); /* Your1(vision_clears) */
        }
        mhm.damage = 0;
    } else {
        throw new Error('mhitm_ad_blnd(): mhitm branch not ported yet');
    }
}

// C ref: uhitm.c mhitm_ad_curs()
async function mhitm_ad_curs(magr, mattk, mdef, mhm) {
    const u = game.u;
    const pa = magr.data;

    if (magr === game.youmonst) {
        throw new Error('mhitm_ad_curs(): uhitm branch not ported yet');
    } else if (mdef === game.youmonst) {
        /* mhitu */
        await hitmsg(magr, mattk);
        if (!night() && pa === mons[M.PM_GREMLIN])
            return;
        if (!magr.mcan && !rn2(10)) {
            if (!Deaf()) {
                /* Soundeffect(se_laughter, 40); */
                if (Blind()) {
                    await You_hear("laughter.");
                } else {
                    await pline(`${Monnam(magr)} chuckles.`); /* pline_mon() */
                }
            }
            if (u.umonnum === M.PM_CLAY_GOLEM) {
                await pline("Some writing vanishes from your head!");
                /* KMH -- this is okay with unchanging */
                await rehumanize();
                return;
            }
            await mon_give_prop(magr, await attrcurse());
        }
    } else {
        throw new Error('mhitm_ad_curs(): mhitm branch not ported yet');
    }
    void mhm;
}

// C ref: uhitm.c mhitm_ad_drin()
async function mhitm_ad_drin(magr, mattk, mdef, mhm) {
    const pd = mdef.data;

    if (magr === game.youmonst) {
        throw new Error('mhitm_ad_drin(): uhitm branch not ported yet');
    } else if (mdef === game.youmonst) {
        /* mhitu */
        await hitmsg(magr, mattk);
        if (defends(M.AD_DRIN, game.uwep) || !has_head(pd)) {
            await You("don't seem harmed.");
            /* attacker should skip remaining AT_TENT+AD_DRIN attacks */
            game.skipdrin = true;
            /* Not clear what to do for green slimes */
            return;
        }
        if (await u_slip_free(magr, mattk))
            return;
        if (game.uarmh && rn2(8)) {
            /* not body_part(HEAD) */
            await Your(`${helm_simple_name(game.uarmh)} blocks the attack to your head.`);
            return;
        }
        /* negative armor class doesn't reduce this damage */
        if (Half_physical_damage())
            mhm.damage = Math.trunc((mhm.damage + 1) / 2);
        await mdamageu(magr, mhm.damage);
        mhm.damage = 0; /* don't inflict a second dose below */

        if (!game.uarmh || game.uarmh.otyp !== DUNCE_CAP)
            throw new Error('mhitm_ad_drin(): eat_brains() not ported yet');
        /* adjattrib gives dunce cap message when appropriate */
        await adjattrib(A_INT, -rnd(2), false);
        if (!rn2(5)) {
            await losespells();
            game.skipdrin = true;
        }
        if (!rn2(5)) {
            await drain_weapon_skill(rnd(2));
            game.skipdrin = true;
        }
    } else {
        throw new Error('mhitm_ad_drin(): mhitm branch not ported yet');
    }
}

// C ref: uhitm.c mhitm_ad_wrap()
async function mhitm_ad_wrap(magr, mattk, mdef, mhm) {
    const u = game.u;
    const pd = mdef.data, pa = magr.data;
    const coil = slithy(pa) && (pa.mlet === M.S_SNAKE || pa.mlet === M.S_NAGA);

    if (magr === game.youmonst) {
        throw new Error('mhitm_ad_wrap(): uhitm branch not ported yet');
    } else if (mdef === game.youmonst) {
        /* mhitu */
        if ((!magr.mcan || u.ustuck === magr) && !sticks(pd)) {
            if (!u.ustuck && !rn2(10)) {
                if (await u_slip_free(magr, mattk)) {
                    mhm.damage = 0;
                } else {
                    set_ustuck(magr); /* before message, for botl update */
                    await urgent_pline(`${Some_Monnam(magr)} ${
                        coil ? "coils" : "swings"} itself around you!`);
                }
            } else if (u.ustuck === magr) {
                if (is_pool(magr.mx, magr.my) && !Swimming()
                    && !Amphibious() && !Breathless())
                    throw new Error('mhitm_ad_wrap(): drowning the hero not ported yet');
                else if (mattk.aatyp === AT_HUGS)
                    await You("are being crushed.");
            } else {
                mhm.damage = 0;
                if (game.flags.verbose) {
                    if (coil)
                        await pline(`${Monnam(magr)} brushes against you.`);
                    else
                        await pline(`${Monnam(magr)} brushes against your ${body_part(LEG)}.`);
                }
            }
        } else
            mhm.damage = 0;
    } else {
        throw new Error('mhitm_ad_wrap(): mhitm branch not ported yet');
    }
}

// C ref: uhitm.c mhitm_ad_plys()
async function mhitm_ad_plys(magr, mattk, mdef, mhm) {
    if (magr === game.youmonst) {
        throw new Error('mhitm_ad_plys(): uhitm branch not ported yet');
    } else if (mdef === game.youmonst) {
        /* mhitu */
        await hitmsg(magr, mattk);
        if (game.multi >= 0 && !rn2(3)
            && !await mgc_atk_negated(magr, mdef, true)) {
            if (Free_action()) {
                await You("momentarily stiffen.");
            } else {
                if (Blind())
                    await You("are frozen!");
                else
                    await You(`are frozen by ${mon_nam(magr)}!`);
                game.nomovemsg = "You can move again."; /* You_can_move_again */
                nomul(-rnd(10));
                /* set gm.multi_reason;
                   3.6.x used "paralyzed by a monster"; be more specific */
                dynamic_multi_reason(magr, "paralyzed", false);
                exercise(A_DEX, false);
            }
        }
    } else {
        throw new Error('mhitm_ad_plys(): mhitm branch not ported yet');
    }
    void mhm;
}

// C ref: uhitm.c mhitm_ad_slee()
async function mhitm_ad_slee(magr, mattk, mdef, mhm) {
    if (magr === game.youmonst) {
        throw new Error('mhitm_ad_slee(): uhitm branch not ported yet');
    } else if (mdef === game.youmonst) {
        /* mhitu */
        await hitmsg(magr, mattk);
        if (game.multi >= 0 && !rn2(5)
            && !await mgc_atk_negated(magr, mdef, true)) {
            if (Sleep_resistance()) {
                monstseesu(M_SEEN_SLEEP);
                return;
            }
            monstunseesu(M_SEEN_SLEEP);
            await fall_asleep(-rnd(10), true);
            if (Blind())
                await You("are put to sleep!");
            else
                await You(`are put to sleep by ${mon_nam(magr)}!`);
        }
    } else {
        throw new Error('mhitm_ad_slee(): mhitm branch not ported yet');
    }
    void mhm;
}

// C ref: uhitm.c mhitm_ad_slim()
async function mhitm_ad_slim(magr, mattk, mdef, mhm) {
    const negated = mhitm_mgc_atk_negated(magr, mdef, false).negated;
    const pd = mdef.data;

    if (magr === game.youmonst) {
        throw new Error('mhitm_ad_slim(): uhitm branch not ported yet');
    } else if (mdef === game.youmonst) {
        /* mhitu */
        await hitmsg(magr, mattk);
        if (negated) {
            if (!magr.mcan)
                await You("escape harm.");
            return;
        }
        if (flaming(pd)) {
            await pline_The("slime burns away!");
            mhm.damage = 0;
        } else if (Unchanging() || noncorporeal(pd)
                   || pd === mons[M.PM_GREEN_SLIME]) {
            await You("are unaffected.");
            mhm.damage = 0;
        } else if (!Slimed()) {
            await You("don't feel very well.");
            await make_slimed(10, null);
            delayed_killer(SLIMED, KILLED_BY_AN,
                           pmname(magr.data, Mgender(magr)));
        } else
            await pline("Yuck!");
    } else {
        throw new Error('mhitm_ad_slim(): mhitm branch not ported yet');
    }
}

// C ref: uhitm.c mhitm_ad_ench()
async function mhitm_ad_ench(magr, mattk, mdef, mhm) {
    if (magr === game.youmonst) {
        /* uhitm */
        /* there's no msomearmor() function, so just do damage */
    } else if (mdef === game.youmonst) {
        /* mhitu */
        const negated = mhitm_mgc_atk_negated(magr, mdef, false).negated;

        await hitmsg(magr, mattk);
        /* uncancelled is sufficient enough; please
           don't make this attack less frequent */
        if (!negated) {
            let obj = some_armor(mdef);

            if (!obj) {
                /* some rings are susceptible;
                   amulets and blindfolds aren't (at present) */
                switch (rn2(5)) {
                case 0:
                    break;
                case 1:
                    obj = game.uright;
                    break;
                case 2:
                    obj = game.uleft;
                    break;
                case 3:
                    obj = game.uamul;
                    break;
                case 4:
                    obj = game.ublindf;
                    break;
                }
            }
            if (obj && drain_item(obj, false)) {
                await pline(`${Yobjnam2(obj, "seem")} less effective.`);
            }
        }
    } else {
        /* mhitm */
        /* there's no msomearmor() function, so just do damage */
    }
    void mhm;
}

// C ref: uhitm.c mhitm_ad_slow()
async function mhitm_ad_slow(magr, mattk, mdef, mhm) {
    const negated = mhitm_mgc_atk_negated(magr, mdef, false).negated;

    if (defended(mdef, M.AD_SLOW))
        return;

    if (magr === game.youmonst) {
        throw new Error('mhitm_ad_slow(): uhitm branch not ported yet');
    } else if (mdef === game.youmonst) {
        /* mhitu */
        await hitmsg(magr, mattk);
        if (!negated && game.u.uprops[FAST].intrinsic && !rn2(4))
            await u_slow_down();
    } else {
        throw new Error('mhitm_ad_slow(): mhitm branch not ported yet');
    }
    void mhm;
}

// C ref: uhitm.c mhitm_ad_conf()
async function mhitm_ad_conf(magr, mattk, mdef, mhm) {
    if (magr === game.youmonst) {
        throw new Error('mhitm_ad_conf(): uhitm branch not ported yet');
    } else if (mdef === game.youmonst) {
        /* mhitu */
        await hitmsg(magr, mattk);
        if (!magr.mcan && !rn2(4) && !magr.mspec_used) {
            magr.mspec_used = magr.mspec_used + (mhm.damage + rn2(6));
            if (Confusion())
                await You("are getting even more confused.");
            else
                await You("are getting confused.");
            await make_confused(game.u.uprops[CONFUSION].intrinsic + mhm.damage, false);
        }
        mhm.damage = 0;
    } else {
        throw new Error('mhitm_ad_conf(): mhitm branch not ported yet');
    }
}

// C ref: uhitm.c mhitm_ad_poly()
async function mhitm_ad_poly(magr, mattk, mdef, mhm) {
    const u = game.u;
    const negated = (mhitm_mgc_atk_negated(magr, mdef, false).negated
                     || !!magr.mspec_used);

    if (magr === game.youmonst) {
        /* uhitm */
        /* require weaponless attack in order to honor AD_POLY */
        if (!game.uwep && mhm.damage < mdef.mhp) {
            if (negated) {
                /* assume that you can tell by touch if blinded */
                await pline(`${Monnam(mdef)} is not transformed.`);
            } else {
                mhm.damage = await mon_poly(game.youmonst, mdef, mhm.damage);
                if (mdef.mhp < 1) /* DEADMONSTER(mdef) */
                    mhm.hitflags |= M_ATTK_DEF_DIED;
                mhm.hitflags |= M_ATTK_HIT;
                mhm.done = true;
            }
        }
    } else if (mdef === game.youmonst) {
        /* mhitu */
        await hitmsg(magr, mattk);
        if (Maybe_Half_Phys(mhm.damage) < (Upolyd() ? u.mh : u.uhp)) {
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
            if (mdef.mhp < 1) /* DEADMONSTER(mdef) */
                mhm.hitflags |= M_ATTK_DEF_DIED;
            mhm.hitflags |= M_ATTK_HIT;
            mhm.done = true;
        }
    }
}

// C ref: uhitm.c mhitm_ad_famn()
async function mhitm_ad_famn(magr, mattk, mdef, mhm) {
    if (magr === game.youmonst) {
        throw new Error('mhitm_ad_famn(): uhitm branch not ported yet');
    } else if (mdef === game.youmonst) {
        /* mhitu */
        await pline(`${Monnam(magr)} reaches out, and your body shrivels.`); /* pline_mon() */
        exercise(A_CON, false);
        if (!is_fainted())
            await morehungry(rn1(40, 40));
        /* plus the normal damage */
    } else {
        throw new Error('mhitm_ad_famn(): mhitm branch not ported yet');
    }
    void mattk; void mhm;
}

// C ref: uhitm.c mhitm_ad_pest()
async function mhitm_ad_pest(magr, mattk, mdef, mhm) {
    const pa = magr.data;

    if (magr === game.youmonst) {
        throw new Error('mhitm_ad_pest(): uhitm branch not ported yet');
    } else if (mdef === game.youmonst) {
        /* mhitu */
        await pline(`${Monnam(magr)} reaches out, and you feel fever and chills.`); /* pline_mon() */
        await diseasemu(pa);
        /* plus the normal damage */
    } else {
        throw new Error('mhitm_ad_pest(): mhitm branch not ported yet');
    }
    void mattk; void mhm;
}

// C ref: uhitm.c mhitm_ad_deth()
async function mhitm_ad_deth(magr, mattk, mdef, mhm) {
    const pd = mdef.data;

    if (magr === game.youmonst) {
        throw new Error('mhitm_ad_deth(): uhitm branch not ported yet');
    } else if (mdef === game.youmonst) {
        /* mhitu */
        await pline(`${Monnam(magr)} reaches out with its deadly touch.`); /* pline_mon() */
        if (is_undead(pd)) {
            /* still does some damage */
            mhm.damage = Math.trunc((mhm.damage + 1) / 2);
            await pline("Was that the touch of death?");
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
            /*FALLTHRU*/
        // eslint-disable-next-line no-fallthrough
        default: /* case 16: ... case 5: */
            await You_feel("your life force draining away...");
            mhm.permdmg = 1; /* actual damage done by caller */
            return;
        case 4:
        case 3:
        case 2:
        case 1:
        case 0:
            if (Antimagic())
                throw new Error('mhitm_ad_deth(): shieldeff() not ported yet');
            await pline("Lucky for you, it didn't work!");
            mhm.damage = 0;
            return;
        }
    } else {
        throw new Error('mhitm_ad_deth(): mhitm branch not ported yet');
    }
    void mattk;
}

// C ref: uhitm.c mhitm_ad_halu()
async function mhitm_ad_halu(magr, mattk, mdef, mhm) {
    if (magr === game.youmonst) {
        throw new Error('mhitm_ad_halu(): uhitm branch not ported yet');
    } else if (mdef === game.youmonst) {
        /* mhitu */
        mhm.damage = 0;
    } else {
        throw new Error('mhitm_ad_halu(): mhitm branch not ported yet');
    }
    void mattk;
}

// C ref: uhitm.c mhitm_ad_were()
async function mhitm_ad_were(magr, mattk, mdef, mhm) {
    const u = game.u;
    const pa = magr.data;

    if (magr === game.youmonst) {
        /* uhitm */
        await mhitm_ad_phys(magr, mattk, mdef, mhm);
        if (mhm.done)
            return;
    } else if (mdef === game.youmonst) {
        /* mhitu */
        await hitmsg(magr, mattk);
        if (!rn2(4) && (u.ulycn ?? NON_PM) === NON_PM
            && !Protection_from_shape_changers() && !defends(M.AD_WERE, game.uwep)
            && !await mgc_atk_negated(magr, mdef, true)) {
            await urgent_pline("You feel feverish.");
            exercise(A_CON, false);
            /* set_ulycn(monsndx(pa)) */
            u.ulycn = monsndx(pa);
            set_uasmon();
            await retouch_equipment(2);
        }
    } else {
        /* mhitm */
        await mhitm_ad_phys(magr, mattk, mdef, mhm);
        if (mhm.done)
            return;
    }
}

// C ref: uhitm.c mhitm_ad_heal()
async function mhitm_ad_heal(magr, mattk, mdef, mhm) {
    const u = game.u;
    const pd = mdef.data;

    if (magr === game.youmonst) {
        throw new Error('mhitm_ad_heal(): uhitm branch not ported yet');
    } else if (mdef === game.youmonst) {
        /* mhitu */
        /* a cancelled nurse is just an ordinary monster,
         * nurses don't heal those that cause petrification */
        if (magr.mcan || (Upolyd() && touch_petrifies(pd))) {
            await hitmsg(magr, mattk);
            return;
        }
        /* weapon check should match the one in sounds.c for MS_NURSE */
        if (!(game.uwep && (game.uwep.oclass === WEAPON_CLASS || is_weptool(game.uwep)))
            && !game.uarmu && !game.uarm && !game.uarmc
            && !game.uarms && !game.uarmg && !game.uarmf && !game.uarmh) {
            let goaway = false;

            await pline(`${Monnam(magr)} hits!  (I hope you don't mind.)`); /* pline_mon() */
            if (Upolyd()) {
                u.mh += rnd(7);
                if (!rn2(7)) {
                    /* no upper limit necessary; effect is temporary */
                    u.mhmax++;
                    if (!rn2(13))
                        goaway = true;
                }
                if (u.mh > u.mhmax)
                    u.mh = u.mhmax;
            } else {
                u.uhp += rnd(7);
                if (!rn2(7)) {
                    /* hard upper limit via nurse care: 25 * ulevel */
                    if (u.uhpmax < 5 * u.ulevel + d(2 * u.ulevel, 10)) {
                        u.uhpmax++;
                        if (u.uhpmax > u.uhppeak)
                            u.uhppeak = u.uhpmax;
                    }
                    if (!rn2(13))
                        goaway = true;
                }
                if (u.uhp > u.uhpmax)
                    u.uhp = u.uhpmax;
            }
            if (!rn2(3))
                exercise(A_STR, true);
            if (!rn2(3))
                exercise(A_CON, true);
            if (u.uprops[SICK].intrinsic) /* Sick */
                await make_sick(0, null, false, SICK_ALL);
            game.disp_botl = true;
            if (goaway) {
                await mongone(magr);
                mhm.done = true;
                mhm.hitflags = M_ATTK_DEF_DIED; /* return 2??? */
                return;
            } else if (!rn2(33)) {
                if (!await tele_restrict(magr))
                    await rloc(magr, RLOC_MSG);
                await monflee(magr, d(3, 6), true, false);
                mhm.done = true;
                mhm.hitflags = M_ATTK_HIT | M_ATTK_DEF_DIED; /* return 3??? */
                return;
            }
            mhm.damage = 0;
        } else {
            if (Role_if(M.PM_HEALER)) {
                if (!Deaf() && !(game.moves % 5)) {
                    /* SetVoice(magr, 0, 80, 0); */
                    await pline("\"Doc, I can't help you unless you cooperate.\""); /* verbalize() */
                }
                mhm.damage = 0;
            } else
                await hitmsg(magr, mattk);
        }
    } else {
        throw new Error('mhitm_ad_heal(): mhitm branch not ported yet');
    }
}

// C ref: uhitm.c mhitm_ad_stun()
async function mhitm_ad_stun(magr, mattk, mdef, mhm) {
    if (magr === game.youmonst) {
        throw new Error('mhitm_ad_stun(): uhitm branch not ported yet');
    } else if (mdef === game.youmonst) {
        /* mhitu */
        await hitmsg(magr, mattk);
        if (!magr.mcan && !rn2(4)) {
            await make_stunned((game.u.uprops[STUNNED].intrinsic & TIMEOUT)
                               + mhm.damage, true);
            mhm.damage = Math.trunc(mhm.damage / 2);
        }
    } else {
        throw new Error('mhitm_ad_stun(): mhitm branch not ported yet');
    }
}

// C ref: uhitm.c mhitm_ad_legs()
async function mhitm_ad_legs(magr, mattk, mdef, mhm) {
    const u = game.u;

    if (magr === game.youmonst) {
        throw new Error('mhitm_ad_legs(): uhitm branch not ported yet');
    } else if (mdef === game.youmonst) {
        /* mhitu */
        const side = rn2(2) ? RIGHT_SIDE : LEFT_SIDE;
        const sidestr = (side === RIGHT_SIDE) ? "right" : "left",
              Monst_name = Monnam(magr), leg = body_part(LEG);

        /* This case is too obvious to ignore, but Nethack is not in
         * general very good at considering height--most short monsters
         * still _can_ attack you when you're flying or mounted.
         */
        if ((u.usteed || Levitation() || Flying())
            && !is_flyer(magr.data)) {
            await pline(`${Monst_name} tries to reach your ${sidestr} ${leg}!`);
            mhm.damage = 0;
        } else if (magr.mcan) {
            await pline(`${Monnam(magr)} nuzzles against your ${sidestr} ${leg}!`); /* pline_mon() */
            mhm.damage = 0;
        } else {
            if (game.uarmf) {
                if (rn2(2) && (game.uarmf.otyp === LOW_BOOTS
                               || game.uarmf.otyp === IRON_SHOES)) {
                    await pline(`${Monst_name} pricks the exposed part of your ${sidestr} ${leg}!`);
                } else if (!rn2(5)) {
                    await pline(`${Monst_name} pricks through your ${sidestr} boot!`);
                } else {
                    await pline(`${Monst_name} scratches your ${sidestr} boot!`);
                    mhm.damage = 0;
                    return;
                }
            } else
                await pline(`${Monst_name} pricks your ${sidestr} ${leg}!`);
            await set_wounded_legs(side, rnd(60 - ACURR(A_DEX)));
            exercise(A_STR, false);
            exercise(A_DEX, false);
        }
    } else {
        throw new Error('mhitm_ad_legs(): mhitm branch not ported yet');
    }
    void mattk;
}

// C ref: uhitm.c mhitm_ad_dgst()
async function mhitm_ad_dgst(magr, mattk, mdef, mhm) {
    if (magr === game.youmonst) {
        throw new Error('mhitm_ad_dgst(): uhitm branch not ported yet');
    } else if (mdef === game.youmonst) {
        /* mhitu */
        mhm.damage = 0;
    } else {
        throw new Error('mhitm_ad_dgst(): mhitm branch not ported yet');
    }
    void mattk;
}

// C ref: uhitm.c mhitm_ad_dise()
async function mhitm_ad_dise(magr, mattk, mdef, mhm) {
    const pa = magr.data;

    if (magr === game.youmonst) {
        throw new Error('mhitm_ad_dise(): uhitm branch not ported yet');
    } else if (mdef === game.youmonst) {
        /* mhitu */
        await hitmsg(magr, mattk);
        if (!await diseasemu(pa))
            mhm.damage = 0;
    } else {
        throw new Error('mhitm_ad_dise(): mhitm branch not ported yet');
    }
}

// C ref: uhitm.c mhitm_adtyping()
export async function mhitm_adtyping(magr, mattk, mdef, mhm) {
    switch (mattk.adtyp) {
    case M.AD_STUN: await mhitm_ad_stun(magr, mattk, mdef, mhm); break;
    case M.AD_LEGS: await mhitm_ad_legs(magr, mattk, mdef, mhm); break;
    case M.AD_WERE: await mhitm_ad_were(magr, mattk, mdef, mhm); break;
    case M.AD_HEAL: await mhitm_ad_heal(magr, mattk, mdef, mhm); break;
    case AD_PHYS: await mhitm_ad_phys(magr, mattk, mdef, mhm); break;
    case M.AD_FIRE: await mhitm_ad_fire(magr, mattk, mdef, mhm); break;
    case M.AD_COLD: await mhitm_ad_cold(magr, mattk, mdef, mhm); break;
    case AD_ELEC: await mhitm_ad_elec(magr, mattk, mdef, mhm); break;
    case M.AD_ACID: await mhitm_ad_acid(magr, mattk, mdef, mhm); break;
    case AD_STON: await mhitm_ad_ston(magr, mattk, mdef, mhm); break;
    case M.AD_SSEX: await mhitm_ad_ssex(magr, mattk, mdef, mhm); break;
    case M.AD_SITM:
    case M.AD_SEDU: await mhitm_ad_sedu(magr, mattk, mdef, mhm); break;
    case M.AD_SGLD: await mhitm_ad_sgld(magr, mattk, mdef, mhm); break;
    case M.AD_TLPT: await mhitm_ad_tlpt(magr, mattk, mdef, mhm); break;
    case M.AD_BLND: await mhitm_ad_blnd(magr, mattk, mdef, mhm); break;
    case M.AD_CURS: await mhitm_ad_curs(magr, mattk, mdef, mhm); break;
    case M.AD_DRLI: await mhitm_ad_drli(magr, mattk, mdef, mhm); break;
    case M.AD_RUST: await mhitm_ad_rust(magr, mattk, mdef, mhm); break;
    case M.AD_CORR: await mhitm_ad_corr(magr, mattk, mdef, mhm); break;
    case M.AD_DCAY: await mhitm_ad_dcay(magr, mattk, mdef, mhm); break;
    case M.AD_DREN: await mhitm_ad_dren(magr, mattk, mdef, mhm); break;
    case M.AD_DRST:
    case M.AD_DRDX:
    case M.AD_DRCO: await mhitm_ad_drst(magr, mattk, mdef, mhm); break;
    case M.AD_DRIN: await mhitm_ad_drin(magr, mattk, mdef, mhm); break;
    case AD_STCK: await mhitm_ad_stck(magr, mattk, mdef, mhm); break;
    case M.AD_WRAP: await mhitm_ad_wrap(magr, mattk, mdef, mhm); break;
    case M.AD_PLYS: await mhitm_ad_plys(magr, mattk, mdef, mhm); break;
    case M.AD_SLEE: await mhitm_ad_slee(magr, mattk, mdef, mhm); break;
    case M.AD_SLIM: await mhitm_ad_slim(magr, mattk, mdef, mhm); break;
    case M.AD_ENCH: await mhitm_ad_ench(magr, mattk, mdef, mhm); break;
    case M.AD_SLOW: await mhitm_ad_slow(magr, mattk, mdef, mhm); break;
    case M.AD_CONF: await mhitm_ad_conf(magr, mattk, mdef, mhm); break;
    case M.AD_POLY: await mhitm_ad_poly(magr, mattk, mdef, mhm); break;
    case M.AD_DISE: await mhitm_ad_dise(magr, mattk, mdef, mhm); break;
    case M.AD_SAMU: await mhitm_ad_samu(magr, mattk, mdef, mhm); break;
    case M.AD_DETH: await mhitm_ad_deth(magr, mattk, mdef, mhm); break;
    case M.AD_PEST: await mhitm_ad_pest(magr, mattk, mdef, mhm); break;
    case M.AD_FAMN: await mhitm_ad_famn(magr, mattk, mdef, mhm); break;
    case M.AD_DGST: await mhitm_ad_dgst(magr, mattk, mdef, mhm); break;
    case M.AD_HALU: await mhitm_ad_halu(magr, mattk, mdef, mhm); break;
    default:
        mhm.damage = 0;
    }
}

// C ref: uhitm.c mhitm_knockback(); hf.hitflags is C's *hitflags
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

    /* subtly vary the message text if monster won't actually move */
    const dismount = false; /* (mounted hero is not ported above) */
    const was_u = false;
    const knockedhow = dismount ? "out of your saddle"
                       : will_hurtle(mdef, defx + dx, defy + dy) ? "backward"
                         : "back";

    /* give the message */
    if (u_def || canseemon(mdef)) {
        const magrbuf = u_agr ? "You" : Monnam(magr);
        const mdefbuf = (u_def || was_u) ? "you" : y_monnam(mdef);
        /*
         * uhitm: You knock the gnome back with a powerful blow!
         * mhitu: The red dragon knocks you back with a forceful blow!
         * mhitm: The fire giant knocks the gnome back with a forceful strike!
         */
        const how = rn2(2) ? "forceful" : "powerful";
        const what = rn2(2) ? "blow" : "strike";
        await pline(`${magrbuf} ${vtense(magrbuf, "knock")} ${mdefbuf} ${
            knockedhow} with a ${how} ${what}!`);
    } else if (u_agr) {
        /* hero knocks unseen foe back; noticed by touch */
        await You_feel(`${some_mon_nam(mdef)} be knocked ${knockedhow}!`);
    }

    if (u.ustuck && (u_def || u_agr))
        await unstuck(u.ustuck);

    /* do the actual knockback effect */
    if (u_def) {
        await hurtle(dx, dy, knockdistance, false);
        hf.hitflags |= M_ATTK_HIT;
        set_apparxy(magr); /* update magr's idea of where you are */
        if (!Stunned() && !rn2(4))
            await make_stunned(knockdistance + 1, true); /* 2 or 3 */
    } else {
        await mhurtle(mdef, dx, dy, knockdistance);
        if (!u_agr)
            hf.hitflags |= M_ATTK_HIT;
        if (DEADMONSTER(mdef)) {
            if (!was_u)
                hf.hitflags |= M_ATTK_DEF_DIED;
        } else if (!rn2(4)) {
            mdef.mstun = 1;
            /* if steed and hero were knocked back, update attacker's idea
               of where hero is */
            if (mdef === u.usteed)
                set_apparxy(magr);
        }
    }
    if (!u_agr) {
        if (DEADMONSTER(magr))
            hf.hitflags |= M_ATTK_AGR_DIED;
    }

    return true;
}

/* C ref: obj.h u_wield_art() */
function u_wield_art(art) { return !!(game.uwep && game.uwep.oartifact === art); }
/* C ref: mondata.h is_longworm() */
function is_longworm(ptr) {
    return ptr === mons[PM_LONG_WORM] || ptr === mons[PM_LONG_WORM_TAIL];
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
                    if (canspotmon(mtmp) && mtmp.isshk) {
                        await dopay(); /* return ECMD_TIME | dopay(): nonzero */
                        return true;
                    }

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
function M_AP_TYPE(mon) { return (mon.m_ap_type || 0) & M_AP_TYPMASK; }
function NODIAG(monnum) { return monnum === M.PM_GRID_BUG; }
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
        if (!Blind_telepat()) /* !Blind_telepat */
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
        if (mtmp.minvis && !See_invisible()) /* !See_invisible */
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
        await angry_guards(!!Deaf());
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

    if (obj.oartifact) {
        const dmgp = { val: hmd.dmg };
        const arthit = await artifact_hit(game.youmonst, mon, obj, dmgp,
                                          hmd.dieroll);
        hmd.dmg = dmgp.val;
        if (arthit) {
            /* artifact_hit updates 'tmp' but doesn't inflict any
               damage; however, it might cause carried items to be
               destroyed and they might do so */
            if (DEADMONSTER(mon)) { /* artifact killed monster */
                hmd.doreturn = true;
                hmd.retval = false;
                return;
            }
            /* perhaps artifact tried to behead a headless monster */
            if (hmd.dmg === 0) {
                hmd.doreturn = true;
                hmd.retval = true;
                return;
            }
            hmd.hittxt = true;
        }
    }
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
        if (obj.otrapped /* opoisoned */ && is_poisonable(obj))
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

// C ref: uhitm.c hmon_hitmon_potion()
async function hmon_hitmon_potion(hmd, mon, obj) /* obj is not NULL */ {
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
    hmd.dmg = (hmd.mdat === mons[M.PM_SHADE]) ? 0 : 1;
}

/* C ref: hacklib.c plur() */
function plur(x) { return (x === 1) ? "" : "s"; }

// C ref: uhitm.c hmon_hitmon_misc_obj()
async function hmon_hitmon_misc_obj(hmd, mon, obj) /* obj is not NULL */ {
    switch (obj.otyp) {
    case BOULDER:         /* 1d20 */
    case HEAVY_IRON_BALL: /* 1d25 */
    case IRON_CHAIN:      /* 1d4+1 */
        hmd.dmg = dmgval(obj, mon);
        break;
    case MIRROR:
        if (breaktest(obj)) {
            await You(`break ${ysimple_name(obj)}.  That's bad luck!`);
            change_luck(-2);
            useup(obj);
            obj = null;
            hmd.unarmed = false; /* avoid obj==0 confusion */
            hmd.get_dmg_bonus = false;
            hmd.hittxt = true;
        }
        hmd.dmg = 1;
        break;
    case EXPENSIVE_CAMERA:
        throw new Error('hmon_hitmon_misc_obj(): release_camera_demon() not ported yet');
    case CORPSE: /* fixed by polder@cs.vu.nl */
        if (touch_petrifies(mons[obj.corpsenm])) {
            hmd.dmg = 1;
            hmd.hittxt = true;
            await You(`hit ${mon_nam(mon)} with ${corpse_xname(obj, null,
                obj.dknown ? CXN_PFX_THE : CXN_ARTICLE)}.`);
            observe_object(obj, Hallucination());
            if (!await munstone(mon, true))
                throw new Error('hmon_hitmon_misc_obj(): minstapetrify() not ported yet');
            if (resists_ston(mon))
                break;
            /* note: hp may be <= 0 even if munstoned==TRUE */
            hmd.doreturn = true;
            hmd.retval = !DEADMONSTER(mon);
            return;
        }
        hmd.dmg = (ismnum(obj.corpsenm) ? mons[obj.corpsenm].msize
                   : 0) + 1;
        break;
    case EGG: {
        const cnt = obj.quan;
        /* C's useup_eggs(o) macro */
        const useup_eggs = (o) => {
            if (hmd.thrown)
                obfree(o, null);
            else
                useupall(o);
        };

        hmd.dmg = 1; /* nominal physical damage */
        hmd.get_dmg_bonus = false;
        hmd.hittxt = true; /* message always given */
        /* egg is always either used up or transformed, so next
           hand-to-hand attack should yield a "bashing" mesg */
        if (obj === game.uwep)
            game.unweapon = true;
        if (obj.spe && ismnum(obj.corpsenm)) {
            if (obj.quan < 5)
                change_luck(-(obj.quan));
            else
                change_luck(-5);
        }

        if (ismnum(obj.corpsenm)
            && touch_petrifies(mons[obj.corpsenm])) {
            /*learn_egg_type(obj->corpsenm);*/
            await pline(`Splat!  You hit ${mon_nam(mon)} with ${
                obj.known ? "the" : cnt > 1 ? "some" : "a"} ${
                obj.known ? mons[obj.corpsenm].pmnames[NEUTRAL]
                : "petrifying"} egg${plur(cnt)}!`);
            obj.known = 1; /* (not much point...) */
            useup_eggs(obj);
            obj = null;
            if (!await munstone(mon, true))
                throw new Error('hmon_hitmon_misc_obj(): minstapetrify() not ported yet');
            if (resists_ston(mon))
                break;
            hmd.doreturn = true;
            hmd.retval = !DEADMONSTER(mon);
            return;
        } else { /* ordinary egg(s) */
            const mnum = obj.corpsenm;
            const eggp =
                (ismnum(mnum) && obj.known)
                    ? the(mons[mnum].pmnames[NEUTRAL])
                    : (cnt > 1) ? "some" : "an";

            await You(`hit ${mon_nam(mon)} with ${eggp} egg${plur(cnt)}.`);
            if (touch_petrifies(hmd.mdat) && !stale_egg(obj)) {
                await pline_The(`egg${plur(cnt)} ${
                    (cnt === 1) ? "isn't" : "aren't"} alive any more...`);
                if (obj.timed)
                    obj_stop_timers(obj);
                obj.otyp = ROCK;
                obj.oclass = GEM_CLASS;
                obj.oartifact = 0;
                obj.spe = 0;
                obj.known = obj.dknown = obj.bknown = 0;
                obj.owt = weight(obj);
                if (hmd.thrown)
                    place_object(obj, mon.mx, mon.my);
            } else if (obj.corpsenm === M.PM_PYROLISK) {
                useup_eggs(obj);
                obj = null;
                await explode(mon.mx, mon.my, -11, d(3, 6), 0, EXPL_FIERY);
                hmd.doreturn = true;
                hmd.retval = !DEADMONSTER(mon);
                return;
            } else {
                await pline("Splat!");
                useup_eggs(obj);
                obj = null;
                exercise(A_WIS, false);
            }
        }
        break;
    }
    case CLOVE_OF_GARLIC: /* no effect against demons */
        if (is_undead(hmd.mdat) || is_vampshifter(mon)) {
            await monflee(mon, d(2, 4), false, true);
        }
        hmd.dmg = 1;
        break;
    case CREAM_PIE:
    case BLINDING_VENOM:
        mon.msleeping = 0;
        if (can_blnd(game.youmonst, mon,
                     (obj.otyp === BLINDING_VENOM) ? AT_SPIT : AT_WEAP,
                     obj)) {
            if (Blind()) {
                await pline(obj.otyp === CREAM_PIE ? "Splat!" : "Splash!");
            } else if (obj.otyp === BLINDING_VENOM) {
                await pline_The(`venom blinds ${mon_nam(mon)}${
                    mon.mcansee ? "" : " further"}!`);
            } else {
                let whom = mon_nam(mon);
                let what = The(xname(obj));

                if (!hmd.thrown && obj.quan > 1)
                    what = An(singular(obj, xname));
                /* note: s_suffix returns a modifiable buffer */
                if (haseyes(hmd.mdat)
                    && hmd.mdat !== mons[M.PM_FLOATING_EYE])
                    whom = `${s_suffix(whom)} ${mbodypart(mon, FACE)}`;
                await pline(`${what} ${vtense(what, "splash")} over ${whom}!`);
            }
            await setmangry(mon, true);
            mon.mcansee = 0;
            hmd.dmg = rn1(25, 21);
            if ((mon.mblinded || 0) + hmd.dmg > 127)
                mon.mblinded = 127;
            else
                mon.mblinded = (mon.mblinded || 0) + hmd.dmg;
        } else {
            await pline(obj.otyp === CREAM_PIE ? "Splat!" : "Splash!");
            await setmangry(mon, true);
        }
        {
            const more_than_1 = (obj.quan > 1);

            if (hmd.thrown)
                obfree(obj, null);
            else
                useup(obj);

            if (!more_than_1)
                obj = null;
        }
        hmd.hittxt = true;
        hmd.get_dmg_bonus = false;
        hmd.dmg = 0;
        break;
    case ACID_VENOM: /* thrown (or spit) */
        if (resists_acid(mon)) {
            await Your(`venom hits ${mon_nam(mon)} harmlessly.`);
            hmd.dmg = 0;
        } else {
            await Your(`venom burns ${mon_nam(mon)}!`);
            hmd.dmg = dmgval(obj, mon);
        }
        {
            const more_than_1 = (obj.quan > 1);

            if (hmd.thrown)
                obfree(obj, null);
            else
                useup(obj);

            if (!more_than_1)
                obj = null;
        }
        hmd.hittxt = true;
        hmd.get_dmg_bonus = false;
        break;
    default:
        if ((objects[obj.otyp].oc_material === VEGGY
             || objects[obj.otyp].oc_material === PAPER)
            && obj.oclass !== SPBOOK_CLASS) {
            /* vegetables (and similar) do no damage, because they
               aren't rigid enough; paper objects also do no damage,
               except for books */
            hmd.dmg = 0;
            hmd.get_dmg_bonus = false;
            break;
        }
        /* non-weapons can damage because of their weight */
        /* (but not too much) */
        hmd.dmg = Math.trunc((obj.owt + 99) / 100);
        hmd.dmg = (hmd.dmg <= 1) ? 1 : rnd(hmd.dmg);
        if (hmd.dmg > 6)
            hmd.dmg = 6;
        /* wet towel has modest damage bonus beyond its weight,
           based on its wetness */
        if (is_wet_towel(obj)) {
            const doubld = (mon.data === mons[M.PM_IRON_GOLEM]);

            /* wielded wet towel should probably use whip skill
               (but not by setting objects[TOWEL].oc_skill==P_WHIP
               because that would turn towel into a weptool);
               due to low weight, tmp always starts at 1 here, and
               due to wet towel's definition, obj->spe is 1..7 */
            hmd.dmg += obj.spe * (doubld ? 2 : 1);
            hmd.dmg = rnd(hmd.dmg); /* wet towel damage not capped at 6 */
            /* usually lose some wetness but defer doing so
               until after hit message */
            hmd.dryit = (rn2(obj.spe + 1) > 0);
        }
        /* things like silver wands can arrive here so we
           need another silver check; blessed check too */
        if (hmd.material === SILVER && mon_hates_silver(mon)) {
            hmd.dmg += rnd(20);
            hmd.silvermsg = hmd.silverobj = true;
        }
        if (obj.blessed && mon_hates_blessings(mon))
            hmd.dmg += rnd(4);
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
            await hmon_hitmon_potion(hmd, mon, obj);
            if (hmd.doreturn)
                return;
        } else {
            if (hmd.mdat === mons[M.PM_SHADE] && !shade_aware(obj)) {
                hmd.dmg = 0;
            } else {
                await hmon_hitmon_misc_obj(hmd, mon, obj);
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
        obj.otrapped /* opoisoned */ = 0;
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
async function hmon_hitmon_splitmon(hmd, mon, obj) {
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
        && hmd.hand_to_hand) {
        let mclone;
        let withwhat = '';

        if ((mclone = await clone_mon(mon, 0, 0)) !== null && mclone !== undefined) {
            if (u.twoweap && game.flags.verbose)
                withwhat = ` with ${yname(obj)}`;
            await pline(`${Monnam(mon)} divides as you hit it${withwhat}!`);
            hmd.hittxt = true;
            await mintrap(mclone, NO_TRAP_FLAGS);
        }
    }
}

// C ref: uhitm.c hmon_hitmon_msg_hit()
async function hmon_hitmon_msg_hit(hmd, mon, obj) {
    if (!hmd.hittxt /*( thrown => obj exists )*/
        && (!hmd.destroyed
            || (hmd.thrown && game.m_shot?.n > 1
                && game.m_shot.o === obj.otyp))) {
        if (hmd.thrown)
            await hit_uh(mshot_xname_uh(obj), mon, exclam(hmd.dmg));
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
// C ref: uhitm.c first_weapon_hit()
/* gamelog version of "you've broken never-hit-with-wielded-weapon conduct;
   the conduct is tracked in known_hitum(); we're called by hmon_hitmon() */
function first_weapon_hit(weapon) {
    let buf;

    /* avoid xname() since that includes "named <foo>" and we don't want
       player-supplied <foo> in livelog */
    buf = '';
    /* include "cursed" if known but don't bother with blessed */
    if (weapon.cursed && weapon.bknown)
        buf += "cursed "; /* normally supplied by doname() */
    if (obj_is_pname(weapon)) {
        buf += ONAME(weapon); /* fully IDed artifact */
    } else {
        buf += simpleonames(weapon);
        if (weapon.oartifact && weapon.dknown)
            buf += ` named ${bare_artifactname(weapon)}`;
    }

    /* when a hit breaks the never-hit-with-wielded-weapon conduct
       (handled by caller) we need to log the message about that before
       monster is possibly killed; otherwise getting log entry sequence
         N : killed for the first time
         N : hit with a wielded weapon for the first time
       reported on the same turn (N) looks "suboptimal" */
    livelog_printf(LL_CONDUCT,
                   `hit with a wielded weapon (${buf}) for the first time`);
}

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
            hmd.hittxt = await shade_miss(game.youmonst, mon, obj, false, true);
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
        if (obj && (obj === game.uwep || (obj === game.uswapwep && u.twoweap))
            /* known_hitum 'what counts as a weapon' criteria */
            && (obj.oclass === WEAPON_CLASS || is_weptool(obj))
            && (thrown === HMON_MELEE || thrown === HMON_APPLIED)
            /* if jousting, the hit was already logged */
            && !hmd.jousting
            /* note: caller has already incremented u.uconduct.weaphit
               so we test for 1; 0 shouldn't be able to happen here... */
            && hmd.dmg > 0 && u.uconduct.weaphit <= 1)
            first_weapon_hit(obj);
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

    await hmon_hitmon_splitmon(hmd, mon, obj);

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
        await mhurtle(mon, game.u.dx, game.u.dy, 1);
        /* update caller's cached mon->data in case mon was pushed into
           a polymorph trap or is a vampshifter whose current form has
           been killed by a trap so that it reverted to original form */
        hmd.mdat = mon.data;
        if (DEADMONSTER(mon))
            return true;
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
            && mon.data !== mons[M.PM_STEAM_VORTEX]) {
            await erode_obj(obj, null, ERODE_BURN, EF_NONE);
        }
        break;
    case AD_ACID:
        if (!rn2(6)) {
            await erode_obj(obj, null, ERODE_CORRODE, EF_GREASE);
        }
        break;
    case AD_RUST:
        if (!mon.mcan) {
            await erode_obj(obj, null, ERODE_RUST, EF_GREASE);
        }
        break;
    case AD_CORR:
        if (!mon.mcan) {
            await erode_obj(obj, null, ERODE_CORRODE, EF_GREASE);
        }
        break;
    case AD_ENCH:
        if (!mon.mcan) {
            if (drain_item(obj, true) && obj.where === 'OBJ_INVENT' /* carried() */
                && (obj.known || obj.oclass === ARMOR_CLASS)) {
                await pline(`${Yobjnam2(obj, "seem")} less effective.`);
            }
            break;
        }
        /* FALLTHRU */
    default:
        break;
    }

    /* if (carried(obj)) update_inventory(): no perm_invent */
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
export function m_is_steadfast(mtmp) {
    const u = game.u;
    const is_u = (mtmp === game.youmonst);
    const otmp = is_u ? game.uwep : (mtmp.mw || null);

    /* must be on the ground (or in water) */
    if ((is_u ? (Flying() || Levitation())
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
        if (mhitb && !mon.mcan && weapon) {
            if (aatyp === AT_KICK) {
                if (game.uarmf && !rn2(6))
                    await erode_obj(game.uarmf, xname(game.uarmf), ERODE_BURN,
                                    EF_GREASE | EF_VERBOSE);
            } else if (aatyp === AT_WEAP || aatyp === AT_CLAW
                       || aatyp === AT_MAGC || aatyp === AT_TUCH)
                await passive_obj(mon, weapon, ptr.mattk[i]);
        }
        break;
    case AD_ACID:
        if (mhitb && rn2(2)) {
            if (Blind() || !game.flags.verbose)
                await You("are splashed!");
            else
                await You(`are splashed by ${s_suffix(mon_nam(mon))} ${
                    hliquid("acid")}!`);

            if (!Acid_resistance()) { /* !Acid_resistance */
                await mdamageu(mon, tmp);
                monstunseesu(M_SEEN_ACID);
            } else {
                monstseesu(M_SEEN_ACID);
            }
            if (!rn2(30))
                await erode_armor(game.youmonst, ERODE_CORRODE);
        }
        if (mhitb && weapon) {
            if (aatyp === AT_KICK) {
                if (game.uarmf && !rn2(6))
                    await erode_obj(game.uarmf, xname(game.uarmf), ERODE_CORRODE,
                                    EF_GREASE | EF_VERBOSE);
            } else if (aatyp === AT_WEAP || aatyp === AT_CLAW
                       || aatyp === AT_MAGC || aatyp === AT_TUCH)
                await passive_obj(mon, weapon, ptr.mattk[i]);
        }
        exercise(A_STR, false);
        break;
    case AD_STON:
        if (mhitb) { /* successful attack */
            let protector = attk_protection(aatyp);

            /* hero using monsters' AT_MAGC attack is hitting hand to
               hand rather than casting a spell */
            if (aatyp === AT_MAGC)
                protector = W_ARMG;

            if (protector === 0 /* no protection */
                || (protector === W_ARMG && !game.uarmg
                    && !game.uwep && !wep_was_destroyed)
                || (protector === W_ARMF && !game.uarmf)
                || (protector === W_ARMH && !game.uarmh)
                || (protector === (W_ARMC | W_ARMG)
                    && (!game.uarmc || !game.uarmg))) {
                if (!Stone_resistance()
                    && !(poly_when_stoned(game.youmonst.data)
                         && await polymon(M.PM_STONE_GOLEM))) {
                    await done_in_by(mon, STONING); /* "You turn to stone..." */
                    return M_ATTK_DEF_DIED;
                }
            }
        }
        break;
    case AD_RUST:
        if (mhitb && !mon.mcan && weapon) {
            if (aatyp === AT_KICK) {
                if (game.uarmf)
                    await erode_obj(game.uarmf, xname(game.uarmf), ERODE_RUST,
                                    EF_GREASE | EF_VERBOSE);
            } else if (aatyp === AT_WEAP || aatyp === AT_CLAW
                       || aatyp === AT_MAGC || aatyp === AT_TUCH)
                await passive_obj(mon, weapon, ptr.mattk[i]);
        }
        break;
    case AD_CORR:
        if (mhitb && !mon.mcan && weapon) {
            if (aatyp === AT_KICK) {
                if (game.uarmf)
                    await erode_obj(game.uarmf, xname(game.uarmf), ERODE_CORRODE,
                                    EF_GREASE | EF_VERBOSE);
            } else if (aatyp === AT_WEAP || aatyp === AT_CLAW
                       || aatyp === AT_MAGC || aatyp === AT_TUCH)
                await passive_obj(mon, weapon, ptr.mattk[i]);
        }
        break;
    case AD_MAGM:
        /* wrath of gods for attacking Oracle */
        if (Antimagic()) { /* Antimagic */
            /* shieldeff(u.ux, u.uy): transient display only */
            monstseesu(M_SEEN_MAGR);
            await pline("A hail of magic missiles narrowly misses you!");
        } else {
            await You("are hit by magic missiles appearing from thin air!");
            await mdamageu(mon, tmp);
            monstunseesu(M_SEEN_MAGR);
        }
        break;
    case AD_ENCH: /* KMH -- remove enchantment (disenchanter) */
        if (mhitb) {
            if (aatyp === AT_KICK) {
                if (!weapon)
                    break;
            } else if (aatyp === AT_BITE || aatyp === AT_BUTT
                       || (aatyp >= AT_STNG && aatyp < AT_WEAP)) {
                break; /* no object involved */
            } else {
                /*
                 * TODO:  #H2668 - if hitting with a ring that has a
                 * positive enchantment, it ought to be subject to
                 * having that enchantment reduced.  But we don't have
                 * sufficient information here to know which hand/ring
                 * has delivered a weaponless blow.
                 */
                ;
            }
            await passive_obj(mon, weapon, ptr.mattk[i]);
        }
        break;
    default:
        break;
    }

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
                    await pline(`${Adjmonnam(mon, "blind")} cannot defend itself.`);
                    if (!rn2(500))
                        change_luck(-1);
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
            if (monnear(mon, game.u.ux, game.u.uy)) {
                if (Cold_resistance()) { /* Cold_resistance */
                    /* shieldeff(u.ux, u.uy): transient display only */
                    await You_feel("a mild chill.");
                    monstseesu(M_SEEN_COLD);
                    await ugolemeffects(AD_COLD, tmp);
                    break;
                }
                monstunseesu(M_SEEN_COLD);
                await You("are suddenly very cold!");
                await mdamageu(mon, tmp);
                /* monster gets stronger with your heat! */
                healmon(mon, Math.trunc((tmp + rn2(2)) / 2),
                        Math.trunc((tmp + 1) / 2));
                /* at a certain point, the monster will reproduce! */
                if (mon.mhpmax > (mon.m_lev + 1) * 8)
                    await split_mon(mon, game.youmonst);
            }
            break;
        case AD_STUN: /* specifically yellow mold */
            if (!Stunned())
                await make_stunned(tmp, true);
            break;
        case AD_FIRE:
            if (monnear(mon, game.u.ux, game.u.uy)) {
                if (Fire_resistance()) { /* Fire_resistance */
                    /* shieldeff(u.ux, u.uy): transient display only */
                    await You_feel("mildly warm.");
                    monstseesu(M_SEEN_FIRE);
                    await ugolemeffects(AD_FIRE, tmp);
                    break;
                }
                monstunseesu(M_SEEN_FIRE);
                await You("are suddenly very hot!");
                await mdamageu(mon, tmp); /* fire damage */
            }
            break;
        case AD_ELEC:
            if (Shock_resistance()) { /* Shock_resistance */
                /* shieldeff(u.ux, u.uy): transient display only */
                await You_feel("a mild tingle.");
                monstseesu(M_SEEN_ELEC);
                await ugolemeffects(AD_ELEC, tmp);
                break;
            }
            monstunseesu(M_SEEN_ELEC);
            await You("are jolted with electricity!");
            await mdamageu(mon, tmp);
            break;
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
    const p = `${verb} by ${!by_gaze ? who : s_suffix(who)}${
        !by_gaze ? "" : " gaze"}`;
    game.multireasonbuf = `${mon.m_id}:${p}`;
    /* C: gm.multi_reason = p, which points past the "m_id:" prefix */
    game.multi_reason = p;
}

// C ref: uhitm.c flash_hits_mon()
/* returns 1 if light flash has noticeable effect on 'mtmp', 0 otherwise */
export async function flash_hits_mon(
    mtmp,
    otmp) { /* source of flash */
    const g = game;
    let lev;
    const mx = mtmp.mx, my = mtmp.my;
    let tmp, amt, useeit, res = 0;

    if (g.notonhead)
        return 0;
    lev = g.level.at(mx, my);
    useeit = canseemon_fh(mtmp);

    if (M_AP_TYPE_FH(mtmp) !== M_AP_NOTHING_FH) {
        let whatbuf;
        const oldglyph = glyph_at_fh(mx, my);

        /* 'altmon' probably doesn't matter here because 'whatbuf' will
           only be shown if the glyph changes and wakeup() doesn't call
           seemimic() for M_AP_MONSTER */
        whatbuf = mhidden_description_fh(mtmp, MHID_ALTMON_FH);

        await wakeup_fh(mtmp, false); /* -> seemimic() -> newsym(); also calls
                                       * finish_meating() to end quickmimic */

        /* if glyph has changed then hero saw something happen */
        if (glyph_at_fh(mx, my) !== oldglyph) {
            await pline_fh(`That ${whatbuf} is really ${
                /* y_monnam()+a_monnam() */
                x_monnam_fh(mtmp, mtmp.mtame ? ARTICLE_YOUR_FH : ARTICLE_A_FH,
                            null, 0, false)}${mtmp.mtame ? '.' : '!'}`);
            res = 1;
        }
    }

    if (mtmp.msleeping && haseyes_fh(mtmp.data)) {
        mtmp.msleeping = 0;
        if (useeit) {
            await pline_fh(`The flash awakens ${mon_nam_fh(mtmp)}.`);
            res = 1;
        }
    } else if (mtmp.data.mlet !== S_LIGHT_FH) {
        if (!resists_blnd_fh(mtmp)) {
            tmp = dist2_fh(otmp.ox, otmp.oy, mx, my);
            if (useeit) {
                await pline_fh(`${Monnam_fh(mtmp)} is blinded by the flash!`);
                res = 1;
            }
            if (mtmp.data === mons_fh[PM_GREMLIN_FH]) {
                /* Rule #1: Keep them out of the light. */
                amt = (otmp.otyp === WAN_LIGHT_FH) ? d_fh(1 + otmp.spe, 4)
                                                   : rnd_fh(Math.min(mtmp.mhp, 4));
                await light_hits_gremlin(mtmp, amt);
            }
            if (!DEADMONSTER_fh(mtmp)) {
                if (!g.context.mon_moving)
                    await setmangry_fh(mtmp, true);
                if (tmp < 9 && !mtmp.isshk && rn2_fh(4))
                    await monflee_fh(mtmp, rn2_fh(4) ? rnd_fh(100) : 0, false, true);
                mtmp.mcansee = 0;
                mtmp.mblinded = (tmp < 3) ? 0 : rnd_fh(1 + Math.trunc(50 / tmp));
            }
        } else if (useeit) {
            if (resists_blnd_by_arti_fh(mtmp)) {
                /* shieldeff(mx, my): transient display only */
            }
            if (g.flags.verbose ?? true) {
                if (lev.lit)
                    await pline_fh(`The flash of light shines on ${mon_nam_fh(mtmp)}.`);
                else
                    await pline_fh(`${Monnam_fh(mtmp)} is illuminated.`);
                res = 2; /* 'message has been given' temporary value */
            }
        }
    }
    if (res) {
        if (!lev.lit)
            await tty_display_nhwindow_fh(g.WIN_MESSAGE, true);
        res &= 1; /* change temporary 2 back to 0 */
    }
    return res;
}

// C ref: uhitm.c light_hits_gremlin()
export async function light_hits_gremlin(mon, dmg) {
    const u = game.u;

    if (!Deaf_fh() && dist2_fh(mon.mx, mon.my, u.ux, u.uy) <= 90) { /* mdistu() */
        /* cry of pain can be heard somewhat farther than the waking radius */
        await pline_fh(`${Monnam_fh(mon)} ${(dmg > Math.trunc(mon.mhp / 2))
            ? "wails in agony" : "cries out in pain"}!`); /* pline_mon() */
    } else if (canseemon_fh(mon)) {
        await pline_fh(`${Monnam_fh(mon)} recoils from the light!`); /* pline_mon() */
    }
    mon.mhp -= dmg;
    await wake_nearto_fh(mon.mx, mon.my, 30);
    if (DEADMONSTER_fh(mon)) {
        if (game.context.mon_moving)
            await monkilled_fh(mon, null, AD_BLND_FH);
        else
            await killed_fh(mon);
    } else if (cansee_fh(mon.mx, mon.my) && !canspotmon_fh(mon)) {
        map_invisible_fh(mon.mx, mon.my);
    }
}
