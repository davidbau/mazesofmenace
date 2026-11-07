// do.js — C ref: do.c.
import { monster_nearby } from './allmain.js'; // C hack.c:4106
import { ART_NONARTIFACT, C_ATTR_TO_DISP, arti_inv_prop, exercise, get_artifact } from './attrib.js';
import { ballfall, ballrelease, drop_ball, placebc, unplacebc } from './ball.js';
import { bones_include_name } from './bones.js';
import { BOTH_SIDES, BOULDER_OTYP, BUCT_BLESSED, BUCT_CURSED, BUCT_UNCURSED, BUCT_UNKNOWN, COIN_CLASS_C, DEADMONSTER, FACE, HAND, INV_ORDER, LEFT_SIDE, LEG, LL_ACHIEVE, LOADSTONE, MAGIC_PORTAL, NH_AMBER, NH_BLACK, OCLASS_NAME, RIGHT_SIDE, Role_if, STOMACH, S_GOLEM, S_VORTEX, S_dnladder, S_dnstair, UTOTYPE_NONE, UTOTYPE_PORTAL, Your, _Blind_cmd, _FE_M2_UNDEAD, _Flying, _LD_FIRE_HORN, _LD_SCROLL_CLASS, _LD_SPBOOK_CLASS, _LD_SPE_BOOK_OF_THE_DEAD, _LD_WAN_FIRE, _Levitation, _Luck, _MH_MZ_HUGE, _RING_CLASS, _delobj_useupf, _digests, _doaltarobj_Doname2, _eprop, _fl_pmidx, _goto_level_You, _hero_Blind, _hero_Deaf, _hprop, _invlet_constant, _ld_carried, _levlAt, _mh_touch_petrifies, _norep, _on_W_tower_level, _plineVFmt, _spoteffects_pickup, _st_Punished, _uprop_active, _wt_sameObj, any_obj_ok, bhp_Fire_resistance, bhp_Maybe_Half_Phys, bhp_Soundeffect, bhp_You_hear, bhp_burn_away_slime, bhp_bury_objs, bhp_delfloortrap, bhp_hliquid, bhp_is_lava, bhp_losehp, bhp_m_in_air, bhp_mondied, bhp_obfree, bhp_recalc_block_point, bhp_the, bhp_upstart, bhp_useupf, bhp_wake_nearto, bhp_waterbody_name, bhp_xname, bhp_y_monnam, body_part, buried_ball_to_punishment, check_special_room, ckunpaid, cmd_from_func, cmdq_add_int, cmdq_add_key, compactify, costly_alteration, count_buc, count_unpaid, dismount_steed, flooreffects_Maybe_Half_Phys, flooreffects_You_hear, flooreffects_distu, flooreffects_fire_damage, flooreffects_is_lava, flooreffects_is_plural, flooreffects_is_pool, flooreffects_is_whirly, flooreffects_obj_meld, flooreffects_obj_nexto_xy, flooreffects_passes_walls, flooreffects_pudding_merge_message, flooreffects_the, flooreffects_throws_rocks, freeinv, getobj_cmdq_drain, getobj_get_count, getobj_redo_menu, ggetobj, impact_disturbs_zombies, impossible, inventory_menu_legacy, is_plural_obj, is_pool, key2txt, ledger_no_cmd, lowc, makeplural, mbodypart, mime_action, notice_all_mons, ok_to_quest, on_level, onquest, park_prompt_cursor, pline_The, pooleffects, pooleffects_Flying, pooleffects_Levitation, pooleffects_ceiling_hider, recalc_mapseen_rooms, record_achievement, reset_occupations, reset_trapset, resurrect, set_cursor, set_move_cmd, set_occupation, set_uinwater, sortloot_invlet_chain, splittable, stolen_value, surface, u_locomotion, u_rooted, useupall, useupf, y_n_default } from './cmd.js';
import { docall } from './do_name.js';
import { setuqwep, setuswapwep, setuwep, welded, weldmsg } from './wield.js';
import { breakobj, hitfloor } from './dothrow.js';
import { visctrl as _binds_visctrl } from './cmd_binds.js';
import { menucolor_row } from './coloratt.js';
import { build_window_screen, menu_search_case, tty_window_offx } from './com_pager.js';
import { money_cnt } from './hack.js';
import { ACH_BGRM, ACH_ENDG, ACH_HELL, ACH_MINE, ACH_SOKO, A_DEX, A_STR, COLNO, CORR, CQ_REPEAT, DB_FLOOR, DB_UNDER, DIR_DOWN, DIR_UP, DISMOUNT_FELL, DRAWBRIDGE_UP, ECMD_FAIL, ECMD_OK, ECMD_TIME, ER_DESTROYED, ESCAPED, GETOBJ_ALLOWCNT, HMON_THROWN, HOLE, Has_contents, IS_ALTAR, IS_SINK, IS_WATERWALL, I_SPECIAL, In_endgame, In_mines, In_quest, In_sokoban, Is_airlevel, Is_knox_level, Is_rogue_level, Is_stronghold, Is_waterlevel, KILLED_BY, LADDER, LEVITATION, LFILE_EXISTS, LL_CONDUCT, LL_DEBUG, LOST_DROPPED, MENU_COMBINATION, MENU_PARTIAL, NC_SHOW_MSG, NO_KILLER_PREFIX, OBJ_FREE, PARANOID_AUTOALL, PARANOID_CONFIRM, PICK_ANY, ROOM, ROWNO, UTOTYPE_RMPORTAL, SELL_DELIBERATE, SELL_NORMAL, SICK, SLIMED, SLT_ENCUMBER, STAIRS, STONED, STRANGLED, TIMEOUT, TRAPDOOR, TT_BURIEDBALL, TT_INFLOOR, TT_LAVA, TT_PIT, Upolyd, VIBRATING_SQUARE, VISITED, WOUNDED_LEGS, WT_SPLASH_THRESHOLD, W_ART, W_ARTI as W_ARTI_FW, EMIN as _fl_EMIN, has_mgivenname, is_hole, is_pit, u_at } from './const.js';
import { is_pick, use_pick_axe2 } from './dig.js';
import { GLYPHCLS_CMAP, _pline_flush_frame_record, _threeStatusLines, _topl_joins_snapshot, _topl_merge_result, _topl_stash_result, await_menu_key, canspotmon, capture_flushed_cells, capture_painted_frame, cls as display_cls, docorner_blank_utf8_captures, docorner_status_rows, docrt, flush_screen, force_more, getobj_never_mind, impossible_sync, level_transition_arrival_more, level_transition_capture_old_paint, map_background, map_object, newsym, nh_sprintf, pline_flush_point, putmsghistory, reglyph_darkroom, reset_glyphmap, status_r1_menu_docrt, tty_repaint } from './display.js';
import { check_gold_symbol } from './botl.js';
import { You_hear, You_see, livelog_printf, pline } from './pline.js';
import { You, encumber_msg, xname, yname } from './do_wear.js';
import { float_down } from './trap.js';
import { In_W_tower_wz } from './dochug.js';
import { discard_migrations, keepdogs, losedogs, m_into_limbo, sticks, update_mlstmv } from './dog.js';
import { container_impact_dmg, impact_drop, obj_delivery, ship_object } from './dokick.js';
import { delobj as delobj_invent } from './invent.js';
import { losehp } from './hack.js';
import { def_oc_syms_chars } from './drawing.js';
import { In_tutorial, assign_rnd_level, at_dgn_entrance, builds_up, describe_level_buf, dunlev, goto_hell, remdun_mapseen } from './dungeon.js';
import { done } from './end.js';
import { readchar, yn_function } from './cmd.js';
import { copy_you } from './game.js';
import { game, wizard } from './gstate.js';
import { depth } from './dungeon.js';
import { can_reach_floor } from './hold_another_object.js';
import { ENV } from './hostenv.js';
import { nhgetch } from './input.js';
import { reassign } from './inventory_refresh.js';
import { maybe_reset_pick } from './lock.js';
import { is_pool_or_lava } from './look.js';
import { mongets as _fl_mongets, rndOffensiveItem as _fl_rndOffensiveItem } from './m_initweap.js';
import { Inhell, mkmonmoney as _fl_mkmonmoney, rndDefensiveItem as _fl_rndDefensiveItem, rndMiscItem as _fl_rndMiscItem, canletgo, grow_up, mondied, olfaction, permonstTemplate, set_malign, splitobj } from './makemon.js';
import { create_mplayers as _fl_create_mplayers } from './mplayer.js';
import { Monnam } from './mcastu.js';
import { christen_monst as _fl_christen_monst, hcolor, hmon, obj_pmname, s_suffix } from './mhitm.js';
import { gulp_blnd_check } from './mhitu.js';
import { gain_guardian_angel as _fl_gain_guardian_angel } from './minion.js';
import { makemon as _fl_makemon, mkobj as _fl_mkobj, mksobj as _fl_mksobj, engr_reset_text_pointers, mk_artifact, mklev, place_object, polyfood, set_bknown, sp_levchn_lookup } from './mklev.js';
import { mpickobj } from './steal.js';
import { Can_fall_thru, In_hell, level_difficulty, u_on_newpos, u_on_rndspot } from './dungeon.js';
import { stairway_at, stairway_find_from, u_on_dnstairs, u_on_sstairs, u_on_upstairs } from './stairs.js';
import { fumaroles, movebubbles } from './mkmaze.js';
import { dmonsfree } from './mon.js';
import { MKOBJ_OC_MATERIAL, MKOBJ_OC_OPROP, MKOBJ_OC_SKILL } from './mkobj_erosion_meta.js';
import { healmon, iter_mons as iter_mons_real, kill_genocided_monsters, newcham, set_ustuck } from './mon.js';
import { NHCB_LVL_LEAVE, nh_callback_run, tutorial } from './nhlua.js';
import { oinit } from './o_init.js';
import { an, deliver_splev_message, doname, otense, vtense, yobjnam } from './objnam.js';
import { PARANOID_CONFIRMATION_DEFAULT_BITS } from './options.js';
import { paranoid_ynq } from './paranoid.js';
import { add_valid_menu_class, allow_category, pickup as pickup_c, st_all, u_safe_from_fatal_corpse } from './pickup.js';
import { uescaped_shaft, uteetering_at_seen_pit } from './trap.js';
import { impossible as real_impossible } from './pline.js';
import { PM_GREEN_SLIME, PM_MANES, PM_NURSE, PM_ROGUE, PM_TOURIST, PM_VAMPIRE, PM_VAMPIRE_LORD, PM_VLAD_THE_IMPALER, PM_WRAITH, PM_ARCHEOLOGIST as _FL_PM_ARCHEOLOGIST, PM_WIZARD as _FL_PM_WIZARD } from './pm.generated.js';
import { com_pager } from './questpgr.js';
import { rank_of } from './rank_data.js';
import { in_out_region } from './region.js';
import { getlev } from './restore.js';
import { d, rn1, rn2, rnd, rnz } from './rng.js';
import { ROLE_PM_MNUM } from './roles.js';
import { savelev } from './save.js';
import { fix_shop_damage, sellobj, sellobj_state, is_unpaid as shk_is_unpaid } from './shk.js';
import { Tobjnam } from './sit.js';
import { stackobj } from './sp_lev.js';
import { remove_worn_item as _remove_worn_item_thrown } from './steal.js';
import { stucksteed } from './steed.js';
import { RLOC_NOMSG, enexto_out, mnexto as mnexto_arrival, next_to_u as next_to_u_real, rloc, safe_teleds } from './teleport.js';
import { run_timers } from './timeout.js';
import { initrack } from './track.js';
import { dosinkring as _fl_dosinkring, selftouch as _gl_selftouch, clamp_hole_destination, climb_pit, delfloortrap, deltrap, dotrap, fill_pit, reset_utrap, seetrap, t_at, water_damage } from './trap.js';
import { m_dowear as _fl_m_dowear, bypass_objlist, nxt_unbypassed_obj } from './worn.js';
import { menu_heading_text } from './tty_menu.js';
import { monmightthrowwep as _fl_monmightthrowwep, dmgval, m_at, minstapetrify, mon_nam, more_experienced, newexplevel } from './uhitm.js';
import { cansee, vision_recalc, vision_reset } from './vision.js';
import { weight } from './weight.js';
import { near_capacity, weight_cap } from './hack.js';
import { setnotworn } from './worn.js';
import { BlindedTimeout, HBlinded, incr_HBlinded, make_blinded, obj_resists, set_HBlinded } from './zap.js';

const CORPSE = 265, MEAT_RING = 270;

/* C ref: pline.c:435-452 You_hear — this WAS the tree's only faithful copy of
 * the guard, and it is now the shared body in js/display.js, which is where
 * pline() and the rest of pline.c already live.  Ten other copies disagreed
 * with it; they all forward here now. */
async function _goto_level_You_hear(fmt, ...args) {
    return You_hear(fmt, ...args);
}

/* C ref: dungeon.c:2500 query_annotation(lev) — prompt for and store the
 * current level's annotation, or a remote one selected by the overview menu.
 *
 * STORAGE: C keeps the string on the level's `mapseen` record (mptr->custom).
 * JS stores that text on game._level_custom, keyed by "<dnum>:<dlevel>".
 * RNG-free. */
async function print_level_annotation() {
    const g = game;
    const uz = (g.u && g.u.uz) || { dnum: 0, dlevel: 1 };
    const key = `${uz.dnum | 0}:${uz.dlevel | 0}`;
    const annotation = g._level_custom && g._level_custom[key];
    if (annotation)
        await pline(`You remember this level as ${annotation}.`);
}

// C ref: do.c:395 trycall — if obj is neither formally identified nor informally
// called something already, prompt the player to call its object type.
// ASYNC because docall() now is: it puts up a getlin() and CONSUMES KEYSTROKES.
// While docall was a no-op stub this could be synchronous and every caller
// treated it as free.  It is not, and an UNAWAITED call is worse than the stub:
// the detached promise reaches nhgetch() and steals keystrokes out of order.
export async function trycall(obj) {
    const g = game;
    const otyp = obj.otyp;
    const nameKnown = !!(g._oc_name_known && g._oc_name_known[otyp]);
    const hasUname = !!(g._oc_uname && g._oc_uname[otyp]);
    if (!nameKnown && !hasUname)
        await docall(obj);
}

// Wizard (initrole 12) starting-inventory object classes (C numbering), in the
// order they exist in the kit.  C ref: u_init.c:167 Wizard[] TROBJ table:
//   quarterstaff(WEAPON 2), cloak(ARMOR 3), wand(WAND 11), 2 rings(RING 4),
//   potions(POTION 8), scrolls(SCROLL 9), 2 spellbooks(SPBOOK 10),
//   magic marker(TOOL 6).  All starting items get bknown=1 and cursed=0
//   (u_init.c:1215,1220), so every carried item is either Blessed or Uncursed
//   — never Cursed, never unknown(X).  The blessed kit items (quarterstaff,
//   force-bolt spellbook) give bcnt>0; the rest give ucnt>0.
const ROLE_INVENTORY_CLASSES = {
    // Each entry: { classes: Set<oclass>, bcnt, ucnt, ccnt, xcnt }
    12: { classes: [2, 3, 11, 4, 8, 9, 10, 6], bcnt: 2, ucnt: 6, ccnt: 0, xcnt: 0 },
};

const FE_POTION_CLASS = 8; /* objects.h POTION_CLASS (see the local POTION_CLASS
    const already used, function-scoped, elsewhere in this file). */

const FE_POT_OIL = 321; /* objects.h POT_OIL (ditto for the local POT_OIL const). */

// C ref: sndprocs.h Soundeffect(seid,vol) — expands to nothing when no sound
// library is integrated (the build this port targets).
function flooreffects_Soundeffect() {}

const se_crashing_boulder = 0, se_boulder_drop = 0, se_item_tumble_downwards = 0;

function flooreffects_pline_The(msg, ...args) {
    pline('The ' + msg, ...args);
}

function flooreffects_nonliving(ptr) {
    const is_undead = ((ptr.mflags2 | 0) & _FE_M2_UNDEAD) !== 0;
    const weirdnonliving = ptr.mlet === S_GOLEM || ptr.mlet === S_VORTEX;
    return is_undead || (ptr.pmidx | 0) === PM_MANES || weirdnonliving;
}

function flooreffects_is_vampshifter(mon) {
    return mon.cham === PM_VAMPIRE || mon.cham === PM_VAMPIRE_LORD
        || mon.cham === PM_VLAD_THE_IMPALER;
}

const flooreffects_the_your = ['the', 'your']; /* C: do.c the_your[] */

function flooreffects_panic(msg) {
    throw new Error('panic: ' + msg);
}

// (this file), so it is called directly rather than stubbed.
async function flooreffects_bury_objs(x, y) { return await bhp_bury_objs(x, y); }

async function flooreffects_delfloortrap(t) { return await delfloortrap(t); }

async function flooreffects_mondied(mtmp) { return await mondied(mtmp); }

/* C do.c:223 (void) hmon(mtmp, obj, HMON_THROWN, dieroll) — the real hero
 * hmon (js/mhitm.js), which prints the "The boulder hits <mon>!" hit message
 * and handles death via killed()/xkilled(). */
async function flooreffects_hmon(mtmp, obj, thrown, dieroll) {
    return await hmon(mtmp, obj, thrown, dieroll);
}

/* ── lava_damage / fire_damage (trap.c) ──────────────────────────────────────
 * Constants used by both bodies.  Materials: objclass.h:12-33
 * `enum obj_material_types` (DRAGON_HIDE = 10).  FIRE_RES = 1 (prop.h:15).
 * Object classes: POTION_CLASS 8, SCROLL_CLASS 9, SPBOOK_CLASS 10 (the
 * OBJCLASS() rows of defsym.h).  otyps verified against js/oc_name_data.js +
 * js/mkobj_data.js (name, then oclass): 214 large box / 215 chest / 216 ice
 * box / 220 bag of tricks (all TOOL_CLASS 6), 251 fire horn (6), 321 oil
 * (POTION 8), 339 fire (SCROLL 9), 368 fireball (SPBOOK 10), 409 Book of the
 * Dead (10), 430 fire (WAND 11), 476 statue (ROCK 14). */
const _LD_DRAGON_HIDE = 10;

const _LD_FIRE_RES = 1;

function flooreffects_You_see(msg, ...args) {
    return You_see(msg, ...args);
}

async function flooreffects_lava_damage(obj, x, y) {
    const otyp = obj.otyp | 0, ocls = obj.oclass | 0;

    /* the Amulet, invocation items, and Rider corpses are never destroyed
       (let Book of the Dead fall through to fire_damage() to get feedback) */
    if (obj_resists(obj, 0, 0) && otyp !== _LD_SPE_BOOK_OF_THE_DEAD)
        return false;
    /* destroy liquid (venom), wax, veggy, flesh, paper (except for scrolls
       and books--let fire damage deal with them), cloth, leather, wood, bone
       unless it's inherently or explicitly fireproof or contains something;
       note: potions are glass so fall through to fire_damage() and boil */
    if ((MKOBJ_OC_MATERIAL[otyp] | 0) < _LD_DRAGON_HIDE
        && ocls !== _LD_SCROLL_CLASS && ocls !== _LD_SPBOOK_CLASS
        && (MKOBJ_OC_OPROP[otyp] | 0) !== _LD_FIRE_RES
        && otyp !== _LD_WAN_FIRE && otyp !== _LD_FIRE_HORN
        /* assumes oerodeproof isn't overloaded for some other purpose on
           non-eroding items */
        && !obj.oerodeproof
        /* fire_damage() knows how to deal with containers and contents */
        && !Has_contents(obj)) {
        if (cansee(x, y)) {
            if (obj === game.thrownobj || obj === game.kickedobj)
                pline('%s %s up!', is_plural_obj(obj) ? 'They' : 'It',
                      otense(obj, 'burn'));
            else
                await flooreffects_You_see('%s hit lava and burn up!', await doname(obj));
        }
        if (_ld_carried(obj)) { /* shouldn't happen */
            await _remove_worn_item_thrown(obj, true);
            await useupall(obj);
        } else {
            await _delobj_useupf(obj);
        }
        return true;
    }
    return await flooreffects_fire_damage(obj, true, x, y);
}

async function flooreffects_useupf(obj, numused) { return await useupf(obj, numused); }

// at do.c:232 (Maybe_Half_Phys damage), only reached when a boulder squishes
// the hero in a trapped pit.
// js/dokick.js, js/mklev.js, js/steal.js, js/uhitm.js call sites through this
export async function flooreffects(obj, x, y, verb) {
    let res = false;

    if ((obj.where | 0) !== OBJ_FREE)
        flooreffects_panic('flooreffects: obj not free');

    /* make sure things like await water_damage() have no pointers to follow */
    obj.nobj = obj.nexthere = null;
    /* await erode_obj() (called from await water_damage() or lava_damage()) needs
       bhitpos, but that was screwing up wand zapping that called us from
       rloco(), so we now restore bhitpos before we return */
    const g = game;
    const u = g.u || (g.u = {});
    g.gb = g.gb || {};
    const save_bhitpos = g.gb.bhitpos ? { x: g.gb.bhitpos.x, y: g.gb.bhitpos.y } : undefined;
    g.gb.bhitpos = { x, y };

    if ((obj.otyp | 0) === BOULDER_OTYP && await boulder_hits_pool(obj, x, y, false)) {
        res = true;
    } else if ((obj.otyp | 0) === BOULDER_OTYP && t_at(x, y) != null
               && (is_pit(t_at(x, y).ttyp) || is_hole(t_at(x, y).ttyp))) {
        let t = t_at(x, y);
        const ttyp = t.ttyp;
        const tseen = !!t.tseen;
        let skip_verb_block = false;

        const mtmp = m_at(x, y);
        if ((mtmp && mtmp.mtrapped) || (u.utrap && u_at(x, y))) {
            if (verb && (cansee(x, y) || flooreffects_distu(x, y) === 0))
                pline('%s boulder %s into the pit%s.',
                      _uprop_active('BLINDED') ? 'A' : 'The',
                      vtense(null, verb), mtmp ? '' : ' with you');
            if (mtmp) {
                if (!flooreffects_passes_walls(mtmp.data) && !flooreffects_throws_rocks(mtmp.data)) {
                    const dieroll = 1;
                    if (g.context && g.context.mon_moving) {
                        const damage = dmgval(obj, mtmp);
                        mtmp.mhp = (mtmp.mhp | 0) - damage;
                        if (DEADMONSTER(mtmp)) {
                            if (canspotmon(mtmp))
                                pline('%s is %s!', Monnam(mtmp),
                                      (flooreffects_nonliving(mtmp.data) || flooreffects_is_vampshifter(mtmp))
                                          ? 'destroyed' : 'killed');
                            await flooreffects_mondied(mtmp);
                        }
                    } else {
                        await flooreffects_hmon(mtmp, obj, HMON_THROWN, dieroll);
                    }
                    if (!DEADMONSTER(mtmp) && !flooreffects_is_whirly(mtmp.data))
                        res = false; /* still alive, boulder still intact */
                }
                mtmp.mtrapped = 0;
            } else {
                if (!_uprop_active('PASSES_WALLS') && !flooreffects_throws_rocks(g.youmonst && g.youmonst.data)) {
                    await losehp(flooreffects_Maybe_Half_Phys(rnd(15)), 'squished under a boulder', NO_KILLER_PREFIX);
                    skip_verb_block = true;
                } else {
                    await reset_utrap(true);
                }
            }
        }
        if (!skip_verb_block && verb) {
            const Blind = _uprop_active('BLINDED');
            if (Blind && u_at(x, y)) {
                flooreffects_Soundeffect(se_crashing_boulder, 100);
                await flooreffects_You_hear('a CRASH! beneath you.');
            } else if (!Blind && cansee(x, y)) {
                flooreffects_pline_The('boulder %s%s.',
                    (ttyp === TRAPDOOR && !tseen) ? 'triggers and ' : '',
                    (ttyp === TRAPDOOR) ? 'plugs a trap door'
                        : (ttyp === HOLE) ? 'plugs a hole' : 'fills a pit');
            } else {
                flooreffects_Soundeffect(se_boulder_drop, 100);
                await flooreffects_You_hear('a boulder %s.', verb);
            }
        }
        /* deletedwithboulder: */
        t = t_at(x, y);
        if (t != null) {
            await flooreffects_delfloortrap(t);
            if (u.utrap && u_at(x, y))
                await reset_utrap(false);
        }
        await flooreffects_useupf(obj, 1);
        await flooreffects_bury_objs(x, y);
        newsym(x, y);
        res = true;
    } else if (flooreffects_is_lava(x, y)) {
        res = await flooreffects_lava_damage(obj, x, y);
    } else if (flooreffects_is_pool(x, y)) {
        const Blind = _uprop_active('BLINDED');
        if ((Blind || (pooleffects_Levitation() || pooleffects_Flying())) && !_hero_Deaf() && u_at(x, y)) {
            if (!u.uinwater) {
                if (weight(obj) > WT_SPLASH_THRESHOLD) {
                    pline('Splash!');
                } else if (pooleffects_Levitation() || pooleffects_Flying()) {
                    pline('Plop!');
                }
            }
            map_background(x, y, 0);
            newsym(x, y);
        }
        res = await water_damage(obj, null, false) === ER_DESTROYED;
    } else if (u_at(x, y) && t_at(x, y) != null
               && (uteetering_at_seen_pit(t_at(x, y)) || uescaped_shaft(t_at(x, y)))) {
        const t = t_at(x, y);
        if (is_pit(t.ttyp)) {
            const Blind = _uprop_active('BLINDED');
            if (Blind && !_hero_Deaf()) {
                flooreffects_Soundeffect(se_item_tumble_downwards, 50);
                await flooreffects_You_hear('%s tumble downwards.', await flooreffects_the(await xname(obj)));
            } else {
                pline('%s into %s pit.', Tobjnam(obj, 'tumble'), flooreffects_the_your[t.madeby_u ? 1 : 0]);
            }
        } else if (await ship_object(obj, x, y, false)) {
            res = true;
        }
    } else if (obj.globby) {
        let globbyobj = obj;
        let otmp;
        while (globbyobj && (otmp = (await flooreffects_obj_nexto_xy(globbyobj, x, y, true))) != null) {
            await flooreffects_pudding_merge_message(globbyobj, otmp);
            /* do.c:312 ignores the return; obj_absorb NULLs *obj1 only when
             * globbyobj itself was the absorbed glob. */
            const survivor = await flooreffects_obj_meld(globbyobj, otmp);
            globbyobj = (survivor === globbyobj) ? survivor : null;
        }
        res = !globbyobj;
    } else if (g.context && g.context.mon_moving && IS_ALTAR(_levlAt(x, y) ? _levlAt(x, y).typ : -1)
               && cansee(x, y)) {
        await doaltarobj(obj);
    } else if ((obj.oclass | 0) === FE_POTION_CLASS && ((g.level && g.level.flags && g.level.flags.temperature) | 0) > 0
               && (_levlAt(x, y) && ((_levlAt(x, y).typ === ROOM) || (_levlAt(x, y).typ === CORR)))) {
        if (cansee(x, y)) {
            pline('%s up as %s the hot ground.', Tobjnam(obj, 'heat'),
                  flooreffects_is_plural(obj) ? 'they hit' : 'it hits');
        }
        let survival_chance = obj.blessed ? 70 : 50;
        if (obj.invlet)
            survival_chance += _Luck() * 2;
        if ((obj.otyp | 0) === FE_POT_OIL)
            survival_chance = 100;
        if (!obj_resists(obj, survival_chance, 100)) {
            if (cansee(x, y)) {
                pline('%s from the heat!', flooreffects_is_plural(obj) ? 'They shatter' : 'It shatters');
            } else {
                await flooreffects_You_hear('a shattering noise.');
            }
            await breakobj(obj, x, y, false, false);
            res = true;
        }
    }

    g.gb.bhitpos = save_bhitpos;
    return res;
}

export async function doaltarobj(obj) {
    const g = game;
    const u = g.u || {};
    const COIN_CLASS = 12; /* objclass.h — matches the local const at cmd.js:1498 */
    const Blind = _uprop_active('BLINDED');
    if (Blind)
        return;

    if ((obj.oclass | 0) !== COIN_CLASS) {
        if (!(g.context && g.context.mon_moving)) {
            u.uconduct = u.uconduct || {};
            const prevGnostic = u.uconduct.gnostic | 0;
            u.uconduct.gnostic = prevGnostic + 1;
            if (!prevGnostic)
                livelog_printf(LL_CONDUCT, 'eschewed atheism, by dropping %s on an altar', (await doname(obj)));
        }
    } else {
        obj.blessed = 0;
        obj.cursed = 0;
    }

    if (obj.blessed || obj.cursed) {
        await pline('There is %s flash as %s %s the altar.',
              an(hcolor(obj.blessed ? NH_AMBER : NH_BLACK)), (await doname(obj)),
              otense(obj, 'hit'));
        if (!_uprop_active('HALLUC'))
            obj.bknown = 1;   /* C: ok to skip set_bknown() here */
    } else {
        await pline('%s %s on the altar.', (await _doaltarobj_Doname2(obj)), otense(obj, 'land'));
        if ((obj.oclass | 0) !== COIN_CLASS)
            obj.bknown = 1;   /* C: ok to skip set_bknown() here */
    }
}

// C ref: do.c:782 dropx(obj) → do.c:788 freeinv(obj); do.c:790-796 ship_object/
// IS_ALTAR->doaltarobj; do.c:798 dropy(obj) → do.c:806 dropz(obj, FALSE).
// at the hero's square.  The dropped object must land on game.fobj so the
// next per-turn pet dog_goal scan iterates it (dogmove.js dogfood → obj_resists
// rn2(100)) — exactly the leaf the drop unblocks.
export async function dropx(obj) {
    const g = game;
    const u = g.u || {};
    /* C ref: do.c:788 freeinv(obj) — shared copy above (extract_nobj +
     * pickup_prev=0 + freeinv_core + update_inventory).  Was inlined here;
     * useupall inlined a second, drifted copy that omitted pickup_prev=0. */
    await freeinv(obj);
    if (!u.uswallow) {
        /* C ref: do.c:790-791 ship_object(obj, u.ux, u.uy, FALSE); return if it
         * delivered the object into a shaft/hole/stairs migration. */
        if (await ship_object(obj, u.ux | 0, u.uy | 0, false))
            return;
        /* C ref: do.c:792-793 IS_ALTAR(levl[u.ux][u.uy].typ) -> doaltarobj(obj). */
        const levloc = _levlAt(u.ux | 0, u.uy | 0);
        if (levloc && IS_ALTAR(levloc.typ))
            await doaltarobj(obj);
    }
    await dropy(obj);
}

export async function dropy(obj) {
    return await dropz(obj, false);
}

export async function dropz(obj, with_impact) {
    const g = game;
    const u = g.u || {};
    if (!obj)
        return;
    /* C do.c:811-816 — release the three wielded slots. */
    if (_wt_sameObj(obj, u.uwep || null))
        await setuwep(null);
    if (_wt_sameObj(obj, u.uquiver || null))
        await setuqwep(null);
    if (_wt_sameObj(obj, u.uswapwep || null))
        await setuswapwep(null);
    if (u.uswallow) {
        /* C do.c:817-825 — hero has dropped an item while inside an
         * engulfer.  mpickobj is do.c:824 (void) mpickobj(u.ustuck, obj) —
         * ported at js/mklev.js:15151.  is_unpaid/stolen_value are the
         * shop-billing pair already imported above (shk_is_unpaid,
         * stolen_value); stolen_value forwards to dokick_stolen_value
         * (the shared bill/robbed accounting). */
        if (obj !== u.uball) { /* mon doesn't pick up ball */
            if (shk_is_unpaid(obj))
                await stolen_value(obj, u.ux | 0, u.uy | 0, true, false);
            if (!await engulfer_digests_food(obj))
                await mpickobj(u.ustuck, obj);
        }
    } else {
        if (await flooreffects(obj, u.ux | 0, u.uy | 0, 'drop'))
            return;
        obj.where = OBJ_FREE;
        /* C mkobj.c:2330 place_object() opens with obj_no_longer_held(); this
         * port's place_object is synchronous, so the crysknife reversion
         * (rn2(10) for an erodeproof one) is run here at the drop site. */
        await obj_no_longer_held(obj);
        place_object(obj, u.ux | 0, u.uy | 0);
        if (with_impact)
            await container_impact_dmg(obj, u.ux | 0, u.uy | 0);
        await impact_disturbs_zombies(obj, with_impact);
        if (obj === u.uball)
            await drop_ball(u.ux | 0, u.uy | 0);
        else if (g.level?.flags?.has_shop)
            await sellobj(obj, u.ux | 0, u.uy | 0);
        await stackobj(obj);
        if (_Blind_cmd() && _uprop_active('LEVITATION'))
            map_object(obj, 0);
        newsym(u.ux | 0, u.uy | 0); /* remap location under self */
    }
    await encumber_msg();
}

/* C ref: do.c:848-888 engulfer_digests_food(obj) — called only from dropz's
 * swallowed branch; effects precede deletion, without feeding intrinsics. */
async function engulfer_digests_food(obj) {
    const MEATBALL = 267, MEAT_STICK = 268,
          ENORMOUS_MEATBALL = 269, GLOB_OF_GREEN_SLIME = 273;
    const otyp = obj.otyp | 0;
    const isFoodLike = otyp === CORPSE || !!obj.globby || otyp === MEATBALL
        || otyp === ENORMOUS_MEATBALL || otyp === MEAT_RING
        || otyp === MEAT_STICK;
    /* C do.c:853 — digests(u.ustuck->data) is the outer guard. */
    const engulfer = game.u?.ustuck;
    if (!isFoodLike || !engulfer || !_digests(engulfer.data))
        return false;
    const corpse = otyp === CORPSE, could_slime = otyp === GLOB_OF_GREEN_SLIME;
    const could_poly = corpse && polyfood(obj);
    const could_petrify = corpse && _mh_touch_petrifies(permonstTemplate(obj.corpsenm));
    await pline('%s instantly digested!', Tobjnam(obj, 'are'));
    if (could_poly || could_slime)
        await newcham(engulfer, could_slime ? PM_GREEN_SLIME : null, could_slime ? NC_SHOW_MSG : 0);
    else if (could_petrify)
        await minstapetrify(engulfer, true);
    else if (corpse && obj.corpsenm === PM_WRAITH)
        await grow_up(engulfer, null);
    else if (corpse && obj.corpsenm === PM_NURSE) {
        healmon(engulfer, engulfer.mhpmax, 0);
        if (!engulfer.mcansee) { // C mcureblindness(engulfer, FALSE)
            engulfer.mcansee = 1;
            engulfer.mblinded = 0;
        }
    }
    await delobj_invent(obj);
    return true;
}

// C do.c:947-962 — require explicit consent to drop a fatal corpse bare-handed.
async function better_not_try_to_drop_that(obj) {
    if (obj.otyp === CORPSE && !u_safe_from_fatal_corpse(obj, st_all)) {
        const prompt = `Drop the ${obj_pmname(obj)} corpse without ${body_part(HAND)} protection on?`;
        return (await paranoid_ynq(true, prompt, false)) !== 'y';
    }
    return false;
}

// C ref: do.c:713 drop(struct obj *obj) — drop one selected object.  Returns
// Ported scope (do.c:752-779, the non-swallowed branch):
//   - not a ring on a sink (RING/MEAT_RING + IS_SINK) — skip dosinkring
//   - obj->how_lost = LOST_DROPPED; dropx(obj); return ECMD_TIME.
// RNG-free on this path (no rn2/rnd before the turn advances).
//
// TWO CORRECTIONS TO THIS LIST, and the second is the interesting one.
// (2) "not on an altar — emit the verbose 'You drop %s.' message" describes a
//     body this function no longer has.  It DOES guard on IS_ALTAR (and on
//     flags.verbose) below, and it also grew canletgo() and the three
//     wielded-slot releases.  A scope note that survives the body it scopes
//     reads as a statement about the code and is worse than no note at all —
//     this is the [[our-own-landings-manufacture-stale-premises]] class, and
//     the landing that falsified the line is this file's own.
//           IS_SINK 0, IS_ALTAR 0
//           recheck-when=js-levitation-state-exists (LEVITATION is live in 0
//           for a reason that is itself a gap)
// for: js-levitation-state DOES exist now (LEVITATION is wired, cmd.js
// dodrop.jsonl records 222-230, one continuous turn-419..487 sequence) hits
// actively counting down (112 -> 44) each record, and diverges on every one
// of them with an rng_result_tape_residual (1 draw when the dropped object
// doesn't break, 2+ when it does) because this body takes the ground-drop
// is NOT a gap — a real, RNG-free body already exists at
// js/hold_another_object.js:172 and is used by look/eat/pickup/lock; this
// and it calls the already-real hero_breaks()/breaktest()/obj_resists()
// chain (cmd.js:43560-43626) — but breakmsg() and breakobj() are THROWING
// stubs (cmd.js:43626-43628) whose own dependencies (delobj, costly_spot,
// SILENT under-consumption into a hard throw on every break (MIRROR/EGG in
async function drop(obj) {
    const g = game;
    const u = g.u || {};
    if (!obj)
        return false;            /* ECMD_FAIL — getobj cancelled */
    if (!canletgo(obj, 'drop'))
        return false;            /* ECMD_FAIL — no turn, no RNG */
    if (obj.otyp === CORPSE && await better_not_try_to_drop_that(obj))
        return false;            /* C do.c:720-721 ECMD_FAIL */
    if (_wt_sameObj(obj, u.uwep || null)) {
        if (welded(u.uwep)) {
            await weldmsg(obj);
            return false;        /* ECMD_FAIL */
        }
        await setuwep(null);
    }
    if (_wt_sameObj(obj, u.uquiver || null))
        await setuqwep(null);
    if (_wt_sameObj(obj, u.uswapwep || null))
        await setuswapwep(null);
    if (u.uswallow) {
        if (g.flags && g.flags.verbose) {
            let mnam = mon_nam(u.ustuck);
            if (_digests(u.ustuck.data))
                mnam = `${s_suffix(mnam)} ${mbodypart(u.ustuck, STOMACH)}`;
            await pline(`You drop ${shk_is_unpaid(obj) ? await yobjnam(obj, null) : await doname(obj)} into ${mnam}.`);
        }
    }
    /* C ref: do.c:746-749 — a ring (or meat ring) dropped over a sink. */
    if (!u.uswallow && ((obj.oclass | 0) === _RING_CLASS || (obj.otyp | 0) === MEAT_RING)) {
        const _sl = _levlAt(u.ux | 0, u.uy | 0);
        if (_sl && IS_SINK(_sl.typ)) {
            await _fl_dosinkring(obj);
            return true;         /* ECMD_TIME */
        }
    }
    if (!u.uswallow && !can_reach_floor(true)) {
        const levhack = finesse_ahriman(obj);
        if (levhack)
            u.uprops[LEVITATION].extrinsic = W_ART; /* other than W_ARTI */
        if (g.flags && g.flags.verbose)
            await pline(`You drop ${await doname(obj)}.`);
        await freeinv(obj);
        await hitfloor(obj, true);
        if (levhack)
            await float_down(I_SPECIAL | TIMEOUT, W_ARTI_FW | W_ART);
        return true;             /* ECMD_TIME */
    }
    if (!u.uswallow) {
        const _dl = _levlAt(u.ux | 0, u.uy | 0);
        if (!(_dl && IS_ALTAR(_dl.typ)) && g.flags && g.flags.verbose)
            await pline(`You drop ${await doname(obj)}.`);
        /* A counted drop (`3d`) repeats through rhack(save_cm) without parse()'s
         * flush_screen(1), so the next iteration's getobj yn_function raises
         * this message's more() (topl.c:390-392) over the map as this pline's
         * flush left it — the world turn's pet move is still unflushed.  Map
         * only: bot() (allmain.c:473-478) has already repainted the status. */
        if ((g.multi | 0) > 0) {
            const _dm = g._pending_message;
            if (typeof _dm === 'string' && _dm.startsWith('You drop')) {
                _pline_flush_frame_record(-2, _dm);
                g._plineFlushFrames.at(-1).botl = undefined;
                g._plineFlushFrames.at(-1).mapOnly = true;
            }
        }
    }
    /* C ref: do.c:777-778 — how_lost + dropx.  No go.oldcap reseed here:
     * C writes oldcap only in encumber_msg() (pickup.c:2019), and it may
     * legitimately lag near_capacity() — a pickup during a free command (^V
     * arrival pickup) burdens the hero without calling encumber_msg(), so a
     * drop that unburdens again is silent in C (0 -> 0). */
    obj.how_lost = LOST_DROPPED;
    await dropx(obj);
    /* C ref: do.c:779 return ECMD_TIME — the drop consumes a turn. */
    return true;
}

// C ref: do.c:28 dodrop() — the 'd' command: drop one inventory item.
//   dodrop() → if (*u.ushops) sellobj_state(SELL_DELIBERATE) →
//   result = drop(getobj("drop", any_obj_ok,
//   GETOBJ_PROMPT | GETOBJ_ALLOWCNT)) → if (*u.ushops)
//   sellobj_state(SELL_NORMAL) → if (result) reset_occupations().
// Returns ECMD_TIME on successful drop, ECMD_FAIL on cancel.
/* C ref: do.c:29-43 dodrop — `if (result) reset_occupations();` runs on EVERY
 * nonzero result, ECMD_FAIL included (drop(NULL) after getobj's "Never mind."
 * returns ECMD_FAIL, do.c:716-717), so a cancelled drop still clears
 * context.takeoff (an interrupted 'A' no longer reads "(being doffed)"). */
export async function dodrop() {
    const result = await dodrop_body();
    if (result)
        reset_occupations();
    return result;
}

async function dodrop_body() {
    const g = game;
    const u = g.u || {};

    /* C ref: do.c:32 — if (*u.ushops) sellobj_state(SELL_DELIBERATE) */
    if (u.ushops && u.ushops.length > 0)
        sellobj_state(SELL_DELIBERATE);

    /* C ref: do.c:33 `result = drop(getobj("drop", any_obj_ok, GETOBJ_ALLOWCNT))`
     * — and getobj's FIRST act is the command-queue drain (invent.c:1779-1825).
     * This copy of getobj's prompt loop was missing it, so the invlet
     * iactions.c:173 IA_DROP_OBJ pushes behind `dodrop` was never consumed.
     * The drain body lives once, in getobj_cmdq_drain (cmd.js:14285).
     *
     * NOT PORTED HERE, and named rather than implied: getobj's CMDQ_INT arm
     * (invent.c:1805-1816, the partial-stack count that precedes the key).
     * Nothing in this port calls cmdq_add_int, so no queue site can produce one;
     * when one exists it belongs in getobj_cmdq_drain, not in another copy. */
    {
        const q = await getobj_cmdq_drain(any_obj_ok, GETOBJ_ALLOWCNT);
        if (q.drained) {
            if (!q.obj) {
                /* C do.c:35 — drop(NULL) is ECMD_FAIL: no turn, no RNG. */
                g.context = g.context || {};
                g.context.move = 0;
                if (u.ushops && u.ushops.length > 0)
                    sellobj_state(SELL_NORMAL);
                return ECMD_FAIL;
            }
            return await _dodrop_with(q.obj);
        }
    }
    /* ── getobj("drop", any_obj_ok) prompt ──────────────────────────────────
     * Build the valid-invlet string from the live gi.invent chain (any_obj_ok
     * accepts all carried objects).  C ref: invent.c getobj for(;;) loop. */
    /* C invent.c:1856-1857 — getobj re-letters the pack under !fixinv before
     * collecting the candidate letters. */
    if (!_invlet_constant()) reassign();
    let invlets = '';
    if (g.invent) {
        for (const o of sortloot_invlet_chain(g.invent))
            if (o.invlet) invlets += String.fromCharCode(o.invlet);
    }
    /* C ref: invent.c:1908 — if (suggested > 5) compactify(bp).  any_obj_ok
     * suggests every carried object, so `suggested` == invlets.length; when it
     * exceeds 5 the buffer is range-compacted ("abcdefg" -> "a-g"). */
    const buf = invlets.length > 5 ? compactify(invlets) : invlets;
    /* C ref: invent.c:1934 — Sprintf(eos(qbuf), " [%s or ?*]", buf) when buf[0]. */
    const prompt = `What do you want to drop?${buf ? ' [' + buf + ' or ?*]' : ' [*]'}`;
    /* C ref: tty_yn_function cursor = strlen(qbuf) + 1 (cursor past trailing space). */
    const promptCursor = prompt.length + 1;
    /* C invent.c:1916 — the prompt render and the read are INSIDE getobj's
     * for(;;), so the '?'/'*' menu can hand control back to a fresh prompt. */
    let itemKey = 0;
    let obj = null;
    let dropCnt = 0, dropCntGiven = false;
    /* C win/tty/topl.c:390-392 tty_yn_function opens with
     *     if (ttyDisplay->toplin == TOPLINE_NEED_MORE
     *         && (cw->flags & (WIN_STOP | WIN_NOSTOP)) != WIN_STOP) more();
     * and getobj reaches the screen only through yn_function, so a message still
     * standing on the topline (`2d`: the first pass's "You drop ...", then the
     * repeat's prompt) is paged before the prompt overwrites it.  The shared
     * getobj reader spells the same thing at js/cmd.js:17583. */
    if (g._pending_message && !g._topl_win_stop)
        await force_more(g._pending_message);
    g._topl_win_stop = false;
    g._topl_win_stop_armed = false;
    /* C invent.c:1922-1930 — under iflags.force_invmenu getobj never calls
     * yn_function: the first pass feeds '?' straight into redo_menu (lets is
     * the whole pack here, so never '*'), files the bare qbuf in the message
     * history once, and sets oneloop so a dismissed menu returns NULL. */
    const dropForce = !!(g.iflags?.force_invmenu && !g.in_doagain);
    let dropOneloop = false;
    for (;;) {
        dropCnt = 0;
        dropCntGiven = false;
        let ilet;
        if (dropForce) {
            // C invent.c:1922-1930 retains ilet on a forced-menu retry.
            // An excessive count retries the same object with cnt reset to 0.
            if (!dropOneloop) {
                putmsghistory('What do you want to drop?', false);
                dropOneloop = true;
                ilet = invlets ? 63 /* '?' */ : 42 /* '*' */;
            } else {
                ilet = itemKey;
            }
        } else {
        g._pending_message = prompt;
        /* C topl.c:421 tty_yn_function -> custompline() -> pline.c:282 files
         * "prompt " in gp.prevmsg, so a Norep() of the same text as the PREVIOUS
         * answer (do.c:669 "You cannot drop something you are wearing.") is not
         * read as a repeat the second time round. */
        g._prevmsg = prompt + ' ';
        await flush_screen(1);
        park_prompt_cursor(prompt);
        /* C topl.c:537-539 — tty_yn_function rewrites gt.toplines as
         * prompt + key2txt(q) and THAT is what the history ring files, so the
         * typed count digit ("... or ?*] 3") is part of the entry. */
        const _sh = g._topl_suppress_history;
        g._topl_suppress_history = true;
        try { ilet = g.iflags?.debug_fuzzer ? await readchar() : await nhgetch(); /* read the object letter; cmd.c:5217 fuzzer arm */ }
        finally { g._topl_suppress_history = _sh; }
        putmsghistory(prompt + ' ' + key2txt((typeof ilet === 'number' ? ilet : (ilet?.charCodeAt(0) ?? 0)) & 0xff), false);
        }
        g._topl_sticky = prompt;
        itemKey = typeof ilet === 'number' ? ilet : (ilet?.charCodeAt(0) ?? 0);
        if (itemKey >= 48 /* '0' */ && itemKey <= 57 /* '9' */) {
            const gc = await getobj_get_count(itemKey);
            itemKey = gc.key | 0;
            g._topl_sticky = gc.echo || prompt;
            if (gc.count) {
                dropCnt = gc.count;
                dropCntGiven = true;
            }
        }
        /* C ref: invent.c:1950 — quitchars (ESC/space/CR/LF) cancel getobj → NULL. */
        if (itemKey === 27 || itemKey === 32 || itemKey === 13 || itemKey === 10) {
            await getobj_never_mind();
            g.context.move = 0;   /* drop(NULL) = ECMD_FAIL — no turn, no RNG */
            if (u.ushops && u.ushops.length > 0)
                sellobj_state(SELL_NORMAL);
            return ECMD_FAIL;
        }
        /* C invent.c:1955-1959 — `if (ilet == HANDS_SYM) { if (!allownone)
         * mime_action(word); return allownone ? &hands_obj : NULL; }`.  dodrop's
         * any_obj_ok never allows hands, so '-' mimes and getobj returns NULL →
         * drop(NULL) = ECMD_FAIL, no turn (do.c:35). */
        if (itemKey === 45 /* HANDS_SYM '-' */) {
            await mime_action('drop');
            g.context.move = 0;
            if (u.ushops && u.ushops.length > 0)
                sellobj_state(SELL_NORMAL);
            return ECMD_FAIL;
        }
        /* C invent.c:1960-1999 `redo_menu` — '?'/'*' are not looked up as
         * invlets; display_pickinv's answer becomes ilet.  any_obj_ok
         * (invent.c:1710-1714) returns GETOBJ_SUGGEST for every carried object
         * and never GETOBJ_DOWNPLAY, so `lets` is the whole pack and `altlets`
         * (invent.c:1969-1970) is always empty — '?' and '*' show the same menu. */
        if (itemKey === 63 /* '?' */ || itemKey === 42 /* '*' */) {
            const menuCount = { count: -1 };
            itemKey = await getobj_redo_menu(itemKey, invlets, '', menuCount,
                                             { word: 'drop', allownone: false, buf });
            /* invent.c:1995-1998 — allowcnt && ctmp >= 0: the menu count is the count. */
            if (menuCount.count >= 0) {
                dropCnt = menuCount.count;
                dropCntGiven = true;
            }
            /* invent.c:1989-1993 — ESC: "Never mind." (already plined) → NULL →
             * drop(NULL) = ECMD_FAIL, no turn (do.c:35).  invent.c:1982-1984 —
             * under oneloop (force_invmenu) an empty pick is NULL as well. */
            if (itemKey === 27 || (itemKey === 0 && dropOneloop)) {
                g.context.move = 0;
                if (u.ushops && u.ushops.length > 0)
                    sellobj_state(SELL_NORMAL);
                return ECMD_FAIL;
            }
            /* invent.c:1982-1986 — no selection → re-prompt. */
            if (itemKey === 0) continue;
        }
        /* Resolve the selected object from the live gi.invent chain by invlet
         * (C invent.c:2003-2005 — the `for (otmp = gi.invent; ...)` walk). */
        obj = null;
        for (let o = g.invent; o; o = o.nobj) {
            if ((o.invlet | 0) === itemKey) { obj = o; break; }
        }
        /* C invent.c:2049 — `disp.botl = TRUE;` ("May have changed the amount
         * of money") runs once an ilet has been accepted, before the
         * "You don't have that object/many" checks and before drop() frees
         * the item, so the first pline of the drop (doaltarobj's "lands on
         * the altar") repaints the status line with the post-getobj state. */
        g.disp = g.disp || {};
        g.disp.botl = 1;
        if (obj) {
            /* C invent.c:2050-2053 — save the selection for ^A, not during doagain. */
            if (!g.gi?.in_doagain) {
                if (dropCntGiven && dropCnt > 0)
                    cmdq_add_int(CQ_REPEAT, dropCnt);
                cmdq_add_key(CQ_REPEAT, itemKey);
            }
            if (dropCntGiven) {
                if (dropCnt === 0) { obj = null; g.context.move = 0; return ECMD_FAIL; }
                if (dropCnt > (obj.quan | 0)) {
                    // C invent.c:2064 You() flushes before update_topl/more().
                    pline_flush_point();
                    /* force_invmenu: the menu left the topline empty and C's
                     * oneloop retry re-drops at once, so the message just
                     * concatenates with "You drop ..." (no --More--). */
                    if (dropForce)
                        await pline(`You don't have that many!  You have only ${obj.quan}.`);
                    else
                        await force_more(`You don't have that many!  You have only ${obj.quan}.`);
                    obj = null;
                    continue;
                }
                if (dropCnt !== (obj.quan | 0)) {
                    if (splittable(obj))
                        obj = await splitobj(obj, dropCnt);
                    else if ((obj.otyp | 0) === LOADSTONE && obj.cursed)
                        obj.corpsenm = dropCnt | 0;
                }
            }
            break;
        }
        g._prevmsg = "You don't have that object.";
        // C invent.c:2059 You() reaches pline.c:274 before the pager.
        pline_flush_point();
        await force_more("You don't have that object.");
    }
    return await _dodrop_with(obj);
}

/* C ref: do.c:33-42 dodrop()'s tail, once getobj has produced the object.
 * Factored out of the prompt loop so the command-queue drain above reaches
 * exactly the same code the interactive pick does — one drop path, not two. */
async function _dodrop_with(obj) {
    const g = game;
    const u = g.u || {};
    /* C ref: do.c:35 — drop(obj) returns ECMD_TIME → context.move = TRUE. */
    const result = await drop(obj);
    g.context.move = result ? 1 : 0;
    /* C ref: do.c:36 — if (*u.ushops) sellobj_state(SELL_NORMAL) */
    if (u.ushops && u.ushops.length > 0)
        sellobj_state(SELL_NORMAL);
    /* C ref: do.c:37-38 — if (result) reset_occupations() */
    if (result)
        reset_occupations();
    if (result && g._pending_message) {
        _topl_stash_result();
    }
    return result ? ECMD_TIME : ECMD_FAIL;
}

async function ggetobj_drop(combo = false, ggo = null) {
    if (u_ushops_active()) sellobj_state(SELL_DELIBERATE);
    /* drop() here returns true/false; C's returns ECMD_TIME / ECMD_FAIL (4), and
     * askchain sums them (invent.c:2486 cnt += tmp), so a refused worn item
     * still makes ggetobj's count nonzero and menu_drop spend the move. */
    const dropEcmd = async (o) => {
        const r = await drop(o);
        return r === true ? ECMD_TIME : r === false ? ECMD_FAIL : r;
    };
    const result = await ggetobj('drop', dropEcmd, 0, combo, ggo);
    if (u_ushops_active()) sellobj_state(SELL_NORMAL);
    if (ggo) ggo.finished = !!(ggo.value & 1);
    return result;
}

function u_ushops_active() {
    const us = game.u?.ushops;
    return !!(us && us.length && us[0]);
}

// C ref: do.c:924 doddrop() — the 'D' command.
//   doddrop() → (flags.menu_style != MENU_TRADITIONAL) → menu_drop(0)
//   (do.c:980). With flags.menu_style == MENU_FULL (the default), menu_drop
//   calls query_category("Drop what type of items?", gi.invent,
//     UNPAID_TYPES|ALL_TYPES|CHOOSE_ALL|BUC_BLESSED|BUC_CURSED|BUC_UNCURSED
//     |BUC_UNKNOWN|JUSTPICKED|INCLUDE_VENOM, &pick_list, PICK_ANY)
//   (do.c:994). The PICK_ANY query_category menu (pickup.c:1226) differs from
//   dotypeinv()'s PICK_ONE menu in three ways:
//     1. CHOOSE_ALL prepends an 'A' "Auto-select every relevant item" entry
//        plus a first-time hint "    (ignored unless ... )" and a blank
//        separator (pickup.c:1316-1338).
//     2. ALL_TYPES with ccount>1 prepends an 'a' "All types" entry; the per-
//        class invlets then start at 'b' (pickup.c:1340-1348).
//     3. UNPAID_TYPES contributes "Unpaid items" only when count_unpaid()>0;
//   The BUC cluster (B/C/U/X) is identical to dotypeinv. ESC cancels with no
//   items dropped (select_menu returns 0 → menu_drop returns 0 → doddrop
//   returns ECMD_OK). GENERALCMD-equivalent on cancel: no turn, no RNG.
// C ref: pickup.c:1226 query_category(); pickup.c:1316-1348 A/All-types;
//   pickup.c:1350-1377 class loop; pickup.c:1405-1433 BUC entries.
/* C do.c:1075-1100 — drop each picked entry still in invent (shared by the
 * category-filtered and all-categories query_objlist paths of menu_drop). */
async function ddropSelectedEntries(selectedEntries) {
    const g = game;
        let dropped = 0;
        /* C do.c:933-934 doddrop(): sellobj_state(SELL_DELIBERATE) brackets
         * menu_drop() so each shop sale asks "Sell it? [ynaq]". */
        if (g.u?.ushops && g.u.ushops.length > 0)
            sellobj_state(SELL_DELIBERATE);
        bypass_objlist(g.invent, true);
        for (const entry of selectedEntries) {
            const obj = entry.obj;
            let live = false;
            for (let cur = g.invent; cur; cur = cur.nobj)
                if (cur === obj) { live = true; break; }
            if (!live || !obj.bypass) continue;
            /* C do.c:1097-1101 menudrop_split(): split the requested count
             * immediately before drop, retaining the parent in inventory.
             * A count of zero or the whole stack uses the original object. */
            let dropObj = obj;
            const count = Number(entry.count) || 0;
            if (count > 0 && count < obj.quan) {
                if (welded(obj)) {
                    // C menudrop_split leaves welded stacks intact.
                } else if (obj.otyp === LOADSTONE && obj.cursed) {
                    obj.corpsenm = count;
                } else dropObj = (await splitobj(obj, count));
            }
            if (await drop(dropObj)) {
                dropped++;
                if (g._pending_message) _topl_stash_result();
            }
        }
        bypass_objlist(g.invent, false);
        /* C do.c:938-939 */
        if (g.u?.ushops && g.u.ushops.length > 0)
            sellobj_state(SELL_NORMAL);
        g.context.move = dropped ? 1 : 0;
        if (dropped) reset_occupations();
}

export async function doddrop() {
    const g = game;
    const u = g.u || {};
    const initrole = (g.flags?.initrole ?? -1) | 0;
    /* C do.c:931-936 — `if (flags.menu_style != MENU_TRADITIONAL
     *     || (result = ggetobj("drop", drop, 0, FALSE, 0)) < -1)
     *     result = menu_drop(result);`.  MENU_TRADITIONAL (hack.h, 0) skips the
     * category menu and asks the typed-letters question instead. */
    /* C do.c:924-929 — `if (!gi.invent) { You("have nothing to drop.");
     * return ECMD_OK; }` precedes every menu style. */
    if (!g.invent) {
        g.context.move = 0;
        await pline("You have nothing to drop.");
        return g.context.move ? ECMD_TIME : ECMD_OK;
    }
    add_valid_menu_class(0); // C do.c:932, before either menu style.
    let retry = 0;
    const ggo = { olets: [], bucs: '', unpaidOnly: false, finished: false };
    if (g.invent && (g.flags?.menu_style | 0) === 0 && g.flags?.menu_style !== undefined) {
        const result = await ggetobj_drop(false, ggo);
        /* C do.c:935-937: only a menu request retries through menu_drop. */
        if (result < -1) {
            retry = result;
        } else {
            /* C do.c:938-940 — `return result`: the raw count is the command's
             * ECMD_* bit set, so two drops read as ECMD_CANCEL and spend no
             * time (ECMD_TIME is 1). */
            g.context.move = (result & ECMD_TIME) ? 1 : 0;
            if (result) reset_occupations();
            return result;
        }
    }
    if (retry || (g.invent && (g.flags?.menu_style | 0) === MENU_COMBINATION)) {
        /* C do.c:1022-1032 — MENU_COMBINATION gathers classes via ggetobj(...,
         * TRUE, &ggoresults); -2 means all_categories, ALL_FINISHED ends it. */
        /* C do.c:990-991: retry -2 selects all, -3 uses the saved filters. */
        const i = retry || await ggetobj_drop(true, ggo);
        if (ggo.finished) {
            g.context.move = (i > 0) ? 1 : 0;
            if (i) reset_occupations();
            return g.context.move ? ECMD_TIME : ECMD_OK;
        }
        const allCategories = (i === -2);
        const filter = (o) => {
            if (allCategories) return true;
            /* C pickup.c:526-528: empty filters match only with ParanoidAutoAll. */
            if (!ggo.olets.length && !ggo.bucs && !ggo.unpaidOnly && !(g.flags?.paranoia_bits & PARANOID_AUTOALL)) return false;
            if ((o.oclass | 0) === COIN_CLASS_C && ggo.olets.length)
                return ggo.olets.includes(COIN_CLASS_C);
            if ((g.flags?.initrole | 0) === 6 && !o.bknown) set_bknown(o, 1);
            if (ggo.olets.length && !ggo.olets.includes(o.oclass | 0)) return false;
            if (ggo.unpaidOnly && !ckunpaid(o)) return false;
            if (ggo.bucs) {
                if (ggo.bucs.includes('P') && !o.pickup_prev) return false;
                const bc = ggo.bucs.replace('P', '');
                if (bc) {
                    let c;
                    if ((o.oclass | 0) === COIN_CLASS_C) c = g.flags?.goldX ? 'X' : 'U';
                    else if (!o.bknown) c = 'X';
                    else if (o.blessed) c = 'B';
                    else if (o.cursed) c = 'C';
                    else c = 'U';
                    if (!bc.includes(c)) return false;
                }
            }
            return true;
        };
        let any = false;
        for (let o = g.invent; o; o = o.nobj) if (filter(o)) { any = true; break; }
        if (!any) { g.context.move = 0; return ECMD_OK; }
        const { selectedEntries = [] } = await inventory_menu_legacy({
            title: 'What would you like to drop?',
            queryObjlist: true,
            pickAny: true,
            filter,
        });
        await ddropSelectedEntries(selectedEntries);
        return g.context.move ? ECMD_TIME : ECMD_OK;
    }
    /* C do.c:991-1032 menu_drop(): only MENU_FULL asks query_category and only
     * MENU_COMBINATION runs ggetobj; MENU_PARTIAL (menustyle:partial) skips
     * both with all_categories TRUE, going straight to query_objlist. */
    if (g.invent && (g.flags?.menu_style | 0) === MENU_PARTIAL) {
        const { selectedEntries = [] } = await inventory_menu_legacy({
            title: 'What would you like to drop?',
            queryObjlist: true,
            pickAny: true,
            filter: () => true,
        });
        await ddropSelectedEntries(selectedEntries);
        return g.context.move ? ECMD_TIME : ECMD_OK;
    }
    /* C ref: do.c:928 — "have nothing to drop" if gi.invent is empty. */
    /* Determine carried object classes + BUC counts.  Prefer the live invent
     * chain; fall back to the role's deterministic starting kit (same logic as
     * dotypeinv). */
    // C do.c:997, pickup.c:1311-1313: INCLUDE_VENOM appends to pack order.
    const dropOrder = (g.flags?.inv_order || INV_ORDER).concat(17);
    let carried;
    let bcnt = 0, ucnt = 0, ccnt = 0, xcnt = 0;
    if (g.invent) {
        const present = new Set();
        for (let o = g.invent; o; o = o.nobj) present.add(o.oclass | 0);
        /* C ref: pickup.c:1263-1281 — query_category calls count_buc() ONCE PER
         * BUCX BIT with the same ofilter (NULL here: doddrop passes no
         * WORN_TYPES).  Do the same rather than a single hand-rolled tally: the
         * tally that used to live here had no COIN_CLASS arm, so carried gold
         * fell through to the bknown test and produced a spurious 'X' row.
         * count_buc() also carries C's Role_if(PM_CLERIC) bknown WRITE, which a
         * read-only tally cannot. */
        bcnt = count_buc(g.invent, BUCT_BLESSED, null);
        ccnt = count_buc(g.invent, BUCT_CURSED, null);
        ucnt = count_buc(g.invent, BUCT_UNCURSED, null);
        xcnt = count_buc(g.invent, BUCT_UNKNOWN, null);
        carried = dropOrder.filter((oc) => present.has(oc));
    } else {
        const kit = ROLE_INVENTORY_CLASSES[initrole];
        if (!kit) {
            /* C ref: do.c:928 — no invent → "have nothing to drop." */
            g.context.move = 0;
            await pline("You have nothing to drop.");
            return g.context.move ? ECMD_TIME : ECMD_OK;
        }
        const present = new Set(kit.classes);
        carried = dropOrder.filter((oc) => present.has(oc));
        bcnt = kit.bcnt; ucnt = kit.ucnt; ccnt = kit.ccnt; xcnt = kit.xcnt;
    }
    if (carried.length === 0) {
        /* C ref: do.c:928 — gi.invent empty. */
        g.context.move = 0;
        await pline("You have nothing to drop.");
        return g.context.move ? ECMD_TIME : ECMD_OK;
    }
    /* C pickup.c:1511-1536 counts only flags.inv_order, without the venom
     * class appended for display by INCLUDE_VENOM (pickup.c:1311-1313). */
    const ccount = carried.filter((oc) => oc !== 17).length;
    /* C pickup.c:1297-1313: return the sole category before creating a menu
     * or incrementing query_category's first-time AutoAll hint counters. */
    const ddropNumBuc = (bcnt ? 1 : 0) + (ccnt ? 1 : 0) + (ucnt ? 1 : 0) + (xcnt ? 1 : 0);
    if (ccount === 1 && !count_unpaid(g.invent) && ddropNumBuc <= 1) {
        /* C pickup.c:1290-1297 returns the first object's class, even when
         * that object is venom excluded from the category count above. */
        add_valid_menu_class(g.invent.oclass | 0);
        const { selectedEntries = [] } = await inventory_menu_legacy({
            title: 'What would you like to drop?',
            queryObjlist: true,
            pickAny: true,
            filter: allow_category,
        });
        await ddropSelectedEntries(selectedEntries);
        return g.context.move ? ECMD_TIME : ECMD_OK;
    }
    /* show_a: ALL_TYPES set and ccount>1 (pickup.c:1314). */
    const show_a = ccount > 1;
    const prompt = 'Drop what type of items?';
    const windowLines = [];
    windowLines.push(menu_heading_text(prompt)); /* C allmain.c:728, wintty.c:2688 */
    windowLines.push('');                          /* blank line after title */
    /* CHOOSE_ALL cluster: 'A' Auto-select + hint + blank.  C ref:
     * pickup.c:1316-1338.  verify_All = (how == PICK_ANY) && ParanoidAutoAll;
     * without it the "(ignored unless ...)" hint shows on the first call (or
     * always with cmdassist); with it the "'a' is implied" hint shows on the
     * first call (or with cmdassist) only when show_a. */
    const ddropBits = (g.flags?.paranoia_bits
                       ?? PARANOID_CONFIRMATION_DEFAULT_BITS) | 0;
    const verifyAll = !!(ddropBits & PARANOID_AUTOALL);
    g.ga ||= {};
    windowLines.push(menucolor_row('A - Auto-select every relevant item'));
    if (!verifyAll) {
        const firstHint = g.ga.A_first_hint | 0;
        g.ga.A_first_hint = firstHint + 1;
        if (!firstHint || (g.iflags?.cmdassist ?? true))
            windowLines.push(menucolor_row('    (ignored unless some other choices are also picked)'));
    } else if (show_a) {
        const secondHint = g.ga.A_second_hint | 0;
        g.ga.A_second_hint = secondHint + 1;
        if (!secondHint || (g.iflags?.cmdassist ?? true))
            windowLines.push(menucolor_row("    (if no other choices are picked, 'a' is implied)"));
    }
    windowLines.push('');                          /* blank separator */
    /* show_a: 'a' All types (pickup.c:1341-1348). */
    let invlet = 97; /* 'a' */
    if (show_a) {
        windowLines.push(menucolor_row(`${String.fromCharCode(invlet++)} - All types`));
    }
    /* One menu entry per carried class, invlets continuing from 'a'/'b'. */
    for (const oc of carried) {
        let name = OCLASS_NAME[oc];
        // C pickup.c:1360, invent.c:4829-4836: let_to_name with showsym.
        if (g.iflags?.menu_head_objsym)
            name += ' '.repeat(Math.max(0, 7 - name.length)) + `  ('${def_oc_syms_chars[oc]}')`;
        windowLines.push(menucolor_row(`${String.fromCharCode(invlet++)} - ${name}`));
    }
    let njp = 0, njpObj = null;
    for (let o = g.invent; o; o = o.nobj)
        if (o.pickup_prev) {
            if (!njp) njpObj = o;
            njp++;
        }
    if (typeof process !== 'undefined' && ENV?.FF_DEBUG_JP)
        console.error('JPDBG', njp, [...(function*(){for(let o=g.invent;o;o=o.nobj)yield {otyp:o.otyp,p:o.pickup_prev,where:o.where};})()]);
    /* BUC cluster: blank separator then B/C/U/X (pickup.c:1379-1433). */
    const dropUnpaid = count_unpaid(g.invent) > 0;
    if (dropUnpaid || bcnt || ccnt || ucnt || xcnt || njp) {
        windowLines.push('');
        if (dropUnpaid) windowLines.push(menucolor_row('u - Unpaid items')); /* pickup.c:1387 */
        if (bcnt) windowLines.push(menucolor_row('B - Items known to be Blessed'));
        if (ccnt) windowLines.push(menucolor_row('C - Items known to be Cursed'));
        if (ucnt) windowLines.push(menucolor_row('U - Items known to be Uncursed'));
        if (xcnt) windowLines.push(menucolor_row('X - Items of unknown Bless/Curse status'));
    }
    /* C pickup.c:1433-1445 — the JUSTPICKED row, last in the menu. */
    if (njp) {
        windowLines.push(menucolor_row(njp === 1
            ? `P - Just picked up: ${(await doname(njpObj))}`
            : 'P - Items you just picked up'));
    }
    windowLines.push('(end)');
    /* C wintty.c:1908 (H2344_BROKEN) offx clamp, min(cols/2, cols-maxcol-1). */
    const WIN_COL = tty_window_offx(windowLines, 'end');
    const uac = u.uac ?? 0;
    /* Cursor after '(end)': WIN_COL + len('(end)') + 1, row = last line. */
    const endRow = windowLines.length - 1;
    /* C wintty.c:1927 — `!iflags.menu_overlay` drops the NHW_MENU to offx 0 and
     * clears the whole screen: one-space margin, "(end) " footer. */
    const ddFullScreen = g.iflags?.menu_overlay === false || g.iflags?.menu_overlay === 0
        || windowLines.length >= 24 /* wintty.c:1927 maxrow >= rows */
        /* wintty.c:1917 offx < 0 -> 0, then process_menu_window (:1407) clears the
         * screen for any offx == 0 menu: maxcol = longest + 2, offx = 79 - maxcol. */
        || windowLines.some((ln) => String(ln).replace(/\x1b\[[0-9;]*[A-Za-z]/g, '').length >= 78);
    const ddBuild = (lines) => ddFullScreen
        ? Array.from({ length: 24 }, (_, i) => (i < lines.length && lines[i] !== '' ? ` ${lines[i]}`.slice(0, 79) : '')).join('\n')
        : build_window_screen(lines, WIN_COL, uac);
    const endCursorCol = ddFullScreen ? 1 + '(end) '.length : WIN_COL + 5 + 1;
    /* C ref: do.c:994 select_menu(win, PICK_ANY, ...) -> win/tty/wintty.c
     * process_menu_window.  A PICK_ANY menu is NOT closed by picking a row: a
     * selector TOGGLES that row and the menu stays up (:1749-1755 only sets
     * `finished` when how == PICK_ONE).  This site read exactly ONE key and
     * returned, so every key the player spent selecting classes was a key C
     * consumed inside the menu and this port answered the NEXT prompt with.
     * The menu is finished only by ESC (:1663 cancel), CR/LF (:1676 commit) or
     * space on the last page (:1621-1630).
     *
     * Row state IS modelled, because the toggle repaints: toggle_menu_curr ->
     * set_item_state (wintty.c:1176-1192) rewrites the third column of that one
     * row to '+' when it becomes selected and '-' when it becomes unselected
     * ("a - All types" becomes "a + All types").  Note it is '+' and NOT the
     * '*' of the full-page draw at :1467-1473: a toggle leaves page_start
     * non-null, so the page-redraw block at :1400 is skipped and only
     * set_item_state runs.  The class rows also carry
     * def_oc_syms[oclass].sym as a group accelerator (pickup.c:1359), which
     * inverts that one row (:1742-1747 invert_all); the 'A', 'a' and B/C/U/X
     * rows pass 0, so they have no accelerator.
     *
     * The whole-menu/whole-page commands '.' ',' '-' '\' '@' '~' (:1649-1699)
     * are modelled below via menuitem_invert_test (windows.c:1562).  The drop
     * itself is still not performed here. */
    const ddropRows = [];   /* { line, selector, gsym, skipinvert } for each selectable row */
    for (let i = 0; i < windowLines.length; i++) {
        const m = /^(.) - /.exec(windowLines[i]);
        if (m) ddropRows.push({ line: i, selector: m[1], gsym: '', skipinvert: true });
    }
    {   /* the class rows are the ones after 'A' (and 'a' when show_a), in order;
         * only they lack MENU_ITEMFLAGS_SKIPINVERT (pickup.c:1391-1424, :1441). */
        const firstClassRow = 1 + (show_a ? 1 : 0);
        for (let k = 0; k < carried.length; k++) {
            const row = ddropRows[firstClassRow + k];
            if (row) { row.gsym = def_oc_syms_chars[carried[k]] ?? ''; row.skipinvert = false; }
        }
    }
    const ddropSelected = new Set();
    const ddropCounts = new Map();   /* selector -> typed count (wintty.c:1565-1612) */
    /* C ref: win/tty/getline.c:213 — the MENU_SEARCH getlin ends with
     * clear_nhwindow(WIN_MESSAGE), which blanks the WHOLE of screen row 0, this
     * window's reverse-video title text with it.  process_menu_window only
     * repaints on a page change, so within one select_menu() call it never
     * comes back.  Same flag, same reason, as js/shk.js:501. */
    let ddropTitleErased = false;
    const ddropPaintedLines = () => {
        const painted = windowLines.slice();
        for (const row of ddropRows)
            if (ddropSelected.has(row.selector))
                painted[row.line] = painted[row.line].slice(0, 2)
                                  + (ddropCounts.has(row.selector) ? '#' : '+')
                                  + painted[row.line].slice(3);
        if (ddropTitleErased) painted[0] = '';
        return painted;
    };
    const showDdropMenu = async () => {
        g._screen_output = ddBuild(ddropPaintedLines());
        set_cursor(endCursorCol, endRow);
    };
    await showDdropMenu();
    const ddropSelectors = ddropRows.map((r) => r.selector).join('');
    const ddropGacc = ddropRows.map((r) => r.gsym).join('');
    const ddropKey = await await_menu_key(showDdropMenu, ddropSelectors, ddropGacc, PICK_ANY,
        (ch, cnt) => {
            /* C ref: wintty.c:1649-1699 — the menu commands are cases of the
             * switch, so they are tested before the selector and group
             * accelerator lookup below.  The whole menu is one page here, so
             * select/unselect/invert PAGE and ALL act on the same rows.
             * windows.c:1562 menuitem_invert_test: SKIPINVERT rows pass in
             * mode 0, pass only when selected in mode 1, and never pass in
             * mode 2.  Unflagged class rows always pass. */
            const bulk = ch === '.' || ch === ',' ? 'select'
                : ch === '-' || ch === '\\' ? 'unselect'
                : ch === '@' || ch === '~' ? 'invert' : null;
            if (bulk) {
                for (const r of ddropRows) {
                    const mode = g.iflags?.menuinvertmode ?? 1; // C windows.c:1583-1588
                    if (r.skipinvert && (mode === 2
                        || (mode === 1 && !ddropSelected.has(r.selector)))) continue;
                    if (bulk === 'select') ddropSelected.add(r.selector);
                    else if (bulk === 'unselect') ddropSelected.delete(r.selector);
                    else if (ddropSelected.has(r.selector)) ddropSelected.delete(r.selector);
                    else ddropSelected.add(r.selector);
                }
                return;
            }
            const row = ddropRows.find((r) => r.selector === ch)
                     ?? ddropRows.find((r) => r.gsym && r.gsym === ch);
            if (!row) return;
            if (ddropSelected.has(row.selector)) {
                ddropSelected.delete(row.selector);
                ddropCounts.delete(row.selector);
            } else {
                ddropSelected.add(row.selector);
                if (cnt > 0) ddropCounts.set(row.selector, cnt);
            }
        },
        async () => menu_search_case(
            'ANY',
            ddropRows.map((r) => ({ str: windowLines[r.line], r })),
            () => ddBuild(ddropPaintedLines()).split('\n'),
            (curr) => {
                const selr = curr.r.selector;
                if (ddropSelected.has(selr)) ddropSelected.delete(selr);
                else ddropSelected.add(selr);
            })
            .then((fin) => { ddropTitleErased = true; return fin; }));
    /* windows.c:1859-1863 keeps bot disabled through select_menu's dismissal.
     * wintty.c:978-982 restores a full-screen window with docrt/flush_screen,
     * or a corner with docorner(offx, maxrow + 1, 0), before query_category
     * processes AutoAll (pickup.c:1454). */
    const savedDropBotDisabled = g._bot_disabled;
    g._bot_disabled = true;
    try {
        if (ddFullScreen) {
            await docrt();
            await flush_screen(1);
            status_r1_menu_docrt();
            g._r1botAfterMap = g.level;
            g._r1textOver = true;
        } else {
            docorner_blank_utf8_captures(WIN_COL - 1, endRow + 2);
            docorner_status_rows(WIN_COL - 1, endRow + 2);
            /* wintty.c:3715-3719: even ymax == status offy requests BL_RESET;
             * the disabled bot() leaves it pending for the next paint. */
            if (endRow + 2 >= (_threeStatusLines() ? 21 : 22))
                g.disp.botlx = 1;
        }
    } finally { g._bot_disabled = savedDropBotDisabled; }
    if (ddropKey === 27)
        ddropSelected.clear();
    /* C pickup.c:1454-1502 — query_category's AutoAll post-processing.
     * ALL_TYPES_SELECTED is tracked apart from the 'a' selector, since without
     * show_a the first class row is the one lettered 'a'. */
    let ddropAllTypes = show_a && ddropSelected.has('a');
    let ddropNoRelevant = false;
    if (ddropSelected.size > 0 && verifyAll && ddropSelected.has('A')) {
        switch (await paranoid_ynq(!!(ddropBits & PARANOID_CONFIRM),
                                   'Really autoselect All?', true)) {
        case 'y':
            break;
        case 'n':
            ddropSelected.delete('A');
            /* lone 'A' declined becomes ALL_TYPES_SELECTED (qflags has ALL_TYPES) */
            if (ddropSelected.size === 0) ddropAllTypes = true;
            break;
        default:
            ddropSelected.clear();
            break;
        }
    } else if (ddropSelected.size === 1 && !verifyAll && ddropSelected.has('A')) {
        ddropSelected.clear();
        await pline('No relevant items selected.');
        ddropNoRelevant = true;
    }
    /* C do.c:1003-1018 — 'A' sets drop_everything; any class/BUC/P choice
     * (listed after 'A') clears it; ALL_TYPES_SELECTED does not. */
    const dropEverything = ddropSelected.has('A')
        && ![...ddropSelected].some((ch) => ch !== 'A' && !(show_a && ch === 'a'));
    /* C do.c:981-1063 menu_drop() — CHOOSE_ALL ('A') is meaningful only when
     * another category was selected.  In that case C walks the live inventory
     * with bypass_objlist/nxt_unbypassed_obj, because drop() may unlink or split
     * the current object. */
    const autoPick = ddropSelected.has('A');
    let autoDropped = false;
    if (autoPick) {
        const allSelected = ddropAllTypes;
        const classRows = new Map();
        const firstClassRow = 1 + (show_a ? 1 : 0);
        for (let k = 0; k < carried.length; k++) {
            const row = ddropRows[firstClassRow + k];
            if (row) classRows.set(row.selector, carried[k]);
        }
        const selectedClasses = new Set(
            [...ddropSelected].filter((ch) => classRows.has(ch))
                .map((ch) => classRows.get(ch)));
        const selectedBuc = new Set([...ddropSelected].filter((ch) => 'BCUX'.includes(ch)));
        const pickedSelected = ddropSelected.has('P');
        const unpaidSelected = ddropSelected.has('u');
        const matches = (obj) => {
            if (dropEverything || allSelected) return true;
            /* C pickup.c:523-527 — a selected coin class is accepted before
             * the picked-up or BUC predicates. */
            if ((obj.oclass | 0) === COIN_CLASS_C && selectedClasses.size)
                return selectedClasses.has(COIN_CLASS_C);
            if ((g.flags?.initrole | 0) === 6 && !obj.bknown)
                set_bknown(obj, 1); /* Role_if(PM_CLERIC), pickup.c:535-536 */
            if (pickedSelected && !obj.pickup_prev) return false;
            if (selectedClasses.size && !selectedClasses.has(obj.oclass | 0)) return false;
            if (unpaidSelected && !ckunpaid(obj)) return false; // C pickup.c:562-565
            if (selectedBuc.size) {
                let bucMatch;
                if ((obj.oclass | 0) === COIN_CLASS_C)
                    bucMatch = selectedBuc.has(g.flags?.goldX ? 'X' : 'U');
                else if (!obj.bknown)
                    bucMatch = selectedBuc.has('X');
                else if (obj.blessed)
                    bucMatch = selectedBuc.has('B');
                else if (obj.cursed)
                    bucMatch = selectedBuc.has('C');
                else
                    bucMatch = selectedBuc.has('U');
                if (!bucMatch) return false;
            }
            return selectedClasses.size > 0 || selectedBuc.size > 0 || pickedSelected || unpaidSelected;
        };
        let nDropped = 0;
        if (u.ushops && u.ushops.length)
            sellobj_state(SELL_DELIBERATE);
        bypass_objlist(g.invent, false);
        for (;;) {
            const obj = nxt_unbypassed_obj(g.invent);
            if (!obj) break;
            if (!matches(obj)) continue;
            const result = await drop(obj);
            if (result) {
                nDropped++;
                if (g._pending_message) _topl_stash_result();
            }
        }
        if (u.ushops && u.ushops.length)
            sellobj_state(SELL_NORMAL);
        bypass_objlist(g.invent, false);
        g.context.move = nDropped ? 1 : 0;
        autoDropped = nDropped > 0;
        if (nDropped)
            reset_occupations();
    }
    /* C do.c:1062-1068 — 'P' picked with exactly one just-picked stack drops
     * it at once (count from the menu row), with no object query. */
    if (!autoDropped && !autoPick && ddropSelected.has('P')) {
        let njpDrop = 0, jpObj = null;
        for (let o = g.invent; o; o = o.nobj)
            if (o.pickup_prev) { if (!njpDrop) jpObj = o; njpDrop++; }
        if (njpDrop === 1) {
            if (g.u?.ushops && g.u.ushops.length > 0)
                sellobj_state(SELL_DELIBERATE);
            const cnt = Math.max(0, ddropCounts.get('P') | 0);
            let dropObj = jpObj;
            if (cnt && cnt < jpObj.quan) {
                if (welded(jpObj)) {
                    // C menudrop_split leaves welded stacks intact.
                } else if (jpObj.otyp === LOADSTONE && jpObj.cursed) {
                    jpObj.corpsenm = cnt;
                } else dropObj = await splitobj(jpObj, cnt);
            }
            const dropped = await drop(dropObj);
            if (g.u?.ushops && g.u.ushops.length > 0)
                sellobj_state(SELL_NORMAL);
            g.context.move = dropped ? 1 : 0;
            if (dropped) reset_occupations();
            return g.context.move ? ECMD_TIME : ECMD_OK;
        }
    }
    /* C do.c:1069-1074 — after category filters commit, menu_drop opens a
     * second PICK_ANY query_objlist over the live inventory.  Keep this
     * continuation separate from CHOOSE_ALL/autopick: the selected category
     * filters are applied by the object menu, and the chosen object is then
     * passed through the ordinary drop() path. */
    if (!autoDropped && !autoPick && (ddropSelected.size > 0 || ddropAllTypes)) {
        const allSelected = ddropAllTypes;
        const firstClassRow = 1 + (show_a ? 1 : 0);
        const classRows = new Map();
        for (let k = 0; k < carried.length; k++) {
            const row = ddropRows[firstClassRow + k];
            if (row) classRows.set(row.selector, carried[k]);
        }
        const selectedClasses = new Set(
            [...ddropSelected].filter((ch) => classRows.has(ch))
                .map((ch) => classRows.get(ch)));
        const selectedBuc = new Set([...ddropSelected].filter((ch) => 'BCUX'.includes(ch)));
        const pickedSelected = ddropSelected.has('P');
        const unpaidSelected = ddropSelected.has('u');
        const filter = (obj) => {
            if (allSelected) return true;
            if ((obj.oclass | 0) === COIN_CLASS_C && selectedClasses.size)
                return selectedClasses.has(COIN_CLASS_C);
            if ((g.flags?.initrole | 0) === 6 && !obj.bknown)
                set_bknown(obj, 1); /* Role_if(PM_CLERIC), pickup.c:535-536 */
            if (pickedSelected && !obj.pickup_prev) return false;
            if (selectedClasses.size && !selectedClasses.has(obj.oclass | 0)) return false;
            if (unpaidSelected && !ckunpaid(obj)) return false; // C pickup.c:562-565
            if (selectedBuc.size) {
                let bucMatch;
                if ((obj.oclass | 0) === COIN_CLASS_C)
                    bucMatch = selectedBuc.has(g.flags?.goldX ? 'X' : 'U');
                else if (!obj.bknown)
                    bucMatch = selectedBuc.has('X');
                else if (obj.blessed)
                    bucMatch = selectedBuc.has('B');
                else if (obj.cursed)
                    bucMatch = selectedBuc.has('C');
                else
                    bucMatch = selectedBuc.has('U');
                if (!bucMatch) return false;
            }
            return selectedClasses.size > 0 || selectedBuc.size > 0 || pickedSelected || unpaidSelected;
        };
        const { selectedEntries = [] } = await inventory_menu_legacy({
            title: 'What would you like to drop?',
            queryObjlist: true,
            pickAny: true,
            filter,
            statusClipCol: !ddFullScreen && windowLines.length >= (_threeStatusLines() ? 21 : 22) ? WIN_COL - 2 : undefined,
            statusClipMaxRow: windowLines.length,
        });
        await ddropSelectedEntries(selectedEntries);
        return g.context.move ? ECMD_TIME : ECMD_OK;
    }
    if (!autoDropped && !autoPick && !ddropNoRelevant)
        g._pending_message = '';
    await flush_screen(1);
    if (!autoDropped)
        g.context.move = 0;  /* cancelled menu — no turn, no RNG */
    return g.context.move ? ECMD_TIME : ECMD_OK;
}

// C ref: do.c:1479 goto_level() — the mid-game level-change driver.
// PORTED SCOPE: the NEW-LEVEL-GEN branch for an in-dungeon descend
// (at_stairs, !newdungeon, !portal, !falling, main dungeon).  When the
// destination level has never been generated (no LFILE_EXISTS flag), C calls
// mklev() (do.c:1713) to build it; mklev() itself runs getbones(bones.c:643)
// rn2(3) then makelevel(mklev.c:1295) — the ~2,500-9,000-leaf level body.  If
// makelevel is faithful, re-entering it for the new dlevel reproduces C's leaf
// stream WHOLESALE.  The REVISIT branch (do.c:1716, getlev reload) is a
// SEPARATE port and is NOT handled here; goto_level falls through to a no-op
// rather than mis-generating a fresh level).
//
// mklev() — getbones rn2(3), then the makelevel body.  Nothing in goto_level's
// pre-mklev bookkeeping (keepdogs, vision_recalc, savelev, set_ustuck) or its
// post-mklev arrival (losedogs, u_on_upstairs, run_timers) draws RNG on this
// path, so the driver is RNG-neutral around the mklev() call.
const _FAM_MSGS = [
    'You have a sense of deja vu.',
    "You feel like you've been here before.",
    'This place %s familiar...',
    null,
];

const _HALU_FAM_MSGS = [
    'Whoa!  Everything %s different.',
    'You are surrounded by twisty little passages, all alike.',
    "Gee, this %s like uncle Conan's place...",
    null,
];

async function familiar_level_msg() {
    const which = rn2(4);
    let mesg = _uprop_active('HALLUC') ? _HALU_FAM_MSGS[which] : _FAM_MSGS[which];
    if (mesg && mesg.indexOf('%') >= 0)
        mesg = mesg.replace('%s', !_hero_Blind() ? 'looks' : 'seems');
    if (mesg)
        await pline(mesg);
}

/* C mplayer.c:19-40 developers[] — dev_name()'s table (the final "" is real). */
const _FL_DEVELOPERS = [
    'Alex', 'Dave', 'Dean', 'Derek', 'Eric', 'Izchak', 'Janet', 'Jessie', 'Ken',
    'Kevin', 'Michael', 'Mike', 'Pasi', 'Pat', 'Patric', 'Paul', 'Sean', 'Steve',
    'Timo', 'Warwick',
    'Bill', 'Eric', 'Keizo', 'Ken', 'Kevin', 'Michael', 'Mike', 'Paul', 'Stephen',
    'Steve', 'Timo', 'Yitzhak',
    'Andy', 'Gregg', 'Janne', 'Keni', 'Mike', 'Olaf', 'Richard',
    'Andy', 'Chris', 'Dean', 'Jon', 'Jonathan', 'Kevin', 'Wang',
    'Eric', 'Marvin', 'Warwick',
    'Alex', 'Dion', 'Michael',
    'Helge', 'Ron', 'Timo',
    'Joshua', 'Pat', '',
];

const _FL_M2_FEMALE = 0x00020000;

const _FL_PM_ALIGNED_CLERIC = 275;

/* C mplayer.c:46-68 dev_name() */
function _fl_dev_name() {
    const n = _FL_DEVELOPERS.length;
    let m = 0, i, match;
    do {
        match = false;
        i = rn2(n);
        for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
            const pmi = _fl_pmidx(mtmp);
            if (pmi < _FL_PM_ARCHEOLOGIST || pmi > _FL_PM_WIZARD) /* !is_mplayer */
                continue;
            const given = has_mgivenname(mtmp) ? mtmp.mextra.mgivenname : '';
            const dev = _FL_DEVELOPERS[i];
            if (given.startsWith(dev)) { /* strncmp(dev, given, strlen(dev)) == 0 */
                match = true;
                break;
            }
        }
        m++;
    } while (match && m < 100); /* m for insurance */
    if (match)
        return null;
    return _FL_DEVELOPERS[i];
}

/* C mplayer.c:70-93 get_mplname() */
function _fl_get_mplname(mtmp) {
    const pm = mtmp.data ?? permonstTemplate(mtmp.mndx);
    const fmlkind = (((pm?.mflags2 | 0) & _FL_M2_FEMALE) !== 0);
    const devnam = _fl_dev_name();
    let nam;
    if (devnam === null)
        nam = fmlkind ? 'Eve' : 'Adam';
    else if (fmlkind && devnam !== 'Janet')
        nam = rn2(2) ? 'Maud' : 'Eve';
    else
        nam = devnam;
    mtmp.female = (fmlkind || nam === 'Janet') ? 1 : 0;
    /* C botl.c:330 rank_of scans roles[] for monnum == role->mnum.
     * Ranger and Rogue occur in opposite orders in mons[] and roles[]. */
    return nam + ' the ' + rank_of(ROLE_PM_MNUM.indexOf(_fl_pmidx(mtmp)),
                                  mtmp.m_lev | 0, !!mtmp.female);
}

/* C priest.c:755-767 reset_hostility() — the iter_mons callback; C keeps it in
 * priest.c, but do.c's final_level is its only caller and js/ has no body. */
function _fl_reset_hostility(roamer) {
    if (!roamer.isminion)
        return;
    const pmi = _fl_pmidx(roamer);
    if (pmi !== _FL_PM_ALIGNED_CLERIC && pmi !== 123 /* PM_ANGEL */)
        return;
    if (_fl_EMIN(roamer).min_align !== game.u.ualign.type) {
        roamer.mpeaceful = roamer.mtame = 0;
        set_malign(roamer);
    }
    newsym(roamer.mx, roamer.my);
}

/* mkMplayer's callback table (js/sp_lev.js MPLAYER_CBS is private).  mkobj is
 * async and makemon.js's special arm does not await it, so mpickobj awaits the
 * pending object. */
const _FL_MPLAYER_CBS = {
    makemon: async (mndx, x, y, flags) => await _fl_makemon(mndx, x, y, flags),
    rlocInsurance: async (x, y) => {
        const occupant = m_at(x, y);
        if (occupant)
            await rloc(occupant, RLOC_ERR | RLOC_NOMSG);
    },
    mksobj: async (otyp, init, artif) => (await _fl_mksobj(otyp, init, artif)),
    mkobj: (oclass, artif) => _fl_mkobj(oclass, artif),
    mpickobj: async (mon, obj) => (await mpickobj(mon, await obj)),
    mongets: async (mon, otyp) => (await _fl_mongets(mon, otyp, _fl_mksobj)),
    mkmonmoney: (mon, n) => _fl_mkmonmoney(mon, n),
    m_dowear: (mon, force) => _fl_m_dowear(mon, force),
    christenMonst: (mon, name) => _fl_christen_monst(mon, name),
    getMplname: _fl_get_mplname,
    setMalign: (mon) => set_malign(mon),
    weight: (obj) => weight(obj),
    /* C obj.h:233 is_spear: WEAPON_CLASS && oc_skill == P_SPEAR(17) */
    isSpear: (obj) => (obj.oclass | 0) === 2 && (MKOBJ_OC_SKILL[obj.otyp | 0] | 0) === 17,
    isArt: (obj, art) => !!(obj && (obj.oartifact | 0) === art),
    monmightthrowwep: (obj) => _fl_monmightthrowwep(obj),
    rndOffensiveItem: (mon) => _fl_rndOffensiveItem(mon),
    rndDefensiveItem: (mon) => _fl_rndDefensiveItem(mon),
    rndMiscItem: (mon) => _fl_rndMiscItem(mon),
    mkArtifact: (otmp, align, maxgift, adjspe) => mk_artifact(otmp, align, maxgift, adjspe),
};

/* C do.c:2040-2053 final_level() */
async function final_level() {
    /* reset monster hostility relative to player */
    iter_mons_real(_fl_reset_hostility);
    /* create some player-monsters */
    await _fl_create_mplayers(rn1(4, 3), true, _FL_MPLAYER_CBS);
    /* create a guardian angel next to player, if worthy */
    await _fl_gain_guardian_angel();
}

export async function goto_level(newlevel, at_stairs, falling, portal) {
    const g = game;
    const u = g.u || (g.u = {});
    const oldUz = { dnum: u.uz?.dnum | 0, dlevel: u.uz?.dlevel | 0 };
    const newdungeon = (oldUz.dnum !== (newlevel.dnum | 0));
    let leavingTutorial = false; // C do.c:1491; endgame entry bypasses tutorial exit.
    // C ref: do.c:1489 — `up = (depth(newlevel) < depth(&u.uz))`, evaluated at
    // goto_level entry while u.uz is still the level being left.
    let up = depth(newlevel) < depth(oldUz);
    /* C do.c:1497-1498 — `int dist = depth(newlevel) - depth(&u.uz);` and
     * `boolean do_fall_dmg = FALSE;`, both fixed at goto_level entry. */
    const dist = depth(newlevel) - depth(oldUz);
    let do_fall_dmg = false;
    /* C do.c:1499 — schar prev_temperature = svl.level.flags.temperature;
     * Sampled here, while g.level is still the level being left, and read back
     * by temperature_change_msg() near the end of goto_level (do.c:1935). */
    const prev_temperature = (g.level?.flags?.temperature | 0);
    const was_in_W_tower = In_W_tower_wz(u.ux, u.uy, oldUz);
    const bottom = g.dungeons[newlevel.dnum]?.num_dunlevs;
    if (newlevel.dlevel > bottom) newlevel.dlevel = bottom;
    if (newdungeon && In_endgame(newlevel)) {
        if (!u.uhave?.amulet) return;
        if (!wizard()) Object.assign(newlevel, g.earth_level);
    }
    /* gg.gbuf is global, not per-level: it keeps showing the level being left
     * until cls()/docrt() repaints (display.c:2074 clear_glyph_buffer).  This
     * port keeps the buffer in per-cell disp_* fields, so carry them across the
     * level swap below. */
    const gbufLevel = g.level;
    // C do.c:1503-1516: tutorial lifecycle precedes the quest/same-level
    // guards and departure callbacks. Keep the physical pager latch separate.
    if (newdungeon && !In_endgame(newlevel) && g.tutorial_dnum !== undefined) {
        if ((newlevel.dnum | 0) === (g.tutorial_dnum | 0)) {
            /* The --More-- for deferred_goto's "Entering the tutorial." is raised
             * after tutorial(true) has stashed the inventory but before bot()
             * reruns, so the status line still shows the old hero. */
            const paintedU = { ...u, ...copy_you(u) };
            const paintedMoves = g.moves;
            const paintedGold = money_cnt(g.invent ?? null);
            await tutorial(true);
            g._tutorialStatusOverride = { u: paintedU, moves: paintedMoves, gold: paintedGold };
        } else if (oldUz.dnum === (g.tutorial_dnum | 0)) {
            const paintedU = { ...u, ...copy_you(u) };
            const paintedMoves = g.moves;
            if (g._resultMessage && g._pending_message) {
                const result = g._resultMessage;
                const joins = _topl_joins_snapshot(result);
                g._pending_message = _topl_merge_result(result, g._pending_message, joins);
                g._resultMessage = null;
            }
            /* '$:' is whatever the last bot() painted (nhl_gamestate's restore
             * raises its --More-- before bot() reruns). */
            const paintedGold = g._botlPaintedGold ?? money_cnt(g.invent ?? null);
            g._tutorialLevSnap = null;
            /* The restore runs INSIDE tutorial(false), and nhlua.c:1737-1738
             * resets svm.moves and plines BEFORE goto_level regains control:
             * when the standing topline cannot join "Resetting time to move #N."
             * that pline itself pages it, and C's --More-- there still shows the
             * PHYSICAL status line's last paint — the tutorial hero and its
             * clock — because pline.c:273-274's flush only repaints when
             * disp.botl is flagged and nothing between the assignment and the
             * pline flags it.  Install the frozen-paint override BEFORE the
             * restore so that page reads it; a bot() inside the restore (the
             * useupall float_down flush) still clears it, exactly as C's line
             * repaints there.  done()'s forced bot() (end.c:1043-1045) is the
             * first unconditional repaint after the restore. */
            g._tutorialStatusOverride = { u: paintedU, moves: g._botlPaintedMoves ?? paintedMoves, gold: paintedGold };
            await tutorial(false);
            if (g._tutorialLevSnap && paintedU.uprops)
                paintedU.uprops = { ...paintedU.uprops, [LEVITATION]: g._tutorialLevSnap };
            g._tutorialLevSnap = null;
            up = false;
            leavingTutorial = true; // C do.c:1514: only the tutorial(FALSE) arm.
            /* C nhlua.c:1738 — the reset message's flush (or any bot() after the
             * svm.moves restore) paints the restored clock; only a bot() that
             * ran before the restore leaves the tutorial clock on the line. */
            g._tutorialStatusOverride = { u: paintedU, moves: g._botlPaintedMoves ?? paintedMoves, gold: paintedGold };
        }
    }
    // C do.c:1517-1519: escape precedes mysterious force and quest guards.
    if (ledger_no_cmd(newlevel) <= 0) {
        await done(ESCAPED);
        return;
    }
    // C do.c:1540-1574 — the Amulet's diminishing mysterious force.
    if (In_hell(u.uz) && up && u.uhave?.amulet && !newdungeon && !portal && ledger_no_cmd(newlevel) > 0
        && u.uz.dlevel < g.dungeons[u.uz.dnum].num_dunlevs - 3
        && !rn2(4 + (g.context.mysteryforce || 0))) {
        const odds = 3 + u.ualign.type;
        let diff = odds <= 1 ? 0 : rn2(odds);
        if (diff !== 0) {
            assign_rnd_level(newlevel, u.uz, diff);
            diff = newlevel.dlevel - u.uz.dlevel;
            if (was_in_W_tower && !_on_W_tower_level(newlevel))
                diff = 0;
        }
        if (diff === 0)
            Object.assign(newlevel, { dnum: u.uz.dnum, dlevel: u.uz.dlevel });
        await pline('A mysterious force momentarily surrounds you...');
        g.context.mysteryforce = (g.context.mysteryforce || 0) + rn2(diff + 2);
        if (on_level(newlevel, u.uz)) {
            await safe_teleds(0);
            await next_to_u_real();
            return;
        }
        at_stairs = g.at_ladder = false;
    }
    if (on_level(u.uz, g.qstart_level) && !newdungeon && !ok_to_quest()) {
        await pline('A mysterious force prevents you from descending.');
        return;
    }
    // C do.c:1583 — on_level(newlevel, &u.uz) → no-op (can happen).
    if (oldUz.dnum === (newlevel.dnum | 0) && oldUz.dlevel === (newlevel.dlevel | 0))
        return;
    await nh_callback_run(NHCB_LVL_LEAVE);
    // C do.c:1594-1595: recover the tether before saving the old level.
    if (u.utrap && u.utraptype === TT_BURIEDBALL)
        await buried_ball_to_punishment();
    // C ref: do.c:1814 + 1851-1855 — the descend/climb arrival message is shown by
    // more() over the LAST flush of the OLD level (old map + old Dlvl) before
    // docrt() redraws the new level.  Snapshot the OLD level's painted cells +
    // dlevel NOW, before mklev()/clear_level_structures wipes the old level; the
    // arrival more() at the tail replays this frozen frame.  DISPLAY-ONLY, RNG-free.
    const _oldPaint = level_transition_capture_old_paint();
    // leak from an earlier bones descent into a later REVISIT transition (whose
    // getlev arm opens no window and must keep the OLD Dlvl).  Set by display.js'
    // _levelgen_window_flush_note() while the mklev() latch below is open.
    g._levelgenWindowUz = null;
    // Level-existence bookkeeping (svl.level_info[ledger].flags).
    g.level_info = g.level_info || {};
    const newLedger = ledger_no_cmd(newlevel);
    const oldLedger = ledger_no_cmd(oldUz);
    const newInfo = (g.level_info[newLedger] = g.level_info[newLedger] || { flags: 0 });
    // Mark the level we're leaving as existing+visited (it has been generated).
    const oldInfo = (g.level_info[oldLedger] = g.level_info[oldLedger] || { flags: 0 });
    oldInfo.flags |= (LFILE_EXISTS | VISITED);
    // C do.c:1604-1622 — the departure bookkeeping between currentlevel_rewrite()
    // and keepdogs(), in C's order.  Every one of these is a call C makes
    // unconditionally on EVERY level change and js/ made none of them
    // a boulder sits on a pit/hole at the hero's departure square, and
    // check_special_room(TRUE) only plines when u.ushops0/u.uentered are set.
    maybe_reset_pick(null);         /* do.c:1604 */
    reset_trapset();                /* do.c:1605 */
    g.iflags = g.iflags || {};
    g.iflags.travelcc = { x: 0, y: 0 };            /* do.c:1606 */
    if (g.svc?.context?.polearm) g.svc.context.polearm.hitmon = null; /* do.c:1607 */
    // do.c:1612-1613 `if (falling) impact_drop(NULL, u.ux, u.uy, newlevel->dlevel)`
    // — objects on the hole square fall with the hero (draws + 'falls through
    // the hole' message).  Their arrival-side obj_delivery is still unwired.
    if (falling)
        await impact_drop(null, g.u.ux | 0, g.u.uy | 0, newlevel?.dlevel | 0);
    await check_special_room(true);       /* do.c:1614 */
    if (_st_Punished()) unplacebc();
    await reset_utrap(false);             /* do.c:1617 */
    await fill_pit(u.ux | 0, u.uy | 0);   /* do.c:1619 */
    set_ustuck(null);               /* do.c:1620 — clears u.ustuck and u.uswallow */
    await set_uinwater(0);                /* do.c:1621 */
    u.uundetected = 0;              /* do.c:1622 — not hidden on the new level */
    // C do.c:1623-1624 — the departing monsters are owned by mydogs.
    if (!g.iflags?.nofollowers)
        await keepdogs(false);
    // C dog.c:834 / pline.c:273-274: a stay-behind message flushes any
    // earlier followers' removal (mon.c:2721). Preserve that physical map
    // before vision_recalc(2) changes gbuf without flushing (do.c:1631).
    // The same flush's bot() (display.c:2236-2237) repaints T: too, ending a
    // run's time_botl suppression (allmain.c:262) before the arrival page.
    if (_oldPaint) {
        _oldPaint.cells = capture_flushed_cells();
        _oldPaint.moves = capture_painted_frame()?.moves ?? _oldPaint.moves;
    }
    // C do.c savelev(fd, ledger_no(&u.uz0)) — leaving the old level writes it
    // out AND frees its in-memory data (release_data mode).  save_track()
    // (track.c:88) does `if (release_data(nhfp)) initrack();`, so the hero
    // footstep ring (utrack) is CLEARED on every level departure.  Without this
    // the previous level's hero trail leaks into the new level's monster AI:
    // gettrack() (monmove.c:1904-1911, the FARAWAY block) returns a stale
    // old-level coord, redirecting a hostile monster's goal to a phantom
    // footstep and firing a different mtrack rn2(4*(cnt-j)) at monmove.c:1987
    // chased the phantom to (60,17) instead of heading at the real hero and
    // moving to (60,15) — first RNG divergence @ leaf 8845).  RNG-free.
    //
    // The write half is now real: savelev() (js/save.js) snapshots the
    // departing level's containers under its ledger so the revisit arm below
    // can hand them back instead of regenerating.  It must run BEFORE
    // initrack(), which clears g._track in place, and AFTER the keepdogs()
    // block above, which splices the accompanying pet off g.fmon exactly as
    // C's relmon() does before savelev sees the chain.  RNG-free.
    //
    // C do.c:1638-1664 discards unreachable level files after savelev's cleanup.
    // C do.c:1624 recalc_mapseen() — its ROOM pass is what has to run here, at
    // the moment the level is left, because u.urooms only ever describes the
    // level under the hero's feet; the feature pass is recomputed on demand by
    // _mapseen_feat().  Without this, a shop or temple the hero walked through
    // and then left was invisible to #overview unless something else (magic
    // mapping's room_discovered) happened to record it.
    recalc_mapseen_rooms();
    // C do.c:1631 vision_recalc(2), under C's own comment: "We no longer see
    // anything on the level.  Make sure that this follows u.uswallow set to
    // null since uswallow overrides all normal vision."  It sits exactly here,
    // after keepdogs()/recalc_mapseen() and before savelev().
    //
    // It was left unwired as a display-only no-op.  It is not: shutting vision
    // down newsym()s the cells that were visible, and a hostile on one of those
    // takes newsym's out-of-sight arm, which under Hallucination draws
    // rn2_on_display_rng(WARNCOUNT-1) per warned monster (display.c:640).
    // draws HERE, immediately before getbones' rn2(3), and this port made none
    // — so the whole DISPLAY isaac64 stream was 9 draws behind from the level
    // teleport onwards and every hallucinated glyph on the destination level
    // was wrong.  The screen half is step 195's map cells.
    vision_recalc(2);
    if (!(newdungeon && In_endgame(newlevel)) && !leavingTutorial) update_mlstmv(); // C do.c:1640-1642
    else for (let dnum = 0; dnum < g.dungeons.length; ++dnum)
        if (leavingTutorial ? dnum === g.tutorial_dnum : dnum !== g.astral_level.dnum)
            delete g._luathemes_loaded?.[dnum];
    // C do.c:1670-1673 — "record this level transition as a potential seen
    // branch unless using some non-standard means of transportation (level
    // teleport)":  if ((at_stairs || falling || portal) && dnum changes.
    // NOTE C runs this AFTER savelev/assign_level(u.uz0) but BEFORE u.uz moves,
    // so `source` is still the departing level; that is the ordering here too.
    if ((at_stairs || falling || portal)
        && (oldUz.dnum | 0) !== (newlevel.dnum | 0))
        recbranch_mapseen(oldUz, newlevel);
    // Last chance to read the OLD level's painted cells: savelev() ends in
    // clear_level_structures() (C save.c:525, the release_data arm), which
    // entry because keepdogs() has already taken the pet off the map and
    // "Get bones?" frame at step 4 shows "{@·".  DISPLAY-ONLY, RNG-free.
    const _preSavelevPaint = capture_painted_frame();
    /* wintty.c:3684-3709 docorner(): a window dismissed over the map before docrt() row_refresh()es the gbuf, which vision_recalc(2) (do.c:1631) and keepdogs() already changed. */
    if (_oldPaint && _preSavelevPaint) _oldPaint.gbufCells = _preSavelevPaint.cells;
    /* C do.c:1651-1653: cant_go_back saves FREEING — save.c:487's purge is
     * skipped, so purge_monsters survives the level change. */
    await savelev(oldLedger, !!((newdungeon && In_endgame(newlevel)) || leavingTutorial));
    // C do.c:1658-1661: retain unreachable overview records for disclosure.
    if ((newdungeon && In_endgame(newlevel)) || leavingTutorial) {
        // C files.c:719-729 delete_levelfile leaves VISITED set, but clears
        // LFILE_EXISTS. Keep #0 and, on tutorial exit, other dungeons' files.
        for (const [ledger, info] of Object.entries(g.level_info)) {
            const n = Number(ledger);
            const tut = g.dungeons[g.tutorial_dnum];
            if (n > 0 && (!leavingTutorial
                || (n > tut.ledger_start && n <= tut.ledger_start + tut.num_dunlevs))) {
                info.flags &= ~LFILE_EXISTS;
                /* C do.c:1660-1661 remdun_mapseen only marks the mapseen
                 * notreachable; its feat/bonesinfo survive the level file. */
                const snap = g.levelStore?.get(n);
                if (snap)
                    (g._mapseen_levels ||= new Map()).set(n, snap.level);
                g.levelStore?.delete(n);
            }
        }
        for (let dnum = 0; dnum < g.dungeons.length; ++dnum)
            if (!leavingTutorial || dnum === g.tutorial_dnum)
                remdun_mapseen(dnum);
        await discard_migrations();
    }
    check_gold_symbol(newlevel); /* do.c:1666-1668: destination graphics */
    initrack();
    // C do.c:1688-1690 — assign_level(&u.uz0, &u.uz); assign_level(&u.uz,
    // newlevel).  u.uz must point at the destination BEFORE mklev() so level
    // generation (and makemon depth checks) see the new dlevel.
    u.uz0 = { dnum: oldUz.dnum, dlevel: oldUz.dlevel };
    u.uz = { dnum: newlevel.dnum | 0, dlevel: newlevel.dlevel | 0 };
    u.utolev = { dnum: u.uz.dnum, dlevel: u.uz.dlevel };
    u.utotype = UTOTYPE_NONE;
    // C do.c:1675-1684: update the dungeon's reach record before mklev/getlev.
    // Upward branches retain the minimum visited dungeon-relative level.
    // A magic portal made without a destination keeps dst == (-1,-1)
    // (trap.c maketrap), so C indexes dungeons[-1]: an out-of-bounds access
    // that touches no tracked dungeon.  Skip the bookkeeping for such a dnum.
    const reachedDungeon = g.dungeons[u.uz.dnum] || { dunlev_ureached: 0, _oob: true };
    if (reachedDungeon._oob) {
        // no dungeon record to update
    } else if (!builds_up(u.uz)) {
        if (dunlev(u.uz) > reachedDungeon.dunlev_ureached)
            reachedDungeon.dunlev_ureached = dunlev(u.uz);
    } else {
        if (reachedDungeon.dunlev_ureached === 0
            || dunlev(u.uz) < reachedDungeon.dunlev_ureached)
            reachedDungeon.dunlev_ureached = dunlev(u.uz);
    }
    // C do.c:1689-1691 — "set default level change destination areas / the
    // special level code may override these":
    //     memset(&svu.updest, 0, ...); memset(&svd.dndest, 0, ...);
    // These MUST be cleared before mklev(), because mklev -> fixup_special()
    // (js/sp_lev.js) is what repopulates them from a des.teleport_region /
    // des.levregion declaration.  Without the clear, a special level's arrival
    // region leaks onto every later ordinary level the hero teleports to.
    game.updest = { lx: 0, ly: 0, hx: 0, hy: 0, nlx: 0, nly: 0, nhx: 0, nhy: 0 };
    game.dndest = { lx: 0, ly: 0, hx: 0, hy: 0, nlx: 0, nly: 0, nhx: 0, nhy: 0 };
    const isNew = !(newInfo.flags & LFILE_EXISTS);
    // C do.c:1493 `familiar = FALSE` / :1701 `familiar = bones_include_name(svp.plname)`
    // — set ONLY on the mklev arm, and read at do.c:1878 to print the
    // deja-vu line.  Was never computed here, so familiar_level_msg() never
    // ran and its rn2(4) was never drawn.
    let familiar = false;
    if (isNew) {
        // C do.c:1713 — first time on this level: build it now.  mklev() runs
        // getbones rn2(3) + makelevel (the full body) + level_finalize_topology.
        //
        // getbones() can raise wizard-mode queries ("Get bones?", "Unlink
        // bones?"), i.e. mklev() CAN emit input-boundary frames.  C's terminal
        // still holds the last flush of the level being left at that point —
        // vision_reset()/docrt() are do.c:1718 and do.c:1840, both AFTER this
        // call — so freeze the map cells on that paint for the duration.  It is
        // taken the pet off the old map and C's newsym repainted its square:
        // frame) shows "{@·".  DISPLAY-ONLY, RNG-free, and scoped to mklev().
        g._levelgenPaintFreeze = _preSavelevPaint;
        // C do.c:1693-1720 — assign_level(&u.uz, newlevel) has already run at this
        // point and flush_screen(-1) (the delay_flushing toggle) has not, so every
        // pline mklev() raises — getbones' wizard queries at bones.c:671/740 —
        // takes the pline.c:273-274 flush, whose display.c:2237 bot() repaints the
        // physical status row with the NEW u.uz.  display.js' flush entries record
        // that paint in g._levelgenWindowUz for the arrival --More-- snapshot
        // Dlvl:3 over the OLD map).  Latch opens ONLY on the mklev arm: the
        // getlev/revisit arm raises no in-window pline, and after do.c:1720 the
        // delay makes these flushes early-return.  DISPLAY-ONLY; no RNG.
        g._levelgenWindowOpen = true;
        try {
            if (newInfo.flags & VISITED) {
                await real_impossible('goto_level: returning to discarded level?');
                newInfo.flags &= ~VISITED; // C do.c:1695-1697
            }
            await mklev();
        } finally {
            g._levelgenPaintFreeze = null;
            g._levelgenWindowOpen = false;
        }
        newInfo.flags |= LFILE_EXISTS;
        newInfo.flags &= ~VISITED;
        // C do.c:1701 — mklev() may have loaded a bones file (getbones); if the
        // dead hero on it shared this hero's name, the level is "familiar".
        familiar = bones_include_name(String(g.plname ?? g.u?.plname ?? ''));
    }
    else {
        // C do.c:1715-1723 — REVISIT branch: "returning to previously visited
        // level; reload it".
        //     nhfp = open_levelfile(new_ledger, whynot);
        //     if (tricked_fileremoved(nhfp, whynot)) error(...);
        //     reseed_random(rn2);
        //     reseed_random(rn2_on_display_rng);
        //     getlev(nhfp, svh.hackpid, new_ledger);
        //     close_nhfile(nhfp);
        //     oinit();
        // reseed_random (rnd.c:289) only reseeds `if (has_strong_rngseed)`, and
        // the organiser's determinism patch takes the NETHACK_SEED path
        // specifically so has_strong_rngseed stays false
        // (nethack-c-v5/patches/001-deterministic-runtime.patch, "Leave
        // has_strong_rngseed false so reseed_random() remains a no-op").
        // Porting them as calls would reset the stream and destroy parity.
        //
        // getlev() is where the RNG is: one rnd(10) per monster left on the
        // level (restore.c:1219) plus mon_catchup_elapsed_time's conditional
        // draws.  Before this, the arm was a no-op and the hero arrived on a
        // level that was still, in every JS structure, the level she had just
        // and its first value divergence at leaf 49731 (C rnd(10)
        // @getlev(restore.c:1219) vs JS rn2(79) @place_lregion).
        await getlev(newLedger);
        // C do.c:1723 oinit() — o_init.c:322, `setgemprobs(&u.uz)`.  Level-dependent
        // gem probabilities are reassigned for the level we just reloaded.  RNG-free.
        await oinit();
    }
    // C do.c:1714 — reglyph_darkroom(): re-map remembered dark-room / corridor
    // glyphs for the NEW level under the current flags.dark_room + use_color.
    // Display-only, RNG-free.  Runs immediately after the mklev()/getlev() arm,
    // before vision_reset()/flush_screen (call-edge-lint R1 reglyph_darkroom:
    // a 89-line ported body with zero js/ call sites).
    if (gbufLevel && gbufLevel !== g.level && g.level?.at) {
        for (let y = 0; y < ROWNO; y++)
            for (let x = 1; x < COLNO; x++) {
                const o = gbufLevel.at(x, y), n = g.level.at(x, y);
                if (!o || !n) continue;
                for (const k of ['disp_ch', 'disp_color', 'disp_glyph_color', 'disp_decgfx',
                                 'disp_glyph_ch', 'disp_glyph_decgfx',
                                 'disp_attr', 'disp_cls', 'disp_cmap', 'disp_is_warning',
                                 'disp_mon_pm', 'disp_mon_kind', 'disp_mon_female',
                                 'disp_obj_corpsenm', 'disp_obj_otyp',
                                 'disp_trap_type'])
                    n[k] = o[k];
                /* The carried paint is the OLD level's: whether its S_stone
                 * stands for C's GLYPH_UNEXPLORED is the old cell's question. */
                n.disp_unmapped = o.disp_unmapped
                    ?? (!o.remembered_glyph && !(o.seenv | 0));
            }
    }
    reglyph_darkroom();
    await set_uinwater(0); // C do.c:1715
    // C do.c:1730-1734 — set_uinwater / vision_reset / flush_screen.  No RNG.
    // vision_reset() rebuilds viz_clear / left-right ptrs for the NEW level's
    // terrain from _blocks(); without it view_from raycasts against the OLD
    // level's clear-array and only marks a small band of COULD_SEE around the
    // hero — leaving a fully-lit dlvl room mostly un-could-see.  That stale
    // COULD_SEE flips couldsee()/in_masters_sight FALSE for room squares a pet
    // occupies, which corrupts dog_goal's goal (it enters the "can't see master"
    // gettrack/do_clear_area override instead of following the hero), changing
    // dog@(65,9) ims should be 1, JS had 0 → wrong goal (64,7) vs C (62,7)).
    // C sets vision_full_recalc=0 here too so vision is not re-enabled until the
    // next moveloop/domove recomputes it; our per-move vision_recalc(1) in
    // domove (cmd.js:6503) then refreshes COULD_SEE against the correct
    // viz_clear.  RNG-free.
    vision_reset();
    g.vision_full_recalc = 0;
    // C do.c:1760-1816 — at_stairs && !In_endgame && down: place the hero on the
    // new level's UPstairs (the stairway leading back up).  u_on_upstairs()
    // finds it (or falls back).  RNG-neutral on this path.
    if (portal && !In_endgame(newlevel)) {
        // C ref: do.c:1722-1745 — the FIRST arrival arm, ahead of at_stairs:
        //     if (portal && !In_endgame(&u.uz)) {
        //         struct trap *ttrap;
        //         for (ttrap = gf.ftrap; ttrap; ttrap = ttrap->ntrap)
        //             if (ttrap->ttyp == MAGIC_PORTAL) break;
        //         if (!ttrap) {
        //             if (u.uevent.qexpelled
        //                 && (Is_qstart(&u.uz0) || Is_qstart(&u.uz))) {
        //                 u_on_rndspot(0);
        //             } else {
        //                 if (!iflags.debug_fuzzer)
        //                     impossible("goto_level: no corresponding portal!");
        //                 u_on_rndspot(0);
        //             }
        //         } else {
        //             seetrap(ttrap);
        //             u_on_newpos(ttrap->tx, ttrap->ty);
        //         }
        //     }
        // This arm was a stand-in (`u_on_upstairs()`) on the premise that no
        // quest leader expels the hero on the badalign arm (quest.c:353
        // expulsion -> schedule_goto(dest, UTOTYPE_PORTAL)), and step 185 lands
        // on a freshly generated Dlvl:14.  With u_on_upstairs the hero arrived
        // on the up-staircase in the wrong room — the level generated leaf-for-
        // leaf with C (leaves 4368..7836) and then painted a different corner
        // of it.  The portal is the quest branch's own MAGIC_PORTAL, placed by
        // place_branch() during that level's mklev.
        // RNG: the found-portal arm draws nothing; the fallback's u_on_rndspot
        // does (place_lregion), exactly as C.
        let ttrap = g.ftrap;
        for (; ttrap; ttrap = ttrap.ntrap)
            if ((ttrap.ttyp | 0) === MAGIC_PORTAL)
                break;
        if (!ttrap) {
            // C do.c:1731-1741 — both sides of the !ttrap fork call
            // u_on_rndspot(0); only the impossible() differs.  The quest-side
            // arm is the "portal back doesn't exist anymore" case left by
            // expulsion(TRUE) sealing the quest off.
            if (!((u.uevent?.qexpelled | 0)
                  && (_Is_qstart(oldUz) || _Is_qstart(u.uz))) && !g.iflags?.debug_fuzzer)
                impossible('goto_level: no corresponding portal!');
            await u_on_rndspot(0);
        } else {
            seetrap(ttrap);
            await u_on_newpos(ttrap.tx, ttrap.ty);
        }
    }
    else if (at_stairs && !In_endgame(newlevel)) {
        // C ref: do.c:1746-1800.  BOTH directions first look for the stairway on
        // the NEW level that leads back to the level just left (u.uz0) — that is
        // the arrival square — and only fall back to a direction-based lookup
        // when there isn't one.  The guard is `!In_endgame`, NOT `!newdungeon`:
        // a BRANCH descent (Dungeons-of-Doom -> Gnomish Mines) is at_stairs with
        // newdungeon TRUE, and C still places the hero on the branch stairway.
        // Routing it to the else-arm's u_on_rndspot() instead drew four
        // place_lregion() (x,y) tries — 8 RNG leaves C never draws — which is
        // mcalcmove; JS was still in mklev.js's place_lregion).
        const _stway = stairway_find_from(oldUz, !!g.at_ladder);
        if (_stway) {
            // C do.c:1749-1751 / 1767-1769 — u_on_newpos + mark the arrival
            // stairway u_traversed so a branch crossing renders the YELLOW
            // S_br* glyph (known_branch_stairs).
            await u_on_newpos(_stway.sx, _stway.sy);
            _stway.u_traversed = true;
        } else if (up) {
            if (newdungeon)
                await u_on_sstairs(1);
            else
                await u_on_dnstairs();
        } else {
            if (newdungeon)
                await u_on_sstairs(0);
            else
                await u_on_upstairs();
        }
    }
    else {
        // C do.c:1817-1818 — trap door / level_tele / In_endgame branch:
        //   u_on_rndspot((up ? 1 : 0) | (was_in_W_tower ? 2 : 0))
        // C makes ONE call here regardless of newdungeon; u_on_rndspot
        // (dungeon.c:1605) is what reads svu.updest / svd.dndest and hands them
        // to place_lregion.  This used to inline `place_lregion(0,0,0,0,...)`
        // for the !newdungeon case, on the premise that "both dndest and updest
        // are zeroed in goto_level ... so lx=0 → whole level".  The zeroing is
        // real (now done above, C do.c:1689-1691) but the conclusion was only
        // true while no ported level ever set them: mklev -> fixup_special
        // REPOPULATES them from a des.teleport_region declaration, so on a level
        // that has one the region is emphatically not all-zero.  Witness: the
        // castle declares `des.teleport_region({region={01,00,10,20},
        // region_islev=1, exclude={1,1,61,15}, dir="down"})` (castle.lua:57), so
        // C's arrival draws rn2(10)/rn2(21) pairs inside that 10x21 strip while
        // the inlined form drew rn2(79)/rn2(21) across the whole map —
        // leaf 22802 of 120639.
        // (none start inside the Wizard's Tower) — omitted, matching the
        // established UNPORTED-CALLEE idiom in u_on_rndspot itself.
        {
            // C ref: do.c:1817-1825 — "trap door or level_tele or In_endgame"
            // (the actual branch a newdungeon, non-portal, non-at_stairs
            // transition like Tutorial entry takes): u_on_rndspot((up?1:0)|
            // (was_in_W_tower?2:0)).  was_in_W_tower (In_W_tower) is
            // (none start inside the Wizard's Tower) — omit, matching the
            // established UNPORTED-CALLEE idiom for u_on_rndspot's own W-
            // tower branch (port-mklev-u-on-rndspot-001).
            /* do.c:1717 flush_screen(-1) holds delay_flushing ON, so a pline from
             * u_on_rndspot's switch_terrain() (dungeon.c:1636, float_up) takes
             * no bot(): the status rows stay as the ^V overview menu's
             * dismissal left them, blank,, for the duration of u_on_rndspot. */
            const _blankHere = !!g._levtele_menu && !g._status_blanked;
            if (_blankHere) g._status_blanked = true;
            const _pend0 = g._pending_message;
            /* do.c:1720 delay_flushing also defers bot() for switch_terrain's
             * "You start flying." pline (dungeon.c:1637): the status row keeps
             * the pre-arrival conditions (no Fly) on that --More-- frame. */
            const _heldRnd = g._botlPaintHeld;
            g._botlPaintHeld = true;
            g._rndspotHeldBotl = g._pending_message ? g._lastPaintedBotl : null;
            /* do.c:1720 delay_flushing: a getpos prompt raised by rloc() of the
             * monster displaced from the arrival square (montelecontrol) flushes
             * nothing, so the terminal still holds the OLD level's last flush. */
            g._levelgenPaintFreeze = _oldPaint || _preSavelevPaint;
            if (oldUz) g._botlUzFrozen = { dnum: oldUz.dnum, dlevel: oldUz.dlevel };
            try { await u_on_rndspot((up ? 1 : 0) | (was_in_W_tower ? 2 : 0)); }
            finally { g._botlPaintHeld = _heldRnd; g._levelgenPaintFreeze = null; g._botlUzFrozen = null; }
            if (_blankHere && g._pending_message === _pend0) g._status_blanked = false;
            /* the pline's --More-- page is rendered later, still against the blank rows */
            if (_blankHere && g._status_blanked)
                g._status_blanked_by_mtc = true; /* released before docrt */
        }
        /* C do.c:1805-1810 — if (Punished && !welded(uball)) ballfall();
         * selftouch("Falling, you"); do_fall_dmg = TRUE. */
        if (falling) {
            if (_st_Punished() && !welded(g.u.uball)) {
                /* The terminal still holds the OLD level's last flush until
                 * docrt() (do.c:1840); ballfall's plines/--More-- frames
                 * must show it, not the half-arrived new level. */
                g._levelgenPaintFreeze = _oldPaint || _preSavelevPaint;
                if (oldUz) g._botlUzFrozen = { dnum: oldUz.dnum, dlevel: oldUz.dlevel };
                g._botlPaintHeld = true; /* do.c:1717 delay_flushing: bot() deferred */
                /* Held until the losedogs block below clears it: the --More--
                 * for ballfall's last pline is raised by docrt()'s cls()
                 * (do.c:1840), still before any bot() or map repaint. */
                await ballfall();
            }
            await _gl_selftouch('Falling, you');
            do_fall_dmg = true;
        }
    }
    // ══ C do.c:1766-1800 — the arrival-message + fall-down-the-stairs arm ════
    // THIS BLOCK MUST PRECEDE placebc()/losedogs()/u_collide_m() below.  In C the
    // whole `at_stairs && !In_endgame(&u.uz)` arm — including drag_down() and the
    // `losehp(Maybe_Half_Phys(rnd(3)), "tumbling down a flight of stairs")` at
    // do.c:1792 — finishes at do.c:1800, and only then does do.c:1812-1841 run
    // placebc(), obj_delivery(), losedogs() and u_collide_m().  This port had the
    // two halves the other way round, so on a Burdened descent C drew
    //     rnd(3) @goto_level(do.c:1792) , rn2(10) @mon_arrive(dog.c:475) , ...
    // and we drew the mon_arrive rn2(10) first and the losehp rnd(3) only after
    // (The docrt()/vision_recalc half of the block stays AFTER losedogs, which is
    // where C has it — do.c:1851-1855 — so the arrival frame still shows the pet.)
    // C ref: do.c:1788-1855 — the ordinary in-dungeon descend arrival: pline "You
    // %s." (descend the stairs / climb down the ladder) at do.c:1812-1814 under
    // flags.verbose, then docrt()/flush_screen(-1) (do.c:1851-1855) redraw the new
    // level — the message window is more()'d as it is cleared for the redraw, so
    // the player sees "<msg>--More--" over the OLD level's last flush (old map +
    // old Dlvl).  After the dismiss, the new (vision-masked) level + new Dlvl
    // in-dungeon downstair (at_stairs, same dnum), not falling, not flying, not
    // the pline on flags.verbose (default true in our replay).  DISPLAY-ONLY: the
    // effect on any non-descend goto_level path.
    //
    // the down arm of `at_stairs && !In_endgame(&u.uz)` (do.c:1766-1800) and is
    // blind to newdungeon, so a BRANCH descent — Dungeons of Doom -> Gnomish
    // Mines — prints "You descend the stairs." exactly like an in-branch one.
    // C shows the OLD one under `You descend the stairs.--More--`, and then ate
    // step 46's " " as a command ("Unknown command ' '.") instead of as the
    // --More-- dismiss.  `up` additionally stops an in-branch CLIMB from
    // printing the descend text — C's up arm at do.c:1756-1764 has its own
    // message, ported just below.
    //
    // C do.c:1756-1764, the UP arm's message — PORTED HERE.  (The comment that
    // used to sit four lines above claimed this pline was absent while this file
    // imported the real pline() on line 15; it was a stale-premise-lint
    // IMPORTS-REAL row, and the code, not the wording, was the defect.)
    //     great_effort = (Punished && !Levitation);
    //     if (flags.verbose || great_effort)
    //         pline("%s %s up%s the %s.",
    //               great_effort ? "With great effort, you" : "You",
    //               u_locomotion("climb"),
    //               (Flying && ga.at_ladder) ? " along" : "",
    //               ga.at_ladder ? "ladder" : "stairs");
    // Note the guard is `verbose || great_effort`, not verbose alone: a punished
    // hero is told about the effort even with !verbose.  u_locomotion("climb")
    // C's block guard is `at_stairs && !In_endgame(&u.uz)` with u.uz already the
    // arrival level — the same guard the placement block above uses.
    let _arrivalMsg = null;
    let _fellDownstairs = false;
    if (!portal && at_stairs && up && !In_endgame(newlevel)) {
        const great_effort = _st_Punished() && !_Levitation();
        if ((game.flags?.verbose !== false) || great_effort)
            _arrivalMsg = `${great_effort ? 'With great effort, you' : 'You'}`
                + ` ${u_locomotion('climb')} up`
                + `${(_Flying() && g.at_ladder) ? ' along' : ''}`
                + ` the ${g.at_ladder ? 'ladder' : 'stairs'}.`;
    } else if (!portal && at_stairs && !up && u.dz && !In_endgame(newlevel)) {
        if (_Flying()) {
            if (game.flags?.verbose !== false)
                _arrivalMsg = `You fly down ${g.at_ladder ? 'along the ladder' : 'the stairs'}.`;
        } else if (near_capacity() > 0 /* UNENCUMBERED, const.js:127 */ || _st_Punished()
                   || _uprop_active('FUMBLING')) {
            _fellDownstairs = true;
            _arrivalMsg = `You fall down the ${g.at_ladder ? 'ladder' : 'stairs'}.`;
        } else if (game.flags?.verbose !== false) {
            _arrivalMsg = `You ${g.at_ladder ? 'climb down the ladder' : 'descend the stairs'}.`;
        }
    }
    if (_arrivalMsg)
        g._prevmsg = _arrivalMsg;
    /* C ball.c:998-1001 — drag_down's first two statements run BEFORE its cls(),
     * so the rn2(3) they may draw and the "You lose your grip on the iron ball."
     * they may pline both land on THIS side of the page. */
    let _dragPre = null;
    if (_fellDownstairs && _st_Punished()) {
        _dragPre = _drag_down_pre();
        if (_dragPre.gripMsg) {
            _arrivalMsg = `${_arrivalMsg}  ${_dragPre.gripMsg}`;
            /* C ball.c:1000 — the grip message is the LAST pline before cls(),
             * so it is the one gp.prevmsg ends up holding (pline.c:282), not the
             * merged two-line page the pager shows. */
            g._prevmsg = _dragPre.gripMsg;
        }
    }
    /* C do.c:1783-1795: only drag_down() has a cls() before the fall
     * effects.  Otherwise dismount_steed/losehp run before docrt's message
     * page, with do.c:1720's delayed flushing retaining the old terminal. */
    if (_fellDownstairs && !_st_Punished()) {
        const held = g._botlPaintHeld;
        if (_oldPaint) _oldPaint.botl = g._lastPaintedBotl;
        g._levelgenPaintFreeze = _oldPaint || _preSavelevPaint;
        /* The held status row keeps its painted Dlvl too: dismount_steed's
         * encumber_msg can overflow the topline and page before docrt. */
        const _lp = g._lastPaintedBotl;
        if (_lp && _lp.dlevel != null)
            g._botlUzFrozen = { dnum: _lp.dnum | 0, dlevel: _lp.dlevel | 0 };
        g._botlPaintHeld = true;
        try {
            await pline(_arrivalMsg);
            await _fall_downstairs_effects(false);
            /* C end.c:1045-1046: selftouch can call done(), whose direct bot()
             * repaints status even while goto_level holds map flushes. */
            if (_oldPaint && g._lastPaintedBotl) {
                _oldPaint.botl = g._lastPaintedBotl;
                _oldPaint.dnum = _oldPaint.botl.dnum;
                _oldPaint.dlevel = _oldPaint.botl.dlevel;
            }
            _arrivalMsg = g._pending_message;
            g._pending_message = '';
        } finally {
            g._levelgenPaintFreeze = null;
            g._botlUzFrozen = null;
            g._botlPaintHeld = held;
        }
    }
    const _arrivalPaged = !!(_oldPaint && _arrivalMsg);
    if (_arrivalPaged) {
        /* C's WIN_MESSAGE is one buffer: a pline raised earlier in goto_level
         * (keepdogs' "The kitten is still eating.", dog.c:834) is still on the
         * topline when You("descend the stairs.") appends to it, so both ride the
         * same --More-- page (joined by the usual two spaces). */
        const _prevTopl = g._pending_message;
        const msg = _prevTopl
            ? _topl_merge_result(_prevTopl, _arrivalMsg, _topl_joins_snapshot(_prevTopl) || [])
            : _arrivalMsg;
        g._pending_message = msg;
    }
    const _pageArrival = async () => {
        if (!_arrivalPaged) return;
        const msg = g._pending_message;
        /* C's cls() inside drag_down (ball.c:1004) or docrt() (do.c:1840)
         * more()s an unacknowledged topline BEFORE clearing, which is why the
         * recorded "You fall down the stairs.--More--" frame still shows the
         * OLD level's map — exactly what _oldPaint holds. */
        await level_transition_arrival_more(msg, _oldPaint);
        g._resultMessage = null;
        g._resultMessageJoins = null;
        if (_fellDownstairs && _st_Punished()) {
            await display_cls();
            /* C display.c flush_screen(): with flush_screen(-1) having toggled
             * delay_flushing on (do.c:1720), every flush is a no-op until docrt()
             * (do.c:1841), so the terminal stays BLANK although newsym() keeps
             * writing the hero into gbuf (dropz -> newsym, the "You drop" frame). */
            g._physBlankToDocrt = true;
            g._status_blanked = true;
            await _fall_downstairs_effects(_dragPre ? _dragPre.forward : false);
            /* drag_down's pline and losehp()'s maybe_wail() are TWO messages
             * (hack.c:4288) and C's 71-column reserve splits them: 30 + 2 + 39
             * columns is exactly the width at which update_topl (topl.c:262)
             * stops joining.  flush_screen pages every boundary the reserve
             * requires; whatever is left is the page the menu window raises. */
            await flush_screen(0);
            if (g._pending_message)
                await force_more(g._pending_message);
            g._pending_message = '';
            g._status_blanked = false;
        }
    };
    /* C ball.c:1004: only drag_down() clears the old screen before
     * losedogs(). Other arrivals page in docrt() (do.c:1840), after the
     * arriving monsters and any collision have been resolved. */
    const _dragArrivalPage = _fellDownstairs && _st_Punished();
    if (_dragArrivalPage) await _pageArrival();
    // C do.c:1813-1814 `if (Punished) placebc();` — put the ball and chain back
    // down under the hero at her arrival square on the new level.  Pairs with
    // the unplacebc() above; both halves are required or the pair leaks.
    if (_st_Punished()) await placebc();
    // C do.c:1815 — obj_delivery(FALSE): objects that migrated to this level
    // (kicked / fell down a hole or trap door) arrive before the monsters do.
    /* do.c:1720 delay_flushing still holds bot(): a pline raised by
     * obj_delivery (dokick.c:439-454 "You hear something shatter!") pages
     * over the physical status row of the departed level. */
    {
        const _heldDeliv = g._botlPaintHeld;
        g._botlPaintHeld = true;
        if (oldUz) g._botlUzFrozen = { dnum: oldUz.dnum, dlevel: oldUz.dlevel };
        /* do.c:1717 flush_screen(-1): delay_flushing makes the flush_screen(1)
         * in docall (do_name.c:644, via breakobj -> potionbreathe) a no-op, so
         * the terminal still holds the OLD level's last flush. */
        g._levelgenPaintFreeze = _oldPaint || _preSavelevPaint;
        try {
            await obj_delivery(false);
        } finally {
            g._levelgenPaintFreeze = null;
            g._botlUzFrozen = null;
            g._botlPaintHeld = _heldDeliv;
        }
    }
    // C do.c:1816 — Before_you, With_you, After_you; consumes mydogs.
    // The terminal still holds the OLD level's last flush until docrt()
    // (do.c:1840), so a prompt raised from inside losedogs() -> mnexto() ->
    // control_mon_tele (the wizard 'montelecontrol' option) must show it.
    g._levelgenPaintFreeze = _oldPaint || _preSavelevPaint;
    /* do.c:1720 delay_flushing holds bot() as well: each prompt's pline flush
     * leaves the status row as the departed level last painted it. */
    const _heldLose = g._botlPaintHeld;
    g._botlPaintHeld = true;
    try {
        await losedogs();
    } finally {
        g._levelgenPaintFreeze = null;
        g._botlUzFrozen = null;
        g._botlPaintHeld = _heldLose;
    }
    /* C's save/restore creates a fresh monster struct for a level.  The JS
     * level store can retain the same monster object, including its local
     * movement history; discard that history only when an object is observed
     * on a different destination level. */
    for (let m = g.fmon; m; m = m.nmon) {
        const here = `${newlevel.dnum | 0},${newlevel.dlevel | 0}`;
        if (m._portTrackLevel !== undefined && m._portTrackLevel !== here
            && Array.isArray(m.mtrack) && m.mtrack.some(t => (t?.x | 0) || (t?.y | 0)))
            m.mtrack = [ { x: 0, y: 0 }, { x: 0, y: 0 },
                         { x: 0, y: 0 }, { x: 0, y: 0 } ];
        m._portTrackLevel = here;
    }
    // C do.c:1832 — kill_genocided_monsters(): "for those wiped out while in
    // limbo".  Walks fmon and removes any species genocided while the hero was
    // between levels.  RNG-free.  (do.c:1831 obj_delivery(FALSE) is still NOT
    // wired: this port maintains no migrating-object chain, so it would read a
    // structure that is always empty — UNPORTED-CALLEE, the idiom used elsewhere
    // in this function.)
    await kill_genocided_monsters();
    // C do.c:1823 — run_timers(): "Expire all timers that have gone off while
    // away.  Must be after migrating monsters and objects are delivered."  The
    // arriving level's timers were just put back on gt.timer_base by getlev()
    // (js/restore.js) with their ABSOLUTE timeouts, so everything that rotted
    // while the hero was elsewhere rots here, in one pass, exactly as C does.
    await run_timers();
    // C do.c:1841 — u_collide_m: if monster at hero's arrival spot, resolve collision.
    // rn2(2): 0=move hero, 1=move monster (mnexto → enexto_core → collect_coords shuffle).
    {
        const ux = (u.ux | 0), uy = (u.uy | 0);
        let collMon = m_at(ux, uy);
        if (collMon && collMon !== u.usteed) {
            /* docrt() (do.c:1840) has not run yet: a montelecontrol prompt raised
             * by mnexto() below still shows the OLD level's last flush. */
            g._levelgenPaintFreeze = _oldPaint || _preSavelevPaint;
            /* do.c:1720 delay_flushing is still on (it ends at the docrt flush,
             * do.c:1841): the prompt's pline flush must not bot() the new Dlvl. */
            const _heldColl = g._botlPaintHeld;
            g._botlPaintHeld = true;
            try {
            /* C do.c:1412-1446 u_collide_m: `!rn2(2) && enexto(&cc, ...) &&
             * next2u(cc.x, cc.y)` moves the hero; otherwise (including an
             * enexto() hit more than one square away, which still drew its
             * whole collect_coords shuffle) mnexto() runs a SECOND enexto. */
            let moved = false;
            if (!rn2(2)) {
                /* C do.c:1427 enexto(&cc, u.ux, u.uy, gy.youmonst.data): the
                 * hero's own form matters (an eel draws goodpos' rn2(13)). */
                const cc = enexto_out(ux, uy, { pmidx: u.umonnum | 0 });
                if (cc && ((cc.x - ux) ** 2 + (cc.y - uy) ** 2) <= 2) {
                    await u_on_newpos(cc.x, cc.y);
                    moved = true;
                }
            }
            if (!moved) {
                await mnexto_arrival(collMon, RLOC_NOMSG);
            }
            /* C do.c:1435-1445: still sharing the hero's square → rloc, else limbo */
            collMon = m_at(u.ux | 0, u.uy | 0);
            if (collMon) {
                if (wizard())
                    await pline('(monster in hero\'s way)');
                if (!await rloc(collMon, RLOC_NOMSG) || (collMon = m_at(u.ux | 0, u.uy | 0)))
                    await m_into_limbo(collMon);
            }
            } finally {
                g._levelgenPaintFreeze = null;
                g._botlUzFrozen = null;
                g._botlPaintHeld = _heldColl;
            }
        }
    }
    /* C do.c:1830-1834 — "initial movement of bubbles just before
     * vision_recalc", immediately after u_collide_m():
     *     if (Is_waterlevel(&u.uz) || Is_airlevel(&u.uz)) movebubbles();
     *     else if (svl.level.flags.fumaroles) fumaroles();
     * Only the fumaroles half is ported (js/mkmaze.js); movebubbles() is the
     * Planes of Water and Air and has no port yet, so those two levels keep
     * arriving with no bubble movement rather than with a wrong one.  The
     * fumaroles half is RNG-load-bearing — see its header. */
    if (Is_waterlevel(u.uz) || Is_airlevel(u.uz))
        await movebubbles();
    else if (g.level?.flags?.fumaroles) {
        g._levelgenPaintFreeze = _oldPaint || _preSavelevPaint;
        if (g._levelgenPaintFreeze && g._levelgenPaintFreeze.dlevel != null)
            g._botlUzFrozen = { dnum: g._levelgenPaintFreeze.dnum | 0,
                                dlevel: g._levelgenPaintFreeze.dlevel | 0 };
        /* do.c:1717's delay_flushing also holds bot() (display.c:2225
         * "delayed flushes leave the pending status update alone"): without
         * this the whoosh's own pline flush point runs bot() with the NEW
         * u.uz, which both paints "Fire" and consumes _botlUzFrozen before
         * the page renders.  Same latch the ballfall arm uses above. */
        const _heldBotl0 = g._botlPaintHeld;
        g._botlPaintHeld = true;
        try {
            await fumaroles();
        } finally {
            g._levelgenPaintFreeze = null;
            g._botlUzFrozen = null;
            g._botlPaintHeld = _heldBotl0;
        }
    }
    g.context = g.context || {};
    reset_glyphmap(2); // C do.c:1838 gm_levelchange
    /* C do.c:1839 notice_mon_off(): docrt's temporary loss of vision must
     * not reset mspotted for monsters accompanying the hero. */
    g.a11y ??= {};
    g.a11y.mon_notices_blocked = (g.a11y.mon_notices_blocked || 0) + 1;
    if (!_dragArrivalPage) await _pageArrival();
    if (_arrivalPaged) {
        // C ref: do.c:1854-1855 — after the arrival more() releases, docrt() does a
        // full vision recalc + redraw of the NEW level, then flush_screen(-1)
        // paints it.  C clears vision_full_recalc again afterward (the per-move
        // domove vision_recalc(1) re-enables it next turn).
        // C do.c:1859-1860 — the pair is `vision_reset(); docrt();`, NOT a
        // vision_recalc(1) before the redraw.  This ran vision_recalc(1) here,
        // to "light the arrival room and newsym its could-see cells" so the
        // arrival frame did not have to wait for the first post-arrival move.
        // That gets the same SCREEN by painting the arrival TWICE: once from
        // the vision_recalc(1), then again from docrt's own vision_recalc(0).
        // vision_reset() is what makes C's single pass enough — it zeroes the
        // blockage/vision arrays, so docrt's opening vision_recalc(2) finds
        // nothing previously-visible to unpaint and its vision_recalc(0) sees
        // the whole arrival room as NEWLY visible.
        //
        // The duplicate was invisible while a redraw consumed no RNG.  Under
        // arrival (rn2(383), rn2(463), rn2(463) from docrt's vision_recalc(0),
        // then rn2(383) from its see_monsters) and this port made EIGHT — the
        // three from the extra vision_recalc(1), a spurious rn2(5) warning from
        // docrt's vision_recalc(2) shutting down the vision that recalc had just
        // turned on, then the four real ones.
        vision_reset();
        if (g._status_blanked_by_mtc) {   // status rows stay blank until docrt (do.c:1840)
            g._status_blanked_by_mtc = false;
            g._levtele_menu = false;
            g._status_blanked = false;
        }
        g._physBlankToDocrt = false;
        await docrt();
        g.vision_full_recalc = 0;
    } else {
        // C do.c:1851-1854 — C calls vision_reset() then docrt() UNCONDITIONALLY for
        // ALL goto_level paths, not just at_stairs; that rebuilds COULD_SEE for the
        // hero's line-of-sight on the new level.  Without it, COULD_SEE stays all-0
        // from vision_reset() above on the level_tele / trap-door / falling path
        // (at_stairs=false): a pet's dog_goal() then sees in_masters_sight=0 at the
        // first post-transition movemon, takes the FARAWAY branch, skips the dog_move
        // candidate-pick rn2(1) (dogmove.c:1308), and shifts the mcalcmove RNG stream
        // C's own rebuild is vision_reset() + docrt()'s vision_recalc(0); this
        // used to substitute a bare vision_recalc(1), which rebuilt COULD_SEE
        // and then made docrt repaint everything a second time.
        // RNG-free.  (Isolated from worktree 232fa261 to avoid a stale-base contamination.)
        //  arrival regenerated its level; it is no longer true — see below.]
        // C ref: the same tty rule the at_stairs branch above relies on — an
        // unacknowledged topline is PAGED when the message window is cleared for
        // the arrival redraw, freezing the physical terminal on the OLD level's
        // last flush (old map + old Dlvl).  On the at_stairs path the pending
        // message IS the arrival line ("You descend the stairs."); on this path
        // it is whatever the command that scheduled the goto left behind, and
        // the arrival line is plined AFTER the redraw by
        // "Oops...--More--" over the Dlvl 2 map, and only step 165 shows "You
        // materialize on a different level!" over the Dlvl 3 map.  Without this
        // the two joined onto one topline and both frames were lost.
        {
            /* The unacknowledged topline at this moment is whichever of the two
             * holds it: _pending_message while the scheduling command is still
             * running, or _resultMessage once rhack has committed the command's
             * result line (which is where level_tele's "Oops..." lands, since
             * deferred_goto runs after rhack returns). */
            const _toplPending = g._pending_message || g._resultMessage;
            if (_oldPaint && _toplPending) {
                await level_transition_arrival_more(_toplPending, _oldPaint);
                g._resultMessage = null;
            }
        }
        // C do.c:1859-1860 — the pair is `vision_reset(); docrt();`, NOT a
        // vision_recalc(1) before the redraw.  This ran vision_recalc(1) here,
        // to "light the arrival room and newsym its could-see cells" so the
        // arrival frame did not have to wait for the first post-arrival move.
        // That gets the same SCREEN by painting the arrival TWICE: once from
        // the vision_recalc(1), then again from docrt's own vision_recalc(0).
        // vision_reset() is what makes C's single pass enough — it zeroes the
        // blockage/vision arrays, so docrt's opening vision_recalc(2) finds
        // nothing previously-visible to unpaint and its vision_recalc(0) sees
        // the whole arrival room as NEWLY visible.
        //
        // The duplicate was invisible while a redraw consumed no RNG.  Under
        // arrival (rn2(383), rn2(463), rn2(463) from docrt's vision_recalc(0),
        // then rn2(383) from its see_monsters) and this port made EIGHT — the
        // three from the extra vision_recalc(1), a spurious rn2(5) warning from
        // docrt's vision_recalc(2) shutting down the vision that recalc had just
        // turned on, then the four real ones.
        vision_reset();
        // C do.c:1840 docrt() — "does a full vision recalc".  docrt() cls()es and
        // repaints the whole map FROM MEMORY, which is what erases the previous
        // level's paint.  Omitting it was harmless while nothing could ever bring
        // an old level's screen state back; the moment a revisit restores that
        // level, whatever the display buffer still holds from the LAST time the
        // hero stood there survives into the arrival frame.  Concretely: the
        // hero's '@' is painted into the display buffer (display.c:1044-1048 —
        // C's out-of-sight newsym arm ALSO runs display_self() when
        // canspotself(), so leaving a level does NOT unpaint her square), and
        // at (x 55, y 5) on a correctly restored Dlvl 1 where C shows the room
        // Display-only, RNG-free.
        if (g._status_blanked_by_mtc) {   // status rows stay blank until docrt (do.c:1840)
            g._status_blanked_by_mtc = false;
            g._levtele_menu = false;
            g._status_blanked = false;
        }
        g._physBlankToDocrt = false;
        await docrt();
        g.vision_full_recalc = 0;
    }
    g._botlPaintHeld = false; /* docrt's more() above was the last frozen frame */
    g._rndspotHeldBotl = null;
    g._paintedSnapshot = null;
    /* flush_screen(-1)'s bot() runs BEFORE the gnew loop (display.c:2236-2250),
     * which reprints docrt's whole map, y=20 included, over the BL_RESET row. */
    g._docrtMapAfterBot = true;
    try { tty_repaint(-1); } finally { g._docrtMapAfterBot = false; }
    // C ref: do.c:1867-1869 — the deferred level-teleport arrival message is
    // delivered HERE, inside goto_level, before the arrival events below (C's
    // comment: "give it before them" because it looks odd afterwards).  Our
    // schedule_goto() stores it in g._dfr_post_msg; deferred_goto() still
    // plines whatever survives (do.c:2115), so a level_tele arrival is
    // unchanged for every non-quest destination — but on a quest arrival the
    // message must precede onquest()'s window so C's page-ack ordering holds.
    if (g._dfr_post_msg)
        await maybe_lvltport_feedback();
    // C ref: do.c:1871-1872 — "special levels can have a custom arrival
    // message"; deliver_splev_message() drains gl.lev_message (appended by
    // des.message() during the level's Lua load) as one pline per line.  It sits
    // between maybe_lvltport_feedback() and the In_hell / In_endgame / In_quest
    // arrival chain, so its plines join the SAME topline as the level-teleport
    // the four endgame planes (dat/{air,astral,earth,water}.lua are the only
    // des.message() users in dat/); on every other level gl.lev_message is NULL
    // and this is a no-op.
    await deliver_splev_message();
    // C ref: do.c:1874-1886 — "Check whether we just entered Gehennom."
    //     if (!In_hell(&u.uz0) && Inhell) {
    //         if (Is_valley(&u.uz)) {
    //             You("arrive at the Valley of the Dead...");
    //             pline_The("odor of burnt flesh and decay pervades the air.");
    //             Soundeffect(se_groans_and_moans, 25);
    //             You_hear("groans and moans everywhere.");
    //         }
    //         record_achievement(ACH_HELL); /* reached Gehennom */
    //     }
    //     /* in case we've managed to bypass the Valley's stairway down */
    //     if (Inhell && !Is_valley(&u.uz))
    //         u.uevent.gehennom_entered = 1;
    //
    // from Dlvl 25, which find_hell() (already wired above at the destination
    // cascade) resolves to Gehennom dlevel 1 — the Valley of the Dead — so C
    // prints three plines that page across steps 316/317/318, and we printed
    // nothing and then ran both recorded --More-- dismiss spaces as top-level
    // commands ("Unknown command ' '.").  That is the head of a 1,269-step
    // contiguous miss run.
    //
    // Is_valley(x) is dungeon.h:120 Lcheck(x, &valley_level) =
    // Lassigned(&valley_level) && on_level(x, &valley_level); valley_level is
    // filled in by the dungeon builder (js/dungeon_rng.js:586), and Lassigned
    // is `dlevel != 0`.  RNG-free throughout: Soundeffect is a no-op in this
    // build and record_achievement has no body yet, both mirrored below.
    {
        const _vl = g.valley_level;
        const _on_level = (a, b) => !!a && !!b
            && (a.dnum | 0) === (b.dnum | 0) && (a.dlevel | 0) === (b.dlevel | 0);
        const _Is_valley = (lev) => !!_vl && (_vl.dlevel | 0) !== 0
            && _on_level(lev, _vl);
        if (!In_hell(u.uz0) && Inhell()) {
            if (_Is_valley(u.uz)) {
                await _goto_level_You('arrive at the Valley of the Dead...');
                await pline_The('odor of burnt flesh and decay pervades the air.');
                /* Soundeffect(se_groans_and_moans, 25) — no-op in this build. */
                await _goto_level_You_hear('groans and moans everywhere.');
            }
            record_achievement(ACH_HELL); /* reached Gehennom */
        }
        /* in case we've managed to bypass the Valley's stairway down */
        if (Inhell() && !_Is_valley(u.uz)) {
            u.uevent = u.uevent || {};
            u.uevent.gehennom_entered = 1;
        }
    }
    // C do.c:1878-1879 — `if (familiar) familiar_level_msg();`  Sits between the
    // Gehennom block and the special-location ladder, and its rn2(4) is part of
    // rn2(4)=1 @ familiar_level_msg(do.c:1462).
    if (familiar)
        await familiar_level_msg();
    // C ref: do.c:1888-1932 — "special location arrival messages/events".  This
    // is ONE if/else-if ladder, and only its In_quest arm was wired:
    //     if (In_endgame(&u.uz))        { ... final_level / resurrect ... }
    //     else if (In_quest(&u.uz))     onquest();
    //     else if (Is_knox(&u.uz))      { "You have penetrated ..."; alarm; }
    //     else if (In_mines(&u.uz))     { record_achievement(ACH_MINE); }
    //     else if (In_sokoban(&u.uz))   { record_achievement(ACH_SOKO); }
    //     else {
    //         if (new && Is_rogue_level(&u.uz))
    //             You("enter what seems to be an older, more primitive world.");
    //         else if (new && Is_bigroom(&u.uz)) record_achievement(ACH_BGRM);
    //         /* main dungeon message from your quest leader */ ...
    //     }
    // The final else's ROGUE-LEVEL line was missing, and it is load-bearing for
    // the topline, not just for flavour: it follows maybe_lvltport_feedback's
    // "You materialize on a different level!" (36 cols) and at 57 cols the pair
    // overflows the 71-col reserve, so C pages — "You materialize on a different
    // level!--More--" — and the recorded SPACE dismisses that page.  With the
    // second message absent this port showed no --More--, so the SPACE leaked to
    // rhack as a command ("Unknown command ' '.") and every later keystroke in
    // the Rogue level (menu entry "g -   rogue: 18") and is the witness; the
    // input-pointer offset it opens is -41 keystrokes by the end of the run.
    //
    // Written as C's ladder so the arms stay in C's order and a later port of
    // knox/mines/sokoban drops into place.  The arms with no ported body are
    // left empty rather than omitted, for the same reason.  RNG-free.
    if (In_endgame(u.uz)) {
        /* C do.c:1883-1884 */
        if (newdungeon)
            record_achievement(ACH_ENDG); /* reached endgame */
        if (isNew && on_level(u.uz, g.astral_level)) {
            await final_level();
            record_achievement(8 /* you.h ACH_ASTR */);
        } else if (newdungeon && (u.uhave && u.uhave.amulet)) {
            await resurrect();
        }
    } else if (In_quest(u.uz)) {
        await onquest();
    } else if (Is_knox_level(u.uz)) {
        /* C do.c:1893-1904 — alarm stops working once Croesus has died. */
        if (isNew || !((g.mvitals?.[286 /* PM_CROESUS */]?.died) | 0)) {
            await _goto_level_You('have penetrated a high security area!');
            await pline('An alarm sounds!');
            for (let mtmp = g.fmon; mtmp; mtmp = mtmp.nmon) {
                if (DEADMONSTER(mtmp))
                    continue;
                mtmp.msleeping = 0;
            }
        }
    } else if (In_mines(u.uz)) {
        if (newdungeon)
            record_achievement(ACH_MINE);
    } else if (In_sokoban(u.uz)) {
        /* C do.c:1908-1910 — `if (newdungeon) record_achievement(ACH_SOKO);` */
        if (newdungeon)
            record_achievement(ACH_SOKO);
    } else {
        if (isNew && Is_rogue_level(u.uz)) {
            await _goto_level_You(
                'enter what seems to be an older, more primitive world.');
        }
        else if (isNew && sp_levchn_lookup(u.uz)?.proto === 'bigrm') {
            record_achievement(ACH_BGRM);
        }
        if (!In_quest(u.uz0) && at_dgn_entrance('The Quest')
            && !((u.uevent && (u.uevent.qcompleted || u.uevent.qexpelled))
                 || (g.svq && g.svq.quest_status && g.svq.quest_status.leader_is_dead))) {
            if (!(u.uevent && u.uevent.qcalled)) {
                u.uevent = u.uevent || {};
                u.uevent.qcalled = 1;
                await com_pager('quest_portal');
            } else {
                /* C do.c:1929: role_init stores the role's mons[] index. */
                await com_pager(Role_if(PM_ROGUE)
                    ? 'quest_portal_demand' : 'quest_portal_again');
            }
        }
    }
    // C ref: do.c:1935 — temperature_change_msg(prev_temperature).  Sits
    // between the quest_portal block above and the `if (new)` Tourist block
    // below; RNG-free, message only.
    await temperature_change_msg(prev_temperature);
    // C do.c:1943-1962: quest and non-Astral endgame entries are major events.
    if (isNew) {
        const major = (In_endgame(u.uz) && !on_level(u.uz, g.astral_level)) || In_quest(u.uz);
        livelog_printf(major ? LL_ACHIEVE : LL_DEBUG, 'entered %s', describe_level_buf(2, u.uz));
    }
    // C ref: do.c:1952-1965 — `if (new) { ... if (Role_if(PM_TOURIST)) {
    // more_experienced(level_difficulty(), 0); newexplevel(); } }`.  A Tourist
    // earns experience for every level reached for the FIRST time; newexplevel()
    // can then draw RNG via pluslvl().  `new` is C's "mklev() built it", i.e.
    // this port's isNew.  (livelog_printf/describe_level are logging only.)
    if (isNew && Role_if(PM_TOURIST)) {
        more_experienced(level_difficulty(), 0);
        await newexplevel();
    }
    // C ref: do.c:1967 — assign_level(&u.uz0, &u.uz); /* reset u.uz0 */.  After
    // a level change u.uz0 must point at the NEW level (it was set to the old
    // level at do.c:1688 above, so stairway_find_from could find the stair back
    // to it); this reset is what makes on_level(&u.uz, &u.uz0) true immediately
    // after the change, C's own post-transition convention.
    u.uz0 = { dnum: u.uz.dnum, dlevel: u.uz.dlevel };
    // C ref: do.c:1971 — notice_mon_on(), paired with notice_mon_off above.
    g.a11y.mon_notices_blocked--;
    // C ref: do.c:1972-1979 — the arrival announcement cluster.
    // print_level_annotation() (dungeon.c:2489) used to be listed here as
    // unported too, and it is the reader query_annotation's stored string never
    // teleports back to it at step 1061, where C prints "You remember this
    // level as starting level." and pages it.  obj_delivery(TRUE) is left
    // unwired for the same reason as its do.c:1831 sibling above.
    engr_reset_text_pointers();     /* do.c:1968 save_currentstate() -> savelev -> save_engravings */
    if ((g.iflags.purge_monsters | 0))
        await dmonsfree();
    notice_all_mons(true);          /* do.c:1973 */
    await print_level_annotation(); /* do.c:1974 */
    await check_special_room(false);      /* do.c:1977 — room entrance message */
    await obj_delivery(true);             /* do.c:1978 — objects traveling with the hero */
    in_out_region(u.ux | 0, u.uy | 0); /* do.c:1981 */
    // C do.c:1982-1986: catch up shop repairs when revisiting a level.
    if (!isNew)
        await fix_shop_damage();
    /* C do.c:1989-1993 — fall damage after a trap door / hole descent:
     *     int dmg = d(max(dist, 1), 6);
     *     dmg = Maybe_Half_Phys(dmg);
     *     losehp(dmg, "falling down a mine shaft", KILLED_BY); */
    if (do_fall_dmg) {
        const dmg = flooreffects_Maybe_Half_Phys(d(Math.max(dist, 1), 6));
        await losehp(dmg, 'falling down a mine shaft', KILLED_BY);
    }
    // C ref: do.c:2015 (void) pickup(1); — unconditional arrival autopickup
    // check_here(FALSE)'s ct==0 branch (read_engr_at) for the common case of
    // an empty arrival square.  Same function as the per-move call above.
    // redrawPending=true: the arrival occurrence's text-reveal pline pages
    // paging-fix.md) — a redraw is still pending here (unlike the per-move
    // call below, where it never is).
    //
    // ORDER: pickup(1) is the LAST statement of goto_level, so its check_here /
    // look_here line ("You see here 8 runed arrows.") joins the topline AFTER
    // every arrival pline emitted above it — maybe_lvltport_feedback's "You
    // materialize on a different level!", deliver_splev_message, the Gehennom
    // block, temperature_change_msg's "It is hot here."  In C that ordering is
    // free: there is ONE topline and pline() appends in emission order.
    //
    // This port carries the two on SEPARATE channels and renders them as
    // `_resultMessage + "  " + _pending_message` (display.js _topl_merge_result
    // / run_page_frame_tick).  The arrival plines land in _pending_message while
    // _spoteffects_pickup publishes into _resultMessage via _result_append_join
    // — so the look_here line was rendered FIRST and every arrival pline was
    //   "You see here 8 runed arrows.  You materialize on a different level!--More--"
    // where C reads
    //   "You materialize on a different level!  It is hot here.--More--"
    // and the displaced "It is hot here." spilled onto the following frame.
    //
    // Move the arrival plines into the command-result channel BEFORE the pickup
    // call so _result_append_join appends after them (the _topl_merge_result
    // idiom used by the trap tail in _domove_spot_tail: the join offsets are
    // rebased so the merged line still pages at genuine message boundaries).
    // If pickup(1) then stays silent — the overwhelming majority of arrivals,
    // restore the channels byte-for-byte, so only the arrive-onto-a-pile case
    // changes.  DISPLAY-ONLY: no RNG, message-buffer bookkeeping alone.
    const _arrivalPending = g._pending_message;
    let _arrivalUndo = null;
    if (_arrivalPending) {
        _arrivalUndo = {
            resultMessage: g._resultMessage,
            resultMessageJoins: g._resultMessageJoins,
            toplJoins: g._topl_joins,
            toplJoinsSrc: g._topl_joins_src,
        };
        const _prevRes = g._resultMessage;
        if (_prevRes) {
            const _aHint = (g._resultMessageJoins
                && g._resultMessageJoins.src === _prevRes)
                ? g._resultMessageJoins.joins.slice()
                : _topl_joins_snapshot(_prevRes);
            g._resultMessage = _topl_merge_result(_prevRes, _arrivalPending, _aHint);
        } else {
            g._resultMessage = _arrivalPending;
        }
        g._resultMessageJoins = {
            src: g._resultMessage,
            joins: (_topl_joins_snapshot(g._resultMessage) || []).slice(),
        };
        g._pending_message = '';
        _arrivalUndo.merged = g._resultMessage;
    }
    // C allmain.c:578-582: only the startup tutorial entry has a docrt() still
    // pending after the goto (iflags.nofollowers is set across exactly that window);
    // a later in-tutorial level change docrt()s at do.c:1840, before pickup(1).
    await _spoteffects_pickup(!!_arrivalPending || (!!In_tutorial(u.uz) && !!g.iflags?.nofollowers));
    if (_arrivalUndo && g._resultMessage === _arrivalUndo.merged
        && !g._pending_message) {
        /* pickup(1) published nothing — put both channels back exactly as the
         * arrival plines left them, so every silent arrival is unchanged. */
        g._resultMessage = _arrivalUndo.resultMessage;
        g._resultMessageJoins = _arrivalUndo.resultMessageJoins;
        g._topl_joins = _arrivalUndo.toplJoins;
        g._topl_joins_src = _arrivalUndo.toplJoinsSrc;
        g._pending_message = _arrivalPending;
    }
}

/* give a message when entering a Gehennom level other than the Valley;
   also given if restoring a game in that situation
   C ref: do.c:1999-2011 hellish_smoke_mesg(). */
export async function hellish_smoke_mesg() {
    const g = game;
    const temperature = (g.level?.flags?.temperature | 0);

    if (temperature)
        await pline(_plineVFmt('It is %s here.',
                               [temperature > 0 ? 'hot' : 'cold']));

    if (In_hell(g.u?.uz) && temperature > 0)
        await _goto_level_You('%s smoke...',
                              olfaction(g.youmonst && g.youmonst.data)
                                  ? 'smell' : 'sense');
}

/* give a message when the level temperature is different from previous
   C ref: do.c:2013-2027 temperature_change_msg(schar prev_temperature). */
async function temperature_change_msg(prev_temperature) {
    const g = game;
    const u = g.u || {};
    const temperature = (g.level?.flags?.temperature | 0);

    if (prev_temperature !== temperature) {
        if (temperature)
            await hellish_smoke_mesg();
        else if (prev_temperature > 0)
            await pline_The('heat %s gone.',
                            In_hell(u.uz0) ? 'and smoke are' : 'is');
        else if (prev_temperature < 0)
            await _goto_level_You('are out of the cold.');
    }
}

// C ref: dungeon.c:1497 next_level(at_stairs) — compute the destination level
// and call goto_level.  For an in-dungeon downstair (at_stairs && stway) the
// destination is stway->tolev; otherwise (trap door / hole) it's dlevel+1.
async function next_level(at_stairs) {
    const g = game;
    const u = g.u || {};
    const stway = stairway_at(u.ux, u.uy);
    if (at_stairs && stway) {
        stway.u_traversed = true;
        const newlevel = { dnum: stway.tolev.dnum | 0, dlevel: stway.tolev.dlevel | 0 };
        await goto_level(newlevel, at_stairs, false, false);
    }
    else {
        const newlevel = { dnum: u.uz?.dnum | 0, dlevel: (u.uz?.dlevel | 0) + 1 };
        await goto_level(newlevel, at_stairs, !at_stairs, false);
    }
}

// C ref: dungeon.c:1518 prev_level(at_stairs) — the mirror of next_level for an
// UPWARD transition.  Was `function prev_level(at_ladder) { }` — an EMPTY body
// in this file's "stubs for unported helpers used by doup" block — so doup()
// walked the whole C ladder (u_rooted, climb_pit, stairway_at, stucksteed,
// near_capacity, the no-return prompt, next_to_u) and then, at the one call
// that does the work, did nothing at all: the hero pressed '<' on an up-staircase
// and stayed exactly where she was, on the same level, with no message.
// "You climb up the stairs."
async function prev_level(at_stairs) {
    const g = game;
    const u = g.u || {};
    const stway = stairway_at(u.ux, u.uy);
    if (at_stairs && stway)
        stway.u_traversed = true;
    if (at_stairs && stway && (stway.tolev.dnum | 0) !== (u.uz?.dnum | 0)) {
        /* C:1524-1531 — taking an up dungeon branch.  KMH: upwards branches are
           okay if not level 1; just make sure it doesn't go above depth 1. */
        if (!(u.uz?.dnum | 0) && (u.uz?.dlevel | 0) === 1 && !u.uhave?.amulet) {
            /* C:1528 done(ESCAPED) — leaving the dungeon.  done() performs
               the end-game disclosure and score transition; it does not
               return on a real escape. */
            await done(ESCAPED);
        } else {
            const newlevel = { dnum: stway.tolev.dnum | 0, dlevel: stway.tolev.dlevel | 0 };
            await goto_level(newlevel, at_stairs, false, false);
        }
    } else {
        /* C:1536-1539 — going up a stairs or rising through the ceiling. */
        const newlevel = { dnum: u.uz?.dnum | 0, dlevel: (u.uz?.dlevel | 0) - 1 };
        await goto_level(newlevel, at_stairs, false, false);
    }
}

const UTOTYPE_ATSTAIRS = 0x01;

const UTOTYPE_FALLING  = 0x02;

const UTOTYPE_DEFERRED = 0x20;

export function schedule_goto(tolev, utotype_flags, pre_msg, post_msg) {
    const g = game;
    const u = g.u || (g.u = {});
    // C do.c:2082 — u.utotype = utotype_flags | UTOTYPE_DEFERRED
    u.utotype = (utotype_flags | UTOTYPE_DEFERRED);
    // C do.c:2084 — assign_level(&u.utolev, tolev)
    u.utolev = { dnum: tolev.dnum | 0, dlevel: tolev.dlevel | 0 };
    // C do.c:2086-2089 — store optional pre/post messages
    if (pre_msg != null)
        g._dfr_pre_msg = pre_msg;
    if (post_msg != null)
        g._dfr_post_msg = post_msg;
}

// C ref: do.c:2075 deferred_goto() — execute a scheduled level change.
// Called from allmain after rhack() when u.utotype is set.
// Mirrors do.c:2075-2104 exactly: if not already on utolev, call goto_level,
// then (if post_msg) pline it if we actually moved, then clear u.utotype.
// Exported so allmain.js can call it in the faithful moveloop_core.
export async function deferred_goto() {
    const g = game;
    const u = g.u || (g.u = {});
    // C do.c:2077 — if (!on_level(&u.uz, &u.utolev))
    const dest = u.utolev;
    const uz = u.uz;
    if (dest && uz && (uz.dnum !== dest.dnum || uz.dlevel !== dest.dlevel)) {
        const typmask = u.utotype | 0; // save it; goto_level zeroes u.utotype via assign
        const oldlev = { dnum: uz.dnum, dlevel: uz.dlevel };
        // C do.c:2083-2084 — pline dfr_pre_msg if present
        if (g._dfr_pre_msg) {
            await pline(g._dfr_pre_msg);
            g._dfr_pre_msg = null;
        }
        // C do.c:2085-2087 — goto_level(dest, at_stairs, falling, portal)
        await goto_level(
            { dnum: dest.dnum, dlevel: dest.dlevel },
            !!(typmask & UTOTYPE_ATSTAIRS),
            !!(typmask & UTOTYPE_FALLING),
            !!(typmask & UTOTYPE_PORTAL)
        );
        // C do.c:2088 — if (typmask & UTOTYPE_RMPORTAL) remove portal
        if (typmask & UTOTYPE_RMPORTAL) {
            const t = t_at(u.ux, u.uy);

            if (t) {
                deltrap(t);
                newsym(u.ux, u.uy);
            }
        }
        // C do.c:2096 — if (dfr_post_msg && !on_level(uz, oldlev)) pline it
        if (g._dfr_post_msg) {
            const newuz = g.u?.uz;
            if (!newuz || newuz.dnum !== oldlev.dnum || newuz.dlevel !== oldlev.dlevel) {
                await pline(g._dfr_post_msg);
            }
            g._dfr_post_msg = null;
        }
    }
    // C do.c:2099 — u.utotype = UTOTYPE_NONE
    u.utotype = UTOTYPE_NONE;
    // Clear any leftover messages
    if (g._dfr_pre_msg)  { g._dfr_pre_msg  = null; }
    if (g._dfr_post_msg) { g._dfr_post_msg = null; }
}

// C hack.h:1310 TOOKPLUNGE — "used '>' to enter pit below you"; dodown's own
// dotrap() call flag (js/trap.js carries the same literal locally as
// _TOOKPLUNGE_T, unexported).
const _DODOWN_TOOKPLUNGE = 0x10;

// C ref: do.c:1131 dodown() — the '>' command.  Ported scope: the ordinary
// in-dungeon descend on a downstaircase, PLUS a seen, fallable trap door/hole
// underfoot (do.c:1219-1291) — falling through descends via the trap's own
// destination (or a plain next_level if none was assigned yet), exactly as
// C's tail does.  Not ported: levitation float-down,
// "can't go down here" / no-op behaviour rather than mis-firing, as before.
export async function dodown() {
    const g = game;
    const u = g.u || {};
    // C do.c:1136 — first statement: set_move_cmd(DIR_DOWN, 0) sets
    // u.dx=0, u.dy=0, u.dz=zdir[DIR_DOWN]=1 (C enum has DIR_DOWN=8).
    // JS's frozen const.js swaps the enum (DIR_UP=8, DIR_DOWN=9), so
    // zdir[DIR_DOWN]=-1 here; force the C-correct dz=1, exactly as doup
    // forces dz=-1 for the mirror-image DIR_UP discrepancy.
    set_move_cmd(DIR_DOWN, 0);
    u.dz = 1;
    // C do.c:1138-1143 — u_rooted() and stucksteed(TRUE), the same two
    // leading guards doup() carries.
    if (u_rooted())
        return (g.context.move = 1, ECMD_TIME);
    if (stucksteed(true)) {
        g.context.move = 0; // ECMD_OK
        return ECMD_OK;
    }
    let stairs_down = false, ladder_down = false;
    const stway = stairway_at(u.ux, u.uy);
    // C do.c:1147 — stairway_at && !stway->up → a downstair/ladder here.
    if (stway && !stway.up) {
        stairs_down = !stway.isladder;
        ladder_down = !stairs_down;
    }
    // C do.c:1153-1202 — "Levitation might be blocked, but player can still
    // use '>' to turn off controlled levitation".
    const _hlev = _hprop(LEVITATION), _elev = _eprop(LEVITATION);
    if (_hlev || _elev) {
        if ((_hlev & I_SPECIAL) || (_elev & W_ARTI_FW)) {
            // C do.c:1158-1169 — end controlled levitation: age every
            // levitation-conferring artifact (artifact_has_invprop).
            if (_elev & W_ARTI_FW) {
                for (let obj = g.invent; obj; obj = obj.nobj) {
                    if (obj.oartifact
                        && arti_inv_prop(obj.oartifact) === LEVITATION) {
                        if ((obj.age | 0) < (g.moves | 0))
                            obj.age = g.moves;
                        obj.age += rnz(100);
                    }
                }
            }
            if (await float_down(I_SPECIAL | TIMEOUT, W_ARTI_FW)) {
                g.context.move = 1;
                return ECMD_TIME; // came down, so moved
            } else if (!_hprop(LEVITATION) && !_eprop(LEVITATION)) {
                await Your('latent levitation ceases.');
                g.context.move = 1;
                return ECMD_TIME; // did something, effectively moved
            }
        }
        const p = u.uprops?.[LEVITATION];
        if ((p?.blocked | 0)) {
            ; // BLevitation: weren't actually floating after all
        } else if (_Blind_cmd()) {
            // C do.c:1181-1190 reads levl[].glyph (hero memory), which
            // display_self() can cover with the hero's displayed glyph.
            const remembered = g.level.at(u.ux, u.uy).remembered_glyph;
            const sym = remembered?.cls === GLYPHCLS_CMAP ? remembered.cmap : -1;
            if (stairs_down)
                stairs_down = (sym === S_dnstair);
            else if (ladder_down)
                ladder_down = (sym === S_dnladder);
        }
        if (Is_airlevel(u.uz))
            await You(`are floating in the ${surface(u.ux, u.uy)}.`);
        else if (Is_waterlevel(u.uz))
            await You(`are floating in ${is_pool(u.ux, u.uy) ? 'the water' : 'a bubble of air'}.`);
        else {
            // C fountain.c:21 floating_above(what)
            let umsg = 'are floating high above the';
            let what = stairs_down ? 'stairs' : ladder_down ? 'ladder'
                : surface(u.ux, u.uy);
            if (u.utrap && ((u.utraptype | 0) === TT_INFLOOR
                            || (u.utraptype | 0) === TT_LAVA)) {
                umsg = 'are trapped in the';
                what = surface(u.ux, u.uy);
            }
            await You(`${umsg} ${what}.`);
        }
        g.context.move = 0; // ECMD_OK — didn't move
        return ECMD_OK;
    }
    // C do.c:1204-1219: descending first brings a ceiling hider out of hiding.
    if (Upolyd(u) && pooleffects_ceiling_hider(permonstTemplate(u.umonnum)) && u.uundetected) {
        u.uundetected = 0;
        if (pooleffects_Flying())
            await You('fly out of hiding.');
        else {
            await You('drop to the %s.', surface(u.ux, u.uy));
            if (is_pool_or_lava(u.ux, u.uy))
                await pooleffects(false);
            else {
                await pickup_c(1);
                const t = t_at(u.ux, u.uy);
                if (t) await dotrap(t, _DODOWN_TOOKPLUNGE);
            }
        }
        return (g.context.move = 1, ECMD_TIME);
    }
    // C do.c:1221-1222.
    if (await u_stuck_cannot_go("down")) {
        g.context.move = 1;
        return ECMD_TIME;
    }
    let trap = null;
    // C do.c:1224-1237 — no downstair/ladder here: check for a fallable
    // trap door / hole underfoot before giving up.
    if (!stairs_down && !ladder_down) {
        trap = t_at(u.ux, u.uy);
        if (trap && (uteetering_at_seen_pit(trap) || uescaped_shaft(trap))) {
            // C do.c:1226-1228.
            await dotrap(trap, _DODOWN_TOOKPLUNGE);
            g.context.move = 1;
            return ECMD_TIME;
        } else if (!trap || !is_hole(trap.ttyp) || !Can_fall_thru(u.uz)
                   || !trap.tseen) {
            // C do.c:1229-1237.  flags.autodig with a wielded pick and no
            // nopick: dig down via use_pick_axe2 (u.dz=1 from set_move_cmd).
            // and a pick wielded digs a pit (C: "You start digging downward").
            if (g.flags?.autodig && !(g.context.nopick | 0)
                && u.uwep && is_pick(u.uwep)) {
                return await use_pick_axe2(u.uwep);
            }
            await pline(`You can't go down here${
                trap && (trap.ttyp | 0) === VIBRATING_SQUARE ? ' yet' : ''}.`);
            g.context.move = 0; // ECMD_OK
            return ECMD_OK; // C ref: do.c:1236 `return ECMD_OK;`
        }
        // else: fell through — `trap` is a seen, fallable hole/trap door;
        // C's control flow continues past this whole `if` block below.
    }
    {
        const _vl = g.valley_level;
        if (_vl && (_vl.dlevel | 0) !== 0 && (u.uz?.dnum | 0) === (_vl.dnum | 0)
            && (u.uz?.dlevel | 0) === (_vl.dlevel | 0)
            && !(u.uevent && u.uevent.gehennom_entered)) {
            await You('are standing at the gate to Gehennom.');
            await pline('Unspeakable cruelty and harm lurk down there.');
            if ((await yn_function('Are you sure you want to enter?', 'yn', 'n')) !== 'y') {
                // tty_yn_function leaves the prompt painted (TOPLINE_NON_EMPTY).
                g._topl_sticky = 'Are you sure you want to enter? [yn] (n)';
                g.context.move = 0; // ECMD_OK
                return ECMD_OK;
            }
            await pline('So be it.');
            u.uevent = u.uevent || {};
            u.uevent.gehennom_entered = 1; // don't ask again
        }
    }
    // C do.c:1247-1249 — the shared next_to_u() checks leashes and the steed.
    if (!(await next_to_u_real())) {
        await pline("You are held back by your pet!");
        g.context.move = 0; // ECMD_OK
        return ECMD_OK;
    }
    if (trap) {
        // C do.c:1251-1276: huge forms must consent and succeed at squeezing.
        const down_or_thru = (trap.ttyp | 0) === HOLE ? 'down' : 'through';
        let actn = u_locomotion('jump');
        if (g.youmonst.data.msize >= _MH_MZ_HUGE) {
            await You("don't fit %s easily.", down_or_thru);
            if ((await y_n_default(`Try to squeeze ${down_or_thru}?`, 'n')) !== 'y')
                return (g.context.move = 0, ECMD_OK);
            if (!rn2(3)) {
                actn = 'manage to squeeze';
                await losehp(flooreffects_Maybe_Half_Phys(rnd(4)),
                             'contusion from a small passage', KILLED_BY);
            } else {
                await You('were unable to fit %s.', down_or_thru);
                return (g.context.move = 0, ECMD_OK);
            }
        }
        await pline(`You ${actn} ${down_or_thru} the ${
            (trap.ttyp | 0) === HOLE ? 'hole' : 'trap door'}.`);
    }
    // C do.c:1281-1282 — Stronghold trapdoors lead to the Valley.
    if (trap && Is_stronghold(u.uz)) {
        await goto_hell(false, true);
    } else if (trap && trap.dst && (trap.dst.dlevel | 0) !== -1) {
        const tdst = { dnum: trap.dst.dnum | 0, dlevel: trap.dst.dlevel | 0 };
        clamp_hole_destination(tdst);
        await goto_level(tdst, false, false, false);
    } else {
        // C do.c:1289-1291 — ordinary descend / first-time trap-door fall:
        // next_level(!trap).
        g.at_ladder = !!ladder_down;
        await next_level(!trap);
        g.at_ladder = false;
    }
    // C do.c:1293 — return ECMD_TIME (turn consumed).
    g.context.move = 1;
    return ECMD_TIME;
}

export async function doup() {
    const g = game;
    const u = g.u || {};
    const stway = stairway_at(u.ux, u.uy);

    set_move_cmd(DIR_UP, 0);
    u.dz = -1;

    if (u_rooted())
        return (g.context.move = 1, ECMD_TIME);  /* ECMD_TIME */

    /* "up" to get out of a pit... */
    if (u.utrap && u.utraptype === TT_PIT) {
        await climb_pit();
        g.context.move = 1;
        return ECMD_TIME;  /* ECMD_TIME */
    }

    if (!stway || (stway && !stway.up)) {
        await pline("You can't go up here.");
        g.context.move = 0; /* ECMD_OK */
        return ECMD_OK;
    }
    if (stucksteed(true)) {
        g.context.move = 0; /* ECMD_OK */
        return ECMD_OK;
    }

    if (await u_stuck_cannot_go("up")) {
        g.context.move = 1; /* ECMD_TIME */
        return ECMD_TIME;
    }

    if (near_capacity() > SLT_ENCUMBER) {
        /* No levitation check; inv_weight() already allows for it */
        const typ = _levlAt(u.ux, u.uy)?.typ;
        await pline(`Your load is too heavy to climb the ${typ === STAIRS ? 'stairs' : 'ladder'}.`);
        g.context.move = 1; /* ECMD_TIME */
        return ECMD_TIME;
    }
    if (ledger_no_cmd(u.uz) === 1) {
        if (g.iflags?.debug_fuzzer) {
            g.context.move = 0; /* ECMD_OK */
            return ECMD_OK;
        }
        const query = 'Beware, there will be no return!  Still climb?';
        const ans = await y_n_default(query, 'n');
        // C tty_yn_function leaves TOPLINE_NON_EMPTY, not NEED_MORE: the
        // answered prompt stays painted (a 'y' that ends the game under a
        // disclosure menu still shows its prefix left of the menu).
        if (!g.iflags?.query_menu) g._topl_sticky = `${query} [yn] (n)`;
        if (ans !== 'y') {
            g.context.move = 0; /* ECMD_OK */
            return ECMD_OK;
        }
    }
    if (!(await next_to_u_real())) {
        await pline("You are held back by your pet!");
        g.context.move = 0; /* ECMD_OK */
        return ECMD_OK;
    }
    const typ = _levlAt(u.ux, u.uy)?.typ;
    g.at_ladder = (typ === LADDER);
    await prev_level(true);
    g.at_ladder = false;
    g.context.move = 1; /* ECMD_TIME */
    return ECMD_TIME;
}

function _drag_down_pre() {
    const u = game.u;
    const uball = u?.uball || null;
    const carried_ball = !!(uball && (uball.where | 0) === 3 /* OBJ_INVENT, obj.h */);
    /* C ball.c:998 — `forward = carried(uball) && (uwep == uball || !uwep
     *                             || !rn2(3));` */
    const forward = carried_ball
        && (u.uwep === uball || !u.uwep || !rn2(3));
    /* C ball.c:1000-1001 */
    const gripMsg = (carried_ball && !welded(uball))
        ? 'You lose your grip on the iron ball.' : null;
    return { forward, gripMsg };
}

/* C ball.c:968-986 litter() — ball&chain cause hero to randomly lose stuff. */
async function _ball_litter() {
    const g = game, uball = g.u?.uball;
    const capacity = weight_cap();
    let nextobj = null;
    for (let otmp = g.invent; otmp; otmp = nextobj) {
        nextobj = otmp.nobj;
        if (otmp !== uball && rnd(capacity) <= (otmp.owt | 0)) {
            if (canletgo(otmp, '')) {
                await You(`drop ${yname(otmp)} and ${otmp.quan === 1 ? 'it' : 'they'} ${otense(otmp, 'fall')} down the stairs with you.`);
                setnotworn(otmp);
                freeinv(otmp);
                await hitfloor(otmp, false);
            }
        }
    }
}

/* C ball.c:1012-1034 — everything after cls().  `dragchance` starts at 3. */
async function _drag_down_post(forward) {
    let dragchance = 3;
    if (forward) {
        /* C ball.c:1013-1019 */
        if (rn2(6)) {
            await pline('The iron ball drags you downstairs!');
            await losehp(flooreffects_Maybe_Half_Phys(rnd(6)),
                   'dragged downstairs by an iron ball', NO_KILLER_PREFIX);
            await _ball_litter();
        }
    } else {
        /* C ball.c:1021-1028 */
        if (rn2(2)) {
            await pline('The iron ball smacks into you!');
            await losehp(flooreffects_Maybe_Half_Phys(rnd(20)),
                   'iron ball collision', 0 /* KILLED_BY_AN */);
            exercise(A_STR, false);
            dragchance -= 2;
        }
        /* C ball.c:1029-1034 */
        if (dragchance >= rnd(6)) {
            await pline('The iron ball drags you downstairs!');
            await losehp(flooreffects_Maybe_Half_Phys(rnd(3)),
                   'dragged downstairs by an iron ball', NO_KILLER_PREFIX);
            exercise(A_STR, false);
            await _ball_litter();
        }
    }
}

/* C do.c:1782-1796 — the tail of goto_level's "you fall down the stairs" arm,
 * everything after the pline that the arrival page has already shown. */
async function _fall_downstairs_effects(forward) {
    const g = game, u = g.u;
    if (_st_Punished()) {
        await _drag_down_post(forward);
        /* C do.c:1785-1786 `if (!welded(uball)) ballrelease(FALSE);` — the
         * welded test lives inside js/ball.js's ballrelease; a carried ball is
         * dropped and encumber_msg() fires ("Your movements are now
         * unencumbered."). */
        await ballrelease(false);
    }
    /* C do.c:1789-1794 — "falling off steed has its own losehp() call". */
    if (u.usteed) {
        await dismount_steed(DISMOUNT_FELL);
    } else {
        await losehp(flooreffects_Maybe_Half_Phys(rnd(3)),
               g.at_ladder ? 'falling off a ladder'
                           : 'tumbling down a flight of stairs', KILLED_BY);
    }
    await _gl_selftouch('Falling, you'); // C do.c:1796, after damage/dismount.
}

const se_splash = 0, se_sizzling = 0; /* sound.h se_* enum — unported */

/* C ref: do.c:49 boulder_hits_pool(otmp, rx, ry, pushing) — a boulder falls
 * (or is pushed) into a pool/water/lava at (rx,ry); may fill it in, splash,
 * or sink.  Returns TRUE if the boulder was consumed by the pool. */
export async function boulder_hits_pool(otmp, rx, ry, pushing) {
    if (!otmp || otmp.otyp !== BOULDER_OTYP) {
        await real_impossible("Not a boulder?");
    } else if (is_pool_or_lava(rx, ry)) {
        const lava = bhp_is_lava(rx, ry);
        let fills_up;
        const what = bhp_waterbody_name(rx, ry);
        const ltyp = _levlAt(rx, ry).typ;
        const chance = rn2(10); /* water: 90%; lava: 10% */
        let mtmp;

        /* chance for boulder to fill pool:  Plane of Water==0%,
           lava 10%, wall of water==50%, other water==90% */
        fills_up = Is_waterlevel(game.u.uz) ? false
                   : IS_WATERWALL(ltyp) ? (chance < 5)
                     : lava ? (chance === 0) : (chance !== 0);

        if (fills_up) {
            const ttmp = t_at(rx, ry);

            if (ltyp === DRAWBRIDGE_UP) {
                const loc = _levlAt(rx, ry);
                loc.drawbridgemask &= ~DB_UNDER; /* clear lava */
                loc.drawbridgemask |= DB_FLOOR;
            } else {
                const loc = _levlAt(rx, ry);
                loc.typ = ROOM;
                loc.flags = 0;
                bhp_recalc_block_point(rx, ry);
            }
            /* 3.7: normally DEADMONSTER() is used when traversing the fmon
               list; however a drowned giant dropping a boulder that fills the
               pool can be dead here — killing it again would yield an
               impossible "dmonsfree" mismatch. */
            if ((mtmp = m_at(rx, ry)) && !DEADMONSTER(mtmp)
                && !bhp_m_in_air(mtmp))
                await bhp_mondied(mtmp);

            if (ttmp)
                await bhp_delfloortrap(ttmp);
            await bhp_bury_objs(rx, ry);

            newsym(rx, ry);
            if (pushing) {
                let whobuf = "you";
                if (game.u.usteed)
                    whobuf = bhp_y_monnam(game.u.usteed);
                await pline("%s %s %s into the %s.", bhp_upstart(whobuf),
                      vtense(whobuf, "push"), bhp_the(bhp_xname(otmp)), what);
                const Blind = _Blind_cmd();
                if (game.flags.verbose && !Blind)
                    await pline("Now you can cross it!");
                /* no splashing in this case */
            }
        }
        if (!fills_up || !pushing) { /* splashing occurs */
            const Blind = _Blind_cmd();
            if (!game.u.uinwater) {
                if (pushing ? !Blind : cansee(rx, ry)) {
                    const splash = nh_sprintf("There is a large splash as %s %s the %s.",
                          [bhp_the(bhp_xname(otmp)), fills_up ? "fills" : "falls into", what]);
                    await pline(splash);
                } else if (!_hero_Deaf()) {
                    if (lava) {
                        bhp_Soundeffect(se_sizzling, 100);
                    } else {
                        bhp_Soundeffect(se_splash, 100);
                    }
                    await bhp_You_hear("a%s splash.", lava ? " sizzling" : "");
                }
                bhp_wake_nearto(rx, ry, 40);
            }

            const u = game.u;
            const distu0 = (rx - u.ux) * (rx - u.ux) + (ry - u.uy) * (ry - u.uy);
            const next2u0 = Math.abs(rx - u.ux) <= 1 && Math.abs(ry - u.uy) <= 1;
            if (fills_up && u.uinwater && distu0 === 0) {
                await set_uinwater(0); /* u.uinwater = 0 */
                await docrt(true);
                game.vision_full_recalc = 1;
                await You("find yourself on dry land again!");
            } else if (lava && next2u0) {
                let dmg;

                await You("are hit by molten %s%c",
                    bhp_hliquid("lava"), bhp_Fire_resistance() ? '.' : '!');
                await bhp_burn_away_slime();
                dmg = d((bhp_Fire_resistance() ? 1 : 3), 6);
                await bhp_losehp(bhp_Maybe_Half_Phys(dmg), /* lava damage */
                       "molten lava", KILLED_BY);
            } else if (!fills_up && game.flags.verbose
                       && (pushing ? !Blind : cansee(rx, ry))) {
                await pline("It sinks without a trace!");
            }
        }

        /* boulder is now gone */
        if (pushing)
            await bhp_useupf(otmp, otmp.quan);
        else
            await bhp_obfree(otmp, null);
        return true;
    }
    return false;
}

/* C artifact.c:2243 finesse_ahriman(obj): will freeing this object from
 * inventory cause levitation to end?  Probes ahead on a copy of the
 * LEVITATION prop, restoring it before returning. */
function finesse_ahriman(obj) {
    const u = game.u;
    const oart = get_artifact(obj);
    const p = u.uprops?.[LEVITATION];
    if (!_Levitation() || oart === ART_NONARTIFACT
        || arti_inv_prop(oart) !== LEVITATION || !((p.extrinsic | 0) & W_ARTI_FW))
        return false;
    const save = { intrinsic: p.intrinsic, extrinsic: p.extrinsic, blocked: p.blocked };
    /* arti_invoke(off) -> float_down() clears I_SPECIAL|TIMEOUT & W_ARTI */
    p.intrinsic = (p.intrinsic | 0) & ~(I_SPECIAL | TIMEOUT);
    p.extrinsic = (p.extrinsic | 0) & ~W_ARTI_FW;
    const result = !_Levitation();
    Object.assign(p, save);
    return result;
}

export async function wipeoff() {
    const u = game.u = game.u || {};
    let udelta = (u.ucreamed | 0);
    let ldelta = BlindedTimeout();

    if (udelta > 4) udelta = 4;
    u.ucreamed = (u.ucreamed | 0) - udelta;
    if (ldelta > 4) ldelta = 4;
    incr_HBlinded(-ldelta);

    if (!HBlinded()) {
        await pline("You've got the glop off.");
        u.ucreamed = 0;
        if (!(await gulp_blnd_check())) {
            set_HBlinded(1);
            make_blinded(0, true);
        }
        return 0;
    } else if (!u.ucreamed) {
        await Your("%s feels clean now.", body_part(FACE));
        return 0;
    }
    return 1; /* still busy */
}

export async function dowipe() {
    const u = game.u || {};
    if (u.ucreamed) {
        /* C do.c:2393-2396 — Sprintf(buf, "wiping off your %s", body_part(FACE))
         * then set_occupation(wipeoff, buf, 0).  xtime 0, so this is the
         * untimed arm: wipeoff() times itself out by returning 0. */
        set_occupation(wipeoff, `wiping off your ${body_part(FACE)}`, 0);
        return ECMD_TIME;
    }
    await Your("%s is already clean.", body_part(FACE));
    return ECMD_TIME;
}

// C ref: do.c:2343 cmd_safety_prevention() — pre-flight check for "wait"-class
// commands ('.', 's'/search, etc).  Mirrors the C body structure:
//
//   boolean
//   cmd_safety_prevention(const char *ucverb, const char *cmddesc,
//                         const char *act, int *flagcounter)
//   {
//       if (flags.safe_wait && !iflags.menu_requested && !gm.multi) {
//           if (iflags.cmdassist || !(*flagcounter)++)
//               Sprintf(buf, "  Use '%s' prefix to force %s.", ...);
//           if (monster_nearby()) { Norep("%s%s", act, buf); return TRUE; }
//           else if (danger_uprops()) { Norep(...); return TRUE; }
//       }
//       *flagcounter = 0;
//       return FALSE;
//   }
//
// flags.safe_wait defaults to On (optlist.h:630-631 NHOPTB ... On ...).
//
// files annotate every midlog enter/exit, so the ground truth is one grep away
// — run these, do not trust prose (including this prose):
//
//
// the keystroke step: JS agrees with C on every recorded monster_nearby() call
//
// all nine; a blocked command returns ECMD_OK, consumes no turn, so the RNG
// `#<entry+1>-<count>` (js/rng.js midlog_exit_int), i.e. 2390 draws before AND
// after — zero consumed.  JS reproduces this exactly: monster_nearby() returns 1
// on all nine steps and the JS draw count is pinned at 2390 across steps 160-184.
// NOTE the pin spans steps 161-183 in C, not just the nine blocked ones — C
// makes no draws anywhere in that stretch — so a pinned ordinal alone is NOT
// evidence that the blocking branch fired.  Read `<monster_nearby=` for that.
//
// Zero RNG calls on either path — the blocking path calls only Norep(), and the
// FALSE path falls straight through to `*flagcounter = 0; return FALSE`.
//
// C guards the whole check with `!gm.multi`, so on a COUNTED command (`20s`)
// C evaluates it at most once and the occupation repeats skip it entirely.  JS
// does not model gm.multi here and re-runs the check on every repeat: on
// JS makes 20.  Currently harmless (monster_nearby() returns 0 on all 20 and the
// mid-repeat: JS would abort the remaining repeats that C would run.  Fixing it
// needs the occupation/multi machinery (cmd.c:842 timed_occupation,
// cmd.c:4398 set_occupation, cmd.c:5817 parse_key), which lives outside this
// function.  Reproduce with:
export function cmd_safety_prevention(ucverb, cmddesc, act, flagcounterRef) {
    const g = game;
    g.flags = g.flags || {};
    // safe_wait default On per optlist.h:630-631.
    if (g.flags.safe_wait === undefined) g.flags.safe_wait = true;
    g.iflags = g.iflags || {};
    // C optlist.h:230-231 — NHOPTB(cmdassist, ..., On, ...): cmdassist defaults On.
    // With cmdassist On, the "  Use 'm' prefix to force <x>." assist suffix is
    // appended on EVERY blocked wait/search (not just the first), so consecutive
    // blocked commands emit the SAME full string.  Norep (gp.prevmsg strcmp, see
    // _norep) then suppresses the repeat — matching the C trace where step 9/10
    // of a 's'/'s'/'s' run show an empty topline after the step-8 message.
    // on the 2nd occurrence, making the strings differ → spurious repeat shown.)
    if (g.iflags.cmdassist === undefined) g.iflags.cmdassist = true;
    if (g.flags.safe_wait && !g.iflags.menu_requested && !(g.multi | 0)) {
        /* C: char buf[QBUFSZ]; buf[0] = '\0';
         *    if (iflags.cmdassist || !(*flagcounter)++)
         *        Sprintf(buf, "  Use '%s' prefix to force %s.",
         *                visctrl(cmd_from_func(do_reqmenu)), cmddesc);
         * cmd_from_func(do_reqmenu) is the "request-menu" prefix key, bound to
         * 'm' in the default keymap (visctrl('m') == "m").  The suffix is built
         * on the FIRST occurrence (flagcounter goes 0→1: !0 is true) or always
         * when the cmdassist option is on; on later consecutive occurrences it
         * is omitted. */
        let buf = '';
        if (g.iflags.cmdassist || !(flagcounterRef.value++)) {
            buf = `  Use '${_binds_visctrl(cmd_from_func('do_reqmenu'))}' prefix to force ${cmddesc}.`;
        }

        if (monster_nearby()) {
            /* C: Norep("%s%s", act, buf) — print act + assist suffix, suppressing
             * an immediate consecutive repeat (Norep == "no repeat"). The message
             * is emitted through _norep(), which wraps C Norep()/vpline(PLINE_NOREPEAT). */
            _norep(`${act}${buf}`);
            return true;
        } else if (danger_uprops()) {
            /* C: Norep("%s doesn't feel like a good idea right now.", ucverb) */
            _norep(`${ucverb} doesn't feel like a good idea right now.`);
            return true;
        }
    }
    flagcounterRef.value = 0;
    return false;
}

// C ref: hack.c:4022 monster_nearby() — scan u.ux±1, u.uy±1 for a monster that
// "might hit us": a non-peaceful (or hallucinated), spottable, awake, non-hidden,
// attack-capable monster that is not deterred by a sanctuary.  Returns 1 if any
// search and consume no turn" path — load-bearing for turn parity (a blocked
// command sets context.move=0, so the per-turn HEAD block does NOT run; without
// this, JS would burn a turn that C did not, desyncing the moveloop turn count).
//
// recorded `<monster_nearby=N` midlog markers): this port returns what C
// paragraph's word for it, and do not "fix" this function without a query that
//
// onscary() is applied (C hack.c:4123 `&& !onscary(u.ux, u.uy, mtmp)`) via the
// real port js/makemon.js onscary (monmove.c:241). Omitting it made a hostile
// monster standing next to a hero on a scare monster scroll (or Elbereth) read
// The one port is js/allmain.js monster_nearby (imported at the top of this file).

// C ref: do.c:2337-2342 danger_uprops() — "return TRUE if hero properties are
// dangerous to hero":
//
//     staticfn boolean
//     danger_uprops(void)
//     {
//         return (Stoned || Slimed || Strangled || Sick);
//     }
//
// All four macros are plain INTRINSIC reads — youprop.h:108-113:
//     #define Sick      u.uprops[SICK].intrinsic
//     #define Stoned    u.uprops[STONED].intrinsic
//     #define Strangled u.uprops[STRANGLED].intrinsic
//     #define Slimed    u.uprops[SLIMED].intrinsic
// so this is a real port, not a stub, and needs no new machinery.  NOTE these
// are `.intrinsic` ONLY — do NOT route them through cmd.js's _uprop_active(),
// which ORs in `.extrinsic` and would be wrong here.  The values are timeout
// counters that also carry flag bits (FROMOUTSIDE etc.), so test !== 0 on the
// raw value rather than masking with |0.
//
// cmd_safety_prevention() call site, which is exactly what the C traces say
// (every recorded `<cmd_safety_prevention=0` is paired with `<monster_nearby=0`,
// i.e. C fell through danger_uprops() too).  It replaces the old
// Strangled/Sick at a wait keystroke is handled instead of silently mis-ported.
function danger_uprops() {
    const up = game.u && game.u.uprops;
    if (!up)
        return false;
    const intrinsic = (idx) => {
        const p = up[idx];
        return p ? Number(p.intrinsic || 0) : 0;
    };
    /* C evaluation order: Stoned, Slimed, Strangled, Sick. */
    return intrinsic(STONED) !== 0
        || intrinsic(SLIMED) !== 0
        || intrinsic(STRANGLED) !== 0
        || intrinsic(SICK) !== 0;
}

// C ref: do.c:2377 donull() — the '.' command: do nothing == rest.
//
//   int donull(void) {
//       if (cmd_safety_prevention("Waiting", "a no-op (to rest)",
//                                 "Are you waiting to get hit?",
//                                 &gd.did_nothing_flag))
//           return ECMD_OK;
//       return ECMD_TIME; /* Do nothing, but let other things happen */
//   }
//
// Return the actual C ECMD result. The dispatcher, not this callee, owns
// context.move; timed_occupation deliberately ignores the result in C.
//
// gd.did_nothing_flag is a static int that cmd_safety_prevention increments
// prefix" assist string.  We model it as a property on game.gd so it
// persists across calls.
export async function donull() {
    const g = game;
    g.gd = g.gd || {};
    if (g.gd.did_nothing_flag === undefined) g.gd.did_nothing_flag = 0;
    const ref = { value: g.gd.did_nothing_flag };
    const aborted = cmd_safety_prevention(
        "Waiting",
        "a no-op (to rest)",
        "Are you waiting to get hit?",
        ref
    );
    g.gd.did_nothing_flag = ref.value;
    if (aborted) return ECMD_OK;
    return ECMD_TIME;
}

/* C ref: do.c obj_no_longer_held(struct obj *obj) — things that must change when not held.
 * Called for both player and monsters. Recurses into containers.
 * C do.c:897-901 visits each contained object before the container. */
export async function obj_no_longer_held(obj) {
    if (!obj) {
        return;
    }
    for (let contents = obj.cobj; contents; contents = contents.nobj)
        await obj_no_longer_held(contents);
    switch (obj.otyp) {
    case 43: /* CRYSKNIFE */
        if (!obj.oerodeproof || !rn2(10)) {
            if (!game.context.mon_moving && !game.program_state.gameover)
                await costly_alteration(obj, 6); /* COST_DEGRD */
            obj.otyp = 42; /* WORM_TOOTH */
            obj.oerodeproof = 0;
        }
        break;
    }
}

export function legs_in_no_shape(for_what, by_steed) {
    const u = game.u || {};
    if (by_steed && u.usteed) {
        pline("%s is in no shape for %s.", Monnam(u.usteed), for_what);
    } else {
        const _wlp = u.uprops?.[WOUNDED_LEGS];
        let wl = ((_wlp?.extrinsic | 0) & BOTH_SIDES);
        let bp = body_part(LEG);
        if (wl === BOTH_SIDES)
            bp = makeplural(bp);
        Your("%s%s %s in no shape for %s.",
             (wl === LEFT_SIDE) ? "left " : (wl === RIGHT_SIDE) ? "right " : "",
             bp, (wl === BOTH_SIDES) ? "are" : "is", for_what);
    }
}

// C ref: do.c:53-61 — maybe_lvltport_feedback — levelport arrival message.
export async function maybe_lvltport_feedback() {
    const g = game;
    /* schedule_goto() (do.c:2076) stores the deferred message in
     * gd.dfr_post_msg; this port keeps it in g._dfr_post_msg (the field
     * deferred_goto reads), so read THAT — reading g.gd.dfr_post_msg made this
     * function a permanent no-op. */
    if (g._dfr_post_msg
        && !strncmpi_local(g._dfr_post_msg, "You materialize", 15)) {
        /* "You materialize on a different level." */
        // do.c:2037-2038 consumes the message as soon as pline returns.
        // pline publishes synchronously; clear before yielding so docrt's
        // synchronous Sting_effects caller cannot leave it pending for
        // goto_level to deliver a second time.
        const printed = pline(g._dfr_post_msg);
        g._dfr_post_msg = null;
        await printed;
    }
}

// strncmpi — case-insensitive prefix compare, n chars max
function strncmpi_local(s1, s2, n) {
    for (let i = 0; i < n; i++) {
        if (!s2[i]) return (s1[i] !== undefined) ? 1 : 0;
        if (!s1[i]) return -1;
        const c1 = lowc(s1[i]);
        const c2 = lowc(s2[i]);
        if (c1 !== c2) return (c1 > c2) ? 1 : -1;
    }
    return 0;
}

// C ref: do.c:2452-2471 — set_wounded_legs(long side, int timex)
export function set_wounded_legs(side, timex) {
    const u = game.u;
    if (game.disp) game.disp.botl = 1; /* SET_BOTL */

    if (!u.uprops) u.uprops = {};
    if (!u.uprops[WOUNDED_LEGS]) u.uprops[WOUNDED_LEGS] = { intrinsic: 0, extrinsic: 0 };

    const wl = u.uprops[WOUNDED_LEGS];
    const HWounded_legs = wl.intrinsic | 0;
    const EWounded_legs = wl.extrinsic | 0;

    if (!(HWounded_legs || EWounded_legs)) {
        if (!u.atemp) u.atemp = { a: [0, 0, 0, 0, 0, 0] };
        if (!u.atemp.a) u.atemp.a = [0, 0, 0, 0, 0, 0];
        /* DISPLAY-order index — see heal_legs below. */
        u.atemp.a[C_ATTR_TO_DISP[A_DEX]]--;
    }

    if (!(HWounded_legs || EWounded_legs) || (HWounded_legs & TIMEOUT) < timex) {
        wl.intrinsic = (HWounded_legs & ~TIMEOUT) | timex;
    }

    wl.extrinsic = EWounded_legs | side;

    encumber_msg();
}

// C ref: do.c:2474-2513 — heal_legs(int how): 0 ordinary, 1 dismounting
// steed, 2 limbs turn to stone (petrification countdown; suppress message).
export function heal_legs(how) {
    const u = game.u;
    const wl = u.uprops && u.uprops[WOUNDED_LEGS];
    const HWounded_legs = wl ? (wl.intrinsic | 0) : 0;
    const EWounded_legs = wl ? (wl.extrinsic | 0) : 0;

    if (HWounded_legs || EWounded_legs) {
        if (game.disp) game.disp.botl = 1; /* SET_BOTL */

        if (!u.atemp) u.atemp = { a: [0, 0, 0, 0, 0, 0] };
        if (!u.atemp.a) u.atemp.a = [0, 0, 0, 0, 0, 0];
        /* C do.c:2452 `if (ATEMP(A_DEX) < 0) ATEMP(A_DEX)++;`.  u.atemp.a is in
         * DISPLAY order in this port (js/attrib.js getAtemp / C_ATTR_TO_DISP),
         * so the C constant A_DEX(=3) has to be translated — indexing with the
         * raw constant edits the INTELLIGENCE slot.  The same translation
         * js/trap.js _set_wounded_legs already does. */
        const _dexDisp = C_ATTR_TO_DISP[A_DEX];
        if ((u.atemp.a[_dexDisp] | 0) < 0)
            u.atemp.a[_dexDisp]++;

        /* when mounted, wounded legs applies to the steed; during
           petrification countdown (how==2) suppress the feel-better msg */
        if (!u.usteed && how !== 2) {
            let legs = body_part(LEG);
            if ((EWounded_legs & BOTH_SIDES) === BOTH_SIDES)
                legs = makeplural(legs);
            Your("%s %s better.", legs, vtense(legs, "feel"));
        }

        if (wl) {
            wl.intrinsic = 0;
            wl.extrinsic = 0;
        }

        if (how === 0)
            encumber_msg();
    }
}

function recbranch_mapseen(source, dest) {
    if ((source.dnum | 0) === (dest.dnum | 0))
        return;                                  /* not a branch */
    const on_lev = (a, b) => !!a && !!b && (a.dnum | 0) === (b.dnum | 0)
                          && (a.dlevel | 0) === (b.dlevel | 0);
    let br = null;
    for (const b of (game._dungeon_branches || [])) {
        if (!b.end1_floating && on_lev(source, b.end1) && on_lev(dest, b.end2)) { br = b; break; }
        if (!b.end1_floating && on_lev(source, b.end2) && on_lev(dest, b.end1)) return;
    }
    if (!br)
        return;                                  /* not a real branch */
    const mptr = (game._mapseen_entries || []).find(entry => !entry.duplicate && on_lev(entry, source));
    if (mptr) {
        const all = (game._level_br = game._level_br || {});
        const key = `${source.dnum | 0}:${source.dlevel | 0}`;
        if (all[key] && br !== all[key])
            impossible_sync('Two branches on the same level?');
        all[key] = br;
    } else {
        impossible_sync("Can't note branch for unseen level (%d, %d)",
                        source.dnum | 0, source.dlevel | 0);
    }
}

/* C ref: dungeon.h:132 Is_qstart(x) = Lcheck(x, &qstart_level) — the same
 * on_level() comparison the quest block below spells out by hand three times.
 * goto_level()'s portal arm needs it for the "portal back doesn't exist
 * anymore" fork (do.c:1732-1735). */
function _Is_qstart(lev) {
    return on_level(lev, game.qstart_level);
}

// ── Stubs for unported helpers used by doup ─────────────────────────────────
/* C do.c:1110-1127 u_stuck_cannot_go(). */
async function u_stuck_cannot_go(updn) {
    const u = game.u || {};
    if (u.ustuck) {
        if (u.uswallow || !sticks(game.youmonst?.data)) {
            await You(`are ${!u.uswallow ? 'being held'
                : _digests(u.ustuck.data) ? 'swallowed' : 'engulfed'}, and cannot go ${updn}.`);
            return true;
        }
        const mtmp = u.ustuck;
        set_ustuck(null);
        await You(`release ${mon_nam(mtmp)}.`);
    }
    return false;
}
