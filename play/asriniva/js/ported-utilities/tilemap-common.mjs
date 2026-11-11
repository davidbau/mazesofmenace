/* NetHack 5.0	tilemap.c	$NHDT-Date: 1737720923 2025/01/24 04:15:23 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.87 $ */

/*      Copyright (c) 2016 by Michael Allison                     */

/* NetHack may be freely redistributed.  See license for details. */

/*
 *      This source file is compiled twice:
 *      once without TILETEXT defined to make tilemap.{o,obj},
 *      then again with it defined to produce tiletxt.{o,obj}.
 */

/* #include "onames.h" */

/* #include "pm.h" */

/* with heap monitoring enabled, free(ptr) is a macro which expands to
   nhfree(ptr,__FILE__,__LINE__); since tilemap doesn't link with
   src/alloc.o it doesn't have access to nhfree(); use actual free */

/*
 * Defining OBTAIN_TILEMAP to get a listing of the tile-mappings
 * for debugging purposes requires that your link to produce
 * the tilemap utility must also include:
 *   objects.o, monst.o drawing.o
 */

/* List of tiles encountered and their usage */

/* Some special tiles used for init of some things */

/* will get set to correct tile later */

/* will get set to correct tile later */

/* will get set to correct tile later */

/* will get set to correct tile later; X11 uses it */

/* prototypes for functions in this file */

/* note that the ifdefs here should be the opposite sense from monst.c/
 * objects.c/rm.h
 */

/* not supported */

/* commented out in monst.c at present */

/* not supported yet */

/* commented out in monst.c at present */

/* commented out in monst.c at present */

/* objects commented out in objects.c at present */

/* allow slime mold to look like slice of pizza, since we
 * don't know what a slime mold should look like when renamed anyway
 */

/*
 * file_entry is the position of the tile within the monsters/objects/other set
 */
import { C } from './tilemap-scope.mjs';
export * from './tilemap-common-data.mjs';
export function tilename(set, file_entry, gend)
{
    set = C.int(set); file_entry = C.int(file_entry); gend = C.int(gend);
    let i, k, cmap, condnum, tilenum;
    const buf = C.tilenameBuffer;

    C.def_char_to_objclass(']'.charCodeAt(0));

    tilenum = 0;

    C.storeChar(buf, '\0'.charCodeAt(0));
    if (set == C.MON_GLYPH) {
        for (i = 0; i < C.NUMMONS; i++) {
            if (tilenum == file_entry) {
                if (C.mons[i].pmnames[C.MALE])
                    C.Snprintf(buf, BigInt(C.BUFSZ), "%s {%s}",
                             C.mons[i].pmnames[C.NEUTRAL], C.mons[i].pmnames[C.MALE], 0);
                else
                    C.Snprintf(buf, BigInt(C.BUFSZ), "%s", C.mons[i].pmnames[C.NEUTRAL], 1);
                return buf;
            }
            tilenum++;
            if (tilenum == file_entry) {
                if (C.mons[i].pmnames[C.FEMALE])
                    C.Snprintf(buf, BigInt(C.BUFSZ), "%s {%s}",
                             C.mons[i].pmnames[C.NEUTRAL],
                             C.mons[i].pmnames[C.FEMALE], 2);
                else
                    C.Snprintf(buf, BigInt(C.BUFSZ), "%s", C.mons[i].pmnames[C.NEUTRAL], 3);
                return buf;
            }
            for (condnum = 0; C.conditionals[condnum].sequence != -1;
                 ++condnum) {
                if (C.conditionals[condnum].sequence == C.MON_GLYPH
                    && C.conditionals[condnum].predecessor == i) {
                    for (k = 0; k < 2; k++) { /* male and female */
                        tilenum++;
                        if (tilenum == file_entry)
                            return C.conditionals[condnum].name;
                    }
                }
            }
            tilenum++;
        }
        if (tilenum == file_entry)
            return "invisible monster";
    } /* MON_GLYPH */

    if (set == C.OBJ_GLYPH) {
        tilenum = 0; /* set-relative number */
        for (i = 0; i < C.NUM_OBJECTS; i++) {
            /* prefer to give the description - that's all the tile's
             * appearance should reveal */
            if (tilenum == file_entry) {
                if (!C.obj_descr[i].oc_descr)
                    return C.obj_descr[i].oc_name;
                if (!C.obj_descr[i].oc_name)
                    return C.obj_descr[i].oc_descr;

                C.Sprintf(buf, "%s / %s", C.obj_descr[i].oc_descr,
                        C.obj_descr[i].oc_name);
                return buf;
            }
            for (condnum = 0; C.conditionals[condnum].sequence != -1;
                 ++condnum) {
                if (C.conditionals[condnum].sequence == C.OBJ_GLYPH
                    && C.conditionals[condnum].predecessor == i) {
                    tilenum++;
                    if (tilenum == file_entry)
                        return C.conditionals[condnum].name;
                }
            }
            tilenum++;
        }
    } /* OBJ_GLYPH */

    if (set == C.OTH_GLYPH) {
        tilenum = 0; /* set-relative number */

        /* S_stone */
        for (cmap = C.S_stone; cmap <= C.S_stone; cmap++) {
            if (tilenum == file_entry) {
                if (C.loadChar(C.defsyms[cmap].explanation)) {
                    return C.defsyms[cmap].explanation;
                } else if (C.altlabels[cmap].tilelabel
                           && C.loadChar(C.altlabels[cmap].tilelabel)) {
                    C.Sprintf(buf, "%s", C.altlabels[cmap].tilelabel);
                    return buf;
                } else {
                    C.Sprintf(buf, "cmap %d %d", cmap, tilenum);
                    return buf;
                }
            }
            for (condnum = 0; C.conditionals[condnum].sequence != -1;
                 condnum++) {
                if (C.conditionals[condnum].sequence == C.OTH_GLYPH
                    && C.conditionals[condnum].predecessor == cmap) {
                    tilenum++;
                }
            }
            tilenum++;
        }

        /* walls - level specific */
        for (k = C.main_walls; k < C.mines_walls; k++) {
            for (cmap = C.S_vwall; cmap <= C.S_trwall; cmap++) {
                i = cmap - C.S_vwall;
                if (tilenum == file_entry) {
                    C.Sprintf(buf, "%s %s", C.wall_texts[k], C.walldesc[i]);
                    return buf;
                }
                for (condnum = 0; C.conditionals[condnum].sequence != -1;
                     condnum++) {
                    if (C.conditionals[condnum].sequence == C.OTH_GLYPH
                        && C.conditionals[condnum].predecessor == cmap) {
                        tilenum++;
                    }
                }
                tilenum++;
            }
        }

        /* cmap A */
        for (cmap = C.S_ndoor; cmap <= C.S_brdnladder; cmap++) {
            i = cmap - C.S_ndoor;  C.nhUse(i);
            if (tilenum == file_entry) {
                if (C.loadChar(C.defsyms[cmap].explanation)) {
                    return C.defsyms[cmap].explanation;
                } else if (C.altlabels[cmap].tilelabel
                           && C.loadChar(C.altlabels[cmap].tilelabel)) {
                    C.Sprintf(buf, "%s", C.altlabels[cmap].tilelabel);
                    return buf;
                } else {
                    C.Sprintf(buf, "cmap %d %d", cmap, tilenum);
                    return buf;
                }
            }
            for (condnum = 0; C.conditionals[condnum].sequence != -1;
                 ++condnum) {
                if (C.conditionals[condnum].sequence == C.OTH_GLYPH
                    && C.conditionals[condnum].predecessor == cmap) {
                    tilenum++;
                    if (tilenum == file_entry)
                        return C.conditionals[condnum].name;
                }
            }
            tilenum++;
        }

        /* Altars */
        cmap = C.S_altar;
        for (k = C.altar_unaligned; k <= C.altar_other; k++) {
            /* Since defsyms only has one altar symbol,
               it isn't much help in identifying details
               these. Roll our own name. */
            if (tilenum == file_entry) {
                C.Sprintf(buf, "%s altar", C.altar_text[k]);
                return buf;
            }
            tilenum++;
        }
        for (condnum = 0; C.conditionals[condnum].sequence != -1; ++condnum) {
            if (C.conditionals[condnum].sequence == C.OTH_GLYPH
                && C.conditionals[condnum].predecessor == cmap) {
                tilenum++;
                if (tilenum == file_entry)
                    return C.conditionals[condnum].name;
            }
        }

        /* cmap B */
        for (cmap = C.S_grave; cmap < C.S_arrow_trap + C.MAXTCHARS; cmap++) {
            i = cmap - C.S_grave;  C.nhUse(i);
            if (tilenum == file_entry) {
                if (C.loadChar(C.defsyms[cmap].explanation)) {
                    return C.defsyms[cmap].explanation;
                } else if (C.altlabels[cmap].tilelabel
                           && C.loadChar(C.altlabels[cmap].tilelabel)) {
                    C.Sprintf(buf, "%s", C.altlabels[cmap].tilelabel);
                    return buf;
                } else {
                    C.Sprintf(buf, "cmap %d %d", cmap, tilenum);
                    return buf;
                }
            }

            for (condnum = 0; C.conditionals[condnum].sequence != -1;
                 ++condnum) {
                if (C.conditionals[condnum].sequence == C.OTH_GLYPH
                    && C.conditionals[condnum].predecessor == cmap) {
                    tilenum++;
                    if (tilenum == file_entry)
                        return C.conditionals[condnum].name;
                }
            }
            tilenum++;
        }

/* zaps */
        i = file_entry - tilenum;
        if (i < (C.NUM_ZAP << 2)) {
            C.Sprintf(buf, "%s zap %d %d", C.zap_texts[C.div(i, 4)], (C.div(i, 4)) + 1, i % 4);
            return buf;
        }
        tilenum += (C.NUM_ZAP << 2);

        /* cmap C */
        for (cmap = C.S_digbeam; cmap <= C.S_goodpos; cmap++) {
            i = cmap - C.S_digbeam;  C.nhUse(i);
            if (tilenum == file_entry) {
                if (C.loadChar(C.defsyms[cmap].explanation)) {
                    return C.defsyms[cmap].explanation;
                } else if (C.altlabels[cmap].tilelabel
                           && C.loadChar(C.altlabels[cmap].tilelabel)) {
                    C.Sprintf(buf, "%s", C.altlabels[cmap].tilelabel);
                    return buf;
                } else {
                    C.Sprintf(buf, "cmap %d %d", cmap, tilenum);
                    return buf;
                }
            }
            for (condnum = 0; C.conditionals[condnum].sequence != -1;
                 ++condnum) {
                if (C.conditionals[condnum].sequence == C.OTH_GLYPH
                    && C.conditionals[condnum].predecessor == cmap) {
                    tilenum++;
                    if (tilenum == file_entry)
                        return C.conditionals[condnum].name;
                }
            }
            tilenum++;
        }

        /* swallow */
        for (cmap = C.S_sw_tl; cmap <= C.S_sw_br; cmap++) {
            i = cmap - C.S_sw_tl;
            if (tilenum + i == file_entry) {
                if (C.loadChar(C.defsyms[cmap].explanation)) {
                    return C.defsyms[cmap].explanation;
                } else if (C.altlabels[cmap].tilelabel
                           && C.loadChar(C.altlabels[cmap].tilelabel)) {
                    C.Sprintf(buf, "%s", C.altlabels[cmap].tilelabel);
                    return buf;
                } else {
                    C.Sprintf(buf, "cmap swallow %d", cmap);
                    return buf;
                }
            }
        }
        tilenum += ((C.S_sw_br - C.S_sw_tl) + 1);

        /* explosions */
        for (k = C.expl_dark; k <= C.expl_frosty; k++) {
            for (cmap = C.S_expl_tl; cmap <= C.S_expl_br; cmap++) {
                i = cmap - C.S_expl_tl;  C.nhUse(i);
                if (tilenum == file_entry) {
                    /* substitute "explosion " in the tilelabel
                       with "explosion dark " etc */
                    C.Sprintf(buf, "explosion %s %s", C.expl_texts[k],
                            C.ptrAdd(C.altlabels[cmap].tilelabel, 10));
                    return buf;
                }
                for (condnum = 0; C.conditionals[condnum].sequence != -1;
                     ++condnum) {
                    if (C.conditionals[condnum].sequence == C.OTH_GLYPH
                        && C.conditionals[condnum].predecessor == cmap) {
                        tilenum++;
                        if (tilenum == file_entry)
                            return C.conditionals[condnum].name;
                    }
                }
                tilenum++;
            }
        }

        /* warnings */
        i = file_entry - tilenum;
        if (i < C.WARNCOUNT) {
            C.Sprintf(buf, "warning %d", i);
            return buf;
        }
        tilenum += C.WARNCOUNT;

        i = file_entry - tilenum;
        if (i < 1) {
            C.Sprintf(buf, "unexplored");
            return buf;
        }
        tilenum += 1;

        i = file_entry - tilenum;
        if (i < 1) {
            C.Sprintf(buf, "nothing");
            return buf;
        }
        tilenum++;

        /* other level walls */
        /* this batch starts at mines(1), not main(0) */
        for (k = C.mines_walls; k <= C.sokoban_walls; k++) {
            for (cmap = C.S_vwall; cmap <= C.S_trwall; cmap++) {
                i = cmap - C.S_vwall;
                if (tilenum == file_entry) {
                    C.Sprintf(buf, "%s %s", C.wall_texts[k], C.walldesc[i]);
                    return buf;
                }
                for (condnum = 0; C.conditionals[condnum].sequence != -1;
                     condnum++) {
                    if (C.conditionals[condnum].sequence == C.OTH_GLYPH
                        && C.conditionals[condnum].predecessor == cmap) {
                        tilenum++;
                    }
                }
                tilenum++;
            }
        }
    } /* OTH_GLYPH */
    C.Sprintf(buf, "unknown %d %d", set, file_entry);
    return buf;
}

export function acceptable_tilename(glyph_set, idx, encountered, expected)
{
    glyph_set = C.int(glyph_set); idx = C.int(idx); encountered = C.charPointer(encountered); expected = C.charPointer(expected);
    let i;
    let a, b;
    const buf = C.bytesLocal(C.BUFSZ);
    let pastprefix = encountered;
    const aliases = [
        { original: "wall", alias: "vertical wall" },
        { original: "wall", alias: "horizontal wall" },
        { original: "wall", alias: "top left corner wall" },
        { original: "wall", alias: "top right corner wall" },
        { original: "wall", alias: "bottom left corner wall" },
        { original: "wall", alias: "bottom right corner wall" },
        { original: "open door", alias: "vertical open door" },
        { original: "open door", alias: "horizontal open door" },
        { original: "open door", alias: "no door" },
        { original: "altar", alias: "chaotic altar" },
        { original: "altar", alias: "neutral altar" },
        { original: "altar", alias: "lawful altar" },
        { original: "opulent throne", alias: "throne" },
        { original: "water", alias: "pool" },
        { original: "lowered drawbridge", alias: "vertical open drawbridge" },
        { original: "lowered drawbridge", alias: "horizontal open drawbridge" },
        { original: "raised drawbridge", alias: "vertical closed drawbridge" },
        { original: "raised drawbridge", alias: "horizontal closed drawbridge" },
        { original: "altar", alias: "unaligned altar" },
        { original: "altar", alias: "other altar" },

    ];

    if (glyph_set == C.OTH_GLYPH) {
        if (idx >= 0 && idx < (C.altlabels.length - 1)) {
            if (!C.strcmp(C.altlabels[idx].tilelabel, encountered))
                return C.TRUE;
        }
        a = C.strlen(encountered);
        for (i = 0; i < aliases.length; i++) {
            if (!C.strcmp(pastprefix, aliases[i].alias))
                return C.TRUE;
            pastprefix = encountered;
            b = C.strlen(aliases[i].alias);
            if (a > b) {
                pastprefix = C.ptrAdd(encountered, a - b);
                if (!C.strcmp(pastprefix, aliases[i].alias))
                    return C.TRUE;
            }
            if (!C.strcmp(encountered, aliases[i].alias)
                && !C.strcmp(expected, aliases[i].original)) {
                return C.TRUE;
            }
        }
        C.Snprintf(buf, BigInt(C.BUFSZ), "cmap tile %d", idx, 4);
        if (!C.strcmp(expected, buf))
            return C.TRUE;
        return C.FALSE;
    }
    return C.TRUE;
}

export function precheck(offset, glyphtype)
{
    offset = C.int(offset);
    if (C.tilemap[offset].tilenum != -1)
        C.Fprintf(C.stderr, "unexpected re-write of tile mapping [%s]\n",
                glyphtype);
}

export function add_tileref(n, glyphref, src, entrynum, nam, prefix)
{
    n = C.int(n); glyphref = C.int(glyphref); src = C.int(src); entrynum = C.int(entrynum);
    const temp = C.tilesUsedLocal(true);
    const ellipsis = "...";
    const buf = C.bytesLocal(C.BUFSZ);

    if (!C.tilelist[n]) {
        if ((C.tilelist[n] = C.malloc(C.tilesUsedSize)) != 0) {
            C.tilelist[n].tilenum = n;
            C.tilelist[n].src = src;
            C.tilelist[n].file_entry = entrynum;
            /* leave room for trailing "...nnnn" */
            C.Snprintf(C.tilelist[n].tilenam, C.tilenamSize - 7n,
                     "%s%s", prefix, nam, 5);
            C.storeChar(C.tilelist[n].references, '\0'.charCodeAt(0));
        } else {
            C.Fprintf(C.stderr, "tilemap malloc failure %zu bytes\n",
                    C.tilesUsedSize);
            C.exit(C.EXIT_FAILURE);
        }
    }
    C.Snprintf(temp.references,
             C.referencesSize - 7n, /* room for "...nnnn" */
             "%s%s%d", C.tilelist[n].references,
             (C.loadChar(C.tilelist[n].references) != '\0'.charCodeAt(0)) ? ", " : "", glyphref, 6);
    C.Snprintf(buf, BigInt(C.BUFSZ), "...%4d", glyphref, 7);
    C.Snprintf(C.tilelist[n].references, C.referencesSize, "%s%s",
             temp.references,
             (C.strlen(temp.references) >= (C.referencesSize - 7n) - 1n)
                 ? buf
                 : "", 8);
    C.nhUse(ellipsis);
}

export function dump_tilerefs(fp)
{
    let i;

    C.Fprintf(fp, "\n");
    for (i = 0; i < C.tilelist.length; i++) {
        if (C.tilelist[i]) {
            C.Fprintf(fp, "tile[%04d] %s[%04d] %-25s: %s\n", i,
                    C.tilesrc_texts[C.tilelist[i].src],
                    C.tilelist[i].file_entry,
                    C.tilelist[i].tilenam,
                    C.tilelist[i].references);
        }
    }
}

export function free_tilerefs()
{
    let i;

    for (i = 0; i < C.tilelist.length; i++) {
        if (C.tilelist[i])
            C.free(C.tilelist[i]), C.tilelist[i] = 0;
    }
}

/*tilemap.c*/
