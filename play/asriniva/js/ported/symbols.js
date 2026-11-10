import {C} from './c-runtime.js';
/* NetHack 5.0	symbols.c	$NHDT-Date: 1736530208 2025/01/10 09:30:08 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.123 $ */
/* Copyright (c) NetHack Development Team 2020.                   */
/* NetHack may be freely redistributed.  See license for details. */


/* drawing.c */


/* TERMLIB || CURSES */



/*
 * Explanations of the functions found below:
 *
 * init_symbols()
 *                     Sets the current display symbols, the
 *                     loadable symbols to the default NetHack
 *                     symbols, including the rogue_syms rogue level
 *                     symbols. This would typically be done
 *                     immediately after execution begins. Any
 *                     previously loaded external symbol sets are
 *                     discarded.
 *
 * switch_symbols(arg)
 *                     Called to swap in new current display symbols
 *                     (showsyms) from either the default symbols,
 *                     or from the loaded symbols.
 *
 *                     If (arg == 0) then showsyms are taken from
 *                     defsyms, def_oc_syms, and def_monsyms.
 *
 *                     If (arg != 0), which is the normal expected
 *                     usage, then showsyms are taken from the
 *                     adjustable display symbols found in gp.primary_syms.
 *                     gp.primary_syms may have been loaded from an external
 *                     symbol file by config file options or interactively
 *                     in the Options menu.
 *
 * assign_graphics(arg)
 *
 *                     This is used in the game core to toggle in and
 *                     out of other {rogue} level display modes.
 *
 *                     If arg is ROGUESET, this places the rogue level
 *                     symbols from gr.rogue_syms into gs.showsyms.
 *
 *                     If arg is PRIMARYSET, this places the symbols
 *                     from gp.primary_syms into gs.showsyms.
 *
 * update_primary_symset()
 *                     Update a member of the primary(primary_*) symbol set.
 *
 * update_rogue_symset()
 *                     Update a member of the rogue (rogue_*) symbol set.
 *
 * update_ov_primary_symset()
 *                     Update a member of the overrides for primary symbol set.
 *
 * update_ov_rogue_symset()
 *                     Update a member of the overrides for rogue symbol set.
 *
 */

export function init_symbols()
{
    init_ov_primary_symbols();
    init_ov_rogue_symbols();
    init_primary_symbols();
    init_showsyms();
    init_rogue_symbols();
}

export function init_showsyms()
{
    let i;

    for (i = 0; i < C.MAXPCHARS; i++)
        C.gs.showsyms[i + C.SYM_OFF_P] = C.defsyms[i].sym;
    for (i = 0; i < C.MAXOCLASSES; i++)
        C.gs.showsyms[i + C.SYM_OFF_O] = C.def_oc_syms[i].sym;
    for (i = 0; i < C.MAXMCLASSES; i++)
        C.gs.showsyms[i + C.SYM_OFF_M] = C.def_monsyms[i].sym;
    for (i = 0; i < C.WARNCOUNT; i++)
        C.gs.showsyms[i + C.SYM_OFF_W] = C.def_warnsyms[i].sym;
    for (i = 0; i < C.MAXOTHER; i++)
        C.gs.showsyms[i + C.SYM_OFF_X] = get_othersym(i, C.PRIMARYSET);
}

/* initialize defaults for the overrides to the rogue symset */
export function init_ov_rogue_symbols()
{
    let i;

    for (i = 0; i < C.SYM_MAX; i++)
        C.go.ov_rogue_syms[i] = 0;
}
/* initialize defaults for the overrides to the primary symset */
export function init_ov_primary_symbols()
{
    let i;

    for (i = 0; i < C.SYM_MAX; i++)
        C.go.ov_primary_syms[i] = 0;
}

export function get_othersym(idx, which_set)
{
    let sym = 0;
    let oidx = idx + C.SYM_OFF_X;

    if (which_set == C.ROGUESET)
        sym = C.go.ov_rogue_syms[oidx] ? C.go.ov_rogue_syms[oidx]
                                    : C.gr.rogue_syms[oidx];
    else
        sym = C.go.ov_primary_syms[oidx] ? C.go.ov_primary_syms[oidx]
                                      : C.gp.primary_syms[oidx];
    if (!sym) {
        switch(idx) {
            case C.SYM_NOTHING:
            case C.SYM_UNEXPLORED:
                sym = C.DEF_NOTHING;
                break;
            case C.SYM_BOULDER:
                sym = C.def_oc_syms[C.ROCK_CLASS].sym;
                break;
            case C.SYM_INVISIBLE:
                sym = C.DEF_INVISIBLE;
                break;
        }
    }
    return C.uchar(sym);
}

/* initialize defaults for the primary symset */
export function init_primary_symbols()
{
    let i;

    for (i = 0; i < C.MAXPCHARS; i++)
        C.gp.primary_syms[i + C.SYM_OFF_P] = C.defsyms[i].sym;
    for (i = 0; i < C.MAXOCLASSES; i++)
        C.gp.primary_syms[i + C.SYM_OFF_O] = C.def_oc_syms[i].sym;
    for (i = 0; i < C.MAXMCLASSES; i++)
        C.gp.primary_syms[i + C.SYM_OFF_M] = C.def_monsyms[i].sym;
    for (i = 0; i < C.WARNCOUNT; i++)
        C.gp.primary_syms[i + C.SYM_OFF_W] = C.def_warnsyms[i].sym;
    for (i = 0; i < C.MAXOTHER; i++)
        C.gp.primary_syms[i + C.SYM_OFF_X] = get_othersym(i, C.PRIMARYSET);

    clear_symsetentry(C.PRIMARYSET, 0);
}

/* initialize defaults for the rogue symset */
export function init_rogue_symbols()
{
    let i;

    /* These are defaults that can get overwritten
       later by the roguesymbols option */

    for (i = 0; i < C.MAXPCHARS; i++)
        C.gr.rogue_syms[i + C.SYM_OFF_P] = C.defsyms[i].sym;
    C.gr.rogue_syms[C.S_vodoor] = C.gr.rogue_syms[C.S_hodoor]
        = C.gr.rogue_syms[C.S_ndoor] = ('+').charCodeAt(0);
    C.gr.rogue_syms[C.S_upstair] = C.gr.rogue_syms[C.S_dnstair] = ('%').charCodeAt(0);

    for (i = 0; i < C.MAXOCLASSES; i++)
        C.gr.rogue_syms[i + C.SYM_OFF_O] = C.def_r_oc_syms[i];
    for (i = 0; i < C.MAXMCLASSES; i++)
        C.gr.rogue_syms[i + C.SYM_OFF_M] = C.def_monsyms[i].sym;
    for (i = 0; i < C.WARNCOUNT; i++)
        C.gr.rogue_syms[i + C.SYM_OFF_W] = C.def_warnsyms[i].sym;
    for (i = 0; i < C.MAXOTHER; i++)
        C.gr.rogue_syms[i + C.SYM_OFF_X] = get_othersym(i, C.ROGUESET);

    clear_symsetentry(C.ROGUESET, 0);
    /* default on Rogue level is no color
     * but some symbol sets can override that
     */
    C.gs.symset[C.ROGUESET].nocolor = 1;
}

export function assign_graphics(whichset)
{
    let i;

    switch (whichset) {
    case C.ROGUESET:
        /* Adjust graphics display characters on Rogue levels */

        for (i = 0; i < C.SYM_MAX; i++)
            C.gs.showsyms[i] = C.go.ov_rogue_syms[i] ? C.go.ov_rogue_syms[i]
                                           : C.gr.rogue_syms[i];

        C.gc.currentgraphics = C.ROGUESET;
        break;

    case C.PRIMARYSET:
    default:
        for (i = 0; i < C.SYM_MAX; i++)
            C.gs.showsyms[i] = C.go.ov_primary_syms[i] ? C.go.ov_primary_syms[i]
                                             : C.gp.primary_syms[i];

        C.gc.currentgraphics = C.PRIMARYSET;
        break;
    }
    C.reset_glyphmap(C.gm_symchange);
}

export function switch_symbols(nondefault)
{
    let i;

    if (nondefault) {
        for (i = 0; i < C.SYM_MAX; i++)
            C.gs.showsyms[i] = C.go.ov_primary_syms[i] ? C.go.ov_primary_syms[i]
                                                 : C.gp.primary_syms[i];
        /* curses doesn't assign any routine to dec..._callback but
           probably does the expected initialization under the hood
           for terminals capable of rendering DECgraphics */
        if (C.SYMHANDLING(C.H_DEC) && C.decgraphics_mode_callback)
            C.invokeCallback(C.decgraphics_mode_callback);
        if (C.SYMHANDLING(C.H_UTF8) && C.utf8graphics_mode_callback)
            C.invokeCallback(C.utf8graphics_mode_callback);
    } else {
        init_primary_symbols();
        init_showsyms();
    }
}

export function update_ov_primary_symset(symp, val)
{
    C.go.ov_primary_syms[symp.idx] = val;
}

export function update_ov_rogue_symset(symp, val)
{
    C.go.ov_rogue_syms[symp.idx] = val;
}

export function update_primary_symset(symp, val)
{
    C.gp.primary_syms[symp.idx] = val;
}

export function update_rogue_symset(symp, val)
{
    C.gr.rogue_syms[symp.idx] = val;
}

export function clear_symsetentry(which_set, name_too)
{
    let other_set = (which_set == C.PRIMARYSET) ? C.ROGUESET : C.PRIMARYSET;
    let old_handling = C.gs.symset[which_set].handling;

    if (C.gs.symset[which_set].desc)
        C.free(C.gs.symset[which_set].desc);
    C.gs.symset[which_set].desc = 0;

    C.gs.symset[which_set].handling = C.H_UNK;
    C.gs.symset[which_set].nocolor = 0;
    /* initialize restriction bits */
    C.gs.symset[which_set].primary = 0;
    C.gs.symset[which_set].rogue = 0;

    if (name_too) {
        if (C.gs.symset[which_set].name)
            C.free(C.gs.symset[which_set].name);
        C.gs.symset[which_set].name = 0;
    }
    /* if 'which_set' was using UTF8, it isn't anymore; if the other set
       isn't using UTF8, discard the data for that */
    if (old_handling == C.H_UTF8 && C.gs.symset[other_set].handling != C.H_UTF8)
        C.free_all_glyphmap_u();
    C.purge_custom_entries(which_set);
    C.clear_all_glyphmap_colors();
}

/* called from windmain.c */
export function symset_is_compatible(handling, wincap2)
{
    if (handling == C.H_UTF8 && ((wincap2 & C.WC2_utf8_bits) != C.WC2_utf8_bits))
        return 0;
    return 1;
}

/*
 * If you are adding code somewhere to be able to recognize
 * particular types of symset "handling", define a
 * H_XXX macro in include/sym.h and add the name
 * to this array at the matching offset.
 * Externally referenced from files.c, options.c, utf8map.c.
 */
/* H_UNK  */
/* H_IBM  */
/* H_DEC  */
/* H_CURS */
/* H_MAC  -- pre-OSX MACgraphics */
/* H_UTF8 */

/*
 * Accepted keywords for symset restrictions.
 * These can be virtually anything that you want to
 * be able to test in the code someplace.
 * Be sure to:
 *    - add a corresponding Bitfield to the symsetentry struct in sym.h
 *    - initialize the field to zero in parse_sym_line in the SYM_CONTROL
 *      case 0 section of the idx switch. The location is prefaced with
 *      with a comment stating "initialize restriction bits".
 *    - set the value appropriately based on the index of your keyword
 *      under the case 5 sections of the same SYM_CONTROL idx switches.
 *    - add the field to clear_symsetentry()
 */


/* fence post */

export function proc_symset_line(buf)
{
    return !(parse_sym_line(buf, C.gs.symset_which_set));
}

/* returns 0 on error */
export function parse_sym_line(buf, which_set)
{
    let val, i;
    let symp = 0;
    let bufp, commentp, altp;
    const glyph = C.intLocal(C.NO_GLYPH);
    let enhanced_unavailable = 0, is_glyph = 0;

    if (C.strlen(buf) >= C.BUFSZ)
        C.storeChar(buf + (C.BUFSZ - 1), ('\0').charCodeAt(0));
    /* convert each instance of whitespace (tabs, consecutive spaces)
       into a single space; leading and trailing spaces are stripped */
    C.mungspaces(buf);

    /* remove trailing comment, if any (this isn't strictly needed for
       individual symbols, and it won't matter if "X#comment" without
       separating space slips through; for handling or set description,
       symbol set creator is responsible for preceding '#' with a space
       and that comment itself doesn't contain " #") */
    if ((commentp = C.strrchr(buf, ('#').charCodeAt(0))) != 0 && C.loadChar(commentp + (-1)) == (' ').charCodeAt(0))
        C.storeChar(commentp + (-1), ('\0').charCodeAt(0));

    /* find the '=' or ':' */
    bufp = C.strchr(buf, ('=').charCodeAt(0));
    altp = C.strchr(buf, (':').charCodeAt(0));

    if (!bufp || (altp && altp < bufp))
        bufp = altp;

    if (!bufp) {
        if (C.strncmpi(buf, "finish", 6) == 0) {
            /* end current graphics set */
            if (C.gc.chosen_symset_start)
                C.gc.chosen_symset_end = 1;
            C.gc.chosen_symset_start = 0;
            return 1;
        }
        C.config_error_add("No \"finish\"");
        return 0;
    }
    /* skip '=' and space which follows, if any */
    ++bufp;
    if (C.loadChar(bufp) == (' ').charCodeAt(0))
        ++bufp;

    symp = match_sym(buf);
    if (!symp && C.loadChar(buf + (0)) == ('G').charCodeAt(0) && C.loadChar(buf + (1)) == ('_').charCodeAt(0)) {
        if (C.gc.chosen_symset_start) {
            is_glyph = C.match_glyph(buf);
        } else {
            is_glyph = 1; /* report error only once */
        }
        enhanced_unavailable = 0;
    }
    if (!symp && !is_glyph && !enhanced_unavailable) {
        C.config_error_add("Unknown sym keyword");
        return 0;
    }
    if (symp) {
        if (!C.gs.symset[which_set].name) {
            /* A null symset name indicates that we're just
               building a pick-list of possible symset
               values from the file, so only do that */
            if (symp.range == C.SYM_CONTROL) {
                let tmpsp, lastsp;

                for (lastsp = C.gs.symset_list; lastsp; lastsp = lastsp.next)
                    if (!lastsp.next)
                        break;
                switch (symp.idx) {
                case 0:
                    tmpsp = C.symset(C.alloc(C.symsetSize));
                    tmpsp.next = 0;
                    if (!lastsp)
                        C.gs.symset_list = tmpsp;
                    else
                        lastsp.next = tmpsp;
                    tmpsp.idx = C.gs.symset_count++;
                    tmpsp.name = C.dupstr(bufp);
                    tmpsp.desc = 0;
                    tmpsp.handling = C.H_UNK;
                    /* initialize restriction bits */
                    tmpsp.nocolor = 0;
                    tmpsp.primary = 0;
                    tmpsp.rogue = 0;
                    break;
                case 2:
                    /* handler type identified */
                    tmpsp = lastsp; /* most recent symset */
                    for (i = 0; C.known_handling[i]; ++i)
                        if (!C.strcmpi(C.known_handling[i], bufp)) {
                            if (tmpsp)
                                tmpsp.handling = i;
                            break; /* for loop */
                        }
                    break;
                case 3:
                    /* description:something */
                    tmpsp = lastsp; /* most recent symset */
                    if (tmpsp && !tmpsp.desc)
                        tmpsp.desc = C.dupstr(bufp);
                    break;
                case 5:
                    /* restrictions: xxxx*/
                    tmpsp = lastsp; /* most recent symset */
                    for (i = 0; C.known_restrictions[i]; ++i) {
                        if (!C.strcmpi(C.known_restrictions[i], bufp)) {
                            if (tmpsp) {
                                switch (i) {
                                case 0:
                                    tmpsp.primary = 1;
                                    break;
                                case 1:
                                    tmpsp.rogue = 1;
                                    break;
                                }
                            }
                            break; /* while loop */
                        }
                    }
                    break;
                }
            }
            return 1;
        }
        if (symp.range && symp.range == C.SYM_CONTROL) {
            switch (symp.idx) {
            case 0:
                /* start of symset */
                if (!C.strcmpi(bufp, C.gs.symset[which_set].name)) {
                    /* matches desired one */
                    C.gc.chosen_symset_start = 1;
                    /* these init_*() functions clear symset fields too */
                    if (which_set == C.ROGUESET)
                        init_rogue_symbols();
                    else if (which_set == C.PRIMARYSET)
                        init_primary_symbols();
                }
                break;
            case 1:
                /* finish symset */
                if (C.gc.chosen_symset_start)
                    C.gc.chosen_symset_end = 1;
                C.gc.chosen_symset_start = 0;
                break;
            case 2:
                /* handler type identified */
                if (C.gc.chosen_symset_start)
                    set_symhandling(bufp, which_set);
                break;
            /* case 3: (description) is ignored here */
            case 4: /* color:off */
                if (C.gc.chosen_symset_start) {
                    if (bufp) {
                        if (!C.strcmpi(bufp, "true") || !C.strcmpi(bufp, "yes")
                            || !C.strcmpi(bufp, "on"))
                            C.gs.symset[which_set].nocolor = 0;
                        else if (!C.strcmpi(bufp, "false")
                                 || !C.strcmpi(bufp, "no")
                                 || !C.strcmpi(bufp, "off"))
                            C.gs.symset[which_set].nocolor = 1;
                    }
                }
                break;
            case 5: /* restrictions: xxxx*/
                if (C.gc.chosen_symset_start) {
                    let n = 0;

                    while (C.known_restrictions[n]) {
                        if (!C.strcmpi(C.known_restrictions[n], bufp)) {
                            switch (n) {
                            case 0:
                                C.gs.symset[which_set].primary = 1;
                                break;
                            case 1:
                                C.gs.symset[which_set].rogue = 1;
                                break;
                            }
                            break; /* while loop */
                        }
                        n++;
                    }
                }
                break;
            }
        } else {
            /* Not SYM_CONTROL */
            if (C.gs.symset[which_set].handling != C.H_UTF8) {
                if (C.gc.chosen_symset_start) {
                    val = C.sym_val(bufp);
                    if (which_set == C.PRIMARYSET) {
                        update_primary_symset(symp, val);
                    } else if (which_set == C.ROGUESET) {
                        update_rogue_symset(symp, val);
                    }
                }
            } else {
                if (C.gc.chosen_symset_start) {
                    C.glyphrep_to_custom_map_entries(buf, glyph.address);
                }
            }
        }
    } else if (C.gc.chosen_symset_start) {
        /* glyph, not symbol */
        C.glyphrep_to_custom_map_entries(buf, glyph.address);
    }
    return 1;
}

export function set_symhandling(handling, which_set)
{
    let i = 0;

    C.gs.symset[which_set].handling = C.H_UNK;
    while (C.known_handling[i]) {
        if (!C.strcmpi(C.known_handling[i], handling)) {
            C.gs.symset[which_set].handling = i;
            return;
        }
        i++;
    }
}

/* bundle some common usage into one easy-to-use routine */
export function load_symset(s, which_set)
{
    clear_symsetentry(which_set, 1);

    if (C.gs.symset[which_set].name)
        C.free(C.gs.symset[which_set].name);
    C.gs.symset[which_set].name = C.dupstr(s);

    if (C.read_sym_file(which_set)) {
        switch_symbols(1);
        C.apply_customizations(C.gc.currentgraphics,
                             C.do_custom_symbols | C.do_custom_colors);
    } else {
        clear_symsetentry(which_set, 1);
        return 0;
    }
    return 1;
}

export function free_symsets()
{
    clear_symsetentry(C.PRIMARYSET, 1);
    clear_symsetentry(C.ROGUESET, 1);

    /* symset_list is cleaned up as soon as it's used, so we shouldn't
       have to anything about it here */
    /* assert( symset_list == NULL ); */
}




export function savedsym_free()
{
    let tmp = C.saved_symbols, tmp2;

    while (tmp) {
        tmp2 = tmp.next;
        C.free(tmp.name);
        C.free(tmp.val);
        C.free(tmp);
        tmp = tmp2;
    }
}

export function savedsym_find(name, which_set)
{
    let tmp = C.saved_symbols;

    while (tmp) {
        if (which_set == tmp.which_set && !C.strcmp(name, tmp.name))
            return tmp;
        tmp = tmp.next;
    }
    return 0;
}

export function savedsym_add(name, val, which_set)
{
    let tmp = 0;

    if ((tmp = savedsym_find(name, which_set)) != 0) {
        C.free(tmp.val);
        tmp.val = C.dupstr(val);
    } else {
        tmp = C.saved(C.alloc(C.savedSize));
        tmp.name = C.dupstr(name);
        tmp.val = C.dupstr(val);
        tmp.which_set = which_set;
        tmp.next = C.saved_symbols;
        C.saved_symbols = tmp;
    }
}

export function savedsym_strbuf(sbuf)
{
    let tmp = C.saved_symbols;
    const buf = C.stackAlloc(C.BUFSZ);

    while (tmp) {
        C.Sprintf(buf, "%sSYMBOLS=%s:%s\n",
                (tmp.which_set == C.ROGUESET) ? "ROGUE" : "",
                tmp.name, tmp.val);
        C.strbuf_append(sbuf, buf);
        tmp = tmp.next;
    }
}

/* Parse the value of a SYMBOLS line from a config file */
export function parsesymbols(opts, which_set)
{
    let val;
    let symname, strval, ch,
         first_unquoted_comma = 0, first_unquoted_colon = 0;
    let symp;
    let is_glyph = 0;

    /* are there any commas or colons that aren't quoted? */
    for (ch = opts + 1; C.loadChar(ch); ++ch) {
        let prech, postch;

        prech = ch - 1;
        postch = ch + 1;
        if (!C.loadChar(postch))
            break;
        if (C.loadChar(ch) == (',').charCodeAt(0)) {
            if (C.loadChar(prech) == ('\'').charCodeAt(0) && C.loadChar(postch) == ('\'').charCodeAt(0))
                continue;
            if (C.loadChar(prech) == ('\\').charCodeAt(0))
                continue;
        }
        if (C.loadChar(ch) == (':').charCodeAt(0)) {
            if (C.loadChar(prech) == ('\'').charCodeAt(0) && C.loadChar(postch) == ('\'').charCodeAt(0))
                continue;
        }
        if (C.loadChar(ch) == (',').charCodeAt(0) && !first_unquoted_comma)
            first_unquoted_comma = ch;
        if (C.loadChar(ch) == (':').charCodeAt(0) && !first_unquoted_colon)
            first_unquoted_colon = ch;
    }
    if (first_unquoted_comma != 0) {
        C.storeChar(first_unquoted_comma++, ('\0').charCodeAt(0));
        if (!C.callLocal(parsesymbols, first_unquoted_comma, which_set))
            return 0;
    }

    /* S_sample:string */
    symname = opts;
    strval = first_unquoted_colon;
    if (!strval)
        strval = C.strchr(opts, ('=').charCodeAt(0));
    if (!strval)
        return 0;
    C.storeChar(strval++, ('\0').charCodeAt(0));

    /* strip leading and trailing white space from symname and strval */
    C.mungspaces(symname);
    C.mungspaces(strval);

    symp = match_sym(symname);
    if (!symp && C.loadChar(symname + (0)) == ('G').charCodeAt(0) && C.loadChar(symname + (1)) == ('_').charCodeAt(0)) {
        is_glyph = C.match_glyph(symname);
    }
    if (!symp && !is_glyph)
        return 0;
    if (symp) {
        if (symp.range && symp.range != C.SYM_CONTROL) {
            if (C.gs.symset[which_set].handling == C.H_UTF8
                || (C.lowc(C.loadChar(strval + (0))) == ('u').charCodeAt(0) && C.loadChar(strval + (1)) == ('+').charCodeAt(0))) {
                const buf = C.stackAlloc(C.BUFSZ);
                const glyph = C.intLocal();

                C.Snprintf(buf, C.BUFSZ, "%s:%s", opts, strval);
                C.glyphrep_to_custom_map_entries(buf, glyph.address);
            } else {
                    val = C.sym_val(strval);
                    if (which_set == C.ROGUESET)
                        update_ov_rogue_symset(symp, val);
                    else
                        update_ov_primary_symset(symp, val);
            }
        }
    }
    savedsym_add(opts, strval, which_set);
    return 1;
}

export function match_sym(buf)
{
    const alternates = [
        { altnm: "S_armour", nm: "S_armor" },
        /* alt explosion names are numbered in phone key/button layout */
        { altnm: "S_explode1", nm: "S_expl_tl" },
        { altnm: "S_explode2", nm: "S_expl_tc" }, { altnm: "S_explode3", nm: "S_expl_tr" },
        { altnm: "S_explode4", nm: "S_expl_ml" }, { altnm: "S_explode5", nm: "S_expl_mc" },
        { altnm: "S_explode6", nm: "S_expl_mr" }, { altnm: "S_explode7", nm: "S_expl_bl" },
        { altnm: "S_explode8", nm: "S_expl_bc" }, { altnm: "S_explode9", nm: "S_expl_br" },
    ];
    let i;
    let len = C.strlen(buf);
    let p = C.strchr(buf, (':').charCodeAt(0)), q = C.strchr(buf, ('=').charCodeAt(0));
    let sp = C.loadsyms;

    /* G_ lines will never match here */
    if ((C.loadChar(buf + (0)) == ('G').charCodeAt(0) || C.loadChar(buf + (0)) == ('g').charCodeAt(0)) && C.loadChar(buf + (1)) == ('_').charCodeAt(0))
        return 0;

    if (!p || (q && q < p))
        p = q;
    if (p) {
        /* note: there will be at most one space before the '='
           because caller has condensed buf[] with mungspaces() */
        if (p > buf && C.loadChar(p + (-1)) == (' ').charCodeAt(0))
            p--;
        len = C.int(p - buf);
    }
    while (sp.range) {
        if ((len >= C.strlen(sp.name)) && !C.strncmpi(buf, sp.name, len))
            return sp;
        sp = C.symparse(sp.address + C.symparseSize);
    }
    for (i = 0; i < alternates.length; ++i) {
        if ((len >= C.strlen(alternates[i].altnm))
            && !C.strncmpi(buf, alternates[i].altnm, len)) {
            sp = C.loadsyms;
            while (sp.range) {
                if (!C.strcmp(alternates[i].nm, sp.name))
                    return sp;
                sp = C.symparse(sp.address + C.symparseSize);
            }
        }
    }
    return 0;
}



/*
 * this is called from options.c to do the symset work.
 */
export function do_symset(rogueflag)
{
    let tmpwin;
    let any;
    let n;
    const buf = C.stackAlloc(C.BUFSZ);
    const symset_pick = C.pointerLocal(0);
    let ready_to_switch = 0,
            nothing_to_do = 0;
    let symset_name;
    const fmtstr = C.stackAlloc(20);
    let sl;
    let res, which_set, setcount = 0, chosen = -2, defindx = 0;
    let clr = C.NO_COLOR;

    which_set = rogueflag ? C.ROGUESET : C.PRIMARYSET;
    C.gs.symset_list = 0;
    /* clear symset[].name as a flag to read_sym_file() to build list */
    symset_name = C.gs.symset[which_set].name;
    C.gs.symset[which_set].name = 0;

    res = C.read_sym_file(which_set);
    /* put symset name back */
    C.gs.symset[which_set].name = symset_name;

    if (res && C.gs.symset_list) {
        let thissize,
            biggest = (16 - 1),
            big_desc = 0;

        for (sl = C.gs.symset_list; sl; sl = sl.next) {
            /* check restrictions */
            if (rogueflag ? sl.primary : sl.rogue)
                continue;
            if (sl.handling == C.H_MAC)
                continue;
            setcount++;
            /* find biggest name */
            thissize = sl.name ? C.int(C.strlen(sl.name)) : 0;
            if (thissize > biggest)
                biggest = thissize;
            thissize = sl.desc ? C.int(C.strlen(sl.desc)) : 0;
            if (thissize > big_desc)
                big_desc = thissize;
        }
        if (!setcount) {
            C.There("are no appropriate %s symbol sets available.",
                  rogueflag ? "rogue level" : "primary");
            return 1;
        }

        C.Sprintf(fmtstr, "%%-%ds %%s", biggest + 2);
        tmpwin = C.create_nhwindow(C.NHW_MENU);
        C.start_menu(tmpwin, C.MENU_BEHAVE_STANDARD);
        any = C.anythingLocalCopy(C.cg.zeroany);
        any.a_int = 1; /* -1 + 2 [see 'if (sl->name) {' below]*/
        if (!symset_name)
            defindx = any.a_int;
        C.add_menu(tmpwin, C.nulGlyphInfo(), any.address, 0, 0, C.ATR_NONE,
                 clr, "Default Symbols",
                 (any.a_int == defindx) ? C.MENU_ITEMFLAGS_SELECTED
                                        : C.MENU_ITEMFLAGS_NONE);

        for (sl = C.gs.symset_list; sl; sl = sl.next) {
            /* check restrictions */
            if (rogueflag ? sl.primary : sl.rogue)
                continue;
            if (sl.handling == C.H_MAC)
                continue;
            if (sl.name) {
                /* +2: sl->idx runs from 0 to N-1 for N symsets;
                   +1 because Defaults are implicitly in slot [0];
                   +1 again so that valid data is never 0 */
                any.a_int = sl.idx + 2;
                if (symset_name && !C.strcmpi(sl.name, symset_name))
                    defindx = any.a_int;
                C.Sprintf(buf, fmtstr, sl.name, sl.desc ? sl.desc : "");
                C.add_menu(tmpwin, C.nulGlyphInfo(), any.address, 0, 0,
                         C.ATR_NONE, clr, buf,
                         (any.a_int == defindx) ? C.MENU_ITEMFLAGS_SELECTED
                                                : C.MENU_ITEMFLAGS_NONE);
            }
        }
        C.Sprintf(buf, "Select %ssymbol set:",
                rogueflag ? "rogue level " : "");
        C.end_menu(tmpwin, buf);
        n = C.select_menu(tmpwin, C.PICK_ONE, symset_pick.address);
        if (n > 0) {
            chosen = C.menuItems(symset_pick.value)[0].item.a_int;
            /* if picking non-preselected entry yields 2, make sure
               that we're going with the non-preselected one */
            if (n == 2 && chosen == defindx)
                chosen = C.menuItems(symset_pick.value)[1].item.a_int;
            chosen -= 2; /* convert menu index to symset index;
                          * "Default symbols" have index -1 */
            C.free(symset_pick.value);
        } else if (n == 0 && defindx > 0) {
            chosen = defindx - 2;
        }
        C.destroy_nhwindow(tmpwin);

        if (chosen > -1) {
            /* chose an actual symset name from file */
            for (sl = C.gs.symset_list; sl; sl = sl.next)
                if (sl.idx == chosen)
                    break;
            if (sl) {
                /* free the now stale attributes */
                clear_symsetentry(which_set, 1);

                /* transfer only the name of the symbol set */
                C.gs.symset[which_set].name = C.dupstr(sl.name);
                ready_to_switch = 1;
            }
        } else if (chosen == -1) {
            /* explicit selection of defaults */
            /* free the now stale symset attributes */
            clear_symsetentry(which_set, 1);
        } else
            nothing_to_do = 1;
    } else if (!res) {
        /* The symbols file could not be accessed */
        C.pline("Unable to access \"%s\" file.", C.SYMBOLS);
        return 1;
    } else if (!C.gs.symset_list) {
        /* The symbols file was empty */
        C.There("were no symbol sets found in \"%s\".", C.SYMBOLS);
        return 1;
    }

    /* clean up */
    while ((sl = C.gs.symset_list) != 0) {
        C.gs.symset_list = sl.next;
        if (sl.name)
            C.free(sl.name), sl.name = 0;
        if (sl.desc)
            C.free(sl.desc), sl.desc = 0;
        C.free(sl);
    }

    if (nothing_to_do)
        return 1;

    /* Set default symbols and clear the handling value */
    if (rogueflag)
        init_rogue_symbols();
    else
        init_primary_symbols();

    if (C.gs.symset[which_set].name) {
        /* non-default symbols */
        let ok;
        if (!C.glyphid_cache_status()) {
            C.fill_glyphid_cache();
        }
        ok = C.read_sym_file(which_set);
        if (C.glyphid_cache_status()) {
            C.free_glyphid_cache();
        }
        if (ok) {
            ready_to_switch = 1;
        } else {
            clear_symsetentry(which_set, 1);
            return 1;
        }
    }

    if (ready_to_switch)
        switch_symbols(1);

    if (C.Is_rogue_level(C.u.uz)) {
        if (rogueflag)
            assign_graphics(C.ROGUESET);
    } else if (!rogueflag)
        assign_graphics(C.PRIMARYSET);
    C.apply_customizations(rogueflag ? C.ROGUESET : C.PRIMARYSET,
                         (C.do_custom_symbols | C.do_custom_colors));
    C.preference_update("symset");
    return 1;
}



/*symbols.c*/
export const known_handling = ["UNKNOWN", "IBM", "DEC", "CURS", "MAC", "UTF8", 0];
export const known_restrictions = ["primary", "rogue", 0];
export const loadsyms = [
    {"range": "SYM_CONTROL", "idx": "0", "name": "start"},
    {"range": "SYM_CONTROL", "idx": "0", "name": "begin"},
    {"range": "SYM_CONTROL", "idx": "1", "name": "finish"},
    {"range": "SYM_CONTROL", "idx": "2", "name": "handling"},
    {"range": "SYM_CONTROL", "idx": "3", "name": "description"},
    {"range": "SYM_CONTROL", "idx": "4", "name": "color"},
    {"range": "SYM_CONTROL", "idx": "4", "name": "colour"},
    {"range": "SYM_CONTROL", "idx": "5", "name": "restrictions"},
    {"range": "SYM_PCHAR", "idx": "S_stone", "name": "S_stone"},
    {"range": "SYM_PCHAR", "idx": "S_vwall", "name": "S_vwall"},
    {"range": "SYM_PCHAR", "idx": "S_hwall", "name": "S_hwall"},
    {"range": "SYM_PCHAR", "idx": "S_tlcorn", "name": "S_tlcorn"},
    {"range": "SYM_PCHAR", "idx": "S_trcorn", "name": "S_trcorn"},
    {"range": "SYM_PCHAR", "idx": "S_blcorn", "name": "S_blcorn"},
    {"range": "SYM_PCHAR", "idx": "S_brcorn", "name": "S_brcorn"},
    {"range": "SYM_PCHAR", "idx": "S_crwall", "name": "S_crwall"},
    {"range": "SYM_PCHAR", "idx": "S_tuwall", "name": "S_tuwall"},
    {"range": "SYM_PCHAR", "idx": "S_tdwall", "name": "S_tdwall"},
    {"range": "SYM_PCHAR", "idx": "S_tlwall", "name": "S_tlwall"},
    {"range": "SYM_PCHAR", "idx": "S_trwall", "name": "S_trwall"},
    {"range": "SYM_PCHAR", "idx": "S_ndoor", "name": "S_ndoor"},
    {"range": "SYM_PCHAR", "idx": "S_vodoor", "name": "S_vodoor"},
    {"range": "SYM_PCHAR", "idx": "S_hodoor", "name": "S_hodoor"},
    {"range": "SYM_PCHAR", "idx": "S_vcdoor", "name": "S_vcdoor"},
    {"range": "SYM_PCHAR", "idx": "S_hcdoor", "name": "S_hcdoor"},
    {"range": "SYM_PCHAR", "idx": "S_bars", "name": "S_bars"},
    {"range": "SYM_PCHAR", "idx": "S_tree", "name": "S_tree"},
    {"range": "SYM_PCHAR", "idx": "S_room", "name": "S_room"},
    {"range": "SYM_PCHAR", "idx": "S_darkroom", "name": "S_darkroom"},
    {"range": "SYM_PCHAR", "idx": "S_engroom", "name": "S_engroom"},
    {"range": "SYM_PCHAR", "idx": "S_corr", "name": "S_corr"},
    {"range": "SYM_PCHAR", "idx": "S_litcorr", "name": "S_litcorr"},
    {"range": "SYM_PCHAR", "idx": "S_engrcorr", "name": "S_engrcorr"},
    {"range": "SYM_PCHAR", "idx": "S_upstair", "name": "S_upstair"},
    {"range": "SYM_PCHAR", "idx": "S_dnstair", "name": "S_dnstair"},
    {"range": "SYM_PCHAR", "idx": "S_upladder", "name": "S_upladder"},
    {"range": "SYM_PCHAR", "idx": "S_dnladder", "name": "S_dnladder"},
    {"range": "SYM_PCHAR", "idx": "S_brupstair", "name": "S_brupstair"},
    {"range": "SYM_PCHAR", "idx": "S_brdnstair", "name": "S_brdnstair"},
    {"range": "SYM_PCHAR", "idx": "S_brupladder", "name": "S_brupladder"},
    {"range": "SYM_PCHAR", "idx": "S_brdnladder", "name": "S_brdnladder"},
    {"range": "SYM_PCHAR", "idx": "S_altar", "name": "S_altar"},
    {"range": "SYM_PCHAR", "idx": "S_grave", "name": "S_grave"},
    {"range": "SYM_PCHAR", "idx": "S_throne", "name": "S_throne"},
    {"range": "SYM_PCHAR", "idx": "S_sink", "name": "S_sink"},
    {"range": "SYM_PCHAR", "idx": "S_fountain", "name": "S_fountain"},
    {"range": "SYM_PCHAR", "idx": "S_pool", "name": "S_pool"},
    {"range": "SYM_PCHAR", "idx": "S_ice", "name": "S_ice"},
    {"range": "SYM_PCHAR", "idx": "S_lava", "name": "S_lava"},
    {"range": "SYM_PCHAR", "idx": "S_lavawall", "name": "S_lavawall"},
    {"range": "SYM_PCHAR", "idx": "S_vodbridge", "name": "S_vodbridge"},
    {"range": "SYM_PCHAR", "idx": "S_hodbridge", "name": "S_hodbridge"},
    {"range": "SYM_PCHAR", "idx": "S_vcdbridge", "name": "S_vcdbridge"},
    {"range": "SYM_PCHAR", "idx": "S_hcdbridge", "name": "S_hcdbridge"},
    {"range": "SYM_PCHAR", "idx": "S_air", "name": "S_air"},
    {"range": "SYM_PCHAR", "idx": "S_cloud", "name": "S_cloud"},
    {"range": "SYM_PCHAR", "idx": "S_water", "name": "S_water"},
    {"range": "SYM_PCHAR", "idx": "S_arrow_trap", "name": "S_arrow_trap"},
    {"range": "SYM_PCHAR", "idx": "S_dart_trap", "name": "S_dart_trap"},
    {"range": "SYM_PCHAR", "idx": "S_falling_rock_trap", "name": "S_falling_rock_trap"},
    {"range": "SYM_PCHAR", "idx": "S_squeaky_board", "name": "S_squeaky_board"},
    {"range": "SYM_PCHAR", "idx": "S_bear_trap", "name": "S_bear_trap"},
    {"range": "SYM_PCHAR", "idx": "S_land_mine", "name": "S_land_mine"},
    {"range": "SYM_PCHAR", "idx": "S_rolling_boulder_trap", "name": "S_rolling_boulder_trap"},
    {"range": "SYM_PCHAR", "idx": "S_sleeping_gas_trap", "name": "S_sleeping_gas_trap"},
    {"range": "SYM_PCHAR", "idx": "S_rust_trap", "name": "S_rust_trap"},
    {"range": "SYM_PCHAR", "idx": "S_fire_trap", "name": "S_fire_trap"},
    {"range": "SYM_PCHAR", "idx": "S_pit", "name": "S_pit"},
    {"range": "SYM_PCHAR", "idx": "S_spiked_pit", "name": "S_spiked_pit"},
    {"range": "SYM_PCHAR", "idx": "S_hole", "name": "S_hole"},
    {"range": "SYM_PCHAR", "idx": "S_trap_door", "name": "S_trap_door"},
    {"range": "SYM_PCHAR", "idx": "S_teleportation_trap", "name": "S_teleportation_trap"},
    {"range": "SYM_PCHAR", "idx": "S_level_teleporter", "name": "S_level_teleporter"},
    {"range": "SYM_PCHAR", "idx": "S_magic_portal", "name": "S_magic_portal"},
    {"range": "SYM_PCHAR", "idx": "S_web", "name": "S_web"},
    {"range": "SYM_PCHAR", "idx": "S_statue_trap", "name": "S_statue_trap"},
    {"range": "SYM_PCHAR", "idx": "S_magic_trap", "name": "S_magic_trap"},
    {"range": "SYM_PCHAR", "idx": "S_anti_magic_trap", "name": "S_anti_magic_trap"},
    {"range": "SYM_PCHAR", "idx": "S_polymorph_trap", "name": "S_polymorph_trap"},
    {"range": "SYM_PCHAR", "idx": "S_vibrating_square", "name": "S_vibrating_square"},
    {"range": "SYM_PCHAR", "idx": "S_trapped_door", "name": "S_trapped_door"},
    {"range": "SYM_PCHAR", "idx": "S_trapped_chest", "name": "S_trapped_chest"},
    {"range": "SYM_PCHAR", "idx": "S_vbeam", "name": "S_vbeam"},
    {"range": "SYM_PCHAR", "idx": "S_hbeam", "name": "S_hbeam"},
    {"range": "SYM_PCHAR", "idx": "S_lslant", "name": "S_lslant"},
    {"range": "SYM_PCHAR", "idx": "S_rslant", "name": "S_rslant"},
    {"range": "SYM_PCHAR", "idx": "S_digbeam", "name": "S_digbeam"},
    {"range": "SYM_PCHAR", "idx": "S_flashbeam", "name": "S_flashbeam"},
    {"range": "SYM_PCHAR", "idx": "S_boomleft", "name": "S_boomleft"},
    {"range": "SYM_PCHAR", "idx": "S_boomright", "name": "S_boomright"},
    {"range": "SYM_PCHAR", "idx": "S_ss1", "name": "S_ss1"},
    {"range": "SYM_PCHAR", "idx": "S_ss2", "name": "S_ss2"},
    {"range": "SYM_PCHAR", "idx": "S_ss3", "name": "S_ss3"},
    {"range": "SYM_PCHAR", "idx": "S_ss4", "name": "S_ss4"},
    {"range": "SYM_PCHAR", "idx": "S_poisoncloud", "name": "S_poisoncloud"},
    {"range": "SYM_PCHAR", "idx": "S_goodpos", "name": "S_goodpos"},
    {"range": "SYM_PCHAR", "idx": "S_sw_tl", "name": "S_sw_tl"},
    {"range": "SYM_PCHAR", "idx": "S_sw_tc", "name": "S_sw_tc"},
    {"range": "SYM_PCHAR", "idx": "S_sw_tr", "name": "S_sw_tr"},
    {"range": "SYM_PCHAR", "idx": "S_sw_ml", "name": "S_sw_ml"},
    {"range": "SYM_PCHAR", "idx": "S_sw_mr", "name": "S_sw_mr"},
    {"range": "SYM_PCHAR", "idx": "S_sw_bl", "name": "S_sw_bl"},
    {"range": "SYM_PCHAR", "idx": "S_sw_bc", "name": "S_sw_bc"},
    {"range": "SYM_PCHAR", "idx": "S_sw_br", "name": "S_sw_br"},
    {"range": "SYM_PCHAR", "idx": "S_expl_tl", "name": "S_expl_tl"},
    {"range": "SYM_PCHAR", "idx": "S_expl_tc", "name": "S_expl_tc"},
    {"range": "SYM_PCHAR", "idx": "S_expl_tr", "name": "S_expl_tr"},
    {"range": "SYM_PCHAR", "idx": "S_expl_ml", "name": "S_expl_ml"},
    {"range": "SYM_PCHAR", "idx": "S_expl_mc", "name": "S_expl_mc"},
    {"range": "SYM_PCHAR", "idx": "S_expl_mr", "name": "S_expl_mr"},
    {"range": "SYM_PCHAR", "idx": "S_expl_bl", "name": "S_expl_bl"},
    {"range": "SYM_PCHAR", "idx": "S_expl_bc", "name": "S_expl_bc"},
    {"range": "SYM_PCHAR", "idx": "S_expl_br", "name": "S_expl_br"},
    {"range": "SYM_OC", "idx": "S_strange_obj + SYM_OFF_O", "name": "S_strange_obj"},
    {"range": "SYM_OC", "idx": "S_weapon + SYM_OFF_O", "name": "S_weapon"},
    {"range": "SYM_OC", "idx": "S_armor + SYM_OFF_O", "name": "S_armor"},
    {"range": "SYM_OC", "idx": "S_ring + SYM_OFF_O", "name": "S_ring"},
    {"range": "SYM_OC", "idx": "S_amulet + SYM_OFF_O", "name": "S_amulet"},
    {"range": "SYM_OC", "idx": "S_tool + SYM_OFF_O", "name": "S_tool"},
    {"range": "SYM_OC", "idx": "S_food + SYM_OFF_O", "name": "S_food"},
    {"range": "SYM_OC", "idx": "S_potion + SYM_OFF_O", "name": "S_potion"},
    {"range": "SYM_OC", "idx": "S_scroll + SYM_OFF_O", "name": "S_scroll"},
    {"range": "SYM_OC", "idx": "S_book + SYM_OFF_O", "name": "S_book"},
    {"range": "SYM_OC", "idx": "S_wand + SYM_OFF_O", "name": "S_wand"},
    {"range": "SYM_OC", "idx": "S_coin + SYM_OFF_O", "name": "S_coin"},
    {"range": "SYM_OC", "idx": "S_gem + SYM_OFF_O", "name": "S_gem"},
    {"range": "SYM_OC", "idx": "S_rock + SYM_OFF_O", "name": "S_rock"},
    {"range": "SYM_OC", "idx": "S_ball + SYM_OFF_O", "name": "S_ball"},
    {"range": "SYM_OC", "idx": "S_chain + SYM_OFF_O", "name": "S_chain"},
    {"range": "SYM_OC", "idx": "S_venom + SYM_OFF_O", "name": "S_venom"},
    {"range": "SYM_MON", "idx": "S_ANT + SYM_OFF_M", "name": "S_ANT"},
    {"range": "SYM_MON", "idx": "S_BLOB + SYM_OFF_M", "name": "S_BLOB"},
    {"range": "SYM_MON", "idx": "S_COCKATRICE + SYM_OFF_M", "name": "S_COCKATRICE"},
    {"range": "SYM_MON", "idx": "S_DOG + SYM_OFF_M", "name": "S_DOG"},
    {"range": "SYM_MON", "idx": "S_EYE + SYM_OFF_M", "name": "S_EYE"},
    {"range": "SYM_MON", "idx": "S_FELINE + SYM_OFF_M", "name": "S_FELINE"},
    {"range": "SYM_MON", "idx": "S_GREMLIN + SYM_OFF_M", "name": "S_GREMLIN"},
    {"range": "SYM_MON", "idx": "S_HUMANOID + SYM_OFF_M", "name": "S_HUMANOID"},
    {"range": "SYM_MON", "idx": "S_IMP + SYM_OFF_M", "name": "S_IMP"},
    {"range": "SYM_MON", "idx": "S_JELLY + SYM_OFF_M", "name": "S_JELLY"},
    {"range": "SYM_MON", "idx": "S_KOBOLD + SYM_OFF_M", "name": "S_KOBOLD"},
    {"range": "SYM_MON", "idx": "S_LEPRECHAUN + SYM_OFF_M", "name": "S_LEPRECHAUN"},
    {"range": "SYM_MON", "idx": "S_MIMIC + SYM_OFF_M", "name": "S_MIMIC"},
    {"range": "SYM_MON", "idx": "S_NYMPH + SYM_OFF_M", "name": "S_NYMPH"},
    {"range": "SYM_MON", "idx": "S_ORC + SYM_OFF_M", "name": "S_ORC"},
    {"range": "SYM_MON", "idx": "S_PIERCER + SYM_OFF_M", "name": "S_PIERCER"},
    {"range": "SYM_MON", "idx": "S_QUADRUPED + SYM_OFF_M", "name": "S_QUADRUPED"},
    {"range": "SYM_MON", "idx": "S_RODENT + SYM_OFF_M", "name": "S_RODENT"},
    {"range": "SYM_MON", "idx": "S_SPIDER + SYM_OFF_M", "name": "S_SPIDER"},
    {"range": "SYM_MON", "idx": "S_TRAPPER + SYM_OFF_M", "name": "S_TRAPPER"},
    {"range": "SYM_MON", "idx": "S_UNICORN + SYM_OFF_M", "name": "S_UNICORN"},
    {"range": "SYM_MON", "idx": "S_VORTEX + SYM_OFF_M", "name": "S_VORTEX"},
    {"range": "SYM_MON", "idx": "S_WORM + SYM_OFF_M", "name": "S_WORM"},
    {"range": "SYM_MON", "idx": "S_XAN + SYM_OFF_M", "name": "S_XAN"},
    {"range": "SYM_MON", "idx": "S_LIGHT + SYM_OFF_M", "name": "S_LIGHT"},
    {"range": "SYM_MON", "idx": "S_ZRUTY + SYM_OFF_M", "name": "S_ZRUTY"},
    {"range": "SYM_MON", "idx": "S_ANGEL + SYM_OFF_M", "name": "S_ANGEL"},
    {"range": "SYM_MON", "idx": "S_BAT + SYM_OFF_M", "name": "S_BAT"},
    {"range": "SYM_MON", "idx": "S_CENTAUR + SYM_OFF_M", "name": "S_CENTAUR"},
    {"range": "SYM_MON", "idx": "S_DRAGON + SYM_OFF_M", "name": "S_DRAGON"},
    {"range": "SYM_MON", "idx": "S_ELEMENTAL + SYM_OFF_M", "name": "S_ELEMENTAL"},
    {"range": "SYM_MON", "idx": "S_FUNGUS + SYM_OFF_M", "name": "S_FUNGUS"},
    {"range": "SYM_MON", "idx": "S_GNOME + SYM_OFF_M", "name": "S_GNOME"},
    {"range": "SYM_MON", "idx": "S_GIANT + SYM_OFF_M", "name": "S_GIANT"},
    {"range": "SYM_MON", "idx": "S_invisible + SYM_OFF_M", "name": "S_invisible"},
    {"range": "SYM_MON", "idx": "S_JABBERWOCK + SYM_OFF_M", "name": "S_JABBERWOCK"},
    {"range": "SYM_MON", "idx": "S_KOP + SYM_OFF_M", "name": "S_KOP"},
    {"range": "SYM_MON", "idx": "S_LICH + SYM_OFF_M", "name": "S_LICH"},
    {"range": "SYM_MON", "idx": "S_MUMMY + SYM_OFF_M", "name": "S_MUMMY"},
    {"range": "SYM_MON", "idx": "S_NAGA + SYM_OFF_M", "name": "S_NAGA"},
    {"range": "SYM_MON", "idx": "S_OGRE + SYM_OFF_M", "name": "S_OGRE"},
    {"range": "SYM_MON", "idx": "S_PUDDING + SYM_OFF_M", "name": "S_PUDDING"},
    {"range": "SYM_MON", "idx": "S_QUANTMECH + SYM_OFF_M", "name": "S_QUANTMECH"},
    {"range": "SYM_MON", "idx": "S_RUSTMONST + SYM_OFF_M", "name": "S_RUSTMONST"},
    {"range": "SYM_MON", "idx": "S_SNAKE + SYM_OFF_M", "name": "S_SNAKE"},
    {"range": "SYM_MON", "idx": "S_TROLL + SYM_OFF_M", "name": "S_TROLL"},
    {"range": "SYM_MON", "idx": "S_UMBER + SYM_OFF_M", "name": "S_UMBER"},
    {"range": "SYM_MON", "idx": "S_VAMPIRE + SYM_OFF_M", "name": "S_VAMPIRE"},
    {"range": "SYM_MON", "idx": "S_WRAITH + SYM_OFF_M", "name": "S_WRAITH"},
    {"range": "SYM_MON", "idx": "S_XORN + SYM_OFF_M", "name": "S_XORN"},
    {"range": "SYM_MON", "idx": "S_YETI + SYM_OFF_M", "name": "S_YETI"},
    {"range": "SYM_MON", "idx": "S_ZOMBIE + SYM_OFF_M", "name": "S_ZOMBIE"},
    {"range": "SYM_MON", "idx": "S_HUMAN + SYM_OFF_M", "name": "S_HUMAN"},
    {"range": "SYM_MON", "idx": "S_GHOST + SYM_OFF_M", "name": "S_GHOST"},
    {"range": "SYM_MON", "idx": "S_GOLEM + SYM_OFF_M", "name": "S_GOLEM"},
    {"range": "SYM_MON", "idx": "S_DEMON + SYM_OFF_M", "name": "S_DEMON"},
    {"range": "SYM_MON", "idx": "S_EEL + SYM_OFF_M", "name": "S_EEL"},
    {"range": "SYM_MON", "idx": "S_LIZARD + SYM_OFF_M", "name": "S_LIZARD"},
    {"range": "SYM_MON", "idx": "S_WORM_TAIL + SYM_OFF_M", "name": "S_WORM_TAIL"},
    {"range": "SYM_MON", "idx": "S_MIMIC_DEF + SYM_OFF_M", "name": "S_MIMIC_DEF"},
    {"range": "SYM_OTH", "idx": "SYM_NOTHING + SYM_OFF_X", "name": "S_nothing"},
    {"range": "SYM_OTH", "idx": "SYM_UNEXPLORED + SYM_OFF_X", "name": "S_unexplored"},
    {"range": "SYM_OTH", "idx": "SYM_BOULDER + SYM_OFF_X", "name": "S_boulder"},
    {"range": "SYM_OTH", "idx": "SYM_INVISIBLE + SYM_OFF_X", "name": "S_invisible"},
    {"range": "SYM_OTH", "idx": "SYM_PET_OVERRIDE + SYM_OFF_X", "name": "S_pet_override"},
    {"range": "SYM_OTH", "idx": "SYM_HERO_OVERRIDE + SYM_OFF_X", "name": "S_hero_override"},
    {"range": "SYM_INVALID", "idx": "0", "name": null},
];

/* set in term_start_screen() */

/* these intentionally have no defaults */

/* there aren't any symbol sets with CURS handling, and the
           curses interface never assigns a routine to curses..._callback */

/* set in term_start_screen() */
/* set in term_start_screen() */

/* set in term_start_screen and
                                               * found in unixtty,windtty,&c */
