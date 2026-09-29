// worm.js — port of nethack-c/src/worm.c (scaffold: functions are added here
// one packet at a time by the porting fleet; see tasks/generated/port-*.yaml)

import { MAX_NUM_WORMS, NON_PM, MCORPSENM, NORMAL_SPEED, MSLOW, MFAST, MHPMAX } from './const.js';
import { PM_LONG_WORM } from './pm.generated.js';
import { rnd_nextto_goodpos } from './trap.js';
import { newsym } from './display.js';
import { m_at } from './uhitm.js';
import { game } from './gstate.js';
import { cansee } from './vision.js';
import { rn2, rnd, rn1, d } from './rng.js';
import monsPack from './makemon_mons.json' with { type: 'json' };

// C ref: worm.c:77-79 — static struct wseg *wheads[MAX_NUM_WORMS],
// *wtails[MAX_NUM_WORMS]; static long wgrowtime[MAX_NUM_WORMS]. Module-private
// arrays, same pattern as js/region.js's svn/gr/gm.
let wheads = new Array(MAX_NUM_WORMS).fill(null);
let wtails = new Array(MAX_NUM_WORMS).fill(null);
let wgrowtime = new Array(MAX_NUM_WORMS).fill(0);

/* C save.c:543 save_worm() / restore.c:getlev -> rest_worm().  Segment roots
 * and growth deadlines are module state, so a detached whole-save graph must
 * carry them explicitly.  Do not clone segment nodes: the graph encoder owns
 * their aliases with fmon and preserves each tail/head chain's identity. */
export function worms_save_snapshot(release = false) {
    const saved = {
        wheads: wheads.slice(),
        wtails: wtails.slice(),
        wgrowtime: wgrowtime.slice(),
    };
    /* savelev_core(...FREEING) follows save_worm with release_data.  Free the
     * active slot roots only after recording them so get_wormno() can reuse the
     * C slot on the next level. */
    if (release) {
        for (let i = 1; i < MAX_NUM_WORMS; i++) {
            if (!wtails[i]) continue;
            wheads[i] = wtails[i] = null;
            wgrowtime[i] = 0;
        }
    }
    return saved;
}

export function worms_rest_snapshot(saved) {
    /* C reads fresh root arrays from the level record.  Copy the containers
     * here too: segment objects stay shared with the decoded graph, while a
     * later release_data() cannot erase an inactive level snapshot in place. */
    wheads = saved?.wheads?.slice() ?? new Array(MAX_NUM_WORMS).fill(null);
    wtails = saved?.wtails?.slice() ?? new Array(MAX_NUM_WORMS).fill(null);
    wgrowtime = saved?.wgrowtime?.slice() ?? new Array(MAX_NUM_WORMS).fill(0);
    /* The level grid is rebuilt by restore.js#getlev via place_wsegs(). */
    _seg_occ.clear();
}

// newseg() (worm.c:8) — #define newseg() (struct wseg *) alloc(sizeof (struct
// wseg)); calls_macro_or_libc for this packet, reproduced inline (alloc has
// no sizeof/malloc model in JS) rather than stubbed, same pattern as
// js/dungeon.js's local alloc(_size) stub.
function newseg() { return {}; }

/* THE MAP-GRID GAP — NARROWED 2026-08-21, and the note is kept because the
 * rest of it still stands.
 * C keeps worm segments in `svl.level.monsters[x][y]` — place_worm_seg(m,x,y)
 * (rm.h:533) writes the grid, remove_monster(x,y) (rm.h:534) clears it, and
 * m_at()/MON_AT() READ that grid.  This port has no such grid: js/uhitm.js
 * m_at walks the fmon chain, and a worm segment is not an fmon entry.  The
 * note that used to sit here argued the gap was CHEAP, on the grounds that
 * rnd_nextto_goodpos shuffles before it tests, so a segment we fail to place
 * on the grid cannot change a DRAW COUNT.  That is true of the tail layout
 * itself and false of everything else that reads the grid, which is the half
 * this file never measured:
 *
 *   seed0373-barbarian-quest-tour step 78 generates Sokoban level 1, whose
 *   soko1-1.lua zoo region is filled by fill_zoo(mkroom.c:345).  At the zoo's
 *   8th square C makes a long worm (`rn2(5)=3 @ makemon(makemon.c:1406)`,
 *   leaf 24531 — initworm with 3 tail segments) and lays its tail across three
 *   further squares of that same zoo.  fill_zoo then walks on, and C's
 *   makemon() returns 0 at each of those three squares WITHOUT A SINGLE DRAW
 *   (makemon.c:1193 `if (MON_AT(x, y)) ... return 0`), while still running the
 *   ZOO arm's mkgold().  This port drew a whole monster on each of them: at
 *   leaf 25654 C is on its next square's `mkgold(rn1(100,10))` and we are
 *   already inside rndmonst_adj().  Three occupied squares, one first
 *   divergence, and every leaf of that level's generation after it.
 *
 * So the segment squares are now recorded here, in a module-local occupancy
 * map, and js/uhitm.js m_at() consults it after its fmon walk comes up empty —
 * which is what C's single grid read does in one step.  What is STILL missing
 * is the grid itself: a square holding a live fmon monster and a square
 * holding a worm segment are two different lookups here where C has one, and
 * nothing in this port maintains the grid across level changes, so the map is
 * cleared when a worm is tossed and when its level is left. */
const _seg_occ = new Map();          /* (x<<8|y) -> the worm whose segment is here */
const _seg_key = (x, y) => (((x | 0) << 8) | (y & 0xff));
/* C rm.h:533 place_worm_seg(m, x, y) — `svl.level.monsters[x][y] = m`. */
function place_worm_seg(worm, x, y) { _seg_occ.set(_seg_key(x, y), worm); }
/* C rm.h:534 remove_monster(x, y) — `svl.level.monsters[x][y] = 0`.  Only ever
 * called here for a square this file put a segment on. */
function remove_monster(x, y) { _seg_occ.delete(_seg_key(x, y)); }
/* The grid READ, for js/uhitm.js m_at().  C has no separate entry point: its
 * m_at() is the one grid lookup and a segment square answers with the worm. */
export function worm_seg_at(x, y) { return _seg_occ.get(_seg_key(x, y)) || null; }
/* C sp_lev.c:844-846 / :858-860 — the `svl.level.monsters[x][y]` third of
 * flip_level()'s map swap, which sits beside the levl[][] and level.objects[][]
 * swaps js/sp_lev.js already performs.  C flips a worm's body in TWO places and
 * needs both: flip_worm_segs_{vertical,horizontal}() above rewrite each
 * segment's own <wx,wy>, and this grid swap moves the segment's OCCUPANCY with
 * the terrain.  js/sp_lev.js carried a note saying the monsters[][] swap was
 * unnecessary because "game.level.monsters has no real backing"; that stopped
 * being true when _seg_occ was added here, and the two halves then disagreed —
 * a flipped level's worm had its segments' coordinates on one side of the map
 * and their occupancy on the other.
 *
 * MEASURED on gen345-reseed-seed244908 (corpus-generated/v5/train) step 42:
 * the Dlvl-11 arrival flips horizontally, C shows the long worm's two tail
 * segments at <72,11> and <72,12>, and this port had flipped the segments to
 * 72 while leaving _seg_occ keyed at 8 — so m_at() found nothing there and
 * newsym() painted floor.
 *
 * Spelled as a per-cell swap called from the flip loops rather than as a
 * bulk re-key, so it is the same statement in the same place as C's. */
export function worm_seg_swap(x1, y1, x2, y2) {
    const k1 = _seg_key(x1, y1), k2 = _seg_key(x2, y2);
    const a = _seg_occ.get(k1), b = _seg_occ.get(k2);
    if (a === undefined && b === undefined)
        return;
    if (b === undefined) _seg_occ.delete(k1); else _seg_occ.set(k1, b);
    if (a === undefined) _seg_occ.delete(k2); else _seg_occ.set(k2, a);
}
/* Every segment of every worm leaves the map when its level does.  C does not
 * need this (the grid is per-level state that goes away with the level); this
 * port's map is module-global, so a stale segment square would make a square on
 * the NEXT level occupied.  Called from the same place that resets the rest of
 * the per-level worm state. */
export function worm_seg_clear_level() { _seg_occ.clear(); }
function dealloc_seg(_seg) { /* C worm.c:11 — free(); JS is garbage-collected */ }

/* C worm.c:95-106 get_wormno() — first free wtails[]/wheads[] slot, or 0 when
 * the level is "infested with worms". */
export function get_wormno() {
    let new_wormno = 1;

    while (new_wormno < MAX_NUM_WORMS) {
        if (!wheads[new_wormno])
            return new_wormno; /* found empty wtails[] slot at new_wormno */
        new_wormno++;
    }
    return 0; /* level infested with worms */
}

/* C worm.c:851-876 create_worm_tail(num_segs) — build a chain of
 * (num_segs + 1) segments and return its head.  NULL when num_segs == 0. */
function create_worm_tail(num_segs) {
    let i = 0;
    let new_tail, curr;

    if (!num_segs)
        return null;

    new_tail = curr = newseg();
    curr.nseg = null;
    curr.wx = 0;
    curr.wy = 0;

    while (i < num_segs) {
        curr.nseg = newseg();
        curr = curr.nseg;
        curr.nseg = null;
        curr.wx = 0;
        curr.wy = 0;
        i++;
    }

    return new_tail;
}

/* C worm.c:119-137 initworm(worm, wseg_count).
 * Caller must have done `if (mon->wormno = get_wormno())` first. */
export function initworm(worm, wseg_count) {
    let seg;
    const new_tail = create_worm_tail(wseg_count);
    const wnum = worm.wormno;

    if (new_tail) {
        wtails[wnum] = new_tail;
        for (seg = new_tail; seg.nseg; seg = seg.nseg)
            continue;
        wheads[wnum] = seg;
    } else {
        wtails[wnum] = wheads[wnum] = seg = newseg();
        seg.nseg = null;
    }
    seg.wx = worm.mx;
    seg.wy = worm.my;
    wgrowtime[wnum] = 0;
}

/* C worm.c:836-846 count_wsegs(mtmp) — segments AFTER the tail's first node. */
export function count_wsegs(mtmp) {
    let i = 0;
    let curr;

    if (mtmp.wormno) {
        for (curr = wtails[mtmp.wormno].nseg; curr; curr = curr.nseg)
            i++;
    }
    return i;
}

/* C worm.c:145-167 toss_wsegs(curr, display_update) — drop this segment and
 * every one after it. */
function toss_wsegs(curr, display_update) {
    let nxtseg;

    while (curr) {
        nxtseg = curr.nseg;

        /* remove from level.monsters[][];
           need to check curr->wx for genocided while migrating_mon */
        if (curr.wx) {
            remove_monster(curr.wx, curr.wy);

            /* update screen before deallocation */
            if (display_update)
                newsym(curr.wx, curr.wy);
        }

        /* free memory used by the segment */
        dealloc_seg(curr);
        curr = nxtseg;
    }
}

/* C worm.c:170-186 shrink_worm(wnum) — staticfn in C: remove the tail segment
 * (the starting segment of the list).  RNG-free (toss_wsegs draws nothing). */
function shrink_worm(wnum) {
    if (wtails[wnum] === wheads[wnum])
        return; /* no tail */

    const seg = wtails[wnum];
    wtails[wnum] = seg.nseg;
    seg.nseg = null;
    toss_wsegs(seg, true);
}

/* C worm.c:281-298 worm_nomove — a worm that could not move loses its
 * outermost tail segment, then takes 2d2 damage only while its remaining
 * segment count is below its hit points. */
export function worm_nomove(worm) {
    shrink_worm(worm.wormno);
    if (worm.mhp > count_wsegs(worm)) {
        worm.mhp -= d(2, 2);
        if (worm.mhp < 1)
            worm.mhp = 1;
    }
}

/* C worm.c:364-478 cutworm.  The clone_mon arm is unavailable in this port,
 * so a successful cut keeps the surviving tail on the original worm and
 * discards the struck half; the chance and all core RNG draws are preserved. */
export function cutworm(worm, x, y, cuttier) {
    const wnum = worm?.wormno | 0;
    if (!wnum || ((x | 0) === (worm.mx | 0) && (y | 0) === (worm.my | 0)))
        return false;
    let cutChance = rnd(20);
    if (cuttier) cutChance += 10;
    if (cutChance < 17) return false;

    let curr = wtails[wnum];
    while (curr && ((curr.wx | 0) !== (x | 0) || (curr.wy | 0) !== (y | 0)))
        curr = curr.nseg;
    if (!curr) return false;
    if (curr === wtails[wnum]) {
        shrink_worm(wnum);
        return true;
    }

    const oldTail = wtails[wnum];
    wtails[wnum] = curr.nseg;
    curr.nseg = null;
    place_worm_seg(worm, x | 0, y | 0);
    toss_wsegs(oldTail, true);
    worm.mhp = Math.max(1, Math.trunc((worm.mhp | 0) / 2));
    return true;
}

const MONS = /** @type {number[][]} */ (monsPack.mons);

/* C ref: mon.c:1108-1150 mcalcmove(mon, m_moving).  Private copy, deliberately
 * NOT shared with js/fastforward.js's own mcalcmove: that one hardcodes
 * m_moving=TRUE (no such parameter exists there — see its comment "m_moving=
 * TRUE: random rounding to a NORMAL_SPEED multiple"), so it cannot serve
 * worm_move's `mcalcmove(worm, FALSE)` call (worm.c:222).  With m_moving
 * FALSE, C's whole final "randomly round to a NORMAL_SPEED multiple" block —
 * including its rn2(NORMAL_SPEED) draw — is SKIPPED entirely; reusing the
 * fastforward.js version here would draw an RNG value C never draws at this
 * site.  This porter owns only js/worm.js and may not edit js/fastforward.js
 * to add the parameter, so this is a faithful independent copy rather than a
 * shared import.  The u.usteed/ugallop branch is kept for exact structural
 * fidelity even though a long worm can never be u.usteed (worms are never
 * rideable), so it is always false in practice and draws nothing here. */
function mcalcmove(mon, m_moving) {
    const mndx = (mon.data?.pmidx ?? mon.mndx ?? mon.mnum ?? 0) | 0;
    let mmove = (mndx >= 0 && mndx < MONS.length) ? ((MONS[mndx][9] ?? 0) | 0) : 0;
    const mspeed = mon.mspeed | 0;

    if (mspeed === MSLOW) {
        if (mmove < NORMAL_SPEED)
            mmove = Math.trunc((2 * mmove + 1) / 3);
        else
            mmove = 4 + Math.trunc(mmove / 3);
    } else if (mspeed === MFAST) {
        mmove = Math.trunc((4 * mmove + 2) / 3);
    }

    /* C mon.c:1148-1153 — if (mon == u.usteed && u.ugallop && svc.context.mv)
       mmove = ((rn2(2) ? 4 : 5) * mmove) / 3; -- dead for a worm, kept for
       fidelity (see comment above). */
    if (mon === game.u?.usteed && (game.u?.ugallop | 0) && (game.context?.mv | 0)) {
        mmove = Math.trunc(((rn2(2) ? 4 : 5) * mmove) / 3);
    }

    if (m_moving) {
        const mmove_adj = mmove % NORMAL_SPEED;
        mmove -= mmove_adj;
        if (rn2(NORMAL_SPEED) < mmove_adj)
            mmove += NORMAL_SPEED;
    }
    return mmove;
}

/* C worm.c:189-279 worm_move(worm) — move the worm: place a new head-mirror
 * segment where the head just left, then either grow (extend the tail) or
 * shrink it, on the wgrowtime[] schedule.  Caller must gate on mon->wormno
 * (C's own doc comment on the function).
 *
 * RNG, in exact C order, only on the wgrowtime[wnum] <= svm.moves branch:
 *   mmove = mcalcmove(worm, FALSE)   -- draws nothing for a worm (see above)
 *   incr = rn1(10, 2)                -- SKIPPED when !wgrowtime[wnum]
 *   ... else: rnd(5)                 -- only when !wgrowtime[wnum]
 *   worm->mhp += d(2, 2)             -- unconditional on this branch
 * C's `int mmove = mcalcmove(worm, FALSE), incr = rn1(10, 2);` is one
 * declaration list evaluated left to right, so mmove is computed before incr
 * — reproduced in that order even though mcalcmove draws nothing in
 * practice, so no real corpus session can tell the two orders apart.
 * The no-growth branch (shrink_worm) draws nothing. */
export function worm_move(worm) {
    const wnum = worm.wormno | 0;

    /* Place a segment at the old worm head.  The head has already moved. */
    const seg = wheads[wnum];
    place_worm_seg(worm, seg.wx, seg.wy);
    newsym(seg.wx, seg.wy); /* display the new segment */

    /* Create a new dummy segment head and place it at the end of the list. */
    const new_seg = newseg();
    new_seg.wx = worm.mx;
    new_seg.wy = worm.my;
    new_seg.nseg = null;
    seg.nseg = new_seg;     /* attach it to the end of the list */
    wheads[wnum] = new_seg; /* move the end pointer */

    if (wgrowtime[wnum] <= (game.moves | 0)) {
        let wsegs = count_wsegs(worm);

        /* first set up for the next time to grow */
        if (!wgrowtime[wnum]) {
            /* new worm; usually grow a tail segment on its next turn */
            wgrowtime[wnum] = (game.moves | 0) + rnd(5);
        } else {
            const mmove = mcalcmove(worm, false);
            const incr0 = rn1(10, 2);
            const incr = Math.trunc((incr0 * NORMAL_SPEED) / Math.max(mmove, 1));
            wgrowtime[wnum] = (game.moves | 0) + incr;
        }

        /* increase HP based on number of segments; if it has shrunk, it
           won't gain new HP until regaining previous peak segment count;
           when wounded (whether from damage or from shrinking), the HP
           which might have been 'new' will heal */
        let whplimit = !worm.m_lev ? 4 : (8 * (worm.m_lev | 0));
        /* note: wsegs includes the hidden segment co-located with the head */
        if (wsegs > 33) { whplimit += 2 * (wsegs - 33); wsegs = 33; }
        if (wsegs > 22) { whplimit += 4 * (wsegs - 22); wsegs = 22; }
        if (wsegs > 11) { whplimit += 6 * (wsegs - 11); wsegs = 11; }
        whplimit += 8 * wsegs;
        if (whplimit > MHPMAX)
            whplimit = MHPMAX;

        const prev_mhp = worm.mhp | 0;
        worm.mhp = (worm.mhp | 0) + d(2, 2); /* 2..4, average 3 */
        const whpcap = Math.max(whplimit, worm.mhpmax | 0);
        if ((worm.mhp | 0) < whpcap) {
            /* can't exceed segment-derived limit unless level increase after
               peak tail growth has already done so; when that isn't the case,
               if segment growth exceeds current max HP then increase it */
            if ((worm.mhp | 0) > whplimit)
                worm.mhp = Math.max(prev_mhp, whplimit);
            if ((worm.mhp | 0) > (worm.mhpmax | 0))
                worm.mhpmax = worm.mhp;
        } else {
            if ((worm.mhp | 0) > (worm.mhpmax | 0))
                worm.mhp = worm.mhpmax;
        }
    } else {
        /* The worm doesn't grow, so the last segment goes away.
           (Done after inserting an extra segment at the head, so it
           isn't getting smaller here, just changing location without
           having to move any of the intermediate segments.) */
        shrink_worm(wnum);
    }
}

/* C worm.c:967-976 flip_worm_segs_vertical(worm, miny, maxy) and
 * worm.c:978-987 flip_worm_segs_horizontal(worm, minx, maxx) — sp_lev.c's
 * flip_level() calls these for any monster with a wormno (sp_lev.c:660-665).
 * js/sp_lev.js threw "js/worm.js does not exist, there is no
 * flip_worm_segs_vertical/horizontal to call" here; the file does exist. */
export function flip_worm_segs_vertical(worm, miny, maxy) {
    let curr = wtails[worm.wormno];

    while (curr) {
        curr.wy = (maxy - curr.wy + miny);
        curr = curr.nseg;
    }
}

export function flip_worm_segs_horizontal(worm, minx, maxx) {
    let curr = wtails[worm.wormno];

    while (curr) {
        curr.wx = (maxx - curr.wx + minx);
        curr = curr.nseg;
    }
}

/* C worm.c:737-791 place_worm_tail_randomly(worm, x, y) — lay the tail out on
 * squares adjoining <x,y>, one rnd_nextto_goodpos() per segment, truncating
 * when there is nowhere left to put the rest.
 * The `impossible()` arms are C's own diagnostics: they log and return (or fall
 * through), so they are reproduced as the same control flow with no message. */
export function place_worm_tail_randomly(worm, x, y) {
    const wnum = worm.wormno;
    let curr = wtails[wnum];
    let new_tail;
    let ox = x, oy = y;

    if (wnum && (!wtails[wnum] || !wheads[wnum])) {
        /* impossible("place_worm_tail_randomly: wormno is set without a tail!") */
        return;
    }
    if (wtails[wnum] === wheads[wnum]) {
        /* single segment, co-located with worm;
           should either have same coordinates or have seg->wx==0
           to indicate that it is not currently on the map */
        if (curr.wx && (curr.wx !== worm.mx || curr.wy !== worm.my)) {
            /* impossible("... tail segment at <%d,%d>, worm at <%d,%d>") */
            if (m_at(curr.wx, curr.wy) === worm)
                remove_monster(curr.wx, curr.wy);
        }
        curr.wx = worm.mx; curr.wy = worm.my;
        return;
    }
    /* remove head segment from map in case we end up calling toss_wsegs();
       if it doesn't get tossed, it will become the final tail segment and
       get new coordinates */
    wheads[wnum].wx = wheads[wnum].wy = 0;

    wheads[wnum] = new_tail = curr;
    curr = curr.nseg;
    new_tail.nseg = null;
    new_tail.wx = x;
    new_tail.wy = y;

    while (curr) {
        /* C passes &nx/&ny; js/trap.js rnd_nextto_goodpos takes the same
         * coordptr boxes its coordptr_get/coordptr_set helpers understand. */
        const nx = { value: ox }, ny = { value: oy };

        if (rnd_nextto_goodpos(nx, ny, worm)) {
            place_worm_seg(worm, nx.value, ny.value);
            curr.wx = (ox = nx.value);
            curr.wy = (oy = ny.value);
            wtails[wnum] = curr;
            curr = curr.nseg;
            wtails[wnum].nseg = new_tail;
            new_tail = wtails[wnum];
            newsym(nx.value, ny.value);
        } else {
            /* Oops.  Truncate because there is no place for rest of it. */
            toss_wsegs(curr, false);
            curr = null;
        }
    }
}

/* C ref: worm.c:606-634 place_wsegs(worm, oldworm) — "Place the segments of
 * the given worm.  Called from restore.c and from replmon() in mon.c.  If
 * oldworm is not NULL, assumes the oldworm segments are on map in the same
 * location as worm segments."
 *
 * This is the BULK RE-WRITE of svl.level.monsters[][] for one worm: every
 * segment from wtails[] up to (not including) wheads[] is re-pointed at
 * `worm`.  It is the exact counterpart of remove_worm() below, and it is the
 * only way C's grid is refilled for a level that is read back in —
 * restore.c:1177-1180 clears the WHOLE grid and restore.c:1194-1196 then calls
 * this for every fmon monster carrying a wormno.  Without it a revisited level
 * has a worm whose head is on the fmon chain and whose body is nowhere: the
 * inverse of the stale-occupancy bug, and the same class as the flip_level
 * swap (worm_seg_swap above) — a C site that rewrites the real array wholesale
 * while this port's stand-in tracks none of it.
 *
 * C's two impossible() calls are diagnostics, not control flow: place_worm_seg
 * runs on every iteration either way.  They are left as this port's no-op
 * impossible() convention (js/steed.js:118) rather than as a branch, so the
 * shape of the if/else-if ladder is kept and only the message is dropped.
 *
 * The trailing `curr->wx = worm->mx, curr->wy = worm->my` is NOT bookkeeping:
 * the head segment is co-located with the worm itself and is deliberately not
 * on the map, so this is what keeps the chain's last link in step with a head
 * that may have moved since the segments were laid down.  RNG-free. */
export function place_wsegs(worm, oldworm) {
    const wnum = worm.wormno | 0;
    let curr = wtails[wnum];

    while (curr && curr !== wheads[wnum]) {
        const x = curr.wx, y = curr.wy;
        const mtmp = m_at(x, y);

        if (oldworm && mtmp === oldworm)
            remove_monster(x, y);
        /* else if (mtmp)   impossible("placing worm seg <%d,%d> over another mon")
           else if (oldworm) impossible("replacing worm seg <%d,%d> on empty spot") */

        place_worm_seg(worm, x, y);
        curr = curr.nseg;
    }
    /* head segment is co-located with worm itself so not placed on the map */
    if (curr) {
        curr.wx = worm.mx | 0;
        curr.wy = worm.my | 0;
    }
}

/* C ref: worm.c:706-726 remove_worm(worm) — "This function is equivalent to
 * the remove_monster #define in rm.h, only it will take the worm *and* tail
 * out of the levels array.  It does not get rid of (dealloc) the worm tail
 * structures, and it does not remove the mon from the fmon chain."
 *
 * Called from mon.c:2708 mon_leaving_level() (a worm dying or migrating), from
 * teleport.c rloc_to_core() and from dogmove.c mdisplacem().  It is the
 * counterpart of place_wsegs() above: the one C site that takes a whole worm
 * body OFF the grid at once.
 *
 * Before this, js/dog.js's mon_leaving_level() had no wormno arm at all, on
 * the (then true, now false) premise that this port has no monster grid.  The
 * consequence is the inverse of the flip_level bug and it is worse, because it
 * is silent: a dead or migrated worm left PHANTOM occupancy in _seg_occ
 * forever, and phantom occupancy does not paint anything wrong — it makes
 * m_at() answer "occupied" where C answers "empty", which SUPPRESSES the
 * makemon() draws C makes (the MON_AT early return, makemon.c:1193).  A
 * missing draw on the RNG axis, from a stand-in that nothing was clearing.
 *
 * Zeroing curr->wx is part of the contract, not bookkeeping: it is what marks
 * a segment as OFF the map, and it is what toss_wsegs()'s and this loop's own
 * `if (curr->wx)` guard re-read.  C's comment on toss_wsegs names the case —
 * "need to check curr->wx for genocided while migrating_mon".
 *
 * The loop runs to the END of the chain, head segment included; C's
 * remove_monster() there clears the grid cell holding the worm itself.  Here
 * that cell is in the fmon chain rather than in _seg_occ, so the delete is a
 * no-op and the newsym() is the whole of its effect — which is C's effect too.
 * RNG-free. */
export function remove_worm(worm) {
    let curr = wtails[worm.wormno | 0];

    while (curr) {
        if (curr.wx) {
            remove_monster(curr.wx, curr.wy);
            newsym(curr.wx, curr.wy);
            curr.wx = 0;
        }
        curr = curr.nseg;
    }
}

/* C ref: worm.c:300-330 wormgone(worm) — "discards tail segments, takes head
 * off the map".  Called from mon.c:2787 m_detach() (so: every worm death) and
 * from dog.c:755 mon_leave() (so: every worm migration), and it is the site
 * js/dog.js:1106 threw at with 'UNPORTED CALLEE: mon_leave long-worm tail'.
 *
 * Three things happen and all three matter:
 *   - worm->wormno = 0 FIRST, so the monster is "still a long worm but doesn't
 *     grow/shrink anymore"; every later `if (mtmp->wormno)` test sees 0.  Note
 *     C's own comment on the !wnum guard: "continuing with wnum==0 runs to
 *     completion", i.e. impossible() is a diagnostic and the body still runs.
 *   - toss_wsegs(wtails[wnum], TRUE) drops every segment AND, per C's comment
 *     here, "will also remove the real monster (ie 'w') from its position in
 *     level.monsters[][] (that happens when removing the hidden tail segment
 *     which is co-located with the head)".
 *   - wheads/wtails/wgrowtime for the slot are released, which is what lets
 *     get_wormno() hand slot `wnum` to the NEXT worm.  Without it this port
 *     leaks a slot per worm and runs out at MAX_NUM_WORMS.
 *
 * The MCORPSENM arm is C's polymorph-zap guard: a long worm created by a
 * polymorph zap carries PM_LONG_WORM in mcorpsenm so the same zap will not
 * re-polymorph the new tail, and losing the wormno is what makes it safe to
 * clear.  has_mcorpsenm(mon) is `mon->mextra && MCORPSENM(mon) != NON_PM`
 * (mextra.h); this port reads mextra.mcorpsenm through js/const.js's
 * MCORPSENM(), which already returns -1 (== NON_PM) when there is no mextra,
 * so the two-part C test collapses to one comparison here.  RNG-free. */
export function wormgone(worm) {
    const wnum = worm.wormno | 0;

    /* C: if (!wnum) impossible("wormgone: wormno is 0") — a diagnostic; the
     * body runs to completion either way, so no early return here. */

    worm.wormno = 0; /* still a long worm but doesn't grow/shrink anymore */
    /*
     *  This will also remove the real monster (ie 'w') from the its
     *  position in level.monsters[][].  (That happens when removing
     *  the hidden tail segment which is co-located with the head.)
     */
    toss_wsegs(wtails[wnum], true);

    wheads[wnum] = wtails[wnum] = null;
    wgrowtime[wnum] = 0;

    /* we don't expect to encounter this here but check for it anyway;
       when a long worm gets created by a polymorph zap, it gets flagged
       with MCORPSENM()==PM_LONG_WORM so that the same zap won't trigger
       another polymorph if it hits the new tail */
    const _wmndx = (worm.data?.pmidx ?? worm.mndx ?? worm.mnum ?? -1) | 0;
    if (_wmndx === PM_LONG_WORM && MCORPSENM(worm) !== NON_PM)
        worm.mextra.mcorpsenm = NON_PM; /* no longer polymorph-proof */
}

// Sfi_int/Sfi_coordxy/Sfi_long (savefile.h) — libc-level save-file field
// readers; no JS save-file byte model exists, so these are faithful no-op
// stubs (calls_macro_or_libc), same pattern as js/dungeon.js's / js/region.js's
// Sfi_int/Sfi_coordxy/Sfi_long.
function Sfi_int(nhfp, val, name) { return val; }
function Sfi_coordxy(nhfp, val, name) { return val; }
function Sfi_long(nhfp, val, name) { return val; }

// C ref: worm.c:576-609 rest_worm(NHFILE *nhfp)
export function rest_worm(nhfp) {
    let i, j;
    let count = 0;
    let curr, temp;

    for (i = 1; i < MAX_NUM_WORMS; i++) {
        count = Sfi_int(nhfp, count, "worm-segment_count");

        /* Get the segments. */
        for (curr = null, j = 0; j < count; j++) {
            temp = newseg();
            temp.nseg = null;
            temp.wx = Sfi_coordxy(nhfp, temp.wx, "worm-wx");
            temp.wy = Sfi_coordxy(nhfp, temp.wy, "worm-wy");
            if (curr)
                curr.nseg = temp;
            else
                wtails[i] = temp;
            curr = temp;
        }
        wheads[i] = curr;
    }
    for (i = 0; i < MAX_NUM_WORMS; ++i) {
        wgrowtime[i] = Sfi_long(nhfp, wgrowtime[i], "worm-wgrowtime");
    }
}

/* C ref: worm.c:895-941 worm_cross(x1, y1, x2, y2) — "would moving from
 * <x1,y1> to <x2,y2> involve passing between two consecutive segments of the
 * same worm?"  Read by test_move()'s tight-diagonal block (hack.c:1194).
 *
 * Lives here rather than in cmd.js because wtails[] is module-private to this
 * file (see the header): the two m_at() early-outs settle every non-worm map,
 * but the consecutive-segment walk needs the tail chain, so the whole function
 * belongs on this side of the module boundary.
 *
 * C's impossible() on a non-adjacent pair is a diagnostic, not control flow —
 * it returns FALSE either way, so it is not reproduced.  RNG-free. */
export function worm_cross(x1, y1, x2, y2) {
    /* attempting to pass between worm segs is only relevant for diagonal */
    if (x1 === x2 || y1 === y2)
        return false;
    /* is the same monster at <x1,y2> and at <x2,y1>? */
    const worm = m_at(x1, y2);
    if (!worm || m_at(x2, y1) !== worm)
        return false;
    /* same monster is at both adjacent spots, so must be a worm; we need
       to figure out if the two spots are occupied by consecutive segments */
    for (let curr = wtails[worm.wormno | 0]; curr; ) {
        const wnxt = curr.nseg;
        if (!wnxt)
            break; /* no next segment; can't continue */
        if (curr.wx === x1 && curr.wy === y2)
            return (wnxt.wx === x2 && wnxt.wy === y1);
        if (curr.wx === x2 && curr.wy === y1)
            return (wnxt.wx === x1 && wnxt.wy === y2);
        curr = wnxt;
    }
    /* should never reach here... */
    return false;
}

/* C ref: worm.c:213-222 see_wsegs(worm) — "Refresh all of the segments of the
 * given worm.  This is only called from see_monster() in display.c or when a
 * monster goes minvis."
 *
 *     struct wseg *curr = wtails[worm->wormno];
 *     while (curr != wheads[worm->wormno]) { newsym(curr->wx, curr->wy);
 *                                            curr = curr->nseg; }
 *
 * The head segment is deliberately NOT refreshed here: display.c's
 * see_monsters() has already newsym()ed the monster's own <mx,my>, which is
 * the head.  RNG-free (newsym's only randomness is rn2_on_display_rng, the
 * separate DISPLAY context).
 *
 * It lives here rather than in js/display.js because wtails/wheads are this
 * module's private state, the same reason C put it in worm.c ("It is located
 * here for modularity").  js/display.js carried a `see_wsegs` throw-stub until
 * 2026-08-19; that stub halted seed0360-wizard-world-tour at frame 159 the
 * moment allmain.c:466's per-move see_monsters() arm was wired and the run
 * reached a long worm. */
export function see_wsegs(worm) {
    const wnum = worm.wormno | 0;
    let curr = wtails[wnum];
    while (curr && curr !== wheads[wnum]) {
        newsym(curr.wx, curr.wy);
        curr = curr.nseg;
    }
}

/* C ref: worm.c:877-891 worm_known().  Kept here with the private segment
 * chains; vision.js consumes this predicate without importing display.js. */
export function worm_known(worm) {
    const wnum = worm?.wormno | 0;
    if (!wnum) return false;
    for (let curr = wtails[wnum]; curr; curr = curr.nseg)
        if (cansee(curr.wx | 0, curr.wy | 0)) return true;
    return false;
}

/* C ref: worm.c:989-998 redraw_worm(worm) — repaint EVERY segment of a worm,
 * head included.  Distinct from see_wsegs() above, which stops at wheads[] and
 * so leaves the head cell alone: C's loop has no such guard.  Called by
 * dog.c:1350 tamedog() and by the polymorph/level-arrival redraw paths. */
export function redraw_worm(worm) {
    let curr = wtails[worm.wormno | 0];
    while (curr) {
        newsym(curr.wx, curr.wy);
        curr = curr.nseg;
    }
}
