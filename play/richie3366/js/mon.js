// mon.js — Monster metabolism / movement allotment.
// C ref: mon.c — mcalcmove, movemon, mon_allowflags (partial).

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { dochugw } from './monmove.js';
import {
    COLNO, ROWNO, IS_OBSTRUCTED, IS_DOOR, D_CLOSED, D_LOCKED, D_BROKEN,
} from './const.js';
import { t_at } from './trap.js';
import { nohands, verysmall } from './monsters.js';

export const NORMAL_SPEED = 12;

export const ALLOW_U = 0x00040000;
export const ALLOW_M = 0x00080000;
export const ALLOW_TM = 0x00100000;
export const ALLOW_TRAPS = 0x00020000;
export const ALLOW_SANCT = 0x20000000;
export const ALLOW_SSM = 0x40000000;
export const OPENDOOR = 0x00400000;
export const UNLOCKDOOR = 0x00800000;
export const BUSTDOOR = 0x01000000;

// C ref: mon.c mcalcmove()
export function mcalcmove(mon, m_moving) {
    let mmove = mon.data?.mmove ?? NORMAL_SPEED;
    // MSLOW / MFAST / steed gallop not hit on seed8000 dlvl1 commons
    if (m_moving) {
        const mmove_adj = mmove % NORMAL_SPEED;
        mmove -= mmove_adj;
        if (rn2(NORMAL_SPEED) < mmove_adj) mmove += NORMAL_SPEED;
    }
    return mmove;
}

export function dist2(x0, y0, x1, y1) {
    const dx = x0 - x1;
    const dy = y0 - y1;
    return dx * dx + dy * dy;
}

export function distmin(x0, y0, x1, y1) {
    return Math.max(Math.abs(x0 - x1), Math.abs(y0 - y1));
}

export function monnear(mtmp, x, y) {
    return distmin(mtmp.mx, mtmp.my, x, y) <= 1;
}

/** C ref: you.h next2u — squared dist to hero ≤ 2. */
function next2u(x, y) {
    return dist2(x, y, game.u.ux, game.u.uy) <= 2;
}

function isok_xy(x, y) {
    return x >= 1 && x < COLNO && y >= 0 && y < ROWNO;
}

/**
 * C ref: monmove.c m_avoid_kicked_loc — peaceful/tame skip hero's kicked square.
 */
export function m_avoid_kicked_loc(mtmp, nx, ny) {
    const kl = game.kickedloc;
    if (!kl || !isok_xy(kl.x, kl.y)) return false;
    if (!(mtmp.mpeaceful || mtmp.mtame)) return false;
    if (!mtmp.mcansee || mtmp.mconf || mtmp.mstun) return false;
    if (game.Conflict || game.flags?.Conflict) return false;
    if (nx !== kl.x || ny !== kl.y) return false;
    return next2u(nx, ny);
}

/**
 * C ref: monmove.c m_avoid_soko_push_loc — Sokoban boulder-line skip.
 * Deferred until Sokoban; always false for now.
 */
export function m_avoid_soko_push_loc(_mtmp, _nx, _ny) {
    return false;
}

export function m_at(x, y) {
    const list = game.fmon || [];
    for (const m of list) {
        if (m.mx === x && m.my === y) return m;
    }
    return null;
}

// C ref: mon.c mon_allowflags() — hostile/peaceful subset for seed8000
export function mon_allowflags(mtmp) {
    let allowflags = 0;
    // C: can_open = !(nohands(data) || verysmall(data))
    const can_open = !(nohands(mtmp.data) || verysmall(mtmp.data));
    if (mtmp.mtame) {
        allowflags |= ALLOW_M | ALLOW_TRAPS | ALLOW_SANCT | ALLOW_SSM;
    } else if (mtmp.mpeaceful) {
        allowflags |= ALLOW_SANCT | ALLOW_SSM;
    } else {
        allowflags |= ALLOW_U;
    }
    if (can_open) allowflags |= OPENDOOR;
    return allowflags;
}

// C ref: mon.c mfndpos() — open-floor neighbour scan for dlvl1
export function mfndpos(mon, data, flag) {
    const x = mon.mx;
    const y = mon.my;
    let cnt = 0;
    data.cnt = 0;
    data.poss = data.poss || [];
    data.info = data.info || [];

    const nowloc = game.level?.at(x, y);
    const nowtyp = nowloc?.typ;
    const nowdm = nowloc?.doormask || 0;

    const maxx = Math.min(x + 1, COLNO - 1);
    const maxy = Math.min(y + 1, ROWNO - 1);
    for (let nx = Math.max(1, x - 1); nx <= maxx; nx++) {
        for (let ny = Math.max(0, y - 1); ny <= maxy; ny++) {
            if (nx === x && ny === y) continue;
            const loc = game.level?.at(nx, ny);
            if (!loc) continue;
            const ntyp = loc.typ;
            if (IS_OBSTRUCTED(ntyp)) continue;
            if (IS_DOOR(ntyp)) {
                const dm = loc.doormask || 0;
                if ((dm & D_CLOSED) && !(flag & OPENDOOR)) continue;
                if ((dm & D_LOCKED) && !(flag & UNLOCKDOOR)) continue;
            }
            // C: no diagonal into/out of non-broken doors (also NODIAG mons)
            if (nx !== x && ny !== y) {
                const ndm = loc.doormask || 0;
                if ((IS_DOOR(nowtyp) && (nowdm & ~D_BROKEN))
                    || (IS_DOOR(ntyp) && (ndm & ~D_BROKEN))) {
                    continue;
                }
            }

            let info = 0;
            if ((nx === game.u.ux && ny === game.u.uy)
                || (nx === mon.mux && ny === mon.muy)) {
                if (nx === game.u.ux && ny === game.u.uy) {
                    mon.mux = game.u.ux;
                    mon.muy = game.u.uy;
                }
                if (!(flag & ALLOW_U)) continue;
                info |= ALLOW_U;
            } else if (m_at(nx, ny)) {
                // hostiles lack ALLOW_M — cannot displace/attack other mons
                if (!(flag & ALLOW_M)) continue;
                info |= ALLOW_M;
            }

            // C: harmful traps → ALLOW_TRAPS (pets check tseen in dog_move)
            const ttmp = t_at(nx, ny);
            if (ttmp) {
                // m_harmless_trap stub: dart/arrow/etc. are harmful
                if (!(flag & ALLOW_TRAPS)) {
                    // mon_knows_traps skip omitted — non-pets just omit the bit
                } else {
                    info |= ALLOW_TRAPS;
                }
            }

            data.poss[cnt] = { x: nx, y: ny };
            data.info[cnt] = info;
            cnt++;
        }
    }
    data.cnt = cnt;
    return cnt;
}

// C ref: mon.c movemon_singlemon()
async function movemon_singlemon(mtmp) {
    if (!mtmp || mtmp.mhp <= 0) return false;
    if ((mtmp.movement | 0) < NORMAL_SPEED) return false;

    mtmp.movement -= NORMAL_SPEED;
    if (mtmp.movement >= NORMAL_SPEED) game._somebody_can_move = true;

    await dochugw(mtmp, true);
    return false;
}

// C ref: mon.c movemon()
export async function movemon() {
    game._somebody_can_move = false;
    const list = game.fmon || [];
    // Snapshot — dochug may mutate list later
    for (const mtmp of list.slice()) {
        await movemon_singlemon(mtmp);
    }
    return game._somebody_can_move;
}
