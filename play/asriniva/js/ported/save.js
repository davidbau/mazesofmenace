import { C } from '../c-runtime/context.js';

/* NetHack 5.0	save.c	$NHDT-Date: 1737610109 2025/01/22 21:28:29 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.232 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Michael Allison, 2009. */
/* NetHack may be freely redistributed.  See license for details. */



/* also used in restore */

/* #define HUP if (!program_state.done_hup) */
/* #define HUP */

/* the #save command */
export function dosave()
{
    C.clear_nhwindow(C.WIN_MESSAGE);
    if (C.y_n("Really save?") == 110) {
        C.clear_nhwindow(C.WIN_MESSAGE);
        if (C.gm.multi > 0)
            C.nomul(0);
    } else {
        C.clear_nhwindow(C.WIN_MESSAGE);
        C.pline("Saving...");
        C.program_state.done_hup = 0;
        if (dosave0()) {
            C.program_state.savefile_completed++;
            C.u.uhp = -1; /* universal game's over indicator */
            if (C.soundprocs.sound_exit_nhsound)
                C.soundprocs.sound_exit_nhsound("dosave");

            /* make sure they see the Saving message */
            C.display_nhwindow(C.WIN_MESSAGE, 1);
            C.exit_nhwindows("Be seeing you...");
            C.nh_terminate(C.EXIT_SUCCESS);
        } else
            C.docrt();
    }
    return C.ECMD_OK;
}

/* returns 1 if save successful */
export function dosave0()
{
    let fq_save;
    let ltmp;
    const whynot = C.stackAlloc(C.BUFSZ);
    let nhfp, onhfp;
    let res = 0;

    done: {
    C.program_state.saving++; /* inhibit status and perm_invent updates */
    C.notice_mon_off();
    /* we may get here via hangup signal, in which case we want to fix up
       a few of things before saving so that they won't be restored in
       an improper state; these will be no-ops for normal save sequence */
    C.u.uinvulnerable = 0;
    if (C.iflags.save_uswallow)
        C.u.uswallow = 1, C.iflags.save_uswallow = 0;
    if (C.iflags.save_uinwater)
        C.u.uinwater = 1, C.iflags.save_uinwater = 0; /* bypass set_uinwater() */
    if (C.iflags.save_uburied)
        C.u.uburied = 1, C.iflags.save_uburied = 0;
    /* extra handling for hangup save or panic save; without this,
       a thrown light source might trigger an "obj_is_local" panic;
       if a thrown or kicked object is in transit, put it on the map;
       when punished, make sure ball and chain are placed too */
    C.done_object_cleanup(); /* maybe force some items onto map */

    if (!C.program_state.something_worth_saving || !C.gs.SAVEF[0])
        break done;

    fq_save = C.fqname(C.gs.SAVEF, C.SAVEPREFIX, 1); /* level files take 0 */
    C.sethanguphandler(C.SIG_IGN);
    C.signal(C.SIGINT, C.SIG_IGN);

    if (!C.program_state.done_hup) if (C.iflags.window_inited) {
        C.nh_uncompress(fq_save);
        nhfp = C.open_savefile();
        if (nhfp) {
            C.close_nhfile(nhfp);
            C.clear_nhwindow(C.WIN_MESSAGE);
            C.There("seems to be an old save file.");
            if (C.y_n("Overwrite the old file?") == 110) {
                C.nh_sfconvert(fq_save);
                C.nh_compress(fq_save);
                break done;
            }
        }
    }

    if (!C.program_state.done_hup) C.mark_synch(); /* flush any buffered screen output */

    nhfp = C.create_savefile();
    if (!nhfp) {
        if (!C.program_state.done_hup) C.pline("Cannot open save file.");
        C.delete_savefile(); /* ab@unido */
        break done;
    }
    if (nhfp && nhfp.fplog) {
        nhfp.rcount = nhfp.wcount = 0n;
    }

    C.vision_recalc(2); /* shut down vision to prevent problems
                         in the event of an impossible() call */

    /* undo date-dependent luck adjustments made at startup time */
    if (C.flags.moonphase == C.FULL_MOON) /* ut-sally!fletcher */
        C.change_luck(-1);              /* and unido!ab */
    if (C.flags.friday13)
        C.change_luck(1);
    if (C.iflags.window_inited)
        if (!C.program_state.done_hup) C.clear_nhwindow(C.WIN_MESSAGE);

    nhfp.mode = C.WRITING | C.FREEING;
    C.store_version(nhfp);
    store_plname_in_file(nhfp);
    /* savelev() might save uball and uchain, releasing their memory if
       FREEING, so we need to check their status now; if hero is swallowed,
       uball and uchain will persist beyond saving map floor and inventory
       so these copies of their pointers will be valid and savegamestate()
       will know to save them separately (from floor and invent); when not
       swallowed, uchain will be stale by then, and uball will be too if
       ball is on the floor rather than carried */
    C.gl.looseball = C.BALL_IN_MON ? C.uball : 0;
    C.gl.loosechain = C.CHAIN_IN_MON ? C.uchain : 0;
    savelev(nhfp, C.ledger_no(C.addressOf(C.u, "uz")));
    savegamestate(nhfp);

    /* While copying level files around, zero out u.uz to keep
     * parts of the restore code from completely initializing all
     * in-core data structures, since all we're doing is copying.
     * This also avoids at least one nasty core dump.
     * [gu.uz_save is used by save_bubbles() as well as to restore u.uz]
     */
    C.gu.uz_save = C.u.uz;
    C.u.uz.dnum = C.u.uz.dlevel = 0;
    /* these pointers are no longer valid, and at least u.usteed
     * may mislead place_monster() on other levels
     */
    C.set_ustuck(0); /* also clears u.uswallow */
    C.u.usteed = 0;

    for (ltmp = 1; ltmp <= C.maxledgerno(); ltmp = C.xint8(ltmp + 1)) {
        if (ltmp == C.ledger_no(C.addressOf(C.gu, "uz_save")))
            continue;
        if (!(C.svl.level_info[ltmp].flags & C.LFILE_EXISTS))
            continue;
        onhfp = C.open_levelfile(ltmp, whynot);
        if (!onhfp) {
            if (!C.program_state.done_hup) C.pline1(whynot);
            C.close_nhfile(nhfp);
            C.delete_savefile();
            if (!C.program_state.done_hup) C.Strcpy(C.svk.killer.name, whynot);
            if (!C.program_state.done_hup) C.done(C.TRICKED);
            break done;
        }
        C.getlev(onhfp, C.svh.hackpid, ltmp);
        C.close_nhfile(onhfp);
        C.Sfo_xint8(nhfp, C.reference("xint8", () => ltmp, value => ltmp = value), "gamestate-level_number");
        savelev(nhfp, ltmp);     /* actual level*/
        C.delete_levelfile(ltmp);
    }
    C.close_nhfile(nhfp);

    C.u.uz = C.gu.uz_save;
    C.gu.uz_save.dnum = C.gu.uz_save.dlevel = 0;

    /* get rid of current level --jgm */
    C.delete_levelfile(C.ledger_no(C.addressOf(C.u, "uz")));
    C.delete_levelfile(0);
    C.nh_sfconvert(fq_save);
    C.nh_compress(fq_save);
    /* this should probably come sooner... */
    C.program_state.something_worth_saving = 0;
    res = 1;

    }

    C.notice_mon_on();
    C.program_state.saving--;
    return res;
}

export function save_gamelog(nhfp)
{
    let tmp = C.gg.gamelog, tmp2;
    let slen;

    while (tmp) {
        tmp2 = tmp.next;
        if (nhfp.mode & (C.COUNTING | C.WRITING)) {
            slen = C.Strlen(tmp.text, 0);
            C.Sfo_int(nhfp, C.reference("int", () => slen, value => slen = value), "gamelog-length");
            C.Sfo_char(nhfp, tmp.text, "gamelog-gamelog_text", slen);
            C.Sfo_gamelog_line(nhfp, tmp, "gamelog-gamelog_line");
        }
        if (nhfp.mode & C.FREEING) {
            C.free(tmp.text);
            C.free(tmp);
        }
        tmp = tmp2;
    }
    if (nhfp.mode & (C.COUNTING | C.WRITING)) {
        slen = -1;
        C.Sfo_int(nhfp, C.reference("int", () => slen, value => slen = value), "gamelog-length");
    }
    if (nhfp.mode & C.FREEING)
        C.gg.gamelog = 0;
}

export function savegamestate(nhfp)
{
    let i;
    let uid;

    C.program_state.saving++; /* caller should/did already set this... */
    uid = C.ulong(C.getuid());
    C.Sfo_ulong(nhfp, C.reference("ulong", () => uid, value => uid = value), "gamestate-uid");
    C.Sfo_char(nhfp, C.svn.nhuuid, "nhuuid", C.sizeof(C.svn.nhuuid));
    C.Sfo_long(nhfp, C.addressOf(C.svm, "moves"), "gamestate-moves");
    C.moves_to_relative_time(C.addressOf(C.svc.context, "seer_turn"));
    C.moves_to_relative_time(C.addressOf(C.svc.context.digging, "lastdigtime"));
    C.Sfo_context_info(nhfp, C.addressOf(C.svc, "context"), "gamestate-context");
    C.relative_time_to_moves(C.addressOf(C.svc.context, "seer_turn"));
    C.relative_time_to_moves(C.addressOf(C.svc.context.digging, "lastdigtime"));

    C.Sfo_flag(nhfp, C.flags, "gamestate-flags");
    C.urealtime.finish_time = C.getnow();
    C.urealtime.realtime += C.timet_delta(C.urealtime.finish_time,
                                      C.urealtime.start_timing);
    C.Sfo_long(nhfp, C.addressOf(C.svw, "wreserve"), "wreserve");
    C.Sfo_int32(nhfp, C.addressOf(C.svw, "wtreserved"), "wtreserved");
    C.Sfo_you(nhfp, C.u, "gamestate-you");
    C.Sfo_char(nhfp, C.yyyymmddhhmmss(C.ubirthday), "gamestate-ubirthday", 14);
    C.Sfo_long(nhfp, C.addressOf(C.urealtime, "realtime"), "gamestate-realtime");
    C.Sfo_char(nhfp, C.yyyymmddhhmmss(C.urealtime.start_timing), "gamestate-start_timing", 14);
    /* this is the value to use for the next update of urealtime.realtime */
    C.urealtime.start_timing = C.urealtime.finish_time;
    C.save_killers(nhfp);

    /* must come before gm.migrating_objs and gm.migrating_mons are freed */
    C.save_timers(nhfp, C.RANGE_GLOBAL);
    C.save_light_sources(nhfp, C.RANGE_GLOBAL);

    /* when FREEING, deletes objects in invent and sets invent to Null;
       pointers into invent (uwep, uarmg, uamul, &c) are set to Null too */
    saveobjchn(nhfp, C.fieldPointer(C.gi, "invent"));

    /* save ball and chain if they happen to be in an unusual state */
    save_bc(nhfp);

    saveobjchn(nhfp, C.fieldPointer(C.gm, "migrating_objs")); /* frees objs and sets to Null */
    savemonchn(nhfp, C.gm.migrating_mons);
    if (C.release_data(nhfp))
        C.gm.migrating_mons = 0;
    for (i = 0; i < C.NUMMONS; ++i) {
        C.Sfo_mvitals(nhfp, C.svm.mvitals[i], "gamestate-mvitals");
    }
    C.save_dungeon(nhfp, !!C.update_file(nhfp),
                 !!C.release_data(nhfp));
    savelevchn(nhfp);
    C.Sfo_q_score(nhfp, C.addressOf(C.svq, "quest_status"), "gamestate-quest_status");
    for (i = 0; i < (C.MAXSPELL + 1); ++i) {
        C.Sfo_spell(nhfp, C.svs.spl_book[i], "gamestate-spl_book");
    }
    C.save_artifacts(nhfp);
    C.save_oracles(nhfp);
    C.Sfo_char(nhfp, C.svp.pl_character, "gamestate-pl_character", C.sizeof(C.svp.pl_character));
    C.Sfo_char(nhfp, C.svp.pl_fruit, "gamestate-pl_fruit", C.sizeof(C.svp.pl_fruit));
    savefruitchn(nhfp);
    C.savenames(nhfp);
    save_msghistory(nhfp);
    save_gamelog(nhfp);
    C.save_luadata(nhfp);
    if (nhfp.structlevel)
        C.bflush(nhfp.fd);
    C.program_state.saving--;
    return;
}

/* potentially called from goto_level(do.c) as well as savestateinlock() */
export function tricked_fileremoved(nhfp, whynot)
{
    if (!nhfp) {
        C.pline1(whynot);
        C.pline("Probably someone removed it.");
        C.Strcpy(C.svk.killer.name, whynot);
        C.done(C.TRICKED);
        return 1;
    }
    return 0;
}

export function savestateinlock()
{
    let hpid = 0;
    const whynot = C.stackAlloc(C.BUFSZ);
    let nhfp;

    C.program_state.saving++; /* inhibit status and perm_invent updates */
    /* When checkpointing is on, the full state needs to be written
     * on each checkpoint.  When checkpointing is off, only the pid
     * needs to be in the level.0 file, so it does not need to be
     * constantly rewritten.  When checkpointing is turned off during
     * a game, however, the file has to be rewritten once to truncate
     * it and avoid restoring from outdated information.
     *
     * Restricting gh.havestate to this routine means that an additional
     * noop pid rewriting will take place on the first "checkpoint" after
     * the game is started or restored, if checkpointing is off.
     */
    checkpoint: {
    if (C.flags.ins_chkpt || C.gh.havestate) {
        /* save the rest of the current game state in the lock file,
         * following the original int pid, the current level number,
         * and the current savefile name, which should not be subject
         * to any internal compression schemes since they must be
         * readable by an external utility
         */
        nhfp = C.open_levelfile(0, whynot);
        if (tricked_fileremoved(nhfp, whynot)) {
            C.program_state.saving--;
            return;
        }

        giveup: {
        C.Sfi_int(nhfp, C.reference("int", () => hpid, value => hpid = value), "gamestate-hackpid");
        if (C.svh.hackpid != hpid) {
            C.Sprintf(whynot, "Level #0 pid (%d) doesn't match ours (%d)!",
                    hpid, C.svh.hackpid);
            break giveup;
        }
        C.close_nhfile(nhfp);

        nhfp = C.create_levelfile(0, whynot);
        if (!nhfp) {
            C.pline1(whynot);
            break giveup;
        }
        nhfp.mode = C.WRITING;
        C.Sfo_int(nhfp, C.addressOf(C.svh, "hackpid"), "gamestate-hackpid");
        if (C.flags.ins_chkpt) {
            let currlev = C.ledger_no(C.addressOf(C.u, "uz"));

            C.Sfo_int(nhfp, C.reference("int", () => currlev, value => currlev = value), "gamestate-savestateinlock");
            C.save_savefile_name(nhfp);
            C.store_version(nhfp);
            store_plname_in_file(nhfp);

            /* if ball and/or chain aren't on floor or in invent, keep a copy
               of their pointers; not valid when on floor or in invent */
            C.gl.looseball = C.BALL_IN_MON ? C.uball : 0;
            C.gl.loosechain = C.CHAIN_IN_MON ? C.uchain : 0;
            savegamestate(nhfp);
        }
        C.close_nhfile(nhfp);
        break checkpoint;
        }

            C.Strcpy(C.svk.killer.name, whynot);
            /* done(TRICKED) will return when running in wizard mode;
               clear the display-update-suppression flag before rather
               than after so that screen updating behaves normally;
               game data shouldn't be inconsistent yet, unlike it would
               become midway through saving */
            C.program_state.saving--;
            C.done(C.TRICKED);
            return;
        
    }
    }
    C.program_state.saving--;
    C.gh.havestate = C.flags.ins_chkpt;
    return;
}

export function savelev(nhfp, lev)
{
    lev = C.xint8(lev);
    let set_uz_save = (C.gu.uz_save.dnum == 0 && C.gu.uz_save.dlevel == 0);

    /* caller might have already set up gu.uz_save and zeroed u.uz;
       if not, we need to set it for save_bubbles(); caveat: if the
       player quits during character selection, u.uz won't be set yet
       but we'll be called during run-down */
    if (set_uz_save && (nhfp.mode & (C.COUNTING | C.WRITING))) {
        if (C.u.uz.dnum == 0 && C.u.uz.dlevel == 0) {
            C.program_state.something_worth_saving = 0;
            C.panic("savelev: where are we?");
        }
        C.gu.uz_save = C.u.uz;
    }

    savelev_core(nhfp, lev);

    if (set_uz_save)
        C.gu.uz_save.dnum = C.gu.uz_save.dlevel = 0; /* unset */
}

export function savelev_core(nhfp, lev)
{
    lev = C.xint8(lev);
    let i, c, r;
    let tmpc;

    C.program_state.saving++; /* even if current mode is FREEING */

    if (!nhfp)
        C.panic("Save on bad file!"); /* impossible */
    /*
     *  Level file contents:
     *    version info (handled by caller);
     *    save file info (compression type; also by caller);
     *    process ID;
     *    internal level number (ledger number);
     *    bones info;
     *    actual level data.
     *
     *  If we're tearing down the current level without saving anything
     *  (which happens at end of game or upon entrance to endgame or
     *  after an aborted restore attempt) then we don't want to do any
     *  actual I/O.  So when only freeing, we skip to the bones info
     *  portion (which has some freeing to do), then jump quite a bit
     *  further ahead to the middle of the 'actual level data' portion.
     */
    if (nhfp.mode != C.FREEING) {
        /* WRITING (probably ORed with FREEING), or COUNTING */

        /* purge any dead monsters (necessary if we're starting
           a panic save rather than a normal one, or sometimes
           when changing levels without taking time -- e.g.
           create statue trap then immediately level teleport) */
        if (C.iflags.purge_monsters)
            C.dmonsfree();
        /* clear objs_deleted list too */
        if (C.go.objs_deleted)
            C.dobjsfree(); /* really free deleted objects */

        if (lev >= 0 && lev <= C.maxledgerno())
            C.svl.level_info[lev].flags |= C.VISITED;
        C.Sfo_int(nhfp, C.addressOf(C.svh, "hackpid"), "gamestate-hackpid");
        C.Sfo_xint8(nhfp, C.reference("xint8", () => lev, value => lev = value), "gamestate-dlvl");
    }

    /* bones info comes before level data; the intent is for an external
       program ('hearse') to be able to match a bones file with the
       corresponding log file entry--or perhaps just skip that?--without
       the guessing that was needed in 3.4.3 and without having to
       interpret level data to find where to start; unfortunately it
       still needs to handle all the data compression schemes */
    savecemetery(nhfp, C.fieldPointer(C.svl.level, "bonesinfo"));
    skip_lots: {
    if (nhfp.mode == C.FREEING) /* see above */
        break skip_lots;

    savelevl(nhfp);
    for (c = 0; c < C.COLNO; ++c) {
        for (r = 0; r < C.ROWNO; ++r) {
            C.Sfo_schar(nhfp, C.arrayAddress(C.svl.lastseentyp, c, r), "lastseentyp");
        }
    }
    /* svm.moves will actually be read back into svo.omoves on restore */
    C.Sfo_long(nhfp, C.addressOf(C.svm, "moves"), "lev-timestmp");
    save_stairs(nhfp);
    C.Sfo_dest_area(nhfp, C.addressOf(C.svu, "updest"), "lev-updest");
    C.Sfo_dest_area(nhfp, C.addressOf(C.svd, "dndest"), "lev-dndest");
    save_adjust_levelflags();
    C.Sfo_levelflags(nhfp, C.addressOf(C.svl.level, "flags"), "lev-level_flags");
    C.rest_adjust_levelflags();

    C.Sfo_int(nhfp, C.addressOf(C.svd, "doors_alloc"), "lev-doors_alloc");
    /* don't rely on underlying write() behavior to write
     *  nothing if count arg is 0, just skip it */
    if (C.svd.doors_alloc) {
        tmpc = C.svd.doors;
        for (i = 0; i < C.svd.doors_alloc; ++i) {
            C.Sfo_nhcoord(nhfp, tmpc, "lev-doors");
            tmpc = C.advance(tmpc, C.sizes.nhcoord);
        }
    }
    C.save_rooms(nhfp); /* no dynamic memory to reclaim */

    /* from here on out, saving also involves allocated memory cleanup */
    }

    /* timers and lights must be saved before monsters and objects */
    C.save_timers(nhfp, C.RANGE_LEVEL);
    C.save_light_sources(nhfp, C.RANGE_LEVEL);

    savemonchn(nhfp, C.fmon);
    C.save_worm(nhfp); /* save worm information */
    savetrapchn(nhfp, C.gf.ftrap);
    saveobjchn(nhfp, C.fieldPointer(C.svl.level, "objlist"));
    saveobjchn(nhfp, C.fieldPointer(C.svl.level, "buriedobjlist"));
    saveobjchn(nhfp, C.fieldPointer(C.gb, "billobjs"));
    C.save_engravings(nhfp);
    savedamage(nhfp); /* pending shop wall and/or floor repair */
    C.save_regions(nhfp);
    save_bubbles(nhfp, lev); /* for water and air */
    C.save_exclusions(nhfp);
    C.save_track(nhfp);

    if (nhfp.mode != C.FREEING) {
        if (nhfp.structlevel)
            C.bflush(nhfp.fd);
    }
    C.program_state.saving--;
    if (C.release_data(nhfp)) {
        C.clear_level_structures();
        C.gf.ftrap = 0;
        C.gb.billobjs = 0;
        C.memset(C.svr.rooms, 0, C.sizeof(C.svr.rooms));
    }
    return;
}

export function save_adjust_levelflags()
{
    /* adjust any timestamps */
    C.moves_to_relative_time(C.addressOf(C.svl.level.flags, "stasis_until"));
}

export function savelevl(nhfp)
{
    let x, y;

    for (x = 0; x < C.COLNO; x++) {
        for (y = 0; y < C.ROWNO; y++) {
            C.Sfo_rm(nhfp, C.levl[x][y], "location-rm");
        }
    }
    return;
}

/* save Plane of Water's air bubbles and Plane of Air's clouds */
export function save_bubbles(nhfp, lev)
{
    lev = C.xint8(lev);
    let bbubbly;

    /* air bubbles and clouds used to be saved as part of game state
       because restoring them needs dungeon data that isn't available
       during the first pass of their levels; now that they are part of
       the current level instead, we write a zero or non-zero marker
       so that restore can determine whether they are present even when
       u.uz and ledger_no() aren't available to it yet */
    bbubbly = 0;
    if (lev == C.ledger_no(C.water_level) || lev == C.ledger_no(C.air_level))
        bbubbly = lev; /* non-zero */
    if (C.update_file(nhfp))
        C.Sfo_xint8(nhfp, C.reference("xint8", () => bbubbly, value => bbubbly = value), "bubbles-bbubbly");

    if (bbubbly)
        C.save_waterlevel(nhfp); /* save air bubbles or clouds */
}

/* used when saving a level and also when saving dungeon overview data */
export function savecemetery(nhfp, cemeteryaddr)
{
    let thisbones, nextbones;
    let flag;

    flag = cemeteryaddr.value ? 0 : -1;
    if (C.update_file(nhfp)) {
        C.Sfo_int(nhfp, C.reference("int", () => flag, value => flag = value), "cemetery-cemetery_flag");
    }
    nextbones = cemeteryaddr.value;
    while ((thisbones = nextbones) != 0) {
        nextbones = thisbones.next;
        if (C.update_file(nhfp)) {
            C.Sfo_cemetery(nhfp, thisbones, "cemetery-bonesinfo");
        }
        if (C.release_data(nhfp))
            C.free(thisbones);
    }
    if (C.release_data(nhfp))
        cemeteryaddr.value = 0;
}

export function savedamage(nhfp)
{
    let damageptr, tmp_dam;
    let xl = 0;

    damageptr = C.svl.level.damagelist;
    for (tmp_dam = damageptr; tmp_dam; tmp_dam = tmp_dam.next)
        xl++;
    if (C.update_file(nhfp)) {
        C.Sfo_unsigned(nhfp, C.reference("unsigned", () => xl, value => xl = value), "damage-damage_count");
    }
    while (damageptr) {
        if (C.update_file(nhfp)) {
            C.Sfo_damage(nhfp, damageptr, "damage");
        }
        tmp_dam = damageptr;
        damageptr = damageptr.next;
        if (C.release_data(nhfp))
            C.free(tmp_dam);
    }
    if (C.release_data(nhfp))
        C.svl.level.damagelist = 0;
}

export function save_stairs(nhfp)
{
    let stway = C.gs.stairs;
    let buflen = C.sizes.stairway;

    while (stway) {
        if (C.update_file(nhfp)) {
            let use_relative = (C.program_state.restoring != C.REST_GSTATE
                                    && stway.tolev.dnum == C.u.uz.dnum);
            if (use_relative) {
                /* make dlevel relative to current level */
                stway.tolev.dlevel -= C.u.uz.dlevel;
            }
            C.Sfo_int(nhfp, C.reference("int", () => buflen, value => buflen = value), "stairs-staircount");
            C.Sfo_stairway(nhfp, stway, "stairs-stairway");
            if (use_relative) {
                /* reset stairway dlevel back to absolute */
                stway.tolev.dlevel += C.u.uz.dlevel;
            }
        }
        stway = stway.next;
    }
    if (C.update_file(nhfp)) {
        buflen = -1;
        C.Sfo_int(nhfp, C.reference("int", () => buflen, value => buflen = value), "stairs-staircount");
    }
}

/* if ball and/or chain are loose, make an object chain for it/them and
   save that separately from other objects */
export function save_bc(nhfp)
{
    let bc_objs = 0;

    /* save ball and chain if they are currently dangling free (i.e. not
       on floor or in inventory); 'looseball' and 'loosechain' have been
       set up in caller because ball and chain will be gone by now if on
       floor, or ball gone if carried */
    if (C.gl.loosechain) {
        C.gl.loosechain.nobj = bc_objs; /* uchain */
        bc_objs = C.gl.loosechain;
        if (nhfp.mode & C.FREEING) {
            C.setworn(0, C.W_CHAIN); /* sets 'uchain' to Null */
            C.gl.loosechain = 0;
        }
    }
    if (C.gl.looseball) {
        C.gl.looseball.nobj = bc_objs;
        bc_objs = C.gl.looseball;
        if (nhfp.mode & C.FREEING) {
            C.setworn(0, C.W_BALL); /* sets 'uball' to Null */
            C.gl.looseball = 0;
        }
    }
    saveobjchn(nhfp, C.localPointer(() => bc_objs, value => bc_objs = value)); /* frees objs in list, sets bc_objs to Null */
}

/* save one object;
   caveat: this is only for update_file(); caller handles release_data() */
export function saveobj(nhfp, otmp)
{
    let buflen, zerobuf = 0;

    buflen = C.sizes.obj;
    C.Sfo_int(nhfp, C.reference("int", () => buflen, value => buflen = value), "obj-obj_length");
    C.Sfo_obj(nhfp, otmp, "obj");
    if (otmp.oextra) {
        buflen = C.ONAME(otmp) ? C.strlen(C.ONAME(otmp)) + 1 : 0;
        C.Sfo_int(nhfp, C.reference("int", () => buflen, value => buflen = value), "obj-oname_length");

        if (buflen > 0) {
            C.Sfo_char(nhfp, C.ONAME(otmp), "obj-oname", buflen);
        }
        /* defer to savemon() for this one */
        if (C.OMONST(otmp)) {
            savemon(nhfp, C.OMONST(otmp));
        } else {
            C.Sfo_int(nhfp, C.reference("int", () => zerobuf, value => zerobuf = value), "obj-omonst_length");
        }
        /* extra info about scroll of mail */
        buflen = C.OMAILCMD(otmp) ? C.strlen(C.OMAILCMD(otmp)) + 1 : 0;
        C.Sfo_int(nhfp, C.reference("int", () => buflen, value => buflen = value), "obj-omailcmd_length");
        if (buflen > 0) {
            C.Sfo_char(nhfp, C.OMAILCMD(otmp), "obj-omailcmd", buflen);
        }
        /* omid used to be indirect via a pointer in oextra but has
           become part of oextra itself; 0 means not applicable and
           gets saved/restored whenever any other oextra components do */
        C.Sfo_unsigned(nhfp, C.addressOf(otmp.oextra, "omid"), "obj-omid");
    }
}

/* save an object chain; sets head of list to Null when done;
   handles release_data() for each object in the list */
export function saveobjchn(nhfp, obj_p)
{
    let otmp = obj_p.value;
    let otmp2;
    let is_invent = (otmp && otmp == C.gi.invent);
    let minusone = -1;

    while (otmp) {
        otmp2 = otmp.nobj;
        if (C.update_file(nhfp)) {
            saveobj(nhfp, otmp);
        }
        if (C.Has_contents(otmp))
            saveobjchn(nhfp, C.fieldPointer(otmp, "cobj"));
        if (C.release_data(nhfp)) {
            /*
             * If these are on the floor, the discarding could be
             * due to game save, or we could just be changing levels.
             * Always invalidate the pointer, but ensure that we have
             * the o_id in order to restore the pointer on reload.
             */
            if (otmp == C.svc.context.victual.piece) {
                C.svc.context.victual.o_id = otmp.o_id;
                C.svc.context.victual.piece = 0;
            }
            if (otmp == C.svc.context.tin.tin) {
                C.svc.context.tin.o_id = otmp.o_id;
                C.svc.context.tin.tin = 0;
            }
            if (otmp == C.svc.context.spbook.book) {
                C.svc.context.spbook.o_id = otmp.o_id;
                C.svc.context.spbook.book = 0;
            }
            otmp.where = C.OBJ_FREE; /* set to free so dealloc will work */
            otmp.nobj = 0;      /* nobj saved into otmp2 */
            otmp.cobj = 0;      /* contents handled above */
            otmp.timed = 0;        /* not timed any more */
            otmp.lamplit = 0;      /* caller handled lights */
            otmp.leashmon = 0;     /* mon->mleashed could still be set;
                                     * unfortunately, we can't clear that
                                     * until after the monster is saved */
            /* clear 'uball' and 'uchain' pointers if resetting their mask;
               could also do same for other worn items but don't need to */
            if ((otmp.owornmask & (C.W_BALL | C.W_CHAIN)) != 0)
                C.setworn(0,
                        otmp.owornmask & (C.W_BALL | C.W_CHAIN));
            otmp.owornmask = 0n;   /* no longer care */
            C.program_state.freeingdata++;
            C.dealloc_obj(otmp);
            C.program_state.freeingdata--;
        }
        otmp = otmp2;
    }
    if (C.update_file(nhfp)) {
        C.Sfo_int(nhfp, C.reference("int", () => minusone, value => minusone = value), "obj-obj_length");
    }
    if (C.release_data(nhfp)) {
        if (is_invent)
            C.allunworn(); /* clear uwep, uarm, uball, &c pointers */
        obj_p.value = 0;
    }
}

export function savemon(nhfp, mtmp)
{
    let buflen;

    mtmp.mtemplit = 0; /* normally clear; if set here then a panic save
                         * is being written while bhit() was executing */
    buflen = C.sizes.monst;
    C.Sfo_int(nhfp, C.reference("int", () => buflen, value => buflen = value), "monst-monst_length");
    C.Sfo_monst(nhfp, mtmp, "monst");
    if (mtmp.mextra) {
        buflen = C.MGIVENNAME(mtmp) ? C.strlen(C.MGIVENNAME(mtmp)) + 1 : 0;
        C.Sfo_int(nhfp, C.reference("int", () => buflen, value => buflen = value), "monst-mgivenname_length");
        if (buflen > 0) {
            C.Sfo_char(nhfp, C.MGIVENNAME(mtmp), "monst-mgivenname", buflen);
        }
        buflen = C.EGD(mtmp) ? C.sizes.egd : 0;
        C.Sfo_int(nhfp, C.reference("int", () => buflen, value => buflen = value), "monst-egd_length");
        if (buflen > 0) {
            C.Sfo_egd(nhfp, C.EGD(mtmp), "monst-egd");
        }
        buflen = C.EPRI(mtmp) ? C.sizes.epri : 0;
        C.Sfo_int(nhfp, C.reference("int", () => buflen, value => buflen = value), "monst-epri_length");
        if (buflen > 0) {
            C.Sfo_epri(nhfp, C.EPRI(mtmp), "monst-epri");
        }
        buflen = C.ESHK(mtmp) ? C.sizes.eshk : 0;
        C.Sfo_int(nhfp, C.reference("int", () => buflen, value => buflen = value), "monst-eshk_length");
        if (buflen > 0) {
            C.Sfo_eshk(nhfp, C.ESHK(mtmp), "monst-eshk");
        }
        buflen = C.EMIN(mtmp) ? C.sizes.emin : 0;
        C.Sfo_int(nhfp, C.reference("int", () => buflen, value => buflen = value), "monst-emin_length");
        if (buflen > 0) {
            C.Sfo_emin(nhfp, C.EMIN(mtmp), "monst-emin");
        }
        buflen = C.EDOG(mtmp) ? C.sizes.edog : 0;
        C.Sfo_int(nhfp, C.reference("int", () => buflen, value => buflen = value), "monst-edog_length");
        if (buflen > 0) {
            /* we only store relative times in save and bones */
            C.moves_to_relative_time(C.addressOf(C.EDOG(mtmp), "droptime"));
            C.moves_to_relative_time(C.addressOf(C.EDOG(mtmp), "hungrytime"));
            C.Sfo_edog(nhfp, C.EDOG(mtmp), "monst-edog");
            C.relative_time_to_moves(C.addressOf(C.EDOG(mtmp), "droptime"));
            C.relative_time_to_moves(C.addressOf(C.EDOG(mtmp), "hungrytime"));
        }
        buflen = C.EBONES(mtmp) ? C.sizes.ebones : 0;
        C.Sfo_int(nhfp, C.reference("int", () => buflen, value => buflen = value), "monst-ebones_length");
        if (buflen > 0) {
            C.Sfo_ebones(nhfp, C.EBONES(mtmp), "monst-ebones");
        }
        /* mcorpsenm is inline int rather than pointer to something,
           so doesn't need to be preceded by a length field */
        buflen = C.MCORPSENM(mtmp);
        C.Sfo_int(nhfp, C.reference("int", () => buflen, value => buflen = value), "monst-mcorpsenm");
    }
}

export function savemonchn(nhfp, mtmp)
{
    let mtmp2;
    let minusone = -1;

    while (mtmp) {
        mtmp2 = mtmp.nmon;
        if (C.update_file(nhfp)) {
            mtmp.mnum = C.monsndx(mtmp.data);
            if (mtmp.ispriest)
                C.forget_temple_entry(mtmp); /* EPRI() */
            savemon(nhfp, mtmp);
        }
        if (mtmp.minvent)
            saveobjchn(nhfp, C.fieldPointer(mtmp, "minvent"));
        if (C.release_data(nhfp)) {
            if (mtmp == C.svc.context.polearm.hitmon) {
                C.svc.context.polearm.m_id = mtmp.m_id;
                C.svc.context.polearm.hitmon = 0;
            }
            if (mtmp == C.u.ustuck)
                C.u.ustuck_mid = C.u.ustuck.m_id;
            if (mtmp == C.u.usteed)
                C.u.usteed_mid = C.u.usteed.m_id;
            mtmp.nmon = 0;  /* nmon saved into mtmp2 */
            C.dealloc_monst(mtmp);
        }
        mtmp = mtmp2;
    }
    if (C.update_file(nhfp)) {
        C.Sfo_int(nhfp, C.reference("int", () => minusone, value => minusone = value), "monst-monst_length");
    }
}

/* save traps; gf.ftrap is the only trap chain so 2nd arg is superfluous */
export function savetrapchn(nhfp, trap)
{
    const zerotrap = C.zerotrap;
    let trap2;

    while (trap) {
        let use_relative = (C.program_state.restoring != C.REST_GSTATE
                                && trap.dst.dnum == C.u.uz.dnum);
        trap2 = trap.ntrap;
        if (use_relative)
            trap.dst.dlevel -= C.u.uz.dlevel; /* make it relative */
        if (C.update_file(nhfp)) {
            C.Sfo_trap(nhfp, trap, "trap");
        }
        if (use_relative)
            trap.dst.dlevel += C.u.uz.dlevel; /* reset back to absolute */
        if (C.release_data(nhfp))
            C.dealloc_trap(trap);
        trap = trap2;
    }
    if (C.update_file(nhfp)) {
        C.Sfo_trap(nhfp, zerotrap, "trap");
    }
}

/* save all the fruit names and ID's; this is used only in saving whole games
 * (not levels) and in saving bones levels.  When saving a bones level,
 * we only want to save the fruits which exist on the bones level; the bones
 * level routine marks nonexistent fruits by making the fid negative.
 */
export function savefruitchn(nhfp)
{
    const zerofruit = C.zerofruit;
    let f2, f1;

    f1 = C.gf.ffruit;
    while (f1) {
        f2 = f1.nextf;
        if (f1.fid >= 0 && C.update_file(nhfp)) {
            C.Sfo_fruit(nhfp, f1, "fruit");
        }
        if (C.release_data(nhfp))
            C.dealloc_fruit(f1);
        f1 = f2;
    }
    if (C.update_file(nhfp)) {
        C.Sfo_fruit(nhfp, zerofruit, "fruit");
    }
    if (C.release_data(nhfp))
        C.gf.ffruit = 0;
}

export function savelevchn(nhfp)
{
    let tmplev, tmplev2;
    let cnt = 0;

    for (tmplev = C.svs.sp_levchn; tmplev; tmplev = tmplev.next)
        cnt++;
    if (C.update_file(nhfp)) {
        C.Sfo_int(nhfp, C.reference("int", () => cnt, value => cnt = value), "levchn-lev_count");
    }
    for (tmplev = C.svs.sp_levchn; tmplev; tmplev = tmplev2) {
        tmplev2 = tmplev.next;
        if (C.update_file(nhfp)) {
            C.Sfo_s_level(nhfp, tmplev, "levchn-s_level");
        }
        if (C.release_data(nhfp))
            C.free(tmplev);
    }
    if (C.release_data(nhfp))
        C.svs.sp_levchn = 0;
}

/* write "name-role-race-gend-algn" into save file for menu-based restore;
   the first dash is actually stored as '\0' instead of '-' */
export function store_plname_in_file(nhfp)
{
    const hero = C.stackAlloc(C.PL_NSIZ_PLUS); /* [PL_NSIZ + 4*(1+3) + 1] */
    let plsiztmp = C.PL_NSIZ_PLUS;

    C.memset(hero, 0, C.PL_NSIZ_PLUS);
    /* augment svp.plname[]; the gender and alignment values reflect those
       in effect at time of saving rather than at start of game */
    C.Snprintf(hero, C.PL_NSIZ_PLUS, "%s-%.3s-%.3s-%.3s-%.3s",
            C.svp.plname, C.gu.urole.filecode,
            C.gu.urace.filecode, C.genders[C.flags.female].filecode,
            C.aligns[1 - C.u.ualign.type].filecode);
    /* replace "-role-race..." with "\0role-race..." so that we can include
       or exclude the role-&c suffix easily, without worrying about whether
       plname contains any dashes; but don't rely on snprintf() for this */
    C.storeChar(hero + C.int(C.strlen(C.svp.plname)), 0);
    /* insert playmode into final slot of hero[];
       'D','X','-' are the same characters as are used for paniclog entries */
    C.assert(C.loadChar(hero + C.PL_NSIZ_PLUS - 1 - 1) == 0);
    C.storeChar(hero + C.PL_NSIZ_PLUS - 1, C.wizard ? 68 : C.discover ? 88 : 45);

    if (nhfp.structlevel)
        C.bufoff(nhfp.fd);  /* bwrite() before bufon() uses plain write() */
    C.Sfo_int(nhfp, C.reference("int", () => plsiztmp, value => plsiztmp = value), "plname-size");
    C.Sfo_char(nhfp, hero, "plname", plsiztmp);
    if (nhfp.structlevel)
        C.bufon(nhfp.fd);
    return;
}

export function save_msghistory(nhfp)
{
    let msg;
    let msgcount = 0;
    let minusone = -1, msglen;
    let init = 1;

    if (C.update_file(nhfp)) {
        /* ask window port for each message in sequence */
        while ((msg = C.getmsghistory(init)) != 0) {
            init = 0;
            msglen = C.Strlen(msg, 1);
            if (msglen < 1)
                continue;
            /* sanity: truncate if necessary (shouldn't happen);
               no need to modify msg[] since terminator isn't written */
            if (msglen > C.BUFSZ - 1)
                msglen = C.BUFSZ - 1;
            C.Sfo_int(nhfp, C.reference("int", () => msglen, value => msglen = value), "msghistory-length");
            C.Sfo_char(nhfp, msg, "msghistory-msg", msglen);
            ++msgcount;
        }
        C.Sfo_int(nhfp, C.reference("int", () => minusone, value => minusone = value), "msghistory-length");
    }
    C.debugpline1("Stored %d messages into savefile.", msgcount);
    /* note: we don't attempt to handle release_data() here */
}

/* also called by prscore(); this probably belongs in dungeon.c... */
export function free_dungeons()
{
    let tnhfp = C.get_freeing_nhfile();

    savelevchn(tnhfp);
    C.save_dungeon(tnhfp, 0, 1);
    C.free_luathemes(C.all_themes);
    C.close_nhfile(tnhfp);
    return;
}

 /* options.c */

/* free a lot of allocated memory which is ordinarily freed during save */
export function freedynamicdata()
{
    let tnhfp = C.get_freeing_nhfile();

    C.free_maildata();
    C.free_menu_coloring();
    C.free_invbuf();           /* let_to_name (invent.c) */
    C.free_youbuf();           /* You_buf,&c (pline.c) */
    C.msgtype_free();
    C.savedsym_free();
    C.tmp_at(C.DISP_FREEMEM, 0); /* temporary display effects */
    C.purge_all_custom_entries();
/* #define free_current_level() savelev(tnhfp, -1) */
/* #define freeobjchn(X) (saveobjchn(tnhfp, &X), X = 0) */
/* #define freemonchn(X) (savemonchn(tnhfp, X), X = 0) */
/* #define savefruitchn(tnhfp) savefruitchn(tnhfp) */
/* #define savenames(tnhfp) savenames(tnhfp) */
/* #define save_killers(tnhfp) save_killers(tnhfp) */
/* #define save_oracles(tnhfp) save_oracles(tnhfp) */
/* #define save_waterlevel(tnhfp) save_waterlevel(tnhfp) */
/* #define save_timers(tnhfp, R) save_timers(tnhfp, R) */
/* #define save_light_sources(tnhfp, R) save_light_sources(tnhfp, R) */
/* #define mon_animal_list(FALSE) mon_animal_list(FALSE) */
/* #define save_gamelog(tnhfp) save_gamelog(tnhfp); */

    /* move-specific data */
    C.dmonsfree(); /* release dead monsters */
    /* dobjsfree(); // handled below */
    C.alloc_itermonarr(0); /* a request of 0 releases existing allocation */

    /* level-specific data */
    C.done_object_cleanup(); /* maybe force some OBJ_FREE items onto map */
    savelev(tnhfp, -1);

    /* game-state data [ought to reorganize savegamestate() to handle this] */
    C.save_killers(tnhfp);
    C.save_timers(tnhfp, C.RANGE_GLOBAL);
    C.save_light_sources(tnhfp, C.RANGE_GLOBAL);
    saveobjchn(tnhfp, C.fieldPointer(C.gi, "invent")); C.gi.invent = 0;
    saveobjchn(tnhfp, C.fieldPointer(C.gm, "migrating_objs")); C.gm.migrating_objs = 0;
    savemonchn(tnhfp, C.gm.migrating_mons); C.gm.migrating_mons = 0;
    savemonchn(tnhfp, C.gm.mydogs); C.gm.mydogs = 0; /* ascension or dungeon escape */
    /* freelevchn();  --  [folded into free_dungeons()] */
    C.mon_animal_list(0);
    C.save_oracles(tnhfp);
    savefruitchn(tnhfp);
    C.savenames(tnhfp);
    C.save_waterlevel(tnhfp);
    free_dungeons();
    C.free_CapMons();
    C.free_rect();
    C.freeroleoptvals(); /* saveoptvals(&tnhfp) */
    C.cmdq_clear(C.CQ_CANNED);
    C.cmdq_clear(C.CQ_REPEAT);
    C.cmdbind_freeall();
    C.free_tutorial(); /* (only needed if quitting while in tutorial) */
    C.wish_history_flush();

    /* per-turn data, but might get added to when freeing other stuff */
    C.dobjsfree(); /* really free deleted objects */

    /* some pointers in iflags */
    if (C.iflags.wc_font_map)
        C.free(C.iflags.wc_font_map), C.iflags.wc_font_map = 0;
    if (C.iflags.wc_font_message)
        C.free(C.iflags.wc_font_message),
        C.iflags.wc_font_message = 0;
    if (C.iflags.wc_font_text)
        C.free(C.iflags.wc_font_text), C.iflags.wc_font_text = 0;
    if (C.iflags.wc_font_menu)
        C.free(C.iflags.wc_font_menu), C.iflags.wc_font_menu = 0;
    if (C.iflags.wc_font_status)
        C.free(C.iflags.wc_font_status), C.iflags.wc_font_status = 0;
    if (C.iflags.wc_tile_file)
        C.free(C.iflags.wc_tile_file), C.iflags.wc_tile_file = 0;
    C.free_autopickup_exceptions();

    /* miscellaneous */
    /* free_pickinv_cache();  --  now done from really_done()... */
    C.free_symsets();
    C.dumplogfreemessages();
    save_gamelog(tnhfp);
    C.release_runtime_info(); /* build-time options and version stuff */
    C.free_convert_filenames();
/* FREE_ALL_MEMORY */    C.free_nhuuid();

    if (C.VIA_WINDOWPORT())
        C.status_finish();

    if (C.options_set_window_colors_flag)
        C.options_free_window_colors();

    if (C.glyphid_cache_status())
        C.free_glyphid_cache();

    if (tnhfp) {
        C.close_nhfile(tnhfp);
        tnhfp = 0;
    }

    /* last, because it frees data that might be used by panic() to provide
       feedback to the user; conceivably other freeing might trigger panic */
    C.sysopt_release(); /* SYSCF strings */
}

/*save.c*/
