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
    STONE,
    VWALL,
    HWALL,
    TLCORNER,
    TRCORNER,
    BLCORNER,
    BRCORNER,
    CROSSWALL,
    TUWALL,
    TDWALL,
    TLWALL,
    TRWALL,
    TREE,
    FOUNTAIN,
    THRONE,
    SINK,
    GRAVE,
    ALTAR,
    DOOR,
    DBWALL,
    IRONBARS,
    ROOM,
    CORR,
    STAIRS,
    LADDER,
    POOL,
    ICE,
    LAVAPOOL,
    LAVAWALL,
    AIR,
    CLOUD,
    WATER,
    DRAWBRIDGE_UP,
    DRAWBRIDGE_DOWN,
    S_stone,
    S_vwall,
    S_hwall,
    S_tlcorn,
    S_trcorn,
    S_blcorn,
    S_brcorn,
    S_crwall,
    S_tuwall,
    S_tdwall,
    S_tlwall,
    S_trwall,
    S_ndoor,
    S_vodoor,
    S_hodoor,
    S_vcdoor,
    S_hcdoor,
    S_bars,
    S_tree,
    S_room,
    S_darkroom,
    S_corr,
    S_litcorr,
    S_upstair,
    S_dnstair,
    S_upladder,
    S_dnladder,
    S_altar,
    S_grave,
    S_throne,
    S_sink,
    S_fountain,
    S_pool,
    S_ice,
    S_lava,
    S_lavawall,
    S_vodbridge,
    S_hodbridge,
    S_vcdbridge,
    S_hcdbridge,
    S_air,
    S_cloud,
    S_water,
    M_AP_FURNITURE,
    M_AP_TYPE,
    ASCENDED,
    ESCAPED,
    In_endgame,
    In_quest,
    In_sokoban,
    SHOPBASE,
    TEMPLE,
    ROOMOFFSET,
    MAXNROFROOMS,
    PL_NSIZ_PLUS,
    Amask2msa,
    Msa2amask,
    Amask2align,
    MSA_NONE,
    DELPHI,
    VIBRATING_SQUARE,
    Is_astralevel,
    Is_knox,
    Is_rogue_level,
    Is_stronghold,
    Is_bigroom,
    Is_valley,
    Is_sanctum,
    IS_THRONE,
    isok,
    SVALL,
    VISITED,
    In_V_tower,
} from './const.js';
import { builds_up } from './hacklib.js';
import { align_gname } from './roles.js';
import { altarmask_at } from './pray.js';
import { is_drawbridge_wall } from './dbridge.js';
import { db_under_typ } from './hack.js';
import { m_at } from './mon.js';
import { canseemon } from './display.js';

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

/**
 * C ref: dungeon.c find_branch `:310–337`. With a proto_dungeon this is
 * the build-time lookup (C panics when it misses). Without one — the
 * `lev_by_name` path — it matches a live branch by its *end2* dungeon
 * name, case-insensitively and also with a leading "The " ignored, and
 * packs both ledger numbers into one int: `(end1 << 8) | end2`, or -1.
 */
function find_branch(name, pd) {
    if (pd) {
        for (let i = 0; i < pd.n_brs; i++) {
            if (pd.tmpbranch[i].name === name) return i;
        }
        throw new Error(`find_branch: can't find ${name}`);
    }
    /* support for level tport by name */
    const want = String(name ?? '').toLowerCase();
    for (const br of game.branches || []) {
        const dnam = String(game.dungeons?.[br?.end2?.dnum]?.dname ?? '');
        const low = dnam.toLowerCase();
        if (low === want
            || (low.slice(0, 4) === 'the ' && low.slice(4) === want)) {
            return ((ledger_no(br.end1) << 8) | ledger_no(br.end2)) | 0;
        }
    }
    return -1;
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

/** C dungeon.c dunlevs_in_dungeon / ledger_no. */
export function dunlevs_in_dungeon(lev) {
    return game.dungeons?.[lev?.dnum]?.num_dunlevs ?? 1;
}
export function ledger_no(lev) {
    const dun = game.dungeons?.[lev?.dnum | 0];
    return ((dun?.ledger_start | 0) + (lev?.dlevel | 0)) | 0;
}

/**
 * C ref: dungeon.c maxledgerno — last dungeon ledger_start + num_dunlevs.
 * save_dungeon linfo count is this value; the array loop is `i < count`
 * so index maxledgerno() itself is not persisted.
 */
export function maxledgerno() {
    const n = game.n_dgns | 0;
    const duns = game.dungeons || [];
    if (n <= 0 || !duns.length) return 0;
    const last = duns[n - 1] || duns[duns.length - 1];
    return ((last?.ledger_start | 0) + (last?.num_dunlevs | 0)) | 0;
}

/**
 * C ref: dungeon.c ledger_to_dnum :1401–1416 —
 * ledger_start < ledgerno ≤ ledger_start + num_dunlevs.
 */
export function ledger_to_dnum(ledgerno) {
    const n = game.n_dgns | 0;
    const want = ledgerno | 0;
    for (let i = 0; i < n; i++) {
        const d = game.dungeons?.[i];
        if (!d) continue;
        const start = d.ledger_start | 0;
        const count = d.num_dunlevs | 0;
        if (start < want && want <= start + count) return i;
    }
    return 0;
}

/**
 * C ref: dungeon.c ledger_to_dlev :1421–1426.
 */
export function ledger_to_dlev(ledgerno) {
    const want = ledgerno | 0;
    const dnum = ledger_to_dnum(want);
    return (want - (game.dungeons?.[dnum]?.ledger_start | 0)) | 0;
}

/** C ref: dungeon.c find_mapseen_by_str `:2651–2661` — the player's own
 *  `#annotate` label for a level, matched case-insensitively. */
function find_mapseen_by_str(str) {
    const want = String(str ?? '').toLowerCase();
    return (game.mapseenchn || []).find(
        (m) => m?.custom && String(m.custom).toLowerCase() === want,
    ) || null;
}

/**
 * C ref: dungeon.c dlev_in_current_branch `:2087–2092` — same dnum, or
 * the valley/medusa pair, which C deliberately treats as one branch so
 * that Gehennom and the dungeon below Medusa reach each other.
 */
function dlev_in_current_branch(dlev) {
    const uz = game.u?.uz || {};
    const un = uz.dnum | 0;
    const dn = dlev?.dnum | 0;
    if (dn === un) return true;
    const valley = game.valley_level;
    const medusa = game.medusa_level;
    if (!valley || !medusa) return false;
    return (un === (valley.dnum | 0) && dn === (medusa.dnum | 0))
        || (un === (medusa.dnum | 0) && dn === (valley.dnum | 0));
}

/** C wizard — debug mode; JS keeps it on game.flags (D-0176). */
function wizard_mode() {
    return !!(game.flags?.debug || game.flags?.wizard);
}

/** C ref: dungeon.c lev_by_name `:2096–2170` — VISITED gate helper. */
function ledger_visited(idx) {
    return (((game.level_info?.[idx]?.flags | 0) & VISITED) === VISITED);
}

/**
 * C ref: dungeon.c lev_by_name `:2096–2170` — resolve a level *name*
 * typed at the level-teleport prompt to a depth, or 0 for "no idea".
 *
 * Custom `#annotate` labels win outright. Otherwise C normalises the
 * input — a leading "The ", a trailing " level", and two aliases
 * ("gehennom"/"hell", which would otherwise match the Gehennom *branch*
 * and land on the castle, and "delphi" because the Oracle says
 * "welcome to Delphi") — then tries `find_level`, and only if that
 * misses falls back to branch names, including "<branch> to Xyzzy".
 *
 * The gates are the interesting part: outside wizard mode the level (or
 * *both* ends of a branch) must have been VISITED, and the destination
 * must be in the current branch — you cannot name your way out of the
 * dungeon you are in.
 * @returns {number} depth, or 0 when the name resolves to nothing usable
 */
export function lev_by_name(nam0) {
    let lev = 0;
    let slev = null;
    let dlev = null;
    let nam = String(nam0 ?? '');

    /* look at the player's custom level annotations first */
    const mseen = find_mapseen_by_str(nam);
    if (mseen) {
        dlev = mseen.lev;
    } else {
        /* allow strings like "the oracle level" to find "oracle" */
        if (nam.slice(0, 4).toLowerCase() === 'the ') nam = nam.slice(4);
        // C: strstri(nam, " level") only when it sits at eos - 6
        if (nam.length >= 6 && nam.slice(-6).toLowerCase() === ' level') {
            nam = nam.slice(0, -6);
        }
        const low = nam.toLowerCase();
        if (low === 'gehennom' || low === 'hell') {
            /* hell is the old name and wouldn't match; gehennom would
               match its branch, yielding the castle instead of valley */
            nam = In_V_tower(game.u?.uz) ? " to Vlad's tower" : 'valley';
        } else if (low === 'delphi') {
            nam = 'oracle';
        }
        slev = find_level(nam);
        if (slev) dlev = slev.dlevel;
    }

    if (mseen || slev) {
        const idx = ledger_no(dlev);
        if (dlev_in_current_branch(dlev)
            && (wizard_mode() || ledger_visited(idx))) {
            lev = depth_of(dlev);
        }
    } else { /* not a specific level; try branch names */
        let idx = find_branch(nam, null);
        /* "<branch> to Xyzzy" */
        if (idx < 0) {
            const at = nam.toLowerCase().indexOf(' to ');
            if (at >= 0) idx = find_branch(nam.slice(at + 4), null);
        }
        if (idx >= 0) {
            const idxtoo = (idx >> 8) & 0x00FF;
            idx &= 0x00FF;
            /* wizard, or else _both_ sides of the branch seen */
            if (wizard_mode()
                || (ledger_visited(idx) && ledger_visited(idxtoo))) {
                if (ledger_to_dnum(idxtoo) === (game.u?.uz?.dnum | 0)) {
                    idx = idxtoo;
                }
                const d = {
                    dnum: ledger_to_dnum(idx),
                    dlevel: ledger_to_dlev(idx),
                };
                if (dlev_in_current_branch(d)) lev = depth_of(d);
            }
        }
    }
    return lev;
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

/** C dungeon.h on_level vs game.wiz1/2/3_level. */
function on_wiz_level(lev, key) {
    const w = game[key];
    if (!w || !lev) return false;
    return (lev.dnum | 0) === (w.dnum | 0)
        && (lev.dlevel | 0) === (w.dlevel | 0);
}

/** C ref: dungeon.c On_W_tower_level — wizard1/2/3 specials. */
export function On_W_tower_level(lev) {
    return on_wiz_level(lev, 'wiz1_level')
        || on_wiz_level(lev, 'wiz2_level')
        || on_wiz_level(lev, 'wiz3_level');
}

/**
 * C ref: dungeon.c In_W_tower — inside the Wizard's Tower rectangle.
 * Both exclusion regions (updest/dndest) define the tower; C asserts they
 * match and tests svd.dndest. Named omit: impossible() when nlx==0.
 */
export function In_W_tower(x, y, lev) {
    if (!On_W_tower_level(lev)) return false;
    const d = game.dndest;
    if (!d || !(d.nlx | 0)) return false;
    return (x | 0) >= (d.nlx | 0) && (x | 0) <= (d.nhx | 0)
        && (y | 0) >= (d.nly | 0) && (y | 0) <= (d.nhy | 0);
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
 * C ref: dungeon.c find_mapseen — lookup only; does not touch lastseentyp.
 */
function find_mapseen(lev) {
    const uz = lev || game.u?.uz || { dnum: 0, dlevel: 1 };
    const dnum = uz.dnum | 0;
    const dlevel = uz.dlevel | 0;
    return (game.mapseenchn || []).find(
        (m) => (m.lev?.dnum | 0) === dnum && (m.lev?.dlevel | 0) === dlevel,
    ) || null;
}

/**
 * C ref: dungeon.c init_mapseen — create mapseen node sorted by
 * dnum then dlevel; clear lastseentyp only when allocating a new node
 * (≡ C memset on first entry). Re-entry returns existing without wiping
 * lastseentyp (C never re-calls init for the same level).
 */
export function init_mapseen(lev) {
    const uz = lev || game.u?.uz || { dnum: 0, dlevel: 1 };
    const dnum = uz.dnum | 0;
    const dlevel = uz.dlevel | 0;
    if (!game.mapseenchn) game.mapseenchn = [];
    const existing = find_mapseen(uz);
    if (existing) return existing;
    const nrooms = (MAXNROFROOMS + 1) * 2;
    const init = {
        lev: { dnum, dlevel },
        custom: null,
        custom_lth: 0,
        flags: {},
        feat: empty_feat(),
        br: null,
        final_resting_place: null,
        // C: mapseen.msrooms[(MAXNROFROOMS+1)*2]
        msrooms: Array.from({ length: nrooms }, () => ({ seen: 0, untended: 0 })),
    };
    // C: memset lastseentyp on each init_mapseen (new level only)
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
 * C recalc/room_discovered use find_mapseen; init_mapseen only on
 * first mklev entry.
 */
function ensure_mapseen(lev) {
    return find_mapseen(lev) || init_mapseen(lev);
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

/**
 * C ref: dungeon.c on_level `:1438–1443` — same dnum/dlevel.
 * Exported so `dog.c` `keep_mon_accessible` uses the real one instead
 * of a fourteenth copy; the other 13 local clones are their own row.
 */
export function on_level(a, b) {
    return (a?.dnum | 0) === (b?.dnum | 0)
        && (a?.dlevel | 0) === (b?.dlevel | 0);
}

/**
 * C ref: dungeon.c interest_mapseen — which mapseen nodes appear in
 * #overview (why==0). Cemetery: final_resting_place && (knownbones
 * || wizard) after recalc clone (D-1659). Auto-flags oracle/bigroom/
 * valley/msanctum/vibrating_square from recalc_mapseen (D-1707).
 * sokosolved / roguelevel / quest_summons / questing / notreachable
 * from recalc_mapseen (D-1724).
 */
function interest_mapseen(mptr) {
    const u = game.u || {};
    if (on_level(u.uz, mptr.lev)) return true;
    const fl = mptr.flags || {};
    if (fl.notreachable || fl.forgot) return false;
    if (In_tutorial(u.uz)) return In_tutorial(mptr.lev);
    if (In_tutorial(mptr.lev)) return false;
    if (fl.oracle || fl.bigroom || fl.roguelevel || fl.castle || fl.valley
        || fl.msanctum || fl.vibrating_square || fl.quest_summons
        || fl.questing) {
        return true;
    }
    if (In_sokoban(mptr.lev)
        && (In_sokoban(u.uz) || !fl.sokosolved)) {
        return true;
    }
    if (In_endgame(u.uz)) return In_endgame(mptr.lev);
    const wizard = !!(game.flags?.wizard || game.flags?.debug);
    const dun = game.dungeons?.[mptr.lev?.dnum | 0];
    return !!(OF_INTEREST(mptr.feat || empty_feat())
        || (mptr.final_resting_place && (fl.knownbones || wizard))
        || mptr.custom || mptr.br
        || ((mptr.lev?.dlevel | 0) === (dun?.dunlev_ureached | 0)));
}

/** Ensure lastseentyp[COLNO][ROWNO]; C svl.lastseentyp. */
export function ensure_lastseentyp() {
    if (!game.lastseentyp) {
        const a = new Array(COLNO);
        for (let x = 0; x < COLNO; x++) a[x] = new Array(ROWNO).fill(0);
        game.lastseentyp = a;
    }
    return game.lastseentyp;
}

/**
 * C ref: mkroom.c cmap_to_type `:910–1030` — cmap S_* → levl.typ.
 * Used for remembered terrain when mimics pose as furniture.
 * Unknown / trap / beam / branch-stair cmap → STONE catchall.
 */
export function cmap_to_type(sym) {
    let typ = STONE;
    switch (sym | 0) {
    case S_stone:
        typ = STONE;
        break;
    case S_vwall:
        typ = VWALL;
        break;
    case S_hwall:
        typ = HWALL;
        break;
    case S_tlcorn:
        typ = TLCORNER;
        break;
    case S_trcorn:
        typ = TRCORNER;
        break;
    case S_blcorn:
        typ = BLCORNER;
        break;
    case S_brcorn:
        typ = BRCORNER;
        break;
    case S_crwall:
        typ = CROSSWALL;
        break;
    case S_tuwall:
        typ = TUWALL;
        break;
    case S_tdwall:
        typ = TDWALL;
        break;
    case S_tlwall:
        typ = TLWALL;
        break;
    case S_trwall:
        typ = TRWALL;
        break;
    case S_ndoor:  /* no door (empty doorway) */
    case S_vodoor: /* open door in vertical wall */
    case S_hodoor: /* open door in horizontal wall */
    case S_vcdoor: /* closed door in vertical wall */
    case S_hcdoor:
        typ = DOOR;
        break;
    case S_bars:
        typ = IRONBARS;
        break;
    case S_tree:
        typ = TREE;
        break;
    case S_room:
    case S_darkroom:
        typ = ROOM;
        break;
    case S_corr:
    case S_litcorr:
        typ = CORR;
        break;
    case S_upstair:
    case S_dnstair:
        typ = STAIRS;
        break;
    case S_upladder:
    case S_dnladder:
        typ = LADDER;
        break;
    case S_altar:
        typ = ALTAR;
        break;
    case S_grave:
        typ = GRAVE;
        break;
    case S_throne:
        typ = THRONE;
        break;
    case S_sink:
        typ = SINK;
        break;
    case S_fountain:
        typ = FOUNTAIN;
        break;
    case S_pool:
        typ = POOL;
        break;
    case S_ice:
        typ = ICE;
        break;
    case S_lava:
        typ = LAVAPOOL;
        break;
    case S_vodbridge: /* open drawbridge spanning north/south */
    case S_hodbridge:
        typ = DRAWBRIDGE_DOWN;
        break;        /* east/west */
    case S_vcdbridge: /* closed drawbridge in vertical wall */
    case S_hcdbridge:
        typ = DBWALL;
        break;
    case S_air:
        typ = AIR;
        break;
    case S_cloud:
        typ = CLOUD;
        break;
    case S_water:
        typ = WATER;
        break;
    case S_lavawall:
        typ = LAVAWALL;
        break;
    default:
        break; /* not a cmap symbol? */
    }
    return typ;
}

/**
 * C ref: dungeon.c update_lastseentyp `:2926–2938` — remember terrain
 * typ when mapped. DRAWBRIDGE_UP → db_under_typ(drawbridgemask);
 * visible furniture mimic → cmap_to_type(mappearance).
 */
export function update_lastseentyp(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return;
    let ltyp = loc.typ | 0;
    if (ltyp === DRAWBRIDGE_UP)
        ltyp = db_under_typ(loc.drawbridgemask);
    const mtmp = m_at(x, y);
    if (mtmp && M_AP_TYPE(mtmp) === M_AP_FURNITURE && canseemon(mtmp))
        ltyp = cmap_to_type(mtmp.mappearance);
    const lst = ensure_lastseentyp();
    lst[x][y] = ltyp;
}

/**
 * C ref: dungeon.c count_feat_lastseentyp — bump mapseen.feat from lastseentyp.
 * Cap at 3 ("many"). Altar msalign via Amask2msa(altarmask_at); astral
 * incomplete seenv → MSA_NONE. DOOR on Knox with throne four columns
 * left → flags.ludios; DOOR that is a drawbridge wall, DBWALL, or
 * DRAWBRIDGE_DOWN on the stronghold → flags.castle + flags.castletune
 * (print_mapseen Fort Ludios / The castle + tunesuffix). Named omit:
 * #if 0 water/lava/ice.
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
    case ALTAR: {
        /* C: get the altarmask; might be a mimic. Astral not-fully-seen
           → MSA_NONE so #overview does not name a god yet. */
        let atmp = altarmask_at(x, y);
        const loc = game.level?.at(x, y);
        atmp = (Is_astralevel(game.u?.uz)
            && ((loc?.seenv | 0) & SVALL) !== SVALL)
            ? MSA_NONE
            : Amask2msa(atmp);
        if (!(mptr.feat.naltar | 0)) mptr.feat.msalign = atmp;
        else if ((mptr.feat.msalign | 0) !== atmp) mptr.feat.msalign = MSA_NONE;
        count = (mptr.feat.naltar | 0) + 1;
        if (count <= 3) mptr.feat.naltar = count;
        break;
    }
    /* C `:3026–3068` — automatic annotation once the Fort / Castle
       entrance has been seen (in person or via magic mapping).
       DOOR: lowered drawbridge portcullis or Knox secret door.
       Throne is four columns left, same row or ±1, and need not
       have been seen yet (live levl[], not lastseentyp).
       DBWALL: raised drawbridge closed door; DRAWBRIDGE_DOWN: span.
       DRAWBRIDGE_UP is not this switch (moat unless adjacent DBWALL). */
    case DOOR:
        if (Is_knox(game.u?.uz)) {
            const tx = x - 4;
            for (let ty = y - 1; ty <= y + 1; ty++) {
                if (isok(tx, ty)
                    && IS_THRONE(game.level?.at(tx, ty)?.typ | 0)) {
                    if (!mptr.flags) mptr.flags = {};
                    mptr.flags.ludios = 1;
                    break;
                }
            }
            break;
        }
        if (is_drawbridge_wall(x, y) < 0) break;
        /* FALLTHROUGH — C dungeon.c :3059–3065 */
    case DBWALL:
    case DRAWBRIDGE_DOWN:
        if (Is_stronghold(game.u?.uz)) {
            if (!mptr.flags) mptr.flags = {};
            mptr.flags.castle = 1;
            mptr.flags.castletune = 1;
        }
        break;
    default:
        break;
    }
}

/**
 * C dungeon.c update_mapseen_for :2943–2947 — recalc then lastseentyp[x][y].
 * Caller: zap.c zap_updown WAN_PROBING down (D-1444); lock.c named.
 */
export function update_mapseen_for(x, y) {
    recalc_mapseen();
    return game.lastseentyp?.[x | 0]?.[y | 0] | 0;
}

/**
 * C rm.h cemetery.who[PL_NSIZ+4*(1+3)+1] / how[100+1] / when[15].
 * Sizes exclude the trailing NUL (C custom_lth style).
 */
const CEMETERY_WHO_MAX = PL_NSIZ_PLUS - 1;
const CEMETERY_HOW_MAX = 100;
const CEMETERY_WHEN_MAX = 14;

function msrooms_count() {
    return (MAXNROFROOMS + 1) * 2;
}

/**
 * C ref: save.c savecemetery `:616–637`. JSON analogue of
 * cemetery-cemetery_flag (0 if head, -1 if empty) then Sfo_cemetery
 * who/how/when/frpx/frpy/bonesknown per node. Empty → `[]` (flag -1).
 * FREEING / release_data omitted (JSON VFS always writes; live chain
 * stays). CONVERTING rest path omitted.
 * @param {object|null} cemeteryaddr
 * @returns {object[]}
 */
export function savecemetery(cemeteryaddr) {
    const out = [];
    for (let thisbones = cemeteryaddr; thisbones; thisbones = thisbones.next) {
        out.push({
            who: String(thisbones.who || '').slice(0, CEMETERY_WHO_MAX),
            how: String(thisbones.how || '').slice(0, CEMETERY_HOW_MAX),
            when: String(thisbones.when || '').slice(0, CEMETERY_WHEN_MAX),
            frpx: thisbones.frpx | 0,
            frpy: thisbones.frpy | 0,
            bonesknown: !!thisbones.bonesknown,
        });
    }
    return out;
}

/**
 * C ref: restore.c restcemetery `:987–1017`. JSON analogue of
 * Sfi_int flag; flag==0 do-while Sfi_cemetery until next is 0.
 * Missing / non-array / empty = flag -1 → NULL. SFCTOOL /
 * CONVERTING free omitted.
 * @param {unknown} raw
 * @returns {object|null}
 */
export function restcemetery(raw) {
    if (!Array.isArray(raw) || raw.length === 0) return null;
    let head = null;
    let bonesaddr = null;
    for (const rec of raw) {
        if (!rec) continue;
        const bonesinfo = {
            who: String(rec.who || '').slice(0, CEMETERY_WHO_MAX),
            how: String(rec.how || '').slice(0, CEMETERY_HOW_MAX),
            when: String(rec.when || '').slice(0, CEMETERY_WHEN_MAX),
            frpx: rec.frpx | 0,
            frpy: rec.frpy | 0,
            bonesknown: !!rec.bonesknown,
            next: null,
        };
        if (!head) head = bonesinfo;
        else bonesaddr.next = bonesinfo;
        bonesaddr = bonesinfo;
    }
    return head;
}

/**
 * C ref: dungeon.c save_mapseen `:2694–2717`. JSON analogue of
 * branch_index + d_level + feat + flags + custom_lth + custom +
 * msrooms[(MAXNROFROOMS+1)*2] + savecemetery(final_resting_place).
 * Branch is an index into svb.branches (null → nbranches).
 * @param {object} mptr
 * @returns {object}
 */
export function save_mapseen(mptr) {
    const branches = game.branches || [];
    let brindx = 0;
    for (; brindx < branches.length; brindx++) {
        if (branches[brindx] === mptr.br) break;
    }
    const nrooms = msrooms_count();
    const msrooms = [];
    for (let i = 0; i < nrooms; i++) {
        const r = mptr.msrooms?.[i];
        msrooms.push({
            seen: r?.seen | 0,
            untended: r?.untended | 0,
        });
    }
    const custom_lth = mptr.custom_lth | 0;
    const custom = custom_lth && mptr.custom
        ? String(mptr.custom).slice(0, custom_lth)
        : null;
    const featSrc = mptr.feat || empty_feat();
    const feat = empty_feat();
    for (const k of Object.keys(feat)) feat[k] = featSrc[k] | 0;
    const flags = {};
    const fl = mptr.flags || {};
    for (const k of Object.keys(fl)) {
        const v = fl[k];
        if (typeof v === 'number' || typeof v === 'boolean') flags[k] = v;
    }
    return {
        brindx,
        lev: {
            dnum: mptr.lev?.dnum | 0,
            dlevel: mptr.lev?.dlevel | 0,
        },
        feat,
        flags,
        custom_lth,
        custom,
        msrooms,
        final_resting_place: savecemetery(mptr.final_resting_place),
    };
}

/**
 * C ref: dungeon.c load_mapseen `:2720–2754`. JSON analogue of
 * Sfi branch_index walk + d_level/feat/flags/custom + msrooms +
 * restcemetery(final_resting_place). custom_lth 0 → custom NULL.
 * @param {object} raw
 * @returns {object}
 */
export function load_mapseen(raw) {
    const rec = raw && typeof raw === 'object' ? raw : {};
    const branchnum = rec.brindx | 0;
    const branches = game.branches || [];
    let br = null;
    for (let brindx = 0; brindx < branches.length; brindx++) {
        if (brindx === branchnum) {
            br = branches[brindx];
            break;
        }
    }
    const custom_lth = rec.custom_lth | 0;
    const custom = custom_lth
        ? String(rec.custom ?? '').slice(0, custom_lth)
        : null;
    const nrooms = msrooms_count();
    const msrooms = [];
    for (let i = 0; i < nrooms; i++) {
        const r = rec.msrooms?.[i];
        msrooms.push({
            seen: r?.seen | 0,
            untended: r?.untended | 0,
        });
    }
    const feat = empty_feat();
    const featSrc = rec.feat || {};
    for (const k of Object.keys(feat)) feat[k] = featSrc[k] | 0;
    const flags = { ...(rec.flags && typeof rec.flags === 'object' ? rec.flags : {}) };
    return {
        lev: {
            dnum: rec.lev?.dnum | 0,
            dlevel: rec.lev?.dlevel | 0,
        },
        br,
        feat,
        flags,
        custom,
        custom_lth,
        msrooms,
        final_resting_place: restcemetery(rec.final_resting_place),
    };
}

/**
 * C ref: dungeon.c save_dungeon `:179–187` mapseen_count + save_mapseen
 * walk. JSON analogue; dungeons/branches/tune/level_info/inv_pos already
 * live on the save payload or named.
 * @returns {object[]}
 */
export function save_mapseenchn() {
    const out = [];
    for (const curr_ms of game.mapseenchn || []) {
        out.push(save_mapseen(curr_ms));
    }
    return out;
}

/**
 * C ref: dungeon.c restore_dungeon `:251–262` mapseen_count +
 * load_mapseen chain. Missing/non-array = old JSON save without this
 * chunk (leave in-memory chain). Present array replaces, including [].
 * @param {{ mapseenchn?: unknown }} payload
 */
export function restore_mapseenchn(payload) {
    const arr = payload?.mapseenchn;
    if (!Array.isArray(arr)) return;
    game.mapseenchn = [];
    for (const raw of arr) {
        game.mapseenchn.push(load_mapseen(raw));
    }
}

/**
 * C youprop.h Blind — (H||E) && !B; roleplay OPTIONS:blind.
 * Local youprop clone (not a C function).
 */
function Blind() {
    const u = game.u || {};
    if (u.uroleplay?.blind) return true;
    return !!(((u.HBlinded | 0) || (u.EBlinded | 0)) && !(u.BBlinded | 0));
}

/**
 * C rm.h Sokoban — svl.level.flags.sokoban_rules.
 * JS also mirrors game.Sokoban after getlev (do.js).
 */
function Sokoban() {
    const lf = game.level?.flags;
    return !!(lf?.sokoban_rules || lf?.sokoban || game.Sokoban);
}

/**
 * C dungeon.c Invocation_lev `:2016–2021` — In_hell && deepest-1.
 * Canonical export (hack.js / apply.js still have local clones).
 * @param {{ dnum?: number, dlevel?: number }|null|undefined} lev
 * @returns {boolean}
 */
export function Invocation_lev(lev) {
    if (!lev) return false;
    const dun = game.dungeons?.[lev.dnum | 0];
    if (!dun?.flags?.hellish) return false;
    return (lev.dlevel | 0) === ((dun.num_dunlevs | 0) - 1);
}

/**
 * C gf.ftrap walk in recalc_mapseen Invocation_lev arm. Live JS list
 * is level.traps (D-1694); ftrap ntrap is the C-shaped fallback.
 * @returns {object|null}
 */
function vibrating_square_trap() {
    const list = game.level?.traps;
    if (Array.isArray(list)) {
        for (const t of list) {
            if (t && (t.ttyp | 0) === VIBRATING_SQUARE) return t;
        }
    }
    for (let t = game.ftrap; t; t = t.ntrap) {
        if ((t.ttyp | 0) === VIBRATING_SQUARE) return t;
    }
    return null;
}

/**
 * C ref: dungeon.c cemetery chain copy — recalc clones bonesinfo onto
 * mapseen so #overview does not require the level to stay in memory.
 * @param {object|null} head
 * @returns {object|null}
 */
function clone_cemetery_chain(head) {
    let out = null;
    let tail = null;
    for (let bp = head; bp; bp = bp.next) {
        const copy = {
            who: String(bp.who || ''),
            how: String(bp.how || ''),
            when: String(bp.when || ''),
            frpx: bp.frpx | 0,
            frpy: bp.frpy | 0,
            bonesknown: !!bp.bonesknown,
            next: null,
        };
        if (!out) out = copy;
        else tail.next = copy;
        tail = copy;
    }
    return out;
}

/**
 * C ref: dungeon.c recalc_mapseen — reset current-level feat counts from
 * msrooms (shops/temples) + lastseentyp. Cemetery clone + bonesknown
 * from lastseentyp[frpx][frpy] (D-1659). flags.castletune cleared each
 * pass then restored by count_feat if the drawbridge is still seen;
 * flags.castle / flags.ludios stick. Blind bigroom / oracle DELPHI /
 * valley / sanctum / vibrating_square (D-1707). Cemetery when[] is
 * yyyymmddhhmmss (D-1710). sokosolved / roguelevel / quest_summons /
 * questing / notreachable (D-1724). Named: DRAWBRIDGE_UP lastseentyp
 * is D-1711; display_monster M_AP_FURNITURE lastseentyp still named.
 */
export function recalc_mapseen() {
    const mptr = ensure_mapseen(null);
    if (!mptr.msrooms) {
        const nrooms = (MAXNROFROOMS + 1) * 2;
        mptr.msrooms = Array.from({ length: nrooms }, () => ({ seen: 0, untended: 0 }));
    }
    mptr.feat = empty_feat();
    if (!mptr.flags) mptr.flags = {};
    const u = game.u;
    const rooms = game.level?.rooms || [];
    /* C `:3099–3134` — reached → clear notreachable (quest dnum
       chain); sokosolved / roguelevel / quest flags. castle/ludios
       stick. knownbones re-derived in the cemetery walk below. */
    if (mptr.flags.notreachable) {
        mptr.flags.notreachable = 0;
        if (In_quest(u?.uz)) {
            const dnum = mptr.lev?.dnum | 0;
            for (const tmp of game.mapseenchn || []) {
                if ((tmp.lev?.dnum | 0) === dnum) {
                    if (!tmp.flags) tmp.flags = {};
                    tmp.flags.notreachable = 0;
                }
            }
        }
    }
    mptr.flags.sokosolved = In_sokoban(u?.uz) && !Sokoban() ? 1 : 0;
    /* C `:3115–3124` — bigroom retains when Blind; oracle reset;
       destroyed drawbridge → tunesuffix empty. forgot=0 after the
       Blind test so a one-shot forget does not keep wiping bigroom. */
    if (!Blind()) {
        mptr.flags.bigroom = Is_bigroom(u?.uz) ? 1 : 0;
    } else if (mptr.flags.forgot) {
        mptr.flags.bigroom = 0;
    }
    mptr.flags.roguelevel = Is_rogue_level(u?.uz) ? 1 : 0;
    mptr.flags.oracle = 0;
    mptr.flags.castletune = 0;
    mptr.flags.forgot = 0;
    const ue = u?.uevent || {};
    const qs = game.quest_status || {};
    mptr.flags.quest_summons = (at_dgn_entrance('The Quest')
        && ue.qcalled
        && !(ue.qcompleted || ue.qexpelled || qs.leader_is_dead)) ? 1 : 0;
    mptr.flags.questing = (on_level(u?.uz, game.qstart_level)
        && qs.got_quest) ? 1 : 0;

    // C: track rooms the hero is in → msrooms[].seen / untended
    const urooms = u?.urooms || '';
    for (let i = 0; i < urooms.length; i++) {
        const ridx = urooms.charCodeAt(i) - ROOMOFFSET;
        if (ridx < 0 || ridx >= mptr.msrooms.length) continue;
        mptr.msrooms[ridx].seen = 1;
        const rt = rooms[ridx]?.rtype | 0;
        if (rt >= SHOPBASE) {
            // ≡ shop_keeper + inhishop without importing shk (DAG)
            const shkp = rooms[ridx]?.resident || null;
            const eshk = shkp?.mextra?.eshk || null;
            let untended = 1;
            if (shkp && eshk && shkp.mx != null) {
                const loc = game.level?.at?.(shkp.mx, shkp.my);
                if (loc && ((loc.roomno | 0) === (eshk.shoproom | 0))) {
                    untended = 0;
                }
            }
            mptr.msrooms[ridx].untended = untended;
        } else if (rt === TEMPLE) {
            // findpriest/inhistemple detail deferred — resident priest ⇒ tended
            const priest = rooms[ridx]?.resident || null;
            mptr.msrooms[ridx].untended = priest ? 0 : 1;
        } else {
            mptr.msrooms[ridx].untended = 0;
        }
    }

    // C: recalculate room knowledge — shops and temples + DELPHI oracle
    for (let i = 0; i < mptr.msrooms.length; i++) {
        if (!mptr.msrooms[i].seen) continue;
        const rt = rooms[i]?.rtype | 0;
        if (rt >= SHOPBASE) {
            if (mptr.msrooms[i].untended) {
                mptr.feat.shoptype = SHOPBASE - 1;
            } else if (!(mptr.feat.nshop | 0)) {
                mptr.feat.shoptype = rt;
            } else if ((mptr.feat.shoptype | 0) !== rt) {
                mptr.feat.shoptype = 0;
            }
            const count = (mptr.feat.nshop | 0) + 1;
            if (count <= 3) mptr.feat.nshop = count;
        } else if (rt === TEMPLE) {
            const count = (mptr.feat.ntemple | 0) + 1;
            if (count <= 3) mptr.feat.ntemple = count;
        } else if (((rooms[i]?.orig_rtype ?? rooms[i]?.rtype) | 0) === DELPHI) {
            mptr.flags.oracle = 1;
        }
    }

    // C: if (!Levitation) update_lastseentyp(u.ux, u.uy);
    if (u && !u.Levitation && u.ux > 0) {
        update_lastseentyp(u.ux, u.uy);
    }
    ensure_lastseentyp();
    for (let x = 1; x < COLNO; x++) {
        for (let y = 0; y < ROWNO; y++) {
            count_feat_lastseentyp(mptr, x, y);
        }
    }

    /* C `:3205–3238` — valley/sanctum stick if naltar later drops;
       sanctum clears vibrating_square on the invocation level;
       Invocation_lev uses tseen or (no trap && sanctum not mapped). */
    if (Is_valley(u?.uz)) {
        if ((mptr.feat.naltar | 0) > 0) mptr.flags.valley = 1;
    } else if (Is_sanctum(u?.uz)) {
        if ((mptr.feat.naltar | 0) > 0) mptr.flags.msanctum = 1;
        if (mptr.flags.msanctum) {
            const invocat_lvl = {
                dnum: u?.uz?.dnum | 0,
                dlevel: (u?.uz?.dlevel | 0) - 1,
            };
            const oth = find_mapseen(invocat_lvl);
            if (oth) {
                if (!oth.flags) oth.flags = {};
                oth.flags.vibrating_square = 0;
            }
        }
    } else if (Invocation_lev(u?.uz)) {
        const t = vibrating_square_trap();
        if (t) {
            mptr.flags.vibrating_square = t.tseen ? 1 : 0;
        } else {
            const sanctum = game.sanctum_level;
            const oth = sanctum ? find_mapseen(sanctum) : null;
            mptr.flags.vibrating_square = (!oth || !oth.flags?.msanctum) ? 1 : 0;
        }
    }

    // C `:3247–3260` — clone once; then bonesknown if the death cell
    // has been seen. knownbones is re-derived every recalc.
    if (!mptr.flags) mptr.flags = {};
    mptr.flags.knownbones = 0;
    const bonesinfo = game.level?.bonesinfo;
    if (bonesinfo && !mptr.final_resting_place) {
        mptr.final_resting_place = clone_cemetery_chain(bonesinfo);
    }
    const lst = game.lastseentyp;
    for (let bp = mptr.final_resting_place; bp; bp = bp.next) {
        if (lst?.[bp.frpx | 0]?.[bp.frpy | 0]) {
            bp.bonesknown = true;
            mptr.flags.knownbones = 1;
        }
    }
    return mptr;
}

/**
 * C ref: dungeon.c room_discovered — mark room seen + recalc_mapseen.
 * Called when check_special_room delivers an enter message (incl. shops).
 */
export function room_discovered(roomno) {
    const mptr = ensure_mapseen(null);
    if (!mptr.msrooms) {
        const nrooms = (MAXNROFROOMS + 1) * 2;
        mptr.msrooms = Array.from({ length: nrooms }, () => ({ seen: 0, untended: 0 }));
    }
    const ridx = roomno | 0;
    if (ridx < 0 || ridx >= mptr.msrooms.length) return;
    if (!mptr.msrooms[ridx].seen) {
        mptr.msrooms[ridx].seen = 1;
        recalc_mapseen();
    }
}

/**
 * C ref: dungeon.c recbranch_mapseen — note forward branch taken by
 * stairs/fall/portal (not level-teleport / Eye).
 */
export function recbranch_mapseen(source, dest) {
    if ((source?.dnum | 0) === (dest?.dnum | 0)) return;
    let br = null;
    for (const cand of game.branches || []) {
        if (on_level(source, cand.end1) && on_level(dest, cand.end2)) {
            br = cand;
            break;
        }
        if (on_level(source, cand.end2) && on_level(dest, cand.end1)) {
            return; // reverse / return trip — ignore
        }
    }
    if (!br) return;
    const mptr = (game.mapseenchn || []).find(
        (m) => on_level(m.lev, source),
    );
    if (!mptr) return;
    if (mptr.br && mptr.br !== br) {
        // C: impossible("Two branches on the same level?")
        return;
    }
    mptr.br = br;
}

/**
 * C ref: dungeon.c remdun_mapseen `:2810–2832` — mark overview nodes
 * for dungeon `dnum` notreachable (C `#if 1`; does not unlink).
 * @param {number} dnum
 */
export function remdun_mapseen(dnum) {
    const want = dnum | 0;
    for (const mptr of game.mapseenchn || []) {
        if ((mptr?.lev?.dnum | 0) === want) {
            if (!mptr.flags) mptr.flags = {};
            mptr.flags.notreachable = 1;
        }
    }
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
 * C ref: dungeon.c shop_string — short shop description for #overview.
 * Uses shtypes[].name (annotation null in upstream for common shops);
 * SHOPBASE-1 → untended. Keep names aligned with shknam.c shtypes[].
 */
function shop_string(rtype) {
    const shoptype = (rtype | 0) - SHOPBASE;
    if (shoptype < 0) return 'untended shop';
    const NAMES = [
        'general store',
        'used armor dealership',
        'second-hand bookstore',
        'liquor emporium',
        'antique weapons outlet',
        'delicatessen',
        'jewelers',
        'quality apparel and accessories',
        'hardware store',
        'rare books',
        'lighting store',
    ];
    return NAMES[shoptype] || 'shop';
}

/** Local an() for shop overview — avoid objnam import cycle. */
function an_shop(str) {
    const s = String(str || '');
    const c = (s[0] || 'x').toLowerCase();
    return ('aeiou'.includes(c) ? 'an ' : 'a ') + s;
}

/**
 * C ref: dungeon.c print_mapseen OF_INTEREST feature sentence (PREFIX +
 * ADDNTOBUF). Altar-to-god when Amask2align(Msa2amask(msalign)) matches
 * u.ualign.type (all seen altars coaligned to the hero's god).
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
    // Shop / temple+altar order matches C
    if ((feat.nshop | 0) > 0) {
        if ((feat.nshop | 0) > 1) ADDNTOBUF('shop', feat.nshop);
        else buf += `${COMMA()}${an_shop(shop_string(feat.shoptype | 0))}`;
    }
    if ((feat.naltar | 0) > 0 || (feat.ntemple | 0) > 0) {
        const nt = feat.ntemple | 0;
        const na = feat.naltar | 0;
        if (nt && na) {
            buf += `${COMMA()}${seen_string(nt, 'temple')} temple${plur(nt)} and ${seen_string(na, 'altar')} altar${plur(na)}`;
        } else if (nt) ADDNTOBUF('temple', nt);
        else ADDNTOBUF('altar', na);
        /* only print out altar's god if they are all to your god */
        let atmp = feat.msalign | 0;
        atmp = Msa2amask(atmp);
        const ualign = game.u?.ualign?.type;
        if (Amask2align(atmp) === ualign) {
            buf += ` to ${align_gname(game.urole, ualign)}`;
        }
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

/** C ref: dungeon.c br_string2 — branch label for overview. */
function br_string2(br) {
    const quest_dnum = game.quest_dnum;
    const closed_portal = (br?.end2?.dnum | 0) === (quest_dnum | 0)
        && !!(game.u?.uevent?.qexpelled);
    switch (br?.type) {
    case BR_PORTAL:
        return closed_portal ? 'Sealed portal' : 'Portal';
    case BR_NO_END1:
        return 'Connection';
    case BR_NO_END2:
        return br.end1_up ? 'One way stairs up' : 'One way stairs down';
    case BR_STAIR:
        return br.end1_up ? 'Stairs up' : 'Stairs down';
    default:
        return '(unknown)';
    }
}

/** C ref: dungeon.c Is_special — match in sp_levchn. */
export function Is_special(lev) {
    for (const s of game.sp_levchn || []) {
        if (on_level(lev, s.dlevel)) return s;
    }
    return null;
}

/**
 * C ref: dungeon.c print_mapseen branch line.
 */
function mapseen_branch_line(mptr) {
    if (!mptr.br) return null;
    const PREFIX = '      ';
    const dname = game.dungeons?.[mptr.br.end2?.dnum | 0]?.dname || 'a dungeon';
    let buf = `${PREFIX}${br_string2(mptr.br)} to ${dname}`;
    if (mptr.br.end1_up && !In_endgame(mptr.br.end2)) {
        const depth = depth_of(mptr.br.end2);
        buf += `, level ${depth}`;
    }
    return `${buf}.`;
}

function add_overview_str(entries, text) {
    if (!text) return;
    entries.push({ text, attr: 0, selectable: false });
}

/**
 * C ref: dungeon.c tunesuffix :3458–3476 — castle drawbridge tune hint.
 * uheard_tune==2 → notes "tune"; else "5-note tune". Missing
 * flags.castletune or uheard_tune → empty.
 */
function tunesuffix(mptr) {
    if (!(mptr.flags?.castletune) || !(game.u?.uevent?.uheard_tune)) return '';
    const tmp = (game.u.uevent.uheard_tune | 0) === 2
        ? `notes "${game.tune || ''}"`
        : '5-note tune';
    return ` (play ${tmp} to open or close drawbridge)`;
}

/**
 * C ref: dungeon.c print_mapseen named-place mutually-exclusive arms
 * + quest_summons extra line. ldrname via ctx (questpgr.c).
 * @param {object} mptr
 * @param {() => string} ldrnameFn
 * @returns {string[]}
 */
function mapseen_named_place_lines(mptr, ldrnameFn) {
    const PREFIX = '      ';
    const fl = mptr.flags || {};
    const lines = [];
    let buf = '';
    if (fl.oracle) {
        buf = `${PREFIX}Oracle of Delphi.`;
    } else if (In_sokoban(mptr.lev)) {
        buf = `${PREFIX}${fl.sokosolved ? 'Solved' : 'Unsolved'}.`;
    } else if (fl.bigroom) {
        buf = `${PREFIX}A very big room.`;
    } else if (fl.roguelevel) {
        buf = `${PREFIX}A primitive area.`;
    } else if (on_level(mptr.lev, game.qstart_level)) {
        buf = `${PREFIX}Home${fl.notreachable ? ' (no way back...)' : ''}.`;
        if (game.u?.uevent?.qcompleted) {
            buf = `${PREFIX}Completed quest for ${ldrnameFn()}.`;
        } else if (fl.questing) {
            buf = `${PREFIX}Given quest by ${ldrnameFn()}.`;
        }
    } else if (fl.ludios) {
        buf = `${PREFIX}Fort Ludios.`;
    } else if (fl.castle) {
        buf = `${PREFIX}The castle${tunesuffix(mptr)}.`;
    } else if (fl.valley) {
        buf = `${PREFIX}Valley of the Dead.`;
    } else if (fl.vibrating_square) {
        buf = `${PREFIX}Gateway to Moloch's Sanctum.`;
    } else if (fl.msanctum) {
        buf = `${PREFIX}Moloch's Sanctum.`;
    }
    if (buf) lines.push(buf);
    if (fl.quest_summons) {
        lines.push(`${PREFIX}Summoned by ${ldrnameFn()}.`);
    }
    return lines;
}

/**
 * C ref: dungeon.c print_mapseen cemetery `:3696–3726`.
 * Header + optional dead-hero line (final==2 on this level) + known
 * cemetery who/how. kncnt drives trailing ',' vs '.'.
 * @param {object} mptr
 * @param {number} why  C final
 * @param {number} reason  C how
 * @param {{ formatkiller?: Function }} ctx
 * @returns {string[]}
 */
export function mapseen_cemetery_lines(mptr, why, reason, ctx) {
    const TAB = '   ';
    const PREFIX = '      ';
    const u = game.u || {};
    const wizard = !!(game.flags?.wizard || game.flags?.debug);
    const onHere = on_level(u.uz, mptr.lev);
    const died_here = why === 2 && onHere;
    if (!(mptr.final_resting_place || why > 0)) return [];
    let kncnt = died_here ? 1 : 0;
    for (let bp = mptr.final_resting_place; bp; bp = bp.next) {
        if (bp.bonesknown || wizard || why > 0) kncnt++;
    }
    if (!kncnt) return [];
    const lines = [`${PREFIX}Final resting place for`];
    if (died_here) {
        let killer = ctx?.formatkiller ? ctx.formatkiller(reason, true) : '';
        // C strsubst first occurrence only (hacklib.c :534–551)
        killer = killer.replace(' himself', ' yourself')
            .replace(' herself', ' yourself')
            .replace(' his ', ' your ')
            .replace(' her ', ' your ');
        kncnt--;
        const punct = kncnt ? ',' : '.';
        lines.push(`${PREFIX}${TAB}you, ${killer}${punct}`);
    }
    for (let bp = mptr.final_resting_place; bp; bp = bp.next) {
        if (bp.bonesknown || wizard || why > 0) {
            kncnt--;
            const punct = kncnt ? ',' : '.';
            lines.push(`${PREFIX}${TAB}${bp.who}, ${bp.how}${punct}`);
        }
    }
    return lines;
}

/**
 * C ref: dungeon.c print_mapseen :3515–3728.
 * why==-1: level row selectable with identifier ledger_no+1 (ch=0).
 * Headings / feat / named-place / branch / cemetery are add_menu_str.
 * Knox / castle+tunesuffix flags from count_feat_lastseentyp (D-1693).
 * Blind bigroom / oracle / valley / msanctum / vibrating_square from
 * recalc_mapseen (D-1707). Named omit: #if 0 water/lava/ice.
 * @param {object[]} entries
 * @param {object} mptr
 * @param {number} why
 * @param {number} reason
 * @param {boolean} printdun
 * @param {{ ATR_INVERSE: number, endgamelevelname: Function, ldrname: Function, formatkiller: Function }} ctx
 */
function print_mapseen(entries, mptr, why, reason, printdun, ctx) {
    const TAB = '   ';
    const u = game.u || {};
    const wizard = !!(game.flags?.wizard || game.flags?.debug);
    const dnum = mptr.lev?.dnum | 0;
    const dun = game.dungeons?.[dnum];
    const dname = dun?.dname || 'The Dungeons of Doom';
    const knox_dnum = game.knox_level?.dnum;
    let depthstart;
    if (dnum === (game.quest_dnum | 0)
        || (knox_dnum != null && dnum === (knox_dnum | 0))) {
        depthstart = 1;
    } else {
        depthstart = dun?.depth_start | 0;
    }

    if (printdun) {
        const ureached = dun?.dunlev_ureached | 0;
        const entry = dun?.entry_lev | 0;
        let hdr;
        if (ureached === entry || In_endgame(mptr.lev)) {
            hdr = `${dname}:`;
        } else if (builds_up(mptr.lev)) {
            hdr = `${dname}: levels ${depthstart + entry - 1} up to ${depthstart + ureached - 1}`;
        } else {
            hdr = `${dname}: levels ${depthstart} to ${depthstart + ureached - 1}`;
        }
        entries.push({
            text: hdr,
            attr: why > 0 ? 0 : ctx.ATR_INVERSE,
            selectable: false,
        });
    }

    const levnum = depthstart + (mptr.lev?.dlevel | 0) - 1;
    let levLine = why !== -1 ? TAB : '';
    if (In_endgame(mptr.lev)) {
        levLine += `${ctx.endgamelevelname(levnum)}:`;
    } else {
        levLine += `Level ${levnum}:`;
    }
    if (wizard) {
        const slev = Is_special(mptr.lev);
        if (slev?.proto) levLine += ` [${slev.proto}]`;
    }
    if (mptr.custom) levLine += ` "${mptr.custom}"`;
    const onHere = on_level(u.uz, mptr.lev);
    if (onHere) {
        const verb = (why <= 0 || (why === 1 && reason === ASCENDED))
            ? 'are'
            : (why === 1 && reason === ESCAPED)
                ? 'left from'
                : 'were';
        levLine += ` <- You ${verb} here.`;
    }
    const levRow = { text: levLine, attr: 0, selectable: false };
    if (why === -1) {
        levRow.selectable = true;
        levRow.a_int = ledger_no(mptr.lev) + 1;
    }
    entries.push(levRow);

    if (mptr.flags?.forgot) return;

    add_overview_str(entries, mapseen_feat_line(mptr));
    for (const line of mapseen_named_place_lines(mptr, ctx.ldrname)) {
        add_overview_str(entries, line);
    }
    add_overview_str(entries, mapseen_branch_line(mptr));
    for (const line of mapseen_cemetery_lines(mptr, why, reason, ctx)) {
        add_overview_str(entries, line);
    }
}

/**
 * C ref: dungeon.c traverse_mapseenchn :3343–3365.
 * viewendgame XOR In_endgame skips the other half; why==0 still
 * requires interest_mapseen.
 * @param {number} viewendgame 1: Planes; 0: rest
 * @param {number} why
 * @param {number} reason
 * @param {{ v: number }} lastdun
 * @param {object[]} entries
 * @param {object} ctx
 */
function traverse_mapseenchn(viewendgame, why, reason, lastdun, entries, ctx) {
    for (const mptr of game.mapseenchn || []) {
        if (!!viewendgame !== !!In_endgame(mptr.lev)) continue;
        if (why !== 0 || interest_mapseen(mptr)) {
            const showheader = (mptr.lev?.dnum | 0) !== lastdun.v;
            print_mapseen(entries, mptr, why, reason, showheader, ctx);
            lastdun.v = mptr.lev?.dnum | 0;
        }
    }
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
 * C ref: dungeon.c query_annotation :2499-2567.
 * config.h:655 EDIT_GETLIN is commented out — live #else:
 * existing custom → Replace annotation "…" with? then getlin (empty
 * buffer). No custom → What do you want to call %s? with
 * this dungeon level or describe_level (other-level, dflgs 0 or 2).
 * The #ifdef would strncpy custom into nbuf and skip the replace prompt.
 * find_mapseen miss → return (not init_mapseen). PICK_ONE overview
 * caller is show_overview why==-1 (dooverview m-prefix / m#annotate).
 */
async function query_annotation(lev) {
    const { getlin } = await import('./getline.js');
    const mptr = find_mapseen(lev);
    if (!mptr) return;

    let nbuf;
    if (mptr.custom) {
        const custom = String(mptr.custom);
        const shown = custom.length > 30 ? `${custom.slice(0, 30)}...` : custom;
        nbuf = await getlin(`Replace annotation "${shown}" with?`);
    } else {
        let lbuf;
        const uuz = game.u?.uz;
        if (!lev || on_level(uuz, lev)) {
            lbuf = 'this dungeon level';
        } else {
            const { describe_level } = await import('./display.js');
            const dflgs = ((lev.dnum | 0) === (uuz?.dnum | 0)) ? 0 : 2;
            const save = { dnum: uuz?.dnum | 0, dlevel: uuz?.dlevel | 0 };
            if (uuz) {
                uuz.dnum = lev.dnum | 0;
                uuz.dlevel = lev.dlevel | 0;
            }
            lbuf = describe_level(dflgs);
            if (uuz) {
                uuz.dnum = save.dnum;
                uuz.dlevel = save.dlevel;
            }
            lbuf = lbuf.replace('Dlvl:', 'level ').trim();
        }
        nbuf = await getlin(`What do you want to call ${lbuf}?`);
    }
    if (!nbuf || nbuf === '\x1b') return;
    nbuf = nbuf.trim().replace(/\s+/g, ' ');
    mptr.custom = null;
    mptr.custom_lth = 0;
    if (nbuf && nbuf !== ' ') {
        mptr.custom = nbuf;
        mptr.custom_lth = nbuf.length;
    }
}

/**
 * C ref: dungeon.c donamelevel :2570–2577 (#annotate).
 * menu_requested stays set so dooverview can pass why==-1.
 */
export async function donamelevel() {
    if (game.iflags?.menu_requested) return dooverview();
    await query_annotation(null);
    return ECMD_OK;
}

/**
 * C ref: dungeon.c show_overview :3304–3340.
 * why: 0 #overview PICK_NONE; -1 m-prefix PICK_ONE then query_annotation;
 * 1/2 end disclosure PICK_NONE. Two-pass traverse_mapseenchn when
 * In_endgame (Planes above DoD). Cemetery list is print_mapseen
 * `:3696–3726` (D-1659).
 * @param {number} why
 * @param {number} reason how-died when why>0
 */
export async function show_overview(why = 0, reason = 0) {
    const { formatkiller } = await import('./end.js');
    const { ATR_INVERSE } = await import('./terminal.js');
    const { nhgetch } = await import('./input.js');
    const { flush_topl_more, endgamelevelname } = await import('./display.js');
    const { paint_corner_nhw_menu, dismiss_nhw_menu } = await import('./invent.js');
    const { ldrname } = await import('./questpgr.js');

    recalc_mapseen();
    const ctx = { ATR_INVERSE, endgamelevelname, ldrname, formatkiller };
    const entries = [];
    const lastdun = { v: -1 };
    const u = game.u || {};
    if (In_endgame(u.uz)) {
        traverse_mapseenchn(1, why, reason, lastdun, entries, ctx);
    }
    if (why > 0 || !In_endgame(u.uz)) {
        traverse_mapseenchn(0, why, reason, lastdun, entries, ctx);
    }

    await flush_topl_more();
    // C select_menu (why != -1) PICK_NONE else PICK_ONE; destroy_nhwindow
    // → erase_menu_or_text: corner docorner/gbuf; fullscreen docrt.
    if (why === -1) {
        const { select_menu_pick_one } = await import('./options.js');
        const res = await select_menu_pick_one(entries);
        if (res.kind === 'pick' && (res.item?.a_int | 0) > 0) {
            const ledger = (res.item.a_int | 0) - 1;
            await query_annotation({
                dnum: ledger_to_dnum(ledger),
                dlevel: ledger_to_dlev(ledger),
            });
        }
        return;
    }
    for (;;) {
        await paint_corner_nhw_menu(entries, '(end) ');
        const key = await nhgetch();
        await dismiss_nhw_menu();
        if (key === 27 || key === 32 || key === 13 || key === 10) break;
    }
}

/**
 * C ref: dungeon.c dooverview :3293–3301 (#overview / ^O).
 * menu_requested → why==-1 PICK_ONE; then clear the flag.
 */
export async function dooverview() {
    const why = game.iflags?.menu_requested ? -1 : 0;
    await show_overview(why, 0);
    if (game.iflags) game.iflags.menu_requested = false;
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
 * bymenu → tport_menu rows; else → putstr lines (wizwhere).
 */
function print_branch(out, dnum, lowerBound, upperBound, bymenu, lchoices) {
    for (const br of game.branches || []) {
        if ((br.end1?.dnum | 0) !== dnum) continue;
        const ed = br.end1.dlevel | 0;
        if (!(lowerBound < ed && ed <= upperBound)) continue;
        const destName = game.dungeons?.[br.end2?.dnum | 0]?.dname || '?';
        const buf = `${bymenu ? chr_u_on_lvl(br.end1) : ' '} ${br_string(br.type)} to ${destName}: ${depth_of(br.end1)}`;
        if (bymenu) {
            tport_menu(
                out,
                buf,
                lchoices,
                br.end1,
                unreachable_level(br.end1, false),
            );
        } else {
            out.push(buf);
        }
    }
}

/**
 * C ref: dungeon.c print_dungeon — wizard ^V `?` menu + #wizwhere text.
 *
 * Ported: bymenu=TRUE PICK_ONE path (headings + specials + branches +
 * continuous selectors + unreachable Knox letter skip) + tty_end_menu
 * prompt/blank row (D-0563) + bot() after dismiss (D-0568); bymenu=FALSE
 * NHW_MENU putstr + display_nhwindow → process_text_window/dmore
 * (#wizwhere / D-0928 #1115/#1183 — not NHW_TEXT show_text_pages).
 * Sets dest.lev / dest.dgn and returns logical depth (playerlev), or 0
 * on cancel.
 * Named omissions: floating-branch detail beyond stub; Invocation/portal
 * debug lines; endgame amulet grant after pick (level_tele).
 *
 * @param {boolean} bymenu
 * @param {{ lev?: number, dgn?: number } | null} dest
 * @returns {Promise<number>}
 */
export async function print_dungeon(bymenu, dest = null) {
    const { makeplural } = await import('./objnam.js');
    const { Is_stronghold } = await import('./const.js');

    const nDgns = game.n_dgns | 0;
    const astral = game.astral_level;
    const uz = game.u?.uz;
    const inEndgame = !!(uz && astral && (uz.dnum | 0) === (astral.dnum | 0));

    // --- bymenu=FALSE: #wizwhere — C create_nhwindow(NHW_MENU)+putstr ---
    if (!bymenu) {
        // C dungeon.c print_dungeon: always NHW_MENU (even when !bymenu);
        // dmore offset 2 → leading blank + `--More--` cursor col9 (#1183).
        const { show_nhw_menu_text } = await import('./pager.js');
        const lines = [];
        for (let i = 0; i < nDgns; i++) {
            const dptr = game.dungeons[i];
            if (!dptr) continue;
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
            lines.push(buf);

            let lastLevel = 0;
            for (const slev of game.sp_levchn || []) {
                if ((slev.dlevel?.dnum | 0) !== i) continue;
                print_branch(lines, i, lastLevel, slev.dlevel.dlevel | 0, false, null);
                let line = `${chr_u_on_lvl(slev.dlevel)} ${slev.proto}: ${depth_of(slev.dlevel)}`;
                if (Is_stronghold(slev.dlevel) && game.tune) {
                    line += ` (tune ${game.tune})`;
                }
                lines.push(line);
                lastLevel = slev.dlevel.dlevel | 0;
            }
            print_branch(lines, i, lastLevel, MAXLEVEL, false, null);
        }
        // C: floating branches (end1.dnum == n_dgns)
        let firstFloat = true;
        for (const br of game.branches || []) {
            if ((br.end1?.dnum | 0) !== nDgns) continue;
            if (firstFloat) {
                lines.push('');
                lines.push('Floating branches');
                firstFloat = false;
            }
            const destName = game.dungeons?.[br.end2?.dnum | 0]?.dname || '?';
            lines.push(`   ${br_string(br.type)} to ${destName}`);
        }
        // Invocation / portal debug lines deferred
        await show_nhw_menu_text(lines);
        return 0;
    }

    const { ATR_INVERSE } = await import('./terminal.js');
    const { select_menu_pick_one } = await import('./options.js');

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
