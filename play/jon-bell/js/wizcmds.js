// @ts-nocheck
// wizcmds.js — Wizard-mode extended commands.
// C ref: nethack-c/src/wizcmds.c — wiz_level_change() and related.
// Hand-maintained JS (not tsc-emitted). Sibling imports from js/*.js.
import { game, wizard } from './gstate.js';
import { s_suffix as _ta_s_suffix } from './hacklib.js';
import { nhgetch } from './input.js';
import { pline, flash_mon, canspotmon, unmap_invisible, gamelog_add } from './display.js';
import { topl_park_cursor } from './display.js';
import { flush_screen, force_more, _topl_record_join, capture_painted_frame,
         _topl_merge_result, _topl_joins_snapshot } from './display.js';
import { display_text_window } from './com_pager.js';
import { pluslvl } from './exper.js';
import { rn2, d, rnd } from './rng.js';
import { readobjnam, hands_obj, getObjDescr, xname_scroll, xname_spellbook, xname_amulet, xname_armor, xname_weapon, xname_oname_tail, the, The, aobjnam, doname as doname_real } from './objnam.js';
import { discover_object } from './o_init.js';
import { near_capacity } from './weight.js';
import { exercise } from './attrib.js';
import { losehp } from './dokick.js';
import { MKOBJ_OC_MATERIAL } from './mkobj_erosion_meta.js';
import { hates_silver, name_to_mon, name_to_monclass, permonstTemplate, monPmname, set_malign, mkclass, rndmonst, splitobj } from './makemon.js';
import { makemon, newcham, engravings_list } from './mklev.js';
import { count_wsegs } from './worm.js';
import { tamedog } from './dog.js';
import { put_saddle_on_mon } from './steed.js';
import { is_pool } from './look.js';
import { light_sources_list } from './light.js';
import { region_stats_snapshot } from './region.js';
/* C read.c:3111 cant_revive — already ported and sweep-clean; see the comment
 * above _cp_is_male below for why this file no longer carries its own copy. */
import { cant_revive } from './read.js';
import { PM_LONG_WORM_TAIL, PM_LONG_WORM, PM_STALKER } from './pm.generated.js';
/* y_n_default is C's y_n() (hack.h:1329 y_n(q) := yn_function(q, ynchars, 'n',
 * TRUE)); it lives in js/cmd.js, which already imports this file — the cycle is
 * the tree's norm (20+ modules import from cmd.js) and both sides are hoisted
 * function declarations, so the binding resolves at call time. */
import { y_n_default, addinv_core2, reorder_invent, inv_cnt, dropx, freeinv, hitfloor, getpos } from './cmd.js';
import { m_at, mon_nam, xkilled, XKILL_NOMSG } from './uhitm.js';
import { dmonsfree } from './mkmaze.js';
import { addinv_core0, can_reach_floor } from './hold_another_object.js';
import { A_WIS, KILLED_BY, ANTIMAGIC, HALF_PHDAM, LOW_PM, ECMD_OK, MM_MINVIS,
         Is_airlevel, Is_waterlevel, IRONBARS, ICE, FUMBLING,
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

/* C ref: include/artilist.h artilist[] — the touch_artifact()-relevant fields
 * (spfx, mtype, alignment, role, race) for each artifact, indexed by the
 * 1-based artilist index that objnam.js stamps onto otmp.oartifact.
 * Only the fields touch_artifact() / bane_applies() / spec_applies() read are
 * carried here; attack adtyp is omitted because the wizard-wish path only
 * reaches the AD_PHYS bane branch (no SPFX_ATTK bane is hero-applicable here).
 * mtype/role/race are encoded as the raw C constant *values* are not needed:
 * for the hero (yours) case spec_applies(SPFX_DFLAG2) only matches when the
 * monster (the hero's permonst) carries the M2 flag, which a human/elf/etc.
 * hero never does for these banes, so we record the *kind* of dbonus and let
 * bane_applies fall through to FALSE for the hero unless it is a class/flag
 * match the hero can satisfy. To stay faithful we keep the spfx bitmask and
 * alignment; role/race gate badclass (only relevant when self_willed). */
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
/* C ref: youprop.h:401 Hate_silver = (u.ulycn >= LOW_PM
 *                                     || hates_silver(gy.youmonst.data));
 * mondata.c:524-529 hates_silver(ptr) is already ported and exported as
 * js/makemon.js hates_silver(); reuse it rather than re-deriving the monflag
 * bits here (the first draft of this helper mis-declared M2_WERE/M2_UNDEAD and
 * scripts/gates/tier1.sh's monflag audit caught it). */
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
    return 'object';
}

/* C ref: artifact.c:908-974 touch_artifact(obj, &gy.youmonst) — hero (yours)
 * case.  Returns 1 if the hero can touch the artifact, 0 if it refuses.  Only
 * the `yours` branch is ported (artifact.c:921-928); the monster branches at
 * :929-938 belong to the not-yet-ported can_touch_safely / meatobj callers.
 *
 * WHEN C DRAWS rn2(4) (artifact.c:944-945) — the whole point of this port:
 *
 *     if (((badclass || badalign) && self_willed)
 *         || (badalign && (!yours || !rn2(4)))) {
 *
 * `||` short-circuits, so:
 *   - first clause TRUE  → the second is NEVER evaluated: NO rn2(4) is drawn,
 *     and the body IS entered — the hero IS blasted.  (This is the case the
 *     previous comment got wrong: it read "no rn2 drawn" as "no blast".)
 *   - first clause FALSE and badalign FALSE → `&&` short-circuits: no rn2(4),
 *     no blast.
 *   - first clause FALSE and badalign TRUE  → `!yours` is FALSE for the hero,
 *     so `||` DOES evaluate `!rn2(4)`: the draw happens, and the blast fires
 *     only on rn2(4)==0.
 *
 * Reproducible check over the recorded C corpus (not an assertion — run it):
 *   grep -l 'touch_artifact(artifact\.c:945)' sessions/*.json
 *     → seed0361, seed0365, seed0371 (rn2(4) drawn: badalign, NOT self_willed)
 *   grep -l 'touch_artifact(artifact\.c:951)' sessions/*.json
 *     → seed0366 only (blast entered with NO rn2(4): Stormbringer is
 *       SPFX_INTEL, so self_willed short-circuits the `||`)
 *   grep -o 'd(4,10)=[0-9]*\|rn2(2)=[0-9]* @ exercise' sessions/seed0366*.json
 *     → d(4,10)=24 / rn2(2)=1, then d(4,10)=18 / rn2(2)=0 — two blasts, each
 *       4 rnd(10) draws (rnd.c d()) followed by exercise(A_WIS, FALSE)'s
 *       -rn2(2) at attrib.c:509.  losehp() itself is RNG-free (hack.c:4219:
 *       saving_grace returns n unchanged for the hero's own action), but it
 *       DOES move u.uhp — seed0366 step 77 renders HP:78(102) after d(4,10)=24.
 *
 * Blast-body RNG, in C order:
 *   artifact.c:953  d((Antimagic ? 2 : 4), (self_willed ? 10 : 4))
 *   artifact.c:956  rnd(10)  — only when oc_material == SILVER && Hate_silver
 *   artifact.c:959  exercise(A_WIS, FALSE) → attrib.c:509 -rn2(2), itself
 *                   gated on abs(AEXE(A_WIS)) < AVAL(50)
 *
 * MESSAGE PAGING: artifact.c:951's You() lands on the topline BEFORE the
 * damage is applied, but C only more()s it when the NEXT pline arrives (the
 * caller's prinv), by which time losehp() has already updated the status line.
 * So this function does NOT page — it records the text in
 * game._touch_artifact_blast_msg and the caller force_more()s it immediately
 * before its own next message.  Paging here would render the pre-damage HP.
 *
 * CALLERS.  Wired: makewish() below (C invent.c:1227 hold_another_object).
 * NOT wired yet: the WIELD path — C wield.c:186 ready_weapon() calls
 * retouch_object(&wep, FALSE) (artifact.c:2508), which calls touch_artifact at
 * :2520; for a non-silver, non-bane artifact retouch_object then returns 1 with
 * no further RNG (artifact.c:2527-2528).  Its JS counterpart is dowield() in
 * js/cmd.js (the `ready_weapon` block just before `_weapon_prinv_line`), which
 * is why seed0361/seed0365 still stop at their recorded
 * `rn2(4) @ touch_artifact(artifact.c:945)` and seed0366 at its second
 * `d(4,10) @ artifact.c:953`.  Grep the ground truth:
 *   grep -c 'touch_artifact(artifact\.c:94[59]\|artifact\.c:951' sessions/*.json
 * A separate, unrelated local stub named touch_artifact lives at
 * js/mklev.js:8581 (throws) for the MONSTER branch (can_touch_safely /
 * meatobj) — it is file-local and does NOT shadow this export. */
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
    const badclass = self_willed && (p.role || p.race);
    let badalign = (p.spfx & SPFX_RESTR) !== 0
                   && p.al !== A_NONE
                   && (p.al !== ualignType || ualignRecord < 0);

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
        await losehp(dmg, `touching ${_ta_xname(otmp)}`, KILLED_BY);
        /* C artifact.c:959 */
        exercise(A_WIS, false);
    }

    /* C artifact.c:962-971: badclass && badalign && self_willed → refuse (0). */
    if (badclass && badalign && self_willed) return 0;
    return 1; /* C artifact.c:973 */
}

/* C ref: wizcmds.c — getlin(prompt, buf) reads a string from the user.
 * In the session trace, getlin fires a '^toplin[hooked_tty_getlin=2]' event
 * then reads chars until Enter/ESC.  Each char is one nhgetch() step.
 * Mirror: show prompt on topline, loop nhgetch until '\n'/'\r'/ESC.
 * Returns the typed string (empty on ESC/cancel).
 * Exported so makewish (zap.js) can call it directly. */
export async function getlin(prompt) {
    const g = game;
    let buf = '';
    /* C ref: tty_getlin — the prompt is shown on the topline, typed input is
     * echoed after a single space, and the cursor sits at the input position
     * (col = prompt.length + 1 + chars-typed, row 0).  flush_screen() resets
     * the cursor to the hero square inside display.js _buildScreenOutput(), so
     * we MUST override the cursor AFTER each flush — exactly as doextcmd() does
     * (js/cmd.js).  Without this the cursor stayed on the hero during every
     * getlin, diverging from C's topline cursor and failing the cursor gate on
     * #levelchange / wish / naming sessions (seed0361/0362/0365/0370/0372 +
     * the chargen cluster). */
    const renderPrompt = () => {
        g._pending_message = buf ? (prompt + ' ' + buf) : prompt;
    };
    const placeCursor = () => {
        const d = g.nhDisplay;
        if (d) topl_park_cursor(d, prompt + ' ' + buf);
    };
    /* C ref: win/tty/getline.c:53-54 hooked_tty_getlin opens with
     *     if (ttyDisplay->toplin == TOPLINE_NEED_MORE && !(cw->flags & WIN_STOP))
     *         more();
     * — the SAME unconditional page tty_yn_function does (topl.c:390-392, and
     * the reason js/lock.js _ynq force_more()s before overwriting).  getlin was
     * missing it and assigned straight over the pending message, which deletes
     * both the --More-- and the message under it.  seed5006 segment 0 step 161
     * is the witness: a CONFUSED read of a scroll of teleportation plines "As
     * you read the scroll, it disappears." and "Being confused, you mispronounce
     * the magic words...", and C pages BOTH before level_tele's "To what level
     * do you want to teleport?" prompt appears — two keystrokes this port was
     * consuming as getlin input instead. */
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
    /* C win/tty/getline.c:56 `ttyDisplay->toplin = TOPLINE_SPECIAL_PROMPT;` —
     * set for the WHOLE of hooked_tty_getlin()'s read loop, on EVERY getlin.
     * It (a) exempts the topline from redotoplin()'s more() (topl.c:139
     * `if (ttyDisplay->cury && otoplin != TOPLINE_SPECIAL_PROMPT) more();`)
     * and (b) routes the echo through addtopl/putsyms, which HARD-WRAPS at
     * column CO-1 and keeps taking keystrokes.
     *
     * js/display.js already models that state as `game._topl_prompt_echo`
     * (_topl_split_for_more:4970 and _buildScreenOutput:4071 both read it), but
     * only js/cmd.js's '#' extended-command prompt ever SET it — and that
     * prompt is one caller of getlin, not the mechanism.  Every other getlin
     * (wish, #name, #call, #levelport, create_particular) took the ordinary
     * message path, so an echo that ran past column 79 raised a --More-- C does
     * not raise and then ATE the next keystroke dismissing it.
     * MEASURED, gen094 step 532: the hero types 53 characters into
     * "Call a vellum spellbook:"; C spills onto row 1 and carries on reading,
     * while this port paged at column 71 and desynchronised from there. */
    /* C hooked_tty_getlin displays the query through custompline(), whose
     * vpline() tail updates gp.prevmsg even though SUPPRESS_HISTORY keeps the
     * query out of message history.  Keep Norep's comparison state in sync. */
    g._prevmsg = prompt;
    const _saved_prompt_echo = g._topl_prompt_echo;
    g._topl_prompt_echo = true;
    try {
    renderPrompt();
    await flush_screen(1);
    placeCursor();
    while (true) {
        const keyCode = await nhgetch();
        if (keyCode === 27 /* ESC */ || keyCode === 3 /* ^C */) {
            /* C win/tty/getline.c:81-95 hooked_tty_getlin:
             *     if (c == '\033' && obufp[0] != '\0') {
             *         obufp[0] = '\0';
             *         bufp = obufp;
             *         tty_clear_nhwindow(WIN_MESSAGE);
             *         ... addtopl(query); addtopl(" "); addtopl(obufp);
             *     } else {
             *         obufp[0] = '\033'; obufp[1] = '\0';
             *         break;
             *     }
             * ESC only CANCELS when the input buffer is already EMPTY.  With
             * anything typed it is a KILL-LINE: the buffer is emptied, the
             * prompt is redrawn bare, and getlin KEEPS READING.  This port
             * cancelled on every ESC, so an ESC mid-line returned the cancel
             * sentinel and every keystroke after it was re-interpreted as a
             * command.  MEASURED on gen483-recombine-seed1841527 step 21: the
             * hero zaps a wand of create monster in wizard mode, create_
             * particular()'s getlin collects ".rjhlll.rjqg ", and the ESC at
             * step 20 clears it — C re-prompts and reads 209 more frames of
             * input, while this port made a newt and diverged from there on. */
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
        } else if (keyCode >= 32 && keyCode < 127) {
            buf += String.fromCharCode(keyCode);
        }
        renderPrompt();
        await flush_screen(1);
        placeCursor();
    }
    g._pending_message = '';
    return buf;
    } finally {
        /* C getline.c:319 — the read loop is over; the topline stops being a
         * TOPLINE_SPECIAL_PROMPT.  Restored rather than cleared, because
         * js/cmd.js's '#' prompt calls getlin-shaped code with the flag
         * already set and owns its own clear. */
        g._topl_prompt_echo = _saved_prompt_echo;
    }
}

/* C ref: wizcmds.c:243-342 wiz_kill(void).  This is a no-time wizard
 * command: repeatedly position the cursor on a monster, credit the kill to
 * the hero, and run the canonical xkilled lifecycle (including its treasure
 * gate and deferred monster cleanup). */
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
    const parsed = parseInt(buf, 10);
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
        /* losexp not ported — stub; no RNG consumed in the unported path */
        /* WIRE_PENDING: port-losexp-follow-up */
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
/* C ref: objnam.c:998-1008 — xname()'s common tail, after the per-class switch:
 *     if (has_oname(obj) && dknown) { Strcat(buf, " named "); Strcat(buf, ONAME(obj)); }
 * A wished-for artifact carries its artifact name in oextra.oname (set by
 * readobjnam's oname(otmp, name, ONAME_WISH) port, objnam.js), so the C line is
 * "g - an elven dagger named Sting." not "g - an elven dagger.".
 *
 * The `dknown` guard holds on this path: xname() calls observe_object(obj)
 * (objnam.c:627) for a sighted hero before reading obj->dknown, and the wizard
 * wish is never made blind in the corpus.
 *
 * The obj_is_pname() shortcut (objnam.c:663 `goto nameit`, which would print
 * the bare artifact name with "the ") is NOT reachable for a fresh wish:
 * obj_is_pname() returns FALSE while not_fully_identified(obj) (objnam.c:337),
 * and a wished artifact has neither `known` nor `bknown` set — matching the C
 * traces for every artifact wish in the corpus (seed0360 "r - a war hammer
 * named Mjollnir.", seed0366 "j - a runed broadsword named Stormbringer.").
 *
 * C applies this tail exactly ONCE, at the end of xname_flags(); the JS class
 * helpers that are real ports of an xname() branch (xname_weapon, shared with
 * VENOM/TOOL) carry it themselves, so this wrapper must NOT re-apply it there
 * — doing so double-named a wished artifact ("l - an athame named Magicbane
 * named Magicbane.", seed0364 step 64).  It is applied here only for the
 * appearance-form branches below that stand in for an unported xname() class
 * branch (the wand/ring "<descr> <noun>" forms).  Delegates to objnam.js's
 * xname_oname_tail so the has_oname()/dknown guard and the artifact "The "
 * downcase are the single C-faithful implementation. */
function _wish_xname_named_tail(otmp, phrase) {
    return xname_oname_tail(otmp, phrase);
}
/* `quanOverride` (used by the merge prinv) mirrors C prinv(prefix, obj, oquan):
 * xprname temporarily prints `oquan` (the wished obj's quantity), NOT the merged
 * stack total — so a wish that merges into a held singleton still prints the
 * singular "<let> - <doname>" (seed5500 step 212), while a fresh multi-quantity
 * wish prints "<count> <plural>" (step 304). */
/* C objclass.h COIN_CLASS = 12 (js/objnam.js:81 says the same). */
const COIN_CLASS_WZ = 12;
async function _wish_doname(otmp, quanOverride) {
    /* C invent.c:2889 prinv() -> xprname() -> doname().  This used to be a
     * hand-rolled per-oclass ladder that stood in for doname while objnam.js's
     * real one was unusable; it had no COIN/FOOD branch and ended in a
     * `return 'an object'` fallback, which is exactly what seed0399 printed for
     * "2 fortune cookies" (step 240) and "an apple" (step 255).  Call the real
     * doname; measured +4 step points across the corpus with zero regressions
     * (seed0399 410 -> 412, seed0367 162 -> 164) and no session lost.
     *
     * The quan swap is C xprname()'s own (invent.c:2841-2846): it temporarily
     * assigns obj->quan = quan so both the count and makeplural inside xname
     * use the wished object's oquan rather than the merged stack total. */
    const savequan = otmp.quan;
    if (quanOverride != null)
        otmp.quan = quanOverride | 0;
    try {
        return await doname_real(otmp);
    } finally {
        otmp.quan = savequan;
    }
}
/* C invent.c:4379 mergable(otmp /*into*\/, obj /*combine*\/) — narrowed to the
 * makewish path.  C's addinv_core0() (invent.c:1108) loops gi.invent and merges
 * `obj` into the first mergable stack instead of giving it a fresh invlet; a
 * wished item that is identical to one the hero already holds therefore reuses
 * the existing letter (e.g. seed5500 wishes 8 scrolls but two of them coincide
 * with a stack already present, so C assigns only 7 new scroll letters — the
 * follow-player gi.invent scan in dog_goal then iterates one fewer node).  The
 * gate is `objects[otyp].oc_merge`: TRUE for POTION/SCROLL/GEM/FOOD-class
 * objects, FALSE for WAND/RING/SPBOOK/WEAPON/ARMOR/TOOL (per include/objects.h
 * BITS(_, oc_merge, ...)).  (An earlier version of this comment ended "Coins
 * never reach makewish", which is false -- seed0399 wishes for gold at step
 * 162 -- but coins ARE still excluded from this SET, and C's addinv merges
 * wished gold into the hero's existing money stack by the same oc_merge rule.
 * No corpus wish yet lands on a hero who is already carrying gold.)
 *
 * CRITICAL (invent.c:4395, 4425-4427): mergable() requires identical otyp,
 * cursed, blessed, spe, AND dknown — but it does NOT require `known` to match,
 * and bknown mismatch only blocks the merge when (Blind || Hallucination) (which
 * never holds during a wizard wish).  So two stacks that differ ONLY in `known`
 * (or in bknown while sighted) STILL MERGE; the merge then RECONCILES those
 * dimensions in merged() (invent.c:862-875) and, if a reconciliation actually
 * happened (discovered), fires "You learn more about your items by comparing
 * them." (invent.c:941).  The old port wrongly gated the merge on bknown AND
 * dknown matching, which — combined with _finalize_wish's blanket over-ID — made
 * every wished stack identical and merged silently, suppressing that --More--
 * (seed5500 step 211).  The erosion/oeaten refinements never differ between two
 * freshly-created wished objects, so only the FOOD oeaten/orotten case is kept. */
const _MERGE_CLASSES = new Set([7 /*FOOD*/, 8 /*POTION*/, 9 /*SCROLL*/, 13 /*GEM*/]);
function _wish_mergable(into, obj) {
    if (into === obj) return false;
    if ((into.otyp | 0) !== (obj.otyp | 0)) return false;
    if (obj.nomerge || into.nomerge) return false;
    if (!_MERGE_CLASSES.has(obj.oclass | 0)) return false; /* oc_merge gate */
    if ((obj.cursed | 0) !== (into.cursed | 0)) return false;
    if ((obj.blessed | 0) !== (into.blessed | 0)) return false;
    if ((obj.spe | 0) !== (into.spe | 0)) return false;
    /* C invent.c:4425 — dknown MUST match. */
    if ((obj.dknown | 0) !== (into.dknown | 0)) return false;
    /* C invent.c:4426 — bknown mismatch blocks merge only when Blind||Hallu (and
     * !Cleric); a sighted wizard wish never blocks on bknown, so we do NOT gate
     * on it here.  `known` is intentionally NOT compared (C doesn't). */
    /* FOOD oeaten/orotten match (mergable invent.c:4421) */
    if ((obj.oclass | 0) === 7) {
        if ((obj.oeaten | 0) !== (into.oeaten | 0)) return false;
        if ((obj.orotten | 0) !== (into.orotten | 0)) return false;
    }
    return true;
}

/* C invent.c:856-875 merged() knowledge reconciliation — when `obj` merges into
 * `otmp`, any id-dimension known on EITHER stack becomes known on the survivor,
 * and a real change (discovered) drives the "You learn more about your items by
 * comparing them." pline.  Returns TRUE if a reconciliation happened (a dimension
 * flipped that, per C's discovered rules, counts as a discovery).  Mutates the
 * surviving stack `into`.  (rknown's `oerodeproof` gate and bknown's !Cleric gate
 * are modelled; erosion never differs between fresh wished stacks.) */
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
        /* C: if (!Role_if(PM_CLERIC)) discovered = TRUE;  the contest wizard is
         * never a Cleric, so this always counts. */
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
        case 3: return 'You stagger under your heavy load.  Movement is very hard.';
        default: return `You ${newcap === 4 ? 'can barely' : "can't even"} move a handspan with this load!`;
        }
    } else if (oldcap > newcap) {
        switch (newcap) {
        case 0: return 'Your movements are now unencumbered.';
        case 1: return 'Your movements are only slowed slightly by your load.';
        case 2: return 'You rebalance your load.  Movement is still difficult.';
        case 3: return 'You stagger under your load.  Movement is still very hard.';
        default: return null;
        }
    }
    return null;
}

/* C ref: invent.c:1290 hold_another_object → encumber_msg().  After prinv()
 * (the "<let> - <doname>." line, already in g._resultMessage), encumber_msg()
 * is a SEPARATE pline()/update_topl().  When near_capacity() crossed since
 * oldcap, the load-change line is appended to the topline; the per-pline
 * update_topl reserve rule (win/tty/topl.c) raises a --More-- of the (committed)
 * prinv ONLY when the joined text overflows the topline (CO-1-8) — short
 * prinv+encumber pairs share one row with NO --More-- (seed5500 step 765: "Q -
 * a large box.  You rebalance your load.  Movement is difficult." fits, no
 * More), while a long pair pages (step 673/674: the balsa-wand prinv + the
 * 57-col slowdown line overflows → "L - a balsa wand.--More--", encumber on the
 * next frame).  We record the join offset so the display split happens at the
 * message boundary, exactly as the cmd.js pickup path and pline() do.
 * DISPLAY-channel only, no RNG; consumes the dismiss key only when a More fires. */
async function _wish_encumber_msg(oldcap, prinvLine) {
    const g = game;
    const newcap = near_capacity();
    if (g.u) g.u._oldcap = newcap; /* C: go.oldcap = newcap at encumber_msg tail */
    if (oldcap === newcap) return;
    const msg = _wish_encumber_text(oldcap, newcap);
    if (!msg) return;
    /* C pickup.c:1992 / :2013 — `disp.botl = TRUE;` at the tail of BOTH arms of
     * encumber_msg(), AFTER the pline.  It is what tells the NEXT flush_screen to
     * re-run bot() and repaint the encumbrance field; without it this port's
     * _capture_botl (js/display.js:3353) never refreshes _botlPaintedCap and
     * every later frame renders the stale pre-change capacity.  seed0399 became
     * Burdened on the step-412 wish and then rendered no encumbrance word at all
     * for the remaining 119 frames. */
    if (g.disp) g.disp.botl = true;
    const prev = g._resultMessage;
    if (prev) {
        const joined = prev + '  ' + msg;
        _topl_record_join(prev, joined);
        g._resultMessage = joined;
        /* ── the prinv page shows the PRE-encumbrance status line ──────────────
         * C pickup.c:1972-1993 encumber_msg(): the load-change Your()/You() runs
         * FIRST and SET_BOTL() only after it returns.  When that pline overflows
         * the topline it more()s the committed prinv, and that --More-- blocks
         * INSIDE the pline, before SET_BOTL — so the bottom line the player sees
         * is still the one the last bot() painted, i.e. the OLD capacity.  The
         * session trace states the order outright (seed5500 step 673):
         *     >pline @ prinv(invent.c:2889)
         *     >pline @ encumber_msg(pickup.c:1979)
         *     >more  @ more(../win/tty/topl.c:212)
         * and only on step 674, after `<more`/`<pline`, does `^botl[encumber_msg]`
         * fire.  Hence C step 673 reads "... AC:9 Xp:20" while step 674 reads
         * "... AC:9 Xp:20 Burdened".  Rendering the live near_capacity() during
         * the page showed "Burdened" one frame early.
         * Freeze the frame + the displayed cap for exactly this prinv page using
         * the same channel the dopickup prinv uses (cmd.js _pickupEncMorePending
         * / allmain.js _pickupEncPreFrame → display.js's split loop); the hero is
         * stationary during a wish, so the frame is captured here rather than at
         * the next turn top.  display.js drops both after the page is dismissed.
         * DISPLAY-ONLY: no RNG, no state mutation.  Skipped when the pair fits on
         * one row (no --More--, e.g. step 765's large box), because then C's
         * SET_BOTL lands before the next frame is captured anyway. */
        if (prinvLine) {
            const f = capture_painted_frame();
            if (f) {
                f.cap = oldcap | 0;
                g._pickupEncPreFrame = f;
                g._pickupEncMorePending = { oldcap: oldcap | 0, prinvText: prinvLine };
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

async function _wish_addinv_prinv(otmp, dropSpec) {
    const g = game;

    /* C ref: hold_another_object snapshots go.oldcap before addinv; encumber_msg
     * compares near_capacity() to it after the object is in inventory.  RNG-free. */
    const _oldcap = near_capacity();
    const _pickupBurden = (g.flags?.pickup_burden ?? 2) | 0;
    const _dropCap = Math.max(_oldcap, _pickupBurden);
    const _oquan = (otmp.quan ?? 1) | 0;

    /* C invent.c:1216-1217 hold_another_object — `if (!Blind) observe_object(obj)`
     * BEFORE addinv(), "to maximize mergeability".  observe_object (o_init.c:442-450)
     * sets obj->dknown=1 and discover_object(otyp, FALSE/*mark_as_known*\/,
     * TRUE/*encountered*\/, FALSE/*credit_hero*\/) — it does NOT set known or
     * bknown, and credit_hero=FALSE so NO exercise(A_WIS)/RNG.  This dknown=1 is
     * what makes the wished stack mergeable with an existing observed stack (and
     * is the ONLY id-bit a wish adds beyond mksobj's class defaults).
     *
     * THE `if (!Blind)` IS LOAD-BEARING and used to be missing, under a comment
     * asserting "replays are never Blind".  seed4500 wishes three times while
     * blind — steps 1202, 1501, 1531 — and C's prinv lines are "o - a potion.",
     * "r - a ring.", "s - a wand.": readobjnam does not set dknown, the hero
     * cannot see the object, so xname takes its `if (!dknown)` arm and prints
     * the bare class noun.  This port observed the object anyway and answered
     * "o - a brilliant blue potion." / "r - an engagement ring." / "s - a wand of
     * polymorph.", i.e. it disclosed an identification C never granted — and
     * every later naming of those items (the 'i' menu at step 1681, the '\\'
     * discoveries list at 1701) inherited it.  RNG-free either way. */
    if (!_wish_Blind() && (otmp.otyp | 0) >= 0) {
        otmp.dknown = 1;
        discover_object(otmp.otyp | 0, false, true, false); /* RNG-free */
    }

    /* C invent.c:1244-1249 hold_another_object — fumbling always drops the
     * object before the ordinary add/merge and capacity paths.  drop_it expects
     * an inventory object, so C temporarily adds it with nomerge set, then
     * clears nomerge immediately before dropx()/hitfloor(). */
    if (_wish_Fumbling()) {
        otmp.nomerge = 1;
        otmp = (await addinv_core0(otmp, null, false));
        await _wish_drop_overburdened(otmp, dropSpec);
        return;
    }

    /* C invent.c:1108-1114 addinv_core0 — merge into the first mergable stack
     * (reusing its invlet) before falling back to a new letter.  When merged,
     * the wished object's quantity folds into the existing node and NO new
     * invlet is consumed; C still prinv()s, but with the surviving (merged)
     * object and its existing letter. */
    for (let o = g.invent; o; o = o.nobj) {
        if (_wish_mergable(o, otmp)) {
            /* C invent.c:856-875 — reconcile knowledge dimensions; if a real
             * discovery happened, C fires the comparison pline + forces a
             * --More-- (invent.c:934-942, otmp->where==OBJ_INVENT and neither
             * how_lost==LOST_THROWN — both true for a wished stack already held). */
            const discovered = _wish_merged_reconcile(o, otmp);
            const oquan = ((otmp.quan ?? 1) | 0); /* prinv's quan arg = wished obj's quan */
            o.quan = ((o.quan ?? 1) | 0) + oquan;
            o.owt = (o.owt | 0); /* weight recompute is weight-only/RNG-free */
            if (discovered) {
                /* C invent.c:941 pline("You learn more about your items by
                 * comparing them.") — then prinv()'s fresh pline pages it with a
                 * forced --More-- (the hero is stationary during a wish, so the
                 * live-frame force_more is correct).  DISPLAY-channel only, no RNG;
                 * consumes the recorded dismiss key (seed5500 step 211→212). */
                await force_more('You learn more about your items by comparing them.');
            }
            /* C invent.c:1140 `added:` — addinv_core0 falls through to
             * addinv_core2(obj) on EVERY path, the merge path included, and the
             * object it hands over is the SURVIVING (merged) node, not the one
             * that was folded in.  This call was absent, so a wish never ran
             * addinv_core2 at all; see the new-invlet branch below for the
             * measurement.  The `added:` tail's FIRST statement is
             * `obj->pickup_prev = 1;` and it was still missing here even though
             * the comment below quotes it: it marks the surviving node, not the
             * one folded in. */
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
            /* C invent.c:2889 prinv(prefix, merged_obj, oquan) → xprname(obj, ...,
             * dot=!total_of, ..., oquan).  total_of = (oquan && oquan < obj->quan):
             * a merge that grows the stack sets total_of TRUE, so xprname omits the
             * trailing period; the " (N in total)." suffix is only added when
             * flags.verbose, which wiz_wish() turns OFF for the duration of the wish
             * — so a merged wished stack reads "<let> - <doname>" with NO period and
             * NO total suffix (seed5500 step 212).  The surviving stack keeps its
             * original letter. */
            let prinvLine = null;
            if (o.invlet) {
                const total_of = (oquan > 0 && oquan < (o.quan | 0));
                const dot = total_of ? '' : '.';
                /* prinv prints the merged stack with quan=oquan (xprname's quan
                 * arg), not the merged total. */
                prinvLine = `${String.fromCharCode(o.invlet | 0)} - ${(await _wish_doname(o, oquan))}${dot}`;
                g._resultMessage = g._resultMessage ? g._resultMessage + '  ' + prinvLine : prinvLine;
            }
            await _wish_encumber_msg(_oldcap, prinvLine);
            return;
        }
    }

    /* C invent.c:694 assigninvlet() — assign the next free a..zA..Z letter,
     * scanning from gl.lastinvnr+1 (NOT from 'a') and wrapping; gl.lastinvnr is
     * a GLOBAL that persists across every assignment, so the chosen letter is
     * NOT simply the first free slot.  The old naive "first free from 'a'" port
     * diverged here: a wish after the hero dropped item 'a' (seed0116 drops a
     * blessed +1 quarterstaff, freeing 'a') must still get 'o' (lastinvnr=13,
     * next free after 'n'), not the freed 'a' — and the cascading `P <letter>`
     * put-on then mis-dispatches (the same fault hangs seed0800's grand-tour).
     * Mirrors _assigninvlet_ini (u_init.js) which already tracks game._lastinvnr.
     * RNG-free. */
    /* C invent.c:697-701, the FIRST statement of assigninvlet():
     *     if (otmp->oclass == COIN_CLASS) { otmp->invlet = GOLD_SYM; return; }
     * The comment here used to say "coins are handled by the caller (only
     * non-coin otmp reach here)", which is false -- makewish() passes every
     * object with a non-zero oclass, and seed0399 wishes for "blessed 30 gold
     * pieces" at step 162.  Wished gold was taking a letter off the a-zA-Z
     * scan ("r - ...") where C prints "$ - 30 gold pieces." */
    if ((otmp.oclass | 0) === COIN_CLASS_WZ) {
        otmp.invlet = 0x24; /* GOLD_SYM '$' */
        /* C SET_BOTL(): botl.c's gold field is money_cnt(gi.invent), and as of
         * the shadow retirement js/display.js _statusLine2() reads exactly that,
         * so the wished gold reaching game.invent is all the status row needs.
         * The hand-merge into game._ini_inv_chain that used to sit here (added
         * for seed0399 step 162, "$:0" against C's "$:30") is gone with it.
         * C's SET_BOTL runs bot(), which also ends any '$:' staleness latched
         * by js/potion.js's dipfountain bath arm. */
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
    /* C invent.c:1108 addinv_core0 — `obj->where = OBJ_INVENT`.
     * obj.h:78 OBJ_INVENT is 3; this said 2, which is OBJ_CONTAINED, under a
     * comment naming the right constant.  Every `carried(obj)` reader therefore
     * answered FALSE for a wished-for item: seed0108 forces a chest with the
     * wished Mjollnir at step 235 and C says "your war hammer named Mjollnir"
     * where shk_your's the_your[carried(obj)] gave us "the". */
    otmp.where = OBJ_INVENT_WIZ;
    /* C invent.c:1115-1123 addinv_core0, the no-merge arm:
     *     assigninvlet(obj);
     *     if (flags.invlet_constant || !prev) {
     *         obj->nobj = gi.invent;      // insert at BEGINNING
     *         gi.invent = obj;
     *         if (flags.invlet_constant)
     *             reorder_invent();       // then re-sort the chain by inv_rank
     *     } else {
     *         prev->nobj = obj;           // insert at END
     *         obj->nobj = 0;
     *     }
     * `fixinv` (flags.invlet_constant, optlist.h initval On) is the default and
     * this corpus never turns it off, so C ALWAYS takes the head-insert +
     * reorder_invent() arm; the tail-append arm is the !fixinv one.  This port
     * took the tail-append unconditionally, under a comment asserting the
     * opposite ("appends to the END of gi.invent").  The two orders agree only
     * while every newly assigned letter sorts AFTER every letter already held,
     * which stops being true the moment #adjust, a freed slot, or the
     * gl.lastinvnr wrap hands out an earlier letter.
     *
     * MEASURED on gen446-recombine-seed373399 (Archeologist, playmode:debug).
     * Step 733 #adjusts the starting scroll stack from 'a' to 'z'; step 1201
     * wishes for a potion of extra healing, which assigninvlet gives 'b'.  C's
     * chain is then [b potion, z scrolls] (inv_rank 'b'^040=0x42 < 'z'^040=0x5A);
     * this port's was [z scrolls, b potion].  Nothing reads the order until
     * step 1351, when a red dragon's fire breath runs destroy_items(AD_FIRE)
     * (zap.c:6031) and walks gi.invent: C's first eligible stack is the POTION,
     * so it draws `rnd(6)` at maybe_destroy_item (zap.c:5835) before the quan
     * loop; ours was the SCROLL stack, whose arm sets dmg=1 with no roll, so we
     * went straight to `rn2(3)`.  That is C leaf 5082 and the whole remaining
     * 430 points of the session.  An inventory-order fault draws NO RNG of its
     * own — it is silent until something iterates the chain. */
    otmp.nobj = g.invent ?? null;
    g.invent = otmp;
    reorder_invent();
    /* C invent.c:1140-1141 `added:` — addinv_core0's common tail:
     *     obj->pickup_prev = 1;
     *     addinv_core2(obj);        <- extrinsics conferred by carrying obj
     *     carry_obj_effects(obj);
     * This whole tail was missing from the wish path.  addinv_core2
     * (invent.c:1024-1049, ported at js/cmd.js:37357) has two arms and BOTH are
     * reachable from a wish: confers_luck() -> set_moreluck() for a wished
     * luckstone, and the Archeologist scroll-label decipher.
     *
     * MEASURED on gen446-recombine-seed373399 (Archeologist, playmode:debug).
     * At step 371 the hero finishes wishing for "3 scrolls of punishment".  C
     * runs addinv_core2, which observe_object()s the stack, plines "You decipher
     * the label on your scrolls labeled JUYED AWK YACC." and makeknown()s the
     * type.  That pline is what leaves a --More-- standing over the next eight
     * recorded keystrokes ('#','w','i','z','w','i','s','h'), all of which C
     * discards at xwaitforspace until the '\n' at step 380 dismisses it.  With
     * no decipher message this port had no --More--, so it consumed the '#' as
     * an extended-command prefix, ran a SECOND #wizwish, and every frame from
     * step 372 to the end of the session (1442 of 1814) was wrong.
     *
     * carry_obj_effects() (the cursed-figurine timeout) is NOT called here: its
     * only arm is attach_fig_transform_timeout(), which this port does not have
     * a body for, and adding an unported call on a newly-live arm converts a
     * wished cursed figurine from a wrong frame into a halted session. */
    const _core2msgs = [];
    otmp.pickup_prev = 1;
    addinv_core2(otmp, _core2msgs);
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
        /* C zap.c:6325-6328:
         *     Strcpy(promptbuf, "For what do you wish");
         *     if (iflags.cmdassist && tries > 0)
         *         Strcat(promptbuf, " (enter 'help' for assistance)");
         *     Strcat(promptbuf, "?");
         * iflags.cmdassist defaults ON (options.c) and the corpus nethackrc
         * does not clear it, so the suffix appears from the second prompt on.
         * MEASURED on gen653-grammar-seed1011090 step 42, where C's topline is
         * "For what do you wish (enter 'help' for assistance)?". */
        let promptbuf = 'For what do you wish';
        if (_wish_cmdassist_on() && tries > 0)
            promptbuf += " (enter 'help' for assistance)";
        promptbuf += '?';

        /* C zap.c:6334: getlin(promptbuf, buf).  (The iflags.menu_requested
         * wish_history_menu arm at zap.c:6331 is #ifdef DEBUG-only history
         * recall, reachable only after a prior wish in the same game with the
         * menu-request prefix; not exercised by this corpus.) */
        const buf = await getlin(promptbuf);

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
            /* C zap.c:6373-6377 — terrain success: no object to hold,
             * no wish-conduct increment, and no ublesscnt adjustment.
             * DEBUG wish-history storage is not yet modeled by makewish. */
            return;
        }
        wishedText = wishstr;
        break;
    }

    /* The join offsets of whatever the retry loop left on the topline, taken
     * NOW: game._topl_joins is a SINGLE-STRING side-channel (it tracks one
     * `_topl_joins_src` at a time), and _wish_addinv_prinv's own pline()s
     * re-key it to the result line — so by the time the merge below runs the
     * pending line's offsets are gone.  Snapshotting them here is what keeps
     * the "Nothing fitting..." / "That's enough tries!" boundary a genuine
     * message boundary for _topl_split_for_more; without it the two refusal
     * messages read as ONE atomic 74-column pline and page as a unit, which is
     * not a shape C's update_topl can produce (measured on
     * gen689-grammar-seed930671 step 63: C pages after "…exists in the game.",
     * JS paged after "…That's enough tries!"). */
    const _wishPendingSrc = g._pending_message;
    const _wishPendingJoins = _topl_joins_snapshot(_wishPendingSrc);

    /* C zap.c:6437: hold_another_object(otmp, ...) — when the wished object is
     * an artifact, invent.c:1208 hold_another_object calls touch_artifact()
     * (artifact.c:908) on the hero before the object is added to inventory.
     * That is where the rn2(4) blast roll happens, and it must precede the
     * rn1(100,50) below (Cardinal Rule 2: RNG order).  Non-artifact wishes
     * consume no RNG here.  We model only touch_artifact's RNG; the
     * inventory/encumbrance bookkeeping consumes none. */
    /* C zap.c:6389-6390 `if (!u.uconduct.wishes++) livelog_printf(...)` — the
     * KMH conduct counter, bumped once per wish that produced an object (the
     * `nothing` / `hands_obj` / no-match early returns above never reach it).
     * NOTHING in js/ wrote it, so insight.c:2183's conduct line always read
     * "You have used no wishes."  MEASURED on seed4500-knight-coverage step
     * 1573: C's #conduct window reads "You have used 9 wishes."  The livelog
     * call itself has no channel in this port; the counter is the observable.
     * RNG-free. */
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
    const _wishDropSpec = otmp ? _wish_drop_spec(otmp) : null;

    if (otmp && (otmp.oartifact | 0)) {
        /* C invent.c:1216-1217 — hold_another_object calls observe_object(obj)
         * (dknown = 1) BEFORE place_object + touch_artifact at :1225-1227.  The
         * blast message at artifact.c:951 is s_suffix(the(xname(obj))), and
         * xname's ONAME tail (objnam.c:998) is gated on dknown — so without
         * this the message loses its " named <artifact>" tail.  RNG-free and
         * idempotent; _wish_addinv_prinv() below repeats it (with the
         * discover_object half) for the non-artifact path.  C's single
         * observe_object() sits under `if (!Blind)` (invent.c:1215-1216), ahead
         * of the artifact branch, so this copy carries the same guard. */
        if (!_wish_Blind())
            otmp.dknown = 1;
        await touch_artifact_youmonst(otmp);
    }

    /* C zap.c:6412: hold_another_object(otmp, ...) → invent.c:1208
     * hold_another_object → addinv(otmp) → prinv(prefix, otmp, ...).  addinv
     * assigns the next free a-z invlet (assigninvlet), appends the object to
     * gi.invent, and prinv prints "<invlet> - <doname>." on the topline.  For
     * a wished, unidentified spellbook this is "p - a glittering spellbook."
     * (seed4200) — the doname is the article + shuffled appearance + class
     * noun.  RNG-neutral (no rn2/rnd here; touch_artifact above already drained
     * any artifact RNG, and the rn1(100,50) below is next in C order).  Scoped
     * to non-coin objects (wishes are never gold). */
    if (otmp && (otmp.oclass | 0) !== 0) {
        /* C artifact.c:951's You() is still sitting on the topline; prinv's
         * pline is the NEXT message, so the tty more()s the blast line here —
         * AFTER losehp() moved u.uhp, which is why seed0366 step 77 renders
         * "You are blasted by ...--More--" over HP:78(102), not HP:102(102). */
        const blastMsg = g._touch_artifact_blast_msg;
        if (blastMsg) {
            g._touch_artifact_blast_msg = null;
            await force_more(blastMsg);
        }
        await _wish_addinv_prinv(otmp, _wishDropSpec);
    }

    /* C has ONE topline.  The refusal messages this loop just printed and
     * prinv's "<let> - <object>." are consecutive pline()s on it, and
     * update_topl's width rule (topl.c:264, join iff n0 + strlen(toplines) + 3
     * < CO - 8) decides where the --More-- falls.  THIS PORT SPLITS THE TOPLINE
     * ACROSS TWO CHANNELS — _pending_message (mid-command plines) and
     * _resultMessage (the command-result line that survives to the next
     * nhgetch) — and allmain.c's post-rhack arbitration (js/allmain.js:2499)
     * DROPS _pending_message outright whenever _resultMessage is already set:
     *
     *     if ((!_preRhackMsg || g._attackPublished)
     *         && g._pending_message && !g._resultMessage)
     *         g._resultMessage = g._pending_message;
     *     g._pending_message = '';
     *
     * _wish_addinv_prinv publishes into _resultMessage, so on the fifth-refusal
     * path the "Nothing fitting...  That's enough tries!" line was generated
     * correctly and then destroyed.  Merge the two in C's order instead, with
     * the join offsets carried over, so flush_screen's split rule pages them
     * where C's update_topl does.  MEASURED on gen653-grammar-seed1011090 step
     * 160: C shows "Nothing fitting that description exists in the
     * game.--More--" and then, at 162, "That's enough tries!  o - a dusty
     * spellbook."; without this merge JS showed only "o - a dusty
     * spellbook.--More--".
     *
     * Guarded on BOTH channels being non-empty, which before this commit could
     * not happen on the wish path at all: getlin() clears _pending_message when
     * it returns, so prinv always ran with an empty pending channel.  Every
     * pre-existing wish is therefore byte-identical. */
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

    /* C wizcmds.c:35-42:
     *     if (wizard) { ...makewish()... }
     *     else pline(unavailcmd, ecname_from_fn(wiz_wish));
     * The comment that stood here said "in session replays we are always in
     * wizard mode; skip the check".  That is an absence claim about the corpus
     * and it is false: the generated held-out corpus contains ordinary
     * (playmode:normal) games whose keystream still types ^W, and C answers
     * "Unavailable command 'wizwish'." and then runs the wish TEXT as ordinary
     * commands.  Measured on gen513-recombine-seed428318 step 39 (the ^W): this
     * port opened "For what do you wish?" and swallowed the next 33 keys, so
     * every frame from step 40 to the end of the session (793 of 833) was
     * wrong.  ecname_from_fn() returns extcmdlist[].ef_txt, which has NO
     * leading '#'.
     * (The KEY chain reaches this through rhack -> can_do_extcmd (cmd.c:481),
     * which prints the identical message from the identical ef_txt and never
     * calls the function; the NAME chain cannot arrive at all, because
     * extcmds_match (cmd.c:3054) skips every WIZMODECMD row when !wizard, so
     * '#wizwish' resolves to nothing and gets "unknown extended command."
     * This arm is therefore observationally the same wherever it is reached.)
     * RNG-free: makewish's rn2(100) is on the taken branch only. */
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

/* ═══ #wizgenesis — wizcmds.c:203 wiz_genesis → read.c:3372 create_particular ═══
 *
 * The extcmd dispatch chain had no 'wizgenesis' arm, so seed0398's
 * "#wizgenesis\njackal\n" typed its name, dispatched to nothing, and then C's
 * getlin ate the seven "jackal" keystrokes as a prompt while JS ran them as
 * commands.  The session's first miss after the polymorph work is exactly that
 * prompt: C step 65 shows "Create what kind of monster?", JS showed a blank
 * topline with the cursor still on the hero.
 *
 * Scope: the plain "<monster name>" path.  create_particular_parse's quantity
 * prefix, the "saddled/sleeping/invisible/hidden/female/male" gear+state words,
 * the "tame/peaceful/hostile" dispositions, "*"/"random", and the monster-CLASS
 * fallback (name_to_monclass) are all parsed the same way C parses them, but
 * the ones whose CREATION side needs unported helpers (mkclass, rndmonst,
 * tamedog, put_saddle_on_mon, flash_mon, newcham) throw rather than silently
 * doing something else — a wrong monster is an RNG divergence, and a loud stop
 * is easier to diagnose than a quiet one.
 */
const _CP_MAXMCLASSES = 61;   /* monsym.h MAXMCLASSES (tools/c-const-oracle.mjs) */
const _CP_NON_PM = -1;
/* monst.h MALE=0 FEMALE=1 NEUTRAL=2 — all three verified with
 * tools/c-const-oracle.mjs (const.js:163-534 agrees). */
const _CP_MALE = 0, _CP_FEMALE = 1, _CP_NEUTRAL = 2;
/* mkobj/monst flags, tools/c-const-oracle.mjs: MM_NOEXCLAM 262144,
 * MM_FEMALE 65536, MM_MALE 32768.  (The MM_FEMALE/MM_MALE pair had been
 * guessed at 0x200/0x400 here; measured instead.) */
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
    /* QUAN_LIMIT = ROWNO * (COLNO - 1); the out-of-range arm needs
       monster_census(), which js/ has no body for — a wizgenesis with an
       out-of-range count is not in the corpus. */
    const QUAN_LIMIT = 21 * 79;
    if (d.quan < 1 || d.quan > QUAN_LIMIT)
        throw new Error('create_particular_parse: out-of-range quantity needs monster_census()');

    /* gear / state words — C memsets each match to spaces, then mungspaces. */
    const strip = (word) => {
        const i = bufp.toLowerCase().indexOf(word);
        if (i < 0) return false;
        bufp = bufp.slice(0, i) + ' '.repeat(word.length) + bufp.slice(i + word.length);
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
        /* C read.c:3260-3272 —
         *     if (cant_revive(&d->which, FALSE, (struct obj *) 0)
         *         && firstchoice != PM_LONG_WORM_TAIL) {
         *         Sprintf(buf, "Creating %s instead; force %s?",
         *                 mons[d->which].pmnames[NEUTRAL],
         *                 mons[firstchoice].pmnames[NEUTRAL]);
         *         if (y_n(buf) == 'y') d->which = firstchoice;
         *     }
         * The prompt CONSUMES A KEYSTROKE, which is why this cannot be skipped:
         * a wizgenesis of any unique (seed5002 segment 1 types "Asmodeus") reads
         * one more key than an ordinary one.  This used to throw. */
        const box = { value: d.which };          /* C's `int *mtype` */
        const remapped = cant_revive(box, false, null);  /* remaps box.value */
        d.which = box.value;
        if (remapped && firstchoice !== PM_LONG_WORM_TAIL) {
            const buf = `Creating ${monPmname(d.which, _CP_NEUTRAL)} instead; force `
                      + `${monPmname(firstchoice, _CP_NEUTRAL)}?`;
            if (await y_n_default(buf, 'n') === 'y')
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
/* C read.c:3110-3133 cant_revive(&mtype, FALSE, (struct obj *) 0) is ALREADY
 * PORTED, at js/read.js:3495, with the tree's {value} out-param convention —
 * 61 capture-replay records, 0 diverged, hi-confidence, 11 branch classes.
 * It is imported, not re-derived (SHELF-FIRST applies to the tree, not only to
 * the tools).  What used to sit here was a "would it fire?" BOOLEAN predicate
 * over a hand-written NAME SET, and C's cant_revive does not answer that
 * question: it REMAPS *mtype in place, and the caller's prompt reads the
 * REMAPPED value, so a boolean-only shape could never have driven the prompt.
 *
 * That name set was also wrong in both directions against 5.0's mons[]:
 *   - it listed 'watchman' and 'watch captain' (PM_WATCHMAN 282 /
 *     PM_WATCH_CAPTAIN 283), which C does NOT block;
 *   - it listed the 3.7 spellings 'high priest' and 'aligned priest', which in
 *     5.0 are rows 276/275's MALE names — monPmname(_, NEUTRAL) returns
 *     'high cleric'/'aligned cleric', so both entries were DEAD;
 *   - it OMITTED PM_GUARD ('guard', row 272) entirely, the first name in C's
 *     list.
 * js/read.js's copy carries the right nine indices (checked row-for-row against
 * js/makemon_pmnames.json: guard 272, shopkeeper 271, aligned cleric 275, high
 * cleric 276, Angel 123, long worm tail 330, long worm 114, human zombie 244,
 * doppelganger 270 — the `PM_PRIEST as PM_ALIGNED_CLERIC` /
 * `PM_HIGH_PRIEST as PM_HIGH_CLERIC` aliases at js/read.js:39 are 3.7 NAMES for
 * the correct 5.0 ROWS). */
/* M2_MALE 65536 / M2_FEMALE 131072, tools/c-const-oracle.mjs. */
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

    /* C wizcmds.c:214 — wiz_genesis returns ECMD_OK on BOTH arms, and rhack
     * (cmd.c:4486-4493) maps ECMD_OK onto reset_cmd_vars() → svc.context.move
     * = FALSE.  #wizgenesis costs no turn.
     *
     * The '#wizgenesis' NAME chain reaches this through doextcmd, which already
     * cleared context.move ahead of its dispatch; the C('g') KEY chain
     * (js/cmd.js key === 7) does NOT, so it left context.move at the 1
     * allmain.js:2127 sets before rhack and moveloop_core ran a full world turn
     * that C never runs.  Measured on seed5002 segment 0 step 85 (the '\n' that
     * closes the "Create what kind of monster?" getlin for "gas spore"): C draws
     * 50 leaves and stops; this port drew 60 — the extra ten being that phantom
     * turn's six mcalcmove rn2(12) plus gethungry/exercise/dog_move.  That put
     * the whole remainder of the segment ten leaves out of phase, so the very
     * next command (z n l — zap the wand of fire east) lost its
     * exercise(A_WIS)/dobuzz/zap_hit/zhitu stream and dropped "The bolt of fire
     * hits you!" off the step-88 topline.
     *
     * Placed here rather than in the key arm, where wiz_wish() (wizcmds.js:948)
     * puts its identical ECMD_OK clear — one site covers both chains. */
    /* C: this handler returns ECMD_OK on every path; rhack() maps it. */
    return ECMD_OK;
}
