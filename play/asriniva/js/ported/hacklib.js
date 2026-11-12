import { C } from '../c-runtime/context.js';
/* NetHack 5.0	hacklib.c	$NHDT-Date: 1706213796 2024/01/25 20:16:36 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.116 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Michael Allison, 2007. */
/* Copyright (c) Robert Patrick Rankin, 1991                      */
/* NetHack may be freely redistributed.  See license for details. */


/* for config.h+extern.h */

export function nh_qsort_idx_cmp(va, vb)
{
    const a = C.indexRecord(va);
    const b = C.indexRecord(vb);
    let c = C.callComparator(C.hacklibState.nh_qsort_cmp_fn, C.ptrAdd(C.hacklibState.nh_qsort_base, C.size_t(a.idx * C.hacklibState.nh_qsort_size)),
                               C.ptrAdd(C.hacklibState.nh_qsort_base, C.size_t(b.idx * C.hacklibState.nh_qsort_size)));
    if (c)
        return c;
    if (a.idx < b.idx)
        return -1;
    return (a.idx > b.idx);
}

/* Deterministic replacement for libc qsort(), preserving original order
 * for equal-key elements regardless of platform libc behavior.
 */
export function nh_deterministic_qsort(base, nmemb, size, compar)
{
    nmemb = C.size_t(nmemb); size = C.size_t(size);
    let bytes = base;
    let order;
    let tmp;
    let i;

    if (!base || !compar || size == 0 || nmemb < 2)
        return;

    order = C.indexArray(C.malloc(C.size_t(nmemb * BigInt(C.qsortIndexSize))));
    tmp = C.malloc(C.size_t(nmemb * size));
    if (!order.address || !tmp) {
        if (tmp)
            C.free(tmp);
        if (order.address)
            C.free(order.address);
        return;
    }
    for (i = 0n; i < nmemb; ++i)
        order[i].idx = i;

    C.hacklibState.nh_qsort_base = bytes;
    C.hacklibState.nh_qsort_size = size;
    C.hacklibState.nh_qsort_cmp_fn = compar;
    C.qsort(order.address, nmemb, BigInt(C.qsortIndexSize), nh_qsort_idx_cmp);

    for (i = 0n; i < nmemb; ++i)
        C.memcpy((C.ptrAdd(tmp, C.size_t(i * size))),
                      (C.ptrAdd(bytes, C.size_t(order[i].idx * size))), size);
    C.memcpy(bytes, tmp, C.size_t(nmemb * size));

    C.free(tmp);
    C.free(order.address);
}

/*=
    Assorted 'small' utility routines.  They're virtually independent of
    NetHack.

      return type     routine name    argument type(s)
        boolean         digit           (char)
        boolean         letter          (char)
        char            highc           (char)
        char            lowc            (char)
        char *          lcase           (char *)
        char *          ucase           (char *)
        char *          upstart         (char *)
        char *          upwords         (char *)
        char *          mungspaces      (char *)
        char *          trimspaces      (char *)
        char *          strip_newline   (char *)
        char *          stripchars      (char *, const char *, const char *)
        char *          stripdigits     (char *)
        char *          eos             (char *)
        const char *    c_eos           (const char *)
        boolean         str_start_is    (const char *, const char *, boolean)
        boolean         str_end_is      (const char *, const char *)
        int             str_lines_maxlen (const char *)
        char *          strkitten       (char *,char)
        void            copynchars      (char *,const char *,int)
        char            chrcasecpy      (int,int)
        char *          strcasecpy      (char *,const char *)
        char *          s_suffix        (const char *)
        char *          ing_suffix      (const char *)
        char *          xcrypt          (const char *, char *)
        boolean         onlyspace       (const char *)
        char *          tabexpand       (char *)
        char *          visctrl         (char)
        char *          strsubst        (char *, const char *, const char *)
        int             strNsubst       (char *,const char *,const char *,int)
        const char *    findword        (const char *,const char *,int,boolean)
        const char *    ordin           (int)
        char *          sitoa           (int)
        int             sgn             (int)
        int             distmin         (coordxy, coordxy, coordxy, coordxy)
        int             dist2           (coordxy, coordxy, coordxy, coordxy)
        boolean         online2         (coordxy, coordxy)
        int             strncmpi        (const char *, const char *, int)
        char *          strstri         (const char *, const char *)
        boolean         fuzzymatch      (const char *, const char *,
                                         const char *, boolean)
        int             swapbits        (int, int, int)
        void            nh_snprintf     (const char *, int, char *, size_t,
                                         const char *, ...)
=*/

/* is 'c' a digit? */
export function digit(c)
{
    c = C.char(c);
    return ('0'.charCodeAt(0) <= c && c <= '9'.charCodeAt(0));
}

/* is 'c' a letter?  note: '@' classed as letter */
export function letter(c)
{
    c = C.char(c);
    return ('@'.charCodeAt(0) <= c && c <= 'Z'.charCodeAt(0)) || ('a'.charCodeAt(0) <= c && c <= 'z'.charCodeAt(0));
}

/* force 'c' into uppercase */
export function highc(c)
{
    c = C.char(c);
    return (('a'.charCodeAt(0) <= c && c <= 'z'.charCodeAt(0)) ? (c & ~0o40) : c);
}

/* force 'c' into lowercase */
export function lowc(c)
{
    c = C.char(c);
    return (('A'.charCodeAt(0) <= c && c <= 'Z'.charCodeAt(0)) ? (c | 0o40) : c);
}

/* convert a string into all lowercase */
export function lcase(s)
{
    s = C.charPointer(s);
    let p;

    for (p = s; C.loadChar(p); p++)
        if ('A'.charCodeAt(0) <= C.loadChar(p) && C.loadChar(p) <= 'Z'.charCodeAt(0))
            C.storeChar(p, C.loadChar(p) | (0o40));
    return s;
}

/* convert a string into all uppercase */
export function ucase(s)
{
    s = C.charPointer(s);
    let p;

    for (p = s; C.loadChar(p); p++)
        if ('a'.charCodeAt(0) <= C.loadChar(p) && C.loadChar(p) <= 'z'.charCodeAt(0))
            C.storeChar(p, C.loadChar(p) & (~0o40));
    return s;
}

/* convert first character of a string to uppercase */
export function upstart(s)
{
    s = C.charPointer(s);
    if (s)
        C.storeChar(s, highc(C.loadChar(s)));
    return s;
}

/* capitalize first letter of every word in a string (in place) */
export function upwords(s)
{
    s = C.charPointer(s);
    let p;
    let space = 1;

    for (p = s; C.loadChar(p); p++)
        if (C.loadChar(p) == ' '.charCodeAt(0)) {
            space = 1;
        } else if (space && letter(C.loadChar(p))) {
            C.storeChar(p, highc(C.loadChar(p)));
            space = 0;
        } else {
            space = 0;
        }
    return s;
}

/* remove excess whitespace from a string buffer (in place) */
export function mungspaces(bp)
{
    bp = C.charPointer(bp);
    let c, p, p2;
    let was_space = 1;

    for (p = p2 = bp; (c = C.loadChar(p)) != '\0'.charCodeAt(0); p++) {
        if (c == '\n'.charCodeAt(0))
            break; /* treat newline the same as end-of-string */
        if (c == '\t'.charCodeAt(0))
            c = ' '.charCodeAt(0);
        if (c != ' '.charCodeAt(0) || !was_space)
            C.storeChar(p2++, c);
        was_space = (c == ' '.charCodeAt(0));
    }
    if (was_space && p2 > bp)
        p2--;
    C.storeChar(p2, '\0'.charCodeAt(0));
    return bp;
}

/* skip leading whitespace; remove trailing whitespace, in place */
export function trimspaces(txt)
{
    txt = C.charPointer(txt);
    let end;

    /* leading whitespace will remain in the buffer */
    while (C.loadChar(txt) == ' '.charCodeAt(0) || C.loadChar(txt) == '\t'.charCodeAt(0))
        txt++;
    end = eos(txt);
    while (--end >= txt && (C.loadChar(end) == ' '.charCodeAt(0) || C.loadChar(end) == '\t'.charCodeAt(0)))
        C.storeChar(end, '\0'.charCodeAt(0));

    return txt;
}

/* remove \n from end of line; remove \r too if one is there */
export function strip_newline(str)
{
    str = C.charPointer(str);
    let p = C.strrchr(str, '\n'.charCodeAt(0));

    if (p) {
        if (p > str && C.loadChar(p - 1) == '\r'.charCodeAt(0))
            --p;
        C.storeChar(p, '\0'.charCodeAt(0));
    }
    return str;
}

/* return the end of a string (pointing at '\0') */
export function eos(s)
{
    s = C.charPointer(s);
    while (C.loadChar(s))
        s++; /* s += strlen(s); */
    return s;
}

/* version of eos() which takes a const* arg and returns that result */
export function c_eos(s)
{
    s = C.charPointer(s);
    while (C.loadChar(s))
        s++; /* s += strlen(s); */
    return s;
}

/* determine whether 'str' starts with 'chkstr', possibly ignoring case;
 * panics on huge strings */
export function str_start_is(str, chkstr, caseblind)
{
    str = C.charPointer(str); chkstr = C.charPointer(chkstr);
    caseblind = C.boolean(caseblind);
    let t1, t2;
    let n = C.LARGEST_INT;

    while (--n) {
        if (!C.loadChar(str))
            return (C.loadChar(chkstr) == 0); /* chkstr >= str */
        else if (!C.loadChar(chkstr))
            return 1; /* chkstr < str */
        t1 = caseblind ? lowc(C.loadChar(str)) : C.loadChar(str);
        t2 = caseblind ? lowc(C.loadChar(chkstr)) : C.loadChar(chkstr);
        str++, chkstr++;
        if (t1 != t2)
            return 0;
    }
    return 1;
}

/* determine whether 'str' ends in 'chkstr' */
export function str_end_is(str, chkstr)
{
    str = C.charPointer(str); chkstr = C.charPointer(chkstr);
    let clen = C.int(C.strlen(chkstr));

    if (C.int(C.strlen(str)) >= clen)
        return (!C.strncmp(eos(str) - clen, chkstr, clen));
    return 0;
}

/* return max line length from buffer comprising newline-separated strings */
export function str_lines_maxlen(str)
{
    str = C.charPointer(str);
    let s1, s2;
    let len, max_len = 0;

    s1 = str;
    while (s1 && C.loadChar(s1)) {
        s2 = C.strchr(s1, '\n'.charCodeAt(0));
        if (s2) {
            len = C.int(C.ptrDiff(s2, s1));
            s1 = s2 + 1;
        } else {
            len = C.int(C.strlen(s1));
            s1 = 0;
        }
        if (len > max_len)
            max_len = len;
    }

    return max_len;
}

/* append a character to a string (in place): strcat(s, {c,'\0'}); */
export function strkitten(s, c)
{
    s = C.charPointer(s);
    c = C.char(c);
    let p = eos(s);

    C.storeChar(p++, c);
    C.storeChar(p, '\0'.charCodeAt(0));
    return s;
}

/* truncating string copy */
export function copynchars(dst, src, n)
{
    dst = C.charPointer(dst); src = C.charPointer(src);
    n = C.int(n);
    /* copies at most n characters, stopping sooner if terminator reached;
       treats newline as input terminator; unlike strncpy, always supplies
       '\0' terminator so dst must be able to hold at least n+1 characters */
    while (n > 0 && C.loadChar(src) != '\0'.charCodeAt(0) && C.loadChar(src) != '\n'.charCodeAt(0)) {
        C.storeChar(dst++, C.loadChar(src++));
        --n;
    }
    C.storeChar(dst, '\0'.charCodeAt(0));
}

/* convert char nc into oc's case; mostly used by strcasecpy */
export function chrcasecpy(oc, nc)
{
    oc = C.int(oc); nc = C.int(nc);
    /* this will be necessary if we switch to <ctype.h> */
    if ('a'.charCodeAt(0) <= oc && oc <= 'z'.charCodeAt(0)) {
        /* old char is lower case; if new char is upper case, downcase it */
        if ('A'.charCodeAt(0) <= nc && nc <= 'Z'.charCodeAt(0))
            nc += 'a'.charCodeAt(0) - 'A'.charCodeAt(0); /* lowc(nc) */
    } else if ('A'.charCodeAt(0) <= oc && oc <= 'Z'.charCodeAt(0)) {
        /* old char is upper case; if new char is lower case, upcase it */
        if ('a'.charCodeAt(0) <= nc && nc <= 'z'.charCodeAt(0))
            nc += 'A'.charCodeAt(0) - 'a'.charCodeAt(0); /* highc(nc) */
    }
    return C.char(nc);
}

/* overwrite string, preserving old chars' case;
   for case-insensitive editions of makeplural() and makesingular();
   src might be shorter, same length, or longer than dst */
export function strcasecpy(dst, src)
{
    dst = C.charPointer(dst); src = C.charPointer(src);
    let result = dst;
    let ic, oc, dst_exhausted = 0;

    /* while dst has characters, replace each one with corresponding
       character from src, converting case in the process if they differ;
       once dst runs out, propagate the case of its last character to any
       remaining src; if dst starts empty, it must be a pointer to the
       tail of some other string because we examine the char at dst[-1] */
    while ((ic = C.loadChar(src++)) != '\0'.charCodeAt(0)) {
        if (!dst_exhausted && !C.loadChar(dst))
            dst_exhausted = 1;
        oc = C.loadChar(dst - dst_exhausted);
        C.storeChar(dst++, chrcasecpy(oc, ic));
    }
    C.storeChar(dst, '\0'.charCodeAt(0));
    return result;
}

/* return a name converted to possessive */
export function s_suffix(s)
{
    s = C.charPointer(s);
    const buf = C.storage(0);

    C.Strcpy(buf, s);
    if (!strncmpi(buf, "it", -1)) /* it -> its */
        C.Strcat(buf, "s");
    else if (!strncmpi(buf, "you", -1)) /* you -> your */
        C.Strcat(buf, "r");
    else if (C.loadChar(eos(buf) - 1) == 's'.charCodeAt(0)) /* Xs -> Xs' */
        C.Strcat(buf, "'");
    else /* X -> X's */
        C.Strcat(buf, "'s");
    return buf;
}

/* construct a gerund (a verb formed by appending "ing" to a noun) */
export function ing_suffix(s)
{
    s = C.charPointer(s);
    const vowel = C.charPointer("aeiouwy");
    const buf = C.storage(1);
    const onoff = C.stackAlloc(10);
    let p;

    C.Strcpy(buf, s);
    p = eos(buf);
    C.storeChar(onoff, C.storeChar(p, C.storeChar(p + 1, '\0'.charCodeAt(0))));
    if ((p >= (buf + (3)) && !strncmpi(p - 3, " on", -1))
        || (p >= (buf + (4)) && !strncmpi(p - 4, " off", -1))
        || (p >= (buf + (5)) && !strncmpi(p - 5, " with", -1))) {
        p = C.strrchr(buf, ' '.charCodeAt(0));
        C.Strcpy(onoff, p);
        C.storeChar(p, '\0'.charCodeAt(0));
    }
    if (p >= (buf + (2)) && !strncmpi(p - 2, "er", -1)) { /* slither + ing */
        /* nothing here */
    } else if (p >= (buf + (3)) && !C.strchr(vowel, C.loadChar(p - 1))
        && C.strchr(vowel, C.loadChar(p - 2)) && !C.strchr(vowel, C.loadChar(p - 3))) {
        /* tip -> tipp + ing */
        C.storeChar(p, C.loadChar(p - 1));
        C.storeChar(p + 1, '\0'.charCodeAt(0));
    } else if (p >= (buf + (2)) && !strncmpi(p - 2, "ie", -1)) { /* vie -> vy + ing */
        C.storeChar(p - 2, 'y'.charCodeAt(0));
        C.storeChar(p - 1, '\0'.charCodeAt(0));
    } else if (p >= (buf + (1)) && C.loadChar(p - 1) == 'e'.charCodeAt(0)) /* grease -> greas + ing */
        C.storeChar(p - 1, '\0'.charCodeAt(0));
    C.Strcat(buf, "ing");
    if (C.loadChar(onoff + (0)))
        C.Strcat(buf, onoff);
    return buf;
}

/* trivial text encryption routine (see makedefs) */
export function xcrypt(str, buf)
{
    str = C.charPointer(str); buf = C.charPointer(buf);
    let p;
    let q;
    let bitmask;

    for (bitmask = 1, p = str, q = buf; C.loadChar(p); q++) {
        C.storeChar(q, C.loadChar(p++));
        if (C.loadChar(q) & (32 | 64))
            C.storeChar(q, C.loadChar(q) ^ (bitmask));
        if ((bitmask <<= 1) >= 32)
            bitmask = 1;
    }
    C.storeChar(q, '\0'.charCodeAt(0));
    return buf;
}

/* is a string entirely whitespace? */
export function onlyspace(s)
{
    s = C.charPointer(s);
    for (; C.loadChar(s); s++)
        if (C.loadChar(s) != ' '.charCodeAt(0) && C.loadChar(s) != '\t'.charCodeAt(0))
            return 0;
    return 1;
}

/* expand tabs into proper number of spaces (in place) */
export function tabexpand(sbuf)
/* assumed to be [BUFSZ] but can be smaller provided that
                 * expanded string fits; expansion bigger than BUFSZ-1
                 * will be truncated */
{
    sbuf = C.charPointer(sbuf);
    const buf = C.stackAlloc(C.BUFSZ + 10);
    let bp, s = sbuf;
    let idx;

    if (!C.loadChar(s))
        return sbuf;
    for (bp = buf, idx = 0; C.loadChar(s); s++) {
        if (C.loadChar(s) == '\t'.charCodeAt(0)) {
            /*
             * clang-8's optimizer at -Os has been observed to mis-compile
             * this code.  Symptom is nethack getting stuck in an apparent
             * infinite loop (or perhaps just an extremely long one) when
             * examining data.base entries.
             * clang-9 doesn't exhibit this problem.  [Was the incorrect
             * optimization fixed or just disabled?]
             */
            do
                C.storeChar(bp++, ' '.charCodeAt(0));
            while (++idx % 8);
        } else {
            C.storeChar(bp++, C.loadChar(s));
            ++idx;
        }
        if (idx >= C.BUFSZ) {
            bp = (buf + (C.BUFSZ - 1));
            break;
        }
    }
    C.storeChar(bp, 0);
    return C.strcpy(sbuf, buf);
}

/* make a displayable string from a character */
export function visctrl(c)
{
    c = C.char(c);
    const visctrl_bufs = C.storage(2);
    
    let i = 0;
    let ccc = visctrl_bufs + C.hacklibState.nbuf * 5;
    C.hacklibState.nbuf = (C.hacklibState.nbuf + 1) % C.VISCTRL_NBUF;

    if (c & 0o200) {
        C.storeChar(ccc + (i++), 'M'.charCodeAt(0));
        C.storeChar(ccc + (i++), '-'.charCodeAt(0));
    }
    c &= 0o177;
    if (c < 0o40) {
        C.storeChar(ccc + (i++), '^'.charCodeAt(0));
        C.storeChar(ccc + (i++), c | 0o100); /* letter */
    } else if (c == 0o177) {
        C.storeChar(ccc + (i++), '^'.charCodeAt(0));
        C.storeChar(ccc + (i++), c & ~0o100); /* '?' */
    } else {
        C.storeChar(ccc + (i++), c); /* printable character */
    }
    C.storeChar(ccc + (i), '\0'.charCodeAt(0));
    return ccc;
}

/* strip all the chars in stuff_to_strip from orig */
/* caller is responsible for ensuring that bp is a
   valid pointer to a BUFSZ buffer */
export function stripchars(bp, stuff_to_strip, orig)
{
    bp = C.charPointer(bp); stuff_to_strip = C.charPointer(stuff_to_strip); orig = C.charPointer(orig);
    let i = 0;
    let s = bp;

    while (C.loadChar(orig) && i < (C.BUFSZ - 1)) {
        if (!C.strchr(stuff_to_strip, C.loadChar(orig))) {
            C.storeChar(s++, C.loadChar(orig));
            i++;
        }
        orig++;
    }
    C.storeChar(s, '\0'.charCodeAt(0));

    return bp;
}

/* remove digits from string */
export function stripdigits(s)
{
    s = C.charPointer(s);
    let s1, s2;

    for (s1 = s2 = s; C.loadChar(s1); s1++)
        if (C.loadChar(s1) < '0'.charCodeAt(0) || C.loadChar(s1) > '9'.charCodeAt(0))
            C.storeChar(s2++, C.loadChar(s1));
    C.storeChar(s2, '\0'.charCodeAt(0));

    return s;
}

/* substitute a word or phrase in a string (in place);
   caller is responsible for ensuring that bp points to big enough buffer */
export function strsubst(bp, orig, replacement)
{
    bp = C.charPointer(bp); orig = C.charPointer(orig); replacement = C.charPointer(replacement);
    let found; const buf = C.stackAlloc(C.BUFSZ);
    /* [this could be replaced by strNsubst(bp, orig, replacement, 1)] */

    found = C.strstr(bp, orig);
    if (found) {
        C.Strcpy(buf, C.ptrAdd(found, C.strlen(orig)));
        C.Strcpy(found, replacement);
        C.Strcat(bp, buf);
    }
    return bp;
}

/* substitute the Nth occurrence of a substring within a string (in place);
   if N is 0, substitute all occurrences; returns the number of substitutions;
   maximum output length is BUFSZ (BUFSZ-1 chars + terminating '\0') */
export function strNsubst(inoutbuf, orig, replacement, n)
/* current string, and result buffer */ /* old substring; if "", insert in front of Nth char */ /* new substring; if "", delete old substring */ /* which occurrence to replace; 0 => all */
{
    inoutbuf = C.charPointer(inoutbuf); orig = C.charPointer(orig); replacement = C.charPointer(replacement);
    n = C.int(n);
    let bp, op; const workbuf = C.stackAlloc(C.BUFSZ);
    let rp;
    let len = C.uint(C.strlen(orig));
    let ocount = 0, /* number of times 'orig' has been matched */
        rcount = 0; /* number of substitutions made */

    for (bp = inoutbuf, op = workbuf; C.loadChar(bp) && op < (workbuf + (C.BUFSZ - 1)); ) {
        if ((!len || !C.strncmp(bp, orig, len)) && (++ocount == n || n == 0)) {
            /* Nth match found */
            for (rp = replacement; C.loadChar(rp) && op < (workbuf + (C.BUFSZ - 1)); )
                C.storeChar(op++, C.loadChar(rp++));
            ++rcount;
            if (len) {
                bp += len; /* skip 'orig' */
                continue;
            }
        }
        /* no match (or len==0) so retain current character */
        C.storeChar(op++, C.loadChar(bp++));
    }
    if (!len && n == ocount + 1) {
        /* special case: orig=="" (!len) and n==strlen(inoutbuf)+1,
           insert in front of terminator (in other words, append);
           [when orig=="", ocount will have been incremented once for
           each input char] */
        for (rp = replacement; C.loadChar(rp) && op < (workbuf + (C.BUFSZ - 1)); )
            C.storeChar(op++, C.loadChar(rp++));
        ++rcount;
    }
    if (rcount) {
        C.storeChar(op, '\0'.charCodeAt(0));
        C.Strcpy(inoutbuf, workbuf);
    }
    return rcount;
}

/* search for a word in a space-separated list; returns non-Null if found */
export function findword(list, word, wordlen, ignorecase)
/* string of space-separated words */ /* word to try to find */ /* so that it isn't required to be \0 terminated */ /* T: case-blind, F: case-sensitive */
{
    list = C.charPointer(list); word = C.charPointer(word);
    wordlen = C.int(wordlen); ignorecase = C.boolean(ignorecase);
    let p = list;

    while (p) {
        while (C.loadChar(p) == ' '.charCodeAt(0))
            ++p;
        if (!C.loadChar(p))
            break;
        if ((ignorecase ? !strncmpi(p, word, wordlen)
                        : !C.strncmp(p, word, wordlen))
            && (C.loadChar(p + wordlen) == '\0'.charCodeAt(0) || C.loadChar(p + wordlen) == ' '.charCodeAt(0)))
            return p;
        p = C.strchr(p + 1, ' '.charCodeAt(0));
    }
    return 0;
}

/* return the ordinal suffix of a number */
export function ordin(n)
/* note: should be non-negative */
{
    n = C.int(n);
    let dd = n % 10;

    return (dd == 0 || dd > 3 || Math.trunc((n % 100) / 10) == 1) ? "th"
               : (dd == 1) ? "st" : (dd == 2) ? "nd" : "rd";
}

/* one compiler complains about
                                      result of ?: for format string */

/* make a signed digit string from a number */
export function sitoa(n)
{
    n = C.int(n);
    const buf = C.storage(3);

    C.Sprintf(buf, (n < 0) ? "%d" : "+%d", n);
    return buf;
}


/* return the sign of a number: -1, 0, or 1 */
export function sgn(n)
{
    n = C.int(n);
    return (n < 0) ? -1 : (n != 0);
}

/* distance between two points, in moves */
export function distmin(x0, y0, x1, y1)
{
    x0 = C.coordxy(x0); y0 = C.coordxy(y0); x1 = C.coordxy(x1); y1 = C.coordxy(y1);
    let dx = C.coordxy(x0 - x1), dy = C.coordxy(y0 - y1);

    if (dx < 0)
        dx = C.coordxy(-dx);
    if (dy < 0)
        dy = C.coordxy(-dy);
    /*  The minimum number of moves to get from (x0,y0) to (x1,y1) is the
     *  larger of the [absolute value of the] two deltas.
     */
    return (dx < dy) ? dy : dx;
}

/* square of Euclidean distance between pair of pts */
export function dist2(x0, y0, x1, y1)
{
    x0 = C.coordxy(x0); y0 = C.coordxy(y0); x1 = C.coordxy(x1); y1 = C.coordxy(y1);
    let dx = C.coordxy(x0 - x1), dy = C.coordxy(y0 - y1);

    return C.int(dx * dx + dy * dy);
}

/* integer square root function without using floating point */
export function isqrt(val)
{
    val = C.int(val);
    let rt = 0;
    let odd = 1;
    /*
     * This could be replaced by a faster algorithm, but has not been because:
     * + the simple algorithm is easy to read;
     * + this algorithm does not require 64-bit support;
     * + in current usage, the values passed to isqrt() are not really that
     *   large, so the performance difference is negligible;
     * + isqrt() is used in only few places, which are not bottle-necks.
     */
    while (val >= odd) {
        val = val - odd;
        odd = odd + 2;
        rt = rt + 1;
    }
    return rt;
}

/* are two points lined up (on a straight line)? */
export function online2(x0, y0, x1, y1)
{
    x0 = C.coordxy(x0); y0 = C.coordxy(y0); x1 = C.coordxy(x1); y1 = C.coordxy(y1);
    let dx = x0 - x1, dy = y0 - y1;
    /*  If either delta is zero then they're on an orthogonal line,
     *  else if the deltas are equal (signs ignored) they're on a diagonal.
     */
    return (!dy || !dx || dy == dx || dy == -dx);
}

/* case-insensitive counted string comparison */
/*{ aka strncasecmp }*/
export function strncmpi(s1, s2, n)
/*(should probably be size_t, which is unsigned)*/
{
    s1 = C.charPointer(s1); s2 = C.charPointer(s2);
    n = C.int(n);
    let t1, t2;

    while (n--) {
        if (!C.loadChar(s2))
            return (C.loadChar(s1) != 0); /* s1 >= s2 */
        else if (!C.loadChar(s1))
            return -1; /* s1  < s2 */
        t1 = lowc(C.loadChar(s1++));
        t2 = lowc(C.loadChar(s2++));
        if (t1 != t2)
            return (t1 > t2) ? 1 : -1;
    }
    return 0; /* s1 == s2 */
}

/* STRNCMPI */

/* case-insensitive substring search */
export function strstri(str, sub)
{
    str = C.charPointer(str); sub = C.charPointer(sub);
    let s1, s2;
    let i, k;
    /* 0x40 would be case-sensitive */
    const tstr = new Int8Array(C.TABSIZ), tsub = new Int8Array(C.TABSIZ); /* nibble count tables */

    /* must be exact power of 2 */
    /* can't be unsafe macro */

    /* special case: empty substring */
    if (!C.loadChar(sub))
        return str;

    /* do some useful work while determining relative lengths */
    for (i = 0; i < C.TABSIZ; i++)
        tstr[i] = tsub[i] = 0; /* init */
    for (k = 0, s1 = str; C.loadChar(s1); k++)
        tstr[C.loadChar(s1++) & (C.TABSIZ - 1)]++;
    for (s2 = sub; C.loadChar(s2); --k)
        tsub[C.loadChar(s2++) & (C.TABSIZ - 1)]++;

    /* evaluate the info we've collected */
    if (k < 0)
        return 0;       /* sub longer than str, so can't match */
    for (i = 0; i < C.TABSIZ; i++) /* does sub have more 'x's than str? */
        if (tsub[i] > tstr[i])
            return 0; /* match not possible */

    /* now actually compare the substring repeatedly to parts of the string */
    for (i = 0; i <= k; i++) {
        s1 = (str + (i));
        s2 = sub;
        while (lowc(C.loadChar(s1++)) == lowc(C.loadChar(s2++)))
            if (!C.loadChar(s2))
                return (str + (i)); /* full match */
    }
    return 0; /* not found */
}

/* STRSTRI */

/* compare two strings for equality, ignoring the presence of specified
   characters (typically whitespace) and possibly ignoring case */
export function fuzzymatch(s1, s2, ignore_chars, caseblind)
{
    s1 = C.charPointer(s1); s2 = C.charPointer(s2); ignore_chars = C.charPointer(ignore_chars);
    caseblind = C.boolean(caseblind);
    let c1, c2;

    do {
        while ((c1 = C.loadChar(s1++)) != '\0'.charCodeAt(0) && C.strchr(ignore_chars, c1) != 0)
            continue;
        while ((c2 = C.loadChar(s2++)) != '\0'.charCodeAt(0) && C.strchr(ignore_chars, c2) != 0)
            continue;
        if (!c1 || !c2)
            break; /* stop when end of either string is reached */

        if (caseblind) {
            c1 = lowc(c1);
            c2 = lowc(c2);
        }
    } while (c1 == c2);

    /* match occurs only when the end of both strings has been reached */
    return (!c1 && !c2);
}

/*
 * Time routines
 *
 * The time is used for:
 *  - seed for rand()
 *  - year on tombstone and yyyymmdd in record file
 *  - phase of the moon (various monsters react to NEW_MOON or FULL_MOON)
 *  - night and midnight (the undead are dangerous at midnight)
 *  - determination of what files are "very old"
 */

/* TIME_type: type of the argument to time(); we actually use &(time_t);
   you might need to define either or both of these to 'long *' in *conf.h */

/* swapbits(val, bita, bitb) swaps bit a with bit b in val */
export function swapbits(val, bita, bitb)
{
    val = C.int(val); bita = C.int(bita); bitb = C.int(bitb);
    let tmp = ((val >> bita) & 1) ^ ((val >> bitb) & 1);

    return (val ^ ((tmp << bita) | (tmp << bitb)));
}


/*
 * Wrap snprintf for use in the main code.
 *
 * Wrap reasons:
 *   1. If there are any platform issues, we have one spot to fix them -
 *      snprintf is a routine with a troubling history of bad implementations.
 *   2. Add cumbersome error checking in one spot.  Problems with text
 *      wrangling do not have to be fatal.
 *   3. Gcc 9+ will issue a warning unless the return value is used.
 *      Annoyingly, explicitly casting to void does not remove the error.
 *      So, use the result - see reason #2.
 */
export function nh_snprintf(func, line, str, size, fmt, ...ap)
{
    func = C.charPointer(func); str = C.charPointer(str); fmt = C.charPointer(fmt);
    size = C.size_t(size);
    
    let n;

    C.va_start(ap, fmt);
    n = C.vsnprintf(str, size, fmt, ap);
    C.va_end(ap);
    if (n < 0 || C.size_t(n) >= size) { /* is there a problem? */
        C.storeChar(C.ptrAdd(str, C.size_t(size - 1n)), '\0'.charCodeAt(0)); /* make sure it is nul terminated */
    }
}


/* Unicode routines */

export function unicodeval_to_utf8str(uval, buffer, bufsz)
{
    uval = C.int(uval); bufsz = C.size_t(bufsz);
    //    static uint8 buffer[7];
    let b = buffer;

    if (bufsz < 5)
        return 0;
    /*
     *   Binary   Hex        Comments
     *   0xxxxxxx 0x00..0x7F Only byte of a 1-byte character encoding
     *   10xxxxxx 0x80..0xBF Continuation byte : one of 1-3 bytes following
     * first 110xxxxx 0xC0..0xDF First byte of a 2-byte character encoding
     *   1110xxxx 0xE0..0xEF First byte of a 3-byte character encoding
     *   11110xxx 0xF0..0xF7 First byte of a 4-byte character encoding
     */
    C.storeByte(b, '\0'.charCodeAt(0));
    if (uval < 0x80) {
        C.storeByte(b++, uval);
    } else if (uval < 0x800) {
        C.storeByte(b++, 192 + Math.trunc(uval / 64));
        C.storeByte(b++, 128 + uval % 64);
    } else if (C.uint(uval - 0xd800) < 0x800) {
        return 0;
    } else if (uval < 0x10000) {
        C.storeByte(b++, 224 + Math.trunc(uval / 4096));
        C.storeByte(b++, 128 + Math.trunc(uval / 64) % 64);
        C.storeByte(b++, 128 + uval % 64);
    } else if (uval < 0x110000) {
        C.storeByte(b++, 240 + Math.trunc(uval / 262144));
        C.storeByte(b++, 128 + Math.trunc(uval / 4096) % 64);
        C.storeByte(b++, 128 + Math.trunc(uval / 64) % 64);
        C.storeByte(b++, 128 + uval % 64);
    } else {
        return 0;
    }
    C.storeByte(b, '\0'.charCodeAt(0)); /* NUL terminate */
    return 1;
}

export function case_insensitive_comp(s1, s2)
{
    s1 = C.charPointer(s1); s2 = C.charPointer(s2);
    let u1, u2;

    for (;; s1++, s2++) {
        u1 = C.uchar(C.loadChar(s1));
        if (C.isupper(u1))
            u1 = C.uchar(C.tolower(u1));
        u2 = C.uchar(C.loadChar(s2));
        if (C.isupper(u2))
            u2 = C.uchar(C.tolower(u2));
        if (u1 == '\0'.charCodeAt(0) || u1 != u2)
            break;
    }
    return u1 - u2;
}


export function copy_bytes(ifd, ofd)
{
    ifd = C.int(ifd); ofd = C.int(ofd);
    const buf = C.stackAlloc(C.BUFSIZ);
    let nfrom, nto;

    do {
        nto = 0n;
        nfrom = C.read(ifd, buf, C.BUFSIZ);
        /* read can return -1 */
        if (nfrom >= 0 && nfrom <= C.BUFSIZ)
            nto = C.write(ofd, buf, nfrom);
        if (nto != nfrom || nfrom < 0)
            return 0;
    } while (nfrom == BigInt(C.BUFSIZ));
    return 1;
}

export const dm = [
    {sz:['shortSize','intSize','longSize','longLongSize','pointerSize'], datamodel:"", dmplatform:""},
    {sz:[2,4,4,8,4],datamodel:"ILP32LL64",dmplatform:"x86 32-bit"}, /* Windows or Unix */
    {sz:[2,4,4,8,8],datamodel:"IL32LLP64",dmplatform:"Windows x64 64-bit"},
    {sz:[2,4,8,8,8],datamodel:"I32LP64",dmplatform:"Unix 64-bit"},
    {sz:[2,8,8,8,8],datamodel:"ILP64",dmplatform:"Unix ILP64"}, /* HAL, SPARC64 */
];

export function datamodel(retidx)
{
    retidx = C.int(retidx);
    let i, j, matchcount;
    const unknown = C.charPointer("Unknown");

    for (i = 1; i < C.dm.length; ++i) {
        matchcount = 0;
        for (j = 0; j < C.MAX_D; ++j) {
            if (C.dm[0].sz[j] == C.dm[i].sz[j])
                ++matchcount;
        }
        if (matchcount == C.MAX_D)
            return (retidx == 0) ? C.dm[i].datamodel : C.dm[i].dmplatform;
    }
    return unknown;
}

export function what_datamodel_is_this(retidx, szshort, szint, szlong, szll, szptr)
{
    retidx = C.int(retidx); szshort = C.int(szshort); szint = C.int(szint); szlong = C.int(szlong); szll = C.int(szll); szptr = C.int(szptr);
    let i;
    const unknown = C.charPointer("Unknown");

    for (i = 1; i < C.dm.length; ++i) {
        if (szshort == C.dm[i].sz[0] && szint == C.dm[i].sz[1]
            && szlong == C.dm[i].sz[2] && szll == C.dm[i].sz[3]
            && szptr == C.dm[i].sz[4])
            return (retidx == 0) ? C.dm[i].datamodel : C.dm[i].dmplatform;
    }
    return unknown;
}
/*hacklib.c*/
