/* NetHack 5.0	mail.c	$NHDT-Date: 1762750699 2025/11/09 20:58:19 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.77 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Pasi Kallinen, 2018. */
/* NetHack may be freely redistributed.  See license for details. */

// Configured UNIX/MAIL path. Inactive platform branches are not translated.
import { C } from '../c-runtime/context.js';

export function free_maildata()
{
    if (C.mailState.mailbox)
        C.free(C.mailState.mailbox), C.mailState.mailbox = 0;
}

export function getmailstatus()
{
    if (C.mailState.mailbox) {
        ; /* no need to repeat the setup */
    } else if ((C.mailState.mailbox = C.nh_getenv("MAIL")) != 0) {
        C.mailState.mailbox = C.dupstr(C.mailState.mailbox);
    } else  {
        const pw_name = C.getpwuid(C.getuid()).pw_name;

        /* note: 'sizeof "LITERAL"' includes +1 for terminating '\0' */
        C.mailState.mailbox = C.alloc(C.uint(C.strlen(pw_name) + C.MAILPATH_SIZE));
        C.Strcpy(C.mailState.mailbox, C.MAILPATH);
        C.Strcat(C.mailState.mailbox, pw_name);
    }

    // Original debugpline3 macro: lazy arguments and last_msg restoration.
    if (C.debugcore('mail.c', 1)) {
        const save_plnmsg = C.iflags.last_msg;
        C.pline("mailbox=%c%s%c", C.mailState.mailbox ? 34 : 60,
                C.mailState.mailbox ? C.mailState.mailbox : "null", C.mailState.mailbox ? 34 : 62);
        C.iflags.last_msg = save_plnmsg;
    }

    if (C.mailState.mailbox && C.stat(C.mailState.mailbox, C.mailState.omstat)) {
        C.mailState.omstat.st_mtime = 0n;
    }
}

/*
 * Pick coordinates for a starting position for the mail daemon.  Called
 * from newmail() and newphone().
 */
export function md_start(startp)
{
    const testcc = C.coordLocal();     /* scratch coordinates */
    let row;          /* current row we are checking */
    let lax;          /* if 1, pick a position in sight. */
    let dd;           /* distance to current point */
    let max_distance; /* max distance found so far */
    let stway = C.gs.stairs;

    /*
     * If blind and not telepathic, then it doesn't matter what we pick ---
     * the hero is not going to see it anyway.  So pick a nearby position.
     */
    if (C.Blind && !C.Blind_telepat) {
        if (!C.enexto(startp, C.u.ux, C.u.uy, 0))
            return 0; /* no good positions */
        return 1;
    }

    /*
     * Arrive at an up or down stairwell if it is in line of sight from the
     * hero.
     */
    while (stway) {
        if (stway.tolev.dnum == C.u.uz.dnum
            && C.couldsee(stway.sx, stway.sy)) {
            startp.x = stway.sx;
            startp.y = stway.sy;
            return 1;
        }
        stway = stway.next;
    }

    /*
     * Try to pick a location out of sight next to the farthest position away
     * from the hero.  If this fails, try again, just picking the farthest
     * position that could be seen.  What we really ought to be doing is
     * finding a path from a stairwell...
     *
     * The arrays gv.viz_rmin[] and gv.viz_rmax[] are set even when blind.
     * These are the LOS limits for each row.
     */
    lax = 0; /* be picky */
    max_distance = -1;
    // C goto retry uses the same retry point in a labelled loop.
    retry: for (;;) {
    for (row = 0; row < C.ROWNO; row++) {
        if (C.gv.viz_rmin[row] < C.gv.viz_rmax[row]) {
            /* There are valid positions on this row. */
            dd = C.distu(C.gv.viz_rmin[row], row);
            if (dd > max_distance) {
                if (lax) {
                    max_distance = dd;
                    startp.y = row;
                    startp.x = C.gv.viz_rmin[row];

                } else if (C.enexto(testcc, C.gv.viz_rmin[row], row,
                                  0)
                           && !C.cansee(testcc.x, testcc.y)
                           && C.couldsee(testcc.x, testcc.y)) {
                    max_distance = dd;
                    C.copyCoord(startp, testcc);
                }
            }
            dd = C.distu(C.gv.viz_rmax[row], row);
            if (dd > max_distance) {
                if (lax) {
                    max_distance = dd;
                    startp.y = row;
                    startp.x = C.gv.viz_rmax[row];

                } else if (C.enexto(testcc, C.gv.viz_rmax[row], row,
                                  0)
                           && !C.cansee(testcc.x, testcc.y)
                           && C.couldsee(testcc.x, testcc.y)) {
                    max_distance = dd;
                    C.copyCoord(startp, testcc);
                }
            }
        }
    }

    if (max_distance < 0) {
        if (!lax) {
            lax = 1; /* just find a position */
            continue retry;
        }
        return 0;
    }

    return 1;
    }
}

/*
 * Try to choose a stopping point as near as possible to the starting
 * position while still adjacent to the hero.  If all else fails, try
 * enexto().  Use enexto() as a last resort because enexto() chooses
 * its point randomly, which is not what we want.
 */
export function md_stop(stopp, startp) /* stopping position (we fill it in) */
/* starting position (read only) */
{
    let x, y, distance, min_distance = -1;

    for (x = C.coordxy(C.u.ux - 1); x <= C.u.ux + 1; x = C.coordxy(x + 1))
        for (y = C.coordxy(C.u.uy - 1); y <= C.u.uy + 1; y = C.coordxy(y + 1)) {
            if (!C.isok(x, y) || C.u_at(x, y))
                continue;

            if (C.accessible(x, y) && !C.MON_AT(x, y)) {
                distance = C.coordxy(C.dist2(x, y, startp.x, startp.y));
                if (min_distance < 0 || distance < min_distance
                    || (distance == min_distance && C.rn2(2, 261, 'md_stop'))) {
                    stopp.x = x;
                    stopp.y = y;
                    min_distance = distance;
                }
            }
        }

    /* If we didn't find a good spot, try enexto(). */
    if (min_distance < 0 && !C.enexto(stopp, C.u.ux, C.u.uy, C.mons[C.PM_MAIL_DAEMON]))
        return 0;

    return 1;
}

/* Let the mail daemon have a larger vocabulary. */
export const mail_text = [ "Gangway!", "Look out!", "Pardon me!" ];
// md_exclamations expands inline at its sole call below.

/*
 * Make the mail daemon run through the dungeon.  The daemon will run over
 * any monsters that are in its path, but will replace them later.  Return
 * FALSE if the md gets stuck in a position where there is a monster.  Return
 * TRUE otherwise.
 */
export function md_rush(md, tx, ty) /* destination of mail daemon */
{
    let mon;            /* displaced monster */
    let dx, dy;          /* direction counters */
    let fx = md.mx, fy = md.my; /* current location */
    let nfx = fx, nfy = fy,       /* new location */
        d1, d2;                   /* shortest distances */

    /*
     * It is possible that the monster at (fx,fy) is not the md when:
     * the md rushed the hero and failed, and is now starting back.
     */
    if (C.samePtr(C.m_at(fx, fy), md)) {
        C.remove_monster(fx, fy); /* pick up from orig position */
        C.newsym(fx, fy);
    }

    /*
     * At the beginning and exit of this loop, md is not placed in the
     * dungeon.
     */
    while (1) {
        /* Find a good location next to (fx,fy) closest to (tx,ty). */
        d1 = C.dist2(fx, fy, tx, ty);
        for (dx = -1; dx <= 1; dx++)
            for (dy = -1; dy <= 1; dy++)
                if ((dx || dy) && C.isok(fx + dx, fy + dy)
                    && !C.IS_STWALL(C.levl[fx + dx][fy + dy].typ)) {
                    d2 = C.dist2(fx + dx, fy + dy, tx, ty);
                    if (d2 < d1) {
                        d1 = d2;
                        nfx = fx + dx;
                        nfy = fy + dy;
                    }
                }

        /* Break if the md couldn't find a new position. */
        if (nfx == fx && nfy == fy)
            break;

        fx = nfx; /* this is our new position */
        fy = nfy;

        /* Break if the md reaches its destination. */
        if (fx == tx && fy == ty)
            break;

        mon = C.m_at(fx, fy); /* save monster at this position */
        if (!C.Deaf) {
            /* SetVoice(md, 0, 80, 0); — disabled; arguments unevaluated. */
            if (mon)
                C.verbalize("%s", mail_text[C.rn2(3, 340, 'md_rush')]);
            else if (C.u_at(fx, fy))
                C.verbalize("Excuse me.");
        }

        if (mon)
            C.remove_monster(fx, fy);
        C.place_monster(md, fx, fy); /* put md down */
        C.newsym(fx, fy);            /* see it */
        C.flush_screen(0);           /* make sure md shows up */
        C.nh_delay_output();         /* wait a little bit */

        /* Remove md from the dungeon.  Restore original mon, if necessary. */
        C.remove_monster(fx, fy);
        if (mon) {
            if ((mon.mx != fx) || (mon.my != fy))
                C.place_worm_seg(mon, fx, fy);
            else
                C.place_monster(mon, fx, fy);
        }
        C.newsym(fx, fy);
    }

    /*
     * Check for a monster at our stopping position (this is possible, but
     * very unlikely).  If one exists, then have the md leave in disgust.
     */
    if ((mon = C.m_at(fx, fy)) != 0) {
        C.remove_monster(fx, fy);
        C.place_monster(md, fx, fy); /* display md with text below */
        C.newsym(fx, fy);
        if (!C.Deaf) {
            /* SetVoice(md, 0, 80, 0); — disabled; arguments unevaluated. */
            C.verbalize("This place's too crowded.  I'm outta here.");
        } else {
            C.pline("%s.", C.Never_mind);
        }
        C.remove_monster(fx, fy);

        if ((mon.mx != fx) || (mon.my != fy)) /* put mon back */
            C.place_worm_seg(mon, fx, fy);
        else
            C.place_monster(mon, fx, fy);

        C.newsym(fx, fy);
        return 0;
    }

    C.place_monster(md, fx, fy); /* place at final spot */
    C.newsym(fx, fy);
    C.flush_screen(0);
    C.nh_delay_output(); /* wait a little bit */

    return 1;
}

/* Deliver a scroll of mail. */
/*ARGSUSED*/
export function newmail(info)
{
    let md;
    const start = C.coordLocal(), stop = C.coordLocal();
    let message_seen = 0;

    // C give_up/go_back labels preserve their original destinations.
    give_up: {
    /* Try to find good starting and stopping places. */
    if (!C.callLocal(md_start, start) || !md_stop(stop, start))
        break give_up;

    /* Make the daemon.  Have it rush towards the hero. */
    if (!(md = C.makemon(C.mons[C.PM_MAIL_DAEMON], start.x, start.y, C.NO_MM_FLAGS)))
        break give_up;
    go_back: {
    if (!md_rush(md, stop.x, stop.y))
        break go_back;

    message_seen = 1;
    if (!C.Deaf) {
        /* SetVoice(md, 0, 80, 0); — disabled; arguments unevaluated. */
        C.verbalize("%s, %s!  %s.", C.Hello(md), C.svp.plname, info.display_txt);
    } else {
        C.pline("Message:  %s.", info.display_txt);
    }

    if (info.message_typ) {
        let obj = C.mksobj(C.SCR_MAIL, 0, 0);

        if (info.object_nam)
            obj = C.oname(obj, info.object_nam, C.ONAME_NO_FLAGS);
        if (info.response_cmd)
            C.new_omailcmd(obj, info.response_cmd);

        if (!C.m_next2u(md)) {
            if (!C.Deaf) {
                /* SetVoice(md, 0, 80, 0); — disabled; arguments unevaluated. */
                C.verbalize("Catch!");
            } else {
                /* don't bother with nonverbal alternative ... */
                ;
            }
        }
        C.display_nhwindow(C.WIN_MESSAGE, 0);
        obj = C.hold_another_object(obj, "Oops!", 0,
                                  0);
        /* nhUse(obj); — configured no-op */
    }

    } // go_back

    /* zip back to starting location */
    if (!md_rush(md, start.x, start.y))
        md.mx = md.my = 0; /* for mongone, md is not on map */
    C.mongone(md);

    } // give_up

    /* deliver some classes of messages even if no daemon ever shows up */
    if (!message_seen && info.message_typ == C.MSG_OTHER)
        C.pline("Hark!  \"%s.\"", info.display_txt);
}

export function ckmailstatus()
{
    ck_server_admin_msg();

    if (!C.mailState.mailbox || C.u.uswallow || !C.flags.biff
        || C.svm.moves < C.long(C.mailState.laststattime + BigInt(C.MAILCKFREQ))
        )
        return;

    C.mailState.laststattime = C.svm.moves;
    if (C.stat(C.mailState.mailbox, C.mailState.nmstat)) {
        C.mailState.nmstat.st_mtime = 0n;
    } else if (C.mailState.nmstat.st_mtime > C.mailState.omstat.st_mtime) {
        if (C.mailState.nmstat.st_size) {
            const deliver = C.mailState.deliver;
            C.callLocal(newmail, deliver);
        }
        getmailstatus(); /* might be too late ... */
    }
}

export function ck_server_admin_msg()
{
}

export function readmail(otmp)
{
    let mr = 0;
    if (C.iflags.debug_fuzzer)
        return;
    C.display_nhwindow(C.WIN_MESSAGE, 0);
    if (!(mr = C.nh_getenv("MAILREADER")))
        mr = C.DEF_MAILREADER;

    if (C.child(1)) {
        C.execl(mr, mr, 0);
        C.nh_terminate(C.EXIT_FAILURE);
    }

    /* get new stat; not entirely correct: there is a small time
       window where we do not see new mail */
    getmailstatus();
}

// Original comments from inactive platform branches/CPP annotations follow.
/* SIMPLE_MAIL */
/* MAIL */
/*
 * Notify user when new mail has arrived.  Idea by Merlyn Leroy.
 *
 * The mail daemon can move with less than usual restraint.  It can:
 *      - move diagonally from a door
 *      - use secret and closed doors
 *      - run through a monster ("Gangway!", etc.)
 *      - run over pools & traps
 *
 * Possible extensions:
 *      - Open the file MAIL and do fstat instead of stat for efficiency.
 *        (But sh uses stat, so this cannot be too bad.)
 *      - Examine the mail and produce a scroll of mail named "From somebody".
 *      - Invoke MAILREADER in such a way that only this single mail is read.
 *      - Do something to the text when the scroll is enchanted or cancelled.
 *      - Make the daemon always appear at a stairwell, and have it find a
 *        path to the hero.
 *
 * Note by Olaf Seibert: On the Amiga, we usually don't get mail.  So we go
 *                       through most of the effects at 'random' moments.
 * Note by Paul Winner:  The MSDOS port also 'fakes' the mail daemon at
 *                       random intervals.
 */
/* DON'T trust all Unices to declare getpwuid() in <pwd.h> */
/* DO trust all SVR4 to typedef uid_t in <sys/types.h> (probably to a long) */
/* Just a placeholder for AMS */
/* AMS */
/* MAILPATH */
/* set 'mailbox' to Null */
/* UNIX */
/* if TRUE, pick a position in sight. */
/* stopping position (we fill it in) */
/*** must be first entry ***/
/* when enclosed by "It reads:  \"...\"", this is too long
           for an ordinary 80-column display so wraps to a second line
           (suboptimal but works correctly);
           dollar sign and fractional zorkmids are inappropriate within
           nethack but are suitable for typical dysfunctional spam mail */
/* DEVTEAM_URL will be substituted for 2nd "%s";
           terminating punctuation (formerly "!") has deliberately been
           omitted so that it can't be mistaken for part of the URL
           (unfortunately that is still followed by a closing quote--in
           the pline below, not the data here) */
/* !UNIX && !VMS */
/* suppress creation and delivery of scroll of mail */
/* Allow this call to block. */
/* if incorrectly formatted, or message is empty (':' and '\n' take
           up 2 chars, so must have at least 3 to be nonempty), give up */
/* kill newline */
/* supply ending punctuation only if the message doesn't have any */
/* bail out _professionally_ */
/* SIMPLE_MAIL */
/* SERVER_ADMIN_MSG */
/* This implies that UNIX is defined */
/* DEF_MAILREADER */
/* SIMPLE_MAIL */
/* This implies that UNIX is defined */
/* AMS mailboxes are directories */
/* AMS */
/* DEF_MAILREADER */
/* UNIX */
/* process all trapped broadcasts [until] */
/* only handle one real message at a time */
/* can't access mail reader without spawning subprocess */
/* there should be a command in OMAILCMD */
/* strip trailing spaces */
/* use user entered command */
/* interactive escape */
/* SHELL */
/* VMS */
/* MAIL */
/*mail.c*/
