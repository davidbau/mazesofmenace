// trap.js — trap creation.
// C ref: trap.c maketrap(), t_at() (in trap.c as of 3.7), choose_trapnote(),
// dng_bottom(), hole_destination().
//
// Not ported yet: mkroll_launch() (ROLLING_BOULDER_TRAP, difficulty >= 2), shop damage,
// set_levltyp()'s object/timer side effects, unearth_objs(),
// recalc_block_point(), Sokoban bookkeeping.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { dunlev, dunlevs_in_dungeon, In_hell } from './dungeon.js';
import {
    ROOM, CORR, DOOR, STONE, SCORR, SDOOR, DRAWBRIDGE_UP, STAIRS, LADDER,
    IS_FURNITURE, IS_WALL, IS_POOL, IS_ROOM, LAVAPOOL, In_quest,
    CORPSTAT_NONE, MM_NOCOUNTBIRTH, MM_NOMSG,
    TOOKPLUNGE, VIASITTING, HURTLING, isok,
} from './const.js';
import { mons, S_UNICORN, M2_JEWELS, S_VORTEX, M1_AMORPHOUS, M1_UNSOLID,
         M1_CLING, MZ_SMALL, PM_AIR_ELEMENTAL, PM_CAVE_SPIDER,
         PM_GIANT_SPIDER, PM_IRON_GOLEM, AD_SLEE, AD_FIRE, AD_MAGM,
       } from './monsters.js';
import { is_flyer, is_floater, defended, resists_sleep, resists_fire,
         resists_magm } from './mondata.js';
import { STATUE } from './objects.js';
import { rndmonnum_adj, mkcorpstat, add_to_container, weight } from './mkobj.js';
import { makemon } from './makemon.js';
import { mongone } from './mon.js';

// C ref: mondata.h likes_gems(), is_unicorn()
function likes_gems(ptr) { return (ptr.mflags2 & M2_JEWELS) !== 0; }
function is_unicorn(ptr) { return ptr.mlet === S_UNICORN && likes_gems(ptr); }
// C ref: hacklib.c sgn()
function sgn(n) { return (n < 0) ? -1 : (n !== 0); }

// C ref: trap.c mk_trap_statue()
/* create a "living" statue at x,y */
function mk_trap_statue(x, y) {
    let mtmp, otmp, statue, mptr;
    let trycount = 10;

    do { /* avoid ultimately hostile co-aligned unicorn */
        mptr = mons[rndmonnum_adj(3, 6)];
    } while (--trycount > 0 && is_unicorn(mptr)
             && sgn(game.u.ualign.type) === sgn(mptr.maligntyp));
    statue = mkcorpstat(STATUE, null, mptr, x, y, CORPSTAT_NONE);
    mtmp = makemon(mons[statue.corpsenm], 0, 0, MM_NOCOUNTBIRTH | MM_NOMSG);
    if (!mtmp)
        return; /* should never happen */
    /* C's minvent chain head is the most recently added item; JS keeps
       minvent as an array with the newest last */
    while (mtmp.minvent && mtmp.minvent.length) {
        otmp = mtmp.minvent.pop();
        otmp.owornmask = 0;
        /* obj_extract_self(otmp) */
        otmp.where = 'OBJ_FREE';
        add_to_container(statue, otmp);
    }
    statue.owt = weight(statue);
    mongone(mtmp);
}

export const NO_TRAP = 0;
export const ARROW_TRAP = 1;
export const DART_TRAP = 2;
export const ROCKTRAP = 3;
export const SQKY_BOARD = 4;
export const BEAR_TRAP = 5;
export const LANDMINE = 6;
export const ROLLING_BOULDER_TRAP = 7;
export const SLP_GAS_TRAP = 8;
export const RUST_TRAP = 9;
export const FIRE_TRAP = 10;
export const PIT = 11;
export const SPIKED_PIT = 12;
export const HOLE = 13;
export const TRAPDOOR = 14;
export const TELEP_TRAP = 15;
export const LEVEL_TELEP = 16;
export const MAGIC_PORTAL = 17;
export const WEB = 18;
export const STATUE_TRAP = 19;
export const MAGIC_TRAP = 20;
export const ANTI_MAGIC = 21;
export const POLY_TRAP = 22;
export const VIBRATING_SQUARE = 23;
export const TRAPPED_DOOR = 24;
export const TRAPPED_CHEST = 25;
export const TRAPNUM = 26;

// C ref: trap.h is_pit(), is_hole(), unhideable_trap(), undestroyable_trap()
export function is_pit(ttyp) { return ttyp === PIT || ttyp === SPIKED_PIT; }
export function is_hole(ttyp) { return ttyp === HOLE || ttyp === TRAPDOOR; }
function unhideable_trap(ttyp) { return ttyp === HOLE; }
function undestroyable_trap(ttyp) {
    return ttyp === MAGIC_PORTAL || ttyp === VIBRATING_SQUARE;
}

// C ref: rm.h CAN_OVERWRITE_TERRAIN()  (stairs and ladders can't be)
function CAN_OVERWRITE_TERRAIN(typ) {
    return typ !== STAIRS && typ !== LADDER;
}

function ftraps() {
    const lvl = game.level;
    if (!lvl.traps) lvl.traps = [];
    return lvl.traps;
}

// C ref: trap.c t_at()
export function t_at(x, y) {
    for (const trap of ftraps())
        if (trap.tx === x && trap.ty === y)
            return trap;
    return null;
}

// C ref: trap.c floor_trigger()
/* used for both the hero and monsters */
export function floor_trigger(ttyp) {
    switch (ttyp) {
    case ARROW_TRAP:
    case DART_TRAP:
    case ROCKTRAP:
    case SQKY_BOARD:
    case BEAR_TRAP:
    case LANDMINE:
    case ROLLING_BOULDER_TRAP:
    case SLP_GAS_TRAP:
    case RUST_TRAP:
    case FIRE_TRAP:
    case PIT:
    case SPIKED_PIT:
    case HOLE:
    case TRAPDOOR:
        return true;
    default:
        return false;
    }
}

// C ref: trap.c check_in_air()
/* return TRUE if monster mtmp is up in the air, considering trap flags */
export function check_in_air(mtmp, trflags) {
    const is_you = (mtmp === game.youmonst),
          plunged = (trflags & (TOOKPLUNGE | VIASITTING)) !== 0;

    if (is_you)
        throw new Error('check_in_air(): Levitation/Flying for hero not ported yet');
    return ((trflags & HURTLING) !== 0
            || is_floater(mtmp.data)
            || (is_flyer(mtmp.data) && !plunged));
}

// C ref: trap.h fixed_tele_trap()
export function fixed_tele_trap(t) {
    return (t.ttyp === TELEP_TRAP && isok(t.launch.x, t.launch.y));
}

/* mondata.h */
function amorphous(ptr) { return (ptr.mflags1 & M1_AMORPHOUS) !== 0; }
function unsolid(ptr) { return (ptr.mflags1 & M1_UNSOLID) !== 0; }
function is_clinger(ptr) { return (ptr.mflags1 & M1_CLING) !== 0; }
function is_whirly(ptr) {
    return ptr.mlet === S_VORTEX || ptr === mons[PM_AIR_ELEMENTAL];
}
function webmaker(ptr) {
    return ptr === mons[PM_CAVE_SPIDER] || ptr === mons[PM_GIANT_SPIDER];
}

// C ref: trap.c m_harmless_trap()
/* is trap ttmp harmless to monster mtmp? */
export function m_harmless_trap(mtmp, ttmp) {
    const mdat = mtmp.data;
    const Sokoban = game.level.flags.sokoban_rules;

    /* this handles most of the traps, but those are still included
       in the switch case below for completeness */
    if (!Sokoban && floor_trigger(ttmp.ttyp) && check_in_air(mtmp, 0))
        return true;

    switch (ttmp.ttyp) {
    case ARROW_TRAP:
        break;
    case DART_TRAP:
        break;
    case ROCKTRAP:
        break;
    case SQKY_BOARD:
        break;
    case BEAR_TRAP:
        if (mdat.msize <= MZ_SMALL || amorphous(mdat)
            || is_whirly(mdat) || unsolid(mdat))
            return true;
        break;
    case LANDMINE:
        break;
    case ROLLING_BOULDER_TRAP:
        break;
    case SLP_GAS_TRAP:
        if (resists_sleep(mtmp) || defended(mtmp, AD_SLEE))
            return true;
        break;
    case RUST_TRAP:
        if (mdat !== mons[PM_IRON_GOLEM])
            return true;
        break;
    case FIRE_TRAP:
        if (resists_fire(mtmp) || defended(mtmp, AD_FIRE))
            return true;
        break;
    case PIT:
    case SPIKED_PIT:
    case HOLE:
    case TRAPDOOR:
        if (is_clinger(mdat) && !Sokoban)
            return true;
        break;
    case TELEP_TRAP:
        break;
    case LEVEL_TELEP:
        break;
    case MAGIC_PORTAL:
        break;
    case WEB:
        if (amorphous(mdat) || webmaker(mdat)
            || is_whirly(mdat) || unsolid(mdat))
            return true;
        break;
    case STATUE_TRAP:
        return true;
    case MAGIC_TRAP:
        return true; /* usually */
    case ANTI_MAGIC:
        if (resists_magm(mtmp) || defended(mtmp, AD_MAGM))
            return true;
        break;
    case POLY_TRAP:
        break;
    case VIBRATING_SQUARE:
        return true;
    default:
        /* impossible("m_harmless_trap: unknown trap %i") */
        break;
    }

    return false;
}

// C ref: trap.c choose_trapnote()
function choose_trapnote(ttmp) {
    const tavail = new Array(12).fill(0), tpick = new Array(12).fill(0);
    let tcnt = 0;

    for (const t of ftraps())
        if (t.ttyp === SQKY_BOARD && t !== ttmp)
            tavail[t.tnote] = 1;
    /* now populate tpick[] with the available indices */
    for (let k = 0; k < 12; ++k)
        if (tavail[k] === 0)
            tpick[tcnt++] = k;
    /* choose an unused note; if all are in use, pick a random one */
    return (tcnt > 0) ? tpick[rn2(tcnt)] : rn2(12);
}

// C ref: trap.c dng_bottom()
function dng_bottom(lev) {
    let bottom = dunlevs_in_dungeon(lev);

    /* when in the upper half of the quest, don't fall past the
       middle "quest locate" level if hero hasn't been there yet */
    if (In_quest(lev)) {
        const qlocate_depth = game.dungeon_topology?.d_qlocate_level?.dlevel;
        /* dunlev_reached() is not ported; the quest isn't generated yet */
        if (qlocate_depth != null && dunlev(lev) < qlocate_depth)
            bottom = qlocate_depth; /* early cut-off */
    } else if (In_hell(lev)) {
        if (!game.u.uevent?.invoked)
            bottom -= 1;
    }
    return bottom;
}

// C ref: trap.c hole_destination()
function hole_destination(dst) {
    const bottom = dng_bottom(game.u.uz);

    dst.dnum = game.u.uz.dnum;
    dst.dlevel = dunlev(game.u.uz);
    while (dst.dlevel < bottom) {
        dst.dlevel++;
        if (rn2(4))
            break;
    }
}

// C ref: trap.c maketrap()
export function maketrap(x, y, typ) {
    let oldplace;
    let ttmp;
    const lev = game.level.at(x, y);

    if (typ === TRAPPED_DOOR || typ === TRAPPED_CHEST)
        return null;

    if ((ttmp = t_at(x, y)) !== null) {
        if (undestroyable_trap(ttmp.ttyp))
            return null;
        oldplace = true;
        /* u.utrap handling: the hero isn't on the level during mklev */
    } else if (!CAN_OVERWRITE_TERRAIN(lev.typ) /* stairs */
               || IS_POOL(lev.typ) || lev.typ === LAVAPOOL
               || (IS_FURNITURE(lev.typ) && (typ !== PIT && typ !== HOLE))
               || (lev.typ === DRAWBRIDGE_UP && typ === MAGIC_PORTAL)) {
        /* IS_AIR and single_level_branch(LEVEL_TELEP) cases: no air
           levels or one-level branches are generated by this port yet */
        return null;
    } else {
        oldplace = false;
        ttmp = { tx: x, ty: y };
    }
    /* [re-]initialize all fields except ntrap (handled below) and <tx,ty> */
    ttmp.launch = { x: -1, y: -1 }; /* force error if used before set */
    ttmp.dst = { dnum: -1, dlevel: -1 };
    ttmp.madeby_u = 0;
    ttmp.once = 0;
    ttmp.tseen = unhideable_trap(typ);
    ttmp.ttyp = typ;

    switch (typ) {
    case SQKY_BOARD:
        ttmp.tnote = choose_trapnote(ttmp);
        break;
    case STATUE_TRAP: /* create a "living" statue */
        mk_trap_statue(x, y);
        break;
    case ROLLING_BOULDER_TRAP: /* boulder will roll towards trigger */
        /* mkroll_launch(ttmp, x, y, BOULDER, 1L): not ported yet */
        break;
    case PIT:
    case SPIKED_PIT:
        ttmp.conjoined = 0;
        /* FALLTHRU */
    case HOLE:
    case TRAPDOOR:
        if (is_hole(typ))
            hole_destination(ttmp.dst);
        /* shop damage (in_rooms(x, y, SHOPBASE)): no shops filled yet */
        if (lev.typ === DRAWBRIDGE_UP) {
            /* drawbridges aren't generated by this port yet */
        } else if (IS_ROOM(lev.typ)) {
            /* set_levltyp(x, y, ROOM) */
            lev.typ = ROOM;
        } else if (lev.typ === STONE || lev.typ === SCORR) {
            lev.typ = CORR;
        } else if (IS_WALL(lev.typ) || lev.typ === SDOOR) {
            lev.typ = game.level.flags.is_maze_lev ? ROOM
                      : game.level.flags.is_cavernous_lev ? CORR
                        : DOOR;
        }
        lev.flags = 0;
        break;
    case TELEP_TRAP:
        /* gl.launchplace is only set by special-level loaders */
        break;
    }

    if (!oldplace) {
        /* C prepends to gf.ftrap */
        ftraps().unshift(ttmp);
    }
    return ttmp;
}
