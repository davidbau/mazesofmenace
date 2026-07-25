// mon.js — monster bookkeeping.
// C ref: src/mon.c
//
// Only the once-per-turn allotment is here so far. mcalcmove() is the first
// thing every game turn draws: one rn2(NORMAL_SPEED) per monster on the level,
// unconditionally, so the count is the monster census and a level generated
// with the wrong number of monsters desynchronises on its very first turn.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { PMNAMES, MONSYMS, MFLAGS, ATTKS } from './monst_data.js';
import { ONAMES, OCLASSES } from './objects_data.js';
import { is_rider } from './makemon.js';
import { MAX_CARR_CAP, WT_HUMAN } from './const.js';

// include/monflag.h:180 MZ_HUMAN is MZ_MEDIUM
const MZ_HUMAN = MFLAGS.MZ_MEDIUM;

import { COLNO, ROWNO, POOL, DRAWBRIDGE_UP, LAVAPOOL, LAVAWALL, IRONBARS,
         D_CLOSED, D_LOCKED, D_BROKEN, IS_OBSTRUCTED, IS_DOOR, IS_WATERWALL,
         ALLOW_ALL, ALLOW_U, ALLOW_SSM, ALLOW_WALL, ALLOW_DIG, ALLOW_BARS,
         ALLOW_TRAPS, ALLOW_M, ALLOW_SANCT, ALLOW_ROCK, NOTONL, OPENDOOR,
         UNLOCKDOOR, BUSTDOOR, ALLOW_TM, ALLOW_MDISP, NON_PM } from './const.js';

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
                            const mmflag = flag | mm_aggression(mon, mtmp2);

                            if (mmflag & ALLOW_M) {
                                info |= ALLOW_M;
                                if (mtmp2.mtame) {
                                    if (!(mmflag & ALLOW_TM))
                                        continue;
                                    info |= ALLOW_TM;
                                }
                            } else {
                                flag &= ~ALLOW_MDISP; /* depends on defender */
                                const mmflag2 = flag | mm_displacement(mon, mtmp2);
                                if (!(mmflag2 & ALLOW_MDISP))
                                    continue;
                                info |= ALLOW_MDISP;
                            }
                        }
                    }

                    /* diagonal tight squeeze — all THREE tests must hold.
                       Omitting cant_squeeze_thru() blocked every diagonal
                       between two walls, which cost real candidate squares:
                       seed8000 had cnt 5 where C had 8. */
                    if (nx !== x && ny !== y
                        && bad_rock(mdat, x, ny) && bad_rock(mdat, nx, y)
                        && cant_squeeze_thru(mon))
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
export function m_at(x, y) {
    return (game.level?.monsters || []).find(m => m.mx === x && m.my === y
                                                  && m.mhp > 0) || null;
}

/* src/trap.c t_at() */
export function t_at(x, y) {
    return (game.level?.traps || []).find(t => t.tx === x && t.ty === y) || null;
}

// src/hack.c:939 bad_rock() — is this square one a monster cannot walk through?
// The Sokoban boulder case needs sobj_at, which is not ported; no public
// session reaches Sokoban.
function bad_rock(mdat, x, y) {
    const t = game.level?.at(x, y)?.typ;
    if (t === undefined) return true;
    return IS_OBSTRUCTED(t)
        && (!tunnels(mdat) || needspick(mdat))
        && !passes_walls(mdat);
}

// src/hack.c:953 cant_squeeze_thru() — 0 means it CAN squeeze. A small monster
// slips between two walls diagonally; a big one does not.
function cant_squeeze_thru(mon) {
    const ptr = mon.data;

    if (passes_walls(ptr))
        return 0;
    if (bigmonst(ptr)
        && !(amorphous(ptr) || is_whirly(ptr) || noncorporeal(ptr)
             || slithy(ptr)))
        return 1;
    /* curr_mon_load() needs monster inventory; nothing carries anything yet,
       so the WT_TOOMUCH_DIAGONAL test cannot fire. */
    return 0;
}

/* include/mondata.h */
const bigmonst     = (d) => d.msize >= MFLAGS.MZ_LARGE;
const amorphous    = (d) => (d.mflags1 & MFLAGS.M1_AMORPHOUS) !== 0;
/* include/mondata.h:57 — vortices and the air elemental, by symbol not flag */
const is_whirly    = (d) => d.mlet === MONSYMS.S_VORTEX
                         || d.pmidx === PMNAMES.PM_AIR_ELEMENTAL;
/* include/mondata.h:31 — ghosts */
const noncorporeal = (d) => d.mlet === MONSYMS.S_GHOST;
const slithy       = (d) => (d.mflags1 & MFLAGS.M1_SLITHY) !== 0;
const needspick    = (d) => (d.mflags1 & MFLAGS.M1_NEEDPICK) !== 0;

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
export function is_pool(x, y) {
    const t = game.level?.at(x, y)?.typ;
    return t !== undefined && t >= POOL && t <= DRAWBRIDGE_UP;
}
export function is_lava(x, y) {
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

// src/mon.c:2428 mm_aggression() — may `magr` attack `mdef`?
export function mm_aggression(magr, mdef) {
    const mndx = magr.data?.pmidx;

    /* pets never fight each other */
    if (magr.mtame && mdef.mtame)
        return 0;

    /* purple worms eat shriekers */
    if ((mndx === PMNAMES.PM_PURPLE_WORM || mndx === PMNAMES.PM_BABY_PURPLE_WORM)
        && mdef.data?.pmidx === PMNAMES.PM_SHRIEKER)
        return ALLOW_M | ALLOW_TM;

    return mm_2way_aggression(magr, mdef) | mm_2way_aggression(mdef, magr);
}

// src/mon.c mm_2way_aggression() — the zombie-maker case is the only one that
// fires outside the Wizard's tower, and it needs zombie_form(), which is part
// of the death-drop tables rather than anything in the move loop.
function mm_2way_aggression(magr, mdef) {
    if (zombie_maker(magr) && zombie_form(mdef.data) !== NON_PM) {
        if (magr.mgenmklev && mdef.mgenmklev)
            return 0;
        return ALLOW_M | ALLOW_TM;
    }
    return 0;
}

// src/mon.c:2451 mm_displacement() — may `magr` barge past `mdef`?
export function mm_displacement(magr, mdef) {
    const pa = magr.data, pd = mdef.data;

    if (is_displacer(pa) && (!is_displacer(pd) || magr.m_lev > mdef.m_lev)
        && !(magr.mx !== mdef.mx && magr.my !== mdef.my && NODIAG(pd))
        && !mdef.mtrapped
        && (is_rider(pa) || pa.msize >= pd.msize))
        return ALLOW_MDISP;
    return 0;
}

/* include/mondata.h */
const is_displacer = (d) => (d.mflags3 & MFLAGS.M3_DISPLACES) !== 0;
// src/mon.c:362 zombie_maker() — by CLASS, not by flag. There is no
// M3_ZOMBIFIER; reading one gave undefined and the predicate was always false.
function zombie_maker(mon) {
    const pm = mon.data;
    if (mon.mcan) return false;
    if (pm.mlet === MONSYMS.S_ZOMBIE)
        return pm.pmidx !== PMNAMES.PM_GHOUL && pm.pmidx !== PMNAMES.PM_SKELETON;
    if (pm.mlet === MONSYMS.S_LICH)
        return true;
    return false;
}
/* src/zombify.c zombie_form() — needs the zombie table; nothing in the corpus
   generates a zombifier this early, and the call is gated behind
   zombie_maker() above. */
const zombie_form = (d) => NON_PM;

// src/mon.c curr_mon_load() — total weight the monster is already carrying.
export function curr_mon_load(mtmp) {
    let curload = 0;

    for (const obj of (mtmp.minvent || [])) {
        if (obj.otyp !== ONAMES.BOULDER || !throws_rocks(game.mons[mtmp.mnum]))
            curload += obj.owt;
    }

    return curload;
}

// src/mon.c max_mon_load() — human capacity scaled by the monster's weight, or
// by its size when it has no corpse weight, then halved unless strong.
export function max_mon_load(mtmp) {
    const mdat = game.mons[mtmp.mnum];
    let maxload;

    if (!mdat.cwt)
        maxload = Math.trunc((MAX_CARR_CAP * mdat.msize) / MZ_HUMAN);
    else if (!strongmonst(mdat) || (strongmonst(mdat) && mdat.cwt > WT_HUMAN))
        maxload = Math.trunc((MAX_CARR_CAP * mdat.cwt) / WT_HUMAN);
    else
        maxload = MAX_CARR_CAP; /* strong monsters w/cwt <= WT_HUMAN */

    if (!strongmonst(mdat))
        maxload = Math.trunc(maxload / 2);

    if (maxload < 1)
        maxload = 1;

    return maxload;
}

// src/mon.c:1990 can_carry() — how many of otmp the monster could pick up.
// dog_goal()'s APPORT branch tests this AFTER spending its rn2(8), so a wrong
// answer here changes the goal but not the draw count.
export function can_carry(mtmp, otmp) {
    const otyp = otmp.otyp;
    const newload = otmp.owt;
    const mdat = game.mons[mtmp.mnum];

    if (notake(mdat))
        return 0; /* can't carry anything */

    if (!can_touch_safely(mtmp, otmp))
        return 0;

    /* hostile monsters who like gold will pick up the whole stack;
       tame monsters with hands will pick up the partial stack */
    const iquan = otmp.quan;

    /* monsters without hands can't pick up multiple objects at once
       unless they have an engulfing attack */
    if (iquan > 1) {
        let glomper = false;

        if (mdat.mlet === MONSYMS.S_DRAGON
            && (otmp.oclass === OCLASSES.COIN_CLASS
                || otmp.oclass === OCLASSES.GEM_CLASS))
            glomper = true;
        else
            for (const atk of mdat.mattk)
                if (atk[0] === ATTKS.AT_ENGL) {
                    glomper = true;
                    break;
                }
        if ((mdat.mflags1 & MFLAGS.M1_NOHANDS) && !glomper)
            return 1;
    }

    /* steeds don't pick up stuff (to avoid shop abuse) */
    if (mtmp === game.u.usteed)
        return 0;
    if (mtmp.isshk)
        return iquan; /* no limit */
    if (mtmp.mpeaceful && !mtmp.mtame)
        return 0;

    /* special--boulder throwers carry unlimited amounts of boulders */
    if (throws_rocks(mdat) && otyp === ONAMES.BOULDER)
        return iquan;

    /* nymphs deal in stolen merchandise, but not boulders or statues */
    if (mdat.mlet === MONSYMS.S_NYMPH)
        return (otmp.oclass === OCLASSES.ROCK_CLASS) ? 0 : iquan;

    if (curr_mon_load(mtmp) + newload > max_mon_load(mtmp))
        return 0;

    return iquan;
}

/* include/mondata.h and src/mon.c — the two predicates can_carry gates on.
   can_touch_safely() covers cockatrice corpses and acidic items for a monster
   without the matching resistance; neither can be on a floor before the corpse
   and resistance code lands. */
const notake = (ptr) => (ptr.mflags1 & MFLAGS.M1_NOTAKE) !== 0;
const strongmonst = (ptr) => (ptr.mflags2 & MFLAGS.M2_STRONG) !== 0;

function can_touch_safely(mtmp, otmp) {
    note_unported_mon('can_touch_safely');
    return true;
}
