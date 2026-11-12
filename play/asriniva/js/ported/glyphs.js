/* NetHack 5.0	glyphs.c	TODO: add NHDT branch/date/revision tags */
/* Copyright (c) Michael Allison, 2021. */
/* NetHack may be freely redistributed.  See license for details. */

import { C } from '../c-runtime/context.js';

export const res_nothing=0, res_dump_glyphids=1, res_fill_cache=2;
export const find_nothing=0, find_pm=1, find_oc=2, find_cmap=3, find_glyph=4;
export const zero_find={findtype:0,val:0,loadsyms_offset:0,loadsyms_count:0,extraval:0,color:0,unicode_val:0,callback:0,restype:0,reserved:0};
export const glyphid_cache=0, glyphid_cache_lsize=0, glyphid_cache_size=0n;
export const nonzero_black=["CLR_BLACK","NH_BASIC_COLOR"];

export function to_custom_symset_entry_callback(glyph, findwhat)
{
    let idx = C.gs.symset_which_set;

    const utf8str = C.byteArray([0,0,0,0,0,0]);
    let uval = 0;


    if (findwhat.extraval)
        C.storeInt(findwhat.extraval, glyph);

    C.assert(idx >= 0 && idx < C.NUM_GRAPHICS);

    if (findwhat.unicode_val)
        uval = C.unicode_val(findwhat.unicode_val);
    if (uval && C.unicodeval_to_utf8str(uval, utf8str, 6)) {
        /* presently the customizations are affiliated with a particular
         * symset but if we don't have any symset context, ignore it for now
         * in order to avoid a segfault.
         * FIXME:
         * One future idea might be to store the U+ entries under "UTF8"
         * and apply those customizations to any current symset if it has
         * a UTF8 handler. Similar approach for unaffiliated glyph/symbols
         * non-UTF color customizations
         */
        if (C.gs.symset[idx].name) {
            C.add_custom_urep_entry(C.gs.symset[idx].name, glyph, uval,
                              utf8str, C.gs.symset_which_set);
        } else {
            const glyphnag = C.staticInt("to_custom_symset_entry_callback.glyphnag", 0);

            if (!glyphnag.value++)
                C.config_error_add("Unimplemented customization feature," + " ignoring for now");
        }
    }

    if (findwhat.color) {
        if (C.gs.symset[idx].name) {
            add_custom_nhcolor_entry(C.gs.symset[idx].name, glyph,
                                 findwhat.color, C.gs.symset_which_set);
        } else {
            const colornag = C.staticInt("to_custom_symset_entry_callback.colornag", 0);

            if (!colornag.value++)
                C.config_error_add("Unimplemented customization feature," + " ignoring for now");
        }
    }
}

/*
 * Return value:
 *               1 = success
 *               0 = failure
 */
export function glyphrep_to_custom_map_entries(op, glyphptr)
{
    C.copyFind(C.glyphsState.to_custom_symbol_find, C.zero_find);
    const buf = C.stackAlloc(C.BUFSZ);
    let c_glyphid, c_unicode, c_colorval, cp;
    let reslt = 0;
    let rgb = 0n;
    let slash = C.FALSE, colon = C.FALSE;

    if (!C.glyphsState.glyphid_cache)
        reslt = 1; /* for debugger use only; no cache available */
    C.nhUse(reslt);

    C.Snprintf("glyphrep_to_custom_map_entries", 126, buf, C.BUFSZ, "%s", op);
    c_unicode = c_colorval = 0;
    c_glyphid = cp = buf;
    while (C.loadChar(cp)) {
        if (C.loadChar(cp) == 58 || C.loadChar(cp) == 47) {
            if (C.loadChar(cp) == 58) {
                colon = C.TRUE;
                C.storeChar(cp, 0);
            }
            if (C.loadChar(cp) == 47) {
                slash = C.TRUE;
                C.storeChar(cp, 0);
            }
        }
        cp++;
        if (colon) {
            c_unicode = cp;
            colon = C.FALSE;
        }
        if (slash) {
            c_colorval = cp;
            slash = C.FALSE;
        }
    }
    /* some sanity checks */
    if (c_glyphid && C.loadChar(c_glyphid) == 32)
        c_glyphid++;
    if (c_colorval && C.loadChar(c_colorval) == 32)
        c_colorval++;
    if (c_unicode && C.loadChar(c_unicode) == 32) {
        while (C.loadChar(c_unicode) == 32) {
            c_unicode++;
        }
    }
    if (c_unicode && !C.loadChar(c_unicode))
        c_unicode = 0;

    if ((c_colorval && (rgb = BigInt(C.rgbstr_to_int32(c_colorval))) != -1n)
        || !c_colorval) {
        /* if the color 0 is an actual color, as opposed to just "not set"
           we set a marker bit outside the 24-bit range to indicate a
           valid color value 0. That allows valid color 0, but allows a
           simple checking for 0 to detect "not set". The window port that
           implements the color switch, needs to either check that bit
           or appropriately mask colors with 0xFFFFFF. */
        C.glyphsState.to_custom_symbol_find.color = (rgb == -1 || !c_colorval) ? 0n
                                      : (rgb == 0n) ? C.nonzero_black
                                                    : rgb;
    }
    if (c_unicode)
        C.glyphsState.to_custom_symbol_find.unicode_val = c_unicode;
    C.glyphsState.to_custom_symbol_find.extraval = glyphptr;
    C.glyphsState.to_custom_symbol_find.callback = to_custom_symset_entry_callback;
    reslt = glyph_find_core(c_glyphid, C.glyphsState.to_custom_symbol_find);
    return reslt;
}

export function fix_glyphname(str)
{
    let c;

    for (c = str; C.loadChar(c); c++) {
        if (C.loadChar(c) >= 65 && C.loadChar(c) <= 90)
            C.storeChar(c, C.loadChar(c) + (97 - 65));
        else if (C.loadChar(c) >= 48 && C.loadChar(c) <= 57)
            ;
        else if (C.loadChar(c) < 97 || C.loadChar(c) > 122)
            C.storeChar(c, 95);
    }
    return str;
}

export function glyph_to_cmap(glyph)
{
    if (glyph == C.GLYPH_CMAP_STONE_OFF)
        return C.S_stone;
    else if (C.glyph_is_cmap_main(glyph))
        return (glyph - C.GLYPH_CMAP_MAIN_OFF) + C.S_vwall;
    else if (C.glyph_is_cmap_mines(glyph))
        return (glyph - C.GLYPH_CMAP_MINES_OFF) + C.S_vwall;
    else if (C.glyph_is_cmap_gehennom(glyph))
        return (glyph - C.GLYPH_CMAP_GEH_OFF) + C.S_vwall;
    else if (C.glyph_is_cmap_knox(glyph))
        return (glyph - C.GLYPH_CMAP_KNOX_OFF) + C.S_vwall;
    else if (C.glyph_is_cmap_sokoban(glyph))
        return (glyph - C.GLYPH_CMAP_SOKO_OFF) + C.S_vwall;
    else if (C.glyph_is_cmap_a(glyph))
        return (glyph - C.GLYPH_CMAP_A_OFF) + C.S_ndoor;
    else if (C.glyph_is_cmap_altar(glyph))
        return C.S_altar;
    else if (C.glyph_is_cmap_b(glyph))
        return (glyph - C.GLYPH_CMAP_B_OFF) + C.S_grave;
    else if (C.glyph_is_cmap_c(glyph))
        return (glyph - C.GLYPH_CMAP_C_OFF) + C.S_digbeam;
    else if (C.glyph_is_cmap_zap(glyph))
        return ((glyph - C.GLYPH_ZAP_OFF) % 4) + C.S_vbeam;
    else if (C.glyph_is_swallow(glyph))
        return C.glyph_to_swallow(glyph) + C.S_sw_tl;
    else if (C.glyph_is_explosion(glyph))
        return C.glyph_to_explosion(glyph) + C.S_expl_tl;
    else
        return C.MAXPCHARS;    /* MAXPCHARS is legal array index because
                              * of trailing fencepost entry */
}

export function glyph_find_core(id, findwhat)
{
    let glyph;
    let do_callback, end_find = C.FALSE;

    if (C.callLocal(parse_id, id, findwhat)) {
        if (findwhat.findtype == C.find_glyph) {
            C.callFindCallback(findwhat.callback, findwhat.val, findwhat);
        } else {
            for (glyph = 0; glyph < C.MAX_GLYPH; ++glyph) {
                do_callback = C.FALSE;
                switch (findwhat.findtype) {
                case C.find_cmap:
                    if (glyph_to_cmap(glyph) == findwhat.val)
                        do_callback = C.TRUE;
                    break;
                case C.find_pm:
                    if (C.glyph_is_monster(glyph)
                        && C.mons[C.glyph_to_mon(glyph)].mlet
                           == findwhat.val)
                        do_callback = C.TRUE;
                    break;
                case C.find_oc:
                    if (C.glyph_is_object(glyph)
                        && C.glyph_to_obj(glyph) == findwhat.val)
                        do_callback = C.TRUE;
                    break;
                case C.find_glyph:
                    if (glyph == findwhat.val) {
                        do_callback = C.TRUE;
                        end_find = C.TRUE;
                    }
                    break;
                case C.find_nothing:
                default:
                    end_find = C.TRUE;
                    break;
                }
                if (do_callback)
                    C.callFindCallback(findwhat.callback, glyph, findwhat);
                if (end_find)
                    break;
            }
        }
        return 1;
    }
    return 0;
}

/*
 When we start to process a config file or a symbol file,
 that might have G_ entries, generating all 9000+ glyphid
 for comparison repeatedly each time we encounter a G_
 entry to decipher, then comparing against them, is obviously
 extremely performance-poor.

 Setting aside the "comparison" part for now (that has to be
 done in some manner), we can likely do something about the
 repeated "generation" of the names for parsing prior to the
 actual comparison part by generating them once, ahead of the
 bulk of the potential parsings. We can later free up
 all the memory those names consumed once the bulk parsing is
 over with.
*/


export function fill_glyphid_cache()
{
    let reslt = 0;

    if (!C.glyphsState.glyphid_cache) {
        init_glyph_cache();
    }
    if (C.glyphsState.glyphid_cache) {
        C.copyFind(C.glyphsState.glyphcache_find, C.zero_find);
        C.glyphsState.glyphcache_find.findtype = C.find_nothing;
        C.glyphsState.glyphcache_find.reserved = C.glyphsState.glyphid_cache;
        C.glyphsState.glyphcache_find.restype = C.res_fill_cache;
        reslt = C.callLocal(parse_id, 0, C.glyphsState.glyphcache_find);
        if (!reslt) {
            free_glyphid_cache();
            C.glyphsState.glyphid_cache = 0;
        }
    }
}

/*
 * The glyph ID cache is a simple double-hash table.
 * The cache size is a power of two, and two hashes are derived from the
 * cache ID. The first is a location in the table, and the second is an
 * offset. On any collision, the second hash is added to the first until
 * a match or an empty bucket is found.
 * The second hash is an odd number, which is necessary and sufficient
 * to traverse the entire table.
 */

export function init_glyph_cache()
{
    let glyph;

    /* Cache size of power of 2 not less than 2*MAX_GLYPH */
    C.glyphsState.glyphid_cache_lsize = 0;
    C.glyphsState.glyphid_cache_size = 1n;
    while (C.glyphsState.glyphid_cache_size < 2*C.MAX_GLYPH) {
        ++C.glyphsState.glyphid_cache_lsize;
        C.glyphsState.glyphid_cache_size <<= 1n;
    }

    C.glyphsState.glyphid_cache = C.cacheArray(C.alloc(C.glyphsState.glyphid_cache_size * BigInt(C.cacheEntrySize)));
    for (glyph = 0n; glyph < C.glyphsState.glyphid_cache_size; ++glyph) {
        C.glyphsState.glyphid_cache[glyph].glyphnum = 0;
        C.glyphsState.glyphid_cache[glyph].id = 0;
    }
}

export function free_glyphid_cache()
{
    let idx;

    if (!C.glyphsState.glyphid_cache)
        return;
    for (idx = 0n; idx < C.glyphsState.glyphid_cache_size; ++idx) {
        if (C.glyphsState.glyphid_cache[idx].id) {
            C.free(C.glyphsState.glyphid_cache[idx].id);
            C.glyphsState.glyphid_cache[idx].id = 0;
        }
    }
    C.free(C.glyphsState.glyphid_cache);
    C.glyphsState.glyphid_cache = 0;
}

export function add_glyph_to_cache(glyphnum, id)
{
    let hash = glyph_hash(id);
    let hash1 = (BigInt(hash) & (C.glyphsState.glyphid_cache_size - 1n));
    let hash2 = 
            ((BigInt(hash >>> C.glyphsState.glyphid_cache_lsize) & (C.glyphsState.glyphid_cache_size - 1n)) | 1n);
    let i = hash1;

    do {
        if (C.glyphsState.glyphid_cache[i].id == C.NULL) {
            /* Empty bucket found */
            C.glyphsState.glyphid_cache[i].id = C.dupstr(id);
            C.glyphsState.glyphid_cache[i].glyphnum = glyphnum;
            return;
        }
        /* For speed, assume that no ID occurs twice */
        i = (i + hash2) & (C.glyphsState.glyphid_cache_size - 1n);
    } while (i != hash1);
    /* This should never happen */
    C.panic("glyphid_cache full");
}

export function find_glyph_in_cache(id)
{
    let hash = glyph_hash(id);
    let hash1 = (BigInt(hash) & (C.glyphsState.glyphid_cache_size - 1n));
    let hash2 = 
            ((BigInt(hash >>> C.glyphsState.glyphid_cache_lsize) & (C.glyphsState.glyphid_cache_size - 1n)) | 1n);
    let i = hash1;

    do {
        if (C.glyphsState.glyphid_cache[i].id == C.NULL) {
            /* Empty bucket found */
            return -1;
        }
        if (C.strcmpi(id, C.glyphsState.glyphid_cache[i].id) == 0) {
            /* Match found */
            return C.glyphsState.glyphid_cache[i].glyphnum;
        }
        i = (i + hash2) & (C.glyphsState.glyphid_cache_size - 1n);
    } while (i != hash1);
    return -1;
}

export function find_glyphid_in_cache_by_glyphnum(glyphnum)
{
    let idx;

    if (!C.glyphsState.glyphid_cache)
        return 0;
    for (idx = 0n; idx < C.glyphsState.glyphid_cache_size; ++idx) {
        if (C.glyphsState.glyphid_cache[idx].glyphnum == glyphnum
            && C.glyphsState.glyphid_cache[idx].id != 0) {
            /* Match found */
            return C.glyphsState.glyphid_cache[idx].id;
        }
    }
    return 0;
}

export function glyph_hash(id)
{
    let hash = 0;
    let i;

    for (i = 0; C.loadChar(id, i) != 0; ++i) {
        let ch = C.loadChar(id, i);
        if (65 <= ch && ch <= 90) {
            ch += 97 - 65;
        }
        hash = ((hash << 1) | (hash >>> 31)) >>> 0;
        hash = (hash ^ ch) >>> 0;
    }
    return hash;
}

export function glyphid_cache_status()
{
    return (C.glyphsState.glyphid_cache != 0);
}

export function match_glyph(buf)
{
    const workbuf = C.stackAlloc(C.BUFSZ);

    /* buf contains a G_ glyph reference, not an S_ symbol.
        There could be an R-G-B color attached too.
        Let's get a copy to work with. */
    C.Snprintf("match_glyph", 465, workbuf, C.BUFSZ, "%s", buf); /* get a copy */
    return C.callLocal(glyphrep, workbuf);
}

export function glyphrep(op)
{
    let reslt = 0; const glyph = C.intLocal(C.NO_GLYPH);

    if (!C.glyphsState.glyphid_cache)
        reslt = 1;      /* for debugger use only; no cache available */
    C.nhUse(reslt);
    reslt = C.callLocal(glyphrep_to_custom_map_entries, op, glyph);
    if (reslt)
        return 1;
    return 0;
}

export function add_custom_nhcolor_entry(customization_name, glyphidx, nhcolor, which_set)
{
    let gdc
                        = C.gs.sym_customizations[which_set][C.custom_nhcolor];
    let details, newdetails = 0;





    if (!gdc.details) {
        gdc.customization_name = C.dupstr(customization_name);
        gdc.custtype = C.custom_nhcolor;
        gdc.details = 0;
        gdc.details_end = 0;
    }
    details = find_matching_customization(customization_name,
                                          C.custom_nhcolor, which_set);
    if (details) {
        while (details) {
            if (details.content.ccolor.glyphidx == glyphidx) {
                details.content.ccolor.nhcolor = nhcolor;
                return 1;
            }
            details = details.next;
        }
    }
    /* create new details entry */
    newdetails = C.detail(C.alloc(C.detailSize));
    newdetails.content.urep.glyphidx = glyphidx;
    newdetails.content.ccolor.nhcolor = nhcolor;
    newdetails.next = 0;
    if (gdc.details == C.NULL) {
        gdc.details = newdetails;
    } else {
        gdc.details_end.next = newdetails;
    }
    gdc.details_end = newdetails;
    gdc.count++;
    return 1;
}

export function apply_customizations(which_set, docustomize)
{
    let gmap;
    let details;
    let sc;
    let at_least_one = C.FALSE,
            do_colors = ((docustomize & C.do_custom_colors) != 0),
            do_symbols = ((docustomize & C.do_custom_symbols) != 0);
    let custs;

    for (custs = 0; custs < C.custom_count; ++custs) {
        sc = C.gs.sym_customizations[which_set][custs];
        if (sc.count && sc.details) {
            at_least_one = C.TRUE;
            /* These glyph customizations get applied to the glyphmap array,
               not to symset entries */
            details = sc.details;
            while (details) {

                if (C.iflags.customsymbols && do_symbols) {
                    if (sc.custtype == C.custom_ureps) {
                        gmap = C.glyphmap[details.content.urep.glyphidx];
                        if (C.gs.symset[which_set].handling == C.H_UTF8)
                            C.set_map_u(gmap,
                                             details.content.urep.u.utf32ch,
                                             details.content.urep.u.utf8str);
                    }
                }

                if (C.iflags.customcolors && do_colors) {
                    if (sc.custtype == C.custom_nhcolor) {
                        gmap = C.glyphmap[details.content.ccolor.glyphidx];
                        C.set_map_customcolor(gmap,
                                             details.content.ccolor.nhcolor);
                    }
                }
                details = details.next;
            }
        }
    }
    C.iflags.pending_customizations = at_least_one;
}

/* Shuffle the customizations to match shuffled object descriptions,
 * so a red potion isn't displayed with a blue customization, and so on.
 */

export function maybe_shuffle_customizations()
{
    if (C.iflags.pending_customizations) {
        shuffle_customizations();
        C.iflags.pending_customizations = 0;
    }
}

























































export function shuffle_customizations()
{
    const offsets = [ C.GLYPH_OBJ_OFF, C.GLYPH_OBJ_PILETOP_OFF ];
    let j;

    for (j = 0; j < offsets.length; j++) {
        let obj_glyphs = C.glyphArray(C.glyphAddress(offsets[j]));
        let i;

        const tmp_u = C.newArray(C.NUM_OBJECTS);

        const tmp_customcolor = C.newArray(C.NUM_OBJECTS);
        const tmp_color256idx = C.newArray(C.NUM_OBJECTS);

        const duplicate = C.newArray(C.NUM_OBJECTS);

        for (i = 0; i < C.NUM_OBJECTS; i++) {
            duplicate[i] = -1;

            tmp_u[i] = 0;

            tmp_customcolor[i] = 0;
            tmp_color256idx[i] = 0;
        }
        for (i = 0; i < C.NUM_OBJECTS; i++) {
            let idx = C.objects[i].oc_descr_idx;

            /*
             * Shuffling gem appearances can cause the same oc_descr_idx to
             * appear more than once. Detect this condition and ensure that
             * each pointer points to a unique allocation.
             */
            if (duplicate[idx] >= 0) {

                /* Current structure already appears in tmp_u */
                let other = tmp_u[duplicate[idx]];

                let other_customcolor = tmp_customcolor[duplicate[idx]];
                let other_color256idx = tmp_color256idx[duplicate[idx]];

                tmp_customcolor[i] = other_customcolor;
                tmp_color256idx[i] = other_color256idx;

                if (other) {
                    tmp_u[i] = C.unicode(C.alloc(C.unicodeSize));
                    C.copyUnicode(tmp_u[i], other);
                    if (other.utf8str != C.NULL) {
                        tmp_u[i].utf8str =
                            C.dupstr(other.utf8str);
                    }
                }

            } else {
                tmp_customcolor[i] = obj_glyphs[idx].customcolor;
                tmp_color256idx[i] = obj_glyphs[idx].color256idx;

                tmp_u[i] = obj_glyphs[idx].u;

                if (

                    obj_glyphs[idx].u != C.NULL ||

                    obj_glyphs[idx].customcolor != 0) {
                    duplicate[idx] = i;

                    obj_glyphs[idx].u = C.NULL;

                    obj_glyphs[idx].customcolor = 0;
                    obj_glyphs[idx].color256idx = 0;
                }
            }
        }
        for (i = 0; i < C.NUM_OBJECTS; i++) {
            /* Some glyphmaps may not have been transferred */

            if (obj_glyphs[i].u != C.NULL) {
                C.free(obj_glyphs[i].u.utf8str);
                C.free(obj_glyphs[i].u);
            }
            obj_glyphs[i].u = tmp_u[i];

            obj_glyphs[i].customcolor = tmp_customcolor[i];
            obj_glyphs[i].color256idx = tmp_color256idx[i];
        }
    }
}


export function find_matching_customization(customization_name, custtype, which_set)
{
    let gdc
        = C.gs.sym_customizations[which_set][custtype];

    if ((gdc.custtype == custtype) && gdc.customization_name
        && (C.strcmp(customization_name, gdc.customization_name) == 0))
        return gdc.details;
    return 0;
}

export function purge_all_custom_entries()
{
    let i;

    for (i = 0; i < C.NUM_GRAPHICS + 1; ++i) {
        purge_custom_entries(i);
    }
}

export function purge_custom_entries(which_set)
{
    let custtype;
    let gdc;
    let details, next;

    for (custtype = C.custom_none; custtype < C.custom_count; ++custtype) {
        gdc = C.gs.sym_customizations[which_set][custtype];
        details = gdc.details;
        while (details) {
            next = details.next;
            if (gdc.custtype == C.custom_ureps) {
                if (details.content.urep.u.utf8str)
                    C.free(details.content.urep.u.utf8str);
                details.content.urep.u.utf8str = 0;
            } else if (gdc.custtype == C.custom_symbols) {
                details.content.sym.symparse = 0;
                details.content.sym.val = 0;
            } else if (gdc.custtype == C.custom_nhcolor) {
                details.content.ccolor.nhcolor = 0;
                details.content.ccolor.glyphidx = 0;
            }
            C.free(details);
            details = next;
        }
        gdc.details = 0;
        gdc.details_end = 0;
        if (gdc.customization_name) {
            C.free(gdc.customization_name);
            gdc.customization_name = 0;
        }
        gdc.count = 0;
    }
}

export function dump_all_glyphids(fp)
{
    const dump_glyphid_find = C.localFind(C.zero_find);

    dump_glyphid_find.findtype = C.find_nothing;
    dump_glyphid_find.reserved = fp;
    dump_glyphid_find.restype = C.res_dump_glyphids;
    C.callLocal(parse_id, 0, dump_glyphid_find);
}

export function wizcustom_glyphids(win)
{
    let glyphnum;
    let id;

    if (!C.glyphsState.glyphid_cache)
        return;
    for (glyphnum = 0; glyphnum < C.MAX_GLYPH; ++glyphnum) {
        id = find_glyphid_in_cache_by_glyphnum(glyphnum);
        if (id) {
            C.wizcustom_callback(win, glyphnum, id);
        }
    }
}

export function parse_id(id, findwhat)
{
    let fp = 0;
    let i = 0, j, mnum, glyph,
        pm_offset = 0, oc_offset = 0, cmap_offset = 0,
        pm_count = 0, oc_count = 0, cmap_count = 0;
    let skip_base = C.FALSE, skip_this_one = C.FALSE, dump_ids = C.FALSE,
            filling_cache = C.FALSE, is_S = C.FALSE, is_G = C.FALSE;
    const buf = C.byteMatrix(4, C.QBUFSZ);

    if (findwhat.findtype == C.find_nothing && findwhat.restype) {
        if (findwhat.restype == C.res_dump_glyphids) {
            if (findwhat.reserved) {
                fp = findwhat.reserved;
                dump_ids = C.TRUE;
            } else {
                return 0;
            }
        }
        if (findwhat.restype == C.res_fill_cache) {
            if (findwhat.reserved
                && C.samePtr(findwhat.reserved, C.glyphsState.glyphid_cache)) {
                filling_cache = C.TRUE;
            } else {
                return 0;
            }
        }
    }

    is_G = (id && C.loadChar(id, 0) == 71 && C.loadChar(id, 1) == 95);
    is_S = (id && C.loadChar(id, 0) == 83 && C.loadChar(id, 1) == 95);

    if ((is_G && !C.glyphsState.glyphid_cache) || filling_cache || dump_ids || is_S) {
        while (C.loadsyms[i].range) {
            if (!pm_offset && C.loadsyms[i].range == C.SYM_MON)
                pm_offset = i;
            if (!pm_count && pm_offset && C.loadsyms[i].range != C.SYM_MON)
                pm_count = i - pm_offset;
            if (!oc_offset && C.loadsyms[i].range == C.SYM_OC)
                oc_offset = i;
            if (!oc_count && oc_offset && C.loadsyms[i].range != C.SYM_OC)
                oc_count = i - oc_offset;
            if (!cmap_offset && C.loadsyms[i].range == C.SYM_PCHAR)
                cmap_offset = i;
            if (!cmap_count && cmap_offset && C.loadsyms[i].range != C.SYM_PCHAR)
                cmap_count = i - cmap_offset;
            i++;
        }
    }
    if (is_G || filling_cache || dump_ids) {
        if (!filling_cache && id && C.glyphsState.glyphid_cache) {
            let val = find_glyph_in_cache(id);
            if (val >= 0) {
                findwhat.findtype = C.find_glyph;
                findwhat.val = val;
                findwhat.loadsyms_offset = 0;
                return 1;
            } else {
                return 0;
            }
        } else {
            let buf2, buf3, buf4;

            /* individual matching glyph entries */
            for (glyph = 0; glyph < C.MAX_GLYPH; ++glyph) {
                skip_base = C.FALSE;
                skip_this_one = C.FALSE;
                C.storeChar(buf[0], 0); C.storeChar(buf[1], 0); C.storeChar(buf[2], 0); C.storeChar(buf[3], 0);
                if (C.glyph_is_monster(glyph)) {
                    /* buf2 will hold the distinguishing prefix */
                    /* buf3 will hold the base name */
                    buf2 = "";
                    buf3 = C.monsdump[C.glyph_to_mon(glyph)].nm;

                    if (C.glyph_is_normal_male_monster(glyph)) {
                        buf2 = "male_";
                    } else if (C.glyph_is_normal_female_monster(glyph)) {
                        buf2 = "female_";
                    } else if (C.glyph_is_ridden_male_monster(glyph)) {
                        buf2 = "ridden_male_";
                    } else if (C.glyph_is_ridden_female_monster(glyph)) {
                        buf2 = "ridden_female_";
                    } else if (C.glyph_is_detected_male_monster(glyph)) {
                        buf2 = "detected_male_";
                    } else if (C.glyph_is_detected_female_monster(glyph)) {
                        buf2 = "detected_female_";
                    } else if (C.glyph_is_male_pet(glyph)) {
                        buf2 = "pet_male_";
                    } else if (C.glyph_is_female_pet(glyph)) {
                        buf2 = "pet_female_";
                    }
                    C.Strcpy(buf[0], "G_");
                    C.Strcat(buf[0], buf2);
                    C.Strcat(buf[0], buf3);
                } else if (C.glyph_is_body(glyph)) {
                    /* buf2 will hold the distinguishing prefix */
                    /* buf3 will hold the base name */
                    buf2 = C.glyph_is_body_piletop(glyph)
                           ? "piletop_body_"
                           : "body_";
                    buf3 = C.monsdump[C.glyph_to_body_corpsenm(glyph)].nm;
                    C.Strcpy(buf[0], "G_");
                    C.Strcat(buf[0], buf2);
                    C.Strcat(buf[0], buf3);
                } else if (C.glyph_is_statue(glyph)) {
                    /* buf2 will hold the distinguishing prefix */
                    /* buf3 will hold the base name */
                    buf2 = C.glyph_is_fem_statue_piletop(glyph)
                           ? "piletop_statue_of_female_"
                           : C.glyph_is_fem_statue(glyph)
                             ? "statue_of_female_"
                             : C.glyph_is_male_statue_piletop(glyph)
                               ? "piletop_statue_of_male_"
                               : C.glyph_is_male_statue(glyph)
                                 ? "statue_of_male_"
                                 : ""; /* shouldn't happen */
                    buf3 = C.monsdump[C.glyph_to_statue_corpsenm(glyph)].nm;
                    C.Strcpy(buf[0], "G_");
                    C.Strcat(buf[0], buf2);
                    C.Strcat(buf[0], buf3);
                } else if (C.glyph_is_object(glyph)) {
                    i = C.glyph_to_obj(glyph);
                    /* buf2 will hold the distinguishing prefix */
                    /* buf3 will hold the base name */
                    if (((i > C.SCR_STINKING_CLOUD) && (i < C.SCR_MAIL))
                        || ((i > C.WAN_LIGHTNING) && (i < C.GOLD_PIECE)))
                        skip_this_one = C.TRUE;
                    if (!skip_this_one) {
                        if ((i >= C.WAN_LIGHT) && (i <= C.WAN_LIGHTNING))
                            buf2 = "wand of ";
                        else if ((i >= C.SPE_DIG) && (i < C.SPE_BLANK_PAPER))
                            buf2 = "spellbook of ";
                        else if ((i >= C.SCR_ENCHANT_ARMOR)
                                 && (i <= C.SCR_STINKING_CLOUD))
                            buf2 = "scroll of ";
                        else if ((i >= C.POT_GAIN_ABILITY) && (i <= C.POT_WATER))
                            buf2 = (i == C.POT_WATER) ? "flask of n"
                                                    : "potion of ";
                        else if ((i >= C.RIN_ADORNMENT)
                                 && (i <= C.RIN_PROTECTION_FROM_SHAPE_CHAN))
                            buf2 = "ring of ";
                        else if (i == C.LAND_MINE)
                            buf2 = "unset ";
                        else
                            buf2 = "";
                        buf3 = (i == C.SCR_BLANK_PAPER) ? "blank scroll"
                               : (i == C.SPE_BLANK_PAPER) ? "blank spellbook"
                                 : (i == C.SLIME_MOLD) ? "slime mold"
                                   : C.obj_descr[i].oc_name
                                     ? C.obj_descr[i].oc_name
                                     : C.obj_descr[i].oc_descr;
                        C.Strcpy(buf[0], "G_");
                        if (C.glyph_is_normal_piletop_obj(glyph))
                            C.Strcat(buf[0], "piletop_");
                        C.Strcat(buf[0], buf2);
                        C.Strcat(buf[0], buf3);
                    }
                } else if (C.glyph_is_cmap(glyph) || C.glyph_is_cmap_zap(glyph)
                           || C.glyph_is_swallow(glyph)
                           || C.glyph_is_explosion(glyph)) {
                    let cmap = -1;

                    /* buf2 will hold the distinguishing prefix */
                    /* buf3 will hold the base name */
                    /* buf4 will hold the distinguishing suffix */
                    buf2 = "";
                    buf3 = "";
                    buf4 = "";
                    if (glyph == C.GLYPH_CMAP_OFF) {
                        cmap = C.S_stone;
                        buf3 = "stone substrate";
                        skip_base = C.TRUE;
                    } else if (C.glyph_is_cmap_gehennom(glyph)) {
                        cmap = (glyph - C.GLYPH_CMAP_GEH_OFF) + C.S_vwall;
                        buf4 = "_gehennom";
                    } else if (C.glyph_is_cmap_knox(glyph)) {
                        cmap = (glyph - C.GLYPH_CMAP_KNOX_OFF) + C.S_vwall;
                        buf4 = "_knox";
                    } else if (C.glyph_is_cmap_main(glyph)) {
                        cmap = (glyph - C.GLYPH_CMAP_MAIN_OFF) + C.S_vwall;
                        buf4 = "_main";
                    } else if (C.glyph_is_cmap_mines(glyph)) {
                        cmap = (glyph - C.GLYPH_CMAP_MINES_OFF) + C.S_vwall;
                        buf4 = "_mines";
                    } else if (C.glyph_is_cmap_sokoban(glyph)) {
                        cmap = (glyph - C.GLYPH_CMAP_SOKO_OFF) + C.S_vwall;
                        buf4 = "_sokoban";
                    } else if (C.glyph_is_cmap_a(glyph)) {
                        cmap = (glyph - C.GLYPH_CMAP_A_OFF) + C.S_ndoor;
                    } else if (C.glyph_is_cmap_altar(glyph)) {
                        const altar_text = [
                            "unaligned", "chaotic", "neutral",
                            "lawful",    "other",
                        ];

                        j = (glyph - C.GLYPH_ALTAR_OFF);
                        cmap = C.S_altar;
                        if (j != C.altar_other) {
                            C.Snprintf("parse_id", 1025, buf[2], C.QBUFSZ, "%s_",
                                     altar_text[j]);
                            buf2 = buf[2];
                        } else {
                            buf3 = "altar other";
                            skip_base = C.TRUE;
                        }
                    } else if (C.glyph_is_cmap_b(glyph)) {
                        cmap = (glyph - C.GLYPH_CMAP_B_OFF) + C.S_grave;
                    } else if (C.glyph_is_cmap_zap(glyph)) {
                        const zap_texts = [
                            "missile", "fire",      "frost",      "sleep",
                            "death",   "lightning", "poison gas", "acid"
                        ];

                        j = (glyph - C.GLYPH_ZAP_OFF);
                        cmap = (j % 4) + C.S_vbeam;
                        C.Snprintf("parse_id", 1042, buf[2], C.QBUFSZ, "%s",
                                 C.loadsyms[cmap + cmap_offset].name + 2);
                        C.Snprintf("parse_id", 1044, buf[3], C.QBUFSZ, "%s zap %s",
                                 zap_texts[Math.trunc(j / 4)], fix_glyphname(buf[2]));
                        buf3 = buf[3];
                        buf2 = "";
                        skip_base = C.TRUE;
                    } else if (C.glyph_is_cmap_c(glyph)) {
                        cmap = (glyph - C.GLYPH_CMAP_C_OFF) + C.S_digbeam;
                    } else if (C.glyph_is_swallow(glyph)) {
                        const swallow_texts = [
                            "top left",      "top center",   "top right",
                            "middle left",   "middle right", "bottom left",
                            "bottom center", "bottom right",
                        ];

                        j = glyph - C.GLYPH_SWALLOW_OFF;
                        cmap = C.glyph_to_swallow(glyph);
                        mnum = Math.trunc(j / ((C.S_sw_br - C.S_sw_tl) + 1));
                        C.Strcpy(buf[3], "swallow ");
                        C.Strcat(buf[3], C.monsdump[mnum].nm);
                        C.Strcat(buf[3], " ");
                        C.Strcat(buf[3], swallow_texts[cmap]);
                        buf3 = buf[3];
                        skip_base = C.TRUE;
                    } else if (C.glyph_is_explosion(glyph)) {
                        const expl_type_texts = [
                            "dark",    "noxious", "muddy",  "wet",
                            "magical", "fiery",   "frosty",
                        ];
                        const expl_texts = [
                            "tl", "tc", "tr", "ml", "mc",
                            "mr", "bl", "bc", "br",
                        ];
                        let expl;

                        j = glyph - C.GLYPH_EXPLODE_OFF;
                        expl = Math.trunc(j / ((C.S_expl_br - C.S_expl_tl) + 1));
                        cmap = C.glyph_to_explosion(glyph) + C.S_expl_tl;
                        i = cmap - C.S_expl_tl;
                        C.Snprintf("parse_id", 1082, buf[2], C.QBUFSZ, "%s ",
                                 expl_type_texts[expl]);
                        buf2 = buf[2];
                        C.Snprintf("parse_id", 1085, buf[3], C.QBUFSZ, "%s%s", "expl_",
                                 expl_texts[i]);
                        buf3 = buf[3];
                        skip_base = C.TRUE;
                    }
                    if (!skip_base) {
                        if (cmap >= 0 && cmap < C.MAXPCHARS) {
                            buf3 = C.loadsyms[cmap + cmap_offset].name + 2;
                        }
                    }
                    C.Strcpy(buf[0], "G_");
                    C.Strcat(buf[0], buf2);
                    C.Strcat(buf[0], buf3);
                    C.Strcat(buf[0], buf4);
                } else if (C.glyph_is_invisible(glyph)) {
                    C.Strcpy(buf[0], "G_invisible");
                } else if (C.glyph_is_nothing(glyph)) {
                    C.Strcpy(buf[0], "G_nothing");
                } else if (C.glyph_is_unexplored(glyph)) {
                    C.Strcpy(buf[0], "G_unexplored");
                } else if (C.glyph_is_warning(glyph)) {
                    j = glyph - C.GLYPH_WARNING_OFF;
                    C.Snprintf("parse_id", 1106, buf[0], C.QBUFSZ, "G_%s%d", "warning", j);
                }
                if (C.memchr(buf[0], 0, C.QBUFSZ) == C.NULL)
                    C.panic("parse_id: buf[0] overflowed");
                if (!skip_this_one) {
                    fix_glyphname(buf[0]+2);
                    if (dump_ids) {
                        C.Fprintf(fp, "(%04d) %s\n", glyph, buf[0]);
                    } else if (filling_cache) {
                        add_glyph_to_cache(glyph, buf[0]);
                    } else if (id) {
                        if (!C.strcmpi(id, buf[0])) {
                            findwhat.findtype = C.find_glyph;
                            findwhat.val = glyph;
                            findwhat.loadsyms_offset = 0;
                            return 1;
                        }
                    }
                }
            }
        } /* not glyphid_cache */
    } else if (is_S) {
        /* cmap entries */
        for (i = 0; i < cmap_count; ++i) {
            if (!C.strcmpi(C.loadsyms[i + cmap_offset].name + 2, id + 2)) {
                findwhat.findtype = C.find_cmap;
                findwhat.val = i;
                findwhat.loadsyms_offset = i + cmap_offset;
                return 1;
            }
        }
        /* objclass entries */
        for (i = 0; i < oc_count; ++i) {
            if (!C.strcmpi(C.loadsyms[i + oc_offset].name + 2, id + 2)) {
                findwhat.findtype = C.find_oc;
                findwhat.val = i;
                findwhat.loadsyms_offset = i + oc_offset;
                return 1;
            }
        }
        /* permonst entries */
        for (i = 0; i <= pm_count; ++i) {
            if (!C.strcmpi(C.loadsyms[i + pm_offset].name + 2, id + 2)) {
                findwhat.findtype = C.find_pm;
                findwhat.val = i + 1; /* starts at 1 */
                findwhat.loadsyms_offset = i + pm_offset;
                return 1;
            }
        }
    }
    if (dump_ids || filling_cache)
        return 1;
    findwhat.findtype = C.find_nothing;
    findwhat.val = 0;
    findwhat.loadsyms_offset = 0;
    return 0;
}

/* extern glyph_map glyphmap[MAX_GLYPH]; */

export function clear_all_glyphmap_colors()
{
    let glyph;

    for (glyph = 0; glyph < C.MAX_GLYPH; ++glyph) {
        if (C.glyphmap[glyph].customcolor)
            C.glyphmap[glyph].customcolor = 0;
        C.glyphmap[glyph].color256idx = 0;
    }
}

export function reset_customcolors()
{
    clear_all_glyphmap_colors();
    apply_customizations(C.gc.currentgraphics, C.do_custom_colors);
}

/* not used yet */







































































































































/* glyphs.c */




/* U+NNNN format */

/* staticfn void purge_custom_entries(enum graphics_sets which_set); */

/* 0 not used yet */

/* if the color 0 is an actual color, as opposed to just "not set"
       we set a marker bit outside the 24-bit range to indicate a
       valid color value 0. That allows valid color 0, but allows a
       simple checking for 0 to detect "not set". The window port that
       implements the color switch, needs to either check that bit
       or appropriately mask colors with 0xFFFFFF. */

/* SOME TEST STUFF */
