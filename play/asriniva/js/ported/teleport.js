/* NetHack 5.0	teleport.c	$NHDT-Date: 1769342601 2026/01/25 04:03:21 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.239 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Robert Patrick Rankin, 2011. */
/* NetHack may be freely redistributed.  See license for details. */


import { C } from './c-runtime.js';

/* does monster block others from teleporting? */
export function m_blocks_teleporting(mtmp)
{
    if (C.is_dlord(mtmp.data) || C.is_dprince(mtmp.data))
        return C.TRUE;
    return C.FALSE;
}

/* teleporting is prevented on this level for this monster? */
export function noteleport_level(mon)
{
    /* demon court in Gehennom prevent others from teleporting */
    if (C.In_hell(C.u.uz) && !(C.is_dlord(mon.data) || C.is_dprince(mon.data)))
        if (C.get_iter_mons(C.functionAddress("m_blocks_teleporting")))
            return C.TRUE;

    /* natural no-teleport level; covetous monsters can bypass these */
    if (C.svl.level.flags.noteleport && !C.is_covetous(mon.data))
        return C.TRUE;

    /* wand of stasis prevents teleportation while the effect is active
       (even for covetous monsters) */
    if (C.svl.level.flags.stasis_until >= C.svm.moves)
        return C.TRUE;

    return C.FALSE;
}

/* this is an approximation of onscary() that doesn't use any 'struct monst'
   fields aside from 'monst->data'; used primarily for new monster creation
   and monster teleport destination, not for ordinary monster movement */
export function goodpos_onscary(x, y, mptr)
{
    /* onscary() checks Angels and lawful minions; this oversimplifies */
    if (mptr.mlet == C.S_HUMAN || mptr.mlet == C.S_ANGEL
        || C.is_rider(mptr) || C.unique_corpstat(mptr))
        return C.FALSE;
    /* onscary() checks for vampshifted vampire bats/fog clouds/wolves too */
    if (C.IS_ALTAR(C.levl[x][y].typ) && mptr.mlet == C.S_VAMPIRE)
        return C.TRUE;
    /* scare monster scroll doesn't have any of the below restrictions,
       being its own source of power */
    if (C.sobj_at(C.SCR_SCARE_MONSTER, x, y))
        return C.TRUE;
    /* engraved Elbereth doesn't work in Gehennom or the end-game */
    if (C.Inhell || C.In_endgame(C.u.uz))
        return C.FALSE;
    /* creatures who don't (or can't) fear a written Elbereth and weren't
       caught by the minions check */
    if (mptr == C.mons[C.PM_MINOTAUR] || !C.haseyes(mptr))
        return C.FALSE;
    return C.sengr_at("Elbereth", x, y, C.TRUE) ? C.TRUE : C.FALSE;
}

/*
 * Is (x,y) a good position of mtmp?  If mtmp is NULL, then is (x,y) good
 * for an object?
 *
 * This function will only look at mtmp->mdat, so makemon, mplayer, etc can
 * call it to generate new monster positions with fake monster structures.
 */
export function goodpos(x, y, mtmp, gpflags)
{
    let mdat = 0;
    let ignorewater = ((gpflags & C.MM_IGNOREWATER) != 0),
            ignorelava = ((gpflags & C.MM_IGNORELAVA) != 0),
            checkscary = ((gpflags & C.GP_CHECKSCARY) != 0),
            allow_u = ((gpflags & C.GP_ALLOW_U) != 0),
            avoid_monpos = ((gpflags & C.GP_AVOID_MONPOS) != 0);

    if (!C.isok(x, y))
        return C.FALSE;

    /* in many cases, we're trying to create a new monster, which
     * can't go on top of the player or any existing monster.
     * however, occasionally we are relocating engravings or objects,
     * which could be co-located and thus get restricted a bit too much.
     * oh well.
     */
    if (!allow_u) {
        if (C.u_at(x, y) && mtmp != C.gy.youmonst
            && (mtmp != C.u.ustuck || !C.u.uswallow)
            && (!C.u.usteed || mtmp != C.u.usteed))
            return C.FALSE;
    }

    if (C.MON_AT(x, y) && avoid_monpos)
        return C.FALSE;

    if (mtmp) {
        let mtmp2 = C.m_at(x, y);

        /* Be careful with long worms.  A monster may be placed back in
         * its own location.  Normally, if m_at() returns the same monster
         * that we're trying to place, the monster is being placed in its
         * own location.  However, that is not correct for worm segments,
         * because all the segments of the worm return the same m_at().
         * Actually we overdo the check a little bit--a worm can't be placed
         * in its own location, period.  If we just checked for mtmp->mx
         * != x || mtmp->my != y, we'd miss the case where we're called
         * to place the worm segment and the worm's head is at x,y.
         */
        if (mtmp2 && (mtmp2 != mtmp || mtmp.wormno))
            return C.FALSE;

        mdat = mtmp.data;
        if (C.is_pool(x, y) && !ignorewater) {
            /* [what about Breathless?] */
            if (mtmp == C.gy.youmonst)
                return Number(Boolean((C.Swimming || C.Amphibious
                        || (!C.Is_waterlevel(C.u.uz)
                            && !C.is_waterwall(x, y)
                            /* water on the Plane of Water has no surface
                               so there's no way to be on or above that */
                            && (C.Levitation || C.Flying || C.Wwalking)))));
            else
                return Number(Boolean((C.is_swimmer(mdat)
                        || (!C.Is_waterlevel(C.u.uz)
                            && !C.is_waterwall(x, y)
                            && C.m_in_air(mtmp)))));
        } else if (mdat.mlet == C.S_EEL && C.rn2(()=>(13), 148, "goodpos") && !ignorewater) {
            return C.FALSE;
        } else if (C.is_lava(x, y) && !ignorelava) {
            /* 3.6.3: floating eye can levitate over lava but it avoids
               that due the effect of the heat causing it to dry out */
            if (mdat == C.mons[C.PM_FLOATING_EYE])
                return C.FALSE;
            else if (mtmp == C.gy.youmonst)
                return Number(Boolean((C.Levitation || C.Flying
                        || (C.Fire_resistance && C.Wwalking && C.uarmf
                            && C.uarmf.oerodeproof)
                        || (C.Upolyd && C.likes_lava(C.gy.youmonst.data)))));
            else
                return Number(Boolean((C.m_in_air(mtmp) || C.likes_lava(mdat))));
        }
        if (C.passes_walls(mdat) && C.may_passwall(x, y))
            return C.TRUE;
        if (C.amorphous(mdat) && C.closed_door(x, y))
            return C.TRUE;
        /* avoid onscary() if caller has specified that restriction */
        if (checkscary && (mtmp.m_id ? C.onscary(x, y, mtmp)
                                      : C.callLocal(goodpos_onscary, x, y, mdat)))
            return C.FALSE;
    }
    if (!C.accessible(x, y)) {
        if (!(C.is_pool(x, y) && ignorewater)
            && !(C.is_lava(x, y) && ignorelava))
            return C.FALSE;
    }
    /* skip boulder locations for most creatures */
    if (C.sobj_at(C.BOULDER, x, y) && (!mdat || !C.throws_rocks(mdat)))
        return C.FALSE;
    /* pretend GP_AVOID_MONPOS == monster creation */
    if (avoid_monpos && C.is_exclusion_zone(C.LR_MONGEN, x, y))
        return C.FALSE;

    return C.TRUE;
}

/*
 * "entity next to"
 *
 * Attempt to find a good place for the given monster type in the closest
 * position to (xx,yy).  Do so in successive square rings around (xx,yy).
 * If there is more than one valid position in the ring, choose one randomly.
 * Return TRUE and the position chosen when successful, FALSE otherwise.
 */
export function enexto(cc, xx, yy, mdat)
{
    return Number(Boolean((C.callLocal(enexto_core, cc, xx, yy, mdat, C.GP_CHECKSCARY)
            || C.callLocal(enexto_core, cc, xx, yy, mdat, C.NO_MM_FLAGS))));
}

export function enexto_gpflags(cc, xx, yy, mdat, entflags)
{
    return Number(Boolean((C.callLocal(enexto_core, cc, xx, yy, mdat, C.GP_CHECKSCARY | entflags)
            || C.callLocal(enexto_core, cc, xx, yy, mdat, entflags))));
}



export function enexto_core(cc, xx, yy, mdat, entflags)
/* output; <cc.x,cc.y> as close as feasible to <xx,yy> */
/* input coordinates */
/* type of monster; affects whether water or
                             * lava or boulder spots will be considered */
/* flags for goodpos() */
{
    const candy = C.coordArray(C.ROWNO * (C.COLNO - 1)); /* enough room for every location */
    let i, nearcandyct, allcandyct;
    const fakemon = C.localMonster(); /* dummy monster */
    let allow_xx_yy = ((entflags & C.GP_ALLOW_XY) != 0);
    /* note: GP_ALLOW_XY isn't used by goodpos(); old enext_core() used to
       mask it off to hide it from goodpos but that isn't required and we
       want to keep it in case the debugpline4() gets called */

    if (!mdat) {
        C.debugpline0("enexto() called with null mdat");
        /* default to player's original monster type */
        mdat = C.mons[C.u.umonster];
    }
    C.copyMonster(fakemon, C.cg.zeromonst);
    C.set_mon_data(fakemon, mdat); /* set up for goodpos() */

    /* gather candidate coordinates within 3 steps, those 1 step away in
       random order first, then those 2 steps away in random order, then 3;
       this will usually find a good spot without scanning the whole map */
    nearcandyct = C.callLocal(collect_coords, candy, xx, yy, 3, C.CC_NO_FLAGS,
                                 0);
    for (i = 0; i < nearcandyct; ++i) {
        C.copyCoord(cc, candy[i]);
        if (C.callLocal(goodpos, cc.x, cc.y, fakemon, entflags))
            return C.TRUE;
    }

    /* didn't find a spot; gather coordinates for the whole map except
       for <xx,yy> itself, ordered in expanding distance from <xx,yy>
       (subsets of equal distance grouped together with order randomized) */
    allcandyct = C.callLocal(collect_coords, candy, xx, yy, 0, C.CC_NO_FLAGS,
                                0);
    /* skip first 'nearcandyct' spots, they have already been rejected;
       they will occur in different random order but same overall total */
    for (i = nearcandyct; i < allcandyct; ++i) {
        C.copyCoord(cc, candy[i]);
        if (C.callLocal(goodpos, cc.x, cc.y, fakemon, entflags))
            return C.TRUE;
    }

    /* still didn't find a spot; maybe try <xx,yy> itself */
    cc.x = xx, cc.y = yy; /* final value for 'cc' in case we return False */
    if (allow_xx_yy && C.callLocal(goodpos, cc.x, cc.y, fakemon, entflags))
        return C.TRUE;

    /* failed to find any acceptable spot */
    C.debugpline4(()=>["enexto(\"%s\",%d,%d,0x%08lx) failed",
                mdat.pmnames[C.NEUTRAL], xx, yy,
                BigInt(entflags >>> 0)]);
    return C.FALSE;
}







































































































/*
 * Check for restricted areas present in some special levels.  (This might
 * need to be augmented to allow deliberate passage in wizard mode, but
 * only for explicitly chosen destinations.)
 */
export function tele_jump_ok(x1, y1, x2, y2)
{
    if (!C.isok(x2, y2))
        return C.FALSE;
    if (C.svd.dndest.nlx > 0) {
        /* if inside a restricted region, can't teleport outside */
        if (C.within_bounded_area(x1, y1, C.svd.dndest.nlx, C.svd.dndest.nly,
                                C.svd.dndest.nhx, C.svd.dndest.nhy)
            && !C.within_bounded_area(x2, y2, C.svd.dndest.nlx, C.svd.dndest.nly,
                                    C.svd.dndest.nhx, C.svd.dndest.nhy))
            return C.FALSE;
        /* and if outside, can't teleport inside */
        if (!C.within_bounded_area(x1, y1, C.svd.dndest.nlx, C.svd.dndest.nly,
                                 C.svd.dndest.nhx, C.svd.dndest.nhy)
            && C.within_bounded_area(x2, y2, C.svd.dndest.nlx, C.svd.dndest.nly,
                                   C.svd.dndest.nhx, C.svd.dndest.nhy))
            return C.FALSE;
    }
    if (C.svu.updest.nlx > 0) { /* ditto */
        if (C.within_bounded_area(x1, y1, C.svu.updest.nlx, C.svu.updest.nly,
                                C.svu.updest.nhx, C.svu.updest.nhy)
            && !C.within_bounded_area(x2, y2, C.svu.updest.nlx, C.svu.updest.nly,
                                    C.svu.updest.nhx, C.svu.updest.nhy))
            return C.FALSE;
        if (!C.within_bounded_area(x1, y1, C.svu.updest.nlx, C.svu.updest.nly,
                                 C.svu.updest.nhx, C.svu.updest.nhy)
            && C.within_bounded_area(x2, y2, C.svu.updest.nlx, C.svu.updest.nly,
                                   C.svu.updest.nhx, C.svu.updest.nhy))
            return C.FALSE;
    }
    return C.TRUE;
}

export function teleok(x, y, trapok)
{
    if (!trapok) {
        /* allow teleportation onto vibrating square, it's not a real trap;
           also allow pits and holes if levitating or flying */
        let trap = C.t_at(x, y);

        if (!trap)
            trapok = C.TRUE;
        else if (trap.ttyp == C.VIBRATING_SQUARE)
            trapok = C.TRUE;
        else if ((C.is_pit(trap.ttyp) || C.is_hole(trap.ttyp))
                 && (C.Levitation || C.Flying))
            trapok = C.TRUE;

        if (!trapok)
            return C.FALSE;
    }
    if (!C.callLocal(goodpos, x, y, C.gy.youmonst, 0))
        return C.FALSE;
    if (!C.callLocal(tele_jump_ok, C.u.ux, C.u.uy, x, y))
        return C.FALSE;
    if (!C.in_out_region(x, y))
        return C.FALSE;
    return C.TRUE;
}

export function teleds(nux, nuy, teleds_flags)
{
    let was_swallowed;
    let ball_active, ball_still_in_range = C.FALSE,
            allow_drag = (teleds_flags & C.TELEDS_ALLOW_DRAG) != 0,
            is_teleport = (teleds_flags & C.TELEDS_TELEPORT) != 0;
    let vault_guard = C.vault_occupied(C.u.urooms) ? C.findgd() : 0;

    if (C.u.utraptype == C.TT_BURIEDBALL) {
        /* unearth it */
        C.buried_ball_to_punishment();
    }
    ball_active = Number(Boolean((C.Punished && C.uball.where != C.OBJ_FREE)));
    if (!ball_active
        || C.near_capacity() > C.SLT_ENCUMBER
        || C.distmin(C.u.ux, C.u.uy, nux, nuy) > 1)
        allow_drag = C.FALSE;

    /* If they have to move the ball, then drag if allow_drag is true;
     * otherwise they are teleporting, so unplacebc().
     * If they don't have to move the ball, then always "drag" whether or
     * not allow_drag is true, because we are calling that function, not
     * to drag, but to move the chain.  *However*, there are some dumb
     * special cases:
     *    0                          0
     *   _X  move east       ----->  X_
     *    @                           @
     * These are permissible if teleporting, but not if dragging.  As a
     * result, drag_ball() needs to know about allow_drag and might end
     * up dragging the ball anyway.  Also, drag_ball() might find that
     * dragging the ball is completely impossible (ball in range but there's
     * rock in the way), in which case it teleports the ball on its own.
     */
    if (ball_active) {
        if (!C.carried(C.uball) && C.distmin(nux, nuy, C.uball.ox, C.uball.oy) <= 2)
            ball_still_in_range = C.TRUE; /* don't have to move the ball */
        else if (!allow_drag)
            C.unplacebc(); /* have to move the ball */
    }
    C.reset_utrap(C.FALSE);
    was_swallowed = C.u.uswallow; /* set_ustuck(Null) clears uswallow */
    C.set_ustuck(0);
    C.u.ux0 = C.u.ux;
    C.u.uy0 = C.u.uy;

    if (!C.hideunder(C.gy.youmonst) && C.gy.youmonst.data.mlet == C.S_MIMIC) {
        /* mimics stop being unnoticed */
        C.gy.youmonst.m_ap_type = C.M_AP_NOTHING;
    }

    if (was_swallowed) {
        if (C.Punished) { /* ball&chain are off map while swallowed */
            ball_active = C.TRUE; /* to put chain and non-carried ball on map */
            ball_still_in_range = allow_drag = C.FALSE; /* (redundant) */
        }
        C.docrt();
    }
    if (ball_active && (ball_still_in_range || allow_drag)) {
        const bc_control = C.scalarLocal("int");
        const ballx = C.scalarLocal("coord"), bally = C.scalarLocal("coord"), chainx = C.scalarLocal("coord"), chainy = C.scalarLocal("coord");
        const cause_delay = C.scalarLocal("boolean");

        if (C.drag_ball(nux, nuy, bc_control, ballx, bally, chainx,
                      chainy, cause_delay, allow_drag))
            C.move_bc(0, bc_control.value, ballx.value, bally.value, chainx.value, chainy.value);
        else {
            /* dragging fails if hero is encumbered beyond 'burdened' */
            /* uball might've been cleared via drag_ball -> spoteffects ->
               dotrap -> magic trap unpunishment */
            ball_active = Number(Boolean((C.Punished && C.uball.where != C.OBJ_FREE)));
            if (ball_active)
                C.unplacebc(); /* to match placebc() below */
        }
    }

    /* must set u.ux, u.uy after drag_ball(), which may need to know
       the old position if allow_drag is true... */
    C.u_on_newpos(nux, nuy); /* set u.<x,y>, usteed-><mx,my>; cliparound() */
    C.fill_pit(C.u.ux0, C.u.uy0);
    if (ball_active && C.uchain && C.uchain.where == C.OBJ_FREE)
        C.placebc(); /* put back the ball&chain if they were taken off map */
    C.update_player_regions();
    /*
     *  Make sure the hero disappears from the old location.  This will
     *  not happen if she is teleported within sight of her previous
     *  location.  Force a full vision recalculation because the hero
     *  is now in a new location.
     */
    C.newsym(C.u.ux0, C.u.uy0);
    C.see_monsters();
    C.gv.vision_full_recalc = 1;
    C.nomul(0);
    C.notice_mon_off();
    C.vision_recalc(0); /* vision before effects */

    /* this used to take place sooner, but if a --More-- prompt was issued
       then the old map display was shown instead of the new one */
    if (is_teleport && C.flags.verbose)
        C.You("materialize in %s location!",
            (nux == C.u.ux0 && nuy == C.u.uy0) ? "the same" : "a different");
    /* if terrain type changes, levitation or flying might become blocked
       or unblocked; might issue message, so do this after map+vision has
       been updated for new location instead of right after u_on_newpos() */
    if (C.levl[C.u.ux][C.u.uy].typ != C.levl[C.u.ux0][C.u.uy0].typ)
        C.switch_terrain();
    /* sequencing issue:  we want guard's alarm, if any, to occur before
       room entry message, if any, so need to check for vault exit prior
       to spoteffects; but spoteffects() sets up new value for u.urooms
       and vault code depends upon that value, so we need to fake it */
    if (vault_guard) {
        const save_urooms = C.stackAlloc(5); /* [sizeof u.urooms] */

        C.Strcpy(save_urooms, C.u.urooms);
        C.Strcpy(C.u.urooms, C.in_rooms(C.u.ux, C.u.uy, C.VAULT));
        /* if hero has left vault, make guard notice */
        if (!C.vault_occupied(C.u.urooms))
            C.uleftvault(vault_guard);
        C.Strcpy(C.u.urooms, save_urooms); /* reset prior to spoteffects() */
    }
    /* possible shop entry message comes after guard's shrill whistle */
    C.spoteffects(C.TRUE);
    C.invocation_message();
    C.notice_mon_on();
    C.notice_all_mons(C.TRUE);
    return;
}

/* make a list of coordinates in expanding distance from <cx,cy>;
   return value is number of coordinates inserted into ccc[]  */
export function collect_coords(ccc, cx, cy, maxradius, cc_flags, filter)
/* pointer to array of at least size ROWNO*(COLNO-1) */
/* center point, not necessarily <u.ux,u.uy> */
/* how far from center to go collecting spots;
                             * 0 means collect entire map */
/* incl_center: put <cx,cy> in output list
                             * (provided that it passes filter, if any);
                             * unshuffled: keep output in collection order;
                             * ring_pairs: shuffle pairs of rings together
                             * instead of keeping each ring distinct;
                             * skip_mons: reject occupied spots;
                             * skip_inaccs: reject !ZAP_POS() spots */
/* if Null, no filtering */
{
    let x, y, lox, hix, loy, hiy;
    let radius, rowrange, colrange, k, n = 0;
    const cc = C.localCoord(); let passcc = 0;
    let newpass, passend,
            /* is <cx,cy> a candidate? */
            include_cxcy = (cc_flags & C.CC_INCL_CENTER) != 0,
            /* flag is negative; turn local variable into positive */
            scramble = (cc_flags & C.CC_UNSHUFFLED) == 0,
            /* if scrambling, shuffle rings 1+2, 3+4, &c together */
            ring_pairs = Number(Boolean((scramble && (cc_flags & C.CC_RING_PAIRS) != 0))),
            /* exclude locations containing monsters from output */
            skip_mons = (cc_flags & C.CC_SKIP_MONS) != 0,
            /* exclude !ZAP_POS() locations from output; allows pools+lava */
            skip_inaccessible = (cc_flags & C.CC_SKIP_INACCS) != 0;
    let result = 0;

    rowrange = (cy < Math.trunc(C.ROWNO / 2)) ? (C.ROWNO - 1 - cy) : cy;
    colrange = (cx < Math.trunc(C.COLNO / 2)) ? (C.COLNO - 1 - cx) : cx;
    k = C.max(rowrange, colrange);
    /* if no radius limit has been specified, cover the whole map */
    if (!maxradius)
        maxradius = k;
    else
        maxradius = C.min(maxradius, k);
    /*
     * We operate on an expanding radius around the center, optionally
     * starting with the center spot itself, and shuffle the edges of
     * each expanding square or "ring".  (So all 1's are shuffled at
     * end of the pass for radius==1, then all 2's at end of radius==2,
     * and so on.  Shuffling of each ring doesn't encroach on any of
     * the others except when ring_pairs mode is specified.)
     *
     * Diagram of first three rings (four if 'include_cxcy' is specified)
     *   rings       unshuffled output      sample shuffled output (varies)
     *  3333333     25 26  .  .  .  . 31     33 29  .  .  .  . 44
     *  3222223     32  9 10 11 12 13 33     35 22 16 14 24 13 40
     *  3211123     34 14  1  2  3 15  .     38 20  2  8  3 15  .
     *  3210123     .  16  4  0  5 17  .     .  11  1  0  6  9  .
     *  3211123     .  18  6  7  8 19 39     .  19  5  7  4 12 25
     *  3222223     40 20 21 22 23 24 41     43 10 21 17 23 18 27
     *  3333333     42  .  .  .  . 47 48     37  .  .  .  . 30 36
     * . == entry not shown to reduce clutter when viewing inner portion.
     *
     * The digits under 'rings' are ring number, which is also distmin
     * from center, indicating the order in which sets of spots are
     * evaluated.  Output gets collected in expanding rings.  For the
     * two output grids, the number shown represents the position in the
     * returned list of coordinates.  When shuffling while ring_pairs is
     * specified, the 1's and 2's will be mixed together, the 3's and
     * (unshown) 4's will be mixed together, and so forth.
     *
     * If caller processes the output list in order, the closest viable
     * spot will be chosen.  If a completely random spot is preferred,
     * the list can be requested to be unscrambled and then the caller
     * can shuffle it, overriding the collection rings.  A filter function
     * could be used to skip everything after the first acceptable spot.
     * 'ring_pairs' mode allows for choosing a very close spot that isn't
     * immediately adjacent to the center point, useful for emergency
     * teleport to not always end up at the closest possible spot.
     *
     * TODO:
     *  Redo filter interface to have caller pass in a context cookie
     *  that can be passed through to filter so that it could have access
     *  to more info than just <x,y>.  Also add a way to stop collecting
     *  when an optimal value is found, without checking and skipping the
     *  rest of the map.
     */
    for (radius = include_cxcy ? 0 : 1; radius <= maxradius; ++radius) {
        if (!ring_pairs) {
            newpass = passend = C.TRUE;
        } else {
            /* 0 (if include_cxcy) and maxradius override odd/even */
            newpass = Number(Boolean(((radius % 2) != 0 || radius == 0))); /* odd */
            passend = Number(Boolean(((radius % 2) == 0 || radius == maxradius))); /* even */
        }
        if (newpass || !passcc) { /* !passcc is redundant but used to fend
                                   * off analyzers thinking use of passcc
                                   * below might occur while still Null */
            passcc = ccc; /* start of output entries for current radius (or
                           * first half of radius pair depending on flags) */
            n = 0; /* number of entries for passcc; used for shuffling */
        }
        lox = C.short(cx - radius), hix = C.short(cx + radius);
        loy = C.short(cy - radius), hiy = C.short(cy + radius);
        for (y = C.short(C.max(loy, 0)); y <= hiy; y = C.short(y + 1)) {
            if (y > C.ROWNO - 1)
                break; /* done with collection for current radius */
            for (x = C.short(C.max(lox, 1)); x <= hix; x = C.short(x + 1)) { /* column 0 is not used */
                if (x > C.COLNO - 1)
                    break; /* advance to next 'y' */
                if (x != lox && x != hix && y != loy && y != hiy)
                    continue; /* not any edge of ring/square */
                if ((skip_mons && C.m_at(x, y))
                    /* note: !ACCESSIBLE() would reject water and lava;
                       !ZAP_POS() accepts them; caller needs to handle such */
                    || (skip_inaccessible && !C.ZAP_POS(C.levl[x][y].typ)))
                    continue; /* quick filters */
                if (filter && !C.callFilter(filter, x, y))
                    continue;
                cc.x = x, cc.y = y;
                C.copyCoord(C.coordAt(ccc), cc); ccc = C.coordOffset(ccc, 1);
                ++n;
                ++result;
            }
        }
        if (scramble && passend) {
            /* shuffle entries gathered for current radius (or pair) */
            while (n > 1) {
                k = C.rn2(()=>(n), 700, "collect_coords"); /* 0..n-1 */
                if (k) { /* swap [k] with [0] when k is 1..n-1 */
                    C.copyCoord(cc, C.coordAt(passcc));
                    C.copyCoord(C.coordAt(passcc), C.coordAt(passcc, k));
                    C.copyCoord(C.coordAt(passcc, k), cc);
                }
                passcc = C.coordOffset(passcc, 1); /* passcc[0] has reached its final place    */
                --n;      /* and become exempt from further shuffling */
            }
        }
    } /* radius loop */
    C.debugpline4(()=>["collect_coords(,%d,%d,%d,,)=%d", cx, cy, maxradius, result]);
    return result;
}

/* [try to] teleport hero to a safe spot */
export function safe_teleds(teleds_flags)
{
    let nux, nuy;
    let cc_flags;
    const candy = C.coordArray(C.ROWNO * (C.COLNO - 1)), backupspot = C.localCoord();
    let tcnt, candycount;

    /*
     * This used to try random locations up to 400 times, with first 200
     * tries disallowing trap locations and remaining 200 accepting such.
     * On levels without many accessible locations (either due to being
     * mostly stone or high monster population) it could fail to find a
     * spot.
     *
     * Now it tries completely randomly only 40 times, all disallowing
     * traps, then resorts to checking the entire map, near hero's spot
     * first then expanding out from there.  If no non-trap spot is found,
     * first trap spot is used.
     */
    for (tcnt = 0; tcnt < 40; ++tcnt) {
        nux = C.short(C.rnd(()=>(C.COLNO - 1), 737, "safe_teleds"));
        nuy = C.short(C.rn2(()=>(C.ROWNO), 738, "safe_teleds"));
        if (C.callLocal(teleok, nux, nuy, C.FALSE)) {
            C.callLocal(teleds, nux, nuy, teleds_flags);
            return C.TRUE;
        }
    }

    /* get a shuffled list of candidate locations, starting with spots
       1 or 2 steps from hero, then 3 or 4 steps, then 5 or 6, on up */
    cc_flags = C.CC_RING_PAIRS | C.CC_SKIP_MONS;
    if (!C.Passes_walls)
        cc_flags |= C.CC_SKIP_INACCS;
    candycount = C.callLocal(collect_coords, candy, C.u.ux, C.u.uy, 0, cc_flags,
                                0);
    backupspot.x = backupspot.y = 0;
    /* skip trap locations via teleok(,,FALSE) but remember first
       encountered trap spot that is acceptable to teleok(,,TRUE) */
    for (tcnt = 0; tcnt < candycount; ++tcnt) {
        nux = C.short(candy[tcnt].x), nuy = C.short(candy[tcnt].y);
        if (C.callLocal(teleok, nux, nuy, C.FALSE)) {
            C.callLocal(teleds, nux, nuy, teleds_flags);
            return C.TRUE;
        }
        if (!backupspot.x && C.t_at(nux, nuy) && C.callLocal(teleok, nux, nuy, C.TRUE))
            backupspot.x = nux, backupspot.y = nuy;
    }
    /* no non-trap spot found; if we skipped a viable trap spot, use it */
    if (backupspot.x) {
        C.callLocal(teleds, backupspot.x, backupspot.y, teleds_flags);
        return C.TRUE;
    }
    return C.FALSE;
}

export function vault_tele()
{
    let croom = C.search_special(C.VAULT);
    const c = C.localCoord();

    if (croom && C.somexyspace(croom, c) && C.callLocal(teleok, c.x, c.y, C.FALSE)) {
        C.callLocal(teleds, c.x, c.y, C.TELEDS_TELEPORT);
        return;
    }
    C.callLocal(tele, );
}

export function teleport_pet(mtmp, force_it)
{
    let otmp;

    if (mtmp == C.u.usteed)
        return C.FALSE;

    if (mtmp.mleashed) {
        otmp = C.get_mleash(mtmp);
        release_it: {
        if (!otmp) {
            C.impossible("%s is leashed, without a leash.", C.Monnam(mtmp));
            break release_it;
        }
        if (otmp.cursed && !force_it) {
            C.yelp(mtmp);
            return C.FALSE;
        } else {
            C.Your("leash goes slack.");
        }
        }
        C.m_unleash(mtmp, C.FALSE);
        return C.TRUE;
    }
    return C.TRUE;
}

/* teleport to random pet, if valid location next to it */
export function tele_to_rnd_pet()
{
    let mtmp, pet = 0;
    let cnt = 0;

    if (C.callLocal(noteleport_level, C.gy.youmonst)) {
        C.impossible("%s", "attempt to teleport hero to be near a pet on no-teleport level");
        return;
    }

    for (mtmp = C.fmon; mtmp; mtmp = mtmp.nmon)
        if (!C.DEADMONSTER(mtmp) && mtmp.mtame && !C.mon_offmap(mtmp)) {
            cnt++;
            if (!C.rn2(()=>(cnt), 828, "tele_to_rnd_pet"))
                pet = mtmp;
        }
    if (pet && !C.m_next2u(pet)) {
        let tx = C.short(pet.mx + C.rn2(()=>(3), 832, "tele_to_rnd_pet") - 1),
                ty = C.short(pet.my + C.rn2(()=>(3), 833, "tele_to_rnd_pet") - 1);

        if (C.isok(tx, ty) && C.callLocal(teleok, tx, ty, C.FALSE))
            C.callLocal(teleds, tx, ty, C.TELEDS_TELEPORT);
    }
}

/* teleport the hero via some method other than scroll of teleport */
export function tele()
{
    C.callLocal(scrolltele, 0);
}

/* teleport the hero; usually discover scroll of teleportation if via scroll */
export function scrolltele(scroll)
{
    const cc = C.localCoord();

    /* Disable teleportation in stronghold && Vlad's Tower */
    if (C.callLocal(noteleport_level, C.gy.youmonst) && !C.wizard) {
        C.pline("A mysterious force prevents you from teleporting!");
        if (scroll)
            C.learnscroll(scroll); /* this is obviously a teleport scroll */
        return;
    }

    /* don't show trap if "Sorry..." */
    if (!C.Blinded)
        C.make_blinded(0n, C.FALSE);

    if ((C.u.uhave.amulet || C.On_W_tower_level(C.u.uz)) && !C.rn2(()=>(3), 865, "scrolltele")) {
        C.You_feel("disoriented for a moment.");
        /* don't discover the scroll [at least not yet for wizard override];
           disorientation doesn't reveal that this is a teleport attempt */
        if (!C.wizard || C.y_n("Override?") != 121)
            return;
    }
    if (((C.Teleport_control || (scroll && scroll.blessed)) && !C.Stunned)
        || C.wizard) {
        if (C.unconscious()) {
            C.pline("Being unconscious, you cannot control your teleport.");
        } else {
            const whobuf = C.stackAlloc(C.BUFSZ);

            C.Strcpy(whobuf, "you");
            if (C.u.usteed)
                C.Sprintf(C.eos(whobuf), " and %s", C.mon_nam(C.u.usteed));
            C.pline("Where do %s want to be teleported?", whobuf);
            if (scroll)
                C.learnscroll(scroll);
            cc.x = C.u.ux;
            cc.y = C.u.uy;
            if (C.isok(C.iflags.travelcc.x, C.iflags.travelcc.y)) {
                /* The player showed some interest in traveling here;
                 * pre-suggest this coordinate. */
                C.copyCoord(cc, C.iflags.travelcc);
            }
            if (C.getpos(cc, C.TRUE, "the desired position") < 0)
                return; /* abort */
            /* possible extensions: introduce a small error if
               magic power is low; allow transfer to solid rock */
            if (C.callLocal(teleok, cc.x, cc.y, C.FALSE)) {
                /* for scroll, discover it regardless of destination */
                C.callLocal(teleds, cc.x, cc.y, C.TELEDS_TELEPORT);
                if (C.u_at(C.iflags.travelcc.x, C.iflags.travelcc.y))
                    C.iflags.travelcc.x = C.iflags.travelcc.y = 0;
                return;
            }
            C.pline("Sorry...");
        }
    }

    /* we used to suppress discovery if hero teleported to a nearby
       spot which was already within view, but now there is always a
       "materialize" message regardless of how far you teleported so
       discovery of scroll type is unconditional */
    if (scroll)
        C.learnscroll(scroll);

    C.callLocal(safe_teleds, C.TELEDS_TELEPORT);
}

/* the #teleport command; 'm ^T' == choose among several teleport modes */
export function dotelecmd()
{
    let save_HTele, save_ETele;
    let res, added, hidden;
    let ignore_restrictions = C.FALSE;
/* also defined in spell.c */
    const NOOP_SPELL = 0;
    const HIDE_SPELL = 1;
    const ADD_SPELL = 2;
    const UNHIDESPELL = 3;
    const REMOVESPELL = 4;
    /* normal mode; ignore 'm' prefix if it was given */
    if (!C.wizard)
        return C.callLocal(dotele, C.FALSE) ? C.ECMD_TIME : C.ECMD_OK;

    added = hidden = NOOP_SPELL;
    save_HTele = C.HTeleportation, save_ETele = C.ETeleportation;
    if (!C.iflags.menu_requested) {
        ignore_restrictions = C.TRUE;
    } else {
        const tports = C.staticData("dotelecmd.tports", ()=>[
            /*
             * Potential combinations:
             *  1) attempt ^T without intrinsic, not know spell;
             *  2) via intrinsic, not know spell, obey restrictions;
             *  3) via intrinsic, not know spell, ignore restrictions;
             *  4) via intrinsic, know spell, obey restrictions;
             *  5) via intrinsic, know spell, ignore restrictions;
             *  6) via spell, not have intrinsic, obey restrictions;
             *  7) via spell, not have intrinsic, ignore restrictions;
             *  8) force, obey other restrictions;
             *  9) force, ignore restrictions.
             * We only support the 1st (t), 2nd (n), 6th (s), and 9th (w).
             *
             * This ignores the fact that there is an experience level
             * (or poly-form) requirement which might make normal ^T fail.
             */
            { menulet: 110, menudesc: "normal ^T on demand; no spell, obey restrictions" },
            { menulet: 115, menudesc: "via spellcast; no intrinsic teleport" },
            { menulet: 116, menudesc: "try ^T without having it; no spell" },
            { menulet: 119, menudesc: "debug mode; ignore restrictions" }, /* trad wizard mode */
        ]);
        const picks = C.menuLocal();
        const any = C.localAnything();
        let win;
        let i, tmode, clr = C.NO_COLOR;

        win = C.create_nhwindow(C.NHW_MENU);
        C.start_menu(win, C.MENU_BEHAVE_STANDARD);
        C.copyAnything(any, C.cg.zeroany);
        for (i = 0; i < tports.length; ++i) {
            any.a_int = tports[i].menulet;
            C.add_menu(win, C.nul_glyphinfo, any, C.char(any.a_int), 0,
                     C.ATR_NONE, clr, tports[i].menudesc,
                     (tports[i].menulet == 119) ? C.MENU_ITEMFLAGS_SELECTED
                                                : C.MENU_ITEMFLAGS_NONE);
        }
        C.end_menu(win, "Which way do you want to teleport?");
        i = C.select_menu(win, C.PICK_ONE, picks);
        C.destroy_nhwindow(win);
        if (i > 0) {
            tmode = picks.value[0].item.a_int;
            /* if we got 2, use the one which wasn't preselected */
            if (i > 1 && tmode == 119)
                tmode = picks.value[1].item.a_int;
            C.free(picks.value);
        } else if (i == 0) {
            /* preselected one was explicitly chosen and got toggled off */
            tmode = 119;
        } else { /* ESC */
            return C.ECMD_OK;
        }
        switch (tmode) {
        case 110:
            C.HTeleportation |= C.I_SPECIAL; /* confer intrinsic teleportation */
            hidden = C.tport_spell(HIDE_SPELL); /* hide teleport-away */
            break;
        case 115:
            C.HTeleportation = C.ETeleportation = 0n; /* suppress intrinsic */
            added = C.tport_spell(ADD_SPELL); /* add teleport-away */
            break;
        case 116:
            C.HTeleportation = C.ETeleportation = 0n; /* suppress intrinsic */
            hidden = C.tport_spell(HIDE_SPELL); /* hide teleport-away */
            break;
        case 119:
            ignore_restrictions = C.TRUE;
            break;
        }
    }

    /* if dotele() can be fatal, final disclosure might lie about
       intrinsic teleportation; we should be able to live with that
       since the menu finagling is only applicable in wizard mode */
    res = C.callLocal(dotele, ignore_restrictions);

    C.HTeleportation = save_HTele;
    C.ETeleportation = save_ETele;
    if (added != NOOP_SPELL || hidden != NOOP_SPELL)
        /* can't both be non-NOOP so addition will yield the non-NOOP one */
        C.tport_spell(added + hidden - NOOP_SPELL);

    return res ? C.ECMD_TIME : C.ECMD_OK;





}

export function dotele(break_the_rules)
/* True: wizard mode ^T */
{
    let trap;
    let cantdoit;
    let trap_once = C.FALSE;

    trap = C.t_at(C.u.ux, C.u.uy);
    if (trap && !trap.tseen)
        trap = 0;

    if (trap) {
        if (trap.ttyp == C.LEVEL_TELEP && trap.tseen) {
            if (C.y_n("There is a level teleporter here. Trigger it?") == 121) {
                C.callLocal(level_tele_trap, trap, C.FORCETRAP);
                /* deliberate jumping will always take time even if it doesn't
                 * work */
                return 1;
            } else
                trap = 0; /* continue with normal horizontal teleport */
        } else if (trap.ttyp == C.TELEP_TRAP) {
            trap_once = trap.once; /* trap may get deleted, save this */
            if (trap.once) {
                C.pline("This is a vault teleport, usable once only.");
                if (C.y_n("Jump in?") == 110) {
                    trap = 0;
                } else {
                    C.deltrap(trap);
                    C.newsym(C.u.ux, C.u.uy);
                }
            }
            if (trap)
                C.You("%s onto the teleportation trap.", C.u_locomotion("jump"));
        } else
            trap = 0;
    }
    if (!trap && !break_the_rules) {
        let castit = C.FALSE;
        let energy = 0;

        if (!C.Teleportation || (C.u.ulevel < (C.Role_if(C.PM_WIZARD) ? 8 : 12)
                               && !C.can_teleport(C.gy.youmonst.data))) {
            /* Try to use teleport away spell. */
            let knownsp = C.known_spell(C.SPE_TELEPORT_AWAY);

            /* casting isn't inhibited by being Stunned (...it ought to be) */
            castit = Number(Boolean((knownsp >= C.spe_Fresh && !C.Confusion)));
            if (!castit && !break_the_rules) {
                C.You("%s.", (!C.Teleportation ? ((knownsp != C.spe_Unknown)
                                              ? "can't cast that spell"
                                              : "don't know that spell")
                            : "are not able to teleport at will"));
                return 0;
            }
        }

        cantdoit = 0;
        /* 3.6.2: the magic numbers for hunger, strength, and energy
           have been changed to match the ones used in spelleffects().
           Also, failing these tests used to return 1 and use a move
           even though casting failure due to these reasons doesn't.
           [Note: this spellev() is different from the one in spell.c
           but they both yield the same result.] */
        energy = 5 * C.objects[C.SPE_TELEPORT_AWAY].oc_level;















        if (C.u.uhunger <= 10) {
            cantdoit = "are too weak from hunger";
        } else if (C.ACURR(C.A_STR) < 4) {
            cantdoit = "lack the strength";
        } else if (energy > C.u.uen) {
            cantdoit = "lack the energy";
        }
        if (cantdoit) {
            C.You("%s %s.", cantdoit,
                castit ? "for a teleport spell" : "to teleport");
            return 0;
        } else if (C.check_capacity(
                       "Your concentration falters from carrying so much.")) {
            return 1; /* this failure in spelleffects() also uses the move */
        }

        if (castit) {
            /* energy cost is deducted in spelleffects() */
            C.exercise(C.A_WIS, C.TRUE);
            if ((C.spelleffects(C.SPE_TELEPORT_AWAY, C.TRUE, C.FALSE) & C.ECMD_TIME))
                return 1;
            else if (!break_the_rules)
                return 0;
        } else {
            /* bypassing spelleffects(); apply energy cost directly */
            C.u.uen -= energy;
            C.disp.botl = C.TRUE;
        }
    }

    if (C.next_to_u()) {
        if (trap && trap_once) {
            C.callLocal(vault_tele, );
        } else if (trap && C.isok(trap.teledest.x, trap.teledest.y)) {
            C.callLocal(teleds, trap.teledest.x, trap.teledest.y, C.TELEDS_TELEPORT);
        } else {
            C.iflags.travelcc.x = C.iflags.travelcc.y = 0;
            C.callLocal(tele, );
        }
        C.next_to_u();
    } else {
        C.You("%s", C.shudder_for_moment);
        return 0;
    }
    if (!trap)
        C.morehungry(100);
    return 1;
}

export function level_tele()
{
    const get_there_from = C.literal("get there from %s.");
    let newlev;
    const newlevel = C.localLevel();
    let escape_by_flying = 0; /* when surviving dest of -N */
    const buf = C.stackAlloc(C.BUFSZ);
    let force_dest = C.FALSE;

    if (C.iflags.debug_fuzzer) {
        do {
            newlevel.dnum = C.rn2(()=>(C.svn.n_dgns), 1176, "level_tele");
        } while (newlevel.dnum == C.astral_level.dnum
                 || C.svd.dungeons[newlevel.dnum].flags.unconnected
                 || !C.svd.dungeons[newlevel.dnum].num_dunlevs);
        newlevel.dlevel = 1 + C.rn2(()=>(C.dunlevs_in_dungeon(newlevel)), 1180, "level_tele");
        C.assign_level(C.u.ucamefrom, C.u.uz);
        C.schedule_goto(newlevel, C.UTOTYPE_NONE, 0, 0);
        return;
    }
    if ((C.u.uhave.amulet || C.In_endgame(C.u.uz) || C.In_sokoban(C.u.uz))
        && !C.wizard) {
        C.You_feel("very disoriented for a moment.");
        return;
    }
    random_levtport: for (let random_levtport_jump = false; ; random_levtport_jump = true) {
    if (!random_levtport_jump && ((C.Teleport_control && !C.Stunned) || C.wizard)) {
        const qbuf = C.stackAlloc(C.BUFSZ);
        let trycnt = 0;

        C.Strcpy(qbuf, "To what level do you want to teleport?");
        do {
            let levTport_menu_jump = false;
            if (C.iflags.menu_requested) {
                /* wizard mode 'm ^V' skips prompting on first pass
                   (note: level Tport via menu won't have any second pass) */
                C.iflags.menu_requested = C.FALSE;
                if (C.wizard)
                    levTport_menu_jump = true;
            }
            if (!levTport_menu_jump) {
            if (++trycnt == 2) {
                if (C.wizard)
                    C.Strcat(qbuf, " [type a number, name, or ? for a menu]");
                else
                    C.Strcat(qbuf, " [type a number or name]");
            }
            C.storeChar(buf, 0); /* EDIT_GETLIN: if we're on second or later pass,
                            the previous input was invalid so don't use it
                            as getlin()'s preloaded default answer */
            C.getlin(qbuf, buf);
            if (!C.strcmp(buf, "*")) {
                continue random_levtport;
            } else if (C.Confusion && C.rnl(()=>(5), 1215, "level_tele")) {
                C.pline("Oops...");
                continue random_levtport;
            } else if (!C.strcmp(buf, "\x1b")) { /* cancelled */
                return;
            }
            }
            if (levTport_menu_jump || (C.wizard && !C.strcmp(buf, "?"))) {
                const destlev = C.scalarLocal("boolean");
                const destdnum = C.scalarLocal("coord");

                destlev.value = 0;
                destdnum.value = 0;
                newlev = C.print_dungeon(C.TRUE, destlev, destdnum);
                if (!newlev)
                    return;

                newlevel.dnum = destdnum.value;
                newlevel.dlevel = destlev.value;
                if (C.In_endgame(newlevel) && !C.In_endgame(C.u.uz)) {
                    let amu;

                    if (!C.u.uhave.amulet
                        && (amu = C.mksobj(C.AMULET_OF_YENDOR, C.TRUE, C.FALSE))
                               != 0) {
                        /* ordinarily we'd use hold_another_object()
                           for something like this, but we don't want
                           fumbling or already full pack to interfere */
                        amu = C.addinv(amu);
                        C.prinv("Endgame prerequisite:", amu, 0n);
                    }
                }
                force_dest = C.TRUE;
            } else if ((newlev = C.lev_by_name(buf)) == 0)
                newlev = C.atoi(buf);
        } while (!newlev && !C.digit(C.loadChar(buf, 0))
                 && (C.loadChar(buf, 0) != 45 || !C.digit(C.loadChar(buf, 1))) && trycnt < 10);

        /* no dungeon escape via this route */
        if (newlev == 0) {
            if (trycnt >= 10)
                continue random_levtport;
            if (C.ynq("Go to Nowhere.  Are you sure?") != 121)
                return;
            C.You("%s in agony as your body begins to warp...",
                C.is_silent(C.gy.youmonst.data) ? "writhe" : "scream");
            C.display_nhwindow(C.WIN_MESSAGE, C.FALSE);
            C.You("cease to exist.");
            if (C.gi.invent)
                C.Your("possessions land on the %s with a thud.",
                     C.surface(C.u.ux, C.u.uy));
            C.svk.killer.format = C.NO_KILLER_PREFIX;
            C.Strcpy(C.svk.killer.name, "committed suicide");
            C.done(C.DIED);
            C.pline("An energized cloud of dust begins to coalesce.");
            C.Your("body rematerializes%s.",
                 C.gi.invent ? ", and you gather up all your possessions" : "");
            return;
        }

        /* if in Knox and the requested level > 0, stay put.
         * we let negative values requests fall into the "heaven" loop.
         */
        if (C.single_level_branch(C.u.uz) && newlev > 0 && !force_dest) {
            C.You1(C.shudder_for_moment);
            return;
        }
        /* if in Quest, the player sees "Home 1", etc., on the status
         * line, instead of the logical depth of the level.  controlled
         * level teleport request is likely to be relativized to the
         * status line, and consequently it should be incremented to
         * the value of the logical depth of the target level.
         *
         * we let negative values requests fall into the "heaven" handling.
         */
        if (C.In_quest(C.u.uz) && newlev > 0)
            newlev = newlev + C.svd.dungeons[C.u.uz.dnum].depth_start - 1;
    } else { /* involuntary level tele */
        newlev = C.callLocal(random_teleport_level, );
        if (newlev == C.depth(C.u.uz)) {
            C.You1(C.shudder_for_moment);
            return;
        }
    }

    if (C.u.utrap && C.u.utraptype == C.TT_BURIEDBALL)
        C.buried_ball_to_punishment();

    if (!C.next_to_u() && !force_dest) {
        C.You1(C.shudder_for_moment);
        return;
    }
    if (C.In_endgame(C.u.uz)) { /* must already be wizard */
        let llimit = C.dunlevs_in_dungeon(C.u.uz);

        if (newlev >= 0 || newlev <= -llimit) {
            C.You_cant(get_there_from, "here");
            return;
        }
        newlevel.dnum = C.u.uz.dnum;
        newlevel.dlevel = llimit + newlev;
        C.schedule_goto(newlevel, C.UTOTYPE_NONE, 0, 0);
        return;
    }

    C.storeChar(C.svk.killer.name, 0); /* still alive, so far... */

    if (C.iflags.debug_fuzzer && newlev < 0)
        continue random_levtport;
    if (newlev < 0 && !force_dest) {
        if (C.loadChar(C.u.ushops0)) {
            /* take unpaid inventory items off of shop bills */
            C.gi.in_mklev = C.TRUE; /* suppress map update */
            C.u_left_shop(C.u.ushops0, C.TRUE);
            /* you're now effectively out of the shop */
            C.storeChar(C.u.ushops, 0); C.storeChar(C.u.ushops0, 0);
            C.gi.in_mklev = C.FALSE;
        }
        if (newlev <= -10) {
            C.You("arrive in heaven.");
            C.SetVoice(0, 0, 80, C.voice_deity);
            C.verbalize("Thou art early, but we'll admit thee.");
            C.svk.killer.format = C.NO_KILLER_PREFIX;
            C.Strcpy(C.svk.killer.name, "went to heaven prematurely");
        } else if (newlev == -9) {
            C.You_feel("deliriously happy.");
            C.pline("(In fact, you're on Cloud 9!)");
            C.display_nhwindow(C.WIN_MESSAGE, C.FALSE);
        } else
            C.You("are now high above the clouds...");

        if (C.loadChar(C.svk.killer.name, 0)) {
            ; /* arrival in heaven is pending */
        } else if (C.Levitation) {
            escape_by_flying = "float gently down to earth";
        } else if (C.Flying) {
            escape_by_flying = "fly down to the ground";
        } else {
            C.pline("Unfortunately, you don't know how to fly.");
            C.You("plummet a few thousand feet to your death.");
            C.Sprintf(C.svk.killer.name,
                    "teleported out of the dungeon and fell to %s death",
                    C.uhis());
            C.svk.killer.format = C.NO_KILLER_PREFIX;
        }
    }

    if (C.loadChar(C.svk.killer.name, 0)) { /* the chosen destination was not survivable */
        const lsav = C.localLevel();

        /* set specific death location; this also suppresses bones */
        C.copyLevel(lsav, C.u.uz);   /* save current level; see below */
        C.u.uz.dnum = 0; /* main dungeon */
        C.u.uz.dlevel = (newlev <= -10) ? -10 : 0; /* heaven or surface */
        C.done(C.DIED);
        /* can only get here via life-saving (or declining to die in
           explore|debug mode); the hero has now left the dungeon... */
        escape_by_flying = "find yourself back on the surface";
        C.copyLevel(C.u.uz, lsav); /* restore u.uz so escape code works */
    }

    /* calls done(ESCAPED) if newlevel==0 */
    if (escape_by_flying) {
        C.You("%s.", escape_by_flying);
        /* [dlevel used to be set to 1, but it doesn't make sense to
            teleport out of the dungeon and float or fly down to the
            surface but then actually arrive back inside the dungeon] */
        newlevel.dnum = 0;   /* specify main dungeon */
        newlevel.dlevel = 0; /* escape the dungeon */
    } else if (force_dest) {
        /* wizard mode menu; no further validation needed */
        ;
    } else if (C.u.uz.dnum == C.medusa_level.dnum
               && newlev >= C.svd.dungeons[C.u.uz.dnum].depth_start
                                + C.dunlevs_in_dungeon(C.u.uz)) {
        C.find_hell(newlevel);
    } else {
        /* FIXME: we should avoid using hard-coded knowledge of
           which branches don't connect to anything deeper;
           mainly used to distinguish "can't get there from here"
           vs "from anywhere" rather than to control destination */
        let qbranch = C.In_quest(C.u.uz) ? C.qstart_level
                          : C.In_mines(C.u.uz) ? C.mineend_level
                            : C.sanctum_level;
        let deepest = C.svd.dungeons[qbranch.dnum].depth_start
                      + C.dunlevs_in_dungeon(qbranch) - 1;

        /* if invocation did not yet occur, teleporting into
         * the last level of Gehennom is forbidden.
         */
        if (!C.wizard && C.Inhell && !C.u.uevent.invoked && newlev >= deepest) {
            newlev = deepest - 1;
            C.pline("Sorry...");
        }
        /* no teleporting out of quest dungeon */
        if (C.In_quest(C.u.uz) && newlev < C.depth(C.qstart_level))
            newlev = C.depth(C.qstart_level);
        /* the player thinks of levels purely in logical terms, so
         * we must translate newlev to a number relative to the
         * current dungeon.
         */
        C.get_level(newlevel, newlev);

        if (C.on_level(newlevel, C.u.uz) && newlev != C.depth(C.u.uz)) {
            C.You_cant(get_there_from,
                     (newlev > deepest) ? "anywhere" : "here");
            return;
        }
    }

    C.schedule_goto(newlevel, C.UTOTYPE_NONE, 0,
                  C.flags.verbose ? "You materialize on a different level!"
                                : 0);












    break;
    }
}

export function domagicportal(ttmp)
{
    const target_level = C.localLevel();
    let totype;
    let stunmsg = 0;

    if (C.u.utrap && C.u.utraptype == C.TT_BURIEDBALL)
        C.buried_ball_to_punishment();

    if (!C.next_to_u()) {
        C.You1(C.shudder_for_moment);
        return;
    }

    /* if landed from another portal, do nothing */
    /* problem: level teleport landing escapes the check */
    if (!C.on_level(C.u.uz, C.u.uz0))
        return;

    C.You("activated a magic portal!");

    /* prevent the poor shnook, whose amulet was stolen while in
     * the endgame, from accidently triggering the portal to the
     * next level, and thus losing the game
     */
    if (C.In_endgame(C.u.uz) && !C.u.uhave.amulet) {
        C.You_feel("dizzy for a moment, but nothing happens...");
        return;
    }

    C.copyLevel(target_level, ttmp.dst);

    /* coming back from tutorial doesn't trigger stunning */
    if (C.In_tutorial(C.u.uz) && !C.In_tutorial(target_level)) {
        /* returning to normal play => arrive on level 1 stairs */
        totype = C.UTOTYPE_ATSTAIRS;
        stunmsg = "Resuming regular play.";
    } else {
        totype = C.UTOTYPE_PORTAL;
        stunmsg = !C.Stunned ? "You feel slightly dizzy."
                            : "You feel dizzier.";
        C.make_stunned((C.HStun & C.TIMEOUT) + 3n, C.FALSE);
    }

    C.schedule_goto(target_level, totype, stunmsg, 0);
}

export function tele_trap(trap)
{
    /* a fixed-destination teleport trap could theoretically place hero onto a
     * second teleport trap; prevent the recursive call from spoteffects() from
     * triggering the trap at the destination */
    
    if (C.teleportState.in_tele_trap)
        return;

    C.teleportState.in_tele_trap = C.TRUE;
    if (C.In_endgame(C.u.uz) || C.Antimagic || C.callLocal(noteleport_level, C.gy.youmonst)) {
        if (C.Antimagic)
            C.shieldeff(C.u.ux, C.u.uy);
        C.You_feel("a wrenching sensation.");
    } else if (!C.next_to_u()) {
        C.You1(C.shudder_for_moment);
    } else if (trap.once) {
        C.deltrap(trap);
        C.newsym(C.u.ux, C.u.uy); /* get rid of trap symbol */
        C.callLocal(vault_tele, );
    } else if (C.isok(trap.teledest.x, trap.teledest.y)) {
        const cc = C.localCoord();
        let mtmp = C.m_at(trap.teledest.x, trap.teledest.y);

        C.settrack();
        if (mtmp) {
            if (!C.callLocal(enexto, cc, mtmp.mx, mtmp.my, mtmp.data)) {
                /* could not find some other place to put mtmp; the level must
                 * be nearly or completely full */
                C.You1(C.shudder_for_moment);
            }
            else {
                C.callLocal(rloc_to, mtmp, cc.x, cc.y);
                mtmp = 0; /* no longer a monster at dest */
            }
        }
        if (!mtmp) {
            C.callLocal(teleds, trap.teledest.x, trap.teledest.y, C.TELEDS_TELEPORT);
        }
    } else
        C.callLocal(tele, );

    C.teleportState.in_tele_trap = C.FALSE;
}

export function level_tele_trap(trap, trflags)
{
    const verbbuf = C.stackAlloc(C.BUFSZ);
    let intentional = C.FALSE;

    if ((trflags & (C.VIASITTING | C.FORCETRAP)) != 0) {
        C.Strcpy(verbbuf, "trigger"); /* follows "You sit down." */
        intentional = C.TRUE;
    } else
        C.Sprintf(verbbuf, "%s onto", C.u_locomotion("step"));
    C.You("%s a level teleport trap!", verbbuf);

    if (C.Antimagic && !intentional) {
        C.shieldeff(C.u.ux, C.u.uy);
    }
    if ((C.Antimagic && !intentional) || C.In_endgame(C.u.uz)) {
        C.You_feel("a wrenching sensation.");
        return;
    }
    C.deltrap(trap);
    C.newsym(C.u.ux, C.u.uy); /* get rid of trap symbol */
    C.callLocal(level_tele, );

    if (C.Hallucination || C.Teleport_control)
        C.You("briefly feel %s.", C.Hallucination ? "oriented" : "centered");
    else
        C.You_feel("%sdisoriented.", C.Confusion ? "even more " : "");
    /* magic portal traversal causes brief Stun; for level teleport, use
       confusion instead, and only when hero lacks control; do this after
       processing the level teleportation attempt because being confused
       can affect the outcome ("Oops" result) */
    if (!C.Teleport_control)
        C.make_confused((C.HConfusion & C.TIMEOUT) + 3n, C.FALSE);
}

/* check whether monster can arrive at location <x,y> via Tport (or fall) */
export function rloc_pos_ok(x, y, mtmp)
/* coordinates of candidate location */
{
    let xx, yy;

    if (!C.callLocal(goodpos, x, y, mtmp, C.GP_CHECKSCARY))
        return C.FALSE;
    /*
     * Check for restricted areas present in some special levels.
     *
     * `xx' is current column; if 0, then `yy' will contain flag bits
     * rather than row:  bit #0 set => moving upwards; bit #1 set =>
     * inside the Wizard's tower.
     */
    xx = C.short(mtmp.mx);
    yy = C.short(mtmp.my);
    if (!xx) {
        /* no current location (migrating monster arrival) */
        if (C.svd.dndest.nlx && C.On_W_tower_level(C.u.uz))
            return (((yy & 2) != 0)
                    /* inside xor not within */
                    ^ !C.within_bounded_area(x, y,
                                           C.svd.dndest.nlx, C.svd.dndest.nly,
                                           C.svd.dndest.nhx, C.svd.dndest.nhy));
        if (C.svu.updest.lx && (yy & 1) != 0) /* moving up */
            return Number(Boolean((C.within_bounded_area(x, y,
                                        C.svu.updest.lx, C.svu.updest.ly,
                                        C.svu.updest.hx, C.svu.updest.hy)
                    && (!C.svu.updest.nlx
                        || !C.within_bounded_area(x, y,
                                            C.svu.updest.nlx, C.svu.updest.nly,
                                            C.svu.updest.nhx, C.svu.updest.nhy)))));
        if (C.svd.dndest.lx && (yy & 1) == 0) /* moving down */
            return Number(Boolean((C.within_bounded_area(x, y,
                                        C.svd.dndest.lx, C.svd.dndest.ly,
                                        C.svd.dndest.hx, C.svd.dndest.hy)
                    && (!C.svd.dndest.nlx
                        || !C.within_bounded_area(x, y,
                                            C.svd.dndest.nlx, C.svd.dndest.nly,
                                            C.svd.dndest.nhx, C.svd.dndest.nhy)))));
    } else {
        /* [try to] prevent a shopkeeper or temple priest from being
           sent out of his room (caller might resort to goodpos() if
           we report failure here, so this isn't full prevention) */
        if (mtmp.isshk && C.inhishop(mtmp)) {
            if (C.levl[x][y].roomno != C.unsignedChar(C.ESHK(mtmp).shoproom))
                return C.FALSE;
        } else if (mtmp.ispriest && C.inhistemple(mtmp)) {
            if (C.levl[x][y].roomno !=  C.unsignedChar(C.EPRI(mtmp).shroom))
                return C.FALSE;
        }
        /* current location is <xx,yy> */
        if (!C.callLocal(tele_jump_ok, xx, yy, x, y))
            return C.FALSE;
    }
    /* <x,y> is ok */
    return C.TRUE;
}

/*
 * rloc_to()
 *
 * Pulls a monster from its current position and places a monster at
 * a new x and y.  If oldx is 0, then the monster was not in the
 * levels.monsters array.  However, if oldx is 0, oldy may still have
 * a value because mtmp is a migrating_mon.  Worm tails are always
 * placed randomly around the head of the worm.
 */
export function rloc_to_core(mtmp, x, y, rlocflags)
{
    let oldx = C.short(mtmp.mx), oldy = C.short(mtmp.my);
    let resident_shk = Number(Boolean(mtmp.isshk && C.inhishop(mtmp)));
    let preventmsg = (rlocflags & C.RLOC_NOMSG) != 0;
    let vanishmsg = (rlocflags & C.RLOC_MSG) != 0;
    let appearmsg = (mtmp.mstrategy & C.STRAT_APPEARMSG) != 0;
    let domsg = Number(Boolean(!C.gi.in_mklev && (vanishmsg || appearmsg) && !preventmsg));
    let telemsg = C.FALSE;

    if (x == mtmp.mx && y == mtmp.my && C.m_at(x, y) == mtmp)
        return; /* that was easy */

    if (oldx) { /* "pick up" monster */
        if (domsg && C.canspotmon(mtmp)) {
            if (C.couldsee(x, y) || C.sensemon(mtmp)) {
                telemsg = C.TRUE;
            } else {
                C.pline("%s vanishes!", C.Monnam(mtmp));
            }
            /* avoid "It suddenly appears!" for a STRAT_APPEARMSG monster
               that has just teleported away if we won't see it after this
               vanishing (the regular appears message will be given if we
               do see it) */
            appearmsg = C.FALSE;
        }

        if (mtmp.wormno) {
            C.remove_worm(mtmp);
        } else {
            C.remove_monster(oldx, oldy);
            C.newsym(oldx, oldy); /* update old location */
        }
    }

    C.mon_track_clear(mtmp);
    C.place_monster(mtmp, x, y); /* put monster down */
    C.update_monster_region(mtmp);

    if (mtmp.wormno) /* now put down tail */
        C.place_worm_tail_randomly(mtmp, x, y);

    if (C.u.ustuck == mtmp) {
        if (C.u.uswallow) {
            C.u_on_newpos(mtmp.mx, mtmp.my);
            C.check_special_room(C.FALSE);
            C.docrt();
        } else if (!C.m_next2u(mtmp)) {
           C.unstuck(mtmp);
        }
    }

    C.maybe_unhide_at(x, y);
    C.newsym(x, y);      /* update new location */
    C.set_apparxy(mtmp); /* orient monster */
    if (domsg && (C.canspotmon(mtmp) || appearmsg || mtmp == C.u.ustuck)) {
        let du = C.distu(x, y), olddu;
        let next = (du <= 2) ? " next to you" : 0, /* next2u() */
                   nearu = (du <= C.BOLT_LIM * C.BOLT_LIM) ? " close by" : 0;

        C.set_msg_xy(x, y);
        mtmp.mstrategy &= ~C.STRAT_APPEARMSG; /* one chance only */
        if (mtmp == C.u.ustuck && !C.u_at(C.u.ux0, C.u.uy0)) {
            C.You("and %s teleport together.", C.mon_nam(mtmp));
        } else if (telemsg && (C.couldsee(x, y) || C.sensemon(mtmp))) {
            C.pline("%s vanishes and reappears%s.",
                  C.Monnam(mtmp),
                  next ? next
                  : nearu ? nearu
                    : ((olddu = C.distu(oldx, oldy)) == du) ? ""
                      : (du < olddu) ? " closer to you"
                        : " farther away");
        } else {
            C.pline("%s %s%s%s!",
                  appearmsg ? C.Amonnam(mtmp) : C.Monnam(mtmp),
                  appearmsg ? "suddenly " : "",
                  !C.Blind ? "appears" : "arrives",
                  next ? next : nearu ? nearu : "");
        }
        /* wand discovery only happens if a messaage is delivered (bug?);
           if spell or q.mechanic attack or artifact #invoke for banish
           then current_wand will be Null */
        if (C.gc.current_wand && C.gc.current_wand.otyp == C.WAN_TELEPORTATION)
            C.makeknown(C.WAN_TELEPORTATION);
    }

    /* shopkeepers will only teleport if you zap them with a wand of
       teleportation or if they've been transformed into a jumpy monster;
       the latter only happens if you've attacked them with polymorph
       [FIXME? or they've been hit by a genetic engineer, which won't
       necessarily be due to Conflict by hero] */
    if (resident_shk && !C.inhishop(mtmp))
        C.make_angry_shk(mtmp, oldx, oldy);

    /* if a monster carrying shop goods teleports out of the shop, blame
       it on the hero; chance of an unpaid item is vanishingly small, but
       no_charge is easily possible and needs to be cleared if not in shop;
       a for-sale item is ordinary here--shk won't notice it leaving; if
       mtmp teleports from one shop into another, no_charge status sticks
       and an item on the first shk's bill stays there */
    if (mtmp.minvent && !C.costly_spot(x, y)) {
        let otmp;
        let shkp = C.find_objowner(mtmp.minvent, oldx, oldy);
        let peaceful = Number(Boolean(!shkp || shkp.mpeaceful));

        for (otmp = mtmp.minvent; otmp; otmp = otmp.nobj) {
            if (otmp.no_charge)
                otmp.no_charge = 0;
            else if (shkp && C.onshopbill(otmp, shkp, C.TRUE))
                C.stolen_value(otmp, oldx, oldy, peaceful, C.FALSE);
        }
    }

    /* if hero is busy, maybe stop occupation */
    if (C.go.occupation)
        C.dochugw(mtmp, C.FALSE);

    /* trapped monster teleported away */
    if (mtmp.mtrapped && !mtmp.wormno)
        C.mintrap(mtmp, C.NO_TRAP_FLAGS);
}

export function rloc_to(mtmp, x, y)
{
    C.callLocal(rloc_to_core, mtmp, x, y, C.RLOC_NOMSG);
}

export function rloc_to_flag(mtmp, x, y, rlocflags)
{
    C.callLocal(rloc_to_core, mtmp, x, y, rlocflags);
}

export function stairway_find_forwiz(isladder, up)
{
    let stway = C.gs.stairs;

    while (stway && !(stway.isladder == isladder
                      && stway.up == up && stway.tolev.dnum == C.u.uz.dnum))
        stway = stway.next;
    return stway;
}

/* place a monster at a random location, typically due to teleport;
   return TRUE if successful, FALSE if not; rlocflags is RLOC_foo flags */
export function rloc(mtmp, rlocflags)
/* mtmp->mx==0 implies migrating monster arrival */
{
    const cc = C.localCoord(), backupcc = C.localCoord(), candy = C.coordArray(C.ROWNO * (C.COLNO - 1)); /* room for entire map */
    let cc_flags;
    let x, y;
    let trycount, i, j, candycount;

    if (mtmp == C.u.usteed) {
        C.callLocal(tele, );
        return C.TRUE;
    }

    found_xy: {
    if (mtmp.iswiz && mtmp.mx) { /* Wizard, not just arriving */
        let stway;

        if (!C.In_W_tower(C.u.ux, C.u.uy, C.u.uz)) {
            stway = C.callLocal(stairway_find_forwiz, C.FALSE, C.TRUE);
        } else if (!C.callLocal(stairway_find_forwiz, C.TRUE, C.FALSE)) { /* bottom of tower */
            stway = C.callLocal(stairway_find_forwiz, C.TRUE, C.TRUE);
        } else {
            stway = C.callLocal(stairway_find_forwiz, C.TRUE, C.FALSE);
        }

        x = C.short(stway ? stway.sx : 0);
        y = C.short(stway ? stway.sy : 0);

        /* if the wiz teleports away to heal, try the up staircase,
           to block the player's escaping before he's healed
           (deliberately use `goodpos' rather than `rloc_pos_ok' here) */
        if (C.callLocal(goodpos, x, y, mtmp, C.NO_MM_FLAGS))
            break found_xy;
    }

    /* wizard-mode player can choose destination by setting 'montelecontrol'
       option; ignored if/when this is arrival of a migrating monster */
    if (C.iflags.mon_telecontrol && mtmp.mx) {
        cc.x = mtmp.mx, cc.y = mtmp.my;
        if (C.callLocal(control_mon_tele, mtmp, cc, rlocflags, C.TRUE)) {
            x = C.short(cc.x), y = C.short(cc.y);
            break found_xy;
        }
    }

    /* this used to try randomly 1000 times, then fallback to left-to-right
       top-to-bottom exhaustive check; now that the exhaustive check uses
       randomized order, reduce the number of random attempts to 50;
       on levels with lots of available space, random can find a spot more
       quickly but might fail to find one no matter how many tries it makes */
    for (trycount = 0; trycount < 50; ++trycount) {
        x = C.short(C.rnd(()=>(C.COLNO - 1), 1850, "rloc")); /* 1..COLNO-1 */
        y = C.short(C.rn2(()=>(C.ROWNO), 1851, "rloc")); /* 0..ROWNO-1 */
        if (C.callLocal(rloc_pos_ok, x, y, mtmp)) /* rejects 'onscary' */
            break found_xy;
    }

    /* try harder to find a good place; gather a list of all candidate
       locations (every accessible unoccupied spot except for hero's;
       goodpos() will reject that), then shuffle them ourselves instead
       of having collect_coords() do it (which would be in rings centered
       around arbitrary <COLNO/2,ROWNO/2>) */
    cc_flags = C.CC_INCL_CENTER | C.CC_UNSHUFFLED | C.CC_SKIP_MONS;
    if (!C.passes_walls(mtmp.data))
        cc_flags |= C.CC_SKIP_INACCS;
    candycount = C.callLocal(collect_coords, candy, Math.trunc(C.COLNO / 2), Math.trunc(C.ROWNO / 2), 0, cc_flags,
                                0);
    backupcc.x = backupcc.y = 0;
    for (i = 0; i < candycount; ++i) {
        if ((j = C.rn2(()=>(candycount - i), 1868, "rloc")) > 0) {
            C.copyCoord(cc, candy[i]);
            C.copyCoord(candy[i], candy[i + j]);
            C.copyCoord(candy[i + j], cc);
        }
        x = C.short(candy[i].x), y = C.short(candy[i].y);
        if (C.callLocal(rloc_pos_ok, x, y, mtmp))
            break found_xy;
        if (!backupcc.x && C.callLocal(goodpos, x, y, mtmp, C.NO_MM_FLAGS))
            backupcc.x = x, backupcc.y = y;
    }

    /* we didn't find any spot acceptable to rloc_pos_ok() which avoids
       'onscary' and honors teleport regions, but if we did find a spot
       that was acceptable to goodpos() (which ignores 'onscary' and
       teleport regions) we'll use that; otherwise give up */
    if (!backupcc.x) {
        /* level either full of monsters or somehow faulty */
        if ((rlocflags & C.RLOC_ERR) != 0)
            C.impossible("rloc(): couldn't relocate monster");
        return C.FALSE;
    }
    x = C.short(backupcc.x), y = C.short(backupcc.y);
    /*goto found_xy;*/
    }
    C.callLocal(rloc_to_core, mtmp, x, y, rlocflags);
    return C.TRUE;
}

/* let wizard-mode player choose a teleporting monster's destination */
export function control_mon_tele(mon, cc_p, rlocflags, via_rloc)
/* input: default spot; output: player selected spot */
{
    const tcbuf = C.stackAlloc(C.BUFSZ);

    if (!C.isok(cc_p.x, cc_p.y)) {
        cc_p.x = mon.mx, cc_p.y = mon.my;
        if (!C.isok(cc_p.x, cc_p.y))
            cc_p.x = C.u.ux, cc_p.y = C.u.uy;
    }

    if (!C.wizard || !C.iflags.mon_telecontrol)
        return C.FALSE;

    C.pline("Teleport %s @ <%d,%d> where?",
          C.noit_mon_nam(mon), mon.mx, mon.my);
    /* getpos '?' will show "Move the cursor to <where to teleport Foo>:" */
    C.Sprintf(tcbuf, "where to teleport %s", C.noit_mon_nam(mon));
    if (C.getpos(cc_p, C.FALSE, tcbuf) >= 0 && !C.u_at(cc_p.x, cc_p.y)) {
        if (via_rloc
              ? C.callLocal(rloc_pos_ok, cc_p.x, cc_p.y, mon)
              : C.callLocal(goodpos, cc_p.x, cc_p.y, mon, rlocflags))
            return C.TRUE;
        if (!C.iflags.debug_fuzzer) {
            C.Sprintf(tcbuf, "<%d,%d> is not considered viable; force anyway?",
                    mon.mx, mon.my);
            if (C.y_n(tcbuf) == 121)
                return C.TRUE;
        }
    }
    C.pline("%s destination.", via_rloc ? "Picking random" : "Using derived");
    return C.FALSE;
}

export function mvault_tele(mtmp)
{
    let croom = C.search_special(C.VAULT);
    const c = C.localCoord();

    if (croom && C.somexyspace(croom, c) && C.callLocal(goodpos, c.x, c.y, mtmp, 0)) {
        C.callLocal(rloc_to, mtmp, c.x, c.y);
        return;
    }
    C.callLocal(rloc, mtmp, C.RLOC_NONE);
}

export function tele_restrict(mon)
{
    if (C.callLocal(noteleport_level, mon)) {
        if (C.canseemon(mon))
            C.pline("A mysterious force prevents %s from teleporting!",
                  C.mon_nam(mon));
        return C.TRUE;
    }
    return C.FALSE;
}

export function mtele_trap(mtmp, trap, in_sight)
{
    let monname;

    /* don't print feedback here: a monster stepping on a trap and not
       teleporting from it isn't visible */
    if (C.callLocal(noteleport_level, mtmp))
        return;

    if (C.callLocal(teleport_pet, mtmp, C.FALSE)) {
        /* save name with pre-movement visibility */
        monname = C.Monnam(mtmp);

        /* Note: don't remove the trap if a vault.  Other-
         * wise the monster will be stuck there, since
         * the guard isn't going to come for it...
         */
        if (trap.once)
            C.callLocal(mvault_tele, mtmp);
        else if (C.isok(trap.teledest.x, trap.teledest.y)) {
            /* monster teleporting onto hero's or another monster's spot does
             * not work the same as hero teleporting onto monster's spot where
             * the incoming monster displaces the resident to the nearest
             * possible space - instead it just doesn't work. */
            if (!(C.m_at(trap.teledest.x, trap.teledest.y)
                  || C.u_at(trap.teledest.x, trap.teledest.y))) {
                C.callLocal(rloc_to_core, mtmp, trap.teledest.x, trap.teledest.y,
                             C.RLOC_MSG);
            }
        } else
            C.callLocal(rloc, mtmp, C.RLOC_NONE);

        if (in_sight) {
            if (C.canseemon(mtmp))
                C.pline("%s seems disoriented.", monname);
            else
                C.pline("%s suddenly disappears!", monname);
            C.seetrap(trap);
        }
    }
}

/* return Trap_Effect_Finished if still on level, Trap_Moved_Mon if not */
export function mlevel_tele_trap(mtmp, trap, force_it, in_sight)
{
    let tt = (trap ? trap.ttyp : C.NO_TRAP);

    if (mtmp == C.u.ustuck) /* probably a vortex */
        return C.Trap_Effect_Finished; /* temporary? kludge */
    if (C.callLocal(teleport_pet, mtmp, force_it)) {
        const tolevel = C.localLevel();
        let migrate_typ = C.MIGR_RANDOM;

        if (C.is_hole(tt)) {
            if (C.Is_stronghold(C.u.uz)) {
                C.assign_level(tolevel, C.valley_level);
            } else if (C.Is_botlevel(C.u.uz)) {
                if (in_sight && trap.tseen)
                    C.pline_mon(mtmp, "%s avoids the %s.",
                              C.Monnam(mtmp),
                             (tt == C.HOLE) ? "hole" : "trap");
                return C.Trap_Effect_Finished;
            } else {
                C.assign_level(tolevel, trap.dst);
                C.clamp_hole_destination(tolevel);
            }
        } else if (tt == C.MAGIC_PORTAL) {
            if (C.In_endgame(C.u.uz) && (C.mon_has_amulet(mtmp)
                                      || C.is_home_elemental(mtmp.data)
                                      || C.rn2(()=>(7), 2036, "mlevel_tele_trap"))) {
                if (in_sight && mtmp.data.mlet != C.S_ELEMENTAL) {
                    C.pline_mon(mtmp,
                              "%s seems to shimmer for a moment.",
                              C.Monnam(mtmp));
                    C.seetrap(trap);
                }
                return C.Trap_Effect_Finished;
            } else {
                C.assign_level(tolevel, trap.dst);
                migrate_typ = C.MIGR_PORTAL;
            }
        } else if (tt == C.LEVEL_TELEP || tt == C.NO_TRAP) {
            let nlev;

            if (C.mon_has_amulet(mtmp) || C.In_endgame(C.u.uz)
                /* NO_TRAP is used when forcing a monster off the level;
                   onscary(0,0,) is true for the Wizard, Riders, lawful
                   minions, Angels of any alignment, shopkeeper or priest
                   currently inside his or her own special room */
                || (tt == C.NO_TRAP && C.onscary(0, 0, mtmp))) {
                if (in_sight)
                    C.pline_mon(mtmp,
                             "%s seems very disoriented for a moment.",
                             C.Monnam(mtmp));
                return C.Trap_Effect_Finished;
            }
            if (tt == C.NO_TRAP) {
                /* creature is being forced off the level to make room;
                   it will try to return to this level (at a random spot
                   rather than its current one) if the level is left by
                   the hero and then revisited */
                C.assign_level(tolevel, C.u.uz);
            } else {
                nlev = C.callLocal(random_teleport_level, );
                if (nlev == C.depth(C.u.uz)) {
                    if (in_sight)
                        C.pline_mon(mtmp, "%s shudders for a moment.",
                                  C.Monnam(mtmp));
                    return C.Trap_Effect_Finished;
                }
                C.get_level(tolevel, nlev);
            }
        } else {
            C.impossible("mlevel_tele_trap: unexpected trap type (%d)", tt);
            return C.Trap_Effect_Finished;
        }

        if (in_sight) {
            C.pline_mon(mtmp, "Suddenly, %s %s.", C.mon_nam(mtmp),
                     (tt == C.HOLE) ? "falls into a hole"
                   : (tt == C.TRAPDOOR) ? "falls through a trap door"
                   : "disappears out of sight");
            if (trap)
                C.seetrap(trap);
        }
        if (C.is_xport(tt) && !C.control_teleport(mtmp.data))
            mtmp.mconf = 1;
        C.migrate_to_level(mtmp, C.ledger_no(tolevel), migrate_typ, 0);
        return C.Trap_Moved_Mon; /* no longer on this level */
    }
    return C.Trap_Effect_Finished;
}

/* place object randomly, returns False if it's gone (eg broken) */
export function rloco(obj)
{
    let tx, ty, otx, oty;
    let restricted_fall;
    let try_limit = 4000;

    if (obj.otyp == C.CORPSE && C.is_rider(C.mons[obj.corpsenm])) {
        if (C.revive_corpse(obj))
            return C.FALSE;
    }

    C.obj_extract_self(obj);
    otx = C.short(obj.ox);
    oty = C.short(obj.oy);
    restricted_fall = Number(Boolean((otx == 0 && C.svd.dndest.lx)));
    do {
        tx = C.short(C.rn1(()=>(C.COLNO - 3), ()=>(2), 2118, "rloco"));
        ty = C.short(C.rn2(()=>(C.ROWNO), 2119, "rloco"));
        if (!--try_limit)
            break;
    } while (!C.callLocal(goodpos, tx, ty, 0, 0)
             || (restricted_fall
                 && (!C.within_bounded_area(tx, ty,
                                          C.svd.dndest.lx, C.svd.dndest.ly,
                                          C.svd.dndest.hx, C.svd.dndest.hy)
                     || (C.svd.dndest.nlx
                         && C.within_bounded_area(tx, ty,
                                            C.svd.dndest.nlx, C.svd.dndest.nly,
                                            C.svd.dndest.nhx, C.svd.dndest.nhy))))
             /* on the Wizard Tower levels, objects inside should
                stay inside and objects outside should stay outside */
             || (C.svd.dndest.nlx && C.On_W_tower_level(C.u.uz)
                 && C.within_bounded_area(tx, ty,
                                        C.svd.dndest.nlx, C.svd.dndest.nly,
                                        C.svd.dndest.nhx, C.svd.dndest.nhy)
                    != C.within_bounded_area(otx, oty,
                                           C.svd.dndest.nlx, C.svd.dndest.nly,
                                           C.svd.dndest.nhx, C.svd.dndest.nhy)));

    if (C.flooreffects(obj, tx, ty, "fall")) {
        /* update old location (if any) since flooreffects() couldn't;
           unblock_point() for boulder handled by obj_extract_self() */
        if (!(otx == 0 && oty == 0))
            C.newsym(otx, oty);
        return C.FALSE;
    } else if (otx == 0 && oty == 0) {
        ; /* fell through a trap door; no update of old loc needed */
    } else {
        let shkp = C.find_objowner(obj, otx, oty);
        let objinshop = Number(Boolean(shkp && C.costly_spot(otx, oty))),
                onboundary = Number(Boolean(shkp && C.costly_adjacent(shkp, otx, oty)));

        /*
         * If object starts inside shop or is unpaid and on shop boundary:
         * if hero is outside the shop, treat this as theft;
         * otherwise, if it arrives inside same shop, remove it from bill;
         * otherwise, if it arrives on the boundary, add it to bill;
         * if it arrives outside the shop, treat this as a theft.
         * Billing routines deal with obj->no_charge.
         */
        if (objinshop || (obj.unpaid && onboundary)) {
            let h = C.loadChar(C.in_rooms(C.u.ux, C.u.uy, C.SHOPBASE)),
                 oo = C.loadChar(C.in_rooms(otx, oty, 0));
            let hinshop = Number(Boolean(h && C.strchr(C.in_rooms(shkp.mx, shkp.my, 0), h)));

            if (hinshop && C.costly_spot(tx, ty)
                /* verify that it's the same shop */
                && oo && C.strchr(C.in_rooms(tx, ty, 0), oo)) {
                if (obj.unpaid)
                    C.subfrombill(obj, shkp);
            } else if (hinshop && C.costly_adjacent(shkp, tx, ty)
                       && oo && C.strchr(C.in_rooms(tx, ty, 0), oo)) {
                if (!obj.unpaid)
                    C.addtobill(obj, C.FALSE, C.FALSE, C.FALSE);
            } else {
                C.stolen_value(obj, otx, oty, C.FALSE, C.FALSE);
            }
        }

        C.newsym(otx, oty); /* update old location */
    }
    C.place_object(obj, tx, ty);
    /* note: block_point() for boulder handled by place_object() */
    C.newsym(tx, ty);
    return C.TRUE;
}

/* Returns an absolute depth */
export function random_teleport_level()
{
    let nlev, max_depth, min_depth, cur_depth = C.depth(C.u.uz);

    /* [the endgame case can only occur in wizard mode] */
    if (!C.rn2(()=>(5), 2196, "random_teleport_level") || C.single_level_branch(C.u.uz) || C.In_endgame(C.u.uz))
        return cur_depth;

    /* What I really want to do is as follows:
     * -- If in a dungeon that goes down, the new level is to be restricted
     *    to [top of parent, bottom of current dungeon]
     * -- If in a dungeon that goes up, the new level is to be restricted
     *    to [top of current dungeon, bottom of parent]
     * -- If in a quest dungeon or similar dungeon entered by portals,
     *    the new level is to be restricted to [top of current dungeon,
     *    bottom of current dungeon]
     * The current behavior is not as sophisticated as that ideal, but is
     * still better what we used to do, which was like this for players
     * but different for monsters for no obvious reason.  Currently, we
     * must explicitly check for special dungeons.  We check for Knox
     * above; endgame is handled in the caller due to its different
     * message ("disoriented").
     * --KAA
     * 3.4.2: explicitly handle quest here too, to fix the problem of
     * monsters sometimes level teleporting out of it into main dungeon.
     * Also prevent monsters reaching the Sanctum prior to invocation.
     */
    if (C.In_quest(C.u.uz)) {
        let bottom = C.dunlevs_in_dungeon(C.u.uz),
            qlocate_depth = C.qlocate_level.dlevel;

        /* if hero hasn't reached the middle locate level yet,
           no one can randomly teleport past it */
        if (C.dunlev_reached(C.u.uz) < qlocate_depth)
            bottom = qlocate_depth;
        min_depth = C.svd.dungeons[C.u.uz.dnum].depth_start;
        max_depth = bottom + (C.svd.dungeons[C.u.uz.dnum].depth_start - 1);
    } else {
        min_depth = 1;
        max_depth = C.dunlevs_in_dungeon(C.u.uz)
                    + (C.svd.dungeons[C.u.uz.dnum].depth_start - 1);
        /* can't reach Sanctum if the invocation hasn't been performed */
        if (C.Inhell && !C.u.uevent.invoked)
            max_depth -= 1;
    }

    /* Get a random value relative to the current dungeon */
    /* Range is 1 to current+3, current not counting */
    nlev = C.rn2(()=>(cur_depth + 3 - min_depth), 2239, "random_teleport_level") + min_depth;
    if (nlev >= cur_depth)
        nlev++;

    if (nlev > max_depth) {
        nlev = max_depth;
        /* teleport up if already on bottom */
        if (C.Is_botlevel(C.u.uz))
            nlev -= C.rnd(()=>(3), 2247, "random_teleport_level");
    }
    if (nlev < min_depth) {
        nlev = min_depth;
        if (nlev == cur_depth) {
            nlev += C.rnd(()=>(3), 2252, "random_teleport_level");
            if (nlev > max_depth)
                nlev = max_depth;
        }
    }
    return nlev;
}

/* you teleport a monster (via wand, spell, or poly'd q.mechanic attack);
   return false iff the attempt fails */
export function u_teleport_mon(mtmp, give_feedback)
{
    const cc = C.localCoord();

    if (C.svl.level.flags.stasis_until >= C.svm.moves) {
        if (give_feedback)
            C.pline("A mysterious force prevents you teleporting %s!",
                  C.mon_nam(mtmp));
        return C.FALSE;
    } else if (mtmp.ispriest && C.loadChar(C.in_rooms(mtmp.mx, mtmp.my, C.TEMPLE))) {
        if (give_feedback)
            C.pline("%s resists your magic!", C.Monnam(mtmp));
        return C.FALSE;
    } else if (C.engulfing_u(mtmp) && C.callLocal(noteleport_level, mtmp)) {
        if (give_feedback)
            C.You("are no longer inside %s!", C.mon_nam(mtmp));
        C.unstuck(mtmp);
        if (!C.callLocal(rloc, mtmp, C.RLOC_MSG))
            C.m_into_limbo(mtmp);
    } else if ((C.is_rider(mtmp.data) || C.control_teleport(mtmp.data))
               && C.rn2(()=>(13), 2285, "u_teleport_mon") && C.callLocal(enexto, cc, C.u.ux, C.u.uy, mtmp.data)) {
        C.callLocal(rloc_to, mtmp, cc.x, cc.y);
    } else {
        if (!C.callLocal(rloc, mtmp, C.RLOC_MSG))
            return C.FALSE;
    }
    return C.TRUE;
}

/*teleport.c*/

/* !NEW_ENEXTO */

/* set up for goodpos */

/* used to use 'if (range > ROWNO && range > COLNO) return FALSE' below,
       so effectively 'max(ROWNO, COLNO)' which performs useless iterations
       (possibly many iterations if <xx,yy> is in the center of the map) */

/* setup: no suitable spots yet, first iteration checks adjacent spots */

/*
     * Walk around the border of the square with center (xx,yy) and
     * radius range.  Stop when we find at least one valid position.
     */

/* beware of accessing beyond segment boundaries.. */

/* 3.6.3: this used to use 'ymin+1' which left top row unchecked */

/* return False if we exhausted 'range' without finding anything */

/* 3.6.3: earlier versions didn't have the option to try <xx,yy>,
           and left 'cc' uninitialized when returning False */

/* if every spot other than <xx,yy> has failed, try <xx,yy> itself */

/* 'cc' is set */

/* we've got between 1 and SIZE(good) candidates; choose one */

/* ?NEW_ENEXTO */

/* the addition of !break_the_rules to the outer if-block in
           1ada454f rendered this dead code */

/* spell will cost more if carrying the Amulet, but the
               amount is rnd(2 * energy) so we can't know by how much;
               average is twice the normal cost, but could be triple;
               the extra energy is spent even if that results in not
               having enough to cast (which also uses the move) */

/* always wait until end of turn to change level, otherwise code
         * that references monsters as this call stack unwinds won't be
         * able to access them reliably; the do-the-change-now code here
         * dates from when reading a scroll of teleportation wouldn't
         * always make the scroll become discovered but that's no longer
         * the case so it shouldn't be needed anymore */

/* in case player just read a scroll and is about to be asked to
       call it something, we can't defer until the end of the turn */
