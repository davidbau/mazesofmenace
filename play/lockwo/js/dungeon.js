// dungeon.js - Dungeon initialization.
// C ref: dungeon.c - init_dungeons, init_dungeon_dungeons, place_level.

import { game } from './gstate.js';
import { roles } from './role.js';
import { rn2, rn1 } from './rng.js';
import { nhgetch } from './input.js';
import { ATR_INVERSE, NO_COLOR } from './terminal.js';
import {
    MAXDUNGEON, MAXLEVEL,
    TBR_STAIR, TBR_NO_UP, TBR_NO_DOWN, TBR_PORTAL,
    BR_STAIR, BR_NO_END1, BR_NO_END2, BR_PORTAL,
    TOWN, HELLISH, MAZELIKE, ROGUELIKE, UNCONNECTED,
    D_ALIGN_NONE, D_ALIGN_CHAOTIC, D_ALIGN_NEUTRAL, D_ALIGN_LAWFUL,
    D_ALIGN_MASK,
    POOL, MOAT, WATER, LAVAPOOL, LAVAWALL, ICE, DRAWBRIDGE_UP, DRAWBRIDGE_DOWN,
    SDOOR, isok,
    IS_AIR, IS_ALTAR, IS_GRAVE, IS_FOUNTAIN, IS_WALL, IS_DOOR, IS_ROOM,
    IS_THRONE, IS_SINK, TREE, COLNO, ROWNO,
    Is_waterlevel, Is_earthlevel, Is_knox_level,
    SHOPBASE,
} from './const.js';
import { shtypes } from './shtypes.js';

const X_START = 'x-strt';
const X_LOCATE = 'x-loca';
const X_GOAL = 'x-goal';

const DUNGEON_FILE = [
    {
        name: 'The Dungeons of Doom',
        bonetag: 'D',
        base: 25,
        range: 5,
        alignment: 'unaligned',
        themerooms: 'themerms.lua',
        branches: [
            { name: 'The Gnomish Mines', base: 2, range: 3 },
            { name: 'Sokoban', chainlevel: 'oracle', base: 1, direction: 'up' },
            { name: 'The Quest', chainlevel: 'oracle', base: 6, range: 2, branchtype: 'portal' },
            { name: 'Fort Ludios', base: 18, range: 4, branchtype: 'portal' },
            { name: 'Gehennom', chainlevel: 'castle', base: 0, branchtype: 'no_down' },
            { name: 'The Elemental Planes', base: 1, branchtype: 'no_down', direction: 'up' },
        ],
        levels: [
            { name: 'rogue', bonetag: 'R', base: 15, range: 4, flags: 'roguelike' },
            { name: 'oracle', bonetag: 'O', base: 5, range: 5, alignment: 'neutral' },
            { name: 'bigrm', bonetag: 'B', base: 10, range: 3, chance: 40, nlevels: 13 },
            { name: 'medusa', base: -5, range: 4, nlevels: 4, alignment: 'chaotic' },
            { name: 'castle', base: -1 },
        ],
    },
    {
        name: 'Gehennom',
        bonetag: 'G',
        base: 20,
        range: 5,
        flags: ['mazelike', 'hellish'],
        lvlfill: 'hellfill',
        alignment: 'noalign',
        branches: [
            { name: "Vlad's Tower", base: 9, range: 5, direction: 'up' },
        ],
        levels: [
            { name: 'valley', bonetag: 'V', base: 1 },
            { name: 'sanctum', base: -1 },
            { name: 'juiblex', bonetag: 'J', base: 4, range: 4 },
            { name: 'baalz', bonetag: 'B', base: 6, range: 4 },
            { name: 'asmodeus', bonetag: 'A', base: 2, range: 6 },
            { name: 'wizard1', base: 11, range: 6 },
            { name: 'wizard2', bonetag: 'X', chainlevel: 'wizard1', base: 1 },
            { name: 'wizard3', bonetag: 'Y', chainlevel: 'wizard1', base: 2 },
            { name: 'orcus', bonetag: 'O', base: 10, range: 6 },
            { name: 'fakewiz1', bonetag: 'F', base: -6, range: 4 },
            { name: 'fakewiz2', bonetag: 'G', base: -6, range: 4 },
        ],
    },
    {
        name: 'The Gnomish Mines',
        bonetag: 'M',
        base: 8,
        range: 2,
        alignment: 'lawful',
        flags: ['mazelike'],
        lvlfill: 'minefill',
        levels: [
            { name: 'minetn', bonetag: 'T', base: 3, range: 2, nlevels: 7, flags: 'town' },
            { name: 'minend', base: -1, nlevels: 3 },
        ],
    },
    {
        name: 'The Quest',
        bonetag: 'Q',
        base: 5,
        range: 2,
        levels: [
            { name: X_START, base: 1, range: 1 },
            { name: X_LOCATE, bonetag: 'L', base: 3, range: 1 },
            { name: X_GOAL, base: -1 },
        ],
    },
    {
        name: 'Sokoban',
        base: 4,
        alignment: 'neutral',
        flags: ['mazelike'],
        entry: -1,
        levels: [
            { name: 'soko1', base: 1, nlevels: 2 },
            { name: 'soko2', base: 2, nlevels: 2 },
            { name: 'soko3', base: 3, nlevels: 2 },
            { name: 'soko4', base: 4, nlevels: 2 },
        ],
    },
    {
        name: 'Fort Ludios',
        base: 1,
        bonetag: 'K',
        flags: ['mazelike'],
        alignment: 'unaligned',
        levels: [
            { name: 'knox', bonetag: 'K', base: -1 },
        ],
    },
    {
        name: "Vlad's Tower",
        base: 3,
        bonetag: 'T',
        protofile: 'tower',
        alignment: 'chaotic',
        flags: ['mazelike'],
        entry: -1,
        levels: [
            { name: 'tower1', base: 1 },
            { name: 'tower2', base: 2 },
            { name: 'tower3', base: 3 },
        ],
    },
    {
        name: 'The Elemental Planes',
        bonetag: 'E',
        base: 6,
        alignment: 'unaligned',
        flags: ['mazelike'],
        entry: -2,
        levels: [
            { name: 'astral', base: 1 },
            { name: 'water', base: 2 },
            { name: 'fire', base: 3 },
            { name: 'air', base: 4 },
            { name: 'earth', base: 5 },
            { name: 'dummy', base: 6 },
        ],
    },
    {
        name: 'The Tutorial',
        base: 2,
        flags: ['mazelike', 'unconnected'],
        levels: [
            { name: 'tut-1', base: 1 },
            { name: 'tut-2', base: 2 },
        ],
    },
];

const flagstrs2i = {
    town: TOWN,
    hellish: HELLISH,
    mazelike: MAZELIKE,
    roguelike: ROGUELIKE,
    unconnected: UNCONNECTED,
};

const dgnaligns2i = {
    unaligned: D_ALIGN_NONE,
    noalign: D_ALIGN_NONE,
    lawful: D_ALIGN_LAWFUL,
    neutral: D_ALIGN_NEUTRAL,
    chaotic: D_ALIGN_CHAOTIC,
};

const brtypes2i = {
    stair: TBR_STAIR,
    portal: TBR_PORTAL,
    no_down: TBR_NO_DOWN,
    no_up: TBR_NO_UP,
};

const brdirstr2i = {
    up: true,
    down: false,
};

function dname_to_dnum(s) {
    for (let i = 0; i < game.n_dgns; i++)
        if (game.dungeons[i]?.dname === s)
            return i;
    throw new Error(`Couldn't resolve dungeon number for name "${s}".`);
}

export function find_level(s) {
    return (game.sp_levchn || []).find((lev) => lev.proto.toLowerCase() === s.toLowerCase()) || null;
}

// C ref: dungeon.c In_hell(lev) = dungeons[lev->dnum].flags.hellish.
export function In_hell(lev) {
    const dnum = lev?.dnum;
    if (dnum == null) return false;
    // The flag lives on the dungeon's `flags` sub-object (init_dungeon() builds
    // it there from dungeon.lua's flags list) — reading it off the dungeon
    // itself silently returned false for every level.
    return !!game.dungeons?.[dnum]?.flags?.hellish;
}

// C ref: dungeon.h Is_valley(x) = Lcheck(x, &valley_level) — same dnum+dlevel.
export function Is_valley(lev) {
    const vl = game.valley_level;
    return !!vl && !!lev && lev.dnum === vl.dnum && lev.dlevel === vl.dlevel;
}

// C ref: dungeon.c find_hell(lev) — the entrance to Gehennom, i.e. the first
// level of the Valley's dungeon.  Returns a fresh d_level rather than filling
// one in place (the C signature's only purpose).
export function find_hell() {
    const vl = game.valley_level;
    return { dnum: vl?.dnum ?? 0, dlevel: 1 };
}

// C ref: dungeon.c dunlevs_in_dungeon(lev) — how many levels lev's dungeon has.
export function dunlevs_in_dungeon(lev) {
    return game.dungeons?.[lev?.dnum]?.num_dunlevs ?? 0;
}

// C ref: dungeon.c single_level_branch(lev) — "this should be generalized
// instead of assuming that Fort Ludios is the only single level branch"; the C
// body is literally `return Is_knox(lev)`.
export function single_level_branch(lev) {
    return Is_knox_level(lev);
}

// C ref: dungeon.c Is_special(lev) — return the s_level for this position if it
// is a special (named) level, else null.  Used by makelevel() to dispatch into
// the special-level (Lua) loader instead of ordinary room generation.
export function Is_special(uz) {
    if (!uz) return null;
    return (game.sp_levchn || []).find(
        (lev) => lev.dlevel.dnum === uz.dnum && lev.dlevel.dlevel === uz.dlevel) || null;
}

function find_branch(s, pd) {
    for (let i = 0; i < pd.n_brs; i++)
        if (pd.tmpbranch[i]?.name === s)
            return i;
    throw new Error(`find_branch: can't find ${s}`);
}

function parent_dnum(s, pd) {
    let i = find_branch(s, pd);
    for (let pdnum = 0; pd.tmpdungeon[pdnum]?.name !== s; pdnum++) {
        i -= pd.tmpdungeon[pdnum]?.branches || 0;
        if (i < 0) return pdnum;
    }
    throw new Error('parent_dnum: could not resolve branch.');
}

export function level_range(dgn, base, randc, chain, pd, adjusted_base) {
    const lmax = game.dungeons[dgn].num_dunlevs;

    if (chain >= 0) {
        const levtmp = pd.final_lev[chain];
        if (!levtmp) throw new Error('level_range: empty chain level.');
        base += levtmp.dlevel.dlevel;
    } else if (base < 0) {
        base = lmax + base + 1;
    }

    if (base < 1 || base > lmax)
        throw new Error('level_range: base value out of range');

    adjusted_base.v = base;

    if (randc === -1)
        return lmax - base + 1;
    if (randc)
        return ((base + randc - 1) > lmax) ? lmax - base + 1 : randc;
    return 1;
}

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
    default:
        return BR_STAIR;
    }
}

function branch_val(bp) {
    return ((((bp.end1.dnum * (MAXLEVEL + 1) + bp.end1.dlevel)
        * (MAXDUNGEON + 1) * (MAXLEVEL + 1))
        + (bp.end2.dnum * (MAXLEVEL + 1) + bp.end2.dlevel)));
}

export function insert_branch(new_branch) {
    game.branches.push(new_branch);
    game.branches.sort((a, b) => branch_val(a) - branch_val(b));
}

let branch_id = 0;

function wizard() {
    return !!game.flags?.debug;
}

function depth(lev) {
    return game.dungeons[lev.dnum].depth_start + lev.dlevel - 1;
}

// C ref: dungeon.c builds_up(lev) — True iff <lev>'s dungeon is entered at its
// bottom and climbed (Vlad's Tower, Sokoban): the branch's "up" direction
// means depth() alone would make the harder-to-reach levels look easier, so
// level_difficulty() (do.js) compensates using this test.
export function builds_up(lev) {
    const dptr = game.dungeons[lev.dnum];
    if (dptr.num_dunlevs > 1)
        return dptr.entry_lev === dptr.num_dunlevs;
    const br = (game.branches || []).find((b) =>
        b.end2.dnum === lev.dnum && b.end2.dlevel === lev.dlevel);
    return br ? !!br.end1_up : false;
}

// C ref: dungeon.c:2027 level_difficulty() — the SINGLE authority for the
// "how hard is it here" depth used by monster/object generation.  Every caller
// used to keep a private copy that implemented only the third arm; the endgame
// planes sit at negative dlevels, so those copies handed d(level_difficulty(),N)
// a negative dice count and it silently rolled nothing (seed0373 step 99).
export function level_difficulty_c() {
    const uz = game.u?.uz;
    if (!uz) return 1;
    if (In_endgame_dg(uz))
        return depth_dg(game.sanctum_level) + Math.trunc((game.u?.ulevel || 0) / 2);
    if (game.u?.uhave?.amulet) return deepest_lev_reached_dg(false);
    let res = depth_dg(uz);
    if (builds_up(uz))
        res += 2 * (game.dungeons[uz.dnum].entry_lev - uz.dlevel + 1);
    return res;
}

// C ref: dungeon.c:1339 deepest_lev_reached(noquest).
function deepest_lev_reached_dg(noquest) {
    let ret = 0;
    const dgns = game.dungeons || [];
    for (let i = 0; i < dgns.length; i++) {
        if (noquest && i === game.quest_dnum) continue;
        const dlevel = dgns[i]?.dunlev_ureached | 0;
        if (!dlevel) continue;
        const d = depth_dg({ dnum: i, dlevel });
        if (d > ret) ret = d;
    }
    return ret;
}

// C ref: dungeon.c depth() / In_endgame().  Local copies: dungeon.js sits below
// hacklib.js/const.js in the import graph for these two callers only.
function depth_dg(uz) {
    const dnum = uz?.dnum ?? 0;
    const dlevel = uz?.dlevel ?? 1;
    const d = game?.dungeons?.[dnum];
    if (!d) return dlevel;
    return (d.depth_start || 1) + dlevel - 1;
}
function In_endgame_dg(uz) {
    const al = game.astral_level;
    return !!uz && !!al && uz.dnum === al.dnum;
}

function parent_dlevel(s, pd) {
    const branch_index = find_branch(s, pd);
    const dnum = parent_dnum(s, pd);
    const base = { v: 0 };
    const num = level_range(dnum, pd.tmpbranch[branch_index].lev.base,
        pd.tmpbranch[branch_index].lev.rand, pd.tmpbranch[branch_index].chain,
        pd, base);

    let i = rn2(num);
    const j = i;
    let curr;
    do {
        if (++i >= num)
            i = 0;
        curr = game.branches.find((br) =>
            (br.end1.dnum === dnum && br.end1.dlevel === base.v + i)
            || (br.end2.dnum === dnum && br.end2.dlevel === base.v + i));
    } while (curr && i !== j);
    return base.v + i;
}

function add_branch(dgn, child_entry_level, pd) {
    const branch_num = find_branch(game.dungeons[dgn].dname, pd);
    const new_branch = {
        next: null,
        id: branch_id++,
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

function add_level(new_lev) {
    const list = game.sp_levchn;
    let pos = 0;
    while (pos < list.length) {
        const curr = list[pos];
        if (curr.dlevel.dnum === new_lev.dlevel.dnum
            && curr.dlevel.dlevel > new_lev.dlevel.dlevel)
            break;
        pos++;
    }
    list.splice(pos, 0, new_lev);
}

function init_level(dgn, proto_index, pd) {
    const tlevel = pd.tmplevel[proto_index];

    pd.final_lev[proto_index] = null;
    if (!wizard() && tlevel.chance <= rn2(100))
        return;

    const new_level = {
        next: null,
        dlevel: { dnum: dgn, dlevel: 0 },
        proto: tlevel.name,
        boneid: tlevel.boneschar,
        rndlevs: tlevel.rndlevs,
        flags: {
            town: !!(tlevel.flags & TOWN),
            hellish: !!(tlevel.flags & HELLISH),
            maze_like: !!(tlevel.flags & MAZELIKE),
            rogue_like: !!(tlevel.flags & ROGUELIKE),
            align: (tlevel.flags & D_ALIGN_MASK) >> 4,
        },
    };
    if (!new_level.flags.align)
        new_level.flags.align = (pd.tmpdungeon[dgn].flags & D_ALIGN_MASK) >> 4;

    pd.final_lev[proto_index] = new_level;
}

export function possible_places(idx, map, pd) {
    const lev = pd.final_lev[idx];

    for (let i = 0; i <= MAXLEVEL; i++)
        map[i] = false;

    const start = { v: 0 };
    let count = level_range(lev.dlevel.dnum, pd.tmplevel[idx].lev.base,
        pd.tmplevel[idx].lev.rand, pd.tmplevel[idx].chain, pd, start);
    for (let i = start.v; i < start.v + count; i++)
        map[i] = true;

    for (let i = pd.start; i < idx; i++) {
        const placed = pd.final_lev[i];
        if (placed && map[placed.dlevel.dlevel]) {
            map[placed.dlevel.dlevel] = false;
            --count;
        }
    }

    return count;
}

export function pick_level(map, nth) {
    for (let i = 1; i <= MAXLEVEL; i++)
        if (map[i] && !nth--)
            return i;
    throw new Error('pick_level: ran out of valid levels');
}

export function place_level(proto_index, pd) {
    const map = new Array(MAXLEVEL + 1);

    if (proto_index === pd.n_levs)
        return true;

    const lev = pd.final_lev[proto_index];
    if (!lev)
        return place_level(proto_index + 1, pd);

    let npossible = possible_places(proto_index, map, pd);

    for (; npossible; --npossible) {
        lev.dlevel.dlevel = pick_level(map, rn2(npossible));
        if (place_level(proto_index + 1, pd))
            return true;
        map[lev.dlevel.dlevel] = false;
    }
    return false;
}

function get_dgn_flags(src) {
    const flags = src.flags;
    if (Array.isArray(flags))
        return flags.reduce((acc, flag) => acc | (flagstrs2i[flag] || 0), 0);
    if (typeof flags === 'string')
        return flagstrs2i[flags] || 0;
    return 0;
}

function get_dgn_align(src) {
    return dgnaligns2i[src.alignment || 'unaligned'] ?? D_ALIGN_NONE;
}

function init_dungeon_levels(src, pd, dngidx) {
    const levels = src.levels || [];
    pd.tmpdungeon[dngidx].levels = levels.length;

    for (let f = 0; f < levels.length; f++) {
        const lvl = levels[f];
        const lvl_chain = lvl.chainlevel || null;
        const tmpl = {
            name: lvl.name,
            chainlvl: lvl_chain,
            lev: { base: lvl.base, rand: lvl.range || 0 },
            chance: lvl.chance ?? 100,
            rndlevs: lvl.nlevels || 0,
            flags: get_dgn_flags(lvl) | get_dgn_align(lvl),
            boneschar: lvl.bonetag ? lvl.bonetag[0] : 0,
            chain: -1,
        };

        if (lvl_chain) {
            for (let bi = 0; bi < pd.n_levs + f; bi++) {
                if (pd.tmplevel[bi]?.name === lvl_chain) {
                    tmpl.chain = bi;
                    break;
                }
            }
            if (tmpl.chain === -1)
                throw new Error(`Could not chain level ${lvl.name} to ${lvl_chain}`);
        }
        pd.tmplevel[pd.n_levs + f] = tmpl;
    }

    pd.n_levs += levels.length;
}

function init_dungeon_branches(src, pd, dngidx) {
    const branches = src.branches || [];
    pd.tmpdungeon[dngidx].branches = branches.length;

    for (let f = 0; f < branches.length; f++) {
        const br = branches[f];
        const br_chain = br.chainlevel || null;
        const tmpb = {
            name: br.name,
            lev: { base: br.base, rand: br.range || 0 },
            type: brtypes2i[br.branchtype || 'stair'] ?? TBR_STAIR,
            up: brdirstr2i[br.direction || 'down'] ?? false,
            chain: -1,
        };

        if (br_chain) {
            for (let bi = 0; bi < pd.n_levs + f - 1; bi++) {
                if (pd.tmplevel[bi]?.name === br_chain) {
                    tmpb.chain = bi;
                    break;
                }
            }
            if (tmpb.chain === -1)
                throw new Error(`Could not chain branch ${br.name} to level ${br_chain}`);
        }
        pd.tmpbranch[pd.n_brs + f] = tmpb;
    }

    pd.n_brs += branches.length;
}

function init_dungeon_set_entry(pd, dngidx) {
    const dgn_entry = pd.tmpdungeon[dngidx].entry_lev;
    const dungeon = game.dungeons[dngidx];

    if (dgn_entry < 0) {
        dungeon.entry_lev = dungeon.num_dunlevs + dgn_entry + 1;
        if (dungeon.entry_lev <= 0)
            dungeon.entry_lev = 1;
    } else if (dgn_entry > 0) {
        dungeon.entry_lev = dgn_entry;
        if (dungeon.entry_lev > dungeon.num_dunlevs)
            dungeon.entry_lev = dungeon.num_dunlevs;
    } else {
        dungeon.entry_lev = 1;
    }
}

function init_dungeon_set_depth(pd, dngidx) {
    const dungeon = game.dungeons[dngidx];
    const br = add_branch(dngidx, dungeon.entry_lev, pd);

    let from_depth;
    let from_up;
    if (br.end1.dnum === dngidx) {
        from_depth = depth(br.end2);
        from_up = !br.end1_up;
    } else {
        from_depth = depth(br.end1);
        from_up = br.end1_up;
    }

    dungeon.depth_start = from_depth + (br.type === BR_PORTAL ? 0 : (from_up ? -1 : 1))
        - (dungeon.entry_lev - 1);
}

function init_dungeon_dungeons(src, pd, dngidx) {
    const dgn_chance = src.chance ?? 100;

    if (!wizard() && dgn_chance && dgn_chance <= rn2(100)) {
        game.n_dgns--;
        return false;
    }

    init_dungeon_levels(src, pd, dngidx);
    init_dungeon_branches(src, pd, dngidx);

    const dgn_flags = get_dgn_flags(src);
    const dgn_align = get_dgn_align(src);
    const tmpdungeon = pd.tmpdungeon[dngidx];

    tmpdungeon.name = src.name;
    tmpdungeon.protoname = src.protofile || '';
    tmpdungeon.boneschar = src.bonetag ? src.bonetag[0] : 0;
    tmpdungeon.lev = { base: src.base, rand: src.range || 0 };
    tmpdungeon.flags = dgn_flags;
    tmpdungeon.align = dgn_align;
    tmpdungeon.chance = dgn_chance;
    tmpdungeon.entry_lev = src.entry || 0;

    const dungeon = {
        dname: src.name,
        proto: src.protofile || '',
        fill_lvl: src.lvlfill || '',
        themerms: src.themerooms || '',
        boneid: src.bonetag ? src.bonetag[0] : 0,
        entry_lev: 0,
        num_dunlevs: src.range ? rn1(src.range, src.base) : src.base,
        dunlev_ureached: dngidx ? 0 : 1,
        ledger_start: dngidx
            ? game.dungeons[dngidx - 1].ledger_start + game.dungeons[dngidx - 1].num_dunlevs
            : 0,
        depth_start: dngidx ? 0 : 1,
        flags: {
            hellish: !!(dgn_flags & HELLISH),
            maze_like: !!(dgn_flags & MAZELIKE),
            rogue_like: !!(dgn_flags & ROGUELIKE),
            align: dgn_align,
            unconnected: !!(dgn_flags & UNCONNECTED),
        },
    };
    game.dungeons[dngidx] = dungeon;

    init_dungeon_set_entry(pd, dngidx);

    if (dungeon.flags.unconnected)
        dungeon.depth_start = 1;
    else if (dngidx)
        init_dungeon_set_depth(pd, dngidx);

    if (dungeon.num_dunlevs > MAXLEVEL)
        dungeon.num_dunlevs = MAXLEVEL;

    return true;
}

function init_castle_tune() {
    game.tune = [];
    for (let i = 0; i < 5; i++)
        game.tune[i] = String.fromCharCode('A'.charCodeAt(0) + rn2(7));
    game.tune[5] = '\0';
}

const level_map = [
    ['air', 'air_level'],
    ['asmodeus', 'asmodeus_level'],
    ['astral', 'astral_level'],
    ['baalz', 'baalzebub_level'],
    ['bigrm', 'bigroom_level'],
    ['castle', 'stronghold_level'],
    ['earth', 'earth_level'],
    ['fakewiz1', 'portal_level'],
    ['fire', 'fire_level'],
    ['juiblex', 'juiblex_level'],
    ['knox', 'knox_level'],
    ['medusa', 'medusa_level'],
    ['oracle', 'oracle_level'],
    ['orcus', 'orcus_level'],
    ['rogue', 'rogue_level'],
    ['sanctum', 'sanctum_level'],
    ['valley', 'valley_level'],
    ['water', 'water_level'],
    ['wizard1', 'wiz1_level'],
    ['wizard2', 'wiz2_level'],
    ['wizard3', 'wiz3_level'],
    ['minend', 'mineend_level'],
    ['soko1', 'sokoend_level'],
    [X_START, 'qstart_level'],
    [X_LOCATE, 'qlocate_level'],
    [X_GOAL, 'nemesis_level'],
];

// C ref: dungeon.c fixup_level_locations — the quest dungeon's levels are
// stored generically as "x-strt"/"x-loca"/"x-goal"; the "x" is replaced by the
// current role's filecode (gu.urole.filecode) so the overview/level-teleport
// listing shows e.g. "Arc-strt" for an Archeologist.
function urole_filecode() {
    if (Number.isInteger(game.initrole) && game.initrole >= 0)
        return roles[game.initrole]?.filecode || null;
    const name = String(game.initrole || '').toLowerCase();
    const r = roles.find((rr) => rr.name?.m?.toLowerCase() === name);
    return r?.filecode || null;
}

function fixup_level_locations() {
    const filecode = urole_filecode();
    for (const [lev_name, lev_spec] of level_map) {
        const x = find_level(lev_name);
        if (x) {
            game[lev_spec] = { ...x.dlevel };
            // C ref: dungeon.c fixup_level_locations — name substitution on the
            // quest dungeon's levels: proto = urole.filecode + &lev_name[1]
            // ("x-strt" -> "Arc-strt").
            if (lev_name.startsWith('x-') && filecode) {
                x.proto = filecode + lev_name.slice(1);
            }
            // C ref: dungeon.c init_dungeons() — Kludge to allow a floating
            // Knox (Fort Ludios) entrance: the branch reaching Knox has its
            // parent end (end1) marked with the bogus dnum n_dgns so it sorts
            // to the end of the branch list and is omitted from per-dungeon
            // listings (print_dungeon's level menu).
            if (lev_spec === 'knox_level') {
                const knox = x.dlevel;
                const br = (game.branches || []).find(
                    (b) => b.end2.dnum === knox.dnum && b.end2.dlevel === knox.dlevel);
                if (br) {
                    br.end1.dnum = game.n_dgns;
                    // Re-sort the branch list now that end1 changed.
                    game.branches.sort((a, b) => branch_val(a) - branch_val(b));
                }
            }
        }
    }

    game.quest_dnum = dname_to_dnum('The Quest');
    game.sokoban_dnum = dname_to_dnum('Sokoban');
    game.mines_dnum = dname_to_dnum('The Gnomish Mines');
    game.tower_dnum = dname_to_dnum("Vlad's Tower");
    game.tutorial_dnum = dname_to_dnum('The Tutorial');

    const dummy = find_level('dummy');
    if (dummy) {
        const i = dummy.dlevel.dnum;
        if (game.dungeons[i].num_dunlevs > 1 - game.dungeons[i].depth_start)
            game.dungeons[i].depth_start -= 1;
    }
}

export function init_dungeons() {
    const pd = {
        tmpdungeon: Array.from({ length: MAXDUNGEON }, () => ({ levels: 0, branches: 0 })),
        tmplevel: [],
        final_lev: [],
        tmpbranch: [],
        start: 0,
        n_levs: 0,
        n_brs: 0,
    };

    branch_id = 0;
    game.dungeons = [];
    game.branches = [];
    game.sp_levchn = [];
    game.n_dgns = DUNGEON_FILE.length;

    if (game.n_dgns >= MAXDUNGEON)
        throw new Error('init_dungeons: too many dungeons');

    let cl = 0;
    let i = 0;
    for (const dungeon_src of DUNGEON_FILE) {
        if (init_dungeon_dungeons(dungeon_src, pd, i)) {
            for (; cl < pd.n_levs; cl++)
                init_level(i, cl, pd);

            if (!place_level(pd.start, pd))
                throw new Error("init_dungeon: couldn't place levels");

            for (; pd.start < pd.n_levs; pd.start++)
                if (pd.final_lev[pd.start])
                    add_level(pd.final_lev[pd.start]);
            i++;
        }
    }

    init_castle_tune();
    fixup_level_locations();
}

// ── print_dungeon level-teleport menu (C ref: dungeon.c print_dungeon) ──
//
// The wizard ^V "? for a menu" path.  Renders the "Level teleport to where:"
// menu of every dungeon's special levels and branches and returns the chosen
// destination.  Consumes NO RNG (the whole menu is derived from the static
// dungeon model that init_dungeons() already built), so it can never perturb
// the PRNG stream the recorder captured.
//
// Returns { playerlev, destlev, destdnum } for a selection, or null if the
// player cancels (matching print_dungeon returning 0).

function br_string(type) {
    switch (type) {
    case BR_PORTAL: return 'Portal';
    case BR_NO_END1: return 'Connection';
    case BR_NO_END2: return 'One way stair';
    case BR_STAIR: return 'Stair';
    }
    return ' (unknown)';
}

function chr_u_on_lvl(dlev) {
    const u = game.u;
    return (u && u.uz && u.uz.dnum === dlev.dnum && u.uz.dlevel === dlev.dlevel)
        ? '*' : ' ';
}

// Logical depth of a level within a given dungeon model.
function pd_depth(M, lev) {
    return M.dungeons[lev.dnum].depth_start + lev.dlevel - 1;
}

// C ref: dungeon.c unplaced_floater() — Fort Ludios (knox) is "unplaced" while
// it remains a floating branch (end1.dnum == n_dgns).
function unplaced_floater(M, dnum) {
    const knox = M.knox_level;
    if (!knox || dnum !== knox.dnum) return false;
    for (const br of (M.branches || []))
        if (br.end1.dnum === M.n_dgns && br.end2.dnum === dnum)
            return true;
    return false;
}

// C ref: dungeon.c unreachable_level().  In_endgame is never the case for the
// recorded ^V sessions; the "dummy" Plane-of-Earth filler level is unreachable.
function unreachable_level(M, dlev, unplaced) {
    if (unplaced) return true;
    const dummy = (M.sp_levchn || []).find((l) => l.proto === 'dummy');
    if (dummy && dummy.dlevel.dnum === dlev.dnum
        && dummy.dlevel.dlevel === dlev.dlevel)
        return true;
    return false;
}

// makeplural for the single word used by print_dungeon ("level" -> "levels",
// "depth" -> "depths").  C ref: objnam.c makeplural — only these two strings
// reach it from print_dungeon.
function pd_makeplural(word) {
    return word + 's';
}

// Build the ordered list of menu entries that print_dungeon would emit from
// the given dungeon model M.  Each entry is a heading (non-selectable) or a
// selectable level.
function build_levtport_menu(M) {
    const entries = []; // { heading } | { text, lev, dgn, playerlev, reachable }
    let menuletter = 'a';
    const advance = () => {
        if (menuletter === 'z') menuletter = 'A';
        else menuletter = String.fromCharCode(menuletter.charCodeAt(0) + 1);
    };

    // C ref: tport_menu — record the lchoice slot and emit a menu line, with
    // 4-space padding (and no selector) for unreachable levels.
    const tport_menu = (entry, lvl, reachable) => {
        let text = entry;
        if (!reachable) text = '    ' + entry;
        entries.push({
            menuletter,
            text,
            lev: lvl.dlevel,
            dgn: lvl.dnum,
            playerlev: pd_depth(M, lvl),
            reachable,
        });
        advance();
    };

    // C ref: print_branch — print child branches whose parent end (end1) is in
    // [lower_bound+1, upper_bound] of this dungeon, in svb.branches order.
    const print_branch = (dnum, lowerBound, upperBound) => {
        for (const br of (M.branches || [])) {
            if (br.end1.dnum === dnum && lowerBound < br.end1.dlevel
                && br.end1.dlevel <= upperBound) {
                const buf = `${chr_u_on_lvl(br.end1)} ${br_string(br.type)} to `
                    + `${M.dungeons[br.end2.dnum].dname}: ${pd_depth(M, br.end1)}`;
                tport_menu(buf, br.end1, !unreachable_level(M, br.end1, false));
            }
        }
    };

    for (let i = 0; i < M.n_dgns; i++) {
        const dptr = M.dungeons[i];
        const unplaced = unplaced_floater(M, i);
        const descr = unplaced ? 'depth' : 'level';
        const nlev = dptr.num_dunlevs;
        let buf;
        if (nlev > 1)
            buf = `${dptr.dname}: ${pd_makeplural(descr)} ${dptr.depth_start} to `
                + `${dptr.depth_start + nlev - 1}`;
        else
            buf = `${dptr.dname}: ${descr} ${dptr.depth_start}`;
        if (dptr.entry_lev !== 1) {
            if (dptr.entry_lev === nlev) buf += ', entrance from below';
            else buf += `, entrance on ${dptr.depth_start + dptr.entry_lev - 1}`;
        }
        entries.push({ heading: true, text: buf });

        // Circle through the special levels in this dungeon (sp_levchn order).
        let lastLevel = 0;
        for (const slev of (M.sp_levchn || [])) {
            if (slev.dlevel.dnum !== i) continue;
            print_branch(i, lastLevel, slev.dlevel.dlevel);
            let lbuf = `${chr_u_on_lvl(slev.dlevel)} ${slev.proto}: ${pd_depth(M, slev.dlevel)}`;
            if (M.stronghold_level && slev.dlevel.dnum === M.stronghold_level.dnum
                && slev.dlevel.dlevel === M.stronghold_level.dlevel)
                lbuf += ` (tune ${(M.tune || []).join('').replace(/\0/g, '')})`;
            tport_menu(lbuf, slev.dlevel, !unreachable_level(M, slev.dlevel, unplaced));
            lastLevel = slev.dlevel.dlevel;
        }
        print_branch(i, lastLevel, MAXLEVEL);
    }
    return entries;
}

// Render one page of the level-teleport menu to the terminal grid and leave it
// there; the caller reads the selection key (the pre-nhgetch capture hook
// snapshots this rendered menu as the boundary screen).  Mirrors
// win/tty/wintty.c process_menu_window layout: title row, items, morestr.
export async function print_dungeon(bymenu, _rlev, _rdgn) {
    if (!bymenu) return 0;

    // Resolve the dungeon model: gameplay sessions stub g.dungeons down to a
    // single dnum-0 level for level generation, but allmain.newgame() stashes
    // the complete model (built by init_dungeons) in g._full_dungeon.  Fall
    // back to the live game state when the full model wasn't captured.
    const M = game._full_dungeon || {
        dungeons: game.dungeons,
        branches: game.branches,
        sp_levchn: game.sp_levchn,
        n_dgns: game.n_dgns,
        tune: game.tune,
        knox_level: game.knox_level,
        stronghold_level: game.stronghold_level,
    };

    const entries = build_levtport_menu(M);

    // The menu title occupies the inverse first row; in the tty menu the title
    // is emitted by end_menu() as the menu's prompt heading.  process_menu_window
    // renders it as the first line.  Recorded layout shows: title row, blank,
    // then headings/items, with the morestr on the final row.
    const lines = [{ title: true, text: 'Level teleport to where:' }, { blank: true }];
    for (const e of entries) lines.push(e);

    const disp = game.nhDisplay;
    const rows = (disp && disp.rows) || 24;
    // Each page fills rows-1 lines (the last row holds the morestr).
    const perPage = Math.max(1, rows - 1);
    const npages = Math.max(1, Math.ceil(lines.length / perPage));

    // Render helper that treats `lines` (with the title/blank prefixed).
    const renderPage = (pageNo) => {
        if (!disp || !disp.setCell) return;
        const cols = disp.cols || 80;
        const start = (pageNo - 1) * perPage;
        const end = Math.min(start + perPage, lines.length);
        const clearRow = (r) => { for (let c = 0; c < cols; c++) disp.setCell(c, r, ' ', NO_COLOR, 0); };
        let row = 0;
        for (let i = start; i < end; i++, row++) {
            const e = lines[i];
            clearRow(row);
            if (e.blank) continue;
            if (e.title) { disp.putstr(1, row, e.text, NO_COLOR, ATR_INVERSE); continue; }
            // C ref: tport_menu — an unreachable level is added with a_int==0
            // (zeroany), so the tty windowport shows no accelerator; its entry
            // text already carries the 4-space padding in place of "X - ".
            const line = (e.heading || !e.reachable) ? e.text : `${e.menuletter} - ${e.text}`;
            disp.putstr(1, row, line, NO_COLOR, e.heading ? ATR_INVERSE : 0);
        }
        const morestr = npages > 1 ? `(${pageNo} of ${npages})` : '(end) ';
        clearRow(row);
        disp.putstr(1, row, morestr, NO_COLOR, 0);
        for (let r = row + 1; r < rows; r++) clearRow(r);
        // C dmore parks the cursor just past the morestr (col 1 + its length).
        disp.setCursor(1 + morestr.length, row);
    };

    let pageNo = 1;
    for (;;) {
        renderPage(pageNo);
        const key = await nhgetch();
        const ch = String.fromCharCode(key);

        // Cancel: ESC.
        if (key === 27) return 0;

        // Accelerator selection: a letter that maps to a reachable entry on
        // ANY page selects it immediately (tty PICK_ONE behavior).
        const sel = entries.find((e) => !e.heading && e.reachable && e.menuletter === ch);
        if (sel) {
            return { playerlev: sel.playerlev, destlev: sel.lev, destdnum: sel.dgn };
        }

        // Paging keys: space / '>' / return advance; '<' goes back.
        if (key === 32 || ch === '>' || key === 13 || key === 10) {
            if (pageNo < npages) pageNo++;
            else return 0; // past the last page with no selection: cancel
            continue;
        }
        if (ch === '<') {
            if (pageNo > 1) pageNo--;
            continue;
        }
        // Any other key: ignore and redraw.
    }
}

// ── #overview command (C ref: dungeon.c dooverview()/show_overview() ──
//
// Builds the display lines for the "#overview" menu: for each visited
// dungeon level, a heading (once per dungeon, C ref: print_mapseen's
// `printdun` line via svd.dungeons[dnum].dname) followed by a "Level N: ..."
// line, plus a feature-summary line when the level has fountains, sinks,
// thrones, graves, or trees that have actually been seen (C ref:
// print_mapseen's OF_INTEREST buf, via ADDNTOBUF).  A level with none of
// those and no annotation is skipped unless it's the level the hero is
// currently on (C ref: interest_mapseen's on_level(&u.uz, ...) shortcut).
// Shops/altars/temples/branches/bones/Sokoban/quest/endgame refinements
// aren't modeled: no recorded session visits a level that needs them.

const OVERVIEW_TAB = '   ';
const OVERVIEW_PREFIX = '      ';

// C ref: dungeon.c seen_string() — "no"/"a"/"an"/"some"/"many" by count.
function overview_seen_string(count, obj) {
    switch (count) {
    case 0: return 'no';
    case 1: return /^[aeiouAEIOU]/.test(obj) ? 'an' : 'a';
    case 2: return 'some';
    case 3: return 'many';
    }
    return '(unknown)';
}
function overview_plur(n) { return n === 1 ? '' : 's'; }

// C ref: dungeon.c count_feat_lastseentyp() — counts seen cells of a given
// terrain, capped at 3 (matches print_mapseen's "no/a/some/many" scale).
// lastseentyp isn't tracked separately here; a cell with a remembered_glyph
// has necessarily been seen, which is the same "has the hero observed this"
// gate hack.js's #terrain (reveal_terrain) uses.
function overview_count_feat(level, pred) {
    let n = 0;
    for (let x = 1; x < COLNO; x++) {
        for (let y = 0; y < ROWNO; y++) {
            const loc = level?.at(x, y);
            if (!loc || loc.remembered_glyph == null) continue;
            if (pred(loc.typ)) {
                n++;
                if (n >= 3) return 3;
            }
        }
    }
    return n;
}

// The live level if `ledger` is the hero's current one, else the stashed
// per-level object graph do.js's goto_level() keeps for previously-visited
// levels (the JS analog of a level's on-disk save file).
function overview_level_for(ledger) {
    const u = game.u;
    if (u && u.uz && `${u.uz.dnum}:${u.uz.dlevel}` === ledger) return game.level;
    return game._level_store?.[ledger]?.level || null;
}

// ── the mapseen bits that cannot be recomputed from a stored map ─────────────
//
// C keeps a `mapseen` per visited level.  Most of what print_mapseen() shows is
// re-derived here from the stashed level object, but two fields are HISTORY,
// not state: msrooms[].seen (which special rooms the hero actually walked into)
// and br (which branch stairway the hero actually took).  Neither can be read
// back off the map, so they are recorded at the moment C records them.
function mapseen_of(ledger) {
    const m = game._mapseen || (game._mapseen = {});
    return m[ledger] || (m[ledger] = { msrooms: {}, br: null });
}

// C ref: dungeon.c:3282 room_discovered(roomno) — "room entry message has just
// been delivered so learn room even if blind".  Called from hack.c
// check_special_room() for every TEMPLE or shop the hero enters.
export function room_discovered(roomno) {
    const uz = game.u?.uz;
    if (!uz) return;
    mapseen_of(`${uz.dnum}:${uz.dlevel}`).msrooms[roomno] = { seen: 1 };
}

// C ref: dungeon.c:2446 recbranch_mapseen(source, dest) — record that the hero
// KNOWS about a branch from `source`, which is what puts the "Stairs down to
// The Gnomish Mines." line in #overview.  Only forward (end1 -> end2)
// transitions count, and C deliberately does not call this for a level teleport
// or the Eye, so a ^V-hopping wizard-mode game gets no branch annotations.
export function recbranch_mapseen(source, dest) {
    if (!source || !dest || source.dnum === dest.dnum) return;
    const on = (l, e) => e && l.dnum === e.dnum && l.dlevel === e.dlevel;
    let found = null;
    for (const br of game.branches || []) {
        if (on(source, br.end1) && on(dest, br.end2)) { found = br; break; }
        if (on(source, br.end2) && on(dest, br.end1)) return;   // backward
    }
    if (!found) return;
    mapseen_of(`${source.dnum}:${source.dlevel}`).br = found;
}

// C ref: dungeon.c:3388 br_string2(branch *).  The quest-portal "Sealed portal"
// arm needs u.uevent.qexpelled, which this port does not track.
function br_string2(br) {
    switch (br.type) {
    case BR_PORTAL: return 'Portal';
    case BR_NO_END1: return 'Connection';
    case BR_NO_END2: return br.end1_up ? 'One way stairs up' : 'One way stairs down';
    case BR_STAIR: return br.end1_up ? 'Stairs up' : 'Stairs down';
    }
    return '(unknown)';
}

// C ref: dungeon.c:3441 shop_string(rtype) — the #overview name of a shop, which
// is shtypes[].annotation when that second (shorter) name exists and
// shtypes[].name otherwise.  A shop whose keeper has left is "untended shop"
// (shoptype forced to SHOPBASE-1 by recalc_mapseen).
// C ref: hacklib.c an() — every shop_string() result starts with a letter, so
// the vowel test is the whole rule here (no "the"/"some" special cases).
function an_dg(s) { return (/^[aeiouAEIOU]/.test(s) ? 'an ' : 'a ') + s; }

function shop_string(rtype) {
    const idx = rtype - SHOPBASE;
    if (idx < 0) return 'untended shop';
    const t = shtypes[idx];
    return t?.annotation || t?.name || 'shop?';
}

// `final` mirrors print_mapseen()'s eponymous parameter: 0 (default) is the
// live '#overview' command, which only lists levels interest_mapseen() flags
// as "of interest"; 1 or 2 is the end-of-game disclosure, which (per
// traverse_mapseenchn()'s `why != 0 || interest_mapseen(mptr)`) lists EVERY
// visited level unconditionally.  `how` is the death code, needed only to
// pick the "<- You are/were/left from here" verb for final==1 (an alive
// ending); it is unused for final==0/2.
export function build_overview_lines(final = 0, how = 0) {
    const M = game._full_dungeon || { dungeons: game.dungeons, n_dgns: game.n_dgns };
    const u = game.u;
    const uzLedger = u && u.uz ? `${u.uz.dnum}:${u.uz.dlevel}` : null;

    const ledgers = new Set(Object.keys(game._visited_levels || {}));
    if (uzLedger) ledgers.add(uzLedger);
    // C makes a mapseen for EVERY level the hero has been on, including the one
    // chargen built (which do.js deliberately leaves out of _visited_levels).
    // Anything with a stashed map, an annotation or mapseen history has been
    // visited, so union those in or the annotated Dlvl 1 goes missing.
    for (const k of Object.keys(game._level_store || {})) ledgers.add(k);
    for (const k of Object.keys(game._level_annotations || {})) ledgers.add(k);
    for (const k of Object.keys(game._mapseen || {})) ledgers.add(k);
    // C ref: allmain.c maybe_do_tutorial() -> goto_level(): a lua-scripted
    // level entry (the tutorial redirect) assigns u.ucamefrom the level the
    // hero is leaving, exactly as goto_level() would, but our tutorial-enter
    // shortcut (allmain.js enter_tutorial_level) bypasses do.js's goto_level()
    // and so never marks that departure level in _visited_levels/_level_store.
    // The end-of-game disclosure still needs to list it (a mapseen entry was
    // made for it when the hero's character was first placed there), so add
    // it here from the one general-purpose field that survives the shortcut.
    if (final && u?.ucamefrom) ledgers.add(`${u.ucamefrom.dnum}:${u.ucamefrom.dlevel}`);

    const parsed = Array.from(ledgers).map((ledger) => {
        const [dnum, dlevel] = ledger.split(':').map(Number);
        return { ledger, dnum, dlevel };
    });
    // C ref: init_mapseen() inserts each level in ascending (dnum, dlevel)
    // order, so mapseenchn traversal is already sorted that way.
    parsed.sort((a, b) => (a.dnum - b.dnum) || (a.dlevel - b.dlevel));

    // A dungeon's dunlev_ureached is, by definition, at least as deep as any
    // level of it the hero has actually visited.  A lua-scripted level entry
    // (the tutorial redirect, see the ucamefrom comment above) sets u.uz
    // directly without going through do.js's goto_level(), which is what
    // normally bumps dunlev_ureached, so the tracked field can understate it;
    // this recovers the invariant instead of trusting the possibly-stale field.
    const maxDlevelByDnum = new Map();
    for (const p of parsed)
        maxDlevelByDnum.set(p.dnum, Math.max(maxDlevelByDnum.get(p.dnum) ?? 0, p.dlevel));

    const lines = [];
    let lastdun = -1;
    for (const p of parsed) {
        const level = overview_level_for(p.ledger);
        // C's mapseen survives without the level being in memory, so a level
        // whose stashed map is gone still prints its heading line — dropping it
        // here lost the annotated Dlvl 1 of any game that had moved on.
        const feat = level ? {
            nthrone: overview_count_feat(level, IS_THRONE),
            nfount: overview_count_feat(level, IS_FOUNTAIN),
            nsink: overview_count_feat(level, IS_SINK),
            ngrave: overview_count_feat(level, IS_GRAVE),
            ntree: overview_count_feat(level, (t) => t === TREE),
        } : { nthrone: 0, nfount: 0, nsink: 0, ngrave: 0, ntree: 0 };
        const ms = game._mapseen?.[p.ledger] || null;
        // C ref: recalc_mapseen()'s msrooms loop — a shop counts only once the
        // hero has been INSIDE it (room_discovered), and shoptype collapses to 0
        // when two different shop types have been entered on the same level.
        feat.nshop = 0; feat.shoptype = 0;
        if (level && ms) {
            for (const key of Object.keys(ms.msrooms)) {
                const rt = level.rooms?.[+key]?.rtype | 0;
                if (rt < SHOPBASE) continue;
                if (!feat.nshop) feat.shoptype = rt;
                else if (feat.shoptype !== rt) feat.shoptype = 0;
                if (feat.nshop < 3) feat.nshop++;
            }
        }
        const custom = game._level_annotations?.[p.ledger] || '';
        const onHere = p.ledger === uzLedger;
        const ofInterest = !!(feat.nshop || feat.nthrone || feat.nfount
                              || feat.nsink || feat.ngrave || feat.ntree);
        const dptr = M.dungeons[p.dnum];
        if (!dptr) continue;
        const dunlevUreached = Math.max(dptr.dunlev_ureached ?? 0, maxDlevelByDnum.get(p.dnum) ?? 0);
        // C ref: dungeon.c interest_mapseen() last clause — a level is of
        // interest when it is "the furthest level reached in its branch"
        // (mptr->lev.dlevel == dungeons[dnum].dunlev_ureached), even with no
        // features and no annotation.  GAP: the auto-annotation flags (oracle /
        // bigroom / roguelevel / castle / valley / msanctum / vibrating_square /
        // quest_summons / questing) are not tracked here yet.
        const isDeepest = p.dlevel === dunlevUreached;
        if (!final && !onHere && !ofInterest && !custom && !ms?.br && !isDeepest) continue;
        const showheader = p.dnum !== lastdun;
        if (showheader) {
            const buf = (dunlevUreached === dptr.entry_lev)
                ? `${dptr.dname}:`
                : `${dptr.dname}: levels ${dptr.depth_start} to `
                  + `${dptr.depth_start + dunlevUreached - 1}`;
            // C ref: windows.c add_menu_heading() — "suppress highlighting
            // during end-of-game disclosure": program_state.gameover forces
            // ATR_NONE there, so only the live '#overview' command (final==0)
            // gets the highlighted iflags.menu_headings.attr (ATR_INVERSE).
            lines.push({ text: buf, attr: final ? 0 : ATR_INVERSE });
            lastdun = p.dnum;
        }

        // C: the quest and Fort Ludios levels are numbered as if level 1.
        const depthstart = (p.dnum === game.quest_dnum || p.dnum === game.knox_level?.dnum)
            ? 1 : dptr.depth_start;
        let lbuf = `${OVERVIEW_TAB}Level ${depthstart + p.dlevel - 1}:`;
        // C ref: print_mapseen():3567 — "wizmode prints out proto dungeon names
        // for clarity".  Sits BEFORE the custom annotation.
        if (wizard()) {
            const slev = Is_special({ dnum: p.dnum, dlevel: p.dlevel });
            if (slev) lbuf += ` [${slev.proto}]`;
        }
        if (custom) lbuf += ` "${custom}"`;
        if (onHere) {
            const ASCENDED = 15, ESCAPED = 14;
            const verb = (final <= 0 || (final === 1 && how === ASCENDED)) ? 'are'
                : (final === 1 && how === ESCAPED) ? 'left from' : 'were';
            lbuf += ` <- You ${verb} here.`;
        }
        lines.push({ text: lbuf, attr: 0 });

        if (ofInterest) {
            let fbuf = '';
            let n = 0;
            const add = (nam, val) => {
                if (!val) return;
                fbuf += (n++ > 0 ? ', ' : OVERVIEW_PREFIX)
                    + `${overview_seen_string(val, nam)} ${nam}${overview_plur(val)}`;
            };
            // C ref: print_mapseen() lists interests "in an order vaguely
            // corresponding to how important they are" — shops first.  A single
            // shop names its type ("a general store"); 2+ collapse to "N shops".
            if (feat.nshop > 1) add('shop', feat.nshop);
            else if (feat.nshop > 0)
                fbuf += (n++ > 0 ? ', ' : OVERVIEW_PREFIX) + an_dg(shop_string(feat.shoptype));
            add('throne', feat.nthrone);
            add('fountain', feat.nfount);
            add('sink', feat.nsink);
            add('grave', feat.ngrave);
            add('tree', feat.ntree);
            const idx = OVERVIEW_PREFIX.length;
            fbuf = fbuf.slice(0, idx) + fbuf[idx].toUpperCase() + fbuf.slice(idx + 1) + '.';
            lines.push({ text: fbuf, attr: 0 });
        }

        // C ref: print_mapseen():3681 — the known branch connection, printed
        // after the feature line.  `, level N` is appended only for an upward
        // branch (Sokoban, Vlad's), where the destination depth is not obvious.
        if (ms?.br) {
            const br = ms.br;
            let bbuf = `${OVERVIEW_PREFIX}${br_string2(br)} to `
                     + `${M.dungeons[br.end2.dnum]?.dname ?? ''}`;
            if (br.end1_up) bbuf += `, level ${depth(br.end2)}`;
            lines.push({ text: `${bbuf}.`, attr: 0 });
        }

        // C ref: print_mapseen()'s final_resting_place block — always entered
        // when final>0 (die-here bumps kncnt to 1); the bones-cemetery half of
        // that loop (other heroes' remains) isn't modeled since no covered
        // session ever reaches a level that already has bones.
        if (final === 2 && onHere) {
            lines.push({ text: `${OVERVIEW_PREFIX}Final resting place for`, attr: 0 });
            lines.push({
                text: `${OVERVIEW_PREFIX}${OVERVIEW_TAB}you, ${game._killer_name || 'died'}.`,
                attr: 0,
            });
        }
    }
    return lines;
}

// C ref: dbridge.c is_pool/is_lava/is_ice — terrain-class predicates.  The
// DB_UNDER (drawbridge-up) variants aren't tracked on the contest levels
// reached; the plain typ comparisons cover the ordinary cases.
function is_pool(x, y) {
    if (!isok(x, y)) return false;
    const t = game.level?.at(x, y)?.typ;
    return t === POOL || t === MOAT || t === WATER;
}
function is_lava(x, y) {
    if (!isok(x, y)) return false;
    const t = game.level?.at(x, y)?.typ;
    return t === LAVAPOOL || t === LAVAWALL;
}
function is_ice(x, y) {
    if (!isok(x, y)) return false;
    return game.level?.at(x, y)?.typ === ICE;
}
// C ref: stairs.c On_stairs(x,y) — stairway_at(x,y) != NULL.  Stairs live on
// game.stairs (mklev.js) with .sx/.sy coordinates.
function On_stairs(x, y) {
    for (let s = game.stairs; s; s = s.next)
        if (s.sx === x && s.sy === y) return true;
    return false;
}

// C ref: do_name.c:1492 hliquid(liquidpref) — js/do_name.js owns it.  The old
// identity stub here skipped the display-rng draw a hallucinating hero makes,
// which shifts every later hallucination pick.
export { hliquid } from './do_name.js';

// C ref: dungeon.c surface(x,y) — the noun for the terrain at (x,y) used in
// "sit on the %s", "Having fun sitting on the %s?", etc.  SURFACE_AT resolves
// a raised drawbridge to the terrain beneath it; the contest sessions never
// sit on a raised drawbridge, so the plain typ is used.
export function surface(x, y) {
    const u = game.u || {};
    const lev = game.level?.at(x, y) || {};
    const levtyp = lev.typ; // SURFACE_AT(x,y): DRAWBRIDGE_UP resolves under-typ
    const uz = u.uz;
    if (x === u.ux && y === u.uy && u.uswallow && u.ustuck)
        return 'maw'; /* swallowed: 'husk'/'maw' — not reached by contest hero */
    else if (IS_AIR(levtyp))
        return Is_waterlevel(uz) ? 'air bubble'
                                 : (levtyp === CLOUD) ? 'cloud' : 'air';
    else if (is_pool(x, y))
        return (u.uprops?.Underwater && !Is_waterlevel(uz))
            ? 'bottom' : hliquid('water');
    else if (is_ice(x, y))
        return 'ice';
    else if (is_lava(x, y))
        return hliquid('lava');
    else if (levtyp === DRAWBRIDGE_DOWN)
        return 'bridge';
    else if (IS_ALTAR(levtyp))
        return 'altar';
    else if (IS_GRAVE(levtyp))
        return 'headstone';
    else if (IS_FOUNTAIN(levtyp))
        return 'fountain';
    else if (On_stairs(x, y))
        return 'stairs';
    else if (IS_WALL(levtyp) || levtyp === SDOOR)
        return 'wall'; /* 'surface' during Passes_walls */
    else if (IS_DOOR(levtyp))
        return 'doorway'; /* even for closed door */
    else if (IS_ROOM(levtyp) && !Is_earthlevel(uz))
        return 'floor';
    else
        return 'ground';
}
