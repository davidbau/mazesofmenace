import {C} from './dlb-library-scope.mjs';

/* NetHack 5.0	dlb.c	$NHDT-Date: 1596498157 2020/08/03 23:42:37 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.20 $ */
/* Copyright (c) Kenneth Lorber, Bethesda, Maryland, 1993. */
/* NetHack may be freely redistributed.  See license for details. */






/* see decl.h */


/*
 * Data librarian.  Present a STDIO-like interface to NetHack while
 * multiplexing on one or more "data libraries".  If a file is not found
 * in a given library, look for it outside the libraries.
 */





/* without extern.h via hack.h, these haven't been declared for us */


/* implementation will be in either dlb_main.c or the core */




/*
 * Library Implementation:
 *
 * When initialized, we open all library files and read in their tables
 * of contents.  The library files stay open all the time.  When
 * a open is requested, the libraries' directories are searched.  If
 * successful, we return a descriptor that contains the library, file
 * size, and current file mark.  This descriptor is used for all
 * successive calls.
 *
 * The ability to open more than one library is supported but used
 * only in the Amiga port (the second library holds the sound files).
 * For Unix, the idea would be to split the NetHack library
 * into text and binary parts, where the text version could be shared.
 */
















/* not static because shared with dlb_main.c */



/* without extern.h via hack.h, these haven't been declared for us */


/*
 * Read the directory out of the library.  Return 1 if successful,
 * 0 if it failed.
 *
 * NOTE: An improvement of the file structure should be the file
 * size as part of the directory entry or perhaps in place of the
 * offset -- the offset can be calculated by a running tally of
 * the sizes.
 *
 * Library file structure:
 *
 * HEADER:
 * %3ld library FORMAT revision (currently rev 1)
 * %1c  space
 * %8ld # of files in archive (includes 1 for directory)
 * %1c  space
 * %8ld size of allocation for string space for directory names
 * %1c  space
 * %8ld library offset - sanity check - lseek target for start of first file
 * %1c  space
 * %8ld size - sanity check - byte size of complete archive file
 *
 * followed by one DIRECTORY entry for each file in the archive, including
 *  the directory itself:
 * %1c  handling information (compression, etc.)  Always ' ' in rev 1.
 * %s   file name
 * %1c  space
 * %8ld offset in archive file of start of this file
 * %c   newline
 *
 * followed by the contents of the files
 */
/* min library version readable by this code */
/* max library version readable by this code */

/*
 * Read the directory from the library file.   This will allocate and
 * fill in our globals.  The file pointer is reset back to position
 * zero.  If any part fails, leave nothing that needs to be deallocated.
 *
 * Return TRUE on success, FALSE on failure.
 */
export function readlibdir(lp) /* library pointer to fill in */
{
    let i;
    let sp;
    let liboffset = C.local('long'), totalsize = C.local('long');

    if (C.fscanf(lp.fdata, "%ld %ld %ld %ld %ld\n", C.ref(lp, 'rev'), C.ref(lp, 'nentries'),
               C.ref(lp, 'strsize'), liboffset, totalsize) != 5)
        return 0;
    if (lp.rev > 1 || lp.rev < 1)
        return 0;

    lp.dir = C.directory(C.alloc(C.FITSuint(C.ulong(lp.nentries * BigInt(C.layout.sizeof_libdir)), 139)));
    lp.sspace = C.alloc(C.FITSuint(C.ulong(lp.strsize), 140));

    /* read in each directory entry */
    for (i = 0, sp = lp.sspace; i < lp.nentries; i++) {
        lp.dir[i].fname = sp;
        if (C.fscanf(lp.fdata, "%c%s %ld\n", C.ref(lp.dir[i], 'handling'), sp,
                   C.ref(lp.dir[i], 'foffset')) != 3) {
            C.free(lp.dir);
            C.free(lp.sspace);
            lp.dir = 0;
            lp.sspace = 0;
            return 0;
        }
        sp = C.ptrAdd(C.eos(sp), 1);
    }

    /* calculate file sizes using offset information */
    for (i = 0; i < lp.nentries; i++) {
        if (i == lp.nentries - 1n)
            lp.dir[i].fsize = totalsize.value - lp.dir[i].foffset;
        else
            lp.dir[i].fsize = lp.dir[i + 1].foffset - lp.dir[i].foffset;
    }

    C.fseek(lp.fdata, 0n, C.SEEK_SET); /* reset back to zero */
    lp.fmark = 0;

    return 1;
}

/*
 * Look for the file in our directory structure.  Return 1 if successful,
 * 0 if not found.  Fill in the size and starting position.
 */
export function find_file(name, lib, startp, sizep)
{
    let i, j;
    let lp;

    for (i = 0; i < 4 && C.dlb_libs[i].fdata; i++) {
        lp = C.dlb_libs[i];
        for (j = 0; j < lp.nentries; j++) {
            if (C.FILENAME_CMP(name, lp.dir[j].fname) == 0) {
                lib.value = lp;
                startp.value = lp.dir[j].foffset;
                sizep.value = lp.dir[j].fsize;
                return 1;
            }
        }
    }
    lib.value = 0;
    startp.value = sizep.value = 0n;
    return 0;
}

/*
 * Open the library of the given name and fill in the given library
 * structure.  Return TRUE if successful, FALSE otherwise.
 */
export function open_library(lib_name, lp)
{
    let status = 0;

    lp.fdata = C.fopen_datafile(lib_name, C.RDBMODE, 4);
    if (lp.fdata) {
        if (C.callLocal(readlibdir, lp)) {
            status = 1;
        } else {
            C.fclose(lp.fdata);
            lp.fdata = 0;
        }
    }
    return status;
}

export function close_library(lp)
{
    C.fclose(lp.fdata);
    C.free(lp.dir);
    C.free(lp.sspace);

    C.memset(lp, 0, C.layout.sizeof_library);
}

/*
 * Open the library file once using stdio.  Keep it open, but
 * keep track of the file position.
 */
export function lib_dlb_init()
{
    /* zero out array */
    C.memset(C.dlb_libs[0], 0, C.dlb_libs.byteLength);

    /* To open more than one library, add open library calls here. */
    if (!open_library(C.DLBFILE, C.dlb_libs[0]))
        return 0;

    return 1;
}

export function lib_dlb_cleanup()
{
    let i;

    /* close the data file(s) */
    for (i = 0; i < 4 && C.dlb_libs[i].fdata; i++)
        close_library(C.dlb_libs[i]);
}



/*ARGSUSED*/
export function lib_dlb_fopen(dp, name, mode)
{
    let start = C.local('long'), size = C.local('long');
    let lp = C.local('library *');

    /* look up file in directory */
    if (find_file(name, lp, start, size)) {
        dp.lib = lp.value;
        dp.start = start.value;
        dp.size = size.value;
        dp.mark = 0;
        return 1;
    }

    return 0; /* failed */
}

/*ARGUSED*/
export function lib_dlb_fclose(dp)
{
    /* nothing needs to be done */
    return 0;
}

export function lib_dlb_fread(buf, size, quan, dp)
{
    let pos, nread, nbytes;

    /* make sure we don't read into the next file */
    if ((dp.size - dp.mark) < (size * quan))
        quan = C.int((dp.size - dp.mark) / BigInt(size));
    if (quan == 0)
        return 0;

    pos = C.long(dp.start + dp.mark);
    if (dp.lib.fmark != pos) {
        C.fseek(dp.lib.fdata, pos, C.SEEK_SET); /* check for error??? */
        dp.lib.fmark = pos;
    }

    nread = C.fread(buf, size, quan, dp.lib.fdata);
    nbytes = C.long(nread * BigInt(size));
    dp.mark = C.long(dp.mark + nbytes);
    dp.lib.fmark += nbytes;

    return C.int(nread);
}

export function lib_dlb_fseek(dp, pos, whence)
{
    let curpos;

    switch (whence) {
    case C.SEEK_CUR:
        curpos = C.long(dp.mark + pos);
        break;
    case C.SEEK_END:
        curpos = C.long(dp.size - pos);
        break;
    default: /* set */
        curpos = pos;
        break;
    }
    if (curpos < 0)
        curpos = 0;
    if (curpos > dp.size)
        curpos = dp.size;

    dp.mark = curpos;
    return 0;
}

export function lib_dlb_fgets(buf, len, dp)
{
    let i;
    let bp, c = 0;

    if (len <= 0)
        return buf; /* sanity check */

    /* return NULL on EOF */
    if (dp.mark >= dp.size)
        return 0;

    len--; /* save room for null */
    for (i = 0, bp = buf; i < len && dp.mark < dp.size && c != 10;
         i++, bp = C.ptrAdd(bp, 1)) {
        if (dlb_fread(bp, 1, 1, dp) <= 0)
            break; /* EOF or error */
        c = C.loadChar(bp);
    }
    C.storeChar(bp, 0);



    return buf;
}

export function lib_dlb_fgetc(dp)
{
    let c = C.local('char');

    if (lib_dlb_fread(c.address, 1, 1, dp) != 1)
        return C.EOF;
    return c.value;
}

export function lib_dlb_ftell(dp)
{
    return dp.mark;
}

export const lib_dlb_procs = {
    dlb_init_proc: lib_dlb_init,
    dlb_cleanup_proc: lib_dlb_cleanup,
    dlb_fopen_proc: lib_dlb_fopen,
    dlb_fclose_proc: lib_dlb_fclose,
    dlb_fread_proc: lib_dlb_fread,
    dlb_fseek_proc: lib_dlb_fseek,
    dlb_fgets_proc: lib_dlb_fgets,
    dlb_fgetc_proc: lib_dlb_fgetc,
    dlb_ftell_proc: lib_dlb_ftell
};

/* DLBLIB */



/* Global wrapper functions ------------------------------------------------
 */














export function dlb_init()
{
    if (!C.dlb_initialized) {

        C.dlb_procs = lib_dlb_procs;



        if (C.dlb_procs)
            C.dlb_initialized = C.dlb_procs.dlb_init_proc();
    }

    return C.dlb_initialized;
}

export function dlb_cleanup()
{
    if (C.dlb_initialized) {
        C.dlb_procs.dlb_cleanup_proc();
        C.dlb_initialized = 0;
    }
}

export function dlb_fopen(name, mode)
{
    let fp;
    let dp;

    if (!C.dlb_initialized)
        return 0;

    /* only support reading; ignore possible binary flag */
    if (!mode || C.loadChar(mode) != 114)
        return 0;

    dp = C.handle(C.alloc(C.layout.sizeof_dlb));
    if (C.callLocal(C.dlb_procs.dlb_fopen_proc, dp, name, mode))
        dp.fp = 0;
    else if ((fp = C.fopen_datafile(name, mode, 4)) != 0)
        dp.fp = fp;
    else {
        /* can't find anything */
        C.free(dp);
        dp = 0;
    }

    return dp;
}

export function dlb_fclose(dp)
{
    let ret = 0;

    if (C.dlb_initialized) {
        if (dp.fp)
            ret = C.fclose(dp.fp);
        else
            ret = C.dlb_procs.dlb_fclose_proc(dp);

        C.free(dp);
    }
    return ret;
}

export function dlb_fread(buf, size, quan, dp)
{
    if (!C.dlb_initialized || size <= 0 || quan <= 0)
        return 0;
    if (dp.fp)
        return C.int(C.fread(buf, size, quan, dp.fp));
    return C.dlb_procs.dlb_fread_proc(buf, size, quan, dp);
}

export function dlb_fseek(dp, pos, whence)
{
    if (!C.dlb_initialized)
        return C.EOF;
    if (dp.fp)
        return C.fseek(dp.fp, pos, whence);
    return C.dlb_procs.dlb_fseek_proc(dp, pos, whence);
}

export function dlb_fgets(buf, len, dp)
{
    if (!C.dlb_initialized)
        return 0;
    if (dp.fp)
        return C.fgets(buf, len, dp.fp);
    return C.dlb_procs.dlb_fgets_proc(buf, len, dp);
}

export function dlb_fgetc(dp)
{
    if (!C.dlb_initialized)
        return C.EOF;
    if (dp.fp)
        return C.fgetc(dp.fp);
    return C.callLocal(C.dlb_procs.dlb_fgetc_proc, dp);
}

export function dlb_ftell(dp)
{
    if (!C.dlb_initialized)
        return 0;
    if (dp.fp)
        return C.ftell(dp.fp);
    return C.dlb_procs.dlb_ftell_proc(dp);
}

/* DLB */

/*dlb.c*/
