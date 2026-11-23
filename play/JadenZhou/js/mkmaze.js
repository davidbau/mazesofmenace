// mkmaze.js — maze levels, special level fixups and terrain setters.
// C ref: mkmaze.c — set_levltyp, set_levltyp_lit, okay, maze0xy,
// fixup_special, check_ransacked, maze_inbounds, maze_remove_deadends,
// create_maze, pick_vibrasquare_location, populate_maze, makemaz, walkfrom,
// mazexy.
//
// Not ported yet: the water/air levels (setup_waterlevel, movebubbles),
// baalz_fixup, stolen_booty (orc-town loot), fumaroles. (mklev.js has place_lregion and put_lregion_here.)

import { game } from './gstate.js';
import { spot_stop_timers } from './timeout.js';
import { MELT_ICE_AWAY } from './const.js';
import { obj_ice_effects } from './mkobj.js';
import { rn2, rnd, rn1 } from './rng.js';
import {
    STONE, MAX_TYPE, SDOOR, AIR, LADDER, STAIRS, ICE, isok, IS_LAVA,
    HWALL, ROOM, CORR, IS_DOOR, ACCESSIBLE, LR_BRANCH, LR_PORTAL, LR_UPSTAIR,
    LR_DOWNSTAIR, LR_TELE, LR_UPTELE, LR_DOWNTELE, NO_MM_FLAGS,
    MKTRAP_MAZEFLAG, Is_waterlevel, Is_airlevel, Is_stronghold, In_quest,
    MAGIC_PORTAL, CORPSTAT_NONE, TRUE, SPACE_POS, VIBRATING_SQUARE,
    IS_FOUNTAIN, IS_SINK,
} from './const.js';
import { Is_special, dunlevs_in_dungeon, dunlev, Is_branchlev, on_level,
         find_level } from './dungeon.js';
import { load_special } from './sp_lev.js';
import {
    place_lregion, mkstairs, wallification, mktrap, Invocation_lev, place_branch,
    somex, somey, stairway_find_dir, occupied, count_level_features,
} from './mklev.js';
import { distmin } from './hacklib.js';
import { maketrap } from './trap.js';
import { mkobj_at, mksobj_at, mkgold, mk_tt_object, mkcorpstat, set_corpsenm,
         rndmonnum } from './mkobj.js';
import { makemon, goodpos } from './makemon.js';
import { poly_when_stoned } from './mondata.js';
import { mons, PM_MINOTAUR, PM_CLERIC, MR_STONE } from './monsters.js';
import { GEM_CLASS, RANDOM_CLASS, BOULDER, STATUE } from './objects.js';
import { dmonsfree } from './mon.js';
import { bughack } from './mklev.js';
import { COLNO, ROWNO, W_NONDIGGABLE, POOL, IRONBARS, TLWALL, TRWALL, TUWALL,
         TDWALL, BRCORNER, BLCORNER, TRCORNER, TLCORNER, RLOC_ERR,
         RLOC_NOMSG } from './const.js';
import { m_at } from './makemon.js';
import { rloc_mklev } from './teleport.js';

// C ref: mkmaze.c baalz_fixup()
/* wallification of the baalz level's "insect" leaves wall stubs which
   classifies them as superfluous and gets rid of them */
function baalz_fixup() {
    const levl = (x, y) => game.level.at(x, y);
    const bh = bughack();
    let mtmp, x, y, lastx, lasty;

    /*
     * baalz level's nondiggable region surrounds the "insect" and rooms.
     * The outermost perimeter of that region is subject to wall cleanup
     * (hence 'x + 1' and 'y + 1' for starting don't-clean column and row,
     * 'lastx - 1' and 'lasty - 1' for ending don't-clean column and row)
     * and the interior is protected against that (in wall_cleanup()).
     */

    /* find low and high x for to-be-wallified portion of level */
    y = Math.trunc(ROWNO / 2);
    for (lastx = x = 0; x < COLNO; ++x)
        if ((levl(x, y).wall_info & W_NONDIGGABLE) !== 0) {
            if (!lastx)
                bh.inarea.x1 = x + 1;
            lastx = x;
        }
    bh.inarea.x2 = ((lastx > bh.inarea.x1) ? lastx : x) - 1;
    /* find low and high y for to-be-wallified portion of level */
    x = bh.inarea.x1;
    for (lasty = y = 0; y < ROWNO; ++y)
        if ((levl(x, y).wall_info & W_NONDIGGABLE) !== 0) {
            if (!lasty)
                bh.inarea.y1 = y + 1;
            lasty = y;
        }
    bh.inarea.y2 = ((lasty > bh.inarea.y1) ? lasty : y) - 1;
    /* two pools mark where special post-wallify fix-ups are needed */
    for (x = bh.inarea.x1; x <= bh.inarea.x2; ++x)
        for (y = bh.inarea.y1; y <= bh.inarea.y2; ++y)
            if (levl(x, y).typ === POOL) {
                levl(x, y).typ = HWALL;
                if (bh.delarea.x1 === COLNO) {
                    bh.delarea.x1 = x; bh.delarea.y1 = y;
                } else {
                    bh.delarea.x2 = x; bh.delarea.y2 = y;
                }
            } else if (levl(x, y).typ === IRONBARS) {
                /* novelty effect; allowing digging in front of 'eyes' */
                if (isok(x - 1, y)
                    && (levl(x - 1, y).wall_info & W_NONDIGGABLE) !== 0) {
                    levl(x - 1, y).wall_info &= ~W_NONDIGGABLE;
                    if (isok(x - 2, y))
                        levl(x - 2, y).wall_info &= ~W_NONDIGGABLE;
                } else if (isok(x + 1, y)
                    && (levl(x + 1, y).wall_info & W_NONDIGGABLE) !== 0) {
                    levl(x + 1, y).wall_info &= ~W_NONDIGGABLE;
                    if (isok(x + 2, y))
                        levl(x + 2, y).wall_info &= ~W_NONDIGGABLE;
                }
            }

    wallification(Math.max(bh.inarea.x1 - 2, 1),
                  Math.max(bh.inarea.y1 - 2, 0),
                  Math.min(bh.inarea.x2 + 2, COLNO - 1),
                  Math.min(bh.inarea.y2 + 2, ROWNO - 1));

    /* bughack hack for rear-most legs on baalz level; first joint on
       both top and bottom gets a bogus extra connection to room area,
       producing unwanted rectangles; change back to separated legs */
    x = bh.delarea.x1; y = bh.delarea.y1;
    if (isok(x, y) && (levl(x, y).typ === TLWALL || levl(x, y).typ === TRWALL)
        && isok(x, y + 1) && levl(x, y + 1).typ === TUWALL) {
        levl(x, y).typ = (levl(x, y).typ === TLWALL) ? BRCORNER : BLCORNER;
        levl(x, y + 1).typ = HWALL;
        if ((mtmp = m_at(x, y)) !== null && mtmp !== undefined) /* something at temporary pool... */
            rloc_mklev(mtmp, RLOC_ERR | RLOC_NOMSG);
    }

    x = bh.delarea.x2; y = bh.delarea.y2;
    if (isok(x, y) && (levl(x, y).typ === TLWALL || levl(x, y).typ === TRWALL)
        && isok(x, y - 1) && levl(x, y - 1).typ === TDWALL) {
        levl(x, y).typ = (levl(x, y).typ === TLWALL) ? TRCORNER : TLCORNER;
        levl(x, y - 1).typ = HWALL;
        if ((mtmp = m_at(x, y)) !== null && mtmp !== undefined) /* something at temporary pool... */
            rloc_mklev(mtmp, RLOC_ERR | RLOC_NOMSG);
    }

    /* reset bughack region; set low end to <COLNO,ROWNO> so that
       within_bounded_region() in fix_wall_spines() will fail
       most quickly--on its first test--when loading other levels */
    bh.inarea.x1 = bh.delarea.x1 = COLNO;
    bh.inarea.y1 = bh.delarea.y1 = ROWNO;
    bh.inarea.x2 = bh.delarea.x2 = 0;
    bh.inarea.y2 = bh.delarea.y2 = 0;
}

// C ref: mondata.h pm_resistance()
function pm_resistance(ptr, typ) { return (ptr.mresists & typ) !== 0; }

// C ref: mkmaze.c mz_move()
/* move (cc.x, cc.y) one square in direction dir */
function mz_move(cc, dir) {
    switch (dir) {
    case 0: --cc.y; break;
    case 1: cc.x++; break;
    case 2: cc.y++; break;
    case 3: --cc.x; break;
    default: throw new Error(`panic: mz_move: bad direction ${dir}`);
    }
}

// C ref: mkmaze.c okay()
function okay(x, y, dir) {
    const cc = { x, y };
    mz_move(cc, dir);
    mz_move(cc, dir);
    if (cc.x < 3 || cc.y < 3 || cc.x > game.x_maze_max || cc.y > game.y_maze_max
        || game.level.at(cc.x, cc.y).typ !== STONE)
        return false;
    return true;
}

// C ref: mkmaze.c maze0xy()
/* find random starting point for maze generation */
function maze0xy(cc) {
    cc.x = 3 + 2 * rn2((game.x_maze_max >> 1) - 1);
    cc.y = 3 + 2 * rn2((game.y_maze_max >> 1) - 1);
    return;
}

// C ref: mkmaze.c fixup_special()
export function fixup_special() {
    const lregions = game.lregions || [];
    let added_branch = false;

    if (Is_waterlevel(game.u.uz) || Is_airlevel(game.u.uz)) {
        /* water level is an odd beast - it has to be set up
           before calling place_lregions etc. */
        throw new Error('fixup_special(): setup_waterlevel() not ported yet');
    }
    for (let x = 0; x < lregions.length; x++) {
        const r = lregions[x];
        let lev = null;

        switch (r.rtype) {
        case LR_BRANCH:
            added_branch = true;
            place_lregion(r.inarea.x1, r.inarea.y1, r.inarea.x2,
                          r.inarea.y2, r.delarea.x1, r.delarea.y1,
                          r.delarea.x2, r.delarea.y2, r.rtype, lev);
            break;

        case LR_PORTAL:
            if (r.rname && r.rname[0] >= '0' && r.rname[0] <= '9') {
                /* "chutes and ladders" */
                lev = { dnum: game.u.uz.dnum, dlevel: parseInt(r.rname, 10) };
            } else {
                const sp = find_level(r.rname);
                lev = sp.dlevel;
            }
            /*FALLTHRU*/
        case LR_UPSTAIR:
        case LR_DOWNSTAIR:
            /* place_it: */
            place_lregion(r.inarea.x1, r.inarea.y1, r.inarea.x2,
                          r.inarea.y2, r.delarea.x1, r.delarea.y1,
                          r.delarea.x2, r.delarea.y2, r.rtype, lev);
            break;

        case LR_TELE:
        case LR_UPTELE:
        case LR_DOWNTELE:
            /* save the region outlines for goto_level() */
            if (r.rtype === LR_TELE || r.rtype === LR_UPTELE) {
                game.updest = {
                    lx: r.inarea.x1, ly: r.inarea.y1,
                    hx: r.inarea.x2, hy: r.inarea.y2,
                    nlx: r.delarea.x1, nly: r.delarea.y1,
                    nhx: r.delarea.x2, nhy: r.delarea.y2,
                };
            }
            if (r.rtype === LR_TELE || r.rtype === LR_DOWNTELE) {
                game.dndest = {
                    lx: r.inarea.x1, ly: r.inarea.y1,
                    hx: r.inarea.x2, hy: r.inarea.y2,
                    nlx: r.delarea.x1, nly: r.delarea.y1,
                    nhx: r.delarea.x2, nhy: r.delarea.y2,
                };
            }
            /* place_lregion gets called from goto_level() */
            break;
        }

        r.rname = null;
    }

    /* place dungeon branch if not placed above */
    if (!added_branch && Is_branchlev(game.u.uz)) {
        place_lregion(0, 0, 0, 0, 0, 0, 0, 0, LR_BRANCH, null);
    }

    /* Still need to add some stuff to level file */
    if (on_level(game.u.uz, game.dungeon_topology.d_medusa_level)) { /* Is_medusa_level() */
        let otmp;
        let tryct;

        const croom = game.level.rooms[0]; /* the first room defined on the medusa level */
        for (tryct = rnd(4); tryct; tryct--) {
            const x = somex(croom);
            const y = somey(croom);
            if (goodpos(x, y, null, 0)) {
                let tryct2 = 0;

                otmp = mk_tt_object(STATUE, x, y);
                while (++tryct2 < 100 && otmp
                       && (poly_when_stoned(mons[otmp.corpsenm])
                           || pm_resistance(mons[otmp.corpsenm], MR_STONE))) {
                    /* set_corpsenm() handles weight too */
                    set_corpsenm(otmp, rndmonnum());
                }
            }
        }

        if (rn2(2))
            otmp = mk_tt_object(STATUE, somex(croom), somey(croom));
        else /* Medusa statues don't contain books */
            otmp = mkcorpstat(STATUE, null, null,
                              somex(croom), somey(croom), CORPSTAT_NONE);
        if (otmp) {
            tryct = 0;
            while (++tryct < 100
                   && (pm_resistance(mons[otmp.corpsenm], MR_STONE)
                       || poly_when_stoned(mons[otmp.corpsenm]))) {
                /* set_corpsenm() handles weight too */
                set_corpsenm(otmp, rndmonnum());
            }
        }
    } else if (game.urole.mnum === PM_CLERIC && In_quest(game.u.uz)) {
        /* less chance for undead corpses (lured from lower morgues) */
        game.level.flags.graveyard = 1;
    } else if (Is_stronghold(game.u.uz)) {
        game.level.flags.graveyard = 1;
    } else if (on_level(game.u.uz, game.dungeon_topology.d_baalzebub_level)) {
        /* custom wallify the "beetle" potion of the level */
        baalz_fixup();
    } else if (game.u.uz.dnum === game.dungeon_topology.d_mines_dnum
               && game.ransacked) {
        throw new Error('fixup_special(): stolen_booty() not ported yet');
    }

    const sp = Is_special(game.u.uz);
    if (sp && sp.flags.town) /* Mine Town */
        game.level.flags.has_town = 1;

    game.lregions = null;
    game.num_lregions = 0;
}

// C ref: mkmaze.c check_ransacked()
function check_ransacked(s) {
    /* this kludge only works as long as orctown is minetn-1 */
    game.ransacked = (game.u.uz.dnum === game.dungeon_topology.d_mines_dnum
                      && s === 'minetn-1');
}

// C ref: mkmaze.c maze_inbounds()
function maze_inbounds(x, y) {
    return (x >= 2 && y >= 2
            && x < game.x_maze_max && y < game.y_maze_max
            /* isok() test is superfluous here (unless something has
               clobbered the static *_maze_max variables) */
            && isok(x, y));
}

// C ref: mkmaze.c maze_remove_deadends()
function maze_remove_deadends(typ) {
    const dirok = [0, 0, 0, 0];
    const levl = (x, y) => game.level.at(x, y);

    for (let x = 2; x < game.x_maze_max; x++)
        for (let y = 2; y < game.y_maze_max; y++)
            if (ACCESSIBLE(levl(x, y).typ) && (x % 2) && (y % 2)) {
                let idx = 0, idx2 = 0;
                for (let dir = 0; dir < 4; dir++) {
                    const d1 = { x, y }, d2 = { x, y };
                    mz_move(d1, dir);
                    if (!maze_inbounds(d1.x, d1.y)) {
                        idx2++;
                        continue;
                    }
                    mz_move(d2, dir);
                    mz_move(d2, dir);
                    if (!maze_inbounds(d2.x, d2.y)) {
                        idx2++;
                        continue;
                    }
                    if (!ACCESSIBLE(levl(d1.x, d1.y).typ)
                        && ACCESSIBLE(levl(d2.x, d2.y).typ)) {
                        dirok[idx++] = dir;
                        idx2++;
                    }
                }
                if (idx2 >= 3 && idx > 0) {
                    const d = { x, y };
                    const dir = dirok[rn2(idx)];
                    mz_move(d, dir);
                    levl(d.x, d.y).typ = typ;
                }
            }
}

// C ref: mkmaze.c create_maze()
/* Create a maze with specified corridor width and wall thickness
 * TODO: rewrite walkfrom so it works on temp space, not levl
 */
export function create_maze(corrwid, wallthick, rmdeadends) {
    let x, y;
    const mm = { x: 0, y: 0 };
    const tmp_xmax = game.x_maze_max;
    const tmp_ymax = game.y_maze_max;
    let rdx = 0;
    let rdy = 0;
    let scale;
    const levl = (xx, yy) => game.level.at(xx, yy);

    if (corrwid === -1)
        corrwid = rnd(4);

    if (wallthick === -1)
        wallthick = rnd(4) - corrwid;

    if (wallthick < 1)
        wallthick = 1;
    else if (wallthick > 5)
        wallthick = 5;

    if (corrwid < 1)
        corrwid = 1;
    else if (corrwid > 5)
        corrwid = 5;

    scale = corrwid + wallthick;
    rdx = Math.trunc(game.x_maze_max / scale);
    rdy = Math.trunc(game.y_maze_max / scale);

    if (game.level.flags.corrmaze)
        for (x = 2; x < (rdx * 2); x++)
            for (y = 2; y < (rdy * 2); y++)
                levl(x, y).typ = STONE;
    else
        for (x = 2; x <= (rdx * 2); x++)
            for (y = 2; y <= (rdy * 2); y++)
                levl(x, y).typ = ((x % 2) && (y % 2)) ? STONE : HWALL;

    /* set upper bounds for maze0xy and walkfrom */
    game.x_maze_max = (rdx * 2);
    game.y_maze_max = (rdy * 2);

    /* create maze */
    maze0xy(mm);
    walkfrom(mm.x, mm.y, 0);

    if (rmdeadends)
        maze_remove_deadends((game.level.flags.corrmaze) ? CORR : ROOM);

    /* restore bounds */
    game.x_maze_max = tmp_xmax;
    game.y_maze_max = tmp_ymax;

    /* scale maze up if needed */
    if (scale > 2) {
        const tmpmap = [];
        let mx, my, dx, dy, rx = 1, ry = 1;

        /* back up the existing smaller maze */
        for (x = 1; x < game.x_maze_max; x++) {
            tmpmap[x] = [];
            for (y = 1; y < game.y_maze_max; y++) {
                tmpmap[x][y] = levl(x, y).typ;
            }
        }

        /* do the scaling */
        rx = x = 2;
        while (rx < game.x_maze_max) {
            mx = (x % 2) ? corrwid : (x === 2 || x === rdx * 2) ? 1 : wallthick;
            ry = y = 2;
            while (ry < game.y_maze_max) {
                my = (y % 2) ? corrwid
                     : (y === 2 || y === rdy * 2) ? 1
                       : wallthick;
                for (dx = 0; dx < mx; dx++)
                    for (dy = 0; dy < my; dy++) {
                        if (rx + dx >= game.x_maze_max
                            || ry + dy >= game.y_maze_max)
                            break;
                        levl(rx + dx, ry + dy).typ = tmpmap[x][y];
                    }
                ry += my;
                y++;
            }
            rx += mx;
            x++;
        }
    }
}

// C ref: mkmaze.c pick_vibrasquare_location()
export function pick_vibrasquare_location() {
    let x, y;
    let stway;
    let trycnt = 0;
    /* these are also defined in mklev.c and they may not be appropriate
       for mazes with corridors wider than 1 or for cavernous levels */
    const x_maze_min = 2;
    const y_maze_min = 2;

    /*
     * Pick a position where the stairs down to Moloch's Sanctum
     * level will ultimately be created.  At that time, an area
     * will be altered:  walls removed, moat and traps generated,
     * boulders destroyed.  The position picked here must ensure
     * that that invocation area won't extend off the map.
     *
     * We actually allow up to 2 squares around the usual edge of
     * the area to get truncated; see mkinvokearea(mklev.c).
     */
    const INVPOS_X_MARGIN = (6 - 2);
    const INVPOS_Y_MARGIN = (5 - 2);
    const INVPOS_DISTANCE = 11;
    const x_range = game.x_maze_max - x_maze_min - 2 * INVPOS_X_MARGIN - 1,
        y_range = game.y_maze_max - y_maze_min - 2 * INVPOS_Y_MARGIN - 1;

    /* debugpline2("svi.inv_pos: maze is too small! ...") when the
       ranges are too small: debug output only */
    if (!game.inv_pos) game.inv_pos = { x: 0, y: 0 };
    game.inv_pos.x = game.inv_pos.y = 0; /*{occupied() => invocation_pos()}*/
    do {
        x = rn1(x_range, x_maze_min + INVPOS_X_MARGIN + 1);
        y = rn1(y_range, y_maze_min + INVPOS_Y_MARGIN + 1);
        /* we don't want it to be too near the stairs, nor
           to be on a spot that's already in use (wall|trap) */
        if (++trycnt > 1000)
            break;
    } while (((stway = stairway_find_dir(TRUE)) !== null)
             && (x === stway.sx || y === stway.sy /*(direct line)*/
                 || Math.abs(x - stway.sx) === Math.abs(y - stway.sy)
                 || distmin(x, y, stway.sx, stway.sy) <= INVPOS_DISTANCE
                 || !SPACE_POS(game.level.at(x, y).typ) || occupied(x, y)));
    game.inv_pos.x = x;
    game.inv_pos.y = y;
}

// C ref: mkmaze.c populate_maze()
function populate_maze() {
    let i;
    const mm = { x: 0, y: 0 };

    for (i = rn1(8, 11); i; i--) {
        mazexy(mm);
        mkobj_at(rn2(2) ? GEM_CLASS : RANDOM_CLASS, mm.x, mm.y, true);
    }
    for (i = rn1(10, 2); i; i--) {
        mazexy(mm);
        mksobj_at(BOULDER, mm.x, mm.y, true, false);
    }
    for (i = rn2(3); i; i--) {
        mazexy(mm);
        makemon(mons[PM_MINOTAUR], mm.x, mm.y, NO_MM_FLAGS);
    }
    for (i = rn1(5, 7); i; i--) {
        mazexy(mm);
        makemon(null, mm.x, mm.y, NO_MM_FLAGS);
    }
    for (i = rn1(6, 7); i; i--) {
        mazexy(mm);
        mkgold(0, mm.x, mm.y);
    }
    for (i = rn1(6, 7); i; i--)
        mktrap(0, MKTRAP_MAZEFLAG, null, null);
}

// C ref: mkmaze.c makemaz()
/* special levels (des-file/Lua protofiles), dungeon fill levels (e.g. the
   Gnomish Mines' minefill) and random mazes */
export function makemaz(s) {
    let protofile;
    const sp = Is_special(game.u.uz);
    const mm = { x: 0, y: 0 };
    const dproto = game.dungeons[game.u.uz.dnum].proto;

    if (s) {
        if (sp && sp.rndlevs)
            protofile = `${s}-${rnd(sp.rndlevs)}`;
        else
            protofile = s;
    } else if (dproto) {
        if (dunlevs_in_dungeon(game.u.uz) > 1) {
            if (sp && sp.rndlevs)
                protofile = `${dproto}${dunlev(game.u.uz)}-${rnd(sp.rndlevs)}`;
            else
                protofile = `${dproto}${dunlev(game.u.uz)}`;
        } else if (sp && sp.rndlevs) {
            protofile = `${dproto}-${rnd(sp.rndlevs)}`;
        } else
            protofile = dproto;
    } else
        protofile = '';

    /* SPLEVTYPE format is "level-choice,level-choice"...: read with
       getenv() in wizard mode; the JS port has no environment */

    if (protofile) {
        check_ransacked(protofile);
        protofile += '.lua'; /* LEV_EXT */
        game.in_mk_themerooms = false;
        if (load_special(protofile)) {
            /* some levels can end up with monsters
               on dead mon list, including light source monsters */
            dmonsfree();
            return; /* no mazification right now */
        }
        console.error(`impossible: Couldn't load "${protofile}" - making a maze.`);
    }

    game.level.flags.is_maze_lev = 1;
    game.level.flags.corrmaze = !rn2(3);

    if (!Invocation_lev(game.u.uz) && rn2(2)) {
        create_maze(-1, -1, !rn2(5));
    } else {
        create_maze(1, 1, false);
    }

    if (!game.level.flags.corrmaze)
        wallification(2, 2, game.x_maze_max, game.y_maze_max);

    mazexy(mm);
    mkstairs(mm.x, mm.y, 1, null, false); /* up */
    if (!Invocation_lev(game.u.uz)) {
        mazexy(mm);
        mkstairs(mm.x, mm.y, 0, null, false); /* down */
    } else { /* choose "vibrating square" location */
        pick_vibrasquare_location();
        maketrap(game.inv_pos.x, game.inv_pos.y, VIBRATING_SQUARE);
    }

    /* place branch stair or portal */
    place_branch(Is_branchlev(game.u.uz), 0, 0);

    populate_maze();
}

// C ref: mkmaze.c mkportal()
export function mkportal(x, y, todnum, todlevel) {
    /* a portal "trap" must be matched by a
       portal in the destination dungeon/dlevel */
    const ttmp = maketrap(x, y, MAGIC_PORTAL);

    if (!ttmp) {
        console.error('impossible: portal on top of portal?');
        return;
    }
    ttmp.dst = { dnum: todnum, dlevel: todlevel };
    return;
}

// C ref: mkmaze.c walkfrom() (the recursive, !MICRO version)
export function walkfrom(x, y, typ) {
    let q, a, dir;
    const dirs = [0, 0, 0, 0];
    const levl = (xx, yy) => game.level.at(xx, yy);

    if (!typ) {
        if (game.level.flags.corrmaze)
            typ = CORR;
        else
            typ = ROOM;
    }

    if (!IS_DOOR(levl(x, y).typ)) {
        /* might still be on edge of MAP, so don't overwrite */
        levl(x, y).typ = typ;
        levl(x, y).flags = 0;
    }

    while (1) {
        q = 0;
        for (a = 0; a < 4; a++)
            if (okay(x, y, a))
                dirs[q++] = a;
        if (!q)
            return;
        dir = dirs[rn2(q)];
        const cc = { x, y };
        mz_move(cc, dir);
        levl(cc.x, cc.y).typ = typ;
        mz_move(cc, dir);
        x = cc.x, y = cc.y;
        walkfrom(x, y, typ);
    }
}

// C ref: mkmaze.c mazexy()
/* find random point in generated corridors,
   so we don't create items in moats, bunkers, or walls */
export function mazexy(cc) {
    let x, y;
    const allowedtyp = (game.level.flags.corrmaze ? CORR : ROOM);
    let cpt = 0;

    do {
        /* once upon a time this only considered odd values greater than 2
           and less than N (for N=={x,y}_maze_max) because even values were
           where maze walls always got placed; when wider maze corridors
           were introduced it was changed to 1+rn2(N) which is just an
           obscure way to get rnd(N); probably ought to be using 2+rn2(N-1)
           to exclude the maze's outer boundary walls; trying and rejecting
           those walls will waste some of the 100 random attempts... */
        x = rnd(game.x_maze_max);
        y = rnd(game.y_maze_max);
        if (game.level.at(x, y).typ === allowedtyp) {
            cc.x = x;
            cc.y = y;
            return;
        }
    } while (++cpt < 100);
    /* 100 random attempts failed; systematically try every possibility */
    for (x = 1; x <= game.x_maze_max; x++)
        for (y = 1; y <= game.y_maze_max; y++)
            if (game.level.at(x, y).typ === allowedtyp) {
                cc.x = x;
                cc.y = y;
                return;
            }
    /* every spot on the area of map allowed for mazes has been rejected */
    throw new Error('panic: mazexy: can\'t find a place!');
}

// rm.h SET_LIT_RANDOM, SET_LIT_NOCHANGE
export const SET_LIT_RANDOM = -1;
export const SET_LIT_NOCHANGE = -2;

// C ref: rm.h CAN_OVERWRITE_TERRAIN()
function CAN_OVERWRITE_TERRAIN(ttyp) {
    return (game.iflags?.debug_overwrite_stairs || !(ttyp === LADDER || ttyp === STAIRS));
}

// C ref: mkmaze.c set_levltyp()
/* change map location terrain type during level creation (not used
   during gameplay); updates level's feature counts */
export function set_levltyp(x, y, newtyp) {
    if (isok(x, y) && newtyp >= STONE && newtyp < MAX_TYPE) {
        const loc = game.level.at(x, y);
        const oldtyp = loc.typ;

        /* hack for secret doors in garden theme rooms */
        if (oldtyp === SDOOR && newtyp === AIR) {
            /* levl[][].typ stays SDOOR rather than change to AIR */
            loc.arboreal_sdoor = 1;
            return true;
        }

        if (CAN_OVERWRITE_TERRAIN(oldtyp)) {
            /* is_ice(x, y): the drawbridge case is not ported */
            const was_ice = (oldtyp === ICE);

            loc.typ = newtyp;

            if (IS_LAVA(newtyp)) /* [what about IS_LAVA(oldtyp)=>.lit = 0?] */
                loc.lit = true;
            if (was_ice && newtyp !== ICE) {
                /* frozen corpses resume rotting, no more ice to melt away */
                obj_ice_effects(x, y, true);
                spot_stop_timers(x, y, MELT_ICE_AWAY);
            }
            if ((IS_FOUNTAIN(oldtyp) !== IS_FOUNTAIN(newtyp))
                || (IS_SINK(oldtyp) !== IS_SINK(newtyp)))
                count_level_features(); /* level.flags.nfountains,nsinks */
            return true;
        }
    }
    return false;
}

// C ref: mkmaze.c set_levltyp_lit()
/* set map terrain type and light state */
export function set_levltyp_lit(x, y, typ, lit) {
    const ret = set_levltyp(x, y, typ);

    if (ret && isok(x, y)) {
        if (lit !== SET_LIT_NOCHANGE) {
            if (IS_LAVA(typ))
                lit = 1;
            else if (lit === SET_LIT_RANDOM)
                lit = rn2(2);

            game.level.at(x, y).lit = !!lit;
        }
    }
    return ret;
}
