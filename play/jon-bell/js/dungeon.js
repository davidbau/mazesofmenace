// dungeon.js — port of nethack-c/src/dungeon.c (scaffold: functions are added here

import { game } from './gstate.js';
import { In_quest, In_endgame, Is_knox_level } from './const.js';
import { depth } from './hacklib.js';
import { strsubst } from './mklev.js';

let sve = { exclusion_zones: null };

export function on_level(lev1, lev2) {
    return (lev1.dnum === lev2.dnum && lev1.dlevel === lev2.dlevel);
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
    /* C: impossible("builds_up: can't find branch for dungeon %d"); return FALSE */
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
        if ((br.end1 && on_level(lev, br.end1))
            || (br.end2 && on_level(lev, br.end2)))
            return br;
    }
    return null;
}

/* C ref: dungeon.c:1878-1888 dname_to_dnum(s) — the index of the dungeon whose
 * dname is `s`.  C panics when the name is unknown; a missing name here is a
 * data defect in the generated dungeon table, not a game state, so this
 * returns -1 and dungeon_branch() below reports it rather than inventing a
 * branch. */
export function dname_to_dnum(s) {
    const dgns = game._dungeons_full || game.dungeons || [];
    for (let i = 0; i < dgns.length; i++)
        if (dgns[i] && dgns[i].dname === s)
            return i;
    return -1;
}

/* C ref: dungeon.c:1890-1905 dungeon_branch(s) — the branch record whose end2
 * lands in dungeon `s`.  svb.branches is game._dungeon_branches (the
 * RNG-correct table print_dungeon() walks); game.branches is allmain.js's
 * hand-built stand-in and is only the fallback, the same precedence
 * builds_up() above uses. */
export function dungeon_branch(s) {
    const dnum = dname_to_dnum(s);
    if (dnum < 0)
        return null;
    for (const br of (game._dungeon_branches || game.branches || []))
        if (br && br.end2 && (br.end2.dnum | 0) === dnum)
            return br;
    /* C: panic("dgn_entrance: can't find entrance to %s", s) */
    return null;
}

/* C ref: dungeon.c:1896-1903 at_dgn_entrance(s) —
 *     br = dungeon_branch(s);
 *     return on_level(&u.uz, &br->end1) ? TRUE : FALSE;
 * i.e. "is the hero standing on the level the branch to `s` leaves FROM".
 * goto_level()'s main-dungeon arm (do.c:1917) is the caller that matters. */
export function at_dgn_entrance(s) {
    const br = dungeon_branch(s);
    return !!(br && on_level(game.u ? game.u.uz : null, br.end1));
}

/* C ref: dungeon.c:1323-1327 dunlev(lev) — the level number within *this*
 * dungeon, i.e. the raw dlevel, NOT depth(). */
export function dunlev(lev) {
    return lev?.dlevel | 0;
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

export function describe_level(buf, dflgs, uz) {
    const r = describe_level_impl(dflgs, uz);
    if (buf && typeof buf === 'object')
        buf.s = r.buf;
    return r.ret;
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
function alloc(_size) { return {}; }

export function load_exclusions(nhfp) {
    let ez;
    let nez = 0;

    nez = Sfi_int(nhfp, nez, "exclusion_count");

    while (nez-- > 0) {
        ez = alloc(0);
        ez.zonetype = Sfi_xint16(nhfp, ez.zonetype, "exclusion-zonetype");
        ez.lx = Sfi_coordxy(nhfp, ez.lx, "exclusion-lx");
        ez.ly = Sfi_coordxy(nhfp, ez.ly, "exclusion-ly");
        ez.hx = Sfi_coordxy(nhfp, ez.hx, "exclusion-hx");
        ez.hy = Sfi_coordxy(nhfp, ez.hy, "exclusion-hy");
        ez.next = sve.exclusion_zones;
        sve.exclusion_zones = ez;
    }
}
