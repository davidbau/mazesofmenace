// @ts-nocheck
// wizcmds.js — Wizard-mode extended commands.
// C ref: nethack-c/src/wizcmds.c — wiz_level_change() and related.
// Hand-maintained JS (not tsc-emitted). Sibling imports from js/*.js.
import { u_safe_from_fatal_corpse } from './pickup.js';
import { game, wizard } from './gstate.js';
import { COLNO } from './const.js';
const IN_SIGHT_BIT = 0x2; /* vision.h IN_SIGHT */
import { s_suffix as _ta_s_suffix } from './hacklib.js';
import { nhgetch } from './input.js';
import { oc_merge } from './oc_merge.generated.js';
import { pline, flash_mon, canspotmon, unmap_invisible, gamelog_add } from './display.js';
import { topl_park_cursor } from './display.js';
import { flush_screen, force_more, _topl_record_join, capture_painted_frame,
         _topl_merge_result, _topl_joins_snapshot } from './display.js';
import { display_text_window } from './com_pager.js';
import { displayLookWindow } from './look-window.js';
import { pluslvl, losexp } from './exper.js';
import { findit, wish_history_add, wish_history_menu, wish_history_has } from './zap.js';
import { rn2, d, rnd } from './rng.js';
import { quest_info, readobjnam, hands_obj, getObjDescr, xname_scroll, xname_spellbook, xname_amulet, xname_armor, xname_weapon, xname_oname_tail, xname, the, The, aobjnam, Tobjnam, doname as doname_real } from './objnam.js';
import { discover_object, observe_object } from './o_init.js';
import { near_capacity, stagger_verb } from './weight.js';
import { exercise } from './attrib.js';
import { losehp } from './dokick.js';
import { MKOBJ_OC_MATERIAL } from './mkobj_erosion_meta.js';
import { hates_silver, name_to_mon, name_to_monclass, permonstTemplate, monPmname, set_malign, mkclass, rndmonst, splitobj } from './makemon.js';
import { makemon, newcham, engravings_list, mongone } from './mklev.js';
import { count_wsegs } from './worm.js';
import { tamedog } from './dog.js';
import { put_saddle_on_mon } from './steed.js';
import { is_pool } from './look.js';
import { light_sources_list } from './light.js';
import { region_stats_snapshot, any_visible_region } from './region.js';
import { property_by_index } from './timeout.js';
import { cant_revive } from './read.js';
import { PM_LONG_WORM_TAIL, PM_LONG_WORM, PM_STALKER, PM_DEATH, PM_FAMINE, PM_PESTILENCE } from './pm.generated.js';
import monsPack from './makemon_mons.json' with { type: 'json' };
/* y_n_default is C's y_n() (hack.h:1329 y_n(q) := yn_function(q, ynchars, 'n',
 * TRUE)); it lives in js/cmd.js, which already imports this file — the cycle is
 * the tree's norm (20+ modules import from cmd.js) and both sides are hoisted
 * function declarations, so the binding resolves at call time. */
import { setuqwep, y_n_default, addinv_core2, reorder_invent, inv_cnt, dropx, freeinv, hitfloor, getpos, addinv_core1, dropy, carry_obj_effects } from './cmd.js';
import { place_object, remove_object } from './mklev.js';
import { m_at, mon_nam, xkilled, XKILL_NOMSG } from './uhitm.js';
import { dmonsfree } from './mkmaze.js';
import { flip_level, flip_level_rnd } from './sp_lev.js';
import { docrt } from './display.js';
import { yn_function } from './end.js';
import { bury_objs } from './zap.js';
import { addinv_core0, can_reach_floor, is_missile, ammo_and_launcher } from './hold_another_object.js';
import { A_WIS, KILLED_BY, ANTIMAGIC, HALF_PHDAM, LOW_PM, ECMD_OK, MM_MINVIS,
         Is_airlevel, Is_waterlevel, IRONBARS, ICE, FUMBLING, COLD_RES, LS_OBJECT, LS_MONSTER,
         LL_CONDUCT, LL_WISH } from './const.js';

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
const _ARTI_ALIGN_VALUE = [1, 0, -1];

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

/* Bare xname() body (no article, no count) for the touch_artifact blast
 * message.  C artifact.c:951 formats s_suffix(the(xname(obj))), not doname(),
 * so this keeps its own per-oclass xname_* routing. */
function _ta_xname(otmp) {
    const oclass = otmp.oclass | 0;
    if (oclass === 2 /* WEAPON */ || oclass === 6 /* TOOL */ || oclass === 17 /* VENOM */)
        return xname_weapon(otmp);
    if (oclass === 3 /* ARMOR */)  return _wish_xname_named_tail(otmp, xname_armor(otmp));
    if (oclass === 5 /* AMULET */) return _wish_xname_named_tail(otmp, xname_amulet(otmp));
    if (oclass === 9 /* SCROLL */) return _wish_xname_named_tail(otmp, xname_scroll(otmp));
    if (oclass === 10 /* SPBOOK */) return _wish_xname_named_tail(otmp, xname_spellbook(otmp));
    const descr = getObjDescr(otmp.otyp | 0);
    const noun = _WISH_CLASS_NOUN[oclass];
    if (noun && descr != null)
        return _wish_xname_named_tail(otmp, `${descr} ${noun}`);
    if (noun) return _wish_xname_named_tail(otmp, noun);
    return xname(otmp); /* GEM_CLASS etc. (objnam.c:624) */
}

export async function touch_artifact_youmonst(otmp) {
    const g = game;
    g._touch_artifact_blast_msg = null; /* C artifact.c:913 touch_blasted = FALSE */
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
    const badclass = self_willed && ((p.role && !roleMatch) || p.race);
    /* C artifact.c:88-104 hack_artifacts(): "gift" artifacts of the hero's own
     * role (artifact.c:92-95) and the hero's quest artifact (:103) have their
     * alignment rewritten to the hero's initial alignment, so a Valkyrie
     * wishing for Mjollnir is never badalign and no rn2(4) is drawn. */
    let al = p.al;
    if (al !== A_NONE) {
        const initrole = (g.flags?.initrole ?? -1) | 0;
        if (_ARTI_GIFT_ROLE[arti] === initrole || arti === (quest_info(0) | 0)) {
            const ia = (g.flags?.initalign ?? 0) | 0;
            al = _ARTI_ALIGN_VALUE[ia] ?? al;
        }
    }
    let badalign = (p.spfx & SPFX_RESTR) !== 0
                   && al !== A_NONE
                   && (al !== ualignType || ualignRecord < 0);

    /* C artifact.c:941-942: if (!badalign) badalign = bane_applies(oart, mon).
     * bane_applies requires (spfx & SPFX_DBONUS) and spec_applies(hero).  For
     * the hero, SPFX_DFLAG2 banes only apply when the hero's own M2 flags (or
     * race selfmask / lycanthropy) match the bane's mtype, which is never the
     * case for these wishable banes against a non-matching hero; SPFX_DCLAS
     * matches the hero's monster letter, also never matching a @-class hero;
     * SPFX_DALIGN (Sceptre) is self_willed so its first clause governs.  No
     * hero-applicable bane reaches here, so bane_applies is FALSE. */

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
         *                     s_suffix(the(xname(obj)))) */
        g._touch_artifact_blast_msg =
            `You are blasted by ${_ta_s_suffix(the(_ta_xname(otmp)))} power!`;

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
        if (dmg >= ((u.uhp ?? 0) | 0) && g._touch_artifact_blast_msg) {
            const _bm = g._touch_artifact_blast_msg;
            g._touch_artifact_blast_msg = null;
            await pline(_bm);
        }
        await losehp(dmg, `touching ${_ta_xname(otmp)}`, KILLED_BY);
        /* C artifact.c:959 */
        exercise(A_WIS, false);
    }

    /* C artifact.c:962-971: badclass && badalign && self_willed → refuse (0). */
    if (badclass && badalign && self_willed) {
        const _blast = g._touch_artifact_blast_msg;
        if (_blast) {
            g._touch_artifact_blast_msg = null;
            await force_more(_blast);
        }
        if ((otmp.where | 0) !== OBJ_INVENT_WIZ)
            await pline(`${Tobjnam(otmp, 'evade')} your grasp!`);
        else
            await pline(`${Tobjnam(otmp, 'are')} beyond your control!`);
        return 0;
    }
    return 1; /* C artifact.c:973 */
}

export async function getlin(prompt) {
    const g = game;
    let buf = '';
    const renderPrompt = () => {
        g._pending_message = buf ? (prompt + ' ' + buf) : prompt;
    };
    const placeCursor = () => {
        const d = g.nhDisplay;
        if (d) topl_park_cursor(d, prompt + ' ' + buf);
    };
    if (g._pending_message) {
        /* Two different more()s, in C's order.  flush_screen() raises the
         * WIDTH-driven ones update_topl() would have raised as each message
         * arrived (the accumulated _pending_message is paged through
         * _topl_split_for_more and left holding the final remainder); the
         * force_more() after it is hooked_tty_getlin's own unconditional page
         * of that remainder.  Paging the whole accumulation in one force_more
         * instead renders it as a two-ROW topline, which is not a shape C's
         * tty ever produces. */
        await flush_screen(1);
        if (g._pending_message) await force_more(g._pending_message);
    }
    /* C hooked_tty_getlin displays the query through custompline(), whose
     * vpline() tail updates gp.prevmsg even though SUPPRESS_HISTORY keeps the
     * query out of message history.  Keep Norep's comparison state in sync. */
    g._prevmsg = prompt;
    const _saved_prompt_echo = g._topl_prompt_echo;
    g._topl_prompt_echo = true;
    /* C getline.c:67 custompline(OVERRIDE_MSGTYPE | SUPPRESS_HISTORY) and the
     * echo loop (getline.c:97 gt.toplines rebuild) never reach message
     * history; only the final "query answer" line is stored (see below). */
    const _saved_suppress = g._topl_suppress_history;
    g._topl_suppress_history = true;
    try {
    renderPrompt();
    await flush_screen(1);
    placeCursor();
    while (true) {
        const keyCode = await nhgetch();
        if (keyCode === 27 /* ESC */ || keyCode === 3 /* ^C */) {
            if (buf.length > 0) {
                buf = '';
                renderPrompt();
                await flush_screen(1);
                placeCursor();
                continue;
            }
            g._pending_message = '';
            return '\x1b'; /* ESC sentinel — C sets buf[0]='\033' */
        }
        if (keyCode === 13 /* CR */ || keyCode === 10 /* LF */) {
            break;
        }
        if (keyCode === 8 /* BS */ || keyCode === 127 /* DEL */) {
            if (buf.length > 0) buf = buf.slice(0, -1);
        } else if (keyCode >= 32 && keyCode < 127 && buf.length < COLNO) {
            /* getline.c:165-167 — bufp - obufp < BUFSZ - 1 && bufp - obufp < COLNO;
             * a longer line is refused (tty_nhbell) and the frame is unchanged. */
            buf += String.fromCharCode(keyCode);
        }
        renderPrompt();
        await flush_screen(1);
        placeCursor();
    }
    g._pending_message = '';
    /* C getline.c:97 leaves "query answer" in gt.toplines; the history ring
     * receives that single line (tty_getlin is not suppress_history here). */
    if (!_saved_suppress) {
        const line = prompt + ' ' + buf;
        if (!g._msg_history) g._msg_history = [];
        const h = g._msg_history;
        if (h.length === 0 || h[h.length - 1] !== line) h.push(line);
    }
    return buf;
    } finally {
        g._topl_suppress_history = _saved_suppress;
        /* C getline.c:319 — the read loop is over; the topline stops being a
         * TOPLINE_SPECIAL_PROMPT.  Restored rather than cleared, because
         * js/cmd.js's '#' prompt calls getlin-shaped code with the flag
         * already set and owns its own clear. */
        g._topl_prompt_echo = _saved_prompt_echo;
    }
}

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
        const mtmp = m_at(cc.x | 0, cc.y | 0);
        unmap_invisible(cc.x | 0, cc.y | 0);
        if (!mtmp) {
            await pline('There is no monster there.');
            break;
        }
        await pline(`You kill ${mon_nam(mtmp)}!`);
        await xkilled(mtmp, XKILL_NOMSG);
        if (g.u?.utotype) break;
    }
    dmonsfree();
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
 * ECMD_OK — does NOT consume a game turn (C returns ECMD_OK=0). */
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
        return;
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
        return;
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
            return;
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
            return;
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
function _wish_mergable(into, obj) {
    if (into === obj) return false;
    if ((into.otyp | 0) !== (obj.otyp | 0)) return false;
    if (obj.nomerge || into.nomerge) return false;
    if (!oc_merge(obj.otyp)) return false;
    /* C invent.c:4391-4393 — coins of the same kind will always merge */
    if ((obj.oclass | 0) === COIN_CLASS_WZ) return true;
    if ((obj.cursed | 0) !== (into.cursed | 0)) return false;
    if ((obj.blessed | 0) !== (into.blessed | 0)) return false;
    if ((obj.spe | 0) !== (into.spe | 0)) return false;
    /* C invent.c:4425 — dknown MUST match. */
    if ((obj.dknown | 0) !== (into.dknown | 0)) return false;
    /* FOOD oeaten/orotten match (mergable invent.c:4421) */
    if ((obj.oclass | 0) === 7) {
        if ((obj.oeaten | 0) !== (into.oeaten | 0)) return false;
        if ((obj.orotten | 0) !== (into.orotten | 0)) return false;
    }
    /* C invent.c mergable(): erosion level and grease must match. */
    if ((obj.oeroded | 0) !== (into.oeroded | 0)
        || (obj.oeroded2 | 0) !== (into.oeroded2 | 0)
        || (obj.greased | 0) !== (into.greased | 0)) return false;
    /* C invent.c mergable(): corpses/eggs/tins merge only for the same
     * monster type; hatching eggs never merge. */
    const ot = obj.otyp | 0;
    if (ot === 265 /* CORPSE */ || ot === 266 /* EGG */ || ot === 335 /* TIN */) {
        if ((obj.corpsenm ?? -1) !== (into.corpsenm ?? -1)) return false;
        if (ot === 266 && (obj.timed || into.timed)) return false;
    }
    /* C invent.c:4442-4446 — revivable corpses never merge (is_reviver:
     * mondata.h:170, S_TROLL or a Rider; MONS row[0] is mlet, S_TROLL = 46). */
    if (ot === 265 /* CORPSE */ && (into.corpsenm ?? -1) >= LOW_PM) {
        const n = into.corpsenm | 0;
        if ((monsPack.mons[n][0] | 0) === 46
            || n === PM_DEATH || n === PM_FAMINE || n === PM_PESTILENCE)
            return false;
    }
    return true;
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
        discovered = true;
    }
    return discovered;
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

async function _wish_encumber_msg(oldcap, prinvLine) {
    const g = game;
    const newcap = near_capacity();
    if (g.u) g.u._oldcap = newcap; /* C: go.oldcap = newcap at encumber_msg tail */
    if (oldcap === newcap) return;
    const msg = _wish_encumber_text(oldcap, newcap);
    if (!msg) return;
    if (g.disp) g.disp.botl = true;
    const prev = g._resultMessage;
    if (prev) {
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
                f.cap = (_goldPrinv ? newcap : oldcap) | 0;
                g._pickupEncPreFrame = f;
                g._pickupEncMorePending = { oldcap: (_goldPrinv ? newcap : oldcap) | 0, prinvText: prinvLine };
            }
        }
    } else {
        g._resultMessage = msg;
    }
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

/* C youprop.h:135 Fumbling := (HFumbling || EFumbling).  Unlike Blind, the
 * property has no blocked arm: blocked is not part of C's Fumbling macro. */
function _wish_Fumbling() {
    const fp = game.u?.uprops?.[FUMBLING];
    return !!fp && !!((fp.intrinsic | 0) || (fp.extrinsic | 0));
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

import { merged as merged_glob } from './hold_another_object.js';
async function _wish_addinv_prinv(otmp, dropSpec) {
    const g = game;

    /* C ref: hold_another_object snapshots go.oldcap before addinv; encumber_msg
     * compares near_capacity() to it after the object is in inventory.  RNG-free. */
    const _oldcap = near_capacity();
    const _pickupBurden = (g.flags?.pickup_burden ?? 2) | 0;
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
    /* C invent.c:1100-1107 — merge with the quiver in preference to any other
     * inventory slot, so a wished stack folds into the quivered one. */
    const _wmerge = (g.u?.uquiver && _wish_mergable(g.u.uquiver, otmp)) ? g.u.uquiver
        : (() => { for (let o = g.invent; o; o = o.nobj) if (_wish_mergable(o, otmp)) return o; return null; })();
    for (let o = _wmerge; o; o = null) {
        if (o) {
            /* C invent.c:856-875 — reconcile knowledge dimensions; if a real
             * discovery happened, C fires the comparison pline + forces a
             * --More-- (invent.c:934-942, otmp->where==OBJ_INVENT and neither
             * how_lost==LOST_THROWN — both true for a wished stack already held). */
            let discovered = false;
            const oquan = ((otmp.quan ?? 1) | 0); /* prinv's quan arg = wished obj's quan */
            if (otmp.globby) {
                /* invent.c:928-931 — globs absorb (pudding_merge_message +
                 * obj_absorb) instead of adding quantity. */
                await merged_glob({ o }, { o: otmp });
            } else {
            o.quan = ((o.quan ?? 1) | 0) + oquan;
            /* C invent.c:838-839 — merged() clears bknown on merged gold
             * before comparing the id dimensions (:871) */
            if ((o.oclass | 0) === COIN_CLASS_WZ) o.bknown = 0;
            discovered = _wish_merged_reconcile(o, otmp);
            o.owt = (o.owt | 0); /* weight recompute is weight-only/RNG-free */
            }
            if (discovered) {
                await force_more('You learn more about your items by comparing them.');
            }
            const _c2msgs = [];
            o.pickup_prev = 1;
            addinv_core2(o, _c2msgs);
            for (const m of _c2msgs)
                await force_more(m);
            if (inv_cnt(false) > 52
                || (((o.otyp | 0) !== 471 || !o.cursed)
                    && near_capacity() > _dropCap)) {
                let dropped = o;
                if ((o.quan | 0) > _oquan)
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
                const total_of = (oquan > 0 && oquan < (o.quan | 0));
                const dot = total_of ? '' : '.';
                /* prinv prints the merged stack with quan=oquan (xprname's quan
                 * arg), not the merged total. */
                const totalbuf = (total_of && g.flags?.verbose) ? ` (${o.quan | 0} in total).` : '';
                prinvLine = `${String.fromCharCode(o.invlet | 0)} - ${(await _wish_doname(o, oquan))}${dot}${totalbuf}`;
                g._resultMessage = g._resultMessage ? g._resultMessage + '  ' + prinvLine : prinvLine;
            }
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
    otmp.nobj = g.invent ?? null;
    g.invent = otmp;
    reorder_invent();
    const _core2msgs = [];
    otmp.pickup_prev = 1;
    addinv_core2(otmp, _core2msgs);
    carry_obj_effects(otmp); /* C invent.c:1144 (cursed figurine timer) */
    /* C invent.c:1040's pline is committed and paged HERE rather than inside
     * addinv_core2: prinv's own pline is what more()s it in C, and this port's
     * prinv line goes through game._resultMessage, which does not page a
     * predecessor.  Same treatment invent.c:941's compare-items line already
     * gets in the merge branch above. */
    for (const m of _core2msgs)
        await force_more(m);
    if (inv_cnt(false) > 52
        || (((otmp.otyp | 0) !== 471 || !otmp.cursed)
            && near_capacity() > _dropCap)) {
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
        prinvLine = `${String.fromCharCode(otmp.invlet | 0)} - ${(await _wish_doname(otmp))}.`;
        g._resultMessage = g._resultMessage ? g._resultMessage + '  ' + prinvLine : prinvLine;
    }
    await _wish_encumber_msg(_oldcap, prinvLine);
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
    /* C zap.c:6208-6209 — the wishless-conduct note, shown while no wish has
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

    const mapseen = Array.isArray(g.mapseenchn) ? g.mapseenchn
        : (g.mapseenchn ? [g.mapseenchn] : [level]);
    const overview = { count: mapseen.length, size: mapseen.length * STATS_MAPSEEN_SIZE };
    lines.push('  Overview', _stats_row(`general, size ${STATS_MAPSEEN_SIZE}`,
        overview.count, overview.size),
        '---------------------------  ----- -------',
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

    const _wishPendingSrc = g._pending_message;
    const _wishPendingJoins = _topl_joins_snapshot(_wishPendingSrc);

    /* C zap.c:6437: hold_another_object(otmp, ...) — when the wished object is
     * an artifact, invent.c:1208 hold_another_object calls touch_artifact()
     * (artifact.c:908) on the hero before the object is added to inventory.
     * That is where the rn2(4) blast roll happens, and it must precede the
     * rn1(100,50) below (Cardinal Rule 2: RNG order).  Non-artifact wishes
     * consume no RNG here.  We model only touch_artifact's RNG; the
     * inventory/encumbrance bookkeeping consumes none. */
    if (otmp) {
        const _u = g.u || (g.u = {});
        _u.uconduct = _u.uconduct || {};
        const oldWishes = _u.uconduct.wishes | 0;
        const wish = `"${wishedText}", got "${(await _wish_doname(otmp))}"`;
        if (!oldWishes) {
            const possessive = g.flags?.female ? 'her' : 'his';
            gamelog_add(LL_CONDUCT | LL_WISH, g.moves | 0,
                `made ${possessive} first wish - ${wish}`);
        } else {
            gamelog_add(LL_WISH, g.moves | 0, `wished for ${wish}`);
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
            otmp.dknown = 1;
        /* C invent.c:1218-1231 */
        place_object(otmp, g.u.ux | 0, g.u.uy | 0);
        const canTouch = await touch_artifact_youmonst(otmp);
        remove_object(otmp);
        if (!canTouch) {
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

    /* C: this handler returns ECMD_OK on every path; rhack() maps it. */
    return ECMD_OK;
}

const _CP_MAXMCLASSES = 61;
const _CP_NON_PM = -1;
const _CP_MALE = 0, _CP_FEMALE = 1, _CP_NEUTRAL = 2;
const _CP_MM_NOEXCLAM = 262144, _CP_MM_FEMALE = 65536, _CP_MM_MALE = 32768;
/* defsym.h MONSYM ordinals: MONSYM(35, 'I', INVISIBLE, S_invisible, ...) and
 * MONSYM(59, '~', WORM_TAIL, S_WORM_TAIL, ...). */
const _CP_S_INVISIBLE = 35, _CP_S_WORM_TAIL = 59;

/* C read.c:3137 create_particular_parse — returns null when nothing matched. */
function create_particular_parse(str) {
    const g = game;
    const d = {
        quan: 1 + (((g.multi | 0) > 0) ? (g.multi | 0) : 0),
        monclass: _CP_MAXMCLASSES,
        which: (g.urole && g.urole.mnum) | 0,
        fem: -1, genderconf: -1, randmonst: false,
        maketame: false, makepeaceful: false, makehostile: false,
        sleeping: false, saddled: false, invisible: false, hidden: false,
    };
    let bufp = String(str);

    /* quantity */
    const mq = /^([0-9]+) */.exec(bufp);
    if (mq) { d.quan = parseInt(mq[1], 10); bufp = bufp.slice(mq[0].length); }
    const QUAN_LIMIT = 21 * 79;
    if (d.quan < 1 || d.quan > QUAN_LIMIT)
        throw new Error('create_particular_parse: out-of-range quantity needs monster_census()');

    /* gear / state words — C memsets each match to spaces, then mungspaces. */
    const strip = (word) => {
        const i = bufp.toLowerCase().indexOf(word);
        if (i < 0) return false;
        bufp = bufp.slice(0, i) + ' '.repeat(Math.max(0, word.length)) + bufp.slice(i + word.length);
        return true;
    };
    d.saddled   = strip('saddled ');
    d.sleeping  = strip('sleeping ');
    d.invisible = strip('invisible ');
    d.hidden    = strip('hidden ');
    /* check "female" before "male" to avoid false hit mid-word */
    if (strip('female ')) d.fem = _CP_FEMALE;
    if (strip('male '))   d.fem = _CP_MALE;
    bufp = bufp.trim().replace(/\s+/g, ' ');   /* mungspaces */

    /* initial disposition */
    const lc = bufp.toLowerCase();
    if (lc.startsWith('tame '))          { bufp = bufp.slice(5); d.maketame = true; }
    else if (lc.startsWith('peaceful ')) { bufp = bufp.slice(9); d.makepeaceful = true; }
    else if (lc.startsWith('hostile '))  { bufp = bufp.slice(8); d.makehostile = true; }

    /* fn-truthy-lint HARD: `wizard` is a function, so this test used to be
     * unconditional and a non-wizard game accepted "*"/"random" as a monster
     * name.  C read.c create_particular_parse() guards it with the wizard
     * macro. */
    if (wizard() && (bufp === '*' || bufp === 'random')) {
        d.randmonst = true;
        return d;
    }

    const nm = name_to_mon(bufp, _CP_NEUTRAL);
    d.which = (nm && typeof nm === 'object') ? (nm.mntmp | 0) : (nm | 0);
    const gender_name_var = (nm && typeof nm === 'object') ? (nm.gender | 0) : _CP_NEUTRAL;
    if (d.fem === _CP_MALE || d.fem === _CP_FEMALE) {
        if (gender_name_var !== _CP_NEUTRAL && d.fem !== gender_name_var)
            d.genderconf = gender_name_var;
    } else {
        d.fem = gender_name_var;
    }
    if (d.which >= LOW_PM)
        return d;                              /* got one */

    /* C read.c:3229-3247 — the name_to_monclass fallback.  This used to THROW,
     * which halted the scored run on ANY unrecognised answer to "Create what
     * kind of monster?"; C answers 0 and re-prompts.  name_to_monclass is
     * ported at js/makemon.js (C home mondata.c:1150).
     *
     *     d->monclass = name_to_monclass(bufp, &d->which);
     *     if (ismnum(d->which))       { d->monclass = MAXMCLASSES; return TRUE; }
     *     else if (d->monclass == S_invisible) { d->which = PM_STALKER;
     *                                            d->monclass = MAXMCLASSES;
     *                                            return TRUE; }
     *     else if (d->monclass == S_WORM_TAIL) { d->which = PM_LONG_WORM;
     *                                            d->monclass = MAXMCLASSES;
     *                                            return TRUE; }
     *     else if (d->monclass > 0)   { d->which = gu.urole.mnum; return TRUE; }
     *     return FALSE;
     *
     * The surviving `d->monclass > 0` arm is a real monster CLASS, whose
     * creation side is mkclass() — create_particular_creation() below still
     * throws for it (`mkclass path unported`), which is the honest place for
     * that gap: the parse is C's, the unported creation is loud. */
    const mbox = { value: _CP_NON_PM };
    d.monclass = name_to_monclass(bufp, mbox);
    d.which = mbox.value;
    if (d.which >= LOW_PM) {
        d.monclass = _CP_MAXMCLASSES;          /* matters below */
        return d;
    } else if (d.monclass === _CP_S_INVISIBLE) { /* not an actual monster class */
        d.which = PM_STALKER;
        d.monclass = _CP_MAXMCLASSES;
        return d;
    } else if (d.monclass === _CP_S_WORM_TAIL) { /* empty monster class */
        d.which = PM_LONG_WORM;
        d.monclass = _CP_MAXMCLASSES;
        return d;
    } else if (d.monclass > 0) {
        d.which = (g.urole && g.urole.mnum) | 0; /* reset from NON_PM */
        return d;
    }
    return null;
}

/* C read.c:3252 create_particular_creation. */
async function create_particular_creation(d) {
    const g = game, u = g.u;
    let whichpm = null, madeany = false;
    let firstchoice = _CP_NON_PM;

    if (!d.randmonst) {
        firstchoice = d.which;
        const box = { value: d.which };          /* C's `int *mtype` */
        const remapped = cant_revive(box, false, null);  /* remaps box.value */
        d.which = box.value;
        if (remapped && firstchoice !== PM_LONG_WORM_TAIL) {
            const buf = `Creating ${monPmname(d.which, _CP_NEUTRAL)} instead; force `
                      + `${monPmname(firstchoice, _CP_NEUTRAL)}?`;
            const ans = await y_n_default(buf, 'n');
            /* C win/tty/topl.c:545 — tty_yn_function never erases the answered
             * prompt; it stays on the terminal row until a later pline
             * overwrites it.  js nhgetch drops _pending_message on read, so hand
             * the prompt to the paint-time fallback (js/display.js _topl_sticky)
             * — "Creating doppelganger instead; force Juiblex?" with no
             * "appears" message still shows at the next input boundary. */
            game._topl_sticky = `${buf} [yn] (n)`;
            if (ans === 'y')
                d.which = firstchoice;
        }
        whichpm = permonstTemplate(d.which);
    }

    for (let i = 0; i < d.quan; i++) {
        let mmflags = 0;
        /* C chooses again for every requested class/random monster. */
        if (d.monclass !== _CP_MAXMCLASSES || d.randmonst) {
            const mndx = d.monclass !== _CP_MAXMCLASSES
                ? mkclass(d.monclass, 0) : rndmonst();
            whichpm = mndx == null ? null : permonstTemplate(mndx);
        }
        if (d.genderconf === -1) {
            if (d.fem !== -1 && (!whichpm || (!_cp_is_male(whichpm) && !_cp_is_female(whichpm))))
                mmflags |= (d.fem === _CP_FEMALE) ? _CP_MM_FEMALE
                         : (d.fem === _CP_MALE) ? _CP_MM_MALE : 0;
            /* no surprise; "<mon> appears." rather than "<mon> appears!" */
            mmflags |= _CP_MM_NOEXCLAM;
        } else {
            mmflags |= (d.fem === _CP_FEMALE) ? _CP_MM_FEMALE
                     : (d.fem === _CP_MALE) ? _CP_MM_MALE : 0;
        }
        /* C read.c:3313 — MM_MINVIS is consumed by makemon immediately after
         * place_monster(), via mon_set_minvis(mtmp, FALSE).  Pass the flag
         * through so the canonical makemon path applies both perminvis and
         * minvis and refreshes the square's glyph at the C call site. */
        if (d.invisible)
            mmflags |= MM_MINVIS;

        const mtmp = await makemon(whichpm, u.ux | 0, u.uy | 0, mmflags);
        if (!mtmp) {
            /* quit trying if creation failed and is going to repeat */
            if (d.monclass === _CP_MAXMCLASSES && !d.randmonst)
                break;
            continue;
        }
        const mx = mtmp.mx | 0, my = mtmp.my | 0;
        /* C read.c:3324-3327 — tame disposition is applied immediately after
         * makemon(), before the remaining creation bookkeeping. */
        if (d.maketame)
            await tamedog(mtmp, null, false);
        else if (d.makepeaceful || d.makehostile) {
            /* C read.c:3327-3331 — explicit disposition clears mtame,
             * sets mpeaceful, then recomputes malign; hostile leaves it 0. */
            mtmp.mtame = 0;
            mtmp.mpeaceful = d.makepeaceful ? 1 : 0;
            set_malign(mtmp);
        }
        /* put_saddle_on_mon carries C's can_saddle and existing-saddle guards. */
        if (d.saddled)
            await put_saddle_on_mon(null, mtmp);
        const mflags1 = mtmp.data?.mflags1 | 0;
        const mlet = mtmp.data?.mlet | 0;
        if (d.hidden
            && (((mflags1 & 0x100) && mlet !== 13) /* is_hider, !S_MIMIC */
                || ((mflags1 & 0x80) && !!g.level.levelObjects?.[mx]?.[my])
                || (mlet === 57 && is_pool(mx, my))))
            mtmp.mundetected = 1;
        if (d.sleeping)
            mtmp.msleeping = 1;
        if ((d.hidden || d.invisible) && !canspotmon(mtmp))
            await flash_mon(mtmp);
        madeany = true;
        /* C read.c:3350-3354 — "in case we got a doppelganger instead of what
         * was asked for, make it start out looking like what was asked for":
         *     if (mtmp->cham != NON_PM && firstchoice != NON_PM
         *         && mtmp->cham != firstchoice)
         *         (void) newcham(mtmp, &mons[firstchoice], NO_NC_FLAGS);
         * This port's newcham (js/mklev.js:13049) takes an mndx, not a permonst
         * pointer, and returns 0 immediately when cham is NON_PM — so the guard
         * is C's, not a re-derivation of it.  NO_NC_FLAGS is 0. */
        if ((mtmp.cham | 0) !== _CP_NON_PM && firstchoice !== _CP_NON_PM
            && (mtmp.cham | 0) !== firstchoice)
            await newcham(mtmp, firstchoice, 0 /* NO_NC_FLAGS */);
    }
    return madeany;
}
function _cp_is_male(p)   { return !!((p.mflags2 | 0) & 65536); }
function _cp_is_female(p) { return !!((p.mflags2 | 0) & 131072); }

/* C read.c:3372 create_particular. */
export async function create_particular() {
    const CP_TRYLIM = 5;
    let tryct = CP_TRYLIM, altmsg = 0;
    let prompt = 'Create what kind of monster?';
    let d = null;

    do {
        let buf = await getlin(prompt);
        buf = String(buf).trim().replace(/\s+/g, ' ');   /* mungspaces */
        if (buf.charCodeAt(0) === 27 /* '\033' */)
            return false;

        d = create_particular_parse(buf);
        if (d) break;

        if (buf || altmsg || tryct < 2) {
            await pline("I've never heard of such monsters.");
        } else {
            await pline('Try again (type * for random, ESC to cancel).');
            ++altmsg;
        }
        if (tryct === CP_TRYLIM)
            prompt += ' [type name or symbol]';
    } while (--tryct > 0);

    if (!tryct) {
        await pline("That's enough tries!");
        return false;
    }
    return await create_particular_creation(d);
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
        /* iflags.debug_mongen is saved/cleared/restored around the call; the
           port has no debug_mongen, and makemon's rndmongen guard reads the
           level flag, not this one. */
        await create_particular();
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
async function makemap_remove_mons() {
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
    dmonsfree();
}

/* C ref: cmd.c:986-1062 makemap_prepost(pre, wiztower).  rm_mapseen() (the
 * #overview record) and the achievement revocation have no JS counterpart; both
 * are RNG-free and screen-invisible apart from Mine's-end/Soko-end prize levels. */
export async function makemap_prepost(pre, wiztower) {
    const g = game;
    const u = g.u;
    if (pre) {
        await makemap_remove_mons();
        if (u.uball) {
            const { ballrelease, unplacebc } = await import('./ball.js');
            await ballrelease(false);
            unplacebc();
        }
        (await import('./lock.js')).maybe_reset_pick(null);
        const dg = g.context?.digging;
        if (dg && dg.level && (await import('./dungeon.js')).on_level(dg.level, u.uz))
            g.context.digging = {};
        g.iflags = g.iflags || {};
        g.iflags.travelcc = { x: 0, y: 0 };
        if (g.context?.polearm) g.context.polearm.hitmon = null;
        await (await import('./trap.js')).reset_utrap(false);
        await (await import('./cmd.js')).check_special_room(true);
        g.dndest = { lx: 0, ly: 0, hx: 0, hy: 0, nlx: 0, nly: 0, nhx: 0, nhy: 0 };
        g.updest = { lx: 0, ly: 0, hx: 0, hy: 0, nlx: 0, nly: 0, nhx: 0, nhy: 0 };
        u.ustuck = null;
        u.uswallow = u.uswldtim = 0;
        (await import('./cmd.js')).set_uinwater(0);
        u.uundetected = 0;
        dmonsfree();
        (await import('./mklev.js')).dobjsfree();
        const dgn = g.dungeons?.[u.uz.dnum | 0];
        const ledger = (u.uz.dlevel | 0) + (dgn?.ledger_start | 0);
        (await import('./save.js')).savelev(ledger);
    } else {
        (await import('./vision.js')).vision_reset();
        g.vision_full_recalc = 1;
        const disp = await import('./display.js');
        /* C display.c:2196 cls() opens with display_nhwindow(WIN_MESSAGE, FALSE):
         * a pending topline (e.g. makemon's "A shopkeeper suddenly appears close
         * by!" from fill_special_room) is paged with --More-- before the clear. */
        if (g._pending_message)
            await disp.force_more(String(g._pending_message));
        g._levelgenPaintFreeze = null; /* cls() wipes the physical screen */
        await disp.cls();
        const mk = await import('./mklev.js');
        await mk.u_on_rndspot((u.uhave?.amulet ? 1 : 0) | (wiztower ? 2 : 0));
        await (await import('./dog.js')).losedogs();
        await mk.kill_genocided_monsters();
        /* C cmd.c:1043-1044 u_collide_m(), as inlined in goto_level (js/cmd.js) */
        const tp = await import('./teleport.js');
        let collMon = m_at(u.ux | 0, u.uy | 0);
        if (collMon) {
            let moved = false;
            if (!rn2(2)) {
                const cc = tp.enexto_core(u.ux | 0, u.uy | 0);
                if (cc && ((cc.x - u.ux) ** 2 + (cc.y - u.uy) ** 2) <= 2) {
                    mk.u_on_newpos(cc.x, cc.y);
                    moved = true;
                }
            }
            if (!moved)
                await tp.mnexto(collMon, tp.RLOC_NOMSG);
            collMon = m_at(u.ux | 0, u.uy | 0);
            if (collMon) {
                if (!await tp.rloc(collMon, tp.RLOC_NOMSG) || (collMon = m_at(u.ux | 0, u.uy | 0)))
                    await (await import('./dog.js')).m_into_limbo(collMon);
            }
        }
        (await import('./track.js')).initrack();
        if (u.uball) {
            const b = await import('./ball.js');
            b.unplacebc();
            await b.placebc();
        }
        /* C display.c docrt_flags() -> cls() -> display_nhwindow(WIN_MESSAGE, FALSE):
         * whatever u_on_rndspot()/losedogs() left on the topline (place_lregion's
         * impossible() trio) is paged with a final --More-- before the repaint. */
        await flush_screen(1);  /* pline.c:273 flush_screen() per message: pages all but the last */
        if (g._pending_message)
            await disp.force_more(String(g._pending_message));
        await disp.docrt();
        flush_screen(1);
        await (await import('./objnam.js')).deliver_splev_message();
        await (await import('./cmd.js')).check_special_room(false);
    }
}

/* C ref: wizcmds.c:155-171 wiz_makemap(void) — #wizmakemap: discard the
 * current level and replace it with a freshly generated one. */
export async function wiz_makemap() {
    if (wizard()) {
        const wasW = (await import('./dochug.js')).In_W_tower_wz(game.u.ux | 0, game.u.uy | 0, game.u.uz);
        await makemap_prepost(true, wasW);
        await (await import('./mklev.js')).mklev();
        await makemap_prepost(false, wasW);
    } else {
        await pline('Unavailable command \'wizmakemap\'.');
    }
    return ECMD_OK;
}

/* C ref: dig.c:2287-2318 wiz_debug_cmd_bury() — the #wizbury command: bury
 * everything at the hero's location and around. */
export async function wiz_debug_cmd_bury() {
    const u = game.u;
    const lo = game.level.levelObjects;
    const count = (x, y) => {
        let n = 0;
        for (let o = lo?.[x]?.[y] || null; o; o = o.nexthere) ++n;
        return n;
    };
    let before = 0, after = 0;
    for (let x = u.ux - 1; x <= u.ux + 1; x++)
        for (let y = u.uy - 1; y <= u.uy + 1; y++) {
            if (x < 1 || x > COLNO - 1 || y < 0 || y > 20) continue; /* isok */
            before += count(x, y);
            await bury_objs(x, y);
            after += count(x, y);
        }
    const diff = before - after;
    if (before === 0)
        await pline("No objects here or adjacent to bury.");
    else if (diff === 0)
        await pline("No objects buried.");
    else
        await pline("%d object%s buried.", diff, diff === 1 ? "" : "s");
    return 0; /* ECMD_OK */
}

/* C ref: timeout.c:2011-2030 print_queue() — lines for one timer chain.
 * fmt_ptr() prints a host address no replay can reproduce; stand-in used. */
const _TIMER_KINDS = ['none', 'level', 'global', 'object', 'monster'];
const _TIMER_FUNC_NAMES = ['rot_organic', 'rot_corpse', 'revive_mon', 'zombify_mon',
    'burn_object', 'hatch_egg', 'fig_transform', 'shrink_glob', 'melt_ice_away'];
function _print_queue_lines(base) {
    if (!base) return [' <empty>'];
    const lines = ['timeout  id   kind   call'];
    for (let curr = base; curr; curr = curr.next) {
        const o = curr.arg?.a_obj;
        const ptr = '0x' + (o ? 0x55d0c0de0000 + ((o.o_id | 0) << 6) : 0).toString(16).padStart(16, '0');
        lines.push(' ' + String(curr.timeout).padStart(4) + '   ' + String(curr.tid).padStart(4)
                   + '  ' + (_TIMER_KINDS[curr.kind] ?? 'unknown').padEnd(6) + ' '
                   + _TIMER_FUNC_NAMES[curr.func_index] + '(' + ptr + ')');
    }
    return lines;
}

/* C ref: region.c:673-710 visible_region_summary() — lines instead of putstr. */
function _visible_region_summary_lines() {
    const lines = [];
    const fldsep = game.iflags?.menu_tab_sep ? '\t' : '  ';
    for (const reg of region_stats_snapshot().regions) {
        if (!reg.visible || reg.ttl === -2) continue;
        if (!lines.length) lines.push('', 'Visible regions');
        const damg = reg.arg?.a_int | 0;
        const typbuf = damg ? `poison gas (${damg})` : 'vapor';
        const bb = reg.bounding_box;
        lines.push(String(reg.ttl + 1).padStart(5) + fldsep + typbuf.padEnd(16)
                   + fldsep + `@[${bb.lx},${bb.ly}..${bb.hx},${bb.hy}]`);
    }
    return lines;
}

/* C ref: timeout.c:2040-2150 wiz_timeout_queue() — the #timeout command: a
 * corner text window; no turn, no RNG. */
export async function wiz_timeout_queue() {
    const g = game;
    const u = g.u;
    const TIMEOUT = 0x00FFFFFF;
    const COLD_RES_ID = COLD_RES;
    const lines = [`Current time = ${g.moves | 0}.`, '', 'Active timeout queue:', ''];
    lines.push(..._print_queue_lines(g.gt?.timer_base ?? null));
    let count = 0, longestlen = 0, specindx = 0;
    for (let i = 0; ; ++i) {
        const [p, propname] = property_by_index(i);
        if (!propname) break;
        const intrinsic = u.uprops[p].intrinsic | 0;
        if (intrinsic & TIMEOUT) {
            ++count;
            if (propname.length > longestlen) longestlen = propname.length;
        }
        if (specindx === 0 && p === COLD_RES_ID) specindx = i;
    }
    lines.push('');
    if (!count) {
        lines.push('No timed properties.');
    } else {
        lines.push('Timed properties:', '');
        for (let i = 0; ; ++i) {
            const [p, propname] = property_by_index(i);
            if (!propname) break;
            const intrinsic = u.uprops[p].intrinsic | 0;
            if (intrinsic & TIMEOUT) {
                if (specindx > 0 && i >= specindx) {
                    lines.push(' -- settable via #wizintrinsic only --');
                    specindx = 0;
                }
                lines.push(' ' + propname.padEnd(longestlen) + ' ' + String(intrinsic & TIMEOUT).padStart(4));
            }
        }
    }
    if (u.uswldtim) {
        lines.push('', `Swallow countdown is ${u.uswldtim >>> 0}.`);
    }
    if (u.uinvault) {
        lines.push('', `Vault counter is ${u.uinvault | 0}.`);
    }
    if (any_visible_region())
        lines.push(..._visible_region_summary_lines());
    const stasis = g.level?.flags?.stasis_until | 0;
    if (stasis >= (g.moves | 0)) {
        const left = stasis - (g.moves | 0);
        lines.push('', `Level is no-teleport for ${left + 1} ${left > 0 ? 'turns' : 'more turn'}.`);
    }
    await displayLookWindow(lines); /* NHW_MENU corner window (timeout.c:2049) */
    return ECMD_OK;
}

/* C ref: light.c:934-975 wiz_light_sources() — the #lightsources command: a
 * corner text window; no turn, no RNG.  fmt_ptr() stand-in as in #timeout. */
export async function wiz_light_sources() {
    const g = game;
    const pad2 = (n) => String(n).padStart(2);
    const lines = [`Mobile light sources: hero @ (${pad2(g.u.ux)},${pad2(g.u.uy)})`, ''];
    const sources = light_sources_list();
    if (sources.length) {
        lines.push('location range flags  type    id',
                   '-------- ----- ------ ----  -------');
        for (const ls of sources) {
            const id = ls.id || {};
            const who = ls.type === LS_OBJECT ? 'obj'
                : ls.type === LS_MONSTER
                    ? ((id.a_monst?.mx | 0) > 0 ? 'mon'
                        : (id.a_monst === g.youmonst) ? 'you' : '<m>')
                    : '???';
            const o = id.a_obj ?? id.a_monst;
            const ptr = '0x' + (o ? 0x55d0c0de0000 + (((o.o_id ?? o.m_id) | 0) << 6) : 0).toString(16).padStart(16, '0');
            lines.push(`  ${pad2(ls.x)},${pad2(ls.y)}   ${pad2(ls.range)}   0x${(ls.flags | 0).toString(16).padStart(4, '0')}  ${who}  ${ptr}`);
        }
    } else {
        lines.push('<none>');
    }
    await displayLookWindow(lines);
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
