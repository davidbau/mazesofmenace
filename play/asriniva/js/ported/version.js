/* NetHack 5.0	version.c	$NHDT-Date: 1737622664 2025/01/23 00:57:44 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.105 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Michael Allison, 2018. */
/* NetHack may be freely redistributed.  See license for details. */

import { C } from '../c-runtime/context.js';







/* fill buffer with short version (so caller can avoid including date.h)
 * buf cannot be NULL */
export function version_string(buf, bufsz)
{
    bufsz = C.size_t(bufsz);
    C.Snprintf(buf, bufsz, "%s",
             ((C.nomakedefs.version_string && C.loadChar(C.nomakedefs.version_string))
              ? C.nomakedefs.version_string
              /* in case we try to write a paniclog entry after releasing
                 the 'nomakedefs' data */
              : C.mdlib_version_string(buf, ".")), 0);
    return buf;
}

/* fill and return the given buffer with the long nethack version string */
export function getversionstring(buf, bufsz)
{
    bufsz = C.size_t(bufsz);
    C.Strcpy(buf, C.nomakedefs.version_id);

    {
        let c = 0;
        let p = C.eos(buf);
        let dotoff = (p > buf && C.loadChar(p - 1) == '.'.charCodeAt(0));

        if (dotoff)
            --p;
        C.Strcpy(p, " (");
        if (C.nomakedefs.git_sha)
            C.Snprintf(C.eos(buf), C.size_t(C.size_t(bufsz - C.strlen(buf)) - 1n),
                     "%s%s", c++ ? "," : "", C.nomakedefs.git_sha, 2);
        if (C.nomakedefs.git_prefix)
            C.Snprintf(C.eos(buf), C.size_t(C.size_t(bufsz - C.strlen(buf)) - 1n),
                     "%sprefix:%s",
                     c++ ? "," : "", C.nomakedefs.git_prefix, 4);
        if (c)
            C.Snprintf(C.eos(buf), C.size_t(C.size_t(bufsz - C.strlen(buf)) - 1n),
                     "%s", ")", 5);
        else /* if nothing has been added, strip " (" back off */
            C.storeChar(p, '\0'.charCodeAt(0));
        if (dotoff)
            C.Snprintf(C.eos(buf), C.size_t(C.size_t(bufsz - C.strlen(buf)) - 1n),
                     "%s", ".", 6);
    }
    return buf;
}

/* version info that could be displayed on status lines;
     "<game name> <git branch name> <x.y.z version number>";
   if game name is a prefix of--or same as--branch name, it is omitted
     "<git branch name> <x.y.z version number>";
   after release--or if branch info is unavailable--it will be
     "<game name> <x.y.z version number>";
   game name or branch name or both can be requested via flags */
export function status_version(buf, bufsz, indent)
{
    bufsz = C.size_t(bufsz);
    indent = C.boolean(indent);
    let name = 0, altname = 0, indentation;
    let vflags = C.flags.versinfo;
    let shownum = ((vflags & C.VI_NUMBER) != 0),
            showname = ((vflags & C.VI_NAME) != 0),
            showbranch = ((vflags & C.VI_BRANCH) != 0);

    /* game's name {variants should use own name, not "NetHack"} */
    if (showname) {
/* can be set to override default (base of filename) */
        name = C.nh_basename(C.gh.hname, 0); /* hname is from xxxmain.c */
        if (!name || !C.loadChar(name)) /* shouldn't happen */
            showname = 0;
    }
    /* git branch name, if available */
    if (showbranch) {
/*#if (NH_DEVEL_STATUS != NH_STATUS_RELEASED)*/
        altname = C.nomakedefs.git_branch;
        if (!altname || !C.loadChar(altname))
            showbranch = 0;
    }
    if (showname && showbranch) {
        if (!C.strncmpi(name, altname, C.strlen(name)))
            showname = 0;
/* note: it's possible for branch name to be a prefix of game name
           but that's unlikely enough that we won't bother with it; having
           branch "nethack-5.0" be a superset of game "nethack" seems like
           including both is redundant, but having branch "net" be a subset
           of game "nethack" doesn't feel that way; optimizing "net" out
           seems like it would be a mistake */
    } else if (!showname && !showbranch) {
        /* flags.versinfo could be set to only 'branch' but it might not
           be available */
        shownum = 1;
    }

    C.storeChar(buf, '\0'.charCodeAt(0));
    indentation = indent ? " " : "";
    if (showname) {
        C.Snprintf(C.eos(buf), C.size_t(bufsz - C.strlen(buf)), "%s%s", indentation, name, 7);
        indentation = " "; /* forced separator rather than optional indent */
    }
    if (showbranch) {
        C.Snprintf(C.eos(buf), C.size_t(bufsz - C.strlen(buf)), "%s%s", indentation, altname, 8);
        indentation = " ";
    }
    if (shownum) {
        /* x.y.z version number */
        C.Snprintf(C.eos(buf), C.size_t(bufsz - C.strlen(buf)), "%s%s", indentation,
                 (C.nomakedefs.version_string && C.loadChar(C.nomakedefs.version_string))
                     ? C.nomakedefs.version_string
                     : C.mdlib_version_string(buf, "."), 9);
    }
    return buf;
}

/* the #versionshort command */
export function doversion()
{
    let buf = C.stackAlloc(C.BUFSZ);

    if (C.iflags.menu_requested)
        return C.callLocal(doextversion);

    C.pline("%s", C.callLocal(getversionstring, buf, C.BUFSZ));
    return C.ECMD_OK;
}

/* the '#version' command; also a choice for '?' */
export function doextversion()
{
    let rtcontext = C.intLocal();
    rtcontext.value = 0;
    let rtbuf;
    let f = 0;
    let buf = C.stackAlloc(C.BUFSZ), p = 0;
    let win = C.create_nhwindow(C.NHW_TEXT);
    let use_dlb = 1,
            done_rt = 0,
            done_dlb = 0,
            prolog;
    /* lua_info[] moved to util/mdlib.c and rendered via do_runtime_info() */

    use_dlb = 0;

    /* instead of using ``display_file(OPTIONS_USED,TRUE)'' we handle
       the file manually so we can include dynamic version info */

    C.callLocal(getversionstring, buf, C.BUFSZ);
    /* if extra text (git info) is present, put it on separate line
       but don't wrap on (x86) */
    if (C.strlen(buf) >= C.COLNO)
        p = C.strrchr(buf, '('.charCodeAt(0));
    if (p && p > buf && C.loadChar(p - 1) == ' '.charCodeAt(0) && C.loadChar(p + 1) != 'x'.charCodeAt(0))
        C.storeChar(p - 1, '\0'.charCodeAt(0));
    else
        p = 0;
    C.putstr(win, 0, buf);
    if (p) {
        C.storeChar(--p, ' '.charCodeAt(0));
        C.putstr(win, 0, p);
    }

    if (use_dlb) {
        f = C.dlb_fopen(C.OPTIONS_USED, "r");
        if (!f) {
            C.putstr(win, 0, "");
            C.Sprintf(buf, "[Configuration '%s' not available?]", C.OPTIONS_USED);
            C.putstr(win, 0, buf);
            done_dlb = 1;
        }
    }
    /*
     * already inserted above:
     * + outdented program name and version plus build date and time
     * dat/options; display contents with lines prefixed by '-' deleted:
     * - blank-line
     * -     indented program name and version
     *   blank-line
     *   outdented feature header
     * - blank-line
     *       indented feature list
     *       spread over multiple lines
     *   blank-line
     *   outdented windowing header
     * - blank-line
     *       indented windowing choices with
     *       optional second line for default
     * - blank-line
     * - EOF
     */

    prolog = 1; /* to skip indented program name */
    for (;;) {
        if (use_dlb && !done_dlb) {
            if (!C.dlb_fgets(buf, C.BUFSZ, f)) {
                done_dlb = 1;
                continue;
            }
        } else if (!done_rt) {
            if (!(rtbuf = C.do_runtime_info(rtcontext))) {
                done_rt = 1;
                continue;
            }
            C.strncpy(buf, rtbuf, C.BUFSZ - 1);
            C.storeChar(buf + C.BUFSZ - 1, 0);
        } else {
            break;
        }
        C.strip_newline(buf);
        if (C.strchr(buf, '\t'.charCodeAt(0)) != 0)
            C.tabexpand(buf);

        if (C.loadChar(buf) && C.loadChar(buf) != ' '.charCodeAt(0)) {
            /* found outdented header; insert a separator since we'll
               have skipped corresponding blank line inside the file */
            C.putstr(win, 0, "");
            prolog = 0;
        }
        /* skip blank lines and prolog (progame name plus version) */
        if (prolog || !C.loadChar(buf))
            continue;

        if (C.strchr(buf, ':'.charCodeAt(0)))
            insert_rtoption(buf);

        if (C.loadChar(buf))
            C.putstr(win, 0, buf);
    }
    if (use_dlb)
        C.dlb_fclose(f);
    C.display_nhwindow(win, 0);
    C.destroy_nhwindow(win);
    return C.ECMD_OK;
}

export function early_version_info(pastebuf)
{
    pastebuf = C.boolean(pastebuf);
    let buf1 = C.stackAlloc(C.BUFSZ), buf2 = C.stackAlloc(C.BUFSZ);
    let buf, tmp;

    C.Snprintf(buf1, C.BUFSZ, "test", 10);
    /* this is early enough that we have to do our own line-splitting */
    C.callLocal(getversionstring, buf1, C.BUFSZ);
    tmp = C.strstri(buf1, " ("); /* split at start of version info */
    if (tmp) {
        /* retain one buffer so that it all goes into the paste buffer */
        C.storeChar(tmp++, '\0'.charCodeAt(0));
        C.Snprintf(buf2, C.BUFSZ,"%s\n%s", buf1, tmp, 11);
        buf = buf2;
    } else {
        buf = buf1;
    }

    C.raw_printf("%s", buf);

    if (pastebuf) {
        /*
         * Call a platform/port-specific routine to insert the
         * version information into a paste buffer. Useful for
         * easy inclusion in bug reports.
         */
        C.port_insert_pastebuf(buf);
    }
}



/*
 * makedefs should put the first token into dat/options; we'll substitute
 * the second value for it.  The token must contain at least one colon
 * so that we can spot it, and should not contain spaces so that makedefs
 * won't split it across lines.  Ideally the length should be close to
 * that of the substituted value since we don't do phrase-splitting/line-
 * wrapping when displaying it.
 */
export const rt_opts = [
    { token: ":PATMATCH:", value: "regex_id" },
    { token: ":LUAVERSION:", value: "lua_ver" },
    { token: ":LUACOPYRIGHT:", value: "lua_copyright" },
];

/*
 * 3.6.0
 * Some optional stuff is no longer available to makedefs because
 * it depends which of several object files got linked into the
 * game image, so we insert those options here.
 */
export function insert_rtoption(buf)
{
    let i;

    if (!C.loadChar(C.gl.lua_ver))
        C.get_lua_version();

    for (i = 0; i < C.rt_opts.length; ++i) {
        if (C.strstri(buf, C.rt_opts[i].token) && C.loadChar(C.rt_opts[i].value)) {
            C.strsubst(buf, C.rt_opts[i].token, C.rt_opts[i].value);
        }
        /* we don't break out of the loop after a match; there might be
           other matches on the same line */
    }
}

/* BUILD_TIME is constant but might have L suffix rather than UL;
       'filetime' is historically signed but ought to have been unsigned */
/* !SFCTOOL */

/* SFCTOOL */

export function check_version(version_data, filename, complain, utdflags)
{
    complain = C.boolean(complain);
    utdflags = C.ulong(utdflags);
    if (!filename) {
        complain = 0; /* 'complain' requires 'filename' for pline("%s") */
    }
    if ((version_data.feature_set & C.SFCTOOL_BIT) != 0) {
        C.gc.converted_savefile_loaded = 1;
        version_data.feature_set &= ~(C.SFCTOOL_BIT);
    }
    if (
/* patchlevel.h */
        version_data.incarnation != C.nomakedefs.version_number
        ) {
        if (complain) {
            C.pline("Version mismatch for file \"%s\".", filename);
            if (C.WIN_MESSAGE != C.WIN_ERR)
                 C.display_nhwindow(C.WIN_MESSAGE, 1);
        }
        return 0;
    } else if (
        (version_data.feature_set & ~C.nomakedefs.ignored_features)
            != (C.nomakedefs.version_features & ~C.nomakedefs.ignored_features)
        || ((utdflags & C.UTD_SKIP_SANITY1) == 0
             && version_data.entity_count != C.nomakedefs.version_sanity1)
        ) {
        if (complain) {
            C.pline("Configuration incompatibility for file \"%s\".", filename);
            C.display_nhwindow(C.WIN_MESSAGE, 1);
        }
        return 0;
    }
    return 1;
}


export function get_feature_notice_ver(str)
{
    let buf = C.stackAlloc(C.BUFSZ);
    let ver_maj, ver_min, patch;
    let istr = [0, 0, 0];
    let j = 0;

    if (!str)
        return 0n;
    str = C.strcpy(buf, str);
    istr[j] = str;
    while (C.loadChar(str)) {
        if (C.loadChar(str) == '.'.charCodeAt(0)) {
            C.storeChar(str++, '\0'.charCodeAt(0));
            j++;
            istr[j] = str;
            if (j == 2)
                break;
        } else if (C.strchr("0123456789", C.loadChar(str)) != 0) {
            str++;
        } else
            return 0n;
    }
    if (j != 2)
        return 0n;
    ver_maj = C.atoi(istr[0]);
    ver_min = C.atoi(istr[1]);
    patch = C.atoi(istr[2]);
    return C.FEATURE_NOTICE_VER(ver_maj, ver_min, patch);
    /* macro from hack.h */
}

export function get_current_feature_ver()
{
    return C.FEATURE_NOTICE_VER(C.VERSION_MAJOR, C.VERSION_MINOR, C.PATCHLEVEL);
}

/*ARGUSED*/
export function copyright_banner_line(indx)
{
    indx = C.int(indx);
    if (indx == 1)
        return C.COPYRIGHT_BANNER_A;
    if (indx == 2)
        return C.COPYRIGHT_BANNER_B;

    if (indx == 3)
        return C.nomakedefs.copyright_banner_c;

    if (indx == 4)
        return C.COPYRIGHT_BANNER_D;
    return C.literal("");
}

/* called by argcheck(allmain.c) from early_options(sys/xxx/xxxmain.c) */
export function dump_version_info()
{
    let buf = C.stackAlloc(C.BUFSZ);
    let hname = C.gh.hname ? C.gh.hname : "nethack";

    if (C.strlen(hname) > 33)
        hname = C.eos(hname) - 33; /* discard const for eos() */
    C.runtime_info_init();
    C.Snprintf(buf, C.BUFSZ, "%-12.33s %08lx %08lx %08lx",
             hname,
             C.nomakedefs.version_number,
             (C.nomakedefs.version_features & ~C.nomakedefs.ignored_features),
             C.nomakedefs.version_sanity1, 12);
    C.raw_print(buf);
    C.release_runtime_info();
    return;
}
export function store_version(nhfp)
{
    let version_data = C.versionLocal(true);
    /* actual version number */
    version_data.incarnation = C.nomakedefs.version_number;
    /* bitmask of config settings */
    version_data.feature_set = C.nomakedefs.version_features;
    /* # of monsters and objects */
    version_data.entity_count = C.nomakedefs.version_sanity1;

    /* bwrite() before bufon() uses plain write() */
    if (nhfp.structlevel)
        C.bufoff(nhfp.fd);

    C.callLocal(store_critical_bytes, nhfp);
    C.Sfo_version_info(nhfp, version_data,
                     "version_info");

    if (nhfp.structlevel)
        C.bufon(nhfp.fd);
    return;
}
/* !SFCTOOL */
/* MINIMAL_FOR_RECOVER */



export const critical_sizes = [
    { ucsize: 0, nm: "unused" },
    /* simple types, that don't have subfields */
    { ucsize: "sizeof_short", nm: "short" },
    { ucsize: "sizeof_int", nm: "int" },
    { ucsize: "sizeof_long", nm: "long" },
    { ucsize: "sizeof_long_long", nm: "long long" },
    { ucsize: "sizeof_genericptr_t", nm: "genericptr_t" },
    { ucsize: "sizeof_aligntyp", nm: "aligntyp" },
    { ucsize: "sizeof_boolean", nm: "boolean" },
    { ucsize: "sizeof_coordxy", nm: "coordxy" },
    { ucsize: "sizeof_int16", nm: "int16" },
    { ucsize: "sizeof_int32", nm: "int32" },
    { ucsize: "sizeof_int64", nm: "int64" },
    { ucsize: "sizeof_schar", nm: "schar" },
    { ucsize: "sizeof_size_t", nm: "size_t" },
    { ucsize: "sizeof_uchar", nm: "uchar" },
    { ucsize: "sizeof_uint16", nm: "uint16" },
    { ucsize: "sizeof_uint32", nm: "uint32" },
    { ucsize: "sizeof_uint64", nm: "uint64" },
    { ucsize: "sizeof_ulong", nm: "ulong" },
    { ucsize: "sizeof_unsigned", nm: "unsigned" },
    { ucsize: "sizeof_ushort", nm: "ushort" },
    { ucsize: "sizeof_xint16", nm: "xint16" },
    { ucsize: "sizeof_xint8", nm: "xint8" },
    /* complex - they break down into one or more simple types */
    { ucsize: "sizeof_struct_arti_info", nm: "struct arti_info" },
    { ucsize: "sizeof_struct_nhrect", nm: "struct nhrect" },
    { ucsize: "sizeof_struct_branch", nm: "struct branch" },
    { ucsize: "sizeof_struct_bubble", nm: "struct bubble" },
    { ucsize: "sizeof_struct_cemetery", nm: "struct cemetery" },
    { ucsize: "sizeof_struct_context_info", nm: "struct context_info" },
    { ucsize: "sizeof_struct_nhcoord", nm: "struct nhcoord" },
    { ucsize: "sizeof_struct_damage", nm: "struct damage" },
    { ucsize: "sizeof_struct_dest_area", nm: "struct dest_area" },
    { ucsize: "sizeof_struct_dgn_topology", nm: "struct dgn_topology" },
    { ucsize: "sizeof_struct_dungeon", nm: "struct dungeon" },
    { ucsize: "sizeof_struct_d_level", nm: "struct d_level" },
    { ucsize: "sizeof_struct_ebones", nm: "struct ebones" },
    { ucsize: "sizeof_struct_edog", nm: "struct edog" },
    { ucsize: "sizeof_struct_egd", nm: "struct egd" },
    { ucsize: "sizeof_struct_emin", nm: "struct emin" },
    { ucsize: "sizeof_struct_engr", nm: "struct engr" },
    { ucsize: "sizeof_struct_epri", nm: "struct epri" },
    { ucsize: "sizeof_struct_eshk", nm: "struct eshk" },
    { ucsize: "sizeof_struct_fe", nm: "struct fe" },
    { ucsize: "sizeof_struct_flag", nm: "struct flag" },
    { ucsize: "sizeof_struct_fruit", nm: "struct fruit" },
    { ucsize: "sizeof_struct_gamelog_line", nm: "struct gamelog_line" },
    { ucsize: "sizeof_struct_kinfo", nm: "struct kinfo" },
    { ucsize: "sizeof_struct_levelflags", nm: "struct levelflags" },
    { ucsize: "sizeof_struct_ls_t", nm: "struct ls_t" },
    { ucsize: "sizeof_struct_linfo", nm: "struct linfo" },
    { ucsize: "sizeof_struct_mapseen_feat", nm: "struct mapseen_feat" },
    { ucsize: "sizeof_struct_mapseen_flags", nm: "struct mapseen_flags" },
    { ucsize: "sizeof_struct_mapseen_rooms", nm: "struct mapseen_rooms" },
    { ucsize: "sizeof_struct_mextra", nm: "struct mextra" },
    { ucsize: "sizeof_struct_mkroom", nm: "struct mkroom" },
    { ucsize: "sizeof_struct_monst", nm: "struct monst" },
    { ucsize: "sizeof_struct_mvitals", nm: "struct mvitals" },
    { ucsize: "sizeof_struct_obj", nm: "struct obj" },
    { ucsize: "sizeof_struct_objclass", nm: "struct objclass" },
    { ucsize: "sizeof_struct_oextra", nm: "struct oextra" },
    { ucsize: "sizeof_struct_q_score", nm: "struct q_score" },
    { ucsize: "sizeof_struct_rm", nm: "struct rm" },
    { ucsize: "sizeof_struct_spell", nm: "struct spell" },
    { ucsize: "sizeof_struct_stairway", nm: "struct stairway" },
    { ucsize: "sizeof_struct_s_level", nm: "struct s_level" },
    { ucsize: "sizeof_struct_trap", nm: "struct trap" },
    { ucsize: "sizeof_struct_version_info", nm: "struct version_info" },
    { ucsize: "sizeof_anything", nm: "anything" },
    /* struct you requires 2 bytes */
    { ucsize: "you_LO", nm: "you_LO" },
    { ucsize: "you_HI", nm: "you_HI" },
/*
     * the ones below are substructures of the ones
     * above, so there is no need to check these directly.
     */
/* SF_INCLUDE_SUBSTRUCTS */
    /* 10 for future expansion without changing array size */
    { ucsize: 0, nm: "" },
    { ucsize: 0, nm: "" },
    { ucsize: 0, nm: "" },
    { ucsize: 0, nm: "" },
    { ucsize: 0, nm: "" },
    { ucsize: 0, nm: "" },
    { ucsize: 0, nm: "" },
    { ucsize: 0, nm: "" },
    { ucsize: 0, nm: "" },
    { ucsize: 0, nm: "" },
];



export function get_critical_size_count()
{
    return C.critical_sizes.length;
}

export function store_critical_bytes(nhfp)
{
    let i, cnt;
    let indicate = C.charLocal(), csc_count = C.charLocal();
    indicate.value = 'u'.charCodeAt(0);
    csc_count.value = C.char(C.critical_sizes.length);
    /* int cmc = 0; */

    if (nhfp.mode & C.WRITING) {
        indicate.value = (nhfp.structlevel) ? 'h'.charCodeAt(0)
                                       : (nhfp.fnidx == C.exportascii)
                                         ? 'a'.charCodeAt(0)
                                         : '?'.charCodeAt(0);
        C.Sfo_char(nhfp, indicate, "indicate-format", 1);
        C.Sfo_char(nhfp, csc_count, "count-critical_sizes", 1);
        cnt = csc_count.value;
        for (i = 0; i < cnt; ++i) {
            C.Sfo_uchar(nhfp, C.criticalSizeRef(i), "critical_sizes");
        }
    }
}

/* this used to be based on file date and somewhat OS-dependent,
 *  but now examines the initial part of the file's contents.
 *
 * returns:
 *
 *   SF_UPTODATE                     (0) everything matched and looks good
 *   SF_OUTDATED                     (1) savefile is outdated
 *   SF_CRITICAL_BYTE_COUNT_MISMATCH (2) critical size count mismatch
 *   SF_DM_IL32LLP64_ON_ILP32LL64    (3) Windows x64 savefile on x86
 *   SF_DM_I32LP64_ON_ILP32LL64      (4) Unix 64 savefile on x86
 *   SF_DM_ILP32LL64_ON_I32LP64      (5) x86 savefile on Unix 64
 *   SF_DM_ILP32LL64_ON_IL32LLP64    (6) x86 savefile on Windows x64
 *   SF_DM_I32LP64_ON_IL32LLP64      (7) Unix 64 savefile on Windows x64
 *   SF_DM_IL32LLP64_ON_I32LP64      (8) Windows x64 savefile on Unix 64
 *   SF_DM_MISMATCH                  (9) some other mismatch
 */
export function uptodate(nhfp, name, utdflags)
{
    utdflags = C.ulong(utdflags);
    let vers_info = C.versionLocal(false);
    let indicator = C.charLocal();
    let sfstatus = 0, idx_1st_mismatch = C.intLocal();
    idx_1st_mismatch.value = 0;
    let quietly = (utdflags & C.UTD_QUIETLY) != 0;
    let verbose = name ? 1 : 0;

    C.Sfi_char(nhfp, indicator, "indicate-format", 1);
    if ((sfstatus = C.callLocal(compare_critical_bytes, nhfp, idx_1st_mismatch, utdflags))
                                                             != C.SF_UPTODATE) {
        if (sfstatus > 0 && idx_1st_mismatch.value) {
            if (!quietly)
                C.raw_printf("comparison of critical bytes mismatched at %d (%s).",
                           C.critical_sizes[idx_1st_mismatch.value].ucsize,
                           C.critical_sizes[idx_1st_mismatch.value].nm);
        }
    }

    C.Sfi_version_info(nhfp, vers_info, "version_info");
    if (!check_version(vers_info, name, verbose, utdflags)) {
        if (verbose) {
            if ((utdflags & C.UTD_WITHOUT_WAITSYNCH_PERFILE) == 0) {
                C.wait_synch();
            }
        }
        return C.SF_OUTDATED;
    }
    return sfstatus;
}

/*
 * returns:
 *
 *   SF_UPTODATE                     (0) everything matched and looks good
 *   SF_OUTDATED                     (1) savefile is outdated
 *   SF_CRITICAL_BYTE_COUNT_MISMATCH (2) critical size count mismatch
 *   SF_DM_IL32LLP64_ON_ILP32LL64    (3) Windows x64 savefile on x86
 *   SF_DM_I32LP64_ON_ILP32LL64      (4) Unix 64 savefile on x86
 *   SF_DM_ILP32LL64_ON_I32LP64      (5) x86 savefile on Unix 64
 *   SF_DM_ILP32LL64_ON_IL32LLP64    (6) x86 savefile on Windows x64
 *   SF_DM_I32LP64_ON_IL32LLP64      (7) Unix 64 savefile on Windows x64
 *   SF_DM_IL32LLP64_ON_I32LP64      (8) Windows x64 savefile on Unix 64
 *   SF_DM_MISMATCH                  (9) some other mismatch
 */
export function compare_critical_bytes(nhfp, idx_1st_mismatch, utdflags)
{
    utdflags = C.ulong(utdflags);
    let active_csc_count = C.char(C.critical_sizes.length),
        file_csc_count = C.charLocal();
    let i, cnt = active_csc_count,
        dmmismatch = C.SF_DM_MISMATCH;
    let quietly = (utdflags & C.UTD_QUIETLY) != 0;

    C.Sfi_char(nhfp, file_csc_count, "count-critical_sizes", 1);
    if (file_csc_count.value > cnt) {
        if (!quietly)
            C.raw_printf("critical byte counts do not match, file:%d, critical_sizes:%d.",
                       file_csc_count.value, C.critical_sizes.length);
        return C.SF_CRITICAL_BYTE_COUNT_MISMATCH;
    }
    for (i = 0; i < file_csc_count.value; ++i) {
        C.Sfi_uchar(nhfp, C.cscRef(i), "critical_sizes");
    }
    for (i = 1; i < cnt; ++i) {
        if (C.cscbuf[i] != C.critical_sizes[i].ucsize) {
            let dm = C.datamodel(0), dmfile;

            dmfile = C.what_datamodel_is_this(0,
                                            C.cscbuf[1],  /* short */
                                            C.cscbuf[2],  /* int */
                                            C.cscbuf[3],  /* long */
                                            C.cscbuf[4],  /* long long */
                                            C.cscbuf[5]); /* ptr */

            if (!C.strcmp(dmfile, "IL32LLP64") && !C.strcmp(dm, "ILP32LL64")) {
                /*  Windows x64 savefile on x86 */
                dmmismatch = C.SF_DM_IL32LLP64_ON_ILP32LL64;
            } else if (!C.strcmp(dmfile, "I32LP64")
                       && !C.strcmp(dm, "ILP32LL64")) {
                /* Unix 64 savefile on x86*/
                dmmismatch = C.SF_DM_I32LP64_ON_ILP32LL64;
            } else if (!C.strcmp(dmfile, "ILP32LL64")
                       && !C.strcmp(dm, "I32LP64")) {
                /*  x86 savefile on Unix 64 */
                dmmismatch = C.SF_DM_ILP32LL64_ON_I32LP64;
            } else if (!C.strcmp(dmfile, "ILP32LL64")
                       && !C.strcmp(dm, "IL32LLP64")) {
                /* x86 savefile on Windows x64 */
                dmmismatch = C.SF_DM_ILP32LL64_ON_IL32LLP64;
            } else if (!C.strcmp(dmfile, "I32LP64")
                       && !C.strcmp(dm, "IL32LLP64")) {
                /* Unix 64 savefile on Windows x64 */
                dmmismatch = C.SF_DM_I32LP64_ON_IL32LLP64;
            } else if (!C.strcmp(dmfile, "IL32LLP64")
                       && !C.strcmp(dm, "I32LP64")) {
                /* Windows x64 savefile on Unix 64 */
                dmmismatch = C.SF_DM_IL32LLP64_ON_I32LP64;
            }
            if (idx_1st_mismatch)
                idx_1st_mismatch.value = i;
            return dmmismatch;
        }
    }
    return C.SF_UPTODATE; /* everything matched */
}

/*
 * returns:
 *
 *   SF_UPTODATE                     (0) everything matched and looks good
 *   SF_OUTDATED                     (1) savefile is outdated
 *   SF_CRITICAL_BYTE_COUNT_MISMATCH (2) critical size count mismatch
 *   SF_DM_IL32LLP64_ON_ILP32LL64    (3) Windows x64 savefile on x86
 *   SF_DM_I32LP64_ON_ILP32LL64      (4) Unix 64 savefile on x86
 *   SF_DM_ILP32LL64_ON_I32LP64      (5) x86 savefile on Unix 64
 *   SF_DM_ILP32LL64_ON_IL32LLP64    (6) x86 savefile on Windows x64
 *   SF_DM_I32LP64_ON_IL32LLP64      (7) Unix 64 savefile on Windows x64
 *   SF_DM_IL32LLP64_ON_I32LP64      (8) Windows x64 savefile on Unix 64
 *   SF_DM_MISMATCH                  (9) some other mismatch
 */
export function validate(nhfp, name, without_waitsynch_perfile)
{
    without_waitsynch_perfile = C.boolean(without_waitsynch_perfile);
    let utdflags = 0n;
    let validsf = 0;

    if (nhfp.structlevel)
        utdflags |= C.UTD_CHECKSIZES;
    if (without_waitsynch_perfile)
        utdflags |= C.UTD_WITHOUT_WAITSYNCH_PERFILE;
    if (nhfp.fieldlevel)
        utdflags |= C.UTD_CHECKFIELDCOUNTS | C.UTD_SKIP_SANITY1;
    validsf = C.callLocal(uptodate, nhfp, name, utdflags);
    return validsf;
}
/* MINIMAL_FOR_RECOVER */

/*version.c*/
