// dbridge.js — drawbridges and the water/lava terrain tests that live with them.
// C ref: src/dbridge.c

import { scatter } from './explode.js';
import { mksobj_at } from './mkobj.js';
import { flooreffects } from './do.js';
import { del_engr_at } from './engrave.js';
import { delallobj, sobj_at, obj_extract_self } from './invent.js';
import { cansee, block_point, unblock_point, does_block, vision_recalc } from './vision.js';
import { distu } from './hacklib.js';
import { update_monster_region } from './region.js';
import { remove_monster, place_monster } from './makemon.js';
import { spoteffects, revive_nasty } from './hack.js';
import { You, You_hear, You_see, pline_The } from './pline.js';
import { rnd, rn2 } from './rng.js';
import { enexto, teleds } from './teleport.js';
import { done } from './end.js';
import { drown, lava_effects, deltrap } from './trap.js';
import { Wwalking, Amphibious, Breathless, Swimming, Flying, Levitation, Passes_walls, Hallucination, Unaware, Fumbling, Deaf, Underwater } from './youprop.js';
import { noncorporeal, is_swimmer, is_flyer, is_floater, likes_lava, passes_walls, mhe } from './mondata.js';
import { vtense } from './objnam.js';
import { mon_nam, Monnam, hliquid } from './do_name.js';
import { canseemon, canspotmon, newsym, pline } from './display.js';
import { DEADMONSTER, helpless } from './monst.js';
import { m_at, t_at, minliquid, monkilled, xkilled, wake_nearto } from './mon.js';
import { ONAMES } from './objects_data.js';
import { PMNAMES, ATTKS } from './monst_data.js';
import { IS_WALL, W_NONDIGGABLE, D_NODOOR, DRAWBRIDGE_DOWN, ENTITIES, ROOM, ICED_MOAT, DROWNING, BURNING, CRUSHING, KILLED_BY_AN, NO_KILLER_PREFIX, TELEDS_NO_FLAGS, XKILL_NOMSG, XKILL_NOCORPSE, XKILL_GIVEMSG, XKILL_NOCONDUCT, MAY_HIT, OBJ_AT, Is_stronghold } from './const.js';
import { IS_WATERWALL } from './const.js';
import { is_pool, is_lava } from './mon.js';
import { game } from './gstate.js';
import { isok, MOAT, DRAWBRIDGE_UP, DB_UNDER, DB_MOAT, DB_ICE, ICE,
         Is_juiblex_level, DB_LAVA, LAVAPOOL, STONE,
         DOOR, DBWALL, IS_DRAWBRIDGE, DB_DIR, DB_NORTH, DB_SOUTH, DB_EAST,
         DB_WEST } from './const.js';

// src/dbridge.c:77 is_pool_or_lava()
export function is_pool_or_lava(x, y) {
    return !!(is_pool(x, y) || is_lava(x, y));
}

// src/dbridge.c:47 is_drawbridge_wall() — which side of a drawbridge the
// DOOR/DBWALL portcullis square at (x,y) faces, or -1 if it is not one.
export function is_drawbridge_wall(x, y) {
    if (!isok(x, y))
        return -1;
    const lev = game.level.at(x, y);
    if (lev.typ !== DOOR && lev.typ !== DBWALL)
        return -1;

    const dbm = (xx, yy) => game.level.at(xx, yy).drawbridgemask ?? 0;
    if (isok(x + 1, y) && IS_DRAWBRIDGE(game.level.at(x + 1, y).typ)
        && (dbm(x + 1, y) & DB_DIR) === DB_WEST)
        return DB_WEST;
    if (isok(x - 1, y) && IS_DRAWBRIDGE(game.level.at(x - 1, y).typ)
        && (dbm(x - 1, y) & DB_DIR) === DB_EAST)
        return DB_EAST;
    if (isok(x, y - 1) && IS_DRAWBRIDGE(game.level.at(x, y - 1).typ)
        && (dbm(x, y - 1) & DB_DIR) === DB_SOUTH)
        return DB_SOUTH;
    if (isok(x, y + 1) && IS_DRAWBRIDGE(game.level.at(x, y + 1).typ)
        && (dbm(x, y + 1) & DB_DIR) === DB_NORTH)
        return DB_NORTH;

    return -1;
}

// src/dbridge.c:86 is_ice()
export function is_ice(x, y) {
    if (!isok(x, y))
        return false;
    const ltyp = game.level.at(x, y).typ;
    if (ltyp === ICE
        || (ltyp === DRAWBRIDGE_UP
            && ((game.level.at(x, y).drawbridgemask ?? 0) & DB_UNDER) === DB_ICE))
        return true;
    return false;
}

// src/dbridge.c:100 is_moat()
export function is_moat(x, y) {
    if (!isok(x, y))
        return false;
    const ltyp = game.level.at(x, y).typ;
    if (!Is_juiblex_level(game.u.uz)
        && (ltyp === MOAT
            || (ltyp === DRAWBRIDGE_UP
                && ((game.level.at(x, y).drawbridgemask ?? 0) & DB_UNDER) === DB_MOAT)))
        return true;
    return false;
}

// src/dbridge.c:116 db_under_typ() — the terrain hiding under a raised
// drawbridge.
export function db_under_typ(mask) {
    switch (mask & DB_UNDER) {
    case DB_ICE:
        return ICE;
    case DB_LAVA:
        return LAVAPOOL;
    case DB_MOAT:
        return MOAT;
    default:
        return STONE;
    }
}

// src/dbridge.c:64 is_db_wall()
export function is_db_wall(x, y) {
    return game.level.at(x, y)?.typ === DBWALL;
}

// src/dbridge.c:38 is_waterwall()
export function is_waterwall(x, y) {
    if (isok(x, y) && IS_WATERWALL(game.level.at(x, y).typ))
        return true;
    return false;
}

// src/dbridge.c:180 find_drawbridge(); cc names a drawbridge or its wall;
// on return it names the drawbridge itself
export function find_drawbridge(cc) {
    let dir;

    if (IS_DRAWBRIDGE(game.level.at(cc.x, cc.y).typ))
        return true;
    dir = is_drawbridge_wall(cc.x, cc.y);
    if (dir >= 0) {
        switch (dir) {
        case DB_NORTH:
            cc.y++;
            break;
        case DB_SOUTH:
            cc.y--;
            break;
        case DB_EAST:
            cc.x--;
            break;
        case DB_WEST:
            cc.x++;
            break;
        }
        return true;
    }
    return false;
}

// src/dbridge.c:211 get_wall_for_db(); cc names a drawbridge; on return it
// names the portcullis square
export function get_wall_for_db(cc) {
    switch (game.level.at(cc.x, cc.y).drawbridgemask & DB_DIR) {
    case DB_NORTH:
        cc.y--;
        break;
    case DB_SOUTH:
        cc.y++;
        break;
    case DB_EAST:
        cc.x++;
        break;
    case DB_WEST:
        cc.x--;
        break;
    }
}

// src/dbridge.c:235 create_drawbridge(); Creation of a drawbridge at <x,y>:
// dir is the direction (DB_NORTH, DB_SOUTH, DB_EAST or DB_WEST), flag is
// True if the drawbridge is open, False if it is closed. Returns True if
// the drawbridge was created.
export function create_drawbridge(x, y, dir, flag) {
    let x2, y2;
    let horiz;
    const lava = game.level.at(x, y).typ === LAVAPOOL; /* assume initialized map */

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
        /* impossible("bad direction in create_drawbridge") */
        /* FALLTHROUGH */
    case DB_WEST:
        horiz = false;
        x2--;
        break;
    }
    if (!IS_WALL(game.level.at(x2, y2).typ))
        return false;
    if (flag) { /* We want the bridge open */
        game.level.at(x, y).typ = DRAWBRIDGE_DOWN;
        game.level.at(x2, y2).typ = DOOR;
        game.level.at(x2, y2).doormask = D_NODOOR;
    } else {
        game.level.at(x, y).typ = DRAWBRIDGE_UP;
        game.level.at(x2, y2).typ = DBWALL;
        /* Drawbridges are non-diggable. */
        game.level.at(x2, y2).wall_info = W_NONDIGGABLE;
    }
    game.level.at(x, y).horizontal = !horiz;
    game.level.at(x2, y2).horizontal = horiz;
    game.level.at(x, y).drawbridgemask = dir;
    if (lava)
        game.level.at(x, y).drawbridgemask |= DB_LAVA;
    return true;
}

/* go.occupants[ENTITIES]: the two things that can be affected by a moving
   drawbridge, at the span and at the portcullis */
function occupants() {
    return (game.occupants ||= [
        { emon: null, ex: 0, ey: 0, edata: null },
        { emon: null, ex: 0, ey: 0, edata: null },
    ]);
}

/* include/hack.h u_at() */
const u_at = (x, y) => x === game.u.ux && y === game.u.uy;
/* the hero's confusion and stun as this port stores them */
const Confusion = () => !!(game.u.intrinsic?.HConfusion || game.u.uprops?.CONFUSION);
const Stunned = () => !!(game.u.intrinsic?.HStun || game.u.uprops?.STUNNED);

// src/dbridge.c:286 e_at(); the entity at <x,y>, if one is set
function e_at(x, y) {
    const occ = occupants();
    let entitycnt;

    for (entitycnt = 0; entitycnt < ENTITIES; entitycnt++)
        if (occ[entitycnt].edata
            && occ[entitycnt].ex === x
            && occ[entitycnt].ey === y)
            break;
    return (entitycnt === ENTITIES) ? null : occ[entitycnt];
}

// src/dbridge.c:304 m_to_e()
function m_to_e(mtmp, x, y, etmp) {
    etmp.emon = mtmp;
    if (mtmp) {
        etmp.ex = x;
        etmp.ey = y;
        if (mtmp.wormno && (x !== mtmp.mx || y !== mtmp.my))
            etmp.edata = game.mons[PMNAMES.PM_LONG_WORM_TAIL];
        else
            etmp.edata = mtmp.data;
    } else {
        etmp.edata = null;
        etmp.ex = etmp.ey = 0;
    }
}

// src/dbridge.c:321 u_to_e()
function u_to_e(etmp) {
    etmp.emon = game.youmonst;
    etmp.ex = game.u.ux;
    etmp.ey = game.u.uy;
    etmp.edata = game.youmonst.data;
}

// src/dbridge.c:330 set_entity(); x,y: location of span or portcullis;
// etmp: occupants[0] or occupants[1]
function set_entity(x, y, etmp) {
    if (u_at(x, y))
        u_to_e(etmp);
    else /* m_at() might yield Null; that's ok */
        m_to_e(m_at(x, y), x, y, etmp);
}

const is_u = (etmp) => etmp.emon === game.youmonst;
const e_canseemon = (etmp) => is_u(etmp) || canseemon(etmp.emon);

// src/dbridge.c:351 e_nam()
function e_nam(etmp) {
    return is_u(etmp) ? 'you' : mon_nam(etmp.emon);
}

// src/dbridge.c:359 E_phrase(); Generates capitalized entity name and
// possibly a verb
function E_phrase(etmp, verb) {
    let wholebuf;

    wholebuf = is_u(etmp) ? 'You' : Monnam(etmp.emon);
    if (!verb)
        return wholebuf;
    wholebuf += ' ';
    if (is_u(etmp))
        wholebuf += verb;
    else
        wholebuf += vtense(null, verb);
    return wholebuf;
}

// src/dbridge.c:380 e_survives_at(); Simple-minded "can it be here?" routine
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

// src/dbridge.c:402 e_died()
async function e_died(etmp, xkill_flags, how) {
    const u = game.u;

    if (is_u(etmp)) {
        if (how === DROWNING) {
            if (game.killer)
                game.killer.name = ''; /* drown() sets its own killer */
            await drown();
        } else if (how === BURNING) {
            if (game.killer)
                game.killer.name = ''; /* lava_effects() sets own killer */
            await lava_effects();
        } else {
            const xy = { x: 0, y: 0 };

            if (!game.killer || !game.killer.name) {
                if (!game.killer)
                    game.killer = { format: 0, name: '' };
                game.killer.format = KILLED_BY_AN;
                game.killer.name = 'falling drawbridge';
            }
            await done(how);
            /* So, you didn't die */
            if (!e_survives_at(etmp, etmp.ex, etmp.ey)) {
                if (enexto(xy, etmp.ex, etmp.ey, etmp.edata)) {
                    await pline(`A ${Hallucination() ? 'normal' : 'strange'
                                } force teleports you away...`);
                    await teleds(xy.x, xy.y, TELEDS_NO_FLAGS);
                }
                /* otherwise on top of the drawbridge is the
                 * only viable spot in the dungeon, so stay there
                 */
            }
        }
        /* we might have crawled out of the moat to survive */
        etmp.ex = u.ux, etmp.ey = u.uy;
    } else {
        const occ = occupants();
        let entitycnt;

        if (game.killer)
            game.killer.name = '';
        /* fake "digested to death" damage-type suppresses corpse */
        const mk_message = (dest) => (((dest & XKILL_NOMSG) !== 0) ? null : '');
        const mk_corpse = (dest) => (((dest & XKILL_NOCORPSE) !== 0) ? ATTKS.AD_DGST : ATTKS.AD_PHYS);
        /* if monsters are moving, one of them caused the destruction */
        if (game.context?.mon_moving)
            await monkilled(etmp.emon,
                            mk_message(xkill_flags), mk_corpse(xkill_flags));
        else /* you caused it */
            await xkilled(etmp.emon, xkill_flags);
        /* life-saved monster (or lifesaving being off) survives; it
           trying to place another monster (probably a xorn) on same spot */
        if (!DEADMONSTER(etmp.emon)) {
            const seeit = canspotmon(etmp.emon);

            xkill_flags |= XKILL_NOMSG | XKILL_NOCONDUCT;
            if (game.context?.mon_moving)
                await monkilled(etmp.emon, '', mk_corpse(xkill_flags));
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

// src/dbridge.c:486 automiss(); These are never directly affected by a
// bridge or portcullis.
function automiss(etmp) {
    return ((is_u(etmp) ? Passes_walls() : passes_walls(etmp.edata))
            || noncorporeal(etmp.edata));
}

// src/dbridge.c:496 e_missed(); Does falling drawbridge or portcullis miss
// etmp?
function e_missed(etmp, chunks) {
    let misses;

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

    return (misses >= rnd(8)) ? true : false;
}

// src/dbridge.c:531 e_jumps(); Can etmp jump from death?
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

    return (tmp >= rnd(10)) ? true : false;
}

// src/dbridge.c:554 do_entity()
async function do_entity(etmp) {
    const u = game.u;
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
            await pline_The(`${at_portcullis ? 'portcullis' : 'drawbridge'
                            } passes through ${e_nam(etmp)}!`);
        if (is_u(etmp))
            await spoteffects(false);
        return;
    }
    if (e_missed(etmp, false)) {
        if (at_portcullis) {
            await pline_The(`portcullis misses ${e_nam(etmp)}!`);
        }
        if (e_survives_at(etmp, oldx, oldy)) {
            return;
        } else {
            if (at_portcullis)
                must_jump = true;
            else
                relocates = true; /* just ride drawbridge in */
        }
    } else {
        if (crm.typ === DRAWBRIDGE_DOWN) {
            if (is_u(etmp)) {
                if (!game.killer)
                    game.killer = { format: 0, name: '' };
                game.killer.format = NO_KILLER_PREFIX;
                game.killer.name = 'crushed to death underneath a drawbridge';
            }
            await pline(`${E_phrase(etmp, 'are')} crushed underneath the drawbridge.`);
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
            } else {
                if (e_inview) {
                    await pline(`${E_phrase(etmp, 'are')} crushed by the falling portcullis!`);
                } else if (!Deaf()) {
                    /* Soundeffect(se_crushing_sound, 100) */
                    await You_hear('a crushing sound.');
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
        }
    }

    /*
     * Here's where we try to do relocation.  Assumes that etmp is not
     * arriving at the portcullis square while the drawbridge is
     * descending, since this square would be inaccessible (i.e.
     * etmp started on drawbridge square) or unnecessary (i.e. etmp
     * started here) in such a situation.
     */
    newx = oldx;
    newy = oldy;
    {
        const cc = { x: newx, y: newy };
        find_drawbridge(cc);
        newx = cc.x, newy = cc.y;
    }
    if ((newx === oldx) && (newy === oldy)) {
        const cc = { x: newx, y: newy };
        get_wall_for_db(cc);
        newx = cc.x, newy = cc.y;
    }
    if (relocates && (e_at(newx, newy))) {
        /*
         * Standoff problem: one or both entities must change squares in
         * order for dispatching to end properly.  There must be a
         * square for the entity to get to: automiss entities always
         * survive, so the square must be occupied by a non-automiss
         * entity which dies (or jumps).
         */
        let other;

        other = e_at(newx, newy);
        if (e_survives_at(other, newx, newy) && automiss(other)) {
            relocates = false; /* "other" won't budge */
        } else {
            while ((e_at(newx, newy) != null) && (e_at(newx, newy) !== etmp))
                await do_entity(other);
            if (e_at(oldx, oldy) !== etmp) {
                return;
            }
        }
    }
    if (relocates && !e_at(newx, newy)) { /* if e_at() entity = worm tail */
        if (!is_u(etmp)) {
            remove_monster(etmp.ex, etmp.ey);
            place_monster(etmp.emon, newx, newy);
            update_monster_region(etmp.emon);
        } else {
            u.ux = newx;
            u.uy = newy;
        }
        etmp.ex = newx;
        etmp.ey = newy;
        e_inview = e_canseemon(etmp);
    }
    if (is_db_wall(etmp.ex, etmp.ey)) {
        if (e_inview) {
            if (is_u(etmp)) {
                await You('tumble towards the closed portcullis!');
                if (automiss(etmp))
                    await You('pass through it!');
                else
                    await pline_The('drawbridge closes in...');
            } else
                await pline(`${E_phrase(etmp, 'disappear')} behind the drawbridge.`);
        }
        if (!e_survives_at(etmp, etmp.ex, etmp.ey)) {
            if (!game.killer)
                game.killer = { format: 0, name: '' };
            game.killer.format = KILLED_BY_AN;
            game.killer.name = 'closing drawbridge';
            await e_died(etmp, XKILL_NOMSG, CRUSHING);
            return;
        }
    } else {
        if (is_pool(etmp.ex, etmp.ey) && !e_inview)
            if (!Deaf()) {
                /* Soundeffect(se_splash, 100) */
                await You_hear('a splash.');
            }
        if (e_survives_at(etmp, etmp.ex, etmp.ey)) {
            if (e_inview && !is_flyer(etmp.edata)
                && !is_floater(etmp.edata))
                await pline(`${E_phrase(etmp, 'fall')} from the bridge.`);
            return;
        }
        if (is_pool(etmp.ex, etmp.ey) || is_lava(etmp.ex, etmp.ey))
            if (e_inview && !is_u(etmp)) {
                /* drown() and lava_effects() print their own messages */
                const lava = is_lava(etmp.ex, etmp.ey);

                if (Hallucination())
                    await pline(`${E_phrase(etmp, 'drink')} the ${lava ? 'lava' : 'moat'} and disappears.`);
                else
                    await pline(`${E_phrase(etmp, 'fall')} into the ${
                        lava ? hliquid('lava') : 'moat'}.`);
            }
        if (!game.killer)
            game.killer = { format: 0, name: '' };
        game.killer.format = NO_KILLER_PREFIX;
        game.killer.name = 'fell from a drawbridge';
        await e_died(etmp, /* CRUSHING is arbitrary */
                     XKILL_NOCORPSE | (e_inview ? XKILL_GIVEMSG : XKILL_NOMSG),
                     is_pool(etmp.ex, etmp.ey) ? DROWNING
                       : is_lava(etmp.ex, etmp.ey) ? BURNING
                         : CRUSHING); /*no corpse*/
        return;
    }
}

// src/dbridge.c:763 nokiller()
function nokiller() {
    if (game.killer) {
        game.killer.name = '';
        game.killer.format = 0;
    }
    m_to_e(null, 0, 0, occupants()[0]);
    m_to_e(null, 0, 0, occupants()[1]);
}

// src/dbridge.c:775 close_drawbridge(); Close the drawbridge located at x,y
export async function close_drawbridge(x, y) {
    const u = game.u;
    let lev1, lev2;
    let t;
    let x2, y2;

    lev1 = game.level.at(x, y);
    if (lev1.typ !== DRAWBRIDGE_DOWN)
        return;
    {
        const cc = { x, y };
        get_wall_for_db(cc);
        x2 = cc.x, y2 = cc.y;
    }
    if (cansee(x, y) || cansee(x2, y2)) {
        await You_see(`a drawbridge ${
            (((u.ux === x || u.uy === y) && !Underwater())
             || distu(x2, y2) < distu(x, y))
                ? 'coming'
                : 'going'} up!`);
    } else { /* "5 gears turn" for castle drawbridge tune */
        /* Soundeffect(se_chains_rattling_gears_turning, 75) */
        await You_hear('chains rattling and gears turning.');
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
    set_entity(x, y, occupants()[0]);
    set_entity(x2, y2, occupants()[1]);
    await do_entity(occupants()[0]);          /* Do set_entity after first */
    set_entity(x2, y2, occupants()[1]); /* do_entity for worm tail */
    await do_entity(occupants()[1]);
    if (OBJ_AT(x, y) && !Deaf()) {
        /* Soundeffect(se_smashing_and_crushing, 75) */
        await You_hear('smashing and crushing.');
    }
    await revive_nasty(x, y, null);
    await revive_nasty(x2, y2, null);
    delallobj(x, y);
    delallobj(x2, y2);
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

// src/dbridge.c:840 open_drawbridge(); Open the drawbridge located at x,y
export async function open_drawbridge(x, y) {
    const u = game.u;
    let lev1, lev2;
    let t;
    let x2, y2;

    lev1 = game.level.at(x, y);
    if (lev1.typ !== DRAWBRIDGE_UP)
        return;
    {
        const cc = { x, y };
        get_wall_for_db(cc);
        x2 = cc.x, y2 = cc.y;
    }
    if (cansee(x, y) || cansee(x2, y2)) {
        await You_see(`a drawbridge ${
            (distu(x2, y2) < distu(x, y)) ? 'going' : 'coming'} down!`);
    } else { /* "5 gears turn" for castle drawbridge tune */
        /* Soundeffect(se_gears_turning_chains_rattling, 100) */
        await You_hear('gears turning and chains rattling.');
    }
    lev1.typ = DRAWBRIDGE_DOWN;
    lev2 = game.level.at(x2, y2);
    lev2.typ = DOOR;
    lev2.doormask = D_NODOOR;
    set_entity(x, y, occupants()[0]);
    set_entity(x2, y2, occupants()[1]);
    await do_entity(occupants()[0]);          /* do set_entity after first */
    set_entity(x2, y2, occupants()[1]); /* do_entity for worm tails */
    await do_entity(occupants()[1]);
    await revive_nasty(x, y, null);
    delallobj(x, y);
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
        (u.uevent ||= {}).uopened_dbridge = true;
    nokiller();
}

// src/dbridge.c:888 destroy_drawbridge(); Let's destroy the drawbridge
// located at x,y
export async function destroy_drawbridge(x, y) {
    const u = game.u;
    let lev1, lev2;
    let t;
    let otmp;
    let x2, y2;
    let i;
    let e_inview;
    const etmp1 = occupants()[0], etmp2 = occupants()[1];

    lev1 = game.level.at(x, y);
    if (!IS_DRAWBRIDGE(lev1.typ))
        return;
    {
        const cc = { x, y };
        get_wall_for_db(cc);
        x2 = cc.x, y2 = cc.y;
    }
    lev2 = game.level.at(x2, y2);
    if ((lev1.drawbridgemask & DB_UNDER) === DB_MOAT
        || (lev1.drawbridgemask & DB_UNDER) === DB_LAVA) {
        let otmp2;
        const lava = (lev1.drawbridgemask & DB_UNDER) === DB_LAVA;

        /* Soundeffect(se_loud_splash, 100) */ /* Deaf-aware */
        if (lev1.typ === DRAWBRIDGE_UP) {
            if (cansee(x2, y2) || u_at(x2, y2))
                await pline_The(`portcullis of the drawbridge falls into the ${
                    lava ? hliquid('lava') : 'moat'}!`);
            else
                await You_hear('a loud *SPLASH*!');  /* Deaf-aware */
        } else {
            if (cansee(x, y) || u_at(x, y))
                await pline_The(`drawbridge collapses into the ${
                    lava ? hliquid('lava') : 'moat'}!`);
            else
                await You_hear('a loud *SPLASH*!');  /* Deaf-aware */
        }
        lev1.typ = lava ? LAVAPOOL : MOAT;
        lev1.drawbridgemask = 0;
        if ((otmp2 = sobj_at(ONAMES.BOULDER, x, y)) != null) {
            obj_extract_self(otmp2);
            await flooreffects(otmp2, x, y, 'fall');
        }
    } else {
        /* Soundeffect(se_loud_crash, 100) */ /* Deaf-aware */
        if (cansee(x, y) || u_at(x, y))
            await pline_The('drawbridge disintegrates!');
        else
            await You_hear('a loud *CRASH*!');  /* Deaf-aware */
        lev1.typ = ((lev1.drawbridgemask & DB_ICE) ? ICE : ROOM);
        lev1.icedpool = ((lev1.drawbridgemask & DB_ICE) ? ICED_MOAT : 0);
    }
    wake_nearto(x, y, 500);
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
        otmp = mksobj_at(ONAMES.IRON_CHAIN, rn2(2) ? x : x2, rn2(2) ? y : y2, true,
                         false);
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
        (u.uevent ||= {}).uopened_dbridge = true;

    set_entity(x2, y2, etmp2); /* currently only automissers can be here */
    if (etmp2.edata) {
        e_inview = e_canseemon(etmp2);
        if (!automiss(etmp2)) {
            if (e_inview)
                await pline(`${E_phrase(etmp2, 'are')} blown apart by flying debris.`);
            if (!game.killer)
                game.killer = { format: 0, name: '' };
            game.killer.format = KILLED_BY_AN;
            game.killer.name = 'exploding drawbridge';
            await e_died(etmp2,
                         XKILL_NOCORPSE | (e_inview ? XKILL_GIVEMSG : XKILL_NOMSG),
                         CRUSHING); /*no corpse*/
        } /* nothing which is vulnerable can survive this */
    }
    set_entity(x, y, etmp1);
    if (etmp1.edata) {
        e_inview = e_canseemon(etmp1);
        if (e_missed(etmp1, true)) {
            if (is_u(etmp1))
                await spoteffects(false);
            else
                await minliquid(etmp1.emon);
        } else {
            if (e_inview) {
                if (!is_u(etmp1) && Hallucination())
                    await pline(`${E_phrase(etmp1, 'get')} into some heavy metal!`);
                else
                    await pline(`${E_phrase(etmp1, 'are')} hit by a huge chunk of metal!`);
            } else {
                if (!Deaf() && !is_u(etmp1) && !is_pool(x, y)) {
                    /* Soundeffect(se_crushing_sound, 75) */
                    await You_hear('a crushing sound.');
                }
            }
            if (!game.killer)
                game.killer = { format: 0, name: '' };
            game.killer.format = KILLED_BY_AN;
            game.killer.name = 'collapsing drawbridge';
            await e_died(etmp1,
                         XKILL_NOCORPSE | (e_inview ? XKILL_GIVEMSG : XKILL_NOMSG),
                         CRUSHING); /*no corpse*/
            if (game.level.at(etmp1.ex, etmp1.ey).typ === MOAT)
                await do_entity(etmp1);
        }
    }
    nokiller();
    if (Is_stronghold(u.uz))
        (u.uevent ||= {}).uheard_tune = 3; /* bridge is gone so tune is now useless */
}
