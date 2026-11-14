// mkroom.js — stub module; fill_zoo implementation lives in mklev.js
// (all helper functions require mklev.js internals; co-located there to avoid
//  circular ES-module dependency).
// C ref: nethack-c/src/mkroom.c
import { game } from './gstate.js';
import { ANY_TYPE, ANY_SHOP, OROOM, SHOPBASE } from './const.js';
import { IS_DOOR, SDOOR, isok } from './const.js';
import { ALTAR, AM_SHRINE, ANTHOLE, BARRACKS, BEEHIVE, BUFSZ, COCKNEST, CORR, COURT, FILL_NORMAL, FODDERSHOP, G_GONE, ICE, IS_ROOM, IS_WALL, In_endgame, LEPREHALL, MORGUE, NO_MM_FLAGS, POOL, ROOM, ROOMOFFSET, SPACE_POS, SWAMP, S_FUNGUS, TEMPLE, THRONE, ZOO } from './const.js'; // relocate-fns
import { def_oc_syms_chars } from './drawing.js'; // relocate-fns
import { wizard } from './gstate.js'; // relocate-fns
import { dist2, distmin } from './hacklib.js'; // relocate-fns
import { ENV } from './hostenv.js'; // relocate-fns
import { mongets } from './makemon.js'; // relocate-fns
import { Inhell, is_ndemon, levelDifficulty, mkclass, mkclassAligned, permonstTemplate, set_malign } from './makemon.js'; // relocate-fns
import { A_NONE, CHEST, CORPSE, FOOD_CLASS, GOLD_PIECE, LARGE_BOX, LUMP_OF_ROYAL_JELLY, MM_ASLEEP, MM_NOGRP, PM_GHOST, PM_SOLDIER, PM_WRAITH, RANDOM_CLASS, SPBOOK_CLASS, STATUE, S_DEMON, S_GIANT, S_GNOME, S_KOBOLD, S_ORC, S_TROLL, S_VAMPIRE, S_ZOMBIE, WAND_CLASS, _shtypes, occupied, topologize, weight } from './mklev.js';
import { add_to_container, mk_tt_object, mkgold, mkobj, mkobj_at, mksobj, mksobj_at } from './mkobj.js';
import { makemon } from './makemon.js';
import { del_engr_at, make_grave } from './engrave.js'; // relocate-fns
import { impossible as lifecycle_impossible } from './pline.js'; // relocate-fns
import { PM_COCKATRICE, PM_ELECTRIC_EEL, PM_GIANT_EEL, PM_KILLER_BEE, PM_LEPRECHAUN, PM_PIRANHA, PM_QUEEN_BEE } from './pm.generated.js'; // relocate-fns
import { priestini } from './priest.js'; // relocate-fns
import { pushRngLogEntry, rn1 } from './rng.js';
import { rn2, rnd } from './rnd.js'; // relocate-fns
import { induced_align } from './dungeon.js'; // relocate-fns
import { t_at } from './trap.js'; // relocate-fns
import { level_difficulty } from './dungeon.js'; // relocate-fns
import { sobj_at } from './invent.js'; // relocate-fns
import { makemon as mklev_makemon } from './makemon.js'; // relocate-fns
import { enexto_out as enexto } from './teleport.js'; // relocate-fns
import { revive } from './zap.js'; // relocate-fns
import { AIR, BLCORNER, BRCORNER, CLOUD, CROSSWALL, DBWALL, DOOR, DRAWBRIDGE_DOWN, FOUNTAIN, GRAVE, HWALL, IRONBARS, LADDER, LAVAPOOL, LAVAWALL, SINK, STAIRS, STONE, TDWALL, TLCORNER, TLWALL, TRCORNER, TREE, TRWALL, TUWALL, VWALL, WATER } from './const.js'; // relocate-fns
import { S_AIR_C, S_ALTAR_C, S_BARS_C, S_BLCORN_C, S_BRCORN_C, S_CLOUD_C, S_CORR_C, S_CRWALL_C, S_DARKROOM_C, S_DNLADDER_C, S_DNSTAIR_C, S_FOUNTAIN_C, S_GRAVE_C, S_HCDBRIDGE_C, S_HCDOOR_C, S_HODBRIDGE_C, S_HODOOR_C, S_HWALL_C, S_ICE_C, S_LAVAWALL_C, S_LAVA_C, S_LITCORR_C, S_NDOOR_C, S_POOL_C, S_ROOM_C, S_SINK_C, S_STONE_C, S_TDWALL_C, S_THRONE_C, S_TLCORN_C, S_TLWALL_C, S_TRCORN_C, S_TREE_C, S_TRWALL_C, S_TUWALL_C, S_UPLADDER_C, S_UPSTAIR_C, S_VCDBRIDGE_C, S_VCDOOR_C, S_VODBRIDGE_C, S_VODOOR_C, S_VWALL_C, S_WATER_C } from './display.js'; // relocate-fns

/* C ref: mkroom.c:765-781 search_special(schar type)
 *
 *   for (croom = &svr.rooms[0]; croom->hx >= 0; croom++)
 *       if ((type == ANY_TYPE && croom->rtype != OROOM)
 *           || (type == ANY_SHOP && croom->rtype >= SHOPBASE)
 *           || croom->rtype == type)
 *           return croom;
 *   for (croom = &gs.subrooms[0]; croom->hx >= 0; croom++)
 *       ... same test ...
 *   return (struct mkroom *) 0;
 *
 * Both C loops terminate on the `hx < 0` sentinel room, which the port already
 * writes: add_room() (js/mklev.js:6027-6029) and rest_rooms() above both plant
 * `{ hx: -1 }` one past the last live room.  Mirror that termination exactly
 * rather than iterating to array length, so a stale slot past the sentinel can
 * never be returned (C would never see it).
 *
 * Returns the room OBJECT (C returns the struct pointer); null for C's NULL. */
export function search_special(type) {
    const t = type | 0;
    const matches = (croom) => (
        (t === ANY_TYPE && (croom.rtype | 0) !== OROOM)
        || (t === ANY_SHOP && (croom.rtype | 0) >= SHOPBASE)
        || (croom.rtype | 0) === t
    );
    const rooms = game.level?.rooms ?? [];
    for (let i = 0; i < rooms.length; i++) {
        const croom = rooms[i];
        if (!croom || (croom.hx | 0) < 0)
            break;
        if (matches(croom))
            return croom;
    }
    const subrooms = game.level?._subrooms ?? [];
    for (let i = 0; i < subrooms.length; i++) {
        const croom = subrooms[i];
        if (!croom || (croom.hx | 0) < 0)
            break;
        if (matches(croom))
            return croom;
    }
    return null;
}

// Sfi_int (savefile.h) — libc-level save-file field reader; no JS save-file
// byte model exists, so this is a faithful no-op stub (calls_macro_or_libc),
// same pattern as js/dungeon.js's / js/region.js's Sfi_int.
function Sfi_int(nhfp, val, name) { return val; }

// rest_room (mkroom.c staticfn).  Save-file room records are not represented
// subroom recursion and resident reset so restore callers still receive the
// same room graph when records were materialized by the bridge.
function rest_room(nhfp, r) {
    if (!r) return;
    const n = r.nsubrooms | 0;
    for (let i = 0; i < n; i++) {
        const child = r.sbrooms?.[i] || game.level?._subrooms?.[game.level._nsubroom];
        if (child) {
            rest_room(nhfp, child);
            child.resident = null;
            if (game.level?._subrooms)
                game.level._subrooms[game.level._nsubroom++] = child;
        }
    }
}

// C ref: mkroom.c:893 rest_rooms() — restore the rooms structure from disk.
export function rest_rooms(nhfp) {
    game.level.nroom = Sfi_int(nhfp, game.level.nroom, "room-nroom");

    game.level._nsubroom = 0;
    for (let i = 0; i < game.level.nroom; i++) {
        rest_room(nhfp, game.level.rooms[i]);
        game.level.rooms[i].resident = null;
    }
    game.level.rooms[game.level.nroom] = { hx: -1 }; // restore ending flags
    if (!game.level._subrooms)
        game.level._subrooms = [];
    game.level._subrooms[game.level._nsubroom] = { hx: -1 };
}

/* C mkroom.c:622-636 — boolean nexttodoor(int sx, int sy)
 *
 *   for (dx = -1; dx <= 1; dx++)
 *       for (dy = -1; dy <= 1; dy++) {
 *           if (!isok(sx + dx, sy + dy)) continue;
 *           lev = &levl[sx + dx][sy + dy];
 *           if (IS_DOOR(lev->typ) || lev->typ == SDOOR) return TRUE;
 *       }
 *   return FALSE;
 *
 * Note the loop includes dx == dy == 0, so a square that IS a door counts as
 * next to one.  Used by mkroom.c:553 (throne/zoo placement) and by fountain.c
 * gush(), which is the caller that put this on the board: a fountain overflow
 * refuses to flood any square adjacent to a doorway. */
export function nexttodoor(sx, sy) {
    for (let dx = -1; dx <= 1; dx++)
        for (let dy = -1; dy <= 1; dy++) {
            if (!isok(sx + dx, sy + dy))
                continue;
            const lev = game.level?.at(sx + dx, sy + dy);
            if (!lev)
                continue;
            if (IS_DOOR(lev.typ) || lev.typ === SDOOR)
                return true;
        }
    return false;
}

/** mkroom.c helpers: additional monster class symbols (defsym.h MONSYM) */
const S_DRAGON = 30;

const S_CENTAUR = 29;

/** mkroom.c pm indices — pm.generated.js authoritative; these are aliases via NAMS bn= */
const PM_BUGBEAR = 45; /* pm.generated.js PM_BUGBEAR = 45 */

const PM_HOBGOBLIN = 71; /* pm.generated.js PM_HOBGOBLIN = 71 */

/* Throne rulers — NAMS("..king","..queen","..ruler/tyrant/monarch"), bn→ = same mons[] index */
const PM_GNOME_RULER = 168; /* = PM_GNOME_KING in pm.generated.js */

const PM_DWARF_RULER = 47; /* = PM_DWARF_KING in pm.generated.js */

const PM_ELVEN_MONARCH = 269; /* = PM_ELVENKING in pm.generated.js */

const PM_OGRE_TYRANT = 205; /* = PM_OGRE_KING in pm.generated.js */

const PM_SERGEANT = 278;

const PM_LIEUTENANT = 280;

const PM_CAPTAIN = 281;

/* Anthole ants */
const PM_SOLDIER_ANT = 2;

const PM_FIRE_ANT = 3;

const PM_GIANT_ANT = 0;

/* MACE weapon (objects.h / m_initweap.js) */
const MACE_OTYP = 73; /* MACE — renamed to avoid collision */

/*
 * C mkroom.c:784-806 courtmon()
 * Returns PM_ index (or null if mkclass fails), mirroring C struct permonst*.
 * C ref: nethack-c/src/mkroom.c courtmon().
 */
export function courtmon() {
    const i = rn2(60) + rn2(3 * levelDifficulty());
    if (i > 100)
        return mkclass(S_DRAGON);
    else if (i > 95)
        return mkclass(S_GIANT);
    else if (i > 85)
        return mkclass(S_TROLL);
    else if (i > 75)
        return mkclass(S_CENTAUR);
    else if (i > 60)
        return mkclass(S_ORC);
    else if (i > 45)
        return PM_BUGBEAR;
    else if (i > 30)
        return PM_HOBGOBLIN;
    else if (i > 15)
        return mkclass(S_GNOME);
    else
        return mkclass(S_KOBOLD);
}

/*
 * C mkroom.c:479-500 morguemon()
 * Returns PM_ index or null.
 */
export function morguemon() {
    const i = rn2(100);
    const hd = rn2(levelDifficulty());
    if (hd > 10 && i < 10) {
        const uz = game.u?.uz;
        if (Inhell() || In_endgame(uz)) {
            return mkclass(S_DEMON);
        }
        else {
            /* C: ndemon(A_NONE) = mkclass_aligned(S_DEMON,0,A_NONE) + is_ndemon check */
            const pm = mkclassAligned(S_DEMON, 0, A_NONE);
            if (pm !== null && pm >= 0 && is_ndemon(permonstTemplate(pm)))
                return pm;
            /* else fall through */
        }
    }
    if (hd > 8 && i > 85)
        return mkclass(S_VAMPIRE);
    return (i < 20) ? PM_GHOST
        : (i < 40) ? PM_WRAITH
            : mkclass(S_ZOMBIE);
}

/*
 * C mkroom.c:818-838 squadmon()
 * Returns PM_ index or null (if type genocided/gone).
 */
function squadmon() {
    const squadprob = [
        { pm: PM_SOLDIER, prob: 80 },
        { pm: PM_SERGEANT, prob: 15 },
        { pm: PM_LIEUTENANT, prob: 4 },
        { pm: PM_CAPTAIN, prob: 1 },
    ];
    const sel_prob = rnd(80 + levelDifficulty());
    let cpro = 0, mndx = -1;
    for (let i = 0; i < squadprob.length; i++) {
        cpro += squadprob[i].prob;
        if (cpro > sel_prob) {
            mndx = squadprob[i].pm;
            break;
        }
    }
    if (mndx < 0)
        mndx = squadprob[rn2(squadprob.length)].pm;
    const mv = game.mvitals?.[mndx]?.mvflags | 0;
    return (mv & G_GONE) ? null : mndx;
}

/*
 * C mkroom.c:503-528 antholemon()
 * Returns PM_ index or null.
 * C uses ubirthday (time_t); JS tracks it as game.u.ubirthday (default 0).
 */
export function antholemon() {
    const ubirthday = game.u?.ubirthday ?? 0;
    let indx = (ubirthday | 0) % 3;
    indx += levelDifficulty();
    const anttypes = [PM_SOLDIER_ANT, PM_FIRE_ANT, PM_GIANT_ANT];
    let trycnt = 0, mtyp;
    do {
        mtyp = anttypes[(indx + trycnt) % 3];
    } while (++trycnt < 3 && (game.mvitals?.[mtyp]?.mvflags | 0) & G_GONE);
    return ((game.mvitals?.[mtyp]?.mvflags | 0) & G_GONE) ? null : mtyp;
}

/*
 * C mkroom.c:258-274 mk_zoo_thronemon(tx, ty)
 * Spawns a sleeping, hostile throne-room ruler and gives it a sceptre (MACE).
 * C: set_malign(mon) recomputes malign after mpeaceful = 0.
 * C: mongets(mon, MACE) — mksobj then add to minvent.
 */
async function mk_zoo_thronemon(tx, ty) {
    const i = rnd(levelDifficulty());
    const pm = (i > 9) ? PM_OGRE_TYRANT
        : (i > 5) ? PM_ELVEN_MONARCH
            : (i > 2) ? PM_DWARF_RULER
                : PM_GNOME_RULER;
    const mon = await makemon(pm, tx, ty, NO_MM_FLAGS);
    if (mon) {
        mon.msleeping = 1;
        mon.mpeaceful = 0;
        set_malign(mon); /* C mkroom.c:269 */
        /* C: mongets(mon, MACE) */
        /* mongets, not a bare mksobj + chain write: it applies the prince
         * "inferior quality battle gear" spe >= 1 fix (makemon.c:2218-2223),
         * which the throne-room ruler (M2_PRINCE) needs for its sceptre. */
        await mongets(mon, MACE_OTYP, mksobj);
    }
}

/*
 * C mkroom.c:277-453 fill_zoo(sroom)
 * Stock a special room with monsters and objects.
 * C ref: nethack-c/src/mkroom.c fill_zoo (line ~277).
 * Mirrors C control flow exactly for RNG parity.
 * Note: C's fill_zoo sets level.flags.has_* flags; JS fill_special_room already
 * sets them in its post-dispatch switch (sp_lev.c:2793+). To match C exactly
 * (which sets them inside fill_zoo), set them here too — the double-set is harmless.
 */
export async function fill_zoo(sroom) {
    const type = sroom.rtype | 0;
    const sh = sroom.fdoor | 0;
    let goldlim = 0;
    let tx = 0, ty = 0;
    /* C: rmno = (int)((sroom - svr.rooms) + ROOMOFFSET) */
    const rooms = game.level?.rooms ?? [];
    const roomIdx = rooms.indexOf(sroom);
    const rmno = (roomIdx >= 0 ? roomIdx : 0) + ROOMOFFSET;
    /* ── Phase 1: pre-loop setup ── */
    switch (type) {
        case COURT: {
            if (game.level?.flags?.is_maze_lev) {
                /* C: search for IS_THRONE tile; goto throne_placed if found */
                let found = false;
                outer_loop: for (let tx2 = sroom.lx; tx2 <= sroom.hx; tx2++) {
                    for (let ty2 = sroom.ly; ty2 <= sroom.hy; ty2++) {
                        if (game.level.at(tx2, ty2)?.typ === THRONE) {
                            tx = tx2;
                            ty = ty2;
                            found = true;
                            break outer_loop;
                        }
                    }
                }
                /* C: if IS_THRONE found, go to throne_placed skipping somexyspace loop */
                if (!found) {
                    let mm = { x: 0, y: 0 }, tries = 100;
                    do {
                        somexyspace(sroom, mm);
                        tx = mm.x;
                        ty = mm.y;
                    } while (_occupied(tx, ty) && --tries > 0);
                }
            }
            else {
                /* C: i=100; do { somexyspace; tx=mm.x; ty=mm.y } while (occupied && --i>0) */
                let mm = { x: 0, y: 0 }, tries = 100;
                do {
                    somexyspace(sroom, mm);
                    tx = mm.x;
                    ty = mm.y;
                } while (_occupied(tx, ty) && --tries > 0);
            }
            /* C: throne_placed: mk_zoo_thronemon(tx, ty) */
            await mk_zoo_thronemon(tx, ty);
            break;
        }
        case BEEHIVE: {
            /* C mkroom.c:307-317 — center cell for queen bee */
            tx = sroom.lx + Math.trunc((sroom.hx - sroom.lx + 1) / 2);
            ty = sroom.ly + Math.trunc((sroom.hy - sroom.ly + 1) / 2);
            if (sroom.irregular) {
                const loc = game.level?.at(tx, ty);
                if (!loc || (loc.roomno | 0) !== rmno || loc.edge) {
                    const mm = { x: 0, y: 0 };
                    somexyspace(sroom, mm);
                    tx = mm.x;
                    ty = mm.y;
                }
            }
            break;
        }
        case ZOO:
        case LEPREHALL:
            goldlim = 500 * levelDifficulty();
            break;
        default:
            break;
    }
    /* ── Phase 2: per-cell monster and object loop ── */
    for (let sx = sroom.lx; sx <= sroom.hx; sx++) {
        for (let sy = sroom.ly; sy <= sroom.hy; sy++) {
            const loc = game.level?.at(sx, sy);
            /* C mkroom.c:326-341 — skip ineligible cells */
            if (sroom.irregular) {
                if (!loc || (loc.roomno | 0) !== rmno || loc.edge)
                    continue;
                if (sroom.doorct) {
                    const door = (game.level?.doors ?? [])[sh];
                    if (door && distmin(sx, sy, door.x, door.y) <= 1)
                        continue;
                }
            }
            else {
                if (!loc || !SPACE_POS(loc.typ))
                    continue;
                if (sroom.doorct) {
                    const door = (game.level?.doors ?? [])[sh];
                    if (door) {
                        if ((sx === sroom.lx && door.x === sx - 1)
                            || (sx === sroom.hx && door.x === sx + 1)
                            || (sy === sroom.ly && door.y === sy - 1)
                            || (sy === sroom.hy && door.y === sy + 1))
                            continue;
                    }
                }
            }
            /* C mkroom.c:343-344 */
            if (type === COURT && loc?.typ === THRONE)
                continue;
            /* C mkroom.c:345-362 — pick monster type */
            let mdat;
            switch (type) {
                case COURT:
                    mdat = courtmon();
                    break;
                case BARRACKS:
                    mdat = squadmon();
                    break;
                case MORGUE:
                    mdat = morguemon();
                    break;
                case BEEHIVE:
                    mdat = (sx === tx && sy === ty) ? PM_QUEEN_BEE : PM_KILLER_BEE;
                    break;
                case LEPREHALL:
                    mdat = PM_LEPRECHAUN;
                    break;
                case COCKNEST:
                    mdat = PM_COCKATRICE;
                    break;
                case ANTHOLE:
                    mdat = antholemon();
                    break;
                default:
                    mdat = null;
                    break; /* ZOO → rndmonst */
            }
            /* C: makemon(mdat, sx, sy, MM_ASLEEP | MM_NOGRP) */
            const mon = await makemon(mdat, sx, sy, MM_ASLEEP | MM_NOGRP);
            if (mon) {
                mon.msleeping = 1;
                if (type === COURT && mon.mpeaceful) {
                    mon.mpeaceful = 0;
                    set_malign(mon); /* C mkroom.c:366 */
                }
            }
            /* C mkroom.c:370-419 — per-cell object placement */
            switch (type) {
                case ZOO:
                case LEPREHALL: {
                    let i;
                    if (sroom.doorct) {
                        const door = (game.level?.doors ?? [])[sh];
                        const distval = door ? dist2(sx, sy, door.x, door.y) : 0;
                        i = distval * distval; /* C: sq(distval) */
                    }
                    else {
                        i = goldlim;
                    }
                    if (i >= goldlim)
                        i = 5 * levelDifficulty();
                    goldlim -= i;
                    await mkgold(rn1(i, 10), sx, sy);
                    break;
                }
                case MORGUE:
                    if (!rn2(5))
                        await mk_tt_object(CORPSE, sx, sy);
                    if (!rn2(10))
                        await mksobj_at(rn2(3) ? LARGE_BOX : CHEST, sx, sy, true, false);
                    if (!rn2(5))
                        make_grave(sx, sy, null);
                    break;
                case BEEHIVE:
                    if (!rn2(3))
                        await mksobj_at(LUMP_OF_ROYAL_JELLY, sx, sy, true, false);
                    break;
                case BARRACKS:
                    if (!rn2(20))
                        await mksobj_at(rn2(3) ? LARGE_BOX : CHEST, sx, sy, true, false);
                    break;
                case COCKNEST:
                    if (!rn2(3)) {
                        const sobj = await mk_tt_object(STATUE, sx, sy);
                        if (sobj) {
                            for (let i2 = rn2(5); i2; i2--)
                                await add_to_container(sobj, (await mkobj(RANDOM_CLASS, false)));
                            sobj.owt = weight(sobj);
                        }
                    }
                    break;
                case ANTHOLE:
                    if (!rn2(3))
                        await mkobj_at(FOOD_CLASS, sx, sy, false);
                    break;
                default:
                    break;
            }
        }
    }
    /* ── Phase 3: post-loop (COURT chest+throne tile) ── */
    switch (type) {
        case COURT: {
            /* C mkroom.c:422-435 */
            const troneLoc = game.level?.at(tx, ty);
            if (troneLoc)
                troneLoc.typ = THRONE;
            const mm2 = { x: 0, y: 0 };
            somexyspace(sroom, mm2);
            const gold = await mksobj(GOLD_PIECE, true, false);
            if (gold) {
                gold.quan = rn1(50 * levelDifficulty(), 10);
                gold.owt = weight(gold);
            }
            const chest = await mksobj_at(CHEST, mm2.x, mm2.y, true, false);
            if (chest && gold) {
                await add_to_container(chest, gold);
                chest.owt = weight(chest);
                chest.spe = 2;
            }
            if (game.level?.flags)
                game.level.flags.has_court = true;
            break;
        }
        case BARRACKS:
            if (game.level?.flags)
                game.level.flags.has_barracks = true;
            break;
        case ZOO:
            if (game.level?.flags)
                game.level.flags.has_zoo = true;
            break;
        case MORGUE:
            if (game.level?.flags)
                game.level.flags.has_morgue = true;
            break;
        case SWAMP:
            if (game.level?.flags)
                game.level.flags.has_swamp = true;
            break;
        case BEEHIVE:
            if (game.level?.flags)
                game.level.flags.has_beehive = true;
            break;
        default:
            break;
    }
}

/*
 * _occupied(x, y) — check if a cell has a live monster.
 * Used by fill_zoo COURT throne-placement loop (C: occupied(tx,ty)).
 * Simplified: only check fmon chain (objects not relevant for throne spot).
 */
function _occupied(x, y) {
    for (let m = game.fmon; m; m = m.nmon) {
        if ((m.mhp | 0) < 1) continue; /* DEADMONSTER — C m_at reads the grid, which m_detach cleared */
        if (m.mx === x && m.my === y)
            return true;
    }
    return false;
}

// ============================================================
// Room helper functions
// ============================================================
/* C mkroom.c:665-677.  Exported (rather than re-derived) because
 * fixup_special()'s medusa arm in js/sp_lev.js calls both, and a second copy
 * would have to be kept in RNG lockstep with this one by hand. */
export function somex(croom) { return rn1(croom.hx - croom.lx + 1, croom.lx); }

export function somey(croom) { return rn1(croom.hy - croom.ly + 1, croom.ly); }

// C ref: mkroom.c inside_room()
export function inside_room(croom, x, y) {
    if (croom.irregular) {
        const idx = croom.roomnoidx ?? game.level.rooms.indexOf(croom);
        const i = idx + ROOMOFFSET;
        const loc = game.level.at(x, y);
        return !!(loc && !loc.edge && (loc.roomno | 0) === i);
    }
    return x >= croom.lx - 1 && x <= croom.hx + 1
        && y >= croom.ly - 1 && y <= croom.hy + 1;
}

// C ref: mkroom.c somexy()
export function somexy(croom, c) {
    let try_cnt = 0;
    let i;
    if (croom.irregular) {
        const idx = croom.roomnoidx ?? game.level.rooms.indexOf(croom);
        i = idx + ROOMOFFSET;
        while (try_cnt++ < 100) {
            c.x = somex(croom);
            c.y = somey(croom);
            const loc = game.level.at(c.x, c.y);
            if (loc && !loc.edge && (loc.roomno | 0) === i)
                return true;
        }
        for (c.x = croom.lx; c.x <= croom.hx; c.x++) {
            for (c.y = croom.ly; c.y <= croom.hy; c.y++) {
                const loc = game.level.at(c.x, c.y);
                if (loc && !loc.edge && (loc.roomno | 0) === i)
                    return true;
            }
        }
        return false;
    }
    if (!croom.nsubrooms) {
        c.x = somex(croom);
        c.y = somey(croom);
        return true;
    }
    outer: while (try_cnt++ < 100) {
        c.x = somex(croom);
        c.y = somey(croom);
        const loc = game.level.at(c.x, c.y);
        if (loc && IS_WALL(loc.typ))
            continue;
        const nsub = croom.nsubrooms | 0;
        for (i = 0; i < nsub; i++) {
            const sb = croom.sbrooms[i];
            if (inside_room(sb, c.x, c.y))
                continue outer;
        }
        break;
    }
    if (try_cnt >= 100)
        return false;
    return true;
}

export function somexyspace(croom, c) {
    pushRngLogEntry('>somexyspace');
    let trycnt = 0;
    let okay;
    do {
        okay = somexy(croom, c) && isok(c.x, c.y) && !occupied(c.x, c.y);
        if (okay) {
            const loc = game.level.at(c.x, c.y);
            okay = loc && (loc.typ === ROOM || loc.typ === CORR || loc.typ === ICE);
        }
    } while (trycnt++ < 100 && !okay);
    pushRngLogEntry(`<somexyspace=${okay ? 1 : 0}`);
    return okay;
}

// ============================================================
// C ref: mkroom.c do_mkroom/mkshop/pick_room/isbig/invalid_shop_shape,
//        mklev.c:1352-1383 makelevel special-room else-if chain.
// ============================================================
// C ref: mkroom.c:43 isbig()
function isbig(sroom) {
    const area = (sroom.hx - sroom.lx + 1) * (sroom.hy - sroom.ly + 1);
    return area > 20;
}

// C ref: mkroom.c:641 has_dnstairs()
export function has_dnstairs(sroom) {
    for (let st = game.stairs; st; st = st.next)
        if (!st.up && inside_room(sroom, st.sx, st.sy))
            return true;
    return false;
}

// C ref: mkroom.c:654 has_upstairs()
export function has_upstairs(sroom) {
    for (let st = game.stairs; st; st = st.next)
        if (st.up && inside_room(sroom, st.sx, st.sy))
            return true;
    return false;
}

// C ref: mkroom.c:1051 invalid_shop_shape() — consumes no RNG.
async function invalid_shop_shape(sroom) {
    const g = game;
    const door = (g.level?.doors ?? [])[sroom.fdoor | 0];
    if (!door)
        return true;
    const doorx = door.x, doory = door.y;
    let insidex = 0, insidey = 0, insidect = 0;
    for (let x = Math.max(doorx - 1, sroom.lx); x <= Math.min(doorx + 1, sroom.hx); x++) {
        for (let y = Math.max(doory - 1, sroom.ly); y <= Math.min(doory + 1, sroom.hy); y++) {
            const loc = g.level.at(x, y);
            if (loc && loc.typ === ROOM) {
                insidex = x;
                insidey = y;
                insidect++;
            }
        }
    }
    if (insidect < 1) {
        await lifecycle_impossible("invalid_shop_shape: no squares inside door?");
        return true;
    }
    if (insidect === 1) {
        insidect = 0;
        for (let x = Math.max(insidex - 1, sroom.lx); x <= Math.min(insidex + 1, sroom.hx); x++) {
            for (let y = Math.max(insidey - 1, sroom.ly); y <= Math.min(insidey + 1, sroom.hy); y++) {
                if (x === insidex && y === insidey)
                    continue;
                const loc = g.level.at(x, y);
                if (loc && loc.typ === ROOM)
                    insidect++;
            }
        }
        if (insidect === 1)
            return true;
    }
    return false;
}

// C ref: mkroom.c:96 mkshop()
async function mkshop() {
    const g = game;
    let i = -1;
    const ep = wizard() ? (g.env?.SHOPTYPE ?? ENV.SHOPTYPE) : null;
    if (ep != null && ep.length <= BUFSZ / 2) { // options.c:6848 nh_getenv() length limit
        const c = (ep[0] || '\0').toLowerCase();
        const types = { z: ZOO, m: MORGUE, b: BEEHIVE, t: COURT, '\\': COURT, s: BARRACKS, a: ANTHOLE, c: COCKNEST, l: LEPREHALL };
        if (types[c] != null) { mkzoo(types[c]); return; }
        if (c === '_') { await mktemple(); return; }
        if (c === '}') { await mkswamp(); return; }
        i = _shtypes.findIndex(t => (def_oc_syms_chars[t.symb] ?? '\0') === (ep[0] || '\0'));
        if (i < 0 && (c === 'g' || c === 'v')) i = c === 'g' ? 0 : FODDERSHOP - SHOPBASE;
    }
    /* gottype: scan rooms for first eligible shop room */
    let sroom = null;
    const rooms = g.level.rooms;
    for (let idx = 0;; idx++) {
        const r = rooms[idx];
        // C: if (sroom->hx < 0) return;  (rooms[] terminated by hx<0)
        if (!r || r.hx < 0)
            return;
        if (idx >= g.level.nroom) {
            await lifecycle_impossible("rooms[] not closed by -1?");
            return;
        }
        if (r.rtype !== OROOM)
            continue;
        if (has_dnstairs(r) || has_upstairs(r))
            continue;
        if ((r.doorct | 0) === 1 || (ep != null && ep.length <= BUFSZ / 2 && (r.doorct | 0) !== 0)) {
            if (await invalid_shop_shape(r))
                continue;
            sroom = r;
            break;
        }
    }
    /* C: light the room if not already lit */
    if (!sroom.rlit) {
        for (let x = sroom.lx - 1; x <= sroom.hx + 1; x++)
            for (let y = sroom.ly - 1; y <= sroom.hy + 1; y++) {
                const loc = g.level.at(x, y);
                if (loc)
                    loc.lit = 1;
            }
        sroom.rlit = 1;
    }
    if (i < 0) {
        /* C: pick a shop type at random via rnd(100) weighted by shtypes[].prob */
        let j = rnd(100);
        i = 0;
        while ((j -= _shtypes[i].prob) > 0)
            i++;
        /* big rooms cannot be wand or book shops -> general store */
        if (isbig(sroom) && (_shtypes[i].symb === WAND_CLASS || _shtypes[i].symb === SPBOOK_CLASS))
            i = 0;
    }
    sroom.rtype = SHOPBASE + i;
    topologize(sroom);
    /* C: stocked later in makelevel along with other special rooms */
    sroom.needfill = FILL_NORMAL;
}

// C ref: mkroom.c:220 pick_room() — used by mkzoo/mkswamp/mktemple bodies.
function pick_room(strict) {
    const g = game;
    const nroom = g.level.nroom | 0;
    if (nroom <= 0)
        return null;
    let idx = rn2(nroom);
    for (let count = nroom; count-- > 0; idx++) {
        if (idx === nroom)
            idx = 0;
        const sroom = g.level.rooms[idx];
        if (!sroom || sroom.hx < 0)
            return null;
        if (sroom.rtype !== OROOM)
            continue;
        if (!strict) {
            if (has_upstairs(sroom) || (has_dnstairs(sroom) && rn2(3)))
                continue;
        }
        else if (has_upstairs(sroom) || has_dnstairs(sroom))
            continue;
        /* C mkroom.c:238: `if (sroom->doorct == 1 || !rn2(5) || wizard)`.  C's ||
         * short-circuits left-to-right, so the wizard test never suppresses the
         * rn2(5) draw — it only rescues a room the rn2 rejected.  `wizard` is C's
         * debug playmode (js/options.js sets game.flags.debug for playmode:debug,
         * the same predicate js/cmd.js dopray() uses for pray.c:2233). */
        if ((sroom.doorct | 0) === 1 || !rn2(5) || !!(g.flags && g.flags.debug))
            return sroom;
    }
    return null;
}

// C ref: mkroom.c:245-256 mkzoo(int type) — pick an unused room and mark it as
// the given special type.  It does NOT stock the room: the C comment is
// explicit ("room does not get stocked at this time - it will get stocked at the
// end of makelevel()"), and the stocking runs through fill_special_room() →
// fill_zoo(), which is already ported (js/mklev.js:2764/2512).  All RNG mkzoo
// consumes is pick_room()'s.
function mkzoo(type) {
    const sroom = pick_room(false);
    if (sroom) {
        sroom.rtype = type;
        sroom.needfill = FILL_NORMAL;
    }
}

// C ref: mkroom.c:53 do_mkroom()
/* C ref: mkroom.c:585-597 shrine_pos(roomno) — the centre square of a room,
 * nudged by one on either odd axis.  Returns a coord; C hands back a pointer
 * to a static buf, which every caller copies out of before the next call. */
function shrine_pos(roomno) {
    const troom = game.level.rooms[roomno - ROOMOFFSET];
    const buf = { x: 0, y: 0 };
    let delta;

    /* if width and height are odd, placement will be the exact center;
       if either or both are even, center point is a hypothetical spot
       between map locations and placement will be adjacent to that */
    delta = (troom.hx | 0) - (troom.lx | 0);
    buf.x = (troom.lx | 0) + Math.trunc(delta / 2);
    if ((delta % 2) && rn2(2))
        buf.x++;
    delta = (troom.hy | 0) - (troom.ly | 0);
    buf.y = (troom.ly | 0) + Math.trunc(delta / 2);
    if ((delta % 2) && rn2(2))
        buf.y++;
    return buf;
}

/* C ref: mkroom.c:598-620 mktemple() —
 *
 *     if (!(sroom = pick_room(TRUE))) return;
 *     sroom->rtype = TEMPLE;
 *     shrine_spot = shrine_pos((int) ((sroom - svr.rooms) + ROOMOFFSET));
 *     lev = &levl[shrine_spot->x][shrine_spot->y];
 *     lev->typ = ALTAR;
 *     lev->altarmask = induced_align(80);
 *     priestini(&u.uz, sroom, shrine_spot->x, shrine_spot->y, FALSE);
 *     lev->altarmask |= AM_SHRINE;
 *     svl.level.flags.has_temple = 1;
 *
 * The AM_SHRINE bit is set AFTER priestini(), not before: priestini reads the
 * altar's alignment mask while placing the priest, so the order is load-bearing
 * and is kept. */
async function mktemple() {
    const g = game;
    const sroom = pick_room(true);
    if (!sroom)
        return;

    /* set up Priest and shrine */
    sroom.rtype = TEMPLE;
    const roomno = g.level.rooms.indexOf(sroom) + ROOMOFFSET;
    const shrine_spot = shrine_pos(roomno);
    const lev = g.level.at(shrine_spot.x, shrine_spot.y);
    if (lev) {
        lev.typ = ALTAR;
        lev.altarmask = induced_align(80);
    }
    await priestini(g.u.uz, sroom, shrine_spot.x, shrine_spot.y, false);
    if (lev)
        lev.altarmask = (lev.altarmask | 0) | AM_SHRINE;
    g.level.flags.has_temple = 1;
}

// C ref: mkroom.c:567-... mkswamp() — turn up to 5 rooms swampy.
async function mkswamp() {
    const g = game;
    let eelct = 0;
    for (let i = 0; i < 5; i++) {
        const sroom = g.level.rooms[rn2(g.level.nroom | 0)];
        if (!sroom || sroom.hx < 0 || sroom.rtype !== OROOM || has_upstairs(sroom)
            || has_dnstairs(sroom))
            continue;
        const rmno = g.level.rooms.indexOf(sroom) + ROOMOFFSET;
        sroom.rtype = SWAMP;
        for (let sx = sroom.lx; sx <= sroom.hx; sx++)
            for (let sy = sroom.ly; sy <= sroom.hy; sy++) {
                const lev = g.level.at(sx, sy);
                if (!IS_ROOM(lev.typ) || (lev.roomno | 0) !== rmno)
                    continue;
                let monAt = false;
                for (let m = g.fmon; m; m = m.nmon)
                    if ((m.mhp | 0) >= 1 && m.mx === sx && m.my === sy) { monAt = true; break; }
                if (!g.level.levelObjects?.[sx]?.[sy] && !monAt && !t_at(sx, sy)
                    && !nexttodoor(sx, sy)) {
                    if ((sx + sy) % 2) {
                        del_engr_at(sx, sy);
                        lev.typ = POOL;
                        if (!eelct || !rn2(4)) {
                            await makemon(rn2(5) ? PM_GIANT_EEL
                                : rn2(2) ? PM_PIRANHA : PM_ELECTRIC_EEL,
                                sx, sy, NO_MM_FLAGS);
                            eelct++;
                        }
                    } else if (!rn2(4)) { /* swamps tend to be moldy */
                        await makemon(mkclass(S_FUNGUS, 0), sx, sy, NO_MM_FLAGS);
                    }
                }
            }
        g.level.flags.has_swamp = 1;
    }
}

export async function do_mkroom(roomtype) {
    if (roomtype >= SHOPBASE) {
        await mkshop();
        return;
    }
    switch (roomtype) {
    case COURT:     mkzoo(COURT);     break;
    case ZOO:       mkzoo(ZOO);       break;
    case BEEHIVE:   mkzoo(BEEHIVE);   break;
    case MORGUE:    mkzoo(MORGUE);    break;
    case BARRACKS:  mkzoo(BARRACKS);  break;
    case LEPREHALL: mkzoo(LEPREHALL); break;
    case COCKNEST:  mkzoo(COCKNEST);  break;
    case ANTHOLE:   mkzoo(ANTHOLE);   break;
    case SWAMP:
        await mkswamp();
        break;
    case TEMPLE:
        await mktemple();
        break;
    default:
        await lifecycle_impossible("Tried to make a room of type %d.", roomtype);
        break;
    }
}

/* C mkroom.c:452-473 mkundead(coord *mm, boolean revive_corpses, int mm_flags)
 * — make a swarm of undead, reviving existing corpses with zap.c revive(). */
export async function mkundead(mm, revive_corpses, mm_flags) {
    let cnt = Math.trunc((level_difficulty() + 1) / 10) + rnd(5);
    let cc, otmp;
    while (cnt-- > 0) {
        const mdat = morguemon();
        /* C mkroom.c:468-472 */
        if (mdat != null && (cc = enexto(mm.x, mm.y, permonstTemplate(mdat)))
            && (!revive_corpses
                || !(otmp = sobj_at(CORPSE, cc.x, cc.y))
                || !(await revive(otmp, false))))
            await mklev_makemon(mdat, cc.x, cc.y, mm_flags);
    }
    if (game.level && game.level.flags)
        game.level.flags.graveyard = true;
}

export function cmap_to_type(sym) {
    switch (sym | 0) {
    case S_STONE_C:     return STONE;
    case S_VWALL_C:     return VWALL;
    case S_HWALL_C:     return HWALL;
    case S_TLCORN_C:    return TLCORNER;
    case S_TRCORN_C:    return TRCORNER;
    case S_BLCORN_C:    return BLCORNER;
    case S_BRCORN_C:    return BRCORNER;
    case S_CRWALL_C:    return CROSSWALL;
    case S_TUWALL_C:    return TUWALL;
    case S_TDWALL_C:    return TDWALL;
    case S_TLWALL_C:    return TLWALL;
    case S_TRWALL_C:    return TRWALL;
    case S_NDOOR_C:
    case S_VODOOR_C:
    case S_HODOOR_C:
    case S_VCDOOR_C:
    case S_HCDOOR_C:    return DOOR;
    case S_BARS_C:      return IRONBARS;
    case S_TREE_C:      return TREE;
    case S_ROOM_C:
    case S_DARKROOM_C:  return ROOM;
    case S_CORR_C:
    case S_LITCORR_C:   return CORR;
    case S_UPSTAIR_C:
    case S_DNSTAIR_C:   return STAIRS;
    case S_UPLADDER_C:
    case S_DNLADDER_C:  return LADDER;
    case S_ALTAR_C:     return ALTAR;
    case S_GRAVE_C:     return GRAVE;
    case S_THRONE_C:    return THRONE;
    case S_SINK_C:      return SINK;
    case S_FOUNTAIN_C:  return FOUNTAIN;
    case S_POOL_C:      return POOL;
    case S_ICE_C:       return ICE;
    case S_LAVA_C:      return LAVAPOOL;
    case S_VODBRIDGE_C:
    case S_HODBRIDGE_C: return DRAWBRIDGE_DOWN;
    case S_VCDBRIDGE_C:
    case S_HCDBRIDGE_C: return DBWALL;
    case S_AIR_C:       return AIR;
    case S_CLOUD_C:     return CLOUD;
    case S_WATER_C:     return WATER;
    case S_LAVAWALL_C:  return LAVAWALL;
    default:            return STONE; /* C's "catchall" initialiser */
    }
}
