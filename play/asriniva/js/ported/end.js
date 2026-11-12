import { C } from '../c-runtime/context.js';
/* NetHack 5.0	end.c	$NHDT-Date: 1720397752 2024/07/08 00:15:52 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.315 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Robert Patrick Rankin, 2012. */
/* NetHack may be freely redistributed.  See license for details. */

/* comment line for pre-compiled headers */

/* for NOMUX_CAPTURE define + nomux_capture_write_input_boundary decl (#460) */












/* SFCTOOL */




/*
 * The order of these needs to match the macros in hack.h.
 */
export const deaths = [
    /* the array of death */
    "died", "choked", "poisoned", "starvation", "drowning", "burning",
    "dissolving under the heat and pressure", "crushed", "turned to stone",
    "turned into slime", "genocided", "panic", "trickery", "quit",
    "escaped", "ascended"
];

export const ends = [
    /* "when you %s" */
    "died", "choked", "were poisoned",
    "starved", "drowned", "burned",
    "dissolved in the lava",
    "were crushed", "turned to stone",
    "turned into slime", "were genocided",
    "panicked", "were tricked", "quit",
    "escaped", "ascended"
];



/* called as signal() handler, so sent at least one arg */
/*ARGSUSED*/

export function done1(sig_unused)
{
    C.signal(C.SIGINT, C.SIG_IGN);
    C.iflags.debug_fuzzer = C.fuzzer_off;
    if (C.flags.ignintr) {
        C.signal(C.SIGINT, done1);
        C.clear_nhwindow(C.WIN_MESSAGE);
        C.curs_on_u();
        C.wait_synch();
        if (C.gm.multi > 0)
            C.nomul(0);
    } else {
        done2();
    }
}

/* "#quit" command or keyboard interrupt */

export function done2()
{
    let abandon_tutorial = 0;

    if (C.In_tutorial(C.u.uz)
        && C.y_n("Switch from the tutorial back to regular play?") == 121)
        abandon_tutorial = 1;

    if (abandon_tutorial || !C.paranoid_query(
            C.ParanoidQuit, "Really quit without saving?")) {
        C.signal(C.SIGINT, done1);
        C.clear_nhwindow(C.WIN_MESSAGE);
        C.curs_on_u();
        C.wait_synch();
        if (C.gm.multi > 0)
            C.nomul(0);
        if (C.gm.multi == 0) {
            C.u.uinvulnerable = 0; /* avoid ctrl-C bug -dlc */
            C.u.usleep = 0;
        }

        if (abandon_tutorial)
            C.schedule_goto(C.u.ucamefrom, C.UTOTYPE_ATSTAIRS,
                          "Resuming regular play.", 0);
        return C.ECMD_OK;
    }

    if (C.wizard) {
        let c;
/* sys/vms/vmsmisc.c, vmsunix.c */
        c = C.ynq("Dump core?");
        if (c == 121) {
            C.signal(C.SIGINT, done1);
            if (C.soundprocs.sound_exit_nhsound)
                C.soundExit("done2");

            C.exit_nhwindows(0);
            NH_abort(0);
        } else if (c == 113)
            C.program_state.stopprint++;
    }
    C.callLocal(done, C.QUIT);
    return C.ECMD_OK;
}

/* called as signal() handler, so sent at least 1 arg */
/*ARGSUSED*/

export function done_intr(sig_unused)
{
    C.program_state.stopprint++;
    C.signal(C.SIGINT, C.SIG_IGN);
    C.signal(C.SIGQUIT, C.SIG_IGN);
    return;
}

/* signal() handler */

export function done_hangup(sig)
{
    C.program_state.done_hup++;
    C.sethanguphandler(C.SIG_IGN);
    done_intr(sig);
    return;
}
/* NO_SIGNAL */

/* one compiler warns if the format
                                     string is the result of a ? x : y */


export function done_in_by(mtmp, how)
{
    let buf = C.stackAlloc(C.BUFSZ);
    let mptr = mtmp.data, champtr = C.ismnum(mtmp.cham) ? C.mons[mtmp.cham]
                                                  : mptr;
    let distorted = Number(Boolean(C.Hallucination && C.canspotmon(mtmp))),
            mimicker = (C.M_AP_TYPE(mtmp) == C.M_AP_MONSTER),
            imitator = (!C.samePtr(mptr, champtr) || mimicker);

    C.You((how == C.STONING) ? "turn to stone..." : "die...");
    C.mark_synch(); /* flush buffered screen output */
    C.byte(buf + (0)).value = 0;
    C.svk.killer.format = C.KILLED_BY_AN;
    /* "killed by the high priest of Crom" is okay,
       "killed by the high priest" alone isn't */
    if ((mptr.geno & C.G_UNIQ) != 0 && !(imitator && !mimicker)
        && !(C.samePtr(mptr, C.mons[C.PM_HIGH_CLERIC]) && !mtmp.ispriest)) {
        if (!C.type_is_pname(mptr))
            C.Strcat(buf, "the ");
        C.svk.killer.format = C.KILLED_BY;
    }
    /* _the_ <invisible> <distorted> ghost of Dudley */
/* hardfought */
    if (C.samePtr(mptr, C.mons[C.PM_GHOST]) && C.has_mgivenname(mtmp)) {
        C.Strcat(buf, "the ");
        C.svk.killer.format = C.KILLED_BY;
    }
    C.monhealthdescr(mtmp, 1, C.eos(buf));
    if (mtmp.minvis)
        C.Strcat(buf, "invisible ");
    if (distorted)
        C.Strcat(buf, "hallucinogen-distorted ");

    if (imitator) {
        let shape = C.stackAlloc(C.BUFSZ);
        let realnm = C.pmname(champtr, C.Mgender(mtmp)), fakenm = C.pmname(mptr, C.Mgender(mtmp));
        let alt = C.is_vampshifter(mtmp);

        if (mimicker) {
            /* realnm is already correct because champtr==mptr;
               set up fake mptr for type_is_pname/the_unique_pm */
            mptr = C.mons[mtmp.mappearance];
            fakenm = C.pmname(mptr, C.Mgender(mtmp));
        } else if (alt && C.strstri(realnm, "vampire")
                   && !C.strcmp(fakenm, "vampire bat")) {
            /* special case: use "vampire in bat form" in preference
               to redundant looking "vampire in vampire bat form" */
            fakenm = "bat";
        }
        /* for the alternate format, always suppress any article;
           pname and the_unique should also have s_suffix() applied,
           but vampires don't take on any shapes which warrant that */
        if (alt || C.type_is_pname(mptr)) /* no article */
            C.Strcpy(shape, fakenm);
        else if (C.the_unique_pm(mptr)) /* "the"; don't use the() here */
            C.Sprintf(shape, "the %s", fakenm);
        else /* "a"/"an" */
            C.Strcpy(shape, C.an(fakenm));
        /* omit "called" to avoid excessive verbosity */
        C.Sprintf(C.eos(buf),
                alt ? "%s in %s form"
                    : mimicker ? "%s disguised as %s"
                               : "%s imitating %s",
                realnm, shape);
        mptr = mtmp.data; /* reset for mimicker case */
/* hardfought */
    } else if (C.samePtr(mptr, C.mons[C.PM_GHOST])) {
        C.Strcat(buf, "ghost");
        if (C.has_mgivenname(mtmp))
            C.Sprintf(C.eos(buf), " of %s", C.MGIVENNAME(mtmp));
    } else if (mtmp.isshk) {
        let shknm = C.shkname(mtmp), honorific = C.shkname_is_pname(mtmp) ? ""
                                   : mtmp.female ? "Ms. " : "Mr. ";

        C.Sprintf(C.eos(buf), "%s%s, the shopkeeper", honorific, shknm);
        C.svk.killer.format = C.KILLED_BY;
    } else if (mtmp.ispriest || mtmp.isminion) {
        /* m_monnam() suppresses "the" prefix plus "invisible", and
           it overrides the effect of Hallucination on priestname() */
        C.Strcat(buf, C.m_monnam(mtmp));
    } else {
        C.Strcat(buf, C.pmname(mptr, C.Mgender(mtmp)));
        if (C.has_mgivenname(mtmp)) {
            C.Sprintf(C.eos(buf), " %s %s",
                    C.has_ebones(mtmp) ? "of" : "called",
                    C.MGIVENNAME(mtmp));
        }
    }

    C.Strcpy(C.svk.killer.name, buf);

    /* might need to fix up multi_reason if 'mtmp' caused the reason */
    if (C.gm.multi_reason
        && C.gm.multi_reason > C.gm.multireasonbuf
        && C.gm.multi_reason
           < C.gm.multireasonbuf + C.MultiReasonSize - 1) {
        const reasondummy = C.charLocal(); let p;
        const reasonmid = C.uintLocal(0);

        /*
         * multireasonbuf[] contains 'm_id:reason' and multi_reason
         * points at the text past the colon, so we have something
         * like "42:paralyzed by a ghoul"; if mtmp->m_id matches 42
         * then we truncate 'reason' at its first space so that final
         * death reason becomes "Killed by a ghoul, while paralyzed."
         * instead of "Killed by a ghoul, while paralyzed by a ghoul."
         * (3.6.x gave "Killed by a ghoul, while paralyzed by a monster."
         * which is potentially misleading when the monster is also
         * the killer.)
         *
         * Note that if the hero is life-saved and then killed again
         * before the helplessness has cleared, the second death will
         * report the truncated helplessness reason even if some other
         * monster performs the /coup de grace/.
         */
        if (C.sscanf(C.gm.multireasonbuf, "%u:%c", reasonmid, reasondummy) == 2
            && mtmp.m_id == reasonmid.value) {
            if ((p = C.strchr(C.gm.multireasonbuf, 32)) != 0)
                C.storeChar(p, 0);
        }
    }

    /*
     * Chicken and egg issue:
     *  Ordinarily Unchanging ought to override something like this,
     *  but the transformation occurs at death.  With the current code,
     *  the effectiveness of Unchanging stops first, but a case could
     *  be made that it should last long enough to prevent undead
     *  transformation.  (Turning to slime isn't an issue here because
     *  Unchanging prevents that from happening.)
     */
    if (mptr.mlet == C.S_WRAITH)
        C.u.ugrave_arise = C.PM_WRAITH;
    else if (mptr.mlet == C.S_MUMMY && C.gu.urace.mummynum != C.NON_PM)
        C.u.ugrave_arise = C.gu.urace.mummynum;
    else if (C.zombie_maker(mtmp) && C.gu.urace.zombienum != C.NON_PM)
        C.u.ugrave_arise = C.gu.urace.zombienum;
    else if (mptr.mlet == C.S_VAMPIRE && C.Race_if(C.PM_HUMAN))
        C.u.ugrave_arise = C.PM_VAMPIRE;
    else if (C.samePtr(mptr, C.mons[C.PM_GHOUL]))
        C.u.ugrave_arise = C.PM_GHOUL;
    /* this could happen if a high-end vampire kills the hero
       when ordinary vampires are genocided; ditto for wraiths */
    if (C.u.ugrave_arise >= C.LOW_PM
        && (C.svm.mvitals[C.u.ugrave_arise].mvflags & C.G_GENOD))
        C.u.ugrave_arise = C.NON_PM;

    C.callLocal(done, how);
    return;
}

/* some special cases for overriding while-helpless reason */
export const death_fixups = [

    /* "petrified by <foo>, while getting stoned" -- "while getting stoned"
       prevented any last-second recovery, but it was not the cause of
       "petrified by <foo>" */
    {why: "STONING", unmulti: 1, exclude: "getting stoned", include: 0},
    /* "died of starvation, while fainted from lack of food" is accurate
       but sounds a fairly silly (and doesn't actually appear unless you
       splice together death and while-helpless from xlogfile) */
    {why: "STARVING", unmulti: 0, exclude: "fainted from lack of food", include: "fainted"},
];

/* clear away while-helpless when the cause of death caused that
   helplessness (ie, "petrified by <foo> while getting stoned") */

export function fixup_death(how)
{
    let i;

    if (C.gm.multi_reason) {
        for (i = 0; i < death_fixups.length; ++i)
            if (C[death_fixups[i].why] == how
                && !C.strcmp(death_fixups[i].exclude, C.gm.multi_reason)) {
                if (death_fixups[i].include) /* substitute alternate reason */
                    C.gm.multi_reason = death_fixups[i].include;
                else /* remove the helplessness reason */
                    C.gm.multi_reason = 0;
                C.byte(C.gm.multireasonbuf + (0)).value = 0; /* dynamic buf stale either way */
                if (death_fixups[i].unmulti) /* possibly hide helplessness */
                    C.gm.multi = 0n;
                break;
            }
    }
}

/*VARARGS1*/

export function panic(str)
{
    let buf = C.stackAlloc(C.BUFSZ);
    
    

    if (C.program_state.panicking++)
        NH_abort(0); /* avoid loops - this should never happen*/

    C.gb.bot_disabled = 1;
    if (C.iflags.window_inited) {
        C.raw_print("\r\nOops...");
        C.wait_synch(); /* make sure all pending output gets flushed */
        if (C.soundprocs.sound_exit_nhsound)
            C.soundExit("panic");
        C.exit_nhwindows(0);
        C.iflags.window_inited = 0; /* they're gone; force raw_print()ing */
    }

    C.raw_print(C.program_state.gameover
                  ? "Postgame wrapup disrupted."
                  : !C.program_state.something_worth_saving
                        ? "Program initialization has failed."
                        : "Suddenly, the dungeon collapses.");
/* !NOTIFY_NETHACK_BUGS */
    if (!C.wizard) {
        let maybe_rebuild = !C.program_state.something_worth_saving
                                     ? "."
                                     : "\nand it may be possible to rebuild.";

// XXX this may need an update if defined(CRASHREPORT) TBD
        if (C.sysopt.support)
            C.raw_printf("To report this error, %s%s", C.sysopt.support,
                       maybe_rebuild);
        else if (C.sysopt.fmtd_wizard_list) /* formatted SYSCF WIZARDS */
            C.raw_printf("To report this error, contact %s%s",
                       C.sysopt.fmtd_wizard_list, maybe_rebuild);
        else
            C.raw_printf("Report error to \"%s\"%s", C.WIZARD_NAME,
                       maybe_rebuild);
    }
/* ?NOTIFY_NETHACK_BUGS */
    /* XXX can we move this above the prints?  Then we'd be able to
     * suppress "it may be possible to rebuild" based on dosave0()
     * or say it's NOT possible to rebuild. */
    if (C.program_state.something_worth_saving && !C.iflags.debug_fuzzer) {
        C.set_error_savefile();
        if (C.dosave0()) {
            /* os/win port specific recover instructions */
            if (C.sysopt.recover)
                C.raw_printf("%s", C.sysopt.recover);
        }
    }
/* !MICRO */

    C.vsnprintf(buf, C.BUFSZ, str, arguments[1]);
    C.raw_print(buf);
    C.paniclog("panic", buf);

        NH_abort(buf); /* generate core dump */
    
    C.callLocal(really_done, C.PANICKED);
}


export function should_query_disclose_option(category, defquery)
{
    let idx;
    let disclose;
    let dop;

    defquery.value = 110;
    if ((dop = C.strchr(C.disclosure_options, category)) != 0) {
        idx = C.int((dop - C.disclosure_options));
        if (idx < 0 || idx >= C.NUM_DISCLOSURE_OPTIONS) {
            C.impossible(
                   "should_query_disclose_option: bad disclosure index %d %c",
                       idx, category);
            defquery.value = C.DISCLOSE_PROMPT_DEFAULT_YES;
            return 1;
        }
        disclose = C.byte(C.flags.end_disclose + (idx)).value;
        if (disclose == C.DISCLOSE_YES_WITHOUT_PROMPT) {
            defquery.value = 121;
            return 0;
        } else if (disclose == C.DISCLOSE_SPECIAL_WITHOUT_PROMPT) {
            defquery.value = 97;
            return 0;
        } else if (disclose == C.DISCLOSE_NO_WITHOUT_PROMPT) {
            defquery.value = 110;
            return 0;
        } else if (disclose == C.DISCLOSE_PROMPT_DEFAULT_YES) {
            defquery.value = 121;
            return 1;
        } else if (disclose == C.DISCLOSE_PROMPT_DEFAULT_SPECIAL) {
            defquery.value = 97;
            return 1;
        } else {
            defquery.value = 110;
            return 1;
        }
    }
    C.impossible("should_query_disclose_option: bad category %c", category);
    return 1;
}

/* one space for indentation */
/* DUMPLOG */

/*ARGSUSED*/
/* ASCENDED, ESCAPED, QUIT, etc */
export function dump_everything(how, when)
/* date+time at end of game */
{
/* [24]: room for 64-bit bogus value */
/* revert to default symbol set */
/* one line version ID, which includes build date+time;
       it's conceivable that the game started with a different
       build date+time or even with an older nethack version,
       but we only have access to the one it finished under */
/* game start and end date+time to disambiguate version date+time */
/* character name and basic role info */
/* info about current game state */
/* overview of the game up to this point */
/* ends with a blank line */
/* ends with a blank line */
/* 'd' => 'y' */
/* 'd' => 'y' */
    
    
}


export function disclose(how, taken)
{
    let c = 0; const defquery = C.charLocal();
    let qbuf = C.stackAlloc(C.QBUFSZ);
    let ask = 0;

    if (C.gi.invent && !C.program_state.stopprint) {
        if (taken)
            C.Sprintf(qbuf, "Do you want to see what you had when you %s?",
                    (how == C.QUIT) ? "quit" : "died");
        else
            C.Strcpy(qbuf, "Do you want your possessions identified?");

        ask = should_query_disclose_option(105, defquery);
        c = ask ? C.yn_function(qbuf, C.ynqchars, defquery.value, 1) : defquery.value;
        if (c == 121) {
            /* caller has already ID'd everything; we pass 'want_reply=True'
               to force display_pickinv() to avoid using WIN_INVENT */
            C.iflags.force_invmenu = 0;
            C.display_inventory(0, 1);
            C.callLocal(container_contents, C.gi.invent, 1, 1, 0);
        }
        if (c == 113)
            C.program_state.stopprint++;
    }

    if (!C.program_state.stopprint) {
        ask = should_query_disclose_option(97, defquery);
        c = ask ? C.yn_function("Do you want to see your attributes?", C.ynqchars,
                              defquery.value, 1)
                : defquery.value;
        if (c == 121)
            C.enlightenment((C.BASICENLIGHTENMENT | C.MAGICENLIGHTENMENT),
                          (how >= C.PANICKED) ? C.ENL_GAMEOVERALIVE
                                            : C.ENL_GAMEOVERDEAD);
        if (c == 113)
            C.program_state.stopprint++;
    }

    if (!C.program_state.stopprint) {
        ask = should_query_disclose_option(118, defquery);
        C.list_vanquished(defquery.value, ask);
    }

    if (!C.program_state.stopprint) {
        ask = should_query_disclose_option(103, defquery);
        C.list_genocided(defquery.value, ask);
    }

    if (!C.program_state.stopprint) {
        if (should_query_disclose_option(99, defquery)) {
            let acnt = C.count_achievements();

            C.Sprintf(qbuf, "Do you want to see your conduct%s?",
                    /* this was distinguishing between one achievement and
                       multiple achievements, but "conduct and achievement"
                       looked strange if multiple conducts got shown (which
                       is usual for an early game death); we could switch
                       to plural vs singular for conducts but the less
                       specific "conduct and achievements" is sufficient */
                    (acnt > 0) ? " and achievements" : "");
            c = C.yn_function(qbuf, C.ynqchars, defquery.value, 1);
        } else {
            c = defquery.value;
        }
        if (c == 121)
            C.show_conduct((how >= C.PANICKED) ? 1 : 2);
        if (c == 113)
            C.program_state.stopprint++;
    }

    if (!C.program_state.stopprint) {
        ask = should_query_disclose_option(111, defquery);
        c = ask ? C.yn_function("Do you want to see the dungeon overview?",
                              C.ynqchars, defquery.value, 1)
                : defquery.value;
        if (c == 121)
            C.show_overview((how >= C.PANICKED) ? 1 : 2, how);
        if (c == 113)
            C.program_state.stopprint++;
    }
}

/* try to get the player back in a viable state after being killed */

export function savelife(how)
{
    let uhpmin;
    let givehp = 50 + 10 * (Math.trunc(C.ACURR(C.A_CON) / 2));

    /* life-drain/level-loss to experience level 0 kills without actually
       reducing ulevel below 1, but include this for bulletproofing */
    if (C.u.ulevel < 1)
        C.u.ulevel = 1;
    uhpmin = C.minuhpmax(10);
    if (C.u.uhpmax < uhpmin)
        C.setuhpmax(uhpmin, 1);
    C.u.uhp = C.min(C.u.uhpmax, givehp);
    if (C.Upolyd) /* Unchanging, or death which bypasses losing hit points */
        C.u.mh = C.min(C.u.mhmax, givehp);
    if (C.u.uhunger < 500 || how == C.CHOKING) {
        C.init_uhunger();
    }
    /* cure impending doom of sickness hero won't have time to fix
       [shouldn't this also be applied to other fatal timeouts?] */
    if ((C.Sick & C.TIMEOUT) == 1n) {
        C.make_sick(0n, 0, 0, C.SICK_ALL);
    }
    C.gn.nomovemsg = "You survived that attempt on your life.";
    C.svc.context.move = 0;

    C.gm.multi = -1n; /* can't move again during the current turn */
    /* in case being life-saved is immediately followed by being killed
       again (perhaps due to zap rebound); this text will be appended to
          "killed by <something>, while "
       in high scores entry, if any, and in logfile (but not on tombstone) */
    C.gm.multi_reason = C.Role_if(C.PM_TOURIST) ? "being toyed with by Fate"
                                          : "attempting to cheat Death";

    if (C.u.utrap && C.u.utraptype == C.TT_LAVA)
        C.reset_utrap(0);
    C.disp.botl = 1;
    C.u.ugrave_arise = C.NON_PM;
    C.HUnchanging = 0n;
    C.curs_on_u();
    if (!C.svc.context.mon_moving)
        C.endmultishot(0);
    if (C.u.uswallow) {
        /* might drop hero onto a trap that kills her all over again */
        C.expels(C.u.ustuck, C.u.ustuck.data, 1);
    } else if (C.u.ustuck) {
        if (C.Upolyd && C.sticks(C.gy.youmonst.data))
            C.You("release %s.", C.mon_nam(C.u.ustuck));
        else
            C.pline("%s releases you.", C.Monnam(C.u.ustuck));
        C.unstuck(C.u.ustuck);
    }
}

/*
 * Get valuables from the given list.  Revised code: the list always remains
 * intact.
 */

export function get_valuables(list)
/* inventory or container contents */
{
    let obj;
    let i;

    /* find amulets and gems, ignoring all artifacts */
    for (obj = list; obj; obj = obj.nobj)
        if (C.Has_contents(obj)) {
            get_valuables(obj.cobj);
        } else if (obj.oartifact) {
            continue;
        } else if (obj.oclass == C.AMULET_CLASS) {
            i = obj.otyp - C.FIRST_AMULET;
            if (!C.ga.amulets[i].count) {
                C.ga.amulets[i].count = obj.quan;
                C.ga.amulets[i].typ = obj.otyp;
            } else
                C.ga.amulets[i].count += obj.quan; /* always adds one */
        } else if (obj.oclass == C.GEM_CLASS && obj.otyp <= C.LAST_GLASS_GEM) {
            /* last+1: combine all glass gems into one slot */
            i = C.min(obj.otyp, C.LAST_REAL_GEM + 1) - C.FIRST_REAL_GEM;
            if (!C.gg.gems[i].count) {
                C.gg.gems[i].count = obj.quan;
                C.gg.gems[i].typ = obj.otyp;
            } else
                C.gg.gems[i].count += obj.quan;
        }
    return;
}

/*
 *  Sort collected valuables, most frequent to least.  We could just
 *  as easily use qsort, but we don't care about efficiency here.
 */

export function sort_valuables(list, size)
/* max value is less than 20 */
{
    let i, j;
    const ltmp = C.valuableLocal();

    /* move greater quantities to the front of the list */
    for (i = 1; i < size; i++) {
        if (list[i].count == 0)
            continue;   /* empty slot */
        C.copyValuable(ltmp, list[i]); /* structure copy */
        for (j = i; j > 0; --j) {
            if (list[j - 1].count >= ltmp.count)
                break;
            C.copyValuable(list[j], list[j - 1]);
        }
        C.copyValuable(list[j], ltmp);
    }
    return;
}

/*
 * odds_and_ends() was used for 3.6.0 and 3.6.1.
 * Schroedinger's Cat is handled differently as of 3.6.2.
 */
/* Schroedinger's Cat */
/* Ascending is deterministic */

/* deal with some objects which may be in an abnormal state at end of game */

export function done_object_cleanup()
{
    let ox, oy;

    /* might have been killed while using a disposable item, so make sure
       it's gone prior to inventory disclosure and creation of bones */
    C.inven_inuse(1);
    /*
     * Hero can die when throwing an object (by hitting an adjacent
     * gas spore, for instance, or being hit by mis-returning Mjollnir),
     * or while in transit (from falling down stairs).  If that happens,
     * some object(s) might be in limbo rather than on the map or in
     * any inventory.  Saving bones with an active light source in limbo
     * would trigger an 'object not local' panic.
     *
     * We used to use dealloc_obj() on gt.thrownobj and gk.kickedobj but
     * that keeps them out of bones and could leave uball in a confused
     * state (gone but still attached).  Place them on the map but
     * bypass flooreffects().  That could lead to minor anomalies in
     * bones, like undamaged paper at water or lava locations or piles
     * not being knocked down holes, but it seems better to get this
     * game over with than risk being tangled up in more and more details.
     */
    ox = C.u.ux + C.u.dx, oy = C.u.uy + C.u.dy;
    if (!C.isok(ox, oy) || !C.accessible(ox, oy))
        ox = C.u.ux, oy = C.u.uy;
    /* put thrown or kicked object on map (for bones); location might
       be incorrect (perhaps killed by divine lightning when throwing at
       a temple priest?) but this should be better than just vanishing
       (fragile stuff should be taken care of before getting here) */
    if (C.gt.thrownobj && C.gt.thrownobj.where == C.OBJ_FREE) {
        C.place_object(C.gt.thrownobj, ox, oy);
        C.stackobj(C.gt.thrownobj), C.gt.thrownobj = 0;
    }
    if (C.gk.kickedobj && C.gk.kickedobj.where == C.OBJ_FREE) {
        C.place_object(C.gk.kickedobj, ox, oy);
        C.stackobj(C.gk.kickedobj), C.gk.kickedobj = 0;
    }
    /* if Punished hero dies during level change or dies or quits while
       swallowed, uball and uchain will be in limbo; put them on floor
       so bones will have them and object list cleanup finds them */
    if (C.uchain && C.uchain.where == C.OBJ_FREE) {
        /* placebc(); */
        C.lift_covet_and_placebc(C.override_restriction);
    }
    /* persistent inventory window now obsolete since disclosure uses
       a normal popup one; avoids "Bad fruit #n" when saving bones */
    if (C.iflags.perm_invent) {
        C.iflags.perm_invent = 0;
        C.perm_invent_toggled(1); /* make interface notice the change */
    }
    return;
}

/* called twice; first to calculate total, then to list relevant items */
/* true => add up points; false => display them */
export function artifact_score(list, counting, endwin)
{
    let pbuf = C.stackAlloc(C.BUFSZ);
    let otmp;
    let value, points;

    for (otmp = list; otmp; otmp = otmp.nobj) {
        if (otmp.oartifact || otmp.otyp == C.BELL_OF_OPENING
            || otmp.otyp == C.SPE_BOOK_OF_THE_DEAD
            || otmp.otyp == C.CANDELABRUM_OF_INVOCATION) {
            value = C.arti_cost(otmp); /* zorkmid value */
            points = value * 5n / 2n;  /* score value */
            if (counting) {
                C.u.urexp = C.nowrap_add(C.u.urexp, points);
            } else {
                C.discover_object(otmp.otyp, 1, 1, 0);
                /* not observe_object; dead characters don't observe */
                otmp.known = otmp.dknown = otmp.bknown = otmp.rknown = 1;
                /* assumes artifacts don't have quan > 1 */
                C.Sprintf(pbuf, "%s%s (worth %ld %s and %ld points)",
                        C.the_unique_obj(otmp) ? "The " : "",
                        otmp.oartifact ? C.artiname(otmp.oartifact)
                                        : C.OBJ_NAME(C.objects[otmp.otyp]),
                        value, C.currency(value), points);
                C.putstr(endwin, 0, pbuf);
            }
        }
        if (C.Has_contents(otmp))
            C.callLocal(artifact_score, otmp.cobj, counting, endwin);
    }
}

/* when dying while running the debug fuzzer, [almost] always keep going;
   True: forced survival; False: doomed unless wearing life-save amulet */

export function fuzzer_savelife(how)
{
    /*
     * Some debugging code pulled out of done() to unclutter it.
     * 'done_seq' is maintained in done().
     */
    if (!C.program_state.panicking && how != C.PANICKED && how != C.TRICKED) {
        savelife(how);

        /* periodically restore characteristics plus lost experience
           levels or cure lycanthropy or both; those conditions make the
           hero vulnerable to repeat deaths (often by becoming surrounded
           while being too encumbered to do anything) */
        if (!C.rn2((C.gd.done_seq > C.gh.hero_seq + 2n) ? 2 : 10, 959, "fuzzer_savelife")) {
            let potion;
            let propidx, proptim, remedies = 0;

            /* get rid of temporary potion with obfree() rather than useup()
               because it doesn't get entered into inventory */
            if (C.ismnum(C.u.ulycn) && !C.rn2(3, 965, "fuzzer_savelife")) {
                potion = C.mksobj(C.POT_WATER, 1, 0);
                C.bless(potion);
                C.peffects(potion);
                C.obfree(potion, 0);
                ++remedies;
            }
            if (!remedies || C.rn2(3, 972, "fuzzer_savelife")) {
                potion = C.mksobj(C.POT_RESTORE_ABILITY, 1, 0);
                C.bless(potion);
                C.peffects(potion);
                C.obfree(potion, 0);
                ++remedies;
            }
            if (!C.rn2(3 + 3 * remedies, 979, "fuzzer_savelife")) {
                /* confer temporary resistances for first 8 properties:
                   fire, cold, sleep, disint, shock, poison, acid, stone */
                for (propidx = 1; propidx <= 8; ++propidx) {
                    if (!C.u.uprops[propidx].intrinsic
                        && !C.u.uprops[propidx].extrinsic
                        && (proptim = C.rn2(3, 985, "fuzzer_savelife")) > 0) /* 0..2 */
                        C.set_itimeout(C.fieldRef(C.u.uprops[propidx], "intrinsic"),
                                     C.long((2 * proptim + 1))); /* 3 or 5 */
                }
                ++remedies;
            }
            if (!C.rn2(5 + 5 * remedies, 991, "fuzzer_savelife")) {
                ; /* might confer temporary Antimagic (magic resistance)
                   * or even Invulnerable */
            }
        }
        /* clear stale cause of death info after life-saving */
        C.byte(C.svk.killer.name + (0)).value = 0;
        C.svk.killer.format = 0;

        /*
         * Guard against getting stuck in a loop if we die in one of
         * the few ways where life-saving isn't effective (cited case
         * was burning in lava when the level was too full to allow
         * teleporting to safety).  Deal with it by recreating the level
         * if we're in wizmode (always the case for debug_fuzzer unless
         * player has used a debugger to fiddle with 'iflags' bits).
         */
        if (C.gd.done_seq++ > C.gh.hero_seq + 100n) {
            if (!C.wizard)
                return 0; /* can't deal with it */
            C.cmdq_add_ec(C.CQ_CANNED, C.wiz_makemap);
        }

        return 1;
    }
    return 0; /* panic or too many consecutive deaths */
}

/* Be careful not to call panic from here! */

export function done(how)
{
    let survive = 0;

    if (how == C.TRICKED) {
        if (C.byte(C.svk.killer.name + (0)).value) {
            C.paniclog("trickery", C.svk.killer.name);
            C.byte(C.svk.killer.name + (0)).value = 0;
        }
        if (C.wizard) {
            /* Suppress message for deterministic replay. */
            /* You("are a very tricky wizard, it seems."); */
            C.svk.killer.format = C.KILLED_BY_AN; /* reset to 0 */
            return;
        }
    }
    if (C.program_state.panicking
        || C.program_state.done_hup
        || (how == C.QUIT && C.program_state.stopprint)) {
        /* skip status update if panicking or disconnected
           or answer of 'q' to "Really quit?" */
        C.disp.botl = C.disp.botlx = C.disp.time_botl = 0;
    } else {
        /* otherwise force full status update */
        C.disp.botlx = 1;
        C.bot();
    }

    /* hero_seq is (moves<<3 + n) where n is number of moves made
       by the hero on the current turn (since the 'moves' variable
       actually counts turns); its details shouldn't matter here;
       used by fuzzer_savelife() and for hangup below */
    if (C.gd.done_seq < C.gh.hero_seq)
        C.gd.done_seq = C.gh.hero_seq;

    if (C.iflags.debug_fuzzer) {
        if (fuzzer_savelife(how))
            return;
    }

    if (how == C.ASCENDED || (!C.byte(C.svk.killer.name + (0)).value && how == C.GENOCIDED))
        C.svk.killer.format = C.NO_KILLER_PREFIX;
    /* Avoid killed by "a" burning or "a" starvation */
    if (!C.byte(C.svk.killer.name + (0)).value && (how == C.STARVING || how == C.BURNING))
        C.svk.killer.format = C.KILLED_BY;
    if (!C.byte(C.svk.killer.name + (0)).value || how >= C.PANICKED)
        C.Strcpy(C.svk.killer.name, deaths[how]);

    if (how < C.PANICKED) {
        C.u.umortality++;
        /* in case caller hasn't already done this */
        if (C.u.uhp != 0 || (C.Upolyd && C.u.mh != 0)) {
            /* force HP to zero in case it is still positive (some
               deaths aren't triggered by loss of hit points), or
               negative (-1 is used as a flag in some circumstances
               which don't apply when actually dying due to HP loss) */
            C.u.uhp = C.u.mh = 0;
            C.disp.botl = 1;
        }
    }
    if (C.Lifesaved && (how <= C.GENOCIDED)) {
        C.pline("But wait...");
        /* assumes that only one type of item confers LifeSaved property */
        C.makeknown(C.AMULET_OF_LIFE_SAVING);
        C.Your("medallion %s!", !C.Blind ? "begins to glow" : "feels warm");
        if (how == C.CHOKING)
            C.You("vomit ...");
        C.You_feel("much better!");
        C.pline_The("medallion crumbles to dust!");
        if (C.uamul)
            C.useup(C.uamul);

        C.adjattrib(C.A_CON, -1, 1);
        savelife(how);
        if (how == C.GENOCIDED) {
            C.pline("Unfortunately you are still genocided...");
        } else {
            let killbuf = C.stackAlloc(C.BUFSZ);
            C.formatkiller(killbuf, C.BUFSZ, how, 0);
            C.livelog_printf(C.LL_LIFESAVE, "averted death (%s)", killbuf);
            survive = 1;
        }
    }
    /* explore and wizard modes offer player the option to keep playing */
    if (!survive && (C.wizard || C.discover) && how <= C.GENOCIDED
        /* if hangup has occurred, the only possible answer to a paranoid
           query is 'no'; we want 'no' as the default for "Die?" but can't
           accept it more than once if there's no user supplying it */
        && !(C.program_state.done_hup && C.gd.done_seq++ == C.gh.hero_seq)
        && !C.paranoid_query(C.ParanoidDie, "Die?")) {
        C.pline("OK, so you don't %s.", (how == C.CHOKING) ? "choke" : "die");
        C.iflags.last_msg = C.PLNMSG_OK_DONT_DIE;
        savelife(how);
        survive = 1;
    }

    if (survive) {
        C.byte(C.svk.killer.name + (0)).value = 0;
        C.svk.killer.format = C.KILLED_BY_AN; /* reset to 0 */
        return;
    }
    C.callLocal(really_done, how);
    /*NOTREACHED*/
}

/* separated from done() in order to specify the __noreturn__ attribute */

export function really_done(how)
{
    let taken;
    let pbuf = C.stackAlloc(C.BUFSZ);
    let endwin = C.WIN_ERR;
    let bones_ok, have_windows = C.iflags.window_inited;
    let corpse = 0;
    let endtime;
    let umoney;
    let tmp;

    /*
     *  The game is now over...
     */
    C.program_state.gameover = 1;
    /* in case of a subsequent panic(), there's no point trying to save */
    C.program_state.something_worth_saving = 0;
    if (C.program_state.done_hup)
        C.program_state.stopprint++;
    /* render vision subsystem inoperative */
    C.iflags.vision_inited = 0;

    /* maybe use up active invent item(s), place thrown/kicked missile,
       deal with ball and chain possibly being temporarily off the map */
    if (!C.program_state.panicking)
        done_object_cleanup();
    /* in case we're panicking; normally cleared by done_object_cleanup() */
    C.iflags.perm_invent = 0;

    /* remember time of death here instead of having bones, rip, and
       topten figure it out separately and possibly getting different
       time or even day if player is slow responding to --More-- */
    C.urealtime.finish_time = endtime = C.getnow();
    C.urealtime.realtime += C.timet_delta(endtime, C.urealtime.start_timing);
    /* collect these for end of game disclosure (not used during play) */
    C.iflags.at_night = C.night();
    C.iflags.at_midnight = C.midnight();

    /* final achievement tracking; only show blind and nudist if some
       tangible progress has been made; always show ascension last */
    if (C.u.uachieved[0] || !C.flags.beginner) {
        if (C.u.uroleplay.blind)
            C.record_achievement(C.ACH_BLND); /* blind the whole game */
        if (C.u.uroleplay.nudist)
            C.record_achievement(C.ACH_NUDE); /* never wore armor */
    }
    if (how == C.ASCENDED)
        C.record_achievement(C.ACH_UWIN);

    C.dump_open_log(endtime);
    /* Sometimes you die on the first move.  Life's not fair.
     * On those rare occasions you get hosed immediately, go out
     * smiling... :-)  -3.
     */
    if (C.svm.moves <= 1 && how < C.PANICKED && !C.program_state.stopprint)
        C.pline("Do not pass Go.  Do not collect 200 %s.", C.currency(200n));

    if (have_windows)
        C.wait_synch(); /* flush screen output */
    C.signal(C.SIGINT, done_intr);
    C.signal(C.SIGQUIT, done_intr);
    C.sethanguphandler(done_hangup);
/* NO_SIGNAL */

    bones_ok = Number(Boolean((how < C.GENOCIDED) && C.can_make_bones()));

    if (bones_ok && C.launch_in_progress())
        C.force_launch_placement();

    /* maintain ugrave_arise even for !bones_ok */
    if (how == C.PANICKED)
        C.u.ugrave_arise = (C.NON_PM - 3); /* no corpse, no grave */
    else if (how == C.BURNING || how == C.DISSOLVED) /* corpse burns up too */
        C.u.ugrave_arise = (C.NON_PM - 2); /* leave no corpse */
    else if (how == C.STONING)
        C.u.ugrave_arise = C.LEAVESTATUE; /* statue instead of corpse */
    else if (how == C.TURNED_SLIME
             /* it's possible to turn into slime even though green slimes
                have been genocided:  genocide could occur after hero is
                already infected or hero could eat a glob of one created
                before genocide; don't try to arise as one if they're gone */
             && !(C.svm.mvitals[C.PM_GREEN_SLIME].mvflags & C.G_GENOD))
        C.u.ugrave_arise = C.PM_GREEN_SLIME;

    if (how == C.QUIT) {
        C.svk.killer.format = C.NO_KILLER_PREFIX;
        if (C.u.uhp < 1) {
            how = C.DIED;
            C.u.umortality++; /* skipped above when how==QUIT */
            C.Strcpy(C.svk.killer.name, "quit while already on Charon's boat");
        }
    }
    if (how == C.ESCAPED || how == C.PANICKED)
        C.svk.killer.format = C.NO_KILLER_PREFIX;

    fixup_death(how); /* actually, fixup gm.multi_reason */

    if (how != C.PANICKED) {
        let silently = C.program_state.stopprint ? 1 : 0;

        /* these affect score and/or bones, but avoid them during panic */
        taken = C.paybill((how == C.ESCAPED) ? -1 : (how != C.QUIT), silently);
        C.paygd(silently);
        C.clearpriests();
    } else
        taken = 0; /* lint; assert( !bones_ok ); */

    C.clearlocks();

    if (have_windows)
        C.display_nhwindow(C.WIN_MESSAGE, 0);

    if (how != C.PANICKED) {
        let obj, nextobj;

        /*
         * This is needed for both inventory disclosure and dumplog.
         * Both are optional, so do it once here instead of duplicating
         * it in both of those places.
         */
        for (obj = C.gi.invent; obj; obj = nextobj) {
            nextobj = obj.nobj;
            C.discover_object(obj.otyp, 1, 1, 0);
            /* observe_object not necessary after discover_object */
            obj.known = obj.bknown = obj.dknown = obj.rknown = 1;
            C.set_cknown_lknown(obj); /* set flags when applicable */
            /* we resolve Schroedinger's cat now in case of both
               disclosure and dumplog, where the 50:50 chance for
               live cat has to be the same both times */
            if (C.SchroedingersBox(obj)) {
                if (!C.Schroedingers_cat) {
                    /* tell observe_quantum_cat() not to create a cat; if it
                       chooses live cat in this situation, it will leave the
                       SchroedingersBox flag set (for container_contents()) */
                    C.observe_quantum_cat(obj, 0, 0);
                    if (C.SchroedingersBox(obj))
                        C.Schroedingers_cat = 1;
                } else
                    obj.spe = 0; /* ordinary box with cat corpse in it */
            }
        }

        if (C.strcmp(C.flags.end_disclose, "none"))
            C.callLocal(disclose, how, taken);

        /* it would be better to do this after killer.name fixups but
           that comes too late; included in final dumplog but might be
           excluded by active livelog */
        C.formatkiller(pbuf, C.uint(C.BUFSZ), how, 1);
        if (!C.loadChar(pbuf))
            C.Strcpy(pbuf, deaths[how]);
        C.livelog_printf(C.LL_DUMP, "%s", pbuf);

        dump_everything(how, endtime);
    }

    /* if pets will contribute to score, populate gm.mydogs list now
       (bones creation isn't a factor, but pline() messaging is; used to
       be done even sooner, but we need it to come after dump_everything()
       so that any accompanying pets are still on the map during dump) */
    if (how == C.ESCAPED || how == C.ASCENDED)
        C.keepdogs(1);

    /* finish_paybill should be called after disclosure but before bones */
    if (bones_ok && taken)
        C.finish_paybill();

    /* grave creation should be after disclosure so it doesn't have
       this grave in the current level's features for #overview */
    if (bones_ok && C.u.ugrave_arise == C.NON_PM
        && !(C.svm.mvitals[C.u.umonnum].mvflags & C.G_NOCORPSE)) {
        /* Base corpse on race when not poly'd since original u.umonnum
           is based on role, and all role monsters are human. */
        let mnum = !C.Upolyd ? C.gu.urace.mnum : C.u.umonnum,
            was_already_grave = C.IS_GRAVE(C.levl[C.u.ux][C.u.uy].typ);

        corpse = C.mk_named_object(C.CORPSE, C.mons[mnum], C.u.ux, C.u.uy, C.svp.plname);
        C.Sprintf(pbuf, "%s, ", C.svp.plname);
        C.formatkiller(C.eos(pbuf), C.BUFSZ - C.Strlen(pbuf, 1317, "really_done"), how, 1);
        C.make_grave(C.u.ux, C.u.uy, pbuf);
        if (C.IS_GRAVE(C.levl[C.u.ux][C.u.uy].typ) && !was_already_grave)
            C.levl[C.u.ux][C.u.uy].emptygrave = 1; /* corpse isn't buried */
    }
    C.byte(pbuf + (0)).value = 0; /* clear grave text; also lint suppression */

    /* calculate score, before creating bones [container gold] */
    {
        let deepest = C.deepest_lev_reached(0);

        umoney = C.money_cnt(C.gi.invent);
        tmp = C.u.umoney0;
        umoney += C.hidden_gold(1); /* accumulate gold from containers */
        tmp = umoney - tmp;          /* net gain */

        if (tmp < 0n)
            tmp = 0n;
        if (how < C.PANICKED)
            tmp -= tmp / 10n;
        tmp += 50n * C.long((deepest - 1));
        if (deepest > 20)
            tmp += 1000n * C.long(((deepest > 30) ? 10 : deepest - 20));
        C.u.urexp = C.nowrap_add(C.u.urexp, tmp);

        /* ascension gives a score bonus iff offering to original deity */
        if (how == C.ASCENDED && C.u.ualign.type == C.u.ualignbase[C.A_ORIGINAL]) {
            /* retaining original alignment: score *= 2;
               converting, then using helm-of-OA to switch back: *= 1.5 */
            tmp = (C.u.ualignbase[C.A_CURRENT] == C.u.ualignbase[C.A_ORIGINAL])
                      ? C.u.urexp
                      : (C.u.urexp / 2n);
            C.u.urexp = C.nowrap_add(C.u.urexp, tmp);
        }
    }

    if (C.ismnum(C.u.ugrave_arise) && !C.program_state.stopprint) {
        /* give this feedback even if bones aren't going to be created,
           so that its presence or absence doesn't tip off the player to
           new bones or their lack; it might be a lie if makemon fails */
        C.Your("%s as %s...",
             (C.u.ugrave_arise != C.PM_GREEN_SLIME)
                 ? "body rises from the dead"
                 : "revenant persists",
             C.an(C.pmname(C.mons[C.u.ugrave_arise], C.Ugender)));
        C.display_nhwindow(C.WIN_MESSAGE, 0);
    }

    if (bones_ok) {
        if (!C.wizard || C.paranoid_query(C.ParanoidBones, "Save bones?"))
            C.savebones(how, endtime, corpse);
        /* corpse may be invalid pointer now so
            ensure that it isn't used again */
        corpse = 0;
    }

    /* update gold for the rip output, which can't use hidden_gold()
       (containers will be gone by then if bones just got saved...) */
    C.gd.done_money = umoney;

    /* clean up unneeded windows */
    if (have_windows) {
        C.wait_synch();
        C.free_pickinv_cache(); /* extra persistent window if perm_invent */
        if (C.WIN_INVEN != C.WIN_ERR) {
            C.destroy_nhwindow(C.WIN_INVEN),  C.WIN_INVEN = C.WIN_ERR;
            /* precaution in case any late update_inventory() calls occur */
            C.iflags.perm_invent = 0;
        }
        C.display_nhwindow(C.WIN_MESSAGE, 1);
        C.destroy_nhwindow(C.WIN_MAP),  C.WIN_MAP = C.WIN_ERR;
        if (C.WIN_STATUS != C.WIN_ERR)
            C.destroy_nhwindow(C.WIN_STATUS),  C.WIN_STATUS = C.WIN_ERR;
        C.destroy_nhwindow(C.WIN_MESSAGE),  C.WIN_MESSAGE = C.WIN_ERR;

        if (!C.program_state.stopprint || C.flags.tombstone)
            endwin = C.create_nhwindow(C.NHW_TEXT);

        if (how < C.GENOCIDED && C.flags.tombstone && endwin != C.WIN_ERR)
            C.outrip(endwin, how, endtime);
    } else
        C.program_state.stopprint = 1; /* just avoid any more output */

/* 'how' reasons beyond genocide shouldn't show tombstone;
       for normal end of game, genocide doesn't either */
    if (C.u.uhave.amulet) {
        C.Strcat(C.svk.killer.name, " (with the Amulet)");
    } else if (how == C.ESCAPED) {
        if (C.Is_astralevel(C.u.uz)) /* offered Amulet to wrong deity */
            C.Strcat(C.svk.killer.name, " (in celestial disgrace)");
        else if (C.carrying(C.FAKE_AMULET_OF_YENDOR))
            C.Strcat(C.svk.killer.name, " (with a fake Amulet)");
        /* don't bother counting to see whether it should be plural */
    }

    C.Sprintf(pbuf, "%s %s the %s...", C.Goodbye(), C.svp.plname,
            (how != C.ASCENDED)
                ? ((C.flags.female && C.gu.urole.name.f)
                    ? C.gu.urole.name.f
                    : C.gu.urole.name.m)
                : (C.flags.female ? "Demigoddess" : "Demigod"));
    C.dump_forward_putstr(endwin, 0, pbuf, C.program_state.stopprint);
    C.dump_forward_putstr(endwin, 0, "", C.program_state.stopprint);

    if (how == C.ESCAPED || how == C.ASCENDED) {
        let mtmp;
        let otmp;
        let val;
        let i;

        for (val = C.gv.valuables; val.list; val = C.advanceValList(val, 1))
            for (i = 0; i < val.size; i++) {
                val.list[i].count = 0n;
            }
        get_valuables(C.gi.invent);

        /* add points for collected valuables */
        for (val = C.gv.valuables; val.list; val = C.advanceValList(val, 1))
            for (i = 0; i < val.size; i++)
                if (val.list[i].count != 0n) {
                    tmp = val.list[i].count
                          * C.long(C.objects[val.list[i].typ].oc_cost);
                    C.u.urexp = C.nowrap_add(C.u.urexp, tmp);
                }

        /* count the points for artifacts */
        C.callLocal(artifact_score, C.gi.invent, 1, endwin);

        C.gv.viz_array[0][0] |= C.IN_SIGHT; /* need visibility for naming */
        mtmp = C.gm.mydogs;
        C.Strcpy(pbuf, "You");
        if (mtmp || C.Schroedingers_cat) {
            while (mtmp) {
                C.Sprintf(C.eos(pbuf), " and %s", C.mon_nam(mtmp));
                if (mtmp.mtame)
                    C.u.urexp = C.nowrap_add(C.u.urexp, mtmp.mhp);
                mtmp = mtmp.nmon;
            }
            /* [it might be more robust to create a housecat and add it to
               gm.mydogs; it doesn't have to be placed on the map for that] */
            if (C.Schroedingers_cat) {
                let mhp, m_lev = C.adj_lev(C.mons[C.PM_HOUSECAT]);

                mhp = C.d(m_lev, 8, 1468, "really_done");
                C.u.urexp = C.nowrap_add(C.u.urexp, mhp);
                C.Strcat(C.eos(pbuf), " and Schroedinger's cat");
            }
            C.dump_forward_putstr(endwin, 0, pbuf, C.program_state.stopprint);
            C.byte(pbuf + (0)).value = 0;
        } else {
            C.Strcat(pbuf, " ");
        }
        C.Sprintf(C.eos(pbuf), "%s with %ld point%s,",
                (how == C.ASCENDED) ? "went to your reward"
                                  : "escaped from the dungeon",
                C.u.urexp, C.plur(C.u.urexp));
        C.dump_forward_putstr(endwin, 0, pbuf, C.program_state.stopprint);

        if (!C.program_state.stopprint)
            C.callLocal(artifact_score, C.gi.invent, 0, endwin); /* list artifacts */

        /* list valuables here */
        for (val = C.gv.valuables; val.list; val = C.advanceValList(val, 1)) {
            C.callLocal(sort_valuables, val.list, val.size);
            for (i = 0; i < val.size && !C.program_state.stopprint; i++) {
                let typ = val.list[i].typ;
                let count = val.list[i].count;

                if (count == 0n)
                    continue;
                if (C.objects[typ].oc_class != C.GEM_CLASS
                    || typ <= C.LAST_REAL_GEM) {
                    otmp = C.mksobj(typ, 0, 0);
                    C.discover_object(otmp.otyp, 1, 1, 0);
                    otmp.dknown = 1; /* seen it (blindness fix) */
                    /* observe_object not necessary after discover_object */
                    otmp.known = 1;  /* for fake amulets */
                    if (C.has_oname(otmp))
                        C.free_oname(otmp);
                    otmp.quan = count;
                    C.Sprintf(pbuf, "%8ld %s (worth %ld %s),", count,
                            C.xname(otmp), count * C.long(C.objects[typ].oc_cost),
                            C.currency(2n));
                    C.obfree(otmp, 0);
                } else {
                    C.Sprintf(pbuf, "%8ld worthless piece%s of colored glass,",
                            count, C.plur(count));
                }
                C.dump_forward_putstr(endwin, 0, pbuf, 0);
            }
        }

    } else {
        /* did not escape or ascend */
        if (C.u.uz.dnum == 0 && C.u.uz.dlevel <= 0) {
            /* level teleported out of the dungeon; `how' is DIED,
               due to falling or to "arriving at heaven prematurely" */
            C.Sprintf(pbuf, "You %s beyond the confines of the dungeon",
                    (C.u.uz.dlevel < 0) ? "passed away" : ends[how]);
        } else {
            /* more conventional demise */
            let where = C.svd.dungeons[C.u.uz.dnum].dname;

            if (C.Is_astralevel(C.u.uz))
                where = "The Astral Plane";
            C.Sprintf(pbuf, "You %s in %s", ends[how], where);
            if (!C.In_endgame(C.u.uz) && !C.single_level_branch(C.u.uz))
                C.Sprintf(C.eos(pbuf), " on dungeon level %d",
                        C.In_quest(C.u.uz) ? C.dunlev(C.u.uz) : C.depth(C.u.uz));
        }

        C.Sprintf(C.eos(pbuf), " with %ld point%s,", C.u.urexp, C.plur(C.u.urexp));
        C.dump_forward_putstr(endwin, 0, pbuf, C.program_state.stopprint);
    }

    C.Sprintf(pbuf, "and %ld piece%s of gold, after %ld move%s.", umoney,
            C.plur(umoney), C.svm.moves, C.plur(C.svm.moves));
    C.dump_forward_putstr(endwin, 0, pbuf, C.program_state.stopprint);
    C.Sprintf(pbuf,
            "You were level %d with a maximum of %d hit point%s when you %s.",
            C.u.ulevel, C.u.uhpmax, C.plur(C.u.uhpmax), ends[how]);
    C.dump_forward_putstr(endwin, 0, pbuf, C.program_state.stopprint);
    C.dump_forward_putstr(endwin, 0, "", C.program_state.stopprint);
    if (!C.program_state.stopprint)
        C.display_nhwindow(endwin, 1);
    if (endwin != C.WIN_ERR)
        C.destroy_nhwindow(endwin);

    C.dump_close_log();

    /* shut down soundlib */
    if (C.soundprocs.sound_exit_nhsound)
        C.soundExit("really_done");

    /*
     * "So when I die, the first thing I will see in Heaven is a score list?"
     *
     * topten() updates 'logfile' and 'xlogfile', when they're enabled.
     * Then the current game's score is shown in its relative position
     * within high scores, and 'record' is updated if that makes the cut.
     *
     * FIXME!
     *  If writing topten with raw_print(), which will usually be sent to
     *  stdout, we call exit_nhwindows() first in case it erases the screen.
     *  But when writing topten to a window, we call exit_nhwindows()
     *  after topten() because that needs the windowing system to still
     *  be up.  This sequencing is absurd; we need something like
     *  raw_prompt("--More--") (or "Press <return> to continue.") that
     *  topten() can call for !toptenwin before returning here.
     */
    if (have_windows && !C.iflags.toptenwin)
        C.exit_nhwindows(0), have_windows = 0;
    C.topten(how, endtime);
    if (have_windows)
        C.exit_nhwindows(0);

    if (C.program_state.stopprint) {
        C.raw_print("");
        C.raw_print("");
    }
    nh_terminate(C.EXIT_SUCCESS);
}

/* used for disclosure and for the ':' choice when looting a container */

export function container_contents(list, identified, all_containers, reportempty)
{
    let box, obj;
    let buf = C.stackAlloc(C.BUFSZ);
    let cat, dumping = C.iflags.in_dumplog;

    for (box = list; box; box = box.nobj) {
        if (C.Is_container(box) || box.otyp == C.STATUE) {
            if (!box.cknown || (identified && !box.lknown)) {
                box.cknown = 1; /* we're looking at the contents now */
                if (identified)
                    box.lknown = 1;
                C.update_inventory();
            }
            if (box.otyp == C.BAG_OF_TRICKS) {
                continue; /* wrong type of container */
            } else if (box.cobj) {
                let tmpwin = C.create_nhwindow(C.NHW_MENU);
                let sortedcobj, srtc;
                let sortflags;

                /* at this stage, the SchroedingerBox() flag is only set
                   if the cat inside the box is alive; the box actually
                   contains a cat corpse that we'll pretend is not there;
                   for dead cat, the flag will be clear and there'll be
                   a cat corpse inside the box; either way, inventory
                   reports the box as containing "1 item" */
                cat = C.SchroedingersBox(box);

                C.Sprintf(buf, "Contents of %s:", C.the(C.xname(box)));
                C.putstr(tmpwin, 0, buf);
                if (!dumping)
                    C.putstr(tmpwin, 0, "");
                C.byte(buf + (0)).value = C.byte(buf + (1)).value = 32; /* two leading spaces */
                if (box.cobj && !cat) {
                    sortflags = (((C.flags.sortloot == 108
                                   || C.flags.sortloot == 102)
                                     ? C.SORTLOOT_LOOT : 0)
                                 | (C.flags.sortpack ? C.SORTLOOT_PACK : 0));
                    sortedcobj = C.sortloot(C.fieldRef(box, "cobj"), sortflags, 0,
                                          0);
                    for (srtc = sortedcobj; (obj = srtc.obj) != 0; srtc = C.advanceLoot(srtc, 1)) {
                        if (identified) {
                            C.discover_object(obj.otyp, 1, 1, 0);
                            obj.dknown = 1; /* observe_object unnecessary */
                            obj.known = obj.bknown = obj.rknown = 1;
                            if (C.Is_container(obj) || obj.otyp == C.STATUE)
                                obj.cknown = obj.lknown = 1;
                        }
                        C.Strcpy((buf + 2), C.doname_with_price(obj));
                        C.putstr(tmpwin, 0, buf);
                    }
                    C.unsortloot(C.reference(() => sortedcobj, value => sortedcobj = value));
                } else if (cat) {
                    C.Strcpy((buf + 2), "Schroedinger's cat!");
                    C.putstr(tmpwin, 0, buf);
                }
                if (dumping)
                    C.putstr(0, 0, "");
                C.display_nhwindow(tmpwin, 1);
                C.destroy_nhwindow(tmpwin);
                if (all_containers)
                    C.callLocal(container_contents, box.cobj, identified, 1,
                                       reportempty);
            } else if (reportempty) {
                C.pline("%s is empty.", C.upstart(C.thesimpleoname(box)));
                C.display_nhwindow(C.WIN_MESSAGE, 0);
            }
        }
        if (!all_containers)
            break;
    }
}

/* should be called with either EXIT_SUCCESS or EXIT_FAILURE */

export function nh_terminate(status)
{
    C.program_state.in_moveloop = 0; /* won't be returning to normal play */

    /* Issue #460: capture the final post-topten screen state once,
     * deterministically, before tearing down. nomux_raw_emit no longer
     * writes the file per emit (that caused intermediate captures); the
     * write at nhgetch is the normal sync point during gameplay, but
     * after death/quit there's no further nhgetch — topten emits then
     * we get here. This single call ensures the harness sees the final
     * state (with all topten lines painted) when waiting for SEQ to
     * advance. See termcap.c nomux_raw_emit for the matching comment. */
    C.nomux_capture_write_input_boundary();

    C.l_nhcore_call(C.NHCORE_GAME_EXIT);
    /* don't bother to try to release memory if we're in panic mode, to
       avoid trouble in case that happens to be due to memory problems */
    if (!C.program_state.panicking) {
        C.freedynamicdata();
        
        C.l_nhcore_done();
    }

/*
     *  This is liable to draw a warning if compiled with gcc, but it's
     *  more important to flag panic() -> really_done() -> nh_terminate()
     *  as __noreturn__ then to avoid the warning.
     */
/* don't call exit() if already executing within an exit handler;
       that would cancel any other pending user-mode handlers */
    C.program_state.exiting = 1;
    C.nethack_exit(status);
}

/* set a delayed killer, ensure non-delayed killer is cleared out */

export function delayed_killer(id, format, killername)
{
    let k = find_delayed_killer(id);

    if (!k) {
        /* no match, add a new delayed killer to the list */
        k = C.kinfo(C.alloc(C.kinfoSize));
        C.memset(k, 0, C.kinfoSize);
        k.id = id;
        k.next = C.svk.killer.next;
        C.svk.killer.next = k;
    }

    k.format = format;
    C.Strcpy(k.name, killername ? killername : "");
    C.byte(C.svk.killer.name + (0)).value = 0;
}


export function find_delayed_killer(id)
{
    let k;

    for (k = C.svk.killer.next; k != 0; k = k.next) {
        if (k.id == id)
            break;
    }
    return k;
}


export function dealloc_killer(kptr)
{
    let prev = C.svk.killer, k;

    if (kptr == 0)
        return;
    for (k = C.svk.killer.next; k != 0; k = k.next) {
        if (C.samePtr(k, kptr))
            break;
        prev = k;
    }

    if (k == 0) {
        C.impossible("dealloc_killer (#%d) not on list", kptr.id);
    } else {
        prev.next = k.next;
        C.free(k);
        if (C.config_DEBUG && C.debugcore("end.c", 1)) { const save_plnmsg = C.iflags.last_msg; C.pline("freed delayed killer #%d", kptr.id); C.iflags.last_msg = save_plnmsg; }
    }
}


export function save_killers(nhfp)
{
    let kptr;

    if (C.update_file(nhfp)) {
        for (kptr = C.svk.killer; kptr; kptr = kptr.next) {
            C.Sfo_kinfo(nhfp, kptr, "kinfo");
        }
    }
    if (C.release_data(nhfp)) {
        while (C.svk.killer.next) {
            kptr = C.svk.killer.next.next;
            C.free(C.svk.killer.next);
            C.svk.killer.next = kptr;
        }
    }
}
/* !SFCTOOL */


export function restore_killers(nhfp)
{
    let kptr;

    for (kptr = C.svk.killer; kptr != 0; kptr = kptr.next) {
        C.Sfi_kinfo(nhfp, kptr, "kinfo");
        if (kptr.next) {
            kptr.next = C.kinfo(C.alloc(C.kinfoSize));
        }
    }
}


export function wordcount(p)
{
    let words = 0;

    while (C.loadChar(p)) {
        while (C.loadChar(p) && C.isspace(C.uchar(C.loadChar(p))))
            p++;
        if (C.loadChar(p))
            words++;
        while (C.loadChar(p) && !C.isspace(C.uchar(C.loadChar(p))))
            p++;
    }
    return words;
}


export function bel_copy1(inp, out)
{
    let in_ = inp.value;

    out += C.strlen(out); /* eos() */
    while (C.loadChar(in_) && C.isspace(C.uchar(C.loadChar(in_))))
        in_++;
    while (C.loadChar(in_) && !C.isspace(C.uchar(C.loadChar(in_))))
        C.storeChar(out++, C.loadChar(in_++));
    C.storeChar(out, 0);
    inp.value = in_;
}


export function build_english_list(in_)
{
    let out, p = in_;
    let len = C.int(C.strlen(p)), words = wordcount(p);

    /* +3: " or " - " "; +(words - 1): (N-1)*(", " - " ") */
    if (words > 1)
        len += 3 + (words - 1);
    out = C.alloc(len + 1);
    C.storeChar(out, 0); /* bel_copy1() appends */

    switch (words) {
    case 0:
        C.impossible("no words in list");
        break;
    case 1:
        /* "single" */
        bel_copy1(C.reference(() => p, value => p = value), out);
        break;
    default:
        if (words == 2) {
            /* "first or second" */
            bel_copy1(C.reference(() => p, value => p = value), out);
            C.Strcat(out, " ");
        } else {
            /* "first, second, or third */
            do {
                bel_copy1(C.reference(() => p, value => p = value), out);
                C.Strcat(out, ", ");
            } while (--words > 1);
        }
        C.Strcat(out, "or ");
        bel_copy1(C.reference(() => p, value => p = value), out);
        break;
    }
    return out;
}

/* What do we try to in what order?  Tradeoffs:
 * libc: +no external programs required
 *        -requires newish libc/glibc
 *        -requires -rdynamic
 * gdb:   +gives more detailed information
 *        +works on more OS versions
 *        -requires -g, which may preclude -O on some compilers
 *
 * And the UI: if sysopt.crashreporturl, and defined(CRASHREPORT)
 * we gather the stacktrace (etc) and launch a browser to submit a bug report
 * otherwise we just use stdout.  Requires libc for now.
 */



export function NH_abort(why)
{
    let gdb_prio = C.sysopt.panictrace_gdb;
    let libc_prio = 0;
    

    /* don't execute this code recursively if a second abort is requested
       while this routine or the code it calls is executing */
    if (C.aborting)
        return;
    C.aborting = 1;

    if(!C.submit_web_report(1, "Panic", why))
    {
        if (gdb_prio == libc_prio && gdb_prio > 0)
            gdb_prio++;

        if (gdb_prio > libc_prio) {
            (C.NH_panictrace_gdb()
                    || (libc_prio && C.NH_panictrace_libc()));
        } else {
            (C.NH_panictrace_libc()
                    || (gdb_prio && C.NH_panictrace_gdb()));
        }

/* VMS */
/* overload otherwise unused priority for debug mode: 1 = show
           traceback and exit; 2 = show traceback and stay in debugger */
/* if (wizard && gdb_prio == 1) gdb_prio = 2; */
/* ?VMS */
    }
    C.panictrace_setsignals(0);
/* PANICTRACE */
    C.abort();
}

/*end.c*/
