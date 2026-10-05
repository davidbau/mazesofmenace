// mkmaze.js — set_levltyp / set_levltyp_lit
// Ported from nethack-c/src/mkmaze.c:77-140

import { game } from './gstate.js';
import { rn2, rnd, pushRngLogEntry } from './rng.js';
import {
    STONE, MAX_TYPE, SDOOR, AIR, ICE,
    LADDER, STAIRS,
    FOUNTAIN, SINK,
    DRAWBRIDGE_UP, DB_ICE,
    LAVAPOOL, LAVAWALL,
    SET_LIT_RANDOM, SET_LIT_NOCHANGE,
    LEV_EXT,
    DB_UNDER, MELT_ICE_AWAY,
    isok,
    HWALL, CORR, ROOM, COLNO, ROWNO, IS_DOOR, ACCESSIBLE,
    POOL, IRONBARS, W_NONDIGGABLE,
    TLWALL, TRWALL, TUWALL, TDWALL, BLCORNER, BRCORNER, TLCORNER, TRCORNER,
    RLOC_ERR, RLOC_NOMSG,
    SPACE_POS, VIBRATING_SQUARE,
} from './const.js';
import { load_special } from './sp_lev.js';
import { obj_ice_effects, count_level_features, wallification } from './mklev.js';
import { place_object, remove_object, u_on_newpos } from './mklev.js';
import { stackobj } from './sp_lev.js';
import { newsym, dec_mode } from './display.js';
import { t_at } from './trap.js';
import { remove_worm } from './worm.js';
import { mnearto, mnexto, elemental_clog } from './teleport.js';
import { MON_BUBBLEMOVE } from './const.js';
/* The makemaz maze fallback (mkmaze.c:1197-1222) and populate_maze
 * (mkmaze.c:1095-1124) call these; all are C mklev.c/mkobj.c bodies that
 * already live in js/mklev.js. */
import { mkstairs, place_branch, mktrap, mkgold, mkobj_at, mksobj_at, In_hell, stairway_find_dir, occupied } from './mklev.js';
import { Is_branchlev } from './dungeon.js';
import { MKTRAP_MAZEFLAG } from './const.js';
import { PM_MINOTAUR } from './pm.generated.js';
/* C objects.h object classes / otyp.  Spelled locally exactly as js/mklev.js
 * spells them (mklev.js:255 RANDOM_CLASS, mklev.js:278 BOULDER); js/const.js
 * exports neither. */
const RANDOM_CLASS = 0;
const GEM_CLASS = 13;
const BOULDER = 475;
import { within_bounded_area } from './rect.js';
/* C hacklib.c distmin — pick_vibrasquare_location's stair-distance test. */
import { distmin } from './hacklib.js';
import { m_at } from './uhitm.js';
import { rloc } from './teleport.js';
import { spot_stop_timers } from './timeout.js';
import { dealloc_monst } from './dog.js';
import { rn1 } from './rng.js';
import { Is_firelevel } from './const.js';
import { create_gas_cloud, clear_heros_fault } from './region.js';
import { Norep } from './display.js';
import { Is_waterlevel, Is_airlevel, WATER, CLOUD, MAGIC_PORTAL } from './const.js';
import { block_point, unblock_point, recalc_block_point, vision_recalc } from './vision.js';
import { CLR_GRAY, CLR_CYAN, CLR_BRIGHT_BLUE } from './terminal.js';
/* stolen_booty() and its statics (C mkmaze.c:712-889) — see the block at the
 * end of this file.  Every one of these is the file's ONE real port; nothing
 * here is a local stand-in. */
import { makemon, mksobj, mkobj, dealloc_obj, upstart, mksobj_migr_to_species } from './mklev.js';
import { add_to_minv, christen_orc } from './dokick.js';
import { rndorcname, christen_monst } from './mhitm.js';
import { set_malign } from './makemon.js';
import { weight } from './weight.js';
import { migrate_to_level } from './dog.js';
import { shiny_obj } from './objnam.js';
import { fruitadd } from './options.js';
import { depth } from './hacklib.js';
import { MKOBJ_OC_CLASS, MKOBJ_OC_PROB } from './mkobj_data.js';
import { PM_ORC, PM_ORC_SHAMAN, PM_ORC_CAPTAIN } from './pm.generated.js';
import { MM_NONAME, MIGR_RANDOM, MIGR_LEFTOVERS, has_mgivenname } from './const.js';
import { ENV } from './hostenv.js';

// CAN_OVERWRITE_TERRAIN — rm.h:339-340
// #define CAN_OVERWRITE_TERRAIN(ttyp) \
//     (iflags.debug_overwrite_stairs || !((ttyp) == LADDER || (ttyp) == STAIRS))
function CAN_OVERWRITE_TERRAIN(ttyp) {
    const debug_overwrite_stairs = !!(game && game.flags && game.flags.debug_overwrite_stairs);
    return debug_overwrite_stairs || !(ttyp === LADDER || ttyp === STAIRS);
}

// IS_LAVA — rm.h
// #define IS_LAVA(typ) ((typ) == LAVAPOOL || (typ) == LAVAWALL)
function IS_LAVA(typ) {
    return typ === LAVAPOOL || typ === LAVAWALL;
}

// IS_FOUNTAIN — rm.h
// #define IS_FOUNTAIN(typ) ((typ) == FOUNTAIN)
function IS_FOUNTAIN(typ) {
    return typ === FOUNTAIN;
}

// IS_SINK — rm.h
// #define IS_SINK(typ) ((typ) == SINK)
function IS_SINK(typ) {
    return typ === SINK;
}

// is_ice — C ref: dbridge.c:85-97 is_ice(coordxy, coordxy).
// C tests (drawbridgemask & DB_UNDER) == DB_ICE, i.e. the whole 3-bit
// "underneath" field equals DB_ICE — not a bit test against DB_ICE alone.
function is_ice(x, y) {
    if (!game || !game.level) return false;
    const loc = game.level.at(x, y);
    if (!loc) return false;
    if (loc.typ === ICE) return true;
    if (loc.typ === DRAWBRIDGE_UP && (loc.drawbridgemask & DB_UNDER) === DB_ICE) return true;
    return false;
}

export function set_levltyp(x, y, newtyp) {
    if (isok(x, y) && newtyp >= STONE && newtyp < MAX_TYPE) {
        if (!game || !game.level) return false;
        const loc = game.level.at(x, y);
        if (!loc) return false;
        const oldtyp = loc.typ;

        /* hack for secret doors in garden theme rooms */
        if (oldtyp === SDOOR && newtyp === AIR) {
            /* loc.typ stays SDOOR rather than change to AIR */
            loc.candig = true;  /* arboreal_sdoor alias per rm.h */
            return true;
        }

        if (CAN_OVERWRITE_TERRAIN(oldtyp)) {
            /* typ==ICE || (typ==DRAWBRIDGE_UP && drawbridgemask==DB_ICE) */
            const was_ice = is_ice(x, y);

            loc.typ = newtyp;
            /* TODO?
             *  if oldtyp used flags or horizontal differently from
             *  the way newtyp will use them, clear them.
             */

            if (IS_LAVA(newtyp)) /* [what about IS_LAVA(oldtyp)=>.lit = 0?] */
                loc.lit = true;

            if (was_ice && newtyp !== ICE) {
                /* frozen corpses resume rotting, no more ice to melt away */
                obj_ice_effects(x, y, true);
                spot_stop_timers(x, y, MELT_ICE_AWAY);
            }
            if ((IS_FOUNTAIN(oldtyp) !== IS_FOUNTAIN(newtyp))
                || (IS_SINK(oldtyp) !== IS_SINK(newtyp))) {
                count_level_features(); /* level.flags.nfountains,nsinks */
            }

            return true;
        }
    }
    return false;
}

export function set_levltyp_lit(x, y, typ, lit) {
    const ret = set_levltyp(x, y, typ);

    if (ret && isok(x, y)) {
        if (lit !== SET_LIT_NOCHANGE) {
            if (IS_LAVA(typ))
                lit = 1;
            else if (lit === SET_LIT_RANDOM)
                lit = rn2(2);

            if (game && game.level) {
                const loc = game.level.at(x, y);
                if (loc) {
                    loc.lit = !!lit;
                }
            }
        }
    }
    return ret;
}

// C ref: mkmaze.c:706-711 check_ransacked() — orc-town-mines kludge; sets
// gr.ransacked (game.ransacked) true only when entering "minetn-1" while in
function check_ransacked(s) {
    const g = game;
    const uz = g.u?.uz;
    g.ransacked = !!(uz && uz.dnum === g.mines_dnum && s === 'minetn-1');
}

// C ref: mon.c:2472-2495 dmonsfree() — purge dead (non-guard) monsters from
// the fmon chain after a level's monsters may have died during creation
// (e.g. light-source monsters). The iflags.purge_monsters count-mismatch
// assertion is a debug sanity check with no JS-side counter to compare
// against; not ported (no gameplay/RNG effect either way).
export function dmonsfree() {
    const g = game;
    let prev = null;
    let mtmp = g.fmon;
    while (mtmp) {
        const next = mtmp.nmon;
        if (mtmp.mhp < 1 && !mtmp.isgd) {
            if (prev)
                prev.nmon = next;
            else
                g.fmon = next;
            mtmp.nmon = null;
            dealloc_monst(mtmp);
        } else {
            prev = mtmp;
        }
        mtmp = next;
    }
}

export { dealloc_monst };

/* C ref: mkmaze.c:1316-1349 mazexy(coord *cc) — "find random point in generated
 * corridors, so we don't create items in moats, bunkers, or walls".  100 random
 * <rnd(x_maze_max), rnd(y_maze_max)> attempts, then a systematic scan.
 *
 * This had NO JS body anywhere, which is why both of its in-tree callers stood
 * as named throws (find_branch_room's nroom==0 arm and mktrap's MKTRAP_MAZEFLAG
 * arm, js/mklev.js) and why makemaz's whole maze-fallback path below could not
 * be written.  It is the load-bearing draw of a random maze level: every
 * object, monster, gold pile and trap populate_maze places goes through it, and
 * a rejected attempt costs a real rnd() pair, so the reject count IS the RNG
 * sequence.
 *
 * C's cc is an out-param; the JS form fills the passed object (so the mktrap /
 * find_branch_room call shape transcribes directly) and also returns it. */
export function mazexy(cc) {
    const g = game;
    const allowedtyp = g.level?.flags?.corrmaze ? CORR : ROOM;
    const xmax = g.gx?.x_maze_max ?? ((COLNO - 1) & ~1);
    const ymax = g.gy?.y_maze_max ?? ((ROWNO - 1) & ~1);
    let cpt = 0;

    do {
        /* C's own comment survives here: this is rnd(N), which includes the
         * maze's outer boundary walls and therefore wastes attempts — the
         * wasted attempts are draws, so the "obscure way to get rnd(N)" is
         * load-bearing and is ported exactly, not tidied to 2 + rn2(N - 1). */
        const x = rnd(xmax);
        const y = rnd(ymax);
        if (g.level?.at(x, y)?.typ === allowedtyp) {
            cc.x = x;
            cc.y = y;
            return cc;
        }
    } while (++cpt < 100);

    /* 100 random attempts failed; systematically try every possibility */
    for (let x = 1; x <= xmax; x++)
        for (let y = 1; y <= ymax; y++)
            if (g.level?.at(x, y)?.typ === allowedtyp) {
                cc.x = x;
                cc.y = y;
                return cc;
            }
    /* C: panic("mazexy: can't find a place!") */
    throw new Error("mazexy: can't find a place!");
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

export function pick_vibrasquare_location() {
    const g = game;
    let x = 0, y = 0, stway = null, trycnt = 0;
    /* C's local x_maze_min / y_maze_min, both 2 (mkmaze.c:1048-1049). */
    const x_maze_min = 2, y_maze_min = 2;
    const INVPOS_X_MARGIN = 6 - 2, INVPOS_Y_MARGIN = 5 - 2, INVPOS_DISTANCE = 11;
    const x_range = (g.gx?.x_maze_max ?? ((COLNO - 1) & ~1))
                    - x_maze_min - 2 * INVPOS_X_MARGIN - 1;
    const y_range = (g.gy?.y_maze_max ?? ((ROWNO - 1) & ~1))
                    - y_maze_min - 2 * INVPOS_Y_MARGIN - 1;
    /* C mkmaze.c:1068-1072 is a debugpline2 only — no state, no RNG. */
    if (!g.svi)
        g.svi = {};
    g.svi.inv_pos = { x: 0, y: 0 }; /* C:1073 */
    do {
        x = rn1(x_range, x_maze_min + INVPOS_X_MARGIN + 1);
        y = rn1(y_range, y_maze_min + INVPOS_Y_MARGIN + 1);
        /* we don't want it to be too near the stairs, nor
           to be on a spot that's already in use (wall|trap) */
        if (++trycnt > 1000)
            break;
        stway = stairway_find_dir(true);
    } while (stway
             && (x === (stway.sx | 0) || y === (stway.sy | 0) /*(direct line)*/
                 || Math.abs(x - (stway.sx | 0)) === Math.abs(y - (stway.sy | 0))
                 || distmin(x, y, stway.sx | 0, stway.sy | 0) <= INVPOS_DISTANCE
                 || !SPACE_POS(g.level?.at(x, y)?.typ | 0)
                 || occupied(x, y)));
    g.svi.inv_pos.x = x;
    g.svi.inv_pos.y = y;
}

/* C ref: mkmaze.c:1095-1124 populate_maze() — "add objects and monsters to
 * random maze".  Six loops, each drawing its count first and then one mazexy()
 * per item; the mktrap loop draws no position of its own because mktrap does
 * its own mazexy() under MKTRAP_MAZEFLAG. */
async function populate_maze() {
    let i;
    const mm = { x: 0, y: 0 };

    for (i = rn1(8, 11); i; i--) {
        mazexy(mm);
        await mkobj_at(rn2(2) ? GEM_CLASS : RANDOM_CLASS, mm.x, mm.y, true);
    }
    for (i = rn1(10, 2); i; i--) {
        mazexy(mm);
        await mksobj_at(BOULDER, mm.x, mm.y, true, false);
    }
    for (i = rn2(3); i; i--) {
        mazexy(mm);
        await makemon(PM_MINOTAUR, mm.x, mm.y, 0 /* NO_MM_FLAGS */);
    }
    for (i = rn1(5, 7); i; i--) {
        mazexy(mm);
        await makemon(null, mm.x, mm.y, 0 /* NO_MM_FLAGS */);
    }
    for (i = rn1(6, 7); i; i--) {
        mazexy(mm);
        await mkgold(0, mm.x, mm.y);
    }
    for (i = rn1(6, 7); i; i--)
        await mktrap(0, MKTRAP_MAZEFLAG, null, null);
}

// C ref: mkmaze.c:1126-1223 makemaz(const char *s) — the WHOLE function as of
// this commit.  It used to be scoped to the *s (non-empty argument) branch
// only, with both of C's other exits standing as throws.  Call sites in
// makelevel(), matching C's cascade (mklev.c:1267-1289):
//   * the Is_special arm — makemaz(slev->proto), sp == slev;
//   * the dungeons[dnum].fill_lvl arm — makemaz(fill_lvl), where sp is NULL
//     (a plain Gnomish Mines level has no s_level entry; makelevel only
//   * the In_hell / below-Medusa arm — makemaz(""), sp is NULL, protofile comes
//     out EMPTY and C falls through to the maze fallback below.  That third
//     caller is what this block exists for: mklev.c:1286-1289 is where the
//     Dungeons of Doom stops being rooms-and-corridors and starts being mazes,
//     and js/mklev.js had the arm with an EMPTY BODY, so every such level was
//     C rn2(3) @ mkmaze.c:1198 (corrmaze), JS rn2(1) @ rnd_rect, and 1,498
// `sp` is C's own `s_level *sp = Is_special(&u.uz)`, passed in rather than
// re-derived so this file needs no dungeon-chain import.
// STILL out of scope, and still a throw: the dungeons[dnum].proto name-building
// branch (mkmaze.c:1139-1153, Vlad's Tower) — makelevel guards that arm itself
// and never reaches here with it — and the SPLEVTYPE wizard override.
export async function js_makemaz(s, sp) {
    const g = game;
    let protofile = s;
    // C: if (sp && sp->rndlevs) Snprintf(protofile, "%s-%d", s, rnd(rndlevs));
    if (sp && sp.rndlevs) {
        protofile = `${protofile}-${rnd(sp.rndlevs)}`;
    }
    // C: wizard-mode SPLEVTYPE env override (mkmaze.c:1157-1178) — never in
    // sp->rndlevs is set; tut-1/tut-2 have no rndlevs. Not ported.
    if (protofile) {
        check_ransacked(protofile);
        protofile = `${protofile}${LEV_EXT}`;
        g.in_mk_themerooms = false;
        const ok = await load_special(protofile);
        if (ok) {
            dmonsfree();
            return;
        }
        /* C: impossible("Couldn't load \"%s\" - making a maze.", protofile);
         * impossible() logs and RETURNS in C, so control falls through into the
         * maze fallback below rather than stopping. */
        // This is C's impossible() (pline.c:587-637), not a debug probe — the same
        // spelling js/mklev.js's mktrap already uses for its own impossible().
        // It logs and RETURNS, which is why control falls through to the maze.
        // ALLOW_LANE_PROBE: C impossible(), see the three lines above
        console.error('makemaz', `Couldn't load "${protofile}" - making a maze.`);
    }

    /* ── the maze fallback, C mkmaze.c:1197-1222 ─────────────────────────── */
    const lf = g.level.flags;
    lf.is_maze_lev = 1;
    lf.corrmaze = !rn2(3);

    /* C's `!Invocation_lev(&u.uz) && rn2(2)` SHORT-CIRCUITS: on the invocation
     * level the rn2(2) is not drawn at all. */
    const uz = g.u?.uz;
    if (!Invocation_lev(uz) && rn2(2)) {
        create_maze(-1, -1, !rn2(5));
    } else {
        create_maze(1, 1, false);
    }

    if (!lf.corrmaze)
        wallification(2, 2,
                      g.gx?.x_maze_max ?? ((COLNO - 1) & ~1),
                      g.gy?.y_maze_max ?? ((ROWNO - 1) & ~1));

    const mm = { x: 0, y: 0 };
    mazexy(mm);
    mkstairs(mm.x, mm.y, 1, null); /* up */
    if (!Invocation_lev(uz)) {
        mazexy(mm);
        mkstairs(mm.x, mm.y, 0, null); /* down */
    } else {
        /* C mkmaze.c:1214-1216 — the invocation level has no down stair;
         * reserve the vibrating square location for the Sanctum descent. */
        pick_vibrasquare_location();
        await mktrap(VIBRATING_SQUARE, 0 /* no trap flags */, null,
                     { x: game.svi.inv_pos.x, y: game.svi.inv_pos.y });
    }

    /* place branch stair or portal */
    await place_branch(Is_branchlev(uz), 0, 0);

    await populate_maze();
}

// ═══════════════════════════════════════════════════════════════════════════════
// create_maze and its helpers — C ref: nethack-c-v5/upstream/src/mkmaze.c
//   mz_move (macro, :32-43), maze_inbounds (:893-901), okay (:296-305),
//   maze0xy (:308-314), walkfrom (:1278-1310, the !MICRO recursive form),
//   maze_remove_deadends (:903-944), create_maze (:949-1035).
// Reached from splev_initlev's LVLINIT_MAZE arm (sp_lev.c:2998-2999), i.e.
// des.level_init({ style = "maze", ... }) in a .lua level file — hellfill.lua's
// ═══════════════════════════════════════════════════════════════════════════════

/* C: #define mz_move(X, Y, dir) — adjust a coordinate one step in `dir`.
 * A macro that modifies its first two arguments, so the JS form takes and
 * returns a {x,y} pair rather than pretending to be an lvalue. */
function mz_move(c, dir) {
    switch (dir) {
    case 0: --c.y; break;
    case 1: c.x++; break;
    case 2: c.y++; break;
    case 3: --c.x; break;
    default: throw new Error(`mz_move: bad direction ${dir}`);
    }
    return c;
}

/* C ref: mkmaze.c:893-901 */
function maze_inbounds(x, y) {
    const g = game;
    return (x >= 2 && y >= 2
            && x < (g.gx?.x_maze_max ?? ((COLNO - 1) & ~1))
            && y < (g.gy?.y_maze_max ?? ((ROWNO - 1) & ~1))
            /* C keeps the isok() test even though it calls it superfluous */
            && isok(x, y));
}

/* C ref: mkmaze.c:296-305.  Note C's bound test is `>` against the maze max,
 * not `>=` as maze_inbounds uses — port the asymmetry. */
function okay(x, y, dir) {
    const g = game;
    const c = { x, y };
    mz_move(c, dir);
    mz_move(c, dir);
    const xmax = g.gx?.x_maze_max ?? ((COLNO - 1) & ~1);
    const ymax = g.gy?.y_maze_max ?? ((ROWNO - 1) & ~1);
    if (c.x < 3 || c.y < 3 || c.x > xmax || c.y > ymax)
        return false;
    const loc = g.level?.at(c.x, c.y);
    if (!loc || loc.typ !== STONE)
        return false;
    return true;
}

/* find random starting point for maze generation — C ref: mkmaze.c:308-314 */
function maze0xy() {
    const g = game;
    const xmax = g.gx?.x_maze_max ?? ((COLNO - 1) & ~1);
    const ymax = g.gy?.y_maze_max ?? ((ROWNO - 1) & ~1);
    return {
        x: 3 + 2 * rn2((xmax >> 1) - 1),
        y: 3 + 2 * rn2((ymax >> 1) - 1),
    };
}

/* C ref: mkmaze.c:1278-1310 — the !MICRO (recursive) build, which is what the
 * organiser's binary compiles.  The MICRO variant walks the same cells in the
 * same order with an explicit stack, so the RNG sequence is identical either
 * way; recursion depth is bounded by (ROWNO * COLNO) / 4 = 420 cells. */
export function walkfrom(x, y, typ) {
    const g = game;
    if (!typ) {
        if (g.level?.flags?.corrmaze)
            typ = CORR;
        else
            typ = ROOM;
    }

    let loc = g.level?.at(x, y);
    if (loc && !IS_DOOR(loc.typ)) {
        /* might still be on edge of MAP, so don't overwrite */
        loc.typ = typ;
        loc.flags = 0;
    }

    const dirs = [0, 0, 0, 0];
    for (;;) {
        let q = 0;
        for (let a = 0; a < 4; a++)
            if (okay(x, y, a))
                dirs[q++] = a;
        if (!q)
            return;
        const dir = dirs[rn2(q)];
        const c = { x, y };
        mz_move(c, dir);
        loc = g.level?.at(c.x, c.y);
        if (loc)
            loc.typ = typ;
        mz_move(c, dir);
        x = c.x;
        y = c.y;
        walkfrom(x, y, typ);
    }
}

/* C ref: mkmaze.c:903-944 */
function maze_remove_deadends(typ) {
    const g = game;
    const dirok = [0, 0, 0, 0];
    const xmax = g.gx?.x_maze_max ?? ((COLNO - 1) & ~1);
    const ymax = g.gy?.y_maze_max ?? ((ROWNO - 1) & ~1);

    for (let x = 2; x < xmax; x++)
        for (let y = 2; y < ymax; y++) {
            const here = g.level?.at(x, y);
            if (!here || !ACCESSIBLE(here.typ) || !(x % 2) || !(y % 2))
                continue;
            let idx = 0, idx2 = 0;
            for (let dir = 0; dir < 4; dir++) {
                const c = { x, y };
                const c2 = { x, y };
                mz_move(c, dir);
                if (!maze_inbounds(c.x, c.y)) {
                    idx2++;
                    continue;
                }
                mz_move(c2, dir);
                mz_move(c2, dir);
                if (!maze_inbounds(c2.x, c2.y)) {
                    idx2++;
                    continue;
                }
                const l1 = g.level?.at(c.x, c.y);
                const l2 = g.level?.at(c2.x, c2.y);
                if (l1 && l2 && !ACCESSIBLE(l1.typ) && ACCESSIBLE(l2.typ)) {
                    dirok[idx++] = dir;
                    idx2++;
                }
            }
            if (idx2 >= 3 && idx > 0) {
                const c = { x, y };
                const dir = dirok[rn2(idx)];
                mz_move(c, dir);
                const loc = g.level?.at(c.x, c.y);
                if (loc)
                    loc.typ = typ;
            }
        }
}

/* Create a maze with specified corridor width and wall thickness.
 * C ref: mkmaze.c:949-1035. */
export function create_maze(corrwid, wallthick, rmdeadends) {
    const g = game;
    const tmp_xmax = g.gx?.x_maze_max ?? ((COLNO - 1) & ~1);
    const tmp_ymax = g.gy?.y_maze_max ?? ((ROWNO - 1) & ~1);

    if (corrwid === -1)
        corrwid = rnd(4);

    if (wallthick === -1)
        wallthick = rnd(4) - corrwid;

    if (wallthick < 1)
        wallthick = 1;
    else if (wallthick > 5)
        wallthick = 5;

    if (corrwid < 1)
        corrwid = 1;
    else if (corrwid > 5)
        corrwid = 5;

    const scale = corrwid + wallthick;
    const rdx = Math.trunc(tmp_xmax / scale);
    const rdy = Math.trunc(tmp_ymax / scale);

    if (g.level?.flags?.corrmaze) {
        for (let x = 2; x < (rdx * 2); x++)
            for (let y = 2; y < (rdy * 2); y++) {
                const loc = g.level?.at(x, y);
                if (loc) loc.typ = STONE;
            }
    } else {
        for (let x = 2; x <= (rdx * 2); x++)
            for (let y = 2; y <= (rdy * 2); y++) {
                const loc = g.level?.at(x, y);
                if (loc) loc.typ = ((x % 2) && (y % 2)) ? STONE : HWALL;
            }
    }

    /* set upper bounds for maze0xy and walkfrom */
    if (!g.gx) g.gx = {};
    if (!g.gy) g.gy = {};
    g.gx.x_maze_max = (rdx * 2);
    g.gy.y_maze_max = (rdy * 2);

    /* create maze */
    const mm = maze0xy();
    walkfrom(mm.x, mm.y, 0);

    if (rmdeadends)
        maze_remove_deadends((g.level?.flags?.corrmaze) ? CORR : ROOM);

    /* restore bounds */
    g.gx.x_maze_max = tmp_xmax;
    g.gy.y_maze_max = tmp_ymax;

    /* scale maze up if needed */
    if (scale > 2) {
        /* C: char tmpmap[COLNO][ROWNO]; only [1, *_maze_max) is written and
         * only that range is read back, so an uninitialised C cell is never
         * consumed — a dense array of the same shape is faithful. */
        const tmpmap = [];
        for (let x = 0; x < COLNO; x++)
            tmpmap.push(new Array(ROWNO).fill(0));

        /* back up the existing smaller maze */
        for (let x = 1; x < tmp_xmax; x++)
            for (let y = 1; y < tmp_ymax; y++) {
                const loc = g.level?.at(x, y);
                tmpmap[x][y] = loc ? loc.typ : STONE;
            }

        /* do the scaling.  C's loop variables x/y keep advancing past the
         * while-condition on rx/ry, exactly as transcribed. */
        let rx = 2, x = 2;
        while (rx < tmp_xmax) {
            const mx = (x % 2) ? corrwid
                       : (x === 2 || x === rdx * 2) ? 1
                         : wallthick;
            let ry = 2, y = 2;
            while (ry < tmp_ymax) {
                const my = (y % 2) ? corrwid
                           : (y === 2 || y === rdy * 2) ? 1
                             : wallthick;
                for (let dx = 0; dx < mx; dx++)
                    for (let dy = 0; dy < my; dy++) {
                        if (rx + dx >= tmp_xmax || ry + dy >= tmp_ymax)
                            break;
                        const loc = g.level?.at(rx + dx, ry + dy);
                        if (loc) loc.typ = tmpmap[x][y];
                    }
                ry += my;
                y++;
            }
            rx += mx;
            x++;
        }
    }
}


export function bughack() {
    const g = game;
    if (!g.bughack)
        g.bughack = {
            inarea: { x1: COLNO, y1: ROWNO, x2: 0, y2: 0 },
            delarea: { x1: COLNO, y1: ROWNO, x2: 0, y2: 0 },
        };
    return g.bughack;
}

/* C ref: mkmaze.c:471-566 baalz_fixup().
 *
 * "fix up Baalzebub's lair, which depicts a level-sized beetle; its legs are
 *  walls within solid rock -- regular wallification classifies them as
 *  superfluous and gets rid of them."
 *
 * The nondiggable region marked by baalz.lua's des.non_diggable() is what
 * delimits the insect; this function reads it back off the map to find the
 * rectangle, converts the two marker POOLs into HWALLs (remembering where they
 * were), wallifies a 2-cell-larger box, and then undoes the two bogus
 * rear-leg joints wallification produces.
 *
 * RNG: none of its own.  The only draws are the two rloc() calls, and each
 * fires only if a monster happens to be standing on a marker-pool square. */
export async function baalz_fixup() {
    const bh = bughack();
    const baalzTrace = typeof process !== 'undefined' && ENV?.FF_BAALZ_TRACE === '1';
    const trace = (tag, x, y) => {
        if (baalzTrace)
            pushRngLogEntry(`^baalz_trace[tag=${tag} xy=${x | 0},${y | 0} typ=${game.level?.at(x, y)?.typ | 0}`
                + ` mon=${m_at(x, y)?.m_id | 0}]`);
    };
    const at = (x, y) => game.level?.at(x, y);
    const nondig = (x, y) => (((at(x, y)?.wall_info) | 0) & W_NONDIGGABLE) !== 0;
    let x, y, lastx, lasty;

    /* find low and high x for to-be-wallified portion of level */
    y = Math.trunc(ROWNO / 2);
    for (lastx = x = 0; x < COLNO; ++x)
        if (nondig(x, y)) {
            if (!lastx)
                bh.inarea.x1 = x + 1;
            lastx = x;
        }
    bh.inarea.x2 = ((lastx > bh.inarea.x1) ? lastx : x) - 1;
    /* find low and high y for to-be-wallified portion of level */
    x = bh.inarea.x1;
    for (lasty = y = 0; y < ROWNO; ++y)
        if (nondig(x, y)) {
            if (!lasty)
                bh.inarea.y1 = y + 1;
            lasty = y;
        }
    bh.inarea.y2 = ((lasty > bh.inarea.y1) ? lasty : y) - 1;

    /* two pools mark where special post-wallify fix-ups are needed */
    for (x = bh.inarea.x1; x <= bh.inarea.x2; ++x)
        for (y = bh.inarea.y1; y <= bh.inarea.y2; ++y) {
            const loc = at(x, y);
            if (!loc)
                continue;
            if (loc.typ === POOL) {
                trace('pool', x, y);
                loc.typ = HWALL;
                if (bh.delarea.x1 === COLNO) {
                    bh.delarea.x1 = x; bh.delarea.y1 = y;
                } else {
                    bh.delarea.x2 = x; bh.delarea.y2 = y;
                }
            } else if (loc.typ === IRONBARS) {
                /* novelty effect; allowing digging in front of 'eyes' */
                if (isok(x - 1, y) && nondig(x - 1, y)) {
                    at(x - 1, y).wall_info &= ~W_NONDIGGABLE;
                    if (isok(x - 2, y))
                        at(x - 2, y).wall_info &= ~W_NONDIGGABLE;
                } else if (isok(x + 1, y) && nondig(x + 1, y)) {
                    at(x + 1, y).wall_info &= ~W_NONDIGGABLE;
                    if (isok(x + 2, y))
                        at(x + 2, y).wall_info &= ~W_NONDIGGABLE;
                }
            }
        }

    wallification(Math.max(bh.inarea.x1 - 2, 1),
                  Math.max(bh.inarea.y1 - 2, 0),
                  Math.min(bh.inarea.x2 + 2, COLNO - 1),
                  Math.min(bh.inarea.y2 + 2, ROWNO - 1));

    /* bughack hack for rear-most legs on baalz level; first joint on both top
       and bottom gets a bogus extra connection to room area, producing
       unwanted rectangles; change back to separated legs */
    x = bh.delarea.x1; y = bh.delarea.y1;
    trace('fix1', x, y);
    if (isok(x, y) && (at(x, y).typ === TLWALL || at(x, y).typ === TRWALL)
        && isok(x, y + 1) && at(x, y + 1).typ === TUWALL) {
        at(x, y).typ = (at(x, y).typ === TLWALL) ? BRCORNER : BLCORNER;
        at(x, y + 1).typ = HWALL;
        const mtmp = m_at(x, y); /* something at temporary pool... */
        if (mtmp)
            await rloc(mtmp, RLOC_ERR | RLOC_NOMSG);
    }

    x = bh.delarea.x2; y = bh.delarea.y2;
    trace('fix2', x, y);
    if (isok(x, y) && (at(x, y).typ === TLWALL || at(x, y).typ === TRWALL)
        && isok(x, y - 1) && at(x, y - 1).typ === TDWALL) {
        at(x, y).typ = (at(x, y).typ === TLWALL) ? TRCORNER : TLCORNER;
        at(x, y - 1).typ = HWALL;
        const mtmp = m_at(x, y); /* something at temporary pool... */
        if (mtmp)
            await rloc(mtmp, RLOC_ERR | RLOC_NOMSG);
    }

    /* reset bughack region; set low end to <COLNO,ROWNO> so that
       within_bounded_area() in fix_wall_spines() will fail most quickly --
       on its first test -- when loading other levels */
    bh.inarea.x1 = bh.delarea.x1 = COLNO;
    bh.inarea.y1 = bh.delarea.y1 = ROWNO;
    bh.inarea.x2 = bh.delarea.x2 = 0;
    bh.inarea.y2 = bh.delarea.y2 = 0;
}

export async function fumaroles() {
    let nmax = rn2(3);
    let sizemin = 5;
    let snd = false, loud = false;

    if (Is_firelevel(game.u?.uz)) {
        nmax++;
        sizemin += 5;
    }
    if ((game.level?.flags?.temperature | 0) > 0) {
        nmax++;
        sizemin += 5;
    }

    for (let n = nmax; n; n--) {
        const x = rn1(COLNO - 4, 3);
        const y = rn1(ROWNO - 4, 3);

        if (game.level?.at(x, y)?.typ === LAVAPOOL) {
            const r = create_gas_cloud(x, y, rn1(10, sizemin), rn1(10, 5));

            clear_heros_fault(r);
            snd = true;
            /* C: distu(x, y) — dist2 from the hero. */
            const dx = x - (game.u?.ux | 0), dy = y - (game.u?.uy | 0);
            if (dx * dx + dy * dy < 15)
                loud = true;
        }
    }
    if (snd)
        await Norep(`You hear a ${loud ? 'loud ' : ''}whoosh!`);
}


/* C mkmaze.c: svx.xmin / svy.ymin / svx.xmax / svy.ymax, set by
 * setup_waterlevel() and read by the gbxmin/gbymin/gbxmax/gbymax macros. */
let _wl_xmin = 3, _wl_ymin = 1, _wl_xmax = 78, _wl_ymax = 20;
/* C mkmaze.c:1523-1527 — the bubble movement boundaries. */
const gbxmin = () => _wl_xmin + 1;
const gbymin = () => _wl_ymin + 1;
const gbxmax = () => _wl_xmax - 1;
const gbymax = () => _wl_ymax - 1;
/* C svb.bbubbles / ge.ebubbles — the doubly-linked bubble list; gw.wportal;
 * and movebubbles()'s `static boolean up`.  The list and bounds are saved by
 * bubbles_save_snapshot()/bubbles_rest_snapshot(); `up` is process state and
 * is reset only at the fresh-process boundary in jsmain. */
let _bbubbles = null, _ebubbles = null, _wportal = null, _bubbles_up = false;
/* C mkmaze.c:1530 — `static struct bubble *hero_bubble`, the bubble the hero is
 * in.  Water-only (only the CONS_HERO arm sets it); tracked for faithfulness. */
let _hero_bubble = null;

export function bubbles_clear_level() {
    _bbubbles = _ebubbles = null;
    _wportal = null;
    _hero_bubble = null;
    /* `up` is a C function-scope static, NOT level state — it deliberately
     * survives level changes so successive traversals alternate direction.
     * Left alone. */
}

export function bubbles_reset_process_state() {
    bubbles_clear_level();
    _bubbles_up = false;
    _wl_xmin = 3; _wl_ymin = 1; _wl_xmax = 78; _wl_ymax = 20;
}

/* C save.c:551 save_bubbles / restore.c:1226 rest_bubbles.  Contents are
 * transiently detached during a bubble move and are not save records; scalar
 * list order and bounds are. */
export function bubbles_save_snapshot() {
    if (!Is_waterlevel(game.u?.uz) && !Is_airlevel(game.u?.uz)) return null;
    const records = [];
    for (let b = _bbubbles; b; b = b.next)
        records.push({ x: b.x, y: b.y, dx: b.dx, dy: b.dy, bm: b.bm.slice() });
    return { xmin: _wl_xmin, ymin: _wl_ymin, xmax: _wl_xmax, ymax: _wl_ymax,
        records };
}

export async function bubbles_rest_snapshot(snapshot) {
    bubbles_clear_level();
    if (!snapshot) return;
    _wl_xmin = snapshot.xmin; _wl_ymin = snapshot.ymin;
    _wl_xmax = snapshot.xmax; _wl_ymax = snapshot.ymax;
    for (const record of snapshot.records) {
        const b = { x: record.x, y: record.y, dx: record.dx, dy: record.dy,
            bm: record.bm.slice(), cons: null, prev: _ebubbles, next: null };
        if (_ebubbles) _ebubbles.next = b;
        else _bbubbles = b;
        await mv_bubble(b, 0, 0, true);
        _ebubbles = b;
    }
}

/* C dorecover copies every inactive level record through getlev/savelev.
 * Copy bubble scalars through the same initial-move body without replacing the
 * active bubble list. */
export async function bubbles_copy_snapshot(snapshot, level) {
    if (!snapshot) return null;
    const bounds = [_wl_xmin, _wl_ymin, _wl_xmax, _wl_ymax];
    const activeLevel = game.level;
    try {
        _wl_xmin = snapshot.xmin; _wl_ymin = snapshot.ymin;
        _wl_xmax = snapshot.xmax; _wl_ymax = snapshot.ymax;
        game.level = level;
        const records = [];
        for (const record of snapshot.records) {
            const b = { ...record, bm: record.bm.slice(), cons: null };
            await mv_bubble(b, 0, 0, true);
            records.push({ x: b.x, y: b.y, dx: b.dx, dy: b.dy, bm: b.bm });
        }
        return { xmin: snapshot.xmin, ymin: snapshot.ymin,
            xmax: snapshot.xmax, ymax: snapshot.ymax, records };
    } finally {
        [_wl_xmin, _wl_ymin, _wl_xmax, _wl_ymax] = bounds;
        game.level = activeLevel;
    }
}

/* C mkmaze.c:1935-1946 set_wportal() — "there better be only one magic portal
 * on water level...".  No RNG. */
function set_wportal() {
    for (let t = game.level?.traps ?? null; t; t = t.ntrap) {
        if ((t.ttyp | 0) === MAGIC_PORTAL) { _wportal = t; return; }
    }
    /* impossible("set_wportal(): no portal!") — C logs and leaves it null. */
    _wportal = null;
}

/* C mkmaze.c:1896-1948 mk_bubble(x, y, n).
 * The bitmasks "make visually pleasing bubbles on a normal aspect 25x80
 * terminal"; the first two elements are the bounding box. */
const _BUBBLE_BMASK = [
    [2, 1, 0x3],
    [3, 2, 0x7, 0x7],
    [4, 3, 0x6, 0xf, 0x6],
    [5, 3, 0xe, 0x1f, 0xe],
    [6, 4, 0x1e, 0x3f, 0x3f, 0x1e],
    [7, 4, 0x3e, 0x7f, 0x7f, 0x3e],
    [8, 4, 0x7e, 0xff, 0xff, 0x7e],
];
function mk_bubble(x, y, n) {
    if (x >= gbxmax() || y >= gbymax())
        return;
    if (n >= _BUBBLE_BMASK.length) {
        /* impossible("n too large (mk_bubble)") */
        n = _BUBBLE_BMASK.length - 1;
    }
    const bm = _BUBBLE_BMASK[n];
    if (x + bm[0] - 1 > gbxmax())
        x = gbxmax() - bm[0] + 1;
    if (y + bm[1] - 1 > gbymax())
        y = gbymax() - bm[1] + 1;
    const b = { x, y, dx: 0, dy: 0, bm: bm.slice(), cons: null,
                next: null, prev: null };
    b.dx = 1 - rn2(3);
    b.dy = 1 - rn2(3);
    if (!_bbubbles)
        _bbubbles = b;
    if (_ebubbles) {
        _ebubbles.next = b;
        b.prev = _ebubbles;
    } else {
        b.prev = null;
    }
    b.next = null;
    _ebubbles = b;
    void mv_bubble(b, 0, 0, true); // ini: cons is empty, so nothing awaits
}

/* C mkmaze.c:1927-1939 maybe_adjust_hero_bubble — maybe change the movement
 * direction of the bubble the hero is in. */
export function maybe_adjust_hero_bubble() {
    const u = game.u;
    if (!Is_waterlevel(u?.uz)) return;
    if (!u.dx && !u.dy) return;
    if (_hero_bubble && !rn2(2)) {
        _hero_bubble.dx = u.dx;
        _hero_bubble.dy = u.dy;
    }
}

/* C mkmaze.c:1951-2107 mv_bubble(b, dx, dy, ini). */
async function mv_bubble(b, dx, dy, ini) {
    let colli = 0;
    const airlev = Is_airlevel(game.u?.uz);
    const waterlev = Is_waterlevel(game.u?.uz);

    /* clouds move slowly */
    if (!airlev || !rn2(6)) {
        if (dx < -1 || dx > 1 || dy < -1 || dy > 1) {
            dx = Math.sign(dx);
            dy = Math.sign(dy);
        }
        /* collision with level borders?
           1 = horizontal border, 2 = vertical, 3 = corner */
        if (b.x <= gbxmin()) colli |= 2;
        if (b.y <= gbymin()) colli |= 1;
        if (b.x + b.bm[0] - 1 >= gbxmax()) colli |= 2;
        if (b.y + b.bm[1] - 1 >= gbymax()) colli |= 1;
        /* C's four pline()-and-clamp arms are diagnostics for an out-of-range
           bubble; mk_bubble already clamps, so they are dead here. */
        if (b.x < gbxmin()) b.x = gbxmin();
        if (b.y < gbymin()) b.y = gbymin();
        if (b.x + b.bm[0] - 1 > gbxmax()) b.x = gbxmax() - b.bm[0] + 1;
        if (b.y + b.bm[1] - 1 > gbymax()) b.y = gbymax() - b.bm[1] + 1;
        /* bounce if we're trying to move off the border */
        if (b.x === gbxmin() && dx < 0) dx = -dx;
        if (b.x + b.bm[0] - 1 === gbxmax() && dx > 0) dx = -dx;
        if (b.y === gbymin() && dy < 0) dy = -dy;
        if (b.y + b.bm[1] - 1 === gbymax() && dy > 0) dy = -dy;
        b.x += dx;
        b.y += dy;
    }

    /* draw the bubbles */
    for (let i = 0, x = b.x; i < b.bm[0]; i++, x++)
        for (let j = 0, y = b.y; j < b.bm[1]; j++, y++)
            if (b.bm[j + 2] & (1 << i)) {
                const loc = game.level?.at(x, y);
                if (!loc) continue;
                if (waterlev) {
                    loc.typ = AIR;
                    loc.lit = 1;
                    unblock_point(x, y);
                } else if (airlev) {
                    loc.typ = CLOUD;
                    loc.lit = 1;
                    block_point(x, y);
                }
            }

    if (waterlev) {
        /* C mkmaze.c:2027-2085 — replace contents of bubble */
        let ctemp;
        for (let cons = b.cons; cons; cons = ctemp) {
            ctemp = cons.next;
            cons.x += dx;
            cons.y += dy;

            switch (cons.what) {
            case 'obj': {
                let otmp;
                for (let olist = cons.list; olist; olist = otmp) {
                    otmp = olist.nexthere;
                    place_object(olist, cons.x, cons.y);
                    await stackobj(olist);
                }
                break;
            }
            case 'mon': {
                const mon = cons.list;
                /* mnearto() might fail; jump right to elemental_clog */
                if (!await mnearto(mon, cons.x, cons.y, true, RLOC_NOMSG))
                    await elemental_clog(mon);
                break;
            }
            case 'hero': {
                const mtmp = m_at(cons.x, cons.y);
                const ux0 = game.u.ux, uy0 = game.u.uy;
                u_on_newpos(cons.x, cons.y);
                newsym(ux0, uy0); /* clean up old position */
                if (mtmp)
                    await mnexto(mtmp, RLOC_NOMSG);
                break;
            }
            case 'trap': {
                const btrap = cons.list;
                btrap.tx = cons.x;
                btrap.ty = cons.y;
                break;
            }
            default:
                break;
            }
        }
        b.cons = null;
    }

    /* boing? */
    switch (colli) {
    case 1:
        b.dy = -b.dy;
        break;
    case 3:
        b.dy = -b.dy;
        /* FALLTHRU */
    case 2:
        b.dx = -b.dx;
        break;
    default:
        /* sometimes alter direction for fun anyway
           (higher probability for stationary bubbles) */
        if (!ini && ((b.dx || b.dy) ? !rn2(20) : !rn2(5))) {
            b.dx = 1 - rn2(3);
            b.dy = 1 - rn2(3);
        }
    }
}

/* S_water (dat/symbols:721 \xe0 under DECgraphics, '}' otherwise;
 * defsym.h:152 CLR_BRIGHT_BLUE) — same cell js/display.js terrain_glyph
 * draws for typ WATER. */
function water_memory_glyph() {
    return dec_mode()
        ? { ch: '`', color: CLR_BRIGHT_BLUE, decgfx: true }
        : { ch: '}', color: CLR_BRIGHT_BLUE, decgfx: false };
}

/* C mkmaze.c:1836-1880 setup_waterlevel() — called from fixup_special() when
 * the level being built is the Plane of Water or the Plane of Air. */
export function setup_waterlevel() {
    const uz = game.u?.uz;
    const waterlev = Is_waterlevel(uz);
    /* C panics when neither; the single call site already tested. */

    /* "ouch, hardcoded... (file scope statics and used in bxmin,bymax,&c)" */
    _wl_xmin = 3;
    _wl_ymin = 1;
    _wl_xmax = Math.min(78, (COLNO - 1) - 1);
    _wl_ymax = Math.min(20, ROWNO - 1);

    /* "entire level is remembered as one glyph and any unspecified portion
       should default to level's base element rather than to usual stone" */
    const typ = waterlev ? WATER : AIR;
    for (let x = 1; x <= COLNO - 1; x++)
        for (let y = 0; y <= ROWNO - 1; y++) {
            const loc = game.level?.at(x, y);
            if (!loc) continue;
            loc.remembered_glyph = waterlev
                ? water_memory_glyph()
                : { ch: ' ', color: CLR_CYAN, decgfx: false };
            if ((loc.typ | 0) === STONE)
                loc.typ = typ;
        }

    /* make bubbles */
    let xskip, yskip;
    if (waterlev) {
        xskip = 10 + rn2(10);
        yskip = 4 + rn2(4);
    } else {
        xskip = 6 + rn2(4);
        yskip = 3 + rn2(3);
    }
    for (let x = gbxmin(); x <= gbxmax(); x += xskip)
        for (let y = gbymin(); y <= gbymax(); y += yskip)
            mk_bubble(x, y, rn2(7));
}

/* C mkmaze.c:1536-1682 movebubbles() — "augment the Planes of Water (for
 * bubbles) and Air (for clouds); called from goto_level() when arriving and
 * moveloop_core() when on the level". */
export async function movebubbles() {
    const uz = game.u?.uz;

    /* set up the portal the first time bubbles are moved */
    if (!_wportal)
        set_wportal();

    vision_recalc(2);

    _hero_bubble = null;

    if (Is_waterlevel(uz)) {
        /* C mkmaze.c:1560-1646 — pick up everything inside of a bubble then
         * fill all bubble locations.  [Punished ball&chain handling
         * (unplacebc_and_covet_placebc / lift_covet_and_placebc) is not
         * ported.] */
        for (let b = _bubbles_up ? _bbubbles : _ebubbles; b;
             b = _bubbles_up ? b.next : b.prev) {
            if (b.cons)
                throw new Error('movebubbles: cons != null');
            for (let i = 0, x = b.x; i < b.bm[0]; i++, x++)
                for (let j = 0, y = b.y; j < b.bm[1]; j++, y++)
                    if (b.bm[j + 2] & (1 << i)) {
                        if (!isok(x, y))
                            continue;
                        const loc = game.level?.at(x, y);
                        if (!loc)
                            continue;
                        /* pick up objects, monsters, hero, and traps */
                        let otmp;
                        let olist = null;
                        while ((otmp = game.level?.levelObjects?.[x]?.[y]) != null) {
                            remove_object(otmp);
                            otmp.ox = otmp.oy = 0;
                            otmp.nexthere = olist;
                            olist = otmp;
                        }
                        if (olist)
                            b.cons = { x, y, what: 'obj', list: olist, next: b.cons };
                        const mon = m_at(x, y);
                        if (mon) {
                            b.cons = { x, y, what: 'mon', list: mon, next: b.cons };
                            if (mon.wormno)
                                remove_worm(mon);
                            else
                                mon._mapRemoved = true;
                            newsym(x, y); /* clean up old position */
                            mon.mx = mon.my = 0;
                            mon.mstate = ((mon.mstate | 0) | MON_BUBBLEMOVE) >>> 0;
                        }
                        if (!game.u.uswallow && game.u.ux === x && game.u.uy === y) {
                            b.cons = { x, y, what: 'hero', list: null, next: b.cons };
                            _hero_bubble = b;
                        }
                        const btrap = t_at(x, y);
                        if (btrap)
                            b.cons = { x, y, what: 'trap', list: btrap, next: b.cons };
                        /* levl[x][y] = water_pos */
                        loc.typ = WATER;
                        loc.lit = 0;
                        loc.seenv = 0;
                        loc.flags = 0;
                        loc.horizontal = false;
                        loc.waslit = false;
                        loc.roomno = 0;
                        loc.edge = false;
                        loc.remembered_glyph = water_memory_glyph();
                        block_point(x, y);
                    }
        }
    } else if (Is_airlevel(uz)) {
        for (let x = 1; x <= COLNO - 1; x++)
            for (let y = 0; y <= ROWNO - 1; y++) {
                const loc = game.level?.at(x, y);
                if (!loc) continue;
                /* C: levl[x][y] = air_pos — glyph S_cloud, typ AIR, lit 1,
                 * every other field zeroed. */
                loc.typ = AIR;
                loc.lit = 1;
                loc.seenv = 0;
                /* air_pos's FIRST field is cmap_b_to_glyph(S_cloud), i.e. the
                 * whole Air level is REMEMBERED as '#' even though its terrain
                 * is AIR; only the cells the hero can actually see are painted
                 * from the terrain (blank for AIR).  That memory is what fills
                 * C's screen with 1593 '#' cells this port left blank. */
                loc.remembered_glyph = { ch: '#', color: CLR_GRAY, decgfx: false };
                loc.flags = 0;
                loc.horizontal = false;
                loc.waslit = false;
                loc.roomno = 0;
                loc.edge = false;
                recalc_block_point(x, y);
                /* "all air or all cloud around the perimeter of the Air level
                   tends to look strange; break up the pattern" */
                const xedge = (x < gbxmin() || x > gbxmax());
                const yedge = (y < gbymin() || y > gbymax());
                if (xedge || yedge) {
                    if (!rn2(xedge ? 3 : 5)) {
                        loc.typ = CLOUD;
                        block_point(x, y);
                    }
                }
            }
    }

    /*
     * "Every second time traverse down.  This is because otherwise all the
     * junk that changes owners when bubbles overlap would eventually end up
     * in the last bubble in the chain."
     */
    _bubbles_up = !_bubbles_up;
    for (let b = _bubbles_up ? _bbubbles : _ebubbles; b;
         b = _bubbles_up ? b.next : b.prev) {
        const rx = rn2(3), ry = rn2(3);
        await mv_bubble(b, b.dx + 1 - (!b.dx ? rx : (rx ? 1 : 0)),
                  b.dy + 1 - (!b.dy ? ry : (ry ? 1 : 0)), false);
    }

    game.vision_full_recalc = 1;
}

// ═══════════════════════════════════════════════════════════════════════════
// stolen_booty() and its three statics — C ref: mkmaze.c:713-889.
//
// "A tragic accident has occurred in Frontier Town... It has been overrun by
// of the orcs that did this and have long since fled the level."
//
// fixup_special() (js/sp_lev.js) reaches this from exactly one arm —
// `u.uz.dnum == mines_dnum && gr.ransacked` — and gr.ransacked is set by
// check_ransacked() above, which is TRUE only while generating "minetn-1"
// (orctown) in the Gnomish Mines.  That arm was a bare
// `throw new Error('UNPORTED CALLEE: stolen_booty')`, so every recording that
// halt at this throw.
//
// RNG GROUND TRUTH.  The recorded C stream names every leaf's function and
// line, so the whole subsystem was written against it rather than guessed;
// the reference (rndorcname, then :820 rnd(4), :822 rn2(4) per candle, :823
// rnd(3), :826 rn1(4,LEATHER_GLOVES), :828 rnd(10), :831 rn1(33,TRIPE_RATION)
// per food slot, :843 rn2(2), makemon, shiny_orc_stuff :757/:764/:772,
// migrate_orc :732).  Every rejected food slot still costs its rn2(33), which
// is why the filter must be a FILTER and not a re-roll loop.
// ═══════════════════════════════════════════════════════════════════════════

/* C mkmaze.c:712 `#define ORC_LEADER 1` (undef'd again at :891). */
const ORC_LEADER = 1;
/* C mkmaze.c:713 `static const char *const orcfruit[] = ...` */
const orcfruit = ["paddle cactus", "dwarven root"];

const SB_TALLOW_CANDLE = 224, SB_WAX_CANDLE = 225, SB_SKELETON_KEY = 221;
const SB_LEATHER_GLOVES = 159, SB_GAUNTLETS_OF_DEXTERITY = 162;
const SB_TRIPE_RATION = 264, SB_CORPSE = 265, SB_EGG = 266;
const SB_SLIME_MOLD = 285, SB_LEMBAS_WAFER = 291;
const SB_K_RATION = 294, SB_C_RATION = 295, SB_TIN = 296;
const SB_LONG_SWORD = 54, SB_SILVER_SABER = 51;
const SB_GOLD_PIECE = 438, SB_ROCK = 474;
const SB_STRANGE_OBJECT = 0;
/* objclass.h oclass ids — the values js/objnam.js:71-86 and js/engrave.js:35-41
 * already agree on. */
const SB_RING_CLASS = 4, SB_FOOD_CLASS = 7, SB_GEM_CLASS = 13;
/* monflag.h:120 M2_ORC. */
const SB_M2_ORC = 0x00000080;

/* C mondata.h is_orc(ptr) — ((ptr)->mflags2 & M2_ORC) != 0 */
function _sb_is_orc(ptr) {
    return ((ptr?.mflags2 | 0) & SB_M2_ORC) !== 0;
}
/* C monst.h DEADMONSTER(mon) — ((mon)->mhp < 1) */
function _sb_DEADMONSTER(mon) {
    return (mon.mhp | 0) < 1;
}

/* C dungeon.c:1332-1335 dunlevs_in_dungeon(lev) and dungeon.c:1310 ledger_no.
 * Both are one-line reads of svd.dungeons[]; js/ already carries file-local
 * copies in js/makemon.js, js/dog.js, js/bones.js and js/cmd.js and exports
 * none of them, so these are file-local too rather than a fifth import path
 * invented for two callers. */
function _sb_dunlevs_in_dungeon(lev) {
    return (game.dungeons?.[lev?.dnum | 0]?.num_dunlevs | 0);
}
function _sb_ledger_no(lev) {
    return ((lev?.dlevel | 0) + (game.dungeons?.[lev?.dnum | 0]?.ledger_start | 0));
}

/* C dungeon.c:1796-1840 get_level(newlevel, levnum) — map a DEPTH to a
 * {dnum,dlevel}.  Written out in full (rather than assuming the mines) so the
 * three arms are visible, including C's own quirk in the second one: when
 * levnum runs past the end of the dungeon C assigns `num_dunlevs` — a DLEVEL —
 * to what was a DEPTH.  Port the bug (Cardinal Rule 1).
 *
 * The branch-up loop cannot fire for migrate_orc()'s callers, whose levnum is
 * clamped to [cur_depth, max_depth] inside the CURRENT dungeon, but it is
 * ported anyway; js/cmd.js:8632 keeps the same walk over the branch list. */
function _sb_get_level(levnum) {
    const g = game;
    const uz = g.u?.uz;
    let dgn = uz?.dnum | 0;
    const dungeons = g.dungeons || [];

    if (levnum <= 0) {
        /* C: can only currently happen in endgame */
        return { dnum: dgn, dlevel: uz?.dlevel | 0 };
    }
    const dg = dungeons[dgn] || { depth_start: 1, num_dunlevs: 30 };
    if (levnum > ((dg.depth_start | 0) + (dg.num_dunlevs | 0) - 1)) {
        /* C: beyond end of dungeon, jump to last level */
        return { dnum: dgn, dlevel: dg.num_dunlevs | 0 };
    }
    if (levnum < (dg.depth_start | 0)) {
        /* C: branch up the tree until we reach a dungeon containing levnum.
         * end2 is always the "child" and is unique. */
        const branches = g._dungeon_branches || g.branches || [];
        while (levnum < ((dungeons[dgn]?.depth_start | 0))) {
            let parent = -1;
            for (const br of branches) {
                if ((br.end2?.dnum ?? -1) === dgn) {
                    parent = br.end1.dnum | 0;
                    break;
                }
            }
            if (parent < 0)
                throw new Error("get_level: can't find parent dungeon"); /* C panics */
            dgn = parent;
        }
    }
    /* C: we're within the same dungeon; calculate the level */
    const finalDg = dungeons[dgn] || { depth_start: 1 };
    return { dnum: dgn, dlevel: levnum - (finalDg.depth_start | 0) + 1 };
}

/* migrate_orc — C ref: mkmaze.c:716-745.  Send the orc off to a level further
 * down the mines, so the hero meets the gang on the way to Mine's End rather
 * than all at once in orctown.  RNG: rn2(40) on the ORC_LEADER arm, rn2(range)
 * on the other. */
async function migrate_orc(mtmp, mflags) {
    const g = game;
    const uz = g.u?.uz;
    let nlev;
    const cur_depth = depth(uz) | 0;
    /* C: dunlevs_in_dungeon(&u.uz) + (svd.dungeons[u.uz.dnum].depth_start - 1) */
    const max_depth = _sb_dunlevs_in_dungeon(uz)
                      + ((g.dungeons?.[uz?.dnum | 0]?.depth_start | 0) - 1);

    if (mflags === ORC_LEADER) {
        nlev = max_depth;
        /* once in a blue moon, he won't be at the very bottom */
        if (!rn2(40))
            nlev--;
        mtmp.migflags = ((mtmp.migflags | 0) | MIGR_LEFTOVERS) >>> 0;
    } else {
        nlev = rn2((max_depth - cur_depth) + 1) + cur_depth;
        if (nlev === cur_depth)
            nlev++;
        if (nlev > max_depth)
            nlev = max_depth;
        mtmp.migflags = ((mtmp.migflags | 0) & ~MIGR_LEFTOVERS) >>> 0;
    }
    const dest = _sb_get_level(nlev);
    await migrate_to_level(mtmp, _sb_ledger_no(dest), MIGR_RANDOM, null);
}

/* shiny_orc_stuff — C ref: mkmaze.c:747-777.  Gold, a gem and (for the
 * captain, or 1 in 8 otherwise) a shiny ring, straight into minvent.
 * RNG: rn2(1000) + optional rnd(goldprob); rn2(1000) + optional mkobj;
 * optional rn2(8); shiny_obj()'s own rn2(maxprob). */
async function shiny_orc_stuff(mtmp) {
    let otmp;
    const is_captain = ((mtmp.mnum | 0) === PM_ORC_CAPTAIN);

    /* probabilities */
    const goldprob = is_captain ? 600 : 300;
    const gemprob = (goldprob / 4) | 0; /* C integer division */
    if (rn2(1000) < goldprob) {
        if ((otmp = (await mksobj(SB_GOLD_PIECE, true, false))) != null) {
            otmp.quan = 1 + rnd(goldprob);
            otmp.owt = weight(otmp);
            await add_to_minv(mtmp, otmp);
        }
    }
    if (rn2(1000) < gemprob) {
        if ((otmp = (await mkobj(SB_GEM_CLASS, false))) != null) {
            if ((otmp.otyp | 0) === SB_ROCK)
                await dealloc_obj(otmp);
            else
                await add_to_minv(mtmp, otmp);
        }
    }
    if (is_captain || !rn2(8)) {
        const otyp = shiny_obj(SB_RING_CLASS);
        if (otyp !== SB_STRANGE_OBJECT && (otmp = (await mksobj(otyp, true, false))) != null)
            await add_to_minv(mtmp, otmp);
    }
}

async function migr_booty_item(otyp, gang) {
    const otmp = await mksobj_migr_to_species(otyp, SB_M2_ORC, true, false);
    if (otmp && gang) {
        if (!otmp.oextra)
            otmp.oextra = {};
        otmp.oextra.oname = gang; /* C: new_oname() then Strcpy(ONAME(otmp), gang) */
        if ((MKOBJ_OC_CLASS[otyp] | 0) === SB_FOOD_CLASS) {
            if (otyp === SB_SLIME_MOLD) {
                /* C hack.h:1498 ROLL_FROM(array) = array[rn2(SIZE(array))] —
                 * drawn as fruitadd's ARGUMENT, so before fruitadd's own body
                 * (which is RNG-free unless the 127-fruit cap is hit). */
                otmp.spe = fruitadd(orcfruit[rn2(orcfruit.length)]);
            }
            otmp.quan += rn2(3);
            otmp.owt = weight(otmp);
        }
    }
}

/* stolen_booty — C ref: mkmaze.c:798-889. */
export async function stolen_booty() {
    const g = game;
    let mtmp, cnt, otyp;

    /* C mkmaze.c:818 `gang = rndorcname(gang_name)` — gang_name is a
     * `char[BUFSZ]`, i.e. non-NULL, so the naming loop always runs.  Pass ""
     * (the empty C buffer) rather than nothing: js/mhitm.js's port tests for
     * null/undefined and would skip 2*iend-1 draws on a bare call. */
    const gang = rndorcname("");

    /* create the stuff that the gang took */
    cnt = rnd(4);
    for (let i = 0; i < cnt; ++i)
        await migr_booty_item(rn2(4) ? SB_TALLOW_CANDLE : SB_WAX_CANDLE, gang);
    cnt = rnd(3);
    for (let i = 0; i < cnt; ++i)
        await migr_booty_item(SB_SKELETON_KEY, gang);
    otyp = rn1((SB_GAUNTLETS_OF_DEXTERITY - SB_LEATHER_GLOVES) + 1, SB_LEATHER_GLOVES);
    await migr_booty_item(otyp, gang);
    cnt = rnd(10);
    for (let i = 0; i < cnt; ++i) {
        /* Food items - but no lembas! (or some other weird things).
         * NOTE the rn1 fires for every slot, INCLUDING the rejected ones — C
         * does not re-roll, it just skips the item.  A "keep drawing until it
         * passes" loop would match the object list and desync the stream. */
        otyp = rn1(SB_TIN - SB_TRIPE_RATION + 1, SB_TRIPE_RATION);
        if (otyp !== SB_LEMBAS_WAFER
            /* exclude meat <anything>, globs of <anything>, kelp which all
               have random generation probability of 0 (K-/C-rations do too,
               but we want to include those) */
            && ((MKOBJ_OC_PROB[otyp] | 0) !== 0
                || otyp === SB_C_RATION || otyp === SB_K_RATION)
            /* exclude food items which utilize obj->corpsenm because that
               field is going to be overloaded for delivery purposes */
            && otyp !== SB_CORPSE && otyp !== SB_EGG && otyp !== SB_TIN)
            await migr_booty_item(otyp, gang);
    }
    await migr_booty_item(rn2(2) ? SB_LONG_SWORD : SB_SILVER_SABER, gang);

    /* create the leader of the orc gang */
    mtmp = await makemon(PM_ORC_CAPTAIN, 0, 0, MM_NONAME);
    if (mtmp) {
        mtmp = christen_monst(mtmp, upstart(gang));
        mtmp.mpeaceful = 0;
        set_malign(mtmp);
        await shiny_orc_stuff(mtmp);
        await migrate_orc(mtmp, ORC_LEADER);
    }

    /* Make most of the orcs on the level be part of the invading gang */
    for (mtmp = g.fmon; mtmp; mtmp = mtmp.nmon) {
        if (_sb_DEADMONSTER(mtmp))
            continue;

        if (_sb_is_orc(mtmp.data) && !has_mgivenname(mtmp) && rn2(10)) {
            /* We'll consider the orc captain from the level description to be
               the captain of a rival orc horde who is there to see what has
               transpired, and to contemplate future action.

               Don't christen the orc captain as a subordinate member of the
               main orc horde. */
            if ((mtmp.mnum | 0) !== PM_ORC_CAPTAIN)
                mtmp = christen_orc(mtmp, upstart(gang), "");
        }
    }

    /* Lastly, ensure there's several more orcs from the gang along the way.
     * The mechanics are such that they aren't actually identified as members
     * of the invading gang until they get their spoils assigned to the
     * inventory; handled during that assignment (makemon.c:1469 ->
     * deliver_obj_to_mon, js/mklev.js). */
    cnt = rn2(10) + 5;
    for (let i = 0; i < cnt; ++i) {
        const mtyp = rn2((PM_ORC_SHAMAN - PM_ORC) + 1) + PM_ORC;
        mtmp = await makemon(mtyp, 0, 0, MM_NONAME);
        if (mtmp) {
            await shiny_orc_stuff(mtmp);
            await migrate_orc(mtmp, 0);
        }
    }
    g.ransacked = 0;
}
