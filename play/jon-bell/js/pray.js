// pray.js — C ref: pray.c.
import { nomul } from './hack.js';
import { confers_luck, discover_artifact, is_art } from './artifact.js';
import { C_ATTR_TO_DISP, adjalign, adjattrib, exercise, getAbase, getAmax, setuhpmax } from './attrib.js';
import { Confusion_hero, EYE, FOOT, LL_SPOILER, LOADSTONE, NH_AMBER, NH_BLACK, OCLASS_SPBOOK, OCLASS_WEAPON, PM_KNIGHT, RIN_SUSTAIN_ABILITY, Role_if, SET_BOTL, STOMACH, SetVoice, THIT_CORPSE, THIT_M2_JEWELS, THIT_S_UNICORN, Your, _AD_BLND, _AT_ENGL, _Blindfolded, _Blindfolded_only, _Deaf, _FE_M2_UNDEAD, _Flying, _IA_MAGIC_MARKER_OTYP, _Is_sanctum, _Levitation, _Luck, _MOLOCH, _POT_WATER_OTYP, _Punished, _Role_if, _Unchanging, _You_feel, _align_gname, _an, _cmd_Hallucination, _eprop, _eyecount, _hero_Blind, _hero_Deaf, _hero_youmonst, _hprop, _is_demon, _is_vampshifter, _ismnum, _ld_carried, _levlAt, _mh_a_monnam, _mk_artifact_by_align, _nohands, _paranoid_query_yn, _plineVFmt, _prayer_uhim, _region_danger, _set_prop_itimeout, _st_Punished, _stuck_in_wall, _uprop_active, body_part, impossible, is_weptool, makeknown, mbodypart, pline_The, spelleffects, verbalize, wake_nearby, which_armor } from './cmd.js';
import { obj_to_any } from './hack.js';
import { carrying, useup, useupf } from './invent.js';
import { set_moreluck } from './attrib.js';
import { rescued_from_terrain } from './trap.js';
import { record_achievement } from './insight.js';
import { ACH_TUNE, AGGRAVATE_MONSTER, AM_CHAOTIC, AM_MASK, AM_SANCTUM, AM_SHRINE, ANIMATE_SPELL, ASCENDED, A_CHAOTIC, A_CON, A_LAWFUL, A_MAX, A_NEUTRAL, A_NONE, A_STR, A_WIS, Align2amask, Amask2align, BLINDED, BOLT_LIM, COLD_RES, CONFUSION, CXN_ARTICLE, DEAF, DIED, DISINT_RES, DISSOLVED, ECMD_OK, ECMD_TIME, ESCAPED, EXT_ENCUMBER, FIRE_RES, FIXED_ABIL, FROMOUTSIDE, GLIB as GLIB_PROP, HALLUC, HALLUC_RES, HUNGRY, HVY_ENCUMBER, INTRINSIC, IS_ALTAR, Is_astralevel, KILLED_BY, KILLED_BY_AN, LL_ARTIFACT, LL_CONDUCT, LL_DIVINEGIFT, MAXULEV, MCORPSENM, MM_EMIN, MM_NOMSG, M_AP_FURNITURE, M_AP_TYPE, M_SEEN_DISINT, M_SEEN_ELEC, M_SEEN_REFL, NON_PM, ONAME_GIFT, ONAME_KNOW_ARTI, PARANOID_CONFIRM, PARANOID_PRAY, PASSES_WALLS, PLNMSG_OBJ_GLOWS, POISON_RES, PROTECTION, P_BROAD_SWORD, P_ISRESTRICTED, P_LONG_SWORD, REFLECTING, ROOM, SEE_INVIS, SHOCK_RES, SICK, SICK_ALL, SLEEP_RES, SLIMED, STEALTH, STONED, STRANGLED, STRAT_APPEARMSG, STUNNED, S_altar, TELEDS_NO_FLAGS, TELEPAT, TIMEOUT, TT_BURIEDBALL, TT_LAVA, Upolyd, WEAK, WOUNDED_LEGS, W_ARMC as W_ARMC_TO, W_ARMS as W_ARMS_TO, W_ARM as W_ARM_TO, W_SADDLE, FAST as _FW_FAST, EMIN as _fl_EMIN, isok } from './const.js';
import { unpunish as unpunish_invent } from './read.js';
import { canspotmon, flush_pending_messages, force_more, newsym, see_monsters, shieldeff as shieldeff_gz } from './display.js';
import { retouch_equipment } from './artifact.js';
import { You_feel, You_hear, livelog_printf, pline } from './pline.js';
import { dropy, heal_legs } from './do.js';
import { Amulet_off, You, bimanual, disintegrate_arm as disintegrate_arm_gz, encumber_msg, stuck_ring, unchanger, xname } from './do_wear.js';
import { yname } from './objnam.js';
import { losehp } from './hack.js';
import { floorfood, init_uhunger } from './eat.js';
import { feel_cockatrice } from './invent.js';
import { done } from './end.js';
import { yn_function } from './cmd.js';
import { freehand } from './engrave.js';
import { losexp, pluslvl } from './exper.js';
import { eaten_stat } from './eat.js';
import { game, wizard } from './gstate.js';
import { upstart } from './hacklib.js';
import { update_inventory } from './invent.js';
import { arti_light_radius } from './light.js';
import { maybe_adjust_light } from './mkobj.js';
import { Inhell, permonstTemplate, set_malign } from './makemon.js';
import { attacktype_fordmg, can_chant } from './mondata.js';
import { ureflects as ureflects_gz } from './muse.js';
import { monflee } from './monmove.js';
import monsPack from './makemon_mons.json' with { type: 'json' };
import { Monnam, monstseesu as monstseesu_gz, monstunseesu as monstunseesu_gz } from './mcastu.js';
import { aggravate } from './wizard.js';
import { hcolor, s_suffix } from './mhitm.js';
import { Amonnam } from './do_name.js';
import { killed } from './mon.js';
import { rnd_class } from './objnam.js';
import { mkobj as _fl_mkobj, mksobj as _fl_mksobj, place_object, set_bknown } from './mkobj.js';
import { makemon as mklev_makemon } from './makemon.js';
import { bless as bless_obj, get_mtraits, uncurse as _uncurse, uncurse as uncurse_obj } from './mkobj.js';
import { MKOBJ_OC_CLASS, MKOBJ_SVB_BASES } from './mkobj_data.js';
import { Resists_Elem } from './mondata.js';
import { observe_object } from './o_init.js';
import { Yobjnam2, _artifact_origin, simpleonames as _ia_simpleonames, actualoname, an, ansimpleoname, bare_artifactname, corpse_xname, gloves_simple_name, makeplural as makeplural_objnam, otense, vtense } from './objnam.js';
import { oname } from './do_name.js';
import { artiname, exist_artifact, nartifact_exist } from './artifact.js';
import { OC_NAME as PRAY_OC_NAME } from './oc_name_data.js';
import { PARANOID_CONFIRMATION_DEFAULT_BITS } from './options.js';
import { paranoid_query } from './cmd.js';
import { rider_corpse_revival } from './pickup.js';
import { PM_ACID_BLOB, PM_AIR_ELEMENTAL, PM_EARTH_ELEMENTAL, PM_FIRE_ELEMENTAL, PM_GUARD, PM_HIGH_PRIEST, PM_MONK, PM_PRIEST, PM_SHOPKEEPER, PM_WATER_ELEMENTAL, PM_WRAITH, PM_WIZARD as _FL_PM_WIZARD } from './pm.generated.js';
import { rehumanize as rehumanize_real } from './polyself.js';
import { make_confused, make_deaf, make_glib, make_hallucinated, make_sick, make_slimed, make_stoned, make_stunned } from './potion.js';
import { angry_priest, findpriest, p_coaligned, temple_occupied } from './priest.js';
import { xlev_to_rank } from './botl.js';
import { punish } from './read.js';
import { region_safety } from './region.js';
import { rn1 } from './rng.js';
import { d, rn2, rn2_on_display_rng, rnd, rnl, rnz } from './rnd.js';
import { ROLE_GODS } from './roles.js';
import { randrole } from './role.js';
import { obfree } from './shk.js';
import { attrcurse, rndcurse } from './sit.js';
import { dlord, lminion, ndemon } from './minion.js';
import { P_SKILL } from './skills.js';
import { unrestrict_weapon_skill } from './weapon.js';
import { force_learn_spell, known_spell, spell_skilltype } from './spell.js';
import { safe_teleds } from './teleport.js';
import { stop_timer } from './timeout.js';
import { animate_statue, reset_utrap } from './trap.js';
import { buried_ball_to_freedom } from './dig.js';
import { XKILL_NOCONDUCT, XKILL_NOCORPSE, XKILL_NOMSG, m_at, mon_nam } from './uhitm.js';
import { xkilled } from './mon.js';
import { add_weapon_skill, weapon_type } from './weapon.js';
import { couldsee } from './vision.js';
import { weight } from './weight.js';
import { near_capacity } from './hack.js';
import { you_unwere } from './were.js';
import { welded } from './wield.js';
import { make_blinded, resist, revive } from './zap.js';

/* defsym.h:356 MONSYM(53, '@', HUMAN, S_HUMAN, "human or elf") — angrygods
 * picks "mortal" vs "creature" off the hero's own mlet (pray.c:736). */
const S_HUMAN = 53;

const STRIDENT_PRAY = 4;   /* pray.c:67 #define STRIDENT 4 */

const LUCKMIN_PRAY = -10;  /* you.h LUCKMIN */

const LUCKMAX_PRAY = 10;   /* you.h LUCKMAX */

const voice_deity = 0x0004; /* sndprocs.h:163 */
const spe_Unknown = 0;      /* spell.h:22 */
const AMULET_OF_YENDOR = 213;
const FAKE_AMULET_OF_YENDOR = 212;
const CORPSE = 265;
const STATUE = 476;
const S_LICH = 38;
const S_GHOST = 54;
const S_VAMPIRE = 48;
const S_WRAITH = 49;
const S_MUMMY = 39;
const S_ZOMBIE = 52;

/* C align.h:17 — ALIGNLIM (10L + (svm.moves / 200L)). */
function ALIGNLIM() {
    return 10 + Math.trunc((game.moves | 0) / 200);
}

/* C ref: attrib.c:411 change_luck(schar n) — RNG-free luck adjust + clamp. */
function _change_luck(n) {
    const u = game.u || (game.u = {});
    u.uluck = ((u.uluck | 0) + n) | 0;
    if (u.uluck < 0 && u.uluck < LUCKMIN_PRAY) u.uluck = LUCKMIN_PRAY;
    if (u.uluck > 0 && u.uluck > LUCKMAX_PRAY) u.uluck = LUCKMAX_PRAY;
    /* C attrib.c:411-418 change_luck() flags nothing: Luck is not on the status line. */
}

export async function dosacrifice() {
    const u = game.u || {};
    if (!_on_altar() || u.uswallow) {
        await pline(`You are not ${(_Levitation() || _Flying()) ? 'over' : 'on'} an altar.`);
        return ECMD_OK;
    }
    if (_uprop_active('CONFUSION') || _uprop_active('STUNNED')) {
        await pline('You are too impaired to perform the rite.');
        return ECMD_OK;
    }
    /* pray.c:1868 */
    const c0 = _levlAt(u.ux | 0, u.uy | 0);
    const highaltar = ((((c0 && (c0.altarmask ?? c0.flags)) | 0) & AM_SANCTUM) !== 0);
    const altaralign = _a_align(u.ux, u.uy);
    /* pray.c:1870 */
    const otmp = await floorfood('sacrifice', 1);
    if (!otmp)
        return ECMD_OK;
    if ((otmp.otyp | 0) === AMULET_OF_YENDOR) {
        if (!highaltar) {
            await _offer_too_soon(altaralign);
            return ECMD_TIME;
        }
        await _offer_real_amulet(otmp, altaralign);
        return ECMD_TIME;
    }
    if ((otmp.otyp | 0) === FAKE_AMULET_OF_YENDOR) {
        await _offer_fake_amulet(otmp, highaltar, altaralign);
        return ECMD_TIME;
    }
    if ((otmp.otyp | 0) === CORPSE) {
        await _offer_corpse(otmp, highaltar, altaralign);
        return ECMD_TIME;
    }
    await pline('Nothing happens.');
    return ECMD_TIME;
}

/* C ref: pray.c:1602-1629 offer_fake_amulet(). */
async function _offer_fake_amulet(otmp, highaltar, altaralign) {
    if (!highaltar && !otmp.known) {
        await _offer_too_soon(altaralign);
        return;
    }
    /* Soundeffect(se_thunderclap, 100) is a no-op in this build. */
    await You_hear('a nearby thunderclap.');
    if (!otmp.known) {
        await You('realize you have made a %s.', _cmd_Hallucination() ? 'boo-boo' : 'mistake');
        otmp.known = 1;
        _change_luck(-1);
    } else {
        if (_Deaf()) await pline('Oh, no.');
        _change_luck(-3);
        adjalign(-1);
        game.u.ugangr = (game.u.ugangr | 0) + 3;
        await _offer_negative_valued(highaltar, altaralign);
    }
}

/* C ref: pray.c:1529-1587 offer_real_amulet(otmp, altaralign). */
async function _offer_real_amulet(otmp, altaralign) {
    const u = game.u;
    const cloud_of_smoke = (c) => `A cloud of ${c} smoke surrounds you...`;
    if (u.uamul === otmp)
        await Amulet_off();
    if (_ld_carried(otmp)) await useup(otmp);
    else await useupf(otmp, 1);
    await pline(`You offer the Amulet of Yendor to ${a_gname()}...`);
    if (altaralign === A_NONE) {
        if (u.ualign.record > -99) u.ualign.record = -99;
        await pline('An invisible choir chants, and you are bathed in darkness...');
        await pline(`${_MOLOCH} shrugs and retains dominion over ${u_gname()},`);
        await pline('then mercilessly snuffs out your life.');
        game.svk ||= {};
        game.svk.killer ||= {};
        game.svk.killer.name = `${s_suffix(_MOLOCH)} indifference`;
        game.svk.killer.format = KILLED_BY;
        await done(DIED);
        await pline(`${_MOLOCH} snarls and tries again...`);
        await _fry_by_god(A_NONE, true);
        await pline(cloud_of_smoke(hcolor('black')));
        await done(ESCAPED);
    } else if ((u.ualign.type | 0) !== (altaralign | 0)) {
        adjalign(-99);
        await pline(`${a_gname()} accepts your gift, and gains dominion over ${u_gname()}...`);
        await pline(`${u_gname()} is enraged...`);
        await pline(`Fortunately, ${a_gname()} permits you to live...`);
        await pline(cloud_of_smoke(hcolor('orange')));
        await done(ESCAPED);
    } else {
        (u.uevent || (u.uevent = {})).ascended = 1;
        adjalign(10);
        await pline('An invisible choir sings, and you are bathed in radiance...');
        await godvoice(altaralign, 'Mortal, thou hast done well!');
        if (game._pending_message) await force_more(game._pending_message);
        SetVoice(null, 0, 80, voice_deity);
        await verbalize('In return for thy service, I grant thee the gift of Immortality!');
        await You(`ascend to the status of Demigod${game.flags?.female ? 'dess' : ''}...`);
        await done(ASCENDED);
    }
}

/* C ref: pray.c:1479 offer_too_soon(altaralign) */
async function _offer_too_soon(altaralign) {
    const u = game.u;
    if (altaralign === A_NONE && Inhell()) {
        await _gods_upset(A_NONE);
        return;
    }
    await pline(`You feel ${_cmd_Hallucination() ? 'homesick'
                   : (altaralign === (u.ualign.type | 0))
                   ? 'an urge to return to the surface' : 'ashamed'}.`);
}

/* C ref: pray.c:1446 consume_offering(otmp). */
async function _consume_offering(otmp) {
    const u = game.u;
    const t = u.ualign.type | 0;
    if (_cmd_Hallucination())
        switch (rn2(3)) {
        case 0:
            await pline('Your sacrifice sprouts wings and a propeller and roars away!');
            break;
        case 1:
            await pline('Your sacrifice puffs up, swelling bigger and bigger, and pops!');
            break;
        case 2:
            await pline('Your sacrifice collapses into a cloud of dancing particles and fades away!');
            break;
        }
    else if (_hero_Blind() && t === A_LAWFUL)
        await pline('Your sacrifice disappears!');
    else
        await pline(`Your sacrifice is consumed in a ${t === A_LAWFUL ? 'flash of light'
                   : t === A_NEUTRAL ? 'plume of smoke' : 'burst of flame'}!`);
    let carried = false;
    for (let o = game.invent; o; o = o.nobj) if (o === otmp) { carried = true; break; }
    if (carried) await useup(otmp);
    else await useupf(otmp, 1);
    exercise(A_WIS, true);
}

/* C ref: pray.c:1839 sacrifice_value(otmp) */
function _sacrifice_value(otmp) {
    const row = monsPack.mons[otmp.corpsenm | 0];
    let value = 0;
    if ((otmp.corpsenm | 0) === PM_ACID_BLOB
        || ((game.moves | 0) <= (_peek_age_sac(otmp) + 50))) {
        value = (row[2] | 0) + 1;
        if (otmp.oeaten) value = eaten_stat(value, otmp);
    }
    return value;
}

function _peek_age_sac(otmp) {
    let retval = otmp.age | 0;
    if (otmp.on_ice) retval += Math.trunc(((game.moves | 0) - retval) / 2);
    return retval;
}

/* C ref: pray.c:1899 eval_offering(otmp, altaralign) */
async function _eval_offering(otmp, altaralign) {
    const u = game.u;
    let value = _sacrifice_value(otmp);
    if (!value) return 0;
    const row = monsPack.mons[otmp.corpsenm | 0];
    const f2 = row[7] >>> 0;
    if ((f2 & _FE_M2_UNDEAD) !== 0) {
        if ((u.ualign.type | 0) !== A_CHAOTIC
            || ((otmp.corpsenm | 0) === PM_WRAITH && (u.uconduct?.unvegetarian | 0)))
            value += 1;
    } else if ((row[0] | 0) === THIT_S_UNICORN && (f2 & THIT_M2_JEWELS) !== 0) {
        const unicalign = Math.sign(row[4] | 0);
        if (unicalign === altaralign) {
            await pline(`Such an action is an insult to ${unicalign === A_CHAOTIC ? 'chaos' : unicalign ? 'law' : 'balance'}!`);
            await adjattrib(A_WIS, -1, true);
            return -1;
        } else if ((u.ualign.type | 0) === altaralign) {
            const alignlim = 10 + Math.trunc((game.moves | 0) / 200); /* align.h:17 */
            if ((u.ualign.record | 0) < alignlim)
                await _You_feel(`appropriately ${({ '-1': 'chaotic', 0: 'neutral', 1: 'lawful' })[u.ualign.type | 0] ?? 'unknown'}.`);
            else
                await _You_feel('you are thoroughly on the right path.');
            adjalign(5);
            value += 3;
        } else if (unicalign === (u.ualign.type | 0)) {
            u.ualign.record = -1;
            value = 1;
        } else {
            value += 3;
        }
    }
    return value;
}

/* C ref: pray.c:1590 offer_negative_valued */
async function _offer_negative_valued(highaltar, altaralign) {
    if (altaralign !== (game.u.ualign.type | 0) && highaltar)
        await desecrate_altar(highaltar, altaralign);
    else
        await _gods_upset(altaralign);
}

/* C ref: pray.c:1666 offer_different_alignment_altar(otmp, altaralign) */
async function _offer_different_alignment_altar(otmp, altaralign) {
    const u = game.u;
    /* ugod_is_angry() = (u.ualign.record < 0) */
    if ((u.ualign.record | 0) < 0 || (altaralign === A_NONE && Inhell())) {
        const ab = u.ualignbase || (u.ualignbase = [u.ualign.type | 0, u.ualign.type | 0]);
        if (ab[0] === ab[1] && altaralign !== A_NONE) {
            await pline(`You have a strong feeling that ${u_gname()} is angry...`);
            await _consume_offering(otmp);
            await pline(`${a_gname()} accepts your allegiance.`);
            /* tty more() pages earlier toplines inline (topl.c:389-392), over
             * the status as of that pline — before uchangealign changes it. */
            await flush_pending_messages();
            /* C attrib.c:1320 uchangealign(altaralign, A_CG_CONVERT); livelog
            */
            const oldalign = u.ualign.type | 0;
            u.ublessed = 0;
            if (game.disp) game.disp.botl = 1;
            /* attrib.c:1332 aligns[1 - newalign].adj: lawful, neutral, chaotic */
            livelog_printf(0x0200 /* LL_ALIGNMENT */, 'permanently converted to '
                           + ['lawful', 'neutral', 'chaotic'][1 - altaralign]);
            ab[0] = altaralign;
            if (!(u.uarmh && (u.uarmh.otyp | 0) === HELM_OF_OPPOSITE_ALIGNMENT))
                u.ualign.type = ab[0];
            await pline(`You have a ${(u.ualign.type | 0) !== oldalign ? 'sudden ' : ''}sense of a new direction.`);
            if ((u.ualign.type | 0) !== oldalign) {
                u.ualign.record = 0; /* slate is wiped clean */
                await retouch_equipment(0); /* C attrib.c:1360 */
            }
            _change_luck(-3);
            u.ublesscnt = (u.ublesscnt | 0) + 300;
        } else {
            u.ugangr = (u.ugangr | 0) + 3;
            adjalign(-5);
            await pline(`${a_gname()} rejects your sacrifice!`);
            await godvoice(altaralign, 'Suffer, infidel!');
            _change_luck(-5);
            adjattrib(A_WIS, -2, true);
            if (!Inhell())
                await _angrygods(u.ualign.type | 0);
        }
        return;
    }
    await _consume_offering(otmp);
    await pline(`You sense a conflict between ${u_gname()} and ${a_gname()}.`);
    if (rn2(8 + (u.ulevel | 0)) > 5) {
        await pline(`You feel the power of ${u_gname()} increase.`);
        exercise(A_WIS, true);
        _change_luck(1);
        const shrine = _on_shrine();
        const c = _levlAt(u.ux | 0, u.uy | 0);
        if (c) c.altarmask = Align2amask(u.ualign.type | 0) | (shrine ? AM_SHRINE : 0);
        newsym(u.ux, u.uy);
        if (!_hero_Blind())
            await pline(`The altar glows ${hcolor((u.ualign.type | 0) === A_LAWFUL ? 'white'
                        : (u.ualign.type | 0) ? NH_BLACK : 'gray')}.`);
        if (rnl(u.ulevel | 0) > 6 && (u.ualign.record | 0) > 0
            && rnd(u.ualign.record | 0) > Math.trunc((3 * ALIGNLIM()) / 4))
            await _summon_prayer_minion(altaralign, true);
        /* C pray.c:1682-1685: a converted temple angers its former priest. */
        const pri = findpriest(temple_occupied(u.urooms));
        if (pri && !p_coaligned(pri))
            await angry_priest();
    } else {
        await pline(`Unluckily, you feel the power of ${u_gname()} decrease.`);
        _change_luck(-1);
        exercise(A_WIS, false);
        if (rnl(u.ulevel | 0) > 6 && (u.ualign.record | 0) > 0
            && rnd(u.ualign.record | 0) > Math.trunc((7 * ALIGNLIM()) / 8))
            await _summon_prayer_minion(altaralign, true);
    }
}

/* C ref: pray.c:1698 sacrifice_your_race — the chaotic/unaligned-altar
 * (demon summoning) and high-altar arms still record the sentinel. */
async function _sacrifice_your_race(otmp, highaltar, altaralign) {
    const u = game.u;
    if (_is_demon(game.youmonst && game.youmonst.data)) {
        await pline('You find the idea very satisfying.');
        exercise(A_WIS, true);
    } else if ((u.ualign.type | 0) !== A_CHAOTIC) {
        await pline("You'll regret this infamous offense!");
        exercise(A_WIS, false);
    }
    if (highaltar && (altaralign !== A_CHAOTIC || (u.ualign.type | 0) !== A_CHAOTIC)) {
        await desecrate_altar(highaltar, altaralign);
        return;
    } else if (altaralign !== A_CHAOTIC && altaralign !== A_NONE) {
        await pline(`The altar is stained with ${(game.urace && game.urace.adj) || 'human'} blood.`);
        const c = _levlAt(u.ux | 0, u.uy | 0);
        if (c) c.altarmask = AM_CHAOTIC;
        newsym(u.ux, u.uy);
        await angry_priest();
    } else {
        let demonless_msg;
        /* Human sacrifice on a chaotic or unaligned altar is equivalent to
         * demon summoning (pray.c:1727-1743). */
        if (altaralign === A_CHAOTIC && (u.ualign.type | 0) !== A_CHAOTIC) {
            await pline(`The blood floods the altar, which vanishes in ${an(hcolor('black'))} cloud!`);
            const c = _levlAt(u.ux | 0, u.uy | 0);
            if (c) { c.typ = ROOM; c.altarmask = 0; }
            newsym(u.ux, u.uy);
            await angry_priest();
            demonless_msg = 'cloud dissipates';
        } else {
            await pline('The blood covers the altar!');
            _change_luck(altaralign === A_NONE ? -2 : 2);
            demonless_msg = 'blood coagulates';
        }
        const pm = dlord(altaralign);
        const dmon = (pm !== NON_PM)
            ? await mklev_makemon(permonstTemplate(pm), u.ux | 0, u.uy | 0, MM_NOMSG) : null;
        if (dmon) {
            let dbuf = _mh_a_monnam(dmon);
            if (dbuf.toLowerCase() === 'it') dbuf = 'something dreadful';
            else dmon.mstrategy = (dmon.mstrategy | 0) & ~STRAT_APPEARMSG;
            await pline(`You have summoned ${dbuf}!`);
            if (Math.sign(u.ualign.type | 0) === Math.sign(dmon.data.maligntyp | 0))
                dmon.mpeaceful = 1;
            await pline('You are terrified, and unable to move.');
            nomul(-3);
            game.multi_reason = 'being terrified of a demon';
            game.nomovemsg = null;
        } else
            await pline(`The ${demonless_msg}.`);
    }

    if ((u.ualign.type | 0) !== A_CHAOTIC) {
        adjalign(-5);
        u.ugangr = (u.ugangr | 0) + 3;
        await adjattrib(A_WIS, -1, true);
        if (!Inhell())
            await _angrygods(u.ualign.type | 0);
        _change_luck(-5);
    } else
        adjalign(5);
    let carried = false;
    for (let o = game.invent; o; o = o.nobj) if (o === otmp) { carried = true; break; }
    if (carried) await useup(otmp);
    else await useupf(otmp, 1);
}

/* C ref: pray.c:1936-2052 offer_corpse — scoped; the same-race / tame /
 * high-altar / coaligned-reward arms record g_uncomputable_pray. */
async function _offer_corpse(otmp, highaltar, altaralign) {
    const u = game.u;
    u.uconduct = u.uconduct || {};
    // C pray.c:1977-1982: the first corpse offering breaks atheist conduct.
    const prevGnostic = u.uconduct.gnostic | 0;
    u.uconduct.gnostic = prevGnostic + 1;
    if (!prevGnostic)
        livelog_printf(LL_CONDUCT, 'rejected atheism by offering %s on an altar of %s',
            corpse_xname(otmp, null, CXN_ARTICLE), a_gname());
    await feel_cockatrice(otmp, true);
    if (await rider_corpse_revival(otmp, false)) return;
    const row = monsPack.mons[otmp.corpsenm | 0];
    const ir = (game.flags?.initrace ?? 0) | 0;
    const selfmask = [0x8, 0x10, 0x20, 0x40, 0x80][ir] ?? 0;
    if (((row[7] >>> 0) & selfmask) !== 0) {
        await _sacrifice_your_race(otmp, highaltar, altaralign);
        return;
    }
    if (otmp.oextra?.omonst) {
        const mtmp = get_mtraits(otmp, false);
        if (mtmp && mtmp.mtame) {
            await pline('So this is how you repay loyalty?');
            adjalign(-3);
            u.uprops[AGGRAVATE_MONSTER] ||= { intrinsic: 0, extrinsic: 0, blocked: 0 };
            u.uprops[AGGRAVATE_MONSTER].intrinsic |= FROMOUTSIDE;
            await _offer_negative_valued(highaltar, altaralign);
            return;
        }
    }
    let value = await _eval_offering(otmp, altaralign);
    if (value === 0) {
        await pline('Nothing happens.');
        return;
    }
    if (value < 0) {
        await _offer_negative_valued(highaltar, altaralign);
        return;
    }
    if (altaralign !== (u.ualign.type | 0) && highaltar) {
        await desecrate_altar(highaltar, altaralign);
        return;
    }
    if ((u.ualign.type | 0) !== altaralign) {
        await _offer_different_alignment_altar(otmp, altaralign);
        return;
    }
    const MAXVALUE = 24;
    await _consume_offering(otmp);
    /* youprop.h:116-120 Hallucination = HHallucination && !Halluc_resistance */
    const hallu = !!(u.uprops[HALLUC]?.intrinsic | 0)
        && !((u.uprops[HALLUC_RES]?.intrinsic | 0) || (u.uprops[HALLUC_RES]?.extrinsic | 0));
    if (u.ugangr | 0) {
        const saved_anger = u.ugangr | 0;
        u.ugangr = Math.max(0, saved_anger - Math.trunc((value * ((u.ualign.type | 0) === A_CHAOTIC ? 2 : 3)) / MAXVALUE));
        if ((u.ugangr | 0) !== saved_anger) {
            if (u.ugangr | 0) {
                await pline(`${u_gname()} seems ${hallu ? 'groovy' : 'slightly mollified'}.`);
                if ((u.uluck | 0) < 0) _change_luck(1);
            } else {
                await pline(`${u_gname()} seems ${hallu ? 'cosmic (not a new fact)' : 'mollified'}.`);
                if ((u.uluck | 0) < 0) u.uluck = 0;
            }
        } else await pline(hallu ? 'The gods seem tall.' : 'You have a feeling of inadequacy.');
    } else if ((u.ualign.record | 0) < 0) { /* ugod_is_angry() */
        if (value > MAXVALUE) value = MAXVALUE;
        if (value > -(u.ualign.record | 0)) value = -(u.ualign.record | 0);
        adjalign(value);
        await pline('You feel partially absolved.');
    } else if ((u.ublesscnt | 0) > 0) {
        const saved_cnt = u.ublesscnt | 0;
        u.ublesscnt = Math.max(0, saved_cnt - Math.trunc((value * ((u.ualign.type | 0) === A_CHAOTIC ? 500 : 300)) / MAXVALUE));
        if ((u.ublesscnt | 0) !== saved_cnt) {
            if (u.ublesscnt | 0) {
                await pline(hallu ? 'You realize that the gods are not like you and I.' : 'You have a hopeful feeling.');
                if ((u.uluck | 0) < 0) _change_luck(1);
            } else {
                await pline(hallu ? 'Overall, there is a smell of fried onions.' : 'You have a feeling of reconciliation.');
                if ((u.uluck | 0) < 0) u.uluck = 0;
            }
        }
    } else {
        if (await _bestow_artifact(value))
            return;

        const orig_luck = u.uluck | 0;
        let luck_increase = Math.trunc((value * LUCKMAX_PRAY) / (MAXVALUE * 2));
        /* sacrificing can't increase non-bonus Luck to above the value of the
           sacrifice (pray.c:2097-2105) */
        if (orig_luck > value)
            luck_increase = 0;
        else if (orig_luck + luck_increase > value)
            luck_increase = value - orig_luck;

        _change_luck(luck_increase);
        if ((u.uluck | 0) < 0)
            u.uluck = 0;
        if ((u.uluck | 0) !== orig_luck) {
            if (_hero_Blind())
                await You('think %s brushed your %s.', 'something', body_part(FOOT));
            else
                await You(hallu
                    ? 'see crabgrass at your %s.  A funny thing in a dungeon.'
                    : 'glimpse a four-leaf clover at your %s.',
                    makeplural_objnam(body_part(FOOT)));
        }
    }
}

/* C ref: pray.c:1780-1835 bestow_artifact(max_giftvalue). */
async function _bestow_artifact(max_giftvalue) {
    const u = game.u;
    const nartifacts = nartifact_exist();
    let do_bestow = (u.ulevel | 0) > 2 && (u.uluck | 0) >= 0;
    if (do_bestow) {
        /* the chance goes down as the number of artifacts goes up */
        if (wizard()) {
            do_bestow = (await yn_function('Gift an artifact?', 'yn', 'n')) === 'y';
            /* topl.c:537-545 rewrites gt.toplines only; the answered prompt stays
             * painted until parse()'s clear_nhwindow after the next command key.
             * Not under query_menu: the menu arm clears WIN_MESSAGE itself
             * (cmd.c:5459), leaving the topline empty. */
            if (!game.iflags?.query_menu)
                game._topl_sticky = 'Gift an artifact? [yn] (n)';
        } else
            do_bestow = !rn2(6 + (2 * (u.ugifts | 0) * nartifacts));
    }
    if (do_bestow) {
        const otmp = await _mk_artifact_by_align(_a_align(u.ux, u.uy), max_giftvalue);
        if (otmp) {
            _artifact_origin(otmp, ONAME_GIFT | ONAME_KNOW_ARTI);
            if ((otmp.spe | 0) < 0)
                otmp.spe = 0;
            if (otmp.cursed)
                await uncurse_obj(otmp);
            otmp.oerodeproof = true;
            const hallu = _uprop_active('HALLUC');
            const blind = _hero_Blind();
            let buf = hallu ? 'a doodad' : blind ? 'an object' : ansimpleoname(otmp);
            if (!blind)
                buf += ` named ${bare_artifactname(otmp)}`;
            await _at_your_feet(upstart(buf));
            await dropy(otmp);
            await godvoice(u.ualign.type, 'Use my gift wisely!');
            u.ugifts = (u.ugifts | 0) + 1;
            u.ublesscnt = rnz(300 + (50 * nartifacts));
            exercise(A_WIS, true);
            livelog_printf(LL_DIVINEGIFT | LL_ARTIFACT, 'was bestowed with %s by %s',
                           artiname(otmp.oartifact), _align_gname(u.ualign.type));
            /* make sure we can use this weapon */
            unrestrict_weapon_skill(weapon_type(otmp));
            if (!hallu && !blind) {
                observe_object(otmp);
                makeknown(otmp.otyp);
                discover_artifact(otmp.oartifact);
            }
            return true;
        }
    }
    return false;
}

/* C ref: pray.c:105-107 — on_altar()/a_align(x,y) for the hero's cell. */
function _on_altar() {
    const u = game.u || {};
    const c = _levlAt(u.ux | 0, u.uy | 0);
    return !!(c && IS_ALTAR(c.typ));
}

/* C ref: pray.c:106 on_shrine() — ((levl[u.ux][u.uy].altarmask & AM_SHRINE)!=0).
 * Only consulted when on_altar() is true (pray.c:1126). */
function _on_shrine() {
    const u = game.u || {};
    const c = _levlAt(u.ux | 0, u.uy | 0);
    return (((c && (c.altarmask ?? c.flags)) | 0) & AM_SHRINE) ? 1 : 0;
}

function _a_align(x, y) {
    const c = _levlAt(x | 0, y | 0);
    const amask = ((c && (c.altarmask ?? c.flags)) | 0) & AM_MASK;
    return Amask2align(amask);
}

/* C ref: pray.c:2489 altarmask_at(coordxy x, coordxy y). */
export function altarmask_at(x, y) {
    let res = 0;
    if (isok(x, y)) {
        const mon = m_at(x, y);
        if (mon && M_AP_TYPE(mon) === M_AP_FURNITURE
            && mon.mappearance === S_altar)
            res = MCORPSENM(mon) !== NON_PM ? MCORPSENM(mon) : 0;
        else if (IS_ALTAR(_levlAt(x, y).typ))
            res = (_levlAt(x, y).altarmask | 0);
    }
    return res;
}

/* C ref: pray.c:2651 altar_wrath(coordxy x, coordxy y). */
export async function altar_wrath(x, y) {
    const g = game;
    const u = g.u || (g.u = {});
    if (!u.ualign) u.ualign = { type: 0, record: 0 };
    const altaralign = _a_align(x, y);

    if (u.ualign.type === altaralign && u.ualign.record > -rn2(4)) {
        await godvoice(altaralign, "How darest thou desecrate my altar!");
        adjattrib(A_WIS, -1, false);
        u.ualign.record--;
    } else {
        const deaf = _hero_Deaf();
        await pline("%s %s%s:",
            !deaf ? "A voice (could it be"
                  : "Despite your deafness, you seem to hear",
            _align_gname(altaralign),
            !deaf ? "?) whispers" : " say");
        SetVoice(null, 0, 80, voice_deity);
        await verbalize("Thou shalt pay, infidel!");
        const luck = _Luck();
        if (luck > -5 && rn2(luck + 6))
            _change_luck(rn2(20) ? -1 : -2);
    }
}

const TROUBLE_STONED = 14;

const TROUBLE_SLIMED = 13;

const TROUBLE_STRANGLED = 12;

const TROUBLE_LAVA = 11;

const TROUBLE_SICK = 10;

const TROUBLE_STARVING = 9;

const TROUBLE_REGION = 8; /* stinking cloud */

const TROUBLE_HIT = 7;

const TROUBLE_LYCANTHROPE = 6;

const TROUBLE_COLLAPSING = 5;

const TROUBLE_STUCK_IN_WALL = 4;

const TROUBLE_CURSED_LEVITATION = 3;

const TROUBLE_UNUSEABLE_HANDS = 2;

const TROUBLE_CURSED_BLINDFOLD = 1;

const TROUBLE_PUNISHED = -1;

const TROUBLE_FUMBLING = -2;

const TROUBLE_CURSED_ITEMS = -3;

const TROUBLE_SADDLE = -4;

const TROUBLE_BLIND = -5;

const TROUBLE_POISONED = -6;

const TROUBLE_WOUNDED_LEGS = -7;

const TROUBLE_HUNGRY = -8;

const TROUBLE_STUNNED = -9;

const TROUBLE_CONFUSED = -10;

const TROUBLE_HALLUCINATION = -11;

/* otyps the trouble system needs.  Values cross-checked against
 * js/oc_name_data.js (the compiled objects.h name table): 172 "levitation
 * boots", 171 "fumble boots", 160 "gauntlets of fumbling", 183 "levitation"
 * (ring), 203 "amulet of strangulation", 99 "helm of opposite alignment",
 * 235 "saddle", 471 "loadstone".  RIN_SUSTAIN_ABILITY (182) and LOADSTONE
 * (471) are already declared elsewhere in this file, so they are not
 * redeclared here. */
const LEVITATION_BOOTS = 172;

const FUMBLE_BOOTS = 171;

const GAUNTLETS_OF_FUMBLING = 160;

const RIN_LEVITATION = 183;

const AMULET_OF_STRANGULATION = 203;

const AMULET_OF_UNCHANGING = 207;

const HELM_OF_OPPOSITE_ALIGNMENT = 99; /* objects.h */
const POTION_CLASS = 8; /* objclass.h */

const _TROUBLE_SADDLE_OTYP = 235;

/* pray.c:39 — #define Cursed_obj(obj,typ) ((obj) && (obj)->otyp == (typ)
 *                                          && (obj)->cursed) */
function _Cursed_obj(obj, typ) {
    return !!(obj && (obj.otyp | 0) === (typ | 0) && obj.cursed);
}

/* C ref: pray.c:113-152 critically_low_hp(only_if_injured).
 * "5 is a magic number in TROUBLE_HIT handling below". */
function _critically_low_hp(only_if_injured) {
    const u = game.u || {};
    const polyd = !!Upolyd(u);
    const curhp = polyd ? (u.mh | 0) : (u.uhp | 0);
    let maxhp = polyd ? (u.mhmax | 0) : (u.uhpmax | 0);
    let divisor;

    if (only_if_injured && !(curhp < maxhp))
        return false;
    /* if maxhp is extremely high, use lower threshold for the division test */
    const hplim = 15 * (u.ulevel | 0);
    if (maxhp > hplim)
        maxhp = hplim;
    switch (xlev_to_rank(u.ulevel | 0)) { /* maps 1..30 into 0..8 */
    case 0: case 1: divisor = 5; break;   /* explvl 1 to 5 */
    case 2: case 3: divisor = 6; break;   /* explvl 6 to 13 */
    case 4: case 5: divisor = 7; break;   /* explvl 14 to 21 */
    case 6: case 7: divisor = 8; break;   /* explvl 22 to 29 */
    default:        divisor = 9; break;   /* explvl 30+ */
    }
    return (curhp <= 5 || curhp * divisor <= maxhp);
}

/*
 * C ref: pray.c:197-282 in_trouble().
 *
 * Return 0 if nothing particular seems wrong, positive numbers for
 * serious trouble, and negative numbers for comparative annoyances.
 * This returns the worst problem.  The ORDER of these checks IS the trouble
 * ranking — do not reorder to "group" them.
 */
function _in_trouble() {
    const u = game.u || {};
    const youdata = game.youmonst && game.youmonst.data;
    let otmp;
    let i;

    /*
     * major troubles
     */
    if (_hprop(STONED))
        return TROUBLE_STONED;
    if (_hprop(SLIMED))
        return TROUBLE_SLIMED;
    if (_hprop(STRANGLED))
        return TROUBLE_STRANGLED;
    if ((u.utrap | 0) && (u.utraptype | 0) === TT_LAVA)
        return TROUBLE_LAVA;
    if (_hprop(SICK))
        return TROUBLE_SICK;
    if ((u.uhs | 0) >= WEAK)
        return TROUBLE_STARVING;
    if (_region_danger())
        return TROUBLE_REGION;
    if ((!Upolyd(u) || _Unchanging()) && _critically_low_hp(false))
        return TROUBLE_HIT;
    if (_ismnum(u.ulycn))
        return TROUBLE_LYCANTHROPE;
    if (near_capacity() >= EXT_ENCUMBER
        && getAmax(u)[C_ATTR_TO_DISP[A_STR]] - getAbase(u)[C_ATTR_TO_DISP[A_STR]] > 3)
        return TROUBLE_COLLAPSING;
    if (_stuck_in_wall())
        return TROUBLE_STUCK_IN_WALL;
    if (_Cursed_obj(u.uarmf, LEVITATION_BOOTS)
        || stuck_ring(u.uleft, RIN_LEVITATION)
        || stuck_ring(u.uright, RIN_LEVITATION))
        return TROUBLE_CURSED_LEVITATION;
    if (_nohands(youdata) || !freehand()) {
        /* for bag/box access [cf use_container()]...
           make sure it's a case that we know how to handle;
           otherwise "fix all troubles" would get stuck in a loop */
        if (welded(u.uwep))
            return TROUBLE_UNUSEABLE_HANDS;
        if (Upolyd(u) && _nohands(youdata)
            && (!_Unchanging() || ((otmp = _unchanger()) && otmp.cursed)))
            return TROUBLE_UNUSEABLE_HANDS;
    }
    if (_Blindfolded() && u.ublindf && u.ublindf.cursed)
        return TROUBLE_CURSED_BLINDFOLD;

    /*
     * minor troubles
     */
    if (_Punished() || ((u.utrap | 0) && (u.utraptype | 0) === TT_BURIEDBALL))
        return TROUBLE_PUNISHED;
    if (_Cursed_obj(u.uarmg, GAUNTLETS_OF_FUMBLING)
        || _Cursed_obj(u.uarmf, FUMBLE_BOOTS))
        return TROUBLE_FUMBLING;
    if (_worst_cursed_item())
        return TROUBLE_CURSED_ITEMS;
    if (u.usteed) { /* can't voluntarily dismount from a cursed saddle */
        otmp = which_armor(u.usteed, W_SADDLE);
        if (_Cursed_obj(otmp, _TROUBLE_SADDLE_OTYP))
            return TROUBLE_SADDLE;
    }

    /* youprop.h:93 BlindedTimeout = (HBlinded & TIMEOUT). */
    if ((_hprop(BLINDED) & TIMEOUT) > 1
        && !(_hprop(BLINDED) & ~TIMEOUT)
        && (!u.uswallow
            || !attacktype_fordmg(u.ustuck && u.ustuck.data, _AT_ENGL, _AD_BLND)))
        return TROUBLE_BLIND;
    /* deafness isn't its own trouble; healing magic cures deafness
       when it cures blindness, so do the same with trouble repair */
    if ((_hprop(DEAF) & TIMEOUT) > 1)
        return TROUBLE_BLIND;

    for (i = 0; i < A_MAX; i++)
        if (getAbase(u)[C_ATTR_TO_DISP[i]] < getAmax(u)[C_ATTR_TO_DISP[i]])
            return TROUBLE_POISONED;
    if (_Wounded_legs() && !u.usteed)
        return TROUBLE_WOUNDED_LEGS;
    if ((u.uhs | 0) >= HUNGRY)
        return TROUBLE_HUNGRY;
    if (_hprop(STUNNED) & TIMEOUT)
        return TROUBLE_STUNNED;
    if (_hprop(CONFUSION) & TIMEOUT)
        return TROUBLE_CONFUSED;
    if (_hprop(HALLUC) & TIMEOUT)
        return TROUBLE_HALLUCINATION;
    return 0;
}

/* youprop.h:138 Wounded_legs = (HWounded_legs || EWounded_legs). */
function _Wounded_legs() {
    return !!(_hprop(WOUNDED_LEGS) || _eprop(WOUNDED_LEGS));
}

/* C ref: pray.c:285-341 worst_cursed_item() — select an item for
 * TROUBLE_CURSED_ITEMS.  Structure preserved exactly, including C's fallthrough
 * to a final invent scan whose `otmp` may end up null. */
function _worst_cursed_item() {
    const u = game.u || {};
    let otmp;

    /* if strained or worse, check for loadstone first */
    if (near_capacity() >= HVY_ENCUMBER) {
        for (otmp = game.invent; otmp; otmp = otmp.nobj)
            if (_Cursed_obj(otmp, LOADSTONE))
                return otmp;
    }
    /* weapon takes precedence if it is interfering
       with taking off a ring or putting on a shield */
    if (welded(u.uwep) && (u.uright || bimanual(u.uwep))) { /* weapon */
        otmp = u.uwep;
    /* gloves come next, due to rings */
    } else if (u.uarmg && u.uarmg.cursed) { /* gloves */
        otmp = u.uarmg;
    /* then shield due to two handed weapons and spells */
    } else if (u.uarms && u.uarms.cursed) { /* shield */
        otmp = u.uarms;
    /* then cloak due to body armor */
    } else if (u.uarmc && u.uarmc.cursed) { /* cloak */
        otmp = u.uarmc;
    } else if (u.uarm && u.uarm.cursed) { /* suit */
        otmp = u.uarm;
    /* if worn helmet of opposite alignment is making you an adherent
       of the current god, he/she/it won't uncurse that for you */
    } else if (u.uarmh && u.uarmh.cursed /* helmet */
               && (u.uarmh.otyp | 0) !== HELM_OF_OPPOSITE_ALIGNMENT) {
        otmp = u.uarmh;
    } else if (u.uarmf && u.uarmf.cursed) { /* boots */
        otmp = u.uarmf;
    } else if (u.uarmu && u.uarmu.cursed) { /* shirt */
        otmp = u.uarmu;
    } else if (u.uamul && u.uamul.cursed) { /* amulet */
        otmp = u.uamul;
    } else if (u.uleft && u.uleft.cursed) { /* left ring */
        otmp = u.uleft;
    } else if (u.uright && u.uright.cursed) { /* right ring */
        otmp = u.uright;
    } else if (u.ublindf && u.ublindf.cursed) { /* eyewear */
        otmp = u.ublindf; /* must be non-blinding lenses */
    /* if weapon wasn't handled above, do it now */
    } else if (welded(u.uwep)) { /* weapon */
        otmp = u.uwep;
    /* active secondary weapon even though it isn't welded */
    } else if (u.uswapwep && u.uswapwep.cursed && u.twoweap) {
        otmp = u.uswapwep;
    /* all worn items ought to be handled by now */
    } else {
        for (otmp = game.invent; otmp; otmp = otmp.nobj) {
            if (!otmp.cursed)
                continue;
            if ((otmp.otyp | 0) === LOADSTONE || confers_luck(otmp))
                break;
        }
    }
    return otmp || null;
}

/* C do_wear.c:2687 — the worn source of Unchanging, also used by prayer. */
function _unchanger() {
    return unchanger();
}

/* C ref: pray.c:343-366 fix_curse_trouble(otmp, what). */
async function _fix_curse_trouble(otmp, what) {
    const u = game.u || {};
    if (!otmp) {
        impossible('fix_curse_trouble: nothing to uncurse.');
        return;
    }
    if (otmp === u.uarmg && _hprop(GLIB_PROP)) {
        make_glib(0);
        await Your(`${gloves_simple_name(u.uarmg)} are no longer slippery.`);
        if (!otmp.cursed)
            return;
    }
    if (!_hero_Blind() || (otmp === u.ublindf && _Blindfolded_only())) {
        await pline(`${what ? what : Yobjnam2(otmp, 'softly glow')} ${hcolor(NH_AMBER)}.`);
        game.iflags = game.iflags || {};
        game.iflags.last_msg = PLNMSG_OBJ_GLOWS;
        otmp.bknown = _cmd_Hallucination() ? 0 : 1; /* ok to skip set_bknown() */
    }
    await _uncurse(otmp);
    update_inventory();
}

/* C pray.c:372-599 — cure the selected trouble; every arm returns void. */
async function _fix_worst_trouble(trouble) {
    const g = game;
    const u = g.u || (g.u = {});
    let i, maxhp;
    let otmp = null;
    let what = null;
    const leftglow = 'Your left ring softly glows',
          rightglow = 'Your right ring softly glows';

    switch (trouble) {
    case TROUBLE_STONED:
        await make_stoned(0n, 'You feel more limber.', 0, null);
        break;
    case TROUBLE_SLIMED:
        await make_slimed(0n, 'The slime disappears.');
        break;
    case TROUBLE_STRANGLED:
        if (u.uamul && (u.uamul.otyp | 0) === AMULET_OF_STRANGULATION) {
            await Your('amulet vanishes!');
            await useup(u.uamul);
        }
        await You('can breathe again.');
        if (u.uprops && u.uprops[STRANGLED])
            u.uprops[STRANGLED].intrinsic = 0;
        g.disp.botl = 1;
        break;
    case TROUBLE_LAVA:
        if (!await safe_teleds(TELEDS_NO_FLAGS))
            await reset_utrap(true);
        await rescued_from_terrain(DISSOLVED);
        break;
    case TROUBLE_STARVING:
        /* temporarily lost strength recovery now handled by init_uhunger() */
        /* FALLTHROUGH */
    case TROUBLE_HUNGRY:
        await Your(`${body_part(STOMACH)} feels content.`);
        init_uhunger();
        g.disp.botl = 1;
        break;
    case TROUBLE_SICK:
        await _You_feel('better.');
        await make_sick(0n, null, false, SICK_ALL);
        break;
    case TROUBLE_REGION:
        /* C pray.c:417-420 — stinking cloud, with hero vulnerable to HP loss. */
        await region_safety();
        break;
    case TROUBLE_HIT:
        /* "fix all troubles" will keep trying if hero has
           5 or less hit points, so make sure they're always
           boosted to be more than that */
        await _You_feel('much better.');
        if (Upolyd(u)) {
            maxhp = (u.mhmax | 0) + rnd(5);
            setuhpmax(Math.max(maxhp, 5 + 1), false); /* acts as setmhmax() */
            u.mh = u.mhmax;
        }
        maxhp = u.uhpmax | 0;
        if (maxhp < (u.ulevel | 0) * 5 + 11)
            maxhp += rnd(5);                          /* pray.c:433 */
        /* True: update u.uhpmax even if currently poly'd */
        setuhpmax(Math.max(maxhp, 5 + 1), true);
        u.uhp = u.uhpmax; /* setuhpmax() will do this when u.uhp is higher
                           * than u.uhpmax; prayer also does this if lower */
        g.disp.botl = 1;
        break;
    case TROUBLE_COLLAPSING: {
        /* override Fixed_abil; uncurse that if feasible */
        const dSTR = C_ATTR_TO_DISP[A_STR];
        await _You_feel(`${(getAmax(u)[dSTR] - getAbase(u)[dSTR] > 6) ? 'much ' : ''}stronger.`);
        getAbase(u)[dSTR] = getAmax(u)[dSTR];
        g.disp.botl = 1;
        if (_eprop(FIXED_ABIL)) {
            if ((otmp = stuck_ring(u.uleft, RIN_SUSTAIN_ABILITY)) !== null
                && otmp !== undefined && otmp !== 0) {
                if (otmp === u.uleft)
                    what = leftglow;
            } else if ((otmp = stuck_ring(u.uright, RIN_SUSTAIN_ABILITY)) !== null
                       && otmp !== undefined && otmp !== 0) {
                if (otmp === u.uright)
                    what = rightglow;
            }
            if (otmp) {
                await _fix_curse_trouble(otmp, what);
                break;
            }
        }
        break;
    }
    case TROUBLE_STUCK_IN_WALL:
        /* no control, but works on no-teleport levels */
        if (await safe_teleds(TELEDS_NO_FLAGS)) {
            await Your('surroundings change.');
        } else {
            /* safe_teleds() couldn't find a safe place; perhaps the level is
               completely full.  As a last resort, confer intrinsic
               wall/rock-phazing.  Without something like this,
               fix_all_troubles can get stuck in an infinite loop. */
            _set_prop_itimeout(PASSES_WALLS, d(4, 4) + 4); /* 8..20 */
            await _You_feel('much slimmer.');
        }
        break;
    case TROUBLE_CURSED_LEVITATION:
        if (_Cursed_obj(u.uarmf, LEVITATION_BOOTS)) {
            otmp = u.uarmf;
        } else if ((otmp = stuck_ring(u.uleft, RIN_LEVITATION))) {
            if (otmp === u.uleft)
                what = leftglow;
        } else if ((otmp = stuck_ring(u.uright, RIN_LEVITATION))) {
            if (otmp === u.uright)
                what = rightglow;
        }
        await _fix_curse_trouble(otmp, what);
        break;
    case TROUBLE_UNUSEABLE_HANDS:
        if (welded(u.uwep)) {
            otmp = u.uwep;
            await _fix_curse_trouble(otmp, what);
            break;
        }
        if (Upolyd(u) && _nohands(g.youmonst && g.youmonst.data)) {
            if (!_Unchanging()) {
                await Your('shape becomes uncertain.');
                await rehumanize_real(); /* "You return to {normal} form." */
            } else if ((otmp = _unchanger()) && otmp.cursed) {
                await _fix_curse_trouble(otmp, what);
                break;
            }
        }
        if (_nohands(g.youmonst && g.youmonst.data) || !freehand())
            impossible("fix_worst_trouble: couldn't cure hands.");
        break;
    case TROUBLE_CURSED_BLINDFOLD:
        otmp = u.ublindf;
        await _fix_curse_trouble(otmp, what);
        break;
    case TROUBLE_LYCANTHROPE:
        /* C pray.c:514-516 — cure lycanthropy, including its form effects. */
        await you_unwere(true);
        break;
    case TROUBLE_PUNISHED:
        await Your('chain disappears.');
        if (u.utrap && u.utraptype === TT_BURIEDBALL)
            await buried_ball_to_freedom();
        else
            await unpunish_invent();
        break;
    case TROUBLE_FUMBLING:
        if (_Cursed_obj(u.uarmg, GAUNTLETS_OF_FUMBLING))
            otmp = u.uarmg;
        else if (_Cursed_obj(u.uarmf, FUMBLE_BOOTS))
            otmp = u.uarmf;
        await _fix_curse_trouble(otmp, what);
        break;
    case TROUBLE_CURSED_ITEMS:
        otmp = _worst_cursed_item();
        if (otmp === u.uright)
            what = rightglow;
        else if (otmp === u.uleft)
            what = leftglow;
        await _fix_curse_trouble(otmp, what);
        break;
    case TROUBLE_POISONED:
        /* override Fixed_abil; ignore items which confer that */
        if (_cmd_Hallucination())
            await pline("There's a tiger in your tank.");
        else
            await _You_feel('in good health again.');
        for (i = 0; i < A_MAX; i++) {
            const di = C_ATTR_TO_DISP[i];
            if (getAbase(u)[di] < getAmax(u)[di]) {
                getAbase(u)[di] = getAmax(u)[di];
                g.disp.botl = 1;
            }
        }
        await encumber_msg();
        break;
    case TROUBLE_BLIND: { /* handles deafness as well as blindness */
        let msgbuf = '';
        let eyes = body_part(EYE);
        const cure_deaf = (_hprop(DEAF) & TIMEOUT) ? true : false;

        /* youprop.h:92 Blinded = (HBlinded && !BBlinded). */
        if (_hprop(BLINDED) && !u.uprops[BLINDED].blocked) {
            if (_eyecount(g.youmonst && g.youmonst.data) !== 1)
                eyes = makeplural_objnam(eyes);
            msgbuf = `Your ${eyes} ${vtense(eyes, 'feel')} better`;
            u.ucreamed = 0;
            make_blinded(0, false);
        }
        if (cure_deaf) {
            await make_deaf(0, false);
            if (!_hero_Deaf())
                msgbuf += (!msgbuf ? 'You' : ' and you') + ' can hear again';
        }
        if (msgbuf)
            await pline(msgbuf + '.');
        break;
    }
    case TROUBLE_WOUNDED_LEGS:
        heal_legs(0);
        break;
    case TROUBLE_STUNNED:
        make_stunned(0n, true);
        break;
    case TROUBLE_CONFUSED:
        await make_confused(0n, true);
        break;
    case TROUBLE_HALLUCINATION:
        await pline('Looks like you are back in Kansas.');
        await make_hallucinated(0n, false, 0n);
        break;
    case TROUBLE_SADDLE:
        otmp = which_armor(u.usteed, W_SADDLE);
        if (!_hero_Blind()) {
            await pline(`${Yobjnam2(otmp, 'softly glow')} ${hcolor(NH_AMBER)}.`);
            set_bknown(otmp, 1);
        }
        await _uncurse(otmp);
        break;
    default:
        /* C's switch has no default: a trouble code with no case is a no-op
         * there too (this is how `fix_worst_trouble(0)` at pray.c:1145 is
         * harmless when in_trouble() returned 0). */
        break;
    }
}

/* C ref: pray.c:2123-2194 can_pray(boolean praying) — the single body.  Live:
 * dopray() (C pray.c:2230) and enlightenment (C insight.c:1943) call it.
 * pline() (js/pline.js) is async and can block in more(), so the two
 * messages are awaited: C's pline returns only after the topline is
 * settled, and dopray's wizard-mode force_more reads the result. */
export async function can_pray(praying) {
    const g = game;
    const u = g.u || (g.u = {});
    const onAltar = _on_altar();
    g._p_aligntyp = onAltar ? _a_align(u.ux, u.uy) : (u.ualign?.type ?? 0);
    g._p_trouble = _in_trouble();

    /* C pray.c:2130-2136 — is_demon(gy.youmonst.data) "ok if chaotic or none
     * (Moloch)".  The condition is C's, verbatim and odd: A_CHAOTIC is -1 and
     * therefore != A_NEUTRAL, so the second disjunct swallows the first; the
     * "%s" then prints "lawful" for chaotic too because A_CHAOTIC is truthy.
     * Port the bug (Cardinal Rule 1). */
    if (_is_demon(g.youmonst && g.youmonst.data)
        && (g._p_aligntyp === A_LAWFUL || g._p_aligntyp !== A_NEUTRAL)) {
        if (praying)
            await pline('The very idea of praying to a '
                + (g._p_aligntyp ? 'lawful' : 'neutral')
                + ' god is repugnant to you.');
        return false;
    }

    if (praying)
        await pline('You begin praying to ' + align_gname(g._p_aligntyp) + '.');

    const record = (u.ualign?.record | 0);
    let alignment;
    if ((u.ualign?.type | 0) && (u.ualign.type | 0) === -g._p_aligntyp)
        alignment = -record;                 /* opposite-alignment altar */
    else if ((u.ualign?.type | 0) !== g._p_aligntyp)
        alignment = Math.trunc(record / 2);  /* different-alignment altar */
    else
        alignment = record;                  /* coaligned */

    const ublesscnt = u.ublesscnt | 0;
    if (g._p_aligntyp === A_NONE) {          /* praying to Moloch */
        g._p_type = -2;
    } else if ((g._p_trouble > 0) ? (ublesscnt > 200)   /* big trouble */
             : (g._p_trouble < 0) ? (ublesscnt > 100)   /* minor difficulty */
               : (ublesscnt > 0)) {                      /* not in trouble */
        g._p_type = 0;                       /* too soon... */
    } else if (_Luck() < 0 || (u.ugangr | 0) || alignment < 0) {
        g._p_type = 1;                       /* too naughty... */
    } else {                                 /* alignment >= 0 */
        if (onAltar && (u.ualign?.type | 0) !== g._p_aligntyp)
            g._p_type = 2;
        else
            g._p_type = 3;
    }

    if (_is_undead(g.youmonst && g.youmonst.data) && !Inhell()
        && (g._p_aligntyp === A_LAWFUL
            || (g._p_aligntyp === A_NEUTRAL && !rn2(10))))
        g._p_type = -1;
    /* C pray.c:2166-2168 notes the rn2(10) above makes the !praying
       (enlightenment) answer random for neutral undead; C accepts that. */

    return !praying ? (g._p_type === 3 && !Inhell()) : true;
}

/* C ref: pray.c:2199 dopray() — the #pray command.  Sets the praying
 * occupation and returns ECMD_TIME so the moveloop runs the prayer-out turns. */
export async function dopray() {
    const g = game;
    const u = g.u || (g.u = {});

    /* options.c seeds this compound option before reading the rc file.  Older
     * saved/test games can lack the JS field, so absence means the C default;
     * an explicit zero still disables every confirmation. */
    const bits = (g.flags?.paranoia_bits
                  ?? PARANOID_CONFIRMATION_DEFAULT_BITS) | 0;
    if (bits & PARANOID_PRAY) {
        const ok = await paranoid_query(!!(bits & PARANOID_CONFIRM),
                                        'Are you sure you want to pray?');
        if (!ok) {                           /* declined → ECMD_OK, no turn */
            return ECMD_OK; // C ref: pray.c:2218 `if (!ok) return ECMD_OK;`
        }
    }

    u.uconduct = u.uconduct || {};
    if (!((u.uconduct.gnostic | 0))) {
        u.uconduct.gnostic = 1;
        livelog_printf(LL_CONDUCT, "rejected atheism with a prayer");
    } else {
        u.uconduct.gnostic = (u.uconduct.gnostic | 0) + 1;
    }

    /* C ref: pray.c:2230 — `if (!can_pray(TRUE)) return ECMD_OK;`. */
    if (!(await can_pray(true))) {           /* prints "You begin praying…" */
        return ECMD_OK; // C ref: pray.c:2231 `if (!can_pray(TRUE)) return ECMD_OK;`
    }

    if ((g.flags && g.flags.debug) && (g._p_type | 0) >= 0) {
        /* C ref: win/tty/topl.c — can_pray() just printed "You begin praying to
         * %s." to the topline but the player has not acked it (no input since).
         * The wizard y_n() prompt that follows therefore more()s the unacked
         * topline first (a forced, non-width more() — the hero is stationary so
         * the live map is correct).  Page it, consuming the recorded dismiss key,
         * before the prompt overwrites the topline. */
        if (g._pending_message)
            await force_more(g._pending_message);
        /* pray.c:2240-2248 — ParanoidPray saves in_doagain, forces it FALSE for
         * the prompt, then restores it. Otherwise calls y_n. */
        let force;
        if (bits & PARANOID_PRAY) {
            const save_doagain = !!g.gi?.in_doagain;
            if (g.gi) g.gi.in_doagain = false;
            force = await _paranoid_query_yn('Force the gods to be pleased?');
            if (g.gi) g.gi.in_doagain = save_doagain;
        } else {
            force = await _paranoid_query_yn('Force the gods to be pleased?');
        }
        if (force) {
            u.ublesscnt = 0;                 /* pray.c:2250 */
            if ((u.uluck | 0) < 0) u.uluck = 0; /* pray.c:2251-2252 */
            u.ualign = u.ualign || {};
            if ((u.ualign.record | 0) <= 0) u.ualign.record = 1; /* pray.c:2253-2254 */
            u.ugangr = 0;                    /* pray.c:2255 */
            if ((g._p_type | 0) < 2) g._p_type = 3; /* pray.c:2256-2257 */
        }
    }

    nomul(-3);                               /* hack.c:4068 — praying occupation */
    g.multi_reason = 'praying';              /* pray.c:2261 */
    g.nomovemsg = 'You finish your prayer.'; /* pray.c:2262 */
    g.afternmv = 'prayer_done';              /* pray.c:2263 */

    if (g._p_type === 3 && !Inhell()) {       /* C pray.c:2265 */
        /* C ref: pray.c:2265-2270 — coaligned, true-to-god: "if you've been true
         * to your god you can't die while you pray."  Print the shimmering-light
         * message (unless Blind) and set the invulnerability flag, which makes
         * gethungry() (eat.c:3167) return early for the prayer-countdown turns. */
        if (!_uprop_active('BLINDED'))
            await pline('You are surrounded by a shimmering light.');
        u.uinvulnerable = true;
    }
    return ECMD_TIME; // C ref: pray.c:2272 `return ECMD_TIME;`
}

/* local helpers for doturn — not exported from their source modules */
const PM_CLERIC = 6;  /* role index for Priest/Priestess */

const _SPE_TURN_UNDEAD = 398; /* spell ID for turn undead */

const _M2_UNDEAD = 0x00000002;

function _is_undead(ptr) {
    return ptr && ((ptr.mflags2 | 0) & _M2_UNDEAD) !== 0;
}

/* C ref: pray.c:2345 maybe_turn_mon_iter() — iterable for undead turning.
 * Async (resist/killed/monflee are), so doturn walks the chain itself. */
async function maybe_turn_mon_iter(mtmp) {
    const u = game.u;
    const dx = (mtmp.mx | 0) - (u.ux | 0), dy = (mtmp.my | 0) - (u.uy | 0);
    if (!couldsee(mtmp.mx, mtmp.my) || (dx * dx + dy * dy) > game.turn_undead_range)
        return;
    if (!mtmp.mpeaceful
        && (_is_undead(mtmp.data) || _is_vampshifter(mtmp)
            || (_is_demon(mtmp.data) && ((u.ulevel | 0) > Math.trunc(MAXULEV / 2))))) {
        mtmp.msleeping = 0;
        if (Confusion_hero()) {
            if (!(game.turn_undead_msg_cnt++))
                await pline("Unfortunately, your voice falters.");
            mtmp.mflee = 0;
            mtmp.mfrozen = 0;
            mtmp.mcanmove = 1;
        } else if (!await resist(mtmp, 0, 0, 1 /* TELL */)) {
            let xlev = 6;
            let flee = true;
            switch (mtmp.data.mlet | 0) {
            case S_LICH: xlev += 2;
            // falls through
            case S_GHOST: xlev += 2;
            // falls through
            case S_VAMPIRE: xlev += 2;
            // falls through
            case S_WRAITH: xlev += 2;
            // falls through
            case S_MUMMY: xlev += 2;
            // falls through
            case S_ZOMBIE:
                if ((u.ulevel | 0) >= xlev && !await resist(mtmp, 0, 0, 0 /* NOTELL */)) {
                    if ((u.ualign?.type | 0) === A_CHAOTIC) {
                        mtmp.mpeaceful = 1;
                        set_malign(mtmp);
                    } else { /* damn them */
                        await killed(mtmp);
                    }
                    flee = false;
                }
                break;
            default:
                break;
            }
            if (flee)
                await monflee(mtmp, 0, false, true);
        }
    }
}

/* C ref: pray.c:2414 doturn() — Knights & Priest(esse)s only #turn command */
export async function doturn() {
    const g = game;
    const u = g.u || (g.u = {});
    const youmonst = g.youmonst;
    const ymData = youmonst && youmonst.data;

    /* Knights & Priest(esse)s only please */
    if (!_Role_if(PM_CLERIC) && !_Role_if(PM_KNIGHT)) {
        if (known_spell(_SPE_TURN_UNDEAD))
            return await spelleffects(_SPE_TURN_UNDEAD, false, false);
        await You("don't know how to turn undead!");
        return ECMD_OK;
    }

    u.uconduct = u.uconduct || {};
    /* C pray.c:2425-2427 `if (!u.uconduct.gnostic++) livelog_printf(...)` is a
     * POST-increment, so the guard tests the PRE-bump value.  This read the
     * POST-bump value, which is >= 1 on every path and therefore never true --
     * the entry could not fire even once.  The flag was also literally 0 rather
     * than LL_CONDUCT (const.js:749 = 0x20), which show_gamelog's `final`
     * filter tests against LL_majors. */
    if (!((u.uconduct.gnostic | 0))) {
        u.uconduct.gnostic = 1;
        livelog_printf(LL_CONDUCT, "rejected atheism by turning undead");
    } else {
        u.uconduct.gnostic = (u.uconduct.gnostic | 0) + 1;
    }

    const Gname = halu_gname(u.ualign?.type | 0);

    if (!can_chant(youmonst)) {
        await You("are %s upon %s to turn aside evilness.",
            _uprop_active('STRANGLED') ? "not able to call" : "incapable of calling", Gname);
        return (u.uconduct.gnostic === 1) ? ECMD_TIME : ECMD_OK;
    }

    if (((u.ualign?.type | 0) !== A_CHAOTIC
         && (_is_demon(ymData) || _is_undead(ymData) || _is_vampshifter(youmonst)))
        || (u.ugangr | 0) > 6) {
        await pline("For some reason, %s seems to ignore you.", Gname);
        aggravate();
        exercise(A_WIS, false);
        return ECMD_TIME;
    }

    /* C pray.c:2455 `if (Inhell)` = In_hell(&u.uz) (dungeon.c:1942), the
     * dungeon's hellish flag, not a hard-coded dnum: the Valley's dnum is
     * Gehennom's, but the flag is what C reads. */
    if (Inhell()) {
        await pline(_plineVFmt("Since you are in Gehennom, %s %s help you.",
            [Gname, Gname === 'Moloch' ? "won't" : "can't"]));
        aggravate();
        return ECMD_TIME;
    }

    await pline(_plineVFmt("Calling upon %s, you chant an arcane formula.", [Gname]));
    exercise(A_WIS, true);

    /* note: does not perform unturn_dead() on victims' inventories */
    g.turn_undead_range = BOLT_LIM + Math.trunc((u.ulevel | 0) / 5); /* 8 to 14 */
    g.turn_undead_range *= g.turn_undead_range;
    g.turn_undead_msg_cnt = 0;

    /* mon.c:4517 iter_mons: live chain, nmon cached before the callback */
    for (let mtmp = g.fmon, next; mtmp; mtmp = next) {
        next = mtmp.nmon;
        if ((mtmp.mhp | 0) < 1 || (mtmp.mstate | 0) !== 0) continue;
        await maybe_turn_mon_iter(mtmp);
    }

    nomul(-(5 - Math.trunc(((u.ulevel | 0) - 1) / 6))); /* -5 .. -1 */
    g.multi_reason = "trying to turn the monsters";
    g.nomovemsg = "You can move again.";
    return ECMD_TIME;
}

/* C ref: pray.c:1435 gods_upset(g_align) — ugangr bookkeeping then angrygods. */
async function _gods_upset(gAlign) {
    const u = game.u || (game.u = {});
    if (gAlign === (u.ualign?.type | 0)) u.ugangr = (u.ugangr | 0) + 1;
    else if (u.ugangr | 0) u.ugangr = (u.ugangr | 0) - 1;
    await _angrygods(gAlign);
}

/* C pray.c:787-801 — a gift may be swallowed, unseen, or below levitation. */
async function _at_your_feet(str) {
    const u = game.u;
    const blind = _hero_Blind();
    if (blind) str = 'Something';
    if (u.uswallow) {
        await pline('%s %s into %s %s.', str, vtense(str, 'drop'),
                    s_suffix(mon_nam(u.ustuck)), mbodypart(u.ustuck, STOMACH));
    } else {
        await pline('%s %s %s your %s!', str, vtense(str, blind ? 'land' : 'appear'),
                    _Levitation() ? 'beneath' : 'at', makeplural_objnam(body_part(FOOT)));
    }
}

/* C pray.c:804-1000 gcrownu().  The artifact and object constants are the
 * v5 objects.h / artilist.h ordinals, also used by ARTILIST. */
async function _gcrownu() {
    const u = game.u;
    const LONG_SWORD = 54, RUNESWORD = 58;
    const ART_EXCALIBUR = 1, ART_STORMBRINGER = 2, ART_VORPAL_BLADE = 18;
    const SPE_FINGER_OF_DEATH = 371, SPE_RESTORE_ABILITY = 392;
    const ok_wep = (obj) => obj && (obj.oclass === OCLASS_WEAPON || is_weptool(obj));
    for (const prop of [SEE_INVIS, FIRE_RES, COLD_RES, SHOCK_RES, SLEEP_RES, POISON_RES]) {
        u.uprops[prop] ||= { intrinsic: 0, extrinsic: 0, blocked: 0 };
        u.uprops[prop].intrinsic |= FROMOUTSIDE;
    }
    await godvoice(u.ualign.type, null);
    let classGift = 0; /* STRANGE_OBJECT */
    if (Role_if(_FL_PM_WIZARD) && !is_art(u.uwep, ART_VORPAL_BLADE)
        && !is_art(u.uwep, ART_STORMBRINGER) && !carrying(SPE_FINGER_OF_DEATH))
        classGift = SPE_FINGER_OF_DEATH;
    else if (Role_if(PM_MONK) && (!u.uwep || !u.uwep.oartifact)
             && !carrying(SPE_RESTORE_ABILITY))
        classGift = SPE_RESTORE_ABILITY;

    let obj = ok_wep(u.uwep) ? u.uwep : null;
    let alreadyExists = false, inHand = false;
    u.uevent ||= {};
    const gname = _align_gname(u.ualign.type);
    switch (u.ualign.type) {
    case A_LAWFUL:
        u.uevent.uhand_of_elbereth = 1;
        SetVoice(null, 0, 80, voice_deity);
        await verbalize('I crown thee...  The Hand of Elbereth!');
        livelog_printf(LL_DIVINEGIFT, 'was crowned "The Hand of Elbereth" by %s', gname);
        break;
    case A_NEUTRAL:
        u.uevent.uhand_of_elbereth = 2;
        inHand = is_art(u.uwep, ART_VORPAL_BLADE);
        alreadyExists = exist_artifact(LONG_SWORD, artiname(ART_VORPAL_BLADE));
        SetVoice(null, 0, 80, voice_deity);
        await verbalize('Thou shalt be my Envoy of Balance!');
        livelog_printf(LL_DIVINEGIFT, 'became %s Envoy of Balance', s_suffix(gname));
        break;
    case A_CHAOTIC: {
        u.uevent.uhand_of_elbereth = 3;
        inHand = is_art(u.uwep, ART_STORMBRINGER);
        alreadyExists = exist_artifact(RUNESWORD, artiname(ART_STORMBRINGER));
        const what = ((alreadyExists && !inHand) || classGift) ? 'take lives' : 'steal souls';
        SetVoice(null, 0, 80, voice_deity);
        await verbalize('Thou art chosen to %s for My Glory!', what);
        livelog_printf(LL_DIVINEGIFT, 'was chosen to %s for the Glory of %s', what, gname);
        break;
    }
    }
    if (MKOBJ_OC_CLASS[classGift] === OCLASS_SPBOOK) {
        obj = await _fl_mksobj(classGift, true, false);
        const bbuf = actualoname(obj);
        await bless_obj(obj);
        obj.bknown = 1;
        observe_object(obj);
        await _at_your_feet(upstart(ansimpleoname(obj)));
        await dropy(obj);
        u.ugifts = (u.ugifts | 0) + 1;
        livelog_printf(LL_DIVINEGIFT | LL_ARTIFACT | LL_SPOILER, 'was bestowed with %s', bbuf);
        if (known_spell(classGift) !== spe_Unknown && ok_wep(u.uwep))
            obj = u.uwep;
    }
    switch (u.ualign.type) {
    case A_LAWFUL:
        if (!classGift && obj && obj.otyp === LONG_SWORD && !obj.oartifact) {
            const lbuf = _ia_simpleonames(obj);
            if (!_hero_Blind()) await Your('sword shines brightly for a moment.');
            obj = await oname(obj, artiname(ART_EXCALIBUR), ONAME_GIFT | ONAME_KNOW_ARTI);
            if (is_art(obj, ART_EXCALIBUR)) {
                u.ugifts = (u.ugifts | 0) + 1;
                livelog_printf(LL_DIVINEGIFT | LL_ARTIFACT,
                    'had %s wielded %s transformed into %s',
                    game.flags.female ? 'her' : 'his', lbuf, artiname(ART_EXCALIBUR));
            }
        }
        unrestrict_weapon_skill(P_LONG_SWORD);
        if (is_art(obj, ART_EXCALIBUR)) discover_artifact(ART_EXCALIBUR);
        break;
    case A_NEUTRAL:
        if (!classGift) {
            if (obj && inHand) {
                await Your('%s goes snicker-snack!', xname(obj));
                observe_object(obj);
            } else if (!alreadyExists) {
                obj = await _fl_mksobj(LONG_SWORD, false, false);
                obj = await oname(obj, artiname(ART_VORPAL_BLADE), ONAME_GIFT | ONAME_KNOW_ARTI);
                obj.spe = 1;
                await _at_your_feet('A sword');
                await dropy(obj);
                u.ugifts = (u.ugifts | 0) + 1;
                livelog_printf(LL_DIVINEGIFT | LL_ARTIFACT, 'was bestowed with %s', artiname(ART_VORPAL_BLADE));
            }
        }
        unrestrict_weapon_skill(P_LONG_SWORD);
        if (is_art(obj, ART_VORPAL_BLADE)) discover_artifact(ART_VORPAL_BLADE);
        break;
    case A_CHAOTIC: {
        const swordbuf = `${hcolor(NH_BLACK)} sword`;
        if (!classGift) {
            if (obj && inHand) {
                await Your('%s hums ominously!', swordbuf);
                observe_object(obj);
            } else if (!alreadyExists) {
                obj = await _fl_mksobj(RUNESWORD, false, false);
                obj = await oname(obj, artiname(ART_STORMBRINGER), ONAME_GIFT | ONAME_KNOW_ARTI);
                obj.spe = 1;
                await _at_your_feet(upstart(an(swordbuf)));
                await dropy(obj);
                u.ugifts = (u.ugifts | 0) + 1;
                livelog_printf(LL_DIVINEGIFT | LL_ARTIFACT, 'was bestowed with %s', artiname(ART_STORMBRINGER));
            }
        }
        unrestrict_weapon_skill(P_BROAD_SWORD);
        if (is_art(obj, ART_STORMBRINGER)) discover_artifact(ART_STORMBRINGER);
        break;
    }
    default:
        obj = null;
        break;
    }
    if (ok_wep(obj)) {
        await bless_obj(obj);
        obj.oeroded = obj.oeroded2 = 0;
        obj.oerodeproof = true;
        obj.bknown = obj.rknown = 1;
        if (obj.spe < 1) obj.spe = 1;
        unrestrict_weapon_skill(weapon_type(obj));
    } else if (!classGift) {
        await _You_feel('unworthy.');
    }
    update_inventory();
    await add_weapon_skill(1);
}

/* C pray.c:1003-1071 — the alternative to crowning in pleased(). */
async function _give_prayer_spell() {
    const u = game.u;
    const SPE_BLANK_PAPER = 407;
    let trycnt = u.ulevel + 1;
    const obj = await _fl_mkobj(-OCLASS_SPBOOK /* SPBOOK_no_NOVEL */, true);
    while (--trycnt > 0) {
        if (obj.otyp !== SPE_BLANK_PAPER) {
            if (known_spell(obj.otyp) <= spe_Unknown
                && P_SKILL(spell_skilltype(obj.otyp)) !== P_ISRESTRICTED)
                break;
        } else if (!game._oc_name_known?.[SPE_BLANK_PAPER]
                   || carrying(_IA_MAGIC_MARKER_OTYP)) {
            break;
        }
        obj.otyp = rnd_class(MKOBJ_SVB_BASES[OCLASS_SPBOOK], SPE_BLANK_PAPER);
    }
    let knowledge;
    if (obj.otyp !== SPE_BLANK_PAPER && !rn2(4)
        && (knowledge = known_spell(obj.otyp)) !== 1 /* spe_Fresh */) {
        const letter = force_learn_spell(obj.otyp);
        if (letter !== '\0') {
            const name = PRAY_OC_NAME[obj.otyp];
            if (knowledge === spe_Unknown)
                await pline("Divine knowledge of %s fills your mind!  Spell '%c'.", name, letter);
            else
                await Your("knowledge of spell '%c' - %s is %s.", letter, name,
                           knowledge === -1 /* spe_Forgotten */ ? 'restored' : 'refreshed');
        }
        await obfree(obj, null);
    } else {
        observe_object(obj);
        if (obj.otyp === SPE_BLANK_PAPER || !rn2(100)) makeknown(obj.otyp);
        await bless_obj(obj);
        await _at_your_feet(upstart(ansimpleoname(obj)));
        place_object(obj, u.ux, u.uy);
        newsym(u.ux, u.uy);
    }
}

async function _fry_by_god(respGod, viaDisintegration) {
    await pline(`You ${!viaDisintegration ? "fry to a crisp" : "disintegrate into a pile of dust"}!`);
    game.svk ||= {};
    game.svk.killer ||= {};
    game.svk.killer.format = KILLED_BY;
    game.svk.killer.name = `the wrath of ${_align_gname(respGod)}`;
    await done(DIED);
}

/* C pray.c:609-690 — divine lightning, then disintegration. */
async function _god_zaps_you(respGod) {
    const u = game.u;
    if (u.uswallow) {
        await pline("Suddenly a bolt of lightning comes down at you from the heavens!");
        await pline("It strikes %s!", mon_nam(u.ustuck));
        if (!Resists_Elem(u.ustuck, SHOCK_RES)) {
            await pline("%s fries to a crisp!", Monnam(u.ustuck));
            await xkilled(u.ustuck, XKILL_NOMSG | XKILL_NOCONDUCT);
        } else {
            await pline("%s seems unaffected.", Monnam(u.ustuck));
        }
    } else {
        await pline("Suddenly, a bolt of lightning strikes you!");
        if (_uprop_active('REFLECTING')) {
            shieldeff_gz(u.ux, u.uy);
            if (_hero_Blind()) await pline("For some reason you're unaffected.");
            else await ureflects_gz("%s reflects from your %s.", "It");
            monstseesu_gz(M_SEEN_REFL);
        } else if (_uprop_active('SHOCK_RES')) {
            shieldeff_gz(u.ux, u.uy);
            await pline("It seems not to affect you.");
            monstseesu_gz(M_SEEN_ELEC);
            monstunseesu_gz(M_SEEN_REFL);
        } else {
            await _fry_by_god(respGod, false);
            monstunseesu_gz(M_SEEN_REFL | M_SEEN_ELEC);
        }
    }
    await pline(`${_align_gname(respGod)} is not deterred...`);
    if (u.uswallow) {
        await pline("A wide-angle disintegration beam aimed at you hits %s!", mon_nam(u.ustuck));
        if (!Resists_Elem(u.ustuck, DISINT_RES)) {
            await pline("%s disintegrates into a pile of dust!", Monnam(u.ustuck));
            await xkilled(u.ustuck, XKILL_NOMSG | XKILL_NOCORPSE | XKILL_NOCONDUCT);
        } else {
            await pline("%s seems unaffected.", Monnam(u.ustuck));
        }
        return;
    }
    await pline("A wide-angle disintegration beam hits you!");
    const refl = (u.uprops[REFLECTING]?.extrinsic | 0), dis = (u.uprops[DISINT_RES]?.extrinsic | 0);
    const W_ARMS = W_ARMS_TO, W_ARMC = W_ARMC_TO, W_ARM = W_ARM_TO;
    if (u.uarms && !(refl & W_ARMS) && !(dis & W_ARMS)) await disintegrate_arm_gz(u.uarms);
    if (u.uarmc && !(refl & W_ARMC) && !(dis & W_ARMC)) await disintegrate_arm_gz(u.uarmc);
    if (u.uarm && !(refl & W_ARM) && !(dis & W_ARM) && !u.uarmc) await disintegrate_arm_gz(u.uarm);
    if (u.uarmu && !u.uarm && !u.uarmc) await disintegrate_arm_gz(u.uarmu);
    if (!_uprop_active('DISINT_RES')) {
        await _fry_by_god(respGod, true);
        monstunseesu_gz(M_SEEN_DISINT);
    } else {
        await pline("You bask in its black glow for a minute...");
        await godvoice(respGod, "I believe it not!");
        monstseesu_gz(M_SEEN_DISINT);
    }
    if (Is_astralevel(u.uz) || _Is_sanctum(u.uz)) {
        SetVoice(null, 0, 80, voice_deity);
        await verbalize("Thou cannot escape my wrath, mortal!");
        await _summon_prayer_minion(respGod);
        await _summon_prayer_minion(respGod);
        await _summon_prayer_minion(respGod);
        SetVoice(null, 0, 80, voice_deity);
        await verbalize("Destroy %s, my servants!", _prayer_uhim());
    }
}

/* C pray.c:1501-1524 desecrate_altar. */
export async function desecrate_altar(highaltar, altaralign) {
    if (altaralign === game.u.ualign.type) {
        adjalign(-20);
        game.u.ugangr += 5;
    }
    await You_feel('the air around you grow charged...');
    await pline('Suddenly, you realize that %s has noticed you...', _align_gname(altaralign));
    await godvoice(altaralign, `So, mortal!  You dare desecrate my ${highaltar ? 'High Temple' : 'altar'}!`);
    await _god_zaps_you(altaralign);
}

/* C minion.c:198-265 summon_minion(alignment, FALSE). */
async function _summon_prayer_minion(respGod, talk = false) {
    const u = game.u;
    let mnum;
    switch (respGod) {
    case A_LAWFUL: mnum = lminion(); break;
    case A_NEUTRAL:
        mnum = [PM_AIR_ELEMENTAL, PM_FIRE_ELEMENTAL, PM_EARTH_ELEMENTAL, PM_WATER_ELEMENTAL][rn2(4)];
        break;
    case A_CHAOTIC:
    case A_NONE: mnum = ndemon(respGod); break;
    default:
        impossible('unaligned player?');
        mnum = ndemon(A_NONE);
        break;
    }
    if (mnum !== NON_PM) {
        const emin = ![PM_SHOPKEEPER, PM_GUARD, PM_PRIEST, PM_HIGH_PRIEST].includes(mnum);
        const mon = await mklev_makemon(permonstTemplate(mnum), u.ux, u.uy, MM_NOMSG | (emin ? MM_EMIN : 0));
        if (mon) {
            if (emin) {
                mon.isminion = 1;
                _fl_EMIN(mon).min_align = respGod;
                _fl_EMIN(mon).renegade = false;
            }
            if (talk) {
                /* C minion.c:242-253 */
                if (!_hero_Deaf())
                    await pline(`The voice of ${_align_gname(respGod)} booms:`);
                else
                    await _You_feel(`${s_suffix(_align_gname(respGod))} booming voice:`);
                await verbalize('Thou shalt pay for thine indiscretion!');
                if (canspotmon(mon))
                    await pline(`${Amonnam(mon)} appears before you.`);
                mon.mstrategy = ((mon.mstrategy | 0) & ~STRAT_APPEARMSG) >>> 0;
            }
            mon.mpeaceful = false; /* C deliberately does not call set_malign. */
        }
    }
}

/* C ref: pray.c:704 angrygods(resp_god) — the god's displeasure response. */
async function _angrygods(respGod) {
    const u = game.u || (game.u = {});
    if (Inhell()) respGod = A_NONE; /* pray.c:709 */
    u.ublessed = 0;                          /* lose divine protection */

    let maxanger;
    const record = (u.ualign?.record | 0);
    const Luck = _Luck();
    if (respGod !== (u.ualign?.type | 0)) {
        maxanger = Math.trunc(record / 2) + (Luck > 0 ? Math.trunc(-Luck / 3) : -Luck);
    } else {
        maxanger = 3 * (u.ugangr | 0)
            + ((Luck > 0 || record >= STRIDENT_PRAY) ? Math.trunc(-Luck / 3) : -Luck);
    }
    if (maxanger < 1) maxanger = 1;
    else if (maxanger > 15) maxanger = 15;

    const roll = rn2(maxanger);              /* pray.c:725 */
    switch (roll) {
        case 0:
        case 1:
            /* pray.c:728-729 — You_feel respects Unaware. */
            await You_feel(`that ${_align_gname(respGod)} is ${_cmd_Hallucination() ? 'bummed' : 'displeased'}.`);
            break;
        case 2:
        case 3:
            await godvoice(respGod, null);
            await pline(`"Thou ${(_ugod_is_angry() && respGod === (u.ualign?.type | 0))
                            ? "hast strayed from the path"
                            : "art arrogant"}, ${
                        (_hero_youmonst()?.data?.mlet | 0) === S_HUMAN
                            ? "mortal" : "creature"}."`);
            SetVoice(null, 0, 80, voice_deity);
            await verbalize("Thou must relearn thy lessons!");
            /* C passes FALSE (== 0), not a JS boolean: attrib.c's msgflg is
             * compared with `== 0` as well as `<= 0`, and `false === 0` is
             * false in JS. */
            adjattrib(A_WIS, -1, 0);
            /* pray.c:741-742: adjattrib's You_feel (attrib.c:195) can
             * block in MSGTYP_STOP (pline.c:283-284).  Finish that pager
             * before losexp or the command loop can resume. */
            if (game._blockingPline) await game._blockingPline;
            await losexp(null);
            break;
        case 6:
            /* C pray.c:744-750 — not Punished: gods_angry + punish(NULL);
             * already Punished falls through to the case 4/5 body. */
            if (!_st_Punished()) {
                await godvoice(respGod, "Thou hast angered me.");
                await punish(null);
                break;
            }
            /* FALLTHRU */
        case 4:
        case 5:
            /* C pray.c:744-760 — gods_angry(), then the black glow and
             * conditional attrcurse/rndcurse sequence. */
            await godvoice(respGod, "Thou hast angered me.");
            if (!_hero_Blind() && !_uprop_active('ANTIMAGIC')) {
                const glow = hcolor(NH_BLACK);
                const article = upstart(_an(glow));
                await pline(`${article} glow surrounds you.`);
            }
            if (rn2(2) || !(await attrcurse()))
                await rndcurse();
            break;
        case 7:
        case 8: {
            /* C pray.c:760-772; minion.c:198-265 summon_minion(respGod, FALSE). */
            await godvoice(respGod, null);
            SetVoice(null, 0, 80, voice_deity);
            await verbalize("Thou durst %s me?", _on_altar() && _a_align(u.ux, u.uy) !== respGod ? "scorn" : "call upon");
            await pline(`"Then die, ${(_hero_youmonst()?.data?.mlet | 0) === S_HUMAN ? "mortal" : "creature"}!"`);
            await _summon_prayer_minion(respGod);
            break;
        }
        default:
            /* C pray.c:792-795 */
            await godvoice(respGod, "Thou hast angered me.");
            await _god_zaps_you(respGod);
            break;
    }
    /* pray.c:780 — reset pray timer even outside prayer.  rnz(300). */
    const newUblesscnt = rnz(300);
    if (newUblesscnt > (u.ublesscnt | 0)) u.ublesscnt = newUblesscnt;
}

async function _pleased(gAlign) {
    const g = game;
    const u = g.u || (g.u = {});
    const DEVOUT = 14, STRIDENT = 4; /* pray.c:64-67 */
    let record = (u.ualign?.record | 0);
    const Hallucination = _cmd_Hallucination();
    const onAltar = _on_altar();

    /* don't use p_trouble — worst trouble may get fixed while praying.
     * `let`, not `const`: C's action switch REASSIGNS trouble from a fresh
     * in_trouble() on every iteration of its case-4 and case-2 loops. */
    let trouble = _in_trouble();        /* pray.c:1074 */
    let pat_on_head = 0;

    /* pray.c:1077-1082 — You_feel("that %s is %s."). */
    const adj = (record >= DEVOUT)
        ? (Hallucination ? 'pleased as punch' : 'well-pleased')
        : (record >= STRIDENT)
            ? (Hallucination ? 'ticklish' : 'pleased')
            : (Hallucination ? 'full' : 'satisfied');
    await pline(`You feel that ${_align_gname(gAlign)} is ${adj}.`);

    if (onAltar && (g._p_aligntyp | 0) !== (u.ualign?.type | 0)) {
        adjalign(-1);
        return;
    } else if (record < 2 && trouble <= 0) {
        adjalign(1);
        record = u.ualign.record;
    }

    if (!trouble && record >= DEVOUT) {
        /* pray.c:1105-1108 — if hero wasn't in trouble, a gratuitous favor. */
        if ((g._p_trouble | 0) === 0)
            pat_on_head = 1;
    } else {
        /* pray.c:1109-1160 — action roll. */
        let tryct = 0;                                  /* pray.c:1112 */
        let prayer_luck = _Luck();
        if (prayer_luck < -1) prayer_luck = -1; /* max(Luck,-1) */
        let action = rn1(prayer_luck + (onAltar ? 3 + _on_shrine() : 2), 1); /* pray.c:1126 */
        if (!onAltar) action = Math.min(action, 3);   /* pray.c:1127-1128 */
        if (record < STRIDENT)                          /* pray.c:1129-1130 */
            action = (record > 0 || !rnl(2)) ? 1 : 0;

        /* C pray.c:1132-1160 — cure troubles in priority order. */
        switch (Math.min(action, 5)) {
            case 5:
                pat_on_head = 1;
                /* FALLTHROUGH to case 4 */
            case 4:
                /* pray.c:1137-1139 — fix ALL troubles:
                 *   do fix_worst_trouble(trouble);
                 *   while ((trouble = in_trouble()) != 0); */
                do {
                    await _fix_worst_trouble(trouble);
                } while ((trouble = _in_trouble()) !== 0);
                break;
            case 3:
                /* pray.c:1143 — fix worst, then fall through to "up to 10". */
                await _fix_worst_trouble(trouble);
                /* FALLTHROUGH to case 2 */
            case 2:
                /* pray.c:1149-1150 — up to 9 more:
                 *   while ((trouble = in_trouble()) > 0 && (++tryct < 10))
                 *       fix_worst_trouble(trouble); */
                while ((trouble = _in_trouble()) > 0 && (++tryct < 10)) {
                    await _fix_worst_trouble(trouble);
                }
                break;
            case 1:
                /* pray.c:1154-1155 — fix worst if a major trouble. */
                if (trouble > 0)
                    await _fix_worst_trouble(trouble);
                break;
            case 0:
                break;                                  /* your god blows you off */
        }
    }

    /* C pray.c:1166-1354 — all favors share this one draw, including the
     * crowning-to-spell fallthrough when already crowned or not yet pious. */
    if (pat_on_head) {
        u.uevent ||= {};
        switch (rn2((_Luck() + 6) >> 1)) {
        case 0:
            break;
        case 1: {
            const wep = u.uwep;
            if (wep && (welded(wep) || wep.oclass === OCLASS_WEAPON || is_weptool(wep))) {
                let repair = (wep.oeroded || wep.oeroded2)
                    ? ` and ${otense(wep, 'are')} now as good as new` : '';
                if (wep.cursed) {
                    if (!_hero_Blind()) {
                        await pline('%s %s%s.', Yobjnam2(wep, 'softly glow'), hcolor(NH_AMBER), repair);
                        g.iflags.last_msg = PLNMSG_OBJ_GLOWS;
                    } else {
                        await _You_feel(`the power of ${_align_gname(u.ualign.type)} over ${yname(wep)}.`);
                    }
                    await _uncurse(wep);
                    wep.bknown = 1;
                    repair = '';
                } else if (!wep.blessed) {
                    if (!_hero_Blind()) {
                        await pline('%s with %s aura%s.', Yobjnam2(wep, 'softly glow'), an(hcolor('light blue')), repair);
                        g.iflags.last_msg = PLNMSG_OBJ_GLOWS;
                    } else {
                        await _You_feel(`the blessing of ${_align_gname(u.ualign.type)} over ${yname(wep)}.`);
                    }
                    await bless_obj(wep);
                    wep.bknown = 1;
                    repair = '';
                }
                if (wep.oeroded || wep.oeroded2) {
                    wep.oeroded = wep.oeroded2 = 0;
                    if (repair)
                        await pline('%s as good as new!', Yobjnam2(wep, _hero_Blind() ? 'feel' : 'look'));
                }
                update_inventory();
            }
            break;
        }
        case 3:
            if (!u.uevent.uopened_dbridge && !u.uevent.gehennom_entered) {
                if ((u.uevent.uheard_tune | 0) < 1) {
                    await godvoice(gAlign, null);
                    SetVoice(null, 0, 80, voice_deity);
                    await verbalize('Hark, %s!', (g.youmonst.data.mflags2 & 0x8 /* M2_HUMAN */) ? 'mortal' : 'creature');
                    SetVoice(null, 0, 80, voice_deity);
                    await verbalize('To enter the castle, thou must play the right tune!');
                    u.uevent.uheard_tune = (u.uevent.uheard_tune | 0) + 1;
                    break;
                } else if (u.uevent.uheard_tune < 2) {
                    await You_hear('a divine music...');
                    await pline('It sounds like:  "%s".', g._tune);
                    u.uevent.uheard_tune++;
                    record_achievement(ACH_TUNE);
                    break;
                }
            }
            /* FALLTHROUGH */
        case 2:
            if (!_hero_Blind()) await You('are surrounded by %s glow.', an(hcolor('golden')));
            if (u.ulevel < u.ulevelmax) {
                u.ulevelmax--;
                await pluslvl(false);
            } else {
                u.uhpmax += 5;
                if (u.uhpmax > u.uhppeak) u.uhppeak = u.uhpmax;
                if (Upolyd(u)) u.mhmax += 5;
            }
            u.uhp = u.uhpmax;
            if (Upolyd(u)) u.mh = u.mhmax;
            if (getAbase(u)[C_ATTR_TO_DISP[A_STR]] < getAmax(u)[C_ATTR_TO_DISP[A_STR]]) {
                getAbase(u)[C_ATTR_TO_DISP[A_STR]] = getAmax(u)[C_ATTR_TO_DISP[A_STR]];
                SET_BOTL();
                await encumber_msg();
            }
            if (u.uhunger < 900) init_uhunger();
            if (u.uluck < 0) u.uluck = 0;
            u.ucreamed = 0;
            make_blinded(0, true);
            SET_BOTL();
            break;
        case 4: {
            let any = 0;
            if (_hero_Blind()) await _You_feel(`the power of ${_align_gname(u.ualign.type)}.`);
            else await You('are surrounded by %s aura.', an(hcolor('light blue')));
            for (let obj = g.invent, next; obj; obj = next) {
                next = obj.nobj;
                if (obj.cursed && (obj !== u.uarmh || obj.otyp !== HELM_OF_OPPOSITE_ALIGNMENT)) {
                    if (!_hero_Blind()) {
                        await pline('%s %s.', Yobjnam2(obj, 'softly glow'), hcolor(NH_AMBER));
                        g.iflags.last_msg = PLNMSG_OBJ_GLOWS;
                        obj.bknown = 1;
                        any++;
                    }
                    await _uncurse(obj);
                }
            }
            if (any) update_inventory();
            break;
        }
        case 5: {
            await godvoice(u.ualign.type, 'Thou hast pleased me with thy progress,');
            let prop, gift;
            if (!(_hprop(TELEPAT) & INTRINSIC)) {
                prop = TELEPAT; gift = 'Telepathy';
            } else if (!(_hprop(_FW_FAST) & INTRINSIC)) {
                prop = _FW_FAST; gift = 'Speed';
            } else if (!(_hprop(STEALTH) & INTRINSIC)) {
                prop = STEALTH; gift = 'Stealth';
            } else {
                prop = PROTECTION; gift = 'my protection';
            }
            if (!(_hprop(prop) & INTRINSIC)) {
                u.uprops[prop] ||= { intrinsic: 0, extrinsic: 0, blocked: 0 };
                u.uprops[prop].intrinsic |= FROMOUTSIDE;
                if (prop === PROTECTION && !u.ublessed) u.ublessed = rn1(3, 2);
            } else if (prop === PROTECTION) {
                u.ublessed++;
            }
            await pline('"and thus I grant thee the gift of %s!"', gift);
            if (prop === TELEPAT && _hero_Blind()) see_monsters();
            SetVoice(null, 0, 80, voice_deity);
            await verbalize('Use it wisely in my name!');
            break;
        }
        case 7:
        case 8:
            if (u.ualign.record >= 20 /* PIOUS */ && !u.uevent.uhand_of_elbereth) {
                await _gcrownu();
                break;
            }
            /* FALLTHROUGH */
        case 6:
            await _give_prayer_spell();
            break;
        default:
            impossible('Confused deity!');
            break;
        }
    }

    /* pray.c:1356-1361 — reset the pray timer and the demigod/elbereth penalty. */
    u.ublesscnt = rnz(350);                             /* pray.c:1356 */
    let kick_on_butt = (u.uevent && u.uevent.udemigod) ? 1 : 0;
    if (u.uevent && u.uevent.uhand_of_elbereth) kick_on_butt++;
    if (kick_on_butt) u.ublesscnt = (u.ublesscnt | 0) + kick_on_butt * rnz(1000); /* pray.c:1361 */

    /* C pray.c:1371-1378: long games gradually increase the prayer timeout,
     * capped so the resulting timer remains representable by a 16-bit int. */
    if (g.moves > 100000) {
        let incr = Math.trunc((g.moves - 100000) / 100);
        const largest_ublesscnt_incr = 32767 - u.ublesscnt; /* LARGEST_INT */
        if (incr > largest_ublesscnt_incr)
            incr = largest_ublesscnt_incr;
        u.ublesscnt += incr;
    }
}

export async function prayer_done() {
    const g = game;
    const u = g.u || (g.u = {});
    const alignment = g._p_aligntyp ?? (u.ualign?.type ?? 0);
    u.uinvulnerable = false;

    if ((g._p_type | 0) === -2) {
        /* praying at an unaligned altar, not necessarily in Gehennom */
        /* C pray.c:2283-2290: MSGTYPE=stop must finish before continuing. */
        await You("%s diabolical laughter all around you...",
            !_hero_Deaf() ? "hear" : "intuit");
        wake_nearby(false);
        adjalign(-2);
        exercise(A_WIS, false);
        if (!Inhell()) {
            /* hero's god[dess] seems to be keeping his/her head down */
            await pline("Nothing else happens."); /* not actually true... */
            return 1;
        } /* else use regular Inhell result below */
    } else if ((g._p_type | 0) === -1) {
        /* praying while poly'd into an undead creature while non-chaotic */
        await godvoice(alignment,
                 (alignment === A_LAWFUL)
                    ? "Vile creature, thou durst call upon me?"
                    : "Walk no more, perversion of nature!");
        await pline("You feel like you are falling apart.");
        /* KMH -- Gods have mastery over unchanging */
        await rehumanize_real();
        /* no Half_physical_damage adjustment here */
        await losehp(rnd(20), "residual undead turning effect", KILLED_BY_AN);
        exercise(A_CON, false);
        return 1;
    }

    if (Inhell()) {
        await pline("Since you are in Gehennom, %s can't help you.",
              align_gname(alignment));
        /* haltingly aligned is least likely to anger */
        if ((u.ualign?.record | 0) <= 0 || rnl((u.ualign?.record | 0)))
            await _angrygods(u.ualign?.type | 0);
        return 0;
    }

    if ((g._p_type | 0) === 0) {
        if (_on_altar() && (u.ualign?.type | 0) !== alignment)
            await _water_prayer(false);
        u.ublesscnt = (u.ublesscnt | 0) + rnz(250);
        _change_luck(-3);
        await _gods_upset(u.ualign?.type | 0);
    } else if ((g._p_type | 0) === 1) {
        if (_on_altar() && (u.ualign?.type | 0) !== alignment)
            await _water_prayer(false);
        await _angrygods(u.ualign?.type | 0); /* naughty */
    } else if ((g._p_type | 0) === 2) {
        if (await _water_prayer(false)) {
            /* attempted water prayer on a non-coaligned altar */
            u.ublesscnt = (u.ublesscnt | 0) + rnz(250);
            _change_luck(-3);
            await _gods_upset(u.ualign?.type | 0);
        } else
            await _pleased(alignment);
    } else {
        /* coaligned */
        if (_on_altar()) {
            await _pray_revive();
            await _water_prayer(true);
        }
        await _pleased(alignment); /* nice */
    }
    return 1;
}

/* C ref: pray.c:1387-1413 water_prayer. */
async function _water_prayer(bless_water) {
    const u = game.u;
    let changed = 0, other = false;
    const bc_known = !(_hero_Blind() || _cmd_Hallucination());
    for (let otmp = game.level?.levelObjects?.[u.ux]?.[u.uy]; otmp; otmp = otmp.nexthere) {
        if (otmp.otyp === _POT_WATER_OTYP
            && (bless_water ? !otmp.blessed : !otmp.cursed)) {
            otmp.blessed = bless_water;
            otmp.cursed = !bless_water;
            otmp.bknown = bc_known;
            changed += otmp.quan;
        } else if (otmp.oclass === POTION_CLASS)
            other = true;
    }
    if (!_hero_Blind() && changed)
        await pline('%s potion%s on the altar glow%s %s for a moment.',
            other ? (changed > 1 ? 'Some of the' : 'One of the') : 'The',
            other || changed > 1 ? 's' : '', changed > 1 ? '' : 's',
            hcolor(bless_water ? 'light blue' : NH_BLACK));
    return changed > 0;
}

/* C pray.c:2176-2195 — revive the first saved, tame non-minion on the altar. */
async function _pray_revive() {
    const u = game.u;
    let otmp;
    for (otmp = game.level.levelObjects[u.ux][u.uy]; otmp; otmp = otmp.nexthere) {
        const saved = otmp.oextra?.omonst;
        if ((otmp.otyp === CORPSE || otmp.otyp === STATUE)
            && saved?.mtame && !saved.isminion)
            break;
    }
    if (!otmp)
        return false;
    if (otmp.otyp === CORPSE)
        return !!(await revive(otmp, true));
    return !!(await animate_statue(otmp, u.ux, u.uy, ANIMATE_SPELL, null));
}

/* C ref: pray.c:2506-2510 a_gname() — returns the name of the altar's deity.
 * Calls a_gname_at(u.ux, u.uy). */
export function a_gname() {
    return a_gname_at(game.u.ux | 0, game.u.uy | 0);
}

/* C ref: pray.c:2513-2520 a_gname_at(coordxy x, coordxy y) — returns the name
 * of the deity at an altar location. Returns null if not on an altar. */
export function a_gname_at(x, y) {
    const levloc = _levlAt(x | 0, y | 0);
    if (!levloc || !IS_ALTAR(levloc.typ))
        return null;

    /* a_align(x, y) macro: ((aligntyp) Amask2align(levl[x][y].altarmask & AM_MASK)) */
    const alignment = Amask2align((levloc.altarmask | 0) & AM_MASK);
    return _align_gname(alignment);
}

/* C ref: pray.c:2529 align_gname(aligntyp alignment) */
export function align_gname(alignment) {
    return _align_gname(alignment);
}

export function align_gtitle(alignment) {
    let gnam;
    let result = 'god';

    switch (alignment) {
    case A_LAWFUL:
        gnam = game.u.lgod;
        break;
    case A_NEUTRAL:
        gnam = game.u.ngod;
        break;
    case A_CHAOTIC:
        gnam = game.u.cgod;
        break;
    default:
        gnam = 0;
        break;
    }
    if (gnam && gnam[0] === '_')
        result = 'goddess';
    return result;
}

/* C ref: pray.c:2557 — static hallu_gods[] */
const hallu_gods = [
    "the Flying Spaghetti Monster",
    "Eris",
    "the Martians",
    "Xom",
    "AnDoR dRaKoN",
    "the Central Bank of Yendor",
    "Tooth Fairy",
    "Om",
    "Yawgmoth",
    "Morgoth",
    "Cthulhu",
    "the Ori",
    "destiny",
    "your Friend the Computer",
];

/* C ref: pray.c:2576-2625 — halu_gname(aligntyp alignment) */
export function halu_gname(alignment) {
    let gnam = null;
    let which;

    /* C pray.c:2582-2583: return align_gname(alignment) if !Hallucination. */
    if (!_cmd_Hallucination())
        return align_gname(alignment);

    /* Some roles (Priest) don't have a pantheon unless we're playing as
       that role, so keep trying until we get a role which does have one. */
    do
        which = randrole(true);
    while (!ROLE_GODS[which][0]);

    switch (rn2_on_display_rng(9)) {
    case 0:
    case 1:
        gnam = ROLE_GODS[which][0];
        break;
    case 2:
    case 3:
        gnam = ROLE_GODS[which][1];
        break;
    case 4:
    case 5:
        gnam = ROLE_GODS[which][2];
        break;
    case 6:
    case 7:
        gnam = hallu_gods[rn2_on_display_rng(hallu_gods.length)];
        break;
    case 8:
        gnam = _MOLOCH;
        break;
    default:
        impossible("rn2 broken in halu_gname?!?");
    }
    if (!gnam) {
        impossible("No random god name?");
        gnam = "your Friend the Computer"; /* Paranoia */
    }
    if (gnam[0] === '_')
        gnam = gnam.slice(1);
    return gnam;
}

/* C ref: pray.c:60-62 — static const char *const godvoices[]. */
const godvoices = ["booms out", "thunders", "rings out", "booms"];

async function godvoice(gAlign, words) {
    let quot = "";
    if (words)
        quot = '"';
    else
        words = "";

    return pline_The("voice of %s %s: %s%s%s", _align_gname(gAlign),
                     godvoices[rn2(godvoices.length)], quot, words, quot);
}

/* C ref: pray.c:104 — #define ugod_is_angry() (u.ualign.record < 0) */
function _ugod_is_angry() { return (game.u?.ualign?.record | 0) < 0; }

export function u_gname() {
    return align_gname(game.u.ualign.type);
}
