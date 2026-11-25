// worm.js — long worm tail segments.
// C ref: worm.c
//
// The segments of the long worms on a level are kept, as in C, in the
// global arrays wheads[], wtails[] and wgrowtime[] (game.wheads etc.),
// indexed by mon->wormno.  C's level.monsters[x][y] holds the worm for
// each placed tail segment; the port keeps those tail cells in
// game.level.wsegs (a Map from a location key to the worm), which
// m_at() consults after the monster list (see makemon.js m_at()).

import { game } from './gstate.js';
import { rn2, rnd, rn1, d } from './rng.js';
import { MHPMAX, NORMAL_SPEED, NON_PM, MCORPSENM } from './const.js';
import { mons, PM_LONG_WORM } from './monsters.js';
import { m_at } from './makemon.js';
import { newsym, pline, You, canspotmon } from './display.js';
import { cansee } from './vision.js';
import { dist2, distmin, s_suffix } from './hacklib.js';
import { mcalcmove } from './mon.js';
import { mattacku } from './mhitu.js';
import { rnd_nextto_goodpos } from './trap.js';
import { mon_nam } from './do_name.js';
import { Sfo, Sfi } from './sfbase.js';
import { update_file, release_data } from './save.js';
import { clone_mon } from './makemon.js';
import { Monnam } from './do_name.js';

/* C ref: global.h MAX_NUM_WORMS */
export const MAX_NUM_WORMS = 32;

/* C ref: worm.c static wheads[], wtails[], wgrowtime[] */
function W() {
    const g = game;
    if (!g.wheads) {
        g.wheads = new Array(MAX_NUM_WORMS).fill(null);
        g.wtails = new Array(MAX_NUM_WORMS).fill(null);
        g.wgrowtime = new Array(MAX_NUM_WORMS).fill(0);
    }
    return g;
}

/* C ref: worm.c newseg() -- a worm segment: { nseg, wx, wy } */
function newseg() {
    return { nseg: null, wx: 0, wy: 0 };
}

/* key of a map location in game.level.wsegs */
function wkey(x, y) { return x * 32 + y; }

// C ref: rm.h place_worm_seg()
/* level.monsters[x][y] = m for a tail segment */
export function place_worm_seg(m, x, y) {
    const L = game.level;
    if (!L.wsegs) L.wsegs = new Map();
    L.wsegs.set(wkey(x, y), m);
}

// C ref: rm.h remove_monster()
/* level.monsters[x][y] = 0; the location holds either a tail segment or
   (for the hidden segment co-located with the head) the monster itself */
export function remove_monster_at(x, y) {
    const L = game.level;
    if (L.wsegs && L.wsegs.delete(wkey(x, y)))
        return;
    const lst = L.monsters || [];
    for (let i = 0; i < lst.length; i++) {
        const m = lst[i];
        if (m.mx === x && m.my === y && !m.dead) {
            lst.splice(i, 1);
            return;
        }
    }
}

// C ref: rm.h level.monsters[x][y] for a tail segment
/* the worm whose tail segment occupies <x,y>, if any (used by m_at()) */
export function wseg_mon_at(x, y) {
    const ws = game.level?.wsegs;
    return ws ? (ws.get(wkey(x, y)) || null) : null;
}

// C ref: worm.c get_wormno()
/*
 *  Find an unused worm tail slot and return the index.  A zero means that
 *  there are no slots available.  This means that the worm head can exist,
 *  it just cannot ever grow a tail.
 */
export function get_wormno() {
    const g = W();
    let new_wormno = 1;

    while (new_wormno < MAX_NUM_WORMS) {
        if (!g.wheads[new_wormno])
            return new_wormno; /* found empty wtails[] slot at new_wormno */
        new_wormno++;
    }
    return 0; /* level infested with worms */
}

// C ref: worm.c initworm()
/*
 *  Use if (mon->wormno = get_wormno()) before calling this function!
 *
 *  Initialize the worm entry.  This will set up the worm grow time, and
 *  create and initialize the dummy segment for wheads[] and wtails[].
 *
 *  If the worm has no tail (ie get_wormno() fails) then this function
 *  need not be called.
 */
export function initworm(worm, wseg_count) {
    const g = W();
    let seg;
    const new_tail = create_worm_tail(wseg_count);
    const wnum = worm.wormno;

    if (new_tail) {
        g.wtails[wnum] = new_tail;
        for (seg = new_tail; seg.nseg; seg = seg.nseg)
            continue;
        g.wheads[wnum] = seg;
    } else {
        g.wtails[wnum] = g.wheads[wnum] = seg = newseg();
        seg.nseg = null;
    }
    seg.wx = worm.mx;
    seg.wy = worm.my;
    g.wgrowtime[wnum] = 0;
}

// C ref: worm.c toss_wsegs()
/*
 *  Get rid of all worm segments on and following the given pointer curr.
 *  The display may or may not need to be updated as we free the segments.
 */
function toss_wsegs(curr, display_update) {
    let nxtseg;

    while (curr) {
        nxtseg = curr.nseg;

        /* remove from level.monsters[][];
           need to check curr->wx for genocided while migrating_mon */
        if (curr.wx) {
            remove_monster_at(curr.wx, curr.wy);

            /* update screen before deallocation */
            if (display_update)
                newsym(curr.wx, curr.wy);
        }

        /* free memory used by the segment: dealloc_seg(curr) */
        curr.nseg = null;
        curr = nxtseg;
    }
}

// C ref: worm.c shrink_worm()
/*
 *  Remove the tail segment of the worm (the starting segment of the list).
 */
function shrink_worm(wnum) {
    const g = W();
    let seg;

    if (g.wtails[wnum] === g.wheads[wnum])
        return; /* no tail */

    seg = g.wtails[wnum];
    g.wtails[wnum] = seg.nseg;
    seg.nseg = null;
    toss_wsegs(seg, true);
}

// C ref: worm.c worm_move()
/*
 *  Check for mon->wormno before calling this function!
 *
 *  Move the worm.  Maybe grow.
 */
export function worm_move(worm) {
    const g = W();
    let seg, new_seg; /* new segment */
    const wnum = worm.wormno; /* worm number */

    /*
     *  Place a segment at the old worm head.  The head has already moved.
     */
    seg = g.wheads[wnum];
    place_worm_seg(worm, seg.wx, seg.wy);
    newsym(seg.wx, seg.wy); /* display the new segment */

    /*
     *  Create a new dummy segment head and place it at the end of the list.
     */
    new_seg = newseg();
    new_seg.wx = worm.mx;
    new_seg.wy = worm.my;
    new_seg.nseg = null;
    seg.nseg = new_seg;      /* attach it to the end of the list */
    g.wheads[wnum] = new_seg; /* move the end pointer */

    if (g.wgrowtime[wnum] <= g.moves) {
        let whplimit, whpcap, prev_mhp, wsegs = count_wsegs(worm);

        /* first set up for the next time to grow */
        if (!g.wgrowtime[wnum]) {
            /* new worm; usually grow a tail segment on its next turn */
            g.wgrowtime[wnum] = g.moves + rnd(5);
        } else {
            const mmove = mcalcmove(worm, false);
            /* prior to 5.0.0,, next-grow increment was 3..17 but since
               it got checked every 4th turn when the speed 3 worm got
               to move, it was effectively 0..5; also, its usage was
               'wgrowtime += incr', so often 'wgrowtime' would be
               exceeded by 'moves' on consecutive turns for the worm,
               resulting in an excessively rapid growth cycle */
            let incr = rn1(10, 2); /* 2..12; after adjusting for long worn
                                    * speed of 3, effective value is 8..48 */

            incr = Math.trunc((incr * NORMAL_SPEED) / Math.max(mmove, 1));
            g.wgrowtime[wnum] = g.moves + incr;
        }

        /* increase HP based on number of segments; if it has shrunk, it
           won't gain new HP until regaining previous peak segment count;
           when wounded (whether from damage or from shrinking), the HP
           which might have been 'new' will heal */
        whplimit = !worm.m_lev ? 4 : (8 * worm.m_lev);
        /* note: wsegs includes the hidden segment co-located with the head */
        if (wsegs > 33)
            whplimit += 2 * (wsegs - 33), wsegs = 33;
        if (wsegs > 22)
            whplimit += 4 * (wsegs - 22), wsegs = 22;
        if (wsegs > 11)
            whplimit += 6 * (wsegs - 11), wsegs = 11;
        whplimit += 8 * wsegs;
        if (whplimit > MHPMAX)
            whplimit = MHPMAX;

        prev_mhp = worm.mhp;
        worm.mhp += d(2, 2); /* 2..4, average 3 */
        whpcap = Math.max(whplimit, worm.mhpmax);
        if (worm.mhp < whpcap) {
            /* can't exceed segment-derived limit unless level increase after
               peak tail growth has already done so; when that isn't the case,
               if segment growth exceeds current max HP then increase it */
            if (worm.mhp > whplimit)
                worm.mhp = Math.max(prev_mhp, whplimit);
            if (worm.mhp > worm.mhpmax)
                worm.mhpmax = worm.mhp;
        } else {
            if (worm.mhp > worm.mhpmax)
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

// C ref: worm.c worm_nomove()
/*
 *  Check for mon->wormno before calling this function!
 *
 *  The worm doesn't move, so it should shrink.
 */
export function worm_nomove(worm) {
    shrink_worm(worm.wormno); /* shrink */

    if (worm.mhp > count_wsegs(worm)) {
        worm.mhp -= d(2, 2); /* 2..4, average 3; note: mhpmax not changed! */
        if (worm.mhp < 1)
            worm.mhp = 1;
    }
}

// C ref: worm.c wormgone()
/*
 *  Kill a worm tail.  Also takes the head off the map.  Caller needs to
 *  keep track of what its coordinates were if planning to put it back.
 *
 *  Should only be called when mon->wormno is non-zero.
 */
export function wormgone(worm) {
    const g = W();
    const wnum = worm.wormno;

    if (!wnum) /* note: continuing with wnum==0 runs to completion */
        console.error('impossible: wormgone: wormno is 0');

    worm.wormno = 0; /* still a long worm but doesn't grow/shrink anymore */
    /*
     *  This will also remove the real monster (ie 'w') from the its
     *  position in level.monsters[][].  (That happens when removing
     *  the hidden tail segment which is co-located with the head.)
     */
    toss_wsegs(g.wtails[wnum], true);

    g.wheads[wnum] = g.wtails[wnum] = null;
    g.wgrowtime[wnum] = 0;

    /* we don't expect to encounter this here but check for it anyway;
       when a long worm gets created by a polymorph zap, it gets flagged
       with MCORPSENM()==PM_LONG_WORM so that the same zap won't trigger
       another polymorph if it hits the new tail */
    if (worm.data === mons[PM_LONG_WORM]
        && MCORPSENM(worm) !== NON_PM) /* has_mcorpsenm(worm) */
        worm.mextra.mcorpsenm = NON_PM; /* no longer polymorph-proof */
}

// C ref: worm.c wormhitu()
/*
 *  Check for mon->wormno before calling this function!
 *
 *  If the hero is near any part of the worm, the worm will try to attack.
 *  Returns 1 if the worm dies (poly'd hero with passive counter-attack)
 *  or 0 if it doesn't.
 */
export async function wormhitu(worm) {
    const g = W();
    const wnum = worm.wormno;
    let seg;

    /*  This does not work right now because mattacku() thinks that the head
     *  is out of range of the player.  We might try to kludge, and bring
     *  the head within range for a tiny moment, but this needs a bit more
     *  looking at before we decide to do this.
     *
     *  Head has already had a chance to attack, so the dummy tail segment
     *  sharing its location should be skipped.
     */
    for (seg = g.wtails[wnum]; seg !== g.wheads[wnum]; seg = seg.nseg)
        if (dist2(seg.wx, seg.wy, g.u.ux, g.u.uy) < 3) /* distu() */
            if (await mattacku(worm))
                return 1; /* your passive ability killed the worm */
    return 0;
}

// C ref: worm.c cutworm()
/*
 *  Check for mon->wormno before calling this function!
 *
 *  When hitting a worm (worm) at position x, y, with a weapon (weap),
 *  there is a chance that the worm will be cut in half, and a chance
 *  that both halves will survive.
 */
export async function cutworm(worm, x, y,
                              cuttier) { /* hit is by wielded blade or axe
                                            or by thrown axe */
    const g = W();
    let curr, new_tail;
    let new_worm;
    const wnum = worm.wormno;
    let cut_chance, new_wnum;

    if (!wnum)
        return; /* bullet-proofing */

    if (x === worm.mx && y === worm.my)
        return; /* hit on head */

    /* cutting goes best with a cuttier weapon */
    cut_chance = rnd(20); /* Normally     1-16 does not cut, 17-20 does, */
    if (cuttier)
        cut_chance += 10; /* with a blade 1- 6 does not cut,  7-20 does. */

    if (cut_chance < 17)
        return; /* not good enough */

    /* Find the segment that was attacked. */
    curr = g.wtails[wnum];

    while ((curr.wx !== x) || (curr.wy !== y)) {
        curr = curr.nseg;
        if (!curr) {
            console.error(`impossible: cutworm: no segment at (${x},${y})`);
            return;
        }
    }

    /* If this is the tail segment, then the worm just loses it. */
    if (curr === g.wtails[wnum]) {
        shrink_worm(wnum);
        return;
    }

    /*
     *  Split the worm.  The tail for the new worm is the old worm's tail.
     *  The tail for the old worm is the segment that follows "curr",
     *  and "curr" becomes the dummy segment under the new head.
     */
    new_tail = g.wtails[wnum];
    g.wtails[wnum] = curr.nseg;
    curr.nseg = null; /* split the worm */

    /*
     *  At this point, the old worm is correct.  Any new worm will have
     *  its head at "curr" and its tail at "new_tail".  The old worm
     *  must be at least level 3 in order to produce a new worm.
     */
    new_worm = null;
    new_wnum = (worm.m_lev >= 3 && !rn2(3)) ? get_wormno() : 0;
    if (new_wnum) {
        remove_monster_at(x, y); /* clone_mon puts new head here */
        /* clone_mon() will fail if enough long worms have been
           created to have them be marked as extinct or if the hit
           that cut the current one has dropped it down to 1 HP */
        new_worm = await clone_mon(worm, x, y);
    }

    /* Sometimes the tail end dies. */
    if (!new_worm) {
        place_worm_seg(worm, x, y); /* place the "head" segment back */
        if (g.context.mon_moving) {
            if (canspotmon(worm))
                await pline(`Part of ${s_suffix(mon_nam(worm))} tail has been cut off.`);
        } else
            await You(`cut part of the tail off of ${mon_nam(worm)}.`);
        toss_wsegs(new_tail, true);
        if (worm.mhp > 1)
            worm.mhp = Math.trunc(worm.mhp / 2);
        return;
    }

    new_worm.wormno = new_wnum; /* affix new worm number */
    new_worm.mcloned = 0;       /* treat second worm as a normal monster */

    /* Devalue the monster level of both halves of the worm.
       Note: m_lev is always at least 3 in order to get this far. */
    worm.m_lev = Math.max(worm.m_lev - 2, 3);
    new_worm.m_lev = worm.m_lev;

    /* Calculate the lower-level mhp; use <N>d8 for long worms.
       Can't use newmonhp() here because it would reset m_lev. */
    new_worm.mhpmax = new_worm.mhp = d(new_worm.m_lev, 8);
    worm.mhpmax = d(worm.m_lev, 8); /* new maxHP for old worm */
    if (worm.mhpmax < worm.mhp)
        worm.mhp = worm.mhpmax;

    g.wtails[new_wnum] = new_tail; /* We've got all the info right now */
    g.wheads[new_wnum] = curr;     /* so we can do this faster than    */
    g.wgrowtime[new_wnum] = 0;     /* trying to call initworm().       */

    /* Place the new monster at all the segment locations. */
    place_wsegs(new_worm, worm);

    if (g.context.mon_moving)
        await pline(`${Monnam(worm)} is cut in half.`);
    else
        await You(`cut ${mon_nam(worm)} in half.`);
}

// C ref: worm.c see_wsegs()
/*
 *  Refresh all of the segments of the given worm.  This is only called
 *  from see_monster() in display.c or when a monster goes minvis.  It
 *  is located here for modularity.
 */
export function see_wsegs(worm) {
    const g = W();
    let curr = g.wtails[worm.wormno];

    while (curr !== g.wheads[worm.wormno]) {
        newsym(curr.wx, curr.wy);
        curr = curr.nseg;
    }
}

// C ref: worm.c save_worm()
/*
 *  Save the worm information for later use.  The count is the number
 *  of segments, including the dummy.  Called from save.c.
 */
export function save_worm(nhfp) {
    const g = W();
    let i;
    let count;
    let curr, temp;

    if (update_file(nhfp)) {
        for (i = 1; i < MAX_NUM_WORMS; i++) {
            for (count = 0, curr = g.wtails[i]; curr; curr = curr.nseg)
                count++;
            /* Save number of segments */
            Sfo(nhfp, count, "worm-segment_count");
            /* Save segment locations of the monster. */
            if (count) {
                for (curr = g.wtails[i]; curr; curr = curr.nseg) {
                    Sfo(nhfp, curr.wx, "worm-wx");
                    Sfo(nhfp, curr.wy, "worm-wy");
                }
            }
        }
        for (i = 0; i < MAX_NUM_WORMS; ++i)
            Sfo(nhfp, g.wgrowtime[i], "worm-wgrowtime");
    }

    if (release_data(nhfp)) {
        /* Free the segments only.  savemonchn() will take care of the
         * monsters. */
        for (i = 1; i < MAX_NUM_WORMS; i++) {
            if (!(curr = g.wtails[i]))
                continue;

            while (curr) {
                temp = curr.nseg;
                curr.nseg = null; /* free the segment */
                curr = temp;
            }
            g.wheads[i] = g.wtails[i] = null;
            g.wgrowtime[i] = 0;
        }
    }
}

// C ref: worm.c rest_worm()
/*
 *  Restore the worm information from the save file.  Called from restore.c
 */
export function rest_worm(nhfp) {
    const g = W();
    let i, j;
    let count = 0;
    let curr, temp;

    for (i = 1; i < MAX_NUM_WORMS; i++) {
        count = Sfi(nhfp, "worm-segment_count");

        /* Get the segments. */
        for (curr = null, j = 0; j < count; j++) {
            temp = newseg();
            temp.nseg = null;
            temp.wx = Sfi(nhfp, "worm-wx");
            temp.wy = Sfi(nhfp, "worm-wy");
            if (curr)
                curr.nseg = temp;
            else
                g.wtails[i] = temp;
            curr = temp;
        }
        g.wheads[i] = curr;
    }
    for (i = 0; i < MAX_NUM_WORMS; ++i) {
        g.wgrowtime[i] = Sfi(nhfp, "worm-wgrowtime");
    }
}

// C ref: worm.c place_wsegs()
/*
 *  Place the segments of the given worm.  Called from restore.c
 *  and from replmon() in mon.c.
 *  If oldworm is not NULL, assumes the oldworm segments are on map
 *  in the same location as worm segments
 */
export function place_wsegs(worm, oldworm) {
    const g = W();
    let curr = g.wtails[worm.wormno];

    while (curr !== g.wheads[worm.wormno]) {
        const x = curr.wx, y = curr.wy;
        const mtmp = m_at(x, y);

        if (oldworm && mtmp === oldworm)
            remove_monster_at(x, y);
        else if (mtmp)
            console.error(`impossible: placing worm seg <${x},${y}> over another mon`);
        else if (oldworm)
            console.error(`impossible: replacing worm seg <${x},${y}> on empty spot`);

        place_worm_seg(worm, x, y);
        curr = curr.nseg;
    }
    /* head segment is co-located with worm itself so not placed on the map */
    curr.wx = worm.mx, curr.wy = worm.my;
}

// C ref: worm.c remove_worm()
/*
 *  This function is equivalent to the remove_monster #define in
 *  rm.h, only it will take the worm *and* tail out of the levels array.
 *  It does not get rid of (dealloc) the worm tail structures, and it does
 *  not remove the mon from the fmon chain.
 */
export function remove_worm(worm) {
    const g = W();
    let curr = g.wtails[worm.wormno];

    while (curr) {
        if (curr.wx) {
            remove_monster_at(curr.wx, curr.wy);
            newsym(curr.wx, curr.wy);
            curr.wx = 0;
        }
        curr = curr.nseg;
    }
}

// C ref: worm.c place_worm_tail_randomly()
/*
 *  Place a worm tail somewhere on a level behind the head.
 *  This routine essentially reverses the order of the wsegs from head
 *  to tail while placing them.
 *  x, and y are most likely the worm->mx, and worm->my, but don't *need* to
 *  be, if somehow the head is disjoint from the tail.
 */
export function place_worm_tail_randomly(worm, x, y) {
    const g = W();
    const wnum = worm.wormno;
    let curr = g.wtails[wnum];
    let new_tail;
    let ox = x, oy = y;

    if (wnum && (!g.wtails[wnum] || !g.wheads[wnum])) {
        console.error('impossible: place_worm_tail_randomly: wormno is set without a tail!');
        return;
    }
    if (g.wtails[wnum] === g.wheads[wnum]) {
        /* single segment, co-located with worm;
           should either have same coordinates or have seg->wx==0
           to indicate that it is not currently on the map */
        if (curr.wx && (curr.wx !== worm.mx || curr.wy !== worm.my)) {
            console.error(`impossible: place_worm_tail_randomly: tail segment at <${curr.wx},${curr.wy}>, worm at <${worm.mx},${worm.my}>`);
            if (m_at(curr.wx, curr.wy) === worm)
                remove_monster_at(curr.wx, curr.wy);
        }
        curr.wx = worm.mx, curr.wy = worm.my;
        return;
    }
    /* remove head segment from map in case we end up calling toss_wsegs();
       if it doesn't get tossed, it will become the final tail segment and
       get new coordinates */
    g.wheads[wnum].wx = g.wheads[wnum].wy = 0;

    g.wheads[wnum] = new_tail = curr;
    curr = curr.nseg;
    new_tail.nseg = null;
    new_tail.wx = x;
    new_tail.wy = y;

    while (curr) {
        const nxy = { x: ox, y: oy };

        if (rnd_nextto_goodpos(nxy, worm)) {
            const nx = nxy.x, ny = nxy.y;
            place_worm_seg(worm, nx, ny);
            curr.wx = (ox = nx);
            curr.wy = (oy = ny);
            g.wtails[wnum] = curr;
            curr = curr.nseg;
            g.wtails[wnum].nseg = new_tail;
            new_tail = g.wtails[wnum];
            newsym(nx, ny);
        } else {
            /* Oops.  Truncate because there is no place for rest of it. */
            toss_wsegs(curr, false);
            curr = null;
        }
    }
}

// C ref: worm.c count_wsegs()
/*  returns the number of segments that a worm has. */
export function count_wsegs(mtmp) {
    const g = W();
    let i = 0;
    let curr;

    if (mtmp.wormno) {
        for (curr = g.wtails[mtmp.wormno].nseg; curr; curr = curr.nseg)
            i++;
    }
    return i;
}

// C ref: worm.c create_worm_tail()
/*  will create a worm tail chain of (num_segs + 1) and return pointer to it. */
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

// C ref: worm.c worm_known()
/*  Is any segment of this worm in viewing range?  Note: caller must check
 *  invisibility and telepathy (which should only show the head anyway).
 *  Mostly used in the canseemon() macro.
 */
export function worm_known(worm) {
    const g = W();
    let curr = g.wtails[worm.wormno];

    while (curr) {
        if (cansee(curr.wx, curr.wy))
            return true;
        curr = curr.nseg;
    }
    return false;
}

// C ref: worm.c worm_cross()
/* would moving from <x1,y1> to <x2,y2> involve passing between two
   consecutive segments of the same worm? */
export function worm_cross(x1, y1, x2, y2) {
    const g = W();
    let worm;
    let curr, wnxt;

    /*
     * With digits representing relative sequence number of the segments,
     * returns true when testing between @ and ? (passes through worm's
     * body), false between @ and ! (stays on same side of worm).
     *  .w1?..
     *  ..@2..
     *  .65!3.
     *  ...4..
     */

    if (distmin(x1, y1, x2, y2) !== 1) {
        console.error('impossible: worm_cross checking for non-adjacent location?');
        return false;
    }
    /* attempting to pass between worm segs is only relevant for diagonal */
    if (x1 === x2 || y1 === y2)
        return false;

    /* is the same monster at <x1,y2> and at <x2,y1>? */
    worm = m_at(x1, y2);
    if (!worm || m_at(x2, y1) !== worm)
        return false;

    /* same monster is at both adjacent spots, so must be a worm; we need
       to figure out if the two spots are occupied by consecutive segments */
    for (curr = g.wtails[worm.wormno]; curr; curr = wnxt) {
        wnxt = curr.nseg;
        if (!wnxt)
            break; /* no next segment; can't continue */

        /* we don't know which of <x1,y2> or <x2,y1> we'll hit first, but
           whichever it is, they're consecutive iff next seg is the other */
        if (curr.wx === x1 && curr.wy === y2)
            return (wnxt.wx === x2 && wnxt.wy === y1);
        if (curr.wx === x2 && curr.wy === y1)
            return (wnxt.wx === x1 && wnxt.wy === y2);
    }
    /* should never reach here... */
    return false;
}

// C ref: worm.c wseg_at()
/* construct an index number for a worm tail segment */
export function wseg_at(worm, x, y) {
    const g = W();
    let res = 0;

    if (worm && worm.wormno && m_at(x, y) === worm) {
        let curr;
        let i, n;
        const wx = x, wy = y;

        for (i = 0, curr = g.wtails[worm.wormno]; curr; curr = curr.nseg) {
            if (curr.wx === wx && curr.wy === wy)
                break;
            ++i;
        }
        for (n = i; curr; curr = curr.nseg)
            ++n;
        res = n - i;
    }
    return res;
}

// C ref: worm.c flip_worm_segs_vertical()
export function flip_worm_segs_vertical(worm, miny, maxy) {
    const g = W();
    let curr = g.wtails[worm.wormno];

    while (curr) {
        curr.wy = (maxy - curr.wy + miny);
        curr = curr.nseg;
    }
}

// C ref: worm.c flip_worm_segs_horizontal()
export function flip_worm_segs_horizontal(worm, minx, maxx) {
    const g = W();
    let curr = g.wtails[worm.wormno];

    while (curr) {
        curr.wx = (maxx - curr.wx + minx);
        curr = curr.nseg;
    }
}

// C ref: sp_lev.c flip_level() -- its swap of level.monsters[][] within
// the flipped area, for the cells that hold worm tail segments
export function flip_wseg_cells(flp, minx, miny, maxx, maxy) {
    const ws = game.level.wsegs;
    if (!ws || !ws.size)
        return;
    const moved = [];
    for (const [k, worm] of ws) {
        const x = Math.trunc(k / 32), y = k % 32;
        if (x < minx || x > maxx || y < miny || y > maxy)
            continue;
        moved.push([k, (flp & 2) ? (maxx - x) + minx : x,
                    (flp & 1) ? (maxy - y) + miny : y, worm]);
    }
    for (const [k] of moved)
        ws.delete(k);
    for (const [, nx, ny, worm] of moved)
        ws.set(wkey(nx, ny), worm);
}

// C ref: worm.c redraw_worm()
export function redraw_worm(worm) {
    const g = W();
    let curr = g.wtails[worm.wormno];

    while (curr) {
        newsym(curr.wx, curr.wy);
        curr = curr.nseg;
    }
}
