// dungeon_init.js — Dungeon structure initialization.
// C ref: dungeon.c init_dungeons(), place_level(), parent_dlevel(), etc.
//
// Also includes init_castle_tune() and u_init_misc().

import { rn2, rn1 } from './rng.js';

const MAXLEVEL = 32;

// All level prototypes in global order (cumulative across dungeons).
// chain: global proto_index of the chainlevel, or -1 if none.
// dnum: which dungeon this level belongs to.
const TMPLEVEL = [
    // Doom (dnum=0), indices 0-4
    { dnum:0, name:"rogue",    base:15, range:4, chance:100, chain:-1 },
    { dnum:0, name:"oracle",   base: 5, range:5, chance:100, chain:-1 },
    { dnum:0, name:"bigrm",    base:10, range:3, chance: 40, chain:-1 },
    { dnum:0, name:"medusa",   base:-5, range:4, chance:100, chain:-1 },
    { dnum:0, name:"castle",   base:-1, range:0, chance:100, chain:-1 },
    // Gehennom (dnum=1), indices 5-15
    { dnum:1, name:"valley",   base: 1, range:0, chance:100, chain:-1 },
    { dnum:1, name:"sanctum",  base:-1, range:0, chance:100, chain:-1 },
    { dnum:1, name:"juiblex",  base: 4, range:4, chance:100, chain:-1 },
    { dnum:1, name:"baalz",    base: 6, range:4, chance:100, chain:-1 },
    { dnum:1, name:"asmodeus", base: 2, range:6, chance:100, chain:-1 },
    { dnum:1, name:"wizard1",  base:11, range:6, chance:100, chain:-1 },
    { dnum:1, name:"wizard2",  base: 1, range:0, chance:100, chain:10 }, // chainlevel=wizard1
    { dnum:1, name:"wizard3",  base: 2, range:0, chance:100, chain:10 }, // chainlevel=wizard1
    { dnum:1, name:"orcus",    base:10, range:6, chance:100, chain:-1 },
    { dnum:1, name:"fakewiz1", base:-6, range:4, chance:100, chain:-1 },
    { dnum:1, name:"fakewiz2", base:-6, range:4, chance:100, chain:-1 },
    // Mines (dnum=2), indices 16-17
    { dnum:2, name:"minetn",   base: 3, range:2, chance:100, chain:-1 },
    { dnum:2, name:"minend",   base:-1, range:0, chance:100, chain:-1 },
    // Quest (dnum=3), indices 18-20
    { dnum:3, name:"x-strt",   base: 1, range:1, chance:100, chain:-1 },
    { dnum:3, name:"x-loca",   base: 3, range:1, chance:100, chain:-1 },
    { dnum:3, name:"x-goal",   base:-1, range:0, chance:100, chain:-1 },
    // Sokoban (dnum=4), indices 21-24
    { dnum:4, name:"soko1",    base: 1, range:0, chance:100, chain:-1 },
    { dnum:4, name:"soko2",    base: 2, range:0, chance:100, chain:-1 },
    { dnum:4, name:"soko3",    base: 3, range:0, chance:100, chain:-1 },
    { dnum:4, name:"soko4",    base: 4, range:0, chance:100, chain:-1 },
    // Fort Ludios (dnum=5), index 25
    { dnum:5, name:"knox",     base:-1, range:0, chance:100, chain:-1 },
    // Vlad's Tower (dnum=6), indices 26-28
    { dnum:6, name:"tower1",   base: 1, range:0, chance:100, chain:-1 },
    { dnum:6, name:"tower2",   base: 2, range:0, chance:100, chain:-1 },
    { dnum:6, name:"tower3",   base: 3, range:0, chance:100, chain:-1 },
    // Elemental Planes (dnum=7), indices 29-34
    { dnum:7, name:"astral",   base: 1, range:0, chance:100, chain:-1 },
    { dnum:7, name:"water",    base: 2, range:0, chance:100, chain:-1 },
    { dnum:7, name:"fire",     base: 3, range:0, chance:100, chain:-1 },
    { dnum:7, name:"air",      base: 4, range:0, chance:100, chain:-1 },
    { dnum:7, name:"earth",    base: 5, range:0, chance:100, chain:-1 },
    { dnum:7, name:"dummy",    base: 6, range:0, chance:100, chain:-1 },
    // Tutorial (dnum=8), indices 35-36
    { dnum:8, name:"tut-1",    base: 1, range:0, chance:100, chain:-1 },
    { dnum:8, name:"tut-2",    base: 2, range:0, chance:100, chain:-1 },
];

// Per-dungeon descriptor: [base, range, chance, unconnected, levelStart, levelCount, parentBranch]
// parentBranch: { parentDnum, base, range, chain } or null for root/unconnected.
// chain is a global TMPLEVEL index (-1 if none).
const DUNGEONS = [
    // 0: The Dungeons of Doom
    { base:25, range:5, chance:100, unconnected:false, levStart:0,  levCount:5,
      parentBranch: null },
    // 1: Gehennom — branch from Doom via castle
    { base:20, range:5, chance:100, unconnected:false, levStart:5,  levCount:11,
      parentBranch: { parentDnum:0, base:0, range:0, chain:4 } },
    // 2: The Gnomish Mines — branch from Doom
    { base:8,  range:2, chance:100, unconnected:false, levStart:16, levCount:2,
      parentBranch: { parentDnum:0, base:2, range:3, chain:-1 } },
    // 3: The Quest — branch from Doom via oracle portal
    { base:5,  range:2, chance:100, unconnected:false, levStart:18, levCount:3,
      parentBranch: { parentDnum:0, base:6, range:2, chain:1 } },
    // 4: Sokoban — branch from Doom via oracle stair
    { base:4,  range:0, chance:100, unconnected:false, levStart:21, levCount:4,
      parentBranch: { parentDnum:0, base:1, range:0, chain:1 } },
    // 5: Fort Ludios — branch from Doom portal
    { base:1,  range:0, chance:100, unconnected:false, levStart:25, levCount:1,
      parentBranch: { parentDnum:0, base:18, range:4, chain:-1 } },
    // 6: Vlad's Tower — branch from Gehennom
    { base:3,  range:0, chance:100, unconnected:false, levStart:26, levCount:3,
      parentBranch: { parentDnum:1, base:9, range:5, chain:-1 } },
    // 7: The Elemental Planes — branch from Doom
    { base:6,  range:0, chance:100, unconnected:false, levStart:29, levCount:6,
      parentBranch: { parentDnum:0, base:1, range:0, chain:-1 } },
    // 8: The Tutorial — unconnected
    { base:2,  range:0, chance:100, unconnected:true,  levStart:35, levCount:2,
      parentBranch: null },
];

// C ref: dungeon.c level_range()
// Returns { count, adjBase } — number of valid positions and the adjusted base.
function levelRange(dnum, base, randc, chain, finalLev, numDunlevs) {
    const lmax = numDunlevs[dnum];
    if (chain >= 0) {
        base = base + finalLev[chain]; // relative to chained level's placed position
    } else if (base < 0) {
        base = lmax + base + 1; // from bottom of dungeon
    }
    const adjBase = base;
    let count;
    if (randc === -1) {
        count = lmax - base + 1;
    } else if (randc > 0) {
        count = ((base + randc - 1) > lmax) ? lmax - base + 1 : randc;
    } else {
        count = 1;
    }
    return { count, adjBase };
}

// C ref: dungeon.c pick_level()
// Returns the nth TRUE index in map (1-based).
function pickLevel(map, nth) {
    for (let i = 1; i <= MAXLEVEL; i++) {
        if (map[i] && !nth--) return i;
    }
    throw new Error('pick_level: ran out of valid levels');
}

// C ref: dungeon.c possible_places()
// Returns { count, map } where map[i] is true if level i is a valid placement.
function possiblePlaces(protoIdx, finalLev, numDunlevs, start) {
    const lev = TMPLEVEL[protoIdx];
    const { count: rangeCount, adjBase: base } = levelRange(
        lev.dnum, lev.base, lev.range, lev.chain, finalLev, numDunlevs);

    const map = new Array(MAXLEVEL + 1).fill(false);
    for (let i = base; i < base + rangeCount; i++) {
        if (i >= 1 && i <= MAXLEVEL) map[i] = true;
    }

    // Remove already-placed levels (earlier prototypes in same dungeon)
    let count = 0;
    for (let i = 1; i <= MAXLEVEL; i++) { if (map[i]) count++; }
    for (let i = start; i < protoIdx; i++) {
        if (finalLev[i] !== null && finalLev[i] >= 1 && map[finalLev[i]]) {
            map[finalLev[i]] = false;
            count--;
        }
    }

    return { count, map };
}

// C ref: dungeon.c place_level() — recursive backtracking placement.
// Modifies finalLev in place. Returns true on success.
function placeLevelRec(protoIdx, finalLev, numDunlevs, n_levs, start) {
    if (protoIdx === n_levs) return true;

    if (finalLev[protoIdx] === null) {
        // Level was not included (failed chance check), skip it
        return placeLevelRec(protoIdx + 1, finalLev, numDunlevs, n_levs, start);
    }

    let { count: npossible, map } = possiblePlaces(protoIdx, finalLev, numDunlevs, start);

    for (; npossible > 0; npossible--) {
        const dlevel = pickLevel(map, rn2(npossible));
        finalLev[protoIdx] = dlevel;
        if (placeLevelRec(protoIdx + 1, finalLev, numDunlevs, n_levs, start)) {
            return true;
        }
        map[dlevel] = false;
    }

    return false;
}

// C ref: dungeon.c parent_dlevel() — pick a level in the parent dungeon for a branch.
// Consumes one rn2(count) call. Modifies branches list in place.
function parentDlevel(pb, finalLev, numDunlevs, branches) {
    const { count, adjBase: base } = levelRange(
        pb.parentDnum, pb.base, pb.range, pb.chain, finalLev, numDunlevs);

    // Consume rn2(count) — pick starting index
    let j = rn2(count);
    let i = j;
    // Advance i by 1 (mod count) looking for a collision-free level
    do {
        i = (i + 1) % count;
        const dlevel = base + i;
        const collision = branches.some(b => b.dnum === pb.parentDnum && b.dlevel === dlevel);
        if (!collision) break;
    } while (i !== j);

    const dlevel = base + i;
    branches.push({ dnum: pb.parentDnum, dlevel });
    return dlevel;
}

// C ref: dungeon.c init_castle_tune() — 5 random notes for the castle drawbridge.
export function init_castle_tune() {
    rn2(7); rn2(7); rn2(7); rn2(7); rn2(7);
}

// C ref: u_init.c u_init_misc() — misc hero init (starting alignment of artifacts etc.)
export function u_init_misc() {
    rn2(10);
}

// C ref: dungeon.c init_dungeons()
// wizard: true if playmode:debug (skips chance checks for dungeons and levels)
//
// Also reproduces the first Lua shuffle (nhlib.lua module-level code):
//   align = { "law", "neutral", "chaos" }; shuffle(align)
// which happens when nhl_init() loads nhlib.lua at the start of this function.
export function init_dungeons(wizard) {
    // First Lua shuffle: nhlib.lua module-level shuffle(align) via nhl_init()
    rn2(3); rn2(2);

    // finalLev[i] = placed dlevel for TMPLEVEL[i], or null if not included
    const finalLev = new Array(TMPLEVEL.length).fill(null);
    // num_dunlevs[dnum] = number of levels in dungeon dnum
    const numDunlevs = new Array(DUNGEONS.length).fill(0);
    // placed branches for collision avoidance in parent_dlevel
    const branches = [];

    let protoStart = 0; // pd.start in C — first proto_index for current dungeon

    for (let dngidx = 0; dngidx < DUNGEONS.length; dngidx++) {
        const dng = DUNGEONS[dngidx];

        // Dungeon chance check: if (!wizard && dgn_chance && dgn_chance <= rn2(100))
        // dgn_chance always defaults to 100 here; condition is always false (skip never happens)
        // but rn2(100) is still consumed when !wizard
        if (!wizard && dng.chance) {
            const roll = rn2(100);
            if (dng.chance <= roll) {
                // Dungeon skipped (in practice never for chance=100)
                protoStart += dng.levCount;
                continue;
            }
        }

        // Set number of dungeon levels
        if (dng.range > 0) {
            numDunlevs[dngidx] = rn1(dng.range, dng.base); // base + rn2(range)
        } else {
            numDunlevs[dngidx] = dng.base;
        }

        // Determine parent connection (for dngidx > 0 and !unconnected)
        if (dngidx > 0 && !dng.unconnected && dng.parentBranch) {
            parentDlevel(dng.parentBranch, finalLev, numDunlevs, branches);
        }

        // init_level for each level prototype in this dungeon
        const levEnd = protoStart + dng.levCount;
        for (let cl = protoStart; cl < levEnd; cl++) {
            const lev = TMPLEVEL[cl];
            if (!wizard && lev.chance <= rn2(100)) {
                finalLev[cl] = null; // level not included
            } else {
                finalLev[cl] = 0; // included, placed later
            }
        }

        // place_level recursively assigns dlevel values
        placeLevelRec(protoStart, finalLev, numDunlevs, levEnd, protoStart);

        protoStart = levEnd;
    }
}
