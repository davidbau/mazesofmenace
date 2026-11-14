// @ts-nocheck
// dochug.js — Monster turn-action dispatch.
// C ref: nethack-c/src/monmove.c:712-960 dochug(struct monst *mtmp).
// L15: wired m_move for tame pets (dog_move path).
// @ts-nocheck — js sibling imports.
import monsPack from './makemon_mons.json' with { type: 'json' };
import { pushRngLogEntry } from './rng.js';
import { rn2 } from './rnd.js';
import { game } from './gstate.js';
// monmove.js is landed, so import its monster-movement dispatch statically.
// (Was a top-level `await import('./monmove.js')` with stub fallback from when
// monmove.js didn't exist yet — but a dynamic-import-into-a-variable is opaque
// to the static wire-graph, which therefore mis-classified m_move/dog_move/
// distfleeck and their PM_* imports as dead. Static import = same runtime
// binding (RNG-identical), but the call edge dochug→m_move→dog_move is now
// statically visible. No circular dep: monmove/dogmove do not import dochug.)
import { distfleeck, set_apparxy, m_move, mind_blast, mon_yells, mon_eat_before_move } from './monmove.js';
import { worm_hitu_segs } from './worm.js';
import { mattacku, noattacks_mndx, mon_mattk_raw, ranged_attk_available, expels_gu } from './mhitu.js';
import { monflee_release_hero } from './makemon.js';
import { find_offensive, find_defensive, find_misc, use_misc, use_defensive } from './muse.js';
import { Upolyd, engulfing_u, CONFLICT, INVIS as INVIS_DH, NEED_WEAPON, NEED_HTH_WEAPON } from './const.js';
import { mon_wield_item, select_rwep } from './weapon.js';
import { is_pick, watch_dig } from './dig.js';
import { mdrop_obj_md } from './mklev.js';
import { wipe_engr_at } from './engrave.js';
import { wake_msg, angry_guards } from './mon.js';
import { STEALTH as STEALTH_DH, AGGRAVATE_MONSTER as AGGRAVATE_MONSTER_DH } from './const.js';
import { PM_ETTIN as PM_ETTIN_DH, PM_JABBERWOCK as PM_JABBERWOCK_DH } from './pm.generated.js';
import { castmu } from './mcastu.js';
import { cuss } from './wizard.js';
import { pending_death_is_final } from './end.js';
import { drain_pending_death_in_place } from './fastforward.js';
import { couldsee, cansee } from './vision.js';
import { newsym, impossible_sync } from './display.js';
import { On_W_tower_level } from './dungeon.js';
import { HALLUC as HALLUC_DH, HALLUC_RES as HALLUC_RES_DH } from './const.js';

import { permonstTemplate } from './makemon.js';
import { monnear } from './mon.js';
import { resist_conflict } from './mondata.js';
/* C monmove.c:744-750 flee-teleport + monmove.c:1153 leppie_stash. */
import { findgold } from './steal.js';
import { noteleport_level } from './teleport.js';
import { rloc } from './teleport.js';
import { RLOC_MSG, SHOPBASE, ROOM } from './const.js';
import { in_rooms } from './hack.js';
import { t_at } from './trap.js';
import { PM_LEPRECHAUN as PM_LEPRECHAUN_DH } from './pm.generated.js';
/* watch_on_duty (monmove.c:176) — the Minetown Watch. */
import { PM_WATCHMAN as PM_WATCHMAN_DH,
         PM_WATCH_CAPTAIN as PM_WATCH_CAPTAIN_DH } from './pm.generated.js';
import { pooleffects_grounded } from './cmd.js';
import { in_town, disturb_buried_zombies } from './hack.js';
import { g_at } from './invent.js';
import { picking_lock } from './lock.js';
import { is_digging, bury_an_obj } from './dig.js';
import { IS_DOOR, D_LOCKED, D_WARNED } from './const.js';
import { stop_occupation } from './allmain.js';
/* C wizard.c tactics()/strategy() + mon.c mnexto()/mnearto() — see the block
 * at the foot of this file.  All of these are existing exports; none is new. */
import { rnd } from './rnd.js';
import { STRAT_NONE, STRAT_HEAL, STRAT_GROUND, STRAT_MONSTR, STRAT_PLAYER,
         STRAT_STRATMASK, STRAT_GOAL, STRAT_APPEARMSG,
         BOLT_LIM, isok, u_at }
    from './const.js';
import { rloc_to, rloc_to_flag } from './teleport.js';
import { mnexto, mnearto } from './mon.js';
import { m_at } from './uhitm.js';
import { inhishop } from './shk.js';
import { inhistemple } from './priest.js';
import { quest_stat_check } from './quest.js';
import { builds_up } from './dungeon.js';
import { within_bounded_area } from './rect.js';
import { dist2 } from './hacklib.js';
import { unstuck } from './mon.js';
import { mon_has_amulet } from './sit.js';
import { mpickobj } from './steal.js';
import { healmon, m_respond } from './mon.js';
import { obj_extract_floor, distant_obj_name, Monnam_dm } from './dogmove.js';
import { Deaf as Deaf_live_dc } from './display.js';
import { pline } from './pline.js';
import { demon_talk } from './minion.js';
import { is_demon, set_malign } from './makemon.js';
import { tele_restrict } from './teleport.js';
import { canseemon } from './display.js';
import { Amonnam } from './do_name.js';
import { set_msg_xy } from './pline.js';
import { ENV } from './hostenv.js';
export { dochug, leppie_stash } from './monmove.js'; // relocate-fns
/* C mondata.h:81 perceives(ptr) — (ptr)->mflags1 & M1_SEE_INVIS. */
const M1_SEE_INVIS = 0x01000000;
/* C vision.h:50-53 m_canseeu(m) —
 *   (!Invis || perceives(m->data)) && !Underwater && couldsee(m->mx, m->my)
 * Invis = (HInvis || EInvis) && !BInvis (youprop.h:198);
 * Underwater = u.uinwater (youprop.h:279).
 * Same body as the js/mhitm.js:171 copy. */
export function m_canseeu(mtmp) {
    const u = game.u;
    if (!u)
        return false;
    const invisProp = u.uprops?.[INVIS_DH];
    const Invis = !!(invisProp && (invisProp.intrinsic || invisProp.extrinsic)
        && !(invisProp.blocked | 0));
    const ptr = permonstTemplate((mtmp.mnum ?? mtmp.mndx ?? 0) | 0);
    const perceives = !!(((ptr && ptr.mflags1) || 0) & M1_SEE_INVIS);
    return (!Invis || perceives) && !u.uinwater
        && !!couldsee(mtmp.mx | 0, mtmp.my | 0);
}




/* enexto() / mnexto() / mnearto() / deal_with_overcrowding() now live in
 * js/teleport.js, next to enexto_core and rloc_to_flag, and are imported above:
 * js/shk.js kept an EMPTY mnexto and a gap-ridden module-local mnearto for the
 * same C functions, and one body each beats a third copy here. */

export function In_W_tower_wz(x, y, lev) {
    if (!On_W_tower_level(lev))
        return false;
    const dn = game.dndest;
    if (!dn || !(dn.nlx | 0)) {
        impossible_sync("No boundary for Wizard's Tower?");
        return false;
    }
    return within_bounded_area(x, y, dn.nlx | 0, dn.nly | 0,
                               dn.nhx | 0, dn.nhy | 0);
}
/* C priest.c inhistemple / mon.c expels — see the call sites above. */
