/* NetHack 5.0	vault.c	$NHDT-Date: 1737622664 2025/01/23 00:57:44 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.113 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Robert Patrick Rankin, 2011. */
/* NetHack may be freely redistributed.  See license for details. */

import { C } from './c-runtime.js';














export function newegd(mtmp)
{
    if (!mtmp.mextra)
        mtmp.mextra = C.newmextra();
    if (!mtmp.mextra.egd) {
        mtmp.mextra.egd =  C.alloc(C.egdSize);
        C.memset( mtmp.mextra.egd, 0, C.egdSize);
        mtmp.mextra.egd.parentmid = mtmp.m_id;
    }
}

export function free_egd(mtmp)
{
    if (mtmp.mextra && mtmp.mextra.egd) {
        C.free( mtmp.mextra.egd);
        mtmp.mextra.egd =  0;
    }
    mtmp.isgd = 0;
}

/* try to remove the temporary corridor (from vault to rest of map) being
   maintained by guard 'grd'; if guard is still in it, removal will fail,
   to be tried again later */
export function clear_fcorr(grd, forceshow)
{
    let fcx, fcy, fcbeg;
    let mtmp;
    let sawcorridor = C.FALSE,
            silently = C.program_state.stopprint ? C.TRUE : C.FALSE;
    let egrd = grd.mextra.egd;
    let trap;
    let lev;

    if (!C.on_level(egrd.gdlevel, C.u.uz))
        return C.TRUE;

    /* note: guard remains on 'fmon' list (alive or dead, at off-map
       coordinate <0,0>), until temporary corridor from vault back to
       civilization has been removed */
    while ((fcbeg = C.coordxy(egrd.fcbeg)) < egrd.fcend) {
        fcx = egrd.fakecorr[fcbeg].fx;
        fcy = egrd.fakecorr[fcbeg].fy;
        if ((C.DEADMONSTER(grd) || !in_fcorridor(grd, C.u.ux, C.u.uy))
            && egrd.gddone)
            forceshow = C.TRUE;
        if ((C.u_at(fcx, fcy) && !C.DEADMONSTER(grd))
            || (!forceshow && C.couldsee(fcx, fcy))
            || (C.Punished && !C.carried(C.uball) && C.uball.ox == fcx
                && C.uball.oy == fcy))
            return C.FALSE;

        if ((mtmp = C.m_at(fcx, fcy)) != 0) {
            if (mtmp.isgd) {
                return C.FALSE;
            } else {
                if (mtmp.mtame)
                    C.yelp(mtmp);
                if (!C.rloc(mtmp, C.RLOC_MSG))
                    C.m_into_limbo(mtmp);
            }
        }
        lev = C.levl[fcx][fcy];
        if (lev.typ == C.CORR && C.cansee(fcx, fcy))
            sawcorridor = C.TRUE;
        lev.typ = egrd.fakecorr[fcbeg].ftyp;
        lev.flags = egrd.fakecorr[fcbeg].flags;
        if (C.IS_STWALL(lev.typ)) {
            /* destroy any trap here (pit dug by you, hole dug via
               wand while levitating or by monster, bear trap or land
               mine via object, spun web) when spot reverts to stone */
            if ((trap = C.t_at(fcx, fcy)) != 0)
                C.deltrap(trap);
            /* undo scroll/wand/spell of light affecting this spot */
            if (lev.typ == C.STONE)
                blackout(fcx, fcy);
        }
        C.del_engr_at(fcx, fcy);
        C.map_location(fcx, fcy, 1); /* bypass vision */
        C.recalc_block_point(fcx, fcy);
        C.gv.vision_full_recalc = 1;
        egrd.fcbeg++;
    }
    if (sawcorridor && !silently)
        C.pline_The("corridor disappears.");
    /* only give encased message if hero is still alive (might get here
       via paygd() -> mongone() -> grddead() when game is over;
       died: no message, quit: message) */
    if (C.IS_OBSTRUCTED(C.levl[C.u.ux][C.u.uy].typ) && (C.Upolyd ? C.u.mh : C.u.uhp) > 0
        && !silently)
        C.You("are encased in rock.");
    return C.TRUE;
}

/* as a temporary corridor is removed, set stone locations and adjacent
   spots to unlit; if player used scroll/wand/spell of light while inside
   the corridor, we don't want the light to reappear if/when a new tunnel
   goes through the same area */
export function blackout(x, y)
{
    let lev;
    let i, j;

    for (i = x - 1; i <= x + 1; ++i)
        for (j = y - 1; j <= y + 1; ++j) {
            if (!C.isok(i, j))
                continue;
            lev = C.levl[i][j];
            /* [possible bug: when (i != x || j != y), perhaps we ought
               to check whether the spot on the far side is lit instead
               of doing a blanket blackout of adjacent locations] */
            if (lev.typ == C.STONE)
                lev.lit = lev.waslit = 0;
            /* mark <i,j> as not having been seen from <x,y> */
            C.unset_seenv(lev, x, y, i, j);
        }
}

export function restfakecorr(grd)
{
    /* it seems you left the corridor - let the guard disappear */
    if (clear_fcorr(grd, C.FALSE)) {
        grd.isgd = 0; /* dmonsfree() should delete this mon */
        C.mongone(grd);
    }
}

/* move guard--dead to alive--to <0,0> until temporary corridor is removed */
export function parkguard(grd)
{
    /* either guard is dead or will now be treated as if so;
       monster traversal loops should skip it */
    if (C.samePtr(grd, C.svc.context.polearm.hitmon))
        C.svc.context.polearm.hitmon = 0;
    if (grd.mx) {
        C.remove_monster(grd.mx, grd.my);
        C.newsym(grd.mx, grd.my);
    }
    if (!C.samePtr(C.m_at(0, 0), grd))
        C.place_monster(grd, 0, 0);
    /* [grd->mx,my just got set to 0,0 by place_monster(), so this
       just sets EGD(grd)->ogx,ogy to 0,0 too; is that what we want?] */
    grd.mextra.egd.ogx = grd.mx;
    grd.mextra.egd.ogy = grd.my;
}

/* called in mon.c */
export function grddead(grd)
{
    let dispose = clear_fcorr(grd, C.TRUE);

    if (!dispose) {
        /* destroy guard's gold; drop any other inventory */
        C.relobj(grd, 0, C.FALSE);
        grd.mhp = 0;
        parkguard(grd);
        dispose = clear_fcorr(grd, C.TRUE);
    }
    if (dispose)
        grd.isgd = 0; /* for dmonsfree() */
    return dispose;
}

export function in_fcorridor(grd, x, y)
{
    let fci;
    let egrd = grd.mextra.egd;

    for (fci = egrd.fcbeg; fci < egrd.fcend; fci++)
        if (x == egrd.fakecorr[fci].fx && y == egrd.fakecorr[fci].fy)
            return C.TRUE;
    return C.FALSE;
}

export function findgd()
{
    let mtmp, mprev;

    /* this might find a guard parked at <0,0> since it'll be on fmon list */
    for (mtmp = C.fmon; mtmp; mtmp = mtmp.nmon) {
        if (mtmp.isgd && C.on_level(mtmp.mextra.egd.gdlevel, C.u.uz)) {
            if (!mtmp.mx && !mtmp.mextra.egd.gddone)
                mtmp.mhp = mtmp.mhpmax;
            return mtmp;
        }
    }
    /* if not on fmon, look for a guard waiting to migrate to this level */
    for (mprev = C.monsterPointer(C.migratingPointer()); (mtmp = mprev.value) != 0;
         mprev = C.monsterPointer(C.address(mtmp)+C.mon_nmon)) {
        if (mtmp.isgd && C.on_level(mtmp.mextra.egd.gdlevel, C.u.uz)) {
            /* take out of migrating_mons and place at <0,0>;
               simplified mon_arrive(); avoid that because it would
               send mtmp into limbo if no regular map spot is available */
            mprev.value = mtmp.nmon;
            mtmp.nmon = C.fmon;
            C.fmon = mtmp;
            C.mon_track_clear(mtmp);
            mtmp.mux = C.u.ux, mtmp.muy = C.u.uy;
            mtmp.mx = mtmp.my = 0; /* not on map (note: mx is already 0) */
            parkguard(mtmp);
            return mtmp;
        }
    }
    return  0;
}

export function vault_summon_gd()
{
    if (vault_occupied(C.u.urooms) && !findgd())
        C.u.uinvault = (C.VAULT_GUARD_TIME - 1);
}

export function vault_occupied(array)
{
    let ptr;

    for (ptr = array; C.loadChar(ptr); ptr = C.address(ptr) + 1)
        if (C.svr.rooms[C.loadChar(ptr) - C.ROOMOFFSET].rtype == C.VAULT)
            return C.loadChar(ptr);
    return 0;
}

/* hero has teleported out of vault while a guard is active */
export function uleftvault(grd)
{
    /* only called if caller has checked vault_occupied() and findgd() */
    if (!grd || !grd.isgd || C.DEADMONSTER(grd)) {
        C.impossible("escaping vault without guard?");
        return;
    }
    /* if carrying gold and arriving anywhere other than next to the guard,
       set the guard loose */
    if ((C.money_cnt(C.gi.invent) || hidden_gold(C.TRUE))
        && C.um_dist(grd.mx, grd.my, 1)) {
        if (grd.mpeaceful) {
            if (C.canspotmon(grd)) /* see or sense via telepathy */
                C.pline("%s becomes irate.", C.Monnam(grd));
            grd.mpeaceful = 0; /* bypass setmangry() */
        }
        /* if arriving outside guard's temporary corridor, give the
           guard an extra move to deliver message(s) and to teleport
           out of and remove that corridor */
        if (!in_fcorridor(grd, C.u.ux, C.u.uy))
            gd_move(grd);
    }
}

export function find_guard_dest(guard, rx, ry)
{
    let x, y, dd, lx, ly;

    incr_radius: for (dd = 2; (dd < C.ROWNO || dd < C.COLNO); dd++) {
        for (y = C.u.uy - dd; y <= C.u.uy + dd; y++) {
            if (y < 0 || y > C.ROWNO - 1)
                continue;
            for (x = C.u.ux - dd; x <= C.u.ux + dd; x++) {
                if (y != C.u.uy - dd && y != C.u.uy + dd && x != C.u.ux - dd)
                    x = C.u.ux + dd;
                if (x < 1 || x > C.COLNO - 1)
                    continue;
                if (guard && ((x == guard.mx && y == guard.my)
                              || (guard.isgd && in_fcorridor(guard, x, y))))
                    continue;
                if (C.levl[x][y].typ == C.CORR) {
                    lx = (x < C.u.ux) ? x + 1 : (x > C.u.ux) ? x - 1 : x;
                    ly = (y < C.u.uy) ? y + 1 : (y > C.u.uy) ? y - 1 : y;
                    if (C.levl[lx][ly].typ != C.STONE && C.levl[lx][ly].typ != C.CORR)
                        continue incr_radius;
                    rx.value = x;
                    ry.value = y;
                    return C.TRUE;
                }
            }
        }

    }
    C.impossible("Not a single corridor on this level?");
    C.tele();
    return C.FALSE;
}

export function invault()
{
    let guard;
    let otmp;
    let spotted;
    let trycount, vaultroom =  vault_occupied(C.u.urooms);
    let vgdeathcount;

    if (!vaultroom) {
        C.u.uinvault = 0;
        return;
    }
    /* after a couple of guards don't come back from their trips to
       the vault, future guards become more reluctant to turn up (even
       if summoned via whistle) */
    vgdeathcount = C.svm.mvitals[C.PM_GUARD].died;
    if (vgdeathcount < 2 ||
        (vgdeathcount < 50 && !C.rn2(Math.imul(vgdeathcount, vgdeathcount), 334, "invault")))
        ++C.u.uinvault;
    if (C.u.uinvault < C.VAULT_GUARD_TIME
        || (C.u.uinvault % (C.VAULT_GUARD_TIME / 2)) != 0)
        return;

    guard = findgd();
    if (!guard) {
        /* if time ok and no guard now. */
        let buf = C.stackAlloc(C.BUFSZ);
        let x, y, gdx, gdy, typ;
        let rx = C.coordLocalPointer(), ry = C.coordLocalPointer();
        let umoney;

        /* first find the goal for the guard */
        if (!find_guard_dest( 0, rx, ry))
            return;
        gdx = rx.value, gdy = ry.value;
        vaultroom -= C.ROOMOFFSET;

        /* next find a good place for a door in the wall */
        x = C.u.ux;
        y = C.u.uy;
        if (C.levl[x][y].typ != C.ROOM) { /* player dug a door and is in it */
            if (C.levl[x + 1][y].typ == C.ROOM) {
                x = x + 1;
            } else if (C.levl[x][y + 1].typ == C.ROOM) {
                y = y + 1;
            } else if (C.levl[x - 1][y].typ == C.ROOM) {
                x = x - 1;
            } else if (C.levl[x][y - 1].typ == C.ROOM) {
                y = y - 1;
            } else if (C.levl[x + 1][y + 1].typ == C.ROOM) {
                x = x + 1;
                y = y + 1;
            } else if (C.levl[x - 1][y - 1].typ == C.ROOM) {
                x = x - 1;
                y = y - 1;
            } else if (C.levl[x + 1][y - 1].typ == C.ROOM) {
                x = x + 1;
                y = y - 1;
            } else if (C.levl[x - 1][y + 1].typ == C.ROOM) {
                x = x - 1;
                y = y + 1;
            }
        }
        while (C.levl[x][y].typ == C.ROOM) {
            let dx, dy;

            dx = (gdx > x) ? 1 : (gdx < x) ? -1 : 0;
            dy = (gdy > y) ? 1 : (gdy < y) ? -1 : 0;
            if (C.abs(gdx - x) >= C.abs(gdy - y))
                x += dx;
            else
                y += dy;
        }
        if (C.u_at(x, y)) {
            if (C.levl[x + 1][y].typ == C.HWALL || C.levl[x + 1][y].typ == C.DOOR)
                x = x + 1;
            else if (C.levl[x - 1][y].typ == C.HWALL
                     || C.levl[x - 1][y].typ == C.DOOR)
                x = x - 1;
            else if (C.levl[x][y + 1].typ == C.VWALL
                     || C.levl[x][y + 1].typ == C.DOOR)
                y = y + 1;
            else if (C.levl[x][y - 1].typ == C.VWALL
                     || C.levl[x][y - 1].typ == C.DOOR)
                y = y - 1;
            else
                return;
        }

        /* make something interesting happen */
        if (!(guard = C.makemon(C.mons[C.PM_GUARD], x, y, C.MM_EGD | C.MM_NOMSG)))
            return;
        guard.isgd = 1;
        guard.mpeaceful = 1;
        C.set_malign(guard);
        guard.mextra.egd.gddone = 0;
        guard.mextra.egd.ogx = x;
        guard.mextra.egd.ogy = y;
        C.assign_level(guard.mextra.egd.gdlevel, C.u.uz);
        guard.mextra.egd.vroom = vaultroom;
        guard.mextra.egd.warncnt = 0;

        /* ensure the guard doesn't respawn again next turn if killed
           immediately */
        ++C.u.uinvault;

        C.reset_faint(); /* if fainted - wake up */
        /* if there are any boulders in the guard's way, destroy them;
           perhaps the guard knows a touch equivalent of force bolt;
           otherwise the hero wouldn't be able to push one to follow the
           guard out of the vault because that guard would be in its way */
        if ((otmp = C.sobj_at(C.BOULDER, guard.mx, guard.my)) != 0) {
            let func;
            let bname = C.simpleonames(otmp);
            let bcnt = 0;

            do {
                ++bcnt;
                C.fracture_rock(otmp);
                otmp = C.sobj_at(C.BOULDER, guard.mx, guard.my);
            } while (otmp);
            /* You_hear() will handle Deaf/!Deaf */
            func = !C.Blind ? C.You_see : C.You_hear;
            func("%s shatter.",
                    (bcnt == 1) ? C.an(bname) : C.makeplural(bname));
        }
        spotted = C.canspotmon(guard);
        if (spotted) {
            C.pline("Suddenly one of the Vault's %s enters!",
                  C.makeplural(C.pmname(guard.data, C.Mgender(guard))));
            C.newsym(guard.mx, guard.my);
        } else {
            C.pline("Someone else has entered the Vault.");
            /* make sure that hero who can't see the guard knows where the
               wall is breeched, otherwise we couldn't follow the guard out;
               the breech isn't necessarily adjacent to the hero */
            C.map_invisible(guard.mx, guard.my);
        }

        if (C.u.uswallow) {
            /* can't interrogate hero, don't interrogate engulfer */
            if (!C.Deaf) {
                C.SetVoice(guard, 0, 80, 0);
                C.verbalize("What's going on here?");
            }
            if (!spotted)
                C.pline_The("other presence vanishes.");
            C.mongone(guard);
            return;
        }
        if (C.U_AP_TYPE == C.M_AP_OBJECT || C.u.uundetected) {
            if (C.U_AP_TYPE == C.M_AP_OBJECT
                && C.gy.youmonst.mappearance != C.GOLD_PIECE)
                if (!C.Deaf) {
                    C.SetVoice(guard, 0, 80, 0);
                    C.verbalize("Hey!  Who left that %s in here?",
                              C.mimic_obj_name(C.gy.youmonst));
                }
            /* You're mimicking some object or you're hidden. */
            C.pline("Puzzled, %s turns around and leaves.", C.mhe(guard));
            C.mongone(guard);
            return;
        }
        if (C.Strangled || C.is_silent(C.gy.youmonst.data) || C.gm.multi < 0) {
            /* [we ought to record whether this message has already
               been given in order to vary it upon repeat visits, but
               discarding the monster and its egd data renders that hard] */
            if (C.Deaf) {
                C.pline("%s huffs and turns to leave.", C.noit_Monnam(guard));
            } else {
                C.SetVoice(guard, 0, 80, 0);
                C.verbalize("I'll be back when you're ready to speak to me!");
            }
            C.mongone(guard);
            return;
        }

        C.stop_occupation(); /* if occupied, stop it *now* */
        if (C.gm.multi > 0) {
            C.nomul(0);
            C.unmul( 0);
        }
        C.storeChar(buf, 0);
        trycount = 5;
        do {
            C.getlin(C.Deaf ? "You are required to supply your name. -"
                        : "\"Hello stranger, who are you?\" -", buf);
            C.mungspaces(buf);
        } while (!C.loadChar(buf) && --trycount > 0);

        if (C.u.ualign.type == C.A_LAWFUL
            /* ignore trailing text, in case player includes rank */
            && C.strncmpi(buf, C.svp.plname,  C.strlen(C.svp.plname)) != 0) {
            C.adjalign(-1); /* Liar! */
        }

        if (!C.strcmpi(buf, "Croesus") || !C.strcmpi(buf, "Kroisos")
            || !C.strcmpi(buf, "Creosote")) { /* Discworld */
            if (!C.svm.mvitals[C.PM_CROESUS].died) {
                if (C.Deaf) {
                    if (!C.Blind)
                        C.pline("%s waves goodbye.", C.noit_Monnam(guard));
                } else {
                    C.SetVoice(guard, 0, 80, 0);
                    C.verbalize(
                         "Oh, yes, of course.  Sorry to have disturbed you.");
                }
                C.mongone(guard);
            } else {
                C.setmangry(guard, C.FALSE);
                if (C.Deaf) {
                   if (!C.Blind)
                        C.pline("%s mouths something and looks very angry!",
                              C.noit_Monnam(guard));
                } else {
                   C.SetVoice(guard, 0, 80, 0);
                   C.verbalize(
                           "Back from the dead, are you?  I'll remedy that!");
                }
                /* don't want guard to waste next turn wielding a weapon */
                if (!C.MON_WEP(guard)) {
                    guard.weapon_check = C.NEED_HTH_WEAPON;
                    C.mon_wield_item(guard);
                }
            }
            return;
        }
        if (C.Deaf) {
            C.pline("%s doesn't %srecognize you.", C.noit_Monnam(guard),
                    (C.Blind) ? "" : "appear to ");
        } else {
            C.SetVoice(guard, 0, 80, 0);
            C.verbalize("I don't know you.");
        }
        umoney = C.money_cnt(C.gi.invent);
        if (!umoney && !hidden_gold(C.TRUE)) {
            if (C.Deaf) {
                C.pline("%s stomps%s.", C.noit_Monnam(guard),
                      (C.Blind) ? "" : " and beckons");
            } else {
                C.SetVoice(guard, 0, 80, 0);
                C.verbalize("Please follow me.");
            }
        } else {
            if (!umoney) {
                if (C.Deaf) {
                    if (!C.Blind)
                        C.pline("%s glares at you%s.", C.noit_Monnam(guard),
                              C.gi.invent ? "r stuff" : "");
                } else {
                   C.SetVoice(guard, 0, 80, 0);
                   C.verbalize("You have hidden gold.");
                }
            }
            if (C.Deaf) {
                if (!C.Blind)
                    C.pline(
                       "%s holds out %s palm and beckons with %s other hand.",
                          C.noit_Monnam(guard), C.noit_mhis(guard),
                          C.noit_mhis(guard));
            } else {
                C.SetVoice(guard, 0, 80, 0);
                C.verbalize(
                    "Most likely all your gold was stolen from this vault.");
                C.SetVoice(guard, 0, 80, 0);
                C.verbalize("Please drop that gold and follow me.");
            }
            guard.mextra.egd.dropgoldcnt++;
        }
        guard.mextra.egd.gdx = gdx;
        guard.mextra.egd.gdy = gdy;
        guard.mextra.egd.fcbeg = 0;
        guard.mextra.egd.fakecorr[0].fx = x;
        guard.mextra.egd.fakecorr[0].fy = y;
        typ = C.levl[x][y].typ;
        if (!C.IS_WALL(typ)) {
            /* guard arriving at non-wall implies a door; vault wall was
               dug into an empty doorway (which could subsequently have
               been plugged with an intact door by use of locking magic) */
            let vlt = guard.mextra.egd.vroom;
            let lowx = C.svr.rooms[vlt].lx, hix = C.svr.rooms[vlt].hx;
            let lowy = C.svr.rooms[vlt].ly, hiy = C.svr.rooms[vlt].hy;

            if (x == lowx - 1 && y == lowy - 1)
                typ = C.TLCORNER;
            else if (x == hix + 1 && y == lowy - 1)
                typ = C.TRCORNER;
            else if (x == lowx - 1 && y == hiy + 1)
                typ = C.BLCORNER;
            else if (x == hix + 1 && y == hiy + 1)
                typ = C.BRCORNER;
            else if (y == lowy - 1 || y == hiy + 1)
                typ = C.HWALL;
            else if (x == lowx - 1 || x == hix + 1)
                typ = C.VWALL;

            /* we lack access to the original wall_info bit mask for this
               former wall location so recreate it */
            C.levl[x][y].typ = typ; /* wall; will be changed to door below */
            C.levl[x][y].wall_info = 0; /* will be reset too via doormask */
            C.xy_set_wall_state(x, y); /* set WA_MASK bits in .wall_info */
        }
        guard.mextra.egd.fakecorr[0].ftyp = typ;
        guard.mextra.egd.fakecorr[0].flags = C.levl[x][y].flags;
        /* guard's entry point where confrontation with hero takes place */
        C.spot_stop_timers(x, y, C.MELT_ICE_AWAY);
        C.levl[x][y].typ = C.DOOR;
        C.levl[x][y].doormask = C.D_NODOOR;
        C.unblock_point(x, y); /* empty doorway doesn't block light */
        guard.mextra.egd.fcend = 1;
        guard.mextra.egd.warncnt = 1;
    }
}

export function move_gold(gold, vroom)
{
    let nx, ny;

    C.remove_object(gold);
    C.newsym(gold.ox, gold.oy);
    nx = C.svr.rooms[vroom].lx + C.rn2(2, 638, "move_gold");
    ny = C.svr.rooms[vroom].ly + C.rn2(2, 639, "move_gold");
    C.place_object(gold, nx, ny);
    C.stackobj(gold);
    C.newsym(nx, ny);
}

export function wallify_vault(grd)
{
    let typ;
    let x, y;
    let vlt = grd.mextra.egd.vroom;
    let tmp_viz;
    let lox = C.svr.rooms[vlt].lx - 1, hix = C.svr.rooms[vlt].hx + 1,
          loy = C.svr.rooms[vlt].ly - 1, hiy = C.svr.rooms[vlt].hy + 1;
    let mon;
    let gold, rocks;
    let trap;
    let fixed = C.FALSE;
    let movedgold = C.FALSE;

    for (x = lox; x <= hix; x++)
        for (y = loy; y <= hiy; y++) {
            /* if not on the room boundary, skip ahead */
            if (x != lox && x != hix && y != loy && y != hiy)
                continue;

            if ((!C.IS_WALL(C.levl[x][y].typ) || C.g_at(x, y)
                 || C.sobj_at(C.ROCK, x, y) || C.sobj_at(C.BOULDER, x, y))
                && !in_fcorridor(grd, x, y)) {
                if ((mon = C.m_at(x, y)) != 0 && !C.samePtr(mon, grd)) {
                    if (mon.mtame)
                        C.yelp(mon);
                    if (!C.rloc(mon, C.RLOC_MSG))
                        C.m_into_limbo(mon);
                }
                /* move gold at wall locations into the vault */
                if ((gold = C.g_at(x, y)) != 0) {
                    move_gold(gold, grd.mextra.egd.vroom);
                    movedgold = C.TRUE;
                }
                /* destroy rocks and boulders (subsume them into the walls);
                   other objects present stay intact and become embedded */
                while ((rocks = C.sobj_at(C.ROCK, x, y)) != 0) {
                    C.obj_extract_self(rocks);
                    C.obfree(rocks,  0);
                }
                while ((rocks = C.sobj_at(C.BOULDER, x, y)) != 0) {
                    C.obj_extract_self(rocks);
                    C.obfree(rocks,  0);
                }
                if ((trap = C.t_at(x, y)) != 0)
                    C.deltrap(trap);

                if (x == lox)
                    typ = (y == loy) ? C.TLCORNER
                          : (y == hiy) ? C.BLCORNER
                            : C.VWALL;
                else if (x == hix)
                    typ = (y == loy) ? C.TRCORNER
                          : (y == hiy) ? C.BRCORNER
                            : C.VWALL;
                else /* not left or right side, must be top or bottom */
                    typ = C.HWALL;

                C.levl[x][y].typ = typ;
                C.levl[x][y].wall_info = 0;
                C.xy_set_wall_state(x, y); /* set WA_MASK bits in .wall_info */
                C.del_engr_at(x, y);
                /*
                 * hack: player knows walls are restored because of the
                 * message, below, so show this on the screen.
                 */
                tmp_viz = C.gv.viz_array[y][x];
                C.gv.viz_array[y][x] = C.IN_SIGHT | C.COULD_SEE;
                C.newsym(x, y);
                C.gv.viz_array[y][x] = tmp_viz;
                C.block_point(x, y);
                fixed = C.TRUE;
            }
        }

    if (movedgold || fixed) {
        if (in_fcorridor(grd, grd.mx, grd.my) || C.cansee(grd.mx, grd.my))
            C.pline("%s whispers an incantation.", C.noit_Monnam(grd));
        else
            C.You_hear("a distant chant.");
        if (movedgold)
            C.pline("A mysterious force moves the gold into the vault.");
        if (fixed)
            C.pline_The("damaged vault's walls are magically restored!");
    }
}

export function gd_mv_monaway(grd, nx, ny)
{
    let mtmp = C.m_at(nx, ny);

    if (mtmp && !C.samePtr(mtmp, grd)) {
        if (!C.Deaf) {
            C.SetVoice(grd, 0, 80, 0);
            C.verbalize("Out of my way, scum!");
        }
        if (!C.rloc(mtmp, C.RLOC_ERR | C.RLOC_MSG) || C.MON_AT(nx, ny))
            C.m_into_limbo(mtmp);
        C.recalc_block_point(nx, ny);
    }
}

/* have guard pick gold off the floor, possibly moving to the gold's
   position before message and back to his current spot after */
export function gd_pick_corridor_gold(grd, goldx, goldy)
{
    let gold;
    let newcc = C.coordLocal(), bestcc = C.coordLocal();
    let gdelta, newdelta, bestdelta, tryct,
        guardx = grd.mx, guardy = grd.my;
    let under_u = C.u_at(goldx, goldy),
            see_it = C.cansee(goldx, goldy);

    if (under_u) {
        /* Grab the gold from between the hero's feet.
           If guard is two or more steps away; bring him closer first. */
        gold = C.g_at(goldx, goldy);
        if (!gold) {
            C.impossible("vault guard: no gold at hero's feet?");
            return;
        }
        gdelta = C.distu(guardx, guardy);
        if (gdelta > 2 && see_it) { /* skip if player won't see it */
            bestdelta = gdelta;
            bestcc.x = C.coordxy(guardx), bestcc.y = C.coordxy(guardy);
            tryct = 9;
            do {
                /* pick an available spot nearest the hero and also try
                   to find the one meeting that criterium which is nearest
                   the guard's current location */
                if (C.enexto(newcc, goldx, goldy, grd.data)) {
                    if ((newdelta = C.distu(newcc.x, newcc.y)) < bestdelta
                        || (newdelta == bestdelta
                            && C.dist2(newcc.x, newcc.y, guardx, guardy)
                               < C.dist2(bestcc.x, bestcc.y, guardx, guardy))) {
                        bestdelta = newdelta;
                        C.copyCoord(bestcc, newcc);
                    }
                }
            } while (--tryct >= 0);

            if (bestdelta < gdelta) {
                C.remove_monster(guardx, guardy);
                C.newsym(guardx, guardy);
                C.place_monster(grd,  bestcc.x,  bestcc.y);
                C.newsym(grd.mx, grd.my);
            }
        }
        C.obj_extract_self(gold);
        C.add_to_minv(grd, gold);
        C.newsym(goldx, goldy);

    /* guard is already at gold's location */
    } else if (goldx == guardx && goldy == guardy) {
        C.mpickgold(grd); /* does a newsym */

    /* gold is at some third spot, neither guard's nor hero's */
    } else {
        /* just for insurance... */
        gd_mv_monaway(grd, goldx, goldy); /* make room for guard */
        if (see_it) { /* skip if player won't see the message */
            C.remove_monster(grd.mx, grd.my);
            C.newsym(grd.mx, grd.my);
            C.place_monster(grd, goldx, goldy); /* sets <grd->mx, grd->my> */
        }
        C.mpickgold(grd); /* does a newsym */
    }

    if (see_it) { /* cansee(goldx, goldy) */
        C.pline("%s%s picks up the gold%s.", C.Some_Monnam(grd),
              (grd.mpeaceful && grd.mextra.egd.warncnt > 5)
                 ? " calms down and" : "",
              under_u ? " from beneath you" : "");
    }

    /* if guard was moved to get the gold, move him back */
    if (grd.mx != guardx || grd.my != guardy) {
        C.remove_monster(grd.mx, grd.my);
        C.newsym(grd.mx, grd.my);
        C.place_monster(grd, guardx, guardy);
        C.newsym(guardx, guardy);
    }
    return;
}


/* return 1: guard moved, -2: died  */
export function gd_move_cleanup(grd, semi_dead, disappear_msg_seen)
{
    let x, y;
    let see_guard;

    /*
     * The following is a kludge.  We need to keep the guard around in
     * order to be able to make the fake corridor disappear as the
     * player moves out of it, but we also need the guard out of the
     * way.  We send the guard to never-never land.  We set ogx ogy to
     * mx my in order to avoid a check at the top of this function.
     * At the end of the process, the guard is killed in restfakecorr().
     */
    x = grd.mx, y = grd.my;
    see_guard = C.canspotmon(grd);
    parkguard(grd); /* move to <0,0> */
    wallify_vault(grd);
    restfakecorr(grd);
    C.debugpline2("gd_move_cleanup: %scleanup%s",
                grd.isgd ? "" : "final ",
                grd.isgd ? " attempt" : "");
    if (!semi_dead && (in_fcorridor(grd, C.u.ux, C.u.uy) || C.cansee(x, y))) {
        if (!disappear_msg_seen && see_guard)
            C.pline("Suddenly, %s disappears.", C.noit_mon_nam(grd));
        return 1;
    }
    return -2;
}

export function gd_letknow(grd)
{
    if (!C.cansee(grd.mx, grd.my) || !C.mon_visible(grd))
        C.You_hear("%s.",
                    C.m_carrying(grd, C.TIN_WHISTLE)
                        ? "the shrill sound of a guard's whistle"
                        : "angry shouting");
    else
        C.You(C.um_dist(grd.mx, grd.my, 2)
                ? "see %s approaching."
                : "are confronted by %s.",
            /* "an angry guard" */
            C.x_monnam(grd, C.ARTICLE_A, "angry", 0, C.FALSE));
}

/*
 * return  1: guard moved,  0: guard didn't,  -1: let m_move do it,  -2: died
 */
export function gd_move(grd)
{
    let x, y, nx, ny, m, n, ex, ey;
    let dx, dy, ggx = 0, ggy = 0, fci;
    let typ;
    let crm;
    let fcp;
    let egrd = grd.mextra.egd;
    let umoney = 0n;
    let goldincorridor = C.FALSE, u_in_vault = C.FALSE, grd_in_vault = C.FALSE,
            semi_dead = C.DEADMONSTER(grd),
            u_carry_gold = C.FALSE, newspot = C.FALSE;

    if (!C.on_level(egrd.gdlevel, C.u.uz))
        return -1;

    if (semi_dead || !grd.mx || egrd.gddone) {
        egrd.gddone = 1;
        return gd_move_cleanup(grd, semi_dead, C.FALSE);
    }
    C.debugpline1("gd_move: %s guard", grd.mpeaceful ? "peaceful" : "hostile");

    u_in_vault = vault_occupied(C.u.urooms) ? C.TRUE : C.FALSE;
    grd_in_vault = C.loadChar(C.in_rooms(grd.mx, grd.my, C.VAULT)) ? C.TRUE : C.FALSE;
    if (!u_in_vault && !grd_in_vault)
        wallify_vault(grd);

    if (!grd.mpeaceful) {
        if (!u_in_vault
            && (grd_in_vault || (in_fcorridor(grd, grd.mx, grd.my)
                                 && !in_fcorridor(grd, C.u.ux, C.u.uy)))) {
            C.rloc(grd, C.RLOC_MSG);
            wallify_vault(grd);
            if (!in_fcorridor(grd, grd.mx, grd.my))
                clear_fcorr(grd, C.TRUE);
            gd_letknow(grd);
            return -1;
        }
        if (!in_fcorridor(grd, grd.mx, grd.my))
            clear_fcorr(grd, C.TRUE);
        return -1;
    }
    if (C.abs(egrd.ogx - grd.mx) > 1 || C.abs(egrd.ogy - grd.my) > 1)
        return -1; /* teleported guard - treat as monster */

    if (egrd.witness) {
        if (!C.Deaf) {
            C.SetVoice(grd, 0, 80, 0);
            C.verbalize("How dare you %s that gold, scoundrel!",
                      (egrd.witness & C.GD_EATGOLD) ? "consume" : "destroy");
        }
        egrd.witness = 0;
        grd.mpeaceful = 0;
        return -1;
    }

    umoney = C.money_cnt(C.gi.invent);
    u_carry_gold = (umoney > 0n || hidden_gold(C.TRUE) > 0n);
    if (egrd.fcend == 1) {
        if (u_in_vault && (u_carry_gold || C.um_dist(grd.mx, grd.my, 1))) {
            if (egrd.warncnt == 3 && !C.Deaf) {
                let buf = C.stackAlloc(C.BUFSZ);

                C.Sprintf(buf, "%sfollow me!",
                        u_carry_gold ? (!umoney ? "drop that hidden gold and "
                                                : "drop that gold and ")
                                     : "");
                C.SetVoice(grd, 0, 80, 0);
                if (egrd.dropgoldcnt || !u_carry_gold)
                    C.verbalize("I repeat, %s", buf);
                else
                    C.verbalize("%s", C.upstart(buf));
                if (u_carry_gold)
                    egrd.dropgoldcnt++;
            }
            if (egrd.warncnt == 7) {
                m = grd.mx;
                n = grd.my;
                if (!C.Deaf) {
                    C.SetVoice(grd, 0, 80, 0);
                    C.verbalize("You've been warned, knave!");
                }
                grd.mpeaceful = 0;
                C.mnexto(grd, C.RLOC_NOMSG);
                C.levl[m][n].typ = egrd.fakecorr[0].ftyp;
                C.levl[m][n].flags = egrd.fakecorr[0].flags;
                C.recalc_block_point(m, n);
                C.del_engr_at(m, n);
                C.newsym(m, n);
                return -1;
            }
            /* not fair to get mad when (s)he's fainted or paralyzed */
            if (!C.is_fainted() && C.gm.multi >= 0)
                egrd.warncnt++;
            return 0;
        }

        if (!u_in_vault) {
            if (u_carry_gold) { /* player teleported */
                m = grd.mx;
                n = grd.my;
                C.rloc(grd, C.RLOC_MSG);
                C.levl[m][n].typ = egrd.fakecorr[0].ftyp;
                C.levl[m][n].flags = egrd.fakecorr[0].flags;
                C.recalc_block_point(m, n); /* guard corridor goes away */
                C.del_engr_at(m, n);
                C.newsym(m, n);
                grd.mpeaceful = 0;
                gd_letknow(grd);
                return -1;
            } else {
                if (!C.Deaf) {
                    C.SetVoice(grd, 0, 80, 0);
                    C.verbalize("Well, begone.");
                }
                egrd.gddone = 1;
                return gd_move_cleanup(grd, semi_dead, C.FALSE);
            }
        }
    }

    if (egrd.fcend > 1) {
        if (egrd.fcend > 2 && in_fcorridor(grd, grd.mx, grd.my)
            && !egrd.gddone && !in_fcorridor(grd, C.u.ux, C.u.uy)
            && (C.levl[egrd.fakecorr[0].fx][egrd.fakecorr[0].fy].typ
                == egrd.fakecorr[0].ftyp)) {
            C.pline("%s, confused, disappears.", C.noit_Monnam(grd));
            return gd_move_cleanup(grd, semi_dead, C.TRUE);
        }
        if (u_carry_gold && (in_fcorridor(grd, C.u.ux, C.u.uy)
                             /* cover a 'blind' spot */
                             || (egrd.fcend > 1 && u_in_vault))) {
            if (!grd.mx) {
                restfakecorr(grd);
                return -2;
            }
            if (egrd.warncnt < 6) {
                egrd.warncnt = 6;
                if (C.Deaf) {
                    if (!C.Blind)
                        C.pline("%s holds out %s palm demandingly!",
                              C.noit_Monnam(grd), C.noit_mhis(grd));
                } else {
                    C.SetVoice(grd, 0, 80, 0);
                    C.verbalize("Drop all your gold, scoundrel!");
                }
                return 0;
            } else {
                if (C.Deaf) {
                    if (!C.Blind)
                        C.pline("%s rubs %s hands with enraged delight!",
                              C.noit_Monnam(grd), C.noit_mhis(grd));
                } else {
                    C.SetVoice(grd, 0, 80, 0);
                    C.verbalize("So be it, rogue!");
                }
                grd.mpeaceful = 0;
                return -1;
            }
        }
    }
    m = n = 0;
    for (fci = egrd.fcbeg; fci < egrd.fcend; fci++)
        if (C.g_at(egrd.fakecorr[fci].fx, egrd.fakecorr[fci].fy)) {
            m = egrd.fakecorr[fci].fx;
            n = egrd.fakecorr[fci].fy;
            goldincorridor = C.TRUE;
            break;
        }
    /* new gold can appear if it was embedded in stone and hero kicks it
       (on even via wish and drop) so don't assume hero has been warned */
    if (goldincorridor && !egrd.gddone) {
        gd_pick_corridor_gold(grd, m, n);
        if (!grd.mpeaceful)
            return -1;
        egrd.warncnt = 5;
        return 0;
    }
    if (C.um_dist(grd.mx, grd.my, 1) || egrd.gddone) {
        if (!egrd.gddone && !C.rn2(10, 1067, "gd_move") && !C.Deaf && !C.u.uswallow
            && !(C.u.ustuck && !C.sticks(C.gy.youmonst.data))) {
            C.SetVoice(grd, 0, 80, 0);
            C.verbalize("Move along!");
        }
        restfakecorr(grd);
        return 0; /* didn't move */
    }
    x = grd.mx;
    y = grd.my;

    let skip_search = u_in_vault;
    newpos: {
    nextpos: for (;;) {
    proceed: {
    if (!skip_search) {
    skip_search = true;

    /* look around (hor & vert only) for accessible places */
    for (nx = x - 1; nx <= x + 1; nx++)
        nextnxy: for (ny = y - 1; ny <= y + 1; ny++) {
            if ((nx == x || ny == y) && (nx != x || ny != y)
                && C.isok(nx, ny)) {
                crm = C.levl[nx][ny];
                typ = C.uchar(crm.typ);
                if (!C.IS_STWALL(typ) && !C.IS_POOL(typ)) {
                    if (in_fcorridor(grd, nx, ny))
                        continue nextnxy;

                    if (C.loadChar(C.in_rooms(nx, ny, C.VAULT)))
                        continue;

                    /* seems we found a good place to leave him alone */
                    egrd.gddone = 1;
                    if (C.ACCESSIBLE(typ))
                        break newpos;
                    crm.typ = (typ == C.SCORR) ? C.CORR : C.DOOR;
                    if (crm.typ == C.DOOR)
                        crm.doormask = C.D_NODOOR;
                    else
                        crm.flags = 0;
                    C.del_engr_at(nx, ny);
                    break proceed;
                }
            }

        }
    }
    nx = x;
    ny = y;
    ggx = egrd.gdx;
    ggy = egrd.gdy;
    dx = (ggx > x) ? 1 : (ggx < x) ? -1 : 0;
    dy = (ggy > y) ? 1 : (ggy < y) ? -1 : 0;
    if (C.abs(ggx - x) >= C.abs(ggy - y))
        nx += dx;
    else
        ny += dy;

    while ((typ = C.uchar((crm = C.levl[nx][ny]).typ)) != C.STONE) {
        ex = nx + nx - x;
        ey = ny + ny - y;
        /* in view of the above we must have IS_WALL(typ) or typ == POOL */
        /* must be a wall here */
        if (C.isok(ex, ey) && C.IS_ROOM(C.levl[ex][ey].typ)) {
            crm.typ = C.DOOR;
            crm.doormask = C.D_NODOOR;
            C.del_engr_at(ex, ey);
            break proceed;
        }
        if (dy && nx != x) {
            nx = x;
            ny = y + dy;
            continue;
        }
        if (dx && ny != y) {
            ny = y;
            nx = x + dx;
            dy = 0;
            continue;
        }
        /* I don't like this, but ... */
        if (C.IS_ROOM(typ)) {
            crm.typ = C.DOOR;
            crm.doormask = C.D_NODOOR;
            C.del_engr_at(ex, ey);
            break proceed;
        }
        break;
    }
    crm.typ = C.CORR;
    crm.flags = 0;
    }
    newspot = C.TRUE;
    C.unblock_point(nx, ny); /* doesn't block light */
    if (C.cansee(nx, ny))
        C.newsym(nx, ny);

    if ((nx != ggx || ny != ggy) || (grd.mx != ggx || grd.my != ggy)) {
        fcp = egrd.fakecorr[egrd.fcend];
        /* fakecorr overflow does not occur because egrd->fakecorr[]
           is too small, but it has occurred when the same <x,y> are
           put into it repeatedly for some as yet unexplained reason */
        if (egrd.fcend++ == C.FCSIZ)
            C.panic("fakecorr overflow");
        fcp.fx = nx;
        fcp.fy = ny;
        fcp.ftyp = typ;
        fcp.flags = crm.flags;
    } else if (!egrd.gddone) {
        /* We're stuck, so try to find a new destination. */
        if (!find_guard_dest(grd, C.egdCoordPointer(egrd, 'gdx'), C.egdCoordPointer(egrd, 'gdy'))
            || (egrd.gdx == ggx && egrd.gdy == ggy)) {
            C.pline("%s, confused, disappears.", C.Monnam(grd));
            return gd_move_cleanup(grd, semi_dead, C.TRUE);
        } else
            continue nextpos;
    }
    break nextpos;
    }
    }
    gd_mv_monaway(grd, nx, ny);
    if (egrd.gddone)
        return gd_move_cleanup(grd, semi_dead, C.FALSE);
    egrd.ogx = grd.mx; /* update old positions */
    egrd.ogy = grd.my;
    C.remove_monster(grd.mx, grd.my);
    C.place_monster(grd, nx, ny);
    if (newspot && C.g_at(nx, ny)) {
        /* if there's gold already here (most likely from mineralize()),
           pick it up now so that guard doesn't later think hero dropped
           it and give an inappropriate message */
        C.mpickgold(grd);
        if (C.canspotmon(grd))
            C.pline("%s picks up some gold.", C.Monnam(grd));
    } else
        C.newsym(grd.mx, grd.my);
    restfakecorr(grd);
    return 1;
}

/* Routine when dying or quitting with a vault guard around */
export function paygd(silently)
{
    let grd = findgd();
    let umoney = C.money_cnt(C.gi.invent);
    let coins, nextcoins;
    let gdx, gdy;
    let buf = C.stackAlloc(C.BUFSZ);

    if (!umoney || !grd)
        return;

    remove_guard: {
    if (C.u.uinvault) {
        if (!silently)
            C.Your("%ld %s goes into the Magic Memory Vault.",
                 umoney, C.currency(umoney));
        gdx = C.u.ux;
        gdy = C.u.uy;
    } else {
        if (grd.mpeaceful) /* peaceful guard has no "right" to your gold */
            break remove_guard;

        C.mnexto(grd, C.RLOC_NOMSG);
        if (!silently)
            C.pline("%s remits your gold to the vault.", C.Monnam(grd));
        gdx = C.svr.rooms[grd.mextra.egd.vroom].lx + C.rn2(2, 1229, "paygd");
        gdy = C.svr.rooms[grd.mextra.egd.vroom].ly + C.rn2(2, 1230, "paygd");
        C.Sprintf(buf, "To Croesus: here's the gold recovered from %s the %s.",
                C.svp.plname,
                C.pmname(C.mons[C.u.umonster], C.flags.female ? C.FEMALE : C.MALE));
        C.make_grave(gdx, gdy, buf);
    }
    for (coins = C.gi.invent; coins; coins = nextcoins) {
        nextcoins = coins.nobj;
        if (C.objects[coins.otyp].oc_class == C.COIN_CLASS) {
            C.freeinv(coins);
            C.place_object(coins, gdx, gdy);
            C.stackobj(coins);
        }
    }
    }
    C.mongone(grd);
    return;
}

/*
 * amount of gold in carried containers
 *
 * even_if_unknown:
 *   True:  all gold
 *   False: limit to known contents
 */
export function hidden_gold(even_if_unknown)
{
    let value = 0n;
    let obj;

    for (obj = C.gi.invent; obj; obj = obj.nobj)
        if (C.Has_contents(obj) && (obj.cknown || even_if_unknown))
            value = C.long(value + C.contained_gold(obj, even_if_unknown));
    /* unknown gold stuck inside statues may cause some consternation... */

    return value;
}

/* prevent "You hear footsteps.." when inappropriate */
export function gd_sound()
{
    return !(vault_occupied(C.u.urooms) || findgd());
}

export function vault_gd_watching(activity)
{
    let guard = findgd();

    if (guard && guard.mx && guard.mcansee && C.m_canseeu(guard)) {
        if (activity == C.GD_EATGOLD || activity == C.GD_DESTROYGOLD)
            guard.mextra.egd.witness = activity;
    }
}

/*vault.c*/
