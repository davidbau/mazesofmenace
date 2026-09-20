// mail.js — mail-daemon delivery (newmail + md_start/md_stop/md_rush).
// C ref: nethack-c/upstream/src/mail.c newmail `:399–456`, static
// md_start `:148–239`, md_stop `:247–274`, md_rush `:287–394`,
// mail_text/md_exclamations `:277–279`, mail.h MSG_*.
//
// Branch envelope: readmail (UNIX + DEF_MAILREADER arm, `:703–733`;
// SIMPLE_MAIL undefined per unixconf.h) + read_simplemail (`:589–680`,
// SIMPLE_MAIL/SERVER_ADMIN_MSG source-level body; both undefined per
// unixconf.h:200/211, so C compiles neither it nor its callers) + newmail
// daemon delivery.
// Named omissions: MAILREADER child/execl subprocess + getmailstatus stat()
// (Contest Rule #2: no subprocess/filesystem in scored js/); SIMPLE_MAIL /
// AMS / VMS / !UNIX fake-junk-mail arms compiled out in this build;
// ckmailstatus UNIX-mustgetmail/stat/broadcast variants (no mailbox stat or
// broadcast queue in scored JS); newphone (shares md_start/md_stop when
// ported).

import { game } from './gstate.js';
import {
    flush_topl_more, verbalize, pline, There, urgent_pline, newsym,
    flush_screen, nh_delay_output,
} from './display.js';
import { vfsReadFile, vfsDeleteFile } from './storage.js';
import { rn2 } from './rng.js';
import { isok, dist2 } from './hacklib.js';
import {
    u_at, IS_STWALL, ROWNO, MSG_OTHER, ONAME_NO_FLAGS, NO_MM_FLAGS,
    Never_mind,
} from './const.js';
import { couldsee, cansee } from './vision.js';
import { enexto } from './teleport.js';
import { accessible } from './monmove.js';
import { makemon } from './makemon.js';
import { mons, monsterNames } from './monsters.js';
import { objectNames } from './objects.js';
import { Hello } from './roles.js';
import { SetVoice } from './sndprocs.js';
import { mksobj, new_omailcmd } from './mkobj.js';
import { oname } from './do_name.js';
import { hold_another_object } from './invent.js';
import { m_at, mongone } from './mon.js';
import { place_monster, remove_monster } from './steed.js';
import { place_worm_seg } from './worm.js';

const PM_MAIL_DAEMON = monsterNames.indexOf('PM_MAIL_DAEMON');
const SCR_MAIL = objectNames.indexOf('SCR_MAIL');

/** C ref: youprop.h Deaf — HDeaf || EDeaf (music.js:102 idiom). */
function Deaf() {
    const u = game.u || {};
    return !!((u.HDeaf | 0) || (u.EDeaf | 0) || u.uroleplay?.deaf || u.Deaf);
}

/** C ref: prop.h Blind — HBlinded || EBlinded, !BBlinded (apply.js:854). */
function Blind() {
    const u = game.u || {};
    if (u.uroleplay?.blind) return true;
    return !!(((u.HBlinded | 0) || (u.EBlinded | 0)) && !(u.BBlinded | 0));
}

/** C ref: youprop.h Blind_telepat — HTelepat || ETelepat (monmove.js:678). */
function Blind_telepat() {
    const u = game.u || {};
    return !!((u.HTelepat | 0) || (u.ETelepat | 0) || u.Blind_telepat);
}

/** C ref: hack.h distu — dist2(x, y, u.ux, u.uy) (dbridge.js:85 idiom). */
function distu(x, y) {
    const u = game.u || {};
    return dist2(u.ux | 0, u.uy | 0, x | 0, y | 0);
}

/* C ref: mail.c mail_text `:277–279` + md_exclamations `:279` (rn2(3)). */
const mail_text = ['Gangway!', 'Look out!', 'Pardon me!'];
function md_exclamations() {
    return mail_text[rn2(3)];
}

/**
 * C mail.c md_start `:148–239` — pick daemon start coords. Blind without
 * telepathy: nearby square (hero won't see it anyway). Else a stairwell in
 * sight of the hero; else the farthest seen row-edge with an adjacent
 * out-of-sight couldsee square (lax retry: the farthest seen edge itself).
 * gv.viz_rmin/rmax read as game._viz_rmin/_viz_rmax (vision.js); a missing
 * row is no valid position on that row (JS may be null pre-recalc; C arrays
 * are always set) — then FALSE like C's found-nothing path.
 */
function md_start(startp) {
    const u = game.u || {};
    /* blind and not telepathic: position doesn't matter, pick nearby */
    if (Blind() && !Blind_telepat()) {
        if (!enexto(startp, u.ux, u.uy, null)) return false;
        return true;
    }
    /* arrive at an up/down stairwell in sight of the hero */
    for (let stway = game.stairs; stway; stway = stway.next) {
        if ((stway.tolev?.dnum | 0) === (u.uz?.dnum | 0)
            && couldsee(stway.sx, stway.sy)) {
            startp.x = stway.sx;
            startp.y = stway.sy;
            return true;
        }
    }
    /* farthest seen position with an out-of-sight neighbour, else farthest */
    const testcc = { x: 0, y: 0 };
    let lax = 0;
    let max_distance = -1;
    for (;;) { /* C retry: label */
        for (let row = 0; row < ROWNO; row++) {
            const rmin = game._viz_rmin?.[row];
            const rmax = game._viz_rmax?.[row];
            if (rmin == null || rmax == null || !(rmin < rmax)) continue;
            let dd = distu(rmin, row);
            if (dd > max_distance) {
                if (lax) {
                    max_distance = dd;
                    startp.y = row;
                    startp.x = rmin;
                } else if (enexto(testcc, rmin, row, null)
                    && !cansee(testcc.x, testcc.y)
                    && couldsee(testcc.x, testcc.y)) {
                    max_distance = dd;
                    startp.x = testcc.x;
                    startp.y = testcc.y;
                }
            }
            dd = distu(rmax, row);
            if (dd > max_distance) {
                if (lax) {
                    max_distance = dd;
                    startp.y = row;
                    startp.x = rmax;
                } else if (enexto(testcc, rmax, row, null)
                    && !cansee(testcc.x, testcc.y)
                    && couldsee(testcc.x, testcc.y)) {
                    max_distance = dd;
                    startp.x = testcc.x;
                    startp.y = testcc.y;
                }
            }
        }
        if (max_distance < 0) {
            if (!lax) {
                lax = 1;
                continue; /* C: goto retry */
            }
            return false;
        }
        return true;
    }
}

/**
 * C mail.c md_stop `:247–274` — stopping square next to the hero: the
 * accessible unoccupied neighbour closest to start (ties broken by rn2(2)),
 * else enexto for the mail daemon. C MON_AT (unburied map occupant) reads
 * as m_at (mklev.js:18897 precedent).
 */
function md_stop(stopp, startp) {
    const u = game.u || {};
    const ux = u.ux | 0;
    const uy = u.uy | 0;
    let min_distance = -1;
    for (let x = ux - 1; x <= ux + 1; x++) {
        for (let y = uy - 1; y <= uy + 1; y++) {
            if (!isok(x, y) || u_at(x, y)) continue;
            if (accessible(x, y) && !m_at(x, y)) {
                const distance = dist2(x, y, startp.x, startp.y);
                if (min_distance < 0 || distance < min_distance
                    || (distance === min_distance && rn2(2))) {
                    stopp.x = x;
                    stopp.y = y;
                    min_distance = distance;
                }
            }
        }
    }
    /* no good spot: try enexto() */
    if (min_distance < 0 && !enexto(stopp, u.ux, u.uy, mons(PM_MAIL_DAEMON))) {
        return false;
    }
    return true;
}

/**
 * C mail.c md_rush `:287–394` — walk the daemon to (tx,ty) off-map: each
 * step takes the neighbour closest to the target that is in bounds and not
 * stone wall (diagonals, doors, pools, traps all allowed), displacing any
 * monster with a shout (or "Excuse me." through the hero), showing each
 * step. A crowded destination refuses (FALSE); else the daemon is placed
 * at the final spot (TRUE). Displaced worm segs restore via place_worm_seg
 * (worm.js), other monsters via place_monster — the C mx/my test verbatim.
 * Async only because verbalize/pline/flush_screen/nh_delay_output can reach
 * nhgetch; no physics is deferred or reordered.
 */
async function md_rush(md, tx, ty) {
    let fx = md.mx;
    let fy = md.my;
    let nfx = fx;
    let nfy = fy;
    let d1;
    let d2;
    /* md may be off-map when starting back after a failed rush */
    if (m_at(fx, fy) === md) {
        remove_monster(fx, fy);
        newsym(fx, fy);
    }
    /* at loop head and exit, md is not placed in the dungeon */
    for (;;) {
        /* neighbour of (fx,fy) closest to (tx,ty) */
        d1 = dist2(fx, fy, tx, ty);
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if ((dx || dy) && isok(fx + dx, fy + dy)
                    && !IS_STWALL(game.level?.at(fx + dx, fy + dy)?.typ)) {
                    d2 = dist2(fx + dx, fy + dy, tx, ty);
                    if (d2 < d1) {
                        d1 = d2;
                        nfx = fx + dx;
                        nfy = fy + dy;
                    }
                }
            }
        }
        /* md couldn't find a new position */
        if (nfx === fx && nfy === fy) break;
        fx = nfx;
        fy = nfy;
        /* md reaches its destination */
        if (fx === tx && fy === ty) break;
        const mon = m_at(fx, fy);
        if (!Deaf()) {
            SetVoice(md, 0, 80, 0);
            if (mon) await verbalize('%s', md_exclamations());
            else if (u_at(fx, fy)) await verbalize('Excuse me.');
        }
        if (mon) remove_monster(fx, fy);
        place_monster(md, fx, fy);
        newsym(fx, fy);
        await flush_screen(0);
        await nh_delay_output();
        /* remove md; restore the displaced monster if any */
        remove_monster(fx, fy);
        if (mon) {
            if (mon.mx !== fx || mon.my !== fy) place_worm_seg(mon, fx, fy);
            else place_monster(mon, fx, fy);
        }
        newsym(fx, fy);
    }
    /* monster at the stopping position: leave in disgust */
    const endmon = m_at(fx, fy);
    if (endmon) {
        remove_monster(fx, fy);
        place_monster(md, fx, fy);
        newsym(fx, fy);
        if (!Deaf()) {
            SetVoice(md, 0, 80, 0);
            await verbalize("This place's too crowded.  I'm outta here.");
        } else {
            await pline('%s.', Never_mind);
        }
        remove_monster(fx, fy);
        if (endmon.mx !== fx || endmon.my !== fy) {
            place_worm_seg(endmon, fx, fy);
        } else {
            place_monster(endmon, fx, fy);
        }
        newsym(fx, fy);
        return false;
    }
    place_monster(md, fx, fy);
    newsym(fx, fy);
    await flush_screen(0);
    await nh_delay_output();
    return true;
}

/**
 * C mail.c readmail `:703–733` (UNIX + DEF_MAILREADER; SIMPLE_MAIL off).
 * Order: debug_fuzzer early return, then display_nhwindow(WIN_MESSAGE,
 * FALSE), then the MAILREADER child/execl spawn, then getmailstatus().
 * The spawn (nh_getenv/child/execl) and the stat-based getmailstatus are
 * named omits (Rule #2); the portable remainder is the fuzzer guard plus
 * the message-window flush.
 */
export async function readmail(otmp) {
    void otmp; // C ARGSUSED: struct obj *otmp UNUSED
    if (game.iflags?.debug_fuzzer) return;
    await flush_topl_more(); /* C: display_nhwindow(WIN_MESSAGE, FALSE) */
}

/**
 * C mail.c read_simplemail `:589–680` — read `sender:message` lines from a
 * mail spool file, one mail per line. Guarded in C by
 * `#if defined(SIMPLE_MAIL) || defined(SERVER_ADMIN_MSG)` (`:586`); both
 * are undefined per unixconf.h:200/211, so this build compiles neither the
 * body nor its callers (`:696` ck_server_admin_msg adminmsg=TRUE,
 * `:710` readmail adminmsg=FALSE — both inside the same ifdefs). The port
 * below follows the SIMPLE_MAIL source-level body in C order so a
 * SIMPLE_MAIL build's scroll-mail path has a live target; Rule #2 reads the
 * spool through the storage VFS, never `fs` (fopen_wizkit_file precedent).
 * Async only because There/pline/urgent_pline/flush can reach nhgetch; no
 * physics is deferred or reordered.
 */

/* C `:615` while (fgets(curline, 128, mb)): fgets yields ≤127 chars per
   call, cutting early after '\n' with the newline kept in the chunk, so a
   long line arrives as several chunks. Split VFS text the same way. */
function fgets128_chunks(text) {
    const chunks = [];
    let i = 0;
    while (i < text.length) {
        let end = Math.min(i + 127, text.length);
        const nl = text.indexOf('\n', i);
        if (nl >= 0 && nl < end) end = nl + 1;
        chunks.push(text.slice(i, end));
        i = end;
    }
    return chunks;
}

export async function read_simplemail(mbox, adminmsg) {
    /* C `:591` fopen(mbox, "r") — VFS miss ≡ C fopen NULL. */
    const text = vfsReadFile(mbox);
    let seen_one_already = false; /* C `:593` */
    /* C `:594–596` struct flock + `:601–606`/`:611–613` initial RDLCK: no JS
       counterpart — the single-threaded game loop with an atomic VFS read
       needs no advisory locking (named omit in the map). */
    /* C `bail:` — _professionally_: skips fclose (C even leaks the FILE on
       the mid-loop bail); nothing to close over VFS. */
    const bail = async () => {
        if (!adminmsg) await pline('It appears to be all gibberish.');
    };
    if (text == null) { /* C `:598–599` if (!mb) goto bail */
        await bail();
        return;
    }
    /* C `:607–613` "Allow this call to block": !adminmsg && blocking-lock
       fails → bail. The lock always succeeds over VFS (see above), so the
       gate never fires — the SIMPLE_MAIL lock-success path. */
    for (const chunk of fgets128_chunks(String(text))) {
        const curline = chunk;
        if (!adminmsg) {
            /* C `:622–627` unlock around There: lock no-op (see above). */
            await There('is a%s message on this scroll.', /* C `:628–629` */
                        seen_one_already ? 'nother' : '');
        }
        const colon = curline.indexOf(':'); /* C `:631` strchr(curline, ':') */
        /* C `:632–634` no colon, or ':' + '\n' only (msglen < 3) → bail:
           rest must hold ≥2 chars (message char + newline-or-tail). */
        if (colon < 0 || curline.length - colon < 3) {
            await bail();
            return;
        }
        /* C `:636–638` split sender/message, kill the trailing newline (or
           the chunk's last char when fgets split a long line or the file
           lacks a final newline — slice(0, -1) does both verbatim). */
        /* C `:636` *msg = '\0' ends the sender string here. */
        const sender = curline.slice(0, colon);
        const msg = chunk.slice(colon + 1, -1);
        /* C `:641–643` punctuation the message lacks: msg[msglen - 2] is the
           message's last char after the kill above. */
        const endpunct = '.!?'.includes(msg[msg.length - 1]) ? '' : '.';
        if (adminmsg) {
            await urgent_pline( /* C `:645–648` */
                'The voice of %s booms through the caverns:', sender);
        } else {
            await pline("This message is from '%s'.", sender); /* C `:650` */
            await pline('It reads:'); /* C `:651` */
        }
        await pline('"%s"%s', msg, endpunct); /* C `:653` */
        seen_one_already = true; /* C `:655` */
        /* C `:656–662` re-lock: lock no-op (see above). */
    }
    /* C `:664–669` final unlock: lock no-op; `:670` fclose: nothing to
       close over VFS. */
    if (adminmsg) {
        /* C `:671–672` display_nhwindow(WIN_MESSAGE, TRUE) — flush pending
           --More-- (dig.js:1705 precedent). */
        await flush_topl_more();
    } else {
        /* C `:673–674` unlink(mailbox) — the C global set by getmailstatus
           (no JS counterpart, readmail D-1958 named omit); the only FALSE
           caller passes mailbox itself as mbox, so the passed path doubles
           as C's global. */
        vfsDeleteFile(mbox);
    }
}

/**
 * C mail.c newmail `:399–456` — mail-daemon delivery of info
 * {message_typ, display_txt, object_nam, response_cmd} (mail.h). Find
 * start/stop (give_up when none, or makemon fails); rush to the hero,
 * greet (Deaf: flat pline), hand over a SCR_MAIL scroll when message_typ
 * (named via object_nam, wired via response_cmd, "Catch!" when the daemon
 * is not adjacent — C !m_next2u, i.e. distu > 2 — Deaf has no nonverbal
 * alternative, as C), then zip back and mongone. MSG_OTHER with no daemon
 * still arrives ("Hark!"). display_nhwindow(WIN_MESSAGE, FALSE) reads as
 * flush_topl_more (readmail precedent); nhUse(obj) is void obj. C goto
 * structure (give_up/go_back) reads as the nested-if below: the message
 * block runs only when the inward rush succeeds, the zip-back whenever the
 * daemon was made, the Hark! fallback whenever nothing was seen.
 */
export async function newmail(info) {
    const start = { x: 0, y: 0 };
    const stop = { x: 0, y: 0 };
    let message_seen = false;
    /* C: if (!md_start(&start) || !md_stop(&stop, &start)) goto give_up */
    const md = (md_start(start) && md_stop(stop, start))
        ? makemon(mons(PM_MAIL_DAEMON), start.x, start.y, NO_MM_FLAGS)
        : null;
    if (md) {
        if (await md_rush(md, stop.x, stop.y)) {
            message_seen = true;
            if (!Deaf()) {
                SetVoice(md, 0, 80, 0);
                await verbalize(
                    '%s, %s!  %s.',
                    Hello(md),
                    game.plname || 'Hero',
                    info.display_txt,
                );
            } else {
                await pline('Message:  %s.', info.display_txt);
            }
            if (info.message_typ) {
                let obj = mksobj(SCR_MAIL, false, false);
                if (info.object_nam) {
                    obj = oname(obj, info.object_nam, ONAME_NO_FLAGS);
                }
                if (info.response_cmd) new_omailcmd(obj, info.response_cmd);
                if (distu(md.mx, md.my) > 2) { /* C: !m_next2u(md) */
                    if (!Deaf()) {
                        SetVoice(md, 0, 80, 0);
                        await verbalize('Catch!');
                    } else {
                        /* C: don't bother with nonverbal alternative ... */
                    }
                }
                await flush_topl_more();
                obj = await hold_another_object(obj, 'Oops!', null, null);
                void obj; /* C: nhUse(obj) */
            }
        }
        /* C go_back: zip back to starting location */
        if (!(await md_rush(md, start.x, start.y))) {
            md.mx = 0;
            md.my = 0; /* for mongone, md is not on map */
        }
        await mongone(md);
    }
    /* C give_up: deliver MSG_OTHER even if no daemon ever shows up */
    if (!message_seen && info.message_typ === MSG_OTHER) {
        await pline('Hark!  "%s."', info.display_txt);
    }
}

