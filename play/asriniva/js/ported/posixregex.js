/* NetHack 5.0  posixregex.c	$NHDT-Date: 1596498286 2020/08/03 23:44:46 $  $NHDT-Branch: NetHack-5.0 $:$NHDT-Revision: 1.7 $ */
/* Copyright (c) Sean Hunt  2015.                                 */
/* NetHack may be freely redistributed.  See license for details. */

import { C } from '../c-runtime/context.js';

/* The nhregex interface is implemented by several source files. The
 * file to be used can be linked in by the build.
 *
 * The regex standard implemented should be POSIX extended regular
 * expressions, see:
 *   http://pubs.opengroup.org/onlinepubs/009696899/basedefs/xbd_chap09.html
 * If an implementation uses an alternate expression format, this should
 * be clearly noted; this will result in incompatibility of config files
 * when NetHack is compiled with that implementation.
 *
 * struct nhregex
 * The nhregex structure is an opaque structure type containing the
 * information about a compiled regular expression.
 *
 * struct nhregex *regex_init(void)
 * Used to create a new instance of the nhregex structure. It is
 * uninitialized and can only safely be passed to regex_compile.
 *
 * boolean regex_compile(const char *s, struct nhregex *re)
 * Used to compile s into a regex and store it in re. Returns TRUE if
 * successful and FALSE otherwise. re is invalidated regardless of
 * success.
 *
 * boolean regex_match(const char *s, struct nhregex *re)
 * Used to determine if s (or any substring) matches the regex compiled
 * into re. Only valid if the most recent call to regex_compile on re
 * succeeded.
 *
 * void regex_free(struct nhregex *re)
 * Deallocate a regex object.
 *
 * char *regex_error_desc(struct nhregex *re, char *outbuf)
 * Used to retrieve an explanation for an error encountered by
 * regex_compile() or regex_match().  The explanation is copied into
 * outbuf[] and a pointer to that is returned.  regex_error_desc()
 * should be called before regex_free() but outbuf[] may be used after
 * that.  outbuf[] must be able to hold at least BUFSZ characters.
 *
 * One possible error result is "out of memory" so freeing the failed
 * re should be done to try to recover memory before issuing any error
 * feedback.
 */

export const regex_id = "posixregex";

/* The opaque nhregex C storage/layout is supplied by the binding. This
 * JavaScript file implements all five original NetHack function boundaries;
 * the external POSIX regex library retains compilation/execution semantics.
 * C strings and regex_t storage remain numeric pointers. Typed re views
 * preserve the embedded regex address and int error field; heap accesses use
 * current views after native allocation can grow Wasm memory. regex_id above
 * is authoritative JS data, copied into zero-only C ABI storage at startup.
 */

export function regex_init()
{
    return C.alloc(C.NhregexSize);
}

export function regex_compile(s, re)
{
    if (!re)
        return 0;
    if ((re.err = C.regcomp(re.re, s, C.REG_EXTENDED | C.REG_NOSUB)))
        return 0;
    return 1;
}

export function regex_error_desc(re, errbuf)
{
    if (!re) {
        C.Strcpy(errbuf, "no regexp");
    } else if (!re.err) {
        C.Strcpy(errbuf, "no explanation");
    } else {
        C.HEAPU8[errbuf] = 0;
        C.regerror(re.err, re.re, errbuf, C.BUFSZ);
        if (!C.HEAP8[errbuf])
            C.Strcpy(errbuf, "unspecified regexp error");
    }
    return errbuf;
}

export function regex_match(s, re)
{
    let result;

    if (!re || !s)
        return 0;

    if ((result = C.regexec(re.re, s, 0, 0, 0))) {
        if (result != C.REG_NOMATCH)
            re.err = result;
        return 0;
    }
    return 1;
}

export function regex_free(re)
{
    C.regfree(re.re);
    C.free(re.address);
}

/*posixregex.c*/
