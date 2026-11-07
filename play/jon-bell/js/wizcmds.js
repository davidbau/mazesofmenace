// @ts-nocheck
// wizcmds.js — Wizard-mode extended commands.
// C ref: nethack-c/src/wizcmds.c — wiz_level_change() and related.
// Hand-maintained JS (not tsc-emitted). Sibling imports from js/*.js.
import { u_safe_from_fatal_corpse } from './pickup.js';
import { olfaction } from './makemon.js';
import { erosion_matters } from './mklev.js';
import { mungspaces } from './hacklib.js';
import { usmellmon } from './mon.js';
import { body_part, cmdq_pop, doprev_message } from './cmd.js';
import { ARM, ECMD_CANCEL, UTOTYPE_NONE, Is_stronghold, Is_botlevel, CMDQ_KEY } from './const.js';
import { getdir } from './lock.js';
import { map_invisible, GLYPHCLS_MON, GLYPHCLS_INVIS, display_migrating_mons } from './display.js';
import { game, wizard } from './gstate.js';
import { reassign } from './inventory_refresh.js';
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
import { rn2, d, rnd } from './rng.js';
import { quest_info, readobjnam, hands_obj, getObjDescr, xname_scroll, xname_spellbook, xname_amulet, xname_armor, xname_weapon, xname_oname_tail, xname, the, The, aobjnam, Tobjnam, doname as doname_real } from './objnam.js';
import { artiname } from './artifact.js';
import { discover_object, observe_object } from './o_init.js';
import { stagger_verb, encumber_msg_sync, weight } from './weight.js';
import { near_capacity } from './hack.js';
import { exercise, ARTILIST_MTYPE } from './attrib.js';
import { losehp } from './hack.js';
import { MKOBJ_OC_MATERIAL } from './mkobj_erosion_meta.js';
import { hates_silver, name_to_mon, name_to_monclass, permonstTemplate, monPmname, set_malign, mkclass, rndmonst, splitobj } from './makemon.js';
import { makemon, engravings_list } from './mklev.js';
import { newcham, mongone } from './mon.js';
import { count_wsegs } from './worm.js';
import { tamedog, migrate_to_level } from './dog.js';
import { monster_census } from './sit.js';
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
import { get_level, y_n_default, addinv_core2, reorder_invent, inv_cnt, freeinv, getpos, addinv_core1, carry_obj_effects, obj_to_let, mergable as mergable_real } from './cmd.js';
import { setuqwep } from './wield.js';
import { hitfloor, hurtle, mhurtle } from './dothrow.js';
import { dropx, dropy } from './do.js';
import { place_object, remove_object } from './mklev.js';
import { upstart } from './hacklib.js';
import { m_at, mon_nam, xkilled, XKILL_NOMSG } from './uhitm.js';
import { x_monnam } from './mhitm.js';
import { nonliving, mondied } from './makemon.js';
import { ARTICLE_YOUR, ARTICLE_THE, ARTICLE_A, SUPPRESS_IT,
         SUPPRESS_HALLUCINATION, SUPPRESS_SADDLE, has_mgivenname } from './const.js';
import { dmonsfree } from './mon.js';
import { forget_temple_entry } from './priest.js';
import { flip_level, flip_level_rnd } from './sp_lev.js';
import { docrt } from './display.js';
import { done, ynq } from './end.js';
import { yn_function } from './cmd.js';
import { paranoid_query } from './paranoid.js';
import { DIED } from './const.js';
import { PM_SAMURAI } from './pm.generated.js';
import { bury_objs } from './zap.js';
import { can_reach_floor, is_missile, ammo_and_launcher } from './hold_another_object.js';
import { addinv_core0 } from './invent.js';
import { A_WIS, KILLED_BY, ANTIMAGIC, HALF_PHDAM, LOW_PM, ECMD_OK, MM_MINVIS,
         Is_airlevel, Is_waterlevel, IRONBARS, ICE, FUMBLING, COLD_RES, LS_OBJECT, LS_MONSTER,
         LL_CONDUCT, LL_WISH, LL_ARTIFACT, Upolyd } from './const.js';
import { _artifact_origin } from './objnam.js';
import { ONAME_WISH, ONAME_KNOW_ARTI, ONAME_SKIP_INVUPD, ONAME, has_oname } from './const.js';
import { oname } from './objnam.js';

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
/* C objclass.h COIN_CLASS = 12 (js/objnam.js:81 says the same). */
const COIN_CLASS_WZ = 12;
async function _wish_doname(otmp, quanOverride) {
    const savequan = otmp.quan;
    if (quanOverride != null)
        otmp.quan = quanOverride | 0;
    try {
        return await doname_real(otmp);
    } finally {
        otmp.quan = savequan;
    }
}
async function _wish_mergable(into, obj) {
    return await mergable_real(into, obj);
}

function _wish_merged_reconcile(into, obj) {
    let discovered = false;
    if ((obj.known | 0) !== (into.known | 0)) {
        into.known = 1;
        discovered = true;
    }
    if ((obj.rknown | 0) !== (into.rknown | 0)) {
        into.rknown = 1;
        if (into.oerodeproof) discovered = true;
    }
    if ((obj.bknown | 0) !== (into.bknown | 0)) {
        into.bknown = 1;
        if (!_wish_role_is_priest()) discovered = true;
    }
    return discovered;
}

/* C you.h:247 Role_if(X) is gu.urole.mnum == X; the Priest role index is 6
 * (role.c), read the way hold_another_object.js _Role_if reads it. */
const _WISH_ROLE_PRIEST = 6;
function _wish_role_is_priest() {
    const ir = ((game.flags?.initrole ?? -1) | 0);
    if (ir >= 0) return ir === _WISH_ROLE_PRIEST;
    return (((game.urole && game.urole.mnum) ?? -1) | 0) === _WISH_ROLE_PRIEST;
}

/* C ref: pickup.c:1972 encumber_msg() — the load-change line.  Returns the
 * message string (or null) for an oldcap→newcap transition.  RNG-free.  Mirrors
 * cmd.js _encumber_msg_text / do_wear.js encumber_msg. */
function _wish_encumber_text(oldcap, newcap) {
    if (oldcap < newcap) {
        switch (newcap) {
        case 1: return 'Your movements are slowed slightly because of your load.';
        case 2: return 'You rebalance your load.  Movement is difficult.';
        case 3: return `You ${stagger_verb()} under your heavy load.  Movement is very hard.`;
        default: return `You ${newcap === 4 ? 'can barely' : "can't even"} move a handspan with this load!`;
        }
    } else if (oldcap > newcap) {
        switch (newcap) {
        case 0: return 'Your movements are now unencumbered.';
        case 1: return 'Your movements are only slowed slightly by your load.';
        case 2: return 'You rebalance your load.  Movement is still difficult.';
        case 3: return `You ${stagger_verb()} under your load.  Movement is still very hard.`;
        default: return null;
        }
    }
    return null;
}

async function _wish_encumber_msg(paintedCap, prinvLine) {
    const g = game;
    const newcap = near_capacity();
    /* C pickup.c:1980-1982: the comparison is against the GLOBAL go.oldcap, which
     * only encumber_msg() writes — not the pre-addinv near_capacity().  A capacity
     * change no encumber_msg() saw (e.g. arriving on the Plane of Water) leaves
     * go.oldcap stale, and the wish's encumber_msg then reports it.  paintedCap
     * (the pre-addinv capacity) is only what the last bot() painted. */
    const oldcap = (g.u?._oldcap ?? 0) | 0;
    if (g.u) g.u._oldcap = newcap; /* C: go.oldcap = newcap at encumber_msg tail */
    if (oldcap === newcap) return;
    const msg = _wish_encumber_text(oldcap, newcap);
    if (!msg) return;
    const _botlOwed = !!(g.disp && (g.disp.botl || g.disp.botlx)) || g._wishBotlOwedAtPrinv === true;
    g._wishBotlOwedAtPrinv = false;
    const prev = g._resultMessage;
    if (g._topl_win_stop) {
        /* topl.c:257 skip: the pline is buffered in gt.toplines, never painted
         * or paged (:262-270 join, :289-291 replace). */
        const hidden = String(g._topl_win_stop_buf || '');
        g._topl_win_stop_buf = (hidden && hidden.length + 2 + msg.length < TOPL_LIMIT)
            ? hidden + '  ' + msg : msg;
    } else if (prev) {
        const joined = prev + '  ' + msg;
        _topl_record_join(prev, joined);
        g._resultMessage = joined;
        if (prinvLine) {
            const f = capture_painted_frame();
            if (f) {
                /* C invent.c addinv_core1: gold sets disp.botl, so the prinv
                 * pline's flush_screen runs bot() with the POST-add capacity
                 * (the $ field is already updated; so is the cap). */
                const _goldPrinv = prinvLine.startsWith('$ - ');
                /* Likewise when disp.botl was ALREADY set before the prinv
                 * (touch_artifact's blast -> losehp, artifact.c touch_artifact
                 * / hack.c losehp: disp.botl = TRUE): the prinv pline's
                 * flush_screen (wintty.c tty_display_nhwindow -> bot()) paints
                 * the post-addinv capacity before encumber_msg runs. */
                const _postCap = _goldPrinv || _botlOwed;
                f.cap = (_postCap ? newcap : paintedCap) | 0;
                f.mmExit = g._movemonExitSeq | 0;
                g._pickupEncPreFrame = f;
                g._pickupEncMorePending = { oldcap: (_postCap ? newcap : paintedCap) | 0, prinvText: prinvLine,
                    /* the status row as of the last bot(): taken before SET_BOTL below */
                    botl: _postCap ? undefined : capture_pre_movemon_botl() };
            }
        }
    } else {
        g._resultMessage = msg;
    }
    /* C pickup.c:1992: SET_BOTL() comes AFTER the pline, so the join recorded
     * above (the pline's own flush_screen) paints the OLD status line. */
    if (g.disp) g.disp.botl = true;
}

/* C youprop.h:103 Blind := ((HBlinded || EBlinded) && !BBlinded), i.e.
 * u.uprops[BLINDED].{intrinsic,extrinsic,blocked} — the same expression
 * js/vision.js Blind(), js/objnam.js _Blind() and the botl "Blind" condition
 * read.  Local rather than imported from js/vision.js because importing that
 * module here would pull the vision recalc into the wizard-command graph; the
 * expression is three fields and it is spelled identically in five files
 * already.  No RNG. */
const BLINDED_WIZ = 15; /* const.js BLINDED */
function _wish_Blind() {
    const u = game.u;
    if (!u)
        return false;
    const bp = u.uprops && u.uprops[BLINDED_WIZ];
    return !!bp && !!((bp.intrinsic | 0) || (bp.extrinsic | 0))
           && !(bp.blocked | 0);
}

/* C youprop.h:120 Hallucination := (HHallucination && !Halluc_resistance);
 * HALLUC is property 23, HALLUC_RES 24 (const.js). */
function _wish_Hallu() {
    const hp = game.u?.uprops?.[23];
    const rp = game.u?.uprops?.[24];
    return !!hp && !!(hp.intrinsic | 0)
           && !(rp && ((rp.intrinsic | 0) || (rp.extrinsic | 0)));
}

/* C youprop.h:135 Fumbling := (HFumbling || EFumbling).  Unlike Blind, the
 * property has no blocked arm: blocked is not part of C's Fumbling macro. */
function _wish_Fumbling() {
    const fp = game.u?.uprops?.[FUMBLING];
    return !!fp && !!((fp.intrinsic | 0) || (fp.extrinsic | 0));
}

/* C invent.c:2861 obj_to_let(), called by prinv()'s xprname (invent.c:2888):
 * forwards to the shared port in js/cmd.js. */
function _wish_obj_to_let(obj) {
    return obj_to_let(obj).charCodeAt(0);
}

function _wish_drop_spec(obj) {
    const g = game, u = g.u || {};
    const airOrWater = Is_airlevel(u.uz) || Is_waterlevel(u.uz);
    const wishedCorpse = (obj.otyp | 0) === 265 && !!obj.wishedfor;
    const verb = (Is_airlevel(u.uz) || u.uinwater) ? 'slip'
        : wishedCorpse ? 'materialize' : 'drop';
    const celltyp = g.level?.locations?.[u.ux | 0]?.[u.uy | 0]?.typ | 0;
    const fmt = u.uswallow ? 'Oops!  %s out of your reach!'
        : (airOrWater || celltyp < IRONBARS || celltyp >= ICE)
            ? 'Oops!  %s away from you!'
            : !wishedCorpse ? 'Oops!  %s to the floor!'
                : 'Careful! %s on the floor!';
    return { fmt, arg: The(aobjnam(obj, verb)) };
}

async function _wish_drop_overburdened(obj, dropSpec) {
    const u = game.u || {};
    await pline(dropSpec.fmt.replace('%s', dropSpec.arg));
    obj.nomerge = 0;
    if (can_reach_floor(true) || u.uswallow)
        await dropx(obj);
    else {
        freeinv(obj);
        await hitfloor(obj, false);
    }
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
async function _wish_addinv_prinv(otmp, dropSpec) {
    const g = game;

    /* C ref: hold_another_object snapshots go.oldcap before addinv; encumber_msg
     * compares near_capacity() to it after the object is in inventory.  RNG-free. */
    const _oldcap = near_capacity();
    const _pickupBurden = _pickup_burden_level(g.flags?.pickup_burden);
    const _dropCap = Math.max(_oldcap, _pickupBurden);
    const _oquan = (otmp.quan ?? 1) | 0;

    /* observe_object itself carries C's o_init.c:447 `!Hallucination` and
     * FIRST_OBJECT guards: a hallucinating hero's wish leaves dknown unset, so a
     * known-type tool still prints its appearance ("a glass orb"). */
    if (!_wish_Blind() && (otmp.otyp | 0) >= 0)
        observe_object(otmp); /* RNG-free */

    if (_wish_Fumbling()) {
        otmp.nomerge = 1;
        otmp = (await addinv_core0(otmp, null, false));
        await _wish_drop_overburdened(otmp, dropSpec);
        return;
    }

    if ((otmp.otyp | 0) === 265 && !u_safe_from_fatal_corpse(otmp, 0x0F) && otmp.wishedfor) {
        otmp.wishedfor = 0;
        otmp = (await addinv_core0(otmp, null, false));
        await _wish_drop_overburdened(otmp, dropSpec);
        return;
    }

    /* C invent.c:1108-1114 addinv_core0 — merge into the first mergable stack
     * (reusing its invlet) before falling back to a new letter.  When merged,
     * the wished object's quantity folds into the existing node and NO new
     * invlet is consumed; C still prinv()s, but with the surviving (merged)
     * object and its existing letter. */
    /* C invent.c:1100-1114 — merge with the quiver in preference to any other
     * inventory slot, then the chain; each test is a full mergable() call
     * (async only on the never-taken unpaid path). */
    let _wmerge = null;
    if (g.u?.uquiver && (await _wish_mergable(g.u.uquiver, otmp))) {
        _wmerge = g.u.uquiver;
    } else {
        for (let o = g.invent; o; o = o.nobj) {
            if (await _wish_mergable(o, otmp)) { _wmerge = o; break; }
        }
    }
    for (let o = _wmerge; o; o = null) {
        if (o) {
            /* C invent.c:1082 addinv_core0 — addinv_core1(obj) runs BEFORE the
             * merge loop, so merged gold still sets disp.botl and the prinv
             * pline's flush_screen runs bot() (repainting T: too). */
            await addinv_core1(otmp);
            /* C invent.c:856-875 — reconcile knowledge dimensions; if a real
             * discovery happened, C fires the comparison pline
             * (invent.c:934-942, otmp->where==OBJ_INVENT and neither
             * how_lost==LOST_THROWN — both true for a wished stack already held). */
            let discovered = false;
            const oquan = ((otmp.quan ?? 1) | 0); /* prinv's quan arg = wished obj's quan */
            if (otmp.globby) {
                /* invent.c:928-931 — globs absorb (pudding_merge_message +
                 * obj_absorb) instead of adding quantity. */
                await merged_glob({ o }, { o: otmp });
            } else {
            /* C invent.c:820-834 merged() — approximate age, weighted by the
             * PRE-merge quantities (skipped for lit objects and globs; globs
             * took the branch above).  Without it a wished food stack kept
             * the old age and doeat skipped/ran the rn2(7) rot roll
             * (eat.c:3028-3031) differently from C. */
            if (!otmp.lamplit && ((o.quan ?? 1) | 0) + oquan)
                o.age = Math.trunc((((o.age | 0) * ((o.quan ?? 1) | 0))
                    + ((otmp.age | 0) * oquan)) / (((o.quan ?? 1) | 0) + oquan));
            o.quan = ((o.quan ?? 1) | 0) + oquan;
            /* C invent.c:838-842 merged(): recompute the combined stack's
             * weight before knowledge reconciliation and encumbrance checks. */
            o.owt = weight(o);
            /* C invent.c:838-839 — merged() clears bknown on merged gold
             * before comparing the id dimensions (:871) */
            if ((o.oclass | 0) === COIN_CLASS_WZ) o.bknown = 0;
            /* C invent.c:843-844 — an unnamed survivor inherits the incoming
             * stack's name before the merged stack is displayed. */
            if (!has_oname(o) && has_oname(otmp))
                await oname(o, ONAME(otmp), ONAME_SKIP_INVUPD);
            /* C invent.c:852-854 merged(): the folded-in object's timers are
             * stopped ("follows lights"); otherwise a corpse timer keeps
             * pointing at a freed object and save_timers_level panics. */
            if (otmp.timed)
                obj_stop_timers(otmp);
            discovered = _wish_merged_reconcile(o, otmp);
            }
            /* C invent.c:851-854 merged(): stop the absorbed stack's timers. */
            if (otmp.timed && !otmp.globby)
                obj_stop_timers(otmp);
            if (discovered) {
                /* C invent.c:941: prinv's following message joins this pline
                 * when topl.c:262-264's width check leaves room for --More--. */
                await pline('You learn more about your items by comparing them.');
            }
            const _c2msgs = [];
            o.pickup_prev = 1;
            addinv_core2(o, _c2msgs);
            let _c2last = _c2msgs.pop();
            for (const m of _c2msgs)
                await force_more(m);
            if (_c2last && (inv_cnt(false) > 52
                || (((o.otyp | 0) !== 471 || !o.cursed)
                    && near_capacity() > _dropCap))) {
                await force_more(_c2last);
                _c2last = undefined;
            }
            if (inv_cnt(false) > 52
                || (((o.otyp | 0) !== 471 || !o.cursed)
                    && near_capacity() > _dropCap)) {
                let dropped = o;
                if (o.quan > _oquan)
                    dropped = (await splitobj(o, _oquan));
                await _wish_drop_overburdened(dropped, dropSpec);
                return;
            }
            /* C invent.c:1282-1286 hold_another_object — autoquiver fills an empty quiver. */
            if (game.flags?.autoquiver && !game.u.uquiver && !o.owornmask
                && (is_missile(o) || ammo_and_launcher(o, game.u.uwep)
                    || ammo_and_launcher(o, game.u.uswapwep)))
                await setuqwep(o);
            let prinvLine = null;
            if (o.invlet) {
                _wish_obj_to_let(o);
                const total_of = (oquan > 0 && oquan < (o.quan | 0));
                const dot = total_of ? '' : '.';
                /* prinv prints the merged stack with quan=oquan (xprname's quan
                 * arg), not the merged total. */
                const totalbuf = (total_of && g.flags?.verbose) ? ` (${o.quan | 0} in total).` : '';
                prinvLine = `${String.fromCharCode(o.invlet | 0)} - ${(await _wish_doname(o, oquan))}${dot}${totalbuf}`;
                if (_c2last && _wish_core2_pages(_c2last, prinvLine)) {
                    await force_more(_c2last);
                    _c2last = undefined;
                }
                if (!g._topl_win_stop) /* topl.c:257 skip: ESC at the --More-- suppresses prinv's paint */
            _wish_prinv_flush_record(_c2last || g._resultMessage, prinvLine);
        if (!g._topl_win_stop) /* topl.c:257 skip: ESC at the --More-- suppresses prinv's paint */
                g._resultMessage = _c2last ? _c2last + '  ' + prinvLine
                    : g._resultMessage ? g._resultMessage + '  ' + prinvLine : prinvLine;
                _wish_prinv_owns_stop(prinvLine);
                _c2last = undefined;
            }
            if (_c2last) await force_more(_c2last);
            await _wish_encumber_msg(_oldcap, prinvLine);
            return;
        }
    }

    if ((otmp.oclass | 0) === COIN_CLASS_WZ) {
        otmp.invlet = 0x24; /* GOLD_SYM '$' */
        g._botlGoldStale = undefined;
    } else {
        const inuse = new Array(52).fill(false);
        for (let obj = g.invent; obj; obj = obj.nobj) {
            if (obj === otmp) continue;
            const i = obj.invlet | 0;
            if (97 <= i && i <= 122) inuse[i - 97] = true;        /* a-z */
            else if (65 <= i && i <= 90) inuse[i - 65 + 26] = true; /* A-Z */
            /* C: if (i == otmp->invlet) otmp->invlet = 0; */
            if (i === (otmp.invlet | 0)) otmp.invlet = 0;
        }
        /* C: if otmp already holds a valid a-zA-Z letter, keep it. */
        const cur = otmp.invlet | 0;
        if (cur && ((97 <= cur && cur <= 122) || (65 <= cur && cur <= 90))) {
            /* keep otmp.invlet */
        } else {
            const last = (g._lastinvnr ?? 51) | 0;
            let i;
            for (i = last + 1; i !== last; i++) {
                if (i === 52) { i = -1; continue; }
                if (!inuse[i]) break;
            }
            otmp.invlet = inuse[i] ? 0x23 /*NOINVSYM '#'*/ : (i < 26 ? (97 + i) : (65 + i - 26));
            g._lastinvnr = i;
        }
    }
    /* C invent.c:1082 addinv_core0 — addinv_core1(obj) runs first on every path:
     * u.uhave.amulet = 1 + record_achievement(ACH_AMUL) etc.  Without it a
     * wished Amulet never arms allmain.c:446's "bestowing a wish" block. */
    await addinv_core1(otmp);
    otmp.where = OBJ_INVENT_WIZ;
    const fixedLetters = g.flags?.invlet_constant ?? true;
    if (fixedLetters || !g.invent) {
        otmp.nobj = g.invent ?? null;
        g.invent = otmp;
        if (fixedLetters) reorder_invent();
    } else {
        let prev = g.invent;
        while (prev.nobj) prev = prev.nobj;
        prev.nobj = otmp;
        otmp.nobj = null;
    }
    const _core2msgs = [];
    otmp.pickup_prev = 1;
    addinv_core2(otmp, _core2msgs);
    carry_obj_effects(otmp); /* C invent.c:1144 (cursed figurine timer) */
    /* C invent.c:1040's pline is committed and paged HERE rather than inside
     * addinv_core2: prinv's own pline is what more()s it in C, and this port's
     * prinv line goes through game._resultMessage, which does not page a
     * predecessor.  Same treatment invent.c:941's compare-items line already
     * gets in the merge branch above. */
    let _c2last = _core2msgs.pop();
    for (const m of _core2msgs)
        await force_more(m);
    if (inv_cnt(false) > 52
        || (((otmp.otyp | 0) !== 471 || !otmp.cursed)
            && near_capacity() > _dropCap)) {
        if (_c2last) await force_more(_c2last);
        await _wish_drop_overburdened(otmp, dropSpec);
        return;
    }
    /* C invent.c:1282-1286 hold_another_object — autoquiver fills an empty quiver. */
    if (game.flags?.autoquiver && !game.u.uquiver && !otmp.owornmask
        && (is_missile(otmp) || ammo_and_launcher(otmp, game.u.uwep)
            || ammo_and_launcher(otmp, game.u.uswapwep)))
        await setuqwep(otmp);
    /* C invent.c:2889 prinv — "<invlet> - <doname>." on the topline. */
    let prinvLine = null;
    if (otmp.invlet) {
        _wish_obj_to_let(otmp);
        prinvLine = `${String.fromCharCode(otmp.invlet | 0)} - ${(await _wish_doname(otmp))}.`;
        if (_c2last && _wish_core2_pages(_c2last, prinvLine)) {
            await force_more(_c2last);
            _c2last = undefined;
        }
        if (!g._topl_win_stop) /* topl.c:257 skip: ESC at the --More-- suppresses prinv's paint */
            _wish_prinv_flush_record(_c2last || g._resultMessage, prinvLine);
        if (!g._topl_win_stop) /* topl.c:257 skip: ESC at the --More-- suppresses prinv's paint */
                g._resultMessage = _c2last ? _c2last + '  ' + prinvLine
                    : g._resultMessage ? g._resultMessage + '  ' + prinvLine : prinvLine;
        _wish_prinv_owns_stop(prinvLine);
        _c2last = undefined;
    }
    if (_c2last) await force_more(_c2last);
    await _wish_encumber_msg(_oldcap, prinvLine);
}

/* C topl.c:232-234 + :257: an ESC at the decipher page force_more()d just
 * above sets WIN_STOP inside prinv's OWN update_topl, after its skip sample,
 * so prinv still paints (:300) but every later pline of this wish --
 * encumber_msg's "Your movements are slowed slightly because of your load."
 * (pickup.c:1979) -- is skipped: no paint, no more().  _topl_more only ARMS
 * the bit; pline() turns it live in its owner, and prinv bypasses pline(). */
function _wish_prinv_owns_stop(prinvLine) {
    const g = game;
    if (!g._topl_win_stop_armed) return;
    g._topl_win_stop_armed = false;
    g._topl_win_stop = true;
    g._topl_win_stop_buf = prinvLine;
}

/* C topl.c:262-265 update_topl(): prinv's pline joins the standing
 * TOPLINE_NEED_MORE topline ("You decipher the label on your scroll.") when
 * n0 + strlen(gt.toplines) + 3 < CO - 8, and only pages (more()) when it does
 * not.  Returns true when the deferred message must be paged now. */
function _wish_core2_pages(deferred, prinvLine) {
    return !prinvLine || (deferred.length + 2 + prinvLine.length) >= TOPL_LIMIT;
}

/* C invent.c prinv -> pline.c:274-277: prinv's vpline() flushes the screen
 * BEFORE update_topl() more()s the line standing ahead of it, so a page that
 * prinv raises freezes the map as of here -- before allmain.c:454-470's
 * Warning see_monsters() paints a wished artifact's warnings.  This path
 * publishes prinv through _resultMessage, not pline(), and makewish merges
 * any standing _pending_message ahead of it; key the frame where that puts
 * prinv's boundary.  `head` is the text joined in front of prinvLine. */
function _wish_prinv_flush_record(head, prinvLine) {
    /* the flush below runs bot() and clears disp.botl; remember whether it was
     * owed (touch_artifact's blast losehp) so encumber_msg sees the post-add cap */
    game._wishBotlOwedAtPrinv = !!(game.disp && (game.disp.botl || game.disp.botlx)); /* flush_screen: botl || botlx (display.c:2286) */
    const pend = game._pending_message ? String(game._pending_message) : '';
    const before = (pend ? pend.length + 2 : 0) + (head ? String(head).length + 2 : 0);
    /* C pline.c:266-272 vpline(): prinv's pline recalculates vision before its
     * flush_screen, so a wished lit candle/lamp (begin_burn set
     * vision_full_recalc) lights its surroundings in the --More-- frame. */
    if (game.vision_full_recalc) vision_recalc(0);
    if (!before)
        return;
    pline_flush_point();
    _pline_flush_frame_record(before - 2, prinvLine);
}

/* C ref: zap.c:6160 #define MAXWISHTRY 5 */
const MAXWISHTRY = 5;

/* C ref: flag.h iflags.cmdassist — defaults TRUE (options.c), cleared only by
 * "!cmdassist" in the config file.  Same reading js/lock.js's cmdassist_on()
 * does for help_dir; duplicated rather than imported because lock.js already
 * imports from this file's import graph and the value is one field read. */
function _wish_cmdassist_on() {
    const v = game.iflags?.cmdassist;
    return v === undefined ? true : !!v;
}

/* C ref: zap.c:6190-6221 wishcmdassist(int triesleft) — the "enter 'help' for
 * assistance" text window.  create_nhwindow(NHW_TEXT) + putstr per line +
 * display_nhwindow(win, TRUE); tty paints it full-screen with a --More-- per
 * 23-row page, which is what display_text_window() models.
 *
 *     retry_info[] = "If you specify an unrecognized object name %s%s time%s,"
 *     cardinals[]  = { "zero", "one", "two", "three", "four", "five" }
 *     Sprintf(buf, retry_info,
 *             (triesleft >= 0 && triesleft < SIZE(cardinals))
 *                ? cardinals[triesleft] : too_many,
 *             (triesleft < MAXWISHTRY) ? " more" : "",
 *             plur(triesleft));
 *
 * plur(x) is hack.h:1245 `(((x) == 1L) ? "" : "s")`.
 * DISPLAY-CHANNEL ONLY: no RNG. */
const WISHINFO_LINES = [
    'Wish details:',
    '',
    'Enter the name of an object, such as "potion of monster detection",',
    '"scroll labeled README", "elven mithril-coat", or "Grimtooth"',
    '(without the quotes).',
    '',
    'For object types which come in stacks, you may specify a plural name',
    'such as "potions of healing", or specify a count, such as "1000 gold',
    'pieces", although that aspect of your wish might not be granted.',
    '',
    'You may also specify various prefix values which might be used to',
    'modify the item, such as "uncursed" or "rustproof" or "+1".',
    'Most modifiers shown when viewing your inventory can be specified.',
    '',
    "You may specify 'nothing' to explicitly decline this wish.",
];
const WISH_CARDINALS = ['zero', 'one', 'two', 'three', 'four', 'five'];

async function wishcmdassist(triesleft) {
    const lines = WISHINFO_LINES.slice();
    /* C zap.c:6203-6204 — the wishless-conduct note, shown while no wish has
     * been granted yet.  u.uconduct.wishes is bumped below in makewish(). */
    if (!(game.u?.uconduct?.wishes | 0))
        lines.push('Doing so will preserve \'wishless\' conduct.');
    lines.push('');
    const cardinal = (triesleft >= 0 && triesleft < WISH_CARDINALS.length)
        ? WISH_CARDINALS[triesleft] : 'too many';
    lines.push(`If you specify an unrecognized object name ${cardinal}`
               + `${triesleft < MAXWISHTRY ? ' more' : ''}`
               + ` time${triesleft === 1 ? '' : 's'},`);
    lines.push('a randomly chosen item will be granted.');
    lines.push('');
    if (_wish_cmdassist_on())
        lines.push('(Suppress this assistance with !cmdassist in your config file.)');
    await display_text_window(lines);
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

/* THE one makewish().  C has a single makewish() (zap.c:6307) shared by every
 * wish source: wiz_wish (wizcmds.c:38), the wand of wishing (zap.c:2578), the
 * throne (sit.c:110 and sit.c:251), the Amulet's first-pickup wish
 * (allmain.c:507), a resumed wish (allmain.c:241) and mongrantswish
 * (potion.c:2811).  Exported so js/zap.js's zapnodir() resolves to this body
 * instead of the throw-stub it used to carry. */
export async function makewish() {
    const g = game;
    if (g.context) g.context.resume_wish = 0; // C zap.c:6323
    const oldWisharti = g.u?.uconduct?.wisharti | 0; // C zap.c:6321: before readobjnam().

    /* C zap.c:6317 `struct obj otmp, nothing;` + zap.c:6323
     *     nothing = cg.zeroobj;   [lint suppression; only its address matters]
     * — the "wished for 'nothing'" sentinel is an ADDRESS, distinct both from
     * NULL and from any real object.  This port passed `null` for it, which
     * collapsed C's THREE readobjnam outcomes (an object / the nothing sentinel
     * / NULL = no such object) into two.  A fresh object literal restores the
     * distinction: it is `===`-comparable and can never be a mksobj result. */
    const nothing = {};

    /* C zap.c:6319-6320: if (flags.verbose) You("may wish for an object.");
     * wiz_wish (wizcmds.c:35-40) clears flags.verbose around its call, so the
     * Ctrl+W path prints nothing; the wand / throne / Amulet paths do print. */
    if (g.flags && g.flags.verbose)
        await pline('You may wish for an object.');

    /* C zap.c:6316-6376 — the `retry:` loop.  tries counts REFUSED wishes only;
     * the "help" arm re-prompts without incrementing it. */
    let otmp = null;
    let tries = 0;
    let wishedText = '';
    for (;;) {
        let promptbuf = 'For what do you wish';
        if (_wish_cmdassist_on() && tries > 0)
            promptbuf += " (enter 'help' for assistance)";
        promptbuf += '?';

        let buf;
        if (g.iflags?.menu_requested && wish_history_has() && tries === 0)
            buf = (await wish_history_menu()) ?? '';
        else
            buf = await getlin(promptbuf);

        // C zap.c:6337-6341: defer an interrupted wish until the terminal returns.
        if (g.iflags?.term_gone) {
            if (!g.iflags.debug_fuzzer)
                g.context.resume_wish = 1;
            return;
        }

        /* C zap.c:6343: (void) mungspaces(buf);
         * C zap.c:6344-6350:
         *     if (buf[0] == '\033') buf[0] = '\0';
         *     else if (!strcmpi(buf, "help")) { wishcmdassist(MAXWISHTRY - tries);
         *                                       buf[0] = '\0'; goto retry; } */
        const wishstr = (buf === '\x1b') ? '' : buf.trim().replace(/\s+/g, ' ');
        if (wishstr.toLowerCase() === 'help') {
            await wishcmdassist(MAXWISHTRY - tries);
            continue;
        }

        /* C zap.c:6360: otmp = readobjnam(buf, &nothing) */
        otmp = await readobjnam(wishstr || null, nothing);

        /* C zap.c:6361-6368:
         *     if (!otmp) {
         *         pline("Nothing fitting that description exists in the game.");
         *         if (++tries < MAXWISHTRY) goto retry;
         *         pline1(thats_enough_tries);
         *         otmp = readobjnam((char *) 0, (struct obj *) 0);
         *         if (!otmp) return;
         *     }
         * The final readobjnam(NULL, NULL) is the `goto any` entry — a random
         * class via rn2(SIZEOF_WRPSYM) then mkobj — i.e. after five refusals C
         * grants the random object it was withholding.  This port granted that
         * random object on the FIRST refusal and never printed a word. */
        if (!otmp) {
            await pline('Nothing fitting that description exists in the game.');
            if (++tries < MAXWISHTRY)
                continue;
            /* decl.c:42 c_thats_enough_tries = "That's enough tries!" */
            await pline("That's enough tries!");
            otmp = await readobjnam(null, null);
            if (!otmp)
                return; /* C: for safety; should never happen */
        } else if (otmp === nothing) {
            /* C zap.c:6369-6373 — explicitly declined the wish. */
            livelog_printf(LL_WISH, 'declined to make a wish');
            return;
        } else if (otmp === hands_obj) {
            wish_history_add(wishstr);
            /* C zap.c:6373-6377 — terrain success: no object to hold,
             * no wish-conduct increment, and no ublesscnt adjustment.
             * DEBUG wish-history storage is not yet modeled by makewish. */
            return;
        }
        wishedText = wishstr;
        wish_history_add(wishstr);
        break;
    }

    // C zap.c:6381-6384: a granted artifact wish is already known to the hero.
    if (otmp.oartifact)
        _artifact_origin(otmp, ONAME_WISH | ONAME_KNOW_ARTI);

    const _wishPendingSrc = g._pending_message;
    const _wishPendingJoins = _topl_joins_snapshot(_wishPendingSrc);

    /* C zap.c:6437: hold_another_object(otmp, ...) — when the wished object is
     * an artifact, invent.c:1208 hold_another_object calls touch_artifact()
     * (artifact.c:908) on the hero before the object is added to inventory.
     * That is where the rn2(4) blast roll happens, and it must precede the
     * rn1(100,50) below (Cardinal Rule 2: RNG order).  Non-artifact wishes
     * consume no RNG here.  We model only touch_artifact's RNG; the
     * inventory/encumbrance bookkeeping consumes none. */
    /* C zap.c:6387-6397: readobjnam() increments wisharti even for an
     * artifact already wished for; only its first transition breaks conduct.
     * Preserve that event's text and flags for the chronicle. */
    if (otmp) {
        const _u = g.u || (g.u = {});
        _u.uconduct = _u.uconduct || {};
        const oldWishes = _u.uconduct.wishes | 0;
        const wisharti = _u.uconduct.wisharti | 0;
        const artifactFlag = oldWisharti < wisharti ? LL_ARTIFACT : 0;
        const possessive = g.flags?.female ? 'her' : 'his';
        const wish = `"${wishedText}", got "${(await _wish_doname(otmp))}"`;
        if (!oldWishes) {
            gamelog_add(LL_CONDUCT | LL_WISH | artifactFlag, g.moves | 0,
                `made ${possessive} first wish - ${wish}`);
        } else if (!oldWisharti && wisharti) {
            gamelog_add(LL_CONDUCT | LL_WISH | LL_ARTIFACT, g.moves | 0,
                `made ${possessive} first artifact wish - ${wish}`);
        } else {
            gamelog_add(LL_WISH | artifactFlag, g.moves | 0, `wished for ${wish}`);
        }
        _u.uconduct.wishes = (_u.uconduct.wishes | 0) + 1;
    }

    /* C zap.c:6402-6419 evaluates both strings passed to
     * hold_another_object before that helper observes, touches, or merges the
     * object.  Keep the rendered argument immutable so an overburdened wish
     * cannot disclose an appearance learned during addinv(). */
    /* C zap.c:6401-6402 */
    if (otmp && (otmp.otyp | 0) === 265 /* CORPSE */ && !u_safe_from_fatal_corpse(otmp, 0x0F /* st_all */))
        otmp.wishedfor = 1;
    const _wishDropSpec = otmp ? _wish_drop_spec(otmp) : null;

    let _wishRefused = false;
    if (otmp && (otmp.oartifact | 0)) {
        if (!_wish_Blind())
            observe_object(otmp); /* o_init.c:447 skips under Hallucination */
        /* C invent.c:1218-1231 */
        const wasUpolyd = Upolyd(g.u);
        place_object(otmp, g.u.ux | 0, g.u.uy | 0);
        const canTouch = await touch_artifact_youmonst(otmp);
        /* C invent.c:1232-1238: a blast which ends polymorph also loses
         * the hero's grip; the artifact never enters inventory. */
        const lostGrip = canTouch && wasUpolyd && !Upolyd(g.u);
        if (lostGrip)
            await pline(_wishDropSpec.fmt.replace('%s', _wishDropSpec.arg));
        remove_object(otmp);
        if (!canTouch || lostGrip) {
            await dropy(otmp);
            _wishRefused = true;
        }
    }

    if (otmp && !_wishRefused && (otmp.oclass | 0) !== 0) {
        const blastMsg = g._touch_artifact_blast_msg;
        if (blastMsg) {
            g._touch_artifact_blast_msg = null;
            await pline(blastMsg);
        }
        await _wish_addinv_prinv(otmp, _wishDropSpec);
    }

    if (g._pending_message && g._resultMessage) {
        const _pj = (g._pending_message === _wishPendingSrc)
            ? _wishPendingJoins : _topl_joins_snapshot(g._pending_message);
        g._resultMessage = _topl_merge_result(
            g._pending_message, g._resultMessage, _pj || undefined);
        g._pending_message = '';
    }

    /* C zap.c:6438: u.ublesscnt += rn1(100, 50)  = rn2(100)+50 */
    if (!g.u) g.u = {};
    g.u.ublesscnt = (g.u.ublesscnt | 0) + rn2(100) + 50;

    /* NOTE: C's makewish() never touches svc.context.move.  "A wish costs no
     * turn" is wiz_wish's ECMD_OK return (wizcmds.c:42), not a property of
     * makewish — the wand of wishing (zap.c:2578) DOES consume the zap's turn.
     * The `g.context.move = 0` that used to live here is therefore set by
     * wiz_wish() below, where C puts it. */
    return otmp;
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
    const NUM_OBJECTS = 480;
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
        lines.push(`${String(prob).padStart(4)} / ${String(probsum[oclass]).padStart(4)} (${pct.padStart(6)}%): ${OC_NAME[otyp]}`);
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
    const count = parseInt(inbuf, 10) || 0;
    const mongen_saved = g.iflags.debug_mongen;
    g.iflags.debug_mongen = false;
    for (let n = Math.min(Math.abs(count), (COLNO - 1) * ROWNO); n > 0; --n) {
        const mon = count < 0 ? g.fmon : await makemon(rndmonst(), 0, 0, MM_NOMSG);
        if (mon) await migrate_to_level(mon,
            tolevel.dlevel + g.dungeons[tolevel.dnum].ledger_start, MIGR_RANDOM, null);
    }
    g.iflags.debug_mongen = mongen_saved;
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

/* C mondata.c:501 mstrength_ranged_attk() */
function mstrength_ranged_attk(mattk) {
    const atk_mask = (1 << 12 /* AT_BREA */) | (1 << 10 /* AT_SPIT */) | (1 << 15 /* AT_GAZE */);
    for (let i = 0; i < NATTK; i++) {
        const j = mattk[i].aatyp;
        if (j >= 254 /* AT_WEAP */ || (j < 32 && (atk_mask & (1 << j)) !== 0))
            return true;
    }
    return false;
}

/* C mondata.c:428 mstrength(ptr) — rows from makemon_{mons,ac,mattk,pmnames}.json */
function mstrength(mndx) {
    const row = monsPack.mons[mndx], ac = monAcPack.ac[mndx];
    const mattk = monMattkPack.mattk[mndx], name = monPmnamesPack.pmnames[mndx][2];
    const geno = row[3], mflags2 = row[7] >>> 0, mmove = row[9];
    let tmp = row[1], n;
    if (tmp > 49) /* special fixed hp monster */
        tmp = Math.trunc(2 * (tmp - 6) / 4);
    n = (geno & 0x0080 /* G_SGROUP */) ? 1 : 0;
    n += ((geno & 0x0040 /* G_LGROUP */) ? 1 : 0) << 1;
    if (mstrength_ranged_attk(mattk)) n++;
    n += (ac < 4) ? 1 : 0;
    n += (ac < 0) ? 1 : 0;
    n += (mmove >= 18) ? 1 : 0;
    for (let i = 0; i < NATTK; i++) {
        const tmp2 = mattk[i].aatyp;
        n += (tmp2 > 0) ? 1 : 0;
        n += (tmp2 === 255 /* AT_MAGC */) ? 1 : 0;
        n += (tmp2 === 254 /* AT_WEAP */ && (mflags2 & 0x04000000 /* M2_STRONG */)) ? 1 : 0;
        if (tmp2 === 13 /* AT_EXPL */) {
            const tmp3 = mattk[i].adtyp;
            n += (tmp3 === 3 /* AD_COLD */ || tmp3 === 2 /* AD_FIRE */) ? 3
                : (tmp3 === 6 /* AD_ELEC */) ? 5 : 0;
        }
    }
    for (let i = 0; i < NATTK; i++) {
        const tmp2 = mattk[i].adtyp;
        if (tmp2 === 15 || tmp2 === 18 || tmp2 === 7 || tmp2 === 30
            || tmp2 === 31 || tmp2 === 29) /* DRLI STON DRST DRDX DRCO WERE */
            n += 2;
        else if (name !== "grid bug")
            n += (tmp2 !== 0 /* AD_PHYS */) ? 1 : 0;
        n += (mattk[i].damd * mattk[i].damn > 23) ? 1 : 0;
    }
    if (name === "leprechaun") n -= 2;
    if (name === "killer bee" || name === "soldier ant") n += 2;
    if (n === 0) tmp -= 1;
    else if (n < 6) tmp += Math.trunc(n / 3) + 1;
    else tmp += Math.trunc(n / 2);
    return (tmp >= 0) ? tmp : 0;
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
