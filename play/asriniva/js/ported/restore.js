import {C} from '../c-runtime/context.js';

/* NetHack 5.0	restore.c	$NHDT-Date: 1736530208 2025/01/10 09:30:08 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.234 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Michael Allison, 2009. */
/* NetHack may be freely redistributed.  See license for details. */

/* for TERMLIB and ASCIIGRAPH */

/* shared with save */
/* shared with save */



















/* these ones are declared non-static in extern.h if SFCTOOL is defined */





/*
 * Save a mapping of IDs from ghost levels to the current level.  This
 * map is used by the timer routines when restoring ghost levels.
 */
/* ghost ID */
/* new ID */




/* SFCTOOL */

/* use colors from save file */



/* Recalculate svl.level.objects[x][y], since this info was not saved. */


export function find_lev_obj()
{
    let fobjtmp = 0;
    let otmp;
    let x, y;

    for (x = 0; x < C.COLNO; x++)
        for (y = 0; y < C.ROWNO; y++)
            C.svl.level.objects[x][y] = 0;

    /*
     * Reverse the entire fobj chain, which is necessary so that we can
     * place the objects in the proper order.  Make all obj in chain
     * OBJ_FREE so place_object will work correctly.
     */
    while ((otmp = C.fobj) != 0) {
        C.fobj = otmp.nobj;
        otmp.nobj = fobjtmp;
        otmp.where = C.OBJ_FREE;
        fobjtmp = otmp;
    }
    /* fobj should now be empty */

    /* Set svl.level.objects (as well as reversing the chain back again) */
    while ((otmp = fobjtmp) != 0) {
        fobjtmp = otmp.nobj;
        C.place_object(otmp, otmp.ox, otmp.oy);

        /* fixup(s) performed when restoring the level that the hero
           is on, rather than just an arbitrary one */
        if (C.u.uz.dlevel) { /* 0 during full restore until current level */
            /* handle uchain and uball when they're on the floor */
            if (otmp.owornmask & (C.W_BALL | C.W_CHAIN))
                C.setworn(otmp, otmp.owornmask);
        }
    }
}

/* Things that were marked "in_use" when the game was saved (ex. via the
 * infamous "HUP" cheat) get used up here.
 */

export function inven_inuse(quietly)
{
    let otmp,otmp2;

    for (otmp = C.gi.invent; otmp; otmp = otmp2) {
        otmp2 = otmp.nobj;
        if (otmp.in_use) {
            if (!quietly)
                C.pline("Finishing off %s...", C.xname(otmp));
            C.useup(otmp);
        }
    }
}

/* SFCTOOL */


export function restlevchn(nhfp)
{
    let cnt = 0;
    let tmplev,x;

    C.svs.sp_levchn = 0;
    C.Sfi_int(nhfp, C.reference("int", () => cnt, value => cnt = value), "levchn-lev_count");
    for (; cnt > 0; cnt--) {
        tmplev = C.view("s_level", C.alloc(C.sizes.s_level));
        C.Sfi_s_level(nhfp, tmplev, "levchn-s_level");

        if (!C.svs.sp_levchn)
            C.svs.sp_levchn = tmplev;
        else {
            for (x = C.svs.sp_levchn; x.next; x = x.next)
                ;
            x.next = tmplev;
        }
        tmplev.next = 0;
    }
}


export function restdamage(nhfp)
{
    let dmgcount = 0;
    let counter;
    let tmp_dam;
    let ghostly = (nhfp.ftype == C.NHF_BONESFILE);

    C.Sfi_unsigned(nhfp, C.reference("unsigned", () => dmgcount, value => dmgcount = value), "damage-damage_count");
    counter = C.int(dmgcount);

    if (!counter)
        return;
    do {
        tmp_dam = C.view("damage", C.alloc(C.sizes.damage));

        C.Sfi_damage(nhfp, tmp_dam, "damage");
        if (ghostly)
            tmp_dam.when += (C.svm.moves - C.svo.omoves);

        tmp_dam.next = C.svl.level.damagelist;
        C.svl.level.damagelist = tmp_dam;
/* !SFCTOOL */
    } while (--counter > 0);
}

/* restore one object */

export function restobj(nhfp, otmp)
{
    let buflen = 0;
    let omid = 0;

    C.Sfi_obj(nhfp, otmp, "obj");
    otmp.lua_ref_cnt = 0;
    /* next object pointers are invalid; otmp->cobj needs to be left
       as is--being non-null is key to restoring container contents */
    otmp.nobj = otmp.nexthere = 0;
    /* non-null oextra needs to be reconstructed */
    if (otmp.oextra) {
        otmp.oextra = C.newoextra();

        /* oname - object's name */
        C.Sfi_int(nhfp, C.reference("int", () => buflen, value => buflen = value), "obj-oname_length");
        if (buflen > 0) { /* includes terminating '\0' */
            C.new_oname(otmp, buflen);
            C.Sfi_char(nhfp, C.ONAME(otmp), "obj-oname", buflen);
        }

        /* omonst - corpse or statue might retain full monster details */
        C.Sfi_int(nhfp, C.reference("int", () => buflen, value => buflen = value), "obj-omonst_length");
        if (buflen > 0) {
            C.newomonst(otmp);
            /* this is actually a monst struct, so we
               can just defer to restmon() here */
            restmon(nhfp, C.OMONST(otmp));
        }

        /* omailcmd - feedback mechanism for scroll of mail */
        C.Sfi_int(nhfp, C.reference("int", () => buflen, value => buflen = value), "obj-omailcmd_length");
        if (buflen > 0) {
            let omailcmd = C.alloc(buflen);

            C.Sfi_char(nhfp, omailcmd, "obj-omailcmd", buflen);
            C.new_omailcmd(otmp, omailcmd);
            C.free(omailcmd);
        }

        /* omid - monster id number, connecting corpse to ghost */
        C.newomid(otmp); /* superfluous; we're already allocated otmp->oextra */
        C.Sfi_unsigned(nhfp, C.reference("unsigned", () => omid, value => omid = value), "obj-omid");
        otmp.oextra.omid = omid;
    }
}


export function restobjchn(nhfp, frozen)
{
    let otmp,otmp2 = 0;
    let first = 0;
    let buflen = 0;
    let ghostly = (nhfp.ftype == C.NHF_BONESFILE);

    while (1) {
        C.Sfi_int(nhfp, C.reference("int", () => buflen, value => buflen = value), "obj-obj_length");
        if (buflen == -1)
            break;

        otmp = C.newobj();
        C.assert(otmp != 0, 0);
        restobj(nhfp, otmp);
        if (!first)
            first = otmp;
        else
            otmp2.nobj = otmp;

        if (ghostly) {
            let nid = C.next_ident();

            add_id_mapping(otmp.o_id, nid);
            otmp.o_id = nid;
        }
        if (ghostly && otmp.otyp == C.SLIME_MOLD)
            ghostfruit(otmp);
        /* Ghost levels get object age shifted from old player's clock
         * to new player's clock.  Assumption: new player arrived
         * immediately after old player died.
         */
        if (ghostly && !frozen && !C.age_is_relative(otmp))
            otmp.age = C.svm.moves - C.svo.omoves + otmp.age;
/* !SFCTOOL */

        /* get contents of a container or statue */
        if (C.Has_contents(otmp)) {
            let otmp3;

            otmp.cobj = restobjchn(nhfp, C.Is_IceBox(otmp));
            /* restore container back pointers */
            for (otmp3 = otmp.cobj; otmp3; otmp3 = otmp3.nobj)
                otmp3.ocontainer = otmp;
        }

        if (otmp.bypass)
            otmp.bypass = 0;
        if (!ghostly) {
            /* fix the pointers */
            if (otmp.o_id == C.svc.context.victual.o_id)
                C.svc.context.victual.piece = otmp;
            if (otmp.o_id == C.svc.context.tin.o_id)
                C.svc.context.tin.tin = otmp;
            if (otmp.o_id == C.svc.context.spbook.o_id)
                C.svc.context.spbook.book = otmp;
        }
/* !SFADUSTER */
        otmp2 = otmp;
    }
    if (first && otmp2.nobj) {
        C.impossible("Restobjchn: error reading objchn.");
        otmp2.nobj = 0;
    }
    return first;
}

/* restore one monster */

export function restmon(nhfp, mtmp)
{
    let buflen = 0, mc = 0;

    C.Sfi_monst(nhfp, mtmp, "monst");

    /* next monster pointer is invalid */
    mtmp.nmon = 0;
    /* non-null mextra needs to be reconstructed */
    if (mtmp.mextra) {
        mtmp.mextra = C.newmextra();

        /* mgivenname - monster's name */
        C.Sfi_int(nhfp, C.reference("int", () => buflen, value => buflen = value), "monst-mgivenname_length");
        if (buflen > 0) { /* includes terminating '\0' */
            C.new_mgivenname(mtmp, buflen);
            C.Sfi_char(nhfp, C.MGIVENNAME(mtmp), "monst-mgivenname", buflen);
        }
        /* egd - vault guard */
        C.Sfi_int(nhfp, C.reference("int", () => buflen, value => buflen = value), "monst-egd_length");
        if (buflen > 0) {
            C.newegd(mtmp);
            C.Sfi_egd(nhfp, C.EGD(mtmp), "monst-egd");
        }
        /* epri - temple priest */
        C.Sfi_int(nhfp, C.reference("int", () => buflen, value => buflen = value), "monst-epri_length");
        if (buflen > 0) {
            C.newepri(mtmp);
            C.Sfi_epri(nhfp, C.EPRI(mtmp), "monst-epri");
        }
        /* eshk - shopkeeper */
        C.Sfi_int(nhfp, C.reference("int", () => buflen, value => buflen = value), "monst-eshk_length");
        if (buflen > 0) {
            C.neweshk(mtmp);
            C.Sfi_eshk(nhfp, C.ESHK(mtmp), "monst-eshk");
        }
        /* emin - minion */
        C.Sfi_int(nhfp, C.reference("int", () => buflen, value => buflen = value), "monst-emin_length");
        if (buflen > 0) {
            C.newemin(mtmp);
            C.Sfi_emin(nhfp, C.EMIN(mtmp), "monst-emin");
        }
        /* edog - pet */
        C.Sfi_int(nhfp, C.reference("int", () => buflen, value => buflen = value), "monst-edog_length");
        if (buflen > 0) {
            C.newedog(mtmp);
            C.Sfi_edog(nhfp, C.EDOG(mtmp), "monst-edog");
            /* save or bones held a relative time */
            relative_time_to_moves(C.longPointer(C.addressOf(C.EDOG(mtmp), "droptime")));
            relative_time_to_moves(C.longPointer(C.addressOf(C.EDOG(mtmp), "hungrytime")));
            /* sanity check to prevent rn2(0) */
           if (C.EDOG(mtmp).apport <= 0) {
               C.EDOG(mtmp).apport = 1;
           }
        }
        /* ebones */
        C.Sfi_int(nhfp, C.reference("int", () => buflen, value => buflen = value), "monst-ebones_length");
        if (buflen > 0) {
            C.newebones(mtmp);
            C.Sfi_ebones(nhfp, C.EBONES(mtmp), "monst-ebones");
        }
        /* mcorpsenm - obj->corpsenm for mimic posing as corpse or
           statue (inline int rather than pointer to something) */
        C.Sfi_int(nhfp, C.reference("int", () => mc, value => mc = value), "monst-mcorpsenm");
        mtmp.mextra.mcorpsenm = mc;
    } /* mextra */
}


export function restmonchn(nhfp)
{
    let mtmp,mtmp2 = 0;
    let first = 0;
    let buflen = 0;
    let offset;
    let ghostly = (nhfp.ftype == C.NHF_BONESFILE);

    while (1) {
        C.Sfi_int(nhfp, C.reference("int", () => buflen, value => buflen = value), "monst-monst_length");
        if (buflen == -1)
            break;

        mtmp = C.newmonst();
        C.assert(mtmp != 0, 1);
        restmon(nhfp, mtmp);
        if (!first)
            first = mtmp;
        else
            mtmp2.nmon = mtmp;

        if (ghostly) {
            let nid = C.next_ident();

            add_id_mapping(mtmp.m_id, nid);
            mtmp.m_id = nid;
        }
        offset = mtmp.mnum;
        mtmp.data = C.mons[offset];
        if (ghostly) {
            let mndx = (mtmp.cham == C.NON_PM) ? C.monsndx(mtmp.data)
                                              : mtmp.cham;

            if (C.propagate(mndx, 1, ghostly) == 0) {
                /* cookie to trigger purge in getbones() */
                mtmp.mhpmax = C.DEFUNCT_MONSTER;
            }
        }
/* !SFCTOOL */

        if (mtmp.minvent) {
            let obj;
            mtmp.minvent = restobjchn(nhfp, 0);
            /* restore monster back pointer */
            for (obj = mtmp.minvent; obj; obj = obj.nobj)
                obj.ocarry = mtmp;
        }

        if (mtmp.mw) {
            let obj;

            for (obj = mtmp.minvent; obj; obj = obj.nobj)
                if (obj.owornmask & C.W_WEP)
                    break;
            if (obj)
                mtmp.mw = obj;
            else {
                C.MON_NOWEP(mtmp);
                C.impossible("bad monster weapon restore");
            }
        }

        if (mtmp.isshk)
            C.restshk(mtmp, ghostly);
        if (mtmp.ispriest)
            C.restpriest(mtmp, ghostly);

        if (!ghostly) {
            if (mtmp.m_id == C.svc.context.polearm.m_id)
                C.svc.context.polearm.hitmon = mtmp;
        }
/* !SFCTOOL */
        mtmp2 = mtmp;
    }
    if (first && mtmp2.nmon) {
        C.impossible("Restmonchn: error reading monchn.");
        mtmp2.nmon = 0;
    }
    return first;
}


export function loadfruitchn(nhfp)
{
    let flist,fnext;

    flist = 0;
    for (;;) {
        fnext = C.newfruit();
        C.Sfi_fruit(nhfp, fnext, "fruit");
        if (fnext.fid != 0) {
            fnext.nextf = flist;
            flist = fnext;
        } else
            break;
    }
    C.dealloc_fruit(fnext);
    return flist;
}


export function freefruitchn(flist)
{
    let fnext;

    while (flist) {
        fnext = flist.nextf;
        C.dealloc_fruit(flist);
        flist = fnext;
    }
}


export function ghostfruit(otmp)
{
    let oldf;

    for (oldf = C.go.oldfruit; oldf; oldf = oldf.nextf)
        if (oldf.fid == otmp.spe)
            break;

    if (!oldf)
        C.impossible("no old fruit?");
    else
        otmp.spe = C.fruitadd(oldf.fname, 0);
}
/* !SFCTOOL */



export function restgamestate(nhfp)
{
    let i;
    const newgameflags = C.localStruct("flag");
    const newgamecontext = C.localStruct("context_info"); /* all 0, but has some pointers */
    let bc_obj;
    const timebuf = C.stackAlloc(15);
    let uid = 0n;
    let defer_perm_invent, restoring_special;
    let otmp;

    C.Sfi_ulong(nhfp, C.reference("ulong", () => uid, value => uid = value), "gamestate-uid");
    C.Sfi_char(nhfp, C.svn.nhuuid, "nhuuid", C.sizeof(C.svn.nhuuid));
    C.Sfi_long(nhfp, C.addressOf(C.svm, "moves"), "gamestate-moves");
    if (C.SYSOPT_CHECK_SAVE_UID
        && uid != C.ulong(C.getuid())) { /* strange ... */
        if (!C.gc.converted_savefile_loaded)
            /* for wizard mode, issue a reminder; for others, treat it
             * as an attempt to cheat and refuse to restore this file */
            C.pline("Saved game was not yours.");
        if (C.wizard || C.gc.converted_savefile_loaded) {
            if (C.gc.converted_savefile_loaded)
                C.gc.converted_savefile_loaded = 0;
        } else {
            return 0;
        }
    }
/* SFCTOOL */
    C.copyStruct(newgamecontext, C.svc.context); /* copy statically init'd context */
    C.Sfi_context_info(nhfp, C.addressOf(C.svc, "context"), "gamestate-context");
    relative_time_to_moves(C.longPointer(C.addressOf(C.svc.context, "seer_turn")));
    relative_time_to_moves(C.longPointer(C.addressOf(C.svc.context.digging, "lastdigtime")));
    C.svc.context.warntype.species = (C.ismnum(C.svc.context.warntype.speciesidx))
                                  ? C.mons[C.svc.context.warntype.speciesidx]
                                  : 0;
    /* context.victual.piece, .tin.tin, .spellbook.book, and .polearm.hitmon
       are pointers which get set to Null during save and will be recovered
       via corresponding o_id or m_id while objs or mons are being restored */

    /* we want to be able to revert to command line/environment/config
       file option values instead of keeping old save file option values
       if partial restore fails and we resort to starting a new game */
    C.copyStruct(newgameflags, C.flags);
    C.Sfi_flag(nhfp, C.flags, "gamestate-flags");

    /* avoid keeping permanent inventory window up to date during restore
       (setworn() calls update_inventory); attempting to include the cost
       of unpaid items before shopkeeper's bill is available is a no-no;
       named fruit names aren't accessible yet either
       [3.6.2: moved perm_invent from flags to iflags to keep it out of
       save files; retaining the override here is simpler than trying
       to figure out where it really belongs now] */
    defer_perm_invent = C.iflags.perm_invent;
    C.iflags.perm_invent = 0;
    /* wizard and discover are actually flags.debug and flags.explore;
       player might be overriding the save file values for them;
       in the discover case, we don't want to set that for a normal
       game until after the save file has been removed */
    C.iflags.deferred_X = (newgameflags.explore && !C.discover);
    restoring_special = (C.wizard || C.discover);
    if (newgameflags.debug) {
        /* authorized by startup code; wizard mode exists and is allowed */
        C.wizard = 1, C.discover = C.iflags.deferred_X = 0;
    } else if (restoring_special) {
        /* specified by save file; check authorization now. */
        C.set_playmode();
    }
    C.role_init(); /* Reset the initial role, race, gender, and alignment */
/* use colors from save file */
/* !SFCTOOL */
    C.Sfi_long(nhfp, C.addressOf(C.svw, "wreserve"), "wreserve");
    C.Sfi_int32(nhfp, C.addressOf(C.svw, "wtreserved"), "wtreserved");
    C.Sfi_you(nhfp, C.u, "gamestate-you");
    C.gy.youmonst.cham = C.u.mcham;

    if (restoring_special && C.iflags.explore_error_flag) {
        /* savefile has wizard or explore mode, but player is no longer
           authorized to access either; can't downgrade mode any further, so
           fail restoration. */
        C.u.uhp = 0;
    }

    C.Sfi_char(nhfp, timebuf, "gamestate-ubirthday", 14);
    C.storeChar(timebuf + 14, 0);
    C.ubirthday = C.time_from_yyyymmddhhmmss(timebuf);
    C.Sfi_long(nhfp, C.addressOf(C.urealtime, "realtime"), "gamestate-realtime");
    C.Sfi_char(nhfp, timebuf, "gamestate-start_timing", 14);
    C.storeChar(timebuf + 14, 0);
    C.urealtime.start_timing = C.time_from_yyyymmddhhmmss(timebuf);

    /* current time is the time to use for next urealtime.realtime update */
    C.urealtime.start_timing = C.getnow();

    C.set_uasmon();
    C.cliparound(C.u.ux, C.u.uy);
    if (C.u.uhp <= 0 && (!C.Upolyd || C.u.mh <= 0)) {
        C.u.ux = C.u.uy = 0; /* affects pline() [hence You()] */
        C.You("were not healthy enough to survive restoration.");
        /* wiz1_level.dlevel is used by mklev.c to see if lots of stuff is
         * uninitialized, so we only have to set it and not the other stuff.
         */
        C.wiz1_level.dlevel = 0;
        C.u.uz.dnum = 0;
        C.u.uz.dlevel = 1;
        /* revert to pre-restore option settings */
        C.iflags.deferred_X = 0;
        C.iflags.perm_invent = defer_perm_invent;
        C.flags = newgameflags;
        C.svc.context = newgamecontext;
        C.gy.youmonst = C.cg.zeromonst;
        return 0;
    }
    /* in case hangup save occurred in midst of level change */
    C.assign_level(C.addressOf(C.u, "uz0"), C.addressOf(C.u, "uz"));
/* !SFCTOOL */

    /* this stuff comes after potential aborted restore attempts */
    C.restore_killers(nhfp);
    C.restore_timers(nhfp, C.RANGE_GLOBAL, 0n);
    C.restore_light_sources(nhfp);

    C.gi.invent = restobjchn(nhfp, 0);

    /* restore dangling (not on floor or in inventory) ball and/or chain */
    bc_obj = restobjchn(nhfp, 0);
    while (bc_obj) {
        let nobj = bc_obj.nobj;

        bc_obj.nobj = 0;
        if (bc_obj.owornmask)
            C.setworn(bc_obj, bc_obj.owornmask);
        bc_obj = nobj;
    }
    C.gm.migrating_objs = restobjchn(nhfp, 0);
    C.gm.migrating_mons = restmonchn(nhfp);

    for (i = 0; i < C.NUMMONS; ++i) {
        C.Sfi_mvitals(nhfp, C.svm.mvitals[i], "gamestate-mvitals");
    }

    /*
     * There are some things after this that can have unintended display
     * side-effects too early in the game.
     * Disable see_monsters() here, re-enable it at the top of moveloop()
     */
    C.gd.defer_see_monsters = 1;

    /* this comes after inventory has been loaded */
    for (otmp = C.gi.invent; otmp; otmp = otmp.nobj)
        if (otmp.owornmask)
            C.setworn(otmp, otmp.owornmask);

    /* reset weapon so that player will get a reminder about "bashing"
       during next fight when bare-handed or wielding an unconventional
       item; for pick-axe, we aren't able to distinguish between having
       applied or wielded it, so be conservative and assume the former */
    otmp = C.uwep;   /* `uwep' usually init'd by setworn() in loop above */
    C.uwep = 0;      /* clear it and have setuwep() reinit */
    C.setuwep(otmp); /* (don't need any null check here) */
    if (!C.uwep || C.uwep.otyp == C.PICK_AXE || C.uwep.otyp == C.GRAPPLING_HOOK)
        C.gu.unweapon = 1;
/* !SFCTOOL */

    C.restore_dungeon(nhfp);
    restlevchn(nhfp);
    /* hero_seq isn't saved and restored because it can be recalculated */
    C.gh.hero_seq = C.svm.moves << 3n; /* normally handled in moveloop() */
    C.Sfi_q_score(nhfp, C.addressOf(C.svq, "quest_status"), "gamestate-quest_status");

    for (i = 0; i < (C.MAXSPELL + 1); ++i) {
        C.Sfi_spell(nhfp, C.svs.spl_book[i], "gamestate-spl_book");
    }
    C.restore_artifacts(nhfp);
    C.restore_oracles(nhfp);
    C.Sfi_char(nhfp, C.svp.pl_character,
             "gamestate-pl_character", C.sizeof(C.svp.pl_character));
    C.Sfi_char(nhfp, C.svp.pl_fruit, "gamestate-pl_fruit", C.sizeof(C.svp.pl_fruit));
    freefruitchn(C.gf.ffruit); /* clean up fruit(s) made by initoptions() */
    C.gf.ffruit = loadfruitchn(nhfp);

    C.restnames(nhfp);
    C.callLocal(restore_msghistory, nhfp);
    C.callLocal(restore_gamelog, nhfp);
    C.restore_luadata(nhfp);
    /* must come after all mons & objs are restored */
    C.relink_timers(0);
    C.relink_light_sources(0);
    C.adj_erinys(C.u.ualign.abuse);
    /* inventory display is now viable */
    C.iflags.perm_invent = defer_perm_invent;
/* !SFCTOOL */
    return 1;
}

/* update game state pointers to those valid for the current level (so we
   don't dereference a wild u.ustuck when saving game state, for instance) */

export function restlevelstate()
{
    /*
     * Note: restoring steed and engulfer/holder/holdee is now handled
     * in getlev() and there's nothing left for restlevelstate() to do.
     */
    return;
}

/* after getlev(), put current level into a level/lock file;
   essential when splitting a save file into individual level files */
/*ARGSUSED*/

export function restlevelfile(ltmp)
{
    ltmp = C.xint8(ltmp);
    const whynot = C.stackAlloc(C.BUFSZ);
    let nhfp = 0;

    nhfp = C.create_levelfile(ltmp, whynot);
    if (!nhfp) {
        /* failed to create a new file; don't attempt to make a panic save */
        C.program_state.something_worth_saving = 0;
        C.panic("restlevelfile: %s", whynot);
    }
    C.bufon(nhfp.fd);
    nhfp.mode = C.WRITING | C.FREEING;
    C.savelev(nhfp, ltmp);
    C.close_nhfile(nhfp);
    return 2;
}

/*
 * restore_saved_game() prior to this left us at this position in
 * the savefile for dorecover():
 *
 *     format indicator                (1 byte)
 *     n = count of critical size list (1 byte)
 *     n bytes of critical sizes       (n bytes)
 *     version info
 * --> plnametmp = player name size (int, 2 bytes)
 *     player name (PL_NSIZ_PLUS)
 *     current level (including pets)
 *     (non-level-based) game state
 *     other levels
 */


export function dorecover(nhfp)
{
    let ltmp = 0;
    let rtmp;

    /* suppress map display if some part of the code tries to update that */
    C.program_state.restoring = C.REST_GSTATE;

    C.callLocal(get_plname_from_file, nhfp, C.svp.plname, 1);
    /*
     * The position in the save file is now here:
     *
     *     format indicator                (1 byte)
     *     n = count of critical size list (1 byte)
     *     n bytes of critical sizes       (n bytes)
     *     version info
     *     plnametmp = player name size (int, 2 bytes)
     *     player name (PL_NSIZ_PLUS)
     * --> current level (including pets)
     *     (non-level-based) game state
     *     other levels
     */
    C.callLocal(getlev, nhfp, 0, 0);
    if (!C.callLocal(restgamestate, nhfp)) {
        let tnhfp = C.get_freeing_nhfile();

        C.display_nhwindow(C.WIN_MESSAGE, 1);
        C.savelev(tnhfp, 0); /* discard current level */
        C.close_nhfile(tnhfp);
        C.close_nhfile(nhfp);
        C.delete_savefile();
        C.u.usteed_mid = C.u.ustuck_mid = 0;
        C.program_state.restoring = 0;
        return 0;
    }
    /* after restgamestate() -> restnames() so that 'bases[]' is populated */
    C.init_oclass_probs(); /* recompute go.oclass_prob_totals[] */

    restlevelstate();
    C.savestateinlock();
    rtmp = C.callLocal(restlevelfile, C.ledger_no(C.addressOf(C.u, "uz")));
    if (rtmp < 2)
        return rtmp; /* dorecover called recursively */

    C.program_state.restoring = C.REST_LEVELS;

    /* these pointers won't be valid while we're processing the
     * other levels, but they'll be reset again by restlevelstate()
     * afterwards, and in the meantime at least u.usteed may mislead
     * place_monster() on other levels
     */
    C.u.ustuck = 0;
    C.u.usteed = 0;

/* hack until there's a hook for this */
    C.restoreinfo.mread_flags = 1; /* return despite error */
    while (1) {
        C.Sfi_xint8(nhfp, C.reference("xint8", () => ltmp, value => ltmp = value), "gamestate-level_number");
        if (nhfp.eof)
            break;
        C.callLocal(getlev, nhfp, 0, ltmp);
        rtmp = C.callLocal(restlevelfile, ltmp);
        if (rtmp < 2)
            return rtmp; /* dorecover called recursively */
    }
    C.restoreinfo.mread_flags = 0;

    C.rewind_nhfile(nhfp);        /* return to beginning of file */
    C.validate(nhfp, 0, 0);
    C.callLocal(get_plname_from_file, nhfp, C.svp.plname, 1);

    /* not 0 nor REST_GSTATE nor REST_LEVELS */
    C.program_state.restoring = C.REST_CURRENT_LEVEL;

    C.callLocal(getlev, nhfp, 0, 0);
    C.close_nhfile(nhfp);
    restlevelstate();
    C.program_state.something_worth_saving = 1; /* useful data now exists */

    if (!C.wizard && !C.discover)
        C.delete_savefile();
    if (C.Is_rogue_level(C.addressOf(C.u, "uz")))
        C.assign_graphics(C.ROGUESET);
    C.reset_glyphmap(C.gm_levelchange);
    C.max_rank_sz(); /* to recompute gm.mrank_sz (botl.c) */

    if ((C.uball && !C.uchain) || (C.uchain && !C.uball)) {
        C.impossible("restgamestate: lost ball & chain");
        /* poor man's unpunish() */
        C.setworn(0, C.W_CHAIN);
        C.setworn(0, C.W_BALL);
    }

    /* in_use processing must be after:
     *    + The inventory has been read so that freeinv() works.
     *    + The current level has been restored so billing information
     *      is available.
     */
    inven_inuse(0);

    /* Set up the vision internals, after levl[] data is loaded
       but before docrt(). */
    C.reglyph_darkroom();
    C.vision_reset();
    C.gv.vision_full_recalc = 1; /* recompute vision (not saved) */

    C.run_timers(); /* expire all timers that have gone off while away */
    C.program_state.restoring = 0; /* affects bot() so clear before docrt() */

    if (C.ge.early_raw_messages && !C.program_state.beyond_savefile_load) {
        /*
         * We're about to obliterate some potentially important
         * startup messages, so give the player a chance to see them.
         */
        C.ge.early_raw_messages = 0;
        C.wait_synch();
    }
    C.u.usteed_mid = C.u.ustuck_mid = 0;
    C.program_state.beyond_savefile_load = 1;

    C.docrt();
    C.clear_nhwindow(C.WIN_MESSAGE);

    /* Success! */
    C.welcome(0);
    C.check_special_room(0);
    return 1;
}
/* !SFCTOOL */


export function rest_stairs(nhfp)
{
    let buflen = 0;
    const stway = C.localStruct("stairway", true);
    let newst;

    C.stairway_free_all();
    while (1) {
        C.Sfi_int(nhfp, C.reference("int", () => buflen, value => buflen = value), "stairs-staircount");
        if (buflen == -1)
            break;

        C.Sfi_stairway(nhfp, stway, "stairs-stairway");
        if (C.program_state.restoring != C.REST_GSTATE
            && stway.tolev.dnum == C.u.uz.dnum) {
            /* stairway dlevel is relative, make it absolute */
            stway.tolev.dlevel += C.u.uz.dlevel;
        }
        C.stairway_add(stway.sx, stway.sy, stway.up, stway.isladder,
                     stway.tolev);
        newst = C.stairway_at(stway.sx, stway.sy);
        if (newst)
            newst.u_traversed = stway.u_traversed;
    }
}


export function restcemetery(nhfp, cemeteryaddr)
{
    let bonesinfo,bonesaddr;
    let cflag = 0;

    C.Sfi_int(nhfp, C.reference("int", () => cflag, value => cflag = value), "cemetery-cemetery_flag");
    if (cflag == 0) {
        bonesaddr = cemeteryaddr;
        do {
            bonesinfo = C.view("cemetery", C.alloc(C.sizes.cemetery));
            C.Sfi_cemetery(nhfp, bonesinfo, "cemetery-bonesinfo");
            bonesaddr.value = bonesinfo;
            bonesaddr = C.fieldPointer(bonesaddr.value, "next");
        } while (bonesaddr.value);
    } else {
        cemeteryaddr.value = 0;
    }
    if (((nhfp.mode & C.CONVERTING) != 0)
         || ((nhfp.mode & C.UNCONVERTING) != 0)) {
        let thisbones,nextbones;

        /* free the memory */
        nextbones = cemeteryaddr.value;
        while ((thisbones = nextbones) != 0) {
            nextbones = thisbones.next;
            C.free(thisbones);
        }
        cemeteryaddr.value = 0;
    }
}

/*ARGSUSED*/

export function rest_levl(nhfp)
{
    let c, r;

    for (c = 0; c < C.COLNO; ++c) {
        for (r = 0; r < C.ROWNO; ++r) {
            C.Sfi_rm(nhfp, C.levl[c][r], "location-rm");
        }
    }
}



export function trickery(reason)
{
    C.pline("Strange, this map is not as I remember it.");
    C.pline("Somebody is trying some trickery here...");
    C.pline("This game is void.");
    C.Strcpy(C.svk.killer.name, reason ? reason : "");
    C.done(C.TRICKED);
}
/* !SFCTOOL */


export function getlev(nhfp, pid, lev)
{
    let trap;
    let mtmp;
    let br;
    let x, y;
    let elapsed = 0n;
    let hpid = 0;
    let dlvl = 0;
    let i, c, r;
    let ghostly = (nhfp.ftype == C.NHF_BONESFILE);
    let tmpc = 0;

    C.program_state.in_getlev = 1;

    if (ghostly)
        clear_id_mapping();
/* !SFCTOOL */


    /* Load the old fruit info.  We have to do it first, so the
     * information is available when restoring the objects.
     */
    if (ghostly)
        C.go.oldfruit = loadfruitchn(nhfp);

    /* First some sanity checks */
    C.Sfi_int(nhfp, C.reference("int", () => hpid, value => hpid = value), "gamestate-hackpid");
/* CHECK:  This may prevent restoration */
    C.Sfi_xint8(nhfp, C.reference("xint8", () => dlvl, value => dlvl = value), "gamestate-dlvl");
    if ((pid && pid != hpid) || (lev && dlvl != lev)) {
        const trickbuf = C.stackAlloc(C.BUFSZ);

        if (pid && pid != hpid)
            C.Sprintf(trickbuf, "PID (%d) doesn't match saved PID (%d)!", hpid,
                    pid);
        else
            C.Sprintf(trickbuf, "This is level %d, not %d!", dlvl, lev);
        if (C.wizard)
            C.pline1(trickbuf);
        trickery(trickbuf);
    }
    restcemetery(nhfp, C.fieldPointer(C.svl.level,"bonesinfo"));
    rest_levl(nhfp);

    for (c = 0; c < C.COLNO; ++c) {
        for (r = 0; r < C.ROWNO; ++r) {
            C.Sfi_schar(nhfp, C.arrayAddress(C.svl.lastseentyp, c, r), "lastseentyp");
        }
    }
    C.Sfi_long(nhfp, C.addressOf(C.svo, "omoves"), "lev-timestmp");
    elapsed = (C.svm.moves - C.svo.omoves);

    C.callLocal(rest_stairs, nhfp);
    C.Sfi_dest_area(nhfp, C.addressOf(C.svu, "updest"), "lev-updest");
    C.Sfi_dest_area(nhfp, C.addressOf(C.svd, "dndest"), "lev-dndest");
    C.Sfi_levelflags(nhfp, C.addressOf(C.svl.level, "flags"), "lev-level_flags");
    rest_adjust_levelflags();
    if (C.svd.doors) {
        C.free(C.svd.doors);
        C.svd.doors = 0;
    }

    C.Sfi_int(nhfp, C.addressOf(C.svd, "doors_alloc"), "lev-doors_alloc");
    if (C.svd.doors_alloc) { /* avoid pointless alloc(0) */
        C.svd.doors = C.view("nhcoord", C.alloc(C.svd.doors_alloc * C.sizes.nhcoord));
        tmpc = C.svd.doors;
        for (i = 0; i < C.svd.doors_alloc; ++i) {
            C.Sfi_nhcoord(nhfp, tmpc, "lev-doors");
            tmpc = C.advance(tmpc, C.sizes.nhcoord);
        }
    }
    C.rest_rooms(nhfp); /* No joke :-) */
    if (C.svn.nroom) {
        C.gd.doorindex = C.svr.rooms[C.svn.nroom - 1].fdoor
                               + C.svr.rooms[C.svn.nroom - 1].doorct;
    } else {
        C.gd.doorindex = 0;
/* !SFCTOOL */
    }

    C.restore_timers(nhfp, C.RANGE_LEVEL, elapsed);
    C.restore_light_sources(nhfp);
    C.fmon = restmonchn(nhfp);
    C.rest_worm(nhfp);    /* restore worm information */

    C.gf.ftrap = 0;
    for (;;) {
        trap = C.newtrap();
        C.Sfi_trap(nhfp, trap, "trap");
        if (trap.tx != 0) {
            if (C.program_state.restoring != C.REST_GSTATE
                && trap.dst.dnum == C.u.uz.dnum) {
                /* convert relative destination to absolute */
                trap.dst.dlevel += C.u.uz.dlevel;
            }
            trap.ntrap = C.gf.ftrap;
            C.gf.ftrap = trap;
        } else
            break;
    }
    C.dealloc_trap(trap);

    C.fobj = restobjchn(nhfp, 0);
    find_lev_obj();
/* !SFCTOOL */
    /* restobjchn()'s `frozen' argument probably ought to be a callback
       routine so that we can check for objects being buried under ice */
    C.svl.level.buriedobjlist = restobjchn(nhfp, 0);
    C.gb.billobjs = restobjchn(nhfp, 0);
    C.rest_engravings(nhfp);

    /* reset level.monsters for new level */
    for (x = 0; x < C.COLNO; x++)
        for (y = 0; y < C.ROWNO; y++)
            C.svl.level.monsters[x][y] = 0;
    for (mtmp = C.fmon; mtmp; mtmp = mtmp.nmon) {
        if (mtmp.isshk)
            C.set_residency(mtmp, 0);
        if (mtmp.m_id == C.u.usteed_mid) {
            /* steed is kept on fmon list but off the map */
            C.u.usteed = mtmp;
            C.u.usteed_mid = 0;
        } else {
            if (mtmp.m_id == C.u.ustuck_mid) {
                C.set_ustuck(mtmp);
                C.u.ustuck_mid = 0;
            }
            C.place_monster(mtmp, mtmp.mx, mtmp.my);
            if (mtmp.wormno)
                C.place_wsegs(mtmp, 0);
            if (C.hides_under(mtmp.data) && mtmp.mundetected)
                C.hideunder(mtmp);
        }

        /* regenerate monsters while on another level */
        if (!C.u.uz.dlevel || C.program_state.restoring == C.REST_LEVELS)
            continue;
        if (ghostly) {
            /* reset peaceful/malign relative to new character;
               shopkeepers will reset based on name */
            if (!mtmp.isshk)
                mtmp.mpeaceful = (C.is_unicorn(mtmp.data)
                                   && (C.sgn(C.u.ualign.type)
                                       == C.sgn(mtmp.data.maligntyp))) ? 1
                                  : C.peace_minded(mtmp.data);
            C.set_malign(mtmp);
        } else if (elapsed > 0n) {
            C.mon_catchup_elapsed_time(mtmp, elapsed);
        }
        /* update shape-changers in case protection against
           them is different now than when the level was saved */
        C.restore_cham(mtmp);
        /* give hiders a chance to hide before their next move */
        if (ghostly || (elapsed > 0n && elapsed > BigInt(C.rnd(10, 1219))))
            C.hide_monst(mtmp);
    }
/* !SFCTOOL */

    restdamage(nhfp);
    C.rest_regions(nhfp);
    rest_bubbles(nhfp); /* for water and air; empty marker on other levels */
    C.load_exclusions(nhfp);
    C.rest_track(nhfp);

    if (ghostly) {
        let stway = C.gs.stairs;
        while (stway) {
            if (!stway.isladder && !stway.up
                && stway.tolev.dnum == C.u.uz.dnum)
                break;
            stway = stway.next;
        }

        /* Now get rid of all the temp fruits... */
        freefruitchn(C.go.oldfruit), C.go.oldfruit = 0;

        if (lev > C.ledger_no(C.medusa_level)
            && lev < C.ledger_no(C.stronghold_level) && !stway) {
            const cc = C.localStruct("nhcoord");
            const dest = C.localStruct("d_level");

            dest.dnum = C.u.uz.dnum;
            dest.dlevel = C.u.uz.dlevel + 1;

            C.mazexy(cc);
            C.stairway_add(cc.x, cc.y, 0, 0, dest);
            C.levl[cc.x][cc.y].typ = C.STAIRS;
        }

        br = C.Is_branchlev(C.addressOf(C.u, "uz"));
        if (br && C.u.uz.dlevel == 1) {
            const ltmp = C.localStruct("d_level");

            if (C.on_level(C.addressOf(C.u, "uz"), C.addressOf(br, "end1")))
                C.assign_level(ltmp, C.addressOf(br, "end2"));
            else
                C.assign_level(ltmp, C.addressOf(br, "end1"));

            switch (br.type) {
            case C.BR_STAIR:
            case C.BR_NO_END1:
            case C.BR_NO_END2:
                stway = C.gs.stairs;
                while (stway) {
                    if (stway.tolev.dnum != C.u.uz.dnum)
                        break;
                    stway = stway.next;
                }
                if (stway)
                    C.assign_level(stway.tolev, ltmp);
                break;
            case C.BR_PORTAL: /* max of 1 portal per level */
                for (trap = C.gf.ftrap; trap; trap = trap.ntrap)
                    if (trap.ttyp == C.MAGIC_PORTAL)
                        break;
                if (!trap)
                    C.panic("getlev: need portal but none found");
                C.assign_level(C.addressOf(trap, "dst"), ltmp);
                break;
            }
        } else if (!br) {
            let ttmp = 0;

            /* Remove any dangling portals. */
            for (trap = C.gf.ftrap; trap; trap = ttmp) {
                ttmp = trap.ntrap;
                if (trap.ttyp == C.MAGIC_PORTAL)
                    C.deltrap(trap);
            }
        }
    }
    /* must come after all mons & objs are restored */
    C.relink_timers(ghostly);
    C.relink_light_sources(ghostly);
    reset_oattached_mids(ghostly);

    if (ghostly)
        clear_id_mapping();
    C.program_state.in_getlev = 0;
/* !SFCTOOL */
    C.program_state.in_getlev = 0;
}


export function rest_adjust_levelflags()
{
    /* adjust timestamps */
    relative_time_to_moves(C.longPointer(C.addressOf(C.svl.level.flags, "stasis_until")));
}

export function moves_to_relative_time(timestamp)
{
    let prevts = timestamp.value;

    timestamp.value = prevts - C.svm.moves;
}


export function relative_time_to_moves(timestamp)
{
    let prevts = timestamp.value;

    timestamp.value = C.svm.moves + prevts;
}

/* "name-role-race-gend-algn" occurs very early in a save file; sometimes we
   want the whole thing, other times just "name" (for svp.plname[]) */
/* size must be at least [PL_NSIZ_PLUS] even if name_only *//* True: just name; False: name-role-race-gend-algn */
export function get_plname_from_file(nhfp, outbuf, name_only)
{
    const plbuf = C.stackAlloc(C.PL_NSIZ_PLUS);
    let pltmpsiz = 0;

    C.storeChar(plbuf, 0);

    C.Sfi_int(nhfp, C.reference("int", () => pltmpsiz, value => pltmpsiz = value), "plname-size");
    /* pltmpsiz should now be PL_NSIZ_PLUS */
    C.Sfi_char(nhfp, plbuf, "plname", pltmpsiz);
    /* plbuf[PL_NSIZ_PLUS-2] should be '\0';
       plbuf[PL_NSIZ_PLUS-1] should be '-' or 'X' or 'D' */
    /* "-race-role-gend-algn" is already present except that it has been
       hidden by replacing the initial dash with NUL; if we want that
       information, replace the NUL with a dash */
    if (!name_only)
        C.storeChar(C.eos(plbuf), 45);
    /* not simple strcpy(); playmode is in the last slot and could (probably
       will) be preceded by NULs */
    C.memcpy(outbuf, plbuf, C.PL_NSIZ_PLUS);
    return;
}

/* restore Plane of Water's air bubbles and Plane of Air's clouds */

export function rest_bubbles(nhfp)
{
    let bbubbly;

    /* whether or not the Plane of Water's air bubbles or Plane of Air's
       clouds are present is recorded during save so that we don't have to
       know what level is being restored */
    bbubbly = 0;
    C.Sfi_xint8(nhfp, C.reference("xint8", () => bbubbly, value => bbubbly = value), "bubbles-bbubbly");
    if (bbubbly)
        C.restore_waterlevel(nhfp);
}


export function restore_gamelog(nhfp)
{
    let slen = 0;
    const msg = C.stackAlloc(C.BUFSZ*2);
    const tmp = C.localStruct("gamelog_line", true);

    while (1) {
        C.Sfi_int(nhfp, C.reference("int", () => slen, value => slen = value), "gamelog-length");
        if (slen == -1)
            break;
        if (slen > ((C.BUFSZ*2) - 1))
            C.panic("restore_gamelog: msg too big (%d)", slen);
        C.Sfi_char(nhfp, msg, "gamelog-gamelog_text", slen);
        C.storeChar(msg + slen, 0);
        C.Sfi_gamelog_line(nhfp, tmp, "gamelog-gamelog_line");
        C.gamelog_add(tmp.flags, tmp.turn, msg);
/* !SFCTOOL */
    }
}


export function restore_msghistory(nhfp)
{
    let msgsize = 0;
    let msgcount = 0;
    const msg = C.stackAlloc(C.BUFSZ);

    while (1) {
        C.Sfi_int(nhfp, C.reference("int", () => msgsize, value => msgsize = value), "msghistory-length");
        if (msgsize == -1)
            break;
        if (msgsize > C.BUFSZ - 1)
            C.panic("restore_msghistory: msg too big (%d)", msgsize);
        C.Sfi_char(nhfp, msg, "msghistory-msg", msgsize);
        C.storeChar(msg + msgsize, 0);
        C.putmsghistory(msg, 1);
        ++msgcount;
/* !SFCTOOL */
    }
    if (msgcount)
        C.putmsghistory(0, 1);
    C.debugpline1("Read %d messages from savefile.", msgcount);
/* !SFCTOOL */
}


/* Clear all structures for object and monster ID mapping. */

export function clear_id_mapping()
{
    let curr;

    while ((curr = C.gi.id_map) != 0) {
        C.gi.id_map = curr.next;
        C.free(curr);
    }
    C.gn.n_ids_mapped = 0;
}

/* Add a mapping to the ID map. */

export function add_id_mapping(gid, nid)
{
    let idx;

    idx = C.gn.n_ids_mapped % C.N_PER_BUCKET;
    /* idx is zero on first time through, as well as when a new bucket is */
    /* needed */
    if (idx == 0) {
        let gnu = C.view("bucket", C.alloc(C.sizes.bucket));
        gnu.next = C.gi.id_map;
        C.gi.id_map = gnu;
    }

    C.gi.id_map.map[idx].gid = gid;
    C.gi.id_map.map[idx].nid = nid;
    C.gn.n_ids_mapped++;
}

/*
 * Global routine to look up a mapping.  If found, return TRUE and fill
 * in the new ID value.  Otherwise, return false and return -1 in the new
 * ID.
 */

export function lookup_id_mapping(gid, nidp)
{
    let i;
    let curr;

    if (C.gn.n_ids_mapped)
        for (curr = C.gi.id_map; curr; curr = curr.next) {
            /* first bucket might not be totally full */
            if (curr == C.gi.id_map) {
                i = C.gn.n_ids_mapped % C.N_PER_BUCKET;
                if (i == 0)
                    i = C.N_PER_BUCKET;
            } else
                i = C.N_PER_BUCKET;

            while (--i >= 0)
                if (gid == curr.map[i].gid) {
                    nidp.value = curr.map[i].nid;
                    return 1;
                }
        }

    return 0;
}


export function reset_oattached_mids(ghostly)
{
    let otmp;
    let oldid, nid;

    for (otmp = C.fobj; otmp; otmp = otmp.nobj) {
        if (ghostly && C.has_omonst(otmp)) {
            let mtmp = C.OMONST(otmp);

            mtmp.m_id = 0;
            mtmp.mpeaceful = mtmp.mtame = 0; /* pet's owner died! */
        }
        if (ghostly && C.has_omid(otmp)) {
            oldid = C.OMID(otmp);
            if (lookup_id_mapping(oldid, C.reference("unsigned", () => nid, value => nid = value)))
                otmp.oextra.omid = nid;
            else
                C.free_omid(otmp);
        }
    }
}

/* put up a menu listing each character from this player's saved games;
   returns 1: use svp.plname[], 0: new game, -1: quit */
/* if not WIN_ERR, clear window
                      * and show copyright in menu */
export function restore_menu(bannerwin)
{
    let tmpwin;
    const any = C.localStruct("anything");
    let saved, next, mode;
    const menutext = C.stackAlloc(C.BUFSZ);
    let all_normal;
    let chosen_game = 0;
    let k, clet, ch = 0; /* ch: 0 => new game */
    let clr = C.NO_COLOR;

    C.storeChar(C.svp.plname, 0);
    saved = C.get_saved_games(); /* array of character names */
    if (saved && saved[0]) {
        tmpwin = C.create_nhwindow(C.NHW_MENU);
        C.start_menu(tmpwin, C.MENU_BEHAVE_STANDARD);
        C.copyStruct(any, C.cg.zeroany); /* no selection */
        if (bannerwin != C.WIN_ERR) {
            /* for tty; erase copyright notice and redo it in the menu */
            C.clear_nhwindow(bannerwin);
            /* COPYRIGHT_BANNER_[ABCD] */
            for (k = 1; k <= 4; ++k)
                C.add_menu_str(tmpwin, C.copyright_banner_line(k));
            C.add_menu_str(tmpwin, "");
        }
        C.add_menu_str(tmpwin, "Select one of your saved games");
        /* if all the save files have a playmode of '-' then we'll just list
           their character name-role-race-gend-algn values, but if any are
           'X' or 'D', we'll list playmode along with name-role-&c values
           for every entry; first, figure out if they're all normal play */
        for (all_normal = 1, k = 0; all_normal && saved[k]; ++k) {
            next = saved[k];
            mode = C.loadChar(next + C.PL_NSIZ_PLUS - 1); /* fixed last char, beyond '\0' */
            if (mode != 45)
                all_normal = 0;
        }
        for (k = 0; saved[k]; ++k) {
            any.a_int = k + 1;
            next = saved[k];
            mode = C.loadChar(next + C.PL_NSIZ_PLUS - 1);
            if (all_normal)
                C.Sprintf(menutext, "%.*s", C.PL_NSIZ_PLUS - 1, next);
            else
                C.Sprintf(menutext, "%c %.*s", mode, C.PL_NSIZ_PLUS - 1, next);
            C.add_menu(tmpwin, C.nul_glyphinfo, any, 0, 0, C.ATR_NONE, clr,
                     menutext, C.MENU_ITEMFLAGS_SKIPMENUCOLORS);
        }
        clet = (k <= 110 - 97) ? 110      /* new game */
               : (k <= 26 + 78 - 65) ? 78 : 0;
        any.a_int = -1;                    /* not >= 0 */
        C.add_menu(tmpwin, C.nul_glyphinfo, any, clet, 78, C.ATR_NONE, clr,
                 "Start a new character", C.MENU_ITEMFLAGS_NONE);
        clet = (k + 1 <= 113 - 97 && clet == 110) ? 113  /* quit */
               : (k + 1 <= 26 + 81 - 65 && clet == 78) ? 81 : 0;
        any.a_int = -2;
        C.add_menu(tmpwin, C.nul_glyphinfo, any, clet, 81, C.ATR_NONE, clr,
                 "Never mind (quit)", C.MENU_ITEMFLAGS_SELECTED);
        /* no prompt on end_menu, as we've done our own at the top */
        C.end_menu(tmpwin, 0);
        if (C.select_menu(tmpwin, C.PICK_ONE, C.localPointer(() => chosen_game, value => chosen_game = value, "menu_item")) > 0) {
            ch = chosen_game.item.a_int;
            if (ch > 0)
                C.Strcpy(C.svp.plname, saved[ch - 1]);
            else if (ch < 0)
                ++ch; /* -1 -> 0 (new game), -2 -> -1 (quit) */
            C.free(chosen_game);
        } else {
            ch = -1; /* quit menu without making a selection => quit */
        }
        C.destroy_nhwindow(tmpwin);
        if (bannerwin != C.WIN_ERR) {
            /* for tty; clear the menu away and put subset of copyright back
             */
            C.clear_nhwindow(bannerwin);
            /* COPYRIGHT_BANNER_A, preceding "Who are you?" prompt */
            if (ch == 0)
                C.putstr(bannerwin, 0, C.copyright_banner_line(1));
        }
    }
    C.free_saved_games(saved);
    return (ch > 0) ? 1 : ch;
}
/* SELECTSAVED */
/* !SFCTOOL */

/*restore.c*/
