// mon.js — monster bookkeeping.
// C ref: src/mon.c
//
// Only the once-per-turn allotment is here so far. mcalcmove() is the first
// thing every game turn draws: one rn2(NORMAL_SPEED) per monster on the level,
// unconditionally, so the count is the monster census and a level generated
// with the wrong number of monsters desynchronises on its very first turn.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { PMNAMES, MONSYMS, MFLAGS } from './monst_data.js';
import { is_rider } from './makemon.js';
import { COLNO, ROWNO, POOL, DRAWBRIDGE_UP, LAVAPOOL, LAVAWALL, IRONBARS,
         D_CLOSED, D_LOCKED, D_BROKEN, IS_OBSTRUCTED, IS_DOOR, IS_WATERWALL,
         ALLOW_ALL, ALLOW_U, ALLOW_SSM, ALLOW_WALL, ALLOW_DIG, ALLOW_BARS,
         ALLOW_TRAPS, ALLOW_M, ALLOW_SANCT, ALLOW_ROCK, NOTONL, OPENDOOR,
         UNLOCKDOOR, BUSTDOOR } from './const.js';

// include/permonst.h:80
export const NORMAL_SPEED = 12;

// include/monst.h — mspeed values
const MSLOW = 1, MFAST = 2;

// src/mon.c:1130 mcalcmove()
export function mcalcmove(mon, m_moving) {
    let mmove = mon.data.mmove;

    if (mon.mspeed === MSLOW) {
        if (mmove < NORMAL_SPEED)
            mmove = Math.trunc((2 * mmove + 1) / 3);
        else
            mmove = 4 + Math.trunc(mmove / 3);
    } else if (mon.mspeed === MFAST) {
        mmove = Math.trunc((4 * mmove + 2) / 3);
    }

    /* the u.usteed gallop branch needs a steed; nothing rides yet */

    if (m_moving) {
        /* Randomly round the speed to a multiple of NORMAL_SPEED. The rn2 is
           evaluated before the comparison, so it fires even when mmove is
           already a multiple and mmove_adj is 0. */
        const mmove_adj = mmove % NORMAL_SPEED;
        mmove -= mmove_adj;
        if (rn2(NORMAL_SPEED) < mmove_adj)
            mmove += NORMAL_SPEED;
    }
    return mmove;
}

// src/mon.c mcalcdistress() — per-turn status effects. Everything it touches
// (stoning, sliming, timed invisibility, ...) needs subsystems that are not
// ported, and none of them draw for a monster with no such state.
export function mcalcdistress() {
    /* nothing to do while no monster carries a timed affliction */
}

// src/mon.c:298 movemon() — let every monster take its turn.
export function movemon() {
    let somebody_can_move = false;
    for (const mtmp of game.level?.monsters || []) {
        if (mtmp.mhp <= 0) continue;
        if (movemon_singlemon(mtmp)) somebody_can_move = true;
    }
    return somebody_can_move;
}

function movemon_singlemon(mtmp) {
    /* A monster only acts once it has banked NORMAL_SPEED of movement. */
    if (!(mtmp.movement >= NORMAL_SPEED))
        return mtmp.movement > 0;
    mtmp.movement -= NORMAL_SPEED;
    dochug(mtmp);
    return mtmp.movement >= NORMAL_SPEED;
}

import { dochug } from './monmove.js';

// src/mon.c:2140 mfndpos() — the squares a monster may move to.
//
// Draws NOTHING, but it decides `cnt`, and dog_move()'s and m_move()'s
// tie-breaks are rn2(++chcnt) and rn2(4 * (cnt - j)) over exactly this set. One
// extra or missing candidate square therefore changes the stream.
//
// The exotic branches — poison-gas regions, water walls, long-worm crossings,
// displacement, sanctuary, garlic — are guarded by predicates that no public
// session reaches on an ordinary early level. They are marked with
// note_unported_mon() where they would matter rather than silently dropped, so
// a session that does reach one shows up in game.unported instead of quietly
// diverging.
export function mfndpos(mon, data, flag) {
    const mdat = mon.data;
    const map = game.level;
    const x = mon.mx, y = mon.my;
    const nowtyp = map.at(x, y)?.typ;
    let cnt = 0;

    data.poss = [];
    data.info = [];

    const nodiag = NODIAG(mdat);
    let wantpool = (mdat.mlet === MONSYMS.S_EEL);
    const poolok = is_swimmer(mdat) && !wantpool;
    const lavaok = likes_lava(mdat);
    let thrudoor = ((flag & (ALLOW_WALL | BUSTDOOR)) !== 0);

    /* ALLOW_DIG needs m_carrying()/MON_WEP, which need monster inventory. */
    if (flag & ALLOW_DIG)
        note_unported_mon('mfndpos ALLOW_DIG');

    for (;;) {                                  /* nexttry: */
        if (mon.mconf) {
            flag |= ALLOW_ALL;
            flag &= ~NOTONL;
        }
        if (!mon.mcansee)
            flag |= ALLOW_SSM;

        const maxx = Math.min(x + 1, COLNO - 1);
        const maxy = Math.min(y + 1, ROWNO - 1);

        for (let nx = Math.max(1, x - 1); nx <= maxx; nx++)
            for (let ny = Math.max(0, y - 1); ny <= maxy; ny++) {
                if (nx === x && ny === y)
                    continue;
                const loc = map.at(nx, ny);
                if (!loc) continue;
                const ntyp = loc.typ;

                if (IS_OBSTRUCTED(ntyp))
                    continue;                   /* may_passwall/may_dig need
                                                   the dig subsystem */
                if (IS_WATERWALL(ntyp) && !is_swimmer(mdat))
                    continue;
                if (ntyp === IRONBARS && !(flag & ALLOW_BARS))
                    continue;
                if (IS_DOOR(ntyp)
                    && (((loc.doormask & D_CLOSED) && !(flag & OPENDOOR))
                        || ((loc.doormask & D_LOCKED) && !(flag & UNLOCKDOOR)))
                    && !thrudoor)
                    continue;

                /* first diagonal checks (tight squeezes handled below) */
                const here = map.at(x, y);
                if (nx !== x && ny !== y
                    && (nodiag
                        || (IS_DOOR(nowtyp) && (here.doormask & ~D_BROKEN))
                        || (IS_DOOR(ntyp) && (loc.doormask & ~D_BROKEN))))
                    continue;

                if ((!lavaok || !(flag & ALLOW_WALL)) && ntyp === LAVAWALL)
                    continue;

                if ((poolok || is_pool(nx, ny) === wantpool)
                    && (lavaok || !is_lava(nx, ny))) {
                    let info = 0;

                    if (nx === game.u.ux && ny === game.u.uy) {
                        mon.mux = game.u.ux;
                        mon.muy = game.u.uy;
                        if (!(flag & ALLOW_U))
                            continue;
                        info |= ALLOW_U;
                    } else if (nx === mon.mux && ny === mon.muy) {
                        if (!(flag & ALLOW_U))
                            continue;
                        info |= ALLOW_U;
                    } else {
                        const mtmp2 = m_at(nx, ny);
                        if (mtmp2) {
                            /* mm_aggression()/mm_displacement() decide whether
                               one monster may attack or swap with another. */
                            note_unported_mon('mfndpos monster-at-target');
                            continue;
                        }
                    }

                    /* diagonal tight squeeze */
                    if (nx !== x && ny !== y
                        && bad_rock(mdat, x, ny) && bad_rock(mdat, nx, y))
                        continue;

                    const ttmp = t_at(nx, ny);
                    if (ttmp) {
                        /* pets get ALLOW_TRAPS and dogmove.c does the
                           checking; anything else needs mon_knows_traps() */
                        if (!(flag & ALLOW_TRAPS))
                            note_unported_mon('mfndpos trap avoidance');
                        info |= ALLOW_TRAPS;
                    }

                    data.poss[cnt] = { x: nx, y: ny };
                    data.info[cnt] = info;
                    cnt++;
                }
            }

        /* eels prefer water, but crawl over land when there is none nearby */
        if (!cnt && wantpool && !is_pool(x, y)) {
            wantpool = false;
            continue;
        }
        break;
    }

    data.cnt = cnt;
    return cnt;
}

/* src/mon.c m_at() */
function m_at(x, y) {
    return (game.level?.monsters || []).find(m => m.mx === x && m.my === y
                                                  && m.mhp > 0) || null;
}

/* src/trap.c t_at() */
function t_at(x, y) {
    return (game.level?.traps || []).find(t => t.tx === x && t.ty === y) || null;
}

/* include/mondata.h — bad_rock() is the squeeze test; without the polymorph
   and giant cases it is just "is this square wall-like". */
function bad_rock(mdat, x, y) {
    const t = game.level?.at(x, y)?.typ;
    return t === undefined || IS_OBSTRUCTED(t);
}

function note_unported_mon(what) {
    (game.unported ||= new Set()).add(what);
}

// ---------------------------------------------------------------------------
// The predicates mfndpos() consults. All from include/mondata.h and
// include/rm.h; none of them draw.
// ---------------------------------------------------------------------------

// include/hack.h:1414 — only the grid bug cannot move diagonally.
function NODIAG(mdat) {
    return mdat?.pmidx === PMNAMES.PM_GRID_BUG;
}

// include/mondata.h:25
function is_swimmer(ptr) {
    return (ptr.mflags1 & MFLAGS.M1_SWIM) !== 0;
}

// include/mondata.h:190 — only these two actually like it.
function likes_lava(ptr) {
    return ptr?.pmidx === PMNAMES.PM_FIRE_ELEMENTAL
        || ptr?.pmidx === PMNAMES.PM_SALAMANDER;
}

// include/rm.h:129-130
function is_pool(x, y) {
    const t = game.level?.at(x, y)?.typ;
    return t !== undefined && t >= POOL && t <= DRAWBRIDGE_UP;
}
function is_lava(x, y) {
    const t = game.level?.at(x, y)?.typ;
    return t === LAVAPOOL || t === LAVAWALL;
}

// src/mon.c:2064 mon_allowflags() — what a monster is permitted to walk into.
// Draws nothing, but it is mfndpos()'s `flag` argument, so it decides the
// candidate set the pet's tie-break draws range over.
export function mon_allowflags(mtmp) {
    let allowflags = 0;
    const d = mtmp.data;

    const can_open = !(nohands(d) || verysmall(d));
    /* monhaskey() needs monster inventory; iswiz and is_rider are enough
       for anything the public corpus generates this early. */
    const can_unlock = (mtmp.iswiz || is_rider(d));
    const doorbuster = is_giant(d);
    const can_tunnel = tunnels(d);

    if (mtmp.mtame)
        allowflags |= ALLOW_M | ALLOW_TRAPS | ALLOW_SANCT | ALLOW_SSM;
    else if (mtmp.mpeaceful)
        allowflags |= ALLOW_SANCT | ALLOW_SSM;
    else
        allowflags |= ALLOW_U;

    if (mtmp.isshk) allowflags |= ALLOW_SSM;
    if (mtmp.ispriest) allowflags |= ALLOW_SSM | ALLOW_SANCT;
    if (passes_walls(d)) allowflags |= (ALLOW_ROCK | ALLOW_WALL);
    if (throws_rocks(d)) allowflags |= ALLOW_ROCK;
    if (can_tunnel) allowflags |= ALLOW_DIG;
    if (doorbuster) allowflags |= BUSTDOOR;
    if (can_open) allowflags |= OPENDOOR;
    if (can_unlock) allowflags |= UNLOCKDOOR;
    if (passes_bars(d)) allowflags |= ALLOW_BARS;

    return allowflags;
}

/* include/mondata.h — the body-plan predicates mon_allowflags consults. */
const nohands    = (d) => (d.mflags1 & MFLAGS.M1_NOHANDS) !== 0;
const verysmall  = (d) => d.msize < MFLAGS.MZ_SMALL;
const is_giant   = (d) => (d.mflags2 & MFLAGS.M2_GIANT) !== 0;
const tunnels    = (d) => (d.mflags1 & MFLAGS.M1_TUNNEL) !== 0;
const passes_walls = (d) => (d.mflags1 & MFLAGS.M1_WALLWALK) !== 0;
const throws_rocks = (d) => (d.mflags2 & MFLAGS.M2_ROCKTHROW) !== 0;
const passes_bars  = (d) => (d.mflags1 & MFLAGS.M1_UNSOLID) !== 0
                         || (d.mflags1 & MFLAGS.M1_AMORPHOUS) !== 0
                         || (d.mflags1 & MFLAGS.M1_WALLWALK) !== 0
                         || d.msize <= MFLAGS.MZ_SMALL;
