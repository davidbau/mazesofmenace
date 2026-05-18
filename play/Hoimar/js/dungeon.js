// dungeon.js -- early dungeon topology initialization.
// C ref: dungeon.c:init_dungeons(), dat/dungeon.lua.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { A_CHAOTIC, A_LAWFUL, A_NEUTRAL, A_NONE } from './const.js';

const DUNGEON_SPEC = [
    {
        name: 'The Dungeons of Doom', bonetag: 'D', base: 25, range: 5,
        alignment: 'unaligned', themerooms: 'themerms.lua',
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
        name: 'Gehennom', bonetag: 'G', base: 20, range: 5,
        flags: ['mazelike', 'hellish'], lvlfill: 'hellfill', alignment: 'noalign',
        branches: [{ name: "Vlad's Tower", base: 9, range: 5, direction: 'up' }],
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
        name: 'The Gnomish Mines', bonetag: 'M', base: 8, range: 2,
        alignment: 'lawful', flags: ['mazelike'], lvlfill: 'minefill',
        levels: [
            { name: 'minetn', bonetag: 'T', base: 3, range: 2, nlevels: 7, flags: 'town' },
            { name: 'minend', base: -1, nlevels: 3 },
        ],
    },
    {
        name: 'The Quest', bonetag: 'Q', base: 5, range: 2,
        levels: [
            { name: 'x-strt', base: 1, range: 1 },
            { name: 'x-loca', bonetag: 'L', base: 3, range: 1 },
            { name: 'x-goal', base: -1 },
        ],
    },
    {
        name: 'Sokoban', base: 4, alignment: 'neutral', flags: ['mazelike'], entry: -1,
        levels: [
            { name: 'soko1', base: 1, nlevels: 2 },
            { name: 'soko2', base: 2, nlevels: 2 },
            { name: 'soko3', base: 3, nlevels: 2 },
            { name: 'soko4', base: 4, nlevels: 2 },
        ],
    },
    {
        name: 'Fort Ludios', base: 1, bonetag: 'K', flags: ['mazelike'], alignment: 'unaligned',
        levels: [{ name: 'knox', bonetag: 'K', base: -1 }],
    },
    {
        name: "Vlad's Tower", base: 3, bonetag: 'T', protofile: 'tower',
        alignment: 'chaotic', flags: ['mazelike'], entry: -1,
        levels: [
            { name: 'tower1', base: 1 },
            { name: 'tower2', base: 2 },
            { name: 'tower3', base: 3 },
        ],
    },
    {
        name: 'The Elemental Planes', bonetag: 'E', base: 6,
        alignment: 'unaligned', flags: ['mazelike'], entry: -2,
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
        name: 'The Tutorial', base: 2, flags: ['mazelike', 'unconnected'],
        levels: [
            { name: 'tut-1', base: 1 },
            { name: 'tut-2', base: 2 },
        ],
    },
];

function luaCoreShuffle() {
    const align = [0, 0, 0];
    for (let i = align.length; i > 1; i--) {
        const j = rn2(i);
        [align[i - 1], align[j]] = [align[j], align[i - 1]];
    }
    return align;
}

function dgnFlags(spec) {
    const flags = Array.isArray(spec.flags) ? spec.flags : spec.flags ? [spec.flags] : [];
    return {
        hellish: flags.includes('hellish'),
        maze_like: flags.includes('mazelike'),
        rogue_like: flags.includes('roguelike'),
        unconnected: flags.includes('unconnected'),
        town: flags.includes('town'),
        align: dgnAlign(spec.alignment),
    };
}

function dgnAlign(name = 'unaligned') {
    switch (name) {
    case 'lawful': return A_LAWFUL;
    case 'neutral': return A_NEUTRAL;
    case 'chaotic': return A_CHAOTIC;
    case 'noalign':
    case 'unaligned':
    default:
        return A_NONE;
    }
}

function levelRange(pd, dgn, base0, randc = 0, chain = -1) {
    let base = base0;
    const lmax = pd.dungeons[dgn].num_dunlevs;
    if (chain >= 0) {
        const chained = pd.finalLevels[chain];
        if (!chained) throw new Error('level_range: empty chain level');
        base += chained.dlevel.dlevel;
    } else if (base < 0) {
        base = lmax + base + 1;
    }
    if (base < 1 || base > lmax) throw new Error('level_range: base value out of range');
    if (randc === -1) return { base, count: lmax - base + 1 };
    if (randc) return { base, count: Math.min(randc, lmax - base + 1) };
    return { base, count: 1 };
}

function findBranch(pd, name) {
    const idx = pd.tmpBranches.findIndex((br) => br.name === name);
    if (idx < 0) throw new Error(`find_branch: can't find ${name}`);
    return idx;
}

function parentDnum(pd, name) {
    let branchIdx = findBranch(pd, name);
    for (let dnum = 0; pd.tmpDungeons[dnum]?.name !== name; dnum++) {
        branchIdx -= pd.tmpDungeons[dnum]?.branches ?? 0;
        if (branchIdx < 0) return dnum;
    }
    throw new Error(`parent_dnum: couldn't resolve ${name}`);
}

function parentDlevel(pd, name) {
    const branchIdx = findBranch(pd, name);
    const dnum = parentDnum(pd, name);
    const br = pd.tmpBranches[branchIdx];
    const { base, count } = levelRange(pd, dnum, br.base, br.range, br.chain);
    let i = rn2(count);
    const first = i;
    do {
        i += 1;
        if (i >= count) i = 0;
        const dlevel = base + i;
        const occupied = pd.branches.some((curr) =>
            (curr.end1.dnum === dnum && curr.end1.dlevel === dlevel)
            || (curr.end2.dnum === dnum && curr.end2.dlevel === dlevel));
        if (!occupied) return dlevel;
    } while (i !== first);
    return base + i;
}

function branchVal(br) {
    return ((((br.end1.dnum * 31) + br.end1.dlevel) * 10 * 31)
        + (br.end2.dnum * 31) + br.end2.dlevel);
}

function insertBranch(pd, branch) {
    const val = branchVal(branch);
    let idx = 0;
    while (idx < pd.branches.length && branchVal(pd.branches[idx]) < val) idx++;
    pd.branches.splice(idx, 0, branch);
}

function addBranch(pd, dgn, childEntryLevel) {
    const branchIdx = findBranch(pd, pd.dungeons[dgn].dname);
    const tmp = pd.tmpBranches[branchIdx];
    const branch = {
        id: pd.nextBranchId++,
        type: tmp.type,
        end1: { dnum: parentDnum(pd, pd.dungeons[dgn].dname), dlevel: parentDlevel(pd, pd.dungeons[dgn].dname) },
        end2: { dnum: dgn, dlevel: childEntryLevel },
        end1_up: !!tmp.up,
    };
    insertBranch(pd, branch);
    return branch;
}

function depthOf(pd, lev) {
    const dungeon = pd.dungeons[lev.dnum];
    return (dungeon?.depth_start ?? 1) + lev.dlevel - 1;
}

function setDungeonEntry(pd, dgn) {
    const dungeon = pd.dungeons[dgn];
    const entry = pd.tmpDungeons[dgn].entry_lev;
    if (entry < 0) dungeon.entry_lev = Math.max(1, dungeon.num_dunlevs + entry + 1);
    else if (entry > 0) dungeon.entry_lev = Math.min(entry, dungeon.num_dunlevs);
    else dungeon.entry_lev = 1;
}

function setDungeonDepth(pd, dgn) {
    const br = addBranch(pd, dgn, pd.dungeons[dgn].entry_lev);
    let fromDepth, fromUp;
    if (br.end1.dnum === dgn) {
        fromDepth = depthOf(pd, br.end2);
        fromUp = !br.end1_up;
    } else {
        fromDepth = depthOf(pd, br.end1);
        fromUp = br.end1_up;
    }
    pd.dungeons[dgn].depth_start = fromDepth + (br.type === 'portal' ? 0 : (fromUp ? -1 : 1))
        - (pd.dungeons[dgn].entry_lev - 1);
}

function resolveChainLevel(pd, name, upto) {
    for (let i = 0; i < upto; i++) {
        if (pd.tmpLevels[i]?.name === name) return i;
    }
    throw new Error(`Could not chain to level ${name}`);
}

function addLevelSpecs(pd, dgn, levels = []) {
    const start = pd.n_levs;
    pd.tmpDungeons[dgn].levels = levels.length;
    for (let f = 0; f < levels.length; f++) {
        const spec = levels[f];
        const idx = start + f;
        pd.tmpLevels[idx] = {
            name: spec.name,
            base: spec.base,
            range: spec.range || 0,
            chance: spec.chance ?? 100,
            rndlevs: spec.nlevels || 0,
            flags: dgnFlags(spec),
            bonetag: spec.bonetag || '',
            chain: spec.chainlevel ? resolveChainLevel(pd, spec.chainlevel, idx) : -1,
        };
    }
    pd.n_levs += levels.length;
}

function addBranchSpecs(pd, dgn, branches = []) {
    const start = pd.n_brs;
    pd.tmpDungeons[dgn].branches = branches.length;
    for (let f = 0; f < branches.length; f++) {
        const spec = branches[f];
        const idx = start + f;
        pd.tmpBranches[idx] = {
            name: spec.name,
            base: spec.base,
            range: spec.range || 0,
            type: spec.branchtype || 'stair',
            up: spec.direction === 'up',
            chain: spec.chainlevel ? resolveChainLevel(pd, spec.chainlevel, pd.n_levs + f - 1) : -1,
        };
    }
    pd.n_brs += branches.length;
}

function initLevel(pd, dgn, idx) {
    const tmp = pd.tmpLevels[idx];
    pd.finalLevels[idx] = null;
    if (!game.flags?.debug && tmp.chance <= rn2(100)) return;
    pd.finalLevels[idx] = {
        proto: tmp.name,
        boneid: tmp.bonetag,
        dlevel: { dnum: dgn, dlevel: 0 },
        flags: tmp.flags,
        rndlevs: tmp.rndlevs,
    };
}

function possiblePlaces(pd, idx) {
    const lev = pd.finalLevels[idx];
    const tmp = pd.tmpLevels[idx];
    const { base, count } = levelRange(pd, lev.dlevel.dnum, tmp.base, tmp.range, tmp.chain);
    const places = [];
    for (let i = 0; i < count; i++) places.push(base + i);
    for (let i = pd.start; i < idx; i++) {
        const placed = pd.finalLevels[i]?.dlevel?.dlevel;
        const pidx = places.indexOf(placed);
        if (pidx >= 0) places.splice(pidx, 1);
    }
    return places;
}

function pickLevel(places, nth) {
    return places[nth];
}

function placeLevel(pd, idx) {
    if (idx === pd.n_levs) return true;
    const lev = pd.finalLevels[idx];
    if (!lev) return placeLevel(pd, idx + 1);

    const places = possiblePlaces(pd, idx);
    for (let npossible = places.length; npossible > 0; npossible--) {
        const nth = rn2(npossible);
        lev.dlevel.dlevel = pickLevel(places, nth);
        if (placeLevel(pd, idx + 1)) return true;
        places.splice(places.indexOf(lev.dlevel.dlevel), 1);
    }
    return false;
}

function addFinalLevels(pd) {
    for (; pd.start < pd.n_levs; pd.start++) {
        const lev = pd.finalLevels[pd.start];
        if (lev) pd.specialLevels.push(lev);
    }
}

function initCastleTune() {
    game.castle_tune = [];
    for (let i = 0; i < 5; i++) game.castle_tune.push(String.fromCharCode(65 + rn2(7)));
}

function fixupLevelLocations(pd) {
    const map = new Map(pd.specialLevels.map((lev) => [lev.proto, lev.dlevel]));
    game.rogue_level = map.get('rogue') || null;
    game.oracle_level = map.get('oracle') || null;
    game.medusa_level = map.get('medusa') || null;
    game.stronghold_level = map.get('castle') || null;
    game.wiz1_level = map.get('wizard1') || null;
}

function fixupKnoxFloatingBranch(pd) {
    const knox = pd.specialLevels.find((lev) => lev.proto === 'knox');
    if (!knox?.dlevel) return;
    const branch = pd.branches.find((br) =>
        br.end2?.dnum === knox.dlevel.dnum && br.end2?.dlevel === knox.dlevel.dlevel);
    if (branch) branch.end1.dnum = pd.dungeons.length;
}

function fixupDummySurfaceLevel(pd) {
    const dummy = pd.specialLevels.find((lev) => lev.proto === 'dummy');
    if (!dummy?.dlevel) return;
    const dgn = pd.dungeons[dummy.dlevel.dnum];
    if (dgn && dgn.num_dunlevs > 1 - dgn.depth_start) dgn.depth_start -= 1;
}

export function init_dungeons() {
    luaCoreShuffle();
    const pd = {
        tmpDungeons: [],
        tmpLevels: [],
        tmpBranches: [],
        finalLevels: [],
        specialLevels: [],
        dungeons: [],
        branches: [],
        start: 0,
        n_levs: 0,
        n_brs: 0,
        nextBranchId: 0,
    };

    let activeDgn = 0;
    for (const spec of DUNGEON_SPEC) {
        if (!game.flags?.debug && (spec.chance ?? 100) && ((spec.chance ?? 100) <= rn2(100))) continue;

        const dgn = activeDgn++;
        pd.tmpDungeons[dgn] = {
            name: spec.name,
            base: spec.base,
            range: spec.range || 0,
            entry_lev: spec.entry || 0,
            branches: 0,
            levels: 0,
            flags: dgnFlags(spec),
        };
        addLevelSpecs(pd, dgn, spec.levels || []);
        addBranchSpecs(pd, dgn, spec.branches || []);

        const num_dunlevs = spec.range ? spec.base + rn2(spec.range) : spec.base;
        const prev = pd.dungeons[dgn - 1];
        pd.dungeons[dgn] = {
            dname: spec.name,
            proto: spec.protofile || '',
            fill_lvl: spec.lvlfill || '',
            themerms: spec.themerooms || '',
            boneid: spec.bonetag || '',
            num_dunlevs,
            ledger_start: dgn ? prev.ledger_start + prev.num_dunlevs : 0,
            depth_start: dgn ? 1 : 1,
            dunlev_ureached: dgn ? 0 : 1,
            flags: dgnFlags(spec),
        };
        if (spec.name === 'The Gnomish Mines') game.mines_dnum = dgn;
        if (spec.name === 'The Quest') game.quest_dnum = dgn;
        setDungeonEntry(pd, dgn);
        if (!pd.dungeons[dgn].flags.unconnected && dgn) setDungeonDepth(pd, dgn);
        if (pd.dungeons[dgn].num_dunlevs > 30) pd.dungeons[dgn].num_dunlevs = 30;

        for (; pd.initCursor === undefined || pd.initCursor < pd.n_levs;) {
            if (pd.initCursor === undefined) pd.initCursor = 0;
            if (pd.initCursor >= pd.n_levs) break;
            initLevel(pd, dgn, pd.initCursor++);
        }
        if (!placeLevel(pd, pd.start)) throw new Error("init_dungeon: couldn't place levels");
        addFinalLevels(pd);
    }

    initCastleTune();
    fixupKnoxFloatingBranch(pd);
    fixupDummySurfaceLevel(pd);
    game.dungeons = pd.dungeons;
    game.branches = pd.branches;
    game.specialLevels = pd.specialLevels;
    fixupLevelLocations(pd);
}
