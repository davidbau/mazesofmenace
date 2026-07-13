// mon.js — Monster metabolism / movement allotment.
// C ref: mon.c — mcalcmove, movemon, mon_allowflags (partial).

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { dochugw } from './monmove.js';
import {
    COLNO, ROWNO, IS_OBSTRUCTED, IS_DOOR, D_CLOSED, D_LOCKED, D_BROKEN,
    ALLOW_ROCK,
} from './const.js';
import { t_at } from './trap.js';
import {
    nohands, verysmall, throws_rocks, passes_walls, lays_eggs, mons,
    monsterNames, NON_PM, LOW_PM, mon_knows_traps,
} from './monsters.js';
import { m_harmless_trap } from './trap.js';
import { little_to_big, big_to_little } from './mondata.js';
import { objects_at } from './mkobj.js';
import { objectNames } from './generated/objects_data.js';
import { PM_GRID_BUG } from './generated/monsters_data.js';
import { G_GENOD } from './const.js';
import { enexto, rloc_to } from './teleport.js';

export const NORMAL_SPEED = 12;

const BOULDER = objectNames.indexOf('BOULDER');

/**
 * C ref: mon.c mondead — svm.mvitals[mndx].died++ (cap 255).
 * Called from uhitm/mhitm mondead after form restore would run in C.
 */
export function record_mvitals_died(mndx) {
    if (mndx == null || mndx < LOW_PM) return;
    if (!game.mvitals) game.mvitals = [];
    const slot = game.mvitals[mndx] || (game.mvitals[mndx] = {
        mvflags: 0, born: 0, died: 0,
    });
    if ((slot.died | 0) < 255) slot.died = (slot.died | 0) + 1;
}

// C ref: hack.h NODIAG — only grid bugs
function NODIAG(monnum) {
    return monnum === PM_GRID_BUG;
}

function pm(name) {
    return monsterNames.indexOf(`PM_${name}`);
}

/**
 * C ref: mon.c can_be_hatched — return corpsenm for a typed egg, or NON_PM.
 * BREEDER_EGG (!rn2(77)) is evaluated left-to-right when lays_eggs is true
 * (except the PM_KILLER_BEE / PM_GARGOYLE fast path).
 */
export function can_be_hatched(mnum) {
    if (mnum === pm('SCORPIUS')) mnum = pm('SCORPION');

    mnum = little_to_big(mnum);
    if (mnum === pm('KILLER_BEE') || mnum === pm('GARGOYLE')
        || (lays_eggs(mons(mnum))
            && (!rn2(77)
                || (mnum !== pm('QUEEN_BEE') && mnum !== pm('WINGED_GARGOYLE'))))) {
        return mnum;
    }
    return NON_PM;
}

/**
 * C ref: mon.c dead_species — genocided species (egg checks baby form too).
 */
export function dead_species(m_idx, egg) {
    if (m_idx < LOW_PM) return true;
    const alt_idx = egg ? big_to_little(m_idx) : m_idx;
    const mv = game.mvitals || [];
    return !!((mv[m_idx]?.mvflags ?? 0) & G_GENOD)
        || !!((mv[alt_idx]?.mvflags ?? 0) & G_GENOD);
}

// C ref: mon.c undead_to_corpse — zombie/mummy/vampire → living species for corpses
export function undead_to_corpse(mndx) {
    switch (mndx) {
    case pm('KOBOLD_ZOMBIE'):
    case pm('KOBOLD_MUMMY'):
        return pm('KOBOLD');
    case pm('DWARF_ZOMBIE'):
    case pm('DWARF_MUMMY'):
        return pm('DWARF');
    case pm('GNOME_ZOMBIE'):
    case pm('GNOME_MUMMY'):
        return pm('GNOME');
    case pm('ORC_ZOMBIE'):
    case pm('ORC_MUMMY'):
        return pm('ORC');
    case pm('ELF_ZOMBIE'):
    case pm('ELF_MUMMY'):
        return pm('ELF');
    case pm('VAMPIRE'):
    case pm('VAMPIRE_LEADER'):
    case pm('HUMAN_ZOMBIE'):
    case pm('HUMAN_MUMMY'):
        return pm('HUMAN');
    case pm('GIANT_ZOMBIE'):
    case pm('GIANT_MUMMY'):
        return pm('GIANT');
    case pm('ETTIN_ZOMBIE'):
    case pm('ETTIN_MUMMY'):
        return pm('ETTIN');
    default:
        return mndx;
    }
}

export const ALLOW_U = 0x00040000;
export const ALLOW_M = 0x00080000;
export const ALLOW_TM = 0x00100000;
export const ALLOW_TRAPS = 0x00020000;
export const ALLOW_SANCT = 0x20000000;
export const ALLOW_SSM = 0x40000000;
export const OPENDOOR = 0x00400000;
export const UNLOCKDOOR = 0x00800000;
export const BUSTDOOR = 0x01000000;
// ALLOW_ROCK imported from const.js (mfndpos.h 0x02000000)

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

/**
 * C ref: mon.c mnexto — place next to hero via enexto + rloc_to.
 * Omits mon_telecontrol / overcrowding limbo.
 */
export function mnexto(mtmp, _rlocflags = 0) {
    if (!mtmp) return;
    const u = game.u;
    if (mtmp === u?.usteed) {
        mtmp.mx = u.ux;
        mtmp.my = u.uy;
        return;
    }
    const mm = { x: 0, y: 0 };
    if (!enexto(mm, u.ux, u.uy, mtmp.data) || !isok_xy(mm.x, mm.y)) return;
    rloc_to(mtmp, mm.x, mm.y);
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
    // C: passes_walls → ALLOW_ROCK|ALLOW_WALL; throws_rocks / m_can_break_boulder → ALLOW_ROCK
    // m_can_break_boulder (wielded dig tool) deferred — named in C-JS-MAP
    if (passes_walls(mtmp.data)) allowflags |= ALLOW_ROCK; // ALLOW_WALL deferred
    if (throws_rocks(mtmp.data)) allowflags |= ALLOW_ROCK;
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
    const nodiag = NODIAG(mon.mnum ?? mon.data?.mndx);

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
            // C: first diagonal checks — NODIAG + non-broken doors
            if (nx !== x && ny !== y) {
                const ndm = loc.doormask || 0;
                if (nodiag
                    || (IS_DOOR(nowtyp) && (nowdm & ~D_BROKEN))
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

            // C: sobj_at(BOULDER) without ALLOW_ROCK → skip (mon.c mfndpos)
            const obj = objects_at(nx, ny);
            if (obj) {
                let hasBoulder = false;
                for (let o = obj; o; o = o.nexthere) {
                    if (o.otyp === BOULDER) {
                        hasBoulder = true;
                        break;
                    }
                }
                if (hasBoulder) {
                    if (!(flag & ALLOW_ROCK)) continue;
                    info |= ALLOW_ROCK;
                }
            }

            // C: harmful traps → ALLOW_TRAPS; hostiles skip known types
            // (mon.c mfndpos). Pets get ALLOW_TRAPS and check in dogmove.
            const ttmp = t_at(nx, ny);
            if (ttmp) {
                if (!m_harmless_trap(mon, ttmp)) {
                    if (!(flag & ALLOW_TRAPS)) {
                        if (mon_knows_traps(mon, ttmp.ttyp)) continue;
                    }
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
