// @ts-nocheck
// dungeon_rng.js — RNG parity for dungeon.c prototype init (excluding init_castle_tune).
// init_dungeon_dungeons / init_level / place_level / parent_dlevel / add_branch
import { game } from './gstate.js';
import { rn2, rn1 } from './rng.js';
import { MAXLEVEL, MAXDUNGEON } from './const.js';
import { DUNGEON_LUA_TABLE } from './dungeon_data.js';
export function dungeonWizardLike() {
    return !!(game.flags && game.flags.debug);
}
const BR_STAIR = 0;
const BR_NO_END1 = 1;
const BR_NO_END2 = 2;
const BR_PORTAL = 3;
function branchRuntimeType(tb) {
    const TBR_STAIR = 0;
    const TBR_NO_UP = 1;
    const TBR_NO_DOWN = 2;
    const TBR_PORTAL = 3;
    switch (tb.tbr) {
        case TBR_STAIR:
            return BR_STAIR;
        case TBR_NO_UP:
            return tb.up ? BR_NO_END1 : BR_NO_END2;
        case TBR_NO_DOWN:
            return tb.up ? BR_NO_END2 : BR_NO_END1;
        case TBR_PORTAL:
            return BR_PORTAL;
        default:
            return BR_STAIR;
    }
}
function branchVal(bp) {
    return ((BigInt(bp.end1.dnum) * BigInt(MAXLEVEL + 1) + BigInt(bp.end1.dlevel))
        * BigInt(MAXDUNGEON + 1) * BigInt(MAXLEVEL + 1)
        + (BigInt(bp.end2.dnum) * BigInt(MAXLEVEL + 1) + BigInt(bp.end2.dlevel)));
}
function insertBranch(ar, bp) {
    const nv = branchVal(bp);
    let pv = BigInt(-1);
    for (let i = 0; i <= ar.length; i++) {
        const cur = i < ar.length ? ar[i] : null;
        const cv = cur ? branchVal(cur) : nv + 1n;
        if (pv < nv && nv <= cv) {
            ar.splice(i, 0, bp);
            return;
        }
        pv = cv;
    }
    ar.push(bp);
}
/* C ref: dungeon.c:463-508 insert_branch(new_branch, extract_first) — keep
 * svb.branches sorted by branch_val after one branch's ends change.  Its only
 * caller outside init is mk_knox_portal() (mklev.c:2653), which rebinds the
 * floating Fort Ludios entrance to the current level and re-sorts. */
export function insert_branch(bp, extractFirst) {
    const ar = game._dungeon_branches || (game._dungeon_branches = []);
    if (extractFirst) {
        const ix = ar.indexOf(bp);
        if (ix >= 0)
            ar.splice(ix, 1);
    }
    insertBranch(ar, bp);
}
function findBranch(pd, name) {
    for (let b = 0; b < pd.n_brs; b++)
        if (pd.tmpbranch[b].name === name)
            return b;
    throw new Error(`find_branch: ${name}`);
}
function parentDnum(child, pd) {
    let ix = findBranch(pd, child);
    let dn;
    for (dn = 0; pd.tmpdungeon[dn].name !== child; dn++) {
        ix -= pd.tmpdungeon[dn].branches;
        if (ix < 0)
            return dn;
    }
    throw new Error(`parent_dnum ${child}`);
}
function levelRange(dgn, base0, rnd, chainix, pd, numLevs) {
    const lmax = numLevs[dgn];
    let base = base0;
    if (chainix >= 0) {
        const ch = pd.final_lev[chainix];
        if (!ch)
            throw new Error('level_range chain missing');
        base += ch.dlevel;
    }
    else if (base < 0)
        base = lmax + base + 1;
    if (base < 1 || base > lmax)
        throw new Error('level_range base');
    if (rnd === -1)
        return { n: lmax - base + 1, b: base };
    if (rnd) {
        const c = base + rnd - 1 > lmax ? lmax - base + 1 : rnd;
        return { n: c, b: base };
    }
    return { n: 1, b: base };
}
function pickLevel(map, nth) {
    for (let i = 1; i <= MAXLEVEL; i++)
        if (map[i] && !nth--)
            return i;
    throw new Error('pick_level');
}
function possiblePlaces(ix, pd, numLevs) {
    const map = new Array(MAXLEVEL + 2).fill(false);
    const fl = pd.final_lev[ix];
    if (!fl)
        throw new Error('possible_places ix');
    const lr = levelRange(fl.dnum, pd.tmplevel[ix].lev.base, pd.tmplevel[ix].lev.rand, pd.tmplevel[ix].chain, pd, numLevs);
    let count = lr.n;
    const st = lr.b;
    let i;
    for (i = st; i < st + count; i++)
        map[i] = true;
    for (i = pd.start; i < ix; i++) {
        const o = pd.final_lev[i];
        if (o && map[o.dlevel]) {
            map[o.dlevel] = false;
            --count;
        }
    }
    return { map, count };
}
function placeLevel(ix, pd, numLevs) {
    if (ix === pd.n_levs)
        return true;
    const lev = pd.final_lev[ix];
    if (!lev)
        return placeLevel(ix + 1, pd, numLevs);
    let { map, count: np } = possiblePlaces(ix, pd, numLevs);
    for (; np; --np) {
        const pick = pickLevel(map, rn2(np));
        lev.dlevel = pick;
        if (placeLevel(ix + 1, pd, numLevs))
            return true;
        map[pick] = false;
    }
    return false;
}
function parentDlevel(nm, branches, pd, numLevs) {
    const tbIx = findBranch(pd, nm);
    const tb = pd.tmpbranch[tbIx];
    const pn = parentDnum(nm, pd);
    const lr = levelRange(pn, tb.lev.base, tb.lev.rand, tb.chain, pd, numLevs);
    const num = lr.n;
    const baseLv = lr.b;
    /** @type {number} */
    let i = rn2(num);
    const j = i;
    /** @type {unknown} */
    let curr;
    do {
        if (++i >= num)
            i = 0;
        curr = null;
        for (const bp of branches) {
            if ((bp.end1.dnum === pn && bp.end1.dlevel === baseLv + i)
                || (bp.end2.dnum === pn && bp.end2.dlevel === baseLv + i)) {
                curr = bp;
                break;
            }
        }
    } while (curr && i !== j);
    return baseLv + i;
}
function setEntry(dix, raw, nums, ents) {
    const num = nums[dix];
    let entry = raw ?? 0;
    let el;
    if (entry < 0) {
        el = num + entry + 1;
        ents[dix] = el <= 0 ? 1 : el;
    }
    else if (entry > 0) {
        el = entry > num ? num : entry;
        ents[dix] = el;
    }
    else {
        ents[dix] = 1;
    }
}
function luaToTmpBranch(b) {
    const up = (b.direction || 'down') === 'up';
    let tbr = 0;
    if (b.branchtype === 'portal')
        tbr = 3;
    else if (b.branchtype === 'no_down')
        tbr = 2;
    else if (b.branchtype === 'no_up')
        tbr = 1;
    return {
        name: b.name,
        lev: { base: b.base, rand: b.range ?? 0 },
        up,
        tbr,
        chain: -1,
    };
}
function dungeonFlags(list) {
    if (list == null)
        return [];
    if (Array.isArray(list))
        return list;
    if (typeof list === 'string')
        return [list];
    return [];
}
/* C ref: dungeon.c init_level() flags.  AM_* values from align.h. */
const AM_CHAOTIC = 0x01;
const AM_NEUTRAL = 0x02;
const AM_LAWFUL = 0x04;
function parseDgnAlign(a) {
    switch (a) {
        case 'chaotic': return AM_CHAOTIC;
        case 'neutral': return AM_NEUTRAL;
        case 'lawful': return AM_LAWFUL;
        default: return 0;
    }
}
/* C ref: nethack-c/include/dgn_file.h:56-67. */
const _TOWN = 0x01, _HELLISH = 0x02, _MAZELIKE = 0x04, _ROGUELIKE = 0x08, _UNCONNECTED = 0x10;
const _D_ALIGN_MASK = 0x70;
function _rawFlagsBitmask(lf) {
    let f = 0;
    if (lf.includes('town')) f |= _TOWN;
    if (lf.includes('hellish')) f |= _HELLISH;
    if (lf.includes('mazelike')) f |= _MAZELIKE;
    if (lf.includes('roguelike')) f |= _ROGUELIKE;
    if (lf.includes('unconnected')) f |= _UNCONNECTED;
    return f;
}
/* C ref: dgn_file.h:62-67 — the `alignment` field of a dungeon.lua level or
 * dungeon entry is folded INTO the same bitmask as town/hellish/mazelike/...,
 * as D_ALIGN_<x> == (AM_<x> << 4):
 *      D_ALIGN_CHAOTIC 0x10   D_ALIGN_NEUTRAL 0x20   D_ALIGN_LAWFUL 0x40
 * NOTE the genuine C collision, ported as-is (Cardinal Rule 1): UNCONNECTED is
 * also 0x10, so an "unconnected" level reads back as chaotic-aligned. */
const _D_ALIGN_BY_NAME = {
    unaligned: 0x00, noalign: 0x00,
    chaotic: 0x10, neutral: 0x20, lawful: 0x40,
};
function _dgnAlignBits(alignment) {
    /* C ref: dungeon.c:780-794 get_dgn_align — get_table_option(L, "alignment",
     * "unaligned", dgnaligns), i.e. anything absent/unrecognised is D_ALIGN_NONE. */
    return _D_ALIGN_BY_NAME[String(alignment ?? 'unaligned').toLowerCase()] ?? 0x00;
}

function computeSLevelFlags(levelEntry, dungeonAlign) {
    const lf = dungeonFlags(levelEntry.flags);
    const rawLevelFlags = _rawFlagsBitmask(lf) | _dgnAlignBits(levelEntry.alignment);
    let align = (rawLevelFlags & _D_ALIGN_MASK) >> 4;
    if (!align)
        align = dungeonAlign;
    return {
        town: lf.includes('town') ? 1 : 0,
        hellish: lf.includes('hellish') ? 1 : 0,
        maze_like: lf.includes('mazelike') ? 1 : 0,
        rogue_like: lf.includes('roguelike') ? 1 : 0,
        align,
    };
}
/**
 * Push one dungeon from dungeon.lua metadata; returns FALSE if RNG-discarded.
 *
 * @param {import('./dungeon_data.js').DungeonLuaEntry} du
 */
function ingestDungeonLua(du, dix, pd, wizardLike, svn, unconn, nums, ents, depthStarts, branches, dgnflags) {
    const ch = du.chance ?? 100;
    if (!wizardLike && ch && ch <= rn2(100)) {
        svn.val--;
        return false;
    }
    const brCt = du.branches && du.branches.length ? du.branches.length : 0;
    pd.tmpdungeon[dix] = { name: du.name, branches: brCt };
    const nLv = du.levels.length;
    const dgnAlign = (_rawFlagsBitmask(dungeonFlags(du.flags)) & _D_ALIGN_MASK) >> 4;
    /** @type {number} */
    let f;
    /* levels → tmplevel */
    for (f = 0; f < nLv; f++) {
        const L = du.levels[f];
        const tix = pd.n_levs + f;
        const tmpl = {
            lev: { base: L.base, rand: L.range ?? 0 },
            chain: -1,
            chance: L.chance ?? 100,
            name: L.name,
            rndlevs: L.nlevels ?? 0,
            /* C ref: dungeon.c init_level flags — stored so initLevel can build s_level */
            slev_flags: computeSLevelFlags(L, dgnAlign),
            bonetag: (L.bonetag && L.bonetag.length) ? L.bonetag.charCodeAt(0) : 0,
        };
        if (L.chainlevel) {
            let hit = false;
            for (let bi = 0; bi < pd.n_levs + f; bi++) {
                if (pd.tmplevel[bi].name === L.chainlevel) {
                    tmpl.chain = bi;
                    hit = true;
                    break;
                }
            }
            if (!hit)
                throw new Error(`LEVEL chain ${L.chainlevel}`);
        }
        pd.tmplevel[tix] = tmpl;
    }
    pd.n_levs += nLv;
    /* branches → tmpbranch */
    const brLua = du.branches || [];
    for (f = 0; f < brLua.length; f++) {
        const tmpb = luaToTmpBranch(brLua[f]);
        if (brLua[f].chainlevel) {
            const want = /** @type {string} */ (brLua[f].chainlevel);
            /** C: bi < pd->n_levs + f - 1 */
            let hit = false;
            for (let bi = 0; bi < pd.n_levs + f - 1; bi++) {
                if (pd.tmplevel[bi].name === want) {
                    tmpb.chain = bi;
                    hit = true;
                    break;
                }
            }
            if (!hit)
                throw new Error(`BRANCH chain ${want}`);
        }
        pd.tmpbranch[pd.n_brs + f] = tmpb;
    }
    pd.n_brs += brLua.length;
    /* C ref: dungeon.c:1088-1093 — the dungeon-wide flag word, of which only
     * `unconnected` was carried.  `hellish` is what In_hell() (dungeon.c:1942,
     * js/mklev.js:320) reads, and it had NO writer at all, so In_hell() and
     * makemon.js's Inhell() were unconditionally false — in Gehennom that gave
     * rndmonst_adj the WRONG eligibility rule (uncommon() uses `maligntyp >
     * A_NEUTRAL` in hell, `geno & G_HELL` outside) and mkobj() the wrong
     * class-probability table.  town/maze_like/rogue_like are carried for the
     * same reason: they are C's dungeon flag word, not a subset. */
    const _dgnFlagList = dungeonFlags(/** @type {*} */ (du.flags));
    unconn[dix] = _dgnFlagList.includes('unconnected');
    dgnflags[dix] = {
        town: _dgnFlagList.includes('town'),
        hellish: _dgnFlagList.includes('hellish'),
        maze_like: _dgnFlagList.includes('mazelike'),
        rogue_like: _dgnFlagList.includes('roguelike'),
        unconnected: unconn[dix],
    };
    pd._names[dix] = du.name;
    /* C ref: dungeon.c:1009/1016 — get_table_str_opt(L, "protofile"/"lvlfill",
     * emptystr), stashed here on the same index as the name so the
     * svd.dungeons[] assembly below can copy both out (dungeon.c:1062-1064). */
    pd._protofile[dix] = du.protofile ?? '';
    pd._lvlfill[dix] = du.lvlfill ?? '';
    let numLv = du.range ? rn1(du.range, du.base) : du.base;
    if (numLv > MAXLEVEL)
        numLv = MAXLEVEL;
    nums[dix] = numLv;
    setEntry(dix, du.entry ?? 0, nums, ents);
    /* init_dungeon_set_depth — still inside init_dungeon_dungeons before any init_level */
    if (unconn[dix]) {
        depthStarts[dix] = 1;
    }
    else if (dix === 0) {
        depthStarts[0] = 1;
    }
    else {
        addBranchConsume(dix, branches, pd, nums, ents, depthStarts);
    }
    return true;
}
function initLevel(dslot, ix, pd, wizardLike) {
    const tmpl = pd.tmplevel[ix];
    pd.final_lev[ix] = null;
    if (!wizardLike && tmpl.chance <= rn2(100))
        return;
    pd.final_lev[ix] = {
        rndlevs: tmpl.rndlevs,
        dlevel: 0,
        dnum: dslot,
        proto: tmpl.name,
        /* C ref: dungeon.c init_level() — s_level flags + boneid */
        flags: tmpl.slev_flags ?? { town: 0, hellish: 0, maze_like: 0, rogue_like: 0, align: 0 },
        boneid: tmpl.bonetag ?? 0,
    };
}
function depthOf(dnum, lvl, ds) {
    return ds[dnum] + lvl - 1;
}
function addBranchConsume(dgn, branches, pd, nums, ents, depthStarts) {
    const nm = pd._names[dgn];
    const bi = findBranch(pd, nm);
    const tb = pd.tmpbranch[bi];
    const bp = {
        type: branchRuntimeType(tb),
        end1_up: !!tb.up,
        end1: { dnum: 0, dlevel: 0 },
        end2: { dnum: 0, dlevel: 0 },
    };
    bp.end1.dnum = parentDnum(nm, pd);
    bp.end1.dlevel = parentDlevel(nm, branches, pd, nums);
    bp.end2.dnum = dgn;
    bp.end2.dlevel = ents[dgn];
    insertBranch(branches, bp);
    /** init_dungeon_set_depth */
    let from_depth;
    let /** @type {boolean} */ from_up;
    if (bp.end1.dnum === dgn) {
        from_depth = depthOf(bp.end2.dnum, bp.end2.dlevel, depthStarts);
        from_up = !bp.end1_up;
    }
    else {
        from_depth = depthOf(bp.end1.dnum, bp.end1.dlevel, depthStarts);
        from_up = bp.end1_up;
    }
    depthStarts[dgn] =
        from_depth + (bp.type === BR_PORTAL ? 0 : (from_up ? -1 : 1))
            - (ents[dgn] - 1);
    depthStarts[dgn] |= 0;
}
export function consumeDungeonInitRng() {
    /** @type {object[]} */
    const branches = [];
    const pd = {
        tmpdungeon: [],
        tmpbranch: [],
        tmplevel: [],
        final_lev: [],
        n_levs: 0,
        n_brs: 0,
        start: 0,
        /** @type {string[]} */
        _names: [],
        /** @type {string[]} C: svd.dungeons[i].proto (dungeon.lua `protofile`) */
        _protofile: [],
        /** @type {string[]} C: svd.dungeons[i].fill_lvl (dungeon.lua `lvlfill`) */
        _lvlfill: [],
    };
    const wizardLike = dungeonWizardLike();
    const svn = { val: DUNGEON_LUA_TABLE.length };
    const unconnected = [];
    /* C dungeon.c:1088-1093 — the per-dungeon flag word (see ingestDungeonLua). */
    const dgnFlagWords = [];
    const nums = [];
    const ents = [];
    /** @type {number[]} depth_start bookkeeping */ const depthStarts = [];
    /** @type {number} cumulative proto indices */
    let cl = 0;
    /** @type {number} C dungeon assignment index */
    let dIx = 0;
    /** @type {number} luaIdx unused after loop iteration */
    for (let ix = 0; ix < DUNGEON_LUA_TABLE.length; ix++) {
        const du = DUNGEON_LUA_TABLE[ix];
        const ok = ingestDungeonLua(du, dIx, pd, wizardLike, svn, unconnected, nums, ents, depthStarts, branches, dgnFlagWords);
        if (ok) {
            for (; cl < pd.n_levs; cl++)
                initLevel(dIx, cl, pd, wizardLike);
            const okPl = placeLevel(pd.start, pd, nums);
            if (!okPl)
                throw new Error('place_level failed');
            /** add_level RNG-free */
            for (; pd.start < pd.n_levs; pd.start++)
                ;
            dIx++;
        }
    }
    /* C ref: dungeon.c init_dungeons() — svb.branches is the sorted branch table
     * used by Is_branchlev() / place_branch() for every mklev() call in the game.
     * Store on game._dungeon_branches so mklev.js is_branchlev() uses the
     * RNG-correct dnum values from the real dungeon init, not a hardcoded
     * approximation.  Named _dungeon_branches (not branches) to avoid being
     * overwritten by the legacy g.branches = [...] assignment in allmain.js.
     * Mirror: nethack-c/src/dungeon.c:1205-1319 init_dungeons fills svb.branches. */
    game._dungeon_branches = branches;
    /* C ref: dungeon.c init_dungeons() — after place_level, calls add_level() for every
     * non-null pd.final_lev[]; those accumulate into svs.sp_levchn (linked list, ordered
     * by dnum then ascending dlevel).  Is_special() walks this list to classify levels.
     * Mirror: dungeon.c:1299-1301 + add_level() (dungeon.c:544-563).
     * We store it as a flat array — ordering doesn't affect correctness of Is_special()
     * since it just finds the first dnum+dlevel match. */
    const spLevchn = [];
    for (let i = 0; i < pd.final_lev.length; i++) {
        const fl = pd.final_lev[i];
        if (!fl)
            continue;
        spLevchn.push({
            dlevel: { dnum: fl.dnum, dlevel: fl.dlevel },
            proto: fl.proto,
            rndlevs: fl.rndlevs,
            flags: fl.flags,
            boneid: fl.boneid,
        });
    }
    /* C ref: dungeon.c fixup_level_locations() — renames quest level protos from
     * "x-strt"/"x-loca"/"x-goal" to "<filecode>-strt"/"-loca"/"-goal".
     * Mirror: dungeon.c:1136-1144 (strncmp "x-" check + Sprintf).
     * Role filecodes (C: roles[].filecode in role.c order):
     *   0=Arc 1=Bar 2=Cav 3=Hea 4=Kni 5=Mon 6=Pri 7=Rog 8=Ran 9=Sam 10=Tou 11=Val 12=Wiz */
    const ROLE_FILECODES = ['Arc', 'Bar', 'Cav', 'Hea', 'Kni', 'Mon', 'Pri', 'Rog', 'Ran', 'Sam', 'Tou', 'Val', 'Wiz'];
    const initrole = (game.flags?.initrole ?? -1) | 0;
    const roleCode = (initrole >= 0 && initrole < ROLE_FILECODES.length)
        ? ROLE_FILECODES[initrole] : 'Arc';
    for (const sl of spLevchn) {
        if (sl.proto === 'x-strt')
            sl.proto = roleCode + '-strt';
        else if (sl.proto === 'x-loca')
            sl.proto = roleCode + '-loca';
        else if (sl.proto === 'x-goal')
            sl.proto = roleCode + '-goal';
    }
    game._sp_levchn = spLevchn;
    {
        const dummy = spLevchn.find(sl => sl.proto === 'dummy');
        if (dummy) {
            const di = dummy.dlevel.dnum;
            const dunlevs = nums[di] | 0;
            if (dunlevs > 1 - (depthStarts[di] | 0))
                depthStarts[di] = (depthStarts[di] | 0) - 1;
        }
    }
    // C init_dungeon/init_dungeons: one svd.dungeons table. The old name stays
    // an alias for existing topology readers, never a second mutable copy.
    const dungeonsFull = [];
    let ledgerStart = 0;
    for (let i = 0; i < pd._names.length; i++) {
        dungeonsFull.push({
            dname: pd._names[i],
            depth_start: depthStarts[i] | 0,
            num_dunlevs: nums[i] | 0,
            entry_lev: ents[i] | 0,
            dunlev_ureached: i === 0 ? 1 : 0,
            ledger_start: ledgerStart,
            flags: dgnFlagWords[i] || { town: false, hellish: false,
                                    maze_like: false, rogue_like: false,
                                    unconnected: !!unconnected[i] },
            /* C ref: dungeon.c:1062-1064 — Strcpy(svd.dungeons[i].fill_lvl,
             * dgn_fill) / .proto, dgn_fill = get_table_str_opt(L, "lvlfill",
             * emptystr) and dgn_protoname = get_table_str_opt(L, "protofile",
             * emptystr).  These are the two fields makelevel() (mklev.c:
             * 1270-1273) branches on BEFORE its In_hell/Medusa arm, and
             * makemaz() (mkmaze.c) reads to build the protofile name.  C
             * stores "" when the key is absent; we store '' likewise so the
             * `[0]` truthiness test ports as a plain JS truthiness test. */
            proto: pd._protofile[i] || '',
            fill_lvl: pd._lvlfill[i] || '',
        });
        ledgerStart += nums[i] | 0;
    }
    game.dungeons = dungeonsFull;
    game._dungeons_full = dungeonsFull;
    game._n_dgns = pd._names.length;
    /* C ref: dungeon.c fixup_level_locations() — maps proto names to well-known d_level
     * globals.  Populate the subset used by mklev.ts / const.js level predicates. */
    for (let i = 0; i < pd.final_lev.length; i++) {
        const fl = pd.final_lev[i];
        if (!fl)
            continue;
        const lv = { dnum: fl.dnum, dlevel: fl.dlevel };
        switch (fl.proto) {
            case 'medusa':
                game.medusa_level = lv;
                break;
            case 'oracle':
                game.oracle_level = lv;
                break;
            case 'rogue':
                game.rogue_level = lv;
                break;
            case 'castle':
                game.stronghold_level = lv;
                break;
            case 'valley':
                game.valley_level = lv;
                break;
            case 'sanctum':
                game.sanctum_level = lv;
                break;
            case 'juiblex':
                game.juiblex_level = lv;
                break;
            case 'baalz':
                game.baalzebub_level = lv;
                break;
            case 'asmodeus':
                game.asmodeus_level = lv;
                break;
            /* C dungeon.c:723 `{ "orcus", &orcus_level },` — this row was
             * MISSING, so game.orcus_level was never set and shknam.c:792's
             * "it's a ghost town, get rid of shopkeepers" test could not be
             * asked.  Its one consumer is js/mklev.js stock_room(). */
            case 'orcus':
                game.orcus_level = lv;
                break;
            case 'wizard1':
                game.wiz1_level = lv;
                break;
            case 'wizard2':
                game.wiz2_level = lv;
                break;
            case 'wizard3':
                game.wiz3_level = lv;
                break;
            case 'fakewiz1':
                game.portal_level = lv;
                break;
            case 'knox':
                game.knox_level = lv;
                break;
            case 'astral':
                game.astral_level = lv;
                break;
            case 'water':
                game.water_level = lv;
                break;
            case 'fire':
                game.fire_level = lv;
                break;
            case 'air':
                game.air_level = lv;
                break;
            case 'earth':
                game.earth_level = lv;
                break;
            case 'minend':
                game.mineend_level = lv;
                break;
            case 'soko1':
                game.sokoend_level = lv;
                break; /* soko1=top Sokoban */
            case 'x-strt':
                game.qstart_level = lv;
                break;
            case 'x-loca':
                game.qlocate_level = lv;
                break;
            case 'x-goal':
                game.nemesis_level = lv;
                break;
        }
    }
    {
        const knox = game.knox_level;
        if (knox) {
            for (const br of branches)
                if (br?.end2?.dnum === knox.dnum)
                    br.end1_floating = true;
        }
    }
    /* C ref: dungeon.c fixup_level_locations() — quest-level d_level globals need
     * the already-renamed names in _sp_levchn (renamed above), but here we still
     * iterate pd.final_lev by proto names.  qstart/qlocate/nemesis are set above
     * using the original x-strt/x-loca/x-goal names before renaming.  That's correct:
     * fixup_level_locations find_level() looks up by old name ("x-strt") then assigns
     * lev_spec BEFORE doing the Sprintf rename on x->proto. */
    /* C ref: dungeon.c mines_dnum / fixup_level_locations() dungeon-number globals.
     * mines_dnum used by fill_ordinary_room (mklev.c:1037-1045) and mineralize.
     * quest_dnum used by In_quest(). sokoban_dnum used by In_sokoban().
     * tower_dnum used by In_V_tower(). tutorial_dnum used by In_tutorial().
     * C: dungeon.c:1164-1168 quest_dnum=dname_to_dnum("The Quest"); etc. */
    for (let dnum = 0; dnum < pd._names.length; dnum++) {
        switch (pd._names[dnum]) {
            case 'The Gnomish Mines':
                game.mines_dnum = dnum;
                break;
            case 'The Quest':
                game.quest_dnum = dnum;
                break;
            case 'Sokoban':
                game.sokoban_dnum = dnum;
                break;
            case "Vlad's Tower":
                game.tower_dnum = dnum;
                break;
            case 'The Tutorial':
                game.tutorial_dnum = dnum;
                break;
        }
    }
}
