/* NetHack 5.0	dbridge.c	$NHDT-Date: 1772771734 2026/03/05 20:35:34 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.70 $ */
/*      Copyright (c) 1989 by Jean-Christophe Collet              */
/* NetHack may be freely redistributed.  See license for details. */

import { C } from '../c-runtime/context.js';

/*
 * This file contains the drawbridge manipulation (create, open, close,
 * destroy).
 *
 * Added comprehensive monster-handling, and the "entity" structure to
 * deal with players as well. - 11/89
 *
 * Any traps and/or engravings at either the portcullis or span location
 * are destroyed whenever the bridge is lowered, raised, or destroyed.
 * (Engraving handling could be extended to flag whether an engraving on
 * the DB_UNDER surface is hidden by the lowered bridge, or one on the
 * bridge itself is hidden because the bridge has been raised, but that
 * seems like an awful lot of effort for very little gain.)
 */


















export function is_waterwall(x, y)
{
    x = C.coordxy(x);
    y = C.coordxy(y);
    if (C.isok(x, y) && C.IS_WATERWALL(C.levl[x][y].typ))
        return 1;
    return 0;
}

export function is_pool(x, y)
{
    x = C.coordxy(x);
    y = C.coordxy(y);
    let ltyp;

    if (!C.isok(x, y))
        return 0;
    ltyp = C.levl[x][y].typ;
    /* The ltyp == MOAT is not redundant with is_moat, because the
     * Juiblex level does not have moats, although it has MOATs. There
     * is probably a better way to express this. */
    if (ltyp == C.POOL || ltyp == C.MOAT || ltyp == C.WATER || is_moat(x, y))
        return 1;
    return 0;
}

export function is_lava(x, y)
{
    x = C.coordxy(x);
    y = C.coordxy(y);
    let ltyp;

    if (!C.isok(x, y))
        return 0;
    ltyp = C.levl[x][y].typ;
    if (ltyp == C.LAVAPOOL || ltyp == C.LAVAWALL
        || (ltyp == C.DRAWBRIDGE_UP
            && (C.levl[x][y].drawbridgemask & C.DB_UNDER) == C.DB_LAVA))
        return 1;
    return 0;
}

export function is_pool_or_lava(x, y)
{
    x = C.coordxy(x);
    y = C.coordxy(y);
    if (is_pool(x, y) || is_lava(x, y))
        return 1;
    else
        return 0;
}

export function is_ice(x, y)
{
    x = C.coordxy(x);
    y = C.coordxy(y);
    let ltyp;

    if (!C.isok(x, y))
        return 0;
    ltyp = C.levl[x][y].typ;
    if (ltyp == C.ICE || (ltyp == C.DRAWBRIDGE_UP
                        && (C.levl[x][y].drawbridgemask & C.DB_UNDER) == C.DB_ICE))
        return 1;
    return 0;
}

export function is_moat(x, y)
{
    x = C.coordxy(x);
    y = C.coordxy(y);
    let ltyp;

    if (!C.isok(x, y))
        return 0;
    ltyp = C.levl[x][y].typ;
    if (!C.Is_juiblex_level(C.u.uz)
        && (ltyp == C.MOAT
            || (ltyp == C.DRAWBRIDGE_UP
                && (C.levl[x][y].drawbridgemask & C.DB_UNDER) == C.DB_MOAT)))
        return 1;
    return 0;
}

export function db_under_typ(mask)
{
    mask = C.int(mask);
    switch (mask & C.DB_UNDER) {
    case C.DB_ICE:
        return C.ICE;
    case C.DB_LAVA:
        return C.LAVAPOOL;
    case C.DB_MOAT:
        return C.MOAT;
    default:
        return C.STONE;
    }
}

/*
 * We want to know whether a wall (or a door) is the portcullis (passageway)
 * of an eventual drawbridge.
 *
 * Return value:  the direction of the drawbridge, or -1 if not valid
 */
export function is_drawbridge_wall(x, y)
{
    x = C.coordxy(x);
    y = C.coordxy(y);
    let lev;

    if (!C.isok(x, y))
        return -1;

    lev = C.levl[x][y];
    if (lev.typ != C.DOOR && lev.typ != C.DBWALL)
        return -1;

    if (C.isok(x + 1, y) && C.IS_DRAWBRIDGE(C.levl[x + 1][y].typ)
        && (C.levl[x + 1][y].drawbridgemask & C.DB_DIR) == C.DB_WEST)
        return C.DB_WEST;
    if (C.isok(x - 1, y) && C.IS_DRAWBRIDGE(C.levl[x - 1][y].typ)
        && (C.levl[x - 1][y].drawbridgemask & C.DB_DIR) == C.DB_EAST)
        return C.DB_EAST;
    if (C.isok(x, y - 1) && C.IS_DRAWBRIDGE(C.levl[x][y - 1].typ)
        && (C.levl[x][y - 1].drawbridgemask & C.DB_DIR) == C.DB_SOUTH)
        return C.DB_SOUTH;
    if (C.isok(x, y + 1) && C.IS_DRAWBRIDGE(C.levl[x][y + 1].typ)
        && (C.levl[x][y + 1].drawbridgemask & C.DB_DIR) == C.DB_NORTH)
        return C.DB_NORTH;

    return -1;
}

/*
 * Use is_db_wall where you want to verify that a
 * drawbridge "wall" is UP in the location x, y
 * (instead of UP or DOWN, as with is_drawbridge_wall).
 */
export function is_db_wall(x, y)
{
    x = C.coordxy(x);
    y = C.coordxy(y);
    return C.bool(C.levl[x][y].typ == C.DBWALL);
}

/*
 * Return true with x,y pointing to the drawbridge if x,y initially indicate
 * a drawbridge or drawbridge wall.
 */
export function find_drawbridge(x, y)
{
    let dir;

    if (C.IS_DRAWBRIDGE(C.levl[x.value][y.value].typ))
        return 1;
    dir = is_drawbridge_wall(x.value, y.value);
    if (dir >= 0) {
        switch (dir) {
        case C.DB_NORTH:
            y.value++;
            break;
        case C.DB_SOUTH:
            y.value--;
            break;
        case C.DB_EAST:
            x.value--;
            break;
        case C.DB_WEST:
            x.value++;
            break;
        }
        return 1;
    }
    return 0;
}

/*
 * Find the drawbridge wall associated with a drawbridge.
 */
export function get_wall_for_db(x, y)
{
    switch (C.levl[x.value][y.value].drawbridgemask & C.DB_DIR) {
    case C.DB_NORTH:
        y.value--;
        break;
    case C.DB_SOUTH:
        y.value++;
        break;
    case C.DB_EAST:
        x.value++;
        break;
    case C.DB_WEST:
        x.value--;
        break;
    }
}

/*
 * Creation of a drawbridge at pos x,y.
 *     dir is the direction.
 *     flag must be put to TRUE if we want the drawbridge to be opened.
 */
export function create_drawbridge(x, y, dir, flag)
{
    x = C.coordxy(x);
    y = C.coordxy(y);
    dir = C.int(dir);
    flag = C.boolean(flag);
    let x2, y2;
    let horiz;
    let lava = C.levl[x][y].typ == C.LAVAPOOL; /* assume initialized map */

    x2 = x;
    y2 = y;
    switch (dir) {
    case C.DB_NORTH:
        horiz = 1;
        y2 = C.coordxy(y2 - 1);
        break;
    case C.DB_SOUTH:
        horiz = 1;
        y2 = C.coordxy(y2 + 1);
        break;
    case C.DB_EAST:
        horiz = 0;
        x2 = C.coordxy(x2 + 1);
        break;
    default:
        C.impossible("bad direction in create_drawbridge");
        /* C.FALLTHROUGH; */
        /*FALLTHRU*/
    case C.DB_WEST:
        horiz = 0;
        x2 = C.coordxy(x2 - 1);
        break;
    }
    if (!C.IS_WALL(C.levl[x2][y2].typ))
        return 0;
    if (flag) { /* We want the bridge open */
        C.levl[x][y].typ = C.DRAWBRIDGE_DOWN;
        C.levl[x2][y2].typ = C.DOOR;
        C.levl[x2][y2].doormask = C.D_NODOOR;
    } else {
        C.levl[x][y].typ = C.DRAWBRIDGE_UP;
        C.levl[x2][y2].typ = C.DBWALL;
        /* Drawbridges are non-diggable. */
        C.levl[x2][y2].wall_info = C.W_NONDIGGABLE;
    }
    C.levl[x][y].horizontal = !horiz;
    C.levl[x2][y2].horizontal = horiz;
    C.levl[x][y].drawbridgemask = dir;
    if (lava)
        C.levl[x][y].drawbridgemask |= C.DB_LAVA;
    return  1;
}

export function e_at(x, y)
{
    x = C.coordxy(x);
    y = C.coordxy(y);
    let entitycnt;

    for (entitycnt = 0; entitycnt < C.ENTITIES; entitycnt++)
        if (C.go.occupants[entitycnt].edata
            && C.go.occupants[entitycnt].ex == x
            && C.go.occupants[entitycnt].ey == y)
            break;
    if (C.debugcore("dbridge.c", 1)) {
        let save_plnmsg = C.iflags.last_msg;
        C.pline("entitycnt = %d", entitycnt);
        C.iflags.last_msg = save_plnmsg;
    }

    return (entitycnt == C.ENTITIES) ? 0
                                   : C.go.occupants[entitycnt];
}

export function m_to_e(mtmp, x, y, etmp)
{
    x = C.coordxy(x);
    y = C.coordxy(y);
    etmp.emon = mtmp;
    if (mtmp) {
        etmp.ex = x;
        etmp.ey = y;
        if (mtmp.wormno && (x != mtmp.mx || y != mtmp.my))
            etmp.edata = C.mons[C.PM_LONG_WORM_TAIL];
        else
            etmp.edata = mtmp.data;
    } else {
        etmp.edata = 0;
        etmp.ex = etmp.ey = 0;
    }
}

export function u_to_e(etmp)
{
    etmp.emon = C.gy.youmonst;
    etmp.ex = C.u.ux;
    etmp.ey = C.u.uy;
    etmp.edata = C.gy.youmonst.data;
}

export function set_entity(x, y, etmp)
/* location of span or portcullis */
/* pointer to occupants[0] or occupants[1] */
{
    x = C.coordxy(x);
    y = C.coordxy(y);
    if (C.u_at(x, y))
        u_to_e(etmp);
    else /* m_at() might yield Null; that's ok */
        m_to_e(C.m_at(x, y), x, y, etmp);
}

/* #define is_u(etmp) (etmp->emon == &gy.youmonst) */
/* #define e_canseemon(etmp) (is_u(etmp) || canseemon(etmp->emon)) */

/*
 * e_strg is a utility routine which is not actually in use anywhere, since
 * the specialized routines below suffice for all current purposes.
 */

/* #define e_strg(etmp, func) (is_u(etmp) ? (char *) 0 : func(etmp->emon)) */

export function e_nam(etmp)
{
    return C.samePtr(etmp.emon, C.gy.youmonst) ? C.literal("you") : C.mon_nam(etmp.emon);
}

/*
 * Generates capitalized entity name, makes 2nd -> 3rd person conversion on
 * verb, where necessary.
 */
export function E_phrase(etmp, verb)
{
    verb = C.charPointer(verb);
    const wholebuf = C.phraseBuffer();

    C.Strcpy(wholebuf, C.samePtr(etmp.emon, C.gy.youmonst) ? "You" : C.Monnam(etmp.emon));
    if (!verb || !C.loadChar(verb))
        return wholebuf;
    C.Strcat(wholebuf, " ");
    if (C.samePtr(etmp.emon, C.gy.youmonst))
        C.Strcat(wholebuf, verb);
    else
        C.Strcat(wholebuf, C.vtense(0, verb));
    return wholebuf;
}

/*
 * Simple-minded "can it be here?" routine
 */
export function e_survives_at(etmp, x, y)
{
    x = C.coordxy(x);
    y = C.coordxy(y);
    if (C.noncorporeal(etmp.edata))
        return 1;
    if (is_pool(x, y))
        return C.bool((C.samePtr(etmp.emon, C.gy.youmonst) && (C.Wwalking || C.Amphibious || C.Breathless
                                          || C.Swimming || C.Flying || C.Levitation))
                          || C.is_swimmer(etmp.edata)
                          || C.is_flyer(etmp.edata)
                          || C.is_floater(etmp.edata));
    /* must force call to lava_effects in e_died if is_u */
    if (is_lava(x, y))
        return C.bool((C.samePtr(etmp.emon, C.gy.youmonst) && (C.Levitation || C.Flying))
                          || C.likes_lava(etmp.edata)
                          || C.is_flyer(etmp.edata));
    if (is_db_wall(x, y))
        return C.bool(C.samePtr(etmp.emon, C.gy.youmonst) ? C.Passes_walls
                          : C.passes_walls(etmp.edata));
    return 1;
}

export function e_died(etmp, xkill_flags, how)
{
    xkill_flags = C.int(xkill_flags);
    how = C.int(how);
    if (C.samePtr(etmp.emon, C.gy.youmonst)) {
        if (how == C.DROWNING) {
            C.storeChar(C.svk.killer.name, 0); /* drown() sets its own killer */
            C.drown();
        } else if (how == C.BURNING) {
            C.storeChar(C.svk.killer.name, 0); /* lava_effects() sets own killer */
            C.lava_effects();
        } else {
            let xy = C.coordLocal();

            /* use more specific killer if specified */
            if (!C.loadChar(C.svk.killer.name)) {
                C.svk.killer.format = C.KILLED_BY_AN;
                C.Strcpy(C.svk.killer.name, "falling drawbridge");
            }
            C.done(how);
            /* So, you didn't die */
            if (!e_survives_at(etmp, etmp.ex, etmp.ey)) {
                if (C.enexto(xy, etmp.ex, etmp.ey, etmp.edata)) {
                    C.pline("A %s force teleports you away...",
                          C.Hallucination ? "normal" : "strange");
                    C.teleds(xy.x, xy.y, C.TELEDS_NO_FLAGS);
                }
                /* otherwise on top of the drawbridge is the
                 * only viable spot in the dungeon, so stay there
                 */
            }
        }
        /* we might have crawled out of the moat to survive */
        etmp.ex = C.u.ux, etmp.ey = C.u.uy;
    } else {
        let entitycnt;

        C.storeChar(C.svk.killer.name, 0);
/* fake "digested to death" damage-type suppresses corpse */
/* #define mk_message(dest) (((dest & XKILL_NOMSG) != 0) ? (char *) 0 : LITERALTOKEN10END) */
/* #define mk_corpse(dest) (((dest & XKILL_NOCORPSE) != 0) ? AD_DGST : AD_PHYS) */
        /* if monsters are moving, one of them caused the destruction */
        if (C.svc.context.mon_moving)
            C.monkilled(etmp.emon,
                      (((xkill_flags & C.XKILL_NOMSG) != 0) ? 0 : ""), (((xkill_flags & C.XKILL_NOCORPSE) != 0) ? C.AD_DGST : C.AD_PHYS));
        else /* you caused it */
            C.xkilled(etmp.emon, xkill_flags);

        /* if etmp gets life-saved, kill it again; otherwise we might end up
           trying to place another monster (probably a xorn) on same spot */
        if (!C.DEADMONSTER(etmp.emon)) {
            let seeit = C.canspotmon(etmp.emon);

            xkill_flags |= C.XKILL_NOMSG | C.XKILL_NOCONDUCT;
            if (C.svc.context.mon_moving)
                C.monkilled(etmp.emon, "", (((xkill_flags & C.XKILL_NOCORPSE) != 0) ? C.AD_DGST : C.AD_PHYS));
            else /* you caused it */
                C.xkilled(etmp.emon, xkill_flags);

            if (C.DEADMONSTER(etmp.emon)) {
                if (seeit)
                    C.pline("Unfortunately for %s, %s is still crushed.",
                          C.mon_nam(etmp.emon), C.mhe(etmp.emon));
            } else {
                ; /* FIXME: still not dead?  What should we do now? */
            }
        }
        etmp.edata = 0;

        /* dead long worm handling */
        for (entitycnt = 0; entitycnt < C.ENTITIES; entitycnt++) {
            if (!C.samePtr(etmp, C.go.occupants[entitycnt])
                && C.samePtr(etmp.emon, C.go.occupants[entitycnt].emon))
                C.go.occupants[entitycnt].edata = 0;
        }
// #undef mk_message
// #undef mk_corpse
    }
}

/*
 * These are never directly affected by a bridge or portcullis.
 */
export function automiss(etmp)
{
    return C.bool((C.samePtr(etmp.emon, C.gy.youmonst) ? C.Passes_walls : C.passes_walls(etmp.edata))
                      || C.noncorporeal(etmp.edata));
}

/*
 * Does falling drawbridge or portcullis miss etmp?
 */
export function e_missed(etmp, chunks)
{
    chunks = C.boolean(chunks);
    let misses;

    if (chunks) {
        if (C.debugcore("dbridge.c", 1)) {
        let save_plnmsg = C.iflags.last_msg;
        C.pline("Do chunks miss?");
        C.iflags.last_msg = save_plnmsg;
    }
    }
    if (automiss(etmp))
        return 1;

    if (C.is_flyer(etmp.edata)
        && (C.samePtr(etmp.emon, C.gy.youmonst) ? !C.Unaware
                       : !C.helpless(etmp.emon)))
        /* flying requires mobility */
        misses = 5; /* out of 8 */
    else if (C.is_floater(etmp.edata)
             || (C.samePtr(etmp.emon, C.gy.youmonst) && C.Levitation)) /* doesn't require mobility */
        misses = 3;
    else if (chunks && is_pool(etmp.ex, etmp.ey))
        misses = 2; /* sitting ducks */
    else
        misses = 0;

    if (is_db_wall(etmp.ex, etmp.ey))
        misses -= 3; /* less airspace */

    if (C.debugcore("dbridge.c", 1)) {
        let save_plnmsg = C.iflags.last_msg;
        C.pline("Miss chance = %d (out of 8)", misses);
        C.iflags.last_msg = save_plnmsg;
    }

    return (misses >= C.rnd(8, 524, 'e_missed')) ? 1 : 0;
}

/*
 * Can etmp jump from death?
 */
export function e_jumps(etmp)
{
    let tmp = 4; /* out of 10 */

    if (C.samePtr(etmp.emon, C.gy.youmonst) ? (C.Unaware || C.Fumbling)
                   : (C.helpless(etmp.emon)
                      || !etmp.edata.mmove || etmp.emon.wormno))
        return 0;

    if (C.samePtr(etmp.emon, C.gy.youmonst) ? C.Confusion : etmp.emon.mconf)
        tmp -= 2;

    if (C.samePtr(etmp.emon, C.gy.youmonst) ? C.Stunned : etmp.emon.mstun)
        tmp -= 3;

    if (is_db_wall(etmp.ex, etmp.ey))
        tmp -= 2; /* less room to maneuver */

    if (C.debugcore("dbridge.c", 1)) {
        let save_plnmsg = C.iflags.last_msg;
        C.pline("%s to jump (%d chances in 10)", E_phrase(etmp, "try"), tmp);
        C.iflags.last_msg = save_plnmsg;
    }
    return (tmp >= C.rnd(10, 550, 'e_jumps')) ? 1 : 0;
}

export function do_entity(etmp)
{
    let newx = C.coordLocalValue(), newy = C.coordLocalValue(), oldx, oldy;
    let at_portcullis;
    let must_jump = 0, relocates = 0, e_inview;
    let crm;

    if (!etmp.edata)
        return;

    e_inview = (C.samePtr(etmp.emon, C.gy.youmonst) || C.canseemon(etmp.emon));
    oldx = C.coordxy(etmp.ex);
    oldy = C.coordxy(etmp.ey);
    at_portcullis = is_db_wall(oldx, oldy);
    crm = C.levl[oldx][oldy];

    if (automiss(etmp) && e_survives_at(etmp, oldx, oldy)) {
        if (e_inview && (at_portcullis || C.IS_DRAWBRIDGE(crm.typ)))
            C.pline_The("%s passes through %s!",
                      at_portcullis ? "portcullis" : "drawbridge",
                      e_nam(etmp));
        if (C.samePtr(etmp.emon, C.gy.youmonst))
            C.spoteffects(0);
        return;
    }
    if (e_missed(etmp, 0)) {
        if (at_portcullis) {
            C.pline_The("portcullis misses %s!", e_nam(etmp));
        } else {
            if (C.debugcore("dbridge.c", 1)) {
        let save_plnmsg = C.iflags.last_msg;
        C.pline("The drawbridge misses %s!", e_nam(etmp));
        C.iflags.last_msg = save_plnmsg;
    }
        }
        if (e_survives_at(etmp, oldx, oldy)) {
            return;
        } else {
            if (C.debugcore("dbridge.c", 1)) {
        let save_plnmsg = C.iflags.last_msg;
        C.pline("Mon can't survive here");
        C.iflags.last_msg = save_plnmsg;
    }
            if (at_portcullis)
                must_jump = 1;
            else
                relocates = 1; /* just ride drawbridge in */
        }
    } else {
        if (crm.typ == C.DRAWBRIDGE_DOWN) {
            if (C.samePtr(etmp.emon, C.gy.youmonst)) {
                C.svk.killer.format = C.NO_KILLER_PREFIX;
                C.Strcpy(C.svk.killer.name,
                       "crushed to death underneath a drawbridge");
            }
            C.pline("%s crushed underneath the drawbridge.",
                  E_phrase(etmp, "are"));             /* no jump */
            C.callLocal(e_died, etmp,
                   C.XKILL_NOCORPSE | (e_inview ? C.XKILL_GIVEMSG : C.XKILL_NOMSG),
                   C.CRUSHING); /* no corpse */
            return;       /* Note: Beyond this point, we know we're  */
        }                 /* not at an opened drawbridge, since all  */
        must_jump = 1; /* *missable* creatures survive on the     */
    }                     /* square, and all the unmissed ones die.  */
    if (must_jump) {
        if (at_portcullis) {
            if (e_jumps(etmp)) {
                relocates = 1;
                if (C.debugcore("dbridge.c", 1)) {
        let save_plnmsg = C.iflags.last_msg;
        C.pline("Jump succeeds!");
        C.iflags.last_msg = save_plnmsg;
    }
            } else {
                if (e_inview) {
                    C.pline("%s crushed by the falling portcullis!",
                          E_phrase(etmp, "are"));
                } else if (!C.Deaf) {
                    /* Soundeffect(se_crushing_sound, 100); -- inactive configured macro */
                    C.You_hear("a crushing sound.");
                }
                C.callLocal(e_died, etmp,
                       C.XKILL_NOCORPSE | (e_inview ? C.XKILL_GIVEMSG
                                                  : C.XKILL_NOMSG),
                       C.CRUSHING);
                /* no corpse */
                return;
            }
        } else { /* tries to jump off bridge to original square */
            relocates = !e_jumps(etmp);
            if (C.debugcore("dbridge.c", 1)) {
        let save_plnmsg = C.iflags.last_msg;
        C.pline("Jump %s!", (relocates) ? "fails" : "succeeds");
        C.iflags.last_msg = save_plnmsg;
    }
        }
    }

    /*
     * Here's where we try to do relocation.  Assumes that etmp is not
     * arriving at the portcullis square while the drawbridge is
     * falling, since this square would be inaccessible (i.e. etmp
     * started on drawbridge square) or unnecessary (i.e. etmp started
     * here) in such a situation.
     */
    if (C.debugcore("dbridge.c", 1)) {
        let save_plnmsg = C.iflags.last_msg;
        C.pline("Doing relocation.");
        C.iflags.last_msg = save_plnmsg;
    }
    newx.value = oldx;
    newy.value = oldy;
    find_drawbridge(newx, newy);
    if ((newx.value == oldx) && (newy.value == oldy))
        get_wall_for_db(newx, newy);
    if (C.debugcore("dbridge.c", 1)) {
        let save_plnmsg = C.iflags.last_msg;
        C.pline("Checking new square for occupancy.");
        C.iflags.last_msg = save_plnmsg;
    }
    if (relocates && (e_at(newx.value, newy.value))) {
        /*
         * Standoff problem: one or both entities must die, and/or
         * both switch places.  Avoid infinite recursion by checking
         * first whether the other entity is staying put.  Clean up if
         * we happen to move/die in recursion.
         */
        let other;

        other = e_at(newx.value, newy.value);
        if (C.debugcore("dbridge.c", 1)) {
        let save_plnmsg = C.iflags.last_msg;
        C.pline("New square is occupied by %s", e_nam(other));
        C.iflags.last_msg = save_plnmsg;
    }
        if (e_survives_at(other, newx.value, newy.value) && automiss(other)) {
            relocates = 0; /* "other" won't budge */
            if (C.debugcore("dbridge.c", 1)) {
        let save_plnmsg = C.iflags.last_msg;
        C.pline("%s suicide.", E_phrase(etmp, "commit"));
        C.iflags.last_msg = save_plnmsg;
    }
        } else {
            if (C.debugcore("dbridge.c", 1)) {
        let save_plnmsg = C.iflags.last_msg;
        C.pline("Handling %s", e_nam(other));
        C.iflags.last_msg = save_plnmsg;
    }
            while ((e_at(newx.value, newy.value) != 0) && (!C.samePtr(e_at(newx.value, newy.value), etmp)))
                C.callLocal(do_entity, other);
            if (C.debugcore("dbridge.c", 1)) {
        let save_plnmsg = C.iflags.last_msg;
        C.pline("Checking existence of %s", e_nam(etmp));
        C.iflags.last_msg = save_plnmsg;
    }

            if (!C.samePtr(e_at(oldx, oldy), etmp)) {
                if (C.debugcore("dbridge.c", 1)) {
        let save_plnmsg = C.iflags.last_msg;
        C.pline("%s moved or died in recursion somewhere",
                            E_phrase(etmp, "have"));
        C.iflags.last_msg = save_plnmsg;
    }

                return;
            }
        }
    }
    if (relocates && !e_at(newx.value, newy.value)) { /* if e_at() entity = worm tail */
        if (C.debugcore("dbridge.c", 1)) {
        let save_plnmsg = C.iflags.last_msg;
        C.pline("Moving %s", e_nam(etmp));
        C.iflags.last_msg = save_plnmsg;
    }
        if (!C.samePtr(etmp.emon, C.gy.youmonst)) {
            C.remove_monster(etmp.ex, etmp.ey);
            C.place_monster(etmp.emon, newx.value, newy.value);
            C.update_monster_region(etmp.emon);
        } else {
            C.u.ux = newx.value;
            C.u.uy = newy.value;
        }
        etmp.ex = newx.value;
        etmp.ey = newy.value;
        e_inview = (C.samePtr(etmp.emon, C.gy.youmonst) || C.canseemon(etmp.emon));
    }
    if (C.debugcore("dbridge.c", 1)) {
        let save_plnmsg = C.iflags.last_msg;
        C.pline("Final disposition of %s", e_nam(etmp));
        C.iflags.last_msg = save_plnmsg;
    }

    if (is_db_wall(etmp.ex, etmp.ey)) {
        if (C.debugcore("dbridge.c", 1)) {
        let save_plnmsg = C.iflags.last_msg;
        C.pline("%s in portcullis chamber", E_phrase(etmp, "are"));
        C.iflags.last_msg = save_plnmsg;
    }

        if (e_inview) {
            if (C.samePtr(etmp.emon, C.gy.youmonst)) {
                C.You("tumble towards the closed portcullis!");
                if (automiss(etmp))
                    C.You("pass through it!");
                else
                    C.pline_The("drawbridge closes in...");
            } else
                C.pline("%s behind the drawbridge.",
                      E_phrase(etmp, "disappear"));
        }
        if (!e_survives_at(etmp, etmp.ex, etmp.ey)) {
            C.svk.killer.format = C.KILLED_BY_AN;
            C.Strcpy(C.svk.killer.name, "closing drawbridge");
            C.callLocal(e_died, etmp, C.XKILL_NOMSG, C.CRUSHING);
            return;
        }
        if (C.debugcore("dbridge.c", 1)) {
        let save_plnmsg = C.iflags.last_msg;
        C.pline("%s in here", E_phrase(etmp, "survive"));
        C.iflags.last_msg = save_plnmsg;
    }
    } else {
        if (C.debugcore("dbridge.c", 1)) {
        let save_plnmsg = C.iflags.last_msg;
        C.pline("%s on drawbridge square", E_phrase(etmp, "are"));
        C.iflags.last_msg = save_plnmsg;
    }
        if (is_pool(etmp.ex, etmp.ey) && !e_inview)
            if (!C.Deaf) {
                /* Soundeffect(se_splash, 100); -- inactive configured macro */
                C.You_hear("a splash.");
            }
        if (e_survives_at(etmp, etmp.ex, etmp.ey)) {
            if (e_inview && !C.is_flyer(etmp.edata)
                && !C.is_floater(etmp.edata))
                C.pline("%s from the bridge.", E_phrase(etmp, "fall"));
            return;
        }
        if (C.debugcore("dbridge.c", 1)) {
        let save_plnmsg = C.iflags.last_msg;
        C.pline("%s cannot survive on the drawbridge square",
                    E_phrase(etmp, 0));
        C.iflags.last_msg = save_plnmsg;
    }
        if (is_pool(etmp.ex, etmp.ey) || is_lava(etmp.ex, etmp.ey))
            if (e_inview && !C.samePtr(etmp.emon, C.gy.youmonst)) {
                /* drown() will supply msgs if nec. */
                let lava = is_lava(etmp.ex, etmp.ey);

                if (C.Hallucination)
                    C.pline("%s the %s and disappears.",
                          E_phrase(etmp, "drink"), lava ? "lava" : "moat");
                else
                    C.pline("%s into the %s.", E_phrase(etmp, "fall"),
                          lava ? C.hliquid("lava") : "moat");
            }
        C.svk.killer.format = C.NO_KILLER_PREFIX;
        C.Strcpy(C.svk.killer.name, "fell from a drawbridge");
        C.callLocal(e_died, etmp, /* CRUSHING is arbitrary */
               C.XKILL_NOCORPSE | (e_inview ? C.XKILL_GIVEMSG : C.XKILL_NOMSG),
               is_pool(etmp.ex, etmp.ey) ? C.DROWNING
                 : is_lava(etmp.ex, etmp.ey) ? C.BURNING
                   : C.CRUSHING); /*no corpse*/
        return;
    }
}

/* clear stale reason for death and both 'entities' before returning */
export function nokiller()
{
    C.storeChar(C.svk.killer.name, 0);
    C.svk.killer.format = 0;
    m_to_e(0, 0, 0, C.go.occupants[0]);
    m_to_e(0, 0, 0, C.go.occupants[1]);
}

/*
 * Close the drawbridge located at x,y
 */
export function close_drawbridge(x, y)
{
    x = C.coordxy(x);
    y = C.coordxy(y);
    let lev1, lev2;
    let t;
    let x2 = C.coordLocalValue(), y2 = C.coordLocalValue();

    lev1 = C.levl[x][y];
    if (lev1.typ != C.DRAWBRIDGE_DOWN)
        return;
    x2.value = x;
    y2.value = y;
    get_wall_for_db(x2, y2);
    if (C.cansee(x, y) || C.cansee(x2.value, y2.value)) {
        C.You_see("a drawbridge %s up!",
                (((C.u.ux == x || C.u.uy == y) && !C.Underwater)
                 || C.distu(x2.value, y2.value) < C.distu(x, y))
                    ? "coming"
                    : "going");
    } else { /* "5 gears turn" for castle drawbridge tune */
        /* Soundeffect(se_chains_rattling_gears_turning, 75); -- inactive configured macro */
        C.You_hear("chains rattling and gears turning.");
    }
    lev1.typ = C.DRAWBRIDGE_UP;
    lev2 = C.levl[x2.value][y2.value];
    lev2.typ = C.DBWALL;
    switch (lev1.drawbridgemask & C.DB_DIR) {
    case C.DB_NORTH:
    case C.DB_SOUTH:
        lev2.horizontal = 1;
        break;
    case C.DB_WEST:
    case C.DB_EAST:
        lev2.horizontal = 0;
        break;
    }
    lev2.wall_info = C.W_NONDIGGABLE;
    set_entity(x, y, C.go.occupants[0]);
    set_entity(x2.value, y2.value, C.go.occupants[1]);
    C.callLocal(do_entity, C.go.occupants[0]);          /* Do set_entity after first */
    set_entity(x2.value, y2.value, C.go.occupants[1]); /* do_entity for worm tail */
    C.callLocal(do_entity, C.go.occupants[1]);
    if (C.OBJ_AT(x, y) && !C.Deaf) {
        /* Soundeffect(se_smashing_and_crushing, 75); -- inactive configured macro */
        C.You_hear("smashing and crushing.");
    }
    C.revive_nasty(x, y, 0);
    C.revive_nasty(x2.value, y2.value, 0);
    C.delallobj(x, y);
    C.delallobj(x2.value, y2.value);
    if ((t = C.t_at(x, y)) != 0)
        C.deltrap(t);
    if ((t = C.t_at(x2.value, y2.value)) != 0)
        C.deltrap(t);
    C.del_engr_at(x, y);
    C.del_engr_at(x2.value, y2.value);
    C.newsym(x, y);
    C.newsym(x2.value, y2.value);
    C.block_point(x2.value, y2.value); /* vision */
    nokiller();
}

/*
 * Open the drawbridge located at x,y
 */
export function open_drawbridge(x, y)
{
    x = C.coordxy(x);
    y = C.coordxy(y);
    let lev1, lev2;
    let t;
    let x2 = C.coordLocalValue(), y2 = C.coordLocalValue();

    lev1 = C.levl[x][y];
    if (lev1.typ != C.DRAWBRIDGE_UP)
        return;
    x2.value = x;
    y2.value = y;
    get_wall_for_db(x2, y2);
    if (C.cansee(x, y) || C.cansee(x2.value, y2.value)) {
        C.You_see("a drawbridge %s down!",
                (C.distu(x2.value, y2.value) < C.distu(x, y)) ? "going" : "coming");
    } else { /* "5 gears turn" for castle drawbridge tune */
        /* Soundeffect(se_gears_turning_chains_rattling, 100); -- inactive configured macro */
        C.You_hear("gears turning and chains rattling.");
    }
    lev1.typ = C.DRAWBRIDGE_DOWN;
    lev2 = C.levl[x2.value][y2.value];
    lev2.typ = C.DOOR;
    lev2.doormask = C.D_NODOOR;
    set_entity(x, y, C.go.occupants[0]);
    set_entity(x2.value, y2.value, C.go.occupants[1]);
    C.callLocal(do_entity, C.go.occupants[0]);          /* do set_entity after first */
    set_entity(x2.value, y2.value, C.go.occupants[1]); /* do_entity for worm tails */
    C.callLocal(do_entity, C.go.occupants[1]);
    C.revive_nasty(x, y, 0);
    C.delallobj(x, y);
    if ((t = C.t_at(x, y)) != 0)
        C.deltrap(t);
    if ((t = C.t_at(x2.value, y2.value)) != 0)
        C.deltrap(t);
    C.del_engr_at(x, y);
    C.del_engr_at(x2.value, y2.value);
    C.newsym(x, y);
    C.newsym(x2.value, y2.value);
    C.unblock_point(x2.value, y2.value); /* vision */
    if (C.Is_stronghold(C.u.uz))
        C.u.uevent.uopened_dbridge = 1;
    nokiller();
}

/*
 * Let's destroy the drawbridge located at x,y
 */
export function destroy_drawbridge(x, y)
{
    x = C.coordxy(x);
    y = C.coordxy(y);
    let lev1, lev2;
    let t;
    let otmp;
    let x2 = C.coordLocalValue(), y2 = C.coordLocalValue();
    let i;
    let e_inview;
    let etmp1 = C.go.occupants[0], etmp2 = C.go.occupants[1];

    lev1 = C.levl[x][y];
    if (!C.IS_DRAWBRIDGE(lev1.typ))
        return;
    x2.value = x;
    y2.value = y;
    get_wall_for_db(x2, y2);
    lev2 = C.levl[x2.value][y2.value];
    if ((lev1.drawbridgemask & C.DB_UNDER) == C.DB_MOAT
        || (lev1.drawbridgemask & C.DB_UNDER) == C.DB_LAVA) {
        let otmp2;
        let lava = (lev1.drawbridgemask & C.DB_UNDER) == C.DB_LAVA;

        /* Soundeffect(se_loud_splash, 100); -- inactive configured macro */  /* Deaf-aware */
        if (lev1.typ == C.DRAWBRIDGE_UP) {
            if (C.cansee(x2.value, y2.value) || C.u_at(x2.value, y2.value))
                C.pline_The("portcullis of the drawbridge falls into the %s!",
                          lava ? C.hliquid("lava") : "moat");
            else
                C.You_hear("a loud *SPLASH*!");  /* Deaf-aware */
        } else {
            if (C.cansee(x, y) || C.u_at(x, y))
                C.pline_The("drawbridge collapses into the %s!",
                          lava ? C.hliquid("lava") : "moat");
            else
                C.You_hear("a loud *SPLASH*!");  /* Deaf-aware */
        }
        lev1.typ = lava ? C.LAVAPOOL : C.MOAT;
        lev1.drawbridgemask = 0;
        if ((otmp2 = C.sobj_at(C.BOULDER, x, y)) != 0) {
            C.obj_extract_self(otmp2);
            C.flooreffects(otmp2, x, y, "fall");
        }
    } else {
        /* no moat beneath */
        /* Soundeffect(se_loud_crash, 100); -- inactive configured macro */  /* Deaf-aware */
        if (C.cansee(x, y) || C.u_at(x, y))
            C.pline_The("drawbridge disintegrates!");
        else
            C.You_hear("a loud *CRASH*!");  /* Deaf-aware */
        lev1.typ = ((lev1.drawbridgemask & C.DB_ICE) ? C.ICE : C.ROOM);
        lev1.icedpool = ((lev1.drawbridgemask & C.DB_ICE) ? C.ICED_MOAT : 0);
    }
    C.wake_nearto(x, y, 500);
    lev2.typ = C.DOOR;
    lev2.doormask = C.D_NODOOR;
    if ((t = C.t_at(x, y)) != 0)
        C.deltrap(t);
    if ((t = C.t_at(x2.value, y2.value)) != 0)
        C.deltrap(t);
    C.del_engr_at(x, y);
    C.del_engr_at(x2.value, y2.value);
    for (i = C.rn2(6, 949, 'destroy_drawbridge'); i > 0; --i) { /* scatter some debris */
        /* doesn't matter if we happen to pick <x,y2> or <x2,y>;
           since drawbridges are never placed diagonally, those
           pairings will always match one of <x,y> or <x2,y2> */
        otmp = C.mksobj_at(C.IRON_CHAIN, C.rn2(2, 953, 'destroy_drawbridge') ? x : x2.value, C.rn2(2, 953, 'destroy_drawbridge') ? y : y2.value, 1,
                         0);
        /* a force of 5 here would yield a radius of 2 for
           iron chain; anything less produces a radius of 1 */
        C.scatter(otmp.ox, otmp.oy, 1, C.MAY_HIT, otmp);
    }
    C.newsym(x, y);
    C.newsym(x2.value, y2.value);
    if (!C.does_block(x2.value, y2.value, lev2))
        C.unblock_point(x2.value, y2.value); /* vision */
    C.vision_recalc(0);
    if (C.Is_stronghold(C.u.uz))
        C.u.uevent.uopened_dbridge = 1;

    set_entity(x2.value, y2.value, etmp2); /* currently only automissers can be here */
    if (etmp2.edata) {
        e_inview = (C.samePtr(etmp2.emon, C.gy.youmonst) || C.canseemon(etmp2.emon));
        if (!automiss(etmp2)) {
            if (e_inview)
                C.pline("%s blown apart by flying debris.",
                      E_phrase(etmp2, "are"));
            C.svk.killer.format = C.KILLED_BY_AN;
            C.Strcpy(C.svk.killer.name, "exploding drawbridge");
            C.callLocal(e_died, etmp2,
                   C.XKILL_NOCORPSE | (e_inview ? C.XKILL_GIVEMSG : C.XKILL_NOMSG),
                   C.CRUSHING); /*no corpse*/
        } /* nothing which is vulnerable can survive this */
    }
    set_entity(x, y, etmp1);
    if (etmp1.edata) {
        e_inview = (C.samePtr(etmp1.emon, C.gy.youmonst) || C.canseemon(etmp1.emon));
        if (e_missed(etmp1, 1)) {
            if (C.debugcore("dbridge.c", 1)) {
        let save_plnmsg = C.iflags.last_msg;
        C.pline("%s spared!", E_phrase(etmp1, "are"));
        C.iflags.last_msg = save_plnmsg;
    }
            /* if there is water or lava here, fall in now */
            if (C.samePtr(etmp1.emon, C.gy.youmonst))
                C.spoteffects(0);
            else
                C.minliquid(etmp1.emon);
        } else {
            if (e_inview) {
                if (!C.samePtr(etmp1.emon, C.gy.youmonst) && C.Hallucination)
                    C.pline("%s into some heavy metal!",
                          E_phrase(etmp1, "get"));
                else
                    C.pline("%s hit by a huge chunk of metal!",
                          E_phrase(etmp1, "are"));
            } else {
                if (!C.Deaf && !C.samePtr(etmp1.emon, C.gy.youmonst) && !is_pool(x, y)) {
                    /* Soundeffect(se_crushing_sound, 75); -- inactive configured macro */
                    C.You_hear("a crushing sound.");
                } else {
                    if (C.debugcore("dbridge.c", 1)) {
        let save_plnmsg = C.iflags.last_msg;
        C.pline("%s from shrapnel", E_phrase(etmp1, "die"));
        C.iflags.last_msg = save_plnmsg;
    }
                }
            }
            C.svk.killer.format = C.KILLED_BY_AN;
            C.Strcpy(C.svk.killer.name, "collapsing drawbridge");
            C.callLocal(e_died, etmp1,
                   C.XKILL_NOCORPSE | (e_inview ? C.XKILL_GIVEMSG : C.XKILL_NOMSG),
                   C.CRUSHING); /*no corpse*/
            if (C.levl[etmp1.ex][etmp1.ey].typ == C.MOAT)
                C.callLocal(do_entity, etmp1);
        }
    }
    nokiller();
    if (C.Is_stronghold(C.u.uz))
        C.u.uevent.uheard_tune = 3; /* bridge is gone so tune is now useless */
}

/*dbridge.c*/

