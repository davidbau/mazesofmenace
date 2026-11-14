// @ts-nocheck
// wizcmds.js — Wizard-mode extended commands.
// C ref: nethack-c/src/wizcmds.c — wiz_level_change() and related.
// Hand-maintained JS (not tsc-emitted). Sibling imports from js/*.js.
import { u_safe_from_fatal_corpse } from './pickup.js';
import { olfaction } from './mondata.js';
import { erosion_matters } from './objnam.js';
import { mungspaces } from './hacklib.js';
import { usmellmon } from './mon.js';
import { body_part, cmdq_pop, doprev_message } from './cmd.js';
import { ARM, ECMD_CANCEL, UTOTYPE_NONE, Is_stronghold, Is_botlevel, CMDQ_KEY } from './const.js';
import { getdir } from './cmd.js';
import { map_invisible, GLYPHCLS_MON, GLYPHCLS_INVIS, display_migrating_mons } from './display.js';
import { game, wizard } from './gstate.js';
import { reassign } from './invent.js';
import { COLNO, NATTK } from './const.js';
const IN_SIGHT_BIT = 0x2; /* vision.h IN_SIGHT */
import { s_suffix as _ta_s_suffix } from './hacklib.js';
import { nhgetch } from './input.js';
import { vision_recalc } from './vision.js';
import { oc_merge } from './oc_merge.generated.js';
import { canspotmon, unmap_invisible } from './display.js';
import { flash_mon } from './mon.js';
import { pline, gamelog_add, livelog_printf } from './pline.js';
import { topl_park_cursor, TOPL_LIMIT, _topl_more_pages, use_last_flush_snapshot, restore_occupation_topline, restore_command_topline } from './display.js';
import { bot } from './botl.js';
import { flush_screen, force_more, _topl_record_join, capture_painted_frame, capture_pre_movemon_botl,
         _topl_merge_result, _topl_joins_snapshot } from './display.js';
import { pline_flush_point, _pline_flush_frame_record, prepare_deferred_pline } from './display.js';
import { display_text_window } from './com_pager.js';
import { displayLookWindow } from './look-window.js';
import { OC_NAME } from './oc_name_data.js';
import { MKOBJ_OC_PROB, MKOBJ_OC_CLASS } from './mkobj_data.js';
import { FIRST_OBJECT } from './o_init.js';
import { pluslvl, losexp } from './exper.js';
import { wish_history_add, wish_history_menu, wish_history_has } from './zap.js';
import { findit } from './detect.js';
import { rn2, d, rnd } from './rnd.js';
import { readobjnam, hands_obj, getObjDescr, xname_scroll, xname_spellbook, xname_amulet, xname_armor, xname_weapon, xname_oname_tail, xname, the, The, aobjnam, Tobjnam, doname as doname_real } from './objnam.js';
import { quest_info } from './questpgr.js';
import { artiname } from './artifact.js';
import { discover_object, observe_object } from './o_init.js';
import { stagger_verb, encumber_msg_sync, weight } from './weight.js';
import { near_capacity } from './hack.js';
import { exercise, ARTILIST_MTYPE } from './attrib.js';
import { losehp } from './hack.js';
import { MKOBJ_OC_MATERIAL } from './mkobj_erosion_meta.js';
import { permonstTemplate, monPmname, set_malign, mkclass, rndmonst, splitobj } from './makemon.js';
import { hates_silver, name_to_mon, name_to_monclass } from './mondata.js';
import { engravings_list } from './mklev.js';
import { makemon } from './makemon.js';
import { newcham, mongone } from './mon.js';
import { count_wsegs } from './worm.js';
import { tamedog, migrate_to_level, panic } from './dog.js';
import { monster_census } from './minion.js';
import { MM_NOMSG, MIGR_RANDOM } from './const.js';
import { put_saddle_on_mon } from './steed.js';
import { is_pool } from './look.js';
import { light_sources_list } from './light.js';
import { region_stats_snapshot, any_visible_region } from './region.js';
import { property_by_index, obj_stop_timers } from './timeout.js';
import { cant_revive } from './read.js';
import { PM_LONG_WORM_TAIL, PM_LONG_WORM, PM_STALKER, PM_DEATH, PM_FAMINE, PM_PESTILENCE } from './pm.generated.js';
import monsPack from './makemon_mons.json' with { type: 'json' };
/* y_n_default is C's y_n() (hack.h:1329 y_n(q) := yn_function(q, ynchars, 'n',
 * TRUE)); it lives in js/cmd.js, which already imports this file — the cycle is
 * the tree's norm (20+ modules import from cmd.js) and both sides are hoisted
 * function declarations, so the binding resolves at call time. */
import { y_n_default } from './cmd.js';
import { inv_cnt } from './hack.js';
import { getpos } from './getpos.js';
import { addinv_core2, reorder_invent, freeinv, addinv_core1, carry_obj_effects, obj_to_let, mergable as mergable_real } from './invent.js';
import { get_level } from './dungeon.js';
import { setuqwep } from './wield.js';
import { hitfloor, hurtle, mhurtle } from './dothrow.js';
import { dropx, dropy } from './do.js';
import { place_object, remove_object } from './mkobj.js';
import { upstart } from './hacklib.js';
import { m_at, mon_nam, XKILL_NOMSG } from './uhitm.js';
import { xkilled } from './mon.js';
import { x_monnam } from './do_name.js';
import { nonliving } from './makemon.js';
import { mondied } from './mon.js';
import { ARTICLE_YOUR, ARTICLE_THE, ARTICLE_A, SUPPRESS_IT,
         SUPPRESS_HALLUCINATION, SUPPRESS_SADDLE, has_mgivenname } from './const.js';
import { dmonsfree } from './mon.js';
import { forget_temple_entry } from './priest.js';
import { flip_level, flip_level_rnd } from './sp_lev.js';
import { docrt } from './display.js';
import { done, ynq } from './end.js';
import { yn_function } from './cmd.js';
import { paranoid_query } from './cmd.js';
import { DIED } from './const.js';
import { PM_SAMURAI } from './pm.generated.js';
import { bury_objs } from './dig.js';
import { is_missile, ammo_and_launcher } from './hold_another_object.js';
import { can_reach_floor } from './engrave.js';
import { addinv_core0 } from './invent.js';
import { obfree } from './shk.js';
import { A_WIS, KILLED_BY, ANTIMAGIC, HALF_PHDAM, LOW_PM, ECMD_OK, MM_MINVIS,
         Is_airlevel, Is_waterlevel, IRONBARS, ICE, FUMBLING, COLD_RES, LS_OBJECT, LS_MONSTER,
         LL_CONDUCT, LL_WISH, LL_ARTIFACT, Upolyd } from './const.js';
import { _artifact_origin } from './objnam.js';
import { ONAME_WISH, ONAME_KNOW_ARTI, ONAME_SKIP_INVUPD, ONAME, has_oname } from './const.js';
import { oname } from './do_name.js';

/* C wizcmds.c:1113-1693 — #stats uses native allocation sizes rather than
 * JavaScript object sizes. These are the ABI values of the frozen C build. */
const STATS_OBJ_SIZE = 112;
const STATS_OEXTRA_SIZE = 32;
const STATS_MON_SIZE = 192;
const STATS_MEXTRA_SIZE = 64;
const STATS_TRAP_SIZE = 32;
const STATS_ENGR_SIZE = 64;
const STATS_LIGHT_SOURCE_SIZE = 32;
const STATS_TIMER_SIZE = 48;
const STATS_DAMAGE_SIZE = 32;
const STATS_REGION_SIZE = 96;
const STATS_RECT_SIZE = 8;
const STATS_KINFO_SIZE = 272;
const STATS_CEMETERY_SIZE = 184;
const STATS_MAPSEEN_SIZE = 384;
const STATS_NUM_OBJECTS = 481;

function _stats_mon_size(mon, includeWormSegments) {
    let size = STATS_MON_SIZE;
    if (mon?.mextra) {
        size += STATS_MEXTRA_SIZE;
        if (mon.mextra.mgivenname)
            size += String(mon.mextra.mgivenname).length + 1;
        for (const [key, bytes] of [['egd', 640], ['epri', 56], ['eshk', 4960],
                                    ['emin', 8], ['edog', 64], ['ebones', 28]])
            if (mon.mextra[key]) size += bytes;
    }
    if (includeWormSegments && mon?.wormno)
        size += count_wsegs(mon) * 16;
    return size;
}

function _stats_obj_size(obj) {
    let size = STATS_OBJ_SIZE;
    const x = obj?.oextra;
    if (x) {
        size += STATS_OEXTRA_SIZE;
        if (x.oname) size += String(x.oname).length + 1;
        if (x.omailcmd) size += String(x.omailcmd).length + 1;
        if (x.omonst) size += _stats_mon_size(x.omonst, false);
    }
    return size;
}

function _stats_count_objects(chain, recurse) {
    let count = 0, size = 0;
    for (let obj = chain; obj; obj = obj.nobj) {
        count++;
        size += _stats_obj_size(obj);
        if (recurse && obj.cobj) {
            const nested = _stats_count_objects(obj.cobj, true);
            count += nested.count;
            size += nested.size;
        }
    }
    return { count, size };
}

function _stats_mon_count(chain, includeWormSegments) {
    let count = 0, size = 0;
    for (let mon = chain; mon; mon = mon.nmon) {
        count++;
        size += _stats_mon_size(mon, includeWormSegments);
    }
    return { count, size };
}

function _stats_row(label, count, size) {
    return String(label).padEnd(27) + '  '
        + String(count).padStart(4) + '  ' + String(size).padStart(6);
}

/* C ref: include/artifact.h — special-property flags used by touch_artifact. */
const SPFX_RESTR  = 0x00000002;
const SPFX_INTEL  = 0x00000004;
const SPFX_DCLAS  = 0x00200000;
const SPFX_DFLAG1 = 0x00400000;
const SPFX_DFLAG2 = 0x00800000;
const SPFX_DALIGN = 0x01000000;
const SPFX_DBONUS = 0x01F00000; /* attack-bonus mask (DMONS..DALIGN) */
const SPFX_ATTK   = 0x10000000;

/* C ref: include/align.h — aligntyp values. */
const A_NONE    = -128;
const A_CHAOTIC = -1;
const A_NEUTRAL = 0;
const A_LAWFUL  = 1;

/* C artifact.c:92-95: artifacts whose role field names a role (artilist.h), keyed by
 * artilist index, valued by roles[] index (0=Arc..12=Wiz).  Quest artifacts are
 * handled via quest_info(0).  aligns[].value by flags.initalign (role.c:697). */
const _ARTI_GIFT_ROLE = { 1: 4, 3: 11, 4: 1, 8: 12, 12: 6, 19: 9 };
export { _ARTI_GIFT_ROLE as ARTI_GIFT_ROLE };
const _ARTI_ALIGN_VALUE = [1, 0, -1];

/* C artifact.c:87-105 hack_artifacts: role gifts and the quest artifact use
 * the hero's initial alignment for every toucher, including monsters. */
export function artifact_alignment(arti) {
    const al = ARTI_PROPS[arti]?.al;
    if ((al !== A_NONE && _ARTI_GIFT_ROLE[arti] === (game.flags?.initrole ?? -1))
        || arti === (quest_info(0) | 0))
        return _ARTI_ALIGN_VALUE[game.flags?.initalign ?? 0] ?? al;
    return al;
}

export const ARTI_PROPS = [
    /*  0 STRANGE_OBJECT */ { spfx: 0,                                          al: A_NONE,    role: false, race: false },
    /*  1 Excalibur     */ { spfx: SPFX_RESTR | SPFX_INTEL,                     al: A_LAWFUL,  role: true,  race: false },
    /*  2 Stormbringer  */ { spfx: SPFX_RESTR | SPFX_ATTK | SPFX_INTEL,         al: A_CHAOTIC, role: false, race: false },
    /*  3 Mjollnir      */ { spfx: SPFX_RESTR | SPFX_ATTK,                      al: A_NEUTRAL, role: true,  race: false },
    /*  4 Cleaver       */ { spfx: SPFX_RESTR,                                  al: A_NEUTRAL, role: true,  race: false },
    /*  5 Grimtooth     */ { spfx: SPFX_RESTR | SPFX_DFLAG2,                    al: A_CHAOTIC, role: false, race: true  },
    /*  6 Orcrist       */ { spfx: SPFX_DFLAG2,                                 al: A_CHAOTIC, role: false, race: true  },
    /*  7 Sting         */ { spfx: SPFX_DFLAG2,                                 al: A_CHAOTIC, role: false, race: true  },
    /*  8 Magicbane     */ { spfx: SPFX_RESTR | SPFX_ATTK,                      al: A_NEUTRAL, role: true,  race: false },
    /*  9 Frost Brand   */ { spfx: SPFX_RESTR | SPFX_ATTK,                      al: A_NONE,    role: false, race: false },
    /* 10 Fire Brand    */ { spfx: SPFX_RESTR | SPFX_ATTK,                      al: A_NONE,    role: false, race: false },
    /* 11 Dragonbane    */ { spfx: SPFX_RESTR | SPFX_DCLAS,                     al: A_NONE,    role: false, race: false },
    /* 12 Demonbane     */ { spfx: SPFX_RESTR | SPFX_DFLAG2,                    al: A_LAWFUL,  role: true,  race: false },
    /* 13 Werebane      */ { spfx: SPFX_RESTR | SPFX_DFLAG2,                    al: A_NONE,    role: false, race: false },
    /* 14 Grayswandir   */ { spfx: SPFX_RESTR,                                  al: A_LAWFUL,  role: false, race: false },
    /* 15 Giantslayer   */ { spfx: SPFX_RESTR | SPFX_DFLAG2,                    al: A_NEUTRAL, role: false, race: false },
    /* 16 Ogresmasher   */ { spfx: SPFX_RESTR | SPFX_DCLAS,                     al: A_NONE,    role: false, race: false },
    /* 17 Trollsbane    */ { spfx: SPFX_RESTR | SPFX_DCLAS,                     al: A_NONE,    role: false, race: false },
    /* 18 Vorpal Blade  */ { spfx: SPFX_RESTR,                                  al: A_NEUTRAL, role: false, race: false },
    /* 19 Snickersnee   */ { spfx: SPFX_RESTR,                                  al: A_LAWFUL,  role: true,  race: false },
    /* 20 Sunsword      */ { spfx: SPFX_RESTR | SPFX_DFLAG2,                    al: A_LAWFUL,  role: false, race: false },
    /* 21 Orb Detection */ { spfx: SPFX_RESTR | SPFX_INTEL,                     al: A_LAWFUL,  role: true,  race: false },
    /* 22 Heart Ahriman */ { spfx: SPFX_RESTR | SPFX_INTEL,                     al: A_NEUTRAL, role: true,  race: false },
    /* 23 Sceptre Might */ { spfx: SPFX_RESTR | SPFX_INTEL | SPFX_DALIGN,       al: A_LAWFUL,  role: true,  race: false },
    /* "The Palantir of Westernesse" would sit here, but artilist.h:237-246 wraps
     * it in `#if 0` (OBSOLETE — Elf-role quest artifact from 3.1.0-3.2.x, the
     * role was eliminated in 3.3.0).  It is not in the compiled artilist[] nor
     * in the ART_* enum, so omitting it keeps every later index equal to C's. */
    /* 24 Staff Aescul  */ { spfx: SPFX_RESTR | SPFX_ATTK | SPFX_INTEL,         al: A_NEUTRAL, role: true,  race: false },
    /* 25 Mirror Merlin */ { spfx: SPFX_RESTR | SPFX_INTEL,                     al: A_LAWFUL,  role: true,  race: false },
    /* 26 Eyes Overworld*/ { spfx: SPFX_RESTR | SPFX_INTEL,                     al: A_NEUTRAL, role: true,  race: false },
    /* 27 Mitre Holiness*/ { spfx: SPFX_RESTR | SPFX_DFLAG2 | SPFX_INTEL,       al: A_LAWFUL,  role: true,  race: false },
    /* 28 Longbow Diana */ { spfx: SPFX_RESTR | SPFX_INTEL,                     al: A_CHAOTIC, role: true,  race: false },
    /* 29 Master Key    */ { spfx: SPFX_RESTR | SPFX_INTEL,                     al: A_CHAOTIC, role: true,  race: false },
    /* 30 Tsurugi       */ { spfx: SPFX_RESTR | SPFX_INTEL,                     al: A_LAWFUL,  role: true,  race: false },
    /* 31 PYEC          */ { spfx: SPFX_RESTR | SPFX_INTEL,                     al: A_NEUTRAL, role: true,  race: false },
    /* 32 Orb of Fate   */ { spfx: SPFX_RESTR | SPFX_INTEL,                     al: A_NEUTRAL, role: true,  race: false },
    /* 33 Eye Aethiopica*/ { spfx: SPFX_RESTR | SPFX_INTEL,                     al: A_NEUTRAL, role: true,  race: false },
];

/* C obj.h:78 OBJ_INVENT — an object in the hero's inventory. */
const OBJ_INVENT_WIZ = 3;

/* C ref: objclass.h:27 — oc_material SILVER (the only material touch_artifact
 * tests).  Mirrors the same local constant in js/mklev.js:258. */
const SILVER_MATERIAL = 14;


/* C ref: youprop.h:57 Antimagic = (HAntimagic || EAntimagic).  Read from the
 * hero's uprops[] the same way js/mcastu.js:69 does. */
function _ta_Antimagic() {
    const p = game.u?.uprops?.[ANTIMAGIC];
    return !!(p && (p.intrinsic || p.extrinsic));
}
/* C ref: youprop.h Half_physical_damage = (HHalf_physical_damage
 *                                          || EHalf_physical_damage);
 * attrib.h Maybe_Half_Phys(dmg) = Half_physical_damage ? ((dmg)+1)/2 : (dmg). */
function _ta_Maybe_Half_Phys(dmg) {
    const p = game.u?.uprops?.[HALF_PHDAM];
    const half = !!(p && (p.intrinsic || p.extrinsic));
    return half ? Math.floor(((dmg | 0) + 1) / 2) : (dmg | 0);
}
function _ta_Hate_silver() {
    const u = game.u || {};
    if (((u.ulycn ?? -1) | 0) >= LOW_PM) return true;
    const data = game.youmonst && game.youmonst.data;
    if (!data) return false; /* un-polymorphed @-class hero: no form hates silver */
    return !!hates_silver(data);
}

/* C artifact.c:992-1005,1020-1034: banes test the current form; DFLAG2
 * also tests the unpolymorphed hero's race and lycanthropy. */
export function bane_applies_hero(arti) {
    const u = game.u || {};
    /* C artifact.c:998-1001,1020-1034: mask to DBONUS, then test the
     * current form before the DFLAG2 race/lycanthropy alternatives. */
    const spfx = (ARTI_PROPS[arti]?.spfx | 0) & SPFX_DBONUS;
    if (!spfx) return false;
    const ptr = game.youmonst?.data || {};
    const mtype = ARTILIST_MTYPE[arti] | 0;
    if (spfx & 0x00100000 /* SPFX_DMONS */)
        return (ptr.pmidx | 0) === mtype;
    if (spfx & SPFX_DCLAS)
        return (ptr.mlet | 0) === mtype;
    if (spfx & SPFX_DFLAG1)
        return ((ptr.mflags1 | 0) & mtype) !== 0;
    if (!(spfx & SPFX_DFLAG2))
        return !!(spfx & SPFX_DALIGN)
            && (u.ualign?.type | 0) !== artifact_alignment(arti);
    const formMatch = ((ptr.mflags2 | 0) & mtype) !== 0;
    /* spec_applies SPFX_DFLAG2 (artifact.c:1029): !Upolyd &&
     * (gu.urace.selfmask & weap->mtype).  Grimtooth's mtype is M2_ELF
     * (artilist.h:123), so an unpolymorphed elven hero is badalign too. */
    const race = (game.flags?.initrace ?? -1) | 0; /* 0 human 1 elf 2 dwarf 3 gnome 4 orc */
    const matches = (arti === 5 && race === 1)
                    || ((arti === 6 || arti === 7) && race === 4);
    /* spec_applies DFLAG2 (artifact.c:1026-1030): ... || ((weap->mtype &
     * M2_WERE) && ismnum(u.ulycn)) — Werebane (13) against a lycanthrope hero. */
    const were = arti === 13 && ((u.ulycn ?? -1) | 0) >= LOW_PM;
    return formMatch || (matches && !Upolyd(u)) || were;
}

export async function touch_artifact_youmonst(otmp) {
    const g = game;
    g._touch_artifact_blast_msg = null;
    g._touch_blasted = false; /* C artifact.c:913 touch_blasted = FALSE — the
                               * file static itself.  The message field above is
                               * only routing: maybe_wail (hack.c:4210-4241) and other
                               * publishers CLEAR it, so it cannot stand in for
                               * the static retouch_object reads at :2535. */
    g._deferredPline = null;
    const arti = (otmp && (otmp.oartifact | 0)) || 0;
    if (!arti) return 1; /* C artifact.c:914-915 ART_NONARTIFACT → return 1 */
    const p = ARTI_PROPS[arti];
    if (!p) return 1;

    const u = g.u || {};
    const ualignType = ((u.ualign && u.ualign.type) ?? A_NEUTRAL) | 0;
    const ualignRecord = ((u.ualign && u.ualign.record) ?? 0) | 0;

    /* C artifact.c:917 — this port is only ever called with &gy.youmonst. */
    const yours = true;
    const self_willed = (p.spfx & SPFX_INTEL) !== 0; /* artifact.c:920 */

    /* C artifact.c:921-928, the `yours` branch. */
    /* C artifact.c:922: Role_if(oart->role) */
    const roleMatch = arti === (quest_info(0) | 0)
                      || _ARTI_GIFT_ROLE[arti] === ((g.flags?.initrole ?? -1) | 0);
    const _roleCleared = arti === 1 /* ART_EXCALIBUR */
                         && ((g.flags?.initrole ?? -1) | 0) !== 4; /* Knight */
    /* C artifact.c:924: oart->race != NON_PM && !Race_if(oart->race) */
    const raceMatch = (arti === 5 && ((g.flags?.initrace ?? -1) | 0) === 4 /* orc */)
                   || ((arti === 6 || arti === 7) && ((g.flags?.initrace ?? -1) | 0) === 1 /* elf */);
    const badclass = self_willed && (((p.role && !_roleCleared) && !roleMatch)
                                     || (p.race && !raceMatch));
    /* C artifact.c:88-104 hack_artifacts(): "gift" artifacts of the hero's own
     * role (artifact.c:92-95) and the hero's quest artifact (:103) have their
     * alignment rewritten to the hero's initial alignment, so a Valkyrie
     * wishing for Mjollnir is never badalign and no rn2(4) is drawn. */
    const al = artifact_alignment(arti);
    let badalign = (p.spfx & SPFX_RESTR) !== 0
                   && al !== A_NONE
                   && (al !== ualignType || ualignRecord < 0);
    /* C artifact.c:941-942 */
    if (!badalign)
        badalign = bane_applies_hero(arti);

    /* C artifact.c:944-945 — see the header block for the short-circuit map. */
    let blasted = false;
    if ((badclass || badalign) && self_willed) {
        blasted = true;            /* `||` short-circuits: NO rn2(4) drawn */
    } else if (badalign) {
        if (!yours || rn2(4) === 0) /* hero: !yours is FALSE, so rn2(4) IS drawn */
            blasted = true;
    }

    if (blasted) {
        /* C artifact.c:949-950: if (!yours) return 0; — hero falls through. */

        /* C artifact.c:951 You("are blasted by %s power!",
         *                     s_suffix(the(xname(obj)))); xname includes the
         * objnam.c:663-664 proper-name shortcut for identified artifacts. */
        g._touch_artifact_blast_msg =
            `You are blasted by ${_ta_s_suffix(the(xname(otmp)))} power!`;
        g._touch_blasted = true; /* C artifact.c:952 touch_blasted = TRUE */
        /* artifact.c:951 vpline flushes before :953/:958 roll/apply damage. */
        prepare_deferred_pline(g._touch_artifact_blast_msg);
        if (g._statusBlankAfterDocrt && g.disp?.botlx) await bot();

        /* tty update_topl (topl.c:262-277): the blast line cannot join a standing
         * topline when n0 + strlen(toplines) + 3 >= CO - 8, so that standing line
         * is more()d here, before artifact.c:953's d() and the losehp.
         * gt.toplines is only the LAST page of the accumulated buffer: the
         * earlier pages were more()d when their successor failed to join
         * (rm148: "You hear a sizzling splash.  You are hit by molten lava."
         * paged, then "You return to human form!" + the blast joins). */
        let blastEnteredTopl = false;
        const _standPages = g._pending_message
            ? _topl_more_pages(String(g._pending_message), _topl_joins_snapshot(String(g._pending_message)))
            : [''];
        if (g._rt_blast_page_standing && g._pending_message
            /* topl.c:257,274: under a live WIN_STOP (ESC at an earlier --More--, e.g.
             * the lifesaving page) skip is TRUE, so the blast pline raises no more(). */
            && !g._topl_win_stop
            && _standPages[_standPages.length - 1].length + 2 + g._touch_artifact_blast_msg.length >= 71) {
            // topl.c:257 samples skip before :274 more() can set WIN_STOP.
            blastEnteredTopl = !g._topl_win_stop && !g._topl_win_stop_armed;
            const _pm = String(g._pending_message);
            g._pending_message = null;
            /* pline.c:273-274: vpline flush_screen(1) runs bot() before update_topl. */
            pline_flush_point();
            _pline_flush_frame_record(_pm.length, g._touch_artifact_blast_msg);
            /* the page's more() is keyed to the blast pline's flush frame */
            g._moreFullCtx = { full: `${_pm}  ${g._touch_artifact_blast_msg}`, start: 0 };
            try { await force_more(_pm); } finally { g._moreFullCtx = null; }
        }

        /* tty update_topl (topl.c:277-290): a message of CO (80) or more columns is
         * split at a space and paged at once, so the --More-- (over the PRE-damage
         * HP) precedes artifact.c:953's d() and the losehp. */
        if (g._touch_artifact_blast_msg.length >= 80) {
            const _bm = g._touch_artifact_blast_msg;
            g._touch_artifact_blast_msg = null;
            // redotoplin's wrapped more() keeps this vpline's own flush.
            await force_more(_bm, undefined, blastEnteredTopl, false, g._deferredPline?.frame);
            /* This more() was raised inside the blast's OWN update_topl, so an ESC
             * (WIN_STOP) is live for every later message of this command
             * (the evade/prinv plines below). */
            if (g._topl_win_stop_armed) { g._topl_win_stop_armed = false; g._topl_win_stop = true; }
        }

        /* C artifact.c:953 */
        let dmg = d(_ta_Antimagic() ? 2 : 4, self_willed ? 10 : 4);
        /* C artifact.c:955-956 — half (maybe quarter) of the silver bonus. */
        if (MKOBJ_OC_MATERIAL[otmp.otyp | 0] === SILVER_MATERIAL && _ta_Hate_silver()) {
            const tmp = rnd(10);
            dmg += _ta_Maybe_Half_Phys(tmp);
        }
        /* C artifact.c:957-958 losehp(dmg, "touching <artiname>", KILLED_BY).
         * losehp (hack.c:4219, exported from js/dokick.js) is RNG-free on the
         * hero's-own-action path and applies u.uhp -= dmg, which the status
         * line must show at the caller's --More--. */
        /* A lethal blast: done() plines "You die..." inside losehp, which more()s
         * the You() still on the topline (artifact.c:951 precedes :958), so the
         * blast line must reach the tty before the death sequence runs. */
        /* tty update_topl (topl.c): a message of n0 >= CO (80) columns wraps and
         * more()s inside its own pline, i.e. BEFORE losehp moves u.uhp. */
        if (dmg < ((u.uhp ?? 0) | 0) && g._touch_artifact_blast_msg
            && g._touch_artifact_blast_msg.length >= 80) {
            const _bm = g._touch_artifact_blast_msg;
            g._touch_artifact_blast_msg = null;
            await force_more(_bm);
            /* ESC at that more() sets WIN_STOP for the very next pline
             * (topl.c:232-235), e.g. "...evades your grasp!" below. */
            if (g._topl_win_stop_armed) {
                g._topl_win_stop_armed = false;
                g._topl_win_stop = true;
            }
        }
        /* C hack.c:4268-4274: losing monster HP can rehumanize and print
         * inside losehp(), just as losing human HP can print a death line. */
        if (dmg >= ((Upolyd(u) ? u.mh : u.uhp) | 0) && g._touch_artifact_blast_msg) {
            const _bm = g._touch_artifact_blast_msg;
            g._touch_artifact_blast_msg = null;
            await pline(_bm);
        }
        await losehp(dmg, `touching ${artiname(otmp.oartifact)}`, KILLED_BY);
        /* C artifact.c:959 */
        exercise(A_WIS, false);
    }

    /* C artifact.c:962-971: badclass && badalign && self_willed → refuse (0). */
    if (badclass && badalign && self_willed) {
        const _blast = g._touch_artifact_blast_msg;
        if (_blast) {
            g._touch_artifact_blast_msg = null;
            await pline(_blast);
        }
        if ((otmp.where | 0) !== OBJ_INVENT_WIZ)
            await pline(`${Tobjnam(otmp, 'evade')} your grasp!`);
        else
            await pline(`${Tobjnam(otmp, 'are')} beyond your control!`);
        return 0;
    }
    return 1; /* C artifact.c:973 */
}


/* C wizcmds.c:883-938 — #wizsmell keeps selecting until cancelled, without time. */
export async function wiz_smell() {
    const u = game.u, cc = { x: u.ux, y: u.uy };
    if (!olfaction(game.youmonst.data)) {
        await pline('You are incapable of detecting odors in your present form.');
        return ECMD_OK;
    }
    await pline('You can move the cursor to a monster that you want to smell.');
    for (;;) {
        await pline('Pick a monster to smell.');
        const ans = await getpos(cc, true, 'a monster');
        if (ans < 0 || cc.x < 0) return ECMD_CANCEL;
        const atYou = cc.x === u.ux && cc.y === u.uy;
        const isYou = atYou && !u.usteed;
        const mptr = atYou ? (u.usteed || game.youmonst).data : m_at(cc.x, cc.y)?.data;
        const glyph = game.level.at(cc.x, cc.y).disp_cls;
        if (mptr) {
            if (isYou) await pline('You surreptitiously sniff under your %s.', body_part(ARM));
            if (!(await usmellmon(mptr)))
                await pline('%s to not give off any smell.', isYou ? 'You seem' : 'That monster seems');
            if (glyph !== GLYPHCLS_MON) map_invisible(cc.x, cc.y);
        } else {
            await pline("You don't smell any monster there.");
            if (glyph === GLYPHCLS_INVIS) unmap_invisible(cc.x, cc.y);
        }
    }
}

/* C ref: wizcmds.c:243-342 wiz_kill(void).  This is a no-time wizard
 * command: repeatedly position the cursor on a monster, crediting the hero
 * unless the 'm' prefix requests a monster kill. */
export async function wiz_kill() {
    const g = game;
    const savedVerbose = g.flags?.verbose;
    const savedAutodescribe = g.iflags?.autodescribe;
    const cc = { x: g.u?.ux | 0, y: g.u?.uy | 0 };
    let prompt = 'Pick first monster to slay';
    for (;;) {
        await pline(`${prompt}:`);
        prompt = 'Next monster';
        g.flags = g.flags || {};
        g.iflags = g.iflags || {};
        g.flags.verbose = false;
        g.iflags.autodescribe = true;
        const ans = await getpos(cc, true, 'a monster');
        g.flags.verbose = savedVerbose;
        g.iflags.autodescribe = savedAutodescribe;
        if (ans < 0 || (cc.x | 0) < 1) break;
        let mtmp = null;
        // C wizcmds.c:267-287: choosing the hero offers mount death or suicide.
        if (cc.x === g.u.ux && cc.y === g.u.uy) {
            if (g.u.usteed) {
                // C wizcmds.c:271 calls ynq (hack.h:1330): default 'q', queue replies.
                const c = await ynq(`Kill ${mon_nam(g.u.usteed).slice(0, 110)}?`);
                if (c === 'q') break;
                if (c === 'y') mtmp = g.u.usteed;
            }
            if (!mtmp) {
                const qbuf = g.urole.mnum === PM_SAMURAI ? 'Perform seppuku?' : 'Commit suicide?';
                if (await paranoid_query(true, qbuf)) {
                    g.svk ||= {};
                    g.svk.killer ||= { id: 0, format: 0, name: '', next: null };
                    g.svk.killer.name = `${g.flags.female ? 'her' : 'his'} own player`;
                    g.svk.killer.format = KILLED_BY;
                    await done(DIED);
                }
                break;
            }
        } else if (g.u.uswallow) {
            mtmp = (((cc.x | 0) - g.u.ux) ** 2 + ((cc.y | 0) - g.u.uy) ** 2 <= 2) ? g.u.ustuck : null; // next2u
        } else {
            mtmp = m_at(cc.x | 0, cc.y | 0);
        }
        unmap_invisible(cc.x | 0, cc.y | 0);
        if (!mtmp) {
            await pline('There is no monster there.');
            break;
        }
        // C wizcmds.c:298-314 names even unseen targets, without hallucination.
        const tame = !!mtmp.mtame;
        const seen = canspotmon(mtmp) || (g.u.uswallow && mtmp === g.u.ustuck);
        const flgs = SUPPRESS_IT | SUPPRESS_HALLUCINATION
            | ((tame && has_mgivenname(mtmp)) ? SUPPRESS_SADDLE : 0);
        const articl = tame ? ARTICLE_YOUR : seen ? ARTICLE_THE : ARTICLE_A;
        const adjs = tame ? (!seen ? 'poor, unseen' : 'poor')
                          : (!seen ? 'unseen' : null);
        const Mn = x_monnam(mtmp, articl, adjs, flgs, false);
        if (!g.iflags.menu_requested) {
            await pline(`You ${nonliving(mtmp.data) ? 'destroy' : 'kill'} ${Mn}!`);
            await xkilled(mtmp, XKILL_NOMSG);
        } else {
            // C wizcmds.c:316-328; mon.c:3381-3403 monkilled(NULL, AD_PHYS).
            g.context.mon_moving = true;
            await pline(`${upstart(Mn)} is ${nonliving(mtmp.data) ? 'destroyed' : 'killed'}.`);
            g.iflags.sad_feeling = !!mtmp.mtame;
            (g.gd ||= {}).disintegested = false;
            await mondied(mtmp);
            g.context.mon_moving = false;
        }
        if (g.u?.utotype) break;
    }
    await dmonsfree();
    return ECMD_OK;
}

/* C ref: wizcmds.c:446 wiz_level_change(void)
 * #levelchange — adjust hero's experience level.
 * Mirrors wizcmds.c:446-488 exactly, including losexp path for going down.
 *
 * C call chain:
 *   doextcmd → wiz_level_change → getlin (reads level number)
 *     → while (u.ulevel < newlevel) pluslvl(FALSE)
 *        → newhp() [rnd(lornd)+rnd(racelornd)] + newpw() [rn2(enrnd)+enfix]
 *     → u.ulevelmax = u.ulevel
 *
 * RNG per pluslvl(FALSE) call (for a typical role):
 *   newhp: rnd(role.lornd) if lornd>0, rnd(race.lornd) if lornd>0
 *          (or rnd(role.hirnd)/rnd(race.hirnd) above xlev)
 *   newpw: rn1(enrnd, enfix) = rn2(enrnd) + enfix, then enermod
 *
 * ECMD_OK — does NOT consume a game turn. */
export async function wiz_level_change() {
    const g = game;
    const u = g.u || {};
    const MAXULEV = 30;

    /* C wizcmds.c:452-458: getlin prompt + parse */
    const buf = await getlin('To what experience level do you want to be set?');

    /* C wizcmds.c:455: buf[0]=='\033' || buf[0]=='\0' → ret=0 */
    if (!buf || buf[0] === '\x1b' || buf[0] === '\0') {
        await pline('Never mind.');
        g.context.move = 0;
        return ECMD_OK;
    }

    /* C wizcmds.c:458: ret = sscanf(buf, "%d%c", &newlevel, &dummy) */
    /* mungspaces (trim + collapse) first; "%d%c" yields 2 when any char
     * follows the number (e.g. "2.0"), so only a whole-string integer passes. */
    const m = /^[+-]?\d+$/.exec(buf.replace(/\s+/g, ' ').trim());
    const parsed = m ? parseInt(m[0], 10) : NaN;
    if (isNaN(parsed)) {
        /* C wizcmds.c:460-463: ret != 1 → pline1(Never_mind) */
        await pline('Never mind.');
        g.context.move = 0;
        return ECMD_OK;
    }
    let newlevel = parsed | 0;

    /* C wizcmds.c:464-484: level comparison + loop */
    if (newlevel === (u.ulevel | 0)) {
        await pline('You are already that experienced.');
    } else if (newlevel < (u.ulevel | 0)) {
        /* C wizcmds.c:466-474: going down */
        if ((u.ulevel | 0) === 1) {
            await pline('You are already as inexperienced as you can get.');
            g.context.move = 0;
            return ECMD_OK;
        }
        if (newlevel < 1) newlevel = 1;
        /* C wizcmds.c:473: while (u.ulevel > newlevel) losexp("#levelchange") */
        while ((u.ulevel | 0) > newlevel)
            await losexp('#levelchange');
    } else {
        /* C wizcmds.c:475-484: going up */
        if ((u.ulevel | 0) >= MAXULEV) {
            await pline('You are already as experienced as you can get.');
            g.context.move = 0;
            return ECMD_OK;
        }
        if (newlevel > MAXULEV) newlevel = MAXULEV;
        /* C wizcmds.c:482-484: while (u.ulevel < newlevel) pluslvl(FALSE) */
        while ((u.ulevel | 0) < newlevel) {
            await pluslvl(false);
        }
    }

    /* C wizcmds.c:486: u.ulevelmax = u.ulevel */
    u.ulevelmax = u.ulevel;

    g.context.move = 0;
    return ECMD_OK;
}

/* C ref: wizcmds.c:490-525 — #wiztelekinesis. Keep targeting until cancelled
 * or a hurtle schedules a level change; the command itself takes no time. */
export async function wiz_telekinesis() {
    const u = game.u;
    const cc = { x: u.ux, y: u.uy };

    await pline('Pick a monster to hurtle.');
    do {
        const ans = await getpos(cc, true, 'a monster');
        if (ans < 0 || cc.x < 1)
            return ECMD_CANCEL;

        const mtmp = m_at(cc.x, cc.y);
        if ((mtmp && canspotmon(mtmp)) || (cc.x === u.ux && cc.y === u.uy)) {
            if (!await getdir('which direction?'))
                return ECMD_CANCEL;

            if (mtmp) {
                await mhurtle(mtmp, u.dx, u.dy, 6);
                if (mtmp.mhp >= 1 && canspotmon(mtmp)) {
                    cc.x = mtmp.mx;
                    cc.y = mtmp.my;
                }
            } else {
                await hurtle(u.dx, u.dy, 6, false);
                cc.x = u.ux;
                cc.y = u.uy;
            }
        }
    } while ((u.utotype | 0) === UTOTYPE_NONE);
    return ECMD_OK;
}

/* C ref: zap.c:6307 makewish(void)
 * Called by wiz_wish.  Reads a wish string via getlin, calls readobjnam to
 * resolve it, then fires rn1(100,50) = rn2(100)+50 for u.ublesscnt.
 *
 * RNG order (Cardinal Rule 2):
 *   1. readobjnam → rnd_otyp_by_namedesc: rn2(maxprob)  [if named object]
 *      OR rn2(SIZEOF_WRPSYM=13)                           [if ESC/random]
 *   2. mksobj: rnd(2) via next_ident, then class-specific init RNG
 *   3. rn2(100) for u.ublesscnt (zap.c:6414)
 *
 * C wizcmds.c:32-43: wiz_wish sets flags.verbose=FALSE before calling
 * makewish, then restores it, so the "You may wish for an object."
 * pline (zap.c:6319-6320) fires for every OTHER wish source but not for
 * Ctrl+W.  Both halves are modelled: the save/clear/restore in wiz_wish()
 * and the guarded pline at the head of makewish(). */
/* C ref: invent.c:694 assigninvlet(), invent.c:1056 addinv_core0(), invent.c:2889
 * prinv().  hold_another_object() during a wish adds the wished object to
 * gi.invent (assigning the next free a-z invlet and appending to the tail with
 * fixinv default ordering) and prints the prinv confirmation line on the
 * topline.  RNG-neutral.  Scoped narrowly: assigns the invlet, links the node,
 * and emits the "<invlet> - <doname>." line.  The doname covers the
 * unidentified-spellbook/scroll/potion/wand/ring appearance forms (the wishable
 * readable classes); other object kinds fall back to the typename. */
const _WISH_CLASS_NOUN = { 4: 'ring', 8: 'potion', 9: 'scroll', 10: 'spellbook', 11: 'wand' };
function _wish_xname_named_tail(otmp, phrase) {
    return xname_oname_tail(otmp, phrase);
}






/* C youprop.h:120 Hallucination := (HHallucination && !Halluc_resistance);
 * HALLUC is property 23, HALLUC_RES 24 (const.js). */
function _wish_Hallu() {
    const hp = game.u?.uprops?.[23];
    const rp = game.u?.uprops?.[24];
    return !!hp && !!(hp.intrinsic | 0)
           && !(rp && ((rp.intrinsic | 0) || (rp.extrinsic | 0)));
}





import { merged as merged_glob } from './invent.js';
/* options.c:3297 burdentype[]: the option may hold the level's name. */
export function _pickup_burden_level(v) {
    if (v == null) return 2; /* MOD_ENCUMBER */
    if (typeof v === 'string') {
        const i = ['unencumbered', 'burdened', 'stressed', 'strained',
                   'overtaxed', 'overloaded'].indexOf(v);
        return i < 0 ? 2 : i;
    }
    return v | 0;
}








/* C wiz_show_stats() (wizcmds.c:1616).  The port keeps the C chain order and
 * output policy, while charging the frozen native ABI sizes above. */
export async function wiz_show_stats() {
    const g = game;
    const migratingObjs = g.gm?.migrating_objs ?? g.migrating_objs;
    const migratingMons = g.migrating_mons;
    const mydogsChain = g.mydogs;
    const level = g.level || {};
    const objectChains = [
        ['invent', g.invent, true], ['fobj', g.fobj, true],
        ['buried', level.buriedobjlist, false],
        ['migrating obj', migratingObjs, false],
        ['billobjs', g.billobjs, false],
    ];
    const lines = ['Current memory statistics:',
        '                             count  bytes', '  Objects, base size 112'];
    let objTotal = { count: 0, size: 0 };
    for (const [name, chain, force] of objectChains) {
        const row = _stats_count_objects(chain, false);
        if (row.count || row.size || force) {
            lines.push(_stats_row(name, row.count, row.size));
            objTotal.count += row.count;
            objTotal.size += row.size;
        }
    }
    /* C's mon_invent_chain counts each monster's top-level inventory, then
     * contained_stats adds only nested objects from each owning chain. */
    const minvent = { count: 0, size: 0 };
    const migratingMinvent = { count: 0, size: 0 };
    for (let mon = g.fmon; mon; mon = mon.nmon) {
        const row = _stats_count_objects(mon.minvent, false);
        minvent.count += row.count; minvent.size += row.size;
    }
    for (let mon = migratingMons; mon; mon = mon.nmon) {
        const row = _stats_count_objects(mon.minvent, false);
        migratingMinvent.count += row.count; migratingMinvent.size += row.size;
    }
    if (minvent.count || minvent.size) {
        lines.push(_stats_row('minvent', minvent.count, minvent.size));
        objTotal.count += minvent.count; objTotal.size += minvent.size;
    }
    if (migratingMinvent.count || migratingMinvent.size) {
        lines.push(_stats_row('migrating minvent', migratingMinvent.count, migratingMinvent.size));
        objTotal.count += migratingMinvent.count; objTotal.size += migratingMinvent.size;
    }
    const contained = { count: 0, size: 0 };
    for (const chain of [g.invent, g.fobj, level.buriedobjlist, migratingObjs]) {
        const all = _stats_count_objects(chain, true);
        const top = _stats_count_objects(chain, false);
        contained.count += all.count - top.count;
        contained.size += all.size - top.size;
    }
    for (const monChain of [g.fmon, migratingMons]) {
        for (let mon = monChain; mon; mon = mon.nmon) {
            const all = _stats_count_objects(mon.minvent, true);
            const top = _stats_count_objects(mon.minvent, false);
            contained.count += all.count - top.count;
            contained.size += all.size - top.size;
        }
    }
    if (contained.count || contained.size) {
        lines.push(_stats_row('contained', contained.count, contained.size));
        objTotal.count += contained.count; objTotal.size += contained.size;
    }
    lines.push('---------------------------  ----- -------',
        _stats_row('  Obj total', objTotal.count, objTotal.size), '');

    const fmon = _stats_mon_count(g.fmon, true);
    const migrating = _stats_mon_count(migratingMons, false);
    const mydogs = _stats_mon_count(mydogsChain, false);
    const monTotal = { count: fmon.count + migrating.count + mydogs.count,
        size: fmon.size + migrating.size + mydogs.size };
    lines.push('  Monsters, base size 192');
    lines.push(_stats_row('fmon', fmon.count, fmon.size));
    if (migrating.count) lines.push(_stats_row('migrating', migrating.count, migrating.size));
    if (mydogs.count) lines.push(_stats_row('mydogs', mydogs.count, mydogs.size));
    lines.push('---------------------------  ----- -------',
        _stats_row('  Mon total', monTotal.count, monTotal.size), '');

    // C dungeon.c:2760-2801 overview_stats: charge every mapseen and its data.
    const mapseen = g._mapseen_entries || [];
    const overview = { count: mapseen.length, size: mapseen.length * STATS_MAPSEEN_SIZE };
    lines.push('  Overview', _stats_row(`general, size ${STATS_MAPSEEN_SIZE}`,
        overview.count, overview.size));
    let bcount = 0, acount = 0, asize = 0;
    for (const lev of mapseen) {
        if (lev.duplicate) continue; // find_mapseen updates only the first entry.
        const custom = g._level_custom?.[`${lev.dnum}:${lev.dlevel}`];
        if (custom) { acount++; asize += new TextEncoder().encode(custom).length + 1; }
        const ledger = g.dungeons[lev.dnum].ledger_start + lev.dlevel;
        const remembered = lev.dnum === g.u.uz.dnum && lev.dlevel === g.u.uz.dlevel
            ? level : g.levelStore?.get(ledger)?.level || g._mapseen_levels?.get(ledger);
        for (let ce = remembered?.bonesinfo; ce; ce = ce.next) bcount++;
    }
    if (bcount)
        lines.push(_stats_row(`cemetery, size ${STATS_CEMETERY_SIZE}`,
            bcount, bcount * STATS_CEMETERY_SIZE));
    if (acount) lines.push(_stats_row('annotations, text', acount, asize));
    overview.count += bcount + acount;
    overview.size += bcount * STATS_CEMETERY_SIZE + asize;
    lines.push('---------------------------  ----- -------',
        _stats_row('  Over total', overview.count, overview.size), '');

    let trapCount = 0;
    for (let trap = g.ftrap; trap; trap = trap.ntrap) trapCount++;
    const engravings = engravings_list();
    const engrSize = engravings.reduce((n, e) =>
        n + STATS_ENGR_SIZE
            + 3 * (Math.max(String(e.text || '').length,
                             String(e.pristine || e.text || '').length) + 1), 0);
    const lightSources = light_sources_list();
    const lightSize = lightSources.length * STATS_LIGHT_SOURCE_SIZE;
    const regionStats = region_stats_snapshot();
    let regionSize = regionStats.max_regions * STATS_REGION_SIZE;
    for (const reg of regionStats.regions) {
        regionSize += (reg.nrects | 0) * STATS_RECT_SIZE;
        if (reg.enter_msg) regionSize += String(reg.enter_msg).length + 1;
        if (reg.leave_msg) regionSize += String(reg.leave_msg).length + 1;
        regionSize += (reg.max_monst | 0) * 4;
    }
    let timerCount = 0;
    for (let timer = g.gt?.timer_base; timer; timer = timer.next) timerCount++;
    let damageCount = 0;
    for (let damage = level.damagelist; damage; damage = damage.next) damageCount++;
    let killerCount = 0;
    for (let killer = g.svk?.killer?.next; killer; killer = killer.next) killerCount++;
    let bonesCount = 0;
    for (let bones = level.bonesinfo; bones; bones = bones.next) bonesCount++;
    let unameCount = 0, unameSize = 0;
    for (let idx = 0; idx < STATS_NUM_OBJECTS; idx++) {
        const uname = g._oc_uname?.[idx];
        if (uname) {
            unameCount++;
            unameSize += String(uname).length + 1;
        }
    }
    const misc = { count: trapCount + engravings.length + lightSources.length + timerCount
            + damageCount + regionStats.n_regions + killerCount + bonesCount + unameCount,
        size: trapCount * STATS_TRAP_SIZE + engrSize
            + lightSize + timerCount * STATS_TIMER_SIZE
            + damageCount * STATS_DAMAGE_SIZE + regionSize
            + killerCount * STATS_KINFO_SIZE + bonesCount * STATS_CEMETERY_SIZE
            + unameSize };
    lines.push('  Miscellaneous',
        _stats_row(`traps, size ${STATS_TRAP_SIZE}`, trapCount, trapCount * STATS_TRAP_SIZE),
        _stats_row('engravings, size 64+text', engravings.length, engrSize));
    if (lightSources.length)
        lines.push(_stats_row(`light sources, size ${STATS_LIGHT_SOURCE_SIZE}`,
                              lightSources.length, lightSize));
    if (timerCount)
        lines.push(_stats_row(`timers, size ${STATS_TIMER_SIZE}`,
                              timerCount, timerCount * STATS_TIMER_SIZE));
    if (damageCount)
        lines.push(_stats_row(`shop damage, size ${STATS_DAMAGE_SIZE}`,
                              damageCount, damageCount * STATS_DAMAGE_SIZE));
    if (regionStats.n_regions || regionSize)
        lines.push(_stats_row('regions, size 96+8*rect+N',
                              regionStats.n_regions, regionSize));
    if (killerCount)
        lines.push(_stats_row(`delayed killer${killerCount === 1 ? '' : 's'}, size ${STATS_KINFO_SIZE}`,
                              killerCount, killerCount * STATS_KINFO_SIZE));
    if (bonesCount)
        lines.push(_stats_row(`bones history, size ${STATS_CEMETERY_SIZE}`,
                              bonesCount, bonesCount * STATS_CEMETERY_SIZE));
    if (unameCount)
        lines.push(_stats_row('object type names, text', unameCount, unameSize));
    lines.push('---------------------------  ----- -------',
        _stats_row('  Misc total', misc.count, misc.size), '',
        '---------------------------  ----- -------',
        _stats_row('  Grand total', objTotal.count + monTotal.count + overview.count + misc.count,
            objTotal.size + monTotal.size + overview.size + misc.size));
    await display_text_window(lines);
    return ECMD_OK;
}


/* C ref: wizcmds.c:32-43 wiz_wish(void)
 * Wizard-mode Ctrl+W wish command.  Sets flags.verbose=FALSE, calls
 * makewish(), restores flags.verbose, then calls encumber_msg().
 *
 * ECMD_OK — does NOT consume a game turn (context.move = 0). */
export async function wiz_wish() {
    const g = game;

    if (!wizard()) {
        await pline("Unavailable command 'wizwish'.");
        return ECMD_OK;
    }

    /* C wizcmds.c:36-40:
     *   boolean save_verbose = flags.verbose;
     *   flags.verbose = FALSE;
     *   makewish();
     *   flags.verbose = save_verbose;
     * This is what suppresses makewish's "You may wish for an object." on the
     * Ctrl+W path only. */
    if (!g.flags) g.flags = {};
    const save_verbose = g.flags.verbose;
    g.flags.verbose = false;
    try {
        await makewish();
    } finally {
        g.flags.verbose = save_verbose;
    }
    /* C wizcmds.c:40 — encumber_msg() after makewish (terrain wishes and
     * hands_obj returns reach it too). */
    encumber_msg_sync();

    /* C: this handler returns ECMD_OK on every path; rhack() maps it. */
    return ECMD_OK;
}





/* C wizcmds.c:410-442 wiz_flip_level() — #wizfliplevel; returns ECMD_OK. */
export async function wiz_flip_level() {
    const choices = '0123';
    const prmpt = 'Flip 0=randomly, 1=vertically, 2=horizontally, 3=both:';
    if (wizard) {
        let c = await yn_function(prmpt, choices, '\0', true);
        if (c && c !== '\0' && choices.includes(c)) {
            c = c.charCodeAt(0) - 48;
            if (!c)
                await flip_level_rnd(3, true);
            else
                await flip_level(c, true);
            await docrt();
        } else {
            await pline('Never mind.');
        }
    }
    return ECMD_OK;
}

/* C wizcmds.c:203 wiz_genesis — returns ECMD_OK (no turn) either way. */
export async function wiz_genesis() {
    const g = game;
    /* `wizard` is a FUNCTION (js/gstate.js:19 — C's `wizard` is the macro
     * flags.debug, and a plain property would be a field nothing writes), so
     * the bare `if (wizard)` this used to read was ALWAYS TRUE and the else arm
     * was dead.  fn-truthy-lint's HARD class. */
    if (wizard()) {
        /* C wizcmds.c:206-210 — iflags.debug_mongen is saved/cleared/restored
           around the call. */
        if (!g.iflags) g.iflags = {};
        const mongen_saved = g.iflags.debug_mongen;
        g.iflags.debug_mongen = false;
        await create_particular();
        g.iflags.debug_mongen = mongen_saved;
    } else {
        /* C wizcmds.c:212 pline(unavailcmd, ecname_from_fn(wiz_genesis)) —
         * ef_txt, with no leading '#'. */
        await pline('Unavailable command \'wizgenesis\'.');
    }

    /* C: this handler returns ECMD_OK on every path; rhack() maps it. */
    return ECMD_OK;
}

/* C wizcmds.c:229 wiz_detect — #wizdetect: findit() in wizard mode.
 * Returns ECMD_OK on both arms (no turn). */
export async function wiz_detect() {
    if (wizard()) {
        await findit();
    } else {
        await pline('Unavailable command \'wizdetect\'.');
    }
    return ECMD_OK;
}

import { ROWNO, COULD_SEE, IN_SIGHT, TEMP_LIT, IS_WALL, IS_ROOM, IS_DOOR,
         SDOOR, CORR, WM_MASK, u_at } from './const.js';
import { create_particular } from './read.js'; // relocate-fns
import { rumor_fgets, rumor_file_open } from './display.js'; // relocate-fns
import { xcrypt } from './hacklib.js'; // relocate-fns
import monAcPack from './makemon_ac.json' with { type: 'json' }; // relocate-fns
import monMattkPack from './makemon_mattk.json' with { type: 'json' }; // relocate-fns
import monPmnamesPack from './makemon_pmnames.json' with { type: 'json' }; // relocate-fns
import { init_rumors, others_check } from './rumors.js'; // relocate-fns
import { getlin } from './windows.js'; // relocate-fns
import { makemap_prepost } from './cmd.js'; // relocate-fns
import { mstrength } from './mondata.js'; // relocate-fns
import { impossible } from './pline.js'; // relocate-fns
import { does_block, get_viz_clear } from './vision.js'; // relocate-fns
import { INV_ORDER, MAGIC_PORTAL, PICKINV_CLASS_HEADER, TTY_MENU_ROWS, Warn_of_mon_prop, _Blind_cmd, _invlet_constant, _observe_in_qsort_order, _on_W_tower_level, _pd_br_string, _pd_chr_u_on_lvl, _pd_depth, _pickinv_item_text, _sortloot_within_class, create_nhwindow, destroy_nhwindow, display_nhwindow, incr_itimeout_prop, putstr, set_cursor } from './cmd.js';
import { pooleffects } from './hack.js';
import { fully_identify_obj, invletter_value, prinv } from './invent.js';
import { level_tele } from './teleport.js'; // relocate-fns
import { visctrl as _binds_visctrl } from './cmd_binds.js';
import { cmd_from_func as _binding_cmd_from_func } from './cmd.js'; // relocate-fns
import { build_window_screen, menu_search_case } from './com_pager.js'; // relocate-fns
import { BLINDED, CONFUSION, DEAF, FIRE_RES, FLYING, GLIB, HALLUC, HALLUC_RES, In_endgame, In_sokoban, Is_earthlevel, Is_firelevel as Is_firelevel_cmd, Is_knox_level, LEVITATION, PICK_NONE, PROT_FROM_SHAPE_CHANGERS, RIGHT_HANDED, SICK, SICK_NONVOMITABLE, SICK_VOMITABLE, SLIMED, STONE, STONED, STUNNED, TIMEOUT, VOMITING, WARN_OF_MON, WWALKING, gs } from './const.js'; // relocate-fns
import { capture_painted_frame_with_status, docorner_blank_utf8_captures, force_more_pages, map_engraving, map_trap, menu_entry_page } from './display.js';
import { wizcustom_glyphids } from './glyphs.js'; // relocate-fns
import { def_oc_syms_chars } from './drawing.js'; // relocate-fns
import { Invocation_lev as Invocation_lev_dgn, at_dgn_entrance, on_level, print_branch } from './dungeon.js'; // relocate-fns
import { may_dig } from './hack.js'; // relocate-fns
import { identify_pack } from './invent.js'; // relocate-fns
import { sp_levchn_lookup } from './mklev.js'; // relocate-fns
import { rescham } from './mon.js'; // relocate-fns
import { makeplural as makeplural_objnam, not_fully_identified } from './objnam.js'; // relocate-fns
import { map_menu_cmd } from './options.js'; // relocate-fns
import { PM_GRID_BUG } from './pm.generated.js'; // relocate-fns
import { float_vs_flight } from './polyself.js'; // relocate-fns
import { make_deaf, make_glib, make_hallucinated, make_sick, make_slimed, make_stoned, make_stunned, make_vomiting } from './potion.js'; // relocate-fns
import { do_mapping } from './detect.js'; // relocate-fns
import { TtyMenu, menu_heading_text } from './tty_menu.js'; // relocate-fns
import { get_feature_notice_ver } from './version.js'; // relocate-fns
import { make_blinded } from './zap.js'; // relocate-fns
import { makewish } from './zap.js'; // relocate-fns
export { makewish } from './zap.js'; // relocate-fns
export { OBJ_INVENT_WIZ }; // relocate-fns
export { makemap_prepost } from './cmd.js'; // relocate-fns
export { getlin } from './windows.js'; // relocate-fns

/* C wizcmds.c:575 wiz_show_seenv() — #wizseenv.  Each seenv value takes two
 * characters, so the display is centred on the hero.  NHW_TEXT: no turn, no
 * RNG. */
export async function wiz_show_seenv() {
    const u = game.u;
    const lines = [];
    let startx = Math.max(1, u.ux - Math.trunc(COLNO / 4));
    const stopx = Math.min(startx + Math.trunc(COLNO / 2), COLNO);
    /* can't have a line exactly 80 chars long */
    if (stopx - startx === Math.trunc(COLNO / 2))
        startx++;
    for (let y = 0; y < ROWNO; y++) {
        let row = '';
        for (let x = startx; x < stopx; x++) {
            if (u_at(x, y)) {
                row += '@@';
            } else {
                const v = (game.level.at(x, y)?.seenv | 0) & 0xff;
                row += (v === 0) ? '  ' : v.toString(16).padStart(2, '0');
            }
        }
        /* remove trailing spaces */
        lines.push(row.replace(/ +$/, ''));
    }
    await display_text_window(lines);
    return ECMD_OK;
}

/* C wizcmds.c:620 wiz_show_vision() — #vision. */
export async function wiz_show_vision() {
    const lines = [];
    lines.push(`Flags: 0x${COULD_SEE.toString(16)} could see, 0x${IN_SIGHT.toString(16)} in sight, 0x${TEMP_LIT.toString(16)} temp lit`);
    lines.push('');
    for (let y = 0; y < ROWNO; y++) {
        let row = '';
        for (let x = 1; x < COLNO; x++) {
            if (u_at(x, y)) {
                row += '@';
            } else {
                const v = game.viz_array?.[y]?.[x] | 0;
                row += (v === 0) ? ' ' : String.fromCharCode(48 + v);
            }
        }
        lines.push(row.replace(/ +$/, ''));
    }
    await display_text_window(lines);
    return ECMD_OK;
}

/* C wizcmds.c:656 wiz_show_wmodes() — #wmode. */
export async function wiz_show_wmodes() {
    const lines = [];
    lines.push(''); /* WINDOWPORT(tty) only: blank top line */
    for (let y = 0; y < ROWNO; y++) {
        let row = '';
        for (let x = 0; x < COLNO; x++) {
            const lev = game.level.at(x, y);
            if (u_at(x, y))
                row += '@';
            else if (IS_WALL(lev.typ) || lev.typ === SDOOR)
                row += String.fromCharCode(48 + ((lev.wall_info | 0) & WM_MASK));
            else if (lev.typ === CORR)
                row += '#';
            else if (IS_ROOM(lev.typ) || IS_DOOR(lev.typ))
                row += '.';
            else
                row += 'x';
        }
        lines.push(row.slice(1));
    }
    await display_text_window(lines);
    return ECMD_OK;
}




/* C ref: wizcmds.c:155-171 wiz_makemap(void) — #wizmakemap: discard the
 * current level and replace it with a freshly generated one. */
export async function wiz_makemap() {
    if (wizard()) {
        const wasW = (await import('./dochug.js')).In_W_tower_wz(game.u.ux | 0, game.u.uy | 0, game.u.uz);
        /* C's physical screen keeps the OLD map until makemap_prepost(FALSE)'s
         * cls(): a pline raised while the old level is torn down (e.g. "The
         * long sword named Sunsword ... stops shining.") is paged over it.
         * Keep that paint until cls(), but stage intervening show_glyph updates:
         * C pline.c:266-276 recalculates vision and flushes gbuf before putmesg;
         * display.c:2220 suppresses those flushes only during mklev/save/restore. */
        const frame = (await import('./display.js')).capture_painted_frame();
        if (frame) frame.liveGbuf = true;
        game._levelgenPaintFreeze = frame;
        try {
            await makemap_prepost(true, wasW);
            await (await import('./mklev.js')).mklev();
            await makemap_prepost(false, wasW);
        } finally {
            game._levelgenPaintFreeze = null;
        }
    } else {
        await pline('Unavailable command \'wizmakemap\'.');
    }
    return ECMD_OK;
}






/* C ref: wizcmds.c:1832-1868 wiz_objprobs(void) — #wizobjprobs: an NHW_TEXT
 * window listing each object's oc_prob against its class total; no turn, no RNG. */
export async function wiz_objprobs() {
    const NUM_OBJECTS = 481;
    const probsum = new Array(18).fill(0);
    for (let otyp = FIRST_OBJECT; otyp < NUM_OBJECTS; otyp++)
        probsum[MKOBJ_OC_CLASS[otyp]] += MKOBJ_OC_PROB[otyp];
    const lines = [];
    let oclass = MKOBJ_OC_CLASS[FIRST_OBJECT];
    for (let otyp = FIRST_OBJECT; otyp < NUM_OBJECTS; otyp++) {
        if (!OC_NAME[otyp])
            continue;
        if (MKOBJ_OC_CLASS[otyp] !== oclass)
            lines.push('');
        oclass = MKOBJ_OC_CLASS[otyp];
        const prob = MKOBJ_OC_PROB[otyp];
        /* %6.2f of a float (single-precision) quotient */
        const pct = Math.fround(Math.fround(prob * 100) / probsum[oclass]).toFixed(2);
        lines.push(`${String(prob).padStart(4)} / ${String(probsum[oclass]).padStart(4)} (${pct.padStart(6)}%): ${otyp === 285 ? 'fruit' : OC_NAME[otyp]}`);
    }
    await display_text_window(lines);
    return ECMD_OK;
}

/* C ref: wizcmds.c:351-372 wiz_load_lua(void) — #wizloadlua: load and
 * execute an arbitrary lua file. */
export async function wiz_load_lua() {
    if (wizard()) {
        let buf = await getlin('Load which lua file?');
        if (buf === '' || buf[0] === '\x1b')
            return ECMD_CANCEL;
        if (!buf.includes('.'))
            buf += '.lua';
        const sp = await import('./sp_lev.js');
        await sp.load_lua(buf);
    } else {
        await pline('Unavailable command \'wizloadlua\'.');
    }
    return ECMD_OK;
}

/* C ref: wizcmds.c:376-395 wiz_load_splua(void) — #wizloaddes: load a special
 * level lua file onto the current level. */
export async function wiz_load_splua() {
    if (wizard()) {
        let buf = await getlin('Load which des lua file?');
        if (buf === '' || buf[0] === '\x1b')
            return ECMD_CANCEL;
        if (!buf.includes('.'))
            buf += '.lua';
        const sp = await import('./sp_lev.js');
        /* C's gbuf is global and survives clear_level_structures(); nothing
         * repaints the map until makemap_prepost(FALSE)'s docrt(), so a pline
         * raised by load_special/fixup_special (e.g. "Couldn't place lregion
         * type 2!--More--") is drawn over the OLD map.  Freeze the paint on
         * the pre-reset frame until makemap_prepost's cls() releases it. */
        const frame = (await import('./display.js')).capture_painted_frame();
        if (frame) frame.liveGbuf = true;
        game._levelgenPaintFreeze = frame;
        try {
            await sp.lspo_reset_level();
            await sp.load_special(buf);
            await sp.lspo_finalize_level();
        } finally {
            game._levelgenPaintFreeze = null;
        }
    } else {
        await pline('Unavailable command \'wizloaddes\'.');
    }
    return ECMD_OK;
}

/* C wizcmds.c:1873-1941; DEBUG_MIGRATING_MONS is enabled by config.h. */
export async function wiz_migrate_mons() {
    const g = game;
    const uz = g.u.uz;
    const dun = g.dungeons?.[uz.dnum];
    let tolevel;
    if (Is_stronghold(uz)) tolevel = { dnum: g.valley_level.dnum, dlevel: g.valley_level.dlevel };
    else if (!Is_botlevel(uz)) tolevel = get_level((dun ? dun.depth_start : 1) + uz.dlevel - 1 + 1);
    else tolevel = { dnum: 0, dlevel: 0 };

    let here = 0, nxtlv = 0, other = 0;
    for (let m = g.migrating_mons; m; m = m.nmon) {
        if (m.mux === uz.dnum && m.muy === uz.dlevel) ++here;
        else if (m.mux === tolevel.dnum && m.muy === tolevel.dlevel) ++nxtlv;
        else ++other;
    }
    const plural = n => (n === 1 ? '' : 's');
    if (here + nxtlv + other === 0) {
        await pline('No monsters currently migrating.');
    } else {
        await pline('%d mon%s pending for current level, %d for next level, %d for others.',
            here, plural(here), nxtlv, other);
        let prmpt = '', xtra = '';
        if (here) prmpt += 'c'; else xtra += 'c';
        if (nxtlv) prmpt += 'n'; else xtra += 'n';
        if (other) prmpt += 'o'; else xtra += 'o';
        prmpt += 'a q';
        if (xtra) prmpt += '\x1b' + xtra;
        const choice = await yn_function('List which?', prmpt, 'q', true);
        await display_migrating_mons(choice, tolevel);
    }

    let inbuf = '';
    if (tolevel.dnum || tolevel.dlevel) {
        inbuf = await getlin('How many random monsters to migrate to next level? [0]');
    } else {
        await pline("Can't get there from here.");
    }
    if (!inbuf || inbuf[0] === '\x1b') return ECMD_OK;
    /* C atoi() = (int) strtol(): a 64-bit long that saturates on
       overflow, then truncated to int (so "4294967297" is 1). */
    const m = /^[ \t\n\v\f\r]*([+-]?\d+)/.exec(inbuf);
    let lval = m ? BigInt(m[1]) : 0n;
    if (lval > 0x7fffffffffffffffn) lval = 0x7fffffffffffffffn;
    else if (lval < -0x8000000000000000n) lval = -0x8000000000000000n;
    let mcount = Number(BigInt.asIntN(32, lval));
    let use_random_mon = true;
    if (mcount < 0) {
        use_random_mon = false;
        mcount = Math.imul(mcount, -1); /* INT_MIN stays INT_MIN */
    }
    if (mcount < 1) mcount = 0;
    else if (mcount > (COLNO - 1) * ROWNO) mcount = (COLNO - 1) * ROWNO;
    const mongen_saved = g.iflags.debug_mongen;
    g.iflags.debug_mongen = false;
    for (; mcount > 0; --mcount) {
        const mon = !use_random_mon ? g.fmon : await makemon(rndmonst(), 0, 0, MM_NOMSG);
        if (mon) await migrate_to_level(mon,
            tolevel.dlevel + g.dungeons[tolevel.dnum].ledger_start, MIGR_RANDOM, null);
    }
    g.iflags.debug_mongen = mongen_saved;
    return ECMD_OK;
}

/* C wizcmds.c:533 wiz_panic() — #panic command - test program's panic
 * handling.  ECMD_OK on every path that returns: no turn, no RNG. */
export async function wiz_panic() {
    if (game.iflags?.debug_fuzzer) {
        game.u.uhp = game.u.uhpmax = 1000;
        game.u.uen = game.u.uenmax = 1000;
        return ECMD_OK;
    }
    if (await paranoid_query(true,
                             "Do you want to call panic() and end your game?"))
        await panic("Crash test (#panic).");
    return ECMD_OK;
}

const rumor6 = (n) => String(n).padStart(6, '0');

const rumor6x = (n) => n.toString(16).padStart(6, '0');

export async function wiz_rumor_check() {
    const out = [];
    /* C rumors.c:205-292: a failed open is reported once; failed init and
       subsequent checks still show the other three files after a --More--. */
    const failed = (game.true_rumor_size ?? 0) < 0;
    const file = failed ? null : await rumor_file_open();
    if (file && ((game.true_rumor_size ?? 0) !== 0 || init_rumors(file))) {
        const tStart = game.true_rumor_start, tEnd = game.true_rumor_end;
        const fStart = game.false_rumor_start, fEnd = game.false_rumor_end;
        out.push(`T start=${rumor6(tStart)} (${rumor6x(tStart)}), end=${rumor6(tEnd)} (${rumor6x(tEnd)}), size=${rumor6(game.true_rumor_size)} (${rumor6x(game.true_rumor_size)})`);
        out.push(`F start=${rumor6(fStart)} (${rumor6x(fStart)}), end=${rumor6(fEnd)} (${rumor6x(fEnd)}), size=${rumor6(game.false_rumor_size)} (${rumor6x(game.false_rumor_size)})`);
        for (const [label, start, end] of [['T', tStart, tEnd], ['F', fStart, fEnd]]) {
            file.pos = start;
            let line = rumor_fgets(file) || '';
            out.push(`${label} ${rumor6(start)} ${xcrypt(line.split('\n', 1)[0])}`);
            let next;
            while ((next = rumor_fgets(file)) !== null) {
                line = next;
                if (file.pos >= end) break;
            }
            out.push(`  ${''.padStart(6)} ${xcrypt(line.split('\n', 1)[0])}`);
        }
    } else if (failed || file) {
        await pline('rumors not accessible.');
        await force_more(game._pending_message); /* WIN_MESSAGE, TRUE */
    }
    await others_check('Engravings:', 'engrave', out);
    await others_check('Epitaphs:', 'epitaph', out);
    await others_check('Bogus monsters:', 'bogusmon', out);
    await display_text_window(out);
    return ECMD_OK;
}



/* C wizcmds.c:1790 wiz_mon_diff() — #wizmondiff; NHW_TEXT, ECMD_OK, no turn/RNG. */
export async function wiz_mon_diff() {
    const out = [];
    let trouble = 0;
    const rows = monsPack.mons;
    for (let cnt = 0; cnt < rows.length; cnt++) {
        const mcalculated = mstrength(cnt);
        const mhardcoded = rows[cnt][2];
        const mdiff = mhardcoded - mcalculated;
        if (mdiff) {
            if (!trouble++)
                out.push("Review of monster difficulty ratings [index:level]:");
            let mlev = rows[cnt][1];
            if (mlev > 50) /* hack for named demons */
                mlev = 50;
            out.push(`${monPmnamesPack.pmnames[cnt][2].padEnd(18)} [${String(cnt).padStart(3)}:${String(mlev).padStart(2)}]: calculated: ${String(mcalculated).padStart(2)}, hardcoded: ${String(mhardcoded).padStart(2)} (${mdiff > 0 ? '+' : ''}${mdiff})`);
        }
    }
    if (!trouble)
        out.push("No monster difficulty discrepancies were detected.");
    await display_text_window(out);
    return ECMD_OK;
}

// C ref: wizcmds.c:1449-1458 levl_sanity_check()
export async function levl_sanity_check() {
    if (game.u.uinwater) return; /* Underwater uses different vision */
    for (let y = 0; y < ROWNO; y++) {
        for (let x = 1; x < COLNO; x++) {
            if ((does_block(x, y) ? 1 : 0) !== (get_viz_clear(x, y) ? 1 : 0))
                await impossible('levl[%i][%i] vision blocking', x, y);
        }
    }
}

/* C ref: invent.c:3078 `static struct obj wizid_fakeobj;` — the sentinel the
 * wizid menu's '_' entry carries in any.a_obj, distinguishing "identify
 * everything" (identify_pack) from a specific item (identify). */
const WIZID_ALL = { _wizid_fakeobj: true };

// ── C ref: wizcmds.c:49 wiz_identify() — the #wizidentify command. ────────────
//
//   if (wizard) {
//       iflags.override_ID = (int) cmd_from_func(wiz_identify);
//       if (!iflags.override_ID) iflags.override_ID = C('I');
//       (void) display_inventory((char *) 0, FALSE);
//       iflags.override_ID = 0;
//   } else
//       pline(unavailcmd, ecname_from_fn(wiz_identify));
//   return ECMD_OK;
//
// override_ID being non-zero is what makes display_pickinv() take its `wizid`
// arm (invent.c:3221-3252): the menu's title line is "Debug Identify", its
// entries are the NOT-fully-identified items only (invent.c:3274 — `if (wizid
// && !not_fully_identified(otmp)) continue`), and when there is nothing left to
// identify the whole window is
//       Debug Identify
//       (all items are permanently identified already)
// plus the "(end)" footer.  RNG-free throughout.
//
// arm in doextcmd's dispatch chain, so JS painted the bare map there.
export async function wiz_identify() {
    const g = game;
    if (!(g.flags && g.flags.debug)) {
        /* C cmd.c:157 unavailcmd = "Unavailable command '%s'.", filled from
         * ecname_from_fn(wiz_identify) = ef_txt, which has NO leading '#'. */
        await pline("Unavailable command 'wizidentify'.");
        return ECMD_OK;
    }
    g.iflags = g.iflags || {};
    const _savedOverrideID = g.iflags.override_ID;
    g.iflags.override_ID = _binding_cmd_from_func('wiz_identify') || 9; /* C('I') */
    try {
    const items = [];
    for (let o = g.invent; o; o = o.nobj)
        items.push(o);
    /* C invent.c:3136-3143 — n == 0 (empty pack) exits before any window is
     * built: pline("%s.", not_carrying_anything); return 0. */
    if (!items.length) {
        await pline('Not carrying anything.');
        return ECMD_OK;
    }
    /* C invent.c:3146-3147 display_pickinv(): `if (!flags.invlet_constant)
     * reassign();` -- re-letter the pack before the menu is built. */
    if (!_invlet_constant()) reassign();
    /* C invent.c:3207 — display_pickinv sorts the whole pack (filter is null for
     * wizid; not_fully_identified is applied per object at invent.c:3274), and
     * sortloot_cmp's loot_classify() runs `if (!Blind) observe_object(obj)`
     * (invent.c:170) on every compared object, setting dknown (e.g. on water
     * whose otyp trap.c:4832 just reset it) before the filter looks. */
    // Full sorting below performs classification and naming once (invent.c:3207).
    if (g.flags.sortloot !== 'i' && g.flags.sortloot !== 'f' && g.flags.sortpack !== false
        && !_Blind_cmd() && items.length > 1) {
        _observe_in_qsort_order(items);
    }
    /* C invent.c:3176-3207: full sorting uses SORTLOOT_LOOT even without
     * sortpack, and sorts the whole inventory before the wizid filter. */
    let sortedItems = items;
    if (g.flags.sortloot === 'f')
        sortedItems = _sortloot_within_class(items, null);
    const unid = sortedItems.filter((o) => not_fully_identified(o));
    if (unid.length) {
        const PLUR = unid.length > 1 ? 's' : '';
        const windowLines = [
            `Debug Identify -- unidentified or partially identified item${PLUR}`,
        ];
        /* C invent.c:3244-3250 — the '_' entry.  iflags.override_ID carries the
         * ^I accelerator wiz_identify stuffed into it; visctrl(C('I')) is "^I".
         * MENU_ITEMFLAGS_SKIPINVERT only affects the highlight, not the text. */
        let sel = `select ${unid.length === 1 ? 'it' : 'any or all of them'}`
                + ' to permanently identify';
        if (unid.length > 1)
            sel += ` (${_binds_visctrl(g.iflags.override_ID)} for all)`;
        windowLines.push(`_ - ${sel}`);
        /* selection payload per rendered line; null for headings/title. */
        const lineObj = [null, WIZID_ALL];
        const wizGlyph = new Map();
        const hand = (g.u?.uhandedness === RIGHT_HANDED) ? 'right' : 'left';
        /* C invent.c:3274 `if (wizid && !not_fully_identified(otmp)) continue;`
         * — only unidentified items are listed, but the class walk is the same
         * flags.inv_order one every other menu in this file uses. */
        /* C invent.c:3176,3289-3299: !sortpack omits class headings;
         * sortloot:full still retains the description order computed above. */
        const flatWiz = g.flags?.sortpack === false;
        /* C invent.c:3071,3334-3339: configured pack order, then venom. */
        const wizClasses = flatWiz ? [-1] : (g.flags?.inv_order || INV_ORDER).concat(17);
        for (const oclass of wizClasses) {
            const group = flatWiz
                ? (g.flags.sortloot === 'f' ? unid : unid.slice().sort((x, y) =>
                    invletter_value(x.invlet | 0) - invletter_value(y.invlet | 0)))
                : unid.filter((it) => (it.oclass | 0) === oclass);
            if (!group.length) continue;
            if (!flatWiz)
            windowLines.push(menu_heading_text(PICKINV_CLASS_HEADER[oclass]));
            if (!flatWiz)
            lineObj.push(null);
            for (const obj of group) {
                const og = {};
                let txt = await _pickinv_item_text(obj, hand, false, og);
                /* C wintty.c:1383-1390,1475-1483 show_obj_syms: the object
                 * glyph replaces the "-" separator; menu_objsyms:conditional
                 * (bit 4) suppresses it when the menu has class headings. */
                if (g.iflags?.use_menu_glyphs
                    && (!((g.iflags.menuobjsyms | 0) & 4) || flatWiz)) {
                    const gc = g.iflags?.use_color === false ? 8 : og.color | 0;
                    const sym = og.ch;
                    const symTxt = gc === 0 ? `\x1b[${(g.iflags?.wc2_darkgray ?? true) ? 90 : 34}m${sym}\x1b[39m`
                        : (gc >= 1 && gc <= 6) ? `\x1b[${30 + gc}m${sym}\x1b[39m`
                        : (gc >= 9 && gc <= 15) ? `\x1b[${90 + gc - 8}m${sym}\x1b[39m` : sym;
                    wizGlyph.set(obj, symTxt);
                    txt = txt.replace(/^(.) - /, (_m, c) => `${c} ${symTxt} `);
                }
                windowLines.push(txt);
                lineObj.push(obj);
            }
        }
        /* C wintty.c:1921-1922: select_menu's display_nhwindow pages a pline
         * raised while the entries were formatted (doname's objnam.c:129
         * "PREFIX too short") before the menu is drawn. */
        await menu_entry_page();
        /* C wintty.c tty_end_menu/process_menu_window — a menu with more than
         * rows-1 lines is multi-page: it goes full-screen (offx = 0, cleared
         * screen per page) with a "(n of N)" footer, instead of the right-aligned
         * overlay.  Selectors are the objects' own invlets (add_menu's ch). */
        /* wintty.c:1925-1928 — `!iflags.menu_overlay` forces the same offx 0,
         * cleared-screen window however short the menu is. */
        const wizNoOverlay = g.iflags?.menu_overlay === false || g.iflags?.menu_overlay === 0;
        /* wintty.c:1924 — single page maxrow = nitems + 1 ("(end)" row), so a
         * menu of rows-1 lines already satisfies maxrow >= rows. */
        const wizMaxLen = Math.max(...windowLines.map((ln) =>
            ln.replace(/\x1b\[[0-9;]*m/g, '').length), '(end)'.length);
        if (wizNoOverlay || windowLines.length + 1 >= TTY_MENU_ROWS || 78 - wizMaxLen <= 1) {
            const stripSgr = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');
            const plist = windowLines.map((ln, i) => {
                const o = lineObj[i];
                if (!o) return { str: stripSgr(ln), selectable: false, inverse: i > 0 };
                return { str: ln.slice(4 + (wizGlyph.has(o) ? wizGlyph.get(o).length - 1 : 0)), glyphTxt: wizGlyph.get(o), selectable: true,
                         selector: ln[0], groupacc: o === WIZID_ALL ? String.fromCharCode(g.iflags.override_ID) : def_oc_syms_chars[o.oclass], payload: o };
            });
            const picked = await tty_menu_pick_any(plist, '', { noPrompt: true });
            /* windows.c:1859-1863 keeps bot disabled during select_menu's
             * dismissal; wintty.c:978-979 redraws AND flushes the map, and the
             * first bot() after it (BL_RESET) rewrites status row 1 whole —
             * same sequence as wiz_intrinsic. */
            {
                const savedBotDisabled = g._bot_disabled;
                g._bot_disabled = true;
                try {
                    await docrt();
                    await flush_screen(1);
                } finally { g._bot_disabled = savedBotDisabled; }
                g._status1WholeNext = true;
                g._r1botAfterMap = g.level;
            }
            if (picked && picked.length) {
                g.iflags.override_ID = 0;
                const sel = new Set(picked.map((p) => p.item.payload));
                /* C invent.c:3393-3405 walks selected[] in menu order
                 * (tty_select_menu returns cw->mlist order), not pack order. */
                for (const o of lineObj) {
                    if (!o || !sel.has(o)) continue;
                    if (o === WIZID_ALL) {
                        await identify_pack(0, false);
                        break;
                    }
                    if (not_fully_identified(o)) {
                        fully_identify_obj(o);
                        await prinv(null, o, 0);
                    }
                }
            }
            g._pending_message = g._pending_message || '';
            await flush_screen(1);
            return ECMD_OK;
        }
        windowLines.push('(end)');
        lineObj.push(null);
        const uacW = g.u?.uac ?? 0;
        const maxLenW = windowLines.reduce((mx, ln) =>
            Math.max(mx, ln.replace(/\x1b\[[0-9;]*m/g, '').length), 0);
        const WIN_COL_W = Math.min(41, 78 - maxLenW);
        const endRowW = windowLines.length - 1;
        const endCursorColW = WIN_COL_W + 5 + 1; /* WIN_COL + len("(end)") + 1 */
        /* C wintty.c set_item_state() — '-' unselected, '+' selected (a count
         * would make it '#'; nothing in this menu attaches one). */
        const selected = new Set();
        /* C ref: win/tty/getline.c:213 — tty_getlin's closing
         * clear_nhwindow(WIN_MESSAGE) blanks the WHOLE of screen row 0,
         * including the window's own title text at column WIN_COL, and
         * process_menu_window only repaints a page when page_start is reset,
         * so within ONE select_menu() call the title never comes back. */
        let titleErased = false;
        const frameRows = () => {
            const rows = windowLines.slice();
            for (let i = 0; i < lineObj.length; i++) {
                const o = lineObj[i];
                if (o && selected.has(o))
                    rows[i] = wizGlyph.has(o)
                        ? rows[i].replace(` ${wizGlyph.get(o)} `, ' + ')
                        : rows[i].replace(' - ', ' + ');
            }
            if (titleErased) rows[0] = '';
            return build_window_screen(rows, WIN_COL_W, uacW).split('\n');
        };
        const repaint = () => {
            g._screen_output = frameRows().join('\n');
            set_cursor(endCursorColW, endRowW);
        };
        const accel = new Map();          /* keycode -> payload */
        accel.set(0x5f /* '_' */, WIZID_ALL);
        accel.set(g.iflags.override_ID /* visctrl'd group accelerator */, WIZID_ALL);
        for (const o of unid) accel.set(o.invlet | 0, o);
        /* C ref: wintty.c:2596-2600 tty_add_menu — a selectable entry's stored
         * str is "%c - %s", which is what MENU_SEARCH's pmatchi() matches
         * against (wintty.c:1714).  lineObj[] already marks which rendered rows
         * are selectable, and those rows ARE that string. */
        const mlist = [];
        for (let i = 0; i < lineObj.length; i++)
            if (lineObj[i]) mlist.push({ str: windowLines[i], payload: lineObj[i] });
        let cancelled = false;
        for (;;) {
            repaint();
            const raw = await nhgetch();
            const k = typeof raw === 'number' ? raw : (raw?.charCodeAt(0) ?? 0);
            if (k === 27) { g._ttyDismissMore = 1; cancelled = true; break; }  /* ESC — n = -1 */
            if (k === 32 || k === 10 || k === 13) break;      /* single page: done */
            /* C wintty.c:1650-1699: PAGE and ALL affect the same entries
             * in this single-page menu.  The fake all-items row carries
             * SKIPINVERT (invent.c:3250); windows.c:1562 governs bulk changes. */
            const bulk = k === 46 || k === 44 ? 'select'
                : k === 45 || k === 92 ? 'unselect'
                : k === 64 || k === 126 ? 'invert' : null;
            if (bulk) {
                for (const o of lineObj) {
                    if (!o) continue;
                    const mode = g.iflags.menuinvertmode ?? 1;
                    if (o === WIZID_ALL && (mode === 2
                        || (mode === 1 && !selected.has(o)))) continue;
                    if (bulk === 'select') selected.add(o);
                    else if (bulk === 'unselect' || selected.has(o)) selected.delete(o);
                    else selected.add(o);
                }
                continue;
            }
            // invent.c:3321-3327; wintty.c:1739-1747: class keys invert the group.
            const group = unid.filter(o => def_oc_syms_chars[o.oclass]?.charCodeAt(0) === k);
            if (!accel.has(k) && group.length) {
                for (const o of group) {
                    if (selected.has(o)) selected.delete(o); else selected.add(o);
                }
                continue;
            }
            const payload = accel.get(k);
            if (payload) {
                if (selected.has(payload)) selected.delete(payload);
                else selected.add(payload);
                continue;
            }
            if (k === 58 /* ':' MENU_SEARCH */) {
                /* C ref: wintty.c:1700-1730.  PICK_ANY, so every match toggles
                 * and the menu stays up. */
                await menu_search_case('ANY', mlist, frameRows, (curr) => {
                    if (selected.has(curr.payload)) selected.delete(curr.payload);
                    else selected.add(curr.payload);
                });
                titleErased = true;
                continue;
            }
        }
        /* wintty.c:982: select_menu dismisses the corner before identification. */
        docorner_blank_utf8_captures(WIN_COL_W - 1, windowLines.length + 1);
        /* C invent.c:3383-3407 — with n > 0 and wizid: override_ID is cleared
         * first (so the recursive perm_invent redraw does not re-filter), then
         * the fake "all" object runs identify_pack(0, FALSE) and any other
         * selection runs identify(otmp) == fully_identify_obj + prinv. */
        if (!cancelled && selected.size) {
            /* C invent.c:3389 — "identifying items will update perm_invent,
             * calling this routine recursively, and we don't want the nested
             * call to filter on unID'd items": override_ID is cleared BEFORE
             * identify_pack/identify, so the prinv line those print is named
             * with the object's real knowledge flags. */
            g.iflags.override_ID = 0;
            /* C invent.c:3393-3405 walks selected[] in menu order
             * (tty_select_menu returns cw->mlist order), not pack order. */
            for (const o of lineObj) {
                if (!o || !selected.has(o)) continue;
                if (o === WIZID_ALL) {
                    await identify_pack(0, false);
                    break;
                }
                if (not_fully_identified(o)) {
                    fully_identify_obj(o);
                    await prinv(null, o, 0);
                }
            }
        }
        /* After dismiss: erase the window back to the map-only view (docorner). */
        g._pending_message = g._pending_message || '';
        await flush_screen(1);
        return ECMD_OK;
    }
    /* C invent.c:3227-3236 — Sprintf(prompt, "Debug Identify") with no
     * " -- unidentified..." suffix (unid_cnt == 0), then the one add_menu_str. */
    const windowLines = [
        'Debug Identify',
        '(all items are permanently identified already)',
    ];
    windowLines.push('(end)');
    const maxLen = windowLines.reduce((max, ln) =>
        Math.max(max, ln.replace(/\x1b\[[0-9;]*m/g, '').length), 0);
    const WIN_COL = 80 - maxLen - 2;
    const endRow = windowLines.length - 1;
    const endCursorCol = WIN_COL + 5 + 1; /* WIN_COL + len("(end)") + 1 */
    /* C ref: getline.c:213 — a MENU_SEARCH's tty_getlin ends with
     * clear_nhwindow(WIN_MESSAGE), which blanks screen row 0 for the rest of
     * this select_menu() call (the page is not repainted). */
    let titleErased = false;
    const frameRows = () =>
        build_window_screen(titleErased ? ['', ...windowLines.slice(1)] : windowLines,
                            WIN_COL, g.u?.uac ?? 0).split('\n');
    const repaint = () => {
        g._screen_output = frameRows().join('\n');
        set_cursor(endCursorCol, endRow);
    };
    repaint();
    /* C: select_menu(win, PICK_ANY, &selected).  The window has no selectable
     * entry, so the tty loop ignores everything that is not a paging/dismiss
     * key; ESC cancels, ' ' finishes the (single) page, '\n'/'\r' commit. */
    for (;;) {
        const keyCode = await nhgetch();
        /* C win/tty/getline.c:245-247 — the ESC leaves dismiss_more at 1 for a
         * later --More--, same xwaitforspace(resp) as the selectable branch. */
        if (keyCode === 27)
            g._ttyDismissMore = 1;
        if (keyCode === 27 || keyCode === 32 || keyCode === 10 || keyCode === 13)
            break;
        if (keyCode === 58 /* ':' MENU_SEARCH */) {
            /* C ref: wintty.c:1700-1730 — how is PICK_ANY, not PICK_NONE, so
             * the tty_getlin DOES open even though this window has nothing
             * selectable for pmatchi to find.  The prompt frame is a real,
             * different screen; only the match loop is a no-op. */
            await menu_search_case('ANY', [], frameRows, () => {});
            titleErased = true;
        }
        repaint();
    }
    /* After dismiss: erase the window back to the map-only view (docorner). */
    docorner_blank_utf8_captures(WIN_COL - 1, windowLines.length + 1);
    g._pending_message = '';
    await flush_screen(1);
    } finally {
        /* C ref: wizcmds.c:54 `iflags.override_ID = 0;` — restored on every
         * exit from the command, including the ones this port takes by throw. */
        g.iflags.override_ID = _savedOverrideID ?? 0;
    }
    /* C: this handler returns ECMD_OK on every path; rhack() maps it. */
    return ECMD_OK;
}

async function tty_menu_pick_any(mlist, prompt, opts = {}) {
    const g = game;
    /* C wintty.c tty_end_menu — prompt first, then a blank, then the items.
     * opts.noPrompt: the caller supplies its own title line (add_menu_str) and
     * ended the menu with no prompt, so nothing is prepended. */
    const lines = opts.noPrompt ? [...mlist] : [
        { str: prompt, selectable: false, inverse: true },
        { str: '', selectable: false },
        ...mlist,
    ];
    /* C: lmax = min(52, ttyDisplay->rows - 1); npages = (nitems + lmax-1)/lmax */
    const lmax = Math.min(52, TTY_MENU_ROWS - 1);
    const npages = Math.max(1, Math.ceil(lines.length / lmax));
    /* C: selector letters restart at 'a' on every page and are consumed ONLY by
     * selectable entries ("if (curr->identifier.a_void && !curr->selector)"). */
    let menu_ch = 'a';
    for (let n = 0; n < lines.length; n++) {
        if (n % lmax === 0)
            menu_ch = 'a';
        const it = lines[n];
        if (it.selectable && !it.selector) {
            it.selector = menu_ch;
            menu_ch = (menu_ch === 'z') ? 'A'
                : String.fromCharCode(menu_ch.charCodeAt(0) + 1);
        }
        if (it.selectable) {
            it.selected = !!it.selected;
            if (it.count == null) it.count = -1;
        }
    }
    const pageOf = (p) => lines.slice(p * lmax, (p + 1) * lmax);
    /* C wintty.c set_item_state() — the INCREMENTAL one-character repaint after
     * a toggle: '+' for a plain selection, '#' when a count is attached.  The
     * full-page draw in process_menu_window uses '*' rather than '+' for a
     * plain selection ("all selected: '*' vs count selected: '#'"), so the two
     * paths genuinely differ and the mark has to be per-item state, not a
     * function of `selected` alone. */
    const set_item_state = (it) => {
        it.mark = !it.selected ? '-' : (it.count === -1 ? '+' : '#');
    };
    const draw_item_state = (it) => {
        it.mark = !it.selected ? (it.glyphTxt ?? '-') : (it.count === -1 ? '*' : '#');
    };
    /* C process_menu_window's per-line paint: putchar(' ') then the item's str,
     * with the attribute starting at str[0] for a header/prompt line and at
     * str[4] for a "%c - %s" menu line. */
    const renderLine = (it) => {
        if (!it.selectable) {
            /* tty_end_menu's prompt spacer is an empty tty menu string.  It
             * advances to the next row without painting the leading column;
             * headers and real menu strings do paint that column. */
            if (!it.str)
                return '';
            /* `inverse` marks the end_menu prompt (tty_end_menu, wintty.c:2688,
             * drawn with tty_menu_promptstyle) and add_menu_heading lines
             * (windows.c:1816) — both come from iflags.menu_headings, kept in
             * sync by adjust_menu_promptstyle (allmain.c:728, options.c:5790),
             * so style them with it, not a literal SGR 7.  Byte-identical to
             * \x1b[7m under the default {NO_COLOR, ATR_INVERSE}. */
            return it.inverse ? ` ${menu_heading_text(it.str)}` : ` ${it.str}`;
        }
        return ` ${it.selector} ${it.mark} ${it.str}`;
    };
    /* C ref: getline.c:213 — a MENU_SEARCH's tty_getlin ends with
     * clear_nhwindow(WIN_MESSAGE), which blanks SCREEN row 0.  This menu is
     * full-screen (offx == 0), so screen row 0 is the current page's first
     * item row, and process_menu_window only repaints when page_start is reset
     * — i.e. on a page change, which is what clears the flag below. */
    let titleErased = false;
    const frameRows = (page) => {
        const pageLines = pageOf(page);
        const rows = pageLines.map(renderLine);
        /* C: Sprintf(cw->morestr, "(%d of %d)", curr_page+1, npages) when
         * npages > 1, else "(end) "; dmore() puts it at column 1 of the row
         * just past the last item and leaves the cursor after it. */
        const footer = (npages > 1)
            ? `(${page + 1} of ${npages})` : '(end)';
        rows.push(` ${footer}`);
        if (titleErased) rows[0] = '';
        return { rows, footer };
    };
    const render = (page) => {
        const { rows, footer } = frameRows(page);
        g._screen_output = rows.join('\n');
        /* tty_end_menu: the single-page morestr is "(end) " — trailing blank counts. */
        set_cursor(footer.length + 1 + (npages > 1 ? 0 : 1), rows.length - 1);
        g._pending_message = '';
    };

    let curr_page = 0, need_draw = true;
    let counting = false, count = 0, reset_count = true;
    let finished = false, cancelled = false;
    while (!finished) {
        if (reset_count) { counting = false; count = 0; } else reset_count = true;
        if (need_draw) {
            /* C: `if (!page_start)` — a page change repaints the whole screen
             * (term_clear_screen for a full-screen menu), so a title row a
             * MENU_SEARCH's getlin erased comes back here and nowhere else. */
            titleErased = false;
            for (const it of pageOf(curr_page))
                if (it.selectable) draw_item_state(it);
            need_draw = false;
        }
        render(curr_page);
        const rawRead = await nhgetch();
        const rawch = (rawRead >= 0 && rawRead < 128) ? String.fromCharCode(rawRead) : '';
        const page = pageOf(curr_page);
        /* C: an explicit page selector wins over any mapped menu command
         * (MENU_EXPLICIT_CHOICE), so test the selectors first. */
        const hit = page.find((it) => it.selectable && it.selector === rawch);
        /* C wintty.c toggle_menu_curr() */
        const toggle_menu_curr = (it) => {
            if (it.selected) {
                if (counting && count > 0) it.count = count;
                else { it.selected = false; it.count = -1; }
            } else if (counting && count > 0) {
                it.count = count; it.selected = true;
            } else if (!counting) {
                it.selected = true;
            }
            set_item_state(it);
        };
        if (hit) {
            toggle_menu_curr(hit);
            continue;
        }
        /* C wintty.c:1739-1747: group accelerators invert matching entries
         * across the entire menu, including entries on other pages. */
        const group = lines.filter(it => it.selectable && it.groupacc && it.groupacc === rawch);
        if (group.length) {
            for (const it of group) toggle_menu_curr(it);
            continue;
        }
        /* C wintty.c:1560 — non-explicit keys drive the switch through
         * map_menu_cmd() (BINDINGS alias -> its command's key). */
        const key = map_menu_cmd(rawRead);
        const ch = (key >= 0 && key < 128) ? String.fromCharCode(key) : '';
        if (ch >= '0' && ch <= '9') {
            count = count * 10 + (key - 48);
            if (count !== 0) { counting = true; reset_count = false; }
            continue;
        }
        switch (key) {
        case 27: /* '\033' — cancel from counting, or cancel the menu */
            if (!counting) {
                for (const it of lines)
                    if (it.selectable) { it.selected = false; it.count = -1; }
                cancelled = true;
                finished = true;
            }
            break;
        case 0: case 10: case 13: /* '\0' / '\n' / '\r' — commit */
            finished = true;
            break;
        case 32: /* ' ' — next page, or finish on the last page */
        case 62: /* MENU_NEXT_PAGE '>' — next page only */
            if (curr_page !== npages - 1) { curr_page++; need_draw = true; }
            else if (key === 32) finished = true;
            break;
        case 60: /* MENU_PREVIOUS_PAGE '<' */
            if (curr_page !== 0) { curr_page--; need_draw = true; }
            break;
        case 94: /* MENU_FIRST_PAGE '^' */
            if (curr_page !== 0) { curr_page = 0; need_draw = true; }
            break;
        case 124: /* MENU_LAST_PAGE '|' */
            if (curr_page !== npages - 1) { curr_page = npages - 1; need_draw = true; }
            break;
        case 44: /* MENU_SELECT_PAGE ',' — set_all_on_page */
            for (const it of page)
                if (it.selectable && !it.selected) { it.selected = true; set_item_state(it); }
            break;
        case 92: /* MENU_UNSELECT_PAGE '\\' — unset_all_on_page */
            for (const it of page)
                if (it.selectable && it.selected) { it.selected = false; it.count = -1; set_item_state(it); }
            break;
        case 126: /* MENU_INVERT_PAGE '~' — invert_all_on_page */
            for (const it of page) {
                if (!it.selectable) continue;
                if (it.selected) { it.selected = false; it.count = -1; }
                else it.selected = true;
                set_item_state(it);
            }
            break;
        case 46: /* MENU_SELECT_ALL '.' */
            /* C: set_all_on_page() first (those need screen updating), then the
             * rest of the list with no repaint. */
            for (const it of page)
                if (it.selectable && !it.selected) { it.selected = true; set_item_state(it); }
            for (const it of lines)
                if (it.selectable && !it.selected) it.selected = true;
            break;
        case 45: /* MENU_UNSELECT_ALL '-' */
            for (const it of page)
                if (it.selectable && it.selected) { it.selected = false; it.count = -1; set_item_state(it); }
            for (const it of lines)
                if (it.selectable && it.selected) { it.selected = false; it.count = -1; }
            break;
        case 64: /* MENU_INVERT_ALL '@' */
            for (const it of page) {
                if (!it.selectable) continue;
                if (it.selected) { it.selected = false; it.count = -1; }
                else it.selected = true;
                set_item_state(it);
            }
            for (const it of lines) {
                if (!it.selectable || page.includes(it)) continue;
                if (it.selected) { it.selected = false; it.count = -1; }
                else it.selected = true;
            }
            break;
        case 58: /* MENU_SEARCH ':' */
            /* C ref: wintty.c:1700-1730 — tty_getlin("Search for:", tmpbuf),
             * "*%s*", then pmatchi() over the WHOLE mlist (not just this page)
             * toggling every selectable hit.  This driver is PICK_ANY, so it
             * never finishes early.  What pmatchi sees is what tty_add_menu
             * STORED, "%c - %s" (wintty.c:2596-2600) — the selector and a
             * literal " - ", never the '*'/'+'/'#' the page is drawn with. */
            if (await menu_search_case(
                    'ANY',
                    lines.filter((it) => it.selectable)
                         .map((it) => ({ str: `${it.selector} - ${it.str}`, it })),
                    () => frameRows(curr_page).rows,
                    (curr) => toggle_menu_curr(curr.it)))
                finished = true;
            titleErased = true;
            break;
        default:
            /* C: tty_nhbell() — unacceptable input, screen unchanged.
             * getline.c:250-254 xwaitforspace(resp) swallows a key outside resp
             * inside the wait, so a pending count survives it (reset_count
             * stays FALSE); only keys in resp reach the switch and reset it. */
            if (key !== (g._ttyDismissMore | 0)
                && '<>^|,\\~.-@:'.indexOf(String.fromCharCode(key & 0xff)) < 0)
                reset_count = false;
            break;
        }
    }
    if (cancelled)
        return null;
    return lines.filter((it) => it.selectable && it.selected)
        .map((it) => ({ item: it, count: it.count }));
}

// ── C ref: wizcmds.c:949 wiz_intrinsic() — the #wizintrinsic command. ─────────
//
//   if (wizard) {
//       win = create_nhwindow(NHW_MENU); start_menu(win, MENU_BEHAVE_STANDARD);
//       if (iflags.cmdassist) add_menu_str(win, "[Precede any selection ...]");
//       for (i = 0; (propname = property_by_index(i, &p)) != 0; ++i) {
//           if (p == HALLUC_RES) continue;
//           if (p == FIRE_RES) add_menu_str(win, "--");
//           any.a_int = i + 1;
//           oldtimeout = u.uprops[p].intrinsic & TIMEOUT;
//           if (oldtimeout) Sprintf(buf, "%-27s [%li]", propname, oldtimeout);
//           else Sprintf(buf, "%s", propname);
//           add_menu(win, ..., &any, 0, 0, ATR_NONE, clr, buf, ...);
//       }
//       end_menu(win, "Which intrinsics?");
//       n = select_menu(win, PICK_ANY, &pick_list);
//       destroy_nhwindow(win);
//       for (j = 0; j < n; ++j) { ...incr_itimeout + feedback per property... }
//       docrt();
//   } else
//       pline(unavailcmd, ecname_from_fn(wiz_intrinsic));
//   return ECMD_OK;
//
// no arm in doextcmd's dispatch chain, so JS painted the bare map across all six
// menu frames and then dropped the two intrinsics the second invocation grants.
// The second one is the load-bearing half: it puts a 30-turn timeout on FAST,
// and Very_fast moves the hero's per-turn rn2(3) from allmain.c:135 to
// allmain.c:131 for the next thirty turns.
//
// THE cmdassist SUBTITLE: drawn when iflags.cmdassist is on, which is the
// blank, 21 entries] with no subtitle, in the organiser's recording and in a
// moves carry `Odfamango\n>efjq\x1b` — an Options-menu visit at step 234 —
// and its own frames prove the toggle: step 245 renders `j - cmdassist   [X]`
// and step 248, after the 'j' at step 247, renders `j - cmdassist   [ ]`.
// Appending `OPTIONS=cmdassist` to the rc could never have undone that, which
// is why that control came back negative too.
//
// subtitle there: step 162 is [prompt, blank, SUBTITLE, 21 entries] with
// #wizintrinsic window.
//
// js/optmenu.js:618 is where a toggle WOULD write through to
// game.iflags.cmdassist (its doset_data row is box "iflags", fld "cmdassist"),
export async function wiz_intrinsic() {
    const g = game;
    g.context = g.context || {};
    g.context.move = 0; /* ECMD_OK — the command costs no turn either way */
    if (!(g.flags && g.flags.debug)) {
        /* C cmd.c:157 unavailcmd = "Unavailable command '%s'.", filled from
         * ecname_from_fn(wiz_intrinsic) = ef_txt, which has NO leading '#'. */
        await pline("Unavailable command 'wizintrinsic'.");
        return;
    }
    const u = g.u || (g.u = {});
    if (!u.uprops) u.uprops = {};
    const mlist = [];
    if (game.iflags?.cmdassist !== false)
        mlist.push({ str: '[Precede any selection with a count to increment by other than 30.]',
                     selectable: false });
    for (let i = 0; ; i++) {
        const [p, propname] = property_by_index(i);
        if (propname == null)
            break;                                  /* C: the { 0, 0 } terminator */
        if (p === HALLUC_RES)
            continue;                               /* wizcmds.c:975 */
        if (p === FIRE_RES)
            mlist.push({ str: '--', selectable: false }); /* wizcmds.c:981 */
        /* HDeaf lives in the flat u.HDeaf slot on the live path (music.js drum,
         * allmain.js nh_timeout_deaf), not in uprops[DEAF].intrinsic. */
        const oldtimeout = (((u.uprops[p]?.intrinsic | 0)
                             | (p === DEAF ? (u.HDeaf | 0) : 0)) & TIMEOUT);
        /* C: Sprintf(buf, "%-27s [%li]", propname, oldtimeout) */
        const buf = oldtimeout
            ? `${propname.padEnd(27)} [${oldtimeout}]`
            : propname;
        mlist.push({ str: buf, selectable: true, propIdx: i, prop: p });
    }
    const picks = await tty_menu_pick_any(mlist, 'Which intrinsics?');
    /* C: destroy_nhwindow(win) — the tty dismisses a full-screen menu by
     * redrawing the map underneath it. */
    /* windows.c:1859-1863 keeps bot disabled during select_menu's dismissal;
     * wintty.c:978-979 redraws AND flushes the map before status can repaint. */
    const savedBotDisabled = g._bot_disabled;
    g._bot_disabled = true;
    /* docrt's cls() (display.c:1748,2198) blanks the status rows and bot() is
     * disabled, so a notice_all_mons --More-- raised inside docrt pages over
     * blank status rows (same latch as tty_menu.js's dismissal). */
    g._statusBlankAfterDocrt = true;
    try {
        await docrt();
        await flush_screen(1);
    } finally { g._bot_disabled = savedBotDisabled; }
    g._status1WholeNext = true;
    g._r1botAfterMap = g.level; /* same ordering as _dismissMenu: bot() rewrites row 1 after the map */
    /* The physical frame the closing docrt()'s --More-- will page over.
     * C wizcmds.c:1098 docrt() -> display.c:1748 cls() -> display.c:2196
     *     display_nhwindow(WIN_MESSAGE, FALSE);   <- wintty.c:1874-1875 more()
     *     disp.botlx = TRUE;                      <- only AFTER that more()
     * so nothing repaints between the last pline and that page: the physical
     * screen still holds whatever the last flush_screen()/bot() put there.
     * Which arm that was is decided per iteration, below; null means "the arm
     * repainted", i.e. render live. */
    let frozenPaint = null;
    for (const pick of (picks || [])) {
        const p = pick.item.prop;
        const propname = property_by_index(pick.item.propIdx)[1];
        const prop = u.uprops[p] || (u.uprops[p] = { intrinsic: 0, extrinsic: 0 });
        /* stands in for C's `goto def_feedback` (wizcmds.c:1065, 1073, 1076) —
         * WARN_OF_MON jumps into the default arm and GLIB falls through to it. */
        let def_feedback = false;
        /* C has ONE HDeaf; here it can live in the flat u.HDeaf (menu builder above). */
        const oldtimeout = ((prop.intrinsic | 0) | (p === DEAF ? (u.HDeaf | 0) : 0)) & TIMEOUT;
        /* C: amt = (count == -1L) ? DEFAULT_TIMEOUT_INCR : count; if (amt <= 0) continue */
        const amt = (pick.count === -1) ? DEFAULT_TIMEOUT_INCR : (pick.count | 0);
        if (amt <= 0)
            continue;
        let newtimeout = oldtimeout + amt;
        /* C wizcmds.c:1015-1021 — sickness/sliming/stoning never get EXTENDED. */
        if (p === SICK || p === SLIMED || p === STONED) {
            if (oldtimeout > 0 && newtimeout > oldtimeout)
                newtimeout = oldtimeout;
        }
        /* C wizcmds.c:1023-1088 — the per-property arm.  Everything that needs a
         * make_*() this port does not carry is surfaced rather than guessed: each
         * of those arms has its own message (and SICK has its own rn2(2)), so a
         * silent fallthrough to the `default` arm would print the wrong topline
         * AND, for SICK, drop an RNG call. */
        /* make_sick (potion.c:150-163) plines "You feel deathly sick." BEFORE
         * set_itimeout(&Sick)/u.usick_type/disp.botl, so SICK is STALE too. */
        const armLeavesStatusStale = (p === BLINDED || p === STUNNED
                                      || p === SICK);
        let postArmPaint = null;
        /* An earlier arm's frozen frame is still what the terminal holds: no
         * flush_screen() runs between arms (make_stunned's SET_BOTL waits for
         * the next pline), so re-capturing here would act as a flush and
         * latch the earlier arm's Stun into _lastPaintedBotl, which the
         * closing page then shows. */
        const preArmPaint = armLeavesStatusStale
            ? (frozenPaint || capture_painted_frame_with_status()) : null;
        switch (p) {
        case BLINDED:
            make_blinded(newtimeout, true);
            break;
        /* C wizcmds.c:1030 make_confused() is #if 0'd out — CONFUSION uses the
         * `default` arm "because make_confused() only gives feedback when
         * confusion is ending".  Do not add a case for it. */
        case DEAF:
            /* C wizcmds.c:1033 make_deaf(newtimeout, TRUE) */
            await make_deaf(newtimeout, true);
            break;
        case HALLUC:
            /* C wizcmds.c:1036 make_hallucinated(newtimeout, TRUE, 0L) */
            await make_hallucinated(newtimeout, true, 0);
            break;
        case SICK: {
            /* C wizcmds.c:1039-1040:
             *     typ = !rn2(2) ? SICK_VOMITABLE : SICK_NONVOMITABLE;
             *     make_sick(newtimeout, wizintrinsic, TRUE, typ);
             * This rn2(2) is the caller's; make_sick() then draws a SECOND one
             * inside exercise(A_CON, FALSE) (attrib.c:509) whenever the hero
             * ends up Sick.  `wizintrinsic` is the literal "#wizintrinsic",
             * which make_sick() string-compares to pick KILLED_BY over
             * KILLED_BY_AN (potion.c:185-186). */
            const typ = !rn2(2) ? SICK_VOMITABLE : SICK_NONVOMITABLE;
            await make_sick(newtimeout, WIZINTRINSIC, true, typ);
            break;
        }
        case SLIMED:
            /* C wizcmds.c:1042-1045:
             *     Sprintf(buf, fmt, !Slimed ? "" : " still", "turning into slime");
             *     make_slimed(newtimeout, buf);
             * fmt is "You are%s %s." (wizcmds.c:953) and the Slimed test is read
             * BEFORE the setter runs. */
            await make_slimed(newtimeout,
                `You are${!(prop.intrinsic | 0) ? '' : ' still'} turning into slime.`);
            break;
        case STONED:
            /* C wizcmds.c:1047-1051 make_stoned(newtimeout, buf, KILLED_BY,
             *                                   wizintrinsic) */
            await make_stoned(newtimeout,
                `You are${!(prop.intrinsic | 0) ? '' : ' still'} turning into stone.`,
                KILLED_BY, WIZINTRINSIC);
            break;
        case STUNNED:
            /* C wizcmds.c:1053 make_stunned(newtimeout, TRUE) */
            make_stunned(newtimeout, true);
            break;
        case VOMITING: {
            /* C wizcmds.c:1055-1059 — note talk is FALSE and the message is
             * plined by the CALLER afterwards, unlike every sibling arm. */
            const vomMsg = `You are${!(prop.intrinsic | 0) ? '' : ' still'} vomiting.`;
            await make_vomiting(newtimeout, false);
            await pline(vomMsg);
            break;
        }
        case WARN_OF_MON:
            /* C wizcmds.c:1061-1067 — seed the warned-of species, then
             *     goto def_feedback;
             * i.e. WARN_OF_MON DOES get incr_itimeout() and the "Timeout for"
             * pline.  The `Sprintf`-free arm is modelled with def_feedback
             * below because JS has no goto. */
            if (!Warn_of_mon_prop(u)) {
                const warntype = g.context.warntype = g.context.warntype || {};
                warntype.speciesidx = PM_GRID_BUG;
                warntype.species = permonstTemplate(PM_GRID_BUG);
            }
            def_feedback = true;
            break;
        case GLIB:
            /* C wizcmds.c:1069-1074 — make_glib() does its own set_itimeout, so
             * the shared feedback tail must NOT incr_itimeout() again; C
             * expresses that as `if (p != GLIB)` inside def_feedback.  The
             * FALLTHROUGH into `default` is why GLIB still gets the pline. */
            make_glib(newtimeout);
            /* FALLTHROUGH */
        default:
            def_feedback = true;
            break;
        }
        if (def_feedback) {
            /* C wizcmds.c:1076-1084  def_feedback:
             *     if (p != GLIB)
             *         incr_itimeout(&u.uprops[p].intrinsic, amt);
             *     disp.botl = TRUE;
             *     pline("Timeout for %s %s %d.", propname,
             *           oldtimeout ? "increased by" : "set to", amt); */
            if (p !== GLIB)
                incr_itimeout_prop(prop, amt);
            g.disp = g.disp || {};
            g.disp.botl = 1;
            await pline(`Timeout for ${propname} `
                + `${oldtimeout ? 'increased by' : 'set to'} ${amt}.`);
            /* float_vs_flight() runs only after this pline (wizcmds.c:1086-1088),
             * so the bot() above painted Flying not yet blocked by Levitation:
             * C's page reads "Fly Lev", the post-fixup state reads "Lev". */
            /* rescham() likewise queues revealed mimic glyphs after the pline
             * (wizcmds.c:1083-1084; mon.c:4409-4426).  cls() pages the message
             * before flushing those glyphs, retaining the disguised map. */
            if (p === LEVITATION || p === FLYING || p === PROT_FROM_SHAPE_CHANGERS)
                postArmPaint = capture_painted_frame_with_status();
        }
        /* The LAST arm decides: a later repainting arm discharges an earlier
         * arm's freeze, exactly as its bot() would in C. */
        /* A BLINDED arm that merely extends a running blindness (potion.c:
         * xtime && old) neither plines nor flags botl, so it discharges
         * nothing: the physical frame an earlier stale arm froze stays. */
        /* make_deaf (potion.c:450-456) flags botl and speaks only when
         * (xtime != 0) ^ (old != 0); extending a running deafness is silent. */
        if (((p === BLINDED && (oldtimeout | 0) !== 0)
             || (p === DEAF && (oldtimeout | 0) !== 0 && (newtimeout | 0) !== 0))
            && frozenPaint) {
            /* keep the earlier arm's frozen frame */
        } else
            frozenPaint = armLeavesStatusStale ? preArmPaint : postArmPaint;
        /* C wizcmds.c:1086-1094 — the post-arm fixups.  Note C's `else if`: a
         * property is never both LEVITATION/FLYING and
         * PROT_FROM_SHAPE_CHANGERS, but the shape is preserved. */
        if (p === LEVITATION || p === FLYING)
            float_vs_flight();
        else if (p === PROT_FROM_SHAPE_CHANGERS)
            await rescham();
        if ((p === WWALKING || p === LEVITATION || p === FLYING) && u.uinwater)
            await pooleffects(false);
    }
    /* C display.c:1740 runs vision_recalc(2) before cls() pages the
     * message window.  That recalculation can announce newly sensed
     * monsters (vision.c:856), and its pline flushes the darkened map.
     * docrt(true) records cls()'s page and physical frame at that point. */
    const pendingAtCls = g._pending_message || '';
    await docrt(true);
    /* docrt()'s own diagnostics (see_monsters -> newsym() impossible(),
     * display.c:930-935) are plined AFTER cls()'s more(): the last of them
     * stands on the topline instead of being paged (topl.c:300). */
    const postCls = !!pendingAtCls
        && String(g._pending_message).startsWith(pendingAtCls + '  ');
    let standing = false;
    if (g._pending_message) {
        /* Page the topline over the frame C's physical terminal still holds --
         * see frozenPaint above.  Null on every arm that repainted, so those
         * pages stay byte-identical. */
        const savedSnap = g._paintedSnapshot;
        if (frozenPaint) g._paintedSnapshot = frozenPaint;
        standing = !!await force_more_pages(g._pending_message, true, false,
                                            postCls ? pendingAtCls : null);
        if (frozenPaint) g._paintedSnapshot = savedSnap || null;
    }
    if (!standing) g._pending_message = '';
    /* C wizcmds.c:1092-1094: docrt() then return -- no flush_screen here;
     * the moveloop's own flush (after see_monsters) paints the frame. */
}

/* C ref: wizcmds.c:958 #define DEFAULT_TIMEOUT_INCR 30 */
const DEFAULT_TIMEOUT_INCR = 30;

/* C ref: wizcmds.c:950  static const char wizintrinsic[] = "#wizintrinsic".
 * Load-bearing, not decorative: make_sick() strcmp()s the cause against this
 * exact string to choose KILLED_BY over KILLED_BY_AN (potion.c:185-186). */
const WIZINTRINSIC = "#wizintrinsic";

async function print_dungeon_text() {
    const g = game;
    const dungeonsFull = g._dungeons_full || [];
    const n_dgns = g._n_dgns | 0;
    const branches = g._dungeon_branches || [];
    const end1_dnum = (br) => (br.end1_floating ? n_dgns : (br.end1.dnum | 0));
    /* C add_level (dungeon.c:544) keeps svs.sp_levchn ordered by dnum, then by
     * ascending dlevel within a dnum. */
    const spLevchn = (g._sp_levchn || []).slice().sort((a, b) =>
        (a.dlevel.dnum - b.dlevel.dnum) || (a.dlevel.dlevel - b.dlevel.dlevel));

    const win = create_nhwindow(3 /* NHW_MENU */);

    for (let i = 0; i < n_dgns; i++) {
        const dptr = dungeonsFull[i];
        if (!dptr) continue;
        /* C:2309-2310's `bymenu && In_endgame(&u.uz)` filter is bymenu-only. */
        const unplaced = _pd_unplaced_floater_txt(i, branches, end1_dnum);
        const descr = unplaced ? 'depth' : 'level';
        const nlev = dptr.num_dunlevs | 0;
        let buf;
        if (nlev > 1)
            buf = `${dptr.dname}: ${makeplural_objnam(descr)} ${dptr.depth_start}`
                + ` to ${dptr.depth_start + nlev - 1}`;
        else
            buf = `${dptr.dname}: ${descr} ${dptr.depth_start}`;
        /* C:2323-2329 — "Most entrances are uninteresting." */
        if ((dptr.entry_lev | 0) !== 1) {
            if ((dptr.entry_lev | 0) === nlev)
                buf += ', entrance from below';
            else
                buf += `, entrance on ${dptr.depth_start + dptr.entry_lev - 1}`;
        }
        putstr(win, 0, buf);

        let last_level = 0;
        for (const slev of spLevchn) {
            if (slev.dlevel.dnum !== i) continue;
            print_branch(win, i, last_level, slev.dlevel.dlevel, false, null, branches, dungeonsFull, end1_dnum);
            let lbuf = `${_pd_chr_u_on_lvl(slev.dlevel)} ${slev.proto}: `
                + `${_pd_depth(slev.dlevel, dungeonsFull)}`;
            if (Is_stronghold(slev.dlevel))
                lbuf += ` (tune ${g._tune || ''})`;
            putstr(win, 0, lbuf);
            last_level = slev.dlevel.dlevel;
        }
        print_branch(win, i, last_level, 127 /* MAXLEVEL */, false, null, branches, dungeonsFull, end1_dnum);
    }

    /* C:2384-2396 — floating branches (an unplaced Fort Ludios). */
    let first = true;
    for (const br of branches) {
        if (end1_dnum(br) === n_dgns) {
            if (first) {
                putstr(win, 0, '');
                putstr(win, 0, 'Floating branches');
                first = false;
            }
            const dnameEnd2 = (dungeonsFull[br.end2.dnum] || {}).dname || '';
            putstr(win, 0, `   ${_pd_br_string(br.type)} to ${dnameEnd2}`);
        }
    }

    /* C:2398-2433 — "I hate searching for the invocation pos while debugging." */
    const uz = g.u?.uz || { dnum: 0, dlevel: 0 };
    if (Invocation_lev_dgn(uz)) {
        putstr(win, 0, '');
        putstr(win, 0, `Invocation position @ (${g.svi.inv_pos.x | 0},`
            + `${g.svi.inv_pos.y | 0}), hero @ (${g.u?.ux | 0},${g.u?.uy | 0})`);
    } else {
        let buf = '';
        let trap = null;
        for (let t = g.ftrap; t; t = t.ntrap)
            if ((t.ttyp | 0) === MAGIC_PORTAL) { trap = t; break; }
        if (trap)
            buf = `Portal @ (${trap.tx | 0},${trap.ty | 0}), `
                + `hero @ (${g.u?.ux | 0},${g.u?.uy | 0})`;
        /* C:2422-2425 — only expect a portal on these levels. */
        else if (Is_earthlevel(uz) || Is_waterlevel(uz) || Is_firelevel_cmd(uz)
                 || Is_airlevel(uz) || on_level(uz, g.qstart_level)
                 || _pd_at_dgn_entrance('The Quest', branches, dungeonsFull, end1_dnum)
                 || Is_knox_level(uz))
            buf = 'No portal found.';
        if (buf) {
            putstr(win, 0, '');
            putstr(win, 0, buf);
        }
    }

    await display_nhwindow(win, true);
    destroy_nhwindow(win);
    return 0;
}

/* C ref: dungeon.c:2175 unplaced_floater(dptr) — TRUE only for the Fort Ludios
 * dungeon while its branch entrance still floats.  The bymenu twin above takes
 * a pre-floated branch copy; this one reads the `end1_floating` flag instead. */
function _pd_unplaced_floater_txt(dnum, branches, end1_dnum) {
    const g = game;
    const knoxDnum = g.knox_level ? g.knox_level.dnum : -1;
    if (dnum !== knoxDnum) return false;
    const n_dgns = g._n_dgns | 0;
    for (const br of (branches || []))
        if (end1_dnum(br) === n_dgns && br.end2.dnum === dnum) return true;
    return false;
}

/* C ref: dungeon.c:1897 at_dgn_entrance(s) — on_level(&u.uz, &dungeon_branch(s)->end1).
 * dungeon_branch(s) (dungeon.c:1878) finds the branch whose end2 dungeon is
 * named s; C panics when there is none, which cannot happen for "The Quest". */
function _pd_at_dgn_entrance(dname, branches, dungeonsFull, end1_dnum) {
    return at_dgn_entrance(dname);
}

/* C ref: wizcmds.c:1934 wiz_custom() — #wizcustom. */
export async function wiz_custom() {
    if (!wizard()) return ECMD_OK;
    const g = game;
    const menu = new TtyMenu();
    menu.add_menu_heading('    glyph  glyph identifier                        '
                          + '     sym   clr customcolor unicode utf8');
    /* wizcmds.c:1952-1962: symset name (or "default"), ", active" when the
     * primary set is current, ", handler=<known_handling>" when set. */
    const set = gs.symset[0] || {};
    wizcustom_glyphids(menu);
    let bufa = `#wizcustom: colorcount=${(g.iflags.colorcount ?? 256) | 0} ${set.name ? set.name : 'default'}`;
    if (set.name) bufa += ', active';
    if (set.handling) bufa += ', handler=' + ['UNKNOWN', 'IBM', 'DEC', 'CURS', 'MAC', 'UTF8'][set.handling];
    menu.end_menu(bufa);
    await menu.select_menu(PICK_NONE);
    await docrt(); /* wizcmds.c:1980 */
    return ECMD_OK;
}

/* C ref: wizcmds.c:218 wiz_where() — the #wizwhere command.
 *     if (wizard) (void) print_dungeon(FALSE, (schar *) 0, (xint16 *) 0);
 *     else pline(unavailcmd, ecname_from_fn(wiz_where));
 *     return ECMD_OK;
 * cmd.c:1999 flags it IFBURIED | AUTOCOMPLETE | WIZMODECMD with no key, so the
 * name chain (doextcmd) is the only way in. */
export async function wiz_where() {
    /* `wizard` is a FUNCTION (js/gstate.js:19), so the bare `if (wizard)` that
     * stood here was ALWAYS TRUE and the else arm was dead — fn-truthy-lint's
     * HARD class, the same defect c5dd49a6 removed from wiz_genesis. */
    if (wizard()) {
        await print_dungeon_text();
    } else {
        /* C wizcmds.c:223 pline(unavailcmd, ecname_from_fn(wiz_where)) —
         * ecname_from_fn returns extcmdlist[].ef_txt, which carries NO leading
         * '#'.  The recordings show `Unavailable command 'wizlevelport'.` for
         * the sibling command, so this text was wrong by one character. */
        await pline("Unavailable command 'wizwhere'.");
    }
    return ECMD_OK;
}

export async function wiz_level_tele() {
    if (wizard())
        await level_tele();
    else
        await pline("Unavailable command 'wizlevelport'.");
    /* C: this handler returns ECMD_OK on every path; rhack() maps it. */
    return ECMD_OK;
}

// C ref: wizcmds.c:176 wiz_map() — the "wizmap" command, bound to C('f')
// (Ctrl+F) at cmd.c:1982 and reachable by name as '#wizmap'.  WIZMODECMD: in
// wizard (playmode:debug) mode it reveals traps/engravings then calls
// do_mapping() (detect.c:1423), whose only RNG is exercise(A_WIS, TRUE) →
// rn2(19) [detect.c:1444, attrib.c:509].  Returns ECMD_OK — no turn consumed.
// Mirrors the other wiz-command dispatches (^V/^W), which assume wizard mode
//
// C wizcmds.c:184-190 — BEFORE do_mapping(), wiz_map marks every trap on the
// level seen and maps its glyph, and maps every engraving:
//     for (t = gf.ftrap; t; t = t->ntrap) { t->tseen = 1; map_trap(t, TRUE); }
//     for (ep = head_engr; ep; ep = ep->nxt_engr) map_engraving(ep, TRUE);
// This is what makes do_mapping's show_map_spot trap branch (detect.c:1407
// `t_at(x,y) && t->tseen`) fire — without it the magic-mapped background
// overwrites every trap cell and the level shows no traps at all.  Both loops
// are RNG-free (display channel only), so the leaf stream is unchanged.
// HConfusion/HHallucination are saved+cleared around the call in C;
// do_mapping() here already passes cnf=0 and no hallucination glyph
// substitution exists on this path, so the save/restore is a no-op.
export async function wiz_map() {
    if (!wizard()) {
        await pline("Unavailable command 'wizmap'.");
        return ECMD_OK;
    }
    const _wizConfProp = game.u?.uprops?.[CONFUSION];
    const _wizHalluProp = game.u?.uprops?.[HALLUC];
    const _wizConfSaved = _wizConfProp?.intrinsic ?? 0;
    const _wizHalluSaved = _wizHalluProp?.intrinsic ?? 0;
    if (_wizConfProp) _wizConfProp.intrinsic = 0;
    if (_wizHalluProp) _wizHalluProp.intrinsic = 0;
    game.a11y ??= {};
    game.a11y.mon_notices_blocked = (game.a11y.mon_notices_blocked || 0) + 1; // wizcmds.c:183
    try {
        for (let t = game.ftrap; t; t = t.ntrap) {
            t.tseen = 1;
            map_trap(t, 1);
        }
        for (const ep of engravings_list())
            map_engraving(ep, 1);
        await do_mapping();
    } finally {
        game.a11y.mon_notices_blocked--; // wizcmds.c:193 notice_mon_on()
        if (_wizConfProp) _wizConfProp.intrinsic = _wizConfSaved;
        if (_wizHalluProp) _wizHalluProp.intrinsic = _wizHalluSaved;
    }
    /* C wizcmds.c:192-200 leaves do_mapping()'s messages on the topline,
     * including any wall_angle() diagnostics raised while revealing terrain. */
    /* C: this handler returns ECMD_OK on every path; rhack() maps it. */
    return ECMD_OK;
}

/* C ref: cmd.c:1072 `const char *levltyp[MAX_TYPE + 2]` — the terrain-type
 * names, indexed by levl[][].typ.  Entry MAX_TYPE (37) is not a real terrain
 * type; wiz_map_levltyp() uses it for undiggable stone.  Entry 38 is the empty
 * padding string that makes SIZE(levltyp) even, and wiz_levltyp_legend()'s
 * `last = SIZE(levltyp) & ~1` drops it again whenever the real count is odd
 * (which it is: 38 real entries, so `last` is 38 and index 38 is never read).
 * Kept in C's order because BOTH readers below derive their letter from the
 * INDEX, not from the string. */
const levltyp = [
    "stone", "vertical wall", "horizontal wall", "top-left corner wall",
    "top-right corner wall", "bottom-left corner wall",
    "bottom-right corner wall", "cross wall", "tee-up wall", "tee-down wall",
    "tee-left wall", "tee-right wall", "drawbridge wall", "tree",
    "secret door", "secret corridor", "pool", "moat", "water",
    "drawbridge up", "lava pool", "lava wall", "iron bars", "door",
    "corridor", "room", "stairs", "ladder", "fountain", "throne", "sink",
    "grave", "altar", "ice", "drawbridge down", "air", "cloud",
    /* not a real terrain type, but used for undiggable stone
       by wiz_map_levltyp() */
    "unreachable/undiggable",
    /* padding in case the number of entries above is odd */
    "",
];

/* wizcmds.c:706-711's int-to-char conversion, shared by wiz_map_levltyp() (on
 * levl[x][y].typ) and wiz_levltyp_legend() (on the levltyp[] index), which is
 * why C's legend carries the comment "same int-to-char conversion". */
function _levltyp_base36(n) {
    return n < 10 ? String.fromCharCode(48 + n)             /* '0' + n      */
         : n < 36 ? String.fromCharCode(97 + n - 10)        /* 'a' + n - 10 */
                  : String.fromCharCode(65 + n - 36);       /* 'A' + n - 36 */
}

function _wiz_map_levltyp_dsc() {
    const g = game;
    const uz = g.u?.uz;
    const lf = g.level?.flags || {};
    const slev = sp_levchn_lookup(uz);
    let dsc = `D:${uz?.dnum | 0},L:${uz?.dlevel | 0}`;
    /* [dungeon branch features currently omitted] */
    /* special level features */
    if (slev) {
        dsc += ` "${slev.proto}"`;
        /* special level flags (note: dungeon.def doesn't set `maze' or `hell'
           for any specific levels so those never show up) */
        if (slev.flags?.maze_like) dsc += ' mazelike';
        if (slev.flags?.hellish) dsc += ' hellish';
        if (slev.flags?.town) dsc += ' town';
        if (slev.flags?.rogue_like) dsc += ' roguelike';
        /* alignment currently omitted to save space */
    }
    /* level features.  C prints defsyms[S_fountain].sym / defsyms[S_sink].sym,
     * and defsym.h:133-134 gives BOTH of them '{' — the two counts really are
     * spelled the same way and are told apart only by their order. */
    if (lf.nfountains) dsc += ` {:${lf.nfountains | 0}`;
    if (lf.nsinks) dsc += ` {:${lf.nsinks | 0}`;
    if (lf.has_vault) dsc += ' vault';
    if (lf.has_shop) dsc += ' shop';
    if (lf.has_temple) dsc += ' temple';
    if (lf.has_court) dsc += ' throne';
    if (lf.has_zoo) dsc += ' zoo';
    if (lf.has_morgue) dsc += ' morgue';
    if (lf.has_barracks) dsc += ' barracks';
    if (lf.has_beehive) dsc += ' hive';
    if (lf.has_swamp) dsc += ' swamp';
    /* level flags */
    if (lf.noteleport) dsc += ' noTport';
    if (lf.hardfloor) dsc += ' noDig';
    if (lf.nommap) dsc += ' noMMap';
    if (!lf.hero_memory) dsc += ' noMem';
    if (lf.shortsighted) dsc += ' shortsight';
    if (lf.graveyard) dsc += ' graveyard';
    if (lf.is_maze_lev) dsc += ' maze';
    if (lf.is_cavernous_lev) dsc += ' cave';
    if (lf.arboreal) dsc += ' tree';
    if (lf.sokoban_rules) dsc += ' sokoban-rules';   /* C rm.h:538 Sokoban */
    /* non-flag info; probably should include dungeon branching
       checks (extra stairs and magic portals) here */
    if (Invocation_lev_dgn(uz)) dsc += ' invoke';
    if (_on_W_tower_level(uz)) dsc += ' tower';
    /* append a branch identifier for completeness' sake */
    const dnum = uz?.dnum | 0;
    if (dnum === 0) dsc += ' dungeon';
    else if (dnum === (g.mines_dnum | 0)) dsc += ' mines';
    else if (In_sokoban(uz)) dsc += ' sokoban';
    else if (dnum === (g.quest_dnum | 0)) dsc += ' quest';
    else if (Is_knox_level(uz)) dsc += ' ludios';
    else if (dnum === 1) dsc += ' gehennom';
    else if (dnum === (g.tower_dnum | 0)) dsc += ' vlad';
    else if (In_endgame(uz)) dsc += ' endgame';
    else {
        /* somebody's added a dungeon branch we're not expecting */
        let brname = g.dungeons?.[dnum]?.dname;
        if (!brname) brname = 'unknown';
        if (brname.slice(0, 4).toLowerCase() === 'the ') brname = brname.slice(4);
        dsc += ` ${brname}`;
    }
    /* limit the line length to map width */
    if (dsc.length >= COLNO) dsc = dsc.slice(0, COLNO - 1); /* truncate */
    return dsc;
}

export async function wiz_map_levltyp() {
    const g = game;
    const lines = [];
    /* map row 0, levl[][0], is drawn on the second line of tty screen */
    lines.push('');  /* tty only: blank top line */
    for (let y = 0; y < ROWNO; y++) {
        /* map column 0, levl[0][], is off the left edge of the screen;
           it should always have terrain type "undiggable stone" */
        let row = '';
        for (let x = 1; x < COLNO; x++) {
            const terrain = g.level?.at(x, y)?.typ | 0;
            /* assumes there aren't more than 10+26+26 terrain types */
            row += (terrain === STONE && !may_dig(x, y)) ? '*'
                                                        : _levltyp_base36(terrain);
        }
        if ((g.level?.at(0, y)?.typ | 0) !== STONE || may_dig(0, y))
            row += '!';
        lines.push(row);
    }
    lines.push(_wiz_map_levltyp_dsc());
    await display_text_window(lines);
}

/* C ref: wizcmds.c:838-877 wiz_levltyp_legend() — "explanation of base-36
 * output from wiz_map_levltyp()", i.e. menu entry 6.  Another NHW_TEXT window.
 *
 * Two columns: the left holds levltyp[0..last/2-1] and the right
 * levltyp[last/2..last-1], emitted a pair at a time.  `last` is
 * SIZE(levltyp) & ~1 == 38, so the padding entry at index 38 is never read and
 * the ' ' case of C's `!*dsc` arm is unreachable — it is transliterated anyway
 * because the table is C's and a future terrain type would make the count odd
 * again.  RNG-free. */
export async function wiz_levltyp_legend() {
    const lines = ['#terrain encodings:', ''];
    /* TODO: include tab-separated variant for win32 */
    const fmt = (c, dsc) => ` ${c} - ${dsc.padEnd(28)}`;   /* C: " %c - %-28s" */
    let buf = '';
    /* output in pairs, left hand column holds [0],[1],...,[N/2-1]
       and right hand column holds [N/2],[N/2+1],...,[N-1];
       N ('last') will always be even, and may or may not include
       the empty string entry to pad out the final pair, depending
       upon how many other entries are present in levltyp[] */
    const last = levltyp.length & ~1;
    for (let i = 0; i < last / 2; ++i)
        for (let j = i; j < last; j += last / 2) {
            const dsc = levltyp[j];
            const c = !dsc ? ' '
                    : dsc.slice(0, 11) === 'unreachable' ? '*'
                      /* same int-to-char conversion as wiz_map_levltyp() */
                      : _levltyp_base36(j);
            buf += fmt(c, dsc);
            if (j > i) {
                lines.push(buf);
                buf = '';
            }
        }
    await display_text_window(lines);
}

/* C wizcmds.c:549-564 wiz_fuzzer(); flag.h:239-243 debug_fuzzer_states. */
export async function wiz_fuzzer() {
    if (BigInt(game.flags.suppress_alert || 0) < get_feature_notice_ver('3.7.0')) {
        await pline('The fuzz tester will make NetHack execute random keypresses.');
        await pline('There is no conventional way out of this mode.');
    }
    if (await paranoid_query(true, 'Do you want to start fuzz testing?')) {
        game.iflags.debug_fuzzer =
            (await y_n_default('Do you want to call panic() after impossible()?', 'n')) === 'n'
                ? 2 : 1;
    }
    return ECMD_OK;
}

/* C ref: wizcmds.c:70-105 makemap_unmakemon(mtmp, migratory) — un-create one
 * monster of the level being replaced so the new incarnation may remake it. */
async function makemap_unmakemon(mtmp, migratory) {
    const g = game;
    const ndx = (mtmp.mndx ?? mtmp.mnum ?? -1) | 0;
    const mv = ndx >= 0 && g.mvitals ? (g.mvitals[ndx] ||= { born: 0, died: 0, mvflags: 0 }) : null;
    if (mv) {
        /* G_UNIQ = 0x1000 (monflag.h) */
        if (mtmp.data && (mtmp.data.geno & 0x1000))
            mv.mvflags &= ~0x01; /* ~G_EXTINCT */
        if (mv.born)
            mv.born--;
    }
    if (mtmp.isgd) {
        mtmp.isgd = 0; /* fall through to mongone() */
    } else if ((mtmp.mhp | 0) < 1) {
        return; /* DEADMONSTER: already set to be discarded */
    }
    /* wizcmds.c:91-93 setpaid() for a shk on this level: private to js/shk.js, RNG-free. */
    if (migratory) {
        mtmp.mstate = ((mtmp.mstate | 0) | 0x01 /* MON_OFFMAP */)
            & ~(0x04 | 0x08 | 0x40); /* ~(MIGRATING|LIMBO|ENDGAME_MIGR) */
        mtmp.nmon = g.fmon;
        g.fmon = mtmp;
    }
    await mongone(mtmp);
}

/* C ref: wizcmds.c:109-153 makemap_remove_mons(void) */
export async function makemap_remove_mons() {
    const g = game;
    const { keepdogs } = await import('./dog.js');
    await keepdogs(true);
    let nxt;
    for (let mtmp = g.fmon; mtmp; mtmp = nxt) {
        nxt = mtmp.nmon;
        if ((mtmp.mhp | 0) < 1)
            continue;
        await makemap_unmakemon(mtmp, false);
    }
    const { on_level } = await import('./dungeon.js');
    let mprev = null;
    for (let mtmp = g.migrating_mons; mtmp; ) {
        const e = mtmp.mextra;
        if (e && ((mtmp.isshk && e.eshk && on_level(g.u.uz, e.eshk.shoplevel))
                  || (mtmp.ispriest && e.epri && on_level(g.u.uz, e.epri.shrlevel))
                  || (mtmp.isgd && e.egd && on_level(g.u.uz, e.egd.gdlevel)))) {
            const nx = mtmp.nmon;
            if (mprev) mprev.nmon = nx; else g.migrating_mons = nx;
            await makemap_unmakemon(mtmp, true);
            mtmp = nx;
        } else {
            mprev = mtmp;
            mtmp = mtmp.nmon;
        }
    }
    await dmonsfree();
}
