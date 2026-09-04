// worm.js — Long worm segment bookkeeping (creation + movement).
// C ref: worm.c — get_wormno, initworm, create_worm_tail, count_wsegs,
//   place_worm_tail_randomly, place_worm_seg / remove_monster (rm.h),
//   worm_move / shrink_worm / worm_nomove (D-1491), see_wsegs (D-1529),
//   detect_wsegs (D-1545), worm_known (D-1548), cutworm / place_wsegs
//   (D-1570), redraw_worm (D-1577), wormhitu (D-1798).
// Named omissions: save/rest wsegs; mondead/dog wormgone callers;
//   replmon/restore place_wsegs callers; muse.c / mhitu.c worm_move
//   callers; flip_worm_segs_vertical / flip_worm_segs_horizontal.

import { game } from './gstate.js';
import { rn2, rnd, rn1, d, rn2_on_display_rng } from './rng.js';
import {
    MAX_NUM_WORMS, N_DIRS, xdir, ydir, MHPMAX, MSLOW, MFAST, NORMAL_SPEED,
    MON_OFFMAP, has_mcorpsenm,
} from './const.js';
import { goodpos } from './teleport.js';
import { newsym, show_wseg_detect_glyph, Hallucination, pline, canspotmon, impossible } from './display.js';
import { cansee } from './vision.js';
import { NUMMONS, NON_PM, monsterNames } from './monsters.js';
import { PM_LONG_WORM_TAIL } from './generated/monsters_data.js';
import { clone_mon } from './makemon.js';
import { mon_nam, Monnam, s_suffix } from './do_name.js';
import { mattacku } from './mhitu.js';

/** @type {(null|{nseg:object|null,wx:number,wy:number})[]} */
const wheads = new Array(MAX_NUM_WORMS).fill(null);
/** @type {(null|{nseg:object|null,wx:number,wy:number})[]} */
const wtails = new Array(MAX_NUM_WORMS).fill(null);
/** @type {number[]} */
const wgrowtime = new Array(MAX_NUM_WORMS).fill(0);

function newseg() {
    return { nseg: null, wx: 0, wy: 0 };
}

/** C ref: rm.h place_worm_seg — occupy level.monsters[x][y] with worm head. */
function place_worm_seg(worm, x, y) {
    if (!game._level_monsters) game._level_monsters = new Map();
    const key = `${x},${y}`;
    if (game._level_monsters.has(key)) {
        // C: impossible("place_worm_seg over mon") — keep overwrite like soft path
    }
    game._level_monsters.set(key, worm);
}

/** C ref: rm.h remove_monster — clear level.monsters[x][y]. */
function remove_monster_xy(x, y) {
    game._level_monsters?.delete(`${x},${y}`);
}

/**
 * Live occupant of C `level.monsters[x][y]` (JS `_level_monsters`).
 * Heads from place_monster: mx/my match this cell.
 * Worm segs from place_worm_seg: head pointer, mx/my is the head.
 * Stale heads (JS movement without remove_monster) are ignored so
 * mixed occupancy does not ghost a cell. Mounted steed is not on
 * the map (C remove_monster while riding).
 */
export function level_mon_at(x, y) {
    const mon = game._level_monsters?.get(`${x},${y}`);
    if (!mon) return null;
    if (mon === game.u?.usteed) return null;
    if ((mon.mhp | 0) <= 0) return null;
    if ((mon.mstate | 0) & MON_OFFMAP) return null;
    if ((mon.mx | 0) === (x | 0) && (mon.my | 0) === (y | 0)) return mon;
    if (mon.wormno) return mon;
    return null;
}

/**
 * Occupancy for worm body segs (heads also via place_monster).
 * C: level.monsters[x][y] holds the worm head pointer at every seg cell.
 */
export function worm_mon_at(x, y) {
    return level_mon_at(x, y);
}

/** C ref: worm.c get_wormno */
export function get_wormno() {
    let new_wormno = 1;
    while (new_wormno < MAX_NUM_WORMS) {
        if (!wheads[new_wormno]) return new_wormno;
        new_wormno++;
    }
    return 0;
}

/** C ref: worm.c create_worm_tail — (num_segs+1) chain; null if num_segs==0. */
function create_worm_tail(num_segs) {
    if (!num_segs) return null;
    let i = 0;
    const new_tail = newseg();
    let curr = new_tail;
    while (i < num_segs) {
        curr.nseg = newseg();
        curr = curr.nseg;
        i++;
    }
    return new_tail;
}

/**
 * C ref: worm.c initworm — dummy head seg + optional tail chain.
 * Caller must set worm.wormno = get_wormno() beforehand (non-zero).
 */
export function initworm(worm, wseg_count) {
    const wnum = worm.wormno | 0;
    const new_tail = create_worm_tail(wseg_count);
    let seg;
    if (new_tail) {
        wtails[wnum] = new_tail;
        for (seg = new_tail; seg.nseg; seg = seg.nseg) { /* find head */ }
        wheads[wnum] = seg;
    } else {
        wtails[wnum] = wheads[wnum] = seg = newseg();
    }
    seg.wx = worm.mx | 0;
    seg.wy = worm.my | 0;
    wgrowtime[wnum] = 0;
}

/** C ref: worm.c count_wsegs */
export function count_wsegs(mtmp) {
    let i = 0;
    if (mtmp?.wormno) {
        for (let curr = wtails[mtmp.wormno]?.nseg; curr; curr = curr.nseg) i++;
    }
    return i;
}

/**
 * C ref: worm.c remove_worm — take head+tail off the map grid without
 * freeing the wseg chain or unlinking fmon. newsym each occupied cell.
 * Only wx is zeroed (C occupancy test is `if (curr->wx)`).
 */
export function remove_worm(worm) {
    const wnum = worm?.wormno | 0;
    if (!wnum) return;
    let curr = wtails[wnum];
    while (curr) {
        if (curr.wx) {
            remove_monster_xy(curr.wx, curr.wy);
            newsym(curr.wx, curr.wy);
            curr.wx = 0;
        }
        curr = curr.nseg;
    }
}

/** C ref: worm.c toss_wsegs — free segs; optionally update display. */
function toss_wsegs(curr, display_update) {
    while (curr) {
        const nxtseg = curr.nseg;
        if (curr.wx) {
            remove_monster_xy(curr.wx, curr.wy);
            if (display_update) newsym(curr.wx, curr.wy);
        }
        curr = nxtseg;
    }
}

const PM_LONG_WORM = monsterNames.indexOf('PM_LONG_WORM');

/**
 * C ref: worm.c wormgone `:307–332` — drop the wseg chain, take the
 * head off the map, clear wormno. Caller newcham place_monster's the
 * head back. mondead / dog.c callers still named.
 */
export function wormgone(worm) {
    if (!worm) return;
    const wnum = worm.wormno | 0;
    if (!wnum) void impossible('wormgone: wormno is 0');
    worm.wormno = 0;
    toss_wsegs(wtails[wnum], true);
    wheads[wnum] = wtails[wnum] = null;
    wgrowtime[wnum] = 0;
    // C: has_mcorpsenm → MCORPSENM = NON_PM (no longer poly-proof)
    if ((worm.data?.mndx | 0) === PM_LONG_WORM && has_mcorpsenm(worm)) {
        worm.mextra.mcorpsenm = NON_PM;
    }
}

/**
 * C ref: worm.c wormhitu `:343–362`. Head already had its mattacku in
 * dochug; skip the dummy tail co-located with wheads. Remaining segs
 * attack when distu(wx,wy) < 3 (same-cell or adjacent, incl. diagonal).
 * Caller: monmove.c dochug PHASE FOUR.
 */
export async function wormhitu(worm) {
    const wnum = worm?.wormno | 0;
    if (!wnum) return 0;
    const u = game.u || {};
    const ux = u.ux | 0;
    const uy = u.uy | 0;
    for (let seg = wtails[wnum]; seg && seg !== wheads[wnum]; seg = seg.nseg) {
        const dx = (seg.wx | 0) - ux;
        const dy = (seg.wy | 0) - uy;
        if (dx * dx + dy * dy < 3) {
            if (await mattacku(worm)) return 1;
        }
    }
    return 0;
}

/**
 * C ref: worm.c shrink_worm — drop the tail (list start). No-op when the
 * worm is only the hidden dummy co-located with the head.
 */
function shrink_worm(wnum) {
    if (wtails[wnum] === wheads[wnum]) return; /* no tail */
    const seg = wtails[wnum];
    wtails[wnum] = seg.nseg;
    seg.nseg = null;
    toss_wsegs(seg, true);
}

/**
 * C ref: worm.c place_wsegs :614–635 — occupy every body seg with `worm`
 * (not the dummy co-located with the head). When `oldworm` is set,
 * the cell must currently hold that pointer (cutworm split / replmon).
 * Callers restore.c restmonchn / mon.c replmon still named.
 */
export function place_wsegs(worm, oldworm) {
    let curr = wtails[worm.wormno | 0];
    while (curr !== wheads[worm.wormno | 0]) {
        const x = curr.wx | 0;
        const y = curr.wy | 0;
        const mtmp = level_mon_at(x, y);
        if (oldworm && mtmp === oldworm) {
            remove_monster_xy(x, y);
        } else if (mtmp) {
            void impossible(
                'placing worm seg <%d,%d> over another mon', x, y,
            );
        } else if (oldworm) {
            void impossible(
                'replacing worm seg <%d,%d> on empty spot', x, y,
            );
        }
        place_worm_seg(worm, x, y);
        curr = curr.nseg;
    }
    /* head dummy is co-located with the monster; not placed on the map */
    curr.wx = worm.mx | 0;
    curr.wy = worm.my | 0;
}

/**
 * C ref: worm.c cutworm :372–477 — hit a long-worm body cell: rnd(20)
 * (+10 if blade/axe), fail if <17; tail-only shrinks; else split.
 * New worm only when m_lev>=3 && !rn2(3) && get_wormno() && clone_mon.
 * clone_mon is async (tamedog); pline/You are async. Head hits and
 * !wormno return before rnd. Callers uhitm known_hitum / dothrow
 * thitmonst. wormgone named. redraw_worm is D-1577.
 */
export async function cutworm(worm, x, y, cuttier) {
    const wnum = worm?.wormno | 0;
    if (!wnum) return; /* bullet-proofing */

    x = x | 0;
    y = y | 0;
    if (x === (worm.mx | 0) && y === (worm.my | 0)) return; /* hit on head */

    /* cutting goes best with a cuttier weapon */
    let cut_chance = rnd(20); /* 1-16 no, 17-20 yes; blade: 1-6 no, 7-20 yes */
    if (cuttier) cut_chance += 10;
    if (cut_chance < 17) return; /* not good enough */

    let curr = wtails[wnum];
    while ((curr.wx | 0) !== x || (curr.wy | 0) !== y) {
        curr = curr.nseg;
        if (!curr) {
            await impossible('cutworm: no segment at (%d,%d)', x, y);
            return;
        }
    }

    /* tail segment: the worm just loses it */
    if (curr === wtails[wnum]) {
        shrink_worm(wnum);
        return;
    }

    /*
     * Split. New worm's tail is the old tail; old worm's tail is the
     * segment after curr; curr becomes the dummy under the new head.
     */
    const new_tail = wtails[wnum];
    wtails[wnum] = curr.nseg;
    curr.nseg = null;

    /* old worm must be at least level 3 to produce a new worm */
    let new_worm = null;
    const new_wnum = ((worm.m_lev | 0) >= 3 && !rn2(3)) ? get_wormno() : 0;
    if (new_wnum) {
        remove_monster_xy(x, y); /* clone_mon puts new head here */
        new_worm = await clone_mon(worm, x, y);
    }

    /* Sometimes the tail end dies. */
    if (!new_worm) {
        place_worm_seg(worm, x, y); /* place the "head" segment back */
        if (game.context?.mon_moving) {
            if (canspotmon(worm)) {
                await pline(
                    `Part of ${s_suffix(mon_nam(worm))} tail has been cut off.`,
                );
            }
        } else {
            await pline(
                `You cut part of the tail off of ${mon_nam(worm)}.`,
            );
        }
        toss_wsegs(new_tail, true);
        if ((worm.mhp | 0) > 1) worm.mhp = Math.trunc((worm.mhp | 0) / 2);
        return;
    }

    new_worm.wormno = new_wnum; /* affix new worm number */
    new_worm.mcloned = 0; /* treat second worm as a normal monster */

    /* Devalue m_lev of both halves. m_lev is always at least 3 here. */
    worm.m_lev = Math.max((worm.m_lev | 0) - 2, 3);
    new_worm.m_lev = worm.m_lev;

    /* <N>d8 for long worms; not newmonhp (would reset m_lev). */
    new_worm.mhpmax = new_worm.mhp = d(new_worm.m_lev | 0, 8);
    worm.mhpmax = d(worm.m_lev | 0, 8);
    if ((worm.mhpmax | 0) < (worm.mhp | 0)) worm.mhp = worm.mhpmax;

    wtails[new_wnum] = new_tail;
    wheads[new_wnum] = curr;
    wgrowtime[new_wnum] = 0;

    place_wsegs(new_worm, worm);

    if (game.context?.mon_moving) {
        await pline(`${Monnam(worm)} is cut in half.`);
    } else {
        await pline(`You cut ${mon_nam(worm)} in half.`);
    }
}

/**
 * C ref: mon.c mcalcmove(mon, FALSE) — mmove + MSLOW/MFAST only; the
 * m_moving rn2 rounding is skipped. Local copy so worm.js does not
 * import mon.js (mon.js already imports worm_cross).
 */
function worm_mcalcmove(worm) {
    let mmove = worm.data?.mmove ?? NORMAL_SPEED;
    if (worm.mspeed === MSLOW) {
        if (mmove < NORMAL_SPEED) mmove = Math.trunc((2 * mmove + 1) / 3);
        else mmove = 4 + Math.trunc(mmove / 3);
    } else if (worm.mspeed === MFAST) {
        mmove = Math.trunc((4 * mmove + 2) / 3);
    }
    return mmove;
}

/**
 * C ref: worm.c worm_move — caller already moved the head (place_monster).
 * Occupy the old dummy as a visible segment, append a new dummy at the
 * new head, then either grow (wgrowtime/HP) or shrink the tail.
 * Caller must check worm.wormno.
 */
export function worm_move(worm) {
    const wnum = worm.wormno | 0;
    const seg = wheads[wnum];
    place_worm_seg(worm, seg.wx, seg.wy);
    newsym(seg.wx, seg.wy);

    const new_seg = newseg();
    new_seg.wx = worm.mx | 0;
    new_seg.wy = worm.my | 0;
    new_seg.nseg = null;
    seg.nseg = new_seg;
    wheads[wnum] = new_seg;

    if ((wgrowtime[wnum] | 0) <= (game.moves | 0)) {
        let wsegs = count_wsegs(worm);

        if (!wgrowtime[wnum]) {
            wgrowtime[wnum] = (game.moves | 0) + rnd(5);
        } else {
            const mmove = worm_mcalcmove(worm);
            let incr = rn1(10, 2); /* 2..11 */
            incr = Math.trunc((incr * NORMAL_SPEED) / Math.max(mmove, 1));
            wgrowtime[wnum] = (game.moves | 0) + incr;
        }

        let whplimit = !(worm.m_lev | 0) ? 4 : (8 * (worm.m_lev | 0));
        /* wsegs includes the hidden dummy co-located with the head */
        if (wsegs > 33) {
            whplimit += 2 * (wsegs - 33);
            wsegs = 33;
        }
        if (wsegs > 22) {
            whplimit += 4 * (wsegs - 22);
            wsegs = 22;
        }
        if (wsegs > 11) {
            whplimit += 6 * (wsegs - 11);
            wsegs = 11;
        }
        whplimit += 8 * wsegs;
        if (whplimit > MHPMAX) whplimit = MHPMAX;

        const prev_mhp = worm.mhp | 0;
        worm.mhp = prev_mhp + d(2, 2); /* 2..4 */
        const whpcap = Math.max(whplimit, worm.mhpmax | 0);
        if ((worm.mhp | 0) < whpcap) {
            if ((worm.mhp | 0) > whplimit) {
                worm.mhp = Math.max(prev_mhp, whplimit);
            }
            if ((worm.mhp | 0) > (worm.mhpmax | 0)) {
                worm.mhpmax = worm.mhp | 0;
            }
        } else if ((worm.mhp | 0) > (worm.mhpmax | 0)) {
            worm.mhp = worm.mhpmax | 0;
        }
    } else {
        shrink_worm(wnum);
    }
}

/**
 * C ref: worm.c worm_nomove — failed move: drop the tail and maybe HP.
 * Caller must check worm.wormno.
 */
export function worm_nomove(worm) {
    shrink_worm(worm.wormno | 0);
    if ((worm.mhp | 0) > count_wsegs(worm)) {
        worm.mhp = (worm.mhp | 0) - d(2, 2);
        if ((worm.mhp | 0) < 1) worm.mhp = 1;
    }
}

/**
 * C ref: worm.c see_wsegs :487–495 — newsym every segment except the
 * dummy co-located with the head. Callers: display.c see_monsters
 * `:1511–1512`; worn.c mon_set_minvis `:482–483`; monmove.c postmov
 * `:1683–1686` after pickup when minvis.
 */
export function see_wsegs(worm) {
    const wnum = worm?.wormno | 0;
    if (!wnum) return;
    let curr = wtails[wnum];
    const head = wheads[wnum];
    while (curr && curr !== head) {
        newsym(curr.wx, curr.wy);
        curr = curr.nseg;
    }
}

/**
 * C ref: worm.c redraw_worm `:989–998` — newsym every segment including
 * the dummy co-located with the head (unlike see_wsegs, which stops
 * before wheads). Callers: dog.c tamedog `:1275–1276` after head
 * newsym; abuse_dog `:1386–1390` when the pet goes wild. Caller checks
 * wormno; C does not re-check inside the walker.
 */
export function redraw_worm(worm) {
    let curr = wtails[worm.wormno | 0];
    while (curr) {
        newsym(curr.wx, curr.wy);
        curr = curr.nseg;
    }
}

/**
 * C ref: worm.c worm_known :877–893 — true if any segment (incl. dummy
 * co-located with the head) is cansee. Caller must check invisibility
 * and telepathy (head only). Used by display.h _canseemon when
 * mon->wormno, mon.c monkilled :3384, vision.c howmonseen :2162.
 * Does not use infrared (unlike the non-worm canseemon arm).
 */
export function worm_known(worm) {
    let curr = wtails[worm?.wormno | 0];
    while (curr) {
        if (cansee(curr.wx, curr.wy)) return true;
        curr = curr.nseg;
    }
    return false;
}

/**
 * C ref: worm.c detect_wsegs :502–519 — show_glyph every body seg except
 * the dummy co-located with the head. Caller detect.c map_monst
 * `:132–133` (showtail && PM_LONG_WORM) always passes
 * use_detection_glyph=0. what_mon(PM_LONG_WORM_TAIL, newsym_rn2) runs
 * once before the loop (Hallu display rng even if dummy-only).
 * Named: male/fem glyph offsets (same mlet on tty).
 */
export function detect_wsegs(worm, use_detection_glyph) {
    const wnum = worm?.wormno | 0;
    let curr = wtails[wnum];
    const head = wheads[wnum];
    /* C: what_mon(PM_LONG_WORM_TAIL, newsym_rn2) before the while */
    let what_tail = PM_LONG_WORM_TAIL;
    if (Hallucination()) what_tail = rn2_on_display_rng(NUMMONS);
    while (curr && curr !== head) {
        show_wseg_detect_glyph(
            curr.wx, curr.wy, what_tail, worm, !!use_detection_glyph,
        );
        curr = curr.nseg;
    }
}

/**
 * Local mon-path of trap.c rnd_nextto_goodpos — avoid worm↔trap↔makemon cycle.
 * Hero/crawl_destination arm deferred (worms are never &youmonst here).
 */
function rnd_nextto_goodpos_mon(pos, mtmp) {
    const dirs = [];
    for (let i = 0; i < N_DIRS; i++) dirs.push(i);
    for (let i = N_DIRS; i > 0; --i) {
        const j = rn2(i);
        const k = dirs[j];
        dirs[j] = dirs[i - 1];
        dirs[i - 1] = k;
    }
    for (let i = 0; i < N_DIRS; i++) {
        const nx = (pos.x | 0) + xdir[dirs[i]];
        const ny = (pos.y | 0) + ydir[dirs[i]];
        if (goodpos(nx, ny, mtmp, 0)) {
            pos.x = nx;
            pos.y = ny;
            return true;
        }
    }
    return false;
}

/**
 * C ref: worm.c place_worm_tail_randomly — reverse segs behind head via
 * rnd_nextto_goodpos; truncate with toss_wsegs when stuck.
 */
export function place_worm_tail_randomly(worm, x, y) {
    const wnum = worm.wormno | 0;
    let curr = wtails[wnum];
    let ox = x | 0;
    let oy = y | 0;

    if (wnum && (!wtails[wnum] || !wheads[wnum])) return;
    if (wtails[wnum] === wheads[wnum]) {
        if (curr.wx && (curr.wx !== worm.mx || curr.wy !== worm.my)) {
            if (worm_mon_at(curr.wx, curr.wy) === worm) {
                remove_monster_xy(curr.wx, curr.wy);
            }
        }
        curr.wx = worm.mx | 0;
        curr.wy = worm.my | 0;
        return;
    }

    wheads[wnum].wx = 0;
    wheads[wnum].wy = 0;

    let new_tail = curr;
    wheads[wnum] = new_tail;
    curr = curr.nseg;
    new_tail.nseg = null;
    new_tail.wx = x | 0;
    new_tail.wy = y | 0;

    while (curr) {
        const pos = { x: ox, y: oy };
        if (rnd_nextto_goodpos_mon(pos, worm)) {
            const nx = pos.x | 0;
            const ny = pos.y | 0;
            place_worm_seg(worm, nx, ny);
            curr.wx = ox = nx;
            curr.wy = oy = ny;
            wtails[wnum] = curr;
            curr = curr.nseg;
            wtails[wnum].nseg = new_tail;
            new_tail = wtails[wnum];
            newsym(nx, ny);
        } else {
            toss_wsegs(curr, false);
            curr = null;
        }
    }
}

/** Clear per-level worm tables — call from clear_level_structures. */
export function clear_wormdata() {
    for (let i = 0; i < MAX_NUM_WORMS; i++) {
        wheads[i] = null;
        wtails[i] = null;
        wgrowtime[i] = 0;
    }
    game._level_monsters = new Map();
}

/**
 * C ref: worm.c worm_cross — true if diagonal between (x1,y1)-(x2,y2) would
 * pass through consecutive segments of the same long worm (flank cells).
 * Uses level.monsters occupancy (same as C m_at on worm segs).
 */
export function worm_cross(x1, y1, x2, y2) {
    const distmin = Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
    if (distmin !== 1) return false;
    if (x1 === x2 || y1 === y2) return false;
    const worm = worm_mon_at(x1, y2) || _fmon_at(x1, y2);
    if (!worm) return false;
    const other = worm_mon_at(x2, y1) || _fmon_at(x2, y1);
    if (other !== worm) return false;
    const wnum = worm.wormno | 0;
    if (!wnum) return false;
    for (let curr = wtails[wnum]; curr; curr = curr.nseg) {
        const wnxt = curr.nseg;
        if (!wnxt) break;
        if (curr.wx === x1 && curr.wy === y2) {
            return wnxt.wx === x2 && wnxt.wy === y1;
        }
        if (curr.wx === x2 && curr.wy === y1) {
            return wnxt.wx === x1 && wnxt.wy === y2;
        }
    }
    return false;
}

/** Head-only occupancy (worm body segs already via worm_mon_at). */
function _fmon_at(x, y) {
    const steed = game.u?.usteed;
    for (const m of game.fmon || []) {
        if (m === steed) continue;
        if (m.mx === x && m.my === y) return m;
    }
    return null;
}
