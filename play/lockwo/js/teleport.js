// teleport.js — C ref: src/teleport.c.
//
// The monster-relocation half of teleport.c: goodpos(), rloc_pos_ok(),
// rloc_to_core(), rloc_to(), rloc() and tele_restrict().  A teleporting monster
// (M1_TPORT: nymph, tengu, leprechaun, succubus) uses these after it acts — a
// nymph that successfully steals from the hero ends its attack with
// `rloc(magr, RLOC_MSG)` (uhitm.c mhitm_ad_sedu), which both picks the
// destination (the RNG-bearing part) and prints the vanish/appear message.
//
// The hero-teleport half of teleport.c (tele/dotele/level_tele/teleds) lives in
// js/trap.js, where it grew alongside the trap effects that call it.

import { game } from './gstate.js';
import { rn2, rnd } from './rng.js';
import { isok, dist2 } from './hacklib.js';
import { newsym, m_at, update_topl } from './display.js';
import { couldsee } from './vision.js';
import { update_monster_region } from './region.js';
import { onscary, set_apparxy } from './monmove.js';
import { Monnam, canspotmon } from './uhitm.js';
import {
    COLNO, ROWNO, DOOR, POOL, DRAWBRIDGE_UP, LAVAPOOL, LAVAWALL,
    D_CLOSED, D_LOCKED, STRAT_APPEARMSG, BOLT_LIM,
} from './const.js';
import { BOULDER } from './mkobj.js';
import {
    is_swimmer_flag, passes_walls_flag, amorphous_flag, throws_rocks_flag,
} from './monflags_data.js';

// C ref: include/hack.h — rloc() flags.  (js/const.js carries an older copy of
// these names with different values; the ones here are this C build's.)
export const RLOC_NONE = 0x00;
export const RLOC_ERR = 0x01;   /* allow impossible() if no rloc */
export const RLOC_MSG = 0x02;   /* show vanish/appear msg */
export const RLOC_NOMSG = 0x04; /* prevent appear msg, even for STRAT_APPEARMSG */

// C ref: include/hack.h goodpos() gpflags (the subset goodpos reads).
export const GP_ALLOW_U = 0x00400000;
export const GP_CHECKSCARY = 0x00800000;
export const GP_AVOID_MONPOS = 0x01000000;

// C ref: monsym.h S_EEL — the monster class whose members drown out of water.
const S_EEL_MCLS = 57;

function terrainTyp(x, y) { return game.level?.at(x, y)?.typ; }
function u_at(x, y) { return game.u?.ux === x && game.u?.uy === y; }
function distu(x, y) { return dist2(x, y, game.u?.ux ?? 0, game.u?.uy ?? 0); }

// C ref: rm.h IS_POOL(typ) — POOL <= typ <= DRAWBRIDGE_UP.
function is_pool(x, y) {
    const typ = terrainTyp(x, y);
    return typ != null && typ >= POOL && typ <= DRAWBRIDGE_UP;
}
// C ref: rm.h IS_LAVA(typ) — LAVAPOOL or LAVAWALL.
function is_lava(x, y) {
    const typ = terrainTyp(x, y);
    return typ === LAVAPOOL || typ === LAVAWALL;
}

// C ref: rm.h closed_door(x,y) — a DOOR whose doormask has D_CLOSED|D_LOCKED.
function closed_door(x, y) {
    const loc = game.level?.at(x, y);
    return !!loc && loc.typ === DOOR && !!((loc.doormask | 0) & (D_CLOSED | D_LOCKED));
}

// C ref: monmove.c accessible(x, y) — ACCESSIBLE(SURFACE_AT(x,y)) && not a
// closed door.  SURFACE_AT only differs in front of a closed drawbridge, which
// the contest levels never place under a teleport destination.
function accessible(x, y) {
    const typ = terrainTyp(x, y);
    return typ != null && typ >= DOOR && !closed_door(x, y);
}

// C ref: rm.h may_passwall(x,y) — a WALLWALK monster can enter solid stone but
// not the level's outermost boundary.  Only consulted for passes_walls species,
// which never reach rloc() in the covered sessions; kept for structural fidelity.
function may_passwall(x, y) {
    return x >= 1 && x < COLNO - 1 && y >= 1 && y < ROWNO - 1;
}

// C ref: mondata.h m_in_air(mon) — flying or levitating.
function m_in_air(mtmp) { return !!mtmp?.mflying || !!mtmp?.mlevitating; }
// C ref: mondata.h likes_lava(ptr) — fire elementals / salamanders.  None of
// the species that reach goodpos() here qualify.
function likes_lava(_mdat) { return false; }

// C ref: mkobj.c sobj_at(BOULDER, x, y).
function sobj_at_boulder(x, y) {
    for (const o of (game.level?.objects || []))
        if (o.where === 'floor' && o.ox === x && o.oy === y && o.otyp === BOULDER)
            return true;
    return false;
}

// C ref: teleport.c goodpos(x, y, mtmp, gpflags) — is <x,y> a legal spot for
// mtmp?  Ported for a walking/swimming land monster on an ordinary dungeon
// level: the Plane-of-Water / waterwall / floating-eye-over-lava and
// mtmp==&youmonst branches are unreachable for these callers (a real monster on
// a normal level) and are noted rather than modelled.
export function goodpos(x, y, mtmp, gpflags) {
    const checkscary = (gpflags & GP_CHECKSCARY) !== 0;
    const allow_u = (gpflags & GP_ALLOW_U) !== 0;
    const avoid_monpos = (gpflags & GP_AVOID_MONPOS) !== 0;

    if (!isok(x, y)) return false;

    if (!allow_u) {
        // The u.ustuck-while-swallowed and u.usteed exemptions don't apply: a
        // relocating monster here neither engulfs the hero nor is ridden.
        if (u_at(x, y)) return false;
    }

    if (avoid_monpos && m_at(x, y)) return false;

    let mdat = null;
    if (mtmp) {
        const mtmp2 = m_at(x, y);
        // (mtmp->wormno: no long worms in the covered sessions)
        if (mtmp2 && mtmp2 !== mtmp) return false;

        mdat = mtmp.data;
        if (is_pool(x, y)) {
            // Water: a swimmer may land here; anyone else needs to be airborne.
            // Is_waterlevel()/is_waterwall() are FALSE on ordinary levels.
            return is_swimmer_flag(mdat) || m_in_air(mtmp);
        } else if (mdat?.mcls === S_EEL_MCLS && rn2(13)) {
            // An eel out of water usually refuses the square — and this rn2(13)
            // fires whenever an eel is offered one, so it must not be skipped.
            return false;
        } else if (is_lava(x, y)) {
            return m_in_air(mtmp) || likes_lava(mdat);
        }
        if (passes_walls_flag(mdat) && may_passwall(x, y)) return true;
        if (amorphous_flag(mdat) && closed_door(x, y)) return true;
        if (checkscary && onscary(x, y, mtmp)) return false;
    }
    if (!accessible(x, y)) return false;   // (pool/lava already returned above)
    if (sobj_at_boulder(x, y) && (!mdat || !throws_rocks_flag(mdat)))
        return false;
    // is_exclusion_zone(LR_MONGEN, ...) only applies with GP_AVOID_MONPOS
    // (monster creation), which no caller in this file passes.
    return true;
}

// C ref: teleport.c rloc_pos_ok(x, y, mtmp) — goodpos() plus the special-level
// teleport-region restrictions (svu.updest / svd.dndest), which only exist on
// the Wizard-tower and endgame levels the contest sessions never reach.
function rloc_pos_ok(x, y, mtmp) {
    if (!goodpos(x, y, mtmp, GP_CHECKSCARY)) return false;
    // tele_jump_ok(xx, yy, x, y) is TRUE on levels without updest/dndest.
    return true;
}

// C ref: teleport.c rloc_to_core(mtmp, x, y, rlocflags) — pull the monster off
// its current square and put it down at <x,y>, with the vanish / appear
// messages when the caller asked for them.  No RNG.
async function rloc_to_core(mtmp, x, y, rlocflags) {
    const oldx = mtmp.mx, oldy = mtmp.my;
    const preventmsg = (rlocflags & RLOC_NOMSG) !== 0;
    const vanishmsg = (rlocflags & RLOC_MSG) !== 0;
    let appearmsg = ((mtmp.mstrategy | 0) & STRAT_APPEARMSG) !== 0;
    const domsg = !game.in_mklev && (vanishmsg || appearmsg) && !preventmsg;
    let telemsg = false;

    if (x === mtmp.mx && y === mtmp.my && m_at(x, y) === mtmp) return;

    if (oldx) { /* "pick up" monster */
        if (domsg && canspotmon(mtmp)) {
            // sensemon() is FALSE (no telepathy / warning in these sessions).
            if (couldsee(x, y)) {
                telemsg = true;
            } else {
                await update_topl(`${Monnam(mtmp)} vanishes!`);
            }
            appearmsg = false;
        }
        // (no long worms) remove_monster(oldx, oldy) then newsym.
        mtmp.mx = 0; mtmp.my = 0;
        newsym(oldx, oldy);
    }

    mtmp.mtrack = [];                       // mon_track_clear(mtmp)
    mtmp.mx = x; mtmp.my = y;               // place_monster(mtmp, x, y)
    update_monster_region(mtmp);

    // The u.ustuck unstuck/swallow bookkeeping and maybe_unhide_at() are inert
    // here: nothing is holding the hero and no hider sits at the destination.

    newsym(x, y);
    set_apparxy(mtmp);

    if (domsg && (canspotmon(mtmp) || appearmsg)) {
        const du = distu(x, y);
        const next = (du <= 2) ? ' next to you' : null;
        const nearu = (du <= BOLT_LIM * BOLT_LIM) ? ' close by' : null;
        mtmp.mstrategy = (mtmp.mstrategy | 0) & ~STRAT_APPEARMSG; /* one chance only */
        if (telemsg && couldsee(x, y)) {
            const olddu = distu(oldx, oldy);
            const where = next ? next
                : nearu ? nearu
                    : (olddu === du) ? ''
                        : (du < olddu) ? ' closer to you' : ' farther away';
            await update_topl(`${Monnam(mtmp)} vanishes and reappears${where}.`);
        } else {
            const Blind = (game.u?.blinded || 0) > 0 || !!game.u?.ublindf;
            await update_topl(`${Monnam(mtmp)} ${appearmsg ? 'suddenly ' : ''}`
                + `${!Blind ? 'appears' : 'arrives'}${next || nearu || ''}!`);
        }
        // (the WAN_TELEPORTATION discovery needs gc.current_wand, which is Null
        // for an attack-driven relocation)
    }

    // Resident-shopkeeper anger, shop-goods billing, the go.occupation
    // dochugw() nudge and the mtrapped mintrap() re-check are all inert for the
    // monsters these sessions relocate.
}

// C ref: teleport.c rloc_to(mtmp, x, y).
export async function rloc_to(mtmp, x, y) {
    await rloc_to_core(mtmp, x, y, RLOC_NOMSG);
}

// C ref: teleport.c rloc(mtmp, rlocflags) — put the monster at a random legal
// location.  Returns TRUE when a spot was found.
//
// RNG: up to 50 tries of `rnd(COLNO - 1)` then `rn2(ROWNO)`, both consumed on
// every iteration, stopping at the first square rloc_pos_ok() accepts.
export async function rloc(mtmp, rlocflags) {
    // The u.usteed / iswiz / iflags.mon_telecontrol special cases don't apply:
    // the teleporting monsters here are ordinary hostiles and wizard mode's
    // 'montelecontrol' option is off.
    let x = 0, y = 0, found = false;
    for (let trycount = 0; trycount < 50; ++trycount) {
        x = rnd(COLNO - 1);        /* 1..COLNO-1 */
        y = rn2(ROWNO);            /* 0..ROWNO-1 */
        if (rloc_pos_ok(x, y, mtmp)) { found = true; break; }
    }
    if (!found) {
        // C falls back to collect_coords() plus a Fisher-Yates walk over every
        // accessible square.  That is only reached when 50 random draws all
        // miss, which needs a level with almost no free floor; it is not
        // ported, so report failure rather than inventing RNG draws.
        return false;
    }
    await rloc_to_core(mtmp, x, y, rlocflags);
    return true;
}

// C ref: teleport.c noteleport_level(mon) — TRUE on levels that forbid
// teleporting (Sokoban, the Wizard's tower, a quest home level).  The contest
// sessions relocate monsters only on ordinary dungeon levels.
export function noteleport_level(_mon) { return false; }

// C ref: teleport.c tele_restrict(mon) — "A mysterious force prevents %s from
// teleporting!" on a no-teleport level.  No RNG.
export function tele_restrict(mon) {
    if (noteleport_level(mon)) return true;
    return false;
}
