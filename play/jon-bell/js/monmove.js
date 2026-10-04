// @ts-nocheck
// js/monmove.js — Monster movement support: distfleeck + set_apparxy + m_move.
// C ref: nethack-c/src/monmove.c
// @ts-nocheck — js sibling imports.
import { stop_occupation } from './allmain.js';
import { rn2, rnd, rn1, d, pushRngLogEntry } from './rng.js';
import { game } from './gstate.js';
import { PM_LEPRECHAUN, PM_VROCK } from './pm.generated.js';
import { bare_artifactname, xname, makeplural } from './objnam.js';
import { acurr } from './attrib.js';
import { money_cnt } from './com_pager.js';
import { dist2, isok } from './hacklib.js';
import { dog_move, mattackm, dogfood, mdisplacem } from './dogmove.js';
import { dochug } from './dochug.js';
import { gd_move } from './vault.js';
import { findgold, noattacks, attacktype, noteleport_level, tele_restrict, permonstTemplate, splitobj, check_gear_next_turn, find_defensive, use_defensive, onscary } from './makemon.js';
import monsPack from './makemon_mons.json' with { type: 'json' };
import monMsizePack from './makemon_msize.json' with { type: 'json' };
/* obj.h's is_cloak/is_gloves/is_shirt read objects[otyp].oc_armcat, which this
 * port keeps in js/armor_data.js as ARMOR_DATA[otyp].armcat. */
import { ARMOR_DATA } from './armor_data.js';
import { t_at, mintrap, mon_knows_traps, mon_learns_traps, m_carrying, seetrap, m_has_launcher_and_ammo, linedup, count_traps, maketrap } from './trap.js';
import { OBJ_FLOOR, OBJ_DELETED, is_pit, IS_STWALL, IS_TREE, Is_rogue_level, NEED_PICK_AXE, NEED_AXE, NEED_PICK_OR_AXE,
         Upolyd, M_AP_TYPMASK, M_AP_NOTHING, M_AP_MONSTER, CONFLICT as CONFLICT_MAF, INVIS as INVIS_PROP, DISPLACED as DISPLACED_PROP, DEAF, A_STR,
         NC_SHOW_MSG,
         /* maybe_spin_web (monmove.c:1267) */ IS_OBSTRUCTED, STAIRS, LADDER, IRONBARS, WEB, In_sokoban } from './const.js';
import { newsym, canspotmon, _topl_record_join, pline, canseemon,
         topl_force_break_now, Norep, You_hear, sensemon, _pline_flush_frame_record, Unaware } from './display.js';
import { cansee, vision_recalc, recalc_block_point, clear_path, couldsee } from './vision.js';
import { curr_mon_load, max_mon_load, can_carry, could_reach_item, dmgtype,
         obj_extract_floor, distant_obj_name, Monnam_dm, finish_meating as finish_meating_real,
         /* meatmetal (mon.c:1482) + delobj_core (invent.c:1446) */ obj_resists } from './dogmove.js';
import { can_touch_safely, mfndpos, sobj_at, hideunder, maybe_unhide_at, mpickobj, stairway_at, stairway_find_dir, upstart, wake_nearto,
         /* meatmetal (mon.c:1521) */ mksobj_at,
         /* meatmetal (mon.c:1473) */ is_rustprone,
 healmon as healmon_real, meatobj as meatobj_real,
         meatcorpse as meatcorpse_real, newcham } from './mklev.js';
import { accessible, closed_door, may_dig } from './look.js';
import { m_at, mon_nam, autoreturn_weapon } from './uhitm.js';
import { gettrack } from './track.js';
import { artifact_light } from './light.js';
/* C monmove.c:1844/1846 — m_move's tengu teleport arm calls both.  Both are
 * complete ports in js/teleport.js (which already imports this module; the
 * cycle is fine, they are hoisted function declarations). */
import { rloc, mnexto } from './teleport.js';
import { RLOC_MSG, has_edog, SHOPBASE } from './const.js';
import { can_track, resist_conflict, can_blow, y_monnam, Adjmonnam, wakeup, locomotion } from './mhitm.js';
import { losehp } from './dokick.js';
import { monkilled_trap } from './trap.js';
import { TELEPAT as TELEPAT_MV, HALF_SPDAM as HALF_SPDAM_MV, KILLED_BY_AN as KILLED_BY_AN_MV } from './const.js';
import { see_wsegs, worm_nomove, worm_move } from './worm.js';
import { ranged_attk_available } from './mhitu.js';
import { mon_wield_item, sticks } from './dog.js';
import { mwelded, is_pole, is_mines_prize, is_soko_prize } from './cmd.js';
import { is_pick, mdig_tunnel, mb_trapped } from './dig.js';
import { fracture_rock } from './zap.js';
/* C monflag.h:37 — MZ_LARGE is the first monster size subject to the
 * diagonal tight-squeeze rejection in mfndpos(). */
const MZ_LARGE_MV = 3;
/* C objects[].oc_material — read by mon_would_take_item's is_unicorn and
 * likes_gems arms (monmove.c:1033, :1042). */
import { MKOBJ_OC_MATERIAL } from './mkobj_erosion_meta.js';
/* C objects[otyp].oc_weight — m_consume_obj (mon.c:1399) heals a non-pet by the
 * RAW column, not by weight(obj) (which multiplies by quan).  Pure data module,
 * no imports of its own. */
import { OC_WEIGHT } from './oc_weight.generated.js';
/* C monmove.c:1831 — m_move dispatches a shopkeeper to shk_move (shk.js →
 * move_special in priest.js).  This forms a call-time cycle monmove→shk→
 * priest→monmove; ES module live bindings resolve it because shk_move is only
 * referenced inside m_move's body (never at module-init time). */
import { shk_move, in_rooms, inhishop, add_damage, after_shk_move, costly_spot } from './shk.js';
/* pri_move — same late-bound cycle as shk_move above (priest.js imports
 * _allow_rock_mv from this file); it is only ever called at runtime. */
import { pri_move, in_your_sanctuary } from './priest.js';
/* C ref: region.c — create_gas_cloud/visible_region_at/m_in_out_region are
 * region.c functions called from monmove.c:682-683, :702-704 and :2063. */
import { create_gas_cloud, visible_region_at, m_in_out_region } from './region.js';
import { ENV } from './hostenv.js';
/* C ref: hack.h:49 — BOLT_LIM = 8; BOLT_LIM*BOLT_LIM = 64 */
const BOLT_LIM = 8;
/* C ref: trap.h — SQKY_BOARD = 4 */
const SQKY_BOARD_MV = 4;
/* C ref: trap.c:3064-3067 trapnote names (12 musical notes) */
const SQKY_NOTES_MV = [
    'C note', 'D flat', 'D note', 'E flat', 'E note', 'F note',
    'F sharp', 'G note', 'G sharp', 'A note', 'B flat', 'B note',
];
/* C ref: monflag.h — M1_SEE_INVIS = 0x01000000L (perceives(ptr) macro) */
const M1_SEE_INVIS = 0x01000000;
/* C ref: monflag.h:90-91 — M1_TUNNEL/M1_NEEDPICK (tunnels()/needspick() macros) */
const M1_TUNNEL_MDW = 0x00000020;
const M1_NEEDPICK_MDW = 0x00000040;
/* C ref: objects.h — AXE otyp (dig.js's is_axe uses the same value, unexported) */
const AXE_MDW = 12;
/* C ref: hack.h — PM_GRID_BUG index (NODIAG); hack.h:1419 NODIAG(monnum)=((monnum)==PM_GRID_BUG) */
const PM_GRID_BUG = 116; /* from pm.generated.js PM_GRID_BUG = 116 */
/* C ref: pm.generated.js */
const PM_GREMLIN = 40;
/* C ref: pm.generated.js — for m_postmove_effect */
const PM_HEZROU = 296;
const PM_STEAM_VORTEX = 110;
const onscary_stub = onscary;
/* C ref: mon.c:2462-2469 monnear — is the (x,y) square adjacent to monster?
 * dist2(mon->mx, mon->my, x, y) < 3 (diagonal OK except PM_GRID_BUG). */
function monnear(mon, x, y) {
    const d2 = dist2(mon.mx | 0, mon.my | 0, x | 0, y | 0);
    /* Replay monster records commonly carry mndx/data.pmidx rather than the
     * legacy mnum field.  C's NODIAG test is against the species index, so
     * preserve the grid bug's diagonal restriction across all shapes. */
    const mndx = mon.mnum ?? mon.mndx ?? mon.data?.pmidx;
    if (d2 === 2 && (mndx | 0) === PM_GRID_BUG)
        return 0;
    return d2 < 3 ? 1 : 0;
}
/* C ref: monmove.c:451-457 flees_light macro — gremlin fleeing artifact light.
 * artifact_light() is the canonical light-property lookup; no RNG consumed. */
function flees_light(mtmp) {
    const mndx = (mtmp.mnum ?? mtmp.mndx ?? mtmp.data?.pmidx) | 0;
    if (mndx !== PM_GREMLIN)
        return false;
    const u = game.u;
    if (!u)
        return false;
    const uwep = u.uwep;
    const uarm = u.uarm;
    /* C: (uwep && uwep->lamplit && artifact_light(uwep)) || (uarm && ...) */
    const wepLight = uwep && uwep.lamplit && artifact_light(uwep);
    const armLight = uarm && uarm.lamplit && artifact_light(uarm);
    if (!wepLight && !armLight)
        return false;
    /* C: mon->mcansee && couldsee(mon->mx, mon->my) */
    /* couldsee stub: assume visible if mcansee is set; L15 refines */
    return !!(mtmp.mcansee);
}
function _Invis_mv() {
    const u = game.u;
    if (!u) return false;
    const p = u.uprops?.[INVIS_PROP];
    const HInvis = (p?.intrinsic | 0) || (u.HInvis | 0);
    const EInvis = p?.extrinsic | 0;
    const BInvis = p?.blocked | 0;
    return !!((HInvis || EInvis) && !BInvis);
}
/* C ref: monmove.c:461-533 monflee, synchronous body for distfleeck (whose
 * callers in js/dochug.js do not await).  js/makemon.js's async monflee is the
 * same body; its only await is the u.ustuck release (monmove.c:473-474), which
 * is a no-op stub there too (unstuck/expels in js/dog.js). */
function monflee_sync(mtmp, fleetime, first, fleemsg) {
    if ((mtmp.mhp | 0) < 1)
        return;
    if (!first || !mtmp.mflee) {
        if (!fleetime) {
            mtmp.mfleetim = 0;
        } else if (!mtmp.mflee || mtmp.mfleetim) {
            fleetime += (mtmp.mfleetim | 0);
            if (fleetime === 1)
                fleetime++;
            mtmp.mfleetim = Math.min(fleetime, 127);
        }
        const apt = (mtmp.m_ap_type | 0) & M_AP_TYPMASK;
        if (!mtmp.mflee && fleemsg && canseemon(mtmp) && apt !== 1 /* M_AP_FURNITURE */ && apt !== 2 /* M_AP_OBJECT */) {
            if (!mtmp.mcanmove || !(mtmp.data ? mtmp.data.mmove | 0 : 0)) {
                pline(`${Adjmonnam(mtmp, 'immobile')} seems to flinch.`);
            } else if (flees_light(mtmp)) {
                const u = game.u || {};
                const p = u.uprops ? u.uprops[DEAF] : null;
                const deaf = !!((p && ((p.intrinsic | 0) || (p.extrinsic | 0))) || (u.uroleplay && u.uroleplay.deaf));
                if (Unaware()) {
                    pline(`${Monnam_dm(mtmp)} is frightened.`);
                } else if (rn2(10) || deaf) {
                    const lsrc = (u.uwep && artifact_light(u.uwep)) ? bare_artifactname(u.uwep)
                        : (u.uarm && artifact_light(u.uarm)) ? xname(u.uarm) : '[its imagination?]';
                    pline(`${Monnam_dm(mtmp)} flees from the painful light of ${lsrc}.`);
                } else {
                    pline('Bright light!');
                }
            } else {
                pline(`${Monnam_dm(mtmp)} turns to flee.`);
            }
        }
        if (mtmp.data && (mtmp.data.pmidx | 0) === PM_VROCK && !mtmp.mspec_used) {
            mtmp.mspec_used = 75 + rn2(25);
            create_gas_cloud(mtmp.mx | 0, mtmp.my | 0, 5, 8);
        }
        mtmp.mflee = 1;
    }
    mon_track_clear(mtmp);
}
export function distfleeck(mtmp) {
    const u = game.u;
    if (!u || !mtmp)
        return { inrange: 0, nearby: 0, scared: 0 };
    const bravegremlin = (rn2(5) === 0) ? 1 : 0;
    /* C monmove.c:542-543:
     * *inrange = (dist2(mtmp->mx, mtmp->my, mtmp->mux, mtmp->muy) <= BOLT_LIM*BOLT_LIM)
     * Uses mux/muy (perceived hero position), not actual u.ux/u.uy. */
    const mx = mtmp.mx | 0;
    const my = mtmp.my | 0;
    const mux = (mtmp.mux !== undefined ? mtmp.mux : (u.ux | 0)) | 0;
    const muy = (mtmp.muy !== undefined ? mtmp.muy : (u.uy | 0)) | 0;
    const inrange = (dist2(mx, my, mux, muy) <= (BOLT_LIM * BOLT_LIM)) ? 1 : 0;
    /* C monmove.c:544: *nearby = *inrange && monnear(mtmp, mtmp->mux, mtmp->muy) */
    const nearby = (inrange && monnear(mtmp, mux, muy)) ? 1 : 0;
    /* C monmove.c:553-558: seescaryx/seescaryy — where monster thinks Elbereth is.
     * If mcansee=0 or (Invis && !perceives): use mux/muy; else u.ux/u.uy. */
    let seescaryx, seescaryy;
    const Invis = _Invis_mv();
    const perceives_data = !!((mtmp.data.mflags1 || 0) & M1_SEE_INVIS);
    if (!mtmp.mcansee || (Invis && !perceives_data)) {
        seescaryx = mux;
        seescaryy = muy;
    }
    else {
        seescaryx = u.ux | 0;
        seescaryy = u.uy | 0;
    }
    /* C monmove.c:561: sawscary = onscary(seescaryx, seescaryy, mtmp) */
    const sawscary = onscary_stub(seescaryx, seescaryy, mtmp) ? 1 : 0;
    let fleelight = 0;
    let sanctuary = 0;
    if (nearby) {
        if (!sawscary) {
            /* C monmove.c:564: fleelight = flees_light(mtmp) && !bravegremlin */
            fleelight = (flees_light(mtmp) && !bravegremlin) ? 1 : 0;
            if (!fleelight) {
                /* C monmove.c:565-567: sanctuary = !mpeaceful && in_your_sanctuary(mtmp,0,0) */
                sanctuary = (!mtmp.mpeaceful && typeof game.u?.urooms === 'string'
                             && in_your_sanctuary(mtmp, 0, 0)) ? 1 : 0;
            }
        }
    }
    let scared = 0;
    if (nearby && (sawscary || fleelight || sanctuary)) {
        scared = 1;
        /* C monmove.c:572: monflee(mtmp, rnd(rn2(7) ? 10 : 100), TRUE, TRUE)
         * rn2(7) and rnd() must fire even if monflee side-effects are skipped.
         * Minimal port: consume the RNG; set mtmp.mflee=1 for state parity. */
        const flee_rn2_7 = rn2(7);
        monflee_sync(mtmp, rnd(flee_rn2_7 ? 10 : 100), true, true);
    }
    return { inrange, nearby, scared };
}
/* C ref: monmove.c:1739 m_move(struct monst *mtmp, int after)
 * Monster movement dispatch. For tame pets, calls dog_move.
 * For non-tame monsters, runs the normal movement AI.
 * Returns MMOVE_* constants (0=nothing, 1=moved, 2=died, 3=done, 4=nomoves).
 *
 * C structure (monmove.c:1739-2099):
 *  1. mintrap if mtrapped (no RNG in common case)
 *  2. meating check (no RNG)
 *  3. hides_under + rn2(10) (conditional)
 *  4. set_apparxy
 *  5. if mtame: return postmov(... dog_move(mtmp, after) ...)
 *  6. is_covetous branch
 *  7. shopkeeper/guard/priest branch
 *  8. tengu teleport: rn2(5), rn2(2)
 *  9. Normal movement: appr selection (rn2(11), rn2(3)), mfndpos, position loop
 */
const MMOVE_NOTHING_MV = 0;
const MMOVE_MOVED_MV   = 1;
const MMOVE_DIED_MV    = 2;
/* C monattk.h M_ATTK_* — mattackm's return bits, and mon.h NORMAL_SPEED. */
const M_ATTK_MISS_MV = 0x0;
const M_ATTK_HIT_MV = 0x1;
const M_ATTK_DEF_DIED_MV = 0x2;
const M_ATTK_AGR_DIED_MV = 0x4;
const NORMAL_SPEED_MV = 12;
const MMOVE_DONE_MV    = 3;
const MMOVE_NOMOVES_MV = 4;

/* C trap.h trap_result enum — mintrap()'s return.  Trap_Killed_Mon / Trap_Moved_Mon
 * both end the monster's turn (C monmove.c:1536 → return MMOVE_DIED). */
const TRAP_CAUGHT_MON_MV = 1;
const TRAP_KILLED_MON_MV = 2;
const TRAP_MOVED_MON_MV  = 3;

/* C trap.h: #define NO_TRAP_FLAGS 0L */
const NO_TRAP_FLAGS_MV = 0;

/* C ref: mfndpos.h */
const ALLOW_U_MV      = 0x00040000;
const ALLOW_M_MV      = 0x00080000;
const ALLOW_TM_MV     = 0x00100000;  /* ALLOW_TM — can attack tame monsters */
const ALLOW_MDISP_MV  = 0x00001000;
const ALLOW_TRAPS_MV  = 0x00020000;
const ALLOW_SANCT_MV  = 0x20000000;
const ALLOW_SSM_MV    = 0x40000000;
const NOTONL_MV       = 0x00200000;
const OPENDOOR_MV     = 0x00400000;  /* mfndpos.h OPENDOOR — mover can open a closed door */
const UNLOCKDOOR_MV   = 0x00800000;  /* mfndpos.h UNLOCKDOOR — mover can unlock a locked door */

/* C mon.c mon_allowflags(): a monster grants itself OPENDOOR when it can_open,
 * i.e. it has hands and isn't very small.  This is what lets a door-opening
 * monster keep a closed door as a candidate square in mfndpos() (so the
 * candidate count cnt — which bounds rn2(4*(cnt-j)) at monmove.c:1987 —
 * matches C).  monflag.h M1_NOHANDS=0x2000; verysmall = (msize < MZ_SMALL). */
const M1_NOHANDS_MV = 0x00002000;
const MZ_SMALL_MV = 1;
const _MONS_MV = /** @type {number[][]} */ (monsPack.mons);
const _MONS_MSIZE_MV = monMsizePack.msize;

/* C ref: trap.h — trap-type enum + count (subset used by m_harmless_trap). */
const TRAPNUM_MV = 26;
const T_ARROW_MV=1, T_DART_MV=2, T_ROCK_MV=3, T_SQKY_MV=4, T_BEAR_MV=5,
      T_LANDMINE_MV=6, T_ROLLBOULDER_MV=7, T_SLPGAS_MV=8, T_RUST_MV=9,
      T_FIRE_MV=10, T_PIT_MV=11, T_SPIKEDPIT_MV=12, T_HOLE_MV=13,
      T_TRAPDOOR_MV=14, T_TELEP_MV=15, T_LEVTELEP_MV=16, T_MAGICPORTAL_MV=17,
      T_WEB_MV=18, T_STATUE_MV=19, T_MAGIC_MV=20, T_ANTIMAGIC_MV=21,
      T_POLY_MV=22, T_VIBSQ_MV=23;
/* monflag.h flag1 bits used below. */
const M1_FLY_MV = 0x00000001, M1_AMORPHOUS_MV = 0x00000004, M1_UNSOLID_MV = 0x00100000;
/* C monsters.h:2594 MON(... IRON_GOLEM) → mons[] index 259 (js/pm.generated.js
 * PM_IRON_GOLEM = 259).  Was 277, which is PM_SOLDIER — the rust-trap immunity
 * test below then exempted the soldier and rusted the iron golem. */
const PM_IRON_GOLEM_MV = 259;

/* C ref: mfndpos.h ALLOW_ROCK + mondata.h passes_walls/throws_rocks.
 * A boulder square is a candidate only for movers that have ALLOW_ROCK, set by
 * mon_allowflags (mon.c:2080-2083) when the mover passes_walls, throws_rocks, or
 * m_can_break_boulder.  BOULDER is otyp 475 everywhere (objects.h:1619); there is
 * no separate "search-item" object numbering. */
const ALLOW_ROCK_MV = 0x02000000;
const M1_WALLWALK_MV = 0x00000008;   /* monflag.h M1_WALLWALK → passes_walls */
const M2_ROCKTHROW_MV = 0x08000000;  /* monflag.h M2_ROCKTHROW → throws_rocks */
const BOULDER_FLOOR_OTYP_MV = 475;   /* live BOULDER otyp (mklev.js:160) */
/* C ref: monst.c — the Riders (Death/Pestilence/Famine).  is_rider() (mondata.h)
 * tests those three mons[] indices.
 * C monsters.h:3153/3163/3173 MON(... DEATH/PESTILENCE/FAMINE) → 311/312/313
 * (js/pm.generated.js, and the already-correct duplicate PM_*_MCBB block below
 * at line ~1751).  Was 318/319/320 = shark / giant eel / electric eel. */
const PM_DEATH_MV = 311, PM_PESTILENCE_MV = 312, PM_FAMINE_MV = 313;
function _is_rider_mv(mndx) {
    return mndx === PM_DEATH_MV || mndx === PM_PESTILENCE_MV || mndx === PM_FAMINE_MV;
}
function _m_can_break_boulder_mv(mtmp, mndx) {
    if (_is_rider_mv(mndx))
        return true;
    if (mtmp.mspec_used | 0)
        return false;
    return !!(mtmp.isshk || mtmp.ispriest);
}
export function _allow_rock_mv(mtmp) {
    const mndx = (mtmp.mndx ?? mtmp.mnum ?? 0) | 0;
    const mrow = (mndx >= 0 && mndx < _MONS_MV.length) ? _MONS_MV[mndx] : null;
    const mf1 = mrow ? (mrow[6] >>> 0) : 0;
    const mf2 = mrow ? (mrow[7] >>> 0) : 0;
    const passes_walls = !!(mf1 & M1_WALLWALK_MV);
    const throws_rocks = !!(mf2 & M2_ROCKTHROW_MV);
    if (passes_walls || throws_rocks || _m_can_break_boulder_mv(mtmp, mndx))
        return ALLOW_ROCK_MV;
    return 0;
}

export function _can_open_mv(mtmp) {
    const mndx = (mtmp.mndx ?? mtmp.mnum ?? 0) | 0;
    const mrow = (mndx >= 0 && mndx < _MONS_MV.length) ? _MONS_MV[mndx] : null;
    const mf1 = mrow ? (mrow[6] >>> 0) : 0;
    const msize = (mndx >= 0 && mndx < _MONS_MSIZE_MV.length) ? (_MONS_MSIZE_MV[mndx] | 0) : MZ_SMALL_MV;
    const can_open = !((mf1 & M1_NOHANDS_MV) || (msize < MZ_SMALL_MV));
    return can_open ? OPENDOOR_MV : 0;
}

const ALLOW_BARS_MV = 0x10000000;
const AD_RUST_BARS_MV = 24, AD_CORR_BARS_MV = 42; /* attack.h AD_RUST/AD_CORR */
const S_VORTEX_BARS_MV = 22; /* mondata.h mlet S_VORTEX (is_whirly) */

export function _passes_bars_mv(mtmp) {
    const mndx = (mtmp.mndx ?? mtmp.mnum ?? 0) | 0;
    const mrow = (mndx >= 0 && mndx < _MONS_MV.length) ? _MONS_MV[mndx] : null;
    const mlet = mrow ? (mrow[0] | 0) : -1;
    const mf1 = mrow ? (mrow[6] >>> 0) : 0;
    const msize = (mndx >= 0 && mndx < _MONS_MSIZE_MV.length) ? (_MONS_MSIZE_MV[mndx] | 0) : MZ_SMALL_MV;
    const passes_walls = !!(mf1 & M1_WALLWALK_MV);
    const amorphous = !!(mf1 & M1_AMORPHOUS_MV);
    const unsolid = !!(mf1 & M1_UNSOLID_MV);
    const is_whirly = (mlet === S_VORTEX_BARS_MV);
    const verysmall = (msize < MZ_SMALL_MV);
    /* dmgtype()/dmgtype_fromattack() (js/makemon.js) index by ptr.pmidx, not
     * mlet/mflags1 — a minimal pmidx-only shim is all it reads. */
    const mdatShim = { pmidx: mndx };
    /* mondata.c:560-562: rock moles eat bars; small slithy things slip through */
    const metallivorous = !!(mf1 & 0x80000000);
    const slithy = !!(mf1 & 0x00080000);
    const bigmonst = msize >= MZ_LARGE_MV;
    const passes_bars = passes_walls || amorphous || unsolid || is_whirly || verysmall
        || dmgtype(mdatShim, AD_RUST_BARS_MV) || dmgtype(mdatShim, AD_CORR_BARS_MV)
        || metallivorous || (slithy && !bigmonst);
    return passes_bars ? ALLOW_BARS_MV : 0;
}

export function mon_allowflags(mtmp) {
    const mndx = (mtmp.mndx ?? mtmp.mnum ?? 0) | 0;
    const mrow = (mndx >= 0 && mndx < _MONS_MV.length) ? _MONS_MV[mndx] : null;
    const mlet = mrow ? (mrow[0] | 0) : -1;
    const mf1 = mrow ? (mrow[6] >>> 0) : 0;
    const mf2 = mrow ? (mrow[7] >>> 0) : 0;
    const msize = (mndx >= 0 && mndx < _MONS_MSIZE_MV.length) ? (_MONS_MSIZE_MV[mndx] | 0) : MZ_SMALL_MV;

    let allowflags = 0;
    /* C: can_open = !(nohands(mtmp->data) || verysmall(mtmp->data)) */
    const can_open = !((mf1 & M1_NOHANDS_MV) || (msize < MZ_SMALL_MV));
    /* C: can_unlock = ((can_open && monhaskey(mtmp, TRUE)) || mtmp->iswiz
                        || is_rider(mtmp->data)) */
    const can_unlock = ((can_open && monhaskey(mtmp, true)) || !!mtmp.iswiz
                        || _is_rider_mv(mndx));
    /* C: doorbuster = is_giant(mtmp->data) */
    const doorbuster = !!(mf2 & M2_GIANT_MAF);
    /* C: can_tunnel = (tunnels(mtmp->data) && !Is_rogue_level(&u.uz)) */
    let can_tunnel = !!(mf1 & M1_TUNNEL_MDW) && !Is_rogue_level(game.u?.uz);
    /* C mon.c:2072-2076 — same criteria as m_move(): don't tunnel if hostile
     * and close enough to prefer a weapon. */
    if (can_tunnel && (mf1 & M1_NEEDPICK_MDW)
        && ((!(mtmp.mpeaceful | 0) || _conflict_mv())
            && dist2(mtmp.mx | 0, mtmp.my | 0, mtmp.mux | 0, mtmp.muy | 0) <= 8))
        can_tunnel = false;

    if (mtmp.mtame)
        allowflags |= ALLOW_M_MV | ALLOW_TRAPS_MV | ALLOW_SANCT_MV | ALLOW_SSM_MV;
    else if (mtmp.mpeaceful)
        allowflags |= ALLOW_SANCT_MV | ALLOW_SSM_MV;
    else
        allowflags |= ALLOW_U_MV;
    /* C: if (Conflict && !resist_conflict(mtmp)) — resist_conflict draws
     * rnd(20), so the Conflict guard is load-bearing on the RNG axis. */
    if (_conflict_mv() && !resist_conflict(mtmp))
        allowflags |= ALLOW_U_MV;
    if (mtmp.isshk)
        allowflags |= ALLOW_SSM_MV;
    if (mtmp.ispriest)
        allowflags |= ALLOW_SSM_MV | ALLOW_SANCT_MV;
    if (mf1 & M1_WALLWALK_MV)
        allowflags |= (ALLOW_ROCK_MV | ALLOW_WALL_MAF);
    if ((mf2 & M2_ROCKTHROW_MV) || _m_can_break_boulder_mv(mtmp, mndx))
        allowflags |= ALLOW_ROCK_MV;
    if (can_tunnel)
        allowflags |= ALLOW_DIG_MAF;
    if (doorbuster)
        allowflags |= BUSTDOOR_MAF;
    if (can_open)
        allowflags |= OPENDOOR_MV;
    if (can_unlock)
        allowflags |= UNLOCKDOOR_MV;
    /* C: passes_bars(mtmp->data) && (mtmp != u.ustuck || unsolid(youmonst)
     *                                || verysmall(youmonst)) */
    if (_passes_bars_mv(mtmp) && (mtmp !== (game.u?.ustuck ?? null) || _u_squeezable_mv()))
        allowflags |= ALLOW_BARS_MV;
    /* C mon.c:2110-2113: is_displacer → ALLOW_MDISP is #if 0'd out; mfndpos
     * does it instead. Not ported here, matching C. */
    if ((mf2 & M2_MINION_MAF) || _is_rider_mv(mndx))
        allowflags |= ALLOW_SANCT_MV;
    /* C: is_unicorn(mtmp->data) && !noteleport_level(mtmp) → NOTONL */
    if (mlet === S_UNICORN_MAF && (mf2 & M2_JEWELS_MAF) && !_noteleport_level_mv(mtmp, mndx))
        allowflags |= NOTONL_MV;
    if ((mf2 & M2_HUMAN_MAF) || mndx === PM_MINOTAUR_MAF)
        allowflags |= ALLOW_SSM_MV;
    if (((mf2 & M2_UNDEAD_MAF) && mlet !== S_GHOST_MAF) || is_vampshifter(mtmp))
        allowflags |= NOGARLIC_MAF;

    return allowflags;
}

/* C monmove.c:581-651 mind_blast — a mind flayer unleashes a mind blast. */
export async function mind_blast(mtmp) {
    const g = game;
    const u = g.u;
    if (canseemon(mtmp))
        await pline(`${Monnam_dm(mtmp)} concentrates.`);
    const mdx = (u.ux | 0) - (mtmp.mx | 0), mdy = (u.uy | 0) - (mtmp.my | 0);
    if (mdx * mdx + mdy * mdy > BOLT_LIM * BOLT_LIM) {
        await pline('You sense a faint wave of psychic energy.');
        return;
    }
    await pline('A wave of psychic energy pours over you!');
    const _on = (id) => { const p = u.uprops?.[id]; return !!(p && (p.intrinsic || p.extrinsic)); };
    if (mtmp.mpeaceful && (!_on(CONFLICT_MAF) || resist_conflict(mtmp))) {
        await pline('It feels quite soothing.');
    } else if (!u.uinvulnerable) {
        const m_sen = !!sensemon(mtmp);
        const blind_telepat = _on(TELEPAT_MV);
        if (m_sen || (blind_telepat && rn2(2)) || !rn2(10)) {
            const ym = g.youmonst;
            if (u.uundetected) {
                u.uundetected = 0;
                newsym(u.ux, u.uy);
            } else if (ym && (ym.m_ap_type | 0) !== M_AP_NOTHING && (ym.m_ap_type | 0) !== M_AP_MONSTER) {
                ym.m_ap_type = M_AP_NOTHING;
                ym.mappearance = 0;
                newsym(u.ux, u.uy);
            }
            await pline(`It locks on to your ${m_sen ? 'telepathy' : blind_telepat ? 'latent telepathy' : 'mind'}!`);
            let dmg = rnd(15);
            if (_on(HALF_SPDAM_MV))
                dmg = Math.trunc((dmg + 1) / 2);
            await losehp(dmg, 'psychic blast', KILLED_BY_AN_MV);
        }
    }
    for (let m2 = g.fmon, nmon; m2; m2 = nmon) {
        nmon = m2.nmon;
        if ((m2.mhp | 0) <= 0) continue;
        if (!!m2.mpeaceful === !!mtmp.mpeaceful) continue;
        const pm = (m2.mndx ?? m2.mnum ?? -1) | 0;
        const mrow = (pm >= 0 && pm < _MONS_MV.length) ? _MONS_MV[pm] : null;
        if (mrow && ((mrow[6] | 0) & M1_MINDLESS_MV)) continue;
        if (m2 === mtmp) continue;
        const telepathic = (pm === 28 || pm === 48 || pm === 49); /* floating eye, mind flayers */
        if ((telepathic && (rn2(2) || m2.mblinded)) || !rn2(10)) {
            await wakeup(m2, false);
            if (cansee(m2.mx, m2.my))
                await pline(`It locks on to ${mon_nam(m2)}.`);
            m2.mhp -= rnd(15);
            if ((m2.mhp | 0) <= 0)
                await monkilled_trap(m2, '');
        }
    }
}
/* C ref: mfndpos.h — the bits mon_allowflags sets that had no local name yet. */
const ALLOW_WALL_MAF = 0x04000000;
const ALLOW_DIG_MAF  = 0x08000000;
const BUSTDOOR_MAF   = 0x01000000;
const NOGARLIC_MAF   = 0x80000000 | 0;   /* int32 — mfndpos never tests it */
/* C ref: monflag.h / defsym.h — mondata predicates mon_allowflags calls. */
const M2_GIANT_MAF  = 0x00002000;
const M2_MINION_MAF = 0x00001000;
const M2_HUMAN_MAF  = 0x00000008;
const M2_UNDEAD_MAF = 0x00000002;
const M2_JEWELS_MAF = 0x20000000;   /* likes_gems(), the is_unicorn() filter */
const S_UNICORN_MAF = 21;
const S_GHOST_MAF   = 54;
const PM_MINOTAUR_MAF = 177;

/* C macro Conflict (hack.h) — the hero's conflict property, read the same way
 * js/mklev.js:11128 reads it. Kept as a helper so mon_allowflags' two uses
 * cannot drift apart. */
function _conflict_mv() {
    const p = game.u?.uprops?.[CONFLICT_MAF];
    return !!(p && (p.intrinsic || p.extrinsic));
}
/* C: unsolid(gy.youmonst.data) || verysmall(gy.youmonst.data) — only consulted
 * when the monster IS u.ustuck, which our port never sets; a polymorphed hero's
 * mons row would be needed to answer it, so the honest answer here is "no",
 * which is what an unpolymorphed human hero answers in C too. */
function _u_squeezable_mv() {
    return false;
}
/* C: noteleport_level(mtmp) — js/makemon.js's port reads mon.data (the
 * materialized permonst), which live monst objects do not carry, so hand it the
 * same permonstTemplate() shim the rest of this file uses. Only reached for
 * unicorns, which is why it is worth the shim rather than a second port. */
function _noteleport_level_mv(mtmp, mndx) {
    try {
        return !!noteleport_level(mtmp.data ? mtmp : { ...mtmp, data: permonstTemplate(mndx) });
    } catch {
        return false;
    }
}

function m_balks_at_approaching(oldappr, mtmp, prefrange) {
    const mwep = mtmp.mw ?? null;
    const x = mtmp.mx | 0, y = mtmp.my | 0;
    const ux = mtmp.mux | 0, uy = mtmp.muy | 0;
    const edist = dist2(x, y, ux, uy);

    prefrange.min = 0;
    prefrange.max = 0;

    /* peaceful, far away, or can't see you */
    if ((mtmp.mpeaceful | 0) || (edist >= 5 * 5) || !_m_canseeu_mv(mtmp))
        return oldappr;

    /* has ammo+launcher */
    if (m_has_launcher_and_ammo(mtmp))
        return -1;

    /* is using a polearm and in range */
    if (mwep && is_pole(mwep) && edist <= MON_POLE_DIST_MV)
        return -1;

    /* is using a throw-and-return weapon; provide min and max preferred range */
    if (mwep) {
        const arw = autoreturn_weapon(mwep);
        if (arw) {
            prefrange.min = 2 * 2;
            prefrange.max = arw.range | 0;
            return -2;
        }
    }

    /* can attack from distance, and hp loss or attack not used */
    if (ranged_attk_available(mtmp)
        && (((mtmp.mhp | 0) < (((mtmp.mhpmax | 0) + 1) / 3))
            || !(mtmp.mspec_used | 0)))
        return -1;

    return oldappr; /* leaves appr unchanged */
}
/* C ref: hack.h:1435 MON_POLE_DIST — how far monsters can use pole-weapons. */
const MON_POLE_DIST_MV = 5;
/* C ref: vision.h:50 m_canseeu(m) =
 *   (!Invis || perceives(m->data)) && !Underwater && couldsee(m->mx, m->my)
 * (the live variant; the #if 0 arm also tests u.uburied/m->mburied). */
function _m_canseeu_mv(mtmp) {
    const u = game.u;
    const Invis = _Invis_mv();
    const mndx = (mtmp.mndx ?? mtmp.mnum ?? 0) | 0;
    const mf1 = (mtmp.data && mtmp.data.mflags1 != null)
        ? (mtmp.data.mflags1 >>> 0)
        : ((mndx >= 0 && mndx < _MONS_MV.length) ? (_MONS_MV[mndx][6] >>> 0) : 0);
    const perceives = !!(mf1 & M1_SEE_INVIS);
    return (!Invis || perceives) && !u?.uinwater && couldsee(mtmp.mx | 0, mtmp.my | 0);
}

function floor_trigger_mv(ttyp) {
    return ttyp >= T_ARROW_MV && ttyp <= T_TRAPDOOR_MV;
}

function m_harmless_trap_mv(mtmp, ttmp) {
    const ttyp = ttmp.ttyp | 0;
    const mndx = (mtmp.mndx ?? mtmp.mnum ?? 0) | 0;
    const mf1 = (mndx >= 0 && mndx < _MONS_MV.length) ? (_MONS_MV[mndx][6] | 0) : 0;
    const isFlyer = !!(mf1 & M1_FLY_MV);
    const amorphous = !!(mf1 & M1_AMORPHOUS_MV);
    const unsolid = !!(mf1 & M1_UNSOLID_MV);
    const msize = (mndx >= 0 && mndx < _MONS_MSIZE_MV.length) ? (_MONS_MSIZE_MV[mndx] | 0) : MZ_SMALL_MV;
    /* C monst.h:272 `resists_sleep(mon)` -> Resists_Elem(mon, SLEEP_RES).
     * mresists is MONS row column 5; sleep resistance is bit 0x04. */
    const resistsSleep = (mndx >= 0 && mndx < _MONS_MV.length)
        && (((_MONS_MV[mndx][5] | 0) & 0x04) !== 0);
    if (floor_trigger_mv(ttyp) && isFlyer)
        return true;
    switch (ttyp) {
        case T_ARROW_MV: case T_DART_MV: case T_ROCK_MV: case T_SQKY_MV:
        case T_LANDMINE_MV: case T_ROLLBOULDER_MV:
            break;
        case T_BEAR_MV:
            if (msize <= MZ_SMALL_MV || amorphous || unsolid) return true;
            break;
        case T_SLPGAS_MV:
            if (resistsSleep) return true;
            break;
        case T_RUST_MV:
            if (mndx !== PM_IRON_GOLEM_MV) return true;
            break;
        case T_FIRE_MV: /* resists_fire — default no */ break;
        case T_PIT_MV: case T_SPIKEDPIT_MV: case T_HOLE_MV: case T_TRAPDOOR_MV:
            /* is_clinger — default no */ break;
        case T_TELEP_MV: case T_LEVTELEP_MV: case T_MAGICPORTAL_MV: case T_POLY_MV:
            break;
        case T_WEB_MV:
            if (amorphous || unsolid) return true;
            break;
        case T_STATUE_MV: return true;
        case T_MAGIC_MV: return true;
        case T_ANTIMAGIC_MV: /* resists_magm — default no */ break;
        case T_VIBSQ_MV: return true;
        default: break;
    }
    return false;
}

/* C ref: rm.h — tile types for wall/obstructed detection (enum levl_typ_types). */
const POOL_TYP_MV = 16;  /* POOL — IS_OBSTRUCTED(typ) = (typ) < POOL */
const TREE_TYP_MV = 13;  /* TREE */
const DOOR_TYP_MV = 23;  /* DOOR — IS_DOOR(typ) = (typ) == DOOR */
const WATER_TYP_MV = 18; /* WATER — IS_WATERWALL(typ) = (typ) == WATER */
const D_BROKEN_MV = 0x01;
/* D_ISOPEN = 0x02 (passable; an open door is accepted because neither D_CLOSED
 * nor D_LOCKED is set).  Referenced by the postmov door-open block below. */
const D_ISOPEN_MV = 0x02;
const D_CLOSED_MV = 0x04;
const D_LOCKED_MV = 0x08;
const D_TRAPPED_MV = 0x10; /* doormask trap flag (rm.h) */
const D_NODOOR_MV = 0x00;  /* rm.h — no door at all; what a door trap leaves */
/* artilist.h row 29 — The Master Key of Thievery (obj->oartifact index). */
const ART_MASTER_KEY_MV = 29;
const COLNO_MV = 80;
/* C ref: global.h:385 — ROWNO = 21 (map proper is rows 0..20). The screen is
 * 24 rows tall (status + 21 map + messages), but mfndpos clamps to ROWNO-1=20
 * via maxy = min(y+1, ROWNO-1). Was erroneously 24 here; const.js/dogmove.js
 * both use 21. Affects bottom-edge monsters' candidate-square count. */
const ROWNO_MV = 21;
const MTSZ_MV = 4;
/* C ref: pm.generated.js — PM_GRID_BUG has NODIAG set (cannot move diagonally). */
const PM_GRID_BUG_MV = 116; /* pm.generated.js PM_GRID_BUG = 116; was 102 (wrong) */

/* C ref: pm.generated.js — monster indices */
const PM_TENGU_MV        = 55;  /* PM_TENGU — from js/pm.generated.js */
const PM_STALKER_MV      = 153; /* PM_STALKER — from js/pm.generated.js */
/* C ref: defsym.h MONSYM() — mlet constants, in defsym.h's own order.
 * These were 11 and 10, which are S_KOBOLD ('k') and S_JELLY ('j'): defsym.h
 * (NetHack 5.0) numbers 'y' LIGHT 25 and 'B' BAT 28, and js/mhitm.js:84,
 * js/dog.js:245 and js/eat.js:746 all already agree on S_LIGHT == 25. */
const S_BAT_MV   = 28; /* defsym.h:327 MONSYM(28, 'B', BAT, S_BAT) */
const S_LIGHT_MV = 25; /* defsym.h:324 MONSYM(25, 'y', LIGHT, S_LIGHT) */

/* C ref: mon.c:2128 mfndpos — faithful candidate-square enumeration for a
 * normal (non-tame, non-covetous, non-special) hostile monster, no RNG consumed.
 * Returns array of { x, y, info } objects, ONE per accepted square, in C's
 * iteration order (nx outer, ny inner). The returned length is the `cnt` that
 * drives m_move's position-loop RNG bounds (rn2(4*(cnt-j)) at monmove.c:1987),
 * so getting cnt exactly right is load-bearing.
 *
 * This ports the acceptance branches of mon.c:2195-2362 for the common early-
 * game case: hero visible (not Invis/Displaced), no poison gas, no covetous
 * digging, no boulders/garlic, onscary stub=false. Branches that require
 * unported world state (poison-gas regions, sanctuary temples, traps the mon
 * knows, MON_AT aggression) are conservatively skipped — they do not reject in
 * the common case. Diagonal squeeze and door-diagonal restrictions ARE ported
 * since they change cnt on rogue/door levels and for grid bugs.
 *
 * allowflags mirrors C `flag` (ALLOW_U for hostiles). */
export function mfndpos_nontame(mtmp, allowflags) {
    let flag = allowflags | 0;
    const x = mtmp.mx | 0;
    const y = mtmp.my | 0;
    const u = game.u;
    const nowloc = game.level?.locations?.[x]?.[y];
    const nowtyp = nowloc ? (nowloc.typ | 0) : 0;
    const nowIsDoor = (nowtyp === DOOR_TYP_MV);
    const nowDoormask = nowloc ? (nowloc.doormask ?? 0) : 0;
    /* C mon.c:2152 — nodiag = NODIAG(mdat - mons): grid bugs can't move diagonally. */
    const mndx = (mtmp.mndx ?? mtmp.mnum ?? 0) | 0;
    const nodiag = (mndx === PM_GRID_BUG_MV);
    /* C mon.c:2187-2192 — mconf forces ALLOW_ALL & clears NOTONL; !mcansee adds ALLOW_SSM. */
    if (mtmp.mconf | 0) {
        /* C mon.c:2187-2189 — flag |= ALLOW_ALL; flag &= ~NOTONL.
         * ALLOW_ALL = ALLOW_U | ALLOW_M | ALLOW_TM | ALLOW_TRAPS (mfndpos.h:15). */
        flag |= (ALLOW_U_MV | ALLOW_M_MV | ALLOW_TM_MV | ALLOW_TRAPS_MV);
        flag &= ~NOTONL_MV;
    }
    if (!(mtmp.mcansee | 0))
        flag |= ALLOW_SSM_MV;
    {
        const mrow = (mndx >= 0 && mndx < _MONS_MV.length) ? _MONS_MV[mndx] : null;
        const mf1 = mrow ? (mrow[6] | 0) : 0;
        const msize = (mndx >= 0 && mndx < _MONS_MSIZE_MV.length) ? (_MONS_MSIZE_MV[mndx] | 0) : MZ_SMALL_MV;
        const can_open = !((mf1 & M1_NOHANDS_MV) || (msize < MZ_SMALL_MV));
        if (can_open)
            flag |= OPENDOOR_MV;
    }
    const positions = [];
    /* C mon.c:2193-2196 — maxx=min(x+1,COLNO-1), maxy=min(y+1,ROWNO-1);
     * nx from max(1,x-1), ny from max(0,y-1). */
    const minx = Math.max(1, x - 1);
    const maxx = Math.min(x + 1, COLNO_MV - 1);
    const miny = Math.max(0, y - 1);
    const maxy = Math.min(y + 1, ROWNO_MV - 1);
    for (let nx = minx; nx <= maxx; nx++) {
        for (let ny = miny; ny <= maxy; ny++) {
            if (nx === x && ny === y) continue;
            const loc = game.level?.locations?.[nx]?.[ny];
            if (!loc) continue; /* off-map / no data → unpassable */
            const ntyp = loc.typ | 0;
            const dm = loc.doormask ?? 0;
            /* C mon.c:2200-2203 — IS_OBSTRUCTED(ntyp) = ntyp < POOL → reject
             * (normal mons can't pass walls or dig). */
            if (ntyp < POOL_TYP_MV) continue;
            /* C mon.c:2210-2211 — IS_WATERWALL(ntyp) && !is_swimmer → reject.
             * is_swimmer stub: false for common early mons. */
            if (ntyp === WATER_TYP_MV) continue;
            /* C mon.c:2219-2226 — closed/locked door rejection (no thrudoor,
             * amorphous/fog stub=false).  A closed door is only rejected when
             * the mover lacks OPENDOOR; a locked door only when it lacks
             * UNLOCKDOOR. */
            if (ntyp === DOOR_TYP_MV) {
                if (((dm & D_CLOSED_MV) && !(flag & OPENDOOR_MV))
                    || ((dm & D_LOCKED_MV) && !(flag & UNLOCKDOOR_MV))) continue;
            }
            /* C mon.c:2233-2243 — diagonal restrictions. */
            if (nx !== x && ny !== y) {
                /* C mon.c:2344-2347 — diagonal tight squeeze.  Large
                 * non-amorphous/non-whirly/non-slithy monsters cannot pass
                 * between two obstructed orthogonal squares.  The old port
                 * handled diagonal door/grid restrictions but omitted this
                 * load-bearing candidate rejection, which changes cnt and
                 * therefore the mtrack rn2 bound. */
                const sideA = game.level?.locations?.[x]?.[ny];
                const sideB = game.level?.locations?.[nx]?.[y];
                const sideAObstructed = !!sideA && ((sideA.typ | 0) < POOL_TYP_MV);
                const sideBObstructed = !!sideB && ((sideB.typ | 0) < POOL_TYP_MV);
                const mrowSqueeze = (mndx >= 0 && mndx < _MONS_MSIZE_MV.length)
                    ? (_MONS_MSIZE_MV[mndx] | 0) : MZ_SMALL_MV;
                const bigSqueeze = mrowSqueeze >= MZ_LARGE_MV;
                if (bigSqueeze && sideAObstructed && sideBObstructed)
                    continue;
                const ntypIsDoor = (ntyp === DOOR_TYP_MV);
                if (nodiag
                    || (nowIsDoor && (nowDoormask & ~D_BROKEN_MV))
                    || (ntypIsDoor && (dm & ~D_BROKEN_MV))) {
                    continue;
                }
                /* rogue-level door diagonal + worm-cross checks: unported world
                 * state; skipped (do not reject in common dungeon rooms). */
            }
            /* C mon.c:2246 — (poolok || is_pool==wantpool) && (lavaok || !is_lava).
             * For a non-air, non-swimmer land mon: pools/lava already rejected
             * above (POOL..DRAWBRIDGE_UP and LAVA types) — but most ARE >= POOL,
             * so honor C: reject pools/lava for a normal walker. */
            if (ntyp >= POOL_TYP_MV && ntyp <= 19 /* POOL..DRAWBRIDGE_UP */) continue;
            if (ntyp === 20 || ntyp === 21 /* LAVAPOOL, LAVAWALL */) continue;
            let info = 0;
            /* C mon.c:2271-2317 — hero-at branch OR else { MON_AT branch }.
             * The two are mutually exclusive (C `if (u_at||mux/muy) {...} else {...}`). */
            if ((u && (u.ux | 0) === nx && (u.uy | 0) === ny)
                || (nx === (mtmp.mux | 0) && ny === (mtmp.muy | 0))) {
                if (u && (u.ux | 0) === nx && (u.uy | 0) === ny) {
                    mtmp.mux = u.ux | 0;
                    mtmp.muy = u.uy | 0;
                }
                if (!(flag & ALLOW_U_MV)) continue;
                info |= ALLOW_U_MV;
            } else {
                let mon_here = null;
                for (let m = game.fmon; m; m = m.nmon) {
                    if (m === mtmp) continue;
                    if ((m.mhp | 0) > 0 && (m.mx | 0) === nx && (m.my | 0) === ny) {
                        mon_here = m; break;
                    }
                }
                if (mon_here) {
                    /* mmflag = flag | mm_aggression(mon, mtmp2); aggression stub = 0 */
                    if (flag & ALLOW_M_MV) {
                        info |= ALLOW_M_MV;
                        if (mon_here.mtame | 0) {
                            if (!(flag & ALLOW_TM_MV)) continue;
                            info |= ALLOW_TM_MV;
                        }
                    } else {
                        /* flag &= ~ALLOW_MDISP; mmflag = flag | mm_displacement();
                         * displacement stub = 0 → no ALLOW_MDISP → reject. */
                        continue;
                    }
                }
            }
            /* sanctuary, garlic, NOTONL branches require unported world state;
             * conservatively not applied (do not reject in the common empty-room
             * early-game case). */
            {
                let hasBoulder = false;
                for (let o = game.level?.levelObjects?.[nx]?.[ny]; o; o = o.nexthere) {
                    if ((o.otyp | 0) === BOULDER_FLOOR_OTYP_MV) { hasBoulder = true; break; }
                }
                if (hasBoulder) {
                    if (!(flag & ALLOW_ROCK_MV)) continue;
                    info |= ALLOW_ROCK_MV;
                }
            }
            {
                const ttmp = t_at(nx, ny);
                if (ttmp) {
                    const tt = ttmp.ttyp | 0;
                    if (tt >= TRAPNUM_MV || tt === 0) {
                        /* C: impossible(...) then continue — drop bogus trap square. */
                        continue;
                    }
                    if (!m_harmless_trap_mv(mtmp, ttmp)) {
                        if (!(flag & ALLOW_TRAPS_MV)) {
                            if (mon_knows_traps(mtmp, tt)) continue;
                        }
                        info |= ALLOW_TRAPS_MV;
                    }
                }
            }
            positions.push({ x: nx, y: ny, info });
        }
    }
    return positions;
}

/* C ref: monflag.h M2_* flags + mondata.h likes_* macros, used by
 * mon_would_take_item.  _MONS_MV[mndx][7] is the monster's mflags2 column. */
const M2_GREEDY_MV  = 0x10000000;
const M2_JEWELS_MV  = 0x20000000;
const M2_COLLECT_MV = 0x40000000;
const M2_MAGIC_MV   = 0x80000000; /* read as >>> below (high bit) */
const M2_ROCKTHROW_MV2 = 0x08000000;
const M1_MINDLESS_MV = 0x00010000;
const M1_ANIMAL_MV   = 0x00040000;
const M1_NOEYES_MV   = 0x00001000;
/* C ref: objclass.h:136 + defsym.h:466-484 oclass numeric values, each row
 * carrying its own index: ILLOBJ=1 WEAPON=2 ARMOR=3 RING=4 AMULET=5 TOOL=6
 * FOOD=7 POTION=8 SCROLL=9 SPBOOK=10 WAND=11 COIN=12 GEM=13 ROCK=14 BALL=15
 * CHAIN=16 VENOM=17.  WEAPON_CLASS_MV was 1 (ILLOBJ). */
const WEAPON_CLASS_MV = 2, ARMOR_CLASS_MV = 3, GEM_CLASS_MV = 13;
const FOOD_CLASS_MV = 7, COIN_CLASS_MV = 12, ROCK_CLASS_MV = 14, BALL_CLASS_MV = 15;
const TOOL_CLASS_MV = 6;      /* searches_for_item's TOOL_CLASS arm */
/* C ref: const.js SQSRCHRADIUS = 5 (mon.c m_search_items search box). */
const SQSRCHRADIUS_MV = 5;
/* C ref: onames — otyps used by mon_would_take_item / m_search_items. */
const GOLD_PIECE_MV = 438;    /* objects.h:1512 COIN("gold piece", ..., GOLD_PIECE) */
/* C ref: objects.h — unlocking tools (monmove.c:96-105 monhaskey) */
const SKELETON_KEY = 221;     /* objects.h:917 */
const LOCK_PICK = 222;        /* objects.h:919 */
const CREDIT_CARD = 223;      /* objects.h:921 */
/* C mon.c:2030 `throws_rocks(mdat) && otyp == BOULDER` and monmove.c:1439
 * `otmp->otyp == ROCK` use the SAME otyps as the rest of the game — there is no
 * separate "search-item" numbering.  Was 262/261 (Candelabrum / unicorn horn). */
const BOULDER_OTYP_MV = 475;  /* objects.h:1619 BOULDER */
const ROCK_OTYP_MV = 474;     /* objects.h:1607 ROCK */
const CORPSE_OTYP_MV = 265;   /* display.js CORPSE = 265 */
const PM_GELATINOUS_CUBE_MV = 8;  /* monsters.h:166 MON(... GELATINOUS_CUBE);
                                   * was 47 = PM_DWARF_RULER */
/* NOTE: C has no PM_UNICORN.  mondata.h:149
 *   #define is_unicorn(ptr) ((ptr)->mlet == S_UNICORN && likes_gems(ptr))
 * is an mlet+flag test, not a mons[] index test, so no such constant exists to
 * declare (a `PM_UNICORN_LO = 0` placeholder used to sit here; 0 is the giant
 * ant, and nothing referenced it). */
/* C objclass.h enum obj_material_types — GEMSTONE = 20 (the is_unicorn filter at
 * monmove.c:1033) and MINERAL = 21 (the likes_gems arm at :1042).  Was 6, which
 * is CLOTH.  Now both are live: see mon_would_take_item below. */
const GEMSTONE_MAT_MV = 20, MINERAL_MAT_MV = 21;

const WAN_MAKE_INVISIBLE_MV = 418, WAN_SPEED_MONSTER_MV = 420;
const WAN_DIGGING_MV = 428, WAN_POLYMORPH_MV = 422, WAN_UNDEAD_TURNING_MV = 421;
const WAN_TELEPORTATION_MV = 424, WAN_CREATE_MONSTER_MV = 413;
const WAN_MAGIC_MISSILE_MV = 429, WAN_FIRE_MV = 430, WAN_COLD_MV = 431;
const WAN_SLEEP_MV = 432, WAN_DEATH_MV = 433, WAN_LIGHTNING_MV = 434;
const POT_INVISIBILITY_MV = 305, POT_SPEED_MV = 302, POT_HEALING_MV = 307;
const POT_EXTRA_HEALING_MV = 308, POT_FULL_HEALING_MV = 315, POT_POLYMORPH_MV = 316;
const POT_GAIN_LEVEL_MV = 309, POT_PARALYSIS_MV = 301, POT_SLEEPING_MV = 314;
const POT_ACID_MV = 320, POT_CONFUSION_MV = 299, POT_BLINDNESS_MV = 300;
const SCR_TELEPORTATION_MV = 333, SCR_CREATE_MONSTER_MV = 329;
const SCR_EARTH_MV = 340, SCR_FIRE_MV = 339;
const AMULET_OF_LIFE_SAVING_MV = 202, AMULET_OF_REFLECTION_MV = 208;
const AMULET_OF_GUARDING_MV = 210;
const PICK_AXE_MV = 259, UNICORN_HORN_MV = 261, FROST_HORN_MV = 250;
const FIRE_HORN_MV = 251, EXPENSIVE_CAMERA_MV = 229;
const LARGE_BOX_MV = 214, BAG_OF_HOLDING_MV = 219, BAG_OF_TRICKS_MV = 220;
const TIN_MV = 296, EGG_MV = 266;
const PM_GHOST_MV = 287, PM_KI_RIN_MV = 124, PM_MANES_MV = 50;
const LOW_PM_MV = 0, NUMMONS_MV = 383;
/* monattk.h AT_GAZE = 15; monst.h MFAST = 2; objclass.h W_ARMG = 16 (obj.h
 * worn-mask bit for gloves); defsym.h S_EYE = 5, S_UNICORN = 21. */
const AT_GAZE_MV = 15, MFAST_MV = 2, W_ARMG_MV = 16;
const S_EYE_MV = 5, S_UNICORN_MV = 21;
/* defsym.h MONSYM rows — S_GOLEM / S_VORTEX (weirdnonliving), and monflag.h
 * M2_UNDEAD for is_undead(). */
const S_GOLEM_MV = 55, S_VORTEX_MV = 22;
const M2_UNDEAD_MV = 0x00000002;
/* monflag.h M2_MERC; mondata.h is_mercenary(ptr). */
const M2_MERC_MV = 0x00000200;

/* C ref: monmove.c:1017 `practical[]` = { WEAPON_CLASS, ARMOR_CLASS, GEM_CLASS,
 * FOOD_CLASS, 0 } and `magical[]` (AMULET/POTION/SCROLL/WAND/RING/SPBOOK). */
function _practical_mv(oclass) {
    return oclass === WEAPON_CLASS_MV || oclass === ARMOR_CLASS_MV
        || oclass === GEM_CLASS_MV || oclass === FOOD_CLASS_MV;
}
/* Same objclass.h space as above: the whole `magical[]` set sat one slot high
 * (AMULET 8=POTION, POTION 9=SCROLL, SCROLL 10=SPBOOK) with RING at 5 (AMULET)
 * and SPBOOK at 6 (TOOL) — so RING_CLASS was never magical and TOOL_CLASS
 * spuriously was. */
const AMULET_CLASS_MV = 5, POTION_CLASS_MV = 8, SCROLL_CLASS_MV = 9;
const WAND_CLASS_MV = 11, RING_CLASS_MV = 4, SPBOOK_CLASS_MV = 10;
function _magical_mv(oclass) {
    return oclass === AMULET_CLASS_MV || oclass === POTION_CLASS_MV
        || oclass === SCROLL_CLASS_MV || oclass === WAND_CLASS_MV
        || oclass === RING_CLASS_MV || oclass === SPBOOK_CLASS_MV;
}

/* C ref: monmove.c:1024 mon_would_take_item(mtmp, otmp).
 * Decides whether mtmp wants to pick up otmp (drives m_search_items goal
 * redirection).  No RNG.  searches_for_item (muse.c:2705) returns TRUE only for
 * specific useful otyps (offensive/defensive wands, healing potions, escape
 * scrolls, reflection amulets, pick-axe/horn tools, and only CORPSE/TIN/EGG in
 * FOOD_CLASS with petrify-cure conditions).  For the common early-game collector
 * (goblin/orc/etc. with M2_COLLECT) the *likes_objs* + practical[] branch is the
 * one that fires for ordinary weapons/armor/gems/food, so that branch is ported
 * exactly; searches_for_item is ported faithfully for the cases it returns TRUE
 * and FALSE for ordinary items (where likes_objs already decides). */
export function mon_would_take_item(mtmp, otmp) {
    const mndx = (mtmp.mndx ?? mtmp.mnum ?? 0) | 0;
    const mrow = (mndx >= 0 && mndx < _MONS_MV.length) ? _MONS_MV[mndx] : null;
    const mflags1 = mrow ? (mrow[6] | 0) : 0;
    /* mflags2 is 32-bit; M2_MAGIC is the high bit, read unsigned via >>> 0. */
    const mflags2 = mrow ? ((mrow[7] >>> 0)) : 0;
    const mlet = mrow ? (mrow[0] | 0) : 0;
    const otyp = otmp.otyp | 0;
    const oclass = otmp.oclass | 0;

    const cload = curr_mon_load(mtmp);
    const mxload = max_mon_load(mtmp);
    const pctload = mxload > 0 ? Math.trunc((cload * 100) / mxload) : 100;

    if (mtmp.mtame && (otmp.cursed | 0))
        return false;
    const mindless = !!(mflags1 & M1_MINDLESS_MV);
    const is_animal = !!(mflags1 & M1_ANIMAL_MV);
    const likes_objs = !!(mflags2 & M2_COLLECT_MV) || is_armed_mv(mndx);
    const likes_gold = !!(mflags2 & M2_GREEDY_MV);
    const likes_gems = !!(mflags2 & M2_JEWELS_MV);
    const likes_magic = !!(mflags2 & M2_MAGIC_MV);

    if (mlet === S_UNICORN_MV && likes_gems
        && _oc_material_mv(otyp) !== GEMSTONE_MAT_MV)
        return false;

    if (!mindless && !is_animal && pctload < 75 && searches_for_item_mv(mtmp, otmp))
        return true;
    if (likes_gold && otyp === GOLD_PIECE_MV && pctload < 95)
        return true;
    /* C: objects[otyp].oc_material != MINERAL — now a real table read, so
     * luckstone/loadstone/touchstone/flint/rock are excluded as C excludes
     * them (the stub returned a constant 1, making this arm unconditional). */
    if (likes_gems && oclass === GEM_CLASS_MV && _oc_material_mv(otyp) !== MINERAL_MAT_MV
        && pctload < 85)
        return true;
    if (likes_objs && _practical_mv(oclass) && pctload < 75)
        return true;
    if (likes_magic && _magical_mv(oclass) && pctload < 85)
        return true;
    /* throws_rocks && BOULDER && pctload<50 && !Sokoban */
    if (!!(mflags2 & M2_ROCKTHROW_MV2) && otyp === BOULDER_OTYP_MV && pctload < 50)
        return true;
    if (mndx === PM_GELATINOUS_CUBE_MV
        && oclass !== ROCK_CLASS_MV && oclass !== BALL_CLASS_MV
        && !(otyp === CORPSE_OTYP_MV /* && touch_petrifies — stub false */))
        return true;
    return false;
}

function searches_for_item_mv(mon, obj) {
    const typ = obj.otyp | 0;
    const mndx = (mon.mndx ?? mon.mnum ?? 0) | 0;
    const mrow = (mndx >= 0 && mndx < _MONS_MV.length) ? _MONS_MV[mndx] : null;
    const mflags1 = mrow ? (mrow[6] >>> 0) : 0;
    const mlet = mrow ? (mrow[0] | 0) : -1;

    if ((obj.where | 0) === OBJ_FLOOR
        && (obj.ox | 0) === (mon.mx | 0) && (obj.oy | 0) === (mon.my | 0)
        && onscary_stub(obj.ox | 0, obj.oy | 0, mon))
        return false;

    /* C muse.c:2770-2773 — animals, mindless monsters and ghosts (which must not
     * loot bones piles) never search. */
    if ((mflags1 & M1_ANIMAL_MV) || (mflags1 & M1_MINDLESS_MV)
        || mndx === PM_GHOST_MV)
        return false;

    /* C muse.c:2775-2778 */
    if (typ === WAN_MAKE_INVISIBLE_MV || typ === POT_INVISIBILITY_MV)
        return !(mon.minvis | 0) && !(mon.invis_blkd | 0)
               && !attacktype({ pmidx: mndx }, AT_GAZE_MV);
    if (typ === WAN_SPEED_MONSTER_MV || typ === POT_SPEED_MV)
        return (mon.mspeed | 0) !== MFAST_MV;

    switch (obj.oclass | 0) {
    case WAND_CLASS_MV:
        /* C muse.c:2781-2792 */
        if ((obj.spe | 0) <= 0)
            return false;
        if (typ === WAN_DIGGING_MV)
            return !(mlet === S_EYE_MV || mlet === S_LIGHT_MV); /* !is_floater */
        if (typ === WAN_POLYMORPH_MV)
            return (mrow ? (mrow[2] | 0) : 0) < 6; /* mons[].difficulty */
        if (_wand_oc_dir_is_ray_mv(typ) || typ === WAN_STRIKING_MV
            || typ === WAN_UNDEAD_TURNING_MV
            || typ === WAN_TELEPORTATION_MV || typ === WAN_CREATE_MONSTER_MV)
            return true;
        break;
    case POTION_CLASS_MV:
        /* C muse.c:2793-2801 */
        if (typ === POT_HEALING_MV || typ === POT_EXTRA_HEALING_MV
            || typ === POT_FULL_HEALING_MV || typ === POT_POLYMORPH_MV
            || typ === POT_GAIN_LEVEL_MV || typ === POT_PARALYSIS_MV
            || typ === POT_SLEEPING_MV || typ === POT_ACID_MV
            || typ === POT_CONFUSION_MV)
            return true;
        if (typ === POT_BLINDNESS_MV && !attacktype({ pmidx: mndx }, AT_GAZE_MV))
            return true;
        break;
    case SCROLL_CLASS_MV:
        /* C muse.c:2802-2806 */
        if (typ === SCR_TELEPORTATION_MV || typ === SCR_CREATE_MONSTER_MV
            || typ === SCR_EARTH_MV || typ === SCR_FIRE_MV)
            return true;
        break;
    case AMULET_CLASS_MV:
        /* C muse.c:2807-2813 */
        if (typ === AMULET_OF_LIFE_SAVING_MV)
            return !(_nonliving_mv(mndx) || is_vampshifter(mon));
        if (typ === AMULET_OF_REFLECTION_MV || typ === AMULET_OF_GUARDING_MV)
            return true;
        break;
    case TOOL_CLASS_MV:
        /* C muse.c:2814-2827 */
        if (typ === PICK_AXE_MV)
            return (mflags1 & M1_NEEDPICK_MDW) !== 0; /* needspick */
        if (typ === UNICORN_HORN_MV)
            return !(obj.cursed | 0) && !_is_unicorn_mv(mndx)
                   && mndx !== PM_KI_RIN_MV;
        if (typ === FROST_HORN_MV || typ === FIRE_HORN_MV)
            return (obj.spe | 0) > 0 && can_blow(mon);
        if (typ >= LARGE_BOX_MV && typ <= BAG_OF_TRICKS_MV /* Is_container */
            && !((typ === BAG_OF_HOLDING_MV || typ === BAG_OF_TRICKS_MV)
                 && (obj.cursed | 0)) /* Is_mbag && cursed */
            && !(obj.olocked | 0))
            return true;
        if (typ === EXPENSIVE_CAMERA_MV)
            return (obj.spe | 0) > 0;
        break;
    case FOOD_CLASS_MV:
        /* C muse.c:2828-2841 */
        if (typ === CORPSE_OTYP_MV) {
            /* C's second disjunct is
             *     (!resists_ston(mon) && cures_stoning(mon, obj, FALSE))
             * where cures_stoning() on a corpse is
             *     corpsenm != NON_PM && (corpsenm == PM_LIZARD || acidic(...)).
             * resists_ston(mon) is Resists_Elem(mon, STONE_RES) — the monster's
             * live mextrinsics ORed with its mresists row, neither of which this
             * module carries — so only the W_ARMG half is ported.  A
             * stoning-resistant monster next to a lizard/acidic corpse is the
             * one case this under-returns. */
            return ((mon.misc_worn_check | 0) & W_ARMG_MV) !== 0
                   && touch_petrifies_mv(obj.corpsenm | 0);
        }
        if (typ === TIN_MV) {
            /* C: mcould_eat_tin(mon) && !resists_ston(mon)
             *    && cures_stoning(mon, obj, TRUE).  mcould_eat_tin scans the
             * monster's minvent for a TIN_OPENER or a P_DAGGER/P_KNIFE weapon,
             * which needs objects[].oc_skill; not carried here. */
            return false;
        }
        if (typ === EGG_MV && (obj.corpsenm | 0) >= LOW_PM_MV
            && (obj.corpsenm | 0) < NUMMONS_MV /* ismnum */)
            return touch_petrifies_mv(obj.corpsenm | 0);
        break;
    default:
        break;
    }

    return false;
}
/* C ref: objects.h WAND() rows — objects[typ].oc_dir for the WAND_CLASS block.
 * js/mhitu.js's MKOBJ_OC_DIR is WEAPON_CLASS-only (its own header says so), so
 * it reads 0 for every wand and cannot answer this.  The RAY wands are the seven
 * objects.h WAND() rows whose `dir` argument is RAY (objects.h:1486-1500):
 * digging, magic missile, fire, cold, sleep, death, lightning.  WAN_DIGGING is
 * consumed by its own arm above before this is reached; it is listed anyway so
 * the predicate means what its name says. */
function _wand_oc_dir_is_ray_mv(typ) {
    return typ === WAN_DIGGING_MV || typ === WAN_MAGIC_MISSILE_MV
        || typ === WAN_FIRE_MV || typ === WAN_COLD_MV || typ === WAN_SLEEP_MV
        || typ === WAN_DEATH_MV || typ === WAN_LIGHTNING_MV;
}
/* C mondata.h:139 is_unicorn(ptr) = (ptr)->mlet == S_UNICORN && likes_gems(ptr).
 * Not a mons[] index test — see the GEMSTONE_MAT_MV note above. */
function _is_unicorn_mv(mndx) {
    const row = (mndx >= 0 && mndx < _MONS_MV.length) ? _MONS_MV[mndx] : null;
    if (!row) return false;
    return (row[0] | 0) === S_UNICORN_MV && ((row[7] >>> 0) & M2_JEWELS_MV) !== 0;
}
/* C mondata.h nonliving(ptr) = is_undead(ptr) || ptr == &mons[PM_MANES]
 *   || weirdnonliving(ptr), weirdnonliving = is_golem(ptr) || mlet == S_VORTEX.
 * Same reading as js/makemon.js nonliving(), computed off the packed row so no
 * permonst view has to be materialised. */
function _nonliving_mv(mndx) {
    const row = (mndx >= 0 && mndx < _MONS_MV.length) ? _MONS_MV[mndx] : null;
    if (!row) return false;
    const mlet = row[0] | 0;
    return ((row[7] >>> 0) & M2_UNDEAD_MV) !== 0 || mndx === PM_MANES_MV
           || mlet === S_GOLEM_MV || mlet === S_VORTEX_MV;
}

/* C include/mondata.h:243
 *   #define corpse_eater(ptr)                 \
 *       (ptr == &mons[PM_PURPLE_WORM]         \
 *        || ptr == &mons[PM_BABY_PURPLE_WORM] \
 *        || ptr == &mons[PM_GHOUL]            \
 *        || ptr == &mons[PM_PIRANHA])
 * Indices are js/pm.generated.js's active-list numbering (the same numbering
 * _MONS_MV and mtmp.data.pmidx use); each is cross-checked against its mlet in
 * js/makemon_mons.json — 23/S_WORM for the two purple worms, 52/S_ZOMBIE for
 * the ghoul, 57/S_EEL for the piranha. */
const PM_PURPLE_WORM_MWCI = 115, PM_BABY_PURPLE_WORM_MWCI = 113,
      PM_GHOUL_MWCI = 246, PM_PIRANHA_MWCI = 317;
function corpse_eater_mwci(ptr) {
    const p = (ptr?.pmidx) | 0;
    return p === PM_PURPLE_WORM_MWCI || p === PM_BABY_PURPLE_WORM_MWCI
        || p === PM_GHOUL_MWCI || p === PM_PIRANHA_MWCI;
}
/* C include/mondata.h:200
 *   #define touch_petrifies(ptr) \
 *       ((ptr) == &mons[PM_COCKATRICE] || (ptr) == &mons[PM_CHICKATRICE])
 * (Medusa deliberately does NOT pass this; that is flesh_petrifies.) */
const PM_COCKATRICE_MWCI = 10, PM_CHICKATRICE_MWCI = 9;
function touch_petrifies_mndx_mwci(mndx) {
    return mndx === PM_COCKATRICE_MWCI || mndx === PM_CHICKATRICE_MWCI;
}
/* C include/mextra.h:161 enum dogfood_types */
const ACCFOOD_MWCI = 2, MANFOOD_MWCI = 3;
function mon_would_consume_item(mtmp, otmp) {
    if ((otmp.otyp | 0) === CORPSE_OTYP_MV
        && !touch_petrifies_mndx_mwci(otmp.corpsenm | 0)
        && corpse_eater_mwci(mtmp.data))
        return true;

    if ((mtmp.mtame | 0) && has_edog(mtmp)) {
        const ftyp = dogfood(mtmp, otmp);
        if (ftyp < MANFOOD_MWCI
            && (ftyp < ACCFOOD_MWCI
                || (mtmp.mextra.edog.hungrytime | 0) <= (game.moves | 0)))
            return true;
    }

    return false;
}

/* C mondata.h:87 — #define is_armed(ptr) attacktype(ptr, AT_WEAP)
 * mondata.c:53-57 attacktype(ptr, atyp) = attacktype_fordmg(ptr, atyp, AD_ANY)
 * != NULL, i.e. does any of ptr->mattk[0..NATTK) have aatyp == AT_WEAP.
 * monattk.h:28 AT_WEAP = 254 (NOT 1 — the old comment here was wrong).
 * makemon.js's attacktype() indexes the mattk table by ptr.pmidx, so pass a
 * bare {pmidx} permonst view of the row index this file works in. */
const AT_WEAP_MV = 254;
function is_armed_mv(mndx) {
    return attacktype({ pmidx: mndx | 0 }, AT_WEAP_MV);
}

/* C objects[otyp].oc_material.  The generated objects.c column already in the
 * tree (js/mkobj_erosion_meta.js, the same table js/mklev.js obj_oc_material
 * and js/do_wear.js read); this was a constant-1 stub. */
function _oc_material_mv(otyp) {
    const i = otyp | 0;
    /* o_init.c:141-146 shuffle(..., domaterial) swaps oc_material with the
     * description for rings/wands, so objects[otyp].oc_material is per-game.
     * o_init.js publishes the post-shuffle values in game._objMaterials. */
    const sh = game._objMaterials;
    if (sh && sh[i] != null)
        return sh[i] | 0;
    return (i >= 0 && i < MKOBJ_OC_MATERIAL.length) ? (MKOBJ_OC_MATERIAL[i] | 0) : 0;
}

async function m_search_items(mtmp, ggx, ggy, mmoved, appr) {
    let minr = SQSRCHRADIUS_MV;
    const omx = mtmp.mx | 0, omy = mtmp.my | 0;
    const mux = mtmp.mux | 0, muy = mtmp.muy | 0;
    let curAppr = appr;
    let curGgx = ggx, curGgy = ggy;
    let curMmoved = mmoved;

    /* C: if (distmin(mux,muy,omx,omy) < SQSRCHRADIUS && !mpeaceful) minr-- */
    if (distmin_mv(mux, muy, omx, omy) < SQSRCHRADIUS_MV && !(mtmp.mpeaceful | 0))
        minr--;
    /* C monmove.c:1351 — hostile mercenaries only get distracted by items in
     * an adjacent square.  Their general M2_COLLECT behavior still applies;
     * this only narrows m_search_items' scan radius. */
    const mndx = (mtmp.mndx ?? mtmp.mnum ?? 0) | 0;
    const mrow = (mndx >= 0 && mndx < _MONS_MV.length) ? _MONS_MV[mndx] : null;
    if (!(mtmp.mpeaceful | 0) && mrow && ((mrow[7] >>> 0) & M2_MERC_MV))
        minr = 1;

    /* C: if (*in_rooms(omx, omy, SHOPBASE) && (rn2(25) || mtmp->isshk))
     *         goto finish_search;
     * `&&` short-circuits: rn2(25) is drawn only when the monster is actually
     * standing in a shop room, and only then is mtmp->isshk consulted. */
    const inShop = in_rooms(omx, omy, SHOPBASE).length > 0;
    const skipShopScan = inShop && (rn2(25) || (mtmp.isshk | 0));

    if (!skipShopScan) {
        const hmx = Math.min(COLNO_MV - 1, omx + minr);
        const hmy = Math.min(ROWNO_MV - 1, omy + minr);
        const lmx = Math.max(1, omx - minr);
        const lmy = Math.max(0, omy - minr);

        for (let xx = lmx; xx <= hmx; xx++) {
            for (let yy = lmy; yy <= hmy; yy++) {
                const firstObj = game.level?.levelObjects?.[xx]?.[yy];
                if (!firstObj) continue;
                /* found an object closer already */
                if (minr < distmin_mv(omx, omy, xx, yy)) continue;
                if (!could_reach_item(mtmp, xx, yy)) continue;
                /* C monmove.c:1363: hiders avoid hero's line of sight */
                if (hides_under_mv(mtmp.data || mrow) && cansee(xx, yy)) continue;
                const mtoo = m_at(xx, yy);
                if (mtoo
                    && (helpless_mv(mtoo) || (mtoo.mundetected | 0)
                        || ((mtoo.mappearance | 0) && !(mtoo.iswiz | 0))
                        || !((mtoo.data?.mmove) | 0)))
                    continue;
                /* C monmove.c:1378: don't get stuck circling an Elbereth */
                if (onscary(xx, yy, mtmp)) continue;
                /* trap-known guard */
                const ttmp = t_at(xx, yy);
                if (ttmp && mon_knows_traps(mtmp, ttmp.ttyp | 0)) {
                    if (curGgx === xx && curGgy === yy) { curGgx = mux; curGgy = muy; }
                    continue;
                }
                /* C m_cansee is a pure clear_path query. Rebuilding blockers
                 * here dirties vision and schedules an extra hero-square
                 * repaint, consuming display RNG during hallucination.
                 * Map mutations must update their blockers at the mutation. */
                if (!clear_path(omx, omy, xx, yy)) continue;
                const costly = costly_spot(xx, yy);

                for (let otmp = firstObj; otmp; otmp = otmp.nexthere) {
                    const otyp = otmp.otyp | 0;
                    if (otyp === ROCK_OTYP_MV) continue;
                    if (is_mines_prize(otmp) || is_soko_prize(otmp)) continue;
                    if (costly && !(otmp.no_charge | 0)) continue;
                    if (((mon_would_take_item(mtmp, otmp) && can_carry(mtmp, otmp) > 0)
                         || mon_would_consume_item(mtmp, otmp))
                        && await can_touch_safely(mtmp, otmp)) {
                        minr = distmin_mv(omx, omy, xx, yy);
                        curGgx = (otmp.ox | 0);
                        curGgy = (otmp.oy | 0);
                        if (curGgx === omx && curGgy === omy) {
                            curMmoved = MMOVE_DONE_MV;
                            return { redirected: true, ggx: curGgx, ggy: curGgy,
                                     appr: curAppr, mmoved: curMmoved, done: true };
                        }
                        break; /* skip rest of pile */
                    }
                }
            }
        }
    }

    /* C finish_search: if (minr < SQSRCHRADIUS && appr == -1) {...} */
    if (minr < SQSRCHRADIUS_MV && curAppr === -1) {
        if (distmin_mv(omx, omy, mux, muy) <= 3) { curGgx = mux; curGgy = muy; }
        else curAppr = 1;
    }
    return { redirected: (minr < SQSRCHRADIUS_MV), ggx: curGgx, ggy: curGgy,
             appr: curAppr, mmoved: curMmoved, done: false };
}

/* C ref: hacklib.c distmin — Chebyshev (king-move) distance. */
function distmin_mv(x0, y0, x1, y1) {
    const dx = Math.abs((x0 | 0) - (x1 | 0));
    const dy = Math.abs((y0 | 0) - (y1 | 0));
    return dx > dy ? dx : dy;
}

function lined_up_mv(mtmp) {
    const u = game.u;
    if (!u) return false;
    if (Upolyd(u) && rn2(25)) {
        const _uap = ((game.youmonst?.m_ap_type | 0) & M_AP_TYPMASK);
        if (u.uundetected
            || (_uap !== M_AP_NOTHING && _uap !== M_AP_MONSTER))
            return false;
    }
    const ignore_boulders = ((mtmp.data?.mflags2 | 0) & M2_ROCKTHROW_MV) !== 0
                            || !!m_carrying(mtmp, WAN_STRIKING_MV);
    /* [no callers care about the 1 vs 2 situation any more] */
    return !!linedup(mtmp.mux | 0, mtmp.muy | 0, mtmp.mx | 0, mtmp.my | 0,
                     ignore_boulders ? 1 : 2);
}
/* C objects.h WAN_STRIKING — js/makemon.js:1685 uses the same literal. */
const WAN_STRIKING_MV = 417;

/* C ref: monmove.c:1391-1420 m_move_aggress(mtmp, x, y) — "attack this spot in
 * preference to all others".  Reached from m_move's post-selection dispatch for
 * the ALLOW_M case (the chosen square holds a monster this one may attack) and
 * for the displaced-image case (the chosen square is <mux,muy>).
 *
 * This was a one-line stand-in (`return MMOVE_DONE`) that never attacked, so a
 * confused or image-fooled monster walked past its target instead of swinging
 * at it.  gb.bhitpos / gn.notonhead are set BEFORE mattackm because mattackm's
 * i>0 target-still-there guard (mhitm.c:381) reads them back — the same
 * ordering js/dogmove.js:3801 already documents for dog_move's copy.
 *
 * RNG: none when the square is empty (mstatus stays M_ATTK_MISS, so the
 * return-attack block's rn2(4) is not reached).  Otherwise exactly what
 * mattackm draws, plus the rn2(4) / rn2(NORMAL_SPEED) pair. */
export async function m_move_aggress(mtmp, x, y) {
    let mstatus = M_ATTK_MISS_MV;
    const mtmp2 = m_at(x, y);
    if (mtmp2) {
        (game.gb ||= {}).bhitpos = { x: x | 0, y: y | 0 };
        (game.gn ||= {}).notonhead =
            ((x | 0) !== (mtmp2.mx | 0) || (y | 0) !== (mtmp2.my | 0));
        mstatus = await mattackm(mtmp, mtmp2);
    }

    /* C:1403 — `if ((mstatus & M_ATTK_AGR_DIED) || DEADMONSTER(mtmp))` */
    /* C mon.h DEADMONSTER(mon) := ((mon)->mhp < 1) — js/dogmove.js:3077's
     * reading, kept identical. */
    if ((mstatus & M_ATTK_AGR_DIED_MV) || !mtmp || (mtmp.mhp | 0) < 1)
        return MMOVE_DIED_MV;

    if ((mstatus & (M_ATTK_HIT_MV | M_ATTK_DEF_DIED_MV)) === M_ATTK_HIT_MV
        && rn2(4) && (mtmp2.movement | 0) > rn2(NORMAL_SPEED_MV)) {
        if ((mtmp2.movement | 0) > NORMAL_SPEED_MV)
            mtmp2.movement = (mtmp2.movement | 0) - NORMAL_SPEED_MV;
        else
            mtmp2.movement = 0;
        game.gb.bhitpos = { x: mtmp.mx | 0, y: mtmp.my | 0 };
        game.gn.notonhead = false;
        /* note: at this point, defender is the original (moving) aggressor */
        mstatus = await mattackm(mtmp2, mtmp);
        if (mstatus & M_ATTK_DEF_DIED_MV)
            return MMOVE_DIED_MV;
    }
    return MMOVE_DONE_MV;
}


/* C trap.c:1402-1470 via monmove.c:1535 — apply SQKY_BOARD to a moved
 * monster.  Both tame and hostile postmov paths call this shared leaf; C's
 * postmov invokes mintrap uniformly for pets and non-pets. */
function _handle_sqky_board_mon(mtmp, trap, nix, niy) {
    const _mf1_sq = (mtmp.data.mflags1 | 0);
    const _in_air_sq = (_mf1_sq & M1_FLY_MV) !== 0;
    let _sqky_handled = false;
    if (floor_trigger_mv(SQKY_BOARD_MV) && _in_air_sq) {
        _sqky_handled = true; /* steps over: no learn, no squeak */
    } else if (mon_knows_traps(mtmp, SQKY_BOARD_MV) && rn2(4)) {
        _sqky_handled = true; /* already seen: ignores without re-squeaking */
    }
    if (!_sqky_handled) {
        mon_learns_traps(mtmp, SQKY_BOARD_MV);
        /* C trap.c:3796-3797 calls mons_see_trap() after the mover learns
         * the trap.  Nearby sighted, non-animal monsters learn it too.  That
         * state controls mfndpos's known-trap rejection and hence the mtrack
         * rn2 bound on their following move. */
        const tx = trap.tx | 0, ty = trap.ty | 0;
        const loc = game.level?.at?.(tx, ty);
        const maxdist = loc?.lit ? 49 : 2;
        for (let watcher = game.fmon; watcher; watcher = watcher.nmon) {
            const wf1 = (watcher.data?.mflags1 | 0);
            if ((wf1 & (M1_ANIMAL_MV | M1_MINDLESS_MV | M1_NOEYES_MV))
                || !(watcher.mcansee | 0)
                || dist2(watcher.mx | 0, watcher.my | 0, tx, ty) > maxdist
                || !clear_path(watcher.mx | 0, watcher.my | 0, tx, ty))
                continue;
            mon_learns_traps(watcher, SQKY_BOARD_MV);
        }
    }
    const _u = game.u;
    /* m_in_air check: grid bugs and most common monsters are on the ground. */
    /* C canseemon(mtmp): visibility plus monster spotting, with steed exception. */
    const _dist2 = _u ? dist2(nix, niy, (_u.ux | 0), (_u.uy | 0)) : 99999;
    const _in_sight = canseemon(mtmp) || (mtmp === (_u ? _u.usteed : null));
    if (!_sqky_handled) {
        /* C trap.c:3064-3080 trapnote(trap, FALSE) — note name with
         * just_an() article prefix.  just_an takes its SINGLE-LETTER
         * branch (objnam.c:2113-2115): article = "an" iff the lowercased
         * first char is in "aefhilmnosx", else "a" (letter-name test,
         * e.g. "F" = "eff" → "an F note"). */
        const _tnote = (trap.tnote | 0);
        const _notename = SQKY_NOTES_MV[_tnote] || 'C note';
        const _c0 = (_notename[0] || '').toLowerCase();
        const _article = 'aefhilmnosx'.includes(_c0) ? 'an' : 'a';
        const trapnote = `${_article} ${_notename}`;
        /* C ref: youprop.h:125 Deaf = HDeaf || EDeaf || uroleplay.deaf. */
        const _uu = game.u || {};
        const _deaf = ((_uu.HDeaf | 0) !== 0) || ((_uu.EDeaf | 0) !== 0)
            || !!(_uu.uroleplay && _uu.uroleplay.deaf);
        let _msg = null;
        let _mark_seen = false;
        if (_in_sight) {
            /* C trap.c:1443-1454 — in-sight monster stepped on a squeaky
             * board.  When not Deaf, emit the squeak and mark the trap
             * seen (seetrap); the Deaf branch cringes for non-mindless
             * monsters.  Soundeffect is screen/audio only, no RNG. */
            if (!_deaf) {
                _msg = `A board beneath ${mon_nam(mtmp)} squeaks ${trapnote} loudly.`;
                _mark_seen = true; /* C seetrap follows pline_mon */
            } else if ((mtmp.data.mflags1 & M1_MINDLESS_MV) === 0) {
                const _nm = mon_nam(mtmp);
                _msg = `${_nm.charAt(0).toUpperCase()}${_nm.slice(1)} stops momentarily and appears to cringe.`;
            }
        } else {
            /* C trap.c:1458-1469: out-of-sight monster — You_hear("...squeak...").
             * range = couldsee(mx,my) ? BOLT_LIM+1 : BOLT_LIM-3
             * couldsee is the live vision predicate used by C's range selection */
            const _couldsee = !!couldsee(nix, niy);
            const _range = _couldsee ? (BOLT_LIM + 1) : (BOLT_LIM - 3);
            const _nearfar = (_dist2 <= _range * _range) ? 'nearby' : 'in the distance';
            /* You_hear (pline.c) inline, keeping this arm's own join bookkeeping:
             * silent when Deaf and aware or !acoustics; 'You barely hear' under
             * water; 'You dream that you hear' while Unaware (asleep/fainted). */
            const _ua = Unaware();
            if (!((_deaf && !_ua) || !(game.flags?.acoustics ?? true)))
                _msg = (game.u?.uinwater ? 'You barely hear '
                        : _ua ? 'You dream that you hear ' : 'You hear ')
                    + `${trapnote} squeak ${_nearfar}.`;
        }
        if (_msg) {
            /* C pline.c:282 — gp.prevmsg = line on every shown message; Norep()
             * (pline.c:255) reads it, so a later identical Norep must print. */
            game._prevmsg = String(_msg);
            const _prev = game._pending_message;
            if (_prev && _prev.length > 0) {
                const _joined = _prev + '  ' + _msg;
                _topl_record_join(_prev, _joined);
                game._pending_message = _joined;
            } else {
                const _rr = game._resultMessage;
                if (_rr && _rr !== _msg) _pline_flush_frame_record(_rr.length, String(_msg));
                game._pending_message = _msg;
            }
        }
        if (_mark_seen)
            seetrap(trap); /* C marks the trap after pline_mon */
        wake_nearto(mtmp.mx | 0, mtmp.my | 0, 40);
    }
}

/* C monmove.c:1172 leppie_avoidance: a leprechaun with more visible
 * gold than the hero retreats rather than approaching to steal. */
export function leppie_avoidance(mon) {
    if ((mon?.data?.pmidx ?? mon?.mndx ?? mon?.mnum) !== PM_LEPRECHAUN)
        return false;
    const gold = findgold(mon.minvent);
    return !!gold && gold.quan > (findgold(game.invent)?.quan ?? 0);
}

export async function m_move(mtmp, after) {
    if (!mtmp) return MMOVE_NOTHING_MV;

    /* C monmove.c:1755 `coordxy omx = mtmp->mx, omy = mtmp->my;` — a declaration
     * initializer, so it is read at function ENTRY, before the mtrapped mintrap
     * below can relocate the monster.  Only the pet branch needs it this early;
     * the mainline path re-reads its own omx/omy further down. */
    const _entry_omx = mtmp.mx | 0, _entry_omy = mtmp.my | 0;

    if (mtmp.mtrapped) {
        const i = await mintrap(mtmp, NO_TRAP_FLAGS_MV);
        if (i === TRAP_KILLED_MON_MV) {
            newsym(mtmp.mx | 0, mtmp.my | 0);
            return MMOVE_DIED_MV;
        }
        if (i === TRAP_CAUGHT_MON_MV)
            return MMOVE_NOTHING_MV; /* still in trap, so didn't move */
    }

    /* C monmove.c:1769-1773: meating countdown */
    if ((mtmp.meating | 0) > 0) {
        mtmp.meating--;
        if (mtmp.meating <= 0) {
            /* C monmove.c:1748 finish_meating(mtmp): a pet that mimicked the mimic
             * corpse it ate sheds the appearance and repaints (dogmove.c:1448-1458) */
            finish_meating_real(mtmp);
        }
        return MMOVE_DONE_MV; /* still eating */
    }

    /* C monmove.c:1751-1754:
     *   if (hides_under(ptr) && OBJ_AT(mtmp->mx, mtmp->my)
     *       && can_hide_under_obj(svl.level.objects[mtmp->mx][mtmp->my])
     *       && rn2(10))
     *       return MMOVE_NOTHING;
     * mondata.h:35 hides_under(ptr) = (ptr->mflags1 & M1_CONCEAL) != 0
     * rm.h:500     OBJ_AT(x, y)     = svl.level.objects[x][y] != 0
     * The && chain short-circuits, so rn2(10) fires ONLY for a concealing
     * monster standing on a hideable pile — that ordering is the RNG
     * contract, not an optimisation. */
    /* C monmove.c:1749 `ptr = mtmp->data;` — re-read AFTER mintrap, which can
     * change mtmp->data ("mintrap() can change mtmp->data -dlc"). */
    const ptr = mtmp.data;
    if (hides_under_mv(ptr)) {
        const _topObj = game.level?.levelObjects?.[mtmp.mx | 0]?.[mtmp.my | 0];
        if (_topObj && can_hide_under_obj(_topObj) && rn2(10))
            return MMOVE_NOTHING_MV; /* do not leave hiding place */
    }

    /* C monmove.c:1778 — postmov needs the visibility state from before the
     * move.  In particular, a vampshifter which passes under a closed door is
     * temporarily put back on its old square while changing into fog, so its
     * message is painted at the location where the hero last saw it. */
    const seenflgs = (canseemon(mtmp) ? 1 : 0) | (canspotmon(mtmp) ? 2 : 0);

    /* C monmove.c:1785: set_apparxy(mtmp) */
    set_apparxy(mtmp);

    /* C monmove.c:1793-1798: wormno goto not_special (worms skip tame/covetous check) */
    /* C monmove.c:1796-1799: if (mtmp->mtame) → dog_move */
    if (mtmp.mtame | 0) {
        /* C: return postmov(mtmp, ptr, omx, omy, dog_move(mtmp, after), ...) */
        const res = await dog_move(mtmp, after);
        if (res === MMOVE_MOVED_MV)
            newsym(_entry_omx, _entry_omy);
        if (res === MMOVE_MOVED_MV) {
            const _trap = t_at(mtmp.mx | 0, mtmp.my | 0);
            if (_trap && _trap.ttyp !== SQKY_BOARD_MV) {
                /* C postmov (monmove.c:1535-1540): trapret = mintrap(mtmp,0); if
                 * the trap killed or moved the monster, newsym + return MMOVE_DIED
                 * so dochug stops (no post-move distfleeck recalc for a dead pet). */
                const _pmx = mtmp.mx | 0, _pmy = mtmp.my | 0;
                const _pttyp = _trap.ttyp;
                const trapret = await mintrap(mtmp, 0);
                if (trapret === TRAP_KILLED_MON_MV || trapret === TRAP_MOVED_MON_MV) {
                    if (mtmp.mx) newsym(mtmp.mx | 0, mtmp.my | 0);
                    else if (trapret === TRAP_KILLED_MON_MV && _pmx > 0
                             && (_pttyp === 1 || _pttyp === 2 || _pttyp === 3)) /* ARROW/DART/ROCKTRAP */
                        newsym(_pmx, _pmy);
                    return MMOVE_DIED_MV;
                }
            } else if (_trap && _trap.ttyp === SQKY_BOARD_MV) {
                _handle_sqky_board_mon(mtmp, _trap, mtmp.mx | 0, mtmp.my | 0);
            }
        }
        /* C postmov (monmove.c:1656) `newsym(mtmp->mx, mtmp->my);` — the SECOND
         * half of the pair, at the very end of the `mmoved == MMOVE_MOVED` block,
         * i.e. after mintrap and after the door block.  This is what finally puts
         * the pet's glyph on its destination cell. */
        if (res === MMOVE_MOVED_MV)
            newsym(mtmp.mx | 0, mtmp.my | 0);
        /* C monmove.c:1773 — the pet path IS a `return postmov(...)`, so it runs
         * postmov's trailing hides_under/S_EEL block too (a tame hider that just
         * moved re-hides and draws its rn2(5) exactly like a hostile one). */
        return postmov(mtmp, res);
    }

    /* C monmove.c:1802-1827: is_covetous branch — no RNG in stub (is_covetous=false for common monsters) */

    /* C monmove.c:1830-1851: shopkeeper/guard/priest — dispatch to their own
     * move fn (shk_move / gd_move / pri_move) and translate the return code.
     *   int xm = isshk ? shk_move : isgd ? gd_move : pri_move;
     *   switch (xm) { case -2: MMOVE_DIED; case -1: MMOVE_NOTHING; default/0/1:
     *     postmov(... (xm!=1) ? MMOVE_NOTHING : MMOVE_MOVED ...) }
     * shk_move is now ported (shk.js → move_special in priest.js); gd_move and
     * pri_move remain unported and keep the no-RNG MMOVE_NOTHING stub so they do
     * NOT fall through to the normal-movement rn2 path. */
    if ((mtmp.isshk | 0)) {
        const xm = await shk_move(mtmp);
        if (xm === -2) return MMOVE_DIED_MV;
        if (xm === -1) {
            return MMOVE_NOTHING_MV;
        }
        /* C default (impossible) and cases 0,1 → postmov with MMOVE_NOTHING/MOVED.
         * The move itself (remove/place/newsym) already happened inside
         * move_special; postmov's shk-on-trap mintrap is not yet needed. */
        /* C monmove.c:1823 — `return postmov(..., (xm != 1) ? MMOVE_NOTHING
         * : MMOVE_MOVED, ...)`; the tail runs for the MMOVE_MOVED case. */
        /* C postmov (monmove.c:1508, :1656) — the MMOVED redraw pair around
         * mintrap: newsym(omx,omy) then newsym(mtmp->mx,mtmp->my).  move_special
         * (priest.c:122-124) itself only does newsym(nix,niy). */
        if (xm === 1) {
            newsym(_entry_omx, _entry_omy);
            newsym(mtmp.mx | 0, mtmp.my | 0);
        }
        return postmov(mtmp, (xm !== 1) ? MMOVE_NOTHING_MV : MMOVE_MOVED_MV);
    }
    if ((mtmp.ispriest | 0)) {
        const xm = await pri_move(mtmp);
        if (xm === -2) return MMOVE_DIED_MV;
        if (xm === -1) return MMOVE_NOTHING_MV;
        /* C monmove.c:1823 — postmov(..., (xm != 1) ? MMOVE_NOTHING
         * : MMOVE_MOVED, ...) */
        /* C postmov (monmove.c:1508, :1656) — the MMOVED redraw pair around
         * mintrap: newsym(omx,omy) then newsym(mtmp->mx,mtmp->my).  move_special
         * (priest.c:122-124) itself only does newsym(nix,niy). */
        if (xm === 1) {
            newsym(_entry_omx, _entry_omy);
            newsym(mtmp.mx | 0, mtmp.my | 0);
        }
        return postmov(mtmp, (xm !== 1) ? MMOVE_NOTHING_MV : MMOVE_MOVED_MV);
    }
    if ((mtmp.isgd | 0)) {
        const _gdomx = mtmp.mx | 0, _gdomy = mtmp.my | 0;
        const xm = await gd_move(mtmp);
        if (xm === -2) return MMOVE_DIED_MV;
        if (xm === -1) return MMOVE_NOTHING_MV;
        if (xm === 1)
            newsym(_gdomx, _gdomy);
        if (xm === 1)
            newsym(mtmp.mx | 0, mtmp.my | 0);
        return postmov(mtmp, (xm !== 1) ? MMOVE_NOTHING_MV : MMOVE_MOVED_MV);
    }

    /* C monmove.c:1864-1872: tengu teleport: if (PM_TENGU && !rn2(5) && !mcan && !tele_restrict)
     * teleport/mnexto and return MMOVE_MOVED. */
    const mndx_mv = (mtmp.mndx ?? mtmp.mnum ?? 0) | 0;
    if (mndx_mv === PM_TENGU_MV && !rn2(5) && !(mtmp.mcan | 0)
        && !tele_restrict(mtmp)) {
        if ((mtmp.mhp | 0) < 7 || (mtmp.mpeaceful | 0) || rn2(2)) {
            await rloc(mtmp, RLOC_MSG);
        } else {
            await mnexto(mtmp, RLOC_MSG);
        }
        newsym(_entry_omx, _entry_omy);
        newsym(mtmp.mx | 0, mtmp.my | 0);
        /* C monmove.c:1847 — `return postmov(..., MMOVE_MOVED, ...)`. */
        return postmov(mtmp, MMOVE_MOVED_MV);
    }

 /* not_special: normal monster movement (C monmove.c:1874-2099) */

    if ((game.u?.uswallow | 0) && !(mtmp.mflee | 0) && game.u.ustuck !== mtmp)
        return MMOVE_MOVED_MV;

    const omx = (mtmp.mx | 0);
    const omy = (mtmp.my | 0);
    const ggx_init = (mtmp.mux !== undefined ? mtmp.mux : (game.u?.ux ?? 0)) | 0;
    const ggy_init = (mtmp.muy !== undefined ? mtmp.muy : (game.u?.uy ?? 0)) | 0;
    let ggx = ggx_init, ggy = ggy_init;

    /* C monmove.c:1881-1912: appr selection */
    /* C monmove.c:1745 — `int preferredrange_min = 0, preferredrange_max = 0;`,
     * filled in by m_balks_at_approaching() and read by the appr == -2 arm of
     * the candidate-selection test below. */
    const prefrange_mv = { min: 0, max: 0 };
    let appr = (mtmp.mflee | 0) ? -1 : 1;
    /* C monmove.c:1882 `if (mtmp->mconf || engulfing_u(mtmp))` — monst.h:250
     * engulfing_u(mon) is `(u.uswallow && u.ustuck == (mon))`, i.e. the
     * SWALLOWER itself wanders at random rather than approaching a hero it is
     * already holding.  Was another `stub: false` from before u.uswallow could
     * be set. */
    if ((mtmp.mconf | 0)
        || ((game.u?.uswallow | 0) && game.u.ustuck === mtmp)) {
        appr = 0;
    } else {
        /* C monmove.c:1861-1863:
         *   should_see = (couldsee(omx, omy)
         *                 && (levl[ggx][ggy].lit || !levl[omx][omy].lit)
         *                 && (dist2(omx, omy, ggx, ggy) <= 36));
         * All three conjuncts are real here.  couldsee() is the hero's own
         * COULD_SEE viz_array bit at the MONSTER's square (js/vision.js), not a
         * monster-sight test — a monster standing in a room the hero cannot see
         * into is !should_see even when it is well within 36, which is exactly
         * the case that hands the goal over to the gettrack() footprint-trail
         * arm below. */
        const dist2_gg = dist2(omx, omy, ggx, ggy);
        const _gg_loc = game.level?.at(ggx, ggy);
        const _om_loc = game.level?.at(omx, omy);
        const should_see = (couldsee(omx, omy)
                            && (!!(_gg_loc && _gg_loc.lit) || !(_om_loc && _om_loc.lit))
                            && dist2_gg <= 36);

        const u = game.u;
        const Invis = _Invis_mv();
        const _mf1_perc = (mtmp.data && mtmp.data.mflags1 != null)
            ? (mtmp.data.mflags1 >>> 0)
            : ((mndx_mv >= 0 && mndx_mv < _MONS_MV.length)
                ? (_MONS_MV[mndx_mv][6] >>> 0) : 0);
        const perceives_data = !!(_mf1_perc & M1_SEE_INVIS);
        const _mf2_greedy = (mtmp.data && mtmp.data.mflags2 != null)
            ? (mtmp.data.mflags2 >>> 0)
            : ((mndx_mv >= 0 && mndx_mv < _MONS_MV.length)
                ? (_MONS_MV[mndx_mv][7] >>> 0) : 0);
        /* C mondata.h ptr->mlet — same two-source lookup as _mf1_perc above:
         * the reconstructed permonst when present, else column 0 of the packed
         * MONS row. */
        const mlet_mv = (mtmp.data && mtmp.data.mlet != null)
            ? (mtmp.data.mlet | 0)
            : ((mndx_mv >= 0 && mndx_mv < _MONS_MV.length)
                ? (_MONS_MV[mndx_mv][0] | 0) : -1);

        if (!(mtmp.mcansee | 0)
            /* C: || (should_see && Invis && !perceives && rn2(11)) */
            || (should_see && Invis && !perceives_data && rn2(11))
            /* C monmove.c:1867-1869: || is_obj_mappear(&youmonst, STRANGE_OBJECT)
             *   || u.uundetected
             *   || (is_obj_mappear(&youmonst, GOLD_PIECE) && !likes_gold(ptr)) */
            || ((game.youmonst?.m_ap_type | 0) === 2 && (game.youmonst.mappearance | 0) === 0)
            || !!u?.uundetected
            || ((game.youmonst?.m_ap_type | 0) === 2
                && (game.youmonst.mappearance | 0) === GOLD_PIECE_MV
                && !(_mf2_greedy & M2_GREEDY_MV))
            || (mtmp.mpeaceful | 0) /* || ... && !mtmp->isshk */
            || ((mndx_mv === PM_STALKER_MV
                 || mlet_mv === S_BAT_MV || mlet_mv === S_LIGHT_MV) && !rn2(3))
           ) {
            appr = 0;
        }

        if (appr === 1 && leppie_avoidance(mtmp))
            appr = -1;

        /* C monmove.c:1878: hostiles with a ranged weapon or attack try to stay
         * away.  Was "m_balks_at_approaching — stub: no change". */
        appr = m_balks_at_approaching(appr, mtmp, prefrange_mv);

        if (!should_see && can_track({ pmidx: mndx_mv })) {
            const _cp = gettrack(omx, omy);
            if (_cp) {
                ggx = _cp.x | 0;
                ggy = _cp.y | 0;
            }
        }
    }

    /* C monmove.c:1915-1928: if (!mpeaceful || !rn2(10)) && !rogue_level → getitems check */
    /* rogue_level stub: false */
    let getitems = false;
    let mmoved_pre = MMOVE_NOTHING_MV; /* C: mmoved local, passed into m_search_items */
    if (!(mtmp.mpeaceful | 0) || !rn2(10)) {
        /* C: in_line = lined_up(mtmp) && distmin(mx,my,mux,muy) <= (throws_rocks?20:ACURRSTR/2+1) */
        const _dmin = distmin_mv(mtmp.mx | 0, mtmp.my | 0, mtmp.mux | 0, mtmp.muy | 0);
        /* ACURRSTR/2+1: typical early ACURRSTR ~11 → 6; throws_rocks rare here. */
        const _mndx_il = (mtmp.mndx ?? mtmp.mnum ?? 0) | 0;
        const _mrow_il = (_mndx_il >= 0 && _mndx_il < _MONS_MV.length) ? _MONS_MV[_mndx_il] : null;
        const _throws = _mrow_il ? !!((_mrow_il[7] >>> 0) & M2_ROCKTHROW_MV2) : false;
        const _acurrstr = acurr(game.u, A_STR) | 0;
        const _range = _throws ? 20 : (Math.trunc(_acurrstr / 2) + 1);
        const in_line = lined_up_mv(mtmp) && (_dmin <= _range);
        if (appr !== 1 || !in_line)
            getitems = true;
    }

    /* C monmove.c:1930-1932: if (getitems && m_search_items(...)) return postmov(...).
     * m_search_items redirects the goal (ggx,ggy) toward a nearby item the monster
     * wants, and returns done=true (mmoved=MMOVE_DONE) when the item is underfoot. */
    if (getitems) {
        const _si = await m_search_items(mtmp, ggx, ggy, mmoved_pre, appr);
        ggx = _si.ggx;
        ggy = _si.ggy;
        appr = _si.appr;
        mmoved_pre = _si.mmoved;
        if (_si.done)
            /* C monmove.c:1907 — `return postmov(..., mmoved, ...)` with mmoved
             * already set to MMOVE_DONE by m_search_items. */
            return postmov(mtmp, MMOVE_DONE_MV);
    }

    /* C monmove.c:1942: flag = mon_allowflags(mtmp)
     * For hostile non-special non-tame: allowflags = ALLOW_U, plus ALLOW_ROCK
     * for movers that can enter a boulder square (passes_walls / throws_rocks /
     * m_can_break_boulder) — mon.c:2080-2083.  Without ALLOW_ROCK a boulder
     * square is dropped from mfndpos, which is the cnt-correct C behaviour. */
    /* C monmove.c:1764 + 1911-1914 — m_move's own can_tunnel, which postmov
     * receives as an argument (monmove.c:1461) and uses for the dig arm at
     * monmove.c:1644.  It MUST be evaluated here, before the move: the
     * needspick downgrade tests dist2 from mtmp's CURRENT (pre-move) square to
     * its remembered hero position.  Same expression mon_allowflags() computes
     * internally for ALLOW_DIG (js/monmove.js:423-429). */
    const _mrow_ct = (() => {
        const i = (mtmp.mndx ?? mtmp.mnum ?? 0) | 0;
        return (i >= 0 && i < _MONS_MV.length) ? _MONS_MV[i] : null;
    })();
    const _mf1_ct = _mrow_ct ? (_mrow_ct[6] >>> 0) : 0;
    let can_tunnel_mv = !Is_rogue_level(game.u?.uz) && !!(_mf1_ct & M1_TUNNEL_MDW);
    /* C monmove.c:1911-1914 — don't tunnel if hostile and close enough to
     * prefer a weapon. */
    if (can_tunnel_mv && (_mf1_ct & M1_NEEDPICK_MDW)
        && ((!(mtmp.mpeaceful | 0) || _conflict_mv())
            && dist2(mtmp.mx | 0, mtmp.my | 0, mtmp.mux | 0, mtmp.muy | 0) <= 8))
        can_tunnel_mv = false;

    const allowflags_mv = mon_allowflags(mtmp);

    /* C monmove.c:1949: cnt = mfndpos(mtmp, &mfp, flag)
     * WIRING: real mfndpos (js/mklev.js) replaces mfndpos_nontame. mfndpos
     * writes parallel data.poss[]/data.info[] arrays; zip into the same
     * {x,y,info} shape mfndpos_nontame returned so the rest of this
     * function (unchanged below) keeps working. */
    const mfp = { cnt: 0, poss: [], info: [] };
    const real_cnt = mfndpos(mtmp, mfp, allowflags_mv);
    const mfp_poss = [];
    for (let i = 0; i < real_cnt; i++)
        mfp_poss.push({ x: mfp.poss[i].x, y: mfp.poss[i].y, info: mfp.info[i] | 0 });
    const cnt = mfp_poss.length;
    if (ENV.FF_MFNDTRACE === '1') {
        const tr = (mtmp.mtrack || []).map(t => `${t?.x | 0}:${t?.y | 0}`).join(';');
        const ps = mfp_poss.map(p => {
            const tt = t_at(p.x | 0, p.y | 0);
            const loc = game.level?.at?.(p.x | 0, p.y | 0);
            return `${p.x | 0}:${p.y | 0}:${p.info | 0}:${m_at(p.x | 0, p.y | 0)?.m_id ?? 0}:${tt?.ttyp ?? 0}:${loc?.typ ?? -1}:${sobj_at(475, p.x | 0, p.y | 0) ? 1 : 0}:${sobj_at(284, p.x | 0, p.y | 0) ? 1 : 0}`;
        }).join(';');
        const fm = [];
        for (let mm = game.fmon, n = 0; mm && n++ < 128; mm = mm.nmon)
            fm.push(`${mm.m_id ?? 0}:${mm.mx | 0},${mm.my | 0}`);
        const fmSelf = (() => { for (let mm = game.fmon; mm; mm = mm.nmon) if ((mm.m_id | 0) === (mtmp.m_id | 0)) return mm === mtmp ? 1 : 0; return -1; })();
        pushRngLogEntry(`^mdecision[id=${mtmp.m_id | 0} mnum=${mtmp.mndx ?? mtmp.data?.pmidx ?? -1}`
            + ` moves=${game.moves | 0} xy=${mtmp.mx | 0},${mtmp.my | 0}`
            + ` mux=${mtmp.mux | 0},${mtmp.muy | 0} appr=${appr | 0} cnt=${cnt | 0}`
            + ` flee=${mtmp.mflee | 0} conf=${mtmp.mconf | 0} tame=${mtmp.mtame | 0}`
            + ` peaceful=${mtmp.mpeaceful | 0} kicked=${game.kickedloc?.x | 0},${game.kickedloc?.y | 0}`
            + ` trapseen=${mtmp.mtrapseen | 0}`
            + ` goal=${ggx | 0},${ggy | 0}`
            + ` track=${tr} poss=${ps} fmonSelf=${fmSelf} fmon=${fm.join(';')}]`);
    }

    if (cnt === 0 && !_is_unicorn_mv(mtmp.data.pmidx | 0)) {
        if (find_defensive(mtmp, true) && (await use_defensive(mtmp)))
            return MMOVE_DONE_MV;
        return MMOVE_NOMOVES_MV;
    }
    /* C monmove.c:1955-2007: position selection loop */
    let chcnt = 0;
    let chi = -1;
    let mmoved = MMOVE_NOTHING_MV;
    let nix = omx, niy = omy;
    let nidist = dist2(nix, niy, ggx, ggy);
    const jcnt = Math.min(MTSZ_MV, cnt - 1);
    if (!(mtmp.mpeaceful | 0)
        && !!(game.level && game.level.flags && game.level.flags.shortsighted)
        && nidist > (couldsee(nix, niy) ? 144 : 36)
        && appr === 1)
        appr = 0;
    /* C monmove.c:1969-1970: better_with_displacing = should_displace(mtmp,
     * &mfp, ggx, ggy). Now real (was "should_displace stub: false").
     * mfndpos now admits C's displacer cells; the ordinary displacement
     * preference remains false unless should_displace itself finds a target. */
    const better_with_displacing = should_displace(mtmp, mfp, ggx | 0, ggy | 0);

    for (let i = 0; i < cnt; i++) {
        const nx = mfp_poss[i].x | 0;
        const ny = mfp_poss[i].y | 0;
        const info_i = mfp_poss[i].info | 0;

        /* C monmove.c:1980-1982: if (MON_AT(nx,ny) && (info[i]&ALLOW_MDISP)
         * && !(info[i]&ALLOW_M) && !better_with_displacing) continue;
         * Now real (was "MON_AT stub: no JS monster tracking; skip this
         * check"). Provably a no-op today (ALLOW_MDISP is never set — see
         * better_with_displacing note above) but wired faithfully so it
         * activates automatically once mm_displacement lands, with no
         * further edit needed at this site. */
        if (m_at(nx, ny) && (info_i & ALLOW_MDISP_MV)
            && !(info_i & ALLOW_M_MV) && !better_with_displacing)
            continue;

        if (appr !== 0) {
            /* C monmove.c:1984-1988: mtrack history avoidance
             * for j in 0..jcnt: if (nx==mtrack[j].x && ny==mtrack[j].y) rn2(4*(cnt-j)) → skip */
            const mtrack = mtmp.mtrack;
            if (Array.isArray(mtrack)) {
                let skipped = false;
                for (let j = 0; j < jcnt; j++) {
                    const trk = mtrack[j];
                    if (trk && (trk.x | 0) === nx && (trk.y | 0) === ny) {
                        const bound = 4 * (cnt - j);
                        const draw = rn2(bound);
                        if (ENV.FF_MFNDTRACE === '1')
                            pushRngLogEntry(`^mtrack_draw[moves=${game.moves | 0} id=${mtmp.m_id | 0} cand=${nx},${ny} j=${j} bound=${bound} draw=${draw}]`);
                        if (draw) {
                            skipped = true;
                            break;
                        }
                    }
                }
                if (skipped) continue;
            }
        }

        const ndist = dist2(nx, ny, ggx, ggy);
        const nearer = ndist < nidist;

        if ((appr === 1 && nearer) || (appr === -1 && !nearer)
            || (!appr && !rn2(++chcnt))
            /* C monmove.c:1972-1974 — the appr == -2 preferred-range band set
             * by m_balks_at_approaching() for a throw-and-return weapon. */
            || (appr === -2
                && ((ndist <= prefrange_mv.min && !nearer)
                    || (ndist >= prefrange_mv.max && nearer)))
            || (mmoved === MMOVE_NOTHING_MV)) {
            nix = nx;
            niy = ny;
            nidist = ndist;
            chi = i;
            mmoved = MMOVE_MOVED_MV;
        }
    }

    if (mmoved !== MMOVE_NOTHING_MV) {
        /* C monmove.c:2008 — a monster held by a sticking hero cannot move
         * away while the hero remains attached.  This returns MMOVE_DONE
         * before the dig-weapon arm and consumes no movement RNG. */
        if (mmoved === MMOVE_MOVED_MV
            && !((game.u?.ux | 0) === (nix | 0) && (game.u?.uy | 0) === (niy | 0))
            && sticks(game.youmonst?.data)
            && game.u?.ustuck === mtmp
            && !(game.u?.uswallow | 0))
            return MMOVE_DONE_MV;

        if (mmoved === MMOVE_MOVED_MV && await m_digweapon_check(mtmp, nix, niy))
            return MMOVE_DONE_MV;

        /* C monmove.c:2030: if (ALLOW_U) nix=mux, niy=muy */
        if (chi >= 0 && (mfp_poss[chi].info & ALLOW_U_MV)) {
            const u = game.u;
            nix = (mtmp.mux !== undefined ? mtmp.mux : (u?.ux ?? 0)) | 0;
            niy = (mtmp.muy !== undefined ? mtmp.muy : (u?.uy ?? 0)) | 0;
        }
        /* C monmove.c:2034: if u_at(nix,niy) → MMOVE_NOTHING */
        const u = game.u;
        if (u && (u.ux | 0) === nix && (u.uy | 0) === niy) {
            mtmp.mux = u.ux | 0;
            mtmp.muy = u.uy | 0;
            return MMOVE_NOTHING_MV;
        }

        if (chi >= 0 && ((mfp_poss[chi].info & ALLOW_M_MV)
                         || (nix === (mtmp.mux | 0) && niy === (mtmp.muy | 0)))) {
            return await m_move_aggress(mtmp, nix, niy);
        }

        /* C monmove.c:2049-2060: an ordinary displacer swaps places with the
         * monster occupying the selected ALLOW_MDISP candidate. */
        if (chi >= 0 && (mfp_poss[chi].info & ALLOW_MDISP_MV)) {
            const mtmp2 = m_at(nix, niy);
            const mstatus = await mdisplacem(mtmp, mtmp2, false);
            if (mstatus & (M_ATTK_AGR_DIED_MV | M_ATTK_DEF_DIED_MV))
                return MMOVE_DIED_MV;
            if (mstatus & M_ATTK_HIT_MV)
                return MMOVE_MOVED_MV;
            return MMOVE_DONE_MV;
        }

        /* C monmove.c:2063: if (!m_in_out_region(mtmp, nix, niy)) return
         * MMOVE_DONE.  Real port (js/region.js); it keeps every region's
         * monster list in step with the move and can veto it through a
         * can_enter_f/can_leave_f callback.  Both gas-cloud region types leave
         * those slots at NO_CALLBACK, so it returns TRUE for every region this
         * port can create.  No RNG. */
        if (!m_in_out_region(mtmp, nix, niy))
            return MMOVE_DONE_MV;
        /* C monmove.c:2066: ALLOW_ROCK && m_can_break_boulder: fracture the
         * boulder and spend the monster's move without changing position. */
        if (chi >= 0 && (mfp_poss[chi].info & ALLOW_ROCK_MV)
            && await m_break_boulder_mv(mtmp, nix, niy))
            return MMOVE_DONE_MV;

        /* C monmove.c:2071 m_postmove_effect(mtmp) — hezrou/steam-vortex gas
         * clouds, fired BEFORE the position update because monsters have no
         * "previous location" field (monmove.c:687-692).  RNG: one rn1(3,4)
         * inside create_gas_cloud (region.c:1303) per cloud. */
        m_postmove_effect(mtmp);

        /* C monmove.c:2073-2086: actual move — update position */
        mtmp.mx = nix;
        mtmp.my = niy;
        /* C monmove.c:2057-2058: for a long worm, insert a new segment to
         * reconnect the head with the tail (rnd(5)/rn1 growth draws). */
        if (mtmp.wormno)
            worm_move(mtmp);

        maybe_unhide_at(mtmp.mx | 0, mtmp.my | 0);

        /* C postmov (monmove.c:1467-1468):
         *     boolean canseeit = cansee(mtmp->mx, mtmp->my),
         *             didseeit = canseeit;
         * evaluated ONCE at postmov entry — the monster is already standing on
         * the new cell but the door there is still CLOSED.  UnblockDoor
         * (monmove.c:1535) then re-caches it as `didseeit || cansee(...)`, so
         * the PRE-OPEN value is sticky: C reports You_see() for a door the hero
         * could see before it swung open even if the post-vision_recalc cansee()
         * of that cell has gone false.  This port only had the post-recalc
         * cansee(), which is the `||`'s right operand alone. */
        const _didseeit_pm = !!cansee(mtmp.mx | 0, mtmp.my | 0);

        /* C postmov (monmove.c:1472-1505): a vampire in a solid form changes
         * into a fog cloud when it moves under a closed or locked door.  The
         * transformation is deliberately deferred until after movement; when
         * the monster was visible C paints the change at its old position and
         * then places it back on the door square. */
        const _vampDoorLoc = game.level?.locations?.[nix]?.[niy];
        if (is_vampshifter(mtmp)
            && !((mtmp.data?.mflags1 | 0) & M1_AMORPHOUS)
            && ((_vampDoorLoc?.typ | 0) === DOOR_TYP_MV)
            && (((_vampDoorLoc?.doormask | 0) & (D_LOCKED_MV | D_CLOSED_MV)) !== 0)
            && can_fog(mtmp)) {
            if (seenflgs) {
                mtmp.mx = omx;
                mtmp.my = omy;
                newsym(nix, niy);
                newsym(omx, omy);
            }
            await newcham(mtmp, PM_FOG_CLOUD,
                          (seenflgs & 1) ? NC_SHOW_MSG : 0);
            /* C vamp_shift always calls display_nhwindow(WIN_MESSAGE,FALSE)
             * after newcham, even when no shape-change message was emitted. */
            topl_force_break_now();
            if (seenflgs) {
                mtmp.mx = nix;
                mtmp.my = niy;
                newsym(omx, omy);
                newsym(nix, niy);
            }
        }

        newsym(omx, omy);

        /* C postmov → mintrap: check for trap at new position.
         * C ref: monmove.c:1535 trapret = mintrap(mtmp, NO_TRAP_FLAGS).
         * SQKY_BOARD keeps its existing in-line squeak-message handling (the
         * trapeffect_sqky_board leaf is not yet ported); all other trap types
         * are routed through the ported mintrap so their RNG (e.g. MAGIC_TRAP
         * rn2(21), and the rn2(40) escape check for already-trapped monsters)
         * fires in C order. */
        {
            const _trap = t_at(nix, niy);
            if (_trap && _trap.ttyp !== SQKY_BOARD_MV) {
                const _pmx = mtmp.mx | 0, _pmy = mtmp.my | 0;
                const _pttyp = _trap.ttyp;
                const trapret = await mintrap(mtmp, 0);
                if (trapret === TRAP_KILLED_MON_MV || trapret === TRAP_MOVED_MON_MV) {
                    if (mtmp.mx) newsym(mtmp.mx | 0, mtmp.my | 0);
                    else if (trapret === TRAP_KILLED_MON_MV && _pmx > 0
                             && (_pttyp === 1 || _pttyp === 2 || _pttyp === 3)) /* ARROW/DART/ROCKTRAP */
                        newsym(_pmx, _pmy);
                    return MMOVE_DIED_MV;
                }
            } else if (_trap && _trap.ttyp === SQKY_BOARD_MV) {
                _handle_sqky_board_mon(mtmp, _trap, nix, niy);
            }
        }

        {
            const _dloc = game.level?.locations?.[mtmp.mx | 0]?.[mtmp.my | 0];
            if (_dloc && (_dloc.typ | 0) === DOOR_TYP_MV
                && !(_mf1_ct & M1_WALLWALK_MV) && !can_tunnel_mv) {
                const _mndx_d = (mtmp.mndx ?? mtmp.mnum ?? 0) | 0;
                const _mrow_d = (_mndx_d >= 0 && _mndx_d < _MONS_MV.length) ? _MONS_MV[_mndx_d] : null;
                const _mf1_d = _mrow_d ? (_mrow_d[6] | 0) : 0;
                const _mf2_d = _mrow_d ? (_mrow_d[7] | 0) : 0;
                const _msize_d = (_mndx_d >= 0 && _mndx_d < _MONS_MSIZE_MV.length)
                    ? (_MONS_MSIZE_MV[_mndx_d] | 0) : MZ_SMALL_MV;
                const _can_open_d = !((_mf1_d & M1_NOHANDS_MV) || (_msize_d < MZ_SMALL_MV));
                /* passes_walls / can_tunnel: false for the common ground walker
                 * (the existing mfndpos posture); if either held the door is
                 * skipped, as in C (the !passes_walls && !can_tunnel guard). */
                const _dm_d = _dloc.doormask | 0;
                const _btrapped_d = (_dm_d & D_TRAPPED_MV) !== 0;
                let _btrapped_now = _btrapped_d;
                if (_btrapped_now) {
                    let _mk = mtmp.minvent;
                    for (; _mk; _mk = _mk.nobj)
                        if ((_mk.oartifact | 0) === ART_MASTER_KEY_MV) break;
                    if (_mk) {
                        _dloc.doormask = _dm_d & ~D_TRAPPED_MV;
                        _btrapped_now = false;
                    }
                }
                if ((_dm_d & D_CLOSED_MV) === D_CLOSED_MV && !(_dm_d & D_LOCKED_MV)
                    && _can_open_d) {
                    let _doorDone = false;
                    /* C UnblockDoor (monmove.c:1552): doormask = <what>; newsym;
                     * recalc_block_point; vision_recalc(0).  <what> is D_ISOPEN
                     * for an untrapped door and D_NODOOR for a trapped one — the
                     * trap blows the door off its hinges (monmove.c:1577). */
                    _dloc.doormask = _btrapped_now ? D_NODOOR_MV : D_ISOPEN_MV;
                    newsym(mtmp.mx | 0, mtmp.my | 0);
                    recalc_block_point(mtmp.mx | 0, mtmp.my | 0);
                    vision_recalc(0);
                    /* C monmove.c:1535 UnblockDoor — canseeit = didseeit || cansee(). */
                    const _canseeit_d = _didseeit_pm || !!cansee(mtmp.mx | 0, mtmp.my | 0);
                    /* C monmove.c:1576-1580 — a trapped door blows up INSTEAD of
                     * any of the three "opens a door" feedback arms, and
                     * mb_trapped() returns TRUE when the blast kills the mover. */
                    if (_btrapped_now) {
                        if (await mb_trapped(mtmp, _canseeit_d))
                            return MMOVE_DIED_MV;
                        _doorDone = true;
                    }
                    let _doormsg = null;
                    let _doorhear = false;
                    if (game.flags?.verbose === false) {
                        /* C: the whole feedback block is skipped */
                    } else if (_doorDone) {
                        /* mb_trapped() gave the feedback */
                    } else if (!_canseeit_d) {
                        /* C monmove.c:1613: !Deaf → You_hear("a door open.");
                         * display.js You_hear carries the Deaf / Unaware
                         * ("You dream that you hear ") prefixes (pline.c:447). */
                        _doorhear = true;
                    } else if (!canspotmon(mtmp)) {
                        /* C monmove.c:1611: canseeit && !canspotmon →
                         * You_see("a door open."). */
                        _doormsg = 'You see a door open.';
                    }
                    else {
                        _doormsg = `${Monnam_dm(mtmp)} opens a door.`;
                    }
                    /* C monmove.c:1609-1613 routes every feedback arm through
                     * pline/You_see/You_hear.  Keep that real display call: its
                     * pre-message flush is the physical frame a subsequent
                     * width-driven more() freezes. */
                    if (_doorhear)
                        await You_hear('a door open.');
                    else if (_doormsg)
                        await pline(_doormsg);
                } else if ((_dm_d & (D_LOCKED_MV | D_CLOSED_MV)) !== 0
                    && (_mf2_d & M2_GIANT_MAF) !== 0) {
                    /* C monmove.c:1617-1641.  mfndpos only admits this square
                     * for a doorbuster after the amorphous/unlock/open arms
                     * have failed.  A locked door consumes the rn2(2) even
                     * when it winds up merely broken. */
                    const _maskd = (_btrapped_now
                        || ((_dm_d & D_LOCKED_MV) !== 0 && rn2(2) === 0))
                        ? D_NODOOR_MV : D_BROKEN_MV;
                    _dloc.doormask = _maskd;
                    newsym(mtmp.mx | 0, mtmp.my | 0);
                    recalc_block_point(mtmp.mx | 0, mtmp.my | 0);
                    vision_recalc(0);
                    const _canseeit_d = _didseeit_pm
                        || !!cansee(mtmp.mx | 0, mtmp.my | 0);
                    if (_btrapped_now) {
                        if (await mb_trapped(mtmp, _canseeit_d))
                            return MMOVE_DIED_MV;
                    } else if (game.flags?.verbose !== false) {
                        let _doormsg = null;
                        if (_canseeit_d && canspotmon(mtmp))
                            _doormsg = `${Monnam_dm(mtmp)} smashes down a door.`;
                        else if (_canseeit_d)
                            _doormsg = 'You see a door crash open.';
                        else
                            _doormsg = 'You hear a door crash open.';
                        const _prevd = game._pending_message;
                        if (_prevd && _prevd.length > 0) {
                            const _joinedd = _prevd + '  ' + _doormsg;
                            _topl_record_join(_prevd, _joinedd);
                            game._pending_message = _joinedd;
                        } else {
                            game._pending_message = _doormsg;
                        }
                    }
                    if (in_rooms(mtmp.mx | 0, mtmp.my | 0, SHOPBASE_MV).length)
                        add_damage(mtmp.mx | 0, mtmp.my | 0, 0);
                }
            }
        }

        /* C monmove.c:1623-1639 — the IRONBARS arm of "doors and bars".  The
         * metal-eating arm (dissolve_bars, MMOVE_DONE) is not ported here;
         * the else-if Norep arm is: "%s %s %s the iron bars." */
        {
            const _bloc = game.level?.locations?.[mtmp.mx | 0]?.[mtmp.my | 0];
            if (_bloc && (_bloc.typ | 0) === IRONBARS
                && game.flags?.verbose !== false && canseemon(mtmp)) {
                const _bn = (mtmp.mndx ?? mtmp.mnum ?? 0) | 0;
                const _bptr = permonstTemplate(_bn);
                const _eats = !(((_bloc.wall_info ?? 0) | 0) & 0x08 /* W_NONDIGGABLE */)
                    && (dmgtype({ pmidx: _bn }, AD_RUST_BARS_MV)
                        || dmgtype({ pmidx: _bn }, AD_CORR_BARS_MV)
                        || metallivorous_mv(_bptr));
                if (!_eats) {
                    await Norep('%s %s %s the iron bars.', Monnam_dm(mtmp),
                          makeplural(locomotion(_bptr, 'pass')),
                          ((_bptr.mflags1 | 0) & M1_WALLWALK_MV) ? 'through' : 'between');
                }
            }
        }

        if (can_tunnel_mv && may_dig(mtmp.mx | 0, mtmp.my | 0)
            && await mdig_tunnel(mtmp))
            return MMOVE_DIED_MV; /* mon died (position already updated) */

        /* C postmov: repaint the destination before the trailing eater/web/
         * hide-under block.  Keeping this after dig but before postmov() is
         * what places its display-stream draws ahead of those block's core
         * leaves. */
        newsym(nix, niy);

        /* C mon_track_add(mtmp, omx, omy): update mtrack (monmove.c:79). */
        mon_track_add(mtmp, omx, omy);

    } else {
        /* C monmove.c:2119-2122: a unicorn with no ordinary move can
         * teleport. The move is spent even if relocation finds no square. */
        if (_is_unicorn_mv(ptr.pmidx | 0) && rn2(2) && !tele_restrict(mtmp)) {
            await rloc(mtmp, RLOC_MSG);
            return MMOVE_MOVED_MV;
        }
        if (mtmp.wormno)
            worm_nomove(mtmp);
    }

    /* C monmove.c:2073 — the mainline `return postmov(..., mmoved, ...)`. */
    if (ENV.FF_MFNDTRACE === '1')
        pushRngLogEntry(`^mresult[moves=${game.moves | 0} id=${mtmp.m_id | 0} xy=${mtmp.mx | 0},${mtmp.my | 0} mmoved=${mmoved | 0}]`);
    return postmov(mtmp, mmoved); /* MMOVE_MOVED or MMOVE_NOTHING */
}

export function mon_track_add(mtmp, x, y) {
    if (!Array.isArray(mtmp.mtrack)) mtmp.mtrack = [];
    // is short (C's mtrack is a fixed coord[MTSZ]; a missing slot reads as 0,0).
    while (mtmp.mtrack.length < MTSZ_MV) mtmp.mtrack.push({ x: 0, y: 0 });
    for (let j = MTSZ_MV - 1; j > 0; j--) {
        mtmp.mtrack[j] = { x: mtmp.mtrack[j - 1].x, y: mtmp.mtrack[j - 1].y };
    }
    mtmp.mtrack[0].x = x;
    mtmp.mtrack[0].y = y;
}

export function mon_track_clear(mtmp) {
    mtmp.mtrack = [];
    for (let j = 0; j < MTSZ_MV; j++) mtmp.mtrack.push({ x: 0, y: 0 });
}

/* C ref: monmove.c:2222-2290 set_apparxy.
 * Sets mtmp->mux/mtmp->muy — the monster's perceived hero position.
 *
 * Tame path (no RNG): mtame || ustuck || u_at(mux,muy) → mux=u.ux, muy=u.uy.
 * Displacement paths (RNG) — invisible/displaced/underwater — require
 * Invis/Displaced/Underwater flags + rn2(3)/rn2(4) + rn2(2*displ+1) loop.
 * Full displacement port deferred to L15. For now, the non-tame non-trivial
 * path also sets mux=u.ux/muy=u.uy (displ=0 branch), matching C when the
 * hero is neither invisible nor displaced.
 *
 * Smoke test:
 * 4. set_apparxy with tame mtmp: no RNG; mux=u.ux, muy=u.uy.
 */
export function set_apparxy(mtmp) {
    const u = game.u;
    if (!u || !mtmp)
        return;
    const mx = (mtmp.mux !== undefined ? mtmp.mux : 0) | 0;
    const my = (mtmp.muy !== undefined ? mtmp.muy : 0) | 0;
    if (mtmp.mtame
        || mtmp === (u.ustuck ?? null)
        || (mx === (u.ux | 0) && my === (u.uy | 0))) {
        mtmp.mux = u.ux | 0;
        mtmp.muy = u.uy | 0;
        return;
    }
    const _uprop = (p) => {
        const r = u.uprops?.[p];
        return r ? r : null;
    };
    const Invis = _Invis_mv();
    const perceives_data = !!((mtmp.data.mflags1 || 0) & M1_SEE_INVIS);
    const notseen = (!mtmp.mcansee || (Invis && !perceives_data));
    const PM_DISPLACER_BEAST = 39;
    const _pDisp = _uprop(DISPLACED_PROP);
    const Displaced = !!(_pDisp && ((_pDisp.intrinsic | 0) || (_pDisp.extrinsic | 0)));
    const notthere = (Displaced && (mtmp.mnum | 0) !== PM_DISPLACER_BEAST);
    const Underwater = !!(u.uinwater);
    let displ;
    if (Underwater) {
        displ = 1;
    }
    else if (notseen) {
        /* C: xorn with umoney → displ=0; others → displ=1 */
        const PM_XORN = 232;
        const umoney = money_cnt(u.invent) | 0;
        displ = ((mtmp.mnum | 0) === PM_XORN && umoney) ? 0 : 1;
    }
    else if (notthere) {
        /* C monmove.c:2228 — displ = couldsee(mx, my) ? 2 : 1, on the monster's
         * CURRENT belief <mux,muy>, not on its own square. */
        displ = couldsee(mx, my) ? 2 : 1;
    }
    else {
        displ = 0;
    }
    if (!displ) {
        mtmp.mux = u.ux | 0;
        mtmp.muy = u.uy | 0;
        return;
    }
    /* C monmove.c:2239 — gotu = notseen ? !rn2(3) : notthere ? !rn2(4) : FALSE */
    const gotu_roll = notseen ? rn2(3) : notthere ? rn2(4) : -1;
    const gotu = (gotu_roll === 0) ? 1 : 0; /* !rn2(n) means rn2(n)==0 */
    if (!gotu) {
        const range = 2 * displ + 1;
        const M1_WALLWALK = 0x00000008;  /* monflag.h:88 */
        const passes_walls = ((mtmp.data?.mflags1 | 0) & M1_WALLWALK) !== 0;
        const ux = u.ux | 0, uy = u.uy | 0;
        let try_cnt = 0;
        let fx = mx, fy = my;
        for (;;) {
            if (++try_cnt > 200) {
                fx = ux;
                fy = uy;
                break; /* punt */
            }
            fx = (ux - displ + rn2(range)) | 0;
            fy = (uy - displ + rn2(range)) | 0;
            if (!isok(fx, fy))
                continue;
            if (displ !== 2 && fx === (mtmp.mx | 0) && fy === (mtmp.my | 0))
                continue;
            if ((fx !== ux || fy !== uy) && !passes_walls
                && !(accessible(fx, fy)
                     || (closed_door(fx, fy) && (can_ooze(mtmp) || can_fog(mtmp)))))
                continue;
            if (!couldsee(fx, fy))
                continue;
            break;
        }
        mtmp.mux = fx;
        mtmp.muy = fy;
    }
    else {
        mtmp.mux = u.ux | 0;
        mtmp.muy = u.uy | 0;
    }
}


/* C ref: monmove.c:177-180 distu(x, y) - distance squared from hero to (x,y).
 * Returns dx*dx + dy*dy where dx = x - u.ux, dy = y - u.uy. */
function distu(x, y) {
    const u = game.u;
    if (!u) return 0;
    const dx = (x | 0) - (u.ux | 0), dy = (y | 0) - (u.uy | 0);
    return ((dx * dx) + (dy * dy)) | 0;
}

/* C ref: monmove.c:181-182 mdistu(mon) - distance squared from hero to monster.
 * Returns distu(mon->mx, mon->my). */
function mdistu(mon) {
    return distu(mon.mx, mon.my);
}

/* C ref: mondata.h:35 hides_under(ptr) — (ptr->mflags1 & M1_CONCEAL) != 0L.
 * monflag.h:92 M1_CONCEAL = 0x00000080L ("hides under objects"). */
const M1_CONCEAL_MV = 0x00000080;
function hides_under_mv(ptr) {
    return !!ptr && ((ptr.mflags1 | 0) & M1_CONCEAL_MV) !== 0;
}

/* C ref: monst.h helpless(mon) — (mon)->msleeping || !(mon)->mcanmove.
 * Same predicate js/shk.js:1474 and js/mhitm.js:3418 spell out locally. */
function helpless_mv(mon) {
    return !!mon && (!!(mon.msleeping | 0) || !(mon.mcanmove | 0));
}

/* C monst.h S_EEL — the eel monster class letter (js/mhitm.js:1687,
 * js/fastforward.js:1328 and js/mklev.js hideunder() all already say 57). */
const S_EEL_MV = 57;

/* C ref: mondata.h:147 webmaker(ptr) — an mons[] IDENTITY test, exactly two
 * indices (js/pm.generated.js PM_CAVE_SPIDER = 94, PM_GIANT_SPIDER = 96;
 * js/cmd.js:959 spells the same predicate out for the polymorphed hero). */
const PM_CAVE_SPIDER_MV = 94, PM_GIANT_SPIDER_MV = 96;
function webmaker_mv(ptr) {
    const i = ptr ? (ptr.pmidx | 0) : -1;
    return i === PM_CAVE_SPIDER_MV || i === PM_GIANT_SPIDER_MV;
}

/* C ref: monmove.c:1226-1239 holds_up_web(coordxy x, coordxy y).
 * NB the C short-circuit order: an off-map square answers TRUE before levl[][]
 * is ever read, and stairway_at() is consulted only for STAIRS/LADDER. */
function holds_up_web_mv(x, y) {
    if (!isok(x, y))
        return true;
    const typ = game.level?.locations?.[x | 0]?.[y | 0]?.typ | 0;
    if (IS_OBSTRUCTED(typ))
        return true;
    if (typ === STAIRS || typ === LADDER) {
        const sway = stairway_at(x | 0, y | 0);
        if (sway && sway.up)
            return true;
    }
    if (typ === IRONBARS)
        return true;
    return false;
}

/* C ref: monmove.c:1242-1249 count_webbing_walls — the four cardinal
 * neighbours, in C's order (north, east, south, west).  No RNG. */
function count_webbing_walls_mv(x, y) {
    return (holds_up_web_mv(x, y - 1) ? 1 : 0)
         + (holds_up_web_mv(x + 1, y) ? 1 : 0)
         + (holds_up_web_mv(x, y + 1) ? 1 : 0)
         + (holds_up_web_mv(x - 1, y) ? 1 : 0);
}

function soko_allow_web_mv(mon) {
    if (!In_sokoban(game.u?.uz))
        return true;
    const stway = stairway_find_dir(true); /* stairs up */
    if (stway && clear_path(mon.mx | 0, mon.my | 0, stway.sx | 0, stway.sy | 0))
        return true;
    return false;
}

async function maybe_spin_web(mtmp) {
    const ptr = mtmp.data;
    if (webmaker_mv(ptr)
        && !helpless_mv(mtmp) && !(mtmp.mspec_used | 0)
        && !t_at(mtmp.mx | 0, mtmp.my | 0) && soko_allow_web_mv(mtmp)) {
        /* C:1275 `(mtmp->data == &mons[PM_GIANT_SPIDER]) ? 15 : 5` */
        const prob = ((((ptr.pmidx | 0) === PM_GIANT_SPIDER_MV ? 15 : 5)
                       * (count_webbing_walls_mv(mtmp.mx | 0, mtmp.my | 0) + 1))
                      - (3 * count_traps(WEB)));

        /* C:1279 — rn2() is the left operand, so it is ALWAYS evaluated. */
        if (rn2(1000) < prob) {
            const trap = await maketrap(mtmp.mx | 0, mtmp.my | 0, WEB);
            if (trap) {
                mtmp.mspec_used = d(4, 4); /* 4..16 */
                if (cansee(mtmp.mx | 0, mtmp.my | 0)) {
                    /* C:1284 `canspotmon(mtmp) ? y_monnam(mtmp) : something` */
                    const mbuf = canspotmon(mtmp) ? y_monnam(mtmp) : 'something';
                    /* C:1286 pline_mon(mtmp, "%s spins a web.", upstart(mbuf));
                     * pline_mon only adds monster-based message coloring, which
                     * this tree does not render — every other js/ file spells it
                     * as a plain pline() for the same reason. */
                    pline(`${upstart(mbuf)} spins a web.`);
                    trap.tseen = 1;
                }
                if (in_rooms(mtmp.mx | 0, mtmp.my | 0, SHOPBASE_MV).length)
                    add_damage(mtmp.mx | 0, mtmp.my | 0, 0);
            }
        }
    }
}

export async function postmov(mtmp, mmoved) {
    if (mmoved !== MMOVE_MOVED_MV && mmoved !== MMOVE_DONE_MV)
        return mmoved;
    /* C:1692 — `ptr` inside postmov is re-read from mtmp->data after mintrap
     * (monmove.c:1519 "in case mintrap() caused polymorph"), so at this point
     * ptr IS mtmp->data; read it directly rather than caching a stale row. */
    const ptr = mtmp.data;
    /* C monmove.c:1661 `if (OBJ_AT(mtmp->mx, mtmp->my) && mtmp->mcanmove)`. */
    if ((game.level?.levelObjects?.[mtmp.mx | 0]?.[mtmp.my | 0])
        && (mtmp.mcanmove | 0)) {
        /* C:1663-1666 — "Maybe a rock mole just ate some metal object".
         * MUST stay above mpickstuff (C:1680) and above the hides_under rn2(5)
         * (C:1696) or the stream slips the other way. */
        if (metallivorous_mv(ptr)) {
            if ((await meatmetal_mv(mtmp)) === 2)
                return MMOVE_DIED_MV; /* C:1665 it died */
        }
        /* C:1668-1678 — cube and corpse-eater consumption precede pickup. */
        if ((ptr?.pmidx | 0) === PM_GELATINOUS_CUBE_MV) {
            const eaten = await meatobj_real(mtmp);
            if (eaten >= 2)
                return MMOVE_DIED_MV;
        }
        if (corpse_eater_mwci(ptr)) {
            const eaten = await meatcorpse_real(mtmp);
            if (eaten >= 2)
                return MMOVE_DIED_MV;
        }
        /* C:1680-1681 */
        if (await mpickstuff(mtmp))
            mmoved = MMOVE_DONE_MV;
        /* C:1683-1687 — redraw an invisible monster and any worm segments. */
        if (mtmp.minvis) {
            newsym(mtmp.mx | 0, mtmp.my | 0);
            if (mtmp.wormno)
                see_wsegs(mtmp);
        }
    }
    /* C:1690 */
    await maybe_spin_web(mtmp);
    if (hides_under_mv(ptr) || ((ptr && (ptr.mlet | 0)) === S_EEL_MV)) {
        if ((mtmp.mundetected | 0) || (!helpless_mv(mtmp) && rn2(5)))
            hideunder(mtmp);
        newsym(mtmp.mx | 0, mtmp.my | 0);
    }
    if (mtmp.isshk)
        after_shk_move(mtmp);
    return mmoved;
}


/* C monflag.h:115 M1_METALLIVORE; mondata.h:92 metallivorous(ptr).  0x80000000
 * is the sign bit, so mask with >>> 0 the way acidic_mv above does. */
const M1_METALLIVORE_MV = 0x80000000;
function metallivorous_mv(ptr) {
    return !!ptr && (((ptr.mflags1 >>> 0) & M1_METALLIVORE_MV) !== 0);
}

/* C objclass.h:194 is_metallic(otmp) — objects[otyp].oc_material in
 * IRON(11)..MITHRIL(17).  _oc_material_mv above is the same generated column
 * js/mklev.js obj_oc_material and js/do_wear.js read. */
const MAT_IRON_MV = 11, MAT_MITHRIL_MV = 17;
function is_metallic_mv(otmp) {
    const m = _oc_material_mv(otmp.otyp | 0);
    return m >= MAT_IRON_MV && m <= MAT_MITHRIL_MV;
}

/* C monst.h:277 resists_poison(mon) = Resists_Elem(mon, POISON_RES), i.e.
 * mon_resistancebits(mon) & MR_POISON (monst.h:270).  js/mklev.js's
 * `resists_poison` is a STUB and js/mhitu.js's real predicate is file-local, so
 * spell it out here the same way js/mhitu.js:4742 does. */
const MR_POISON_MV = 0x20;
function resists_poison_mv(mon) {
    const bits = ((mon.data ? (mon.data.mresists | 0) : 0)
                  | (mon.mextrinsics | 0) | (mon.mintrinsics | 0));
    return (bits & MR_POISON_MV) !== 0;
}

/* C mon.c:1466 mtmp->data == &mons[PM_RUST_MONSTER] — an mons[] IDENTITY test,
 * so it is exactly one index (js/pm.generated.js:218). */
const PM_RUST_MONSTER_MV = 212;
/* C objects[] otyps: js/mklev.js:440, js/mklev.js:15618, js/mklev.js:324. */
const AMULET_OF_STRANGULATION_MV = 203, RIN_SLOW_DIGESTION_MV = 193;
const ROCK_MV = 474;

function touch_artifact_mv(_otmp, _mtmp) {
    return true;
}

function _m_consume_metal_obj_mv(mtmp, otmp) {
    const ispet = !!(mtmp.mtame | 0);
    if (!ispet && (mtmp.mhp | 0) < (mtmp.mhpmax | 0))
        healmon_real(mtmp, OC_WEIGHT[otmp.otyp | 0] | 0, 0);
    /* C:1401-1402 `if (Has_contents(otmp)) meatbox(mtmp, otmp);` — Has_contents
     * is `otmp->cobj != 0` (obj.h:334).  No vanilla container is metallic
     * (LARGE_BOX/CHEST are WOOD, ICE_BOX PLASTIC, the bags CLOTH), so this arm
     * is unreachable from meatmetal; meatbox is unported and is not guessed at. */
    /* C:1403-1408 uball/uchain.  unpunish() does not exist in js/ (the only
     * body, js/dig.js:1359, is a throwing stub), so:
     *   - uchain: C calls unpunish() and does NOT delobj, i.e. draws NOTHING.
     *     Return early to keep the RNG shape; the unpunish side effect is a
     *     documented GAP.
     *   - uball: C calls unpunish() then delobj(), i.e. the same draw as the
     *     ordinary path.  Fall through; unpunish is the same documented GAP. */
    const _uchain = game.u?.uchain;
    if (_uchain && otmp === _uchain)
        return; /* GAP: unpunish() unported — no draw either way. */
    /* C:1421 delobj(otmp) -> delobj_core(otmp, FALSE)  (invent.c:1436-1461).
     * `if (!force && obj_resists(obj, 0, 0))` — rn2(100), and on a TRUE the
     * object SURVIVES (only in_use is cleared).  meatmetal returns 1 either
     * way; that is C's behaviour, bug included (Cardinal Rule 1). */
    if (obj_resists(otmp, 0, 0)) {
        otmp.in_use = 0;
        return;
    }
    const update_map = ((otmp.where | 0) === OBJ_FLOOR);
    const _ox = otmp.ox | 0, _oy = otmp.oy | 0;
    obj_extract_floor(otmp);
    otmp.where = OBJ_DELETED;
    if (update_map) {
        maybe_unhide_at(_ox, _oy);
        newsym(_ox, _oy);
    }
}

async function meatmetal_mv(mtmp) {
    /* C:1465-1467 — if a pet, eating is handled separately, in dog.c */
    if (mtmp.mtame | 0)
        return 0;
    const vis = canseemon(mtmp);
    const isRust = ((mtmp.data ? (mtmp.data.pmidx | 0) : -1) === PM_RUST_MONSTER_MV);

    /* C:1469-1471 — eats topmost metal object if it is there */
    for (let otmp = game.level?.levelObjects?.[mtmp.mx | 0]?.[mtmp.my | 0];
         otmp; otmp = otmp.nexthere) {
        /* C:1472-1477 don't eat indigestible/choking/inappropriate objects */
        if ((isRust && !is_rustprone(otmp))
            || ((otmp.otyp | 0) === AMULET_OF_STRANGULATION_MV
                || (otmp.otyp | 0) === RIN_SLOW_DIGESTION_MV)
            || ((otmp.opoisoned | 0) && !resists_poison_mv(mtmp)))
            continue;
        /* C:1478-1479.  The short-circuit order is load-bearing: obj_resists is
         * INSIDE the `is_metallic(otmp) && ...` conjunct, so a non-metallic item
         * in the pile costs NO draw at all. */
        if (is_metallic_mv(otmp) && !obj_resists(otmp, 5, 95)
            && touch_artifact_mv(otmp, mtmp)) {
            if (isRust && (otmp.oerodeproof | 0)) {
                /* C:1480-1497 — a rust monster spits a rustproof item back out.
                 * distant_name() is called for its SIDE EFFECTS even when the
                 * message will not be printed, so it runs inside `if (vis)` and
                 * outside the verbose test, exactly as C does. */
                if (vis) {
                    const otmpname = await distant_obj_name(otmp);
                    if (game.flags?.verbose !== false)
                        void pline(`${Monnam_dm(mtmp)} eats ${otmpname}!`);
                }
                /* C:1493 the object's rustproofing is gone now */
                otmp.oerodeproof = 0;
                mtmp.mstun = 1;
                if (vis) {
                    const otmpname = await distant_obj_name(otmp);
                    if (game.flags?.verbose !== false)
                        void pline(`${Monnam_dm(mtmp)} spits ${otmpname} out in disgust!`);
                }
                /* C falls out of the if/else and keeps walking the pile. */
            } else {
                if (cansee(mtmp.mx | 0, mtmp.my | 0)) {
                    const otmpname = await distant_obj_name(otmp);
                    if (game.flags?.verbose !== false)
                        void pline(`${Monnam_dm(mtmp)} eats ${otmpname}!`);
                } else {
                    /* C:1512-1515 Soundeffect (screen/audio only, no RNG) then
                     * You_hear("a crunching sound.").  GAP, same one every
                     * You_hear in this file carries: the Deaf / Underwater /
                     * Unaware prefixes of pline.c You_hear are not modelled. */
                    if (game.flags?.verbose !== false)
                        void pline('You hear a crunching sound.');
                }
                /* C:1516 mtmp->meating = otmp->owt / 2 + 1 — integer division on
                 * the CACHED weight (place_object/mksobj set owt = weight(obj)).
                 * The countdown lives at js/monmove.js:1621 (monmove.c:1769). */
                mtmp.meating = Math.trunc((otmp.owt | 0) / 2) + 1;
                _m_consume_metal_obj_mv(mtmp, otmp);
                /* C:1518-1519 DEADMONSTER(mtmp) — monst.h `(mtmp)->mhp < 1`. */
                if ((mtmp.mhp | 0) < 1)
                    return 2;
                if (rnd(25) < 3)
                    await mksobj_at(ROCK_MV, mtmp.mx | 0, mtmp.my | 0, true, false);
                newsym(mtmp.mx | 0, mtmp.my | 0);
                return 1;
            }
        }
    }
    return 0;
}

/* C mondata.h:200 touch_petrifies(ptr) — an mons[] IDENTITY test, not a flag
 * test, so it is exactly two indices. */
const PM_CHICKATRICE_MV = 9, PM_COCKATRICE_MV = 10;
const PM_LIZARD_MV = 326;
/* C mondata.h:88 acidic(ptr) = (ptr->mflags1 & M1_ACID); monflag.h:112. */
const M1_ACID_MV = 0x08000000;
/* C defsym.h S_NYMPH = 14 (same value js/dogmove.js:249 and js/mhitm.js:82 use). */
const S_NYMPH_MV = 14;
/* C mkroom.h:20 SHOPBASE — the "any shop" wildcard js/shk.js in_rooms takes. */
const SHOPBASE_MV = 14;
function _mons_row_mv(mndx) {
    const i = mndx | 0;
    return (i >= 0 && i < _MONS_MV.length) ? _MONS_MV[i] : null;
}
function touch_petrifies_mv(mndx) {
    return (mndx | 0) === PM_COCKATRICE_MV || (mndx | 0) === PM_CHICKATRICE_MV;
}
function acidic_mv(mndx) {
    const row = _mons_row_mv(mndx);
    return !!(row && ((row[6] >>> 0) & M1_ACID_MV));
}

export async function mpickstuff(mtmp) {
    /* C:1853-1854 prevent shopkeepers from leaving the door of their shop */
    if ((mtmp.isshk | 0) && inhishop(mtmp))
        return false;
    /* C:1857-1859 non-tame monsters normally don't go shopping */
    if (!(mtmp.mtame | 0)
        && (in_rooms(mtmp.mx | 0, mtmp.my | 0, SHOPBASE_MV)[0] | 0)
        && rn2(25))
        return false;
    /* C:1861-1863 item in a pool, but monster can't swim */
    if (!could_reach_item(mtmp, mtmp.mx | 0, mtmp.my | 0))
        return false;

    let otmp2;
    for (let otmp = game.level?.levelObjects?.[mtmp.mx | 0]?.[mtmp.my | 0];
         otmp; otmp = otmp2) {
        otmp2 = otmp.nexthere;

        /* C:1868-1871 avoid special items — is_mines_prize/is_soko_prize are
         * FALSE everywhere in js/ today (no prize tracking); same stub the
         * m_search_items scan above and js/dogmove.js both carry. */

        /* C:1873-1874 Nymphs take everything.  Most monsters don't pick up
         * corpses. */
        if (mon_would_take_item(mtmp, otmp)) {
            const _ptr = mtmp.data;
            const _mlet = (_ptr && (_ptr.mlet | 0)) || 0;
            const _cnm = (otmp.corpsenm ?? -1) | 0;
            /* C:1876-1881 — let a handful of corpse types thru to can_carry() */
            if ((otmp.otyp | 0) === CORPSE_OTYP_MV && _mlet !== S_NYMPH_MV
                && !touch_petrifies_mv(_cnm)
                && _cnm !== PM_LIZARD_MV
                && !acidic_mv(_cnm))
                continue;
            /* C:1882-1883 */
            if (!await can_touch_safely(mtmp, otmp))
                continue;
            /* C:1884-1886 */
            const carryamt = can_carry(mtmp, otmp);
            if (carryamt === 0)
                continue;
            /* C:1887-1891 handle cases where the critter can only get some.
             * splitobj() -> nextoid() -> next_ident() fires rnd(2)
             * (mkobj.c:522), so a partial take is NOT RNG-free. */
            let otmp3 = otmp;
            if (carryamt !== ((otmp.quan ?? 1) | 0))
                otmp3 = (await splitobj(otmp, carryamt));
            /* C:1892-1901 — distant_name()'s side effects run even when the
             * message is not printed, so it is called before the extract. */
            if (cansee(mtmp.mx | 0, mtmp.my | 0)) {
                const otmpname = await distant_obj_name(otmp3);
                if (game.flags?.verbose !== false)
                    void pline(`${Monnam_dm(mtmp)} picks up ${otmpname}.`);
            }
            obj_extract_floor(otmp3);
            /* C:1903 mpickobj(mtmp, otmp3) — may merge and free otmp3 */
            void (await mpickobj(mtmp, otmp3));
            /* C:1904-1905 let them try to equip it on the next turn */
            check_gear_next_turn(mtmp);
            newsym(mtmp.mx | 0, mtmp.my | 0);
            return true; /* C:1907 pick only one object */
        }
    }
    return false;
}

/* C ref: monmove.c:2140-2183 can_hide_under_obj(obj).
 * Returns TRUE if a mon can hide under the obj.
 * NO_HIDING_UNDER_STATUES is #ifdef'd out in the C source (never defined),
 * so the statue-exclusion loop at the end is dead code and is not ported. */
export function can_hide_under_obj(obj) {
    let o = obj;
    if (!o || (o.where | 0) !== OBJ_FLOOR)
        return false;
    const t = t_at(o.ox | 0, o.oy | 0);
    if (t && !is_pit(t.ttyp | 0))
        return false;
    /* can't hide under small amount of coins unless non-coins are also
       present; we expect coins to be a single stack but don't assume that */
    if ((o.oclass | 0) === 12 /* COIN_CLASS */) {
        let coinquan = 0;
        do {
            coinquan += o.quan;
            if (coinquan >= 10)
                break; /* fall through to other checks */
            o = o.nexthere;
            if (!o)
                return false; /* whole pile was less than 10 coins */
        } while ((o.oclass | 0) === 12 /* COIN_CLASS */);
    }
    return true; /* can hide under the object */
}

/* C ref: monmove.c:204-239 dochugw(mtmp, chug).
 * Move a monster; if a threat to busy hero, stop doing whatever it is.
 * chug=true: monster is moving (call dochug, then check if hero should stop).
 * chug=false: monster was just created/teleported (don't call dochug, just check if hero should stop).
 * Returns the result of dochug (0 if chug=false). */
export async function dochugw(mtmp, chug) {
    const u = game.u;
    const go = game;

    /* Save mtmp's location before dochug() in case it changes */
    const x = mtmp.mx | 0;
    const y = mtmp.my | 0;

    /* skip canspotmon() if occupation is null/falsy */
    const already_saw_mon = (chug && go.occupation) ? canspotmon(mtmp) : 0;

    /* Call dochug if chug=true, else return 0 */
    const rd = chug ? await dochug(mtmp) : 0;

    /* Check whether hero notices monster and stops current activity.
     * All conditions must be true for stop_occupation() to be called.
     * Condition order matches C source (lines 224-235). */
    if (go.occupation && !rd
        /* monster is hostile and can attack (or hallucination distorts knowledge) */
        && (((u.flags && u.flags.hallucination) || 0) || (!mtmp.mpeaceful && !noattacks(mtmp.data)))
        /* it's close enough to be a threat */
        && mdistu(mtmp) <= ((BOLT_LIM + 1) * (BOLT_LIM + 1))
        /* and either couldn't see it before, or it was too far away */
        && (!already_saw_mon || !couldsee(x, y)
            || distu(x, y) > ((BOLT_LIM + 1) * (BOLT_LIM + 1)))
        /* can see it now, or sense it and would normally see it */
        && canspotmon(mtmp) && couldsee(mtmp.mx | 0, mtmp.my | 0)
        /* monster isn't paralyzed or afraid (scare monster/Elbereth) */
        && mtmp.mcanmove && !onscary_stub(u.ux | 0, u.uy | 0, mtmp)) {
        await stop_occupation();
    }

    return rd;
}

export function m_postmove_effect(mtmp) {
    const is_u = (mtmp === game.youmonst) ? 1 : 0;
    const x = is_u ? game.u.ux0 : mtmp.mx;
    const y = is_u ? game.u.uy0 : mtmp.my;

    if ((mtmp.data.pmidx | 0) === PM_HEZROU) {
        /* Hezrous create clouds of stench */
        create_gas_cloud(x, y, 1, 8);
    } else if ((mtmp.data.pmidx | 0) === PM_STEAM_VORTEX && !mtmp.mcan) {
        /* Steam Vortex creates harmless vapor when not enchanted */
        create_gas_cloud(x, y, 1, 0);
    }
}

function event_log() { /* logging — not yet ported */ }

export function m_everyturn_effect(mtmp) {
    /* C monmove.c:652 — same `mtmp == &gy.youmonst` test, same repair as
     * m_postmove_effect above. */
    const is_u = (mtmp === game.youmonst) ? 1 : 0;
    const x = is_u ? game.u.ux : mtmp.mx;
    const y = is_u ? game.u.uy : mtmp.my;

    if ((mtmp.data.pmidx | 0) === PM_FOG_CLOUD) {
        /* don't leave a vapor cloud if some other gas cloud is already
           present, or when flowing under closed doors so that visibility
           changes aren't mixed with messages about doing such */
        event_log("fog_everyturn[%d@%d,%d cd=%d vr=%d]",
                  mtmp.data.pmidx | 0, x, y,
                  closed_door(x, y) ? 1 : 0,
                  visible_region_at(x, y) ? 1 : 0);
        if (!closed_door(x, y) && !visible_region_at(x, y))
            create_gas_cloud(x, y, 1, 0); /* harmless vapor */
    }
}

/* C ref: region.c:1207 create_gas_cloud — real port lives in js/region.js
 * (region.c is its C home).  Re-exported here because monmove.c's three call
 * sites (683 fog vapor, 702 hezrou stench, 704 steam-vortex vapor) are the
 * only ones this port wires. */
export { create_gas_cloud };

/* C ref: monflag.h:87 M1_AMORPHOUS — can flow under doors */
const M1_AMORPHOUS = 0x00000004;
const SPP_COIN_CLASS = 12, SPP_GEM_CLASS = 13, SPP_AMULET_CLASS = 5,
      SPP_RING_CLASS = 4, SPP_VENOM_CLASS = 17, SPP_ARMOR_CLASS = 3;
const SPP_ARROW = 18, SPP_BOOMERANG = 26, SPP_DAGGER = 34, SPP_CRYSKNIFE = 43,
      SPP_SLING = 87, SPP_FEDORA = 92, SPP_LEATHER_JACKET = 135,
      SPP_CREDIT_CARD = 223, SPP_CORPSE = 265, SPP_FORTUNE_COOKIE = 289,
      SPP_CANDY_BAR = 288, SPP_PANCAKE = 290, SPP_LEMBAS_WAFER = 291,
      SPP_LUMP_OF_ROYAL_JELLY = 286, SPP_SACK = 217, SPP_BAG_OF_HOLDING = 219,
      SPP_BAG_OF_TRICKS = 220, SPP_OILSKIN_SACK = 218, SPP_LEASH = 236,
      SPP_STETHOSCOPE = 237, SPP_BLINDFOLD = 233, SPP_TOWEL = 234,
      SPP_TIN_WHISTLE = 245, SPP_MAGIC_WHISTLE = 246, SPP_MAGIC_MARKER = 242,
      SPP_TIN_OPENER = 239, SPP_SKELETON_KEY = 221, SPP_LOCK_PICK = 222,
      SPP_TALLOW_CANDLE = 224, SPP_WAX_CANDLE = 225, SPP_LARGE_BOX = 214;
/* obj.h:288-296 — is_gloves/is_cloak/is_shirt are oclass == ARMOR_CLASS &&
 * objects[otyp].oc_armcat == ARM_*.  js/armor_data.js holds oc_armcat as
 * `armcat`, with ARM_GLOVES 3, ARM_CLOAK 5, ARM_SHIRT 6. */
const SPP_ARM_GLOVES = 3, SPP_ARM_CLOAK = 5, SPP_ARM_SHIRT = 6;
function _spp_armcat(obj, cat) {
    if ((obj.oclass | 0) !== SPP_ARMOR_CLASS)
        return false;
    const row = ARMOR_DATA[obj.otyp | 0];
    return !!row && (row.armcat | 0) === cat;
}
/* obj.h:337 Is_container(o) — otyp in [LARGE_BOX, BAG_OF_TRICKS] */
function _spp_is_container(obj) {
    const typ = obj.otyp | 0;
    return typ >= SPP_LARGE_BOX && typ <= SPP_BAG_OF_TRICKS;
}
/* mondata.h:11 verysmall(ptr) = (ptr->msize < MZ_SMALL) */
function _spp_verysmall(mndx) {
    const msize = (mndx >= 0 && mndx < _MONS_MSIZE_MV.length)
        ? (_MONS_MSIZE_MV[mndx] | 0) : MZ_SMALL_MV;
    return msize < MZ_SMALL_MV;
}
export function stuff_prevents_passage(mtmp) {
    /* C: if (mtmp == &gy.youmonst) chain = gi.invent; else chain = mtmp->minvent; */
    const chain = (mtmp === game.youmonst) ? game.invent : mtmp.minvent;

    for (let obj = chain; obj; obj = obj.nobj) {
        const typ = obj.otyp | 0;

        if (typ === SPP_COIN_CLASS && (obj.quan | 0) > 100)
            return true;
        if ((obj.oclass | 0) !== SPP_GEM_CLASS
            && !(typ >= SPP_ARROW && typ <= SPP_BOOMERANG)
            && !(typ >= SPP_DAGGER && typ <= SPP_CRYSKNIFE) && typ !== SPP_SLING
            && !_spp_armcat(obj, SPP_ARM_CLOAK) && typ !== SPP_FEDORA
            && !_spp_armcat(obj, SPP_ARM_GLOVES)
            && typ !== SPP_LEATHER_JACKET && typ !== SPP_CREDIT_CARD
            && !_spp_armcat(obj, SPP_ARM_SHIRT)
            && !(typ === SPP_CORPSE && _spp_verysmall(obj.corpsenm | 0))
            && typ !== SPP_FORTUNE_COOKIE && typ !== SPP_CANDY_BAR
            && typ !== SPP_PANCAKE && typ !== SPP_LEMBAS_WAFER
            && typ !== SPP_LUMP_OF_ROYAL_JELLY
            && (obj.oclass | 0) !== SPP_AMULET_CLASS
            && (obj.oclass | 0) !== SPP_RING_CLASS
            && (obj.oclass | 0) !== SPP_VENOM_CLASS && typ !== SPP_SACK
            && typ !== SPP_BAG_OF_HOLDING && typ !== SPP_BAG_OF_TRICKS
            && !(typ === SPP_TALLOW_CANDLE || typ === SPP_WAX_CANDLE)
            && typ !== SPP_OILSKIN_SACK && typ !== SPP_LEASH
            && typ !== SPP_STETHOSCOPE && typ !== SPP_BLINDFOLD
            && typ !== SPP_TOWEL
            && typ !== SPP_TIN_WHISTLE && typ !== SPP_MAGIC_WHISTLE
            && typ !== SPP_MAGIC_MARKER && typ !== SPP_TIN_OPENER
            && typ !== SPP_SKELETON_KEY && typ !== SPP_LOCK_PICK)
            return true;
        if (_spp_is_container(obj) && obj.cobj)
            return true;
    }
    return false;
}
/* C ref: monmove.c can_ooze(struct monst *mtmp) — amorphous & unencumbered → can flow under doors.
 *   if (!amorphous(mtmp->data) || stuff_prevents_passage(mtmp)) return FALSE; return TRUE;
 *   amorphous(ptr) = (ptr->mflags1 & M1_AMORPHOUS) != 0L */
export function can_ooze(mtmp) {
    if (!((mtmp.data.mflags1 & M1_AMORPHOUS) !== 0) || stuff_prevents_passage(mtmp))
        return false;
    return true;
}

/* C ref: monmove.c can_fog(struct monst *mtmp) — vampire-shifter fog-form check.
 *   if (!(svm.mvitals[PM_FOG_CLOUD].mvflags & G_GENOD) && is_vampshifter(mtmp)
 *       && !Protection_from_shape_changers && !stuff_prevents_passage(mtmp))
 *       return TRUE; */
const PM_FOG_CLOUD = 106;
const PM_VAMPIRE = 226;
const PM_VAMPIRE_LORD = 227;
const PM_VLAD_THE_IMPALER = 228;
const G_GENOD_MV = 0x02;

/* is_vampshifter: local copy from js/mhitm.js (not exported) */
function is_vampshifter(mon) {
    return mon.cham === PM_VAMPIRE || mon.cham === PM_VAMPIRE_LORD || mon.cham === PM_VLAD_THE_IMPALER;
}

export function can_fog(mtmp) {
    if (!((game.mvitals?.[PM_FOG_CLOUD]?.mvflags | 0) & G_GENOD_MV) && is_vampshifter(mtmp)
        && !false && !stuff_prevents_passage(mtmp))
        return true;
    return false;
}

/* C ref: monmove.c:133 m_can_break_boulder + is_rider (mondata.h:86) */
const MS_LEADER_MCBB = 36;
const PM_DEATH_MCBB = 311, PM_FAMINE_MCBB = 313, PM_PESTILENCE_MCBB = 312;
function is_rider_mcbb(data) {
    if (!data) return false;
    const pmidx = data.pmidx | 0;
    return pmidx === PM_DEATH_MCBB || pmidx === PM_FAMINE_MCBB || pmidx === PM_PESTILENCE_MCBB;
}
export function m_can_break_boulder(mtmp) {
    return is_rider_mcbb(mtmp.data)
        || (!mtmp.mspec_used
            && (mtmp.isshk || mtmp.ispriest || (mtmp.data.msound === MS_LEADER_MCBB)));
}

/* C monmove.c:148-175 m_break_boulder().  The monster path uses the same
 * fracture_rock conversion as the zap path, but does not apply hero-only
 * Sokoban/billing side effects. */
export async function m_break_boulder_mv(mtmp, x, y) {
    const boulder = sobj_at(BOULDER_OTYP_MV, x, y);
    if (!boulder || !m_can_break_boulder(mtmp))
        return false;
    const rider = is_rider_mcbb(mtmp.data);
    if (!rider) {
        const deaf = !!(game.u?.uprops?.[DEAF]?.intrinsic
                     || game.u?.uprops?.[DEAF]?.extrinsic);
        if (!deaf && mdistu(mtmp) < 16) {
            if (canspotmon(mtmp))
                await pline(`${Monnam_dm(mtmp)} mutters ${mtmp.ispriest ? 'a prayer' : 'an incantation'}.`);
        }
        mtmp.mspec_used = (mtmp.mspec_used | 0) + rn1(20, 10);
    }
    if (cansee(x, y))
        await pline('The boulder falls apart.');
    await fracture_rock(boulder);
    return true;
}

/* C ref: monmove.c:1322-1334 m_avoid_kicked_loc — does monster avoid a location
 * the hero just kicked? Returns true if monster is peaceful or tame, can see,
 * not confused/stunned, no Conflict, and the location matches gk.kickedloc
 * and is adjacent to hero (next2u). */
export function m_avoid_kicked_loc(mtmp, nx, ny) {
    const kl = game.kickedloc;
    if (!kl) return false;
    const kx = (kl.x | 0), ky = (kl.y | 0);
    /* isok: x >= 1 && x <= COLNO_MV-1 && y >= 0 && y <= ROWNO_MV-1 */
    const klok = kx >= 1 && kx <= (COLNO_MV - 1) && ky >= 0 && ky <= (ROWNO_MV - 1);

    const u = game.u;
    if (!u) return false;
    const dx = (nx | 0) - (u.ux | 0);
    const dy = (ny | 0) - (u.uy | 0);
    const distu_sq = ((dx * dx) + (dy * dy)) | 0;

    return ((!!(mtmp.mpeaceful | 0)) || (!!(mtmp.mtame | 0)))
        && (!!(mtmp.mcansee | 0))
        && !(mtmp.mconf | 0) && !(mtmp.mstun | 0)
        /* && !Conflict (unmodeled → false) */
        && klok
        && (nx | 0) === kx && (ny | 0) === ky
        && distu_sq <= 2;
}


/* C ref: monflag.h:108 M1_REGEN — monster regenerates hit points */
const M1_REGEN_MON_REGEN = 0x00800000;

/* C ref: mon.c:4585 healmon().  The canonical body lives in mklev.js and is
 * already used by the other healing callers; keep this export as a thin
 * compatibility wrapper for monmove's historical public surface. */
export function healmon(mon, hpmax, hp) {
    return healmon_real(mon, hpmax, hp);
}

/* C ref: dogmove.c:1448-1458 finish_meating().  Share the production body
 * with dogmove/mhitm so mimic appearance cleanup and repainting stay aligned. */
export function finish_meating(mon) {
    return finish_meating_real(mon);
}

/* C ref: monmove.c:307-321 mon_regen — regenerate lost hit points and digest meals.
 * regenerates(ptr) = (ptr->mflags1 & M1_REGEN) != 0 (from mondata.h)
 * No RNG consumed. */
export function mon_regen(mon, digest_meal) {
    /* C monmove.c:310: if (svm.moves % 20 == 0 || regenerates(mon->data)) */
    const regenerates = (mon.data.mflags1 & M1_REGEN_MON_REGEN) !== 0;
    if (((game.moves || 0) % 20) === 0 || regenerates) {
        /* C monmove.c:311: healmon(mon, 1, 0) */
        healmon(mon, 1, 0);
    }

    /* C monmove.c:312-313: if (mon->mspec_used) mon->mspec_used-- */
    if (mon.mspec_used) {
        mon.mspec_used--;
    }

    /* C monmove.c:314-320: if (digest_meal) { if (mon->meating) { ... } } */
    if (digest_meal) {
        if (mon.meating) {
            mon.meating--;
            if (mon.meating <= 0) {
                /* C monmove.c:318: finish_meating(mon) */
                finish_meating(mon);
            }
        }
    }
}


export function m_avoid_soko_push_loc(mtmp, nx, ny) {
    const BOULDER = 475; /* C ref: objects.h BOULDER otyp */

    /* C rm.h:525 #define Sokoban svl.level.flags.sokoban_rules */
    if (!(game.level?.flags?.sokoban_rules ?? game.sokoban)) return false;

    if (!mtmp) return false;
    /* C: (mtmp->mpeaceful || mtmp->mtame) */
    if (!((mtmp.mpeaceful | 0) || (mtmp.mtame | 0))) return false;

    /* C: !mtmp->mconf && !mtmp->mstun */
    if ((mtmp.mconf | 0) || (mtmp.mstun | 0)) return false;

    /* C: && !Conflict (unmodeled → always true) */

    const u = game.u;
    if (!u) return false;

    /* C: dist2(nx, ny, u.ux, u.uy) == 4 (i.e. exactly two squares away) */
    const dx = ((nx | 0) - (u.ux | 0)) | 0;
    const dy = ((ny | 0) - (u.uy | 0)) | 0;
    if ((((dx * dx) + (dy * dy)) | 0) !== 4) return false;

    /* C: sobj_at(BOULDER, nx + sgn(u.ux - nx), ny + sgn(u.uy - ny)) */
    const boulder_x = ((nx | 0) + sgn(((u.ux | 0) - (nx | 0)) | 0)) | 0;
    const boulder_y = ((ny | 0) + sgn(((u.uy | 0) - (ny | 0)) | 0)) | 0;

    return !!sobj_at(BOULDER, boulder_x, boulder_y);
}

function sgn(x) { return x > 0 ? 1 : x < 0 ? -1 : 0; }

// C ref: dogmove.c:146-153 cursed_object_at(x,y) — local copy (matches the
// existing multi-copy convention for small predicates in this codebase, e.g.
// t_at has independent copies in trap.js/eat.js/dokick.js/makemon.js; avoids
// a new export off dogmove.js for a 5-line helper).
function cursed_object_at_mv(x, y) {
    for (let o = game.level?.levelObjects?.[x]?.[y]; o; o = o.nexthere) {
        if (o.cursed) return true;
    }
    return false;
}

// C ref: rm.h is_pool(x,y) — POOL..DRAWBRIDGE_UP inclusive (rm.h enum), same
// range mfndpos_nontame already tests inline (monmove.js:443) and js/mklev.js
// is_pool_mv/js/dokick.js is_pool use; not exported from any of those three,
// so a fourth local copy here for undesirable_disp's use.
function is_pool_mv2(x, y) {
    const loc = game.level?.locations?.[x]?.[y];
    if (!loc) return false;
    const t = loc.typ | 0;
    return t >= POOL_TYP_MV && t <= 19; /* POOL, MOAT, WATER, DRAWBRIDGE_UP */
}

// undesirable_disp — C ref: monmove.c:2301-2336 (window 2292-2336 incl.
// banner comment). should_displace's only non-trivial dependency (keystone
// spec §2.3). RNG: rn2(40) at monmove.c:2311 (pet+seen-trap) and :2318
// (hostile+trap+knows-trap-type) — the two branches are mutually exclusive
export function undesirable_disp(mtmp, x, y) {
    const is_pet = !!(mtmp.mtame | 0) && !(mtmp.isminion | 0);
    const trap = t_at(x, y);

    if (is_pet) {
        if (trap && trap.tseen && rn2(40)) return true;
        if (cursed_object_at_mv(x, y)) return true;
    } else if (trap && rn2(40) && mon_knows_traps(mtmp, trap.ttyp | 0)) {
        return true;
    }
    if (!accessible(x, y)
        && !(is_pool_mv2(x, y) && is_pool_mv2(mtmp.mx | 0, mtmp.my | 0)))
        return true;
    return false;
}

// should_displace — ported from monmove.c:1088-1129
// Returns true if mtmp should displace a monster at the target position
export function should_displace(mtmp, data, ggx, ggy) {
    let shortest_with_displacing = -1;
    let shortest_without_displacing = -1;
    let count_without_displacing = 0;

    for (let i = 0; i < data.cnt; i++) {
        const nx = data.poss[i].x;
        const ny = data.poss[i].y;
        const ndist = dist2(nx, ny, ggx, ggy);

        // C mon.c MON_AT(nx,ny): real game.fmon scan (was hardcoded false —
        // FIXTURE only, where game.fmon is never populated; in live play
        // game.fmon IS populated, so hardcoding false here made should_displace
        // a permanent no-op once wired into dog_move/m_move, defeating the
        // wiring's purpose. mtmp2 itself is unused by should_displace (the C
        // only needs MON_AT's truth value here, unlike mfndpos's mm_aggression
        // branch), so a boolean-returning scan is enough — no m_at import churn.
        let monAt = false;
        for (let m = game.fmon; m; m = m.nmon) {
            if (m !== mtmp && (m.mhp | 0) > 0 && (m.mx | 0) === nx && (m.my | 0) === ny) {
                monAt = true;
                break;
            }
        }
        if (monAt && (data.info[i] & ALLOW_MDISP_MV) && !(data.info[i] & ALLOW_M_MV)
            && !undesirable_disp(mtmp, nx, ny)) {
            if (shortest_with_displacing === -1
                || (ndist < shortest_with_displacing))
                shortest_with_displacing = ndist;
        } else {
            if ((shortest_without_displacing === -1)
                || (ndist < shortest_without_displacing))
                shortest_without_displacing = ndist;
            count_without_displacing++;
        }
    }

    if (shortest_with_displacing > -1
        && (shortest_with_displacing < shortest_without_displacing
            || !count_without_displacing))
        return true;
    return false;
}

// C ref: monmove.c:1133-1162 m_digweapon_check(mtmp, nix, niy)
// boolean m_digweapon_check(struct monst *mtmp, coordxy nix, coordxy niy) {
//   boolean can_tunnel = FALSE;
//   struct obj *mw_tmp = MON_WEP(mtmp);
//   if (!Is_rogue_level(&u.uz))
//       can_tunnel = tunnels(mtmp->data);
//   if (can_tunnel && needspick(mtmp->data) && !mwelded(mw_tmp)
//       && (may_dig(nix, niy) || closed_door(nix, niy))) {
//       if (closed_door(nix, niy)) {
//           if (!mw_tmp || !is_pick(mw_tmp) || !is_axe(mw_tmp))
//               mtmp->weapon_check = NEED_PICK_OR_AXE;
//       } else if (IS_TREE(levl[nix][niy].typ)) {
//           if (!mw_tmp || !is_axe(mw_tmp))
//               mtmp->weapon_check = NEED_AXE;
//       } else if (IS_STWALL(levl[nix][niy].typ)) {
//           if (!mw_tmp || !is_pick(mw_tmp))
//               mtmp->weapon_check = NEED_PICK_AXE;
//       }
//       if (mtmp->weapon_check >= NEED_PICK_AXE && mon_wield_item(mtmp))
//           return TRUE;
//   }
//   return FALSE;
// }
export async function m_digweapon_check(mtmp, nix, niy) {
    // mw_tmp (MON_WEP(mtmp), a pure pointer read with no side effects) is
    // read lazily here rather than unconditionally at function entry like
    // the C source — behaviorally identical (C's eager read has no visible
    // effect before its first use below), and avoids touching mtmp.mw on
    // the can_tunnel===false / needspick===false paths where C never uses it.
    let can_tunnel = false;

    if (!Is_rogue_level(game.u.uz))
        can_tunnel = ((mtmp.data.mflags1 | 0) & M1_TUNNEL_MDW) !== 0;

    if (can_tunnel && ((mtmp.data.mflags1 | 0) & M1_NEEDPICK_MDW) !== 0) {
        const mw_tmp = mtmp.mw;
        if (!mwelded(mw_tmp)
            && (may_dig(nix, niy) || closed_door(nix, niy))) {
            const typ = game.level?.locations?.[nix]?.[niy]?.typ;
            if (closed_door(nix, niy)) {
                if (!mw_tmp || !is_pick(mw_tmp) || !((mw_tmp.otyp | 0) === AXE_MDW))
                    mtmp.weapon_check = NEED_PICK_OR_AXE;
            } else if (IS_TREE(typ)) {
                if (!mw_tmp || !((mw_tmp.otyp | 0) === AXE_MDW))
                    mtmp.weapon_check = NEED_AXE;
            } else if (IS_STWALL(typ)) {
                if (!mw_tmp || !is_pick(mw_tmp))
                    mtmp.weapon_check = NEED_PICK_AXE;
            }
            if ((mtmp.weapon_check | 0) >= NEED_PICK_AXE && await mon_wield_item(mtmp))
                return true;
        }
    }
    return false;
}

/* check whether a monster is carrying a locking/unlocking tool */
/* C ref: monmove.c:96-105 */
export function monhaskey(mon, for_unlocking) {
    if (for_unlocking && m_carrying(mon, CREDIT_CARD))
        return true;
    return !!(m_carrying(mon, SKELETON_KEY) || m_carrying(mon, LOCK_PICK));
}
