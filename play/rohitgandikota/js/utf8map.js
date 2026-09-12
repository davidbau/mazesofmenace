// utf8map.js — the UTF-8 side of the symset customizations.
// C ref: src/utf8map.c
//
// A symset or SYMBOLS= line can give a glyph a "U+xxxx" representation.
// The recorder's tty prints those through g_pututf8(), which its screen
// model does not capture (js/symbols.js keeps such cells blank); this file
// keeps the values the C keeps, for #wizcustom and the customization
// bookkeeping.

import { custom_ureps } from './const.js';
import { gs_sym_customizations, find_matching_customization } from './glyphs.js';

const hexdd = '00112233445566778899aAbBcCdDeEfF';

// src/utf8map.c:18 unicode_val() — "U+1234" (up to six hex digits) to its
// code point; anything else is 0
export function unicode_val(cp) {
    let cval = 0, dcount;

    if (cp && cp.length) {
        cval = dcount = 0;
        let i = 0, dp;
        if ((cp[i] === 'U' || cp[i] === 'u')
            && cp[i + 1] === '+' && cp[i + 2] !== undefined
            && (dp = hexdd.indexOf(cp[i + 2])) >= 0) {
            i += 2; /* move past the 'U' and '+' */
            do {
                cval = (cval * 16) + Math.trunc(dp / 2);
            } while (cp[++i] !== undefined && (dp = hexdd.indexOf(cp[i])) >= 0
                     && ++dcount < 7);
        }
    }
    return cval;
}

// src/utf8map.c:37 set_map_u() — attach a unicode representation to a
// glyphmap entry
export function set_map_u(gmap, utf32ch, utf8str) {
    if (!gmap || !utf32ch)
        return 0;
    if (!gmap.u)
        gmap.u = { utf8str: null, utf32ch: 0 };
    gmap.u.utf8str = utf8str;
    gmap.u.utf32ch = utf32ch;
    return 1;
}

// src/utf8map.c:148 add_custom_urep_entry()
export function add_custom_urep_entry(customization_name, glyphidx, utf32ch,
                                      utf8str, which_set) {
    const gdc = gs_sym_customizations[which_set][custom_ureps];
    let details, newdetails;

    if (!gdc.details.length) {
        gdc.customization_name = customization_name;
        gdc.custtype = custom_ureps;
        gdc.details = [];
    }
    details = find_matching_customization(customization_name, custom_ureps,
                                          which_set); /* FIXME */
    if (details) {
        for (const d of details) {
            if (d.content.urep.glyphidx === glyphidx) {
                if (utf32ch) {
                    d.content.urep.u.utf8str = utf8str;
                    d.content.urep.u.utf32ch = utf32ch;
                } else {
                    d.content.urep.u.utf8str = null;
                    d.content.urep.u.utf32ch = 0;
                }
                return 1;
            }
        }
    }
    /* create new details entry */
    newdetails = { content: { urep: { glyphidx,
                                      u: { utf8str: (utf8str && utf8str.length) ? utf8str : null,
                                           utf32ch } } } };
    gdc.details.push(newdetails);
    gdc.count++;
    return 1;
}
