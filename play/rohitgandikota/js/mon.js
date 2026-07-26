// mon.js — monster bookkeeping.
// C ref: src/mon.c
//
// Only the once-per-turn allotment is here so far. mcalcmove() is the first
// thing every game turn draws: one rn2(NORMAL_SPEED) per monster on the level,
// unconditionally, so the count is the monster census and a level generated
// with the wrong number of monsters desynchronises on its very first turn.

import { game } from './gstate.js';
import { is_metallic } from './obj.js';
import { bad_rock, may_dig, may_passwall } from './hack.js';
import { which_armor } from './worn.js';
import { obj_resists } from './zap.js';
import { mksobj_at } from './mkobj.js';
import { newsym } from './display.js';
import { rn2, rnd } from './rng.js';
import { DEADMONSTER, MON_WEP } from './monst.js';
import { remove_monster } from './makemon.js';
import { MON_DETACH } from './const.js';
import { PMNAMES, MONSYMS, MFLAGS, ATTKS } from './monst_data.js';

import { has_ceiling } from './dungeon.js';
import { in_rooms } from './hack.js';
import { m_harmless_trap } from './trap.js';
import { hastrack } from './track.js';

// include/trap.h:125 fixed_tele_trap()
const fixed_tele_trap = (t) => t.ttyp === TELEP_TRAP
                            && isok(t.teledest?.x, t.teledest?.y);
import { sobj_at } from './invent.js';
import { online2, isok } from './hacklib.js';
/* onscary() and in_your_sanctuary() are src/monmove.c and src/priest.c
   functions living in js/monmove.js, which imports this file. Both sides
   export function declarations, so the cycle resolves through hoisting. */
import { onscary, in_your_sanctuary, m_can_break_boulder,
         mon_knows_traps, can_fog } from './monmove.js';
import { Is_waterlevel, Is_rogue_level, engulfing_u } from './const.js';
import {
    bigmonst, amorphous, is_whirly, noncorporeal, slithy, needspick, nohands, verysmall, is_giant, tunnels, passes_walls, throws_rocks, passes_bars, is_displacer, notake, strongmonst, is_covetous,
    is_clinger, is_flyer, is_floater, mindless, dmgtype,
} from './mondata.js';
import { ONAMES, OCLASSES, MATERIALS } from './objects_data.js';
import { touch_petrifies, mon_hates_silver } from './dog.js';
import { is_rider } from './makemon.js';
import { MAX_CARR_CAP, WT_HUMAN, W_ARMG, W_ARMS, P_AXE, P_PICK_AXE, IS_TREE } from './const.js';

// include/monflag.h:180 MZ_HUMAN is MZ_MEDIUM
const MZ_HUMAN = MFLAGS.MZ_MEDIUM;

import { COLNO, ROWNO, POOL, DRAWBRIDGE_UP, LAVAPOOL, LAVAWALL, IRONBARS,
         D_CLOSED, D_LOCKED, D_BROKEN, IS_OBSTRUCTED, IS_DOOR, IS_WATERWALL,
         ALLOW_ALL, ALLOW_U, ALLOW_SSM, ALLOW_WALL, ALLOW_DIG, ALLOW_BARS,
         ALLOW_TRAPS, ALLOW_M, ALLOW_SANCT, ALLOW_ROCK, NOTONL, OPENDOOR,
         UNLOCKDOOR, BUSTDOOR, ALLOW_TM, ALLOW_MDISP, NON_PM,
         NOGARLIC, TEMPLE, TRAPNUM, TELEP_TRAP, SHOPBASE,
         W_NONDIGGABLE } from './const.js';

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

// src/mon.c:1214 movemon_singlemon()
function movemon_singlemon(mtmp) {
    /* A monster only acts once it has banked NORMAL_SPEED of movement.
       src/mon.c:1251 returns FALSE here — NOT "has any movement left". The
       return value becomes somebody_can_move, which drives moveloop_core's
       `do { movemon() } while (monscanmove)` loop, so reporting TRUE for a
       monster that merely has some leftover movement runs the whole loop again
       and hands every monster an extra turn. */
    if (mtmp.movement < NORMAL_SPEED)
        return false;
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
// src/mon.c:2130 m_in_air() — is this monster off the ground right now?
//
// mfndpos() reads it twice, for poolok and lavaok, and a flyer that cannot swim
// is exactly the case the port was getting wrong: without this, water and lava
// squares were dropped from the candidate list, so cnt came out short and the
// rn2(4 * (cnt - j)) inside m_move() drew the wrong bound.
export function m_in_air(mtmp) {
    return is_flyer(mtmp.data)
        || is_floater(mtmp.data)
        || (is_clinger(mtmp.data) && has_ceiling(game.u?.uz) && mtmp.mundetected);
}

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
    const poolok = ((!Is_waterlevel(game.u?.uz) && m_in_air(mon))
                    || (is_swimmer(mdat) && !wantpool));
    let lavaok = (m_in_air(mon) || likes_lava(mdat));
    if (mdat.pmidx === PMNAMES.PM_FLOATING_EYE)  /* prefers to avoid heat */
        lavaok = false;
    let rockok = false, treeok = false, mw_tmp;
    let thrudoor = ((flag & (ALLOW_WALL | BUSTDOOR)) !== 0);

    if (flag & ALLOW_DIG) {
        /* need to be specific about what can currently be dug */
        if (!needspick(mdat)) {
            rockok = treeok = true;
        } else if ((mw_tmp = MON_WEP(mon)) && mw_tmp.cursed
                   && mon.weapon_check === NO_WEAPON_WANTED) {
            rockok = is_pick(mw_tmp);
            treeok = is_axe(mw_tmp);
        } else {
            rockok = !!(m_carrying(mon, ONAMES.PICK_AXE)
                        || (m_carrying(mon, ONAMES.DWARVISH_MATTOCK)
                            && !which_armor(mon, W_ARMS)));
            treeok = !!(m_carrying(mon, ONAMES.AXE)
                        || (m_carrying(mon, ONAMES.BATTLE_AXE)
                            && !which_armor(mon, W_ARMS)));
        }
        if (rockok || treeok)
            thrudoor = true;
    }

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

                if (IS_OBSTRUCTED(ntyp)
                    && !((flag & ALLOW_WALL) && may_passwall(nx, ny))
                    && !((IS_TREE(ntyp) ? treeok : rockok) && may_dig(nx, ny)))
                    continue;
                /* src/mon.c:2218 — intelligent peacefuls will not dig
                   through a shop or temple wall to get somewhere, unless they
                   are already inside one. */
                if (IS_OBSTRUCTED(ntyp) && rockok
                    && !mindless(mon.data) && (mon.mpeaceful || mon.mtame)
                    && (in_rooms(nx, ny, TEMPLE) || in_rooms(nx, ny, SHOPBASE))
                    && !(in_rooms(x, y, TEMPLE) || in_rooms(x, y, SHOPBASE)))
                    continue;
                if (IS_WATERWALL(ntyp) && !is_swimmer(mdat))
                    continue;
                /* src/mon.c:2227 — KMH: iron bars. Rusting and corroding
                   attacks get through ordinary bars but not non-diggable
                   ones, so those reject the square even with ALLOW_BARS. */
                if (ntyp === IRONBARS
                    && (!(flag & ALLOW_BARS)
                        || ((loc.wall_info & W_NONDIGGABLE)
                            && (dmgtype(mdat, ATTKS.AD_RUST)
                                || dmgtype(mdat, ATTKS.AD_CORR)))))
                    continue;
                if (IS_DOOR(ntyp)
                    /* an amorphous creature can only move under or through a
                       closed door when it does not currently have the hero
                       engulfed */
                    && !((amorphous(mdat) || can_fog(mon)) && !engulfing_u(mon))
                    && (((loc.doormask & D_CLOSED) && !(flag & OPENDOOR))
                        || ((loc.doormask & D_LOCKED) && !(flag & UNLOCKDOOR)))
                    && !thrudoor)
                    continue;

                /* first diagonal checks (tight squeezes handled below) */
                const here = map.at(x, y);
                if (nx !== x && ny !== y
                    && (nodiag
                        || (IS_DOOR(nowtyp) && (here.doormask & ~D_BROKEN))
                        || (IS_DOOR(ntyp) && (loc.doormask & ~D_BROKEN))
                        /* no diagonal in or out of a doorway on the Rogue
                           level, where the display is the 1980 original */
                        || ((IS_DOOR(nowtyp) || IS_DOOR(ntyp))
                            && Is_rogue_level())))
                    continue;

                if ((!lavaok || !(flag & ALLOW_WALL)) && ntyp === LAVAWALL)
                    continue;

                if ((poolok || is_pool(nx, ny) === wantpool)
                    && (lavaok || !is_lava(nx, ny))) {
                    let info = 0;

                    /* src/mon.c:2277 — Displacement moves the square the
                       scare check is made on, as long as the hero is visible
                       to this monster. Not modelled, so dispx/dispy are nx/ny. */
                    const dispx = nx, dispy = ny;

                    /* src/mon.c:2278 — a scary square (Elbereth, a scroll of
                       scare monster) is rejected unless the monster ignores
                       them. No draw; it just removes a candidate. */
                    if (onscary(dispx, dispy, mon)) {
                        if (!(flag & ALLOW_SSM))
                            continue;
                        info |= ALLOW_SSM;
                    }

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

                    /* src/mon.c:2318 — ALLOW_SANCT only prevents MOVEMENT
                       into a temple, not attack, which is why it sits in the
                       else arm of the hero test. */
                    if (!(nx === game.u.ux && ny === game.u.uy)
                        && !(nx === mon.mux && ny === mon.muy)) {
                        if (game.level?.flags?.has_temple
                            && in_rooms(nx, ny, TEMPLE)
                            && !in_rooms(x, y, TEMPLE)
                            && in_your_sanctuary(null, nx, ny)) {
                            if (!(flag & ALLOW_SANCT))
                                continue;
                            info |= ALLOW_SANCT;
                        }
                    }

                    /* src/mon.c:2326 — C reads OBJ_AT once into `checkobj`
                       and gates both object tests on it. */
                    const checkobj = objects_here(nx, ny);

                    if (checkobj && sobj_at(ONAMES.CLOVE_OF_GARLIC, nx, ny)) {
                        if (flag & NOGARLIC)
                            continue;
                        info |= NOGARLIC;
                    }
                    if (checkobj && sobj_at(ONAMES.BOULDER, nx, ny)) {
                        if (!(flag & ALLOW_ROCK))
                            continue;
                        info |= ALLOW_ROCK;
                    }

                    /* src/mon.c:2338 — avoid standing in the hero's line.
                       monseeu is the same test onscary's displacement uses. */
                    const monseeu = (mon.mcansee && !game.u?.uprops?.INVIS);
                    if (monseeu && monlineu(mon, nx, ny)) {
                        if (flag & NOTONL)
                            continue;
                        info |= NOTONL;
                    }

                    /* diagonal tight squeeze — all THREE tests must hold.
                       Omitting cant_squeeze_thru() blocked every diagonal
                       between two walls, which cost real candidate squares:
                       seed8000 had cnt 5 where C had 8. */
                    if (nx !== x && ny !== y
                        && bad_rock(mdat, x, ny) && bad_rock(mdat, nx, y)
                        && cant_squeeze_thru(mon))
                        continue;

                    /* src/mon.c:2347 — a monster avoids a trap type it is
                       familiar with. Pets get ALLOW_TRAPS and dogmove.c does
                       the deciding instead. A HARMLESS trap is neither avoided
                       nor marked, which is the part that matters here: marking
                       it unconditionally set ALLOW_TRAPS on squares C leaves
                       clear, and m_move reads info[] to choose. */
                    const ttmp = t_at(nx, ny);
                    if (ttmp) {
                        if (ttmp.ttyp >= TRAPNUM || ttmp.ttyp === 0) {
                            /* impossible("A monster looked at a very strange
                               trap of type %d.") -- and then continues. */
                            continue;
                        }
                        /* a fixed-destination teleport trap the hero has used
                           is a route, not a hazard */
                        if (fixed_tele_trap(ttmp) && hastrack(nx, ny)) {
                            info |= ALLOW_TRAPS;
                        } else if (!m_harmless_trap(mon, ttmp)) {
                            if (!(flag & ALLOW_TRAPS)
                                && mon_knows_traps(mon, ttmp.ttyp))
                                continue;
                            info |= ALLOW_TRAPS;
                        }
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

// include/rm.h:500 OBJ_AT() — is there anything on this square?
function objects_here(x, y) {
    return (game.level?.objects || []).some(o => o.ox === x && o.oy === y);
}

// src/mon.c:2055 monlineu() — is <nx,ny> in a straight line from where this
// monster THINKS the hero is? Note it uses mux/muy, the remembered position,
// not the real one.
function monlineu(mon, nx, ny) {
    return online2(nx, ny, mon.mux, mon.muy);
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


// src/mon.c healmon() — heal a monster, raising mhpmax only past `overheal`.
export function healmon(mtmp, amt, overheal) {
    const oldhp = mtmp.mhp;

    if (mtmp.mhp + amt > mtmp.mhpmax + overheal) {
        mtmp.mhpmax += overheal;
        mtmp.mhp = mtmp.mhpmax;
    } else {
        mtmp.mhp += amt;
        if (mtmp.mhp > mtmp.mhpmax)
            mtmp.mhpmax = mtmp.mhp;
    }
    return mtmp.mhp - oldhp;
}

// src/mon.c m_consume_obj() — the monster swallows otmp.
//
// Every arm past delobj() is gated on a corpse, glob, egg or container
// predicate. For the metal object meatmetal() feeds it none of them can be
// true, so this is the whole function on that path rather than a reduction of
// it; the guards are the C's own, evaluated, not assumed.
export function m_consume_obj(mtmp, otmp) {
    const ispet = mtmp.mtame;

    /* non-pet: Heal up to the object's weight in hp */
    if (!ispet && mtmp.mhp < mtmp.mhpmax)
        healmon(mtmp, game.objects[otmp.otyp].oc_weight, 0);

    if (otmp.cobj && otmp.cobj.length) {
        note_unported_mon('m_consume_obj:meatbox');
        return;
    }

    const corpsenm = (otmp.otyp === ONAMES.CORPSE) ? otmp.corpsenm : NON_PM;
    if (corpsenm !== NON_PM || otmp.otyp === ONAMES.GLOB_OF_GREEN_SLIME
        || otmp.otyp === ONAMES.EGG || otmp.otyp === ONAMES.CARROT) {
        /* polyfood/mlevelgain/mhealup/mstoning and their newcham, grow_up,
           monstone and mon_givit consequences; all draw. */
        note_unported_mon('m_consume_obj:corpse_effects');
        return;
    }

    delobj(otmp); /* munch */
}

// src/mkobj.c delobj() — take the object off the floor and free it.
function delobj(obj) {
    const objs = game.level?.objects;
    if (!objs) return;
    const i = objs.indexOf(obj);
    if (i >= 0) objs.splice(i, 1);
}

// src/mon.c:1465 meatmetal() — a rock mole or similar eats the topmost metal
// object it is standing on.
//
// Reached from m_move()'s post-move block. Its rn2(100) is obj_resists', and
// it is the first call seed0030 diverges on.
export function meatmetal(mtmp) {
    /* If a pet, eating is handled separately, in dog.c */
    if (mtmp.mtame)
        return 0;

    /* Eats topmost metal object if it is there */
    for (const otmp of (game.level?.objects || [])
                         .filter(o => o.ox === mtmp.mx && o.oy === mtmp.my)) {
        /* Don't eat indigestible/choking/inappropriate objects */
        if ((game.mons[mtmp.mnum].pmidx === PMNAMES.PM_RUST_MONSTER
             && !is_rustprone(otmp))
            || (otmp.otyp === ONAMES.AMULET_OF_STRANGULATION
                || otmp.otyp === ONAMES.RIN_SLOW_DIGESTION)
            || (otmp.opoisoned && !resists_poison(mtmp)))
            continue;
        if (is_metallic(otmp) && !obj_resists(otmp, 5, 95)
            && touch_artifact(otmp, mtmp)) {
            if (game.mons[mtmp.mnum].pmidx === PMNAMES.PM_RUST_MONSTER
                && otmp.oerodeproof) {
                /* The object's rustproofing is gone now */
                otmp.oerodeproof = 0;
                mtmp.mstun = 1;
                /* "%s spits %s out in disgust!" */
            } else {
                /* "%s eats %s!" / You_hear("a crunching sound.") */
                mtmp.meating = Math.trunc(otmp.owt / 2) + 1;
                m_consume_obj(mtmp, otmp);
                if (DEADMONSTER(mtmp))
                    return 2;
                /* Left behind a pile? */
                if (rnd(25) < 3)
                    mksobj_at(ONAMES.ROCK, mtmp.mx, mtmp.my, true, false);
                newsym(mtmp.mx, mtmp.my);
                return 1;
            }
        }
    }
    return 0;
}

// include/objclass.h:194,200 is_metallic() / is_rustprone()
const is_rustprone = (otmp) => game.objects[otmp.otyp].oc_material === MATERIALS.IRON;

/* src/mondata.c resists_poison() needs the resistance tables. */
function resists_poison(mon) {
    note_unported_mon('resists_poison');
    return false;
}

/* src/artifact.c touch_artifact() — TRUE for anything that is not an artifact,
   which is every object a rock mole meets on an early level. */
function touch_artifact(otmp, mon) {
    if (otmp.oartifact) {
        note_unported_mon('touch_artifact');
        return true;
    }
    return true;
}

// src/mon.c m_carrying() — the monster's object of this type, or null.
//
// This lived in monmove.js and returned a bare {} placeholder. Every caller so
// far only tested truth, but mfndpos' dig arm reads the object itself, so the
// dummy would have been a silent wrong answer the moment it was used.
export function m_carrying(mtmp, type) {
    for (const otmp of (mtmp.minvent || []))
        if (otmp.otyp === type)
            return otmp;

    return null;
}

// include/monst.h:210 MON_WEP() — monsters do not wield in this port yet.
const NO_WEAPON_WANTED = 0;

// include/obj.h:217,220 is_axe() / is_pick()
const is_pick = (otmp) => (otmp.oclass === OCLASSES.WEAPON_CLASS
                           || otmp.oclass === OCLASSES.TOOL_CLASS)
                          && game.objects[otmp.otyp].oc_skill === P_PICK_AXE;
const is_axe  = (otmp) => (otmp.oclass === OCLASSES.WEAPON_CLASS
                           || otmp.oclass === OCLASSES.TOOL_CLASS)
                          && game.objects[otmp.otyp].oc_skill === P_AXE;

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


/* include/mondata.h:57 — vortices and the air elemental, by symbol not flag */

/* include/mondata.h:31 — ghosts */



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
    if (throws_rocks(d) || m_can_break_boulder(mtmp)) allowflags |= ALLOW_ROCK;
    if (can_tunnel) allowflags |= ALLOW_DIG;
    if (doorbuster) allowflags |= BUSTDOOR;
    if (can_open) allowflags |= OPENDOOR;
    if (can_unlock) allowflags |= UNLOCKDOOR;
    if (passes_bars(d)) allowflags |= ALLOW_BARS;

    return allowflags;
}

/* include/mondata.h — the body-plan predicates mon_allowflags consults. */







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


// src/mon.c can_touch_safely() — would picking this up hurt the monster?
//
// Stubbed to TRUE, it let monsters pick up silver they hate and corpses that
// petrify them, which changes what can_carry() allows and therefore which
// square m_search_items() steers them to.
function can_touch_safely(mtmp, otmp) {
    const otyp = otmp.otyp;
    const mdat = game.mons[mtmp.mnum];

    if (otyp === ONAMES.CORPSE && touch_petrifies(game.mons[otmp.corpsenm])
        && !(mtmp.misc_worn_check & W_ARMG) && !resists_ston(mtmp))
        return false;
    if (otyp === ONAMES.CORPSE && is_rider(game.mons[otmp.corpsenm]))
        return false;
    if (game.objects[otyp].oc_material === MATERIALS.SILVER
        && mon_hates_silver(mtmp)
        && (otyp !== ONAMES.BELL_OF_OPENING || !is_covetous(mdat)))
        return false;
    /* touch_artifact() needs the artifact tables; no monster on an early level
       carries one, and it is the only remaining arm. */
    note_unported_mon('can_touch_safely:touch_artifact');
    return true;
}

// include/mondata.h is_covetous()

/* src/mondata.c resists_ston() needs the resistance tables. */
function resists_ston(mon) {
    note_unported_mon('resists_ston');
    return false;
}

// src/mon.c:2734 m_detach() — take a monster off the map.
//
// C does NOT unlink from the fmon chain here: it flags MON_DETACH and bumps
// iflags.purge_monsters, and dmonsfree() does the unlinking later. That split
// matters because anything walking fmon between now and the purge still SEES
// this monster. What must happen immediately is the map slot, because m_at()
// is what mfndpos() counts free squares with.
//
// Ported: the map removal, mhp = 0, and the detach flag. Not ported (none are
// reachable from mk_trap_statue's freshly-made monster, and each is recorded
// rather than faked): m_unleash, del_light_source, wizdeadorgone, the
// due_to_death arm (nemdead/leaddead/relobj), thiefdead, shkgone, wormgone,
// the endgame flag, and the steed dismount.
export function m_detach(mtmp, mptr, due_to_death) {
    if (mtmp.mleashed || mtmp.iswiz || mtmp.isshk || mtmp.wormno
        || due_to_death)
        (game.unported ||= new Set()).add('mon:m_detach');

    /* mon_leaving_level() — off the map, but still on the fmon chain */
    if (mtmp.mx > 0)
        remove_monster(mtmp.mx, mtmp.my);

    mtmp.mhp = 0;               /* simplify some tests: force mhp to 0 */

    mtmp.mstate = (mtmp.mstate || 0) | MON_DETACH;
    game.iflags = game.iflags || {};
    game.iflags.purge_monsters = (game.iflags.purge_monsters || 0) + 1;
}

// src/mon.c:3267 mongone() — monster disappears, not dies.
//
// The distinction from mondead() is the whole point: no corpse, no death
// message, no experience. mk_trap_statue() uses it to throw away the monster
// it made purely to source a statue's inventory.
//
// discard_minvent() removes the pack FROM THE GAME rather than dropping it,
// which is why mk_trap_statue moves the objects into the statue first.
export function mongone(mdef) {
    mdef.mhp = 0;               /* can skip some inventory bookkeeping */

    if (mdef.isgd)
        (game.unported ||= new Set()).add('mon:mongone:grddead');
    /* unstuck() and mdrop_special_objs() are no-ops for a monster that has
       never acted; the Amulet case cannot arise at level generation. */

    /* discard_minvent(mdef, FALSE) — the pack leaves the game entirely */
    mdef.minvent = [];

    m_detach(mdef, mdef.data, false);
}
