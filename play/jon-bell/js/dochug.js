// @ts-nocheck
// dochug.js — Monster turn-action dispatch.
// C ref: nethack-c/src/monmove.c:712-960 dochug(struct monst *mtmp).
// L15: wired m_move for tame pets (dog_move path).
// @ts-nocheck — js sibling imports.
import monsPack from './makemon_mons.json' with { type: 'json' };
import { rn2, pushRngLogEntry } from './rng.js';
import { game } from './gstate.js';
// monmove.js is landed, so import its monster-movement dispatch statically.
// (Was a top-level `await import('./monmove.js')` with stub fallback from when
// monmove.js didn't exist yet — but a dynamic-import-into-a-variable is opaque
// to the static wire-graph, which therefore mis-classified m_move/dog_move/
// distfleeck and their PM_* imports as dead. Static import = same runtime
// binding (RNG-identical), but the call edge dochug→m_move→dog_move is now
// statically visible. No circular dep: monmove/dogmove do not import dochug.)
import { distfleeck, set_apparxy, m_move, mind_blast } from './monmove.js';
import { worm_hitu_segs } from './worm.js';
import { mattacku, noattacks_mndx, mon_mattk_raw, ranged_attk_available, expels_gu } from './mhitu.js';
import { find_offensive, find_defensive, find_misc, use_misc, use_defensive, monflee_release_hero } from './makemon.js';
import { Upolyd, engulfing_u, CONFLICT, INVIS as INVIS_DH, NEED_WEAPON, NEED_HTH_WEAPON } from './const.js';
import { mon_wield_item, select_rwep } from './uhitm.js';
import { is_pick, watch_dig } from './dig.js';
import { wipe_engr_at, wake_msg, angry_guards, mdrop_obj_md } from './mklev.js';
import { STEALTH as STEALTH_DH, AGGRAVATE_MONSTER as AGGRAVATE_MONSTER_DH } from './const.js';
import { PM_ETTIN as PM_ETTIN_DH, PM_JABBERWOCK as PM_JABBERWOCK_DH } from './pm.generated.js';
import { castmu, cuss } from './mcastu.js';
import { couldsee, cansee } from './vision.js';
import { newsym } from './display.js';
import { HALLUC as HALLUC_DH, HALLUC_RES as HALLUC_RES_DH } from './const.js';
/* C youprop.h:120 Hallucination = (HHallucination && !Halluc_resistance),
 * Halluc_resistance = (HHalluc_resistance || EHalluc_resistance) — the same
 * live uprops expression js/display.js:_hallucinating_dsp() uses.  NOT
 * `game.Hallucination`, which has no writer anywhere in js/. */
function _hallucinating_dh() {
    const up = game.u?.uprops;
    if (!up) return false;
    const hp = up[HALLUC_DH], hrp = up[HALLUC_RES_DH];
    if (!hp || !(hp.intrinsic | 0)) return false;
    return !(hrp && ((hrp.intrinsic | 0) || (hrp.extrinsic | 0)));
}

/* C monst.h:255 `mon_offmap(mon)`: migrated and detached monsters are no
 * longer valid targets for the post-move distance calculation.  In particular,
 * use_defensive() may take a monster through stairs from m_move()'s cnt==0
 * arm.  C returns from dochug() before the recalc in that case. */
function mon_offmap_dh(mtmp) {
    return !mtmp || (mtmp.mstate | 0) !== 0;
}
import { permonstTemplate, monnear } from './makemon.js';
import { resist_conflict } from './mhitm.js';
/* C monmove.c:744-750 flee-teleport + monmove.c:1153 leppie_stash. */
import { noteleport_level, findgold } from './makemon.js';
import { rloc } from './teleport.js';
import { RLOC_MSG, SHOPBASE, ROOM } from './const.js';
import { in_rooms } from './shk.js';
import { t_at } from './trap.js';
import { PM_LEPRECHAUN as PM_LEPRECHAUN_DH } from './pm.generated.js';
/* watch_on_duty (monmove.c:176) — the Minetown Watch. */
import { PM_WATCHMAN as PM_WATCHMAN_DH,
         PM_WATCH_CAPTAIN as PM_WATCH_CAPTAIN_DH } from './pm.generated.js';
import { in_town, g_at, disturb_buried_zombies, pooleffects_grounded } from './cmd.js';
import { picking_lock } from './lock.js';
import { is_digging, bury_an_obj } from './dig.js';
import { IS_DOOR, D_LOCKED, D_WARNED } from './const.js';
import { stop_occupation } from './allmain.js';
/* C wizard.c tactics()/strategy() + mon.c mnexto()/mnearto() — see the block
 * at the foot of this file.  All of these are existing exports; none is new. */
import { rnd } from './rng.js';
import { STRAT_NONE, STRAT_HEAL, STRAT_GROUND, STRAT_MONSTR, STRAT_PLAYER,
         STRAT_STRATMASK, STRAT_GOAL, STRAT_APPEARMSG,
         BOLT_LIM, isok, u_at }
    from './const.js';
import { rloc_to, rloc_to_flag, mnexto, mnearto } from './teleport.js';
import { m_at } from './uhitm.js';
import { inhishop } from './shk.js';
import { inhistemple } from './priest.js';
import { quest_stat_check } from './quest.js';
import { builds_up } from './dungeon.js';
import { within_bounded_area } from './rect.js';
import { dist2 } from './hacklib.js';
import { mon_has_amulet } from './sit.js';
import { healmon, mpickobj, m_respond } from './mklev.js';
const DEADMONSTER_dc = (m) => (m.mhp | 0) <= 0;
import { obj_extract_floor, distant_obj_name, Monnam_dm } from './dogmove.js';
import { pline } from './display.js';
import { ENV } from './hostenv.js';
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
/* C mondata.h:82 can_teleport(ptr) — ((ptr)->mflags1 & M1_TPORT) != 0L.
 * monflag.h:110 M1_TPORT = 0x02000000. */
const M1_TPORT = 0x02000000;
function can_teleport_dh(mtmp) {
    const ptr = mtmp.data || permonstTemplate((mtmp.mnum ?? mtmp.mndx ?? 0) | 0);
    return !!(((ptr && ptr.mflags1) | 0) & M1_TPORT);
}
/* C noteleport_level(mtmp) — js/makemon.js's port reads mon.data, which a live
 * monst may not carry; same resolution js/monmove.js:517 _noteleport_level_mv
 * already uses. */
function _noteleport_level_dh(mtmp) {
    const mndx = (mtmp.mnum ?? mtmp.mndx ?? 0) | 0;
    return !!noteleport_level(mtmp.data ? mtmp
                              : { ...mtmp, data: permonstTemplate(mndx) });
}
/* C monmove.c:1187 leppie_stash: after teleporting away, a
 * leprechaun which cannot see the hero can drop and bury its gold. */
export async function leppie_stash(mtmp) {
    const lvl = game.level;
    if (!lvl)
        return;
    const mndx = (mtmp.mnum ?? mtmp.mndx ?? 0) | 0;
    if (mndx !== PM_LEPRECHAUN_DH)
        return;
    if ((mtmp.mhp | 0) < 1)       /* DEADMONSTER(mtmp) */
        return;
    if (m_canseeu(mtmp))
        return;
    if (in_rooms(mtmp.mx | 0, mtmp.my | 0, SHOPBASE).length)
        return;
    if ((lvl.at(mtmp.mx | 0, mtmp.my | 0)?.typ | 0) !== ROOM)
        return;
    if (t_at(mtmp.mx | 0, mtmp.my | 0))
        return;
    if (!rn2(4))
        return;
    const carriedGold = findgold(mtmp.minvent);
    if (!carriedGold)
        return;
    await mdrop_obj_md(mtmp, carriedGold, false);
    const floorGold = g_at(mtmp.mx, mtmp.my);
    if (floorGold)
        await bury_an_obj(floorGold, null);
}
/* C macro Conflict (hack.h) — the hero's conflict property, read exactly as
 * js/monmove.js:494 _conflict_mv() reads it. */
function _conflict_dch() {
    const p = game.u?.uprops?.[CONFLICT];
    return !!(p && (p.intrinsic || p.extrinsic));
}
/* C defsym.h MONSYM indices for mlet comparisons. */
const S_LEPRECHAUN = 12; /* MONSYM(12, 'l', LEPRECHAUN, ...) */
/* C monflag.h mflags2 bits. */
const M2_WANDER = 0x00800000; /* is_wanderer — wanders randomly */
/* C monst.h STRAT_* strategy flags.  (STRAT_NONE/HEAL/GROUND/MONSTR/PLAYER/
 * STRATMASK/GOAL/APPEARMSG come from const.js, imported above.) */
const STRAT_ARRIVE = 0x40000000;
const STRAT_WAITFORU = 0x20000000;
const STRAT_CLOSE = 0x10000000;
const STRAT_WAITMASK = (STRAT_CLOSE | STRAT_WAITFORU);
/* MONS row layout (from makemon_mons.json), 10 fields wide, per
 * js/makemon.js:1199 permonstTemplate(): [0]=mlet, [5]=mresists,
 * [6]=mflags1, [7]=mflags2, [8]=mflags3.  The mattk[] array is NOT in this
 * table at all — it lives in js/mhitu.js MON_MATTK, read via mon_mattk_raw(). */
const MONS = /** @type {number[][]} */ (monsPack.mons);
/* C monattk.h attack/damage-type constants.  These are compared against the
 * RAW C-numbered mattk rows returned by mon_mattk_raw(), so they must carry
 * C's numbering, not any JS-local renumbering. */
const AT_WEAP = 254;   /* C monattk.h:28 — uses weapon */
const AT_MAGC = 255;   /* C monattk.h:29 — uses magic spell(s) */
const AD_CLRC = 240;   /* C monattk.h:87 — random clerical spell */
const AD_SPEL = 241;   /* C monattk.h:88 — random magic spell */
/* C monattk.h:12 AT_NONE — terminates the active attack series. */
const AT_NONE = 0;
/* C mhitu.h return value. */
const M_ATTK_HIT = 0x01;
/* C permonst.h:48 — number of attack slots per monster. */
const NATTK = 6;
/** C mondata.h is_wanderer(ptr) — (ptr->mflags2 & M2_WANDER) != 0 */
function is_wanderer_mndx(mndx) {
    return mndx >= 0 && mndx < MONS.length && (MONS[mndx][7] & M2_WANDER) !== 0;
}
/** C mondata.c:130 attacktype(ptr, atyp) — does this species have an atyp
 *  attack?  attacktype_fordmg(ptr, atyp, AD_ANY), i.e. the aatyp test alone.
 *  Reads the RAW C-numbered rows from mon_mattk_raw(), same as the AT_MAGC
 *  scan above. */
function attacktype_mndx(mndx, atyp) {
    const attks = mon_mattk_raw(mndx);
    if (!attks) return false;
    for (let i = 0; i < NATTK; i++) {
        const a = (i < attks.length) ? attks[i] : null;
        if (a && (a[0] | 0) === atyp) return true;
    }
    return false;
}
/** C mondata.h is_mind_flayer(ptr) — PM_MIND_FLAYER or PM_MASTER_MIND_FLAYER */
const PM_MIND_FLAYER = 48;
const PM_MASTER_MIND_FLAYER = 49;
function is_mind_flayer_mndx(mndx) {
    return mndx === PM_MIND_FLAYER || mndx === PM_MASTER_MIND_FLAYER;
}
/* distfleeck / set_apparxy / m_move are now statically imported from
 * monmove.js at the top of this file (the prior top-level dynamic import +
 * stub fallback predated monmove.js landing and hid the call graph from the
 * static wire-graph). */
/* C mondata.h is_watch(ptr) — the Minetown Watch: a watchman or a watch
 * captain.  (C spells it as two mons[] pointer comparisons.) */
function is_watch_mndx(mndx) {
    return mndx === PM_WATCHMAN_DH || mndx === PM_WATCH_CAPTAIN_DH;
}
/* C ref: monmove.c:175-199 watch_on_duty(mtmp).
 *
 * The rn2(3) is the point: C rolls it on EVERY dochug of a peaceful, sighted
 * watchman who can see the hero and whose next step is in town, whether or not
 * the hero is doing anything wrong.  Both arms behind it are named, not faked:
 * the lock-picking arm's second offence and watch_dig()'s both end in
 * angry_guards(), which is a throwing stub in js/dokick.js, and watch_dig()
 * (dig.c) has no js/ body at all. */
async function watch_on_duty(mtmp) {
    const g = game;
    const u = g.u || {};
    if (!(mtmp.mpeaceful | 0))
        return;
    if (!in_town(((u.ux | 0) + (u.dx | 0)) | 0, ((u.uy | 0) + (u.dy | 0)) | 0))
        return;
    if (!(mtmp.mcansee | 0) || !m_canseeu(mtmp))
        return;
    if (rn2(3))
        return;
    const px = { value: 0 }, py = { value: 0 };
    if (picking_lock(px, py)) {
        const loc = g.level?.at(px.value, py.value);
        if (loc && IS_DOOR(loc.typ | 0) && ((loc.doormask | 0) & D_LOCKED)) {
            if (couldsee(mtmp.mx | 0, mtmp.my | 0)) {
                /* C monmove.c:184-192 — warn once, then arrest on a repeated
                 * attempt.  D_WARNED lives on the door's looted flags. */
                if ((loc.looted | 0) & D_WARNED) {
                    await pline('Halt, thief! You\'re under arrest!');
                    await angry_guards(false);
                } else {
                    await pline('Hey, stop picking that lock!');
                    loc.looted = (loc.looted | 0) | D_WARNED;
                }
                await stop_occupation();
            }
        }
    } else if (is_digging()) {
        /* C monmove.c:194-197 — watch_dig(mtmp, digging.pos, FALSE). */
        const pos = g.context?.digging?.pos || { x: u.ux | 0, y: u.uy | 0 };
        await watch_dig(mtmp, pos.x | 0, pos.y | 0, false);
    }
}
function m_arrival(mon) {
    mon.mstrategy &= ~STRAT_ARRIVE;
    return -1;
}

export async function dochug(mtmp) {
    if (typeof process !== 'undefined' && ENV?.FF_DH_TRACE)
        pushRngLogEntry(`^dh_enter[id=${mtmp?.m_id ?? 0} mndx=${mtmp?.mndx ?? mtmp?.mnum ?? -1} xy=${mtmp?.mx ?? 0},${mtmp?.my ?? 0} can=${mtmp?.mcanmove ?? 0} sleep=${mtmp?.msleeping ?? 0} strat=${mtmp?.mstrategy ?? 0}]`);
    if (!mtmp)
        return 0;
    /* C monmove.c:726 — STRAT_ARRIVE branch (calls m_arrival, may return). */
    if (mtmp.mstrategy & STRAT_ARRIVE) {
        const res = m_arrival(mtmp);
        if (res >= 0)
            return res;
    }
    if (((mtmp.mstrategy | 0) & STRAT_WAITFORU)
        && (m_canseeu(mtmp) || (mtmp.mhp | 0) < (mtmp.mhpmax | 0))) {
        mtmp.mstrategy = ((mtmp.mstrategy | 0) & ~STRAT_WAITFORU) >>> 0;
    }
    /* C monmove.c:737 — quest_stat_check(mtmp) (quest.c:514). */
    quest_stat_check(mtmp);
    if (!(mtmp.mcanmove | 0) || ((mtmp.mstrategy | 0) & STRAT_WAITMASK)) {
        if (_hallucinating_dh())
            newsym(mtmp.mx | 0, mtmp.my | 0);
        if ((mtmp.mcanmove | 0) && ((mtmp.mstrategy | 0) & STRAT_CLOSE)
            && !(mtmp.msleeping | 0)
            && monnear(mtmp, game.u?.ux | 0, game.u?.uy | 0))
            await _quest_talk_dh(mtmp);
        return 0;
    }
    if ((mtmp.msleeping | 0) && !disturb_dh(mtmp)) {
        if (_hallucinating_dh())
            newsym(mtmp.mx | 0, mtmp.my | 0);
        return 0;
    }
    /* C monmove.c:755 — not frozen or sleeping: wipe out texts written in the
     * dust at the monster's square.  wipe_engr_at(mx, my, 1, FALSE); for a
     * non-DUST/non-BLOOD engraving this fires rn2(1 + 50/(cnt+1)) = rn2(26). */
    wipe_engr_at(mtmp.mx | 0, mtmp.my | 0, 1, false);
    /* C monmove.c:759 — confused monsters get unconfused with small probability. */
    if (mtmp.mconf | 0) {
        if (!rn2(50))
            mtmp.mconf = 0;
    }
    /* C monmove.c:763 — stunned monsters get un-stunned with larger probability. */
    if (mtmp.mstun | 0) {
        if (!rn2(10))
            mtmp.mstun = 0;
    }
    if ((mtmp.mflee | 0) && !rn2(40) && can_teleport_dh(mtmp)
        && !(mtmp.iswiz | 0) && !_noteleport_level_dh(mtmp)) {
        if (await rloc(mtmp, RLOC_MSG))
            await leppie_stash(mtmp);
        return 0;
    }
    /* C monmove.c:752-755 — some monsters have special abilities;
     * m_respond gaze can kill medusa. */
    await m_respond(mtmp);
    if (DEADMONSTER_dc(mtmp))
        return 1;
    /* C monmove.c:781 — fleeing monsters might regain courage. */
    if ((mtmp.mflee | 0) && !(mtmp.mfleetim | 0) && mtmp.mhp === mtmp.mhpmax) {
        if (!rn2(25))
            mtmp.mflee = 0;
    }
    /* C monmove.c:763-767 — cease conflict-induced swallow/grab if conflict
     * has ended.  Releasing the hero uses up the monster's turn. */
    {
        const us = game.u && game.u.ustuck;
        if (us && (us === mtmp || (us.m_id != null && us.m_id === mtmp.m_id))
            && (mtmp.mpeaceful | 0) && !(mtmp.mconf | 0) && !_conflict_dch()) {
            await monflee_release_hero(mtmp);
            return 0;
        }
    }
    /*
     * PHASE TWO: Special Movements and Actions
     */
    /* C monmove.c:800 — set_apparxy(mtmp) before distfleeck. */
    set_apparxy(mtmp);
    /* C monmove.c:781-788 — "Monsters that want to acquire things may teleport,
     * so do it before inrange is set.  This costs a turn only if mstate is
     * set."
     *     if (is_covetous(mdat)) {
     *         (void) tactics(mtmp);
     *         if (mtmp->mstate) return 0;
     *         set_apparxy(mtmp);
     *     }
     * The comment this replaces read "L14: is_covetous / tactics not ported;
     * skip" — and tactics() DRAWS rn2(5) (wizard.c:413) for every covetous
     * monster on STRAT_NONE, so skipping it ran the stream one call ahead of
     * C's from the first covetous monster onward. */
    if (is_covetous_wz(mtmp.data)) {
        await tactics_wz(mtmp);
        /* tactics -> mnexto -> deal_with_overcrowding */
        if (mtmp.mstate | 0)
            return 0;
        set_apparxy(mtmp);
    }
    /* C monmove.c:813 — distfleeck(mtmp, &inrange, &nearby, &scared).
     * Always fires rn2(5) for bravegremlin. */
    let { inrange, nearby, scared } = distfleeck(mtmp);
    if (typeof process !== 'undefined' && ENV?.FF_DH_TRACE)
        pushRngLogEntry(`^dh_pre[id=${mtmp?.m_id ?? 0} moved=${inrange}/${nearby}/${scared}]`);
    if (find_defensive(mtmp, false)) {
        if ((await use_defensive(mtmp)) !== 0)
            return 1;
    } else if (find_misc(mtmp)) {
        if (await use_misc(mtmp) !== 0)
            return 1;
    }
    /* C monmove.c:825-851 — Demonic Blackmail. L14: not ported; skip. */
    const mndx = (mtmp.mndx ?? mtmp.mnum ?? 0) | 0;
    if (is_watch_mndx(mndx)) {
        await watch_on_duty(mtmp);
    } else if (is_mind_flayer_mndx(mndx) && !rn2(20)) {
        /* C monmove.c:853-855 — mind_blast(mtmp), then recompute apparent target/flags. */
        await mind_blast(mtmp);
        set_apparxy(mtmp);
        ({ inrange, nearby, scared } = distfleeck(mtmp));
    }
    {
        /* C monmove.c:843 attacktype(mdat, AT_WEAP) — same mattk walk the
         * PHASE-FOUR ranged test at line 441 already uses. */
        const hasWeapAttk = attacktype_mndx(mndx, AT_WEAP);
        const dmx = (mtmp.mx | 0) - (mtmp.mux | 0);
        const dmy = (mtmp.my | 0) - (mtmp.muy | 0);
        if ((!(mtmp.mpeaceful | 0) || _conflict_dch()) && inrange
            && (dmx * dmx + dmy * dmy) <= 8 && hasWeapAttk) {
            /* C monmove.c:846: mw_tmp = MON_WEP(mtmp) — monst.h's mw slot. */
            const mw_tmp = mtmp.mw || null;
            /* "The scared check is necessary.  Otherwise a monster that is one
             * square near the player but fleeing into a wall would keep
             * switching between pick-axe and weapon.  If monster is stuck in a
             * trap, prefer ranged weapon (wielding is done in thrwmu)." */
            if (!(scared && mw_tmp && is_pick(mw_tmp))
                && (mtmp.weapon_check | 0) === NEED_WEAPON
                && !((mtmp.mtrapped | 0) && !nearby && await select_rwep(mtmp))) {
                mtmp.weapon_check = NEED_HTH_WEAPON;
                if (await mon_wield_item(mtmp) !== 0)
                    return 0;
            }
        }
    }
    const mlet = (mndx >= 0 && mndx < MONS.length && MONS[mndx][0]) | 0;
    /*
     * C monmove.c:904-909 big condition with embedded RNG calls (short-circuit).
     * C evaluates the condition left-to-right with short-circuit; RNG calls inside
     * are only fired when the condition has not yet been determined.
     *
     * earlyTrue: condition is TRUE before any RNG — mirrors the first five elements:
     *   !nearby || mflee || scared || mconf || mstun
     * When earlyTrue, C skips the embedded RNG calls entirely.
     *
     * Note: mpeaceful (tame pets) is the LAST element; tame+nearby+no-flee still
     * reaches the RNG terms, but earlyTrue=true for tame+!nearby (short-circuits).
     */
    const earlyTrue = !(nearby) || !!(mtmp.mflee | 0) || !!(scared)
        || !!(mtmp.mconf | 0) || !!(mtmp.mstun | 0);
    let condTrue = earlyTrue;
    if (!earlyTrue) {
        /* C monmove.c:905 — (mtmp->minvis && !rn2(3)) */
        if ((mtmp.minvis | 0) && !rn2(3)) condTrue = true;
        /* C monmove.c:913: a nearby leprechaun prefers movement when
         * the hero has no gold and it has gold (or wins the random choice).
         * Preserve short-circuit order: either inventory can suppress rn2. */
        if (!condTrue && mlet === S_LEPRECHAUN && !findgold(game.invent)) {
            if (findgold(mtmp.minvent) || rn2(2)) condTrue = true;
        }
        if (!condTrue && is_wanderer_mndx(mndx)) {
            if (!rn2(4)) condTrue = true;
        }
        if (!condTrue && _conflict_dch() && !(mtmp.iswiz | 0))
            condTrue = true;
        /* C monmove.c:909 — (!mtmp->mcansee && !rn2(4)) */
        if (!condTrue && !(mtmp.mcansee | 0)) {
            if (!rn2(4)) condTrue = true;
        }
        /* C monmove.c:909 — mtmp->mpeaceful (tame or peaceful monsters) */
        if (!condTrue && (mtmp.mpeaceful | 0)) condTrue = true;
    }
    /*
     * C monmove.c:904-909 — movement block entered when condTrue.
     * Tame pets: always enter (mpeaceful=1 or !nearby or other flags).
     * Non-tame: enter when condTrue (not nearby, fleeing, etc.).
     *
     * C monmove.c:932-934: m_move(mtmp, 0)
     * C monmove.c:940-941: if (status != MMOVE_DIED) distfleeck(recalc)
     */
    /* C monmove.c:715 — status starts at MMOVE_NOTHING (0). */
    const MMOVE_NOTHING = 0;
    const MMOVE_MOVED = 1;
    const MMOVE_DIED = 2;
    const MMOVE_DONE = 3;
    const MMOVE_NOMOVES = 4;
    let status = MMOVE_NOTHING;
    let panicattk = false;
    let moved = false; /* tracks whether the movement block ran */
    /* The post-movement inrange/scared used by PHASE FOUR — initialized from
     * the pre-movement distfleeck (line ~106) and overwritten by the recalc
     * if the monster actually entered the movement block. */
    let pf_inrange = inrange;
    let pf_scared = scared;
    /* C's distfleeck writes all three out-params; the MMOVE_MOVED
     * ranged-after-move test at monmove.c:970 reads the RECALCULATED nearby. */
    let pf_nearby = nearby;
    if (mtmp.mtame | 0) {
        /* Tame pets: always enter move block (condTrue guaranteed by mpeaceful or !nearby) */
        /* C monmove.c:917-930: undirected spell cast */
        if (!(mtmp.mspec_used | 0)) {
            const dx = (mtmp.mx | 0) - (game.u.ux | 0);
            const dy = (mtmp.my | 0) - (game.u.uy | 0);
            if (dx * dx + dy * dy <= 49) {
                /* C monmove.c:921-922 — walk mdat->mattk[0..NATTK-1].  The real
                 * per-mndx attack table is mon_mattk_raw() (js/mhitu.js
                 * MON_MATTK) in C monattk.h numbering; the MONS row above
                 * carries no mattk[] fields at all (it is 10 wide).  Trailing
                 * slots are the implicit {AT_NONE, AD_PHYS, 0, 0}. */
                const attks = mon_mattk_raw(mndx);
                if (attks) {
                    for (let i = 0; i < NATTK; i++) {
                        const a = (i < attks.length) ? attks[i] : null;
                        const aatyp = a ? (a[0] | 0) : AT_NONE;
                        const adtyp = a ? (a[1] | 0) : 0;
                        if (aatyp === AT_MAGC && (adtyp === AD_SPEL || adtyp === AD_CLRC)) {
                            const attk = { aatyp, adtyp, damn: a[2] | 0, damd: a[3] | 0 };
                            if ((await castmu(mtmp, attk, false, false)) & M_ATTK_HIT) {
                                status = MMOVE_DONE;
                                break;
                            }
                        }
                    }
                }
            }
        }
        /* C monmove.c:932-934: m_move(mtmp, 0) */
        moved = true;
        if (!status) {
            status = await m_move(mtmp, 0);
        }
        /* C monmove.c:912-915: a defensive escape from m_move() can migrate
         * the monster.  Do not run distfleeck() on its former map state. */
        if (mon_offmap_dh(mtmp)) return 1;
        /* C monmove.c:940-941: if (status != MMOVE_DIED) distfleeck(recalc)
         * Recalc fires rn2(5) again. MMOVE_DIED=2. */
        if (status !== MMOVE_DIED) {
            const rc = distfleeck(mtmp); /* C: recalculate distfleeck after m_move */
            if (typeof process !== 'undefined' && ENV?.FF_DH_TRACE)
                pushRngLogEntry(`^dh_post[id=${mtmp?.m_id ?? 0} status=${status}]`);
            pf_inrange = rc.inrange; pf_scared = rc.scared; pf_nearby = rc.nearby;
        }
        if (status === MMOVE_DIED) return 1;
    } else if (condTrue) {
        if (!(mtmp.mspec_used | 0)) {
            const dx = (mtmp.mx | 0) - (game.u.ux | 0);
            const dy = (mtmp.my | 0) - (game.u.uy | 0);
            if (dx * dx + dy * dy <= 49) {
                /* C monmove.c:921-922 — walk mdat->mattk[0..NATTK-1].  The real
                 * per-mndx attack table is mon_mattk_raw() (js/mhitu.js
                 * MON_MATTK) in C monattk.h numbering; the MONS row above
                 * carries no mattk[] fields at all (it is 10 wide).  Trailing
                 * slots are the implicit {AT_NONE, AD_PHYS, 0, 0}. */
                const attks = mon_mattk_raw(mndx);
                if (attks) {
                    for (let i = 0; i < NATTK; i++) {
                        const a = (i < attks.length) ? attks[i] : null;
                        const aatyp = a ? (a[0] | 0) : AT_NONE;
                        const adtyp = a ? (a[1] | 0) : 0;
                        if (aatyp === AT_MAGC && (adtyp === AD_SPEL || adtyp === AD_CLRC)) {
                            const attk = { aatyp, adtyp, damn: a[2] | 0, damd: a[3] | 0 };
                            if ((await castmu(mtmp, attk, false, false)) & M_ATTK_HIT) {
                                status = MMOVE_DONE;
                                break;
                            }
                        }
                    }
                }
            }
        }
        moved = true;
        if (!status) {
            status = await m_move(mtmp, 0);
        }
        /* C monmove.c:912-915 — check this before the post-move recalc. */
        if (mon_offmap_dh(mtmp)) return 1;
        if (status === MMOVE_DIED) return 1;
        /* C monmove.c:940-941: if (status != MMOVE_DIED) distfleeck recalc. */
        const rc = distfleeck(mtmp);
        if (typeof process !== 'undefined' && ENV?.FF_DH_TRACE)
            pushRngLogEntry(`^dh_post[id=${mtmp?.m_id ?? 0} status=${status}]`);
        pf_inrange = rc.inrange; pf_scared = rc.scared; pf_nearby = rc.nearby;
    }
    /* When condTrue is false (hostile monster adjacent and able to attack),
     * the movement block is skipped entirely (status stays MMOVE_NOTHING) and
     * the pre-movement inrange/scared carry into PHASE FOUR — matching C. */

    if (moved) {
        switch (status) {
            case MMOVE_NOMOVES:
                if (pf_scared) panicattk = true;
                /* C monmove.c:943-946 FALLTHRU into NOTHING/DONE: the
                 * hallucination newsym below still runs for a monster with
                 * no valid squares (a queen bee boxed in on her jelly). */
                // falls through
            case MMOVE_NOTHING:
            case MMOVE_DONE:
                /* C monmove.c:961-964, inside this same switch arm:
                 *     /_ During hallucination, monster appearance should
                 *        still change - even if it doesn't move. _/
                 *     if (Hallucination)
                 *         newsym(mtmp->mx, mtmp->my);
                 * RNG-free on the scored stream and invisible to a sober hero,
                 * but a hallucinating one re-rolls the glyph on every newsym,
                 * so this is a DISPLAY-stream draw per non-moving monster per
                 * turn.  Omitted, the port's display stream ran short by one
                 * draw for each such monster. */
                if (_hallucinating_dh())
                    newsym(mtmp.mx | 0, mtmp.my | 0);
                break;
            case MMOVE_MOVED:
                /* C monmove.c:967-968: a grounded monster's footsteps can
                 * accelerate nearby buried-zombie timers. */
                if (pooleffects_grounded(mtmp.data || permonstTemplate(mndx)))
                    disturb_buried_zombies(mtmp.mx | 0, mtmp.my | 0);
                /* C monmove.c:966-967 helpless(mon) = msleeping || !mcanmove —
                 * "maybe it stepped on a trap and fell asleep". */
                if ((mtmp.msleeping | 0) || !(mtmp.mcanmove | 0))
                    return 0;
                /* C monmove.c:970-975 — "Monsters can move and then shoot on
                 * the same turn; our hero can't."  A monster that moved and is
                 * NOT adjacent still gets its attack set, if it has something
                 * to use at range.  This break (to PHASE FOUR) was the missing
                 * wire: a cobra that slithered a square closer never reached
                 * mattacku, so its AT_SPIT never ran.  The || short-circuits in
                 * C's order, so find_offensive is only consulted when the
                 * cheaper two tests fail. */
                if (!pf_nearby
                    && (ranged_attk_available(mtmp)
                        || attacktype_mndx(mndx, AT_WEAP)
                        || find_offensive(mtmp)))
                    break;
                /* C monmove.c:979-981: engulfing_u → return mattacku. */
                if (engulfing_u(mtmp))
                    return await mattacku(mtmp);
                return 0;
            default:
                break;
        }
    }

    const u = game.u || {};
    const heroHp = Upolyd(u) ? (u.mh | 0) : (u.uhp | 0);
    if (status !== MMOVE_DONE
        && (!(mtmp.mpeaceful | 0) || (_conflict_dch() && !resist_conflict(mtmp)))) {
        if (((pf_inrange && !pf_scared) || panicattk)
            && !noattacks_mndx(mndx)
            && heroHp > 0) {
            if (await mattacku(mtmp))
                return 1; /* monster died (e.g. exploded) */
        }
        /* C monmove.c:973-976 — a long worm's tail segments next to the hero
         * each get another mattacku (worm.c:344-362 wormhitu). */
        if (mtmp.wormno) {
            for (const [wx, wy] of worm_hitu_segs(mtmp)) {
                const ddx = wx - (u.ux | 0), ddy = wy - (u.uy | 0);
                if (ddx * ddx + ddy * ddy < 3)
                    if (await mattacku(mtmp))
                        return 1; /* your passive ability killed the worm */
            }
        }
    }
    /* C monmove.c:979-981 — "special speeches for quest monsters":
     *     if (!helpless(mtmp) && nearby) quest_talk(mtmp);
     * helpless(mon) is monst.h:249 msleeping || !mcanmove.  `nearby` is the
     * RECALCULATED one (pf_nearby), the same value the ranged-attack test above
     * reads. */
    if (!((mtmp.msleeping | 0) || !(mtmp.mcanmove | 0)) && pf_nearby)
        await _quest_talk_dh(mtmp);
    /* C monmove.c:983-986 — extra emotional attack for vile monsters. */
    const mdat = mtmp.data || permonstTemplate(mndx);
    if (pf_inrange && (mdat?.msound | 0) === 34 && !(mtmp.mpeaceful | 0)
        && couldsee(mtmp.mx | 0, mtmp.my | 0) && !(mtmp.minvis | 0)
        && !rn2(5))
        cuss(mtmp);
    return 0;
}
/* C quest.c:494 quest_talk(mtmp).  The body lives in js/cmd.js (this port's
 * quest.c host); reached through a cached dynamic import so dochug.js does not
 * add a static edge into cmd.js, matching js/questpgr.js's `_cmdmod` idiom. */
let _dh_cmdmod = null;
async function _quest_talk_dh(mtmp) {
    if (!_dh_cmdmod)
        _dh_cmdmod = await import('./cmd.js');
    await _dh_cmdmod.quest_talk(mtmp);
}

/* C monmove.c:325-358 disturb(mtmp) — "wake up a monster".
 *
 *   if (couldsee(mtmp->mx, mtmp->my) && mdistu(mtmp) <= 100
 *       && (!Stealth || (mtmp->data == &mons[PM_ETTIN] && rn2(10)))
 *       && (!(mtmp->data->mlet == S_NYMPH
 *             || mtmp->data == &mons[PM_JABBERWOCK]
 *             || mtmp->data->mlet == S_LEPRECHAUN) || !rn2(50))
 *       && (Aggravate_monster
 *           || (mtmp->data->mlet == S_DOG || mtmp->data->mlet == S_HUMAN)
 *           || (!rn2(7) && M_AP_TYPE(mtmp) != M_AP_FURNITURE
 *               && M_AP_TYPE(mtmp) != M_AP_OBJECT))) {
 *       wake_msg(mtmp, !mtmp->mpeaceful);
 *       mtmp->msleeping = 0;
 *       return 1;
 *   }
 *   return 0;
 *
 * NOTE the v5 shape: there is no `Is_rogue_level` term (that is 3.7) and the
 * rn2(7) clause carries the mimic-appearance guard.  RNG order matters — the
 * rn2(10) fires ONLY under Stealth, the rn2(50) ONLY for the three hard-to-wake
 * classes, and the rn2(7) is short-circuited away by Aggravate_monster or by a
 * dog/human mlet. */
const S_NYMPH_DH = 14, S_LEPRECHAUN_DH = 12, S_DOG_DH = 4, S_HUMAN_DH = 53;
const M_AP_FURNITURE_DH = 1, M_AP_OBJECT_DH = 2; /* C monst.h:52-55 */
function _uprop_on_dh(idx) {
    const p = game.u?.uprops?.[idx];
    return !!(p && ((p.intrinsic | 0) || (p.extrinsic | 0)) && !(p.blocked | 0));
}
function disturb_dh(mtmp) {
    const u = game.u || {};
    const mx = mtmp.mx | 0, my = mtmp.my | 0;
    if (!couldsee(mx, my))
        return 0;
    /* C mondata.h mdistu(mon) = dist2(mon->mx, mon->my, u.ux, u.uy). */
    const dx = mx - (u.ux | 0), dy = my - (u.uy | 0);
    if (dx * dx + dy * dy > 100)
        return 0;
    const ptr = mtmp.data || {};
    const mndx = (ptr.pmidx ?? mtmp.mndx ?? mtmp.mnum ?? -1) | 0;
    const mlet = ptr.mlet | 0;
    if (_uprop_on_dh(STEALTH_DH) && !(mndx === PM_ETTIN_DH && rn2(10)))
        return 0;
    if ((mlet === S_NYMPH_DH || mndx === PM_JABBERWOCK_DH
         || mlet === S_LEPRECHAUN_DH) && rn2(50))
        return 0;
    if (!_uprop_on_dh(AGGRAVATE_MONSTER_DH)
        && !(mlet === S_DOG_DH || mlet === S_HUMAN_DH)
        && !(!rn2(7) && (mtmp.m_ap_type | 0) !== M_AP_FURNITURE_DH
             && (mtmp.m_ap_type | 0) !== M_AP_OBJECT_DH))
        return 0;
    wake_msg(mtmp, !(mtmp.mpeaceful | 0));
    mtmp.msleeping = 0;
    return 1;
}


/* C monflag.h:159-168 */
const M3_WANTSAMUL_WZ = 0x0001, M3_WANTSBELL_WZ = 0x0002,
      M3_WANTSBOOK_WZ = 0x0004, M3_WANTSCAND_WZ = 0x0008,
      M3_WANTSARTI_WZ = 0x0010, M3_COVETOUS_WZ = 0x001f;
/* objects.h ordinals, cross-checked against js/oc_name_data.js by name (the
 * same table js/mhitm.js:2993 reads AMULET_OF_YENDOR=213 from). */
const AMULET_OF_YENDOR_WZ = 213, BELL_OF_OPENING_WZ = 263,
      CANDELABRUM_OF_INVOCATION_WZ = 262, SPE_BOOK_OF_THE_DEAD_WZ = 409;
/* C obj.h:271 any_quest_artifact(o) = ((o)->oartifact >= ART_ORB_OF_DETECTION);
 * artilist.h ordinal 21 (js/objnam.js:2827 spells the same literal). */
const ART_ORB_OF_DETECTION_WZ = 21;
/* monsters.h ordinal, confirmed against js/makemon_mons.json row 285's
 * mflags3 = 0x25f (the only row wanting all five artifacts). */
const PM_WIZARD_OF_YENDOR_WZ = 285;
/* C mondata.h is_covetous(ptr) — (ptr)->mflags3 & M3_COVETOUS.  js/makemon.js
 * :5117 has the same body but does not export it. */
function is_covetous_wz(ptr) {
    return (((ptr && ptr.mflags3) | 0) & M3_COVETOUS_WZ) !== 0;
}
/* C wizard.c:141 which_arti(mask) */
function which_arti_wz(mask) {
    switch (mask) {
    case M3_WANTSAMUL_WZ: return AMULET_OF_YENDOR_WZ;
    case M3_WANTSBELL_WZ: return BELL_OF_OPENING_WZ;
    case M3_WANTSCAND_WZ: return CANDELABRUM_OF_INVOCATION_WZ;
    case M3_WANTSBOOK_WZ: return SPE_BOOK_OF_THE_DEAD_WZ;
    default: break; /* 0 signifies quest artifact */
    }
    return 0;
}
/* C wizard.c:163 mon_has_arti(mtmp, otyp) — otyp 0 means "any quest artifact" */
function mon_has_arti_wz(mtmp, otyp) {
    for (let otmp = mtmp.minvent; otmp; otmp = otmp.nobj) {
        if (otyp) {
            if ((otmp.otyp | 0) === otyp)
                return true;
        } else if ((otmp.oartifact | 0) >= ART_ORB_OF_DETECTION_WZ)
            return true;
    }
    return false;
}
/* C wizard.c:182 other_mon_has_arti(mtmp, otyp) */
function other_mon_has_arti_wz(mtmp, otyp) {
    for (let m = game.fmon; m; m = m.nmon)
        if (m !== mtmp && mon_has_arti_wz(m, otyp))
            return m;
    return null;
}
function on_ground_wz(otyp) {
    for (let otmp = game.fobj; otmp; otmp = otmp.nobj) {
        if (otyp) {
            if ((otmp.otyp | 0) === otyp)
                return otmp;
        } else if ((otmp.oartifact | 0) >= ART_ORB_OF_DETECTION_WZ)
            return otmp;
    }
    return null;
}
/* C wizard.c:214 you_have(mask) — the u.uhave bitfields. */
function you_have_wz(mask) {
    const uh = game.u?.uhave;
    if (!uh) return false;
    switch (mask) {
    case M3_WANTSAMUL_WZ: return !!uh.amulet;
    case M3_WANTSBELL_WZ: return !!uh.bell;
    case M3_WANTSCAND_WZ: return !!uh.menorah;
    case M3_WANTSBOOK_WZ: return !!uh.book;
    case M3_WANTSARTI_WZ: return !!uh.questart;
    default: break;
    }
    return false;
}
/* C wizard.c:236 target_on(mask, mtmp) — sets mtmp->mgoal and returns the
 * STRAT_* word, or STRAT_NONE.  `M_Wants(mask)` is wizard.c:139
 * `(mtmp->data->mflags3 & (mask))`. */
function target_on_wz(mask, mtmp) {
    if (!((((mtmp.data && mtmp.data.mflags3) | 0) & mask)))
        return STRAT_NONE;
    const otyp = which_arti_wz(mask);
    if (!mon_has_arti_wz(mtmp, otyp)) {
        let otmp, mtmp2;
        if (you_have_wz(mask)) {
            mtmp.mgoal = { x: game.u.ux | 0, y: game.u.uy | 0 };
            return (STRAT_PLAYER | mask) >>> 0;
        } else if ((otmp = on_ground_wz(otyp)) != null) {
            mtmp.mgoal = { x: otmp.ox | 0, y: otmp.oy | 0 };
            return (STRAT_GROUND | mask) >>> 0;
        } else if ((mtmp2 = other_mon_has_arti_wz(mtmp, otyp)) != null
                   /* when seeking the Amulet, avoid targeting the Wizard or
                      temple priests (to protect Moloch's high priest) */
                   && (otyp !== AMULET_OF_YENDOR_WZ
                       || (!(mtmp2.iswiz | 0) && !inhistemple(mtmp2)))) {
            mtmp.mgoal = { x: mtmp2.mx | 0, y: mtmp2.my | 0 };
            return (STRAT_MONSTR | mask) >>> 0;
        }
    }
    mtmp.mgoal = { x: 0, y: 0 };
    return STRAT_NONE;
}
/* C wizard.c:268 strategy(mtmp) — RNG-free. */
function strategy_wz(mtmp) {
    let strat, dstrat;

    if (!is_covetous_wz(mtmp.data)
        /* perhaps a shopkeeper has been polymorphed into a master lich; we
           don't want it teleporting to the stairs to heal because that will
           leave its shop untended */
        || ((mtmp.isshk | 0) && inhishop(mtmp))
        /* likewise for temple priests */
        || ((mtmp.ispriest | 0) && inhistemple(mtmp)))
        return STRAT_NONE;

    /* C wizard.c:283 `switch ((mtmp->mhp * 3) / mtmp->mhpmax)` — C integer
     * division, so the bands are 0..3. */
    switch (Math.trunc(((mtmp.mhp | 0) * 3) / (mtmp.mhpmax | 0))) {
    case 3:
        dstrat = STRAT_NONE;
        break;
    case 2:
        dstrat = STRAT_HEAL;
        break;
    case 1: /* the wiz is less cautious */
        if ((mtmp.data.pmidx | 0) !== PM_WIZARD_OF_YENDOR_WZ)
            return STRAT_HEAL;
        dstrat = STRAT_HEAL; /* C FALLTHRU into case 2 */
        break;
    case 0: /* panic time - mtmp is almost snuffed */
    default:
        return STRAT_HEAL;
    }

    if (game.svc?.context?.made_amulet)
        if ((strat = target_on_wz(M3_WANTSAMUL_WZ, mtmp)) !== STRAT_NONE)
            return strat;

    if (game.u?.uevent?.invoked) {
        if ((strat = target_on_wz(M3_WANTSARTI_WZ, mtmp)) !== STRAT_NONE)
            return strat;
        if ((strat = target_on_wz(M3_WANTSBOOK_WZ, mtmp)) !== STRAT_NONE)
            return strat;
        if ((strat = target_on_wz(M3_WANTSBELL_WZ, mtmp)) !== STRAT_NONE)
            return strat;
        if ((strat = target_on_wz(M3_WANTSCAND_WZ, mtmp)) !== STRAT_NONE)
            return strat;
    } else {
        if ((strat = target_on_wz(M3_WANTSBOOK_WZ, mtmp)) !== STRAT_NONE)
            return strat;
        if ((strat = target_on_wz(M3_WANTSBELL_WZ, mtmp)) !== STRAT_NONE)
            return strat;
        if ((strat = target_on_wz(M3_WANTSCAND_WZ, mtmp)) !== STRAT_NONE)
            return strat;
        if ((strat = target_on_wz(M3_WANTSARTI_WZ, mtmp)) !== STRAT_NONE)
            return strat;
    }
    return dstrat;
}
/* C wizard.c:331 choose_stairs(&sx, &sy, dir) — RNG-free; leaves the output
 * coordinates alone when no stairway is found.  The stairway_find_type_dir()
 * walk is C stairs.c:88-95 over gs.stairs = game.stairs. */
function choose_stairs_wz(out, dir) {
    const stdir = builds_up(game.u?.uz) ? dir : !dir;
    const findTypeDir = (isladder, up) => {
        for (let t = game.stairs; t; t = t.next)
            if (!!t.isladder === !!isladder && !!t.up === !!up)
                return t;
        return null;
    };
    let stway = findTypeDir(false, stdir);
    if (!stway) {
        /* no stairs; look for ladder in that direction */
        stway = findTypeDir(true, stdir);
        if (!stway) {
            /* no ladder either; look for branch stairs or ladder any way */
            for (stway = game.stairs; stway; stway = stway.next)
                if ((stway.tolev?.dnum | 0) !== (game.u?.uz?.dnum | 0))
                    break;
            if (!stway) {
                stway = findTypeDir(false, !stdir);
                if (!stway)
                    stway = findTypeDir(true, !stdir);
            }
        }
    }
    if (stway) { out.x = stway.sx | 0; out.y = stway.sy | 0; }
}
/* enexto() / mnexto() / mnearto() / deal_with_overcrowding() now live in
 * js/teleport.js, next to enexto_core and rloc_to_flag, and are imported above:
 * js/shk.js kept an EMPTY mnexto and a gap-ridden module-local mnearto for the
 * same C functions, and one body each beats a third copy here. */

export function In_W_tower_wz(x, y, lev) {
    const same = (a, b) => !!a && !!b && (a.dnum | 0) === (b.dnum | 0)
        && (a.dlevel | 0) === (b.dlevel | 0);
    if (!(same(lev, game.wiz1_level) || same(lev, game.wiz2_level)
          || same(lev, game.wiz3_level)))
        return false;
    const dn = game.dndest;
    if (!dn || !(dn.nlx | 0))
        return false; /* C: impossible("No boundary for Wizard's Tower?") */
    return within_bounded_area(x, y, dn.nlx | 0, dn.nly | 0,
                               dn.nhx | 0, dn.nhy | 0);
}
/* C wizard.c:369 tactics(mtmp) — returns 1 when the monster used its move.
 * C's switch falls THROUGH from STRAT_HEAL into STRAT_NONE (wizard.c:409-411
 * FALLTHROUGH), which is why the two arms are if-chained rather than a JS
 * switch: only the healmon and mnearto-failure paths return early. */
async function tactics_wz(mtmp) {
    const u = game.u;
    const strat = strategy_wz(mtmp);
    let sx = 0, sy = 0, mx, my;

    mtmp.mstrategy =
        (((mtmp.mstrategy | 0) & (STRAT_WAITMASK | STRAT_APPEARMSG)) | strat) >>> 0;

    if (strat === STRAT_HEAL) { /* hide and recover */
        mx = mtmp.mx | 0; my = mtmp.my | 0;

        if (u.uswallow && u.ustuck === mtmp) {
            /* C wizard.c:381 expels(mtmp, mtmp->data, TRUE): the real body is
             * expels_gu (mhitu.c:264-306); unstuck() draws rnd(2), mnexto()
             * the collect_coords ladder. */
            await expels_gu(mtmp, mtmp.data?.pmidx ?? mtmp.mnum, true);
        }

        /* if wounded, hole up on or near the stairs (to block them) */
        {
            const cc = { x: sx, y: sy };
            choose_stairs_wz(cc, ((mtmp.m_id | 0) % 2) !== 0);
            sx = cc.x; sy = cc.y;
        }
        mtmp.mavenge = 1; /* covetous monsters attack while fleeing */
        if (In_W_tower_wz(mx, my, u.uz)
            || ((mtmp.iswiz | 0) && !sx && !mon_has_amulet(mtmp))) {
            if (!noteleport_level(mtmp)
                && !rn2(3 + Math.trunc((mtmp.mhp | 0) / 10)))
                await rloc(mtmp, RLOC_MSG);
        } else if (sx && (mx !== sx || my !== sy)) {
            if (!noteleport_level(mtmp)
                && !await mnearto(mtmp, sx, sy, true, RLOC_MSG)) {
                /* couldn't move to the target spot for some reason, so stay
                   where we are (don't actually need rloc_to() because mtmp is
                   still on the map at <mx,my>... */
                await rloc_to(mtmp, mx, my);
                return 0;
            }
            mx = mtmp.mx | 0; my = mtmp.my | 0; /* update cached location */
        }
        /* if you're not around, cast healing spells */
        if (dist2(mx, my, u.ux | 0, u.uy | 0) > (BOLT_LIM * BOLT_LIM))
            if ((mtmp.mhp | 0) <= (mtmp.mhpmax | 0) - 8) {
                healmon(mtmp, rnd(8), 0);
                return 1;
            }
        /* C FALLTHROUGH into STRAT_NONE */
    }
    if (strat === STRAT_HEAL || strat === STRAT_NONE) { /* harass */
        if (!noteleport_level(mtmp) && !rn2(!(mtmp.mflee | 0) ? 5 : 33))
            await mnexto(mtmp, RLOC_MSG);
        return 0;
    }
    /* default: kill, maim, pillage! */
    {
        const where = (strat & STRAT_STRATMASK) >>> 0;
        const tx = mtmp.mgoal?.x | 0, ty = mtmp.mgoal?.y | 0;
        const targ = (strat & STRAT_GOAL) >>> 0;
        let otmp;

        if (!targ || !isok(tx, ty)) /* simply wants you to close */
            return 0;
        if (noteleport_level(mtmp) && !monnear(mtmp, tx, ty))
            return 0;
        if (u_at(tx, ty) || where === STRAT_PLAYER) {
            /* player is standing on it (or has it) */
            mx = mtmp.mx | 0; my = mtmp.my | 0;
            if (noteleport_level(mtmp)
                || !await mnearto(mtmp, tx, ty, false, RLOC_MSG))
                await rloc_to(mtmp, mx, my); /* no room? stay put */
            return 0;
        }
        if (where === STRAT_GROUND) {
            if (!m_at(tx, ty)
                || ((mtmp.mx | 0) === tx && (mtmp.my | 0) === ty)) {
                /* teleport to it and pick it up */
                await rloc_to(mtmp, tx, ty); /* clean old pos */

                if ((otmp = on_ground_wz(which_arti_wz(targ))) != null) {
                    if (cansee(mtmp.mx | 0, mtmp.my | 0))
                        pline(`${Monnam_dm(mtmp)} picks up ${(await distant_obj_name(otmp))}.`);
                    obj_extract_floor(otmp);
                    await mpickobj(mtmp, otmp);
                    return 1;
                }
                return 0;
            }
            /* a monster is standing on it - cause some trouble */
            if (!rn2(5) && !noteleport_level(mtmp))
                await mnexto(mtmp, RLOC_MSG);
            return 0;
        }
        /* a monster has it - 'port beside it. */
        mx = mtmp.mx | 0; my = mtmp.my | 0;
        if (!noteleport_level(mtmp)
            && !await mnearto(mtmp, tx, ty, false, RLOC_MSG))
            await rloc_to(mtmp, mx, my); /* no room? stay put */
        return 0;
    }
}
/* C priest.c inhistemple / mon.c expels — see the call sites above. */
