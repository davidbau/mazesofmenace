// dungeon.js — dungeon structure and level bookkeeping.
// C ref: dungeon.c
//
// Ported so far: init_dungeons() and everything it calls (reading
// dungeon.lua, placing the special levels, linking the branches, the castle
// tune, fixup_level_locations()), plus the level helpers they and o_init.c
// use: dunlev, dunlevs_in_dungeon, ledger_no, maxledgerno, depth, on_level,
// Is_branchlev, assign_level, find_level, insert_branch.
//
// Globals (decl.h) live on the game object:
//   svd.dungeons[]        game.dungeons        (MAXDUNGEON dungeon structs)
//   svn.n_dgns            game.n_dgns
//   svd.dungeon_topology  game.dungeon_topology (d_oracle_level, ...,
//                         d_quest_dnum, ...; hack.h's oracle_level macro is
//                         game.dungeon_topology.d_oracle_level)
//   svb.branches          game.branches        (linked list through .next)
//   svs.sp_levchn         game.sp_levchn       (linked list through .next)
//   svt.tune              game.tune            (the 5-letter castle tune)
// wizard (flag.h: flags.debug) is game.flags.debug.
//
// C reads dungeon.lua through its private Lua state's stack. The JS port
// passes the Lua table C has on top of the stack (see nhlua.js), so
// init_dungeon_dungeons(L, pd, i) is init_dungeon_dungeons(dgn, pd, i)
// where dgn is the Lua table dungeon[i + 1].

import { impossible } from './hack.js';
import { game } from './gstate.js';
import { rn2, rn1 } from './rng.js';
import {
    TRUE, FALSE, MAXDUNGEON, MAXLEVEL, LEV_LIMIT, BRANCH_LIMIT, NHL_SB_SAFE,
    TBR_STAIR, TBR_NO_UP, TBR_NO_DOWN, TBR_PORTAL,
    BR_STAIR, BR_NO_END1, BR_NO_END2, BR_PORTAL,
    TOWN, HELLISH, MAZELIKE, ROGUELIKE, UNCONNECTED, D_ALIGN_MASK,
    D_ALIGN_NONE, D_ALIGN_CHAOTIC, D_ALIGN_NEUTRAL, D_ALIGN_LAWFUL, Align2amask,
    In_endgame, NHW_MENU, MENU_BEHAVE_STANDARD, MENU_ITEMFLAGS_NONE, PICK_ONE,
} from './const.js';
import { NO_COLOR, ATR_NONE } from './terminal.js';
import {
    tty_create_nhwindow, tty_start_menu, tty_add_menu, tty_end_menu,
    tty_select_menu, tty_destroy_nhwindow, tty_putstr_sync,
    tty_display_nhwindow,
} from './wintty.js';
import { Is_airlevel, Is_qstart, MAGIC_PORTAL } from './const.js';
import { add_menu_heading } from './invent.js';
import { makeplural } from './objnam.js';
import {
    nhl_init, nhl_loadlua, nhl_done, lua_type, lua_istable, lua_len,
    luaL_checkoption, get_table_int, get_table_int_opt, get_table_str,
    get_table_str_opt, get_table_option, LUA_TTABLE, LUA_TSTRING, LUA_TNIL,
} from './nhlua.js';
import { strcmpi, strncmpi, mungspaces } from './hacklib.js';
import { tty_getlin } from './wintty.js';
import { within_bounded_area } from './rect.js';
import { stairway_find_special_dir } from './mklev.js';
import { in_rooms } from './hack.js';
import { In_sokoban, In_quest, Is_waterlevel, Is_firelevel, Is_earthlevel,
         IS_AIR, IS_ROOM, IS_WALL, IS_DOOR, SDOOR, VAULT, TEMPLE,
         SHOPBASE } from './const.js';
import { AM_MASK, LEVITATION, MAXNROFROOMS, TREE, FOUNTAIN, THRONE, SINK,
         GRAVE, ALTAR, DOOR, DBWALL, DRAWBRIDGE_DOWN, SVALL, isok, IS_THRONE,
         Is_astralevel, Is_stronghold, Is_sanctum, Is_rogue_level, ROOMOFFSET,
         DELPHI, COLNO, ROWNO, VIBRATING_SQUARE, PICK_NONE, ASCENDED, ESCAPED,
         Amask2align, BUFSZ, QBUFSZ } from './const.js';
import { Sfo, Sfi } from './sfbase.js';
import { savecemetery } from './save.js';
import { restcemetery } from './restore.js';
import { You, update_lastseentyp } from './display.js';
import { altarmask_at, align_gname } from './pray.js';
import { is_drawbridge_wall } from './dbridge.js';
import { Invocation_lev } from './mklev.js';
import { shop_keeper, inhishop } from './shk.js';
import { findpriest, inhistemple } from './priest.js';
import { shtypes } from './shknam.js';
import { an } from './objnam.js';
import { ldrname } from './questpgr.js';
import { formatkiller } from './topten.js';
import { describe_level } from './botl.js';
import { highc, trimspaces } from './hacklib.js';
import { add_menu_str } from './wintty.js';
import { Blind, Levitation } from './youprop.js';
import { strstri as strstri_dg } from './hacklib.js';
import { In_V_tower as In_V_tower_dg, VISITED as VISITED_DG } from './const.js';
import { level_info as level_info_dg } from './files.js';

// C's panic() (end.c) and impossible() (pline.c) are not ported yet.
export function panic(msg) { throw new Error(`panic: ${msg}`); }

// C ref: flag.h wizard macro — flags.debug
export function wizard() { return !!game.flags?.debug; }

const DUNGEON_FILE = 'dungeon.lua';

const X_START = 'x-strt';
const X_LOCATE = 'x-loca';
const X_GOAL = 'x-goal';

// C ref: dungeon.h struct d_level
function new_d_level() {
    return { dnum: 0, dlevel: 0 };
}

// C ref: dungeon.h struct d_flags
function new_d_flags() {
    return { town: false, hellish: false, maze_like: false, rogue_like: false,
             align: 0 /* Bitfield(align, 3) */, unconnected: false };
}

// C ref: dungeon.h struct s_level (zeroed, as alloc() + memset() leave it)
function new_s_level() {
    return { next: null, dlevel: new_d_level(), proto: '', boneid: 0,
             rndlevs: 0, flags: new_d_flags() };
}

// C ref: dungeon.h struct dungeon (zeroed, as svd.dungeons[] starts out)
function new_dungeon() {
    return { dname: '', proto: '', fill_lvl: '', themerms: '', boneid: 0,
             flags: new_d_flags(), entry_lev: 0, num_dunlevs: 0,
             dunlev_ureached: 0, ledger_start: 0, depth_start: 0 };
}

// C ref: dungeon.h struct branch (zeroed, as alloc() + memset() leave it)
function new_branch() {
    return { next: null, id: 0, type: 0, end1: new_d_level(),
             end2: new_d_level(), end1_up: FALSE };
}

// C ref: hack.h struct dgn_topology (zeroed, as svd starts out)
function new_dgn_topology() {
    return {
        d_oracle_level: new_d_level(), d_bigroom_level: new_d_level(),
        d_rogue_level: new_d_level(), d_medusa_level: new_d_level(),
        d_stronghold_level: new_d_level(), d_valley_level: new_d_level(),
        d_wiz1_level: new_d_level(), d_wiz2_level: new_d_level(),
        d_wiz3_level: new_d_level(), d_juiblex_level: new_d_level(),
        d_orcus_level: new_d_level(), d_baalzebub_level: new_d_level(),
        d_asmodeus_level: new_d_level(), d_portal_level: new_d_level(),
        d_sanctum_level: new_d_level(), d_earth_level: new_d_level(),
        d_water_level: new_d_level(), d_fire_level: new_d_level(),
        d_air_level: new_d_level(), d_astral_level: new_d_level(),
        d_tower_dnum: 0, d_sokoban_dnum: 0, d_mines_dnum: 0,
        d_quest_dnum: 0, d_tutorial_dnum: 0,
        d_qstart_level: new_d_level(), d_qlocate_level: new_d_level(),
        d_nemesis_level: new_d_level(), d_knox_level: new_d_level(),
        d_mineend_level: new_d_level(), d_sokoend_level: new_d_level(),
    };
}

// C ref: dgn_file.h struct tmpdungeon, struct tmplevel, struct tmpbranch
function new_tmpdungeon() {
    return { name: null, protoname: null, lev: { base: 0, rand: 0 }, flags: 0,
             chance: 0, levels: 0, branches: 0, entry_lev: 0, boneschar: 0,
             align: 0 };
}
function new_tmplevel() {
    return { name: null, chainlvl: null, lev: { base: 0, rand: 0 }, chance: 0,
             rndlevs: 0, chain: 0, flags: 0, boneschar: 0 };
}
function new_tmpbranch() {
    return { name: null, lev: { base: 0, rand: 0 }, chain: 0, type: 0, up: 0 };
}

// C ref: dungeon.c struct proto_dungeon (zeroed by init_dungeons' memset)
function new_proto_dungeon() {
    return {
        tmpdungeon: Array.from({ length: MAXDUNGEON }, new_tmpdungeon),
        tmplevel: Array.from({ length: LEV_LIMIT }, new_tmplevel),
        final_lev: new Array(LEV_LIMIT).fill(null), /* corresponding level pointers */
        tmpbranch: Array.from({ length: BRANCH_LIMIT }, new_tmpbranch),
        start: 0,  /* starting index of current dungeon sp levels */
        n_levs: 0, /* number of tmplevel entries */
        n_brs: 0,  /* number of tmpbranch entries */
    };
}

// C ref: dungeon.c dname_to_dnum()
function dname_to_dnum(s) {
    let i;

    for (i = 0; i < game.n_dgns; i++)
        if (game.dungeons[i].dname === s)
            return i;

    panic(`Couldn't resolve dungeon number for name "${s}".`);
    /*NOT REACHED*/
    return 0;
}

// C ref: dungeon.c find_level()
export function find_level(s) {
    let curr;
    for (curr = game.sp_levchn; curr; curr = curr.next)
        if (!strcmpi(s, curr.proto))
            break;
    return curr;
}

// C ref: dungeon.c find_branch()
/* Find the branch that links the named dungeon. */
function find_branch(s, /* dungeon name */ pd) {
    let i;

    if (pd) {
        for (i = 0; i < pd.n_brs; i++)
            if (pd.tmpbranch[i].name === s)
                break;
        if (i === pd.n_brs)
            panic(`find_branch: can't find ${s}`);
    } else {
        /* support for level tport by name */
        let br;
        let dnam;

        for (br = game.branches; br; br = br.next) {
            dnam = game.dungeons[br.end2.dnum].dname;
            if (!strcmpi(dnam, s)
                || (!strncmpi(dnam, 'The ', 4) && !strcmpi(dnam.slice(4), s)))
                break;
        }
        i = br ? ((ledger_no(br.end1) << 8) | ledger_no(br.end2)) : -1;
    }
    return i;
}

// C ref: dungeon.c parent_dnum()
/*
 * Find the "parent" by searching the prototype branch list for the branch
 * listing, then figuring out to which dungeon it belongs.
 */
function parent_dnum(s, /* dungeon name */ pd) {
    let i;
    let pdnum;

    i = find_branch(s, pd);
    /*
     * Got branch, now find parent dungeon.  Stop if we have reached
     * "this" dungeon (if we haven't found it by now it is an error).
     */
    for (pdnum = 0; pd.tmpdungeon[pdnum].name !== s; pdnum++)
        if ((i -= pd.tmpdungeon[pdnum].branches) < 0)
            return pdnum;

    panic('parent_dnum: couldn\'t resolve branch.');
    /*NOT REACHED*/
    return 0;
}

// C ref: dungeon.c level_range()
/*
 * Return a starting point and number of successive positions a level
 * or dungeon entrance can occupy.
 *
 * Note: This follows the acouple (instead of the rcouple) rules for a
 *       negative random component (randc < 0).  These rules are found
 *       in dgn_comp.y.  The acouple [absolute couple] section says that
 *       a negative random component means from the (adjusted) base to the
 *       end of the dungeon.
 *
 * adjusted_base is an out parameter ({ v }), C's int *adjusted_base.
 */
function level_range(dgn, base, randc, chain, pd, adjusted_base) {
    const lmax = game.dungeons[dgn].num_dunlevs;

    if (chain >= 0) { /* relative to a special level */
        const levtmp = pd.final_lev[chain];
        if (!levtmp)
            panic('level_range: empty chain level!');

        base += levtmp.dlevel.dlevel;
    } else { /* absolute in the dungeon */
        /* from end of dungeon */
        if (base < 0)
            base = (lmax + base + 1);
    }

    if (base < 1 || base > lmax)
        panic('level_range: base value out of range');

    adjusted_base.v = base;

    if (randc === -1) { /* from base to end of dungeon */
        return (lmax - base + 1);
    } else if (randc) {
        /* make sure we don't run off the end of the dungeon */
        return (((base + randc - 1) > lmax) ? lmax - base + 1 : randc);
    } /* else only one choice */
    return 1;
}

// C ref: dungeon.c parent_dlevel()
function parent_dlevel(s, pd) {
    let i, j, num;
    const base = { v: 0 };
    const dnum = parent_dnum(s, pd);
    let curr;

    i = find_branch(s, pd);
    num = level_range(dnum, pd.tmpbranch[i].lev.base,
                      pd.tmpbranch[i].lev.rand, pd.tmpbranch[i].chain, pd,
                      base);

    /* KMH -- Try our best to find a level without an existing branch */
    i = j = rn2(num);
    do {
        if (++i >= num)
            i = 0;
        for (curr = game.branches; curr; curr = curr.next)
            if ((curr.end1.dnum === dnum && curr.end1.dlevel === base.v + i)
                || (curr.end2.dnum === dnum && curr.end2.dlevel === base.v + i))
                break;
    } while (curr && i !== j);
    return (base.v + i);
}

// C ref: dungeon.c correct_branch_type()
/* Convert from the temporary branch type to the dungeon branch type. */
function correct_branch_type(tbr) {
    switch (tbr.type) {
    case TBR_STAIR:
        return BR_STAIR;
    case TBR_NO_UP:
        return tbr.up ? BR_NO_END1 : BR_NO_END2;
    case TBR_NO_DOWN:
        return tbr.up ? BR_NO_END2 : BR_NO_END1;
    case TBR_PORTAL:
        return BR_PORTAL;
    }
    impossible('correct_branch_type: unknown branch type');
    return BR_STAIR;
}

// C ref: dungeon.c branch_val() macro (local to insert_branch)
/* Convert the branch into a unique number so we can sort them. */
function branch_val(bp) {
    return (((bp.end1.dnum * (MAXLEVEL + 1) + bp.end1.dlevel)
             * (MAXDUNGEON + 1) * (MAXLEVEL + 1))
            + (bp.end2.dnum * (MAXLEVEL + 1) + bp.end2.dlevel));
}

// C ref: dungeon.c insert_branch()
/*
 * Add the given branch to the branch list.  The branch list is ordered
 * by end1 dungeon and level followed by end2 dungeon and level.  If
 * extract_first is true, then the branch is already part of the list
 * but needs to be repositioned.
 */
export function insert_branch(new_branch, extract_first) {
    let curr, prev;
    let new_val, curr_val, prev_val;

    if (extract_first) {
        for (prev = null, curr = game.branches; curr;
             prev = curr, curr = curr.next)
            if (curr === new_branch)
                break;

        if (!curr)
            panic('insert_branch: not found');
        if (prev)
            prev.next = curr.next;
        else
            game.branches = curr.next;
    }
    new_branch.next = null;

    /*
     * Insert the new branch into the correct place in the branch list.
     */
    prev = null;
    prev_val = -1;
    new_val = branch_val(new_branch);
    for (curr = game.branches; curr;
         prev_val = curr_val, prev = curr, curr = curr.next) {
        curr_val = branch_val(curr);
        if (prev_val < new_val && new_val <= curr_val)
            break;
    }
    if (prev) {
        new_branch.next = curr;
        prev.next = new_branch;
    } else {
        new_branch.next = game.branches;
        game.branches = new_branch;
    }
}

// C ref: dungeon.c add_branch()
/* Add a dungeon branch to the branch list. */
function add_branch(dgn, child_entry_level, pd) {
    let branch_num;
    let new_br;

    /* static int branch_id = 0; -- a C static lasts for the process, which
       plays one game, so the JS port keeps it on the per-game state */
    if (game.add_branch_id === undefined) game.add_branch_id = 0;

    branch_num = find_branch(game.dungeons[dgn].dname, pd);
    new_br = new_branch();
    new_br.next = null;
    new_br.id = game.add_branch_id++;
    new_br.type = correct_branch_type(pd.tmpbranch[branch_num]);
    new_br.end1.dnum = parent_dnum(game.dungeons[dgn].dname, pd);
    new_br.end1.dlevel = parent_dlevel(game.dungeons[dgn].dname, pd);
    new_br.end2.dnum = dgn;
    new_br.end2.dlevel = child_entry_level;
    new_br.end1_up = pd.tmpbranch[branch_num].up ? TRUE : FALSE;

    insert_branch(new_br, FALSE);
    return new_br;
}

// C ref: dungeon.c add_level()
/*
 * Add new level to special level chain.  Insert it in level order with the
 * other levels in this dungeon.  This assumes that we are never given a
 * level that has a dungeon number less than the dungeon number of the
 * last entry.
 */
function add_level(new_lev) {
    let prev, curr;

    prev = null;
    for (curr = game.sp_levchn; curr; curr = curr.next) {
        if (curr.dlevel.dnum === new_lev.dlevel.dnum
            && curr.dlevel.dlevel > new_lev.dlevel.dlevel)
            break;
        prev = curr;
    }
    if (!prev) {
        new_lev.next = game.sp_levchn;
        game.sp_levchn = new_lev;
    } else {
        new_lev.next = curr;
        prev.next = new_lev;
    }
}

// C ref: dungeon.c init_level()
function init_level(dgn, proto_index, pd) {
    let new_level;
    const tlevel = pd.tmplevel[proto_index];

    pd.final_lev[proto_index] = null; /* no "real" level */
    if (!wizard() && tlevel.chance <= rn2(100))
        return;

    pd.final_lev[proto_index] = new_level = new_s_level();
    /* load new level with data */
    new_level.proto = tlevel.name;
    new_level.boneid = tlevel.boneschar;
    new_level.dlevel.dnum = dgn;
    new_level.dlevel.dlevel = 0; /* for now */

    new_level.flags.town = !!(tlevel.flags & TOWN);
    new_level.flags.hellish = !!(tlevel.flags & HELLISH);
    new_level.flags.maze_like = !!(tlevel.flags & MAZELIKE);
    new_level.flags.rogue_like = !!(tlevel.flags & ROGUELIKE);
    new_level.flags.align = ((tlevel.flags & D_ALIGN_MASK) >> 4);
    if (!new_level.flags.align)
        new_level.flags.align =
            ((pd.tmpdungeon[dgn].flags & D_ALIGN_MASK) >> 4);

    new_level.rndlevs = tlevel.rndlevs;
    new_level.next = null;
}

// C ref: dungeon.c possible_places()
function possible_places(idx, /* prototype index */
                         map, /* array MAXLEVEL+1 in length */
                         pd) {
    let i, count;
    const start = { v: 0 };
    const lev = pd.final_lev[idx];

    /* init level possibilities */
    for (i = 0; i <= MAXLEVEL; i++)
        map[i] = FALSE;

    /* get base and range and set those entries to true */
    count = level_range(lev.dlevel.dnum, pd.tmplevel[idx].lev.base,
                        pd.tmplevel[idx].lev.rand, pd.tmplevel[idx].chain,
                        pd, start);
    for (i = start.v; i < start.v + count; i++)
        map[i] = TRUE;

    /* mark off already placed levels */
    for (i = pd.start; i < idx; i++) {
        if (pd.final_lev[i] && map[pd.final_lev[i].dlevel.dlevel]) {
            map[pd.final_lev[i].dlevel.dlevel] = FALSE;
            --count;
        }
    }

    return count;
}

// C ref: dungeon.c pick_level()
/* Pick the nth TRUE entry in the given boolean array. */
function pick_level(map, /* an array MAXLEVEL+1 in size */ nth) {
    let i;
    for (i = 1; i <= MAXLEVEL; i++)
        if (map[i] && !nth--)
            return i;
    panic('pick_level:  ran out of valid levels');
    /*NOTREACHED*/
    return 0;
}

// C ref: dungeon.c place_level()
/*
 * Place a level.  First, find the possible places on a dungeon map
 * template.  Next pick one.  Then try to place the next level.  If
 * successful, we're done.  Otherwise, try another (and another) until
 * all possible places have been tried.  If all possible places have
 * been exhausted, return false.
 */
function place_level(proto_index, pd) {
    const map = new Array(MAXLEVEL + 1); /* valid levels are 1..MAXLEVEL inclusive */
    let lev;
    let npossible;

    if (proto_index === pd.n_levs)
        return TRUE; /* at end of proto levels */

    lev = pd.final_lev[proto_index];

    /* No level created for this prototype, goto next. */
    if (!lev)
        return place_level(proto_index + 1, pd);

    npossible = possible_places(proto_index, map, pd);

    for (; npossible; --npossible) {
        lev.dlevel.dlevel = pick_level(map, rn2(npossible));
        if (place_level(proto_index + 1, pd))
            return TRUE;
        map[lev.dlevel.dlevel] = FALSE; /* this choice didn't work */
    }
    return FALSE;
}

// C ref: dungeon.c level_map[] — lev_spec names the svd.dungeon_topology
// field C points at.
const level_map = [
    { lev_name: 'air', lev_spec: 'd_air_level' },
    { lev_name: 'asmodeus', lev_spec: 'd_asmodeus_level' },
    { lev_name: 'astral', lev_spec: 'd_astral_level' },
    { lev_name: 'baalz', lev_spec: 'd_baalzebub_level' },
    { lev_name: 'bigrm', lev_spec: 'd_bigroom_level' },
    { lev_name: 'castle', lev_spec: 'd_stronghold_level' },
    { lev_name: 'earth', lev_spec: 'd_earth_level' },
    { lev_name: 'fakewiz1', lev_spec: 'd_portal_level' },
    { lev_name: 'fire', lev_spec: 'd_fire_level' },
    { lev_name: 'juiblex', lev_spec: 'd_juiblex_level' },
    { lev_name: 'knox', lev_spec: 'd_knox_level' },
    { lev_name: 'medusa', lev_spec: 'd_medusa_level' },
    { lev_name: 'oracle', lev_spec: 'd_oracle_level' },
    { lev_name: 'orcus', lev_spec: 'd_orcus_level' },
    { lev_name: 'rogue', lev_spec: 'd_rogue_level' },
    { lev_name: 'sanctum', lev_spec: 'd_sanctum_level' },
    { lev_name: 'valley', lev_spec: 'd_valley_level' },
    { lev_name: 'water', lev_spec: 'd_water_level' },
    { lev_name: 'wizard1', lev_spec: 'd_wiz1_level' },
    { lev_name: 'wizard2', lev_spec: 'd_wiz2_level' },
    { lev_name: 'wizard3', lev_spec: 'd_wiz3_level' },
    { lev_name: 'minend', lev_spec: 'd_mineend_level' },
    { lev_name: 'soko1', lev_spec: 'd_sokoend_level' },
    { lev_name: X_START, lev_spec: 'd_qstart_level' },
    { lev_name: X_LOCATE, lev_spec: 'd_qlocate_level' },
    { lev_name: X_GOAL, lev_spec: 'd_nemesis_level' },
    { lev_name: '', lev_spec: null },
];

// C ref: dungeon.c get_dgn_flags()
const flagstrs = ['town', 'hellish', 'mazelike', 'roguelike', 'unconnected'];
const flagstrs2i = [TOWN, HELLISH, MAZELIKE, ROGUELIKE, UNCONNECTED, 0];

function get_dgn_flags(tbl) {
    let dgn_flags = 0;

    const flags = tbl.flags; /* lua_getfield(L, -1, "flags") */
    if (lua_type(flags) === LUA_TTABLE) {
        let f, nflags;

        nflags = lua_len(flags);
        for (f = 0; f < nflags; f++) {
            const fl = flags[f]; /* flags[f + 1] in Lua */
            if (lua_type(fl) === LUA_TSTRING) {
                dgn_flags |= flagstrs2i[luaL_checkoption(fl, null, flagstrs)];
            } else
                impossible(`flags[${f}] is not a string`);
        }
    } else if (lua_type(flags) === LUA_TSTRING) {
        dgn_flags |= flagstrs2i[luaL_checkoption(flags, null, flagstrs)];
    } else if (lua_type(flags) !== LUA_TNIL)
        impossible('flags is not an array or string');

    return dgn_flags;
}

// C ref: dungeon.c get_dgn_align()
const dgnaligns = ['unaligned', 'noalign', 'lawful', 'neutral', 'chaotic'];
const dgnaligns2i = [D_ALIGN_NONE, D_ALIGN_NONE, D_ALIGN_LAWFUL,
                     D_ALIGN_NEUTRAL, D_ALIGN_CHAOTIC, D_ALIGN_NONE];

function get_dgn_align(tbl) {
    const a = dgnaligns2i[get_table_option(tbl, 'alignment',
                                           'unaligned', dgnaligns)];
    return a;
}

// C ref: dungeon.c init_dungeon_levels()
// levels is the Lua table dungeon[dngidx + 1].levels.
function init_dungeon_levels(levels, pd, dngidx) {
    let lvl_name, lvl_bonetag, lvl_chain;
    let lvl_base, lvl_range, lvl_nlevels, lvl_chance, lvl_align, lvl_flags;
    let tmpl;
    let bi, f, nlevels;

    nlevels = lua_len(levels);
    pd.tmpdungeon[dngidx].levels = nlevels;
    for (f = 0; f < nlevels; f++) {
        const lvl = levels[f]; /* levels[f + 1] in Lua */
        if (lua_type(lvl) === LUA_TTABLE) {
            lvl_name = get_table_str(lvl, 'name');
            lvl_bonetag = get_table_str_opt(lvl, 'bonetag', '');
            lvl_chain = get_table_str_opt(lvl, 'chainlevel', null);
            lvl_base = get_table_int(lvl, 'base');
            lvl_range = get_table_int_opt(lvl, 'range', 0);
            lvl_nlevels = get_table_int_opt(lvl, 'nlevels', 0);
            lvl_chance = get_table_int_opt(lvl, 'chance', 100);
            lvl_align = get_dgn_align(lvl);
            lvl_flags = get_dgn_flags(lvl);
            /* array index is offset by cumulative number of levels
               defined for preceding branches (iterations of 'while'
               loop we're inside, not branch connections below) */
            tmpl = pd.tmplevel[pd.n_levs + f];

            tmpl.name = lvl_name;
            tmpl.chainlvl = lvl_chain;
            tmpl.lev.base = lvl_base;
            tmpl.lev.rand = lvl_range;
            tmpl.chance = lvl_chance;
            tmpl.rndlevs = lvl_nlevels;
            tmpl.flags = lvl_flags | lvl_align;
            tmpl.boneschar = lvl_bonetag ? lvl_bonetag[0] : 0;
            tmpl.chain = -1;
            if (lvl_chain) {
                for (bi = 0; bi < pd.n_levs + f; bi++) {
                    if (pd.tmplevel[bi].name === lvl_chain) {
                        tmpl.chain = bi;
                        break;
                    }
                }
                if (tmpl.chain === -1)
                    panic(`Could not chain level ${lvl_name} to ${lvl_chain}`);
            }
        } else
            panic(`dungeon[${dngidx}].levels[${f}] is not a hash`);
    }
    pd.n_levs += nlevels;
    if (pd.n_levs > LEV_LIMIT)
        panic('init_dungeon: too many special levels');
}

// C ref: dungeon.c init_dungeon_branches()
// branches is the Lua table dungeon[dngidx + 1].branches.
const brdirstr = ['up', 'down'];
const brdirstr2i = [TRUE, FALSE, FALSE];
const brtypes = ['stair', 'portal', 'no_down', 'no_up'];
const brtypes2i = [TBR_STAIR, TBR_PORTAL, TBR_NO_DOWN, TBR_NO_UP, TBR_STAIR];

function init_dungeon_branches(branches, pd, dngidx) {
    let br_name, br_chain;
    let br_base, br_range, br_type, br_up;
    let tmpb;
    let bi, f, nbranches;

    nbranches = lua_len(branches);
    pd.tmpdungeon[dngidx].branches = nbranches;
    for (f = 0; f < nbranches; f++) {
        const br = branches[f]; /* branches[f + 1] in Lua */
        if (lua_type(br) === LUA_TTABLE) {
            br_name = get_table_str(br, 'name');
            br_chain = get_table_str_opt(br, 'chainlevel', null);
            br_base = get_table_int(br, 'base');
            br_range = get_table_int_opt(br, 'range', 0);
            br_type = brtypes2i[get_table_option(br, 'branchtype',
                                                 'stair', brtypes)];
            br_up = brdirstr2i[get_table_option(br, 'direction',
                                                'down', brdirstr)];
            tmpb = pd.tmpbranch[pd.n_brs + f];

            tmpb.name = br_name;
            tmpb.lev.base = br_base;
            tmpb.lev.rand = br_range;
            tmpb.type = br_type;
            tmpb.up = br_up;
            tmpb.chain = -1;
            if (br_chain) {
                for (bi = 0; bi < pd.n_levs + f - 1; bi++)
                    if (pd.tmplevel[bi].name === br_chain) {
                        tmpb.chain = bi;
                        break;
                    }
                if (tmpb.chain === -1)
                    panic(`Could not chain branch ${br_name} to level ${br_chain}`);
            }
        } else
            panic(`dungeon[${dngidx}].branches[${f}] is not a hash`);
    }
    pd.n_brs += nbranches;
    if (pd.n_brs > BRANCH_LIMIT)
        panic('init_dungeon: too many branches');
}

// C ref: dungeon.c init_dungeon_set_entry()
function init_dungeon_set_entry(pd, dngidx) {
    const dgn_entry = pd.tmpdungeon[dngidx].entry_lev;
    const dptr = game.dungeons[dngidx];
    /*
     * Set the entry level for this dungeon.  The entry value means:
     *              < 0     from bottom (-1 == bottom level)
     *                0     default (top)
     *              > 0     actual level (1 = top)
     *
     * Note that the entry_lev field in the dungeon structure is
     * redundant.  It is used only here and in print_dungeon().
     */
    if (dgn_entry < 0) {
        dptr.entry_lev = dptr.num_dunlevs + dgn_entry + 1;
        if (dptr.entry_lev <= 0)
            dptr.entry_lev = 1;
    } else if (dgn_entry > 0) {
        dptr.entry_lev = dgn_entry;
        if (dptr.entry_lev > dptr.num_dunlevs)
            dptr.entry_lev = dptr.num_dunlevs;
    } else { /* default */
        dptr.entry_lev = 1; /* defaults to top level */
    }
}

// C ref: dungeon.c init_dungeon_set_depth()
function init_dungeon_set_depth(pd, dngidx) {
    let br;
    let from_depth;
    let from_up;

    br = add_branch(dngidx, game.dungeons[dngidx].entry_lev, pd);

    /* Get the depth of the connecting end. */
    if (br.end1.dnum === dngidx) {
        from_depth = depth(br.end2);
        from_up = !br.end1_up;
    } else {
        from_depth = depth(br.end1);
        from_up = br.end1_up;
    }

    /*
     * Calculate the depth of the top of the dungeon via
     * its branch.  First, the depth of the entry point:
     *
     *  depth of branch from "parent" dungeon
     *  + -1 or 1 depending on an up or down stair or
     *    0 if portal
     *
     * Followed by the depth of the top of the dungeon:
     *
     *  - (entry depth - 1)
     *
     * We'll say that portals stay on the same depth.
     */
    game.dungeons[dngidx].depth_start =
        from_depth + (br.type === BR_PORTAL ? 0 : (from_up ? -1 : 1))
        - (game.dungeons[dngidx].entry_lev - 1);
}

// C ref: dungeon.c init_dungeon_dungeons()
// dgn is the Lua table dungeon[dngidx + 1] (on top of C's Lua stack).
function init_dungeon_dungeons(dgn, pd, dngidx) {
    let dgn_name, dgn_bonetag, dgn_protoname, dgn_fill;
    let dgn_themerms;
    let dgn_base, dgn_range, dgn_align, dgn_entry, dgn_chance, dgn_flags;
    const dptr = game.dungeons[dngidx];

    dgn_name = get_table_str(dgn, 'name');
    /* TODO: accept single char or "none" for bonetag */
    dgn_bonetag = get_table_str_opt(dgn, 'bonetag', '');
    dgn_protoname = get_table_str_opt(dgn, 'protofile', '');
    dgn_base = get_table_int(dgn, 'base');
    dgn_range = get_table_int_opt(dgn, 'range', 0);
    dgn_align = get_dgn_align(dgn);
    dgn_entry = get_table_int_opt(dgn, 'entry', 0);
    dgn_chance = get_table_int_opt(dgn, 'chance', 100);
    dgn_flags = get_dgn_flags(dgn);
    dgn_fill = get_table_str_opt(dgn, 'lvlfill', '');
    dgn_themerms = get_table_str_opt(dgn, 'themerooms', '');

    if (!wizard() && dgn_chance && (dgn_chance <= rn2(100))) {
        game.n_dgns--;
        return FALSE;
    }

    /* levels begin */
    const levels = dgn.levels; /* lua_getfield(L, -1, "levels") */
    if (lua_type(levels) === LUA_TTABLE) {
        init_dungeon_levels(levels, pd, dngidx);
    } else if (lua_type(levels) !== LUA_TNIL)
        panic(`dungeon[${dngidx}].levels is not an array of hashes`);
    /* levels end */

    /* branches begin */
    const branches = dgn.branches; /* lua_getfield(L, -1, "branches") */
    if (lua_type(branches) === LUA_TTABLE) {
        init_dungeon_branches(branches, pd, dngidx);
    } else if (lua_type(branches) !== LUA_TNIL)
        panic(`dungeon[${dngidx}].branches is not an array of hashes`);
    /* branches end */

    pd.tmpdungeon[dngidx].name = dgn_name;
    pd.tmpdungeon[dngidx].protoname = dgn_protoname;
    pd.tmpdungeon[dngidx].boneschar = dgn_bonetag ? dgn_bonetag[0] : 0;
    pd.tmpdungeon[dngidx].lev.base = dgn_base;
    pd.tmpdungeon[dngidx].lev.rand = dgn_range;
    pd.tmpdungeon[dngidx].flags = dgn_flags;
    pd.tmpdungeon[dngidx].align = dgn_align;
    pd.tmpdungeon[dngidx].chance = dgn_chance;
    pd.tmpdungeon[dngidx].entry_lev = dgn_entry;

    /* FIXME: these should have length checks */
    dptr.fill_lvl = dgn_fill;
    dptr.dname = dgn_name;
    dptr.proto = dgn_protoname;
    dptr.themerms = dgn_themerms;
    /* FIXME: accept "none", convert that to '\0' */
    dptr.boneid = dgn_bonetag ? dgn_bonetag[0] : 0;

    if (dgn_range)
        dptr.num_dunlevs = rn1(dgn_range, dgn_base);
    else
        dptr.num_dunlevs = dgn_base;

    if (!dngidx) {
        dptr.ledger_start = 0;
        dptr.depth_start = 1;
        dptr.dunlev_ureached = 1;
    } else {
        dptr.ledger_start = game.dungeons[dngidx - 1].ledger_start
                            + game.dungeons[dngidx - 1].num_dunlevs;
        dptr.dunlev_ureached = 0;
    }

    dptr.flags.hellish = !!(dgn_flags & HELLISH);
    dptr.flags.maze_like = !!(dgn_flags & MAZELIKE);
    dptr.flags.rogue_like = !!(dgn_flags & ROGUELIKE);
    /* Bitfield(align, 3) keeps the low 3 bits of the D_ALIGN_* value */
    dptr.flags.align = dgn_align & 7;
    dptr.flags.unconnected = !!(dgn_flags & UNCONNECTED);

    init_dungeon_set_entry(pd, dngidx);

    if (dptr.flags.unconnected) {
        dptr.depth_start = 1;
    } else if (dngidx) { /* set depth */
        init_dungeon_set_depth(pd, dngidx);
    }

    if (dptr.num_dunlevs > MAXLEVEL)
        dptr.num_dunlevs = MAXLEVEL;

    return TRUE;
}

// C ref: dungeon.c init_castle_tune()
/* initialize the Castle drawbridge tune */
function init_castle_tune() {
    let i;
    const tune = [];

    for (i = 0; i < 5; i++)
        tune[i] = String.fromCharCode('A'.charCodeAt(0) + rn2(7));
    game.tune = tune.join(''); /* svt.tune[5] = 0 */
}

// C ref: dungeon.c fixup_level_locations()
/* fix up the special level names and locations for quick access */
function fixup_level_locations() {
    let i;
    let x;
    const topo = game.dungeon_topology;

    /*
     * Find most of the special levels and dungeons so we can access their
     * locations quickly.
     */
    for (const lev_map of level_map) {
        if (!lev_map.lev_name) break;
        x = find_level(lev_map.lev_name);
        if (x) {
            assign_level(topo[lev_map.lev_spec], x.dlevel);
            if (lev_map.lev_name.startsWith('x-')) { /* !strncmp(.., "x-", 2) */
                /* This is where the name substitution on the
                 * levels of the quest dungeon occur.
                 */
                x.proto = `${game.urole.filecode}${lev_map.lev_name.slice(1)}`;
            } else if (lev_map.lev_spec === 'd_knox_level') {
                let br;
                /*
                 * Kludge to allow floating Knox entrance.  We
                 * specify a floating entrance by the fact that its
                 * entrance (end1) has a bogus dnum, namely n_dgns.
                 */
                for (br = game.branches; br; br = br.next)
                    if (on_level(br.end2, topo.d_knox_level))
                        break;

                if (br) {
                    br.end1.dnum = game.n_dgns;
                    /* adjust the branch's position on the list */
                    insert_branch(br, TRUE);
                }
            }
        }
    }
    /*
     *  I hate hardwiring these names. :-(
     */
    topo.d_quest_dnum = dname_to_dnum('The Quest');
    topo.d_sokoban_dnum = dname_to_dnum('Sokoban');
    topo.d_mines_dnum = dname_to_dnum('The Gnomish Mines');
    topo.d_tower_dnum = dname_to_dnum("Vlad's Tower");
    topo.d_tutorial_dnum = dname_to_dnum('The Tutorial');

    /* one special fixup for dummy surface level */
    if ((x = find_level('dummy')) !== null) {
        i = x.dlevel.dnum;
        /* the code above puts earth one level above dungeon level #1,
           making the dummy level overlay level 1; but the whole reason
           for having the dummy level is to make earth have depth -1
           instead of 0, so adjust the start point to shift endgame up */
        if (dunlevs_in_dungeon(x.dlevel) > 1 - game.dungeons[i].depth_start)
            game.dungeons[i].depth_start -= 1;
        /* TODO: strip "dummy" out all the way here,
           so that it's hidden from '#wizwhere' feedback. */
    }
}

// C ref: dungeon.c free_proto_dungeon()
// C frees pd's strings here; the JS garbage collector does that.
function free_proto_dungeon(pd) {
}

// C ref: dungeon.c init_dungeons()
/* initialize the "dungeon" structs */
export function init_dungeons() {
    let L;
    let i, cl = 0;
    const pd = new_proto_dungeon(); /* memset(&pd, 0, sizeof pd) */
    const sbi = { flags: NHL_SB_SAFE, memlimit: 1 * 1024 * 1024, steps: 0,
                  perpcall: 1 * 1024 * 1024 };

    /* svd.dungeons[] and svd.dungeon_topology are zeroed globals in C
       (decl.c init_svd); a new JS game starts without them. */
    if (!game.dungeons)
        game.dungeons = Array.from({ length: MAXDUNGEON }, new_dungeon);
    if (!game.dungeon_topology)
        game.dungeon_topology = new_dgn_topology();

    pd.n_levs = pd.n_brs = 0;

    L = nhl_init(sbi); /* private Lua state for this function */
    if (!L) {
        panic("'nhl_init' failed; can't continue.");
        /*NOTREACHED*/
    }
    if (!nhl_loadlua(L, DUNGEON_FILE)) {
        panic(`Cannot open dungeon description - "${DUNGEON_FILE}" from "nhdat" file!`);
    }

    /* if (iflags.window_inited) clear_nhwindow(WIN_MAP);
       -- not ported: the JS windowing has no map window yet; newgame()
       clears and redraws the screen before the next screen is captured */

    game.sp_levchn = null;

    /* lua_settop(L, 0); lua_getglobal(L, "dungeon"); */
    const dungeon = L.globals.dungeon;
    if (!lua_istable(dungeon))
        panic('dungeon is not a lua table');

    game.n_dgns = lua_len(dungeon);

    pd.start = 0;
    pd.n_levs = 0;
    pd.n_brs = 0;

    /*
     * Read in each dungeon and transfer the results to the internal
     * dungeon arrays.
     */

    if (game.n_dgns >= MAXDUNGEON)
        panic('init_dungeons: too many dungeons');

    /* while (lua_next(L, tidx) != 0) -- lua_next() visits the sequence
       dungeon[1..n] in order */
    i = 0;
    for (let k = 0; k < dungeon.length; k++) {
        const dgn = dungeon[k];

        if (!lua_istable(dgn))
            panic(`dungeon[${i}] is not a lua table`);

        if (init_dungeon_dungeons(dgn, pd, i)) {
            for (; cl < pd.n_levs; cl++) {
                init_level(i, cl, pd);
            }
            /*
             * Recursively place the generated levels for this dungeon.  This
             * routine will attempt all possible combinations before giving
             * up.
             */
            if (!place_level(pd.start, pd))
                panic('init_dungeon:  couldn\'t place levels');
            for (; pd.start < pd.n_levs; pd.start++)
                if (pd.final_lev[pd.start])
                    add_level(pd.final_lev[pd.start]);
            /* levels handling end */
            i++;
        }
    }

    init_castle_tune();
    fixup_level_locations();
    nhl_done(L);
    free_proto_dungeon(pd);
}

// C ref: dungeon.c dunlev()
/* return the level number for lev in *this* dungeon */
export function dunlev(lev) {
    return lev.dlevel;
}

// C ref: dungeon.c dunlevs_in_dungeon()
/* return the lowest level number for *this* dungeon */
export function dunlevs_in_dungeon(lev) {
    return game.dungeons[lev.dnum].num_dunlevs;
}

// C ref: dungeon.c ledger_no()
/* Return the ledger number for a dungeon level, used as an index for
   save/restore. */
export function ledger_no(lev) {
    return lev.dlevel + game.dungeons[lev.dnum].ledger_start;
}

// C ref: dungeon.c maxledgerno()
/* The last level in the bookkeeping list of levels is the bottom of the
   last dungeon in the svd.dungeons[] array. */
export function maxledgerno() {
    return game.dungeons[game.n_dgns - 1].ledger_start
        + game.dungeons[game.n_dgns - 1].num_dunlevs;
}

// C ref: dungeon.c ledger_to_dnum()
/* return the dungeon that this ledgerno exists in */
export function ledger_to_dnum(ledgerno) {
    /* find i such that (i->base + 1) <= ledgerno <= (i->base + i->count) */
    for (let i = 0; i < game.n_dgns; i++)
        if (game.dungeons[i].ledger_start < ledgerno
            && ledgerno <= (game.dungeons[i].ledger_start
                            + game.dungeons[i].num_dunlevs))
            return i;

    throw new Error(`level number out of range [ledger_to_dnum(${ledgerno})]`);
}

// C ref: dungeon.c ledger_to_dlev()
/* return the level of the dungeon this ledgerno exists in */
export function ledger_to_dlev(ledgerno) {
    return ledgerno - game.dungeons[ledger_to_dnum(ledgerno)].ledger_start;
}

// C ref: dungeon.c depth()
/* return the depth of lev; (schar) cast kept */
export function depth(lev) {
    return ((game.dungeons[lev.dnum].depth_start + lev.dlevel - 1) << 24) >> 24;
}

// C ref: dungeon.c on_level()
/* are "lev1" and "lev2" actually the same? */
export function on_level(lev1, lev2) {
    return (lev1.dnum === lev2.dnum && lev1.dlevel === lev2.dlevel);
}

// C ref: dungeon.c Is_branchlev()
/*
 * Is this a multi-dungeon branch level?  If so, return a pointer to the
 * branch.  Otherwise, return null.
 */
export function Is_branchlev(lev) {
    let curr;

    for (curr = game.branches; curr; curr = curr.next) {
        if (on_level(lev, curr.end1) || on_level(lev, curr.end2))
            return curr;
    }
    return null;
}

// C ref: dungeon.c Is_special()
export function Is_special(lev) {
    let levtmp;

    for (levtmp = game.sp_levchn; levtmp; levtmp = levtmp.next)
        if (on_level(lev, levtmp.dlevel))
            return levtmp;

    return null;
}

// C ref: dungeon.c induced_align()
/* return an alignment mask */
export function induced_align(pct) {
    const lev = Is_special(game.u.uz);

    if (lev && lev.flags.align)
        if (rn2(100) < pct)
            return lev.flags.align;

    if (game.dungeons[game.u.uz.dnum].flags.align)
        if (rn2(100) < pct)
            return game.dungeons[game.u.uz.dnum].flags.align;

    const al = rn2(3) - 1;
    return Align2amask(al);
}

// C ref: dungeon.c On_W_tower_level()
/* is `lev' a level containing the Wizard's tower? */
export function On_W_tower_level(lev) {
    const t = game.dungeon_topology;
    return (on_level(lev, t.d_wiz1_level)      /* Is_wiz1_level() */
            || on_level(lev, t.d_wiz2_level)   /* Is_wiz2_level() */
            || on_level(lev, t.d_wiz3_level)); /* Is_wiz3_level() */
}

// C ref: dungeon.c In_W_tower()
/* is <x,y> of `lev' inside the Wizard's tower? */
export function In_W_tower(x, y, lev) {
    if (!On_W_tower_level(lev))
        return false;
    const dndest = game.dndest;
    if (!dndest || !dndest.nlx) {
        /* impossible("No boundary for Wizard's Tower?") */
        console.error("impossible: No boundary for Wizard's Tower?");
        return false;
    }
    /*
     * Both of the exclusion regions for arriving via level teleport
     * (from above or below) define the tower's boundary.
     *  assert( svu.updest.nIJ == svd.dndest.nIJ for I={l|h},J={x|y} );
     */
    return within_bounded_area(x, y, dndest.nlx, dndest.nly,
                               dndest.nhx, dndest.nhy);
}

// C ref: dungeon.c In_hell()
export function In_hell(lev) {
    return game.dungeons[lev.dnum].flags.hellish ? true : false;
}

// C ref: dungeon.c assign_level()
/* equivalent to dest = source */
export function assign_level(dest, src) {
    dest.dnum = src.dnum;
    dest.dlevel = src.dlevel;
}

// C ref: dungeon.c deepest_lev_reached()
export function deepest_lev_reached(noquest) {
    /* this function is used for three purposes: to provide a factor
     * of difficulty in monster generation; to provide a factor of
     * difficulty in experience calculations (botl.c and end.c); and
     * to insert the deepest level reached in the game in the topten
     * display.  the 'noquest' arg switch is required for the latter.
     */
    let i;
    const tmp = new_d_level();
    let ret = 0;

    for (i = 0; i < game.n_dgns; i++) {
        if (noquest && i === game.dungeon_topology.d_quest_dnum)
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

// C ref: dungeon.c find_hell()
export function find_hell(lev) {
    lev.dnum = game.dungeon_topology.d_valley_level.dnum;
    lev.dlevel = 1;
}

// C ref: dungeon.c get_level()
export function get_level(newlevel, levnum) {
    let br;
    let dgn = game.u.uz.dnum;
    const dungeons = game.dungeons;

    if (levnum <= 0) {
        /* can only currently happen in endgame */
        levnum = game.u.uz.dlevel;
    } else if (levnum > (dungeons[dgn].depth_start
                         + dungeons[dgn].num_dunlevs - 1)) {
        /* beyond end of dungeon, jump to last level */
        levnum = dungeons[dgn].num_dunlevs;
    } else {
        /* The desired level is in this dungeon or a "higher" one. */

        /*
         * Branch up the tree until we reach a dungeon that contains the
         * levnum.
         */
        if (levnum < dungeons[dgn].depth_start) {
            do {
                /*
                 * Find the parent dungeon of this dungeon.
                 *
                 * This assumes that end2 is always the "child" and it is
                 * unique.
                 */
                for (br = game.branches; br; br = br.next)
                    if (br.end2.dnum === dgn)
                        break;
                if (!br)
                    throw new Error('get_level: can\'t find parent dungeon');

                dgn = br.end1.dnum;
            } while (levnum < dungeons[dgn].depth_start);
        }

        /* We're within the same dungeon; calculate the level. */
        levnum = levnum - dungeons[dgn].depth_start + 1;
    }

    newlevel.dnum = dgn;
    newlevel.dlevel = levnum;
}

// C ref: dungeon.c builds_up()
export function builds_up(lev) {
    const dptr = game.dungeons[lev.dnum];
    let br;
    if (dptr.num_dunlevs > 1)
        return (dptr.entry_lev === dptr.num_dunlevs);
    /* else, single-level branch; find branch connection that connects this
     * dungeon from a parent dungeon and determine whether it builds up from
     * that */
    for (br = game.branches; br; br = br.next) {
        if (on_level(lev, br.end2)) {
            return br.end1_up;
        }
    }
    impossible(`builds_up: can't find branch for dungeon ${lev.dnum}`);
    return false;
}

// C ref: dungeon.c level_difficulty()
/* use instead of depth() wherever a degree of difficulty is made
 * dependent on the location in the dungeon (eg. monster creation).
 */
export function level_difficulty() {
    const u = game.u;
    let res;

    if (u.uz.dnum === game.dungeon_topology.d_astral_level.dnum) { /* In_endgame */
        res = depth(game.dungeon_topology.d_sanctum_level) + Math.trunc(u.ulevel / 2);
    } else if (u.uhave.amulet) {
        res = deepest_lev_reached(false);
    } else {
        res = depth(u.uz);
        /* depth() is the number of elevation units (levels) below
           the theoretical surface; in a builds-up branch, that value
           ends up making the harder to reach levels be treated as if
           they were easier; adjust for the extra effort involved in
           going down to the entrance and then up to the location */
        if (builds_up(u.uz))
            res += 2 * (game.dungeons[u.uz.dnum].entry_lev - u.uz.dlevel + 1);
    }
    return (res << 16) >> 16; /* (xint16) res */
}

// C ref: dungeon.c dungeon_branch()
/* return the branch that leads into the named dungeon */
export function dungeon_branch(s) {
    let br;
    const dnum = dname_to_dnum(s);

    /* Find the branch that connects to dungeon i's branch. */
    for (br = game.branches; br; br = br.next)
        if (br.end2.dnum === dnum)
            break;

    if (!br)
        panic(`dgn_entrance: can't find entrance to ${s}`);

    return br;
}

// C ref: dungeon.c at_dgn_entrance()
/*
 * This returns true if the hero is on the same level as the entrance to
 * the named dungeon.
 */
export function at_dgn_entrance(s) {
    const br = dungeon_branch(s);
    return on_level(game.u.uz, br.end1) ? true : false;
}

// C ref: dungeon.c unplaced_floater()
function unplaced_floater(dptr) {
    let br;
    const idx = game.dungeons.indexOf(dptr);

    /* if other floating branches are added, this will need to change */
    if (idx !== game.dungeon_topology.d_knox_level.dnum)
        return false;
    for (br = game.branches; br; br = br.next)
        if (br.end1.dnum === game.n_dgns && br.end2.dnum === idx)
            return true;
    return false;
}

// C ref: dungeon.c unreachable_level()
function unreachable_level(lvl_p, unplaced) {
    let dummy;

    if (unplaced)
        return true;
    if (In_endgame(game.u.uz) && !In_endgame(lvl_p))
        return true;
    if ((dummy = find_level("dummy")) !== null && on_level(lvl_p, dummy.dlevel))
        return true;
    return false;
}

// C ref: dungeon.c tport_menu()
function tport_menu(win, entry, lchoices, lvl_p, cannotreach) {
    let any = 0;
    const clr = NO_COLOR;

    lchoices.lev[lchoices.idx] = lvl_p.dlevel;
    lchoices.dgn[lchoices.idx] = lvl_p.dnum;
    lchoices.playerlev[lchoices.idx] = depth(lvl_p);
    if (cannotreach) {
        /* not selectable, but still consumes next menuletter;
           prepend padding in place of missing menu selector */
        entry = `    ${entry}`;
    } else {
        any = lchoices.idx + 1;
    }
    tty_add_menu(win, null, any, lchoices.menuletter, 0,
                 ATR_NONE, clr, entry, MENU_ITEMFLAGS_NONE);
    /* this assumes there are at most 52 interesting levels */
    if (lchoices.menuletter === 'z')
        lchoices.menuletter = 'A';
    else
        lchoices.menuletter = String.fromCharCode(lchoices.menuletter.charCodeAt(0) + 1);
    lchoices.idx++;
}

// C ref: dungeon.c br_string()
/* Convert a branch type to a string usable by print_dungeon(). */
function br_string(type) {
    switch (type) {
    case BR_PORTAL:
        return "Portal";
    case BR_NO_END1:
        return "Connection";
    case BR_NO_END2:
        return "One way stair";
    case BR_STAIR:
        return "Stair";
    }
    return " (unknown)";
}

// C ref: dungeon.c chr_u_on_lvl()
function chr_u_on_lvl(dlev) {
    const u = game.u;
    return u.uz.dnum === dlev.dnum && u.uz.dlevel === dlev.dlevel ? '*' : ' ';
}

// C ref: dungeon.c print_branch()
/* Print all child branches between the lower and upper bounds. */
function print_branch(win, dnum, lower_bound, upper_bound, bymenu, lchoices_p) {
    let br;
    let buf;

    /* This assumes that end1 is the "parent". */
    for (br = game.branches; br; br = br.next) {
        if (br.end1.dnum === dnum && lower_bound < br.end1.dlevel
            && br.end1.dlevel <= upper_bound) {
            buf = `${bymenu ? chr_u_on_lvl(br.end1) : ' '} ${br_string(br.type)} to ${
                    game.dungeons[br.end2.dnum].dname}: ${depth(br.end1)}`;
            if (bymenu)
                tport_menu(win, buf, lchoices_p, br.end1,
                           unreachable_level(br.end1, false));
            else
                tty_putstr_sync(win, 0, buf);
        }
    }
}

// C ref: dungeon.c print_dungeon() -- the wizard mode level teleport
// menu (bymenu) or the #wizwhere text listing.  Returns
// { lev, rlev, rdgn } for C's return value and *rlev, *rdgn.
export async function print_dungeon(bymenu) {
    let i, last_level, nlev;
    let buf;
    let descr;
    let unplaced;
    let slev;
    let dptr;
    let first;
    let br;
    const lchoices = { idx: 0, menuletter: 'a', lev: [], dgn: [], playerlev: [] };
    const win = tty_create_nhwindow(NHW_MENU);

    if (bymenu) {
        tty_start_menu(win, MENU_BEHAVE_STANDARD);
        lchoices.idx = 0;
        lchoices.menuletter = 'a';
    }

    for (i = 0; i < game.n_dgns; i++) {
        dptr = game.dungeons[i];
        if (bymenu && In_endgame(game.u.uz)
            && i !== game.dungeon_topology.d_astral_level.dnum)
            continue;
        unplaced = unplaced_floater(dptr);
        descr = unplaced ? "depth" : "level";
        nlev = dptr.num_dunlevs;
        if (nlev > 1)
            buf = `${dptr.dname}: ${makeplural(descr)} ${dptr.depth_start} to ${
                    dptr.depth_start + nlev - 1}`;
        else
            buf = `${dptr.dname}: ${descr} ${dptr.depth_start}`;

        /* Most entrances are uninteresting. */
        if (dptr.entry_lev !== 1) {
            if (dptr.entry_lev === nlev)
                buf += ", entrance from below";
            else
                buf += `, entrance on ${dptr.depth_start + dptr.entry_lev - 1}`;
        }
        if (bymenu) {
            add_menu_heading(win, buf);
        } else
            tty_putstr_sync(win, 0, buf);

        /*
         * Circle through the special levels to find levels that are in
         * this dungeon.
         */
        for (slev = game.sp_levchn, last_level = 0; slev; slev = slev.next) {
            if (slev.dlevel.dnum !== i)
                continue;

            /* print any branches before this level */
            print_branch(win, i, last_level, slev.dlevel.dlevel, bymenu,
                         lchoices);

            buf = `${chr_u_on_lvl(slev.dlevel)} ${slev.proto}: ${depth(slev.dlevel)}`;
            if (on_level(slev.dlevel, game.dungeon_topology.d_stronghold_level))
                buf += ` (tune ${game.tune})`; /* Is_stronghold() */
            if (bymenu)
                tport_menu(win, buf, lchoices, slev.dlevel,
                           unreachable_level(slev.dlevel, unplaced));
            else
                tty_putstr_sync(win, 0, buf);

            last_level = slev.dlevel.dlevel;
        }
        /* print branches after the last special level */
        print_branch(win, i, last_level, MAXLEVEL, bymenu, lchoices);
    }

    if (bymenu) {
        let n;
        let idx;

        tty_end_menu(win, "Level teleport to where:");
        const res = await tty_select_menu(win, PICK_ONE);
        n = res.n;
        await tty_destroy_nhwindow(win);
        if (n > 0) {
            idx = res.selected[0].item - 1;
            return { lev: lchoices.playerlev[idx],
                     rlev: lchoices.lev[idx], rdgn: lchoices.dgn[idx] };
        }
        return { lev: 0, rlev: 0, rdgn: 0 };
    }

    /* Print out floating branches (if any). */
    for (first = true, br = game.branches; br; br = br.next) {
        if (br.end1.dnum === game.n_dgns) {
            if (first) {
                tty_putstr_sync(win, 0, "");
                tty_putstr_sync(win, 0, "Floating branches");
                first = false;
            }
            buf = `   ${br_string(br.type)} to ${game.dungeons[br.end2.dnum].dname}`;
            tty_putstr_sync(win, 0, buf);
        }
    }

    /* I hate searching for the invocation pos while debugging. -dean */
    if (Invocation_lev(game.u.uz)) {
        tty_putstr_sync(win, 0, "");
        buf = `Invocation position @ (${game.inv_pos.x},${game.inv_pos.y}), hero @ (${
               game.u.ux},${game.u.uy})`;
        tty_putstr_sync(win, 0, buf);
    } else {
        let trap;

        /* if current level has a magic portal, report its location;
           this assumes that there is at most one magic portal on any
           given level; quest and ft.ludios have pairs (one in main
           dungeon matched with one in the corresponding branch), the
           elemental planes have singletons (connection to next plane) */
        buf = '';
        trap = (game.level.traps || []).find(t => t.ttyp === MAGIC_PORTAL) || null;

        if (trap)
            buf = `Portal @ (${trap.tx},${trap.ty}), hero @ (${game.u.ux},${game.u.uy})`;

        /* only report "no portal found" when actually expecting a portal */
        else if (Is_earthlevel(game.u.uz) || Is_waterlevel(game.u.uz)
                 || Is_firelevel(game.u.uz) || Is_airlevel(game.u.uz)
                 || Is_qstart(game.u.uz) || at_dgn_entrance("The Quest")
                 || Is_knox(game.u.uz))
            buf = "No portal found.";

        /* only give output if we found a portal or expected one and didn't */
        if (buf) {
            tty_putstr_sync(win, 0, "");
            tty_putstr_sync(win, 0, buf);
        }
    }

    await tty_display_nhwindow(win, true);
    await tty_destroy_nhwindow(win);
    return { lev: 0, rlev: 0, rdgn: 0 };
}

// C ref: flag.h wizard macro
export function is_wizard_mode() { return wizard(); }

// ---------------------------------------------------------------------
// The dungeon overview (#overview, ^O, M-O) and its per-level records.
//
// C's struct mapseen (dungeon.h) is kept as a plain object; the chain
// svm.mapseenchn is game.mapseenchn, linked through .next and sorted by
// dungeon number, then level (init_mapseen()).  svl.lastseentyp[][] is
// kept on the level, game.level.lastseentyp (see display.js
// update_lastseentyp()).

/* C ref: align.h Amask2msa(), Msa2amask(), MSA_NONE */
const MSA_NONE = 0;
function Amask2msa(x) { return ((x & AM_MASK) === 4) ? 3 : (x & AM_MASK); }
function Msa2amask(x) { return (x === 3) ? 4 : x; }
/* C ref: dungeon.h In_tutorial(), Is_valley(), Is_bigroom() */
function In_tutorial(x) { return x.dnum === game.dungeon_topology.d_tutorial_dnum; }
function Is_valley(x) { return Lcheck(x, game.dungeon_topology.d_valley_level); }
function Is_bigroom(x) { return Lcheck(x, game.dungeon_topology.d_bigroom_level); }
function Is_knox(x) { return Lcheck(x, game.dungeon_topology.d_knox_level); }
/* C ref: dungeon.h Lcheck() -- Lassigned(z) && on_level(x, z) */
function Lcheck(x, z) {
    return !!(z && (z.dlevel || z.dnum) && on_level(x, z));
}
/* C ref: hack.h plur() */
function plur(x) { return (x === 1) ? "" : "s"; }
/* svl.lastseentyp[x][y]; zero until the level has been seen */
function lastseentyp_at(x, y) {
    return game.level?.lastseentyp?.[x]?.[y] ?? 0;
}

/* C ref: dungeon.h struct mapseen_feat, mapseen_flags, mapseen_rooms;
   init_mapseen()'s memset() */
function new_mapseen_feat() {
    return { nfount: 0, nsink: 0, naltar: 0, nthrone: 0, ngrave: 0, ntree: 0,
             water: 0, lava: 0, ice: 0, nshop: 0, ntemple: 0, msalign: 0,
             shoptype: 0 };
}
function new_mapseen_flags() {
    return { notreachable: 0, forgot: 0, knownbones: 0, oracle: 0,
             sokosolved: 0, bigroom: 0, castle: 0, castletune: 0, valley: 0,
             msanctum: 0, ludios: 0, roguelevel: 0, quest_summons: 0,
             questing: 0, vibrating_square: 0, spare1: 0 };
}
function new_mapseen_rooms() {
    const rooms = [];
    for (let i = 0; i < (MAXNROFROOMS + 1) * 2; i++)
        rooms.push({ seen: 0, untended: 0 });
    return rooms;
}

// C ref: dungeon.c recbranch_mapseen()
/* Record that the player knows about a branch from a level. This function
 * will determine whether or not it was a "real" branch that was taken.
 * This function should not be called for a transition done via level
 * teleport or via the Eye.
 */
export function recbranch_mapseen(source, dest) {
    let mptr;
    let br;

    /* not a branch */
    if (source.dnum === dest.dnum)
        return;

    /* we only care about forward branches */
    for (br = game.branches; br; br = br.next) {
        if (on_level(source, br.end1) && on_level(dest, br.end2))
            break;
        if (on_level(source, br.end2) && on_level(dest, br.end1))
            return;
    }

    /* branch not found, so not a real branch. */
    if (!br)
        return;

    if ((mptr = find_mapseen(source)) !== null) {
        if (mptr.br && br !== mptr.br)
            impossible("Two branches on the same level?");
        mptr.br = br;
    } else {
        impossible(`Can't note branch for unseen level (${source.dnum}, ${source.dlevel})`);
    }
}

// C ref: dungeon.c get_annotation()
function get_annotation(lev) {
    let mptr;

    if ((mptr = find_mapseen(lev)))
        return mptr.custom;
    return null;
}

// C ref: dungeon.c print_level_annotation()
/* print the annotation for the current level, if it exists */
export async function print_level_annotation() {
    let annotation;

    if ((annotation = get_annotation(game.u.uz)) !== null)
        await You(`remember this level as ${annotation}.`);
}

// C ref: dungeon.c find_mapseen_by_str()
function find_mapseen_by_str(s) {
    let mptr;

    for (mptr = game.mapseenchn ?? null; mptr; mptr = mptr.next)
        if (mptr.custom && !strcmpi(s, mptr.custom))
            break;

    return mptr ?? null;
}

/* C ref: dungeon.c dlev_in_current_branch() -- within same branch, or
   else main dungeon <-> gehennom */
function dlev_in_current_branch(dlev) {
    const u = game.u, t = game.dungeon_topology;
    return (dlev.dnum === u.uz.dnum
            || (u.uz.dnum === t.d_valley_level.dnum
                && dlev.dnum === t.d_medusa_level.dnum)
            || (u.uz.dnum === t.d_medusa_level.dnum
                && dlev.dnum === t.d_valley_level.dnum));
}

// C ref: dungeon.c lev_by_name()
export function lev_by_name(nam) {
    const u = game.u;
    let lev = 0;
    let slev = null;
    let dlev = null;
    let p;
    let idx, idxtoo;
    let mseen;

    /* look at the player's custom level annotations first */
    if ((mseen = find_mapseen_by_str(nam)) != null) {
        dlev = mseen.lev;
    } else {
        /* no matching annotation, check whether they used a name we know */

        /* allow strings like "the oracle level" to find "oracle" */
        if (!strncmpi(nam, "the ", 4))
            nam = nam.slice(4);
        if ((p = strstri_dg(nam, " level")) >= 0 && p === nam.length - 6) {
            nam = nam.slice(0, nam.length - 6);
        }
        /* hell is the old name, and wouldn't match; gehennom would match its
           branch, yielding the castle level instead of valley of the dead */
        if (!strcmpi(nam, "gehennom") || !strcmpi(nam, "hell")) {
            if (In_V_tower_dg(u.uz))
                nam = " to Vlad's tower"; /* branch to... */
            else
                nam = "valley";
        } else if (!strcmpi(nam, "delphi")) {
            /* Oracle says "welcome to Delphi" so recognize that name too */
            nam = "oracle";
        }

        if ((slev = find_level(nam)) != null)
            dlev = slev.dlevel;
    }

    if (mseen || slev) {
        idx = ledger_no(dlev);
        if (dlev_in_current_branch(dlev)
            /* either wizard mode or else seen and not forgotten;
               note: used to be '(flags & (FORGOTTEN|VISITED)) == VISITED'
               back when amnesia could cause levels to be forgotten */
            && (wizard() || (level_info_dg(idx).flags & VISITED_DG) === VISITED_DG)) {
            lev = depth(dlev);
        }
    } else { /* not a specific level; try branch names */
        idx = find_branch(nam, null);
        /* "<branch> to Xyzzy" */
        if (idx < 0 && (p = strstri_dg(nam, " to ")) >= 0)
            idx = find_branch(nam.slice(p + 4), null);

        if (idx >= 0) {
            idxtoo = (idx >> 8) & 0x00FF;
            idx &= 0x00FF;
            /* either wizard mode, or else _both_ sides of branch seen; */
            /* (flags & VISITED)==VISITED: see comment about amnesia above */
            if (wizard() || (((level_info_dg(idx).flags & VISITED_DG) === VISITED_DG)
                             && ((level_info_dg(idxtoo).flags & VISITED_DG)
                                 === VISITED_DG))) {
                if (ledger_to_dnum(idxtoo) === u.uz.dnum)
                    idx = idxtoo;
                dlev = { dnum: ledger_to_dnum(idx), dlevel: ledger_to_dlev(idx) };
                if (dlev_in_current_branch(dlev))
                    lev = depth(dlev);
            }
        }
    }
    return lev;
}

// C ref: dungeon.c find_mapseen()
/* find the particular mapseen object in the chain; may return null */
function find_mapseen(lev) {
    let mptr;

    for (mptr = game.mapseenchn ?? null; mptr; mptr = mptr.next)
        if (on_level(mptr.lev, lev))
            break;

    return mptr ?? null;
}

// C ref: dungeon.c rm_mapseen()
export function rm_mapseen(ledger_num) {
    let mptr, mprev = null;

    for (mptr = game.mapseenchn ?? null; mptr; mprev = mptr, mptr = mptr.next)
        if (game.dungeons[mptr.lev.dnum].ledger_start + mptr.lev.dlevel
            === ledger_num)
            break;
    if (!mptr)
        return;

    /* custom annotation and final_resting_place: garbage collected */
    if (mprev) {
        mprev.next = mptr.next;
    } else {
        game.mapseenchn = mptr.next;
    }
}

// C ref: dungeon.c save_mapseen()
export function save_mapseen(nhfp, mptr) {
    let curr;
    let i, brindx;

    for (brindx = 0, curr = game.branches; curr; curr = curr.next, ++brindx)
        if (curr === mptr.br)
            break;
    Sfo(nhfp, brindx, "mapseen-branch_index");
    Sfo(nhfp, mptr.lev, "mapseen-d_level");
    Sfo(nhfp, mptr.feat, "mapseen-feat");
    Sfo(nhfp, mptr.flags, "mapseen-flags");
    Sfo(nhfp, mptr.custom_lth, "mapseen-custom_lth");

    if (mptr.custom_lth) {
        Sfo(nhfp, mptr.custom, "mapseen-custom");
    }
    for (i = 0; i < ((MAXNROFROOMS + 1) * 2); ++i) {
        Sfo(nhfp, mptr.msrooms[i], "mapseen-msrooms");
    }
    savecemetery(nhfp, mptr, 'final_resting_place');
}

// C ref: dungeon.c load_mapseen()
export function load_mapseen(nhfp) {
    let i, branchnum = 0, brindx;
    let curr;
    const load = { next: null, br: null };

    branchnum = Sfi(nhfp, "mapseen-branch_index");
    for (brindx = 0, curr = game.branches; curr; curr = curr.next, ++brindx)
        if (brindx === branchnum)
            break;
    load.br = curr ?? null;

    load.lev = Sfi(nhfp, "mapseen-d_level");
    load.feat = Sfi(nhfp, "mapseen-feat");
    load.flags = Sfi(nhfp, "mapseen-flags");
    load.custom_lth = Sfi(nhfp, "mapseen-custom_lth");

    if (load.custom_lth) {
        load.custom = Sfi(nhfp, "mapseen-custom");
    } else {
        load.custom = null;
    }
    load.msrooms = [];
    for (i = 0; i < ((MAXNROFROOMS + 1) * 2); ++i) {
        load.msrooms.push(Sfi(nhfp, "mapseen-msrooms"));
    }
    load.final_resting_place = null;
    restcemetery(nhfp, load, 'final_resting_place');
    return load;
}

// C ref: dungeon.c remdun_mapseen()
/* Remove all mapseen objects for a particular dnum.
 * Useful during quest expulsion to remove quest levels.
 * [No longer deleted, just marked as notreachable.  #overview will
 * ignore such levels, end of game disclosure will include them.]
 */
export function remdun_mapseen(dnum) {
    for (let mptr = game.mapseenchn ?? null; mptr; mptr = mptr.next)
        if (mptr.lev.dnum === dnum)
            mptr.flags.notreachable = 1;
}

// C ref: dungeon.c init_mapseen()
export function init_mapseen(lev) {
    /* Create a level and insert in "sorted" order.  This is an insertion
     * sort first by dungeon (in order of discovery) and then by level number.
     */
    let mptr, prev;

    const init = {
        next: null, br: null,
        lev: { dnum: 0, dlevel: 0 },
        feat: new_mapseen_feat(),
        flags: new_mapseen_flags(),
        custom: null, custom_lth: 0,
        msrooms: new_mapseen_rooms(),
        final_resting_place: null,
    };
    /* svl.lastseentyp[][] is reused for each level, so get rid of
       previous level's data (it's kept on the level object; a level made
       after this starts with none, which reads as all zeroes) */
    if (game.level)
        game.level.lastseentyp = null;

    init.lev.dnum = lev.dnum;
    init.lev.dlevel = lev.dlevel;

    /* walk until we get to the place where we should insert init */
    for (mptr = game.mapseenchn ?? null, prev = null; mptr;
         prev = mptr, mptr = mptr.next) {
        if (mptr.lev.dnum > init.lev.dnum
            || (mptr.lev.dnum === init.lev.dnum
                && mptr.lev.dlevel > init.lev.dlevel))
            break;
    }
    if (!prev) {
        init.next = game.mapseenchn ?? null;
        game.mapseenchn = init;
    } else {
        mptr = prev.next;
        prev.next = init;
        init.next = mptr;
    }
}

/* C ref: dungeon.c OF_INTEREST() */
function OF_INTEREST(feat) {
    return !!(feat.nfount || feat.nsink || feat.nthrone || feat.naltar
              || feat.ngrave || feat.ntree || feat.nshop || feat.ntemple);
    /* || feat.water || feat.ice || feat.lava */
}

// C ref: dungeon.c interest_mapseen()
/* returns true if this level has something interesting to print out */
function interest_mapseen(mptr) {
    const u = game.u;

    if (on_level(u.uz, mptr.lev))
        return true;
    if (mptr.flags.notreachable || mptr.flags.forgot)
        return false;
    /* when in tutorial, show all tutorial levels visited whether interesting
       or not and don't show any other levels; when outside tutorial, don't
       show any tutorial levels even if they're considered interesting */
    if (In_tutorial(u.uz)) {
        return In_tutorial(mptr.lev);
    } else {
        if (In_tutorial(mptr.lev))
            return false;
    }
    /* level is of interest if it has an auto-generated annotation */
    if (mptr.flags.oracle || mptr.flags.bigroom || mptr.flags.roguelevel
        || mptr.flags.castle || mptr.flags.valley
        || mptr.flags.msanctum || mptr.flags.vibrating_square
        || mptr.flags.quest_summons || mptr.flags.questing)
        return true;
    /* when in Sokoban, list all sokoban levels visited; when not in it,
       list any visited Sokoban level which remains unsolved (will usually
       only be furthest one reached, but it's possible to enter pits and
       climb out on the far side on the first Sokoban level; also, wizard
       mode overrides teleport restrictions) */
    if (In_sokoban(mptr.lev)
        && (In_sokoban(u.uz) || !mptr.flags.sokosolved))
        return true;
    /* when in the endgame, list all endgame levels visited, whether they
       have annotations or not, so that #overview doesn't become extremely
       sparse once the rest of the dungeon has been flagged as notreachable */
    if (In_endgame(u.uz))
        return In_endgame(mptr.lev);
    /* level is of interest if it has non-zero feature count or known bones
       or user annotation or known connection to another dungeon branch
       or is the furthest level reached in its branch */
    return (OF_INTEREST(mptr.feat)
            || (!!mptr.final_resting_place
                && (!!mptr.flags.knownbones || wizard()))
            || !!mptr.custom || !!mptr.br
            || (mptr.lev.dlevel
                === game.dungeons[mptr.lev.dnum].dunlev_ureached));
}

// C ref: dungeon.c update_mapseen_for()
/* for some cases where deferred update needs to be done immediately;
   hide details from caller */
export function update_mapseen_for(x, y) {
    recalc_mapseen(); /* whole level */
    return lastseentyp_at(x, y);
}

// C ref: dungeon.c count_feat_lastseentyp()
/* count mapseen feature from lastseentyp at x,y */
function count_feat_lastseentyp(
    mptr, /* remembered data for a level; update feat.X counts */
    x, y) {
    let count;
    let atmp;
    const u = game.u;

    switch (lastseentyp_at(x, y)) {
    /* ICE, POOL/MOAT/WATER, LAVAPOOL/LAVAWALL: #if 0 in C */
    case TREE:
        count = mptr.feat.ntree + 1;
        if (count <= 3)
            mptr.feat.ntree = count;
        break;
    case FOUNTAIN:
        count = mptr.feat.nfount + 1;
        if (count <= 3)
            mptr.feat.nfount = count;
        break;
    case THRONE:
        count = mptr.feat.nthrone + 1;
        if (count <= 3)
            mptr.feat.nthrone = count;
        break;
    case SINK:
        count = mptr.feat.nsink + 1;
        if (count <= 3)
            mptr.feat.nsink = count;
        break;
    case GRAVE:
        count = mptr.feat.ngrave + 1;
        if (count <= 3)
            mptr.feat.ngrave = count;
        break;
    case ALTAR:
        /* get the altarmask for this location; might be a mimic */
        atmp = altarmask_at(x, y);
        /* convert to index: 0..3 */
        atmp = (Is_astralevel(u.uz)
                && ((game.level.at(x, y).seenv ?? 0) & SVALL) !== SVALL)
               ? MSA_NONE
               : Amask2msa(atmp);
        if (!mptr.feat.naltar)
            mptr.feat.msalign = atmp;
        else if (mptr.feat.msalign !== atmp)
            mptr.feat.msalign = MSA_NONE;
        count = mptr.feat.naltar + 1;
        if (count <= 3)
            mptr.feat.naltar = count;
        break;
        /*  An automatic annotation is added to the Castle and
         *  to Fort Ludios once their structure's main entrance
         *  has been seen (in person or via magic mapping).
         *  For the Fort, that entrance is just a secret door
         *  which will be converted into a regular one when
         *  located (or destroyed).
         * DOOR: possibly a lowered drawbridge's open portcullis;
         * DBWALL: a raised drawbridge's "closed door";
         * DRAWBRIDGE_DOWN: the span provided by lowered bridge,
         *  with moat or other terrain hidden underneath;
         * DRAWBRIDGE_UP: moat in front of a raised drawbridge,
         *  not recognizable as a bridge location unless/until
         *  the adjacent DBWALL has been seen.
         */
    case DOOR:
        if (Is_knox(u.uz)) {
            let ty;
            const tx = x - 4;

            /* Throne is four columns to left, either directly in
             * line or one row higher or lower, and doesn't have
             * to have been seen yet.
             */
            for (ty = y - 1; ty <= y + 1; ++ty)
                if (isok(tx, ty) && IS_THRONE(game.level.at(tx, ty).typ)) {
                    mptr.flags.ludios = 1;
                    break;
                }
            break;
        }
        if (is_drawbridge_wall(x, y) < 0)
            break;
        /*FALLTHRU*/
    // eslint-disable-next-line no-fallthrough
    case DBWALL:
    case DRAWBRIDGE_DOWN:
        if (Is_stronghold(u.uz)) {
            mptr.flags.castle = 1;
            mptr.flags.castletune = 1;
        }
        break;
    default:
        break;
    }
}

// C ref: dungeon.c recalc_mapseen()
/* recalculate mapseen for the current level */
export function recalc_mapseen() {
    const g = game;
    const u = g.u;
    const topo = g.dungeon_topology;
    let mptr, oth_mptr;
    let mtmp;
    let bp;
    let t;
    let i, ridx;
    let count;
    let x, y;
    let uroom;

    /* Should not happen in general, but possible if in the process
     * of being booted from the quest.  The mapseen object gets
     * removed during the expulsion but prior to leaving the level
     * [Since quest expulsion no longer deletes quest mapseen data,
     * null return from find_mapseen() should now be impossible.]
     */
    if (!(mptr = find_mapseen(u.uz)))
        return;

    /* reset all features; mptr->feat.* = 0; */
    mptr.feat = new_mapseen_feat();
    /* reset most flags; some level-specific ones are left as-is */
    if (mptr.flags.notreachable) {
        mptr.flags.notreachable = 0; /* reached it; Eye of the Aethiopica? */
        if (In_quest(u.uz)) {
            let mptrtmp = g.mapseenchn;

            /* when quest was notreachable due to ejection and portal removal,
               getting back to it via arti-invoke should revive annotation
               data for all quest levels, not just the one we're on now */
            do {
                if (mptrtmp.lev.dnum === mptr.lev.dnum)
                    mptrtmp.flags.notreachable = 0;
                mptrtmp = mptrtmp.next;
            } while (mptrtmp);
        }
    }
    mptr.flags.knownbones = 0;
    mptr.flags.sokosolved = (In_sokoban(u.uz) && !g.level.flags.sokoban_rules) ? 1 : 0;
    /* mptr->flags.bigroom retains previous value when hero can't see */
    if (!Blind())
        mptr.flags.bigroom = Is_bigroom(u.uz) ? 1 : 0;
    else if (mptr.flags.forgot)
        mptr.flags.bigroom = 0;
    mptr.flags.roguelevel = Is_rogue_level(u.uz) ? 1 : 0;
    mptr.flags.oracle = 0; /* recalculated during room traversal below */
    mptr.flags.castletune = 0;
    /* flags.castle retains previous value */
    mptr.flags.forgot = 0;
    /* flags.quest_summons disabled once quest finished */
    mptr.flags.quest_summons = (at_dgn_entrance("The Quest")
                                && u.uevent.qcalled
                                && !(u.uevent.qcompleted
                                     || u.uevent.qexpelled
                                     || g.quest_status.leader_is_dead)) ? 1 : 0;
    mptr.flags.questing = (on_level(u.uz, topo.d_qstart_level)
                           && g.quest_status.got_quest) ? 1 : 0;
    /* flags.msanctum, .valley, and .vibrating_square handled below */

    /* track rooms the hero is in */
    const rooms = g.level.rooms;
    const urooms = u.urooms || '';
    for (i = 0; i < urooms.length; ++i) {
        uroom = urooms[i];
        ridx = uroom.charCodeAt(0) - ROOMOFFSET;
        mptr.msrooms[ridx].seen = 1;
        mptr.msrooms[ridx].untended =
            (rooms[ridx].rtype >= SHOPBASE)
                ? ((!(mtmp = shop_keeper(uroom.charCodeAt(0)))
                    || !inhishop(mtmp)) ? 1 : 0)
                : (rooms[ridx].rtype === TEMPLE)
                      ? ((!(mtmp = findpriest(uroom))
                          || !inhistemple(mtmp)) ? 1 : 0)
                      : 0;
    }

    /* recalculate room knowledge: for now, just shops and temples
     * this could be extended to an array of 0..SHOPBASE
     */
    for (i = 0; i < mptr.msrooms.length; ++i) {
        if (mptr.msrooms[i].seen) {
            /* svr.rooms[] is a fixed-size array in C; unused entries are
               zeroed (rtype OROOM) */
            const rtype = rooms[i]?.rtype ?? 0;
            if (rtype >= SHOPBASE) {
                if (mptr.msrooms[i].untended)
                    mptr.feat.shoptype = SHOPBASE - 1;
                else if (!mptr.feat.nshop)
                    mptr.feat.shoptype = rtype;
                else if (mptr.feat.shoptype !== rtype)
                    mptr.feat.shoptype = 0;
                count = mptr.feat.nshop + 1;
                if (count <= 3)
                    mptr.feat.nshop = count;
            } else if (rtype === TEMPLE) {
                /* altar and temple alignment handled below */
                count = mptr.feat.ntemple + 1;
                if (count <= 3)
                    mptr.feat.ntemple = count;
            } else if ((rooms[i]?.orig_rtype ?? 0) === DELPHI) {
                mptr.flags.oracle = 1;
            }
        }
    }

    /* Update svl.lastseentyp with typ if and only if it is in sight or the
     * hero can feel it on their current location (i.e. not levitating).
     * This *should* give the "last known typ" for each dungeon location.
     */
    if (!Levitation())
        update_lastseentyp(u.ux, u.uy);

    for (x = 1; x < COLNO; x++) {
        for (y = 0; y < ROWNO; y++) {
            count_feat_lastseentyp(mptr, x, y);
        }
    }

    /* Moloch's Sanctum and the Valley of the Dead are normally given an
       automatic annotation when you enter a temple attended by a priest,
       but it is possible for the priest to be killed prior to that; we
       assume that both of those levels only contain one altar, so add the
       annotation if that altar has been mapped (seen or magic mapping) */
    if (Is_valley(u.uz)) {
        /* don't clear valley if naltar==0; maybe altar got destroyed? */
        if (mptr.feat.naltar > 0)
            mptr.flags.valley = 1;

    /* Sanctum and Gateway-to-Sanctum are mutually exclusive automatic
       annotations but handling that is tricky because they're stored
       with data for different levels */
    } else if (Is_sanctum(u.uz)) {
        if (mptr.feat.naltar > 0)
            mptr.flags.msanctum = 1;

        if (mptr.flags.msanctum) {
            const invocat_lvl = { dnum: u.uz.dnum, dlevel: u.uz.dlevel };

            invocat_lvl.dlevel -= 1;
            if ((oth_mptr = find_mapseen(invocat_lvl)) !== null)
                oth_mptr.flags.vibrating_square = 0;
        }
    } else if (Invocation_lev(u.uz)) {
        /* annotate vibrating square's level if vibr_sqr 'trap' has been
           found or if that trap is gone (indicating that invocation has
           happened) provided that the sanctum's annotation hasn't been
           added (either hero hasn't descended to that level yet or hasn't
           mapped its temple) */
        t = (g.level.traps || []).find(tt => tt.ttyp === VIBRATING_SQUARE)
            ?? null;
        mptr.flags.vibrating_square = (t ? !!t.tseen
                      /* no trap implies that invocation has been performed */
                             : ((oth_mptr = find_mapseen(topo.d_sanctum_level)) === null
                                || !oth_mptr.flags.msanctum)) ? 1 : 0;
    }

    if (g.level.bonesinfo && !mptr.final_resting_place) {
        /* clone the bonesinfo so we aren't dependent upon this
           level being in memory */
        let head = null, tail = null;
        bp = g.level.bonesinfo;
        do {
            const copy = { ...bp, next: null };
            if (tail) tail.next = copy; else head = copy;
            tail = copy;
            bp = bp.next;
        } while (bp);
        mptr.final_resting_place = head;
    }
    /* decide which past hero deaths have become known; there's no
       guarantee of either a grave or a ghost, so we go by whether the
       current hero has seen the map location where each old one died */
    for (bp = mptr.final_resting_place; bp; bp = bp.next)
        if (lastseentyp_at(bp.frpx, bp.frpy)) {
            bp.bonesknown = true;
            mptr.flags.knownbones = 1;
        }
}

// C ref: dungeon.c mapseen_temple()
/* valley and sanctum levels get automatic annotation once their temple
   is entered */
export function mapseen_temple(priest) { /* priest: not used */
    const mptr = find_mapseen(game.u.uz);

    if (!mptr)
        return;
    if (Is_valley(game.u.uz))
        mptr.flags.valley = 1;
    else if (Is_sanctum(game.u.uz))
        mptr.flags.msanctum = 1;
}

// C ref: dungeon.c room_discovered()
/* room entry message has just been delivered so learn room even if blind */
export function room_discovered(roomno) {
    const mptr = find_mapseen(game.u.uz);

    if (mptr && !mptr.msrooms[roomno].seen) {
        mptr.msrooms[roomno].seen = 1;
        recalc_mapseen();
    }
}

// C ref: dungeon.c dooverview() -- #overview command
export async function dooverview() {
    /* game in progress; 'why' is 0 for normal #overview, -1 if user prefixed
       #overview with 'm'; 'reason' for end of game isn't applicable: use 0 */
    await show_overview(game.iflags.menu_requested ? -1 : 0, 0);
    game.iflags.menu_requested = false;
    return 0; /* ECMD_OK */
}

// C ref: dungeon.c show_overview()
/* called for #overview or for end of game disclosure */
export async function show_overview(
    why, /* 0 => normal #overview command, -1 => 'm' prefix #overview;
          * 1 or 2 => final disclosure (1: hero lived, 2: hero died) */
    reason) { /* how hero died; used when disclosing end-of-game level */
    const lastdun = { v: -1 };
    let n;

    /* lazy initialization */
    recalc_mapseen();

    const win = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(win, MENU_BEHAVE_STANDARD);
    /* show the endgame levels before the rest of the dungeon,
       so that the Planes (dnum 5-ish) come out above main dungeon (dnum 0) */
    if (In_endgame(game.u.uz))
        traverse_mapseenchn(1, win, why, reason, lastdun);
    /* if game is over or we're not in the endgame yet, show the dungeon */
    if (why > 0 || !In_endgame(game.u.uz))
        traverse_mapseenchn(0, win, why, reason, lastdun);
    tty_end_menu(win, null);
    const res = await tty_select_menu(win, (why !== -1) ? PICK_NONE : PICK_ONE);
    n = res.n;
    if (n > 0) {
        let ledger;
        const lev = { dnum: 0, dlevel: 0 };

        ledger = res.selected[0].item - 1;
        lev.dnum = ledger_to_dnum(ledger);
        lev.dlevel = ledger_to_dlev(ledger);
        await query_annotation(lev);
    }
    await tty_destroy_nhwindow(win);
}

// C ref: dungeon.c traverse_mapseenchn()
/* display endgame levels or non-endgame levels, not both */
function traverse_mapseenchn(
    viewendgame,    /* 1: show endgame branch; 0: show other branches */
    win,            /* output window */
    why,            /* -1: menu, 0: normal, 1 and 2: end of game disclosure */
    reason,         /* when 'why'==1 or 2, how the game ended */
    lastdun_p) {    /* where to restart if called twice */
    let mptr;
    let showheader;

    for (mptr = game.mapseenchn ?? null; mptr; mptr = mptr.next) {
        if (viewendgame ^ (In_endgame(mptr.lev) ? 1 : 0))
            continue;

        /* only print out info for a level or a dungeon if it's of interest */
        if (why !== 0 || interest_mapseen(mptr)) {
            showheader = (mptr.lev.dnum !== lastdun_p.v);
            print_mapseen(win, mptr, why, reason, showheader);
            lastdun_p.v = mptr.lev.dnum;
        }
    }
}

// C ref: dungeon.c seen_string()
function seen_string(x, obj) {
    /* players are computer scientists: 0, 1, 2, n */
    switch (x) {
    case 0:
        return "no";
    /* an() returns too much.  index/strchr is ok in this case */
    case 1:
        return "aeiouAEIOU".includes(obj[0]) ? "an" : "a";
    case 2:
        return "some";
    case 3:
        return "many";
    }

    return "(unknown)";
}

// C ref: dungeon.c br_string2()
/* better br_string */
function br_string2(br) {
    /* Special case: quest portal says closed if kicked from quest */
    const closed_portal = (br.end2.dnum === game.dungeon_topology.d_quest_dnum
                           && !!game.u.uevent.qexpelled);

    switch (br.type) {
    case BR_PORTAL:
        return closed_portal ? "Sealed portal" : "Portal";
    case BR_NO_END1:
        return "Connection";
    case BR_NO_END2:
        return br.end1_up ? "One way stairs up" : "One way stairs down";
    case BR_STAIR:
        return br.end1_up ? "Stairs up" : "Stairs down";
    }

    return "(unknown)";
}

// C ref: dungeon.c endgamelevelname()
/* get the name of an endgame level; topten.c does something similar */
export function endgamelevelname(indx) {
    let planename = null;
    let outbuf = '';

    switch (indx) {
    case -5:
        outbuf = "Astral Plane";
        break;
    case -4:
        planename = "Water";
        break;
    case -3:
        planename = "Fire";
        break;
    case -2:
        planename = "Air";
        break;
    case -1:
        planename = "Earth";
        break;
    }
    if (planename)
        outbuf = `Plane of ${planename}`;
    else if (!outbuf)
        outbuf = `unknown plane #${indx}`;
    return outbuf;
}

// C ref: dungeon.c shop_string()
/* short shop description */
function shop_string(rtype) {
    const shoptype = rtype - SHOPBASE; /* convert room type to shop type */
    let str = "shop?"; /* catchall */

    if (shoptype < 0) {
        str = "untended shop";
    } else if (shtypes[shoptype].noun) { /* C: .annotation */
        str = shtypes[shoptype].noun;
    } else if (shtypes[shoptype].name) {
        str = shtypes[shoptype].name;
    }
    return str;
}

// C ref: dungeon.c tunesuffix()
/* if player knows about the mastermind tune, append it to Castle annotation;
   if drawbridge has been destroyed, flags.castletune will be zero */
function tunesuffix(mptr) {
    let outbuf = '';
    if (mptr.flags.castletune && game.u.uevent.uheard_tune) {
        let tmp;

        if (game.u.uevent.uheard_tune === 2)
            tmp = `notes "${game.tune}"`;
        else
            tmp = "5-note tune";
        outbuf = ` (play ${tmp} to open or close drawbridge)`;
    }
    return outbuf;
}

/* some utility macros for print_mapseen */
const TAB = "   "; /* three spaces */
const PREFIX = "      "; /* two TABs + empty BULLET: six spaces */

// C ref: dungeon.c print_mapseen()
function print_mapseen(
    win, mptr,
    final, /* -1: as menu; 0: not final;
            * 1: game over, alive; 2: game over, dead */
    how,   /* cause of death; only used if final==2 and mptr->lev==u.uz */
    printdun) {
    const u = game.u;
    const topo = game.dungeon_topology;
    let buf, tmpbuf;
    let i, depthstart, dnum;
    const died_here = (final === 2 && on_level(u.uz, mptr.lev));
    let any;

    /* utility macros: COMMA, ADDNTOBUF, ADD2NTOBUF */
    const COMMA = () => ((i++ > 0) ? ", " : PREFIX);
    const ADDNTOBUF = (nam, v) => {
        if (v)
            buf += `${COMMA()}${seen_string(v, nam)} ${nam}${plur(v)}`;
    };
    /* ADD2NTOBUF: for "M temples and N altars"; seen_string() is safe to use
       multiple times within one expression; so is plur() */
    const ADD2NTOBUF = (nam, v, nam2, v2) => {
        if (v && v2) {
            buf += `${COMMA()}${seen_string(v, nam)} ${nam}${plur(v)} and ${
                    seen_string(v2, nam2)} ${nam2}${plur(v2)}`;
        } else if (v) {
            ADDNTOBUF(nam, v);
        } else if (v2) {
            ADDNTOBUF(nam2, v2);
        }
    };

    /* Damnable special cases */
    /* The quest and knox should appear to be level 1 to match
     * other text.
     */
    dnum = mptr.lev.dnum;
    if (dnum === topo.d_quest_dnum || dnum === topo.d_knox_level.dnum)
        depthstart = 1;
    else
        depthstart = game.dungeons[dnum].depth_start;

    if (printdun) {
        const dptr = game.dungeons[dnum];
        if (dptr.dunlev_ureached === dptr.entry_lev
            /* suppress the negative numbers in the endgame */
            || In_endgame(mptr.lev))
            buf = `${dptr.dname}:`;
        else if (builds_up(mptr.lev))
            buf = `${dptr.dname}: levels ${depthstart + dptr.entry_lev - 1} up to ${
                    depthstart + dptr.dunlev_ureached - 1}`;
        else
            buf = `${dptr.dname}: levels ${depthstart} to ${
                    depthstart + dptr.dunlev_ureached - 1}`;

        add_menu_heading(win, buf);
    }

    /* calculate level number */
    i = depthstart + mptr.lev.dlevel - 1;
    if (In_endgame(mptr.lev))
        buf = `${(final !== -1) ? TAB : ""}${endgamelevelname(i)}:`;
    else
        buf = `${(final !== -1) ? TAB : ""}Level ${i}:`;

    /* wizmode prints out proto dungeon names for clarity */
    if (wizard()) {
        let slev;

        if ((slev = Is_special(mptr.lev)) !== null)
            buf += ` [${slev.proto}]`;
    }
    /* [perhaps print custom annotation on its own line when it's long] */
    if (mptr.custom)
        buf += ` "${mptr.custom}"`;
    if (on_level(u.uz, mptr.lev))
        buf += ` <- You ${(final <= 0 || (final === 1 && how === ASCENDED)) ? "are"
                          : (final === 1 && how === ESCAPED) ? "left from"
                            : "were"} here.`;

    any = 0;
    if (final === -1)
        any = ledger_no(mptr.lev) + 1;
    tty_add_menu(win, null, any, 0, 0, ATR_NONE, NO_COLOR,
                 buf, MENU_ITEMFLAGS_NONE);

    if (mptr.flags.forgot)
        return;

    if (OF_INTEREST(mptr.feat)) {
        buf = '';

        i = 0; /* interest counter */
        /* List interests in an order vaguely corresponding to
         * how important they are.
         */
        if (mptr.feat.nshop > 0) {
            if (mptr.feat.nshop > 1)
                ADDNTOBUF("shop", mptr.feat.nshop);
            else
                buf += `${COMMA()}${an(shop_string(mptr.feat.shoptype))}`;
        }
        if (mptr.feat.naltar > 0 || mptr.feat.ntemple > 0) {
            let atmp;

            /* being aware of a temple doesn't guarantee being aware of its
               altar (via entrance message when entering while blinded, or
               possibly it being out of view in an irregularly shaped room);
               FIXME: if all temples present have been desecrated, we ought
               to say so */
            ADD2NTOBUF("temple", mptr.feat.ntemple,
                       "altar", mptr.feat.naltar);

            /* only print out altar's god if they are all to your god */
            atmp = mptr.feat.msalign;               /*    0,  1,  2,  3 */
            atmp = Msa2amask(atmp);                 /*    0,  1,  2,  4 */
            if (Amask2align(atmp) === u.ualign.type) /* -128, -1,  0, +1 */
                buf += ` to ${align_gname(u.ualign.type)}`;
        }
        ADDNTOBUF("throne", mptr.feat.nthrone);
        ADDNTOBUF("fountain", mptr.feat.nfount);
        ADDNTOBUF("sink", mptr.feat.nsink);
        ADDNTOBUF("grave", mptr.feat.ngrave);
        ADDNTOBUF("tree", mptr.feat.ntree);
        /* water, lava, ice: #if 0 in C */
        /* capitalize afterwards */
        i = PREFIX.length;
        buf = buf.slice(0, i) + highc(buf.charAt(i)) + buf.slice(i + 1);
        /* capitalizing it makes it a sentence; terminate with '.' */
        buf += ".";
        add_menu_str(win, buf);
    }

    /* we assume that these are mutually exclusive */
    buf = '';
    if (mptr.flags.oracle) {
        buf = `${PREFIX}Oracle of Delphi.`;
    } else if (In_sokoban(mptr.lev)) {
        buf = `${PREFIX}${mptr.flags.sokosolved ? "Solved" : "Unsolved"}.`;
    } else if (mptr.flags.bigroom) {
        buf = `${PREFIX}A very big room.`;
    } else if (mptr.flags.roguelevel) {
        buf = `${PREFIX}A primitive area.`;
    } else if (on_level(mptr.lev, topo.d_qstart_level)) {
        buf = `${PREFIX}Home${mptr.flags.notreachable ? " (no way back...)" : ""}.`;
        if (u.uevent.qcompleted)
            buf = `${PREFIX}Completed quest for ${ldrname()}.`;
        else if (mptr.flags.questing)
            buf = `${PREFIX}Given quest by ${ldrname()}.`;
    } else if (mptr.flags.ludios) {
        /* presence of the ludios branch in #overview output indicates that
           the player has made it onto the level; presence of this annotation
           indicates that the fort's entrance has been seen (or mapped) */
        buf = `${PREFIX}Fort Ludios.`;
    } else if (mptr.flags.castle) {
        buf = `${PREFIX}The castle${tunesuffix(mptr)}.`;
    } else if (mptr.flags.valley) {
        buf = `${PREFIX}Valley of the Dead.`;
    } else if (mptr.flags.vibrating_square) {
        buf = `${PREFIX}Gateway to Moloch's Sanctum.`;
    } else if (mptr.flags.msanctum) {
        buf = `${PREFIX}Moloch's Sanctum.`;
    }
    if (buf) {
        add_menu_str(win, buf);
    }
    /* quest entrance is not mutually-exclusive with bigroom or rogue level */
    if (mptr.flags.quest_summons) {
        buf = `${PREFIX}Summoned by ${ldrname()}.`;
        add_menu_str(win, buf);
    }

    /* print out branches */
    if (mptr.br) {
        buf = `${PREFIX}${br_string2(mptr.br)} to ${
                game.dungeons[mptr.br.end2.dnum].dname}`;

        /* Since mapseen objects are printed out in increasing order
         * of dlevel, clarify which level this branch is going to
         * if the branch goes upwards.  Unless it's the end game.
         */
        if (mptr.br.end1_up && !In_endgame(mptr.br.end2))
            buf += `, level ${depth(mptr.br.end2)}`;
        buf += ".";
        add_menu_str(win, buf);
    }

    /* maybe print out bones details */
    if (mptr.final_resting_place || final > 0) {
        let bp;
        let kncnt = !died_here ? 0 : 1;

        for (bp = mptr.final_resting_place; bp; bp = bp.next)
            if (bp.bonesknown || wizard() || final > 0)
                ++kncnt;
        if (kncnt) {
            buf = `${PREFIX}Final resting place for`;
            add_menu_str(win, buf);
            if (died_here) {
                /* disclosure occurs before bones creation, so listing dead
                   hero here doesn't give away whether bones are produced */
                tmpbuf = formatkiller(BUFSZ, how, true);
                /* rephrase a few death reasons to work with "you" */
                tmpbuf = tmpbuf.replace(" himself", " yourself"); /* strsubst() */
                tmpbuf = tmpbuf.replace(" herself", " yourself");
                tmpbuf = tmpbuf.replace(" his ", " your ");
                tmpbuf = tmpbuf.replace(" her ", " your ");
                buf = `${PREFIX}${TAB}you, ${tmpbuf}${--kncnt ? ',' : '.'}`;
                add_menu_str(win, buf);
            }
            for (bp = mptr.final_resting_place; bp; bp = bp.next) {
                if (bp.bonesknown || wizard() || final > 0) {
                    buf = `${PREFIX}${TAB}${bp.who}, ${bp.how}${--kncnt ? ',' : '.'}`;
                    add_menu_str(win, buf);
                }
            }
        }
    }
}

// C ref: dungeon.c query_annotation() -- lev null: the current level
// (the !EDIT_GETLIN build)
async function query_annotation(lev) {
    const mptr = find_mapseen(lev ? lev : game.u.uz);
    let nbuf;

    if (!mptr)
        return;

    if (mptr.custom) {
        const tmpbuf = `Replace annotation "${mptr.custom.slice(0, 30)}${(mptr.custom.length > 30) ? "..." : ""}" with?`;
        nbuf = await tty_getlin(tmpbuf);
    } else {
        let lbuf; /* level description */

        if (!lev || on_level(game.u.uz, lev)) {
            lbuf = "this dungeon level";
        } else {
            const dflgs = (lev.dnum === game.u.uz.dnum) ? 0 : 2;
            const save_uz = game.u.uz;

            game.u.uz = { dnum: lev.dnum, dlevel: lev.dlevel };
            try {
                lbuf = describe_level(dflgs)[1];
            } finally {
                game.u.uz = save_uz;
            }

            lbuf = lbuf.replace("Dlvl:", "level "); /* strsubst() */
            /* even though we've told describe_level() not to append
               a trailing space (by not including '1' in dflgs), the
               level number is formatted with %-2d so single digit
               values will end up with one anyway; remove it */
            lbuf = trimspaces(lbuf);
        }
        nbuf = await tty_getlin(`What do you want to call ${lbuf}?`.slice(0, QBUFSZ - 1));
    }

    /* empty input or ESC means don't add or change annotation;
       space-only means discard current annotation without adding new one */
    if (!nbuf || nbuf[0] === '\x1b')
        return;
    /* strip leading and trailing spaces, compress out consecutive spaces */
    nbuf = mungspaces(nbuf);

    /* discard old annotation, if any */
    if (mptr.custom) {
        mptr.custom = null;
        mptr.custom_lth = 0;
    }
    /* add new annotation, unless it's all spaces (which will be an
       empty string after mungspaces() above) */
    if (nbuf && nbuf !== " ") {
        mptr.custom = nbuf;
        /* _lth field does not include trailing '\0' in the count */
        mptr.custom_lth = nbuf.length;
    }
}

// C ref: dungeon.c donamelevel() -- #annotate command (M-A): add a custom
// name to the current level
export async function donamelevel() {
    if (game.iflags.menu_requested)
        return await dooverview();
    await query_annotation(null);
    return 0; /* ECMD_OK */
}

// C ref: dungeon.c Can_rise_up()
export function Can_rise_up(x, y, lev) {
    const stway = stairway_find_special_dir(false);

    /* can't rise up from inside the top of the Wizard's tower */
    /* KMH -- or in sokoban */
    if (In_endgame(lev) || In_sokoban(lev)
        || (on_level(lev, game.dungeon_topology.d_wiz1_level) /* Is_wiz1_level() */
            && In_W_tower(x, y, lev)))
        return false;
    return (lev.dlevel > 1
            || (game.dungeons[lev.dnum].entry_lev === 1
                && ledger_no(lev) !== 1
                && !!stway && !!stway.up));
}

// C ref: dungeon.c ceiling()
export function ceiling(x, y) {
    const lev = game.level.at(x, y);
    const u = game.u;
    let what;

    /* other room types will no longer exist when we're interested --
     * see check_special_room()
     */
    if (in_rooms(x, y, VAULT).length)
        what = "vault's ceiling";
    else if (in_rooms(x, y, TEMPLE).length)
        what = "temple's ceiling";
    else if (in_rooms(x, y, SHOPBASE).length)
        what = "shop's ceiling";
    else if (Is_waterlevel(u.uz))
        /* water plane has no surface; its air bubbles aren't below sky */
        what = "water above";
    else if (IS_AIR(lev.typ))
        what = "sky";
    else if (Is_firelevel(u.uz))
        what = "flames above";
    else if (In_quest(u.uz))
        /* just in case; try to avoid in caller if you can */
        what = "expanse above";
    else if (u.uinwater) /* Underwater */
        what = "water's surface";
    else if ((IS_ROOM(lev.typ) && !Is_earthlevel(u.uz))
             || IS_WALL(lev.typ) || IS_DOOR(lev.typ) || lev.typ === SDOOR)
        what = "ceiling";
    else
        what = "rock cavern";

    return what;
}
