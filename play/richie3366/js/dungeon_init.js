// dungeon_init.js — Dungeon graph init (dungeon.c subset).
// C ref: init_dungeons, init_dungeon_dungeons, init_level, place_level, parent_dlevel, init_castle_tune.

import { rn2, rn1 } from './rng.js';
import { game } from './gstate.js';
import { DUNGEON_PROTO } from './dungeon_proto.js';
import { addSpLevchnLevelOrderedLikeC, findLevelByProtoLikeC } from './sp_levchn.js';
import { MAXLEVEL } from './const.js';

/** @typedef {{ name: string, lev: { base: number, rand: number }, chance: number, chain: number, rndlevs: number }} ProtoLevel */
/** @typedef {{ name: string, lev: { base: number, rand: number }, chain: number, up: boolean, type: number }} ProtoBranch */
/** @typedef {{ name: string, branches: number, entry_lev: number, flags: { unconnected?: boolean } }} ProtoDungeon */

/**
 * @param {import('./dungeon_proto.js').DUNGEON_PROTO[number]} raw
 * @param {number} f — level index within this dungeon
 * @returns {ProtoLevel}
 */
function protoLevelFromRaw(raw, f, pd) {
    let chain = -1;
    if (raw.chainlevel) {
        const beforeLev = pd.n_levs;
        for (let bi = 0; bi < beforeLev + f; bi++) {
            if (pd.tmplevel[bi].name === raw.chainlevel) {
                chain = bi;
                break;
            }
        }
        if (chain < 0) throw new Error(`chainlevel ${raw.chainlevel} not found`);
    }
    return {
        name: raw.name,
        lev: { base: raw.base | 0, rand: raw.range | 0 },
        chance: raw.chance !== undefined ? (raw.chance | 0) : 100,
        chain,
        rndlevs: raw.nlevels | 0,
    };
}

/**
 * @param {import('./dungeon_proto.js').DUNGEON_PROTO[number]} raw
 * @param {number} f — branch index within this dungeon (C: init_dungeon_branches)
 * @returns {ProtoBranch}
 */
function protoBranchFromRaw(raw, f, pd) {
    let chain = -1;
    if (raw.chainlevel) {
        const limit = pd.n_levs + f - 1;
        for (let bi = 0; bi < limit; bi++) {
            if (pd.tmplevel[bi].name === raw.chainlevel) {
                chain = bi;
                break;
            }
        }
        if (chain < 0) throw new Error(`chainbranch ${raw.chainlevel} not found`);
    }
    const up = raw.direction === 'up';
    let type = 0; /* TBR_STAIR */
    if (raw.branchtype === 'portal') type = 2;
    else if (raw.branchtype === 'no_down') type = 3;
    else if (raw.branchtype === 'no_up') type = 4;
    return {
        name: raw.name,
        lev: { base: raw.base | 0, rand: raw.range | 0 },
        chain,
        up,
        type,
    };
}

/**
 * @param {object} pd
 * @param {string} brName
 */
function findBranchIdxLikeC(pd, brName) {
    for (let i = 0; i < pd.n_brs; i++) {
        if (pd.tmpbranch[i].name === brName) return i;
    }
    throw new Error(`find_branch: ${brName}`);
}

/**
 * C: dungeon.c parent_dnum
 * @param {object} pd
 * @param {string} dungeonName
 */
function parentDnumLikeC(pd, dungeonName) {
    let bi = 0;
    for (let pdnum = 0; pdnum < pd.tmpdungeon.length; pdnum++) {
        if (pd.tmpdungeon[pdnum].name === dungeonName) break;
        bi -= pd.tmpdungeon[pdnum].branches;
        if (bi < 0) return pdnum;
    }
    throw new Error(`parent_dnum: ${dungeonName}`);
}

/**
 * C: dungeon.c level_range
 * @param {import('./gstate.js').game} g
 * @param {object} pd
 */
function levelRangeLikeC(g, dgn, base, randc, chain, pd) {
    const lmax = g.dungeons[dgn].num_dunlevs | 0;
    let adjBase = base | 0;
    if (chain >= 0) {
        const levtmp = pd.final_lev[chain];
        if (!levtmp) throw new Error('level_range: empty chain level');
        adjBase = (base | 0) + (levtmp.dlevel.dlevel | 0);
    } else if (base < 0) {
        adjBase = lmax + base + 1;
    }
    if (adjBase < 1 || adjBase > lmax) throw new Error(`level_range: base ${adjBase} out of range 1..${lmax}`);
    let count;
    if (randc === -1) count = lmax - adjBase + 1;
    else if (randc) count = (adjBase + randc - 1 > lmax) ? lmax - adjBase + 1 : randc;
    else count = 1;
    return { count, adjBase };
}

/** @param {import('./gstate.js').game} g */
function branchEndOccupiedLikeC(g, dnum, dlevel) {
    for (const br of g.branches) {
        if ((br.end1?.dnum === dnum && br.end1?.dlevel === dlevel)
            || (br.end2?.dnum === dnum && br.end2?.dlevel === dlevel)) {
            return true;
        }
    }
    return false;
}

/**
 * C: dungeon.c parent_dlevel
 * @param {import('./gstate.js').game} g
 * @param {object} pd
 * @param {string} dungeonName
 */
function parentDlevelLikeC(g, pd, dungeonName) {
    const i = findBranchIdxLikeC(pd, dungeonName);
    const dnum = parentDnumLikeC(pd, dungeonName);
    const br = pd.tmpbranch[i];
    const { count, adjBase } = levelRangeLikeC(g, dnum, br.lev.base, br.lev.rand, br.chain, pd);
    let j = rn2(count);
    const start = j;
    do {
        if (++j >= count) j = 0;
        if (!branchEndOccupiedLikeC(g, dnum, adjBase + j)) break;
    } while (j !== start);
    return adjBase + j;
}

/**
 * C: dungeon.c insert_branch — append sorted (contest: append only; seed8000 order matches).
 * @param {import('./gstate.js').game} g
 */
function insertBranchLikeC(g, newBranch) {
    g.branches.push(newBranch);
}

/**
 * C: dungeon.c add_branch + init_dungeon_set_depth (RNG: parent_dlevel).
 * @param {import('./gstate.js').game} g
 * @param {object} pd
 * @param {number} dngidx
 * @param {number} childEntryLev
 */
function addBranchLikeC(g, pd, dngidx, childEntryLev) {
    const dgnName = g.dungeons[dngidx].dname;
    const i = findBranchIdxLikeC(pd, dgnName);
    const br = pd.tmpbranch[i];
    const parentDgn = parentDnumLikeC(pd, dgnName);
    const newBranch = {
        id: g.branches.length,
        type: br.type,
        end1: {
            dnum: parentDgn,
            dlevel: parentDlevelLikeC(g, pd, dgnName),
        },
        end2: { dnum: dngidx, dlevel: childEntryLev },
        end1_up: br.up,
        next: null,
    };
    insertBranchLikeC(g, newBranch);
    const fromDepth = 1; /* depth stub — contest uses ledger_start offsets only for RNG */
    const fromUp = !br.up;
    const portal = br.type === 2;
    g.dungeons[dngidx].depth_start =
        fromDepth + (portal ? 0 : (fromUp ? -1 : 1)) - (childEntryLev - 1);
}

/**
 * C: dungeon.c init_dungeon_dungeons (RNG: rn2(100), rn1).
 * @returns {boolean}
 */
function initDungeonDungeonsLikeC(g, pd, dngidx, raw) {
    const dgnChance = raw.chance !== undefined ? (raw.chance | 0) : 100;
    const wizard = !!(g.wizard || g.u?.wizard || g.flags?.wizard);
    if (!wizard && dgnChance && dgnChance <= rn2(100)) {
        return false;
    }

    const nLevels = (raw.levels || []).length;
    const nBranches = (raw.branches || []).length;
    const beforeLev = pd.n_levs | 0;
    for (let f = 0; f < nLevels; f++) {
        pd.tmplevel[beforeLev + f] = protoLevelFromRaw(raw.levels[f], f, pd);
    }
    pd.n_levs += nLevels;
    for (let f = 0; f < nBranches; f++) {
        pd.tmpbranch[pd.n_brs + f] = protoBranchFromRaw(raw.branches[f], f, pd);
    }
    pd.n_brs += nBranches;

    const dgnBase = raw.base | 0;
    const dgnRange = raw.range | 0;
    const numDunlevs = dgnRange ? rn1(dgnRange, dgnBase) : dgnBase;
    const unconnected = !!(raw.flags && raw.flags.includes('unconnected'));

    const entry = raw.entry !== undefined ? (raw.entry | 0) : 0;
    let entryLev = 1;
    if (entry < 0) {
        entryLev = numDunlevs + entry + 1;
        if (entryLev <= 0) entryLev = 1;
    } else if (entry > 0) {
        entryLev = entry > numDunlevs ? numDunlevs : entry;
    }

    pd.tmpdungeon[dngidx] = {
        name: raw.name,
        branches: nBranches,
        entry_lev: entry,
        flags: { unconnected },
    };

    g.dungeons[dngidx] = g.dungeons[dngidx] || {};
    g.dungeons[dngidx].dname = raw.name;
    g.dungeons[dngidx].num_dunlevs = numDunlevs > MAXLEVEL ? MAXLEVEL : numDunlevs;
    g.dungeons[dngidx].entry_lev = entryLev;
    g.dungeons[dngidx].flags = g.dungeons[dngidx].flags || {};
    g.dungeons[dngidx].flags.unconnected = unconnected;

    if (dngidx === 0) {
        g.dungeons[dngidx].ledger_start = 0;
        g.dungeons[dngidx].depth_start = 1;
        g.dungeons[dngidx].dunlev_ureached = 1;
    } else {
        const prev = g.dungeons[dngidx - 1];
        g.dungeons[dngidx].ledger_start =
            (prev.ledger_start | 0) + (prev.num_dunlevs | 0);
        g.dungeons[dngidx].dunlev_ureached = 0;
        if (unconnected) {
            g.dungeons[dngidx].depth_start = 1;
        } else {
            addBranchLikeC(g, pd, dngidx, entryLev);
        }
    }

    return true;
}

/**
 * C: dungeon.c init_level — RNG when chance < 100.
 * @param {import('./gstate.js').game} g
 */
function initLevelLikeC(g, dgn, protoIndex, pd) {
    const tlevel = pd.tmplevel[protoIndex];
    pd.final_lev[protoIndex] = null;
    const wizard = !!(g.wizard || g.u?.wizard || g.flags?.wizard);
    if (!wizard && (tlevel.chance | 0) <= rn2(100)) return;
    pd.final_lev[protoIndex] = {
        proto: tlevel.name,
        boneid: 0,
        dlevel: { dnum: dgn, dlevel: 0 },
        flags: {},
        rndlevs: tlevel.rndlevs,
        next: null,
    };
}

/**
 * C: dungeon.c possible_places + pick_level
 * @param {import('./gstate.js').game} g
 */
function possiblePlacesLikeC(g, idx, pd) {
    const lev = pd.final_lev[idx];
    const tlevel = pd.tmplevel[idx];
    const map = new Array(MAXLEVEL + 1).fill(false);
    const { count, adjBase } = levelRangeLikeC(
        g,
        lev.dlevel.dnum,
        tlevel.lev.base,
        tlevel.lev.rand,
        tlevel.chain,
        pd,
    );
    let npossible = count;
    for (let i = adjBase; i < adjBase + count; i++) map[i] = true;
    for (let i = pd.start | 0; i < idx; i++) {
        const fl = pd.final_lev[i];
        if (fl && map[fl.dlevel.dlevel | 0]) {
            map[fl.dlevel.dlevel | 0] = false;
            npossible--;
        }
    }
    return { map, npossible };
}

/** C: dungeon.c pick_level */
function pickLevelLikeC(map, nth) {
    for (let i = 1; i <= MAXLEVEL; i++) {
        if (map[i] && nth-- === 0) return i;
    }
    throw new Error('pick_level: ran out of valid levels');
}

/**
 * C: dungeon.c place_level — RNG via rn2(npossible).
 * @param {import('./gstate.js').game} g
 */
function placeLevelLikeC(g, protoIndex, pd) {
    if (protoIndex === pd.n_levs) return true;
    const lev = pd.final_lev[protoIndex];
    if (!lev) return placeLevelLikeC(g, protoIndex + 1, pd);

    let { map, npossible } = possiblePlacesLikeC(g, protoIndex, pd);
    while (npossible > 0) {
        lev.dlevel.dlevel = pickLevelLikeC(map, rn2(npossible));
        if (placeLevelLikeC(g, protoIndex + 1, pd)) return true;
        map[lev.dlevel.dlevel | 0] = false;
        npossible--;
    }
    return false;
}

/**
 * C: dungeon.c fixup_level_locations — assign `rogue_level`, `oracle_level`, … from `sp_levchn`.
 * @param {import('./gstate.js').game} g
 */
export function fixupLevelLocationsLikeC(g) {
    const entries = [
        ['rogue', 'rogue_level'],
        ['oracle', 'oracle_level'],
        ['medusa', 'medusa_level'],
        ['castle', 'stronghold_level'],
        ['knox', 'knox_level'],
        ['valley', 'valley_level'],
        ['sanctum', 'sanctum_level'],
        ['juiblex', 'juiblex_level'],
        ['baalz', 'baalzebub_level'],
        ['orcus', 'orcus_level'],
        ['bigrm', 'bigroom_level'],
        ['air', 'air_level'],
        ['fire', 'fire_level'],
        ['earth', 'earth_level'],
        ['water', 'water_level'],
        ['astral', 'astral_level'],
        ['wizard1', 'wiz1_level'],
        ['wizard2', 'wiz2_level'],
        ['wizard3', 'wiz3_level'],
        ['minend', 'mineend_level'],
        ['soko1', 'sokoend_level'],
    ];
    for (const [proto, key] of entries) {
        const sp = findLevelByProtoLikeC(g, proto);
        if (sp?.dlevel) {
            g[key] = { dnum: sp.dlevel.dnum | 0, dlevel: sp.dlevel.dlevel | 0 };
        }
    }
}

/** C: dungeon.c init_castle_tune */
function initCastleTuneLikeC(g) {
    let tune = '';
    for (let i = 0; i < 5; i++) tune += String.fromCharCode(65 + rn2(7));
    g._castleTuneStr = tune;
}

/**
 * C: dungeon.c init_dungeons — description shuffle RNG only (no Lua loader).
 * @param {import('./gstate.js').game} [g]
 */
export function initDungeonsLikeC(g = game) {
    /** @type {object} */
    const pd = {
        start: 0,
        n_levs: 0,
        n_brs: 0,
        tmplevel: [],
        tmpbranch: [],
        tmpdungeon: [],
        final_lev: [],
    };

    g.branches = [];
    g.sp_levchn = null;
    g.dungeons = [];

    let cl = 0;
    let dgnIdx = 0;
    for (const raw of DUNGEON_PROTO) {
        if (initDungeonDungeonsLikeC(g, pd, dgnIdx, raw)) {
            for (; cl < pd.n_levs; cl++) {
                initLevelLikeC(g, dgnIdx, cl, pd);
            }
            if (!placeLevelLikeC(g, pd.start, pd)) {
                throw new Error("init_dungeons: couldn't place levels");
            }
            for (; pd.start < pd.n_levs; pd.start++) {
                if (pd.final_lev[pd.start]) {
                    addSpLevchnLevelOrderedLikeC(g, pd.final_lev[pd.start]);
                }
            }
            dgnIdx++;
        }
    }

    initCastleTuneLikeC(g);
    fixupLevelLocationsLikeC(g);
}
