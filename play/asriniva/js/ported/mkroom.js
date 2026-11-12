import { C } from '../c-runtime/context.js';

/* NetHack 5.0	mkroom.c	$NHDT-Date: 1613086701 2021/02/11 23:38:21 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.52 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Robert Patrick Rankin, 2011. */
/* NetHack may be freely redistributed.  See license for details. */

/*
 * Entry points:
 *      do_mkroom() -- make and stock a room of a given type
 *      nexttodoor() -- return TRUE if adjacent to a door
 *      has_dnstairs() -- return TRUE if given room has a down staircase
 *      has_upstairs() -- return TRUE if given room has an up staircase
 *      courtmon() -- generate a court monster
 *      save_rooms() -- save rooms into file fd
 *      rest_rooms() -- restore rooms from file fd
 *      cmap_to_type() -- convert S_xxx symbol to XXX topology code
 */






 /* defined in shknam.c */

/* #define sq(x) ((x) * (x)) */

export function isbig(sroom)
{
    let area = (sroom.hx - sroom.lx + 1)
                        * (sroom.hy - sroom.ly + 1);

    return (area > 20);
}

/* make and stock a room of a given type */
export function do_mkroom(roomtype)
{
    roomtype = C.int(roomtype);
    if (roomtype >= C.SHOPBASE) {
        mkshop(); /* someday, we should be able to specify shop type */
    } else {
        switch (roomtype) {
        case C.COURT:
            mkzoo(C.COURT);
            break;
        case C.ZOO:
            mkzoo(C.ZOO);
            break;
        case C.BEEHIVE:
            mkzoo(C.BEEHIVE);
            break;
        case C.MORGUE:
            mkzoo(C.MORGUE);
            break;
        case C.BARRACKS:
            mkzoo(C.BARRACKS);
            break;
        case C.SWAMP:
            mkswamp();
            break;
        case C.TEMPLE:
            mktemple();
            break;
        case C.LEPREHALL:
            mkzoo(C.LEPREHALL);
            break;
        case C.COCKNEST:
            mkzoo(C.COCKNEST);
            break;
        case C.ANTHOLE:
            mkzoo(C.ANTHOLE);
            break;
        default:
            C.impossible("Tried to make a room of type %d.", roomtype);
        }
    }
}

export function mkshop()
{
    let sroom;
    let i = -1;
    let ep = 0; /* (init == lint suppression) */

    /* first determine shoptype */
    gottype: {
    if (C.wizard) {
        ep = C.nh_getenv("SHOPTYPE");
        if (ep) {
            if (C.loadChar(ep) == 'z'.charCodeAt(0) || C.loadChar(ep) == 'Z'.charCodeAt(0)) {
                mkzoo(C.ZOO);
                return;
            }
            if (C.loadChar(ep) == 'm'.charCodeAt(0) || C.loadChar(ep) == 'M'.charCodeAt(0)) {
                mkzoo(C.MORGUE);
                return;
            }
            if (C.loadChar(ep) == 'b'.charCodeAt(0) || C.loadChar(ep) == 'B'.charCodeAt(0)) {
                mkzoo(C.BEEHIVE);
                return;
            }
            if (C.loadChar(ep) == 't'.charCodeAt(0) || C.loadChar(ep) == 'T'.charCodeAt(0) || C.loadChar(ep) == '\\'.charCodeAt(0)) {
                mkzoo(C.COURT);
                return;
            }
            if (C.loadChar(ep) == 's'.charCodeAt(0) || C.loadChar(ep) == 'S'.charCodeAt(0)) {
                mkzoo(C.BARRACKS);
                return;
            }
            if (C.loadChar(ep) == 'a'.charCodeAt(0) || C.loadChar(ep) == 'A'.charCodeAt(0)) {
                mkzoo(C.ANTHOLE);
                return;
            }
            if (C.loadChar(ep) == 'c'.charCodeAt(0) || C.loadChar(ep) == 'C'.charCodeAt(0)) {
                mkzoo(C.COCKNEST);
                return;
            }
            if (C.loadChar(ep) == 'l'.charCodeAt(0) || C.loadChar(ep) == 'L'.charCodeAt(0)) {
                mkzoo(C.LEPREHALL);
                return;
            }
            if (C.loadChar(ep) == '_'.charCodeAt(0)) {
                mktemple();
                return;
            }
            if (C.loadChar(ep) == '}'.charCodeAt(0)) {
                mkswamp();
                return;
            }
            for (i = 0; C.shtypes[i].name; i++)
                if (C.loadChar(ep) == C.def_oc_syms[C.shtypes[i].symb].sym)
                    break gottype;
            if (C.loadChar(ep) == 'g'.charCodeAt(0) || C.loadChar(ep) == 'G'.charCodeAt(0))
                i = 0;
            else if (C.loadChar(ep) == 'v'.charCodeAt(0) || C.loadChar(ep) == 'V'.charCodeAt(0))
                i = C.FODDERSHOP - C.SHOPBASE; /* veggy food */
            else
                i = -1;
        }
    }

    }
    for (sroom = C.svr.rooms[0];; sroom = C.roomNext(sroom)) {
        /* return from this loop: cannot find any eligible room to be a shop
         * continue: sroom is ineligible
         * break: sroom is eligible
         */
        if (sroom.hx < 0)
            return;
        if (C.roomDifference(sroom, C.svr.rooms[0]) >= C.svn.nroom) {
            C.impossible("rooms[] not closed by -1?");
            return;
        }
        if (sroom.rtype != C.OROOM)
            continue;
        if (has_dnstairs(sroom) || has_upstairs(sroom))
            continue;
        if (sroom.doorct == 1 || (C.wizard && ep && sroom.doorct != 0)) {
            if (invalid_shop_shape(sroom))
                continue;
            else
                break;
        }
    }
    if (!sroom.rlit) {
        let x, y;

        for (x = C.coordxy(sroom.lx - 1); x <= sroom.hx + 1; x = C.coordxy(x + 1))
            for (y = C.coordxy(sroom.ly - 1); y <= sroom.hy + 1; y = C.coordxy(y + 1))
                C.levl[x][y].lit = 1;
        sroom.rlit = 1;
    }

    if (i < 0) { /* shoptype not yet determined */
        let j;

        /* pick a shop type at random */
        for (j = C.rnd(100, 193, 'mkshop'), i = 0; (j -= C.shtypes[i].prob) > 0; i++)
            continue;

        /* big rooms cannot be wand or book shops,
         * - so make them general stores
         */
        if (isbig(sroom) && (C.shtypes[i].symb == C.WAND_CLASS
                             || C.shtypes[i].symb == C.SPBOOK_CLASS))
            i = 0;
    }
    sroom.rtype = C.SHOPBASE + i;

    /* set room bits before stocking the shop */
    /* doesn't matter - this is a special room */
    C.topologize(sroom);

    /* The shop used to be stocked here, but this no longer happens--all we do
       is set its rtype, and it gets stocked at the end of makelevel() along
       with other special rooms. */
    sroom.needfill = C.FILL_NORMAL;
}

/* pick an unused room, preferably with only one door */
export function pick_room(strict)
{
    strict = C.boolean(strict);
    let sroom;
    let i = C.svn.nroom;

    for (sroom = C.svr.rooms[C.rn2(C.svn.nroom, 225, 'pick_room')]; i--; sroom = C.roomNext(sroom)) {
        if (C.samePtr(sroom, C.svr.rooms[C.svn.nroom]))
            sroom = C.svr.rooms[0];
        if (sroom.hx < 0)
            return 0;
        if (sroom.rtype != C.OROOM)
            continue;
        if (!strict) {
            if (has_upstairs(sroom) || (has_dnstairs(sroom) && C.rn2(3, 233, 'pick_room')))
                continue;
        } else if (has_upstairs(sroom) || has_dnstairs(sroom))
            continue;
        if (sroom.doorct == 1 || !C.rn2(5, 237, 'pick_room') || C.wizard)
            return sroom;
    }
    return 0;
}

export function mkzoo(type)
{
    type = C.int(type);
    let sroom;

    if ((sroom = pick_room(0)) != 0) {
        sroom.rtype = type;
        /* room does not get stocked at this time - it will get stocked at the
         * end of makelevel() */
        sroom.needfill = C.FILL_NORMAL;
    }
}

export function mk_zoo_thronemon(x, y)
{
    x = C.coordxy(x); y = C.coordxy(y);
    let i = C.rnd(C.level_difficulty(), 259, 'mk_zoo_thronemon');
    let pm = (i > 9) ? C.PM_OGRE_TYRANT
        : (i > 5) ? C.PM_ELVEN_MONARCH
        : (i > 2) ? C.PM_DWARF_RULER
        : C.PM_GNOME_RULER;
    let mon = C.makemon(C.mons[pm], x, y, C.NO_MM_FLAGS);

    if (mon) {
        mon.msleeping = 1;
        mon.mpeaceful = 0;
        C.set_malign(mon);
        /* Give him a sceptre to pound in judgment */
        C.mongets(mon, C.MACE);
    }
}

export function fill_zoo(sroom)
{
    let mon;
    let sx, sy, i;
    let sh, goldlim = 0, type = sroom.rtype;
    let tx = C.coordxy(0), ty = C.coordxy(0);
    let rmno = C.int(C.roomDifference(sroom, C.svr.rooms[0]) + BigInt(C.ROOMOFFSET));
    const mm = C.coordLocal();

    /* Note: This doesn't check needfill; it assumes the caller has already
       done that. */
    sh = sroom.fdoor;
    switch (type) {
    case C.COURT:
        throne_placed: {
        if (C.svl.level.flags.is_maze_lev) {
            for (tx = C.coordxy(sroom.lx); tx <= sroom.hx; tx = C.coordxy(tx + 1))
                for (ty = C.coordxy(sroom.ly); ty <= sroom.hy; ty = C.coordxy(ty + 1))
                    if (C.IS_THRONE(C.levl[tx][ty].typ))
                        break throne_placed;
        }
        i = 100;
        do { /* don't place throne on top of stairs */
            somexyspace(sroom, mm);
            tx = C.coordxy(mm.x);
            ty = C.coordxy(mm.y);
        } while (C.occupied(tx, ty) && --i > 0);
        }
        mk_zoo_thronemon(tx, ty);
        break;
    case C.BEEHIVE:
        tx = C.coordxy(sroom.lx + Math.trunc((sroom.hx - sroom.lx + 1) / 2));
        ty = C.coordxy(sroom.ly + Math.trunc((sroom.hy - sroom.ly + 1) / 2));
        if (sroom.irregular) {
            /* center might not be valid, so put queen elsewhere */
            if (C.levl[tx][ty].roomno != rmno || C.levl[tx][ty].edge) {
                somexyspace(sroom, mm);
                tx = C.coordxy(mm.x);
                ty = C.coordxy(mm.y);
            }
        }
        break;
    case C.ZOO:
    case C.LEPREHALL:
        goldlim = 500 * C.level_difficulty();
        break;
    }

    for (sx = sroom.lx; sx <= sroom.hx; sx++)
        for (sy = sroom.ly; sy <= sroom.hy; sy++) {
            if (sroom.irregular) {
                if (C.levl[sx][sy].roomno != rmno || C.levl[sx][sy].edge
                    || (sroom.doorct
                        && (C.distmin(sx, sy, C.svd.doors[sh].x, C.svd.doors[sh].y)
                            <= 1)))
                    continue;
            } else if (!C.SPACE_POS(C.levl[sx][sy].typ)
                       || (sroom.doorct
                           && ((sx == sroom.lx && C.svd.doors[sh].x == sx - 1)
                               || (sx == sroom.hx && C.svd.doors[sh].x
                                   == sx + 1)
                               || (sy == sroom.ly && C.svd.doors[sh].y
                                   == sy - 1)
                               || (sy == sroom.hy
                                   && C.svd.doors[sh].y == sy + 1))))
                continue;
            /* don't place monster on explicitly placed throne */
            if (type == C.COURT && C.IS_THRONE(C.levl[sx][sy].typ))
                continue;
            mon = C.makemon((type == C.COURT)
                           ? courtmon()
                           : (type == C.BARRACKS)
                              ? squadmon()
                              : (type == C.MORGUE)
                                 ? morguemon()
                                 : (type == C.BEEHIVE)
                                     ? (sx == tx && sy == ty
                                         ? C.mons[C.PM_QUEEN_BEE]
                                         : C.mons[C.PM_KILLER_BEE])
                                     : (type == C.LEPREHALL)
                                         ? C.mons[C.PM_LEPRECHAUN]
                                         : (type == C.COCKNEST)
                                             ? C.mons[C.PM_COCKATRICE]
                                             : (type == C.ANTHOLE)
                                                 ? antholemon()
                                                 : 0,
                          sx, sy, C.MM_ASLEEP | C.MM_NOGRP);
            if (mon) {
                mon.msleeping = 1;
                if (type == C.COURT && mon.mpeaceful) {
                    mon.mpeaceful = 0;
                    C.set_malign(mon);
                }
            }
            switch (type) {
            case C.ZOO:
            case C.LEPREHALL:
                if (sroom.doorct) {
                    let distval = C.dist2(sx, sy,
                                        C.svd.doors[sh].x, C.svd.doors[sh].y);
                    i = C.int(distval * distval);
                } else
                    i = goldlim;
                if (i >= goldlim)
                    i = 5 * C.level_difficulty();
                goldlim -= i;
                C.mkgold(C.long(C.rn1(i, 10, 381, 'fill_zoo')), sx, sy);
                break;
            case C.MORGUE:
                if (!C.rn2(5, 384, 'fill_zoo'))
                    C.mk_tt_object(C.CORPSE, sx, sy);
                if (!C.rn2(10, 386, 'fill_zoo')) /* lots of treasure buried with dead */
                    C.mksobj_at((C.rn2(3, 387, 'fill_zoo')) ? C.LARGE_BOX : C.CHEST, sx, sy,
                                     1, 0);
                if (!C.rn2(5, 389, 'fill_zoo'))
                    C.make_grave(sx, sy, 0);
                break;
            case C.BEEHIVE:
                if (!C.rn2(3, 393, 'fill_zoo'))
                    C.mksobj_at(C.LUMP_OF_ROYAL_JELLY, sx, sy, 1,
                                     0);
                break;
            case C.BARRACKS:
                if (!C.rn2(20, 398, 'fill_zoo')) /* the payroll and some loot */
                    C.mksobj_at((C.rn2(3, 399, 'fill_zoo')) ? C.LARGE_BOX : C.CHEST, sx, sy,
                                     1, 0);
                break;
            case C.COCKNEST:
                if (!C.rn2(3, 403, 'fill_zoo')) {
                    let sobj = C.mk_tt_object(C.STATUE, sx, sy);

                    if (sobj) {
                        for (i = C.rn2(5, 407, 'fill_zoo'); i; i--)
                            C.add_to_container(
                                sobj, C.mkobj(C.RANDOM_CLASS, 0));
                        sobj.owt = C.weight(sobj);
                    }
                }
                break;
            case C.ANTHOLE:
                if (!C.rn2(3, 415, 'fill_zoo'))
                    C.mkobj_at(C.FOOD_CLASS, sx, sy, 0);
                break;
            }
        }
    switch (type) {
    case C.COURT: {
        let chest, gold;
        C.levl[tx][ty].typ = C.THRONE;
        somexyspace(sroom, mm);
        gold = C.mksobj(C.GOLD_PIECE, 1, 0);
        gold.quan = C.long(C.rn1(50 * C.level_difficulty(), 10, 426, 'fill_zoo'));
        gold.owt = C.weight(gold);
        /* the royal coffers */
        chest = C.mksobj_at(C.CHEST, mm.x, mm.y, 1, 0);
        C.add_to_container(chest, gold);
        chest.owt = C.weight(chest);
        chest.spe = 2; /* so it can be found later */
        C.svl.level.flags.has_court = 1;
        break;
    }
    case C.BARRACKS:
        C.svl.level.flags.has_barracks = 1;
        break;
    case C.ZOO:
        C.svl.level.flags.has_zoo = 1;
        break;
    case C.MORGUE:
        C.svl.level.flags.has_morgue = 1;
        break;
    case C.SWAMP:
        C.svl.level.flags.has_swamp = 1;
        break;
    case C.BEEHIVE:
        C.svl.level.flags.has_beehive = 1;
        break;
    }
}

/* make a swarm of undead around mm */
export function mkundead(mm, revive_corpses, mm_flags)
{
    revive_corpses = C.boolean(revive_corpses); mm_flags = C.int(mm_flags);
    let cnt = Math.trunc((C.level_difficulty() + 1) / 10) + C.rnd(5, 461, 'mkundead');
    let mdat;
    let otmp;
    const cc = C.coordLocal();

    while (cnt--) {
        mdat = morguemon();
        if (mdat && C.enexto(cc, mm.x, mm.y, mdat)
            && (!revive_corpses
                || !(otmp = C.sobj_at(C.CORPSE, cc.x, cc.y))
                || !C.revive(otmp, 0)))
            C.makemon(mdat, cc.x, cc.y, mm_flags);
    }
    C.svl.level.flags.graveyard = 1; /* reduced chance for undead corpse */
}

export function morguemon()
{
    let i = C.rn2(100, 480, 'morguemon'), hd = C.rn2(C.level_difficulty(), 480, 'morguemon');

    if (hd > 10 && i < 10) {
        if (C.Inhell || C.In_endgame(C.u.uz)) {
            return C.mkclass(C.S_DEMON, 0);
        } else {
            let ndemon_res = C.ndemon(C.A_NONE);
            if (ndemon_res != C.NON_PM)
                return C.mons[ndemon_res];
            /* else do what? As is, it will drop to ghost/wraith/zombie */
        }
    }

    if (hd > 8 && i > 85)
        return C.mkclass(C.S_VAMPIRE, 0);

    return ((i < 20) ? C.mons[C.PM_GHOST]
                     : (i < 40) ? C.mons[C.PM_WRAITH]
                                : C.mkclass(C.S_ZOMBIE, 0));
}

export function antholemon()
{
    let mtyp, indx, trycnt = 0;

    /* casts are for dealing with time_t */
    indx = (C.int(C.long(C.ubirthday) % 3n));
    indx += C.level_difficulty();
    /* Same monsters within a level, different ones between levels */
    do {
        switch ((indx + trycnt) % 3) {
        case 0:
            mtyp = C.PM_SOLDIER_ANT;
            break;
        case 1:
            mtyp = C.PM_FIRE_ANT;
            break;
        default:
            mtyp = C.PM_GIANT_ANT;
            break;
        }
        /* try again if chosen type has been genocided or used up */
    } while (++trycnt < 3 && (C.svm.mvitals[mtyp].mvflags & C.G_GONE));

    return ((C.svm.mvitals[mtyp].mvflags & C.G_GONE) ? 0
                                             : C.mons[mtyp]);
}

export function mkswamp()
/* Michiel Huisjes & Fred de Wilde */
{
    let sroom;
    let i, eelct = 0;
    let sx, sy;
    let rmno;

    for (i = 0; i < 5; i++) { /* turn up to 5 rooms swampy */
        sroom = C.svr.rooms[C.rn2(C.svn.nroom, 538, 'mkswamp')];
        if (sroom.hx < 0 || sroom.rtype != C.OROOM || has_upstairs(sroom)
            || has_dnstairs(sroom))
            continue;

        rmno = C.int(C.roomDifference(sroom, C.svr.rooms[0])) + C.ROOMOFFSET;

        /* satisfied; make a swamp */
        sroom.rtype = C.SWAMP;
        for (sx = C.coordxy(sroom.lx); sx <= sroom.hx; sx = C.coordxy(sx + 1))
            for (sy = C.coordxy(sroom.ly); sy <= sroom.hy; sy = C.coordxy(sy + 1)) {
                if (!C.IS_ROOM(C.levl[sx][sy].typ)
                    || C.levl[sx][sy].roomno != rmno)
                    continue;
                if (!C.OBJ_AT(sx, sy) && !C.MON_AT(sx, sy) && !C.t_at(sx, sy)
                    && !nexttodoor(sx, sy)) {
                    if ((sx + sy) % 2) {
                        C.del_engr_at(sx, sy);
                        C.levl[sx][sy].typ = C.POOL;
                        if (!eelct || !C.rn2(4, 557, 'mkswamp')) {
                            /* mkclass() won't do, as we might get kraken */
                            C.makemon(C.rn2(5, 559, 'mkswamp')
                                              ? C.mons[C.PM_GIANT_EEL]
                                              : C.rn2(2, 561, 'mkswamp')
                                                 ? C.mons[C.PM_PIRANHA]
                                                 : C.mons[C.PM_ELECTRIC_EEL],
                                           sx, sy, C.NO_MM_FLAGS);
                            eelct++;
                        }
                    } else if (!C.rn2(4, 567, 'mkswamp')) /* swamps tend to be moldy */
                        C.makemon(C.mkclass(C.S_FUNGUS, 0), sx, sy,
                                       C.NO_MM_FLAGS);
                }
            }
        C.svl.level.flags.has_swamp = 1;
    }
}

export function shrine_pos(roomno)
{
    roomno = C.int(roomno);
    const buf = C.shrineCoord();
    let delta;
    let troom = C.svr.rooms[roomno - C.ROOMOFFSET];

    /* if width and height are odd, placement will be the exact center;
       if either or both are even, center point is a hypothetical spot
       between map locations and placement will be adjacent to that */
    delta = troom.hx - troom.lx;
    buf.x = troom.lx + Math.trunc(delta / 2);
    if ((delta % 2) && C.rn2(2, 588, 'shrine_pos'))
        buf.x++;
    delta = troom.hy - troom.ly;
    buf.y = troom.ly + Math.trunc(delta / 2);
    if ((delta % 2) && C.rn2(2, 592, 'shrine_pos'))
        buf.y++;
    return buf;
}

export function mktemple()
{
    let sroom;
    let shrine_spot;
    let lev;

    if (!(sroom = pick_room(1)))
        return;

    /* set up Priest and shrine */
    sroom.rtype = C.TEMPLE;
    /*
     * In temples, shrines are blessed altars
     * located in the center of the room
     */
    shrine_spot = shrine_pos(C.int(C.roomDifference(sroom, C.svr.rooms[0]) + BigInt(C.ROOMOFFSET)));
    lev = C.levl[shrine_spot.x][shrine_spot.y];
    lev.typ = C.ALTAR;
    lev.altarmask = C.induced_align(80);
    C.priestini(C.u.uz, sroom, shrine_spot.x, shrine_spot.y, 0);
    lev.altarmask |= C.AM_SHRINE;
    C.svl.level.flags.has_temple = 1;
}

export function nexttodoor(sx, sy)
{
    sx = C.int(sx); sy = C.int(sy);
    let dx, dy;
    let lev;

    for (dx = -1; dx <= 1; dx++)
        for (dy = -1; dy <= 1; dy++) {
            if (!C.isok(sx + dx, sy + dy))
                continue;
            lev = C.levl[sx + dx][sy + dy];
            if (C.IS_DOOR(lev.typ) || lev.typ == C.SDOOR)
                return 1;
        }
    return 0;
}

export function has_dnstairs(sroom)
{
    let stway = C.gs.stairs;

    while (stway) {
        if (!stway.up && inside_room(sroom, stway.sx, stway.sy))
            return 1;
        stway = stway.next;
    }
    return 0;
}

export function has_upstairs(sroom)
{
    let stway = C.gs.stairs;

    while (stway) {
        if (stway.up && inside_room(sroom, stway.sx, stway.sy))
            return 1;
        stway = stway.next;
    }
    return 0;
}

export function somex(croom)
{
    return C.rn1(croom.hx - croom.lx + 1, croom.lx, 668, 'somex');
}

export function somey(croom)
{
    return C.rn1(croom.hy - croom.ly + 1, croom.ly, 674, 'somey');
}

export function inside_room(croom, x, y)
{
    x = C.coordxy(x); y = C.coordxy(y);
    if (croom.irregular) {
        let i = C.int(C.roomDifference(croom, C.svr.rooms[0]) + BigInt(C.ROOMOFFSET));
        return C.bool(!C.levl[x][y].edge && C.levl[x][y].roomno == i);
    }

    return C.bool(x >= croom.lx - 1 && x <= croom.hx + 1
                      && y >= croom.ly - 1 && y <= croom.hy + 1);
}

/* return a coord c inside mkroom croom, but not in a subroom.
   returns TRUE if any such space found.
   can return a non-accessible location, eg. inside a wall
   if a themed room is not irregular, but has some non-room terrain */
export function somexy(croom, c)
{
    let try_cnt = 0;
    let i;

    if (croom.irregular) {
        i = C.int(C.roomDifference(croom, C.svr.rooms[0]) + BigInt(C.ROOMOFFSET));

        while (try_cnt++ < 100) {
            c.x = somex(croom);
            c.y = somey(croom);
            if (!C.levl[c.x][c.y].edge && C.levl[c.x][c.y].roomno == i)
                return 1;
        }
        /* try harder; exhaustively search until one is found */
        for (c.x = croom.lx; c.x <= croom.hx; c.x++)
            for (c.y = croom.ly; c.y <= croom.hy; c.y++)
                if (!C.levl[c.x][c.y].edge
                    && C.levl[c.x][c.y].roomno == i)
                    return 1;
        return 0;
    }

    if (!croom.nsubrooms) {
        c.x = somex(croom);
        c.y = somey(croom);
        return 1;
    }

    /* Check that coords doesn't fall into a subroom or into a wall */

    you_lose: while (try_cnt++ < 100) {
        c.x = somex(croom);
        c.y = somey(croom);
        if (C.IS_WALL(C.levl[c.x][c.y].typ))
            continue;
        for (i = 0; i < croom.nsubrooms; i++)
            if (inside_room(croom.sbrooms[i], c.x, c.y))
                continue you_lose;
        break;
        ;
    }
    if (try_cnt >= 100)
        return 0;
    return 1;
}

/* like somexy(), but returns an accessible location */
export function somexyspace(croom, c)
{
    let trycnt = 0;
    let okay;

    do {
        okay = somexy(croom, c) && C.isok(c.x, c.y) && !C.occupied(c.x, c.y)
            && (C.levl[c.x][c.y].typ == C.ROOM
                || C.levl[c.x][c.y].typ == C.CORR
                || C.levl[c.x][c.y].typ == C.ICE);
    } while (trycnt++ < 100 && !okay);
    return okay;
}

/*
 * Search for a special room given its type (zoo, court, etc...)
 *      Special values :
 *              - ANY_SHOP
 *              - ANY_TYPE
 */
export function search_special(type)
{
    type = C.char(type);
    let croom;

    for (croom = C.svr.rooms[0]; croom.hx >= 0; croom = C.roomNext(croom))
        if ((type == C.ANY_TYPE && croom.rtype != C.OROOM)
            || (type == C.ANY_SHOP && croom.rtype >= C.SHOPBASE)
            || croom.rtype == type)
            return croom;
    for (croom = C.gs.subrooms[0]; croom.hx >= 0; croom = C.roomNext(croom))
        if ((type == C.ANY_TYPE && croom.rtype != C.OROOM)
            || (type == C.ANY_SHOP && croom.rtype >= C.SHOPBASE)
            || croom.rtype == type)
            return croom;
    return 0;
}

export function courtmon()
{
    let i = C.rn2(60, 785, 'courtmon') + C.rn2(3 * C.level_difficulty(), 785, 'courtmon');

    if (i > 100)
        return C.mkclass(C.S_DRAGON, 0);
    else if (i > 95)
        return C.mkclass(C.S_GIANT, 0);
    else if (i > 85)
        return C.mkclass(C.S_TROLL, 0);
    else if (i > 75)
        return C.mkclass(C.S_CENTAUR, 0);
    else if (i > 60)
        return C.mkclass(C.S_ORC, 0);
    else if (i > 45)
        return C.mons[C.PM_BUGBEAR];
    else if (i > 30)
        return C.mons[C.PM_HOBGOBLIN];
    else if (i > 15)
        return C.mkclass(C.S_GNOME, 0);
    else
        return C.mkclass(C.S_KOBOLD, 0);
}

export const squadprob = [
    { pm: 'PM_SOLDIER', prob: 80 },
    { pm: 'PM_SERGEANT', prob: 15 },
    { pm: 'PM_LIEUTENANT', prob: 4 },
    { pm: 'PM_CAPTAIN', prob: 1 },
];

/* return soldier types. */
export function squadmon()
{
    let sel_prob, i, cpro, mndx;

    sel_prob = C.rnd(80 + C.level_difficulty(), 821, 'squadmon');

    cpro = 0;
    gotone: {
    for (i = 0; i < C.squadprob.length; i++) {
        cpro += C.squadprob[i].prob;
        if (cpro > sel_prob) {
            mndx = C.squadprob[i].pm;
            break gotone;
        }
    }
    mndx = C.squadprob[C.rn2(C.squadprob.length, 831, 'squadmon')].pm;
    }
    if (!(C.svm.mvitals[mndx].mvflags & C.G_GONE))
        return C.mons[mndx];
    else
        return 0;
}

/*
 * save_room : A recursive function that saves a room and its subrooms
 * (if any).
 */
export function save_room(nhfp, r)
{
    let i;

    /*
     * Well, I really should write only useful information instead
     * of writing the whole structure. That is I should not write
     * the gs.subrooms pointers, but who cares ?
     */
    C.Sfo_mkroom(nhfp, r, "room-mkroom");
    for (i = 0; i < r.nsubrooms; i = C.short(i + 1)) {
        save_room(nhfp, r.sbrooms[i]);
    }
}

/*
 * save_rooms : Save all the rooms on disk!
 */
export function save_rooms(nhfp)
{
    let i;

    /* First, write the number of rooms */
    C.Sfo_int(nhfp, C.nroomRef(), "room-nroom");
    for (i = 0; i < C.svn.nroom; i = C.short(i + 1))
        save_room(nhfp, C.svr.rooms[i]);
}

export function rest_room(nhfp, r)
{
    let i;

    C.Sfi_mkroom(nhfp, r, "room-mkroom");

    for (i = 0; i < r.nsubrooms; i = C.short(i + 1)) {
        r.sbrooms[i] = C.gs.subrooms[C.gn.nsubroom];
        rest_room(nhfp, C.gs.subrooms[C.gn.nsubroom]);
        C.gs.subrooms[C.gn.nsubroom++].resident = 0;
    }
}

/*
 * rest_rooms : That's for restoring rooms. Read the rooms structure from
 * the disk.
 */
export function rest_rooms(nhfp)
{
    let i;

    C.Sfi_int(nhfp, C.nroomRef(), "room-nroom");

    C.gn.nsubroom = 0;
    for (i = 0; i < C.svn.nroom; i = C.short(i + 1)) {
        rest_room(nhfp, C.svr.rooms[i]);
        C.svr.rooms[i].resident = 0;
    }
    C.svr.rooms[C.svn.nroom].hx = -1; /* restore ending flags */
    C.gs.subrooms[C.gn.nsubroom].hx = -1;
}

/* convert a display symbol for terrain into topology type;
   used for remembered terrain when mimics pose as furniture */
export function cmap_to_type(sym)
{
    sym = C.int(sym);
    let typ = C.STONE; /* catchall */

    switch (sym) {
    case C.S_stone:
        typ = C.STONE;
        break;
    case C.S_vwall:
        typ = C.VWALL;
        break;
    case C.S_hwall:
        typ = C.HWALL;
        break;
    case C.S_tlcorn:
        typ = C.TLCORNER;
        break;
    case C.S_trcorn:
        typ = C.TRCORNER;
        break;
    case C.S_blcorn:
        typ = C.BLCORNER;
        break;
    case C.S_brcorn:
        typ = C.BRCORNER;
        break;
    case C.S_crwall:
        typ = C.CROSSWALL;
        break;
    case C.S_tuwall:
        typ = C.TUWALL;
        break;
    case C.S_tdwall:
        typ = C.TDWALL;
        break;
    case C.S_tlwall:
        typ = C.TLWALL;
        break;
    case C.S_trwall:
        typ = C.TRWALL;
        break;
    case C.S_ndoor:  /* no door (empty doorway) */
    case C.S_vodoor: /* open door in vertical wall */
    case C.S_hodoor: /* open door in horizontal wall */
    case C.S_vcdoor: /* closed door in vertical wall */
    case C.S_hcdoor:
        typ = C.DOOR;
        break;
    case C.S_bars:
        typ = C.IRONBARS;
        break;
    case C.S_tree:
        typ = C.TREE;
        break;
    case C.S_room:
    case C.S_darkroom:
        typ = C.ROOM;
        break;
    case C.S_corr:
    case C.S_litcorr:
        typ = C.CORR;
        break;
    case C.S_upstair:
    case C.S_dnstair:
        typ = C.STAIRS;
        break;
    case C.S_upladder:
    case C.S_dnladder:
        typ = C.LADDER;
        break;
    case C.S_altar:
        typ = C.ALTAR;
        break;
    case C.S_grave:
        typ = C.GRAVE;
        break;
    case C.S_throne:
        typ = C.THRONE;
        break;
    case C.S_sink:
        typ = C.SINK;
        break;
    case C.S_fountain:
        typ = C.FOUNTAIN;
        break;
    case C.S_pool:
        typ = C.POOL;
        break;
    case C.S_ice:
        typ = C.ICE;
        break;
    case C.S_lava:
        typ = C.LAVAPOOL;
        break;
    case C.S_vodbridge: /* open drawbridge spanning north/south */
    case C.S_hodbridge:
        typ = C.DRAWBRIDGE_DOWN;
        break;        /* east/west */
    case C.S_vcdbridge: /* closed drawbridge in vertical wall */
    case C.S_hcdbridge:
        typ = C.DBWALL;
        break;
    case C.S_air:
        typ = C.AIR;
        break;
    case C.S_cloud:
        typ = C.CLOUD;
        break;
    case C.S_water:
        typ = C.WATER;
        break;
    case C.S_lavawall:
        typ = C.LAVAWALL;
        break;
    default:
        break; /* not a cmap symbol? */
    }
    return typ;
}

/* With the introduction of themed rooms, there are certain room shapes that
 * may generate a door, the square just inside the door, and only one other
 * ROOM square touching that one. E.g.
 *   ---
 * ---..
 * +....
 * ---..
 *   ---
 * This means that if the room becomes a shop, the shopkeeper will move
 * between those two squares nearest the door without ever allowing the
 * player to get past them.
 * Before approving sroom as a shop, check for this circumstance, and if it
 * exists, don't consider it as valid for a shop.
 *
 * Note that the invalidity of the shape derives from the position of its door
 * already being chosen. It's quite possible that if the door were somewhere
 * else on the perimeter of this room, it would work fine as a shop.*/
export function invalid_shop_shape(sroom)
{
    let x, y;
    let doorx = C.coordxy(C.svd.doors[sroom.fdoor].x);
    let doory = C.coordxy(C.svd.doors[sroom.fdoor].y);
    let insidex = C.coordxy(0), insidey = C.coordxy(0), insidect = C.coordxy(0);

    /* First, identify squares inside the room and next to the door. */
    for (x = C.coordxy(C.max(doorx - 1, sroom.lx));
         x <= C.min(doorx + 1, sroom.hx); x = C.coordxy(x + 1)) {
        for (y = C.coordxy(C.max(doory - 1, sroom.ly));
             y <= C.min(doory + 1, sroom.hy); y = C.coordxy(y + 1)) {
            if (C.levl[x][y].typ == C.ROOM) {
                insidex = C.coordxy(x);
                insidey = C.coordxy(y);
                insidect = C.coordxy(C.coordxy(insidect + 1));
            }
        }
    }
    if (insidect < 1) {
        C.impossible("invalid_shop_shape: no squares inside door?");
        return 1;
    }
    /* if insidect > 1, then the shopkeeper already has alternate
     * squares to move to so we don't need to check further. */
    if (insidect == 1) {
        /* But if it is 1, scan all adjacent squares for other squares
         * that are part of this room. */
        insidect = C.coordxy(0);
        for (x = C.coordxy(C.max(insidex - 1, sroom.lx));
             x <= C.min(insidex + 1, sroom.hx); x = C.coordxy(x + 1)) {
            for (y = C.coordxy(C.max(insidey - 1, sroom.ly));
                 y <= C.min(insidey + 1, sroom.hy); y = C.coordxy(y + 1)) {
                if (x == insidex && y == insidey)
                    continue;
                if (C.levl[x][y].typ == C.ROOM)
                    insidect = C.coordxy(C.coordxy(insidect + 1));
            }
        }
        if (insidect == 1) {
            /* shopkeeper standing just inside the door can only move
             * to one other square; this cannot be a shop. */
            return 1;
        }
    }
    return 0;
}

/*mkroom.c*/

/* SFCTOOL */

/* !SFCTOOL */
