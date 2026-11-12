/* NetHack 5.0	hack.c	$NHDT-Date: 1763708572 2025/11/20 23:02:52 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.494 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Derek S. Ray, 2015. */
/* NetHack may be freely redistributed.  See license for details. */

// Configured source policy. Typed runtime transport is separate.
import { C } from '../c-runtime/context.js';

const TRAVP_TRAVEL = 0, TRAVP_GUESS = 1, TRAVP_VALID = 2;

// Original C static initializers, once per actual Module; no game reset is added.
export function initializeHackData(C)
{
    if (C.state.initialized)
        return;
    C.state.inspoteffects = 0;
    C.state.spotloc = {x:0,y:0};
    C.state.spotterrain = 0;
    C.state.spottrap = 0;
    C.state.spottraptyp = C.NO_TRAP;
    C.state.weightlist = 0;
    C.state.fell_on_sink = "fell onto a sink";
    C.state.unknown_obstacle = "an unknown obstacle";
    C.state.icewarnings = [
        "The ice seems very soft and slushy.",
        "You feel the ice shift beneath you!",
        "The ice, is gonna BREAK!",
    ];
    C.state.powers = [C.TELEPORT,C.SEE_INVIS,C.POISON_RES,C.COLD_RES,
        C.SHOCK_RES,C.FIRE_RES,C.SLEEP_RES,C.DISINT_RES,
        C.TELEPORT_CONTROL,C.STEALTH,C.FAST,C.INVIS];
    for (let i=0;i<5;i++)
        C.HEAP8[C.charPointer(C.in_rooms_buf)+i] = 0;
    C.state.initialized = true;
}

/* #define DEBUG */
/* uncomment for debugging */
/* XXX: if more sources of water walking than just boots are added,
   cause_known(insight.c) should be externified and used for this */
/* mode values for findtravelpath() */
export function uint_to_any(ui)
{
    ui=C.uint(ui);
    C.copyRecord(C.gt.tmp_anything,C.cg.zeroany,C.sizes.any);
    C.gt.tmp_anything.a_uint = C.uint(ui);
    return C.gt.tmp_anything;
}

export function long_to_any(lng)
{
    lng=C.long(lng);
    C.copyRecord(C.gt.tmp_anything,C.cg.zeroany,C.sizes.any);
    C.gt.tmp_anything.a_long = C.long(lng);
    return C.gt.tmp_anything;
}

export function monst_to_any(mtmp)
{
    
    C.copyRecord(C.gt.tmp_anything,C.cg.zeroany,C.sizes.any);
    C.gt.tmp_anything.a_monst = mtmp;
    return C.gt.tmp_anything;
}

export function obj_to_any(obj)
{
    
    C.copyRecord(C.gt.tmp_anything,C.cg.zeroany,C.sizes.any);
    C.gt.tmp_anything.a_obj = obj;
    return C.gt.tmp_anything;
}

/* can hero move onto a spot containing one or more boulders?
   used for m<dir> and travel and during boulder push failure */
export function revive_nasty(x,y,msg)
{
    x=C.short(x);y=C.short(y);
    let otmp = 0; let otmp2 = 0;
    let mtmp;
    let cc = C.recordLocal("nhcoord");
    let revived = C.char(C.FALSE);

    for (otmp = C.svl.level.objects[x][y]; otmp; otmp = otmp2) {
        otmp2 = otmp.nexthere;
        if (Number(Boolean(otmp.otyp == C.CORPSE
            && (C.is_rider(C.mons[otmp.corpsenm])
                || otmp.corpsenm == C.PM_WIZARD_OF_YENDOR)))) {
            /* move any living monster already at that location */
            if (Number(Boolean((mtmp = C.m_at(x, y)) && C.enexto(cc, x, y, mtmp.data))))
                C.rloc_to(mtmp, cc.x, cc.y);
            if (msg)
                C.Norep("%s", msg);
            revived = C.char(C.revive_corpse(otmp));
        }
    }

    /* this location might not be safe, if not, move revived monster */
    if (revived) {
        mtmp = C.m_at(x, y);
        if (Number(Boolean(mtmp && !C.goodpos(x, y, mtmp, 0)
            && C.enexto(cc, x, y, mtmp.data)))) {
            C.rloc_to(mtmp, cc.x, cc.y);
        }
        /* else impossible? */
    }

    return C.char(revived);
}

export function could_move_onto_boulder(sx,sy)
{
    sx=C.short(sx);sy=C.short(sy);
    /* can if able to phaze through rock (must be poly'd, so not riding) */
    if (C.Passes_walls)
        return C.char(C.TRUE);
    /* can't when riding */
    if (C.u.usteed)
        return C.char(C.FALSE);
    /* can if a giant, unless doing so allows hero to pass into a
       diagonal squeeze at the same time */
    if (C.throws_rocks(C.gy.youmonst.data))
        return C.char((Number(Boolean(!C.u.dx || !C.u.dy || !(Number(Boolean(C.IS_OBSTRUCTED(C.levl[C.u.ux][sy].typ)
                                    && C.IS_OBSTRUCTED(C.levl[sx][C.u.uy].typ))))))));
    /* can if tiny (implies carrying very little else couldn't move at all) */
    if (C.verysmall(C.gy.youmonst.data))
        return C.char(C.TRUE);
    /* can squeeze to spot if carrying extremely little, otherwise can't */
    return C.char(C.squeezeablylightinvent());
}

export function dopush(sx,sy,rx,ry,otmp,costly)
{
    sx=C.short(sx);sy=C.short(sy);rx=C.short(rx);ry=C.short(ry);costly=C.char(costly);
    let shkp;

    {
        let what;
        let givemesg; let easypush;
        /* give boulder pushing feedback if this is a different
           boulder than the last one pushed or if it's been at
           least 2 turns since we last pushed this boulder;
           unlike with Norep(), intervening messages don't cause
           it to repeat, only doing something else in the meantime */
        if (otmp.o_id != C.gb.bldrpush_oid) {
            C.gb.bldrpushtime = C.long(C.long((C.long(C.svm.moves)) + (C.long(1n))));
            C.gb.bldrpush_oid = C.uint(otmp.o_id);
        }
        givemesg = C.char((Number(Boolean(C.svm.moves > C.long((C.long(C.gb.bldrpushtime)) + (C.long(2n)))
                    || C.svm.moves < C.gb.bldrpushtime))));
        what = C.charPointer(givemesg ? C.the(C.xname(otmp)) : 0);
        if (!C.u.usteed) {
            easypush = C.char(C.throws_rocks(C.gy.youmonst.data));
            if (givemesg)
                C.pline("With %s effort you move %s.",
                      easypush ? "little" : "great", what);
            if (!easypush)
                C.exercise(C.A_STR, C.TRUE);
        } else {
            if (givemesg)
                C.pline("%s moves %s.", C.YMonnam(C.u.usteed), what);
        }
        C.gb.bldrpushtime = C.long(C.svm.moves);
    }

    /* Move the boulder *after* the message. */
    if (C.glyph_is_invisible(C.levl[rx][ry].glyph))
        C.unmap_object(rx, ry);
    otmp.next_boulder = C.int(0);
    C.callLocal(movobj,otmp, rx, ry); /* does newsym(rx,ry) */
    if (C.Blind) {
        C.feel_location(rx, ry);
        C.feel_location(sx, sy);
    } else {
        C.newsym(sx, sy);
    }
    /* maybe adjust bill if boulder was pushed across shop boundary;
       normally otmp->unpaid would not apply because otmp isn't in
       hero's inventory, but addtobill() sets it and subfrombill()
       clears it */
    if (Number(Boolean(costly && !C.costly_spot(rx, ry)))) {
        /* pushing from inside shop to its boundary (or free spot) */
        C.addtobill(otmp, C.FALSE, C.FALSE, C.FALSE);
    } else if (Number(Boolean(!costly && C.costly_spot(rx, ry) && otmp.unpaid
               && (!C.pointerEqual((shkp = C.shop_keeper(C.HEAP8[C.charPointer(C.callLocal(in_rooms,rx, ry, C.SHOPBASE))])),0))
               && C.onshopbill(otmp, shkp, C.TRUE)))) {
        /* this can happen if hero pushes boulder from farther inside
           shop into shop's free spot (which will add it to the bill),
           then teleports or Passes_walls to doorway (without exiting
           the shop), and then pushes the boulder from the free spot
           back into the shop; it's contingent upon the shopkeeper not
           "muttering an incantation" to fracture the boulder while it
           is unpaid at the free spot */
        C.subfrombill(otmp, shkp);
    } else if (Number(Boolean(otmp.unpaid
               && !C.pointerEqual((shkp = C.find_objowner(otmp, sx, sy)),0)
               && !C.strchr(C.callLocal(in_rooms,rx, ry, C.SHOPBASE),
                          C.ESHK(shkp).shoproom)))) {
        /* once the boulder is fully out of the shop, so that it's
         * impossible to change your mind and push it back in without
         * leaving and triggering Kops, switch it to stolen_value */
        C.stolen_value(otmp, sx, sy, C.TRUE, C.FALSE);
    }
}

export function cannot_push_msg(otmp,sx,sy)
{
    sx=C.short(sx);sy=C.short(sy);
    let what;

    what = C.charPointer(C.the(C.xname(otmp)));
    if (C.u.usteed)
        C.pline("%s tries to move %s, but cannot.",
              C.YMonnam(C.u.usteed), what);
    else
        C.You("try to move %s, but in vain.", what);
    if (C.Blind)
        C.feel_location(sx, sy);
}

export function cannot_push(otmp,sx,sy)
{
    sx=C.short(sx);sy=C.short(sy);
    if (C.throws_rocks(C.gy.youmonst.data)) {
        let canpickup = C.char((Number(Boolean(!C.Sokoban
                         /* similar exception as in can_lift():
                            when poly'd into a giant, you can
                            pick up a boulder if you have a free
                            slot or into the overflow ('#') slot
                            unless already carrying at least one */
                        && (C.callLocal(inv_cnt,C.FALSE) < C.invlet_basic
                               || !C.carrying(C.BOULDER)))))); let willpickup = C.char((Number(Boolean(canpickup
                          && (C.flags.pickup && !C.svc.context.nopick)
                          && C.autopick_testobj(otmp, C.TRUE)))));

        if (Number(Boolean(C.u.usteed && C.P_SKILL(C.P_RIDING) < C.P_BASIC))) {
            C.You("aren't skilled enough to %s %s from %s.",
                willpickup ? "pick up" : "push aside",
                C.the(C.xname(otmp)), C.y_monnam(C.u.usteed));
        } else {
            /*
             * will pick up:  you easily pick it up
             * can but won't: you maneuver over it and could pick it up
             * can't pick up: you maneuver over it (possibly followed
             *     by feedback from failed auto-pickup attempt)
             */
            C.pline("However, you %s%s.",
                  willpickup ? "easily pick it up"
                             : "maneuver over it",
                  (Number(Boolean(canpickup && !willpickup)))
                             ? " and could pick it up"
                             : "");
            /* similar to dropping everything and squeezing onto
               a Sokoban boulder's spot, moving to same breaks the
               Sokoban rules because on next step you could go
               past it without pushing it to plug a pit or hole */
            C.sokoban_guilt();
        }
        return C.int(0);
    }

    if (C.callLocal(could_move_onto_boulder,sx, sy)) {
        C.pline(
           "However, you can squeeze yourself into a small opening.");
        C.sokoban_guilt();
        return C.int(0);
    } else {
        return C.int(-1);
    }
}

export function rock_disappear_msg(otmp)
{
    
    if (C.u.usteed)
        C.pline("%s pushes %s and suddenly it disappears!",
                C.YMonnam(C.u.usteed), C.the(C.xname(otmp)));
    else
        C.You("push %s and suddenly it disappears!",
            C.the(C.xname(otmp)));

}

export function moverock_done(sx,sy)
{
    sx=C.short(sx);sy=C.short(sy);
    let otmp;
    for (otmp = C.svl.level.objects[sx][sy]; otmp; otmp = otmp.nexthere)
        if (otmp.otyp == C.BOULDER)
            otmp.next_boulder = C.int(0); /* resume normal xname() for this obj */
}

export function moverock()
{
    
    let sx; let sy;
    let ret;

    sx = C.short(C.u.ux + C.u.dx), sy = C.short(C.u.uy + C.u.dy); /* boulder starting position */
    ret = C.int(C.callLocal(moverock_core,sx, sy));
    C.callLocal(moverock_done,sx, sy);
    return C.int(ret);
}

/*
 *  still_chewing()
 *
 *  Chew on a wall, door, or boulder.  [What about statues?]
 *  Returns TRUE if still eating, FALSE when done.
 */
export function moverock_core(sx,sy)
{
    sx=C.short(sx);sy=C.short(sy);
    let rx; let ry;
    let otmp;
    let ttmp;
    let mtmp;
    let costly; let firstboulder = C.char(C.TRUE);

    while (!C.pointerEqual((otmp = C.sobj_at(C.BOULDER, sx, sy)),0)) {

        if (Number(Boolean(C.Blind && C.glyph_to_obj(C.glyph_at(sx, sy)) != C.BOULDER))) {
            C.pline("That feels like a boulder.");
            C.map_object(otmp, C.TRUE);
            C.callLocal(nomul,0);
            return C.int(-1);
        }

        /* when otmp->next_boulder is 1, xname() will format it as
           "next boulder" instead of just "boulder"; affects
           boulder_hits_pool()'s messages as well as messages below */
        otmp.next_boulder = C.int(firstboulder ? 0 : 1);
        /* FIXME?  'firstboulder' should be reset to True if this boulder
           isn't the first and the previous one is named differently from
           this one.  Probably not worth bothering with... */
        firstboulder = C.char(C.FALSE);

        /* make sure that this boulder is visible as the top object */
        if (!C.pointerEqual(otmp,C.svl.level.objects[sx][sy]))
            C.callLocal(movobj,otmp, sx, sy);

        rx = C.short(C.u.ux + 2 * C.u.dx); /* boulder destination position */
        ry = C.short(C.u.uy + 2 * C.u.dy);
        C.callLocal(nomul,0);

        /* using m<dir> towards an adjacent boulder steps over/onto it if
           poly'd into a giant or squeezes under/beside it if small/light
           enough but is a no-op in other circumstances unless move attempt
           reveals an unseen boulder or lack of remembered, unseen monster */
        if (C.svc.context.nopick) {
            let oldglyph = C.int(C.glyph_at(sx, sy)); /* before feel_location() */
            let res;

            C.feel_location(sx, sy); /* same for all 3 if/else-if/else cases */
            if (C.throws_rocks(C.gy.youmonst.data)) {
                /* player has used 'm<dir>' to move, so step to boulder's
                   spot without pushing it; hero is poly'd into a giant,
                   so exotic forms of locomotion are out, but might be
                   levitating (ring, potion, spell) or flying (amulet) */
                C.You("%s over a boulder here.", C.callLocal(u_locomotion,"step"));
                /* ["over" seems weird on air level but what else to say?] */
                C.sokoban_guilt();
                res = C.int(0); /* move to <sx,sy> */
            } else if (C.callLocal(could_move_onto_boulder,sx, sy)) {
                C.You("squeeze yourself %s the boulder.",
                    C.Flying ? "over" : "against");
                C.sokoban_guilt();
                res = C.int(0); /* move to <sx,sy> */
            } else {
                C.There("is a boulder in your way.");
                /* use a move if hero learns something; see test_move() for
                   how/why 'context.door_opened' is being dragged into this */
                if (C.glyph_at(sx, sy) != oldglyph)
                    C.svc.context.door_opened = C.char(C.svc.context.move = C.char(C.TRUE));
                res = C.int(-1); /* don't move to <sx,sy>, so no soko guilt */
            }
            return C.int(res);
        }
        if (Number(Boolean(C.Levitation || C.Is_airlevel(C.u.uz)))) {
            /* FIXME?  behavior in an air bubble on the water level should
               be similar to being on the air level; both cases probably
               ought to let push attempt proceed when flying (which implies
               not levitating) */
            if (C.Blind)
                C.feel_location(sx, sy);
            C.You("don't have enough leverage to push %s.", C.the(C.xname(otmp)));
            /* Give them a chance to climb over it? */
            return C.int(-1);
        }
        if (Number(Boolean(C.verysmall(C.gy.youmonst.data) && !C.u.usteed))) {
            if (C.Blind)
                C.feel_location(sx, sy);
            C.pline("You're too small to push that %s.", C.xname(otmp));
            return C.int(C.callLocal(cannot_push,otmp, sx, sy));
        }
        if (Number(Boolean(C.isok(rx, ry) && !C.IS_OBSTRUCTED(C.levl[rx][ry].typ)
            && C.levl[rx][ry].typ != C.IRONBARS
            && (!C.IS_DOOR(C.levl[rx][ry].typ) || !(Number(Boolean(C.u.dx && C.u.dy)))
                || C.callLocal(doorless_door,rx, ry)) && !C.sobj_at(C.BOULDER, rx, ry)))) {
            ttmp = C.t_at(rx, ry);
            mtmp = C.m_at(rx, ry);
            costly = C.char((Number(Boolean(C.costly_spot(sx, sy)
                      && C.shop_keeper(C.HEAP8[C.charPointer(C.callLocal(in_rooms,sx, sy, C.SHOPBASE))])))));

            /* KMH -- Sokoban doesn't let you push boulders diagonally */
            if (Number(Boolean(C.Sokoban && C.u.dx && C.u.dy))) {
                if (C.Blind)
                    C.feel_location(sx, sy);
                C.pline("%s won't roll diagonally on this %s.",
                      C.The(C.xname(otmp)), C.surface(sx, sy));
                return C.int(C.callLocal(cannot_push,otmp, sx, sy));
            }

            if (C.callLocal(revive_nasty,rx, ry,
                             "You sense movement on the other side.")) {
                return C.int(-1);
            }

            if (Number(Boolean(mtmp && !C.noncorporeal(mtmp.data)
                && (!mtmp.mtrapped || !(Number(Boolean(ttmp && C.is_pit(ttmp.ttyp)))))))) {
                let deliver_part1 = C.char(C.FALSE);

                if (C.Blind)
                    C.feel_location(sx, sy);
                if (C.canspotmon(mtmp)) {
                    C.pline("There's %s on the other side.", C.a_monnam(mtmp));
                    deliver_part1 = C.char(C.TRUE);
                } else {
                    ;
                    C.You_hear("a monster behind %s.", C.the(C.xname(otmp)));
                    if (!C.Deaf)
                        deliver_part1 = C.char(C.TRUE);
                    C.map_invisible(rx, ry);
                }
                if (C.flags.verbose) {
                    let you_or_steed = C.localArray("char",[256]);

                    C.Strcpy(you_or_steed,
                           C.u.usteed ? C.y_monnam(C.u.usteed) : "you");
                    C.pline("%s%s cannot move %s.",
                          deliver_part1 ? "Perhaps that's why " : "",
                          deliver_part1 ? you_or_steed
                                        : C.upstart(you_or_steed),
                          deliver_part1 ? "it" : C.the(C.xname(otmp)));
                }
                return C.int(C.callLocal(cannot_push,otmp, sx, sy));
            }

            if (C.closed_door(rx, ry)) {
                C.callLocal(cannot_push_msg,otmp, sx, sy);
                return C.int(C.callLocal(cannot_push,otmp, sx, sy));
            }

            /* at this point the boulder should be able to move (though
               potentially into something like a trap, pool, or lava) */

            /* rumbling disturbs buried zombies */
            C.callLocal(disturb_buried_zombies,sx, sy);

            if (ttmp) {
                let newlev = C.int(0); /* lint suppression */
                let dest = C.recordLocal("d_level");

                /* if a trap operates on the boulder, don't attempt
                   to move any others at this location; return -1
                   if another boulder is in hero's way, or 0 if he
                   should advance to the vacated boulder position */
                switch (ttmp.ttyp) {
                case C.LANDMINE:
                    if ((C.rngCaller(506,"moverock_core"),C.rn2(10))) {
                        C.obj_extract_self(otmp);
                        C.place_object(otmp, rx, ry);
                        C.newsym(sx, sy);
                        C.pline("%s!  %s %s land mine.",
                              /* "kablam" is a variation of "ka-boom" or
                                 "kablooey", rather cartoonish descriptions
                                 of the sound of an explosion, but give it
                                 even when deaf if hero sees the explosion */
                              (Number(Boolean(!C.Deaf || !C.Blind))) ? "KAABLAMM!!"
                              /* use an alternate exclamation when feeling
                                 the floor/ground/whatever shake (or maybe
                                 a weak shockwave if levitating or flying) */
                                                : "Gadzooks",
                              C.Tobjnam(otmp, "trigger"),
                              ttmp.madeby_u ? "your" : "a");
                        C.blow_up_landmine(ttmp);
                        /* if the boulder remains, it should fill the pit */
                        C.fill_pit(C.u.ux, C.u.uy);
                        if (C.cansee(rx, ry))
                            C.newsym(rx, ry);
                        return C.int(C.sobj_at(C.BOULDER, sx, sy) ? -1 : 0);
                    }
                    break;
                case C.SPIKED_PIT:
                case C.PIT:
                    C.obj_extract_self(otmp);
                    /* vision kludge to get messages right;
                       the pit will temporarily be seen even
                       if this is one among multiple boulders */
                    if (!C.Blind)
                        ((_hackTarget,_hackIndex)=>_hackTarget[_hackIndex] = C.uchar(C.int(C.int(_hackTarget[_hackIndex]) | C.int(C.IN_SIGHT))))(C.gv.viz_array[ry],rx);
                    if (!C.flooreffects(otmp, rx, ry, "fall")) {
                        C.place_object(otmp, rx, ry);
                    }
                    if (Number(Boolean(mtmp && !C.Blind)))
                        C.newsym(rx, ry);
                    return C.int(C.sobj_at(C.BOULDER, sx, sy) ? -1 : 0);
                case C.HOLE:
                case C.TRAPDOOR:
                    ;
                    if (C.Blind)
                        C.pline("Kerplunk!  You no longer feel %s.",
                              C.the(C.xname(otmp)));
                    else
                        C.pline("%s%s and %s a %s in the %s!",
                              C.Tobjnam(otmp, (ttmp.ttyp == C.TRAPDOOR)
                                                ? "trigger"
                                                : "fall"),
                              (ttmp.ttyp == C.TRAPDOOR) ? "" : " into",
                              C.otense(otmp, "plug"),
                              (ttmp.ttyp == C.TRAPDOOR) ? "trap door" : "hole",
                              C.surface(rx, ry));
                    C.deltrap(ttmp);
                    C.useupf(otmp, 1n);
                    C.bury_objs(rx, ry);
                    ((_hackTarget)=>_hackTarget.wall_info = (C.uint(C.int(C.int(_hackTarget.wall_info) & C.int(~C.W_NONDIGGABLE))) & 31))(C.levl[rx][ry]);
                    C.levl[rx][ry].candig = C.uint(1);
                    if (C.cansee(rx, ry))
                        C.newsym(rx, ry);
                    return C.int(C.sobj_at(C.BOULDER, sx, sy) ? -1 : 0);
                case C.LEVEL_TELEP:
                    /* 20% chance of picking current level; 100% chance for
                       that if in single-level branch (Knox) or in endgame */
                    newlev = C.int(C.random_teleport_level());
                    /* if trap doesn't work, skip "disappears" message */
                    if (newlev == C.depth(C.u.uz)) {
                        C.callLocal(dopush,sx, sy, rx, ry, otmp, costly);
                        continue;
                    }
                    ;
                    /*FALLTHRU*/
                case C.TELEP_TRAP:
                    C.callLocal(rock_disappear_msg,otmp);
                    otmp.next_boulder = C.int(0); /* reset before moving it */
                    if (ttmp.ttyp == C.TELEP_TRAP) {
                        void (C.rloco(otmp));
                    } else {
                        if (costly)
                            C.stolen_value(otmp, rx, ry, !ttmp.tseen, C.FALSE);
                        C.obj_extract_self(otmp);
                        C.add_to_migration(otmp);
                        C.get_level(dest, newlev);
                        otmp.ox = C.short(dest.dnum);
                        otmp.oy = C.short(dest.dlevel);
                        otmp.owornmask = C.long(C.long( C.MIGR_RANDOM));
                    }
                    C.seetrap(ttmp);
                    return C.int(C.sobj_at(C.BOULDER, sx, sy) ? -1 : 0);
                case C.ROLLING_BOULDER_TRAP:
                {
                    let tox = C.int(rx);
                    let toy = C.int(ry);
                    /* the boulder continues until it reaches one of
                       the trap's launch spots or hits a wall / out-of-bounds */
                    while (C.isok(tox + C.u.dx, toy + C.u.dy)) {
                        tox = C.int(C.int(C.int(tox) + C.int(C.u.dx)));
                        toy = C.int(C.int(C.int(toy) + C.int(C.u.dy)));
                        if (Number(Boolean(tox == ttmp.launch.x && toy == ttmp.launch.y)))
                            break;
                        if (Number(Boolean(tox == ttmp.launch2.x && toy == ttmp.launch2.y)))
                            break;
                    }
                    C.pline("%s away from you!",
                          C.Tobjnam(otmp, "suddenly roll"));
                    C.feeltrap(ttmp);
                    C.launch_obj(C.BOULDER, sx, sy, tox, toy, C.ROLL | C.LAUNCH_KNOWN);
                    return C.int(C.sobj_at(C.BOULDER, sx, sy) ? -1 : 0);
                }
                default:
                    break; /* boulder not affected by this trap */
                }
            }

            if (C.boulder_hits_pool(otmp, rx, ry, C.TRUE))
                continue;

            /*
             * Re-link at top of fobj chain so that pile order is preserved
             * when level is restored.
             */
            if (!C.pointerEqual(otmp,C.fobj)) {
                C.remove_object(otmp);
                C.place_object(otmp, otmp.ox, otmp.oy);
            }
            C.callLocal(dopush,sx, sy, rx, ry, otmp, costly);
        } else {
            C.callLocal(cannot_push_msg,otmp, sx, sy);
            return C.int(C.callLocal(cannot_push,otmp, sx, sy));
        }
    }
    return C.int(0);
}

export function still_chewing(x,y)
{
    x=C.short(x);y=C.short(y);
    let lev = C.levl[x][y];
    let boulder = C.sobj_at(C.BOULDER, x, y);
    let digtxt = C.charPointer(( 0)); let dmgtxt = C.charPointer(( 0));

    if (C.svc.context.digging.down) /* not continuing prev dig (w/ pick-axe) */
        void (C.memset(( C.svc.context.digging), 0,
                      BigInt(C.sizes["dig_info"])));

    if (Number(Boolean(!boulder
        && ((C.IS_OBSTRUCTED(lev.typ) && !C.callLocal(may_dig,x, y))
            /* may_dig() checks W_NONDIGGABLE but doesn't handle iron bars */
            || (lev.typ == C.IRONBARS && (lev.wall_info & C.W_NONDIGGABLE)))))) {
        C.You("hurt your teeth on the %s.",
            (lev.typ == C.IRONBARS)
                ? "bars"
                : C.IS_TREE(lev.typ)
                    ? "tree"
                    : "hard stone");
        C.callLocal(nomul,0);
        return C.int(1);
    } else if (Number(Boolean(lev.typ == C.IRONBARS
               && C.metallivorous(C.gy.youmonst.data) && C.u.uhunger > 1500))) {
        /* finishing eating via 'morehungry()' doesn't handle choking */
        C.You("are too full to eat the bars.");
        C.callLocal(nomul,0);
        return C.int(1);
    } else if (Number(Boolean(!C.svc.context.digging.chew
               || C.svc.context.digging.pos.x != x
               || C.svc.context.digging.pos.y != y
               || !C.on_level(C.svc.context.digging.level, C.u.uz)))) {
        C.svc.context.digging.down = C.char(C.FALSE);
        C.svc.context.digging.chew = C.char(C.TRUE);
        C.svc.context.digging.warned = C.char(C.FALSE);
        C.svc.context.digging.pos.x = C.short(x);
        C.svc.context.digging.pos.y = C.short(y);
        C.assign_level(C.svc.context.digging.level, C.u.uz);
        /* solid rock takes more work & time to dig through */
        C.svc.context.digging.effort = C.int((Number(Boolean(C.IS_OBSTRUCTED(lev.typ) && !C.IS_TREE(lev.typ))) ? 30 : 60) + C.u.udaminc);
        C.You("start chewing %s %s.",
            (Number(Boolean(boulder || C.IS_TREE(lev.typ) || lev.typ == C.IRONBARS)))
                ? "on a"
                : "a hole in the",
            boulder
                ? "boulder"
                : C.IS_TREE(lev.typ)
                    ? "tree"
                    : C.IS_OBSTRUCTED(lev.typ)
                        ? "rock"
                        : (lev.typ == C.IRONBARS)
                            ? "bar"
                            : "door");
        C.watch_dig(C.view("monst", 0), x, y, C.FALSE);
        return C.int(1);
    } else if ((((_hackTarget)=>_hackTarget.effort = C.int(C.int(C.int(_hackTarget.effort) + C.int((30 + C.u.udaminc)))))(C.svc.context.digging)) <= 100) {
        if (C.flags.verbose)
            C.You("%s chewing on the %s.",
                C.svc.context.digging.chew ? "continue" : "begin",
                boulder
                    ? "boulder"
                    : C.IS_TREE(lev.typ)
                        ? "tree"
                        : C.IS_OBSTRUCTED(lev.typ)
                            ? "rock"
                            : (lev.typ == C.IRONBARS)
                                ? "bars"
                                : "door");
        C.svc.context.digging.chew = C.char(C.TRUE);
        C.watch_dig(C.view("monst", 0), x, y, C.FALSE);
        return C.int(1);
    }

    /* Okay, you've chewed through something */
    if (!C.u.uconduct.food++)
        C.livelog_printf(C.LL_CONDUCT,
                       "ate for the first time, by chewing through %s",
                       boulder ? "a boulder"
                       : C.IS_TREE(lev.typ) ? "a tree"
                         : C.IS_OBSTRUCTED(lev.typ) ? "rock"
                           : (lev.typ == C.IRONBARS) ? "iron bars"
                             : "a door");
    ((_hackTarget)=>_hackTarget.uhunger = C.int(C.int(C.int(_hackTarget.uhunger) + C.int((C.rngCaller(730,"still_chewing"),C.rnd(20))))))(C.u);

    if (boulder) {
        C.delobj(boulder);         /* boulder goes bye-bye */
        C.You("eat the boulder."); /* yum */

        /*
         *  The location could still block because of
         *      1. More than one boulder
         *      2. Boulder stuck in a wall/stone/door.
         *
         *  [perhaps use does_block() below (from vision.c)]
         */
        if (Number(Boolean(C.IS_OBSTRUCTED(lev.typ) || C.closed_door(x, y)
            || C.sobj_at(C.BOULDER, x, y)))) {
            C.block_point(x, y); /* delobj will unblock the point */
            /* reset dig state */
            void (C.memset(( C.svc.context.digging), 0,
                          BigInt(C.sizes["dig_info"])));
            return C.int(1);
        }

    } else if (C.IS_WALL(lev.typ)) {
        if (C.HEAP8[C.charPointer(C.callLocal(in_rooms,x, y, C.SHOPBASE))]) {
            C.add_damage(x, y, C.SHOP_WALL_DMG);
            dmgtxt = C.charPointer("damage");
        }
        digtxt = C.charPointer("chew a hole in the wall.");
        if (C.svl.level.flags.is_maze_lev) {
            lev.typ = C.char(C.ROOM);
        } else if (Number(Boolean(C.svl.level.flags.is_cavernous_lev && !C.callLocal(in_town,x, y)))) {
            lev.typ = C.char(C.CORR);
        } else {
            lev.typ = C.char(C.DOOR);
            lev.doormask = C.uint(C.D_NODOOR);
        }
    } else if (C.IS_TREE(lev.typ)) {
        digtxt = C.charPointer("chew through the tree.");
        lev.typ = C.char(C.ROOM);
    } else if (lev.typ == C.IRONBARS) {
        if (C.metallivorous(C.gy.youmonst.data)) { /* should always be True here */
            /* arbitrary amount; unlike proper eating, nutrition is
               bestowed in a lump sum at the end */
            let nut = C.int(C.int( C.objects[C.HEAVY_IRON_BALL].oc_weight));

            /* lesshungry() requires that victual be set up, so skip it;
               morehungry() of a negative amount will increase nutrition
               without any possibility of choking to death on the meal;
               updates hunger state and requests status update if changed */
            C.morehungry(-nut);
        }
        digtxt = C.charPointer(C.u_at(x, y)
                 ? "devour the iron bars."
                 : "eat through the bars.");
        C.dissolve_bars(x, y);
    } else if (lev.typ == C.SDOOR) {
        if (lev.doormask & C.D_TRAPPED) {
            lev.doormask = C.uint(C.D_NODOOR);
            C.b_trapped("secret door", C.NO_PART);
        } else {
            digtxt = C.charPointer("chew through the secret door.");
            lev.doormask = C.uint(C.D_BROKEN);
        }
        lev.typ = C.char(C.DOOR);

    } else if (C.IS_DOOR(lev.typ)) {
        if (C.HEAP8[C.charPointer(C.callLocal(in_rooms,x, y, C.SHOPBASE))]) {
            C.add_damage(x, y, C.SHOP_DOOR_COST);
            dmgtxt = C.charPointer("break");
        }
        if (lev.doormask & C.D_TRAPPED) {
            lev.doormask = C.uint(C.D_NODOOR);
            C.b_trapped("door", C.NO_PART);
        } else {
            digtxt = C.charPointer("chew through the door.");
            lev.doormask = C.uint(C.D_BROKEN);
        }

    } else { /* STONE or SCORR */
        digtxt = C.charPointer("chew a passage through the rock.");
        lev.typ = C.char(C.CORR);
    }

    C.recalc_block_point(x, y); /* vision */
    C.newsym(x, y);
    if (digtxt)
        C.You1(digtxt); /* after newsym */
    if (dmgtxt)
        C.pay_for_damage(dmgtxt, C.FALSE);
    void (C.memset(( C.svc.context.digging), 0,
                  BigInt(C.sizes["dig_info"])));
    return C.int(0);
}

export function movobj(obj,ox,oy)
{
    ox=C.short(ox);oy=C.short(oy);
    /* optimize by leaving on the fobj chain? */
    C.remove_object(obj);
    C.maybe_unhide_at(obj.ox, obj.oy);
    C.newsym(obj.ox, obj.oy);
    C.place_object(obj, ox, oy);
    C.newsym(ox, oy);
}

/* to handle being chained to buried iron ball, trying to
               levitate but being blocked, then moving onto adjacent sink;
               no need to worry about being blocked by terrain because we
               couldn't be over a sink at the same time */
/* intended to be called only on ROCKs or TREEs */
export function dosinkfall()
{
    
    
    let obj;
    let dmg;
    let lev_boots = C.char((Number(Boolean(C.uarmf && C.uarmf.otyp == C.LEVITATION_BOOTS)))); let innate_lev = C.char(((C.long((C.long(C.HLevitation)) & (C.long((C.long((C.long(C.FROMOUTSIDE)) | (C.long(C.FROMFORM)))))))) != 0n)); let blockd_lev = C.char((C.BLevitation == C.I_SPECIAL)); let ufall = C.char((Number(Boolean(!innate_lev && !blockd_lev
                     && !(Number(Boolean(C.HFlying || C.EFlying))))))); /* BFlying */

    if (!ufall) {
        C.You((Number(Boolean(innate_lev || blockd_lev))) ? "wobble unsteadily for a moment."
                                       : "gain control of your flight.");
    } else {
        let save_ELev = C.long(C.ELevitation); let save_HLev = C.long(C.HLevitation);

        /* fake removal of levitation in advance so that final
           disclosure will be right in case this turns out to
           be fatal; fortunately the fact that rings and boots
           are really still worn has no effect on bones data */
        C.ELevitation = C.long(C.HLevitation = C.long(0n));
        C.You("crash to the floor!");
        dmg = C.int(((C.rngCaller(863,"dosinkfall"),C.rn2(8)) + ( 25 - C.int( C.ACURR(C.A_CON)))));
        C.callLocal(losehp,(C.Half_physical_damage ? Math.trunc(((dmg) + 1)/2) : (dmg)), C.state.fell_on_sink, C.NO_KILLER_PREFIX);
        C.exercise(C.A_DEX, C.FALSE);
        C.selftouch("Falling, you");
        for (obj = C.svl.level.objects[C.u.ux][C.u.uy]; obj; obj = obj.nexthere)
            if (Number(Boolean(obj.oclass == C.WEAPON_CLASS || C.is_weptool(obj)))) {
                C.You("fell on %s.", C.doname(obj));
                C.callLocal(losehp,(C.Half_physical_damage ? Math.trunc((((C.rngCaller(870,"dosinkfall"),C.rnd(3))) + 1)/2) : ((C.rngCaller(870,"dosinkfall"),C.rnd(3)))), C.state.fell_on_sink,
                       C.NO_KILLER_PREFIX);
                C.exercise(C.A_CON, C.FALSE);
            }
        C.ELevitation = C.long(save_ELev);
        C.HLevitation = C.long(save_HLev);
    }

    /*
     * Interrupt multi-turn putting on/taking off of armor (in which
     * case we reached the sink due to being teleported while busy;
     * in 3.4.3, Boots_on()/Boots_off() [called via (*afternmv)() when
     * 'multi' reaches 0] triggered a crash if we were donning/doffing
     * levitation boots [because the Boots_off() below causes 'uarmf'
     * to be null by the time 'afternmv' gets called]).
     *
     * Interrupt donning/doffing if we fall onto the sink, or if the
     * code below is going to remove levitation boots even when we
     * haven't fallen (innate floating or flying becoming unblocked).
     */
    if (Number(Boolean(ufall || lev_boots))) {
        void (C.stop_donning(lev_boots ? C.uarmf : C.view("obj", 0)));
        /* recalculate in case uarmf just got set to null */
        lev_boots = C.char((Number(Boolean(C.uarmf && C.uarmf.otyp == C.LEVITATION_BOOTS))));
    }

    /* remove worn levitation items */
    C.ELevitation = C.long(C.long(C.long(C.ELevitation) & C.long(~C.W_ARTI)));
    C.HLevitation = C.long(C.long(C.long(C.HLevitation) & C.long(~(C.long((C.long(C.I_SPECIAL)) | (C.long(C.TIMEOUT)))))));
    C.HLevitation++;
    if (Number(Boolean(C.uleft && C.uleft.otyp == C.RIN_LEVITATION))) {
        obj = C.uleft;
        C.Ring_off(obj);
        C.off_msg(obj);
    }
    if (Number(Boolean(C.uright && C.uright.otyp == C.RIN_LEVITATION))) {
        obj = C.uright;
        C.Ring_off(obj);
        C.off_msg(obj);
    }
    if (lev_boots) {
        obj = C.uarmf;
        void (C.Boots_off());
        C.off_msg(obj);
    }
    C.HLevitation--;
    /* probably moot; we're either still levitating or went
       through float_down(), but make sure BFlying is up to date */
    C.float_vs_flight();
}

export function may_dig(x,y)
{
    x=C.short(x);y=C.short(y);
    let lev = C.levl[x][y];

    return C.char(C.char( !(Number(Boolean((C.IS_STWALL(lev.typ) || C.IS_TREE(lev.typ))
                       && (lev.wall_info & C.W_NONDIGGABLE))))));
}

export function may_passwall(x,y)
{
    x=C.short(x);y=C.short(y);
    return C.char(C.char( !(Number(Boolean(C.IS_STWALL(C.levl[x][y].typ)
                       && (C.levl[x][y].wall_info & C.W_NONPASSWALL))))));
}

/* caller has already decided that it's a tight diagonal; check whether a
   monster--who might be the hero--can fit through, and if not then return
   the reason why:  1: can't fit, 2: possessions won't fit, 3: sokoban
   returns 0 if we can squeeze through */
export function bad_rock(mdat,x,y)
{
    x=C.short(x);y=C.short(y);
    return C.char(C.char( (Number(Boolean((C.Sokoban && C.sobj_at(C.BOULDER, x, y))
                      || (C.IS_OBSTRUCTED(C.levl[x][y].typ)
                          && (!C.tunnels(mdat) || C.needspick(mdat)
                              || !C.callLocal(may_dig,x, y))
                          && !(Number(Boolean(C.passes_walls(mdat) && C.callLocal(may_passwall,x, y))))))))));
}

export function cant_squeeze_thru(mon)
{
    
    let amt;
    let ptr = mon.data;

    if ((C.pointerEqual(mon,C.gy.youmonst)) ? C.Passes_walls : C.passes_walls(ptr))
        return C.int(0);

    /* too big? */
    if (Number(Boolean(C.bigmonst(ptr)
        && !(Number(Boolean(C.amorphous(ptr) || C.is_whirly(ptr) || C.noncorporeal(ptr)
             || C.slithy(ptr) || C.can_fog(mon)))))))
        return C.int(1);

    /* lugging too much junk? */
    amt = C.int((C.pointerEqual(mon,C.gy.youmonst)) ? C.callLocal(inv_weight,) + C.callLocal(weight_cap,)
                               : C.curr_mon_load(mon));
    if (amt > C.WT_TOOMUCH_DIAGONAL)
        return C.int(2);

    /* Sokoban restriction applies to hero only */
    if (Number(Boolean(C.pointerEqual(mon,C.gy.youmonst) && C.Sokoban)))
        return C.int(3);

    /* can squeeze through */
    return C.int(0);
}

/* return TRUE if (ux+dx,uy+dy) is an OK place to move;
   mode is one of DO_MOVE, TEST_MOVE, TEST_TRAV, or TEST_TRAP */
export function invocation_pos(x,y)
{
    x=C.short(x);y=C.short(y);
    return C.char(C.char( (Number(Boolean(C.Invocation_lev(C.u.uz)
                      && x == C.svi.inv_pos.x && y == C.svi.inv_pos.y)))));
}

/* these are -1|0|+1, not coordinates */
/*
 * Find a path from the destination (u.tx,u.ty) back to (u.ux,u.uy).
 * A shortest path is returned.  If guess is TRUE, consider various
 * inaccessible locations as valid intermediate path points.
 * Returns TRUE if a path was found.
 * gt.travelmap keeps track of map locations we've moved through
 * this travel session. It will be cleared once the travel stops.
 */
export function test_move(ux,uy,dx,dy,mode)
{
    ux=C.short(ux);uy=C.short(uy);dx=C.short(dx);dy=C.short(dy);mode=C.int(mode);
    let x = C.short(ux + dx);
    let y = C.short(uy + dy);
    let tmpr;
    let ust;

    C.svc.context.door_opened = C.char(C.FALSE);

    if (!C.isok(x, y))
        return C.char(C.FALSE);

    tmpr = C.levl[x][y];

    /*
     *  Check for physical obstacles.  First, the place we are going.
     */
    if (Number(Boolean(C.IS_OBSTRUCTED(tmpr.typ) || tmpr.typ == C.IRONBARS))) {
        if (Number(Boolean(C.Blind && mode == C.DO_MOVE)))
            C.feel_location(x, y);
        if (Number(Boolean(C.Passes_walls && C.callLocal(may_passwall,x, y)))) {
            ; /* do nothing */
        } else if (C.Underwater) {
            /* note: if water_friction() changes direction due to
               turbulence, new target destination will always be water,
               so we won't get here, hence don't need to worry about
               "there" being somewhere the player isn't sure of */
            if (mode == C.DO_MOVE)
                C.There("is an obstacle there.");
            return C.char(C.FALSE);
        } else if (tmpr.typ == C.IRONBARS) {
            if (Number(Boolean(mode == C.DO_MOVE
                && (C.dmgtype(C.gy.youmonst.data, C.AD_RUST)
                    || C.dmgtype(C.gy.youmonst.data, C.AD_CORR)
                    || C.metallivorous(C.gy.youmonst.data))
                && C.callLocal(still_chewing,x, y)))) {
                return C.char(C.FALSE);
            }
            if (!(Number(Boolean(C.Passes_walls || C.passes_bars(C.gy.youmonst.data))))) {
                if (Number(Boolean(mode == C.DO_MOVE && C.flags.mention_walls)))
                    C.You("cannot pass through the bars.");
                return C.char(C.FALSE);
            }
        } else if (Number(Boolean(C.tunnels(C.gy.youmonst.data)
                   && !C.needspick(C.gy.youmonst.data)))) {
            /* Eat the rock. */
            if (Number(Boolean(mode == C.DO_MOVE && C.callLocal(still_chewing,x, y))))
                return C.char(C.FALSE);
        } else if (Number(Boolean(C.flags.autodig && !C.svc.context.run && !C.svc.context.nopick
                   && C.uwep && C.is_pick(C.uwep)))) {
            /* MRKR: Automatic digging when wielding the appropriate tool */
            if (mode == C.DO_MOVE)
                void (C.use_pick_axe2(C.uwep));
            return C.char(C.FALSE);
        } else {
            if (mode == C.DO_MOVE) {
                if (C.is_db_wall(x, y)) {
                    C.pline("That drawbridge is up!");
                } else if (Number(Boolean(C.Passes_walls && !C.callLocal(may_passwall,x, y)
                           && C.In_sokoban(C.u.uz)))) {
                    /* soko restriction stays even after puzzle is solved */
                    C.pline_The("Sokoban walls resist your ability.");
                } else if (C.flags.mention_walls) {
                    let buf = C.localArray("char",[256]);
                    let glyph = C.int(C.back_to_glyph(x, y)); let sym = C.int(C.glyph_is_cmap(glyph) ? C.glyph_to_cmap(glyph)
                                                   : -1);

                    if (sym == C.S_stone)
                        C.Strcpy(buf, "solid stone");
                    else if (sym >= 0)
                        C.Strcpy(buf, C.an(C.defsyms[sym].explanation));
                    else
                        C.Sprintf(buf, "impossible [background glyph=%d]",
                                glyph);
                    C.pline_dir(C.xytodir(dx, dy), "It's %s.", buf);
                }
            }
            return C.char(C.FALSE);
        }
    } else if (C.IS_DOOR(tmpr.typ)) {
        skip_testdiag: {
        testdiag: {
        if (C.closed_door(x, y)) {
            if (Number(Boolean(C.Blind && mode == C.DO_MOVE)))
                C.feel_location(x, y);
            if (C.Passes_walls) {
                ; /* do nothing */
            } else if (C.can_ooze(C.gy.youmonst)) {
                if (mode == C.DO_MOVE)
                    C.You("ooze under the door.");
            } else if (C.Underwater) {
                if (mode == C.DO_MOVE)
                    C.pline("There is an obstacle there.");
                return C.char(C.FALSE);
            } else if (Number(Boolean(C.tunnels(C.gy.youmonst.data)
                       && !C.needspick(C.gy.youmonst.data)))) {
                /* Eat the door. */
                if (Number(Boolean(mode == C.DO_MOVE && C.callLocal(still_chewing,x, y))))
                    return C.char(C.FALSE);
            } else {
                if (mode == C.DO_MOVE) {
                    if (C.amorphous(C.gy.youmonst.data))
                        C.You("try to ooze under the door,"
                             + " but can't squeeze your possessions through.");
                    if (Number(Boolean(C.flags.autoopen && !C.svc.context.run
                        && !C.Confusion && !C.Stunned && !C.Fumbling))) {
                        let tmp = C.int(C.doopen_indir(x, y));
                        /* if 'autounlock' includes Kick, we might have a
                           kick at the door queued up after doopen_indir() */
                        let cq = C.cmdq_peek(C.CQ_CANNED);

                        if (Number(Boolean(tmp == C.ECMD_OK && cq && cq.typ == C.CMDQ_EXTCMD
                            && C.pointerEqual(cq.ec_entry,C.ext_func_tab_from_func(C.dokick)))))
                            /* door hasn't been opened, but fake it so that
                               canned kick will be executed as next command */
                            C.svc.context.door_opened = C.char(C.TRUE);
                        else
                            C.svc.context.door_opened = C.char(!C.closed_door(x, y));
                        C.svc.context.move = C.char((Number(Boolean(ux != C.u.ux || uy != C.u.uy))));
                    } else if (Number(Boolean(x == ux || y == uy))) {
                        if (Number(Boolean(C.Blind || C.Stunned || C.ACURR(C.A_DEX) < 10
                            || C.Fumbling))) {
                            if (C.u.usteed) {
                                C.You_cant("lead %s through that closed door.",
                                         C.y_monnam(C.u.usteed));
                            } else {
                                C.pline("Ouch!  You bump into a door.");
                                C.exercise(C.A_DEX, C.FALSE);
                            }
                            /* use current move; needed for the "ouch" case
                               but done for steed case too for consistency;
                               we haven't opened a door but we're going to
                               return False and without having 'door_opened'
                               set, 'move' would get reset by caller */
                            C.svc.context.door_opened = C.char(C.svc.context.move = C.char(C.TRUE));
                            /* since we've just lied about successfully
                               moving, we need to manually stop running */
                            C.callLocal(nomul,0);
                        } else
                            C.pline("That door is closed.");
                    }
                } else if (Number(Boolean(mode == C.TEST_TRAV || mode == C.TEST_TRAP)))
                    break testdiag;
                return C.char(C.FALSE);
            }
        } else {break testdiag;}
        break skip_testdiag;
        }

            if (Number(Boolean(dx && dy && !C.Passes_walls
                && (!C.callLocal(doorless_door,x, y) || C.block_door(x, y))))) {
                /* Diagonal moves into a door are not allowed. */
                if (mode == C.DO_MOVE) {
                    if (C.Blind)
                        C.feel_location(x, y);
                    if (Number(Boolean(C.Underwater || C.flags.mention_walls)))
                        C.You_cant("move diagonally into an intact doorway.");
                }
                return C.char(C.FALSE);
            }
        
        }
    }
    if (Number(Boolean(dx && dy && C.callLocal(bad_rock,C.gy.youmonst.data, ux, y)
        && C.callLocal(bad_rock,C.gy.youmonst.data, x, uy)))) {
        /* Move at a diagonal. */
        switch (C.callLocal(cant_squeeze_thru,C.gy.youmonst)) {
        case 3:
            if (mode == C.DO_MOVE)
                C.You("cannot pass that way.");
            return C.char(C.FALSE);
        case 2:
            if (mode == C.DO_MOVE)
                C.You("are carrying too much to get through.");
            return C.char(C.FALSE);
        case 1:
            if (mode == C.DO_MOVE)
                C.Your("body is too large to fit through.");
            return C.char(C.FALSE);
        default:
            break; /* can squeeze through */
        }
    } else if (Number(Boolean(dx && dy && C.worm_cross(ux, uy, x, y)))) {
        /* consecutive long worm segments are at <ux,y> and <x,uy> */
        if (mode == C.DO_MOVE)
            C.pline("%s is in your way.", C.YMonnam(C.m_at(ux, y)));
        return C.char(C.FALSE);
    }
    /* Pick travel path that does not require crossing a trap.
     * Avoid water and lava using the usual running rules.
     * (but not u.ux/u.uy because findtravelpath walks toward u.ux/u.uy) */
    if (Number(Boolean(C.svc.context.run == 8 && (mode != C.DO_MOVE) && !C.u_at(x, y)))) {
        let t = C.t_at(x, y);

        if (Number(Boolean(t && t.tseen && t.ttyp != C.VIBRATING_SQUARE)))
            return C.char((mode == C.TEST_TRAP));

        /* FIXME: should be using lastseentyp[x][y] rather than seen vector
         */
        if (Number(Boolean((C.levl[x][y].seenv && C.is_pool_or_lava(x, y)) /* known pool/lava */
            && ((C.IS_WATERWALL(C.levl[x][y].typ) /* never enter wall of liquid */
                 || C.levl[x][y].typ == C.LAVAWALL)
                /* don't enter pool or lava (must be one of the two to
                   get here) unless flying or levitating or have known
                   water-walking for pool or known lava-walking and
                   already be on/over lava for lava */
                || !(Number(Boolean(C.Levitation || C.Flying
                     || (C.is_pool(x, y) ? C.Known_wwalking
                         : (Number(Boolean(C.Known_lwalking && C.is_lava(C.u.ux, C.u.uy))))))))))))
            return C.char((mode == C.TEST_TRAP));
    }

    if (mode == C.TEST_TRAP)
        return C.char(C.FALSE); /* do not move through traps */

    ust = C.levl[ux][uy];

    /* Now see if other things block our way . . */
    if (Number(Boolean(dx && dy && !C.Passes_walls && C.IS_DOOR(ust.typ)
        && (!C.callLocal(doorless_door,ux, uy) || C.block_entry(x, y))))) {
        /* Can't move at a diagonal out of a doorway with door. */
        if (Number(Boolean(mode == C.DO_MOVE && C.flags.mention_walls)))
            C.You_cant("move diagonally out of an intact doorway.");
        return C.char(C.FALSE);
    }

    if (Number(Boolean(C.sobj_at(C.BOULDER, x, y) && (C.Sokoban || !C.Passes_walls)))) {
        if (Number(Boolean(mode != C.TEST_TRAV && C.svc.context.run >= 2
            && !(Number(Boolean(C.Blind || C.Hallucination))) && !C.callLocal(could_move_onto_boulder,x, y)))) {
            if (Number(Boolean(mode == C.DO_MOVE && C.flags.mention_walls)))
                C.pline_dir(C.xytodir(dx,dy), "A boulder blocks your path.");
            return C.char(C.FALSE);
        }
        if (mode == C.DO_MOVE) {
            /* tunneling monsters will chew before pushing */
            if (Number(Boolean(C.tunnels(C.gy.youmonst.data) && !C.needspick(C.gy.youmonst.data)
                && !C.Sokoban))) {
                if (C.callLocal(still_chewing,x, y))
                    return C.char(C.FALSE);
            } else if (C.callLocal(moverock,) < 0)
                return C.char(C.FALSE);
        } else if (mode == C.TEST_TRAV) {
            let obj;

            /* never travel through boulders in Sokoban */
            if (C.Sokoban)
                return C.char(C.FALSE);

            /* don't pick two boulders in a row, unless there's a way thru */
            if (Number(Boolean(C.sobj_at(C.BOULDER, ux, uy) && !C.Sokoban))) {
                if (Number(Boolean(!C.Passes_walls
                    && !C.callLocal(could_move_onto_boulder,ux, uy)
                    && !(Number(Boolean(C.tunnels(C.gy.youmonst.data)
                         && !C.needspick(C.gy.youmonst.data))))
                    && !C.carrying(C.PICK_AXE) && !C.carrying(C.DWARVISH_MATTOCK)
                    && !(Number(Boolean((obj = C.carrying(C.WAN_DIGGING))
                         && !C.objects[obj.otyp].oc_name_known))))))
                    return C.char(C.FALSE);
            }
        }
        /* assume you'll be able to push it when you get there... */
    }

    /* OK, it is a legal place to move. */
    return C.char(C.TRUE);
}

/* DEBUG */
/* DEBUG */
export function findtravelpath(mode)
{
    mode=C.int(mode);
    if (!C.gt.travelmap)
        C.gt.travelmap = C.selection_new();
    /* if travel to adjacent, reachable location, use normal movement rules */
    if (Number(Boolean((mode == TRAVP_TRAVEL || mode == TRAVP_VALID) && C.svc.context.travel1
        /* was '&& distmin(u.ux, u.uy, u.tx, u.ty) == 1' */
        && C.next2u(C.u.tx, C.u.ty) /* one step away */
        /* handle restricted diagonals */
        && C.callLocal(crawl_destination,C.u.tx, C.u.ty)))) {
        C.callLocal(end_running,C.FALSE);
        if (C.callLocal(test_move,C.u.ux, C.u.uy, C.u.tx - C.u.ux, C.u.ty - C.u.uy, C.TEST_MOVE)) {
            if (mode == TRAVP_TRAVEL) {
                C.u.dx = C.int(C.u.tx - C.u.ux);
                C.u.dy = C.int(C.u.ty - C.u.uy);
                C.callLocal(nomul,0);
                C.iflags.travelcc.x = C.short(C.iflags.travelcc.y = C.short(0));
            }
            return C.char(C.TRUE);
        }
        if (mode == TRAVP_TRAVEL)
            C.svc.context.run = C.uint(8);
    }
    found: {
    if (Number(Boolean(C.u.tx != C.u.ux || C.u.ty != C.u.uy))) {
        let travel = C.localArray("coordxy",[80, 21]);
        let travelstepx = C.localArray("coordxy",[2, 1680]);
        let travelstepy = C.localArray("coordxy",[2, 1680]);
        let tx; let ty; let ux; let uy;
        let n = C.int(1);      /* max offset in travelsteps */
        let set = C.int(0);    /* two sets current and previous */
        let radius = C.int(1); /* search radius */
        let i;

        /* If guessing, first find an "obvious" goal location.  The obvious
         * goal is the position the player knows of, or might figure out
         * (couldsee) that is closest to the target on a straight path.
         */
        if (Number(Boolean(mode == TRAVP_GUESS || mode == TRAVP_VALID))) {
            tx = C.short(C.u.ux);
            ty = C.short(C.u.uy);
            ux = C.short(C.u.tx);
            uy = C.short(C.u.ty);
        } else {
            tx = C.short(C.u.tx);
            ty = C.short(C.u.ty);
            ux = C.short(C.u.ux);
            uy = C.short(C.u.uy);
        }

 noguess: for (;;) {
        void (C.memset(( travel), 0, BigInt(2*80*21)));
        travelstepx[0][0] = C.short(tx);
        travelstepy[0][0] = C.short(ty);

        while (n != 0) {
            let nn = C.int(0);

            for (i = C.int(0); i < n; i++) {
                let dir;
                let x = C.short(travelstepx[set][i]);
                let y = C.short(travelstepy[set][i]);
                /* no diagonal movement for grid bugs */
                let dirmax = C.int(C.NODIAG(C.u.umonnum) ? 4 : C.N_DIRS);
                let alreadyrepeated = C.char(C.FALSE);

                for (dir = C.int(0); dir < dirmax; ++dir) {
                    let nx = C.short(x + C.xdir[C.dirs_ord[dir]]);
                    let ny = C.short(y + C.ydir[C.dirs_ord[dir]]);

                    /*
                     * When guessing and trying to travel as close as possible
                     * to an unreachable target space, don't include spaces
                     * that would never be picked as a guessed target in the
                     * travel matrix describing hero-reachable spaces.
                     * This stops travel from getting confused and moving
                     * the hero back and forth in certain degenerate
                     * configurations of sight-blocking obstacles, e.g.
                     *
                     *  T         1. Dig this out and carry enough to not be
                     *   ####       able to squeeze through diagonal gaps.
                     *   #--.---    Stand at @ and target travel at space T.
                     *    @.....
                     *    |.....
                     *
                     *  T         2. couldsee() marks spaces marked a and x
                     *   ####       as eligible guess spaces to move the hero
                     *   a--.---    towards.  Space a is closest to T, so it
                     *    @xxxxx    gets chosen.  Travel system moves @ right
                     *    |xxxxx    to travel to space a.
                     *
                     *  T         3. couldsee() marks spaces marked b, c and x
                     *   ####       as eligible guess spaces to move the hero
                     *   a--c---    towards.  Since findtravelpath() is called
                     *    b@xxxx    repeatedly during travel, it doesn't
                     *    |xxxxx    remember that it wanted to go to space a,
                     *              so in comparing spaces b and c, b is
                     *              chosen, since it seems like the closest
                     *              eligible space to T. Travel system moves @
                     *              left to go to space b.
                     *
                     *            4. Go to 2.
                     *
                     * By limiting the travel matrix here, space a in the
                     * example above is never included in it, preventing
                     * the cycle.
                     */
                    if (Number(Boolean(!C.isok(nx, ny)
                        || ((mode == TRAVP_GUESS) && !C.couldsee(nx, ny)))))
                        continue;
                    if (Number(Boolean((!C.Passes_walls && !C.can_ooze(C.gy.youmonst)
                         && C.closed_door(x, y))
                        || (C.sobj_at(C.BOULDER, x, y)
                            && !C.callLocal(could_move_onto_boulder,x, y))
                        || C.callLocal(test_move,x, y, nx - x, ny - y, C.TEST_TRAP)))) {
                        /* closed doors and boulders usually cause a delay,
                           so prefer another path; however, giants and tiny
                           creatures can use m<dir> to move onto a boulder's
                           spot without pushing, so allow boulders for them */
                        if (travel[x][y] > radius - 3) {
                            if (!alreadyrepeated) {
                                travelstepx[1 - set][nn] = C.short(x);
                                travelstepy[1 - set][nn] = C.short(y);
                                /* don't change travel matrix! */
                                nn++;
                                alreadyrepeated = C.char(C.TRUE);
                            }
                            continue;
                        }
                    }
                    if (Number(Boolean(C.callLocal(test_move,x, y, nx - x, ny - y, C.TEST_TRAV)
                        && (C.levl[nx][ny].seenv
                            || (!C.Blind && C.couldsee(nx, ny)))))) {
                        if (Number(Boolean(nx == ux && ny == uy))) {
                            if (Number(Boolean(mode == TRAVP_TRAVEL || mode == TRAVP_VALID))) {
                                let visited = C.char(C.selection_getpoint(x, y, C.gt.travelmap));
                                C.u.dx = C.int(x - ux);
                                C.u.dy = C.int(y - uy);
                                if (Number(Boolean(mode == TRAVP_TRAVEL
                                    && ((x == C.u.tx && y == C.u.ty)
                                        || visited)))) {
                                    C.callLocal(nomul,0);
                                    /* reset run so domove run checks work */
                                    C.svc.context.run = C.uint(8);
                                    if (visited)
                                        C.You("stop, unsure which way to go.");
                                    else
                                        C.iflags.travelcc.x = C.short(C.iflags.travelcc.y = C.short(0));
                                }
                                C.selection_setpoint(C.u.ux, C.u.uy,
                                                   C.gt.travelmap, 1);
                                return C.char(C.TRUE);
                            }
                        } else if (!travel[nx][ny]) {
                            travelstepx[1 - set][nn] = C.short(nx);
                            travelstepy[1 - set][nn] = C.short(ny);
                            travel[nx][ny] = C.short(radius);
                            nn++;
                        }
                    }
                }
            }

            if (C.iflags.trav_debug) {
                /* Use of warning glyph is arbitrary. It stands out. */
                C.tmp_at(C.DISP_ALL, C.warning_to_glyph(1));
                for (i = C.int(0); i < nn; ++i) {
                    C.tmp_at(travelstepx[1 - set][i], travelstepy[1 - set][i]);
                }
                C.nh_delay_output();
                if (C.flags.runmode == C.RUN_CRAWL) {
                    C.nh_delay_output();
                    C.nh_delay_output();
                }
                C.tmp_at(C.DISP_END, 0);
            }

            n = C.int(nn);
            set = C.int(1 - set);
            radius++;
        }

        /* if guessing, find best location in travel matrix and go there */
        if (mode == TRAVP_GUESS) {
            let px = C.int(tx); let py = C.int(ty); /* pick location */
            let dist; let nxtdist; let d2; let nd2;
            let ctrav; let ptrav = C.int(C.COLNO*C.ROWNO);

            dist = C.int(C.distmin(ux, uy, tx, ty));
            d2 = C.int(C.dist2(ux, uy, tx, ty));
            for (tx = C.short(1); tx < C.COLNO; ++tx)
                for (ty = C.short(0); ty < C.ROWNO; ++ty)
                    if (Number(Boolean(C.couldsee(tx, ty) && (ctrav = C.int(travel[tx][ty])) > 0))) {
                        nxtdist = C.int(C.distmin(ux, uy, tx, ty));
                        if (Number(Boolean(nxtdist == dist && ctrav < ptrav))) {
                            nd2 = C.int(C.dist2(ux, uy, tx, ty));
                            if (nd2 < d2) {
                                /* prefer non-zigzag path */
                                px = C.int(tx);
                                py = C.int(ty);
                                d2 = C.int(nd2);
                                ptrav = C.int(ctrav);
                            }
                        } else if (nxtdist < dist) {
                            px = C.int(tx);
                            py = C.int(ty);
                            dist = C.int(nxtdist);
                            d2 = C.int(C.dist2(ux, uy, tx, ty));
                            ptrav = C.int(ctrav);
                        }
                    }

            if (C.u_at(px, py)) {
                /* no guesses, just go in the general direction */
                C.u.dx = C.int(C.sgn(C.u.tx - C.u.ux));
                C.u.dy = C.int(C.sgn(C.u.ty - C.u.uy));
                if (C.callLocal(test_move,C.u.ux, C.u.uy, C.u.dx, C.u.dy, C.TEST_MOVE)) {
                    C.selection_setpoint(C.u.ux, C.u.uy, C.gt.travelmap, 1);
                    return C.char(C.TRUE);
                }
                break found;
            }
            if (C.iflags.trav_debug) {
                /* Use of warning glyph is arbitrary. It stands out. */
                C.tmp_at(C.DISP_ALL, C.warning_to_glyph(2));
                C.tmp_at(px, py);
                C.nh_delay_output();
                if (C.flags.runmode == C.RUN_CRAWL) {
                    C.nh_delay_output();
                    C.nh_delay_output();
                    C.nh_delay_output();
                    C.nh_delay_output();
                }
                C.tmp_at(C.DISP_END, 0);
            }
            tx = C.short(px);
            ty = C.short(py);
            ux = C.short(C.u.ux);
            uy = C.short(C.u.uy);
            set = C.int(0);
            n = C.int(radius = C.int(1));
            mode = C.int(TRAVP_TRAVEL);
            continue noguess;
        }
        return C.char(C.FALSE);
        } // noguess
    }
    } // found
    C.u.dx = C.int(0);
    C.u.dy = C.int(0);
    C.callLocal(nomul,0);
    return C.char(C.FALSE);
}

/* try to escape being stuck in a trapped state by walking out of it;
   return true iff moving should continue to intended destination
   (all failures and most successful escapes leave hero at original spot) */
export function is_valid_travelpt(x,y)
{
    x=C.short(x);y=C.short(y);
    let tx = C.int(C.u.tx);
    let ty = C.int(C.u.ty);
    let ret;
    let glyph = C.int(C.glyph_at(x,y));

    if (C.u_at(x, y))
        return C.char(C.TRUE);
    if (Number(Boolean(C.isok(x,y) && C.glyph_is_cmap(glyph) && C.S_stone == C.glyph_to_cmap(glyph)
        && !C.levl[x][y].seenv)))
        return C.char(C.FALSE);
    C.u.tx = C.short(x);
    C.u.ty = C.short(y);
    ret = C.char(C.callLocal(findtravelpath,TRAVP_VALID));
    C.u.tx = C.short(tx);
    C.u.ty = C.short(ty);
    return C.char(ret);
}

/* targeted destination, <u.ux+u.dx,u.uy+u.dy> */
/* nonnull if another trap at <x,y> */
export function trapmove(x,y,desttrap)
{
    x=C.short(x);y=C.short(y);
    let anchored = C.char(C.FALSE);
    let predicament; let culprit;
    let steedname = C.charPointer(!C.u.usteed ? ( 0) : C.y_monnam(C.u.usteed));

    const wriggle_free = () => {
            if (C.u.usteed)
                C.pline("%s finally %s free.", C.upstart(steedname),
                      !anchored ? "lurches" : "wrenches the ball");
            else
                C.You("finally %s free.",
                    !anchored ? "wriggle" : "wrench the ball");
            if (anchored)
                C.buried_ball_to_punishment();
        
    };

    if (!C.u.utrap)
        return C.char(C.TRUE); /* sanity check */

    /*
     * Note: caller should call reset_utrap() when we set u.utrap to 0.
     */

    switch (C.u.utraptype) {
    case C.TT_BEARTRAP:
        if (C.flags.verbose) {
            predicament = C.charPointer("caught in a bear trap");
            if (C.u.usteed)
                C.Norep("%s is %s.", C.upstart(steedname), predicament);
            else
                C.Norep("You are %s.", predicament);
        }
        /* [why does diagonal movement give quickest escape?] */
        if (Number(Boolean((C.u.dx && C.u.dy) || !(C.rngCaller(1575,"trapmove"),C.rn2(5)))))
            C.u.utrap--;
        if (!C.u.utrap)
            {wriggle_free();break;}
        break;
    case C.TT_PIT:
        if (Number(Boolean(desttrap && desttrap.tseen
            && C.is_pit(desttrap.ttyp))))
            return C.char(C.TRUE); /* move into adjacent pit */
        /* try to escape; position stays same regardless of success */
        C.climb_pit();
        break;
    case C.TT_WEB:
        if (C.u_wield_art(C.ART_STING)) {
            /* escape trap but don't move and don't destroy it */
            C.u.utrap = C.uint(0); /* caller will call reset_utrap() */
            C.pline("Sting cuts through the web!");
            break;
        }
        if (--C.u.utrap) {
            if (C.flags.verbose) {
                predicament = C.charPointer("stuck to the web");
                if (C.u.usteed)
                    C.Norep("%s is %s.", C.upstart(steedname), predicament);
                else
                    C.Norep("You are %s.", predicament);
            }
        } else {
            if (C.u.usteed)
                C.pline("%s breaks out of the web.", C.upstart(steedname));
            else
                C.You("disentangle yourself.");
        }
        break;
    case C.TT_LAVA:
        if (C.flags.verbose) {
            predicament = C.charPointer("stuck in the lava");
            if (C.u.usteed)
                C.Norep("%s is %s.", C.upstart(steedname), predicament);
            else
                C.Norep("You are %s.", predicament);
        }
        if (!C.is_lava(x, y)) {
            C.u.utrap--;
            if ((C.u.utrap & 0xff) == 0) {
                C.u.utrap = C.uint(0);
                if (C.u.usteed)
                    C.You("lead %s to the edge of the %s.", steedname,
                        C.hliquid("lava"));
                else
                    C.You("pull yourself to the edge of the %s.",
                        C.hliquid("lava"));
            }
        }
        C.u.umoved = C.char(C.TRUE);
        break;
    case C.TT_INFLOOR:
    case C.TT_BURIEDBALL:
        anchored = C.char((C.u.utraptype == C.TT_BURIEDBALL));
        if (anchored) {
            let cc = C.recordLocal("nhcoord");

            cc.x = C.short(C.u.ux), cc.y = C.short(C.u.uy);
            /* can move normally within radius 1 of buried ball */
            if (Number(Boolean(C.buried_ball(cc) && C.dist2(x, y, cc.x, cc.y) <= 2))) {
                /* ugly hack: we need to issue some message here
                   in case "you are chained to the buried ball"
                   was the most recent message given, otherwise
                   our next attempt to move out of tether range
                   after this successful move would have its
                   can't-do-that message suppressed by Norep */
                if (C.flags.verbose)
                    C.Norep("You move within the chain's reach.");
                return C.char(C.TRUE);
            }
        }
        if (--C.u.utrap) {
            if (C.flags.verbose) {
                if (anchored) {
                    predicament = C.charPointer("chained to the");
                    culprit = C.charPointer("buried ball");
                } else {
                    predicament = C.charPointer("stuck in the");
                    culprit = C.charPointer(C.surface(C.u.ux, C.u.uy));
                }
                if (C.u.usteed) {
                    if (anchored)
                        C.Norep("You and %s are %s %s.", steedname, predicament,
                              culprit);
                    else
                        C.Norep("%s is %s %s.", C.upstart(steedname), predicament,
                              culprit);
                } else
                    C.Norep("You are %s %s.", predicament, culprit);
            }
        } else {
            wriggle_free();
        }
        break;
    case C.TT_NONE:
        C.impossible("trapmove: trapped in nothing?");
        break;
    default:
        C.impossible("trapmove: stuck in unknown trap? (%d)",
                   C.int( C.u.utraptype));
        break;
    }
    return C.char(C.FALSE);
}

export function u_rooted()
{
    
    if (!C.gy.youmonst.data.mmove) {
        C.You("are rooted %s.",
            Number(Boolean(C.Levitation || C.Is_airlevel(C.u.uz) || C.Is_waterlevel(C.u.uz)))
                ? "in place"
                : "to the ground");
        C.callLocal(nomul,0);
        return C.char(C.TRUE);
    }
    return C.char(C.FALSE);
}

export function notice_mon(mtmp)
{
    
    if (Number(Boolean(C.a11y.mon_notices && !C.a11y.mon_notices_blocked))) {
        let spot = C.char(Number(Boolean(C.canspotmon(mtmp)
            && !(Number(Boolean(C.is_hider(mtmp.data)
                 && (mtmp.mundetected
                     || C.M_AP_TYPE(mtmp) == C.M_AP_FURNITURE
                     || C.M_AP_TYPE(mtmp) == C.M_AP_OBJECT)))))));

        if (Number(Boolean(spot && !mtmp.mspotted && !C.DEADMONSTER(mtmp)))) {
            mtmp.mspotted = C.uint(C.TRUE);
            C.set_msg_xy(mtmp.mx, mtmp.my);
            C.You("%s %s.", C.canseemon(mtmp) ? "see" : "notice",
                C.x_monnam(mtmp,
                     mtmp.mtame ? C.ARTICLE_YOUR
                     : (Number(Boolean(!C.has_mgivenname(mtmp)
                        && !C.type_is_pname(mtmp.data)))) ? C.ARTICLE_A
                     : C.ARTICLE_NONE,
                     (Number(Boolean(mtmp.mpeaceful && !mtmp.mtame))) ? "peaceful" : 0,
                     C.has_mgivenname(mtmp) ? C.SUPPRESS_SADDLE : 0, C.FALSE));
        } else if (!spot) {
            mtmp.mspotted = C.uint(C.FALSE);
        }
    }
}

export function notice_mons_cmp(ptr1,ptr2)
{
    
    let m1 = C.pointerLoad("monst",C.pointerArray("monst", ptr1)); let m2 = C.pointerLoad("monst",C.pointerArray("monst", ptr2));

    return C.int((C.distu(m1.mx, m1.my) - C.distu(m2.mx, m2.my)));
}

/* maybe disturb buried zombies when an object is dropped or thrown nearby */
export function notice_all_mons(reset)
{
    reset=C.char(reset);
    if (Number(Boolean(C.a11y.mon_notices && !C.a11y.mon_notices_blocked))) {
        let mtmp;
        let arr = C.NULL;
        let j; let i = C.int(0); let cnt = C.int(0);

        for (mtmp = C.fmon; mtmp; mtmp = mtmp.nmon) {
            if (C.DEADMONSTER(mtmp))
                continue;
            if (C.canspotmon(mtmp))
                cnt++;
            else if (reset)
                mtmp.mspotted = C.uint(C.FALSE);
        }
        if (!cnt)
            return;

        arr = C.pointerArray("monst", C.alloc(C.ulong((C.ulong(cnt)) * (C.ulong(BigInt(8))))));

        for (mtmp = C.fmon; mtmp; mtmp = mtmp.nmon) {
            if (C.DEADMONSTER(mtmp))
                continue;
            if (!C.canspotmon(mtmp))
                mtmp.mspotted = C.uint(C.FALSE);
            else if (i < cnt)
                arr[i++] = mtmp;
        }

        if (i) {
            C.qsort(( arr), C.ulong( i), BigInt(8),
                  notice_mons_cmp);

            for (j = C.int(0); j < i; j++)
                C.callLocal(notice_mon,arr[j]);
        }

        C.free(arr);
    }
}

/* reduce zombification timeout of buried zombies around px, py */
export function impact_disturbs_zombies(obj,violent)
{
    violent=C.char(violent);
    /* if object won't make a noticeable impact, let buried zombies rest */
    if (Number(Boolean(obj.owt < (violent ? 10 : 100) || C.is_flimsy(obj))))
        return;

    C.callLocal(disturb_buried_zombies,obj.ox, obj.oy);
}

/* return an appropriate locomotion word for hero */
export function disturb_buried_zombies(x,y)
{
    x=C.short(x);y=C.short(y);
    let otmp;
    let t;

    for (otmp = C.svl.level.buriedobjlist; otmp; otmp = otmp.nobj) {
        if (Number(Boolean(otmp.otyp == C.CORPSE && otmp.timed
            && otmp.ox >= x - 1 && otmp.ox <= x + 1
            && otmp.oy >= y - 1 && otmp.oy <= y + 1
            && (t = C.long(C.peek_timer(C.ZOMBIFY_MON, C.callLocal(obj_to_any,otmp)))) > 0))) {
            t = C.long(C.stop_timer(C.ZOMBIFY_MON, C.callLocal(obj_to_any,otmp)));
            void (C.start_timer(((1) > ( (C.long((C.long(C.long((C.long(t)) * (C.long(2))))) / (C.long(3))))) ? (1) : ( (C.long((C.long(C.long((C.long(t)) * (C.long(2))))) / (C.long(3)))))), C.TIMER_OBJECT,
                               C.ZOMBIFY_MON, C.callLocal(obj_to_any,otmp)));
        }
    }
}

/* Return a simplified floor solid/liquid state based on hero's state */
export function u_locomotion(def)
{
    
    let capitalize = C.char((C.HEAP8[C.charPointer(def)] == C.highc(C.HEAP8[C.charPointer(def)])));

    /* regular locomotion() takes a monster type rather than a specific
       monster, so can't tell whether it is operating on hero;
       its is_flyer() and is_floater() tests wouldn't work on hero except
       when hero is polymorphed and not wearing an amulet of flying
       or boots/ring/spell of levitation */
    return C.Levitation ? (capitalize ? "Float" : "float")
           : C.Flying ? (capitalize ? "Fly" : "fly")
             : C.locomotion(C.gy.youmonst.data, def);
}

/* maybe show a helpful gameplay tip? returns True if tip gets shown */
export function u_simple_floortyp(x,y)
{
    x=C.short(x);y=C.short(y);
    let u_in_air = C.char((Number(Boolean(C.Levitation || C.Flying || !C.grounded(C.gy.youmonst.data)))));

    if (C.is_waterwall(x, y))
        return C.char(C.WATER); /* wall of water, fly/lev does not matter */
    if (C.levl[x][y].typ == C.LAVAWALL)
        return C.char(C.LAVAWALL); /* wall of lava, fly/lev does not matter */
    if (!u_in_air) {
        if (C.is_pool(x, y))
            return C.char(C.POOL);
        if (C.is_lava(x, y))
            return C.char(C.LAVAPOOL);
    }
    return C.char(C.ROOM);
}

/* Is it dangerous for hero to move to x,y due to water or lava? */
export function handle_tip(tip)
{
    tip=C.int(tip);
    if (!C.flags.tips)
        return C.char(C.FALSE);

    if (Number(Boolean(tip >= 0 && tip < C.NUM_TIPS && !(C.ulong((C.ulong(C.svc.context.tips)) & (C.ulong((1 << tip)))))))) {
        ((_hackTarget)=>_hackTarget.tips = C.ulong(C.ulong(C.ulong(_hackTarget.tips) | C.ulong((1 << tip)))))(C.svc.context);
        /* the "Tip:" prefix is a hint to use of OPTIONS=!tips to suppress */
        switch (tip) {
        case C.TIP_ENHANCE:
            C.pline("(Tip: use the #enhance command to advance them.)");
            break;
        case C.TIP_SWIM:
            C.pline("(Tip: use '%s' prefix to step in if you really want to.)",
                  C.visctrl(C.cmd_from_func(C.do_reqmenu)));
            break;
        case C.TIP_UNTRAP_MON:
            C.pline("(Tip: perhaps #untrap would help?)");
            break;
        case C.TIP_GETPOS:
            C.l_nhcore_call(C.NHCORE_GETPOS_TIP);
            break;
        default:
            C.impossible("Unknown tip in handle_tip(%i)", tip);
            break;
        }
        return C.char(C.TRUE);
    }
    return C.char(C.FALSE);
}

/* moving with 'm' prefix, bump into a monster? */
export function swim_move_danger(x,y)
{
    x=C.short(x);y=C.short(y);
    let newtyp = C.char(C.callLocal(u_simple_floortyp,x, y));
    let liquid_wall = C.char(Number(Boolean(C.IS_WATERWALL(newtyp) || newtyp == C.LAVAWALL)));

    if (Number(Boolean(C.Underwater && (C.is_pool(x,y) || C.IS_WATERWALL(newtyp)))))
        return C.char(C.FALSE);

    if (Number(Boolean((newtyp != C.callLocal(u_simple_floortyp,C.u.ux, C.u.uy))
        && !C.Stunned && !C.Confusion && C.levl[x][y].seenv
        && (C.is_pool(x, y) || C.is_lava(x, y) || liquid_wall)))) {

        /* FIXME: This can be exploited to identify ring of fire resistance
         * if the player is wearing it unidentified and has identified
         * fireproof boots of water walking and is walking over lava. However,
         * this is such a marginal case that it may not be worth fixing. */
        if (Number(Boolean((C.is_pool(x, y) && !C.Known_wwalking)
            /* is_lava(ux,uy): don't move onto/over lava with known
               lava-walking because it isn't completely safe, but do
               continue to move over lava if already doing so */
            || (C.is_lava(x, y) && !C.Known_lwalking && !C.is_lava(C.u.ux, C.u.uy))
            || liquid_wall))) {
            if (C.svc.context.nopick) {
                /* moving with m-prefix */
                ((_hackTarget)=>_hackTarget.tips = C.ulong(C.ulong(C.ulong(_hackTarget.tips) | C.ulong((1 << C.TIP_SWIM)))))(C.svc.context);
                return C.char(C.FALSE);
            } else if (Number(Boolean(C.ParanoidSwim || liquid_wall))) {
                C.You("avoid %s into the %s.",
                    C.ing_suffix(C.callLocal(u_locomotion,"step")),
                    C.waterbody_name(x, y));
                void (C.callLocal(handle_tip,C.TIP_SWIM));
                return C.char(C.TRUE);
            }
        }
    }
    return C.char(C.FALSE);
}

/* hero is moving, do we maybe attack a monster at (x,y)?
   returns TRUE if hero movement is used up.
   sets displaceu, if hero and monster could swap places instead.
*/
export function domove_bump_mon(mtmp,glyph)
{
    glyph=C.int(glyph);
    /* If they used a 'm' command, trying to move onto a monster
     * prints the below message and wastes a turn.  The exception is
     * if the monster is unseen and the player doesn't remember an
     * invisible monster--then, we fall through to do_attack() and
     * attack_check(), which still wastes a turn, but prints a
     * different message and makes the player remember the monster.
     */
    if (Number(Boolean(C.svc.context.nopick && !C.svc.context.travel
        && (C.canspotmon(mtmp) || C.glyph_is_invisible(glyph)
            || C.glyph_is_warning(glyph))))) {
        if (Number(Boolean(C.M_AP_TYPE(mtmp) && !C.Protection_from_shape_changers
            && !C.sensemon(mtmp))))
            C.stumble_onto_mimic(mtmp);
        else if (Number(Boolean(mtmp.mpeaceful && !C.Hallucination)))
            /* m_monnam(): "dog" or "Fido", no "invisible dog" or "it" */
            C.pline("Pardon me, %s.", C.m_monnam(mtmp));
        else
            C.You("move right into %s.", C.mon_nam(mtmp));
        return C.char(C.TRUE);
    }
    return C.char(C.FALSE);
}

/* force-fight iron bars with your weapon? */
export function domove_attackmon_at(mtmp,x,y,displaceu)
{
    x=C.short(x);y=C.short(y);
    /* assert(mtmp != NULL) */
    /* only attack if we know it's there
     * or if we used the 'F' command to fight blindly
     * or if it hides_under, in which case we call do_attack() to print
     * the Wait! message.
     * This is different from ceiling hiders, who aren't handled in
     * do_attack().
     */
    if (Number(Boolean(C.svc.context.forcefight || !mtmp.mundetected || C.sensemon(mtmp)
        || ((C.hides_under(mtmp.data) || mtmp.data.mlet == C.S_EEL)
            && !C.is_safemon(mtmp))))) {
        /* target monster might decide to switch places with you... */
        (displaceu).value = C.char((Number(Boolean(C.pointerEqual(mtmp.data,C.mons[C.PM_DISPLACER_BEAST]) && !(C.rngCaller(1972,"domove_attackmon_at"),C.rn2(2))
                      && mtmp.mux == C.u.ux0 && mtmp.muy == C.u.uy0
                      && !C.helpless(mtmp)
                      && !mtmp.meating && !mtmp.mtrapped
                      && !C.u.utrap && !C.u.ustuck && !C.u.usteed
                      && !(Number(Boolean(C.u.dx && C.u.dy
                           && (C.NODIAG(C.u.umonnum)
                               || (C.callLocal(bad_rock,mtmp.data, x, C.u.uy0)
                                   && C.callLocal(bad_rock,mtmp.data, C.u.ux0, y))
                               || (C.callLocal(bad_rock,C.gy.youmonst.data, C.u.ux0, y)
                                   && C.callLocal(bad_rock,C.gy.youmonst.data, x, C.u.uy0))))))
                      && C.goodpos(C.u.ux0, C.u.uy0, mtmp, C.GP_ALLOW_U)))));
        /* if not displacing, try to attack; note that it might evade;
           also, we don't attack tame or peaceful when safemon() */
        if (!(displaceu).value) {
            if (C.do_attack(mtmp))
                return C.char(C.TRUE);
        }
    }
    return C.char(C.FALSE);
}

/* force-fight a spider web with your weapon */
export function domove_fight_ironbars(x,y)
{
    x=C.short(x);y=C.short(y);
    if (Number(Boolean(C.svc.context.forcefight && C.levl[x][y].typ == C.IRONBARS && C.uwep))) {
        let obj = C.uwep;
        let breakflags = C.uint((C.BRK_BY_HERO | C.BRK_FROM_INV | C.BRK_MELEE));

        if (C.breaktest(obj)) {
            if (obj.quan > 1n)
                obj = C.splitobj(obj, 1n);
            else
                C.setuwep(C.view("obj", 0));
            C.freeinv(obj);
            breakflags = C.uint(C.uint(C.uint(breakflags) | C.uint(C.BRK_KNOWN2BREAK)));
        } else {
            breakflags = C.uint(C.uint(C.uint(breakflags) | C.uint(C.BRK_KNOWN2NOTBREAK)));
        }

        C.hit_bars(C.localPointer("obj *",()=>obj,_value=>obj=_value), C.u.ux, C.u.uy, x, y, breakflags);
        return C.char(C.TRUE);
    }
    return C.char(C.FALSE);
}

/* minus_2: restricted or unskilled: -1, basic: 0, skilled: 1,
               expert: 2, master: 3, grandmaster: 4 */
/* higher value is worse for player; for weaponless, adjust the
               chance to succeed rather than maybe make two tries */
/* maybe swap places with a pet? returns TRUE if swapped places */
export function domove_fight_web(x,y)
{
    x=C.short(x);y=C.short(y);
    let trap = C.t_at(x, y);

    if (Number(Boolean(C.svc.context.forcefight && trap && trap.ttyp == C.WEB && trap.tseen))) {
        let wtype = C.int(C.uwep_skill_type()); let wskill_minus_2 = C.int(((C.P_SKILL(wtype)) > ( C.P_UNSKILLED) ? (C.P_SKILL(wtype)) : ( C.P_UNSKILLED)) - 2); let roll = C.int((C.rngCaller(2032,"domove_fight_web"),C.rn2(C.uwep ? 20 : (45 - 5 * wskill_minus_2))));

        if (Number(Boolean(C.uwep && (C.u_wield_art(C.ART_STING)
                     || (C.uwep.oartifact && C.attacks(C.AD_FIRE, C.uwep)))))) {
            /* guaranteed success */
            C.pline("%s %s through the web!", C.bare_artifactname(C.uwep),
                  C.u_wield_art(C.ART_STING) ? "cuts" : "burns");

        /* is_blade() includes daggers (which are classified as PIERCE)
           but doesn't include axes and slashing polearms */
        } else if (Number(Boolean(C.uwep && !C.is_blade(C.uwep)
                   && (!C.u.twoweap || !C.is_blade(C.uswapwep))))) {
            let uwepstr = C.charPointer(0); let scndstr = C.charPointer(0); let uwepbuf = C.localArray("char",[256]); let scndbuf = C.localArray("char",[256]);
            let onewep;

            /* when dual wielding, second weapon will only be mentioned
               if it has a different type description from primary */
            C.Strcpy(uwepbuf, C.weapon_descr(C.uwep));
            C.Strcpy(scndbuf, C.u.twoweap ? C.weapon_descr(C.uswapwep) : "");
            onewep = C.char(Number(Boolean(!C.HEAP8[C.charPointer(scndbuf)] || !C.strcmp(uwepbuf, scndbuf))));
            if (Number(Boolean(!C.strcmpi(uwepbuf, "armor") || !C.strcmpi(uwepbuf, "food")
                || !C.strcmpi(uwepbuf, "venom")))) { /* as-is */
                /* non-weapon item wielded, of a type where an() would
                   result in weird phrasing; dual wield not possible */
                uwepstr = C.charPointer(uwepbuf);
            } else if (Number(Boolean(C.uwep.quan == 1n /* singular */
                       /* unless secondary is suppressed due to same type */
                       && !(Number(Boolean(C.u.twoweap && onewep)))))) {
                uwepstr = C.charPointer(C.an(uwepbuf));
            } else { /* plural */
                uwepstr = C.charPointer(C.makeplural(uwepbuf));
            }
            if (!onewep) {
                void ((C.uswapwep != C.NULL) || (C.__assert_fail("uswapwep != NULL","hack.c",2065,"domove_fight_web"),0));
                scndstr = C.charPointer((C.uswapwep.quan == 1n) ? C.an(scndbuf)
                                                 : C.makeplural(scndbuf));
            }
            C.You_cant("cut a web with %s%s%s!", uwepstr,
                     !onewep ? " or " : "", !onewep ? scndstr : "");
            return C.char(C.TRUE);

        /* weapon is ok; check whether hit is successful */
        } else if (roll > (C.acurrstr() - 2 /* 1..19 */
                           /* for weaponless, 'roll' was adjusted above */
                           + (C.uwep ? C.uwep.spe + wskill_minus_2 : 0))) {
            /* TODO: add failures, maybe make an occupation? */
            C.You("%s ineffectually at some of the strands.",
                C.uwep ? "hack" : "thrash");
            return C.char(C.TRUE);

        /* hit has succeeded */
        } else {
            C.You("%s through the web.", C.uwep ? "cut" : "punch");
            /* doesn't break "never hit with a wielded weapon" conduct */
            C.use_skill(wtype, 1);
        }

        C.deltrap(trap);
        C.newsym(x, y);
        return C.char(C.TRUE);
    }
    return C.char(C.FALSE);
}

/* force-fight (x,y) which doesn't have anything to fight */
export function domove_swap_with_pet(mtmp,x,y)
{
    x=C.short(x);y=C.short(y);
    let trap;
    /* if it turns out we can't actually move */
    let didnt_move = C.char(C.FALSE);
    let u_with_boulder = C.char((!C.pointerEqual(C.sobj_at(C.BOULDER, C.u.ux, C.u.uy),0)));

    /* seemimic/newsym should be done before moving hero, otherwise
       the display code will draw the hero here before we possibly
       cancel the swap below (we can ignore steed mx,my here) */
    C.u.ux = C.short(C.u.ux0), C.u.uy = C.short(C.u.uy0);
    mtmp.mundetected = C.uint(0);
    if (C.M_AP_TYPE(mtmp))
        C.seemimic(mtmp);
    C.u.ux = C.short(mtmp.mx), C.u.uy = C.short(mtmp.my); /* resume swapping positions */

    trap = mtmp.mtrapped ? C.t_at(mtmp.mx, mtmp.my) : 0;
    if (!trap)
        mtmp.mtrapped = C.uint(0);

    if (Number(Boolean(mtmp.mtrapped && C.is_pit(trap.ttyp)
        && C.sobj_at(C.BOULDER, trap.tx, trap.ty)))) {
        /* can't swap places with pet pinned in a pit by a boulder */
        didnt_move = C.char(C.TRUE);
    } else if (Number(Boolean(C.u.ux0 != x && C.u.uy0 != y && C.NODIAG(C.pointerDifference(mtmp.data,C.mons,"permonst"))))) {
        /* can't swap places when pet can't move to your spot */
        C.You("stop.  %s can't move diagonally.", C.YMonnam(mtmp));
        didnt_move = C.char(C.TRUE);
    } else if (Number(Boolean(u_with_boulder
               && !(Number(Boolean(C.verysmall(mtmp.data)
                    && (!mtmp.minvent || C.curr_mon_load(mtmp) <= 600))))))) {
        /* can't swap places when pet won't fit there with the boulder */
        C.You("stop.  %s won't fit into the same spot that you're at.",
            C.YMonnam(mtmp));
        didnt_move = C.char(C.TRUE);
    } else if (Number(Boolean(C.u.ux0 != x && C.u.uy0 != y && C.callLocal(bad_rock,mtmp.data, x, C.u.uy0)
               && C.callLocal(bad_rock,mtmp.data, C.u.ux0, y)
               && (C.bigmonst(mtmp.data) || (C.curr_mon_load(mtmp) > 600))))) {
        /* can't swap places when pet won't fit thru the opening */
        C.You("stop.  %s won't fit through.", C.YMonnam(mtmp));
        didnt_move = C.char(C.TRUE);
    } else if (Number(Boolean(mtmp.mpeaceful && mtmp.mtrapped))) {
        /* all mtame are also mpeaceful, so this affects pets too */
        void ((trap != C.NULL) || (C.__assert_fail("trap != NULL","hack.c",2143,"domove_swap_with_pet"),0)); /* implied by mtrapped */
        let what = C.charPointer(C.trapname(trap.ttyp, C.FALSE)); let which = C.charPointer("that ");
        let anbuf = C.localArray("char",[10]);

        if (!trap.tseen) {
            C.feeltrap(trap); /* show on map once mtmp is out of the way */
            which = C.charPointer(C.just_an(anbuf, what)); /* "a " or "an " */
        }
        C.You("stop.  %s can't move out of %s%s.", C.YMonnam(mtmp), which, what);
        void (C.callLocal(handle_tip,C.TIP_UNTRAP_MON));
        didnt_move = C.char(C.TRUE);
    } else if (Number(Boolean(mtmp.mpeaceful
               && (!C.goodpos(C.u.ux0, C.u.uy0, mtmp, 0)
                   || !C.pointerEqual(C.t_at(C.u.ux0, C.u.uy0),C.NULL)
                   || C.mundisplaceable(mtmp))))) {
        /* displacing peaceful into unsafe or trapped space, or trying to
           displace quest leader, Oracle, shk, priest, or vault guard */
        C.You("stop.  %s doesn't want to swap places.", C.YMonnam(mtmp));
        didnt_move = C.char(C.TRUE);
    } else {
        mtmp.mtrapped = C.uint(0);
        C.remove_monster(x, y);
        C.place_monster(mtmp, C.u.ux0, C.u.uy0);
        C.newsym(x, y);
        C.newsym(C.u.ux0, C.u.uy0);

        C.You("%s %s.", mtmp.mpeaceful ? "swap places with" : "frighten",
            C.x_monnam(mtmp,
                     mtmp.mtame ? C.ARTICLE_YOUR
                     : (Number(Boolean(!C.has_mgivenname(mtmp)
                        && !C.type_is_pname(mtmp.data)))) ? C.ARTICLE_THE
                     : C.ARTICLE_NONE,
                     (Number(Boolean(mtmp.mpeaceful && !mtmp.mtame))) ? "peaceful" : 0,
                     C.has_mgivenname(mtmp) ? C.SUPPRESS_SADDLE : 0, C.FALSE));

        /* check for displacing it into pools and traps */
        switch (C.minliquid(mtmp) ? C.Trap_Killed_Mon
                : C.mintrap(mtmp, C.NO_TRAP_FLAGS)) {
        case C.Trap_Effect_Finished:
            break;
        case C.Trap_Caught_Mon: /* trapped */
        case C.Trap_Moved_Mon: /* changed levels */
            /* there's already been a trap message, reinforce it */
            C.abuse_dog(mtmp);
            C.adjalign(-3);
            break;
        case C.Trap_Killed_Mon:
            /* drowned or died...
             * you killed your pet by direct action, so get experience
             * and possibly penalties;
             * we want the level gain message, if it happens, to occur
             * before the guilt message below
             */
            {
                /* minliquid() and mintrap() call mondead() rather than
                   killed() so we duplicate some of the latter here */
                let tmp; let mndx;

                if (!C.u.uconduct.killer++)
                    C.livelog_printf(C.LL_CONDUCT, "killed for the first time");
                mndx = C.int(C.monsndx(mtmp.data));
                tmp = C.int(C.experience(mtmp, C.int( C.svm.mvitals[mndx].died)));
                C.more_experienced(tmp, 0);
                C.newexplevel(); /* will decide if you go up */
            }
            /* That's no way to treat a pet!  Your god gets angry.
             *
             * [This has always been pretty iffy.  Why does your
             * patron deity care at all, let alone enough to get mad?]
             */
            if ((C.rngCaller(2213,"domove_swap_with_pet"),C.rn2(4))) {
                C.You_feel("guilty about losing your pet like this.");
                C.u.ugangr++;
                C.adjalign(-15);
            }
            break;
        default:
            C.impossible("that's strange, unknown mintrap result!");
            break;
        }
    }
    return C.char(!didnt_move);
}

/* does the plane of air disturb movement? */
export function domove_fight_empty(x,y)
{
    x=C.short(x);y=C.short(y);
    
    let off_edge = C.char(!C.isok(x, y));
    let glyph = C.int(!off_edge ? C.glyph_at(x, y) : C.GLYPH_UNEXPLORED);

    if (off_edge)
        x = C.short(0), y = C.short(1); /* for forcefight against the edge of the map; make
                       * sure 'bad' coordinates are within array bounds in
                       * case a bounds check gets overlooked; avoid <0,0>
                       * because m_at() might find a vault guard there */

    /* specifying 'F' with no monster wastes a turn */
    if (Number(Boolean(C.svc.context.forcefight
        /* remembered an 'I' && didn't use a move command */
        || (C.glyph_is_invisible(glyph) && !C.m_at(x, y)
            && !C.svc.context.nopick)))) {
        let boulder = 0;
        let explo = C.char((Number(Boolean(C.Upolyd && C.attacktype(C.gy.youmonst.data, C.AT_EXPL))))); let solid = C.char((Number(Boolean(off_edge || (!C.accessible(x, y)
                                      || C.IS_FURNITURE(C.levl[x][y].typ))))));
        let buf = C.localArray("char",[256]);

        const futile = () => {
        C.You("%s%s %s.",
            !(Number(Boolean(boulder || solid))) ? "" : !explo ? "harmlessly " : "futilely ",
            explo ? "explode at" : "attack", buf);

        C.callLocal(nomul,0);
        if (explo) {
            let attk = C.attacktype_fordmg(C.gy.youmonst.data, C.AT_EXPL, C.AD_ANY);

            /* no monster has been attacked so we have bypassed explum() */
            C.wake_nearto(C.u.ux, C.u.uy, 7 * 7); /* same radius as explum() */
            if (attk)
                C.explum(C.view("monst", 0), attk);
            C.u.mh = C.int(-1); /* dead in the current form */
            C.rehumanize();
        }
        return C.char(C.TRUE);
        };

        if (off_edge) {
            /* treat as if solid rock, even on planes' levels */
            C.Strcpy(buf, C.state.unknown_obstacle);
            return futile();
        }

        if (!C.Underwater) {
            boulder = C.sobj_at(C.BOULDER, x, y);
            /* if a statue is displayed at the target location,
               player is attempting to attack it [and boulder
               handling below is suitable for handling that] */
            if (Number(Boolean(C.glyph_is_statue(glyph)
                || (C.Hallucination && C.glyph_is_monster(glyph)))))
                boulder = C.sobj_at(C.STATUE, x, y);

            /* force fight at boulder/statue or wall/door while wielding
               pick:  start digging to break the boulder or wall */
            if (Number(Boolean(C.svc.context.forcefight
                /* can we dig? */
                && C.uwep && C.dig_typ(C.uwep, x, y)
                /* should we dig? */
                && !C.glyph_is_invisible(glyph) && !C.glyph_is_monster(glyph)))) {
                void (C.use_pick_axe2(C.uwep));
                return C.char(C.TRUE);
            }
        }

        /* about to become known empty -- remove 'I' if present */
        C.unmap_object(x, y);
        if (boulder)
            C.map_object(boulder, C.TRUE);
        C.newsym(x, y);
        glyph = C.int(C.glyph_at(x, y)); /* might have just changed */
        C.nhUse(glyph);

        if (boulder) {
            C.Strcpy(buf, C.ansimpleoname(boulder));
        } else if (Number(Boolean(C.Underwater && !C.is_pool(x, y)))) {
            /* Underwater, targeting non-water; the map just shows blank
               because you don't see remembered terrain while underwater;
               although the hero can attack an adjacent monster this way,
               assume he can't reach out far enough to distinguish terrain */
            C.Sprintf(buf, "%s",
                    (Number(Boolean(C.Is_waterlevel(C.u.uz) && C.levl[x][y].typ == C.AIR)))
                         ? "an air bubble"
                         : "nothing");
        } else if (solid) {
            /* glyph might indicate unseen terrain if hero is blind;
               unlike searching, this won't reveal what that terrain is;
               5.0: used to say "solid rock" for STONE, but that made it be
               different from unmapped walls outside of rooms (and was wrong
               on arboreal levels) */
            if (Number(Boolean(C.levl[x][y].seenv || C.IS_STWALL(C.levl[x][y].typ)
                || C.levl[x][y].typ == C.SDOOR || C.levl[x][y].typ == C.SCORR))) {
                glyph = C.int(C.back_to_glyph(x, y));
                C.Strcpy(buf, C.the(C.defsyms[C.glyph_to_cmap(glyph)].explanation));
            } else {
                C.Strcpy(buf, C.state.unknown_obstacle);
            }
            /* note: 'solid' is misleadingly named and catches pools
               of water and lava as well as rock and walls;
               5.0: furniture too */
        } else {
            C.Strcpy(buf, "thin air");
        }

        return futile();
    }
    return C.char(C.FALSE);
}

/* does water disturb the movement? */
export function air_turbulence()
{
    
    if (Number(Boolean(C.Is_airlevel(C.u.uz) && (C.rngCaller(2344,"air_turbulence"),C.rn2(4)) && !C.Levitation && !C.Flying))) {
        switch ((C.rngCaller(2345,"air_turbulence"),C.rn2(3))) {
        case 0:
            C.You("tumble in place.");
            C.exercise(C.A_DEX, C.FALSE);
            break;
        case 1:
            C.You_cant("control your movements very well.");
            break;
        case 2:
            C.pline("It's hard to walk in thin air.");
            C.exercise(C.A_DEX, C.TRUE);
            break;
        }
        return C.char(C.TRUE);
    }
    return C.char(C.FALSE);
}

export function water_turbulence(x,y)
{
    
    if (C.u.uinwater) {
        let wtcap;
        let wtmod = C.int((C.Swimming ? C.MOD_ENCUMBER : C.SLT_ENCUMBER));

        C.water_friction();
        if (Number(Boolean(!C.u.dx && !C.u.dy))) {
            C.callLocal(nomul,0);
            return C.char(C.TRUE);
        }
        (x).value = C.short(C.u.ux + C.u.dx);
        (y).value = C.short(C.u.uy + C.u.dy);

        /* are we trying to move out of water while carrying too much? */
        if (Number(Boolean(C.isok((x).value, (y).value) && !C.is_pool((x).value, (y).value) && !C.Is_waterlevel(C.u.uz)
            && (wtcap = C.int(C.callLocal(near_capacity,))) > wtmod))) {
            /* when escaping from drowning you need to be unencumbered
               in order to crawl out of water, but when not drowning,
               doing so while encumbered is feasible; if in an aquatic
               form, stressed or less is allowed; otherwise (magical
               breathing), only burdened is allowed */
            C.You("are carrying too much to climb out of the water.");
            C.callLocal(nomul,0);
            return C.char(C.TRUE);
        }
    }
    return C.char(C.FALSE);
}

export function slippery_ice_fumbling()
{
    
    let on_ice = C.char(Number(Boolean(!C.Levitation && C.is_ice(C.u.ux, C.u.uy))));
    let iceskater = C.u.usteed ? C.u.usteed : C.gy.youmonst;

    if (on_ice) {
        if (Number(Boolean((C.uarmf && C.objdescr_is(C.uarmf, "snow boots"))
            || C.resists_cold(iceskater) || C.Flying
            || C.is_floater(iceskater.data) || C.is_clinger(iceskater.data)
            || C.is_whirly(iceskater.data)))) {
            on_ice = C.char(C.FALSE);
        } else if (!(C.rngCaller(2407,"slippery_ice_fumbling"),C.rn2(C.Cold_resistance ? 3 : 2))) {
            C.HFumbling = C.long(C.long(C.long(C.HFumbling) | C.long(C.FROMOUTSIDE)));
            C.HFumbling = C.long(C.long(C.long(C.HFumbling) & C.long(~C.TIMEOUT)));
            C.HFumbling = C.long(C.long(C.long(C.HFumbling) + C.long(1))); /* slip on next move */
        }
    }
    if (Number(Boolean(!on_ice && (C.long((C.long(C.HFumbling)) & (C.long(C.FROMOUTSIDE)))))))
        C.HFumbling = C.long(C.long(C.long(C.HFumbling) & C.long(~C.FROMOUTSIDE)));
}

/* change movement dir if impaired. return TRUE if can't move */
export function u_maybe_impaired()
{
    
    return C.char((Number(Boolean(C.Stunned || (C.Confusion && !(C.rngCaller(2420,"u_maybe_impaired"),C.rn2(5)))))));
}

export function impaired_movement(x,y)
{
    
    if (C.callLocal(u_maybe_impaired,)) {
        let tries = C.int(0);

        do {
            if (tries++ > 50) {
                C.callLocal(nomul,0);
                return C.char(C.TRUE);
            }
            C.confdir(C.TRUE);
            (x).value = C.short(C.u.ux + C.u.dx);
            (y).value = C.short(C.u.uy + C.u.dy);
        } while (Number(Boolean(!C.isok((x).value, (y).value) || C.callLocal(bad_rock,C.gy.youmonst.data, (x).value, (y).value))));
    }
    return C.char(C.FALSE);
}

export function avoid_moving_on_trap(x,y,msg)
{
    x=C.short(x);y=C.short(y);msg=C.char(msg);
    let trap;

    if (Number(Boolean((trap = C.t_at(x, y)) && trap.tseen
        /* the vibrating square is implemented as a trap but treated as if
           it were a type of terrain */
        && trap.ttyp != C.VIBRATING_SQUARE))) {
        if (Number(Boolean(msg && C.flags.mention_walls))) {
            C.set_msg_xy(x, y);
            C.You("stop in front of %s.",
                C.an(C.trapname(trap.ttyp, C.FALSE)));
        }
        return C.char(C.TRUE);
    }
    return C.char(C.FALSE);
}

/* when running/rushing, avoid stepping on a known trap or pool of liquid.
   returns TRUE if avoided. */
export function avoid_moving_on_liquid(x,y,msg)
{
    x=C.short(x);y=C.short(y);msg=C.char(msg);
    let in_air = C.char((Number(Boolean(C.Levitation || C.Flying))));

    /* don't stop if you're not on a transition between terrain types... */
    if (Number(Boolean((C.levl[x][y].typ == C.levl[C.u.ux][C.u.uy].typ
         /* or you are using shift-dir running and the transition isn't
            dangerous... */
         || (C.svc.context.run < 2 && (!C.is_lava(x, y) || in_air))
         || C.svc.context.travel)
        /* and you know you won't fall in */
        && (in_air || C.Known_lwalking || (C.is_pool(x, y) && C.Known_wwalking))
        && !(Number(Boolean(C.IS_WATERWALL(C.levl[x][y].typ) || C.levl[x][y].typ == C.LAVAWALL)))))) {
        /* XXX: should send 'is_clinger(gy.youmonst.data)' here once clinging
           polyforms are allowed to move over water */
        return C.char(C.FALSE); /* liquid is safe to traverse */
    } else if (Number(Boolean(C.is_pool_or_lava(x, y) && C.levl[x][y].seenv))) {
        if (Number(Boolean(msg && C.flags.mention_walls))) {
            C.set_msg_xy(x, y);
            C.You("stop at the edge of the %s.",
                C.hliquid(C.is_pool(x,y) ? "water" : "lava"));
        }
        return C.char(C.TRUE);
    }
    return C.char(C.FALSE);
}

/* if paranoid_confirm:Trap is enabled, check whether the next step forward
   needs player confirmation due to visible region or discovered trap;
   result: True => stop moving, False => proceed */
export function avoid_running_into_trap_or_liquid(x,y)
{
    x=C.short(x);y=C.short(y);
    let would_stop = C.char((C.svc.context.run >= 2));
    if (!C.svc.context.run)
        return C.char(C.FALSE);

    if (Number(Boolean(C.callLocal(avoid_moving_on_trap,x,y, would_stop)
        || (C.Blind && C.callLocal(avoid_moving_on_liquid,x,y, would_stop))))) {
        C.callLocal(nomul,0);
        if (would_stop)
            C.svc.context.move = C.char(0);
        return C.char(would_stop);
    }
    return C.char(C.FALSE);
}

/* trying to move out-of-bounds? */
export function avoid_trap_andor_region(x,y)
{
    x=C.short(x);y=C.short(y);
    let qbuf = C.localArray("char",[128]);
    let newreg; let oldreg;
    let trap = C.NULL;

    /* treat entering a visible gas cloud region like entering a trap;
       there could be a known trap as well as a region at the target spot;
       if so, ask about entring the region first; even though this could
       lead to two consecutive confirmation prompts, the situation seems
       to be too uncommon to warrant a separate case with combined
       trap+region confirmation */
    if (Number(Boolean(C.ParanoidTrap && !C.Blind && !C.Stunned && !C.Confusion && !C.Hallucination
        /* skip if player used 'm' prefix or is moving recklessly */
        && (!C.svc.context.nopick || C.svc.context.run)
        /* check for region(s) */
        && !C.pointerEqual((newreg = C.visible_region_at(x, y)),0)
        && (C.pointerEqual((oldreg = C.visible_region_at(C.u.ux, C.u.uy)),0)
            /* if moving from one region into another, only ask for
               confirmation if the one potentially being entered inflicts
               damage (poison gas) and the one being exited doesn't (vapor) */
            || (C.reg_damg(newreg) > 0 && C.reg_damg(oldreg) == 0))
        /* check whether attempted move will be viable */
        && C.callLocal(test_move,C.u.ux, C.u.uy, C.u.dx, C.u.dy, C.TEST_MOVE)))
        /* we don't override confirmation for poison resistance since the
           region also hinders hero's vision even if/when no damage is done */
    ) {
        C.nh_snprintf("avoid_trap_andor_region",2544,qbuf, BigInt(1*128), "%s into that %s cloud?",
                 C.callLocal(u_locomotion,"step"),
                 (C.reg_damg(newreg) > 0) ? "poison gas" : "vapor");
        if (!C.paranoid_query(C.ParanoidConfirm, C.upstart(qbuf))) {
            C.callLocal(nomul,0);
            C.svc.context.move = C.char(0);
            return C.char(C.TRUE);
        }
    }

    /* maybe ask player for confirmation before walking into known trap */
    if (Number(Boolean(C.ParanoidTrap && !C.Stunned && !C.Confusion
        /* skip if player used 'm' prefix or is moving recklessly */
        && (!C.svc.context.nopick || C.svc.context.run)
        /* check for discovered trap */
        && !C.pointerEqual((trap = C.t_at(x, y)),0) && trap.tseen
        /* check whether attempted move will be viable */
        && C.callLocal(test_move,C.u.ux, C.u.uy, C.u.dx, C.u.dy, C.TEST_MOVE)
        /* override confirmation if the trap is harmless to the hero */
        && (C.immune_to_trap(C.gy.youmonst, trap.ttyp) != C.TRAP_CLEARLY_IMMUNE
            /* Hallucination: all traps still show as ^, but the
               hero can't tell what they are, so treat as dangerous */
            || C.Hallucination)))) {
        let traptype = C.int((C.Hallucination ? (C.rngCaller(2565,"avoid_trap_andor_region"),C.rnd(C.TRAPNUM - 1)) : C.int( trap.ttyp)));
        let into = C.char(C.into_vs_onto(traptype));

        C.nh_snprintf("avoid_trap_andor_region",2570,qbuf, BigInt(1*128), "Really %s %s that %s?",
                 C.callLocal(u_locomotion,"step"), into ? "into" : "onto",
                 C.defsyms[C.trap_to_defsym(traptype)].explanation);
        /* handled like paranoid_confirm:pray; when paranoid_confirm:trap
           isn't set, don't ask at all but if it is set (checked above),
           ask via y/n if parnoid_confirm:confirm isn't also set or via
           yes/no if it is */
        if (!C.paranoid_query(C.ParanoidConfirm, qbuf)) {
            C.callLocal(nomul,0);
            C.svc.context.move = C.char(0);
            return C.char(C.TRUE);
        }
    }
    return C.char(C.FALSE);
}

/* carrying too much to be able to move? */
export function move_out_of_bounds(x,y)
{
    x=C.short(x);y=C.short(y);
    if (!C.isok(x, y)) {
        if (C.svc.context.forcefight)
            return C.char(C.callLocal(domove_fight_empty,x, y));

        if (C.flags.mention_walls) {
            let dx = C.short(C.u.dx); let dy = C.short(C.u.dy);

            if (Number(Boolean(dx && dy))) { /* diagonal */
                /* only as far as possible diagonally if in very
                   corner; otherwise just report whichever of the
                   cardinal directions has reached its limit */
                if (C.isok(x, C.u.uy))
                    dx = C.short(0);
                else if (C.isok(C.u.ux, y))
                    dy = C.short(0);
            }
            C.You("have already gone as far %s as possible.",
                C.directionname(C.xytodir(dx, dy)));
        }
        C.callLocal(nomul,0);
        C.svc.context.move = C.char(0);
        return C.char(C.TRUE);
    }
    return C.char(C.FALSE);
}

/* try to pull free from sticking monster, or you release a monster
   you're sticking to. returns TRUE if you lose your movement. */
export function carrying_too_much()
{
    
    let wtcap;

    if (Number(Boolean(((wtcap = C.int(C.callLocal(near_capacity,))) >= C.OVERLOADED
         || (wtcap > C.SLT_ENCUMBER
             && (C.Upolyd ? (Number(Boolean(C.u.mh < 5 && C.u.mh != C.u.mhmax)))
                        : (Number(Boolean(C.u.uhp < 10 && C.u.uhp != C.u.uhpmax))))))
        && !C.Is_airlevel(C.u.uz)))) {
        if (wtcap < C.OVERLOADED) {
            C.You("don't have enough stamina to move.");
            C.exercise(C.A_CON, C.FALSE);
        } else
            C.You("collapse under your load.");
        C.callLocal(nomul,0);
        return C.char(C.TRUE);
    }
    return C.char(C.FALSE);
}

export function escape_from_sticky_mon(x,y)
{
    x=C.short(x);y=C.short(y);
    if (Number(Boolean(C.u.ustuck && (x != C.u.ustuck.mx || y != C.u.ustuck.my)))) {
        let mtmp;

        if (!C.m_next2u(C.u.ustuck)) {
            /* perhaps it fled (or was teleported or ... ) */
            C.set_ustuck(C.view("monst", 0));
        } else if (C.sticks(C.gy.youmonst.data)) {
            /* When polymorphed into a sticking monster,
             * u.ustuck means it's stuck to you, not you to it.
             */
            mtmp = C.u.ustuck;
            C.set_ustuck(C.view("monst", 0));
            C.You("release %s.", C.y_monnam(mtmp));
        } else {
            /* If holder is asleep or paralyzed:
             *      37.5% chance of getting away,
             *      12.5% chance of waking/releasing it;
             * otherwise:
             *       7.5% chance of getting away.
             * [strength ought to be a factor]
             * If holder is tame and there is no conflict,
             * guaranteed escape.
             */
            switch ((C.rngCaller(2664,"escape_from_sticky_mon"),C.rn2(!C.u.ustuck.mcanmove ? 8 : 40))) {
            case 3:
                if (!C.u.ustuck.mcanmove) {
                    /* it's free to move on next turn */
                    C.u.ustuck.mfrozen = C.uint(1);
                    C.u.ustuck.msleeping = C.uint(0);
                }
                ;
                /*FALLTHRU*/
            default:
                if (Number(Boolean(C.Conflict || C.u.ustuck.mconf || !C.u.ustuck.mtame))) {
                    C.You("cannot escape from %s!", C.y_monnam(C.u.ustuck));
                    C.callLocal(nomul,0);
                    return C.char(C.TRUE);
                }
                ;
                /*FALLTHRU*/
            case 0:
            case 1:
            case 2:
                mtmp = C.u.ustuck;
                C.set_ustuck(C.view("monst", 0));
                C.You("pull free from %s.", C.y_monnam(mtmp));
                break;
            }
        }
    }
    return C.char(C.FALSE);
}

export function domove()
{
    
        let ux1 = C.short(C.u.ux); let uy1 = C.short(C.u.uy);

        C.gd.domove_succeeded = C.long(0n);
        C.callLocal(domove_core,);
        /* gd.domove_succeeded is available to make assessments now */
        if ((C.long((C.long(C.gd.domove_succeeded)) & (C.long((C.DOMOVE_RUSH | C.DOMOVE_WALK))))) != 0) {
            C.callLocal(maybe_smudge_engr,ux1, uy1, C.u.ux, C.u.uy);
            C.maybe_adjust_hero_bubble();
        }
        C.gd.domove_attempting = C.long(0n);

        C.gk.kickedloc.x = C.short(0), C.gk.kickedloc.y = C.short(0);
}

/* dragging ball will skip a move */
/* delay output based on value of runmode,
   if hero is running or doing a multi-turn action */
export function domove_core()
{
    
    let mtmp;
    let tmpr;
    let x; let y;
    let glyph;
    let chainx = C.short(0); let chainy = C.short(0); let ballx = C.short(0); let bally = C.short(0);       /* ball&chain new positions */
    let bc_control = C.int(0);                 /* control for ball&chain */
    let cause_delay = C.char(C.FALSE); let displaceu = C.char(C.FALSE);          /* involuntary swap */

    if (C.svc.context.travel) {
        if (!C.callLocal(findtravelpath,TRAVP_TRAVEL))
            void (C.callLocal(findtravelpath,TRAVP_GUESS));
        C.svc.context.travel1 = C.char(0);
    }

    if (C.callLocal(carrying_too_much,))
        return;

    if (C.u.uswallow) {
        C.u.dx = C.int(C.u.dy = C.int(0));
        x = C.short(C.u.ustuck.mx), y = C.short(C.u.ustuck.my);
        C.u_on_newpos(x, y); /* set u.ux,uy and handle CLIPPING */
        mtmp = C.u.ustuck;
    } else {
        if (C.callLocal(air_turbulence,))
            return;

        /* check slippery ice */
        C.callLocal(slippery_ice_fumbling,);

        x = C.short(C.u.ux + C.u.dx);
        y = C.short(C.u.uy + C.u.dy);
        if (C.callLocal(impaired_movement,C.localPointer("coordxy",()=>x,_value=>x=_value), C.localPointer("coordxy",()=>y,_value=>y=_value)))
            return;

        /* turbulence might alter your actual destination */
        if (C.callLocal(water_turbulence,C.localPointer("coordxy",()=>x,_value=>x=_value), C.localPointer("coordxy",()=>y,_value=>y=_value)))
            return;

        if (C.callLocal(move_out_of_bounds,x, y))
            return;

        if (C.callLocal(avoid_running_into_trap_or_liquid,x, y))
            return;

        if (C.callLocal(escape_from_sticky_mon,x, y))
            return;

        mtmp = C.m_at(x, y);
        if (Number(Boolean(mtmp && !C.is_safemon(mtmp)))) {
            /* Don't attack if you're running, and can see it */
            /* It's fine to displace pets, though */
            /* We should never get here if forcefight */
            if (Number(Boolean(C.svc.context.run && ((!C.Blind && C.mon_visible(mtmp)
                                 && ((C.M_AP_TYPE(mtmp) != C.M_AP_FURNITURE
                                      && C.M_AP_TYPE(mtmp) != C.M_AP_OBJECT)
                                     || C.Protection_from_shape_changers))
                                || C.sensemon(mtmp))))) {
                C.callLocal(nomul,0);
                C.svc.context.move = C.char(0);
                return;
            }
        }
    }

    C.u.ux0 = C.short(C.u.ux);
    C.u.uy0 = C.short(C.u.uy);
    C.gb.bhitpos.x = C.short(x);
    C.gb.bhitpos.y = C.short(y);
    tmpr = C.levl[x][y];
    glyph = C.int(C.glyph_at(x, y));

    if (mtmp) {
        /* don't stop travel when displacing pets; if the
           displace fails for some reason, do_attack() in uhitm.c
           will stop travel rather than domove */
        if (Number(Boolean(!C.is_safemon(mtmp) || C.svc.context.forcefight)))
            C.callLocal(nomul,0);

        if (C.callLocal(domove_bump_mon,mtmp, glyph))
            return;

        /* attack monster */
        if (C.callLocal(domove_attackmon_at,mtmp, x, y, C.localPointer("boolean",()=>displaceu,_value=>displaceu=_value)))
            return;
    }

    if (!displaceu) {

        if (C.callLocal(domove_fight_ironbars,x, y))
            return;

        if (C.callLocal(domove_fight_web,x, y))
            return;

        if (C.callLocal(domove_fight_empty,x, y))
            return;

        void (C.unmap_invisible(x, y));
        /* not attacking an animal, so we try to move */
        if (Number(Boolean((C.u.dx || C.u.dy) && C.u.usteed && C.stucksteed(C.FALSE)))) {
            C.callLocal(nomul,0);
            return;
        }

        if (C.callLocal(u_rooted,))
            return;

        /* handling for paranoid_confirm:Trap which doubles as
           paranoid_confirm:Region */
        if (C.ParanoidTrap) {
            if (C.callLocal(avoid_trap_andor_region,x, y))
                return;
        }

        if (C.u.utrap) { /* when u.utrap is True, displaceu is False */
            let moved = C.char(C.callLocal(trapmove,x, y, C.view("trap", C.NULL)));

            if (!C.u.utrap) {
                C.disp.botl = C.char(C.TRUE);
                C.reset_utrap(C.TRUE); /* might resume levitation or flight */
            }
            /* might not have escaped, or did escape but remain in the same
               spot */
            if (!moved)
                return;
        }

        if (!C.callLocal(test_move,C.u.ux, C.u.uy, x - C.u.ux, y - C.u.uy, C.DO_MOVE)) {
            if (!C.svc.context.door_opened) {
                C.svc.context.move = C.char(0);
                C.callLocal(nomul,0);
            }
            return;
        }

        /* Is it dangerous to swim in water or lava? */
        if (C.callLocal(swim_move_danger,x, y)) {
            C.svc.context.move = C.char(0);
            C.callLocal(nomul,0);
            return;
        }

    } /* !dislacedu */

    /* Move ball and chain.  */
    if (C.Punished)
        if (!C.drag_ball(x, y, C.localPointer("int",()=>bc_control,_value=>bc_control=_value), C.localPointer("coordxy",()=>ballx,_value=>ballx=_value), C.localPointer("coordxy",()=>bally,_value=>bally=_value), C.localPointer("coordxy",()=>chainx,_value=>chainx=_value), C.localPointer("coordxy",()=>chainy,_value=>chainy=_value),
                       C.localPointer("boolean",()=>cause_delay,_value=>cause_delay=_value), C.TRUE))
            return;

    /* Check regions entering/leaving */
    if (!C.in_out_region(x, y))
        return;

    mtmp = C.m_at(x, y);
    /* mtmp can be null at this point */

    /* tentatively move the hero plus steed; leave CLIPPING til later */
    ((_hackTarget)=>_hackTarget.ux = C.short(C.int(C.int(_hackTarget.ux) + C.int(C.u.dx))))(C.u);
    ((_hackTarget)=>_hackTarget.uy = C.short(C.int(C.int(_hackTarget.uy) + C.int(C.u.dy))))(C.u);

    C.m_postmove_effect(C.gy.youmonst);

    if (C.u.usteed) {
        C.u.usteed.mx = C.short(C.u.ux);
        C.u.usteed.my = C.short(C.u.uy);
        /* [if move attempt ends up being blocked, should training count?] */
        C.exercise_steed(); /* train riding skill */
    }

    if (mtmp) {
        if (displaceu) {
            let noticed_it = C.char((Number(Boolean(C.canspotmon(mtmp)
                                  || C.glyph_is_invisible(glyph)
                                  || C.glyph_is_warning(glyph)))));

            C.remove_monster(C.u.ux, C.u.uy);
            C.place_monster(mtmp, C.u.ux0, C.u.uy0);
            C.newsym(C.u.ux, C.u.uy);
            C.newsym(C.u.ux0, C.u.uy0);
            /* monst still knows where hero is */
            mtmp.mux = C.short(C.u.ux), mtmp.muy = C.short(C.u.uy);

            C.pline("%s swaps places with you...",
                  !noticed_it ? C.Something : C.YMonnam(mtmp));
            if (!C.canspotmon(mtmp))
                C.map_invisible(C.u.ux0, C.u.uy0);
            /* monster chose to swap places; hero doesn't get any credit
               or blame if something bad happens to it */
            C.svc.context.mon_moving = C.char(1);
            if (!C.minliquid(mtmp))
                void (C.mintrap(mtmp, C.NO_TRAP_FLAGS));
            C.svc.context.mon_moving = C.char(0);

        /*
         * If safepet at destination then move the pet to the hero's
         * previous location using the same conditions as in do_attack().
         * there are special extenuating circumstances:
         * (1) if the pet dies then your god angers,
         * (2) if the pet gets trapped then your god may disapprove.
         *
         * Ceiling-hiding pets are skipped by this section of code, to
         * be caught by the normal falling-monster code.
         */
        } else if (Number(Boolean(C.is_safemon(mtmp)
                   && !(Number(Boolean(C.is_hider(mtmp.data) && mtmp.mundetected)))))) {
            if (!C.callLocal(domove_swap_with_pet,mtmp, x, y)) {
                C.u.ux = C.short(C.u.ux0), C.u.uy = C.short(C.u.uy0); /* didn't move after all */
                /* could skip this since we're about to call u_on_newpos() */
                if (C.u.usteed)
                    C.u.usteed.mx = C.short(C.u.ux), C.u.usteed.my = C.short(C.u.uy);
            }
        }
    }  /* mtmp != NULL */

    /* tentative move above didn't handle CLIPPING, in case there was a
       monster in the way and the move attempt ended up being blocked;
       do a full re-position now, possibly back to where hero started */
    C.u_on_newpos(C.u.ux, C.u.uy);

    C.reset_occupations();
    if (C.svc.context.run) {
        if (C.svc.context.run < 8)
            if (Number(Boolean(C.IS_DOOR(tmpr.typ) || C.IS_OBSTRUCTED(tmpr.typ)
                || C.IS_FURNITURE(tmpr.typ))))
                C.callLocal(nomul,0);
    }

    /* your tread on the ground may disturb the slumber of nearby zombies */
    if (Number(Boolean(!C.Levitation && !C.Flying && !C.Stealth
        && C.gy.youmonst.data.cwt >= (Math.trunc((C.WT_ELF) / (2))))))
        C.callLocal(disturb_buried_zombies,C.u.ux, C.u.uy);

    if (Number(Boolean(C.hides_under(C.gy.youmonst.data) || C.gy.youmonst.data.mlet == C.S_EEL
        || C.u.dx || C.u.dy)))
        void (C.hideunder(C.gy.youmonst));

    /*
     * Mimics (or whatever) become noticeable if they move and are
     * imitating something that doesn't move.  We could extend this
     * to non-moving monsters...
     */
    if (Number(Boolean((C.u.dx || C.u.dy) && (C.U_AP_TYPE == C.M_AP_OBJECT
                           || C.U_AP_TYPE == C.M_AP_FURNITURE))))
        C.gy.youmonst.m_ap_type = C.M_AP_NOTHING;

    C.check_leash(C.u.ux0, C.u.uy0);

    if (Number(Boolean(C.u.ux0 != C.u.ux || C.u.uy0 != C.u.uy))) {
        /* let caller know so that an evaluation may take place */
        ((_hackTarget)=>_hackTarget.domove_succeeded = C.long(C.long(C.long(_hackTarget.domove_succeeded) | C.long((C.long((C.long(C.gd.domove_attempting)) & (C.long((C.DOMOVE_RUSH | C.DOMOVE_WALK)))))))))(C.gd);
        C.u.umoved = C.char(C.TRUE);
        /* Clean old position -- vision_recalc() will print our new one. */
        C.newsym(C.u.ux0, C.u.uy0);
        /* Since the hero has moved, adjust what can be seen/unseen. */
        C.vision_recalc(1); /* Do the work now in the recover time. */
        C.callLocal(invocation_message,);
    }

    if (C.Punished) /* put back ball and chain */
        C.move_bc(0, bc_control, ballx, bally, chainx, chainy);

    if (C.u.umoved)
        C.callLocal(spoteffects,C.TRUE);

    /* delay next move because of ball dragging */
    /* must come after we finished picking up, in spoteffects() */
    if (cause_delay) {
        C.callLocal(nomul,-2);
        C.gm.multi_reason = C.charPointer("dragging an iron ball");
        C.gn.nomovemsg = C.charPointer("");
    }

    C.callLocal(runmode_delay_output,);
}

export function runmode_delay_output()
{
    
    if (Number(Boolean((C.svc.context.run || C.gm.multi) && C.flags.runmode != C.RUN_TPORT))) {
        /* for tport mode, don't display anything until we've stopped;
           for normal (leap) mode, update display every 7th step
           (relative to turn counter; ought to be to start of running);
           for walk and crawl (visual debugging) modes, update the
           display after every step */
        if (Number(Boolean(C.flags.runmode != C.RUN_LEAP || !(C.long((C.long(C.svm.moves)) % (C.long(7n))))))) {
            /* moveloop() suppresses time_botl when running */
            C.disp.time_botl = C.char(C.flags.time);
            C.curs_on_u();
            C.nh_delay_output();
            if (C.flags.runmode == C.RUN_CRAWL) {
                C.nh_delay_output();
                C.nh_delay_output();
                C.nh_delay_output();
                C.nh_delay_output();
            }
        }
    }
}

/* HP loss or passing out from overexerting yourself */
export function maybe_smudge_engr(x1,y1,x2,y2)
{
    x1=C.short(x1);y1=C.short(y1);x2=C.short(x2);y2=C.short(y2);
    let ep;

    if (C.can_reach_floor(C.TRUE)) {
        if (Number(Boolean((ep = C.engr_at(x1, y1)) && ep.engr_type != C.HEADSTONE)))
            C.wipe_engr_at(x1, y1, (C.rngCaller(3026,"maybe_smudge_engr"),C.rnd(5)), C.FALSE);
        if (Number(Boolean((x2 != x1 || y2 != y1)
                && (ep = C.engr_at(x2, y2)) && ep.engr_type != C.HEADSTONE)))
            C.wipe_engr_at(x2, y2, (C.rngCaller(3029,"maybe_smudge_engr"),C.rnd(5)), C.FALSE);
    }
}

/* combat increases metabolism */
export function overexert_hp()
{
    
    let hp = (!C.Upolyd ? C.fieldPointer(C.u,"uhp") : C.fieldPointer(C.u,"mh"));

    if ((hp).value > 1) {
        ((_hackTarget)=>_hackTarget.value = C.int(C.int(C.int(_hackTarget.value) - C.int(1))))(hp);
        C.disp.botl = C.char(C.TRUE);
    } else {
        C.You("pass out from exertion!");
        C.exercise(C.A_CON, C.FALSE);
        C.fall_asleep(-10, C.FALSE);
    }
}

export function overexertion()
{
    
    /* this used to be part of domove() when moving to a monster's
       position, but is now called by do_attack() so that it doesn't
       execute if you decline to attack a peaceful monster */
    C.gethungry();
    if (Number(Boolean((C.long((C.long(C.svm.moves)) % (C.long(3n)))) != 0n && C.callLocal(near_capacity,) >= C.HVY_ENCUMBER))) {
        C.callLocal(overexert_hp,);
    }
    return C.char(C.char( (C.gm.multi < 0))); /* might have fainted (forced to sleep) */
}

/* for status: set up iflags.terrain_typ, an index into terrain_descrp[];
   some types need fixing up  */
export function invocation_message()
{
    
    /* a special clue-msg when on the Invocation position */
    if (Number(Boolean(C.callLocal(invocation_pos,C.u.ux, C.u.uy) && !C.On_stairs(C.u.ux, C.u.uy)))) {
        let buf = C.localArray("char",[256]);
        let otmp = C.carrying(C.CANDELABRUM_OF_INVOCATION);

        C.callLocal(nomul,0); /* stop running or travelling */
        if (C.u.usteed)
            C.Sprintf(buf, "beneath %s", C.y_monnam(C.u.usteed));
        else if (Number(Boolean(C.Levitation || C.Flying)))
            C.Strcpy(buf, "beneath you");
        else
            C.Sprintf(buf, "under your %s", C.makeplural(C.body_part(C.FOOT)));

        C.You_feel("a strange vibration %s.", buf);
        C.u.uevent.uvibrated = C.uint(1);
        if (Number(Boolean(otmp && otmp.spe == 7 && otmp.lamplit)))
            C.pline("%s %s!", C.The(C.xname(otmp)),
                  C.Blind ? "throbs palpably" : "glows with a strange light");
    }
}

/* don't bother -- Passes_walls for hero is rare, moving
         * from one type of wall to another even rarer, and the
         * cost of some extra once per move status updates is low */
/* (note: lastseentyp[][] never yields SDOOR) */
/* any wall type would do, terrain_descr[] is "Wall" for all;
               forcing just one avoids false 'changed' detection below if
               hero with Passes_walls ability moves from one to another */
/* moving onto different terrain;
   might be going into solid rock, inhibiting levitation or flight,
   or coming back out of such, reinstating levitation/flying */
export function classify_terrain()
{
    
    let lev = C.levl[C.u.ux][C.u.uy];
    let typ = C.int(C.svl.lastseentyp[C.u.ux][C.u.uy]); /* lev->typ */

    /*
     * If the terrain under the hero is different now from what it
     * was on the previous check, bring iflags.terrain_typ up to date
     * and request a status update.  Unless hero is running--then the
     * update request will be suppressed.
     */

    if (C.Underwater) {
        typ = C.int(C.xSUBMERGED);
    } else {
        switch (typ) {
        case C.STONE:
            if (C.svl.level.flags.arboreal)
                typ = C.int(C.TREE);
            break;
        case C.CORR:
        case C.ROOM:
            /* this matches surface() but 'floor' is odd in many places */
            typ = C.int(!C.Is_earthlevel(C.u.uz) ? C.xFLOOR : C.xGROUND);
            break;
        case C.DOOR:
            /* defaults to "doorway" (door-less or broken) */
            if ((lev.doormask & C.D_ISOPEN) != 0)
                typ = C.int(C.xOPENDOOR);
            else if ((lev.doormask & (C.D_CLOSED | C.D_LOCKED | C.D_TRAPPED)) != 0)
                typ = C.int(C.xSHUTDOOR);
            break;
        case C.DRAWBRIDGE_UP:
            /* ICE, MOAT, LAVA, or 'STONE' (which ought to be 'room') */
            typ = C.int(C.db_under_typ(lev.drawbridgemask));
            if (Number(Boolean(typ == C.STONE || typ == C.ROOM)))
                typ = C.int(C.xGROUND);
            break;
        case C.MOAT:
            /* moat and swamp handling match waterbody_name()'s result */
            if (C.Is_medusa_level(C.u.uz))
                typ = C.int(C.xSEA);
            else if (C.Is_juiblex_level(C.u.uz))
                typ = C.int(C.xSWAMP);
            break;
        case C.WATER:
            if (!C.Is_waterlevel(C.u.uz))
                typ = C.int(C.xWATERWALL);
            break;
        default:
            break;
        }
    }

    if (typ != C.iflags.terrain_typ) {
        /* terrain at hero's spot is different */
        C.iflags.terrain_typ = C.int(typ);
        /* request a status update unless hero is running */
        if (Number(Boolean(C.flags.terrainstatus && !C.svc.context.run)))
            C.disp.botl = C.char(C.TRUE);
    }
}

/* set or clear u.uinwater */
export function switch_terrain()
{
    
    let lev = C.levl[C.u.ux][C.u.uy];
    let blocklev = C.char((Number(Boolean(C.IS_OBSTRUCTED(lev.typ) || C.closed_door(C.u.ux, C.u.uy)
                        || C.IS_WATERWALL(lev.typ)
                        || lev.typ == C.LAVAWALL)))); let was_levitating = C.char(!!C.Levitation); let was_flying = C.char(!!C.Flying);

    if (blocklev) {
        /* called from spoteffects(), stop levitating but skip float_down() */
        if (C.Levitation)
            C.You_cant("levitate in here.");
        C.BLevitation = C.long(C.long(C.long(C.BLevitation) | C.long(C.FROMOUTSIDE)));
    } else if (C.BLevitation) {
        C.BLevitation = C.long(C.long(C.long(C.BLevitation) & C.long(~C.FROMOUTSIDE)));
        /* we're probably levitating now; if not, we must be chained
           to a buried iron ball so get float_up() feedback for that */
        if (Number(Boolean(C.Levitation || C.BLevitation)))
            C.float_up();
    }
    /* the same terrain that blocks levitation also blocks flight */
    if (blocklev) {
        if (C.Flying)
            C.You_cant("fly in here.");
        C.BFlying = C.long(C.long(C.long(C.BFlying) | C.long(C.FROMOUTSIDE)));
    } else if (C.BFlying) {
        C.BFlying = C.long(C.long(C.long(C.BFlying) & C.long(~C.FROMOUTSIDE)));
        C.float_vs_flight(); /* maybe toggle (BFlying & I_SPECIAL) */
        /* [minor bug: we don't know whether this is beginning flight or
           resuming it; that could be tracked so that this message could
           be adjusted to "resume flying", but isn't worth the effort...] */
        if (C.Flying)
            C.You("start flying.");
    }
    if (Number(Boolean((!!C.Levitation ^ was_levitating) || (!!C.Flying ^ was_flying))))
        C.disp.botl = C.char(C.TRUE); /* update Lev/Fly status condition */

    if (C.flags.terrainstatus)
        C.callLocal(classify_terrain,);
}

/* extracted from spoteffects; called by spoteffects to check for entering or
   leaving a pool of water/lava, and by moveloop to check for staying on one;
   returns true to skip rest of spoteffects */
export function set_uinwater(in_out)
{
    in_out=C.int(in_out);
    if (in_out != C.int( C.u.uinwater)) {
        C.u.uinwater = C.uint(in_out ? 1 : 0);
        C.callLocal(switch_terrain,);
    }
}

/* true if called by spoteffects */
export function pooleffects(newspot)
{
    newspot=C.char(newspot);
    /* check for leaving water */
    if (C.u.uinwater) {
        let still_inwater = C.char(C.FALSE); /* assume we're getting out */

        if (!C.is_pool(C.u.ux, C.u.uy)) {
            if (C.Is_waterlevel(C.u.uz)) {
                C.You("pop into an air bubble.");
                C.iflags.last_msg = C.int(C.PLNMSG_BACK_ON_GROUND);
            } else if (C.is_lava(C.u.ux, C.u.uy)) {
                C.You("leave the %s...", C.hliquid("water")); /* oops! */
            } else {
                C.back_on_ground(C.FALSE);
            }
        } else if (C.Is_waterlevel(C.u.uz)) {
            still_inwater = C.char(C.TRUE);
        } else if (C.Levitation) {
            C.You("pop out of the %s like a cork!", C.hliquid("water"));
        } else if (C.Flying) {
            C.You("fly out of the %s.", C.hliquid("water"));
        } else if (C.Wwalking) {
            C.You("slowly rise above the surface.");
        } else {
            still_inwater = C.char(C.TRUE);
        }
        if (!still_inwater) {
            let was_underwater = C.char((Number(Boolean(C.Underwater && !C.Is_waterlevel(C.u.uz)))));

            C.callLocal(set_uinwater,0); /* u.uinwater = 0; leave the water */
            if (was_underwater) { /* restore vision */
                C.docrt();
                C.gv.vision_full_recalc = C.char(1);
            }
        }
    }

    /* check for entering water or lava */
    if (Number(Boolean(!C.u.ustuck && !C.Levitation && !C.Flying && C.is_pool_or_lava(C.u.ux, C.u.uy)))) {
        if (Number(Boolean(C.u.usteed && !C.grounded(C.u.usteed.data)))) {
            /* floating or clinging steed keeps hero safe (is_flyer() test
               is redundant; it can't be true since Flying yielded false) */
            return C.char(C.FALSE);
        } else if (C.u.usteed) {
            /* steed enters pool */
            C.dismount_steed(C.Underwater ? C.DISMOUNT_FELL : C.DISMOUNT_GENERIC);
            /* dismount_steed() -> float_down() -> pickup()
               (float_down doesn't do autopickup on Air or Water) */
            if (Number(Boolean(C.Is_airlevel(C.u.uz) || C.Is_waterlevel(C.u.uz))))
                return C.char(C.FALSE);
            /* even if we actually end up at same location, float_down()
               has already done trap and pickup actions of spoteffects() */
            if (newspot)
                C.callLocal(check_special_room,C.FALSE); /* spoteffects */
            return C.char(C.TRUE);
        }
        /* not mounted */

        /* if hiding on ceiling then don't automatically enter pool */
        if (Number(Boolean(C.Upolyd && C.ceiling_hider(C.mons[C.u.umonnum]) && C.u.uundetected)))
            return C.char(C.FALSE);

        /* drown(),lava_effects() return true if hero changes
           location while surviving the problem */
        if (C.is_lava(C.u.ux, C.u.uy)) {
            if (C.lava_effects())
                return C.char(C.TRUE);
        } else if (Number(Boolean((!C.Wwalking || C.is_waterwall(C.u.ux,C.u.uy))
                   && (newspot || !C.u.uinwater
                       || !(Number(Boolean(C.Swimming || C.Amphibious || C.Breathless))))))) {
            if (C.drown())
                return C.char(C.TRUE);
        }
    }
    return C.char(C.FALSE);
}

/* The Dead Zone */
/* returns first matching monster */
export function spoteffects(pick)
{
    pick=C.char(pick);
    
    
    
    
    

    let mtmp;
    let trap = C.t_at(C.u.ux, C.u.uy);
    let trapflag = C.int(C.iflags.failing_untrap ? C.FAILEDUNTRAP : 0);

    /* prevent recursion from affecting the hero all over again
       [hero poly'd to iron golem enters water here, drown() inflicts
       damage that triggers rehumanize() which calls spoteffects()...] */
    if (Number(Boolean(C.state.inspoteffects && C.u_at(C.state.spotloc.x, C.state.spotloc.y)
        /* except when reason is transformed terrain (ice -> water) */
        && C.state.spotterrain == C.levl[C.u.ux][C.u.uy].typ
        /* or transformed trap (land mine -> pit) */
        && (!C.state.spottrap || !trap || trap.ttyp == C.state.spottraptyp))))
        return;
    /* when float_down() puts hero into lava and she teleports out,
       defer spoteffects() until after "you are back on solid <surface>" */
    if (C.iflags.in_lava_effects)
        return;

    spotdone: {
    ++C.state.inspoteffects;
    C.state.spotterrain = C.int(C.levl[C.u.ux][C.u.uy].typ);
    C.state.spotloc.x = C.short(C.u.ux), C.state.spotloc.y = C.short(C.u.uy);

    /* moving onto different terrain might cause Lev or Fly to toggle;
      level change sets <ux0,uy0> to <ux,uy>, so this spotterrain
      check always fails then, but it also sets iflags.terrain_typ */
    if (Number(Boolean(C.state.spotterrain != C.levl[C.u.ux0][C.u.uy0].typ
        || C.iflags.terrain_typ == C.MAX_TYPE)))
        C.callLocal(switch_terrain,);

    if (C.callLocal(pooleffects,C.TRUE))
        break spotdone;

    C.callLocal(check_special_room,C.FALSE);
    if (Number(Boolean(C.IS_SINK(C.levl[C.u.ux][C.u.uy].typ) && C.Levitation)))
        C.callLocal(dosinkfall,);
    if (!C.gi.in_steed_dismounting) { /* if dismounting, check again later */
        let pit;

        /* if levitation is due to time out at the end of this
           turn, allowing it to do so could give the perception
           that a trap here is being triggered twice, so adjust
           the timeout to prevent that */
        if (Number(Boolean(trap && (C.long((C.long(C.HLevitation)) & (C.long(C.TIMEOUT)))) == 1n
            && !(Number(Boolean(C.ELevitation || (C.long((C.long(C.HLevitation)) & (C.long(~(C.long((C.long(C.I_SPECIAL)) | (C.long(C.TIMEOUT)))))))))))))) {
            if ((C.rngCaller(3364,"spoteffects"),C.rn2(2))) { /* defer timeout */
                C.incr_itimeout(C.fieldPointer(C.HLevitation,"intrinsic"), 1n);
            } else { /* timeout early */
                if (C.float_down(C.long((C.long(C.I_SPECIAL)) | (C.long(C.TIMEOUT))), 0n)) {
                    /* levitation has ended; we've already triggered
                       any trap and [usually] performed autopickup */
                    trap = 0;
                    pick = C.char(C.FALSE);
                }
            }
        }
        /*
         * If not a pit, pickup before triggering trap.
         * If pit, trigger trap before pickup.
         */
        pit = C.char((Number(Boolean(trap && C.is_pit(trap.ttyp)))));
        if (Number(Boolean(pick && !pit)))
            void (C.pickup(1));

        if (trap) {
            /*
             * dotrap on a fire trap calls melt_ice() which triggers
             * spoteffects() (again) which can trigger the same fire
             * trap (again).  Use static spottrap to prevent that.
             * We track spottraptyp because some traps morph (landmine
             * to pit) and any new trap type should get triggered.
             */
            if (Number(Boolean(!C.state.spottrap || C.state.spottraptyp != trap.ttyp))) {
                C.state.spottrap = trap;
                C.state.spottraptyp = C.uint(trap.ttyp);
                C.dotrap(trap, trapflag); /* fall into arrow trap, etc. */
                C.state.spottrap = C.view("trap", 0);
                C.state.spottraptyp = C.uint(C.NO_TRAP);
            }
        }
        if (Number(Boolean(pick && pit)))
            void (C.pickup(1));
    }
    /* Warning alerts you to ice danger */
    if (Number(Boolean(C.Warning && C.is_ice(C.u.ux, C.u.uy)))) {
        
        let time_left = C.long(C.spot_time_left(C.u.ux, C.u.uy, C.MELT_ICE_AWAY));

        if (Number(Boolean(time_left && time_left < 15n)))
            C.pline("%s", C.state.icewarnings[(time_left < 5n) ? 2
                                    : (time_left < 10n) ? 1
                                      : 0]);
    }

    if (Number(Boolean(!C.pointerEqual((mtmp = C.m_at(C.u.ux, C.u.uy)),0) && !C.u.uswallow))) {
        mtmp.mundetected = C.uint(mtmp.msleeping = C.uint(0));
        switch (mtmp.data.mlet) {
        case C.S_PIERCER:
            C.pline("%s suddenly drops from the %s!", C.Amonnam(mtmp),
                  C.ceiling(C.u.ux, C.u.uy));
            if (mtmp.mtame) { /* jumps to greet you, not attack */
                ;
            } else if (C.hard_helmet(C.uarmh)) {
                C.pline("Its blow glances off your %s.",
                      C.helm_simple_name(C.uarmh));
            } else if (C.u.uac + 3 <= (C.rngCaller(3428,"spoteffects"),C.rnd(20))) {
                C.You("are almost hit by %s!",
                    C.x_monnam(mtmp, C.ARTICLE_A, "falling", 0, C.TRUE));
            } else {
                let dmg;

                C.You("are hit by %s!",
                    C.x_monnam(mtmp, C.ARTICLE_A, "falling", 0, C.TRUE));
                dmg = C.int((C.rngCaller(3436,"spoteffects"),C.d(4, 6)));
                if (C.Half_physical_damage)
                    dmg = C.int(Math.trunc(((dmg + 1)) / (2)));
                C.mdamageu(mtmp, dmg);
            }
            break;
        default: /* monster surprises you. */
            if (mtmp.mtame)
                C.pline("%s jumps near you from the %s.", C.Amonnam(mtmp),
                      C.ceiling(C.u.ux, C.u.uy));
            else if (mtmp.mpeaceful) {
                C.You("surprise %s!",
                    Number(Boolean(C.Blind && !C.sensemon(mtmp))) ? C.something : C.a_monnam(mtmp));
                mtmp.mpeaceful = C.uint(0);
            } else
                C.pline("%s attacks you by surprise!", C.Amonnam(mtmp));
            break;
        }
        C.mnexto(mtmp, C.RLOC_NOMSG); /* have to move the monster */
    }
    } // spotdone
    if (!--C.state.inspoteffects) {
        C.state.spotterrain = C.int(C.STONE); /* 0 */
        C.state.spotloc.x = C.short(C.state.spotloc.y = C.short(0));
    }
    return;
}

/* check whether room contains a particular type of furniture */
export function monstinroom(mdat,roomno)
{
    roomno=C.int(roomno);
    let mtmp;

    for (mtmp = C.fmon; mtmp; mtmp = mtmp.nmon) {
        if (C.DEADMONSTER(mtmp))
            continue;
        if (Number(Boolean(C.pointerEqual(mtmp.data,mdat)
            && C.strchr(C.callLocal(in_rooms,mtmp.mx, mtmp.my, 0), roomno + C.ROOMOFFSET))))
            return mtmp;
    }
    return C.view("monst", 0);
}

export function furniture_present(furniture,roomno)
{
    furniture=C.int(furniture);roomno=C.int(roomno);
    let x; let y; let lx; let ly; let hx; let hy;
    let sroom = C.svr.rooms[roomno];

    ly = C.int(sroom.ly), hy = C.int(sroom.hy);
    lx = C.int(sroom.lx); hx = C.int(sroom.hx);
    /* the inside_room() check handles irregularly shaped rooms */
    for (y = C.int(ly); y <= hy; ++y)
        for (x = C.int(lx); x <= hx; ++x)
            if (Number(Boolean(C.levl[x][y].typ == furniture && C.inside_room(sroom, x, y))))
                return C.char(C.TRUE);
    return C.char(C.FALSE);
}

/* is (x,y) in a town? */
export function in_rooms(x,y,typewanted)
{
    x=C.short(x);y=C.short(y);typewanted=C.int(typewanted);
    const buf = C.in_rooms_buf;
    let rno = C.char(0); let ptr = C.charPointer((C.charPointer(buf) + 4));
    let typefound; let min_x; let min_y; let max_x; let max_y_offset; let step;
    let lev;


    switch (rno = C.char(C.levl[x][y].roomno)) {
    case C.NO_ROOM:
        return ptr;
    case C.SHARED:
        step = C.int(2);
        break;
    case C.SHARED_PLUS:
        step = C.int(1);
        break;
    default: /* i.e. a regular room # */
        if ((!typewanted || (typefound = C.svr.rooms[rno - C.ROOMOFFSET].rtype) == typewanted || (typewanted == C.SHOPBASE && typefound > C.SHOPBASE)))
            C.HEAP8[C.charPointer((--ptr))] = C.char(rno);
        return ptr;
    }

    min_x = C.int(x - 1);
    max_x = C.int(x + 1);
    if (x < 1)
        min_x = C.int(C.int(C.int(min_x) + C.int(step)));
    else if (x >= C.COLNO)
        max_x = C.int(C.int(C.int(max_x) - C.int(step)));

    min_y = C.int(y - 1);
    max_y_offset = C.int(2);
    if (min_y < 0) {
        min_y = C.int(C.int(C.int(min_y) + C.int(step)));
        max_y_offset = C.int(C.int(C.int(max_y_offset) - C.int(step)));
    } else if ((min_y + max_y_offset) >= C.ROWNO)
        max_y_offset = C.int(C.int(C.int(max_y_offset) - C.int(step)));

    for (x = C.short(min_x); x <= max_x; x = C.short(C.int(C.int(x) + C.int(step)))) {
        lev = C.levl[x][min_y];
        y = C.short(0);
        if (Number(Boolean((rno = C.char(lev[y].roomno)) >= C.ROOMOFFSET && !C.strchr(ptr, rno)
            && (!typewanted || (typefound = C.svr.rooms[rno - C.ROOMOFFSET].rtype) == typewanted || (typewanted == C.SHOPBASE && typefound > C.SHOPBASE)))))
            C.HEAP8[C.charPointer((--ptr))] = C.char(rno);
        y = C.short(C.int(C.int(y) + C.int(step)));
        if (y > max_y_offset)
            continue;
        if (Number(Boolean((rno = C.char(lev[y].roomno)) >= C.ROOMOFFSET && !C.strchr(ptr, rno)
            && (!typewanted || (typefound = C.svr.rooms[rno - C.ROOMOFFSET].rtype) == typewanted || (typewanted == C.SHOPBASE && typefound > C.SHOPBASE)))))
            C.HEAP8[C.charPointer((--ptr))] = C.char(rno);
        y = C.short(C.int(C.int(y) + C.int(step)));
        if (y > max_y_offset)
            continue;
        if (Number(Boolean((rno = C.char(lev[y].roomno)) >= C.ROOMOFFSET && !C.strchr(ptr, rno)
            && (!typewanted || (typefound = C.svr.rooms[rno - C.ROOMOFFSET].rtype) == typewanted || (typewanted == C.SHOPBASE && typefound > C.SHOPBASE)))))
            C.HEAP8[C.charPointer((--ptr))] = C.char(rno);
    }
    return ptr;
}

export function in_town(x,y)
{
    x=C.short(x);y=C.short(y);
    let sroom;
    let has_subrooms = C.char(C.FALSE);

    if (!C.svl.level.flags.has_town)
        return C.char(C.FALSE);

    /*
     * See if (x,y) is in a room with subrooms, if so, assume it's the
     * town.  If there are no subrooms, the whole level is in town.
     */
    for (sroom = C.svr.rooms[0]; sroom.hx > 0; (sroom = C.advanceRecord(sroom,1))) {
        if (sroom.nsubrooms > 0) {
            has_subrooms = C.char(C.TRUE);
            if (C.inside_room(sroom, x, y))
                return C.char(C.TRUE);
        }
    }

    return C.char(!has_subrooms);
}

/* possibly deliver a one-time room entry message */
export function move_update(newlev)
{
    newlev=C.char(newlev);
    let c; let ptr1; let ptr2; let ptr3; let ptr4;

    C.Strcpy(C.u.urooms0, C.u.urooms);
    C.Strcpy(C.u.ushops0, C.u.ushops);
    if (newlev) {
        void (C.memset(C.u.urooms, 0, BigInt(1*5)));
        void (C.memset(C.u.uentered, 0, BigInt(1*5)));
        void (C.memset(C.u.ushops, 0, BigInt(1*5)));
        void (C.memset(C.u.ushops_entered, 0, BigInt(1*5)));
        C.Strcpy(C.u.ushops_left, C.u.ushops0);
        return;
    }
    C.Strcpy(C.u.urooms, C.callLocal(in_rooms,C.u.ux, C.u.uy, 0));

    for (ptr1 = C.charPointer(C.u.urooms), ptr2 = C.charPointer(C.u.uentered),
         ptr3 = C.charPointer(C.u.ushops), ptr4 = C.charPointer(C.u.ushops_entered); C.HEAP8[C.charPointer(ptr1)]; ptr1++) {
        c = C.char(C.HEAP8[C.charPointer(ptr1)]);
        if (!C.strchr(C.u.urooms0, c))
            C.HEAP8[C.charPointer(ptr2++)] = C.char(c);
        if (C.IS_SHOP(c - C.ROOMOFFSET)) {
            C.HEAP8[C.charPointer(ptr3++)] = C.char(c);
            if (!C.strchr(C.u.ushops0, c))
                C.HEAP8[C.charPointer(ptr4++)] = C.char(c);
        }
    }
    C.HEAP8[C.charPointer(ptr2)] = C.char(0), C.HEAP8[C.charPointer(ptr3)] = C.char(0), C.HEAP8[C.charPointer(ptr4)] = C.char(0);

    /* filter u.ushops0 -> u.ushops_left */
    for (ptr1 = C.charPointer(C.u.ushops0), ptr2 = C.charPointer(C.u.ushops_left); C.HEAP8[C.charPointer(ptr1)]; ptr1++)
        if (!C.strchr(C.u.ushops, C.HEAP8[C.charPointer(ptr1)]))
            C.HEAP8[C.charPointer(ptr2++)] = C.char(C.HEAP8[C.charPointer(ptr1)]);
    C.HEAP8[C.charPointer(ptr2)] = C.char(0);
}

/* returns
   1 = cannot pickup, time taken
   0 = cannot pickup, no time taken
  -1 = do normal pickup
  -2 = loot the monster */
export function check_special_room(newlev)
{
    newlev=C.char(newlev);
    let mtmp;
    let ptr;

    C.callLocal(move_update,newlev);

    if (C.HEAP8[C.charPointer(C.u.ushops0)])
        C.u_left_shop(C.u.ushops_left, newlev);

    /*
     * Check for attaining 'entered Mine Town' achievement.
     * Most of the Mine Town variations have the town in one large room
     * containing a bunch of subrooms; we check for entering that large
     * room.  However, two of the variations cover the whole level rather
     * than include a room with subrooms.  We need to check for town entry
     * before the possible early return for not having entered a room in
     * case we have arrived in the town but have not entered any room.
     *
     * TODO: change the minetn variants which don't include any town
     * boundary to have such.
     */
    if (Number(Boolean(C.svl.level.flags.has_town && !C.svc.context.achieveo.minetn_reached
        && C.In_mines(C.u.uz) && C.callLocal(in_town,C.u.ux, C.u.uy)))) {
        C.record_achievement(C.ACH_TOWN);
        C.svc.context.achieveo.minetn_reached = C.char(C.TRUE);
    }

    if (Number(Boolean(!C.HEAP8[C.charPointer(C.u.uentered)] && !C.HEAP8[C.charPointer(C.u.ushops_entered)]))) /* implied by newlev */
        return; /* no entrance messages necessary */

    /* Did we just enter a shop? */
    if (C.HEAP8[C.charPointer(C.u.ushops_entered)])
        C.u_entered_shop(C.u.ushops_entered);

    for (ptr = C.charPointer((C.charPointer(C.u.uentered) + 0)); C.HEAP8[C.charPointer(ptr)]; ptr++) {
        let roomno = C.int(C.HEAP8[C.charPointer(ptr)] - C.ROOMOFFSET); let rt = C.int(C.svr.rooms[roomno].rtype);
        let msg_given = C.char(C.TRUE);

        /* Did we just enter some other special room? */
        /* vault.c insists that a vault remain a VAULT,
         * and temples should remain TEMPLEs,
         * but everything else gives a message only the first time */
        switch (rt) {
        case C.ZOO:
            C.pline("Welcome to David's treasure zoo!");
            break;
        case C.SWAMP:
            C.pline("It %s rather %s down here.", C.Blind ? "feels" : "looks",
                  C.Blind ? "humid" : "muddy");
            break;
        case C.COURT:
            C.You("enter an opulent%s room!",
                /* the throne room in Sam quest home level lacks a throne */
                !C.callLocal(furniture_present,C.THRONE, roomno) ? "" : " throne");
            break;
        case C.LEPREHALL:
            C.You("enter a leprechaun hall!");
            break;
        case C.MORGUE:
            if (C.midnight()) {
                let run = C.charPointer(C.callLocal(u_locomotion,"Run"));

                C.pline("%s away!  %s away!", run, run);
            } else
                C.You("have an uncanny feeling...");
            break;
        case C.BEEHIVE:
            C.You("enter a giant beehive!");
            break;
        case C.COCKNEST:
            C.You("enter a disgusting nest!");
            break;
        case C.ANTHOLE:
            C.You("enter an anthole!");
            break;
        case C.BARRACKS:
            if (Number(Boolean(C.callLocal(monstinroom,C.mons[C.PM_SOLDIER], roomno)
                || C.callLocal(monstinroom,C.mons[C.PM_SERGEANT], roomno)
                || C.callLocal(monstinroom,C.mons[C.PM_LIEUTENANT], roomno)
                || C.callLocal(monstinroom,C.mons[C.PM_CAPTAIN], roomno))))
                C.You("enter a military barracks!");
            else
                C.You("enter an abandoned barracks.");
            break;
        case C.DELPHI: {
            let oracle = C.callLocal(monstinroom,C.mons[C.PM_ORACLE], roomno);

            if (oracle) {
                ;
                if (!oracle.mpeaceful)
                    C.verbalize("You're in Delphi, %s.", C.svp.plname);
                else
                    C.verbalize("%s, %s, welcome to Delphi!",
                              C.Hello(C.view("monst", 0)), C.svp.plname);
            } else
                msg_given = C.char(C.FALSE);
            break;
        }
        case C.TEMPLE:
            C.intemple(roomno + C.ROOMOFFSET);
            ;
        /*FALLTHRU*/
        default:
            msg_given = C.char((Number(Boolean(rt == C.TEMPLE || rt >= C.SHOPBASE))));
            rt = C.int(0);
            break;
        }
        if (msg_given)
            C.room_discovered(roomno);

        if (rt != 0) {
            C.svr.rooms[roomno].rtype = C.char(C.OROOM);
            if (!C.search_special(rt)) {
                /* No more room of that type */
                switch (rt) {
                case C.COURT:
                    C.svl.level.flags.has_court = C.uint(0);
                    break;
                case C.SWAMP:
                    C.svl.level.flags.has_swamp = C.uint(0);
                    break;
                case C.MORGUE:
                    C.svl.level.flags.has_morgue = C.uint(0);
                    break;
                case C.ZOO:
                    C.svl.level.flags.has_zoo = C.uint(0);
                    break;
                case C.BARRACKS:
                    C.svl.level.flags.has_barracks = C.uint(0);
                    break;
                case C.TEMPLE:
                    C.svl.level.flags.has_temple = C.uint(0);
                    break;
                case C.BEEHIVE:
                    C.svl.level.flags.has_beehive = C.uint(0);
                    break;
                }
            }
            if (Number(Boolean(rt == C.COURT || rt == C.SWAMP || rt == C.MORGUE || rt == C.ZOO)))
                for (mtmp = C.fmon; mtmp; mtmp = mtmp.nmon) {
                    if (C.DEADMONSTER(mtmp))
                        continue;
                    if (Number(Boolean(!C.isok(mtmp.mx,mtmp.my)
                        || roomno != C.int( C.levl[mtmp.mx][mtmp.my].roomno))))
                        continue;
                    if (Number(Boolean(!C.Stealth && !(C.rngCaller(3772,"check_special_room"),C.rn2(3))))) {
                        C.wake_msg(mtmp, C.FALSE);
                        mtmp.msleeping = C.uint(0);
                    }
                }
        }
    }
    return;
}

/* the #pickup command */
export function pickup_checks()
{
    
    let traphere;

    /* uswallow case added by GAN 01/29/87 */
    if (C.u.uswallow) {
        if (!C.u.ustuck.minvent) {
            if (C.digests(C.u.ustuck.data)) {
                C.You("pick up %s tongue.", C.s_suffix(C.mon_nam(C.u.ustuck)));
                C.pline("But it's kind of slimy, so you drop it.");
            } else
                C.You("don't %s anything in here to pick up.",
                    C.Blind ? "feel" : "see");
            return C.int(1);
        } else {
            return C.int(-2); /* loot the monster inventory */
        }
    }
    if (C.is_pool(C.u.ux, C.u.uy)) {
        if (Number(Boolean(C.Wwalking || C.is_floater(C.gy.youmonst.data)
            || C.is_clinger(C.gy.youmonst.data) || (C.Flying && !C.Breathless)))) {
            C.You("cannot dive into the %s to pick things up.",
                C.hliquid("water"));
            return C.int(0);
        } else if (!C.Underwater) {
            C.You_cant("even see the bottom, let alone pick up %s.", C.something);
            return C.int(0);
        }
    }
    if (C.is_lava(C.u.ux, C.u.uy)) {
        if (Number(Boolean(C.Wwalking || C.is_floater(C.gy.youmonst.data)
            || C.is_clinger(C.gy.youmonst.data) || (C.Flying && !C.Breathless)))) {
            C.You_cant("reach the bottom to pick things up.");
            return C.int(0);
        } else if (!C.likes_lava(C.gy.youmonst.data)) {
            C.You("would burn to a crisp trying to pick things up.");
            return C.int(0);
        }
    }
    if (!C.OBJ_AT(C.u.ux, C.u.uy)) {
        let lev = C.levl[C.u.ux][C.u.uy];

        if (C.IS_THRONE(lev.typ))
            C.pline("It must weigh%s a ton!", lev.looted ? " almost" : "");
        else if (C.IS_SINK(lev.typ))
            C.pline_The("plumbing connects it to the floor.");
        else if (C.IS_GRAVE(lev.typ))
            C.You("don't need a gravestone.  Yet.");
        else if (C.IS_FOUNTAIN(lev.typ))
            C.You("could drink the %s...", C.hliquid("water"));
        else if (Number(Boolean(C.IS_DOOR(lev.typ) && (lev.doormask & C.D_ISOPEN))))
            C.pline("It won't come off the hinges.");
        else if (C.IS_ALTAR(lev.typ))
            C.pline("Moving the altar would be a very bad idea.");
        else if (lev.typ == C.STAIRS)
            C.pline_The("stairs are solidly affixed.");
        else
            C.There("is nothing here to pick up.");
        return C.int(0);
    }
    traphere = C.t_at(C.u.ux, C.u.uy);
    if (!C.can_reach_floor(Number(Boolean(traphere && C.is_pit(traphere.ttyp))))) {
        /* if there's a hole here, any objects here clearly aren't at
           the bottom so only check for pits */
        if (Number(Boolean(traphere && C.uteetering_at_seen_pit(traphere)))) {
            C.You("cannot reach the bottom of the pit.");
        } else if (Number(Boolean(C.u.usteed && C.P_SKILL(C.P_RIDING) < C.P_BASIC))) {
            C.rider_cant_reach();
        } else if (C.Blind) {
            C.You("cannot reach anything here.");
        } else {
            let surf = C.charPointer(C.surface(C.u.ux, C.u.uy));

            if (traphere) {
                if (traphere.ttyp == C.HOLE)
                    surf = C.charPointer("edge of the hole");
                else if (traphere.ttyp == C.TRAPDOOR)
                    surf = C.charPointer("trap door");
            }
            C.You("cannot reach the %s.", surf);
        }
        return C.int(0);
    }
    return C.int(-1); /* can do normal pickup */
}

/* stop running if we see something interesting next to us */
/* turn around a corner if that is the only way we can proceed */
/* do not turn left or right twice */
export function dopickup()
{
    
    let count; let tmpcount; let ret;

    count = C.int(C.int( C.gc.command_count));
    C.gm.multi = 0; /* always reset */

    if ((ret = C.int(C.callLocal(pickup_checks,))) >= 0) {
        return C.int(ret ? C.ECMD_TIME : C.ECMD_OK);
    } else if (ret == -2) {
        tmpcount = C.int(-count);
        return C.int(C.loot_mon(C.u.ustuck, C.localPointer("int",()=>tmpcount,_value=>tmpcount=_value), ( 0)) ? C.ECMD_TIME
                                                            : C.ECMD_OK);
    } /* else ret == -1 */

    return C.int(C.pickup(-count) ? C.ECMD_TIME : C.ECMD_OK);
}

/* check for a doorway which lacks its door (NODOOR or BROKEN) */
export function lookaround()
{
    
    let x; let y;
    let i; let x0 = C.short(0); let y0 = C.short(0); let m0 = C.short(1); let i0 = C.short(9);
    let corrct = C.int(0); let noturn = C.int(0);
    let mtmp;

    /* Grid bugs stop if trying to move diagonal, even if blind.  Maybe */
    /* they polymorphed while in the middle of a long move. */
    if (Number(Boolean(C.NODIAG(C.u.umonnum) && C.u.dx && C.u.dy))) {
        C.You("cannot move diagonally.");
        C.callLocal(nomul,0);
        return;
    }

    if (Number(Boolean(C.Blind || C.svc.context.run == 0)))
        return;
    for (x = C.short(C.u.ux - 1); x <= C.u.ux + 1; x++)
        for (y = C.short(C.u.uy - 1); y <= C.u.uy + 1; y++) {
            let infront = C.char((Number(Boolean(x == C.u.ux + C.u.dx && y == C.u.uy + C.u.dy))));

            /* ignore out of bounds, and our own location */
            if (Number(Boolean(!C.isok(x, y) || C.u_at(x, y))))
                continue;
            /* (grid bugs) ignore diagonals */
            if (Number(Boolean(C.NODIAG(C.u.umonnum) && x != C.u.ux && y != C.u.uy)))
                continue;

            /* can we see a monster there? */
            if (Number(Boolean(!C.pointerEqual((mtmp = C.m_at(x, y)),0)
                && C.M_AP_TYPE(mtmp) != C.M_AP_FURNITURE
                && C.M_AP_TYPE(mtmp) != C.M_AP_OBJECT
                && C.mon_visible(mtmp)))) {
                /* running movement and not a hostile monster */
                /* OR it blocks our move direction and we're not traveling */
                if (Number(Boolean((C.svc.context.run != 1 && !C.is_safemon(mtmp))
                    || (infront && !C.svc.context.travel)))) {
                    if (C.flags.mention_walls)
                        C.pline_xy(x, y, "%s blocks your path.",
                                 C.upstart(C.a_monnam(mtmp)));
                    {C.callLocal(nomul,0);return;}
                }
            }

            /* stone is never interesting */
            if (C.levl[x][y].typ == C.STONE)
                continue;
            /* ignore the square we're moving away from */
            if (Number(Boolean(x == C.u.ux - C.u.dx && y == C.u.uy - C.u.dy)))
                continue;

            /* stop for traps, sometimes */
            if (C.callLocal(avoid_moving_on_trap,x, y,
                                     (Number(Boolean(infront && C.svc.context.run > 1))))) {
                if (C.svc.context.run == 1)
                    {
if (C.levl[C.u.ux][C.u.uy].typ != C.ROOM) {
                    /* running or traveling */
                    if (Number(Boolean(C.svc.context.run == 1 || C.svc.context.run == 3
                        || C.svc.context.run == 8))) {
                        /* distance from x,y to location we're moving to */
                        i = C.short(C.dist2(x, y, C.u.ux + C.u.dx, C.u.uy + C.u.dy));
                        /* ignore if not on or directly adjacent to it */
                        if (i > 2)
                            continue;
                        /* x,y is (adjacent to) the location we're moving to;
                           if we've seen one corridor, and x,y is not directly
                           orthogonally next to it, mark noturn */
                        if (Number(Boolean(corrct == 1 && C.dist2(x, y, x0, y0) != 1)))
                            noturn = C.int(1);
                        /* if previous x,y was diagonal, now x,y is
                           orthogonal (or this is first time we're here) */
                        if (i < i0) {
                            i0 = C.short(i);
                            x0 = C.short(x);
                            y0 = C.short(y);
                            m0 = C.short(mtmp ? 1 : 0);
                        }
                    }
                    corrct++;
                }
                continue;
} /* if you must */
                if (infront)
                    {C.callLocal(nomul,0);return;}
            }

            /* more uninteresting terrain */
            if (Number(Boolean(C.IS_OBSTRUCTED(C.levl[x][y].typ) || C.levl[x][y].typ == C.ROOM
                || C.IS_AIR(C.levl[x][y].typ) || C.levl[x][y].typ == C.ICE))) {
                continue;
            } else if (Number(Boolean(C.closed_door(x, y) || (mtmp && C.is_door_mappear(mtmp))))) {
                /* a closed door? */
                /* ignore if diagonal */
                if (Number(Boolean(x != C.u.ux && y != C.u.uy)))
                    continue;
                if (Number(Boolean(C.svc.context.run != 1 && !C.svc.context.travel))) {
                    if (C.flags.mention_walls) {
                        C.set_msg_xy(x, y);
                        C.You("stop in front of the door.");
                    }
                    {C.callLocal(nomul,0);return;}
                }
                /* orthogonal to a closed door, consider it a corridor */
                {
if (C.levl[C.u.ux][C.u.uy].typ != C.ROOM) {
                    /* running or traveling */
                    if (Number(Boolean(C.svc.context.run == 1 || C.svc.context.run == 3
                        || C.svc.context.run == 8))) {
                        /* distance from x,y to location we're moving to */
                        i = C.short(C.dist2(x, y, C.u.ux + C.u.dx, C.u.uy + C.u.dy));
                        /* ignore if not on or directly adjacent to it */
                        if (i > 2)
                            continue;
                        /* x,y is (adjacent to) the location we're moving to;
                           if we've seen one corridor, and x,y is not directly
                           orthogonally next to it, mark noturn */
                        if (Number(Boolean(corrct == 1 && C.dist2(x, y, x0, y0) != 1)))
                            noturn = C.int(1);
                        /* if previous x,y was diagonal, now x,y is
                           orthogonal (or this is first time we're here) */
                        if (i < i0) {
                            i0 = C.short(i);
                            x0 = C.short(x);
                            y0 = C.short(y);
                            m0 = C.short(mtmp ? 1 : 0);
                        }
                    }
                    corrct++;
                }
                continue;
}
            } else if (C.levl[x][y].typ == C.CORR) {
                /* corridor */
 bcorr:
                if (C.levl[C.u.ux][C.u.uy].typ != C.ROOM) {
                    /* running or traveling */
                    if (Number(Boolean(C.svc.context.run == 1 || C.svc.context.run == 3
                        || C.svc.context.run == 8))) {
                        /* distance from x,y to location we're moving to */
                        i = C.short(C.dist2(x, y, C.u.ux + C.u.dx, C.u.uy + C.u.dy));
                        /* ignore if not on or directly adjacent to it */
                        if (i > 2)
                            continue;
                        /* x,y is (adjacent to) the location we're moving to;
                           if we've seen one corridor, and x,y is not directly
                           orthogonally next to it, mark noturn */
                        if (Number(Boolean(corrct == 1 && C.dist2(x, y, x0, y0) != 1)))
                            noturn = C.int(1);
                        /* if previous x,y was diagonal, now x,y is
                           orthogonal (or this is first time we're here) */
                        if (i < i0) {
                            i0 = C.short(i);
                            x0 = C.short(x);
                            y0 = C.short(y);
                            m0 = C.short(mtmp ? 1 : 0);
                        }
                    }
                    corrct++;
                }
                continue;
            } else if (C.is_pool_or_lava(x, y)) {
                if (Number(Boolean(infront && C.callLocal(avoid_moving_on_liquid,x, y, C.TRUE))))
                    {C.callLocal(nomul,0);return;}
                continue;
            } else { /* e.g. objects or trap or stairs */
                if (C.svc.context.run == 1)
                    {
if (C.levl[C.u.ux][C.u.uy].typ != C.ROOM) {
                    /* running or traveling */
                    if (Number(Boolean(C.svc.context.run == 1 || C.svc.context.run == 3
                        || C.svc.context.run == 8))) {
                        /* distance from x,y to location we're moving to */
                        i = C.short(C.dist2(x, y, C.u.ux + C.u.dx, C.u.uy + C.u.dy));
                        /* ignore if not on or directly adjacent to it */
                        if (i > 2)
                            continue;
                        /* x,y is (adjacent to) the location we're moving to;
                           if we've seen one corridor, and x,y is not directly
                           orthogonally next to it, mark noturn */
                        if (Number(Boolean(corrct == 1 && C.dist2(x, y, x0, y0) != 1)))
                            noturn = C.int(1);
                        /* if previous x,y was diagonal, now x,y is
                           orthogonal (or this is first time we're here) */
                        if (i < i0) {
                            i0 = C.short(i);
                            x0 = C.short(x);
                            y0 = C.short(y);
                            m0 = C.short(mtmp ? 1 : 0);
                        }
                    }
                    corrct++;
                }
                continue;
}
                if (C.svc.context.run == 8)
                    continue;
                if (mtmp)
                    continue; /* d */
                if (Number(Boolean(((x == C.u.ux - C.u.dx) && (y != C.u.uy + C.u.dy))
                    || ((y == C.u.uy - C.u.dy) && (x != C.u.ux + C.u.dx)))))
                    continue;
            }
 stop:
            C.callLocal(nomul,0);
            return;
        } /* end for loops */

    if (Number(Boolean(corrct > 1 && C.svc.context.run == 2))) {
        if (C.flags.mention_walls)
            C.pline_The("corridor widens here.");
        {C.callLocal(nomul,0);return;}
    }
    if (Number(Boolean((C.svc.context.run == 1 || C.svc.context.run == 3 || C.svc.context.run == 8)
        && !noturn && !m0 && i0
        && (corrct == 1 || (corrct == 2 && i0 == 1))))) {
        /* make sure that we do not turn too far */
        if (i0 == 2) {
            if (Number(Boolean(C.u.dx == y0 - C.u.uy && C.u.dy == C.u.ux - x0)))
                i = C.short(2); /* straight turn right */
            else
                i = C.short(-2); /* straight turn left */
        } else if (Number(Boolean(C.u.dx && C.u.dy))) {
            if (Number(Boolean((C.u.dx == C.u.dy && y0 == C.u.uy) || (C.u.dx != C.u.dy && y0 != C.u.uy))))
                i = C.short(-1); /* half turn left */
            else
                i = C.short(1); /* half turn right */
        } else {
            if (Number(Boolean((x0 - C.u.ux == y0 - C.u.uy && !C.u.dy)
                || (x0 - C.u.ux != y0 - C.u.uy && C.u.dy))))
                i = C.short(1); /* half turn right */
            else
                i = C.short(-1); /* half turn left */
        }

        i = C.short(C.int(C.int(i) + C.int(C.u.last_str_turn)));
        if (Number(Boolean(i <= 2 && i >= -2))) {
            C.u.last_str_turn = C.int(i);
            C.u.dx = C.int(x0 - C.u.ux);
            C.u.dy = C.int(y0 - C.u.uy);
        }
    }
}

/* used by drown() to check whether hero can crawl from water to <x,y>;
   also used by findtravelpath() when destination is one step away */
export function doorless_door(x,y)
{
    x=C.short(x);y=C.short(y);
    let lev_p = C.levl[x][y];

    if (!C.IS_DOOR(lev_p.typ))
        return C.char(C.FALSE);
    /* all rogue level doors are doorless but disallow diagonal access, so
       we treat them as if their non-existent doors were actually present */
    if (C.Is_rogue_level(C.u.uz))
        return C.char(C.FALSE);
    return C.char(!(lev_p.doormask & ~(C.D_NODOOR | C.D_BROKEN)));
}

/* something like lookaround, but we are not running */
/* react only to monsters that might hit us */
export function crawl_destination(x,y)
{
    x=C.short(x);y=C.short(y);
    /* is location ok in general? */
    if (!C.goodpos(x, y, C.gy.youmonst, 0))
        return C.char(C.FALSE);

    /* orthogonal movement is unrestricted when destination is ok */
    if (Number(Boolean(x == C.u.ux || y == C.u.uy)))
        return C.char(C.TRUE);

    /* diagonal movement has some restrictions */
    if (C.NODIAG(C.u.umonnum))
        return C.char(C.FALSE); /* poly'd into a grid bug... */
    if (C.Passes_walls)
        return C.char(C.TRUE); /* or a xorn... */
    /* pool could be next to a door, conceivably even inside a shop */
    if (Number(Boolean(C.IS_DOOR(C.levl[x][y].typ) && (!C.callLocal(doorless_door,x, y) || C.block_door(x, y)))))
        return C.char(C.FALSE);
    /* finally, are we trying to squeeze through a too-narrow gap? */
    return C.char(!(Number(Boolean(C.callLocal(bad_rock,C.gy.youmonst.data, C.u.ux, y)
             && C.callLocal(bad_rock,C.gy.youmonst.data, x, C.u.uy)
             && C.callLocal(cant_squeeze_thru,C.gy.youmonst)))));
}

export function monster_nearby()
{
    
    let x; let y;
    let mtmp;

    /* Also see the similar check in dochugw() in monmove.c */
    for (x = C.short(C.u.ux - 1); x <= C.u.ux + 1; x++)
        for (y = C.short(C.u.uy - 1); y <= C.u.uy + 1; y++) {
            if (Number(Boolean(!C.isok(x, y) || C.u_at(x, y))))
                continue;
            if (Number(Boolean(!C.pointerEqual((mtmp = C.m_at(x, y)),0)
                && C.M_AP_TYPE(mtmp) != C.M_AP_FURNITURE
                && C.M_AP_TYPE(mtmp) != C.M_AP_OBJECT
                && (C.Hallucination
                    || (!mtmp.mpeaceful && !C.noattacks(mtmp.data)))
                && (!C.is_hider(mtmp.data) || !mtmp.mundetected)
                && !C.helpless(mtmp)
                && !C.onscary(C.u.ux, C.u.uy, mtmp) && C.canspotmon(mtmp))))
                return C.int(1);
        }
    return C.int(0);
}

export function end_running(and_travel)
{
    and_travel=C.char(and_travel);
    /* moveloop() suppresses time_botl when context.run is non-zero; when
       running stops, update 'time' even if other botl status is unchanged */
    if (C.svc.context.run) {
        C.svc.context.run = C.uint(0);
        if (C.flags.time)
            C.disp.time_botl = C.char(C.TRUE);
        /* classify_terrain() suppresses setting disp.botl when
           running; after that, it can no longer compare current terrain
           against iflaga.terrain_typ to detect a change, so recompute */
        if (C.flags.terrainstatus) {
            C.iflags.terrain_typ = C.int(C.MAX_TYPE); /* "none of the above" value */
            C.callLocal(classify_terrain,);
        }
    }

    /* 'context.mv' isn't travel but callers who want to end travel
       all clear it too */
    if (and_travel)
        C.svc.context.travel = C.char(C.svc.context.travel1 = C.char(C.svc.context.mv = C.char(0)));
    if (C.gt.travelmap) {
        C.selection_free(C.gt.travelmap, C.TRUE);
        C.gt.travelmap = C.NULL;
    }
    /* cancel multi */
    if (C.gm.multi > 0)
        C.gm.multi = 0;
}

/* called when a non-movement, multi-turn action has completed */
export function nomul(nval)
{
    nval=C.int(nval);
    if (C.gm.multi < nval)
        return;              /* This is a bug fix by ab@unido */
    ((_hackTarget)=>_hackTarget.botl = C.char(C.int(C.int(_hackTarget.botl) | C.int((C.gm.multi >= 0)))))(C.disp);
    C.u.uinvulnerable = C.uint(C.FALSE); /* Kludge to avoid ctrl-C bug -dlc */
    C.u.usleep = C.long(0);
    C.gm.multi = nval;
    if (nval == 0)
        C.gm.multi_reason = C.charPointer(C.NULL), C.gm.multireasonbuf[0] = C.char(0);
    C.callLocal(end_running,C.TRUE);
    C.cmdq_clear(C.CQ_CANNED);
}

export function unmul(msg_override)
{
    
    C.disp.botl = C.char(C.TRUE);
    C.gm.multi = 0; /* caller will usually have done this already */
    if (msg_override)
        C.gn.nomovemsg = C.charPointer(msg_override);
    else if (!C.gn.nomovemsg)
        C.gn.nomovemsg = C.charPointer(C.You_can_move_again);
    if (C.HEAP8[C.charPointer(C.gn.nomovemsg)]) {
        C.pline("%s", C.gn.nomovemsg);
        /* follow "you survived that attempt on your life" with a message
           about current form if it's not the default; primarily for
           life-saving while turning into green slime but is also a reminder
           if life-saved while poly'd and Unchanging (explore or wizard mode
           declining to die since can't be both Unchanging and Lifesaved) */
        if (Number(Boolean(C.Upolyd && !C.strncmpi(C.gn.nomovemsg, "You survived that ", 18))))
            C.You("are %s.",
                C.an(C.pmname(C.mons[C.u.umonnum], C.Ugender))); /* (ignore Hallu) */
    }
    C.gn.nomovemsg = C.charPointer(0);
    C.u.usleep = C.long(0);
    C.gm.multi_reason = C.charPointer(C.NULL), C.gm.multireasonbuf[0] = C.char(0);

    if (C.ga.afternmv) {
        let f = C.ga.afternmv;

        /* clear afternmv before calling it (to override the
           encumbrance hack for levitation--see weight_cap()) */
        C.ga.afternmv = (0);
        void C.callIntFunction(f);
    }
}

/* show a message how much damage you received */
export function maybe_wail()
{
    
    

    if (C.svm.moves <= C.long((C.long(C.gw.wailmsg)) + (C.long(50))))
        return;

    C.gw.wailmsg = C.long(C.svm.moves);
    if (Number(Boolean(C.Role_if(C.PM_WIZARD) || C.Race_if(C.PM_ELF) || C.Role_if(C.PM_VALKYRIE)))) {
        let who;
        let i; let powercnt;

        who = C.charPointer((Number(Boolean(C.Role_if(C.PM_WIZARD) || C.Role_if(C.PM_VALKYRIE)))) ? C.gu.urole.name.m
                                                           : "Elf");
        if (C.u.uhp == 1) {
            C.pline("%s is about to die.", who);
        } else {
            for (i = C.int(0), powercnt = C.int(0); i < C.SIZE(C.state.powers); ++i)
                if (C.long((C.long(C.u.uprops[C.state.powers[i]].intrinsic)) & (C.long(C.INTRINSIC))))
                    ++powercnt;

            C.pline((powercnt >= 4) ? "%s, all your powers will be lost..."
                                  : "%s, your life force is running out.",
                  who);
        }
    } else {
        ;
        C.You_hear(C.u.uhp == 1 ? "the wailing of the Banshee..."
                            : "the howling of the CwnAnnwn...");
    }
}

export function showdamage(dmg)
{
    dmg=C.int(dmg);
    if (Number(Boolean(!C.iflags.showdamage || !dmg)))
        return;

    C.pline("[HP %i, %i left]", -dmg, C.Upolyd ? C.u.mh : C.u.uhp);
}

/* code below is prepared to handle negative 'loss' so don't add this
         * until we've verified that no callers intentionally rely on that */
export function losehp(n,knam,k_format)
{
    n=C.int(n);k_format=C.char(k_format);
    C.disp.botl = C.char(C.TRUE); /* u.uhp or u.mh is changing */
    C.callLocal(end_running,C.TRUE);
    if (C.Upolyd) {
        ((_hackTarget)=>_hackTarget.mh = C.int(C.int(C.int(_hackTarget.mh) - C.int(n))))(C.u);
        C.callLocal(showdamage,n);
        if (C.u.mhmax < C.u.mh)
            C.u.mhmax = C.int(C.u.mh);
        if (C.u.mh < 1)
            C.rehumanize();
        else if (Number(Boolean(n > 0 && C.u.mh * 10 < C.u.mhmax && C.Unchanging)))
            C.callLocal(maybe_wail,);
        return;
    }

    ((_hackTarget)=>_hackTarget.uhp = C.int(C.int(C.int(_hackTarget.uhp) - C.int(n))))(C.u);
    C.callLocal(showdamage,n);
    if (C.u.uhp > C.u.uhpmax)
        C.u.uhpmax = C.int(C.u.uhp); /* perhaps n was negative */
    if (C.u.uhp < 1) {
        C.svk.killer.format = C.int(k_format);
        if (!C.pointerEqual(C.svk.killer.name,knam)) /* the thing that killed you */
            C.Strcpy(C.svk.killer.name, knam ? knam : "");
        C.urgent_pline("You die...");
        C.done(C.DIED);
    } else if (Number(Boolean(n > 0 && C.u.uhp * 10 < C.u.uhpmax))) {
        C.callLocal(maybe_wail,);
    }
}

/* returns how far beyond the normal capacity the player is currently. */
/* inv_weight() is negative if the player is below normal capacity. */
export function weight_cap()
{
    
    let carrcap; let save_ELev = C.long(C.ELevitation); let save_BLev = C.long(C.BLevitation);

    /* boots take multiple turns to wear but any properties they
       confer are enabled at the start rather than the end; that
       causes message sequencing issues for boots of levitation
       so defer their encumbrance benefit until they're fully worn */
    if (Number(Boolean(C.pointerEqual(C.ga.afternmv,C.Boots_on) && (C.long((C.long(C.ELevitation)) & (C.long(C.W_ARMF)))) != 0n))) {
        C.ELevitation = C.long(C.long(C.long(C.ELevitation) & C.long(~C.W_ARMF)));
        C.float_vs_flight(); /* in case Levitation is blocking Flying */
    }
    /* levitation is blocked by being trapped in the floor, but it still
       functions enough in that situation to enhance carrying capacity */
    C.BLevitation = C.long(C.long(C.long(C.BLevitation) & C.long(~C.I_SPECIAL)));

    carrcap = C.long((C.WT_WEIGHTCAP_STRCON * (C.ACURRSTR + C.ACURR(C.A_CON)))
               + C.WT_WEIGHTCAP_SPARE);
    if (C.Upolyd) {
        /* consistent with can_carry() in mon.c */
        if (C.gy.youmonst.data.mlet == C.S_NYMPH)
            carrcap = C.long(C.MAX_CARR_CAP);
        else if (!C.gy.youmonst.data.cwt)
            carrcap = C.long(C.long((C.long((C.long((C.long(carrcap)) * (C.long(C.long( C.gy.youmonst.data.msize))))))) / (C.long(C.MZ_HUMAN))));
        else if (Number(Boolean(!C.strongmonst(C.gy.youmonst.data)
                 || (C.strongmonst(C.gy.youmonst.data)
                     && (C.gy.youmonst.data.cwt > C.WT_HUMAN)))))
            carrcap = C.long((C.long((C.long(C.long((C.long(carrcap)) * (C.long(C.long( C.gy.youmonst.data.cwt)))))) / (C.long(C.WT_HUMAN)))));
    }

    if (Number(Boolean(C.Levitation || C.Is_airlevel(C.u.uz) /* pugh@cornell */
        || (C.u.usteed && C.strongmonst(C.u.usteed.data))))) {
        carrcap = C.long(C.MAX_CARR_CAP);
    } else {
        if (carrcap > C.MAX_CARR_CAP)
            carrcap = C.long(C.MAX_CARR_CAP);
        if (!C.Flying) {
            if (C.long((C.long(C.EWounded_legs)) & (C.long(C.LEFT_SIDE))))
                carrcap = C.long(C.long(C.long(carrcap) - C.long(C.WT_WOUNDEDLEG_REDUCT)));
            if (C.long((C.long(C.EWounded_legs)) & (C.long(C.RIGHT_SIDE))))
                carrcap = C.long(C.long(C.long(carrcap) - C.long(C.WT_WOUNDEDLEG_REDUCT)));
        }
    }

    if (Number(Boolean(C.ELevitation != save_ELev || C.BLevitation != save_BLev))) {
        C.ELevitation = C.long(save_ELev);
        C.BLevitation = C.long(save_BLev);
        C.float_vs_flight();
    }

    return C.int(C.int( ((carrcap) > ( 1n) ? (carrcap) : ( 1n)))); /* never return 0 */
}

/*
 * Returns 0 if below normal capacity, or the number of "capacity units"
 * over the normal capacity the player is loaded.  Max is 5.
 */
export function inv_weight()
{
    
    let otmp = C.gi.invent;
    let wt = C.int(0);

    while (otmp) {
        if (otmp.oclass == C.COIN_CLASS)
            wt = C.int(C.int(C.int(wt) + C.int(C.int( (C.long((C.long((C.long((C.long(C.long( otmp.quan))) + (C.long(50n)))))) / (C.long(100n))))))));
        else if (Number(Boolean(otmp.otyp != C.BOULDER || !C.throws_rocks(C.gy.youmonst.data))))
            wt = C.int(C.uint(C.uint(wt) + C.uint(otmp.owt)));
        otmp = otmp.nobj;
    }
    C.gw.wc = C.int(C.callLocal(weight_cap,));
    return C.int((wt - C.gw.wc));
}

export function calc_capacity(xtra_wt)
{
    xtra_wt=C.int(xtra_wt);
    let cap; let wt = C.int(C.callLocal(inv_weight,) + xtra_wt);

    if (wt <= 0)
        return C.int(C.UNENCUMBERED);
    if (C.gw.wc <= 1)
        return C.int(C.OVERLOADED);
    cap = C.int((Math.trunc((wt * 2) / (C.gw.wc))) + 1);
    return C.int(((cap) < ( C.OVERLOADED) ? (cap) : ( C.OVERLOADED)));
}

export function near_capacity()
{
    
    return C.int(C.callLocal(calc_capacity,0));
}

export function max_capacity()
{
    
    let wt = C.int(C.callLocal(inv_weight,));

    return C.int((wt - (2 * C.gw.wc)));
}

/* 1 = monst, 2 = obj */
/* 0-6 = weight in ascii; 7 - end = name */
export function check_capacity(str)
{
    
    if (C.callLocal(near_capacity,) >= C.EXT_ENCUMBER) {
        if (str)
            C.pline1(str);
        else
            C.You_cant("do that while carrying so much stuff.");
        return C.char(1);
    }
    return C.char(0);
}

export function dump_weights()
{
    
    let i; let cnt = C.int(0); let nmwidth = C.int(49); let mcount = C.int(C.NUMMONS); let ocount = C.int(C.NUM_OBJECTS);
    let nmbuf = C.localArray("char",[256]); let nmbufbase = C.localArray("char",[256]);
    let num_entries = C.ulong(C.ulong( (mcount + ocount)));

    C.weightlist = C.view("weight_table_entry",
                C.alloc(C.ulong((C.ulong(BigInt(C.sizes["weight_table_entry"]))) * (C.ulong(num_entries)))));
    C.decl_globals_init();
    C.init_objects();
    for (i = C.int(0); i < mcount; ++i) {
        if (i != C.PM_LONG_WORM_TAIL) {
            let cm;

            C.weightlist[cnt].wt = C.int(C.int( C.mons[i].cwt));
            C.weightlist[cnt].idx = C.int(i);
            C.weightlist[cnt].wtyp = C.uint(1);
            C.weightlist[cnt].unique = C.char(((C.mons[i].geno & C.G_UNIQ) != 0));
            C.nh_snprintf("dump_weights",4439,nmbuf, BigInt(1*256), "%07u", C.weightlist[cnt].wt);
            cm = C.char(C.CapitalMon(C.mons[i].pmnames[C.NEUTRAL]));
            C.nh_snprintf("dump_weights",4444,(C.charPointer(nmbuf) + 7), C.ulong((C.ulong(BigInt(1*256))) - (C.ulong(7))), "%s%s", "the body of ",
                     (cm)                     ? C.the(C.mons[i].pmnames[C.NEUTRAL])
                     : C.weightlist[cnt].unique ? C.mons[i].pmnames[C.NEUTRAL]
                                              : C.an(C.mons[i].pmnames[C.NEUTRAL]));
            C.weightlist[cnt].nm = C.charPointer(C.dupstr(nmbuf));
            cnt++;
        }
    }
    for (i = C.int(0); i < ocount; ++i) {
        let oc_name = C.charPointer((i == C.SLIME_MOLD) ? "slime mold"
                              : C.obj_descr[i].oc_name);
        let wt = C.int(C.int( C.objects[i].oc_weight));

        if (Number(Boolean(wt && oc_name))) {
            C.weightlist[cnt].idx = C.int(i);
            C.weightlist[cnt].wt = C.int(wt);
            C.weightlist[cnt].wtyp = C.uint(2);
            C.weightlist[cnt].unique = C.char((C.objects[i].oc_unique != 0));
            C.objects[i].oc_name_known = C.uint(1);
            C.Strcpy(nmbufbase, C.simple_typename(i));
            C.nh_snprintf("dump_weights",4463,nmbuf, BigInt(1*256), "%07u%s", wt,
                     (C.weightlist[cnt].unique) ? C.the(nmbufbase)
                                              : C.an(nmbufbase));
            C.weightlist[cnt].nm = C.charPointer(C.dupstr(nmbuf));
            cnt++;
        }
    }
    C.qsort(( C.weightlist), cnt,
          BigInt(C.sizes["weight_table_entry"]), cmp_weights);
    C.raw_printf("int all_weights[] = {");
    for (i = C.int(0); i < cnt; ++i) {
        if (C.weightlist[i].nm) {
            C.raw_printf("    %7u%s /* %*s */", C.weightlist[i].wt,
                       (i == cnt - 1) ? " " : ",", -nmwidth,
                       (C.charPointer(C.weightlist[i].nm) + 7));
            C.free(( C.weightlist[i].nm)), C.weightlist[i].nm = C.charPointer(0);
        }
    }
    C.raw_print("};");
    C.raw_print("");
    C.free(( C.weightlist));
    C.freedynamicdata();
}

export function cmp_weights(p1,p2)
{
    
    let i1 = C.view("weight_table_entry", p1); let i2 = C.view("weight_table_entry", p2);

   /* return (i1->wt - i2->wt); */
    return C.int(C.strcmp(i1.nm, i2.nm));
}

/* Counts the money in an object chain. */
/* Intended use is for your or some monster's inventory, */
/* now that u.gold/m.gold is gone.*/
/* Counting money in a container might be possible too. */
export function inv_cnt(incl_gold)
{
    incl_gold=C.char(incl_gold);
    let otmp = C.gi.invent;
    let ct = C.int(0);

    while (otmp) {
        if (Number(Boolean(incl_gold || otmp.invlet != C.GOLD_SYM)))
            ct++;
        otmp = otmp.nobj;
    }
    return C.int(ct);
}

export function money_cnt(otmp)
{
    
    while (otmp) {
        if (otmp.oclass == C.COIN_CLASS)
            return C.long(otmp.quan);
        otmp = otmp.nobj;
    }
    return C.long(0n);
}

/* calculate x/y, rounding as appropriate */
export function spot_checks(x,y,old_typ)
{
    x=C.short(x);y=C.short(y);old_typ=C.char(old_typ);
    let new_typ = C.char(C.levl[x][y].typ);
    let db_ice_now = C.char(C.FALSE);

    switch (old_typ) {
    case C.DRAWBRIDGE_UP:
        db_ice_now = C.char(((C.levl[x][y].drawbridgemask & C.DB_UNDER) == C.DB_ICE));
        ;
        /*FALLTHRU*/
    case C.ICE:
        if (Number(Boolean((new_typ != old_typ)
            || (old_typ == C.DRAWBRIDGE_UP && !db_ice_now)))) {
            /* make sure there's no MELT_ICE_AWAY timer */
            if (C.spot_time_left(x, y, C.MELT_ICE_AWAY)) {
                C.spot_stop_timers(x, y, C.MELT_ICE_AWAY);
            }
            /* adjust things affected by the ice */
            C.obj_ice_effects(x, y, C.FALSE);
        }
        break;
    }
}

/*hack.c*/
export function rounddiv(x,y)
{
    x=C.long(x);y=C.int(y);
    let r; let m;
    let divsgn = C.int(1);

    if (y == 0)
        C.panic("division by zero in rounddiv");
    else if (y < 0) {
        divsgn = C.int(-divsgn);
        y = C.int(-y);
    }
    if (x < 0) {
        divsgn = C.int(-divsgn);
        x = C.long(-x);
    }
    r = C.int(C.int( (C.long((C.long(x)) / (C.long(y))))));
    m = C.int(C.long((C.long(x)) % (C.long(y))));
    if (2 * m >= y)
        r++;

    return C.int(divsgn * r);
}
