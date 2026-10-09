// region.js — port of nethack-c/src/region.c (scaffold: functions are added here

import { NHF_BONESFILE, DOOR } from './const.js';
import { game } from './gstate.js';
import { rn2, rnd } from './rng.js';
const HALF_PHYSICAL_DAMAGE = 74; /* C prop.h HALF_PHYS_DAM */
import { Monnam, monstseesu, monstunseesu } from './mcastu.js';
import { You, Your } from './do_wear.js';
import { makeplural } from './objnam.js';
import { body_part } from './cmd.js';
import { losehp } from './dokick.js';
import { killed } from './mhitm.js';
import { monkilled_trap } from './trap.js';
import { make_blinded } from './zap.js';
import { EYE, LUNG, POISON_RES, KILLED_BY_AN, M_SEEN_POISON, M_POISONGAS_OK } from './const.js';
import { wake_nearto, resists_poison, setmangry } from './mklev.js';
import { isok } from './hacklib.js';
import { m_at } from './uhitm.js';
import { cansee, Blind, block_point, unblock_point, does_block } from './vision.js';
import { newsym, pline, _topl_record_join } from './display.js';
import { m_poisongas_ok } from './mklev.js';
import { is_pool_or_lava } from './look.js';

// C ref: decl.h — svn.n_regions (int), gr.regions (NhRegion **), gm.max_regions (int).
let svn = { n_regions: 0 };
let gr = { regions: null };
let gm = { max_regions: 0 };
// C ref: decl.h — svm.moves (long), the turn counter. Module-private, same
// pattern as svn/gr/gm above (no ported caller wires region.js into the
// shared game state yet).
let svm = { moves: 0 };
// C ref: decl.h — gg.gas_cloud_diss_within / gg.gas_cloud_diss_seen, the
// per-turn dissipation-message accumulators reset and drained by run_regions().
let gg = { gas_cloud_diss_within: false, gas_cloud_diss_seen: 0 };

// C ref: region.c:13 — #define NO_CALLBACK (-1), and region.c:45-50 the
// `callbacks[]` table.  A region stores an INDEX into that table (short
// expire_f / inside_f / …), not a function pointer, so the port keeps the
// integer indices and dispatches through call_callback() below.
const NO_CALLBACK = -1;
const INSIDE_GAS_CLOUD = 0;  /* region.c:46 */
const EXPIRE_GAS_CLOUD = 1;  /* region.c:48 */

// C ref: region.c:45-50 static const callback_proc callbacks[].
function call_callback(f_indx, reg, p2) {
    switch (f_indx) {
    case INSIDE_GAS_CLOUD: return inside_gas_cloud(reg, p2);
    case EXPIRE_GAS_CLOUD: return expire_gas_cloud(reg, p2);
    default:
        /* No other region type exists in region.c's callbacks[] table. */
        return false;
    }
}

// C ref: region.h:15-22 — player_flags bits and their accessor macros.
const REG_HERO_INSIDE = 0x01;
const REG_NOT_HEROS = 0x02;
export function hero_inside(r) { return ((r.player_flags | 0) & REG_HERO_INSIDE) !== 0; }
export function heros_fault(r) { return !((r.player_flags | 0) & REG_NOT_HEROS); }
export function set_hero_inside(r) { r.player_flags = (r.player_flags | 0) | REG_HERO_INSIDE; }
export function clear_hero_inside(r) { r.player_flags = (r.player_flags | 0) & ~REG_HERO_INSIDE; }
export function set_heros_fault(r) { r.player_flags = (r.player_flags | 0) & ~REG_NOT_HEROS; }
export function clear_heros_fault(r) { r.player_flags = (r.player_flags | 0) | REG_NOT_HEROS; }

// C ref: region.h:55 — #define MONST_INC 5
const MONST_INC = 5;

// C ref: defsym.h:149 PCHAR(47,'#',S_cloud) and defsym.h:204 PCHAR(86,'#',
// S_poisoncloud) — `PCHAR(idx,ch,sym,...)` expands to `sym = idx`.
const S_cloud = 47;
const S_poisoncloud = 86;
// C ref: display.h:624 cmap_to_glyph(cmap_idx).  Only the two gas-cloud
// symbols above ever reach it from this file; both land in the cmap_b /
// cmap_c arms, whose offsets are the ones js/glyphs.js:62-76 already
// derives from display.h's enum glyph_offsets (NUMMONS=383, NUM_OBJECTS=481).
//   S_cloud=47      : 47 <= S_goodpos and 47 < S_arrow_trap(49) → cmap_b arm
//                     → (47 - S_grave 34) + GLYPH_CMAP_B_OFF(4011) = 4024
//   S_poisoncloud=86: >= S_arrow_trap + MAXTCHARS → cmap_c arm
//                     → (86 - S_digbeam 78) + GLYPH_CMAP_C_OFF(4083) = 4091
function cmap_to_glyph(cmap_idx) {
    const S_grave = 34, S_digbeam = 78, S_arrow_trap = 49, S_goodpos = 87;
    const CMAP_B_GLYPH_BASE = 4011, CMAP_C_GLYPH_BASE = 4083;
    const MAXTCHARS = 25; /* C sym.h:92 — TRAPNUM - 1 */
    if (cmap_idx >= S_grave && cmap_idx < S_arrow_trap + MAXTCHARS)
        return (cmap_idx - S_grave) + CMAP_B_GLYPH_BASE;
    if (cmap_idx <= S_goodpos)
        return (cmap_idx - S_digbeam) + CMAP_C_GLYPH_BASE;
    return 0; /* C NO_GLYPH — unreachable for the two symbols used here */
}

// C ref: pm.generated.js — PM_FOG_CLOUD, used by inside_gas_cloud's
// fog-cloud-maintains-its-cloud clause (region.c:1104).
const PM_FOG_CLOUD_REG = 106;

// C ref: mon.h DEADMONSTER(mon) — (mon)->mhp < 1.
function DEADMONSTER(mon) { return (mon.mhp | 0) < 1; }

// C ref: mon.c find_mid(m_id, FM_FMON) — locate a monster on the level chain
// by m_id.  region.c only ever calls it with FM_FMON (run_regions:446), i.e.
// the plain fmon walk, so that is what this local mirror does.  Kept local
// (not a shadow port of the full find_mid, which also searches migrating and
// fmons lists under other FM_ flags) and named for what it is.
function find_mid_fmon(m_id) {
    for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
        if ((mtmp.mhp | 0) < 1) continue; /* DEADMONSTER — C find_mid (light.c:376) disregards a dead monster */
        if ((mtmp.m_id | 0) === (m_id | 0))
            return mtmp;
    }
    return null;
}

// C ref: hack.h u_at(x,y) — (u.ux == x && u.uy == y).
function u_at(x, y) {
    const u = game.u;
    return !!u && (u.ux | 0) === (x | 0) && (u.uy | 0) === (y | 0);
}

// C ref: vision.c:153-200 does_block(x, y, lev), now exported by js/vision.js
// (its _blocks() body, region arm included).  The stand-in that used to sit
// here returned a constant FALSE, so both `if (!does_block(...))
// unblock_point(...)` guards below always fired.  With the region arm live
// that is wrong in C's own terms: expire_gas_cloud() runs while its region is
// still in gr.regions[] with ttl 0, so C's does_block() returns 2 and C
// neither unblocks the cell nor sets vision_full_recalc.  remove_region() is
// what unblocks, and it sets reg->ttl = -2 first so visible_region_at() skips
// it.  No RNG either way.

// C ref: pline.c pline()/You()/You_see()/pline_The().  js/display.js's pline
// is async, but every region.c caller ported here (create_gas_cloud, reached
// from the SYNCHRONOUS m_move/movemon chain) is sync, so this file uses the
// same synchronous topline-accumulation idiom js/monmove.js:1387-1395 already
// uses for movemon-phase messages: append to game._pending_message and record
// the join offset so the pager can split the line where C's update_topl()
// would have.  No RNG.
function region_pline_sync(msg) {
    const g = game;
    if (!g || !msg) return;
    /* topl.c:257 skip = (flags & (WIN_STOP|WIN_NOSTOP)) == WIN_STOP: after an ESC
     * at a --More-- the message updates gt.toplines but is never drawn. */
    if (g._topl_win_stop) {
        const hidden = String(g._topl_win_stop_buf || g._pending_message || '');
        g._topl_win_stop_buf = (hidden.length + 2 + msg.length < 71)
            ? hidden + '  ' + msg : msg;
        return;
    }
    const prev = g._pending_message;
    if (prev && prev.length > 0) {
        const joined = prev + '  ' + msg;
        _topl_record_join(prev, joined);
        g._pending_message = joined;
    } else {
        g._pending_message = msg;
    }
}

// C ref: hacklib.c plur(n) — "" when n == 1, "s" otherwise.
function plur(n) { return (n | 0) === 1 ? '' : 's'; }

// C ref: region.c:52-57 inside_rect(NhRect *r, int x, int y)
export function inside_rect(r, x, y) {
    return (x >= r.lx && x <= r.hx && y >= r.ly && y <= r.hy);
}

// C ref: region.c:59-73 inside_region(NhRegion *reg, int x, int y)
export function inside_region(reg, x, y) {
    let i;

    if (!reg || !inside_rect(reg.bounding_box, x, y))
        return false;
    for (i = 0; i < reg.nrects; i++)
        if (inside_rect(reg.rects[i], x, y))
            return true;
    return false;
}

// C ref: region.c:75-127 create_region(NhRect *rects, int nrect).
// C memsets the struct to 0 first, then overwrites; the JS object literal
// below carries every NhRegion field (region.h:32-63) at its C zero/assigned
// value so no field is ever read undefined.
export function create_region(rects, nrect) {
    let i;
    const reg = {
        bounding_box: { lx: 0, ly: 0, hx: 0, hy: 0 },
        rects: null,
        nrects: 0,
        attach_2_u: false,
        attach_2_m: 0,
        enter_msg: null,
        leave_msg: null,
        ttl: 0,
        expire_f: 0,
        can_enter_f: 0,
        enter_f: 0,
        can_leave_f: 0,
        leave_f: 0,
        inside_f: 0,
        player_flags: 0,
        monsters: null,
        n_monst: 0,
        max_monst: 0,
        visible: false,
        glyph: 0,
        arg: { a_int: 0 },
    };

    /* Determines bounding box */
    if (nrect > 0) {
        reg.bounding_box = { lx: rects[0].lx, ly: rects[0].ly,
                             hx: rects[0].hx, hy: rects[0].hy };
    } else {
        reg.bounding_box.lx = COLNO_REG;
        reg.bounding_box.ly = ROWNO_REG;
        reg.bounding_box.hx = 0; /* 1 */
        reg.bounding_box.hy = 0;
    }
    reg.nrects = nrect;
    reg.rects = (nrect > 0) ? [] : null;
    for (i = 0; i < nrect; i++) {
        if (rects[i].lx < reg.bounding_box.lx)
            reg.bounding_box.lx = rects[i].lx;
        if (rects[i].ly < reg.bounding_box.ly)
            reg.bounding_box.ly = rects[i].ly;
        if (rects[i].hx > reg.bounding_box.hx)
            reg.bounding_box.hx = rects[i].hx;
        if (rects[i].hy > reg.bounding_box.hy)
            reg.bounding_box.hy = rects[i].hy;
        reg.rects[i] = { lx: rects[i].lx, ly: rects[i].ly,
                         hx: rects[i].hx, hy: rects[i].hy };
    }
    reg.ttl = -1; /* Defaults */
    reg.attach_2_u = false;
    reg.attach_2_m = 0;
    reg.enter_msg = null;
    reg.leave_msg = null;
    reg.expire_f = NO_CALLBACK;
    reg.enter_f = NO_CALLBACK;
    reg.can_enter_f = NO_CALLBACK;
    reg.leave_f = NO_CALLBACK;
    reg.can_leave_f = NO_CALLBACK;
    reg.inside_f = NO_CALLBACK;
    clear_hero_inside(reg);
    clear_heros_fault(reg);
    reg.n_monst = 0;
    reg.max_monst = 0;
    reg.monsters = null;
    reg.arg = { a_int: 0 }; /* C: cg.zeroany */
    return reg;
}

// C ref: config.h — COLNO 80, ROWNO 21 (the create_region empty-bbox seed).
const COLNO_REG = 80;
const ROWNO_REG = 21;

// C ref: region.c:129-155 add_rect_to_reg(NhRegion *reg, NhRect *rect)
export function add_rect_to_reg(reg, rect) {
    if (reg.nrects <= 0 || !reg.rects)
        reg.rects = [];
    reg.rects[reg.nrects] = { lx: rect.lx, ly: rect.ly, hx: rect.hx, hy: rect.hy };
    reg.nrects++;
    /* Update bounding box if needed */
    if (reg.bounding_box.lx > rect.lx)
        reg.bounding_box.lx = rect.lx;
    if (reg.bounding_box.ly > rect.ly)
        reg.bounding_box.ly = rect.ly;
    if (reg.bounding_box.hx < rect.hx)
        reg.bounding_box.hx = rect.hx;
    if (reg.bounding_box.hy < rect.hy)
        reg.bounding_box.hy = rect.hy;
}

// C ref: region.c:157-186 add_mon_to_reg(NhRegion *reg, struct monst *mon).
// The impossible() long-worm diagnostic is a message, not an effect; C
// returns without adding either way, which is what this port does.
export function add_mon_to_reg(reg, mon) {
    if (mon_in_region(reg, mon))
        return;
    if (reg.max_monst <= reg.n_monst) {
        if (!reg.monsters)
            reg.monsters = [];
        reg.max_monst += MONST_INC;
    }
    reg.monsters[reg.n_monst++] = mon.m_id | 0;
}

// C ref: region.c:188-202 remove_mon_from_reg(NhRegion *reg, struct monst *mon)
export function remove_mon_from_reg(reg, mon) {
    let i;

    for (i = 0; i < reg.n_monst; i++)
        if (reg.monsters[i] === (mon.m_id | 0)) {
            reg.n_monst--;
            reg.monsters[i] = reg.monsters[reg.n_monst];
            return;
        }
}

// C ref: region.c:204-218 mon_in_region(NhRegion *reg, struct monst *mon)
export function mon_in_region(reg, mon) {
    let i;

    for (i = 0; i < reg.n_monst; i++)
        if (reg.monsters[i] === (mon.m_id | 0))
            return true;
    return false;
}

// C ref: region.c:259-276 free_region(NhRegion *reg) — pure free(); JS is
// garbage-collected, so the C body has no observable effect to reproduce.
export function free_region(_reg) {
}

// C ref: decl.h svn.n_regions / gr.regions — a read-only view of the live
// region list for callers outside this module.  pray.c's region_danger()
// (region.c:1341) and region_safety() (region.c:1367) both walk exactly this
// list; they are hosted in js/cmd.js because their predicates
// (nonliving/Breathless/Poison_resistance) live on that side and this module
// deliberately imports almost nothing.  Returns the live region objects (the
// caller only reads inside_f / player_flags), sliced to n_regions so a stale
// tail left by the grow-by-10 bookkeeping is never visible.
export function regions_list() {
    return (gr.regions || []).slice(0, svn.n_regions | 0);
}

/* C region_stats() read-only allocation view for wizard #stats. */
export function region_stats_snapshot() {
    return {
        n_regions: svn.n_regions | 0,
        max_regions: gm.max_regions | 0,
        regions: (gr.regions || []).slice(0, svn.n_regions | 0),
    };
}
/* C ref: fountain.c:224-227 glyph_at()/glyph_to_cmap().  The display glyph
 * at a square can still be the non-poison cloud glyph immediately after a
 * cloud is created, even though the underlying terrain remains a fountain.
 * Callers use this narrow predicate when reproducing that transient test. */
export function gas_cloud_at(x, y) {
    for (const reg of regions_list()) {
        if (reg.visible && reg.ttl !== -2
            && reg.inside_f === INSIDE_GAS_CLOUD
            && reg.glyph === cmap_to_glyph(S_cloud)
            && inside_region(reg, x, y))
            return true;
    }
    return false;
}
// region.h:15-22 hero_inside(), re-exported under an unambiguous name for
export function region_hero_inside(r) { return hero_inside(r); }
// region.c:46 — the only inside_f callback pray.c cares about.
export const REG_INSIDE_GAS_CLOUD = INSIDE_GAS_CLOUD;

// C ref: region.c:278-338 add_region(NhRegion *reg).
// The gr.regions array-growth bookkeeping (C's realloc-by-10) is kept so
// gm.max_regions tracks C; JS arrays grow on assignment.
export function add_region(reg) {
    let i, j;

    if (gm.max_regions <= svn.n_regions) {
        if (!gr.regions)
            gr.regions = [];
        gm.max_regions += 10;
    }
    gr.regions[svn.n_regions] = reg;
    svn.n_regions++;
    /* Check for monsters inside the region */
    for (i = reg.bounding_box.lx; i <= reg.bounding_box.hx; i++)
        for (j = reg.bounding_box.ly; j <= reg.bounding_box.hy; j++) {
            let mtmp;
            let is_inside = false;

            /* Some regions can cross the level boundaries */
            if (!isok(i, j))
                continue;
            if (inside_region(reg, i, j)) {
                is_inside = true;
                /* if there's a monster here, add it to the region */
                if ((mtmp = m_at(i, j)) != null)
                    add_mon_to_reg(reg, mtmp);
            }
            if (reg.visible) {
                if (is_inside)
                    block_point(i, j);
                if (cansee(i, j))
                    newsym(i, j);
            }
        }
    /* Check for player now... */
    if (inside_region(reg, game.u ? (game.u.ux | 0) : 0,
                      game.u ? (game.u.uy | 0) : 0))
        set_hero_inside(reg);
    else
        clear_hero_inside(reg);
}

// C ref: region.c:340-386 remove_region(NhRegion *reg).
// u.uinwater is saved/forced/restored around the two passes; JS's cansee()
// does not read uinwater, but the assignment is kept so the field ends where
// C leaves it.
export function remove_region(reg) {
    let i, x, y;

    for (i = 0; i < svn.n_regions; i++)
        if (gr.regions[i] === reg)
            break;
    if (i === svn.n_regions)
        return;

    /* remove region before potential newsym() calls, but don't free it yet */
    if (--svn.n_regions !== i)
        gr.regions[i] = gr.regions[svn.n_regions];
    gr.regions[svn.n_regions] = null;

    /* Update screen if necessary */
    reg.ttl = -2; /* for visible_region_at */
    if (reg.visible) {
        let pass;
        const u = game.u || {};
        const tmp_uinwater = u.uinwater;

        for (pass = 1; pass <= (Blind_reg() ? 1 : 2); ++pass) {
            u.uinwater = (pass === 1) ? 0 : tmp_uinwater;

            for (x = reg.bounding_box.lx; x <= reg.bounding_box.hx; x++)
                for (y = reg.bounding_box.ly; y <= reg.bounding_box.hy; y++)
                    if (isok(x, y) && inside_region(reg, x, y)) {
                        if (pass === 1) {
                            if (!does_block(x, y))
                                unblock_point(x, y);
                        } else { /* pass==2 */
                            if (cansee(x, y))
                                newsym(x, y);
                        }
                    }
        }
        u.uinwater = tmp_uinwater;
    }
    free_region(reg);
}

// C ref: hack.h Blind — u.uprops[BLINDED].intrinsic/extrinsic or !haseyes.
// region.c reads it only to decide whether the SECOND (redraw) pass runs, so
// the blind hero simply skips redraws.  js/mhitu.js:173 uses the same
// flags.blind reading; no RNG on either branch.
function Blind_reg() {
    return !!(game.flags && game.flags.blind);
}

// C ref: region.c:927-952 reset_region_mids(NhRegion *reg) — bones-file
// m_id remapping.  Reached only from rest_regions() on a ghostly (bones)
// KNOWN GAP: nethack-c/src/region.c:928; needs the bones m_id relocation
// table.  C draws NO RNG on this path.  C's no-action value for a region
// with no relocatable monsters is to drop them all, which is what the
// n_monst = 0 below does.
export function reset_region_mids(reg) {
    reg.n_monst = 0;
}

// C ref: region.c:393-405 clear_regions(void)
export function clear_regions() {
    for (let i = 0; i < svn.n_regions; i++)
        free_region(gr.regions[i]);
    svn.n_regions = 0;
    if (gm.max_regions > 0)
        gr.regions = null; /* C: free((genericptr_t) gr.regions); */
    gm.max_regions = 0;
    gr.regions = null;
}

/* C ref: save.c:543 save_regions() / restore.c:1173 rest_regions() — regions
 * (gas clouds and the like) are LEVEL-scoped: they are written into the level
 * file on departure and read back on return.  savelev()'s release_data pass
 * reaches clear_regions() via clear_level_structures(); rest_regions()
 * repopulates gr.regions/svn.n_regions from the level's own records.
 *
 * This port keeps the live regions in module state, so the save hands back the
 * three fields verbatim and the restore reinstalls them.  Both are RNG-free.
 * The saved array is the LIVE array — the caller must not mutate it, and
 * clear_regions() replaces (never mutates) gr.regions, so a stored snapshot
 * stays intact across the intervening level. */
/* Named *_snapshot because region.c's own save_regions/rest_regions serialise
 * through an NHFILE and rest_regions(nhfp) is already ported below; these are
 * the in-memory equivalent js/save.js#savelev uses. */
export function regions_save_snapshot() {
    return { regions: gr.regions, n_regions: svn.n_regions, max_regions: gm.max_regions };
}
export function regions_rest_snapshot(saved, elapsed = 0) {
    gr.regions = saved ? saved.regions : null;
    svn.n_regions = saved ? (saved.n_regions | 0) : 0;
    gm.max_regions = saved ? (saved.max_regions | 0) : 0;
    // C rest_regions ages finite lifetimes by the time spent off-level, then
    // removes expired regions without invoking their expiration callbacks.
    for (let i = 0; i < svn.n_regions; i++) {
        const reg = gr.regions[i];
        if (reg.ttl >= 0) reg.ttl = Math.max(0, reg.ttl - elapsed);
    }
    for (let i = svn.n_regions - 1; i >= 0; i--) {
        if (gr.regions[i].ttl === 0) remove_region(gr.regions[i]);
    }
}

// alloc(size) (alloc.c) — struct/array allocator; JS has no sizeof/malloc
// model, so a fresh field-less object stands in for the C allocation, same
// pattern as js/dungeon.js / js/shk.js / js/makemon.js's local alloc(_size)
// stub. Used here for both single-struct allocs and pointer-array allocs:
// this function only ever indexes the result by integer key (never .length
// or array methods), so a plain object serves both shapes identically.
function alloc(_size) { return {}; }

// Sfi_long/Sfi_int/Sfi_short/Sfi_boolean/Sfi_unsigned/Sfi_char/Sfi_nhrect/
// Sfi_any (savefile.h) — libc-level save-file field readers; no JS save-file
// byte model exists, so these are faithful no-op stubs (calls_macro_or_libc),
// same pattern as js/dungeon.js's Sfi_int/Sfi_xint16/Sfi_coordxy.
function Sfi_long(nhfp, val, name) { return val; }
function Sfi_int(nhfp, val, name) { return val; }
function Sfi_short(nhfp, val, name) { return val; }
function Sfi_boolean(nhfp, val, name) { return val; }
function Sfi_unsigned(nhfp, val, name) { return val; }
function Sfi_char(nhfp, buf, name, n) { return buf; }
function Sfi_nhrect(nhfp, rect, name) { return rect; }
function Sfi_any(nhfp, val, name) { return val; }

// C ref: region.c:798-887 rest_regions(NHFILE *nhfp)
export function rest_regions(nhfp) {
    let r;
    let i, j;
    let n = 0;
    let tmstamp = 0;
    let msg_buf;
    const ghostly = (nhfp.ftype === NHF_BONESFILE);

    clear_regions(); /* Just for security */
    tmstamp = Sfi_long(nhfp, tmstamp, "region-tmstamp");
    if (ghostly)
        tmstamp = 0;
    else
        tmstamp = (svm.moves - tmstamp);
    svn.n_regions = Sfi_int(nhfp, svn.n_regions, "region-region_count");
    gm.max_regions = svn.n_regions;
    if (svn.n_regions > 0)
        gr.regions = alloc(/* svn.n_regions * sizeof(NhRegion *) */);
    for (i = 0; i < svn.n_regions; i++) {
        r = gr.regions[i] = alloc(/* sizeof(NhRegion) */);
        r.bounding_box = Sfi_nhrect(nhfp, r.bounding_box, "region-bounding box");
        r.nrects = Sfi_short(nhfp, r.nrects, "region-nrects");
        if (r.nrects > 0)
            r.rects = alloc(/* r.nrects * sizeof(NhRect) */);
        else
            r.rects = null;
        for (j = 0; j < r.nrects; j++) {
            r.rects[j] = Sfi_nhrect(nhfp, r.rects[j], "region-rect");
        }

        r.attach_2_u = Sfi_boolean(nhfp, r.attach_2_u, "region-attach_2_u");
        r.attach_2_m = Sfi_unsigned(nhfp, r.attach_2_m, "region-attach_2_m");
        n = Sfi_unsigned(nhfp, n, "region-enter_msg_length");
        if (n > 0) {
            msg_buf = alloc(/* n + 1 */);
            msg_buf = Sfi_char(nhfp, msg_buf, "region-enter_msg", n);
            /* msg_buf[n] = '\0'; -- null terminator write; no JS byte buffer
               to terminate under the no-op Sfi_char model above */
        } else {
            msg_buf = null;
        }
        r.enter_msg = msg_buf;

        n = Sfi_unsigned(nhfp, n, "region-leave_msg_length");
        if (n > 0) {
            msg_buf = alloc(/* n + 1 */);
            msg_buf = Sfi_char(nhfp, msg_buf, "region-leave_msg", n);
            r.leave_msg = msg_buf;
        } else {
            msg_buf = null;
        }
        r.leave_msg = msg_buf;

        r.ttl = Sfi_long(nhfp, r.ttl, "region-ttl");
        /* check for expired region */
        if (r.ttl >= 0)
            r.ttl = (r.ttl > tmstamp) ? r.ttl - tmstamp : 0;
        r.expire_f = Sfi_short(nhfp, r.expire_f, "region-expire_f");
        r.can_enter_f = Sfi_short(nhfp, r.can_enter_f, "region-can_enter_f");
        r.enter_f = Sfi_short(nhfp, r.enter_f, "region-enter_f");
        r.can_leave_f = Sfi_short(nhfp, r.can_leave_f, "region-can_leave_f");
        r.leave_f = Sfi_short(nhfp, r.leave_f, "region-leave_f");
        r.inside_f = Sfi_short(nhfp, r.inside_f, "region-inside_f");
        r.player_flags = Sfi_unsigned(nhfp, r.player_flags, "region-player_flags");
        if (ghostly) { /* settings pertained to old player */
            clear_hero_inside(r);
            clear_heros_fault(r);
        }
        r.n_monst = Sfi_short(nhfp, r.n_monst, "region-monster_count");
        if (r.n_monst > 0)
            r.monsters = alloc(/* r.n_monst * sizeof(unsigned) */);
        else
            r.monsters = null;
        r.max_monst = r.n_monst;
        for (j = 0; j < r.n_monst; j++) {
            r.monsters[j] = Sfi_unsigned(nhfp, r.monsters[j], "region-monster");
        }
        r.visible = Sfi_boolean(nhfp, r.visible, "region-visible");
        r.glyph = Sfi_int(nhfp, r.glyph, "region-glyph");
        r.arg = Sfi_any(nhfp, r.arg, "region-arg");
    }
    /* remove expired regions, do not trigger the expire_f callback (yet!);
       also update monster lists if this data is coming from a bones file */
    for (i = svn.n_regions - 1; i >= 0; i--) {
        r = gr.regions[i];
        if (r.ttl === 0)
            remove_region(r);
        else if (ghostly && r.n_monst > 0)
            reset_region_mids(r);
    }
}

// C ref: region.c:407-474 run_regions(void) — called once per turn from
// allmain.c:325, between nh_timeout() and the `u.ublesscnt--` upkeep.
// RNG: none of its own.  The inside_f callback it dispatches (inside_gas_cloud)
// draws rnd(dam) ONLY for a damaging cloud (arg.a_int >= 1); every cloud
// create_gas_cloud produces from monmove.c:683/704 is damage 0 (vapor) and
// consumes nothing.
export async function run_regions() {
    let i, j, k;
    let f_indx;

    /* reset some messaging variables */
    gg.gas_cloud_diss_within = false;
    gg.gas_cloud_diss_seen = 0;

    /* End of life ? */
    /* Do it backward because the array will be modified */
    for (i = svn.n_regions - 1; i >= 0; i--) {
        if (gr.regions[i].ttl === 0) {
            if ((f_indx = gr.regions[i].expire_f) === NO_CALLBACK
                || await call_callback(f_indx, gr.regions[i], null))
                remove_region(gr.regions[i]);
        }
    }

    /* Process remaining regions */
    for (i = 0; i < svn.n_regions; i++) {
        /* Make the region age */
        if (gr.regions[i].ttl > 0)
            gr.regions[i].ttl--;
        /* Check if player is inside region */
        f_indx = gr.regions[i].inside_f;
        if (f_indx !== NO_CALLBACK && hero_inside(gr.regions[i]))
            await call_callback(f_indx, gr.regions[i], null);
        /* Check if any monster is inside region */
        if (f_indx !== NO_CALLBACK) {
            for (j = 0; j < gr.regions[i].n_monst; j++) {
                const mtmp = find_mid_fmon(gr.regions[i].monsters[j]);

                if (!mtmp || DEADMONSTER(mtmp)
                    || await call_callback(f_indx, gr.regions[i], mtmp)) {
                    /* The monster died, remove it from list */
                    k = (gr.regions[i].n_monst -= 1);
                    gr.regions[i].monsters[j] = gr.regions[i].monsters[k];
                    gr.regions[i].monsters[k] = 0;
                    --j; /* current slot has been reused; recheck it next */
                }
            }
        }
    }

    if (gg.gas_cloud_diss_within) {
        region_pline_sync("The gas cloud around you dissipates.");
        /* normally won't see additional dissipation when within */
        if ((game.u && (game.u.xray_range | 0)) <= 1)
            gg.gas_cloud_diss_seen = 0;
        gg.gas_cloud_diss_within = false;
    }
    if (gg.gas_cloud_diss_seen) {
        region_pline_sync("You see "
                          + ((gg.gas_cloud_diss_seen === 1) ? "a" : "some")
                          + " gas cloud" + plur(gg.gas_cloud_diss_seen)
                          + " dissipate.");
        gg.gas_cloud_diss_seen = 0;
    }
}

// C ref: region.c:476-527 in_out_region(coordxy x, coordxy y) — hero
// enter/leave checks.  Both gas-cloud region types leave can_enter_f /
// can_leave_f / enter_f / leave_f at NO_CALLBACK and carry no enter_msg /
// leave_msg, so for every region this port can create the function reduces to
// the hero_inside bookkeeping and an unconditional TRUE.  No RNG.
export function in_out_region(x, y) {
    let i, f_indx = 0;

    /* First check if hero can do the move */
    for (i = 0; i < svn.n_regions; i++) {
        if (gr.regions[i].attach_2_u)
            continue;
        if (inside_region(gr.regions[i], x, y)
            ? (!hero_inside(gr.regions[i])
               && (f_indx = gr.regions[i].can_enter_f) !== NO_CALLBACK)
            : (hero_inside(gr.regions[i])
               && (f_indx = gr.regions[i].can_leave_f) !== NO_CALLBACK)) {
            if (!call_callback(f_indx, gr.regions[i], null))
                return false;
        }
    }

    /* Callbacks for the regions hero does leave */
    for (i = 0; i < svn.n_regions; i++) {
        if (gr.regions[i].attach_2_u)
            continue;
        if (hero_inside(gr.regions[i])
            && !inside_region(gr.regions[i], x, y)) {
            clear_hero_inside(gr.regions[i]);
            if (gr.regions[i].leave_msg != null)
                region_pline_sync(gr.regions[i].leave_msg);
            if ((f_indx = gr.regions[i].leave_f) !== NO_CALLBACK)
                call_callback(f_indx, gr.regions[i], null);
        }
    }

    /* Callbacks for the regions hero does enter */
    for (i = 0; i < svn.n_regions; i++) {
        if (gr.regions[i].attach_2_u)
            continue;
        if (!hero_inside(gr.regions[i])
            && inside_region(gr.regions[i], x, y)) {
            set_hero_inside(gr.regions[i]);
            if (gr.regions[i].enter_msg != null)
                region_pline_sync(gr.regions[i].enter_msg);
            if ((f_indx = gr.regions[i].enter_f) !== NO_CALLBACK)
                call_callback(f_indx, gr.regions[i], null);
        }
    }

    return true;
}

// C ref: region.c:529-576 m_in_out_region(struct monst *mon, coordxy x,
// coordxy y).  Called from monmove.c:2063 immediately before the move is
// committed; it keeps each region's monster list in step with the move.
// No RNG (all four callback slots are NO_CALLBACK for gas clouds).
export function m_in_out_region(mon, x, y) {
    let i, f_indx = 0;

    /* First check if mon can do the move */
    for (i = 0; i < svn.n_regions; i++) {
        if (gr.regions[i].attach_2_m === (mon.m_id | 0))
            continue;
        if (inside_region(gr.regions[i], x, y)
            ? (!mon_in_region(gr.regions[i], mon)
               && (f_indx = gr.regions[i].can_enter_f) !== NO_CALLBACK)
            : (mon_in_region(gr.regions[i], mon)
               && (f_indx = gr.regions[i].can_leave_f) !== NO_CALLBACK)) {
            if (!call_callback(f_indx, gr.regions[i], mon))
                return false;
        }
    }

    /* Callbacks for the regions mon does leave */
    for (i = 0; i < svn.n_regions; i++) {
        if (gr.regions[i].attach_2_m === (mon.m_id | 0))
            continue;
        if (mon_in_region(gr.regions[i], mon)
            && !inside_region(gr.regions[i], x, y)) {
            remove_mon_from_reg(gr.regions[i], mon);
            if ((f_indx = gr.regions[i].leave_f) !== NO_CALLBACK)
                call_callback(f_indx, gr.regions[i], mon);
        }
    }

    /* Callbacks for the regions mon does enter */
    for (i = 0; i < svn.n_regions; i++) {
        if (gr.regions[i].attach_2_m === (mon.m_id | 0))
            continue;
        if (!mon_in_region(gr.regions[i], mon)
            && inside_region(gr.regions[i], x, y)) {
            add_mon_to_reg(gr.regions[i], mon);
            if ((f_indx = gr.regions[i].enter_f) !== NO_CALLBACK)
                call_callback(f_indx, gr.regions[i], mon);
        }
    }

    return true;
}

// C ref: region.c:578-592 update_player_regions(void)
export function update_player_regions() {
    let i;
    const ux = game.u ? (game.u.ux | 0) : 0, uy = game.u ? (game.u.uy | 0) : 0;

    for (i = 0; i < svn.n_regions; i++)
        if (!gr.regions[i].attach_2_u && inside_region(gr.regions[i], ux, uy))
            set_hero_inside(gr.regions[i]);
        else
            clear_hero_inside(gr.regions[i]);
}

// C ref: region.c:594-611 update_monster_region(struct monst *mon).
// NOTE: js/dogmove.js:3811 holds a no-op stub of the same name (a dark-port
// shadow); this is the real body.  No RNG.
export function update_monster_region(mon) {
    let i;

    for (i = 0; i < svn.n_regions; i++) {
        if (inside_region(gr.regions[i], mon.mx | 0, mon.my | 0)) {
            if (!mon_in_region(gr.regions[i], mon))
                add_mon_to_reg(gr.regions[i], mon);
        } else {
            if (mon_in_region(gr.regions[i], mon))
                remove_mon_from_reg(gr.regions[i], mon);
        }
    }
}

// C ref: region.c:649-656 reg_damg(NhRegion *reg)
export function reg_damg(reg) {
    return (!reg.visible || reg.ttl === -2) ? 0 : (reg.arg.a_int | 0);
}

// C ref: region.c:658-670 any_visible_region(void)
export function any_visible_region() {
    let i;

    for (i = 0; i < svn.n_regions; i++) {
        if (!gr.regions[i].visible || gr.regions[i].ttl === -2)
            continue;
        return true;
    }
    return false;
}

// C ref: region.c:713-729 visible_region_at(coordxy x, coordxy y).
// Returns the region or null (C returns NhRegion * / NULL).
//
// PARTIALLY WIRED.  C consults visible_region_at from
// display.c:474 and :967 (cloud glyph override on the map), vision.c:195
// (does_block: a visible region blocks line of sight — WIRED, see
// js/vision.js _blocks()), hack.c:2537,
// invent.c:4167, insight.c:3338/:3500, pager.c:123/:262/:481, detect.c:2041/
// :2200 (all "you are in <poison gas|vapor>" style messages) and mon.c:2161/
// :2229 (mfndpos poison-gas avoidance).  The monmove.c:682 and vision.c:195
// callers are wired by this port; the rest are not.  C draws NO RNG at any of the display/vision/message
// sites.  The one RNG-bearing consumer is mfndpos, and it is inert for every
// cloud this port can create: it tests `gas_reg->glyph == cmap_to_glyph(
// S_poisoncloud)` (mon.c:2144), while monmove.c:683 and :704 both pass
// damage 0, giving glyph cmap_to_glyph(S_cloud).  A damaging cloud
// (monmove.c:702 hezrou, damage 8) WOULD make that branch live and is NOT
// covered — see the report note.
export function visible_region_at(x, y) {
    let i;

    for (i = 0; i < svn.n_regions; i++) {
        if (!gr.regions[i].visible || gr.regions[i].ttl === -2)
            continue;
        if (inside_region(gr.regions[i], x, y))
            return gr.regions[i];
    }
    return null;
}

/* C mon.c:2173-2174, :2240-2242 — the mfndpos test
 * `(gas_reg = visible_region_at(x,y)) != 0 && gas_reg->glyph == gas_glyph`,
 * gas_glyph = cmap_to_glyph(S_poisoncloud) (mon.c:2144). */
export function poisoncloud_at(x, y) {
    const gas_reg = visible_region_at(x, y);
    return gas_reg !== null && gas_reg.glyph === cmap_to_glyph(S_poisoncloud);
}

/*--------------------------------------------------------------*
 *                      Gas cloud related code                  *
 *--------------------------------------------------------------*/

// C ref: region.c:1040-1087 expire_gas_cloud(genericptr p1, genericptr p2).
// Returns TRUE ("it's gone, free it") / FALSE ("still there").  No RNG.
export function expire_gas_cloud(p1, _p2) {
    const reg = p1;
    let damage, pass;
    let x, y;

    damage = reg.arg.a_int | 0;

    /* If it was a thick cloud, it dissipates a little first */
    if (damage >= 5) {
        damage = Math.trunc(damage / 2); /* It dissipates, less damage */
        reg.arg = { a_int: damage };
        reg.ttl = 2; /* Here's the trick : reset ttl */
        return false; /* THEN return FALSE, means "still there" */
    }

    /* The cloud no longer blocks vision.  cansee() checks shouldn't be made
       until all blocked spots have been unblocked, so we need two passes */
    for (pass = 1; pass <= (Blind_reg() ? 1 : 2); ++pass) {
        for (x = reg.bounding_box.lx; x <= reg.bounding_box.hx; x++) {
            for (y = reg.bounding_box.ly; y <= reg.bounding_box.hy; y++) {
                if (inside_region(reg, x, y)) {
                    if (pass === 1) {
                        if (!does_block(x, y))
                            unblock_point(x, y);
                    } else { /* pass==2 */
                        if (!(game.u && game.u.uswallow)) {
                            if (u_at(x, y))
                                gg.gas_cloud_diss_within = true;
                            else if (cansee(x, y))
                                gg.gas_cloud_diss_seen++;
                        }
                    }
                }
            }
        }
    }

    return true; /* OK, it's gone, you can free it! */
}

// C ref: region.c:1089-1165 inside_gas_cloud(genericptr p1, genericptr p2).
// Returns True if p2 is killed by region p1.
//
// RNG: the `rnd(dam) + 5` draws at region.c:1122 (hero) and :1152 (monster)
// are the only ones, and both sit behind `if (dam < 1) return FALSE`.  Every
// cloud this port can currently create is damage 0, so this function is
// RNG-free in practice; the damaging arms are the KNOWN GAP below.
export async function inside_gas_cloud(p1, p2) {
    const reg = p1;
    const mtmp = p2;
    const umon = mtmp ? mtmp : (game.youmonst || game.gy?.youmonst);
    const dam = reg.arg.a_int | 0;

    /* fog clouds maintain gas clouds, even poisonous ones */
    if (reg.ttl < 20 && umon && umon.data
        && (umon.data.pmidx | 0) === PM_FOG_CLOUD_REG)
        reg.ttl += 5;

    if (dam < 1)
        return false; /* if no damage then there's nothing to do here... */

    if (!mtmp) { /* hero is indicated by Null rather than by &youmonst */
        if (m_poisongas_ok(game.youmonst || game.gy?.youmonst) === M_POISONGAS_OK)
            return false;
        if (!Blind()) {
            await Your(makeplural(body_part(EYE)) + " sting.");
            make_blinded(1, false);
        }
        const pr = game.u?.uprops?.[POISON_RES];
        if (!(pr && ((pr.intrinsic | 0) || (pr.extrinsic | 0)))) {
            await pline("Something is burning your " + makeplural(body_part(LUNG)) + "!");
            await You("cough and spit blood!");
            wake_nearto(game.u.ux | 0, game.u.uy | 0, 2);
            const hp = game.u?.uprops?.[HALF_PHYSICAL_DAMAGE];
            let d = rnd(dam) + 5;
            if (hp && ((hp.intrinsic | 0) || (hp.extrinsic | 0)) && !(hp.blocked | 0))
                d = (d + 1) >> 1;
            /* Half_gas_damage (worn towel) is not modeled; C region.c:1123 */
            await losehp(d, "gas cloud", KILLED_BY_AN);
            /* monstunseesu(M_SEEN_POISON) — C region.c:1126 */
            monstunseesu(M_SEEN_POISON);
            return false;
        }
        await You("cough!");
        wake_nearto(game.u.ux | 0, game.u.uy | 0, 2);
        monstseesu(M_SEEN_POISON);
        return false;
    }

    /* C region.c:1134-1165 — a monster is inside the cloud */
    if (m_poisongas_ok(mtmp) !== M_POISONGAS_OK_REG) {
        const data = mtmp.data;
        if ((data?.msound | 0) !== 0) { /* !is_silent */
            const ux = game.u ? (game.u.ux | 0) : 0, uy = game.u ? (game.u.uy | 0) : 0;
            const dx = (mtmp.mx | 0) - ux, dy = (mtmp.my | 0) - uy;
            if (cansee(mtmp.mx | 0, mtmp.my | 0) || (dx * dx + dy * dy) < 8)
                await pline(Monnam(mtmp) + " coughs!");
            wake_nearto(mtmp.mx | 0, mtmp.my | 0, 2);
        }
        if (heros_fault(reg))
            await setmangry(mtmp, true);
        if (((data?.mflags1 | 0) & 0x1000) === 0 && mtmp.mcansee) { /* haseyes */
            mtmp.mblinded = 1;
            mtmp.mcansee = 0;
        }
        if (resists_poison(mtmp))
            return false;
        mtmp.mhp = (mtmp.mhp | 0) - (rnd(dam) + 5);
        if (DEADMONSTER(mtmp)) {
            if (heros_fault(reg))
                await killed(mtmp);
            else
                await monkilled_trap(mtmp, "gas cloud");
            if (DEADMONSTER(mtmp)) /* not lifesaved */
                return true;
        }
    }
    return false; /* Monster is still alive */
}

// C ref: region.c:1167-1177 is_hero_inside_gas_cloud(void)
function is_hero_inside_gas_cloud() {
    let i;

    for (i = 0; i < svn.n_regions; i++)
        if (hero_inside(gr.regions[i])
            && gr.regions[i].inside_f === INSIDE_GAS_CLOUD)
            return true;
    return false;
}

// C ref: region.c:1179-1205 make_gas_cloud(NhRegion *cloud, int damage,
// boolean inside_cloud).  No RNG.
function make_gas_cloud(cloud, damage, inside_cloud) {
    /* gi.in_mklev: level generation is over by the time any wired caller runs
       (both are movemon-phase); svc.context.mon_moving is TRUE exactly then,
       so heros_fault is NOT set for a monster-made cloud — C's behaviour. */
    const in_mklev = !!(game.in_mklev);
    const mon_moving = !!(game.context && game.context.mon_moving);
    if (!in_mklev && !mon_moving)
        set_heros_fault(cloud); /* assume player has created it */
    cloud.inside_f = INSIDE_GAS_CLOUD;
    cloud.expire_f = EXPIRE_GAS_CLOUD;
    cloud.arg = { a_int: damage | 0 };
    cloud.visible = true;
    cloud.glyph = cmap_to_glyph(damage ? S_poisoncloud : S_cloud);
    add_region(cloud);

    if (!in_mklev && !inside_cloud && is_hero_inside_gas_cloud()) {
        region_pline_sync("You are enveloped in a cloud of "
                          + (damage ? "noxious gas" : "steam") + "!");
        game._region_enveloped_msg = true;
    }
}

// C ref: region.c:1312-1335 create_gas_cloud_selection().  JS callers already
// hold a selection's set cells as ordered {x,y} points; the C helper's bounds
// scan is only used to visit those cells and consumes no RNG.
export function create_gas_cloud_selection(points, damage) {
    const inside_cloud = is_hero_inside_gas_cloud();
    const cloud = create_region(null, 0);

    for (const point of points || []) {
        const x = point.x | 0, y = point.y | 0;
        add_rect_to_reg(cloud, { lx: x, ly: y, hx: x, hy: y });
    }

    make_gas_cloud(cloud, damage | 0, inside_cloud);
    return cloud;
}

// C ref: region.c:1207-1309 create_gas_cloud(coordxy x, coordxy y,
// int cloudsize, int damage).
//
// RNG, in C's exact order:
//   region.c:1255  rn2(i)  — the Fisher-Yates shuffle, 4 draws (i = 4,3,2,1)
//                            per BFS cell visited
//   region.c:1279  rn2(2)  — the "disrupt the breadth-first search" skip,
//                            drawn only when nvalid has reached 4
//   region.c:1303  rn1(3,4) = rn2(3) + 4 — the cloud's time to live, once
// `for` loop breaks on its first test — `newidx (1) >= cloudsize (1)` — before
// reaching the shuffle, so the single rn2(3) at :1303 is the whole draw.  That
// is exactly what the C traces show: 33 `rn2(3) @ create_gas_cloud(region.c:
const MAX_CLOUD_SIZE = 150;
export function create_gas_cloud(x, y, cloudsize, damage) {
    let cloud;
    let i, j;
    const tmprect = { lx: 0, ly: 0, hx: 0, hy: 0 };

    /* store visited coords */
    const xcoords = new Array(MAX_CLOUD_SIZE).fill(0);
    const ycoords = new Array(MAX_CLOUD_SIZE).fill(0);
    xcoords[0] = x;
    ycoords[0] = y;
    let curridx;
    let newidx = 1; /* initial spot is already taken */
    let inside_cloud = is_hero_inside_gas_cloud();

    /* a single-point cloud on hero and it deals no damage.
       probably a natural cause of being polyed. don't message about it */
    const mon_moving = !!(game.context && game.context.mon_moving);
    if (!mon_moving && u_at(x, y) && cloudsize === 1
        && (!damage
            || (damage && m_poisongas_ok(game.youmonst || game.gy?.youmonst)
                          === M_POISONGAS_OK_REG)))
        inside_cloud = true;

    if (cloudsize > MAX_CLOUD_SIZE) {
        /* C impossible("create_gas_cloud: cloud too large (%d)!", cloudsize) */
        cloudsize = MAX_CLOUD_SIZE;
    }

    for (curridx = 0; curridx < newidx; curridx++) {
        if (newidx >= cloudsize)
            break;
        const xx = xcoords[curridx];
        const yy = ycoords[curridx];
        /* Do NOT check for if there is already a gas cloud created at some
           other time at this position. They can overlap. */

        /* Primitive Fisher-Yates-Knuth shuffle to randomize the order of
         * directions chosen. */
        const dirs = [ { x: 0, y: -1 }, { x: 0, y: 1 },
                       { x: -1, y: 0 }, { x: 1, y: 0 } ];
        for (i = 4; i > 0; --i) {
            const swapidx = rn2(i);
            const tmp = dirs[swapidx];

            dirs[swapidx] = dirs[i - 1];
            dirs[i - 1] = tmp;
        }
        let nvalid = 0; /* # of valid adjacent spots */
        for (i = 0; i < 4; ++i) {
            /* try all 4 cardinal directions */
            const dx = dirs[i].x, dy = dirs[i].y;
            let isunpicked = true;

            if (valid_cloud_pos(xx + dx, yy + dy)) {
                nvalid++;
                /* don't pick a location we've already picked */
                for (j = 0; j < newidx; ++j) {
                    if (xcoords[j] === xx + dx && ycoords[j] === yy + dy) {
                        isunpicked = false;
                        break;
                    }
                }
                /* randomly disrupt the natural breadth-first search, so that
                 * clouds released in open spaces don't always tend towards a
                 * rhombus shape */
                if (nvalid === 4 && !rn2(2))
                    continue;

                if (isunpicked) {
                    xcoords[newidx] = xx + dx;
                    ycoords[newidx] = yy + dy;
                    newidx++;
                }
            }
            if (newidx >= cloudsize) {
                /* don't try further directions */
                break;
            }
        }
    }
    /* We have now either filled up xcoord and ycoord entirely or run out
       of space.  In either case, newidx is the correct total number of
       coordinates inserted. */
    cloud = create_region(null, 0);
    for (i = 0; i < newidx; ++i) {
        tmprect.lx = tmprect.hx = xcoords[i];
        tmprect.ly = tmprect.hy = ycoords[i];
        add_rect_to_reg(cloud, tmprect);
    }
    cloud.ttl = rn2(3) + 4; /* C region.c:1303 rn1(3, 4) */
    /* If cloud was constrained in small space, give it more time to live. */
    cloud.ttl = Math.trunc((cloud.ttl * cloudsize) / newidx);

    make_gas_cloud(cloud, damage, inside_cloud);
    return cloud;
}

// C ref: mon.c:311 m_poisongas_ok's M_POISONGAS_OK return code (js/const.js
// :2180 carries the same enum).
const M_POISONGAS_OK_REG = 2;

// C ref: read.c:1065-1074 valid_cloud_pos(coordxy x, coordxy y) — "can a
// stinking cloud physically exist at this position?"  (Declared in
// extern.h:2630; the body lives in read.c, not region.c, even though the only
// caller is create_gas_cloud's BFS at region.c:1267.)
//   if (!isok(x,y)) return FALSE;
//   return ACCESSIBLE(levl[x][y].typ) || is_pool(x, y) || is_lava(x, y);
// ACCESSIBLE(typ) is rm.h:112 — (typ) >= DOOR.  is_pool/is_lava are the
// dbridge.c terrain predicates that js/look.js:401 is_pool_or_lava already
// carries (POOL/MOAT/WATER for pool, LAVAPOOL/LAVAWALL for lava), so this
// reuses that rather than adding a fourth copy.  No RNG.
//
// Only reached from the BFS loop, which is entered only for cloudsize > 1.
// Every wired caller (monmove.c:683, :702, :704) passes cloudsize 1, and no
// size, so today this runs zero times — but it is a real port, not a stub,
// so a future cloudsize > 1 caller gets C's spread shape and C's draw count
// rather than an exception or a fabricated answer.
function valid_cloud_pos(x, y) {
    if (!isok(x, y))
        return false;
    const lev = game.level && game.level.at(x, y);
    if (!lev)
        return false;
    return ((lev.typ | 0) >= DOOR) || is_pool_or_lava(x, y);
}
