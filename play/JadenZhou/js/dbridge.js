// dbridge.js — drawbridges.
// C ref: dbridge.c — create_drawbridge, the entity code (e_at, m_to_e,
// u_to_e, set_entity, e_nam, E_phrase, e_survives_at, e_died, automiss,
// e_missed, e_jumps, do_entity, nokiller), close_drawbridge,
// open_drawbridge, destroy_drawbridge.
// zap.js has find_drawbridge(), dig.js is_ice(), hack.js is_pool_or_lava(),
// display.js db_under_typ().

import { impossible } from './hack.js';
import { game } from './gstate.js';
import {
    IS_WALL, DRAWBRIDGE_UP, DRAWBRIDGE_DOWN, DBWALL, DOOR, LAVAPOOL,
    D_NODOOR, W_NONDIGGABLE, DB_NORTH, DB_SOUTH, DB_EAST, DB_WEST, DB_LAVA,
    DB_DIR, IS_DRAWBRIDGE,
} from './const.js';
import { isok } from './hacklib.js';
import { DB_UNDER, DB_MOAT, DB_ICE, MOAT, ICE, ROOM, ICED_MOAT, OBJ_AT, u_at,
         Is_stronghold, XKILL_GIVEMSG, XKILL_NOMSG, XKILL_NOCORPSE,
         XKILL_NOCONDUCT, CRUSHING, DROWNING, BURNING, KILLED_BY_AN,
         NO_KILLER_PREFIX, MAY_HIT, TELEDS_NO_FLAGS } from './const.js';
import { mons, PM_LONG_WORM_TAIL, AD_DGST, AD_PHYS } from './monsters.js';
import { m_at, place_monster, is_pool, is_lava, sobj_at } from './makemon.js';
import { mon_nam, Monnam } from './do_name.js';
import { vtense } from './objnam.js';
import { canseemon, canspotmon, pline, pline_The, You, You_hear, You_see,
         newsym } from './display.js';
import { noncorporeal, is_swimmer, is_flyer, is_floater, likes_lava,
         passes_walls } from './mondata.js';
import { Wwalking, Amphibious, Breathless, Swimming, Flying, Levitation,
         Passes_walls, Unaware, Fumbling, Confusion, Stunned, Hallucination,
         Deaf, Underwater } from './youprop.js';
import { drown, lava_effects, t_at, deltrap } from './trap.js';
import { done } from './end.js';
import { killer } from './topten.js';
import { enexto, teleds } from './teleport.js';
import { monkilled, xkilled, DEADMONSTER, wake_nearto,
         minliquid } from './mon.js';
import { mhe } from './mhitu.js';
import { helpless } from './monmove.js';
import { spoteffects, revive_nasty } from './hack.js';
import { find_drawbridge } from './zap.js';
import { update_monster_region } from './region.js';
import { hliquid } from './potion.js';
import { delallobj } from './invent.js';
import { del_engr_at } from './engrave.js';
import { cansee, block_point, unblock_point, does_block,
         vision_recalc } from './vision.js';
import { distu } from './hacklib.js';
import { obj_extract_self, mksobj_at } from './mkobj.js';
import { flooreffects } from './do.js';
import { IRON_CHAIN, BOULDER } from './objects.js';
import { scatter } from './explode.js';
import { rn2, rnd } from './rng.js';

// C ref: dbridge.c create_drawbridge()
/*
 * Creation of a drawbridge at pos x,y.
 *     dir is the direction.
 *     flag must be put to TRUE if we want the drawbridge to be opened.
 */
export function create_drawbridge(x, y, dir, flag) {
    let x2, y2;
    let horiz;
    const levl = (xx, yy) => game.level.at(xx, yy);
    const lava = levl(x, y).typ === LAVAPOOL; /* assume initialized map */

    x2 = x;
    y2 = y;
    switch (dir) {
    case DB_NORTH:
        horiz = true;
        y2--;
        break;
    case DB_SOUTH:
        horiz = true;
        y2++;
        break;
    case DB_EAST:
        horiz = false;
        x2++;
        break;
    default:
        impossible('bad direction in create_drawbridge');
        /*FALLTHRU*/
    case DB_WEST:
        horiz = false;
        x2--;
        break;
    }
    if (!IS_WALL(levl(x2, y2).typ))
        return false;
    if (flag) { /* We want the bridge open */
        levl(x, y).typ = DRAWBRIDGE_DOWN;
        levl(x2, y2).typ = DOOR;
        levl(x2, y2).doormask = D_NODOOR;
    } else {
        levl(x, y).typ = DRAWBRIDGE_UP;
        levl(x2, y2).typ = DBWALL;
        /* Drawbridges are non-diggable. */
        levl(x2, y2).wall_info = W_NONDIGGABLE;
    }
    levl(x, y).horizontal = !horiz;
    levl(x2, y2).horizontal = horiz;
    levl(x, y).drawbridgemask = dir;
    if (lava)
        levl(x, y).drawbridgemask |= DB_LAVA;
    return true;
}

// C ref: dbridge.c is_db_wall()
/*
 * Use is_db_wall where you want to verify that a
 * drawbridge "wall" is UP in the location x, y
 * (instead of UP or DOWN, as with is_drawbridge_wall).
 */
export function is_db_wall(x, y) {
    return game.level.at(x, y).typ === DBWALL;
}

// C ref: dbridge.c is_drawbridge_wall()
/*
 * We want to know whether a wall (or a door) is the portcullis (passageway)
 * of an eventual drawbridge.
 *
 * Return value:  the direction of the drawbridge.
 */
export function is_drawbridge_wall(x, y) {
    if (!isok(x, y))
        return -1;

    const levl = (xx, yy) => game.level.at(xx, yy);
    const lev = levl(x, y);
    if (lev.typ !== DOOR && lev.typ !== DBWALL)
        return -1;

    if (isok(x + 1, y) && IS_DRAWBRIDGE(levl(x + 1, y).typ)
        && ((levl(x + 1, y).drawbridgemask || 0) & DB_DIR) === DB_WEST)
        return DB_WEST;
    if (isok(x - 1, y) && IS_DRAWBRIDGE(levl(x - 1, y).typ)
        && ((levl(x - 1, y).drawbridgemask || 0) & DB_DIR) === DB_EAST)
        return DB_EAST;
    if (isok(x, y - 1) && IS_DRAWBRIDGE(levl(x, y - 1).typ)
        && ((levl(x, y - 1).drawbridgemask || 0) & DB_DIR) === DB_SOUTH)
        return DB_SOUTH;
    if (isok(x, y + 1) && IS_DRAWBRIDGE(levl(x, y + 1).typ)
        && ((levl(x, y + 1).drawbridgemask || 0) & DB_DIR) === DB_NORTH)
        return DB_NORTH;

    return -1;
}

// C ref: dbridge.c get_wall_for_db()
/*
 * Find the drawbridge wall associated with a drawbridge.
 * (C changes *x,*y in place; this returns the new coordinates.)
 */
function get_wall_for_db(x, y) {
    switch (game.level.at(x, y).drawbridgemask & DB_DIR) {
    case DB_NORTH:
        y--;
        break;
    case DB_SOUTH:
        y++;
        break;
    case DB_EAST:
        x++;
        break;
    case DB_WEST:
        x--;
        break;
    }
    return { x, y };
}

/* C ref: decl.h go.occupants[ENTITIES] -- struct entity { emon, edata,
   ex, ey }; ENTITIES is 2 */
const ENTITIES = 2;
function occupants() {
    if (!game.occupants) {
        game.occupants = [];
        for (let i = 0; i < ENTITIES; i++)
            game.occupants.push({ emon: null, edata: null, ex: 0, ey: 0 });
    }
    return game.occupants;
}

// C ref: dbridge.c e_at()
function e_at(x, y) {
    const occ = occupants();
    let entitycnt;

    for (entitycnt = 0; entitycnt < ENTITIES; entitycnt++)
        if (occ[entitycnt].edata
            && occ[entitycnt].ex === x
            && occ[entitycnt].ey === y)
            break;
    /* debugpline1("entitycnt = %d", entitycnt); */
    return (entitycnt === ENTITIES) ? null : occ[entitycnt];
}

// C ref: dbridge.c m_to_e()
function m_to_e(mtmp, x, y, etmp) {
    etmp.emon = mtmp;
    if (mtmp) {
        etmp.ex = x;
        etmp.ey = y;
        if (mtmp.wormno && (x !== mtmp.mx || y !== mtmp.my))
            etmp.edata = mons[PM_LONG_WORM_TAIL];
        else
            etmp.edata = mtmp.data;
    } else {
        etmp.edata = null;
        etmp.ex = etmp.ey = 0;
    }
}

// C ref: dbridge.c u_to_e()
function u_to_e(etmp) {
    etmp.emon = game.youmonst;
    etmp.ex = game.u.ux;
    etmp.ey = game.u.uy;
    etmp.edata = game.youmonst.data;
}

// C ref: dbridge.c set_entity()
function set_entity(
    x, y,   /* location of span or portcullis */
    etmp) { /* pointer to occupants[0] or occupants[1] */
    if (u_at(x, y))
        u_to_e(etmp);
    else /* m_at() might yield Null; that's ok */
        m_to_e(m_at(x, y) || null, x, y, etmp);
}

/* C ref: dbridge.c #define is_u(etmp), e_canseemon(etmp) */
function is_u(etmp) { return etmp.emon === game.youmonst; }
function e_canseemon(etmp) { return is_u(etmp) || canseemon(etmp.emon); }

// C ref: dbridge.c e_nam()
function e_nam(etmp) {
    return is_u(etmp) ? "you" : mon_nam(etmp.emon);
}

// C ref: dbridge.c E_phrase()
/*
 * Generates capitalized entity name, makes 2nd -> 3rd person conversion on
 * verb, where necessary.
 */
function E_phrase(etmp, verb) {
    let wholebuf = is_u(etmp) ? "You" : Monnam(etmp.emon);
    if (!verb || !verb.length)
        return wholebuf;
    wholebuf += " ";
    if (is_u(etmp))
        wholebuf += verb;
    else
        wholebuf += vtense(null, verb);
    return wholebuf;
}

// C ref: dbridge.c e_survives_at()
/*
 * Simple-minded "can it be here?" routine
 */
function e_survives_at(etmp, x, y) {
    if (noncorporeal(etmp.edata))
        return true;
    if (is_pool(x, y))
        return ((is_u(etmp) && (Wwalking() || Amphibious() || Breathless()
                                || Swimming() || Flying() || Levitation()))
                || is_swimmer(etmp.edata)
                || is_flyer(etmp.edata)
                || is_floater(etmp.edata));
    /* must force call to lava_effects in e_died if is_u */
    if (is_lava(x, y))
        return ((is_u(etmp) && (Levitation() || Flying()))
                || likes_lava(etmp.edata)
                || is_flyer(etmp.edata));
    if (is_db_wall(x, y))
        return (is_u(etmp) ? Passes_walls()
                           : passes_walls(etmp.edata));
    return true;
}

// C ref: dbridge.c e_died()
async function e_died(etmp, xkill_flags, how) {
    if (is_u(etmp)) {
        if (how === DROWNING) {
            killer().name = ""; /* drown() sets its own killer */
            await drown();
        } else if (how === BURNING) {
            killer().name = ""; /* lava_effects() sets own killer */
            await lava_effects();
        } else {
            const xy = { x: 0, y: 0 };

            /* use more specific killer if specified */
            if (!killer().name) {
                killer().format = KILLED_BY_AN;
                killer().name = "falling drawbridge";
            }
            await done(how);
            /* So, you didn't die */
            if (!e_survives_at(etmp, etmp.ex, etmp.ey)) {
                if (enexto(xy, etmp.ex, etmp.ey, etmp.edata)) {
                    await pline(`A ${Hallucination() ? "normal" : "strange"
                                 } force teleports you away...`);
                    await teleds(xy.x, xy.y, TELEDS_NO_FLAGS);
                }
                /* otherwise on top of the drawbridge is the
                 * only viable spot in the dungeon, so stay there
                 */
            }
        }
        /* we might have crawled out of the moat to survive */
        etmp.ex = game.u.ux, etmp.ey = game.u.uy;
    } else {
        const occ = occupants();
        let entitycnt;
        /* fake "digested to death" damage-type suppresses corpse */
        const mk_message = (dest) => (((dest & XKILL_NOMSG) !== 0) ? null : "");
        const mk_corpse = (dest) => (((dest & XKILL_NOCORPSE) !== 0) ? AD_DGST
                                                                       : AD_PHYS);

        killer().name = "";
        /* if monsters are moving, one of them caused the destruction */
        if (game.context.mon_moving)
            await monkilled(etmp.emon,
                            mk_message(xkill_flags), mk_corpse(xkill_flags));
        else /* you caused it */
            await xkilled(etmp.emon, xkill_flags);

        /* if etmp gets life-saved, kill it again; otherwise we might end up
           trying to place another monster (probably a xorn) on same spot */
        if (!DEADMONSTER(etmp.emon)) {
            const seeit = canspotmon(etmp.emon);

            xkill_flags |= XKILL_NOMSG | XKILL_NOCONDUCT;
            if (game.context.mon_moving)
                await monkilled(etmp.emon, "", mk_corpse(xkill_flags));
            else /* you caused it */
                await xkilled(etmp.emon, xkill_flags);

            if (DEADMONSTER(etmp.emon)) {
                if (seeit)
                    await pline(`Unfortunately for ${mon_nam(etmp.emon)}, ${
                        mhe(etmp.emon)} is still crushed.`);
            } else {
                ; /* FIXME: still not dead?  What should we do now? */
            }
        }
        etmp.edata = null;

        /* dead long worm handling */
        for (entitycnt = 0; entitycnt < ENTITIES; entitycnt++) {
            if (etmp !== occ[entitycnt]
                && etmp.emon === occ[entitycnt].emon)
                occ[entitycnt].edata = null;
        }
    }
}

// C ref: dbridge.c automiss()
/*
 * These are never directly affected by a bridge or portcullis.
 */
function automiss(etmp) {
    return ((is_u(etmp) ? Passes_walls() : passes_walls(etmp.edata))
            || noncorporeal(etmp.edata));
}

// C ref: dbridge.c e_missed()
/*
 * Does falling drawbridge or portcullis miss etmp?
 */
function e_missed(etmp, chunks) {
    let misses;

    /* if (chunks) debugpline0("Do chunks miss?"); */
    if (automiss(etmp))
        return true;

    if (is_flyer(etmp.edata)
        && (is_u(etmp) ? !Unaware()
                       : !helpless(etmp.emon)))
        /* flying requires mobility */
        misses = 5; /* out of 8 */
    else if (is_floater(etmp.edata)
             || (is_u(etmp) && Levitation())) /* doesn't require mobility */
        misses = 3;
    else if (chunks && is_pool(etmp.ex, etmp.ey))
        misses = 2; /* sitting ducks */
    else
        misses = 0;

    if (is_db_wall(etmp.ex, etmp.ey))
        misses -= 3; /* less airspace */

    /* debugpline1("Miss chance = %d (out of 8)", misses); */

    return (misses >= rnd(8)) ? true : false;
}

// C ref: dbridge.c e_jumps()
/*
 * Can etmp jump from death?
 */
function e_jumps(etmp) {
    let tmp = 4; /* out of 10 */

    if (is_u(etmp) ? (Unaware() || Fumbling())
                   : (helpless(etmp.emon)
                      || !etmp.edata.mmove || etmp.emon.wormno))
        return false;

    if (is_u(etmp) ? Confusion() : etmp.emon.mconf)
        tmp -= 2;

    if (is_u(etmp) ? Stunned() : etmp.emon.mstun)
        tmp -= 3;

    if (is_db_wall(etmp.ex, etmp.ey))
        tmp -= 2; /* less room to maneuver */

    /* debugpline2("%s to jump (%d chances in 10)", ...) */
    return (tmp >= rnd(10)) ? true : false;
}

// C ref: dbridge.c do_entity()
async function do_entity(etmp) {
    let newx, newy, oldx, oldy;
    let at_portcullis;
    let must_jump = false, relocates = false, e_inview;
    let crm;

    if (!etmp.edata)
        return;

    e_inview = e_canseemon(etmp);
    oldx = etmp.ex;
    oldy = etmp.ey;
    at_portcullis = is_db_wall(oldx, oldy);
    crm = game.level.at(oldx, oldy);

    if (automiss(etmp) && e_survives_at(etmp, oldx, oldy)) {
        if (e_inview && (at_portcullis || IS_DRAWBRIDGE(crm.typ)))
            await pline_The(`${at_portcullis ? "portcullis" : "drawbridge"
                             } passes through ${e_nam(etmp)}!`);
        if (is_u(etmp))
            await spoteffects(false);
        return;
    }
    if (e_missed(etmp, false)) {
        if (at_portcullis) {
            await pline_The(`portcullis misses ${e_nam(etmp)}!`);
        } else {
            /* debugpline1("The drawbridge misses %s!", e_nam(etmp)); */
        }
        if (e_survives_at(etmp, oldx, oldy)) {
            return;
        } else {
            /* debugpline0("Mon can't survive here"); */
            if (at_portcullis)
                must_jump = true;
            else
                relocates = true; /* just ride drawbridge in */
        }
    } else {
        if (crm.typ === DRAWBRIDGE_DOWN) {
            if (is_u(etmp)) {
                killer().format = NO_KILLER_PREFIX;
                killer().name = "crushed to death underneath a drawbridge";
            }
            await pline(`${E_phrase(etmp, "are")} crushed underneath the drawbridge.`);
            /* no jump */
            await e_died(etmp,
                         XKILL_NOCORPSE | (e_inview ? XKILL_GIVEMSG : XKILL_NOMSG),
                         CRUSHING); /* no corpse */
            return;       /* Note: Beyond this point, we know we're  */
        }                 /* not at an opened drawbridge, since all  */
        must_jump = true; /* *missable* creatures survive on the     */
    }                     /* square, and all the unmissed ones die.  */
    if (must_jump) {
        if (at_portcullis) {
            if (e_jumps(etmp)) {
                relocates = true;
                /* debugpline0("Jump succeeds!"); */
            } else {
                if (e_inview) {
                    await pline(`${E_phrase(etmp, "are")
                                 } crushed by the falling portcullis!`);
                } else if (!Deaf()) {
                    /* Soundeffect(se_crushing_sound, 100) */
                    await You_hear("a crushing sound.");
                }
                await e_died(etmp,
                             XKILL_NOCORPSE | (e_inview ? XKILL_GIVEMSG
                                                        : XKILL_NOMSG),
                             CRUSHING);
                /* no corpse */
                return;
            }
        } else { /* tries to jump off bridge to original square */
            relocates = !e_jumps(etmp);
            /* debugpline1("Jump %s!", (relocates) ? "fails" : "succeeds"); */
        }
    }

    /*
     * Here's where we try to do relocation.  Assumes that etmp is not
     * arriving at the portcullis square while the drawbridge is
     * falling, since this square would be inaccessible (i.e. etmp
     * started on drawbridge square) or unnecessary (i.e. etmp started
     * here) in such a situation.
     */
    newx = oldx;
    newy = oldy;
    const db = find_drawbridge(newx, newy);
    if (db)
        newx = db.x, newy = db.y;
    if ((newx === oldx) && (newy === oldy)) {
        const w = get_wall_for_db(newx, newy);
        newx = w.x, newy = w.y;
    }
    if (relocates && (e_at(newx, newy))) {
        /*
         * Standoff problem: one or both entities must die, and/or
         * both switch places.  Avoid infinite recursion by checking
         * first whether the other entity is staying put.  Clean up if
         * we happen to move/die in recursion.
         */
        const other = e_at(newx, newy);

        if (e_survives_at(other, newx, newy) && automiss(other)) {
            relocates = false; /* "other" won't budge */
        } else {
            while ((e_at(newx, newy) !== null) && (e_at(newx, newy) !== etmp))
                await do_entity(other);
            if (e_at(oldx, oldy) !== etmp) {
                /* debugpline1("%s moved or died in recursion somewhere") */
                return;
            }
        }
    }
    if (relocates && !e_at(newx, newy)) { /* if e_at() entity = worm tail */
        if (!is_u(etmp)) {
            if (etmp.edata === mons[PM_LONG_WORM_TAIL])
                throw new Error('do_entity(): relocating a long worm tail not ported yet');
            /* remove_monster(etmp->ex, etmp->ey): game.level.monsters is
               keyed by mx/my, so place_monster() moves it */
            place_monster(etmp.emon, newx, newy);
            update_monster_region(etmp.emon);
        } else {
            game.u.ux = newx;
            game.u.uy = newy;
        }
        etmp.ex = newx;
        etmp.ey = newy;
        e_inview = e_canseemon(etmp);
    }
    if (is_db_wall(etmp.ex, etmp.ey)) {
        if (e_inview) {
            if (is_u(etmp)) {
                await You("tumble towards the closed portcullis!");
                if (automiss(etmp))
                    await You("pass through it!");
                else
                    await pline_The("drawbridge closes in...");
            } else
                await pline(`${E_phrase(etmp, "disappear")} behind the drawbridge.`);
        }
        if (!e_survives_at(etmp, etmp.ex, etmp.ey)) {
            killer().format = KILLED_BY_AN;
            killer().name = "closing drawbridge";
            await e_died(etmp, XKILL_NOMSG, CRUSHING);
            return;
        }
        /* debugpline1("%s in here", E_phrase(etmp, "survive")); */
    } else {
        if (is_pool(etmp.ex, etmp.ey) && !e_inview)
            if (!Deaf()) {
                /* Soundeffect(se_splash, 100) */
                await You_hear("a splash.");
            }
        if (e_survives_at(etmp, etmp.ex, etmp.ey)) {
            if (e_inview && !is_flyer(etmp.edata)
                && !is_floater(etmp.edata))
                await pline(`${E_phrase(etmp, "fall")} from the bridge.`);
            return;
        }
        if (is_pool(etmp.ex, etmp.ey) || is_lava(etmp.ex, etmp.ey))
            if (e_inview && !is_u(etmp)) {
                /* drown() will supply msgs if nec. */
                const lava = is_lava(etmp.ex, etmp.ey);

                if (Hallucination())
                    await pline(`${E_phrase(etmp, "drink")} the ${
                        lava ? "lava" : "moat"} and disappears.`);
                else
                    await pline(`${E_phrase(etmp, "fall")} into the ${
                        lava ? hliquid("lava") : "moat"}.`);
            }
        killer().format = NO_KILLER_PREFIX;
        killer().name = "fell from a drawbridge";
        await e_died(etmp, /* CRUSHING is arbitrary */
                     XKILL_NOCORPSE | (e_inview ? XKILL_GIVEMSG : XKILL_NOMSG),
                     is_pool(etmp.ex, etmp.ey) ? DROWNING
                       : is_lava(etmp.ex, etmp.ey) ? BURNING
                         : CRUSHING); /*no corpse*/
        return;
    }
}

// C ref: dbridge.c nokiller()
/* clear stale reason for death and both 'entities' before returning */
function nokiller() {
    const occ = occupants();

    killer().name = "";
    killer().format = 0;
    m_to_e(null, 0, 0, occ[0]);
    m_to_e(null, 0, 0, occ[1]);
}

// C ref: dbridge.c close_drawbridge()
/*
 * Close the drawbridge located at x,y
 */
export async function close_drawbridge(x, y) {
    const u = game.u;
    const occ = occupants();
    let lev1, lev2;
    let t;
    let x2, y2;

    lev1 = game.level.at(x, y);
    if (lev1.typ !== DRAWBRIDGE_DOWN)
        return;
    ({ x: x2, y: y2 } = get_wall_for_db(x, y));
    if (cansee(x, y) || cansee(x2, y2)) {
        await You_see(`a drawbridge ${
            (((u.ux === x || u.uy === y) && !Underwater())
             || distu(x2, y2) < distu(x, y))
                ? "coming"
                : "going"} up!`);
    } else { /* "5 gears turn" for castle drawbridge tune */
        /* Soundeffect(se_chains_rattling_gears_turning, 75) */
        await You_hear("chains rattling and gears turning.");
    }
    lev1.typ = DRAWBRIDGE_UP;
    lev2 = game.level.at(x2, y2);
    lev2.typ = DBWALL;
    switch (lev1.drawbridgemask & DB_DIR) {
    case DB_NORTH:
    case DB_SOUTH:
        lev2.horizontal = true;
        break;
    case DB_WEST:
    case DB_EAST:
        lev2.horizontal = false;
        break;
    }
    lev2.wall_info = W_NONDIGGABLE;
    set_entity(x, y, occ[0]);
    set_entity(x2, y2, occ[1]);
    await do_entity(occ[0]);   /* Do set_entity after first */
    set_entity(x2, y2, occ[1]); /* do_entity for worm tail */
    await do_entity(occ[1]);
    if (OBJ_AT(x, y) && !Deaf()) {
        /* Soundeffect(se_smashing_and_crushing, 75) */
        await You_hear("smashing and crushing.");
    }
    await revive_nasty(x, y, null);
    await revive_nasty(x2, y2, null);
    await delallobj(x, y);
    await delallobj(x2, y2);
    if ((t = t_at(x, y)) != null)
        deltrap(t);
    if ((t = t_at(x2, y2)) != null)
        deltrap(t);
    del_engr_at(x, y);
    del_engr_at(x2, y2);
    newsym(x, y);
    newsym(x2, y2);
    block_point(x2, y2); /* vision */
    nokiller();
}

// C ref: dbridge.c open_drawbridge()
/*
 * Open the drawbridge located at x,y
 */
export async function open_drawbridge(x, y) {
    const u = game.u;
    const occ = occupants();
    let lev1, lev2;
    let t;
    let x2, y2;

    lev1 = game.level.at(x, y);
    if (lev1.typ !== DRAWBRIDGE_UP)
        return;
    ({ x: x2, y: y2 } = get_wall_for_db(x, y));
    if (cansee(x, y) || cansee(x2, y2)) {
        await You_see(`a drawbridge ${
            (distu(x2, y2) < distu(x, y)) ? "going" : "coming"} down!`);
    } else { /* "5 gears turn" for castle drawbridge tune */
        /* Soundeffect(se_gears_turning_chains_rattling, 100) */
        await You_hear("gears turning and chains rattling.");
    }
    lev1.typ = DRAWBRIDGE_DOWN;
    lev2 = game.level.at(x2, y2);
    lev2.typ = DOOR;
    lev2.doormask = D_NODOOR;
    set_entity(x, y, occ[0]);
    set_entity(x2, y2, occ[1]);
    await do_entity(occ[0]);   /* do set_entity after first */
    set_entity(x2, y2, occ[1]); /* do_entity for worm tails */
    await do_entity(occ[1]);
    await revive_nasty(x, y, null);
    await delallobj(x, y);
    if ((t = t_at(x, y)) != null)
        deltrap(t);
    if ((t = t_at(x2, y2)) != null)
        deltrap(t);
    del_engr_at(x, y);
    del_engr_at(x2, y2);
    newsym(x, y);
    newsym(x2, y2);
    unblock_point(x2, y2); /* vision */
    if (Is_stronghold(u.uz))
        u.uevent.uopened_dbridge = true;
    nokiller();
}

// C ref: dbridge.c destroy_drawbridge()
/*
 * Let's destroy the drawbridge located at x,y
 */
export async function destroy_drawbridge(x, y) {
    const u = game.u;
    const occ = occupants();
    let lev1, lev2;
    let t;
    let otmp;
    let x2, y2;
    let i;
    let e_inview;
    const etmp1 = occ[0], etmp2 = occ[1];

    lev1 = game.level.at(x, y);
    if (!IS_DRAWBRIDGE(lev1.typ))
        return;
    ({ x: x2, y: y2 } = get_wall_for_db(x, y));
    lev2 = game.level.at(x2, y2);
    if ((lev1.drawbridgemask & DB_UNDER) === DB_MOAT
        || (lev1.drawbridgemask & DB_UNDER) === DB_LAVA) {
        let otmp2;
        const lava = (lev1.drawbridgemask & DB_UNDER) === DB_LAVA;

        /* Soundeffect(se_loud_splash, 100): Deaf-aware */
        if (lev1.typ === DRAWBRIDGE_UP) {
            if (cansee(x2, y2) || u_at(x2, y2))
                await pline_The(`portcullis of the drawbridge falls into the ${
                    lava ? hliquid("lava") : "moat"}!`);
            else
                await You_hear("a loud *SPLASH*!"); /* Deaf-aware */
        } else {
            if (cansee(x, y) || u_at(x, y))
                await pline_The(`drawbridge collapses into the ${
                    lava ? hliquid("lava") : "moat"}!`);
            else
                await You_hear("a loud *SPLASH*!"); /* Deaf-aware */
        }
        lev1.typ = lava ? LAVAPOOL : MOAT;
        lev1.drawbridgemask = 0;
        if ((otmp2 = sobj_at(BOULDER, x, y)) != null) {
            obj_extract_self(otmp2);
            await flooreffects(otmp2, x, y, "fall");
        }
    } else {
        /* no moat beneath */
        /* Soundeffect(se_loud_crash, 100): Deaf-aware */
        if (cansee(x, y) || u_at(x, y))
            await pline_The("drawbridge disintegrates!");
        else
            await You_hear("a loud *CRASH*!"); /* Deaf-aware */
        const db_ice = (lev1.drawbridgemask & DB_ICE);
        lev1.typ = (db_ice ? ICE : ROOM);
        /* icedpool is the same field (flags) as drawbridgemask */
        lev1.icedpool = (db_ice ? ICED_MOAT : 0);
        lev1.flags = lev1.icedpool;
    }
    await wake_nearto(x, y, 500);
    lev2.typ = DOOR;
    lev2.doormask = D_NODOOR;
    if ((t = t_at(x, y)) != null)
        deltrap(t);
    if ((t = t_at(x2, y2)) != null)
        deltrap(t);
    del_engr_at(x, y);
    del_engr_at(x2, y2);
    for (i = rn2(6); i > 0; --i) { /* scatter some debris */
        /* doesn't matter if we happen to pick <x,y2> or <x2,y>;
           since drawbridges are never placed diagonally, those
           pairings will always match one of <x,y> or <x2,y2> */
        /* (the recorder's clang evaluates the arguments left to right) */
        const ox = rn2(2) ? x : x2;
        const oy = rn2(2) ? y : y2;
        otmp = mksobj_at(IRON_CHAIN, ox, oy, true, false);
        /* a force of 5 here would yield a radius of 2 for
           iron chain; anything less produces a radius of 1 */
        await scatter(otmp.ox, otmp.oy, 1, MAY_HIT, otmp);
    }
    newsym(x, y);
    newsym(x2, y2);
    if (!does_block(x2, y2, lev2))
        unblock_point(x2, y2); /* vision */
    vision_recalc(0);
    if (Is_stronghold(u.uz))
        u.uevent.uopened_dbridge = true;

    set_entity(x2, y2, etmp2); /* currently only automissers can be here */
    if (etmp2.edata) {
        e_inview = e_canseemon(etmp2);
        if (!automiss(etmp2)) {
            if (e_inview)
                await pline(`${E_phrase(etmp2, "are")} blown apart by flying debris.`);
            killer().format = KILLED_BY_AN;
            killer().name = "exploding drawbridge";
            await e_died(etmp2,
                         XKILL_NOCORPSE | (e_inview ? XKILL_GIVEMSG : XKILL_NOMSG),
                         CRUSHING); /*no corpse*/
        } /* nothing which is vulnerable can survive this */
    }
    set_entity(x, y, etmp1);
    if (etmp1.edata) {
        e_inview = e_canseemon(etmp1);
        if (e_missed(etmp1, true)) {
            /* debugpline1("%s spared!", E_phrase(etmp1, "are")); */
            /* if there is water or lava here, fall in now */
            if (is_u(etmp1))
                await spoteffects(false);
            else
                await minliquid(etmp1.emon);
        } else {
            if (e_inview) {
                if (!is_u(etmp1) && Hallucination())
                    await pline(`${E_phrase(etmp1, "get")} into some heavy metal!`);
                else
                    await pline(`${E_phrase(etmp1, "are")} hit by a huge chunk of metal!`);
            } else {
                if (!Deaf() && !is_u(etmp1) && !is_pool(x, y)) {
                    /* Soundeffect(se_crushing_sound, 75) */
                    await You_hear("a crushing sound.");
                } else {
                    /* debugpline1("%s from shrapnel", E_phrase(etmp1, "die")); */
                }
            }
            killer().format = KILLED_BY_AN;
            killer().name = "collapsing drawbridge";
            await e_died(etmp1,
                         XKILL_NOCORPSE | (e_inview ? XKILL_GIVEMSG : XKILL_NOMSG),
                         CRUSHING); /*no corpse*/
            if (game.level.at(etmp1.ex, etmp1.ey).typ === MOAT)
                await do_entity(etmp1);
        }
    }
    nokiller();
    if (Is_stronghold(u.uz))
        u.uevent.uheard_tune = 3; /* bridge is gone so tune is now useless */
}
