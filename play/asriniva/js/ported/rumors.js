/* NetHack 5.0	rumors.c	$NHDT-Date: 1594370241 2020/07/10 08:37:21 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.56 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Robert Patrick Rankin, 2012. */
/* NetHack may be freely redistributed.  See license for details. */

import { C } from '../c-runtime/context.js';


"hack.h"

"dlb.h"

/*      [Note:  this comment is fairly old, but still accurate for 3.1;
 *       it's no longer accurate for 5.0 but may still be of interest.]
 * Rumors have been entirely rewritten to speed up the access.  This is
 * essential when working from floppies.  Using fseek() the way that's done
 * here means rumors following longer rumors are output more often than those
 * following shorter rumors.  Also, you may see the same rumor more than once
 * in a particular game (although the odds are highly against it), but
 * this also happens with real fortune cookies.  -dgk
 */

/*      3.6
 * The rumors file consists of a "do not edit" line, then a line containing
 * three sets of three counts (first two in decimal, third in hexadecimal).
 * The first set has the number of true rumors, the count in bytes for all
 * true rumors, and the file offset to the first one.  The second set has
 * the same group of numbers for the false rumors.  The third set has 0 for
 * count, 0 for size, and the file offset for end-of-file.  The offset of
 * the first true rumor plus the size of the true rumors matches the offset
 * of the first false rumor.  Likewise, the offset of the first false rumor
 * plus the size of the false rumors matches the offset for end-of-file.
 */

/*      3.1     [now obsolete for rumors but still accurate for oracles]
 * The rumors file consists of a "do not edit" line, a hexadecimal number
 * giving the number of bytes of useful/true rumors, followed by those
 * true rumors (one per line), followed by the useless/false/misleading/cute
 * rumors (also one per line).  Number of bytes of untrue rumors is derived
 * via fseek(EOF)+ftell().
 *
 * The oracles file consists of a "do not edit" comment, a decimal count N
 * and set of N+1 hexadecimal fseek offsets, followed by N multiple-line
 * records, separated by "---" lines.  The first oracle is a special case,
 * and placed there by 'makedefs'.
 */











/* used by CapitalMon(); set up by init_CapMons(), released by free_CapMons();
   there's no need for these to be put into 'struct instance_globals g' */
/* CapMonstCnt+CapBogonCnt+1 when non-zero */

/* list of bogusmons prefixes used to indicate special monster type such as
   unique or always a particular gender; see dat/bogusmon.txt */
 /* from do_name.c */

/* makedefs pads short rumors, epitaphs, engravings, and hallucinatory
   monster names with trailing underscores; strip those off */
export function unpadline(line)
{
    let p = C.eos(line);

    /* remove newline if still present; caller should have stripped it */
    if (p > line && C.loadChar(p - 1) == '\n'.charCodeAt(0))
        --p;

    /* remove padding */
    while (p > line && C.loadChar(p - 1) == '_'.charCodeAt(0))
        --p;

    C.storeChar(p, '\0'.charCodeAt(0));
}


export function init_rumors(fp)
{
    const rumors_header = "%d,%ld,%lx;%d,%ld,%lx;0,0,%lx\n";
    let true_count = C.intLocal(), false_count = C.intLocal(); /* in file but not used here */
    let eof_offset = C.ulongLocal();
    let line = C.stackAlloc(C.BUFSZ);

    C.dlb_fgets(line, C.BUFSZ, fp); /* skip "don't edit" comment */
    C.dlb_fgets(line, C.BUFSZ, fp);
    if (C.sscanf(line, rumors_header, true_count, C.ref(C.gt, "true_rumor_size"),
               C.ref(C.gt, "true_rumor_start"), false_count, C.ref(C.gf, "false_rumor_size"),
               C.ref(C.gf, "false_rumor_start"), eof_offset) == 7
        && C.gt.true_rumor_size > 0n
        && C.gf.false_rumor_size > 0n) {
        C.gt.true_rumor_end = C.long(C.long(C.gt.true_rumor_start) + C.gt.true_rumor_size);
        /* assert( gt.true_rumor_end == false_rumor_start ); */
        C.gf.false_rumor_end = C.long(C.long(C.gf.false_rumor_start) + C.gf.false_rumor_size);
        /* assert( gf.false_rumor_end == eof_offset ); */
    } else {
        C.gt.true_rumor_size = -1n; /* init failed */
        C.dlb_fclose(fp);
    }
}


/* exclude_cookie is a hack used because we sometimes want to get rumors in a
 * context where messages such as "You swallowed the fortune!" that refer to
 * cookies should not appear.  This has no effect for true rumors since none
 * of them contain such references anyway.
 */
export function getrumor(
    truth, /* 1=true, -1=false, 0=either */
    rumor_buf,
    exclude_cookie)
{
    truth = C.int(truth);
    exclude_cookie = C.boolean(exclude_cookie);
    let rumors;
    let beginning, ending;
    let line = C.stackAlloc(C.BUFSZ);
    const cookie_marker = "[cookie] ";
    const marklen = C.strlen(cookie_marker);

    C.storeChar(rumor_buf, '\0'.charCodeAt(0));
    if (C.gt.true_rumor_size < 0n) /* a previous try failed to open RUMORFILE */
        return rumor_buf;

    rumors = C.dlb_fopen(C.RUMORFILE, "r");
    if (rumors) {
        let count = 0;
        let adjtruth;

        do {
            C.storeChar(rumor_buf, '\0'.charCodeAt(0));
            if (C.gt.true_rumor_size == 0n) { /* if this is 1st outrumor() */
                C.callLocal(init_rumors, rumors);
                if (C.gt.true_rumor_size < 0n) { /* init failed */
                    C.Sprintf(rumor_buf, "Error reading \"%.80s\".", C.RUMORFILE);
                    return rumor_buf;
                }
            }
            /*
             *  input:      1    0   -1
             *   rn2 \ +1  2=T  1=T  0=F
             *   adj./ +0  1=T  0=F -1=F
             */
            switch (adjtruth = C.int(truth + C.rn2(2, 151, 0))) {
            case 2: /*(might let a bogus input arg sneak thru)*/
            case 1:
                beginning = C.long(C.gt.true_rumor_start);
                ending = C.gt.true_rumor_end;
                break;
            case 0: /* once here, 0 => false rather than "either"*/
            case -1:
                beginning = C.long(C.gf.false_rumor_start);
                ending = C.gf.false_rumor_end;
                break;
            default:
                C.impossible("strange truth value for rumor");
                return C.strcpy(rumor_buf, "Oops...");
            }
            C.Strcpy(rumor_buf,
                   C.callLocal(get_rnd_line, rumors, line, C.uint(C.BUFSZ), C.rn2,
                                beginning, ending, C.MD_PAD_RUMORS));
        } while (count++ < 50 && exclude_cookie
                 && !C.strncmp(rumor_buf, cookie_marker, marklen));
        C.dlb_fclose(rumors);
        if (count >= 50)
            C.impossible("Can't find non-cookie rumor?");
        else if (!C.gi.in_mklev) /* avoid exercising wisdom for graffiti */
            C.exercise(C.A_WIS, (adjtruth > 0));
    } else {
        couldnt_open_file(C.RUMORFILE);
        C.gt.true_rumor_size = -1n; /* don't try to open it again */
    }
    if (!exclude_cookie
        && !C.strncmp(rumor_buf, cookie_marker, marklen)) {
        /* remove cookie_marker from the string */
    let src = rumor_buf + marklen;
    let dst = rumor_buf;
        for (; C.loadChar(src) != '\0'.charCodeAt(0); ++src, ++dst) {
            C.storeChar(dst, C.loadChar(src));
        }
        C.storeChar(dst, '\0'.charCodeAt(0)); /* terminator wasn't copied */
    }
    return rumor_buf;
}

/* test that the true/false rumor boundaries are valid and show the first
   two and very last epitaphs, engravings, and bogus monsters */
export function rumor_check()
{
    let rumors;
    let tmpwin = C.winLocal();
    tmpwin.value = C.WIN_ERR;
    let endp, line = C.stackAlloc(C.BUFSZ), xbuf = C.stackAlloc(C.BUFSZ), rumor_buf = C.stackAlloc(C.BUFSZ);

    rumors = (C.gt.true_rumor_size >= 0) ? C.dlb_fopen(C.RUMORFILE, "r") : 0;
 no_rumors: {
    if (rumors) {
        let ftell_rumor_start = 0n;

        C.storeChar(rumor_buf, '\0'.charCodeAt(0));
        if (C.gt.true_rumor_size == 0n) { /* if this is 1st outrumor() */
            C.callLocal(init_rumors, rumors);
            if (C.gt.true_rumor_size < 0n) {
                rumors = 0; /* init_rumors() closes it upon failure */
                break no_rumors; /* init failed */
            }
        }
        tmpwin.value = C.create_nhwindow(C.NHW_TEXT);

        /*
         * reveal the values.
         */
        C.Sprintf(rumor_buf,
               "T start=%06ld (%06lx), end=%06ld (%06lx), size=%06ld (%06lx)",
            C.long(C.gt.true_rumor_start), C.gt.true_rumor_start,
            C.gt.true_rumor_end, C.ulong(C.gt.true_rumor_end),
            C.gt.true_rumor_size,C.ulong(C.gt.true_rumor_size));
        C.putstr(tmpwin.value, 0, rumor_buf);
        C.Sprintf(rumor_buf,
               "F start=%06ld (%06lx), end=%06ld (%06lx), size=%06ld (%06lx)",
            C.long(C.gf.false_rumor_start), C.gf.false_rumor_start,
            C.gf.false_rumor_end, C.ulong(C.gf.false_rumor_end),
            C.gf.false_rumor_size, C.ulong(C.gf.false_rumor_size));
        C.putstr(tmpwin.value, 0, rumor_buf);

        /*
         * check the first rumor (start of true rumors) by
         * skipping the first two lines.
         *
         * Then seek to the start of the false rumors (based on
         * the value read in rumors, and display it.
         */
        C.storeChar(rumor_buf, '\0'.charCodeAt(0));
        C.dlb_fseek(rumors, C.long(C.gt.true_rumor_start), C.SEEK_SET);
        ftell_rumor_start = C.dlb_ftell(rumors);
        C.dlb_fgets(line, C.BUFSZ, rumors);
        if ((endp = C.strchr(line, '\n'.charCodeAt(0))) != 0)
            C.storeChar(endp, 0);
        C.Sprintf(rumor_buf, "T %06ld %s", ftell_rumor_start,
                C.xcrypt(line, xbuf));
        C.putstr(tmpwin.value, 0, rumor_buf);
        /* find last true rumor */
        while (C.dlb_fgets(line, C.BUFSZ, rumors)
               && C.dlb_ftell(rumors) < C.gt.true_rumor_end)
            continue;
        if ((endp = C.strchr(line, '\n'.charCodeAt(0))) != 0)
            C.storeChar(endp, 0);
        C.Sprintf(rumor_buf, "  %6s %s", "", C.xcrypt(line, xbuf));
        C.putstr(tmpwin.value, 0, rumor_buf);

        C.storeChar(rumor_buf, '\0'.charCodeAt(0));
        C.dlb_fseek(rumors, C.long(C.gf.false_rumor_start), C.SEEK_SET);
        ftell_rumor_start = C.dlb_ftell(rumors);
        C.dlb_fgets(line, C.BUFSZ, rumors);
        if ((endp = C.strchr(line, '\n'.charCodeAt(0))) != 0)
            C.storeChar(endp, 0);
        C.Sprintf(rumor_buf, "F %06ld %s", ftell_rumor_start,
                C.xcrypt(line, xbuf));
        C.putstr(tmpwin.value, 0, rumor_buf);
        /* find last false rumor */
        while (C.dlb_fgets(line, C.BUFSZ, rumors)
               && C.dlb_ftell(rumors) < C.gf.false_rumor_end)
            continue;
        if ((endp = C.strchr(line, '\n'.charCodeAt(0))) != 0)
            C.storeChar(endp, 0);
        C.Sprintf(rumor_buf, "  %6s %s", "", C.xcrypt(line, xbuf));
        C.putstr(tmpwin.value, 0, rumor_buf);

        C.dlb_fclose(rumors);

    /* if a previous attempt couldn't open file or rejected its contents,
       we didn't bother trying again this time */
    }
    }
    if (!rumors && C.gt.true_rumor_size < 0n) {
 /* file could be opened but init_rumors() didn't like it */
        C.pline("rumors not accessible.");
        /* engravings, epitaphs, and bogus monsters will still be shown,
           and in tmpwin rather than via additional pline() calls */
        C.display_nhwindow(C.WIN_MESSAGE, 1); /* --more-- */

    /* first attempt to open file has just failed */
    } else if (!rumors) {
        couldnt_open_file(C.RUMORFILE);
        C.gt.true_rumor_size = -1n; /* don't try to open it again */
    }

    /* initial implementation of default epitaph/engraving/bogusmon
       contained an error; check those along with rumors */
    C.callLocal(others_check, "Engravings:", C.ENGRAVEFILE, tmpwin);
    C.callLocal(others_check, "Epitaphs:", C.EPITAPHFILE, tmpwin);
    C.callLocal(others_check, "Bogus monsters:", C.BOGUSMONFILE, tmpwin);

    if (tmpwin.value != C.WIN_ERR) {
        C.display_nhwindow(tmpwin.value, 1);
        C.destroy_nhwindow(tmpwin.value);
    }
}


/* 5.0: augments rumors_check(); test 'engrave' or 'epitaph' or 'bogusmon' */
export function others_check(
    ftype, /* header: "{Engravings|Epitaphs|Bogus monsters}:" */
    fname, /* filename: {ENGRAVEFILE|EPITAPHFILE|BOGUSMONFILE} */
    winptr)     /* text window for output; created here if necessary */
{
    const errfmt = "others_check(\"%s\"): %s";
    let fh;
    let line = C.stackAlloc(C.BUFSZ), xbuf = C.stackAlloc(C.BUFSZ), endp;
    let tmpwin = winptr.value;
    let entrycount = 0;

    fh = C.dlb_fopen(fname, "r");
    if (fh) {
 closeit: {
        if (tmpwin == C.WIN_ERR) {
            winptr.value = tmpwin = C.create_nhwindow(C.NHW_TEXT);
            if (tmpwin == C.WIN_ERR) {
                /* should panic, but won't for wizard mode check operation */
                C.impossible(errfmt, fname, "can't create temporary window");
                break closeit;
            }
        }
        C.putstr(tmpwin, 0, "");
        C.putstr(tmpwin, 0, ftype);
        /* "don't edit" comment */
        C.storeChar(line, '\0'.charCodeAt(0));
        if (!C.dlb_fgets(line, C.BUFSZ, fh)) {
            C.Sprintf(xbuf, errfmt, fname, "error; can't read comment line");
            C.putstr(tmpwin, 0, xbuf);
            break closeit;
        }
        if (C.loadChar(line) != '#'.charCodeAt(0)) {
            C.Sprintf(xbuf, errfmt, fname,
                    "malformed; first line is not a comment line:");
            C.putstr(tmpwin, 0, xbuf);
            /* show the bad line; we don't know whether it has been
               encrypted via xcrypt() so show it both ways */
            if ((endp = C.strchr(line, '\n'.charCodeAt(0))) != 0)
                C.storeChar(endp, 0);
            C.putstr(tmpwin, 0, "- first line, as is");
            C.putstr(tmpwin, 0, line);
            C.putstr(tmpwin, 0, "- xcrypt of first line");
            C.putstr(tmpwin, 0, C.xcrypt(line, xbuf));
            break closeit;
        }
        /* first line; should be default one inserted by makedefs when
           building the file but we don't have the expected value so
           can only require a line to exist */
        C.storeChar(line, '\0'.charCodeAt(0));
        if (!C.dlb_fgets(line, C.BUFSZ, fh) || C.loadChar(line) == '\n'.charCodeAt(0)) {
            C.Sprintf(xbuf, errfmt, fname,
                    !C.loadChar(line) ? "can't read first non-comment line"
                           : "first non-comment line is empty");
            C.putstr(tmpwin, 0, xbuf);
            break closeit;
        }
        ++entrycount;
        if ((endp = C.strchr(line, '\n'.charCodeAt(0))) != 0)
            C.storeChar(endp, 0);
        C.putstr(tmpwin, 0, C.xcrypt(line, xbuf));
        if (!C.dlb_fgets(line, C.BUFSZ, fh)) {
            C.putstr(tmpwin, 0, "(no second entry)");
        } else {
            ++entrycount;
            if ((endp = C.strchr(line, '\n'.charCodeAt(0))) != 0)
                C.storeChar(endp, 0);
            C.putstr(tmpwin, 0, C.xcrypt(line, xbuf));
            while (C.dlb_fgets(line, C.BUFSZ, fh)) {
                ++entrycount;
                if ((endp = C.strchr(line, '\n'.charCodeAt(0))) != 0)
                    C.storeChar(endp, 0);
                C.xcrypt(line, xbuf);
            }
            /* count will be 2 if the default entry and the first ordinary
               entry are the only ones present (if either of those were
               missing, we wouldn't have gotten here...) */
            if (entrycount == 2) {
                C.putstr(tmpwin, 0, "(only two entries)");
            } else {
                /* showing an ellipsis avoids ambiguity about whether
                   there are other lines; doing so three times (once for
                   each file) results in total output being 24 lines,
                   forcing a --More-- prompt if using a 24 line screen;
                   displaying 23 lines and --More-- followed by second
                   page with 1 line doesn't look very good but isn't
                   incorrect, and taller screens where that won't be an
                   issue are more common than 24 line terminals nowadays */
                if (entrycount > 3)
                    C.putstr(tmpwin, 0, " ...");
                C.putstr(tmpwin, 0, xbuf); /* already decrypted */
            }
        }

    }
        C.dlb_fclose(fh);
    } else {
        /* since this comes out via impossible(), it won't be integrated
           with the text window of values, but it shouldn't ever happen
           so we won't waste effort integrating it */
        couldnt_open_file(fname);
    }
}


/* load one randomly chosen line from a section of a file; undoes
   decryption and strips trailing underscore padding and final newline;
   if padlength is non-zero, every line is expected to be at least that
   long and every line in the file will have an equal chance of being
   chosen; however, if padlength is 0, lines following long lines are
   more likely than average to be picked, and lines after short lines
   are less likely */
export function get_rnd_line(
    fh,            /* already opened file */
    buf,          /* output buffer */
    bufsiz,    /* (unsigned) sizeof buf */
    rng,    /* random number routine; rn2(N) or similar, 0..N-1 */
    startpos,      /* location in file of first line of interest */
    endpos,        /* location one byte past last line of interest;
                         * if 0, end-of-file will be used */
    padlength) /* expected line length; 0 if no expectations */
{
    bufsiz = C.uint(bufsiz);
    startpos = C.long(startpos);
    endpos = C.long(endpos);
    padlength = C.uint(padlength);
    let newl, xbufp, xbuf = C.stackAlloc(C.BUFSZ);
    let filechunksize, chunkoffset;
    let trylimit;

    C.storeChar(buf, '\0'.charCodeAt(0));
    if (!endpos) {
        C.dlb_fseek(fh, 0n, C.SEEK_END);
        endpos = C.dlb_ftell(fh);
    }
    filechunksize = C.long(endpos - startpos);

    /* might be zero (only if file is empty); should complain in that
       case but it could happen over and over, also the suggestion
       that save and restore might fix the problem wouldn't be useful */
    if (filechunksize < 1n)
        return buf;
    /* 'rumors' is about 3/4 of the way to the limit on a 16-bit config
       for the whole, roughly 3/8 of the way for either half; all active
       configurations these days are at least 32-bits anyway */
    C.nhassert(filechunksize <= BigInt(C.INT_MAX)); /* essential for rn2() */

    /*
     * Position randomly which will probably be in the middle of a line.
     * (Occasionally by chance it will happen to be at the very start of
     * a line, but we'll have no way of knowing that so have to behave
     * as if it were positioned in the middle.)
     * Read the rest of that line, then use the next one.  If there's no
     * next line (ie, end of file), go back to beginning and use first.
     *
     * When short lines have been padded to length N, only accept long
     * lines if we land within last N+1 characters (+1 is for newline
     * which hasn't been stripped away yet), effectively shortening
     * them to normal length.  That yields even selection distribution.
     */
    for (trylimit = 10; trylimit > 0; --trylimit) {
        chunkoffset = C.long(C.callRng(rng, C.int(filechunksize)));
        C.dlb_fseek(fh, C.long(startpos + chunkoffset), C.SEEK_SET);
        C.dlb_fgets(buf, bufsiz, fh);
        /* if padlength is 0, accept any position; when non-zero,
           padlength does not count the newline but strlen(buf) does */
        if (!padlength || C.uint(C.strlen(buf)) <= C.uint(padlength + 1))
            break;
    }
    /* use next line; for rumors, caller takes care of whether startpos
       and endpos cover just true rumors or just false rumors; reaching
       endpos is equivalent to end-of-file in order to avoid using the
       first false rumor if fseek for a true one lands within the last one */
    if (C.dlb_ftell(fh) >= endpos || !C.dlb_fgets(buf, bufsiz, fh)) {
        /* assume failure is due to end-of-file; go back to start */
        C.dlb_fseek(fh, startpos, C.SEEK_SET);
        C.dlb_fgets(buf, bufsiz, fh);
    }
    if ((newl = C.strchr(buf, '\n'.charCodeAt(0))) != 0)
        C.storeChar(newl, '\0'.charCodeAt(0));
    /* decrypt line; make sure that our intermediate buffer is big enough */
    xbufp = (C.strlen(buf) <= C.BUFSZ - 1) ? xbuf
            : C.alloc(C.uint(C.strlen(buf)) + 1);
    C.Strcpy(buf, C.xcrypt(buf, xbufp));
    if (xbufp != xbuf)
        C.free(xbufp);
    /* strip padding that makedefs adds to short lines */
    if (padlength)
        unpadline(buf);
    return buf;
}

/* Gets a random line of text from file 'fname', and returns it.
   rng is the random number generator to use, and should act like rn2 does. */
export function get_rnd_text(
    fname,
    buf,
    rng,
    padlength)
{
    padlength = C.uint(padlength);
    let fh = C.dlb_fopen(fname, "r");

    C.storeChar(buf, '\0'.charCodeAt(0));
    if (fh) {
        let starttxt = 0n;
    let line = C.stackAlloc(C.BUFSZ);

        /* skip "don't edit" comment */
        C.dlb_fgets(line, C.BUFSZ, fh);
        /* obtain current file position */
        C.dlb_fseek(fh, 0n, C.SEEK_CUR);
        starttxt = C.dlb_ftell(fh);

        /* get a randomly chosen line; it comes back decrypted and unpadded */
        C.Strcpy(buf, C.callLocal(get_rnd_line, fh, line, C.uint(C.BUFSZ), rng,
                                 starttxt, 0n, padlength));
        C.dlb_fclose(fh);
    } else {
        couldnt_open_file(fname);
    }
    return buf;
}

export function outrumor(
    truth, /* 1=true, -1=false, 0=either */
    mechanism)
{
    truth = C.int(truth);
    mechanism = C.int(mechanism);
    const fortune_msg =
        "This cookie has a scrap of paper inside.";
    let line;
    let buf = C.stackAlloc(C.BUFSZ);
    let reading = (mechanism == C.BY_COOKIE || mechanism == C.BY_PAPER);

    if (reading) {
        /* deal with various things that prevent reading */
        if (C.is_fainted() && mechanism == C.BY_COOKIE) {
            return;
        } else if (C.Blind) {
            if (mechanism == C.BY_COOKIE)
                C.pline(fortune_msg);
            C.pline("What a pity that you cannot read it!");
            return;
        }
    }

    line = C.callLocal(getrumor, truth, buf, reading ? 0 : 1);
    if (!C.loadChar(line))
        line = "NetHack rumors file closed for renovation.";
    switch (mechanism) {
    case C.BY_ORACLE:
        /* Oracle delivers the rumor */
        C.pline("True to her word, the Oracle %ssays: ",
              (!C.rn2(4, 558, 1) ? "offhandedly "
                       : (!C.rn2(3, 559, 1) ? "casually "
                                  : (C.rn2(2, 560, 1) ? "nonchalantly " : ""))));
        // C.SetVoice((struct monst *) 0, 0, 80, voice_oracle) (inactive configured macro)
        C.verbalize1(line);
        /* [WIS exercised by getrumor()] */
        return;
    case C.BY_COOKIE:
        C.pline(fortune_msg);
        // FALLTHROUGH;
    /* FALLTHRU */
    case C.BY_PAPER:
        C.pline("It reads:");
        break;
    }
    C.pline1(line);
}

export function init_oracles(fp)
{
    let i;
    let line = C.stackAlloc(C.BUFSZ);
    let cnt = C.intLocal();
    cnt.value = 0;

    /* this assumes we're only called once */
    C.dlb_fgets(line, C.BUFSZ, fp); /* skip "don't edit" comment*/
    C.dlb_fgets(line, C.BUFSZ, fp);
    if (C.sscanf(line, "%5d\n", cnt) == 1 && cnt.value > 0) {
        C.svo.oracle_cnt = C.uint(cnt.value);
        C.svo.oracle_loc = C.ulongArray(C.alloc(C.uint(cnt.value) * C.longSize));
        for (i = 0; i < cnt.value; i++) {
            C.dlb_fgets(line, C.BUFSZ, fp);
            C.sscanf(line, "%5lx\n", C.ulongRef(C.svo.oracle_loc, i));
        }
    }
    return;
}

export function save_oracles(nhfp)
{
    let i;

    if (C.update_file(nhfp)) {
        C.Sfo_unsigned(nhfp, C.ref(C.svo, "oracle_cnt"), "oracle-oracle_cnt");
        if (C.svo.oracle_cnt) {
            for (i = 0; C.uint(i) < C.svo.oracle_cnt; ++i) {
                C.Sfo_ulong(nhfp, C.ulongRef(C.svo.oracle_loc, i), "oracle-oracle_loc");
            }
        }
    }
    if (C.release_data(nhfp)) {
        if (C.svo.oracle_cnt) {
            C.svo.oracle_cnt = 0, C.go.oracle_flg = 0;
        }
        if (C.svo.oracle_loc) {
            C.free(C.svo.oracle_loc);
            C.svo.oracle_loc = 0;
        }
    }
}

/* !SFCTOOL */

export function restore_oracles(nhfp)
{
    let i;

    C.Sfi_unsigned(nhfp, C.ref(C.svo, "oracle_cnt"), "oracle-oracle_cnt");
    if (C.svo.oracle_cnt) {
        C.svo.oracle_loc =
            C.ulongArray(C.alloc(C.svo.oracle_cnt * C.longSize));
        for (i = 0; C.uint(i) < C.svo.oracle_cnt; ++i) {
            C.Sfi_ulong(nhfp, C.ulongRef(C.svo.oracle_loc, i), "oracle-oracle_loc");
        }
        C.go.oracle_flg = 1; /* no need to call init_oracles() */
    }
}



export function outoracle(special, delphi)
{
    special = C.boolean(special);
    delphi = C.boolean(delphi);
    let tmpwin;
    let oracles;
    let oracle_idx;
    let endp, line = C.stackAlloc(C.COLNO), xbuf = C.stackAlloc(C.BUFSZ);

    /* early return if we couldn't open ORACLEFILE on previous attempt,
       or if all the oracularities are already exhausted */
    if (C.go.oracle_flg < 0 || (C.go.oracle_flg > 0 && C.svo.oracle_cnt == 0))
        return;

    oracles = C.dlb_fopen(C.ORACLEFILE, "r");

    if (oracles) {
 close_oracles: {
        if (C.go.oracle_flg == 0) { /* if this is the first outoracle() */
            C.callLocal(init_oracles, oracles);
            C.go.oracle_flg = 1;
            if (C.svo.oracle_cnt == 0)
                break close_oracles;
        }
        /* oracle_loc[0] is the special oracle;
           oracle_loc[1..oracle_cnt-1] are normal ones */
        if (C.svo.oracle_cnt <= 1 && !special)
            break close_oracles; /*(shouldn't happen)*/
        oracle_idx = special ? 0 : C.rnd(C.int(C.int(C.svo.oracle_cnt) - 1), 665, 2);
        C.dlb_fseek(oracles, C.long(C.svo.oracle_loc[oracle_idx]), C.SEEK_SET);
        if (!special) /* move offset of very last one into this slot */
            C.svo.oracle_loc[oracle_idx] = C.svo.oracle_loc[--C.svo.oracle_cnt];

        tmpwin = C.create_nhwindow(C.NHW_TEXT);
        if (delphi)
            C.putstr(tmpwin, 0,
                   special
                     ? "The Oracle scornfully takes all your gold and says:"
                     : "The Oracle meditates for a moment and then intones:");
        else
            C.putstr(tmpwin, 0, "The message reads:");
        C.putstr(tmpwin, 0, "");

        while (C.dlb_fgets(line, C.COLNO, oracles) && C.strcmp(line, "---\n")) {
            if ((endp = C.strchr(line, '\n'.charCodeAt(0))) != 0)
                C.storeChar(endp, 0);
            C.putstr(tmpwin, 0, C.xcrypt(line, xbuf));
        }
        C.display_nhwindow(tmpwin, 1);
        C.destroy_nhwindow(tmpwin);
    }
        C.dlb_fclose(oracles);
    } else {
        couldnt_open_file(C.ORACLEFILE);
        C.go.oracle_flg = -1; /* don't try to open it again */
    }
}

export function doconsult(oracl)
{
    let umoney;
    let u_pay, minor_cost = 50, major_cost = C.int(500 + C.int(50 * C.u.ulevel));
    let add_xpts;
    let qbuf = C.stackAlloc(C.QBUFSZ);

    C.gm.multi = 0;
    umoney = C.money_cnt(C.gi.invent);

    if (!oracl) {
        C.There("is no one here to consult.");
        return C.ECMD_OK;
    } else if (!oracl.mpeaceful) {
        C.pline("%s is in no mood for consultations.", C.Monnam(oracl));
        return C.ECMD_OK;
    } else if (!umoney) {
        C.You("have no gold.");
        return C.ECMD_OK;
    }

    C.Sprintf(qbuf, "\"Wilt thou settle for a minor consultation?\" (%d %s)",
            minor_cost, C.currency(C.long(minor_cost)));
    switch (C.ynq(qbuf)) {
    default:
    case 'q'.charCodeAt(0):
        return C.ECMD_OK;
    case 'y'.charCodeAt(0):
        if (umoney < C.long(minor_cost)) {
            C.You("don't even have enough gold for that!");
            return C.ECMD_OK;
        }
        u_pay = minor_cost;
        break;
    case 'n'.charCodeAt(0):
        if (umoney <= C.long(minor_cost) /* don't even ask */
            || (C.svo.oracle_cnt == 1 || C.go.oracle_flg < 0))
            return C.ECMD_OK;
        C.Sprintf(qbuf, "\"Then dost thou desire a major one?\" (%d %s)",
                major_cost, C.currency(C.long(major_cost)));
        if (C.y_n(qbuf) != 'y'.charCodeAt(0))
            return C.ECMD_OK;
        u_pay = (umoney < C.long(major_cost)) ? C.int(umoney) : major_cost;
        break;
    }
    C.money2mon(oracl, C.long(u_pay));
    C.disp.botl = 1;
    if (!C.u.uevent.major_oracle && !C.u.uevent.minor_oracle)
        C.record_achievement(C.ACH_ORCL);
    add_xpts = 0; /* first oracle of each type gives experience points */
    if (u_pay == minor_cost) {
        C.callLocal(outrumor, 1, C.BY_ORACLE);
        if (!C.u.uevent.minor_oracle)
            add_xpts = Math.trunc(u_pay / (C.u.uevent.major_oracle ? 25 : 10));
        /* 5 pts if very 1st, or 2 pts if major already done */
        C.u.uevent.minor_oracle = 1;
    } else {
        let cheapskate = u_pay < major_cost;

        C.callLocal(outoracle, cheapskate, 1);
        if (!cheapskate && !C.u.uevent.major_oracle)
            add_xpts = Math.trunc(u_pay / (C.u.uevent.minor_oracle ? 25 : 10));
        /* ~100 pts if very 1st, ~40 pts if minor already done */
        C.u.uevent.major_oracle = 1;
        C.exercise(C.A_WIS, !cheapskate);
    }
    if (add_xpts) {
        C.more_experienced(add_xpts, Math.trunc(u_pay / 50));
        C.newexplevel();
    }
    return C.ECMD_TIME;
}

export function couldnt_open_file(filename)
{
    let save_something = C.program_state.something_worth_saving;

    /* most likely the file is missing, so suppress impossible()'s
       "saving and restoring might fix this" (unless the fuzzer,
       which escalates impossible to panic, is running) */
    if (!C.iflags.debug_fuzzer)
        C.program_state.something_worth_saving = 0;

    C.impossible("Can't open '%s' file.", filename);
    C.program_state.something_worth_saving = save_something;
}

/* is 'word' a capitalized monster name that should be preceded by "the"?
   (non-unique monster like Mordor Orc, or capitalized title like Norn
   rather than a name); used by the() on a string without any context;
   this sets up a list of names rather than scan all of mons[] every time
   the decision is needed (resulting list currently contains 27 monster
   entries and 20 hallucination entries) */
export function CapitalMon(
    word) /* potential monster name; a name might be followed by
                       * something like " corpse" */
{
    let nam;
    let i, wln, nln;

    if (!word || !C.loadChar(word) || C.loadChar(word) == C.lowc(C.loadChar(word)))
        return 0; /* 'word' is not a capitalized monster name */

    if (!C.CapMons)
        C.callLocal(init_CapMons);
    C.assert(C.CapMons != 0);

    wln = C.uint(C.strlen(word));
    for (i = 0; i < C.CapMonSiz - 1; ++i) {
        nam = C.CapMons[i];
        nln = C.uint(C.strlen(nam));
        if (wln < nln)
            continue;
        /*
         * Unlike name_to_mon(), we don't need to find the longest match
         * or return the gender or a pointer to trailing stuff.  We do
         * check full words though: "Foo" matches "Foo" and "Foo bar" and
         * "Foo's bar" but not "Foobar".  We use case-sensitive matching.
         */
        if (!C.strncmp(nam, word, nln)
            && (!C.loadChar(word + nln) || C.loadChar(word + nln) == ' '.charCodeAt(0) || C.loadChar(word + nln) == '\''.charCodeAt(0)))
            return 1; /* 'word' is a capitalized monster name */
    }
    return 0;
}

/* one-time initialization of CapMons[], a list of non-unique monsters
   having a capitalized type name like Green-elf or Archon, plus unique
   monsters whose "name" is a title rather than a personal name, plus
   hallucinatory monster names that fall into either of those categories */
export function init_CapMons()
{
    let pass;
    let bogonfile = C.dlb_fopen(C.BOGUSMONFILE, "r");

    if (C.CapMons) /* sanity precaution */
        free_CapMons();

    /* first pass: count the number of relevant monster names, then
       allocate memory for CapMons[]; second pass: populate CapMons[] */
    for (pass = 1; pass <= 2; ++pass) {
        let mptr;
        let nam;
        let mndx, mgend;

        /* the first CapMonstCnt entries come from mons[].pmnames[] and
           the next CapBogonCnt entries from the 'bogusmons' file;
           there is an extra entry for Null at the end, but that is only
           useful to force non-zero array size in case both mons[] and
           bogusmons get modified to have no applicable monster names */
        C.CapMonstCnt = C.CapBogonCnt = 0;

        /* gather applicable actual monsters */
        for (mndx = C.LOW_PM; mndx < C.NUMMONS; ++mndx) {
            mptr = C.mons[mndx];
            if ((mptr.geno & C.G_UNIQ) != 0 && !C.the_unique_pm(mptr))
                continue;
            for (mgend = C.MALE; mgend < C.NUM_MGENDERS; ++mgend) {
                nam = mptr.pmnames[mgend];
                if (nam && C.loadChar(nam) != C.lowc(C.loadChar(nam))) {
                    if (pass == 2)
                        C.CapMons[C.CapMonstCnt] = nam;
                    ++C.CapMonstCnt;
                }
            }
        }

        /* now gather applicable hallucinatory monsters */
        if (bogonfile) {
    let hline = C.stackAlloc(C.BUFSZ), xbuf = C.stackAlloc(C.BUFSZ), endp, startp, code;

            /* rewind; effectively a no-op for pass 1; essential for pass 2 */
            C.dlb_fseek(bogonfile, 0n, C.SEEK_SET);
            /* skip "don't edit" comment (first line of file) */
            C.dlb_fgets(hline, C.BUFSZ, bogonfile);

            /* one monster name per line in rudimentary encrypted format;
               some are prefixed by a classification code to indicate
               gender and/or to distinguish an individual from a type
               (code is a single punctuation character when present) */
            while (C.dlb_fgets(hline, C.BUFSZ, bogonfile)) {
                if ((endp = C.strchr(hline, '\n'.charCodeAt(0))) != 0)
                    C.storeChar(endp, '\0'.charCodeAt(0)); /* strip newline */
                C.xcrypt(hline, xbuf);
                unpadline(xbuf);

                if (!C.loadChar(xbuf) || !C.strchr(C.bogon_codes, C.loadChar(xbuf)))
                    code = '\0'.charCodeAt(0), startp = xbuf; /* ordinary */
                else
                    code = C.loadChar(xbuf), startp = (xbuf + 1); /* special */

                if (C.loadChar(startp) != C.lowc(C.loadChar(startp)) && !C.bogon_is_pname(code)) {
                    if (pass == 2)
                        C.CapMons[C.CapMonstCnt + C.CapBogonCnt] = C.dupstr(startp);
                    ++C.CapBogonCnt;
                }
            }
        }

        /* finish the current pass */
        if (pass == 1) {
            C.CapMonSiz = C.CapMonstCnt + C.CapBogonCnt + 1; /* +1: terminator */
            C.CapMons = C.alloc(C.CapMonSiz * C.pointerSize);
        } else { /* pass == 2 */
            /* terminator; not strictly needed */
            C.CapMons[C.CapMonSiz - 1] = 0;

            if (bogonfile)
                C.dlb_fclose(bogonfile), bogonfile = 0;
        }
    }


    /*
     * CapMons[] init doesn't kick in until needed.  To force this name
     * dump, set DEBUGFILES to "CapMons" in your environment (or in
     * sysconf) prior to starting nethack, wish for a statue of an Archon
     * and drop it if held, then step away and apply a stethoscope towards
     * it to trigger a message that passes "Archon" to the() which will
     * then call CapitalMon() which in turn will call init_CapMons().
     */
    if (C.wizard && C.explicitdebug("CapMons")) {
    let buf = C.stackAlloc(C.BUFSZ);
        let i;
        let tmpwin = C.create_nhwindow(C.NHW_TEXT);

        C.putstr(tmpwin, 0,
              "Capitalized monster type names normally preceded by \"the\":");
        for (i = 0; i < C.CapMonSiz - 1; ++i) {
            C.Sprintf(buf, "  %.77s", C.CapMons[i]);
            C.putstr(tmpwin, 0, buf);
        }
        C.display_nhwindow(tmpwin, 1);
        C.destroy_nhwindow(tmpwin);
    }


    return;
}

/* release memory allocated for the list of capitalized monster type names */
export function free_CapMons()
{
    /* note: some elements of CapMons[] are string literals from
       mons[].pmnames[] and should not be freed, others are dynamically
       allocated copies of hallucinatory monster names and should be freed */
    if (C.CapMons) {
        let idx;

        /* skip 0..MonstCnt-1, free MonstCnt..(MonstCnt+BogonCnt-1) */
        for (idx = C.CapMonstCnt; idx < C.CapMonSiz - 1; ++idx)
            C.free(C.CapMons[idx]); /* cast: discard 'const' */
        C.free(C.CapMons), C.CapMons = 0;
    }
    C.CapMonSiz = 0;
}

/* !SFCTOOL */

/*rumors.c*/
