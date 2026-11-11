/* NetHack 5.0	dbridge.c	$NHDT-Date: 1772771734 2026/03/05 20:35:34 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.70 $ */
/*      Copyright (c) 1989 by Jean-Christophe Collet              */
/* NetHack may be freely redistributed.  See license for details. */

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

// #include "hack.h"
















export function /* boolean */
is_waterwall(x, y)
{
    if (isok(x, y) && IS_WATERWALL(levl()[x][y].typ))
        return TRUE;
    return FALSE;
}

export function /* boolean */
is_pool(x, y)
{
    let ltyp;

    if (!isok(x, y))
        return FALSE;
    ltyp = levl()[x][y].typ;
    /* The ltyp == MOAT is not redundant with is_moat, because the
     * Juiblex level does not have moats, although it has MOATs. There
     * is probably a better way to express this. */
    if (ltyp == POOL || ltyp == MOAT || ltyp == WATER || is_moat(x, y))
        return TRUE;
    return FALSE;
}

export function /* boolean */
is_lava(x, y)
{
    let ltyp;

    if (!isok(x, y))
        return FALSE;
    ltyp = levl()[x][y].typ;
    if (ltyp == LAVAPOOL || ltyp == LAVAWALL
        || (ltyp == DRAWBRIDGE_UP
            && (levl()[x][y].flags & DB_UNDER) == DB_LAVA))
        return TRUE;
    return FALSE;
}

export function /* boolean */
is_pool_or_lava(x, y)
{
    if (is_pool(x, y) || is_lava(x, y))
        return TRUE;
    else
        return FALSE;
}

export function /* boolean */
is_ice(x, y)
{
    let ltyp;

    if (!isok(x, y))
        return FALSE;
    ltyp = levl()[x][y].typ;
    if (ltyp == ICE || (ltyp == DRAWBRIDGE_UP
                        && (levl()[x][y].flags & DB_UNDER) == DB_ICE))
        return TRUE;
    return FALSE;
}

export function /* boolean */
is_moat(x, y)
{
    let ltyp;

    if (!isok(x, y))
        return FALSE;
    ltyp = levl()[x][y].typ;
    if (!Is_juiblex_level(u.uz)
        && (ltyp == MOAT
            || (ltyp == DRAWBRIDGE_UP
                && (levl()[x][y].flags & DB_UNDER) == DB_MOAT)))
        return TRUE;
    return FALSE;
}

export function /* schar */
db_under_typ(mask)
{
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

/*
 * We want to know whether a wall (or a door) is the portcullis (passageway)
 * of an eventual drawbridge.
 *
 * Return value:  the direction of the drawbridge, or -1 if not valid
 */
export function /* int */
is_drawbridge_wall(x, y)
{
    let lev;

    if (!isok(x, y))
        return -1;

    lev = levl()[x][y];
    if (lev.typ != DOOR && lev.typ != DBWALL)
        return -1;

    if (isok(x + 1, y) && IS_DRAWBRIDGE(levl()[x + 1][y].typ)
        && (levl()[x + 1][y].flags & DB_DIR) == DB_WEST)
        return DB_WEST;
    if (isok(x - 1, y) && IS_DRAWBRIDGE(levl()[x - 1][y].typ)
        && (levl()[x - 1][y].flags & DB_DIR) == DB_EAST)
        return DB_EAST;
    if (isok(x, y - 1) && IS_DRAWBRIDGE(elt(levl()[x], y - 1).typ)
        && (elt(levl()[x], y - 1).flags & DB_DIR) == DB_SOUTH)
        return DB_SOUTH;
    if (isok(x, y + 1) && IS_DRAWBRIDGE(levl()[x][y + 1].typ)
        && (levl()[x][y + 1].flags & DB_DIR) == DB_NORTH)
        return DB_NORTH;

    return -1;
}

/*
 * Use is_db_wall where you want to verify that a
 * drawbridge "wall" is UP in the location x, y
 * (instead of UP or DOWN, as with is_drawbridge_wall).
 */
export function /* boolean */
is_db_wall(x, y)
{
    return (+(levl()[x][y].typ == DBWALL));
}

/*
 * Return true with x,y pointing to the drawbridge if x,y initially indicate
 * a drawbridge or drawbridge wall.
 */
export function /* boolean */
find_drawbridge(x, y)
{
    let dir;

    if (IS_DRAWBRIDGE(levl()[x[0]][y[0]].typ))
        return TRUE;
    dir = is_drawbridge_wall(x[0], y[0]);
    if (dir >= 0) {
        switch (dir) {
        case DB_NORTH:
            (y[0])++;
            break;
        case DB_SOUTH:
            (y[0])--;
            break;
        case DB_EAST:
            (x[0])--;
            break;
        case DB_WEST:
            (x[0])++;
            break;
        }
        return TRUE;
    }
    return FALSE;
}

/*
 * Find the drawbridge wall associated with a drawbridge.
 */
function /* void */
get_wall_for_db(x, y)
{
    switch (levl()[x[0]][y[0]].flags & DB_DIR) {
    case DB_NORTH:
        (y[0])--;
        break;
    case DB_SOUTH:
        (y[0])++;
        break;
    case DB_EAST:
        (x[0])++;
        break;
    case DB_WEST:
        (x[0])--;
        break;
    }
}

/*
 * Creation of a drawbridge at pos x,y.
 *     dir is the direction.
 *     flag must be put to TRUE if we want the drawbridge to be opened.
 */
export function /* boolean */
create_drawbridge(x, y, dir, flag)
{
    let x2, y2;
    let horiz;
    let lava = +(levl()[x][y].typ == LAVAPOOL); /* assume initialized map */

    x2 = x;
    y2 = y;
    switch (dir) {
    case DB_NORTH:
        horiz = TRUE;
        y2--;
        break;
    case DB_SOUTH:
        horiz = TRUE;
        y2++;
        break;
    case DB_EAST:
        horiz = FALSE;
        x2++;
        break;
    default:
        impossible(_("bad direction in create_drawbridge"));
        /* FALLTHROUGH */;
        /*FALLTHRU*/
    case DB_WEST:
        horiz = FALSE;
        x2--;
        break;
    }
    if (!IS_WALL(levl()[x2][y2].typ))
        return FALSE;
    if (flag) { /* We want the bridge open */
        levl()[x][y].typ = DRAWBRIDGE_DOWN;
        levl()[x2][y2].typ = DOOR;
        levl()[x2][y2].flags = D_NODOOR;
    } else {
        levl()[x][y].typ = DRAWBRIDGE_UP;
        levl()[x2][y2].typ = DBWALL;
        /* Drawbridges are non-diggable. */
        levl()[x2][y2].flags = W_NONDIGGABLE;
    }
    levl()[x][y].horizontal = +!horiz;
    levl()[x2][y2].horizontal = unsigned(horiz);
    levl()[x][y].flags = unsigned(dir);
    if (lava)
        levl()[x][y].flags |= DB_LAVA;
    return  TRUE;
}

function /* struct entity * */
e_at(x, y)
{
    let entitycnt;

    for (entitycnt = 0; entitycnt < ENTITIES; entitycnt++)
        if (go.occupants[entitycnt].edata
            && go.occupants[entitycnt].ex == x
            && go.occupants[entitycnt].ey == y)
            break;
    debugpline1(_("entitycnt = %d"), entitycnt, __FILE__);



    return (entitycnt == ENTITIES) ? null
                                   : (go.occupants[entitycnt]);
}

function /* void */
m_to_e(mtmp, x, y, etmp)
{
    etmp.emon = mtmp;
    if (mtmp) {
        etmp.ex = x;
        etmp.ey = y;
        if (mtmp.wormno && (x != mtmp.mx || y != mtmp.my))
            etmp.edata = mons[PM_LONG_WORM_TAIL];
        else
            etmp.edata = mtmp.data;
    } else {
        etmp.edata = null;
        etmp.ex = etmp.ey = 0;
    }
}

function /* void */
u_to_e(etmp)
{
    etmp.emon = gy.youmonst;
    etmp.ex = u.ux;
    etmp.ey = u.uy;
    etmp.edata = gy.youmonst.data;
}

function /* void */
set_entity(
    x, y,
    etmp)  /* pointer to occupants[0] or occupants[1] */
{
    if (u_at(x, y))
        u_to_e(etmp);
    else /* m_at() might yield Null; that's ok */
        m_to_e(m_at(x, y), x, y, etmp);
}

export function is_u(etmp) { return (+(etmp.emon == gy.youmonst)); }
export function e_canseemon(etmp) { return (((is_u(etmp) || canseemon(etmp.emon)) ? 1 : 0)); }

/*
 * e_strg is a utility routine which is not actually in use anywhere, since
 * the specialized routines below suffice for all current purposes.
 */

/* #define e_strg(etmp, func) (is_u(etmp) ? (char *) 0 : func(etmp->emon)) */

function /* const char * */
e_nam(etmp)
{
    return is_u(etmp) ? _("you") : mon_nam(etmp.emon);
}

/*
 * Generates capitalized entity name, makes 2nd -> 3rd person conversion on
 * verb, where necessary.
 */
function /* const char * */
E_phrase(etmp, verb)
{
    let wholebuf = static_array("E_phrase.wholebuf", char, 80);

    void strcpy(wholebuf, is_u(etmp) ? _("You") : Monnam(etmp.emon));
    if (!verb || !chars[verb])
        return wholebuf;
    void strcat(wholebuf, _(" "));
    if (is_u(etmp))
        void strcat(wholebuf, verb);
    else
        void strcat(wholebuf, vtense(0, verb));
    return wholebuf;
}

/*
 * Simple-minded "can it be here?" routine
 */
function /* boolean */
e_survives_at(etmp, x, y)
{
    if (noncorporeal(etmp.edata))
        return TRUE;
    if (is_pool(x, y))
        return ((((is_u(etmp) && (Wwalking() || Amphibious() || Breathless()
                                          || Swimming() || Flying() || Levitation()))
                          || is_swimmer(etmp.edata)
                          || is_flyer(etmp.edata)
                          || is_floater(etmp.edata)) ? 1 : 0));
    /* must force call to lava_effects in e_died if is_u */
    if (is_lava(x, y))
        return ((((is_u(etmp) && (Levitation() || Flying()))
                          || likes_lava(etmp.edata)
                          || is_flyer(etmp.edata)) ? 1 : 0));
    if (is_db_wall(x, y))
        return (is_u(etmp) ? Passes_walls()
                          : passes_walls(etmp.edata));
    return TRUE;
}

function /* void */
e_died(
    etmp,
    xkill_flags, how)
{ const $frame = stack_frame(); try {
    if (is_u(etmp)) {
        if (how == DROWNING) {
            chars[svk.killer.name + 0] = 0; /* drown() sets its own killer */
            void drown();
        } else if (how == BURNING) {
            chars[svk.killer.name + 0] = 0; /* lava_effects() sets own killer */
            void lava_effects();
        } else {
            let xy = stack_struct(struct_nhcoord);

            /* use more specific killer if specified */
            if (!chars[svk.killer.name + 0]) {
                svk.killer.format = KILLED_BY_AN;
                void strcpy(svk.killer.name, _("falling drawbridge"));
            }
            done(how);
            /* So, you didn't die */
            if (!e_survives_at(etmp, etmp.ex, etmp.ey)) {
                if (enexto(xy, etmp.ex, etmp.ey, etmp.edata)) {
                    pline(_("A %s force teleports you away..."),
                          Hallucination() ? _("normal") : _("strange"));
                    teleds(xy.x, xy.y, TELEDS_NO_FLAGS);
                }
                /* otherwise on top of the drawbridge is the
                 * only viable spot in the dungeon, so stay there
                 */
            }
        }
        /* we might have crawled out of the moat to survive */
        etmp.ex = u.ux, etmp.ey = u.uy;
    } else {
        let entitycnt;

        chars[svk.killer.name + 0] = 0;
/* fake "digested to death" damage-type suppresses corpse */


        /* if monsters are moving, one of them caused the destruction */
        if (svc.context.mon_moving)
            monkilled(etmp.emon,
                      mk_message(xkill_flags), mk_corpse(xkill_flags));
        else /* you caused it */
            xkilled(etmp.emon, xkill_flags);

        /* if etmp gets life-saved, kill it again; otherwise we might end up
           trying to place another monster (probably a xorn) on same spot */
        if (!DEADMONSTER(etmp.emon)) {
            let seeit = canspotmon(etmp.emon);

            xkill_flags |= XKILL_NOMSG | XKILL_NOCONDUCT;
            if (svc.context.mon_moving)
                monkilled(etmp.emon, _(""), mk_corpse(xkill_flags));
            else /* you caused it */
                xkilled(etmp.emon, xkill_flags);

            if (DEADMONSTER(etmp.emon)) {
                if (seeit)
                    pline(_("Unfortunately for %s, %s is still crushed."),
                          mon_nam(etmp.emon), mhe(etmp.emon));
            } else {
                ; /* FIXME: still not dead?  What should we do now? */
            }
        }
        etmp.edata = null;

        /* dead long worm handling */
        for (entitycnt = 0; entitycnt < ENTITIES; entitycnt++) {
            if (etmp != (go.occupants[entitycnt])
                && etmp.emon == go.occupants[entitycnt].emon)
                go.occupants[entitycnt].edata = null;
        }


    }
} finally { stack_pop($frame); } } export function mk_message(dest) { return (((dest & XKILL_NOMSG) != 0) ? 0 : _("")); } export function mk_corpse(dest) { return (((dest & XKILL_NOCORPSE) != 0) ? AD_DGST : AD_PHYS); }

/*
 * These are never directly affected by a bridge or portcullis.
 */
function /* boolean */
automiss(etmp)
{
    return ((((is_u(etmp) ? Passes_walls() : passes_walls(etmp.edata))
                      || noncorporeal(etmp.edata)) ? 1 : 0));
}

/*
 * Does falling drawbridge or portcullis miss etmp?
 */
function /* boolean */
e_missed(etmp, chunks)
{
    let misses;

    if (chunks) {
        debugpline0(_("Do chunks miss?"), __FILE__);
    }
    if (automiss(etmp))
        return TRUE;

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

    debugpline1(_("Miss chance = %d (out of 8)"), misses, __FILE__);

    return (misses >= rnd(8)) ? TRUE : FALSE;
}

/*
 * Can etmp jump from death?
 */
function /* boolean */
e_jumps(etmp)
{
    let tmp = 4; /* out of 10 */

    if (is_u(etmp) ? (Unaware() || Fumbling())
                   : (helpless(etmp.emon)
                      || !etmp.edata.mmove || etmp.emon.wormno))
        return FALSE;

    if (is_u(etmp) ? Confusion() : etmp.emon.mconf)
        tmp -= 2;

    if (is_u(etmp) ? Stunned() : etmp.emon.mstun)
        tmp -= 3;

    if (is_db_wall(etmp.ex, etmp.ey))
        tmp -= 2; /* less room to maneuver */

    do { if (showdebug(_(__FILE__))) { let save_plnmsg = iflags.last_msg; pline(_("%s to jump (%d chances in 10)"), E_phrase(etmp, _("try")), tmp); iflags.last_msg = save_plnmsg; } } while (0);
    return (tmp >= rnd(10)) ? TRUE : FALSE;
}

function /* void */
do_entity(etmp)
{ const $frame = stack_frame(); try {
    let newx = stack_var(coordxy), newy = stack_var(coordxy), oldx, oldy;
    let at_portcullis;
    let must_jump = FALSE, relocates = FALSE, e_inview;
    let crm;

    if (!etmp.edata)
        return;

    e_inview = e_canseemon(etmp);
    oldx = etmp.ex;
    oldy = etmp.ey;
    at_portcullis = is_db_wall(oldx, oldy);
    crm = levl()[oldx][oldy];

    if (automiss(etmp) && e_survives_at(etmp, oldx, oldy)) {
        if (e_inview && (at_portcullis || IS_DRAWBRIDGE(crm.typ)))
            pline_The(_("%s passes through %s!"),
                      at_portcullis ? _("portcullis") : _("drawbridge"),
                      e_nam(etmp));
        if (is_u(etmp))
            spoteffects(FALSE);
        return;
    }
    if (e_missed(etmp, FALSE)) {
        if (at_portcullis) {
            pline_The(_("portcullis misses %s!"), e_nam(etmp));
        } else {
            do { if (showdebug(_(__FILE__))) { let save_plnmsg = iflags.last_msg; pline(_("The drawbridge misses %s!"), e_nam(etmp)); iflags.last_msg = save_plnmsg; } } while (0);
        }
        if (e_survives_at(etmp, oldx, oldy)) {
            return;
        } else {
            debugpline0(_("Mon can't survive here"), __FILE__);
            if (at_portcullis)
                must_jump = TRUE;
            else
                relocates = TRUE; /* just ride drawbridge in */
        }
    } else {
        if (crm.typ == DRAWBRIDGE_DOWN) {
            if (is_u(etmp)) {
                svk.killer.format = NO_KILLER_PREFIX;
                void strcpy(svk.killer.name, _("crushed to death underneath a drawbridge"))
;
            }
            pline(_("%s crushed underneath the drawbridge."),
                  E_phrase(etmp, _("are")));             /* no jump */
            e_died(etmp,
                   XKILL_NOCORPSE | (e_inview ? XKILL_GIVEMSG : XKILL_NOMSG),
                   CRUSHING); /* no corpse */
            return;       /* Note: Beyond this point, we know we're  */
        }                 /* not at an opened drawbridge, since all  */
        must_jump = TRUE; /* *missable* creatures survive on the     */
    }                     /* square, and all the unmissed ones die.  */
    if (must_jump) {
        if (at_portcullis) {
            if (e_jumps(etmp)) {
                relocates = TRUE;
                debugpline0(_("Jump succeeds!"), __FILE__);
            } else {
                if (e_inview) {
                    pline(_("%s crushed by the falling portcullis!"),
                          E_phrase(etmp, _("are")));
                } else if (!Deaf()) {
                     ;
                    You_hear(_("a crushing sound."));
                }
                e_died(etmp,
                       XKILL_NOCORPSE | (e_inview ? XKILL_GIVEMSG
                                                  : XKILL_NOMSG),
                       CRUSHING);
                /* no corpse */
                return;
            }
        } else { /* tries to jump off bridge to original square */
            relocates = +!e_jumps(etmp);
            debugpline1(_("Jump %s!"), (relocates) ? _("fails") : _("succeeds"), __FILE__);
        }
    }

    /*
     * Here's where we try to do relocation.  Assumes that etmp is not
     * arriving at the portcullis square while the drawbridge is
     * falling, since this square would be inaccessible (i.e. etmp
     * started on drawbridge square) or unnecessary (i.e. etmp started
     * here) in such a situation.
     */
    debugpline0(_("Doing relocation."), __FILE__);
    newx[0] = oldx;
    newy[0] = oldy;
    void find_drawbridge(newx, newy);
    if ((newx[0] == oldx) && (newy[0] == oldy))
        get_wall_for_db(newx, newy);
    debugpline0(_("Checking new square for occupancy."), __FILE__);
    if (relocates && (e_at(newx[0], newy[0]))) {
        /*
         * Standoff problem: one or both entities must die, and/or
         * both switch places.  Avoid infinite recursion by checking
         * first whether the other entity is staying put.  Clean up if
         * we happen to move/die in recursion.
         */
        let other;

        other = e_at(newx[0], newy[0]);
        do { if (showdebug(_(__FILE__))) { let save_plnmsg = iflags.last_msg; pline(_("New square is occupied by %s"), e_nam(other)); iflags.last_msg = save_plnmsg; } } while (0);
        if (e_survives_at(other, newx[0], newy[0]) && automiss(other)) {
            relocates = FALSE; /* "other" won't budge */
            do { if (showdebug(_(__FILE__))) { let save_plnmsg = iflags.last_msg; pline(_("%s suicide."), E_phrase(etmp, _("commit"))); iflags.last_msg = save_plnmsg; } } while (0);
        } else {
            do { if (showdebug(_(__FILE__))) { let save_plnmsg = iflags.last_msg; pline(_("Handling %s"), e_nam(other)); iflags.last_msg = save_plnmsg; } } while (0);
            while ((e_at(newx[0], newy[0]) != null) && (e_at(newx[0], newy[0]) != etmp))
                do_entity(other);
            do { if (showdebug(_(__FILE__))) { let save_plnmsg = iflags.last_msg; pline(_("Checking existence of %s"), e_nam(etmp)); iflags.last_msg = save_plnmsg; } } while (0);



            if (e_at(oldx, oldy) != etmp) {
                do { if (showdebug(_(__FILE__))) { let save_plnmsg = iflags.last_msg; pline(_("%s moved or died in recursion somewhere"), E_phrase(etmp, _("have"))); iflags.last_msg = save_plnmsg; } } while (0)
;



                return;
            }
        }
    }
    if (relocates && !e_at(newx[0], newy[0])) { /* if e_at() entity = worm tail */
        do { if (showdebug(_(__FILE__))) { let save_plnmsg = iflags.last_msg; pline(_("Moving %s"), e_nam(etmp)); iflags.last_msg = save_plnmsg; } } while (0);
        if (!is_u(etmp)) {
            remove_monster(etmp.ex, etmp.ey);
            place_monster(etmp.emon, newx[0], newy[0]);
            update_monster_region(etmp.emon);
        } else {
            u.ux = newx[0];
            u.uy = newy[0];
        }
        etmp.ex = newx[0];
        etmp.ey = newy[0];
        e_inview = e_canseemon(etmp);
    }
    do { if (showdebug(_(__FILE__))) { let save_plnmsg = iflags.last_msg; pline(_("Final disposition of %s"), e_nam(etmp)); iflags.last_msg = save_plnmsg; } } while (0);



    if (is_db_wall(etmp.ex, etmp.ey)) {
        do { if (showdebug(_(__FILE__))) { let save_plnmsg = iflags.last_msg; pline(_("%s in portcullis chamber"), E_phrase(etmp, _("are"))); iflags.last_msg = save_plnmsg; } } while (0);



        if (e_inview) {
            if (is_u(etmp)) {
                You(_("tumble towards the closed portcullis!"));
                if (automiss(etmp))
                    You(_("pass through it!"));
                else
                    pline_The(_("drawbridge closes in..."));
            } else
                pline(_("%s behind the drawbridge."),
                      E_phrase(etmp, _("disappear")));
        }
        if (!e_survives_at(etmp, etmp.ex, etmp.ey)) {
            svk.killer.format = KILLED_BY_AN;
            void strcpy(svk.killer.name, _("closing drawbridge"));
            e_died(etmp, XKILL_NOMSG, CRUSHING);
            return;
        }
        do { if (showdebug(_(__FILE__))) { let save_plnmsg = iflags.last_msg; pline(_("%s in here"), E_phrase(etmp, _("survive"))); iflags.last_msg = save_plnmsg; } } while (0);
    } else {
        do { if (showdebug(_(__FILE__))) { let save_plnmsg = iflags.last_msg; pline(_("%s on drawbridge square"), E_phrase(etmp, _("are"))); iflags.last_msg = save_plnmsg; } } while (0);
        if (is_pool(etmp.ex, etmp.ey) && !e_inview)
            if (!Deaf()) {
                 ;
                You_hear(_("a splash."));
            }
        if (e_survives_at(etmp, etmp.ex, etmp.ey)) {
            if (e_inview && !is_flyer(etmp.edata)
                && !is_floater(etmp.edata))
                pline(_("%s from the bridge."), E_phrase(etmp, _("fall")));
            return;
        }
        do { if (showdebug(_(__FILE__))) { let save_plnmsg = iflags.last_msg; pline(_("%s cannot survive on the drawbridge square"), E_phrase(etmp, 0)); iflags.last_msg = save_plnmsg; } } while (0)
;
        if (is_pool(etmp.ex, etmp.ey) || is_lava(etmp.ex, etmp.ey))
            if (e_inview && !is_u(etmp)) {
                /* drown() will supply msgs if nec. */
                let lava = is_lava(etmp.ex, etmp.ey);

                if (Hallucination())
                    pline(_("%s the %s and disappears."),
                          E_phrase(etmp, _("drink")), lava ? _("lava") : _("moat"));
                else
                    pline(_("%s into the %s."), E_phrase(etmp, _("fall")),
                          lava ? hliquid(_("lava")) : _("moat"));
            }
        svk.killer.format = NO_KILLER_PREFIX;
        void strcpy(svk.killer.name, _("fell from a drawbridge"));
        e_died(etmp, /* CRUSHING is arbitrary */
               XKILL_NOCORPSE | (e_inview ? XKILL_GIVEMSG : XKILL_NOMSG),
               is_pool(etmp.ex, etmp.ey) ? DROWNING
                 : is_lava(etmp.ex, etmp.ey) ? BURNING
                   : CRUSHING); /*no corpse*/
        return;
    }
} finally { stack_pop($frame); } }

/* clear stale reason for death and both 'entities' before returning */
function /* void */
nokiller()
{
    chars[svk.killer.name + 0] = ord('\0');
    svk.killer.format = 0;
    m_to_e(null, 0, 0, go.occupants[0]);
    m_to_e(null, 0, 0, go.occupants[1]);
}

/*
 * Close the drawbridge located at x,y
 */
export function /* void */
close_drawbridge(x, y)
{ const $frame = stack_frame(); try {
    let lev1, lev2;
    let t;
    let x2 = stack_var(coordxy), y2 = stack_var(coordxy);

    lev1 = levl()[x][y];
    if (lev1.typ != DRAWBRIDGE_DOWN)
        return;
    x2[0] = x;
    y2[0] = y;
    get_wall_for_db(x2, y2);
    if (cansee(x, y) || cansee(x2[0], y2[0])) {
        You_see(_("a drawbridge %s up!"),
                (((u.ux == x || u.uy == y) && !Underwater())
                 || distu(x2[0], y2[0]) < distu(x, y))
                    ? _("coming")
                    : _("going"));
    } else { /* "5 gears turn" for castle drawbridge tune */
         ;
        You_hear(_("chains rattling and gears turning."));
    }
    lev1.typ = DRAWBRIDGE_UP;
    lev2 = levl()[x2[0]][y2[0]];
    lev2.typ = DBWALL;
    switch (lev1.flags & DB_DIR) {
    case DB_NORTH:
    case DB_SOUTH:
        lev2.horizontal = TRUE;
        break;
    case DB_WEST:
    case DB_EAST:
        lev2.horizontal = FALSE;
        break;
    }
    lev2.flags = W_NONDIGGABLE;
    set_entity(x, y, (go.occupants[0]));
    set_entity(x2[0], y2[0], (go.occupants[1]));
    do_entity((go.occupants[0]));          /* Do set_entity after first */
    set_entity(x2[0], y2[0], (go.occupants[1])); /* do_entity for worm tail */
    do_entity((go.occupants[1]));
    if (OBJ_AT(x, y) && !Deaf()) {
         ;
        You_hear(_("smashing and crushing."));
    }
    void revive_nasty(x, y, 0);
    void revive_nasty(x2[0], y2[0], 0);
    delallobj(x, y);
    delallobj(x2[0], y2[0]);
    if ((t = t_at(x, y)) != null)
        deltrap(t);
    if ((t = t_at(x2[0], y2[0])) != null)
        deltrap(t);
    del_engr_at(x, y);
    del_engr_at(x2[0], y2[0]);
    newsym(x, y);
    newsym(x2[0], y2[0]);
    block_point(x2[0], y2[0]); /* vision */
    nokiller();
} finally { stack_pop($frame); } }

/*
 * Open the drawbridge located at x,y
 */
export function /* void */
open_drawbridge(x, y)
{ const $frame = stack_frame(); try {
    let lev1, lev2;
    let t;
    let x2 = stack_var(coordxy), y2 = stack_var(coordxy);

    lev1 = levl()[x][y];
    if (lev1.typ != DRAWBRIDGE_UP)
        return;
    x2[0] = x;
    y2[0] = y;
    get_wall_for_db(x2, y2);
    if (cansee(x, y) || cansee(x2[0], y2[0])) {
        You_see(_("a drawbridge %s down!"),
                (distu(x2[0], y2[0]) < distu(x, y)) ? _("going") : _("coming"));
    } else { /* "5 gears turn" for castle drawbridge tune */
         ;
        You_hear(_("gears turning and chains rattling."));
    }
    lev1.typ = DRAWBRIDGE_DOWN;
    lev2 = levl()[x2[0]][y2[0]];
    lev2.typ = DOOR;
    lev2.flags = D_NODOOR;
    set_entity(x, y, (go.occupants[0]));
    set_entity(x2[0], y2[0], (go.occupants[1]));
    do_entity((go.occupants[0]));          /* do set_entity after first */
    set_entity(x2[0], y2[0], (go.occupants[1])); /* do_entity for worm tails */
    do_entity((go.occupants[1]));
    void revive_nasty(x, y, 0);
    delallobj(x, y);
    if ((t = t_at(x, y)) != null)
        deltrap(t);
    if ((t = t_at(x2[0], y2[0])) != null)
        deltrap(t);
    del_engr_at(x, y);
    del_engr_at(x2[0], y2[0]);
    newsym(x, y);
    newsym(x2[0], y2[0]);
    unblock_point(x2[0], y2[0]); /* vision */
    if (Is_stronghold(u.uz))
        u.uevent.uopened_dbridge = TRUE;
    nokiller();
} finally { stack_pop($frame); } }

/*
 * Let's destroy the drawbridge located at x,y
 */
export function /* void */
destroy_drawbridge(x, y)
{ const $frame = stack_frame(); try {
    let lev1, lev2;
    let t;
    let otmp;
    let x2 = stack_var(coordxy), y2 = stack_var(coordxy);
    let i;
    let e_inview;
    let etmp1 = (go.occupants[0]), etmp2 = (go.occupants[1]);

    lev1 = levl()[x][y];
    if (!IS_DRAWBRIDGE(lev1.typ))
        return;
    x2[0] = x;
    y2[0] = y;
    get_wall_for_db(x2, y2);
    lev2 = levl()[x2[0]][y2[0]];
    if ((lev1.flags & DB_UNDER) == DB_MOAT
        || (lev1.flags & DB_UNDER) == DB_LAVA) {
        let otmp2;
        let lava = +((lev1.flags & DB_UNDER) == DB_LAVA);

         ;  /* Deaf-aware */
        if (lev1.typ == DRAWBRIDGE_UP) {
            if (cansee(x2[0], y2[0]) || u_at(x2[0], y2[0]))
                pline_The(_("portcullis of the drawbridge falls into the %s!"),
                          lava ? hliquid(_("lava")) : _("moat"));
            else
                You_hear(_("a loud *SPLASH*!"));  /* Deaf-aware */
        } else {
            if (cansee(x, y) || u_at(x, y))
                pline_The(_("drawbridge collapses into the %s!"),
                          lava ? hliquid(_("lava")) : _("moat"));
            else
                You_hear(_("a loud *SPLASH*!"));  /* Deaf-aware */
        }
        lev1.typ = lava ? LAVAPOOL : MOAT;
        lev1.flags = 0;
        if ((otmp2 = sobj_at(BOULDER, x, y)) != null) {
            obj_extract_self(otmp2);
            void flooreffects(otmp2, x, y, _("fall"));
        }
    } else {
        /* no moat beneath */
         ;  /* Deaf-aware */
        if (cansee(x, y) || u_at(x, y))
            pline_The(_("drawbridge disintegrates!"));
        else
            You_hear(_("a loud *CRASH*!"));  /* Deaf-aware */
        lev1.typ = ((lev1.flags & DB_ICE) ? ICE : ROOM);
        lev1.flags = ((lev1.flags & DB_ICE) ? ICED_MOAT : 0);
    }
    wake_nearto(x, y, 500);
    lev2.typ = DOOR;
    lev2.flags = D_NODOOR;
    if ((t = t_at(x, y)) != null)
        deltrap(t);
    if ((t = t_at(x2[0], y2[0])) != null)
        deltrap(t);
    del_engr_at(x, y);
    del_engr_at(x2[0], y2[0]);
    for (i = rn2(6); i > 0; --i) { /* scatter some debris */
        /* doesn't matter if we happen to pick <x,y2> or <x2,y>;
           since drawbridges are never placed diagonally, those
           pairings will always match one of <x,y> or <x2,y2> */
        otmp = mksobj_at(IRON_CHAIN, rn2(2) ? x : x2[0], rn2(2) ? y : y2[0], TRUE,
                         FALSE);
        /* a force of 5 here would yield a radius of 2 for
           iron chain; anything less produces a radius of 1 */
        void scatter(otmp.ox, otmp.oy, 1, MAY_HIT, otmp);
    }
    newsym(x, y);
    newsym(x2[0], y2[0]);
    if (!does_block(x2[0], y2[0], lev2))
        unblock_point(x2[0], y2[0]); /* vision */
    vision_recalc(0);
    if (Is_stronghold(u.uz))
        u.uevent.uopened_dbridge = TRUE;

    set_entity(x2[0], y2[0], etmp2); /* currently only automissers can be here */
    if (etmp2.edata) {
        e_inview = e_canseemon(etmp2);
        if (!automiss(etmp2)) {
            if (e_inview)
                pline(_("%s blown apart by flying debris."),
                      E_phrase(etmp2, _("are")));
            svk.killer.format = KILLED_BY_AN;
            void strcpy(svk.killer.name, _("exploding drawbridge"));
            e_died(etmp2,
                   XKILL_NOCORPSE | (e_inview ? XKILL_GIVEMSG : XKILL_NOMSG),
                   CRUSHING); /*no corpse*/
        } /* nothing which is vulnerable can survive this */
    }
    set_entity(x, y, etmp1);
    if (etmp1.edata) {
        e_inview = e_canseemon(etmp1);
        if (e_missed(etmp1, TRUE)) {
            do { if (showdebug(_(__FILE__))) { let save_plnmsg = iflags.last_msg; pline(_("%s spared!"), E_phrase(etmp1, _("are"))); iflags.last_msg = save_plnmsg; } } while (0);
            /* if there is water or lava here, fall in now */
            if (is_u(etmp1))
                spoteffects(FALSE);
            else
                void minliquid(etmp1.emon);
        } else {
            if (e_inview) {
                if (!is_u(etmp1) && Hallucination())
                    pline(_("%s into some heavy metal!"),
                          E_phrase(etmp1, _("get")));
                else
                    pline(_("%s hit by a huge chunk of metal!"),
                          E_phrase(etmp1, _("are")));
            } else {
                if (!Deaf() && !is_u(etmp1) && !is_pool(x, y)) {
                     ;
                    You_hear(_("a crushing sound."));
                } else {
                    do { if (showdebug(_(__FILE__))) { let save_plnmsg = iflags.last_msg; pline(_("%s from shrapnel"), E_phrase(etmp1, _("die"))); iflags.last_msg = save_plnmsg; } } while (0);
                }
            }
            svk.killer.format = KILLED_BY_AN;
            void strcpy(svk.killer.name, _("collapsing drawbridge"));
            e_died(etmp1,
                   XKILL_NOCORPSE | (e_inview ? XKILL_GIVEMSG : XKILL_NOMSG),
                   CRUSHING); /*no corpse*/
            if (levl()[etmp1.ex][etmp1.ey].typ == MOAT)
                do_entity(etmp1);
        }
    }
    nokiller();
    if (Is_stronghold(u.uz))
        u.uevent.uheard_tune = 3; /* bridge is gone so tune is now useless */
} finally { stack_pop($frame); } }

/*dbridge.c*/
import { struct_nhcoord } from "./coord.h.js";
import { canspotmon } from "./display.h.macros.js";
import { Is_juiblex_level } from "./dungeon.h.macros.js";
import { Is_stronghold } from "./dungeon.h.macros.js";
import { FALSE } from "./global.h.js";
import { TRUE } from "./global.h.js";
import { coordxy } from "./global.h.js";
import { BURNING } from "./hack.h.js";
import { CRUSHING } from "./hack.h.js";
import { DROWNING } from "./hack.h.js";
import { ENTITIES } from "./hack.h.js";
import { KILLED_BY_AN } from "./hack.h.js";
import { MAY_HIT } from "./hack.h.js";
import { NO_KILLER_PREFIX } from "./hack.h.js";
import { TELEDS_NO_FLAGS } from "./hack.h.js";
import { XKILL_GIVEMSG } from "./hack.h.js";
import { XKILL_NOCONDUCT } from "./hack.h.js";
import { XKILL_NOCORPSE } from "./hack.h.js";
import { XKILL_NOMSG } from "./hack.h.js";
import { distu } from "./hack.h.macros.js";
import { debugpline0 } from "./lint.h.macros.js";
import { debugpline1 } from "./lint.h.macros.js";
import { showdebug } from "./lint.h.macros.js";
import { AD_DGST } from "./monattk.h.js";
import { AD_PHYS } from "./monattk.h.js";
import { is_floater } from "./mondata.h.macros.js";
import { is_flyer } from "./mondata.h.macros.js";
import { is_swimmer } from "./mondata.h.macros.js";
import { likes_lava } from "./mondata.h.macros.js";
import { noncorporeal } from "./mondata.h.macros.js";
import { passes_walls } from "./mondata.h.macros.js";
import { DEADMONSTER } from "./monst.h.macros.js";
import { helpless } from "./monst.h.macros.js";
import { PM_LONG_WORM_TAIL } from "./monsters.h.js";
import { BOULDER } from "./objects.h.js";
import { IRON_CHAIN } from "./objects.h.js";
import { DBWALL } from "./rm.h.js";
import { DB_DIR } from "./rm.h.js";
import { DB_EAST } from "./rm.h.js";
import { DB_ICE } from "./rm.h.js";
import { DB_LAVA } from "./rm.h.js";
import { DB_MOAT } from "./rm.h.js";
import { DB_NORTH } from "./rm.h.js";
import { DB_SOUTH } from "./rm.h.js";
import { DB_UNDER } from "./rm.h.js";
import { DB_WEST } from "./rm.h.js";
import { DOOR } from "./rm.h.js";
import { DRAWBRIDGE_DOWN } from "./rm.h.js";
import { DRAWBRIDGE_UP } from "./rm.h.js";
import { D_NODOOR } from "./rm.h.js";
import { ICE } from "./rm.h.js";
import { ICED_MOAT } from "./rm.h.js";
import { LAVAPOOL } from "./rm.h.js";
import { LAVAWALL } from "./rm.h.js";
import { MOAT } from "./rm.h.js";
import { POOL } from "./rm.h.js";
import { ROOM } from "./rm.h.js";
import { STONE } from "./rm.h.js";
import { WATER } from "./rm.h.js";
import { W_NONDIGGABLE } from "./rm.h.js";
import { IS_DRAWBRIDGE } from "./rm.h.macros.js";
import { IS_WALL } from "./rm.h.macros.js";
import { IS_WATERWALL } from "./rm.h.macros.js";
import { OBJ_AT } from "./rm.h.macros.js";
import { levl } from "./rm.h.macros.js";
import { m_at } from "./rm.h.macros.js";
import { remove_monster } from "./rm.h.macros.js";
import { cansee } from "./vision.h.macros.js";
import { mhe } from "./you.h.macros.js";
import { u_at } from "./you.h.macros.js";
import { Amphibious } from "./youprop.h.macros.js";
import { Breathless } from "./youprop.h.macros.js";
import { Confusion } from "./youprop.h.macros.js";
import { Deaf } from "./youprop.h.macros.js";
import { Flying } from "./youprop.h.macros.js";
import { Fumbling } from "./youprop.h.macros.js";
import { Hallucination } from "./youprop.h.macros.js";
import { Levitation } from "./youprop.h.macros.js";
import { Passes_walls } from "./youprop.h.macros.js";
import { Stunned } from "./youprop.h.macros.js";
import { Swimming } from "./youprop.h.macros.js";
import { Unaware } from "./youprop.h.macros.js";
import { Underwater } from "./youprop.h.macros.js";
import { Wwalking } from "./youprop.h.macros.js";
import { char } from "../rt/ctypes.js";
import { ord } from "../rt/ctypes.js";
import { unsigned } from "../rt/ctypes.js";
import { chars } from "../rt/heap.js";
import { stack_frame } from "../rt/heap.js";
import { stack_pop } from "../rt/heap.js";
import { strcat } from "../rt/libc.js";
import { strcpy } from "../rt/libc.js";
import { stack_struct } from "../rt/locals.js";
import { stack_var } from "../rt/locals.js";
import { static_array } from "../rt/locals.js";
import { _ } from "../rt/strings.js";
import { elt } from "../rt/struct.js";
import { isok } from "./cmd.js";
import { go } from "./decl.js";
import { gy } from "./decl.js";
import { iflags } from "./decl.js";
import { svc } from "./decl.js";
import { svk } from "./decl.js";
import { u } from "./decl.js";
import { canseemon } from "./display.js";
import { newsym } from "./display.js";
import { flooreffects } from "./do.js";
import { Monnam } from "./do_name.js";
import { hliquid } from "./do_name.js";
import { mon_nam } from "./do_name.js";
import { done } from "./end.js";
import { del_engr_at } from "./engrave.js";
import { scatter } from "./explode.js";
import { revive_nasty } from "./hack.js";
import { spoteffects } from "./hack.js";
import { delallobj } from "./invent.js";
import { sobj_at } from "./invent.js";
import { mksobj_at } from "./mkobj.js";
import { obj_extract_self } from "./mkobj.js";
import { minliquid } from "./mon.js";
import { monkilled } from "./mon.js";
import { wake_nearto } from "./mon.js";
import { xkilled } from "./mon.js";
import { mons } from "./monst.js";
import { vtense } from "./objnam.js";
import { You } from "./pline.js";
import { You_hear } from "./pline.js";
import { You_see } from "./pline.js";
import { impossible } from "./pline.js";
import { pline } from "./pline.js";
import { pline_The } from "./pline.js";
import { update_monster_region } from "./region.js";
import { rn2 } from "./rnd.js";
import { rnd } from "./rnd.js";
import { place_monster } from "./steed.js";
import { enexto } from "./teleport.js";
import { teleds } from "./teleport.js";
import { deltrap } from "./trap.js";
import { drown } from "./trap.js";
import { lava_effects } from "./trap.js";
import { t_at } from "./trap.js";
import { block_point } from "./vision.js";
import { does_block } from "./vision.js";
import { unblock_point } from "./vision.js";
import { vision_recalc } from "./vision.js";
const __FILE__ = "dbridge.c";
