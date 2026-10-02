// @ts-nocheck
// nhlib.lua — Lua library loaded into themes (nethack-c/dat/nhlib.lua).
// RNG paths here use the game's Lua/core PRNG (rng.c lua context parity: core ISAAC).
// @ts-nocheck — sibling import from hand-maintained js/rng.js.
import { rn2, rnz } from './rng.js';
import { DRY, NO_LOC_WARN } from './sp_lev_loc.js';
/**
 * Callback registry for mksobj from mklev.js.
 * Set by registerNhlibMksobj() before themeroom fill runs.
 * C ref: sp_lev.c create_object() → mksobj_at() (line 2213).
 */
let _mksobj_fn = null;
/**
 * Called by mklev.js to wire the real mksobj into nhlib fill functions
 * that call des.object() in C (which goes through mksobj_at → mksobj).
 */
export function registerNhlibMksobj(mksobj) {
    _mksobj_fn = mksobj;
}
/**
 * Callback registry for makemon from mklev.js.
 * C ref: sp_lev.c create_monster():1989 — makemon(pm, x, y, m->mm_flags).
 */
let _makemon_fn = null;
/**
 * Called by mklev.js to wire the real makemon into nhlib fill functions.
 */
export function registerNhlibMakemon(makemon) {
    _makemon_fn = makemon;
}
/**
 * Callback registry for mkclassAligned from mklev.js (makemon.js).
 * C ref: sp_lev.c create_monster():1956 — pm = mkclass(class, G_NOGEN).
 */
let _mkclass_fn = null;
/**
 * Called by mklev.js to wire mkclassAligned into nhlib fill functions.
 */
export function registerNhlibMkclass(mkclassAligned) {
    _mkclass_fn = mkclassAligned;
}
/**
 * Callback registry for somexy from mklev.js.
 * C ref: mkroom.c somexy() — picks a random location within a room.
 *   For irregular rooms, retries up to 100× until a non-edge cell is found.
 *   For regular rooms without subrooms, always succeeds in 1 attempt.
 */
let _somexy_fn = null;
/**
 * Called by mklev.js to wire somexy into nhlib fill functions.
 * C ref: mkroom.c somexy() and sp_lev.c get_location():1226-1239.
 */
export function registerNhlibSomexy(somexy) {
    _somexy_fn = somexy;
}
/**
 * nhlib.lua:9-10 — math.random(lo, hi) two-arg shim:
 * `return nh.random(arg[1], arg[2] + 1 - arg[1]);`
 *
 * C nhlua.c nhl_random(argc==2): `base + (rn2)(range)`
 * with `range == arg[2]` in Lua-bindings terms (extent, not inclusive hi).
 *
 * nh.random(0, 100) => 0 + rn2(100) => uniform 0..99 (matches Lua inclusive lo..hi).
 */
export function nhlib_math_random_two_arg(lo, hi) {
    const extent = hi + 1 - lo;
    return lo + rn2(extent);
}
/** nhlib.lua:43-45 — percent(threshold): math.random(0,99) < threshold */
export function nhlib_percent(threshold) {
    return nhlib_math_random_two_arg(0, 99) < threshold;
}
/**
 * themerms.lua filler_region(): first rolls percent(30) before des.region(...).
 * C sp_lev.c lspo_map — when overlay succeeds with has_contents, Lua runs filler_region.
 * Returns true when the region gets themed contents (themeroom_fill will be called).
 */
export function nhlib_filler_region_rng_consume() {
    return nhlib_percent(30);
}
export async function nhlib_fill_storeroom_rng(floorCellCount, roomWidth, roomHeight, hooks) {
    const h = hooks || {};
    const lx = h.lx | 0, ly = h.ly | 0;
    // C ref: themerms.lua storeroom — selection.room():percentage(30)
    let selectedCount = 0;
    for (let i = 0; i < floorCellCount; i++) {
        if (rn2(100) < 30)
            selectedCount++;
    }
    // C ref: themerms.lua storeroom — locs:iterate(func)
    for (let i = 0; i < selectedCount; i++) {
        // C ref: themerms.lua line 254 — percent(25) → rn2(100) < 25
        if (rn2(100) < 25) {
            // 25% → des.object("chest").  C create_object (sp_lev.c:2193-2213)
            // takes the location FIRST, then makes the object:
            //   get_location_coord(&x, &y, DRY, croom, o->coord) → somexy
            //   mksobj_at(o->id, x, y, TRUE, !named)   — named is FALSE here,
            //                                            so artif is TRUE.
            // C create_object() resolves the random coordinate through
            // get_location_coord(DRY, croom), retrying somexy() when the
            // first candidate is not a valid dry square.  The old shortcut
            // always accepted the first pair and skipped those retry draws.
            const c = { x: -1, y: -1 };
            if (h.getLocationCoord)
                h.getLocationCoord(c, DRY | NO_LOC_WARN);
            else {
                c.x = lx + rn2(roomWidth); // somex(mkroom.c:668)
                c.y = ly + rn2(roomHeight); // somey(mkroom.c:674)
            }
            if (h.mksobjAt && c.x >= 0 && c.y >= 0)
                await h.mksobjAt(h.chestOtyp, c.x, c.y, true, true);
        }
        else {
            // 75% → des.monster({ class="m", appear_as="obj:chest" }).
            // C create_monster (sp_lev.c:1925-1989), in order:
            //   1. amask = sp_amask_to_amask(m->sp_amask)   — sp_lev.c:1943, and
            //      lspo_monster leaves sp_amask at AM_SPLEV_RANDOM when the spec
            //      names no align, so this is induced_align(80): one rn2(3) on an
            //      ordinary level.  UNCONDITIONAL — it runs before the class pick.
            //   2. pm = mkclass(class, G_NOGEN)             — sp_lev.c:1956
            //   3. get_location_coord(...) → somexy         — sp_lev.c:1966-1971
            //   4. makemon(pm, x, y, m->mm_flags)           — sp_lev.c:1989
            // appear_as is applied AFTER makemon (sp_lev.c:1999-2020), so
            // makemon's own S_MIMIC set_mimic_sym block still runs and draws.
            if (h.inducedAlign)
                h.inducedAlign(80);
            else
                rn2(3); // induced_align(dungeon.c:2012) — the non-special-level arm
            const pm = h.mkclassMimic ? h.mkclassMimic() : null;
            /* C sp_lev.c:1966-1974 — each hook call is the complete
             * get_location_coord(random) operation, including that helper's
             * own quiet/fallback pair.  create_monster then retries with DRY. */
            const c = { x: -1, y: -1 };
            if (pm != null) {
                h.getLocationCoord(c, DRY | NO_LOC_WARN);
            }
            if (pm == null || (c.x === -1 && c.y === -1)) {
                h.getLocationCoord(c, DRY);
            }
            if (c.x === -1 && c.y === -1)
                continue;
            let mx = c.x | 0, my = c.y | 0;
            // C sp_lev.c:1976-1978 create_monster, between get_location_coord
            // and makemon:
            //     /* try to find a close place if someone else is already there */
            //     if (MON_AT(x, y) && enexto(&cc, x, y, pm))
            //         x = cc.x, y = cc.y;
            // This step was MISSING here, and it is not cosmetic: C's makemon
            // refuses an occupied square outright (makemon.c:1193-1199, no
            // MM_ADJACENTOK from create_monster) and returns 0 WITHOUT drawing,
            // so a storeroom that rolls the same square twice diverges by the
            // whole enexto ring shuffle (45 leaves: rings of 8/16/24 shuffled
            // as 7+15+23) plus the entire second mimic's creation block.
            // collect_coords(teleport.c:700) from leaf 3985 and went on to build
            // the mimic; we skipped straight to the next percent(25) and every
            // later leaf on that level was noise.
            if (h.monAt && h.monAt(mx, my)) {
                const cc = h.enexto ? h.enexto(mx, my, pm) : null;
                if (cc) {
                    mx = cc.x;
                    my = cc.y;
                }
            }
            // C sp_lev.c:1980-1981 — `if (croom && !inside_room(croom, x, y))
            // return;`.  enexto can push the monster outside the room (its
            // rings reach 3 squares out, and its fallback pass covers the whole
            // map), and C then abandons this des.monster() entirely rather than
            // placing it — no makemon, no RNG.  croom is always non-null for a
            // themeroom fill.
            if (h.insideRoom && !h.insideRoom(mx, my))
                continue;
            if (h.makemon)
                await h.makemon(pm, mx, my, 0);
        }
    }
}
/**
 * themerms.lua "Buried treasure" fill contents RNG consumer.
 * C ref: themerms.lua themeroom_fills["Buried treasure"].contents (lines 135-148).
 *
 * Lua sequence:
 *   des.object({ id="chest", buried=true, contents=... })
 *     -- get_location_coord -> somexy -> somex + somey (chest placement)
 *
 * The contents callback (d(3,4) random objects) is not yet ported; divergence
 * moves past somex(mkroom.c:669) to the first mkobj call inside the callback.
 */
export function nhlib_fill_buried_treasure_rng(roomWidth, roomHeight) {
    rn2(roomWidth); // somex(croom) — chest placement get_location_coord -> somexy
    rn2(roomHeight); // somey(croom)
}
/**
 * themerms.lua "Ice room" fill contents RNG consumer.
 * C ref: themerms.lua themeroom_fills["Ice room"].contents (lines 48-58).
 *
 * Lua sequence:
 *   if (percent(25)) then                         -- rn2(100)
 *     ice:iterate(function(x,y)                  -- one per SET cell of
 *                                                -- selection.room(), which is
 *                                                -- the roomno-tagged !edge cell
 *                                                -- count, NOT w*h (they differ
 *                                                -- on a map-first theme room)
 *       nh.rn2(1000)                              -- melt-ice timer offset
 *     end)
 *   end
 */
export function nhlib_fill_ice_room_rng(floorCellCount, melter, mintime) {
    if (rn2(100) < 25) {
        for (let i = 0; i < (floorCellCount | 0); i++) {
            const when = (mintime | 0) + rn2(1000);
            if (melter) melter(i, when); /* nh.start_timer_at(x,y,"melt-ice",when) */
        }
    }
}
/* mons[] row indices, taken from the extracted 5.0 name table
 * (js/makemon_pmnames.json) rather than from js/pm.generated.js, whose PM_*
 * names carry 3.7 spellings and whose "PM_" prefix hides a roles[] index for
 * about half its entries.  Verified against that table: row 106 is
 * "fog cloud", row 67 is "wood nymph". */
const PM_FOG_CLOUD = 106;
const PM_WOOD_NYMPH = 67;
/* C include/monflag.h:214 `enum mgender { MALE, FEMALE, NEUTRAL, ... }`. */
const FEMALE = 1;
export async function nhlib_fill_cloud_room_rng(numPoints, roomWidth, roomHeight, hooks) {
    const h = hooks || {};
    const croom = h.croom || null;
    const n = Math.trunc(numPoints / 4);
    for (let i = 0; i < n; i++) {
        /* 1. find_montype("fog cloud") gender fallback — sp_lev.c:3156. */
        const mgend = rn2(2);
        /* 2. create_monster amask = sp_amask_to_amask(AM_SPLEV_RANDOM). */
        if (h.inducedAlign)
            h.inducedAlign(80);
        else
            rn2(3);
        /* 3. get_location_coord(random) → somexy → somex + somey. */
        const c = { x: 0, y: 0 };
        if (croom && h.somexy) {
            h.somexy(croom, c);
        } else {
            c.x = rn2(roomWidth);
            c.y = rn2(roomHeight);
        }
        if (h.monAt && h.monAt(c.x, c.y)) {
            const cc = h.enexto ? h.enexto(c.x, c.y, PM_FOG_CLOUD) : null;
            if (cc) {
                c.x = cc.x;
                c.y = cc.y;
            }
        }
        /* 3b. C sp_lev.c:1980-1981 — `if (croom && !inside_room(croom, x, y))
         * return;`.  enexto can push the monster out of the room, and C then
         * abandons this des.monster() with no makemon and no RNG. */
        if (h.insideRoom && !h.insideRoom(c.x, c.y))
            continue;
        /* 4-5. makemon then the spec flags. */
        if (h.makemon) {
            await h.makemon(PM_FOG_CLOUD, c.x, c.y, 0);
            if (h.setSpecFlags)
                h.setSpecFlags(mgend);
        }
    }
}
/* themerms.lua "Boulder room" (lines 72-86) used to have an RNG-only stand-in
 * here — nhlib_fill_boulder_room_rng.  It drew the percentage(30) roll and one
 * percent(50) per selected cell and then stopped, creating neither the
 * des.object("boulder") nor the des.trap("rolling boulder") each cell asks for.
 * It is now a real fill in js/mklev.js (themeroom_fill_boulder_room), which is
 * where mktrap and mkroll_launch live; nhlib.js may not import mklev.js. */
/**
 * themerms.lua "Garden" fill contents RNG consumer.
 * C ref: themerms.lua themeroom_fills["Garden"].contents (lines 116-129). Lit rooms only.
 *
 * Lua sequence:
 *   local npts = (selection.room():numpoints() / 6);
 *   for i = 1, npts do                              -- Math.trunc(numpoints/6) iterations
 *     des.monster({ id = "wood nymph", asleep = true });
 *     if (percent(30)) then des.feature("fountain"); end
 *   end
 *
 * Per iteration, the table form of lspo_monster (see nhlib_fill_cloud_room_rng's
 * header for the full order) gives:
 *
 *   1. get_table_montype -> find_montype("wood nymph")   sp_lev.c:3148-3157.
 *      PM_WOOD_NYMPH IS M2_FEMALE, so C takes the `is_male || is_female` arm
 *      and assigns mgend = FEMALE WITHOUT drawing — there is NO rn2(2) here.
 *      (That is the only difference from the fog cloud above, and it is why a
 *      blanket "des.monster draws rn2(2)" rule would be wrong.)
 *   2. create_monster: sp_amask_to_amask(AM_SPLEV_RANDOM) = induced_align(80),
 *      dungeon.c:2012's rn2(3).  This draw was MISSING from the old stand-in.
 *   3. get_location_coord(random) -> somexy -> somex + somey
 *   4. makemon(PM_WOOD_NYMPH, x, y, NO_MM_FLAGS)
 *   5. mtmp->female = m->female (FEMALE) and, asleep=true being > BOOL_RANDOM,
 *      mtmp->msleeping = 1 (sp_lev.c:2124, 2132-2133).
 *
 * Then `percent(30)` (rn2(100)) and, when it passes, `des.feature("fountain")`
 * — lspo_feature's own get_location_coord(random) -> somexy, one more
 * somex/somey pair.  The terrain write itself is RNG-free.
 *
 * `hooks` is the same shape nhlib_fill_cloud_room_rng takes, plus:
 *   hooks.feature   (x, y) => void — C create_feature(FOUNTAIN) terrain write
 */
export async function nhlib_fill_garden_rng(numPoints, roomWidth, roomHeight, hooks) {
    const h = hooks || {};
    const croom = h.croom || null;
    const n = Math.trunc(numPoints / 6);
    const somexyInto = (c) => {
        if (croom && h.somexy) {
            h.somexy(croom, c);
        } else {
            c.x = rn2(roomWidth);
            c.y = rn2(roomHeight);
        }
    };
    for (let i = 0; i < n; i++) {
        /* 1. find_montype("wood nymph") — is_female arm, NO draw. */
        /* 2. create_monster amask = sp_amask_to_amask(AM_SPLEV_RANDOM). */
        if (h.inducedAlign)
            h.inducedAlign(80);
        else
            rn2(3);
        /* 3. get_location_coord(random) → somexy → somex + somey. */
        const c = { x: 0, y: 0 };
        somexyInto(c);
        /* 3a-3b. C sp_lev.c:1976-1981 — the MON_AT/enexto relocation and the
         * inside_room abandon; see nhlib_fill_cloud_room_rng for why these are
         * load-bearing rather than cosmetic. */
        let placed = true;
        if (h.monAt && h.monAt(c.x, c.y)) {
            const cc = h.enexto ? h.enexto(c.x, c.y, PM_WOOD_NYMPH) : null;
            if (cc) {
                c.x = cc.x;
                c.y = cc.y;
            }
        }
        if (h.insideRoom && !h.insideRoom(c.x, c.y))
            placed = false;
        /* 4-5. makemon then the spec flags (female = FEMALE, asleep). */
        if (placed && h.makemon) {
            await h.makemon(PM_WOOD_NYMPH, c.x, c.y, 0);
            if (h.setSpecFlags)
                h.setSpecFlags(FEMALE);
        }
        /* C ref: themerms.lua garden line 124 — if (percent(30)) */
        if (rn2(100) < 30) {
            /* des.feature("fountain") → get_location_coord → somexy */
            const fc = { x: 0, y: 0 };
            somexyInto(fc);
            if (h.feature)
                h.feature(fc.x, fc.y);
        }
    }
}
/** CORPSE otyp constant — mirrors C objects.h CORPSE index 265. */
const _CORPSE = 265;
/**
 * themerms.lua "Buried zombies" fill contents RNG consumer.
 * C ref: themerms.lua themeroom_fills["Buried zombies"].contents (lines 150-169)
 *        sp_lev.c create_object() (lines 2202-2264).
 *
 * Lua sequence (per iteration, Math.trunc(w*h/2) total):
 *   shuffle(zombifiable)                 -- rn2(zombSize)..rn2(2)
 *   des.object({id="corpse", buried=T}) -- somexy(rn2(w),rn2(h)) +
 *                                           mksobj_at(CORPSE,TRUE):
 *                                             next_ident()         rnd(2)
 *                                             mksobj_init CORPSE   rndmonnum loop
 *                                             spe gender           rn2(2) if needed
 *                                             set_corpsenm→start_corpse_timeout:
 *                                               rnz(rot_adj=25)  [only if not lizard/lichen]
 *                                         create_object set_corpsenm(specific montype):
 *                                           stop_timers (no RNG)
 *                                           start_corpse_timeout: rnz(25)
 *                                         bury_an_obj obj_resists: rn2(100)
 *   o:start_timer("zombify-mon",...)     -- math.random(990,1010) = rn2(21)
 *
 * C ref: mkobj.c mksobj() line 1188 next_ident, mksobj_init CORPSE rndmonnum loop
 *        mkobj.c start_corpse_timeout() line 1414 rnz(rot_adjust)
 *        sp_lev.c create_object():2259-2263 second set_corpsenm for specific montype
 *        mkobj.c set_corpsenm():1329 obj_stop_timers then start_corpse_timeout
 */
export function nhlib_fill_buried_zombies_rng(croom, difficulty) {
    /* C ref: themerms.lua line 162 — for i = 1, (rm.width * rm.height) / 2 do. */
    const w = (croom.hx - croom.lx + 1) | 0;
    const h = (croom.hy - croom.ly + 1) | 0;
    const zombSize = difficulty > 6 ? 8 : difficulty >= 4 ? 6 : 4;
    const n = Math.trunc(w * h / 2);
    for (let i = 0; i < n; i++) {
        for (let j = zombSize; j >= 2; j--)
            rn2(j); // shuffle(zombifiable)
        if (_somexy_fn)
            _somexy_fn(croom, { x: 0, y: 0 });
        else {
            rn2(w);
            rn2(h);
        } // fallback: 1 attempt
        /* C ref: sp_lev.c:2213 mksobj_at(CORPSE, x, y, TRUE, FALSE)
         * → mksobj(CORPSE, TRUE, FALSE): next_ident + mksobj_init + set_corpsenm.
         * Consumes: rnd(2) next_ident, rndmonnum loop, optional rn2(2) gender,
         * and rnz(25) start_corpse_timeout only when rndmonnum picks non-lizard/lichen. */
        if (_mksobj_fn)
            _mksobj_fn(_CORPSE, true, false);
        /* C ref: sp_lev.c:2259-2263 create_object second set_corpsenm(specific montype).
         * After mksobj_at, create_object calls set_corpsenm(otmp, o->corpsenm) with the
         * Lua-specified montype (always a zombifiable non-lizard/lichen monster).
         * set_corpsenm → obj_stop_timers (no RNG) → start_corpse_timeout → rnz(25).
         * rot_adjust = gi.in_mklev ? 25 : 10 → always 25 during level gen.
         * C ref: mkobj.c start_corpse_timeout():1414 rnz(rot_adjust). */
        rnz(25); // second set_corpsenm start_corpse_timeout for specific zombifiable montype
        /* C ref: bury_an_obj obj_resists(zap.c:1469) rn2(100) during burial. */
        rn2(100);
        rn2(21); // math.random(990,1010) = rn2(21) for o:start_timer("zombify-mon")
    }
}
/**
 * themerms.lua "Massacre" fill contents RNG consumer.
 * C ref: themerms.lua themeroom_fills["Massacre"].contents (lines 172-189).
 *
 * Lua sequence:
 *   math.random(#mon)                 -- rn2(27) initial idx (27-element table)
 *   for i = 1, d(5,5) do             -- 5x rn2(5)+1 iterations
 *     percent(10)                     -- rn2(100); if true: rn2(27) new idx
 *     des.object("corpse")            -- somexy -> somex + somey
 *   end
 */
export function nhlib_fill_massacre_rng(roomWidth, roomHeight) {
    rn2(27); // math.random(#mon) — 27 monster types in mon table
    let n = 0;
    for (let i = 0; i < 5; i++)
        n += rn2(5) + 1; // d(5,5)
    for (let i = 0; i < n; i++) {
        if (rn2(100) < 10)
            rn2(27); // percent(10) + possibly new idx
        rn2(roomWidth);
        rn2(roomHeight); // corpse somexy
    }
}
/**
 * themerms.lua "Statuary" fill contents RNG consumer.
 * C ref: themerms.lua themeroom_fills["Statuary"].contents (lines 191-201).
 *
 * Lua sequence:
 *   for i = 1, d(5,5) do des.object("statue") end   -- somexy per statue
 *   for i = 1, d(3) do des.trap("statue") end       -- somexy per trap
 */
export function nhlib_fill_statuary_rng(roomWidth, roomHeight) {
    let n = 0;
    for (let i = 0; i < 5; i++)
        n += rn2(5) + 1; // d(5,5) statue count
    for (let i = 0; i < n; i++) {
        rn2(roomWidth);
        rn2(roomHeight);
    }
    const m = rn2(3) + 1; // d(3) statue trap count
    for (let i = 0; i < m; i++) {
        rn2(roomWidth);
        rn2(roomHeight);
    }
}
/**
 * themerms.lua "Light source" fill contents RNG consumer.
 * C ref: themerms.lua themeroom_fills["Light source"].contents (lines 204-209). Unlit only.
 *
 * Lua sequence:
 *   des.object("oil lamp")  -- somexy -> somex + somey
 */
export function nhlib_fill_light_source_rng(roomWidth, roomHeight) {
    rn2(roomWidth); // somex
    rn2(roomHeight); // somey
}
/**
 * themerms.lua "Temple of the gods" fill contents RNG consumer.
 * C ref: themerms.lua themeroom_fills["Temple of the gods"].contents (lines 212-219).
 *
 * Lua sequence:
 *   des.altar({ align = align[1] })  -- get_free_room_loc -> somexy -> somex + somey
 *   des.altar({ align = align[2] })  -- somexy
 *   des.altar({ align = align[3] })  -- somexy
 */
export function nhlib_fill_temple_of_gods_rng(roomWidth, roomHeight) {
    for (let i = 0; i < 3; i++) {
        rn2(roomWidth);
        rn2(roomHeight);
    }
}
/* objects.h ordinals (index into js/oc_name_data.js OC_NAME, which is
   objects[] row-for-row): the three id-specified objects of this fill.
   Same spellings/values as js/u_init.js and js/m_initweap.js. */
const ARROW = 18;
const DAGGER = 34;
const BOW = 83;
export async function nhlib_fill_ghost_rng(floorCells, makemonFn, mkobjFn, mksobjAtFn) {
    // C ref: themerms.lua:223 — loc = selection.room():rndcoord(0).
    // compatibility a plain number is still accepted (consumes rn2(count) only).
    let idx, loc = null;
    if (Array.isArray(floorCells)) {
        idx = floorCells.length;
        const c = idx > 0 ? rn2(idx) : 0; // C selvar.c:302 c = rn2(idx)
        if (idx > 0) loc = floorCells[c]; // C selvar.c:306-308 — c-th set cell
    } else {
        idx = floorCells | 0;
        rn2(idx); // legacy: count-only, coordinate discarded
    }
    const lx = loc ? (loc.x | 0) : 0;
    const ly = loc ? (loc.y | 0) : 0;
    // C ref: sp_lev.c:3162 find_montype("ghost") — rn2(2) for gender selection
    // Ghost is humanoid and not M2_MALE/M2_FEMALE, so rn2(2) always fires.
    rn2(2); // find_montype gender (sp_lev.c:3162)
    // C ref: dungeon.c:2006 induced_align(AM_SPLEV_RANDOM=80) — rn2(3)
    rn2(3); // induced_align alignment selection (dungeon.c:2006)
    // C ref: sp_lev.c create_monster():1989 — makemon(PM_GHOST=287, loc.x, loc.y, 0)
    // Explicit coord (loc from rndcoord) means no somexy RNG consumed for position.
    // makemonFn is the real makemon from mklev.js, consuming:
    //   next_ident rnd(2), newmonhp d(m_lev,8), gender rn2(2),
    //   rndghostname rn2(7)+conditional rn2(34),
    //   m_initinv rn2(50)+rn2(100), makemonDomesticSaddle rn2(100).
    const mfn = makemonFn ?? _makemon_fn;
    if (mfn)
        // C ref: themerms.lua:225 — des.monster({ id="ghost", asleep=true, waiting=true,
        //   coord=loc }).  sp_lev.c create_monster applies the spec flags AFTER makemon:
        //   asleep=true (sp_lev.c:2132-2133) → mtmp->msleeping = 1;
        //   waiting=true (sp_lev.c:2161-2162) → mtmp->mstrategy |= STRAT_WAITFORU.
        // STRAT_WAITFORU puts the ghost in STRAT_WAITMASK, so dochug (monmove.c:739)
        // returns BEFORE distfleeck — the ghost consumes no per-turn movement RNG until
        // it can see the hero (m_canseeu clears WAITFORU at monmove.c:732-734).  Omitting
        // The makemonFn wrapper (mklev.js) sets the asleep/waiting flags on the created
        // ghost before this fill continues with the dropped objects.
        await mfn(287, lx, ly, 0); // PM_GHOST = 287 (ghost is named — not MM_NONAME)
    // C ref: themerms.lua ghost fill lines 227-245 — 6 conditional percent() checks.
    // Each percent() consumes rn2(100). If true, des.object() fires mkobj_at() immediately
    // (before the next percent() check) — consuming class-selection + next_ident + init RNG.
    // mkobjFn maps to C's mkobj(oclass, artif) — consumes rnd(classProbTotal) then mksobj.
    // OC class constants: WEAPON_CLASS=2, ARMOR_CLASS=3, RING_CLASS=4, SCROLL_CLASS=9.
    const ofn = mkobjFn ?? null;
    const sfn = mksobjAtFn ?? null;
    // percent(65): dagger (specific weapon id → mksobj_at → artif=!named=TRUE since no name)
    // C sp_lev.c:2212-2213 with o->id=dagger: mksobj_at(id, x, y, TRUE, !named=TRUE)
    // mksobj_at calls mksobj (next_ident + mksobj_init(artif=true)).
    // NOTE: id= items use mksobj_at not mkobj, so NO class-selection rnd() first.
    if (rn2(100) < 65) { // C themerms.lua:227 percent(65)
        // des.object({ id="dagger" }) → mksobj_at(DAGGER, x, y, TRUE, artif=TRUE)
        // → mksobj(DAGGER, init=true, artif=true) → next_ident(rnd2) + mksobj_init(artif=true)
        if (sfn)
            await sfn(DAGGER, lx, ly);
    }
    // percent(55): weapon class ")" → mkobj_at(WEAPON_CLASS, x, y, artif=!named=TRUE)
    // C sp_lev.c:2228: mkobj_at(oclass, x, y, !named). named=FALSE → artif=TRUE.
    if (rn2(100) < 55) { // C themerms.lua:230 percent(55)
        if (ofn)
            await ofn(2, true, lx, ly); // mkobj_at(WEAPON_CLASS=2, artif=true)
    }
    // percent(45): bow + arrow.  BOTH are `id=` specs (themerms.lua:234-235), so
    // both take the mksobj_at path — no class-selection rnd() for either.  C's own
    // stream distinguishes them: the arrow is is_multigen, so it alone draws the
    // rn1(6,6) quantity at mkobj.c:877; the bow does not.
    if (rn2(100) < 45) { // C themerms.lua:233 percent(45)
        if (sfn) {
            await sfn(BOW, lx, ly);
            await sfn(ARROW, lx, ly);
        }
    }
    // percent(65): armor class "[" → mkobj_at(ARMOR_CLASS, x, y, artif=true)
    if (rn2(100) < 65) { // C themerms.lua:237 percent(65)
        if (ofn)
            await ofn(3, true, lx, ly); // mkobj_at(ARMOR_CLASS=3, artif=true)
    }
    // percent(20): ring class "=" → mkobj_at(RING_CLASS, x, y, artif=true)
    if (rn2(100) < 20) { // C themerms.lua:240 percent(20)
        if (ofn)
            await ofn(4, true, lx, ly); // mkobj_at(RING_CLASS=4, artif=true)
    }
    // percent(20): scroll class "?" → mkobj_at(SCROLL_CLASS, x, y, artif=true)
    // SCROLL_CLASS is 9, not 6.  objclass.h's enum comes from defsym.h:466-484:
    //   ILLOBJ 1, WEAPON 2, ARMOR 3, RING 4, AMULET 5, TOOL 6, FOOD 7,
    //   POTION 8, SCROLL 9, SPBOOK 10, WAND 11, COIN 12, GEM 13, ...
    // so the 6 here was TOOL_CLASS, and every ghost room whose percent(20) '?'
    // roll passed built a TOOL.  It survived because mkobj()'s modulus is
    // oclass_prob_totals[oclass], which is 1000 for EVERY class -- the wrong
    // class draws an rnd(1000) of exactly the right shape, so the stream only
    // that is C's blessorcurse(otmp, 4) (mkobj.c:1079, the POTION/SCROLL arm)
    // against this port's rndmonnum_adj (mkobj.c:1044, the FIGURINE arm).
    if (rn2(100) < 20) { // C themerms.lua:243 percent(20)
        if (ofn)
            await ofn(9, true, lx, ly); // mkobj_at(SCROLL_CLASS=9, artif=true)
    }
    return loc;
}
export function nhlib_fill_teleportation_hub_rng(roomCells, roomLx) {
    const count = 2 + rn2(3);
    const srcCoords = [];
    // Simulate selection.room():filter_mapchar(".") with removeit=1 for each pick.
    // C ref: selvar.c selection_rndcoord -- rn2(count_of_set_bits) then pick that index.
    const locs = roomCells.slice(); // clone; elements are removed as picked
    for (let i = 0; i < count; i++) {
        /* C selvar.c:301 `if (idx) { c = rn2(idx); ... }` -- an EMPTY selection
         * draws NOTHING and returns x = y = -1, which themerms.lua's `pos.x > 0`
         * then rejects.  rn2(0) is not that. */
        if (locs.length === 0)
            continue;
        const c = rn2(locs.length); // rn2(remaining count); removeit=true
        const cell = locs[c];
        locs.splice(c, 1); // removeit
        if ((cell.x | 0) - (roomLx | 0) <= 0)
            continue;
        // Store absolute coords; the themerms.lua offset bug (pos.x += rm.region.x1-1,
        // pos.y += rm.region.y1) and the global rndcoord offset (x -= xstart=1, y -= ystart=0)
        // both cancel in the retry comparison, so we compare absolute coords directly.
        // C ref: nhlsel.c l_selection_rndcoord:415-421, themerms.lua:271-272, 1086.
        srcCoords.push({ x: cell.x, y: cell.y });
    }
    return { count, srcCoords };
}
export function nhlib_com_pager_rng() {
    nhlib_load_toplevel_rng();
}
/**
 * The RNG the top-level of nhlib.lua consumes, for ANY nhl_init() call.
 *
 * C ref: nhlua.c:2511 — nhl_init() unconditionally ends with
 * nhl_loadlua(L, "nhlib.lua"), and nhlib.lua's module body runs
 *     align = { "law", "neutral", "chaos" };  shuffle(align);
 * (nhlib.lua:24-25).  shuffle() (nhlib.lua:17-22) is a Fisher-Yates over
 * `for i = #list, 2, -1`, so a 3-element list draws math.random(3) then
 * math.random(2), and the nhlib.lua:5-15 math.random shim turns each into
 * 1 + nh.rn2(n) on the core RNG.
 *
 * Every fresh Lua state pays this — com_pager_core(), the level loaders, and
 * get_lua_version() (nhlua.c:2576) alike.
 */
export function nhlib_load_toplevel_rng() {
    rn2(3); // nhlib.lua:19 shuffle(align): math.random(3) → 1+nh.rn2(3)
    rn2(2); // nhlib.lua:19 shuffle(align): math.random(2) → 1+nh.rn2(2)
}
