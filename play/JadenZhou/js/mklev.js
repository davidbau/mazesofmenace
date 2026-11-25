// mklev.js — Level generation.
// C ref: mklev.c — makelevel, makerooms, makecorridors, generate_stairs.
// Also includes parts of sp_lev.c (create_room) and mkmap.c (litstate_rnd).
// Stripped-down version for contest: generates regular dungeon levels with
// room placement, corridors, doors, stairs, niches, and fill.
// Uses the real game PRNG (not a separate layout PRNG) for bit-exact parity.

import { game } from './gstate.js';
import { begin_burn } from './timeout.js';
import { GameMap } from './game.js';
import { rn2, rnd, rn1 } from './rng.js';
import { init_rect, rnd_rect, get_rect, split_rects, within_bounded_area } from './rect.js';
import { depth as depth_of_level } from './hacklib.js';
import { Is_branchlev, In_hell, level_difficulty, on_level, dungeon_branch,
         dunlev, dunlevs_in_dungeon, Is_special,
         at_dgn_entrance, insert_branch, is_wizard_mode,
         induced_align, find_level, init_mapseen } from './dungeon.js';
import { makemaz, mazexy, mkportal } from './mkmaze.js';
import { PM_LEPRECHAUN, PM_KILLER_BEE, PM_SOLDIER, PM_COCKATRICE, S_HUMAN,
         PM_SMALL_MIMIC, PM_LARGE_MIMIC, PM_GIANT_MIMIC, S_MIMIC,
         PM_ELF, PM_DWARF, PM_ORC, PM_GNOME, PM_HUMAN, PM_ARCHEOLOGIST,
         PM_WIZARD, PM_GIANT_SPIDER, mons } from './monsters.js';
import { set_levltyp } from './mkmaze.js';
import { ROLL_FROM } from './rng.js';
import { nhl_init, nhl_loadlua, nhl_done, nhl_pcall_handle,
         NHLpa_panic, NHLpa_impossible } from './nhlua.js';
import { litstate_rnd } from './mkmap.js';
import { make_engr_at, wipe_engr_at, make_grave, random_engraving } from './engrave.js';
import { create_des_coder, reset_xystart_size, fill_special_room, inside_room,
         SPLEV_LEFT, SPLEV_CENTER, SPLEV_RIGHT, TOP, BOTTOM } from './sp_lev.js';
import { getbones } from './bones.js';
import { u_on_rndspot } from './do.js';
import { set_wall_state, see_nearby_objects } from './display.js';
import {
    COLNO, ROWNO, STONE, ROOM, CORR, DOOR, STAIRS,
    HWALL, VWALL, TLCORNER, TRCORNER, BLCORNER, BRCORNER,
    CROSSWALL, TUWALL, TDWALL, TLWALL, TRWALL,
    D_NODOOR, D_CLOSED, D_ISOPEN, D_LOCKED, D_TRAPPED,
    OROOM, VAULT, THEMEROOM, ROOMOFFSET, MAXNROFROOMS, SHARED,
    SDOOR, SCORR, IRONBARS, FOUNTAIN, SINK, ALTAR, GRAVE,
    DIR_N, DIR_S, DIR_E, DIR_W, DIR_180,
    IS_WALL, IS_STWALL, IS_DOOR, IS_OBSTRUCTED, IS_FURNITURE, IS_POOL,
    SPACE_POS, isok, W_NONDIGGABLE, W_NONPASSWALL, FILL_NORMAL,
    ICE, MOAT, POOL, WATER, LAVAPOOL, LAVAWALL, DBWALL,
    A_LAWFUL, Align2amask,
    LR_UPTELE, LR_TELE, LR_DOWNTELE, LR_BRANCH, LR_PORTAL, LR_DOWNSTAIR,
    LR_UPSTAIR, AIR, MAX_TYPE, NHL_SB_SAFE, G_GONE, SHOPBASE, COURT, LEPREHALL, ZOO, TEMPLE,
    BEEHIVE, MORGUE, ANTHOLE, BARRACKS, SWAMP, COCKNEST, DUST, MARK,
    TAINT_AGE, MM_NOGRP, NO_MM_FLAGS, MKTRAP_NOFLAGS, MKTRAP_SEEN,
    MKTRAP_MAZEFLAG, MKTRAP_NOSPIDERONWEB, MKTRAP_NOVICTIM, LA_UP, LA_DOWN,
    BR_PORTAL, BR_NO_END1, BR_NO_END2,
} from './const.js';

// Object classes and object numbers: objects.js
import {
    RANDOM_CLASS, WEAPON_CLASS, ARMOR_CLASS, RING_CLASS, FOOD_CLASS,
    SCROLL_CLASS, POTION_CLASS, TOOL_CLASS, GEM_CLASS, BOULDER, GOLD_PIECE,
    ROCK, KELP_FROND, SCR_TELEPORTATION, BELL, CORPSE, STATUE,
    POT_HEALING, POT_EXTRA_HEALING, POT_SPEED, POT_GAIN_ENERGY,
    SCR_ENCHANT_WEAPON, SCR_ENCHANT_ARMOR, SCR_CONFUSE_MONSTER,
    SCR_SCARE_MONSTER, WAN_DIGGING, SPE_HEALING, LARGE_BOX, CHEST,
    FOOD_RATION, CRAM_RATION, LEMBAS_WAFER,
    ARROW, DART, TALLOW_CANDLE, WAX_CANDLE, objects, WAND_CLASS, SPBOOK_CLASS,
} from './objects.js';
import {
    SPBOOK_no_NOVEL, next_ident, blessorcurse, curse, mksobj, mksobj_at,
    mkobj, mkobj_at, mkgold, mkcorpstat, rndmonnum, set_corpsenm,
    CORPSTAT_INIT, weight, add_to_container, mk_tt_object,
} from './mkobj.js';
import { mkclass, makemon, m_at, sobj_at, set_malign, mongets, ndemon, is_pool,
         is_lava, set_mimic_sym } from './makemon.js';
import { in_rooms } from './hack.js';
import { priestini } from './priest.js';
import { dist2, distmin } from './hacklib.js';
import { del_engr_at } from './engrave.js';
import {
    PM_OGRE_TYRANT, PM_ELVEN_MONARCH, PM_DWARF_RULER, PM_GNOME_RULER,
    PM_QUEEN_BEE, PM_GIANT_EEL, PM_PIRANHA, PM_ELECTRIC_EEL, PM_GHOST,
    PM_WRAITH, PM_SOLDIER_ANT, PM_FIRE_ANT, PM_GIANT_ANT, PM_SERGEANT,
    PM_LIEUTENANT, PM_CAPTAIN, PM_BUGBEAR, PM_HOBGOBLIN, S_DEMON, S_VAMPIRE,
    S_ZOMBIE, S_FUNGUS, S_DRAGON, S_GIANT, S_TROLL, S_CENTAUR, S_ORC,
    S_GNOME, S_KOBOLD,
} from './monsters.js';
import {
    IS_THRONE, THRONE, IS_ROOM, OBJ_AT, AM_SHRINE, MM_ASLEEP, A_NONE, NON_PM,
    Is_earthlevel, RLOC_NOMSG,
} from './const.js';
import { rloc } from './teleport.js';
import { MACE, LUMP_OF_ROYAL_JELLY } from './objects.js';
import { makeroguerooms, makerogueghost } from './extralev.js';
import { add_to_buried } from './dig.js';
import { shtypes } from './shknam.js';
import {
    NO_TRAP, TRAPNUM, ARROW_TRAP, DART_TRAP, ROCKTRAP, SQKY_BOARD, LANDMINE,
    ROLLING_BOULDER_TRAP, SLP_GAS_TRAP, RUST_TRAP, FIRE_TRAP, PIT, SPIKED_PIT,
    HOLE, TRAPDOOR, TELEP_TRAP, LEVEL_TELEP, MAGIC_PORTAL, WEB, STATUE_TRAP,
    MAGIC_TRAP, POLY_TRAP, VIBRATING_SQUARE, TRAPPED_DOOR, TRAPPED_CHEST,
    BEAR_TRAP, is_hole, is_pit, maketrap, t_at, deltrap, undestroyable_trap,
} from './trap.js';
import { Blind, Hallucination } from './youprop.js';
import { oinit } from './o_init.js';
import { Is_earthlevel as Is_earthlevel_mk, W_NONPASSWALL as W_NONPASSWALL_MK } from './const.js';

const XLIM = 4;
const YLIM = 3;

// Direction deltas
const xdir = [-1, -1, 0, 1, 1, 1, 0, -1];
const ydir = [0, -1, -1, -1, 0, 1, 1, 1];


// Stairway list management
export function stairway_add(x, y, up, isladder, dest) {
    const node = { sx: x, sy: y, up, isladder, tolev: { ...dest },
                   u_traversed: false, next: game.stairs };
    game.stairs = node;
}

// ── Stairway lookup ──

// C ref: stairs.c stairway_find_from()
export function stairway_find_from(fromdlev, isladder) {
    for (let s = game.stairs; s; s = s.next)
        if (s.tolev.dnum === fromdlev.dnum
            && s.tolev.dlevel === fromdlev.dlevel
            && !!s.isladder === !!isladder)
            return s;
    return null;
}

// C ref: stairs.c stairway_find()
export function stairway_find(fromdlev) {
    let stway = game.stairs;

    while (stway) {
        if (stway.tolev.dnum === fromdlev.dnum
            && stway.tolev.dlevel === fromdlev.dlevel)
            break;
        stway = stway.next;
    }
    return stway || null;
}

// C ref: stairs.c stairway_find_dir()
export function stairway_find_dir(up) {
    for (let s = game.stairs; s; s = s.next)
        if (!!s.up === !!up) return s;
    return null;
}

// C ref: stairs.c stairway_find_special_dir()
export function stairway_find_special_dir(up) {
    for (let s = game.stairs; s; s = s.next)
        if (s.tolev.dnum !== (game.u?.uz?.dnum ?? 0) && !!s.up !== !!up) return s;
    return null;
}

// ── Hero placement (C ref: stairs.c, mkmaze.c) ──

// C ref: dungeon.c u_on_newpos()
export function u_on_newpos(x, y) {
    const u = game.u;
    if (!isok(x, y)) /* validate location */
        throw new Error(`u_on_newpos: trying to place hero off map <${x},${y}>`);
    u.ux = x;
    u.uy = y;
    /* cliparound(u.ux, u.uy): CLIPPING is display only */
    u.uundetected = 0;
    /* ridden steed always shares hero's location */
    if (u.usteed)
        u.usteed.mx = u.ux, u.usteed.my = u.uy;
    /* when changing levels, don't leave old position set with
       stale values from previous level */
    if (u.uz0 && !on_level(u.uz, u.uz0)) {
        u.ux0 = u.ux, u.uy0 = u.uy;
        /* map_location(u.ux, u.uy, FALSE): display only, the arrival
           docrt() redraws the map */
        if (game.iflags) game.iflags.terrain_typ = MAX_TYPE; /* "none of the above" value */
    } else {
        /* still on same level; might have come close enough to
           generic object(s) to redisplay them as specific objects */
        if (!Blind() && !Hallucination() && !u.uswallow)
            see_nearby_objects();
    }
    /* earth_sense(): no rolls; buried-object feedback isn't ported yet */
}

// C ref: mkmaze.c is_exclusion_zone()
function is_exclusion_zone(type, x, y) {
    let ez = game.exclusion_zones;

    while (ez) {
        if (((type === LR_DOWNTELE
              && (ez.zonetype === LR_DOWNTELE || ez.zonetype === LR_TELE))
             || (type === LR_UPTELE
                 && (ez.zonetype === LR_UPTELE || ez.zonetype === LR_TELE))
             || type === ez.zonetype)
            && within_bounded_area(x, y, ez.lx, ez.ly, ez.hx, ez.hy))
            return true;
        ez = ez.next;
    }
    return false;
}

// C ref: mkmaze.c bad_location()
/*
 * Bad if:
 *      pos is occupied OR
 *      pos is inside restricted region (nlx,nly,nhx,nhy) OR
 *      NOT (pos is corridor and a maze level OR pos is a room OR pos is air)
 */
function bad_location(x, y, nlx, nly, nhx, nhy) {
    const typ = game.level.at(x, y).typ;
    return !!(occupied(x, y)
              || within_bounded_area(x, y, nlx, nly, nhx, nhy)
              || !((typ === CORR && game.level.flags.is_maze_lev)
                   || typ === ROOM
                   || typ === AIR));
}

// C ref: mkmaze.c place_lregion()
/* pick a location in area (lx, ly, hx, hy) but not in (nlx, nly, nhx, nhy)
   and place something (based on rtype) in that region */
export async function place_lregion(lx, ly, hx, hy, nlx, nly, nhx, nhy, rtype, lev) {
    let trycnt;
    let oneshot;
    let x, y;

    if (!lx) { /* default to whole level */
        /*
         * if there are rooms and this a branch, let place_branch choose
         * the branch location (to avoid putting branches in corridors).
         */
        if (rtype === LR_BRANCH && game.level.nroom) {
            place_branch(Is_branchlev(game.u.uz), 0, 0);
            return;
        }

        lx = 1; /* column 0 is not used */
        hx = COLNO - 1;
        ly = 0; /* 3.6.0 and earlier erroneously had 1 here */
        hy = ROWNO - 1;
    }

    /* clamp the area to the map */
    if (lx < 1)
        lx = 1;
    if (hx > COLNO - 1)
        hx = COLNO - 1;
    if (ly < 0)
        ly = 0;
    if (hy > ROWNO - 1)
        hy = ROWNO - 1;

    /* first a probabilistic approach */

    oneshot = (lx === hx && ly === hy);
    for (trycnt = 0; trycnt < 200; trycnt++) {
        x = rn1((hx - lx) + 1, lx);
        y = rn1((hy - ly) + 1, ly);
        if (await put_lregion_here(x, y, nlx, nly, nhx, nhy, rtype, oneshot, lev))
            return;
    }

    /* then a deterministic one */

    for (x = lx; x <= hx; x++)
        for (y = ly; y <= hy; y++)
            if (await put_lregion_here(x, y, nlx, nly, nhx, nhy, rtype, true, lev))
                return;

    /* impossible("Couldn't place lregion type %d!", rtype) */
}

// C ref: mkmaze.c put_lregion_here()
async function put_lregion_here(x, y, nlx, nly, nhx, nhy, rtype, oneshot, lev) {
    let mtmp;

    if (bad_location(x, y, nlx, nly, nhx, nhy)
        || is_exclusion_zone(rtype, x, y)) {
        if (!oneshot) {
            return false; /* caller should try again */
        } else {
            /* Must make do with the only location possible;
               avoid failure due to a misplaced trap.
               It might still fail if there's a dungeon feature here. */
            const t = t_at(x, y);

            if (t && !undestroyable_trap(t.ttyp)) {
                if (((mtmp = m_at(x, y)) != null) && mtmp.mtrapped)
                    mtmp.mtrapped = 0;
                deltrap(t);
            }
            if (bad_location(x, y, nlx, nly, nhx, nhy)
                || is_exclusion_zone(rtype, x, y))
                return false;
        }
    }
    switch (rtype) {
    case LR_TELE:
    case LR_UPTELE:
    case LR_DOWNTELE:
        /* "something" means the player in this case */
        if ((mtmp = m_at(x, y)) != null) {
            /* move the monster if no choice, or just try again */
            if (oneshot) {
                if (!(await rloc(mtmp, RLOC_NOMSG)))
                    throw new Error('put_lregion_here(): m_into_limbo() not ported yet');
            } else
                return false;
        }
        u_on_newpos(x, y);
        break;
    case LR_PORTAL:
        mkportal(x, y, lev.dnum, lev.dlevel);
        break;
    case LR_DOWNSTAIR:
    case LR_UPSTAIR:
        mkstairs(x, y, rtype, null, false); /* (char) rtype: LR_UPSTAIR is 1 */
        break;
    case LR_BRANCH:
        place_branch(Is_branchlev(game.u.uz), x, y);
        break;
    }
    return true;
}

// C ref: stairs.c u_on_sstairs()
/* place you on the special staircase */
export async function u_on_sstairs(upflag) {
    const stway = stairway_find_special_dir(upflag);

    if (stway)
        u_on_newpos(stway.sx, stway.sy);
    else
        await u_on_rndspot(upflag);
}

// C ref: stairs.c u_on_upstairs()
/* place you on upstairs (or special equivalent) */
export async function u_on_upstairs() {
    const stway = stairway_find_dir(true);

    if (stway)
        u_on_newpos(stway.sx, stway.sy);
    else
        await u_on_sstairs(0); /* destination upstairs implies moving down */
}

// C ref: stairs.c u_on_dnstairs()
/* place you on dnstairs (or special equivalent) */
export async function u_on_dnstairs() {
    const stway = stairway_find_dir(false);

    if (stway)
        u_on_newpos(stway.sx, stway.sy);
    else
        await u_on_sstairs(1); /* destination dnstairs implies moving up */
}

// C ref: o_init.c oinit() -- level dependent obj probabilities (o_init.js)


// ============================================================
// Stub functions for object/monster/trap creation
// These consume the exact RNG calls that C makes.
// ============================================================


// C ref: mkobj.c place_object() -- the level's floor object chain (fobj)
// is game.level.objects, newest first; per-square piles are read from it
// in the same order (boulder-first pile ordering isn't ported yet).
function place_object(otmp, x, y) {
    otmp.ox = x;
    otmp.oy = y;
    otmp.where = 'OBJ_FLOOR';
    /* otmp->nobj = fobj; fobj = otmp; */
    if (!game.level.objects) game.level.objects = [];
    game.level.objects.unshift(otmp);
}
// C ref: mkobj.c dealloc_obj() -- nothing to free in JS
function dealloc_obj(otmp) { /* garbage collected */ }
/* weight(), add_to_container(): mkobj.js; sobj_at(): makemon.js;
   add_to_buried(): dig.js */
/* mazexy(): mkmaze.js */


/* in_rooms(): hack.js */

// ============================================================
// Core mklev functions (ported from main project's mklev.js)
// ============================================================

// C ref: mklev.c mklev()
export async function mklev() {
    const g = game;
    /* reseed_random(rn2); reseed_random(rn2_on_display_rng): no-ops unless
       has_strong_rngseed, which a fixed-seed game doesn't have */
    init_mapseen(g.u.uz);
    if (await getbones()) return;
    g.in_mklev = true;
    await makelevel();
    /* C's mklev() doesn't recount fountains/sinks here: nfountains and
       nsinks come from mkfount()/mksink() (and load_special() for special
       levels), so a themed room's des.feature("fountain") isn't counted */
    level_finalize_topology();
    g.in_mklev = false;
}

// C ref: mklev.c count_level_features()
export function count_level_features() {
    const lvl = game.level;
    if (!lvl?.flags) return;
    let nfountains = 0, nsinks = 0;
    for (let y = 0; y < ROWNO; y++)
        for (let x = 1; x < COLNO; x++) {
            const typ = lvl.at(x, y)?.typ;
            if (typ === FOUNTAIN) nfountains++;
            if (typ === SINK) nsinks++;
        }
    lvl.flags.nfountains = nfountains;
    lvl.flags.nsinks = nsinks;
}

// C ref: mklev.c clear_level_structures()
function clear_level_structures() {
    const g = game;
    g.fmon = null;
    g.level = new GameMap();
    g.level.nroom = 0;
    g.level.rooms = [];
    g.level.nsubroom = 0;
    g.level.subrooms = [];
    g.made_branch = false;
    g.smeq = new Array(MAXNROFROOMS + 1).fill(0);
    g.level.doorindex = 0;
    g.level.doors = [];
    g.stairs = null;
    g.vault_x = -1;
    const lf = g.level.flags;
    lf.nfountains = 0;
    lf.nsinks = 0;
    lf.has_shop = false;
    lf.has_vault = false;
    lf.has_zoo = false;
    lf.has_court = false;
    lf.has_morgue = false;
    lf.graveyard = false;
    lf.has_beehive = false;
    lf.has_barracks = false;
    lf.has_temple = false;
    lf.has_swamp = false;
    lf.noteleport = false;
    lf.hardfloor = false;
    lf.nommap = false;
    lf.hero_memory = true;
    lf.shortsighted = false;
    lf.sokoban_rules = false;
    lf.is_maze_lev = false;
    lf.is_cavernous_lev = false;
    lf.arboreal = false;
    lf.has_town = false;
    lf.wizard_bones = false;
    lf.corrmaze = false;
    lf.temperature = 0;
    lf.rndmongen = true;
    lf.deathdrops = true;
    lf.noautosearch = false;
    lf.fumaroles = false;
    lf.stormy = false;
    lf.stasis_until = 0;
    init_rect();
    if (g.lev_message) {
        g.lev_message = null; /* free(gl.lev_message) */
    }
}


// C ref: mklev.c makelevel()
async function makelevel() {
    const g = game;
    oinit();
    clear_level_structures();

    const slev = Is_special(g.u.uz);
    const medusa = g.dungeon_topology.d_medusa_level; /* C: medusa_level */
    /* check for special levels */
    if (slev && !Is_rogue_level(g.u.uz)) {
        await makemaz(slev.proto);
    } else if (g.dungeons[g.u.uz.dnum].proto) {
        await makemaz('');
    } else if (g.dungeons[g.u.uz.dnum].fill_lvl) {
        await makemaz(g.dungeons[g.u.uz.dnum].fill_lvl);
    } else if (In_quest(g.u.uz)) {
        let fillname;
        let loc_lev;

        fillname = `${g.urole.filecode}-loca`;
        loc_lev = find_level(fillname);

        fillname = `${g.urole.filecode}-fil`;
        fillname += (g.u.uz.dlevel < loc_lev.dlevel.dlevel) ? 'a' : 'b';
        await makemaz(fillname);
    } else if (In_hell(g.u.uz)
               || (rn2(5) && g.u.uz.dnum === medusa.dnum
                   && depth_of_level(g.u.uz) > depth_of_level(medusa))) {
        await makemaz('');
    } else {
        /* otherwise, fall through - it's a "regular" level. */
        const u_depth = depth_of_level(g.u.uz);

        if (Is_rogue_level(g.u.uz)) {
            makeroguerooms();
            makerogueghost();
        } else {
            await makerooms();
        }
        sort_rooms();

        await generate_stairs(); /* up and down stairs */

        const branchp = Is_branchlev(g.u.uz); /* possible dungeon branch */
        let room_threshold = branchp ? 4 : 3; /* minimum number of rooms needed
                                                to allow a random special room */
        skip0: { /* the block ends at C's skip0 label */
        if (Is_rogue_level(g.u.uz))
            break skip0; /* goto skip0 */
        makecorridors();
        await make_niches();

        /* make a secret treasure vault, not connected to the rest */
        if (do_vault()) {
            const w = { v: 1 }, h = { v: 1 };
            const vx = { v: g.vault_x }, vy = { v: g.vault_y };
            let fill_vault = false;

            /* debugpline0("trying to make a vault..."); */
            /* check_room() adjusts gv.vault_x and gv.vault_y through pointers */
            fill_vault = check_room(vx, w, vy, h, true);
            g.vault_x = vx.v; g.vault_y = vy.v;
            if (!fill_vault && rnd_rect() && create_vault()) {
                g.vault_x = vx.v = g.level.rooms[g.level.nroom].lx;
                g.vault_y = vy.v = g.level.rooms[g.level.nroom].ly;
                fill_vault = check_room(vx, w, vy, h, true);
                g.vault_x = vx.v; g.vault_y = vy.v;
                if (!fill_vault)
                    g.level.rooms[g.level.nroom].hx = -1;
            }
            if (fill_vault) { /* fill_vault: */
                add_room(g.vault_x, g.vault_y,
                         g.vault_x + w.v, g.vault_y + h.v,
                         true, VAULT, false);
                g.level.flags.has_vault = true;
                ++room_threshold;
                g.level.rooms[g.level.nroom - 1].needfill = FILL_NORMAL;
                fill_special_room(g.level.rooms[g.level.nroom - 1]);
                mk_knox_portal(g.vault_x + w.v, g.vault_y + h.v);
                if (!g.level.flags.noteleport && !rn2(3))
                    await makevtele();
            }
        }

        /* make up to 1 special room, with type dependent on depth;
           note that mkroom doesn't guarantee a room gets created, and that
           this step only sets the room's rtype - it doesn't fill it yet. */
        /* (wizard && nh_getenv("SHOPTYPE")): the JS port has no environment */
        if (u_depth > 1 && u_depth < depth_of_level(g.dungeon_topology.d_medusa_level)
            && g.level.nroom >= room_threshold && rn2(u_depth) < 3)
            await do_mkroom(SHOPBASE);
        else if (u_depth > 4 && !rn2(6))
            await do_mkroom(COURT);
        else if (u_depth > 5 && !rn2(8)
                 && !(g.mvitals[PM_LEPRECHAUN].mvflags & G_GONE))
            await do_mkroom(LEPREHALL);
        else if (u_depth > 6 && !rn2(7))
            await do_mkroom(ZOO);
        else if (u_depth > 8 && !rn2(5))
            await do_mkroom(TEMPLE);
        else if (u_depth > 9 && !rn2(5)
                 && !(g.mvitals[PM_KILLER_BEE].mvflags & G_GONE))
            await do_mkroom(BEEHIVE);
        else if (u_depth > 11 && !rn2(6))
            await do_mkroom(MORGUE);
        else if (u_depth > 12 && !rn2(8) && antholemon())
            await do_mkroom(ANTHOLE);
        else if (u_depth > 14 && !rn2(4)
                 && !(g.mvitals[PM_SOLDIER].mvflags & G_GONE))
            await do_mkroom(BARRACKS);
        else if (u_depth > 15 && !rn2(6))
            await do_mkroom(SWAMP);
        else if (u_depth > 16 && !rn2(8)
                 && !(g.mvitals[PM_COCKATRICE].mvflags & G_GONE))
            await do_mkroom(COCKNEST);
        } /* skip0 */

        /* skip0: */
        const prevstairs = game.stairs; /* used to test for place_branch() success */
        /* Place multi-dungeon branch. */
        if (branchp) {
            place_branch(branchp, 0, 0);
        }

        /* for main dungeon level 1, the stairs up where the hero starts
           are branch stairs; treat them as if hero had just come down
           them by marking them as having been traversed; most recently
           created stairway is held in 'gs.stairs' */
        if (g.u.uz.dnum === 0 && g.u.uz.dlevel === 1 && game.stairs !== prevstairs)
            game.stairs.u_traversed = true;

        /* some levels have specially generated items in ordinary
           rooms (intended to be indistinguishable from the normally
           generated items); work out which room these will be placed in */
        let fillable_room_count = 0;
        for (let i = 0; i < g.level.nroom; i++) {
            if (ROOM_IS_FILLABLE(g.level.rooms[i]))
                fillable_room_count++;
        }
        /* choose a random fillable room to be the one that gets the
           bonus items, if there are any; if there aren't any we don't
           generate the bonus items (but levels with no fillable rooms
           typically don't have any bonus items to generate anyway) */
        g.bonus_item_room_countdown = fillable_room_count
                                      ? rn2(fillable_room_count) : -1;

        /* for each room: put things inside */
        for (let ri = 0; ri < g.level.rooms.length; ri++) {
            const croom = g.level.rooms[ri];
            if (!croom || !(croom.hx > 0))
                break;
            const fillable = ROOM_IS_FILLABLE(croom);

            fill_ordinary_room(croom,
                               fillable && g.bonus_item_room_countdown === 0);
            if (fillable)
                --g.bonus_item_room_countdown;
        }
    }

    /* Fill all special rooms now, regardless of whether this is a special
     * level, proto level, or ordinary level. */
    for (let i = 0; i < g.level.nroom; ++i) {
        fill_special_room(g.level.rooms[i]);
    }

    themerooms_post_level_generate();

    /* gl.luacore && nhcb_counts[NHCB_LVL_ENTER]: no level-enter callbacks
       are registered by this port's nhcore */
}

// C ref: mklev.c themerooms_post_level_generate()
function themerooms_post_level_generate() {
    const g = game;
    const themes = g.luathemes ? g.luathemes[g.u.uz.dnum] : null;

     /* themes should already be loaded by makerooms();
      * if not, we don't run this either */
    if (!themes)
        return;

    reset_xystart_size();
    g.iflags.in_lua = g.in_mk_themerooms = true;
    g.themeroom_failed = false;
    nhl_pcall_handle(themes, themes.globals.post_level_generate, [],
                     'post_level_generate', NHLpa_panic);
    g.iflags.in_lua = g.in_mk_themerooms = false;

    wallification(1, 0, COLNO - 1, ROWNO - 1);
    if (g.coder)
        g.coder = null; /* free(gc.coder), gc.coder = NULL */
}

// C ref: mklev.c ROOM_IS_FILLABLE()
function ROOM_IS_FILLABLE(croom) {
    return ((croom.rtype === OROOM || croom.rtype === THEMEROOM)
            && croom.needfill === FILL_NORMAL);
}

// C ref: mklev.c do_vault()
function do_vault() {
    return game.vault_x !== -1;
}

// C ref: mklev.c makevtele()
async function makevtele() {
    await makeniche(TELEP_TRAP);
}

// C ref: mklev.c mk_knox_portal()
/* Place a magic portal to Fort Ludios on a level with a vault */
function mk_knox_portal(x, y) {
    let source;
    let u_depth;

    const br = dungeon_branch('Fort Ludios');
    /* dungeon_branch() panics (so never returns) if result would be Null */

    if (on_level(game.dungeon_topology.d_knox_level, br.end1)) {
        source = br.end2;
    } else {
        /* disallow Knox branch on a level with one branch already */
        if (Is_branchlev(game.u.uz))
            return;
        source = br.end1;
    }

    /* Already set or 2/3 chance of deferring until a later level. */
    if (source.dnum < game.n_dgns || (rn2(3) && !is_wizard_mode()))
        return;

    if (!(game.u.uz.dnum === game.dungeon_topology.d_oracle_level.dnum /* in main dungeon */
          && !at_dgn_entrance('The Quest')    /* but not Quest's entry */
          && (u_depth = depth_of_level(game.u.uz)) > 10    /* beneath 10 */
          && u_depth < depth_of_level(game.dungeon_topology.d_medusa_level))) /* and above Medusa */
        return;

    /* Adjust source to be current level and re-insert branch. */
    source.dnum = game.u.uz.dnum;
    source.dlevel = game.u.uz.dlevel;
    insert_branch(br, true);

    /* debugpline0("Made knox portal."); */
    place_branch(br, x, y);
}

// C ref: mkroom.c isbig()
function isbig(sroom) {
    const area = (sroom.hx - sroom.lx + 1)
                        * (sroom.hy - sroom.ly + 1);

    return (area > 20);
}

// C ref: mkroom.c do_mkroom()
/* make and stock a room of a given type */
async function do_mkroom(roomtype) {
    if (roomtype >= SHOPBASE) {
        mkshop(); /* someday, we should be able to specify shop type */
    } else {
        switch (roomtype) {
        case COURT:
            mkzoo(COURT);
            break;
        case ZOO:
            mkzoo(ZOO);
            break;
        case BEEHIVE:
            mkzoo(BEEHIVE);
            break;
        case MORGUE:
            mkzoo(MORGUE);
            break;
        case BARRACKS:
            mkzoo(BARRACKS);
            break;
        case SWAMP:
            mkswamp();
            break;
        case TEMPLE:
            await mktemple();
            break;
        case LEPREHALL:
            mkzoo(LEPREHALL);
            break;
        case COCKNEST:
            mkzoo(COCKNEST);
            break;
        case ANTHOLE:
            mkzoo(ANTHOLE);
            break;
        default:
            console.error(`impossible: Tried to make a room of type ${roomtype}.`);
        }
    }
}

// C ref: mkroom.c pick_room()
/* pick an unused room, preferably with only one door */
function pick_room(strict) {
    const g = game;
    let sroom;
    let i = g.level.nroom;

    for (let ri = rn2(g.level.nroom); i--; ri++) {
        if (ri === g.level.nroom)
            ri = 0;
        sroom = g.level.rooms[ri];
        if (sroom.hx < 0)
            return null;
        if (sroom.rtype !== OROOM)
            continue;
        if (!strict) {
            if (has_upstairs(sroom) || (has_dnstairs(sroom) && rn2(3)))
                continue;
        } else if (has_upstairs(sroom) || has_dnstairs(sroom))
            continue;
        if (sroom.doorct === 1 || !rn2(5) || is_wizard_mode())
            return sroom;
    }
    return null;
}

// C ref: mkroom.c mkzoo()
function mkzoo(type) {
    let sroom;

    if ((sroom = pick_room(false)) !== null) {
        sroom.rtype = type;
        /* room does not get stocked at this time - it will get stocked at the
         * end of makelevel() */
        sroom.needfill = FILL_NORMAL;
    }
}

// C ref: mkroom.c mk_zoo_thronemon()
function mk_zoo_thronemon(x, y) {
    const i = rnd(level_difficulty());
    const pm = (i > 9) ? PM_OGRE_TYRANT
        : (i > 5) ? PM_ELVEN_MONARCH
        : (i > 2) ? PM_DWARF_RULER
        : PM_GNOME_RULER;
    const mon = makemon(mons[pm], x, y, NO_MM_FLAGS);

    if (mon) {
        mon.msleeping = 1;
        mon.mpeaceful = 0;
        set_malign(mon);
        /* Give him a sceptre to pound in judgment */
        mongets(mon, MACE);
    }
}

// C ref: mkroom.c fill_zoo()
export function fill_zoo(sroom) {
    const g = game;
    const levl = (x, y) => g.level.at(x, y);
    let mon;
    let sx, sy, i;
    let sh, goldlim = 0;
    const type = sroom.rtype;
    let tx = 0, ty = 0;
    const rmno = sroom.roomnoidx + ROOMOFFSET;
    const mm = { x: 0, y: 0 };

    /* Note: This doesn't check needfill; it assumes the caller has already
       done that. */
    sh = sroom.fdoor;
    switch (type) {
    case COURT: {
        let throne_placed = false;
        if (g.level.flags.is_maze_lev) {
            for (tx = sroom.lx; tx <= sroom.hx && !throne_placed; tx++)
                for (ty = sroom.ly; ty <= sroom.hy; ty++)
                    if (IS_THRONE(levl(tx, ty).typ)) {
                        throne_placed = true; /* goto throne_placed */
                        break;
                    }
            if (throne_placed)
                tx--; /* undo the outer loop's increment */
        }
        if (!throne_placed) {
            i = 100;
            do { /* don't place throne on top of stairs */
                somexyspace(sroom, mm);
                tx = mm.x;
                ty = mm.y;
            } while (occupied(tx, ty) && --i > 0);
        }
        /* throne_placed: */
        mk_zoo_thronemon(tx, ty);
        break;
    }
    case BEEHIVE:
        tx = sroom.lx + Math.trunc((sroom.hx - sroom.lx + 1) / 2);
        ty = sroom.ly + Math.trunc((sroom.hy - sroom.ly + 1) / 2);
        if (sroom.irregular) {
            /* center might not be valid, so put queen elsewhere */
            if (levl(tx, ty).roomno !== rmno || levl(tx, ty).edge) {
                somexyspace(sroom, mm);
                tx = mm.x;
                ty = mm.y;
            }
        }
        break;
    case ZOO:
    case LEPREHALL:
        goldlim = 500 * level_difficulty();
        break;
    }

    for (sx = sroom.lx; sx <= sroom.hx; sx++)
        for (sy = sroom.ly; sy <= sroom.hy; sy++) {
            if (sroom.irregular) {
                if (levl(sx, sy).roomno !== rmno || levl(sx, sy).edge
                    || (sroom.doorct
                        && (distmin(sx, sy, g.level.doors[sh].x,
                                    g.level.doors[sh].y) <= 1)))
                    continue;
            } else if (!SPACE_POS(levl(sx, sy).typ)
                       || (sroom.doorct
                           && ((sx === sroom.lx && g.level.doors[sh].x === sx - 1)
                               || (sx === sroom.hx && g.level.doors[sh].x
                                   === sx + 1)
                               || (sy === sroom.ly && g.level.doors[sh].y
                                   === sy - 1)
                               || (sy === sroom.hy
                                   && g.level.doors[sh].y === sy + 1))))
                continue;
            /* don't place monster on explicitly placed throne */
            if (type === COURT && IS_THRONE(levl(sx, sy).typ))
                continue;
            mon = makemon((type === COURT)
                           ? courtmon()
                           : (type === BARRACKS)
                              ? squadmon()
                              : (type === MORGUE)
                                 ? morguemon()
                                 : (type === BEEHIVE)
                                     ? (sx === tx && sy === ty
                                         ? mons[PM_QUEEN_BEE]
                                         : mons[PM_KILLER_BEE])
                                     : (type === LEPREHALL)
                                         ? mons[PM_LEPRECHAUN]
                                         : (type === COCKNEST)
                                             ? mons[PM_COCKATRICE]
                                             : (type === ANTHOLE)
                                                 ? antholemon()
                                                 : null,
                          sx, sy, MM_ASLEEP | MM_NOGRP);
            if (mon) {
                mon.msleeping = 1;
                if (type === COURT && mon.mpeaceful) {
                    mon.mpeaceful = 0;
                    set_malign(mon);
                }
            }
            switch (type) {
            case ZOO:
            case LEPREHALL:
                if (sroom.doorct) {
                    const distval = dist2(sx, sy,
                                          g.level.doors[sh].x, g.level.doors[sh].y);
                    i = distval * distval; /* sq(distval) */
                } else
                    i = goldlim;
                if (i >= goldlim)
                    i = 5 * level_difficulty();
                goldlim -= i;
                mkgold(rn1(i, 10), sx, sy);
                break;
            case MORGUE:
                if (!rn2(5))
                    mk_tt_object(CORPSE, sx, sy);
                if (!rn2(10)) /* lots of treasure buried with dead */
                    mksobj_at((rn2(3)) ? LARGE_BOX : CHEST, sx, sy,
                              true, false);
                if (!rn2(5))
                    make_grave(sx, sy, null);
                break;
            case BEEHIVE:
                if (!rn2(3))
                    mksobj_at(LUMP_OF_ROYAL_JELLY, sx, sy, true, false);
                break;
            case BARRACKS:
                if (!rn2(20)) /* the payroll and some loot */
                    mksobj_at((rn2(3)) ? LARGE_BOX : CHEST, sx, sy,
                              true, false);
                break;
            case COCKNEST:
                if (!rn2(3)) {
                    const sobj = mk_tt_object(STATUE, sx, sy);

                    if (sobj) {
                        for (i = rn2(5); i; i--)
                            add_to_container(sobj, mkobj(RANDOM_CLASS, false));
                        sobj.owt = weight(sobj);
                    }
                }
                break;
            case ANTHOLE:
                if (!rn2(3))
                    mkobj_at(FOOD_CLASS, sx, sy, false);
                break;
            }
        }
    switch (type) {
    case COURT: {
        levl(tx, ty).typ = THRONE;
        somexyspace(sroom, mm);
        const gold = mksobj(GOLD_PIECE, true, false);
        gold.quan = rn1(50 * level_difficulty(), 10);
        gold.owt = weight(gold);
        /* the royal coffers */
        const chest = mksobj_at(CHEST, mm.x, mm.y, true, false);
        add_to_container(chest, gold);
        chest.owt = weight(chest);
        chest.spe = 2; /* so it can be found later */
        g.level.flags.has_court = 1;
        break;
    }
    case BARRACKS:
        g.level.flags.has_barracks = 1;
        break;
    case ZOO:
        g.level.flags.has_zoo = 1;
        break;
    case MORGUE:
        g.level.flags.has_morgue = 1;
        break;
    case SWAMP:
        g.level.flags.has_swamp = 1;
        break;
    case BEEHIVE:
        g.level.flags.has_beehive = 1;
        break;
    }
}

// C ref: mkroom.c morguemon()
function morguemon() {
    const i = rn2(100), hd = rn2(level_difficulty());

    if (hd > 10 && i < 10) {
        if (In_hell(game.u.uz) || In_endgame(game.u.uz)) {
            return mkclass(S_DEMON, 0);
        } else {
            const ndemon_res = ndemon(A_NONE);
            if (ndemon_res !== NON_PM)
                return mons[ndemon_res];
            /* else do what? As is, it will drop to ghost/wraith/zombie */
        }
    }

    if (hd > 8 && i > 85)
        return mkclass(S_VAMPIRE, 0);

    return ((i < 20) ? mons[PM_GHOST]
                     : (i < 40) ? mons[PM_WRAITH]
                                : mkclass(S_ZOMBIE, 0));
}

// C ref: mkroom.c mkshop()
function mkshop() {
    const g = game;
    let sroom;
    let i = -1;
    const ep = null; /* (wizard) nh_getenv("SHOPTYPE"): the JS port has no
                      * environment */

    /* gottype: */
    for (let ri = 0;; ri++) {
        sroom = g.level.rooms[ri];
        /* return from this loop: cannot find any eligible room to be a shop
         * continue: sroom is ineligible
         * break: sroom is eligible
         */
        if (!sroom || sroom.hx < 0)
            return;
        if (ri >= g.level.nroom) {
            console.error('impossible: rooms[] not closed by -1?');
            return;
        }
        if (sroom.rtype !== OROOM)
            continue;
        if (has_dnstairs(sroom) || has_upstairs(sroom))
            continue;
        if (sroom.doorct === 1 || (is_wizard_mode() && ep && sroom.doorct !== 0)) {
            if (invalid_shop_shape(sroom))
                continue;
            else
                break;
        }
    }
    if (!sroom.rlit) {
        for (let x = sroom.lx - 1; x <= sroom.hx + 1; x++)
            for (let y = sroom.ly - 1; y <= sroom.hy + 1; y++)
                g.level.at(x, y).lit = 1;
        sroom.rlit = 1;
    }

    if (i < 0) { /* shoptype not yet determined */
        let j;

        /* pick a shop type at random */
        for (j = rnd(100), i = 0; (j -= shtypes[i].prob) > 0; i++)
            continue;

        /* big rooms cannot be wand or book shops,
         * - so make them general stores
         */
        if (isbig(sroom) && (shtypes[i].symb === WAND_CLASS
                             || shtypes[i].symb === SPBOOK_CLASS))
            i = 0;
    }
    sroom.rtype = SHOPBASE + i;

    /* set room bits before stocking the shop */
    topologize(sroom);

    /* The shop used to be stocked here, but this no longer happens--all we do
       is set its rtype, and it gets stocked at the end of makelevel() along
       with other special rooms. */
    sroom.needfill = FILL_NORMAL;
}

// C ref: mkroom.c has_dnstairs()
function has_dnstairs(sroom) {
    let stway = game.stairs;

    while (stway) {
        if (!stway.up && inside_room(sroom, stway.sx, stway.sy))
            return true;
        stway = stway.next;
    }
    return false;
}

// C ref: mkroom.c has_upstairs()
function has_upstairs(sroom) {
    let stway = game.stairs;

    while (stway) {
        if (stway.up && inside_room(sroom, stway.sx, stway.sy))
            return true;
        stway = stway.next;
    }
    return false;
}

// C ref: mkroom.c invalid_shop_shape()
function invalid_shop_shape(sroom) {
    const doorx = game.level.doors[sroom.fdoor].x;
    const doory = game.level.doors[sroom.fdoor].y;
    let insidex = 0, insidey = 0, insidect = 0;

    /* First, identify squares inside the room and next to the door. */
    for (let x = Math.max(doorx - 1, sroom.lx);
         x <= Math.min(doorx + 1, sroom.hx); x++) {
        for (let y = Math.max(doory - 1, sroom.ly);
             y <= Math.min(doory + 1, sroom.hy); y++) {
            if (game.level.at(x, y).typ === ROOM) {
                insidex = x;
                insidey = y;
                insidect++;
            }
        }
    }
    if (insidect < 1) {
        console.error('impossible: invalid_shop_shape: no squares inside door?');
        return true;
    }
    /* if insidect > 1, then the shopkeeper already has alternate
     * squares to move to so we don't need to check further. */
    if (insidect === 1) {
        /* But if it is 1, scan all adjacent squares for other squares
         * that are part of this room. */
        insidect = 0;
        for (let x = Math.max(insidex - 1, sroom.lx);
             x <= Math.min(insidex + 1, sroom.hx); x++) {
            for (let y = Math.max(insidey - 1, sroom.ly);
                 y <= Math.min(insidey + 1, sroom.hy); y++) {
                if (x === insidex && y === insidey)
                    continue;
                if (game.level.at(x, y).typ === ROOM)
                    insidect++;
            }
        }
        if (insidect === 1) {
            /* shopkeeper standing just inside the door can only move
             * to one other square; this cannot be a shop. */
            return true;
        }
    }
    return false;
}

// C ref: mkroom.c antholemon()
function antholemon() {
    let mtyp, indx, trycnt = 0;

    /* casts are for dealing with time_t */
    indx = (game.ubirthday || 0) % 3;
    indx += level_difficulty();
    /* Same monsters within a level, different ones between levels */
    do {
        switch ((indx + trycnt) % 3) {
        case 0:
            mtyp = PM_SOLDIER_ANT;
            break;
        case 1:
            mtyp = PM_FIRE_ANT;
            break;
        default:
            mtyp = PM_GIANT_ANT;
            break;
        }
        /* try again if chosen type has been genocided or used up */
    } while (++trycnt < 3 && (game.mvitals[mtyp].mvflags & G_GONE));

    return ((game.mvitals[mtyp].mvflags & G_GONE) ? null : mons[mtyp]);
}

// C ref: mkroom.c mkswamp()
function mkswamp() /* Michiel Huisjes & Fred de Wilde */
{
    const g = game;
    const levl = (x, y) => g.level.at(x, y);
    let sroom;
    let i, eelct = 0;
    let sx, sy;
    let rmno;

    for (i = 0; i < 5; i++) { /* turn up to 5 rooms swampy */
        sroom = g.level.rooms[rn2(g.level.nroom)];
        if (sroom.hx < 0 || sroom.rtype !== OROOM || has_upstairs(sroom)
            || has_dnstairs(sroom))
            continue;

        rmno = sroom.roomnoidx + ROOMOFFSET;

        /* satisfied; make a swamp */
        sroom.rtype = SWAMP;
        for (sx = sroom.lx; sx <= sroom.hx; sx++)
            for (sy = sroom.ly; sy <= sroom.hy; sy++) {
                if (!IS_ROOM(levl(sx, sy).typ)
                    || levl(sx, sy).roomno !== rmno)
                    continue;
                if (!OBJ_AT(sx, sy) && !m_at(sx, sy) && !t_at(sx, sy)
                    && !nexttodoor(sx, sy)) {
                    if ((sx + sy) % 2) {
                        del_engr_at(sx, sy);
                        levl(sx, sy).typ = POOL;
                        if (!eelct || !rn2(4)) {
                            /* mkclass() won't do, as we might get kraken */
                            makemon(rn2(5)
                                       ? mons[PM_GIANT_EEL]
                                       : rn2(2)
                                          ? mons[PM_PIRANHA]
                                          : mons[PM_ELECTRIC_EEL],
                                    sx, sy, NO_MM_FLAGS);
                            eelct++;
                        }
                    } else if (!rn2(4)) /* swamps tend to be moldy */
                        makemon(mkclass(S_FUNGUS, 0), sx, sy, NO_MM_FLAGS);
                }
            }
        g.level.flags.has_swamp = 1;
    }
}

// C ref: mkroom.c shrine_pos()
function shrine_pos(roomno) {
    const buf = { x: 0, y: 0 };
    let delta;
    const troom = game.level.rooms[roomno - ROOMOFFSET];

    /* if width and height are odd, placement will be the exact center;
       if either or both are even, center point is a hypothetical spot
       between map locations and placement will be adjacent to that */
    delta = troom.hx - troom.lx;
    buf.x = troom.lx + Math.trunc(delta / 2);
    if ((delta % 2) && rn2(2))
        buf.x++;
    delta = troom.hy - troom.ly;
    buf.y = troom.ly + Math.trunc(delta / 2);
    if ((delta % 2) && rn2(2))
        buf.y++;
    return buf;
}

// C ref: mkroom.c mktemple()
async function mktemple() {
    let sroom;
    let shrine_spot;
    let lev;

    if (!(sroom = pick_room(true)))
        return;

    /* set up Priest and shrine */
    sroom.rtype = TEMPLE;
    /*
     * In temples, shrines are blessed altars
     * located in the center of the room
     */
    shrine_spot = shrine_pos(sroom.roomnoidx + ROOMOFFSET);
    lev = game.level.at(shrine_spot.x, shrine_spot.y);
    lev.typ = ALTAR;
    lev.altarmask = induced_align(80);
    priestini(game.u.uz, sroom, shrine_spot.x, shrine_spot.y, false);
    lev.altarmask |= AM_SHRINE;
    game.level.flags.has_temple = 1;
}

// C ref: mkroom.c nexttodoor()
export function nexttodoor(sx, sy) {
    let dx, dy;
    let lev;

    for (dx = -1; dx <= 1; dx++)
        for (dy = -1; dy <= 1; dy++) {
            if (!isok(sx + dx, sy + dy))
                continue;
            lev = game.level.at(sx + dx, sy + dy);
            if (IS_DOOR(lev.typ) || lev.typ === SDOOR)
                return true;
        }
    return false;
}

// C ref: mkroom.c courtmon()
function courtmon() {
    const i = rn2(60) + rn2(3 * level_difficulty());

    if (i > 100)
        return mkclass(S_DRAGON, 0);
    else if (i > 95)
        return mkclass(S_GIANT, 0);
    else if (i > 85)
        return mkclass(S_TROLL, 0);
    else if (i > 75)
        return mkclass(S_CENTAUR, 0);
    else if (i > 60)
        return mkclass(S_ORC, 0);
    else if (i > 45)
        return mons[PM_BUGBEAR];
    else if (i > 30)
        return mons[PM_HOBGOBLIN];
    else if (i > 15)
        return mkclass(S_GNOME, 0);
    else
        return mkclass(S_KOBOLD, 0);
}

// C ref: mkroom.c squadprob[]
const squadprob = [ { pm: PM_SOLDIER, prob: 80 },
                    { pm: PM_SERGEANT, prob: 15 },
                    { pm: PM_LIEUTENANT, prob: 4 },
                    { pm: PM_CAPTAIN, prob: 1 } ];

// C ref: mkroom.c squadmon()
/* return soldier types. */
function squadmon() {
    let sel_prob, i, cpro, mndx;

    sel_prob = rnd(80 + level_difficulty());

    cpro = 0;
    mndx = undefined;
    for (i = 0; i < squadprob.length; i++) {
        cpro += squadprob[i].prob;
        if (cpro > sel_prob) {
            mndx = squadprob[i].pm;
            break; /* goto gotone */
        }
    }
    if (mndx === undefined)
        mndx = ROLL_FROM(squadprob).pm;
    /* gotone: */
    if (!(game.mvitals[mndx].mvflags & G_GONE))
        return mons[mndx];
    else
        return null;
}

// C ref: mklev.c makerooms()
async function makerooms() {
    const g = game;
    let tried_vault = false;
    let themeroom_tries = 0;
    let fname;
    const sbi = { flags: NHL_SB_SAFE, memlimit: 1 * 1024 * 1024, steps: 0,
                  perpcall: 1 * 1024 * 1024 };
    if (!g.luathemes) g.luathemes = [];
    let themes = g.luathemes[g.u.uz.dnum] || null;

    if (!themes && (fname = g.dungeons[g.u.uz.dnum].themerms)) {
        if ((themes = nhl_init(sbi)) !== null) {
            if (!nhl_loadlua(themes, fname)) {
                /* loading lua failed, don't use themed rooms */
                nhl_done(themes);
                themes = null;
            } else {
                /* success; save state for this dungeon branch */
                g.luathemes[g.u.uz.dnum] = themes;
                /* keep themes context, so not 'nhl_done(themes);' */
                g.iflags.in_lua = false; /* can affect error messages */
            }
        }
        if (!themes) /* don't try again when making next level */
            g.dungeons[g.u.uz.dnum].themerms = '';
    }

    if (themes) {
        create_des_coder();
        g.iflags.in_lua = g.in_mk_themerooms = true;
        g.themeroom_failed = false;
        nhl_pcall_handle(themes, themes.globals.pre_themerooms_generate, [],
                         'makerooms-1', NHLpa_impossible);
        g.iflags.in_lua = g.in_mk_themerooms = false;
    }

    /* make rooms until satisfied */
    /* rnd_rect() will returns 0 if no more rects are available... */
    while (g.level.nroom < (MAXNROFROOMS - 1) && rnd_rect()) {
        if (g.level.nroom >= Math.trunc(MAXNROFROOMS / 6) && rn2(2) && !tried_vault) {
            tried_vault = true;
            if (create_vault()) {
                g.vault_x = g.level.rooms[g.level.nroom].lx;
                g.vault_y = g.level.rooms[g.level.nroom].ly;
                g.level.rooms[g.level.nroom].hx = -1;
            }
        } else {
            if (themes) {
                g.iflags.in_lua = g.in_mk_themerooms = true;
                g.themeroom_failed = false;
                if (nhl_pcall_handle(themes, themes.globals.themerooms_generate, [],
                                     'makerooms-2', NHLpa_panic))
                    g.themeroom_failed = true; /* panic() is not ported */
                g.iflags.in_lua = g.in_mk_themerooms = false;
                if (g.themeroom_failed
                    && ((themeroom_tries++ > 10)
                        || (g.level.nroom >= Math.trunc(MAXNROFROOMS / 6))))
                    break;
            } else {
                if (!create_room(-1, -1, -1, -1, -1, -1, OROOM, -1))
                    break;
            }
        }
    }
    if (themes) {
        reset_xystart_size();
        g.iflags.in_lua = g.in_mk_themerooms = true;
        g.themeroom_failed = false;
        nhl_pcall_handle(themes, themes.globals.post_themerooms_generate, [],
                         'makerooms-3', NHLpa_panic);
        g.iflags.in_lua = g.in_mk_themerooms = false;
    }
}

// C ref: sp_lev.c check_room()
function check_room(lowx, ddx, lowy, ddy, vault) {
    const map = game.level;
    let hix = lowx.v + ddx.v, hiy = lowy.v + ddy.v;
    const xlim = XLIM + (vault ? 1 : 0);
    const ylim = YLIM + (vault ? 1 : 0);
    const s_lowx = lowx.v, s_ddx = ddx.v;
    const s_lowy = lowy.v, s_ddy = ddy.v;
    if (lowx.v < 3) lowx.v = 3;
    if (lowy.v < 2) lowy.v = 2;
    if (hix > COLNO - 3) hix = COLNO - 3;
    if (hiy > ROWNO - 3) hiy = ROWNO - 3;
    for (;;) {
        if (hix <= lowx.v || hiy <= lowy.v) return false;
        if (game.in_mk_themerooms
            && s_lowx !== lowx.v && s_ddx !== ddx.v
            && s_lowy !== lowy.v && s_ddy !== ddy.v) {
            return false;
        }
        let retry = false;
        for (let x = lowx.v - xlim; x <= hix + xlim && !retry; x++) {
            if (x <= 0 || x >= COLNO) continue;
            let y = Math.max(lowy.v - ylim, 0);
            const ymax = Math.min(hiy + ylim, ROWNO - 1);
            for (; y <= ymax; y++) {
                const loc = map.at(x, y);
                if (loc && loc.typ !== STONE) {
                    if (!rn2(3)) return false;
                    if (game.in_mk_themerooms) return false;
                    if (x < lowx.v) lowx.v = x + xlim + 1;
                    else hix = x - xlim - 1;
                    if (y < lowy.v) lowy.v = y + ylim + 1;
                    else hiy = y - ylim - 1;
                    retry = true;
                    break;
                }
            }
        }
        if (!retry) break;
    }
    ddx.v = hix - lowx.v;
    ddy.v = hiy - lowy.v;
    if (game.in_mk_themerooms
        && s_lowx !== lowx.v && s_ddx !== ddx.v
        && s_lowy !== lowy.v && s_ddy !== ddy.v) {
        return false;
    }
    return true;
}

// C ref: sp_lev.c create_room()
export function create_room(x, y, w, h, xal, yal, rtype, rlit) {
    const g = game;
    let xabs = 0, yabs = 0;
    let r1 = null, r2 = null;
    let wtmp, htmp;
    let trycnt = 0;
    let vault = false;
    let xlim = XLIM, ylim = YLIM;
    if (rtype === -1) rtype = OROOM;
    if (rtype === VAULT) {
        vault = true;
        xlim++;
        ylim++;
    }
    rlit = litstate_rnd(rlit);
    do {
        wtmp = w; htmp = h;
        let xtmp = x, ytmp = y;
        let xaltmp = xal, yaltmp = yal;
        if ((xtmp < 0 && ytmp < 0 && wtmp < 0 && xaltmp < 0 && yaltmp < 0) || vault) {
            r1 = rnd_rect();
            if (!r1) return false;
            const hx = r1.hx, hy = r1.hy, lx = r1.lx, ly = r1.ly;
            let dx, dy;
            if (vault) {
                dx = dy = 1;
            } else {
                dx = 2 + rn2((hx - lx > 28) ? 12 : 8);
                dy = 2 + rn2(4);
                if (dx * dy > 50) dy = Math.trunc(50 / dx);
            }
            const xborder = (lx > 0 && hx < COLNO - 1) ? 2 * xlim : xlim + 1;
            const yborder = (ly > 0 && hy < ROWNO - 1) ? 2 * ylim : ylim + 1;
            if (hx - lx < dx + 3 + xborder || hy - ly < dy + 3 + yborder) {
                r1 = null;
                continue;
            }
            xabs = lx + (lx > 0 ? xlim : 3)
                   + rn2(hx - (lx > 0 ? lx : 3) - dx - xborder + 1);
            yabs = ly + (ly > 0 ? ylim : 2)
                   + rn2(hy - (ly > 0 ? ly : 2) - dy - yborder + 1);
            if (ly === 0 && hy >= ROWNO - 1
                && (!g.level.nroom || !rn2(g.level.nroom))
                && (yabs + dy > Math.trunc(ROWNO / 2))) {
                yabs = rn1(3, 2);
                if (g.level.nroom < 4 && dy > 1) dy--;
            }
            const lowx = { v: xabs }, ddx = { v: dx };
            const lowy = { v: yabs }, ddy = { v: dy };
            if (!check_room(lowx, ddx, lowy, ddy, vault)) {
                r1 = null;
                continue;
            }
            xabs = lowx.v;
            yabs = lowy.v;
            wtmp = ddx.v + 1;
            htmp = ddy.v + 1;
            r2 = { lx: xabs - 1, ly: yabs - 1, hx: xabs + wtmp, hy: yabs + htmp };
        } else { /* Only some parameters are random */
            let rndpos = 0;

            if (xtmp < 0 && ytmp < 0) { /* Position is RANDOM */
                xtmp = rnd(5);
                ytmp = rnd(5);
                rndpos = 1;
            }
            if (wtmp < 0 || htmp < 0) { /* Size is RANDOM */
                wtmp = rn1(15, 3);
                htmp = rn1(8, 2);
            }
            if (xaltmp === -1) /* Horizontal alignment is RANDOM */
                xaltmp = rnd(3);
            if (yaltmp === -1) /* Vertical alignment is RANDOM */
                yaltmp = rnd(3);

            /* Try to generate real (absolute) coordinates here! */

            xabs = Math.trunc(((xtmp - 1) * COLNO) / 5) + 1;
            yabs = Math.trunc(((ytmp - 1) * ROWNO) / 5) + 1;
            switch (xaltmp) {
            case SPLEV_LEFT:
                break;
            case SPLEV_RIGHT:
                xabs += Math.trunc(COLNO / 5) - wtmp;
                break;
            case SPLEV_CENTER:
                xabs += Math.trunc((Math.trunc(COLNO / 5) - wtmp) / 2);
                break;
            }
            switch (yaltmp) {
            case TOP:
                break;
            case BOTTOM:
                yabs += Math.trunc(ROWNO / 5) - htmp;
                break;
            case SPLEV_CENTER:
                yabs += Math.trunc((Math.trunc(ROWNO / 5) - htmp) / 2);
                break;
            }

            if (xabs + wtmp - 1 > COLNO - 2)
                xabs = COLNO - wtmp - 3;
            if (xabs < 2)
                xabs = 2;
            if (yabs + htmp - 1 > ROWNO - 2)
                yabs = ROWNO - htmp - 3;
            if (yabs < 2)
                yabs = 2;

            /* Try to find a rectangle that fit our room ! */

            r2 = { lx: xabs - 1, ly: yabs - 1,
                   hx: xabs + wtmp + rndpos, hy: yabs + htmp + rndpos };
            r1 = get_rect(r2);

            /* check_room() may move xabs/yabs; C leaves wtmp/htmp as is */
            const lowx = { v: xabs }, ddx = { v: wtmp };
            const lowy = { v: yabs }, ddy = { v: htmp };
            if (r1 && !check_room(lowx, ddx, lowy, ddy, vault)) {
                r1 = null;
            }
            xabs = lowx.v;
            yabs = lowy.v;
        }
    } while (++trycnt <= 100 && !r1);
    if (!r1) return false;
    split_rects(r1, r2);
    if (!vault) {
        g.smeq[g.level.nroom] = g.level.nroom;
        add_room(xabs, yabs, xabs + wtmp - 1, yabs + htmp - 1, rlit, rtype, false);
    } else {
        if (!g.level.rooms[g.level.nroom]) g.level.rooms[g.level.nroom] = {};
        g.level.rooms[g.level.nroom].lx = xabs;
        g.level.rooms[g.level.nroom].ly = yabs;
    }
    return true;
}

function create_vault() {
    return create_room(-1, -1, 2, 2, -1, -1, VAULT, true);
}

// C ref: mklev.c add_room()
export function add_room(lowx, lowy, hix, hiy, lit, rtype, special) {
    const g = game;
    const croom = {
        lx: lowx, ly: lowy, hx: hix, hy: hiy,
        rtype, rlit: lit ? 1 : 0,
        doorct: 0, fdoor: g.level.doorindex,
        irregular: false, needjoining: !special,
        nsubrooms: 0, sbrooms: [],
        roomnoidx: g.level.nroom,
        needfill: 0,
    };
    do_room_or_subroom(croom, lowx, lowy, hix, hiy, lit, rtype, special, true);
    g.level.rooms[g.level.nroom] = croom;
    g.level.nroom++;
    if (g.level.nroom < MAXNROFROOMS) {
        g.level.rooms[g.level.nroom] = { hx: -1 };
    }
}

// C ref: mklev.c do_room_or_subroom()
// C ref: mklev.c add_subroom()
/* C keeps gs.subrooms in svr.rooms[] after the MAXNROFROOMS+1 room slots,
   so a subroom's roomno indexes svr.rooms[] too; JS mirrors that layout in
   game.level.rooms[] and also lists them in game.level.subrooms[]. */
export function add_subroom(proom, lowx, lowy, hix, hiy, lit, rtype, special) {
    const g = game;
    if (!g.level.subrooms) g.level.subrooms = [];
    if (!g.level.nsubroom) g.level.nsubroom = 0;
    const croom = {
        roomnoidx: MAXNROFROOMS + 1 + g.level.nsubroom,
        needfill: 0,
    };
    do_room_or_subroom(croom, lowx, lowy, hix, hiy, lit, rtype, special,
                       false);
    proom.sbrooms[proom.nsubrooms++] = croom;
    g.level.subrooms[g.level.nsubroom] = croom;
    g.level.rooms[croom.roomnoidx] = croom;
    g.level.nsubroom++;
}

function do_room_or_subroom(croom, lowx, lowy, hix, hiy, lit, _rtype, special, is_room) {
    const map = game.level;
    if (!lowx) lowx++;
    if (!lowy) lowy++;
    if (hix >= COLNO - 1) hix = COLNO - 2;
    if (hiy >= ROWNO - 1) hiy = ROWNO - 2;
    if (lit) {
        for (let x = lowx - 1; x <= hix + 1; x++)
            for (let y = Math.max(lowy - 1, 0); y <= hiy + 1; y++)
                if (map.at(x, y)) map.at(x, y).lit = true;
        croom.rlit = 1;
    } else {
        croom.rlit = 0;
    }
    croom.lx = lowx; croom.hx = hix;
    croom.ly = lowy; croom.hy = hiy;
    croom.rtype = _rtype;
    croom.doorct = 0;
    croom.fdoor = game.level.doorindex;
    croom.irregular = false;
    croom.nsubrooms = 0;
    croom.sbrooms = [];
    if (!special) {
        croom.needjoining = true;
        for (let x = lowx - 1; x <= hix + 1; x++)
            for (let y = lowy - 1; y <= hiy + 1; y += (hiy - lowy + 2)) {
                const loc = map.at(x, y);
                if (loc) { loc.typ = HWALL; loc.horizontal = true; }
            }
        for (let x = lowx - 1; x <= hix + 1; x += (hix - lowx + 2))
            for (let y = lowy; y <= hiy; y++) {
                const loc = map.at(x, y);
                if (loc) { loc.typ = VWALL; loc.horizontal = false; }
            }
        for (let x = lowx; x <= hix; x++)
            for (let y = lowy; y <= hiy; y++) {
                const loc = map.at(x, y);
                if (loc) loc.typ = ROOM;
            }
        if (is_room) {
            const tl = map.at(lowx - 1, lowy - 1);
            const tr = map.at(hix + 1, lowy - 1);
            const bl = map.at(lowx - 1, hiy + 1);
            const br = map.at(hix + 1, hiy + 1);
            if (tl) tl.typ = TLCORNER;
            if (tr) tr.typ = TRCORNER;
            if (bl) bl.typ = BLCORNER;
            if (br) br.typ = BRCORNER;
        } else {
            wallification(lowx - 1, lowy - 1, hix + 1, hiy + 1);
        }
    }
}

// C ref: mklev.c sort_rooms()
function sort_rooms() {
    const g = game;
    const n = g.level.nroom;
    const oldToNew = new Array(n).fill(0);
    const liveRooms = g.level.rooms.slice(0, n)
        .sort((a, b) => (a?.lx || 0) - (b?.lx || 0));
    /* gs.subrooms live after the room slots and are not sorted */
    const subrooms = g.level.rooms.slice(MAXNROFROOMS + 1);
    g.level.rooms = liveRooms;
    if (n < MAXNROFROOMS) g.level.rooms[n] = { hx: -1 };
    for (let i = 0; i < subrooms.length; i++)
        if (subrooms[i]) g.level.rooms[MAXNROFROOMS + 1 + i] = subrooms[i];
    for (let i = 0; i < n; i++) {
        if (g.level.rooms[i]) {
            oldToNew[g.level.rooms[i].roomnoidx] = i;
            g.level.rooms[i].roomnoidx = i;
        }
    }
    for (let x = 1; x < COLNO; x++)
        for (let y = 0; y < ROWNO; y++) {
            const loc = g.level.at(x, y);
            const rno = loc?.roomno ?? 0;
            if (rno >= ROOMOFFSET && rno < MAXNROFROOMS + 1) {
                loc.roomno = oldToNew[rno - ROOMOFFSET] + ROOMOFFSET;
            }
        }
}

// C ref: mklev.c topologize()
export function topologize(croom) {
    if (!croom || croom.irregular) return;
    const roomno = (croom.roomnoidx ?? -1) + ROOMOFFSET;
    const lowx = croom.lx, lowy = croom.ly;
    const hix = croom.hx, hiy = croom.hy;
    if (!game.level || roomno < ROOMOFFSET) return;
    if ((game.level.at(lowx, lowy)?.roomno ?? 0) === roomno) return;
    for (let x = lowx; x <= hix; x++)
        for (let y = lowy; y <= hiy; y++) {
            const loc = game.level.at(x, y);
            if (loc) loc.roomno = roomno;
        }
    for (let x = lowx - 1; x <= hix + 1; x++)
        for (let y = lowy - 1; y <= hiy + 1; y += (hiy - lowy + 2)) {
            const loc = game.level.at(x, y);
            if (loc) { loc.edge = true; loc.roomno = loc.roomno ? SHARED : roomno; }
        }
    for (let x = lowx - 1; x <= hix + 1; x += (hix - lowx + 2))
        for (let y = lowy; y <= hiy; y++) {
            const loc = game.level.at(x, y);
            if (loc) { loc.edge = true; loc.roomno = loc.roomno ? SHARED : roomno; }
        }
    /* gs.subrooms */
    for (let subindex = 0; subindex < (croom.nsubrooms || 0); subindex++)
        topologize(croom.sbrooms[subindex]);
}

// ============================================================
// Corridors
// ============================================================

// C ref: mklev.c good_rm_wall_doorpos()
/* is x,y a good location for a door into room? */
function good_rm_wall_doorpos(x, y, dir, room) {
    const map = game.level;
    const rmno = game.level.rooms.indexOf(room) + ROOMOFFSET;
    if (!isok(x, y) || !room.needjoining) return false;
    const loc = map.at(x, y);
    if (!loc) return false;
    if (!(loc.typ === HWALL || loc.typ === VWALL || IS_DOOR(loc.typ) || loc.typ === SDOOR))
        return false;
    if (bydoor(x, y)) return false;
    const tx = x + xdir[dir], ty = y + ydir[dir];
    if (!isok(tx, ty)) return false;
    const tloc = map.at(tx, ty);
    if (!tloc || IS_OBSTRUCTED(tloc.typ)) return false;
    if (rmno !== tloc.roomno) return false;
    return true;
}

// C ref: mklev.c finddpos_shift()
/* starting from x,y going towards dir, find a good location for a door */
function finddpos_shift(xp, yp, dir, aroom) {
    const levl = (x, y) => game.level.at(x, y);

    dir = DIR_180(dir);

    const dx = xdir[dir];
    const dy = ydir[dir];

    if (good_rm_wall_doorpos(xp.v, yp.v, dir, aroom))
        return true;

    /* irregular rooms may have the room wall away from the room rectangular
       area; go into the area until we encounter something */
    if (aroom.irregular) {
        let rx = xp.v, ry = yp.v;
        let fail = false;

        while (!fail && isok(rx, ry)
               && (levl(rx, ry).typ === STONE || levl(rx, ry).typ === CORR)) {
            rx += dx;
            ry += dy;
            if (good_rm_wall_doorpos(rx, ry, dir, aroom)) {
                xp.v = rx;
                yp.v = ry;
                return true;
            }
            if (!(levl(rx, ry).typ === STONE || levl(rx, ry).typ === CORR))
                fail = true;
            if (rx < aroom.lx || rx > aroom.hx
                || ry < aroom.ly || ry > aroom.hy)
                fail = true;
        }
    }
    return false;
}

// C ref: mklev.c finddpos()
function finddpos(cc, dir, aroom) {
    let x1, y1, x2, y2;
    switch (dir) {
    case DIR_N: x1 = aroom.lx; x2 = aroom.hx; y1 = y2 = aroom.ly - 1; break;
    case DIR_S: x1 = aroom.lx; x2 = aroom.hx; y1 = y2 = aroom.hy + 1; break;
    case DIR_W: x1 = x2 = aroom.lx - 1; y1 = aroom.ly; y2 = aroom.hy; break;
    case DIR_E: x1 = x2 = aroom.hx + 1; y1 = aroom.ly; y2 = aroom.hy; break;
    default: return false;
    }
    let tryct = 0;
    let x, y;
    do {
        x = (x2 - x1) ? rn1(x2 - x1 + 1, x1) : x1;
        y = (y2 - y1) ? rn1(y2 - y1 + 1, y1) : y1;
        const xp = { v: x }, yp = { v: y };
        if (finddpos_shift(xp, yp, dir, aroom)) {
            cc.x = xp.v; cc.y = yp.v;
            return true;
        }
    } while (++tryct < 20);
    for (x = x1; x <= x2; x++)
        for (y = y1; y <= y2; y++) {
            const xp = { v: x }, yp = { v: y };
            if (finddpos_shift(xp, yp, dir, aroom)) {
                cc.x = xp.v; cc.y = yp.v;
                return true;
            }
        }
    cc.x = x1; cc.y = y1;
    return false;
}

function maybe_sdoor(chance) {
    const d = depth_of_level(game.u?.uz);
    return (d > 2) && !rn2(Math.max(2, chance));
}

// C ref: sp_lev.c dig_corridor()
export function dig_corridor(org, dest, npoints_out, nxcor, ftyp, btyp) {
    const map = game.level;
    let dx = 0, dy = 0;
    let xx = org.x, yy = org.y;
    const tx = dest.x, ty = dest.y;
    let npoints = 0;
    if (npoints_out) npoints_out.v = 0;
    if (xx <= 0 || yy <= 0 || tx <= 0 || ty <= 0
        || xx > COLNO - 1 || tx > COLNO - 1 || yy > ROWNO - 1 || ty > ROWNO - 1)
        return false;
    if (tx > xx) dx = 1;
    else if (ty > yy) dy = 1;
    else if (tx < xx) dx = -1;
    else dy = -1;
    xx -= dx; yy -= dy;
    let cct = 0;
    while (xx !== tx || yy !== ty) {
        if (cct++ > 500 || (nxcor && !rn2(35))) return false;
        xx += dx; yy += dy;
        if (xx >= COLNO - 1 || xx <= 0 || yy <= 0 || yy >= ROWNO - 1) return false;
        const crm = map.at(xx, yy);
        if (!crm) return false;
        if (crm.typ === btyp) {
            if (ftyp === CORR && maybe_sdoor(100)) {
                npoints++;
                if (npoints_out) npoints_out.v = npoints;
                crm.typ = SCORR;
            } else {
                npoints++;
                if (npoints_out) npoints_out.v = npoints;
                crm.typ = ftyp;
                if (nxcor && !rn2(50)) {
                    mksobj_at(BOULDER, xx, yy, true, false);
                }
            }
        } else if (crm.typ !== ftyp && crm.typ !== SCORR) {
            return false;
        }
        let dix = Math.abs(xx - tx);
        let diy = Math.abs(yy - ty);
        if ((dix > diy) && diy && !rn2(dix - diy + 1)) dix = 0;
        else if ((diy > dix) && dix && !rn2(diy - dix + 1)) diy = 0;
        if (dy && dix > diy) {
            const ddx = (xx > tx) ? -1 : 1;
            const ncr = map.at(xx + ddx, yy);
            if (ncr && (ncr.typ === btyp || ncr.typ === ftyp || ncr.typ === SCORR)) {
                dx = ddx; dy = 0; continue;
            }
        } else if (dx && diy > dix) {
            const ddy = (yy > ty) ? -1 : 1;
            const ncr = map.at(xx, yy + ddy);
            if (ncr && (ncr.typ === btyp || ncr.typ === ftyp || ncr.typ === SCORR)) {
                dy = ddy; dx = 0; continue;
            }
        }
        const straight = map.at(xx + dx, yy + dy);
        if (straight && (straight.typ === btyp || straight.typ === ftyp || straight.typ === SCORR))
            continue;
        if (dx) { dx = 0; dy = (ty < yy) ? -1 : 1; }
        else { dy = 0; dx = (tx < xx) ? -1 : 1; }
        const alt = map.at(xx + dx, yy + dy);
        if (alt && (alt.typ === btyp || alt.typ === ftyp || alt.typ === SCORR)) continue;
        dy = -dy; dx = -dx;
    }
    if (npoints_out) npoints_out.v = npoints;
    return true;
}

// C ref: mklev.c dosdoor()
function dosdoor(x, y, aroom, type) {
    const map = game.level;
    const loc = map.at(x, y);
    if (!loc) return;
    const shdoor = in_rooms(x, y, SHOPBASE).length > 0;
    if (!IS_WALL(loc.typ)) type = DOOR;
    loc.typ = type;
    if (type === DOOR) {
        if (!rn2(3)) {
            if (!rn2(5)) loc.flags = D_ISOPEN;
            else if (!rn2(6)) loc.flags = D_LOCKED;
            else loc.flags = D_CLOSED;
            if (loc.flags !== D_ISOPEN && !shdoor
                && level_difficulty() >= 5 && !rn2(25))
                loc.flags |= D_TRAPPED;
        } else {
            loc.flags = shdoor ? D_ISOPEN : D_NODOOR;
        }

        /* also done in roguecorr(); doing it here first prevents
           making mimics in place of trapped doors on rogue level */
        if (Is_rogue_level(game.u.uz))
            loc.flags = D_NODOOR;

        if (loc.flags & D_TRAPPED) {
            const mv = game.mvitals;
            if (level_difficulty() >= 9 && !rn2(5)
                && !((mv[PM_SMALL_MIMIC].mvflags & G_GONE)
                     && (mv[PM_LARGE_MIMIC].mvflags & G_GONE)
                     && (mv[PM_GIANT_MIMIC].mvflags & G_GONE))) {
                /* make a mimic instead */
                loc.flags = D_NODOOR;
                const mtmp = makemon(mkclass(S_MIMIC, 0), x, y, NO_MM_FLAGS);
                if (mtmp)
                    set_mimic_sym(mtmp);
            }
        }
    } else {
        if (shdoor || !rn2(5)) loc.flags = D_LOCKED;
        else loc.flags = D_CLOSED;
        if (!shdoor && level_difficulty() >= 4 && !rn2(20))
            loc.flags |= D_TRAPPED;
    }
    add_door(x, y, aroom);
}

export function dodoor(x, y, aroom) {
    dosdoor(x, y, aroom, maybe_sdoor(8) ? SDOOR : DOOR);
}

export function add_door(x, y, aroom) {
    const g = game;
    if (!g.level.doors) g.level.doors = [];
    for (let i = 0; i < aroom.doorct; i++) {
        const d = g.level.doors[aroom.fdoor + i];
        if (d && d.x === x && d.y === y) return;
    }
    if (aroom.doorct === 0) aroom.fdoor = g.level.doorindex;
    aroom.doorct++;
    for (let tmp = g.level.doorindex; tmp > aroom.fdoor; tmp--)
        g.level.doors[tmp] = g.level.doors[tmp - 1];
    for (let i = 0; i < g.level.nroom; i++) {
        const broom = g.level.rooms[i];
        if (!broom || broom.hx <= 0 || broom === aroom || !(broom.doorct > 0)) continue;
        if ((broom.fdoor ?? 0) >= aroom.fdoor) broom.fdoor++;
    }
    for (let i = 0; i < (g.level.nsubroom || 0); i++) {
        const broom = g.level.subrooms[i];
        if (broom !== aroom && broom.doorct && broom.fdoor >= aroom.fdoor)
            broom.fdoor++;
    }
    g.level.doors[aroom.fdoor] = { x, y };
    g.level.doorindex++;
}

function bydoor(x, y) {
    const map = game.level;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (!isok(x + dx, y + dy)) continue;
        const loc = map.at(x + dx, y + dy);
        if (loc && (IS_DOOR(loc.typ) || loc.typ === SDOOR)) return true;
    }
    return false;
}

// C ref: mklev.c okdoor()
export function okdoor(x, y) {
    const map = game.level;
    const loc = map.at(x, y);
    if (!loc) return false;
    if (!(loc.typ === HWALL || loc.typ === VWALL)) return false;
    if (bydoor(x, y)) return false;
    return (
        (isok(x - 1, y) && !IS_OBSTRUCTED(map.at(x - 1, y).typ))
        || (isok(x + 1, y) && !IS_OBSTRUCTED(map.at(x + 1, y).typ))
        || (isok(x, y - 1) && !IS_OBSTRUCTED(map.at(x, y - 1).typ))
        || (isok(x, y + 1) && !IS_OBSTRUCTED(map.at(x, y + 1).typ))
    );
}

// C ref: mklev.c join()
function join(a, b, nxcor) {
    const g = game;
    const croom = g.level.rooms[a];
    const troom = g.level.rooms[b];
    if (!croom || !troom) return;
    if (!croom.needjoining || !troom.needjoining) return;
    if (troom.hx < 0 || croom.hx < 0) return;
    let dx, dy;
    const cc = { x: 0, y: 0 }, tt = { x: 0, y: 0 };
    if (troom.lx > croom.hx) {
        dx = 1; dy = 0;
        if (!finddpos(cc, DIR_E, croom)) return;
        if (!finddpos(tt, DIR_W, troom)) return;
    } else if (troom.hy < croom.ly) {
        dy = -1; dx = 0;
        if (!finddpos(cc, DIR_N, croom)) return;
        if (!finddpos(tt, DIR_S, troom)) return;
    } else if (troom.hx < croom.lx) {
        dx = -1; dy = 0;
        if (!finddpos(cc, DIR_W, croom)) return;
        if (!finddpos(tt, DIR_E, troom)) return;
    } else {
        dy = 1; dx = 0;
        if (!finddpos(cc, DIR_S, croom)) return;
        if (!finddpos(tt, DIR_N, troom)) return;
    }
    const xx = cc.x, yy = cc.y;
    const tx = tt.x - dx, ty = tt.y - dy;
    if (nxcor) {
        const loc = game.level.at(xx + dx, yy + dy);
        if (loc && loc.typ !== STONE) return;
    }
    const org = { x: xx + dx, y: yy + dy };
    const dest = { x: tx, y: ty };
    const npoints = { v: 0 };
    const ftyp = CORR;
    const dig_result = dig_corridor(org, dest, npoints, nxcor, ftyp, STONE);
    if ((npoints.v > 0) && (okdoor(xx, yy) || !nxcor))
        dodoor(xx, yy, croom);
    if (!dig_result) return;
    if (okdoor(tt.x, tt.y) || !nxcor)
        dodoor(tt.x, tt.y, troom);
    if (g.smeq[a] < g.smeq[b]) g.smeq[b] = g.smeq[a];
    else g.smeq[a] = g.smeq[b];
}

// C ref: mklev.c makecorridors()
export function makecorridors() {
    const g = game;
    let any = true;
    for (let i = 0; i < g.level.nroom; i++) g.smeq[i] = i;
    for (let a = 0; a < g.level.nroom - 1; a++) {
        join(a, a + 1, false);
        if (!rn2(50)) break;
    }
    for (let a = 0; a < g.level.nroom - 2; a++)
        if (g.smeq[a] !== g.smeq[a + 2]) join(a, a + 2, false);
    for (let a = 0; any && a < g.level.nroom; a++) {
        any = false;
        for (let b = 0; b < g.level.nroom; b++)
            if (g.smeq[a] !== g.smeq[b]) { join(a, b, false); any = true; }
    }
    if (g.level.nroom > 2) {
        const count = rn2(g.level.nroom) + 4;
        for (let i = 0; i < count; i++) {
            let a = rn2(g.level.nroom);
            let b = rn2(g.level.nroom - 2);
            if (b >= a) b += 2;
            join(a, b, true);
        }
    }
}

// ============================================================
// Room helper functions
// ============================================================

export function somex(croom) { return rn1(croom.hx - croom.lx + 1, croom.lx); }
export function somey(croom) { return rn1(croom.hy - croom.ly + 1, croom.ly); }

// C ref: mkroom.c somexy()
/* return a coord c inside mkroom croom, but not in a subroom.
   returns TRUE if any such space found.
   can return a non-accessible location, eg. inside a wall
   if a themed room is not irregular, but has some non-room terrain */
export function somexy(croom, c) {
    let try_cnt = 0;
    let i;
    const levl = (x, y) => game.level.at(x, y);

    if (croom.irregular) {
        i = croom.roomnoidx + ROOMOFFSET;

        while (try_cnt++ < 100) {
            c.x = somex(croom);
            c.y = somey(croom);
            if (!levl(c.x, c.y).edge && levl(c.x, c.y).roomno === i)
                return true;
        }
        /* try harder; exhaustively search until one is found */
        for (c.x = croom.lx; c.x <= croom.hx; c.x++)
            for (c.y = croom.ly; c.y <= croom.hy; c.y++)
                if (!levl(c.x, c.y).edge
                    && levl(c.x, c.y).roomno === i)
                    return true;
        return false;
    }

    if (!croom.nsubrooms) {
        c.x = somex(croom);
        c.y = somey(croom);
        return true;
    }

    /* Check that coords doesn't fall into a subroom or into a wall */

    outer: while (try_cnt++ < 100) {
        c.x = somex(croom);
        c.y = somey(croom);
        if (IS_WALL(levl(c.x, c.y).typ))
            continue;
        for (i = 0; i < croom.nsubrooms; i++)
            if (inside_room(croom.sbrooms[i], c.x, c.y))
                continue outer; /* goto you_lose */
        break;
    }
    if (try_cnt >= 100)
        return false;
    return true;
}

// C ref: mklev.c occupied()
export function occupied(x, y) {
    return !!(t_at(x, y) || IS_FURNITURE(game.level.at(x, y).typ)
              || is_lava(x, y) || is_pool(x, y)
              || invocation_pos(x, y));
}

// C ref: hack.c invocation_pos()
export function invocation_pos(x, y) {
    return (Invocation_lev(game.u.uz)
            && x === game.inv_pos?.x && y === game.inv_pos?.y);
}

// C ref: mkroom.c somexyspace()
export function somexyspace(croom, c) {
    let trycnt = 0;
    let okay;
    do {
        okay = somexy(croom, c) && isok(c.x, c.y) && !occupied(c.x, c.y);
        if (okay) {
            const loc = game.level.at(c.x, c.y);
            okay = loc && (loc.typ === ROOM || loc.typ === CORR || loc.typ === ICE);
        }
    } while (trycnt++ < 100 && !okay);
    return okay;
}

// ============================================================
// Stairs
// ============================================================

function generate_stairs_room_good(croom, phase) {
    if (!croom || croom.hx < 0) return false;
    if (!croom.needjoining && phase >= 0) return false;
    let hasDown = false, hasUp = false;
    for (let st = game.stairs; st; st = st.next) {
        const inRoom = st.sx >= croom.lx && st.sx <= croom.hx
            && st.sy >= croom.ly && st.sy <= croom.hy;
        if (!inRoom) continue;
        if (st.up) hasUp = true; else hasDown = true;
    }
    if (phase >= 1 && (hasDown || hasUp)) return false;
    if (croom.rtype !== OROOM && !(phase < 2 && croom.rtype === THEMEROOM)) return false;
    return true;
}

function generate_stairs_find_room() {
    const g = game;
    if (!g.level.nroom) return null;
    for (let phase = 2; phase > -1; phase--) {
        const candidates = [];
        for (let i = 0; i < g.level.nroom; i++)
            if (generate_stairs_room_good(g.level.rooms[i], phase))
                candidates.push(i);
        if (candidates.length > 0) {
            const pick = rn2(candidates.length);
            return g.level.rooms[candidates[pick]];
        }
    }
    return g.level.rooms[rn2(g.level.nroom)];
}

// C ref: mklev.c mkstairs()
export function mkstairs(x, y, up, croom, force) {
    const g = game;

    if (!x || !isok(x, y)) {
        /* impossible("mkstairs:  bogus stair attempt at <%d,%d>", x, y) */
        return;
    }
    if (force)
        g.level.at(x, y).typ = ROOM;
    /* ltyp = levl[x][y].typ: impossible() if not ROOM, CORR or ICE */

    /*
     * We can't make a regular stair off an end of the dungeon.  This
     * attempt can happen when a special level is placed at an end and
     * has an up or down stair specified in its description file.
     */
    if (dunlev(g.u.uz) === (up ? 1 : dunlevs_in_dungeon(g.u.uz)))
        return;

    const dest = {
        dnum: g.u.uz.dnum,
        dlevel: g.u.uz.dlevel + (up ? -1 : 1),
    };
    stairway_add(x, y, !!up, false, dest);

    set_levltyp(x, y, STAIRS);
    g.level.at(x, y).ladder = up ? LA_UP : LA_DOWN;
    if (up) g.level.upstair = { x, y };
    else g.level.dnstair = { x, y };
}

async function generate_stairs() {
    const g = game;
    const pos = { x: 0, y: 0 };
    // Down stairs
    {
        const croom = generate_stairs_find_room();
        if (croom) {
            if (!somexyspace(croom, pos)) {
                pos.x = somex(croom);
                pos.y = somey(croom);
            }
            mkstairs(pos.x, pos.y, 0, croom);
        }
    }
    // Up stairs only if not level 1
    if ((g.u?.uz?.dlevel ?? 1) !== 1) {
        const croom = generate_stairs_find_room();
        if (croom) {
            if (!somexyspace(croom, pos)) {
                pos.x = somex(croom);
                pos.y = somey(croom);
            }
            mkstairs(pos.x, pos.y, 1, croom);
        }
    }
}

// ============================================================
// Niches
// ============================================================

function cardinal_nextto_room(aroom, x, y) {
    const map = game.level;
    const rmno = game.level.rooms.indexOf(aroom) + ROOMOFFSET;
    for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        if (!isok(x + dx, y + dy)) continue;
        const loc = map.at(x + dx, y + dy);
        if (loc && !loc.edge && loc.roomno === rmno) return true;
    }
    return false;
}

function place_niche(aroom) {
    let dy;
    const dd = { x: 0, y: 0 };
    if (rn2(2)) {
        dy = 1;
        if (!finddpos(dd, DIR_S, aroom)) return null;
    } else {
        dy = -1;
        if (!finddpos(dd, DIR_N, aroom)) return null;
    }
    const xx = dd.x, yy = dd.y;
    const niche = game.level.at(xx, yy + dy);
    const back = game.level.at(xx, yy - dy);
    if (!niche || niche.typ !== STONE) return null;
    if (!back || IS_POOL(back.typ) || IS_FURNITURE(back.typ)) return null;
    if (!cardinal_nextto_room(aroom, xx, yy)) return null;
    return { dy, xx, yy };
}

// C ref: mklev.c trap_engravings[]
/* there should be one of these per trap, in the same order as trap.h */
const trap_engravings = [
    null, null, null, null, null,
    null, null, null, null, null,
    null, null, null, null,
    /* 14..16: trap door, teleport, level-teleport */
    'Vlad was here', 'ad aerarium', 'ad aerarium', null, null,
    null, null, null, null, null,
    /* 24..25 */
    null, null,
];

// C ref: dungeon.c Can_fall_thru()
export function Can_fall_thru(lev) {
    return (Can_dig_down(lev) || Is_stronghold(lev));
}

// C ref: dungeon.c Can_dig_down()
export function Can_dig_down(lev) {
    return (!game.level.flags.hardfloor
            && !Is_botlevel(lev)
            && !Invocation_lev(lev));
}

// C ref: dungeon.c Is_botlevel()
function Is_botlevel(lev) {
    return (lev.dlevel === game.dungeons[lev.dnum].num_dunlevs);
}

// C ref: dungeon.h Is_stronghold() macro — Lcheck(x, &stronghold_level)
function Is_stronghold(lev) {
    const z = game.dungeon_topology.d_stronghold_level;
    return ((z.dlevel || z.dnum) && on_level(lev, z)) ? true : false;
}

// C ref: dungeon.c Invocation_lev()
export function Invocation_lev(lev) {
    return (In_hell(lev)
            && lev.dlevel === game.dungeons[lev.dnum].num_dunlevs - 1);
}

async function makeniche(trap_type) {
    const g = game;
    let vct = 8;
    while (vct--) {
        const aroom = g.level.rooms[rn2(g.level.nroom)];
        if (!aroom || aroom.rtype !== OROOM) continue;
        if (aroom.doorct === 1 && rn2(5)) continue;
        const niche = place_niche(aroom);
        if (!niche) continue;
        const { dy, xx, yy } = niche;
        const rm = g.level.at(xx, yy + dy);
        if (!rm) continue;
        if (trap_type || !rn2(4)) {
            rm.typ = SCORR;
            if (trap_type) {
                if (is_hole(trap_type) && !Can_fall_thru(g.u.uz))
                    trap_type = ROCKTRAP;
                const ttmp = await maketrap(xx, yy + dy, trap_type);
                if (ttmp) {
                    if (trap_type !== ROCKTRAP)
                        ttmp.once = 1;
                    if (trap_engravings[trap_type]) {
                        make_engr_at(xx, yy - dy,
                                     trap_engravings[trap_type], null, 0,
                                     DUST);
                        wipe_engr_at(xx, yy - dy, 5,
                                     false); /* age it a little */
                    }
                }
            }
            dosdoor(xx, yy, aroom, SDOOR);
        } else {
            rm.typ = CORR;
            if (rn2(7)) {
                dosdoor(xx, yy, aroom, rn2(5) ? SDOOR : DOOR);
            } else {
                const loc = g.level.at(xx, yy);
                if (!rn2(5) && loc && IS_WALL(loc.typ)) {
                    loc.typ = IRONBARS;
                    if (rn2(3))
                        mkcorpstat(CORPSE, null,
                                   mkclass(S_HUMAN, 0), xx,
                                   yy + dy, true);
                }
                if (!g.level.flags.noteleport) {
                    mksobj_at(SCR_TELEPORTATION, xx, yy + dy, true, false);
                }
                if (!rn2(3)) {
                    mkobj_at(RANDOM_CLASS, xx, yy + dy, true);
                }
            }
        }
        return;
    }
}

async function make_niches() {
    const g = game;
    let ct = rnd(Math.trunc(g.level.nroom / 2) + 1);
    let ltptr = ((g.u?.uz?.dlevel ?? 1) > 15);
    let vamp = ((g.u?.uz?.dlevel ?? 1) > 5 && (g.u?.uz?.dlevel ?? 1) < 25);
    while (ct--) {
        if (ltptr && !rn2(6)) {
            ltptr = false;
            await makeniche(LEVEL_TELEP);
        } else if (vamp && !rn2(6)) {
            vamp = false;
            await makeniche(TRAPDOOR);
        } else {
            await makeniche(NO_TRAP);
        }
    }
}

// ============================================================
// Branch placement
// ============================================================

// C: Is_branchlev(&u.uz) (dungeon.c); svb.branches is filled by init_dungeons().
function is_branchlev() {
    return Is_branchlev(game.u.uz);
}

// C ref: mklev.c find_branch_room()
function find_branch_room(mp) {
    let croom = null;

    if (game.level.nroom === 0) {
        mazexy(mp); /* already verifies location */
    } else {
        croom = generate_stairs_find_room();
        if (!somexyspace(croom, mp))
            console.error('impossible: Can\'t place branch!');
    }
    return croom;
}

// C ref: mklev.c pos_to_room()
/* Find the room for (x,y).  Return null if not in a room. */
function pos_to_room(x, y) {
    for (let i = 0; i < game.level.nroom; i++) {
        const curr = game.level.rooms[i];
        if (inside_room(curr, x, y))
            return curr;
    }
    return null;
}

// C ref: mklev.c place_branch()
/* If given a branch, randomly place a special stair or portal. */
export function place_branch(br, x, y) {
    const g = game;
    const m = { x: 0, y: 0 };
    let dest;
    let make_stairs;

    /*
     * Return immediately if there is no branch to make or we have
     * already made one.  This routine can be called twice when
     * a special level is loaded that specifies an SSTAIR location
     * as a favored spot for a branch.
     */
    if (!br || g.made_branch)
        return;

    if (!x) { /* find random coordinates for branch */
        /* br_room = find_branch_room(&m); */
        find_branch_room(m); /* sets m via mazexy() or somexy() */
        x = m.x;
        y = m.y;
    } else {
        pos_to_room(x, y);
    }

    if (on_level(br.end1, g.u.uz)) {
        /* we're on end1 */
        make_stairs = br.type !== BR_NO_END1;
        dest = br.end2;
    } else {
        /* we're on end2 */
        make_stairs = br.type !== BR_NO_END2;
        dest = br.end1;
    }

    if (br.type === BR_PORTAL) {
        /* iflags.debug_fuzzer && u.ucamefrom: no fuzzer here */
        mkportal(x, y, dest.dnum, dest.dlevel);
    } else if (make_stairs) {
        const goes_up = on_level(br.end1, g.u.uz) ? !!br.end1_up
                                                  : !br.end1_up;

        stairway_add(x, y, goes_up, false, dest);
        set_levltyp(x, y, STAIRS);
        g.level.at(x, y).ladder = goes_up ? LA_UP : LA_DOWN;
        if (goes_up) g.level.upstair = { x, y };
        else g.level.dnstair = { x, y };
    }
    /*
     * Set made_branch to TRUE even if we didn't make a stairwell (i.e.
     * make_stairs is false) since there is currently only one branch
     * per level, if we failed once, we're going to fail again on the
     * next call.
     */
    g.made_branch = true;
}

// ============================================================
// Wallification
// ============================================================

function isSolidTile(x, y) {
    if (!isok(x, y)) return true;
    return IS_STWALL(game.level?.at(x, y)?.typ ?? STONE);
}
function isWallOrStone(x, y) {
    if (!isok(x, y)) return 1;
    const typ = game.level?.at(x, y)?.typ ?? STONE;
    return (typ === STONE || isWallTile(x, y)) ? 1 : 0;
}
function isWallTile(x, y) {
    if (!isok(x, y)) return 0;
    const typ = game.level?.at(x, y)?.typ ?? STONE;
    return (IS_WALL(typ) || IS_DOOR(typ) || typ === LAVAWALL
        || typ === WATER || typ === SDOOR || typ === IRONBARS) ? 1 : 0;
}
function extend_spine(locale, wall_there, dx, dy) {
    const nx = 1 + dx, ny = 1 + dy;
    if (!wall_there) return 0;
    if (dx) {
        if (locale[1][0] && locale[1][2] && locale[nx][0] && locale[nx][2]) return 0;
        return 1;
    }
    if (locale[0][1] && locale[2][1] && locale[0][ny] && locale[2][ny]) return 0;
    return 1;
}
/* C ref: decl.c gb.bughack -- for preserving the insect legs when
   wallifying baalz level; inarea {COLNO, ROWNO, 0, 0} matches nothing */
export function bughack() {
    if (!game.bughack)
        game.bughack = { inarea: { x1: COLNO, y1: ROWNO, x2: 0, y2: 0 },
                         delarea: { x1: COLNO, y1: ROWNO, x2: 0, y2: 0 } };
    return game.bughack;
}
function in_bughack_area(x, y) {
    const a = bughack().inarea;
    return within_bounded_area(x, y, a.x1, a.y1, a.x2, a.y2);
}
// C ref: mkmaze.c wall_cleanup()
function wall_cleanup(x1, y1, x2, y2) {
    const map = game.level;
    if (!map) return;
    for (let x = x1; x <= x2; x++)
        for (let y = y1; y <= y2; y++) {
            if (in_bughack_area(x, y))
                continue;
            const loc = map.at(x, y);
            const typ = loc?.typ ?? STONE;
            if (!(IS_WALL(typ) && typ !== DBWALL)) continue;
            if (isSolidTile(x-1,y-1) && isSolidTile(x-1,y) && isSolidTile(x-1,y+1)
                && isSolidTile(x,y-1) && isSolidTile(x,y+1)
                && isSolidTile(x+1,y-1) && isSolidTile(x+1,y) && isSolidTile(x+1,y+1))
                loc.typ = STONE;
        }
}
export function fix_wall_spines(x1, y1, x2, y2) {
    const spineArray = [VWALL, HWALL, HWALL, HWALL,
        VWALL, TRCORNER, TLCORNER, TDWALL,
        VWALL, BRCORNER, BLCORNER, TUWALL,
        VWALL, TLWALL, TRWALL, CROSSWALL];
    const map = game.level;
    if (!map) return;
    for (let x = x1; x <= x2; x++)
        for (let y = y1; y <= y2; y++) {
            const loc = map.at(x, y);
            const typ = loc?.typ ?? STONE;
            if (!(IS_WALL(typ) && typ !== DBWALL)) continue;
            /* set the locations TRUE if rock or wall or out of bounds */
            const loc_f = in_bughack_area(x, y) /* for baalz insect */
                ? isWallTile : isWallOrStone;
            const locale = [
                [loc_f(x-1,y-1), loc_f(x-1,y), loc_f(x-1,y+1)],
                [loc_f(x,y-1), 0, loc_f(x,y+1)],
                [loc_f(x+1,y-1), loc_f(x+1,y), loc_f(x+1,y+1)],
            ];
            const bits = (extend_spine(locale, isWallTile(x,y-1), 0, -1) << 3)
                | (extend_spine(locale, isWallTile(x,y+1), 0, 1) << 2)
                | (extend_spine(locale, isWallTile(x+1,y), 1, 0) << 1)
                | extend_spine(locale, isWallTile(x-1,y), -1, 0);
            if (bits) loc.typ = spineArray[bits];
        }
}
export function wallification(x1, y1, x2, y2) {
    wall_cleanup(x1, y1, x2, y2);
    fix_wall_spines(x1, y1, x2, y2);
}

// ============================================================
// Fill ordinary room
// ============================================================

// C ref: dungeon.h In_mines(), In_quest(), In_V_tower(), Is_oracle_level(),
// Is_rogue_level(), In_endgame(), Inhell
function In_mines(lev) {
    return lev.dnum === game.dungeon_topology.d_mines_dnum;
}
function In_quest(lev) {
    return lev.dnum === game.dungeon_topology.d_quest_dnum;
}
function In_V_tower(lev) {
    return lev.dnum === game.dungeon_topology.d_tower_dnum;
}
function Is_oracle_level(lev) {
    return on_level(lev, game.dungeon_topology.d_oracle_level);
}
function Is_rogue_level(lev) {
    const z = game.dungeon_topology.d_rogue_level;
    return !!((z.dlevel || z.dnum) && lev.dnum === z.dnum && lev.dlevel === z.dlevel);
}
function In_endgame(lev) {
    return lev.dnum === game.dungeon_topology.d_astral_level.dnum;
}
export function Inhell() { return In_hell(game.u.uz); }

// C ref: dungeon.c single_level_branch()
function single_level_branch(lev) {
    return dunlevs_in_dungeon(lev) === 1;
}

// C ref: mklev.c mktrap_victim()
/* generate a corpse and some items on top of a trap */
function mktrap_victim(ttmp) {
    /* Object generated by the trap; initially NULL, stays NULL if
       the trap doesn't generate objects. */
    let otmp = null;
    let victim_mnum; /* race of the victim */
    const lvl = level_difficulty();
    const kind = ttmp.ttyp;
    const x = ttmp.tx, y = ttmp.ty;

    /* Not all trap types have special handling here; only the ones
       that kill in a specific way that's obvious after the fact. */
    switch (kind) {
    case ARROW_TRAP:
        otmp = mksobj(ARROW, true, false);
        otmp.otrapped /* opoisoned */ = 0;
        /* don't adjust the quantity; maybe the trap shot multiple
           times, there was an untrapping attempt, etc... */
        break;
    case DART_TRAP:
        otmp = mksobj(DART, true, false);
        break;
    case ROCKTRAP:
        otmp = mksobj(ROCK, true, false);
        break;
    default:
        /* no item dropped by the trap */
        break;
    }
    if (otmp) {
        place_object(otmp, x, y);
    }

    /* now otmp is reused for other items we're placing */

    /* Place a random possession. This could be a weapon, tool,
       food, or gem, i.e. the item classes that are typically
       nonmagical and not worthless. */
    do {
        let poss_class = RANDOM_CLASS; /* init => lint suppression */

        switch (rn2(4)) {
        case 0:
            poss_class = WEAPON_CLASS;
            break;
        case 1:
            poss_class = TOOL_CLASS;
            break;
        case 2:
            poss_class = FOOD_CLASS;
            break;
        case 3:
            poss_class = GEM_CLASS;
            break;
        }

        /* these items are always cursed, both for flavour (owned
           by a dead adventurer, bones-pile-style) and for balance
           (less useful to use, and encourage pets to avoid the trap) */
        otmp = mkobj(poss_class, false);
        curse(otmp);
        /* for mktrap_victim(), PIT is actually an exploded LANDMINE;
           breaktest() is not ported, and landmines need difficulty 6 */
        place_object(otmp, x, y);

        /* 20% chance of placing an additional item, recursively */
    } while (!rn2(5));

    /* Place a corpse. */
    switch (rn2(15)) {
    case 0:
        /* elf corpses are the rarest as they're the most useful */
        victim_mnum = PM_ELF;
        /* elven adventurers get sleep resistance early; so don't
           generate elf corpses on sleeping gas traps unless a)
           we're on dlvl 2 (1 is impossible) and b) we pass a coin
           flip */
        if (kind === SLP_GAS_TRAP && !(lvl <= 2 && rn2(2)))
            victim_mnum = PM_HUMAN;
        break;
    case 1: case 2:
        victim_mnum = PM_DWARF;
        break;
    case 3: case 4: case 5:
        victim_mnum = PM_ORC;
        break;
    case 6: case 7: case 8: case 9:
        /* more common as they could have come from the Mines */
        victim_mnum = PM_GNOME;
        /* 10% chance of a candle too */
        if (!rn2(10)) {
            otmp = mksobj(rn2(4) ? TALLOW_CANDLE : WAX_CANDLE, true, false);
            otmp.quan = 1;
            otmp.owt = weight(otmp);
            curse(otmp);
            place_object(otmp, x, y);
            if (!game.level.at(x, y).lit)
                begin_burn(otmp, false);
        }
        break;
    default:
        /* human is the most common result */
        victim_mnum = PM_HUMAN;
        break;
    }
    /* PM_HUMAN is a placeholder monster primarily used for zombie, mummy,
       and vampire corpses; usually change it into a fake player monster
       instead (always human); no role-specific equipment is provided */
    if (victim_mnum === PM_HUMAN && rn2(25))
        victim_mnum = rn1(PM_WIZARD - PM_ARCHEOLOGIST, PM_ARCHEOLOGIST);
    otmp = mkcorpstat(CORPSE, null, mons[victim_mnum], x, y, CORPSTAT_INIT);
    if (otmp)
        otmp.age -= (TAINT_AGE + 1); /* died too long ago to safely eat */
}

// C ref: mklev.c traptype_rnd()
/* pick a random trap type, return NO_TRAP if "too hard" */
function traptype_rnd(mktrapflags) {
    const lvl = level_difficulty();
    let kind = rnd(TRAPNUM - 1);

    switch (kind) {
        /* these are controlled by the feature or object they guard,
           not by the map so mustn't be created on it */
    case TRAPPED_DOOR:
    case TRAPPED_CHEST:
        kind = NO_TRAP;
        break;
        /* these can have a random location but can't be generated
           randomly */
    case MAGIC_PORTAL:
    case VIBRATING_SQUARE:
        kind = NO_TRAP;
        break;
    case ROLLING_BOULDER_TRAP:
    case SLP_GAS_TRAP:
        if (lvl < 2)
            kind = NO_TRAP;
        break;
    case LEVEL_TELEP:
        if (lvl < 5 || game.level.flags.noteleport
            || single_level_branch(game.u.uz))
            kind = NO_TRAP;
        break;
    case SPIKED_PIT:
        if (lvl < 5)
            kind = NO_TRAP;
        break;
    case LANDMINE:
        if (lvl < 6)
            kind = NO_TRAP;
        break;
    case WEB:
        if (lvl < 7 && !(mktrapflags & MKTRAP_NOSPIDERONWEB))
            kind = NO_TRAP;
        break;
    case STATUE_TRAP:
    case POLY_TRAP:
        if (lvl < 8)
            kind = NO_TRAP;
        break;
    case FIRE_TRAP:
        if (!Inhell())
            kind = NO_TRAP;
        break;
    case TELEP_TRAP:
        if (game.level.flags.noteleport)
            kind = NO_TRAP;
        break;
    case HOLE:
        /* make these much less often than other traps */
        if (rn2(7))
            kind = NO_TRAP;
        break;
    }
    return kind;
}

// C ref: mklev.c traptype_roguelvl()
/* random trap type for the Rogue level */
function traptype_roguelvl() {
    let kind;

    switch (rn2(7)) {
    default:
        kind = BEAR_TRAP;
        break; /* 0 */
    case 1:
        kind = ARROW_TRAP;
        break;
    case 2:
        kind = DART_TRAP;
        break;
    case 3:
        kind = TRAPDOOR;
        break;
    case 4:
        kind = PIT;
        break;
    case 5:
        kind = SLP_GAS_TRAP;
        break;
    case 6:
        kind = RUST_TRAP;
        break;
    }
    return kind;
}

// C ref: mklev.c mktrap()
/* select trap type and location, then use maketrap() to create it;
   make it at location 'tm' when that isn't Null, otherwise in 'croom'
   if mktrapflags doesn't have MKTRAP_MAZEFLAG set, else in maze corridor */
export function mktrap(num, mktrapflags, croom, tm) {
    let t;
    let m = { x: 0, y: 0 };
    let kind;
    const lvl = level_difficulty();

    if (!tm && !croom && !(mktrapflags & MKTRAP_MAZEFLAG)) {
        /* complain when the combination of arguments will never set 'm' */
        return;
    }

    /* no traps in pools */
    if (tm && (IS_POOL(game.level.at(tm.x, tm.y).typ)
               || game.level.at(tm.x, tm.y).typ === LAVAPOOL))
        return;

    if (num > NO_TRAP && num < TRAPNUM) {
        kind = num;
    } else if (Is_rogue_level(game.u.uz)) {
        kind = traptype_roguelvl();
    } else if (Inhell() && !rn2(5)) {
        /* bias the frequency of fire traps in Gehennom */
        kind = FIRE_TRAP;
    } else {
        do {
            kind = traptype_rnd(mktrapflags);
        } while (kind === NO_TRAP);
    }

    if (is_hole(kind) && !Can_fall_thru(game.u.uz))
        kind = ROCKTRAP;

    if (tm) {
        m = { x: tm.x, y: tm.y };
    } else {
        let tryct = 0;
        const avoid_boulder = (is_pit(kind) || is_hole(kind));

        do {
            if (++tryct > 200)
                return;
            if ((mktrapflags & MKTRAP_MAZEFLAG) !== 0)
                mazexy(m);
            else if (croom && !somexyspace(croom, m))
                return;
        } while (occupied(m.x, m.y)
                 || (avoid_boulder && sobj_at(BOULDER, m.x, m.y)));
    }

    t = maketrap(m.x, m.y, kind);
    /* we should always get type of trap we're asking for (occupied() test
       should prevent cases where that might not happen) but be paranoid */
    kind = t ? t.ttyp : NO_TRAP;

    if (kind === WEB && !(mktrapflags & MKTRAP_NOSPIDERONWEB))
        makemon(mons[PM_GIANT_SPIDER], m.x, m.y, NO_MM_FLAGS);
    if (t && (mktrapflags & MKTRAP_SEEN))
        t.tseen = true;
    /* MAGIC_PORTAL with u.ucamefrom: not generated randomly */

    /* The hero isn't the only person who's entered the dungeon in
       search of treasure. On the very shallowest levels, there's a
       chance that a created trap will have killed something already
       (and this is guaranteed on the first level). [...] */
    if (game.in_mklev
        && kind !== NO_TRAP && !(mktrapflags & MKTRAP_NOVICTIM)
        && lvl <= rnd(4)
        && kind !== SQKY_BOARD && kind !== RUST_TRAP
        /* rolling boulder trap might not have a boulder if there was no
           viable path (such as when placed in the corner of a room), in
           which case tx,ty==launch.x,y; no boulder => no dead predecessor */
        && !(kind === ROLLING_BOULDER_TRAP
             && t.launch.x === t.tx && t.launch.y === t.ty)
        && !is_pit(kind) && (kind < HOLE || kind === MAGIC_TRAP)) {
        if (kind === LANDMINE) {
            /* if victim was killed by a land mine, we won't scatter objects;
               treat it as exploded, converting it into an unconcealed pit */
            t.ttyp = PIT;
            t.tseen = 1;
        }
        mktrap_victim(t);
    }
    return;
}

// C ref: mklev.c mkfount()
function mkfount(croom) {
    const m = { x: 0, y: 0 };

    if (!find_okay_roompos(croom, m))
        return;

    /* Put a fountain at m.x, m.y */
    if (!set_levltyp(m.x, m.y, FOUNTAIN))
        return;
    /* Is it a "blessed" fountain? (affects drinking from fountain) */
    if (!rn2(7))
        game.level.at(m.x, m.y).blessedftn = 1;

    game.level.flags.nfountains++;
}

// C ref: mklev.c find_okay_roompos()
function find_okay_roompos(croom, crd) {
    let tryct = 0;

    do {
        if (++tryct > 200)
            return false;
        if (!somexyspace(croom, crd))
            return false;
    } while (occupied(crd.x, crd.y) || bydoor(crd.x, crd.y));
    return true;
}

// C ref: mklev.c mksink()
function mksink(croom) {
    const m = { x: 0, y: 0 };

    if (!find_okay_roompos(croom, m))
        return;

    /* Put a sink at m.x, m.y */
    if (!set_levltyp(m.x, m.y, SINK))
        return;

    game.level.flags.nsinks++;
}

// C ref: mklev.c mkaltar()
function mkaltar(croom) {
    const m = { x: 0, y: 0 };
    let al;

    if (croom.rtype !== OROOM)
        return;

    if (!find_okay_roompos(croom, m))
        return;

    /* Put an altar at m.x, m.y */
    if (!set_levltyp(m.x, m.y, ALTAR))
        return;

    /* -1 - A_CHAOTIC, 0 - A_NEUTRAL, 1 - A_LAWFUL */
    al = rn2(A_LAWFUL + 2) - 1;
    game.level.at(m.x, m.y).altarmask = Align2amask(al);
}

// C ref: mklev.c mkgrave()
function mkgrave(croom) {
    const m = { x: 0, y: 0 };
    let tryct = 0;
    let otmp;
    const dobell = !rn2(10);

    if (croom.rtype !== OROOM)
        return;

    if (!find_okay_roompos(croom, m))
        return;

    /* Put a grave at <m.x,m.y> */
    make_grave(m.x, m.y, dobell ? 'Saved by the bell!' : null);

    /* Possibly fill it with objects */
    if (!rn2(3)) {
        /* this used to use mkgold(), [...] now we create a loose, easily
           buriable, stack */
        const gold = mksobj(GOLD_PIECE, true, false);

        gold.quan = rnd(20) + level_difficulty() * rnd(5);
        gold.owt = weight(gold);
        gold.ox = m.x, gold.oy = m.y;
        add_to_buried(gold);
    }
    for (tryct = rn2(5); tryct; tryct--) {
        otmp = mkobj(RANDOM_CLASS, true);
        if (!otmp)
            return;
        curse(otmp);
        otmp.ox = m.x;
        otmp.oy = m.y;
        add_to_buried(otmp);
    }

    /* Leave a bell, in case we accidentally buried someone alive */
    if (dobell)
        mksobj_at(BELL, m.x, m.y, true, false);
    return;
}

// C ref: mklev.c fill_ordinary_room()
function fill_ordinary_room(croom, bonus_items) {
    const g = game;
    let trycnt = 0;
    const pos = { x: 0, y: 0 };
    let tmonst; /* always put a web with a spider */
    let x, y;
    let skip_chests = false;

    if (croom.rtype !== OROOM && croom.rtype !== THEMEROOM)
        return;

    /* If there are subrooms, fill them now - we don't want an outer room
     * that's specified to be unfilled to block an inner subroom that's
     * specified to be filled. */
    for (x = 0; x < (croom.nsubrooms || 0); ++x) {
        const subroom = croom.sbrooms[x];

        if (!subroom) {
            return;
        }
        fill_ordinary_room(subroom, false);
    }

    if (croom.needfill !== FILL_NORMAL)
        return;

    /* put a sleeping monster inside */
    /* Note: monster may be on the stairs. This cannot be
       avoided: maybe the player fell through a trap door
       while a monster was on the stairs. Conclusion:
       we have to check for monsters on the stairs anyway. */

    if ((g.u.uhave?.amulet || !rn2(3)) && somexyspace(croom, pos)) {
        tmonst = makemon(null, pos.x, pos.y, MM_NOGRP);
        if (tmonst && tmonst.data === mons[PM_GIANT_SPIDER]
            && !occupied(pos.x, pos.y))
            maketrap(pos.x, pos.y, WEB);
    }
    /* put traps and mimics inside */
    x = 8 - Math.trunc(level_difficulty() / 6);
    if (x <= 1)
        x = 2;
    while (!rn2(x) && (++trycnt < 1000))
        mktrap(0, MKTRAP_NOFLAGS, croom, null);
    if (!rn2(3) && somexyspace(croom, pos))
        mkgold(0, pos.x, pos.y);
    if (!Is_rogue_level(g.u.uz)) {
        if (!rn2(10))
            mkfount(croom);
        if (!rn2(60))
            mksink(croom);
        if (!rn2(60))
            mkaltar(croom);
        x = 80 - (depth_of_level(g.u.uz) * 2);
        if (x < 2)
            x = 2;
        if (!rn2(x))
            mkgrave(croom);

        /* put statues inside */
        if (!rn2(20) && somexyspace(croom, pos))
            mkcorpstat(STATUE, null, null, pos.x, pos.y, CORPSTAT_INIT);

        /*
         * bonus_items means that this is the room where the bonus item
         * should be placed, if there is one; but there might not be a
         * bonus item on any given level. [...]
         */
        if (bonus_items && somexyspace(croom, pos)) {
            const uz_branch = Is_branchlev(g.u.uz);
            const mines_dnum = g.dungeon_topology.d_mines_dnum;
            const oracle_level = g.dungeon_topology.d_oracle_level;

            if (uz_branch && g.u.uz.dnum !== mines_dnum
                && (uz_branch.end1.dnum === mines_dnum
                    || uz_branch.end2.dnum === mines_dnum)) {
                mksobj_at((rn2(5) < 3) ? FOOD_RATION
                          : rn2(2) ? CRAM_RATION
                            : LEMBAS_WAFER,
                          pos.x, pos.y, true, false);
            } else if (g.u.uz.dnum === oracle_level.dnum
                       && g.u.uz.dlevel < oracle_level.dlevel && rn2(3)) {
                let otmp;
                let otyp, tryct = 0;
                let cursed;
                /* reverse probabilities compared to non-supply chests;
                   these are twice as likely to be chests than large
                   boxes, rather than vice versa */
                const supply_chest = mksobj_at(rn2(3) ? CHEST : LARGE_BOX,
                                               pos.x, pos.y, false, false);

                supply_chest.olocked = !!(rn2(6));

                do {
                    const supply_items = [
                        POT_EXTRA_HEALING,
                        POT_SPEED,
                        POT_GAIN_ENERGY,
                        SCR_ENCHANT_WEAPON,
                        SCR_ENCHANT_ARMOR,
                        SCR_CONFUSE_MONSTER,
                        SCR_SCARE_MONSTER,
                        WAN_DIGGING,
                        SPE_HEALING,
                    ];

                    /* 50% this is a potion of healing */
                    otyp = rn2(2) ? POT_HEALING : ROLL_FROM(supply_items);
                    otmp = mksobj(otyp, true, false);
                    if (otyp === POT_HEALING && rn2(2)) {
                        otmp.quan = 2;
                        otmp.owt = weight(otmp);
                    }
                    cursed = otmp.cursed;
                    add_to_container(supply_chest, otmp); /* owt updated below */

                    ++tryct;
                    if (tryct === 50) {
                        break;
                    }
                    /* guarantee at least one noncursed item, with a small
                       probability of more; if we generate a cursed item, it's
                       added to the supply chest but we reroll for a noncursed
                       item and add that too */
                } while (cursed || !rn2(5));

                /* maybe put a random item into the supply chest, biased
                   slightly towards low-level spellbooks; avoid tools
                   because chests don't fit into other chests */
                if (rn2(3)) {
                    const extra_classes = [
                        FOOD_CLASS,
                        WEAPON_CLASS,
                        ARMOR_CLASS,
                        GEM_CLASS,
                        SCROLL_CLASS,
                        POTION_CLASS,
                        RING_CLASS,
                        SPBOOK_no_NOVEL,
                        SPBOOK_no_NOVEL,
                        SPBOOK_no_NOVEL,
                    ];
                    const oclass = ROLL_FROM(extra_classes);

                    otmp = mkobj(oclass, false);
                    if (oclass === SPBOOK_no_NOVEL) {
                        let pass;
                        const maxpass = (depth_of_level(g.u.uz) > 2) ? 2 : 3;

                        /* bias towards lower level by generating again
                           and taking the lower-level book; do that three
                           times if on level 1 or 2, twice when deeper */
                        for (pass = 1; pass <= maxpass; ++pass) {
                            const otmp2 = mkobj(oclass, false);

                            if (objects[otmp.otyp].oc_level
                                <= objects[otmp2.otyp].oc_level) {
                                dealloc_obj(otmp2);
                            } else {
                                dealloc_obj(otmp);
                                otmp = otmp2;
                            }
                        }
                    }
                    add_to_container(supply_chest, otmp); /* owt updated below */
                }

                /* add_to_container() doesn't update the container's weight */
                supply_chest.owt = weight(supply_chest);

                skip_chests = true; /* don't want a second chest in this room */
            }
        }

        /* put box/chest inside;
         *  40% chance for at least 1 box, regardless of number
         *  of rooms; about 5 - 7.5% for 2 boxes, least likely
         *  when few rooms; chance for 3 or more is negligible.
         */
        if (!skip_chests && !rn2(Math.trunc(g.level.nroom * 5 / 2))
            && somexyspace(croom, pos))
            mksobj_at(rn2(3) ? LARGE_BOX : CHEST,
                      pos.x, pos.y, true, false);

        /* maybe make some graffiti */
        if (!rn2(27 + 3 * Math.abs(depth_of_level(g.u.uz)))) {
            const pristinebuf = { s: '' };
            const mesg = random_engraving(pristinebuf);

            if (mesg) {
                do {
                    somexyspace(croom, pos);
                    x = pos.x;
                    y = pos.y;
                } while (g.level.at(x, y).typ !== ROOM && !rn2(40));
                if (g.level.at(x, y).typ === ROOM)
                    make_engr_at(x, y, mesg, pristinebuf.s, 0, MARK);
            }
        }
    }

    /* skip_nonrogue: */
    if (!rn2(3) && somexyspace(croom, pos)) {
        mkobj_at(RANDOM_CLASS, pos.x, pos.y, true);
        trycnt = 0;
        while (!rn2(5)) {
            if (++trycnt > 100) {
                break;
            }
            if (somexyspace(croom, pos)) {
                mkobj_at(RANDOM_CLASS, pos.x, pos.y, true);
            }
        }
    }
}

// ============================================================
// Mineralize
// ============================================================

// C ref: mklev.c water_has_kelp()
/* return TRUE if water location at (x,y) should have kelp. */
function water_has_kelp(x, y, kelp_pool, kelp_moat) {
    const typ = game.level.at(x, y).typ;
    if ((kelp_pool && (typ === POOL
                       || (typ === WATER && !Is_waterlevel(game.u.uz)))
         && !rn2(kelp_pool))
        || (kelp_moat && typ === MOAT && !rn2(kelp_moat)))
        return true;
    return false;
}

// C ref: dungeon.h Is_waterlevel()
function Is_waterlevel(lev) {
    return on_level(lev, game.dungeon_topology.d_water_level);
}

// C ref: mklev.c mineralize()
/*
 *      Place deposits of minerals (gold and misc gems) in the stone
 *      surrounding the rooms on the map.
 *      Also place kelp in water.
 *      mineralize(-1, -1, -1, -1, FALSE); => "default" behavior
 */
export function mineralize(kelp_pool, kelp_moat, goldprob, gemprob,
                           skip_lvl_checks) {
    const g = game;
    let sp;
    let otmp;
    let x, y;
    let cnt;
    const typ = (xx, yy) => g.level.at(xx, yy).typ;

    if (kelp_pool < 0)
        kelp_pool = 10;
    if (kelp_moat < 0)
        kelp_moat = 30;

    /* Place kelp, except on the plane of water */
    if (!skip_lvl_checks && In_endgame(g.u.uz))
        return;
    for (x = 2; x < (COLNO - 2); x++)
        for (y = 1; y < (ROWNO - 1); y++)
            if (water_has_kelp(x, y, kelp_pool, kelp_moat))
                mksobj_at(KELP_FROND, x, y, true, false);

    /* determine if it is even allowed;
       almost all special levels are excluded */
    if (!skip_lvl_checks
        && (In_hell(g.u.uz) || In_V_tower(g.u.uz) || Is_rogue_level(g.u.uz)
            || g.level.flags.arboreal
            || ((sp = Is_special(g.u.uz)) !== null && !Is_oracle_level(g.u.uz)
                && (!In_mines(g.u.uz) || sp.flags?.town))))
        return;

    /* basic level-related probabilities */
    if (goldprob < 0)
        goldprob = 20 + Math.trunc(depth_of_level(g.u.uz) / 3);
    if (gemprob < 0)
        gemprob = Math.trunc(goldprob / 4);

    /* mines have ***MORE*** goodies - otherwise why mine? */
    if (!skip_lvl_checks) {
        if (In_mines(g.u.uz)) {
            goldprob *= 2;
            gemprob *= 3;
        } else if (In_quest(g.u.uz)) {
            goldprob = Math.trunc(goldprob / 4);
            gemprob = Math.trunc(gemprob / 6);
        }
    }

    /*
     * Seed rock areas with gold and/or gems.
     * We use fairly low level object handling to avoid unnecessary
     * overhead from placing things in the floor chain prior to burial.
     */
    for (x = 2; x < (COLNO - 2); x++)
        for (y = 1; y < (ROWNO - 1); y++)
            if (typ(x, y + 1) !== STONE) { /* <x,y> spot not eligible */
                y += 2; /* next two spots aren't eligible either */
            } else if (typ(x, y) !== STONE) { /* this spot not eligible */
                y += 1; /* next spot isn't eligible either */
            } else if (!(g.level.at(x, y).wall_info & W_NONDIGGABLE)
                       && typ(x, y - 1) === STONE
                       && typ(x + 1, y - 1) === STONE
                       && typ(x - 1, y - 1) === STONE
                       && typ(x + 1, y) === STONE
                       && typ(x - 1, y) === STONE
                       && typ(x + 1, y + 1) === STONE
                       && typ(x - 1, y + 1) === STONE) {
                if (rn2(1000) < goldprob) {
                    if ((otmp = mksobj(GOLD_PIECE, false, false)) !== null) {
                        otmp.ox = x, otmp.oy = y;
                        otmp.quan = 1 + rnd(goldprob * 3);
                        otmp.owt = weight(otmp);
                        if (!rn2(3))
                            add_to_buried(otmp);
                        else
                            place_object(otmp, x, y);
                    }
                }
                if (rn2(1000) < gemprob) {
                    for (cnt = rnd(2 + Math.trunc(dunlev(g.u.uz) / 3)); cnt > 0; cnt--)
                        if ((otmp = mkobj(GEM_CLASS, false)) !== null) {
                            if (otmp.otyp === ROCK) {
                                dealloc_obj(otmp); /* discard it */
                            } else {
                                otmp.ox = x, otmp.oy = y;
                                if (!rn2(3))
                                    add_to_buried(otmp);
                                else
                                    place_object(otmp, x, y);
                            }
                        }
                }
            }
}

// ============================================================
// Level finalize topology
// ============================================================

// C ref: mkmaze.c get_level_extends()
export function get_level_extends() {
    const map = game.level;
    let xmin = 0, xmax = COLNO - 1, ymin = 0, ymax = ROWNO - 1;
    let found = false, nonwall = false;
    for (xmin = 0; !found && xmin <= COLNO - 1; xmin++) {
        for (let y = 0; y <= ROWNO - 1; y++) {
            const typ = map.at(xmin, y)?.typ ?? STONE;
            if (typ !== STONE) { found = true; if (!IS_WALL(typ)) nonwall = true; }
        }
    }
    xmin -= (nonwall || !game.level?.flags?.is_maze_lev) ? 2 : 1;
    if (xmin < 0)
        xmin = 0;
    found = false; nonwall = false;
    for (xmax = COLNO - 1; !found && xmax >= 0; xmax--) {
        for (let y = 0; y <= ROWNO - 1; y++) {
            const typ = map.at(xmax, y)?.typ ?? STONE;
            if (typ !== STONE) { found = true; if (!IS_WALL(typ)) nonwall = true; }
        }
    }
    xmax += (nonwall || !game.level?.flags?.is_maze_lev) ? 2 : 1;
    if (xmax >= COLNO)
        xmax = COLNO - 1;
    found = false; nonwall = false;
    for (ymin = 0; !found && ymin <= ROWNO - 1; ymin++) {
        for (let x = xmin; x <= xmax; x++) {
            const typ = map.at(x, ymin)?.typ ?? STONE;
            if (typ !== STONE) { found = true; if (!IS_WALL(typ)) nonwall = true; }
        }
    }
    ymin -= (nonwall || !game.level?.flags?.is_maze_lev) ? 2 : 1;
    found = false; nonwall = false;
    for (ymax = ROWNO - 1; !found && ymax >= 0; ymax--) {
        for (let x = xmin; x <= xmax; x++) {
            const typ = map.at(x, ymax)?.typ ?? STONE;
            if (typ !== STONE) { found = true; if (!IS_WALL(typ)) nonwall = true; }
        }
    }
    ymax += (nonwall || !game.level?.flags?.is_maze_lev) ? 2 : 1;
    return { xmin, xmax, ymin, ymax };
}

// C ref: mkmaze.c bound_digging()
/* put a non-diggable/non-phaseable boundary around the initial portion
 * of a level map. */
function bound_digging() {
    const map = game.level;

    if (Is_earthlevel_mk(game.u.uz))
        return; /* everything diggable here */

    const { xmin, xmax, ymin, ymax } = get_level_extends();
    for (let x = 0; x < COLNO; x++)
        for (let y = 0; y < ROWNO; y++) {
            const loc = map.at(x, y);
            if (!loc) continue;
            if (IS_STWALL(loc.typ)) {
                /* undiggable walls at edges, ... */
                if (y <= ymin || y >= ymax || x <= xmin || x >= xmax)
                    loc.wall_info = (loc.wall_info || 0) | W_NONDIGGABLE;
                /* one tile past that, everything is also unphaseable */
                if (y < ymin || y > ymax || x < xmin || x > xmax)
                    loc.wall_info = (loc.wall_info || 0) | W_NONPASSWALL_MK;
            }
        }
}

/* set_wall_state(): display.c, in display.js */

function level_finalize_topology() {
    bound_digging();
    mineralize(-1, -1, -1, -1, false);
    game.in_mklev = false;
    if (!game.level?.flags?.is_maze_lev) {
        const nroom = game.level?.nroom ?? 0;
        for (let i = 0; i < nroom; i++)
            topologize(game.level.rooms?.[i]);
    }
    set_wall_state();
    const rooms = game.level?.rooms ?? [];
    for (let i = 0; i < rooms.length; i++) {
        const rm = rooms[i];
        if (rm && rm.rtype != null) rm.orig_rtype = rm.rtype;
    }
}
