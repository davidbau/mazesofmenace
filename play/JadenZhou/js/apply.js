// apply.js -- applying tools.
// C ref: apply.c
//
// Ported so far: the #apply and #rub commands up to choosing the object
// (apply_ok(), rub_ok() and their getobj() calls); using the chosen
// object is not ported yet. The #jump command: dojump(), jump(),
// check_jump(), is_valid_jump_pos(), get_valid_jump_position().

import { game } from './gstate.js';
import { You, You_hear } from './display.js';
import { getobj } from './invent.js';
import { check_capacity } from './hack.js';
import { retouch_object } from './wield.js';
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
import { uhim, uhis } from './mhitu.js';
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
import { pline, You_cant, There } from './display.js';
import { near_capacity, nomul } from './hack.js';
import { teleds } from './teleport.js';
import { morehungry } from './eat.js';
import { rnd } from './rng.js';
import { TELEDS_NO_FLAGS } from './const.js';
import { getpos, getpos_sethilite } from './getpos.js';
import { walk_path, hurtle_jump } from './dothrow.js';
import { known_spell, spe_Fresh } from './spell.js';
import { dowrite } from './write.js';
import { cansee } from './vision.js';
import { closed_door, sobj_at } from './makemon.js';
import { t_at } from './trap.js';
import { dist2, distu, mdistu } from './hacklib.js';
import { ACURR } from './attrib.js';
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
import { arti_speak } from './artifact.js';
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
import { obj_typename as obj_typename_ap } from './objnam.js';
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
import { check_unpaid as check_unpaid_cam, zapyourself as zapyourself_cam } from './zap.js';
import { s_suffix as s_suffix_cam } from './hacklib.js';
import { mon_nam as mon_nam_cam } from './do_name.js';
import { mbodypart as mbodypart_cam } from './insight.js';
import { STOMACH as STOMACH_CAM } from './const.js';
import { noit_mon_nam as noit_mon_nam_ls, Monnam as Monnam_ls,
         l_monnam as l_monnam_ls } from './do_name.js';
import { get_adjacent_loc as get_adjacent_loc_ls } from './cmd.js';
import { use_pick_axe } from './dig.js';
import { glyph_is_invisible as glyph_is_invisible_ls } from './display.js';
import { mons as mons_ls, PM_LONG_WORM as PM_LONG_WORM_LS, M1_UNSOLID as M1_UNSOLID_LS,
         M1_NOLIMBS as M1_NOLIMBS_LS, M1_NOHEAD as M1_NOHEAD_LS } from './monsters.js';

// C ref: apply.c its_dead() -- the stethoscope applied to a corpse or
// statue at <rx,ry>; returns TRUE if it gave a message
async function its_dead(rx, ry, resp) {
    void resp;
    const corpse = sobj_at(O.CORPSE, rx, ry),
          statue = sobj_at(O.STATUE, rx, ry);

    if (!corpse && !statue) {
        ; /* nothing to do */
    } else {
        throw new Error('its_dead(): a corpse or statue under the stethoscope not ported yet');
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
                throw new Error('use_bell(): buried_ball_to_freedom() not ported yet');
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
        } else if (await its_dead(u.ux, u.uy, res)) {
            ; /* message already given */
        } else if (Is_stronghold(u.uz)) {
            await You_hear("the crackling of hellfire.");
        } else {
            await pline_The(`${surface(u.ux, u.uy)} seems healthy enough.`);
        }
        return res;
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
                    what = simple_typename_ap(otyp);
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

    if (!(await its_dead(rx, ry, res)))
        await You("hear nothing special."); /* not You_hear()  */
    return res;
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
/* C ref: objnam.c simple_typename() -- obj_typename() without the
   user-assigned name or the appended description */
function simple_typename_ap(otyp) {
    const save_uname = objects[otyp].oc_uname;
    objects[otyp].oc_uname = null; /* suppress any name given by user */
    let bufp = obj_typename_ap(otyp);
    objects[otyp].oc_uname = save_uname;
    const pp = bufp.indexOf(" (");
    if (pp >= 0)
        bufp = bufp.slice(0, pp); /* strip the appended description */
    return bufp;
}

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
            /* dig_check(BY_OBJECT, x, y), digactualhole(), fill_pit(),
               maybe_dunk_boulders() ... */
            throw new Error('do_break_wand(): breaking a wand of digging (dig_check()/digactualhole()) not ported yet');
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

    const obj = await getobj("use or apply", apply_ok, GETOBJ_NOFLAGS);
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
        throw new Error('doapply(): flip_coin() not ported yet');

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
        throw new Error('doapply(): use_mirror() not ported yet');
    case O.BELL:
    case O.BELL_OF_OPENING:
        await use_bell(obj);
        break;
    case O.CANDELABRUM_OF_INVOCATION:
        throw new Error('doapply(): use_candelabrum() not ported yet');
    case O.WAX_CANDLE:
    case O.TALLOW_CANDLE:
        throw new Error('doapply(): use_candle() not ported yet');
    case OIL_LAMP:
    case MAGIC_LAMP:
    case BRASS_LANTERN:
        await use_lamp(obj);
        break;
    case POT_OIL:
        throw new Error('doapply(): light_cocktail() not ported yet');
    case O.EXPENSIVE_CAMERA:
        res = await use_camera(obj);
        break;
    case O.TOWEL:
        throw new Error('doapply(): use_towel() not ported yet');
    case O.CRYSTAL_BALL:
        throw new Error('doapply(): use_crystal_ball() not ported yet');
    case O.MAGIC_MARKER:
        res = await dowrite(obj);
        break;
    case O.TIN_OPENER:
        throw new Error('doapply(): use_tin_opener() not ported yet');
    case O.FIGURINE:
        throw new Error('doapply(): use_figurine() not ported yet');
    case O.UNICORN_HORN:
        throw new Error('doapply(): use_unicorn_horn() not ported yet');
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
        throw new Error('doapply(): hornoplenty() not ported yet');
    case O.LAND_MINE:
    case O.BEARTRAP:
        throw new Error('doapply(): use_trap() not ported yet');
    case O.FLINT:
    case O.LUCKSTONE:
    case O.LOADSTONE:
    case TOUCHSTONE:
        throw new Error('doapply(): use_stone() not ported yet');
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
        tmp_at(DISP_BEAM, 0); /* cmap_to_glyph(S_goodpos) */
        for (dx = -4; dx <= 4; dx++)
            for (dy = -4; dy <= 4; dy++) {
                x = dx + game.u.ux;
                y = dy + game.u.uy;
                if (await get_valid_jump_position(x, y) && !u_at(x, y))
                    tmp_at(x, y);
            }
    } else {
        /* off */
        tmp_at(DISP_END, 0);
    }
}

// C ref: apply.c jump()
/* 0=Physical, otherwise skill level */
export async function jump(magic) {
    const u = game.u;
    const cc = { x: 0, y: 0 };
    const ydata = game.youmonst.data;

    /* attempt "jumping" spell if hero has no innate jumping ability */
    if (!magic && !Jumping() && known_spell(SPE_JUMPING) >= spe_Fresh)
        throw new Error('jump(): spelleffects(SPE_JUMPING) not ported yet');

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
        throw new Error('jump(): jumping while stuck not ported yet');
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
        throw new Error('jump(): steed in a trap not ported yet');
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
        throw new Error('jump(): jumping in place while riding not ported yet');
    } else {
        let wastrapped = false;

        if (u.utrap) {
            wastrapped = true;
            switch (u.utraptype) {
            case TT_PIT:
                await You("leap from the pit!");
                break;
            default:
                throw new Error(`jump(): jumping out of trap type ${u.utraptype} not ported yet`);
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
            if (t_at(cc.x, cc.y))
                throw new Error('jump(): jumping in place on a trap not ported yet');
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
            throw new Error('use_lamp(): lighting candles not ported yet');
        }
        begin_burn_lp(obj, false);
    }
}

// C ref: apply.c fig_transform()
/* figurine timeout callback */
export async function fig_transform(arg, timeout) {
    throw new Error('fig_transform() not ported yet');
}

// C ref: apply.c use_whip()
async function use_whip(obj) {
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
function display_polearm_positions(on_off) {
    let x, y, dx, dy;

    if (on_off) {
        /* on */
        tmp_at(DISP_BEAM, 0); /* cmap_to_glyph(S_goodpos) */
        for (dx = -3; dx <= 3; dx++)
            for (dy = -3; dy <= 3; dy++) {
                x = dx + game.u.ux;
                y = dy + game.u.uy;
                if (get_valid_polearm_position(x, y)) {
                    tmp_at(x, y);
                }
            }
    } else {
        /* off */
        tmp_at(DISP_END, 0);
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
        throw new Error('use_camera(): do_blinding_ray() not ported yet');
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

// C ref: apply.c leashable()
function leashable(mtmp) {
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
            /* mtmp->mleashed = 1; obj->leashmon = mtmp->m_id: leashed pets
               (check_leash(), next_to_u(), dog movement) aren't ported */
            throw new Error('use_leash_core(): leashing a pet not ported yet');
        }
    } else {
        /* applying a leash which is currently in use */
        throw new Error('use_leash_core(): removing a leash not ported yet');
    }
}
