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
import { In_endgame, Is_earthlevel, ROOM, CORR, ICE, SDOOR, ALTAR, GRAVE, TREE, THRONE,
         FOUNTAIN, SINK, IRONBARS, DRAWBRIDGE_DOWN, DRAWBRIDGE_UP, IS_WALL,
         IS_DOOR, M_AP_TYPE, M_AP_FURNITURE } from './const.js';
import { is_pool, is_lava, m_at } from './mon.js';
import { db_under_typ } from './dbridge.js';
import { cmap_to_type } from './mkroom.js';
import { canseemon } from './display.js';
import { rn2, rn1 } from './rng.js';
import { A_NONE, AM_NONE, A_LAWFUL, AM_LAWFUL, PICK_ONE,
         MENU_BEHAVE_STANDARD } from './const.js';
import { dungeon as DUNGEON_DATA } from './dungeon_data.js';
import { roles } from './role_data.js';
import { tty_create_nhwindow, tty_start_menu, tty_add_menu, tty_end_menu,
         tty_select_menu, tty_destroy_nhwindow, tty_putstr, NHW_MENU,
         ATR_NONE, ATR_INVERSE } from './tty/wintty.js';
import { NO_COLOR } from './terminal.js';
import { MENU_ITEMFLAGS_NONE } from './const.js';
import { makeplural } from './objnam.js';

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
export function insert_branch(new_branch, extract_first) {
    if (extract_first) {
        const i = game.branches.indexOf(new_branch);
        if (i >= 0)
            game.branches.splice(i, 1);
    }
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
    /* src/dungeon.c:1092 assigns dgn_align (the D_ALIGN_* value, which is
       AM_* << 4) into d_flags.align, a THREE-BIT bitfield — so 0x10/0x20/
       0x40 all truncate to 0 and every dungeon's align flag ends up unset.
       Faithful bug: induced_align()'s dungeon gate never fires. Only the
       s_level path (dungeon.c:588) shifts the value down before storing. */
    dgn.flags.align = dgn_align & 7;
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

    /* src/dungeon.c:1132-1160 — resolve the named special levels so callers can
       test `on_level(&u.uz, &oracle_level)` the way C does. */
    game.special_levels = {};
    for (const [name, key] of LEVEL_MAP) {
        const x = find_level(name);
        if (x) {
            game.special_levels[key] = { ...x.dlevel };
            /* C's file-scope d_level globals (astral_level, water_level,
               valley_level, ...): In_endgame/Is_waterlevel and friends read
               game.<key> directly, which stayed undefined and made every
               such test false — level_tele never conjured the endgame
               Amulet, the status line never named a Plane. */
            game[key] = game.special_levels[key];
            /* src/dungeon.c:1136 — the quest levels' proto names get the
               role's filecode: "x-strt" becomes "Bar-strt". C reads
               gu.urole, set by role_init(); this port assigns game.urole
               only later (and jsmain seeds a stub without filecode), so
               read the same roles[] record it will copy. */
            if (name.startsWith('x-')) {
                const filecode = roles[game.flags.initrole]?.filecode
                                 ?? game.urole?.filecode;
                x.proto = `${filecode}${name.slice(1)}`;
            }
        }
    }
    game.oracle_level = game.special_levels.oracle_level ?? null;

    /* src/dungeon.c:1142-1157 — kludge to allow floating Knox entrance. A
       floating entrance is specified by giving end1 the bogus dnum n_dgns;
       the real end1 is filled in when a vault portal places the branch. */
    const knox = game.special_levels.knox_level;
    if (knox) {
        const idx = (game.branches || []).findIndex(
            (b) => b.end2.dnum === knox.dnum && b.end2.dlevel === knox.dlevel);
        if (idx >= 0) {
            const br = game.branches.splice(idx, 1)[0];
            br.end1.dnum = game.dungeons.length; /* n_dgns */
            insert_branch(br);
        }
    }

    /* src/dungeon.c:1164-1168 — "I hate hardwiring these names. :-(" */
    game.quest_dnum = dname_to_dnum('The Quest');
    game.sokoban_dnum = dname_to_dnum('Sokoban');
    game.mines_dnum = dname_to_dnum('The Gnomish Mines');
    game.tower_dnum = dname_to_dnum("Vlad's Tower");
    game.tutorial_dnum = dname_to_dnum('The Tutorial');

    /* src/dungeon.c:1171 — one special fixup for the dummy surface level:
       the whole reason for having it is to make the Plane of Earth sit at
       depth -1 instead of 0, so shift the endgame dungeon up one. Without
       this the ^V overview lists the Planes one level too deep. */
    {
        const x = find_level('dummy');
        if (x) {
            const i = x.dlevel.dnum;
            const dgn = game.dungeons[i];
            if (dgn.num_dunlevs > 1 - dgn.depth_start)
                dgn.depth_start -= 1;
        }
    }

    init_castle_tune();

    game.proto_dungeon = pd;
    return pd;
}

// src/dungeon.c:707 level_map[] — special level name to its d_level global.
const LEVEL_MAP = [
    ['air', 'air_level'], ['asmodeus', 'asmodeus_level'],
    ['astral', 'astral_level'], ['baalz', 'baalzebub_level'],
    ['bigrm', 'bigroom_level'], ['castle', 'stronghold_level'],
    ['earth', 'earth_level'], ['fakewiz1', 'portal_level'],
    ['fire', 'fire_level'], ['juiblex', 'juiblex_level'],
    ['knox', 'knox_level'], ['medusa', 'medusa_level'],
    ['oracle', 'oracle_level'], ['orcus', 'orcus_level'],
    ['rogue', 'rogue_level'], ['sanctum', 'sanctum_level'],
    ['valley', 'valley_level'], ['water', 'water_level'],
    ['wizard1', 'wiz1_level'], ['wizard2', 'wiz2_level'],
    ['wizard3', 'wiz3_level'], ['minend', 'mineend_level'],
    ['soko1', 'sokoend_level'],
    /* dungeon.c:12-14 X_START/X_LOCATE/X_GOAL — the quest's three levels */
    ['x-strt', 'qstart_level'], ['x-loca', 'qlocate_level'],
    ['x-goal', 'nemesis_level'],
];

// src/dungeon.c Is_special() — the s_level entry for this level, or null.
export function Is_special(lev) {
    return game.sp_levchn.find(
        (l) => l.dlevel && l.dlevel.dnum === lev.dnum
               && l.dlevel.dlevel === lev.dlevel) ?? null;
}

// src/dungeon.c:566 find_level() — locate a special level by its proto name.
export function find_level(nam) {
    return game.sp_levchn.find(
        lev => (lev.proto ?? lev.name ?? '').toLowerCase() === nam.toLowerCase())
        ?? null;
}

// src/dungeon.c:596 dname_to_dnum()
function dname_to_dnum(nam) {
    const i = game.dungeons.findIndex(d => d.dname === nam);
    if (i < 0)
        throw new Error(`dname_to_dnum: unknown dungeon "${nam}"`);
    return i;
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

// src/dungeon.c Can_dig_down() — whether the floor here gives way.
export function Can_dig_down(lev) {
    return !game.level?.flags?.hardfloor
        && !Is_botlevel(lev)
        && !Invocation_lev(lev);
}

// src/dungeon.c Can_fall_thru()
export function Can_fall_thru(lev) {
    return Can_dig_down(lev) || Is_stronghold(lev);
}

// include/dungeon.h:126 Is_botlevel(x) — the bottom level of its dungeon.
function Is_botlevel(lev) {
    return lev && game.dungeons?.[lev.dnum]
        && lev.dlevel === game.dungeons[lev.dnum].num_dunlevs;
}

// include/dungeon.h Invocation_lev(x) / Is_stronghold(x) — both name levels
// that only exist deep in Gehennom, so neither is reachable at the depths any
// public session gets to.
function Invocation_lev(lev) {
    return !!(game.inv_pos && lev && lev.dnum === game.inv_pos.dnum
              && lev.dlevel === game.inv_pos.dlevel);
}
function Is_stronghold(lev) {
    return !!(game.stronghold_level && lev
              && lev.dnum === game.stronghold_level.dnum
              && lev.dlevel === game.stronghold_level.dlevel);
}

// include/dungeon.h:139 In_sokoban()
export function In_sokoban(lev) {
    return lev.dnum === game.sokoban_dnum;
}

// src/dungeon.c:1690 has_ceiling() — false only in the endgame planes other
// than the Plane of Earth.
export function has_ceiling(lev) {
    if (In_endgame(lev) && !Is_earthlevel(lev))
        return false;
    return true;
}

// src/dungeon.c get_level() — turn a LOGICAL depth into a d_level.
//
// The player thinks in absolute depths ("level 12"); a d_level is a dungeon
// number plus a level within it. Below the current dungeon's start this walks
// UP the branch tree until it finds the dungeon that contains the depth, and
// past the end of the dungeon it clamps to the last level rather than failing.
export function get_level(newlevel, levnum) {
    let dgn = game.u.uz.dnum;
    const dungeons = game.dungeons;

    if (levnum <= 0) {
        /* can only currently happen in the endgame */
        levnum = game.u.uz.dlevel;
    } else if (levnum > (dungeons[dgn].depth_start
                         + dungeons[dgn].num_dunlevs - 1)) {
        /* beyond the end of the dungeon, jump to the last level */
        levnum = dungeons[dgn].num_dunlevs;
    } else {
        if (levnum < dungeons[dgn].depth_start) {
            do {
                /* find the parent dungeon; end2 is always the child */
                const br = (game.branches || []).find((b) => b.end2.dnum === dgn);
                if (!br)
                    throw new Error('get_level: can\'t find parent dungeon');
                dgn = br.end1.dnum;
            } while (levnum < dungeons[dgn].depth_start);
        }
        /* now within the same dungeon; calculate the level */
        levnum = levnum - dungeons[dgn].depth_start + 1;
    }

    newlevel.dnum = dgn;
    newlevel.dlevel = levnum;
}

// src/dungeon.c:1948 find_hell() -- the Valley is Gehennom's gateway.
export function find_hell(lev) {
    lev.dnum = game.valley_level.dnum;
    lev.dlevel = 1;
}

// src/dungeon.c:1325 dunlev() — how deep inside its own dungeon branch.
export function dunlev(lev) {
    return lev.dlevel;
}

// src/dungeon.c dunlevs_in_dungeon()
export function dunlevs_in_dungeon(lev) {
    return game.dungeons[lev.dnum].num_dunlevs;
}

// src/dungeon.c:2012 induced_align() — the alignment a monster gets when the
// level, rather than the species, decides.
//
// Three chances in order: the special level's own alignment, then the
// dungeon's, each gated on rn2(100) < pct, and failing both a flat
// rn2(3) - 1. create_monster() calls it for every des.monster() that did not
// name an alignment, which is most of them, so the draw is not rare.
export function induced_align(pct) {
    const lev = Is_special(game.u.uz);

    if (lev && lev.flags?.align)
        if (rn2(100) < pct)
            return lev.flags.align;

    if (game.dungeons[game.u.uz.dnum]?.flags?.align)
        if (rn2(100) < pct)
            return game.dungeons[game.u.uz.dnum].flags.align;

    const al = rn2(3) - 1;
    return Align2amask(al);
}

// include/align.h:50 Align2amask() — A_NONE and A_LAWFUL are special-cased
// rather than falling out of the +2, so the mapping is not a plain shift.
const Align2amask = (x) => (x === A_NONE) ? AM_NONE
                         : (x === A_LAWFUL) ? AM_LAWFUL
                         : ((x) + 2);

// src/dungeon.c:1477 builds_up() — the branch is entered from below.
export function builds_up(lev) {
    const dptr = game.dungeons[lev.dnum];
    if (dptr.num_dunlevs > 1)
        return dptr.entry_lev === dptr.num_dunlevs;
    /* single-level branch: does its connection build up from the parent? */
    for (const br of (game.branches || []))
        if (br.end2.dnum === lev.dnum && br.end2.dlevel === lev.dlevel)
            return !!br.end1_up;
    return false;
}

// src/dungeon.c:2027 level_difficulty() — never negative even on the
// Elemental Planes: the endgame reads as sanctum depth plus half the hero's
// level, and a builds-up branch counts the climb beyond its entrance.
export function level_difficulty() {
    let res;

    if (In_endgame(game.u.uz)) {
        const sanctum = game.special_levels?.sanctum_level;
        res = (sanctum ? depth(sanctum) : 0) + ((game.u.ulevel / 2) | 0);
    } else if (game.u.uhave?.amulet) {
        /* deepest_lev_reached() needs the per-dungeon reached tracking */
        note_unported_dungeon('level_difficulty:deepest_lev_reached');
        res = depth(game.u.uz);
    } else {
        res = depth(game.u.uz);
        if (builds_up(game.u.uz))
            res += 2 * (game.dungeons[game.u.uz.dnum].entry_lev
                        - game.u.uz.dlevel + 1);
    }
    /* ring of aggravate monster */
    if (game.u.uprops?.AGGRAVATE_MONSTER)
        res = res > 25 ? 50 : res * 2;
    return res;
}

// src/dungeon.c:1605 u_on_rndspot() — place the hero at a random location
// within the arrival region; an unspecified region (lx == 0) defaults to
// the entire level. The W-tower arm needs its exclusion region and is
// recorded.
export async function u_on_rndspot(upflag) {
    const up = (upflag & 1), was_in_W_tower = (upflag & 2);
    const { place_lregion, LR_UPTELE, LR_DOWNTELE } =
        await import('./mkmaze.js');

    if (was_in_W_tower) {
        note_unported_dungeon('u_on_rndspot:W_tower');
    } else if (up) {
        const r = game.updest || {};
        place_lregion(r.lx | 0, r.ly | 0, r.hx | 0, r.hy | 0,
                      r.nlx | 0, r.nly | 0, r.nhx | 0, r.nhy | 0,
                      LR_UPTELE, null);
    } else {
        const r = game.dndest || {};
        place_lregion(r.lx | 0, r.ly | 0, r.hx | 0, r.hy | 0,
                      r.nlx | 0, r.nly | 0, r.nhx | 0, r.nhy | 0,
                      LR_DOWNTELE, null);
    }
    /* switch_terrain() — levitation/flight state versus the new square;
       nothing a fresh arrival needs yet */
}

// src/dungeon.c:2175 unplaced_floater() — Fort Ludios when its branch has
// not been placed (end1 in the pseudo-dungeon n_dgns).
function unplaced_floater(idx) {
    if (idx !== (game.special_levels?.knox_level?.dnum ?? -1))
        return false;
    for (const br of (game.branches || []))
        if (br.end1.dnum === game.dungeons.length && br.end2.dnum === idx)
            return true;
    return false;
}

// src/dungeon.c:2190 unreachable_level()
function unreachable_level(lvl_p, unplaced) {
    if (unplaced)
        return true;
    if (In_endgame(game.u.uz) && !In_endgame(lvl_p))
        return true;
    const dummy = find_level('dummy');
    if (dummy && lvl_p.dnum === dummy.dlevel.dnum
        && lvl_p.dlevel === dummy.dlevel.dlevel)
        return true;
    return false;
}

// src/dungeon.c:2204 tport_menu() — add one selectable destination. An
// unreachable one still consumes the next menu letter; it just cannot be
// picked, and gets four spaces where "%c - " would go.
function tport_menu(win, entry, lchoices, lvl_p, cannotreach) {
    lchoices.lev[lchoices.idx] = lvl_p.dlevel;
    lchoices.dgn[lchoices.idx] = lvl_p.dnum;
    lchoices.playerlev[lchoices.idx] = depth(lvl_p);
    let identifier = 0;
    if (cannotreach) {
        /* not selectable, but still consumes next menuletter */
        entry = `    ${entry}`;
    } else {
        identifier = lchoices.idx + 1;
    }
    tty_add_menu(win, null, identifier, lchoices.menuletter, 0,
                 ATR_NONE, NO_COLOR, entry, MENU_ITEMFLAGS_NONE);
    /* this assumes there are at most 52 interesting levels */
    if (lchoices.menuletter === 'z')
        lchoices.menuletter = 'A';
    else
        lchoices.menuletter = String.fromCharCode(
            lchoices.menuletter.charCodeAt(0) + 1);
    lchoices.idx++;
}

// src/dungeon.c:2240 br_string()
function br_string(type) {
    switch (type) {
    case BR_PORTAL:
        return 'Portal';
    case BR_NO_END1:
        return 'Connection';
    case BR_NO_END2:
        return 'One way stair';
    case BR_STAIR:
        return 'Stair';
    }
    return ' (unknown)';
}

// src/dungeon.c:2256 chr_u_on_lvl() — '*' marks the hero's current level.
function chr_u_on_lvl(dlev) {
    return (game.u.uz.dnum === dlev.dnum && game.u.uz.dlevel === dlev.dlevel)
           ? '*' : ' ';
}

// src/dungeon.c:2263 print_branch() — print all branches out of dungeon
// dnum with entry level in (lower_bound, upper_bound].
function print_branch(win, dnum, lower_bound, upper_bound, bymenu, lchoices) {
    /* This assumes that end1 is the "parent". */
    for (const br of (game.branches || [])) {
        if (br.end1.dnum === dnum && lower_bound < br.end1.dlevel
            && br.end1.dlevel <= upper_bound) {
            const buf = `${bymenu ? chr_u_on_lvl(br.end1) : ' '} ${
                br_string(br.type)} to ${
                game.dungeons[br.end2.dnum].dname}: ${depth(br.end1)}`;
            if (bymenu)
                tport_menu(win, buf, lchoices, br.end1,
                           unreachable_level(br.end1, false));
            else
                tty_putstr(win, 0, buf);
        }
    }
}

// src/dungeon.c:2290 print_dungeon() — the wizard-mode dungeon overview.
// Only the bymenu form (the ^V '?' destination menu) is ported; the plain
// listing arm is reached from #wizwhere and is recorded.
//
// Returns the picked destination's player-visible depth (0 if cancelled)
// and fills out.lev / out.dnum with the d_level.
export async function print_dungeon(bymenu, out) {
    const lchoices = { idx: 0, menuletter: 'a', lev: [], dgn: [],
                       playerlev: [] };
    const win = tty_create_nhwindow(NHW_MENU);

    if (!bymenu) {
        note_unported_dungeon('print_dungeon:listing');
        tty_destroy_nhwindow(win);
        return 0;
    }
    tty_start_menu(win, MENU_BEHAVE_STANDARD);

    for (let i = 0; i < game.dungeons.length; i++) {
        const dptr = game.dungeons[i];
        if (In_endgame(game.u.uz)
            && i !== (game.special_levels?.astral_level?.dnum ?? -1))
            continue;
        const unplaced = unplaced_floater(i);
        const descr = unplaced ? 'depth' : 'level';
        const nlev = dptr.num_dunlevs;
        let buf;
        if (nlev > 1)
            buf = `${dptr.dname}: ${makeplural(descr)} ${dptr.depth_start
                  } to ${dptr.depth_start + nlev - 1}`;
        else
            buf = `${dptr.dname}: ${descr} ${dptr.depth_start}`;

        /* Most entrances are uninteresting. */
        if (dptr.entry_lev !== 1) {
            if (dptr.entry_lev === nlev)
                buf += ', entrance from below';
            else
                buf += `, entrance on ${dptr.depth_start + dptr.entry_lev - 1}`;
        }
        /* add_menu_heading() */
        tty_add_menu(win, null, 0, 0, 0, ATR_INVERSE, NO_COLOR, buf,
                     MENU_ITEMFLAGS_NONE);

        /*
         * Circle through the special levels to find levels that are in
         * this dungeon.
         */
        let last_level = 0;
        for (const slev of (game.sp_levchn || [])) {
            if (slev.dlevel.dnum !== i)
                continue;

            /* print any branches before this level */
            print_branch(win, i, last_level, slev.dlevel.dlevel, bymenu,
                         lchoices);

            let sbuf = `${chr_u_on_lvl(slev.dlevel)} ${slev.proto}: ${
                depth(slev.dlevel)}`;
            const stronghold = game.special_levels?.stronghold_level;
            if (stronghold && slev.dlevel.dnum === stronghold.dnum
                && slev.dlevel.dlevel === stronghold.dlevel)
                sbuf += ` (tune ${game.castle_tune})`;
            tport_menu(win, sbuf, lchoices, slev.dlevel,
                       unreachable_level(slev.dlevel, unplaced));

            last_level = slev.dlevel.dlevel;
        }
        /* print branches after the last special level */
        print_branch(win, i, last_level, MAXLEVEL, bymenu, lchoices);
    }

    tty_end_menu(win, 'Level teleport to where:');
    const picks = await tty_select_menu(win, PICK_ONE);
    tty_destroy_nhwindow(win);
    if (picks.length > 0) {
        const idx = picks[0] - 1;
        if (out) {
            out.lev = lchoices.lev[idx];
            out.dnum = lchoices.dgn[idx];
            return lchoices.playerlev[idx];
        }
    }
    return 0;
}

function note_unported_dungeon(what) {
    (game.unported ||= new Set()).add(what);
}

// src/dungeon.c:1750 surface() — what the hero is standing on, for messages.
//
// Only the arms a normal dungeon floor reaches are live: pools, ice, lava,
// altars and the swallowed/air cases are recorded when hit.
export function surface(x, y) {
    const lev = game.level?.at(x, y);
    if (!lev)
        return 'floor';
    const levtyp = lev.typ;
    /* src/dungeon.c:1750 — the engulfed maw/husk arm and the air levels
       are unreachable states here so far */
    if (game.u?.uswallow && game.u.ux === x && game.u.uy === y)
        return 'maw';
    if (is_pool(x, y))
        return game.u?.uinwater ? 'bottom' : 'water';
    if (levtyp === ICE)
        return 'ice';
    if (is_lava(x, y))
        return 'lava';
    if (levtyp === DRAWBRIDGE_DOWN)
        return 'bridge';
    if (levtyp === ALTAR)
        return 'altar';
    if (levtyp === GRAVE)
        return 'headstone';
    if (levtyp === FOUNTAIN)
        return 'fountain';
    if (stairway_at_fn && stairway_at_fn(x, y))
        return 'stairs';
    if (IS_WALL(levtyp) || levtyp === SDOOR)
        return 'wall'; /* 'surface' during Passes_walls */
    if (IS_DOOR(levtyp))
        return 'doorway'; /* even for closed door */
    if (levtyp === ROOM || levtyp === CORR || levtyp === ICE)
        return 'floor';
    return 'ground';
}

/* js/do.js stairway_at, wired to break the import cycle */
var stairway_at_fn = null;
export function dungeon_wire_stairway_at(fn) { stairway_at_fn = fn; }


/* ==== mapseen — the #overview database (src/dungeon.c:2755+) ==== */

// src/dungeon.c:3410 endgamelevelname() — the name of an endgame level by
// its (negative) depth; topten.c does something similar.
export function endgamelevelname(indx) {
    let planename = null;
    switch (indx) {
    case -5: return 'Astral Plane';
    case -4: planename = 'Water'; break;
    case -3: planename = 'Fire'; break;
    case -2: planename = 'Air'; break;
    case -1: planename = 'Earth'; break;
    default: break;
    }
    return planename ? `Plane of ${planename}` : `unknown plane #${indx}`;
}

// src/dungeon.c:2927 update_lastseentyp() — the terrain type the hero last
// saw at x,y. C calls this from map_background() and _map_location() on
// every mapping, so it stays current for any square being displayed from
// sight; the terrain view (#terrain) and mapseen recalcs read it back.
export function update_lastseentyp(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return;
    let ltyp = loc.typ;

    if (ltyp === DRAWBRIDGE_UP)
        ltyp = db_under_typ(loc.drawbridgemask ?? 0);
    const mtmp = m_at(x, y);
    if (mtmp && M_AP_TYPE(mtmp) === M_AP_FURNITURE && canseemon(mtmp))
        ltyp = cmap_to_type(mtmp.mappearance);
    loc.lastseentyp = ltyp;
}

// src/dungeon.c:2831 init_mapseen() — start a mapseen entry for a level.
export function init_mapseen(uz) {
    const key = `${uz.dnum}:${uz.dlevel}`;
    (game.mapseen ||= {});
    if (!game.mapseen[key])
        game.mapseen[key] = { dnum: uz.dnum, dlevel: uz.dlevel, feat: {} };
}

// src/dungeon.c:3050 recalc_mapseen() — recount the current level's seen
// features. C gates each square on lastseentyp (the hero must have SEEN it).
export function recalc_mapseen() {
    const uz = game.u?.uz;
    if (!uz || !game.level)
        return;
    init_mapseen(uz);
    const m = game.mapseen[`${uz.dnum}:${uz.dlevel}`];
    const feat = { nfount: 0, nsink: 0, naltar: 0, nthrone: 0,
                   ngrave: 0, ntree: 0, nshop: 0, ntemple: 0 };
    for (let x = 1; x < 80; x++)
        for (let y = 0; y < 21; y++) {
            const loc = game.level.at(x, y);
            if (!loc || !loc.seenv)
                continue;
            switch (loc.typ) {
            case FOUNTAIN: feat.nfount++; break;
            case SINK: feat.nsink++; break;
            case ALTAR: feat.naltar++; break;
            case THRONE: feat.nthrone++; break;
            case GRAVE: feat.ngrave++; break;
            case TREE: feat.ntree++; break;
            default: break;
            }
        }
    m.feat = feat;
    m.custom = game.level_annotations?.[`${uz.dnum}:${uz.dlevel}`] ?? null;
}

// src/dungeon.c:3368 seen_string() — "players are computer scientists:
// 0, 1, 2, n"
function seen_string(x, obj) {
    switch (x) {
    case 0: return 'no';
    case 1: return 'aeiou'.includes(obj[0]) ? 'an' : 'a';
    case 2: return 'some';
    case 3: return 'many';
    }
    return 'many';
}

// src/dungeon.c:3339 show_overview() + :3516 print_mapseen — the ^O/#overview
// window. Only the branch-annotation and endgame arms are unported.
const ESCAPED_HOW = 14; /* include/hack.h:497 ESCAPED */
export async function show_overview(why, reason) {
    /* why: 0 normal #overview, -1 'm' prefix, 1 final (lived), 2 final
       (died); reason: how the game ended, for the resting-place line */
    why = why | 0;
    recalc_mapseen();
    const {
        tty_create_nhwindow, tty_destroy_nhwindow, tty_start_menu,
        tty_add_menu, tty_end_menu, tty_select_menu, NHW_MENU,
    } = await import('./tty/wintty.js');
    const { NO_COLOR } = await import('./terminal.js');
    const TAB = '   ', PREFIX = '      ';
    const plur = (n) => (n === 1 ? '' : 's');

    const win = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(win, 0);
    const entries = Object.values(game.mapseen || {})
        .sort((a, b) => (a.dnum - b.dnum) || (a.dlevel - b.dlevel));
    let lastdnum = -1;
    for (const m of entries) {
        if (m.dnum !== lastdnum) {
            lastdnum = m.dnum;
            /* the dungeon-name line is an add_menu_heading: ATR_INVERSE,
               except that src/windows.c:1822 suppresses the highlight
               during end-of-game disclosure */
            const hattr = game.program_state_gameover ? 0
                          : 7 /* NH ATR_INVERSE */;
            const dptr = game.dungeons[m.dnum];
            let dname = `${dptr.dname}:`;
            if ((dptr.dunlev_ureached ?? 0) !== dptr.entry_lev
                && !In_endgame(m)) {
                const knoxdnum = game.special_levels?.knox_level?.dnum
                              ?? game.knox_level?.dnum;
                const depthstart = (m.dnum === game.quest_dnum
                                    || m.dnum === knoxdnum)
                    ? 1 : dptr.depth_start;
                const reached = depthstart + dptr.dunlev_ureached - 1;
                dname = builds_up(m)
                    ? `${dptr.dname}: levels ${depthstart + dptr.entry_lev - 1} up to ${reached}`
                    : `${dptr.dname}: levels ${depthstart} to ${reached}`;
            }
            tty_add_menu(win, null, 0, 0, 0, hattr, NO_COLOR,
                         dname, 0);
        }
        const dep = game.dungeons[m.dnum].depth_start + m.dlevel - 1;
        let buf = `${TAB}Level ${dep}:`;
        if (game.wizard) {
            const slev = Is_special({ dnum: m.dnum, dlevel: m.dlevel });
            if (slev)
                buf += ` [${slev.proto}]`;
        }
        if (m.custom)
            buf += ` "${m.custom}"`;
        const died_here = (why > 0 && game.u.uz.dnum === m.dnum
                           && game.u.uz.dlevel === m.dlevel);
        if (game.u.uz.dnum === m.dnum && game.u.uz.dlevel === m.dlevel)
            buf += ` <- You ${why <= 0 ? 'are'
                : (why === 1 && reason === ESCAPED_HOW) ? 'left from'
                  : 'were'} here.`;
        tty_add_menu(win, null, 0, 0, 0, 0, NO_COLOR, buf, 0);

        /* src/dungeon.c:3696 — bones details; at game end the hero's own
           resting place is listed (before bones creation, so it gives
           nothing away) */
        if (died_here) {
            tty_add_menu(win, null, 0, 0, 0, 0, NO_COLOR,
                         `${PREFIX}Final resting place for`, 0);
            const { formatkiller } = await import('./end.js');
            let tmpbuf = formatkiller(reason, true)
                .replace(' himself', ' yourself')
                .replace(' herself', ' yourself')
                .replace(' his ', ' your ')
                .replace(' her ', ' your ');
            tty_add_menu(win, null, 0, 0, 0, 0, NO_COLOR,
                         `${PREFIX}${TAB}you, ${tmpbuf}.`, 0);
        }

        const f = m.feat || {};
        let i = 0;
        const COMMA = () => (i++ > 0 ? ', ' : PREFIX);
        let fbuf = '';
        const ADDN = (nam, v) => {
            if (v)
                fbuf += `${COMMA()}${seen_string(v, nam)} ${nam}${plur(v)}`;
        };
        /* shop/temple/altar arms come first in C; none is seen yet */
        if (f.naltar > 0)
            ADDN('altar', f.naltar);
        ADDN('throne', f.nthrone);
        ADDN('fountain', f.nfount);
        ADDN('sink', f.nsink);
        ADDN('grave', f.ngrave);
        ADDN('tree', f.ntree);
        if (fbuf) {
            /* capitalize afterwards; terminate with '.' */
            const k = PREFIX.length;
            fbuf = fbuf.slice(0, k) + fbuf[k].toUpperCase() + fbuf.slice(k + 1)
                   + '.';
            tty_add_menu(win, null, 0, 0, 0, 0, NO_COLOR, fbuf, 0);
        }
    }
    tty_end_menu(win, '');
    await tty_select_menu(win, 0 /* PICK_NONE */);
    tty_destroy_nhwindow(win);
    return 0;
}
