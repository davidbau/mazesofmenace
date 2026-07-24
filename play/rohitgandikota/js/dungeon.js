// dungeon.js — dungeon topology initialisation.
// C ref: src/dungeon.c
//
// This is the block of the PRNG stream immediately after o_init and the
// nhlib.lua align shuffle — C's call 201 onward in every session. The dungeon
// description data comes from js/dungeon_data.js, generated from dat/dungeon.lua
// by tools/gen-dungeon.mjs; dungeon.lua is purely declarative, so this needs no
// Lua interpreter.
//
// Porting notes for the two things that fail silently if got wrong are in
// docs/plan/04-level-generation.md §4.0.

import { game } from './gstate.js';
import { rn2, rn1 } from './rng.js';
import { dungeon as DUNGEON_DATA } from './dungeon_data.js';

// include/global.h:408-409
const MAXDUNGEON = 16;
const MAXLEVEL = 32;

// include/dgn_file.h:56-67
const TOWN = 0x01, HELLISH = 0x02, MAZELIKE = 0x04, ROGUELIKE = 0x08;
const UNCONNECTED = 0x10;
const D_ALIGN_NONE = 0x00;
const D_ALIGN_MASK = 0x70;
/* D_ALIGN_x is (AM_x << 4); AM_LAWFUL 4, AM_NEUTRAL 2, AM_CHAOTIC 1 */
const D_ALIGN_LAWFUL = 4 << 4, D_ALIGN_NEUTRAL = 2 << 4, D_ALIGN_CHAOTIC = 1 << 4;

// include/dgn_file.h:48-51 — temporary branch types from dungeon.lua
const TBR_STAIR = 0, TBR_NO_UP = 1, TBR_NO_DOWN = 2, TBR_PORTAL = 3;
// include/dungeon.h:91-96 — the branch types they convert to
const BR_STAIR = 0, BR_NO_END1 = 1, BR_NO_END2 = 2, BR_PORTAL = 3;

const BRTYPES = { stair: TBR_STAIR, no_up: TBR_NO_UP,
                  no_down: TBR_NO_DOWN, portal: TBR_PORTAL };
const BRDIRS = { down: 0, up: 1 };

// src/dungeon.c:744 get_dgn_flags()
const FLAGSTRS = { town: TOWN, hellish: HELLISH, mazelike: MAZELIKE,
                   roguelike: ROGUELIKE, unconnected: UNCONNECTED };
function get_dgn_flags(entry) {
    let dgn_flags = 0;
    const f = entry.flags;
    if (f === undefined || f === null) return 0;
    /* the Lua side accepts either a single string or an array of them */
    for (const name of Array.isArray(f) ? f : [f])
        dgn_flags |= (FLAGSTRS[name] || 0);
    return dgn_flags;
}

// src/dungeon.c:781 get_dgn_align()
const DGNALIGNS = {
    unaligned: D_ALIGN_NONE, noalign: D_ALIGN_NONE,
    lawful: D_ALIGN_LAWFUL, neutral: D_ALIGN_NEUTRAL, chaotic: D_ALIGN_CHAOTIC,
};
function get_dgn_align(entry) {
    const a = DGNALIGNS[entry.alignment ?? 'unaligned'];
    return a === undefined ? D_ALIGN_NONE : a;
}

// `wizard` is true in playmode:debug, which skips both chance checks below and
// therefore skips their draws entirely. 13 of the 44 public sessions run this
// way, so it is not an edge case.
function isWizard() {
    return game.rc?.opts?.playmode === 'debug';
}

// src/dungeon.c:380 level_range()
// Returns { count, adjusted_base }. A negative `base` counts from the END of
// the dungeon — the castle is base -1 and medusa is base -5, so this fires on
// dungeon 0 and getting it wrong shifts place_level's range immediately.
function level_range(dgn, base, randc, chain, pd) {
    const lmax = game.dungeons[dgn].num_dunlevs;

    if (chain >= 0) { /* relative to a special level */
        const levtmp = pd.final_lev[chain];
        if (!levtmp)
            throw new Error('level_range: empty chain level!');
        base += levtmp.dlevel.dlevel;
    } else { /* absolute in the dungeon */
        /* from end of dungeon */
        if (base < 0)
            base = (lmax + base + 1);
    }

    if (base < 1 || base > lmax)
        throw new Error(`level_range: base value out of range (${base}, lmax ${lmax})`);

    const adjusted_base = base;

    if (randc === -1) { /* from base to end of dungeon */
        return { count: lmax - base + 1, adjusted_base };
    } else if (randc) {
        /* make sure we don't run off the end of the dungeon */
        return {
            count: ((base + randc - 1) > lmax) ? lmax - base + 1 : randc,
            adjusted_base,
        };
    } /* else only one choice */
    return { count: 1, adjusted_base };
}

// src/dungeon.c:566 init_level()
function init_level(dgn, proto_index, pd) {
    const tlevel = pd.tmplevel[proto_index];

    pd.final_lev[proto_index] = null; /* no "real" level */
    if (!isWizard() && tlevel.chance <= rn2(100))
        return;

    const new_level = {
        proto: tlevel.name,
        boneid: tlevel.boneschar,
        dlevel: { dnum: dgn, dlevel: 0 /* for now */ },
        flags: {
            town: !!(tlevel.flags & TOWN),
            hellish: !!(tlevel.flags & HELLISH),
            maze_like: !!(tlevel.flags & MAZELIKE),
            rogue_like: !!(tlevel.flags & ROGUELIKE),
            align: (tlevel.flags & D_ALIGN_MASK) >> 4,
        },
        rndlevs: tlevel.rndlevs,
        next: null,
    };
    if (!new_level.flags.align)
        new_level.flags.align = (pd.tmpdungeon[dgn].flags & D_ALIGN_MASK) >> 4;

    pd.final_lev[proto_index] = new_level;
}

// src/dungeon.c:598 possible_places()
function possible_places(idx, map, pd) {
    const lev = pd.final_lev[idx];
    let i;

    /* init level possibilities */
    for (i = 0; i <= MAXLEVEL; i++)
        map[i] = false;

    /* get base and range and set those entries to true */
    const { count: rangeCount, adjusted_base: start } = level_range(
        lev.dlevel.dnum, pd.tmplevel[idx].lev.base,
        pd.tmplevel[idx].lev.rand, pd.tmplevel[idx].chain, pd);
    let count = rangeCount;
    for (i = start; i < start + count; i++)
        map[i] = true;

    /* mark off already placed levels */
    for (i = pd.start; i < idx; i++) {
        if (pd.final_lev[i] && map[pd.final_lev[i].dlevel.dlevel]) {
            map[pd.final_lev[i].dlevel.dlevel] = false;
            --count;
        }
    }

    return count;
}

// src/dungeon.c:632 pick_level() — the nth TRUE entry, scanning from 1.
function pick_level(map, nth) {
    for (let i = 1; i <= MAXLEVEL; i++)
        if (map[i] && !nth--)
            return i;
    throw new Error('pick_level: ran out of valid levels');
}

// src/dungeon.c:666 place_level()
//
// Recursive AND backtracking: it draws rn2(npossible), recurses, and on failure
// decrements npossible, clears that map slot, and draws again. The number of
// draws therefore depends on how much backtracking happens, not on how many
// levels exist. An implementation that finds a valid placement by any other
// search order consumes a different number of draws and desynchronises
// everything downstream.
function place_level(proto_index, pd) {
    const map = new Array(MAXLEVEL + 1).fill(false);
    let npossible;

    if (proto_index === pd.n_levs)
        return true; /* at end of proto levels */

    const lev = pd.final_lev[proto_index];

    /* No level created for this prototype, goto next. */
    if (!lev)
        return place_level(proto_index + 1, pd);

    npossible = possible_places(proto_index, map, pd);

    for (; npossible; --npossible) {
        lev.dlevel.dlevel = pick_level(map, rn2(npossible));
        if (place_level(proto_index + 1, pd))
            return true;
        map[lev.dlevel.dlevel] = false; /* this choice didn't work */
    }
    return false;
}

// src/dungeon.c:797 init_dungeon_levels() — build tmplevel[] for one dungeon.
// No draws here; the chance check happens later in init_level().
function init_dungeon_levels(entry, pd, dngidx) {
    const levels = entry.levels || [];

    levels.forEach((lv, f) => {
        const tmpl = {
            name: lv.name,
            chainlvl: lv.chainlevel ?? null,
            lev: { base: lv.base, rand: lv.range ?? 0 },
            chance: lv.chance ?? 100,
            rndlevs: lv.nlevels ?? 0,
            flags: get_dgn_flags(lv) | get_dgn_align(lv),
            boneschar: lv.bonetag ? lv.bonetag[0] : 0,
            chain: -1,
        };
        pd.tmplevel[pd.n_levs + f] = tmpl;

        if (tmpl.chainlvl) {
            for (let bi = 0; bi < pd.n_levs + f; bi++) {
                if (pd.tmplevel[bi].name === tmpl.chainlvl) {
                    tmpl.chain = bi;
                    break;
                }
            }
            if (tmpl.chain === -1)
                throw new Error(`Could not chain level ${tmpl.name} to ${tmpl.chainlvl}`);
        }
    });
    pd.n_levs += levels.length;
}

// src/dungeon.c:880 init_dungeon_branches() — build tmpbranch[]. No draws.
function init_dungeon_branches(entry, pd, dngidx) {
    const branches = entry.branches || [];
    const nbranches = branches.length;

    /* parent_dnum() walks this count to find which dungeon owns a branch */
    pd.tmpdungeon[dngidx].branches = nbranches;

    branches.forEach((br, f) => {
        const br_chain = br.chainlevel ?? null;
        const tmpb = {
            name: br.name,
            lev: { base: br.base, rand: br.range ?? 0 },
            type: BRTYPES[br.branchtype ?? 'stair'],
            up: BRDIRS[br.direction ?? 'down'],
            chain: -1,
        };
        pd.tmpbranch[pd.n_brs + f] = tmpb;

        if (br_chain) {
            /* note the bound: n_levs + f - 1, not + f. Preserved as written. */
            for (let bi = 0; bi < pd.n_levs + f - 1; bi++)
                if (pd.tmplevel[bi].name === br_chain) {
                    tmpb.chain = bi;
                    break;
                }
            if (tmpb.chain === -1)
                throw new Error(`Could not chain branch ${br.name} to level ${br_chain}`);
        }
    });
    pd.n_brs += nbranches;
}

// src/dungeon.c:429 find_branch() — tmpbranch index by dungeon name.
function find_branch(s, pd) {
    let i;
    for (i = 0; i < pd.n_brs; i++)
        if (pd.tmpbranch[i].name === s)
            break;
    if (i === pd.n_brs)
        throw new Error(`find_branch: can't find ${s}`);
    return i;
}

// src/dungeon.c:394 parent_dnum() — which dungeon owns the branch to `s`.
function parent_dnum(s, pd) {
    let i = find_branch(s, pd);
    for (let pdnum = 0; pd.tmpdungeon[pdnum].name !== s; pdnum++)
        if ((i -= pd.tmpdungeon[pdnum].branches) < 0)
            return pdnum;
    throw new Error("parent_dnum: couldn't resolve branch.");
}

// src/dungeon.c:414 parent_dlevel()
// Draws rn2(num), then walks forward looking for a level that has no branch on
// it yet. The walk consumes no further randomness, but which level it lands on
// depends on the branches already inserted — so insert_branch() must have run
// for every earlier dungeon.
function parent_dlevel(s, pd) {
    const dnum = parent_dnum(s, pd);
    let i = find_branch(s, pd);
    const { count: num, adjusted_base: base } = level_range(
        dnum, pd.tmpbranch[i].lev.base, pd.tmpbranch[i].lev.rand,
        pd.tmpbranch[i].chain, pd);

    /* KMH -- Try our best to find a level without an existing branch */
    let j;
    i = j = rn2(num);
    let curr;
    do {
        if (++i >= num)
            i = 0;
        curr = null;
        for (const br of game.branches) {
            if ((br.end1.dnum === dnum && br.end1.dlevel === base + i)
                || (br.end2.dnum === dnum && br.end2.dlevel === base + i)) {
                curr = br;
                break;
            }
        }
    } while (curr && i !== j);
    return (base + i);
}

// src/dungeon.c:438 correct_branch_type()
function correct_branch_type(tbr) {
    switch (tbr.type) {
    case TBR_STAIR:   return BR_STAIR;
    case TBR_NO_UP:   return tbr.up ? BR_NO_END1 : BR_NO_END2;
    case TBR_NO_DOWN: return tbr.up ? BR_NO_END2 : BR_NO_END1;
    case TBR_PORTAL:  return BR_PORTAL;
    }
    throw new Error('correct_branch_type: unknown branch type');
}

// src/dungeon.c:460 insert_branch() — the list is ordered by end1 dungeon and
// level, then end2. Order does not affect parent_dlevel's search (it only asks
// whether *any* branch sits on a level), but keep it faithful for later use.
function insert_branch(new_branch) {
    const val = (b) => ((b.end1.dnum * MAXLEVEL + b.end1.dlevel) * (MAXDUNGEON * MAXLEVEL)
                      + (b.end2.dnum * MAXLEVEL + b.end2.dlevel));
    const nv = val(new_branch);
    let idx = game.branches.findIndex(b => val(b) > nv);
    if (idx < 0) idx = game.branches.length;
    game.branches.splice(idx, 0, new_branch);
}

// src/dungeon.c:? add_branch()
function add_branch(dgn, child_entry_level, pd) {
    const branch_num = find_branch(game.dungeons[dgn].dname, pd);
    const new_branch = {
        id: game.branch_id++,
        type: correct_branch_type(pd.tmpbranch[branch_num]),
        end1: {
            dnum: parent_dnum(game.dungeons[dgn].dname, pd),
            dlevel: parent_dlevel(game.dungeons[dgn].dname, pd),
        },
        end2: { dnum: dgn, dlevel: child_entry_level },
        end1_up: !!pd.tmpbranch[branch_num].up,
    };
    insert_branch(new_branch);
    return new_branch;
}

// src/dungeon.c depth() — absolute depth of a d_level.
export function depth(dlev) {
    return game.dungeons[dlev.dnum].depth_start + dlev.dlevel - 1;
}

// src/dungeon.c:933 init_dungeon_set_entry()
function init_dungeon_set_entry(pd, dngidx) {
    const dgn_entry = pd.tmpdungeon[dngidx].entry_lev;
    const dgn = game.dungeons[dngidx];
    /*
     * < 0  from bottom (-1 == bottom level)
     *   0  default (top)
     * > 0  actual level (1 = top)
     */
    if (dgn_entry < 0) {
        dgn.entry_lev = dgn.num_dunlevs + dgn_entry + 1;
        if (dgn.entry_lev <= 0)
            dgn.entry_lev = 1;
    } else if (dgn_entry > 0) {
        dgn.entry_lev = dgn_entry;
        if (dgn.entry_lev > dgn.num_dunlevs)
            dgn.entry_lev = dgn.num_dunlevs;
    } else { /* default */
        dgn.entry_lev = 1; /* defaults to top level */
    }
}

// src/dungeon.c:960 init_dungeon_set_depth() — this is what reaches
// parent_dlevel, and therefore what draws.
function init_dungeon_set_depth(pd, dngidx) {
    const dgn = game.dungeons[dngidx];
    const br = add_branch(dngidx, dgn.entry_lev, pd);

    /* Get the depth of the connecting end. */
    let from_depth, from_up;
    if (br.end1.dnum === dngidx) {
        from_depth = depth(br.end2);
        from_up = !br.end1_up;
    } else {
        from_depth = depth(br.end1);
        from_up = br.end1_up;
    }

    dgn.depth_start = from_depth
        + (br.type === BR_PORTAL ? 0 : (from_up ? -1 : 1))
        - (dgn.entry_lev - 1);
}

// src/dungeon.c:998 init_dungeon_dungeons()
// Returns false when the dungeon is skipped by its chance roll, which is what
// stops the driver's `i` from advancing.
function init_dungeon_dungeons(entry, pd, dngidx) {
    const dgn_name = entry.name;
    const dgn_bonetag = entry.bonetag ?? '';
    const dgn_protoname = entry.protofile ?? '';
    const dgn_base = entry.base;
    const dgn_range = entry.range ?? 0;
    const dgn_align = get_dgn_align(entry);
    const dgn_entry = entry.entry ?? 0;
    const dgn_chance = entry.chance ?? 100;
    const dgn_flags = get_dgn_flags(entry);
    const dgn_fill = entry.lvlfill ?? '';
    const dgn_themerms = entry.themerooms ?? '';

    if (!isWizard() && dgn_chance && (dgn_chance <= rn2(100))) {
        game.n_dgns--;
        return false;
    }

    pd.tmpdungeon[dngidx] = {
        name: dgn_name,
        protoname: dgn_protoname,
        boneschar: dgn_bonetag ? dgn_bonetag[0] : 0,
        lev: { base: dgn_base, rand: dgn_range },
        flags: dgn_flags,
        align: dgn_align,
        chance: dgn_chance,
        entry_lev: dgn_entry,
        branches: 0,
    };

    /* levels begin */
    init_dungeon_levels(entry, pd, dngidx);
    /* levels end */

    /* branches begin */
    init_dungeon_branches(entry, pd, dngidx);
    /* branches end */

    const dgn = game.dungeons[dngidx] = {
        dname: dgn_name,
        proto: dgn_protoname,
        fill_lvl: dgn_fill,
        themerms: dgn_themerms,
        boneid: dgn_bonetag ? dgn_bonetag[0] : 0,
        flags: {
            hellish: !!(dgn_flags & HELLISH),
            maze_like: !!(dgn_flags & MAZELIKE),
        },
    };

    if (dgn_range)
        dgn.num_dunlevs = rn1(dgn_range, dgn_base);
    else
        dgn.num_dunlevs = dgn_base;

    if (!dngidx) {
        dgn.ledger_start = 0;
        dgn.depth_start = 1;
        dgn.dunlev_ureached = 1;
    } else {
        dgn.ledger_start = game.dungeons[dngidx - 1].ledger_start
                         + game.dungeons[dngidx - 1].num_dunlevs;
        dgn.dunlev_ureached = 0;
    }

    dgn.flags.rogue_like = !!(dgn_flags & ROGUELIKE);
    dgn.flags.align = dgn_align;
    dgn.flags.unconnected = !!(dgn_flags & UNCONNECTED);

    init_dungeon_set_entry(pd, dngidx);

    if (dgn.flags.unconnected) {
        dgn.depth_start = 1;
    } else if (dngidx) { /* set depth */
        init_dungeon_set_depth(pd, dngidx);
    }

    if (dgn.num_dunlevs > MAXLEVEL)
        dgn.num_dunlevs = MAXLEVEL;

    return true;
}

// src/dungeon.c:1110 init_castle_tune() — the Castle drawbridge tune.
// Five rn2(7) draws at the very end of init_dungeons(); easy to miss because
// it sits after the per-dungeon loop.
function init_castle_tune() {
    const tune = [];
    for (let i = 0; i < 5; i++)
        tune[i] = String.fromCharCode('A'.charCodeAt(0) + rn2(7));
    game.castle_tune = tune.join('');
}

// src/dungeon.c:1204 init_dungeons()
export function init_dungeons() {
    const pd = {
        tmpdungeon: [], tmplevel: [], tmpbranch: [],
        final_lev: [],
        start: 0, n_levs: 0, n_brs: 0,
    };

    game.dungeons = [];
    game.sp_levchn = [];
    game.branches = [];
    game.branch_id = 0;
    game.n_dgns = DUNGEON_DATA.length;

    if (game.n_dgns >= MAXDUNGEON)
        throw new Error('init_dungeons: too many dungeons');

    let i = 0, cl = 0;
    for (const entry of DUNGEON_DATA) {
        if (init_dungeon_dungeons(entry, pd, i)) {
            for (; cl < pd.n_levs; cl++) {
                init_level(i, cl, pd);
            }
            /*
             * Recursively place the generated levels for this dungeon. This
             * routine will attempt all possible combinations before giving up.
             */
            if (!place_level(pd.start, pd))
                throw new Error("init_dungeon: couldn't place levels");

            for (; pd.start < pd.n_levs; pd.start++)
                if (pd.final_lev[pd.start])
                    add_level(pd.final_lev[pd.start]);
            i++;
        }
    }

    init_castle_tune();

    game.proto_dungeon = pd;
    return pd;
}

// src/dungeon.c:540 add_level() — insert into the special-level chain in level
// order within a dungeon. find_level() depends on this ordering later.
function add_level(new_lev) {
    let idx = game.sp_levchn.findIndex(
        curr => curr.dlevel.dnum === new_lev.dlevel.dnum
             && curr.dlevel.dlevel > new_lev.dlevel.dlevel);
    if (idx < 0) idx = game.sp_levchn.length;
    game.sp_levchn.splice(idx, 0, new_lev);
}

export {
    level_range, init_level, possible_places, pick_level, place_level,
    init_dungeon_dungeons,
};
