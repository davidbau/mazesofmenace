// js/files.js — port of src/files.c, the parts that read the tribute data
// file at runtime: read_tribute(), choose_passage() and Death_quote(). The
// file itself is embedded verbatim by tools/gen-datafiles.mjs.
import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { dlb_fopen, dlb_fgets } from './rumors.js';
import { You_feel } from './pline.js';
import { pline } from './display.js';
import { mungspaces } from './hacklib.js';
import { tty_create_nhwindow, tty_putstr, tty_display_nhwindow,
         tty_destroy_nhwindow } from './tty/wintty.js';
import { putmsghistory } from './tty/topl.js';
import { NHW_MENU } from './const.js';

/* src/files.c:3424 */
const MAXPASSAGES = 20; /* SIZE(svc.context.novel.pasg) */

const SECTIONSCOPE = 1, TITLESCOPE = 2, PASSAGESCOPE = 3;

// src/files.c:3426 choose_passage() — pick one of the passages for a book;
// the same book hands out each passage once before repeating.
function choose_passage(passagecnt, /* total of available passages */
                        oid)        /* book.o_id, used to determine whether
                                       re-reading same book */
{
    let idx, res;
    const novel = ((game.context ||= {}).novel ||= { id: 0, count: 0, pasg: new Array(MAXPASSAGES).fill(0) });

    if (passagecnt < 1)
        return 0;

    /* if a different book or we've used up all the passages already,
       reset in order to have all 'passagecnt' passages available */
    if (oid !== novel.id || novel.count === 0) {
        let i, range = passagecnt, limit = MAXPASSAGES;

        novel.id = oid;
        if (range <= limit) {
            /* collect all of the N indices */
            novel.count = passagecnt;
            for (idx = 0; idx < MAXPASSAGES; idx++)
                novel.pasg[idx] = (idx < passagecnt) ? idx + 1 : 0;
        } else {
            /* collect MAXPASSAGES of the N indices */
            novel.count = MAXPASSAGES;
            for (idx = i = 0; i < passagecnt; ++i, --range)
                if (range > 0 && rn2(range) < limit) {
                    novel.pasg[idx++] = i + 1;
                    --limit;
                }
        }
    }

    idx = rn2(novel.count);
    res = novel.pasg[idx];
    /* move the last slot's passage index into the slot just used
       and reduce the number of passages available */
    novel.pasg[idx] = novel.pasg[--novel.count];
    return res;
}

// src/files.c:3474 read_tribute() — returns True if you were able to read
// something. With nowin_buf (a box {v}) the passage is fetched as one line
// instead of being shown in a window.
export async function read_tribute(tribsection, tribtitle, tribpassage,
                                   nowin_buf, bufsz, oid /* book identifier */)
{
    let line, lastline = '';
    let scope = 0;
    let linect = 0, passagecnt = 0, targetpassage = 0;
    const badtranslation = 'an incomprehensible foreign translation';
    let matchedsection = false, matchedtitle = false;
    let tribwin = null;
    let grasped = false;
    let foundpassage = false;

    if (nowin_buf)
        nowin_buf.v = '';

    /* check for mandatories */
    if (!tribsection || !tribtitle) {
        if (!nowin_buf)
            await pline(`It's ${badtranslation} of "${tribtitle}"!`);
        return grasped;
    }

    const fp = dlb_fopen('tribute');
    if (!fp) {
        /* this is actually an error - cannot open tribute file! */
        if (!nowin_buf)
            await You_feel('too overwhelmed to continue!');
        return grasped;
    }

    /*
     * Syntax (not case-sensitive):
     *  %section books
     *
     * In the books section:
     *    %title booktitle (n)
     *          where booktitle=book title without quotes
     *          (n)= total number of passages present for this title
     *    %passage k
     *          where k=sequential passage number
     *
     * %e ends the passage/book/section
     *    If in a passage, it marks the end of that passage.
     *    If in a book, it marks the end of that book.
     *    If in a section, it marks the end of that section.
     *
     *  %section death
     */
    const ieq = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();
    const istarts = (s, pfx) => s.slice(0, pfx.length).toLowerCase() === pfx.toLowerCase();
    let done = false;
    while (!done && (line = dlb_fgets(fp)) != null) {
        linect++;
        line = line.replace(/\r?\n$/, ''); /* strip_newline() */
        switch (line[0]) {
        case '%':
            if (istarts(line.slice(1), 'section ')) {
                const st = line.slice(9); /* 9 from "%section " */

                scope = SECTIONSCOPE;
                matchedsection = ieq(st, tribsection);
            } else if (istarts(line.slice(1), 'title ')) {
                let st = line.slice(7); /* 7 from "%title " */
                const p1 = st.indexOf('(');

                if (p1 >= 0) {
                    let rest = st.slice(p1 + 1);
                    st = mungspaces(st.slice(0, p1));
                    const p2 = rest.indexOf(')');
                    if (p2 >= 0) {
                        rest = rest.slice(0, p2);
                        passagecnt = parseInt(rest, 10) || 0;
                        scope = TITLESCOPE;
                        if (matchedsection && ieq(st, tribtitle)) {
                            matchedtitle = true;
                            targetpassage = !tribpassage
                                             ? choose_passage(passagecnt, oid)
                                             : (tribpassage <= passagecnt)
                                                ? tribpassage : 0;
                        } else {
                            matchedtitle = false;
                        }
                    }
                }
            } else if (istarts(line.slice(1), 'passage ')) {
                let passagenum = 0;
                let st = line.slice(9); /* 9 from "%passage " */

                st = mungspaces(st);
                passagenum = parseInt(st, 10) || 0;
                if (passagenum > 0 && passagenum <= passagecnt) {
                    scope = PASSAGESCOPE;
                    if (matchedtitle && passagenum === targetpassage) {
                        foundpassage = true;
                        if (!nowin_buf) {
                            tribwin = tty_create_nhwindow(NHW_MENU);
                        }
                    }
                }
            } else if (istarts(line.slice(1), 'e ')) {
                if (foundpassage) {
                    done = true; /* goto cleanup */
                    break;
                }
                if (scope === TITLESCOPE)
                    matchedtitle = false;
                if (scope === SECTIONSCOPE)
                    matchedsection = false;
                if (scope)
                    --scope;
            } else {
                /* debugpline1("tribute file error: bad %% command, line %d.", linect) */
            }
            break;
        case '#':
            /* comment only, next! */
            break;
        default:
            if (foundpassage) {
                if (!nowin_buf) {
                    /* outputting multi-line passage to text window */
                    tty_putstr(tribwin, 0, line);
                    if (line)
                        lastline = line;
                } else {
                    /* fetching one-line passage into buffer */
                    nowin_buf.v = line.slice(0, bufsz - 1); /* copynchars() */
                    done = true; /* goto cleanup: don't wait for "%e passage" */
                }
            }
        }
    }
 /* cleanup: */
    if (nowin_buf) {
        /* one-line buffer */
        grasped = nowin_buf.v ? true : false;
    } else {
        if (tribwin != null) { /* implies 'foundpassage' */
            /* multi-line window, normal case;
               if lastline is empty, there were no non-empty lines between
               "%passage n" and "%e passage" so we leave 'grasped' False */
            if (lastline) {
                await tty_display_nhwindow(tribwin);
                /* put the final attribution line into message history,
                   analogous to the summary line from long quest messages */
                if (lastline.includes('['))
                    lastline = mungspaces(lastline); /* to remove leading spaces */
                else /* construct one if necessary */
                    lastline = `[${tribtitle}, by Terry Pratchett]`;
                const p = lastline.lastIndexOf(']');
                if (p >= 0)
                    lastline = lastline.slice(0, p) + `; passage #${targetpassage}]`;
                putmsghistory(lastline, false);
                grasped = true;
            }
            tty_destroy_nhwindow(tribwin);
        }
        if (!grasped)
            /* multi-line window, problem */
            await pline(`It seems to be ${badtranslation} of "${tribtitle}"!`);
    }
    return grasped;
}

// src/files.c:3656 Death_quote() — one line from the Death Quotes section.
export async function Death_quote(bufsz) {
    const death_oid = 1; /* chance of oid #1 being a novel is negligible */
    const buf = { v: '' };

    const ok = await read_tribute('Death', 'Death Quotes', 0, buf, bufsz, death_oid);
    return ok ? buf.v : null;
}
