// dungeon.js — port of nethack-c/src/dungeon.c (scaffold: functions are added here

import { game } from './gstate.js';
import { In_quest, In_endgame, Is_knox_level, SHOPBASE, VISITED } from './const.js';
import './hacklib.js';
import { strsubst } from './hacklib.js';
import { rnd } from './rnd.js';
import { goto_level } from './do.js';
import { _earth_sense } from './cmd.js';
import { switch_terrain } from './hack.js'; // relocate-fns
import { COLNO, Is_botlevel, Is_stronghold, LR_DOWNTELE, LR_UPTELE, ROWNO, isok } from './const.js'; // relocate-fns
import { map_location, see_nearby_objects } from './display.js'; // relocate-fns
import { levelDifficulty } from './makemon.js'; // relocate-fns
import { _Blind_mk, _Hallucination_mk, _shtypes, sp_levchn_lookup } from './mklev.js';
import { place_lregion } from './mkmaze.js'; // relocate-fns
import './mkmaze.js'; // relocate-fns
import { impossible as lifecycle_impossible } from './pline.js'; // relocate-fns
import { invalidateTerrainStatus } from './terrain-status.js'; // relocate-fns
import { recalc_mapseen_rooms } from './cmd.js'; // relocate-fns
import { DRAWBRIDGE_UP, M_AP_FURNITURE, M_AP_TYPMASK } from './const.js'; // relocate-fns
import { db_under_typ } from './dbridge.js'; // relocate-fns
import { _m_at, canseemon, impossible_sync } from './display.js';
import { cmap_to_type } from './mkroom.js'; // relocate-fns
import { insertBranch } from './dungeon_rng.js'; // relocate-fns
import { Is_earthlevel } from './const.js'; // relocate-fns
import { panic } from './dog.js'; // relocate-fns
import { rn2 } from './rnd.js'; // relocate-fns
import { Align2amask } from './sp_lev.js'; // relocate-fns
import './bones.js'; // relocate-fns
import { In_sokoban } from './const.js'; // relocate-fns
import { In_W_tower_wz } from './dochug.js'; // relocate-fns
import { stairway_find_special_dir } from './stairs.js'; // relocate-fns
import { bot } from './botl.js'; // relocate-fns
import { Underwater, _digests, _enfolds_local, _is_animal_local, _mapseen_feat, _mapseen_level, _pd_br_string, _pd_chr_u_on_lvl, _pd_depth, _pd_unreachable_level, _surface_at_typ, ledger_no_cmd, msrooms_of, plur, putstr, set_cursor } from './cmd.js'; // relocate-fns
import { menucolor_text } from './coloratt.js'; // relocate-fns
import { build_window_screen, tty_window_offx } from './com_pager.js'; // relocate-fns
import { ASCENDED, Amask2align, CLOUD, DRAWBRIDGE_DOWN, ECMD_OK, ESCAPED, IS_AIR, IS_ALTAR, IS_DOOR, IS_FOUNTAIN, IS_GRAVE, IS_WALL, Is_firelevel as Is_firelevel_cmd, Is_waterlevel, PICK_NONE, PICK_ONE, ROOM, SDOOR, TEMPLE, VAULT } from './const.js'; // relocate-fns
import { is_ice, is_lava, is_pool } from './dbridge.js'; // relocate-fns
import { _threeStatusLines, await_menu_key, docorner_blank_utf8_captures, docrt, flush_screen, status_r1_menu_docrt } from './display.js'; // relocate-fns
import { wizard } from './gstate.js'; // relocate-fns
import { mungspaces } from './hacklib.js'; // relocate-fns
import { hliquid } from './do_name.js'; // relocate-fns
import { in_rooms } from './mklev.js'; // relocate-fns
import { an } from './objnam.js'; // relocate-fns
import { align_gname } from './pray.js'; // relocate-fns
import { ldrname } from './questpgr.js'; // relocate-fns
import { On_stairs } from './stairs.js'; // relocate-fns
import { formatkiller } from './topten.js'; // relocate-fns
import { TtyMenu, menu_heading_text } from './tty_menu.js'; // relocate-fns
import { getlin } from './windows.js'; // relocate-fns
import { done } from './end.js'; // relocate-fns
import { pline } from './pline.js'; // relocate-fns
import { stairway_at } from './stairs.js'; // relocate-fns
import { _Is_sanctum } from './cmd.js'; // relocate-fns
export { describe_level } from './botl.js'; // relocate-fns
export { describe_level_impl }; // relocate-fns

let sve = { exclusion_zones: null };

// C dungeon.c:1391-1396 — last dungeon's final bookkeeping level.
export function maxledgerno() {
    const dungeons = game.dungeons;
    const last = dungeons[(game._n_dgns ?? dungeons.length) - 1];
    return last.ledger_start + last.num_dunlevs;
}

// C dungeon.c:1956-1963 — find_hell() always chooses dungeon level 1.
export async function goto_hell(at_stairs, falling) {
    const lev = { dnum: game.valley_level.dnum, dlevel: 1 };
    await goto_level(lev, at_stairs, falling, false);
}

// C dungeon.c:1985-1995 — retain the signed range and the single rnd draw.
export function assign_rnd_level(dest, src, range) {
    dest.dnum = src.dnum;
    dest.dlevel = src.dlevel + (range > 0 ? rnd(range) : -rnd(-range));
    const bottom = game.dungeons[dest.dnum].num_dunlevs;
    if (dest.dlevel > bottom)
        dest.dlevel = bottom;
    else if (dest.dlevel < 1)
        dest.dlevel = 1;
}

export function on_level(lev1, lev2) {
    return !!(lev1 && lev2 && lev1.dnum === lev2.dnum && lev1.dlevel === lev2.dlevel);
}

/* C ref: dungeon.c:1477-1493 builds_up(lev) — TRUE iff `lev` sits in a branch
 * that is entered from BELOW (Sokoban, Vlad's Tower), so that going "up" is
 * going further in.  level_difficulty() (dungeon.c:2042) is the caller that
 * matters here: in a builds-up branch it adds 2 per level above the entrance,
 * which is what makes a Sokoban monster's adj_lev() come out several levels
 * higher than its raw depth would give.
 *
 * The multi-level test is `dptr->entry_lev == dptr->num_dunlevs`; the
 * single-level fallback scans svb.branches for the one whose end2 is this level
 * and returns its end1_up.  C's trailing impossible() is a diagnostic, so the
 * not-found case just returns FALSE. */
export function builds_up(lev) {
    if (!lev) return false;
    const dptr = (game.dungeons || [])[lev.dnum | 0];
    if (!dptr) return false;
    if ((dptr.num_dunlevs | 0) > 1)
        return (dptr.entry_lev | 0) === (dptr.num_dunlevs | 0);
    /* single-level branch: find the branch connecting it from its parent.
     * svb.branches is game._dungeon_branches (js/dungeon_rng.js, the RNG-correct
     * table print_dungeon() also walks); game.branches is allmain.js's
     * hand-built single-entry stand-in and is only the fallback. */
    for (const br of (game._dungeon_branches || game.branches || [])) {
        if (br.end2 && on_level(lev, br.end2))
            return !!br.end1_up;
    }
    impossible_sync("builds_up: can't find branch for dungeon %d", lev.dnum | 0);
    return false;
}

/* C ref: dungeon.h:142  #define In_tutorial(x) ((x)->dnum == tutorial_dnum)
 *
 * tutorial_dnum is assigned by fixup_level_locations() (dungeon.c:1168,
 * mirrored at js/dungeon_rng.js:741) and is UNSET until the dungeon topology
 * has been built, so the null guard keeps an unset tutorial_dnum from matching
 * an unset dnum — an unguarded `undefined === undefined` would report EVERY
 * pre-topology level as the tutorial.  This body was inline at
 * describe_level_buf below; it is one definition now because done2() needs the
 * same predicate and a second hand-written copy is how the mirrors in this repo
 * have historically drifted. */
export function In_tutorial(lev) {
    const td = game?.tutorial_dnum;
    /* `lev?.dnum != null` as well as the tutorial_dnum guard: a d_level with no
     * dnum yet must not compare equal to a tutorial_dnum of 0 through `| 0`. */
    return td != null && lev?.dnum != null && (lev.dnum | 0) === (td | 0);
}

/* C ref: dungeon.c:1463-1474 Is_branchlev(lev) — the branch record with an end
 * ON this level, or null:
 *     for (curr = svb.branches; curr; curr = curr->next)
 *         if (on_level(lev, &curr->end1) || on_level(lev, &curr->end2))
 *             return curr;
 *     return (branch *) 0;
 * Same table precedence as builds_up() above: game._dungeon_branches is the
 * RNG-correct svb.branches, game.branches the hand-built fallback. */
export function Is_branchlev(lev) {
    if (!lev) return null;
    for (const br of (game._dungeon_branches || game.branches || [])) {
        if (!br) continue;
        // C dungeon.c:1154 gives an unplaced Fort Ludios entrance a bogus
        // dnum. This port records that state with end1_floating instead;
        // its declared parent level is not a branch until placement.
        /* C dungeon.c:1142-1154 floats an unplaced entrance's end1.dnum
         * beyond the dungeon table.  Our equivalent flag must prevent that
         * endpoint from matching until mk_knox_portal binds it. */
        if ((!br.end1_floating && br.end1 && on_level(lev, br.end1))
            || (br.end2 && on_level(lev, br.end2)))
            return br;
    }
    return null;
}

/* C ref: dungeon.c:1878-1888 dname_to_dnum(s) — the index of the dungeon whose
 * dname is `s`.  C panics when the name is unknown; a missing name here is a
 * data defect in the generated dungeon table, not a game state, so this
 * fails rather than returning a dungeon number or inventing a
 * branch. */
export function dname_to_dnum(s) {
    const dgns = game._dungeons_full || game.dungeons || [];
    for (let i = 0; i < (game._n_dgns ?? dgns.length); i++)
        if (dgns[i] && dgns[i].dname === s)
            return i;
    throw new Error(`Couldn't resolve dungeon number for name "${s}".`);
}

/* C ref: dungeon.c:1877-1885 dungeon_branch() — the end2 scan, keyed by dnum.
 * dungeon.c:1164 caches dname_to_dnum("The Quest") in quest_dnum, and
 * knox_level.dnum is the same resolution for "Fort Ludios" by the time
 * mk_knox_portal runs, so callers already holding a dnum (mklev.js) enter
 * through this core instead of re-resolving a name; the name-taking twin
 * below is the C signature.  svb.branches is game._dungeon_branches (the
 * RNG-correct table print_dungeon() walks); game.branches is allmain.js's
 * hand-built stand-in and is only the fallback, the same precedence
 * builds_up() above uses.  Not-found: C panic()s — mklev.c:2631's assert
 * relies on dungeon_branch never returning Null — so this throws; it never
 * returns null where a caller could mistake that for "no branch". */
export function dungeon_branch_dnum(dnum) {
    for (const br of (game._dungeon_branches || game.branches || []))
        if (br && br.end2 && (br.end2.dnum | 0) === (dnum | 0))
            return br;
    /* C: panic("dgn_entrance: can't find entrance to %s", s) */
    throw new Error(`dgn_entrance: can't find entrance (dnum ${dnum})`);
}

/* C ref: dungeon.c:1870-1886 dungeon_branch(s) — dname_to_dnum(s), then the
 * shared end2 scan above. */
export function dungeon_branch(s) {
    return dungeon_branch_dnum(dname_to_dnum(s));
}

/* C ref: dungeon.c:1896-1903 at_dgn_entrance(s) —
 *     br = dungeon_branch(s);
 *     return on_level(&u.uz, &br->end1) ? TRUE : FALSE;
 * i.e. "is the hero standing on the level the branch to `s` leaves FROM".
 * goto_level()'s main-dungeon arm (do.c:1917) is the caller that matters. */
export function at_dgn_entrance(s) {
    const br = dungeon_branch(s);
    return !!(br && !br.end1_floating && on_level(game.u ? game.u.uz : null, br.end1));
}

/* C ref: dungeon.c:1323-1327 dunlev(lev) — the level number within *this*
 * dungeon, i.e. the raw dlevel, NOT depth(). */
export function dunlev(lev) {
    return lev?.dlevel | 0;
}

/* C ref: dungeon.c:1332-1335 dunlevs_in_dungeon(lev) —
 *     return svd.dungeons[lev->dnum].num_dunlevs; */
export function dunlevs_in_dungeon(lev) {
    return (game.dungeons?.[lev?.dnum | 0]?.num_dunlevs | 0);
}

/* C dungeon.c:2805-2831 remdun_mapseen().  The port stores overview data
 * in per-level tables instead of a linked mapseen chain (cmd.js
 * show_overview).  Mark only levels which already have an overview entry;
 * a later first visit to another level in this dungeon starts reachable.
 * Keep annotations and features for final disclosure, just as C does. */
export function remdun_mapseen(dnum) {
    const dgn = game.dungeons?.[dnum];
    if (!dgn) return;
    const unreachable = (game._level_notreachable ||= {});
    for (const entry of (game._mapseen_entries || []))
        if (entry.dnum === dnum) entry.notreachable = true;
    const start = dgn.ledger_start | 0;
    const end = start + (dgn.num_dunlevs | 0);
    for (const key of Object.keys(game.level_info || {})) {
        const ledger = Number(key);
        if (ledger > start && ledger <= end
            && (game.level_info[key].flags & VISITED))
            unreachable[`${dnum}:${ledger - start}`] = true;
    }
    // The current level has a mapseen entry before its first savelev().
    const lev = game.u?.uz;
    if (lev && lev.dnum === dnum)
        unreachable[`${dnum}:${lev.dlevel}`] = true;
}

export function mapseen_notreachable(lev) {
    return lev.duplicate ? lev.notreachable
        : !!game._level_notreachable?.[`${lev.dnum}:${lev.dlevel}`];
}

/* C dungeon.c:3096-3111, the reachability part of recalc_mapseen().
 * Returning to one quest level revives the entire branch's overview data;
 * elsewhere only the current level becomes reachable again. */
export function recalc_mapseen_reachability() {
    const lev = game.u?.uz;
    if (!lev || !mapseen_notreachable(lev)) return;
    const unreachable = game._level_notreachable;
    unreachable[`${lev.dnum}:${lev.dlevel}`] = false;
    if (In_quest(lev)) {
        for (const entry of (game._mapseen_entries || []))
            if (entry.dnum === lev.dnum) entry.notreachable = false;
        for (const key of Object.keys(unreachable))
            if (Number(key.split(':')[0]) === lev.dnum)
                unreachable[key] = false;
    }
}

/* C ref: dungeon.c:3409-3437 endgamelevelname(outbuf, indx) — name an endgame
 * level from its (negative) depth.  C writes into outbuf and returns it; this
 * port returns the string. */
export function endgamelevelname(indx) {
    let outbuf = '';
    let planename = null;

    switch (indx) {
    case -5:
        outbuf = 'Astral Plane';
        break;
    case -4:
        planename = 'Water';
        break;
    case -3:
        planename = 'Fire';
        break;
    case -2:
        planename = 'Air';
        break;
    case -1:
        planename = 'Earth';
        break;
    }
    if (planename)
        outbuf = `Plane of ${planename}`;
    else if (!outbuf)
        outbuf = `unknown plane #${indx}`;
    return outbuf;
}


/* The same call for the ported JS callers, which want C's `buf` rather than its
 * int return (js/display.js's status line, js/steed.js's impossible() text). */
export function describe_level_buf(dflgs, uz) {
    return describe_level_impl(dflgs, uz).buf;
}

function describe_level_impl(dflgs, uz) {
    const g = game;
    const lev = uz ?? g?.u?.uz;
    const addspace = (dflgs & 1) !== 0;  /* (used to be unconditional) */
    let addbranch = (dflgs & 2) !== 0;   /* False: status, True: livelog */
    let ret = 1;
    let buf;

    if (Is_knox_level(lev)) {
        buf = String(g?.dungeons?.[lev?.dnum]?.dname ?? '');
        addbranch = false;
    } else if (In_quest(lev)) {
        buf = `Home ${dunlev(lev)}`;
    } else if (In_endgame(lev)) {
        /* [3.6.2: this used to be "Astral Plane" or generic "End Game"] */
        buf = endgamelevelname(depth(lev));
        if (!addbranch)
            buf = strsubst(buf, 'Plane of ', ''); /* just keep <element> */
        addbranch = false;
    } else {
        /* ports with more room may expand this one */
        if (!addbranch) {
            /* C dungeon.h:142 In_tutorial(x) == ((x)->dnum == tutorial_dnum). */
            const label = In_tutorial(lev) ? 'Tutorial' : 'Dlvl';
            buf = `${label}:${String(depth(lev)).padEnd(2, ' ')}`; /* "Dlvl:n" (grep fodder) */
        } else {
            buf = `level ${depth(lev)}`;
        }
        ret = 0;
    }
    if (addbranch) {
        buf += `, ${g?.dungeons?.[lev?.dnum]?.dname ?? ''}`;
        buf = strsubst(buf, 'The ', 'the ');
    }
    if (addspace)
        buf += ' ';
    return { buf, ret };
}

export function free_exclusions() {
    let ez = sve.exclusion_zones;
    while (ez) {
        let nxtez = ez.next;
        ez = nxtez;
    }
    sve.exclusion_zones = null;
}

// update_file(nhfp) macro (hack.h): (nhfp)->mode & (COUNTING | WRITING).
const COUNTING = 0x01;
const WRITING = 0x02;
function update_file(nhfp) {
    return nhfp.mode & (COUNTING | WRITING);
}

// Sfo_int/Sfo_xint16/Sfo_coordxy (savefile.h) — libc-level save-file field
// writers; no JS save-file byte model exists, so these are faithful no-op
// stubs (calls_macro_or_libc), same pattern as js/cfgfiles.js's fclose.
function Sfo_int(nhfp, val, name) { /* no-op stub */ }
function Sfo_xint16(nhfp, val, name) { /* no-op stub */ }
function Sfo_coordxy(nhfp, val, name) { /* no-op stub */ }

export function save_exclusions(nhfp) {
    let ez;
    let nez;

    for (nez = 0, ez = sve.exclusion_zones; ez; ez = ez.next, ++nez)
        ;

    if (update_file(nhfp)) {
        Sfo_int(nhfp, nez, "exclusion_count");
        for (ez = sve.exclusion_zones; ez; ez = ez.next) {
            Sfo_xint16(nhfp, ez.zonetype, "exclusion-zonetype");
            Sfo_coordxy(nhfp, ez.lx, "exclusion-lx");
            Sfo_coordxy(nhfp, ez.ly, "exclusion-ly");
            Sfo_coordxy(nhfp, ez.hx, "exclusion-hx");
            Sfo_coordxy(nhfp, ez.hy, "exclusion-hy");
        }
    }
}

// Sfi_int/Sfi_xint16/Sfi_coordxy (savefile.h) — libc-level save-file field
// readers; no JS save-file byte model exists, so these are faithful no-op
// stubs (calls_macro_or_libc), same pattern as this file's Sfo_* (save side).
function Sfi_int(nhfp, val, name) { return val; }
function Sfi_xint16(nhfp, val, name) { return val; }
function Sfi_coordxy(nhfp, val, name) { return val; }

// alloc(size) (alloc.c) — struct allocator; JS has no sizeof/malloc model,
// so a fresh field-less object stands in for the C allocation, same pattern
// as js/shk.js and js/makemon.js's local alloc(_size) stub.
function alloc_dungeon(_size) { return {}; }

export function load_exclusions(nhfp) {
    let ez;
    let nez = 0;

    nez = Sfi_int(nhfp, nez, "exclusion_count");

    while (nez-- > 0) {
        ez = alloc_dungeon(0);
        ez.zonetype = Sfi_xint16(nhfp, ez.zonetype, "exclusion-zonetype");
        ez.lx = Sfi_coordxy(nhfp, ez.lx, "exclusion-lx");
        ez.ly = Sfi_coordxy(nhfp, ez.ly, "exclusion-ly");
        ez.hx = Sfi_coordxy(nhfp, ez.hx, "exclusion-hx");
        ez.hy = Sfi_coordxy(nhfp, ez.hy, "exclusion-hy");
        ez.next = sve.exclusion_zones;
        sve.exclusion_zones = ez;
    }
}

export function In_hell(uz) {
    const lev = uz ?? game.u?.uz;
    if (!lev)
        return false;
    const flags = game.dungeons?.[lev.dnum]?.flags;
    if (!flags)
        return false;
    if (Array.isArray(flags))
        return flags.includes('hellish');
    if (typeof flags !== 'object')
        return false;
    return !!(flags.hellish);
}

// ── Hero placement (C ref: dungeon.c:1568-1601 u_on_newpos) ──
export async function u_on_newpos(x, y) {
    if (!isok(x, y)) {
        if (x < 0 || y < 0 || x >= COLNO || y >= ROWNO) throw new Error(`panic: u_on_newpos: trying to place hero off map <${x},${y}>`);
        await lifecycle_impossible('u_on_newpos: trying to place hero off map <%d,%d>', x, y);
    }
    game.u.ux = x;
    game.u.uy = y;
    game.u.uundetected = 0;
    /* C dungeon.c:1583-1585 — "ridden steed always shares hero's location":
     *     if (u.usteed)
     *         u.usteed->mx = u.ux, u.usteed->my = u.uy;
     * This is the invariant C's mon_sanity_check asserts (mon.c:273-277): the
     * steed stays on the fmon chain but off the level's monster grid, with its
     * <mx,my> tracking the hero.  Without it a rider who changed level or was
     * teleported left the steed standing on the old square. */
    if (game.u.usteed) {
        game.u.usteed.mx = x;
        game.u.usteed.my = y;
    }
    /* C dungeon.c:1588 — on a level transition, remember the arrival square
     * in ux0/uy0 before rebuilding nearby visibility. */
    const uz = game.u.uz, uz0 = game.u.uz0;
    if (uz && uz0
        && ((uz.dnum | 0) !== (uz0.dnum | 0)
            || (uz.dlevel | 0) !== (uz0.dlevel | 0))) {
        game.u.ux0 = x;
        game.u.uy0 = y;
        /* C dungeon.c:1590-1593 — refresh lastseentyp at the arrival square
         * before spoteffects() and force switch_terrain() once. */
        map_location(x, y, false);
        invalidateTerrainStatus();
    }
    if (!(uz && uz0 && (uz.dnum !== uz0.dnum || uz.dlevel !== uz0.dlevel)) && !_Blind_mk()
        && !_Hallucination_mk()
        && !(game.u.uswallow | 0))
        see_nearby_objects();
    await _earth_sense();
}

// C ref: dungeon.c u_on_rndspot — place hero at a random location within
// the level's stored arrival region (game.updest/game.dndest, populated
// by fixup_special from a des.teleport_region/des.levregion call — see
// js/sp_lev.js's lspo_teleport_region and fixup_special).
export async function u_on_rndspot(upflag) {
    const up = (upflag & 1);
    if (upflag & 2) {
        /* C dungeon.c:1614-1622 — when leaving the Wizard's Tower, keep the
         * hero inside its exclusion rectangle if the destination is another
         * tower level.  Both directions use dndest's exclusion region. */
        const uz = game.u?.uz;
        const tower = [game.wiz1_level, game.wiz2_level, game.wiz3_level]
            .some(lv => lv && (lv.dnum | 0) === (uz?.dnum | 0)
                        && (lv.dlevel | 0) === (uz?.dlevel | 0));
        if (tower) {
            const d = game.dndest || {};
            await place_lregion(d.nlx || 0, d.nly || 0, d.nhx || 0, d.nhy || 0,
                          0, 0, 0, 0, LR_DOWNTELE, null);
            /* C dungeon.c:1636-1637: every arrival region, including the
             * tower's exclusion region, must restore flight/levitation. */
            await switch_terrain();
            return;
        }
    }
    const d = up ? (game.updest || {}) : (game.dndest || {});
    await place_lregion(d.lx || 0, d.ly || 0, d.hx || 0, d.hy || 0,
                  d.nlx || 0, d.nly || 0, d.nhx || 0, d.nhy || 0,
                  up ? LR_UPTELE : LR_DOWNTELE, null);
    /* C dungeon.c:1636-1637 — "might have just left solid rock and unblocked
     * levitation": switch_terrain() runs unconditionally after the placement.
     * A level-teleport arrival that lands on a free square with a blocked
     * BLevitation clears it and float_up()s ("You start to float in the air!"). */
    await switch_terrain();
}

// C dungeon.c level_difficulty() — use makemon helper (depth / amulet / endgame / builds_up)
export function level_difficulty() {
    return levelDifficulty() | 0;
}

export function single_level_branch(lev) {
    const uz = lev ?? game.u?.uz;
    if (!uz)
        return false;
    return Is_knox_level(uz);
}

/* C shknam.c:439 shop_string(rtype) — actually dungeon.c:3441, the "short shop
 * description" #overview's print_mapseen annotates a level's shop with.  It
 * lives here because it is the only reader of shtypes[].annotation (mkroom.h:29,
 * "simpler name for #overview; Null if same"), the column this table was
 * missing entirely.  SHOPBASE == 14 (mkroom.h:66). */
export function shop_string(rtype) {
    const shoptype = (rtype | 0) - SHOPBASE;
    if (shoptype < 0)
        return 'untended shop';
    const row = _shtypes[shoptype];
    if (row && row.annotation)
        return row.annotation;
    if (row && row.name)
        return row.name;
    return 'shop?';   /* C's catchall */
}

// C ref: dungeon.c:1447-1457 Is_special() — walk the special-level
// chain (svs.sp_levchn), matched by (dnum,dlevel). game._sp_levchn is
// built by dungeon_rng.js at dungeon-init time and is ALREADY correct
// is the SINGLE firewall point that keeps every non-tut-1/tut-2 special
// level behaving exactly as today (Is_special returns null, as if this
// NOT allowlisted, and deliberately so.  Each blocked proto throws a DIFFERENT
// unported-callee during its .lua load, so admitting one crashes
// ITS OWN callee lands — they are independent ports, not one.  Their questtext
// firsttime entries are already ported below.
//
// drives the real load_special() against every dat/*-strt.lua WITHOUT touching
// this set and reports each blocker by name; add a proto only after the probe
// reports it `ok`, and only ONE AT A TIME (level generation is global — a wrong
//
// It resolves the C-side checkpoint coordinates (d3l1_002, ...) through the
// role-renamed level chain, so it reports where C actually stood — not where the
// under-reports exactly the protos that most need gating.
// — none of the three visits a *-strt level.  Admitting only Cav-strt and running
//
//   Wiz-strt           : lspo_region irregular region (same callee as Cav-strt)
//                        (was "mkmap (mines)"; mkmap landed in 7cbb4f54 and the
//                         blocker moved forward to the next unported opcode)
//   Mon-strt           : lspo_object STATUE/EGG/TIN/FIGURINE special-casing
//
// mk_mplayer dispatch (the four "knight" guards are PM_KNIGHT=335, inside the
// player-monster range [PM_ARCHEOLOGIST=331, PM_WIZARD=343], so C routes them
// through mplayer.c:117 mk_mplayer) and create_object's put_saddle_on_mon (the
// warhorse `inventory` closure). Both are now wired in js/sp_lev.js.
//
//
//    teleport.  Admitting Pri-strt therefore moves nothing measurable ... ADMIT
//
// but step 141, and the single remaining blocker was do_wear.c:820's "You speed
// signal.  It is worth re-reading how the arithmetic MOVED under the fix:
//   - admitted with the rn2(3) @ u_calc_moveamt still missing:  167 -> 162  (-5)
//   - admitted after that leaf is restored:                     167 -> 168  (+1)
// Same one-word diff, opposite verdict.  A proto loaded on a shifted RNG stream
// generates a DIFFERENT level and scores like a bug; admission is only ever
// measurable once the prefix into it is bit-exact.  Do not re-park a proto on a
// callees worth porting next are lvlfill_maze_grid (7: castle, asmodeus, orcus,
// wizard2, wizard3, fakewiz1, fakewiz2), lspo_region irregular/flood_fill_rm
// (6: Cav-strt, Wiz-strt, valley, Pri-loca, Wiz-loca, Cav-loca), create_object
// RANDOM_CLASS (4: Bar-loca, Mon-loca, Ran-loca, Val-loca), then create_altar
// priestini (2), lspo_map table-form (2), find_level LR_PORTAL by name (2).
// dat/<proto>.lua), so they need the variant-selection path, not just an opcode.
// step 189 the hero level-teleports to Dlvl 5, C's trace goes
// getbones(bones.c:645) -> the nhlib.lua `shuffle(align)` of a FRESH lua state
// -> build_room(sp_lev.c:2811), i.e. makemaz(slev->proto) on a special level,
// blocked, Is_special returned null there, JS fell through to regular themed-room
// generation, and every one of the 1,621 remaining steps rendered the wrong level.
// ┌───────────────────────────────────────────────────────────────────────────
// │ SUPERSEDED — castle IS in LOADER_READY (see the const below) and its
// │ -47 (below) -> -3 -> 0, with the -47 and -3 blocks each concluding that the
// │ cost belonged to castle's own generation.  It never did.
// │
// │ THE COROLLARY, because it explains all three wrong readings and generalises
// │ past castle: A PROTO'S PARKED ADMISSION COST IS NOT EVIDENCE ABOUT THE
// │ PROTO until the leaf stream PAST THE END OF ITS OWN GENERATION has been
// │ diffed.  A special level is the only thing that populates the arrival
// │ regions (des.teleport_region -> svu.updest / svd.dndest), so a defect in
// │ the ARRIVAL path is invisible until that level is admitted — and then it is
// │ charged to the level.  Re-park a proto only after diffing past its
// │ build_room tail into goto_level/place_lregion; a cost that survives THAT is
// │ a property of the level.
// └───────────────────────────────────────────────────────────────────────────
// the first entry whose blocker chain is fully cleared and which STILL must not
//   answers the level-teleport menu with "j" ("j -   castle: 25 (tune EEBGG)")
//   and C's trace goes getbones(bones.c:645) -> the nhlib.lua shuffle(align) of
//   a FRESH lua state, i.e. makemaz(slev->proto) on a special level.  With
//   castle blocked, Is_special returns null there and JS draws rn2(5) @
//   js/mklev.js:4513 — regular themed-room generation on the wrong level.  That
//   first screen divergence.
//   The blocker chain (lvlfill_maze_grid -> lspo_mazewalk's fill_empty_maze
//   tail (maze1xy + rndtrap) -> js/trap.js's three exported throwing stubs that
//   shadowed already-ported set_levltyp/recalc_block_point/spot_stop_timers)
//   from BLOCKED to `ok` (173 des.* opcodes, load_special completes).
//   the real castle is STRUCTURALLY right and moves the RNG axis a long way
//   (prefixMatch 8708 -> 12975 after the l_selection_setpoint fix below), but
//   its generation is still not leaf-exact, so the frames it now renders are
//   wrong where the old random level happened to coincide.  Cardinal Rule 4
//   NEXT BLOCKER, for whoever picks this up: the probe now reports
//   "not yet ported: mkroll_launch", and with castle admitted the first RNG
//   divergence is leaf 12975 — C rn2(3) @ induced_align(dungeon.c:2012) vs
// C trace until that is fixed.
//   call a method on a non-table value".  Those are the CONDITIONAL arms of
//   bigrm-2.lua:50 (`selection = darkness:grow()`) and bigrm-5.lua:33-34
//   (`selection.match("."):percentage(2):grow()`); the unconditional arms load
//   fine, which is why lua-level-load-probe and loader-chain both report
//   bigrm-2/-5 CHAIN-CLEARS and see none of this.  Port those two and the -27
//   should come back as a gain.
//   only appeared once the two render bugs ahead of this commit landed (the
//   golem class char and the stale 3.7 wand probabilities): with bigrm admitted
//   built leaf-exactly and still missed on 4 cells.  That is the general shape
//   and the reason the earlier -11 was not evidence against the level:
//   ADMITTING A SPECIAL LEVEL PAYS NOTHING UNTIL EVERY GLYPH ON IT IS RIGHT,
//   just after RNG ones.
//     baseline                                    4051
//     + the two render fixes, bigrm NOT admitted   4051   (+0 — invisible
//                                                          without the level)
//     + bigrm admitted                             4095   (+44)
// stable property of castle's own generation, not a stale coincidence, and it
// stays out.
//   [REFUTED — this sentence is the wrong conclusion this file exists to warn
//   about.  The -47 was the ARRIVAL path (lspo_drawbridge's raw map coords,
//   goto_level never reading svd.dndest, place_lregion missing
//   put_lregion_here), not castle's generation, and it went -47 -> -3 -> 0 as
//   evidence that the cost is intrinsic; it is only evidence that nothing in
//   the chain the level exercises had landed yet.  See the banner at the head
//   of these blocks.]
// Do NOT re-measure castle again without first closing the RNG
// the induced_align port (js/sp_lev.js, ae1cb942) which moved it to 12999 —
// next blocker `rn2(5) @ m_initinv(makemon.c:644)` vs JS rn2(50), the soldier
// body-armor rounds (makemon.c:637-646) on the castle's garrison.
// Contrast FILL_READY's minefill below, whose parked -60 DID go stale (to 0).
//
// generation chain: m_initinv's mercenary arm, the minotaur's 5.0 rn2(8), the
// long worm's tail, the des-coder leak, find_branch_room, the
// fill_special_room loop on the special-level arm, and squadmon's ROLL_FROM.
// THE COST HAS ALMOST ENTIRELY GONE, BUT IT IS STILL NEGATIVE:
//   castle NOT admitted   4168
// i.e. -47 -> -3.  So the old "stable property of castle's own generation"
// verdict was wrong — the cost was the unported chain, not the level — but
// castle STILL does not pay for itself and stays out under the measure-then-
// is `rn2(10) @ place_lregion(mkmaze.c:396)` at leaf 22802 of 120639
// the level and moved on to mineralize_kelp while C is still placing lregions.
// Close that and re-measure — this is now a near-miss, not a parked negative.
//
// -3 was never castle's own generation — that had already been leaf-exact for a
// while; it was three defects in the ARRIVAL, all outside sp_lev, that only a
// level declaring a teleport_region could expose:
//   1. lspo_drawbridge never called get_location_coord, so castle.lua:81's
//      map-relative (05,08) aimed at absolute (05,08) — off the map, STONE, and
//      create_drawbridge's IS_WALL guard silently declined.  The MOAT square C
//      turns into DRAWBRIDGE_UP stayed water and mineralize() drew one extra
//      water_has_kelp rn2(30).  (Leaf 22802.)
//   2. goto_level inlined `place_lregion(0,0,0,0,...)` for the level-teleport
//      arm instead of calling u_on_rndspot, on the premise that svu.updest /
//      svd.dndest "are always zero"; fixup_special had been filling them in
//      from des.teleport_region all along.  C searched a 10x21 strip, JS the
//      whole 79x21 map.  (Leaf 22803.)  C's do.c:1689-1691 zeroing of the two
//      regions before mklev() was also missing, so a special level's arrival
//      region would have leaked onto the next ordinary level.
//   3. place_lregion had no put_lregion_here: bad_location does not look at
//      monsters, and C re-rolls when a candidate square holds one.  C's third
//      candidate (5,5) held a maze monster; JS took it.  (Leaf 22808.)
// With all three closed the castle's whole generation AND arrival are leaf-exact
//   baseline (no fixes, castle out)       4807
//   three fixes in, castle admitted       4812   (castle itself: EXACTLY 0)
// still gains 2 — and castle's own admission is now cost-NEUTRAL rather than
// negative.  It is admitted on structural faithfulness (TOOLING_PHILOSOPHY #8)
// rooms-and-corridors level where C renders the stronghold, and its first RNG
// divergence stays pinned at leaf 8708 of 120639 (7% in) instead of 22810.
// cost as a property OF THE LEVEL.  It never was.  It was the arrival path that
// only a level declaring a teleport_region exercises.
//
// minend-1/-2/-3, soko2-1/-2, soko3-1/-2, soko4-1/-2, tower2, tower3, medusa-1,
// juiblex and baalz — the block above's "minetn/minend ... are multi-variant, so
// they need the variant-selection path, not just an opcode" is stale: minetn is
// admitted and multi-variant, so that path exists and minend loads through it.
// Only tower1 (js/lua/interp.js:1399), wizard3 and fakewiz1 (both
// js/sp_lev.js:6008) are still BLOCKED, and `rogue` has no dat/rogue.lua at all.
// LOADER_READY now, and the probe's BLOCKED verdict on wizard3/fakewiz1 was an
// artifact of the probe env having no sp_levchn — see the wizard3 note above
// LOADER_READY below.
//
//     minend OUT   6835 / 11405, 27 passing
//                                               coverage 801 -> 799)
// miss and JS renders a rooms-and-corridors level where C renders Mine's End, so
// admitting minend is structurally right — and it buys nothing today because
// (C `rn2(5) @distfleeck(monmove.c:538)` vs JS `rnd(12) @js/dig.js:878`
// mdig_tunnel, i.e. JS tunnels a mines monster C does not), so the level is
// built off a stream that is already wrong.  Close THAT first, then re-admit:
// this is the castle shape exactly (a proto's parked cost measures the unported
// chain around it, not the level), and per that banner the -2 should be
//
// IN, and the paragraph above was HALF right.  The leaf-43164 monmove root was
// closed (m_digweapon_check had a complete port and no call site; commit
// parked cost did not decay.  What made it pay was a SECOND link four leaves
// further down the same level-generation chain: js/m_initweap.js built the
// dwarvish mithril-coat with otyp 129 ("orcish chain mail", IRON) instead of
// 126 (MITHRIL), so every armed dwarf drew four mkobj_erosions leaves C never
// 6836 -> 6862.
// So do not carry forward "a parked negative decays".  Carry forward: a proto's
// parked cost measures THE UNPORTED CHAIN AROUND IT, the number tells you
// nothing about WHICH link is still missing, and re-measuring after closing one
// link is not evidence about the next.  Follow the RNG prefix (rng-prefix-match
// prefixMatch, which is monotone) rather than the admission's score delta.
//
// were tried and REVERTED.  Baseline for every row is the tree at a9544f8f,
//     + medusa                      6869   (-25: the SAME two deltas)
// AND THAT IS THE POINT: read those three rows together.  medusa alone
// reproduces the four-proto loss exactly, which invites the conclusion that the
// other three are free — and they are not, they cost 12 on their own.  ADMISSION
// COSTS DO NOT COMPOSE AND DO NOT SUBTRACT.  These protos all generate levels
// into the same dungeon state, so two admissions can hide each other's loss.
// Never infer one proto's cost by differencing two multi-proto runs; score the
// exact set you intend to ship.  (This is the same trap as the falsified
// "independent roots compose on merge" note, seen from the other side.)
// None of the four is admitted today.  When re-trying, do ONE proto per
// tower1 monster-inventory divergence (C next_ident @mkobj.c:521 at leaf 52757)
// is closed — every one of these levels is currently built off a stream that is
const LOADER_READY = new Set(['tut-1', 'tut-2', 'Arc-strt', 'Hea-strt', 'Tou-strt', 'Tou-loca', 'Tou-goal', 'Sam-strt', 'Bar-strt', 'Val-strt', 'Kni-strt', 'Kni-goal', 'Pri-strt', 'Pri-loca', 'Pri-goal', 'Bar-loca', 'knox', 'fire', 'air', 'oracle', 'valley', 'bigrm', 'castle', 'sanctum', 'asmodeus', 'juiblex', 'baalz', 'fakewiz1', 'fakewiz2', 'wizard1', 'wizard3', 'wizard2', 'orcus', 'minetn', 'minend', 'soko1', 'soko2', 'soko3', 'soko4', 'tower1', 'tower2', 'tower3', 'medusa', 'Wiz-strt', 'Wiz-loca', 'Arc-loca', 'Arc-goal', 'Bar-goal', 'Wiz-goal', 'Cav-goal', 'Cav-loca', 'Cav-strt', 'Hea-goal', 'Hea-loca', 'Kni-loca', 'Mon-goal', 'Mon-loca', 'Mon-strt', 'Ran-goal', 'Ran-loca', 'Ran-strt', 'Rog-goal', 'Rog-loca', 'Rog-strt', 'Sam-goal', 'Sam-loca', 'Val-loca', 'Val-goal', 'astral', 'earth', 'water']);

export function Is_special(uz) {
    return sp_levchn_lookup(uz);
}

/* C dungeon.c:1648-1653 — Can_dig_down(lev).  Invocation_lev(lev) is
 * dungeon.c:2016-2021, In_hell && dlevel == num_dunlevs - 1; js/sp_lev.js:6605
 * forwards here instead of using js/cmd.js's
 * Invocation_lev reading a game.invocation_level nothing ever writes. */
export function Can_dig_down(lev) {
    if (game.level?.flags?.hardfloor)
        return false;
    if (Is_botlevel(lev))
        return false;
    return !Invocation_lev(lev);
}

/* C dungeon.c:1661-1665 — "Like Can_dig_down, but also allows falling through
 * on the stronghold level.  Normally, the bottom level of a dungeon resists
 * both digging and falling." */
export function Can_fall_thru(lev) {
    return Can_dig_down(lev) || Is_stronghold(lev);
}

/* C dungeon.c:2943-2946 — refresh the whole level's overview knowledge
 * before returning the remembered terrain at the requested square.  The
 * refresh also records level annotations while the hero can still see. */
export function update_mapseen_for(x, y) {
    recalc_mapseen_rooms();
    return game.level?.at(x, y)?.lastseentyp | 0;
}

export function update_lastseentyp(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return;
    let ltyp = loc.typ | 0;
    if (ltyp === DRAWBRIDGE_UP)
        ltyp = db_under_typ(loc.drawbridgemask | 0);
    const mtmp = _m_at(x, y);
    if (mtmp && ((mtmp.m_ap_type | 0) & M_AP_TYPMASK) === M_AP_FURNITURE
        && canseemon(mtmp)) {
        ltyp = cmap_to_type(mtmp.mappearance | 0);
    }
    loc.lastseentyp = ltyp;
}

export function depth(uz) {
    const dnum = uz?.dnum ?? 0;
    const dlevel = uz?.dlevel ?? 1;
    const dungeon = game?.dungeons?.[dnum];
    if (!dungeon)
        return dlevel;
    // C returns schar, including its signed-byte conversion.
    return ((dungeon.depth_start + dlevel - 1) << 24) >> 24;
}

/* C dungeon.c:1339 deepest_lev_reached. init_dungeon initializes the reach
 * record; goto_level updates it, including the minimum for upward branches.
 * Saved-level existence and the current location are not reach records. */
export function deepest_lev_reached(noquest) {
    const tmp = { dnum: 0, dlevel: 0 };
    let ret = 0;
    for (let i = 0; i < game._n_dgns; i++) {
        if (noquest && i === game.quest_dnum)
            continue;
        tmp.dlevel = game.dungeons[i].dunlev_ureached;
        if (tmp.dlevel === 0)
            continue;
        tmp.dnum = i;
        if (depth(tmp) > ret)
            ret = depth(tmp);
    }
    return ret;
}

/* C ref: dungeon.c:463-508 insert_branch(new_branch, extract_first) — keep
 * svb.branches sorted by branch_val after one branch's ends change.  Its only
 * caller outside init is mk_knox_portal() (mklev.c:2653), which rebinds the
 * floating Fort Ludios entrance to the current level and re-sorts. */
export function insert_branch(bp, extractFirst) {
    const ar = game._dungeon_branches || (game._dungeon_branches = []);
    if (extractFirst) {
        const ix = ar.indexOf(bp);
        if (ix < 0)
            throw new Error('insert_branch: not found');
        ar.splice(ix, 1);
    }
    insertBranch(ar, bp);
}

/* C ref: dungeon.c:2016-2021 Invocation_lev(d_level *) — In_hell && dlevel ==
 * dunlevs_in_dungeon - 1.  Ported locally for the same reason js/mklev.js's
 * Can_dig_down and js/sp_lev.js:6605 port it locally: js/cmd.js's copy reads a
 * `game.invocation_level` that nothing in js/ ever writes. */
export function Invocation_lev(lev) {
    if (!lev)
        return false;
    const dun = game.dungeons?.[lev.dnum | 0];
    return In_hell(lev) && !!dun && (lev.dlevel | 0) === (dun.num_dunlevs | 0) - 1;
}

/* losexp: LOCAL EMPTY STUB DELETED — see import above. */
/* schedule_goto: LOCAL EMPTY STUB DELETED — see import above. */
/* C dungeon.c:1943 — valley_level is initialized by dungeon generation and
 * mirrored on game for level-teleport callers. */
export function find_hell(lvl) {
    const v = game.valley_level || { dnum: 1, dlevel: 1 };
    if (lvl) {
        lvl.dnum = v.dnum | 0;
        lvl.dlevel = v.dlevel | 0;
    }
    return lvl;
}

export function On_W_tower_level(uz) {
    if (!uz)
        return false;
    const g = game;
    for (const lv of [g.wiz1_level, g.wiz2_level, g.wiz3_level]) {
        /* C ref: dungeon.h:110-126 Lcheck(uz, &wizN_level) = Lassigned(lv) && on_level(uz, lv). */
        if (lv && ((lv.dlevel | 0) || (lv.dnum | 0))
            && (lv.dnum | 0) === (uz.dnum | 0) && (lv.dlevel | 0) === (uz.dlevel | 0))
            return true;
    }
    return false;
}

export function has_ceiling(lev) {
    return !(In_endgame(lev) && !Is_earthlevel(lev));
}

/* C ref: dungeon.c:1197 assign_level(dest, src) —
 *     dest->dnum = src->dnum; dest->dlevel = src->dlevel;
 * There is no exported one in js/; every module that needs it spells the two
 * assignments out.  Kept file-local for the same reason. */
export function assign_level(dst, src) {
    dst.dnum = src.dnum;
    dst.dlevel = src.dlevel;
}

export async function ledger_to_dnum(ledgerno) {
    const dgns = game.dungeons || [];
    for (let i = 0; i < dgns.length; i++) {
        const start = dgns[i]?.ledger_start | 0;
        if (start < ledgerno && ledgerno <= start + (dgns[i]?.num_dunlevs | 0))
            return i;
    }
    await panic(`level number out of range [ledger_to_dnum(${ledgerno})]`);
    return 0;
}

export async function ledger_to_dlev(ledgerno) {
    return ledgerno - (game.dungeons?.[await ledger_to_dnum(ledgerno)]?.ledger_start | 0);
}

function induced_align_slevel() {
    const uz = game.u?.uz;
    if (!uz) return null;
    const chn = game._sp_levchn || [];
    for (let i = 0; i < chn.length; i++) {
        const sl = chn[i];
        if (sl.dlevel.dnum === uz.dnum && sl.dlevel.dlevel === uz.dlevel)
            return sl;
    }
    return null;
}

/* Exported because C's `sp_amask_to_amask(AM_SPLEV_RANDOM)` is reached from
 * TWO places in this port: create_monster/create_altar below, and the
 * themeroom-fill stand-ins in js/nhlib.js (wired through js/mklev.js).  A
 * `des.monster{}` written by a themerms.lua fill takes exactly this path in C
 * — sp_lev.c:1943 calls sp_amask_to_amask unconditionally — so the fill must
 * consume this draw, not a hand-rolled rn2(3). */
export function induced_align(pct) {
    const lev = induced_align_slevel();
    if (lev && lev.flags && lev.flags.align)
        if (rn2(100) < pct)
            /* C returns lev->flags.align RAW (dungeon.c:2006) — it is already
             * an AM_* mask, since init_level stores (flags & D_ALIGN_MASK) >> 4
             * and D_ALIGN_<x> == (AM_<x> << 4).  No Align2amask here. */
            return lev.flags.align;
    /* C dungeon.c:2008-2010 — `if (svd.dungeons[u.uz.dnum].flags.align)`
     * (populated with C's 3-bit Bitfield(align, 3) truncation at dungeon_rng.js:380). */
    const dgn = game.dungeons?.[game.u?.uz?.dnum | 0];
    if (dgn?.flags?.align)
        if (rn2(100) < pct)
            return dgn.flags.align;
    const al = rn2(3) - 1;
    return Align2amask(al);
}

/* C ref: dungeon.c:299-307 find_level(s) — scan svs.sp_levchn for the s_level
 * whose proto matches `s`, case-insensitively; returns NULL when there is none.
 * No RNG, no state change.  game._sp_levchn is the JS sp_levchn (built by
 * js/dungeon_rng.js); js/mklev.js's sp_levchn_lookup() is the by-d_level
 * counterpart of this by-name scan. */
export function find_level(s) {
    const chn = game._sp_levchn || [];
    const want = String(s ?? '').toLowerCase();
    for (let i = 0; i < chn.length; i++)
        if (String(chn[i].proto ?? '').toLowerCase() === want)
            return chn[i];
    return null;
}

/* Ported helpers not yet imported locally — local stubs/fallbacks */
/* cansee: the LOCAL `return true` STUB IS DELETED.  It shadowed the real
 * C-faithful body at js/vision.js:1004 (`viz_array[y][x] & IN_SIGHT`) for the
 * three muse.c visibility reads below (use_defensive / use_misc / MUSE_POLY_TRAP),
 * so every one of them believed the monster's square was in sight and printed
 * messages C suppresses.  This file already imports from './vision.js'. */
export function Can_rise_up(x, y, uz) {
    /* C dungeon.c:1675 — stairway_find_special_dir(FALSE) */
    const stway = stairway_find_special_dir(false);
    const wiz1 = game.wiz1_level;
    const isWiz1 = !!(wiz1 && uz && ((wiz1.dlevel | 0) || (wiz1.dnum | 0))
        && (uz.dnum | 0) === (wiz1.dnum | 0) && (uz.dlevel | 0) === (wiz1.dlevel | 0));
    if (!uz || In_endgame(uz) || In_sokoban(uz)
        || (isWiz1 && In_W_tower_wz(x, y, uz)))
        return false;
    const dgn = game.dungeons?.[uz.dnum | 0];
    if ((uz.dlevel | 0) > 1)
        return true;
    /* A branch whose entry level is one can rise only when the special
       inter-dungeon upstairs exists and this is not ledger level one. */
    return !!(dgn && (dgn.entry_lev | 0) === 1 && ledger_no(uz) !== 1
              && stway && stway.up);
}

/* C ref: dungeon.c:2571 donamelevel() — the `#annotate' command and
 * docallcmd's 'a' arm.
 *   if (iflags.menu_requested) return dooverview();
 *   query_annotation((d_level *) 0);
 *   return ECMD_OK;
 * iflags.menu_requested is the 'm' prefix. */
export async function donamelevel() {
    if (game.iflags?.menu_requested) return await dooverview();
    await query_annotation(null);
    return ECMD_OK;
}

async function query_annotation(lev) {
    const g = game;
    const u = g.u || {};
    const tgt = lev || u.uz || { dnum: 0, dlevel: 1 };
    // C dungeon.c:2506: annotations belong only to existing mapseen records.
    if (!(g._mapseen_entries || []).some(entry => on_level(entry, tgt))) return;
    const key = `${tgt.dnum | 0}:${tgt.dlevel | 0}`;
    g._level_custom = g._level_custom || {};
    const cur = g._level_custom[key];
    let nbuf;
    if (cur) {
        /* C dungeon.c:2519-2523 (the !EDIT_GETLIN arm this build compiles). */
        nbuf = await getlin(`Replace annotation "${String(cur).slice(0, 30)}${String(cur).length > 30 ? '...' : ''}" with?`);
    } else {
        // C dungeon.c:2527-2544: describe a selected remote level.
        const here = !lev || on_level(u.uz, lev);
        const label = here ? 'this dungeon level'
            : describe_level_buf(tgt.dnum === u.uz.dnum ? 0 : 2, tgt).replace('Dlvl:', 'level ').trim();
        nbuf = await getlin(`What do you want to call ${label}?`);
    }
    /* empty input or ESC means don't add or change annotation;
       space-only means discard current annotation without adding new one */
    if (!nbuf || nbuf[0] === '\x1b')
        return;
    const munged = mungspaces(nbuf);
    delete g._level_custom[key];
    if (munged && munged !== ' ')
        g._level_custom[key] = munged;
}

// C ref: dungeon.c:1802 get_level(newlevel, levnum) — map a logical depth to a d_level struct.
// Accepts both C's two-argument out-param form get_level(out, levnum) and the
// one-argument return-value form get_level(levnum).
export function get_level(arg1, arg2) {
    const hasOut = typeof arg1 === 'object' && arg1 !== null && arguments.length >= 2;
    const out = hasOut ? arg1 : {};
    const newlev = hasOut ? arg2 : arg1;
    const g = game;
    const u = g.u || {};
    const dgn0 = u.uz?.dnum ?? 0;
    const dungeons = g.dungeons || [];
    // C dungeon.c:1805 — dgn = u.uz.dnum
    let dgn = dgn0;
    if (newlev <= 0) {
        // C: can only happen in endgame — use current dlevel
        out.dnum = dgn;
        out.dlevel = u.uz?.dlevel ?? 1;
        return out;
    }
    // C dungeon.c:1810 — if newlev > depth_start + num_dunlevs - 1: clamp to last level
    const dg = dungeons[dgn] || { depth_start: 1, num_dunlevs: 30 };
    if (newlev > (dg.depth_start + dg.num_dunlevs - 1)) {
        out.dnum = dgn;
        out.dlevel = dg.num_dunlevs;
        return out;
    }
    // C dungeon.c:1821 — if levnum < depth_start, branch up the tree
    if (newlev < dg.depth_start) {
        // Walk up via svb.branches (end2 is always the child)
        const branches = g._dungeon_branches || g.branches || [];
        let safety = 20;
        while (newlev < (dungeons[dgn]?.depth_start ?? 1) && safety-- > 0) {
            let found = false;
            for (const br of branches) {
                if ((br.end2?.dnum ?? -1) === dgn) {
                    dgn = br.end1.dnum;
                    found = true;
                    break;
                }
            }
            if (!found) throw new Error("get_level: can't find parent dungeon");
        }
    }
    // C dungeon.c:1840 — levnum = levnum - depth_start + 1
    const finalDg = dungeons[dgn] || { depth_start: 1 };
    const dlevel = newlev - finalDg.depth_start + 1;
    out.dnum = dgn;
    out.dlevel = dlevel;
    return out;
}

// C ref: dungeon.c:2263-2286 print_branch(win, dnum, lower_bound, upper_bound, bymenu, lchoices_p).
export function print_branch(win, dnum, lower_bound, upper_bound, bymenu, lchoices_p, branches, dungeonsFull, end1_dnum) {
    for (const br of branches) {
        const brDnum = end1_dnum ? end1_dnum(br) : (br.end1.dnum | 0);
        if (brDnum === dnum && lower_bound < (br.end1.dlevel | 0) && (br.end1.dlevel | 0) <= upper_bound) {
            const dnameEnd2 = (dungeonsFull[br.end2.dnum] || {}).dname || '';
            const buf = `${bymenu ? _pd_chr_u_on_lvl(br.end1) : ' '} ${_pd_br_string(br.type)} to ${dnameEnd2}: ${_pd_depth(br.end1, dungeonsFull)}`;
            if (bymenu)
                lchoices_p(buf, br.end1, _pd_unreachable_level(br.end1, false));
            else
                putstr(win, 0, buf);
        }
    }
}

// C ref: dungeon.c:2098-2173 lev_by_name(), including annotation and branch lookup.
export function lev_by_name(nam) {
    const g = game, uz = g.u.uz, dungeons = g._dungeons_full || g.dungeons;
    const visited = lev => !!(g.level_info?.[ledger_no_cmd(lev)]?.flags & VISITED);
    const inBranch = lev => lev.dnum === uz.dnum
        || (uz.dnum === g.valley_level?.dnum && lev.dnum === g.medusa_level?.dnum)
        || (uz.dnum === g.medusa_level?.dnum && lev.dnum === g.valley_level?.dnum);
    nam = nam.toLowerCase();
    const annotations = Object.entries(g._level_custom || {}).map(([key, text]) => {
        const [dnum, dlevel] = key.split(':').map(Number);
        return { dnum, dlevel, text };
    }).sort((a, b) => a.dnum - b.dnum || a.dlevel - b.dlevel);
    let dlev = annotations.find(lev => lev.text && lev.text.toLowerCase() === nam);
    if (!dlev) {
        nam = nam.replace(/^the /, '');
        if (nam.endsWith(' level') && nam.indexOf(' level') === nam.length - 6) nam = nam.slice(0, -6);
        if (nam === 'gehennom' || nam === 'hell')
            nam = uz.dnum === g.tower_dnum ? " to Vlad's tower".toLowerCase() : 'valley';
        else if (nam === 'delphi') nam = 'oracle';
        dlev = (g._sp_levchn || []).find(lev => lev.proto.toLowerCase() === nam)?.dlevel;
    }
    if (dlev) return inBranch(dlev) && (wizard() || visited(dlev)) ? depth(dlev) : 0;
    const findBranch = name => (g._dungeon_branches || []).find(br => {
        const dname = dungeons[br.end2.dnum].dname.toLowerCase();
        return dname === name || (dname.startsWith('the ') && dname.slice(4) === name);
    });
    let br = findBranch(nam);
    const to = nam.indexOf(' to ');
    if (!br && to >= 0) br = findBranch(nam.slice(to + 4));
    if (!br || (!wizard() && !(visited(br.end1) && visited(br.end2)))) return 0;
    dlev = br.end1.dnum === uz.dnum ? br.end1 : br.end2;
    return inBranch(dlev) ? depth(dlev) : 0;
}

export async function dooverview() {
    const g = game;
    await show_overview(g.iflags?.menu_requested ? -1 : 0, 0);
    if (g.iflags) g.iflags.menu_requested = false;
    /* C dungeon.c:3297-3301 preserves messages from the dismissal's docrt()
     * (wintty.c:978), including vision_recalc()'s monster notices. */
    await flush_screen(1);
    /* C: this handler returns ECMD_OK on every path; rhack() maps it. */
    return ECMD_OK;
}

export function surface(x, y) {
    const u = game.u || {};
    const lev = game.level && game.level.at ? game.level.at(x, y) : null;
    /* C dungeon.c:1753 / rm.h:133: use the terrain beneath a raised bridge. */
    const typ = _surface_at_typ(x, y);
    /* C dungeon.c:1751-1756 swallowed-hero arm */
    if (x === (u.ux | 0) && y === (u.uy | 0) && u.uswallow && u.ustuck
        && _is_animal_local(u.ustuck.data))
        return _digests(u.ustuck.data) ? 'maw'
             : _enfolds_local(u.ustuck.data) ? 'husk' : 'nonesuch';
    /* C dungeon.c:1760-1762 */
    if (IS_AIR(typ))
        return Is_waterlevel(u.uz) ? 'air bubble' : (typ === CLOUD) ? 'cloud' : 'air';
    /* C dungeon.c:1759-1761 */
    if (is_pool(x, y))
        return (Underwater() && !Is_waterlevel(u.uz)) ? 'bottom' : hliquid('water');
    /* C dungeon.c:1762-1763 */
    if (is_ice(x, y))
        return 'ice';
    /* C dungeon.c:1764-1765 */
    if (is_lava(x, y))
        return hliquid('lava');
    /* C dungeon.c:1766-1767 */
    if (lev && lev.typ === DRAWBRIDGE_DOWN)
        return 'bridge';
    /* C dungeon.c:1768-1775 */
    if (IS_ALTAR(typ))
        return 'altar';
    if (IS_GRAVE(typ))
        return 'headstone';
    if (IS_FOUNTAIN(typ))
        return 'fountain';
    if (On_stairs(x, y))
        return 'stairs';
    /* C dungeon.c:1776-1779 */
    if (IS_WALL(typ) || typ === SDOOR)
        return 'wall'; /* 'surface' during Passes_walls */
    if (IS_DOOR(typ))
        return 'doorway'; /* even for closed door */
    if (typ >= ROOM && !Is_earthlevel(u.uz))
        return 'floor';
    return 'ground';
}

/* Exported for js/trap.js's trapeffect_rocktrap HERO arm (C trap.c:1334/:1346
 * `the(ceiling(u.ux, u.uy))`), which would otherwise have to twin this body. */
export function ceiling(x, y) {
    const lev = game.level && game.level.at ? game.level.at(x, y) : null;
    const typ = lev ? (lev.typ | 0) : 0;
    /* C dungeon.c:1722 tests `*in_rooms(x, y, VAULT)` — the FIRST
     * CHARACTER of the returned room-letter string, not the pointer, so "no
     * such room here" (an empty string) is false.  js/mklev.js:in_rooms returns
     * an ARRAY, and an empty array is TRUTHY in JS: testing the call directly
     * would make every ceiling a vault's.  Test the first element, matching C's
     * dereference.
     * (GAP CLOSED: js/mklev.js's in_rooms was itself `return []`, so all three
     * room arms were permanently false and a vault/temple/shop ceiling read as
     * a plain "ceiling".  mklev.js now re-exports js/shk.js's real body.)
     * RNG on this path: none — in_rooms and all of ceiling() are RNG-free. */
    const _room_here = (rtype) => {
        const r = in_rooms(x, y, rtype);
        return !!(r && r.length && r[0]);
    };
    if (_room_here(VAULT))
        return "vault's ceiling";
    if (_room_here(TEMPLE))
        return "temple's ceiling";
    if (_room_here(SHOPBASE))
        return "shop's ceiling";
    const uz = game.u ? game.u.uz : null;
    /* C dungeon.c:1728-1730: water plane has no surface */
    if (Is_waterlevel(uz))
        return 'water above';
    /* C dungeon.c:1731-1732 */
    if (IS_AIR(typ))
        return 'sky';
    /* C dungeon.c:1733-1734 */
    if (Is_firelevel_cmd(uz))
        return 'flames above';
    /* C dungeon.c:1735-1737 */
    if (In_quest(uz))
        return 'expanse above';
    /* C dungeon.c:1738-1739 */
    if (Underwater())
        return "water's surface";
    /* C dungeon.c:1740-1742 */
    if ((typ >= ROOM && !Is_earthlevel(uz)) || IS_WALL(typ) || IS_DOOR(typ) || typ === SDOOR)
        return 'ceiling';
    /* C dungeon.c:1743-1744 */
    return 'rock cavern';
}

/* C dungeon.c:2873 OF_INTEREST(feat) — "returns true if this level has
 * something interesting to print out".  The water/ice/lava terms are `#if 0`
 * in the reference build and are omitted here for the same reason. */
function _of_interest(f) {
    return !!(f.nfount || f.nsink || f.nthrone || f.naltar
              || f.ngrave || f.ntree || f.nshop || f.ntemple);
}

/* C dungeon.c:3462 seen_string(x, obj) — "players are computer scientists:
 * 0, 1, 2, n".  `vowels` is decl.c's "aeiouAEIOU". */
function _seen_string(x, obj) {
    switch (x | 0) {
    case 0: return 'no';
    case 1: return 'aeiouAEIOU'.includes(obj.charAt(0)) ? 'an' : 'a';
    case 2: return 'some';
    case 3: return 'many';
    }
    return '(unknown)';
}

export async function show_overview(why, reason) {
    const g = game;
    const u = g.u || {};
    const uz = u.uz || { dnum: 0, dlevel: 1 };
    const dungeons = g.dungeons || [];
    /* C dungeon.c:3354 traverses the chain populated by init_mapseen(),
     * including every duplicate and levels whose level files were discarded. */
    const seen = g._mapseen_entries || [];
    // C dungeon.c:3322-3326: visit the planes first when in the endgame;
    // only final disclosure also visits the rest of the dungeon then.
    const inEndgame = In_endgame(uz);
    const overviewLevels = seen.filter((lev) => In_endgame(lev)
        ? inEndgame : (why > 0 || !inEndgame));
    overviewLevels.sort((a, b) => Number(In_endgame(b)) - Number(In_endgame(a))
        || (a.dnum - b.dnum) || (a.dlevel - b.dlevel));

    /* C dungeon.c:3288 / :3316 — both dooverview() and show_overview() open with
     * recalc_mapseen().  Its feature pass is _mapseen_feat() below (computed on
     * demand, per level); its room pass has to run here, while the hero is still
     * standing on the level u.urooms describes. */
    recalc_mapseen_rooms();
    const TAB = '   ', PREFIX = '      ';   /* dungeon.c:3479/3485 */
    const lines = [];
    const levelRows = new Map(), headingRows = new Map();
    let lastdun = -1;
    for (const lev of overviewLevels) {
        const dgn = dungeons[lev.dnum] || {};
        /* C dungeon.c:3532-3536 — the quest and knox are shown as level 1. */
        const depthstart = (lev.dnum === g.quest_dnum || lev.dnum === g.knox_level?.dnum)
            ? 1 : (dgn.depth_start | 0);
        const on_this = ((uz.dnum | 0) === lev.dnum && (uz.dlevel | 0) === lev.dlevel);
        /* C dungeon.c:3573-3574 — the #annotate string, read below as well. */
        // C find_mapseen (dungeon.c:2640) updates only the first record;
        // later records retain their zeroed features and annotations.
        const levelKey = lev.duplicate ? '' : `${lev.dnum | 0}:${lev.dlevel | 0}`;
        const custom = game._level_custom?.[levelKey];
        /* C dungeon.c:3589 — the level's remembered feature counts, needed BOTH
         * by interest_mapseen (dungeon.c:2916 OF_INTEREST) and by the summary
         * line below, so compute once. */
        const feat = lev.duplicate ? {} : _mapseen_feat(lev.dnum, lev.dlevel);
        const questSummons = game._level_quest_summons?.[levelKey];
        const sokoLevel = In_sokoban(lev);
        const sokoSolved = !!game._level_soko_solved?.[levelKey];
        const bigroomLevel = !!game._level_bigroom?.[levelKey];
        const rogueLevel = !!game._level_roguelevel?.[levelKey];
        /* C dungeon.c:3205-3208,3274: mapping the altar or entering the
         * tended temple permanently recognizes the Valley. */
        const valleyLevel = !!g._level_valley?.[levelKey];
        const msanctumLevel = !!g._level_msanctum?.[levelKey];
        const vibratingSquareLevel = !!g._level_vibrating_square?.[levelKey];
        const _inTutorial = (dnum) => (g.tutorial_dnum != null
                                       && (dnum | 0) === (g.tutorial_dnum | 0));
        if (why === 0 && !on_this) {
            if (mapseen_notreachable(lev)) continue; // dungeon.c:2883
            let _keep;
            if (_inTutorial(uz.dnum)) {
                _keep = _inTutorial(lev.dnum);
            } else if (_inTutorial(lev.dnum)) {
                _keep = false;
            } else if (inEndgame) {
                // C dungeon.c:2912: all visited endgame levels are of interest.
                _keep = In_endgame(lev);
            } else {
                _keep = !!(_of_interest(feat)
                           || bigroomLevel
                           || rogueLevel
                           || feat.castle
                           || valleyLevel
                           || msanctumLevel
                           || vibratingSquareLevel
                           || questSummons
                           || (sokoLevel && (In_sokoban(uz) || !sokoSolved))
                           || custom
                           /* C dungeon.c:2918 `|| mptr->br` — a level with a
                            * recorded branch connection is of interest. */
                           || (!lev.duplicate && lev.br)
                           || lev.dlevel === dgn.dunlev_ureached);
            }
            if (!_keep)
                continue;
        }
        if (lev.dnum !== lastdun) {
            lastdun = lev.dnum;
            const entry_lev = (dgn.entry_lev | 0) || 1;
            const ureached = dgn.dunlev_ureached;
            const hdr = (ureached === entry_lev || In_endgame(lev))
                ? `${dgn.dname}:`
                : builds_up(lev)
                    ? `${dgn.dname}: levels ${depthstart + entry_lev - 1} up to ${depthstart + ureached - 1}`
                    : `${dgn.dname}: levels ${depthstart} to ${depthstart + ureached - 1}`;
            headingRows.set(lines.length, hdr);
            lines.push((why <= 0) ? menu_heading_text(hdr) : hdr);
        }
        // C dungeon.c:3557-3563: name planes instead of negative level numbers.
        const levelDepth = depthstart + lev.dlevel - 1;
        const levelName = In_endgame(lev) ? endgamelevelname(levelDepth)
            : `Level ${levelDepth}`;
        let buf = `${why !== -1 ? TAB : ''}${levelName}:`;
        if (wizard()) {
            const slev = sp_levchn_lookup({ dnum: lev.dnum, dlevel: lev.dlevel });
            if (slev)
                buf += ` [${slev.proto}]`;
        }
        if (custom)
            buf += ` "${custom}"`;
        if (on_this)
            buf += ` <- You ${(why <= 0 || (why === 1 && reason === ASCENDED)) ? 'are'
            : (why === 1 && reason === ESCAPED) ? 'left from' : 'were'} here.`; /* dungeon.c:3575-3578 */
        levelRows.set(lines.length, lev);
        lines.push(buf);
        if (_of_interest(feat)) {
            let fbuf = '';
            let i = 0;                                  /* C's interest counter */
            /* C dungeon.c:3487 `#define COMMA (i++ > 0 ? ", " : PREFIX)`. */
            const COMMA = () => (i++ > 0 ? ', ' : PREFIX);
            /* C dungeon.c:3494 ADDNTOBUF(nam, var). */
            const ADDNTOBUF = (nam, v) => {
                if (v)
                    fbuf += `${COMMA()}${_seen_string(v, nam)} ${nam}${plur(v)}`;
            };
            /* C dungeon.c:3597-3603 — a single shop prints `an(shop_string())`
             * rather than the counted form. */
            if (feat.nshop > 0) {
                if (feat.nshop > 1)
                    ADDNTOBUF('shop', feat.nshop);
                else
                    fbuf += `${COMMA()}${an(shop_string(feat.shoptype))}`;
            }
            if (feat.naltar > 0 || feat.ntemple > 0) {
                /* C dungeon.c:3611 ADD2NTOBUF("temple", ntemple, "altar", naltar). */
                if (feat.ntemple && feat.naltar) {
                    fbuf += `${COMMA()}${_seen_string(feat.ntemple, 'temple')} temple${plur(feat.ntemple)}`
                          + ` and ${_seen_string(feat.naltar, 'altar')} altar${plur(feat.naltar)}`;
                } else if (feat.ntemple) {
                    ADDNTOBUF('temple', feat.ntemple);
                } else {
                    ADDNTOBUF('altar', feat.naltar);
                }
                /* C dungeon.c:3615-3618 — "only print out altar's god if they
                 * are all to your god".  Msa2amask(): 1,2,3 -> 1,2,4. */
                const atmp = (feat.msalign === 3) ? 4 : feat.msalign;
                if (Amask2align(atmp) === (u.ualign?.type | 0))
                    fbuf += ` to ${align_gname(u.ualign?.type | 0)}`;
            }
            ADDNTOBUF('throne', feat.nthrone);
            ADDNTOBUF('fountain', feat.nfount);
            ADDNTOBUF('sink', feat.nsink);
            ADDNTOBUF('grave', feat.ngrave);
            ADDNTOBUF('tree', feat.ntree);
            /* C dungeon.c:3627-3631 — capitalize the first character after
             * PREFIX, then terminate the sentence with '.'. */
            fbuf = fbuf.slice(0, PREFIX.length)
                 + fbuf.charAt(PREFIX.length).toUpperCase()
                 + fbuf.slice(PREFIX.length + 1) + '.';
            lines.push(fbuf);
        }
        if (feat.oracle)
            lines.push(`${PREFIX}Oracle of Delphi.`);
        /* C dungeon.c:3642-3645 — Sokoban's annotation is part of the
         * mutually-exclusive mapseen block and precedes quest_summons. */
        else if (sokoLevel)
            lines.push(`${PREFIX}${sokoSolved ? 'Solved' : 'Unsolved'}.`);
        else if (bigroomLevel)
            lines.push(`${PREFIX}A very big room.`);
        /* C dungeon.c:3647-3648 */
        else if (rogueLevel)
            lines.push(`${PREFIX}A primitive area.`);
        /* C dungeon.c:3649-3656 — quest-home and its reachability suffix. */
        else if (on_level(lev, game.qstart_level)) {
            if (u.uevent?.qcompleted)
                lines.push(`${PREFIX}Completed quest for ${ldrname()}.`);
            else if (!lev.duplicate && game.quest_status?.got_quest)
                lines.push(`${PREFIX}Given quest by ${ldrname()}.`);
            else
                lines.push(`${PREFIX}Home${mapseen_notreachable(lev) ? ' (no way back...)' : ''}.`);
        }
        /* C dungeon.c:3657-3661 */
        else if (feat.ludios)
            lines.push(`${PREFIX}Fort Ludios.`);
        /* C dungeon.c:3664-3665 */
        else if (feat.castle) {
            /* C dungeon.c:3661-3663 + tunesuffix (:3459-3474) */
            let tsuf = '';
            if (feat.castletune && u.uevent?.uheard_tune) {
                const tmp = u.uevent.uheard_tune === 2 ? `notes "${g._tune}"` : '5-note tune';
                tsuf = ` (play ${tmp} to open or close drawbridge)`;
            }
            lines.push(`${PREFIX}The castle${tsuf}.`);
        }
        else if (valleyLevel)
            lines.push(`${PREFIX}Valley of the Dead.`);
        /* C dungeon.c:3666-3670 */
        else if (vibratingSquareLevel)
            lines.push(`${PREFIX}Gateway to Moloch's Sanctum.`);
        else if (msanctumLevel)
            lines.push(`${PREFIX}Moloch's Sanctum.`);
        /* C dungeon.c:3122-3129 / :3671-3679 — recalc_mapseen() marks the
         * mapseen entry for the current quest entrance while the quest is
         * active, and print_mapseen() emits this annotation immediately
         * before the branch rows.  The port keeps this mapseen flag in a
         * per-level side table, updated by recalc_mapseen_rooms(). */
        if (questSummons)
            lines.push(`${PREFIX}Summoned by ${ldrname()}.`);
        const br = lev.duplicate ? null : lev.br;
        if (br) {
            let bbuf = `${PREFIX}${br_string2(br)} to ${dungeons[br.end2.dnum | 0]?.dname}`;
            /* C: "Since mapseen objects are printed out in increasing order of
             * dlevel, clarify which level this branch is going to if the branch
             * goes upwards.  Unless it's the end game." */
            if (br.end1_up && !In_endgame(br.end2))
                bbuf += `, level ${depth(br.end2)}`;
            lines.push(`${bbuf}.`);
        }
        /* C dungeon.c:3696 — `mptr->final_resting_place || final > 0`, and with
         * no bones on the level kncnt is 1 exactly when the hero died here, so
         * the block prints only for the death level. */
        const died_here = why === 2 && on_this;
        /* C dungeon.c:3240-3259 (recalc_mapseen) — past deaths become known
         * once the hero has seen the map location where each one died.  Only
         * the current level's bonesinfo is modelled here. */
        /* The mapseen clone of a left level's bonesinfo is read from the
         * savelev snapshot (game.levelStore), as _mapseen_feat does; bonesknown
         * is tracked in a local set so the level's own chain is not mutated. */
        const bmap = lev.duplicate ? null : on_this ? g.level
            : _mapseen_level((g.dungeons?.[lev.dnum]?.ledger_start | 0) + lev.dlevel);
        const known = new Set();
        for (let bp = bmap?.bonesinfo; bp; bp = bp.next)
            if (bmap.at(bp.frpx, bp.frpy)?.lastseentyp || bp.bonesknown)
                known.add(bp);
        const bones = [];
        for (let bp = bmap?.bonesinfo; bp; bp = bp.next)
            if (known.has(bp) || wizard() || why > 0) bones.push(bp);
        let kncnt = (died_here ? 1 : 0) + bones.length;
        if (kncnt) {
            lines.push(`${PREFIX}Final resting place for`);
            if (died_here) {
                let tmpbuf = formatkiller('', 256 /* sizeof tmpbuf, BUFSZ */, reason, true);
                /* C: the four strsubst() calls re-point a reflexive killer at "you";
                 * none of them can fire on a KILLED_BY environment death. */
                tmpbuf = tmpbuf.replace(' himself', ' yourself').replace(' herself', ' yourself')
                               .replace(' his ', ' your ').replace(' her ', ' your ');
                lines.push(`${PREFIX}${TAB}you, ${tmpbuf}${--kncnt ? ',' : '.'}`);
            }
            /* C dungeon.c:3698-3722 — all but the last line end in ','. */
            for (const bp of bones)
                lines.push(`${PREFIX}${TAB}${bp.who}, ${bp.how}${--kncnt ? ',' : '.'}`);
        }
    }
    /* C wintty.c:1927 — `!iflags.menu_overlay` drops the NHW_MENU to offx 0. */
    const ovNoOverlay = g.iflags?.menu_overlay === false || g.iflags?.menu_overlay === 0;
    // C dungeon.c:3581-3584,3328-3338: selectable levels for the 'm' prefix.
    if (why === -1) {
        const menu = new TtyMenu({ overlay: lines.length + 1 < 24 && !ovNoOverlay });
        for (let i = 0; i < lines.length; ++i) {
            if (headingRows.has(i)) menu.add_menu_heading(headingRows.get(i));
            else menu.add_menu(levelRows.has(i) ? i + 1 : 0, 0, 0, lines[i]);
        }
        menu.end_menu(null);
        const { count, picks } = await menu.select_menu(PICK_ONE);
        if (count > 0) await query_annotation(levelRows.get(picks[0] - 1));
        return;
    }
    /* C dungeon.c:3328-3338 / wintty.c process_menu_window: a PICK_NONE overview
     * whose lines (plus the footer) overrun the terminal is PAGED ("(1 of 2)"),
     * which the one-page overlay below cannot draw.  Use the shared tty menu. */
    if (lines.length + 1 > 23 || ovNoOverlay) {
        const menu = new TtyMenu({ overlay: false });
        for (let i = 0; i < lines.length; ++i) {
            if (headingRows.has(i)) menu.add_menu_heading(headingRows.get(i));
            else menu.add_menu(0, 0, 0, lines[i]);
        }
        menu.end_menu(null);
        await menu.select_menu(PICK_NONE);
        return;
    }
    /* C windows.c:1803-1807 add_menu(): MENUCOLOR colours each non-heading
     * entry; the heading keeps its inverse attribute only. */
    for (let i = 0; i < lines.length; ++i)
        if (!headingRows.has(i)) lines[i] = menucolor_text(lines[i]);
    lines.push('(end)');
    /* C win/tty/wintty.c:1926-1932: a menu whose maxrow reaches the
     * terminal height is full-screen.  `lines` includes the `(end)` row,
     * exactly matching tty_end_menu's maxrow = nitems + 1. */
    /* wintty.c:1925-1928: `!iflags.menu_overlay` also forces offx 0 + clear. */
    const ovFull = lines.length >= 24 || g.iflags?.menu_overlay === false
        || g.iflags?.menu_overlay === 0;
    const WIN_COL = ovFull ? 1 : tty_window_offx(lines, 'end');
    const showOverviewMenu = async () => {
        g._screen_output = build_window_screen(lines, WIN_COL, u.uac ?? 0,
                                               undefined, undefined, ovFull || WIN_COL === 1);
        set_cursor(WIN_COL + '(end)'.length + 1, lines.length - 1);
    };
    await showOverviewMenu();
    /* C dungeon.c:3328: ordinary overview/disclosure uses PICK_NONE.
     * The selectable 'm' form is handled above by the shared tty menu. */
    await await_menu_key(showOverviewMenu, '', '', PICK_NONE);
    /* C wintty.c:966-983 erase_menu_or_text(): offx == 0 uses docrt()
     * and flush_screen(1); a corner overlay uses docorner(). */
    if (ovFull || WIN_COL === 1) {
        await docrt();
        /* docrt's seen-stone row-20 blanks precede the botlx bot() that
         * rewrites status row 1, so they do not wipe it (same ordering as
         * _dismissMenu / status_r1_menu_docrt). */
        status_r1_menu_docrt();
        g._r1botAfterMap = g.level;
        g._r1textOver = true;
        await flush_screen(1);
    } else {
        /* C wintty.c:982: docorner(offx, maxrow + 1, 0) clears the
         * covered rows before row_refresh repaints their buffered glyphs. */
        docorner_blank_utf8_captures(WIN_COL - 1, lines.length + 1);
        /* wintty.c:3714-3719: a corner that reached the status rows ends
         *     disp.botlx = TRUE; bot();
         * but this runs inside select_menu (dungeon.c:3328), whose
         * gb.bot_disabled (windows.c:1861) makes that bot() return before
         * clearing botlx (botl.c:255).  The status repaint waits for the next
         * flush_screen -- at final disclosure, the "Save bones?" prompt, after
         * finish_paybill's drop_upon_death has emptied the pack. */
        if (lines.length + 1 >= (_threeStatusLines() ? 21 : 22)) {
            const savedBotDisabled = g._bot_disabled;
            g._bot_disabled = true;
            try {
                g.disp.botlx = 1;
                await bot();
            } finally {
                g._bot_disabled = savedBotDisabled;
            }
        }
    }
}

export function room_discovered(roomno) {
    const uz = game.u?.uz;
    if (!uz || (roomno | 0) < 0)
        return;
    const ms = msrooms_of(uz.dnum, uz.dlevel);
    const r = (ms[roomno | 0] = ms[roomno | 0] || { seen: 0, untended: 0 });
    if (!r.seen) {
        r.seen = 1;
        recalc_mapseen_rooms();   /* C: recalc_mapseen() */
    }
}

/* C dungeon.c:3388-3405 br_string2(br) — the branch line's leading noun. */
function br_string2(br) {
    const BR_STAIR = 0, BR_NO_END1 = 1, BR_NO_END2 = 2, BR_PORTAL = 3;
    /* C: "Special case: quest portal says closed if kicked from quest" */
    const closed_portal = ((br.end2.dnum | 0) === (game.quest_dnum | 0)
                           && !!game.u?.uevent?.qexpelled);
    switch (br.type | 0) {
    case BR_PORTAL:  return closed_portal ? 'Sealed portal' : 'Portal';
    case BR_NO_END1: return 'Connection';
    case BR_NO_END2: return br.end1_up ? 'One way stairs up' : 'One way stairs down';
    case BR_STAIR:   return br.end1_up ? 'Stairs up' : 'Stairs down';
    }
    return '(unknown)';
}

/* C ref: dungeon.c:2500 query_annotation(lev) — prompt for and store the
 * current level's annotation, or a remote one selected by the overview menu.
 *
 * STORAGE: C keeps the string on the level's `mapseen` record (mptr->custom).
 * JS stores that text on game._level_custom, keyed by "<dnum>:<dlevel>".
 * RNG-free. */
export async function print_level_annotation() {
    const g = game;
    const uz = (g.u && g.u.uz) || { dnum: 0, dlevel: 1 };
    const key = `${uz.dnum | 0}:${uz.dlevel | 0}`;
    const annotation = g._level_custom && g._level_custom[key];
    if (annotation)
        await pline(`You remember this level as ${annotation}.`);
}

// C ref: dungeon.c:1497 next_level(at_stairs) — compute the destination level
// and call goto_level.  For an in-dungeon downstair (at_stairs && stway) the
// destination is stway->tolev; otherwise (trap door / hole) it's dlevel+1.
export async function next_level(at_stairs) {
    const g = game;
    const u = g.u || {};
    const stway = stairway_at(u.ux, u.uy);
    if (at_stairs && stway) {
        stway.u_traversed = true;
        const newlevel = { dnum: stway.tolev.dnum | 0, dlevel: stway.tolev.dlevel | 0 };
        await goto_level(newlevel, at_stairs, false, false);
    }
    else {
        const newlevel = { dnum: u.uz?.dnum | 0, dlevel: (u.uz?.dlevel | 0) + 1 };
        await goto_level(newlevel, at_stairs, !at_stairs, false);
    }
}

// C ref: dungeon.c:1518 prev_level(at_stairs) — the mirror of next_level for an
// UPWARD transition.  Was `function prev_level(at_ladder) { }` — an EMPTY body
// in this file's "stubs for unported helpers used by doup" block — so doup()
// walked the whole C ladder (u_rooted, climb_pit, stairway_at, stucksteed,
// near_capacity, the no-return prompt, next_to_u) and then, at the one call
// that does the work, did nothing at all: the hero pressed '<' on an up-staircase
// and stayed exactly where she was, on the same level, with no message.
// "You climb up the stairs."
export async function prev_level(at_stairs) {
    const g = game;
    const u = g.u || {};
    const stway = stairway_at(u.ux, u.uy);
    if (at_stairs && stway)
        stway.u_traversed = true;
    if (at_stairs && stway && (stway.tolev.dnum | 0) !== (u.uz?.dnum | 0)) {
        /* C:1524-1531 — taking an up dungeon branch.  KMH: upwards branches are
           okay if not level 1; just make sure it doesn't go above depth 1. */
        if (!(u.uz?.dnum | 0) && (u.uz?.dlevel | 0) === 1 && !u.uhave?.amulet) {
            /* C:1528 done(ESCAPED) — leaving the dungeon.  done() performs
               the end-game disclosure and score transition; it does not
               return on a real escape. */
            await done(ESCAPED);
        } else {
            const newlevel = { dnum: stway.tolev.dnum | 0, dlevel: stway.tolev.dlevel | 0 };
            await goto_level(newlevel, at_stairs, false, false);
        }
    } else {
        /* C:1536-1539 — going up a stairs or rising through the ceiling. */
        const newlevel = { dnum: u.uz?.dnum | 0, dlevel: (u.uz?.dlevel | 0) - 1 };
        await goto_level(newlevel, at_stairs, false, false);
    }
}

export function recbranch_mapseen(source, dest) {
    if ((source.dnum | 0) === (dest.dnum | 0))
        return;                                  /* not a branch */
    let br = null;
    for (const b of (game._dungeon_branches || [])) {
        if (!b.end1_floating && on_level(source, b.end1) && on_level(dest, b.end2)) { br = b; break; }
        if (!b.end1_floating && on_level(source, b.end2) && on_level(dest, b.end1)) return;
    }
    if (!br)
        return;                                  /* not a real branch */
    const mptr = (game._mapseen_entries || []).find(entry => !entry.duplicate && on_level(entry, source));
    if (mptr) {                                  /* C dungeon.c:2467-2470 */
        if (mptr.br && br !== mptr.br)
            impossible_sync('Two branches on the same level?');
        mptr.br = br;
    } else {
        impossible_sync("Can't note branch for unseen level (%d, %d)",
                        source.dnum | 0, source.dlevel | 0);
    }
}

/* C dungeon.c ledger_no(&u.uz) — the absolute cross-branch level index, the
 * same key js/save.js savelev() and js/restore.js getlev() use.  All
 * callers share this port of dungeon.c:1376-1379, including the xint16 cast. */
export function ledger_no(uz) {
    const dgn = game.dungeons?.[uz?.dnum | 0];
    const jingle = game.context?.jingle || ''; // C's dungeons[-1].ledger_start aliases context.jingle for wished portals.
    const start = (uz?.dnum | 0) === -1
        ? (jingle.charCodeAt(0) || 0) | ((jingle.charCodeAt(1) || 0) << 8) : dgn?.ledger_start | 0;
    return (((uz?.dlevel | 0) + start) << 16) >> 16;
}

/* C dungeon.c:3267-3282: recognize a tended temple even before seeing its altar. */
export function mapseen_temple(_priest) {
    const uz = game.u.uz;
    if (!(game._mapseen_entries || []).some(lev => on_level(lev, uz))) return;
    const key = `${uz.dnum | 0}:${uz.dlevel | 0}`;
    if (on_level(uz, game.valley_level))
        (game._level_valley ||= {})[key] = true;
    else if (_Is_sanctum(uz))
        (game._level_msanctum ||= {})[key] = true;
}
