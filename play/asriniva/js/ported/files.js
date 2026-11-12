import { C } from '../c-runtime/context.js';
/* NetHack 5.0	files.c	$NHDT-Date: 1740532826 2025/02/25 17:20:26 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.417 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Derek S. Ray, 2015. */
/* NetHack may be freely redistributed.  See license for details. */
/* SFCTOOL */
/* more() */
/* MSC 6.0 defines errno quite differently */
/* RLC 09 Mar 1999: Support internal ZLIB */
/* used for micros, no-op for others */
/* see sys/amiga/amidos.c */
/*from windsys.c */
/* SFCTOOL */
/* SFCTOOL */
/* in extern.h; why here too? */
/* !SFCTOOL */
/* return a file's name without its path and optionally trailing 'type' */
export function nh_basename(fname,keep_suffix)
{
    fname=C.ptr(fname);
    keep_suffix=C.i8(keep_suffix);
    
    let p;
    if(Number(((p=C.strrchr(fname,47)))!=0)) (fname=(p+Number(1)*1));
    if(Number(!!(Number(((p=C.strrchr(fname,46)))!=0)&&Number(!(keep_suffix))))) {
        let ln=C.u64((C.i64(((p-fname)/1))));
        /* note that without path, name should be reasonable length;
           it is expected to refer to a source file name or run-time
           configuration file name and those aren't arbitrarily long;
           if "name" part of "name.suffix" is too long for 'basebuf[]',
           just return that as-is without stripping off ".suffix" */
        if(Number(ln<BigInt((1*80)))) {
            C.strncpy(C.staticAddress("nh_basename.basebuf"),fname,ln);
            (C.cell((C.staticAddress("nh_basename.basebuf")+Number(ln)*1),"char").value=C.i8(0));
            (fname=C.staticAddress("nh_basename.basebuf"));
        }
    }
    /* VMS */
    return fname;
}

/*
 * fname_encode()
 *
 *   Args:
 *      legal       zero-terminated list of acceptable file name characters
 *      quotechar   lead-in character used to quote illegal characters as
 *                  hex digits
 *      s           string to encode
 *      callerbuf   buffer to house result
 *      bufsz       size of callerbuf
 *
 *   Notes:
 *      The hex digits 0-9 and A-F are always part of the legal set due to
 *      their use in the encoding scheme, even if not explicitly included in
 *      'legal'.
 *
 *   Sample:
 *      The following call:
 * (void) fname_encode("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
 *                     '%', "This is a % test!", buf, 512);
 *      results in this encoding:
 *          "This%20is%20a%20%25%20test%21"
 */
export function fname_encode(legal,quotechar,s,callerbuf,bufsz)
{
    legal=C.ptr(legal);
    quotechar=C.i8(quotechar);
    s=C.ptr(s);
    callerbuf=C.ptr(callerbuf);
    bufsz=C.i32(bufsz);
    let sp; let op;
    let cnt=0;
    
    (sp=s);
    (op=callerbuf);
    (C.cell(op,"char").value=C.i8(0));
    while(C.cell(sp,"char").value) {
        /* Do we have room for one more character or encoding? */
        if(Number((C.i32((bufsz-cnt)))<=4)) return callerbuf;
        if(Number(C.i32(C.cell(sp,"char").value)==C.i32(quotechar))) {
            C.variadic(0,op,C.literal("%c%02X"),C.i32(quotechar),C.i32(C.cell(sp,"char").value));
            (op=C.ptr(op+Number(3)*1));
            (cnt=C.i32(cnt+3));
        } else if(Number(!!((Number(C.strchr(legal,C.i32(C.cell(sp,"char").value))!=0))||(Number(C.strchr(C.staticAddress("fname_encode.hexdigits"),C.i32(C.cell(sp,"char").value))!=0))))) {
            (C.cell(((op=C.ptr((op+Number(1))))-Number(1)),"char").value=C.cell(sp,"char").value);
            (C.cell(op,"char").value=C.i8(0));
            ((cnt=C.i32((cnt+1)))-1);
        } else {
            C.variadic(1,op,C.literal("%c%02X"),C.i32(quotechar),C.i32(C.cell(sp,"char").value));
            (op=C.ptr(op+Number(3)*1));
            (cnt=C.i32(cnt+3));
        }
        ((sp=C.ptr((sp+Number(1))))-Number(1));
    }
    return callerbuf;
}

/*
 * fname_decode()
 *
 *   Args:
 *      quotechar   lead-in character used to quote illegal characters as
 *                  hex digits
 *      s           string to decode
 *      callerbuf   buffer to house result
 *      bufsz       size of callerbuf
 */
export function fname_decode(quotechar,s,callerbuf,bufsz)
{
    quotechar=C.i8(quotechar);
    s=C.ptr(s);
    callerbuf=C.ptr(callerbuf);
    bufsz=C.i32(bufsz);
    let sp; let op;
    let k; let calc; let cnt=0;
    
    (sp=s);
    (op=callerbuf);
    (C.cell(op,"char").value=C.i8(0));
    while(C.cell(sp,"char").value) {
        /* Do we have room for one more character? */
        if(Number((C.i32((bufsz-cnt)))<=2)) return callerbuf;
        if(Number(C.i32(C.cell(sp,"char").value)==C.i32(quotechar))) {
            ((sp=C.ptr((sp+Number(1))))-Number(1));
            for((k=0);Number(k<16);(k=C.i32((k+1)))) if(Number(C.i32(C.cell(sp,"char").value)==C.i32(C.cell((C.staticAddress("fname_decode.hexdigits")+Number(k)*1),"char").value))) break;

            if(Number(k>=16)) return callerbuf;
            /* impossible, so bail */
            (calc=C.i32((k<<4)));
            ((sp=C.ptr((sp+Number(1))))-Number(1));
            for((k=0);Number(k<16);(k=C.i32((k+1)))) if(Number(C.i32(C.cell(sp,"char").value)==C.i32(C.cell((C.staticAddress("fname_decode.hexdigits")+Number(k)*1),"char").value))) break;

            if(Number(k>=16)) return callerbuf;
            /* impossible, so bail */
            (calc=C.i32(calc+k));
            ((sp=C.ptr((sp+Number(1))))-Number(1));
            (C.cell(((op=C.ptr((op+Number(1))))-Number(1)),"char").value=C.i8(calc));
            (C.cell(op,"char").value=C.i8(0));
        } else {
            (C.cell(((op=C.ptr((op+Number(1))))-Number(1)),"char").value=C.cell(((sp=C.ptr((sp+Number(1))))-Number(1)),"char").value);
            (C.cell(op,"char").value=C.i8(0));
        }
        ((cnt=C.i32((cnt+1)))-1);
    }
    return callerbuf;
}

/*empty*/
/*ARGSUSED*/
export function fqname(basenam,whichprefix,buffnum)
{
    basenam=C.ptr(basenam);
    whichprefix=C.i32(whichprefix);
    buffnum=C.i32(buffnum);
    return basenam;
    /* XXX */
    /* !PREFIXES_IN_USE */
}

/* reasonbuf must be at least BUFSZ, supplied by caller */
export function validate_prefix_locations(reasonbuf)
{
    reasonbuf=C.ptr(reasonbuf);
    if(reasonbuf) (C.cell((reasonbuf+Number(0)*1),"char").value=C.i8(0));
    /* don't test writing to configdir or datadir; they're readonly */
    /* the paniclog entry gets the value of errno as well */
    return 1;
}

/* fopen a file, with OS-dependent bells and whistles */
/* NOTE: a simpler version of this routine also exists in util/dlb_main.c */
export function fopen_datafile(filename,mode,prefix)
{
    filename=C.ptr(filename);
    mode=C.ptr(mode);
    prefix=C.i32(prefix);
    let fp;
    (filename=fqname(filename,prefix,(Number(prefix==9)?3:0)));
    (fp=C.fopen(filename,mode));
    return fp;
}

/* !SFCTOOL */
/* ----------  EXTERNAL FILE SUPPORT ----------- */
/* determine byte order */
export function init_nhfile(nhfp)
{
    nhfp=C.ptr(nhfp);
    if(C.field(nhfp,"nh_file","structlevel").value) {
        if(Number(C.field(nhfp,"nh_file","fd").value!=C.i32((-1)))) {
            C.variadic(2,C.literal("Warning - Unclosed structlevel file being reinitialized"));
            nhclose(C.field(nhfp,"nh_file","fd").value);
        }
    } else if(C.field(nhfp,"nh_file","fpdef").value) {
        if(C.field(nhfp,"nh_file","fpdef").value) {
            C.variadic(3,C.literal("Warning - Unclosed fieldlevel file being reinitialized"));
            C.fclose(C.field(nhfp,"nh_file","fpdef").value);
        }
    }
    (C.field(nhfp,"nh_file","fd").value=C.i32((-1)));
    (C.field(nhfp,"nh_file","fpdef").value=0);
    (C.field(nhfp,"nh_file","mode").value=1);
    (C.field(nhfp,"nh_file","structlevel").value=C.i8(1));
    (C.field(nhfp,"nh_file","fieldlevel").value=C.i8(0));
    (C.field(nhfp,"nh_file","addinfo").value=C.i8(0));
    (C.field(nhfp,"nh_file","bendian").value=C.i8((Number(C.i32((C.cell(C.staticAddress("bei"),"char").value))==0))));
    (C.field(nhfp,"nh_file","fplog").value=0);
    (C.field(nhfp,"nh_file","fpdebug").value=0);
    (C.field(nhfp,"nh_file","rcount").value=(C.field(nhfp,"nh_file","wcount").value=C.i64(0)));
    (C.field(nhfp,"nh_file","eof").value=C.i8(0));
    (C.field(nhfp,"nh_file","fnidx").value=0);
    (C.field(C.field(nhfp,"nh_file","style").address,"fieldlevel_content","deflt").value=C.i8(0));
    (C.field(C.field(nhfp,"nh_file","style").address,"fieldlevel_content","binary").value=C.i8(1));
    (C.field(nhfp,"nh_file","nhfpconvert").value=0);
}

export function new_nhfile()
{
    let nhfp=C.alloc(C.u32(BigInt(C.sizes["struct nh_file"])));
    C.memset(nhfp,0,BigInt(C.sizes["struct nh_file"]));
    init_nhfile(nhfp);
    return nhfp;
}

export function free_nhfile(nhfp)
{
    nhfp=C.ptr(nhfp);
    if(nhfp) {
        init_nhfile(nhfp);
        C.free(nhfp);
    }
}

export function close_nhfile(nhfp)
{
    nhfp=C.ptr(nhfp);
    if(Number(!!(C.i32(C.field(nhfp,"nh_file","structlevel").value)&&Number(C.field(nhfp,"nh_file","fd").value!=C.i32((-1)))))) (nhclose(C.field(nhfp,"nh_file","fd").value),(C.field(nhfp,"nh_file","fd").value=C.i32((-1))));
 else if(C.field(nhfp,"nh_file","fpdef").value) (C.fclose(C.field(nhfp,"nh_file","fpdef").value),(C.field(nhfp,"nh_file","fpdef").value=0));
    if(C.field(nhfp,"nh_file","fplog").value) C.variadic(4,C.field(nhfp,"nh_file","fplog").value,C.literal("# closing\n"));
    if(C.field(nhfp,"nh_file","fplog").value) C.fclose(C.field(nhfp,"nh_file","fplog").value);
    if(C.field(nhfp,"nh_file","fpdebug").value) C.fclose(C.field(nhfp,"nh_file","fpdebug").value);
    free_nhfile(nhfp);
}

export function rewind_nhfile(nhfp)
{
    nhfp=C.ptr(nhfp);
    if(C.field(nhfp,"nh_file","structlevel").value) {
        C.lseek(C.field(nhfp,"nh_file","fd").value,C.i64(0),0);
    } else {
        C.rewind(C.field(nhfp,"nh_file","fpdef").value);
    }
}

export function viable_nhfile(nhfp)
{
    nhfp=C.ptr(nhfp);
    /* perform some sanity checks before returning
       the pointer to the nethack file descriptor */
    if(nhfp) {
        /* check for no open file at all,
          * not a structlevel legacy file,
          * nor a fieldlevel file.
          */
        if(Number(!!(Number(!!((Number(!!((Number(C.field(nhfp,"nh_file","fd").value==C.i32((-1))))&&Number(!(C.field(nhfp,"nh_file","fpdef").value)))))||(Number(!!(C.i32(C.field(nhfp,"nh_file","structlevel").value)&&Number(C.field(nhfp,"nh_file","fd").value<0))))))||(Number(!!(C.i32(C.field(nhfp,"nh_file","fieldlevel").value)&&Number(!(C.field(nhfp,"nh_file","fpdef").value)))))))) {
            /* not viable, start the cleanup */
            if(C.field(nhfp,"nh_file","fieldlevel").value) {
                if(C.field(nhfp,"nh_file","fpdef").value) {
                    C.fclose(C.field(nhfp,"nh_file","fpdef").value);
                    (C.field(nhfp,"nh_file","fpdef").value=0);
                }
                if(C.field(nhfp,"nh_file","fplog").value) {
                    C.variadic(5,C.field(nhfp,"nh_file","fplog").value,C.literal("# closing, not viable\n"));
                    C.fclose(C.field(nhfp,"nh_file","fplog").value);
                }
                if(C.field(nhfp,"nh_file","fpdebug").value) C.fclose(C.field(nhfp,"nh_file","fpdebug").value);
            }
            free_nhfile(nhfp);
            (nhfp=0);
        }
    }
    return nhfp;
}

/* !SFCTOOL */
export function nhclose(fd)
{
    fd=C.i32(fd);
    let retval=0;
    if(Number(fd>=0)) {
        if(C.close_check(fd)) C.bclose(fd);
 else (retval=C.close(fd));
    }
    return retval;
}

/* ----------  BEGIN LEVEL FILE HANDLING ----------- */
/* Construct a file name for a level-type file, which is of the form
 * something.level (with any old level stripped off).
 * This assumes there is space on the end of 'file' to append
 * a two digit number.  This is true for 'level'
 * but be careful if you use it for other things -dgk
 */
export function set_levelfile_name(file,lev)
{
    file=C.ptr(file);
    lev=C.i32(lev);
    let tf;
    (tf=C.strrchr(file,46));
    if(Number(!(tf))) (tf=C.eos(file));
    C.variadic(6,tf,C.literal(".%d"),lev);
    return;
}

export function create_levelfile(lev,errbuf)
{
    lev=C.i32(lev);
    errbuf=C.ptr(errbuf);
    let fq_lock;
    let nhfp=0;
    if(errbuf) (C.cell(errbuf,"char").value=C.i8(0));
    set_levelfile_name(C.field(C.gl,"instance_globals_l","lock").address,lev);
    (fq_lock=fqname(C.field(C.gl,"instance_globals_l","lock").address,1,0));
    (nhfp=new_nhfile());
    if(nhfp) {
        (C.field(nhfp,"nh_file","ftype").value=1);
        (C.field(nhfp,"nh_file","mode").value=2);
        (C.field(nhfp,"nh_file","structlevel").value=C.i8(1));
        /* do set this TRUE for levelfiles */
        (C.field(nhfp,"nh_file","fieldlevel").value=C.i8(0));
        /* don't set this TRUE for levelfiles */
        (C.field(nhfp,"nh_file","addinfo").value=C.i8(0));
        (C.field(C.field(nhfp,"nh_file","style").address,"fieldlevel_content","deflt").value=C.i8(0));
        (C.field(C.field(nhfp,"nh_file","style").address,"fieldlevel_content","binary").value=C.i8(1));
        (C.field(nhfp,"nh_file","fnidx").value=C.historical);
        (C.field(nhfp,"nh_file","fd").value=C.i32((-1)));
        (C.field(nhfp,"nh_file","fpdef").value=0);
        /* Use O_TRUNC to force the file to be shortened if it already
         * exists and is currently longer.
         */
        (C.field(nhfp,"nh_file","fd").value=C.creat(fq_lock,C.u32(432)));
        /* MICRO || WIN32 */
        if(Number(C.field(nhfp,"nh_file","fd").value>=0)) (C.field((C.field(C.svl,"instance_globals_saved_l","level_info").address+Number(lev)*C.sizes["struct linfo"]),"linfo","flags").value=C.u8(C.i32(C.field((C.field(C.svl,"instance_globals_saved_l","level_info").address+Number(lev)*C.sizes["struct linfo"]),"linfo","flags").value)|4));
 else if(errbuf) C.variadic(7,errbuf,C.literal("Cannot create file \"%s\" for level %d (errno %d)."),C.field(C.gl,"instance_globals_l","lock").address,lev,(C.cell(C.__errno_location(),"int").value));
        /* failure explanation */
    }
    (nhfp=viable_nhfile(nhfp));
    return nhfp;
}

export function open_levelfile(lev,errbuf)
{
    lev=C.i32(lev);
    errbuf=C.ptr(errbuf);
    let fq_lock;
    let nhfp=0;
    if(errbuf) (C.cell(errbuf,"char").value=C.i8(0));
    set_levelfile_name(C.field(C.gl,"instance_globals_l","lock").address,lev);
    (fq_lock=fqname(C.field(C.gl,"instance_globals_l","lock").address,1,0));
    (nhfp=new_nhfile());
    if(nhfp) {
        (C.field(nhfp,"nh_file","mode").value=0);
        (C.field(nhfp,"nh_file","structlevel").value=C.i8(1));
        /* do set this TRUE for levelfiles */
        (C.field(nhfp,"nh_file","fieldlevel").value=C.i8(0));
        /* do not set this TRUE for levelfiles */
        (C.field(nhfp,"nh_file","addinfo").value=C.i8(0));
        (C.field(C.field(nhfp,"nh_file","style").address,"fieldlevel_content","deflt").value=C.i8(0));
        (C.field(C.field(nhfp,"nh_file","style").address,"fieldlevel_content","binary").value=C.i8(1));
        (C.field(nhfp,"nh_file","ftype").value=1);
        (C.field(nhfp,"nh_file","fnidx").value=C.historical);
        (C.field(nhfp,"nh_file","fd").value=C.i32((-1)));
        (C.field(nhfp,"nh_file","fpdef").value=0);
    }
    if(Number(!!(nhfp&&C.i32(C.field(nhfp,"nh_file","structlevel").value)))) {
        (C.field(nhfp,"nh_file","fd").value=C.variadic(8,fq_lock,C.i32((0|0)),0));
        /* for failure, return an explanation that our caller can use;
           settle for `lock' instead of `fq_lock' because the latter
           might end up being too big for nethack's BUFSZ */
        if(Number(!!(Number(C.field(nhfp,"nh_file","fd").value<0)&&errbuf))) C.variadic(9,errbuf,C.literal("Cannot open file \"%s\" for level %d (errno %d)."),C.field(C.gl,"instance_globals_l","lock").address,lev,(C.cell(C.__errno_location(),"int").value));
    }
    (nhfp=viable_nhfile(nhfp));
    return nhfp;
}

export function delete_levelfile(lev)
{
    lev=C.i32(lev);
    /*
     * Level 0 might be created by port specific code that doesn't
     * call create_levfile(), so always assume that it exists.
     */
    if(Number(!!(Number(lev==0)||(C.i32((C.i32(C.field((C.field(C.svl,"instance_globals_saved_l","level_info").address+Number(lev)*C.sizes["struct linfo"]),"linfo","flags").value)&4)))))) {
        set_levelfile_name(C.field(C.gl,"instance_globals_l","lock").address,lev);
        C.unlink(fqname(C.field(C.gl,"instance_globals_l","lock").address,1,0));
        (C.field((C.field(C.svl,"instance_globals_saved_l","level_info").address+Number(lev)*C.sizes["struct linfo"]),"linfo","flags").value=C.u8(C.i32(C.field((C.field(C.svl,"instance_globals_saved_l","level_info").address+Number(lev)*C.sizes["struct linfo"]),"linfo","flags").value)&C.i32((~4))));
    }
}

export function clearlocks()
{
    let x;
    if(C.field(C.program_state,"sinfo","preserve_locks").value) return;
    C.teleport_native_signal(2,(C.ptr(1)));
    C.sethanguphandler((C.ptr(1)));
    /* NO_SIGNAL */
    /* can't access maxledgerno() before dungeons are created -dlc */
    for((x=((C.field(C.svn,"instance_globals_saved_n","n_dgns").value?C.i32(C.maxledgerno()):0)));Number(x>=0);((x=C.i32((x-1)))+1)) delete_levelfile(x);

    /* not all levels need be present */
}

/* qsort comparison routine */
export function strcmp_wrap(p,q)
{
    p=C.ptr(p);
    q=C.ptr(q);
    return C.strcmp(C.cell(p,"char *").value,C.cell(q,"char *").value);
}

/* ----------  END LEVEL FILE HANDLING ----------- */
/* ----------  BEGIN BONES FILE HANDLING ----------- */
/* set up "file" to be file name for retrieving bones, and return a
 * bonesid to be read/written in the bones file.
 */
export function set_bonesfile_name(file,lev)
{
    file=C.ptr(file);
    lev=C.ptr(lev);
    let sptr;
    let dptr;
    /*
     * "bonD0.nn"   = bones for level nn in the main dungeon;
     * "bonM0.T"    = bones for Minetown;
     * "bonQBar.n"  = bones for level n in the Barbarian quest;
     * "bon3D0.nn"  = \
     * "bon3M0.T"   =  > same as above, but for bones pool #3.
     * "bon3QBar.n" = /
     *
     * Return value for content validation skips "bon" and the
     * pool number (if present), making it feasible for the admin
     * to manually move a bones file from one pool to another by
     * renaming it.
     */
    C.strcpy(file,C.literal("bon"));
    if(Number(C.field(C.sysopt,"sysopt_s","bones_pools").value>1)) {
        let poolnum=((Number((C.u32(C.field(C.sysopt,"sysopt_s","bones_pools").value))<C.u32((10)))?(C.u32(C.field(C.sysopt,"sysopt_s","bones_pools").value)):C.u32((10))));
        (poolnum=C.u32((C.u32(C.global("ubirthday").value)%poolnum)));
        /* 0..9 */
        C.variadic(10,C.eos(file),C.literal("%u"),poolnum);
    }
    (dptr=C.eos(file));
    /* when this naming scheme was adopted, 'filecode' was one letter;
       3.3.0 turned it into a three letter string for quest levels */
    C.variadic(11,dptr,C.literal("%c%s"),C.i32(C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(C.field(lev,"d_level","dnum").value)*C.sizes["struct dungeon"]),"dungeon","boneid").value),(C.i32(C.In_quest(lev))?C.field(C.field(C.gu,"instance_globals_u","urole").address,"Role","filecode").value:C.literal("0")));
    if(Number(((sptr=C.Is_special(lev)))!=0)) C.variadic(12,C.eos(dptr),C.literal(".%c"),C.i32(C.field(sptr,"s_level","boneid").value));
 else C.variadic(13,C.eos(dptr),C.literal(".%d"),C.i32(C.field(lev,"d_level","dlevel").value));
    return dptr;
}

/* set up temporary file name for writing bones, to avoid another game's
 * trying to read from an uncompleted bones file.  we want an uncontentious
 * name, so use one in the namespace reserved for this game's level files.
 * (we are not reading or writing level files while writing bones files, so
 * the same array may be used instead of copying.)
 */
export function set_bonestemp_name()
{
    let tf;
    (tf=C.strrchr(C.field(C.gl,"instance_globals_l","lock").address,46));
    if(Number(!(tf))) (tf=C.eos(C.field(C.gl,"instance_globals_l","lock").address));
    C.variadic(14,tf,C.literal(".bn"));
    return C.field(C.gl,"instance_globals_l","lock").address;
}

export function create_bonesfile(lev,bonesid,errbuf)
{
    lev=C.ptr(lev);
    bonesid=C.ptr(bonesid);
    errbuf=C.ptr(errbuf);
    let file;
    let nhfp=0;
    let failed=0;
    if(errbuf) (C.cell(errbuf,"char").value=C.i8(0));
    (C.cell(bonesid,"char *").value=set_bonesfile_name(C.field(C.gb,"instance_globals_b","bones").address,lev));
    (file=set_bonestemp_name());
    (file=fqname(file,3,0));
    (nhfp=new_nhfile());
    if(nhfp) {
        (C.field(nhfp,"nh_file","ftype").value=3);
        (C.field(nhfp,"nh_file","mode").value=2);
        (C.field(nhfp,"nh_file","structlevel").value=C.i8(1));
        (C.field(nhfp,"nh_file","fieldlevel").value=C.i8(0));
        (C.field(nhfp,"nh_file","addinfo").value=C.i8(1));
        (C.field(C.field(nhfp,"nh_file","style").address,"fieldlevel_content","deflt").value=C.i8(1));
        (C.field(C.field(nhfp,"nh_file","style").address,"fieldlevel_content","binary").value=C.i8(1));
        (C.field(nhfp,"nh_file","fnidx").value=C.historical);
        (C.field(nhfp,"nh_file","fd").value=C.i32((-1)));
        (C.field(nhfp,"nh_file","fpdef").value=0);
        if(C.field(nhfp,"nh_file","fpdef").value) {
        } else {
            (failed=(C.cell(C.__errno_location(),"int").value));
        }
        if(C.field(nhfp,"nh_file","structlevel").value) {
            /* Use O_TRUNC to force the file to be shortened if it already
             * exists and is currently longer.
             */
            /* ?MICRO || WIN32 */
            /* implies UNIX or MACOS9 (MACOS9 is for OS9 or earlier) */
            (C.field(nhfp,"nh_file","fd").value=C.creat(file,C.u32(432)));
            /* ?MACOS9 */
            /* ?MICRO || WIN32 */
            if(Number(C.field(nhfp,"nh_file","fd").value<0)) (failed=(C.cell(C.__errno_location(),"int").value));
        }
        if(Number(!!(failed&&errbuf))) C.variadic(15,errbuf,C.literal("Cannot create bones \"%s\", id %s (errno %d)."),C.field(C.gl,"instance_globals_l","lock").address,C.cell(bonesid,"char *").value,(C.cell(C.__errno_location(),"int").value));
        /* failure explanation */
    }
    /*
       Re-protect bones file with world:read+write+execute+delete access.
       umask() doesn't seem very reliable; also, vaxcrtl won't let us set
       delete access without write access, which is what's really wanted.
       Can't simply create it with the desired protection because creat
       ANDs the mask with the user's default protection, which usually
       denies some or all access to world.
     */
    /* allow other users full access */
    /* VMS && !SECURE */
    (nhfp=viable_nhfile(nhfp));
    return nhfp;
}

/* move completed bones file to proper name */
export function commit_bonesfile(lev)
{
    lev=C.ptr(lev);
    let fq_bones; let tempname;
    let ret;
    set_bonesfile_name(C.field(C.gb,"instance_globals_b","bones").address,lev);
    (fq_bones=fqname(C.field(C.gb,"instance_globals_b","bones").address,3,0));
    (tempname=set_bonestemp_name());
    (tempname=fqname(tempname,3,1));
    /* old SYSVs don't have rename.  Some SVR3's may, but since they
     * also have link/unlink, it doesn't matter. :-)
     */
    (ret=C.rename(tempname,fq_bones));
    if(Number(!!(C.i32(C.field(C.flags,"flag","debug").value)&&Number(ret!=0)))) C.variadic(16,C.literal("couldn't rename %s to %s."),tempname,fq_bones);
}

export function open_bonesfile(lev,bonesid)
{
    lev=C.ptr(lev);
    bonesid=C.ptr(bonesid);
    let fq_bones;
    let nhfp=0;
    (C.cell(bonesid,"char *").value=set_bonesfile_name(C.field(C.gb,"instance_globals_b","bones").address,lev));
    (fq_bones=fqname(C.field(C.gb,"instance_globals_b","bones").address,3,0));
    nh_uncompress(fq_bones);
    /* no effect if nonexistent */
    (nhfp=new_nhfile());
    if(nhfp) {
        (C.field(nhfp,"nh_file","structlevel").value=C.i8(1));
        (C.field(nhfp,"nh_file","fieldlevel").value=C.i8(0));
        (C.field(nhfp,"nh_file","ftype").value=3);
        (C.field(nhfp,"nh_file","mode").value=0);
        (C.field(nhfp,"nh_file","addinfo").value=C.i8(1));
        (C.field(C.field(nhfp,"nh_file","style").address,"fieldlevel_content","deflt").value=C.i8(1));
        (C.field(C.field(nhfp,"nh_file","style").address,"fieldlevel_content","binary").value=C.i8((Number(C.cell((C.field(C.sysopt,"sysopt_s","bonesformat").address+Number(0)*4),"int").value!=C.exportascii))));
        (C.field(nhfp,"nh_file","fnidx").value=C.cell((C.field(C.sysopt,"sysopt_s","bonesformat").address+Number(0)*4),"int").value);
        (C.field(nhfp,"nh_file","fd").value=C.i32((-1)));
        (C.field(nhfp,"nh_file","fpdef").value=0);
        if(C.field(nhfp,"nh_file","fpdef").value) {
        }
        if(C.field(nhfp,"nh_file","structlevel").value) {
            (C.field(nhfp,"nh_file","fd").value=C.variadic(17,fq_bones,C.i32((0|0)),0));
        }
    }
    (nhfp=viable_nhfile(nhfp));
    return nhfp;
}

export function delete_bonesfile(lev)
{
    lev=C.ptr(lev);
    let reslt;
    set_bonesfile_name(C.field(C.gb,"instance_globals_b","bones").address,lev);
    (reslt=C.unlink(fqname(C.field(C.gb,"instance_globals_b","bones").address,3,0)));
    delete_convertedfile(fqname(C.field(C.gb,"instance_globals_b","bones").address,3,0));
    return Number(!((Number(reslt<0))));
}

/* assume we're compressing the recently read or created bonesfile, so the
 * file name is already set properly */
export function compress_bonesfile()
{
    nh_sfconvert(fqname(C.field(C.gb,"instance_globals_b","bones").address,3,0));
    nh_compress(fqname(C.field(C.gb,"instance_globals_b","bones").address,3,0));
}

/* !SFCTOOL */
/* ----------  END BONES FILE HANDLING ----------- */
/* ----------  BEGIN SAVE FILE HANDLING ----------- */
/* set savefile name in OS-dependent manner from pre-existing svp.plname,
 * avoiding troublesome characters */
export function set_savefile_name(regularize_it)
{
    regularize_it=C.i8(regularize_it);
    let regoffset=0; let overflow=0; let indicator_spot=0;
    /* 0=no indicator, 1=before ext, 2=after ext */
    let postappend=0; let sfindicator=0;
    /* skip '*' wildcard character */
    C.variadic(18,C.field(C.gs,"instance_globals_s","SAVEF").address,C.literal("save/%d%s"),C.i32(C.getuid()),C.field(C.svp,"instance_globals_saved_p","plname").address);
    (regoffset=5);
    (indicator_spot=2);
    /* svp.plname has to share space with gs.SAVEP and ".sav" */
    /* MICRO */
    if(regularize_it) C.regularize((C.field(C.gs,"instance_globals_s","SAVEF").address+Number(regoffset)*1));
    if(Number(!!(Number(!!(Number(indicator_spot==1)&&sfindicator))&&Number(!(overflow))))) {
        if(Number(C.u64((C.strlen(C.field(C.gs,"instance_globals_s","SAVEF").address)+C.strlen(sfindicator)))<(C.u64(((C.u64((C.u64((C.u64((C.u64(32)+BigInt((1*13))))+BigInt((1*1))))+BigInt((1*8)))))-C.u64(1)))))) C.strcat(C.field(C.gs,"instance_globals_s","SAVEF").address,sfindicator);
 else (overflow=2);
    }
    /* (0) is placed in brackets below so that the [&& !overflow] is
       explicit dead code (the ">" comparison is detected as always
       FALSE at compile-time). Done to appease clang's -Wunreachable-code */
    if(Number(!!(Number(C.strlen(C.literal(""))>C.u64((0)))&&Number(!(overflow))))) {
        if(Number(C.u64((C.strlen(C.field(C.gs,"instance_globals_s","SAVEF").address)+C.strlen(C.literal(""))))<(C.u64(((C.u64((C.u64((C.u64((C.u64(32)+BigInt((1*13))))+BigInt((1*1))))+BigInt((1*8)))))-C.u64(1)))))) {
            C.strcat(C.field(C.gs,"instance_globals_s","SAVEF").address,C.literal(""));
        } else (overflow=3);
    }
    if(Number(!!(Number(!!(Number(indicator_spot==2)&&sfindicator))&&Number(!(overflow))))) {
        if(Number(C.u64((C.strlen(C.field(C.gs,"instance_globals_s","SAVEF").address)+C.strlen(sfindicator)))<(C.u64(((C.u64((C.u64((C.u64((C.u64(32)+BigInt((1*13))))+BigInt((1*1))))+BigInt((1*8)))))-C.u64(1)))))) C.strcat(C.field(C.gs,"instance_globals_s","SAVEF").address,sfindicator);
 else (overflow=4);
    }
    if(Number(!!(postappend&&Number(!(overflow))))) {
        if(Number(C.u64((C.strlen(C.field(C.gs,"instance_globals_s","SAVEF").address)+C.strlen(postappend)))<(C.u64(((C.u64((C.u64((C.u64((C.u64(32)+BigInt((1*13))))+BigInt((1*1))))+BigInt((1*8)))))-C.u64(1)))))) C.strcat(C.field(C.gs,"instance_globals_s","SAVEF").address,postappend);
 else (overflow=5);
    }
}

export function save_savefile_name(nhfp)
{
    nhfp=C.ptr(nhfp);
    C.sfo_char(nhfp,C.field(C.gs,"instance_globals_s","SAVEF").address,C.literal("savefile_name"),C.i32(BigInt((1*54))));
}

/* change pre-existing savefile name to indicate an error savefile */
export function set_error_savefile()
{
    C.strcat(C.field(C.gs,"instance_globals_s","SAVEF").address,C.literal(".e"));
}

/* create save file, overwriting one if it already exists */
export function create_savefile()
{
    let fq_save;
    let nhfp=0;
    let do_historical=C.i8(1);
    (fq_save=fqname(C.field(C.gs,"instance_globals_s","SAVEF").address,2,0));
    (nhfp=new_nhfile());
    if(nhfp) {
        (C.field(nhfp,"nh_file","ftype").value=2);
        (C.field(nhfp,"nh_file","mode").value=2);
        if(Number(!!(C.field(C.program_state,"sinfo","in_self_recover").value||C.i32(do_historical)))) {
            ((do_historical));
            (C.field(nhfp,"nh_file","structlevel").value=C.i8(1));
            (C.field(nhfp,"nh_file","fieldlevel").value=C.i8(0));
            (C.field(nhfp,"nh_file","addinfo").value=C.i8(0));
            (C.field(C.field(nhfp,"nh_file","style").address,"fieldlevel_content","deflt").value=C.i8(0));
            (C.field(C.field(nhfp,"nh_file","style").address,"fieldlevel_content","binary").value=C.i8(1));
            (C.field(nhfp,"nh_file","fnidx").value=C.historical);
            (C.field(nhfp,"nh_file","fd").value=C.i32((-1)));
            (C.field(nhfp,"nh_file","fpdef").value=0);
            /* !MICRO && !WIN32 */
            /* UNIX || MACOS9 implied (MACOS9 is OS9 or earlier only) */
            (C.field(nhfp,"nh_file","fd").value=C.creat(fq_save,C.u32(432)));
            /* MICRO || WIN32 */
        }
    }
    /*
       Make sure the save file is owned by the current process.  That's
       the default for non-privileged users, but for priv'd users the
       file will be owned by the directory's owner instead of the user.
    */
    /* VMS && !SECURE */
    (nhfp=viable_nhfile(nhfp));
    return nhfp;
}

/* open savefile for reading */
export function open_savefile()
{
    let fq_save;
    let nhfp=0;
    let do_historical=C.i8(1);
    (fq_save=fqname(C.field(C.gs,"instance_globals_s","SAVEF").address,2,0));
    (nhfp=new_nhfile());
    if(nhfp) {
        (C.field(nhfp,"nh_file","ftype").value=2);
        (C.field(nhfp,"nh_file","mode").value=0);
        if(Number(!!(C.field(C.program_state,"sinfo","in_self_recover").value||C.i32(do_historical)))) {
            (do_historical=C.i8(1));
            /* force it */
            ((do_historical));
            (C.field(nhfp,"nh_file","structlevel").value=C.i8(1));
            (C.field(nhfp,"nh_file","fieldlevel").value=C.i8(0));
            (C.field(nhfp,"nh_file","addinfo").value=C.i8(0));
            (C.field(C.field(nhfp,"nh_file","style").address,"fieldlevel_content","deflt").value=C.i8(0));
            (C.field(C.field(nhfp,"nh_file","style").address,"fieldlevel_content","binary").value=C.i8(1));
            (C.field(nhfp,"nh_file","fnidx").value=C.historical);
            (C.field(nhfp,"nh_file","fd").value=C.i32((-1)));
            (C.field(nhfp,"nh_file","fpdef").value=0);
        }
        (C.field(nhfp,"nh_file","fd").value=C.variadic(19,fq_save,C.i32((0|0)),0));
    }
    (nhfp=viable_nhfile(nhfp));
    return nhfp;
}

/* delete savefile */
export function delete_savefile()
{
    let sfname=fqname(C.field(C.gs,"instance_globals_s","SAVEF").address,2,0);
    C.unlink(sfname);
    delete_convertedfile(sfname);
    return 0;
    /* for restore_saved_game() (ex-xxxmain.c) test */
}

/* try to open up a save file and prepare to restore it */
export function restore_saved_game()
{
    let fq_save;
    let nhfp=0;
    let sfstatus=0;
    set_savefile_name(C.i8(1));
    (fq_save=fqname(C.field(C.gs,"instance_globals_s","SAVEF").address,2,0));
    nh_uncompress(fq_save);
    if(Number(((nhfp=open_savefile()))!=0)) {
        if(Number(((sfstatus=C.validate(nhfp,fq_save,C.i8(0))))!=0)) {
            close_nhfile(nhfp);
            (nhfp=problematic_savefile(sfstatus,fq_save));
        }
    }
    return nhfp;
}

/*
 * This doesn't open any files. It provides a valid (NHFILE *)
 * to provide to functions that take one as a parameter, with
 * only the FREEING bit set.
 *
 * close_nhfile() can, and should, be called on the returned
 * (NHFILE *), and it will handle it correctly.
 */
export function get_freeing_nhfile()
{
    let nhfp=0;
    (nhfp=new_nhfile());
    /* also sets fd to -1 */
    if(nhfp) {
        (C.field(nhfp,"nh_file","mode").value=4);
    }
    return nhfp;
}

/* called if there is no save file for current character */
export function check_panic_save()
{
    let result=0;
    let cf;
    let savef;
    set_error_savefile();
    (savef=fqname(C.field(C.gs,"instance_globals_s","SAVEF").address,2,0));
    /*
     * This duplicates part of docompress_file().
     * We don't want to start by uncompressing just to check for the
     * file's existence and then have to recompress it.
     */
    let ln=C.u32((C.u64((C.strlen(savef)+C.strlen(C.literal(".Z"))))));
    let cfn=C.alloc(C.u32((ln+C.u32(1))));
    C.strcpy(cfn,savef);
    C.strcat(cfn,C.literal(".Z"));
    if(Number(((cf=C.fopen(cfn,C.literal("r"))))!=(0))) {
        C.fclose(cf);
        (result=1);
    }
    C.free(cfn);
    /* COMPRESS_EXTENSION */
    if(Number(!(result))) {
        /* maybe it has already been manually uncompressed */
        if(Number(((cf=C.fopen(savef,C.literal("r"))))!=(0))) {
            C.fclose(cf);
            (result=1);
        }
    }
    set_savefile_name(C.i8(1));
    /* reset to normal */
    /* CHECK_PANIC_SAVE */
    return result;
}

export function plname_from_file(filename,without_wait_synch_per_file)
{
    filename=C.ptr(filename);
    without_wait_synch_per_file=C.i8(without_wait_synch_per_file);
    let nhfp;
    let ln;
    let result=0;
    let sfstatus=0;
    C.strcpy(C.field(C.gs,"instance_globals_s","SAVEF").address,filename);
{
        /* if COMPRESS_EXTENSION is present, strip it off */
        let sln=C.i32(C.strlen(C.field(C.gs,"instance_globals_s","SAVEF").address)); let xln=C.i32(C.strlen(C.literal(".Z")));
        if(Number(!!(Number(sln>xln)&&Number(!(C.strcmp((C.field(C.gs,"instance_globals_s","SAVEF").address+Number(C.i32((sln-xln)))*1),C.literal(".Z"))))))) (C.cell((C.field(C.gs,"instance_globals_s","SAVEF").address+Number(C.i32((sln-xln)))*1),"char").value=C.i8(0));
    }    nh_uncompress(C.field(C.gs,"instance_globals_s","SAVEF").address);
    if(Number(((nhfp=open_savefile()))!=0)) {
        if(Number(((sfstatus=C.validate(nhfp,filename,without_wait_synch_per_file)))==0)) {
            /* room for "name+role+race+gend+algn X" where the space before
               X is actually NUL and X is playmode: one of '-', 'X', or 'D' */
            (ln=C.u32((C.i32((C.i32((32+C.i32((4*(C.i32((1+3)))))))+1)))));
            (result=C.memset(C.alloc(ln),0,C.u64(ln)));
            C.get_plname_from_file(nhfp,result,C.i8(0));
        }
        close_nhfile(nhfp);
    }
    nh_compress(C.field(C.gs,"instance_globals_s","SAVEF").address);
    return result;
    /* file's plname[]+playmode value */
}

/* defined(SELECTSAVED) */
/* get list of saved games owned by current user */
export function get_saved_games()
{
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["get_saved_games.uid",4],["get_saved_games.name",(1*64)],["get_saved_games.filename",(1*256)]]);
    try {
    let result=0;
    let n;
    let j=0;
    /* at most */
    /* at most */
    /* this renaming of the savefile is not compatible
                     * with 1f36b98b,  'selectsaved' extension from
                     * Oct 10, 2024. Disable the renaming for the time
                     * being.
                     */
    /* rename file if it is not named as expected */
    /* WIN32 */
    /* posixly correct version */
    let myuid=C.i32(C.getuid());
    let dir;
    if(((dir=C.opendir(fqname(C.literal("save"),2,0))))) {
        for((n=0);C.readdir(dir);((n=C.i32((n+1)))-1)) ;

        C.closedir(dir);
        if(Number(n>0)) {
            let i;
            if(Number(!(((dir=C.opendir(fqname(C.literal("save"),2,0))))))) return 0;
            (result=C.alloc(C.u32(C.u64((C.u64((C.i32((n+1))))*BigInt(8))))));
            /* at most */
            C.memset(result,0,C.u64((C.u64((C.i32((n+1))))*BigInt(8))));
            for(((i=0),(j=0));Number(i<n);((i=C.i32((i+1)))-1)) {
                let uid=C.local("get_saved_games.uid","int");
                let name=C.automatic("get_saved_games.name",(1*64));
                /* more than PL_NSIZ+1 */
                let entry=C.readdir(dir);
                if(Number(!(entry))) break;
                if(Number(C.variadic(20,C.field(entry,"dirent","d_name").address,C.literal("%d%63s"),uid.address,name)==2)) {
                    if(Number(uid.value==myuid)) {
                        let filename=C.automatic("get_saved_games.filename",(1*256));
                        let r;
                        C.variadic(21,filename,C.literal("save/%d%s"),uid.value,name);
                        (r=plname_from_file(filename,C.i8(0)));
                        if(r) (C.cell((result+Number(((j=C.i32((j+1)))-1))*8),"char *").value=r);
                    }
                }
            }
            C.closedir(dir);
        }
    }
    /* UNIX */
    /* VMS */
    if(Number(j>0)) {
        if(Number(j>1)) C.nh_deterministic_qsort((result),C.u64((j)),(BigInt(8)),(C.functionAddress("strcmp_wrap")));
        (C.cell((result+Number(j)*8),"char *").value=(0));
    } else if(result) {
        /* could happen if save files are obsolete */
        free_saved_games(result);
        (result=(0));
    }
    /* SELECTSAVED */
    return result;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

export function free_saved_games(saved)
{
    saved=C.ptr(saved);
    if(saved) {
        let i;
        for((i=0);C.cell((saved+Number(i)*8),"char *").value;(i=C.i32((i+1)))) C.free(C.cell((saved+Number(i)*8),"char *").value);

        C.free(saved);
    }
}

/* !SFCTOOL */
/* ----------  END SAVE FILE HANDLING ----------- */
/* ----------  BEGIN FILE COMPRESSION HANDLING ----------- */
/* external compression */
export function redirect(filename,mode,stream,uncomp)
{
    filename=C.ptr(filename);
    mode=C.ptr(mode);
    stream=C.ptr(stream);
    uncomp=C.i8(uncomp);
    if(Number(C.freopen(filename,mode,stream)==0)) {
        let details;
        if(Number(((details=C.strerror((C.cell(C.__errno_location(),"int").value))))==0)) (details=C.literal(""));
        C.variadic(22,(C.global("stderr").value),C.literal("freopen of %s for %scompress failed; (%d) %s\n"),filename,(C.i32(uncomp)?C.literal("un"):C.literal("")),(C.cell(C.__errno_location(),"int").value),details);
        C.nh_terminate(1);
    }
}

/*
 * using system() is simpler, but opens up security holes and causes
 * problems on at least Interactive UNIX 3.0.1 (SVR3.2), where any
 * setuid is renounced by /bin/sh, so the files cannot be accessed.
 *
 * cf. child() in unixunix.c.
 */
export function docompress_file(filename,uncomp)
{
    filename=C.ptr(filename);
    uncomp=C.i8(uncomp);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["docompress_file.args",(8*10)]]);
    try {
    let cfn=0;
    let xtra;
    let cf;
    let args=C.automatic("docompress_file.args",(8*10));
    let i=0;
    let f; let childstatus;
    let ln;
    let istty=C.i8((Number(C.u32(C.field(C.windowprocs,"window_procs","wp_id").value)==C.u32(C.wp_tty))));
    (xtra=C.literal(".Z"));
    /* SFCTOOL */
    (ln=C.u32((C.u64((C.strlen(filename)+C.strlen(xtra))))));
    (cfn=C.alloc(C.u32((ln+C.u32(1)))));
    /* SFCTOOL */
    C.strcpy(cfn,filename);
    C.strcat(cfn,xtra);
    /* when compressing, we know the file exists */
    if(uncomp) {
        if(Number(((cf=C.fopen(cfn,C.literal("r"))))==0)) {
            C.free(cfn);
            return;
        }
        C.fclose(cf);
    }
    (C.cell((args+Number(0)*8),"char *").value=C.literal("/usr/bin/compress"));
    if(uncomp) (C.cell((args+Number((i=C.i32((i+1))))*8),"char *").value=C.literal("-d"));
    /* uncompress */
    /* we can't guarantee there's only one additional option, sigh */
    (C.cell((args+Number((i=C.i32((i+1))))*8),"char *").value=0);
    /* If we don't do this and we are right after a y/n question *and*
     * there is an error message from the compression, the 'y' or 'n' can
     * end up being displayed after the error message.
     */
    if(istty) {
        C.callback(0,(C.field(C.windowprocs,"window_procs","win_mark_synch").value));
    }
    
    (childstatus=C.teleport_compress_file(filename,cfn,C.i32(uncomp)));
    /* child */
    /* any error messages from the compression must come out after
         * the first line, because the more() to let the user read
         * them will have to clear the first line.  This should be
         * invisible if there are no error messages.
         */
    /* run compressor without privileges, in case other programs
         * have surprises along the line of gzip once taking filenames
         * in GZIP.
         */
    /* assume all compressors will compress stdin to stdout
         * without explicit filenames.  this is true of at least
         * compress and gzip, those mentioned in config.h.
         */
    /*
     * back in parent...
     */
    /* wait() should update this, ideally setting it to 0 */
    /* avoid stale details if wait() doesn't set errno */
    /* wait() returns child's pid and sets 'childstatus' to child's
       exit status, or returns -1 and leaves 'childstatus' unmodified */
    /* I don't think we can really cope with external compression
     * without signals, so we'll declare that compress failed and
     * go on.  (We could do a better job by forcing off external
     * compression if there are no signals, but we want this for
     * testing with FailSafeC
     */
    /* non-zero => failure */
    /* native subprocess / in-process Wasm codec */
    if(Number(childstatus==0)) {
        /* (un)compress succeeded: remove file left behind */
        if(uncomp) C.unlink(cfn);
 else C.unlink(filename);
    } else {
        /* (un)compress failed; remove the new, bad file */
        if(uncomp) {
            C.variadic(23,C.literal("Unable to uncompress %s"),filename);
            C.unlink(filename);
        } else {
            /* no message needed for compress case; life will go on */
            C.unlink(cfn);
        }
        /* Give them a chance to read any error messages from the
         * compression--these would go to stdout or stderr and would get
         * overwritten only in tty mode.  It's still ugly, since the
         * messages are being written on top of the screen, but at least
         * the user can read them.
         */
        if(Number(!!(C.i32(istty)&&C.i32(C.field(C.iflags,"instance_flags","window_inited").value)))) {
            C.callback(1,(C.field(C.windowprocs,"window_procs","win_clear_nhwindow").value),C.global("WIN_MESSAGE").value);
            C.more();
            /* No way to know if this is feasible */
            /* doredraw(); */
        }
    }
    C.free(cfn);
    return;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/* COMPRESS : external compression */
/*empty*/
/* compress file */
export function nh_compress(filename)
{
    filename=C.ptr(filename);
    docompress_file(filename,C.i8(0));
}

/* uncompress file if it exists */
export function nh_uncompress(filename)
{
    filename=C.ptr(filename);
    docompress_file(filename,C.i8(1));
}

/* RLC 09 Mar 1999: Support internal ZLIB */
/* Assume free-form filename with no 8.3 restrictions */
/* find last occurrence of bon */
/* SAVE_EXTENSION */
/* SHORT_FILENAMES */
/* Open the input and output files */
/* Note that gzopen takes "wb" as its mode, even on systems where
           fopen takes "r" and "w" */
/* Copy from the uncompressed to the compressed file */
/* End of file */
/* Delete the file left behind */
/* uncomp */
/* Open the input and output files */
/* Note that gzopen takes "rb" as its mode, even on systems where
           fopen takes "r" and "w" */
/* Copy from the compressed to the uncompressed file */
/* End of file */
/* Delete the file left behind */
/* RLC 09 Mar 1999: End ZLIB patch */
/* ----------  END FILE COMPRESSION HANDLING ----------- */
/* ----------  BEGIN PROBLEMATIC SAVEFILE HANDLING ----------- */
export function problematic_savefile(sfstatus,savefilenm)
{
    sfstatus=C.i32(sfstatus);
    savefilenm=C.ptr(savefilenm);
    let i;
    let nhfp=0;
    switch(sfstatus) {
        case (0):
            break;
        case (3):
            case (4):
                case (5):
                    case (6):
                        case (7):
                            case (8):
                                ;
        /*FALLTHRU*/
        case (9):
            case (1):
                case (2):
                    default:
                        for((i=0);Number(i<C.i32((C.u64((BigInt((C.sizes["struct sfstatus_to_msg"]*10))/BigInt(C.sizes["struct sfstatus_to_msg"]))))));(i=C.i32((i+1)))) {
                            if(Number(C.field((C.staticAddress("sf2msg")+Number(i)*C.sizes["struct sfstatus_to_msg"]),"sfstatus_to_msg","sfstatus").value==sfstatus)) {
                                C.variadic(24,C.literal("\n%s is %s %s\n"),savefilenm,((Number(sfstatus==1))?C.literal("an"):C.literal("a")),C.field((C.staticAddress("sf2msg")+Number(i)*C.sizes["struct sfstatus_to_msg"]),"sfstatus_to_msg","msg").value);
                                break;
                            }
                        }
    }
    return nhfp;
}

/* !SFCTOOL */
/* ----------  END PROBLEMATIC SAVEFILE HANDLING ----------- */
/* ----------  BEGIN EXTERNAL CONVERSION HANDLING ----------- */
/*
 * Returns non-zero if unconvert was successful
 */
export function doconvert_file(filename,sfstatus,unconvert)
{
    filename=C.ptr(filename);
    sfstatus=C.i32(sfstatus);
    unconvert=C.i8(unconvert);
    ((filename));
    ((sfstatus));
    ((unconvert));
    return 1;
}

/* convert file */
export function nh_sfconvert(filename)
{
    filename=C.ptr(filename);
    doconvert_file(filename,0,C.i8(0));
}

/* unconvert file if it exists */
export function nh_sfunconvert(filename)
{
    filename=C.ptr(filename);
    doconvert_file(filename,0,C.i8(1));
}

/* !SFCTOOL */
/* in sfctool, these are in sfctool.c, not in here */
/* !SFCTOOL */
export function make_converted_name(filename)
{
    filename=C.ptr(filename);
    let ln;
    let xtra; let finaldirchar;
    let dir=0;
    let needsep=C.i8(0);
    if(Number(!(filename))) return C.i8(0);
    if(C.cell(C.staticAddress("unconverted_filename"),"char *").value) (C.free(C.cell(C.staticAddress("unconverted_filename"),"char *").value),(C.cell(C.staticAddress("unconverted_filename"),"char *").value=0));
    if(C.cell(C.staticAddress("converted_filename"),"char *").value) (C.free(C.cell(C.staticAddress("converted_filename"),"char *").value),(C.cell(C.staticAddress("converted_filename"),"char *").value=0));
    /* do we need to do some ms-dos processing here? */
    /* SHORT_FILENAMES */
    (ln=C.u32(C.strlen(filename)));
    if(Number(!(contains_directory(filename)))) {
        (dir=C.nh_getenv(C.literal("NETHACKDIR")));
        if(Number(!(dir))) (dir=C.nh_getenv(C.literal("HACKDIR")));
        if(Number(!(dir))) (dir=C.literal("/usr/games/lib/nethackdir"));
        /* UNIX || WIN32 */
        if(dir) {
            (finaldirchar=C.c_eos(dir));
            ((finaldirchar=C.ptr((finaldirchar-Number(1))))+Number(1));
            if(Number(!((Number(!!(Number(!!(Number(C.i32(C.cell(finaldirchar,"char").value)==47)||Number(C.i32(C.cell(finaldirchar,"char").value)==92)))||Number(C.i32(C.cell(finaldirchar,"char").value)==58))))))) {
                (needsep=C.i8(1));
                (ln=C.u32(ln+C.u32(1)));
            }
            (ln=C.u32(C.u64(ln)+C.strlen(dir)));
        }
    }
    (C.cell(C.staticAddress("unconverted_filename"),"char *").value=C.alloc(C.u32((ln+C.u32(1)))));
    C.variadic(25,(C.literal("make_converted_name")),2151,C.cell(C.staticAddress("unconverted_filename"),"char *").value,C.u64(C.u32((ln+C.u32(1)))),C.literal("%s%s%s"),(dir?dir:C.literal("")),((Number(!!(dir&&C.i32(needsep))))?C.literal("/"):C.literal("")),filename);
    (xtra=C.literal(".exportascii"));
    (ln=C.u32(ln+C.u32(C.strlen(xtra))));
    (C.cell(C.staticAddress("converted_filename"),"char *").value=C.alloc(C.u32((ln+C.u32(1)))));
    C.strcpy(C.cell(C.staticAddress("converted_filename"),"char *").value,C.cell(C.staticAddress("unconverted_filename"),"char *").value);
    C.strcat(C.cell(C.staticAddress("converted_filename"),"char *").value,xtra);
    return C.i8(1);
}

/* delete converted savefile as a normal course of action */
export function delete_convertedfile(basefilename)
{
    basefilename=C.ptr(basefilename);
    if(Number(!(C.cell(C.staticAddress("converted_filename"),"char *").value))) make_converted_name(basefilename);
    if(C.cell(C.staticAddress("converted_filename"),"char *").value) {
        C.unlink(C.cell(C.staticAddress("converted_filename"),"char *").value);
    }
    return 0;
}

export function free_convert_filenames()
{
    if(C.cell(C.staticAddress("converted_filename"),"char *").value) (C.free(C.cell(C.staticAddress("converted_filename"),"char *").value),(C.cell(C.staticAddress("converted_filename"),"char *").value=0));
    if(C.cell(C.staticAddress("unconverted_filename"),"char *").value) (C.free(C.cell(C.staticAddress("unconverted_filename"),"char *").value),(C.cell(C.staticAddress("unconverted_filename"),"char *").value=0));
    (C.cell(C.staticAddress("cvtinit"),"signed char").value=C.i8(0));
}

/* return TRUE if s contains a directory, not just a filespec */
export function contains_directory(s)
{
    s=C.ptr(s);
    let i; let slen=C.i32(C.strlen(s));
    let cp=s;
    for((i=0);Number(i<slen);(i=C.i32((i+1)))) {
        if(Number(!!(Number(!!(Number(C.i32(C.cell(cp,"char").value)==92)||Number(C.i32(C.cell(cp,"char").value)==47)))||Number(C.i32(C.cell(cp,"char").value)==58)))) return C.i8(1);
        ((cp=C.ptr((cp+Number(1))))-Number(1));
    }
    return C.i8(0);
}

/* =========================================================================*/
/* ----------  END EXTERNAL CONVERSION HANDLING ----------- */
/* ----------  BEGIN FILE LOCKING HANDLING ----------- */
/* implies UNIX */
/* for lock_file() to pass to unlock_file() */
/* for unlocking, same as above */
/*empty*/
/* !(UNIX || VMS || AMIGA || WIN32 || MSDOS) */
/* !USE_FCNTL */
/* lock a file */
export function lock_file(filename,whichprefix,retryct)
{
    filename=C.ptr(filename);
    whichprefix=C.i32(whichprefix);
    retryct=C.i32(retryct);
    ((C.field(C.gn,"instance_globals_n","nesting").value=C.i32((C.field(C.gn,"instance_globals_n","nesting").value+1)))-1);
    if(Number(C.field(C.gn,"instance_globals_n","nesting").value>1)) {
        C.variadic(26,C.literal("TRIED TO NEST LOCKS"));
        return C.i8(1);
    }
    /* LOCKDIR should be subsumed by LOCKPREFIX */
    (filename=fqname(filename,whichprefix,0));
    (C.cell(C.staticAddress("lockfd"),"int").value=C.variadic(27,filename,2));
    if(Number(C.cell(C.staticAddress("lockfd"),"int").value==C.i32((-1)))) {
        if(Number(!(C.field(C.program_state,"sinfo","done_hup").value))) C.variadic(28,C.literal("Cannot open file %s.  Is NetHack installed correctly?"),filename);
        ((C.field(C.gn,"instance_globals_n","nesting").value=C.i32((C.field(C.gn,"instance_globals_n","nesting").value-1)))+1);
        return C.i8(0);
    }
    (C.field(C.staticAddress("sflock"),"flock","l_type").value=C.i16(1));
    (C.field(C.staticAddress("sflock"),"flock","l_whence").value=C.i16((0)));
    (C.field(C.staticAddress("sflock"),"flock","l_start").value=C.i64(0));
    (C.field(C.staticAddress("sflock"),"flock","l_len").value=C.i64(0));
    while(Number(C.variadic(29,C.cell(C.staticAddress("lockfd"),"int").value,6,C.staticAddress("sflock"))==C.i32((-1)))) {
        if(((retryct=C.i32((retryct-1)))+1)) {
            if(Number(!(C.field(C.program_state,"sinfo","done_hup").value))) C.variadic(30,C.literal("Waiting for release of fcntl lock on %s.  (%d retries left.)"),filename,retryct);
            C.sleep(C.u32(1));
        } else {
            if(Number(!(C.field(C.program_state,"sinfo","done_hup").value))) C.callback(2,(C.field(C.windowprocs,"window_procs","win_raw_print").value),C.literal("I give up.  Sorry."));
            if(Number(!(C.field(C.program_state,"sinfo","done_hup").value))) C.variadic(31,C.literal("Some other process has an unnatural grip on %s."),filename);
            ((C.field(C.gn,"instance_globals_n","nesting").value=C.i32((C.field(C.gn,"instance_globals_n","nesting").value-1)))+1);
            return C.i8(0);
        }
        /* George Barbanis */
        /* c__translate(vmsfiles.c) */
        /* could be misleading, but usually right */
        /* take a wild guess at the underlying cause */
        /* USE_FCNTL */
    }
    /* UNIX || VMS */
    /* in case dead process was here first */
    /* AMIGA || WIN32 || MSDOS */
    return C.i8(1);
}

/* for unlock_file, use the unlink() routine in vmsunix.c */
/* unlock file, which must be currently locked by lock_file */
export function unlock_file(filename)
{
    filename=C.ptr(filename);
    if(Number(C.field(C.gn,"instance_globals_n","nesting").value==1)) {
        (C.field(C.staticAddress("sflock"),"flock","l_type").value=C.i16(2));
        if(Number(C.cell(C.staticAddress("lockfd"),"int").value>=0)) {
            if(Number(C.variadic(32,C.cell(C.staticAddress("lockfd"),"int").value,6,C.staticAddress("sflock"))==C.i32((-1)))) if(Number(!(C.field(C.program_state,"sinfo","done_hup").value))) C.variadic(33,C.literal("Can't remove fcntl lock on %s."),filename);
            (C.close(C.cell(C.staticAddress("lockfd"),"int").value),(C.cell(C.staticAddress("lockfd"),"int").value=C.i32((-1))));
        }
        /* LOCKDIR should be subsumed by LOCKPREFIX */
        /* UNIX || VMS */
        /* AMIGA || WIN32 || MSDOS */
        /* USE_FCNTL */
    }
    ((C.field(C.gn,"instance_globals_n","nesting").value=C.i32((C.field(C.gn,"instance_globals_n","nesting").value-1)))+1);
}

/* ----------  END FILE LOCKING HANDLING ----------- */
/* ----------  BEGIN WIZKIT FILE HANDLING ----------- */
export function fopen_wizkit_file()
{
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["fopen_wizkit_file.tmp_wizkit",(1*256)]]);
    try {
    let fp;
    let tmp_wizkit=C.automatic("fopen_wizkit_file.tmp_wizkit",(1*256));
    let envp;
    (envp=C.nh_getenv(C.literal("WIZKIT")));
    if(Number(!!(envp&&C.i32(C.cell(envp,"char").value)))) C.strncpy(C.field(C.gw,"instance_globals_w","wizkit").address,envp,C.u64(C.i32((128-1))));
    if(Number(!(C.cell((C.field(C.gw,"instance_globals_w","wizkit").address+Number(0)*1),"char").value))) return 0;
    if(Number(C.access(C.field(C.gw,"instance_globals_w","wizkit").address,4)==C.i32((-1)))) {
        /* 4 is R_OK on newer systems */
        /* nasty sneaky attempt to read file through
         * NetHack's setuid permissions -- this is a
         * place a file name may be wholly under the player's
         * control
         */
        C.variadic(34,C.literal("Access to %s denied (%d)."),C.field(C.gw,"instance_globals_w","wizkit").address,(C.cell(C.__errno_location(),"int").value));
        C.callback(3,(C.field(C.windowprocs,"window_procs","win_wait_synch").value));
        /* fall through to standard names */
    } else if(Number(((fp=C.fopen(C.field(C.gw,"instance_globals_w","wizkit").address,C.literal("r"))))!=0)) {
        return fp;
    } else {
        /* access() above probably caught most problems for UNIX */
        C.variadic(35,C.literal("Couldn't open requested wizkit file %s (%d)."),C.field(C.gw,"instance_globals_w","wizkit").address,(C.cell(C.__errno_location(),"int").value));
        C.callback(4,(C.field(C.windowprocs,"window_procs","win_wait_synch").value));
    }
    /* should be only UNIX left */
    (envp=C.nh_getenv(C.literal("HOME")));
    if(envp) C.variadic(36,tmp_wizkit,C.literal("%s/%s"),envp,C.field(C.gw,"instance_globals_w","wizkit").address);
 else C.strcpy(tmp_wizkit,C.field(C.gw,"instance_globals_w","wizkit").address);
    if(Number(((fp=C.fopen(tmp_wizkit,C.literal("r"))))!=0)) return fp;
 else if(Number((C.cell(C.__errno_location(),"int").value)!=(44))) {
        /* e.g., problems when setuid NetHack can't search home
         * directory restricted to user */
        C.variadic(37,C.literal("Couldn't open default gw.wizkit file %s (%d)."),tmp_wizkit,(C.cell(C.__errno_location(),"int").value));
        C.callback(5,(C.field(C.windowprocs,"window_procs","win_wait_synch").value));
    }
    return 0;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/* add to hero's inventory if there's room, otherwise put item on floor */
export function wizkit_addinv(obj)
{
    obj=C.ptr(obj);
    if(Number(!!(Number(!(obj))||Number(obj==C.hands_obj)))) return;
    /* subset of starting inventory pre-ID */
    C.observe_object(obj);
    if((Number(C.i32(C.field(C.field(C.gu,"instance_globals_u","urole").address,"Role","mnum").value)==(C.PM_CLERIC)))) (C.field(obj,"obj","bknown").value=C.u32(1));
    /* ok to bypass set_bknown() */
    /* same criteria as lift_object()'s check for available inventory slot */
    if(Number(!!(Number(!!(Number(C.i32(C.field(obj,"obj","oclass").value)!=C.COIN_CLASS)&&Number(C.inv_cnt(C.i8(0))>=C.invlet_basic)))&&Number(!(C.merge_choice(C.field(C.gi,"instance_globals_i","invent").value,obj)))))) {
        /* inventory overflow; can't just place & stack object since
           hero isn't in position yet, so schedule for arrival later */
        C.add_to_migration(obj);
        (C.field(obj,"obj","ox").value=C.i16(0));
        /* index of main dungeon */
        (C.field(obj,"obj","oy").value=C.i16(1));
        /* starting level number */
        (C.field(obj,"obj","owornmask").value=C.i64((C.i32((C.i32((9|1024))|2048)))));
    } else {
        C.addinv(obj);
    }
}

export function proc_wizkit_line(buf)
{
    buf=C.ptr(buf);
    let otmp;
    if(Number(C.strlen(buf)>=C.u64(256))) (C.cell((buf+Number(C.i32((256-1)))*1),"char").value=C.i8(0));
    (otmp=C.readobjnam(buf,0));
    if(otmp) {
        if(Number(otmp!=C.hands_obj)) {
            C.wish_history_add(buf);
            wizkit_addinv(otmp);
        }
    } else {
        /* .60 limits output line width to 79 chars */
        C.variadic(38,C.literal("Bad wizkit item: \"%.60s\""),buf);
        return C.i8(0);
    }
    return C.i8(1);
}

export function read_wizkit()
{
    let fp;
    if(Number(!!(Number(!(C.field(C.flags,"flag","debug").value))||Number(!(((fp=fopen_wizkit_file()))))))) return;
    (C.field(C.program_state,"sinfo","wizkit_wishing").value=1);
    C.config_error_init(C.i8(1),C.literal("WIZKIT"),C.i8(0));
    C.parse_conf_file(fp,C.functionAddress("proc_wizkit_line"));
    C.fclose(fp);
    C.config_error_done();
    (C.field(C.program_state,"sinfo","wizkit_wishing").value=0);
    return;
}

/* ----------  END WIZKIT FILE HANDLING ----------- */
/* ----------  BEGIN SYMSET FILE HANDLING ----------- */
/* symbols.c */
/* symbols.c */
export function fopen_sym_file()
{
    let fp;
    (fp=fopen_datafile(C.literal("symbols"),C.literal("r"),0));
    return fp;
}

/*
 * Returns 1 if the chosen symset was found and loaded.
 *         0 if it wasn't found in the sym file or other problem.
 */
export function read_sym_file(which_set)
{
    which_set=C.i32(which_set);
    let fp;
    (C.field((C.field(C.gs,"instance_globals_s","symset").address+Number(which_set)*C.sizes["struct symsetentry"]),"symsetentry","explicitly").value=C.u32(0));
    if(Number(!(((fp=fopen_sym_file()))))) return 0;
    (C.field((C.field(C.gs,"instance_globals_s","symset").address+Number(which_set)*C.sizes["struct symsetentry"]),"symsetentry","explicitly").value=C.u32(1));
    (C.field(C.gc,"instance_globals_c","chosen_symset_start").value=(C.field(C.gc,"instance_globals_c","chosen_symset_end").value=C.i8(0)));
    (C.field(C.gs,"instance_globals_s","symset_which_set").value=which_set);
    (C.field(C.gs,"instance_globals_s","symset_count").value=0);
    C.config_error_init(C.i8(1),C.literal("symbols"),C.i8(0));
    C.parse_conf_file(fp,C.functionAddress("proc_symset_line"));
    C.fclose(fp);
    if(Number(!!(Number(!(C.field(C.gc,"instance_globals_c","chosen_symset_start").value))&&Number(!(C.field(C.gc,"instance_globals_c","chosen_symset_end").value))))) {
        /* name caller put in symset[which_set].name was not found;
           if it looks like "Default symbols", null it out and return
           success to use the default; otherwise, return failure */
        if(Number(!!(C.field((C.field(C.gs,"instance_globals_s","symset").address+Number(which_set)*C.sizes["struct symsetentry"]),"symsetentry","name").value&&(Number(!!(C.i32(C.fuzzymatch(C.field((C.field(C.gs,"instance_globals_s","symset").address+Number(which_set)*C.sizes["struct symsetentry"]),"symsetentry","name").value,C.literal("Default symbols"),C.literal(" -_"),C.i8(1)))||Number(!(C.strncmpi((C.field((C.field(C.gs,"instance_globals_s","symset").address+Number(which_set)*C.sizes["struct symsetentry"]),"symsetentry","name").value),(C.literal("default")),C.i32((-1))))))))))) C.clear_symsetentry(which_set,C.i8(1));
        C.config_error_done();
        /* If name was defined, it was invalid. Then we're loading fallback */
        if(C.field((C.field(C.gs,"instance_globals_s","symset").address+Number(which_set)*C.sizes["struct symsetentry"]),"symsetentry","name").value) {
            (C.field((C.field(C.gs,"instance_globals_s","symset").address+Number(which_set)*C.sizes["struct symsetentry"]),"symsetentry","explicitly").value=C.u32(0));
            return 0;
        }
        return 1;
    }
    if(Number(!(C.field(C.gc,"instance_globals_c","chosen_symset_end").value))) C.variadic(39,C.literal("Missing finish for symset \"%s\""),(C.field((C.field(C.gs,"instance_globals_s","symset").address+Number(which_set)*C.sizes["struct symsetentry"]),"symsetentry","name").value?C.field((C.field(C.gs,"instance_globals_s","symset").address+Number(which_set)*C.sizes["struct symsetentry"]),"symsetentry","name").value:C.literal("unknown")));
    C.config_error_done();
    return 1;
}

/* ----------  END SYMSET FILE HANDLING ----------- */
/* ----------  BEGIN SCOREBOARD CREATION ----------- */
/*empty*/
/* verify that we can write to scoreboard file; if not, try to create one */
/*ARGUSED*/
export function check_recordfile(dir)
{
    dir=C.ptr(dir);
    let fq_record;
    let fd;
    (fq_record=fqname(C.literal("record"),5,0));
    (fd=C.variadic(40,fq_record,2,0));
    if(Number(fd>=0)) {
        /* must be stream-lf to use UPDATE_RECORD_IN_PLACE */
        nhclose(fd);
        /* RECORD is accessible */
    } else if(Number(((fd=C.variadic(41,fq_record,C.i32((64|2)),432)))>=0)) {
        nhclose(fd);
        /* RECORD newly created */
        /* Re-protect RECORD with world:read+write+execute+delete access. */
        /* VMS && !SECURE */
    } else {
        C.variadic(42,C.literal("Warning: cannot write scoreboard file '%s'"),fq_record);
        C.callback(6,(C.field(C.windowprocs,"window_procs","win_wait_synch").value));
    }
    /* !UNIX && !VMS */
    /* explicit path on opening for OS/2 */
    /* how does this work when there isn't an explicit path or fopen
     * for later access to the file via fopen_datafile? ? */
    /* If dir is NULL it indicates create but
       only if it doesn't already exist */
    /* explanation for failure other than missing file */
    /* try to create empty 'record' */
    /* Aztec doesn't use the third argument */
    /* DICE doesn't like it */
    /* open succeeded => 'record' exists */
    /* MICRO || WIN32*/
    /* Create the "record" file, if necessary */
    /* MACOS9 */
    /* MICRO || WIN32*/
}

/* ----------  END SCOREBOARD CREATION ----------- */
/* ----------  BEGIN PANIC/IMPOSSIBLE/TESTING LOG ----------- */
/*ARGSUSED*/
export function paniclog(type,reason)
{
    type=C.ptr(type);
    reason=C.ptr(reason);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["paniclog.buf",(1*256)]]);
    try {
    /* panic, impossible, trickery, [lua] */
    /* explanation */
    let lfile;
    if(Number(!(C.field(C.program_state,"sinfo","in_paniclog").value))) {
        (C.field(C.program_state,"sinfo","in_paniclog").value=1);
        (lfile=fopen_datafile(C.literal("paniclog"),C.literal("a"),9));
        if(lfile) {
            let buf=C.automatic("paniclog.buf",(1*256));
            let now=C.getnow();
            let uid=C.i32(C.getuid());
            let playmode=C.i8((C.i32(C.field(C.flags,"flag","debug").value)?68:(C.i32(C.field(C.flags,"flag","explore").value)?88:45)));
            C.variadic(43,lfile,C.literal("%s %08ld %06ld %d %c: %s %s\n"),C.version_string(buf,BigInt((1*256))),C.yyyymmdd(now),C.hhmmss(now),uid,C.i32(playmode),type,reason);
            /* !PANICLOG_FMT2 */
            C.fclose(lfile);
        }
        (C.field(C.program_state,"sinfo","in_paniclog").value=0);
    }
    /* PANICLOG */
    return;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

export function testinglog(filenm,type,reason)
{
    filenm=C.ptr(filenm);
    type=C.ptr(type);
    reason=C.ptr(reason);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["testinglog.fnbuf",(1*256)]]);
    try {
    /* ad hoc file name */
    /* explanation */
    let lfile;
    let fnbuf=C.automatic("testinglog.fnbuf",(1*256));
    if(Number(!(filenm))) return;
    C.strcpy(fnbuf,filenm);
    if(Number(C.strchr(fnbuf,46)==0)) C.strcat(fnbuf,C.literal(".log"));
    (lfile=fopen_datafile(fnbuf,C.literal("a"),9));
    if(lfile) {
        C.variadic(44,lfile,C.literal("%s\n%s\n"),type,reason);
        C.fclose(lfile);
    }
    return;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/* ----------  END PANIC/IMPOSSIBLE/TESTING LOG ----------- */
/* ----------  BEGIN INTERNAL RECOVER ----------- */
/* version.c */
/* level 0 file contains:
     *  pid of creating process (ignored here)
     *  level number for current level of save file
     *  name of save file nethack would have created
     *  player name
     *  and game state
     */
/* this indicates a .0 file that was created as part of
         * recover that did not complete. There could be an intact
         * savefile already there. Check for that and return TRUE
         * if there is. */
/* savefile doesn't exist, so fall through */
/* save file should contain:
     *  format indicator (1 byte)
     *  n = count of critical size list (1 byte)
     *  n bytes of critical sizes (n bytes)
     *  version info
     *  plnametmp = player name size (int, 2 bytes)
     *  player name (PL_NSIZ_PLUS)
     *  current level (including pets)
     *  (non-level-based) game state
     *  other levels
     */
/*
     *
     * Set a flag for the savefile routines to know the
     * circumstances and act accordingly:
     *    program_state.in_self_recover
     */
/* TODO: this is not a single byte, so a big-endian byte swap
     * might be necessary here, if anyone is concerned about big-endian */
/* level numbers are kept in xint8's in save.c, so the
         * maximum level number (for the endlevel) must be < 256
         */
/* any or all of these may not exist */
/*
     * We have a successful savefile!
     * Only now do we erase the level files.
     */
/* we don't clear program_state.in_self_recover here, we
       leave it as a flag to reload the structlevel savefile
       in the caller. The caller should then clear it. */
/* ----------  END INTERNAL RECOVER ----------- */
/*SELF_RECOVER*/
/* ----------  OTHER ----------- */
export function do_deferred_showpaths(code)
{
    code=C.i32(code);
    (C.field(C.gd,"instance_globals_d","deferred_showpaths").value=C.i8(0));
    reveal_paths(code);
    /* cleanup before heading to an exit */
    C.freedynamicdata();
    ;
    C.l_nhcore_done();
    C.after_opt_showpaths(C.field(C.gd,"instance_globals_d","deferred_showpaths_dir").value);
}

/* !SFCTOOL */
/* used by debugpline() to decide whether to issue a message
 * from a particular source file; caller passes __FILE__ and we check
 * whether it is in the source file list supplied by SYSCF's DEBUGFILES
 *
 * pass FALSE to override wildcard matching; useful for files
 * like dungeon.c and questpgr.c, which generate a ridiculous amount of
 * output if DEBUG is defined and effectively block the use of a wildcard */
export function debugcore(filename,wildcards)
{
    filename=C.ptr(filename);
    wildcards=C.i8(wildcards);
    let debugfiles; let p;
    /* debugpline() messages might disclose information that the player
       doesn't normally get to see, so only display them in wizard mode */
    if(Number(!(C.field(C.flags,"flag","debug").value))) return C.i8(0);
    if(Number(!!(Number(!(filename))||Number(!(C.cell(filename,"char").value))))) return C.i8(0);
    /* sanity precaution */
    (debugfiles=C.field(C.sysopt,"sysopt_s","debugfiles").value);
    /* usual case: sysopt.debugfiles will be empty */
    if(Number(!!(Number(!(debugfiles))||Number(!(C.cell(debugfiles,"char").value))))) return C.i8(0);
    /* strip filename's path if present */
    (filename=nh_basename(filename,C.i8(1)));
    /*
     * Wildcard match will only work if there's a single pattern (which
     * might be a single file name without any wildcarding) rather than
     * a space-separated list.
     * [to NOT do: We could step through the space-separated list and
     * attempt a wildcard match against each element, but that would be
     * overkill for the intended usage.]
     */
    if(Number(!!(C.i32(wildcards)&&C.i32(C.pmatch(debugfiles,filename))))) return C.i8(1);
    /* check whether filename is an element of the list */
    if(Number(((p=C.strstr(debugfiles,filename)))!=0)) {
        let l=C.i32(C.strlen(filename));
        if(Number(!!((Number(!!(Number(!!(Number(p==debugfiles)||Number(C.i32(C.cell((p+Number(C.i32((-1)))*1),"char").value)==32)))||Number(C.i32(C.cell((p+Number(C.i32((-1)))*1),"char").value)==47))))&&(Number(!!(Number(C.i32(C.cell((p+Number(l)*1),"char").value)==32)||Number(C.i32(C.cell((p+Number(l)*1),"char").value)==0))))))) return C.i8(1);
    }
    return C.i8(0);
}

/*DEBUG*/
export function reveal_paths(code)
{
    code=C.i32(code);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["reveal_paths.buf",(1*256)],["reveal_paths.cwdbuf",(1*4096)]]);
    try {
    let skip_sysopt=C.i8(0);
    let fqn; let nodumpreason;
    let buf=C.automatic("reveal_paths.buf",(1*256));
    let filep;
    let gamename=((Number(!!(C.field(C.gh,"instance_globals_h","hname").value&&C.i32(C.cell(C.field(C.gh,"instance_globals_h","hname").value,"char").value))))?C.field(C.gh,"instance_globals_h","hname").value:C.literal("NetHack"));
    let endp; let envp; let cwdbuf=C.automatic("reveal_paths.cwdbuf",(1*4096));
    /* sysconf file */
    (C.cell((buf+Number(0)*1),"char").value=C.i8(0));
    C.variadic(45,C.literal("%s %s%s:"),C.s_suffix(gamename),C.literal("system configuration file"),buf);
    (filep=C.literal("sysconf"));
    (fqn=fqname(filep,7,0));
    if(fqn) {
        C.set_configfile_name(fqn);
        (filep=C.get_configfile());
    }
    C.variadic(46,C.literal("    \"%s\""),filep);
    if(Number(code==1)) {
        C.variadic(47,C.literal("NOTE: The %s above is missing or inaccessible!"),C.literal("system configuration file"));
        (skip_sysopt=C.i8(1));
    }
    /* !SYSCF */
    /* ?SYSCF */
    /* symbols file */
    (C.cell((buf+Number(0)*1),"char").value=C.i8(0));
    /* WIN32 */
    /* PREFIXES_IN_USE */
    /* UNIX */
    (envp=C.getcwd(cwdbuf,C.u64(4096)));
    if(envp) {
        C.callback(7,(C.field(C.windowprocs,"window_procs","win_raw_print").value),C.literal("The loadable symbols file:"));
        C.variadic(48,C.literal("    \"%s/%s\""),envp,C.literal("symbols"));
    }
    /* UNIX */
    /* WIN32 */
    /* PREFIXES_IN_USE */
    /* UNIX */
    /* dlb vs non-dlb */
    (C.cell((buf+Number(0)*1),"char").value=C.i8(0));
    /* PREFIXES_IN_USE */
    /* !DLB */
    C.variadic(49,C.literal("Basic data files%s are in many separate files."),buf);
    /* ?DLB */
    /* dumplog */
    (fqn=0);
    (nodumpreason=C.literal("not supported"));
    /* !SYSCF */
    /* ?SYSCF */
    /* ?DUMPLOG */
    /* an empty value for pd indicates that portable_device_paths
               got set TRUE in a sysconf file other than the one containing
               the executable; disregard it */
    /* personal configuration file */
    (C.cell((buf+Number(0)*1),"char").value=C.i8(0));
    /* PREFIXES_IN_USE */
    C.variadic(50,C.literal("Your personal configuration file%s:"),buf);
    (C.cell((buf+Number(0)*1),"char").value=C.i8(0));
    if(Number(((envp=C.nh_getenv(C.literal("HOME"))))!=0)) {
        C.copynchars(buf,envp,C.i32((C.i32((C.i32(BigInt((1*256)))-1))-1)));
        C.strcat(buf,C.literal("/"));
    }
    (endp=C.eos(buf));
    C.copynchars(endp,C.get_default_configfile(),C.i32((C.u64((C.u64((BigInt((1*256))-C.u64(1)))-C.strlen(buf))))));
    /* UNIX+__APPLE__ => MacOSX aka OSX aka macOS */
    /* 4: R_OK, -1: failure */
    /* read access to default failed; might be protected excessively
               but more likely it doesn't exist; try first alternate:
               "$HOME/Library/Pref..."; 'endp' points past '/' */
    /* first alternate failed, try second:
                   ".../NetHack Defaults.txt"; no 'endp', just append */
    /* second alternate failed too, so revert to the
                       original default ("$HOME/.nethackrc") for message */
    /* __APPLE__ */
    C.variadic(51,C.literal("    \"%s\""),buf);
    /* !UNIX */
    /* ?UNIX */
    C.callback(8,(C.field(C.windowprocs,"window_procs","win_raw_print").value),C.literal(""));
    ((skip_sysopt));
    ((nodumpreason));
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/* ----------  BEGIN TRIBUTE ----------- */
/* 3.6 tribute code
 */
/* 20 */
/* choose a random passage that hasn't been chosen yet; once all have
   been chosen, reset the tracking to make all passages available again */
export function choose_passage(passagecnt,oid)
{
    passagecnt=C.i32(passagecnt);
    oid=C.u32(oid);
    /* total of available passages */
    /* book.o_id, used to determine whether
                                  re-reading same book */
    let idx; let res;
    if(Number(passagecnt<1)) return 0;
    /* if a different book or we've used up all the passages already,
       reset in order to have all 'passagecnt' passages available */
    if(Number(!!(Number(oid!=C.field(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","novel").address,"novel_tracking","id").value)||Number(C.field(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","novel").address,"novel_tracking","count").value==0)))) {
        let i; let range=passagecnt; let limit=C.i32((C.u64((BigInt((1*30))/BigInt(1)))));
        (C.field(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","novel").address,"novel_tracking","id").value=oid);
        if(Number(range<=limit)) {
            /* collect all of the N indices */
            (C.field(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","novel").address,"novel_tracking","count").value=passagecnt);
            for((idx=0);Number(idx<C.i32((C.u64((BigInt((1*30))/BigInt(1))))));((idx=C.i32((idx+1)))-1)) (C.cell((C.field(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","novel").address,"novel_tracking","pasg").address+Number(idx)*1),"signed char").value=C.i8(C.i16((((Number(idx<passagecnt))?C.i32((idx+1)):0)))));

        } else {
            /* collect MAXPASSAGES of the N indices */
            (C.field(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","novel").address,"novel_tracking","count").value=C.i32((C.u64((BigInt((1*30))/BigInt(1))))));
            for((idx=(i=0));Number(i<passagecnt);((i=C.i32((i+1))),(range=C.i32((range-1))))) if(Number(!!(Number(range>0)&&Number(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("files.c"),3461,(C.literal("choose_passage"))),C.rn2(range))):C.rn2(range)))<limit)))) {
                (C.cell((C.field(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","novel").address,"novel_tracking","pasg").address+Number(((idx=C.i32((idx+1)))-1))*1),"signed char").value=C.i8(C.i16((C.i32((i+1))))));
                (limit=C.i32((limit-1)));
            }

        }
    }
    (idx=((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("files.c"),3468,(C.literal("choose_passage"))),C.rn2(C.field(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","novel").address,"novel_tracking","count").value))):C.rn2(C.field(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","novel").address,"novel_tracking","count").value))));
    (res=C.i32(C.cell((C.field(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","novel").address,"novel_tracking","pasg").address+Number(idx)*1),"signed char").value));
    /* move the last slot's passage index into the slot just used
       and reduce the number of passages available */
    (C.cell((C.field(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","novel").address,"novel_tracking","pasg").address+Number(idx)*1),"signed char").value=C.cell((C.field(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","novel").address,"novel_tracking","pasg").address+Number((C.field(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","novel").address,"novel_tracking","count").value=C.i32((C.field(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","novel").address,"novel_tracking","count").value-1))))*1),"signed char").value);
    return res;
}

/* Returns True if you were able to read something. */
export function read_tribute(tribsection,tribtitle,tribpassage,nowin_buf,bufsz,oid)
{
    tribsection=C.ptr(tribsection);
    tribtitle=C.ptr(tribtitle);
    tribpassage=C.i32(tribpassage);
    nowin_buf=C.ptr(nowin_buf);
    bufsz=C.i32(bufsz);
    oid=C.u32(oid);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["read_tribute.line",(1*256)],["read_tribute.lastline",(1*256)]]);
    try {
    /* book identifier */
    let fp;
    let line=C.automatic("read_tribute.line",(1*256)); let lastline=C.automatic("read_tribute.lastline",(1*256));
    let scope=0;
    let linect=0; let passagecnt=0; let targetpassage=0;
    let badtranslation=C.literal("an incomprehensible foreign translation");
    let matchedsection=C.i8(0); let matchedtitle=C.i8(0);
    let tribwin=(C.i32((-1)));
    let grasped=C.i8(0);
    let foundpassage=C.i8(0);
    cleanup: {
    if(nowin_buf) (C.cell(nowin_buf,"char").value=C.i8(0));
    /* check for mandatories */
    if(Number(!!(Number(!(tribsection))||Number(!(tribtitle))))) {
        if(Number(!(nowin_buf))) C.variadic(52,C.literal("It's %s of \"%s\"!"),badtranslation,tribtitle);
        return grasped;
    }
    do {
        if(debugcore(C.literal("files.c"),C.i8(1))) {
            let save_plnmsg=C.field(C.iflags,"instance_flags","last_msg").value;
            C.variadic(53,C.literal("read_tribute %s, %s, %d."),tribsection,tribtitle,tribpassage);
            (C.field(C.iflags,"instance_flags","last_msg").value=save_plnmsg);
        }
    } while(0);
    (fp=C.fopen(C.literal("tribute"),C.literal("r")));
    if(Number(!(fp))) {
        /* this is actually an error - cannot open tribute file! */
        if(Number(!(nowin_buf))) C.variadic(54,C.literal("too overwhelmed to continue!"));
        return grasped;
    }
    /*
     * Syntax (not case-sensitive):
     *  %section books
     *
     * In the books section:
     *    %title booktitle (n)
     *          where booktitle=book title without quotes
     *          (n)= total number of passages present for this title
     *    %passage k
     *          where k=sequential passage number
     *
     * %e ends the passage/book/section
     *    If in a passage, it marks the end of that passage.
     *    If in a book, it marks the end of that book.
     *    If in a section, it marks the end of that section.
     *
     *  %section death
     */
    (C.cell(line,"char").value=(C.cell(lastline,"char").value=C.i8(0)));
    while(Number(C.fgets(line,C.i32(BigInt((1*256))),fp)!=0)) {
        ((linect=C.i32((linect+1)))-1);
        C.strip_newline(line);
        switch(C.i32(C.cell((line+Number(0)*1),"char").value)) {
            case (37):
                if(Number(!(C.strncmpi((line+Number(1)*1),C.literal("section "),C.i32(C.u64((BigInt((1*9))-C.u64(1)))))))) {
                    let st=(line+Number(9)*1);
                    /* 9 from "%section " */
                    (scope=1);
                    (matchedsection=C.i8((Number(!(C.strncmpi((st),(tribsection),C.i32((-1)))))?1:0)));
                } else if(Number(!(C.strncmpi((line+Number(1)*1),C.literal("title "),C.i32(C.u64((BigInt((1*7))-C.u64(1)))))))) {
                    let st=(line+Number(7)*1);
                    /* 7 from "%title " */
                    let p1; let p2;
                    if(Number(((p1=C.strchr(st,40)))!=0)) {
                        (C.cell(((p1=C.ptr((p1+Number(1))))-Number(1)),"char").value=C.i8(0));
                        C.mungspaces(st);
                        if(Number(((p2=C.strchr(p1,41)))!=0)) {
                            (C.cell(p2,"char").value=C.i8(0));
                            (passagecnt=C.atoi(p1));
                            (scope=2);
                            if(Number(!!(C.i32(matchedsection)&&Number(!(C.strncmpi((st),(tribtitle),C.i32((-1)))))))) {
                                (matchedtitle=C.i8(1));
                                (targetpassage=(Number(!(tribpassage))?choose_passage(passagecnt,oid):((Number(tribpassage<=passagecnt))?tribpassage:0)));
                            } else {
                                (matchedtitle=C.i8(0));
                            }
                        }
                    }
                } else if(Number(!(C.strncmpi((line+Number(1)*1),C.literal("passage "),C.i32(C.u64((BigInt((1*9))-C.u64(1)))))))) {
                    let passagenum=0;
                    let st=(line+Number(9)*1);
                    /* 9 from "%passage " */
                    C.mungspaces(st);
                    (passagenum=C.atoi(st));
                    if(Number(!!(Number(passagenum>0)&&Number(passagenum<=passagecnt)))) {
                        (scope=3);
                        if(Number(!!(C.i32(matchedtitle)&&Number(passagenum==targetpassage)))) {
                            (foundpassage=C.i8(1));
                            if(Number(!(nowin_buf))) {
                                (tribwin=C.callback(9,(C.field(C.windowprocs,"window_procs","win_create_nhwindow").value),4));
                                if(Number(tribwin==(C.i32((-1))))) break cleanup; /* source goto cleanup */
                            }
                        }
                    }
                } else if(Number(!(C.strncmpi((line+Number(1)*1),C.literal("e "),C.i32(C.u64((BigInt((1*3))-C.u64(1)))))))) {
                    if(foundpassage) break cleanup; /* source goto cleanup */
                    if(Number(scope==2)) (matchedtitle=C.i8(0));
                    if(Number(scope==1)) (matchedsection=C.i8(0));
                    if(scope) (scope=C.i32((scope-1)));
                } else {
                    do {
                        if(debugcore(C.literal("files.c"),C.i8(1))) {
                            let save_plnmsg=C.field(C.iflags,"instance_flags","last_msg").value;
                            C.variadic(55,C.literal("tribute file error: bad %% command, line %d."),linect);
                            (C.field(C.iflags,"instance_flags","last_msg").value=save_plnmsg);
                        }
                    } while(0);
                }
            break;
            case (35):
                /* comment only, next! */
                break;
            default:
                if(foundpassage) {
                    if(Number(!(nowin_buf))) {
                        /* outputting multi-line passage to text window */
                        C.callback(10,(C.field(C.windowprocs,"window_procs","win_putstr").value),tribwin,0,line);
                        if(C.cell(line,"char").value) C.strcpy(lastline,line);
                    } else {
                        /* fetching one-line passage into buffer */
                        C.copynchars(nowin_buf,line,C.i32((bufsz-1)));
                        break cleanup; /* source goto cleanup */
                        /* don't wait for "%e passage" */
                    }
                }
        }
    }
    } /* source cleanup: */
    C.fclose(fp);
    if(nowin_buf) {
        /* one-line buffer */
        (grasped=C.i8((C.i32(C.cell(nowin_buf,"char").value)?1:0)));
    } else {
        if(Number(tribwin!=(C.i32((-1))))) {
            /* implies 'foundpassage' */
            /* multi-line window, normal case;
               if lastline is empty, there were no non-empty lines between
               "%passage n" and "%e passage" so we leave 'grasped' False */
            if(C.cell(lastline,"char").value) {
                let p;
                C.callback(11,(C.field(C.windowprocs,"window_procs","win_display_nhwindow").value),tribwin,C.i8(0));
                /* put the final attribution line into message history,
                   analogous to the summary line from long quest messages */
                if(C.strchr(lastline,91)) C.mungspaces(lastline);
 else C.variadic(56,lastline,C.literal("[%s, by Terry Pratchett]"),tribtitle);
                /* to remove leading spaces */
                /* construct one if necessary */
                if(Number(((p=C.strrchr(lastline,93)))!=0)) C.variadic(57,p,C.literal("; passage #%d]"),targetpassage);
                C.callback(12,(C.field(C.windowprocs,"window_procs","win_putmsghistory").value),lastline,C.i8(0));
                (grasped=C.i8(1));
            }
            C.callback(13,(C.field(C.windowprocs,"window_procs","win_destroy_nhwindow").value),tribwin);
        }
        if(Number(!(grasped))) C.variadic(58,C.literal("It seems to be %s of \"%s\"!"),badtranslation,tribtitle);
        /* multi-line window, problem */
    }
    return grasped;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

export function Death_quote(buf,bufsz)
{
    buf=C.ptr(buf);
    bufsz=C.i32(bufsz);
    let death_oid=C.u32(1);
    /* chance of oid #1 being a novel is negligible */
    return read_tribute(C.literal("Death"),C.literal("Death Quotes"),0,buf,bufsz,death_oid);
}

/* ----------  END TRIBUTE ----------- */
/* !SFCTOOL */
/* livelog field separator, as a string literal */
/* end-of-line, for abstraction consistency */
/* Locks the live log file and writes 'buffer'
 * iff the ll_type matches sysopt.livelog mask.
 * lltype is included in LL entry for post-process filtering also.
 */
export function livelog_add(ll_type,str)
{
    ll_type=C.i64(ll_type);
    str=C.ptr(str);
    let livelogfile;
    let now;
    let gindx; let aindx;
    if(Number(!((C.i64((ll_type&C.field(C.sysopt,"sysopt_s","livelog").value)))))) return;
    if(lock_file(C.literal("livelog"),5,10)) {
        if(Number(!(((livelogfile=fopen_datafile(C.literal("livelog"),C.literal("a"),5)))))) {
            C.variadic(59,C.literal("Cannot open live log file!"));
            unlock_file(C.literal("livelog"));
            return;
        }
        (now=C.getnow());
        (gindx=(C.i32(C.field(C.flags,"flag","female").value)?1:0));
        /* note on alignment designation:
               aligns[] uses [0] lawful, [1] neutral, [2] chaotic;
               u.ualign.type uses -1 chaotic, 0 neutral, 1 lawful;
           so subtracting from 1 converts from either to the other */
        (aindx=C.i32((1-C.i32(C.field(C.field(C.u,"you","ualign").address,"align","type").value))));
        /* format relies on STD C's implicit concatenation of
           adjacent string literals */
        C.variadic(60,livelogfile,C.literal("lltype=%ld\tname=%s\trole=%s\trace=%s\tgender=%s\talign=%s\tturns=%ld\tstarttime=%ld\tcurtime=%ld\tmessage=%s\n"),(C.i64((ll_type&C.field(C.sysopt,"sysopt_s","livelog").value))),C.field(C.svp,"instance_globals_saved_p","plname").address,C.field(C.field(C.gu,"instance_globals_u","urole").address,"Role","filecode").value,C.field(C.field(C.gu,"instance_globals_u","urace").address,"Race","filecode").value,C.field((C.genders+Number(gindx)*C.sizes["struct Gender"]),"Gender","filecode").value,C.field((C.aligns+Number(aindx)*C.sizes["struct Align"]),"Align","filecode").value,C.field(C.svm,"instance_globals_saved_m","moves").value,C.timet_to_seconds(C.global("ubirthday").value),C.timet_to_seconds(now),str);
        C.fclose(livelogfile);
        unlock_file(C.literal("livelog"));
    }
}

/* nothing here */
/* !LIVELOG */
/*files.c*/
export const filesStaticInitializers = C => [
    {name:"nh_basename.basebuf",type:"char[80]",size:(1*80),values:null},
    {name:"fname_encode.hexdigits",type:"char[17]",size:(1*17),values:C.literal("0123456789ABCDEF")},
    {name:"fname_decode.hexdigits",type:"char[17]",size:(1*17),values:C.literal("0123456789ABCDEF")},
    {name:"bei",type:"int",size:4,values:1},
    {name:"sf2msg",type:"struct sfstatus_to_msg[10]",size:(C.sizes["struct sfstatus_to_msg"]*10),values:[[0,C.literal("everything matches")],[1,C.literal("outdated savefile")],[2,C.literal("savefile critical byte-count mismatch")],[3,C.literal("Windows x64 savefile on x86")],[4,C.literal("Unix 64 savefile on x86")],[5,C.literal("x86 savefile on Unix 64")],[6,C.literal("x86 savefile on Windows x64")],[7,C.literal("Unix 64 savefile on Windows x64")],[8,C.literal("Windows x64 savefile on Unix 64")],[9,C.literal("generic savefile mismatch")]]},
    {name:"cvtinit",type:"signed char",size:1,values:C.i8(0)},
    {name:"unconverted_filename",type:"char *",size:8,values:0},
    {name:"converted_filename",type:"char *",size:8,values:0},
    {name:"lockfd",type:"int",size:4,values:C.i32((-1))},
    {name:"sflock",type:"struct flock",size:C.sizes["struct flock"],values:null},
];
