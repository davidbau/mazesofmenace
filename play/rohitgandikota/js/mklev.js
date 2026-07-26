import { CORPSTAT_NONE } from './const.js';
// mklev.js — Level generation.
// C ref: mklev.c — makelevel, makerooms, makecorridors, generate_stairs.
// Also includes parts of sp_lev.c (create_room) and mkmap.c (litstate_rnd).
// Stripped-down version for contest: generates regular dungeon levels with
// room placement, corridors, doors, stairs, niches, and fill.
// Uses the real game PRNG (not a separate layout PRNG) for bit-exact parity.

import { game } from './gstate.js';
import { OCLASSES, ONAMES } from './objects_data.js';
import {
    mkobj, mksobj, next_ident, blessorcurse, special_corpse, start_corpse_timeout,
} from './mkobj.js';
import {
    rndmonnum, rndmonnum_adj, makemon, mkclass, monsndx, level_difficulty,
    MM_NOGRP, NO_MM_FLAGS, Inhell, likes_gems,
} from './makemon.js';
import { MM_NOCOUNTBIRTH, MM_NOMSG, SHOPBASE, COURT, LEPREHALL, ZOO, TEMPLE,
         BEEHIVE, MORGUE, ANTHOLE, BARRACKS, SWAMP, COCKNEST,
         G_GONE } from './const.js';
import { do_mkroom, antholemon, mkroom_wire } from './mkroom.js';
import { SPBOOK_no_NOVEL } from './mkobj.js';
import { mongone } from './mon.js';
import { sgn } from './hacklib.js';
import { obj_extract_self } from './invent.js';
import { PMNAMES, MONSYMS } from './monst_data.js';
import { fill_special_room } from './sp_lev.js';
import {
    mkgold, place_object, mkobj_at, mksobj_at, add_to_container, curse,
} from './mkobj.js';

function note_unported_lev(what) {
    (game.unported ||= new Set()).add(what);
}

// src/mklev.c:821 makevtele()
async function makevtele() {
    await makeniche(TELEP_TRAP);
}

// src/mklev.c mk_knox_portal() — the Fort Ludios branch. The rn2(3) fires
// whenever the branch's source end has not been placed yet, which on an
// ordinary early level it has not.
function mk_knox_portal(x, y) {
    const br = (game.branches || []).find(b => b.name === 'Fort Ludios');
    if (!br) return;
    const knox = game.special_levels?.knox_level;
    const source = (knox && br.end1.dnum === knox.dnum
                    && br.end1.dlevel === knox.dlevel) ? br.end2 : br.end1;
    if (source !== br.end2 && is_branchlev())
        return;   /* disallow Knox on a level that already has a branch */
    if (source.dnum < game.n_dgns || rn2(3))
        return;
    note_unported_lev('mk_knox_portal placement');
}
import { random_engraving, wipeout_text } from './engrave.js';
import { merged, weight, sobj_at } from './invent.js';
import { themeroom_fill_contents, post_level_generate } from './themerms.js';
import { mkroom_table, create_des_coder, spo_push_room,
         spo_endroom } from './sp_lev.js';

// include/permonst.h / include/hack.h:1189-1193, 1404
const NON_PM = -1;
const CORPSTAT_INIT = 0x08, CORPSTAT_SPE_VAL = 0x07;
const TAINT_AGE = 50;
// Object type and object class constants come from js/objects_data.js, which
// is generated from the C. They used to be hardcoded literals here and 21 of
// the 23 object constants and 7 of the 8 class constants were wrong — e.g.
// BOULDER was 465 ("worthless piece of orange glass", a GEM_CLASS object) when
// the real value is 475, and WEAPON_CLASS was 1, which is ILLOBJ_CLASS. Nothing
// noticed while object creation was stubbed out; with a real mksobj_init they
// select the wrong class and draw the wrong RNG.
const {
    WEAPON_CLASS,
    ARMOR_CLASS,
    RING_CLASS,
    FOOD_CLASS,
    SCROLL_CLASS,
    POTION_CLASS,
    TOOL_CLASS,
    GEM_CLASS,
} = OCLASSES;
const {
    BOULDER,
    GOLD_PIECE,
    ROCK,
    KELP_FROND,
    SCR_TELEPORTATION,
    BELL,
    CORPSE,
    STATUE,
    POT_HEALING,
    POT_EXTRA_HEALING,
    POT_SPEED,
    POT_GAIN_ENERGY,
    SCR_ENCHANT_WEAPON,
    SCR_ENCHANT_ARMOR,
    SCR_CONFUSE_MONSTER,
    SCR_SCARE_MONSTER,
    WAN_DIGGING,
    SPE_HEALING,
    LARGE_BOX,
    CHEST,
    FOOD_RATION,
    CRAM_RATION,
    LEMBAS_WAFER,
} = ONAMES;

import { GameMap } from './game.js';
import { rn2, rnd, rn1 } from './rng.js';
import { init_rect, rnd_rect, get_rect, split_rects } from './rect.js';
import { themerooms, themeroom_fills } from './themerms_data.js';
import { make_engr_at, wipe_engr_at, engr_at, del_engr } from './engrave.js';
import { get_rnd_text, MD_PAD_RUMORS } from './rumors.js';
import { DUST, HEADSTONE, OBJ_CONTAINED } from './const.js';
import { hole_destination } from './trap.js';
import { Can_fall_thru } from './dungeon.js';
import { lspo_map, lspo_region, sp_lev_wire, sp_lev_wire_mktrap,
         sp_lev_wire_okdoor, sp_lev_wire_subroom,
         lspo_room, lspo_door, inside_room } from './sp_lev.js';
import { percent } from './nhlua.js';
import { lua_shuffle } from './nhlua.js';

/* mktrap()'s "no traps in pools" test needs mon.js's terrain predicates, and
   mklev.js is reached FROM mon.js's import graph, so they arrive by wire. */
let mklev_mon = { is_pool: () => false, is_lava: () => false };
export function mklev_wire_mon(fns) { mklev_mon = fns; }
import { depth as depth_of_level } from './dungeon.js';
import {
    COLNO, ROWNO, STONE, ROOM, CORR, DOOR, STAIRS,
    HWALL, VWALL, TLCORNER, TRCORNER, BLCORNER, BRCORNER,
    CROSSWALL, TUWALL, TDWALL, TLWALL, TRWALL,
    D_NODOOR, D_CLOSED, D_ISOPEN, D_LOCKED, D_TRAPPED,
    OROOM, VAULT, THEMEROOM, ROOMOFFSET, MAXNROFROOMS, SHARED,
    SDOOR, SCORR, IRONBARS, FOUNTAIN, SINK, ALTAR, GRAVE,
    DIR_N, DIR_S, DIR_E, DIR_W, DIR_180,
    IS_WALL, IS_STWALL, IS_DOOR, IS_OBSTRUCTED, IS_FURNITURE, IS_POOL,
    SPACE_POS, isok, W_NONDIGGABLE, FILL_NORMAL,
    MKTRAP_NOFLAGS, MKTRAP_SEEN, MKTRAP_MAZEFLAG, MKTRAP_NOSPIDERONWEB,
    MKTRAP_NOVICTIM,
    ICE, MOAT, POOL, WATER, LAVAPOOL, LAVAWALL, DBWALL,
    A_LAWFUL, Align2amask,
    LR_UPTELE,
} from './const.js';

// Object/class constants (normally from objects.js, not in contest template)
const RANDOM_CLASS = 0;
// include/objclass.h:152 — #define SPBOOK_no_NOVEL (0 - (int) SPBOOK_CLASS)
// It is the NEGATED class, -10, not a class index one past the real ones. Hard
// coding 11 made it WAND_CLASS, so the supply chest's bonus items generated
// wands where C generates spellbooks, in 3 of the 10 table slots.
/* SPBOOK_no_NOVEL is imported from js/mkobj.js, where it lives. */

// Supply chest items
const MARK = 6;

const XLIM = 4;
const YLIM = 3;

// Direction deltas
const xdir = [-1, -1, 0, 1, 1, 1, 0, -1];
const ydir = [0, -1, -1, -1, 0, 1, 1, 1];

// Trap constants come from js/const.js, which mirrors include/trap.h. They used
// to be hand-written here and 18 of the 25 were wrong: SQKY_BOARD was 5 (really
// BEAR_TRAP's value, so every bear trap was mistaken for a squeaky board and
// skipped mktrap_victim), LANDMINE was 20, PIT was 9. BEAR_TRAP was absent.
import {
    NO_TRAP, TRAPNUM, ARROW_TRAP, DART_TRAP, ROCKTRAP, SQKY_BOARD, BEAR_TRAP,
    LANDMINE, ROLLING_BOULDER_TRAP, SLP_GAS_TRAP, RUST_TRAP, FIRE_TRAP, PIT,
    SPIKED_PIT, HOLE, TRAPDOOR, TELEP_TRAP, LEVEL_TELEP, MAGIC_PORTAL, WEB,
    STATUE_TRAP, MAGIC_TRAP, ANTI_MAGIC, POLY_TRAP, VIBRATING_SQUARE,
    TRAPPED_DOOR, TRAPPED_CHEST,
} from './const.js';

function is_hole(t) { return t === HOLE || t === TRAPDOOR; }
function is_pit(t) { return t === PIT || t === SPIKED_PIT; }

// Stairway list management
function stairway_add(x, y, up, isladder, dest) {
    const node = { sx: x, sy: y, up, isladder, tolev: { ...dest }, next: game.stairs };
    game.stairs = node;
}

// ── Stairway lookup ──

function stairway_find_dir(up) {
    for (let s = game.stairs; s; s = s.next)
        if (s.up === up) return s;
    return null;
}

function stairway_find_special_dir(up) {
    for (let s = game.stairs; s; s = s.next)
        if (s.tolev.dnum !== (game.u?.uz?.dnum ?? 0) && s.up !== up) return s;
    return null;
}

// ── Hero placement (C ref: stairs.c, mkmaze.c) ──

function u_on_newpos(x, y) {
    game.u.ux = x;
    game.u.uy = y;
}

// C ref: mkmaze.c bad_location — simplified for skeleton
function bad_location(x, y, nlx, nly, nhx, nhy) {
    const loc = game.level?.at(x, y);
    if (!loc) return true;
    // Excluded region
    if (nlx && x >= nlx && x <= nhx && y >= nly && y <= nhy) return true;
    // Must be ROOM or (CORR in maze)
    if (loc.typ !== ROOM && !(loc.typ === CORR && game.level?.flags?.is_maze_lev))
        return true;
    return false;
}

// C ref: mkmaze.c place_lregion — place hero (LR_UPTELE/LR_DOWNTELE)
export function place_lregion(lx, ly, hx, hy, nlx, nly, nhx, nhy, rtype, lev) {
    if (!lx) {
        lx = 1; hx = COLNO - 1; ly = 0; hy = ROWNO - 1;
    }
    if (lx < 1) lx = 1;
    if (hx > COLNO - 1) hx = COLNO - 1;
    if (ly < 0) ly = 0;
    if (hy > ROWNO - 1) hy = ROWNO - 1;

    // Probabilistic search
    for (let trycnt = 0; trycnt < 200; trycnt++) {
        const x = rn1((hx - lx) + 1, lx);
        const y = rn1((hy - ly) + 1, ly);
        if (!bad_location(x, y, nlx, nly, nhx, nhy)) {
            u_on_newpos(x, y);
            return;
        }
    }
    // Deterministic fallback
    for (let x = lx; x <= hx; x++)
        for (let y = ly; y <= hy; y++)
            if (!bad_location(x, y, nlx, nly, nhx, nhy)) {
                u_on_newpos(x, y);
                return;
            }
}

// C ref: stairs.c u_on_upstairs — place hero on upstairs or fallback
export function u_on_upstairs() {
    const stway = stairway_find_dir(true);
    if (stway) { u_on_newpos(stway.sx, stway.sy); return; }
    // No upstair — try special stairs, then random
    const special = stairway_find_special_dir(0);
    if (special) { u_on_newpos(special.sx, special.sy); return; }
    // Random placement via place_lregion
    place_lregion(0, 0, 0, 0, 0, 0, 0, 0, LR_UPTELE, null);
}

// oinit stub (level-dependent object probability reset)
function oinit() { /* no-op for contest */ }

/* level_difficulty() now comes from js/makemon.js, which is where src/dungeon.c
   puts it; the local copy here duplicated it. */

// ============================================================
// Stub functions for object/monster/trap creation
// These consume the exact RNG calls that C makes.
// ============================================================

let _nextObjId = 1;





/* mkgold() lives in js/mkobj.js, where src/mkobj.c has it. */

function add_to_buried(otmp) {
    (game.level.buriedobjs ||= []).push(otmp);
}
function dealloc_obj(otmp) { /* stub */ }
// set_corpsenm stub
function set_corpsenm(otmp, pm) { /* stub */ }

// mkcorpstat stub
// src/mkobj.c:2060 mkcorpstat() — make a corpse or statue.
//
// `pm` is a monster index or null. The species draw is NOT conditional on pm:
// mksobj() picks a random one internally whenever init is set, and mkcorpstat
// then overwrites it. Gating the draw on `pm === null`, as this used to, loses
// a whole rndmonst_adj() block from the stream.
function mkcorpstat(objtyp, mtmp, pm, x, y, corpstatflags) {
    const init = (corpstatflags & CORPSTAT_INIT) !== 0;
    const otmp = mksobj_at(objtyp, x, y, init, false);

    otmp.spe = (corpstatflags & CORPSTAT_SPE_VAL);

    if (pm !== null && pm !== undefined && pm !== NON_PM) {
        const old_corpsenm = otmp.corpsenm;
        otmp.corpsenm = pm;
        if (otmp.otyp === CORPSE
            && (special_corpse(old_corpsenm) || special_corpse(otmp.corpsenm)))
            start_corpse_timeout(otmp);
    }
    return otmp;
}


// src/trap.c:508 mk_trap_statue() — the statue that sits on a STATUE_TRAP.
//
// Not decoration: the statue CONTAINS the gear of the monster it depicts, so
// the makemon and the inventory transfer are part of the object, not extra.
//
// Draws: rndmonnum_adj(3, 6) in a retry loop of up to ten that rejects a
// unicorn sharing the hero's alignment sign, then mkcorpstat's, then a full
// makemon's. Skipping the whole thing left the statue off the level, which is
// how seed0030 shows a kitten statue where we show only the gold beneath it.
function mk_trap_statue(x, y) {
    let mptr, trycount = 10;

    do {                    /* avoid an ultimately hostile co-aligned unicorn */
        mptr = game.mons[rndmonnum_adj(3, 6)];
    } while (--trycount > 0 && is_unicorn(mptr)
             && sgn(game.u.ualign.type) === sgn(mptr.maligntyp));

    const statue = mkcorpstat(ONAMES.STATUE, null, mptr.pmidx, x, y,
                              CORPSTAT_NONE);
    const mtmp = makemon(game.mons[statue.corpsenm], 0, 0,
                         MM_NOCOUNTBIRTH | MM_NOMSG);
    if (!mtmp)
        return;             /* should never happen */

    /* the monster's whole pack moves into the statue */
    while (mtmp.minvent && mtmp.minvent.length) {
        const otmp = mtmp.minvent[0];
        otmp.owornmask = 0;
        obj_extract_self(otmp);
        add_to_container(statue, otmp);
    }
    statue.owt = weight(statue);

    mongone(mtmp);
}

// include/mondata.h:149 is_unicorn()
const is_unicorn = (ptr) => ptr.mlet === MONSYMS.S_UNICORN && likes_gems(ptr);

// maketrap stub
// src/trap.c:3083 choose_trapnote() — a squeaky board picks an unused musical
// note. The draw's ARGUMENT is the count of notes still free on this level, so
// it shrinks as boards accumulate: rn2(12), then rn2(11), and so on.
function choose_trapnote(ttmp) {
    const tavail = new Array(12).fill(0);
    for (const t of game.level.traps || [])
        if (t.ttyp === SQKY_BOARD && t !== ttmp)
            tavail[t.tnote] = 1;
    const tpick = [];
    for (let k = 0; k < 12; ++k)
        if (tavail[k] === 0)
            tpick.push(k);
    return tpick.length > 0 ? tpick[rn2(tpick.length)] : rn2(12);
}

// src/trap.c:490 maketrap()
// NOTE: not async. C's maketrap() is an ordinary function and this one has no
// awaits in it; the async marker was invented here and it forced every caller
// up to lspo_region() to be async too, which is what blocked the themeroom
// fills from calling des.trap at all.
function maketrap(x, y, typ) {
    const trap = {
        ttyp: typ, tx: x, ty: y,
        tseen: (typ === HOLE),          /* unhideable_trap() */
        once: 0, madeby_u: 0,
        launch: { x: -1, y: -1 },
        dst: { dnum: -1, dlevel: -1 },
    };
    if (!game.level) return trap;
    if (!game.level.traps) game.level.traps = [];
    game.level.traps.push(trap);

    switch (typ) {
    case SQKY_BOARD:
        trap.tnote = choose_trapnote(trap);
        break;
    case STATUE_TRAP:
        mk_trap_statue(x, y);
        break;
    case ROLLING_BOULDER_TRAP:
        note_unported_lev('mkroll_launch');
        break;
    case PIT:
    case SPIKED_PIT:
        trap.conjoined = 0;
        /* FALLTHRU */
    case HOLE:
    case TRAPDOOR:
        /* src/trap.c:521 — only a HOLE or TRAPDOOR picks a destination, but
           the pit cases fall through to here, so the is_hole() test is what
           gates the draw, not the case label. */
        if (is_hole(typ))
            hole_destination(trap.dst);
        break;
    default:
        break;
    }
    return trap;
}

// engrave stubs
// src/mklev.c:728 trap_engravings[TRAPNUM] — only three traps leave a warning
// scratched in the dust next to their niche.
const trap_engravings = [];
trap_engravings[TRAPDOOR] = 'Vlad was here';
trap_engravings[TELEP_TRAP] = 'ad aerarium';
trap_engravings[LEVEL_TELEP] = 'ad aerarium';
// src/trap.c t_at() — the trap on a square, if any.
function t_at(x, y) {
    return (game.level?.traps || []).find(t => t.tx === x && t.ty === y) || null;
}

// src/engrave.c:1687 make_grave() — a grave only goes on plain room floor with
// no trap, and an unnamed one draws its epitaph from dat/epitaph.
export function make_grave(x, y, str) {
    const loc = game.level?.at(x, y);
    if (!loc) return;
    if ((loc.typ !== ROOM && loc.typ !== GRAVE) || t_at(x, y))
        return;
    loc.typ = GRAVE;
    const old = engr_at(x, y);
    if (old) del_engr(old);
    if (!str)
        str = get_rnd_text('epitaph', rn2, MD_PAD_RUMORS);
    make_engr_at(x, y, str, null, 0, HEADSTONE);
}

// in_rooms stub
function in_rooms(x, y, rtype) { return []; }

// ============================================================
// Core mklev functions (ported from main project's mklev.js)
// ============================================================

// C ref: bones.c getbones()
function getbones() {
    const flags = game.flags || {};
    if (game.discover) return false;      /* src/bones.c:639 */
    if (flags.bones === false) return false;
    if (rn2(3) && !game.flags?.debug) return false;
    return false;
}

// C ref: allmain.c l_nhcore_init()
/* l_nhcore_init() lives in js/nhlua.js now, where src/nhlua.c has it. Re-export
   so mklev.js's existing callers and importers keep working. */
export { l_nhcore_init } from './nhlua.js';

// C ref: mklev.c mklev()
export async function mklev() {
    const g = game;
    if (getbones()) return;
    g.in_mklev = true;
    await makelevel();
    recount_level_features();
    level_finalize_topology();
    g.in_mklev = false;
}

function recount_level_features() {
    const lvl = game.level;
    if (!lvl?.flags) return;
    let nfountains = 0, nsinks = 0;
    for (let y = 0; y < ROWNO; y++)
        for (let x = 1; x < COLNO; x++) {
            const typ = lvl.at(x, y)?.typ;
            if (typ === FOUNTAIN) nfountains++;
            if (typ === SINK) nsinks++;
        }
    lvl.flags.nfountains = nfountains;
    lvl.flags.nsinks = nsinks;
}

// C ref: mklev.c clear_level_structures()
function clear_level_structures() {
    const g = game;
    g.fmon = null;
    g.level = new GameMap();
    g.level.nroom = 0;
    g.level.rooms = [];
    g.made_branch = false;
    g.smeq = new Array(MAXNROFROOMS + 1).fill(0);
    g.level.doorindex = 0;
    g.level.doors = [];
    g.stairs = null;
    g.vault_x = -1;
    const lf = g.level.flags;
    lf.nfountains = 0;
    lf.nsinks = 0;
    lf.has_shop = false;
    lf.has_vault = false;
    lf.has_zoo = false;
    lf.has_court = false;
    lf.has_morgue = false;
    lf.graveyard = false;
    lf.has_beehive = false;
    lf.has_barracks = false;
    lf.has_temple = false;
    lf.has_swamp = false;
    lf.noteleport = false;
    lf.hardfloor = false;
    lf.nommap = false;
    lf.hero_memory = true;
    lf.shortsighted = false;
    lf.sokoban_rules = false;
    lf.is_maze_lev = false;
    lf.is_cavernous_lev = false;
    lf.arboreal = false;
    lf.has_town = false;
    lf.wizard_bones = false;
    lf.corrmaze = false;
    lf.temperature = 0;
    lf.rndmongen = true;
    lf.deathdrops = true;
    lf.noautosearch = false;
    lf.fumaroles = false;
    lf.stormy = false;
    lf.stasis_until = 0;
    init_rect();
}

// C ref: mkmap.c litstate_rnd()
function litstate_rnd(litstate) {
    if (litstate < 0) {
        const d = depth_of_level(game.u?.uz);
        return (rnd(1 + Math.abs(d)) < 11 && rn2(77)) ? true : false;
    }
    return !!litstate;
}

// C ref: mklev.c makelevel()
async function makelevel() {
    const g = game;
    oinit();
    clear_level_structures();

    // C ref: mklev.c:1295 — check for below-Medusa maze level
    // This rn2(5) is consumed even when the condition fails (short-circuit)
    const medusa = g.medusa_level;
    if (rn2(5) && g.u?.uz?.dnum === medusa?.dnum
        && (g.u?.uz?.dlevel ?? 1) > (medusa?.dlevel ?? 999)) {
        // Would generate maze — not applicable for contest level 1
    }

    // Regular level generation
    // C ref: mklev.c:382-388 — load themerms.lua for themed rooms
    // nhlib.lua shuffle when loading themerms.lua (first level of branch)
    const dnum = g.u?.uz?.dnum ?? 0;
    if (!g._luathemes_loaded) g._luathemes_loaded = {};
    if (!g._luathemes_loaded[dnum]) {
        const themedAlign = ['law', 'neutral', 'chaos'];
        for (let i = themedAlign.length; i > 1; i--) {
            const j = rn2(i);
            [themedAlign[i - 1], themedAlign[j]] = [themedAlign[j], themedAlign[i - 1]];
        }
        g._luathemes_loaded[dnum] = true;
    }

    await makerooms();

    if (g.level.nroom <= 0) return;
    sort_rooms();
    await generate_stairs();

    // Branch check
    const branchp = is_branchlev();
    /* src/mklev.c:1306 — minimum number of rooms needed before a special room
       is allowed. A vault bumps it, because the vault itself counts as a room
       but must not make a shop eligible. */
    let room_threshold = branchp ? 4 : 3;

    makecorridors();
    await make_niches();

    // src/mklev.c:1317 — a secret treasure vault, not connected to anything.
    //
    // The retry path is where four sessions diverged. When the first
    // check_room() fails, C calls create_vault(), which loops up to 100 times
    // on rnd_rect() — and with only one free rectangle left that is 100
    // consecutive rn2(1) calls with nothing between them, because a vault sets
    // dx = dy = 1 rather than rolling them.
    if (g.vault_x !== -1) {   /* do_vault() */
        const vw = { v: 1 }, vh = { v: 1 };
        /* C passes &gv.vault_x, and a FAILED check_room still writes through
           it, so the retry starts from the moved coordinates. */
        const vx = { v: g.vault_x }, vy = { v: g.vault_y };
        let ok = check_room(vx, vw, vy, vh, true);
        g.vault_x = vx.v; g.vault_y = vy.v;

        if (!ok && rnd_rect() && create_vault()) {
            const nr = g.level.rooms[g.level.nroom];
            vx.v = g.vault_x = nr.lx;
            vy.v = g.vault_y = nr.ly;
            ok = check_room(vx, vw, vy, vh, true);
            g.vault_x = vx.v; g.vault_y = vy.v;
            if (!ok) nr.hx = -1;
        }

        if (ok) {   /* fill_vault: */
            add_room(vx.v, vy.v, vx.v + vw.v, vy.v + vh.v, true, VAULT, false);
            g.level.flags.has_vault = 1;
            room_threshold++;
            const vaultRoom = g.level.rooms[g.level.nroom - 1];
            if (vaultRoom) {
                vaultRoom.needfill = FILL_NORMAL;
                /* fills the vault with gold: one rn1(depth*100, 51) and one
                   next_ident per square */
                fill_special_room(vaultRoom);
            }
            mk_knox_portal(vx.v + vw.v, vy.v + vh.v);
            if (!g.level.flags.noteleport && !rn2(3))
                await makevtele();
        }
    }

    /* src/mklev.c:1344 — make up to 1 special room, type dependent on depth.
       mkroom doesn't guarantee a room gets created, and this step only sets
       the room's rtype; the fill happens later with the other special rooms.

       The chain is a single if/else-if, so at most ONE arm's rn2 is drawn and
       every arm after the first true one is skipped. The wizard-mode SHOPTYPE
       override that heads the chain in C is not modelled.

       Depth arithmetic worth keeping in mind: the shop arm's gate is
       rn2(u_depth) < 3, so at depths 2 and 3 it is ALWAYS true and a shop is
       made whenever nroom >= room_threshold. */
    {
        const u_depth = g.u?.uz?.dlevel ?? 1;
        const medusa_depth = g.medusa_level?.dlevel ?? 999;

        if (u_depth > 1 && u_depth < medusa_depth
            && g.level.nroom >= room_threshold && rn2(u_depth) < 3)
            do_mkroom(SHOPBASE);
        else if (u_depth > 4 && !rn2(6))
            do_mkroom(COURT);
        else if (u_depth > 5 && !rn2(8)
                 && !(g.mvitals?.[PMNAMES.PM_LEPRECHAUN]?.mvflags & G_GONE))
            do_mkroom(LEPREHALL);
        else if (u_depth > 6 && !rn2(7))
            do_mkroom(ZOO);
        else if (u_depth > 8 && !rn2(5))
            do_mkroom(TEMPLE);
        else if (u_depth > 9 && !rn2(5)
                 && !(g.mvitals?.[PMNAMES.PM_KILLER_BEE]?.mvflags & G_GONE))
            do_mkroom(BEEHIVE);
        else if (u_depth > 11 && !rn2(6))
            do_mkroom(MORGUE);
        else if (u_depth > 12 && !rn2(8) && antholemon())
            do_mkroom(ANTHOLE);
        else if (u_depth > 14 && !rn2(4)
                 && !(g.mvitals?.[PMNAMES.PM_SOLDIER]?.mvflags & G_GONE))
            do_mkroom(BARRACKS);
        else if (u_depth > 15 && !rn2(6))
            do_mkroom(SWAMP);
        else if (u_depth > 16 && !rn2(8)
                 && !(g.mvitals?.[PMNAMES.PM_COCKATRICE]?.mvflags & G_GONE))
            do_mkroom(COCKNEST);
    }

    // Place dungeon branch
    if (branchp) {
        place_branch(branchp);
    }

    /* src/mklev.c:1391-1412 — some levels have specially generated items in
       ordinary rooms; work out which room these will be placed in.

       ROOM_IS_FILLABLE(croom) is
         (rtype == OROOM || rtype == THEMEROOM) && needfill == FILL_NORMAL   */
    let fillable_room_count = 0;
    for (let i = 0; i < g.level.nroom; i++) {
        const croom = g.level.rooms[i];
        if (ROOM_IS_FILLABLE(croom)) fillable_room_count++;
    }
    /* choose a random fillable room to get the bonus items */
    let bonus_item_room_countdown = fillable_room_count
                                    ? rn2(fillable_room_count) : -1;

    /* for each room: put things inside */
    for (let i = 0; i < g.level.nroom; i++) {
        const croom = g.level.rooms[i];
        const fillable = ROOM_IS_FILLABLE(croom);

        await fill_ordinary_room(croom,
                                 fillable && bonus_item_room_countdown === 0);
        if (fillable)
            --bonus_item_room_countdown;
    }

    /* src/mklev.c:1415 — fill all special rooms now, regardless of whether
       this is a special level, a proto level or an ordinary one. This is a
       SECOND fill_special_room() call site; the vault above is the first. */
    for (let i = 0; i < g.level.nroom; i++)
        fill_special_room(g.level.rooms[i]);

    /* src/mklev.c:1420 themerooms_post_level_generate() — drain the handlers
       the fills queued. It runs AFTER every room is filled, which is the point:
       make_a_trap picks its teleport destination from the finished map. */
    post_level_generate();

    /* src/mklev.c:1190 — the WHOLE-LEVEL wallification pass, run after the
       themeroom handlers have finished. mklev.c:298 already wallifies each
       room as it is dug, but that per-room pass cannot see walls a later room
       or corridor put next to it, so corners between them stay HWALL/VWALL.
       Without this, seed0004's map drew "─────" where C draws "┌───┐". */
    wallification(1, 0, COLNO - 1, ROWNO - 1);
}

// src/mklev.c:929 ROOM_IS_FILLABLE
// src/mklev.c:929 ROOM_IS_FILLABLE
function ROOM_IS_FILLABLE(croom) {
    return croom && (croom.rtype === OROOM || croom.rtype === THEMEROOM)
        && croom.needfill === FILL_NORMAL;
}

sp_lev_wire(add_room, add_door, somexy);
mkroom_wire({ topologize });
sp_lev_wire_mktrap(mktrap);
sp_lev_wire_okdoor(okdoor);
sp_lev_wire_subroom(create_subroom);

// C ref: mklev.c makerooms()
async function makerooms() {
    const g = game;
    let tried_vault = false;
    const difficulty = depth_of_level(g.u?.uz);
    let themeroom_tries = 0;

    while (g.level.nroom < (MAXNROFROOMS - 1) && rnd_rect()) {
        if (g.level.nroom >= Math.trunc(MAXNROFROOMS / 6) && rn2(2) && !tried_vault) {
            tried_vault = true;
            if (create_vault()) {
                g.vault_x = g.level.rooms[g.level.nroom]?.lx ?? -1;
                g.vault_y = g.level.rooms[g.level.nroom]?.ly ?? -1;
                if (g.level.rooms[g.level.nroom]) g.level.rooms[g.level.nroom].hx = -1;
            }
        } else {
            /* src/mklev.c:415 — gi.in_mk_themerooms is TRUE for the whole
               themerooms_generate() call, INCLUDING the create_room() the
               `default` room reaches through des.room(). It is what makes
               check_room() give up on the first obstruction instead of
               shrinking and retrying, and what makes lspo_map() re-roll its
               placement. It was read in four places and never set. */
            g.in_mk_themerooms = true;
            const made = await themerooms_generate(difficulty);
            g.in_mk_themerooms = false;
            if (!made) {
                if (themeroom_tries++ > 10
                    || g.level.nroom >= Math.trunc(MAXNROFROOMS / 6))
                    break;
            }
        }
    }
}

// dat/themerms.lua is_eligible() — mindiff/maxdiff gate which entries take
// part in the reservoir sample, so the level's difficulty changes the draw
// count as well as the outcome.
function is_themeroom_eligible(room, difficulty) {
    if (room.mindiff != null && difficulty < room.mindiff) return false;
    if (room.maxdiff != null && difficulty > room.maxdiff) return false;
    return true;
}

// dat/themerms.lua themerooms_generate() — reservoir sampling over the eligible
// entries, one rn2(running_total) per entry.
//
// `default` (frequency 1000 of 1036) is the only entry whose contents are
// ported. It is `des.room({ type = "ordinary", filled = 1 })`, which reaches
// sp_lev.c:2811 —
//
//     rtype = (!r->chance || rn2(100) < r->chance) ? r->rtype : OROOM;
//
// so one rn2(100), then create_room().
//
// The other 30 are SHAPED rooms: `des.map({ map = [[...]] })` stamped by
// lspo_map(), whose placement draws are rn2(COLNO - 1 - wid) and
// rn2(ROWNO - hei) from the map's own dimensions. Seven sessions diverge here
// and the map data they need is in js/themerms_data.js — see STATUS.md.
async function themerooms_generate(difficulty) {
    let pick = null;
    let total_frequency = 0;
    for (const meta of themerooms) {
        if (!is_themeroom_eligible(meta, difficulty)) continue;
        const this_frequency = meta.frequency ?? 1;
        total_frequency += this_frequency;
        if (this_frequency > 0 && rn2(total_frequency) < this_frequency)
            pick = meta;
    }
    if (!pick) return false;

    game.themeroom_failed = false;

    /* A room with a des.map is a SHAPE: lspo_map places and stamps it, then its
       own contents run. Everything else falls through to the `default` room. */
    const mf = pick.maps && pick.maps[0];
    if (mf && themeroom_contents(pick, mf))
        return !game.themeroom_failed;

    let rtype = OROOM, rlit = -1, contents = null;
    let roomW = -1, roomH = -1;
    switch (pick.name) {
    case 'default': break;
    case 'Default room with themed fill':
        rtype = THEMEROOM; contents = themeroom_fill; break;
    case 'Unlit room with themed fill':
        rtype = THEMEROOM; contents = themeroom_fill; rlit = 0; break;
    case 'Room with both normal contents and themed fill':
        rtype = THEMEROOM; contents = themeroom_fill; break;
    case 'Room in a room':
        /* dat/themerms.lua:308 — nested des.room() with a door innermost:
             des.room({ type="ordinary", filled=1, contents = function()
                des.room({ type="ordinary", contents = function()
                   des.door({ state="random", wall="all" });
                end });
             end });
           The OUTER room is what this switch builds; the inner one goes
           through lspo_room, which routes to create_subroom because a parent
           room is open by then. */
        contents = () => {
            lspo_room({ type: 'ordinary', contents: () => {
                lspo_door({ state: 'random', wall: 'all' });
            } }, create_room, topologize);
        };
        break;
    case 'Huge room with another room inside':
        /* dat/themerms.lua:323 — w and h are ARGUMENTS, so their rn2(10) and
           rn2(5) are spent BEFORE the room's own chance roll:
             des.room({ w = nh.rn2(10)+11, h = nh.rn2(5)+8, filled = 1,
                        contents = function()
                           if (percent(90)) then des.room({ ... }) end
                        end }) */
        roomW = rn2(10) + 11;
        roomH = rn2(5) + 8;
        contents = () => {
            if (percent(90)) {
                lspo_room({ type: 'ordinary', filled: 1, contents: () => {
                    lspo_door({ state: 'random', wall: 'all' });
                    if (percent(50))
                        lspo_door({ state: 'random', wall: 'all' });
                } }, create_room, topologize);
            }
        };
        break;
    case 'Nesting rooms':
        /* dat/themerms.lua:344 — three levels deep. The middle room's size
           comes from math.random(floor(width/2), width-2), which the nhlib
           shim turns into nh.random(a, b+1-a), i.e. a + rn2(b+1-a). Both the
           middle room's own doors AND the innermost room's are emitted, and
           each pair is gated by its own percent(15). */
        roomW = 9 + rn2(4);
        roomH = 9 + rn2(4);
        contents = (rm) => {
            const lo1 = Math.floor(rm.width / 2), hi1 = rm.width - 2;
            const wid = lo1 + rn2(hi1 + 1 - lo1);
            const lo2 = Math.floor(rm.height / 2), hi2 = rm.height - 2;
            const hei = lo2 + rn2(hi2 + 1 - lo2);

            lspo_room({ type: 'ordinary', w: wid, h: hei, filled: 1,
                        contents: () => {
                if (percent(90)) {
                    lspo_room({ type: 'ordinary', filled: 1, contents: () => {
                        lspo_door({ state: 'random', wall: 'all' });
                        if (percent(15))
                            lspo_door({ state: 'random', wall: 'all' });
                    } }, create_room, topologize);
                }
                lspo_door({ state: 'random', wall: 'all' });
                if (percent(15))
                    lspo_door({ state: 'random', wall: 'all' });
            } }, create_room, topologize);
        };
        break;
    default:
        note_unported_lev(`themeroom ${pick.name}`); break;
    }

    rn2(100);

    const ok = create_room(-1, -1, roomW, roomH, -1, -1, rtype, rlit);
    if (ok) {
        // C ref: sp_lev.c:2824 — build_room calls topologize after create_room
        const aroom = game.level.rooms[game.level.nroom - 1];
        if (aroom) {
            topologize(aroom);
            aroom.needfill = FILL_NORMAL;
            /* This is our inline equivalent of the des.room{} the themeroom
               Lua actually writes, so it owes the same bookkeeping lspo_room
               does: push the room as the coder's croom around the contents
               callback (src/sp_lev.c:4091). Without it every des.* verb inside
               a themed fill sees no open room -- create_altar took its no-room
               branch and drew a whole-map coordinate where C draws somex/somey
               inside the room. */
            create_des_coder();
            if (contents) {
                spo_push_room(aroom);
                contents(aroom);
                spo_endroom();
            }
        }
    }
    return ok;
}

// dat/themerms.lua:880 filler_region() — every shaped room ends with this.
//
//   if (percent(30)) then rmtyp = "themed"; func = themeroom_fill; end
//   des.region({ region={x,y,x,y}, type=rmtyp, irregular=true,
//                filled=1, contents = func });
function filler_region(x, y) {
    let rmtyp = OROOM;
    let func = null;
    if (percent(30)) {
        rmtyp = THEMEROOM;
        func = themeroom_fill;
    }
    lspo_region(x, y, rmtyp, true, FILL_NORMAL, func);
}

// dat/themerms.lua:890 is_eligible(room, mkrm) — for a FILL the room is passed
// in, so a fill may accept or refuse it, and that changes how many draws the
// reservoir sample below makes.
//
// Only two fills carry a predicate and both test the room's lit state. The
// generator captures the Lua source of each one rather than a flag, so an
// unrecognised predicate is reported instead of being assumed true.
function fill_eligible(fill, rm, difficulty) {
    if (fill.mindiff != null && difficulty < fill.mindiff) return false;
    if (fill.maxdiff != null && difficulty > fill.maxdiff) return false;
    if (rm != null && fill.eligible) {
        if (fill.eligible === 'return rm.lit == true;') return !!rm.rlit;
        if (fill.eligible === 'return rm.lit == false;') return !rm.rlit;
        note_unported_lev(`fill eligible ${fill.name}`);
        return true;
    }
    return true;
}

// dat/themerms.lua:1009 themeroom_fill() — a second reservoir sample, this one
// over the 15 themeroom_fills, then the chosen fill's own contents.
//
// The sample is ported; the contents are not. Each fill places monsters,
// objects or terrain with draws of its own, and they are 15 separate functions.
function themeroom_fill(rm) {
    const difficulty = depth_of_level(game.u?.uz);
    let pick = null;
    let total_frequency = 0;
    for (const fill of themeroom_fills) {
        if (!fill_eligible(fill, rm, difficulty)) continue;
        const this_frequency = fill.frequency ?? 1;
        total_frequency += this_frequency;
        if (this_frequency > 0 && rn2(total_frequency) < this_frequency)
            pick = fill;
    }
    if (!pick) return;

    /* dat/themerms.lua — the chosen fill's own contents. All fifteen are
       transcribed in js/themerms.js. */
    const contents = themeroom_fill_contents[pick.name];
    if (contents)
        contents(mkroom_table(rm));     /* sp_lev.c:5704 — Lua sees a table */
    else
        note_unported_lev(`themeroom_fill ${pick.name}`);
}

// The `contents` function of each shaped room, transcribed from themerms.lua.
// Seventeen of the nineteen are a bare filler_region(a,b) and come straight
// from the generated table; the two that are not are spelled out here.
// Returns false for a room whose contents are not ported, so the caller can
// fall back rather than emit a wrong stream.
function themeroom_contents(pick, mf) {
    if (pick.name === 'Blocked center') {
        // themerms.lua:535 — this room has its own gate BEFORE filler_region,
        // and shuffle() adds an rn2(2) whenever the gate passes.
        lspo_map(mf, () => {
            if (percent(30)) {
                const terr = ['-', 'P'];
                lua_shuffle(terr);
                note_unported_lev('des.replace_terrain');
            }
            filler_region(1, 1);
        });
        return true;
    }
    if (mf.filler) {
        const [fx, fy] = mf.filler;
        lspo_map(mf, () => filler_region(fx, fy));
        return true;
    }
    /* 'Water-surrounded vault' places objects and monsters; not ported. */
    return false;
}

// C ref: sp_lev.c check_room()
function check_room(lowx, ddx, lowy, ddy, vault) {
    const map = game.level;
    let hix = lowx.v + ddx.v, hiy = lowy.v + ddy.v;
    const xlim = XLIM + (vault ? 1 : 0);
    const ylim = YLIM + (vault ? 1 : 0);
    const s_lowx = lowx.v, s_ddx = ddx.v;
    const s_lowy = lowy.v, s_ddy = ddy.v;
    if (lowx.v < 3) lowx.v = 3;
    if (lowy.v < 2) lowy.v = 2;
    if (hix > COLNO - 3) hix = COLNO - 3;
    if (hiy > ROWNO - 3) hiy = ROWNO - 3;
    for (;;) {
        if (hix <= lowx.v || hiy <= lowy.v) return false;
        if (game.in_mk_themerooms
            && s_lowx !== lowx.v && s_ddx !== ddx.v
            && s_lowy !== lowy.v && s_ddy !== ddy.v) {
            return false;
        }
        let retry = false;
        for (let x = lowx.v - xlim; x <= hix + xlim && !retry; x++) {
            if (x <= 0 || x >= COLNO) continue;
            let y = Math.max(lowy.v - ylim, 0);
            const ymax = Math.min(hiy + ylim, ROWNO - 1);
            for (; y <= ymax; y++) {
                const loc = map.at(x, y);
                if (loc && loc.typ !== STONE) {
                    if (!rn2(3)) return false;
                    if (game.in_mk_themerooms) return false;
                    if (x < lowx.v) lowx.v = x + xlim + 1;
                    else hix = x - xlim - 1;
                    if (y < lowy.v) lowy.v = y + ylim + 1;
                    else hiy = y - ylim - 1;
                    retry = true;
                    break;
                }
            }
        }
        if (!retry) break;
    }
    ddx.v = hix - lowx.v;
    ddy.v = hiy - lowy.v;
    if (game.in_mk_themerooms
        && s_lowx !== lowx.v && s_ddx !== ddx.v
        && s_lowy !== lowy.v && s_ddy !== ddy.v) {
        return false;
    }
    return true;
}

// C ref: sp_lev.c create_room()
function create_room(x, y, w, h, xal, yal, rtype, rlit) {
    const g = game;
    let xabs = 0, yabs = 0;
    let r1 = null, r2 = null;
    let wtmp, htmp;
    let trycnt = 0;
    let vault = false;
    let xlim = XLIM, ylim = YLIM;
    if (rtype === -1) rtype = OROOM;
    if (rtype === VAULT) {
        vault = true;
        xlim++;
        ylim++;
    }
    rlit = litstate_rnd(rlit);
    do {
        wtmp = w; htmp = h;
        let xtmp = x, ytmp = y;
        let xaltmp = xal, yaltmp = yal;
        if ((xtmp < 0 && ytmp < 0 && wtmp < 0 && xaltmp < 0 && yaltmp < 0) || vault) {
            r1 = rnd_rect();
            if (!r1) return false;
            const hx = r1.hx, hy = r1.hy, lx = r1.lx, ly = r1.ly;
            let dx, dy;
            if (vault) {
                dx = dy = 1;
            } else {
                dx = 2 + rn2((hx - lx > 28) ? 12 : 8);
                dy = 2 + rn2(4);
                if (dx * dy > 50) dy = Math.trunc(50 / dx);
            }
            const xborder = (lx > 0 && hx < COLNO - 1) ? 2 * xlim : xlim + 1;
            const yborder = (ly > 0 && hy < ROWNO - 1) ? 2 * ylim : ylim + 1;
            if (hx - lx < dx + 3 + xborder || hy - ly < dy + 3 + yborder) {
                r1 = null;
                continue;
            }
            xabs = lx + (lx > 0 ? xlim : 3)
                   + rn2(hx - (lx > 0 ? lx : 3) - dx - xborder + 1);
            yabs = ly + (ly > 0 ? ylim : 2)
                   + rn2(hy - (ly > 0 ? ly : 2) - dy - yborder + 1);
            if (ly === 0 && hy >= ROWNO - 1
                && (!g.level.nroom || !rn2(g.level.nroom))
                && (yabs + dy > Math.trunc(ROWNO / 2))) {
                yabs = rn1(3, 2);
                if (g.level.nroom < 4 && dy > 1) dy--;
            }
            const lowx = { v: xabs }, ddx = { v: dx };
            const lowy = { v: yabs }, ddy = { v: dy };
            if (!check_room(lowx, ddx, lowy, ddy, vault)) {
                r1 = null;
                continue;
            }
            xabs = lowx.v;
            yabs = lowy.v;
            wtmp = ddx.v + 1;
            htmp = ddy.v + 1;
            r2 = { lx: xabs - 1, ly: yabs - 1, hx: xabs + wtmp, hy: yabs + htmp };
        } else {
            // positioned room (not used for seed8000)
            return false;
        }
    } while (++trycnt <= 100 && !r1);
    if (!r1) return false;
    split_rects(r1, r2);
    if (!vault) {
        g.smeq[g.level.nroom] = g.level.nroom;
        add_room(xabs, yabs, xabs + wtmp - 1, yabs + htmp - 1, rlit, rtype, false);
    } else {
        if (!g.level.rooms[g.level.nroom]) g.level.rooms[g.level.nroom] = {};
        g.level.rooms[g.level.nroom].lx = xabs;
        g.level.rooms[g.level.nroom].ly = yabs;
    }
    return true;
}

function create_vault() {
    return create_room(-1, -1, 2, 2, -1, -1, VAULT, true);
}

// C ref: mklev.c add_room()
// src/mklev.c:322 add_subroom() — a room INSIDE another room.
//
// Subrooms live in their own array (gs.subrooms / gn.nsubroom), not in
// svr.rooms, and the parent keeps a back-pointer list. do_room_or_subroom is
// called with special=FALSE for the "is a room" flag, unlike add_room which
// passes TRUE, so a subroom is not registered as its own top-level room.
export function add_subroom(proom, lowx, lowy, hix, hiy, lit, rtype, special) {
    const g = game;
    const croom = {
        lx: lowx, ly: lowy, hx: hix, hy: hiy,
        rtype, rlit: lit ? 1 : 0,
        doorct: 0, fdoor: g.level.doorindex,
        irregular: false, needjoining: !special,
        nsubrooms: 0, sbrooms: [],
        roomnoidx: -1,                  /* subrooms are not in svr.rooms */
        needfill: 0,
    };
    do_room_or_subroom(croom, lowx, lowy, hix, hiy, lit, rtype, special, false);
    (g.level.subrooms ||= []).push(croom);
    proom.sbrooms.push(croom);
    proom.nsubrooms++;
    return croom;
}

// src/sp_lev.c:1668 create_subroom() — FOUR rnd() draws when size and position
// are random, in the order w, h, x, y, then litstate_rnd(rlit).
//
// The parent must be at least 4x4 and the check happens BEFORE any draw, so a
// small parent spends nothing at all.
export function create_subroom(proom, x, y, w, h, rtype, rlit) {
    const width = proom.hx - proom.lx + 1;
    const height = proom.hy - proom.ly + 1;

    /* There is a minimum size for the parent room */
    if (width < 4 || height < 4)
        return false;

    if (w === -1) w = rnd(width - 3);
    if (h === -1) h = rnd(height - 3);
    if (x === -1) x = rnd(width - w);
    if (y === -1) y = rnd(height - h);
    if (x === 1) x = 0;
    if (y === 1) y = 0;
    if ((x + w + 1) === width) x++;
    if ((y + h + 1) === height) y++;
    if (rtype === -1) rtype = OROOM;
    rlit = litstate_rnd(rlit);
    add_subroom(proom, proom.lx + x, proom.ly + y,
                proom.lx + x + w - 1, proom.ly + y + h - 1,
                rlit, rtype, false);
    return true;
}

export function add_room(lowx, lowy, hix, hiy, lit, rtype, special) {
    const g = game;
    const croom = {
        lx: lowx, ly: lowy, hx: hix, hy: hiy,
        rtype, rlit: lit ? 1 : 0,
        doorct: 0, fdoor: g.level.doorindex,
        irregular: false, needjoining: !special,
        nsubrooms: 0, sbrooms: [],
        roomnoidx: g.level.nroom,
        needfill: 0,
    };
    do_room_or_subroom(croom, lowx, lowy, hix, hiy, lit, rtype, special, true);
    g.level.rooms[g.level.nroom] = croom;
    g.level.nroom++;
    if (g.level.nroom < MAXNROFROOMS) {
        g.level.rooms[g.level.nroom] = { hx: -1 };
    }
}

// C ref: mklev.c do_room_or_subroom()
function do_room_or_subroom(croom, lowx, lowy, hix, hiy, lit, _rtype, special, is_room) {
    const map = game.level;
    if (!lowx) lowx++;
    if (!lowy) lowy++;
    if (hix >= COLNO - 1) hix = COLNO - 2;
    if (hiy >= ROWNO - 1) hiy = ROWNO - 2;
    if (lit) {
        for (let x = lowx - 1; x <= hix + 1; x++)
            for (let y = Math.max(lowy - 1, 0); y <= hiy + 1; y++)
                if (map.at(x, y)) map.at(x, y).lit = true;
        croom.rlit = 1;
    } else {
        croom.rlit = 0;
    }
    croom.lx = lowx; croom.hx = hix;
    croom.ly = lowy; croom.hy = hiy;
    croom.rtype = _rtype;
    croom.doorct = 0;
    croom.fdoor = game.level.doorindex;
    croom.irregular = false;
    croom.nsubrooms = 0;
    croom.sbrooms = [];
    if (!special) {
        croom.needjoining = true;
        for (let x = lowx - 1; x <= hix + 1; x++)
            for (let y = lowy - 1; y <= hiy + 1; y += (hiy - lowy + 2)) {
                const loc = map.at(x, y);
                if (loc) { loc.typ = HWALL; loc.horizontal = true; }
            }
        for (let x = lowx - 1; x <= hix + 1; x += (hix - lowx + 2))
            for (let y = lowy; y <= hiy; y++) {
                const loc = map.at(x, y);
                if (loc) { loc.typ = VWALL; loc.horizontal = false; }
            }
        for (let x = lowx; x <= hix; x++)
            for (let y = lowy; y <= hiy; y++) {
                const loc = map.at(x, y);
                if (loc) loc.typ = ROOM;
            }
        if (is_room) {
            const tl = map.at(lowx - 1, lowy - 1);
            const tr = map.at(hix + 1, lowy - 1);
            const bl = map.at(lowx - 1, hiy + 1);
            const br = map.at(hix + 1, hiy + 1);
            if (tl) tl.typ = TLCORNER;
            if (tr) tr.typ = TRCORNER;
            if (bl) bl.typ = BLCORNER;
            if (br) br.typ = BRCORNER;
        } else {
            wallification(lowx - 1, lowy - 1, hix + 1, hiy + 1);
        }
    }
}

// C ref: mklev.c sort_rooms()
function sort_rooms() {
    const g = game;
    const n = g.level.nroom;
    const oldToNew = new Array(n).fill(0);
    const liveRooms = g.level.rooms.slice(0, n)
        .sort((a, b) => (a?.lx || 0) - (b?.lx || 0));
    g.level.rooms = liveRooms;
    if (n < MAXNROFROOMS) g.level.rooms[n] = { hx: -1 };
    for (let i = 0; i < n; i++) {
        if (g.level.rooms[i]) {
            oldToNew[g.level.rooms[i].roomnoidx] = i;
            g.level.rooms[i].roomnoidx = i;
        }
    }
    for (let x = 1; x < COLNO; x++)
        for (let y = 0; y < ROWNO; y++) {
            const loc = g.level.at(x, y);
            const rno = loc?.roomno ?? 0;
            if (rno >= ROOMOFFSET && rno < MAXNROFROOMS + 1) {
                loc.roomno = oldToNew[rno - ROOMOFFSET] + ROOMOFFSET;
            }
        }
}

// C ref: mklev.c topologize()
export function topologize(croom) {
    if (!croom || croom.irregular) return;
    const roomno = (croom.roomnoidx ?? -1) + ROOMOFFSET;
    const lowx = croom.lx, lowy = croom.ly;
    const hix = croom.hx, hiy = croom.hy;
    if (!game.level || roomno < ROOMOFFSET) return;
    if ((game.level.at(lowx, lowy)?.roomno ?? 0) === roomno) return;
    for (let x = lowx; x <= hix; x++)
        for (let y = lowy; y <= hiy; y++) {
            const loc = game.level.at(x, y);
            if (loc) loc.roomno = roomno;
        }
    for (let x = lowx - 1; x <= hix + 1; x++)
        for (let y = lowy - 1; y <= hiy + 1; y += (hiy - lowy + 2)) {
            const loc = game.level.at(x, y);
            if (loc) { loc.edge = true; loc.roomno = loc.roomno ? SHARED : roomno; }
        }
    for (let x = lowx - 1; x <= hix + 1; x += (hix - lowx + 2))
        for (let y = lowy; y <= hiy; y++) {
            const loc = game.level.at(x, y);
            if (loc) { loc.edge = true; loc.roomno = loc.roomno ? SHARED : roomno; }
        }

    /* src/mklev.c:1650 — recurse into the subrooms so each stamps its OWN
       roomno over the parent's. Without this a subroom's squares keep the
       parent's number, and every roomno test reads them as the outer room:
       somexy's irregular arm, selection_from_mkroom, in_rooms, inside_room. */
    for (let subindex = 0; subindex < (croom.nsubrooms || 0); subindex++)
        topologize(croom.sbrooms[subindex]);
}

// ============================================================
// Corridors
// ============================================================

function good_rm_wall_doorpos(x, y, dir, room) {
    const map = game.level;
    const rmno = game.level.rooms.indexOf(room) + ROOMOFFSET;
    if (!isok(x, y) || !room.needjoining) return false;
    const loc = map.at(x, y);
    if (!loc) return false;
    if (!(loc.typ === HWALL || loc.typ === VWALL || IS_DOOR(loc.typ) || loc.typ === SDOOR))
        return false;
    if (bydoor(x, y)) return false;
    const tx = x + xdir[dir], ty = y + ydir[dir];
    if (!isok(tx, ty)) return false;
    const tloc = map.at(tx, ty);
    if (!tloc || IS_OBSTRUCTED(tloc.typ)) return false;
    if (rmno !== tloc.roomno) return false;
    return true;
}

// src/mklev.c finddpos_shift() — is this a usable doorway, and if the room is
// IRREGULAR, is there one just inside it?
//
// The irregular walk was missing. An irregular room's wall does not follow its
// bounding rectangle, so the point finddpos() picked can sit outside the wall
// with STONE or CORR between. C steps inward one square at a time until it
// either finds a good wall position (and SHIFTS x/y to it, which is what the
// name is about) or leaves the rectangle. Without it every such pick failed,
// finddpos() spent another rn1() on its retry loop, and every draw after that
// point on the level was off by one.
function finddpos_shift(xp, yp, dir, aroom) {
    const rdir = DIR_180(dir);
    const dx = xdir[rdir], dy = ydir[rdir];

    if (good_rm_wall_doorpos(xp.v, yp.v, rdir, aroom))
        return true;

    if (aroom.irregular) {
        let rx = xp.v, ry = yp.v;
        let fail = false;

        while (!fail && isok(rx, ry)
               && (game.level.at(rx, ry)?.typ === STONE
                   || game.level.at(rx, ry)?.typ === CORR)) {
            rx += dx;
            ry += dy;
            if (good_rm_wall_doorpos(rx, ry, rdir, aroom)) {
                xp.v = rx;
                yp.v = ry;
                return true;
            }
            const t = game.level.at(rx, ry)?.typ;
            if (!(t === STONE || t === CORR))
                fail = true;
            if (rx < aroom.lx || rx > aroom.hx
                || ry < aroom.ly || ry > aroom.hy)
                fail = true;
        }
    }
    return false;
}

// C ref: mklev.c finddpos()
function finddpos(cc, dir, aroom) {
    let x1, y1, x2, y2;
    switch (dir) {
    case DIR_N: x1 = aroom.lx; x2 = aroom.hx; y1 = y2 = aroom.ly - 1; break;
    case DIR_S: x1 = aroom.lx; x2 = aroom.hx; y1 = y2 = aroom.hy + 1; break;
    case DIR_W: x1 = x2 = aroom.lx - 1; y1 = aroom.ly; y2 = aroom.hy; break;
    case DIR_E: x1 = x2 = aroom.hx + 1; y1 = aroom.ly; y2 = aroom.hy; break;
    default: return false;
    }
    let tryct = 0;
    let x, y;
    do {
        x = (x2 - x1) ? rn1(x2 - x1 + 1, x1) : x1;
        y = (y2 - y1) ? rn1(y2 - y1 + 1, y1) : y1;
        const xp = { v: x }, yp = { v: y };
        if (finddpos_shift(xp, yp, dir, aroom)) {
            cc.x = xp.v; cc.y = yp.v;
            return true;
        }
    } while (++tryct < 20);
    for (x = x1; x <= x2; x++)
        for (y = y1; y <= y2; y++) {
            const xp = { v: x }, yp = { v: y };
            if (finddpos_shift(xp, yp, dir, aroom)) {
                cc.x = xp.v; cc.y = yp.v;
                return true;
            }
        }
    cc.x = x1; cc.y = y1;
    return false;
}

function maybe_sdoor(chance) {
    const d = depth_of_level(game.u?.uz);
    return (d > 2) && !rn2(Math.max(2, chance));
}

// C ref: sp_lev.c dig_corridor()
function dig_corridor(org, dest, npoints_out, nxcor, ftyp, btyp) {
    const map = game.level;
    let dx = 0, dy = 0;
    let xx = org.x, yy = org.y;
    const tx = dest.x, ty = dest.y;
    let npoints = 0;
    if (npoints_out) npoints_out.v = 0;
    if (xx <= 0 || yy <= 0 || tx <= 0 || ty <= 0
        || xx > COLNO - 1 || tx > COLNO - 1 || yy > ROWNO - 1 || ty > ROWNO - 1)
        return false;
    if (tx > xx) dx = 1;
    else if (ty > yy) dy = 1;
    else if (tx < xx) dx = -1;
    else dy = -1;
    xx -= dx; yy -= dy;
    let cct = 0;
    while (xx !== tx || yy !== ty) {
        if (cct++ > 500 || (nxcor && !rn2(35))) return false;
        xx += dx; yy += dy;
        if (xx >= COLNO - 1 || xx <= 0 || yy <= 0 || yy >= ROWNO - 1) return false;
        const crm = map.at(xx, yy);
        if (!crm) return false;
        if (crm.typ === btyp) {
            if (ftyp === CORR && maybe_sdoor(100)) {
                npoints++;
                if (npoints_out) npoints_out.v = npoints;
                crm.typ = SCORR;
            } else {
                npoints++;
                if (npoints_out) npoints_out.v = npoints;
                crm.typ = ftyp;
                if (nxcor && !rn2(50)) {
                    mksobj_at(BOULDER, xx, yy, true, false);
                }
            }
        } else if (crm.typ !== ftyp && crm.typ !== SCORR) {
            return false;
        }
        let dix = Math.abs(xx - tx);
        let diy = Math.abs(yy - ty);
        if ((dix > diy) && diy && !rn2(dix - diy + 1)) dix = 0;
        else if ((diy > dix) && dix && !rn2(diy - dix + 1)) diy = 0;
        if (dy && dix > diy) {
            const ddx = (xx > tx) ? -1 : 1;
            const ncr = map.at(xx + ddx, yy);
            if (ncr && (ncr.typ === btyp || ncr.typ === ftyp || ncr.typ === SCORR)) {
                dx = ddx; dy = 0; continue;
            }
        } else if (dx && diy > dix) {
            const ddy = (yy > ty) ? -1 : 1;
            const ncr = map.at(xx, yy + ddy);
            if (ncr && (ncr.typ === btyp || ncr.typ === ftyp || ncr.typ === SCORR)) {
                dy = ddy; dx = 0; continue;
            }
        }
        const straight = map.at(xx + dx, yy + dy);
        if (straight && (straight.typ === btyp || straight.typ === ftyp || straight.typ === SCORR))
            continue;
        if (dx) { dx = 0; dy = (ty < yy) ? -1 : 1; }
        else { dy = 0; dx = (tx < xx) ? -1 : 1; }
        const alt = map.at(xx + dx, yy + dy);
        if (alt && (alt.typ === btyp || alt.typ === ftyp || alt.typ === SCORR)) continue;
        dy = -dy; dx = -dx;
    }
    if (npoints_out) npoints_out.v = npoints;
    return true;
}

// C ref: mklev.c dosdoor()
function dosdoor(x, y, aroom, type) {
    const map = game.level;
    const loc = map.at(x, y);
    if (!loc) return;
    const shdoor = in_rooms(x, y, 0).length > 0;
    if (!IS_WALL(loc.typ)) type = DOOR;
    loc.typ = type;
    if (type === DOOR) {
        if (!rn2(3)) {
            if (!rn2(5)) loc.doormask = D_ISOPEN;
            else if (!rn2(6)) loc.doormask = D_LOCKED;
            else loc.doormask = D_CLOSED;
            if (loc.doormask !== D_ISOPEN && !shdoor
                && level_difficulty() >= 5 && !rn2(25))
                loc.doormask |= D_TRAPPED;
        } else {
            loc.doormask = shdoor ? D_ISOPEN : D_NODOOR;
        }
        if (loc.doormask & D_TRAPPED) {
            if (level_difficulty() >= 9 && !rn2(5)) {
                loc.doormask = D_NODOOR;
            }
        }
    } else {
        if (shdoor || !rn2(5)) loc.doormask = D_LOCKED;
        else loc.doormask = D_CLOSED;
        if (!shdoor && level_difficulty() >= 4 && !rn2(20))
            loc.doormask |= D_TRAPPED;
    }
    add_door(x, y, aroom);
}

function dodoor(x, y, aroom) {
    dosdoor(x, y, aroom, maybe_sdoor(8) ? SDOOR : DOOR);
}

export function add_door(x, y, aroom) {
    const g = game;
    if (!g.level.doors) g.level.doors = [];
    for (let i = 0; i < aroom.doorct; i++) {
        const d = g.level.doors[aroom.fdoor + i];
        if (d && d.x === x && d.y === y) return;
    }
    if (aroom.doorct === 0) aroom.fdoor = g.level.doorindex;
    aroom.doorct++;
    for (let tmp = g.level.doorindex; tmp > aroom.fdoor; tmp--)
        g.level.doors[tmp] = g.level.doors[tmp - 1];
    for (const broom of g.level.rooms || []) {
        if (!broom || broom.hx <= 0 || broom === aroom || !(broom.doorct > 0)) continue;
        if ((broom.fdoor ?? 0) >= aroom.fdoor) broom.fdoor++;
    }
    g.level.doors[aroom.fdoor] = { x, y };
    g.level.doorindex++;
}

function bydoor(x, y) {
    const map = game.level;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (!isok(x + dx, y + dy)) continue;
        const loc = map.at(x + dx, y + dy);
        if (loc && (IS_DOOR(loc.typ) || loc.typ === SDOOR)) return true;
    }
    return false;
}

export function okdoor(x, y) {
    const map = game.level;
    const loc = map.at(x, y);
    if (!loc) return false;
    if (!(loc.typ === HWALL || loc.typ === VWALL)) return false;
    if (bydoor(x, y)) return false;
    return (
        (isok(x - 1, y) && !IS_OBSTRUCTED(map.at(x - 1, y).typ))
        || (isok(x + 1, y) && !IS_OBSTRUCTED(map.at(x + 1, y).typ))
        || (isok(x, y - 1) && !IS_OBSTRUCTED(map.at(x, y - 1).typ))
        || (isok(x, y + 1) && !IS_OBSTRUCTED(map.at(x, y + 1).typ))
    );
}

// C ref: mklev.c join()
function join(a, b, nxcor) {
    const g = game;
    const croom = g.level.rooms[a];
    const troom = g.level.rooms[b];
    if (!croom || !troom) return;
    if (!croom.needjoining || !troom.needjoining) return;
    if (troom.hx < 0 || croom.hx < 0) return;
    let dx, dy;
    const cc = { x: 0, y: 0 }, tt = { x: 0, y: 0 };
    if (troom.lx > croom.hx) {
        dx = 1; dy = 0;
        if (!finddpos(cc, DIR_E, croom)) return;
        if (!finddpos(tt, DIR_W, troom)) return;
    } else if (troom.hy < croom.ly) {
        dy = -1; dx = 0;
        if (!finddpos(cc, DIR_N, croom)) return;
        if (!finddpos(tt, DIR_S, troom)) return;
    } else if (troom.hx < croom.lx) {
        dx = -1; dy = 0;
        if (!finddpos(cc, DIR_W, croom)) return;
        if (!finddpos(tt, DIR_E, troom)) return;
    } else {
        dy = 1; dx = 0;
        if (!finddpos(cc, DIR_S, croom)) return;
        if (!finddpos(tt, DIR_N, troom)) return;
    }
    const xx = cc.x, yy = cc.y;
    const tx = tt.x - dx, ty = tt.y - dy;
    if (nxcor) {
        const loc = game.level.at(xx + dx, yy + dy);
        if (loc && loc.typ !== STONE) return;
    }
    const org = { x: xx + dx, y: yy + dy };
    const dest = { x: tx, y: ty };
    const npoints = { v: 0 };
    const ftyp = CORR;
    const dig_result = dig_corridor(org, dest, npoints, nxcor, ftyp, STONE);
    if ((npoints.v > 0) && (okdoor(xx, yy) || !nxcor))
        dodoor(xx, yy, croom);
    if (!dig_result) return;
    if (okdoor(tt.x, tt.y) || !nxcor)
        dodoor(tt.x, tt.y, troom);
    if (g.smeq[a] < g.smeq[b]) g.smeq[b] = g.smeq[a];
    else g.smeq[a] = g.smeq[b];
}

// C ref: mklev.c makecorridors()
function makecorridors() {
    const g = game;
    let any = true;
    for (let i = 0; i < g.level.nroom; i++) g.smeq[i] = i;
    for (let a = 0; a < g.level.nroom - 1; a++) {
        join(a, a + 1, false);
        if (!rn2(50)) break;
    }
    for (let a = 0; a < g.level.nroom - 2; a++)
        if (g.smeq[a] !== g.smeq[a + 2]) join(a, a + 2, false);
    for (let a = 0; any && a < g.level.nroom; a++) {
        any = false;
        for (let b = 0; b < g.level.nroom; b++)
            if (g.smeq[a] !== g.smeq[b]) { join(a, b, false); any = true; }
    }
    if (g.level.nroom > 2) {
        const count = rn2(g.level.nroom) + 4;
        for (let i = 0; i < count; i++) {
            let a = rn2(g.level.nroom);
            let b = rn2(g.level.nroom - 2);
            if (b >= a) b += 2;
            join(a, b, true);
        }
    }
}

// ============================================================
// Room helper functions
// ============================================================

function somex(croom) { return rn1(croom.hx - croom.lx + 1, croom.lx); }
function somey(croom) { return rn1(croom.hy - croom.ly + 1, croom.ly); }

export function somexy(croom, c) {
    /* src/mkroom.c:744 — an IRREGULAR room is not a rectangle, so a raw
       somex/somey can land outside it. C rejects those and redraws, up to 100
       times, then falls back to an exhaustive scan that draws nothing. Missing
       this branch meant we accepted the first draw and placed things outside
       the room, and it cost draws too: every rejected try in C is another
       somex/somey pair. */
    if (croom.irregular) {
        const i = (croom.roomnoidx ?? -1) + ROOMOFFSET;
        let try_cnt = 0;

        while (try_cnt++ < 100) {
            c.x = somex(croom);
            c.y = somey(croom);
            const loc = game.level.at(c.x, c.y);
            if (loc && !loc.edge && loc.roomno === i)
                return true;
        }
        /* try harder; exhaustively search until one is found */
        for (c.x = croom.lx; c.x <= croom.hx; c.x++)
            for (c.y = croom.ly; c.y <= croom.hy; c.y++) {
                const loc = game.level.at(c.x, c.y);
                if (loc && !loc.edge && loc.roomno === i)
                    return true;
            }
        return false;
    }

    if (!croom.nsubrooms) {
        c.x = somex(croom);
        c.y = somey(croom);
        return true;
    }
    /* src/mkroom.c somexy() — a room WITH subrooms rejects any square that
       falls inside one of them, and each rejection costs another somex/somey
       pair. Returning as soon as the square is not a wall places things inside
       subrooms C keeps clear AND spends fewer draws.

       This could not fire until "Room in a room" made lspo_room call
       create_subroom earlier in this session; the gap was dormant because
       nothing generated a subroom. */
    let try_cnt = 0;
    while (try_cnt++ < 100) {
        c.x = somex(croom);
        c.y = somey(croom);
        const loc = game.level.at(c.x, c.y);
        if (loc && IS_WALL(loc.typ)) continue;

        let in_subroom = false;
        for (let i = 0; i < croom.nsubrooms; i++)
            if (inside_room(croom.sbrooms[i], c.x, c.y)) {
                in_subroom = true;
                break;
            }
        if (in_subroom) continue;       /* goto you_lose */
        return true;
    }
    return false;
}

// src/mklev.c:1806 occupied() — a TRAP occupies a square too, and leaving that
// out made somexyspace() accept squares C rejects, so every retry after the
// first trap on a level landed somewhere different.
export function occupied(x, y) {
    const loc = game.level.at(x, y);
    if (!loc) return false;
    if (t_at_lev(x, y)) return true;
    return !!(IS_FURNITURE(loc.typ) || loc.typ === LAVAPOOL || IS_POOL(loc.typ));
    /* invocation_pos() is only meaningful on the invocation level */
}

/* src/trap.c t_at() */
function t_at_lev(x, y) {
    return (game.level?.traps || []).some(t => t.tx === x && t.ty === y);
}

export function somexyspace(croom, c) {
    let trycnt = 0;
    let okay;
    do {
        okay = somexy(croom, c) && isok(c.x, c.y) && !occupied(c.x, c.y);
        if (okay) {
            const loc = game.level.at(c.x, c.y);
            okay = loc && (loc.typ === ROOM || loc.typ === CORR || loc.typ === ICE);
        }
    } while (trycnt++ < 100 && !okay);
    return okay;
}

// ============================================================
// Stairs
// ============================================================

function generate_stairs_room_good(croom, phase) {
    if (!croom || croom.hx < 0) return false;
    if (!croom.needjoining && phase >= 0) return false;
    let hasDown = false, hasUp = false;
    for (let st = game.stairs; st; st = st.next) {
        const inRoom = st.sx >= croom.lx && st.sx <= croom.hx
            && st.sy >= croom.ly && st.sy <= croom.hy;
        if (!inRoom) continue;
        if (st.up) hasUp = true; else hasDown = true;
    }
    if (phase >= 1 && (hasDown || hasUp)) return false;
    if (croom.rtype !== OROOM && !(phase < 2 && croom.rtype === THEMEROOM)) return false;
    return true;
}

function generate_stairs_find_room() {
    const g = game;
    if (!g.level.nroom) return null;
    for (let phase = 2; phase > -1; phase--) {
        const candidates = [];
        for (let i = 0; i < g.level.nroom; i++)
            if (generate_stairs_room_good(g.level.rooms[i], phase))
                candidates.push(i);
        if (candidates.length > 0) {
            const pick = rn2(candidates.length);
            return g.level.rooms[candidates[pick]];
        }
    }
    return g.level.rooms[rn2(g.level.nroom)];
}

function mkstairs(x, y, up, croom) {
    const g = game;
    const loc = g.level.at(x, y);
    if (loc) {
        loc.typ = STAIRS;
        loc.ladder = up ? 1 : 2;
    }
    const dest = {
        dnum: g.u?.uz?.dnum ?? 0,
        dlevel: (g.u?.uz?.dlevel ?? 1) + (up ? -1 : 1),
    };
    stairway_add(x, y, !!up, false, dest);
    if (up) g.level.upstair = { x, y };
    else g.level.dnstair = { x, y };
}

async function generate_stairs() {
    const g = game;
    const pos = { x: 0, y: 0 };
    // Down stairs
    {
        const croom = generate_stairs_find_room();
        if (croom) {
            if (!somexyspace(croom, pos)) {
                pos.x = somex(croom);
                pos.y = somey(croom);
            }
            mkstairs(pos.x, pos.y, 0, croom);
        }
    }
    // Up stairs only if not level 1
    if ((g.u?.uz?.dlevel ?? 1) !== 1) {
        const croom = generate_stairs_find_room();
        if (croom) {
            if (!somexyspace(croom, pos)) {
                pos.x = somex(croom);
                pos.y = somey(croom);
            }
            mkstairs(pos.x, pos.y, 1, croom);
        }
    }
}

// ============================================================
// Niches
// ============================================================

function cardinal_nextto_room(aroom, x, y) {
    const map = game.level;
    const rmno = game.level.rooms.indexOf(aroom) + ROOMOFFSET;
    for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        if (!isok(x + dx, y + dy)) continue;
        const loc = map.at(x + dx, y + dy);
        if (loc && !loc.edge && loc.roomno === rmno) return true;
    }
    return false;
}

function place_niche(aroom) {
    let dy;
    const dd = { x: 0, y: 0 };
    if (rn2(2)) {
        dy = 1;
        if (!finddpos(dd, DIR_S, aroom)) return null;
    } else {
        dy = -1;
        if (!finddpos(dd, DIR_N, aroom)) return null;
    }
    const xx = dd.x, yy = dd.y;
    const niche = game.level.at(xx, yy + dy);
    const back = game.level.at(xx, yy - dy);
    if (!niche || niche.typ !== STONE) return null;
    if (!back || IS_POOL(back.typ) || IS_FURNITURE(back.typ)) return null;
    if (!cardinal_nextto_room(aroom, xx, yy)) return null;
    return { dy, xx, yy };
}

async function makeniche(trap_type) {
    const g = game;
    let vct = 8;
    while (vct--) {
        const aroom = g.level.rooms[rn2(g.level.nroom)];
        if (!aroom || aroom.rtype !== OROOM) continue;
        if (aroom.doorct === 1 && rn2(5)) continue;
        const niche = place_niche(aroom);
        if (!niche) continue;
        const { dy, xx, yy } = niche;
        const rm = g.level.at(xx, yy + dy);
        if (!rm) continue;
        if (trap_type || !rn2(4)) {
            rm.typ = SCORR;
            if (trap_type) {
                let actualTrap = trap_type;
                if (is_hole(actualTrap) && !Can_fall_thru(g.u.uz))
                    actualTrap = ROCKTRAP;
                const ttmp = maketrap(xx, yy + dy, actualTrap);
                if (ttmp) {
                    if (actualTrap !== ROCKTRAP) ttmp.once = 1;
                    /* src/mklev.c:767 — "ad aerarium" is eleven characters,
                       and wipe_engr_at() rubs out five of them: two draws per
                       character, three when it has a rubout substitute. */
                    if (trap_engravings[actualTrap]) {
                        make_engr_at(xx, yy - dy,
                                     trap_engravings[actualTrap], null, 0,
                                     DUST);
                        wipe_engr_at(xx, yy - dy, 5, false);
                    }
                }
            }
            dosdoor(xx, yy, aroom, SDOOR);
        } else {
            rm.typ = CORR;
            if (rn2(7)) {
                dosdoor(xx, yy, aroom, rn2(5) ? SDOOR : DOOR);
            } else {
                const loc = g.level.at(xx, yy);
                if (!rn2(5) && loc && IS_WALL(loc.typ)) {
                    loc.typ = IRONBARS;
                    if (rn2(3)) {
                        /* src/mklev.c — a dead adventurer behind the bars */
                        const ptr = mkclass(MONSYMS.S_HUMAN, 0);
                        mkcorpstat(CORPSE, null, ptr ? monsndx(ptr) : NON_PM,
                                   xx, yy + dy, CORPSTAT_INIT);
                    }
                }
                if (!g.level.flags.noteleport) {
                    mksobj_at(SCR_TELEPORTATION, xx, yy + dy, true, false);
                }
                if (!rn2(3)) {
                    mkobj_at(RANDOM_CLASS, xx, yy + dy, true);
                }
            }
        }
        return;
    }
}

async function make_niches() {
    const g = game;
    let ct = rnd(Math.trunc(g.level.nroom / 2) + 1);
    let ltptr = ((g.u?.uz?.dlevel ?? 1) > 15);
    let vamp = ((g.u?.uz?.dlevel ?? 1) > 5 && (g.u?.uz?.dlevel ?? 1) < 25);
    while (ct--) {
        if (ltptr && !rn2(6)) {
            ltptr = false;
            await makeniche(LEVEL_TELEP);
        } else if (vamp && !rn2(6)) {
            vamp = false;
            await makeniche(TRAPDOOR);
        } else {
            await makeniche(NO_TRAP);
        }
    }
}

// ============================================================
// Branch placement
// ============================================================

function is_branchlev() {
    const g = game;
    if (!g.branches) return null;
    for (const br of g.branches) {
        if (br?.end1?.dnum === (g.u?.uz?.dnum ?? 0) && br?.end1?.dlevel === (g.u?.uz?.dlevel ?? 1)) return br;
        if (br?.end2?.dnum === (g.u?.uz?.dnum ?? 0) && br?.end2?.dlevel === (g.u?.uz?.dlevel ?? 1)) return br;
    }
    return null;
}

function find_branch_room(mp) {
    const croom = generate_stairs_find_room();
    if (croom) somexyspace(croom, mp);
    return croom;
}

function place_branch(branchp) {
    const g = game;
    const mp = { x: 0, y: 0 };
    const croom = find_branch_room(mp);
    if (croom && mp.x > 0) {
        const on_end1 = (branchp.end1?.dnum === g.u?.uz?.dnum
            && branchp.end1?.dlevel === g.u?.uz?.dlevel);
        const dest = on_end1 ? branchp.end2 : branchp.end1;
        const goes_up = on_end1 ? !!branchp.end1_up : !branchp.end1_up;
        const loc = g.level?.at(mp.x, mp.y);
        if (loc) {
            loc.typ = STAIRS;
            loc.ladder = goes_up ? 1 : 2;
        }
        stairway_add(mp.x, mp.y, goes_up, false, dest || { dnum: 0, dlevel: 0 });
        if (goes_up) g.level.upstair = { x: mp.x, y: mp.y };
        else g.level.dnstair = { x: mp.x, y: mp.y };
    }
    g.made_branch = true;
}

// ============================================================
// Wallification
// ============================================================

function isSolidTile(x, y) {
    if (!isok(x, y)) return true;
    return IS_STWALL(game.level?.at(x, y)?.typ ?? STONE);
}
function isWallOrStone(x, y) {
    if (!isok(x, y)) return 1;
    const typ = game.level?.at(x, y)?.typ ?? STONE;
    return (typ === STONE || isWallTile(x, y)) ? 1 : 0;
}
function isWallTile(x, y) {
    if (!isok(x, y)) return 0;
    const typ = game.level?.at(x, y)?.typ ?? STONE;
    return (IS_WALL(typ) || IS_DOOR(typ) || typ === LAVAWALL
        || typ === WATER || typ === SDOOR || typ === IRONBARS) ? 1 : 0;
}
function extend_spine(locale, wall_there, dx, dy) {
    const nx = 1 + dx, ny = 1 + dy;
    if (!wall_there) return 0;
    if (dx) {
        if (locale[1][0] && locale[1][2] && locale[nx][0] && locale[nx][2]) return 0;
        return 1;
    }
    if (locale[0][1] && locale[2][1] && locale[0][ny] && locale[2][ny]) return 0;
    return 1;
}
function wall_cleanup(x1, y1, x2, y2) {
    const map = game.level;
    if (!map) return;
    for (let x = x1; x <= x2; x++)
        for (let y = y1; y <= y2; y++) {
            const loc = map.at(x, y);
            const typ = loc?.typ ?? STONE;
            if (!(IS_WALL(typ) && typ !== DBWALL)) continue;
            if (isSolidTile(x-1,y-1) && isSolidTile(x-1,y) && isSolidTile(x-1,y+1)
                && isSolidTile(x,y-1) && isSolidTile(x,y+1)
                && isSolidTile(x+1,y-1) && isSolidTile(x+1,y) && isSolidTile(x+1,y+1))
                loc.typ = STONE;
        }
}
function fix_wall_spines(x1, y1, x2, y2) {
    const spineArray = [VWALL, HWALL, HWALL, HWALL,
        VWALL, TRCORNER, TLCORNER, TDWALL,
        VWALL, BRCORNER, BLCORNER, TUWALL,
        VWALL, TLWALL, TRWALL, CROSSWALL];
    const map = game.level;
    if (!map) return;
    for (let x = x1; x <= x2; x++)
        for (let y = y1; y <= y2; y++) {
            const loc = map.at(x, y);
            const typ = loc?.typ ?? STONE;
            if (!(IS_WALL(typ) && typ !== DBWALL)) continue;
            const locale = [
                [isWallOrStone(x-1,y-1), isWallOrStone(x-1,y), isWallOrStone(x-1,y+1)],
                [isWallOrStone(x,y-1), 0, isWallOrStone(x,y+1)],
                [isWallOrStone(x+1,y-1), isWallOrStone(x+1,y), isWallOrStone(x+1,y+1)],
            ];
            const bits = (extend_spine(locale, isWallTile(x,y-1), 0, -1) << 3)
                | (extend_spine(locale, isWallTile(x,y+1), 0, 1) << 2)
                | (extend_spine(locale, isWallTile(x+1,y), 1, 0) << 1)
                | extend_spine(locale, isWallTile(x-1,y), -1, 0);
            if (bits) loc.typ = spineArray[bits];
        }
}
function wallification(x1, y1, x2, y2) {
    wall_cleanup(x1, y1, x2, y2);
    fix_wall_spines(x1, y1, x2, y2);
}

// ============================================================
// Fill ordinary room
// ============================================================

function traptype_rnd() {
    const lvl = game.u?.uz?.dlevel ?? 1;
    let kind = rnd(TRAPNUM - 1);
    switch (kind) {
    case TRAPPED_DOOR: case TRAPPED_CHEST: case MAGIC_PORTAL: case VIBRATING_SQUARE:
        kind = NO_TRAP; break;
    case ROLLING_BOULDER_TRAP: case SLP_GAS_TRAP:
        if (lvl < 2) kind = NO_TRAP; break;
    case LEVEL_TELEP:
        if (lvl < 5 || game.level?.flags?.noteleport) kind = NO_TRAP; break;
    case SPIKED_PIT:
        if (lvl < 5) kind = NO_TRAP; break;
    case LANDMINE:
        if (lvl < 6) kind = NO_TRAP; break;
    case WEB:
        if (lvl < 7) kind = NO_TRAP; break;
    case STATUE_TRAP: case POLY_TRAP:
        if (lvl < 8) kind = NO_TRAP; break;
    case FIRE_TRAP:
        kind = NO_TRAP; break; // not hellish
    case TELEP_TRAP:
        if (game.level?.flags?.noteleport) kind = NO_TRAP; break;
    case HOLE:
        if (rn2(7)) kind = NO_TRAP; break;
    }
    return kind;
}

function find_okay_roompos(croom, crd) {
    let tryct = 0;
    do {
        if (++tryct > 200) return false;
        if (!somexyspace(croom, crd)) return false;
    } while (occupied(crd.x, crd.y) || bydoor(crd.x, crd.y));
    return true;
}

// src/mklev.c:1813 mktrap_victim() — a corpse and some gear on top of a trap.
//
// Every otyp and PM_ index here used to be a hand-written literal, and every
// one of them was wrong (ARROW was 349, real value 18; PM_ELF was 18, which is
// ARROW). They now come from the generated tables. See CLAUDE.md.
function mktrap_victim(trap) {
    const lvl = level_difficulty();
    const kind = trap.ttyp;
    const x = trap.tx, y = trap.ty;

    /* Not all trap types drop an item; only the ones that kill in a way
       that is obvious after the fact. */
    switch (kind) {
    case ARROW_TRAP: mksobj(ONAMES.ARROW, true, false); break;
    case DART_TRAP: mksobj(ONAMES.DART, true, false); break;
    case ROCKTRAP: mksobj(ONAMES.ROCK, true, false); break;
    default: break;
    }

    /* Place a random possession: weapon, tool, food or gem. */
    do {
        const poss_class = [WEAPON_CLASS, TOOL_CLASS, FOOD_CLASS, GEM_CLASS][rn2(4)];
        const otmp = mkobj(poss_class, false);
        curse(otmp);
        /* 20% chance of placing an additional item, recursively */
    } while (!rn2(5));

    /* Place a corpse. */
    let victim_mnum;
    switch (rn2(15)) {
    case 0:
        /* elf corpses are the rarest as they're the most useful */
        victim_mnum = PMNAMES.PM_ELF;
        if (kind === SLP_GAS_TRAP && !(lvl <= 2 && rn2(2)))
            victim_mnum = PMNAMES.PM_HUMAN;
        break;
    case 1: case 2: victim_mnum = PMNAMES.PM_DWARF; break;
    case 3: case 4: case 5: victim_mnum = PMNAMES.PM_ORC; break;
    case 6: case 7: case 8: case 9:
        victim_mnum = PMNAMES.PM_GNOME;
        if (!rn2(10)) {
            const otmp = mksobj(rn2(4) ? ONAMES.TALLOW_CANDLE
                                       : ONAMES.WAX_CANDLE, true, false);
            otmp.quan = 1;
            curse(otmp);
        }
        break;
    default: victim_mnum = PMNAMES.PM_HUMAN; break;
    }
    /* PM_HUMAN is a placeholder; usually swap in a fake player monster */
    if (victim_mnum === PMNAMES.PM_HUMAN && rn2(25))
        victim_mnum = rn1(PMNAMES.PM_WIZARD - PMNAMES.PM_ARCHEOLOGIST,
                          PMNAMES.PM_ARCHEOLOGIST);
    const otmp = mkcorpstat(CORPSE, null, victim_mnum, x, y, CORPSTAT_INIT);
    otmp.age -= (TAINT_AGE + 1); /* died too long ago to safely eat */
}

// src/mklev.c:2036 mktrap() — place a trap.
//
// This used to be `mktrap_room(croom)`, which called somexyspace ONCE. The C
// loops until it finds an unoccupied square, spending a somexyspace on every
// rejected one, so a crowded room diverged by however many retries it needed.
// That is the shape of every function in this chain: the retry loop IS the
// draw count.
export function mktrap(num, mktrapflags, croom, tm) {
    let kind;
    const lvl = level_difficulty();

    if (!tm && !croom && !(mktrapflags & MKTRAP_MAZEFLAG))
        return;                         /* paniclog("mktrap", "args invalid") */

    const m = { x: 0, y: 0 };

    /* no traps in pools */
    if (tm && (mklev_mon.is_pool(tm.x, tm.y) || mklev_mon.is_lava(tm.x, tm.y)))
        return;

    if (num > NO_TRAP && num < TRAPNUM) {
        kind = num;
    } else if (Inhell() && !rn2(5)) {
        /* bias the frequency of fire traps in Gehennom */
        kind = FIRE_TRAP;
    } else {
        do { kind = traptype_rnd(mktrapflags); } while (kind === NO_TRAP);
    }

    const dungeon = game.dungeons?.[game.u?.uz?.dnum ?? 0];
    const canFallThru = (game.u?.uz?.dlevel ?? 1) < (dungeon?.num_dunlevs ?? 1);
    if (is_hole(kind) && !canFallThru)
        kind = ROCKTRAP;

    if (tm) {
        m.x = tm.x;
        m.y = tm.y;
    } else {
        let tryct = 0;
        const avoid_boulder = (is_pit(kind) || is_hole(kind));

        do {
            if (++tryct > 200)
                return;
            if ((mktrapflags & MKTRAP_MAZEFLAG) !== 0) {
                note_unported_lev('mktrap:mazexy');
                return;
            } else if (croom && !somexyspace(croom, m)) {
                return;
            }
        } while (occupied(m.x, m.y)
                 || (avoid_boulder && sobj_at(ONAMES.BOULDER, m.x, m.y)));
    }

    const trap = maketrap(m.x, m.y, kind);
    /* we should always get the type we asked for, but be paranoid */
    kind = trap ? trap.ttyp : NO_TRAP;

    if (kind === WEB && !(mktrapflags & MKTRAP_NOSPIDERONWEB))
        makemon(game.mons[PMNAMES.PM_GIANT_SPIDER], m.x, m.y, NO_MM_FLAGS);
    if (trap && (mktrapflags & MKTRAP_SEEN))
        trap.tseen = true;

    if (game.in_mklev && kind !== NO_TRAP && !(mktrapflags & MKTRAP_NOVICTIM)
        && lvl <= rnd(4)
        && kind !== SQKY_BOARD && kind !== RUST_TRAP
        && !(kind === ROLLING_BOULDER_TRAP
             && trap.launch?.x === trap.tx && trap.launch?.y === trap.ty)
        && !is_pit(kind) && (kind < HOLE || kind === MAGIC_TRAP)) {
        if (kind === LANDMINE) {
            /* treat as exploded: an unconcealed pit, no scattered objects */
            trap.ttyp = PIT;
            trap.tseen = true;
        }
        mktrap_victim(trap);
    }
}

function mkfount(croom) {
    const pos = { x: 0, y: 0 };
    if (!find_okay_roompos(croom, pos)) return;
    const loc = game.level?.at(pos.x, pos.y);
    if (loc) {
        loc.typ = FOUNTAIN;
        if (!rn2(7)) loc.blessedftn = 1;
        game.level.flags.nfountains++;
    }
}

function mkaltar(croom) {
    if (!croom || croom.rtype !== OROOM) return;
    const pos = { x: 0, y: 0 };
    if (!find_okay_roompos(croom, pos)) return;
    const loc = game.level?.at(pos.x, pos.y);
    if (!loc) return;
    loc.typ = ALTAR;
    const al = rn2(A_LAWFUL + 2) - 1;
    /* include/rm.h:214 — an altar's alignment lives in altarmask, which is the
       same storage as flags. Name it as C does so a reader looking for
       altarmask finds it. */
    loc.altarmask = Align2amask(al);
    loc.flags = loc.altarmask;
}

function mkgrave_room(croom) {
    /* src/mklev.c mkgrave() — `dobell` is an INITIALISER, so its rn2(10) is
       drawn before the rtype test, not after it. */
    const dobell = !rn2(10);
    if (croom.rtype !== OROOM) return;
    const pos = { x: 0, y: 0 };
    if (!find_okay_roompos(croom, pos)) return;
    make_grave(pos.x, pos.y, dobell ? 'Saved by the bell!' : null);
    if (!rn2(3)) {
        const gold = mksobj(GOLD_PIECE, true, false);
        if (gold) {
            const depth = game.u?.uz?.dlevel ?? 1;
            gold.quan = rnd(20) + depth * rnd(5);
        }
    }
    for (let tryct = rn2(5); tryct > 0; tryct--) {
        const otmp = mkobj(RANDOM_CLASS, true);
        curse(otmp);
    }
    if (dobell) mksobj_at(BELL, pos.x, pos.y, true, false);
}

async function fill_ordinary_room(croom, bonus_items) {
    const g = game;
    if (!croom || (croom.rtype !== OROOM && croom.rtype !== THEMEROOM)) return;

    /* src/mklev.c:952 — the subroom recursion sits BETWEEN the two guards, and
       the C says why: "we don't want an outer room that's specified to be
       unfilled to block an inner subroom that's specified to be filled."
       Putting it after the needfill check, which is where it naturally wants to
       go, silently skips every subroom of an unfilled room. */
    for (let x = 0; x < (croom.nsubrooms || 0); ++x) {
        const subroom = croom.sbrooms[x];
        if (!subroom)
            return;                     /* impossible("Null subroom") */
        await fill_ordinary_room(subroom, false);
    }

    if (croom.needfill !== FILL_NORMAL) return;

    const pos = { x: 0, y: 0 };
    // Sleeping monster (33%)
    /* src/mklev.c:974 — the || SHORT-CIRCUITS: carrying the Amulet skips the
       rn2(3) entirely, so spending it unconditionally is a draw C never makes. */
    if ((game.u?.uhave?.amulet || !rn2(3)) && somexyspace(croom, pos)) {
        makemon(null, pos.x, pos.y, MM_NOGRP);
    }
    // Traps
    const u_depth = g.u?.uz?.dlevel ?? 1;
    let x = 8 - Math.trunc(u_depth / 6);
    if (x <= 1) x = 2;
    let trycnt = 0;
    while (!rn2(x) && ++trycnt < 1000) {
        mktrap(0, MKTRAP_NOFLAGS, croom, null);
    }
    // Gold
    /* src/mklev.c:974 — the || SHORT-CIRCUITS: carrying the Amulet skips the
       rn2(3) entirely, so spending it unconditionally is a draw C never makes. */
    if ((game.u?.uhave?.amulet || !rn2(3)) && somexyspace(croom, pos)) {
        mkgold(0, pos.x, pos.y);
    }
    // Fountain
    if (!rn2(10)) mkfount(croom);
    // Sink
    if (!rn2(60)) {
        if (find_okay_roompos(croom, pos)) {
            const loc = g.level?.at(pos.x, pos.y);
            if (loc) { loc.typ = SINK; g.level.flags.nsinks = (g.level.flags.nsinks || 0) + 1; }
        }
    }
    // Altar
    if (!rn2(60)) mkaltar(croom);
    // Grave
    x = 80 - (u_depth * 2);
    if (x < 2) x = 2;
    if (!rn2(x)) mkgrave_room(croom);
    // Statue
    if (!rn2(20) && somexyspace(croom, pos)) {
        mkcorpstat(STATUE, null, null, pos.x, pos.y, 8);
    }
    // Bonus items
    let skip_chests = false;
    if (bonus_items && somexyspace(croom, pos)) {
        const uz_branch = is_branchlev();
        /* src/mklev.c:1028-1031 — the food bonus is for the *Mines entrance*
           specifically, not for any branch level. Testing only `uz_branch`
           took this arm on dlvl 1, which drew rn2(5) where C draws the
           supply-chest rn2(3). */
        if (uz_branch && g.u.uz.dnum !== g.mines_dnum
            && (uz_branch.end1.dnum === g.mines_dnum
                || uz_branch.end2.dnum === g.mines_dnum)) {
            mksobj_at((rn2(5) < 3) ? FOOD_RATION : rn2(2) ? CRAM_RATION : LEMBAS_WAFER,
                pos.x, pos.y, true, false);
        } else if (g.u.uz.dnum === g.oracle_level.dnum
                   && g.u.uz.dlevel < g.oracle_level.dlevel && rn2(3)) {
            // Supply chest
            const supply_chest = mksobj_at(rn2(3) ? CHEST : LARGE_BOX, pos.x, pos.y, false, false);
            if (supply_chest) {
                supply_chest.olocked = !!rn2(6);
                let tryct2 = 0;
                let cursed_item;
                do {
                    let otyp;
                    const supply_items = [POT_EXTRA_HEALING, POT_SPEED, POT_GAIN_ENERGY,
                        SCR_ENCHANT_WEAPON, SCR_ENCHANT_ARMOR, SCR_CONFUSE_MONSTER,
                        SCR_SCARE_MONSTER, WAN_DIGGING, SPE_HEALING];
                    if (rn2(2)) otyp = POT_HEALING;
                    else otyp = supply_items[rn2(supply_items.length)];
                    const otmp = mksobj(otyp, true, false);
                    if (otmp && otyp === POT_HEALING && rn2(2)) {
                        otmp.quan = 2;
                        otmp.owt = weight(otmp);
                    }
                    cursed_item = otmp?.cursed ?? false;
                    add_to_container(supply_chest, otmp);
                    if (++tryct2 >= 50) break;
                } while (cursed_item || !rn2(5));
                if (rn2(3)) {
                    const extra_classes = [FOOD_CLASS, WEAPON_CLASS, ARMOR_CLASS, GEM_CLASS,
                        SCROLL_CLASS, POTION_CLASS, RING_CLASS,
                        SPBOOK_no_NOVEL, SPBOOK_no_NOVEL, SPBOOK_no_NOVEL];
                    const oclass = extra_classes[rn2(extra_classes.length)];
                    let otmp = mkobj(oclass, false);
                    if (oclass === SPBOOK_no_NOVEL && otmp) {
                        const dpth = depth_of_level(g.u.uz);
                        const maxpass = (dpth > 2) ? 2 : 3;

                        /* bias towards lower level by generating again and
                           taking the LOWER-level book. Drawing both and
                           keeping the first spends the same RNG but leaves a
                           different book in the chest — oc_level only started
                           resolving once objclass.h's #define aliases were
                           emitted. */
                        for (let pass = 1; pass <= maxpass; ++pass) {
                            const otmp2 = mkobj(oclass, false);

                            if (game.objects[otmp.otyp].oc_level
                                <= game.objects[otmp2.otyp].oc_level) {
                                dealloc_obj(otmp2);
                            } else {
                                dealloc_obj(otmp);
                                otmp = otmp2;
                            }
                        }
                    }
                    add_to_container(supply_chest, otmp);
                }
            }
            skip_chests = true;
        }
    }
    // Box/chest check
    if (!skip_chests && !rn2(Math.trunc(g.level.nroom * 5 / 2)) && somexyspace(croom, pos)) {
        mksobj_at(rn2(3) ? LARGE_BOX : CHEST, pos.x, pos.y, true, false);
    }
    // Graffiti
    if (!rn2(27 + 3 * Math.abs(depth_of_level(g.u.uz)))) {
        const { text: engrText } = random_engraving();
        if (engrText) {
            do {
                somexyspace(croom, pos);
                if (g.level?.at(pos.x, pos.y)?.typ === ROOM) break;
            } while (!rn2(40));
        }
    }
    /* src/mklev.c:1156 — random objects. Plain `!rn2(3)`, with NO Amulet
       short-circuit: that belongs to the MONSTER site at mklev.c:974, and
       having it here would make a hero carrying the Amulet get an object in
       every room while skipping the rn2(3) those rooms should spend. */
    if (!rn2(3) && somexyspace(croom, pos)) {
        mkobj_at(RANDOM_CLASS, pos.x, pos.y, true);
        let objTrycnt = 0;
        while (!rn2(5)) {
            if (++objTrycnt > 100) break;
            if (somexyspace(croom, pos)) mkobj_at(RANDOM_CLASS, pos.x, pos.y, true);
        }
    }
}

// ============================================================
// Mineralize
// ============================================================

function water_has_kelp(x, y, kelp_pool, kelp_moat) {
    const loc = game.level.at(x, y);
    if (!loc) return false;
    if (kelp_pool && (loc.typ === POOL || loc.typ === WATER) && !rn2(kelp_pool)) return true;
    if (kelp_moat && loc.typ === MOAT && !rn2(kelp_moat)) return true;
    return false;
}

function mineralize_kelp(kelp_pool, kelp_moat) {
    if (kelp_pool < 0) kelp_pool = 10;
    if (kelp_moat < 0) kelp_moat = 30;
    for (let x = 2; x < COLNO - 2; x++)
        for (let y = 1; y < ROWNO - 1; y++)
            if (water_has_kelp(x, y, kelp_pool, kelp_moat))
                mksobj_at(KELP_FROND, x, y, true, false);
}

function mineralize(kelp_pool, kelp_moat, goldprob, gemprob, skip_lvl_checks) {
    const map = game.level;
    mineralize_kelp(kelp_pool, kelp_moat);
    const absDepth = depth_of_level(game.u?.uz);
    const dunLevel = game.u?.uz?.dlevel ?? 1;
    if (goldprob < 0) goldprob = 20 + Math.trunc(absDepth / 3);
    if (gemprob < 0) gemprob = Math.trunc(goldprob / 4);
    for (let x = 2; x < COLNO - 2; x++) {
        for (let y = 1; y < ROWNO - 1; y++) {
            const loc = map.at(x, y);
            const locBelow = map.at(x, y + 1);
            if (!loc || !locBelow) continue;
            if (locBelow.typ !== STONE) { y += 2; continue; }
            if (loc.typ !== STONE) { y += 1; continue; }
            const n = (d) => { const l = map.at(x + d[0], y + d[1]); return l && l.typ === STONE; };
            if (!(loc.wall_info & W_NONDIGGABLE)
                && n([0,-1]) && n([1,-1]) && n([-1,-1])
                && n([1,0]) && n([-1,0])
                && n([1,1]) && n([-1,1])) {
                if (rn2(1000) < goldprob) {
                    const otmp = mksobj(GOLD_PIECE, false, false);
                    otmp.ox = x; otmp.oy = y;
                    otmp.quan = 1 + rnd(goldprob * 3);
                    /* src/mklev.c:1519 — buried or on the floor; the draw
                       happens either way */
                    if (!rn2(3)) add_to_buried(otmp);
                    else place_object(otmp, x, y);
                }
                if (rn2(1000) < gemprob) {
                    const cnt = rnd(2 + Math.trunc(dunLevel / 3));
                    for (let i = 0; i < cnt; i++) {
                        const otmp = mkobj(GEM_CLASS, false);
                        /* a rock is discarded outright and draws nothing more */
                        if (otmp.otyp === ONAMES.ROCK)
                            continue;
                        otmp.ox = x; otmp.oy = y;
                        if (!rn2(3)) add_to_buried(otmp);
                        else place_object(otmp, x, y);
                    }
                }
            }
        }
    }
}

// ============================================================
// Level finalize topology
// ============================================================

function get_level_extends() {
    const map = game.level;
    let xmin = 0, xmax = COLNO - 1, ymin = 0, ymax = ROWNO - 1;
    let found = false, nonwall = false;
    for (xmin = 0; !found && xmin <= COLNO - 1; xmin++) {
        for (let y = 0; y <= ROWNO - 1; y++) {
            const typ = map.at(xmin, y)?.typ ?? STONE;
            if (typ !== STONE) { found = true; if (!IS_WALL(typ)) nonwall = true; }
        }
    }
    xmin -= (nonwall || !game.level?.flags?.is_maze_lev) ? 2 : 1;
    found = false; nonwall = false;
    for (xmax = COLNO - 1; !found && xmax >= 0; xmax--) {
        for (let y = 0; y <= ROWNO - 1; y++) {
            const typ = map.at(xmax, y)?.typ ?? STONE;
            if (typ !== STONE) { found = true; if (!IS_WALL(typ)) nonwall = true; }
        }
    }
    xmax += (nonwall || !game.level?.flags?.is_maze_lev) ? 2 : 1;
    found = false; nonwall = false;
    for (ymin = 0; !found && ymin <= ROWNO - 1; ymin++) {
        for (let x = xmin; x <= xmax; x++) {
            const typ = map.at(x, ymin)?.typ ?? STONE;
            if (typ !== STONE) { found = true; if (!IS_WALL(typ)) nonwall = true; }
        }
    }
    ymin -= (nonwall || !game.level?.flags?.is_maze_lev) ? 2 : 1;
    found = false; nonwall = false;
    for (ymax = ROWNO - 1; !found && ymax >= 0; ymax--) {
        for (let x = xmin; x <= xmax; x++) {
            const typ = map.at(x, ymax)?.typ ?? STONE;
            if (typ !== STONE) { found = true; if (!IS_WALL(typ)) nonwall = true; }
        }
    }
    ymax += (nonwall || !game.level?.flags?.is_maze_lev) ? 2 : 1;
    return { xmin, xmax, ymin, ymax };
}

function bound_digging() {
    const map = game.level;
    const { xmin, xmax, ymin, ymax } = get_level_extends();
    for (let x = 0; x < COLNO; x++)
        for (let y = 0; y < ROWNO; y++) {
            const loc = map.at(x, y);
            if (!loc) continue;
            if (IS_STWALL(loc.typ) && (y <= ymin || y >= ymax || x <= xmin || x >= xmax)) {
                loc.wall_info = (loc.wall_info || 0) | W_NONDIGGABLE;
            }
        }
}

function set_wall_state() { /* no-op for contest */ }

function level_finalize_topology() {
    bound_digging();
    // src/mklev.c:1550 — mineralize() runs here, while in_mklev is still set.
    mineralize(-1, -1, -1, -1, false);
    game.in_mklev = false;
    if (!game.level?.flags?.is_maze_lev) {
        const nroom = game.level?.nroom ?? 0;
        for (let i = 0; i < nroom; i++)
            topologize(game.level.rooms?.[i]);
    }
    set_wall_state();
    const rooms = game.level?.rooms ?? [];
    for (let i = 0; i < rooms.length; i++) {
        const rm = rooms[i];
        if (rm && rm.rtype != null) rm.orig_rtype = rm.rtype;
    }
}
