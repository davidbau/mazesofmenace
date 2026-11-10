import {C} from './c-runtime.js';

/* NetHack 5.0	dig.c	$NHDT-Date: 1740629713 2025/02/26 20:15:13 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.227 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Michael Allison, 2012. */
/* NetHack may be freely redistributed.  See license for details. */



/* Indices returned by dig_typ() */
export const DIGTYP_UNDIGGABLE=0, DIGTYP_ROCK=1, DIGTYP_STATUE=2, DIGTYP_BOULDER=3, DIGTYP_DOOR=4, DIGTYP_TREE=5;

export function rm_waslit()

{
    let x, y;

    if (C.levl[C.u.ux][C.u.uy].typ == C.ROOM && C.levl[C.u.ux][C.u.uy].waslit)
        return 1;
    for (x = C.coordxy(C.u.ux - 2); x < C.u.ux + 3; x = C.coordxy(x + 1))
        for (y = C.coordxy(C.u.uy - 1); y < C.u.uy + 2; y = C.coordxy(y + 1))
            if (C.isok(x, y) && C.levl[x][y].waslit)
                return 1;
    return 0;
}

/* Change level topology.  Messes with vision tables and ignores things like
 * boulders in the name of a nice effect.  Vision will get fixed up again
 * immediately after the effect is complete.
 */
export function mkcavepos(x, y, dist, waslit, rockit)

{
    x = C.coordxy(x); y = C.coordxy(y); dist = C.int(dist); waslit = C.boolean(waslit); rockit = C.boolean(rockit);
    let lev;

    if (!C.isok(x, y))
        return;
    lev = C.levl[x][y];

    if (rockit) {
        let mtmp;

        if (C.IS_OBSTRUCTED(lev.typ))
            return;
        if (C.t_at(x, y))
            return;                   /* don't cover the portal */
        if ((mtmp = C.m_at(x, y)) != 0) /* make sure crucial monsters survive */
            if (!C.passes_walls(mtmp.data))
                C.rloc(mtmp, C.RLOC_NOMSG);
    } else if (lev.typ == C.ROOM)
        return;

    C.unblock_point(x, y); /* make sure vision knows this location is open */

    /* fake out saved state */
    lev.seenv = 0;
    lev.doormask = 0;
    if (dist < 3)
        lev.lit = (rockit ? 0 : 1);
    if (waslit)
        lev.waslit = (rockit ? 0 : 1);
    lev.horizontal = 0;
    /* short-circuit vision recalc */
    C.gv.viz_array[y][x] = (dist < 3) ? (C.IN_SIGHT | C.COULD_SEE) : C.COULD_SEE;
    lev.typ = (rockit ? C.STONE : C.ROOM); /* flags set via doormask above */
    if (dist >= 3)
        C.impossible("mkcavepos called with dist %d", dist);
    C.feel_newsym(x, y);
}

export function mkcavearea(rockit)

{
    rockit = C.boolean(rockit);
    let dist;
    let xmin = C.coordxy(C.u.ux), xmax = C.coordxy(C.u.ux);
    let ymin = C.coordxy(C.u.uy), ymax = C.coordxy(C.u.uy);
    let i;
    let waslit = rm_waslit();

    if (rockit) {
        
        C.pline("Crash!  The ceiling collapses around you!");
    } else {
        C.pline("A mysterious force %s cave around you!",
              (C.levl[C.u.ux][C.u.uy].typ == C.CORR) ? "creates a" : "extends the");
    }
    C.display_nhwindow(C.WIN_MESSAGE, 1);

    for (dist = 1; dist <= 2; dist++) {
        xmin = C.coordxy(xmin - 1);
        xmax = C.coordxy(xmax + 1);

        /* top and bottom */
        if (dist < 2) { /* the area is wider that it is high */
            ymin = C.coordxy(ymin - 1);
            ymax = C.coordxy(ymax + 1);
            for (i = C.coordxy(xmin + 1); i < xmax; i = C.coordxy(i + 1)) {
                mkcavepos(i, ymin, dist, waslit, rockit);
                mkcavepos(i, ymax, dist, waslit, rockit);
            }
        }

        /* left and right */
        for (i = C.coordxy(ymin); i <= ymax; i = C.coordxy(i + 1)) {
            mkcavepos(xmin, i, dist, waslit, rockit);
            mkcavepos(xmax, i, dist, waslit, rockit);
        }

        C.flush_screen(1); /* make sure the new glyphs shows up */
        C.nh_delay_output();
    }

    if (!rockit && C.levl[C.u.ux][C.u.uy].typ == C.CORR) {
        C.levl[C.u.ux][C.u.uy].typ = C.ROOM; /* flags for CORR already 0 */
        if (waslit)
            C.levl[C.u.ux][C.u.uy].waslit = 1;
        C.newsym(C.u.ux, C.u.uy); /* in case player is invisible */
    }

    C.gv.vision_full_recalc = 1; /* everything changed */
}

/* called when attempting to break a statue or boulder with a pick */
export function pick_can_reach(pick, x, y)

{
    x = C.coordxy(x); y = C.coordxy(y);
    let t = C.t_at(x, y);
    /* tseen: pit only affects item positioning when it is known */
    let target_in_pit = t && C.is_pit(t.ttyp) && t.tseen;

    /* if hero is in a pit, pick can only reach if the statue is too and
       the two pits are conjoined or the statue isn't and pick is two-handed;
       this applies to hero in pit trying to reach an adjcacent boulder too */
    if (C.u.utrap && C.u.utraptype == C.TT_PIT) {
        if (target_in_pit)
            return C.conjoined_pits(t, C.t_at(C.u.ux, C.u.uy), 0);
        return C.bimanual(pick);
    }

    /* when hero isn't in a pit, a mattock or flying hero w/ pick can reach
       whether or not the statue is in a pit */
    if (C.bimanual(pick) || C.Flying)
        return 1;
    /* one-handed pick-axe can reach if statue isn't in a pit */
    if (!target_in_pit)
        return 1;

    return 0;
}

/* When digging into location <x,y>, what are you actually digging into? */
export function dig_typ(otmp, x, y)

{
    x = C.coordxy(x); y = C.coordxy(y);
    let ltyp;

    if (!C.isok(x, y) || !otmp || (!C.is_pick(otmp) && !C.is_axe(otmp)))
        return DIGTYP_UNDIGGABLE;

    ltyp = C.levl[x][y].typ;
    if (C.is_axe(otmp))
        return C.closed_door(x, y) ? DIGTYP_DOOR
               : C.IS_TREE(ltyp) ? DIGTYP_TREE /* axe vs tree */
                 : DIGTYP_UNDIGGABLE;
    /*assert(is_pick(otmp));*/
    return (C.sobj_at(C.STATUE, x, y) && pick_can_reach(otmp, x, y))
           ? DIGTYP_STATUE
           : (C.sobj_at(C.BOULDER, x, y) && pick_can_reach(otmp, x, y))
             ? DIGTYP_BOULDER
             : C.closed_door(x, y) ? DIGTYP_DOOR
               : C.IS_TREE(ltyp) ? DIGTYP_UNDIGGABLE /* pick vs tree */
                 : (C.IS_OBSTRUCTED(ltyp)
                    && (!C.svl.level.flags.arboreal || C.IS_WALL(ltyp)))
                   ? DIGTYP_ROCK
                   : DIGTYP_UNDIGGABLE;
}

export function is_digging()

{
    if (C.go.occupation == dig) {
        return 1;
    }
    return 0;
}


// #define BY_YOU (&gy.youmonst)
// #define BY_OBJECT ((struct monst *) 0)

export function dig_check(madeby, x, y)

{
    x = C.coordxy(x); y = C.coordxy(y);
    let ttmp = C.t_at(x, y);

    if (C.On_stairs(x, y)) {
        let stway = C.stairway_at(x, y);
        if (stway.isladder) {
            return C.DIGCHECK_FAIL_ONLADDER;
        } else {
            return C.DIGCHECK_FAIL_ONSTAIRS;
        }
    } else if (C.IS_THRONE(C.levl[x][y].typ) && !C.samePtr(madeby, C.BY_OBJECT)) {
        return C.DIGCHECK_FAIL_THRONE;
    } else if (C.IS_ALTAR(C.levl[x][y].typ)
               && (!C.samePtr(madeby, C.BY_OBJECT)
                   || (C.altarmask_at(x, y) & C.AM_SANCTUM) != 0)) {
        return C.DIGCHECK_FAIL_ALTAR;
    } else if (C.Is_airlevel(C.u.uz)) {
        return C.DIGCHECK_FAIL_AIRLEVEL;
    } else if (C.Is_waterlevel(C.u.uz)) {
        return C.DIGCHECK_FAIL_WATERLEVEL;
    } else if ((C.IS_OBSTRUCTED(C.levl[x][y].typ) && C.levl[x][y].typ != C.SDOOR
                && (C.levl[x][y].wall_info & C.W_NONDIGGABLE) != 0)) {
        return C.DIGCHECK_FAIL_TOOHARD;
    } else if (ttmp && C.undestroyable_trap(ttmp.ttyp)) {
        return C.DIGCHECK_FAIL_UNDESTROYABLETRAP;
    } else if (!C.Can_dig_down(C.u.uz) && !C.levl[x][y].candig) {
        if (ttmp) {
            if (!C.is_hole(ttmp.ttyp) && !C.is_pit(ttmp.ttyp))
                return C.DIGCHECK_PASSED_DESTROY_TRAP;
            else
                return C.DIGCHECK_FAIL_CANTDIG;
        } else {
            return C.DIGCHECK_PASSED_PITONLY;
        }
    } else if (C.sobj_at(C.BOULDER, x, y)) {
        return C.DIGCHECK_FAIL_BOULDER;
    } else if (C.samePtr(madeby, C.BY_OBJECT)
               /* the block against existing traps is mainly to
                  prevent broken wands from turning holes into pits */
               && (ttmp || C.is_pool_or_lava(x, y))) {
        /* digging by player handles pools separately */
        return C.DIGCHECK_FAIL_OBJ_POOL_OR_TRAP;
    }
    return C.DIGCHECK_PASSED;
}

export function digcheck_fail_message(digresult, madeby, x, y)

{
    digresult = C.int(digresult); x = C.coordxy(x); y = C.coordxy(y);
    let verb =
        (C.samePtr(madeby, C.BY_YOU) && C.uwep && C.is_axe(C.uwep)) ? "chop" : "dig in";

    if (digresult < C.DIGCHECK_FAILED)
        return;

    switch (digresult) {
    case C.DIGCHECK_FAIL_AIRLEVEL:
        C.You("cannot %s thin air.", verb);
        break;
    case C.DIGCHECK_FAIL_ALTAR:
        C.pline_The("altar is too hard to break apart.");
        break;
    case C.DIGCHECK_FAIL_BOULDER:
        C.There("isn't enough room to %s here.", verb);
        break;
    case C.DIGCHECK_FAIL_ONLADDER:
        C.pline_The("ladder resists your effort.");
        break;
    case C.DIGCHECK_FAIL_ONSTAIRS:
        C.pline_The("stairs are too hard to %s.", verb);
        break;
    case C.DIGCHECK_FAIL_THRONE:
        C.pline_The("throne is too hard to break apart.");
        break;
    case C.DIGCHECK_FAIL_CANTDIG:
    case C.DIGCHECK_FAIL_TOOHARD:
    case C.DIGCHECK_FAIL_UNDESTROYABLETRAP:
        C.pline_The("%s here is too hard to %s.", C.surface(x, y), verb);
        break;
    case C.DIGCHECK_FAIL_WATERLEVEL:
        C.pline_The("%s splashes and subsides.", C.hliquid("water"));
        break;
    case C.DIGCHECK_FAIL_OBJ_POOL_OR_TRAP:
    case C.DIGCHECK_PASSED:
    case C.DIGCHECK_PASSED_PITONLY:
    case C.DIGCHECK_PASSED_DESTROY_TRAP:
        break;
    }
}

export function dig()

{
    let lev;
    let dpx = C.coordxy(C.svc.context.digging.pos.x), dpy = C.coordxy(C.svc.context.digging.pos.y);
    let ispick = C.uwep && C.is_pick(C.uwep);
    let verb = (!C.uwep || C.is_pick(C.uwep)) ? "dig into" : "chop through";
    let dcresult = C.DIGCHECK_PASSED;

    lev = C.levl[dpx][dpy];
    /* perhaps a nymph stole your pick-axe while you were busy digging */
    /* or perhaps you teleported away */
    if (C.u.uswallow || !C.uwep || (!ispick && !C.is_axe(C.uwep))
        || !C.on_level(C.svc.context.digging.level, C.u.uz)
        || ((C.svc.context.digging.down ? (dpx != C.u.ux || dpy != C.u.uy)
                                  : !C.next2u(dpx, dpy))))
        return 0;

    if (C.svc.context.digging.down) {
        dcresult = dig_check(C.BY_YOU, C.u.ux, C.u.uy);
        if (dcresult >= C.DIGCHECK_FAILED) {
            digcheck_fail_message(dcresult, C.BY_YOU, C.u.ux, C.u.uy);
            return 0;
        }
    } else { /* !svc.context.digging.down */
        if (C.IS_TREE(lev.typ) && !C.may_dig(dpx, dpy)
            && dig_typ(C.uwep, dpx, dpy) == DIGTYP_TREE) {
            C.pline("This tree seems to be petrified.");
            return 0;
        }
        if (C.IS_OBSTRUCTED(lev.typ) && !C.may_dig(dpx, dpy)
            && dig_typ(C.uwep, dpx, dpy) == DIGTYP_ROCK) {
            C.pline("This %s is too hard to %s.",
                  C.is_db_wall(dpx, dpy) ? "drawbridge" : "wall", verb);
            return 0;
        }
    }
    if (C.Fumbling && !C.rn2(3, 336, "dig")) {
        switch (C.rn2(3, 337, "dig")) {
        case 0:
            if (!C.welded(C.uwep)) {
                C.You("fumble and drop %s.", C.yname(C.uwep));
                C.dropx(C.uwep);
            } else {
                if (C.u.usteed)
                    C.pline("%s and %s %s!", C.Yobjnam2(C.uwep, "bounce"),
                          C.otense(C.uwep, "hit"), C.mon_nam(C.u.usteed));
                else
                    C.pline("Ouch!  %s and %s you!", C.Yobjnam2(C.uwep, "bounce"),
                          C.otense(C.uwep, "hit"));
                C.set_wounded_legs(C.RIGHT_SIDE, 5 + C.rnd(5, 349, "dig"));
            }
            break;
        case 1:
            
            C.pline("Bang!  You hit with the broad side of %s!",
                  C.the(C.xname(C.uwep)));
            C.wake_nearby(0);
            break;
        default:
            C.Your("swing misses its mark.");
            break;
        }
        return 0;
    }

    C.svc.context.digging.effort +=
        10 + C.rn2(5, 366, "dig") + C.abon() + C.uwep.spe - C.greatest_erosion(C.uwep) + C.u.udaminc;
    if (C.Race_if(C.PM_DWARF))
        C.svc.context.digging.effort *= 2;
    if (C.svc.context.digging.down) {
        let ttmp = C.t_at(dpx, dpy);

        if (C.svc.context.digging.effort > 250
            || (ttmp && ttmp.ttyp == C.HOLE)) {
            C.callLocal(dighole, 0, 0, 0);
            C.memset(C.svc.context.digging, 0,
                          C.diggingSize);
            return 0; /* done with digging */
        }

        if (C.svc.context.digging.effort <= 50
            || (ttmp && (ttmp.ttyp == C.TRAPDOOR || C.is_pit(ttmp.ttyp)))) {
            return 1;
        } else if (ttmp && (ttmp.ttyp == C.LANDMINE
                            || (ttmp.ttyp == C.BEAR_TRAP && !C.u.utrap))) {
            /* digging onto a set object trap triggers it;
               hero should have used #untrap first */
            C.dotrap(ttmp, C.FORCETRAP);
            /* restart completely from scratch if we resume digging */
            C.memset(C.svc.context.digging, 0,
                          C.diggingSize);
            return 0;
        } else if (ttmp && ttmp.ttyp == C.BEAR_TRAP && C.u.utrap) {
            if (C.rnl(7, 393, "dig") > (C.Fumbling ? 1 : 4)) {
                const kbuf = C.stackAlloc(C.BUFSZ);
                let dmg = C.dmgval(C.uwep, C.gy.youmonst) + C.dbon();

                if (dmg < 1)
                    dmg = 1;
                else if (C.uarmf)
                    dmg = C.intdiv(dmg + 1, 2);
                C.You("hit yourself in the %s.", C.body_part(C.FOOT));
                C.Sprintf(kbuf, "chopping off %s own %s", C.uhis(),
                        C.body_part(C.FOOT));
                C.losehp(C.Maybe_Half_Phys(dmg), kbuf, C.KILLED_BY);
            } else {
                C.You("destroy the bear trap with %s.",
                    C.yobjnam(C.uwep, 0));
                C.deltrap(ttmp);
                C.reset_utrap(1); /* release from trap, maybe Lev or Fly */
            }
            /* we haven't made any progress toward a pit yet */
            C.svc.context.digging.effort = 0;
            return 0;
        } else if (ttmp && dcresult == C.DIGCHECK_PASSED_DESTROY_TRAP) {
            let ttmpname = C.trapname(ttmp.ttyp, 0);

            if (ispick)
                C.You("destroy %s with %s.",
                    ttmp.tseen ? C.the(ttmpname) : C.an(ttmpname),
                    C.yobjnam(C.uwep, 0));
            C.deltrap(ttmp);
            /* we haven't made any progress toward a pit yet */
            C.svc.context.digging.effort = 0;
            return 0;
        }

        if (C.IS_ALTAR(lev.typ)) {
            C.altar_wrath(dpx, dpy);
            C.angry_priest();
        }

        /* make pit at <u.ux,u.uy> */
        if (C.callLocal(dighole, 1, 0, 0)) {
            C.svc.context.digging.level.dnum = 0;
            C.svc.context.digging.level.dlevel = -1;
        }
        return 0;
    }

    if (C.svc.context.digging.effort > 100) {
        const digbuf = C.stackAlloc(C.BUFSZ);
        let digtxt, dmgtxt = 0;
        let obj, bobj;
        let shopedge = C.loadChar(C.in_rooms(dpx, dpy, C.SHOPBASE));
        let digtyp = dig_typ(C.uwep, dpx, dpy);

        cleanup: {
        if (digtyp == DIGTYP_STATUE
            && (obj = C.sobj_at(C.STATUE, dpx, dpy)) != 0) {
            if (C.break_statue(obj))
                digtxt = "The statue shatters.";
            else
                /* it was a statue trap; break_statue()
                   printed a message and updated the screen */
                digtxt = 0;
        } else if (digtyp == DIGTYP_BOULDER
                   && (obj = C.sobj_at(C.BOULDER, dpx, dpy)) != 0) {
            C.fracture_rock(obj);
            /*[5.0: this probably isn't necessary anymore]*/
            if ((bobj = C.sobj_at(C.BOULDER, dpx, dpy)) != 0) {
                /* another boulder here, restack it to the top */
                C.obj_extract_self(bobj);
                C.place_object(bobj, dpx, dpy);
            }
            digtxt = "The boulder falls apart.";
        } else if (lev.typ == C.STONE || lev.typ == C.SCORR
                   || C.IS_TREE(lev.typ)) {
            if (C.Is_earthlevel(C.u.uz)) {
                if (C.uwep.blessed && !C.rn2(3, 468, "dig")) {
                    C.callLocal(mkcavearea, 0);
                    break cleanup;
                } else if ((C.uwep.cursed && !C.rn2(4, 471, "dig"))
                           || (!C.uwep.blessed && !C.rn2(6, 472, "dig"))) {
                    C.callLocal(mkcavearea, 1);
                    break cleanup;
                }
            }
            if (digtyp == DIGTYP_TREE) {
                digtxt = "You cut down the tree.";
                lev.typ = C.ROOM, lev.flags = 0;
                if (!C.rn2(5, 480, "dig"))
                    C.rnd_treefruit_at(dpx, dpy);
                if (C.Race_if(C.PM_ELF) || C.Role_if(C.PM_RANGER))
                    C.adjalign(-1);
            } else {
                digtxt = "You succeed in cutting away some rock.";
                lev.typ = C.CORR, lev.flags = 0;
            }
        } else if (C.IS_WALL(lev.typ)) {
            if (shopedge) {
                C.add_damage(dpx, dpy, C.SHOP_WALL_DMG);
                dmgtxt = "damage";
            }
            if (C.svl.level.flags.is_maze_lev) {
                lev.typ = C.ROOM, lev.flags = 0;
            } else if (C.svl.level.flags.is_cavernous_lev
                       && !C.in_town(dpx, dpy)) {
                lev.typ = C.CORR, lev.flags = 0;
            } else {
                lev.typ = C.DOOR, lev.doormask = C.D_NODOOR;
            }
            digtxt = "You make an opening in the wall.";
        } else if (lev.typ == C.SDOOR) {
            C.cvt_sdoor_to_door(lev); /* ->typ = DOOR */
            digtxt = "You break through a secret door!";
            if (!(lev.doormask & C.D_TRAPPED))
                lev.doormask = C.D_BROKEN;
        } else if (C.closed_door(dpx, dpy)) {
            C.Sprintf(digbuf, "You break through the door with your %s.",
                    C.simpleonames(C.uwep));
            digtxt = digbuf;
            if (shopedge) {
                C.add_damage(dpx, dpy, C.SHOP_DOOR_COST);
                dmgtxt = "break";
            }
            if (!(lev.doormask & C.D_TRAPPED))
                lev.doormask = C.D_BROKEN;
        } else
            return 0; /* statue or boulder got taken */

        if (!C.does_block(dpx, dpy, C.levl[dpx][dpy]))
            C.unblock_point(dpx, dpy); /* vision:  can see through */
        C.feel_newsym(dpx, dpy);
        if (digtxt && !C.svc.context.digging.quiet)
            C.pline1(digtxt); /* after newsym */
        if (dmgtxt)
            C.pay_for_damage(dmgtxt, 0);

        if (C.Is_earthlevel(C.u.uz) && !C.rn2(3, 528, "dig")) {
            let mndx = C.rn2(2, 529, "dig") ? C.PM_EARTH_ELEMENTAL : C.PM_XORN;

            if (C.makemon(C.mons[mndx], dpx, dpy, C.MM_NOMSG))
                C.pline_The("debris from your digging comes to life!");
        }
        if (C.IS_DOOR(lev.typ) && (lev.doormask & C.D_TRAPPED)) {
            lev.doormask = C.D_NODOOR;
            C.b_trapped("door", C.NO_PART);
            C.recalc_block_point(dpx, dpy);
            C.newsym(dpx, dpy);
        }
        }
        C.svc.context.digging.lastdigtime = C.svm.moves;
        C.svc.context.digging.quiet = 0;
        C.svc.context.digging.level.dnum = 0;
        C.svc.context.digging.level.dlevel = -1;
        return 0;
    } else { /* not enough effort has been spent yet */
        const d_target = [ "",        "rock", "statue",
                                                 "boulder", "door", "tree" ];
        let dig_target = dig_typ(C.uwep, dpx, dpy);

        if (C.IS_WALL(lev.typ) || dig_target == DIGTYP_DOOR) {
            if (C.loadChar(C.in_rooms(dpx, dpy, C.SHOPBASE))) {
                C.pline("This %s seems too hard to %s.",
                      C.IS_DOOR(lev.typ) ? "door" : "wall", verb);
                return 0;
            }
        } else if (dig_target == DIGTYP_UNDIGGABLE
                   || (dig_target == DIGTYP_ROCK && !C.IS_OBSTRUCTED(lev.typ)))
            return 0; /* statue or boulder got taken */

        if (!C.gd.did_dig_msg) {
            C.You("hit the %s with all your might.", d_target[dig_target]);
            C.wake_nearby(0);
            C.gd.did_dig_msg = 1;
        }
    }
    return 1;
}

export function furniture_handled(x, y, madeby_u)

{
    x = C.coordxy(x); y = C.coordxy(y); madeby_u = C.boolean(madeby_u);
    let lev = C.levl[x][y];

    if (C.IS_FOUNTAIN(lev.typ)) {
        C.dogushforth(0);
        C.SET_FOUNTAIN_WARNED(x, y); /* force dryup */
        C.dryup(x, y, madeby_u);
    } else if (C.IS_SINK(lev.typ)) {
        C.breaksink(x, y);
    } else if (lev.typ == C.DRAWBRIDGE_DOWN
               || (C.is_drawbridge_wall(x, y) >= 0)) {
        const bx = C.coordxyLocal(x), by = C.coordxyLocal(y);

        /* if under the portcullis, the bridge is adjacent */
        C.find_drawbridge(bx, by);
        C.destroy_drawbridge(bx.value, by.value);
    } else {
        return 0;
    }
    return 1;
}


/* When will hole be finished? Very rough indication used by shopkeeper. */
export function holetime()

{
    if (C.go.occupation != dig || !C.loadChar(C.u.ushops))
        return -1;
    return C.intdiv(250 - C.svc.context.digging.effort, 20);
}

/* Return typ of liquid to fill a hole with, or ROOM, if no liquid nearby */
export function fillholetyp(x, y, fill_if_any)
 /* force filling if it exists at all */
{
    x = C.coordxy(x); y = C.coordxy(y); fill_if_any = C.boolean(fill_if_any);
    let x1, y1;
    let lo_x = C.coordxy(C.max(1, x - 1)), hi_x = C.coordxy(C.min(x + 1, C.COLNO - 1)),
            lo_y = C.coordxy(C.max(0, y - 1)), hi_y = C.coordxy(C.min(y + 1, C.ROWNO - 1));
    let pool_cnt = 0, moat_cnt = 0, lava_cnt = 0;

    for (x1 = C.coordxy(lo_x); x1 <= hi_x; x1 = C.coordxy(x1 + 1))
        for (y1 = C.coordxy(lo_y); y1 <= hi_y; y1 = C.coordxy(y1 + 1))
            if (C.is_moat(x1, y1))
                moat_cnt++;
            else if (C.is_pool(x1, y1))
                /* This must come after is_moat since moats are pools
                 * but not vice-versa. */
                pool_cnt++;
            else if (C.is_lava(x1, y1))
                lava_cnt++;

    if (!fill_if_any)
        pool_cnt = C.intdiv(pool_cnt, 3); /* not as much liquid as the others */

    if ((lava_cnt > moat_cnt + pool_cnt && C.rn2(lava_cnt + 1, 628, "fillholetyp"))
        || (lava_cnt && fill_if_any))
        return C.LAVAPOOL;
    else if ((moat_cnt > 0 && C.rn2(moat_cnt + 1, 631, "fillholetyp")) || (moat_cnt && fill_if_any))
        return C.MOAT;
    else if ((pool_cnt > 0 && C.rn2(pool_cnt + 1, 633, "fillholetyp")) || (pool_cnt && fill_if_any))
        return C.POOL;
    else
        return C.ROOM;
}

export function digactualhole(x, y, madeby, ttyp)

{
    x = C.coordxy(x); y = C.coordxy(y); ttyp = C.int(ttyp);
    let oldobjs, newobjs;
    let ttmp;
    let surface_type, tname, in_thru;
    const furniture = C.stackAlloc(C.BUFSZ);
    let lev = C.levl[x][y];
    let mtmp = C.m_at(x, y); /* may be madeby */
    let madeby_u = (C.samePtr(madeby, C.BY_YOU)), madeby_obj = (C.samePtr(madeby, C.BY_OBJECT)),
            /* BY_OBJECT means the hero broke a wand, so blame her for it */
            heros_fault = (madeby_u || madeby_obj);
    let shopdoor, at_u = C.u_at(x, y), wont_fall = C.Levitation || C.Flying;
    let old_typ, old_aligntyp = C.A_NONE;

    if (at_u && C.u.utrap) {
        if (C.u.utraptype == C.TT_BURIEDBALL)
            C.callLocal(buried_ball_to_punishment);
        else if (C.u.utraptype == C.TT_INFLOOR)
            C.reset_utrap(0);
    }

    if (C.callLocal(furniture_handled, x, y, madeby_u))
        return;

    if (ttyp != C.PIT && (!C.Can_dig_down(C.u.uz) && !lev.candig)) {
        C.impossible("digactualhole: can't dig %s on this level.",
                   C.trapname(ttyp, 1));
        ttyp = C.PIT;
    }

    /* maketrap() might change terrain type but we deliver messages after
       that, so prepare in advance */
    old_typ = lev.typ;
    C.storeChar(furniture, '\0');
    if (C.IS_FURNITURE(lev.typ)) {
        /* should mirror the word used by surface() for normal floor */
        surface_type = (C.IS_ROOM(lev.typ) && !C.Is_earthlevel(C.u.uz)
                         ? "floor" : "ground");
        if (C.IS_ALTAR(lev.typ)) {
            old_aligntyp = C.Amask2align(C.levl[x][y].altarmask & C.AM_MASK);
            C.Strcpy(furniture, C.align_str(old_aligntyp));
            C.Strcat(furniture, " ");
        }
        C.Strcat(furniture, C.surface(x, y));
    } else {
        surface_type = C.surface(x, y);
    }
    shopdoor = C.IS_DOOR(lev.typ) && C.loadChar(C.in_rooms(x, y, C.SHOPBASE));
    oldobjs = C.svl.level.objects[x][y];

    ttmp = C.maketrap(x, y, ttyp);
    if (!ttmp)
        return;
    newobjs = C.svl.level.objects[x][y];
    ttmp.madeby_u = heros_fault;
    ttmp.tseen = 0;
    if (C.cansee(x, y))
        C.seetrap(ttmp);
    else if (madeby_u)
        C.feeltrap(ttmp);

    tname = C.trapname(ttyp, 1);
    in_thru = (ttyp == C.HOLE ? "through" : "in");
    if (madeby_u) {
        if (x != C.u.ux || y != C.u.uy)
            C.You("dig an adjacent %s.", tname);
        else
            C.You("dig %s %s the %s.", C.an(tname), in_thru, surface_type);
    } else if (!madeby_obj && C.canseemon(madeby)) {
        C.pline("%s digs %s %s the %s.", C.Monnam(madeby), C.an(tname), in_thru,
              surface_type);
    } else if (C.cansee(x, y) && C.flags.verbose) {
        if (C.IS_STWALL(old_typ))
            C.pline_The("%s crumbles into %s.", surface_type, C.an(tname));
        else
            C.pline("%s appears in the %s.", C.An(tname), surface_type);
    }
    if (C.IS_FURNITURE(old_typ) && C.cansee(x, y))
        C.pline_The("%s falls into the %s!", furniture, tname);
    /* wrath should immediately follow altar destruction message */
    if (heros_fault && old_typ == C.ALTAR)
        C.desecrate_altar(0, old_aligntyp);

    /* now deal with actual post-trap creation effects */
    if (ttyp == C.PIT) {
        if (shopdoor && heros_fault)
            C.pay_for_damage("ruin", 0);
        else
            C.add_damage(x, y, heros_fault ? C.SHOP_PIT_COST : 0n);
        if (madeby_u)
            C.wake_nearby(0);
        /* in case we're digging down while encased in solid rock
           which is blocking levitation or flight */
        C.switch_terrain();
        if (C.Levitation || C.Flying)
            wont_fall = 1;

        if (at_u) {
            if (!wont_fall) {
                C.set_utrap(C.rn1(4, 2, 739, "digactualhole"), C.TT_PIT);
                C.gv.vision_full_recalc = 1; /* vision limits change */
            } else
                C.reset_utrap(1);
            if (!C.samePtr(oldobjs, newobjs)) /* something unearthed */
                C.pickup(1);   /* detects pit */
        } else if (mtmp) {
            if (C.is_flyer(mtmp.data) || C.is_floater(mtmp.data)) {
                if (C.canseemon(mtmp))
                    C.pline("%s %s over the pit.", C.Monnam(mtmp),
                          (C.is_flyer(mtmp.data)) ? "flies" : "floats");
            } else if (!C.samePtr(mtmp, madeby))
                C.mintrap(mtmp, C.NO_TRAP_FLAGS);
        }
    } else { /* was TRAPDOOR now a HOLE*/
        if (at_u) {
            /* in case we're digging down while encased in solid rock
               which is blocking levitation or flight */
            C.switch_terrain();
            if (C.Levitation || C.Flying)
                wont_fall = 1;

            /* check for leashed pet that can't fall right now */
            if (!C.u.ustuck && !wont_fall && !C.next_to_u()) {
                C.You("are jerked back by your pet!");
                wont_fall = 1;
            }

            /* Floor objects get a chance of falling down.  The case where
             * the hero does NOT fall down is treated here.  The case
             * where the hero does fall down is treated in goto_level().
             */
            if (C.u.ustuck || wont_fall) {
                if (newobjs)
                    C.impact_drop(0, x, y, 0);
                if (!C.samePtr(oldobjs, newobjs))
                    C.pickup(1);
                if (shopdoor && heros_fault)
                    C.pay_for_damage("ruin", 0);
            } else {
                const newlevel = C.levelLocal();

                if (C.loadChar(C.u.ushops) && heros_fault)
                    C.shopdig(1); /* shk might snatch pack */
                else /* handle any earlier hero-caused damage */
                    C.pay_for_damage("dig into", 1);
                C.You("fall through...");
                /* Earlier checks must ensure that the destination
                 * level exists and is in the present dungeon.
                 */
                newlevel.dnum = C.u.uz.dnum;
                newlevel.dlevel = C.u.uz.dlevel + 1;
                C.goto_level(newlevel, 0, 1, 0);
                /* messages for arriving in special rooms */
                C.spoteffects(0);
            }
        } else {
            if (shopdoor && heros_fault)
                C.pay_for_damage("ruin", 0);
            if (newobjs)
                C.impact_drop(0, x, y, 0);
            if (mtmp) {
                /*[don't we need special sokoban handling here?]*/
                if (!C.grounded(mtmp.data)
                    || (mtmp.wormno && C.count_wsegs(mtmp) > 5)
                    || mtmp.data.msize >= C.MZ_HUGE)
                    return;
                if (C.samePtr(mtmp, C.u.ustuck)) /* probably a vortex */
                    return;           /* temporary? kludge */

                if (C.teleport_pet(mtmp, 0)) {
                    const tolevel = C.levelLocal();

                    if (C.Is_stronghold(C.u.uz)) {
                        C.assign_level(tolevel, C.valley_level);
                    } else if (C.Is_botlevel(C.u.uz)) {
                        if (C.canseemon(mtmp))
                            C.pline("%s avoids the trap.", C.Monnam(mtmp));
                        return;
                    } else {
                        C.get_level(tolevel, C.depth(C.u.uz) + 1);
                    }
                    if (mtmp.isshk)
                        C.make_angry_shk(mtmp, 0, 0);
                    C.migrate_to_level(mtmp, C.ledger_no(tolevel),
                                     C.MIGR_RANDOM, 0);
                }
            }
        }
    }
}


/*
 * Called from dighole(); also from do_break_wand() in apply.c
 * and do_earthquake() in music.c.
 */
export function liquid_flow(x, y, typ, ttmp, fillmsg)

{
    x = C.coordxy(x); y = C.coordxy(y); typ = C.char(typ);
    let objchain;
    let mon;
    let u_spot = C.u_at(x, y);

    /* caller should have changed levl[x][y].typ to POOL, MOAT, or LAVA */
    if (!C.is_pool_or_lava(x, y)) {
        if (C.iflags.sanity_check) {
            C.impossible("Insane liquid_flow(%d,%d,%s,%s).", x, y,
                       ttmp ? C.trapname(ttmp.ttyp, 1) : "no trap",
                       fillmsg ? fillmsg : "no mesg");
        }
        return;
    }

    if (ttmp)
        C.delfloortrap(ttmp); /* will untrap monster if one is here */
    /* if any objects were frozen here, they're released now */
    C.obj_ice_effects(x, y, 1);
    C.callLocal(unearth_objs, x, y);

    if (fillmsg)
        C.pline(fillmsg, C.hliquid(typ == C.LAVAPOOL ? "lava" : "water"));
    /* handle object damage before hero damage; affects potential bones */
    if ((objchain = C.svl.level.objects[x][y]) != 0) {
        if (typ == C.LAVAPOOL)
            C.fire_damage_chain(objchain, 1, 1, x, y);
        else
            C.water_damage_chain(objchain, 1);
    }
    /* damage to the hero */
    if (u_spot) {
        C.pooleffects(0);
    } else if ((mon = C.m_at(x, y)) != 0) {
        C.minliquid(mon);
    }
}


/* return TRUE if digging succeeded, FALSE otherwise */
export function dighole(pit_only, by_magic, cc)

{
    pit_only = C.boolean(pit_only); by_magic = C.boolean(by_magic);
    let ttmp;
    let lev;
    let boulder_here;
    let typ, old_typ;
    let dig_x, dig_y;
    let nohole, retval = 0;
    let dig_check_result;

    if (!cc) {
        dig_x = C.coordxy(C.u.ux);
        dig_y = C.coordxy(C.u.uy);
    } else {
        dig_x = C.coordxy(cc.x);
        dig_y = C.coordxy(cc.y);
        if (!C.isok(dig_x, dig_y))
            return 0;
    }

    ttmp = C.t_at(dig_x, dig_y);
    lev = C.levl[dig_x][dig_y];
    dig_check_result = dig_check(C.BY_YOU, dig_x, dig_y);
    /* nohole = (!Can_dig_down(&u.uz) && !lev->candig); */
    nohole = (dig_check_result == C.DIGCHECK_FAIL_CANTDIG
                  || dig_check_result == C.DIGCHECK_FAIL_TOOHARD);
    old_typ = lev.typ;

    if ((ttmp && (C.undestroyable_trap(ttmp.ttyp) || nohole))
        || (C.IS_OBSTRUCTED(old_typ) && old_typ != C.SDOOR
            && (lev.wall_info & C.W_NONDIGGABLE) != 0)) {
        C.pline_The("%s %shere is too hard to dig in.", C.surface(dig_x, dig_y),
                  (dig_x != C.u.ux || dig_y != C.u.uy) ? "t" : "");
    } else if (ttmp && C.is_magical_trap(ttmp.ttyp)) {
        C.explode(dig_x, dig_y, 0, 20 + C.d(3, 6, 919, "dighole"), C.TRAP_EXPLODE, C.EXPL_MAGICAL);
        C.deltrap(ttmp);
        C.newsym(dig_x, dig_y);
    } else if (C.is_pool_or_lava(dig_x, dig_y)) {
        C.pline_The("%s sloshes furiously for a moment, then subsides.",
                  C.hliquid(C.is_lava(dig_x, dig_y) ? "lava" : "water"));
        C.wake_nearby(0); /* splashing */

    } else if (old_typ == C.DRAWBRIDGE_DOWN
               || (C.is_drawbridge_wall(dig_x, dig_y) >= 0)) {
        /* drawbridge_down is the platform crossing the moat when the
           bridge is extended; drawbridge_wall is the open "doorway" or
           closed "door" where the portcullis/mechanism is located */
        if (pit_only) {
            C.pline_The("drawbridge seems too hard to dig through.");
        } else {
            const x = C.coordxyLocal(dig_x), y = C.coordxyLocal(dig_y);
            /* if under the portcullis, the bridge is adjacent */
            C.find_drawbridge(x, y);
            C.destroy_drawbridge(x.value, y.value);
            retval = 1;
        }

    } else if ((boulder_here = C.sobj_at(C.BOULDER, dig_x, dig_y)) != 0) {
        if (ttmp && C.is_pit(ttmp.ttyp)
            && C.rn2(2, 944, "dighole")) {
            C.pline_The("boulder settles into the %spit.",
                      (dig_x != C.u.ux || dig_y != C.u.uy) ? "adjacent " : "");
            ttmp.ttyp = C.PIT; /* crush spikes */
        } else {
            /*
             * digging makes a hole, but the boulder immediately
             * fills it.  Final outcome:  no hole, no boulder.
             */
            
            C.pline("KADOOM!  The boulder falls in!");
            C.wake_nearby(0);
            C.delfloortrap(ttmp);
        }
        C.delobj(boulder_here);
    } else if (C.IS_GRAVE(old_typ)) {
        C.callLocal(digactualhole, dig_x, dig_y, C.BY_YOU, C.PIT);
        dig_up_grave(cc);
        retval = 1;
    } else if (old_typ == C.DRAWBRIDGE_UP) {
        /* must be floor or ice, other cases handled above */
        /* dig "pit" and let fluid flow in (if possible) */
        typ = fillholetyp(dig_x, dig_y, 0);

        if (typ == C.ROOM) {
            /*
             * We can't dig a hole here since that will destroy
             * the drawbridge.  The following is a cop-out. --dlc
             */
            C.pline_The("%s %shere is too hard to dig in.",
                      C.surface(dig_x, dig_y),
                      (dig_x != C.u.ux || dig_y != C.u.uy) ? "t" : "");
        } else {
            lev.drawbridgemask &= ~C.DB_UNDER;
            lev.drawbridgemask |= (typ == C.LAVAPOOL) ? C.DB_LAVA : C.DB_MOAT;
            liquid_flow(dig_x, dig_y, typ, ttmp,
                        "As you dig, the hole fills with %s!");
            retval = 1;
        }

    /* the following two are here for the wand of digging */
    } else if (C.IS_THRONE(old_typ)) {
        C.pline_The("throne is too hard to break apart.");

    } else if (C.IS_ALTAR(old_typ)) {
        C.pline_The("altar is too hard to break apart.");

    } else {
        typ = fillholetyp(dig_x, dig_y, 0);

        lev.flags = 0;
        if (typ != C.ROOM) {
            if (!C.callLocal(furniture_handled, C.int(dig_x), C.int(dig_y), 1)) {
                lev.typ = typ;
                liquid_flow(dig_x, dig_y, typ, ttmp,
                            "As you dig, the hole fills with %s!");
            }
            retval = 1;
        } else {
            /* magical digging disarms settable traps */
            if (by_magic && ttmp
                && (ttmp.ttyp == C.LANDMINE || ttmp.ttyp == C.BEAR_TRAP)) {
                let otyp = (ttmp.ttyp == C.LANDMINE) ? C.LAND_MINE : C.BEARTRAP;

                /* convert trap into buried object (deletes trap) */
                C.cnv_trap_obj(otyp, 1, ttmp, 1);
            }

            /* finally we get to make a hole */
            if (nohole || pit_only
                || dig_check_result == C.DIGCHECK_PASSED_DESTROY_TRAP
                || dig_check_result == C.DIGCHECK_PASSED_PITONLY)
                C.callLocal(digactualhole, dig_x, dig_y, C.BY_YOU, C.PIT);
            else
                C.callLocal(digactualhole, dig_x, dig_y, C.BY_YOU, C.HOLE);
            retval = 1;
        }
    }
    C.spot_checks(dig_x, dig_y, old_typ);
    return retval;
}

export function dig_up_grave(cc)

{
    let otmp;
    let what_happens;
    let dig_x, dig_y;

    if (!cc) {
        dig_x = C.coordxy(C.u.ux);
        dig_y = C.coordxy(C.u.uy);
    } else {
        dig_x = C.coordxy(cc.x);
        dig_y = C.coordxy(cc.y);
        if (!C.isok(dig_x, dig_y))
            return;
    }

    /* Grave-robbing is frowned upon... */
    C.exercise(C.A_WIS, 0);
    if (C.Role_if(C.PM_ARCHEOLOGIST)) {
        C.adjalign(-C.sgn(C.u.ualign.type) * 3);
        C.You_feel("like a despicable grave-robber!");
    } else if (C.Role_if(C.PM_SAMURAI)) {
        C.adjalign(-C.sgn(C.u.ualign.type));
        C.You("disturb the honorable dead!");
    } else if (C.u.ualign.type == C.A_LAWFUL) {
        if (C.u.ualign.record > -10)
            C.adjalign(-1);
        C.You("have violated the sanctity of this grave!");
    }

    /* -1: force default case for empty grave */
    what_happens = C.levl[dig_x][dig_y].emptygrave ? -1 : C.rn2(5, 1058, "dig_up_grave");
    switch (what_happens) {
    case 0:
    case 1:
        C.You("unearth a corpse.");
        if ((otmp = C.mk_tt_object(C.CORPSE, dig_x, dig_y)) != 0)
            otmp.age = C.long(otmp.age - BigInt(C.int(C.TAINT_AGE + 1))); /* this is an *OLD* corpse */
        break;
    case 2:
        if (!C.Blind)
            C.pline("%s!", C.Hallucination ? "Dude!  The living dead"
                                       : "The grave's owner is very upset");
        C.makemon(C.mkclass(C.S_ZOMBIE, 0), dig_x, dig_y, C.MM_NOMSG);
        break;
    case 3:
        if (!C.Blind)
            C.pline("%s!", C.Hallucination ? "I want my mummy"
                                       : "You've disturbed a tomb");
        C.makemon(C.mkclass(C.S_MUMMY, 0), dig_x, dig_y, C.MM_NOMSG);
        break;
    default:
        /* No corpse */
        C.pline_The("grave is unoccupied.  Strange...");
        break;
    }
    C.levl[dig_x][dig_y].typ = C.ROOM;
    C.levl[dig_x][dig_y].emptygrave = 0; /* clear 'flags' */
    C.levl[dig_x][dig_y].disturbed = 0; /* clear 'horizontal' */
    C.del_engr_at(dig_x, dig_y);
    C.newsym(dig_x, dig_y);
    return;
}

export function use_pick_axe(obj)

{
    let verb;
    let dsp; const dirsyms = C.stackAlloc(12), qbuf = C.stackAlloc(C.BUFSZ);
    let ispick;
    let rx, ry, downok, res = C.ECMD_OK;
    let dir;

    /* Check tool */
    if (!C.samePtr(obj, C.uwep)) {
        if (C.wield_tool(obj, "swing")) {
            /* we're now wielding it. next turn, apply to dig. */
            C.cmdq_add_ec(C.CQ_CANNED, C.doapply);
            C.cmdq_add_key(C.CQ_CANNED, obj.invlet);
            return C.ECMD_TIME;
        }
        return C.ECMD_OK;
    }
    ispick = C.is_pick(obj);
    verb = ispick ? "dig" : "chop";

    if (C.u.utrap && C.u.utraptype == C.TT_WEB) {
        C.pline("%s you can't %s while entangled in a web.",
              /* res==0 => no prior message;
                 res==1 => just got "You now wield a pick-axe." message */
              !res ? "Unfortunately," : "But", verb);
        return res;
    }

    /* construct list of directions to show player for likely choices */
    downok = !!C.can_reach_floor(0);
    dsp = dirsyms;
    for (dir = 0; dir < C.N_DIRS_Z; dir++) {
        let dirch = C.cmd_from_dir(dir, C.MV_WALK);

        /* filter out useless directions */
        if (C.u.uswallow) {
            ; /* all directions are viable when swallowed */
        } else if (C.movecmd(dirch, C.MV_WALK)) {
            /* normal direction, within plane of the level map */
            if (!C.dxdy_moveok())
                continue; /* handle NODIAG */
            rx = C.u.ux + C.u.dx;
            ry = C.u.uy + C.u.dy;
            if (!C.isok(rx, ry) || dig_typ(obj, rx, ry) == DIGTYP_UNDIGGABLE)
                continue;
        } else {
            /* up or down; we used to always include down, so that
               there would always be at least one choice shown, but
               it shouldn't be a likely candidate when floating high
               above the floor; include up instead in that situation
               (as a silly candidate rather than a likely one...) */
            if ((C.u.dz > 0) ^ downok)
                continue;
        }
        /* include this direction */
        C.storeChar(dsp++, dirch);
    }
    C.storeChar(dsp, 0);
    C.Sprintf(qbuf, "In what direction do you want to %s? [%s]", verb, dirsyms);
    if (!C.getdir(qbuf))
        return (res|C.ECMD_CANCEL);

    return C.callLocal(use_pick_axe2, obj);
}

/* MRKR: use_pick_axe() is split in two to allow autodig to bypass */
/*       the "In what direction do you want to dig?" query.        */
/*       use_pick_axe2() uses the existing u.dx, u.dy and u.dz    */
export function use_pick_axe2(obj)

{
    let rx, ry;
    let lev;
    let trap, trap_with_u;
    let dig_target;
    let ispick = C.is_pick(obj);
    let verbing = ispick ? "digging" : "chopping";

    if (C.u.uswallow && C.do_attack(C.u.ustuck)) {
        ; /* return 1 */
    } else if (C.Underwater) {
        C.pline("Turbulence torpedoes your %s attempts.", verbing);
    } else if (C.u.dz < 0) {
        if (C.Levitation)
            C.You("don't have enough leverage.");
        else
            C.You_cant("reach the %s.", C.ceiling(C.u.ux, C.u.uy));
    } else if (!C.u.dx && !C.u.dy && !C.u.dz) {
        const buf = C.stackAlloc(C.BUFSZ);
        let dam;

        dam = C.rnd(2, 1184, "use_pick_axe2") + C.dbon() + obj.spe;
        if (dam <= 0)
            dam = 1;
        C.You("hit yourself with %s.", C.yname(C.uwep));
        C.Sprintf(buf, "%s own %s", C.uhis(), C.OBJ_NAME(C.objects[obj.otyp]));
        C.losehp(C.Maybe_Half_Phys(dam), buf, C.KILLED_BY);
        C.disp.botl = 1;
        return C.ECMD_TIME;
    } else if (C.u.dz == 0) {
        C.confdir(0);
        rx = C.coordxy(C.u.ux + C.u.dx);
        ry = C.coordxy(C.u.uy + C.u.dy);
        if (!C.isok(rx, ry)) {
            
            C.pline("Clash!");
            return C.ECMD_TIME;
        }
        lev = C.levl[rx][ry];
        if (C.MON_AT(rx, ry) && C.do_attack(C.m_at(rx, ry)))
            return C.ECMD_TIME;
        dig_target = dig_typ(obj, rx, ry);
        if (dig_target == DIGTYP_UNDIGGABLE) {
            let boulder;

            /* ACCESSIBLE or POOL */
            trap = C.t_at(rx, ry);
            if (trap && trap.ttyp == C.WEB) {
                if (!trap.tseen) {
                    C.seetrap(trap);
                    C.There("is a spider web there!");
                }
                C.pline("%s entangled in the web.", C.Yobjnam2(obj, "become"));
                /* you ought to be able to let go; tough luck */
                /* (maybe `move_into_trap()' would be better) */
                C.nomul(-C.d(2, 2, 1218, "use_pick_axe2"));
                C.gm.multi_reason = "stuck in a spider web";
                C.gn.nomovemsg = "You pull free.";
            } else if (lev.typ == C.IRONBARS) {
                C.pline("Clang!");
                C.wake_nearby(0);
            } else if (C.IS_WATERWALL(lev.typ)) {
                C.pline("Splash!");
            } else if (lev.typ == C.LAVAWALL) {
                C.pline("Splash!");
                C.fire_damage(C.uwep, 0, rx, ry);
            } else if (C.IS_TREE(lev.typ)) {
                C.You("need an axe to cut down a tree.");
            } else if (C.IS_OBSTRUCTED(lev.typ)) {
                C.You("need a pick to dig rock.");
            } else if ((boulder = C.sobj_at(C.BOULDER, rx, ry)) != 0
                       || C.sobj_at(C.STATUE, rx, ry)) {
                /* if both boulders and statues are present, the topmost
                   boulder will be shown on the map so treat it as target */
                let what = boulder ? "boulder" : "statue";

                if (!ispick) {
                    let vibrate = !C.rn2(3, 1240, "use_pick_axe2");

                    C.pline("Sparks fly as you whack the %s.%s", what,
                          vibrate ? "  The axe-handle vibrates violently!"
                                  : "");
                    if (vibrate)
                        C.losehp(C.Maybe_Half_Phys(2), "axing a hard object",
                               C.KILLED_BY);
                    C.wake_nearby(0);
                } else {
                    /* using a pick but dig_target is DIGTYPE_UNDIGGABLE
                       and there is at least one boulder or statue or both
                       present; pick_can_reach() returned false */
                    C.You_cant("reach the %s.", what);
                }
            } else if (C.u.utrap && C.u.utraptype == C.TT_PIT && trap
                       && (trap_with_u = C.t_at(C.u.ux, C.u.uy))
                       && C.is_pit(trap.ttyp)
                       && !C.conjoined_pits(trap, trap_with_u, 0)) {
                let idx = C.xytodir(C.u.dx, C.u.dy);

                if (idx != C.DIR_ERR) {
                    let adjidx = C.DIR_180(idx);

                    trap_with_u.conjoined |= (1 << idx);
                    trap.conjoined |= (1 << adjidx);
                    C.You("clear some debris from between the pits.");
                }
            } else if (C.u.utrap && C.u.utraptype == C.TT_PIT
                       && (trap_with_u = C.t_at(C.u.ux, C.u.uy)) != 0) {
                C.You("swing %s, but the rubble has no place to go.",
                    C.yobjnam(obj, 0));
            } else {
                C.You("swing %s through thin air.", C.yobjnam(obj, 0));
            }
        } else {
            const d_action = [ "swinging", "digging",
                                                     "chipping the statue",
                                                     "hitting the boulder",
                                                     "chopping at the door",
                                                     "cutting the tree" ];

            C.gd.did_dig_msg = 0;
            C.svc.context.digging.quiet = 0;
            if (C.svc.context.digging.pos.x != rx
                || C.svc.context.digging.pos.y != ry
                || !C.on_level(C.svc.context.digging.level, C.u.uz)
                || C.svc.context.digging.down) {
                if (C.flags.autodig && dig_target == DIGTYP_ROCK
                    && !C.svc.context.digging.down
                    && C.u_at(C.svc.context.digging.pos.x,
                            C.svc.context.digging.pos.y)
                    && (C.svm.moves <= C.long(C.svc.context.digging.lastdigtime + 2n)
                        && C.svm.moves >= C.svc.context.digging.lastdigtime)) {
                    /* avoid messages if repeated autodigging */
                    C.gd.did_dig_msg = 1;
                    C.svc.context.digging.quiet = 1;
                }
                C.svc.context.digging.down = C.svc.context.digging.chew = 0;
                C.svc.context.digging.warned = 0;
                C.svc.context.digging.pos.x = rx;
                C.svc.context.digging.pos.y = ry;
                C.assign_level(C.svc.context.digging.level, C.u.uz);
                C.svc.context.digging.effort = 0;
                if (!C.svc.context.digging.quiet)
                    C.You("start %s.", d_action[dig_target]);
            } else {
                C.You("%s %s.", C.svc.context.digging.chew ? "begin" : "continue",
                    d_action[dig_target]);
                C.svc.context.digging.chew = 0;
            }
            C.set_occupation(dig, verbing, 0);
        }
    } else if (C.Is_airlevel(C.u.uz) || C.Is_waterlevel(C.u.uz)) {
        /* it must be air -- water checked above */
        C.You("swing %s through thin air.", C.yobjnam(obj, 0));
    } else if (!C.can_reach_floor(0)) {
        C.cant_reach_floor(C.u.ux, C.u.uy, 0, 0, 0);
    } else if (C.is_pool_or_lava(C.u.ux, C.u.uy)) {
        /* Monsters which swim also happen not to be able to dig */
        C.You("cannot stay under%s long enough.",
            C.is_pool(C.u.ux, C.u.uy) ? "water" : " the lava");
    } else if ((trap = C.t_at(C.u.ux, C.u.uy)) != 0
               && (C.uteetering_at_seen_pit(trap) || C.uescaped_shaft(trap))) {
        C.dotrap(trap, C.FORCEBUNGLE);
        /* might escape trap and still be teetering at brink */
        if (!C.u.utrap)
            C.cant_reach_floor(C.u.ux, C.u.uy, 0, 1, 0);
    } else if (!ispick
               /* can only dig down with an axe when doing so will
                  trigger or disarm a trap here */
               && (!trap || (trap.ttyp != C.LANDMINE
                             && trap.ttyp != C.BEAR_TRAP))) {
        C.pline("%s merely scratches the %s.", C.Yobjnam2(obj, 0),
              C.surface(C.u.ux, C.u.uy));
        C.u_wipe_engr(3);
    } else {
        if (C.svc.context.digging.pos.x != C.u.ux
            || C.svc.context.digging.pos.y != C.u.uy
            || !C.on_level(C.svc.context.digging.level, C.u.uz)
            || !C.svc.context.digging.down) {
            C.svc.context.digging.chew = 0;
            C.svc.context.digging.down = 1;
            C.svc.context.digging.warned = 0;
            C.svc.context.digging.pos.x = C.u.ux;
            C.svc.context.digging.pos.y = C.u.uy;
            C.assign_level(C.svc.context.digging.level, C.u.uz);
            C.svc.context.digging.effort = 0;
            C.You("start %s downward.", verbing);
            if (C.loadChar(C.u.ushops)) {
                C.shopdig(0);
                C.add_damage(C.u.ux, C.u.uy, C.SHOP_PIT_COST);
            }
        } else
            C.You("continue %s downward.", verbing);
        C.gd.did_dig_msg = 0;
        C.set_occupation(dig, verbing, 0);
    }
    return C.ECMD_TIME;
}

export function watchman_canseeu(mtmp)

{
    if (C.is_watch(mtmp.data) && mtmp.mcansee && C.m_canseeu(mtmp)
        && mtmp.mpeaceful)
        return 1;
    return 0;
}

/*
 * Town Watchmen frown on damage to the town walls, trees or fountains.
 * It's OK to dig holes in the ground, however.
 * If mtmp is assumed to be a watchman, a watchman is found if mtmp == 0
 * zap == TRUE if wand/spell of digging, FALSE otherwise (chewing)
 */
export function watch_dig(mtmp, x, y, zap)

{
    x = C.coordxy(x); y = C.coordxy(y); zap = C.boolean(zap);
    let lev = C.levl[x][y];

    if (C.in_town(x, y)
        && (C.closed_door(x, y) || lev.typ == C.SDOOR || C.IS_WALL(lev.typ)
            || C.IS_FOUNTAIN(lev.typ) || C.IS_TREE(lev.typ))) {
        if (!mtmp)
            mtmp = C.get_iter_mons(watchman_canseeu);

        if (mtmp) {
            
            if (zap || C.svc.context.digging.warned) {
                C.verbalize("Halt, vandal!  You're under arrest!");
                C.angry_guards(!!C.Deaf);
            } else {
                let str;

                if (C.IS_DOOR(lev.typ))
                    str = "door";
                else if (C.IS_TREE(lev.typ))
                    str = "tree";
                else if (C.IS_OBSTRUCTED(lev.typ))
                    str = "wall";
                else
                    str = "fountain";
                C.verbalize("Hey, stop damaging that %s!", str);
                C.svc.context.digging.warned = 1;
            }
            if (is_digging())
                C.stop_occupation();
        }
    }
}

/* Return TRUE if monster died, FALSE otherwise.  Called from m_move(). */
export function mdig_tunnel(mtmp)

{
    let here;
    let sawit, seeit, trapped;
    let pile = C.rnd(12, 1418, "mdig_tunnel");

    here = C.levl[mtmp.mx][mtmp.my];
    if (here.typ == C.SDOOR)
        C.cvt_sdoor_to_door(here); /* ->typ = DOOR */

    /* Eats away door if present & closed or locked */
    if (C.closed_door(mtmp.mx, mtmp.my)) {
        if (C.loadChar(C.in_rooms(mtmp.mx, mtmp.my, C.SHOPBASE)))
            C.add_damage(mtmp.mx, mtmp.my, 0n);
        /* sawit: closed door location is more visible than an open one */
        sawit = C.canseemon(mtmp); /* before door state change and unblock_pt */
        trapped = (here.doormask & C.D_TRAPPED) ? 1 : 0;
        here.doormask = trapped ? C.D_NODOOR : C.D_BROKEN;
        C.recalc_block_point(mtmp.mx, mtmp.my); /* vision */
        C.newsym(mtmp.mx, mtmp.my);
        if (trapped) {
            seeit = C.canseemon(mtmp);
            if (C.mb_trapped(mtmp, sawit || seeit)) { /* mtmp is killed */
                C.newsym(mtmp.mx, mtmp.my);
                return 1;
            }
        } else {
            if (C.flags.verbose) {
                if (!C.Unaware && !C.rn2(3, 1442, "mdig_tunnel")) /* not too often.. */
                    draft_message(1); /* "You feel an unexpected draft." */
            }
        }
        return 0;
    } else if (here.typ == C.SCORR) {
        here.typ = C.CORR, here.flags = 0;
        C.unblock_point(mtmp.mx, mtmp.my);
        C.newsym(mtmp.mx, mtmp.my);
        draft_message(0); /* "You feel a draft." */
        return 0;
    } else if (!C.IS_OBSTRUCTED(here.typ) && !C.IS_TREE(here.typ)) { /* no dig */
        return 0;
    }

    /* Only rock, trees, and walls fall through to this point. */
    if ((here.wall_info & C.W_NONDIGGABLE) != 0) {
        C.impossible("mdig_tunnel:  %s at (%d,%d) is undiggable",
                   (C.IS_WALL(here.typ) ? "wall"
                    : C.IS_TREE(here.typ) ? "tree" : "stone"),
                   C.int(mtmp.mx), C.int(mtmp.my));
        return 0; /* still alive */
    }

    if (C.IS_WALL(here.typ)) {
        /* KMH -- Okay on arboreal levels (room walls are still stone) */
        if (C.flags.verbose && !C.rn2(5, 1468, "mdig_tunnel")) {
            
            C.You_hear("crashing rock.");
        }
        if (C.loadChar(C.in_rooms(mtmp.mx, mtmp.my, C.SHOPBASE)))
            C.add_damage(mtmp.mx, mtmp.my, 0n);
        if (C.svl.level.flags.is_maze_lev) {
            here.typ = C.ROOM, here.flags = 0;
        } else if (C.svl.level.flags.is_cavernous_lev
                   && !C.in_town(mtmp.mx, mtmp.my)) {
            here.typ = C.CORR, here.flags = 0;
        } else {
            here.typ = C.DOOR, here.doormask = C.D_NODOOR;
        }
    } else if (C.IS_TREE(here.typ)) {
        here.typ = C.ROOM, here.flags = 0;
        if (pile && pile < 5)
            C.rnd_treefruit_at(mtmp.mx, mtmp.my);
    } else {
        here.typ = C.CORR, here.flags = 0;
        if (pile && pile < 5)
            C.mksobj_at((pile == 1) ? C.BOULDER : C.ROCK, mtmp.mx, mtmp.my,
                             1, 0);
    }
    C.newsym(mtmp.mx, mtmp.my);
    if (!C.sobj_at(C.BOULDER, mtmp.mx, mtmp.my))
        C.unblock_point(mtmp.mx, mtmp.my); /* vision */

    return 0;
}


/* draft refers to air currents, but can be a pun on "draft" as conscription
   for military service (probably not a good pun if it has to be explained) */
export const STRIDENT = 4; /* from pray.c */

export function draft_message(unexpected)

{
    unexpected = C.boolean(unexpected);
    /*
     * [Bug or TODO?  Have caller pass coordinates and use the travel
     * mechanism to determine whether there is a path between
     * destroyed door (or exposed secret corridor) and hero's location.
     * When there is no such path, no draft should be felt.]
     */

    if (unexpected) {
        if (!C.Hallucination)
            C.You_feel("an unexpected draft.");
        else
            /* U.S. classification system uses 1-A for eligible to serve
               and 4-F for ineligible due to physical or mental defect;
               some intermediate values exist but are rarely seen */
            C.You_feel("like you are %s.",
                     (C.ACURR(C.A_STR) < 6 || C.ACURR(C.A_DEX) < 6
                      || C.ACURR(C.A_CON) < 6 || C.ACURR(C.A_CHA) < 6
                      || C.ACURR(C.A_INT) < 6 || C.ACURR(C.A_WIS) < 6) ? "4-F"
                                                               : "1-A");
    } else {
        if (!C.Hallucination) {
            C.You_feel("a draft.");
        } else {
            /* "marching" is deliberately ambiguous; it might mean drills
                after entering military service or mean engaging in protests */
            const draft_reaction = [
                "enlisting", "marching", "protesting", "fleeing",
            ];
            let dridx;

            /* Lawful: 0..1, Neutral: 1..2, Chaotic: 2..3 */
            dridx = C.rn1(2, 1 - C.sgn(C.u.ualign.type), 1537, "draft_message");
            if (C.u.ualign.record < STRIDENT)
                /* L: +(0..2), N: +(-1..1), C: +(-2..0); all: 0..3 */
                dridx += C.rn1(3, C.sgn(C.u.ualign.type) - 1, 1540, "draft_message");
            C.You_feel("like %s.", draft_reaction[dridx]);
        }
    }
}

/* digging via wand zap or spell cast */
export function zap_dig()

{
    let room;
    let mtmp;
    let otmp;
    let trap_with_u = 0;
    let zx, zy, flow_x = C.coordxy(-1), flow_y = C.coordxy(-1);
    let diridx = 8, digdepth;
    let shopdoor, shopwall, maze_dig, pitdig = 0, pitflow = 0;

    /*
     * Original effect (approximately):
     * from CORR: dig until we pierce a wall
     * from ROOM: pierce wall and dig until we reach
     * an ACCESSIBLE place.
     * Currently: dig for digdepth positions;
     * also down on request of Lennart Augustsson.
     * 3.6.0: from a PIT: dig one adjacent pit.
     */

    if (C.u.uswallow) {
        mtmp = C.u.ustuck;

        if (!C.is_whirly(mtmp.data)) {
            if (C.digests(mtmp.data))
                C.You("pierce %s %s wall!", C.s_suffix(C.mon_nam(mtmp)),
                    C.mbodypart(mtmp, C.STOMACH));
            if (C.unique_corpstat(mtmp.data))
                mtmp.mhp = C.intdiv(mtmp.mhp + 1, 2);
            else
                mtmp.mhp = 1; /* almost dead */
            C.expels(mtmp, mtmp.data, !C.digests(mtmp.data));
        }
        return;
    } /* swallowed */

    if (C.u.dz) {
        if (!C.Is_airlevel(C.u.uz) && !C.Is_waterlevel(C.u.uz) && !C.Underwater) {
            if (C.u.dz < 0 || C.On_stairs(C.u.ux, C.u.uy)) {
                let dmg;
                if (C.On_stairs(C.u.ux, C.u.uy)) {
                    let stway = C.stairway_at(C.u.ux, C.u.uy);
                    C.pline_The("beam bounces off the %s and hits the %s.",
                              stway.isladder ? "ladder" : "stairs",
                              C.ceiling(C.u.ux, C.u.uy));
                }
                C.You("loosen a rock from the %s.", C.ceiling(C.u.ux, C.u.uy));
                C.pline("It falls on your %s!", C.body_part(C.HEAD));
                dmg = C.rnd(C.hard_helmet(C.uarmh) ? 2 : 6, 1596, "zap_dig");
                C.losehp(C.Maybe_Half_Phys(dmg), "falling rock", C.KILLED_BY_AN);
                otmp = C.mksobj_at(C.ROCK, C.u.ux, C.u.uy, 0, 0);
                if (otmp) {
                    C.xname(otmp); /* set dknown, maybe bknown */
                    C.stackobj(otmp);
                }
                C.newsym(C.u.ux, C.u.uy);
            } else {
                watch_dig(0, C.u.ux, C.u.uy, 1);
                C.callLocal(dighole, 0, 1, 0);
            }
        }
        return;
    } /* up or down */

    /* normal case: digging across the level */
    shopdoor = shopwall = 0;
    maze_dig = C.svl.level.flags.is_maze_lev && !C.Is_earthlevel(C.u.uz);
    zx = C.coordxy(C.u.ux + C.u.dx);
    zy = C.coordxy(C.u.uy + C.u.dy);
    if (C.u.utrap && C.u.utraptype == C.TT_PIT
        && (trap_with_u = C.t_at(C.u.ux, C.u.uy))) {
        pitdig = 1;
        diridx = C.xytodir(C.u.dx, C.u.dy);
    }
    digdepth = C.rn1(18, 8, 1622, "zap_dig");
    C.tmp_at(C.DISP_BEAM, C.cmap_to_glyph(C.S_digbeam));
    while (--digdepth >= 0) {
        if (!C.isok(zx, zy))
            break;
        room = C.levl[zx][zy];
        C.tmp_at(zx, zy);
        C.nh_delay_output(); /* wait a little bit */

        if (pitdig) { /* we are already in a pit if this is true */
            const cc = C.coordLocal();
            let adjpit = C.t_at(zx, zy);

            if (diridx != C.DIR_ERR
                && !C.conjoined_pits(adjpit, trap_with_u, 0)) {
                digdepth = 0; /* limited to the adjacent location only */
                C.nhUse(digdepth);
                if (!(adjpit && C.is_pit(adjpit.ttyp))) {
                    const buf = C.stackAlloc(C.BUFSZ);

                    cc.x = zx;
                    cc.y = zy;
                    if (!adj_pit_checks(cc, buf)) {
                        if (C.loadChar(buf))
                            C.pline1(buf);
                    } else {
                        /* this can also result in a pool at zx,zy */
                        C.callLocal(dighole, 1, 1, cc);
                        adjpit = C.t_at(zx, zy);
                    }
                }
                if (adjpit && C.is_pit(adjpit.ttyp)) {
                    let adjidx = C.DIR_180(diridx);

                    trap_with_u.conjoined |= (1 << diridx);
                    adjpit.conjoined |= (1 << adjidx);
                    flow_x = C.coordxy(zx);
                    flow_y = C.coordxy(zy);
                    pitflow = 1;
                }
                if (C.is_pool(zx, zy) || C.is_lava(zx, zy)) {
                    flow_x = C.coordxy(zx - C.u.dx);
                    flow_y = C.coordxy(zy - C.u.dy);
                    pitflow = 1;
                }
                break;
            }
        } else if (C.closed_door(zx, zy) || room.typ == C.SDOOR) {
            if (C.loadChar(C.in_rooms(zx, zy, C.SHOPBASE))) {
                C.add_damage(zx, zy, C.SHOP_DOOR_COST);
                shopdoor = 1;
            }
            if (room.typ == C.SDOOR)
                room.typ = C.DOOR; /* doormask set below */
            else if (C.cansee(zx, zy))
                C.pline_The("door is razed!");
            watch_dig(0, zx, zy, 1);
            room.doormask = C.D_NODOOR;
            C.recalc_block_point(zx, zy); /* vision */
            digdepth -= 2;
            if (maze_dig)
                break;
        } else if (maze_dig) {
            if (C.IS_WALL(room.typ)) {
                if (!(room.wall_info & C.W_NONDIGGABLE)) {
                    if (C.loadChar(C.in_rooms(zx, zy, C.SHOPBASE))) {
                        C.add_damage(zx, zy, C.SHOP_WALL_COST);
                        shopwall = 1;
                    }
                    room.typ = C.ROOM, room.flags = 0;
                    C.unblock_point(zx, zy); /* vision */
                } else if (!C.Blind)
                    C.pline_The("wall glows then fades.");
                break;
            } else if (C.IS_TREE(room.typ)) { /* check trees before stone */
                if (!(room.wall_info & C.W_NONDIGGABLE)) {
                    room.typ = C.ROOM, room.flags = 0;
                    C.unblock_point(zx, zy); /* vision */
                } else if (!C.Blind)
                    C.pline_The("tree shudders but is unharmed.");
                break;
            } else if (room.typ == C.STONE || room.typ == C.SCORR) {
                if (!(room.wall_info & C.W_NONDIGGABLE)) {
                    room.typ = C.CORR, room.flags = 0;
                    C.unblock_point(zx, zy); /* vision */
                } else if (!C.Blind)
                    C.pline_The("rock glows then fades.");
                break;
            }
        } else if (C.IS_OBSTRUCTED(room.typ)) {
            if (!C.may_dig(zx, zy))
                break;
            if (C.IS_WALL(room.typ) || room.typ == C.SDOOR) {
                if (C.loadChar(C.in_rooms(zx, zy, C.SHOPBASE))) {
                    C.add_damage(zx, zy, C.SHOP_WALL_COST);
                    shopwall = 1;
                }
                watch_dig(0, zx, zy, 1);
                if (C.svl.level.flags.is_cavernous_lev && !C.in_town(zx, zy)) {
                    room.typ = C.CORR, room.flags = 0;
                } else {
                    room.typ = C.DOOR, room.doormask = C.D_NODOOR;
                }
                digdepth -= 2;
            } else if (C.IS_TREE(room.typ)) {
                room.typ = C.ROOM, room.flags = 0;
                digdepth -= 2;
            } else { /* IS_OBSTRUCTED but not IS_WALL or SDOOR */
                room.typ = C.CORR, room.flags = 0;
                digdepth--;
            }
            C.unblock_point(zx, zy); /* vision */
        }
        zx = C.coordxy(zx + (C.u.dx));
        zy = C.coordxy(zy + (C.u.dy));
    }                    /* while */
    C.tmp_at(C.DISP_END, 0); /* closing call */

    if (pitflow && C.isok(flow_x, flow_y)) {
        let ttmp = C.t_at(flow_x, flow_y);

        if (ttmp && C.is_pit(ttmp.ttyp)) {
            let filltyp = fillholetyp(ttmp.tx, ttmp.ty, 1);

            if (filltyp != C.ROOM)
                C.callLocal(pit_flow, ttmp, filltyp);
        }
    }

    if (shopdoor || shopwall)
        C.pay_for_damage(shopdoor ? "destroy" : "dig into", 0);
    return;
}

/*
 * This checks what is on the surface above the
 * location where an adjacent pit might be created if
 * you're zapping a wand of digging laterally while
 * down in the pit.
 */
export function adj_pit_checks(cc, msg)

{
    let ltyp;
    let room;
    let foundation_msg =
                 "The foundation is too hard to dig through from this angle.";

    if (!cc)
        return 0;
    if (!C.isok(cc.x, cc.y))
        return 0;
    C.storeChar(msg, '\0');
    room = C.levl[cc.x][cc.y];
    ltyp = room.typ, room.flags = 0;

    if (C.is_pool(cc.x, cc.y) || C.is_lava(cc.x, cc.y)) {
        /* this is handled by the caller after we return FALSE */
        return 0;
    } else if (C.closed_door(cc.x, cc.y) || room.typ == C.SDOOR) {
        /* We reject this here because dighole() isn't
           prepared to deal with this case */
        C.Strcpy(msg, foundation_msg);
        return 0;
    } else if (C.IS_WALL(ltyp)) {
        /* if (room->wall_info & W_NONDIGGABLE) */
        C.Strcpy(msg, foundation_msg);
        return 0;
    } else if (C.IS_TREE(ltyp)) { /* check trees before stone */
        /* if (room->wall_info & W_NONDIGGABLE) */
        C.Strcpy(msg, "The tree's roots glow then fade.");
        return 0;
    } else if (ltyp == C.STONE || ltyp == C.SCORR) {
        if (room.wall_info & C.W_NONDIGGABLE) {
            C.Strcpy(msg, "The rock glows then fades.");
            return 0;
        }
    } else if (ltyp == C.IRONBARS) {
        /* "set of iron bars" */
        C.Strcpy(msg, "The bars go much deeper than your pit.");
        return 0;
// #if 0
// #endif
    } else if (C.IS_SINK(ltyp)) {
        C.Strcpy(msg, "A tangled mass of plumbing remains below the sink.");
        return 0;
    } else if (C.On_ladder(cc.x, cc.y)) {
        C.Strcpy(msg, "The ladder is unaffected.");
        return 0;
    } else {
        let supporting = 0;

        if (C.IS_FOUNTAIN(ltyp))
            supporting = "fountain";
        else if (C.IS_THRONE(ltyp))
            supporting = "throne";
        else if (C.IS_ALTAR(ltyp))
            supporting = "altar";
        else if (C.On_stairs(cc.x, cc.y))
            /* staircase up or down. On_ladder handled above. */
            supporting = "stairs";
        else if (ltyp == C.DRAWBRIDGE_DOWN   /* "lowered drawbridge" */
                 || ltyp == C.DBWALL)        /* "raised drawbridge" */
            supporting = "drawbridge";

        if (supporting) {
            C.Sprintf(msg, "The %s supporting structures remain intact.",
                    C.s_suffix(supporting));
            return 0;
        }
    }
    return 1;
}

/*
 * Ensure that all conjoined pits fill up.
 */
export function pit_flow(trap, filltyp)

{
    filltyp = C.char(filltyp);
    /*
     * FIXME?
     *  liquid_flow() -> pooleffects() -> {drown(),lava_effects()}
     *  might kill the hero; the game will end and if that leaves bones,
     *  remaining conjoined pits will be left unprocessed.
     */
    if (trap && filltyp != C.ROOM && C.is_pit(trap.ttyp)) {
        const t = C.trapLocal();
        let idx;

        C.copyStruct(t, trap, C.trapSize);
        C.levl[t.tx][t.ty].typ = filltyp, C.levl[t.tx][t.ty].flags = 0;
        liquid_flow(t.tx, t.ty, filltyp, trap,
                    C.u_at(t.tx, t.ty)
                        ? "Suddenly %s flows in from the adjacent pit!"
                        : 0);
        for (idx = 0; idx < C.N_DIRS; ++idx) {
            if (t.conjoined & (1 << idx)) {
                let x, y;
                let t2;

                x = C.coordxy(t.tx + C.xdir[idx]);
                y = C.coordxy(t.ty + C.ydir[idx]);
                t2 = C.t_at(x, y);
// #if 0
                /* cannot do this back-check; liquid_flow()
                 * called deltrap() which cleaned up the
                 * conjoined fields on both pits.
                 */
// #endif
                /* recursion */
                C.callLocal(pit_flow, t2, filltyp);
            }
        }
    }
}

export function buried_ball(cc)

{
    let odist, bdist = C.COLNO;
    let otmp, ball = 0;

    /* FIXME:
     *  This is just approximate; if multiple buried balls meet the
     *  criterium (within 2 steps of tethered hero's present location)
     *  it will find an arbitrary one rather than the one which used
     *  to be uball.  Once 3.6.{0,1} save file compatibility is broken,
     *  we should add svc.context.buriedball_oid and then we can find the
     *  actual former uball, which might be extra heavy or christened
     *  or not the one buried directly underneath the target spot.
     *
     *  [Why does this search within a radius of two when trapmove()
     *  only lets hero get one step away from the buried ball?]
     */

    /* u.utrap might have already been cleared, in which case the value
       of u.utraptype is no longer meaningful; if u.utrap is still set
       then u.utraptype needs to be for buried ball */
    if (!C.u.utrap || C.u.utraptype == C.TT_BURIEDBALL) {
        for (otmp = C.svl.level.buriedobjlist; otmp; otmp = otmp.nobj) {
            if (otmp.otyp != C.HEAVY_IRON_BALL)
                continue;
            /* if found at the target spot, we're done */
            if (otmp.ox == cc.x && otmp.oy == cc.y)
                return otmp;
            /* find nearest within allowable vicinity: +/-2
             *  4 5 8
             *  1 2 5
             *  0 1 4
             */
            odist = C.dist2(otmp.ox, otmp.oy, cc.x, cc.y);
            if (odist <= 8 && (!ball || odist < bdist)) {
                /* remember nearest buried ball but keep checking others */
                ball = otmp;
                bdist = odist;
            }
        }
    }
    if (ball) {
        /* found, but not at < cc->x, cc->y > */
        cc.x = ball.ox;
        cc.y = ball.oy;
    }
    return ball;
}

export function buried_ball_to_punishment()

{
    const cc = C.coordLocal();
    let ball;

    cc.x = C.u.ux;
    cc.y = C.u.uy;
    ball = buried_ball(cc);
    if (ball) {
        C.obj_extract_self(ball);
// #if 0
        /* rusting buried metallic objects is not implemented yet */
// #endif
        C.punish(ball); /* use ball as flag for unearthed buried ball */
        C.reset_utrap(0);
        C.del_engr_at(cc.x, cc.y);
        C.newsym(cc.x, cc.y);
    }
}

export function buried_ball_to_freedom()

{
    const cc = C.coordLocal();
    let ball;

    cc.x = C.u.ux;
    cc.y = C.u.uy;
    ball = buried_ball(cc);
    if (ball) {
        C.obj_extract_self(ball);
// #if 0
        /* rusting buried metallic objects is not implemented yet */
// #endif
        C.place_object(ball, cc.x, cc.y);
        C.stackobj(ball);
        C.reset_utrap(1);
        C.del_engr_at(cc.x, cc.y);
        C.newsym(cc.x, cc.y);
    }
}

/* move objects from fobj/nexthere lists to buriedobjlist, keeping position
   information */
export function bury_an_obj(otmp, dealloced)

{
    let otmp2;
    let under_ice;

    if (C.debugcore("dig.c", 1)) {
        const save_plnmsg = C.iflags.last_msg;
        C.pline("bury_an_obj: %s", C.xname(otmp));
        C.iflags.last_msg = save_plnmsg;
    }
    if (dealloced)
        dealloced.value = 0;
    if (C.samePtr(otmp, C.uball)) {
        C.unpunish();
        C.set_utrap(C.uint(C.rn1(50, 20, 1994, "bury_an_obj")), C.TT_BURIEDBALL);
        C.pline_The("iron ball gets buried!");
    }
    /* after unpunish(), or might get deallocated chain */
    otmp2 = otmp.nexthere;
    /*
     * obj_resists(,0,0) prevents Rider corpses from being buried.
     * It also prevents The Amulet and invocation tools from being
     * buried.  Since they can't be confined to bags and statues,
     * it makes sense that they can't be buried either, even though
     * the real reason there (direct accessibility when carried) is
     * completely different.
     */
    if (C.samePtr(otmp, C.uchain) || C.obj_resists(otmp, 0, 0))
        return otmp2;

    if (otmp.otyp == C.LEASH && otmp.leashmon != 0)
        C.o_unleash(otmp);

    if (otmp.lamplit && otmp.otyp != C.POT_OIL)
        C.end_burn(otmp, 1);

    C.obj_extract_self(otmp);

    under_ice = C.is_ice(otmp.ox, otmp.oy);
    if ((otmp.otyp == C.ROCK && !under_ice) || otmp.otyp == C.BOULDER) {
        /* merges into burying material; boulder removal is for #wizbury */
        if (dealloced)
            dealloced.value = 1;
        C.obfree(otmp, 0);
        return otmp2;
    }
    /*
     * Start a rot on organic material.  Not corpses -- they
     * are already handled.
     */
    if (otmp.otyp == C.CORPSE) {
        ; /* should cancel timer if under_ice */
    } else if ((under_ice ? (otmp.oclass == C.POTION_CLASS) : C.is_organic(otmp))
               && !C.obj_resists(otmp, 5, 95)) {
        C.start_timer(C.long((under_ice ? 0n : 250n) + C.long(C.rnd(250, 2034, "bury_an_obj"))),
                           C.TIMER_OBJECT, C.ROT_ORGANIC, C.obj_to_any(otmp));
// #if 0
    /* rusting of buried metal not yet implemented */
// #endif
    }
    C.add_to_buried(otmp);
    return  otmp2;
}

export function bury_objs(x, y)

{
    x = C.int(x); y = C.int(y);
    let otmp, otmp2;
    let shkp;
    let loss = 0n;
    let costly;

    costly = ((shkp = C.shop_keeper(C.loadChar(C.in_rooms(x, y, C.SHOPBASE))))
              && C.costly_spot(x, y));

    if (C.svl.level.objects[x][y] != 0) {
        if (C.debugcore("dig.c", 1)) {
        const save_plnmsg = C.iflags.last_msg;
        C.pline("bury_objs: at <%d,%d>", x, y);
        C.iflags.last_msg = save_plnmsg;
    }
    }
    for (otmp = C.svl.level.objects[x][y]; otmp; otmp = otmp2) {
        if (costly && !C.svc.context.mon_moving) {
            loss = C.long(loss + C.stolen_value(otmp, x, y, C.boolean(shkp.mpeaceful), 1));
            if (otmp.oclass != C.COIN_CLASS)
                otmp.no_charge = 1;
        }
        otmp2 = bury_an_obj(otmp, 0);
    }

    /* don't expect any engravings here, but just in case */
    C.del_engr_at(x, y);
    C.newsym(x, y);
    C.maybe_unhide_at(x, y);

    if (costly && loss) {
        C.You("owe %s %ld %s for burying merchandise.", C.shkname(shkp), loss,
            C.currency(loss));
    }
}

/* move objects from buriedobjlist to fobj/nexthere lists; if caller
   converts terrain from ice to something, it should call obj_ice_effects() */
export function unearth_objs(x, y)

{
    x = C.int(x); y = C.int(y);
    let otmp, otmp2, bball;
    const cc = C.coordLocal();

    if (C.debugcore("dig.c", 1)) {
        const save_plnmsg = C.iflags.last_msg;
        C.pline("unearth_objs: at <%d,%d>", x, y);
        C.iflags.last_msg = save_plnmsg;
    }
    cc.x = x;
    cc.y = y;
    bball = buried_ball(cc);
    for (otmp = C.svl.level.buriedobjlist; otmp; otmp = otmp2) {
        otmp2 = otmp.nobj;
        if (otmp.ox == x && otmp.oy == y) {
            if (bball && C.samePtr(otmp, bball)
                && C.u.utrap && C.u.utraptype == C.TT_BURIEDBALL) {
                C.callLocal(buried_ball_to_punishment);
            } else {
                C.obj_extract_self(otmp);
                if (otmp.timed)
                    C.stop_timer(C.ROT_ORGANIC, C.obj_to_any(otmp));
                C.place_object(otmp, x, y);
                C.stackobj(otmp);
            }
        }
    }
    C.del_engr_at(x, y);
    C.newsym(x, y);
}

/*
 * The organic material has rotted away while buried.  As an expansion,
 * we could add partial damage.  A damage count is kept in the object
 * and every time we are called we increment the count and reschedule another
 * timeout.  Eventually the object rots away.
 *
 * This is used by buried objects other than corpses.  When a container rots
 * away, any contents become newly buried objects.
 */
/* ARGSUSED */
export function rot_organic(arg, timeout)

{
    timeout = C.long(timeout);
    let obj = arg.a_obj;

    while (C.Has_contents(obj)) {
        /* We don't need to place contained object on the floor
           first, but we do need to update its map coordinates. */
        obj.cobj.ox = obj.ox, obj.cobj.oy = obj.oy;
        /* Everything which can be held in a container can also be
           buried, so bury_an_obj's use of obj_extract_self insures
           that Has_contents(obj) will eventually become false. */
        bury_an_obj(obj.cobj, 0);
    }
    C.obj_extract_self(obj);
    C.obfree(obj, 0);
}

/*
 * Called when a corpse has rotted completely away.
 */
export function rot_corpse(arg, timeout)

{
    timeout = C.long(timeout);
    let x = C.coordxy(0), y = C.coordxy(0);
    let obj = arg.a_obj;
    let on_floor = obj.where == C.OBJ_FLOOR,
            in_invent = obj.where == C.OBJ_INVENT;

    if (on_floor) {
        x = C.coordxy(obj.ox);
        y = C.coordxy(obj.oy);
    } else if (in_invent) {
        if (C.flags.verbose) {
            let cname = C.corpse_xname(obj, 0, C.CXN_NO_PFX);

            C.Your("%s%s %s away%c", C.samePtr(obj, C.uwep) ? "wielded " : "", cname,
                 C.otense(obj, "rot"), C.samePtr(obj, C.uwep) ? '!' : '.');
        }
        if (obj.owornmask) {
            C.remove_worn_item(obj, 1);
            C.stop_occupation();
        }
    } else if (obj.where == C.OBJ_MINVENT) {
        if (obj.owornmask && C.samePtr(obj, C.MON_WEP(obj.ocarry)))
            C.setmnotwielded(obj.ocarry, obj); /* clears owornmask */
    } else if (obj.where == C.OBJ_MIGRATING) {
        /* clear destination flag so that obfree()'s check for
           freeing a worn object doesn't get a false hit */
        obj.owornmask = 0n;
    }
    rot_organic(arg, timeout);
    if (on_floor) {
        let mtmp = C.m_at(x, y);

        /* a hiding monster may be exposed */
        if (mtmp && !C.OBJ_AT(x, y) && mtmp.mundetected
            && C.hides_under(mtmp.data)) {
            mtmp.mundetected = 0;
        } else if (C.u_at(x, y)
                   && C.u.uundetected && C.hides_under(C.gy.youmonst.data))
            C.hideunder(C.gy.youmonst);
        C.newsym(x, y);
    } else if (in_invent)
        C.update_inventory();
}

// #if 0
/* at least give it a chance :-) */

/* calls unearth_you() */

/* still buried after 'port attempt */

// #endif /*0*/

/* the #wizbury command - bury everything at your loc and around */
export function wiz_debug_cmd_bury()

{
    let otmp;
    let x, y, before = 0, after = 0, diff;

    for (x = C.u.ux - 1; x <= C.u.ux + 1; x++)
        for (y = C.u.uy - 1; y <= C.u.uy + 1; y++) {
            if (!C.isok(x, y))
                continue;
            for (otmp = C.svl.level.objects[x][y]; otmp; otmp = otmp.nexthere)
                ++before;

            bury_objs(x, y);

            for (otmp = C.svl.level.objects[x][y]; otmp; otmp = otmp.nexthere)
                ++after;
        }

    diff = before - after;
    if (before == 0)
        /* there was nothing here */
        C.pline("No objects here or adjacent to bury.");
    else if (diff == 0)
        /* before and after will be the same if only unburiable objects are
           present (The Amulet, invocation items, Rider corpses, uchain when
           uball doesn't get buried: carried or floor beyond burial range) */
        C.pline("No objects buried.");
    else
        /* usual case; if uball got buried, uchain went away and won't be
           counted as buried */
        C.pline("%d object%s buried.", diff, C.plur(diff));
    return C.ECMD_OK;
}

// #undef BY_YOU
// #undef BY_OBJECT

/* for 'onefile' testing, leave STRIDENT defined so that the other instance
   of it in pray.c will trigger a complaint if someone changes its value */
/*#undef STRIDENT*/

/*dig.c*/


/* DEBUG */
