// apply.js -- applying tools.
// C ref: apply.c
//
// Ported so far: the #apply and #rub commands up to choosing the object
// (apply_ok(), rub_ok() and their getobj() calls); using the chosen
// object is not ported yet. The #jump command: dojump(), jump(),
// check_jump(), is_valid_jump_pos(), get_valid_jump_position().

import { game } from './gstate.js';
import { set_ustuck as set_ustuck_jp } from './uhitm.js';
import { Conflict as Conflict_jp, Flying as Flying_jp } from './youprop.js';
import { mon_nam as mon_nam_jp, Monnam as Monnam_jp,
         YMonnam as YMonnam_jp } from './do_name.js';
import { set_wounded_legs as set_wounded_legs_jp, deltrap as deltrap_jp,
         dotrap as dotrap_jp } from './trap.js';
import { hliquid as hliquid_jp } from './potion.js';
import { make_sick as make_sick_uh, make_stunned as make_stunned_uh,
         make_vomiting as make_vomiting_uh,
         make_hallucinated as make_hallucinated_uh,
         make_deaf as make_deaf_uh } from './potion.js';
import { vomit as vomit_uh } from './eat.js';
import { shuffle_int_array as shuffle_int_array_uh } from './rng.js';
import { attacktype_fordmg as attacktype_fordmg_uh } from './mondata.js';
import { Vomiting as Vomiting_uh } from './youprop.js';
import { A_CON as A_CON_UH, SICK as SICK_UH, VOMITING as VOMITING_UH,
         CONFUSION as CONFUSION_UH, STUNNED as STUNNED_UH,
         SICK_NONVOMITABLE as SICK_NONVOMITABLE_UH,
         SICK_ALL as SICK_ALL_UH } from './const.js';
import { AT_ENGL as AT_ENGL_UH, AD_BLND as AD_BLND_UH } from './monsters.js';
import { LEG as LEG_JP, FORCETRAP as FORCETRAP_JP, TOOKPLUNGE as TOOKPLUNGE_JP,
         LEFT_SIDE as LEFT_SIDE_JP, RIGHT_SIDE as RIGHT_SIDE_JP,
         KILLED_BY as KILLED_BY_JP, TT_BEARTRAP as TT_BEARTRAP_JP,
         TT_WEB as TT_WEB_JP, TT_LAVA as TT_LAVA_JP,
         TT_INFLOOR as TT_INFLOOR_JP } from './const.js';
import { You, You_hear, pline_mon } from './display.js';
import { getobj } from './invent.js';
import { check_capacity } from './hack.js';
import { pick_lock } from './lock.js';
import * as O from './objects.js';
import { thesimpleoname } from './iactions.js';
import { feel_newsym } from './display.js';
import { discover_object } from './o_init.js';
import { MAX_SPELL_STUDY, DEAF, HAND, SDOOR, SCORR, CORR, ARTICLE_A,
         SUPPRESS_IT, SUPPRESS_INVISIBLE, Is_stronghold } from './const.js';
import { surface } from './iactions.js';
import { can_reach_floor, cant_reach_floor } from './engrave.js';
import { getdir } from './cmd.js';
import { confdir } from './hack.js';
import { freehand } from './wield.js';
import { body_part, mstatusline, ustatusline } from './insight.js';
import { rn2 } from './rng.js';
import { m_at } from './makemon.js';
import { x_monnam } from './do_name.js';
import { canspotmon, newsym, map_invisible, unmap_invisible,
         pline_The } from './display.js';
import { cvt_sdoor_to_door } from './detect.js';
import { recalc_block_point, unblock_point } from './vision.js';
import { mons, PM_HEALER, PM_AIR_ELEMENTAL, S_VORTEX } from './monsters.js';
import {
    Blind, Hallucination, Deaf, Wounded_legs, Jumping, Levitation, Passes_walls
} from './youprop.js';
import { uhim, uhis, mhis } from './mhitu.js';
import { uprop } from './youprop.js';
import { GETOBJ_SUGGEST, GETOBJ_DOWNPLAY, GETOBJ_EXCLUDE,
         GETOBJ_EXCLUDE_SELECTABLE, GETOBJ_NOFLAGS, ECMD_OK, ECMD_CANCEL,
         HALLUC, P_AXE } from './const.js';
import { objects, TOOL_CLASS, WAND_CLASS, SPBOOK_CLASS, COIN_CLASS,
         WEAPON_CLASS, POTION_CLASS, BULLWHIP, POT_OIL, CREAM_PIE,
         EUCALYPTUS_LEAF, LUMP_OF_ROYAL_JELLY, BANANA, TOUCHSTONE, PICK_AXE,
         DWARVISH_MATTOCK, OIL_LAMP, MAGIC_LAMP, BRASS_LANTERN, is_pick,
         is_axe, is_graystone, is_pole, u_wield_art } from './objects.js';
import { M1_NOHANDS, M1_NOLIMBS, M1_SLITHY, M2_ROCKTHROW } from './monsters.js';
import { pline, You_cant, There, canseemon } from './display.js';
import { near_capacity, nomul } from './hack.js';
import { teleds } from './teleport.js';
import { morehungry, use_tin_opener } from './eat.js';
import { rnd } from './rng.js';
import { TELEDS_NO_FLAGS } from './const.js';
import { getpos, getpos_sethilite } from './getpos.js';
import { walk_path, hurtle_jump } from './dothrow.js';
import { known_spell, spe_Fresh, spelleffects } from './spell.js';
import { dowrite } from './write.js';
import { cansee } from './vision.js';
import { closed_door, sobj_at } from './makemon.js';
import { t_at } from './trap.js';
import { dist2, distu, mdistu } from './hacklib.js';
import { ACURR } from './attrib.js';
import { A_CHA } from './const.js';
import { poly_gender } from './polyself.js';
import { observe_object as observe_object_st,
         makeknown as makeknown_st } from './o_init.js';
import { any_obj_ok as any_obj_ok_st, prinv as prinv_st,
         useup as useup_st } from './invent.js';
import { obj_resists as obj_resists_st } from './dogmove.js';
import { You_feel as You_feel_st, You_see as You_see_st } from './display.js';
import { plur as plur_st } from './hacklib.js';
import { Race_if as Race_if_st, Role_if as Role_if_st,
         GETOBJ_PROMPT as GETOBJ_PROMPT_ST } from './const.js';
import { PM_GNOME as PM_GNOME_ST } from './monsters.js';
import { SPE_JUMPING, BOULDER } from './objects.js';
import { ECMD_TIME, ECMD_FAIL, JUMPING, PASSES_WALLS, LEVITATION, WOUNDED_LEGS,
         INTRINSIC, UNENCUMBERED, A_STR, TT_PIT, IS_STWALL, IS_DOOR, D_ISOPEN,
         ACCESSIBLE, isok, u_at, Is_airlevel, Is_waterlevel } from './const.js';
import { use_container } from './pickup.js';
import { do_play_instrument } from './music.js';
import { invocation_pos as invocation_pos_bl } from './mklev.js';
import { stairway_at as stairway_at_bl } from './display.js';
import { wake_nearby as wake_nearby_bl } from './mon.js';
import { G_GONE as G_GONE_bl } from './const.js';
import { couldsee } from './vision.js';
import { isqrt } from './hacklib.js';
import { glyph_at, tmp_at, DISP_BEAM, DISP_END, sensemon } from './display.js';
import { uwep_skill_type, P_SKILL } from './weapon.js';
import { P_NONE, P_BASIC, P_SKILLED, STATUE_TRAP, IS_FURNITURE, STONE,
         COLNO, ROWNO } from './const.js';
import { DEADMONSTER, wake_nearto } from './mon.js';
import { attack_checks, check_caitiff } from './uhitm.js';
import { overexertion } from './hack.js';
import { thitmonst } from './dothrow.js';
import { u_wipe_engr } from './engrave.js';
import { accessible } from './makemon.js';
import { cmdq_add_ec, cmdq_add_key } from './cmd.js';
import { Confusion, Stunned } from './youprop.js';
import { ART_SNICKERSNEE } from './artilist.js';
import { simpleonames as simpleonames_ap } from './iactions.js';
import { NON_PM as NON_PM_AP } from './const.js';
import { arti_speak, retouch_object } from './artifact.js';
import { stucksteed } from './steed.js';
import { legs_in_no_shape } from './dokick.js';
import { reset_utrap, fire_damage, activate_statue_trap } from './trap.js';
import * as MM_bl from './monsters.js';
import { openit as openit_bl, findit as findit_bl } from './detect.js';
import { unpunish as unpunish_bl } from './read.js';
import { TT_BURIEDBALL as TT_BURIEDBALL_bl } from './const.js';
/* do_break_wand() */
import { objdescr_is as objdescr_is_bw } from './o_init.js';
import { safe_qbuf as safe_qbuf_bw } from './pickup.js';
import { paranoid_query as paranoid_query_bw } from './cmd.js';
import { PARANOID_BREAKWAND as PARANOID_BREAKWAND_BW, HEAD as HEAD_BW,
         COST_DSTROY as COST_DSTROY_BW, EXPL_MAGICAL as EXPL_MAGICAL_BW,
         EXPL_FIERY as EXPL_FIERY_BW, EXPL_FROSTY as EXPL_FROSTY_BW,
         N_DIRS as N_DIRS_BW, xdir as xdir_bw, ydir as ydir_bw,
         NO_MM_FLAGS as NO_MM_FLAGS_BW, NO_KILLER_PREFIX as NO_KILLER_PREFIX_BW,
         OBJ_AT as OBJ_AT_BW } from './const.js';
import { freeinv as freeinv_bw } from './invent.js';
import { zappable as zappable_bw, release_hold as release_hold_bw,
         zapsetup as zapsetup_bw, zapwrapup as zapwrapup_bw, bhitm as bhitm_bw,
         bhitpile as bhitpile_bw, bhito as bhito_bw } from './zap.js';
import { explode as explode_bw } from './explode.js';
import { makemon as makemon_bw } from './makemon.js';
import { bot as bot_bw } from './display.js';
import { pay_for_damage as pay_for_damage_bw } from './shk.js';
import { litroom as litroom_bw } from './read.js';
import { M_AP_TYPE as M_AP_TYPE_AP, M_AP_OBJECT as M_AP_OBJECT_AP,
         M_AP_MONSTER as M_AP_MONSTER_AP,
         M_AP_FURNITURE as M_AP_FURNITURE_AP } from './const.js';
import { simple_typename } from './objnam.js';
import { pmname as pmname_ap, Mgender as Mgender_ap } from './do_name.js';
import { defsyms_explanation as defsyms_explanation_ap } from './pager.js';
import { seemimic as seemimic_ap } from './mon.js';
import { splitobj as splitobj_ap, costly_alteration as costly_alteration_ap,
         obj_extract_self as obj_extract_self_ap } from './mkobj.js';
import { makeplural as makeplural_ap, xname as xname_ap } from './objnam.js';
import { the as the_ap } from './iactions.js';
import { can_blnd as can_blnd_ap, is_whirly, nohands, unsolid, nolimbs,
         has_head } from './mondata.js';
import { AT_WEAP as AT_WEAP_AP } from './monsters.js';
import { make_blinded as make_blinded_ap } from './potion.js';
import { setnotworn as setnotworn_ap } from './worn.js';
import { delobj as delobj_ap } from './invent.js';
import { FACE as FACE_AP, BLINDED as BLINDED_AP, TIMEOUT as TIMEOUT_AP,
         COST_SPLAT as COST_SPLAT_AP } from './const.js';
import { wield_tool as wield_tool_ap } from './wield.js';
import { rn1 as rn1_ap } from './rng.js';
import { djinni_from_bottle as djinni_from_bottle_ap } from './potion.js';
import { nothing_happens as nothing_happens_ap } from './const.js';
import { nothing_seems_to_happen as nothing_seems_to_happen_lp, GLIB as GLIB_LP } from './const.js';
import { Shk_Your as Shk_Your_lp } from './shk.js';
import { yname as yname_lp, Tobjnam as Tobjnam_lp, otense as otense_lp } from './objnam.js';
import { Your as Your_lp } from './display.js';
import { begin_burn as begin_burn_lp, end_burn as end_burn_lp } from './timeout.js';
import { Is_candle } from './mkobj.js';
import { get_obj_location } from './shk.js';
import { make_glib as make_glib_lp } from './potion.js';
import { fingers_or_gloves as fingers_or_gloves_lp } from './do_wear.js';
import { Blindf_on as Blindf_on_dw, Blindf_off as Blindf_off_dw,
         cursed as cursed_dw } from './do_wear.js';
import { d as d_lp } from './rng.js';
import { check_unpaid as check_unpaid_lp } from './zap.js';
import { FUMBLING as FUMBLING_WH, GLIB as GLIB_WH, LEVITATION as LEVITATION_WH,
         FLYING as FLYING_WH, A_DEX as A_DEX_WH, TT_PIT as TT_PIT_WH,
         NO_KILLER_PREFIX as NO_KILLER_PREFIX_WH, FOOT as FOOT_WH,
         IS_WATERWALL, LAVAWALL } from './const.js';
import { PM_ARCHEOLOGIST as PM_ARCHEOLOGIST_WH } from './monsters.js';
import { ceiling as ceiling_wh } from './dungeon.js';
import { is_pool_or_lava } from './hack.js';
import { is_lava as is_lava_wh } from './makemon.js';
import { dbon } from './weapon.js';
import { losehp, Maybe_Half_Phys } from './trap.js';
import { dropx } from './do.js';
import { gloves_simple_name } from './objnam.js';
import { is_wet_towel } from './objects.js';
import { incr_itimeout, set_itimeout } from './potion.js';
import { dry_a_towel } from './weapon.js';
import { gulp_blnd_check } from './mhitu.js';
import { check_unpaid as check_unpaid_cam, zapyourself as zapyourself_cam } from './zap.js';
import { s_suffix as s_suffix_cam } from './hacklib.js';
import { mon_nam as mon_nam_cam } from './do_name.js';
import { mbodypart as mbodypart_cam } from './insight.js';
import { STOMACH as STOMACH_CAM } from './const.js';
import { Monnam } from './do_name.js';
import { noit_mon_nam as noit_mon_nam_ls, Monnam as Monnam_ls,
         l_monnam as l_monnam_ls } from './do_name.js';
import { get_adjacent_loc as get_adjacent_loc_ls } from './cmd.js';
import { use_pick_axe, buried_ball_to_freedom } from './dig.js';
import { glyph_is_invisible as glyph_is_invisible_ls } from './display.js';
import { mons as mons_ls, PM_LONG_WORM as PM_LONG_WORM_LS, M1_UNSOLID as M1_UNSOLID_LS,
         M1_NOLIMBS as M1_NOLIMBS_LS, M1_NOHEAD as M1_NOHEAD_LS } from './monsters.js';
import { MS_SILENT as MS_SILENT_LS } from './monsters.js';
import { find_mid } from './light.js';
import { FM_FMON, RLOC_NOMSG, XKILL_NOMSG, m_next2u } from './const.js';
import { mnexto } from './teleport.js';
import { You_feel } from './display.js';
import { impossible } from './hack.js';
import { um_dist } from './shk.js';
import { breathless } from './mondata.js';
import { xkilled } from './mon.js';
import { growl, yelp, whimper } from './sounds.js';
import { an, singular, xname } from './objnam.js';
import { Glib, Fumbling, Underwater } from './youprop.js';
import { A_DEX } from './const.js';
import { splitobj } from './mkobj.js';
import { fingers_or_gloves } from './do_wear.js';
import { Yname2, otense } from './objnam.js';
import { end_burn } from './timeout.js';
import { dig_check, watch_dig, fillholetyp, liquid_flow,
         digactualhole } from './dig.js';
import { DIGCHECK_FAILED, DIGCHECK_FAIL_BOULDER, IS_WALL, SHOPBASE, ICE,
         MELT_ICE_AWAY, ROOM, PIT, HOLE } from './const.js';
import { in_rooms } from './hack.js';
import { begin_burn } from './timeout.js';
import { freeinv, addinv, carrying } from './invent.js';
import { s_suffix, plur } from './hacklib.js';
import { shk_your, costly_spot } from './shk.js';
import { check_unpaid } from './zap.js';
import { verbalize } from './display.js';
import { bill_dummy_object, obj_extract_self } from './mkobj.js';
import { makeknown } from './o_init.js';
import { hold_another_object } from './wizcmds.js';
import { doname } from './objnam.js';
import { spot_stop_timers } from './timeout.js';
import { Can_dig_down } from './mklev.js';
import { fill_pit } from './muse.js';
import { boulder_hits_pool } from './do.js';
/* use_mirror() */
import { Invis, See_invisible, Free_action, Sick, HConfusion } from './youprop.js';
import { MAXULEV, WEAK, INVIS_BEAM, MONSEEN_NORMAL, MONSEEN_SEEINVIS,
         MONSEEN_INFRAVIS, Upolyd, FACE } from './const.js';
import { PM_FLOATING_EYE, PM_UMBER_HULK, PM_MEDUSA, PM_AMOROUS_DEMON,
         S_VAMPIRE, S_GHOST, S_NYMPH } from './monsters.js';
import { is_vampire, is_vampshifter, haseyes, perceives, is_unicorn,
         humanoid, is_demon } from './mondata.js';
import { make_confused } from './potion.js';
import { hcolor, monverbself } from './do_name.js';
import { bhit } from './dothrow.js';
import { howmonseen } from './pager.js';
import { paralyze_monst } from './mhitm.js';
import { monflee } from './monmove.js';
import { mon_reflects } from './muse.js';
import { killed } from './mon.js';
import { upstart } from './hacklib.js';
import { mhe } from './mhitu.js';
import { mpickobj } from './steal.js';
import { tele_restrict, rloc } from './teleport.js';
import { RLOC_MSG } from './const.js';
/* do_blinding_ray() */
import { FLASHED_LIGHT } from './const.js';
import { flash_hits_mon } from './uhitm.js';
import { see_monster_closeup } from './mon.js';
import { transient_light_cleanup } from './light.js';
/* its_dead() */
import { nxtobj } from './invent.js';
import { get_mtraits } from './mkobj.js';
import { pronoun_gender, PRONOUN_NO_IT } from './do_name.js';
import { obj_has_timer } from './timeout.js';
import { obj_pmname, The } from './objnam.js';
import { type_is_pname, is_female, is_male } from './mondata.js';
import { Has_contents, REVIVE_MON, Role_if } from './const.js';
import { map_object, obj_to_glyph } from './display.js';
import { highc } from './hacklib.js';
import { MZ_TINY } from './monsters.js';
import { genders } from './role.js';
import { rn2_fnptr } from './rng.js';
import { invocation_pos as invocation_pos_cd } from './mklev.js';
import { On_stairs as On_stairs_cd } from './dogmove.js';
import { safe_qbuf as safe_qbuf_cd } from './pickup.js';
import { tty_yn_function as tty_yn_function_cd } from './wintty.js';
import { the as the_cd } from './iactions.js';
import { vtense as vtense_cd } from './objnam.js';
import { obj_merge_light_sources as obj_merge_light_sources_cd } from './light.js';
import { useupall as useupall_cd } from './invent.js';
import { mkobj as mkobj_hp, rnd_class as rnd_class_hp, fixup_oil as fixup_oil_hp,
         weight as weight_hp, add_to_container as add_to_container_hp } from './mkobj.js';
import { vtense as vtense_hp, aobjnam as aobjnam_hp } from './objnam.js';
import { addtobill as addtobill_hp } from './shk.js';
import { hitfloor as hitfloor_hp } from './dothrow.js';
import { doaltarobj as doaltarobj_hp, dropy as dropy_hp } from './do.js';
import { encumber_msg as encumber_msg_hp } from './pickup.js';
import { carried as carried_hp, FOOD_CLASS as FOOD_CLASS_HP } from './objects.js';
import { IRONBARS as IRONBARS_HP, IS_ALTAR as IS_ALTAR_HP } from './const.js';

// C ref: apply.c its_dead() -- the stethoscope applied to a corpse or
// statue at <rx,ry>; returns TRUE if it gave a message
async function its_dead(rx, ry, resp) {
    let buf;
    let mptr;
    let corpse = sobj_at(O.CORPSE, rx, ry),
        statue = sobj_at(O.STATUE, rx, ry);

    if (!can_reach_floor(true)) { /* levitation or unskilled riding */
        corpse = null;            /* can't reach corpse on floor */
        /* you can't reach tiny statues (even though you can fight
           tiny monsters while levitating--consistency, what's that?) */
        while (statue && mons[statue.corpsenm].msize === MZ_TINY)
            statue = nxtobj(statue, O.STATUE, true);
    }
    /* when both corpse and statue are present, pick the uppermost one */
    if (corpse && statue) {
        if (nxtobj(statue, O.CORPSE, true) === corpse)
            corpse = null; /* corpse follows statue; ignore it */
        else
            statue = null; /* corpse precedes statue; ignore statue */
    }
    const more_corpses = !!(corpse && nxtobj(corpse, O.CORPSE, true));

    /* additional stethoscope messages from jyoung@apanix.apana.org.au */
    if (!corpse && !statue) {
        ; /* nothing to do */

    } else if (Hallucination()) {
        if (!corpse) {
            /* it's a statue */
            buf = "You're both stoned";
        } else if (corpse.quan === 1 && !more_corpses) {
            let gndr = 2; /* neuter: "it" */
            const mtmp = get_mtraits(corpse, false);

            /* (most corpses don't retain the monster's sex, so
               we're usually forced to use generic pronoun here) */
            if (mtmp) {
                mtmp.data = mons[mtmp.mnum];
                gndr = pronoun_gender(mtmp, PRONOUN_NO_IT);
            } else {
                mptr = mons[corpse.corpsenm];
                if (is_female(mptr))
                    gndr = 1;
                else if (is_male(mptr))
                    gndr = 0;
            }
            buf = `${genders[gndr].he}'s dead`; /* "he"/"she"/"it" */
            buf = highc(buf[0]) + buf.slice(1);
        } else { /* plural */
            buf = "They're dead";
        }
        /* variations on "He's dead, Jim." (Star Trek's Dr McCoy) */
        await You_hear(`a voice say, "${buf}, Jim."`);
        resp.v = ECMD_TIME;
        return true;

    } else if (corpse) {
        const here = u_at(rx, ry),
              one = (corpse.quan === 1 && !more_corpses);
        let reviver = false;

        const visglyph = glyph_at(rx, ry);
        const corpseglyph = obj_to_glyph(corpse, rn2_fnptr);

        /* visglyph != corpseglyph */
        if (Blind() && !(visglyph.otyp === corpseglyph.otyp
                         && visglyph.corpsenm === corpseglyph.corpsenm
                         && !!visglyph.piletop === !!corpseglyph.piletop))
            map_object(corpse, true);

        if (Role_if(PM_HEALER)) {
            /* ok to reset `corpse' here; we're done with it */
            do {
                if (obj_has_timer(corpse, REVIVE_MON))
                    reviver = true;
                else
                    corpse = nxtobj(corpse, O.CORPSE, true);
            } while (corpse && !reviver);
        }
        await You(`determine that ${
            one ? (here ? "this" : "that") : (here ? "these" : "those")
            } unfortunate being${one ? "" : "s"} ${one ? "is" : "are"}${
            reviver ? " mostly" : ""} dead.`);
        return true;

    } else { /* statue */
        let what, how;

        mptr = mons[statue.corpsenm];
        if (Blind()) { /* ignore statue->dknown; it'll always be set */
            buf = `${u_at(rx, ry) ? "This" : "That"} ${
                humanoid(mptr) ? "person" : "creature"}`;
            what = buf;
        } else {
            what = obj_pmname(statue);
            if (!type_is_pname(mptr))
                what = The(what);
        }
        how = "fine";
        if (Role_if(PM_HEALER)) {
            const ttmp = t_at(rx, ry);

            if (ttmp && ttmp.ttyp === STATUE_TRAP)
                how = "extraordinary";
            else if (Has_contents(statue))
                how = "remarkable";
        }

        await pline(`${what} is in ${how} health for a statue.`);
        return true;
    }
    return false; /* no corpse or statue */
}

/* C ref: apply.c hollow_str[] */
const hollow_str = (what) => `a hollow sound.  This must be a secret ${what}!`;

// C ref: apply.c use_bell()
async function use_bell(obj) {
    const u = game.u;
    let wakem = false, learno = false;
    const ordinary = (obj.otyp !== O.BELL_OF_OPENING || !obj.spe),
        invoking = (obj.otyp === O.BELL_OF_OPENING
                    && invocation_pos_bl(u.ux, u.uy)
                    && !stairway_at_bl(u.ux, u.uy)); /* !On_stairs() */

    /* Hero_playnotes(obj_to_instr(obj), "C", 100): sound only */
    await You(`ring ${the_ap(xname_ap(obj))}.`);

    if (u.uinwater /* Underwater */ || (u.uswallow && ordinary)) {
        await pline("But the sound is muffled.");

    } else if (invoking && ordinary) {
        /* needs to be recharged... */
        await pline("But it makes no sound.");
        learno = true; /* help player figure out why */

    } else if (ordinary) {
        if (obj.cursed && !rn2(4)
            /* note: once any of them are gone, we stop all of them */
            && !(game.mvitals[MM_bl.PM_WOOD_NYMPH].mvflags & G_GONE_bl)
            && !(game.mvitals[MM_bl.PM_WATER_NYMPH].mvflags & G_GONE_bl)
            && !(game.mvitals[MM_bl.PM_MOUNTAIN_NYMPH].mvflags & G_GONE_bl))
            throw new Error('use_bell(): summoning a nymph not ported yet');
        wakem = true;

    } else {
        /* charged Bell of Opening */
        consume_obj_charge(obj, true);

        if (u.uswallow) {
            if (!obj.cursed)
                await openit_bl();
            else
                await pline(nothing_happens_ap);

        } else if (obj.cursed) {
            /* mm = u.ux,u.uy; mkundead(&mm, FALSE, NO_MINVENT) */
            throw new Error('use_bell(): mkundead() not ported yet');

        } else if (invoking) {
            await pline(`${Tobjnam_lp(obj, "issue")} an unsettling shrill sound...`);
            obj.age = game.moves;
            learno = true;
            wakem = true;

        } else if (obj.blessed) {
            let res = 0;

            if (game.uchain) {
                await unpunish_bl();
                res = 1;
            } else if (u.utrap && u.utraptype === TT_BURIEDBALL_bl) {
                await buried_ball_to_freedom();
                res = 1;
            }
            res += await openit_bl();
            switch (res) {
            case 0:
                await pline(nothing_happens_ap);
                break;
            case 1:
                await pline("Something opens..."); /* Something */
                learno = true;
                break;
            default:
                await pline("Things open around you...");
                learno = true;
                break;
            }

        } else { /* uncursed */
            if (await findit_bl() !== 0)
                learno = true;
            else
                await pline(nothing_happens_ap);
        }

    } /* charged BofO */

    if (learno) {
        discover_object(O.BELL_OF_OPENING, true, true, true); /* makeknown() */
        obj.known = 1;
    }
    if (wakem)
        await wake_nearby_bl(true);
}

// C ref: apply.c use_stethoscope()
/* Strictly speaking it makes no sense for usage of a stethoscope to
   not take any time; however, unless it did, the stethoscope would be
   almost useless.  As a compromise, one use per turn is free, another
   uses up the turn; this makes curse status have a tangible effect. */
async function use_stethoscope(obj) {
    const u = game.u;
    let mtmp;
    let res;
    const interference = (u.uswallow && is_whirly(u.ustuck.data)
                          && !rn2((game.urole.mnum === PM_HEALER) ? 10 : 3));

    if (nohands(game.youmonst.data)) {
        await You("have no hands!"); /* not `body_part(HAND)' */
        return ECMD_OK;
    } else if (Deaf() || u.uroleplay?.deaf) { /* Deaf */
        await You_cant("hear anything!");
        return ECMD_OK;
    } else if (!freehand()) {
        await You(`have no free ${body_part(HAND)}.`);
        return ECMD_OK;
    }
    if (!(await getdir(null)))
        return ECMD_CANCEL;

    res = (game.hero_seq === game.context.stethoscope_seq) ? ECMD_TIME : ECMD_OK;
    game.context.stethoscope_seq = game.hero_seq;
    const resp = { v: res }; /* &res for its_dead() */

    game.bhitpos = { x: u.ux, y: u.uy }; /* tentative, reset below */
    game.notonhead = !!u.uswallow;
    if (u.usteed && u.dz > 0) {
        throw new Error('use_stethoscope(): applying to the steed not ported yet');
    } else if (u.uswallow && (u.dx || u.dy || u.dz)) {
        await mstatusline(u.ustuck);
        return res;
    } else if (u.uswallow && interference) {
        throw new Error('use_stethoscope(): engulfer interference not ported yet');
    } else if (u.dz) {
        if (u.uinwater) { /* Underwater */
            await You_hear("faint splashing.");
        } else if (u.dz < 0 || !can_reach_floor(true)) {
            await cant_reach_floor(u.ux, u.uy, (u.dz < 0), true, false);
        } else if (await its_dead(u.ux, u.uy, resp)) {
            ; /* message already given */
        } else if (Is_stronghold(u.uz)) {
            await You_hear("the crackling of hellfire.");
        } else {
            await pline_The(`${surface(u.ux, u.uy)} seems healthy enough.`);
        }
        return resp.v;
    } else if (obj.cursed && !rn2(2)) {
        await You_hear("your heart beat.");
        return res;
    }
    confdir(false);
    if (!u.dx && !u.dy) {
        await ustatusline();
        return res;
    }
    const rx = u.ux + u.dx;
    const ry = u.uy + u.dy;
    if (!isok(rx, ry)) {
        await You_hear("a faint typing noise.");
        return ECMD_OK;
    }
    if ((mtmp = m_at(rx, ry)) !== null) {
        const mnm = x_monnam(mtmp, ARTICLE_A, null,
                             SUPPRESS_IT | SUPPRESS_INVISIBLE, false);

        /* gb.bhitpos needed by mstatusline() iff mtmp is a long worm */
        game.bhitpos = { x: rx, y: ry };
        game.notonhead = (mtmp.mx !== rx || mtmp.my !== ry);

        if (mtmp.mundetected) {
            if (!canspotmon(mtmp))
                await There(`is ${mnm} hidden there.`);
            mtmp.mundetected = 0;
            newsym(mtmp.mx, mtmp.my);
        } else if (mtmp.mappearance) {
            let what = "thing";
            let use_plural = false;

            switch (M_AP_TYPE_AP(mtmp)) {
            case M_AP_OBJECT_AP: {
                /* FIXME?
                 *  we should probably be using object_from_map() here
                 */
                const otyp = mtmp.mappearance; /* init_dummyobj(&dummyobj, mappearance, 1L) */
                /* simple_typename() yields "fruit" for any named fruit;
                   we want the same thing '//' or ';' shows: "slime mold"
                   or "grape" or "slice of pizza" */
                if (otyp === O.SLIME_MOLD && has_mcorpsenm_ap(mtmp)) {
                    /* odummy = init_dummyobj(&dummyobj, mappearance, 1L);
                       odummy->spe = MCORPSENM(mtmp); */
                    const odummy = {
                        otyp, oclass: objects[otyp].oc_class, dknown: 0,
                        /* default is "on" for types which don't use it */
                        known: !objects[otyp].oc_uses_known ? 1 : 0,
                        quan: 1, corpsenm: NON_PM_AP,
                        spe: mtmp.mextra.mcorpsenm,
                    };
                    what = simpleonames_ap(odummy);
                } else {
                    what = simple_typename(otyp);
                }
                /* is_boots(odummy) || is_gloves(odummy) || LENSES */
                use_plural = ((objects[otyp].oc_class === O.ARMOR_CLASS
                               && (objects[otyp].oc_armcat === O.ARM_BOOTS
                                   || objects[otyp].oc_armcat === O.ARM_GLOVES))
                              || otyp === O.LENSES);
                break;
            }
            case M_AP_MONSTER_AP: /* ignore Hallucination here */
                what = pmname_ap(mons[mtmp.mappearance], Mgender_ap(mtmp));
                break;
            case M_AP_FURNITURE_AP:
                what = defsyms_explanation_ap[mtmp.mappearance];
                break;
            }
            seemimic_ap(mtmp);
            await pline(`${use_plural ? "Those" : "That"} ${what} ${
                use_plural ? "are" : "is"} really ${mnm}.`);
        } else if ((game.flags.verbose ?? true) && !canspotmon(mtmp)) {
            await There(`is ${mnm} there.`);
        }

        await mstatusline(mtmp);
        if (!canspotmon(mtmp))
            map_invisible(rx, ry);
        return res;
    }
    if (unmap_invisible(rx, ry))
        await pline_The("invisible monster must have moved.");

    const lev = game.level.at(rx, ry);
    switch (lev.typ) {
    case SDOOR:
        await You_hear(hollow_str("door"));
        cvt_sdoor_to_door(lev); /* ->typ = DOOR */
        recalc_block_point(rx, ry);
        feel_newsym(rx, ry);
        return res;
    case SCORR:
        await You_hear(hollow_str("passage"));
        lev.typ = CORR, lev.flags = 0;
        unblock_point(rx, ry);
        feel_newsym(rx, ry);
        return res;
    }

    if (!(await its_dead(rx, ry, resp)))
        await You("hear nothing special."); /* not You_hear()  */
    return resp.v;
}

// C ref: apply.c flip_through_book()
async function flip_through_book(obj) {
    if (game.u.uinwater) { /* Underwater */
        await You("don't want to get the pages even more soggy, do you?");
        return ECMD_OK;
    }

    await You(`flip through the pages of ${thesimpleoname(obj)}.`);

    if (obj.otyp === O.SPE_BOOK_OF_THE_DEAD) {
        throw new Error('flip_through_book(): the Book of the Dead not ported yet');
    } else if (Blind()) {
        await pline(`The pages feel ${Hallucination() ? "freshly picked"
                                                      : "rough and dry"}.`);
    } else if (obj.otyp === O.SPE_BLANK_PAPER) {
        await pline(`This spellbook ${Hallucination()
                                       ? "doesn't have much of a plot"
                                       : "has nothing written in it"}.`);
        discover_object(obj.otyp, true, true, true); /* makeknown() */
    } else if (Hallucination()) {
        await You("enjoy the animated initials.");
    } else if (obj.otyp === O.SPE_NOVEL) {
        await pline("This looks like it might be interesting to read.");
    } else {
        const fadeness = [
            "fresh",
            "slightly faded",
            "very faded",
            "extremely faded",
            "barely visible"
        ];
        const findx = Math.min(obj.spestudied || 0, MAX_SPELL_STUDY);

        await pline(`The${objects[obj.otyp].oc_magic ? " magical" : ""}`
                    + ` ink in this spellbook is ${fadeness[findx]}.`);
    }

    return ECMD_TIME;
}

/* C ref: mextra.h has_mcorpsenm() */
function has_mcorpsenm_ap(mtmp) { return mtmp.mextra?.mcorpsenm !== undefined; }

// C ref: apply.c use_cream_pie()
async function use_cream_pie(obj) {
    const u = game.u;
    const wasblind = Blind();
    const wascreamed = u.ucreamed;
    let several = false;

    if (obj.quan > 1) {
        several = true;
        obj = splitobj_ap(obj, 1);
    }
    if (Hallucination())
        await You("give yourself a facial.");
    else
        await You(`immerse your ${body_part(FACE_AP)} in ${
            several ? "one of " : ""}${
            several ? makeplural_ap(the_ap(xname_ap(obj))) : the_ap(xname_ap(obj))}.`);
    if (can_blnd_ap(null, game.youmonst, AT_WEAP_AP, obj)) {
        const blindinc = rnd(25);

        u.ucreamed = (u.ucreamed || 0) + blindinc;
        await make_blinded_ap((u.uprops[BLINDED_AP].intrinsic & TIMEOUT_AP) /* BlindedTimeout */
                              + blindinc, false);
        if (!Blind() || (Blind() && wasblind))
            await pline(`There's ${wascreamed ? "more " : ""}sticky goop all over your ${
                body_part(FACE_AP)}.`);
        else /* Blind  && !wasblind */
            await You_cant(`see through all the sticky goop on your ${body_part(FACE_AP)}.`);
    }

    setnotworn_ap(obj);
    /* useup() is appropriate, but we want costly_alteration()'s message */
    costly_alteration_ap(obj, COST_SPLAT_AP);
    obj_extract_self_ap(obj);
    delobj_ap(obj);
    return ECMD_OK;
}

// C ref: apply.c rub_ok() -- getobj callback for object to rub
function rub_ok(obj) {
    if (!obj)
        return GETOBJ_EXCLUDE;

    if (obj.otyp === OIL_LAMP || obj.otyp === MAGIC_LAMP
        || obj.otyp === BRASS_LANTERN || is_graystone(obj)
        || obj.otyp === LUMP_OF_ROYAL_JELLY)
        return GETOBJ_SUGGEST;

    return GETOBJ_EXCLUDE;
}

// C ref: apply.c dorub() -- the #rub command
export async function dorub() {
    if (nohands(game.youmonst.data)) {
        await You("aren't able to rub anything without hands.");
        return ECMD_OK;
    }
    const obj = await getobj("rub", rub_ok, GETOBJ_NOFLAGS);
    if (!obj)
        return ECMD_CANCEL;
    if (obj.oclass === O.GEM_CLASS || obj.oclass === O.FOOD_CLASS) {
        if (is_graystone(obj)) {
            throw new Error('dorub(): use_stone() not ported yet');
        } else if (obj.otyp === O.LUMP_OF_ROYAL_JELLY) {
            throw new Error('dorub(): use_royal_jelly() not ported yet');
        } else {
            await pline("Sorry, I don't know how to use that.");
            return ECMD_OK;
        }
    }
    if (obj !== game.uwep) {
        if (await wield_tool_ap(obj, "rub")) {
            /* cmdq_add_ec(CQ_CANNED, dorub);
               cmdq_add_key(CQ_CANNED, obj->invlet); */
            if (!game.cmdq) game.cmdq = [];
            game.cmdq.push({ typ: 'ec', fn: 'dorub' });
            game.cmdq.push({ typ: 'key', key: obj.invlet });
            return ECMD_TIME;
        }
        return ECMD_OK;
    }

    /* now uwep is obj */
    const uwep = game.uwep;
    if (uwep.otyp === MAGIC_LAMP) {
        if (uwep.spe > 0 && !rn2(3)) {
            /* check_unpaid_usage(uwep, TRUE): unusual item use */
            if (uwep.unpaid && game.u.ushops && game.u.ushops[0])
                throw new Error('dorub(): check_unpaid_usage() not ported yet');
            /* bones preparation:  perform the lamp transformation
               before releasing the djinni in case the latter turns out
               to be fatal (a hostile djinni has no chance to attack yet,
               but an indebted one who grants a wish might bestow an
               artifact which blasts the hero with lethal results) */
            uwep.otyp = OIL_LAMP;
            uwep.spe = 0; /* for safety */
            uwep.age = rn1_ap(500, 1000);
            if (uwep.lamplit)
                begin_burn_lp(uwep, true);
            await djinni_from_bottle_ap(uwep);
            discover_object(MAGIC_LAMP, true, true, true); /* makeknown() */
            /* update_inventory(): no perm_invent */
        } else if (rn2(2)) {
            await You(`${!Blind() ? "see a puff of" : "smell"} smoke.`);
        } else
            await pline(nothing_happens_ap);
    } else if (obj.otyp === BRASS_LANTERN) {
        /* message from Adventure */
        await pline("Rubbing the electric lamp is not particularly rewarding.");
        await pline("Anyway, nothing exciting happens.");
    } else
        await pline(nothing_happens_ap);
    return ECMD_TIME;
}

// C ref: apply.c apply_ok() -- getobj callback for object to apply
function apply_ok(obj) {
    if (!obj)
        return GETOBJ_EXCLUDE;

    /* all tools, all wands (breaking), all spellbooks (flipping through -
       including blank/novel/Book of the Dead) */
    if (obj.oclass === TOOL_CLASS || obj.oclass === WAND_CLASS
        || obj.oclass === SPBOOK_CLASS)
        return GETOBJ_SUGGEST;

    /* applying coins to flip them is a minor easter egg, so do not suggest
       coin application to the player */
    if (obj.oclass === COIN_CLASS)
        return GETOBJ_DOWNPLAY;

    /* certain weapons */
    if (obj.oclass === WEAPON_CLASS
        && (is_pick(obj) || is_axe(obj) || is_pole(obj)
            || obj.otyp === BULLWHIP))
        return GETOBJ_SUGGEST;

    if (obj.oclass === POTION_CLASS) {
        /* permit applying unknown potions, but don't suggest them */
        if (!obj.dknown || !objects[obj.otyp].oc_name_known)
            return GETOBJ_DOWNPLAY;

        /* only applicable potion is oil, and it will only be suggested as a
           choice when already discovered */
        if (obj.otyp === POT_OIL)
            return GETOBJ_SUGGEST;
    }

    /* certain foods */
    if (obj.otyp === CREAM_PIE || obj.otyp === EUCALYPTUS_LEAF
        || obj.otyp === LUMP_OF_ROYAL_JELLY)
        return GETOBJ_SUGGEST;

    if (obj.otyp === BANANA && Hallucination())
        return GETOBJ_DOWNPLAY;

    if (is_graystone(obj)) {
        /* The only case where we don't suggest a gray stone is if we KNOW it
           isn't a touchstone. */
        if (!obj.dknown)
            return GETOBJ_SUGGEST;

        if (obj.otyp !== TOUCHSTONE
            && (objects[TOUCHSTONE].oc_name_known
                || objects[obj.otyp].oc_name_known))
            return GETOBJ_EXCLUDE_SELECTABLE;

        return GETOBJ_SUGGEST;
    }

    /* item can't be applied; if picked anyway,
       _EXCLUDE would yield "That is a silly thing to apply.",
       _EXCLUDE_SELECTABLE yields "Sorry, I don't know how to use that." */
    return GETOBJ_EXCLUDE_SELECTABLE;
}

// C ref: apply.c discard_broken_wand()
function discard_broken_wand() {
    let obj;

    obj = game.current_wand; /* [see dozap() and destroy_items()] */
    game.current_wand = null;
    if (obj)
        delobj_ap(obj);
    nomul(0);
}

// C ref: apply.c broken_wand_explode()
async function broken_wand_explode(obj, dmg, expltype) {
    await explode_bw(game.u.ux, game.u.uy, -(obj.otyp), dmg, WAND_CLASS, expltype);
    discover_object(obj.otyp, true, true, true); /* makeknown(): explode
                                                    describes the effect */
    discard_broken_wand();
}

// C ref: apply.c maybe_dunk_boulders()
/* if x,y has lava or water, dunk any boulders at that location into it */
export async function maybe_dunk_boulders(x, y) {
    let otmp;

    while (is_pool_or_lava(x, y) && (otmp = sobj_at(BOULDER, x, y)) !== null) {
        obj_extract_self_ap(otmp);
        await boulder_hits_pool(otmp, x, y, false);
    }
}

// C ref: apply.c do_break_wand()
/* return 1 if the wand is broken, hence some time elapsed */
async function do_break_wand(obj) {
    const nothing_else_happens = "But nothing else happens...";
    const g = game;
    const u = g.u;
    let i;
    let x, y;
    let mon;
    let dmg, damage;
    let affects_objects;
    let shop_damage = false;
    let fillmsg = false;
    let confirm, buf;
    const is_fragile = (objdescr_is_bw(obj, "balsa")
                        || objdescr_is_bw(obj, "glass"));

    if (nohands(g.youmonst.data)) {
        await You_cant(`break ${yname_lp(obj)} without hands!`);
        return ECMD_OK;
    } else if (!freehand()) {
        await Your_lp(`${makeplural_ap(body_part(HAND))} are occupied!`);
        return ECMD_OK;
    } else if (ACURR(A_STR) < (is_fragile ? 5 : 10)) {
        await You(`don't have the strength to break ${yname_lp(obj)}!`);
        return ECMD_OK;
    }
    confirm = safe_qbuf_bw("Are you really sure you want to break ",
                           "?", obj, yname_lp, "the wand");
    if (!(await paranoid_query_bw(
            (g.flags.paranoia_bits & PARANOID_BREAKWAND_BW) !== 0, /* ParanoidBreakwand */
            confirm)))
        return ECMD_OK;
    await pline(`Raising ${yname_lp(obj)} high above your ${body_part(HEAD_BW)
                }, you ${is_fragile ? "snap" : "break"} it in two!`);

    /* [ALI] Do this first so that wand is removed from bill. Otherwise,
     * the freeinv() below also hides it from setpaid() which causes problems.
     */
    if (obj.unpaid) {
        check_unpaid_lp(obj); /* Extra charge for use */
        costly_alteration_ap(obj, COST_DSTROY_BW);
    }

    g.current_wand = obj; /* destroy_items might reset this */
    freeinv_bw(obj);      /* hide it from destroy_items instead... */
    setnotworn_ap(obj);   /* so we need to do this ourselves */

    if (!(await zappable_bw(obj))) {
        await pline(nothing_else_happens);
        discard_broken_wand();
        return ECMD_TIME;
    }
    /* successful call to zappable() consumes a charge; put it back */
    obj.spe++;
    /* might have "wrested" a final charge, taking it from 0 to -1;
       if so, we just brought it back up to 0, which wouldn't do much
       below so give it 1..3 charges now, usually making it stronger
       than an ordinary last charge (the wand is already gone from
       inventory, so perm_invent can't accidentally reveal this) */
    if (!obj.spe)
        obj.spe = rnd(3);

    obj.ox = u.ux;
    obj.oy = u.uy;
    dmg = obj.spe * 4;
    affects_objects = false;

    switch (obj.otyp) {
    case O.WAN_OPENING:
        if (u.ustuck) {
            await release_hold_bw();
            if (obj.dknown)
                discover_object(O.WAN_OPENING, true, true, true); /* makeknown() */
            discard_broken_wand();
            return ECMD_TIME;
        }
        /*FALLTHRU*/
    case O.WAN_WISHING: // eslint-disable-line no-fallthrough
    case O.WAN_NOTHING:
    case O.WAN_LOCKING:
    case O.WAN_PROBING:
    case O.WAN_ENLIGHTENMENT:
    case O.WAN_SECRET_DOOR_DETECTION:
    case O.WAN_STASIS:
        await pline(nothing_else_happens);
        discard_broken_wand();
        return ECMD_TIME;
    case O.WAN_DEATH:
    case O.WAN_LIGHTNING:
        await broken_wand_explode(obj, dmg * 4, EXPL_MAGICAL_BW);
        return ECMD_TIME;
    case O.WAN_FIRE:
        await broken_wand_explode(obj, dmg * 2, EXPL_FIERY_BW);
        return ECMD_TIME;
    case O.WAN_COLD:
        await broken_wand_explode(obj, dmg * 2, EXPL_FROSTY_BW);
        return ECMD_TIME;
    case O.WAN_MAGIC_MISSILE:
        await broken_wand_explode(obj, dmg, EXPL_MAGICAL_BW);
        return ECMD_TIME;
    case O.WAN_STRIKING:
        /* we want this before the explosion instead of at the very end */
        /* Soundeffect(se_wall_of_force, 65): no sound interface */
        await pline("A wall of force smashes down around you!");
        dmg = d_lp(1 + obj.spe, 6); /* normally 2d12 */
        /*FALLTHRU*/
    case O.WAN_CANCELLATION: // eslint-disable-line no-fallthrough
    case O.WAN_POLYMORPH:
    case O.WAN_TELEPORTATION:
    case O.WAN_UNDEAD_TURNING:
        affects_objects = true;
        break;
    default:
        break;
    }

    /* magical explosion and its visual effect occur before specific effects
     */
    /* [TODO?  This really ought to prevent the explosion from being
       fatal so that we never leave a bones file where none of the
       surrounding targets (or underlying objects) got affected yet.] */
    await explode_bw(obj.ox, obj.oy, -(obj.otyp), rnd(dmg), WAND_CLASS,
                     EXPL_MAGICAL_BW);

    /* prepare for potential feedback from polymorph... */
    zapsetup_bw();

    /* this makes it hit us last, so that we can see the action first */
    for (i = 0; i <= N_DIRS_BW; i++) {
        if (!g.bhitpos)
            g.bhitpos = { x: 0, y: 0 };
        g.bhitpos.x = x = obj.ox + xdir_bw[i];
        g.bhitpos.y = y = obj.oy + ydir_bw[i];
        if (!isok(x, y))
            continue;

        if (obj.otyp === O.WAN_DIGGING) {
            let typ;
            const dcres = dig_check(null /* BY_OBJECT */, x, y);

            if (dcres < DIGCHECK_FAILED || dcres === DIGCHECK_FAIL_BOULDER) {
                if (IS_WALL(g.level.at(x, y).typ)
                    || IS_DOOR(g.level.at(x, y).typ)) {
                    /* normally, pits and holes don't anger guards, but they
                     * do if it's a wall or door that's being dug */
                    await watch_dig(null, x, y, true);
                    if (in_rooms(x, y, SHOPBASE).length)
                        shop_damage = true;
                }
                if (g.level.at(x, y).typ === ICE)
                    spot_stop_timers(x, y, MELT_ICE_AWAY);
                /*
                 * Let liquid flow into the newly created pits.
                 * Adjust corresponding code in music.c for
                 * drum of earthquake if you alter this sequence.
                 */
                typ = fillholetyp(x, y, false);
                if (typ !== ROOM) {
                    g.level.at(x, y).typ = typ, g.level.at(x, y).flags = 0;
                    await liquid_flow(x, y, typ, t_at(x, y),
                                      fillmsg
                                        ? null
                                        : "Some holes are quickly filled with %s!");
                    fillmsg = true;
                } else {
                    await digactualhole(x, y, null /* BY_OBJECT */,
                                        (rn2(obj.spe) < 3
                                         || (!Can_dig_down(u.uz)
                                             && !g.level.at(x, y).candig))
                                            ? PIT : HOLE);
                }
            }
            await fill_pit(x, y);
            await maybe_dunk_boulders(x, y);
            recalc_block_point(x, y);
            continue;
        } else if (obj.otyp === O.WAN_CREATE_MONSTER) {
            /* u.ux,u.uy creates it near you--x,y might create it in rock */
            makemon_bw(null, u.ux, u.uy, NO_MM_FLAGS_BW);
            continue;
        } else if (x !== u.ux || y !== u.uy) {
            /*
             * Wand breakage is targeting a square adjacent to the hero,
             * which might contain a monster or a pile of objects or both.
             * Handle objects last; avoids having undead turning raise an
             * undead's corpse and then attack resulting undead monster.
             * obj->bypass in bhitm() prevents the polymorphing of items
             * dropped due to monster's polymorph and prevents undead
             * turning that kills an undead from raising resulting corpse.
             */
            if ((mon = m_at(x, y))) {
                await bhitm_bw(mon, obj);
                /* if (disp.botl) bot(); */
            }
            if (affects_objects && OBJ_AT_BW(x, y)) {
                await bhitpile_bw(obj, bhito_bw, x, y, 0);
                if (g.disp_botl)
                    bot_bw(); /* potion effects */
            }
        } else {
            /*
             * Wand breakage is targeting the hero.  Using xdir[]+ydir[]
             * deltas for location selection causes this case to happen
             * after all the surrounding squares have been handled.
             * Process objects first, in case damage is fatal and leaves
             * bones, or teleportation sends one or more of the objects to
             * same destination as hero (lookhere/autopickup); also avoids
             * the polymorphing of gear dropped due to hero's transformation.
             * (Unlike with monsters being hit by zaps, we can't rely on use
             * of obj->bypass in the zap code to accomplish that last case
             * since it's also used by retouch_equipment() for polyself.)
             */
            if (affects_objects && OBJ_AT_BW(x, y)) {
                await bhitpile_bw(obj, bhito_bw, x, y, 0);
                if (g.disp_botl)
                    bot_bw(); /* potion effects */
            }
            damage = await zapyourself_cam(obj, false);
            if (damage) {
                buf = `killed ${uhim()}self by breaking a wand`;
                await losehp(Maybe_Half_Phys(damage), buf, NO_KILLER_PREFIX_BW);
            }
            if (g.disp_botl)
                bot_bw(); /* blindness */
        }
    }

    /* potentially give post zap/break feedback */
    await zapwrapup_bw();

    /* Note: if player fell thru, this call is a no-op.
       Damage is handled in digactualhole in that case */
    if (shop_damage)
        await pay_for_damage_bw("dig into", false);

    if (obj.otyp === O.WAN_LIGHT)
        await litroom_bw(true, obj); /* only needs to be done once */

    discard_broken_wand();
    return ECMD_TIME;
}

// C ref: apply.c doapply() -- the #apply command
export async function doapply() {
    if (nohands(game.youmonst.data)) {
        await You("aren't able to use or apply tools in your current form.");
        return ECMD_OK;
    }
    if (await check_capacity(null))
        return ECMD_OK;

    let obj = await getobj("use or apply", apply_ok, GETOBJ_NOFLAGS);
    if (!obj)
        return ECMD_CANCEL;

    let res = ECMD_TIME;
    if (!(await retouch_object(obj, false)))
        return ECMD_TIME; /* evading your grasp costs a turn; just be
                             grateful that you don't drop it as well */

    if (obj.oclass === WAND_CLASS)
        return await do_break_wand(obj);

    if (obj.oclass === SPBOOK_CLASS)
        return await flip_through_book(obj);

    if (obj.oclass === COIN_CLASS)
        return await flip_coin(obj);

    switch (obj.otyp) {
    case O.BLINDFOLD:
    case O.LENSES:
        if (obj === game.ublindf) {
            if (!(await cursed_dw(obj)))
                await Blindf_off_dw(obj);
        } else if (!game.ublindf) {
            await Blindf_on_dw(obj);
        } else {
            await You(`are already ${
                (game.ublindf.otyp === O.TOWEL) ? "covered by a towel"
                : (game.ublindf.otyp === O.BLINDFOLD) ? "wearing a blindfold"
                  : "wearing lenses"}.`);
        }
        break;
    case CREAM_PIE:
        res = await use_cream_pie(obj);
        break;
    case LUMP_OF_ROYAL_JELLY:
        throw new Error('doapply(): use_royal_jelly() not ported yet');
    case BULLWHIP:
        res = await use_whip(obj);
        break;
    case O.GRAPPLING_HOOK:
        throw new Error('doapply(): use_grapple() not ported yet');
    case O.LARGE_BOX:
    case O.CHEST:
    case O.ICE_BOX:
    case O.SACK:
    case O.BAG_OF_HOLDING:
    case O.OILSKIN_SACK:
        res = await use_container(obj, true, false);
        break;
    case O.BAG_OF_TRICKS:
        throw new Error('doapply(): bagotricks() not ported yet');
    case O.CAN_OF_GREASE:
        throw new Error('doapply(): use_grease() not ported yet');
    case O.LOCK_PICK:
    case O.CREDIT_CARD:
    case O.SKELETON_KEY:
        res = ((await pick_lock(obj, 0, 0, null)) !== 0) ? ECMD_TIME : ECMD_OK;
        break;
    case PICK_AXE:
    case DWARVISH_MATTOCK:
        res = await use_pick_axe(obj);
        break;
    case O.TINNING_KIT:
        throw new Error('doapply(): use_tinning_kit() not ported yet');
    case O.LEASH:
        res = await use_leash(obj);
        break;
    case O.SADDLE:
        throw new Error('doapply(): use_saddle() not ported yet');
    case O.MAGIC_WHISTLE:
        throw new Error('doapply(): use_magic_whistle() not ported yet');
    case O.TIN_WHISTLE:
        throw new Error('doapply(): use_whistle() not ported yet');
    case EUCALYPTUS_LEAF:
        throw new Error('doapply(): eucalyptus leaf whistle not ported yet');
    case O.STETHOSCOPE:
        res = await use_stethoscope(obj);
        break;
    case O.MIRROR:
        res = await use_mirror(obj);
        break;
    case O.BELL:
    case O.BELL_OF_OPENING:
        await use_bell(obj);
        break;
    case O.CANDELABRUM_OF_INVOCATION:
        await use_candelabrum(obj);
        break;
    case O.WAX_CANDLE:
    case O.TALLOW_CANDLE:
        obj = await use_candle(obj);
        break;
    case OIL_LAMP:
    case MAGIC_LAMP:
    case BRASS_LANTERN:
        await use_lamp(obj);
        break;
    case POT_OIL:
        obj = await light_cocktail(obj);
        break;
    case O.EXPENSIVE_CAMERA:
        res = await use_camera(obj);
        break;
    case O.TOWEL:
        res = await use_towel(obj);
        break;
    case O.CRYSTAL_BALL:
        throw new Error('doapply(): use_crystal_ball() not ported yet');
    case O.MAGIC_MARKER:
        res = await dowrite(obj);
        break;
    case O.TIN_OPENER:
        res = await use_tin_opener(obj);
        break;
    case O.FIGURINE:
        throw new Error('doapply(): use_figurine() not ported yet');
    case O.UNICORN_HORN: {
        const optr = { obj };
        await use_unicorn_horn(optr);
        obj = optr.obj;
        break;
    }
    case O.WOODEN_FLUTE:
    case O.MAGIC_FLUTE:
    case O.TOOLED_HORN:
    case O.FROST_HORN:
    case O.FIRE_HORN:
    case O.WOODEN_HARP:
    case O.MAGIC_HARP:
    case O.BUGLE:
    case O.LEATHER_DRUM:
    case O.DRUM_OF_EARTHQUAKE:
        res = await do_play_instrument(obj);
        break;
    case O.HORN_OF_PLENTY: /* not a musical instrument */
        await hornoplenty(obj, false, null);
        break;
    case O.LAND_MINE:
    case O.BEARTRAP:
        throw new Error('doapply(): use_trap() not ported yet');
    case O.FLINT:
    case O.LUCKSTONE:
    case O.LOADSTONE:
    case TOUCHSTONE:
        res = await use_stone(obj);
        break;
    case BANANA:
        if (Hallucination()) {
            await pline("It rings! ... But no-one answers.");
            break;
        }
        /*FALLTHRU*/
    default:
        /* Pole-weapons can strike at a distance */
        if (is_pole(obj)) {
            res = await use_pole(obj, false);
            break;
        } else if (is_pick(obj) || is_axe(obj)) {
            res = await use_pick_axe(obj);
            break;
        }
        await pline("Sorry, I don't know how to use that.");
        return ECMD_FAIL;
    }
    /* This assumes that anything that potentially destroyed obj has kept
     * track of it and set obj to null before this point. */
    if (obj && obj.oartifact) {
        res |= await arti_speak(obj); /* sets ECMD_TIME bit if artifact speaks */
    }
    return res;
}

// C ref: apply.c dojump() -- the #jump command
export async function dojump() {
    /* Physical jump */
    return await jump(0);
}

/* C ref: apply.c enum jump_trajectory */
const jAny = 0, /* any direction => magical jump */
    jHorz = 1,
    jVert = 2,
    jDiag = 3; /* jHorz|jVert */

// C ref: apply.c check_jump() -- callback routine for walk_path()
function check_jump(arg, x, y) {
    const traj = arg.traj;
    const lev = game.level.at(x, y);

    if (Passes_walls())
        return true;
    if (IS_STWALL(lev.typ))
        return false;
    if (IS_DOOR(lev.typ)) {
        if (closed_door(x, y))
            return false;
        if ((lev.doormask & D_ISOPEN) !== 0 && traj !== jAny
            /* reject diagonal jump into or out-of or through open door */
            && (traj === jDiag
                /* reject horizontal jump through horizontal open door
                   and non-horizontal (ie, vertical) jump through
                   non-horizontal (vertical) open door */
                || ((traj & jHorz) !== 0) === (!!lev.horizontal)))
            return false;
        /* empty doorways aren't restricted */
    }
    /* let giants jump over boulders */
    if (sobj_at(BOULDER, x, y) && !(game.youmonst.data.mflags2 & M2_ROCKTHROW))
        return false;
    return true;
}

// C ref: apply.c is_valid_jump_pos()
async function is_valid_jump_pos(x, y, magic, showmsg) {
    const u = game.u;
    const HJumping = uprop(JUMPING).intrinsic || 0;
    const EJumping = uprop(JUMPING).extrinsic || 0;

    if (!magic && !(HJumping & ~INTRINSIC) && !EJumping && distu(x, y) !== 5) {
        /* The Knight jumping restriction still applies when riding a
         * horse.  After all, what shape is the knight piece in chess?
         */
        if (showmsg)
            await pline("Illegal move!");
        return false;
    } else if (distu(x, y) > (magic ? 6 + magic * 3 : 9)) {
        if (showmsg)
            await pline("Too far!");
        return false;
    } else if (!isok(x, y)) {
        if (showmsg)
            await You("cannot jump there!");
        return false;
    } else if (!cansee(x, y)) {
        if (showmsg)
            await You("cannot see where to land!");
        return false;
    } else {
        const lev = game.level.at(u.ux, u.uy);
        /* we want to categorize trajectory for use in determining
           passage through doorways: horizontal, vertical, or diagonal;
           since knight's jump and other irregular directions are
           possible, we flatten those out to simplify door checks */
        const dx = x - u.ux, dy = y - u.uy;
        let ax = Math.abs(dx), ay = Math.abs(dy);

        /* diag: any non-orthogonal destination classified as diagonal */
        const diag = (magic || Passes_walls() || (!dx && !dy)) ? jAny
                     : !dy ? jHorz : !dx ? jVert : jDiag;
        /* traj: flatten out the trajectory => some diagonals re-classified */
        if (ax >= 2 * ay)
            ay = 0;
        else if (ay >= 2 * ax)
            ax = 0;
        const traj = (magic || Passes_walls() || (!ax && !ay)) ? jAny
                     : !ay ? jHorz : !ax ? jVert : jDiag;
        /* walk_path doesn't process the starting spot */
        if (diag === jDiag && IS_DOOR(lev.typ)
            && (lev.doormask & D_ISOPEN) !== 0
            && (traj === jDiag
                || ((traj & jHorz) !== 0) === (!!lev.horizontal))) {
            if (showmsg)
                await You_cant("jump diagonally out of a doorway.");
            return false;
        }
        const uc = { x: u.ux, y: u.uy };
        const tc = { x, y }; /* target */
        if (!(await walk_path(uc, tc, check_jump, { traj }))) {
            if (showmsg)
                await There("is an obstacle preventing that jump.");
            return false;
        }
    }
    return true;
}

// C ref: apply.c get_valid_jump_position() -- getpos callback
async function get_valid_jump_position(x, y) {
    return (isok(x, y)
            && (ACCESSIBLE(game.level.at(x, y).typ) || Passes_walls())
            && await is_valid_jump_pos(x, y, game.jumping_is_magic, false));
}

// C ref: apply.c display_jump_positions()
async function display_jump_positions(on_off) {
    let x, y, dx, dy;

    if (on_off) {
        /* on */
        await tmp_at(DISP_BEAM, 0); /* cmap_to_glyph(S_goodpos) */
        for (dx = -4; dx <= 4; dx++)
            for (dy = -4; dy <= 4; dy++) {
                x = dx + game.u.ux;
                y = dy + game.u.uy;
                if (await get_valid_jump_position(x, y) && !u_at(x, y))
                    await tmp_at(x, y);
            }
    } else {
        /* off */
        await tmp_at(DISP_END, 0);
    }
}

// C ref: apply.c use_unicorn_horn()
/* optr: { obj } holder for the horn (C's struct obj **), or null when
   polymorphed into a unicorn */
export async function use_unicorn_horn(optr) {
    const PROP_COUNT = 7; /* number of properties we're dealing with */
    let idx, val, val_limit, trouble_count, unfixable_trbl, did_prop;
    const trouble_list = new Array(PROP_COUNT).fill(0);
    const obj = (optr ? optr.obj : null);
    const u = game.u;
    const P = (p) => (u.uprops[p].intrinsic || 0);

    if (obj && obj.cursed) {
        const lcount = rn1_ap(90, 10);

        switch (Math.trunc(rn2(13) / 2)) { /* case 6 is half as likely as the others */
        case 0:
            await make_sick_uh((P(SICK_UH) & TIMEOUT_AP)
                               ? Math.trunc((P(SICK_UH) & TIMEOUT_AP) / 3) + 1
                               : rn1_ap(ACURR(A_CON_UH), 20),
                               xname(obj), true, SICK_NONVOMITABLE_UH);
            break;
        case 1:
            await make_blinded_ap((P(BLINDED_AP) & TIMEOUT_AP) + lcount, true);
            break;
        case 2:
            if (!Confusion())
                await You(`suddenly feel ${
                    Hallucination() ? "trippy" : "confused"}.`);
            await make_confused((P(CONFUSION_UH) & TIMEOUT_AP) + lcount, true);
            break;
        case 3:
            await make_stunned_uh((P(STUNNED_UH) & TIMEOUT_AP) + lcount, true);
            break;
        case 4:
            if (Vomiting_uh())
                await vomit_uh();
            else
                await make_vomiting_uh(14, false);
            break;
        case 5:
            await make_hallucinated_uh((P(HALLUC) & TIMEOUT_AP) + lcount,
                                       true, 0);
            break;
        case 6:
            if (Deaf()) /* make_deaf() won't give feedback when already deaf */
                await pline(nothing_seems_to_happen_lp);
            await make_deaf_uh((P(DEAF) & TIMEOUT_AP) + lcount, true);
            break;
        }
        return;
    }

    /* #define prop_trouble(X) trouble_list[trouble_count++] = (X) */
    const prop_trouble = (X) => { trouble_list[trouble_count++] = X; };
    /* #define TimedTrouble(P) (((P) && !((P) & ~TIMEOUT)) ? ((P) & TIMEOUT) : 0L) */
    const TimedTrouble = (p) => ((p && !(p & ~TIMEOUT_AP)) ? (p & TIMEOUT_AP) : 0);

    trouble_count = unfixable_trbl = did_prop = 0;

    /* collect property troubles */
    if (TimedTrouble(P(SICK_UH)))
        prop_trouble(SICK_UH);
    if (TimedTrouble(P(BLINDED_AP)) > (u.ucreamed || 0)
        && !(u.uswallow
             && attacktype_fordmg_uh(u.ustuck.data, AT_ENGL_UH, AD_BLND_UH)))
        prop_trouble(BLINDED_AP);
    if (TimedTrouble(P(HALLUC)))
        prop_trouble(HALLUC);
    if (TimedTrouble(P(VOMITING_UH)))
        prop_trouble(VOMITING_UH);
    if (TimedTrouble(P(CONFUSION_UH)))
        prop_trouble(CONFUSION_UH);
    if (TimedTrouble(P(STUNNED_UH)))
        prop_trouble(STUNNED_UH);
    if (TimedTrouble(P(DEAF)))
        prop_trouble(DEAF);

    if (trouble_count === 0) {
        await pline(nothing_happens_ap);
        return;
    } else if (trouble_count > 1)
        shuffle_int_array_uh(trouble_list, trouble_count);

    /*
     *  Chances for number of troubles to be fixed
     *               0      1      2      3      4      5      6      7
     *   blessed:  22.7%  22.7%  19.5%  15.4%  10.7%   5.7%   2.6%   0.8%
     *  uncursed:  35.4%  35.4%  22.9%   6.3%    0      0      0      0
     */
    val_limit = rn2(d_lp(2, (obj && obj.blessed) ? 4 : 2));
    if (val_limit > trouble_count)
        val_limit = trouble_count;

    /* fix [some of] the troubles */
    for (val = 0; val < val_limit; val++) {
        idx = trouble_list[val];

        switch (idx) {
        case SICK_UH:
            await make_sick_uh(0, null, true, SICK_ALL_UH);
            did_prop++;
            break;
        case BLINDED_AP:
            await make_blinded_ap(u.ucreamed || 0, true);
            did_prop++;
            break;
        case HALLUC:
            await make_hallucinated_uh(0, true, 0);
            did_prop++;
            break;
        case VOMITING_UH:
            await make_vomiting_uh(0, true);
            did_prop++;
            break;
        case CONFUSION_UH:
            await make_confused(0, true);
            did_prop++;
            break;
        case STUNNED_UH:
            await make_stunned_uh(0, true);
            did_prop++;
            break;
        case DEAF:
            await make_deaf_uh(0, true);
            did_prop++;
            break;
        default:
            impossible(`use_unicorn_horn: bad trouble? (${idx})`);
            break;
        }
    }

    if (did_prop)
        game.disp_botl = true;
    else
        await pline(nothing_seems_to_happen_lp);
}

// C ref: apply.c jump()
/* 0=Physical, otherwise skill level */
export async function jump(magic) {
    const u = game.u;
    const cc = { x: 0, y: 0 };
    const ydata = game.youmonst.data;

    /* attempt "jumping" spell if hero has no innate jumping ability */
    if (!magic && !Jumping() && known_spell(SPE_JUMPING) >= spe_Fresh)
        return await spelleffects(SPE_JUMPING, false, false);

    if (!magic && ((ydata.mflags1 & M1_NOLIMBS) === M1_NOLIMBS
                   || (ydata.mflags1 & M1_SLITHY))) {
        /* normally (nolimbs || slithy) implies !Jumping,
           but that isn't necessarily the case for knights */
        await You_cant("jump; you have no legs!");
        return ECMD_OK;
    } else if (!magic && !Jumping()) {
        await You_cant("jump very far.");
        return ECMD_OK;
    /* if steed is immobile, can't do physical jump but can do spell one */
    } else if (!magic && u.usteed && await stucksteed(false)) {
        /* stucksteed gave "<steed> won't move" message */
        return ECMD_OK;
    } else if (u.uswallow) {
        if (magic) {
            await You("bounce around a little.");
            return ECMD_TIME;
        }
        await pline("You've got to be kidding!");
        return ECMD_OK;
    } else if (u.uinwater) {
        if (magic) {
            await You("swish around a little.");
            return ECMD_TIME;
        }
        await pline("This calls for swimming, not jumping!");
        return ECMD_OK;
    } else if (u.ustuck) {
        if (u.ustuck.mtame && !Conflict_jp() && !u.ustuck.mconf) {
            const mtmp = u.ustuck;

            set_ustuck_jp(null);
            await You(`pull free from ${mon_nam_jp(mtmp)}.`);
            return ECMD_TIME;
        }
        if (magic) {
            await You(`writhe a little in the grasp of ${mon_nam_jp(u.ustuck)}!`);
            return ECMD_TIME;
        }
        await You(`cannot escape from ${mon_nam_jp(u.ustuck)}!`);
        return ECMD_OK;
    } else if (Levitation() || Is_airlevel(u.uz) || Is_waterlevel(u.uz)) {
        if (magic) {
            await You("flail around a little.");
            return ECMD_TIME;
        }
        await You("don't have enough traction to jump.");
        return ECMD_OK;
    } else if (!magic && near_capacity() > UNENCUMBERED) {
        await You("are carrying too much to jump!");
        return ECMD_OK;
    } else if (!magic && (u.uhunger <= 100 || ACURR(A_STR) < 6)) {
        await You("lack the strength to jump!");
        return ECMD_OK;
    } else if (!magic && Wounded_legs()) {
        await legs_in_no_shape("jumping", !!u.usteed);
        return ECMD_OK;
    } else if (u.usteed && u.utrap) {
        await pline(`${Monnam_jp(u.usteed)} is stuck in a trap.`);
        return ECMD_OK;
    }

    await pline("Where do you want to jump?");
    cc.x = u.ux;
    cc.y = u.uy;
    game.jumping_is_magic = magic;
    await getpos_sethilite(display_jump_positions, get_valid_jump_position);
    if (await getpos(cc, true, "the desired position") < 0)
        return ECMD_CANCEL; /* user pressed ESC */
    if (!(await is_valid_jump_pos(cc.x, cc.y, magic, true))) {
        return ECMD_FAIL;
    } else if (u.usteed && u_at(cc.x, cc.y)) {
        await pline(`${YMonnam_jp(u.usteed)} isn't capable of jumping in place.`);
        return ECMD_FAIL;
    } else {
        let wastrapped = false;

        if (u.utrap) {
            wastrapped = true;
            switch (u.utraptype) {
            case TT_BEARTRAP_JP: {
                const side = rn2(3) ? LEFT_SIDE_JP : RIGHT_SIDE_JP;
                await You("rip yourself free of the bear trap!  Ouch!");
                await losehp(Maybe_Half_Phys(rnd(10)), "jumping out of a bear trap",
                             KILLED_BY_JP);
                await set_wounded_legs_jp(side, rn1_ap(1000, 500));
                break;
            }
            case TT_PIT:
                await You("leap from the pit!");
                break;
            case TT_WEB_JP:
                await You("tear the web apart as you pull yourself free!");
                deltrap_jp(t_at(u.ux, u.uy));
                break;
            case TT_LAVA_JP:
                await You(`pull yourself above the ${hliquid_jp("lava")}!`);
                cc.x = u.ux, cc.y = u.uy; /* take u_at() 'if' below */
                break;
            case TT_BURIEDBALL_bl:
            case TT_INFLOOR_JP:
                await You(`strain your ${makeplural_ap(body_part(LEG_JP))}, but you're still ${
                    (u.utraptype === TT_INFLOOR_JP)
                        ? "stuck in the floor"
                        : "attached to the buried ball"}.`);
                await set_wounded_legs_jp(LEFT_SIDE_JP, rn1_ap(10, 11));
                await set_wounded_legs_jp(RIGHT_SIDE_JP, rn1_ap(10, 11));
                return ECMD_TIME;
            default:
                impossible(`Jumping out of strange trap (${u.utraptype})?`);
                break;
            }
            /* if we reach here, hero is no longer trapped */
            await reset_utrap(true);
        }
        /* jumping on hero's same spot doesn't use walk_path() and isn't
           allowed when riding (handled above) */
        if (u_at(cc.x, cc.y)) {
            /* escaping from a trap takes precedence over jumping in place */
            if (wastrapped) {
                await morehungry(rnd(10));
                return ECMD_TIME;
            }
            /* jumping in place on a trap will trigger it */
            let t;
            if ((t = t_at(cc.x, cc.y)) != null) {
                await You(`jump up and ${!Flying_jp() ? "come" : "fly"} back down.`);
                await dotrap_jp(t, FORCETRAP_JP | TOOKPLUNGE_JP);
                return ECMD_TIME;
            }
            /* jumping in place takes no time and doesn't exercise anything */
            await You(`${Hallucination() ? "hop up and down a bit"
                                       : "decide not to jump after all"}.`);
            return ECMD_OK;
        }

        /*
         * Check the path from uc to cc, calling hurtle_step at each
         * location.  The final position actually reached will be
         * in cc.
         */
        const uc = { x: u.ux, y: u.uy };
        /* calculate max(abs(dx), abs(dy)) as the range */
        let range = cc.x - uc.x;
        if (range < 0)
            range = -range;
        let temp = cc.y - uc.y;
        if (temp < 0)
            temp = -temp;
        if (range < temp)
            range = temp;
        await walk_path(uc, cc, hurtle_jump, { range });
        /* hurtle_jump -> hurtle_step results in <u.ux,u.uy> == <cc.x,cc.y>
         * and usually moves the ball if punished, but does not handle all
         * the effects of landing on the final position.
         */
        await teleds(cc.x, cc.y, TELEDS_NO_FLAGS);
        nomul(-1);
        game.multi_reason = "jumping around";
        game.nomovemsg = "";
        await morehungry(rnd(25));
        return ECMD_TIME;
    }
}

// C ref: apply.c snuff_candle()
/* call in drop, throw, and put in box, etc. */
export async function snuff_candle(otmp) {
    const candle = Is_candle(otmp);

    if ((candle || otmp.otyp === O.CANDELABRUM_OF_INVOCATION)
        && otmp.lamplit) {
        const many = candle ? (otmp.quan > 1) : (otmp.spe > 1);
        const [x, y] = get_obj_location(otmp, 0) || [0, 0];

        if (otmp.where === 'OBJ_MINVENT' ? cansee(x, y) : !Blind())
            await pline(`${Shk_Your_lp(otmp)}${candle ? "" : "candelabrum's "}candle${
                many ? "s'" : "'s"} flame${many ? "s are" : " is"} extinguished.`);
        end_burn_lp(otmp, true);
        return true;
    }
    return false;
}

// C ref: apply.c snuff_lit()
/* called when lit lamp is hit by water or put into a container or
   you've been swallowed by a monster; obj might be in transit while
   being thrown or dropped so don't assume that its location is valid */
export async function snuff_lit(obj) {
    if (obj.lamplit) {
        if (obj.otyp === OIL_LAMP || obj.otyp === MAGIC_LAMP
            || obj.otyp === BRASS_LANTERN || obj.otyp === POT_OIL) {
            const [x, y] = get_obj_location(obj, 0) || [0, 0];
            if (obj.where === 'OBJ_MINVENT' ? cansee(x, y) : !Blind())
                await pline(`${Yname2(obj)} ${otense(obj, "go")} out!`);
            end_burn(obj, true);
            return true;
        }
        if (await snuff_candle(obj))
            return true;
    }
    return false;
}

// C ref: apply.c use_lamp()
async function use_lamp(obj) {
    const u = game.u;
    const lamp = (obj.otyp === OIL_LAMP
                  || obj.otyp === MAGIC_LAMP) ? "lamp"
                 : (obj.otyp === BRASS_LANTERN) ? "lantern"
                   : null;
    const Is_candle = (obj.otyp === O.TALLOW_CANDLE || obj.otyp === O.WAX_CANDLE);

    /*
     * When blind, lamps' and candles' on/off state can be distinguished
     * by heat.  For brass lantern assume that there is an on/off switch
     * that can be felt.
     */

    if (obj.lamplit) {
        if (lamp) /* lamp or lantern */
            await pline(`${Shk_Your_lp(obj)}${lamp} is now off.`);
        else
            await You(`snuff out ${yname_lp(obj)}.`);
        end_burn_lp(obj, true);
        return;
    }
    if (u.uinwater) { /* Underwater */
        await pline(`${!Is_candle ? "This is not a diving lamp"
                                  : "Sorry, fire and water don't mix"}.`);
        return;
    }
    /* magic lamps with an spe == 0 (wished for) cannot be lit */
    if ((!Is_candle && obj.age === 0)
        || (obj.otyp === MAGIC_LAMP && obj.spe === 0)) {
        if (obj.otyp === BRASS_LANTERN) {
            if (!Blind())
                await Your_lp("lantern is out of power.");
            else
                await pline(nothing_seems_to_happen_lp);
        } else {
            await pline(`This ${xname_ap(obj)} has no oil.`);
        }
        return;
    }
    if (obj.cursed && !rn2(2)) {
        if ((obj.otyp === OIL_LAMP || obj.otyp === MAGIC_LAMP) && !rn2(3)) {
            await pline_The(`lamp spills and covers your ${fingers_or_gloves_lp(true)} with oil.`);
            make_glib_lp((u.uprops[GLIB_LP].intrinsic & TIMEOUT_AP) + d_lp(2, 10));
        } else if (!Blind()) {
            await pline(`${Tobjnam_lp(obj, "flicker")} for a moment, then ${otense_lp(obj, "die")}.`);
        } else {
            await pline(nothing_seems_to_happen_lp);
        }
    } else {
        if (lamp) { /* lamp or lantern */
            check_unpaid_lp(obj);
            await pline(`${Shk_Your_lp(obj)}${lamp} is now on.`);
        } else { /* candle(s) */
            await pline(`${s_suffix(Yname2(obj))} flame${plur(obj.quan)} ${
                otense(obj, "burn")}${Blind() ? "." : " brightly!"}`);
            if (obj.unpaid && costly_spot(u.ux, u.uy)
                && obj.age === 20 * objects[obj.otyp].oc_cost) {
                const ithem = (obj.quan > 1) ? "them" : "it";
                /* shkp VOICEONLY: shop_keeper(*in_rooms(u.ux, u.uy, SHOPBASE));
                   SetVoice(shkp, 0, 80, 0) */
                await verbalize(`You burn ${ithem}, you bought ${ithem}!`);
                await bill_dummy_object(obj);
            }
        }
        begin_burn_lp(obj, false);
    }
}

// C ref: apply.c use_candelabrum()
async function use_candelabrum(obj) {
    const u = game.u;
    const s = (obj.spe !== 1) ? "candles" : "candle";

    if (obj.lamplit) {
        await You(`snuff the ${s}.`);
        end_burn(obj, true);
        return;
    }
    if (obj.spe <= 0) {
        let otmp;

        await pline(`This ${xname(obj)} has no ${s}.`);
        /* only output tip if candles are in inventory */
        for (otmp = game.invent; otmp; otmp = otmp.nobj)
            if (Is_candle(otmp))
                break;
        if (otmp)
            await pline(`To attach candles, apply them instead of the ${
                xname(obj)}.`);
        return;
    }
    if (Underwater()) {
        await You("cannot make fire under water.");
        return;
    }
    if (u.uswallow || obj.cursed) {
        if (!Blind())
            await pline_The(`${s} ${vtense_cd(s, "flicker")} for a moment, then ${
                vtense_cd(s, "die")}.`);
        return;
    }
    if (obj.spe < 7) {
        await There(`${vtense_cd(s, "are")} only ${obj.spe} ${s} in ${
            the_cd(xname(obj))}.`);
        if (!Blind())
            await pline(`${obj.spe === 1 ? "It is" : "They are"} lit.  ${
                Tobjnam_lp(obj, "shine")} dimly.`);
    } else {
        await pline(`${The(xname(obj))}'s ${s} burn${
            (Blind() ? "." : " brightly!")}`);
    }
    if (!invocation_pos_cd(u.ux, u.uy) || On_stairs_cd(u.ux, u.uy)) {
        await pline_The(`${s} ${vtense_cd(s, "are")} being rapidly consumed!`);
        /* this used to be obj->age /= 2, rounding down; an age of
           1 would yield 0, confusing begin_burn() and producing an
           unlightable, unrefillable candelabrum; round up instead */
        obj.age = Math.trunc((obj.age + 1) / 2);

        /* to make absolutely sure the game doesn't become unwinnable as
           a consequence of a broken candelabrum */
        if (obj.age === 0) {
            /* impossible("Candelabrum with candles but no fuel?") */
            throw new Error('use_candelabrum(): impossible() no fuel not ported yet');
        }
    } else {
        if (obj.spe === 7) {
            if (Blind())
                await pline(`${Tobjnam_lp(obj, "radiate")} a strange warmth!`);
            else
                await pline(`${Tobjnam_lp(obj, "glow")} with a strange light!`);
        }
        obj.known = 1;
    }
    begin_burn_lp(obj, false);
}

// C ref: apply.c use_candle()
/* returns the candle object left for doapply() (C updates *optr) */
async function use_candle(obj) {
    const u = game.u;
    let otmp;
    let s = (obj.quan !== 1) ? "candles" : "candle";
    let qbuf, q;
    let was_lamplit;

    if (u.uswallow) {
        await You("don't have enough elbow-room to maneuver."); /* no_elbow_room */
        return obj;
    }

    /* obj is the candle; otmp is the candelabrum */
    otmp = carrying(O.CANDELABRUM_OF_INVOCATION);
    if (!otmp || otmp.spe === 7) {
        await use_lamp(obj);
        return obj;
    }

    /* first, minimal candelabrum suffix for formatting candles */
    const qsfx = ` to\x1b${thesimpleoname(otmp)}?`;
    /* next, format the candles as a prefix for the candelabrum */
    qbuf = safe_qbuf_cd("Attach ", qsfx, obj, yname_lp, s);
    /* strip temporary candelabrum suffix */
    if ((q = qbuf.indexOf(" to\x1b")) >= 0)
        qbuf = qbuf.slice(0, q) + " to ";
    /* last, format final "attach candles to candelabrum?" query */
    if ((await tty_yn_function_cd(safe_qbuf_cd(qbuf, "?", otmp, yname_lp, "it"),
                                  "yn", 'n')) === 'n') { /* y_n() */
        await use_lamp(obj);
        return obj;
    } else {
        let optr = obj;

        if (otmp.spe + obj.quan > 7) {
            obj = splitobj(obj, 7 - otmp.spe);
            /* avoid a grammatical error if obj->quan gets
               reduced to 1 candle from more than one */
            s = (obj.quan !== 1) ? "candles" : "candle";
        } else
            optr = null;

        /* The candle's age field doesn't correctly reflect the amount
           of fuel in it while it's lit, because the fuel is measured
           by the timer. So to get accurate age updating, we need to
           end the burn temporarily while attaching the candle. */
        was_lamplit = obj.lamplit;
        if (was_lamplit)
            end_burn(obj, true);

        await You(`attach ${obj.quan}${!otmp.spe ? "" : " more"} ${s} to ${
            the_cd(xname(otmp))}.`);
        if (!otmp.spe || otmp.age > obj.age)
            otmp.age = obj.age;
        otmp.spe += obj.quan;
        if (otmp.lamplit && !was_lamplit)
            await pline_The(`new ${s} magically ${vtense_cd(s, "ignite")}!`);
        else if (!otmp.lamplit && was_lamplit)
            await pline(`${(obj.quan > 1) ? "They go" : "It goes"} out.`);
        if (obj.unpaid) {
            /* shkp VOICEONLY = shop_keeper(*in_rooms(u.ux, u.uy, SHOPBASE));
               SetVoice(shkp, 0, 80, 0) */
            await verbalize(`You ${otmp.lamplit ? "burn" : "use"} ${
                (obj.quan > 1) ? "them" : "it"}, you bought ${
                (obj.quan > 1) ? "them" : "it"}!`);
        }
        if (obj.quan < 7 && otmp.spe === 7)
            await pline(`${The(xname(otmp))} now has seven${
                otmp.lamplit ? " lit" : ""} candles attached.`);
        /* candelabrum's light range might increase */
        if (otmp.lamplit)
            obj_merge_light_sources_cd(otmp, otmp);
        /* candles are no longer a separate light source */
        /* candles are now gone */
        useupall_cd(obj);
        /* candelabrum's weight is changing */
        otmp.owt = weight_hp(otmp);
        /* update_inventory(): no perm_invent */
        return optr;
    }
}

// C ref: apply.c light_cocktail()
/* light a potion of oil; returns the (possibly split off) object, as C
   updates *optr */
async function light_cocktail(obj) { /* obj is a potion of oil */
    const u = game.u;
    let split1off;

    if (u.uswallow) {
        await You("don't have enough elbow-room to maneuver."); /* no_elbow_room */
        return obj;
    }

    if (obj.lamplit) {
        await You("snuff the lit potion.");
        end_burn(obj, true);
        /*
         * Free & add to re-merge potion.  This will average the
         * age of the potions.  Not exactly the best solution,
         * but its easy.  Don't do that unless obj is not worn (uwep,
         * uswapwep, or uquiver) because if wielded and other oil is
         * quivered a "null obj after quiver merge" panic will occur.
         */
        if (!obj.owornmask) {
            freeinv(obj);
            obj = await addinv(obj);
        }
        return obj;
    } else if (u.uinwater) { /* Underwater */
        await There("is not enough oxygen to sustain a fire.");
        return obj;
    }

    split1off = (obj.quan > 1);
    if (split1off)
        obj = splitobj(obj, 1);

    await You(`light ${shk_your(obj)}potion.${
        Blind() ? "" : "  It gives off a dim light."}`);

    if (obj.unpaid && costly_spot(u.ux, u.uy)) {
        /* shkp VOICEONLY: shop_keeper(*in_rooms(u.ux, u.uy, SHOPBASE)) */

        /* Normally, we shouldn't both partially and fully charge
         * for an item, but (Yendorian Fuel) Taxes are inevitable...
         */
        check_unpaid(obj);
        /* SetVoice(shkp, 0, 80, 0) */
        await verbalize("That's in addition to the cost of the potion, of course.");
        await bill_dummy_object(obj);
    }
    makeknown(obj.otyp);

    begin_burn(obj, false); /* after shop billing */
    if (split1off) {
        obj_extract_self(obj); /* free from inv */
        obj.nomerge = 1;
        obj = await hold_another_object(obj, "You drop %s!", doname(obj), null);
        if (obj)
            obj.nomerge = 0;
    }
    return obj;
}

// C ref: apply.c fig_transform()
/* figurine timeout callback */
export async function fig_transform(arg, timeout) {
    throw new Error('fig_transform() not ported yet');
}

// C ref: apply.c beautiful()
/* the hero's appearance; this used to be about mirror-related
   magnetism rather than just appearance, but it has devolved to this... */
export function beautiful() {
    const cha = ACURR(A_CHA);

    /* don't bother complaining about the sexism; NetHack is not real life */
    return ((cha >= 25) ? "sublime" /* 25 is the maximum possible */
            : (cha >= 19) ? "splendorous" /* note: not "splendiferous" */
              : (cha >= 16) ? ((poly_gender() === 1) ? "beautiful" : "handsome")
                : (cha >= 14) ? ((poly_gender() === 1) ? "winsome" : "amiable")
                  : (cha >= 11) ? "cute"
                    : (cha >= 9) ? "plain"
                      : (cha >= 6) ? "homely"
                        : (cha >= 4) ? "ugly"
                          : "hideous"); /* 3 is the minimum possible */
}

// C ref: apply.c look_str
function look_str(s) { return `look ${s}.`; }

// C ref: apply.c use_mirror()
async function use_mirror(obj) {
    const g = game;
    const u = g.u;
    let mtmp;
    let how_seen;
    let mlet;
    let vis, monable;

    if (!(await getdir(null)))
        return ECMD_CANCEL;
    const invis_mirror = Invis();
    const useeit = !Blind() && (!invis_mirror || See_invisible());
    const uvisage = beautiful();
    const mirror = simpleonames_ap(obj); /* "mirror" or "looking glass" */
    if (obj.cursed && !rn2(2)) {
        if (!Blind())
            await pline_The(`${mirror} fogs up and doesn't reflect!`);
        else
            await pline(nothing_seems_to_happen_lp);
        return ECMD_TIME;
    }
    if (!u.dx && !u.dy && !u.dz) {
        if (!useeit) {
            await You_cant(`see your ${uvisage} ${body_part(FACE)}.`);
        } else {
            if (u.umonnum === PM_FLOATING_EYE) {
                if (Free_action()) {
                    await You("stiffen momentarily under your gaze.");
                } else {
                    if (Hallucination())
                        await pline(`Yow!  The ${mirror} stares back!`);
                    else
                        await pline("Yikes!  You've frozen yourself!");
                    if (!Hallucination() || !rn2(4)) {
                        nomul(-rnd(MAXULEV + 6 - u.ulevel));
                        g.multi_reason = "gazing into a mirror";
                    }
                    g.nomovemsg = null; /* default, "you can move again" */
                }
            } else if (is_vampire(g.youmonst.data)
                       || is_vampshifter(g.youmonst)) {
                await You("don't have a reflection.");
            } else if (u.umonnum === PM_UMBER_HULK) {
                await pline("Huh?  That doesn't look like you!");
                await make_confused(HConfusion() + d_lp(3, 4), false);
            } else if (Hallucination()) {
                await You(look_str(hcolor(null)));
            } else if (Sick()) {
                await You(look_str("peaked"));
            } else if (u.uhs >= WEAK) {
                await You(look_str("undernourished"));
            } else if (Upolyd()) {
                const Ugender = (Upolyd() ? u.mfemale : g.flags.female) ? 1 : 0;
                await You(`look like ${an(pmname_ap(mons[u.umonnum], Ugender))}.`);
            } else {
                await You(`look as ${uvisage} as ever.`);
            }
        }
        return ECMD_TIME;
    }
    if (u.uswallow) {
        if (useeit)
            await You(`reflect ${s_suffix_cam(mon_nam_cam(u.ustuck))} ${
                mbodypart_cam(u.ustuck, STOMACH_CAM)}.`);
        return ECMD_TIME;
    }
    if (Underwater()) {
        if (useeit)
            await You(`${Hallucination()
                ? "give the fish a chance to fix their makeup"
                : "reflect the murky water"}.`);
        return ECMD_TIME;
    }
    if (u.dz) {
        if (useeit)
            await You(`reflect the ${
                (u.dz > 0) ? surface(u.ux, u.uy) : ceiling_wh(u.ux, u.uy)}.`);
        return ECMD_TIME;
    }
    const pobj = { obj };
    mtmp = await bhit(u.dx, u.dy, COLNO, INVIS_BEAM, null, null, pobj);
    obj = pobj.obj;
    if (!mtmp || !haseyes(mtmp.data) || g.notonhead)
        return ECMD_TIME;

    /* couldsee(mtmp->mx, mtmp->my) is implied by the fact that bhit()
       targeted it, so we can ignore possibility of X-ray vision */
    vis = canseemon(mtmp);
    /* ways to directly see monster (excludes X-ray vision, telepathy,
       extended detection, type-specific warning) */
    const SEENMON = (MONSEEN_NORMAL | MONSEEN_SEEINVIS | MONSEEN_INFRAVIS);
    how_seen = vis ? howmonseen(mtmp) : 0;
    /* whether monster is able to use its vision-based capabilities */
    monable = !mtmp.mcan && (!mtmp.minvis || perceives(mtmp.data));
    mlet = mtmp.data.mlet;
    if (mtmp.msleeping) {
        if (vis)
            await pline(`${Monnam(mtmp)} is too tired to look at your ${mirror}.`);
    } else if (!mtmp.mcansee) {
        if (vis)
            await pline(`${Monnam(mtmp)} can't see anything right now.`);
    } else if (invis_mirror && !perceives(mtmp.data)) {
        if (vis)
            await pline(`${Monnam(mtmp)} fails to notice your ${mirror}.`);
        /* infravision doesn't produce an image in the mirror */
    } else if ((how_seen & SEENMON) === MONSEEN_INFRAVIS) {
        if (vis) /* (redundant) */
            await pline(`${monverbself(mtmp, Monnam(mtmp), "are",
                                       "too far away to see")} in the dark.`);
        /* some monsters do special things */
    } else if (mlet === S_VAMPIRE || mlet === S_GHOST || is_vampshifter(mtmp)) {
        if (vis)
            await pline(`${Monnam(mtmp)} doesn't have a reflection.`);
    } else if (monable && mtmp.data === mons[PM_MEDUSA]) {
        if (await mon_reflects(mtmp, "The gaze is reflected away by %s %s!"))
            return ECMD_TIME;
        if (vis)
            await pline(`${Monnam(mtmp)} is turned to stone!`);
        g.stoned = true;
        await killed(mtmp);
    } else if (monable && mtmp.data === mons[PM_FLOATING_EYE]) {
        let tmp = d_lp(mtmp.m_lev, mtmp.data.mattk[0].damd);
        if (!rn2(4))
            tmp = 120;
        if (vis)
            await pline(`${Monnam(mtmp)} is frozen by its reflection.`);
        else
            await You_hear("something stop moving.");
        paralyze_monst(mtmp, mtmp.mfrozen + tmp);
    } else if (monable && mtmp.data === mons[PM_UMBER_HULK]) {
        if (vis)
            await pline(`${Monnam(mtmp)} confuses itself!`);
        mtmp.mconf = 1;
    } else if (monable && (mlet === S_NYMPH
                           || mtmp.data === mons[PM_AMOROUS_DEMON])) {
        if (vis) {
            /* "She" or "He" */
            await pline(`${monverbself(mtmp, Monnam(mtmp), "admire", null)
                } in your ${mirror}.`); /* "<mon> admires self in your mirror " */
            await pline(`${upstart(mhe(mtmp))} takes it!`);
        } else
            await pline(`It steals your ${mirror}!`);
        setnotworn_ap(obj); /* in case mirror was wielded */
        freeinv_bw(obj);
        mpickobj(mtmp, obj);
        if (!(await tele_restrict(mtmp)))
            await rloc(mtmp, RLOC_MSG);
    } else if (!is_unicorn(mtmp.data) && !humanoid(mtmp.data)
               && !is_demon(mtmp.data)
               && (!mtmp.minvis || perceives(mtmp.data)) && rn2(5)) {
        let do_react = true;

        if (mtmp.mfrozen) {
            if (vis)
                await You(`discern no obvious reaction from ${mon_nam_cam(mtmp)}.`);
            else
                await You_feel("a bit silly gesturing the mirror in that direction.");
            do_react = false;
        }
        if (do_react) {
            if (vis)
                await pline(`${Monnam(mtmp)} is frightened by its reflection.`);
            await monflee(mtmp, d_lp(2, 4), false, false);
        }
    } else if (!Blind()) {
        if (mtmp.minvis && !See_invisible())
            ;
        else if ((mtmp.minvis && !perceives(mtmp.data))
                 /* redundant: can't get here if these are true */
                 || !haseyes(mtmp.data) || g.notonhead || !mtmp.mcansee)
            await pline(`${Monnam(mtmp)} doesn't seem to notice ${mhis(mtmp)} reflection.`);
        else
            await pline(`${Monnam(mtmp)} ignores ${mhis(mtmp)} reflection.`);
    }
    return ECMD_TIME;
}

// C ref: apply.c touchstone_ok()
function touchstone_ok(obj) {
    if (!obj)
        return GETOBJ_EXCLUDE;

    /* Gold being suggested as a rub target is questionable - it fits the
     * real-world historic use of touchstones, but doesn't do anything
     * significant in the game. */
    if (obj.oclass === COIN_CLASS)
        return GETOBJ_SUGGEST;

    /* don't suggest identified gems */
    if (obj.oclass === O.GEM_CLASS
        && !(obj.dknown && objects[obj.otyp].oc_name_known))
        return GETOBJ_SUGGEST;

    return GETOBJ_DOWNPLAY;
}

/* C ref: decl.c c_obj_colors[] */
const c_obj_colors_st = [
    "black", "red", "green", "brown", "blue", "magenta", "cyan", "gray",
    "transparent", "orange", "bright green", "yellow", "bright blue",
    "bright magenta", "bright cyan", "white",
];

// C ref: apply.c use_stone() -- touchstones - by Ken Arnold
async function use_stone(tstone) {
    const scritch = "\"scritch, scritch\"";
    let obj;
    let do_scratch;
    let streak_color;
    let stonebuf;
    let oclass;

    /* in case it was acquired while blinded */
    if (!Blind())
        observe_object_st(tstone, Hallucination());
    const known = (tstone.otyp === TOUCHSTONE && tstone.dknown
                   && objects[TOUCHSTONE].oc_name_known);
    stonebuf = `rub on the stone${plur_st(tstone.quan)}`;
    /* when the touchstone is fully known, don't bother listing extra
       junk as likely candidates for rubbing */
    if ((obj = await getobj(stonebuf, known ? touchstone_ok : any_obj_ok_st,
                            GETOBJ_PROMPT_ST)) === null || obj === undefined)
        return ECMD_CANCEL;

    if (obj === tstone && obj.quan === 1) {
        await You_cant(`rub ${the_ap(xname_ap(obj))} on itself.`);
        return ECMD_OK;
    }

    if (tstone.otyp === TOUCHSTONE && tstone.cursed
        && obj.oclass === O.GEM_CLASS && !is_graystone(obj)
        && !obj_resists_st(obj, 80, 100)) {
        if (Blind())
            await You_feel_st("something shatter.");
        else if (Hallucination())
            await pline("Oh, wow, look at the pretty shards.");
        else
            await pline(`A sharp crack shatters ${
                (obj.quan > 1) ? "one of " : ""}${the_ap(xname_ap(obj))}.`);
        useup_st(obj);
        return ECMD_TIME;
    }

    if (Blind()) {
        await pline(scritch);
        return ECMD_TIME;
    } else if (Hallucination()) {
        await pline("Oh wow, man: Fractals!");
        return ECMD_TIME;
    }

    do_scratch = false;
    streak_color = null;

    oclass = obj.oclass;
    /* prevent non-gemstone rings from being treated like gems */
    if (oclass === O.RING_CLASS
        && objects[obj.otyp].oc_material !== O.GEMSTONE
        && objects[obj.otyp].oc_material !== O.MINERAL)
        oclass = O.RANDOM_CLASS; /* something that's neither gem nor ring */

    switch (oclass) {
    case O.GEM_CLASS: /* these have class-specific handling below */
    case O.RING_CLASS:
        if (tstone.otyp !== TOUCHSTONE) {
            do_scratch = true;
        } else if (obj.oclass === O.GEM_CLASS
                   && (tstone.blessed
                       || (!tstone.cursed && (Role_if_st(PM_ARCHEOLOGIST_WH)
                                              || Race_if_st(PM_GNOME_ST))))) {
            makeknown_st(TOUCHSTONE);
            makeknown_st(obj.otyp);
            await prinv_st(null, obj, 0);
            return ECMD_TIME;
        } else {
            /* either a ring or the touchstone was not effective */
            if (objects[obj.otyp].oc_material === O.GLASS) {
                do_scratch = true;
                break;
            }
        }
        streak_color = c_obj_colors_st[objects[obj.otyp].oc_color];
        break; /* gem or ring */

    default:
        switch (objects[obj.otyp].oc_material) {
        case O.CLOTH:
            await pline(`${Tobjnam_lp(tstone, "look")} a little more polished now.`);
            return ECMD_TIME;
        case O.LIQUID:
            if (!obj.known) /* note: not "whetstone" */
                await You("must think this is a wetstone, do you?");
            else
                await pline(`${Tobjnam_lp(tstone, "are")} a little wetter now.`);
            return ECMD_TIME;
        case O.WAX:
            streak_color = "waxy";
            break; /* okay even if not touchstone */
        case O.WOOD:
            streak_color = "wooden";
            break; /* okay even if not touchstone */
        case O.GOLD:
            do_scratch = true; /* scratching and streaks */
            streak_color = "golden";
            break;
        case O.SILVER:
            do_scratch = true; /* scratching and streaks */
            streak_color = "silvery";
            break;
        default:
            /* Objects passing the is_flimsy() test will not
               scratch a stone.  They will leave streaks on
               non-touchstones and touchstones alike. */
            if (O.is_flimsy(obj))
                streak_color = c_obj_colors_st[objects[obj.otyp].oc_color];
            else
                do_scratch = (tstone.otyp !== TOUCHSTONE);
            break;
        }
        break; /* default oclass */
    }

    stonebuf = `stone${plur_st(tstone.quan)}`;
    if (do_scratch)
        await You(`make ${streak_color ? streak_color : ""}${
            streak_color ? " " : ""}scratch marks on the ${stonebuf}.`);
    else if (streak_color)
        await You_see_st(`${streak_color} streaks on the ${stonebuf}.`);
    else
        await pline(scritch);
    return ECMD_TIME;
}

// C ref: apply.c use_towel()
async function use_towel(obj) {
    const u = game.u;
    const drying_feedback = (obj === game.uwep);
    const HBlinded = () => u.uprops[BLINDED_AP].intrinsic;
    const Glib = () => !!(u.uprops[GLIB_WH].intrinsic || u.uprops[GLIB_WH].extrinsic);

    if (!freehand()) {
        await You(`have no free ${body_part(HAND)}!`);
        return ECMD_OK;
    } else if (obj === game.ublindf) {
        await You("cannot use it while you're wearing it!");
        return ECMD_OK;
    } else if (obj.cursed) {
        let old;

        switch (rn2(3)) {
        case 2:
            old = (u.uprops[GLIB_WH].intrinsic & TIMEOUT_AP); /* (Glib & TIMEOUT) */
            make_glib_lp(old + rn1_ap(10, 3)); /* + 3..12 */
            await Your_lp(`${makeplural_ap(body_part(HAND))} ${
                old ? "are filthier than ever" : "get slimy"}!`);
            if (is_wet_towel(obj))
                await dry_a_towel(obj, -1, drying_feedback);
            return ECMD_TIME;
        case 1:
            if (!game.ublindf) {
                old = u.ucreamed || 0;
                u.ucreamed = old + rn1_ap(10, 3);
                await pline(`Yecch!  Your ${body_part(FACE_AP)} ${
                    old ? "has more" : "now has"} gunk on it!`);
                await make_blinded_ap((HBlinded() & TIMEOUT_AP) /* BlindedTimeout */
                                      + u.ucreamed - old, true);
            } else {
                const ublindf = game.ublindf;
                const what = (ublindf.otyp === O.LENSES)
                             ? "lenses"
                             : (obj.otyp === ublindf.otyp) ? "other towel"
                                                           : "blindfold";
                if (ublindf.cursed) {
                    await You(`push your ${what} ${rn2(2) ? "cock-eyed" : "crooked"}.`);
                } else {
                    const saved_ublindf = ublindf;
                    await You(`push your ${what} off.`);
                    await Blindf_off_dw(ublindf);
                    await dropx(saved_ublindf);
                }
            }
            if (is_wet_towel(obj))
                await dry_a_towel(obj, -1, drying_feedback);
            return ECMD_TIME;
        case 0:
            break;
        }
    }

    if (Glib()) {
        make_glib_lp(0);
        await You(`wipe off your ${!game.uarmg ? makeplural_ap(body_part(HAND))
                                                : gloves_simple_name(game.uarmg)}.`);
        if (is_wet_towel(obj))
            await dry_a_towel(obj, -1, drying_feedback);
        return ECMD_TIME;
    } else if (u.ucreamed) {
        incr_itimeout(BLINDED_AP, -1 * u.ucreamed); /* &HBlinded */
        u.ucreamed = 0;
        if (!HBlinded()) { /* !Blinded */
            await pline("You've got the glop off.");
            if (!(await gulp_blnd_check())) {
                set_itimeout(BLINDED_AP, 1); /* &HBlinded */
                await make_blinded_ap(0, true);
            }
        } else {
            await Your_lp(`${body_part(FACE_AP)} feels clean now.`);
        }
        if (is_wet_towel(obj))
            await dry_a_towel(obj, -1, drying_feedback);
        return ECMD_TIME;
    }

    await Your_lp(`${body_part(FACE_AP)} and ${makeplural_ap(body_part(HAND))} are already clean.`);

    return ECMD_OK;
}

// C ref: apply.c use_whip()
export async function use_whip(obj) {
    const g = game;
    const u = g.u;
    let mtmp;
    let otmp;
    let rx, ry, proficient, res = ECMD_OK;
    const msg_slipsfree = "The bullwhip slips free.";
    const msg_snap = "Snap!";
    const up = (p) => u.uprops[p] || { intrinsic: 0, extrinsic: 0, blocked: 0 };
    const Fumbling = !!(up(FUMBLING_WH).intrinsic || up(FUMBLING_WH).extrinsic);
    const Glib = !!(up(GLIB_WH).intrinsic || up(GLIB_WH).extrinsic);
    const Levitation = !!((up(LEVITATION_WH).intrinsic || up(LEVITATION_WH).extrinsic)
                          && !up(LEVITATION_WH).blocked);
    const Flying = !!((up(FLYING_WH).intrinsic || up(FLYING_WH).extrinsic)
                      && !up(FLYING_WH).blocked);

    if (obj !== g.uwep) {
        if (await wield_tool_ap(obj, "lash")) {
            /* cmdq_add_ec(CQ_CANNED, doapply);
               cmdq_add_key(CQ_CANNED, obj->invlet); */
            if (!g.cmdq) g.cmdq = [];
            g.cmdq.push({ typ: 'ec', fn: 'doapply' });
            g.cmdq.push({ typ: 'key', key: obj.invlet });
            return ECMD_TIME;
        }
        return ECMD_OK;
    }
    if (!(await getdir(null)))
        return (res | ECMD_CANCEL);

    if (u.uswallow) {
        mtmp = u.ustuck;
        rx = mtmp.mx;
        ry = mtmp.my;
    } else {
        confdir(false);
        rx = u.ux + u.dx;
        ry = u.uy + u.dy;
        if (!isok(rx, ry)) {
            await You("miss.");
            return res;
        }
        mtmp = m_at(rx, ry);
    }

    /* fake some proficiency checks */
    proficient = 0;
    if (g.urole.mnum === PM_ARCHEOLOGIST_WH) /* Role_if() */
        ++proficient;
    if (ACURR(A_DEX_WH) < 6)
        proficient--;
    else if (ACURR(A_DEX_WH) >= 14)
        proficient += (ACURR(A_DEX_WH) - 14);
    if (Fumbling)
        --proficient;
    if (proficient > 3)
        proficient = 3;
    if (proficient < 0)
        proficient = 0;

    const loc = g.level.at(rx, ry);
    if (u.uswallow) {
        await There("is not enough room to flick your bullwhip.");

    } else if (u.uinwater) { /* Underwater */
        await There("is too much resistance to flick your bullwhip.");

    } else if (u.dz < 0) {
        await You(`flick a bug off of the ${ceiling_wh(u.ux, u.uy)}.`);

    } else if (!u.dz && (IS_WATERWALL(loc.typ) || loc.typ === LAVAWALL)) {
        await You("cause a small splash.");
        if (loc.typ === LAVAWALL)
            await fire_damage(g.uwep, false, rx, ry);
        return ECMD_TIME;
    } else if ((!u.dx && !u.dy) || (u.dz > 0)) {
        let dam;

        /* Sometimes you hit your steed by mistake */
        if (u.usteed)
            throw new Error('use_whip(): whipping while riding not ported yet');
        if (is_pool_or_lava(u.ux, u.uy)
            || IS_WATERWALL(loc.typ) || loc.typ === LAVAWALL) {
            await You("cause a small splash.");
            if (is_lava_wh(u.ux, u.uy))
                await fire_damage(g.uwep, false, u.ux, u.uy);
            return ECMD_TIME;
        }
        if (Levitation || u.usteed || Flying) {
            /* Have a shot at snaring something on the floor.  A flyer
               can reach the floor so could just pick an item up, but
               allow snagging by whip too. */
            throw new Error('use_whip(): snaring an object from the air not ported yet');
        }
        dam = rnd(2) + dbon() + obj.spe;
        if (dam <= 0)
            dam = 1;
        await You(`hit your ${body_part(FOOT_WH)} with your bullwhip.`);
        const buf = `killed ${uhim()}self with ${uhis()} bullwhip`;
        await losehp(Maybe_Half_Phys(dam), buf, NO_KILLER_PREFIX_WH);
        return ECMD_TIME;

    } else if ((Fumbling || Glib) && !rn2(5)) {
        await pline_The(`bullwhip slips out of your ${body_part(HAND)}.`);
        await dropx(obj);

    } else if (u.utrap && u.utraptype === TT_PIT_WH) {
        throw new Error('use_whip(): whipping out of a pit not ported yet');
    } else if (mtmp) {
        /* whipattack: */
        throw new Error('use_whip(): whipping a monster not ported yet');
    } else if (Is_airlevel(u.uz) || Is_waterlevel(u.uz)) {
        /* it must be air -- water checked above */
        await You("snap your whip through thin air.");

    } else {
        await pline(msg_snap);
    }
    void msg_slipsfree;
    void otmp;
    return ECMD_TIME;
}

/* C ref: apply.c -- use_pole() messages */
const not_enough_room = "There's not enough room here to use that.",
    where_to_hit = "Where do you want to hit?",
    cant_see_spot = "won't hit anything if you can't see that spot.",
    cant_reach = "can't reach that spot from here.";

/* C ref: display.h glyph_is_*() for a glyph_at() glyph; glyph_to_obj()
   and glyph_to_cmap() -- an object glyph keeps its objects[] index in
   'otyp', a cmap glyph its defsyms[] index in 'cmapidx' */
function glyph_is_monster_pl(glyph) { return glyph.kind === 'mon'; }
function glyph_is_statue_pl(glyph) {
    return glyph.kind === 'obj' && glyph.otyp === O.STATUE;
}
function glyph_is_cmap_pl(glyph) {
    return glyph.kind === 'cmap' && glyph.cmapidx !== undefined
           && glyph.cmapidx !== null;
}
function glyph_to_obj_pl(glyph) {
    return (glyph.kind === 'obj' && glyph.otyp !== undefined
            && glyph.otyp !== null) ? glyph.otyp : -1; /* NUM_OBJECTS */
}
/* C ref: apply.c glyph_is_poleable() */
function glyph_is_poleable(G) {
    return glyph_is_monster_pl(G) || glyph_is_invisible_ls(G)
           || glyph_is_statue_pl(G);
}
/* C ref: context.h svc.context.polearm (zeroed with the context) */
function polearm_ctx() {
    if (!game.context.polearm)
        game.context.polearm = { hitmon: null };
    return game.context.polearm;
}

// C ref: apply.c find_poleable_mon()
/* find pos of monster in range, if only one monster */
function find_poleable_mon(pos) {
    const u = game.u;
    let mtmp;
    const mpos = { x: 0, y: 0 }; /* no candidate location yet */
    let x, y;
    let glyph;

    const impaired = (Confusion() || Stunned() || Hallucination());
    const rt = isqrt(game.polearm_range_max);
    const lo_x = Math.max(u.ux - rt, 1), hi_x = Math.min(u.ux + rt, COLNO - 1);
    const lo_y = Math.max(u.uy - rt, 0), hi_y = Math.min(u.uy + rt, ROWNO - 1);
    for (x = lo_x; x <= hi_x; ++x) {
        for (y = lo_y; y <= hi_y; ++y) {
            if (!get_valid_polearm_position(x, y))
                continue;
            glyph = glyph_at(x, y);
            if (!impaired
                && glyph_is_monster_pl(glyph)
                && (mtmp = m_at(x, y)) != null
                && (mtmp.mtame || (mtmp.mpeaceful && game.flags.confirm)))
                continue;
            if (glyph_is_poleable(glyph)
                && (!glyph_is_statue_pl(glyph) || impaired)) {
                if (mpos.x)
                    return false; /* more than one candidate location */
                mpos.x = x, mpos.y = y;
            }
        }
    }
    if (!mpos.x)
        return false; /* no candidate location */
    pos.x = mpos.x;
    pos.y = mpos.y;
    return true;
}

// C ref: apply.c get_valid_polearm_position()
function get_valid_polearm_position(x, y) {
    const glyph = glyph_at(x, y);

    return (isok(x, y) && distu(x, y) >= game.polearm_range_min
            && distu(x, y) <= game.polearm_range_max
            && (cansee(x, y) || (couldsee(x, y)
                                 && glyph_is_poleable(glyph))));
}

// C ref: apply.c display_polearm_positions()
async function display_polearm_positions(on_off) {
    let x, y, dx, dy;

    if (on_off) {
        /* on */
        await tmp_at(DISP_BEAM, 0); /* cmap_to_glyph(S_goodpos) */
        for (dx = -3; dx <= 3; dx++)
            for (dy = -3; dy <= 3; dy++) {
                x = dx + game.u.ux;
                y = dy + game.u.uy;
                if (get_valid_polearm_position(x, y)) {
                    await tmp_at(x, y);
                }
            }
    } else {
        /* off */
        await tmp_at(DISP_END, 0);
    }
}

// C ref: apply.c calc_pole_range()
/*
 * Calculate allowable range (pole's reach is always 2 steps):
 *  unskilled and basic: orthogonal direction, 4..4;
 *  skilled: as basic, plus knight's jump position, 4..5;
 *  expert: as skilled, plus diagonal, 4..8.
 *  (Note: no roles in NetHack can become expert or better
 *  for polearm skill; Yeoman in slash'em can become expert.)
 */
function calc_pole_range(range) {
    const typ = uwep_skill_type();

    range.min = 4;
    if (typ === P_NONE || P_SKILL(typ) <= P_BASIC)
        range.max = 4;
    else if (P_SKILL(typ) === P_SKILLED)
        range.max = 5;
    else
        range.max = 8; /* (P_SKILL(typ) >= P_EXPERT) */

    game.polearm_range_min = range.min;
    game.polearm_range_max = range.max;
}

// C ref: apply.c could_pole_mon()
/* return TRUE if hero is wielding a polearm and there's
   at least one monster they could hit with it */
export function could_pole_mon() {
    const range = { min: 0, max: 0 };
    const cc = { x: 0, y: 0 };
    const hitm = polearm_ctx().hitmon;

    if (!game.uwep || !is_pole(game.uwep))
        return false;

    calc_pole_range(range);

    cc.x = game.u.ux;
    cc.y = game.u.uy;
    if (!find_poleable_mon(cc)) {
        if (hitm && !DEADMONSTER(hitm) && sensemon(hitm)
            && mdistu(hitm) <= range.max && mdistu(hitm) >= range.min)
            return true;
    } else {
        return true;
    }
    return false;
}

// C ref: apply.c snickersnee_used_dist_attk()
/* was Snickersnee used to attack at distance this turn already? */
function snickersnee_used_dist_attk(obj) {
    if (obj && obj === game.uwep && u_wield_art(ART_SNICKERSNEE)
        && game.context.snickersnee_turn === game.moves)
        return true;
    return false;
}

// C ref: apply.c use_pole()
/* Distance attacks by pole-weapons */
export async function use_pole(obj, autohit) {
    const g = game;
    const u = g.u;
    const thump = (what) => `Thump!  Your blow bounces harmlessly off the ${what}.`;
    const res = ECMD_OK;
    const range = { min: 0, max: 0 };
    let glyph;
    const cc = { x: 0, y: 0 };
    let mtmp;
    const hitm = polearm_ctx().hitmon;
    let freehit = false;

    /* Are you allowed to use the pole? */
    if (u.uswallow) {
        await pline(not_enough_room);
        return ECMD_OK;
    }
    if (obj !== g.uwep) {
        if (await wield_tool_ap(obj, "swing")) {
            cmdq_add_ec("doapply"); /* cmdq_add_ec(CQ_CANNED, doapply) */
            cmdq_add_key(obj.invlet); /* cmdq_add_key(CQ_CANNED, obj->invlet) */
            return ECMD_TIME;
        }
        return ECMD_OK;
    }
    /* assert(obj == uwep); */

    calc_pole_range(range);
    const min_range = range.min, max_range = range.max;

    /* Prompt for a location */
    if (!autohit)
        await pline(where_to_hit);
    cc.x = u.ux;
    cc.y = u.uy;
    if (!find_poleable_mon(cc) && hitm
        && !DEADMONSTER(hitm) && sensemon(hitm)
        && mdistu(hitm) <= max_range && mdistu(hitm) >= min_range) {
        cc.x = hitm.mx;
        cc.y = hitm.my;
    }
    if (!autohit) {
        await getpos_sethilite(display_polearm_positions,
                               get_valid_polearm_position);
        if (await getpos(cc, true, "the spot to hit") < 0)
            /* ESC; uses turn iff polearm became wielded */
            return (res | ECMD_CANCEL);
    }

    glyph = glyph_at(cc.x, cc.y);
    if (distu(cc.x, cc.y) > max_range) {
        await pline("Too far!");
        return ECMD_FAIL;
    } else if (distu(cc.x, cc.y) < min_range) {
        if (autohit && u_at(cc.x, cc.y))
            await pline("Don't know what to hit.");
        else
            await pline("Too close!");
        return ECMD_FAIL;
    } else if (!cansee(cc.x, cc.y) && !glyph_is_poleable(glyph)) {
        await You(cant_see_spot);
        return ECMD_FAIL;
    } else if (!couldsee(cc.x, cc.y)) { /* Eyes of the Overworld */
        await You(cant_reach);
        return ECMD_FAIL;
    }

    polearm_ctx().hitmon = null;
    /* Attack the monster there */
    g.bhitpos = { x: cc.x, y: cc.y };
    if ((mtmp = m_at(g.bhitpos.x, g.bhitpos.y)) != null) {
        if (await attack_checks(mtmp, g.uwep)) /* can attack proceed? */
            /* no, abort the attack attempt; result depends on
               res: 1 => polearm became wielded, 0 => already wielded;
               svc.context.move: 1 => discovered hidden monster at target spot,
               0 => answered 'n' to "Really attack?" prompt */
            return res | (g.context.move ? ECMD_TIME : ECMD_OK);
        if (await overexertion())
            return ECMD_TIME; /* burn nutrition; maybe pass out */
        polearm_ctx().hitmon = mtmp;

        if (snickersnee_used_dist_attk(obj)) {
            await pline_The("blade doesn't reach there!");
            return ECMD_FAIL;
        }

        await check_caitiff(mtmp);
        g.notonhead = (g.bhitpos.x !== mtmp.mx || g.bhitpos.y !== mtmp.my);

        /* Snickersnee allows one free hit from a distance per turn */
        if (obj === g.uwep && u_wield_art(ART_SNICKERSNEE)) {
            freehit = (g.moves !== g.context.snickersnee_turn);
            g.context.snickersnee_turn = g.moves;
            if (freehit && !Deaf()) {
                /* Soundeffect(se_sword_blade_rings, 100): no sound */
                await pline("Shkinng!"); /* /sha-kin!/ */
            }
        }

        await thitmonst(mtmp, g.uwep);
    } else if (glyph_is_statue_pl(glyph) /* might be hallucinatory */
               && sobj_at(O.STATUE, g.bhitpos.x, g.bhitpos.y)) {
        const t = t_at(g.bhitpos.x, g.bhitpos.y);

        if (t && t.ttyp === STATUE_TRAP
            && await activate_statue_trap(t, t.tx, t.ty, false)) {
            ; /* feedback has been give by animate_statue() */
        } else {
            /* Since statues look like monsters now, we say something
               different from "you miss" or "there's nobody there".
               Note:  we only do this when a statue is displayed here,
               because the player is probably attempting to attack it;
               other statues obscured by anything are just ignored. */
            await pline(thump("statue"));
            await wake_nearto(g.bhitpos.x, g.bhitpos.y, 25);
        }
    } else {
        /* no monster here and no statue seen or remembered here */
        unmap_invisible(g.bhitpos.x, g.bhitpos.y);

        if (glyph_to_obj_pl(glyph) === BOULDER
            && sobj_at(BOULDER, g.bhitpos.x, g.bhitpos.y)) {
            await pline(thump("boulder"));
            await wake_nearto(g.bhitpos.x, g.bhitpos.y, 25);
        } else if (!accessible(g.bhitpos.x, g.bhitpos.y)
                   || IS_FURNITURE(g.level.at(g.bhitpos.x, g.bhitpos.y).typ)) {
            /* similar to 'F'orcefight with a melee weapon; we know that
               the spot can be seen or we wouldn't have gotten this far */
            const ltyp = g.level.at(g.bhitpos.x, g.bhitpos.y).typ;
            await You(`uselessly attack ${
                (ltyp === STONE || ltyp === SCORR)
                ? "stone"
                : glyph_is_cmap_pl(glyph)
                  ? the_ap(defsyms_explanation_ap[glyph.cmapidx])
                  : "an unknown obstacle"}.`);
        } else {
            await You("miss; there is no one there to hit.");
        }
    }
    u_wipe_engr(2); /* same as for melee or throwing */
    return freehit ? ECMD_OK : ECMD_TIME;
}

// C ref: invent.c consume_obj_charge()
export function consume_obj_charge(obj,
                            maybe_unpaid) { /* false if caller handles shop billing */
    if (maybe_unpaid)
        check_unpaid_cam(obj);
    obj.spe -= 1;
    /* if (obj->known) update_inventory(): no perm_invent */
}

// C ref: apply.c do_blinding_ray()
/* expensive camera and Eyes of the Overworld */
export async function do_blinding_ray(obj) {
    const u = game.u;
    const pobj = { obj };
    const mtmp = await bhit(u.dx, u.dy, COLNO, FLASHED_LIGHT, null, null, pobj);
    obj = pobj.obj;

    obj.ox = u.ux, obj.oy = u.uy; /* flash_hits_mon() wants this */
    if (mtmp) {
        await flash_hits_mon(mtmp, obj);
        if (obj.otyp === O.EXPENSIVE_CAMERA)
            await see_monster_closeup(mtmp, true); /* TRUE for photo */
    }
    /* normally bhit() would do this but for FLASHED_LIGHT we want it
       to be deferred until after flash_hits_mon() */
    await transient_light_cleanup();
}

// C ref: apply.c use_camera()
async function use_camera(obj) {
    const u = game.u;

    if (u.uinwater) { /* Underwater */
        await pline("Using your camera underwater would void the warranty.");
        return ECMD_OK;
    }
    if (!(await getdir(null)))
        return ECMD_CANCEL;

    if (obj.spe <= 0) {
        await pline(nothing_happens_ap);
        return ECMD_TIME;
    }
    consume_obj_charge(obj, true);

    if (obj.cursed && !rn2(2)) {
        await zapyourself_cam(obj, true);
    } else if (u.uswallow) {
        await You(`take a picture of ${s_suffix_cam(mon_nam_cam(u.ustuck))} ${
            mbodypart_cam(u.ustuck, STOMACH_CAM)}.`);
    } else if (u.dz) {
        await You(`take a picture of the ${
            (u.dz > 0) ? surface(u.ux, u.uy) : ceiling_wh(u.ux, u.uy)}.`);
    } else if (!u.dx && !u.dy) {
        /* TODO:  we ought to have a "selfie" joke here... */
        await zapyourself_cam(obj, true);
    } else {
        await do_blinding_ray(obj);
    }
    return ECMD_TIME;
}

// C ref: apply.c number_leashed()
export function number_leashed() {
    let i = 0;

    for (let obj = game.invent; obj; obj = obj.nobj)
        if (obj.otyp === O.LEASH && obj.leashmon)
            i++;
    return i;
}

// C ref: apply.c o_unleash()
/* otmp is about to be destroyed or stolen */
export function o_unleash(otmp) {
    let mtmp;

    for (mtmp = game.fmon; mtmp; mtmp = mtmp.nmon)
        if (mtmp.m_id === otmp.leashmon) {
            mtmp.mleashed = 0;
            break;
        }
    otmp.leashmon = 0;
    /* update_inventory(); -- no perm_invent window */
}

// C ref: apply.c m_unleash()
/* mtmp is about to die, or become untame;
   with 'feedback' the message is async: like exercise(), this then
   returns its promise, which the caller must await */
export function m_unleash(mtmp, feedback) {
    let otmp;
    let msg = null, msgmon = null;

    if (feedback) {
        if (canseemon(mtmp)) {
            msg = `${Monnam(mtmp)} pulls free of ${mhis(mtmp)} leash!`; /* pline_mon() */
            msgmon = mtmp;
        } else
            msg = "Your leash falls slack."; /* Your() */
    }
    if ((otmp = get_mleash(mtmp)) !== null) {
        otmp.leashmon = 0;
        /* update_inventory(); -- no perm_invent window */
    }
    mtmp.mleashed = 0;
    return msg ? (msgmon ? pline_mon(msgmon, msg) : pline(msg)) : undefined;
}

// C ref: apply.c unleash_all()
/* player is about to die (for bones) */
export function unleash_all() {
    let otmp;
    let mtmp;

    for (otmp = game.invent; otmp; otmp = otmp.nobj)
        if (otmp.otyp === O.LEASH)
            otmp.leashmon = 0;
    for (mtmp = game.fmon; mtmp; mtmp = mtmp.nmon)
        mtmp.mleashed = 0;
}

// C ref: apply.c leashable()
export function leashable(mtmp) {
    return (mtmp.data !== mons_ls[PM_LONG_WORM_LS] /* mtmp->mnum */
            && !unsolid(mtmp.data)
            && (!nolimbs(mtmp.data) || has_head(mtmp.data)));
}

// C ref: apply.c use_leash()
async function use_leash(obj) {
    const u = game.u;
    const cc = { x: 0, y: 0 };
    let mtmp;

    if (u.uswallow) {
        /* if the leash isn't in use, assume we're trying to leash
           the engulfer; if it is use, distinguish between removing
           it from the engulfer versus from some other creature
           (note: the two in-use cases can't actually occur; all
           leashes are released when the hero gets engulfed) */
        const what = noit_mon_nam_ls(u.ustuck);
        await You_cant(!obj.leashmon ? `leash ${what} from inside.`
                       : (obj.leashmon === u.ustuck.m_id)
                         ? `unleash ${what} from inside.`
                         : `unleash anything from inside ${what}.`);
        return ECMD_OK;
    }
    if (!obj.leashmon && number_leashed() >= 2 /* MAXLEASHED */) {
        await You("cannot leash any more pets.");
        return ECMD_OK;
    }

    if (!(await get_adjacent_loc_ls(null, null, u.ux, u.uy, cc)))
        return ECMD_OK;

    if (cc.x === u.ux && cc.y === u.uy) { /* u_at() */
        if (u.usteed && u.dz > 0) {
            mtmp = u.usteed;
            await use_leash_core(obj, mtmp, cc, 1);
            return ECMD_TIME;
        }
        await pline("Leash yourself?  Very funny...");
        return ECMD_OK;
    }

    /*
     * From here on out, return value is 1 == a move is used.
     */

    if (!(mtmp = m_at(cc.x, cc.y))) {
        await There("is no creature there.");
        unmap_invisible(cc.x, cc.y);
        return ECMD_TIME;
    }

    await use_leash_core(obj, mtmp, cc, canspotmon(mtmp));
    return ECMD_TIME;
}

// C ref: apply.c use_leash_core()
async function use_leash_core(obj, mtmp, cc, spotmon) {
    if (!spotmon
        && !glyph_is_invisible_ls(game.level.at(cc.x, cc.y).remembered_glyph)) {
        /* for the unleash case, we don't verify whether this unseen
           monster is the creature attached to the current leash */
        await You(`fail to ${obj.leashmon ? "un" : ""}leash something.`);
        /* trying again will work provided the monster is tame
           (and also that it doesn't change location by retry time) */
        map_invisible(cc.x, cc.y);
    } else if (!mtmp.mtame) {
        await pline(`${Monnam_ls(mtmp)} ${(!obj.leashmon) ? "cannot be" : "is not"} leashed!`);
    } else if (!obj.leashmon) {
        /* applying a leash which isn't currently in use */
        if (mtmp.mleashed) {
            await pline(`This ${spotmon ? l_monnam_ls(mtmp) : "creature"} is already leashed.`);
        } else if (unsolid(mtmp.data)) {
            await pline("The leash would just fall off.");
        } else if (nolimbs(mtmp.data) && !has_head(mtmp.data)) {
            await pline(`${Monnam_ls(mtmp)} has no extremities the leash would fit.`);
        } else if (!leashable(mtmp)) {
            let lmonnam = l_monnam_ls(mtmp);

            if (cc.x !== mtmp.mx || cc.y !== mtmp.my)
                lmonnam = `${s_suffix_cam(lmonnam)} tail`;
            await pline(`The leash won't fit onto ${spotmon ? "your " : ""}${lmonnam}.`);
        } else {
            await You(`slip the leash around ${spotmon ? "your " : ""}${
                l_monnam_ls(mtmp)}.`);
            mtmp.mleashed = 1;
            obj.leashmon = mtmp.m_id;
            mtmp.msleeping = 0;
            /* update_inventory(); -- no perm_invent window */
        }
    } else {
        /* applying a leash which is currently in use */
        if (obj.leashmon !== mtmp.m_id) {
            await pline("This leash is not attached to that creature.");
        } else if (obj.cursed) {
            await pline_The("leash would not come off!");
            obj.bknown = 1; /* set_bknown(obj, 1): update_inventory() is a no-op */
        } else {
            mtmp.mleashed = 0;
            obj.leashmon = 0;
            /* update_inventory(); -- no perm_invent window */
            await You(`remove the leash from ${spotmon ? "your " : ""}${
                l_monnam_ls(mtmp)}.`);
        }
    }
}

// C ref: apply.c get_mleash()
/* assuming mtmp->mleashed has been checked */
export function get_mleash(mtmp) {
    let otmp;

    for (otmp = game.invent; otmp; otmp = otmp.nobj)
        if (otmp.otyp === O.LEASH && otmp.leashmon === mtmp.m_id)
            break;
    return otmp || null;
}

// C ref: apply.c mleashed_next2u()
/* get_iter_mons() callback for next_to_u() */
export async function mleashed_next2u(mtmp) {
    if (mtmp.mleashed) {
        if (!m_next2u(mtmp))
            await mnexto(mtmp, RLOC_NOMSG);
        if (!m_next2u(mtmp)) {
            const otmp = get_mleash(mtmp);

            if (!otmp) {
                impossible("leashed-unleashed mon?");
                return true;
            }

            if (otmp.cursed)
                return true;
            mtmp.mleashed = 0;
            otmp.leashmon = 0;
            /* update_inventory(); -- no perm_invent window */
            await You_feel(`${(number_leashed() > 1) ? "a" : "the"} leash go slack.`);
        }
    }
    return false;
}

// C ref: apply.c check_leash()
export async function check_leash(x, y) {
    const u = game.u;
    let otmp;
    let mtmp;

    for (otmp = game.invent; otmp; otmp = otmp.nobj) {
        if (otmp.otyp !== O.LEASH || !otmp.leashmon)
            continue;
        mtmp = find_mid(otmp.leashmon, FM_FMON);
        if (!mtmp) {
            impossible("leash in use isn't attached to anything?");
            otmp.leashmon = 0;
            continue;
        }
        if (dist2(u.ux, u.uy, mtmp.mx, mtmp.my)
            > dist2(x, y, mtmp.mx, mtmp.my)) {
            if (!um_dist(mtmp.mx, mtmp.my, 3)) {
                ; /* still close enough */
            } else if (otmp.cursed && !breathless(mtmp.data)) {
                if (um_dist(mtmp.mx, mtmp.my, 5)
                    || (mtmp.mhp -= rnd(2)) <= 0) {
                    const save_pacifism = u.uconduct.killer;

                    await Your_lp(`leash chokes ${mon_nam_cam(mtmp)} to death!`);
                    /* hero might not have intended to kill pet, but
                       that's the result of his actions; gain experience,
                       lose pacifism, take alignment and luck hit, make
                       corpse less likely to remain tame after revival */
                    await xkilled(mtmp, XKILL_NOMSG);
                    /* life-saving doesn't ordinarily reset this */
                    if (!(mtmp.mhp < 1)) /* !DEADMONSTER(mtmp) */
                        u.uconduct.killer = save_pacifism;
                } else {
                    await pline_mon(mtmp, `${Monnam(mtmp)} is choked by the leash!`);
                    /* tameness eventually drops to 1 here (never 0) */
                    if (mtmp.mtame && rn2(mtmp.mtame))
                        mtmp.mtame--;
                }
            } else {
                if (um_dist(mtmp.mx, mtmp.my, 5)) {
                    await pline(`${s_suffix_cam(Monnam(mtmp))} leash snaps loose!`);
                    m_unleash(mtmp, false);
                } else {
                    await You("pull on the leash.");
                    if (mtmp.data.msound !== MS_SILENT_LS)
                        switch (rn2(3)) {
                        case 0:
                            await growl(mtmp);
                            break;
                        case 1:
                            await yelp(mtmp);
                            break;
                        default:
                            await whimper(mtmp);
                            break;
                        }
                }
            }
        }
    }
}

// C ref: apply.c flip_coin()
async function flip_coin(obj) {
    let otmp = obj;
    let lose_coin = false;

    await You(`flip ${an(singular(obj, xname))}.`);
    if (Underwater()) {
        await pline("It tumbles away.");
        lose_coin = true;
    } else if (Glib() || Fumbling()
               || (ACURR(A_DEX) < 10 && !rn2(ACURR(A_DEX)))) {
        await pline(`It slips between your ${fingers_or_gloves(false)}.`);
        lose_coin = true;
    }

    if (lose_coin) {
        if (otmp.quan > 1)
            otmp = splitobj(otmp, 1);
        await dropx(otmp);
        return ECMD_TIME;
    }
    if (Hallucination()) {
        await pline(rn2(100) ? "Wow, a double header!"
                        /* edge case */
                             : "The coin miraculously lands on its edge!");
    } else {
        await pline(`It comes up ${rn2(2) ? "heads" : "tails"}.`);
    }
    return ECMD_TIME;
}

// C ref: mkobj.c hornoplenty()
/* create an object from a horn of plenty; mirrors bagotricks(makemon.c) */
export async function hornoplenty(
    horn,
    tipping, /* caller emptying entire contents; affects shop mesgs */
    targetbox) /* if non-Null, container to tip into */
{
    const g = game;
    const u = g.u;
    let objcount = 0;

    if (!horn || horn.otyp !== O.HORN_OF_PLENTY) {
        /* impossible("bad horn o' plenty") */
        throw new Error('hornoplenty(): impossible() bad horn not ported yet');
    } else if (horn.spe < 1) {
        await pline(nothing_happens_ap); /* pline1(nothing_happens) */
        if (!horn.cknown) {
            horn.cknown = 1;
            /* update_inventory(): no perm_invent */
        }
    } else {
        let obj;
        let what;

        consume_obj_charge(horn, !tipping);
        if (!rn2(13)) {
            obj = mkobj_hp(POTION_CLASS, false);
            if (O.objects[obj.otyp].oc_magic) {
                do {
                    obj.otyp = rnd_class_hp(O.POT_BOOZE, O.POT_WATER);
                } while (obj.otyp === O.POT_SICKNESS);
                /* oil uses obj->age field differently from other potions */
                if (obj.otyp === POT_OIL)
                    fixup_oil_hp(obj, null);
            }
            what = (obj.quan > 1) ? "Some potions" : "A potion";
        } else {
            obj = mkobj_hp(FOOD_CLASS_HP, false);
            if (obj.otyp === O.FOOD_RATION && !rn2(7))
                obj.otyp = O.LUMP_OF_ROYAL_JELLY;
            what = "Some food";
        }
        ++objcount;
        await pline(`${what} ${vtense_hp(what, "spill")} out.`);
        obj.blessed = horn.blessed;
        obj.cursed = horn.cursed;
        obj.owt = weight_hp(obj);
        /* using a shop's horn of plenty entails a usage fee and also
           confers ownership of the created item to the shopkeeper */
        if (horn.unpaid)
            await addtobill_hp(obj, false, false, tipping);
        /* if it ended up on bill, we don't want "(unpaid, N zorkmids)"
           being included in its formatted name during next message */
        g.iflags.suppress_price = (g.iflags.suppress_price || 0) + 1;
        if (!tipping) {
            const typ = g.level.at(u.ux, u.uy).typ;
            obj = await hold_another_object(obj,
                                            u.uswallow
                                              ? "Oops!  %s out of your reach!"
                                              : (Is_airlevel(u.uz)
                                                 || Is_waterlevel(u.uz)
                                                 || typ < IRONBARS_HP
                                                 || typ >= ICE)
                                                ? "Oops!  %s away from you!"
                                                : "Oops!  %s to the floor!",
                                            The(aobjnam_hp(obj, "slip")), null);
            /* nhUse(obj) */
        } else if (targetbox) {
            add_to_container_hp(targetbox, obj);
            /* add to container doesn't update the weight */
            targetbox.owt = weight_hp(targetbox);
            /* item still in magic horn was weightless; when it's now in
               a carried container, hero's encumbrance could change */
            if (carried_hp(targetbox)) {
                await encumber_msg_hp();
                /* update_inventory(): no perm_invent */
            }
        } else {
            /* assumes this is taking place at hero's location */
            if (!can_reach_floor(true)) {
                await hitfloor_hp(obj, true); /* does altar check, message, drop */
            } else {
                if (IS_ALTAR_HP(g.level.at(u.ux, u.uy).typ))
                    await doaltarobj_hp(obj); /* does its own drop message */
                else
                    await pline(`${upstart(doname(obj)) /* Doname2() */} ${
                        otense(obj, "drop")} to the ${surface(u.ux, u.uy)}.`);
                await dropy_hp(obj);
            }
        }
        g.iflags.suppress_price--;
        if (horn.dknown)
            makeknown(O.HORN_OF_PLENTY);
    }
    return objcount;
}
