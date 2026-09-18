// vault.js — Vault occupancy and guard summoning.
// C ref: vault.c — vault_occupied, findgd, newegd, find_guard_dest, invault,
//        clear_fcorr, restfakecorr, gd_move dig + restore,
//        vault_gd_watching (D-0953); vault_summon_gd (D-1007);
//        uleftvault (D-1140);
//        hidden_gold (D-1731; vault.c :1256–1268; doprgold FALSE);
//        paygd (D-1812; vault.c :1204–1247; really_done);
//        move_gold (D-1946; vault.c :632–643; live, wallify_vault wired);
//        wallify_vault (this iter; vault.c :646–731; cleanup-awaited).
// Named omissions: wallify_vault xy_set_wall_state (mklev.js-local);
// Croesus mon_wield;
// fracture_rock boulder shatter; reset_faint; SetVoice (no-op stub);
// spot_stop_timers; xy_set_wall_state; mimic_obj_name; gd_move debugpline1;
// clear_fcorr: Punished/uball (occupant yelp/rloc/m_into_limbo live);
// defensive !isok/!crm early-0 in the gd_move dig loop (C in-bounds
// by construction).

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { makemon, set_malign, newegd } from './makemon.js';
import { mon_track_clear } from './monmove.js';
import {
    pline, flush_topl_more, newsym, canspotmon, map_invisible, verbalize,
    map_location, unset_seenv, mon_visible, impossible, pline_mon,
} from './display.js';
import { getlin } from './getline.js';
import {
    Monnam, noit_Monnam, noit_mon_nam, pmname, Some_Monnam, x_monnam,
} from './do_name.js';
import { adjalign } from './attrib.js';
import { nomul, in_rooms, You_hear } from './hack.js';
import { makeplural } from './objnam.js';
import {
    cansee, couldsee, recalc_block_point, block_point, unblock_point,
} from './vision.js';
import { COIN_CLASS } from './objects.js';
import { del_engr_at, make_grave, sticks } from './engrave.js';
import { t_at, deltrap } from './trap.js';
import { rloc, enexto } from './teleport.js';
import { yelp } from './sounds.js';
import {
    place_object, stackobj, obj_extract_self, g_at, sobj_at, add_to_minv,
} from './mkobj.js';
import {
    VAULT, VAULT_GUARD_TIME, ROOMOFFSET, COLNO, ROWNO,
    ROOM, CORR, SCORR, STONE, HWALL, VWALL, DOOR, D_NODOOR,
    TLCORNER, TRCORNER, BLCORNER, BRCORNER,
    MM_EGD, MM_NOMSG, IS_WALL, IS_DOOR, IS_STWALL, IS_POOL,
    M_AP_OBJECT, M_AP_TYPE, EGD, u_at,
    A_LAWFUL, Has_contents, IS_ROOM, ACCESSIBLE, isok,
    GD_EATGOLD, GD_DESTROYGOLD, ARTICLE_A, FCSIZ,
    RLOC_NOMSG, RLOC_MSG, RLOC_ERR, FEMALE, MALE, IN_SIGHT, COULD_SEE,
} from './const.js';
import { m_at, m_carrying, mnexto, mpickgold } from './mon.js';
import { upstart, dist2 } from './hacklib.js';
import { SetVoice } from './sndprocs.js';
import { is_fainted } from './eat.js';
import { You } from './zap.js';
import { remove_monster, place_monster } from './steed.js';
import { obfree } from './shk.js';
import { monsterNames, mons, pmnames } from './monsters.js';
import { m_canseeu, mhe } from './mondata.js';
import { objectNames } from './generated/objects_data.js';

const PM_GUARD = monsterNames.indexOf('PM_GUARD');
const TIN_WHISTLE = objectNames.indexOf('TIN_WHISTLE');
const GOLD_PIECE = objectNames.indexOf('GOLD_PIECE');
const ROCK = objectNames.indexOf('ROCK');
const BOULDER = objectNames.indexOf('BOULDER');

/** C ref: invent.c money_cnt — invent is a JS array. */
function money_cnt(invent) {
    let sum = 0;
    for (const o of invent || []) {
        if (o.oclass === COIN_CLASS) sum += o.quan || 0;
    }
    return sum;
}

/** C ref: shk.c contained_gold `:3045–3061` — COIN_CLASS (+ nested). */
function contained_gold(obj, even_if_unknown) {
    let value = 0;
    for (let otmp = obj?.cobj; otmp; otmp = otmp.nobj) {
        if (otmp.oclass === COIN_CLASS) value += otmp.quan | 0;
        else if (Has_contents(otmp) && (otmp.cknown || even_if_unknown)) {
            value += contained_gold(otmp, even_if_unknown);
        }
    }
    return value;
}

/**
 * C ref: vault.c hidden_gold `:1256–1268`.
 * Invent-array walk (JS invent is an Array; cobj stays nobj).
 * even_if_unknown FALSE: only containers whose contents are known.
 */
export function hidden_gold(even_if_unknown) {
    let value = 0;
    for (const obj of game.invent || []) {
        if (Has_contents(obj) && (obj.cknown || even_if_unknown)) {
            value += contained_gold(obj, even_if_unknown);
        }
    }
    return value;
}

function Blind() {
    const u = game.u || {};
    return !!(u.Blind || u.ublind || ((u.HBlinded | 0) || (u.EBlinded | 0)) && !(u.BBlinded | 0));
}

function Deaf() {
    const u = game.u || {};
    return !!((u.HDeaf | 0) || (u.EDeaf | 0) || u.uroleplay?.deaf || u.Deaf);
}

function mungspaces(s) {
    return String(s || '').trim().replace(/\s+/g, ' ');
}

function strcmpi(a, b) {
    return String(a || '').toLowerCase() === String(b || '').toLowerCase();
}

function strncmpi(a, b, n) {
    return String(a || '').slice(0, n).toLowerCase()
        === String(b || '').slice(0, n).toLowerCase();
}

function guard_pmname(guard) {
    const mndx = guard?.mnum ?? PM_GUARD;
    const gender = guard?.female ? 1 : 0;
    const names = pmnames[mndx];
    if (names && names[gender]) {
        return String(names[gender]).toLowerCase();
    }
    return 'guard';
}

/**
 * Remove guard from fmon (full mongone deferred).
 * C ref: mon.c mongone — subset for invault early exits / restfakecorr.
 */
function mongone_guard(mtmp) {
    if (!mtmp) return;
    const ox = mtmp.mx | 0;
    const oy = mtmp.my | 0;
    const list = game.fmon || [];
    const i = list.indexOf(mtmp);
    if (i >= 0) list.splice(i, 1);
    mtmp.mx = 0;
    mtmp.my = 0;
    mtmp.isgd = 0;
    if (ox || oy) newsym(ox, oy);
}

/** C ref: dungeon.c on_level */
function on_level(a, b) {
    return !!a && !!b
        && (a.dnum | 0) === (b.dnum | 0)
        && (a.dlevel | 0) === (b.dlevel | 0);
}

/**
 * C ref: vault.c blackout — unlit STONE + clear seenv from restored cell
 * and its 8-neighbourhood (scroll/wand of light must not linger).
 */
function blackout(x, y) {
    for (let i = (x | 0) - 1; i <= (x | 0) + 1; i++) {
        for (let j = (y | 0) - 1; j <= (y | 0) + 1; j++) {
            if (!isok(i, j)) continue;
            const lev = game.level?.at?.(i, j);
            if (!lev) continue;
            if ((lev.typ | 0) === STONE) {
                lev.lit = 0;
                lev.waslit = 0;
            }
            unset_seenv(lev, x, y, i, j);
        }
    }
}

/**
 * C ref: vault.c clear_fcorr — restore fakecorr cells to saved typ/flags.
 * Non-guard occupant: tame yelp, rloc, else limbo (mon.js edge dynamic —
 * vault→mon static is a CHECK verdict), then keep clearing in C order.
 * Punished/uball arm stays deferred (above).
 * @returns {Promise<boolean>} true if fully cleared
 */
export async function clear_fcorr(grd, forceshow) {
    const egrd = EGD(grd);
    if (!egrd) return true;
    const u = game.u;
    if (!on_level(egrd.gdlevel, u?.uz)) return true;

    let sawcorridor = false;
    while ((egrd.fcbeg | 0) < (egrd.fcend | 0)) {
        const fcbeg = egrd.fcbeg | 0;
        const fc = egrd.fakecorr[fcbeg];
        if (!fc) {
            egrd.fcbeg = fcbeg + 1;
            continue;
        }
        const fcx = fc.fx | 0;
        const fcy = fc.fy | 0;
        const dead = (grd.mhp | 0) < 1;
        let force = forceshow;
        if ((dead || !in_fcorridor(grd, u.ux, u.uy)) && egrd.gddone) {
            force = true;
        }
        // Punished/uball arm deferred
        if ((u_at(fcx, fcy) && !dead)
            || (!force && couldsee(fcx, fcy))) {
            return false;
        }

        let monThere = null;
        for (const m of game.fmon || []) {
            if ((m.mx | 0) === fcx && (m.my | 0) === fcy && (m.mhp | 0) > 0) {
                monThere = m;
                break;
            }
        }
        /* C vault.c:80–87 — move the occupant aside, then keep clearing. */
        if (monThere) {
            if (monThere.isgd) return false;
            if (monThere.mtame) await yelp(monThere);
            if (!(await rloc(monThere, RLOC_MSG))) {
                const { m_into_limbo } = await import('./mon.js');
                await m_into_limbo(monThere);
            }
        }

        const lev = game.level?.at?.(fcx, fcy);
        if (lev) {
            if ((lev.typ | 0) === CORR && cansee(fcx, fcy)) sawcorridor = true;
            const ftyp = fc.ftyp | 0;
            lev.typ = ftyp;
            if (IS_DOOR(ftyp)) lev.doormask = fc.flags | 0;
            else lev.flags = fc.flags | 0;
            if (IS_STWALL(ftyp)) {
                const trap = t_at(fcx, fcy);
                if (trap) deltrap(trap);
                if (ftyp === STONE) blackout(fcx, fcy);
            }
            del_engr_at(fcx, fcy);
            // C: map_location(..., 1) — bypass vision (not newsym)
            map_location(fcx, fcy, 1);
            recalc_block_point(fcx, fcy);
            game.vision_full_recalc = 1;
        }
        egrd.fcbeg = fcbeg + 1;
    }
    // pline_The("corridor disappears.") / encased deferred
    void sawcorridor;
    return true;
}

/**
 * C ref: vault.c restfakecorr — clear temporary corridor; mongone guard.
 */
async function restfakecorr(grd) {
    if (await clear_fcorr(grd, false)) {
        grd.isgd = 0;
        mongone_guard(grd);
    }
}

/**
 * C ref: vault.c parkguard — park escort at <0,0> until corridor clears.
 * Named omission: polearm.hitmon clear; level.monsters[][] grid.
 */
export function parkguard(grd) {
    if (!grd) return;
    const ox = grd.mx | 0;
    const oy = grd.my | 0;
    grd.mx = 0;
    grd.my = 0;
    if (ox) newsym(ox, oy);
    const egrd = EGD(grd);
    if (egrd) {
        egrd.ogx = 0;
        egrd.ogy = 0;
    }
}

/**
 * C ref: vault.c move_gold `:632–643` (D-1946).
 * Floor gold at a wallified boundary cell is lifted and re-placed at the
 * vault's near corner (`rooms[vroom].lx + rn2(2)`, `ly + rn2(2)`), then
 * merged into any pile there. C order: remove_object → newsym(old) →
 * rn2(2) ×2 → place_object → stackobj → newsym(new).
 * C `remove_object` ≡ JS `obj_extract_self` floor arm (mkobj.c; see
 * ball.js note): unlink nexthere + nobj(fobj), boulder recalc, timed
 * check. ox/oy are saved before extract (C preserves them; JS does too).
 */
export function move_gold(gold, vroom) {
    if (!gold) return;
    const ox = gold.ox | 0;
    const oy = gold.oy | 0;
    obj_extract_self(gold);
    newsym(ox, oy);
    const rooms = game.level?.rooms || [];
    const rm = rooms[vroom | 0] || {};
    const nx = (rm.lx | 0) + rn2(2);
    const ny = (rm.ly | 0) + rn2(2);
    place_object(gold, nx, ny);
    stackobj(gold);
    newsym(nx, ny);
}

/**
 * C ref: vault.c wallify_vault `:646–731` — restore vault-room boundary walls.
 * C order: boundary-ring scan (skip interior); non-wall-or-gold-or-rock
 * cells outside fakecorr → tame yelp + rloc else limbo, move_gold into the
 * vault, subsume ROCK/BOULDER via extract+obfree, deltrap, corner/HWALL/
 * VWALL typ by side + wall_info=0, del_engr_at, IN_SIGHT|COULD_SEE newsym
 * pulse with viz restore, block_point; tail whisper vs distant-chant +
 * gold-moved + walls-restored plines.
 * `xy_set_wall_state` stays deferred (mklev.js file-local; invault same).
 * `m_at`/`obfree` are static imports (`imports.mjs --can` → SAFE, hoisted,
 * same SCC); `m_into_limbo` stays dynamic (clear_fcorr idiom).
 */
async function wallify_vault(grd) {
    const egrd = EGD(grd);
    if (!egrd) return;
    const vlt = egrd.vroom | 0;
    const rooms = game.level?.rooms || [];
    const rm = rooms[vlt];
    if (!rm) return;
    const lox = (rm.lx | 0) - 1;
    const hix = (rm.hx | 0) + 1;
    const loy = (rm.ly | 0) - 1;
    const hiy = (rm.hy | 0) + 1;
    let fixed = false;
    let movedgold = false;

    for (let x = lox; x <= hix; x++) {
        for (let y = loy; y <= hiy; y++) {
            /* if not on the room boundary, skip ahead */
            if (x !== lox && x !== hix && y !== loy && y !== hiy) continue;
            const lev = game.level?.at?.(x, y);
            if (!lev) continue;

            if ((!IS_WALL(lev.typ | 0) || g_at(x, y)
                 || sobj_at(ROCK, x, y) || sobj_at(BOULDER, x, y))
                && !in_fcorridor(grd, x, y)) {
                const mon = m_at(x, y);
                if (mon && mon !== grd) {
                    if (mon.mtame) await yelp(mon);
                    if (!(await rloc(mon, RLOC_MSG))) {
                        const { m_into_limbo } = await import('./mon.js');
                        await m_into_limbo(mon);
                    }
                }
                /* move gold at wall locations into the vault */
                const gold = g_at(x, y);
                if (gold) {
                    move_gold(gold, EGD(grd).vroom);
                    movedgold = true;
                }
                /* destroy rocks and boulders (subsume them into the
                   walls); other objects stay intact and become embedded */
                let rocks = sobj_at(ROCK, x, y);
                while (rocks) {
                    obj_extract_self(rocks);
                    obfree(rocks, null);
                    rocks = sobj_at(ROCK, x, y);
                }
                rocks = sobj_at(BOULDER, x, y);
                while (rocks) {
                    obj_extract_self(rocks);
                    obfree(rocks, null);
                    rocks = sobj_at(BOULDER, x, y);
                }
                const trap = t_at(x, y);
                if (trap) deltrap(trap);

                let typ;
                if (x === lox) {
                    typ = (y === loy) ? TLCORNER
                        : (y === hiy) ? BLCORNER
                        : VWALL;
                } else if (x === hix) {
                    typ = (y === loy) ? TRCORNER
                        : (y === hiy) ? BRCORNER
                        : VWALL;
                } else {
                    /* not left or right side, must be top or bottom */
                    typ = HWALL;
                }

                lev.typ = typ;
                lev.wall_info = 0;
                /* xy_set_wall_state deferred (mklev.js local clone) */
                del_engr_at(x, y);
                /*
                 * hack: player knows walls are restored because of the
                 * message, below, so show this on the screen.
                 */
                const row = game.viz_array?.[y];
                const tmp_viz = row ? row[x] : undefined;
                if (row) row[x] = IN_SIGHT | COULD_SEE;
                newsym(x, y);
                if (row) row[x] = tmp_viz;
                block_point(x, y);
                fixed = true;
            }
        }
    }

    if (movedgold || fixed) {
        if (in_fcorridor(grd, grd.mx, grd.my) || cansee(grd.mx, grd.my)) {
            await pline(`${noit_Monnam(grd)} whispers an incantation.`);
        } else {
            await You_hear('a distant chant.');
        }
        if (movedgold) {
            await pline('A mysterious force moves the gold into the vault.');
        }
        if (fixed) {
            /* C pline_The renders with the The-phrase as plain pline */
            await pline("The damaged vault's walls are magically restored!");
        }
    }
}

/**
 * C ref: vault.c gd_move_cleanup — park, wallify, restfakecorr, Suddenly.
 * @returns {Promise<number>} 1 moved/cleanup msg, -2 died/gone silent
 */
async function gd_move_cleanup(grd, semi_dead, disappear_msg_seen) {
    const x = grd.mx | 0;
    const y = grd.my | 0;
    const see_guard = canspotmon(grd);
    parkguard(grd);
    await wallify_vault(grd);
    await restfakecorr(grd);
    const u = game.u;
    if (!semi_dead && u
        && (in_fcorridor(grd, u.ux, u.uy) || cansee(x, y))) {
        if (!disappear_msg_seen && see_guard) {
            await pline(`Suddenly, ${noit_mon_nam(grd)} disappears.`);
            // C capture shows --More-- at this nhgetch (cursor on topline).
            // Equivalent to display_nhwindow(WIN_MESSAGE) when NEED_MORE
            // (wintty.c); vault.c only plines — tty blocks before next cmd.
            await flush_topl_more();
        }
        return 1;
    }
    return -2;
}

/**
 * C ref: vault.c vault_occupied — first urooms entry whose rtype is VAULT.
 * Returns room char code, or 0.
 */
export function vault_occupied(array) {
    const rooms = game.level?.rooms || [];
    const s = array || '';
    for (let i = 0; i < s.length; i++) {
        const ch = s.charCodeAt(i);
        const idx = ch - ROOMOFFSET;
        if (idx >= 0 && idx < rooms.length
            && (rooms[idx]?.rtype | 0) === VAULT) {
            return ch;
        }
    }
    return 0;
}

/**
 * C ref: vault.c findgd `:204–232` — first isgd on fmon for this level
 * (parked-at-<0,0> guard healed to full when not yet done), else first
 * isgd waiting on migrating_mons, moved to fmon at <0,0> via parkguard.
 * (JS fmon/migrating_mons are arrays: C nmon splice ≡ splice/unshift.)
 */
export function findgd() {
    const uz = game.u?.uz;
    for (const mtmp of game.fmon || []) {
        if (!mtmp?.isgd) continue;
        const gdlevel = EGD(mtmp)?.gdlevel;
        if (gdlevel
            && ((gdlevel.dnum | 0) !== (uz?.dnum | 0)
                || (gdlevel.dlevel | 0) !== (uz?.dlevel | 0))) {
            continue;
        }
        // C: if (!mtmp->mx && !EGD(mtmp)->gddone) mtmp->mhp = mtmp->mhpmax
        if (!(mtmp.mx | 0) && !EGD(mtmp)?.gddone) {
            mtmp.mhp = mtmp.mhpmax;
        }
        return mtmp;
    }
    // C: if not on fmon, look for a guard waiting to migrate to this level
    const mig = game.migrating_mons || [];
    for (let i = 0; i < mig.length; i++) {
        const mtmp = mig[i];
        if (!mtmp?.isgd) continue;
        const gdlevel = EGD(mtmp)?.gdlevel;
        if (gdlevel
            && ((gdlevel.dnum | 0) !== (uz?.dnum | 0)
                || (gdlevel.dlevel | 0) !== (uz?.dlevel | 0))) {
            continue;
        }
        // C: unlink from migrating_mons, prepend to fmon (simplified
        // mon_arrive: park at <0,0>, never into limbo).
        mig.splice(i, 1);
        (game.fmon || (game.fmon = [])).unshift(mtmp);
        mon_track_clear(mtmp);
        mtmp.mux = game.u?.ux | 0;
        mtmp.muy = game.u?.uy | 0;
        mtmp.mx = mtmp.my = 0; // C: not on map (mx already 0)
        parkguard(mtmp);
        return mtmp;
    }
    return null;
}

/**
 * C ref: vault.c vault_summon_gd — cursed tin whistle in a vault.
 * If occupied and no live guard, bump uinvault so invault summons soon.
 */
export function vault_summon_gd() {
    const u = game.u || (game.u = {});
    if (vault_occupied(u.urooms) && !findgd()) {
        u.uinvault = (VAULT_GUARD_TIME - 1) | 0;
    }
}

/**
 * C ref: vault.c uleftvault — hero teleported out of vault with a live
 * guard. Gold (invent or hidden_gold(TRUE)) and not adjacent → irate +
 * mpeaceful=0 (bypass setmangry); if dest is outside fakecorr, extra
 * gd_move (hostile rloc / wallify_vault / gd_letknow arms live, D-2448).
 */
export async function uleftvault(grd) {
    // C: only called if caller checked vault_occupied + findgd
    if (!grd || !grd.isgd || (grd.mhp | 0) < 1) {
        // C: impossible("escaping vault without guard?");
        return;
    }
    const u = game.u || {};
    if ((money_cnt(game.invent) || hidden_gold(true))
        && um_dist(grd.mx, grd.my, 1)) {
        if (grd.mpeaceful) {
            if (canspotmon(grd)) {
                await pline(`${Monnam(grd)} becomes irate.`);
            }
            grd.mpeaceful = 0; // bypass setmangry()
        }
        if (!in_fcorridor(grd, u.ux, u.uy)) {
            await gd_move(grd);
        }
    }
}

/**
 * C ref: vault.c vault_gd_watching — mark vault guard witness bits when
 * the guard can see the hero (eat/destroy gold).
 * Branch envelope: findgd + mx + mcansee + m_canseeu → EGD.witness for
 * GD_EATGOLD / GD_DESTROYGOLD.
 */
export function vault_gd_watching(activity) {
    const guard = findgd();
    if (guard && (guard.mx | 0) && guard.mcansee && m_canseeu(guard)) {
        if ((activity | 0) === GD_EATGOLD
            || (activity | 0) === GD_DESTROYGOLD) {
            const egd = EGD(guard);
            if (egd) egd.witness = activity | 0;
        }
    }
}

/**
 * C ref: vault.c find_guard_dest — nearest CORR approachable from hero.
 * Named omission: tele() fallback when no corridor exists.
 * Approachability failure uses C `goto incr_radius` (abandon current dd
 * ring), not a per-cell continue.
 */
function find_guard_dest(guard, dest) {
    for (let dd = 2; dd < ROWNO || dd < COLNO; dd++) {
        let skip_ring = false;
        ring: for (let y = (game.u.uy | 0) - dd; y <= (game.u.uy | 0) + dd; y++) {
            if (y < 0 || y > ROWNO - 1) continue;
            for (let x = (game.u.ux | 0) - dd; x <= (game.u.ux | 0) + dd; x++) {
                if (y !== (game.u.uy | 0) - dd && y !== (game.u.uy | 0) + dd
                    && x !== (game.u.ux | 0) - dd) {
                    x = (game.u.ux | 0) + dd;
                }
                if (x < 1 || x > COLNO - 1) continue;
                if (guard && ((x === (guard.mx | 0) && y === (guard.my | 0))
                    || (guard.isgd && in_fcorridor(guard, x, y)))) {
                    continue;
                }
                const loc = game.level?.at?.(x, y);
                if ((loc?.typ | 0) === CORR) {
                    const lx = (x < game.u.ux) ? x + 1
                        : (x > game.u.ux) ? x - 1 : x;
                    const ly = (y < game.u.uy) ? y + 1
                        : (y > game.u.uy) ? y - 1 : y;
                    const adj = game.level?.at?.(lx, ly);
                    const atyp = adj?.typ | 0;
                    // C: != STONE && != CORR → goto incr_radius
                    if (atyp !== STONE && atyp !== CORR) {
                        skip_ring = true;
                        break ring;
                    }
                    dest.x = x;
                    dest.y = y;
                    return true;
                }
            }
        }
        void skip_ring;
    }
    return false;
}

/** C ref: vault.c in_fcorridor — fakecorr occupancy check. */
function in_fcorridor(grd, x, y) {
    const egrd = EGD(grd);
    if (!egrd?.fakecorr) return false;
    const beg = egrd.fcbeg | 0;
    const end = egrd.fcend | 0;
    for (let i = beg; i < end; i++) {
        const fc = egrd.fakecorr[i];
        if (fc && (fc.fx | 0) === (x | 0) && (fc.fy | 0) === (y | 0)) {
            return true;
        }
    }
    return false;
}

/**
 * C ref: vault.c invault — timer + spawn vault guard + name dialogue.
 * Branch envelope: occupancy gate; death-count reluctance; timer;
 * find_guard_dest + wall walk; makemon(PM_GUARD, MM_EGD|MM_NOMSG);
 * appear pline; getlin name; gold demand; fakecorr door breech.
 * Named omissions: see file header.
 */
export async function invault() {
    const u = game.u;
    if (!u) return;

    let vaultroom = vault_occupied(u.urooms) | 0;
    if (!vaultroom) {
        u.uinvault = 0;
        return;
    }

    const vgdeathcount = game.mvitals?.[PM_GUARD]?.died | 0;
    if (vgdeathcount < 2
        || (vgdeathcount < 50 && !rn2(vgdeathcount * vgdeathcount))) {
        u.uinvault = (u.uinvault | 0) + 1;
    }
    if ((u.uinvault | 0) < VAULT_GUARD_TIME
        || ((u.uinvault | 0) % (VAULT_GUARD_TIME / 2)) !== 0) {
        return;
    }

    let guard = findgd();
    if (guard) return;

    const dest = { x: 0, y: 0 };
    if (!find_guard_dest(null, dest)) return;
    const gdx = dest.x | 0;
    const gdy = dest.y | 0;
    vaultroom -= ROOMOFFSET;

    let x = u.ux | 0;
    let y = u.uy | 0;
    const typAt = (cx, cy) => game.level?.at?.(cx, cy)?.typ | 0;

    if (typAt(x, y) !== ROOM) {
        if (typAt(x + 1, y) === ROOM) x += 1;
        else if (typAt(x, y + 1) === ROOM) y += 1;
        else if (typAt(x - 1, y) === ROOM) x -= 1;
        else if (typAt(x, y - 1) === ROOM) y -= 1;
        else if (typAt(x + 1, y + 1) === ROOM) { x += 1; y += 1; }
        else if (typAt(x - 1, y - 1) === ROOM) { x -= 1; y -= 1; }
        else if (typAt(x + 1, y - 1) === ROOM) { x += 1; y -= 1; }
        else if (typAt(x - 1, y + 1) === ROOM) { x -= 1; y += 1; }
    }
    while (typAt(x, y) === ROOM) {
        const dx = (gdx > x) ? 1 : (gdx < x) ? -1 : 0;
        const dy = (gdy > y) ? 1 : (gdy < y) ? -1 : 0;
        if (Math.abs(gdx - x) >= Math.abs(gdy - y)) x += dx;
        else y += dy;
    }
    if (u.ux === x && u.uy === y) {
        if (typAt(x + 1, y) === HWALL || typAt(x + 1, y) === DOOR) x += 1;
        else if (typAt(x - 1, y) === HWALL || typAt(x - 1, y) === DOOR) x -= 1;
        else if (typAt(x, y + 1) === VWALL || typAt(x, y + 1) === DOOR) y += 1;
        else if (typAt(x, y - 1) === VWALL || typAt(x, y - 1) === DOOR) y -= 1;
        else return;
    }

    guard = makemon(mons(PM_GUARD), x, y, MM_EGD | MM_NOMSG);
    if (!guard) return;

    guard.isgd = 1;
    guard.mpeaceful = 1;
    set_malign(guard);
    const egd = EGD(guard) || newegd(guard);
    egd.gddone = 0;
    egd.ogx = x;
    egd.ogy = y;
    egd.gdlevel = {
        dnum: u.uz?.dnum | 0,
        dlevel: u.uz?.dlevel | 0,
    };
    egd.vroom = vaultroom;
    egd.warncnt = 0;

    u.uinvault = (u.uinvault | 0) + 1;

    // boulder shatter / reset_faint deferred (no RNG when absent)

    const spotted = canspotmon(guard);
    if (spotted) {
        await pline(
            `Suddenly one of the Vault's ${makeplural(guard_pmname(guard))} enters!`,
        );
        newsym(guard.mx, guard.my);
    } else {
        await pline('Someone else has entered the Vault.');
        map_invisible(guard.mx, guard.my);
    }

    if (u.uswallow) {
        if (!Deaf()) await verbalize("What's going on here?");
        if (!spotted) await pline('The other presence vanishes.');
        mongone_guard(guard);
        return;
    }
    if (M_AP_TYPE(game.youmonst) === M_AP_OBJECT || u.uundetected) {
        if (M_AP_TYPE(game.youmonst) === M_AP_OBJECT
            && (game.youmonst?.mappearance | 0) !== GOLD_PIECE
            && !Deaf()) {
            await verbalize('Hey!  Who left that object in here?');
        }
        await pline(`Puzzled, ${mhe(guard)} turns around and leaves.`);
        mongone_guard(guard);
        return;
    }
    // Strangled / is_silent / multi<0 — leave and return
    if (u.Strangled || (game.multi | 0) < 0) {
        if (Deaf()) {
            await pline(`${noit_Monnam(guard)} huffs and turns to leave.`);
        } else {
            await verbalize("I'll be back when you're ready to speak to me!");
        }
        mongone_guard(guard);
        return;
    }

    if (typeof game.occupation === 'function') game.occupation = null;
    if ((game.multi | 0) > 0) {
        nomul(0);
    }

    let buf = '';
    let trycount = 5;
    do {
        buf = await getlin(
            Deaf()
                ? 'You are required to supply your name. -'
                : '"Hello stranger, who are you?" -',
        );
        if (buf === '\x1b') buf = '';
        buf = mungspaces(buf);
    } while (!buf && --trycount > 0);

    const plname = game.plname || '';
    if ((u.ualign?.type | 0) === A_LAWFUL
        && !strncmpi(buf, plname, plname.length)) {
        adjalign(-1);
    }

    if (strcmpi(buf, 'Croesus') || strcmpi(buf, 'Kroisos')
        || strcmpi(buf, 'Creosote')) {
        // Croesus alive → leave; dead → angry (mon_wield deferred)
        mongone_guard(guard);
        return;
    }

    if (Deaf()) {
        await pline(
            `${noit_Monnam(guard)} doesn't ${Blind() ? '' : 'appear to '}recognize you.`,
        );
    } else {
        await verbalize("I don't know you.");
    }

    const umoney = money_cnt(game.invent);
    if (!umoney && !hidden_gold(true)) {
        if (Deaf()) {
            await pline(
                `${noit_Monnam(guard)} stomps${Blind() ? '' : ' and beckons'}.`,
            );
        } else {
            await verbalize('Please follow me.');
        }
    } else {
        if (!umoney) {
            if (!Deaf()) await verbalize('You have hidden gold.');
        }
        if (Deaf()) {
            if (!Blind()) {
                await pline(
                    `${noit_Monnam(guard)} holds out his palm and beckons with his other hand.`,
                );
            }
        } else {
            await verbalize(
                'Most likely all your gold was stolen from this vault.',
            );
            await verbalize('Please drop that gold and follow me.');
        }
        egd.dropgoldcnt = (egd.dropgoldcnt | 0) + 1;
    }

    egd.gdx = gdx;
    egd.gdy = gdy;
    egd.fcbeg = 0;
    if (!egd.fakecorr) egd.fakecorr = [];
    egd.fakecorr[0] = {
        fx: x,
        fy: y,
        ftyp: 0,
        flags: 0,
    };

    let typ = typAt(x, y);
    const loc = game.level?.at?.(x, y);
    if (!IS_WALL(typ) && loc) {
        const rooms = game.level.rooms || [];
        const vlt = egd.vroom | 0;
        const room = rooms[vlt];
        if (room) {
            const lowx = room.lx | 0;
            const hix = room.hx | 0;
            const lowy = room.ly | 0;
            const hiy = room.hy | 0;
            if (x === lowx - 1 && y === lowy - 1) typ = TLCORNER;
            else if (x === hix + 1 && y === lowy - 1) typ = TRCORNER;
            else if (x === lowx - 1 && y === hiy + 1) typ = BLCORNER;
            else if (x === hix + 1 && y === hiy + 1) typ = BRCORNER;
            else if (y === lowy - 1 || y === hiy + 1) typ = HWALL;
            else if (x === lowx - 1 || x === hix + 1) typ = VWALL;
            loc.typ = typ;
            loc.wall_info = 0;
            // xy_set_wall_state deferred
        }
    }
    egd.fakecorr[0].ftyp = typ;
    egd.fakecorr[0].flags = loc?.flags | 0;
    if (loc) {
        loc.typ = DOOR;
        loc.doormask = D_NODOOR;
    }
    recalc_block_point(x, y);
    egd.fcend = 1;
    egd.warncnt = 1;
}

/** C ref: apply.c um_dist — true if Chebyshev distance to hero > n. */
function um_dist(x, y, n) {
    const u = game.u || {};
    return Math.abs((u.ux | 0) - (x | 0)) > n
        || Math.abs((u.uy | 0) - (y | 0)) > n;
}

/**
 * C ref: vault.c gd_mv_monaway `:734–750` — shove the occupant of the
 * guard's destination aside (Out-of-my-way verbalize, rloc, else limbo).
 * m_at is the MON_AT equivalent (live mons only, D-1565/D-1231).
 */
async function gd_mv_monaway(grd, nx, ny) {
    const mtmp = m_at(nx, ny);
    if (mtmp && mtmp !== grd) {
        if (!Deaf()) {
            SetVoice(grd, 0, 80, 0);
            await verbalize('Out of my way, scum!');
        }
        if (!(await rloc(mtmp, RLOC_ERR | RLOC_MSG)) || m_at(nx, ny)) {
            const { m_into_limbo } = await import('./mon.js');
            await m_into_limbo(mtmp);
        }
        recalc_block_point(nx, ny);
    }
}

/**
 * C ref: vault.c gd_pick_corridor_gold `:752–833` (staticfn) — guard
 * collects floor gold in the fake corridor: from under the hero (step
 * closer first when far and seen, up to 9 enexto tries), in place, or by
 * moving onto a third spot and back; seen pickup pline with calm-down
 * infix. C distu() is dist2-to-hero (hack.h:1531).
 */
async function gd_pick_corridor_gold(grd, goldx, goldy) {
    const u = game.u || {};
    const guardx = grd.mx | 0;
    const guardy = grd.my | 0;
    const under_u = u_at(goldx, goldy);
    const see_it = cansee(goldx, goldy);

    if (under_u) {
        const gold = g_at(goldx, goldy);
        if (!gold) {
            await impossible("vault guard: no gold at hero's feet?");
            return;
        }
        const gdelta = dist2(guardx, guardy, u.ux, u.uy);
        if (gdelta > 2 && see_it) {
            let bestdelta = gdelta;
            const bestcc = { x: guardx, y: guardy };
            const newcc = { x: 0, y: 0 };
            let tryct = 9;
            do {
                if (enexto(newcc, goldx, goldy, grd.data)) {
                    const newdelta = dist2(newcc.x, newcc.y, u.ux, u.uy);
                    if (newdelta < bestdelta
                        || (newdelta === bestdelta
                            && dist2(newcc.x, newcc.y, guardx, guardy)
                                < dist2(bestcc.x, bestcc.y, guardx, guardy))) {
                        bestdelta = newdelta;
                        bestcc.x = newcc.x;
                        bestcc.y = newcc.y;
                    }
                }
            } while (--tryct >= 0);

            if (bestdelta < gdelta) {
                remove_monster(guardx, guardy);
                newsym(guardx, guardy);
                place_monster(grd, bestcc.x, bestcc.y);
                newsym(grd.mx, grd.my);
            }
        }
        obj_extract_self(gold);
        add_to_minv(grd, gold);
        newsym(goldx, goldy);
    } else if ((goldx | 0) === guardx && (goldy | 0) === guardy) {
        await mpickgold(grd); /* does a newsym */
    } else {
        /* just for insurance... make room for guard */
        await gd_mv_monaway(grd, goldx, goldy);
        if (see_it) { /* skip if player won't see the message */
            remove_monster(grd.mx, grd.my);
            newsym(grd.mx, grd.my);
            place_monster(grd, goldx, goldy); /* sets grd.mx,my */
        }
        await mpickgold(grd); /* does a newsym */
    }

    if (see_it) { /* cansee(goldx, goldy) */
        const calm = (grd.mpeaceful && (EGD(grd)?.warncnt | 0) > 5)
            ? ' calms down and' : '';
        await pline(
            `${Some_Monnam(grd)}${calm} picks up the gold${under_u ? ' from beneath you' : ''}.`,
        );
    }

    /* if guard was moved to get the gold, move him back */
    if ((grd.mx | 0) !== guardx || (grd.my | 0) !== guardy) {
        remove_monster(grd.mx, grd.my);
        newsym(grd.mx, grd.my);
        place_monster(grd, guardx, guardy);
        newsym(guardx, guardy);
    }
}

/**
 * C ref: vault.c gd_letknow `:869–886` (staticfn) — unseen guard: whistle
 * vs shouting heard; seen: approaching vs confronted with angry x_monnam.
 */
async function gd_letknow(grd) {
    if (!cansee(grd.mx, grd.my) || !mon_visible(grd)) {
        await You_hear(
            `${m_carrying(grd, TIN_WHISTLE)
                ? "the shrill sound of a guard's whistle"
                : 'angry shouting'}.`,
        );
    } else {
        const xn = x_monnam(grd, ARTICLE_A, 'angry', 0, false);
        await You(
            um_dist(grd.mx, grd.my, 2)
                ? `see ${xn} approaching.`
                : `are confronted by ${xn}.`,
        );
    }
}

/**
 * C ref: vault.c gd_move `:973–978` + `:990–994` restore tail — put back
 * fakecorr[0]'s saved typ/flags at the guard's old cell. rm.h:213
 * (doormask IS flags): a DOOR ftyp restores its doormask, like
 * clear_fcorr's IS_DOOR split.
 */
function restore_fakecorr0(egrd, m, n) {
    const fc0 = egrd.fakecorr?.[0];
    const cell = game.level?.at?.(m, n);
    if (!cell || !fc0) return;
    cell.typ = fc0.ftyp | 0;
    if (IS_DOOR(cell.typ)) cell.doormask = fc0.flags | 0;
    else cell.flags = fc0.flags | 0;
}

/**
 * C ref: vault.c gd_move `:888–1201` — whole body in C order: off-level /
 * dead-at-<0,0> cleanup; wallify when both out; hostile rloc/wallify/
 * clear_fcorr/gd_letknow arms; teleported-guard reject; witness scold;
 * fcend==1 follow-me (warncnt 3) / warn-knave (7 + mnexto + restore) /
 * fainted-or-multi warncnt++ / teleported-gold rloc+restore+gd_letknow /
 * Well-begone cleanup; fcend>1 corridor-disappears + gold warn (6) /
 * hostile (So-be-it) arms; goldincorridor scan + gd_pick_corridor_gold;
 * um_dist Move-along + restfakecorr; look-around → proceed/newpos;
 * nextpos dig while-loop + fakecorr append (FCSIZ throw ≡ panic) +
 * stuck find_guard_dest retry; newpos monaway + remove/place +
 * mpickgold + restfakecorr.
 * Named omissions: debugpline1 wizard log; defensive !isok/!crm early-0
 * in the dig loop (C in-bounds by construction); clear_fcorr
 * Punished/uball arm (occupant yelp/rloc/limbo live).
 * rm.h:213 `doormask IS flags` — a fresh-DOOR fakecorr entry stores its
 * doormask, read back with the clear_fcorr IS_DOOR split.
 *
 * @returns {Promise<number>} 1 moved, 0 stayed, -1 normal AI, -2 died
 */
export async function gd_move(grd) {
    const egrd = EGD(grd);
    if (!egrd) return -1;
    const u = game.u || {};

    if (!on_level(egrd.gdlevel, u.uz)) return -1; // :893-894

    const semi_dead = (grd.mhp | 0) < 1;
    if (semi_dead || !(grd.mx | 0) || egrd.gddone) { // :896-899
        egrd.gddone = 1;
        return await gd_move_cleanup(grd, semi_dead, false);
    }

    const u_in_vault = vault_occupied(u.urooms) ? true : false; // :907
    const grd_in_vault = in_rooms(grd.mx, grd.my, VAULT) // :908
        ? true : false;
    if (!u_in_vault && !grd_in_vault) await wallify_vault(grd); // :909-911

    if (!grd.mpeaceful) { // :913-928
        if (!u_in_vault
            && (grd_in_vault || (in_fcorridor(grd, grd.mx, grd.my)
                && !in_fcorridor(grd, u.ux, u.uy)))) {
            await rloc(grd, RLOC_MSG);
            await wallify_vault(grd);
            if (!in_fcorridor(grd, grd.mx, grd.my)) {
                await clear_fcorr(grd, true);
            }
            await gd_letknow(grd);
            return -1;
        }
        if (!in_fcorridor(grd, grd.mx, grd.my)) {
            await clear_fcorr(grd, true);
        }
        return -1;
    }
    if (Math.abs((egrd.ogx | 0) - (grd.mx | 0)) > 1 // :934-935
        || Math.abs((egrd.ogy | 0) - (grd.my | 0)) > 1) {
        return -1; /* teleported guard - treat as monster */
    }

    if (egrd.witness) { // :937-947
        if (!Deaf()) {
            SetVoice(grd, 0, 80, 0);
            await verbalize(
                `How dare you ${((egrd.witness | 0) & GD_EATGOLD) ? 'consume' : 'destroy'} that gold, scoundrel!`,
            );
        }
        egrd.witness = 0;
        grd.mpeaceful = 0;
        return -1;
    }

    const umoney = money_cnt(game.invent); // :949-950
    const u_carry_gold = umoney > 0 || hidden_gold(true) > 0;

    if ((egrd.fcend | 0) === 1) { // :951
        if (u_in_vault && (u_carry_gold || um_dist(grd.mx, grd.my, 1))) { // :952
            if ((egrd.warncnt | 0) === 3 && !Deaf()) { // :953-962
                const buf = `${u_carry_gold
                    ? (!umoney ? 'drop that hidden gold and '
                        : 'drop that gold and ')
                    : ''}follow me!`;
                SetVoice(grd, 0, 80, 0);
                if (egrd.dropgoldcnt || !u_carry_gold) {
                    await verbalize(`I repeat, ${buf}`);
                } else {
                    await verbalize(upstart(buf));
                }
                if (u_carry_gold) {
                    egrd.dropgoldcnt = (egrd.dropgoldcnt | 0) + 1;
                }
            }
            if ((egrd.warncnt | 0) === 7) { // :963-984
                const m = grd.mx | 0;
                const n = grd.my | 0;
                if (!Deaf()) {
                    SetVoice(grd, 0, 80, 0);
                    await verbalize("You've been warned, knave!");
                }
                grd.mpeaceful = 0;
                await mnexto(grd, RLOC_NOMSG);
                restore_fakecorr0(egrd, m, n);
                recalc_block_point(m, n); /* guard corridor goes away */
                del_engr_at(m, n);
                newsym(m, n);
                return -1;
            }
            /* not fair to get mad when (s)he's fainted or paralyzed */
            if (!is_fainted() && (game.multi | 0) >= 0) { // :985-987
                egrd.warncnt = (egrd.warncnt | 0) + 1;
            }
            return 0;
        }

        if (!u_in_vault) { // :990
            if (u_carry_gold) { /* player teleported */ // :991-998
                const m = grd.mx | 0;
                const n = grd.my | 0;
                await rloc(grd, RLOC_MSG);
                restore_fakecorr0(egrd, m, n);
                recalc_block_point(m, n); /* guard corridor goes away */
                del_engr_at(m, n);
                newsym(m, n);
                grd.mpeaceful = 0;
                await gd_letknow(grd);
                return -1;
            }
            if (!Deaf()) { // :999-1006
                SetVoice(grd, 0, 80, 0);
                await verbalize('Well, begone.');
            }
            egrd.gddone = 1;
            return await gd_move_cleanup(grd, semi_dead, false);
        }
    }

    if ((egrd.fcend | 0) > 1) { // :1009
        if ((egrd.fcend | 0) > 2 && in_fcorridor(grd, grd.mx, grd.my) // :1010-1017
            && !egrd.gddone && !in_fcorridor(grd, u.ux, u.uy)
            && ((game.level?.at?.(egrd.fakecorr[0].fx, egrd.fakecorr[0].fy)?.typ | 0)
                === (egrd.fakecorr[0].ftyp | 0))) {
            await pline(`${noit_Monnam(grd)}, confused, disappears.`);
            return await gd_move_cleanup(grd, semi_dead, true);
        }
        if (u_carry_gold && (in_fcorridor(grd, u.ux, u.uy) // :1018-1020
            /* cover a 'blind' spot */
            || ((egrd.fcend | 0) > 1 && u_in_vault))) {
            if (!(grd.mx | 0)) { // :1021-1023
                await restfakecorr(grd);
                return -2;
            }
            if ((egrd.warncnt | 0) < 6) { // :1024-1034
                egrd.warncnt = 6;
                if (Deaf()) {
                    if (!Blind()) {
                        await pline(
                            `${noit_Monnam(grd)} holds out ${noit_mhis(grd)} palm demandingly!`,
                        );
                    }
                } else {
                    SetVoice(grd, 0, 80, 0);
                    await verbalize('Drop all your gold, scoundrel!');
                }
                return 0;
            }
            if (Deaf()) { // :1035-1049
                if (!Blind()) {
                    await pline(
                        `${noit_Monnam(grd)} rubs ${noit_mhis(grd)} hands with enraged delight!`,
                    );
                }
            } else {
                SetVoice(grd, 0, 80, 0);
                await verbalize('So be it, rogue!');
            }
            grd.mpeaceful = 0;
            return -1;
        }
    }

    let m = 0; // :1051-1057
    let n = 0;
    let goldincorridor = false;
    for (let fci = egrd.fcbeg | 0; fci < (egrd.fcend | 0); fci++) {
        if (g_at(egrd.fakecorr[fci].fx, egrd.fakecorr[fci].fy)) {
            m = egrd.fakecorr[fci].fx;
            n = egrd.fakecorr[fci].fy;
            goldincorridor = true;
            break;
        }
    }
    /* new gold can appear if it was embedded in stone and hero kicks it
       (on even via wish and drop) so don't assume hero has been warned */
    if (goldincorridor && !egrd.gddone) { // :1059-1065
        await gd_pick_corridor_gold(grd, m, n);
        if (!grd.mpeaceful) return -1;
        egrd.warncnt = 5;
        return 0;
    }
    if (um_dist(grd.mx, grd.my, 1) || egrd.gddone) { // :1066-1074
        if (!egrd.gddone && !rn2(10) && !Deaf() && !u.uswallow
            && !(u.ustuck && !sticks(game.youmonst?.data))) {
            SetVoice(grd, 0, 80, 0);
            await verbalize('Move along!');
        }
        await restfakecorr(grd);
        return 0; /* didn't move */
    }

    const x = grd.mx | 0; // :1075-1076
    const y = grd.my | 0;
    let nx = x;
    let ny = y;
    let typ = 0;
    let newspot = false;

    // C look-around `:1080–1110` (hor & vert only): goto proceed
    // (convert + proceed) or goto newpos (accessible + gddone set →
    // monaway + cleanup), else fall through to nextpos.
    let phase = u_in_vault ? 'nextpos' : 'look';
    if (phase === 'look') {
        phase = 'nextpos';
        look: for (let lx = x - 1; lx <= x + 1; lx++) {
            for (let ly = y - 1; ly <= y + 1; ly++) {
                if ((lx === x || ly === y) && (lx !== x || ly !== y)
                    && isok(lx, ly)) {
                    const cell = game.level?.at?.(lx, ly);
                    if (!cell) continue;
                    typ = cell.typ | 0;
                    if (!IS_STWALL(typ) && !IS_POOL(typ)) {
                        if (in_fcorridor(grd, lx, ly)) continue; // nextnxy
                        if (in_rooms(lx, ly, VAULT)) continue;
                        /* seems we found a good place to leave him alone */
                        egrd.gddone = 1;
                        nx = lx;
                        ny = ly;
                        if (ACCESSIBLE(typ)) {
                            // C goto newpos, gddone set → monaway + cleanup
                            await gd_mv_monaway(grd, nx, ny);
                            return await gd_move_cleanup(grd, semi_dead, false);
                        }
                        cell.typ = (typ === SCORR) ? CORR : DOOR;
                        if (cell.typ === DOOR) cell.doormask = D_NODOOR;
                        else cell.flags = 0;
                        del_engr_at(lx, ly);
                        phase = 'proceed'; // C goto proceed
                        break look;
                    }
                }
            }
        }
    }

    for (;;) {
        if (phase === 'nextpos') {
            // C nextpos `:1111–1126`: one step toward gdx,gdy.
            nx = x;
            ny = y;
            const ggx = egrd.gdx | 0;
            const ggy = egrd.gdy | 0;
            const dx = (ggx > x) ? 1 : (ggx < x) ? -1 : 0;
            let dy = (ggy > y) ? 1 : (ggy < y) ? -1 : 0;
            if (Math.abs(ggx - x) >= Math.abs(ggy - y)) nx += dx;
            else ny += dy;

            let crm = null;
            for (;;) { // C dig while-loop `:1127–1156`
                if (!isok(nx, ny)) return 0; // defensive
                crm = game.level?.at?.(nx, ny);
                if (!crm) return 0; // defensive
                typ = crm.typ | 0;
                if (typ === STONE) break;
                const ex = nx + nx - x;
                const ey = ny + ny - y;
                /* in view of the above we must have IS_WALL(typ) or typ == POOL */
                /* must be a wall here */
                if (isok(ex, ey)
                    && IS_ROOM(game.level?.at?.(ex, ey)?.typ | 0)) {
                    crm.typ = DOOR;
                    crm.doormask = D_NODOOR;
                    del_engr_at(ex, ey);
                    break; // goto proceed
                }
                if (dy && nx !== x) {
                    nx = x;
                    ny = y + dy;
                    continue;
                }
                if (dx && ny !== y) {
                    ny = y;
                    nx = x + dx;
                    dy = 0;
                    continue;
                }
                /* I don't like this, but ... */
                if (IS_ROOM(typ)) {
                    crm.typ = DOOR;
                    crm.doormask = D_NODOOR;
                    del_engr_at(ex, ey);
                    break; // goto proceed
                }
                break;
            }
            if (typ === STONE && crm) { // C while-exit `:1156`
                crm.typ = CORR;
                crm.flags = 0;
            }
        }
        // C proceed `:1157–1181`
        newspot = true;
        unblock_point(nx, ny); /* doesn't block light */
        if (cansee(nx, ny)) newsym(nx, ny);

        const ggx = egrd.gdx | 0;
        const ggy = egrd.gdy | 0;
        if ((nx !== ggx || ny !== ggy)
            || ((grd.mx | 0) !== ggx || (grd.my | 0) !== ggy)) {
            /* fakecorr overflow does not occur because egrd->fakecorr[]
               is too small, but it has occurred when the same <x,y> are
               put into it repeatedly for some as yet unexplained reason */
            if (!egrd.fakecorr) egrd.fakecorr = [];
            const fi = egrd.fcend | 0;
            egrd.fcend = fi + 1;
            if (fi === FCSIZ) throw new Error('fakecorr overflow'); // C panic
            const cell = game.level?.at?.(nx, ny);
            egrd.fakecorr[fi] = {
                fx: nx,
                fy: ny,
                ftyp: typ,
                // C `fcp->flags = crm->flags`; doormask IS flags (rm.h:213).
                flags: (cell && (cell.typ | 0) === DOOR)
                    ? (cell.doormask | 0) : (cell?.flags | 0),
            };
        } else if (!egrd.gddone) {
            /* We're stuck, so try to find a new destination. */
            const dest = { x: 0, y: 0 };
            if (!find_guard_dest(grd, dest)
                || (dest.x === ggx && dest.y === ggy)) {
                await pline(`${Monnam(grd)}, confused, disappears.`);
                return await gd_move_cleanup(grd, semi_dead, true);
            }
            egrd.gdx = dest.x;
            egrd.gdy = dest.y;
            phase = 'nextpos';
            continue; // C goto nextpos
        }
        // C newpos `:1182–1201`
        await gd_mv_monaway(grd, nx, ny);
        if (egrd.gddone) return await gd_move_cleanup(grd, semi_dead, false);
        egrd.ogx = grd.mx; /* update old positions */
        egrd.ogy = grd.my;
        remove_monster(grd.mx, grd.my);
        place_monster(grd, nx, ny);
        if (newspot && g_at(nx, ny)) {
            /* if there's gold already here (most likely from mineralize()),
               pick it up now so that guard doesn't later think hero dropped
               it and give an inappropriate message */
            await mpickgold(grd);
            if (canspotmon(grd)) {
                await pline(`${Monnam(grd)} picks up some gold.`);
            }
        } else {
            newsym(grd.mx, grd.my);
        }
        await restfakecorr(grd);
        return 1;
    }
}

/**
 * C ref: vault.c paygd `:1204–1247`. Death/escape: if gold and a vault
 * guard exist, dump coins into the vault (or onto the hero when
 * uinvault) then mongone the guard. Peaceful off-vault guards take
 * gold via the remove_guard goto (no rn2). Hostile: mnexto, grave at
 * rooms[vroom].lx/ly + rn2(2) each, then place coins.
 * Named: grddead inside mongone (already named on mongone).
 * @param {boolean} silently
 */
export async function paygd(silently) {
    const grd = findgd();
    const umoney = money_cnt(game.invent);
    if (!umoney || !grd) return;

    // invent.js already imports hidden_gold from this file; mkobj/mon
    // sit on the same SCC. Load callees lazily so vault-first
    // evaluation does not TDZ objnam.
    const { freeinv, currency } = await import('./invent.js');
    const { place_object, stackobj } = await import('./mkobj.js');
    const { mongone, mnexto } = await import('./mon.js');

    const u = game.u || {};
    let gdx;
    let gdy;
    if (u.uinvault) {
        if (!silently) {
            await pline(
                `Your ${umoney} ${currency(umoney)} goes into the Magic Memory Vault.`,
            );
        }
        gdx = u.ux | 0;
        gdy = u.uy | 0;
    } else {
        if (grd.mpeaceful) {
            await mongone(grd);
            return;
        }
        await mnexto(grd, RLOC_NOMSG);
        if (!silently) {
            await pline(`${Monnam(grd)} remits your gold to the vault.`);
        }
        const rooms = game.level?.rooms || [];
        const rm = rooms[EGD(grd)?.vroom | 0] || {};
        gdx = (rm.lx | 0) + rn2(2);
        gdy = (rm.ly | 0) + rn2(2);
        const plname = game.plname || 'Player';
        const mndx = u.umonster ?? u.umonnum ?? game.urole?.mnum ?? 0;
        const buf = `To Croesus: here's the gold recovered from ${plname} the ${
            pmname(mndx, game.flags?.female ? FEMALE : MALE)
        }.`;
        make_grave(gdx, gdy, buf);
    }
    for (const coins of [...(game.invent || [])]) {
        if (!coins) continue;
        const oclass = game.objects?.[coins.otyp]?.oc_class ?? coins.oclass;
        if (oclass === COIN_CLASS) {
            freeinv(coins);
            place_object(coins, gdx, gdy);
            stackobj(coins);
        }
    }
    await mongone(grd);
}
