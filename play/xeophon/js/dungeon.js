// dungeon.js — dungeon topology initialization.
// C refs:
// - src/dungeon.c:init_dungeons()
// - src/dungeon.c:init_dungeon_dungeons()
// - src/dungeon.c:place_level()
// - dat/dungeon.lua

import { game } from './gstate.js';
import { rn2, rn1 } from './rng.js';

const DUNGEON_DATA = [
    {
        name: 'The Dungeons of Doom', base: 25, range: 5,
        branches: [
            { name: 'The Gnomish Mines', base: 2, range: 3 },
            { name: 'Sokoban', chainlevel: 'oracle', base: 1, direction: 'up' },
            { name: 'The Quest', chainlevel: 'oracle', base: 6, range: 2, branchtype: 'portal' },
            { name: 'Fort Ludios', base: 18, range: 4, branchtype: 'portal' },
            { name: 'Gehennom', chainlevel: 'castle', base: 0, branchtype: 'no_down' },
            { name: 'The Elemental Planes', base: 1, branchtype: 'no_down', direction: 'up' },
        ],
        levels: [
            { name: 'rogue', base: 15, range: 4 },
            { name: 'oracle', base: 5, range: 5 },
            { name: 'bigrm', base: 10, range: 3, chance: 40 },
            { name: 'medusa', base: -5, range: 4 },
            { name: 'castle', base: -1 },
        ],
    },
    {
        name: 'Gehennom', base: 20, range: 5,
        branches: [{ name: "Vlad's Tower", base: 9, range: 5, direction: 'up' }],
        levels: [
            { name: 'valley', base: 1 },
            { name: 'sanctum', base: -1 },
            { name: 'juiblex', base: 4, range: 4 },
            { name: 'baalz', base: 6, range: 4 },
            { name: 'asmodeus', base: 2, range: 6 },
            { name: 'wizard1', base: 11, range: 6 },
            { name: 'wizard2', chainlevel: 'wizard1', base: 1 },
            { name: 'wizard3', chainlevel: 'wizard1', base: 2 },
            { name: 'orcus', base: 10, range: 6 },
            { name: 'fakewiz1', base: -6, range: 4 },
            { name: 'fakewiz2', base: -6, range: 4 },
        ],
    },
    {
        name: 'The Gnomish Mines', base: 8, range: 2,
        levels: [
            { name: 'minetn', base: 3, range: 2 },
            { name: 'minend', base: -1 },
        ],
    },
    {
        name: 'The Quest', base: 5, range: 2,
        levels: [
            { name: 'x-strt', base: 1, range: 1 },
            { name: 'x-loca', base: 3, range: 1 },
            { name: 'x-goal', base: -1 },
        ],
    },
    {
        name: 'Sokoban', base: 4, entry: -1,
        levels: [
            { name: 'soko1', base: 1 },
            { name: 'soko2', base: 2 },
            { name: 'soko3', base: 3 },
            { name: 'soko4', base: 4 },
        ],
    },
    { name: 'Fort Ludios', base: 1, levels: [{ name: 'knox', base: -1 }] },
    {
        name: "Vlad's Tower", base: 3, entry: -1,
        levels: [
            { name: 'tower1', base: 1 },
            { name: 'tower2', base: 2 },
            { name: 'tower3', base: 3 },
        ],
    },
    {
        name: 'The Elemental Planes', base: 6, entry: -2,
        levels: [
            { name: 'astral', base: 1 },
            { name: 'water', base: 2 },
            { name: 'fire', base: 3 },
            { name: 'air', base: 4 },
            { name: 'earth', base: 5 },
            { name: 'dummy', base: 6 },
        ],
    },
    { name: 'The Tutorial', base: 2, flags: ['unconnected'], levels: [{ name: 'tut-1', base: 1 }, { name: 'tut-2', base: 2 }] },
];

function levelRange(dungeons, finalLevels, dgn, base, rand, chain) {
    const lmax = dungeons[dgn].num_dunlevs;
    if (chain >= 0) base += finalLevels[chain].dlevel;
    else if (base < 0) base = lmax + base + 1;

    if (rand === -1) return { start: base, count: lmax - base + 1 };
    if (rand) return { start: base, count: Math.min(rand, lmax - base + 1) };
    return { start: base, count: 1 };
}

function findBranch(pd, name) {
    return pd.branches.findIndex(branch => branch.name === name);
}

function parentDnum(pd, name) {
    let branchIndex = findBranch(pd, name);
    for (let i = 0; pd.dungeons[i].name !== name; i++) {
        branchIndex -= pd.dungeons[i].branches.length;
        if (branchIndex < 0) return i;
    }
    return 0;
}

function parentDlevel(pd, dungeons, branches, name) {
    const dnum = parentDnum(pd, name);
    const branch = pd.branches[findBranch(pd, name)];
    const { start, count } = levelRange(dungeons, pd.finalLevels, dnum, branch.base, branch.range || 0, branch.chain);
    const first = rn2(count);
    let i = first;
    do {
        i++;
        if (i >= count) i = 0;
        const dlevel = start + i;
        if (!branches.some(br =>
            (br.end1.dnum === dnum && br.end1.dlevel === dlevel)
            || (br.end2.dnum === dnum && br.end2.dlevel === dlevel))) return dlevel;
    } while (i !== first);
    return start + i;
}

function depth(dungeons, level) {
    return dungeons[level.dnum].depth_start + level.dlevel - 1;
}

function addBranch(pd, dungeons, branches, dgn) {
    const proto = pd.branches[findBranch(pd, dungeons[dgn].name)];
    const branch = {
        type: proto.branchtype || 'stair',
        end1: { dnum: parentDnum(pd, dungeons[dgn].name), dlevel: parentDlevel(pd, dungeons, branches, dungeons[dgn].name) },
        end2: { dnum: dgn, dlevel: dungeons[dgn].entry_lev },
        end1_up: proto.direction === 'up',
    };
    branches.push(branch);
    return branch;
}

function setDungeonEntry(dungeon, entry) {
    if (entry < 0) dungeon.entry_lev = Math.max(1, dungeon.num_dunlevs + entry + 1);
    else dungeon.entry_lev = entry > 0 ? Math.min(entry, dungeon.num_dunlevs) : 1;
}

function setDungeonDepth(pd, dungeons, branches, dgn) {
    const branch = addBranch(pd, dungeons, branches, dgn);
    const fromDepth = branch.end1.dnum === dgn ? depth(dungeons, branch.end2) : depth(dungeons, branch.end1);
    const fromUp = branch.end1.dnum === dgn ? !branch.end1_up : branch.end1_up;
    dungeons[dgn].depth_start = fromDepth + (branch.type === 'portal' ? 0 : (fromUp ? -1 : 1)) - (dungeons[dgn].entry_lev - 1);
}

function possiblePlaces(pd, dungeons, idx) {
    const level = pd.finalLevels[idx];
    const { start, count } = levelRange(dungeons, pd.finalLevels, level.dnum, level.base, level.range || 0, level.chain);
    const places = [];
    for (let i = start; i < start + count; i++) places.push(i);
    for (let i = pd.start; i < idx; i++) {
        const prior = pd.finalLevels[i];
        const pos = prior ? places.indexOf(prior.dlevel) : -1;
        if (pos >= 0) places.splice(pos, 1);
    }
    return places;
}

function placeLevel(pd, dungeons, idx = pd.start) {
    if (idx === pd.levels.length) return true;
    const level = pd.finalLevels[idx];
    if (!level) return placeLevel(pd, dungeons, idx + 1);

    const places = possiblePlaces(pd, dungeons, idx);
    while (places.length) {
        const choice = rn2(places.length);
        level.dlevel = places[choice];
        if (placeLevel(pd, dungeons, idx + 1)) return true;
        places.splice(choice, 1);
    }
    return false;
}

export function init_dungeons_rng() {
    const wizard = !!game.flags?.debug;
    const pd = { dungeons: [], levels: [], branches: [], finalLevels: [], start: 0 };
    const dungeons = [];
    const branches = [];

    for (let dgn = 0; dgn < DUNGEON_DATA.length; dgn++) {
        const src = DUNGEON_DATA[dgn];
        const chance = src.chance ?? 100;
        if (!wizard && chance && chance <= rn2(100)) continue;

        const levelStart = pd.levels.length;
        const levels = [];
        for (const srcLevel of (src.levels || [])) {
            const level = { ...srcLevel, chain: -1 };
            if (level.chainlevel) {
                level.chain = [...pd.levels, ...levels].findIndex(prior => prior.name === level.chainlevel);
            }
            levels.push(level);
        }
        pd.levels.push(...levels);

        const branchesForDungeon = (src.branches || []).map(branch => ({ ...branch, chain: -1 }));
        for (const branch of branchesForDungeon) {
            if (branch.chainlevel) branch.chain = pd.levels.findIndex(level => level.name === branch.chainlevel);
        }
        pd.branches.push(...branchesForDungeon);
        pd.dungeons[dgn] = { name: src.name, branches: branchesForDungeon };

        const dungeon = { name: src.name };
        dungeon.num_dunlevs = src.range ? rn1(src.range, src.base) : src.base;
        dungeon.ledger_start = dgn ? dungeons[dgn - 1].ledger_start + dungeons[dgn - 1].num_dunlevs : 0;
        dungeon.depth_start = dgn ? 0 : 1;
        setDungeonEntry(dungeon, src.entry || 0);
        dungeon.unconnected = (src.flags || []).includes('unconnected');
        dungeons[dgn] = dungeon;

        if (dgn && !dungeon.unconnected) setDungeonDepth(pd, dungeons, branches, dgn);
        for (let i = levelStart; i < pd.levels.length; i++) {
            const level = pd.levels[i];
            const lvlChance = level.chance ?? 100;
            pd.finalLevels[i] = null;
            if (!wizard && lvlChance <= rn2(100)) continue;
            pd.finalLevels[i] = { ...level, dnum: dgn, dlevel: 0 };
        }
        placeLevel(pd, dungeons);
        pd.start = pd.levels.length;
    }

    for (let i = 0; i < 5; i++) rn2(7);
    game.dungeons = dungeons;
    game.branches = branches;
}
