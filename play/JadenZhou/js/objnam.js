// objnam.js — object naming helpers.
// C ref: objnam.c
//
// Ported so far: just_an(), an().

import { lowc, strncmpi, strcmpi } from './hacklib.js';

// C ref: decl.c vowels[]
const vowels = "aeiouAEIOU";

// C ref: objnam.c just_an()
export function just_an(str) {
    let outbuf = '';
    const c0 = lowc(str[0]);

    if (!str[1] || str[1] === ' ') {
        /* single letter; might be used for named fruit or a musical note */
        outbuf = "aefhilmnosx".includes(c0) ? "an " : "a ";
    } else if (!strncmpi(str, "the ", 4)
               /* these probably shouldn't be handled here because doing so
                  impacts inventory when using them for named fruit */
               || !strcmpi(str, "molten lava")
               || !strcmpi(str, "iron bars")
               || !strcmpi(str, "ice")
               ) {
        ; /* no article */
    } else {
        /* normal case is "an <vowel>" or "a <consonant>" */
        if ((vowels.includes(c0) /* some exceptions warranting "a <vowel>" */
             /* 'wun' initial sound */
             && (strncmpi(str, "one", 3) || (str[3] && !"-_ ".includes(str[3])))
             /* long 'u' initial sound */
             && strncmpi(str, "eu", 2) /* "eucalyptus leaf" */
             && strncmpi(str, "uke", 3) && strncmpi(str, "ukulele", 7)
             && strncmpi(str, "unicorn", 7) && strncmpi(str, "uranium", 7)
             && strncmpi(str, "useful", 6)) /* "useful tool" */
            || (c0 === 'x' && !vowels.includes(lowc(str[1]))))
            outbuf = "an ";
        else
            outbuf = "a ";
    }
    return outbuf;
}

// C ref: objnam.c an()
export function an(str) {
    if (!str || !str[0]) {
        /* impossible("Alphabet soup: 'an(%s)'.", ...) */
        return "an []";
    }
    return just_an(str) + str;
}
