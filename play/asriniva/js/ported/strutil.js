/* NetHack 5.0	strutil.c	$NHDT-Date: 1709571807 2024/03/04 17:03:27 $  $NHDT-Branch: keni-mdlib-followup $:$NHDT-Revision: 1.0 $ */
/* Copyright (c) Robert Patrick Rankin, 1991                      */
/* NetHack may be freely redistributed.  See license for details. */

import { C } from '../c-runtime/context.js'; /* for config.h+extern.h */

/* JavaScript translation of strutil.c: strings remain C byte pointers during
 * mixed C/JS execution. C supplies scoped memory and C function bindings;
 * heap accesses fetch the current view because alloc() can grow Wasm memory.
 * The signed-char reads match the compiled C target. Integer casts use | 0;
 * C's unsigned return and boolean casts use >>> 0 and Number respectively.
 * The original goto uses a labelled loop, preserving its tail-recursion
 * optimization without introducing another function boundary.
 */

/* strbuf_init() initializes strbuf state for use */
export function strbuf_init(strbuf)
{
    strbuf.str = 0;
    strbuf.len = 0;
}

/* strbuf_append() appends given str to strbuf->str */
export function strbuf_append(strbuf, str)
{
    let len = ((C.strlen(str) | 0) + 1) | 0;

    strbuf_reserve(strbuf,
                   (len + (strbuf.str ? (C.strlen(strbuf.str) | 0) : 0)) | 0);
    C.Strcat(strbuf.str, str);
}

/* strbuf_reserve() ensure strbuf->str has storage for len characters */
export function strbuf_reserve(strbuf, len)
{
    if (strbuf.str == 0) {
        strbuf.str = strbuf.buf;
        C.HEAPU8[strbuf.str] = 0;
        strbuf.len = strbuf.bufSize;
    }

    if (len > strbuf.len) {
        let oldbuf = strbuf.str;

        strbuf.len = (len + strbuf.bufSize) | 0;
        strbuf.str = C.alloc(strbuf.len);
        C.Strcpy(strbuf.str, oldbuf);
        if (oldbuf != strbuf.buf)
            C.free(oldbuf);
    }
}

/* strbuf_empty() frees allocated memory and set strbuf to initial state */
export function strbuf_empty(strbuf)
{
    if (strbuf.str != 0 && strbuf.str != strbuf.buf)
        C.free(strbuf.str);
    strbuf_init(strbuf);
}

/* strbuf_nl_to_crlf() converts all occurrences of \n to \r\n */
export function strbuf_nl_to_crlf(strbuf)
{
    if (strbuf.str) {
        let len = C.strlen(strbuf.str) | 0;
        let count = 0;
        let cp = strbuf.str;

        while (C.HEAP8[cp])
            if (C.HEAP8[cp++] == 10)
                count++;
        if (count) {
            strbuf_reserve(strbuf, (len + count + 1) | 0);
            for (cp = strbuf.str + len + count; count; --cp)
                if ((C.HEAPU8[cp] = C.HEAP8[cp - count]) == 10) {
                    C.HEAPU8[--cp] = 13;
                    --count;
                }
        }
    }
}

/* strlen() but returns unsigned and panics if string is unreasonably long;
   used by dlb as well as by nethack */
export function Strlen_(
    str,
    file,
    line)
{
    let p;
    let len;

    /* strnlen(str, LARGEST_INT) w/o requiring posix.1 headers or libraries */
    for (p = str, len = 0; len < C.LARGEST_INT; ++len)
        if (C.HEAP8[p++] == 0)
            break;

    if (len == C.LARGEST_INT)
        C.panic("%s:%d string too long", file, line);
    return len >>> 0;
}

/* guts of pmatch(), pmatchi(), and pmatchz();
   match a string against a pattern */
function pmatch_internal(patrn, strng,
                ci,     /* True => case-insensitive,
                                   False => case-sensitive */
                sk) /* set of characters to skip */
{
    let s, p;
    /*
     *  Simple pattern matcher:  '*' matches 0 or more characters, '?' matches
     *  any single character.  Returns TRUE if 'strng' matches 'patrn'.
     */
 pmatch_top: for (;;) {
    if (!sk) {
        s = C.HEAP8[strng++];
        p = C.HEAP8[patrn++]; /* get next chars and pre-advance */
    } else {
        /* fuzzy match variant of pmatch; particular characters are ignored */
        do {
            s = C.HEAP8[strng++];
        } while (C.strchr(sk, s));
        do {
            p = C.HEAP8[patrn++];
        } while (C.strchr(sk, p));
    }
    if (!p)                           /* end of pattern */
        return Number(s == 0);        /* matches iff end of string too */
    else if (p == 42)                 /* wildcard reached */
        return Number((!C.HEAP8[patrn]
                           || pmatch_internal(patrn, strng - 1, ci, sk))
                          ? 1
                          : s ? pmatch_internal(patrn - 1, strng, ci, sk)
                              : 0);
    else if ((ci ? C.lowc(p) != C.lowc(s) : p != s) /* check single character */
             && (p != 63 || !s))               /* & single-char wildcard */
        return 0;                              /* doesn't match */
    else                 /* return pmatch_internal(patrn, strng, ci, sk); */
        continue pmatch_top; /* optimize tail recursion */
 }
}

/* case-sensitive wildcard match */
export function pmatch(patrn, strng)
{
    return pmatch_internal(patrn, strng, 0, 0);
}

/* case-insensitive wildcard match */
export function pmatchi(patrn, strng)
{
    return pmatch_internal(patrn, strng, 1, 0);
}


/*strutil.c*/
