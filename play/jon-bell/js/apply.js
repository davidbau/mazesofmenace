// apply.js — C ref: apply.c.
import { BOULDER } from './dig.js';
import { boulder_hits_pool } from './do.js';
import { game } from './gstate.js';
import { is_pool_or_lava } from './dbridge.js';
import { update_inventory } from './invent.js';
import { obj_extract_self } from './mkobj.js';
import { sobj_at } from './invent.js';
import { change_luck } from './attrib.js'; // relocate-fns
import { BUFSZ, ECMD_TIME, HALLUC, HALLUC_RES, M_AP_TYPMASK, NO_TRAP_FLAGS, PLNMSG_MON_TAKES_OFF_ITEM, RLOC_MSG, RLOC_NONE } from './const.js'; // relocate-fns
import { Deaf, canspotmon, newsym } from './display.js'; // relocate-fns
import { upstart } from './hacklib.js'; // relocate-fns
import { tele_to_rnd_pet } from './teleport.js'; // relocate-fns
import { noteleport_level } from './teleport.js'; // relocate-fns
import { y_monnam } from './do_name.js';
import { seemimic } from './mon.js'; // relocate-fns
import { wake_nearby, Soundeffect } from './mon.js'; // relocate-fns
import { can_blow } from './mondata.js'; // relocate-fns
import { discover_object } from './o_init.js'; // relocate-fns
import { pline } from './pline.js'; // relocate-fns
import { rn2 } from './rnd.js'; // relocate-fns
import { mnexto } from './mon.js'; // relocate-fns
import { fill_pit, mintrap } from './trap.js'; // relocate-fns
import { canseemon } from './display.js'; // relocate-fns
import { pline_mon } from './pline.js'; // relocate-fns
import { Monnam } from './do_name.js'; // relocate-fns
import { pronoun_gender } from './mondata.js'; // relocate-fns
import { _cnutritE } from './eat.js'; // relocate-fns
import { currentmbuf } from './do_name.js';
import './cmd.js'; // relocate-fns
import { dist2 } from './hacklib.js'; // relocate-fns
import { impossible as rloc_impossible } from './pline.js'; // relocate-fns
import { RLOC_NOMSG } from './teleport.js'; // relocate-fns
import { mon_has_amulet } from './wizard.js'; // relocate-fns
import { faithful_input_redraw, nh_timeout_wield_turn, seer_turn_check } from './allmain.js';
import { nomul, unmul } from './hack.js'; // relocate-fns
import { arti_speak, is_art } from './artifact.js'; // relocate-fns
import { acurr } from './attrib.js'; // relocate-fns
import { bot } from './botl.js'; // relocate-fns
import { ART_OGRESMASHER, ART_SNICKERSNEE, CRYSTAL_BALL_OTYP, FACE, GETOBJ_DOWNPLAY, GETOBJ_EXCLUDE_INACCESS, HEAD, HOMEMADE_TIN, LEFT_SIDE, MS_ANIMAL, MS_SILENT, OCLASS_COIN, OCLASS_FOOD, OCLASS_SPBOOK, OCLASS_TOOL, OCLASS_WAND, OCLASS_WEAPON, OTYP_TOWEL, RIGHT_SIDE, Race_if, Role_if, STETH_ECMD_CANCEL, STETH_ECMD_OK, STOMACH, SetVoice, Shk_Your, THIT_BANANA, THIT_CORPSE, Underwater, _AD_BLND, _AT_ENGL, _BOOTS_OTYP_MAX, _BOOTS_OTYP_MIN, _BOT_BAG_OF_TRICKS_OTYP, _BULLWHIP_OTYP, _Blind_cmd, _Breathless, _Flying, _GEM_CLASS, _GLOVES_OTYP_MAX, _GLOVES_OTYP_MIN, _HOP_HORN_OF_PLENTY, _IA_BEARTRAP_OTYP, _IA_BELL_OF_OPENING_OTYP, _IA_BELL_OTYP, _IA_FIGURINE_OTYP, _IA_LAND_MINE_OTYP, _IA_MIRROR_OTYP, _IA_TIN_OPENER_OTYP, _Is_candle, _LENSES_OTYP, _MAT_GEMSTONE, _MAT_GLASS, _MAT_LIQUID, _MAT_MINERAL, _MAT_WOOD, _MG_FOOD_CLASS, _OTYP_SLIME_MOLD, _RING_CLASS, _Role_if_PM_HEALER, _SUPPRESS_INVISIBLE, _SUPPRESS_IT, _TOUCHSTONE, _UP_STATUE_OTYP, _Underwater, _You_feel, _c_obj_colors, _cmd_Hallucination, _digests, _glyph_at, _glyph_cmap_sym, _grapple_range, _haseyes, _hero_Blind, _hero_Deaf, _hero_nohands, _hero_verysmall_or_nohands_nohands_only, _hero_youmonst, _hprop, _invlet_constant, _is_demon, _is_vampshifter, _is_whirly_ustuck, _kick_nolimbs, _levlAt, _mh_a_monnam, _nohands, _oc_skill, _plineVFmt, _prayer_uhim, _sprintf, _st_is_floater, _st_is_flyer, _st_slithy, _steth_cvt_sdoor_to_door, _steth_pmname, _steth_seemimic, _the_str, _um_beautiful, _um_mhis, _up_find_poleable_mon, _up_get_valid_polearm_position, _uprop_active, _weapon_prinv_line, _wep_worn_phrase, _wt_bimanual, _wt_cantwield, _wt_ready_weapon, _wt_sameObj, bigmonst_cmd, check_capacity_sync as check_capacity, cmdq_add_ec, cmdq_add_key, cmdq_clear, cmdq_peek, cmdq_pop, confdir, flooreffects_Maybe_Half_Phys, flooreffects_is_lava, flooreffects_passes_walls, flooreffects_throws_rocks, getObjFromGetobj, getdir, getobj_redo_menu, humanoid_cmd, impossible_cmd, is_flimsy, is_graystone, is_pole, is_wet_towel, key2txt, kick_steed_cmd, nh_delay_output, nothing_happens, paranoid_query, pline1, plur, pooleffects_Flying, pooleffects_Levitation, pooleffects_Wwalking, readchar, set_occupation, sortloot_invlet_chain, sr_touch_petrifies_ptr, thit_is_unicorn, tty_menu_pick_one_ext, type_is_pname, u_wield_art, verysmall_cmd, will_weld, yn_function } from './cmd.js';
import { invocation_pos, may_passwall, obj_to_any, pooleffects } from './hack.js';
import { check_unpaid } from './shk.js';
import { getpos, getpos_sethilite } from './getpos.js'; // relocate-fns
import { ACCESSIBLE, AIR, ALTAR, A_CON, A_DEX, A_STR, BLINDED, CLOUD, CMDQ_KEY, COLNO, CONFUSION, CORR, COST_DSTROY, COST_SPLAT, CQ_CANNED, CQ_REPEAT, DEAF, DIGCHECK_FAILED, DIGCHECK_FAIL_BOULDER, D_ISOPEN, ECMD_CANCEL, ECMD_FAIL, ECMD_OK, EXPL_FIERY, EXPL_FROSTY, EXPL_MAGICAL, FIG_TRANSFORM, FLYING, FOOT, FORCEBUNGLE, FORCETRAP, FOUNTAIN, GETOBJ_EXCLUDE, GETOBJ_NOFLAGS, GETOBJ_PROMPT, GETOBJ_SUGGEST, GLIB, GRAVE, G_GONE, HAND, HOLE, Has_contents, ICE, INTRINSIC, IS_AIR, IS_DOOR, IS_FURNITURE, IS_OBSTRUCTED, IS_STWALL, IS_TREE, IS_WALL, IS_WATERWALL, Is_airlevel, Is_stronghold, Is_waterlevel, JUMPING, KILLED_BY, LADDER, LAVAWALL, LEG, LEVITATION, MAXULEV, MCORPSENM, MELT_ICE_AWAY, MM_NOMSG, M_AP_FURNITURE, M_AP_MONSTER, M_AP_OBJECT, M_AP_TYPE, NON_PM, NO_KILLER_PREFIX, NO_MINVENT, N_DIRS, OBJ_INVENT, OBJ_MINVENT, PARANOID_BREAKWAND, PIT, POOL, PROT_FROM_SHAPE_CHANGERS, P_BASIC, P_NONE, P_SKILLED, P_TWO_WEAPON_COMBAT as P_TWO_WEAPON_COMBAT_POLE, REVIVE_MON, RIGHT_HANDED, ROOM, SCORR, SDOOR, SHOPBASE, SICK, SICK_ALL, SICK_NONVOMITABLE, SINK, SLIMED, STAIRS, STATUE_TRAP, STONE, STONED, STRANGLED, STUNNED, TELEDS_ALLOW_DRAG, TELEDS_NO_FLAGS, THRONE, TIMEOUT, TOOKPLUNGE, TT_BEARTRAP, TT_BURIEDBALL, TT_INFLOOR, TT_LAVA, TT_PIT, TT_WEB, UNENCUMBERED, Upolyd, VOMITING, WEAK, WOUNDED_LEGS, W_ACCESSORY, W_ARMOR, W_WEP as W_WEP_TO, _IA_EXPENSIVE_CAMERA_OTYP, isok, nothing_seems_to_happen, u_at, xdir, ydir } from './const.js'; // relocate-fns
import * as _PROPIDS from './const.js'; // relocate-fns
import { is_lava, is_pool } from './dbridge.js'; // relocate-fns
import { DEFSYM_EXPLANATION } from './defsym_data.js'; // relocate-fns
import { findit, openit, use_crystal_ball } from './detect.js'; // relocate-fns
import { buried_ball_to_freedom, dig_check_, dig_dirsyms, digactualhole_, fillholetyp_, is_pick, liquid_flow_, use_pick_axe, watch_dig } from './dig.js'; // relocate-fns
import { DISP_BEAM, DISP_END, GLYPHCLS_INVIS, GLYPHCLS_MON, GLYPHCLS_OBJ, TOPL_LIMIT, _topl_joins_snapshot, _topl_more_pages, _topl_stash_result, await_topl_more_dismiss, feel_newsym, flush_screen, force_more, getobj_never_mind, glyph_is_invisible_at, map_invisible, map_object, pline_flush_point, putmsghistory, retouch_object_hero, sensemon, time_botl_moves_incremented, tmp_at, topl_park_cursor, under_ground, under_water, unmap_invisible, unmap_object, use_last_flush_snapshot } from './display.js'; // relocate-fns
import { dropx, legs_in_no_shape, obj_no_longer_held, set_wounded_legs } from './do.js'; // relocate-fns
import { Amonnam, YMonnam, l_monnam as _l_monnam, hliquid, mon_nam_too, noit_mon_nam, pmname, x_monnam } from './do_name.js'; // relocate-fns
import { Blindf_off, Blindf_on, bimanual, cursed_dw, find_ac, fingers_or_gloves, inaccessible_equipment, xname } from './do_wear.js'; // relocate-fns
import { make_familiar } from './dog.js'; // relocate-fns
import { paralyze_monst } from './mhitm.js'; // relocate-fns
import { hurtle, hurtle_jump, thitmonst, walk_path } from './dothrow.js'; // relocate-fns
import { Can_dig_down, ceiling, surface } from './dungeon.js'; // relocate-fns
import { tin_ok as eat_tin_ok, morehungry, vomit as potion_vomit, set_tin_variety, use_tin_opener } from './eat.js'; // relocate-fns
import { can_reach_floor, cant_reach_floor, freehand, wipe_engr_at } from './engrave.js'; // relocate-fns
import { explode } from './explode.js'; // relocate-fns
import { fastforward_step, ff_movemon_phase } from './fastforward.js'; // relocate-fns
import { mons_cnutrit } from './food_props.js'; // relocate-fns
import { losehp, near_capacity, overexertion, in_rooms as shk_in_rooms, spoteffects } from './hack.js'; // relocate-fns
import { s_suffix } from './hacklib.js'; // relocate-fns
import { nhgetch } from './input.js'; // relocate-fns
import { mstatusline, ustatusline } from './insight.js'; // relocate-fns
import { addinv, addinv_nomerge, carrying, compactify, consume_obj_charge, delobj, delobj_core, feel_cockatrice, freeinv, hold_another_object, mime_action, nxtobj, prinv, reassign, stackobj, useup, useupall, useupf, will_feel_cockatrice } from './invent.js'; // relocate-fns
import { transient_light_cleanup as _transient_light_cleanup, obj_merge_light_sources, show_transient_light } from './light.js'; // relocate-fns
import { pick_lock } from './lock.js'; // relocate-fns
import { humanoid as _th_humanoid, bagotricks, makeknown, makemon, mhe, mkclass, permonstTemplate, splitobj } from './makemon.js';
import { attacktype_fordmg } from './mondata.js'; // relocate-fns
import { emitMapstate } from './mapstate.js'; // relocate-fns
import { hcolor, helpless, obj_pmname } from './mhitm.js'; // relocate-fns
import { gulp_blnd_check, mhis_mon } from './mhitu.js'; // relocate-fns
import { in_rooms } from './mklev.js';
import { revive_corpse } from './do.js'; // relocate-fns
import { obj_extract_self as _objExtractSelf_useupf, bill_dummy_object, costly_alteration, get_mtraits, hornoplenty, mksobj, place_object, set_bknown, unbless, unsplitobj } from './mkobj.js'; // relocate-fns
import { MKOBJ_OC_COLOR } from './mkobj_data.js'; // relocate-fns
import { MKOBJ_OC_MAGIC, MKOBJ_OC_MATERIAL, MKOBJ_OC_SKILL } from './mkobj_erosion_meta.js'; // relocate-fns
import { mkundead } from './mkroom.js'; // relocate-fns
import { killed, see_monster_closeup, set_ustuck, wake_nearto, wakeup } from './mon.js'; // relocate-fns
import { can_blow as can_blow_real, poly_when_stoned } from './mondata.js'; // relocate-fns
import { accessible, closed_door, monflee } from './monmove.js'; // relocate-fns
import { observe_object } from './o_init.js'; // relocate-fns
import { The, Tobjnam, Yname2, Yobjnam2, xname as _fw_xname, cxname as _ia_cxname, simpleonames as _ia_simpleonames, Tobjnam as _objnam_Tobjnam, the as _the_objnam, an, ansimpleoname, aobjnam, cxname, doname, getObjDescr, gloves_simple_name, makeplural, makeplural as makeplural_objnam, otense, simple_typename, singular, the, thesimpleoname, vtense, yname } from './objnam.js'; // relocate-fns
import { OC_COST } from './oc_cost_data.js'; // relocate-fns
import { pickup_object } from './pickup.js'; // relocate-fns
import { There as There_real, You, You_cant, You_hear, You_see, Your, pline_The, impossible as real_impossible, set_msg_xy, verbalize } from './pline.js'; // relocate-fns
import { PM_ARCHEOLOGIST, PM_DEATH, PM_FAMINE, PM_FLOATING_EYE, PM_GNOME, PM_LONG_WORM, PM_MEDUSA, PM_MOUNTAIN_NYMPH, PM_PESTILENCE, PM_STONE_GOLEM, PM_WATER_NYMPH, PM_WOOD_NYMPH } from './pm.generated.js'; // relocate-fns
import { body_part, mbodypart, polymon } from './polyself.js'; // relocate-fns
import { POT_OIL, djinni_from_bottle, make_confused, make_deaf, make_glib, make_hallucinated, make_sick, make_stunned, make_vomiting } from './potion.js'; // relocate-fns
import { litroom, set_cursor, unpunish as unpunish_invent } from './read.js'; // relocate-fns
import { shuffle_int_array } from './rnd.js'; // relocate-fns
import { rn1 } from './rng.js';
import { d, rnd, rnl } from './rnd.js'; // relocate-fns
import { check_unpaid_usage, costly_spot, growl, obfree, pay_for_damage, add_damage as shk_add_damage, costly_spot as shk_costly_spot, find_objowner as shk_find_objowner, shk_your as shk_shk_your, shop_keeper } from './shk.js';
import { safe_qbuf, safe_qbuf as safe_qbuf_invent } from './objnam.js'; // relocate-fns
import { P_SKILL } from './skills.js'; // relocate-fns
import { whimper, yelp as yelp_real } from './sounds.js'; // relocate-fns
import { known_spell, spelleffects } from './spell.js'; // relocate-fns
import { On_stairs, stairway_at } from './stairs.js'; // relocate-fns
import { mpickobj } from './steal.js'; // relocate-fns
import { stucksteed, use_saddle } from './steed.js'; // relocate-fns
import { enexto_out, rloc, rloc_to, tele_restrict, teleds } from './teleport.js'; // relocate-fns
import { attach_egg_hatch_timeout, begin_burn, end_burn, kill_egg, obj_has_timer, spot_stop_timers, stop_timer } from './timeout.js'; // relocate-fns
import { settrack } from './track.js'; // relocate-fns
import { activate_statue_trap, deltrap, dotrap, feeltrap, fire_damage, instapetrify, maketrap, reset_utrap, sink_into_lava, t_at, trapname } from './trap.js'; // relocate-fns
import { DEADMONSTER, XKILL_NOMSG, attack_checks, check_caitiff, flash_hits_mon, force_attack, m_at, mon_nam, stumble_onto_mimic } from './uhitm.js';
import { xkilled } from './mon.js';
import { dbon, setmnotwielded, uwep_skill_type, weapon_type } from './weapon.js'; // relocate-fns
import { vault_summon_gd } from './vault.js'; // relocate-fns
import { cansee, couldsee, howmonseen, recalc_block_point, unblock_point } from './vision.js'; // relocate-fns
import { dry_a_towel, possibly_unwield } from './weapon.js'; // relocate-fns
import { encumber_msg_sync, weight } from './weight.js'; // relocate-fns
import { mwelded, setuqwep, setuswapwep, setuwep, welded, wield_tool } from './wield.js'; // relocate-fns
import { mon_adjust_speed, setnotworn } from './worn.js'; // relocate-fns
import { dowrite } from './write.js'; // relocate-fns
import { BlindedTimeout, HBlinded, _bhitm_wand_epilogue, _mon_reflects_zap as _um_mon_reflects, bhitm, bhito, bhitpile, get_obj_location, incr_HBlinded, make_blinded, obj_resists, release_hold, set_HBlinded, zappable, zapsetup, zapwrapup, zapyourself } from './zap.js'; // relocate-fns

// C ref: apply.c:3895-3905 maybe_dunk_boulders(x,y) — while x,y has lava or
// water, dunk any boulder sitting there into it.  RNG-free (obj_extract_self
// and boulder_hits_pool draw nothing of their own for the plain-splash case).
// Defined in apply.c, not dig.c, but exported from here: it is the last of
// the do_break_wand WAN_DIGGING arm's (apply.c:4034-4056, js/cmd.js) callees
// this file was missing, alongside dig_check_/fillholetyp_/liquid_flow_/
// digactualhole_ above (fill_pit and recalc_block_point, the arm's other two
// callees, already have js/ homes: js/trap.js and js/vision.js respectively).
// Exporting adds no new caller in THIS file, so this file's own behaviour and
export async function maybe_dunk_boulders(x, y) {
    let otmp;
    while (is_pool_or_lava(x, y) && (otmp = sobj_at(BOULDER, x, y))) {
        obj_extract_self(otmp);
        await boulder_hits_pool(otmp, x, y, false);
    }
}

/* C apply.c:711-724 — an about-to-be-destroyed leash releases its monster. */
export function o_unleash(otmp) {
    if (!otmp) return;
    const leashmon = otmp.leashmon | 0;
    if (leashmon) {
        for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
            if ((mtmp.m_id | 0) === leashmon) {
                mtmp.mleashed = 0;
                break;
            }
        }
    }
    otmp.leashmon = 0;
    update_inventory();
}

/* flag.h's terminal last_msg enumerator, after PLNMSG_MON_TAKES_OFF_ITEM. */
const PLNMSG_enum = PLNMSG_MON_TAKES_OFF_ITEM + 1;

const TRAP_KILLED_MON = 2; /* trap.h Trap_Killed_Mon */

function how_many(n) {
    return n < 2 ? 'sqrt(-1)' : n === 2 ? 'two' : n === 3 ? 'three'
        : n === 4 ? 'four' : n <= 7 ? 'several' : 'many';
}

/* C apply.c:518-687. */
export async function magic_whistled(obj) {
    if ((game.level?.flags?.stasis_until | 0) >= (game.moves | 0)) return;

    const already_discovered = !!game._oc_name_known?.[obj?.otyp | 0];
    let shift = 0, appear = 0, disappear = 0, trapped = 0;
    let shift_name = '', appear_name = '', disappear_name = '';

    for (let mon = game.fmon, next; mon; mon = next) {
        next = mon.nmon; /* mintrap can kill it */
        if ((mon.mhp | 0) <= 0 || !mon.mtame || mon === game.u?.usteed)
            continue;
        if (mon.mtrapped) {
            mon.mtrapped = 0;
            await fill_pit(mon.mx | 0, mon.my | 0);
        }
        const old_seen = canspotmon(mon);
        if (old_seen) y_monnam(mon);
        const old_name = old_seen ? currentmbuf() : null; // C apply.c:555 retains mnam.
        const old_x = mon.mx | 0, old_y = mon.my | 0;
        if ((mon.m_ap_type | 0) & M_AP_TYPMASK) seemimic(mon);
        await mnexto(mon, already_discovered ? RLOC_NONE : RLOC_MSG);
        if ((mon.mx | 0) === old_x && (mon.my | 0) === old_y) continue;
        if (mon.mundetected) {
            mon.mundetected = 0;
            newsym(mon.mx | 0, mon.my | 0);
        }
        (game.iflags ||= {}).last_msg = PLNMSG_enum;
        if (await mintrap(mon, NO_TRAP_FLAGS) === TRAP_KILLED_MON)
            change_luck(-1);
        if (game.iflags.last_msg !== PLNMSG_enum) {
            ++trapped;
            continue;
        }
        const new_seen = (mon.mhp | 0) > 0 && canspotmon(mon);
        if (new_seen) {
            const name = y_monnam(mon);
            if (old_seen) {
                if (++shift === 1) shift_name = `${name} shifts location`;
            } else if (++appear === 1) {
                appear_name = `${name} appears`;
            }
        } else if (old_seen && ++disappear === 1) {
            disappear_name = `${old_name.text} disappears`;
        }
    }

    if (!already_discovered) {
        if (shift + appear + trapped > 0)
            discover_object(obj.otyp | 0, true, true, true);
        return;
    }

    let text = '';
    if (shift)
        text = upstart(shift > 1 ? `${how_many(shift)} creatures shift locations`
            : shift_name).split(/[\0\n]/, 1)[0];
    if (appear) {
        const part = appear > 1
            ? `${how_many(appear)} ${shift === 0 ? 'creatures'
                : shift === 1 ? 'other creatures' : 'others'} appear`
            : appear_name;
        text = shift ? `${text}${disappear ? ',' : ' and'} ${part}`
            : upstart(part).split(/[\0\n]/, 1)[0];
    }
    if (disappear) {
        const part = disappear > 1
            ? `${how_many(disappear)} ${!shift && !appear ? 'creatures'
                : shift < 2 && appear < 2 ? 'other creatures' : 'others'} disappear`
            : disappear_name;
        text = shift || appear ? `${text}${shift && appear ? ',' : ''} and ${part}`
            : upstart(part).split(/[\0\n]/, 1)[0];
    }
    // C copynchars() stops at newline; Snprintf() appends within buf[BUFSZ].
    text = text.slice(0, BUFSZ - 1);
    if (text)
        await pline(`${text}.`);
}

const se_shrill_whistle = 151; /* seffects.h:165 (sndprocs.h se_zero_invalid = 0) */

/* C apply.c:495-514. */
export async function use_magic_whistle(obj) {
    if (!can_blow(game.youmonst)) {
        await pline('You are incapable of using the whistle.');
    } else if (obj?.cursed && rn2(2) === 0) {
        await pline(`You produce a ${game.u?.uinwater ? 'very ' : ''}high-${Deaf() ? 'frequency vibration' : 'pitched humming noise'}.`);
        await wake_nearby(true);
        if (rn2(2) === 0 && !noteleport_level(game.youmonst))
            await tele_to_rnd_pet();
    } else {
        const u = game.u || {};
        const hallu = !!(u.uprops?.[HALLUC]?.intrinsic | 0)
            && !((u.uprops?.[HALLUC_RES]?.intrinsic | 0)
                 || (u.uprops?.[HALLUC_RES]?.extrinsic | 0));
        const pitch = hallu ? 'normal'
            : u.uinwater && !Deaf() ? 'strange, high-pitched' : 'strange';
        await pline(Deaf() ? `You produce a ${pitch}, sharp vibration.`
            : `You produce a ${pitch} whistling sound.`);
        Soundeffect(se_shrill_whistle, 80);
        await magic_whistled(obj);
    }
    return ECMD_TIME;
}

export const LEASH = 236; /* objects.h */
/* C apply.c:691-699 — return the hero's leash attached to mtmp. */
export function get_mleash(mtmp) {
    if (!mtmp)
        return null;
    const mid = mtmp.m_id | 0;
    for (let otmp = game.invent; otmp; otmp = otmp.nobj) {
        if ((otmp.otyp | 0) === LEASH && (otmp.leashmon | 0) === mid)
            return otmp;
    }
    return null;
}
/* C apply.c:726-743 — release one monster from its inventory leash.  The
 * leash object stores the monster id; clear that link and the monster flag.
 * Return the feedback's paging promise for callers which can await it. */
export function m_unleash(mtmp, feedback) {
    if (!mtmp)
        return;
    const res = !feedback ? undefined : canseemon(mtmp)
        ? pline_mon(mtmp, '%s pulls free of %s leash!', Monnam(mtmp),
                    ['his', 'her', 'its', 'their'][pronoun_gender(mtmp, 2)])
        : pline('Your leash falls slack.');
    const otmp = get_mleash(mtmp);
    if (otmp) {
        otmp.leashmon = 0;
        update_inventory();
    }
    mtmp.mleashed = 0;
    return res;
}

export function tinnable(corpse) {
    if (corpse.oeaten | 0)
        return false;
    if (!_cnutritE(corpse.corpsenm | 0))
        return false;
    return true;
}

/* C apply.c:746-756: release both ends before dropping the hero's inventory. */
export function unleash_all() {
    for (let obj = game.invent; obj; obj = obj.nobj)
        if (obj.otyp === LEASH) obj.leashmon = 0;
    for (let mon = game.fmon; mon; mon = mon.nmon)
        mon.mleashed = 0;
}

/* C ref: apply.c:888-916 mleashed_next2u + next_to_u — a leashed monster that
 * is not adjacent is pulled next to the hero via mnexto() (enexto's
 * collect_coords shuffle: RNG); if it is STILL not adjacent a cursed leash
 * holds (returns TRUE, i.e. next_to_u() FALSE), otherwise the leash goes
 * slack.  Returns FALSE if any leashed monster is stuck far away, or if the
 * steed carries the Amulet. */
export async function next_to_u() {
    for (let mtmp = game.fmon, next; mtmp; mtmp = next) {
        next = mtmp.nmon; /* C mon.c:4550: mnexto can migrate this monster. */
        if (mtmp.mhp <= 0 || (mtmp.mstate | 0))
            continue;
        if (!mtmp.mleashed)
            continue;
        const u = game.u;
        const next2u = () => dist2(mtmp.mx | 0, mtmp.my | 0, u.ux | 0, u.uy | 0) <= 2;
        if (!next2u())
            await mnexto(mtmp, RLOC_NOMSG);
        if (!next2u()) {
            let otmp = game.invent;
            while (otmp && !((otmp.otyp | 0) === LEASH && (otmp.leashmon | 0) === (mtmp.m_id | 0)))
                otmp = otmp.nobj;
            if (!otmp) {
                await rloc_impossible('leashed-unleashed mon?');
                return false;
            }
            if (otmp.cursed)
                return false;
            mtmp.mleashed = 0;
            otmp.leashmon = 0;
            update_inventory();
            await pline(`You feel ${(number_leashed() > 1) ? 'a' : 'the'} leash go slack.`);
        }
    }
    /* C 924-926: no pack mules for the Amulet */
    if (game.u.usteed && mon_has_amulet(game.u.usteed))
        return false;
    return true;
}

// C ref: apply.c doapply() — "a" command, apply/use a tool.
// When no tools in inventory, plines "You don't have anything to use or apply."
// C ref: apply.c:152 — getobj("use or apply", applies) → if no applicable items:
//   pline("You don't have anything to use or apply.")
const LOCK_PICK_OTYP = 222;

/* objects.h SKELETON_KEY / CREDIT_CARD — the other two labels on apply.c's
 * LOCK_PICK case (apply.c:4286-4288).  js/lock.js already spells both
 * (lock.js:821-822); named here because doapply's routing test is in this file. */
const _AP_SKELETON_KEY_OTYP = 221, _AP_CREDIT_CARD_OTYP = 223;

/* objects.h TINNING_KIT / TOUCHSTONE / LUCKSTONE / LOADSTONE (JS otyp space). */
const _AP_TINNING_KIT_OTYP = 238;

/* objects.h CORPSE — the same literal js/objnam.js and cmd.js:13326 use. */
const _AP_CORPSE_OTYP = 265;

const _AP_LUCKSTONE_OTYP = 470, _AP_LOADSTONE_OTYP = 471, _AP_TOUCHSTONE_OTYP = 472;

/* C skill enum (skills.h): P_AXE=3, P_PICK_AXE=4, P_POLEARMS=16, P_LANCE=19. */
const _P_AXE = 3, _P_PICK_AXE = 4, _P_POLEARMS = 16, _P_LANCE = 19;

function _apply_weapon_suggested(obj) {
    const t = obj.otyp | 0;
    const sk = MKOBJ_OC_SKILL[t] | 0;
    return sk === _P_PICK_AXE /* is_pick */
        || sk === _P_AXE       /* is_axe */
        || sk === _P_POLEARMS || sk === _P_LANCE /* is_pole */
        || (obj.oartifact | 0) === 19 /* is_art(ART_SNICKERSNEE), obj.h:231 */
        || t === _BULLWHIP_OTYP; /* BULLWHIP */
}

async function _prinv_line(obj, status) {
    if (!obj) return '';
    /* C ref: invent.c prinv() -> xprname() -> doname(): the enchantment shows
     * only under `known` (objnam.c:1421-1424), so a wished-but-unIDed pick-axe
     * reads "a pick-axe", not "a +0 pick-axe".  Share the real formatter. */
    return await _weapon_prinv_line(obj, `(${status})`) + '.';
}

const STETH_ECMD_TIME = 0x01;

/* C ref: apply.c:476 use_whistle(struct obj *obj) — the tin whistle
 * "apply" path.
 */
async function use_whistle(obj) {
    const g = game;
    const u = g.u = g.u || {};
    g.context = g.context || {};

    if (!can_blow_real(g.youmonst)) {
        await pline("You are incapable of using the whistle.");
    } else if (u.uinwater) {
        await pline("You blow bubbles through " + yname(obj) + ".");
    } else {
        if (_hero_Deaf())
            await pline("You feel rushing air tickle your " + body_part(NOSE) + ".");
        else
            await pline("You produce a " + (obj.cursed ? "shrill" : "high") + " whistling sound.");
        Soundeffect(se_shrill_whistle_cmd, 50);
        wake_nearby(true);
        if (obj.cursed)
            vault_summon_gd();
    }
}

/* C ref: apply.c:3617-3686 use_royal_jelly(struct obj **optr) */
const _APPLY_CREAM_PIE_OTYP = 287;

async function use_cream_pie(obj) {
    const g = game;
    const u = g.u = g.u || {};
    const wasblind = _uprop_active('BLINDED');
    const wascreamed = (u.ucreamed | 0);

    let several = false;
    if ((obj.quan | 0) > 1) {
        several = true;
        obj = await splitobj(obj, 1);
    }
    if (_cmd_Hallucination())
        await pline("You give yourself a facial.");
    else
        await pline(`You immerse your ${body_part(FACE)} in ${several ? 'one of ' : ''}${several ? makeplural_objnam(_the_objnam(_fw_xname(obj))) : _the_objnam(_fw_xname(obj))}.`);

    /* C apply.c:3584 — can_blnd(NULL, &youmonst, AT_WEAP, obj).  For a CREAM_PIE
     * the haseyes guard at mondata.c:316 precedes the AT_WEAP arm;
     * against the hero, mondata.c:345 returns TRUE unless the hero is
     * Blindfolded; nothing else on the AT_WEAP arm applies with magr == NULL. */
    if (_use_cream_pie_can_blnd(obj)) {
        const blindinc = rnd(25);
        u.ucreamed = wascreamed + blindinc;
        make_blinded(_BlindedTimeout_apply() + blindinc, false);
        if (!_uprop_active('BLINDED') || wasblind)
            await pline(`There's ${wascreamed ? 'more ' : ''}sticky goop all over your ${body_part(FACE)}.`);
        else
            await You_cant('see through all the sticky goop on your %s.', body_part(FACE));
    }

    /* C apply.c:3599-3603 — clear equipment, bill, extract, then free. */
    setnotworn(obj);
    await costly_alteration(obj, COST_SPLAT);
    _objExtractSelf_useupf(obj);
    await delobj(obj);
    return ECMD_OK;
}

function _use_cream_pie_can_blnd(obj) {
    if (!_haseyes(_hero_youmonst().data)) return false; /* mondata.c:316 */
    if ((obj.otyp | 0) !== _APPLY_CREAM_PIE_OTYP)
        return false;
    const ublindf = game.u?.ublindf;
    const LENSES_APPLY = 232;
    if (ublindf && (ublindf.otyp | 0) !== LENSES_APPLY)
        return false; /* Blindfolded */
    return true;
}

function _BlindedTimeout_apply() {
    return BlindedTimeout();
}

async function use_royal_jelly(obj) {
    const g = game;
    const u = g.u = g.u || {};
    g.context = g.context || {};

    const EGG = 266;
    const PM_KILLER_BEE = 1;
    const PM_QUEEN_BEE = 5;

    const splitit = (obj.quan > 1);

    if (splitit) {
        obj = (await splitobj(obj, 1));
    }
    /* remove from inventory so that it won't be offered as a choice
       to rub on itself */
    freeinv(obj);

    /* right now you can rub one royal jelly on an entire stack of eggs */
    const jelly_ok = function(o) {
        if (o && (o.otyp | 0) === EGG)
            return GETOBJ_SUGGEST;
        return GETOBJ_EXCLUDE;
    };
    /* C apply.c:3630 — getobj() here is invent.c:1752's REAL prompt loop
     * (getObjFromGetobj, cmd.js:14811), not the crude first-SUGGEST-wins
     * stub this file also has in scope as `getobj` (js/eat.js:3862, imported
     * above for doeat's tin/sacrifice callers). The stub checks
     * `callback(o) === 1` (GETOBJ_DOWNPLAY) where jelly_ok returns
     * GETOBJ_SUGGEST (2) for an EGG and GETOBJ_EXCLUDE (0) otherwise, so it
     * never matches an egg and instead silently walked to whatever OTHER
     * item first satisfied `=== 1` — never the cancel C takes when no egg is
     * carried. Using the real prompt loop makes an egg-less inventory return
     * null exactly as C's getobj does. */
    const eobj = await getObjFromGetobj("rub the royal jelly on", jelly_ok, GETOBJ_PROMPT);
    if (!eobj) {
        if (splitit) {
            await unsplitobj(obj); /* C mkobj.c:570: OBJ_FREE cannot unsplit. */
            update_inventory(); /* freeinv() updated perminv w/ obj omitted */
        } else {
            /* this lump was already separate; prevent merge */
            await addinv_nomerge(obj); /* put unused lump back; updates perminv */
        }
        return ECMD_CANCEL;
    }

    await You("smear royal jelly all over %s.", yname(eobj));

    const do_useup = async function() {
        /* not useup() because we've already done freeinv() */
        setnotworn(obj);
        await obfree(obj, null);
        /* *optr = 0 */
    };

    if ((eobj.otyp | 0) !== EGG) {
        await pline1(nothing_happens);
        await do_useup();
        return ECMD_TIME;
    }

    const oldcorpsenm = eobj.corpsenm | 0;
    if ((eobj.corpsenm | 0) === PM_KILLER_BEE)
        eobj.corpsenm = PM_QUEEN_BEE;

    if (obj.cursed) {
        if (eobj.timed || (eobj.corpsenm | 0) !== oldcorpsenm)
            await pline(_sprintf("The %s %s feebly.", xname(eobj), otense(eobj, "quiver")));
        else
            await pline(nothing_seems_to_happen);
        kill_egg(eobj);
        await do_useup();
        return ECMD_TIME;
    }

    const was_timed = eobj.timed;
    if ((eobj.corpsenm | 0) !== NON_PM) {
        if (!eobj.timed)
            attach_egg_hatch_timeout(eobj, 0);
        /* blessed royal jelly will make the hatched creature think
           you're the parent - but has no effect if you laid the egg */
        if (obj.blessed && !eobj.spe)
            eobj.spe = 2;
    }

    if ((eobj.timed && !was_timed) || eobj.spe === 2
        || (eobj.corpsenm | 0) !== oldcorpsenm)
        await pline(_sprintf("The %s %s briefly.", xname(eobj), otense(eobj, "quiver")));
    else
        await pline(nothing_seems_to_happen);

    await do_useup();
    return ECMD_TIME;
}

async function use_stethoscope(obj) {
    const g = game;
    const u = g.u = g.u || {};
    g.context = g.context || {};

    const interference = !!(u.uswallow && _is_whirly_ustuck()
        && !rn2(_Role_if_PM_HEALER() ? 10 : 3));

    /* C apply.c:327-336 — top guards. */
    if (_hero_nohands()) {
        await pline('You have no hands!'); /* not body_part(HAND) */
        return STETH_ECMD_OK;
    } else if (_hero_Deaf()) {
        await You_cant('hear anything!');
        return STETH_ECMD_OK;
    } else if (!freehand()) {
        await pline(`You have no free ${body_part(HAND)}.`);
        return STETH_ECMD_OK;
    }

    /* C apply.c:337 — getdir((char*)0); 0 → ECMD_CANCEL.  CONSUMES the key. */
    if (!(await getdir(null)))
        return STETH_ECMD_CANCEL;

    /* C apply.c:340-341 — first use this turn is free (ECMD_OK), a repeat use
     * the same turn consumes the turn (ECMD_TIME).  svc.context.stethoscope_seq
     * is 0-initialized (global); gh.hero_seq is 8 pre-turn-1, so the first use
     * compares 8 != 0 → ECMD_OK. */
    const heroSeq = g.hero_seq | 0;
    const res = (heroSeq === (g.context.stethoscope_seq | 0))
        ? STETH_ECMD_TIME : STETH_ECMD_OK;
    g.context.stethoscope_seq = heroSeq;

    /* C apply.c:343-344 — gb.bhitpos = hero; gn.notonhead = u.uswallow.
     * (Display bookkeeping; RNG-neutral.) */
    g.bhitpos = (g.gb ||= {}).bhitpos = { x: u.ux, y: u.uy };
    g.notonhead = (g.gn ||= {}).notonhead = u.uswallow;

    if (u.usteed && (u.dz | 0) > 0) {
        if (interference) {
            await pline('%s interferes.', Monnam(u.ustuck));
            await mstatusline(u.ustuck);
        } else {
            await mstatusline(u.usteed);
        }
        return res;
    } else if (u.uswallow && (u.dx || u.dy || u.dz)) {
        await mstatusline(u.ustuck);
        return res;
    } else if (u.uswallow && interference) {
        await pline('%s interferes.', Monnam(u.ustuck));
        await mstatusline(u.ustuck);
        return res;
    } else if (u.dz) {
        if (Underwater()) {
            Soundeffect(se_faint_splashing, 35);
            await You_hear('faint splashing.');
            return res;
        }
        if ((u.dz | 0) < 0 || !_steth_can_reach_floor(true)) {
            await cant_reach_floor(u.ux, u.uy, (u.dz | 0) < 0, true, false);
            return res;
        }
        const dzResBox = { res };
        if (!(await _steth_its_dead(u.ux, u.uy, dzResBox))) {
            if (Is_stronghold(u.uz)) {
                Soundeffect(se_crackling_of_hellfire, 35);
                await You_hear('the crackling of hellfire.');
            } else {
                await pline_The('%s seems healthy enough.', surface(u.ux, u.uy));
            }
        }
        return dzResBox.res;
    } else if (obj && obj.cursed && !rn2(2)) {
        /* C apply.c:374-376 — cursed stethoscope: !rn2(2) → "your heart beat".
         * You_hear(), not pline: Underwater reads "You barely hear". */
        Soundeffect(se_heart_beat, 100);
        await You_hear('your heart beat.');
        return res;
    }

    /* C apply.c:379 — confdir(FALSE): RNG-neutral for an un-impaired hero. */
    confdir(false);

    /* C apply.c:380-383 — self-target (dx=dy=0) → ustatusline(); return res. */
    if (!u.dx && !u.dy) {
        /* ustatusline() (insight.c:3422) — one-line self-probe feedback; it
         * consumes NO RNG.  RNG sequence + return code stay exact. */
        await _ustatusline();
        return res;
    }

    const rx = ((u.ux | 0) + (u.dx | 0)) | 0, ry = ((u.uy | 0) + (u.dy | 0)) | 0;
    /* C apply.c:386-390 */
    if (!isok(rx, ry)) {
        Soundeffect(se_typing_noise, 100);
        await You_hear('a faint typing noise.');
        return STETH_ECMD_OK;
    }
    /* C apply.c:391-445 — a monster on the probed square. */
    const mtmp = m_at(rx, ry);
    if (mtmp) {
        const mnm = x_monnam(mtmp, _ARTICLE_A_STETH, null,
            _SUPPRESS_IT | _SUPPRESS_INVISIBLE, false);
        /* C apply.c:396-397 — gb.bhitpos is what mstatusline() reads to pick the
         * right segment of a long worm; gn.notonhead likewise. */
        g.bhitpos = (g.gb ||= {}).bhitpos = { x: rx, y: ry };
        g.notonhead = (g.gn ||= {}).notonhead = ((mtmp.mx | 0) !== rx || (mtmp.my | 0) !== ry);

        if (mtmp.mundetected) {
            if (!canspotmon(mtmp))
                await There_real('is %s hidden there.', mnm);
            mtmp.mundetected = 0;
            newsym(mtmp.mx | 0, mtmp.my | 0);
        } else if (mtmp.mappearance) {
            /* C apply.c:404-437 — a mimic (or other disguised monster) is
             * unmasked.  `what` is read from the DISGUISE, so it must be taken
             * BEFORE seemimic() clears m_ap_type/mappearance, exactly as C does. */
            let what = 'thing', use_plural = false;
            const appear = mtmp.mappearance | 0;
            switch (M_AP_TYPE(mtmp)) {
            case M_AP_OBJECT:
                /* C apply.c:417-424: the dummy fruit keeps the mimic's type.
                 * set_mimic_sym stores its mcorpsenm on the live monster. */
                const fruit = MCORPSENM(mtmp) !== NON_PM ? MCORPSENM(mtmp)
                    : (mtmp.mcorpsenm ?? NON_PM);
                what = appear === _OTYP_SLIME_MOLD && fruit !== NON_PM
                    ? _ia_simpleonames({ otyp: appear, oclass: OCLASS_FOOD,
                                        quan: 1, corpsenm: NON_PM, spe: fruit })
                    : simple_typename(appear);
                use_plural = _steth_appear_is_plural(appear);
                break;
            case M_AP_MONSTER: /* C ignores Hallucination here */
                what = _steth_pmname(appear, mtmp);
                break;
            case M_AP_FURNITURE:
                what = _steth_defsym_explanation(appear);
                break;
            }
            _steth_seemimic(mtmp);
            /* C apply.c:434-436 pline("%s %s %s really %s.", ...) */
            await pline((use_plural ? 'Those ' : 'That ') + what
                + (use_plural ? ' are' : ' is') + ' really ' + mnm + '.');
        } else if ((g.flags?.verbose ?? true) && !canspotmon(mtmp)) {
            await There_real('is %s there.', mnm);
        }

        await mstatusline(mtmp);
        if (!canspotmon(mtmp))
            map_invisible(rx, ry);
        return res;
    }
    /* C apply.c:447-448 */
    if (unmap_invisible(rx, ry))
        await pline_The('invisible monster must have moved.');

    /* C apply.c:450-464 — a secret door or secret corridor answers hollow and
     * is converted in place. */
    const lev = g.level?.locations?.[rx]?.[ry];
    if (lev && (lev.typ | 0) === SDOOR) {
        Soundeffect(se_hollow_sound, 100);
        await You_hear('a hollow sound.  This must be a secret %s!', 'door');
        _steth_cvt_sdoor_to_door(lev); /* ->typ = DOOR */
        recalc_block_point(rx, ry);
        feel_newsym(rx, ry);
        return res;
    }
    if (lev && (lev.typ | 0) === SCORR) {
        await You_hear('a hollow sound.  This must be a secret %s!', 'passage');
        lev.typ = CORR;
        lev.flags = 0;
        unblock_point(rx, ry);
        feel_newsym(rx, ry);
        return res;
    }

    /* C apply.c:466-468 — `if (!its_dead(rx, ry, &res)) You("hear nothing
     * special.");`  its_dead writes back through resp, so `res` is a box here. */
    const resBox = { res };
    if (!(await _steth_its_dead(rx, ry, resBox)))
        await pline('You hear nothing special.');
    return resBox.res;
}

/* do_name.c x_monnam ARTICLE_A; the file's other x_monnam callers use the
 * `_ARTICLE_YOUR` local a few hundred lines below, same enum. */
const _ARTICLE_A_STETH = 2;

/* seffects.h enum indices (se_zero_invalid = 0); Soundeffect is the
 * sndprocs.h:272 no-op below, kept for call-shape fidelity. */
const se_crackling_of_hellfire = 48, se_faint_splashing = 80, se_heart_beat = 99,
      se_hollow_sound = 101, se_shrill_whistle_cmd = 151, se_typing_noise = 191;

/* C apply.c:424-425 — use_plural is (is_boots(o) || is_gloves(o) || otyp ==
 * LENSES) on the DISGUISE object.  This file already carries exactly those otyp
 * spans as _GLOVES_OTYP_MIN/_BOOTS_OTYP_MIN/_LENSES_OTYP for xname's "pair of"
 * rule (see _is_pair_of_armor); reuse them rather than declare a fifth copy. */
function _steth_appear_is_plural(otyp) {
    return (otyp >= _GLOVES_OTYP_MIN && otyp <= _GLOVES_OTYP_MAX)
        || (otyp >= _BOOTS_OTYP_MIN && otyp <= _BOOTS_OTYP_MAX)
        || otyp === _LENSES_OTYP;
}

/* C apply.c:431-432 — M_AP_FURNITURE prints defsyms[mappearance].explanation;
 * js/defsym_data.js DEFSYM_EXPLANATION is that column (js/sp_lev.js:4609 reads
 * it for the same appear_as lookup, from the other direction). */
function _steth_defsym_explanation(appear) {
    return DEFSYM_EXPLANATION[appear | 0] || 'thing';
}

// Historical get_mtraits gap notes below predate the audit wiring in this function.
const _STETH_CORPSE_OTYP = 265, _STETH_STATUE_OTYP = 476;

/* trap.h STATUE_TRAP; js/const.js:2275 exports the same value, but this file's
 * const.js import list does not carry it. */
const _STETH_STATUE_TRAP = 19;

/* monflag.h:178 MZ_TINY = 0. */
const _STETH_MZ_TINY = 0;

/* monflag.h:138-139 M2_MALE 0x00010000L, M2_FEMALE 0x00020000L (mondata.h:112-113
 * is_male / is_female read exactly these two bits of mflags2). */
const _STETH_M2_MALE = 0x00010000, _STETH_M2_FEMALE = 0x00020000;

function _steth_can_reach_floor(check_pit) {
    return can_reach_floor(check_pit);
}

/* C ref: invent.c:1478-1489 nxtobj(obj, type, by_nexthere) — "sobj_at(&c)
 * traversal": find the NEXT object of `type` following `obj` on the SAME
 * per-tile chain (by_nexthere true) or the same owner chain (false).  The
 * shared port in mklev.js advances before testing, as C requires. */
function _steth_nxtobj(obj, type, by_nexthere) {
    return nxtobj(obj, type, by_nexthere);
}

async function _steth_its_dead(rx, ry, resBox) {
    let corpse = sobj_at(_STETH_CORPSE_OTYP, rx, ry);
    let statue = sobj_at(_STETH_STATUE_OTYP, rx, ry);

    if (!_steth_can_reach_floor(true)) {
        corpse = null;
        while (statue
               && (permonstTemplate(statue.corpsenm | 0)?.msize | 0) === _STETH_MZ_TINY)
            statue = _steth_nxtobj(statue, _STETH_STATUE_OTYP, true);
    }
    /* C apply.c:215-220 — both present: keep the uppermost. */
    if (corpse && statue) {
        if (_steth_nxtobj(statue, _STETH_CORPSE_OTYP, true) === corpse)
            corpse = null;
        else
            statue = null;
    }
    const more_corpses = !!(corpse && _steth_nxtobj(corpse, _STETH_CORPSE_OTYP, true));

    if (!corpse && !statue)
        return false; /* C apply.c:223-224 — nothing to do */

    const Hallucination = _uprop_active('HALLUC');
    const Blind = _uprop_active('BLINDED');
    const here = ((game.u?.ux | 0) === rx && (game.u?.uy | 0) === ry);

    if (Hallucination) {
        /* C apply.c:225-247 */
        let buf;
        if (!corpse) {
            buf = "You're both stoned";
        } else if ((corpse.quan | 0) === 1 && !more_corpses) {
            const mptr = permonstTemplate(corpse.corpsenm | 0);
            const mf2 = mptr?.mflags2 | 0;
            /* C apply.c:232-243: get_mtraits(corpse, FALSE) first, else the
             * is_female / is_male bits of mons[corpse->corpsenm]. */
            const traits = get_mtraits(corpse, false);
            const gndr = traits ? pronoun_gender(traits, 1) : (mf2 & _STETH_M2_FEMALE) ? 1 : (mf2 & _STETH_M2_MALE) ? 0 : 2;
            const he = ['he', 'she', 'it'][gndr];
            buf = he.charAt(0).toUpperCase() + he.slice(1) + "'s dead";
        } else {
            buf = "They're dead";
        }
        /* C apply.c:249 You_hear("a voice say, \"%s, Jim.\"", buf) */
        await You_hear('a voice say, "%s, Jim."', buf);
        resBox.res = STETH_ECMD_TIME;
        return true;
    }
    if (corpse) {
        /* C apply.c:256-280 */
        const one = ((corpse.quan | 0) === 1 && !more_corpses);
        let reviver = false;
        if (Blind)
            map_object(corpse, true);
        if (_Role_if_PM_HEALER()) {
            /* C apply.c:269-274 — ok to reset `corpse' here */
            do {
                if (obj_has_timer(corpse, REVIVE_MON))
                    reviver = true;
                else
                    corpse = _steth_nxtobj(corpse, _STETH_CORPSE_OTYP, true);
            } while (corpse && !reviver);
        }
        await pline('You determine that '
            + (one ? (here ? 'this' : 'that') : (here ? 'these' : 'those'))
            + ' unfortunate being' + (one ? '' : 's') + ' '
            + (one ? 'is' : 'are') + (reviver ? ' mostly' : '') + ' dead.');
        return true;
    }
    /* C apply.c:282-306 — statue */
    const sptr = permonstTemplate(statue.corpsenm | 0);
    let what;
    if (Blind) {
        what = (here ? 'This' : 'That') + ' '
            + (humanoid_cmd(sptr) ? 'person' : 'creature');
    } else {
        what = obj_pmname(statue);
        if (!type_is_pname(sptr))
            what = The(what);
    }
    let how = 'fine';
    if (_Role_if_PM_HEALER()) {
        const ttmp = t_at(rx, ry);
        if (ttmp && (ttmp.ttyp | 0) === _STETH_STATUE_TRAP)
            how = 'extraordinary';
        else if (Has_contents(statue))
            how = 'remarkable';
    }
    await pline(what + ' is in ' + how + ' health for a statue.');
    return true;
}

const _WRITE_MAGIC_MARKER = 242;

const _RANDOM_CLASS = 0;

const _COIN_CLASS = 12;

/* additional material constants (objclass.h) — _MAT_LIQUID, _MAT_GLASS, _MAT_WOOD already exist at lines 4620-4621 */
const _MAT_WAX = 2, _MAT_CLOTH = 6;

const _MAT_SILVER = 14, _MAT_GOLD = 15;

/* C ref: apply.c:2660 touchstone_ok(struct obj *obj) */
function _touchstone_ok(o) {
    if (!o) return GETOBJ_EXCLUDE;
    if ((o.oclass | 0) === _COIN_CLASS) return GETOBJ_SUGGEST;
    if ((o.oclass | 0) === _GEM_CLASS
        && !(o.dknown && !!(game._oc_name_known && game._oc_name_known[o.otyp | 0])))
        return GETOBJ_SUGGEST;
    return GETOBJ_DOWNPLAY;
}

/* C ref: invent.c:1710 any_obj_ok — any object, but not hands */
function _any_obj_ok(o) {
    if (!o) return GETOBJ_EXCLUDE;
    return GETOBJ_SUGGEST;
}

async function use_stone(tstone) {
    const g = game;
    const u = g.u = g.u || {};
    g.context = g.context || {};

    const scritch = '"scritch, scritch"';
    const Blind = _uprop_active('BLINDED');
    const Hallucination = _uprop_active('HALLUC');

    /* in case it was acquired while blinded */
    if (!Blind)
        observe_object(tstone);

    const known = ((tstone.otyp | 0) === _TOUCHSTONE && tstone.dknown
                   && !!(g._oc_name_known && g._oc_name_known[_TOUCHSTONE]));

    let stonebuf = `rub on the stone${plur(tstone.quan)}`;

    /* when the touchstone is fully known, don't bother listing extra
       junk as likely candidates for rubbing */
    const obj = await getObjFromGetobj(stonebuf, known ? _touchstone_ok : _any_obj_ok, GETOBJ_PROMPT);
    if (!obj)
        return ECMD_CANCEL;

    if (obj === tstone && (obj.quan | 0) === 1) {
        await You_cant(`rub ${_the_str(xname(obj))} on itself.`);
        return ECMD_OK;
    }

    if ((tstone.otyp | 0) === _TOUCHSTONE && tstone.cursed
        && (obj.oclass | 0) === _GEM_CLASS && !is_graystone(obj)
        && !obj_resists(obj, 80, 100)) {
        if (Blind)
            await pline('You feel something shatter.');
        else if (Hallucination)
            await pline('Oh, wow, look at the pretty shards.');
        else
            await pline(`A sharp crack shatters ${(obj.quan > 1) ? 'one of ' : ''}${_the_str(xname(obj))}.`);
        await useup(obj);
        return ECMD_TIME;
    }

    if (Blind) {
        await pline(scritch);
        return ECMD_TIME;
    } else if (Hallucination) {
        await pline('Oh wow, man: Fractals!');
        return ECMD_TIME;
    }

    let do_scratch = false;
    let streak_color = null;

    let oclass = obj.oclass | 0;
    /* prevent non-gemstone rings from being treated like gems */
    if (oclass === _RING_CLASS
        && MKOBJ_OC_MATERIAL[obj.otyp | 0] !== _MAT_GEMSTONE
        && MKOBJ_OC_MATERIAL[obj.otyp | 0] !== _MAT_MINERAL)
        oclass = _RANDOM_CLASS;

    switch (oclass) {
    case _GEM_CLASS:
    case _RING_CLASS:
        if ((tstone.otyp | 0) !== _TOUCHSTONE) {
            do_scratch = true;
        } else if ((obj.oclass | 0) === _GEM_CLASS
                   && (tstone.blessed
                       || (!tstone.cursed && (Role_if(PM_ARCHEOLOGIST)
                                              || Race_if(PM_GNOME))))) {
            makeknown(_TOUCHSTONE);
            makeknown(obj.otyp | 0);
            await prinv(null, obj, 0);
            return ECMD_TIME;
        } else {
            /* either a ring or the touchstone was not effective */
            if (MKOBJ_OC_MATERIAL[obj.otyp | 0] === _MAT_GLASS) {
                do_scratch = true;
                break;
            }
        }
        // C apply.c:2759 reads the runtime color after o_init.c shuffles it.
        streak_color = _c_obj_colors[g._objColors?.[obj.otyp | 0]
                                     ?? MKOBJ_OC_COLOR[obj.otyp | 0]];
        break; /* gem or ring */

    default:
        switch (MKOBJ_OC_MATERIAL[obj.otyp | 0]) {
        case _MAT_CLOTH:
            await pline(`${Tobjnam(tstone, 'look')} a little more polished now.`);
            return ECMD_TIME;
        case _MAT_LIQUID:
            if (!obj.known)
                await pline('You must think this is a wetstone, do you?');
            else
                await pline(`${Tobjnam(tstone, 'are')} a little wetter now.`);
            return ECMD_TIME;
        case _MAT_WAX:
            streak_color = 'waxy';
            break;
        case _MAT_WOOD:
            streak_color = 'wooden';
            break;
        case _MAT_GOLD:
            do_scratch = true;
            streak_color = 'golden';
            break;
        case _MAT_SILVER:
            do_scratch = true;
            streak_color = 'silvery';
            break;
        default:
            /* Objects passing the is_flimsy() test will not
               scratch a stone.  They will leave streaks on
               non-touchstones and touchstones alike. */
            if (is_flimsy(obj))
                streak_color = _c_obj_colors[g._objColors?.[obj.otyp | 0]
                                             ?? MKOBJ_OC_COLOR[obj.otyp | 0]];
            else
                do_scratch = ((tstone.otyp | 0) !== _TOUCHSTONE);
            break;
        }
        break; /* default oclass */
    }

    stonebuf = `stone${plur(tstone.quan)}`;
    if (do_scratch)
        await pline(`You make ${streak_color ? streak_color : ''}${streak_color ? ' ' : ''}scratch marks on the ${stonebuf}.`);
    else if (streak_color)
        await You_see(`${streak_color} streaks on the ${stonebuf}.`);
    else
        await pline(scritch);
    return ECMD_TIME;
}

/* C ref: apply.c:1769 rub_ok(obj) — suggest the two lamps, the lantern, the
 * four gray stones and a lump of royal jelly; exclude everything else. */
function rub_ok(obj) {
    if (!obj)
        return GETOBJ_EXCLUDE;
    const otyp = obj.otyp | 0;
    if (otyp === CL_OIL_LAMP || otyp === CL_MAGIC_LAMP || otyp === CL_BRASS_LANTERN
        || is_graystone(obj) || otyp === _LUMP_OF_ROYAL_JELLY)
        return GETOBJ_SUGGEST;
    return GETOBJ_EXCLUDE;
}

const _LUMP_OF_ROYAL_JELLY = 286;

export async function dorub() {
    const g = game;
    const u = g.u = g.u || {};

    /* C apply.c:1789 — nohands(gy.youmonst.data), mondata.h:52. */
    if (_nohands(_hero_youmonst().data)) {
        await pline("You aren't able to rub anything without hands.");
        return ECMD_OK;
    }
    const obj = await getObjFromGetobj('rub', rub_ok, GETOBJ_NOFLAGS); /* apply.c:1793 */
    if (!obj)
        return ECMD_CANCEL;
    /* C apply.c:1796 — gems and food go to the stone / royal-jelly handlers. */
    if ((obj.oclass | 0) === _GEM_CLASS || (obj.oclass | 0) === _MG_FOOD_CLASS) {
        if (is_graystone(obj)) {
            return await use_stone(obj);
        } else if ((obj.otyp | 0) === _LUMP_OF_ROYAL_JELLY) {
            return await use_royal_jelly(obj);
        } else {
            await pline("Sorry, I don't know how to use that.");
            return ECMD_OK;
        }
    }
    /* C apply.c:1806 */
    if (!_wt_sameObj(obj, u.uwep)) {
        if (await wield_tool(obj, "rub")) {
            cmdq_add_ec(CQ_CANNED, 'dorub');
            cmdq_add_key(CQ_CANNED, obj.invlet | 0);
            return ECMD_TIME;
        }
        return ECMD_OK;
    }

    /* now uwep is obj — C apply.c:1815 */
    if ((u.uwep.otyp | 0) === CL_MAGIC_LAMP) {
        if ((u.uwep.spe | 0) > 0 && !rn2(3)) {
            /* C apply.c:1817-1831.  Transform BEFORE releasing the djinni. */
            await check_unpaid_usage(u.uwep, true);
            u.uwep.otyp = CL_OIL_LAMP;
            u.uwep.spe = 0;
            u.uwep.age = rn1(500, 1000);
            if (u.uwep.lamplit)
                begin_burn(u.uwep, true);
            await djinni_from_bottle(u.uwep);
            makeknown(CL_MAGIC_LAMP);
            update_inventory();
        } else if (rn2(2)) {
            await pline(_uprop_active('BLINDED') ? "You smell smoke."
                                                : "You see a puff of smoke.");
        } else {
            await pline("Nothing happens.");
        }
    } else if ((obj.otyp | 0) === CL_BRASS_LANTERN) {
        /* C apply.c:1837-1839 — message from Adventure. */
        await pline("Rubbing the electric lamp is not particularly rewarding.");
        await pline("Anyway, nothing exciting happens.");
    } else {
        await pline("Nothing happens.");
    }
    return ECMD_TIME;
}

/* C ref: apply.c:78 use_camera(struct obj *obj) — the expensive camera
 * "apply" path.  Consumes a charge and takes a picture in a direction.
 */
async function use_camera(obj) {
    const g = game;
    const u = g.u = g.u || {};
    g.context = g.context || {};

    if (u.uinwater) {
        await pline("Using your camera underwater would void the warranty.");
        return ECMD_OK;
    }
    if (!(await getdir(null)))
        return ECMD_CANCEL;

    if ((obj.spe | 0) <= 0) {
        await pline1(nothing_happens);
        return ECMD_TIME;
    }
    consume_obj_charge(obj, true);

    if (obj.cursed && !rn2(2)) {
        /* C apply.c:95: (void) zapyourself(obj, TRUE); */
        await zapyourself(obj, true);
    } else if (u.uswallow) {
        await You("take a picture of %s %s.", s_suffix(mon_nam(u.ustuck)),
                  mbodypart(u.ustuck, STOMACH));
    } else if (u.dz) {
        await You("take a picture of the %s.",
                  (u.dz > 0) ? surface(u.ux, u.uy) : ceiling(u.ux, u.uy));
    } else if (!u.dx && !u.dy) {
        /* C apply.c:103-104: TODO selfie joke; (void) zapyourself(obj, TRUE); */
        await zapyourself(obj, true);
    } else {
        await do_blinding_ray(obj);
    }
    return ECMD_TIME;
}

/* C ref: apply.c:55-76 do_blinding_ray(obj).  The bhit(FLASHED_LIGHT) walk is
 * done inline (zap.c:3835-4130 has no JS body): a flash continues THROUGH
 * invisible monsters, calling flash_hits_mon directly, and stops at the first
 * visible one.  tmp_at beam animations are display-only and not
 * modelled. */
export async function do_blinding_ray(obj) {
    const g = game;
    const u = g.u;
    const ddx = u.dx | 0, ddy = u.dy | 0;
    let mtmp = null, flashDone = false;
    let x = u.ux | 0, y = u.uy | 0;
    g.gb = g.gb || {};
    g.gb.bhitpos = { x, y };
    tmp_at(DISP_BEAM, 4084 /* cmap_to_glyph(S_flashbeam) */); /* zap.c:3862 */
    for (let range = COLNO; range-- > 0; ) {
        x += ddx; y += ddy;
        g.gb.bhitpos = { x, y };
        if (!isok(x, y)) {
            x -= ddx; y -= ddy;
            g.gb.bhitpos = { x, y };
            break;
        }
        const typ = (g.level?.locations?.[x]?.[y]?.typ ?? 0) | 0;
        if (!_hero_Blind()) await show_transient_light(null, x, y);
        let m = m_at(x, y);
        /* a flash passes a mimic pretending to be an object */
        if (m && M_AP_TYPE(m) === M_AP_OBJECT)
            m = null;
        if (m) {
            g.gn = g.gn || {};
            g.gn.notonhead = (x !== (m.mx | 0) || y !== (m.my | 0));
            if (m.minvis) {
                obj.ox = u.ux; obj.oy = u.uy;
                await flash_hits_mon(m, obj);
            } else {
                tmp_at(DISP_END, 0); /* zap.c:3999: erase the beam trail (newsym) */
                mtmp = m;
                flashDone = true;
                break;
            }
        }
        if (typ < POOL || closed_door(x, y)) {
            g.gb.bhitpos = { x: x - ddx, y: y - ddy };
            break;
        }
        /* zap.c:4082-4086: 'I' present but no monster: erase (before tmp_at) */
        if (glyph_is_invisible_at(x, y) && cansee(x, y)) {
            unmap_object(x, y);
            newsym(x, y);
        }
        tmp_at(x, y); /* zap.c:4087 */
        nh_delay_output();
    }
    if (!flashDone)
        tmp_at(DISP_END, 0); /* zap.c:4128 */
    obj.ox = u.ux; obj.oy = u.uy; /* flash_hits_mon() wants this */
    if (mtmp) {
        await flash_hits_mon(mtmp, obj);
        if ((obj.otyp | 0) === EXPENSIVE_CAMERA)
            see_monster_closeup(mtmp, true); /* TRUE for photo */
    }
    await _transient_light_cleanup(); /* C apply.c:75 */
}

const EXPENSIVE_CAMERA = _IA_EXPENSIVE_CAMERA_OTYP;

const S_goodpos = 87; /* rm.h */

function cmap_to_glyph(cmap_idx) {
    const S_digbeam = 78, GLYPH_CMAP_C_OFF = 4083;
    return (cmap_idx - S_digbeam) + GLYPH_CMAP_C_OFF;
}

const SPE_JUMPING = 404; /* objects.h */

const spe_Fresh = 1; /* spell.h */

/* C ref: apply.c:1852-1858 enum jump_trajectory. */
const jAny = 0, jHorz = 1, jVert = 2, jDiag = 3;

/* C ref: youprop.h:221-223 HJumping / EJumping / Jumping.  u_init.c:691 writes
 * the Knight's grant as g.u.HJumping (js/u_init.js:867) while worn jumping
 * boots go through the uprops[JUMPING] record (js/do_wear.js), so both halves
 * are read here. */
function _HJumping() {
    const u = game.u || {};
    return ((u.uprops?.[JUMPING]?.intrinsic) | 0) | ((u.HJumping) | 0);
}

function _EJumping() {
    const u = game.u || {};
    return ((u.uprops?.[JUMPING]?.extrinsic) | 0);
}

function _Jumping() { return (_HJumping() | _EJumping()) !== 0; }

/* C ref: apply.c:1860-1890 check_jump(arg, x, y) — the walk_path callback that
 * decides whether the jump's flight path may cross (x,y).  `arg` is C's
 * `int *traj`; the port passes the trajectory value directly. */
function check_jump(traj, x, y) {
    const g = game;
    const lev = _levlAt(x, y);

    if (_uprop_active('PASSES_WALLS'))                  /* apply.c:1866-1867 */
        return true;
    if (!lev || IS_STWALL(lev.typ | 0))                  /* apply.c:1868-1869 */
        return false;
    if (IS_DOOR(lev.typ | 0)) {                          /* apply.c:1870-1881 */
        if (closed_door(x, y))
            return false;
        if (((lev.doormask | 0) & D_ISOPEN) !== 0 && traj !== jAny
            && (traj === jDiag
                || (((traj & jHorz) !== 0) === (!!lev.horizontal))))
            return false;
        /* empty doorways aren't restricted */
    }
    /* C apply.c:1885-1887 — rock throwers can jump over boulders. */
    if (sobj_at(BOULDER, x, y) && !flooreffects_throws_rocks(_hero_youmonst().data))
        return false;
    return true;
}

/* C ref: apply.c:1892-1953 is_valid_jump_pos(x, y, magic, showmsg). */
async function is_valid_jump_pos(x, y, magic, showmsg) {
    const g = game, u = g.u || {};
    const ux = u.ux | 0, uy = u.uy | 0;
    const distu = dist2(x, y, ux, uy);

    /* apply.c:1895-1902 — the Knight's chess-move restriction: an INTRINSIC-only
     * HJumping (which is exactly what u_init grants) leaves
     * (HJumping & ~INTRINSIC) zero, so only distu == 5 is legal. */
    if (!magic && !(_HJumping() & ~INTRINSIC) && !_EJumping() && distu !== 5) {
        if (showmsg)
            await pline('Illegal move!');
        return false;
    } else if (distu > (magic ? 6 + magic * 3 : 9)) {     /* apply.c:1903-1906 */
        if (showmsg)
            await pline('Too far!');
        return false;
    } else if (!isok(x, y)) {                            /* apply.c:1907-1910 */
        if (showmsg)
            await pline('You cannot jump there!');
        return false;
    } else if (!cansee(x, y)) {                          /* apply.c:1911-1914 */
        if (showmsg)
            await pline('You cannot see where to land!');
        return false;
    } else {
        const lev = _levlAt(ux, uy);
        const dx = x - ux, dy = y - uy;
        let ax = Math.abs(dx), ay = Math.abs(dy);
        /* apply.c:1924-1926 — diag: any non-orthogonal destination is diagonal */
        const diag = (magic || _uprop_active('PASSES_WALLS') || (!dx && !dy)) ? jAny
            : !dy ? jHorz : !dx ? jVert : jDiag;
        /* apply.c:1928-1936 — traj: flatten the trajectory */
        if (ax >= 2 * ay) ay = 0;
        else if (ay >= 2 * ax) ax = 0;
        const traj = (magic || _uprop_active('PASSES_WALLS') || (!ax && !ay)) ? jAny
            : !ay ? jHorz : !ax ? jVert : jDiag;
        /* apply.c:1937-1946 — no diagonal jump out of an open doorway. */
        if (diag === jDiag && lev && IS_DOOR(lev.typ | 0)
            && ((lev.doormask | 0) & D_ISOPEN) !== 0
            && (traj === jDiag
                || (((traj & jHorz) !== 0) === (!!lev.horizontal)))) {
            if (showmsg)
                await pline("You can't jump diagonally out of a doorway.");
            return false;
        }
        const uc = { x: ux, y: uy };
        const tc = { x: x, y: y };                       /* apply.c:1947-1948 */
        if (!(await walk_path(uc, tc,
                              (arg, px, py) => check_jump(arg, px, py), traj))) {
            if (showmsg)
                await pline('There is an obstacle preventing that jump.');
            return false;
        }
    }
    return true;
}

/* C ref: apply.c:1955-1962 get_valid_jump_position(x, y) — the getpos_getvalid
 * callback installed for the duration of jump()'s getpos(). */
async function get_valid_jump_position(x, y) {
    const g = game;
    const lev = _levlAt(x, y);
    return isok(x, y)
        && (!!(lev && ACCESSIBLE(lev.typ | 0)) || _uprop_active('PASSES_WALLS'))
        && (await is_valid_jump_pos(x, y, g.jumping_is_magic | 0, false));
}

async function display_jump_positions(on_off) {
    const u = game.u || {};
    if (on_off) {
        tmp_at(DISP_BEAM, cmap_to_glyph(S_goodpos));
        for (let dx = -4; dx <= 4; dx++)
            for (let dy = -4; dy <= 4; dy++) {
                const x = dx + (u.ux | 0), y = dy + (u.uy | 0);
                if (await get_valid_jump_position(x, y)
                    && !(x === (u.ux | 0) && y === (u.uy | 0)))
                    tmp_at(x, y);
            }
    } else {
        tmp_at(DISP_END, 0);
    }
}

/* C ref: apply.c:1990-2164 jump(magic) — 0 = physical, otherwise skill level. */
export async function jump(magic) {
    const g = game, u = g.u || {};
    const cc = { x: 0, y: 0 };

    /* C apply.c:1993 — fresh and stale jumping spells use the canonical
     * object-type dispatcher. Forgotten spells fall through to physical jump. */
    if (!magic && !_Jumping() && known_spell(SPE_JUMPING) >= spe_Fresh)
        return await spelleffects(SPE_JUMPING, false, false);

    /* apply.c:1997-2055 — the can't-jump ladder, in C order. */
    if (!magic && (_kick_nolimbs(_hero_youmonst().data) || _st_slithy(_hero_youmonst().data))) { /* apply.c:1997-2000 */
        await pline("You can't jump; you have no legs!");
        return ECMD_OK;
    } else if (!magic && !_Jumping()) {                  /* apply.c:2001-2003 */
        await pline("You can't jump very far.");
        return ECMD_OK;
    } else if (!magic && u.usteed && stucksteed(false)) { /* apply.c:2005-2009 */
        return ECMD_OK;
    } else if (u.uswallow) {                             /* apply.c:2010-2016 */
        if (magic) {
            await pline('You bounce around a little.');
            return ECMD_TIME;
        }
        await pline("You've got to be kidding!");
        return ECMD_OK;
    } else if (u.uinwater) {                             /* apply.c:2017-2023 */
        if (magic) {
            await pline('You swish around a little.');
            return ECMD_TIME;
        }
        await pline('This calls for swimming, not jumping!');
        return ECMD_OK;
    } else if (u.ustuck) {                               /* apply.c:2024-2039 */
        if (u.ustuck.mtame && !_uprop_active('CONFLICT') && !u.ustuck.mconf) {
            const mtmp = u.ustuck;
            set_ustuck(null);
            await pline(`You pull free from ${mon_nam(mtmp)}.`);
            return ECMD_TIME;
        }
        if (magic) {
            await pline(`You writhe a little in the grasp of ${mon_nam(u.ustuck)}!`);
            return ECMD_TIME;
        }
        await pline(`You cannot escape from ${mon_nam(u.ustuck)}!`);
        return ECMD_OK;
    } else if (_jump_levitating()) {                     /* apply.c:2040-2046 */
        if (magic) {
            await pline('You flail around a little.');
            return ECMD_TIME;
        }
        await pline("You don't have enough traction to jump.");
        return ECMD_OK;
    } else if (!magic && near_capacity() > UNENCUMBERED) {
        await pline('You are carrying too much to jump!'); /* apply.c:2047-2049 */
        return ECMD_OK;
    } else if (!magic && ((u.uhunger | 0) <= 100 || acurr(u, A_STR) < 6)) {
        await pline('You lack the strength to jump!');   /* apply.c:2050-2052 */
        return ECMD_OK;
    } else if (!magic && _jump_wounded_legs()) {         /* apply.c:2053-2055 */
        await legs_in_no_shape('jumping', !!u.usteed);
        return ECMD_OK;
    } else if (u.usteed && u.utrap) {                    /* apply.c:2056-2058 */
        await pline(`${Monnam(u.usteed)} is stuck in a trap.`);
        return ECMD_OK;
    }

    await pline('Where do you want to jump?');           /* apply.c:2060 */
    cc.x = u.ux | 0;                                     /* apply.c:2061-2062 */
    cc.y = u.uy | 0;
    g.jumping_is_magic = magic;                          /* apply.c:2063 */
    await getpos_sethilite(display_jump_positions, get_valid_jump_position);
    if ((await getpos(cc, true, 'the desired position')) < 0)
        return ECMD_CANCEL; /* user pressed ESC */       /* apply.c:2065-2066 */
    if (!(await is_valid_jump_pos(cc.x, cc.y, magic, true))) {
        return ECMD_FAIL;                                /* apply.c:2067-2069 */
    } else if (u.usteed && u_at(cc.x, cc.y)) {           /* apply.c:2069-2071 */
        await pline(`${YMonnam(u.usteed)} isn't capable of jumping in place.`);
        return ECMD_FAIL;
    } else {
        let wastrapped = false;                          /* apply.c:2077 */

        if (u.utrap) {                                   /* apply.c:2079-2115 */
            wastrapped = true;
            switch (u.utraptype | 0) {
            case TT_BEARTRAP: {
                const side = rn2(3) ? LEFT_SIDE : RIGHT_SIDE;
                await pline('You rip yourself free of the bear trap!  Ouch!');
                await losehp(flooreffects_Maybe_Half_Phys(rnd(10)), 'jumping out of a bear trap', KILLED_BY);
                set_wounded_legs(side, rn1(1000, 500));
                break;
            }
            case TT_PIT:
                await pline('You leap from the pit!');
                break;
            case TT_WEB:
                await pline('You tear the web apart as you pull yourself free!');
                deltrap(t_at(u.ux, u.uy));
                break;
            case TT_LAVA:
                await pline('You pull yourself above the %s!', hliquid('lava'));
                cc.x = u.ux | 0; cc.y = u.uy | 0; /* take u_at() 'if' below */
                break;
            case TT_BURIEDBALL:
            case TT_INFLOOR:
                await pline(`You strain your ${makeplural(body_part(LEG))}, but you're still ${(u.utraptype | 0) === TT_INFLOOR
                    ? 'stuck in the floor' : 'attached to the buried ball'}.`);
                set_wounded_legs(LEFT_SIDE, rn1(10, 11));
                set_wounded_legs(RIGHT_SIDE, rn1(10, 11));
                return ECMD_TIME;
            default:
                await real_impossible('Jumping out of strange trap (%d)?', u.utraptype | 0);
                break;
            }
            /* if we reach here, hero is no longer trapped */
            await reset_utrap(true);                           /* apply.c:2116 */
        }
        /* apply.c:2118-2136 — jumping onto the hero's own spot. */
        if (u_at(cc.x, cc.y)) {
            if (wastrapped) {
                await morehungry(rnd(10));
                return ECMD_TIME;
            }
            const t = t_at(cc.x, cc.y);
            if (t) {
                await pline(`You jump up and ${!_jump_flying() ? 'come' : 'fly'} back down.`);
                await dotrap(t, FORCETRAP | TOOKPLUNGE);
                return ECMD_TIME;
            }
            await pline(`You ${_uprop_active('HALLUC') ? 'hop up and down a bit'
                : 'decide not to jump after all'}.`);
            return ECMD_OK;
        }

        /* apply.c:2138-2153 — walk the path, calling hurtle_jump at each step;
         * the final position actually reached ends up in cc. */
        const uc = { x: u.ux | 0, y: u.uy | 0 };
        let range = cc.x - uc.x;
        if (range < 0) range = -range;
        let temp = cc.y - uc.y;
        if (temp < 0) temp = -temp;
        if (range < temp) range = temp;
        const rangeBox = { range };
        await walk_path(uc, cc, hurtle_jump, rangeBox);
        /* C has one topline: a hurtle_step "You bump into <mon>." printed during
         * the walk precedes teleds's "You see here ..." (spoteffects/pickup).  This
         * port publishes pickup's line through _resultMessage, which renders BEFORE
         * _pending_message, so hand the pending bump over first (teleport.js:654). */
        if (game._pending_message && !game._resultMessage) {
            const _joins = _topl_joins_snapshot(game._pending_message);
            game._resultMessage = game._pending_message;
            game._pending_message = '';
            game._resultMessageJoins = { src: game._resultMessage, joins: (_joins || []).slice() };
        }
        await teleds(cc.x, cc.y, TELEDS_NO_FLAGS);       /* apply.c:2154 */
        nomul(-1);                                       /* apply.c:2155-2157 */
        g.multi_reason = 'jumping around';
        g.nomovemsg = '';
        await morehungry(rnd(25));                        /* apply.c:2158 */
        return ECMD_TIME;
    }
}

/* C ref: youprop.h Levitation / Is_airlevel / Is_waterlevel — the apply.c:2040
 * traction test.  Read straight off uprops[] with the numeric prop index (the
 * keying set_wounded_legs and do_wear use); cmd.js's older _Levitation() helper
 * looks the record up by a STRING key, which never matches. */
function _jump_levitating() {
    const g = game, u = g.u || {};
    const p = u.uprops?.[LEVITATION];
    const lev = !!(((p?.intrinsic | 0) || (p?.extrinsic | 0)) && !(p?.blocked | 0));
    return lev || Is_airlevel(u.uz) || Is_waterlevel(u.uz);
}

function _jump_flying() {
    const p = game.u?.uprops?.[FLYING];
    return !!(((p?.intrinsic | 0) || (p?.extrinsic | 0)) && !(p?.blocked | 0));
}

/* C ref: youprop.h Wounded_legs = u.uprops[WOUNDED_LEGS].{intrinsic,extrinsic} */
function _jump_wounded_legs() {
    const p = game.u?.uprops?.[WOUNDED_LEGS];
    return !!((p?.intrinsic | 0) || (p?.extrinsic | 0));
}

/* C ref: cmd.c extcmdlist "jump" → dojump() (apply.c:2166-2170). */
export async function dojump() {
    return await jump(0);
}

/* C mondata.h:26 breathless(ptr) — M1_BREATHLESS is 0x400. */
function breathless(mdata) {
    return !!mdata && ((mdata.mflags1 | 0) & 0x00000400) !== 0;
}

/* C ref: apply.c:930-993 check_leash(coordxy x, coordxy y) — after the hero
 * moves from (x,y), walk gi.invent for a worn/carried leash attached to a
 * pet and yank/choke/snap it depending on how far the pet lagged behind.
 * find_mid(otmp->leashmon, FM_FMON) is inlined here as a fmon walk (light.c
 * treats it as a macro-level helper, not a porting target of its own). */
export async function check_leash(x, y) {
    const g = game;
    const u = g.u;

    for (let otmp = g.invent; otmp; otmp = otmp.nobj) {
        if (otmp.otyp !== LEASH || otmp.leashmon === 0)
            continue;
        let mtmp = null;
        for (let m = g.fmon; m; m = m.nmon) {
            if (!DEADMONSTER(m) && m.m_id === otmp.leashmon) {
                mtmp = m;
                break;
            }
        }
        if (!mtmp) {
            impossible_cmd("leash in use isn't attached to anything?");
            otmp.leashmon = 0;
            continue;
        }
        if (dist2(u.ux, u.uy, mtmp.mx, mtmp.my)
            > dist2(x, y, mtmp.mx, mtmp.my)) {
            if (!um_dist(mtmp.mx, mtmp.my, 3)) {
                ; /* still close enough */
            } else if (otmp.cursed && !breathless(mtmp.data)) {
                if (um_dist(mtmp.mx, mtmp.my, 5)
                    || (mtmp.mhp = (mtmp.mhp | 0) - rnd(2)) <= 0) {
                    const save_pacifism = u.uconduct.killer;

                    await Your("leash chokes %s to death!", mon_nam(mtmp));
                    /* hero might not have intended to kill pet, but
                       that's the result of his actions; gain experience,
                       lose pacifism, take alignment and luck hit, make
                       corpse less likely to remain tame after revival */
                    await xkilled(mtmp, XKILL_NOMSG);
                    /* life-saving doesn't ordinarily reset this */
                    if (!DEADMONSTER(mtmp))
                        u.uconduct.killer = save_pacifism;
                } else {
                    await pline_mon(mtmp, "%s is choked by the leash!",
                              Monnam(mtmp));
                    /* tameness eventually drops to 1 here (never 0) */
                    if (mtmp.mtame && rn2(mtmp.mtame))
                        mtmp.mtame--;
                }
            } else {
                if (um_dist(mtmp.mx, mtmp.my, 5)) {
                    await pline(s_suffix(Monnam(mtmp)) + " leash snaps loose!");
                    m_unleash(mtmp, false);
                } else {
                    await You("pull on the leash.");
                    if (mtmp.data.msound !== MS_SILENT)
                        switch (rn2(3)) {
                        case 0:
                            await growl(mtmp);
                            break;
                        case 1:
                            await yelp_real(mtmp);
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

/* C ref: insight.c:3422 ustatusline() — stethoscope/probing applied to hero;
 * one-line self-probe feedback.  RNG-neutral (no rn2/rnd/d).  Builds the
 * trailing `info` clause from the hero's status conditions (none of which are
 * set for a fresh hero, matching C), then plines the "Status of ..." line.
 * The Upolyd branch uses the polymorph stats; for an un-polymorphed hero
 * (Upolyd false) it reports ulevel / uhp / uhpmax / uac. */
async function _ustatusline() {
    /* Keep the reachable async apply path on the complete C-shaped body below.
     * The exported implementation owns the detailed status conditions; this
     * wrapper exists only because apply.c's caller awaits its prompt path. */
    return ustatusline();
}

/* C apply.c:2167 tinnable(struct obj *corpse) */
/* C eat.c:3560 tin_ok — the getobj callback: the one port is js/eat.js's,
 * whose null arm reads the shared game.getobj_else (C's single global). */
async function floorfood_tin() {
    const g = game;
    const u = g.u || {};
    /* C eat.c:3591 getobj_else = 0. */
    g.getobj_else = 0;
    if (!g.iflags?.menu_requested && can_reach_floor(true)
        && !(is_pool_or_lava(u.ux, u.uy)
             && (pooleffects_Wwalking() || ((g.youmonst?.data?.mflags1 | 0) & 0x10)
                 || (_Flying() && !_Breathless())))) {
        const ux = u.ux | 0, uy = u.uy | 0;
        let otmp = g.level?.levelObjects?.[ux]?.[uy] ?? null;
        while (otmp) {
            const next = otmp.nexthere ?? null;
            /* C eat.c:3677-3679 corpsecheck arm:
             *   otmp->otyp == CORPSE && (corpsecheck == 1 || tinnable(otmp)) */
            if ((otmp.otyp | 0) === _AP_CORPSE_OTYP && tinnable(otmp)) {
                if (will_feel_cockatrice(otmp, false)) {
                    await feel_cockatrice(otmp, false);
                    return null;
                }
                const one = ((otmp.quan == null ? 1 : (otmp.quan | 0)) === 1);
                const verb = (one ? 'is' : 'are');
                const tail = one ? 'it' : 'one';
                const qbuf = await safe_qbuf_invent('', `There ${verb} `, ` here; tin ${tail}?`, otmp, doname, ansimpleoname, one ? 'something' : 'things');
                const cc = await yn_function(qbuf, 'ynq', 'n');
                if (cc === 'y') return otmp;
                if (cc === 'q') { g._resultMessage = g._ynStaleTopline = qbuf + ' [ynq] (n)'; return null; }
                g.getobj_else = (g.getobj_else | 0) + 1;
                g._pending_message = '';
            }
            otmp = next;
        }
    }
    /* C eat.c:3715 — corpsecheck == 2 → getobj(verb, tin_ok, GETOBJ_NOFLAGS). */
    const otmp = await getObjFromGetobj('tin', eat_tin_ok, GETOBJ_NOFLAGS);
    /* C eat.c:3721-3726 — the post-getobj corpsecheck re-test. */
    if (otmp && ((otmp.otyp | 0) !== _AP_CORPSE_OTYP || !tinnable(otmp))) {
        await You_cant('tin that!');
        g.getobj_else = 0;
        return null;
    }
    g.getobj_else = 0;
    return otmp;
}

const _UTK_TIN = 296; /* objects.h TIN — same literal js/mklev.js:391, js/eat.js */

/* C apply.c:2177 use_tinning_kit(struct obj *obj) — `void`; the caller's `res`
 * stays ECMD_TIME on every path, including the ones that print a refusal. */
async function use_tinning_kit(obj) {
    const g = game;
    const u = g.u || {};
    /* C apply.c:2185-2188 */
    if ((obj.spe | 0) <= 0) {
        await pline('You seem to be out of tins.');
        return;
    }
    /* C apply.c:2189-2190 */
    const corpse = await floorfood_tin();
    if (!corpse) return;
    /* C apply.c:2191-2194 — `something` is decl.c's "something". */
    if (corpse.oeaten) {
        await pline('You cannot tin something which is partly eaten.');
        return;
    }
    const mptr = permonstTemplate(corpse.corpsenm | 0);
    /* C apply.c:2196-2210 — tinning a cockatrice bare-handed. */
    if (sr_touch_petrifies_ptr(mptr) && !_uprop_active('STONE_RES') && !u.uarmg) {
        const corpse_name = an(cxname(corpse));
        let kbuf;
        if (poly_when_stoned(_hero_youmonst().data)) {
            await pline(`You tin ${corpse_name} without wearing gloves.`);
            kbuf = '';
        } else {
            await pline(`Tinning ${corpse_name} without wearing gloves is a fatal mistake...`);
            kbuf = `trying to tin ${corpse_name} without gloves`;
        }
        await instapetrify(kbuf);
    }
    /* C apply.c:2210-2217 — Riders revive before any charge is consumed. */
    if ([PM_DEATH, PM_FAMINE, PM_PESTILENCE].includes(corpse.corpsenm | 0)) {
        if (await revive_corpse(corpse))
            await verbalize('Yes...  But War does not preserve its enemies...');
        else
            await pline_The('corpse evades your grasp.');
        return;
    }
    /* C apply.c:2218-2221 */
    if (mons_cnutrit(corpse.corpsenm | 0) === 0) {
        await pline("That's too insubstantial to tin.");
        return;
    }
    /* C apply.c:2221 */
    consume_obj_charge(obj, true);
    const can = await mksobj(_UTK_TIN, false, false);
    if (can) {
        can.corpsenm = corpse.corpsenm | 0;
        can.cursed = obj.cursed;
        can.blessed = obj.blessed;
        can.owt = weight(can);
        can.known = 1;
        /* C apply.c:2229-2230 — "Mark tinned tins. No spinach allowed..." */
        set_tin_variety(can, HOMEMADE_TIN);
        if ((corpse.where | 0) === OBJ_INVENT /* carried() */) {
            if (corpse.unpaid) {
                const shkp = shop_keeper((in_rooms(u.ux, u.uy, SHOPBASE) || [])[0]);
                SetVoice(shkp, 0, 80, 0);
                await verbalize('You tin it, you bought it!');
                void shkp;
            }
            await useup(corpse);
        } else {
            if (costly_spot(corpse.ox | 0, corpse.oy | 0) && !corpse.no_charge) {
                const shkp = shop_keeper((in_rooms(corpse.ox | 0, corpse.oy | 0, SHOPBASE) || [])[0]);
                SetVoice(shkp, 0, 80, 0);
                await verbalize('You tin it, you bought it!');
                void shkp;
            }
            await useupf(corpse, 1);
        }
        await hold_another_object(can, 'You make, but cannot pick up, %s.', (await doname(can)), null);
    } else {
        await real_impossible('Tinning failed.');
    }
}

export async function use_whip(obj) {
    const g = game;
    const u = g.u = g.u || {};
    const msg_snap = 'Snap!';
    const msg_slipsfree = 'The bullwhip slips free.';
    const res = ECMD_OK;

    if (obj !== u.uwep) {
        if (await wield_tool(obj, 'lash')) {
            cmdq_add_ec(CQ_CANNED, 'doapply');
            cmdq_add_key(CQ_CANNED, obj.invlet | 0);
            return ECMD_TIME;
        }
        return res;
    }
    /* C apply.c:2972-2973 — getdir; a quitchar cancels.  js/lock.js getdir()
     * is the full port (movecmd + confdir + cmdassist). */
    if (!(await getdir(null)))
        return res | ECMD_CANCEL;

    /* C apply.c:2975-2987 — u.uswallow is out of scope here (the swallowed arm
     * only prints "There is not enough room..." below).  C calls confdir(FALSE)
     * a SECOND time here (apply.c:2980), after getdir()'s own tail call; an
     * impaired hero re-rolls the direction (rn2(8)). */
    let rx, ry, mtmp;
    if (u.uswallow) {
        mtmp = u.ustuck;
        rx = mtmp.mx;
        ry = mtmp.my;
    } else {
        confdir(false);
        rx = (u.ux | 0) + (u.dx | 0);
        ry = (u.uy | 0) + (u.dy | 0);
        if (!isok(rx, ry)) {
            await pline('You miss.');
            return res;
        }
        mtmp = m_at(rx, ry);
    }

    /* C apply.c:2989-3002 — "fake some proficiency checks". */
    let proficient = 0;
    if (Role_if(PM_ARCHEOLOGIST)) ++proficient;
    const dex = acurr(u, A_DEX);
    if (dex < 6) proficient--;
    else if (dex >= 14) proficient += (dex - 14);
    if (_uprop_active('FUMBLING')) --proficient;
    if (proficient > 3) proficient = 3;
    if (proficient < 0) proficient = 0;

    /* C apply.c:3004-3009 — swallowed / underwater arms precede u.dz. */
    if (u.uswallow) {
        await pline('There is not enough room to flick your bullwhip.');
        return ECMD_TIME;
    }
    if (_Underwater()) {
        await pline('There is too much resistance to flick your bullwhip.');
        return ECMD_TIME;
    }
    /* C apply.c:3013 — u.dz < 0: flick a bug off the ceiling. */
    if ((u.dz | 0) < 0) {
        await pline(`You flick a bug off of the ${ceiling(u.ux | 0, u.uy | 0)}.`);
        return ECMD_TIME;
    }
    /* C apply.c:3011-3018 — !u.dz and the target square is a water/lava wall. */
    if (!(u.dz | 0)) {
        const t = _levlAt(rx, ry)?.typ | 0;
        if (IS_WATERWALL(t) || t === LAVAWALL) {
            await pline('You cause a small splash.');
            if (t === LAVAWALL) await fire_damage(u.uwep, false, rx, ry);
            return ECMD_TIME;
        }
    }
    if (((u.dx | 0) === 0 && (u.dy | 0) === 0) || (u.dz | 0) > 0) {
        if (u.usteed && !rn2(proficient + 2)) {
            await pline(`You whip ${mon_nam(u.usteed)}!`);
            await kick_steed_cmd();
            return ECMD_TIME;
        }
        /* C apply.c:3026-3033 */
        const ht = _levlAt(rx, ry)?.typ | 0;
        if (is_pool_or_lava(u.ux | 0, u.uy | 0) || IS_WATERWALL(ht) || ht === LAVAWALL) {
            await pline('You cause a small splash.');
            if (flooreffects_is_lava(u.ux | 0, u.uy | 0))
                await fire_damage(u.uwep, false, u.ux | 0, u.uy | 0);
            return ECMD_TIME;
        }
        if (_uprop_active('LEVITATION') || u.usteed || _Flying()) {
            const otmp = g.level?.levelObjects?.[u.ux | 0]?.[u.uy | 0] ?? null;
            if (otmp && (otmp.otyp | 0) === THIT_CORPSE
                && ((otmp.corpsenm | 0) === 104 /* PM_HORSE */
                    || (otmp.corpsenm | 0) === 105 /* PM_WARHORSE */
                    || (otmp.corpsenm | 0) === 100 /* PM_PONY */)) {
                await pline('Why beat a dead horse?');
                return ECMD_TIME;
            }
            if (otmp && proficient) {
                await pline(`You wrap your bullwhip around ${an(await singular(otmp, _fw_xname))} on the ${surface(u.ux | 0, u.uy | 0)}.`);
                if (rnl(6) || (await pickup_object(otmp, 1, true)) < 1)
                    await pline(msg_slipsfree);
                return ECMD_TIME;
            }
        }
        const dam = Math.max(1, rnd(2) + dbon() + (obj.spe | 0));
        await pline(`You hit your ${body_part(FOOT)} with your bullwhip.`);
        /* C apply.c:3066 losehp(Maybe_Half_Phys(dam), ...) — the Master Key of
         * Thievery / Orb of Fate carry HALF_PHDAM, which halves this self-hit. */
        await losehp(flooreffects_Maybe_Half_Phys(dam), `killed ${_prayer_uhim()}self with ${g.flags.female ? 'her' : 'his'} bullwhip`, NO_KILLER_PREFIX);
        return ECMD_TIME;
    }
    /* C apply.c:3061-3063 — (Fumbling || Glib) && !rn2(5): drop the whip.
     * The rn2(5) is C's, so it must only be drawn when the guard is true. */
    if ((_uprop_active('FUMBLING') || _uprop_active('GLIB')) && !rn2(5)) {
        await pline(`The bullwhip slips out of your ${body_part(HAND)}.`);
        await dropx(obj);
        return ECMD_TIME;
    }
    /* C apply.c:3065-3122 — the TT_PIT arm. */
    whip_pit:
    if ((u.utrap | 0) && (u.utraptype | 0) === TT_PIT) {
        const tile = game.level?.at?.(rx, ry) || game.level?.locations?.[rx]?.[ry] || {};
        const boulder = sobj_at(475, rx, ry);
        const furniture = IS_FURNITURE(tile.typ | 0);
        let wrapped = boulder ? 'a boulder' : furniture ? 'something' : null;
        if (mtmp && bigmonst_cmd(mtmp.data) && canspotmon(mtmp))
            wrapped = mon_nam(mtmp);
        if (!wrapped) {
            if (mtmp) break whip_pit; // C apply.c:3102: goto whipattack.
            await pline(msg_snap);
            return ECMD_TIME;
        }
        await pline(`You wrap your bullwhip around ${wrapped}.`);
        if (proficient && rn2(proficient + 2)) {
            const landing = mtmp ? enexto_out(rx, ry, _hero_youmonst().data) : null;
            if (landing || !mtmp) {
                await pline('You yank yourself out of the pit!');
                await reset_utrap(true);
                const spot = landing || { x: rx, y: ry };
                await teleds(spot.x, spot.y, TELEDS_ALLOW_DRAG);
                g.vision_full_recalc = 1;
            }
        } else {
            await pline('The bullwhip slips free.');
        }
        if (mtmp) await wakeup(mtmp, true);
        return ECMD_TIME;
    }
    /* C apply.c:3123-3262 — whipattack: reveal / disarm / attack a monster. */
    if (mtmp) {
        let mwep = mtmp.mw || null;
        for (let o = mtmp.minvent; !mwep && o; o = o.nobj) if (o.owornmask & W_WEP_TO) mwep = o;
        if (canspotmon(mtmp) && mwep) {
            let gotit = proficient > 0 && (!_uprop_active('FUMBLING') || !rn2(10));
            const onambuf = _ia_cxname(mwep);
            let mon_hand = null;
            if (gotit) {
                mon_hand = mbodypart(mtmp, 6 /* HAND */);
                if (bimanual(mwep)) mon_hand = makeplural_objnam(mon_hand);
            }
            await pline(`You wrap your bullwhip around ${yname(mwep)}.`);
            if (gotit && mwelded(mwep)) {
                /* C apply.c:3169-3172 */
                await pline(`${mwep.quan === 1 ? 'It is' : 'They are'} welded to ${mhis_mon(mtmp)} ${mon_hand}${!mwep.bknown ? '!' : '.'}`);
                set_bknown(mwep, 1);
                gotit = false; /* can't pull it free */
            }
            if (gotit) {
                obj_extract_self(mwep);
                await possibly_unwield(mtmp, false);
                setmnotwielded(mtmp, mwep);
                const landing = rn2(proficient + 1);
                if (landing === 2) {
                    await pline(`You yank ${yname(mwep)} to the ${surface(u.ux, u.uy)}!`);
                    place_object(mwep, u.ux | 0, u.uy | 0);
                    await stackobj(mwep);
                } else if (landing === 3) {
                    await pline(`You snatch ${yname(mwep)}!`);
                    // C apply.c:3214-3237: a bare-handed petrifying corpse can kill.
                    if (mwep.otyp === THIT_CORPSE && sr_touch_petrifies_ptr(permonstTemplate(mwep.corpsenm))
                        && !u.uarmg && !_uprop_active('STONE_RES')
                        && !(poly_when_stoned(_hero_youmonst().data) && await polymon(PM_STONE_GOLEM))) {
                        const kbuf = mwep.quan === 1 ? an(onambuf) : onambuf;
                        await pline(`Snatching ${kbuf} is a fatal mistake.`);
                        place_object(mwep, u.ux, u.uy);
                        await instapetrify(kbuf);
                        obj_extract_self(mwep);
                    }
                    await hold_another_object(mwep, 'You drop %s!', (await doname(mwep)), null);
                } else {
                    /* C apply.c:3235 — onambuf = cxname(otmp) (objnam.c cxname, the
                     * appearance name "thonged club"), NOT the inventory namer. */
                    await pline(`You yank ${the(onambuf)} from ${s_suffix(mon_nam(mtmp))} ${mon_hand}!`);
                    await obj_no_longer_held(mwep);
                    place_object(mwep, mtmp.mx | 0, mtmp.my | 0);
                    await stackobj(mwep);
                }
            } else {
                await pline('The bullwhip slips free.');
            }
            await wakeup(mtmp, true);
            return ECMD_TIME;
        }
        let do_snap = true;
        const protectedShape = !!(u.uprops?.[PROT_FROM_SHAPE_CHANGERS]?.intrinsic
            || u.uprops?.[PROT_FROM_SHAPE_CHANGERS]?.extrinsic);
        /* C apply.c:3137-3148 — an unseen monster is revealed with the Blind
         * wording; otmp stays 0 on this path, so C falls through to the
         * else arm below for it too (apply.c:3240-3252). */
        if (!canspotmon(mtmp)) {
            mtmp.mundetected = 0; /* bring non-mimic hider out of hiding */
            const spotitnow = canspotmon(mtmp);
            if (spotitnow || !glyph_is_invisible_at(rx, ry)) {
                const blind = _uprop_active('BLINDED');
                await pline('%s is there that you %s.', !spotitnow ? 'A monster' : Amonnam(mtmp),
                    !blind ? 'couldn\'t see' : 'hadn\'t noticed');
                if (!spotitnow) map_invisible(rx, ry); else newsym(rx, ry);
            }
        }
        /* C apply.c:3240-3252 — the mimic / flick arm. */
        if (M_AP_TYPE(mtmp) && !protectedShape && !sensemon(mtmp)) {
            await stumble_onto_mimic(mtmp); /* C apply.c:3250 */
            do_snap = false;
        } else {
            await pline(`You flick your bullwhip towards ${mon_nam(mtmp)}.`);
        }
        /* C apply.c:3255 */
        if (proficient && await force_attack(mtmp, false))
            return ECMD_TIME;
        if (do_snap) await pline(msg_snap);
        await wakeup(mtmp, true);
        return ECMD_TIME;
    }
    /* C apply.c:3264-3266 — air and water levels. */
    if (Is_airlevel(u.uz) || Is_waterlevel(u.uz)) {
        await pline('You snap your whip through thin air.');
        return ECMD_TIME;
    }
    /* C apply.c:3268 — the ordinary flick. */
    await pline(msg_snap);
    return ECMD_TIME;
}

const _AP_GRAPPLING_HOOK_OTYP = 260; /* objects.h GRAPPLING_HOOK */

const M2_STRONG = 0x04000000; /* monflag.h */

function strongmonst(ptr) { return ((ptr?.mflags2 | 0) & M2_STRONG) !== 0; }

const Maybe_Half_Phys = flooreffects_Maybe_Half_Phys;

async function use_grapple(obj) {
    const g = game;
    const u = g.u = g.u || {};
    const res = ECMD_OK;

    /* C apply.c:3737-3740 */
    if (u.uswallow) {
        await pline("There's not enough room here to use that.");
        return res;
    }
    /* C apply.c:3742-3749 — same wield_tool idiom as use_whip/dorub above. */
    if (obj !== u.uwep) {
        if (await wield_tool(obj, 'cast')) {
            cmdq_add_ec(CQ_CANNED, 'doapply');
            cmdq_add_key(CQ_CANNED, obj.invlet | 0);
            return ECMD_TIME;
        }
        return res;
    }
    /* C apply.c:3751-3753 */
    await pline('Where do you want to hit?');
    const cc = { x: u.ux | 0, y: u.uy | 0 };
    await getpos_sethilite(display_grapple_positions, (x, y) => _grapple_can_location(x, y));
    if ((await getpos(cc, true, 'the spot to hit')) < 0)
        return res | ECMD_CANCEL;
    /* C apply.c:3760-3773 */
    const typ = uwep_skill_type();
    if (dist2(cc.x, cc.y, u.ux | 0, u.uy | 0) > _grapple_range()) {
        await pline('Too far!');
        return res;
    } else if (!cansee(cc.x, cc.y)) {
        await You("won't hit anything if you can't see that spot.");
        return res;
    } else if (!couldsee(cc.x, cc.y)) {
        await You("can't reach that spot from here.");
        return res;
    }
    /* C apply.c:3776-3811 */
    let tohit = rn2(5);
    if (typ !== P_NONE && P_SKILL(typ) >= P_SKILLED) {
        const surf = surface(cc.x, cc.y);
        const entries = [
            { acc: 'a', text: `an object on the ${surf}` },
            { acc: 'b', text: 'a monster' },
            { acc: 'c', text: `the ${surf}` },
        ];
        tohit = rn2(4);
        const picked = await tty_menu_pick_one_ext(entries, 'Aim for what?');
        if (picked !== null && picked !== undefined
            && rn2(P_SKILL(typ) > P_SKILLED ? 20 : 2))
            tohit = 'abc'.indexOf(picked) + 2 - 1;
    }
    /* C apply.c:3809-3810 */
    if (tohit === 2 || !rn2(2)) {
        const wipecnt = rnd(2);
        if (can_reach_floor(true))
            wipe_engr_at(u.ux | 0, u.uy | 0, wipecnt, false);
    }
    /* C apply.c:3813-3870 */
    switch (tohit) {
    case 0: /* Trap */
        break;
    case 1: { /* Object */
        const otmp = g.level?.levelObjects?.[cc.x]?.[cc.y] ?? null;
        if (otmp) {
            await You(`snag an object from the ${surface(cc.x, cc.y)}!`);
            await pickup_object(otmp, 1, false);
            newsym(cc.x, cc.y);
            return ECMD_TIME;
        }
        break;
    }
    case 2: { /* Monster */
        g.gb = g.gb || {};
        g.gb.bhitpos = { x: cc.x, y: cc.y };
        g.bhitpos = g.gb.bhitpos;
        const mtmp = m_at(cc.x, cc.y);
        if (!mtmp) break;
        g.notonhead = ((cc.x | 0) !== (mtmp.mx | 0) || (cc.y | 0) !== (mtmp.my | 0));
        g.gn = g.gn || {};
        g.gn.notonhead = g.notonhead;
        g.flags = g.flags || {};
        const save_confirm = g.flags.confirm;
        let mm;
        if (verysmall_cmd(mtmp.data) && !rn2(4)
            && (mm = enexto_out(u.ux | 0, u.uy | 0, null))) {
            cc.x = mm.x; cc.y = mm.y;
            g.flags.confirm = false;
            await attack_checks(mtmp, u.uwep);
            g.flags.confirm = save_confirm;
            check_caitiff(mtmp);
            await You(`pull in ${await mon_nam(mtmp)}!`);
            mtmp.mundetected = 0;
            await rloc_to(mtmp, cc.x, cc.y);
            return ECMD_TIME;
        } else if ((!bigmonst_cmd(mtmp.data)
                    && !strongmonst(mtmp.data))
                   || rn2(4)) {
            g.flags.confirm = false;
            await attack_checks(mtmp, u.uwep);
            g.flags.confirm = save_confirm;
            check_caitiff(mtmp);
            await thitmonst(mtmp, u.uwep);
            return ECMD_TIME;
        }
    }
    // FALLTHROUGH
    case 3: /* Surface */
        {
            const lev = g.level?.locations?.[cc.x]?.[cc.y];
            if ((lev && IS_AIR(lev.typ | 0)) || is_pool(cc.x, cc.y))
                await pline(`The hook slices through the ${surface(cc.x, cc.y)}.`);
            else {
                await You(`are yanked toward the ${surface(cc.x, cc.y)}!`);
                await hurtle(Math.sign(cc.x - (u.ux | 0)), Math.sign(cc.y - (u.uy | 0)), 1, false);
                await spoteffects(true);
            }
            return ECMD_TIME;
        }
    default: /* Yourself (oops!) */
        if (P_SKILL(typ) <= P_BASIC) {
            await You('hook yourself!');
            await losehp(Maybe_Half_Phys(rn1(10, 10)), 'a grappling hook', KILLED_BY);
            return ECMD_TIME;
        }
        break;
    }
    await pline(nothing_happens);
    return ECMD_TIME;
}

function _grapple_can_location(x, y) {
    const u = game.u;
    return isok(x, y) && cansee(x, y)
        && dist2(x, y, u.ux | 0, u.uy | 0) <= _grapple_range();
}

function display_grapple_positions(on_off) {
    const u = game.u;
    if (!on_off) return tmp_at(DISP_END, 0);
    tmp_at(DISP_BEAM, cmap_to_glyph(S_goodpos));
    for (let dx = -3; dx <= 3; dx++)
        for (let dy = -3; dy <= 3; dy++) {
            const x = dx + u.ux, y = dy + u.uy;
            if (_grapple_can_location(x, y) && !u_at(x, y)) tmp_at(x, y);
        }
}

export async function use_unicorn_horn(obj) {
    const u = game.u || {};
    if (obj && obj.cursed) {
        const lcount = rn1(90, 10);
        switch ((rn2(13) / 2) | 0) { /* case 6 is half as likely as the others */
        case 0: {
            const sickTimeout = _hprop(SICK) & TIMEOUT;
            await make_sick(sickTimeout ? (((sickTimeout / 3) | 0) + 1)
                                        : rn1(acurr(u, A_CON), 20),
                             xname(obj), true, SICK_NONVOMITABLE);
            break;
        }
        case 1:
            make_blinded(BlindedTimeout() + lcount, true);
            break;
        case 2: {
            const halluc = _hprop(HALLUC) && !_uprop_active('HALLUC_RES');
            if (!_hprop(CONFUSION))
                await You(`suddenly feel ${halluc ? 'trippy' : 'confused'}.`);
            await make_confused((_hprop(CONFUSION) & TIMEOUT) + lcount, true);
            break;
        }
        case 3:
            make_stunned((_hprop(STUNNED) & TIMEOUT) + lcount, true);
            break;
        case 4:
            if (_hprop(VOMITING)) await potion_vomit();
            else await make_vomiting(14, false);
            break;
        case 5:
            await make_hallucinated((_hprop(HALLUC) & TIMEOUT) + lcount, true, 0);
            break;
        case 6:
            /* make_deaf() gives no feedback when already deaf. */
            if (_hero_Deaf())
                await pline('%s', nothing_seems_to_happen);
            await make_deaf((_hprop(DEAF) & TIMEOUT) + lcount, true);
            break;
        }
        return;
    }

    /* C apply.c:2308-2318 — TimedTrouble(P): P is nonzero and carries NO bits
     * outside TIMEOUT (no FROMOUTSIDE/FROMFORM flag) → P & TIMEOUT; else 0. */
    const _timedTrouble = (p) => (p && !(p & ~TIMEOUT)) ? (p & TIMEOUT) : 0;
    const troubleList = [];
    if (_timedTrouble(_hprop(SICK))) troubleList.push(SICK);
    /* apply.c:2312-2315 — BLINDED needs TimedTrouble(HBlinded) > u.ucreamed,
     * AND (not swallowed by an engulfer that blinds on AD_BLND). */
    if (_timedTrouble(_hprop(BLINDED)) > (u.ucreamed | 0)
        && !(u.uswallow
             && attacktype_fordmg((u.ustuck && u.ustuck.data) || null, _AT_ENGL, _AD_BLND)))
        troubleList.push(BLINDED);
    if (_timedTrouble(_hprop(HALLUC))) troubleList.push(HALLUC);
    if (_timedTrouble(_hprop(VOMITING))) troubleList.push(VOMITING);
    if (_timedTrouble(_hprop(CONFUSION))) troubleList.push(CONFUSION);
    if (_timedTrouble(_hprop(STUNNED))) troubleList.push(STUNNED);
    if (_timedTrouble(_hprop(DEAF))) troubleList.push(DEAF);

    const troubleCount = troubleList.length;
    if (troubleCount === 0) {
        await pline1(nothing_happens);
        return;
    } else if (troubleCount > 1) {
        shuffle_int_array(troubleList, troubleCount);
    }

    let valLimit = rn2(d(2, (obj && obj.blessed) ? 4 : 2));
    if (valLimit > troubleCount) valLimit = troubleCount;

    let didProp = 0;
    for (let val = 0; val < valLimit; val++) {
        const idx = troubleList[val];
        switch (idx) {
        case SICK:
            await make_sick(0, null, true, SICK_ALL);
            didProp++;
            break;
        case BLINDED:
            make_blinded(u.ucreamed | 0, true);
            didProp++;
            break;
        case HALLUC:
            await make_hallucinated(0, true, 0);
            didProp++;
            break;
        case VOMITING:
            await make_vomiting(0, true);
            didProp++;
            break;
        case CONFUSION:
            // C apply.c:2367: finish the cure's pline before doapply resumes.
            await make_confused(0, true);
            didProp++;
            break;
        case STUNNED:
            make_stunned(0, true);
            didProp++;
            break;
        case DEAF:
            await make_deaf(0, true);
            didProp++;
            break;
        default:
            await real_impossible("use_unicorn_horn: bad trouble? (%d)", idx);
            break;
        }
    }

    if (didProp) {
        if (game.disp) game.disp.botl = 1;
    } else {
        await pline('%s', nothing_seems_to_happen);
    }
}

async function use_towel(obj) {
    const u = game.u || {};
    const dryingFeedback = (obj === u.uwep);
    if (!freehand()) {
        await You(`have no free ${body_part(HAND)}!`);
        return ECMD_OK;
    } else if (obj === u.ublindf) {
        await You("cannot use it while you're wearing it!");
        return ECMD_OK;
    } else if (obj.cursed) {
        switch (rn2(3)) {
        case 2: {
            const old = _hprop(GLIB) & TIMEOUT;
            make_glib(old + rn1(10, 3)); /* + 3..12 */
            await Your(`${makeplural_objnam(body_part(HAND))} `
                       + `${old ? 'are filthier than ever' : 'get slimy'}!`);
            if (is_wet_towel(obj)) await dry_a_towel(obj, -1, dryingFeedback);
            return ECMD_TIME;
        }
        case 1: {
            if (!u.ublindf) {
                const old = u.ucreamed | 0;
                u.ucreamed = old + rn1(10, 3);
                await pline(`Yecch!  Your ${body_part(FACE)} `
                            + `${old ? 'has more' : 'now has'} gunk on it!`);
                make_blinded(BlindedTimeout() + (u.ucreamed | 0) - old, true);
            } else {
                const ublindf = u.ublindf;
                const what = (ublindf.otyp | 0) === _LENSES_OTYP
                    ? 'lenses'
                    : ((obj.otyp | 0) === (ublindf.otyp | 0)) ? 'other towel' : 'blindfold';
                if (ublindf.cursed) {
                    await You(`push your ${what} `
                              + `${rn2(2) ? 'cock-eyed' : 'crooked'}.`);
                } else {
                    const savedUblindf = ublindf;
                    await You(`push your ${what} off.`);
                    await Blindf_off(ublindf);
                    await dropx(savedUblindf);
                }
            }
            if (is_wet_towel(obj)) await dry_a_towel(obj, -1, dryingFeedback);
            return ECMD_TIME;
        }
        case 0:
            break;
        }
    }

    if (_hprop(GLIB)) {
        make_glib(0);
        await You(`wipe off your ${!u.uarmg ? makeplural_objnam(body_part(HAND))
                                             : gloves_simple_name(u.uarmg)}.`);
        if (is_wet_towel(obj)) await dry_a_towel(obj, -1, dryingFeedback);
        return ECMD_TIME;
    } else if (u.ucreamed) {
        /* C apply.c:173 — incr_itimeout(&HBlinded, (-1 * (int) u.ucreamed)). */
        incr_HBlinded(-1 * (u.ucreamed | 0));
        u.ucreamed = 0;
        /* C apply.c:175; youprop.h:92 — Blinded tests intrinsic blindness
         * only, even when a worn blindfold keeps the hero Blind. */
        if (!(HBlinded() && !(u.uprops?.[BLINDED]?.blocked | 0))) {
            await pline("You've got the glop off.");
            if (!(await gulp_blnd_check())) {
                set_HBlinded(1); /* set_itimeout(&HBlinded, 1L) */
                make_blinded(0, true);
            }
        } else {
            await Your('%s feels clean now.', body_part(FACE));
        }
        if (is_wet_towel(obj)) await dry_a_towel(obj, -1, dryingFeedback);
        return ECMD_TIME;
    }

    await Your(`${body_part(FACE)} and ${makeplural_objnam(body_part(HAND))} `
               + 'are already clean.');
    return ECMD_OK;
}

const MAXLEASHED = 2; /* apply.c:762 #define MAXLEASHED 2 */

const LEASH_OTYP = 236;

export function number_leashed() {
    let n = 0;
    for (let o = game.invent; o; o = o.nobj)
        if ((o.otyp | 0) === LEASH_OTYP && (o.leashmon | 0) !== 0) n++;
    return n;
}

async function use_leash(obj) {
    const u = game.u || {};
    if (u.uswallow) {
        const ustuck = u.ustuck;
        await You_cant(!obj.leashmon
            ? `leash ${noit_mon_nam(ustuck)} from inside.`
            : ((obj.leashmon | 0) === ((ustuck && ustuck.m_id) | 0))
                ? `unleash ${noit_mon_nam(ustuck)} from inside.`
                : `unleash anything from inside ${noit_mon_nam(ustuck)}.`);
        return ECMD_OK;
    }
    if (!obj.leashmon && number_leashed() >= MAXLEASHED) {
        await You('cannot leash any more pets.');
        return ECMD_OK;
    }

    /* C cmd.c:3931-3951 get_adjacent_loc(NULL, NULL, u.ux, u.uy, &cc), inlined:
     * getdir() fail -> Never_mind, ECMD_OK; else compute cc, isok fail (no
     * emsg here) -> ECMD_OK. */
    if (!(await getdir(null))) {
        await pline1('Never mind.');
        return ECMD_OK;
    }
    const ccx = (u.ux | 0) + (u.dx | 0), ccy = (u.uy | 0) + (u.dy | 0);
    if (!isok(ccx, ccy)) return ECMD_OK;

    if (u_at(ccx, ccy)) {
        if (u.usteed && (u.dz | 0) > 0) {
            /* C apply.c:800-803 — the mounted steed occupies the hero's
             * square when the downward direction is selected. */
            await use_leash_core(obj, u.usteed, ccx, ccy, true);
            return ECMD_TIME;
        }
        await pline('Leash yourself?  Very funny...');
        return ECMD_OK;
    }

    /* From here, a move is always used (apply.c:807 comment). */
    const mtmp = m_at(ccx, ccy);
    if (!mtmp) {
        await pline('There is no creature there.');
        unmap_invisible(ccx, ccy);
        return ECMD_TIME;
    }
    await use_leash_core(obj, mtmp, ccx, ccy, canspotmon(mtmp));
    return ECMD_TIME;
}

const _M1_NOLIMBS = 0x00006000, _M1_NOHEAD = 0x00008000, _M1_UNSOLID = 0x00100000;

function _lsh_unsolid(ptr) { return ((ptr.mflags1 | 0) & _M1_UNSOLID) !== 0; }

function _lsh_nolimbs(ptr) { return ((ptr.mflags1 | 0) & _M1_NOLIMBS) === _M1_NOLIMBS; }

function _lsh_has_head(ptr) { return ((ptr.mflags1 | 0) & _M1_NOHEAD) === 0; }

function _lsh_leashable(mtmp) {
    return (mtmp.mnum | 0) !== PM_LONG_WORM
        && !_lsh_unsolid(mtmp.data)
        && (!_lsh_nolimbs(mtmp.data) || _lsh_has_head(mtmp.data));
}

/* C ref: do_name.c:1034 l_monnam(mtmp) — x_monnam(mtmp, ARTICLE_NONE, ...).
 * No port anywhere in this tree; Monnam (imported, mcastu.js) is this file's
 * existing x_monnam-family port and gives ARTICLE_THE ("the kitten"/"Fluffy"),
 * so stripping a leading "The "/"the " reproduces l_monnam's no-article form
 * for the unnamed case and is a no-op for a given-name pet (mon_nam already
 * omits the article for those — the same reason js/cmd.js:19700's Shk_Your
 * neighbour gives for its own simplification). */
function _lsh_lmonnam(mtmp) {
    return _l_monnam(mtmp);
}

/* C ref: apply.c:821-831 use_leash_core checks the remembered levl glyph;
 * a previously marked unseen monster can be leashed without spotting it. */
async function use_leash_core(obj, mtmp, ccx, ccy, spotmon) {
    if (!spotmon
        && game.level.at(ccx, ccy).remembered_glyph?.cls !== GLYPHCLS_INVIS) {
        await You(`fail to ${obj.leashmon ? 'un' : ''}leash something.`);
        map_invisible(ccx, ccy);
        return;
    }
    if (!mtmp.mtame) {
        await pline(`${Monnam(mtmp)} ${!obj.leashmon ? 'cannot be' : 'is not'} leashed!`);
        return;
    }
    if (!obj.leashmon) {
        if (mtmp.mleashed) {
            await pline(`This ${spotmon ? _lsh_lmonnam(mtmp) : 'creature'} is already leashed.`);
        } else if (_lsh_unsolid(mtmp.data)) {
            await pline('The leash would just fall off.');
        } else if (_lsh_nolimbs(mtmp.data) && !_lsh_has_head(mtmp.data)) {
            await pline(`${Monnam(mtmp)} has no extremities the leash would fit.`);
        } else if (!_lsh_leashable(mtmp)) {
            /* C: lmonnam gets " tail" appended when cc != mtmp's own square
             * (the not-on-its-own-square long-worm case), s_suffix'd. */
            let lmonnam = _lsh_lmonnam(mtmp);
            if (ccx !== (mtmp.mx | 0) || ccy !== (mtmp.my | 0))
                lmonnam = `${s_suffix(lmonnam)} tail`;
            await pline(`The leash won't fit onto ${spotmon ? 'your ' : ''}${lmonnam}.`);
        } else {
            await You(`slip the leash around ${spotmon ? 'your ' : ''}${_lsh_lmonnam(mtmp)}.`);
            mtmp.mleashed = 1;
            obj.leashmon = mtmp.m_id | 0;
            mtmp.msleeping = 0;
            update_inventory();
        }
        return;
    }
    /* obj.leashmon set: unleashing arm. */
    if ((obj.leashmon | 0) !== (mtmp.m_id | 0)) {
        await pline('This leash is not attached to that creature.');
    } else if (obj.cursed) {
        await pline_The('leash would not come off!');
        set_bknown(obj, 1);
    } else {
        mtmp.mleashed = 0;
        obj.leashmon = 0;
        update_inventory();
        await You(`remove the leash from ${spotmon ? 'your ' : ''}${_lsh_lmonnam(mtmp)}.`);
    }
}

/* C ref: apply.c:2584-2600 grease_ok — getobj callback for the nested "grease
 * what?" prompt use_grease raises. */
async function _grease_ok(obj) {
    if (!obj) return GETOBJ_SUGGEST;
    if ((obj.oclass | 0) === 12 /* COIN_CLASS */) return GETOBJ_EXCLUDE;
    if (inaccessible_equipment(obj, null, false)) return GETOBJ_EXCLUDE_INACCESS;
    return GETOBJ_SUGGEST;
}

/* C ref: apply.c:2603-2653 use_grease(struct obj *obj). */
async function use_grease(obj) {
    const u = game.u || {};
    if (_hprop(GLIB)) {
        await pline(`${_objnam_Tobjnam(obj, 'slip')} from your ${_ul_fingers_or_gloves(false)}.`);
        await dropx(obj);
        return ECMD_TIME;
    }
    if ((obj.spe | 0) > 0) {
        if (((obj.cursed | 0) || _uprop_active('FUMBLING')) && !rn2(2)) {
            consume_obj_charge(obj, true);
            await pline(`${_objnam_Tobjnam(obj, 'slip')} from your ${_ul_fingers_or_gloves(false)}.`);
            await dropx(obj);
            return ECMD_TIME;
        }
        const otmp = await getObjFromGetobj('grease', _grease_ok, GETOBJ_PROMPT);
        if (!otmp) return ECMD_CANCEL;
        if (!otmp.hands && inaccessible_equipment(otmp, 'grease', false)) return ECMD_OK;
        consume_obj_charge(obj, true);
        const oldglib = _hprop(GLIB) & TIMEOUT;
        if (!otmp.hands) {
            await You(`cover ${yname(otmp)} with a thick layer of grease.`);
            otmp.greased = 1;
            if ((obj.cursed | 0) && !_hero_verysmall_or_nohands_nohands_only()) {
                make_glib(oldglib + rn1(6, 10)); /* + 10..15 */
                await pline(`Some of the grease gets all over your ${_ul_fingers_or_gloves(true)}.`);
            }
        } else {
            make_glib(oldglib + rn1(11, 5)); /* + 5..15 */
            await You(`coat your ${_ul_fingers_or_gloves(true)} with grease.`);
        }
    } else {
        if (obj.known)
            await pline(`${_objnam_Tobjnam(obj, 'are')} empty.`);
        else
            await pline(`${_objnam_Tobjnam(obj, 'seem')} to be empty.`);
    }
    update_inventory();
    return ECMD_TIME;
}

/* C ref: apply.c:4527-4560 flip_coin() */
async function flip_coin(obj) {
    const g = game;
    let otmp = obj;
    let lose_coin = false;
    await You('flip %s.', an(await singular(obj, _fw_xname)));
    if (_Underwater()) {
        await pline('It tumbles away.');
        lose_coin = true;
    } else if (_uprop_active('GLIB') || _uprop_active('FUMBLING')
               || (acurr(g.u, A_DEX) < 10 && !rn2(acurr(g.u, A_DEX)))) {
        await pline('It slips between your %s.', fingers_or_gloves(false));
        lose_coin = true;
    }
    if (lose_coin) {
        if (otmp.quan > 1) otmp = await splitobj(otmp, 1);
        await dropx(otmp);
        return ECMD_TIME;
    }
    if (_uprop_active('HALLUC')) {
        await pline(rn2(100) ? 'Wow, a double header!'
                              : 'The coin miraculously lands on its edge!');
    } else {
        await pline('It comes up %s.', rn2(2) ? 'heads' : 'tails');
    }
    return ECMD_TIME;
}

const _APPLY_EUCALYPTUS_LEAF_OTYP = 276;

export async function doapply() {
    const g = game;
    const u = g.u || {};
    if (_hero_verysmall_or_nohands_nohands_only()) {
        await pline("You aren't able to use or apply tools in your current form.");
        g.context = g.context || {};
        g.context.move = 0;   /* C ECMD_OK */
        return ECMD_OK;
    }
    if (check_capacity(null)) {
        g.context = g.context || {};
        g.context.move = 0;
        return ECMD_OK;
    }
    /* C ref: apply.c:4153 apply_ok — classify an invent object for the
     * "use or apply" getobj prompt.  Returns 'suggest' for the SUGGEST set
     * (its invlet is listed in the prompt) or '' otherwise. */
    const _apply_ok_obj = (obj) => {
        if (!obj) return '';
        const oc = obj.oclass | 0;
        const otyp = (typeof obj.otyp === 'number') ? (obj.otyp | 0) : null;
        /* all tools, all wands, all spellbooks (apply.c:4160-4162) */
        if (oc === OCLASS_TOOL || oc === OCLASS_WAND || oc === OCLASS_SPBOOK)
            return 'suggest';
        /* C apply.c:4163-4166 — COIN_CLASS → DOWNPLAY (not listed; flipping
         * coins is a minor easter egg the prompt doesn't advertise). */
        if (oc === OCLASS_COIN)
            return 'downplay';
        /* certain weapons: pick-axe / axe / polearm / bullwhip (apply.c:4170) */
        if (oc === OCLASS_WEAPON && _apply_weapon_suggested(obj))
            return 'suggest';
        /* C apply.c:4173-4182 — POTION_CLASS: an unidentified potion is
         * DOWNPLAYed (applicable but not suggested); the only suggested one is
         * a DISCOVERED potion of oil. */
        if (oc === _APPLY_POTION_CLASS) {
            if (!(obj.dknown | 0) || !_oc_name_known(otyp))
                return 'downplay';
            if (otyp === _APPLY_POT_OIL)
                return 'suggest';
        }
        if (otyp === _APPLY_CREAM_PIE || otyp === _APPLY_EUCALYPTUS_LEAF
            || otyp === _LUMP_OF_ROYAL_JELLY)
            return 'suggest';
        /* C apply.c:4190-4191 — a hallucinated banana is DOWNPLAYed, never
         * suggested.  Hallucination IS readable from here (_uprop_active,
         * already used elsewhere in this file) — the arm was previously
         * skipped as "inert" on a stale premise; wired now. */
        if (otyp === THIT_BANANA && _uprop_active('HALLUC'))
            return 'downplay';
        if (is_graystone(obj)) {
            if (!(obj.dknown | 0))
                return 'suggest';
            if (otyp !== _TOUCHSTONE
                && (_oc_name_known(_TOUCHSTONE) || _oc_name_known(otyp)))
                return '';  /* GETOBJ_EXCLUDE_SELECTABLE */
            return 'suggest';
        }
        /* C apply.c:4209 — GETOBJ_EXCLUDE_SELECTABLE: selectable if typed, but
         * never listed in the prompt. */
        return '';
    };
    const _APPLY_EUCALYPTUS_LEAF = 276, _APPLY_CREAM_PIE = 287;
    const _APPLY_POT_OIL = 321, _APPLY_POTION_CLASS = 8;
    /* C objects[otyp].oc_name_known — the discoveries flag.  This port keeps it
     * in game._oc_name_known, written by js/o_init.js:336 (discover_object).
     * Absent entry = not discovered, which is C's DOWNPLAY answer, so this can
     * never ADD a letter C does not list. */
    const _oc_name_known = (otyp) =>
        otyp != null && !!(g._oc_name_known && g._oc_name_known[otyp]);
    /* C invent.c:1861-1914: candidates come only from gi.invent;
     * an empty inventory supplies no suggested or downplayed objects. */
    /* C invent.c:1856-1857 getobj: `if (!flags.invlet_constant) reassign();`
     * before the candidate letters are collected (!fixinv re-letters the pack
     * in chain order, so freed letters close up). */
    if (!_invlet_constant()) reassign();
    let toolSlots = '';
    /* C invent.c:1878-1884 — GETOBJ_DOWNPLAY items are pulled OUT of the
     * suggested set into `altlets` and set `forceprompt` TRUE, so a hero
     * carrying nothing but downplayed items (e.g. only a hallucinated
     * banana) still gets the real prompt below rather than the "nothing to
     * X" cancel — the suggested-count going to zero is not by itself enough. */
    let altlets = '', forceprompt = false;
    if (g.invent) {
        for (const o of sortloot_invlet_chain(g.invent)) { /* invent.c:1861 SORTLOOT_INVLET */
            const verdict = _apply_ok_obj(o);
            if (verdict === 'suggest')
                toolSlots += String.fromCharCode(o.invlet);
            else if (verdict === 'downplay') {
                forceprompt = true;
                altlets += String.fromCharCode(o.invlet);
            }
        }
    }
    /* C ref: invent.c:1908 — compactify the suggested-invlet run when >5. */
    const toolLets = toolSlots.length > 5 ? compactify(toolSlots) : toolSlots;
    const qbuf = toolSlots.length > 0
        ? `What do you want to use or apply? [${toolLets} or ?*]`
        : 'What do you want to use or apply? [*]';
    if (toolSlots.length === 0 && !forceprompt) {
        /* No applicable tools known.
         * C ref: invent.c:1913-1914 — getobj's own "nothing to X" message
         * (`You("don't have anything %sto %s.", ...)`) returns NULL, and
         * apply.c:4227-4228 `if (!obj) return ECMD_CANCEL;` turns that into
         * ECMD_CANCEL, not ECMD_OK (a prior comment here claimed ECMD_OK;
         * false — getobj's null return is always ECMD_CANCEL at this site). */
        await pline("You don't have anything to use or apply.");
        g.context.move = 0;
        return ECMD_CANCEL;
    }
    /* C ref: invent.c:1916 getobj for(;;) — re-prompt on an invlet that isn't
     * in inventory (invent.c:2058 You("don't have that object.") then
     * `continue`).  Loops until a valid invlet, ESC/quitchars, or a menu char
     * is read. */
    let itemKey, itemCh;
    let selObj = null;
    let viaInvMenu = false;
    let answeredApplyPrompt = null;
    let queuedItemKey = 0;
    {
        const queued = cmdq_peek(g.gi?.in_doagain ? CQ_REPEAT : CQ_CANNED);
        if (queued && queued.typ === CMDQ_KEY) {
            cmdq_pop();
            queuedItemKey = queued.key | 0;
        }
    }
    for (;;) {
        const queuedSelection = !!queuedItemKey;
        if (queuedItemKey) {
            itemKey = queuedItemKey;
            queuedItemKey = 0;
        } else if (g.iflags?.force_invmenu && !g.in_doagain) {
            /* C invent.c:1922-1930: enter the menu without a yn_function read. */
            itemKey = (toolSlots || altlets) ? 63 : 42;
        } else {
            /* A counted `N a` re-enters rhack (allmain.c:595-599) with no parse(),
             * so the previous apply's result line is still unacknowledged when
             * this getobj prompt is drawn: update_topl more()s it first. */
            if (g._cmdRepeatNoKey) {
                g._cmdRepeatNoKey = false;
                const standing = g._pending_message || g._resultMessage;
                if (standing && !g._topl_win_stop) {
                    const release = use_last_flush_snapshot();
                    try { await force_more(standing); } finally { release(); }
                }
            }
            g._pending_message = qbuf;
            /* C topl.c:421 tty_yn_function -> custompline() -> pline.c:282 files
             * "prompt " in gp.prevmsg, so a later Norep() of the same text as the
             * message BEFORE the prompt (makemon.c:1492) is not read as a repeat. */
            g._prevmsg = qbuf + ' ';
            await flush_screen(1);
            set_cursor(qbuf.length + 1, 0);
            /* C topl.c:537-539 — tty_yn_function rewrites gt.toplines as
             * prompt + key2txt(q), and that is the history entry. */
            const _sh = g._topl_suppress_history;
            g._topl_suppress_history = true;
            let itemRaw;
            try { itemRaw = game.iflags?.debug_fuzzer ? await readchar() : await nhgetch(); /* C: getobj's yn_function nhgetch */ }
            finally { g._topl_suppress_history = _sh; }
            itemKey = typeof itemRaw === 'number' ? itemRaw : (itemRaw?.charCodeAt(0) ?? 0);
            game._toplEmptyAfterSuppress = false; /* topl.c:537-539 */
            putmsghistory(qbuf + ' ' + key2txt(itemKey & 0xff), false);
            /* topl.c:547-549 clears a prompt that wrapped onto another row. */
            answeredApplyPrompt = topl_park_cursor(null, qbuf + ' ')[1] === 0 ? qbuf : null;
        }
        itemCh = String.fromCharCode(itemKey);
        if (itemKey >= 48 /* '0' */ && itemKey <= 57 /* '9' */) {
            if (g.iflags?.debug_fuzzer) { /* topl.c:209 more() returns: no page */
                await pline('No count allowed with this command.');
                continue;
            }
            const moreMsg = 'No count allowed with this command.--More--';
            const _showMore = async () => {
                g._pending_message = moreMsg;
                await flush_screen(1);
                set_cursor(moreMsg.length, 0);
            };
            await _showMore();
            await await_topl_more_dismiss(_showMore);
            continue;
        }
        if (itemKey === 27 /* ESC */ || itemKey === 32 /* ' ' */
            || itemKey === 13 /* CR */ || itemKey === 10 /* LF */) {
            await getobj_never_mind(qbuf);
            /* C ref: apply.c:4230 — getobj returned NULL → ECMD_CANCEL (no turn). */
            g.context.move = 0;
            return ECMD_CANCEL;
        }
        /* C invent.c:1955-1959: mime only interactive hands; queued keys return at 1826. */
        if (itemKey === 45) {
            if (!queuedSelection) await mime_action('use or apply');
            else cmdq_clear(CQ_CANNED);
            g.context.move = 0;
            return ECMD_CANCEL;
        }
        /* C invent.c:1960-1999 `redo_menu` — '?'/'*' are not invlets; C pops
         * display_pickinv and adopts its answer as ilet before the invent walk at
         * invent.c:2002.  getobj's `altlets` (apply_ok's GETOBJ_DOWNPLAY set:
         * coins, undiscovered potions, a hallucinated banana — apply.c:4166/4178/
         * 4191) IS reachable here: `forceprompt` (set above whenever any item is
         * downplayed) can carry toolSlots.length === 0 past the early-cancel, so
         * a '?' with nothing suggested falls back to exactly this altlets set
         * (invent.c:1969), matching a hero carrying only downplayed items. */
        if (itemKey === 63 /* '?' */ || itemKey === 42 /* '*' */) {
            answeredApplyPrompt = null; /* display_pickinv clears WIN_MESSAGE */
            itemKey = await getobj_redo_menu(itemKey, toolSlots, altlets, null,
                                             { word: 'use or apply', allownone: false, buf: '' });
            viaInvMenu = true; /* the menu window wiped the answered prompt off row 0 */
            if (itemKey === 0 && g.iflags?.force_invmenu) { /* invent.c:1983 oneloop */
                g.context.move = 0;
                return ECMD_CANCEL;
            }
            /* invent.c:1989-1993 — ESC: "Never mind." (already plined) → NULL →
             * apply.c:4229-4230 ECMD_CANCEL, no turn. */
            if (itemKey === 27) {
                g.context.move = 0;
                return ECMD_CANCEL;
            }
            itemCh = String.fromCharCode(itemKey);
            /* invent.c:1982-1986 — no selection → re-prompt (loop top re-renders). */
            if (itemKey === 0) continue;
        }
        /* C invent.c:2049: interactive getobj dirties status before checking
         * the selected object. Queued selections return earlier (1826), and
         * hands return before this write (1955-1959). */
        if (!queuedSelection && itemCh !== '-')
            g.disp.botl = 1;
        /* Resolve the selected object in gi.invent (C invent.c:2003-2062). */
        selObj = null;
        /* '?'/'*' were consumed by the redo_menu arm above and itemCh is now a
         * real invlet; only HANDS_SYM still bypasses the invent walk here. */
        if (g.invent && itemCh !== '-') {
            for (let o = g.invent; o; o = o.nobj) {
                if ((o.invlet | 0) === (itemKey | 0)) { selObj = o; break; }
            }
            if (!selObj && queuedSelection) {
                /* C invent.c:1817-1818,1827 — a queued key naming no object:
                 * cmdq_clear(CQ_CANNED), return NULL, no message. */
                cmdq_clear(CQ_CANNED);
                g.context.move = 0;
                return ECMD_CANCEL;
            }
            if (!selObj) {
                if (g.iflags?.debug_fuzzer) { /* topl.c:209 more() returns: no page */
                    await pline("You don't have that object.");
                    continue;
                }
                const moreMsg = "You don't have that object.--More--";
                const _showMore = async () => {
                    g._pending_message = moreMsg;
                    await flush_screen(1);
                    set_cursor(moreMsg.length, 0);
                };
                await _showMore();
                /* C ref: getline.c:230-257 xwaitforspace — only space/CR/LF/ESC
                 * page this; any other key is consumed and re-loops. */
                await await_topl_more_dismiss(_showMore);
                continue; /* C ref: invent.c:2062 — re-prompt. */
            }
        }
        /* C invent.c:2050-2053 — save the selection for ^A, not during doagain. */
        if (!queuedSelection && !g.gi?.in_doagain && itemCh !== '-')
            cmdq_add_key(CQ_REPEAT, itemKey);
        break;
    }
    /* C ref: apply.c:4232-4234 — if (!retouch_object(&obj, FALSE))
     * return ECMD_TIME; touch_artifact may blast the hero (artifact.c:951). */
    if (selObj && !(await retouch_object_hero(selObj, false))) {
        g.context.move = 1;
        return ECMD_TIME;
    }
    /* C ref: apply.c:4236-4237 — WAND_CLASS → do_break_wand(obj). */
    if (selObj && (selObj.oclass | 0) === OCLASS_WAND) {
        return await _doapply_break_wand(selObj);
    }
    /* C ref: apply.c:4238-4239 — SPBOOK_CLASS → flip_through_book(obj). */
    if (selObj && (selObj.oclass | 0) === OCLASS_SPBOOK) {
        const res = await flip_through_book(selObj);
        g.context.move = (res === 1 /* ECMD_TIME */) ? 1 : 0;
        return res;
    }
    /* C ref: apply.c:4240-4241 — COIN_CLASS → flip_coin(obj), before the otyp switch. */
    if (selObj && (selObj.oclass | 0) === OCLASS_COIN) {
        const res = await flip_coin(selObj);
        g.context.move = (res & ECMD_TIME) ? 1 : 0;
        return res;
    }
    /* C ref: apply.c:4292-4294 — PICK_AXE / DWARVISH_MATTOCK → use_pick_axe(obj).
     * use_pick_axe builds the dig-direction list and getdir's the direction; the
     * dig occupation (dig.c dig()) then accumulates effort across turns and makes
     * the pit (digactualhole).  Route by OBJECT TYPE (general; all roles). */
    /* apply.c:4409-4419 default case: is_axe(obj) also routes to use_pick_axe
     * (dig.c:1090-1151, verb "chop").  is_axe (obj.h:218) = WEAPON/TOOL class with
     * oc_skill == P_AXE. */
    if (selObj && (is_pick(selObj)
        || (((selObj.oclass | 0) === OCLASS_WEAPON || (selObj.oclass | 0) === OCLASS_TOOL)
            && _oc_skill(selObj) === _P_AXE))) {
        /* C dig.c:1100-1109 use_pick_axe — when the pick-axe is NOT the current
         * weapon, wield it first: wield_tool() → (pick-axe is uswapwep) →
         * doswapweapon() (wield.c:457) makes it uwep, prints the new uwep prinv
         * "(weapon in right hand)" and the displaced uswapwep prinv
         * "(alternate weapon; not wielded)", and use_pick_axe re-queues doapply
         * for next turn (cmdq) returning ECMD_TIME — the wield consumes a turn.
         * On the re-run (pick-axe now uwep) it getdir's the dig direction.
         *
         * We fold the whole sequence into this single doapply call, reading the
         * two --More-- dismiss keys + the getdir key as they arrive, and driving
         * the wield turn's per-turn world block between the --More-- prompts (the
         * C trace places turn 6's block there).  The wield/swap is RNG-free.
         *
         * The "not uwep" wield happens iff the pick-axe is not already the
         * wielded weapon (general: any role applying a non-wielded pick-axe). */
        const u = g.u || (g.u = {});
        /* C ref: prop.h:110-112 — W_WEP=0x100, W_QUIVER=0x200, W_SWAPWEP=0x400. */
        const W_WEP = 0x100, W_SWAPWEP = 0x400;
        const needWield = ((selObj.owornmask | 0) & W_WEP) === 0;
        if (needWield) {
            /* C dig.c:1100-1109, wield.c:694-727: every wield refusal returns
             * without spending a turn, queuing apply, or asking a direction.
             * Let wield_tool emit the first applicable refusal in C order. */
            if (((selObj.owornmask | 0) & (W_ARMOR | W_ACCESSORY))
                || (u.uwep && welded(u.uwep))
                || _wt_cantwield()
                || (u.uarms && _wt_bimanual(selObj))) {
                await wield_tool(selObj, 'swing');
                return ECMD_OK;
            }
            /* C wield.c — find the current uwep (the displaced weapon).  Walk the
             * invent chain for the W_WEP-worn object. */
            let oldwep = null;
            for (let o = g.invent; o; o = o.nobj) {
                if (((o.owornmask | 0) & W_WEP) !== 0) { oldwep = o; break; }
            }
            /* C wield.c:732-745 wield_tool — only a pick-axe that IS uswapwep goes
             * through doswapweapon(); otherwise `You("now wield %s.", doname(obj))`
             * (doname BEFORE setuwep, so no "(weapon in right hand)") + setuwep,
             * and the old weapon becomes uswapwep only under flags.pushweapon. */
            /* C wield.c:730-731: unquiver before naming or wielding the tool. */
            if (u.uquiver && _wt_sameObj(u.uquiver, selObj))
                await setuqwep(null);
            const wasSwap = ((selObj.owornmask | 0) & W_SWAPWEP) !== 0;
            /* C wield.c:735 wield_tool -> doswapweapon() -> ready_weapon(oldswap) runs
             * retouch_object() (wield.c:191) before the swap: an artifact tool in the
             * alternate slot (Cleaver/Snickersnee) draws touch_artifact's rn2(4) here. */
            if (wasSwap && selObj.oartifact && !(await retouch_object_hero(selObj, false))) {
                g.context.move = 1;
                return ECMD_OK;
            }
            /* C wield.c:740-742 wield_tool: will_weld(obj) → ready_weapon(obj), whose
             * weld arm (wield.c:196-204) prints "<The> <obj> welds itself to your
             * hand!" and sets bknown BEFORE setuwep — no "You now wield" line. */
            const welds = !wasSwap && will_weld(selObj);
            const plainMsg = (wasSwap || welds) ? null : `You now wield ${await doname(selObj)}.`;
            if (welds) await _wt_ready_weapon(selObj);
            /* C wield.c:225 prinv() runs before setuwep(), so objnam.c:1561's
             * twoweap_primary (obj == uwep && u.twoweap) is still false here. */
            const _wornPhrase = _wep_worn_phrase(selObj,
                (u.uhandedness === RIGHT_HANDED) ? 'right' : 'left');
            /* C wield.c:477,487,745: use the setters so worn.c:106 also
             * removes the displaced artifact's intrinsics (e.g. warning). */
            if (wasSwap) await setuswapwep(null);
            // Apply that classification through setuwep below, after the message.
            /* C wield.c:225 prinv() → objnam.c:1578-1595: derive the wielded
             * phrase from body_part(HAND), bimanual(), and URIGHTY, just as
             * ready_weapon does for an explicitly wielded weapon. */
            /* C wield.c:196-211 via doswapweapon (wield.c:480): a swapped-in weapon
             * that will weld reports the weld line instead of the prinv line. */
            let _swapWeldMsg = null;
            if (wasSwap && will_weld(selObj)) {
                const _base = xname(selObj);
                const _art = !_base.startsWith('The ') && The(_base).startsWith('The ') ? 'The ' : '';
                const _hand = (u.uhandedness === RIGHT_HANDED) ? 'right' : 'left';
                _swapWeldMsg = `${_art}${aobjnam(selObj, 'weld')} ${(selObj.quan ?? 1) === 1 ? 'itself' : 'themselves'} to your ${_wt_bimanual(selObj) ? makeplural_objnam(body_part(HAND)) : `dominant ${_hand} ${body_part(HAND)}`}!`;
                set_bknown(selObj, 1);
            }
            let msg1 = `${_swapWeldMsg ?? plainMsg ?? (await _weapon_prinv_line(selObj,
                _wornPhrase) + '.')}--More--`;
            /* C wield.c:226-232 ready_weapon: prinv leaves its line on the topline
             * and setuwep() then runs; the displaced artifact's plines (Sting_effects
             * "Sting stops quivering.", via worn.c:106) join it, so the first --More--
             * pages both (topl.c:262-265). */
            let _swapSetDone = false, _swapExtra = '';
            if (wasSwap && _swapWeldMsg === null) {
                const _base = msg1.slice(0, -8);
                g._pending_message = _base;
                await setuwep(selObj);
                _swapSetDone = true;
                if (g._pending_message.startsWith(_base + '  ') && g._pending_message.length >= TOPL_LIMIT) {
                    _swapExtra = g._pending_message.slice(_base.length + 2);
                    msg1 = `${_base}--More--`;
                } else msg1 = `${g._pending_message}--More--`;
            }
            const _showMsg1 = async (m = msg1) => {
                g._pending_message = m;
                await flush_screen(1);
                set_cursor(m.length, 0);
            };
            if (!wasSwap) {
                if (plainMsg !== null) {
                    pline_flush_point();
                    g._pending_message = plainMsg;
                }
            } else {
                await _showMsg1();
                await await_topl_more_dismiss(_showMsg1);
                if (_swapExtra) {
                    const _em = `${_swapExtra}--More--`;
                    await _showMsg1(_em);
                    await await_topl_more_dismiss(() => _showMsg1(_em));
                }
            }
            if (!_swapSetDone) await setuwep(selObj);
            /* C wield.c:743 — `flags.pushweapon && oldwep && uwep != oldwep`:
             * a bare-handed hero leaves uswapwep alone. */
            if (wasSwap || (g.flags?.pushweapon && oldwep)) await setuswapwep(oldwep);
            if ((selObj.oclass | 0) !== OCLASS_WEAPON) g.unweapon = true;
            /* C wield.c:108-112,122-123 setuwep(): gaining or losing Ogresmasher's
             * Con bonus flags the status line, AFTER the "You now wield" pline
             * (wield.c:744 precedes setuwep) so that pline's flush leaves the
             * old status for the next flush (encumber_msg's) to repaint. */
            if (is_art(selObj, ART_OGRESMASHER) || is_art(oldwep, ART_OGRESMASHER))
                g.disp.botl = true;
            /* C ref: wield_tool() prints BOTH prinv lines (new uwep + displaced
             * uswapwep) onto the topline before use_pick_axe returns ECMD_TIME, so
             * BOTH --More-- pages render against the PRE-moveloop world (the dog at
             * its turn-5 position).  The wield-turn's per-turn world block (the C
             * trace's turn-6 movemon block, recorded in the SECOND --More--'s rng
             * slice) only fires AFTER both pages are dismissed — i.e. after the
             * moveloop runs once rhack returns ECMD_TIME.  Render the second page
             * first; advance the world block after its dismiss key. */
            if (wasSwap) {
            /* C wield.c:488-491 — setuswapwep(oldwep); a hero with no old primary has
             * no uswapwep, so C says You("have no secondary weapon readied."). */
            const msg2 = oldwep
                ? `${await _prinv_line(oldwep, `alternate weapon${((oldwep.quan ?? 1) | 0) === 1 ? '' : 's'}; not wielded`)}--More--`
                : 'You have no secondary weapon readied.--More--';
            g._pending_message = msg2.slice(0, -'--More--'.length);
            /* topl.c more():232-235 — an ESC on page #1 set WIN_STOP at more()
             * time; msg2 is the pline that raised it and is still drawn (skip
             * was sampled before), but everything the wield turn prints after
             * it ("The jackal bites!") is swallowed.  The port's armed bit
             * would instead let that next message through. */
            if (g._topl_win_stop_armed) {
                g._topl_win_stop_armed = false;
                g._topl_win_stop = true;
                g._topl_win_stop_buf = g._pending_message;
            }
            }
            /* C dig.c:1100-1107 use_pick_axe — after wield_tool the second pass is
             * a CANNED doapply (+ invlet) queued for next turn; stop_occupation()
             * (allmain.c:695, e.g. from a monster attack this turn) clears it. */
            cmdq_add_ec(CQ_CANNED, 'doapply');
            cmdq_add_key(CQ_CANNED, selObj.invlet | 0);
            /* C cmd.c:3820-3825 — ECMD_TIME from a command other than dokick resets
             * gk.kickedloc BEFORE movemon, so pets stop avoiding the kicked square. */
            g.kickedloc.x = 0;
            g.kickedloc.y = 0;
            /* C tty: the wield turn's movemon only updates gbuf (show_glyph);
             * the canned doapply -> getdir prompt never reaches parse()'s
             * flush_screen, so the getdir --More-- freezes the map as of the
             * LAST flush, before the pet moved.  Remember that frame. */
            g._seerMapSeq0 = g._seerMapSeq | 0;
            const _preWorldFrame = g._lastFlushFrame
                ? { cells: g._lastFlushFrame.cells, moves: g._lastFlushFrame.moves,
                    epoch: g._lastFlushFrame.epoch } : null;
            /* C allmain.c:208 — the wield turn's do-loop opens with encumber_msg(),
             * so a weight/capacity change from the wield itself (Ogresmasher's
             * Con bonus lost) is reported before the monsters move. */
            encumber_msg_sync();
            /* The wield consumed a turn (ECMD_TIME); its banked per-turn world
             * block fires now, through the same fastforward engine the moveloop
             * head uses.  moves++ (the wield turn), umovement -= NORMAL_SPEED, run
             * the generic per-turn block.  RNG-order preserved: the prinv lines and
             * --More-- dismisses consume no RNG, so this block's RNG sits in the
             * same position relative to every other RNG call as before. */
            if (((u.umovement || 0) - 12 /* NORMAL_SPEED */) >= 12) {
                /* C allmain.c:253-255 — a Fast hero holding a banked move
                 * (u.umovement - NORMAL_SPEED still >= NORMAL_SPEED) leaves the
                 * movemon() do-while after ONE pass, with no new-turn block:
                 *     do { monscanmove = movemon();
                 *          if (u.umovement >= NORMAL_SPEED) break;
                 *     } while (monscanmove);
                 * The upkeep (mcalcmove, u_calc_moveamt, moves++, gethungry)
                 * then belongs to the NEXT command's turn, which the moveloop
                 * runs after the dig below.  Running the full block here made
                 * the dig turn a second world block. */
                u.umovement = ((u.umovement || 0) - 12) | 0;
                await ff_movemon_phase();
            } else {
            g.moves = (g.moves || 1) + 1;
            /* C allmain.c:261-263 — `if (flags.time && !svc.context.run)
             * disp.time_botl = TRUE;`; a travel's run=8 survives into this
             * command, so C keeps `T:' frozen through the wield turn. */
            time_botl_moves_incremented((g.moves | 0) - 1);
            if (u.ublesscnt) u.ublesscnt = (u.ublesscnt | 0) - 1; /* C allmain.c:276-277 (this wield-turn block stands in for it) */
            u.umovement = ((u.umovement || 0) - 12 /* NORMAL_SPEED */) | 0;
            /* C allmain.c:212-273: the wield turn's movemon() runs BEFORE its new-turn
             * block, so nh_timeout() (allmain.c:273) fires after the monsters' pass. */
            /* C allmain.c:210/216 — svc.context.mon_moving is TRUE across this wield
             * turn's movemon(); a monster missile that kills (ohitmon, mthrowu.c:470)
             * must take mondied(), not xkilled(). */
            g.context.mon_moving = true;
            /* C allmain.c:252-295: movemon() runs BEFORE svm.moves++ (:295), so a
             * monster pline that overflows the topline inside it raises more()
             * (pline.c:273-274) with the status row still showing the OLD T.  This
             * block bumps g.moves first; pin the displayed T for the pass. */
            const _preMovesLatch = g._movemonStatusMoves;
            if (g.flags?.time && !(g.context?.run | 0)) g._movemonStatusMoves = (g.moves | 0) - 1;
            const _wasMB = g._inMovemonBlock;
            g._inMovemonBlock = true; /* display.js snapshots the first-overflow frame */
            let _ntDone = false;
            g._ff_nh_timeout_hook = async () => { _ntDone = true; await nh_timeout_wield_turn(); };
            g._ff_moves_preinc = true; /* movemon sees the pre-increment svm.moves */
            try {
                await fastforward_step((g.moves || 1) - 1);
            } finally {
                g._ff_moves_preinc = false;
                g._ff_nh_timeout_hook = null;
                g._movemonStatusMoves = _preMovesLatch;
                g._inMovemonBlock = _wasMB;
            }
            g.context.mon_moving = false;
            settrack(); /* C allmain.c:242 — new-turn block, after movemon, before moves++ */
            if (!_ntDone) await nh_timeout_wield_turn();
            /* C allmain.c:433-441 — the same moveloop_core call's multi<0 countdown:
             * savelife() left gm.multi = -1, so this turn's tail ticks it to 0 and
             * unmul() plines nomovemsg ("You survived that attempt on your life."). */
            if ((g.multi | 0) < 0) {
                g.multi = (g.multi | 0) + 1;
                if ((g.multi | 0) === 0) await unmul(null);
            }
            /* C allmain.c:252-295 — the moveloop repeats the movemon + new-turn
             * block until the hero banks NORMAL_SPEED again; a Burdened/Stressed
             * hero (u_calc_moveamt, allmain.c:117-162) adds < NORMAL_SPEED per
             * turn, so the wield action can span more than one world turn. */
            while ((u.umovement | 0) < 12 /* NORMAL_SPEED */) {
                g.moves = (g.moves || 1) + 1;
                time_botl_moves_incremented((g.moves | 0) - 1);
                if (u.ublesscnt) u.ublesscnt = (u.ublesscnt | 0) - 1;
                g.context.mon_moving = true;
                /* C allmain.c:210-244: every repeated movemon precedes
                 * moves++ and nh_timeout(), just like the first pass above. */
                const _repeatLatch = g._movemonStatusMoves;
                const _repeatMB = g._inMovemonBlock;
                if (g.flags?.time && !(g.context?.run | 0))
                    g._movemonStatusMoves = (g.moves | 0) - 1;
                g._inMovemonBlock = true;
                let _repeatTimeoutDone = false;
                g._ff_nh_timeout_hook = async () => {
                    _repeatTimeoutDone = true;
                    await nh_timeout_wield_turn();
                };
                g._ff_moves_preinc = true;
                try {
                    await fastforward_step((g.moves || 1) - 1);
                } finally {
                    g._ff_moves_preinc = false;
                    g._ff_nh_timeout_hook = null;
                    g._movemonStatusMoves = _repeatLatch;
                    g._inMovemonBlock = _repeatMB;
                }
                g.context.mon_moving = false;
                settrack(); /* C allmain.c:242 */
                if (!_repeatTimeoutDone) await nh_timeout_wield_turn();
                /* C allmain.c:378-385: every new turn advances immobility,
                 * including life saving during a repeated movement pass. */
                if ((g.multi | 0) < 0) {
                    g.multi = (g.multi | 0) + 1;
                    if ((g.multi | 0) === 0) await unmul(null);
                }
            }
            }
            /* C allmain.c:398-403 — the SECOND encumber check, after the outer
             * movement loop exits: the folded wield turn's nh_timeout()
             * (allmain.c:273, via nh_timeout_wield_turn) can change the carried
             * weight — e.g. a corpse in the pack reviving and writhing free —
             * and C reports that change here, before the canned doapply's
             * getdir prompt.  The :208 call above (cmd.js, just before the
             * world block) only covers changes from the hero's own action.
             * Without this call the load drop stays unreported and the dig
             * prompt paints one page early (df-x2104138eec: "Your movements
             * are now unencumbered." missing between the squirm pages and
             * the "In what direction do you want to dig?" prompt). */
            encumber_msg_sync();
            /* C allmain.c:390-415: once per hero action, after the movement
             * loop has restored NORMAL_SPEED even when burdened. */
            await seer_turn_check();
            /* C allmain.c:423-434 — the wield turn's moveloop_core tail: a hero
             * who did not move is re-tested against the terrain under them (a
             * wished-up pool drowns the hero here), then underwater/buried
             * vision is refreshed. */
            if (u.utrap && (u.utraptype | 0) === TT_LAVA)
                await sink_into_lava();
            else if (!u.umoved)
                await pooleffects(false);
            if (u.uinwater)
                under_water(0);
            else if (u.uburied)
                under_ground(0);
            const _cannedSurvived = !!cmdq_peek(CQ_CANNED);
            cmdq_clear(CQ_CANNED);
            if (!_cannedSurvived) {
                /* the interrupted wield turn: no second pass, no getdir prompt */
                /* C allmain.c:453-471: the folded world turn still reaches
                 * find_ac and the input redraw before vision_recalc.  Complete
                 * that tail here, before rhack's caller recalculates vision,
                 * and let the next invocation skip the tail already run. */
                find_ac();
                await faithful_input_redraw();
                g._ff_input_tail_done = true;
                emitMapstate('turn_end');
                /* the folded wield turn above already ran this command's world block */
                g.context.move = 0;
                /* C dig.c:1104-1106 returns ECMD_TIME here, so rhack's tail
                 * (cmd.c:3814-3816) does NOT reset_cmd_vars and a paralysis
                 * (gm.multi < 0) begun during the wield turn keeps counting
                 * down.  This folded turn returns ECMD_OK; tell rhack to
                 * carry multi across its reset. */
                if ((g.multi | 0) < 0) g._folded_time_multi = g.multi | 0;
                return ECMD_OK;
            }
            /* C allmain.c:454-470 — the wield turn ends at moveloop_core's tail, so
             * the once-per-input hallucination redraw (see_monsters/see_objects/
             * see_traps, display-rng draws) runs BEFORE the canned doapply reaches
             * getdir; the --More-- frame below then already shows the new glyphs. */
            await faithful_input_redraw();
            /* C dig.c:1102-1106 re-queues doapply for the NEXT turn and that canned doapply
             * runs apply.c:4230 retouch_object() again on the (now wielded) tool: for an
             * artifact axe (Cleaver) it draws touch_artifact's badalign rn2(4) a second time
             * and may blast the hero before use_pick_axe asks for the direction. */
            if (selObj.oartifact && !(await retouch_object_hero(selObj, false))) {
                g.context.move = 0;
                return ECMD_TIME;
            }
            /* The paging loop below repaints snapshots (its own flush_screen calls
             * bump _lastFlushFrame); C's more() flushes nothing (topl.c:390-392), so
             * the physical map is the last flush from BEFORE those page repaints. */
            const _lastWorldFlushPrePage = g._lastFlushFrame;
            if (g._pending_message && g._topl_win_stop) {
                /* C topl.c:390-393 tty_yn_function (getdir's prompt): toplin is
                 * NEED_MORE but WIN_STOP is live (ESC on the wield page), so no
                 * more() is raised; the flags are cleared and the prompt replaces
                 * the topline directly. */
                g._pending_message = '';
                g._topl_win_stop = false;
                g._topl_win_stop_armed = false;
                g._topl_win_stop_buf = '';
            }
            /* C wintty.c tty_yn_function (topl.c:389-393, getdir -> yn_function): with
             * WIN_STOP live (ESC at the wield --More--, topl.c:232-235) the pending
             * topline is NOT paged -- more() is skipped and the dig-direction prompt
             * simply replaces it. */
            if (g._topl_win_stop) g._pending_message = "";
            if (g._pending_message) {
                const _pgs = _topl_more_pages(g._pending_message,
                    _topl_joins_snapshot(g._pending_message) || undefined);
                for (let _i = 0; _i < _pgs.length - 1; ++_i) {
                    const _pm = `${_pgs[_i]}--More--`;
                    const _showPg = async () => {
                        g._pending_message = _pm;
                        const _nx = _pgs[_i + 1];
                        const _pgEnd = _pgs.slice(0, _i + 1).join('  ').length;
                        const _pgPf = (g._plineFlushFrames || []).findLast((f) => f.off === _pgEnd
                            && _nx.startsWith(f.msg));
                        const _prevSnapPg = g._paintedSnapshot;
                        const _prevInPg = g._inMovemonMore;
                        /* C pline.c:273-276 / topl.c:274: the incoming monster
                         * message flushes before paging the preceding topline.
                         * Its frame includes moves since the wield pline. */
                        const _PF = _pgPf || (_i === 0 ? _preWorldFrame : null);
                        if (_PF && !_cmd_Hallucination()) {
                            g._paintedSnapshot = { cells: _PF.cells, moves: _PF.moves, botl: _PF.botl || null };
                            g._inMovemonMore = true;
                        }
                        /* This repaint replays a flush that already happened inside the
                         * wield turn's movemon (pline.c:273-274 bot()); the status flags
                         * still raised now (regen_hp's botl, allmain.c:474-475) were set
                         * AFTER it and belong to the moveloop tail, so the replayed
                         * bot() must not consume them. */
                        const _replayBotl = !!(_PF && g.disp?.botl);
                        const _replayBotlx = !!(_PF && g.disp?.botlx);
                        try { await flush_screen(1); } finally {
                            g._paintedSnapshot = _prevSnapPg;
                            g._inMovemonMore = _prevInPg;
                            if (_replayBotl) g.disp.botl = true;
                            if (_replayBotlx) g.disp.botlx = true;
                        }
                        set_cursor(_pm.length, 0);
                    };
                    await _showPg();
                    /* topl.c:232-235 more(): ESC sets WIN_STOP, so every later
                     * pline of this wield turn is skipped (update_topl:257) and
                     * raises no further page before getdir's prompt. */
                    if ((await await_topl_more_dismiss(_showPg)) === 27)
                        break;
                }
                g._pending_message = _pgs[_pgs.length - 1];
            }
            if (g._topl_win_stop_armed && !g._topl_win_stop) {
                /* topl.c:232 more() set WIN_STOP at the ESC on a page above; the
                 * owner pline that raised it was the last, so WIN_STOP is live
                 * when getdir's tty_yn_function samples it. */
                g._topl_win_stop_armed = false;
                g._topl_win_stop = true;
            }
            if (g._pending_message && g._topl_win_stop) {
                /* C topl.c:150 more() is a no-op while WIN_STOP is live (ESC at
                 * the wield --More--), so the getdir prompt (tty_yn_function
                 * clears the topline) raises no page for the swallowed text. */
                g._pending_message = '';
                g._topl_win_stop = false;
                g._topl_win_stop_buf = null;
            }
            if (g._pending_message) {
                /* C topl.c update_topl: the getdir prompt cannot join the
                 * wield/monster message, so it is paged with --More--. */
                /* botl still raised here was set after the last pline flush
                 * (pline.c:273-274 runs bot()), so allmain.c:474-475 bot();
                 * curs_on_u() repaints the map after every movemon pline. */
                const _botlPaint = !!(g.disp?.botl || g.disp?.botlx);
                const msgP = `${g._pending_message}--More--`;
                const _lastWorldFlush = _lastWorldFlushPrePage;
                const _showP = async () => {
                    g._pending_message = msgP;
                    const _prevSnap = g._paintedSnapshot;
                    const _prevIn = g._inMovemonMore;
                    /* vpline() flushes before every putmesg (pline.c:273-274): a pline of
                     * the wield turn's movemon ("You hear crashing rock.") repaints the
                     * terminal AFTER the pre-world frame, and the getdir --More-- freezes
                     * the map as THAT flush left it (monsters already moved). */
                    let _worldPf = (g._plineFlushFrames || []).findLast((f) => f.off >= 0
                        && (msgP.slice(f.off + 2, f.off + 2 + f.msg.length) === f.msg
                            || msgP.endsWith(`${f.msg}--More--`)));
                    if (_lastWorldFlush && _lastWorldFlush.epoch
                        > (_worldPf?.flushEpoch ?? _preWorldFrame?.epoch ?? Infinity))
                        _worldPf = _lastWorldFlush;
                    /* C allmain.c:477-480: timebot(); curs_on_u() flushes the
                     * post-turn map before the canned doapply.  A movemon
                     * pline from before that clock advance no longer holds
                     * the physical map that getdir's more() must show.
                     * faithful_input_redraw alone only updates gbuf. */
                    const _seerPaint = (g._seerMapSeq | 0) !== (g._seerMapSeq0 | 0);
                    if (_worldPf && !_cmd_Hallucination() && !_botlPaint && !_seerPaint
                        && !(g.flags?.time && g._timeBotlFrozenMoves == null
                            && (g.moves | 0) !== (_worldPf.moves | 0))) {
                        const _fz = g._timeBotlFrozenMoves;
                        g._paintedSnapshot = { cells: _worldPf.cells,
                            moves: (_fz != null) ? (_fz | 0) : (g.moves | 0) };
                        g._inMovemonMore = true;
                    } else if (_preWorldFrame && !_botlPaint && !_seerPaint
                        /* C mhitu.c:936-937: mattacku's bot() paints only status,
                         * leaving the map at the last flush. A discharged botl
                         * therefore does not invalidate this frame. Actual later
                         * map flushes are selected as _worldPf above; pending
                         * botl still triggers allmain.c:474-475's curs_on_u(). */
                        /* C allmain.c:474-480 — before rhack() reads the canned
                         * doapply, `else if (disp.time_botl) { timebot(); curs_on_u(); }`
                         * and curs_on_u() is flush_screen(1) (display.c:1687-1690),
                         * which repaints the map gbuf.  With the time option the wield
                         * turn's moves++ set time_botl (allmain.c:261-263), so the map
                         * is NOT frozen at the pre-world flush. */
                        && !(g.flags?.time && g._timeBotlFrozenMoves == null
                            && (g.moves | 0) !== (_preWorldFrame.moves | 0))) {
                        /* C dig.c:1100-1107: the wield turn ran fully (moves++, bot()
                         * before the canned doapply reaches getdir), so the status
                         * row shows the NEW T while the map stays frozen at the last
                         * flush.  Honor the time_botl run-freeze latch like
                         * display.js _painted_moves(). */
                        const _fz = g._timeBotlFrozenMoves;
                        g._paintedSnapshot = { cells: _preWorldFrame.cells,
                            moves: (_fz != null) ? (_fz | 0) : (g.moves | 0) };
                        g._inMovemonMore = true;
                    }
                    try {
                        await flush_screen(1);
                    } finally {
                        g._paintedSnapshot = _prevSnap;
                        g._inMovemonMore = _prevIn;
                    }
                    set_cursor(msgP.length, 0);
                };
                await _showP();
                await await_topl_more_dismiss(_showP);
            }
            emitMapstate('turn_end');
        }
        /* C dig.c:1113-1118 — the web check precedes the dirsym build and getdir
         * (dig.c:1151), so a web-entangled hero is refused before any direction
         * prompt. res is still ECMD_OK on this path, so the "Unfortunately," arm
         * applies; the refusal takes no turn (use_pick_axe returns res). */
        if ((u.utrap | 0) && (u.utraptype | 0) === TT_WEB) {
            await pline(`Unfortunately, you can't ${is_pick(selObj) ? 'dig' : 'chop'} while entangled in a web.`);
            g.context.move = 0;
            return ECMD_OK;
        }
        const dirPrompt = `In what direction do you want to ${is_pick(selObj) ? 'dig' : 'chop'}? [${dig_dirsyms(selObj)}]`;
        /* C dig.c:1152 `if (!getdir(qbuf)) return res;` — the shared getdir owns
         * the prompt, quitchars and the cmdassist invalid-direction window. */
        if (!(await getdir(dirPrompt))) {
            g.context.move = 0;
            return ECMD_CANCEL;
        }
        const res = await use_pick_axe(selObj, null);
        if (game._pending_message) {
            if ((g.multi | 0) < 0 || g._commandFromQueue) {
                /* use_pick_axe2's nomul(-d(2,2)) (dig.c:1220, web) leaves the
                 * countdown plines to merge onto the result line; moving (not
                 * copying) the pline avoids merging it with itself.  A queued
                 * wield-then-apply (cmdq) is stashed again at moveloop_core,
                 * so the copy would merge the begin-message twice. */
                _topl_stash_result();
            } else {
                game._resultMessage = game._pending_message;
            }
        }
        if (res !== 0) {
            g.context.move = 1;
            /* Flag the banked-occupation turn so the moveloop occupation driver
             * runs the dig occupation across its turns (dig() per turn) at THIS
             * input boundary (C banks the umovement here). */
            g._occupation_turn = true;
        } else {
            g.context.move = 0;
        }
        return res;
    }
    /* C ref: apply.c:4287-4290 — LOCK_PICK / CREDIT_CARD / SKELETON_KEY →
     * pick_lock(obj).  The Rogue's slot 'e' is a lock pick (synthetic obj when
     * g.invent is absent). */
    const isLockPick = selObj
        ? (selObj.otyp === LOCK_PICK_OTYP
           || selObj.otyp === _AP_CREDIT_CARD_OTYP
           || selObj.otyp === _AP_SKELETON_KEY_OTYP)
        : (itemCh === 'e');
    if (isLockPick) {
        /* Selected the lock pick.  C ref: apply.c:4287 LOCK_PICK → pick_lock(). */
        const pick = selObj || { otyp: LOCK_PICK_OTYP, oclass: 6 /* TOOL_CLASS */ };
        let res = await pick_lock(pick);
        /* C has one live topline for pick_lock's result.  Move it to the
         * deferred result accumulator so the command/world merge cannot append
         * the same message twice (including an ECMD_OK no-door result). */
        const pickHadMessage = !!game._pending_message;
        if (pickHadMessage)
            _topl_stash_result();
        /* C ref: apply.c:4421-4423 — doapply's tail: res |= arti_speak(obj). */
        if (selObj && selObj.oartifact)
            res |= await arti_speak(selObj);
        /* C ref: apply.c:4290 — res = (pick_lock(...) != 0) ? ECMD_TIME : ECMD_OK. */
        if (res !== 0) {
            g.context.move = 1;
            /* Flag the banked-occupation turn so moveloop_core fires the
             * single deferred per-turn block C records for this input
             * boundary (C's umovement banking surfaces it here, not at the
             * intervening no-time getobj steps).  See js/allmain.js tail. */
            g._occupation_turn = true;
        } else {
            g.context.move = 0;
        }
        return g.context.move;
    }
    if (selObj && ((selObj.otyp | 0) === _IA_LAND_MINE_OTYP
                   || (selObj.otyp | 0) === _IA_BEARTRAP_OTYP)) {
        await use_trap(selObj);
        g.context.move = 1; /* C: res is still ECMD_TIME */
        if (g.occupation === set_trap) {
            /* Flag the banked-occupation turn so the moveloop occupation
             * driver runs set_trap across its turns, mirroring the dig /
             * pick_lock arms above. */
            g._occupation_turn = true;
        }
        return g.context.move;
    }
    /* C ref: apply.c:4328 — EXPENSIVE_CAMERA → res = use_camera(obj). */
    if (selObj && (selObj.otyp | 0) === EXPENSIVE_CAMERA) {
        const res = await use_camera(selObj);
        g.context.move = (res === ECMD_TIME) ? 1 : 0;
        return res;
    }
    if (selObj && (selObj.otyp | 0) === 237 /* STETHOSCOPE */) {
        const res = await use_stethoscope(selObj);
        g.context.move = ((res | 0) & ECMD_TIME) ? 1 : 0;
        return res;
    }
    if (selObj && (selObj.otyp | 0) === _WRITE_MAGIC_MARKER) {
        const res = await dowrite(selObj);
        g.context.move = ((res | 0) & ECMD_TIME) ? 1 : 0;
        return res;
    }
    if (selObj && (selObj.otyp | 0) === _AP_TINNING_KIT_OTYP) {
        await use_tinning_kit(selObj);
        g.context.move = 1; /* C: res is still ECMD_TIME */
        return g.context.move;
    }
    /* C ref: apply.c:4265-4266 — BULLWHIP → res = use_whip(obj). */
    if (selObj && (selObj.otyp | 0) === _BULLWHIP_OTYP) {
        const res = await use_whip(selObj);
        g.context.move = (res === ECMD_TIME) ? 1 : 0;
        return res;
    }
    /* C ref: apply.c:4268-4270 — GRAPPLING_HOOK → res = use_grapple(obj). */
    if (selObj && (selObj.otyp | 0) === _AP_GRAPPLING_HOOK_OTYP) {
        const res = await use_grapple(selObj);
        g.context.move = (res === ECMD_TIME) ? 1 : 0;
        return res;
    }
    /* C ref: apply.c:4279-4280 — BAG_OF_TRICKS → (void) bagotricks(obj,
     * FALSE, (int *) 0); break.  `void`; res is unchanged (still C's
     * ECMD_TIME initialiser) whatever bagotricks does internally. */
    if (selObj && (selObj.otyp | 0) === _BOT_BAG_OF_TRICKS_OTYP) {
        await bagotricks(selObj, false, null);
        g.context.move = 1; /* C: res is still ECMD_TIME */
        return g.context.move;
    }
    /* C ref: apply.c:4308 — TIN_WHISTLE → use_whistle(obj); break.
     * void function; res stays ECMD_TIME.  doapply's switch (apply.c:4255-4398)
     * sets disp.botl for NONE of TIN_WHISTLE/SADDLE/LUMP_OF_ROYAL_JELLY, and
     * use_whistle() itself never touches it either — the unconditional
     * `g.disp.botl = 1` that stood here was an invented write of exactly the
     * shape the CREAM_PIE arm below already documents and avoids.  Removed,
     * matching that arm's own rationale. */
    if (selObj && (selObj.otyp | 0) === 245 /* TIN_WHISTLE */) {
        await use_whistle(selObj);
        g.context.move = 1;
        return g.context.move;
    }
    /* C ref: apply.c:4309-4325 — EUCALYPTUS_LEAF: blessed → use_magic_whistle,
     * then rn2(49) may unbless (glow brown); else use_whistle.  void; res stays
     * ECMD_TIME. */
    if (selObj && (selObj.otyp | 0) === _APPLY_EUCALYPTUS_LEAF_OTYP) {
        if (selObj.blessed) {
            await use_magic_whistle(selObj);
            if (!rn2(49)) {
                if (!_hero_Blind()) {
                    await pline(`${Yobjnam2(selObj, 'glow')} ${hcolor('brown')}.`);
                    set_bknown(selObj, 1);
                }
                await unbless(selObj);
            }
        } else {
            await use_whistle(selObj);
        }
        g.context.move = 1;
        return g.context.move;
    }
    if (selObj && (selObj.otyp | 0) === 246 /* MAGIC_WHISTLE */) {
        await use_magic_whistle(selObj);
        g.context.move = 1;
        return g.context.move;
    }
    /* C ref: apply.c:4302-4303 — SADDLE → res = use_saddle(obj).  doapply's
     * switch sets no botl for this case; see the TIN_WHISTLE arm above. */
    if (selObj && (selObj.otyp | 0) === 235 /* SADDLE */) {
        const res = await use_saddle(selObj);
        g.context.move = (res === ECMD_TIME) ? 1 : 0;
        return res;
    }
    /* C ref: apply.c:4264-4265 — LUMP_OF_ROYAL_JELLY → res = use_royal_jelly(&obj).
     * doapply's switch sets no botl for this case; see the TIN_WHISTLE arm above. */
    if (selObj && (selObj.otyp | 0) === 286 /* LUMP_OF_ROYAL_JELLY */) {
        const res = await use_royal_jelly(selObj);
        g.context.move = (res === ECMD_TIME) ? 1 : 0;
        return res;
    }
    /* C ref: apply.c:4262 — CREAM_PIE → res = use_cream_pie(obj). */
    if (selObj && (selObj.otyp | 0) === _APPLY_CREAM_PIE_OTYP) {
        const res = await use_cream_pie(selObj);
        /* C apply.c:4419-4425 doapply tail — the return value is the WHOLE
         * effect; doapply sets no botl.  (The sibling royal-jelly and flint arms
         * below each set disp.botl by hand; do not copy that here — make_blinded
         * -> toggle_blindness (js/zap.js:368) already does C's SET_BOTL at C's
         * point, and a second unconditional set would repaint the status row on
         * a frame C leaves alone.) */
        g.context.move = (res === ECMD_TIME) ? 1 : 0;
        return g.context.move;
    }
    if (selObj && ((selObj.otyp | 0) === 473 /* FLINT */
                   || (selObj.otyp | 0) === _AP_LUCKSTONE_OTYP
                   || (selObj.otyp | 0) === _AP_LOADSTONE_OTYP
                   || (selObj.otyp | 0) === _AP_TOUCHSTONE_OTYP)) {
        const res = await use_stone(selObj);
        g.context.move = (res === ECMD_TIME) ? 1 : 0;
        return res;
    }
    if (selObj && (selObj.otyp | 0) >= 214 /* LARGE_BOX */
        && (selObj.otyp | 0) <= 219 /* BAG_OF_HOLDING */) {
        const { use_container_impl } = await import('./pickup_container.js');
        const cobjRef = { obj: selObj };
        const res = await use_container_impl(cobjRef, true, false);
        g.context.move = (res === ECMD_TIME) ? 1 : 0;
        return res;
    }
    if (selObj && (selObj.otyp | 0) >= 247 /* WOODEN_FLUTE */
        && (selObj.otyp | 0) <= 258 /* DRUM_OF_EARTHQUAKE */
        && (selObj.otyp | 0) !== 252 /* HORN_OF_PLENTY — apply.c:4341 */
        && (selObj.otyp | 0) !== 255 /* BELL — apply.c:4318 use_bell */) {
        const { do_play_instrument } = await import('./music.js');
        const res = await do_play_instrument(selObj);
        g.context.move = (res === ECMD_TIME) ? 1 : 0;
        return g.context.move;
    }
    /* C ref: apply.c:4385-4387 — HORN_OF_PLENTY ("not a musical instrument")
     * routes to (void) hornoplenty(obj, FALSE, (struct obj *) 0); break.
     * `void`; `res` stays ECMD_TIME, mirroring the BAG_OF_TRICKS arm above. */
    if (selObj && (selObj.otyp | 0) === _HOP_HORN_OF_PLENTY) {
        await hornoplenty(selObj, false, null);
        g.context.move = 1; /* C: res is still ECMD_TIME */
        return g.context.move;
    }
    if (selObj && ((selObj.otyp | 0) === 226 /* BRASS_LANTERN */
                   || (selObj.otyp | 0) === 227 /* OIL_LAMP */
                   || (selObj.otyp | 0) === 228 /* MAGIC_LAMP */)) {
        await use_lamp(selObj);
        g.context.move = 1; /* C: res is still ECMD_TIME */
        return g.context.move;
    }
    /* C ref: apply.c:4337-4339 — CANDELABRUM_OF_INVOCATION → use_candelabrum(obj).
     * `void`, so C's `res` stays ECMD_TIME and the apply spends the turn.
     * otyp 262 (js/cmd.js:35287 CL_CANDELABRUM_OF_INVOCATION). */
    if (selObj && (selObj.otyp | 0) === _AP_CANDELABRUM_OF_INVOCATION) {
        const shownBefore = g._toplShownSeq | 0;
        await use_candelabrum(selObj);
        /* apply.c:1346-1350 can return silently while Blind. tty_yn_function
         * leaves a single-row prompt painted (topl.c:544-549); preserve that
         * residue only if no message or inventory menu has overwritten it. */
        if (answeredApplyPrompt && (g._toplShownSeq | 0) === shownBefore
            && !g._pending_message && !g._resultMessage)
            g._resultMessage = g._ynStaleTopline = answeredApplyPrompt;
        g.context.move = 1; /* C: res is still ECMD_TIME */
        return g.context.move;
    }
    /* C ref: apply.c:4340-4342 — WAX_CANDLE / TALLOW_CANDLE → use_candle(&obj).
     * `void`; `res` stays ECMD_TIME.  The in/out obj is passed as a {obj} box,
     * the same shape apply.c:4271's container arm above uses. */
    if (selObj && ((selObj.otyp | 0) === _AP_WAX_CANDLE
                   || (selObj.otyp | 0) === _AP_TALLOW_CANDLE)) {
        const candleRef = { obj: selObj };
        await use_candle(candleRef);
        g.context.move = 1; /* C: res is still ECMD_TIME */
        return g.context.move;
    }
    /* C ref: apply.c:4349-4351 — POT_OIL → light_cocktail(&obj).  `void`; `res`
     * stays ECMD_TIME.  This is the ONE arm of doapply's switch that is reached
     * through a POTION_CLASS object, so it sits after the tool arms and before
     * the default. */
    if (selObj && (selObj.otyp | 0) === _AP_POT_OIL) {
        const oilRef = { obj: selObj };
        await light_cocktail(oilRef);
        g.context.move = 1; /* C: res is still ECMD_TIME */
        return g.context.move;
    }
    if (selObj && ((selObj.otyp | 0) === 233 /* BLINDFOLD */
                   || (selObj.otyp | 0) === 232 /* LENSES */)) {
        const ublindf = u.ublindf || null;
        const shownBeforeBlindf = g._toplShownSeq | 0;
        if (selObj === ublindf) {
            /* C apply.c:4247 calls do_wear.c:1893 cursed(), which also
             * reports the refusal and learns the object's curse. */
            if (!(await cursed_dw(selObj)))
                await Blindf_off(selObj);
        } else if (!ublindf) {
            await Blindf_on(selObj);
        } else {
            await You("are already %s.",
                      ((ublindf.otyp | 0) === 234 /* TOWEL */)
                          ? "covered by a towel"
                          : ((ublindf.otyp | 0) === 233 /* BLINDFOLD */)
                              ? "wearing a blindfold"
                              : "wearing lenses");
        }
        /* tty never clears the answered getobj prompt: a silent Blindf_on/off
         * (!verbose drops the on/off message) leaves it on the topline. */
        if ((g._toplShownSeq | 0) === shownBeforeBlindf
            && !g._pending_message && !g._resultMessage && !viaInvMenu)
            g._resultMessage = g._ynStaleTopline = qbuf;
        g.context.move = 1; /* C: res is still ECMD_TIME */
        return g.context.move;
    }
    if (selObj && (selObj.otyp | 0) === _IA_MIRROR_OTYP) {
        let res = await use_mirror(selObj);
        /* C ref: apply.c:4421-4423 — doapply's tail: res |= arti_speak(obj)
         * (the Magic Mirror of Merlin whispers a rumor after the gaze). */
        if (selObj.oartifact)
            res |= await arti_speak(selObj);
        g.context.move = (res === ECMD_TIME) ? 1 : 0;
        return res;
    }
    if (selObj && (selObj.otyp | 0) === _IA_FIGURINE_OTYP) {
        const res = await use_figurine(selObj);
        g.context.move = (res === ECMD_TIME) ? 1 : 0;
        return res;
    }
    if (selObj && (selObj.otyp | 0) === 261 /* UNICORN_HORN */) {
        const shownBefore = g._toplShownSeq | 0;
        await use_unicorn_horn(selObj);
        /* tty never clears the answered getobj prompt (topl.c:257-266 clears
         * only at the next key read): a horn application that prints nothing
         * (cursed horn re-confusing an already confused hero, cures that
         * set no message) leaves "What do you want to use or apply?" on the
         * topline.  Same shape as the steed.c forcemount arm in dosteed. */
        // MSGTYP_STOP clears its message; that is not a silent application.
        if ((g._toplShownSeq | 0) === shownBefore
            && !g._pending_message && !g._resultMessage && !viaInvMenu)
            g._resultMessage = g._ynStaleTopline = qbuf;
        g.context.move = 1; /* C: res is still ECMD_TIME */
        return g.context.move;
    }
    if (selObj && (selObj.otyp | 0) === OTYP_TOWEL) {
        const res = await use_towel(selObj);
        g.context.move = (res === ECMD_TIME) ? 1 : 0;
        return g.context.move;
    }
    if (selObj && (selObj.otyp | 0) === LEASH_OTYP) {
        const res = await use_leash(selObj);
        g.context.move = (res === ECMD_TIME) ? 1 : 0;
        return res;
    }
    /* C ref: apply.c:4296-4297 — CAN_OF_GREASE → res = use_grease(obj). */
    if (selObj && (selObj.otyp | 0) === 240 /* CAN_OF_GREASE */) {
        const res = await use_grease(selObj);
        g.context.move = (res === ECMD_TIME) ? 1 : 0;
        return res;
    }
    if (selObj && (selObj.otyp | 0) === _IA_TIN_OPENER_OTYP) {
        const res = await use_tin_opener(selObj);
        g.context.move = ((res | 0) & ECMD_TIME) ? 1 : 0;
        return res;
    }
    /* C ref: apply.c:4404-4408 — case BANANA: under Hallucination it prints
     * "It rings! ... But no-one answers." and `break`s straight to the
     * function tail with `res` still at its ECMD_TIME initial value (no other
     * state touched); NOT hallucinating it FALLS THROUGH to the same
     * is_pole/is_pick/"Sorry" default this file already ports below — a
     * banana is neither, so that fallback already reproduces C's non-halluc
     * outcome exactly and only the halluc arm needs its own case here. */
    if (selObj && (selObj.otyp | 0) === THIT_BANANA && _uprop_active('HALLUC')) {
        await pline("It rings! ... But no-one answers.");
        g.context.move = 1;
        return ECMD_TIME;
    }
    /* C ref: apply.c:4333-4335 — BELL / BELL_OF_OPENING → use_bell(&obj).
     * use_bell is `void`; the switch's `res` local (apply.c:4217) is never
     * reassigned for this case, so it stays at its ECMD_TIME initialiser —
     * ringing a bell ALWAYS takes a turn, whatever happens inside. */
    if (selObj && ((selObj.otyp | 0) === _IA_BELL_OTYP
        || (selObj.otyp | 0) === _IA_BELL_OF_OPENING_OTYP)) {
        await use_bell(selObj);
        g.context.move = 1;
        return ECMD_TIME;
    }
    /* C ref: apply.c:4256-4258 — CRYSTAL_BALL → use_crystal_ball(&obj); res stays
     * ECMD_TIME (void callee). */
    if (selObj && (selObj.otyp | 0) === CRYSTAL_BALL_OTYP) {
        await use_crystal_ball(selObj);
        g.context.move = 1;
        return ECMD_TIME;
    }
    /* C ref: apply.c:4409-4419 default case — is_pole(obj) routes to
     * use_pole(obj, FALSE). */
    if (selObj && is_pole(selObj)) {
        const res = await use_pole(selObj, false);
        g.context.move = (res === ECMD_TIME) ? 1 : 0;
        return res;
    }
    /* C ref: apply.c:4409-4419 default case (cont'd) — is_pick(obj) and
     * is_axe(obj) are handled above (routing to use_pick_axe); any other
     * selection is C's true default: pline + ECMD_FAIL (no turn). */
    if (selObj) {
        await pline("Sorry, I don't know how to use that.");
        g.context.move = 0;
        return ECMD_FAIL;
    }
    g.context.move = 0;
    return g.context.move;
}

async function _doapply_break_wand(obj) {
    const g = game;
    const u = g.u || {};
    /* C apply.c:3924-3931 — nohands / !freehand / strength guards, each a
     * plain message + ECMD_OK (no turn taken, the object is untouched). */
    if (_hero_nohands()) {
        await pline(`You can't break ${yname(obj)} without hands!`);
        return ECMD_OK;
    }
    if (!freehand()) {
        await pline(`Your ${makeplural_objnam(body_part(HAND))} are occupied!`);
        return ECMD_OK;
    }
    const _wdesc = getObjDescr(obj.otyp | 0);
    const is_fragile = _wdesc === 'balsa' || _wdesc === 'glass';
    if (acurr(u, A_STR) < (is_fragile ? 5 : 10)) {
        await pline(`You don't have the strength to break ${yname(obj)}!`);
        return ECMD_OK;
    }
    /* C apply.c:3934-3937 — the option bit chooses whole-word paranoid input;
     * the shared reader otherwise uses the ordinary y/n prompt. */
    const _confirmed = await paranoid_query(
        !!((g.flags?.paranoia_bits | 0) & PARANOID_BREAKWAND),
        `Are you really sure you want to break ${yname(obj)}?`);
    if (!_confirmed) {
        return ECMD_OK;
    }
    /* C apply.c:3938-3939 — `body_part(HEAD)` per the hero's current form,
     * not a hardcoded "head" (a headless polyform reads differently). */
    await pline(`Raising ${yname(obj)} high above your ${body_part(HEAD)}, `
        + `you ${is_fragile ? 'snap' : 'break'} it in two!`);
    /* C apply.c:3944-3947 — unpaid billing before the wand leaves inventory. */
    if (obj.unpaid) {
        check_unpaid(obj);
        await costly_alteration(obj, COST_DSTROY);
    }
    /* C apply.c:3950-3952 — hide the wand from destroy_items and carrying
     * weight calculations before the explosion; keep it alive until discard. */
    g.gc_current_wand = obj;
    freeinv(obj);
    setnotworn(obj);
    /* C apply.c:3876-3884 discard_broken_wand(): delobj(gc.current_wand) +
     * nomul(0). Reuses the existing real delobj_core port (_delobj_useupf,
     * cmd.js:6378-ish) — same obj_resists(obj,0,0) guard and
     * objs_deleted.count bump this file's dothrow fix already relies on for
     * the identical C function. Both branches below call this, so it is
     * factored out here rather than duplicated. */
    const _breakWandDiscard = async () => {
        const wand = g.gc_current_wand;
        g.gc_current_wand = 0;
        if (wand)
            await delobj_core(wand);
        nomul(0);
    };
    if (!zappable(obj)) {
        await pline('But nothing else happens...');
        await _breakWandDiscard();
        return ECMD_TIME;
    }
    obj.spe = (obj.spe | 0) + 1;
    if (!obj.spe) {
        obj.spe = rnd(3);
    }
    const WAN_OPENING = 425, WAN_WISHING = 414, WAN_NOTHING = 416,
          WAN_LOCKING = 426, WAN_PROBING = 427, WAN_ENLIGHTENMENT = 412,
          WAN_SECRET_DOOR_DETECTION = 411, WAN_STASIS = 415;
    const otyp = obj.otyp | 0;
    if (otyp === WAN_OPENING && u.ustuck) {
        await release_hold();
        makeknown(otyp);
        await _breakWandDiscard();
        return ECMD_TIME;
    }
    if (otyp === WAN_OPENING || otyp === WAN_WISHING || otyp === WAN_NOTHING
        || otyp === WAN_LOCKING || otyp === WAN_PROBING
        || otyp === WAN_ENLIGHTENMENT || otyp === WAN_SECRET_DOOR_DETECTION
        || otyp === WAN_STASIS) {
        await pline('But nothing else happens...');
        await _breakWandDiscard();
        return ECMD_TIME;
    }
    /* C apply.c:3968-3970 — obj->ox = u.ux; obj->oy = u.uy; dmg = obj->spe * 4;
     * affects_objects = FALSE. obj->ox/obj->oy are read only by the general
     * explode() call at apply.c:4023-4024 (the unported loop path below);
     * broken_wand_explode() (apply.c:3886-3892, the five cases just below)
     * targets u.ux/u.uy directly, so ox/oy are not needed for that path. */
    let dmg = (obj.spe | 0) * 4;
    /* C apply.c:3995-4013 — the five broken_wand_explode() cases: a
     * one-shot explosion at the hero's own square, no loop, no
     * affects_objects, immediate ECMD_TIME. explode() (js/zap.js, already a
     * full port — used live by dig.js's TRAP_EXPLODE and zap.js's own
     * fireball/mon_explodes paths) is called with the SAME five arguments
     * broken_wand_explode passes: (u.ux, u.uy, -(obj->otyp), dmg, WAND_CLASS,
     * expltype). makeknown() runs AFTER explode() (its comment: "explode
     * describes the effect") and BEFORE discard_broken_wand() deletes obj —
     * obj->otyp is still valid either way since delobj does not clear otyp,
     * but the ordering itself is C's and is preserved exactly. */
    const WAN_MAGIC_MISSILE = 429, WAN_FIRE = 430, WAN_COLD = 431,
          WAN_DEATH = 433, WAN_LIGHTNING = 434;
    if (otyp === WAN_DEATH || otyp === WAN_LIGHTNING) {
        await explode(u.ux, u.uy, -otyp, dmg * 4, OCLASS_WAND, EXPL_MAGICAL);
        makeknown(otyp);
        await _breakWandDiscard();
        return ECMD_TIME;
    }
    if (otyp === WAN_FIRE) {
        await explode(u.ux, u.uy, -otyp, dmg * 2, OCLASS_WAND, EXPL_FIERY);
        makeknown(otyp);
        await _breakWandDiscard();
        return ECMD_TIME;
    }
    if (otyp === WAN_COLD) {
        await explode(u.ux, u.uy, -otyp, dmg * 2, OCLASS_WAND, EXPL_FROSTY);
        makeknown(otyp);
        await _breakWandDiscard();
        return ECMD_TIME;
    }
    if (otyp === WAN_MAGIC_MISSILE) {
        await explode(u.ux, u.uy, -otyp, dmg, OCLASS_WAND, EXPL_MAGICAL);
        makeknown(otyp);
        await _breakWandDiscard();
        return ECMD_TIME;
    }
    const WAN_STRIKING = 417, WAN_CANCELLATION = 423, WAN_POLYMORPH = 422,
          WAN_TELEPORTATION = 424, WAN_UNDEAD_TURNING = 421,
          WAN_CREATE_MONSTER = 413, WAN_DIGGING = 428, WAN_LIGHT = 410;
    if (otyp === WAN_STRIKING) {
        await pline('A wall of force smashes down around you!');
        /* C Soundeffect(SFX_WAND_BREAK) is presentation-only here. */
        dmg = d(1 + (obj.spe | 0), 6);
    }
    /* C apply.c:4013-4019 — affects_objects = TRUE for exactly these four;
     * `affects_objects` was already initialised FALSE (apply.c:3970, this
     * port's declaration above the WAN_DEATH/LIGHTNING/FIRE/COLD/MAGIC_MISSILE
     * block). default: break (affects_objects stays FALSE). */
    let affects_objects = false;
    /* C apply.c:4007-4019 — WAN_STRIKING FALLTHRU into the same group. */
    if (otyp === WAN_STRIKING || otyp === WAN_CANCELLATION
        || otyp === WAN_POLYMORPH
        || otyp === WAN_TELEPORTATION || otyp === WAN_UNDEAD_TURNING) {
        affects_objects = true;
    }
    /* C apply.c:3968-3969 — obj->ox = u.ux; obj->oy = u.uy;. The header
     * comment above (this function's opening block) says these are "read
     * only by the general explode loop" but never actually WRITES them —
     * the four broken_wand_explode() short-circuits above use u.ux/u.uy
     * directly and never needed it. This loop reads obj.ox/obj.oy, so the
     * assignment has to happen here, once, before it. */
    obj.ox = u.ux; obj.oy = u.uy;
    /* C apply.c:4023-4024 — the general magical explosion, always at the
     * hero's own square (obj->ox/oy were just set to u.ux/u.uy). */
    await explode(u.ux, u.uy, -otyp, rnd(dmg), OCLASS_WAND, EXPL_MAGICAL);
    /* C apply.c:4026 zapsetup(); prepares for polymorph feedback. */
    zapsetup();
    /* C apply.c:3998 fillmsg = FALSE; -- shared across every WAN_DIGGING
     * direction this loop visits ("Some holes are quickly filled with %s!"
     * fires at most once per do_break_wand call). */
    let fillmsg = false;
    /* C apply.c:4136-4137 shop_damage -- set inside the WAN_DIGGING arm below,
     * read once after the loop by the pay_for_damage("dig into", FALSE) call. */
    let shop_damage = false;
    /* C apply.c:4029-4030 — the 9-direction loop, i <= N_DIRS (index N_DIRS
     * is xdir[8]=ydir[8]=0, the hero's own square, handled LAST). */
    for (let i = 0; i <= N_DIRS; i++) {
        const x = obj.ox + xdir[i], y = obj.oy + ydir[i];
        /* C apply.c:4038-4039 gb.bhitpos.x = x = obj->ox + xdir[i]; ... */
        game.bhitpos = { x, y };
        if (!isok(x, y)) continue;
        if (otyp === WAN_DIGGING) {
            /* C apply.c:4034 dig_check(BY_OBJECT, x, y) -- js/dig.js's own
             * BY_OBJECT_ constant (its madeby convention) is `null`, not
             * exported; pass the equivalent literal directly. */
            const dcres = dig_check_(null, x, y);
            if (dcres < DIGCHECK_FAILED || dcres === DIGCHECK_FAIL_BOULDER) {
                const lev = g.level && g.level.at ? g.level.at(x, y) : null;
                const levTyp = lev ? (lev.typ | 0) : 0;
                if (IS_WALL(levTyp) || IS_DOOR(levTyp)) {
                    await watch_dig(null, x, y, true);
                    const shopHere = in_rooms(x, y, SHOPBASE);
                    if (shopHere && shopHere.length && shopHere[0])
                        shop_damage = true;
                }
                if (levTyp === ICE)
                    spot_stop_timers(x, y, MELT_ICE_AWAY);
                /* C apply.c:4046 fillholetyp(x, y, FALSE) */
                const typ = fillholetyp_(x, y, false);
                if (typ !== ROOM) {
                    if (lev) { lev.typ = typ; lev.flags = 0; }
                    await liquid_flow_(x, y, typ, t_at(x, y),
                        fillmsg ? null
                            : 'Some holes are quickly filled with %s!');
                    fillmsg = true;
                } else {
                    await digactualhole_(x, y, null /* BY_OBJECT */,
                        (rn2(obj.spe | 0) < 3
                         || (!Can_dig_down(u.uz) && !(lev && lev.candig)))
                            ? PIT : HOLE);
                }
            }
            await fill_pit(x, y);
            await maybe_dunk_boulders(x, y);
            recalc_block_point(x, y);
            continue;
        } else if (otyp === WAN_CREATE_MONSTER) {
            /* C apply.c:4079-4082 — makemon(0, u.ux, u.uy, NO_MM_FLAGS), one
             * call per valid direction (up to 9), always at the hero's own
             * square regardless of which offset produced it. */
            await makemon(null, u.ux, u.uy, 0 /* NO_MM_FLAGS */);
            continue;
        } else if (x !== u.ux || y !== u.uy) {
            const mon = m_at(x, y);
            if (mon) {
                if (otyp === WAN_LIGHT) {
                    /* C zap.c:473-478 bhitm() case WAN_LIGHT (broken wand):
                     * flash_hits_mon(); then the shared wake/reveal tail. */
                    let learn_it = false, reveal_invis = false;
                    if (await flash_hits_mon(mon, obj)) {
                        learn_it = true;
                        reveal_invis = true;
                    }
                    await _bhitm_wand_epilogue(mon, false, reveal_invis, learn_it, obj);
                } else {
                    await bhitm(mon, obj);
                }
            }
            if (affects_objects && g.level?.levelObjects?.[x]?.[y]) {
                await bhitpile(obj, bhito, x, y, 0);
                /* C apply.c:4101-4102 — `if (disp.botl) bot();`, potion
                 * effects. */
                if (g.disp.botl)
                    await bot();
            }
        } else {
            /* C apply.c:4116-4128 — the hero's own square: objects first
             * (affects_objects), then zapyourself(), then losehp() if it did
             * damage. zapyourself already ports every otyp this loop can
             * reach here (WAN_LIGHT/SLOW_MONSTER/SPEED_MONSTER/SLEEP/
             * UNDEAD_TURNING all have real bodies in js/zap.js). */
            if (affects_objects && g.level?.levelObjects?.[x]?.[y]) {
                await bhitpile(obj, bhito, x, y, 0);
                /* C apply.c:4119-4120 — `if (disp.botl) bot();`, potion
                 * effects. */
                if (g.disp.botl)
                    await bot();
            }
            const selfDamage = await zapyourself(obj, false);
            if (selfDamage) {
                await losehp(flooreffects_Maybe_Half_Phys(selfDamage),
                    'killed self by breaking a wand', NO_KILLER_PREFIX);
            }
            /* C apply.c:4127-4128 — `if (disp.botl) bot();`, blindness;
             * unconditional on affects_objects/selfDamage, always checked at
             * the end of the hero's-own-square branch. */
            if (g.disp.botl)
                await bot();
        }
    }
    /* C apply.c:4133 zapwrapup() — do_osshock()'s "You feel shuddering
     * vibrations." feedback after a polymorphing wand break. */
    await zapwrapup();
    /* C apply.c:4136-4137 — shop_damage is only ever set inside the
     * WAN_DIGGING arm above (a wall/door dug within a shop). */
    if (shop_damage)
        await pay_for_damage('dig into', false);
    if (otyp === WAN_LIGHT) {
        /* C apply.c:4140-4141 — litroom(TRUE, obj); only needs to be done
         * once. */
        await litroom(true, obj);
    }
    await _breakWandDiscard();
    return ECMD_TIME;
}

const _UM_M1_NOEYES = 0x00001000;    /* monflag.h M1_NOEYES */

const _UM_M1_SEE_INVIS = 0x01000000; /* monflag.h:109 M1_SEE_INVIS */

const _UM_S_VAMPIRE_MLET = 48;       /* defsym.h S_VAMPIRE, same value this
                                         file already uses at MBP_S_VAMPIRE */

const _UM_PM_UMBER_HULK = 225;       /* pm.generated.js PM_UMBER_HULK */

const _UM_PM_AMOROUS_DEMON = 290;    /* monsters.h PM_AMOROUS_DEMON (js/attrib.js:111) */

const _UM_S_GHOST = 54;              /* defsym.h S_GHOST */

const _UM_M1_HUMANOID = 0x00020000;  /* monflag.h M1_HUMANOID */

const _UM_MONSEEN_NORMAL = 0x0001, _UM_MONSEEN_SEEINVIS = 0x0002,
      _UM_MONSEEN_INFRAVIS = 0x0004; /* vision.h howmonseen() bitmask */

const _UM_SEENMON = _UM_MONSEEN_NORMAL | _UM_MONSEEN_SEEINVIS
    | _UM_MONSEEN_INFRAVIS; /* apply.c:1105 #define SEENMON */

function _um_haseyes(mdata) {
    return !!mdata && ((mdata.mflags1 | 0) & _UM_M1_NOEYES) === 0;
}

function _um_perceives(mdata) {
    return !!mdata && ((mdata.mflags1 | 0) & _UM_M1_SEE_INVIS) !== 0;
}

function _um_humanoid(mdata) {
    return !!mdata && ((mdata.mflags1 | 0) & _UM_M1_HUMANOID) !== 0;
}

/* C ref: do_name.c:1220-1245 monverbself(mon, monnamtext, verb, othertext) —
 * builds "<monnamtext> <verb> <othertext> {him|her|it}self", pluralizing
 * monnamtext/verb together when mon_nam_too(mon,mon) comes back "themselves"
 * (a hallucinating hero can randomly draw that gender via pronoun_gender's
 * PRONOUN_HALLU roll). The genders[3] "they"->"them" fixup (do_name.c:1234-
 * 1240) is ported exactly as C has it, bug and all: makeplural() turns a bare
 * "It"/"it" monnamtext into "They"/"they", and this immediately overwrites
 * THAT back to "Them"/"them" — i.e. the fixed-up text ends up the OBJECT-case
 * pronoun in subject position. Rare (monnamtext is normally a proper monster
 * name, not a bare pronoun); left exactly as C has it per Cardinal Rule 1. */
function _um_monverbself(mon, monnamtext, verb, othertext) {
    const selfbuf = mon_nam_too(mon, mon);
    const verbs = vtense(selfbuf, verb);
    if (verb === verbs) {
        monnamtext = makeplural_objnam(monnamtext);
        if (monnamtext.toLowerCase() === 'they') {
            const capitaliz = monnamtext[0] === monnamtext[0].toUpperCase();
            monnamtext = capitaliz ? 'Them' : 'them';
        }
    }
    monnamtext = monnamtext + ' ' + verbs;
    if (othertext) monnamtext = monnamtext + ' ' + othertext;
    monnamtext = monnamtext + ' ' + selfbuf;
    return monnamtext;
}

/* C ref: apply.c:1075 bhit(u.dx, u.dy, COLNO, INVIS_BEAM, ...) — see the
 * header comment above for what this reduces to. */
function _um_bhit_invis_beam(dx, dy) {
    const g = game;
    const u = g.u || {};
    let x = u.ux | 0, y = u.uy | 0;
    for (let range = COLNO; range-- > 0; ) {
        x += dx; y += dy;
        if (!isok(x, y)) break;
        const mtmp = m_at(x, y);
        if (mtmp) g.notonhead = (g.gn ||= {}).notonhead = (x !== mtmp.mx || y !== mtmp.my);
        if (mtmp && (!(mtmp.minvis | 0) || _um_perceives(mtmp.data))) {
            g.gb = g.gb || {};
            g.bhitpos = g.gb.bhitpos = { x, y };
            return mtmp;
        }
        /* C ref: zap.c:4076 — `if (!ZAP_POS(typ) || closed_door(x, y)) {
         *     gb.bhitpos.x -= ddx; gb.bhitpos.y -= ddy; break; }`
         * checked AFTER the monster test above (a monster standing exactly on
         * the boundary square still stops/hits the beam there), so a wall or
         * closed door one step further ends the beam at the LAST passable
         * square instead of the wall/door tile the port used to walk onto. */
        const loc = g.level?.locations?.[x]?.[y];
        const typ = (loc?.typ ?? 0) | 0;
        if (typ < POOL || closed_door(x, y)) {
            x -= dx; y -= dy;
            break;
        }
    }
    g.gb = g.gb || {};
    g.bhitpos = g.gb.bhitpos = { x, y };
    return null;
}

async function use_mirror(obj) {
    const g = game;
    const u = g.u = g.u || {};
    if (!(await getdir(null)))
        return ECMD_CANCEL;
    const Blind = _uprop_active('BLINDED');
    const invisMirror = _uprop_active('INVIS');
    const useeit = !Blind && (!invisMirror || _uprop_active('SEE_INVIS'));
    const uvisage = _um_beautiful();
    const mirror = _ia_simpleonames(obj); /* "mirror" or "looking glass" */
    if (obj.cursed && !rn2(2)) {
        if (!Blind)
            await pline_The("%s fogs up and doesn't reflect!", mirror);
        else
            await pline1(nothing_seems_to_happen);
        return ECMD_TIME;
    }
    if (!u.dx && !u.dy && !u.dz) {
        if (!useeit) {
            await You_cant('see your %s %s.', uvisage, body_part(FACE));
        } else if ((u.umonnum | 0) === PM_FLOATING_EYE) {
            if (_uprop_active('FREE_ACTION')) {
                await You('stiffen momentarily under your gaze.');
            } else {
                if (_uprop_active('HALLUC'))
                    await pline(`Yow!  The ${mirror} stares back!`);
                else
                    await pline("Yikes!  You've frozen yourself!");
                if (!_uprop_active('HALLUC') || !rn2(4)) {
                    nomul(-rnd(MAXULEV + 6 - (u.ulevel | 0)));
                    g.multi_reason = 'gazing into a mirror';
                }
                /* C apply.c:1055 gn.nomovemsg = 0 — C writes a NULL pointer, so
                 * nomul(0)'s later default ("You can move again.") is NOT
                 * silenced; obj.h:139-ish's empty-string sentinel is what this
                 * port used to write here, which suppressed that pline. */
                g.nomovemsg = null;
            }
        } else if ((game.youmonst?.data?.mlet | 0) === _UM_S_VAMPIRE_MLET
                   || _is_vampshifter(game.youmonst)) {
            await You("don't have a reflection.");
        } else if ((u.umonnum | 0) === _UM_PM_UMBER_HULK) {
            await pline("Huh?  That doesn't look like you!");
            await make_confused(_hprop(CONFUSION) + d(3, 4), false);
        } else if (_uprop_active('HALLUC')) {
            await You('look %s.', hcolor(null));
        } else if (_uprop_active('SICK')) {
            await You('look %s.', 'peaked');
        } else if ((u.uhs | 0) >= WEAK) {
            await You('look %s.', 'undernourished');
        } else if (Upolyd(u)) {
            /* C ref: apply.c:1069-1070 —
             *     You("look like %s.", an(pmname(&mons[u.umonnum], Ugender)));
             * you.h:555 Ugender: `(Upolyd ? u.mfemale : flags.female) ? 1 : 0`
             * (MALE=0/FEMALE=1, const.js) — the same Upolyd-vs-flags.female
             * split js/makemon.js:5199 already uses for monPmname's gender
             * arg. */
            const ugender = (Upolyd(u) ? !!u.mfemale : !!g.flags?.female) ? 1 : 0;
            await You('look like %s.', an(pmname(permonstTemplate(u.umonnum | 0), ugender)));
        } else {
            await You(`look as ${uvisage} as ever.`);
        }
        return ECMD_TIME;
    }
    if (u.uswallow) {
        if (useeit)
            await You(`reflect ${s_suffix(mon_nam(u.ustuck))} `
                + `${mbodypart(u.ustuck, STOMACH)}.`);
        return ECMD_TIME;
    }
    if (u.uinwater) {
        if (useeit)
            await You(_uprop_active('HALLUC')
                ? 'give the fish a chance to fix their makeup.'
                : 'reflect the murky water.');
        return ECMD_TIME;
    }
    if (u.dz) {
        if (useeit)
            await You(`reflect the ${(u.dz > 0)
                ? surface(u.ux | 0, u.uy | 0)
                : ceiling(u.ux | 0, u.uy | 0)}.`);
        return ECMD_TIME;
    }
    const mtmp = _um_bhit_invis_beam(u.dx | 0, u.dy | 0);
    if (!mtmp || !_um_haseyes(mtmp.data) || g.gn?.notonhead)
        return ECMD_TIME;
    /* C apply.c:1101-1149 — the monster-reaction ladder; see the function
     * header comment for the two named gaps. */
    const vis = canseemon(mtmp);
    const how_seen = vis ? howmonseen(mtmp) : 0;
    const monable = !(mtmp.mcan | 0) && (!(mtmp.minvis | 0) || _um_perceives(mtmp.data));
    const mlet = mtmp.data ? (mtmp.data.mlet | 0) : -1;
    if (mtmp.msleeping) {
        if (vis)
            await pline(`${Monnam(mtmp)} is too tired to look at your ${mirror}.`);
    } else if (!mtmp.mcansee) {
        if (vis)
            await pline(`${Monnam(mtmp)} can't see anything right now.`);
    } else if (invisMirror && !_um_perceives(mtmp.data)) {
        if (vis)
            await pline(`${Monnam(mtmp)} fails to notice your ${mirror}.`);
    } else if ((how_seen & _UM_SEENMON) === _UM_MONSEEN_INFRAVIS) {
        if (vis)
            await pline(`${_um_monverbself(mtmp, Monnam(mtmp), 'are',
                'too far away to see')} in the dark.`);
    } else if (mlet === _UM_S_VAMPIRE_MLET || mlet === _UM_S_GHOST
               || _is_vampshifter(mtmp)) {
        if (vis)
            await pline(`${Monnam(mtmp)} doesn't have a reflection.`);
    } else if (monable && (mtmp.mnum | 0) === PM_MEDUSA) {
        if (await _um_mon_reflects(mtmp, "The gaze is reflected away by %s %s!"))
            return ECMD_TIME;
        if (vis)
            await pline(`${Monnam(mtmp)} is turned to stone!`);
        /* C apply.c:1137-1138 */
        game.stoned = true;
        await killed(mtmp);
    } else if (monable && (mtmp.mnum | 0) === PM_FLOATING_EYE) {
        /* C apply.c:1140 d(m_lev, mtmp->data->mattk[0].damd) — floating eye
         * ATTK(AT_NONE, AD_PLYS, 0, 70), monsters.h:335-336. */
        let tmp = d(mtmp.m_lev | 0, mtmp.data.mattk[0].damd | 0);
        if (!rn2(4))
            tmp = 120;
        if (vis)
            await pline(`${Monnam(mtmp)} is frozen by its reflection.`);
        else
            await You_hear('%s stop moving.', 'something');
        paralyze_monst(mtmp, (mtmp.mfrozen | 0) + tmp);
    } else if (monable && (mtmp.mnum | 0) === _UM_PM_UMBER_HULK) {
        if (vis)
            await pline(`${Monnam(mtmp)} confuses itself!`);
        mtmp.mconf = 1;
    } else if (monable && (mlet === _UB_S_NYMPH || (mtmp.mnum | 0) === _UM_PM_AMOROUS_DEMON)) {
        if (vis) {
            await pline(`${_um_monverbself(mtmp, Monnam(mtmp), 'admire', null)} `
                + `in your ${mirror}.`);
            await pline(`${upstart(mhe(mtmp))} takes it!`);
        } else {
            await pline(`It steals your ${mirror}!`);
        }
        setnotworn(obj);
        freeinv(obj);
        await mpickobj(mtmp, obj);
        if (!tele_restrict(mtmp))
            await rloc(mtmp, RLOC_MSG);
    } else if (!thit_is_unicorn(mtmp.data) && !_um_humanoid(mtmp.data)
               && !_is_demon(mtmp.data)
               && (!(mtmp.minvis | 0) || _um_perceives(mtmp.data)) && rn2(5)) {
        let do_react = true;
        if (mtmp.mfrozen) {
            if (vis)
                await You(`discern no obvious reaction from ${mon_nam(mtmp)}.`);
            else
                await _You_feel('a bit silly gesturing the mirror in that direction.');
            do_react = false;
        }
        if (do_react) {
            if (vis)
                await pline(`${Monnam(mtmp)} is frightened by its reflection.`);
            await monflee(mtmp, d(2, 4), false, false);
        }
    } else if (!Blind) {
        if (mtmp.minvis && !_uprop_active('SEE_INVIS')) {
            /* no message */
        } else if ((mtmp.minvis && !_um_perceives(mtmp.data))
                   /* redundant: can't get here if these are true */
                   || !_um_haseyes(mtmp.data) || g.gn?.notonhead || !mtmp.mcansee) {
            await pline(`${Monnam(mtmp)} doesn't seem to notice ${_um_mhis(mtmp)} reflection.`);
        } else {
            await pline(`${Monnam(mtmp)} ignores ${_um_mhis(mtmp)} reflection.`);
        }
    }
    return ECMD_TIME;
}

/* C apply.c:1202-1315 use_bell(struct obj **optr) — ring a plain bell or the
 * Bell of Opening. `void`; the caller (doapply's BELL/BELL_OF_OPENING case,
 * above) never reassigns its own `res`, so the turn is ALWAYS spent
 * regardless of what happens inside. */
const Hero_playnotes = (_ins, _str, _vol) => {};

const _UB_S_NYMPH = 14; /* monst.h S_NYMPH — same literal js/mhitu.js:6124, js/music.js:72 */

async function use_bell(obj) {
    // Share music.c's lookup; load lazily as in doapply's instrument arm.
    const { obj_to_instr } = await import('./music.js');
    const g = game, u = g.u || {};
    const otyp = obj.otyp | 0;
    const ordinary = (otyp !== _IA_BELL_OF_OPENING_OTYP) || !(obj.spe | 0);
    const invoking = (otyp === _IA_BELL_OF_OPENING_OTYP)
        && invocation_pos(u.ux, u.uy) && !On_stairs(u.ux, u.uy);
    let wakem = false, learno = false;

    Hero_playnotes(obj_to_instr(obj), 'C', 100);
    /* C apply.c:1213: a plain You(); when swallowed, openit()'s expulsion
     * text joins it on the topline if it fits (topl.c update_topl). */
    await pline(`You ring ${the(xname(obj))}.`);

    if (_Underwater() || (u.uswallow && ordinary)) {
        await pline('But the sound is muffled.');
    } else if (invoking && ordinary) {
        /* C apply.c:1217-1219 — needs recharging. */
        await pline('But it makes no sound.');
        learno = true;
    } else if (ordinary) {
        if (obj.cursed && !rn2(4)
            && !((g.mvitals?.[PM_WOOD_NYMPH]?.mvflags | 0) & G_GONE)
            && !((g.mvitals?.[PM_WATER_NYMPH]?.mvflags | 0) & G_GONE)
            && !((g.mvitals?.[PM_MOUNTAIN_NYMPH]?.mvflags | 0) & G_GONE)) {
            const mtmp = await makemon(mkclass(_UB_S_NYMPH, 0),
                u.ux, u.uy, NO_MINVENT | MM_NOMSG);
            if (mtmp) {
                await pline(`You summon ${_mh_a_monnam(mtmp)}!`);
                if (!obj_resists(obj, 93, 100)) {
                    await pline(`${_objnam_Tobjnam(obj, 'have')} shattered!`);
                    await useup(obj);
                } else {
                    switch (rn2(3)) {
                        default: break;
                        case 1:
                            mon_adjust_speed(mtmp, 2, null);
                            break;
                        case 2:
                            g.nomovemsg = '';
                            g.multi_reason = null;
                            nomul(-rnd(2));
                            break;
                    }
                }
            }
        }
        wakem = true;
    } else {
        /* C apply.c:1249-1298 — charged Bell of Opening. */
        consume_obj_charge(obj, true);
        if (u.uswallow) {
            if (!obj.cursed) {
                await openit();
            } else {
                await pline1(nothing_happens);
            }
        } else if (obj.cursed) {
            /* C apply.c:1259-1264 — mm.x = u.ux; mm.y = u.uy;
             * mkundead(&mm, FALSE, NO_MINVENT); wakem = TRUE;
             * mkundead below takes C's `coord *mm` shape, not two scalars. */
            await mkundead({ x: u.ux, y: u.uy }, false, NO_MINVENT);
            wakem = true;
        } else if (invoking) {
            /* C apply.c:1265-1269. */
            await pline(`${_objnam_Tobjnam(obj, 'issue')} an unsettling shrill sound...`);
            obj.age = g.moves | 0;
            learno = true;
            wakem = true;
        } else if (obj.blessed) {
            let res = 0;
            if (u.uchain) {
                /* C apply.c:1277-1279 */
                await unpunish_invent();
                res = 1;
            } else if (u.utrap && (u.utraptype | 0) === TT_BURIEDBALL) {
                await buried_ball_to_freedom();
                res = 1;
            }
            res += await openit();
            if (res === 0) {
                await pline1(nothing_happens);
            } else if (res === 1) {
                await pline('Something opens...');
                learno = true;
            } else {
                await pline('Things open around you...');
                learno = true;
            }
        } else {
            /* uncursed */
            if ((await findit()) !== 0) {
                learno = true;
            } else {
                await pline1(nothing_happens);
            }
        }
    }
    if (learno) {
        makeknown(_IA_BELL_OF_OPENING_OTYP);
        obj.known = 1;
    }
    if (wakem) wake_nearby(true);
}

/* C ref: apply.c:2510-2541 figurine_location_checks(obj, cc, quietly) — is the
 * square at `cc` (or the hero's own square when cc is null) legal ground for
 * the figurine's monster type: not obstructed terrain (unless the monster
 * passes walls and the square is passwall-able), and not a boulder square
 * (unless the monster passes walls or throws rocks). `carried(obj) &&
 * u.uswallow` is the one caller-independent early-out. */
export async function figurine_location_checks(obj, cc, quietly) {
    const g = game, u = g.u || {};
    if (((obj.where | 0) === OBJ_INVENT) && u.uswallow) {
        if (!quietly) await You("don't have enough room in here.");
        return false;
    }
    const x = cc ? (cc.x | 0) : (u.ux | 0);
    const y = cc ? (cc.y | 0) : (u.uy | 0);
    if (!isok(x, y)) {
        if (!quietly) await You('cannot put the figurine there.');
        return false;
    }
    const lev = g.level?.locations?.[x]?.[y];
    const typ = lev ? (lev.typ | 0) : 0;
    const pm = permonstTemplate(obj.corpsenm | 0);
    const passesWalls = !!pm && flooreffects_passes_walls(pm);
    if (IS_OBSTRUCTED(typ) && !(passesWalls && may_passwall(x, y))) {
        if (!quietly) {
            await You(`cannot place a figurine in ${IS_TREE(typ) ? 'a tree'
                : 'solid rock'}!`);
        }
        return false;
    }
    const throwsRocks = !!pm && flooreffects_throws_rocks(pm);
    if (sobj_at(BOULDER, x, y) && !passesWalls && !throwsRocks) {
        if (!quietly) await You('cannot fit the figurine on the boulder.');
        return false;
    }
    return true;
}

async function use_figurine(obj) {
    const g = game, u = g.u = g.u || {};
    if (u.uswallow) {
        if (!(await figurine_location_checks(obj, null, false)))
            return ECMD_OK;
    }
    if (!(await getdir(null))) {
        g.context = g.context || {};
        g.context.move = 0;
        g.multi = 0;
        if (g.gm) g.gm.multi = 0;
        return ECMD_CANCEL;
    }
    const x = (u.ux | 0) + (u.dx | 0), y = (u.uy | 0) + (u.dy | 0);
    const cc = { x, y };
    /* "Passing FALSE arg here will result in messages displayed" */
    if (!(await figurine_location_checks(obj, cc, false)))
        return ECMD_TIME;
    const Blind = _uprop_active('BLINDED');
    await You('%s and it %stransforms.',
        (u.dx || u.dy) ? 'set the figurine beside you'
            : (Is_airlevel(u.uz) || Is_waterlevel(u.uz) || is_pool(cc.x, cc.y))
                ? 'release the figurine'
                : ((u.dz | 0) < 0 ? 'toss the figurine into the air'
                                  : 'set the figurine on the ground'),
        Blind ? 'supposedly ' : '');
    await make_familiar(obj, cc.x, cc.y, false);
    stop_timer(FIG_TRANSFORM, obj_to_any(obj));
    await useup(obj);
    if (Blind) map_invisible(cc.x, cc.y);
    return ECMD_TIME;
}

export async function use_pole(obj, autohit) {
    const g = game, u = g.u = g.u || {};
    if (u.uswallow) {
        await pline("There's not enough room here to use that.");
        return ECMD_OK;
    }
    if (obj !== u.uwep) {
        if (await wield_tool(obj, 'swing')) {
            cmdq_add_ec(CQ_CANNED, 'doapply');
            cmdq_add_key(CQ_CANNED, obj.invlet);
            return ECMD_TIME;
        }
        return ECMD_OK;
    }
    /* C ref: apply.c:3371-3384 calc_pole_range — min is always 4 (squared
     * distance == exactly 2 squares in a straight line); max widens with
     * polearm skill. */
    const skillType = u.twoweap ? P_TWO_WEAPON_COMBAT_POLE : weapon_type(u.uwep);
    const minRange = 4;
    const maxRange = (skillType === P_NONE || P_SKILL(skillType) <= P_BASIC) ? 4
        : (P_SKILL(skillType) === P_SKILLED) ? 5 : 8;
    g._polearmRangeMin = minRange;
    g._polearmRangeMax = maxRange;
    if (!autohit)
        await pline('Where do you want to hit?');
    /* C ref: apply.c:3455-3461 — `cc.x = u.ux; cc.y = u.uy;` then, if
     * find_poleable_mon(&cc) finds no UNIQUE candidate, C falls back to the
     * remembered `svc.context.polearm.hitmon` (last turn's pole target) when
     * it is still alive/sensed/in range (mdistu within min..max range). */
    let cc = _up_find_poleable_mon(minRange, maxRange);
    if (!cc) {
        cc = { x: u.ux | 0, y: u.uy | 0 };
        /* apply.c:3456-3461 — fall back to last turn's pole target */
        const hitm = g.svc?.context?.polearm?.hitmon;
        if (hitm && !DEADMONSTER(hitm) && sensemon(hitm)) {
            const md = dist2(hitm.mx, hitm.my, u.ux | 0, u.uy | 0);
            if (md <= maxRange && md >= minRange)
                cc = { x: hitm.mx, y: hitm.my };
        }
    }
    if (!autohit) {
        await getpos_sethilite(_up_display_polearm_positions, _up_get_valid_polearm_position);
        if (await getpos(cc, true, 'the spot to hit') < 0)
            return ECMD_CANCEL;
    }
    const glyph = _glyph_at(cc.x, cc.y); /* C apply.c:3471: before unmap_invisible */
    const statueGlyph = glyph?.cls === GLYPHCLS_OBJ
        && glyph.otyp === _UP_STATUE_OTYP && Number.isInteger(glyph.corpsenm);
    const dist = dist2(cc.x, cc.y, u.ux | 0, u.uy | 0);
    if (dist > maxRange) {
        await pline('Too far!');
        return ECMD_FAIL;
    } else if (dist < minRange) {
        if (autohit && u_at(cc.x, cc.y))
            await pline("Don't know what to hit.");
        else
            await pline('Too close!');
        return ECMD_FAIL;
    }
    if (!cansee(cc.x, cc.y)
        && !(glyph?.cls === GLYPHCLS_MON || glyph?.cls === GLYPHCLS_INVIS
             || statueGlyph)) {
        await You("won't hit anything if you can't see that spot.");
        return ECMD_FAIL;
    } else if (!couldsee(cc.x, cc.y)) { /* apply.c:3484 */
        await You("can't reach that spot from here.");
        return ECMD_FAIL;
    }
    g.svc = g.svc || {};
    g.svc.context = g.svc.context || {};
    g.svc.context.polearm = g.svc.context.polearm || {};
    g.svc.context.polearm.hitmon = null; /* C apply.c:3488 */
    g.gb = g.gb || {};
    g.bhitpos = g.gb.bhitpos = { x: cc.x, y: cc.y }; /* C apply.c:3491: one impact position */
    /* C apply.c:3427 `boolean freehit = FALSE;` — only the Snickersnee free
     * hit below can flip it; every path shares the single tail return at the
     * bottom of this function (apply.c:3561-3562). */
    let freehit = false;
    const mtmp = m_at(cc.x, cc.y);
    if (mtmp) {
        /* C apply.c:3489-3521 — monster on the target square. */
        if (await attack_checks(mtmp, u.uwep))
            /* res is always ECMD_OK (0) by this point: every earlier arm of
             * this function returns directly instead of reassigning it. */
            return g.context?.move ? ECMD_TIME : ECMD_OK;
        if (await overexertion())
            return ECMD_TIME; /* burn nutrition; maybe pass out */
        g.svc.context.polearm.hitmon = mtmp;
        if (obj === u.uwep && u_wield_art(ART_SNICKERSNEE)
            && g.svc.context.snickersnee_turn === (g.moves | 0)) {
            await pline_The("blade doesn't reach there!");
            return ECMD_FAIL;
        }
        check_caitiff(mtmp);
        g.notonhead = ((cc.x | 0) !== (mtmp.mx | 0) || (cc.y | 0) !== (mtmp.my | 0));
        /* C apply.c:3510-3517 — Snickersnee's one free hit per turn from a
         * distance. Soundeffect() is a no-op in this build (same as every
         * other instrument call in this file); the "Shkinng!" pline still
         * fires per C. */
        if (obj === u.uwep && u_wield_art(ART_SNICKERSNEE)) {
            freehit = (g.moves | 0) !== g.svc.context.snickersnee_turn;
            g.svc.context.snickersnee_turn = (g.moves | 0);
            if (freehit && !_hero_Deaf())
                await pline('Shkinng!');
        }
        await thitmonst(mtmp, u.uwep);
    } else {
        /* C apply.c:3522-3560 — require both the displayed glyph and the
         * corresponding object before striking a statue or boulder. */
        const lev = g.level?.locations?.[cc.x]?.[cc.y];
        const typ = lev ? (lev.typ | 0) : 0;
        /* C apply.c:3522: any displayed object can conceal a statue. */
        const statueObj = statueGlyph && lev
            ? sobj_at(_UP_STATUE_OTYP, cc.x, cc.y) : null;
        if (statueObj) {
            /* C apply.c:3524-3537 — only an ACTIVE statue trap on this square
             * diverts to activate_statue_trap(); js/trap.js's port of that
             * function is file-local (not exported), so this throws rather than
             * fabricate the animate-statue outcome. Every other case (no trap
             * here, or a trap that isn't a STATUE_TRAP) falls to C's own else
             * arm: the plain "Thump!" bounce + wake_nearto. */
            const trapHere = t_at(cc.x, cc.y);
            if (trapHere && (trapHere.ttyp | 0) === STATUE_TRAP) {
                const animated = await activate_statue_trap(trapHere,
                    cc.x, cc.y, false);
                if (animated) {
                    /* animate_statue supplied the feedback; continue to the
                     * common engraving/turn tail below. */
                } else {
                    await pline('Thump!  Your blow bounces harmlessly off the statue.');
                    wake_nearto(cc.x, cc.y, 25);
                }
            } else {
                await pline('Thump!  Your blow bounces harmlessly off the statue.');
                wake_nearto(cc.x, cc.y, 25);
            }
        } else {
            /* C apply.c:3538 — unmap_invisible(gb.bhitpos.x, gb.bhitpos.y), fired
             * for every no-monster/no-statue square before the boulder/furniture/
             * miss split. */
            unmap_invisible(cc.x, cc.y);
            if (glyph?.cls === GLYPHCLS_OBJ && glyph.otyp === BOULDER
                && lev && sobj_at(BOULDER, cc.x, cc.y)) {
                await pline('Thump!  Your blow bounces harmlessly off the boulder.');
                wake_nearto(cc.x, cc.y, 25);
            } else if (!lev || !accessible(cc.x, cc.y) || IS_FURNITURE(typ)) {
                /* C apply.c:3553-3556: glyph_is_cmap(glyph) ? the(explanation)
                 * : "an unknown obstacle" — an object/monster glyph painted
                 * on the square (not STONE/SCORR) is not a cmap glyph. */
                const _upg = glyph;
                const _upSym = _upg ? _glyph_cmap_sym(cc.x, cc.y, _upg) : -1;
                const _upCmap = (typ === STONE || typ === SCORR || !_upg
                    || _upSym >= 0);
                await You('uselessly attack %s.',
                    (typ === STONE || typ === SCORR) ? 'stone'
                    : _upCmap ? (_upSym >= 0
                        ? the(DEFSYM_EXPLANATION[_upSym])
                        : _up_terrain_explanation(typ))
                    : 'an unknown obstacle');
            } else {
                await You('miss; there is no one there to hit.');
            }
        }
    }
    /* C apply.c:3561 u_wipe_engr(2) — "same as for melee or throwing".
     */
    if (can_reach_floor(true))
        wipe_engr_at(u.ux | 0, u.uy | 0, 2, false);
    return freehit ? ECMD_OK : ECMD_TIME; /* apply.c:3561-3562 */
}

/* C ref: apply.c:3549-3556 — the terrain-description half of use_pole's
 * furniture/inaccessible message. C indexes via `glyph_is_cmap(glyph) ?
 * the(defsyms[glyph_to_cmap(glyph)].explanation) : "an unknown obstacle"`;
 * glyph_at() has no js/ definition anywhere in this tree (see use_pole's own
 * header comment), so this derives the same defsyms explanation directly off
 * the terrain typ for the fixed set of typs this arm can ever see — exactly
 * what a seen, undisguised tile of that typ always renders as. */
function _up_terrain_explanation(typ) {
    if (typ === STONE || typ === SCORR) return 'stone';
    if (typ >= 1 && typ <= 12 /* VWALL..DBWALL, rm.h */) return the('wall');
    if (typ === STAIRS) return the('staircase');
    if (typ === LADDER) return the('ladder');
    if (typ === FOUNTAIN) return the('fountain');
    if (typ === THRONE) return the('opulent throne');
    if (typ === SINK) return the('sink');
    if (typ === GRAVE) return the('grave');
    if (typ === ALTAR) return the('altar');
    return 'an unknown obstacle';
}

/* C ref: apply.c:3333-3353 display_polearm_positions. */
function _up_display_polearm_positions(on_off) {
    if (on_off) {
        const u = game.u;
        tmp_at(DISP_BEAM, cmap_to_glyph(S_goodpos));
        for (let dx = -3; dx <= 3; dx++)
            for (let dy = -3; dy <= 3; dy++) {
                const x = dx + u.ux, y = dy + u.uy;
                if (_up_get_valid_polearm_position(x, y))
                    tmp_at(x, y);
            }
    } else {
        tmp_at(DISP_END, 0);
    }
}

/* C ref: apply.c:691-695 um_dist() - check if distance from hero to target exceeds threshold.
 * Returns 1 if abs(u.ux - x) > n OR abs(u.uy - y) > n, else 0. Used in leash logic. */
export function um_dist(x, y, n) {
    const u = game.u;

    const dx = Math.abs((u.ux | 0) - (x | 0));
    const dy = Math.abs((u.uy | 0) - (y | 0));
    const dn = n | 0;

    return (dx > dn || dy > dn) ? 1 : 0;
}

/* C ref: apply.c:1471-1491 snuff_candle(struct obj *otmp)
 * Check if otmp is a lit candle or candelabrum. If so, output a message
 * about the flame being extinguished and call end_burn.
 * Returns TRUE if the object was snuffed, FALSE otherwise.
 */
const BRASS_LANTERN = 226, OIL_LAMP = 227, MAGIC_LAMP = 228;

export async function snuff_candle(otmp) {
    const TALLOW_CANDLE = 224;
    const WAX_CANDLE = 225;
    const CANDELABRUM_OF_INVOCATION = 262;

    // C: boolean candle = Is_candle(otmp);
    const candle = (otmp.otyp === TALLOW_CANDLE || otmp.otyp === WAX_CANDLE);

    // C: if ((candle || otmp->otyp == CANDELABRUM_OF_INVOCATION) && otmp->lamplit)
    if ((candle || otmp.otyp === CANDELABRUM_OF_INVOCATION) && otmp.lamplit) {
        // C: char buf[BUFSZ];
        // C: coordxy x, y;
        // C: boolean many = candle ? (otmp->quan > 1L) : (otmp->spe > 1);
        const many = candle ? (otmp.quan > 1) : (otmp.spe > 1);

        // C: (void) get_obj_location(otmp, &x, &y, 0);
        const _xb = { value: 0 }, _yb = { value: 0 };
        get_obj_location(otmp, _xb, _yb, 0);
        const x = _xb.value, y = _yb.value;

        // C: if (otmp->where == OBJ_MINVENT ? cansee(x, y) : !Blind)
        const Blind = _Blind_cmd();
        const can_see = (otmp.where === OBJ_MINVENT) ? cansee(x, y) : !Blind;

        if (can_see) {
            // C: pline("%s%scandle%s flame%s extinguished.", Shk_Your(buf, otmp),
            //          (candle ? "" : "candelabrum's "), (many ? "s'" : "'s"),
            //          (many ? "s are" : " is"));
            const buf = Shk_Your(otmp);
            const candelabrum_part = candle ? "" : "candelabrum's ";
            const plural_part1 = many ? "s'" : "'s";
            const plural_part2 = many ? "s are" : " is";
            /* js/display.js:3124 pline() takes a SINGLE string; passing C's
             * varargs printed the literal "%s%scandle...". Format first. */
            await pline(_plineVFmt("%s%scandle%s flame%s extinguished.",
                                   [buf, candelabrum_part, plural_part1, plural_part2]));
        }

        // C: end_burn(otmp, TRUE);
        end_burn(otmp, true);
        // C: return TRUE;
        return true;
    }
    // C: return FALSE;
    return false;
}

/* C ref: apply.c:1496-1515 snuff_lit(struct obj *obj)
 * Extinguish a lamp, lantern, or candle. Returns TRUE if snuffed, FALSE otherwise.
 */
export async function snuff_lit(obj) {
    // C: if (obj->lamplit) {
    if (obj.lamplit) {
        // C: if (obj->otyp == OIL_LAMP || obj->otyp == MAGIC_LAMP
        //     || obj->otyp == BRASS_LANTERN || obj->otyp == POT_OIL) {
        if (obj.otyp === OIL_LAMP || obj.otyp === MAGIC_LAMP
            || obj.otyp === BRASS_LANTERN || obj.otyp === POT_OIL) {
            // C: (void) get_obj_location(obj, &x, &y, 0);
            const _xb = { value: 0 }, _yb = { value: 0 };
            get_obj_location(obj, _xb, _yb, 0);
            const x = _xb.value, y = _yb.value;
            // C: if (obj->where == OBJ_MINVENT ? cansee(x, y) : !Blind)
            const Blind = _Blind_cmd();
            const can_see = (obj.where === OBJ_MINVENT) ? cansee(x, y) : !Blind;
            if (can_see)
                // C: pline("%s %s out!", Yname2(obj), otense(obj, "go"));
                await pline("%s %s out!", Yname2(obj), otense(obj, "go"));
            // C: end_burn(obj, TRUE);
            end_burn(obj, true);
            // C: return TRUE;
            return true;
        }
        // C: if (snuff_candle(obj))
        if (await snuff_candle(obj))
            // C: return TRUE;
            return true;
    }
    // C: return FALSE;
    return false;
}

/* C ref: apply.c:1517-1571 splash_lit — a lit light source hit by water.  A
 * brass lantern is only snuffed when submerged (hero dunk) or when it is not
 * carried; the carried arm checks for hero inventory by walking game.invent
 * (obj.where is not stamped on every path, see Shk_Your). */
export async function splash_lit(obj) {
    const u = game.u;
    let dunk = false;
    if (obj.lamplit && obj.otyp === BRASS_LANTERN) {
        let owned = (obj.where | 0) === OBJ_INVENT;
        for (let o = game.invent; o && !owned; o = o.nobj)
            if (o === obj) owned = true;
        let snuff = true;
        if (owned) {
            const useeit = !_Blind_cmd();
            const uhearit = !_hero_Deaf();
            dunk = is_pool(game.u.ux, game.u.uy)
                && ((!pooleffects_Levitation() && !pooleffects_Flying()
                     && !pooleffects_Wwalking()) || Is_waterlevel(game.u.uz));
            snuff = false;
            if (useeit || uhearit)
                await pline('%s %s%s%s.', Yname2(obj),
                            uhearit ? 'crackles' : '',
                            (uhearit && useeit) ? ' and ' : '',
                            useeit ? 'flickers' : '');
        } else if ((obj.where | 0) === OBJ_MINVENT && _th_humanoid(obj.ocarry.data)) {
            /* C apply.c:1539-1553: a humanoid monster's lantern is only
             * snuffed when the monster is dunked in water. */
            const mtmp = obj.ocarry, xp = { value: 0 }, yp = { value: 0 };
            const useeit = get_obj_location(obj, xp, yp, 0) && cansee(xp.value, yp.value);
            const uhearit = couldsee(xp.value, yp.value) && dist2(xp.value, yp.value, u.ux, u.uy) < 5 * 5;
            dunk = is_pool(mtmp.mx, mtmp.my)
                && ((!_st_is_flyer(mtmp.data) && !_st_is_floater(mtmp.data)) || Is_waterlevel(u.uz));
            snuff = false;
            if (useeit) set_msg_xy(xp.value, yp.value);
            if (useeit || uhearit)
                await pline('%s %s%s%s.', Yname2(obj), uhearit ? 'crackles' : '',
                            (uhearit && useeit) ? ' and ' : '', useeit ? 'flickers' : '');
        }
        if (!dunk && !snuff)
            return false;
    }
    const result = await snuff_lit(obj);
    if (dunk) {
        /* drain some of the battery but don't short it out entirely */
        obj.age -= (obj.age > 200) ? 100 : Math.trunc(obj.age / 2);
    }
    return result;
}

const _FTB_SPE_BLANK_PAPER = 407, _FTB_SPE_NOVEL = 408,
      _FTB_SPE_BOOK_OF_THE_DEAD = 409;

const _FTB_NH_RED = 'red'; /* decl.c NH_RED — hcolor() returns it verbatim
                            * unless the hero is hallucinating. */

/* C spell.h:12 MAX_SPELL_STUDY 3 (js/const.js:1188). */
const _FTB_MAX_SPELL_STUDY = 3;

const se_rustling_paper = 142; /* seffects.h:156 */

async function flip_through_book(obj) {
    const otyp = obj.otyp | 0;
    const Blind = _Blind_cmd();
    const Hallucination = _cmd_Hallucination();

    /* C:4475-4478 */
    if (_Underwater()) {
        await You("don't want to get the pages even more soggy, do you?");
        return ECMD_OK;
    }

    /* C:4480 */
    await You("flip through the pages of %s.", thesimpleoname(obj));

    if (otyp === _FTB_SPE_BOOK_OF_THE_DEAD) {
        /* C:4482-4494 */
        if (!_hero_Deaf()) {
            if (!Hallucination)
                Soundeffect(se_rustling_paper, 50);
            await You_hear("the pages make an unpleasant %s sound.",
                           Hallucination ? "chuckling" : "rustling");
        } else if (!Blind) {
            await You_see("the pages glow faintly %s.", hcolor(_FTB_NH_RED));
        } else {
            await _You_feel("the pages tremble.");
        }
    } else if (Blind) {
        /* C:4495-4498 */
        await pline("The pages feel %s.",
                    Hallucination ? "freshly picked" : "rough and dry");
    } else if (otyp === _FTB_SPE_BLANK_PAPER) {
        /* C:4499-4503 */
        await pline("This spellbook %s.",
                    Hallucination ? "doesn't have much of a plot"
                                  : "has nothing written in it");
        makeknown(otyp);
    } else if (Hallucination) {
        /* C:4504-4505 */
        await You("enjoy the animated initials.");
    } else if (otyp === _FTB_SPE_NOVEL) {
        /* C:4506-4507 */
        await pline("This looks like it might be interesting to read.");
    } else {
        /* C:4508-4520 */
        const fadeness = [
            "fresh",
            "slightly faded",
            "very faded",
            "extremely faded",
            "barely visible",
        ];
        const findx = Math.min(obj.spestudied | 0, _FTB_MAX_SPELL_STUDY);

        await pline("The%s ink in this spellbook is %s.",
                    _ftb_oc_magic(otyp) ? " magical" : "",
                    fadeness[findx]);
    }

    return ECMD_TIME;
}

/* C ref: objects[otyp].oc_magic — read from the generated table, the same one
 * js/read.js:1560 _oc_magic() reads. */
function _ftb_oc_magic(otyp) {
    return !!MKOBJ_OC_MAGIC[otyp | 0];
}

const _UL_BRASS_LANTERN = 226, _UL_OIL_LAMP = 227, _UL_MAGIC_LAMP = 228;

/* C do_wear.c:60-65 — use the shared fingers/gloves naming body for lamp
 * and grease feedback too. */
function _ul_fingers_or_gloves(check_gloves) {
    return fingers_or_gloves(check_gloves);
}

async function use_lamp(obj) {
    const g = game;
    const u = g.u || (g.u = {});
    /* C:1629-1633 */
    const otyp = obj.otyp | 0;
    const lamp = (otyp === _UL_OIL_LAMP || otyp === _UL_MAGIC_LAMP) ? "lamp"
                 : (otyp === _UL_BRASS_LANTERN) ? "lantern"
                   : null;
    const Blind = _Blind_cmd();

    /*
     * C:1635-1639 (comment): When blind, lamps' and candles' on/off state can
     * be distinguished by heat.  For brass lantern assume that there is an
     * on/off switch that can be felt.
     */

    /* C:1641-1648 */
    if (obj.lamplit) {
        if (lamp) /* lamp or lantern */
            await pline("%s%s is now off.", Shk_Your(obj), lamp);
        else
            await You("snuff out %s.", yname(obj));
        end_burn(obj, true);
        return;
    }
    /* C:1649-1654 */
    if (_Underwater()) {
        await pline("%s.",
                    !_Is_candle(obj) ? "This is not a diving lamp"
                                     : "Sorry, fire and water don't mix");
        return;
    }
    /* C:1655-1668 — magic lamps with an spe == 0 (wished for) cannot be lit */
    if ((!_Is_candle(obj) && obj.age === 0)
        || (otyp === _UL_MAGIC_LAMP && (obj.spe | 0) === 0)) {
        if (otyp === _UL_BRASS_LANTERN) {
            if (!Blind)
                await Your("lantern is out of power.");
            else
                await pline("%s", nothing_seems_to_happen);
        } else {
            await pline("This %s has no oil.", xname(obj));
        }
        return;
    }
    /* C:1669-1679 */
    if (obj.cursed && !rn2(2)) {
        if ((otyp === _UL_OIL_LAMP || otyp === _UL_MAGIC_LAMP) && !rn2(3)) {
            await pline_The("lamp spills and covers your %s with oil.",
                            _ul_fingers_or_gloves(true));
            /* C:1673 make_glib((int) (Glib & TIMEOUT) + d(2, 10)) — Glib is
             * u.uprops[GLIB].intrinsic (youprop.h:112); this port keeps the
             * timeout on the same uprops slot make_glib() writes. */
            make_glib(((u.uprops?.[GLIB]?.intrinsic | 0) & TIMEOUT) + d(2, 10));
        } else if (!Blind) {
            await pline("%s for a moment, then %s.", Tobjnam(obj, "flicker"),
                        otense(obj, "die"));
        } else {
            await pline("%s", nothing_seems_to_happen);
        }
    } else {
        /* C:1680-1698 */
        if (lamp) { /* lamp or lantern */
            check_unpaid(obj);
            await pline("%s%s is now on.", Shk_Your(obj), lamp);
        } else { /* candle(s) */
            await pline("%s flame%s %s%s", s_suffix(Yname2(obj)),
                        plur(obj.quan), otense(obj, "burn"),
                        Blind ? "." : " brightly!");
            /* C:1687-1697 — bill an unpaid candle consumed at a costly spot. */
            if (obj.unpaid && shk_costly_spot(u.ux | 0, u.uy | 0)
                && (obj.age | 0) === 20 * (OC_COST[otyp] | 0)) {
                const ithem = (obj.quan | 0) > 1 ? 'them' : 'it';
                const shkp = shop_keeper(shk_in_rooms(u.ux, u.uy, SHOPBASE)[0]);
                SetVoice(shkp, 0, 80, 0);
                await verbalize('You burn %s, you bought %s!', ithem, ithem);
                await bill_dummy_object(obj);
            }
        }
        begin_burn(obj, false);
    }
}

/* C ref: apply.c:58 — `staticfn const char no_elbow_room[]`, shared by
 * use_candle (apply.c:1396) and light_cocktail (apply.c:1710).  Both print it
 * through You(), so the stored text has no "You " prefix. */
const _AP_NO_ELBOW_ROOM = "don't have enough elbow-room to maneuver.";

const _AP_TALLOW_CANDLE = 224, _AP_WAX_CANDLE = 225;

const _AP_CANDELABRUM_OF_INVOCATION = 262;

const _AP_POT_OIL = 321;

/* C ref: shk.c shk_your(buf, obj) — the lowercase sibling of this file's
 * Shk_Your(obj) (js/cmd.js:345), which is what light_cocktail (apply.c:1735)
 * uses: "your " for a carried object, "the " otherwise.  Same known gaps as
 * Shk_Your (no shk_owns / mon_owns arms); RNG-free. */
function _ap_shk_your(obj) {
    /* C shk.c:5862 shk_your() — no case change; a shopkeeper's name keeps its capital. */
    return shk_shk_your('', obj);
}

/* C ref: objnam.c:5623-5698 safe_qbuf(qbuf, qprefix, qsuffix, obj, func,
 * altfunc, lastR) — "construct a query prompt string, based around an object
 * name, which is guaranteed to fit within [QBUFSZ]".
 * C writes into the caller's buffer and supports qbuf == qprefix (a partially
 * filled buffer); the JS form returns the string and the caller passes the
 * previous result in as `qprefix`, which is the same thing.
 * Share safe_qbuf's bounds, sanity checks, and short_oname fallback with the
 * inventory and shop callers (objnam.c:5646-5698). */
async function _ap_safe_qbuf(qprefix, qsuffix, obj, func, altfunc, lastR) {
    return await safe_qbuf('', qprefix, qsuffix, obj, func, altfunc, lastR);
}

/* C ref: apply.c:1318-1383 use_candelabrum(struct obj *obj).  `staticfn void`,
 * so doapply()'s `res` stays ECMD_TIME on every arm — the apply spends the turn
 * whatever message came out.  RNG-free throughout. */
async function use_candelabrum(obj) {
    const g = game;
    const u = g.u || (g.u = {});
    /* C:1321 */
    let s = ((obj.spe | 0) !== 1) ? "candles" : "candle";
    const Blind = _Blind_cmd();

    /* C:1323-1327 */
    if (obj.lamplit) {
        await You("snuff the %s.", s);
        end_burn(obj, true);
        return;
    }
    /* C:1328-1341 */
    if ((obj.spe | 0) <= 0) {
        let otmp;
        await pline("This %s has no %s.", xname(obj), s);
        /* only output tip if candles are in inventory */
        for (otmp = g.invent; otmp; otmp = otmp.nobj)
            if (_Is_candle(otmp))
                break;
        if (otmp)
            await pline("To attach candles, apply them instead of the %s.",
                        xname(obj));
        return;
    }
    /* C:1342-1345 */
    if (_Underwater()) {
        await You("cannot make fire under water.");
        return;
    }
    /* C:1346-1351 */
    if (u.uswallow || obj.cursed) {
        if (!Blind)
            await pline_The("%s %s for a moment, then %s.", s,
                            vtense(s, "flicker"), vtense(s, "die"));
        return;
    }
    /* C:1352-1362 */
    if ((obj.spe | 0) < 7) {
        await There_real("%s only %d %s in %s.", vtense(s, "are"), obj.spe | 0, s,
                        _the_objnam(xname(obj)));
        if (!Blind)
            await pline("%s lit.  %s dimly.",
                        (obj.spe | 0) === 1 ? "It is" : "They are",
                        Tobjnam(obj, "shine"));
    } else {
        await pline("%s's %s burn%s", The(xname(obj)), s,
                    (Blind ? "." : " brightly!"));
    }
    /* C:1363-1381 */
    if (!invocation_pos(u.ux, u.uy) || On_stairs(u.ux, u.uy)) {
        await pline_The("%s %s being rapidly consumed!", s, vtense(s, "are"));
        /* C:1363-1365 (comment): this used to be obj->age /= 2, rounding down;
         * an age of 1 would yield 0, confusing begin_burn() and producing an
         * unlightable, unrefillable candelabrum; round up instead */
        obj.age = Math.trunc(((obj.age | 0) + 1) / 2);

        /* C:1368-1373 — to make absolutely sure the game doesn't become
         * unwinnable as a consequence of a broken candelabrum */
        if ((obj.age | 0) === 0) {
            impossible_cmd("Candelabrum with candles but no fuel?");
            obj.age = 1;
        }
    } else {
        if ((obj.spe | 0) === 7) {
            if (Blind)
                await pline("%s a strange warmth!", Tobjnam(obj, "radiate"));
            else
                await pline("%s with a strange light!", Tobjnam(obj, "glow"));
        }
        obj.known = 1;
    }
    /* C:1382 */
    begin_burn(obj, false);
}

/* C ref: apply.c:1386-1466 use_candle(struct obj **optr).
 * `optr` is an in/out parameter: C sets `*optr = 0` when the whole stack is
 * attached to the candelabrum, so doapply()'s artifact tail
 * (apply.c:4427-4429 `if (obj && obj->oartifact)`) sees no object.  Modelled
 * with a {obj} box, the same shape the container arm already uses.
 * `staticfn void`, so `res` stays ECMD_TIME on every arm. */
async function use_candle(optr) {
    const g = game;
    const u = g.u || (g.u = {});
    let obj = optr.obj;
    let s = ((obj.quan | 0) !== 1) ? "candles" : "candle";

    /* C:1394-1397 */
    if (u.uswallow) {
        await You(_AP_NO_ELBOW_ROOM);
        return;
    }

    /* C:1399-1405 — obj is the candle; otmp is the candelabrum */
    const otmp = carrying(_AP_CANDELABRUM_OF_INVOCATION);
    if (!otmp || (otmp.spe | 0) === 7) {
        await use_lamp(obj);
        return;
    }

    /* C:1407-1419 — build "Attach <candles> to <candelabrum>?".
     * C's trick: qsfx carries a literal ESC as a marker, safe_qbuf() formats
     * "Attach " + yname(candles) + qsfx, then `Strcpy(q, " to ")` overwrites
     * the marker AND NUL-TERMINATES — truncating everything after it — so the
     * second safe_qbuf() re-appends the candelabrum through yname() rather
     * than thesimpleoname().  Reproduced literally, marker and all. */
    const ESC = '\x1b';
    const qsfx = " to" + ESC + thesimpleoname(otmp) + "?";
    let qbuf = await _ap_safe_qbuf("Attach ", qsfx, obj, yname, thesimpleoname, s);
    const qi = qbuf.toLowerCase().indexOf(" to" + ESC);
    if (qi >= 0)
        qbuf = qbuf.slice(0, qi) + " to ";
    /* C:1414 — y_n() is yn_function(query, ynchars, 'n', TRUE)
     * (hack.h:1329), including special-prompt wrapping without more(). */
    if (await yn_function(await _ap_safe_qbuf(qbuf, "?", otmp, yname, thesimpleoname,
                                        "it"), 'yn', 'n', true) === 'n') {
        await use_lamp(obj);
        return;
    } else {
        /* C:1424-1430 */
        if ((otmp.spe | 0) + (obj.quan | 0) > 7) {
            obj = (await splitobj(obj, 7 - (otmp.spe | 0)));
            /* avoid a grammatical error if obj->quan gets reduced to 1 candle
               from more than one */
            s = ((obj.quan | 0) !== 1) ? "candles" : "candle";
        } else {
            optr.obj = null;
        }

        const was_lamplit = !!obj.lamplit;
        if (was_lamplit)
            end_burn(obj, true);

        /* C:1440-1441 */
        await You("attach %ld%s %s to %s.", obj.quan | 0,
                  !(otmp.spe | 0) ? "" : " more", s, _the_objnam(xname(otmp)));
        /* C:1442-1444 */
        if (!(otmp.spe | 0) || (otmp.age | 0) > (obj.age | 0))
            otmp.age = obj.age | 0;
        otmp.spe = (otmp.spe | 0) + (obj.quan | 0);
        /* C:1445-1449 */
        if (otmp.lamplit && !was_lamplit)
            await pline_The("new %s magically %s!", s, vtense(s, "ignite"));
        else if (!otmp.lamplit && was_lamplit)
            await pline("%s out.", ((obj.quan | 0) > 1) ? "They go" : "It goes");
        /* C:1450-1460 — tell the shopkeeper when unpaid candles are used. */
        if (obj.unpaid) {
            const shkp = shop_keeper(shk_in_rooms(u.ux, u.uy, SHOPBASE)[0]);
            SetVoice(shkp, 0, 80, 0);
            const them = (obj.quan | 0) > 1 ? 'them' : 'it';
            await verbalize('You %s %s, you bought %s!', otmp.lamplit ? 'burn' : 'use', them, them);
        }
        /* C:1461-1463 */
        if ((obj.quan | 0) < 7 && (otmp.spe | 0) === 7)
            await pline("%s now has seven%s candles attached.", The(xname(otmp)),
                        otmp.lamplit ? " lit" : "");
        /* C:1464-1466 — candelabrum's light range might increase */
        if (otmp.lamplit)
            obj_merge_light_sources(otmp, otmp);
        /* C:1467-1469 — candles are no longer a separate light source; candles
         * are now gone */
        await useupall(obj);
        /* C:1470-1471 — candelabrum's weight is changing */
        otmp.owt = weight(otmp);
        update_inventory();
    }
}

/* Historical implementation notes, superseded by the shared addinv below.
 * C ref: invent.c:1108-1114 addinv_core0's merge arm + invent.c:694 the
 * assigninvlet/insert tail, narrowed to what light_cocktail's two calls need
 * (apply.c:1717 `*optr = addinv(obj)` after a snuff, and the
 * hold_another_object() at apply.c:1755).  `addinv(obj)` is
 * addinv_core0(obj, NULL, TRUE): fold into the first mergable stack if there
 * is one (which is the WHOLE POINT of the snuff round-trip — C's comment at
 * apply.c:1712-1718 says it is there to average the age of the potions), else
 * assign a letter and insert.  _pickup_mergable/_pickup_merged (js/cmd.js:26407)
 * are this file's existing mergable()/merged() bodies; _levtele_addinv
 * (js/cmd.js:8857) is its existing assigninvlet + addinv_core1 + sorted insert
 * + addinv_core2 tail.  RNG-free.
 * KNOWN GAP, deliberate: C's merged() also runs the "learn by comparing"
 * discovery pline (invent.c:934-942).  _pickup_merged returns that flag and
 * this caller drops it, because two stacks of oil that merge here came off the
 * SAME stack one line earlier and therefore agree on every knowledge
 * dimension, so `discovered` is false by construction. */
async function _ap_addinv(obj) {
    return await addinv(obj);
}

/* C ref: apply.c:1702-1765 light_cocktail(struct obj **optr) — apply a potion
 * of oil.  `staticfn void`, so `res` stays ECMD_TIME on every arm.  RNG-free.
 * `optr` is in/out (C reassigns it after the split), modelled with a {obj} box
 * like use_candle above. */
async function light_cocktail(optr) {
    const g = game;
    const u = g.u || (g.u = {});
    let obj = optr.obj; /* obj is a potion of oil */
    const Blind = _Blind_cmd();

    /* C:1708-1711 */
    if (u.uswallow) {
        await You(_AP_NO_ELBOW_ROOM);
        return;
    }

    /* C:1713-1729 */
    if (obj.lamplit) {
        await You("snuff the lit potion.");
        end_burn(obj, true);
        /*
         * C:1718-1725 (comment): Free & add to re-merge potion.  This will
         * average the age of the potions.  Not exactly the best solution, but
         * its easy.  Don't do that unless obj is not worn (uwep, uswapwep, or
         * uquiver) because if wielded and other oil is quivered a "null obj
         * after quiver merge" panic will occur.
         */
        if (!obj.owornmask) {
            freeinv(obj);
            optr.obj = await _ap_addinv(obj);
        }
        return;
    } else if (_Underwater()) {
        await There_real("is not enough oxygen to sustain a fire.");
        return;
    }

    /* C:1732-1734 */
    const split1off = ((obj.quan | 0) > 1);
    if (split1off)
        obj = (await splitobj(obj, 1));

    /* C:1736-1737 */
    await You("light %spotion.%s", _ap_shk_your(obj),
              Blind ? "" : "  It gives off a dim light.");

    /* C:1739-1751 — charge an unpaid potion lit at a costly spot. */
    if (obj.unpaid && shk_costly_spot(u.ux | 0, u.uy | 0)) {
        check_unpaid(obj);
        await verbalize("That's in addition to the cost of the potion, of course.");
        await bill_dummy_object(obj);
    }
    /* C:1752 */
    makeknown(obj.otyp | 0);

    /* C:1754 — after shop billing */
    begin_burn(obj, false);
    /* C:1755-1763 */
    if (split1off) {
        obj_extract_self(obj);
        obj.nomerge = 1;
        obj = await hold_another_object(obj, 'You drop %s!',
                                        (await doname(obj)), null);
        if (obj)
            obj.nomerge = 0;
    }
    /* C:1764 */
    optr.obj = obj;
}

/* C ref: apply.c:1576-1625 catch_lit(struct obj *obj)
 * An ignitable object left near/on fire (or splashed with oil that ignites)
 * catches light. Returns TRUE if it caught, FALSE otherwise.
 */
const CL_OBJ_FLOOR = 1;

const CL_OBJ_INVENT = 3;

const CL_TALLOW_CANDLE = 224;

const CL_WAX_CANDLE = 225;

const CL_BRASS_LANTERN = 226;

const CL_OIL_LAMP = 227;

const CL_MAGIC_LAMP = 228;

const CL_CANDELABRUM_OF_INVOCATION = 262;

const CL_POT_OIL = 321;

// C: #define age_is_relative(otmp) ...
function _cl_age_is_relative(otmp) {
    return otmp.otyp === CL_BRASS_LANTERN || otmp.otyp === CL_OIL_LAMP
        || otmp.otyp === CL_CANDELABRUM_OF_INVOCATION
        || otmp.otyp === CL_TALLOW_CANDLE || otmp.otyp === CL_WAX_CANDLE
        || otmp.otyp === CL_POT_OIL;
}

// C: #define ignitable(otmp) ...
function _cl_ignitable(otmp) {
    return otmp.otyp === CL_BRASS_LANTERN || otmp.otyp === CL_OIL_LAMP
        || (otmp.otyp === CL_MAGIC_LAMP && otmp.spe > 0)
        || otmp.otyp === CL_CANDELABRUM_OF_INVOCATION
        || otmp.otyp === CL_TALLOW_CANDLE || otmp.otyp === CL_WAX_CANDLE
        || otmp.otyp === CL_POT_OIL;
}

export async function catch_lit(obj) {
    const u = game.u || {};

    // C: if (!obj->lamplit && ignitable(obj) && get_obj_location(obj, &x, &y, 0)) {
    /* C zap.c:654's return is the third conjunct of catch_lit's guard:
     *     if (!obj->lamplit && ignitable(obj) && get_obj_location(obj,&x,&y,0))
     * The JS had dropped that conjunct (it called the stub for its coordinates
     * only); restored, so an object with no location no longer catches fire. */
    const _xb = { value: 0 }, _yb = { value: 0 };
    if (!obj.lamplit && _cl_ignitable(obj)
        && get_obj_location(obj, _xb, _yb, 0)) {
        const x = _xb.value, y = _yb.value;

        if (((obj.otyp === CL_MAGIC_LAMP || obj.otyp === CL_CANDELABRUM_OF_INVOCATION) && obj.spe === 0)
            || (_cl_age_is_relative(obj) && obj.age === 0)
            || obj.otyp === CL_BRASS_LANTERN) {
            return false;
        }
        if (obj.otyp === CL_CANDELABRUM_OF_INVOCATION && obj.cursed) {
            return false;
        }
        if ((obj.otyp === CL_OIL_LAMP || obj.otyp === CL_MAGIC_LAMP)
            && obj.cursed && !rn2(2)) {
            return false;
        }

        if (obj.where === CL_OBJ_INVENT || cansee(x, y)) {
            if (obj.where === CL_OBJ_FLOOR && cansee(x, y))
                set_msg_xy(x, y);
            const Blind = _Blind_cmd();
            pline("%s %s %s", Yname2(obj),
                  otense(obj, Blind ? "feel" : "catch"),
                  Blind ? "warm." : "light!");
        }
        if (obj.otyp === CL_POT_OIL)
            makeknown(obj.otyp);
        if (obj.where === CL_OBJ_INVENT && obj.unpaid && costly_spot(u.ux, u.uy)) {
            const shkp = shop_keeper(in_rooms(u.ux, u.uy, SHOPBASE)[0]);

            /* if it catches while you have it, then it's your tough luck */
            check_unpaid(obj);
            SetVoice(shkp, 0, 80, 0);
            verbalize("That's in addition to the cost of %s %s, of course.",
                      yname(obj),
                      (obj.quan === 1) ? "itself" : "themselves");
            await bill_dummy_object(obj);
        }
        begin_burn(obj, false);
        return true;
    }
    return false;
}

// C ref: trap.c reset_trapset() — clear trap-related state.
export function reset_trapset() {
    const g = game;
    if (!g.gt) g.gt = {};
    if (!g.gt.trapinfo) g.gt.trapinfo = {};
    g.gt.trapinfo.tobj = 0;
    g.gt.trapinfo.force_bungle = 0;
}

/* apply.c enum values (trap.h ttyp): BEAR_TRAP=5, LANDMINE=6 — same pair
 * js/const.js exports (BEAR_TRAP/LANDMINE); local copies to avoid widening
 * this file's already-large const.js import for two integers. */
const _AP_TTYP_BEAR_TRAP = 5, _AP_TTYP_LANDMINE = 6;

/* apply.c:2841 P_SKILL(P_RIDING) < P_BASIC — skills.h enum values, same pair
 * already inlined at cmd.js:15915-15917 for the identical check. */
const _AP_P_RIDING = 37, _AP_P_BASIC = 2;

function _apply_trapname(ttyp) {
    /* trap.c:7100 trapname(ttyp, FALSE): hallucination draws the display RNG */
    return trapname(ttyp | 0, false);
}

/* C ref: monmove.c:2181-2185 closed_door(x,y); share look.js's predicate. */
function _apply_closed_door(x, y) {
    return closed_door(x, y);
}

/* C ref: apply.c:2814-2900 use_trap(struct obj *otmp) — "Place a
 * landmine/bear trap.  Helge Hafting".  `void`; doapply's `res` local is
 * untouched regardless of outcome (see the LAND_MINE/BEARTRAP case above), so
 * the turn is ALWAYS spent even when this refuses outright. */
async function use_trap(otmp) {
    const g = game, u = g.u || (g.u = {});
    let what = null;
    /* C apply.c:2846 tests IS_FURNITURE(levtyp) || IS_OBSTRUCTED(levtyp)
     * on the hero's square.  IS_OBSTRUCTED is live for a hero standing in
     * rock or a wall (Passes_walls, e.g. a xorn).  The levTile guard only
     * covers a level with no location at the hero's square. */
    const levTile = g.level?.at(u.ux | 0, u.uy | 0);
    const levtyp = levTile ? (levTile.typ | 0) : null;
    const occutext = 'setting the trap';

    if (_hero_verysmall_or_nohands_nohands_only())
        what = 'without hands';
    else if (_uprop_active('STUNNED'))
        what = 'while stunned';
    else if (u.uswallow)
        what = _digests(u.ustuck?.data) ? 'while swallowed' : 'while engulfed';
    else if (u.uinwater)
        what = 'underwater';
    else if (_uprop_active('LEVITATION')
             && !((game.u?.uprops?.[_PROPIDS.LEVITATION]?.blocked) | 0))
        what = 'while levitating';  /* Levitation = (H||E) && !B (youprop.h:240) */
    else if (is_pool(u.ux | 0, u.uy | 0))  /* apply.c:2839 */
        what = 'in water';
    else if (is_lava(u.ux | 0, u.uy | 0))  /* apply.c:2841 */
        what = 'in lava';
    else if (On_stairs(u.ux | 0, u.uy | 0)) {
        const stway = stairway_at(u.ux | 0, u.uy | 0);
        what = (stway && stway.isladder) ? 'on the ladder' : 'on the stairs';
    } else if ((levTile && (IS_FURNITURE(levtyp) || IS_OBSTRUCTED(levtyp)))
               || _apply_closed_door(u.ux | 0, u.uy | 0)
               || t_at(u.ux | 0, u.uy | 0)) {
        what = 'here';
    } else if (Is_airlevel(u.uz) || Is_waterlevel(u.uz)) {
        what = (levtyp === AIR) ? 'in midair'
             : (levtyp === CLOUD) ? 'in a cloud'
             : 'in this place';
    }
    if (what) {
        await You_cant(`set a trap ${what}!`);
        reset_trapset();
        return;
    }

    const ttyp = ((otmp.otyp | 0) === _IA_LAND_MINE_OTYP)
        ? _AP_TTYP_LANDMINE : _AP_TTYP_BEAR_TRAP;
    if (!g.gt) g.gt = {};
    const ti = g.gt.trapinfo || (g.gt.trapinfo = {});
    if (otmp === ti.tobj && u_at(ti.tx | 0, ti.ty | 0)) {
        await You(`resume setting ${shk_shk_your('', otmp)}${_apply_trapname(ttyp)}.`);
        set_occupation(set_trap, occutext, 0);
        return;
    }
    ti.tobj = otmp;
    ti.tx = u.ux | 0;
    ti.ty = u.uy | 0;
    let tmp = acurr(u, A_DEX);
    ti.time_needed = (tmp > 17) ? 2 : (tmp > 12) ? 3 : (tmp > 7) ? 4 : 5;
    if (_Blind_cmd())
        ti.time_needed *= 2;
    tmp = acurr(u, A_STR);
    if (ttyp === _AP_TTYP_BEAR_TRAP && tmp < 18)
        ti.time_needed += (tmp > 12) ? 1 : (tmp > 7) ? 2 : 4;
    /* apply.c:2864-2896 — an unskilled rider must confirm the attempt, with
     * a chance of setting off a mine or dropping an unarmed bear trap. */
    if (u.usteed && P_SKILL(_AP_P_RIDING) < _AP_P_BASIC) {
        const chance = rnl(10) > (((otmp.cursed | 0) || _uprop_active('FUMBLING')) ? 3 : 5);
        await You(`aren't very skilled at reaching from ${mon_nam(u.usteed)}.`);
        const query = `Continue your attempt to set ${the(_apply_trapname(ttyp))}?`;
        const answer = await yn_function(query, 'yn', 'n');
        /* topl.c:545-548 — tty_yn_function leaves the answered prompt on the
         * topline (TOPLINE_NON_EMPTY); tty_nhgetch cleared our copy while
         * reading the key, and C wipes it only at the NEXT key read. */
        if (answer !== 'y') {
            /* a later pline overwrites the dead prompt (topl.c:257-266), so
             * park it on the stale-yn channel rather than as a pending line. */
            game._resultMessage = game._ynStaleTopline = `${query} [yn] (n)`;
            reset_trapset();
            return;
        }
        game._pending_message = `${query} [yn] (n)`;
        /* topl.c:262,271 — the answered prompt left toplin NON_EMPTY, not
         * NEED_MORE, so the next pline neither joins it nor pages it: it
         * remember_topl()s and overwrites. */
        game._pending_message = '';
        if (chance) {
            if (ttyp === _AP_TTYP_LANDMINE) {
                ti.time_needed = 0;
                ti.force_bungle = true;
            } else {
                reset_trapset();
                await pline(`You drop ${the(_apply_trapname(ttyp))}!`);
                await dropx(otmp);
                return;
            }
        }
    }
    await You(`begin setting ${shk_shk_your('', otmp)}${_apply_trapname(ttyp)}.`);
    /* C shk.c:6101-6115 use_unpaid_trapobj: arming buys the trap. */
    if (otmp.unpaid) {
        const shkp = !_hero_Deaf() && await shk_find_objowner(otmp, u.ux, u.uy);
        const data = shkp && (shkp.data || permonstTemplate(shkp.mnum));
        if (shkp && !helpless(shkp) && data.msound > MS_ANIMAL) {
            SetVoice(shkp, 0, 80, 0);
            await verbalize("You set it, you buy it!");
        }
        await bill_dummy_object(otmp);
    }
    set_occupation(set_trap, occutext, 0);
}

/* C ref: apply.c:2903-2933 set_trap(void) — occupation routine called each
 * turn while arming a beartrap or landmine. */
async function set_trap() {
    const g = game, u = g.u || (g.u = {});
    const ti = (g.gt && g.gt.trapinfo) || {};
    const otmp = ti.tobj;
    const carried = !!otmp && (((otmp.where | 0) === OBJ_INVENT) || (() => {
        for (let o = g.invent; o; o = o.nobj) if (o === otmp) return true;
        return false;
    })());
    if (!otmp || !carried || !u_at(ti.tx | 0, ti.ty | 0)) {
        /* trap object might have been stolen or hero teleported */
        reset_trapset();
        return 0;
    }
    ti.time_needed = (ti.time_needed | 0) - 1;
    if (ti.time_needed > 0)
        return 1; /* still busy */

    const ttyp = ((otmp.otyp | 0) === _IA_LAND_MINE_OTYP)
        ? _AP_TTYP_LANDMINE : _AP_TTYP_BEAR_TRAP;
    const ttmp = await maketrap(u.ux | 0, u.uy | 0, ttyp);
    if (ttmp) {
        ttmp.madeby_u = 1;
        feeltrap(ttmp);
        if (shk_in_rooms(u.ux | 0, u.uy | 0, SHOPBASE).length)
            shk_add_damage(u.ux | 0, u.uy | 0, 0);
        if (!ti.force_bungle)
            await You(`finish arming ${the(_apply_trapname(ttyp))}.`);
        if ((((otmp.cursed | 0) || _uprop_active('FUMBLING')) && rnl(10) > 5)
            || ti.force_bungle) {
            await dotrap(ttmp, ti.force_bungle ? FORCEBUNGLE : 0);
        }
    } else {
        /* this shouldn't happen */
        await Your('trap setting attempt fails.');
    }
    await useup(otmp);
    reset_trapset();
    return 0;
}

const NOSE = 17;

// C ref: apply.c:4432 unfixable_trouble_count(is_horn) — count troubles
// that a unicorn horn (is_horn) or potion of full healing (!is_horn) cannot
// cure. Timed troubles are always curable via horn; ones with extra bits set
// above the timeout field (FROMFORM etc, `& ~TIMEOUT`) are not.
export function unfixable_trouble_count(is_horn) {
    const u = game.u || {};
    let unfixable_trbl = 0;

    const stonedProp = u.uprops && u.uprops[STONED];
    if (stonedProp && (stonedProp.intrinsic | 0))
        unfixable_trbl++;
    const slimedProp = u.uprops && u.uprops[SLIMED];
    if (slimedProp && (slimedProp.intrinsic | 0))
        unfixable_trbl++;
    const strangledProp = u.uprops && u.uprops[STRANGLED];
    if (strangledProp && (strangledProp.intrinsic | 0))
        unfixable_trbl++;

    if (!u.atemp) u.atemp = { a: [0, 0, 0, 0, 0, 0] };
    if (!u.atemp.a) u.atemp.a = [0, 0, 0, 0, 0, 0];

    const wlProp = u.uprops && u.uprops[WOUNDED_LEGS];
    const HWounded_legs = wlProp ? (wlProp.intrinsic | 0) : 0;
    const EWounded_legs = wlProp ? (wlProp.extrinsic | 0) : 0;
    if ((u.atemp.a[1] /* display order: DEX */ | 0) < 0 && (HWounded_legs || EWounded_legs))
        unfixable_trbl++;
    if ((u.atemp.a[A_STR] | 0) < 0 && (u.uhs | 0) >= WEAK)
        unfixable_trbl++;

    const sickProp = u.uprops && u.uprops[SICK];
    const Sick = sickProp ? (sickProp.intrinsic | 0) : 0;
    if (Sick && (!is_horn || (Sick & ~TIMEOUT) !== 0))
        unfixable_trbl++;

    const stunProp = u.uprops && u.uprops[STUNNED];
    const HStun = stunProp ? (stunProp.intrinsic | 0) : 0;
    if (HStun && (!is_horn || (HStun & ~TIMEOUT) !== 0))
        unfixable_trbl++;

    const confProp = u.uprops && u.uprops[CONFUSION];
    const HConfusion = confProp ? (confProp.intrinsic | 0) : 0;
    if (HConfusion && (!is_horn || (HConfusion & ~TIMEOUT) !== 0))
        unfixable_trbl++;

    const hallucProp = u.uprops && u.uprops[HALLUC];
    const HHallucination = hallucProp ? (hallucProp.intrinsic | 0) : 0;
    const hallucResProp = u.uprops && u.uprops[HALLUC_RES];
    const HHalluc_resistance = hallucResProp ? (hallucResProp.intrinsic | 0) : 0;
    const EHalluc_resistance = hallucResProp ? (hallucResProp.extrinsic | 0) : 0;
    const Halluc_resistance = HHalluc_resistance || EHalluc_resistance;
    const Hallucination = HHallucination && !Halluc_resistance;
    if (Hallucination && (!is_horn || (HHallucination & ~TIMEOUT) !== 0))
        unfixable_trbl++;

    const vomitProp = u.uprops && u.uprops[VOMITING];
    const Vomiting = vomitProp ? (vomitProp.intrinsic | 0) : 0;
    if (Vomiting && (!is_horn || (Vomiting & ~TIMEOUT) !== 0))
        unfixable_trbl++;

    const deafProp = u.uprops && u.uprops[DEAF];
    const HDeaf = deafProp ? (deafProp.intrinsic | 0) : 0;
    const EDeaf = deafProp ? (deafProp.extrinsic | 0) : 0;
    const roleplayDeaf = !!(u.uroleplay && u.uroleplay.deaf);
    const Deaf = (HDeaf !== 0) || (EDeaf !== 0) || roleplayDeaf;
    if (Deaf && (!is_horn || (HDeaf & ~TIMEOUT) !== 0))
        unfixable_trbl++;

    return unfixable_trbl;
}
