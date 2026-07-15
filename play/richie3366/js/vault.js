// vault.js — Vault occupancy and guard summoning.
// C ref: vault.c — vault_occupied, findgd, newegd, find_guard_dest, invault,
//        clear_fcorr, restfakecorr, gd_move dig + restore.
// Named omissions: migrating_mons findgd park; vault_summon_gd;
// uleftvault; wallify_vault body (cleanup calls stub); Croesus mon_wield;
// fracture_rock boulder shatter; reset_faint; SetVoice; spot_stop_timers;
// xy_set_wall_state; mimic_obj_name; full Deaf/Blind message variants that
// need noit_mhis; gd_move hostile/witness/goldincorridor;
// gd_mv_monaway; mpickgold; dig del_engr_at; confused-disappears arms;
// Well begone verbalize; clear_fcorr: Punished/uball, yelp/rloc/m_into_limbo,
// corridor-disappears / encased-in-rock pline.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { makemon, set_malign, newegd } from './makemon.js';
import {
    pline, flush_topl_more, newsym, canspotmon, map_invisible, verbalize,
    map_location, unset_seenv,
} from './display.js';
import { getlin } from './getline.js';
import { Monnam, noit_Monnam, noit_mon_nam } from './do_name.js';
import { adjalign } from './attrib.js';
import { nomul, in_rooms } from './hack.js';
import { makeplural } from './objnam.js';
import { cansee, couldsee, recalc_block_point } from './vision.js';
import { COIN_CLASS } from './objects.js';
import { del_engr_at } from './engrave.js';
import { t_at, deltrap } from './trap.js';
import {
    VAULT, VAULT_GUARD_TIME, ROOMOFFSET, COLNO, ROWNO,
    ROOM, CORR, SCORR, STONE, HWALL, VWALL, DOOR, D_NODOOR,
    TLCORNER, TRCORNER, BLCORNER, BRCORNER,
    MM_EGD, MM_NOMSG, IS_WALL, IS_DOOR, IS_STWALL, IS_POOL,
    M_AP_OBJECT, M_AP_TYPE, EGD, u_at,
    A_LAWFUL, Has_contents, IS_ROOM, ACCESSIBLE, isok,
} from './const.js';
import { monsterNames, mons, pmnames } from './monsters.js';
import { objectNames } from './generated/objects_data.js';

const PM_GUARD = monsterNames.indexOf('PM_GUARD');
const GOLD_PIECE = objectNames.indexOf('GOLD_PIECE');

/** C ref: invent.c money_cnt — invent is a JS array. */
function money_cnt(invent) {
    let sum = 0;
    for (const o of invent || []) {
        if (o.oclass === COIN_CLASS) sum += o.quan || 0;
    }
    return sum;
}

/** C ref: shk.c contained_gold — sum COIN_CLASS (+ nested) in container. */
function contained_gold(obj, even_if_unknown) {
    let value = 0;
    for (let otmp = obj?.cobj; otmp; otmp = otmp.nobj) {
        if (otmp.oclass === COIN_CLASS) value += otmp.quan || 0;
        else if (Has_contents(otmp) && (otmp.cknown || even_if_unknown)) {
            value += contained_gold(otmp, even_if_unknown);
        }
    }
    return value;
}

/** C ref: vault.c hidden_gold — gold inside carried containers. */
function hidden_gold(even_if_unknown) {
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

function mhe(mtmp) {
    if (!canspotmon(mtmp)) return 'it';
    return mtmp.female ? 'she' : 'he';
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
 * @returns {boolean} true if fully cleared
 */
function clear_fcorr(grd, forceshow) {
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
        if (monThere) {
            if (monThere.isgd) return false;
            // yelp / rloc / m_into_limbo deferred — cannot clear while occupied
            return false;
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
function restfakecorr(grd) {
    if (clear_fcorr(grd, false)) {
        grd.isgd = 0;
        mongone_guard(grd);
    }
}

/**
 * C ref: vault.c parkguard — park escort at <0,0> until corridor clears.
 * Named omission: polearm.hitmon clear; level.monsters[][] grid.
 */
function parkguard(grd) {
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
 * C ref: vault.c wallify_vault — restore vault-room boundary walls.
 * Stub: cleanup still parks + restfakecorr + Suddenly; wall repair /
 * whisper / distant-chant / gold-move plines deferred.
 */
function wallify_vault(_grd) {
    /* deferred */
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
    wallify_vault(grd);
    restfakecorr(grd);
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
 * C ref: vault.c findgd — first isgd on fmon for this level.
 * Named omission: migrating_mons park-at-<0,0> arm; mx/gddone heal.
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
        return mtmp;
    }
    return null;
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
 * C ref: vault.c gd_move — peaceful vault escort subset.
 * Branch envelope: on-level peaceful; fcend==1 warn when gold or not
 * adjacent; um_dist rn2(10) + Move along! verbalize + restfakecorr;
 * !u_in_vault look-around → gddone + gd_move_cleanup Suddenly;
 * adjacent dig while-loop (wall→DOOR if beyond ROOM, else ortho
 * redirect, else STONE→CORR) + place guard + restfakecorr;
 * early/gddone/begone → gd_move_cleanup.
 * Named omissions: hostile/witness/goldincorridor; wallify body;
 * other verbalize arms; gd_mv_monaway; mpickgold; stuck
 * find_guard_dest retry / confused disappears; dig del_engr_at;
 * clear_fcorr Punished/rloc/yelp arms; corridor-disappears /
 * encased pline; sticks() on ustuck (treat ustuck as blocking Move
 * along! like !sticks); Well begone verbalize.
 *
 * @returns {Promise<number>} 1 moved, 0 stayed, -1 normal AI, -2 died
 */
export async function gd_move(grd) {
    if (!grd?.isgd) return -1;
    const egrd = EGD(grd);
    if (!egrd) return -1;
    const u = game.u;
    if (!u) return -1;

    const gd = egrd.gdlevel;
    if (!gd || (gd.dnum | 0) !== (u.uz?.dnum | 0)
        || (gd.dlevel | 0) !== (u.uz?.dlevel | 0)) {
        return -1;
    }

    const semi_dead = (grd.mhp | 0) < 1;
    if (semi_dead || !(grd.mx | 0) || egrd.gddone) {
        egrd.gddone = 1;
        return await gd_move_cleanup(grd, semi_dead, false);
    }

    const u_in_vault = !!vault_occupied(u.urooms);
    if (!grd.mpeaceful) return -1;

    if (Math.abs((egrd.ogx | 0) - (grd.mx | 0)) > 1
        || Math.abs((egrd.ogy | 0) - (grd.my | 0)) > 1) {
        return -1;
    }

    if (egrd.witness) {
        egrd.witness = 0;
        grd.mpeaceful = 0;
        return -1;
    }

    const umoney = money_cnt(game.invent);
    const u_carry_gold = umoney > 0 || hidden_gold(true) > 0;

    if ((egrd.fcend | 0) === 1) {
        if (u_in_vault && (u_carry_gold || um_dist(grd.mx, grd.my, 1))) {
            if ((egrd.warncnt | 0) === 7) {
                grd.mpeaceful = 0;
                return -1;
            }
            if ((game.multi | 0) >= 0) egrd.warncnt = (egrd.warncnt | 0) + 1;
            return 0;
        }
        if (!u_in_vault) {
            if (u_carry_gold) {
                grd.mpeaceful = 0;
                return -1;
            }
            // C: verbalize("Well, begone.") deferred
            egrd.gddone = 1;
            return await gd_move_cleanup(grd, semi_dead, false);
        }
    }

    if (um_dist(grd.mx, grd.my, 1) || egrd.gddone) {
        // C vault.c ~1066–1071: !gddone && !rn2(10) && !Deaf &&
        // !uswallow && !(ustuck && !sticks) → verbalize; then restfakecorr.
        if (!egrd.gddone && !rn2(10) && !Deaf()
            && !u.uswallow && !u.ustuck) {
            await verbalize('Move along!');
        }
        restfakecorr(grd);
        return 0;
    }

    const x = grd.mx | 0;
    const y = grd.my | 0;
    let nx = x;
    let ny = y;
    let typ = 0;
    let action = 'corr'; // 'corr' | 'door'
    let skip_dig = false;

    // C vault.c ~1078–1110: !u_in_vault look-around (ortho only)
    if (!u_in_vault) {
        look: for (let lx = x - 1; lx <= x + 1; lx++) {
            for (let ly = y - 1; ly <= y + 1; ly++) {
                if ((lx === x || ly === y) && (lx !== x || ly !== y)
                    && isok(lx, ly)) {
                    const crm = game.level?.at?.(lx, ly);
                    if (!crm) continue;
                    const ltyp = crm.typ | 0;
                    if (!IS_STWALL(ltyp) && !IS_POOL(ltyp)) {
                        if (in_fcorridor(grd, lx, ly)) continue;
                        if (in_rooms(lx, ly, VAULT)) continue;
                        egrd.gddone = 1;
                        if (ACCESSIBLE(ltyp)) {
                            // C: goto newpos → gd_mv_monaway + cleanup
                            return await gd_move_cleanup(
                                grd, semi_dead, false,
                            );
                        }
                        // Non-accessible: convert SCORR→CORR else DOOR
                        // then fall into proceed (C goto proceed).
                        typ = ltyp;
                        nx = lx;
                        ny = ly;
                        if (ltyp === SCORR) {
                            crm.typ = CORR;
                            crm.flags = 0;
                            action = 'corr';
                        } else {
                            crm.typ = DOOR;
                            crm.doormask = D_NODOOR;
                            action = 'door';
                        }
                        del_engr_at(lx, ly);
                        skip_dig = true;
                        break look;
                    }
                }
            }
        }
    }

    if (!skip_dig) {
        // C nextpos: one step toward gdx,gdy, then dig while-loop may
        // redirect onto an alternate orthogonal cell (vault.c ~1111–1155).
        const ggx = egrd.gdx | 0;
        const ggy = egrd.gdy | 0;
        let dx = (ggx > x) ? 1 : (ggx < x) ? -1 : 0;
        let dy = (ggy > y) ? 1 : (ggy < y) ? -1 : 0;
        nx = x;
        ny = y;
        if (Math.abs(ggx - x) >= Math.abs(ggy - y)) nx += dx;
        else ny += dy;

        // Resolve final (nx,ny) + action without mutating yet (C mutates at
        // end of while / proceed; collision after redirect still rare).
        action = 'corr';
        for (let guard_iters = 0; guard_iters < 8; guard_iters++) {
            if (!isok(nx, ny)) return 0;
            const crm = game.level?.at?.(nx, ny);
            if (!crm) return 0;
            typ = crm.typ | 0;
            if (typ === STONE) {
                action = 'corr';
                break;
            }
            const ex = nx + nx - x;
            const ey = ny + ny - y;
            if (isok(ex, ey) && IS_ROOM(game.level?.at?.(ex, ey)?.typ | 0)) {
                action = 'door';
                break;
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
            if (IS_ROOM(typ)) {
                action = 'door';
                break;
            }
            action = 'corr';
            break;
        }
    }

    if (!egrd.gddone) {
        if (u.ux === nx && u.uy === ny) return 0;
        // avoid importing m_at (mon→monmove→shk→vault cycle)
        for (const m of game.fmon || []) {
            if (m !== grd && (m.mx | 0) === nx && (m.my | 0) === ny
                && (m.mhp | 0) > 0) {
                return 0;
            }
        }
    }

    const loc = game.level?.at?.(nx, ny);
    if (!loc) return 0;
    const ftyp = typ;
    if (!skip_dig) {
        if (action === 'door') {
            loc.typ = DOOR;
            loc.doormask = D_NODOOR;
        } else {
            loc.typ = CORR;
            loc.flags = 0;
        }
    }
    recalc_block_point(nx, ny);
    if (!egrd.fakecorr) egrd.fakecorr = [];
    const ggx = egrd.gdx | 0;
    const ggy = egrd.gdy | 0;
    const fi = egrd.fcend | 0;
    if (fi < 40 && ((nx !== ggx || ny !== ggy)
        || ((grd.mx | 0) !== ggx || (grd.my | 0) !== ggy))) {
        egrd.fakecorr[fi] = {
            fx: nx,
            fy: ny,
            ftyp,
            // C stores crm->flags after mutation (doormask for DOOR).
            flags: action === 'door' ? (loc.doormask | 0) : (loc.flags | 0),
        };
        egrd.fcend = fi + 1;
    }

    // C newpos: if gddone after look-around proceed → cleanup, no place
    if (egrd.gddone) {
        return await gd_move_cleanup(grd, semi_dead, false);
    }

    egrd.ogx = grd.mx;
    egrd.ogy = grd.my;
    const ox = grd.mx;
    const oy = grd.my;
    grd.mx = nx;
    grd.my = ny;
    newsym(ox, oy);
    newsym(nx, ny);
    // C vault.c ~1199 — try restore corridor behind after each dig step
    restfakecorr(grd);
    return 1;
}
