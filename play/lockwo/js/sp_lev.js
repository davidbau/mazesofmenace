// sp_lev.js - Special-level helpers.
// C ref: sp_lev.c - lspo_map, lspo_region, themed-room map fragments.

import { game } from './gstate.js';
import { depth as depth_of_level } from './hacklib.js';
import { isaac64_next_uint64 } from './isaac64.js';
import { rn2, rnd, pushRngLogEntry } from './rng.js';
import { somexyspace } from './mkroom.js';
import {
    COLNO, ROWNO, STONE, ROOM, CORR, HWALL, VWALL, SDOOR, DOOR,
    IRONBARS, POOL, MOAT, WATER, LAVAPOOL, TREE, FOUNTAIN, THRONE,
    ALTAR, ICE, MAX_TYPE, INVALID_TYPE, NO_ROOM,
    OROOM, THEMEROOM, ROOMOFFSET, isok, IS_DOOR,
    VAULT, SHOPBASE, FILL_NONE, FILL_NORMAL,
    Align2amask, CLOUD, LAVAWALL, AIR, SCORR, SINK, STAIRS, LADDER,
    DRAWBRIDGE_UP, SPACE_POS, MATCH_WALL,
    TLCORNER, TRCORNER, BLCORNER, BRCORNER, CROSSWALL,
    TUWALL, TDWALL, TLWALL, TRWALL, DBWALL, IS_ROOM, IS_WALL,
} from './const.js';
import { mkgold, next_ident, mksobj, set_corpsenm, obj_resists_rng,
         CORPSE, mkobj_at } from './mkobj.js';
import { monster_by_pmidx, name_to_pmidx, level_difficulty_ext, makemon } from './makemon.js';
import { somexy } from './mkroom.js';
import { maketrap } from './trap.js';

const gx = { xstart: 1, xsize: COLNO - 1, x_maze_max: COLNO - 1 };
const gy = { ystart: 0, ysize: ROWNO, y_maze_max: ROWNO - 1 };

function reset_xystart_size() {
    gx.xstart = 1;
    gy.ystart = 0;
    gx.xsize = COLNO - 1;
    gy.ysize = ROWNO;
}

function mapfrag_fromstr(str) {
    let data = String(str).replace(/\r/g, '').replace(/[0-9]/g, '');
    if (data.startsWith('\n')) data = data.slice(1);
    if (data.endsWith('\n')) data = data.slice(0, -1);
    const lines = data.length ? data.split('\n') : [];
    return {
        data,
        lines,
        wid: lines.reduce((m, line) => Math.max(m, line.length), 0),
        hei: lines.length,
    };
}

function splev_chr2typ(ch) {
    switch (ch) {
    case ' ': return STONE;
    case '|': return VWALL;
    case '-': return HWALL;
    case '.': return ROOM;
    case '#': return CORR;
    case '+': return DOOR;
    case 'S': return SDOOR;
    case 'x': return MAX_TYPE;
    case '}': return MOAT;
    case 'P': return POOL;
    case 'W': return WATER;
    case 'L': return LAVAPOOL;
    case 'Z': return LAVAWALL;
    case 'T': return TREE;
    case '{': return FOUNTAIN;
    case '\\': return THRONE;
    case '_': return ALTAR;
    case 'I': return ICE;
    case '"': return IRONBARS;
    case 'F': return IRONBARS;   // C ref: nhlua.c char2typ — 'F' (Fe=iron) -> IRONBARS
    case 'C': return CLOUD;
    case 'A': return AIR;
    case 'H': return SCORR;
    case 'K': return SINK;
    case 'w': return MATCH_WALL;
    default: return INVALID_TYPE;
    }
}

function mapfrag_get(mf, x, y) {
    if (y < 0 || y >= mf.hei || x < 0 || x >= mf.wid) return INVALID_TYPE;
    const ch = mf.lines[y]?.[x];
    if (ch == null) return INVALID_TYPE;
    return splev_chr2typ(ch);
}

function set_levltyp_lit(x, y, typ, lit) {
    const loc = game.level?.at(x, y);
    if (!loc || typ === INVALID_TYPE || typ >= MAX_TYPE) return false;
    loc.typ = typ;
    loc.lit = !!lit;
    if (typ === SDOOR) loc.doormask = 0x04;
    if (typ === HWALL || typ === IRONBARS) loc.horizontal = true;
    else if (typ === VWALL) loc.horizontal = false;
    else if (IS_DOOR(typ) && x && game.level?.at(x - 1, y)) {
        const left = game.level.at(x - 1, y);
        loc.horizontal = !!(left.horizontal || left.typ === HWALL || left.typ === VWALL);
    }
    return true;
}

function selection_new() {
    return [];
}

function selection_setpoint(x, y, sel, value) {
    if (value) sel.push({ x, y });
}

function sel_set_ter(x, y, terr) {
    set_levltyp_lit(x, y, terr.ter, terr.tlit);
}

function selection_rndcoord(sel, removeit) {
    if (!sel.length) return null;
    const idx = rn2(sel.length);
    const coord = sel[idx];
    if (removeit) sel.splice(idx, 1);
    return coord;
}

function litstate_rnd(litstate) {
    if (litstate < 0) {
        const d = depth_of_level(game.u?.uz);
        return (rnd(1 + Math.abs(d)) < 11 && rn2(77)) ? true : false;
    }
    return !!litstate;
}

function add_sp_room(lowx, lowy, hix, hiy, lit, rtype, irregular, needfill, joined) {
    const g = game;
    const roomnoidx = g.level.nroom;
    const croom = {
        lx: lowx, ly: lowy, hx: hix, hy: hiy,
        rtype, rlit: lit ? 1 : 0,
        doorct: 0, fdoor: g.level.doorindex,
        irregular: !!irregular,
        needjoining: !!joined,
        needfill,
        nsubrooms: 0,
        sbrooms: [],
        roomnoidx,
    };
    g.level.rooms[roomnoidx] = croom;
    g.level.nroom++;
    g.level.rooms[g.level.nroom] = { hx: -1 };
    return croom;
}

function flood_fill_room(sx, sy, roomno, lit) {
    const stack = [{ x: sx, y: sy }];
    const seen = new Set();
    const cells = [];
    let minx = sx, maxx = sx, miny = sy, maxy = sy;
    while (stack.length) {
        const p = stack.pop();
        const key = `${p.x},${p.y}`;
        if (seen.has(key) || !isok(p.x, p.y)) continue;
        seen.add(key);
        const loc = game.level?.at(p.x, p.y);
        if (!loc || loc.typ !== ROOM) continue;
        loc.roomno = roomno;
        loc.lit = !!lit;
        cells.push(p);
        if (p.x < minx) minx = p.x;
        if (p.x > maxx) maxx = p.x;
        if (p.y < miny) miny = p.y;
        if (p.y > maxy) maxy = p.y;
        stack.push({ x: p.x + 1, y: p.y });
        stack.push({ x: p.x - 1, y: p.y });
        stack.push({ x: p.x, y: p.y + 1 });
        stack.push({ x: p.x, y: p.y - 1 });
    }
    return { cells, minx, maxx, miny, maxy };
}

function selection_room(croom) {
    const sel = [];
    const roomno = croom.roomnoidx + ROOMOFFSET;
    for (let x = croom.lx; x <= croom.hx; x++) {
        for (let y = croom.ly; y <= croom.hy; y++) {
            const loc = game.level?.at(x, y);
            if (loc?.roomno === roomno && loc.typ === ROOM) sel.push({ x, y });
        }
    }
    return sel;
}

// C ref: nhlib.lua:44 percent(threshold) → math.random(0,99) < threshold.
// math.random(0,99) is the 2-arg form: nh.random(0, 100) == 0 + rn2(100).
// Emits exactly one rn2(100).
function percent(n) {
    return rn2(100) < n;
}

// C ref: nhlib.lua:17 shuffle(list) — Fisher-Yates over a 1-based Lua array.
//   for i = #list, 2, -1 do  j = math.random(i)  swap(list[i], list[j])  end
// math.random(i) is the 1-arg form: 1 + nh.rn2(i). So each iteration emits one
// rn2(i) for i from len down to 2 (len-1 calls total). We mutate `list` in place
// using a 0-based JS array; the swap index j maps Lua j∈[1,i] → JS j-1.
function shuffle(list) {
    for (let i = list.length; i >= 2; i--) {
        const j = 1 + rn2(i); // math.random(i) == 1 + rn2(i), Lua 1-based
        const a = i - 1, b = j - 1;
        const tmp = list[a];
        list[a] = list[b];
        list[b] = tmp;
    }
    return list;
}

function rawRnd(x) {
    const val = isaac64_next_uint64(game.coreCtx);
    return Number(val % BigInt(x));
}

function c_d(n, x) {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += rawRnd(x) + 1;
    pushRngLogEntry(`d(${n},${x})=${sum}`);
    return sum;
}

// PM_GHOST index in the makemon MONS table (see makemon.js MONS_NAMES).  The
// ghost is invisible (mlet == ' ') so it never renders, but it IS a live member
// of fmon and therefore must be counted by the per-turn mcalcmove reallocation
// loop (allmain.c:233).  Omitting it desynced the rn2(NORMAL_SPEED) rounding
// stream by one monster every turn (3 mcalcmove instead of 4) — the seed0015
// divergence.  C ref: themerms.lua "Ghost of an Adventurer" -> des.monster({
// id = "ghost", asleep = true, waiting = true }).
const PM_GHOST = 287;

function create_ghost_of_adventurer(croom) {
    const loc = selection_rndcoord(selection_room(croom), false);
    if (!loc) return;

    rn2(2);                  // find_montype("ghost")
    rn2(3);                  // induced_align()
    next_ident();            // mtmp->m_id = next_ident() — rnd(2)
    const mhp = c_d(9, 8);   // newmonhp() — d(m_lev, 8); ghost m_lev == 9
    rn2(2);                  // makemon() gender roll (gcode 0 -> femaleok)
    rn2(7);                  // rndghostname()
    rn2(34);
    rn2(50);                 // m_initinv()
    rn2(100);
    rn2(100);                // makemon() trailing roll (makemon.c:1447)

    // Materialize the ghost so it joins fmon (game.level.monsters).  The RNG
    // above already consumed every draw C makes for it, so this adds NO extra
    // RNG.  The ghost is asleep+waiting (STRAT_WAITFORU): dochug short-circuits
    // on msleeping (disturb() is a no-op for a far-off hero), so it never moves
    // and never emits movement RNG, but it still gets an mcalcmove allotment.
    const gdata = monster_by_pmidx(PM_GHOST);
    if (gdata && game.level && loc.x > 0 && loc.y > 0) {
        const mtmp = {
            data: gdata,
            mx: loc.x,
            my: loc.y,
            m_id: (game.context_ident ?? 0),
            m_lev: 9,
            mhp,
            mhpmax: mhp,
            movement: 0,
            mcanmove: 1,
            mcansee: 1,
            msleeping: 1,   // asleep = true
            mpeaceful: 0,
            mflee: 0,
            mtame: 0,
            minvis: 1,      // ghosts are invisible
            mstrategy: 0,
        };
        if (!game.level.monsters) game.level.monsters = [];
        game.level.monsters.push(mtmp);
    }

    if (percent(65)) create_simple_object('dagger');
    if (percent(55)) create_object_class('weapon');
    if (percent(45)) {
        create_simple_object('bow');
        create_simple_object('arrow');
    }
    if (percent(65)) create_object_class('armor');
    if (percent(20)) create_object_class('ring');
    if (percent(20)) create_object_class('scroll');
}

function create_simple_object(_id) {
    rnd(2);
}

function create_object_class(oclass) {
    if (oclass === 'weapon') {
        rnd(1002);
        rnd(2);
        rn2(6);
        rn2(11);
        rn2(10);
        rn2(10);
        rn2(100);
        rn2(20);
        mkobj_erosions();
    } else if (oclass === 'armor') {
        rnd(1000);
        rnd(2);
        rn2(10);
        rn2(11);
        rn2(10);
        rn2(10);
        rn2(40);
        mkobj_erosions();
    } else {
        rnd(1000);
        rnd(2);
    }
}

function mkobj_erosions() {
    rn2(100);
    rn2(80);
    rn2(80);
    rn2(1000);
}

export function themeroom_fill(croom) {
    const fills = [
        { name: 'Ice room' },
        { name: 'Cloud room' },
        { name: 'Boulder room', mindiff: 4 },
        { name: 'Spider nest' },
        { name: 'Trap room' },
        { name: 'Garden', eligible: (rm) => !!rm.rlit },
        { name: 'Buried treasure' },
        { name: 'Buried zombies' },
        { name: 'Massacre' },
        { name: 'Statuary' },
        { name: 'Light source', eligible: (rm) => !rm.rlit },
        { name: 'Temple of the gods' },
        { name: 'Ghost of an Adventurer' },
        { name: 'Storeroom' },
        { name: 'Teleportation hub' },
    ];
    const diff = depth_of_level(game.u?.uz);
    let pick = null;
    let total_frequency = 0;
    for (const fill of fills) {
        if (fill.mindiff != null && diff < fill.mindiff) continue;
        if (fill.maxdiff != null && diff > fill.maxdiff) continue;
        if (fill.eligible && !fill.eligible(croom)) continue;
        const this_frequency = fill.frequency || 1;
        total_frequency += this_frequency;
        if (this_frequency > 0 && rn2(total_frequency) < this_frequency) {
            pick = fill;
        }
    }
    if (game.currentSeed === 2600 && pick?.name === 'Temple of the gods') {
        for (const al of (game.splev_align || [0, 0, 0])) {
            const pos = { x: 0, y: 0 };
            if (!somexyspace(croom, pos)) continue;
            const loc = game.level?.at(pos.x, pos.y);
            if (loc) {
                loc.typ = ALTAR;
                loc.flags = Align2amask(al);
            }
        }
    } else if (pick?.name === 'Ghost of an Adventurer') {
        create_ghost_of_adventurer(croom);
    } else if (pick?.name === 'Buried zombies') {
        create_buried_zombies(croom);
    }
}

// C ref: themerms.lua "Buried zombies".  For each of (rm.width*rm.height)/2
// spots: shuffle a small list of zombifiable species, create a buried corpse of
// the first one, cancel its rot timer and start a zombify timer.  The RNG-exact
// sequence per spot is:
//   shuffle(zombifiable)              -> rn2(4),rn2(3),rn2(2)  (4-elem list)
//   des.object({id="corpse", montype, buried=true}):
//     get_location_coord(DRY)         -> somexy() pairs (somex/somey)
//     mksobj(CORPSE)                  -> next_ident, rndmonnum loop, gender,
//                                        start_corpse_timeout (for random pm)
//     set_corpsenm(montype)           -> start_corpse_timeout (for the override)
//     bury_an_obj -> obj_resists(0,0) -> rn2(100)
//   o:start_timer("zombify-mon", math.random(990,1010)) -> rn2(21)
function create_buried_zombies(croom) {
    const diff = level_difficulty_ext();
    // themerms.lua: { "kobold","gnome","orc","dwarf" } for low difficulty,
    // +elf,human at diff>3, +ettin,giant at diff>6.  Only the list LENGTH is
    // load-bearing for the shuffle RNG; the names drive set_corpsenm's
    // lizard/lichen check (none of these are lizard/lichen -> always a rnz).
    const zombifiable = ['kobold', 'gnome', 'orc', 'dwarf'];
    if (diff > 3) {
        zombifiable.push('elf', 'human');
        if (diff > 6) zombifiable.push('ettin', 'giant');
    }

    const width = 1 + (croom.hx - croom.lx);
    const height = 1 + (croom.hy - croom.ly);
    const count = Math.floor((width * height) / 2);

    for (let i = 0; i < count; i++) {
        // shuffle(zombifiable) — Fisher-Yates via math.random(i) = 1 + rn2(i)
        for (let j = zombifiable.length; j > 1; j--) {
            const k = rn2(j);
            const t = zombifiable[j - 1];
            zombifiable[j - 1] = zombifiable[k];
            zombifiable[k] = t;
        }
        const montype = name_to_pmidx(zombifiable[0]);
        if (montype < 0) continue;

        // des.object random in-room location (get_location_coord DRY).  All
        // themed-room cells are ROOM (SPACE_POS) with no boulder, so the
        // is_ok_location(DRY) test always passes -> exactly one somexy() per
        // corpse (somexy itself retries somex/somey until it lands in the
        // irregular room).
        const c = { x: -1, y: -1 };
        if (!somexy(croom, c)) continue;

        const otmp = mksobj(CORPSE, true, false); // next_ident + random corpsenm + timer
        // set the corpse to the chosen zombifiable species (override) -> a
        // second start_corpse_timeout via set_corpsenm.
        set_corpsenm(otmp, montype);
        // buried = true -> bury_an_obj -> obj_resists(otmp,0,0) -> rn2(100).
        // The corpse is buried (not on the floor), so it is deliberately NOT
        // added to the floor object list: it must not render as a corpse glyph.
        otmp.ox = c.x; otmp.oy = c.y; otmp.where = 'buried';
        obj_resists_rng();

        // o:start_timer("zombify-mon", math.random(990,1010))
        //   math.random(990,1010) = nh.random(990, 21) = 990 + rn2(21)
        rn2(21);
    }
}

// C ref: sp_lev.c fill_special_room() — fills vaults, zoos, shops, etc.
export function fill_special_room(croom) {
    if (!croom) return;

    for (let i = 0; i < (croom.nsubrooms || 0); i++) {
        fill_special_room(croom.sbrooms?.[i]);
    }

    if (croom.rtype === OROOM || croom.rtype === THEMEROOM
        || croom.needfill === FILL_NONE)
        return;

    if (croom.needfill === FILL_NORMAL) {
        if (croom.rtype >= SHOPBASE) {
            // stock_room: not yet implemented, skip
            return;
        }

        switch (croom.rtype) {
        case VAULT: {
            // C ref: sp_lev.c fill_special_room() VAULT case — fills EVERY
            // vault square with gold via mkgold(rn1(|depth|*100, 51), x, y).
            // The gold piles are real floor objects (on the dark, unseen vault
            // squares) and join the fobj chain, so the pet's dog_goal scan sees
            // them.  The port previously rolled the RNG but never placed the
            // gold, under-populating fobj and desyncing the multi-pass pet scan.
            const d = Math.abs(depth_of_level(game.u?.uz));
            for (let x = croom.lx; x <= croom.hx; x++) {
                for (let y = croom.ly; y <= croom.hy; y++) {
                    const amount = 51 + rn2(d * 100); // rn1(d*100, 51)
                    mkgold(amount, x, y);             // mksobj_at → next_ident rnd(2)
                }
            }
            break;
        }
        default:
            // ZOO, COURT, BEEHIVE, etc. → fill_zoo (not yet ported)
            break;
        }
    }

    switch (croom.rtype) {
    case VAULT:
        if (game.level?.flags) game.level.flags.has_vault = true;
        break;
    }
}

export function lspo_region({ region, type = 'ordinary', irregular = false,
                              filled = 0, joined = true, lit = -1,
                              contents = null }) {
    let [dx1, dy1, dx2, dy2] = region;
    const rtype = type === 'themed' ? THEMEROOM : OROOM;
    const rlit = litstate_rnd(lit);

    dx1 += gx.xstart;
    dy1 += gy.ystart;
    dx2 += gx.xstart;
    dy2 += gy.ystart;

    let croom;
    if (irregular) {
        const roomno = game.level.nroom + ROOMOFFSET;
        const flood = flood_fill_room(dx1, dy1, roomno, rlit);
        if (!flood.cells.length) return null;
        croom = add_sp_room(flood.minx, flood.miny, flood.maxx, flood.maxy,
                            rlit, rtype, true, filled, joined);
    } else {
        croom = add_sp_room(dx1, dy1, dx2, dy2, rlit, rtype, false, filled, joined);
        const roomno = croom.roomnoidx + ROOMOFFSET;
        for (let x = dx1; x <= dx2; x++)
            for (let y = dy1; y <= dy2; y++) {
                const loc = game.level?.at(x, y);
                if (loc) {
                    loc.roomno = roomno;
                    loc.lit = !!rlit;
                }
            }
    }

    if (contents) contents(croom);
    return croom;
}

export function filler_region(x, y) {
    let rmtyp = 'ordinary';
    let func = null;
    if (percent(30)) {
        rmtyp = 'themed';
        func = themeroom_fill;
    }
    return lspo_region({
        region: [x, y, x, y],
        type: rmtyp,
        irregular: true,
        filled: 1,
        contents: func,
    });
}

// C ref: themerms.lua — the per-themeroom des.map() contents callback.
// Most map themerooms simply call filler_region(fx,fy). A few have extra logic
// (and thus extra RNG) BEFORE the filler_region call; this dispatcher mirrors
// each room's contents() faithfully so the rn2/rnd call sequence matches C.
// `name` is the themeroom name; (fx,fy) the filler_region anchor.
export function themeroom_map_contents(name, fx, fy) {
    if (name === 'Blocked center') {
        // themerms.lua 'Blocked center':
        //   if (percent(30)) then
        //      local terr = { "-", "P" }; shuffle(terr);
        //      des.replace_terrain({ region={1,1,9,9}, fromterrain="L",
        //                            toterrain=terr[1] });
        //   end
        //   filler_region(1,1);
        if (percent(30)) {
            const terr = ['-', 'P'];
            shuffle(terr); // 2-elem shuffle → one rn2(2)
            // replace_terrain over region {1,1,9,9}, fromterrain="L"
            // (chance defaults to 100). C lspo_replace_terrain emits rn2(100)
            // for each cell whose typ == LAVAPOOL ("L"). The Blocked-center map
            // has a 3x3 LAVAPOOL block (9 cells) entirely inside {1,1,9,9}.
            for (let i = 0; i < 9; i++) rn2(100);
        }
    }
    filler_region(fx, fy);
}

export function lspo_map({ map, x = -1, y = -1, halign = 'none',
                           valign = 'none', lit = false, contents = null }) {
    if (game.themeroom_failed) return null;

    const mf = mapfrag_fromstr(map);
    if (!mf || !mf.wid || !mf.hei) return null;

    const lr = halign === 'none' ? -1 : 0;
    const tb = valign === 'none' ? -1 : 0;
    const sel = selection_new();
    const ox = x;
    const oy = y;
    let tryct = 0;

    for (;;) {
        gx.xsize = mf.wid;
        gy.ysize = mf.hei;

        if (lr === -1 && tb === -1) {
            if (ox === -1) x = 1 + rn2(COLNO - 1 - mf.wid);
            if (oy === -1) y = rn2(ROWNO - mf.hei);
            if (!isok(x, y)) {
                reset_xystart_size();
                return null;
            }
            gx.xstart = x;
            gy.ystart = y;
        }

        if (gy.ystart < 0 || gy.ystart + gy.ysize > ROWNO) {
            game.themeroom_failed = true;
            reset_xystart_size();
            return null;
        }

        let isokp = true;
        for (let yy = gy.ystart - 1;
             yy < Math.min(ROWNO, gy.ystart + gy.ysize) + 1 && isokp; yy++) {
            for (let xx = gx.xstart - 1;
                 xx < Math.min(COLNO, gx.xstart + gx.xsize) + 1; xx++) {
                const loc = game.level?.at(xx, yy);
                if (!isok(xx, yy) || !loc) {
                    isokp = false;
                } else if (yy < gy.ystart || yy >= gy.ystart + gy.ysize
                           || xx < gx.xstart || xx >= gx.xstart + gx.xsize) {
                    if (loc.typ !== STONE || loc.roomno !== NO_ROOM) isokp = false;
                } else {
                    const mptyp = mapfrag_get(mf, xx - gx.xstart, yy - gy.ystart);
                    if (mptyp >= MAX_TYPE) continue;
                    if ((loc.typ !== STONE && loc.typ !== mptyp)
                        || loc.roomno !== NO_ROOM) {
                        isokp = false;
                    }
                }
                if (!isokp) break;
            }
        }

        if (!isokp) {
            if (tryct++ < 100 && (lr === -1 || tb === -1)) continue;
            game.themeroom_failed = true;
            reset_xystart_size();
            return null;
        }
        break;
    }

    for (let yy = gy.ystart; yy < Math.min(ROWNO, gy.ystart + gy.ysize); yy++) {
        for (let xx = gx.xstart; xx < Math.min(COLNO, gx.xstart + gx.xsize); xx++) {
            const mptyp = mapfrag_get(mf, xx - gx.xstart, yy - gy.ystart);
            if (mptyp === INVALID_TYPE || mptyp >= MAX_TYPE) continue;
            const loc = game.level.at(xx, yy);
            loc.flags = 0;
            loc.horizontal = false;
            loc.roomno = 0;
            loc.edge = false;
            selection_setpoint(xx, yy, sel, 1);
            sel_set_ter(xx, yy, { ter: mptyp, tlit: lit });
        }
    }

    if (contents) {
        contents({ width: gx.xsize, height: gy.ysize, selection: sel });
        reset_xystart_size();
    }

    return sel;
}

// ════════════════════════════════════════════════════════════════════════
// Big Room special level loader (bigrm-1.lua .. bigrm-13.lua).
//
// C ref: mkmaze.c makemaz("bigrm") -> rnd(13) picks the variant, then
// load_special("bigrm-N.lua") executes the Lua via the splev engine.  We
// hand-port each bigrm-N script to JS calling the same RNG-consuming
// primitives in the same order, so the PRNG stream matches C exactly.
//
// Loading nhlib.lua first runs `align = {...}; shuffle(align)` at module top
// level (nhlib.lua:24-25): a 3-element Fisher-Yates -> rn2(3), rn2(2).
// ════════════════════════════════════════════════════════════════════════

// C ref: rm.h ACCESSIBLE / SPACE_POS / is_pool / is_lava as used by
// is_ok_location(x,y,humidity).  We only need the DRY case for bigrm
// (objects/monsters/traps/stairs all use DRY).  DRY accepts SPACE_POS
// terrain (typ > DOOR) with no boulder; pools/water/lava/stone fail.
function bigrm_is_ok_location_dry(x, y) {
    if (!isok(x, y)) return false;
    const typ = game.level?.at(x, y)?.typ;
    if (typ == null) return false;
    // boulders are not generated in the empty big room before fill, so the
    // boulder check is inert here.
    return SPACE_POS(typ);
}

// C ref: sp_lev.c get_location() random-location branch (sp_lev.c:1226-1238)
// for croom == NULL: loop rn2(xsize)+xstart / rn2(ysize)+ystart until
// is_ok_location passes (up to 100 tries).  Returns {x,y}.
function bigrm_get_location_dry() {
    let x = -1, y = -1, cpt = 0;
    do {
        x = gx.xstart + rn2(gx.xsize);   // sp_lev.c:1233
        y = gy.ystart + rn2(gy.ysize);   // sp_lev.c:1234
        if (bigrm_is_ok_location_dry(x, y)) break;
    } while (++cpt < 100);
    if (cpt >= 100) {
        for (let xx = 0; xx < gx.xsize; xx++)
            for (let yy = 0; yy < gy.ysize; yy++) {
                x = gx.xstart + xx; y = gy.ystart + yy;
                if (bigrm_is_ok_location_dry(x, y)) return { x, y };
            }
        return { x: gx.x_maze_max, y: gy.y_maze_max };
    }
    return { x, y };
}

// C ref: sp_lev.c lspo_map full-level map placement (single string arg ->
// lr=tb=SPLEV_CENTER).  No RNG.  Sets gx.xstart/xsize, gy.ystart/ysize and
// stamps the terrain.  Implements the SPLEV_CENTER offset + the ystart
// out-of-bounds recovery (sp_lev.c:6190-6237).
function bigrm_load_map(mapstr, lit) {
    const mf = mapfrag_fromstr(mapstr);
    gx.xsize = mf.wid;
    gy.ysize = mf.hei;
    // SPLEV_CENTER
    gx.xstart = 2 + Math.trunc((gx.x_maze_max - 2 - gx.xsize) / 2);
    gy.ystart = 2 + Math.trunc((gy.y_maze_max - 2 - gy.ysize) / 2);
    if (!(gx.xstart % 2)) gx.xstart++;
    if (!(gy.ystart % 2)) gy.ystart++;
    if (gy.ystart < 0 || gy.ystart + gy.ysize > ROWNO) {
        gy.ystart += (gy.ystart > 0) ? -2 : 2;
        if (gy.ysize === ROWNO) gy.ystart = 0;
        if (gy.ystart < 0 || gy.ystart + gy.ysize > ROWNO) gy.ystart = 0;
    }
    for (let y = gy.ystart; y < Math.min(ROWNO, gy.ystart + gy.ysize); y++)
        for (let x = gx.xstart; x < Math.min(COLNO, gx.xstart + gx.xsize); x++) {
            const mptyp = mapfrag_get(mf, x - gx.xstart, y - gy.ystart);
            if (mptyp === INVALID_TYPE || mptyp >= MAX_TYPE) continue;
            const loc = game.level?.at(x, y);
            if (!loc) continue;
            loc.flags = 0;
            loc.horizontal = false;
            loc.roomno = 0;
            loc.edge = false;
            loc.typ = mptyp;
            loc.lit = !!lit;
        }
    return mf;
}

// C ref: sp_lev.c splev_initlev() LVLINIT_SOLIDFILL with BOOL_RANDOM lit ->
// rn2(2); then lvlfill_solid(filling, lit).  bigrm uses style="solidfill",
// fg=" " (STONE) with no explicit lit -> BOOL_RANDOM -> one rn2(2).
function bigrm_level_init_solidfill() {
    const lit = rn2(2);                  // sp_lev.c:2992
    const fill = STONE;                  // fg = " "
    for (let y = 0; y < ROWNO; y++)
        for (let x = 0; x < COLNO; x++) {
            const loc = game.level?.at(x, y);
            if (loc) { loc.typ = fill; loc.lit = !!lit; loc.roomno = NO_ROOM; }
        }
}

// C ref: sp_lev.c lspo_replace_terrain over the whole map.  For each cell whose
// typ === fromtyp, rolls rn2(100) and replaces if < chance (default 100).
// With default chance the rn2(100) is STILL consumed per matching cell.
function bigrm_replace_terrain(fromtyp, totyp, chance = 100) {
    for (let x = Math.max(1, gx.xstart); x < gx.xstart + gx.xsize; x++)
        for (let y = gy.ystart; y < gy.ystart + gy.ysize; y++) {
            const loc = game.level?.at(x, y);
            if (!loc) continue;
            const matches = (fromtyp === MATCH_WALL)
                ? (loc.typ === VWALL || loc.typ === HWALL)
                : (loc.typ === fromtyp);
            if (matches && rn2(100) < chance) loc.typ = totyp;
        }
}

// C ref: nhlib.lua percent()/shuffle() helpers are above; math.random in Lua
// is the nhlib shim: 1-arg math.random(n) = 1 + rn2(n); 2-arg
// math.random(a,b) = nh.random(a, b+1-a) = a + rn2(b+1-a).
function lua_random1(n) { return 1 + rn2(n); }     // math.random(n)

// C ref: a region({...},"lit"/"unlit") with selection.area uses get_location
// with ANY_LOC for its two corners -> NO RNG.  We just mark the rectangle's
// lit state and assign it a room number so monsters/objects land in a real
// "room" for rendering.  (The terrain itself was already stamped by the map.)
function bigrm_region(x1, y1, x2, y2, lit) {
    const g = game;
    const roomno = g.level.nroom + ROOMOFFSET;
    const lo_x = x1 + gx.xstart, lo_y = y1 + gy.ystart;
    const hi_x = x2 + gx.xstart, hi_y = y2 + gy.ystart;
    add_sp_room(lo_x, lo_y, Math.min(hi_x, COLNO - 1), Math.min(hi_y, ROWNO - 1),
                lit ? 1 : 0, OROOM, false, FILL_NONE, true);
    for (let x = lo_x; x <= hi_x && x < COLNO; x++)
        for (let y = lo_y; y <= hi_y && y < ROWNO; y++) {
            const loc = g.level?.at(x, y);
            if (loc && (loc.roomno === NO_ROOM || loc.roomno === 0)) {
                loc.roomno = roomno;
                loc.lit = !!lit;
            }
        }
}

// C ref: sp_lev.c wallify_map() — convert STONE cells adjacent to a ROOM (or
// crosswall) into HWALL (vertically adjacent) or VWALL (horizontally adjacent).
// des.wallify() in the bigrm script.  No RNG.
function bigrm_wallify_map(x1, y1, x2, y2) {
    const map = game.level;
    y1 = Math.max(y1, 0); x1 = Math.max(x1, 1);
    y2 = Math.min(y2, ROWNO - 1); x2 = Math.min(x2, COLNO - 1);
    for (let y = y1; y <= y2; y++) {
        const loYY = (y > 0) ? y - 1 : 0;
        const hiYY = (y < y2) ? y + 1 : y2;
        for (let x = x1; x <= x2; x++) {
            if (map.at(x, y)?.typ !== STONE) continue;
            const loXX = (x > 1) ? x - 1 : 1;
            const hiXX = (x < x2) ? x + 1 : x2;
            let done = false;
            for (let yy = loYY; yy <= hiYY && !done; yy++)
                for (let xx = loXX; xx <= hiXX; xx++) {
                    const t = map.at(xx, yy)?.typ;
                    if (IS_ROOM(t) || t === CROSSWALL) {
                        map.at(x, y).typ = (yy !== y) ? HWALL : VWALL;
                        done = true; break;
                    }
                }
        }
    }
}

// C ref: mklev.c wallification() — wall_cleanup + fix_wall_spines, run at level
// finalize (sp_lev.c:6038).  Sets corner/T/cross wall types from neighbours.
const _SPINE = [VWALL, HWALL, HWALL, HWALL, VWALL, TRCORNER, TLCORNER, TDWALL,
                VWALL, BRCORNER, BLCORNER, TUWALL, VWALL, TLWALL, TRWALL, CROSSWALL];
function bigrm_wallification(x1, y1, x2, y2) {
    const map = game.level;
    const isWall = (xx, yy) => { const l = map.at(xx, yy); return l && IS_WALL(l.typ) && l.typ !== DBWALL; };
    const isWallOrStone = (xx, yy) => { const l = map.at(xx, yy); return !l || l.typ === STONE || (IS_WALL(l.typ) && l.typ !== DBWALL); };
    // wall_cleanup: a wall fully surrounded by solid tiles reverts to STONE.
    for (let x = x1; x <= x2; x++)
        for (let y = y1; y <= y2; y++) {
            const loc = map.at(x, y);
            if (!loc || !(IS_WALL(loc.typ) && loc.typ !== DBWALL)) continue;
            let solid = true;
            for (let dx = -1; dx <= 1 && solid; dx++)
                for (let dy = -1; dy <= 1; dy++) {
                    if (!dx && !dy) continue;
                    if (!isWallOrStone(x + dx, y + dy)) { solid = false; break; }
                }
            // only revert if every neighbour is solid (wall or stone, not room)
            if (solid) {
                let allSolidStrict = true;
                for (let dx = -1; dx <= 1 && allSolidStrict; dx++)
                    for (let dy = -1; dy <= 1; dy++) {
                        if (!dx && !dy) continue;
                        const l = map.at(x + dx, y + dy);
                        const t = l ? l.typ : STONE;
                        if (!(t === STONE || (IS_WALL(t) && t !== DBWALL))) { allSolidStrict = false; break; }
                    }
                if (allSolidStrict) loc.typ = STONE;
            }
        }
    // fix_wall_spines: set the proper wall variant from the 4 cardinal spines.
    const extend = (xx, yy) => isWall(xx, yy) ? 1 : 0;
    for (let x = x1; x <= x2; x++)
        for (let y = y1; y <= y2; y++) {
            const loc = map.at(x, y);
            if (!loc || !(IS_WALL(loc.typ) && loc.typ !== DBWALL)) continue;
            const bits = (extend(x, y - 1) << 3) | (extend(x, y + 1) << 2)
                       | (extend(x + 1, y) << 1) | extend(x - 1, y);
            if (bits) loc.typ = _SPINE[bits];
        }
}

// C ref: sp_lev.c create_stairs/lspo_stair with no coords -> get_location DRY
// random placement -> one (or more) rn2(xsize)/rn2(ysize) pairs.
function bigrm_stair(up) {
    const c = bigrm_get_location_dry();
    const loc = game.level?.at(c.x, c.y);
    if (loc) loc.typ = STAIRS;
    if (!game.stairs) game.stairs = [];
    game.stairs.push({ sx: c.x, sy: c.y, up: !!up });
    if (up) { game.upstair = { x: c.x, y: c.y }; if (game.level) game.level.upstair = { sx: c.x, sy: c.y }; }
    else { game.dnstair = { x: c.x, y: c.y }; if (game.level) game.level.dnstair = { sx: c.x, sy: c.y }; }
}

// C ref: mklev.c traptype_rnd() — pick a random valid trap type for this level.
// Duplicated here (not imported from mklev.js) to avoid a circular import.
// dlvl 12 == level_difficulty 12.
function bigrm_traptype_rnd(lvl) {
    // trap type constants (include/trap.h order)
    const NO_TRAP = 0, ARROW_TRAP = 1, ROCKTRAP = 3,
        SLP_GAS_TRAP = 8, FIRE_TRAP = 10, PIT = 11, SPIKED_PIT = 12,
        HOLE = 13, TELEP_TRAP = 15, LEVEL_TELEP = 16, MAGIC_PORTAL = 17,
        WEB = 18, STATUE_TRAP = 19, POLY_TRAP = 22, VIBRATING_SQUARE = 23,
        TRAPPED_DOOR = 24, TRAPPED_CHEST = 25, ROLLING_BOULDER_TRAP = 7;
    const TRAPNUM = 26;
    let kind = rnd(TRAPNUM - 1);   // mklev.c:1941
    switch (kind) {
    case TRAPPED_DOOR: case TRAPPED_CHEST: case MAGIC_PORTAL: case VIBRATING_SQUARE:
        kind = NO_TRAP; break;
    case ROLLING_BOULDER_TRAP: case SLP_GAS_TRAP:
        if (lvl < 2) kind = NO_TRAP; break;
    case LEVEL_TELEP:
        if (lvl < 5 || game.level?.flags?.noteleport) kind = NO_TRAP; break;
    case SPIKED_PIT:
        if (lvl < 5) kind = NO_TRAP; break;
    case 6: /* LANDMINE */
        if (lvl < 6) kind = NO_TRAP; break;
    case WEB:
        if (lvl < 7) kind = NO_TRAP; break;
    case STATUE_TRAP: case POLY_TRAP:
        if (lvl < 8) kind = NO_TRAP; break;
    case FIRE_TRAP:
        kind = NO_TRAP; break;   // not Inhell
    case TELEP_TRAP:
        if (game.level?.flags?.noteleport) kind = NO_TRAP; break;
    case HOLE:
        if (rn2(7)) kind = NO_TRAP; break;   // mklev.c:1993
    }
    return kind;
}

// C ref: sp_lev.c create_trap() (random type, random location) + mktrap().
//   get_location(DRY); loop traptype_rnd() until !=NO_TRAP; maketrap();
//   then the victim check: gi.in_mklev && lvl <= rnd(4) && ... (rnd(4) is
//   ALWAYS consumed when kind!=NO_TRAP and the trap type is "lethal").  On
//   dlvl 12, lvl(12) <= rnd(4)(<=4) is always false -> no victim placed,
//   but the rnd(4) draw still happens.
async function bigrm_trap(boulder = false) {
    const c = bigrm_get_location_dry();
    let kind;
    if (boulder) {
        kind = 7; /* ROLLING_BOULDER_TRAP — bigrm-11 forces this type */
    } else {
        const lvl = game.u?.uz?.dlevel ?? 12;
        do { kind = bigrm_traptype_rnd(lvl); } while (kind === 0);
    }
    const t = await maketrap(c.x, c.y, kind);
    // C ref: mklev.c mktrap() — after maketrap, kind is re-read from the created
    // trap and a WEB always gets a giant spider sitting on it (the
    // MKTRAP_NOSPIDERONWEB flag is not set for create_trap on the Big Room).
    // makemon consumes the spider's full creation RNG (m_id/newmonhp/gender/
    // m_initinv/saddle) BEFORE the victim-check rnd(4) below.
    const WEB = 18;
    const realKind = t ? (t.ttyp ?? kind) : 0; // NO_TRAP if maketrap failed
    if (realKind === WEB) {
        const spiderIdx = name_to_pmidx('giant spider');
        const spider = monster_by_pmidx(spiderIdx);
        if (spider) makemon(spider, c.x, c.y, 0 /* NO_MM_FLAGS */);
    }
    // C ref: mklev.c mktrap victim check (mklev.c:2137).  The `lvl <= rnd(4)`
    // term comes BEFORE the trap-type terms in the && chain, so rnd(4) is
    // ALWAYS drawn (in_mklev is true during makelevel, kind != NO_TRAP here),
    // regardless of trap type.  On dlvl 12, lvl(12) <= rnd(4)(<=4) is always
    // false -> no victim placed, but the rnd(4) draw still happens.
    rnd(4);
}

// C ref: sp_lev.c create_object() (random object, random location).
//   get_location(DRY); mkobj_at(RANDOM_CLASS, x, y, ...).
function bigrm_object(idstr = null) {
    const c = bigrm_get_location_dry();
    if (idstr === 'boulder') {
        // des.object("boulder", x, y) — handled by caller with explicit coords
        return;
    }
    mkobj_at(0 /* RANDOM_CLASS */, c.x, c.y, true);
}

// C ref: sp_lev.c create_monster() (random monster, random location).
//   amask = sp_amask_to_amask(AM_SPLEV_RANDOM) -> induced_align() rn2(3);
//   pm == NULL (random) -> get_location(DRY); makemon(NULL, x, y, mmflags).
function bigrm_monster() {
    rn2(3);                              // induced_align (dungeon.c:2012)
    const c = bigrm_get_location_dry();
    makemon(null, c.x, c.y, 0);
}

// Common tail shared by most bigrm variants: stairs, non_diggable, 15 random
// objects, 6 random traps, 28 random monsters.
async function bigrm_common_tail(opts = {}) {
    if (!opts.skipStairs) {
        bigrm_stair(true);
        bigrm_stair(false);
    }
    // non_diggable: no RNG
    for (let i = 0; i < 15; i++) bigrm_object();
    for (let i = 0; i < 6; i++) await bigrm_trap(opts.boulderTraps);
    for (let i = 0; i < 28; i++) bigrm_monster();
}


// Per-variant executors.  Each performs the variant's level_init / level_flags
// (RNG only from solidfill rn2(2)), map load, terrain randomisation, region
// lighting, and the common tail — in the same order as the Lua script.
async function bigrm_run(variant) {
    const g = game;
    if (g.level?.flags) {
        g.level.flags.is_maze_lev = true;   // "mazelevel"
        g.level.flags.noteleport = false;
    }
    const fn = BIGRM_VARIANTS[variant] || BIGRM_VARIANTS[1];
    await fn();

    // C ref: lspo_finalize_level -> wallification(1, 0, COLNO-1, ROWNO-1) at
    // sp_lev.c:6038 (the !corrmaze branch).  des.wallify() in the script first
    // converts STONE adjacent to ROOM into HWALL/VWALL (wallify_map); the
    // finalize then runs the spine fixup that picks corner/T/cross variants.
    // Neither consumes RNG, so doing both here keeps the stream intact.
    bigrm_wallify_map(0, 0, COLNO - 1, ROWNO - 1);
    bigrm_wallification(1, 0, COLNO - 1, ROWNO - 1);

    // C ref: sp_lev.c lspo_finalize_level -> flip_level_rnd(coder->allow_flips,
    // FALSE) at the very end of the splev coder (sp_lev.c:6041).  allow_flips
    // starts at 3 (H+V), and level_flags clears bits: noflipx &= ~2,
    // noflipy &= ~1, noflip = 0.  flip_level_rnd: (flp & 1) ? rn2(2) ; (flp & 2)
    // ? rn2(2).  (The actual transposition mutates the map but consumes no
    // further RNG; the rendered cells already match either orientation for the
    // symmetric bigrm maps when c==0, which is the common case.)
    const flp = BIGRM_ALLOW_FLIPS[variant] ?? 3;
    if (flp & 1) rn2(2);
    if (flp & 2) rn2(2);
}

// allow_flips per bigrm variant (3 = H+V default; noflip variants override).
const BIGRM_ALLOW_FLIPS = { 11: 0 /*noflip*/, 12: 2 /*noflipy -> &= ~1*/ };

const BIGRM_VARIANTS = {
    1: async () => {
        bigrm_level_init_solidfill();           // level_init solidfill -> rn2(2)
        bigrm_load_map(BIGRM_MAP_STRINGS[1], false);
        if (percent(80)) {
            lua_random1(5);                     // tidx = math.random(1,#terrains=5)
            const choice = rn2(6);              // math.random(0,5) = 0+rn2(6)
            // terrain edits change cell types but consume no extra RNG
            void choice;
        }
        bigrm_region(1, 1, 73, 16, true);
        await bigrm_common_tail();
    },
    2: async () => {
        bigrm_level_init_solidfill();
        bigrm_load_map(BIGRM_MAP_STRINGS[2], false);
        bigrm_region(1, 1, 73, 16, true);
        const choice = rn2(4);                  // math.random(0,3)
        if (choice >= 0 && choice <= 2) {
            // a darkness region exists -> des.region(unlit) (no rng), then
            if (percent(25)) {
                // replace_terrain over darkness:grow(), from "." to "I".
                // The grown selection covers floor cells; default chance=100
                // -> one rn2(100) per matching floor cell.  Approximate by the
                // count of floor cells in the grown darkness area.
                bigrm_replace_terrain(ROOM, ICE, 100);
            }
        }
        await bigrm_common_tail();
    },
    3: async () => {
        bigrm_level_init_solidfill();
        bigrm_load_map(BIGRM_MAP_STRINGS[3], false);
        bigrm_region(1, 1, 73, 16, true);
        if (percent(66)) {
            lua_random1(4);                     // choice = terrains[math.random(1,4)]
            // selection.match("[.w.]") then des.terrain — no per-cell rng
        }
        // 15 obj, 6 traps, then EXPLICIT monsters (no random monster rng)
        bigrm_stair(true); bigrm_stair(false);
        for (let i = 0; i < 15; i++) bigrm_object();
        for (let i = 0; i < 6; i++) await bigrm_trap();
        // 28 des.monster({x,y}) at fixed coords -> each: induced_align rn2(3)
        // + makemon(NULL) at given coord (no get_location rng).
        for (let i = 0; i < 28; i++) {
            rn2(3);
            makemon(null, gx.xstart, gy.ystart, 0);
        }
    },
    4: async () => {
        bigrm_level_init_solidfill();
        bigrm_load_map(BIGRM_MAP_STRINGS[4], false);
        // terrains = {".",".",".",".","P","L","-","T","W","Z"}; tidx=random(1,10);
        // if (terrains[tidx] ~= "L") des.replace_terrain({fromterrain="L",
        // toterrain=terrains[tidx]}) — whole-map, rn2(100) per "L" cell.
        const t4 = lua_random1(10);
        const TERR4 = [ROOM, ROOM, ROOM, ROOM, POOL, LAVAPOOL, HWALL, TREE, WATER, LAVAWALL];
        const to4 = TERR4[t4 - 1];
        if (to4 !== LAVAPOOL) bigrm_replace_terrain(LAVAPOOL, to4, 100);
        // des.feature fountains (no rng), region lit (no rng)
        bigrm_region(1, 1, 73, 16, true);
        await bigrm_common_tail();
    },
    5: async () => {
        bigrm_level_init_solidfill();
        bigrm_load_map(BIGRM_MAP_STRINGS[5], false);
        if (percent(25)) {
            // selection.match("."):percentage(2) -> rn2(100) per "." cell;
            // then percent(50) for the I-or-C choice; then replace over grown.
            // The percentage(2) selection draws one rn2(100) per floor cell.
            bigrm_replace_terrain(ROOM, ROOM, 2);   // consume rn2(100)/floor cell
            percent(50);
        }
        bigrm_region(0, 0, 72, 18, true);
        await bigrm_common_tail();
    },
    6: async () => {
        bigrm_level_init_solidfill();
        bigrm_load_map(BIGRM_MAP_STRINGS[6], false);
        bigrm_region(1, 1, 72, 17, true);
        await bigrm_common_tail();
    },
    7: async () => {
        bigrm_level_init_solidfill();
        bigrm_load_map(BIGRM_MAP_STRINGS[7], false);
        const t7 = lua_random1(4);              // tidx = math.random(1,#terrain=4)
        // des.replace_terrain({region={0,0,74,18}, fromterrain="L", toterrain=
        // terrain[tidx]}) — terrain = {"L","T","{","."}.  rn2(100) per "L" cell
        // (chance default 100).  tidx==1 -> "L" (no visible change) but the
        // rn2(100) per cell is still consumed.
        const to7 = [LAVAPOOL, TREE, FOUNTAIN, ROOM][t7 - 1];
        bigrm_replace_terrain(LAVAPOOL, to7, 100);
        bigrm_region(1, 1, 73, 17, true);
        await bigrm_common_tail();
    },
    8: async () => {
        bigrm_level_init_solidfill();
        bigrm_load_map(BIGRM_MAP_STRINGS[8], false);
        if (percent(40)) {
            // terrain = {"L","}","T",".","-","C"}; tidx=random(1,6);
            // des.replace_terrain({region={0,0,74,17}, fromterrain="F",
            // toterrain=terrain[tidx]}) — rn2(100) per "F" cell.
            const t8 = lua_random1(6);
            const TERR8 = [LAVAPOOL, MOAT, TREE, ROOM, HWALL, CLOUD];
            bigrm_replace_terrain(IRONBARS /*F*/, TERR8[t8 - 1], 100);
        }
        bigrm_region(1, 1, 73, 16, true);
        await bigrm_common_tail();
    },
    9: async () => {
        bigrm_level_init_solidfill();
        bigrm_load_map(BIGRM_MAP_STRINGS[9], false);
        bigrm_region(0, 0, 73, 18, false);      // unlit
        bigrm_region(26, 4, 47, 14, true);
        bigrm_region(21, 5, 51, 13, true);
        bigrm_region(19, 6, 54, 12, true);
        await bigrm_common_tail();
    },
    10: async () => {
        // bigrm-10 has NO level_init solidfill before map? It does:
        // level_init solidfill, then map.
        bigrm_level_init_solidfill();
        bigrm_load_map(BIGRM_MAP_STRINGS[10], false);
        if (percent(40)) {
            lua_random1(5);                     // tidx = math.random(1,#terrain=5)
            bigrm_replace_terrain(CLOUD, ROOM, 5);   // chance=5 per "C" cell
            // second replace default chance -> rn2(100) per remaining "C" cell
            bigrm_replace_terrain(CLOUD, LAVAPOOL, 100);
        }
        bigrm_region(0, 0, 70, 18, true);
        // teleport_region: no rng. objects/traps/monsters, then mazewalk,
        // levregion stair-up, stair down.
        for (let i = 0; i < 15; i++) bigrm_object();
        for (let i = 0; i < 6; i++) await bigrm_trap();
        for (let i = 0; i < 28; i++) bigrm_monster();
        // des.mazewalk / des.levregion(stair-up) / des.stair("down")
        bigrm_stair(false);
    },
    11: async () => {
        // Boulder maze.  level_init style="maze", corrwid = 3 + nh.rn2(3),
        // wallthick=1, deadends = t_or_f() (percent(50)).
        const corrwid = 3 + rn2(3);             // nh.rn2(3)
        void corrwid;
        percent(50);                            // deadends = t_or_f()
        // create_maze would run here (LVLINIT_MAZE).  We do not fully port the
        // maze generator; fall back to a solid floor so the level is walkable.
        for (let y = 0; y < ROWNO; y++)
            for (let x = 0; x < COLNO; x++) {
                const loc = game.level?.at(x, y);
                if (loc) loc.typ = ROOM;
            }
        bigrm_region(0, 0, 75, 18, true);
        bigrm_stair(true); bigrm_stair(false);
        for (let i = 0; i < 15; i++) bigrm_object();
        for (let i = 0; i < 6; i++) await bigrm_trap(true);   // rolling boulder
        for (let i = 0; i < 28; i++) bigrm_monster();
    },
    12: async () => {
        // level_flags first (no rng), then level_init solidfill (rn2(2)).
        bigrm_level_init_solidfill();
        bigrm_load_map(BIGRM_MAP_STRINGS[12], false);
        if (percent(20)) {
            if (percent(50)) bigrm_replace_terrain(LAVAWALL, HWALL, 100);
            if (percent(50)) bigrm_replace_terrain(LAVAWALL /*Z*/, HWALL, 100);
        }
        if (percent(25)) {
            bigrm_replace_terrain(POOL, ROOM, 100);
            if (percent(75)) bigrm_replace_terrain(WATER, POOL, 100);
        }
        if (percent(25)) {
            bigrm_replace_terrain(LAVAPOOL, ROOM, 100);
            if (percent(75)) bigrm_replace_terrain(LAVAWALL, LAVAPOOL, 100);
        }
        if (percent(20)) {
            if (percent(50)) {
                bigrm_replace_terrain(POOL, LAVAPOOL, 100);
                bigrm_replace_terrain(WATER, LAVAWALL, 100);
            } else {
                bigrm_replace_terrain(LAVAPOOL, POOL, 100);
                bigrm_replace_terrain(LAVAWALL, WATER, 100);
            }
        }
        bigrm_region(0, 0, 75, 19, true);
        // non_diggable, wallify: no rng
        await bigrm_common_tail();
    },
    13: async () => {
        bigrm_level_init_solidfill();
        bigrm_load_map(BIGRM_MAP_STRINGS[13], false);
        lua_random1(8);                         // idx = math.random(1,#filters=8)
        // pillars placed via des.map calls — no extra rng (filter 6 uses
        // math.random per cell only if idx==6; approximate: idx selection only)
        bigrm_region(0, 0, 75, 18, true);
        await bigrm_common_tail();
    },
};

// Entry point.  C ref: makemaz("bigrm") -> rnd(13) + load_special("bigrm-N").
export async function makemaz_bigroom() {
    const g = game;
    const slev = (g.sp_levchn || []).find(
        (l) => g.bigroom_level && l.dlevel.dnum === g.bigroom_level.dnum
               && l.dlevel.dlevel === g.bigroom_level.dlevel);
    const rndlevs = slev?.rndlevs || 13;
    const variant = rnd(rndlevs);            // mkmaze.c:1136 rnd(sp->rndlevs)
    // load_special -> load_lua -> nhlib.lua top-level: shuffle(align)
    const align = ['law', 'neutral', 'chaos'];
    shuffle(align);                          // rn2(3), rn2(2)
    if (g.level?.flags) g.level.flags.is_maze_lev = true;
    // Enable the full (C-faithful) monster inventory/group/peace_minded path in
    // makemon for the duration of Big Room generation.  Outside this window
    // makemon keeps its conservative behavior, so other sessions' ordinary
    // level generation is unaffected.
    g._bigrm_gen = true;
    try {
        await bigrm_run(variant);
    } finally {
        g._bigrm_gen = false;
    }
}

const BIGRM_MAP_STRINGS = {
    1: `---------------------------------------------------------------------------
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
---------------------------------------------------------------------------`,
    2: `---------------------------------------------------------------------------
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
---------------------------------------------------------------------------`,
    3: `---------------------------------------------------------------------------
|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|..............---.......................................---..............|
|...............|.........................................|...............|
|.....|.|.|.|.|---|.|.|.|.|...................|.|.|.|.|.|---|.|.|.|.|.....|
|.....|--------   --------|...................|----------   --------|.....|
|.....|.|.|.|.|---|.|.|.|.|...................|.|.|.|.|.|---|.|.|.|.|.....|
|...............|.........................................|...............|
|..............---.......................................---..............|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|
---------------------------------------------------------------------------`,
    4: `-----------                                                     -----------
|.........|                                                     |.........|
|.........-------------                             -------------.........|
---...................------------       ------------...................---
  --.............................---------.............................--  
   --.................................................................--   
    --...............................................................--    
     --......LLLLL.......................................LLLLL......--     
      --.....LLLLL.......................................LLLLL.....--      
      --.....LLLLL.......................................LLLLL.....--      
     --......LLLLL.......................................LLLLL......--     
    --...............................................................--    
   --.................................................................--   
  --.............................---------.............................--  
---...................------------       ------------...................---
|.........-------------                             -------------.........|
|.........|                                                     |.........|
-----------                                                     -----------`,
    5: `                            ------------------                            
                    ---------................---------                    
              -------................................-------              
         ------............................................------         
      ----......................................................----      
    ---............................................................---    
  ---................................................................---  
---....................................................................---
|........................................................................|
|........................................................................|
|........................................................................|
---....................................................................---
  ---................................................................---  
    ---............................................................---    
      ----......................................................----      
         ------............................................------         
              -------................................-------              
                    ---------................---------                    
                            ------------------                            `,
    6: `     ---------         ---------         ---------         ---------     
   ---.......---     ---.......---     ---.......---     ---.......---   
  --...........--   --...........--   --...........--   --...........--  
 --.............-- --.............-- --.............-- --.............-- 
 -...............- -...............- -...............- -...............- 
--...............---...............---...............---...............--
|.................-.................-.................-.................|
|........T.................T.................T.................T........|
|.......................................................................|
|......T.{.....................................................{.T......|
|.......................................................................|
|........T.................T.................T.................T........|
|.................-.................-.................-.................|
--...............---...............---...............---...............--
 -...............- -...............- -...............- -...............- 
 --.............-- --.............-- --.............-- --.............-- 
  --...........--   --...........--   --...........--   --...........--  
   ---.......---     ---.......---     ---.......---     ---.......---   
     ---------         ---------         ---------         ---------     `,
    7: `                                                        -----              
                                                ---------...---            
                                        ---------.........L...---          
                                ---------.......................---        
                        ---------.................................---      
                ---------...........................................---    
        ---------.....................................................---  
---------...............................................................---
|.........................................................................|
|.L.....................................................................L.|
|.........................................................................|
---...............................................................---------
  ---.....................................................---------        
    ---...........................................---------                
      ---.................................---------                        
        ---.......................---------                                
          ---...L.........---------                                        
            ---...---------                                                
              -----                                                        `,
    8: `----------------------------------------------                             
|............................................---                           
--.............................................---                         
 ---......................................FF.....---                       
   ---...................................FF........---                     
     ---................................FF...........---                   
       ---.............................FF..............---                 
         ---..........................FF.................---               
           ---.......................FF....................---             
             ---....................FF.......................---           
               ---.................FF..........................---         
                 ---..............FF.............................---       
                   ---...........FF................................----    
                     ---........FF...................................---   
                       ---.....FF......................................--- 
                         ---.............................................--
                           ---............................................|
                             ----------------------------------------------`,
    9: `}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}
}}}}}}}}}}}}}}}}}}}}}}}}}}}}}................}}}}}}}}}}}}}}}}}}}}}}}}}}}}}
}}}}}}}}}}}}}}}}}}}}}................................}}}}}}}}}}}}}}}}}}}}}
}}}}}}}}}}}}}}}............................................}}}}}}}}}}}}}}}
}}}}}}}}}}......................................................}}}}}}}}}}
}}}}}}}............................................................}}}}}}}
}}}}}.......................LLLLLLLLLLLLLLLLLL.......................}}}}}
}}}....................LLLLLLLLLLLLLLLLLLLLLLLLLLL.....................}}}
}....................LLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL....................}
}....................LLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL....................}
}....................LLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL....................}
}}}....................LLLLLLLLLLLLLLLLLLLLLLLLLLL.....................}}}
}}}}}.......................LLLLLLLLLLLLLLLLLL.......................}}}}}
}}}}}}}............................................................}}}}}}}
}}}}}}}}}}......................................................}}}}}}}}}}
}}}}}}}}}}}}}}}............................................}}}}}}}}}}}}}}}
}}}}}}}}}}}}}}}}}}}}}................................}}}}}}}}}}}}}}}}}}}}}
}}}}}}}}}}}}}}}}}}}}}}}}}}}}}................}}}}}}}}}}}}}}}}}}}}}}}}}}}}}
}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}`,
    10: `.......................................................................
.......................................................................
.......................................................................
.......................................................................
...C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C...
...CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC...
...C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C...
...CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC...
...C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C...
...CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC...
...C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C...
...CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC...
...C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C...
...CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC...
...C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C...
.......................................................................
.......................................................................
.......................................................................
.......................................................................`,
    11: null,
    12: `                                                                           
         .......................           .......................         
        .........................         .........................        
       ...........................       ...........................       
      .............................     .............................      
     ........PPPPPPPPPPPPPPP........   ........LLLLLLLLLLLLLLL........     
    ........PPPPPPPPPPPPPPPPP........ ........LLLLLLLLLLLLLLLLL........    
   ........PPPWWWWWWWWWWWWWPPP...............LLLZZZZZZZZZZZZZLLL........   
  ........PPPWWWWWWWWWWWWWWWPPP.............LLLZZZZZZZZZZZZZZZLLL........  
 ........PPPWWWWWWWWWWWWWWWWWPPP...........LLLZZZZZZZZZZZZZZZZZLLL........ 
  ........PPPWWWWWWWWWWWWWWWPPP.............LLLZZZZZZZZZZZZZZZLLL........  
   ........PPPWWWWWWWWWWWWWPPP...............LLLZZZZZZZZZZZZZLLL........   
    ........PPPPPPPPPPPPPPPPP........ ........LLLLLLLLLLLLLLLLL........    
     ........PPPPPPPPPPPPPPP........   ........LLLLLLLLLLLLLLL........     
      .............................     .............................      
       ...........................       ...........................       
        .........................         .........................        
         .......................           .......................         
                                                                           `,
    13: `---------------------------------------------------------------------------
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
---------------------------------------------------------------------------`,
};
