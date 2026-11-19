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

import { game } from './gstate.js';
import { rn2, rn1 } from './rng.js';
import {
    TRUE, FALSE, MAXDUNGEON, MAXLEVEL, LEV_LIMIT, BRANCH_LIMIT, NHL_SB_SAFE,
    TBR_STAIR, TBR_NO_UP, TBR_NO_DOWN, TBR_PORTAL,
    BR_STAIR, BR_NO_END1, BR_NO_END2, BR_PORTAL,
    TOWN, HELLISH, MAZELIKE, ROGUELIKE, UNCONNECTED, D_ALIGN_MASK,
    D_ALIGN_NONE, D_ALIGN_CHAOTIC, D_ALIGN_NEUTRAL, D_ALIGN_LAWFUL,
} from './const.js';
import {
    nhl_init, nhl_loadlua, nhl_done, lua_type, lua_istable, lua_len,
    luaL_checkoption, get_table_int, get_table_int_opt, get_table_str,
    get_table_str_opt, get_table_option, LUA_TTABLE, LUA_TSTRING, LUA_TNIL,
} from './nhlua.js';
import { strcmpi, strncmpi } from './hacklib.js';

// C's panic() (end.c) and impossible() (pline.c) are not ported yet.
function panic(msg) { throw new Error(`panic: ${msg}`); }
function impossible(msg) { console.error(`impossible: ${msg}`); }

// C ref: flag.h wizard macro — flags.debug
function wizard() { return !!game.flags?.debug; }

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

// C ref: flag.h wizard macro
export function is_wizard_mode() { return wizard(); }
