/* NetHack 5.0	utf8map.c	*/
/* Copyright (c) Michael Allison, 2021. */
/* NetHack may be freely redistributed.  See license for details. */

import { C } from '../c-runtime/context.js';

/* symbols.c */

/* hexdd[] is defined in decl.c */

/* JavaScript translation of utf8map.c for the ENHANCED_SYMBOLS game build.
 * Byte strings remain numeric C pointers; all heap accesses fetch live views.
 * Typed struct views retain C field widths and pointer ownership. Local
 * glyphinfo is a raw copy of nul_glyphinfo, and ggv is an addressable C int
 * box for decode_glyph's out parameter. C supplies the existing dependencies
 * from other translation units. Pointer difference division uses Math.trunc;
 * cval stores use | 0 for C int arithmetic. All six original function
 * boundaries, parsing decisions and cleanup/list operations remain unchanged.
 */

export function unicode_val(cp)
{
    let dp;
    let cval = 0, dcount;

    if (cp && C.HEAP8[cp]) {
        cval = dcount = 0;
        if ((C.HEAP8[cp] == 85 || C.HEAP8[cp] == 117)
            && C.HEAP8[cp + 1] == 43 && C.HEAP8[cp + 2]
            && (dp = C.strchr(C.hexdd, C.HEAP8[cp + 2])) != 0) {
            cp += 2; /* move past the 'U' and '+' */
            do {
                cval = ((cval * 16) + Math.trunc((dp - C.hexdd) / 2)) | 0;
            } while (C.HEAP8[++cp] && (dp = C.strchr(C.hexdd, C.HEAP8[cp])) != 0 && ++dcount < 7);
        }
    }
    return cval;
}

export function set_map_u(gmap, utf32ch, utf8str)
{
    let tmpgm = gmap;

    if (!tmpgm || !utf32ch)
        return 0;

    if (gmap.u == 0) {
        gmap.u =
            C.unicode(C.alloc(C.UnicodeSize));
        gmap.u.utf8str = 0;
    }
    if (gmap.u.utf8str != 0) {
        C.free(gmap.u.utf8str);
        gmap.u.utf8str = 0;
    }
    gmap.u.utf8str = C.dupstr(utf8str);
    gmap.u.utf32ch = utf32ch;
    return 1;
}

export function free_all_glyphmap_u()
{
    let glyph;
    let x, y;

    for (glyph = 0; glyph < C.MAX_GLYPH; ++glyph) {
        if (C.glyphmap[glyph].u) {
            if (C.glyphmap[glyph].u.utf8str) {
                C.free(C.glyphmap[glyph].u.utf8str);
                C.glyphmap[glyph].u.utf8str = 0;
            }
            C.free(C.glyphmap[glyph].u.address);
            C.glyphmap[glyph].u = 0;
        }
    }
    /* Prevent use after free from gg.gbuf */
    for (y = 0; y < C.ROWNO; ++y) {
        for (x = 0; x < C.COLNO; ++x) {
            C.gg.gbuf[y][x].glyphinfo.gm.u = 0;
        }
    }
}

/* helper routine if a window port wants to embed any UTF-8 sequences
   for the glyph representation in the string in place of the \GNNNNNNNN
   reference */
export function mixed_to_utf8(buf, bufsz, str, retflags)
{
    let put = buf;
    let glyphinfo = C.glyphInfoCopy();

    if (!str)
        return C.strcpy(buf, "");

    while (C.HEAP8[str] && put < (buf + bufsz) - 1) {
        if (C.HEAP8[str] == 92) {
            let dcount, so, ggv = C.intLocal();
            let save_str;

            save_str = str++;
            switch (C.HEAP8[str]) {
            case 71: /* glyph value \GXXXXNNNN*/
                if ((dcount = C.decode_glyph(str + 1, ggv))) {
                    str += (dcount + 1);
                    C.map_glyphinfo(0, 0, ggv.value, 0, glyphinfo);
                    if (glyphinfo.gm.u && glyphinfo.gm.u.utf8str) {
                        let ucp = glyphinfo.gm.u.utf8str;

                        while (C.HEAPU8[ucp] && put < (buf + bufsz) - 1)
                            C.HEAPU8[put++] = C.HEAPU8[ucp++];
                        if (retflags)
                            C.storeInt(retflags, 1);
                    } else {
                        so = glyphinfo.gm.sym.symidx;
                        C.HEAPU8[put++] = C.gs.showsyms[so];
                        if (retflags)
                            C.storeInt(retflags, 0);
                    }
                    /* 'str' is ready for the next loop iteration and
                        '*str' should not be copied at the end of this
                        iteration */
                    continue;
                } else {
                    /* possible forgery - leave it the way it is */
                    str = save_str;
                }
                break;
            case 92:
                break;
            case 0:
                /* String ended with '\\'.  This can happen when someone
                    names an object with a name ending with '\\', drops the
                    named object on the floor nearby and does a look at all
                    nearby objects. */
                /* brh - should we perhaps not allow things to have names
                    that contain '\\' */
                str = save_str;
                break;
            }
        }
        if (put < (buf + bufsz) - 1)
            C.HEAPU8[put++] = C.HEAP8[str++];
    }
    C.HEAPU8[put] = 0;
    return buf;
}

export function add_custom_urep_entry(
    customization_name,
    glyphidx,
    utf32ch,
    utf8str,
    which_set)
{
    let gdc
        = C.gs.sym_customizations[which_set][C.custom_ureps];
    let details, newdetails = 0;


    if (!gdc.details) {
        gdc.customization_name = C.dupstr(customization_name);
        gdc.custtype = C.custom_ureps;
        gdc.details = 0;
        gdc.details_end = 0;
    }
    details = C.find_matching_customization(customization_name,
                                          C.custom_ureps, which_set); /* FIXME */
    if (details) {
        while (details) {
            if (details.content.urep.glyphidx == glyphidx) {
                if (details.content.urep.u.utf8str)
                    C.free(details.content.urep.u.utf8str);
                if (utf32ch) {
                    details.content.urep.u.utf8str =
                        C.dupstr(utf8str);
                    details.content.urep.u.utf32ch = utf32ch;
                } else {
                    details.content.urep.u.utf8str = 0;
                    details.content.urep.u.utf32ch = 0;
                }
                return 1;
            }
            details = details.next;
        }
    }
    /* create new details entry */
    newdetails = C.customization(C.alloc(C.DetailSize));
    newdetails.content.urep.glyphidx = glyphidx;
    if (utf8str && C.HEAPU8[utf8str]) {
        newdetails.content.urep.u.utf8str =
            C.dupstr(utf8str);
    } else {
        newdetails.content.urep.u.utf8str = 0;
    }
    newdetails.content.urep.u.utf32ch = utf32ch;
    newdetails.next = 0;
    if (gdc.details == 0) {
        gdc.details = newdetails;
    } else {
        gdc.details_end.next = newdetails;
    }
    gdc.details_end = newdetails;
    gdc.count++;
    return 1;
}
/* ENHANCED_SYMBOLS */

export function reset_customsymbols()
{
    free_all_glyphmap_u();
    C.apply_customizations(C.gc.currentgraphics, C.do_custom_symbols);
}

/* utf8map.c */

