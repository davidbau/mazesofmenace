// mkroom.js — special rooms: shops, zoos, temples, swamps.
// C ref: src/mkroom.c
//
// makelevel() makes up to ONE special room per level, chosen by a chain of
// depth-gated else-ifs (src/mklev.c:1344). That chain was missing entirely,
// and with it the rn2(u_depth) the shop arm draws. It is not a deep-level
// concern: the shop gate is rn2(u_depth) < 3, so at depths 2 and 3 a shop is
// made EVERY time there are enough rooms.
//
// Only the shop path is ported so far. mkzoo, mkswamp and mktemple are absent
// and recorded, so do_mkroom's other arms are honest holes rather than stubs.

import { game } from './gstate.js';
import { rnd, rn2, rn1 } from './rng.js';
import { level_difficulty, Inhell, set_malign, mongets, MM_ASLEEP,
         MM_NOGRP, NO_MM_FLAGS } from './makemon.js';
import { mkgold, mkobj, mkobj_at, mksobj, mksobj_at, add_to_container,
         mk_tt_object } from './mkobj.js';
import { weight } from './invent.js';
import { dist2, distmin } from './hacklib.js';
import { somexyspace, occupied, make_grave } from './mklev.js';
import { OROOM, SHOPBASE, FILL_NORMAL, COURT, ZOO, BEEHIVE, MORGUE,
         BARRACKS, SWAMP, TEMPLE, LEPREHALL, COCKNEST, ANTHOLE,
         ROOMOFFSET, POOL, SDOOR, ROOM, IS_ROOM, IS_DOOR, isok, G_GONE,
         In_endgame, SPACE_POS, IS_THRONE, THRONE, ALTAR, AM_SHRINE,
         OBJ_AT } from './const.js';
import { makemon, mkclass } from './makemon.js';
import { m_at, t_at } from './mon.js';
import { PMNAMES, MONSYMS } from './monst_data.js';
import { OCLASSES, ONAMES } from './objects_data.js';
import { inside_room } from './sp_lev.js';
import { shtypes } from './shknam.js';
import { priestini } from './priest.js';
import { induced_align } from './dungeon.js';

function note_unported_mkroom(what) {
    (game.unported ||= new Set()).add(`mkroom:${what}`);
}

/* shtypes[] now lives in js/shknam.js, its C home, next to
   get_shop_item() which reads the other half of the same table. */

// src/mkroom.c:502 antholemon() — which ant species an anthole gets.
//
// Draws nothing. It needs ubirthday, the game's start time, which we do not
// model: the recorder derives it with mktime() from NETHACK_FIXED_DATETIME in
// the RECORDING MACHINE'S local timezone, taking tm_isdst from the moment the
// recording was actually made. That value is not derivable from this repo and
// must not be fitted to the sessions.
//
// It does not have to be. antholemon uses ubirthday ONLY as `% 3`, and every
// timezone offset is a whole or half hour, i.e. a multiple of 1800, which is
// divisible by 3. So the offset cannot change the result:
//
//     2000-06-01 12:00:00 UTC = 959860800, and 959860800 % 3 == 0,
//     and (959860800 + k * 1800) % 3 == 0 for every k.
//
// The fixed datetime already reaches us as game.fixed_datetime, so indx is
// computed from it rather than assumed, and it stays correct for any recording
// timezone. nameshk's `ubirthday / 257` has no such invariance, which is why
// only the chosen NAME there remains unported.
export function antholemon() {
    let mtyp, trycnt = 0;

    const dt = game.fixed_datetime;
    if (!dt) {
        note_unported_mkroom('antholemon:no_fixed_datetime');
        return null;
    }
    const ub = Date.UTC(+dt.slice(0, 4), +dt.slice(4, 6) - 1, +dt.slice(6, 8),
                        +dt.slice(8, 10), +dt.slice(10, 12),
                        +dt.slice(12, 14)) / 1000;

    let indx = ((ub % 3) + 3) % 3;      /* timezone-invariant, see above */
    indx += level_difficulty();

    /* Same monsters within a level, different ones between levels */
    do {
        switch ((indx + trycnt) % 3) {
        case 0:  mtyp = PMNAMES.PM_SOLDIER_ANT; break;
        case 1:  mtyp = PMNAMES.PM_FIRE_ANT;    break;
        default: mtyp = PMNAMES.PM_GIANT_ANT;   break;
        }
        /* try again if chosen type has been genocided or used up */
    } while (++trycnt < 3 && (game.mvitals?.[mtyp]?.mvflags & G_GONE));

    return (game.mvitals?.[mtyp]?.mvflags & G_GONE) ? null : game.mons[mtyp];
}

// src/mkroom.c:42 isbig()
function isbig(sroom) {
    const area = (sroom.hx - sroom.lx + 1) * (sroom.hy - sroom.ly + 1);
    return area > 20;
}

// src/mkroom.c:52 do_mkroom()
export function do_mkroom(roomtype) {
    if (roomtype >= SHOPBASE) {
        mkshop();
    } else {
        switch (roomtype) {
        case COURT:     mkzoo(COURT);     break;
        case ZOO:       mkzoo(ZOO);       break;
        case BEEHIVE:   mkzoo(BEEHIVE);   break;
        case MORGUE:    mkzoo(MORGUE);    break;
        case BARRACKS:  mkzoo(BARRACKS);  break;
        case SWAMP:     mkswamp();        break;
        case TEMPLE:    mktemple();       break;
        case LEPREHALL: mkzoo(LEPREHALL); break;
        case COCKNEST:  mkzoo(COCKNEST);  break;
        case ANTHOLE:   mkzoo(ANTHOLE);   break;
        default:
            note_unported_mkroom(`do_mkroom:${roomtype}`);
        }
    }
}

// src/mkroom.c:95 mkshop()
//
// Draws exactly ONE rnd(100), and only when the shop type is not already
// fixed. Everything else is room selection and lighting. The stock is NOT
// made here: the C's own comment says "The shop used to be stocked here, but
// this no longer happens -- all we do is set its rtype, and it gets stocked
// at the end of makelevel()", which is the fill_special_room() pass we
// already run for the vault.
function mkshop() {
    let sroom = null;
    let i = -1;             /* shoptype; -1 means "not yet determined" */

    /* the wizard-mode SHOPTYPE environment override is not modelled */

    for (let idx = 0; ; idx++) {
        const r = game.level.rooms[idx];
        if (!r || r.hx < 0)
            return;         /* no eligible room */
        if (idx >= game.level.nroom)
            return;         /* impossible("rooms[] not closed by -1?") */
        if (r.rtype !== OROOM)
            continue;
        if (has_dnstairs(r) || has_upstairs(r))
            continue;
        if (r.doorct === 1) {
            if (invalid_shop_shape(r))
                continue;
            sroom = r;
            break;
        }
    }

    if (!sroom.rlit) {
        for (let x = sroom.lx - 1; x <= sroom.hx + 1; x++)
            for (let y = sroom.ly - 1; y <= sroom.hy + 1; y++) {
                const loc = game.level.at(x, y);
                if (loc) loc.lit = 1;
            }
        sroom.rlit = 1;
    }

    if (i < 0) {            /* shoptype not yet determined */
        /* pick a shop type at random */
        let j;
        for (j = rnd(100), i = 0; (j -= shtypes[i].prob) > 0; i++)
            continue;

        /* big rooms cannot be wand or book shops, so make them general stores */
        if (isbig(sroom) && (shtypes[i].symb === OCLASSES.WAND_CLASS
                             || shtypes[i].symb === OCLASSES.SPBOOK_CLASS))
            i = 0;
    }
    sroom.rtype = SHOPBASE + i;

    topologize_wire(sroom);

    /* stocked later, with the other special rooms, at the end of makelevel */
    sroom.needfill = FILL_NORMAL;
}

// src/mkroom.c:220 pick_room() — an unused room, preferably with one door.
//
// Draws even when it finds nothing: the starting index is rn2(nroom), and the
// walk spends an rn2(3) on any room holding the downstairs and an rn2(5) on
// any room with more than one door. Those are the draws the whole special-room
// chain was missing below the shop arm.
//
// The wrap is C's `if (sroom == &rooms[nroom]) sroom = &rooms[0]`, i.e. the
// scan starts at a random room and wraps once through all of them.
function pick_room(strict) {
    const nroom = game.level.nroom;
    if (nroom <= 0)
        return null;

    let idx = rn2(nroom);
    for (let i = nroom; i--; idx++) {
        if (idx === nroom)
            idx = 0;
        const sroom = game.level.rooms[idx];
        if (!sroom || sroom.hx < 0)
            return null;
        if (sroom.rtype !== OROOM)
            continue;
        if (!strict) {
            if (has_upstairs(sroom) || (has_dnstairs(sroom) && rn2(3)))
                continue;
        } else if (has_upstairs(sroom) || has_dnstairs(sroom)) {
            continue;
        }
        if (sroom.doorct === 1 || !rn2(5))
            return sroom;
    }
    return null;
}

// src/mkroom.c:244 mkzoo() — the room is only marked here. As with mkshop,
// the C's comment records that it "does not get stocked at this time - it
// will get stocked at the end of makelevel()".
function mkzoo(type) {
    const sroom = pick_room(false);
    if (sroom) {
        sroom.rtype = type;
        sroom.needfill = FILL_NORMAL;
    }
}

// src/mkroom.c:275 fill_zoo() — put the monsters and loot into a marked
// special room. mkzoo() only sets rtype and needfill; this is the other half,
// run from fill_special_room() at the end of makelevel.
//
// The draw volume is per-square: one makemon for every eligible square, plus a
// per-type tail. A MORGUE spends four rn2 per square on top of its makemon, so
// the tail order is load-bearing.
export function fill_zoo(sroom) {
    let sx, sy, i;
    let goldlim = 0;
    const type = sroom.rtype;
    let tx = 0, ty = 0;
    const rmno = game.level.rooms.indexOf(sroom) + ROOMOFFSET;
    const sh = sroom.fdoor;
    const mm = { x: 0, y: 0 };

    switch (type) {
    case COURT:
        if (game.level.flags.is_maze_lev)
            note_unported_mkroom('fill_zoo:maze_throne_scan');
        i = 100;
        do {                    /* don't place throne on top of stairs */
            somexyspace(sroom, mm);
            tx = mm.x; ty = mm.y;
        } while (occupied(tx, ty) && --i > 0);
        mk_zoo_thronemon(tx, ty);
        break;
    case BEEHIVE:
        tx = sroom.lx + Math.trunc((sroom.hx - sroom.lx + 1) / 2);
        ty = sroom.ly + Math.trunc((sroom.hy - sroom.ly + 1) / 2);
        if (sroom.irregular) {
            const l = game.level.at(tx, ty);
            if (!l || l.roomno !== rmno || l.edge) {
                somexyspace(sroom, mm);
                tx = mm.x; ty = mm.y;
            }
        }
        break;
    case ZOO:
    case LEPREHALL:
        goldlim = 500 * level_difficulty();
        break;
    }

    for (sx = sroom.lx; sx <= sroom.hx; sx++)
        for (sy = sroom.ly; sy <= sroom.hy; sy++) {
            const lev = game.level.at(sx, sy);
            const door = game.level.doors?.[sh];
            if (sroom.irregular) {
                if (!lev || lev.roomno !== rmno || lev.edge
                    || (sroom.doorct && door
                        && distmin(sx, sy, door.x, door.y) <= 1))
                    continue;
            } else if (!SPACE_POS(lev?.typ)
                       || (sroom.doorct && door
                           && ((sx === sroom.lx && door.x === sx - 1)
                               || (sx === sroom.hx && door.x === sx + 1)
                               || (sy === sroom.ly && door.y === sy - 1)
                               || (sy === sroom.hy && door.y === sy + 1)))) {
                continue;
            }
            /* don't place monster on explicitly placed throne */
            if (type === COURT && IS_THRONE(lev.typ))
                continue;

            const ptr =
                  (type === COURT)     ? courtmon()
                : (type === BARRACKS)  ? squadmon()
                : (type === MORGUE)    ? morguemon()
                : (type === BEEHIVE)   ? ((sx === tx && sy === ty)
                                          ? game.mons[PMNAMES.PM_QUEEN_BEE]
                                          : game.mons[PMNAMES.PM_KILLER_BEE])
                : (type === LEPREHALL) ? game.mons[PMNAMES.PM_LEPRECHAUN]
                : (type === COCKNEST)  ? game.mons[PMNAMES.PM_COCKATRICE]
                : (type === ANTHOLE)   ? antholemon()
                : null;
            const mon = ptr ? makemon(ptr, sx, sy, MM_ASLEEP | MM_NOGRP) : null;
            if (mon) {
                mon.msleeping = 1;
                if (type === COURT && mon.mpeaceful) {
                    mon.mpeaceful = 0;
                    set_malign(mon);
                }
            }

            switch (type) {
            case ZOO:
            case LEPREHALL: {
                const door2 = game.level.doors?.[sh];
                if (sroom.doorct && door2)
                    i = sq(dist2(sx, sy, door2.x, door2.y));
                else
                    i = goldlim;
                if (i >= goldlim)
                    i = 5 * level_difficulty();
                goldlim -= i;
                mkgold(rn1(i, 10), sx, sy);
                break;
            }
            case MORGUE:
                if (!rn2(5))
                    mk_tt_object(ONAMES.CORPSE, sx, sy);
                if (!rn2(10))   /* lots of treasure buried with dead */
                    mksobj_at(rn2(3) ? ONAMES.LARGE_BOX : ONAMES.CHEST,
                              sx, sy, true, false);
                if (!rn2(5))
                    make_grave(sx, sy, null);
                break;
            case BEEHIVE:
                if (!rn2(3))
                    mksobj_at(ONAMES.LUMP_OF_ROYAL_JELLY, sx, sy, true, false);
                break;
            case BARRACKS:
                if (!rn2(20)) /* the payroll and some loot */
                    mksobj_at(rn2(3) ? ONAMES.LARGE_BOX : ONAMES.CHEST,
                              sx, sy, true, false);
                break;
            case COCKNEST: {
                if (!rn2(3)) {
                    const sobj = mk_tt_object(ONAMES.STATUE, sx, sy);
                    if (sobj) {
                        for (i = rn2(5); i; i--)
                            add_to_container(sobj, mkobj(OCLASSES.RANDOM_CLASS,
                                                         false));
                        sobj.owt = weight(sobj);
                    }
                }
                break;
            }
            case ANTHOLE:
                if (!rn2(3))
                    mkobj_at(OCLASSES.FOOD_CLASS, sx, sy, false);
                break;
            }
        }

    switch (type) {
    case COURT: {
        game.level.at(tx, ty).typ = THRONE;
        somexyspace(sroom, mm);
        const gold = mksobj(ONAMES.GOLD_PIECE, true, false);
        gold.quan = rn1(50 * level_difficulty(), 10);
        gold.owt = weight(gold);
        /* the royal coffers */
        const chest = mksobj_at(ONAMES.CHEST, mm.x, mm.y, true, false);
        add_to_container(chest, gold);
        chest.owt = weight(chest);
        chest.spe = 2;          /* so it can be found later */
        game.level.flags.has_court = 1;
        break;
    }
    case BARRACKS: game.level.flags.has_barracks = 1; break;
    case ZOO:      game.level.flags.has_zoo = 1;      break;
    case MORGUE:   game.level.flags.has_morgue = 1;   break;
    case SWAMP:    game.level.flags.has_swamp = 1;    break;
    case BEEHIVE:  game.level.flags.has_beehive = 1;  break;
    }
}

// src/mkroom.c:257 mk_zoo_thronemon() — the throne's occupant.
function mk_zoo_thronemon(x, y) {
    const i = rnd(level_difficulty());
    const pm = (i > 9) ? PMNAMES.PM_OGRE_TYRANT
             : (i > 5) ? PMNAMES.PM_ELVEN_MONARCH
             : (i > 2) ? PMNAMES.PM_DWARF_RULER
                       : PMNAMES.PM_GNOME_RULER;
    const mon = makemon(game.mons[pm], x, y, NO_MM_FLAGS);

    if (mon) {
        mon.msleeping = 1;
        mon.mpeaceful = 0;
        set_malign(mon);
        /* Give him a sceptre to pound in judgment */
        mongets(mon, ONAMES.MACE);
    }
}

/* src/mkroom.c:37 */
const sq = (x) => x * x;

// src/mkroom.c courtmon() — the throne room's inhabitants.
//
// The first line is TWO draws, not one: rn2(60) plus rn2(3 * difficulty).
// Both are always spent, whichever arm is then taken.
export function courtmon() {
    const i = rn2(60) + rn2(3 * level_difficulty());

    if (i > 100)     return mkclass(MONSYMS.S_DRAGON, 0);
    else if (i > 95) return mkclass(MONSYMS.S_GIANT, 0);
    else if (i > 85) return mkclass(MONSYMS.S_TROLL, 0);
    else if (i > 75) return mkclass(MONSYMS.S_CENTAUR, 0);
    else if (i > 60) return mkclass(MONSYMS.S_ORC, 0);
    else if (i > 45) return game.mons[PMNAMES.PM_BUGBEAR];
    else if (i > 30) return game.mons[PMNAMES.PM_HOBGOBLIN];
    else if (i > 15) return mkclass(MONSYMS.S_GNOME, 0);
    else             return mkclass(MONSYMS.S_KOBOLD, 0);
}

// src/mkroom.c morguemon() — the morgue's inhabitants.
//
// Again both draws at the top are unconditional: rn2(100) and
// rn2(level_difficulty()).
export function morguemon() {
    const i = rn2(100), hd = rn2(level_difficulty());

    if (hd > 10 && i < 10) {
        if (Inhell() || In_endgame(game.u.uz))
            return mkclass(MONSYMS.S_DEMON, 0);
        /* ndemon() is not ported; C falls through to ghost/wraith/zombie
           when it returns NON_PM, which is the arm taken here. */
        note_unported_mkroom('morguemon:ndemon');
    }

    if (hd > 8 && i > 85)
        return mkclass(MONSYMS.S_VAMPIRE, 0);

    return (i < 20) ? game.mons[PMNAMES.PM_GHOST]
         : (i < 40) ? game.mons[PMNAMES.PM_WRAITH]
                    : mkclass(MONSYMS.S_ZOMBIE, 0);
}

/* src/mkroom.c squadprob[] */
const squadprob = [
    [PMNAMES.PM_SOLDIER, 80], [PMNAMES.PM_SERGEANT, 15],
    [PMNAMES.PM_LIEUTENANT, 4], [PMNAMES.PM_CAPTAIN, 1],
];

// src/mkroom.c squadmon() — the barracks' soldiers.
//
// Note the fallthrough: sel_prob is rnd(80 + difficulty), so on a deep level
// it can exceed the table's total of 100 and no entry matches. C then falls
// out of the loop to ROLL_FROM(squadprob), which spends a FURTHER rn2(4).
// A port that clamps instead of falling through loses that draw.
export function squadmon() {
    const sel_prob = rnd(80 + level_difficulty());
    let cpro = 0, mndx = null;

    for (let i = 0; i < squadprob.length; i++) {
        cpro += squadprob[i][1];
        if (cpro > sel_prob) {
            mndx = squadprob[i][0];
            break;
        }
    }
    if (mndx === null)
        mndx = squadprob[rn2(squadprob.length)][0];     /* ROLL_FROM */

    return (game.mvitals?.[mndx]?.mvflags & G_GONE) ? null : game.mons[mndx];
}

// src/mkroom.c:577 shrine_pos() — the altar's square, the room's centre.
//
// Draws rn2(2) for each dimension whose extent is EVEN (delta odd), because
// the exact centre then falls between two map squares and C picks a side.
// A room with both extents odd draws nothing here.
function shrine_pos(sroom) {
    const buf = { x: 0, y: 0 };
    let delta;

    delta = sroom.hx - sroom.lx;
    buf.x = sroom.lx + Math.trunc(delta / 2);
    if ((delta % 2) && rn2(2))
        buf.x++;
    delta = sroom.hy - sroom.ly;
    buf.y = sroom.ly + Math.trunc(delta / 2);
    if ((delta % 2) && rn2(2))
        buf.y++;
    return buf;
}

// src/mkroom.c:598 mktemple() — the temple and its priest.
//
// pick_room(TRUE) here, not FALSE: a temple demands a room with NEITHER
// staircase, where mkzoo tolerates the downstairs on an rn2(3).
function mktemple() {
    const sroom = pick_room(true);
    if (!sroom)
        return;

    /* set up Priest and shrine */
    sroom.rtype = TEMPLE;
    /* In temples, shrines are blessed altars located in the centre */
    const spot = shrine_pos(sroom);
    const lev = game.level.at(spot.x, spot.y);
    lev.typ = ALTAR;
    lev.altarmask = induced_align(80);
    priestini(game.u.uz, sroom, spot.x, spot.y, false);
    lev.altarmask |= AM_SHRINE;
    game.level.flags.has_temple = 1;
}

// src/mkroom.c:530 mkswamp() — turn up to five rooms swampy.
//
// Note the loop shape: it runs five times unconditionally and spends an
// rn2(nroom) on EVERY pass, including passes whose room is rejected. It can
// also pick the same room twice. Both are the C's behaviour, not an accident,
// and a "cleaner" loop that draws only for eligible rooms would desync.
//
// Only fires at u_depth > 15, so it is rare in the public sessions.
function mkswamp() {
    let eelct = 0;

    for (let i = 0; i < 5; i++) {       /* turn up to 5 rooms swampy */
        const idx = rn2(game.level.nroom);
        const sroom = game.level.rooms[idx];
        if (!sroom || sroom.hx < 0 || sroom.rtype !== OROOM
            || has_upstairs(sroom) || has_dnstairs(sroom))
            continue;

        const rmno = idx + ROOMOFFSET;

        /* satisfied; make a swamp */
        sroom.rtype = SWAMP;
        for (let sx = sroom.lx; sx <= sroom.hx; sx++)
            for (let sy = sroom.ly; sy <= sroom.hy; sy++) {
                const lev = game.level.at(sx, sy);
                if (!lev || !IS_ROOM(lev.typ) || lev.roomno !== rmno)
                    continue;
                if (!OBJ_AT(sx, sy) && !m_at(sx, sy) && !t_at(sx, sy)
                    && !nexttodoor(sx, sy)) {
                    if ((sx + sy) % 2) {
                        note_unported_mkroom('mkswamp:del_engr_at');
                        lev.typ = POOL;
                        if (!eelct || !rn2(4)) {
                            /* mkclass() won't do, as we might get kraken */
                            makemon(game.mons[rn2(5)
                                        ? PMNAMES.PM_GIANT_EEL
                                        : rn2(2)
                                            ? PMNAMES.PM_PIRANHA
                                            : PMNAMES.PM_ELECTRIC_EEL],
                                    sx, sy, NO_MM_FLAGS);
                            eelct++;
                        }
                    } else if (!rn2(4)) {   /* swamps tend to be moldy */
                        makemon(mkclass(MONSYMS.S_FUNGUS, 0), sx, sy,
                                NO_MM_FLAGS);
                    }
                }
            }
        game.level.flags.has_swamp = 1;
    }
}

// src/mkroom.c:623 nexttodoor()
function nexttodoor(sx, sy) {
    for (let dx = -1; dx <= 1; dx++)
        for (let dy = -1; dy <= 1; dy++) {
            if (!isok(sx + dx, sy + dy))
                continue;
            const lev = game.level.at(sx + dx, sy + dy);
            if (lev && (IS_DOOR(lev.typ) || lev.typ === SDOOR))
                return true;
        }
    return false;
}

// src/mkroom.c:640 has_dnstairs()
export function has_dnstairs(sroom) {
    for (let s = game.stairs; s; s = s.next)
        if (!s.up && inside_room(sroom, s.sx, s.sy))
            return true;
    return false;
}

// src/mkroom.c:653 has_upstairs()
export function has_upstairs(sroom) {
    for (let s = game.stairs; s; s = s.next)
        if (s.up && inside_room(sroom, s.sx, s.sy))
            return true;
    return false;
}

// src/mkroom.c:1050 invalid_shop_shape() — a shopkeeper standing just inside
// the door needs somewhere to step aside to.
function invalid_shop_shape(sroom) {
    const door = game.level.doors?.[sroom.fdoor];
    if (!door)
        return true;
    const doorx = door.x, doory = door.y;
    let insidex = 0, insidey = 0, insidect = 0;

    /* squares inside the room and next to the door */
    for (let x = Math.max(doorx - 1, sroom.lx);
         x <= Math.min(doorx + 1, sroom.hx); x++)
        for (let y = Math.max(doory - 1, sroom.ly);
             y <= Math.min(doory + 1, sroom.hy); y++)
            if (game.level.at(x, y)?.typ === ROOM) {
                insidex = x; insidey = y; insidect++;
            }

    if (insidect < 1)
        return true;        /* impossible() in C */

    /* insidect > 1 means the shopkeeper already has somewhere to go */
    if (insidect === 1) {
        insidect = 0;
        for (let x = Math.max(insidex - 1, sroom.lx);
             x <= Math.min(insidex + 1, sroom.hx); x++)
            for (let y = Math.max(insidey - 1, sroom.ly);
                 y <= Math.min(insidey + 1, sroom.hy); y++) {
                if (x === insidex && y === insidey)
                    continue;
                if (game.level.at(x, y)?.typ === ROOM)
                    insidect++;
            }
        if (insidect === 1)
            return true;    /* only one square to move to; not a shop */
    }
    return false;
}

/* topologize() lives in js/mklev.js, which imports this file; the wire keeps
   the cycle from forming, following the sp_lev_wire pattern already here. */
let _topologize = null;
export function mkroom_wire(fns) { _topologize = fns.topologize; }
function topologize_wire(croom) {
    if (_topologize) _topologize(croom);
    else note_unported_mkroom('topologize:unwired');
}
