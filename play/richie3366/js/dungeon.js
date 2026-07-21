// dungeon.js — Dungeon topology initialization.
// C ref: dungeon.c — init_dungeons, init_dungeon_dungeons, init_level,
// place_level, parent_dlevel, init_castle_tune, fixup_level_locations.
//
// dungeon.lua is loaded in C via nhl_init → nhlib.lua (align shuffle) then
// dungeon tables. Here: nhlib shuffle stub + generated dungeonProto + C placement.

import { game } from './gstate.js';
import { rn2, rn1 } from './rng.js';
import { dungeonProto } from './generated/dungeon_data.js';
import {
    MAXLEVEL,
    MAXDUNGEON,
    LEV_LIMIT,
    BRANCH_LIMIT,
    TOWN,
    HELLISH,
    MAZELIKE,
    ROGUELIKE,
    UNCONNECTED,
    D_ALIGN_NONE,
    D_ALIGN_LAWFUL,
    D_ALIGN_NEUTRAL,
    D_ALIGN_CHAOTIC,
    D_ALIGN_MASK,
    TBR_STAIR,
    TBR_NO_UP,
    TBR_NO_DOWN,
    TBR_PORTAL,
    BR_STAIR,
    BR_NO_END1,
    BR_NO_END2,
    BR_PORTAL,
    ECMD_OK,
    COLNO,
    ROWNO,
    TREE,
    FOUNTAIN,
    THRONE,
    SINK,
    GRAVE,
    ALTAR,
    ASCENDED,
    ESCAPED,
} from './const.js';

const FLAG_MAP = {
    town: TOWN,
    hellish: HELLISH,
    mazelike: MAZELIKE,
    roguelike: ROGUELIKE,
    unconnected: UNCONNECTED,
};

const ALIGN_MAP = {
    unaligned: D_ALIGN_NONE,
    noalign: D_ALIGN_NONE,
    lawful: D_ALIGN_LAWFUL,
    neutral: D_ALIGN_NEUTRAL,
    chaotic: D_ALIGN_CHAOTIC,
};

const BRTYPE_MAP = {
    stair: TBR_STAIR,
    portal: TBR_PORTAL,
    no_down: TBR_NO_DOWN,
    no_up: TBR_NO_UP,
};

// Level name → game field for quick topology access (dungeon.c level_map[]).
const LEVEL_MAP = [
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
    ['x-strt', 'qstart_level'],
    ['x-loca', 'qlocate_level'],
    ['x-goal', 'nemesis_level'],
];

function get_dgn_flags(entry) {
    const f = entry?.flags;
    if (f == null) return 0;
    if (typeof f === 'string') return FLAG_MAP[f] || 0;
    if (Array.isArray(f)) {
        let bits = 0;
        for (const s of f) bits |= FLAG_MAP[s] || 0;
        return bits;
    }
    return 0;
}

function get_dgn_align(entry) {
    return ALIGN_MAP[entry?.alignment || 'unaligned'] ?? D_ALIGN_NONE;
}

function correct_branch_type(tbr) {
    switch (tbr.type) {
        case TBR_STAIR: return BR_STAIR;
        case TBR_NO_UP: return tbr.up ? BR_NO_END1 : BR_NO_END2;
        case TBR_NO_DOWN: return tbr.up ? BR_NO_END2 : BR_NO_END1;
        case TBR_PORTAL: return BR_PORTAL;
        default: return BR_STAIR;
    }
}

function branch_val(bp) {
    // C macro branch_val in dungeon.c insert_branch()
    const a = bp.end1.dnum * (MAXLEVEL + 1) + bp.end1.dlevel;
    const b = bp.end2.dnum * (MAXLEVEL + 1) + bp.end2.dlevel;
    return (a * (MAXDUNGEON + 1) * (MAXLEVEL + 1)) + b;
}

// C ref: dungeon.c insert_branch()
export function insert_branch(new_branch, extract_first) {
    const g = game;
    if (!g.branches) g.branches = [];
    if (extract_first) {
        const idx = g.branches.indexOf(new_branch);
        if (idx >= 0) g.branches.splice(idx, 1);
    }
    new_branch.next = null;
    const new_val = branch_val(new_branch);
    let insertAt = g.branches.length;
    for (let i = 0; i < g.branches.length; i++) {
        if (new_val <= branch_val(g.branches[i])) {
            insertAt = i;
            break;
        }
    }
    g.branches.splice(insertAt, 0, new_branch);
}

function find_branch(name, pd) {
    for (let i = 0; i < pd.n_brs; i++) {
        if (pd.tmpbranch[i].name === name) return i;
    }
    throw new Error(`find_branch: can't find ${name}`);
}

function parent_dnum(s, pd) {
    let i = find_branch(s, pd);
    for (let pdnum = 0; pd.tmpdungeon[pdnum].name !== s; pdnum++) {
        i -= pd.tmpdungeon[pdnum].branches;
        if (i < 0) return pdnum;
    }
    throw new Error('parent_dnum: couldn\'t resolve branch');
}

// C ref: dungeon.c level_range()
function level_range(dgn, base, randc, chain, pd) {
    const lmax = game.dungeons[dgn].num_dunlevs;
    let b = base;
    if (chain >= 0) {
        const levtmp = pd.final_lev[chain];
        if (!levtmp) throw new Error('level_range: empty chain level');
        b += levtmp.dlevel.dlevel;
    } else if (b < 0) {
        b = lmax + b + 1;
    }
    if (b < 1 || b > lmax) throw new Error('level_range: base value out of range');
    let count;
    if (randc === -1) count = lmax - b + 1;
    else if (randc) count = (b + randc - 1 > lmax) ? lmax - b + 1 : randc;
    else count = 1;
    return { base: b, count };
}

// C ref: dungeon.c parent_dlevel()
function parent_dlevel(s, pd) {
    const dnum = parent_dnum(s, pd);
    const bi = find_branch(s, pd);
    const { base, count: num } = level_range(
        dnum,
        pd.tmpbranch[bi].lev.base,
        pd.tmpbranch[bi].lev.rand,
        pd.tmpbranch[bi].chain,
        pd,
    );
    let i = rn2(num);
    const j = i;
    const branches = game.branches || [];
    do {
        if (++i >= num) i = 0;
        const dlevel = base + i;
        const curr = branches.find(br =>
            (br.end1.dnum === dnum && br.end1.dlevel === dlevel)
            || (br.end2.dnum === dnum && br.end2.dlevel === dlevel));
        if (!curr) return dlevel;
    } while (i !== j);
    return base + i;
}

function add_branch(dgn, child_entry_level, pd) {
    if (game._branch_id == null) game._branch_id = 0;
    const branch_num = find_branch(game.dungeons[dgn].dname, pd);
    const tbr = pd.tmpbranch[branch_num];
    const new_branch = {
        next: null,
        id: game._branch_id++,
        type: correct_branch_type(tbr),
        end1: {
            dnum: parent_dnum(game.dungeons[dgn].dname, pd),
            dlevel: parent_dlevel(game.dungeons[dgn].dname, pd),
        },
        end2: { dnum: dgn, dlevel: child_entry_level },
        end1_up: !!tbr.up,
    };
    insert_branch(new_branch, false);
    return new_branch;
}

function add_level(new_lev) {
    const g = game;
    if (!g.sp_levchn) g.sp_levchn = [];
    let insertAt = g.sp_levchn.length;
    for (let i = 0; i < g.sp_levchn.length; i++) {
        const curr = g.sp_levchn[i];
        if (curr.dlevel.dnum === new_lev.dlevel.dnum
            && curr.dlevel.dlevel > new_lev.dlevel.dlevel) {
            insertAt = i;
            break;
        }
    }
    g.sp_levchn.splice(insertAt, 0, new_lev);
}

// C ref: dungeon.c init_level()
function init_level(dgn, proto_index, pd) {
    const tlevel = pd.tmplevel[proto_index];
    pd.final_lev[proto_index] = null;
    // C: if (!wizard && tlevel->chance <= rn2(100)) return;
    if (!(game.flags?.debug) && tlevel.chance <= rn2(100)) return;

    const new_level = {
        proto: tlevel.name,
        boneid: tlevel.boneschar,
        dlevel: { dnum: dgn, dlevel: 0 },
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
    if (!new_level.flags.align) {
        new_level.flags.align = (pd.tmpdungeon[dgn].flags & D_ALIGN_MASK) >> 4;
    }
    pd.final_lev[proto_index] = new_level;
}

function possible_places(idx, map, pd) {
    const lev = pd.final_lev[idx];
    for (let i = 0; i <= MAXLEVEL; i++) map[i] = false;
    const { base: start, count } = level_range(
        lev.dlevel.dnum,
        pd.tmplevel[idx].lev.base,
        pd.tmplevel[idx].lev.rand,
        pd.tmplevel[idx].chain,
        pd,
    );
    let n = count;
    for (let i = start; i < start + count; i++) map[i] = true;
    for (let i = pd.start; i < idx; i++) {
        if (pd.final_lev[i] && map[pd.final_lev[i].dlevel.dlevel]) {
            map[pd.final_lev[i].dlevel.dlevel] = false;
            --n;
        }
    }
    return n;
}

function pick_level(map, nth) {
    for (let i = 1; i <= MAXLEVEL; i++) {
        if (map[i] && !nth--) return i;
    }
    throw new Error('pick_level: ran out of valid levels');
}

// C ref: dungeon.c place_level()
function place_level(proto_index, pd) {
    if (proto_index === pd.n_levs) return true;
    const lev = pd.final_lev[proto_index];
    if (!lev) return place_level(proto_index + 1, pd);

    const map = new Array(MAXLEVEL + 1).fill(false);
    let npossible = possible_places(proto_index, map, pd);
    for (; npossible; --npossible) {
        lev.dlevel.dlevel = pick_level(map, rn2(npossible));
        if (place_level(proto_index + 1, pd)) return true;
        map[lev.dlevel.dlevel] = false;
    }
    return false;
}

function init_dungeon_levels(levels, pd, dngidx) {
    const nlevels = levels?.length || 0;
    pd.tmpdungeon[dngidx].levels = nlevels;
    for (let f = 0; f < nlevels; f++) {
        const L = levels[f];
        const tmpl = {
            name: L.name,
            chainlvl: L.chainlevel || null,
            lev: { base: L.base, rand: L.range ?? 0 },
            chance: L.chance ?? 100,
            rndlevs: L.nlevels ?? 0,
            flags: get_dgn_flags(L) | get_dgn_align(L),
            boneschar: (L.bonetag && L.bonetag[0]) || 0,
            chain: -1,
        };
        if (tmpl.chainlvl) {
            for (let bi = 0; bi < pd.n_levs + f; bi++) {
                if (pd.tmplevel[bi].name === tmpl.chainlvl) {
                    tmpl.chain = bi;
                    break;
                }
            }
            if (tmpl.chain === -1) {
                throw new Error(`Could not chain level ${tmpl.name} to ${tmpl.chainlvl}`);
            }
        }
        pd.tmplevel[pd.n_levs + f] = tmpl;
    }
    pd.n_levs += nlevels;
    if (pd.n_levs > LEV_LIMIT) throw new Error('init_dungeon: too many special levels');
}

function init_dungeon_branches(branches, pd, dngidx) {
    const nbranches = branches?.length || 0;
    pd.tmpdungeon[dngidx].branches = nbranches;
    for (let f = 0; f < nbranches; f++) {
        const B = branches[f];
        const tmpb = {
            name: B.name,
            lev: { base: B.base, rand: B.range ?? 0 },
            type: BRTYPE_MAP[B.branchtype || 'stair'] ?? TBR_STAIR,
            up: (B.direction || 'down') === 'up',
            chain: -1,
        };
        if (B.chainlevel) {
            // C: for (bi = 0; bi < pd->n_levs + f - 1; bi++)
            // At branch-parse time levels for this dungeon are already in pd.
            for (let bi = 0; bi < pd.n_levs + f - 1; bi++) {
                if (pd.tmplevel[bi]?.name === B.chainlevel) {
                    tmpb.chain = bi;
                    break;
                }
            }
            if (tmpb.chain === -1) {
                // Prefer matching among all levels so far (same as successful C path).
                for (let bi = 0; bi < pd.n_levs; bi++) {
                    if (pd.tmplevel[bi].name === B.chainlevel) {
                        tmpb.chain = bi;
                        break;
                    }
                }
            }
            if (tmpb.chain === -1) {
                throw new Error(`Could not chain branch ${B.name} to level ${B.chainlevel}`);
            }
        }
        pd.tmpbranch[pd.n_brs + f] = tmpb;
    }
    pd.n_brs += nbranches;
    if (pd.n_brs > BRANCH_LIMIT) throw new Error('init_dungeon: too many branches');
}

function init_dungeon_set_entry(pd, dngidx) {
    const dgn_entry = pd.tmpdungeon[dngidx].entry_lev;
    const dun = game.dungeons[dngidx];
    if (dgn_entry < 0) {
        dun.entry_lev = dun.num_dunlevs + dgn_entry + 1;
        if (dun.entry_lev <= 0) dun.entry_lev = 1;
    } else if (dgn_entry > 0) {
        dun.entry_lev = dgn_entry;
        if (dun.entry_lev > dun.num_dunlevs) dun.entry_lev = dun.num_dunlevs;
    } else {
        dun.entry_lev = 1;
    }
}

function depth_of(lev) {
    return game.dungeons[lev.dnum].depth_start + lev.dlevel - 1;
}

function init_dungeon_set_depth(pd, dngidx) {
    const br = add_branch(dngidx, game.dungeons[dngidx].entry_lev, pd);
    let from_depth;
    let from_up;
    if (br.end1.dnum === dngidx) {
        from_depth = depth_of(br.end2);
        from_up = !br.end1_up;
    } else {
        from_depth = depth_of(br.end1);
        from_up = br.end1_up;
    }
    game.dungeons[dngidx].depth_start =
        from_depth + (br.type === BR_PORTAL ? 0 : (from_up ? -1 : 1))
        - (game.dungeons[dngidx].entry_lev - 1);
}

// C ref: dungeon.c init_dungeon_dungeons() — returns false if chance skip.
function init_dungeon_dungeons(entry, pd, dngidx) {
    const dgn_name = entry.name;
    const dgn_base = entry.base;
    const dgn_range = entry.range ?? 0;
    const dgn_align = get_dgn_align(entry);
    const dgn_entry = entry.entry ?? 0;
    const dgn_chance = entry.chance ?? 100;
    const dgn_flags = get_dgn_flags(entry);
    const dgn_fill = entry.lvlfill || '';
    const dgn_themerms = entry.themerooms || '';
    const dgn_protoname = entry.protofile || '';
    const dgn_bonetag = entry.bonetag || '';

    // C: if (!wizard && dgn_chance && (dgn_chance <= rn2(100)))
    if (!(game.flags?.debug) && dgn_chance && (dgn_chance <= rn2(100))) {
        game.n_dgns--;
        return false;
    }

    if (entry.levels) init_dungeon_levels(entry.levels, pd, dngidx);
    else pd.tmpdungeon[dngidx].levels = 0;

    if (entry.branches) init_dungeon_branches(entry.branches, pd, dngidx);
    else pd.tmpdungeon[dngidx].branches = 0;

    pd.tmpdungeon[dngidx].name = dgn_name;
    pd.tmpdungeon[dngidx].protoname = dgn_protoname;
    pd.tmpdungeon[dngidx].boneschar = dgn_bonetag ? dgn_bonetag.charCodeAt(0) : 0;
    pd.tmpdungeon[dngidx].lev = { base: dgn_base, rand: dgn_range };
    pd.tmpdungeon[dngidx].flags = dgn_flags; // align kept separate (dungeon.c)
    pd.tmpdungeon[dngidx].align = dgn_align;
    pd.tmpdungeon[dngidx].chance = dgn_chance;
    pd.tmpdungeon[dngidx].entry_lev = dgn_entry;

    if (!game.dungeons) game.dungeons = [];
    game.dungeons[dngidx] = {
        dname: dgn_name,
        proto: dgn_protoname,
        fill_lvl: dgn_fill,
        themerms: dgn_themerms,
        boneid: dgn_bonetag ? dgn_bonetag.charCodeAt(0) : 0,
        num_dunlevs: 0,
        ledger_start: 0,
        depth_start: 1,
        dunlev_ureached: 0,
        entry_lev: 1,
        flags: {
            hellish: !!(dgn_flags & HELLISH),
            maze_like: !!(dgn_flags & MAZELIKE),
            rogue_like: !!(dgn_flags & ROGUELIKE),
            // C: d_flags.align is a 3-bit bitfield; assigning D_ALIGN_*
            // (e.g. LAWFUL=0x40) truncates to 0 — match that for induced_align.
            align: dgn_align & 7,
            unconnected: !!(dgn_flags & UNCONNECTED),
        },
    };

    if (dgn_range) {
        game.dungeons[dngidx].num_dunlevs = rn1(dgn_range, dgn_base);
    } else {
        game.dungeons[dngidx].num_dunlevs = dgn_base;
    }

    if (!dngidx) {
        game.dungeons[dngidx].ledger_start = 0;
        game.dungeons[dngidx].depth_start = 1;
        game.dungeons[dngidx].dunlev_ureached = 1;
    } else {
        game.dungeons[dngidx].ledger_start =
            game.dungeons[dngidx - 1].ledger_start
            + game.dungeons[dngidx - 1].num_dunlevs;
        game.dungeons[dngidx].dunlev_ureached = 0;
    }

    game.dungeons[dngidx].flags.hellish = !!(dgn_flags & HELLISH);
    game.dungeons[dngidx].flags.maze_like = !!(dgn_flags & MAZELIKE);
    game.dungeons[dngidx].flags.rogue_like = !!(dgn_flags & ROGUELIKE);
    game.dungeons[dngidx].flags.align = dgn_align & 7;
    game.dungeons[dngidx].flags.unconnected = !!(dgn_flags & UNCONNECTED);

    init_dungeon_set_entry(pd, dngidx);

    if (game.dungeons[dngidx].flags.unconnected) {
        game.dungeons[dngidx].depth_start = 1;
    } else if (dngidx) {
        init_dungeon_set_depth(pd, dngidx);
    }

    if (game.dungeons[dngidx].num_dunlevs > MAXLEVEL) {
        game.dungeons[dngidx].num_dunlevs = MAXLEVEL;
    }
    return true;
}

// C ref: dungeon.c init_castle_tune()
function init_castle_tune() {
    const tune = [];
    for (let i = 0; i < 5; i++) tune.push(String.fromCharCode('A'.charCodeAt(0) + rn2(7)));
    game.tune = tune.join('');
}

/** C ref: dungeon.c find_level — match proto name in sp_levchn. */
/**
 * C ref: dungeon.c get_level — map logical depth to d_level in current
 * dungeon tree (walk parents via branches when above depth_start).
 */
export function get_level(newlevel, levnum) {
    let dgn = game.u?.uz?.dnum | 0;
    const dungeons = game.dungeons || [];
    const dun = () => dungeons[dgn];
    if (levnum <= 0) {
        // C: can only currently happen in endgame
        levnum = game.u?.uz?.dlevel | 0;
    } else if (levnum > ((dun()?.depth_start | 0) + (dun()?.num_dunlevs | 0) - 1)) {
        levnum = dun()?.num_dunlevs | 0;
    } else {
        if (levnum < (dun()?.depth_start | 0)) {
            do {
                const br = (game.branches || []).find(
                    (b) => (b.end2?.dnum | 0) === dgn,
                );
                if (!br) break; // C panics; soft-fail keeps current dgn
                dgn = br.end1?.dnum | 0;
            } while (levnum < (dun()?.depth_start | 0));
        }
        levnum = levnum - (dun()?.depth_start | 0) + 1;
    }
    newlevel.dnum = dgn;
    newlevel.dlevel = levnum;
}

/**
 * C ref: dungeon.c find_hell — gateway to Gehennom (valley dlevel 1).
 */
export function find_hell(lev) {
    const v = game.valley_level;
    lev.dnum = v?.dnum | 0;
    lev.dlevel = 1;
}

export function find_level(name) {
    const want = name.toLowerCase();
    for (const curr of game.sp_levchn || []) {
        if ((curr.proto || '').toLowerCase() === want) return curr;
    }
    return null;
}

/** C ref: dungeon.h In_tutorial — dnum == tutorial_dnum. */
export function In_tutorial(lev) {
    const td = game.tutorial_dnum;
    if (td == null || td < 0) return false;
    return (lev?.dnum | 0) === (td | 0);
}

function dname_to_dnum(s) {
    for (let i = 0; i < game.n_dgns; i++) {
        if (game.dungeons[i].dname === s) return i;
    }
    throw new Error(`Couldn't resolve dungeon number for name "${s}"`);
}

/**
 * C ref: dungeon.c dungeon_branch — branch whose end2 (child) is named dungeon.
 * Assumes end1 is always the parent.
 */
export function dungeon_branch(s) {
    const dnum = dname_to_dnum(s);
    const br = (game.branches || []).find(b => (b.end2?.dnum | 0) === dnum);
    if (!br) throw new Error(`dgn_entrance: can't find entrance to ${s}`);
    return br;
}

/**
 * C ref: dungeon.c at_dgn_entrance — hero on parent end1 of named branch.
 */
export function at_dgn_entrance(s) {
    const br = dungeon_branch(s);
    const uz = game.u?.uz;
    return !!uz
        && (uz.dnum | 0) === (br.end1.dnum | 0)
        && (uz.dlevel | 0) === (br.end1.dlevel | 0);
}

function assign_level(destName, dlevel) {
    game[destName] = { dnum: dlevel.dnum, dlevel: dlevel.dlevel };
}

// C ref: dungeon.c fixup_level_locations()
function fixup_level_locations() {
    for (const [lev_name, field] of LEVEL_MAP) {
        const x = find_level(lev_name);
        if (x) {
            assign_level(field, x.dlevel);
            if (lev_name.startsWith('x-')) {
                const code = game.urole?.filecode || 'Tou';
                x.proto = code + lev_name.slice(1);
            } else if (field === 'knox_level') {
                const br = (game.branches || []).find(b =>
                    b.end2.dnum === game.knox_level.dnum
                    && b.end2.dlevel === game.knox_level.dlevel);
                if (br) {
                    br.end1.dnum = game.n_dgns;
                    insert_branch(br, true);
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
        const dun = game.dungeons[i];
        if (dun.num_dunlevs > 1 - dun.depth_start) {
            dun.depth_start -= 1;
        }
    }
}

// C ref: nhl_init() loads nhlib.lua which shuffles align[].
// nhlib math.random(i) → 1+nh.rn2(i); Fisher-Yates with rn2(i) matches logged calls.
// Also used by questpgr.com_pager_core nhl_init before loading quest.lua.
export function nhl_nhlib_align_shuffle() {
    const align = ['law', 'neutral', 'chaos'];
    for (let i = align.length; i > 1; i--) {
        const j = rn2(i);
        [align[i - 1], align[j]] = [align[j], align[i - 1]];
    }
    game._nhl_align = align;
}

/**
 * C ref: dungeon.c init_dungeons()
 * Call after init_objects / role setup; before u_init_misc / l_nhcore_init.
 */
export function init_dungeons() {
    const pd = {
        start: 0,
        n_levs: 0,
        n_brs: 0,
        tmpdungeon: [],
        tmplevel: [],
        tmpbranch: [],
        final_lev: [],
    };

    // nhl_init for dungeon.lua loads nhlib.lua → shuffle(align)
    nhl_nhlib_align_shuffle();

    game.sp_levchn = [];
    game.branches = [];
    game.dungeons = [];
    game._branch_id = 0;
    game.n_dgns = dungeonProto.length;

    if (game.n_dgns >= MAXDUNGEON) throw new Error('init_dungeons: too many dungeons');

    let cl = 0;
    let i = 0;
    for (const entry of dungeonProto) {
        // Ensure slot exists for tmpdungeon bookkeeping even before fill
        if (!pd.tmpdungeon[i]) pd.tmpdungeon[i] = { branches: 0, levels: 0 };
        if (init_dungeon_dungeons(entry, pd, i)) {
            for (; cl < pd.n_levs; cl++) {
                init_level(i, cl, pd);
            }
            if (!place_level(pd.start, pd)) {
                throw new Error("init_dungeon: couldn't place levels");
            }
            for (; pd.start < pd.n_levs; pd.start++) {
                if (pd.final_lev[pd.start]) add_level(pd.final_lev[pd.start]);
            }
            i++;
        }
    }
    // After skips, n_dgns already adjusted; i is final count
    game.n_dgns = i;

    init_castle_tune();
    fixup_level_locations();
}

/**
 * C ref: dungeon.c init_mapseen — create mapseen node sorted by
 * dnum then dlevel; clear lastseentyp for the new level.
 */
export function init_mapseen(lev) {
    const uz = lev || game.u?.uz || { dnum: 0, dlevel: 1 };
    const dnum = uz.dnum | 0;
    const dlevel = uz.dlevel | 0;
    if (!game.mapseenchn) game.mapseenchn = [];
    // Already present (re-entry) — C always allocates; JS dedupes
    const existing = game.mapseenchn.find(
        (m) => (m.lev?.dnum | 0) === dnum && (m.lev?.dlevel | 0) === dlevel,
    );
    if (existing) {
        game.lastseentyp = null;
        return existing;
    }
    const init = {
        lev: { dnum, dlevel },
        custom: null,
        custom_lth: 0,
        flags: {},
        feat: empty_feat(),
        br: null,
        final_resting_place: null,
    };
    // C: memset lastseentyp on each init_mapseen
    game.lastseentyp = null;
    let inserted = false;
    for (let i = 0; i < game.mapseenchn.length; i++) {
        const m = game.mapseenchn[i];
        const md = m.lev?.dnum | 0;
        const ml = m.lev?.dlevel | 0;
        if (md > dnum || (md === dnum && ml > dlevel)) {
            game.mapseenchn.splice(i, 0, init);
            inserted = true;
            break;
        }
    }
    if (!inserted) game.mapseenchn.push(init);
    return init;
}

/**
 * Ensure a mapseen node exists for the given (or current) level.
 * C always has one after init_mapseen on level entry; JS creates lazily
 * for overview/annotation when mklev path was skipped.
 */
function ensure_mapseen(lev) {
    return init_mapseen(lev);
}

function empty_feat() {
    return {
        nfount: 0,
        nsink: 0,
        nthrone: 0,
        naltar: 0,
        ngrave: 0,
        ntree: 0,
        nshop: 0,
        ntemple: 0,
        shoptype: 0,
        msalign: 0,
    };
}

function OF_INTEREST(feat) {
    return !!(feat.nfount || feat.nsink || feat.nthrone || feat.naltar
        || feat.ngrave || feat.ntree || feat.nshop || feat.ntemple);
}

/** Ensure lastseentyp[COLNO][ROWNO]; C svl.lastseentyp. */
function ensure_lastseentyp() {
    if (!game.lastseentyp) {
        const a = new Array(COLNO);
        for (let x = 0; x < COLNO; x++) a[x] = new Array(ROWNO).fill(0);
        game.lastseentyp = a;
    }
    return game.lastseentyp;
}

/**
 * C ref: dungeon.c update_lastseentyp — remember terrain typ when mapped.
 * DRAWBRIDGE_UP under-typ and furniture-mimic cmap_to_type deferred.
 */
export function update_lastseentyp(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return;
    const lst = ensure_lastseentyp();
    lst[x][y] = loc.typ | 0;
}

/**
 * C ref: dungeon.c count_feat_lastseentyp — bump mapseen.feat from lastseentyp.
 * Cap at 3 ("many"); altar msalign / knox / drawbridge castle flags deferred.
 */
function count_feat_lastseentyp(mptr, x, y) {
    const typ = game.lastseentyp?.[x]?.[y] | 0;
    let count;
    switch (typ) {
    case TREE:
        count = (mptr.feat.ntree | 0) + 1;
        if (count <= 3) mptr.feat.ntree = count;
        break;
    case FOUNTAIN:
        count = (mptr.feat.nfount | 0) + 1;
        if (count <= 3) mptr.feat.nfount = count;
        break;
    case THRONE:
        count = (mptr.feat.nthrone | 0) + 1;
        if (count <= 3) mptr.feat.nthrone = count;
        break;
    case SINK:
        count = (mptr.feat.nsink | 0) + 1;
        if (count <= 3) mptr.feat.nsink = count;
        break;
    case GRAVE:
        count = (mptr.feat.ngrave | 0) + 1;
        if (count <= 3) mptr.feat.ngrave = count;
        break;
    case ALTAR:
        count = (mptr.feat.naltar | 0) + 1;
        if (count <= 3) mptr.feat.naltar = count;
        // msalign / Amask2msa deferred
        break;
    default:
        break;
    }
}

/**
 * C ref: dungeon.c recalc_mapseen — reset current-level feat counts from
 * lastseentyp. Shop/temple room traversal, bones, valley/sanctum flags,
 * and Blind bigroom deferred (named in C-JS-MAP).
 */
export function recalc_mapseen() {
    const mptr = ensure_mapseen(null);
    mptr.feat = empty_feat();
    // C: if (!Levitation) update_lastseentyp(u.ux, u.uy);
    const u = game.u;
    if (u && !u.Levitation && u.ux > 0) {
        update_lastseentyp(u.ux, u.uy);
    }
    ensure_lastseentyp();
    for (let x = 1; x < COLNO; x++) {
        for (let y = 0; y < ROWNO; y++) {
            count_feat_lastseentyp(mptr, x, y);
        }
    }
    return mptr;
}

/** C ref: dungeon.c seen_string — 0/1/2/3 → no/a|an/some/many */
function seen_string(n, obj) {
    switch (n | 0) {
    case 0: return 'no';
    case 1: {
        const c = (obj && obj[0] || 'x').toLowerCase();
        return 'aeiou'.includes(c) ? 'an' : 'a';
    }
    case 2: return 'some';
    case 3: return 'many';
    default: return '(unknown)';
    }
}

function plur(n) {
    return (n | 0) === 1 ? '' : 's';
}

/**
 * C ref: dungeon.c print_mapseen OF_INTEREST feature sentence (PREFIX +
 * ADDNTOBUF). Shop/temple/altar-to-god deferred when counts are 0.
 */
function mapseen_feat_line(mptr) {
    const feat = mptr.feat || empty_feat();
    if (!OF_INTEREST(feat)) return null;
    const PREFIX = '      ';
    let buf = '';
    let i = 0;
    const COMMA = () => (i++ > 0 ? ', ' : PREFIX);
    const ADDNTOBUF = (nam, v) => {
        if (!v) return;
        buf += `${COMMA()}${seen_string(v, nam)} ${nam}${plur(v)}`;
    };
    // Shop / temple+altar order matches C; shoptype/an(shop) deferred
    if ((feat.nshop | 0) > 0) {
        if ((feat.nshop | 0) > 1) ADDNTOBUF('shop', feat.nshop);
        else buf += `${COMMA()}a shop`; // shop_string deferred
    }
    if ((feat.naltar | 0) > 0 || (feat.ntemple | 0) > 0) {
        const nt = feat.ntemple | 0;
        const na = feat.naltar | 0;
        if (nt && na) {
            buf += `${COMMA()}${seen_string(nt, 'temple')} temple${plur(nt)} and ${seen_string(na, 'altar')} altar${plur(na)}`;
        } else if (nt) ADDNTOBUF('temple', nt);
        else ADDNTOBUF('altar', na);
        // " to <god>" when all altars coaligned deferred
    }
    ADDNTOBUF('throne', feat.nthrone);
    ADDNTOBUF('fountain', feat.nfount);
    ADDNTOBUF('sink', feat.nsink);
    ADDNTOBUF('grave', feat.ngrave);
    ADDNTOBUF('tree', feat.ntree);
    if (!buf) return null;
    // C: capitalize after PREFIX → sentence + '.'
    const idx = PREFIX.length;
    if (buf.length > idx) {
        buf = buf.slice(0, idx) + buf[idx].toUpperCase() + buf.slice(idx + 1);
    }
    return `${buf}.`;
}

/**
 * C ref: dungeon.c get_annotation — mapseen.custom for lev, or null.
 */
function get_annotation(lev) {
    const uz = lev || game.u?.uz || { dnum: 0, dlevel: 1 };
    const dnum = uz.dnum | 0;
    const dlevel = uz.dlevel | 0;
    const mptr = (game.mapseenchn || []).find(
        (m) => (m.lev?.dnum | 0) === dnum && (m.lev?.dlevel | 0) === dlevel,
    );
    return mptr?.custom || null;
}

/**
 * C ref: dungeon.c print_level_annotation — You("remember this level as %s.").
 * Called from goto_level after arrival; forces --More-- before Blind feel
 * check_here when the level was #annotate'd (D-0928).
 */
export async function print_level_annotation() {
    const { pline } = await import('./display.js');
    const annotation = get_annotation(game.u?.uz);
    if (annotation) await pline(`You remember this level as ${annotation}.`);
}

/**
 * C ref: dungeon.c query_annotation — getlin level name into mapseen.custom.
 * Branch envelope: current-level annotate (no prior custom / no EDIT_GETLIN).
 * Replace-annotation prompt and other-level describe_level deferred.
 */
async function query_annotation(lev) {
    const { getlin } = await import('./getline.js');
    const mptr = ensure_mapseen(lev);
    let nbuf;
    if (mptr.custom) {
        // C non-EDIT_GETLIN replace prompt deferred → treat as fresh getlin
        nbuf = await getlin(
            `Replace annotation "${String(mptr.custom).slice(0, 30)}${String(mptr.custom).length > 30 ? '...' : ''}" with?`,
        );
    } else {
        nbuf = await getlin('What do you want to call this dungeon level?');
    }
    if (!nbuf || nbuf === '\x1b') return;
    // C mungspaces — trim + compress consecutive spaces
    nbuf = nbuf.trim().replace(/\s+/g, ' ');
    if (!nbuf || nbuf === ' ') {
        mptr.custom = null;
        mptr.custom_lth = 0;
        return;
    }
    mptr.custom = nbuf;
    mptr.custom_lth = nbuf.length;
}

/**
 * C ref: dungeon.c donamelevel (#annotate).
 * menu_requested → dooverview deferred (no 'm' prefix path here).
 */
export async function donamelevel() {
    if (game.iflags?.menu_requested) {
        game.iflags.menu_requested = false;
        return dooverview();
    }
    await query_annotation(null);
    return ECMD_OK;
}

/**
 * C ref: dungeon.c show_overview / print_mapseen (subset).
 * why: 0 #overview; 1/2 end disclosure (lived/died); -1 menu deferred.
 * End disclosure uses select_menu PICK_NONE → corner "(end)", not
 * display_nhwindow --More-- (unlike enlightenment putstr path).
 * Named omissions: interest_mapseen filter for why==0 beyond current;
 * endgame traverse; builds_up range headers; OF_INTEREST features;
 * branches; cemetery bones list beyond dead hero; wizard proto names;
 * PICK_ONE annotation menu (why==-1).
 * @param {number} why
 * @param {number} reason how-died when why>0
 */
export async function show_overview(why = 0, reason = 0) {
    const { formatkiller } = await import('./end.js');
    const { ATR_INVERSE } = await import('./terminal.js');
    const { nhgetch } = await import('./input.js');
    const { flush_screen, flush_topl_more, docrt } = await import('./display.js');
    const { paint_corner_nhw_menu } = await import('./invent.js');

    recalc_mapseen();
    const u = game.u || {};
    const entries = [];
    let lastdun = -1;

    const chain = game.mapseenchn || [];
    for (const mptr of chain) {
        if (why === 0) {
            const cur = (mptr.lev?.dnum | 0) === (u.uz?.dnum | 0)
                && (mptr.lev?.dlevel | 0) === (u.uz?.dlevel | 0);
            if (!cur) continue;
        }
        const dnum = mptr.lev?.dnum | 0;
        const printdun = dnum !== lastdun;
        lastdun = dnum;
        const dun = game.dungeons?.[dnum];
        const dname = dun?.dname || 'The Dungeons of Doom';
        if (printdun) {
            // C print_mapseen: entry-only → "Name:"; else "Name: levels A to B"
            const depthstart = (dun?.depth_start | 0) || 1;
            const ureached = dun?.dunlev_ureached | 0;
            const entry = dun?.entry_lev | 0;
            let hdr = `${dname}:`;
            if (ureached && entry && ureached !== entry) {
                // builds_up deferred — ordinary descending DoD
                hdr = `${dname}: levels ${depthstart} to ${depthstart + ureached - 1}`;
            }
            // C end disclosure: menu heading highlight suppressed (ATR_NONE);
            // in-progress #overview uses menu_headings (inverse).
            entries.push({
                text: hdr,
                attr: why > 0 ? 0 : ATR_INVERSE,
            });
        }
        const depthstart = (dun?.depth_start | 0) || 1;
        const levnum = depthstart + (mptr.lev?.dlevel | 0) - 1;
        const TAB = '   ';
        let levLine = `${why !== -1 ? TAB : ''}Level ${levnum}:`;
        if (mptr.custom) levLine += ` "${mptr.custom}"`;
        const onHere = (mptr.lev?.dnum | 0) === (u.uz?.dnum | 0)
            && (mptr.lev?.dlevel | 0) === (u.uz?.dlevel | 0);
        if (onHere) {
            const verb = (why <= 0 || (why === 1 && reason === ASCENDED))
                ? 'are'
                : (why === 1 && reason === ESCAPED)
                    ? 'left from'
                    : 'were';
            levLine += ` <- You ${verb} here.`;
        }
        entries.push({ text: levLine, attr: 0 });

        if (why > 0 && onHere) {
            const PREFIX = '      ';
            entries.push({ text: `${PREFIX}Final resting place for`, attr: 0 });
            let killer = formatkiller(reason, true);
            killer = killer.replace(/ himself/g, ' yourself')
                .replace(/ herself/g, ' yourself')
                .replace(/ his /g, ' your ')
                .replace(/ her /g, ' your ');
            entries.push({ text: `${PREFIX}${TAB}you, ${killer}.`, attr: 0 });
        } else if (why === 0) {
            const featLine = mapseen_feat_line(mptr);
            if (featLine) entries.push({ text: featLine, attr: 0 });
        }
    }

    await flush_topl_more();
    // C select_menu PICK_NONE (why != -1) → "(end)"
    for (;;) {
        await paint_corner_nhw_menu(entries, '(end) ');
        const key = await nhgetch();
        game._menu_overlay = false;
        await docrt();
        await flush_screen(1);
        if (key === 27 || key === 32 || key === 13 || key === 10) break;
    }
    if (game.iflags) game.iflags.menu_requested = false;
}

/**
 * C ref: dungeon.c dooverview / show_overview (#overview).
 * Branch envelope: why=0 PICK_NONE current-level line + feature sentence
 * (print_mapseen OF_INTEREST) + ESC/space dismiss.
 * Full traverse_mapseenchn / interest_mapseen / shop_string / altar-god /
 * auto-annotation flags deferred.
 */
export async function dooverview() {
    await show_overview(0, 0);
    return ECMD_OK;
}

/** C ref: dungeon.c br_string — branch type label for print_dungeon. */
function br_string(type) {
    switch (type) {
        case BR_PORTAL: return 'Portal';
        case BR_NO_END1: return 'Connection';
        case BR_NO_END2: return 'One way stair';
        case BR_STAIR: return 'Stair';
        default: return ' (unknown)';
    }
}

/** C ref: dungeon.c chr_u_on_lvl — '*' when hero is on this d_level. */
function chr_u_on_lvl(dlev) {
    const u = game.u?.uz;
    return (u?.dnum | 0) === (dlev?.dnum | 0)
        && (u?.dlevel | 0) === (dlev?.dlevel | 0)
        ? '*'
        : ' ';
}

/**
 * C ref: dungeon.c unplaced_floater — Knox still floating off n_dgns.
 */
function unplaced_floater(dptr, idx) {
    if (!game.knox_level || idx !== (game.knox_level.dnum | 0)) return false;
    const n = game.n_dgns | 0;
    for (const br of game.branches || []) {
        if ((br.end1?.dnum | 0) === n && (br.end2?.dnum | 0) === idx) {
            return true;
        }
    }
    return false;
}

/**
 * C ref: dungeon.c unreachable_level — unplaced / endgame / dummy.
 */
function unreachable_level(lvl, unplaced) {
    if (unplaced) return true;
    const astral = game.astral_level;
    const uz = game.u?.uz;
    const heroEnd = !!(uz && astral && (uz.dnum | 0) === (astral.dnum | 0));
    const levEnd = !!(lvl && astral && (lvl.dnum | 0) === (astral.dnum | 0));
    if (heroEnd && !levEnd) return true;
    const dummy = find_level('dummy');
    if (dummy && (lvl?.dnum | 0) === (dummy.dlevel?.dnum | 0)
        && (lvl?.dlevel | 0) === (dummy.dlevel?.dlevel | 0)) {
        return true;
    }
    return false;
}

/**
 * C ref: dungeon.c tport_menu — record choice + add selectable/unreachable row.
 * Continuous a..z then A.. menuletter; unreachable still consumes a letter.
 */
function tport_menu(raw, entry, lchoices, lvl, cannotreach) {
    const idx = lchoices.idx;
    lchoices.lev[idx] = lvl.dlevel | 0;
    lchoices.dgn[idx] = lvl.dnum | 0;
    lchoices.playerlev[idx] = depth_of(lvl);
    if (cannotreach) {
        raw.push({
            text: `    ${entry}`,
            selectable: false,
            attr: 0,
        });
    } else {
        raw.push({
            text: entry,
            selectable: true,
            selector: lchoices.menuletter,
            attr: 0,
            choiceIdx: idx,
        });
    }
    if (lchoices.menuletter === 'z') lchoices.menuletter = 'A';
    else {
        lchoices.menuletter = String.fromCharCode(
            lchoices.menuletter.charCodeAt(0) + 1,
        );
    }
    lchoices.idx++;
}

/**
 * C ref: dungeon.c print_branch — child branches in (lower, upper] for dnum.
 */
function print_branch(raw, dnum, lowerBound, upperBound, bymenu, lchoices) {
    for (const br of game.branches || []) {
        if ((br.end1?.dnum | 0) !== dnum) continue;
        const ed = br.end1.dlevel | 0;
        if (!(lowerBound < ed && ed <= upperBound)) continue;
        const destName = game.dungeons?.[br.end2?.dnum | 0]?.dname || '?';
        const buf = `${bymenu ? chr_u_on_lvl(br.end1) : ' '} ${br_string(br.type)} to ${destName}: ${depth_of(br.end1)}`;
        if (bymenu) {
            tport_menu(
                raw,
                buf,
                lchoices,
                br.end1,
                unreachable_level(br.end1, false),
            );
        }
        // non-bymenu putstr deferred
    }
}

/**
 * C ref: dungeon.c print_dungeon — wizard ^V `?` level-teleport menu.
 *
 * Ported: bymenu=TRUE PICK_ONE path (headings + specials + branches +
 * continuous selectors + unreachable Knox letter skip) + tty_end_menu
 * prompt/blank row (D-0563) + bot() after dismiss (D-0568). Sets dest.lev /
 * dest.dgn and returns
 * logical depth (playerlev), or 0 on cancel.
 * Named omissions: bymenu=FALSE putstr/display path (wizwhere); floating
 * branches listing; Invocation/portal debug lines; endgame amulet grant
 * after pick (level_tele).
 *
 * @param {boolean} bymenu
 * @param {{ lev?: number, dgn?: number } | null} dest
 * @returns {Promise<number>}
 */
export async function print_dungeon(bymenu, dest = null) {
    if (!bymenu) {
        // putstr overview deferred
        return 0;
    }

    const { ATR_INVERSE } = await import('./terminal.js');
    const { select_menu_pick_one } = await import('./options.js');
    const { makeplural } = await import('./objnam.js');
    const { Is_stronghold } = await import('./const.js');

    // C tty_end_menu(prompt): prepends blank then prompt onto reversed
    // mlist → display order is prompt, "", items (wintty.c).
    const raw = [
        { text: 'Level teleport to where:', attr: ATR_INVERSE, selectable: false },
        { text: '', attr: 0, selectable: false },
    ];
    const lchoices = {
        idx: 0,
        lev: [],
        playerlev: [],
        dgn: [],
        menuletter: 'a',
    };

    const nDgns = game.n_dgns | 0;
    const astral = game.astral_level;
    const uz = game.u?.uz;
    const inEndgame = !!(uz && astral && (uz.dnum | 0) === (astral.dnum | 0));

    for (let i = 0; i < nDgns; i++) {
        const dptr = game.dungeons[i];
        if (!dptr) continue;
        if (bymenu && inEndgame && astral && i !== (astral.dnum | 0)) continue;

        const unplaced = unplaced_floater(dptr, i);
        const descr = unplaced ? 'depth' : 'level';
        const nlev = dptr.num_dunlevs | 0;
        const depthStart = dptr.depth_start | 0;
        let buf;
        if (nlev > 1) {
            buf = `${dptr.dname}: ${makeplural(descr)} ${depthStart} to ${depthStart + nlev - 1}`;
        } else {
            buf = `${dptr.dname}: ${descr} ${depthStart}`;
        }
        const entryLev = dptr.entry_lev | 0;
        if (entryLev !== 1) {
            if (entryLev === nlev) buf += ', entrance from below';
            else buf += `, entrance on ${depthStart + entryLev - 1}`;
        }
        raw.push({ text: buf, attr: ATR_INVERSE, selectable: false });

        let lastLevel = 0;
        for (const slev of game.sp_levchn || []) {
            if ((slev.dlevel?.dnum | 0) !== i) continue;
            print_branch(raw, i, lastLevel, slev.dlevel.dlevel | 0, true, lchoices);
            let line = `${chr_u_on_lvl(slev.dlevel)} ${slev.proto}: ${depth_of(slev.dlevel)}`;
            if (Is_stronghold(slev.dlevel) && game.tune) {
                line += ` (tune ${game.tune})`;
            }
            tport_menu(
                raw,
                line,
                lchoices,
                slev.dlevel,
                unreachable_level(slev.dlevel, unplaced),
            );
            lastLevel = slev.dlevel.dlevel | 0;
        }
        print_branch(raw, i, lastLevel, MAXLEVEL, true, lchoices);
    }

    const res = await select_menu_pick_one(raw);
    // C wintty: dismissing a fullscreen menu that covered WIN_STATUS sets
    // disp.botlx and calls bot() immediately. select_menu_pick_one still
    // clear_committed_status for Options→submenu blanking (D-0385); restore
    // here so the next pline/--More-- (e.g. Endgame prerequisite) shows botl.
    const { bot } = await import('./display.js');
    await bot();
    if (res.kind !== 'pick' || res.item?.choiceIdx == null) return 0;
    const idx = res.item.choiceIdx | 0;
    if (dest) {
        dest.lev = lchoices.lev[idx];
        dest.dgn = lchoices.dgn[idx];
    }
    return lchoices.playerlev[idx] | 0;
}
