import { C } from './c-runtime.js';
/* NetHack 5.0	unixunix.c	$NHDT-Date: 1711213894 2024/03/23 17:11:34 $  $NHDT-Branch: NetHack-5.0 $:$NHDT-Revision: 1.43 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Kenneth Lorber, Kensington, Maryland, 2015. */
/* NetHack may be freely redistributed.  See license for details. */
/* This file collects some Unix dependencies */
/* mainly for strchr() which depends on BSD */
/* see whether we should throw away this xlock file;
   if yes, close it, otherwise leave it open */
export function veryold(fd)
{
    fd=C.i32(fd);
    const stackFrame=C.stackSave();
    try {
    let date=C.local("long long");
    if(C.fstat(fd,C.staticAddress("buf"))) return 0;
    /* cannot get status */
    /* not an xlock file */
    C.time(date.address);
    if(Number(C.i64((date.value-C.field(C.field(C.staticAddress("buf"),"stat","st_mtim").address,"timespec","tv_sec").value))<C.i64(C.i64((C.i64((C.i64((3n*24n))*60n))*60n))))) {
        /* recent */
        let lockedpid=C.local("int");
        /* should be the same size as hackpid */
        if(Number(C.u64(C.read(fd,lockedpid.address,BigInt(4)))!=BigInt(4))) return 0;
        /* strange ... */
        /* From: Rick Adams <seismo!rick> */
        /* This will work on 4.1cbsd, 4.2bsd and system 3? & 5. */
        /* It will do nothing on V7 or 4.1bsd. */
        /* It will do a VERY BAD THING if the playground is shared
           by more than one machine! -pem */
        return 0;
    }
    /* this used to close the file upon success, leave it open upon failure;
       that was supposed to simplify the caller's usage but ended up making
       that be more complicated; always leave the file open so that caller
       can close it unconditionally */
    /*(void) close(fd);*/
    return 1;
    } finally {C.stackRestore(stackFrame); }
}

export function eraseoldlocks()
{
    let i;
    (C.field(C.program_state,"sinfo","preserve_locks").value=0);
    /* not required but shows intent */
    /* cannot use maxledgerno() here, because we need to find a lock name
     * before starting everything (including the dungeon initialization
     * that sets astral_level, needed for maxledgerno()) up
     */
    for((i=1);Number(i<=C.i32((C.i32((16*32))+1)));(()=>{const __old=i;i=C.i32((__old+1));return __old;})()) {
        /* try to remove all */
        C.set_levelfile_name(C.field(C.gl,"instance_globals_l","lock").address,i);
        C.unlink(C.fqname(C.field(C.gl,"instance_globals_l","lock").address,1,0));
    }
    C.set_levelfile_name(C.field(C.gl,"instance_globals_l","lock").address,0);
    if(C.unlink(C.fqname(C.field(C.gl,"instance_globals_l","lock").address,1,0))) return 0;
    /* cannot remove it */
    return 1;
    /* success! */
}

export function getlock()
{
    
    let i=0; let fd; let c; let too_old;
    let fq_lock;
    /* idea from rpick%ucqais@uccba.uc.edu
     * prevent automated rerolling of characters
     * test input (fd0) so that tee'ing output to get a screen dump still
     * works
     * also incidentally prevents development of any hack-o-matic programs
     */
    /* added check for window-system type -dlc */
    if(Number(!(C.strcmp(C.field(C.windowprocs,"window_procs","name").value,C.literal("tty"))))) if(Number(!!(Number(!(C.isatty(0)))&&Number(!(C.getenv(C.literal("NOMUX_MARKERS"))))))) C.variadic(0,C.literal("You must play from a terminal."));
    /* we ignore QUIT and INT at this point */
    if(Number(!(C.lock_file(C.literal("perm"),6,10)))) {
        C.indirect(0,(C.field(C.windowprocs,"window_procs","win_wait_synch").value));
        C.variadic(1,C.literal("%s"),C.literal(""));
    }
    /* default value of gl.lock[] is "1lock" where '1' gets changed to
       'a','b',&c below; override the default and use <uid><charname>
       if we aren't restricting the number of simultaneous games */
    if(Number(!(C.field(C.gl,"instance_globals_l","locknum").value))) C.variadic(2,C.field(C.gl,"instance_globals_l","lock").address,C.literal("%u%s"),C.getuid(),C.field(C.svp,"instance_globals_saved_p","plname").address);
    regularize(C.field(C.gl,"instance_globals_l","lock").address);
    C.set_levelfile_name(C.field(C.gl,"instance_globals_l","lock").address,0);
    gotlock: {
        if(C.field(C.gl,"instance_globals_l","locknum").value) {
            if(Number(C.field(C.gl,"instance_globals_l","locknum").value>25)) (C.field(C.gl,"instance_globals_l","locknum").value=25);
            do {
                (C.cell((C.field(C.gl,"instance_globals_l","lock").address+Number(0)*1),"char").value=C.i8(C.i32((97+(()=>{const __old=i;i=C.i32((__old+1));return __old;})()))));
                (fq_lock=C.fqname(C.field(C.gl,"instance_globals_l","lock").address,1,0));
                if(Number(((fd=C.variadic(3,fq_lock,0)))==C.i32((-1)))) {
                    if(Number((C.cell(C.__errno_location(),"int").value)==(44))) break gotlock; /* original goto gotlock */
                    /* no such file */
                    C.perror(fq_lock);
                    C.unlock_file(C.literal("perm"));
                    C.variadic(4,C.literal("Cannot open %s"),fq_lock);
                }
                /* veryold() no longer conditionally closes fd */
                (too_old=veryold(fd));
                C.close(fd);
                if(Number(!!(too_old&&eraseoldlocks()))) break gotlock; /* original goto gotlock */
            } while(Number(i<C.field(C.gl,"instance_globals_l","locknum").value));
            C.unlock_file(C.literal("perm"));
            C.variadic(5,C.literal("Too many hacks running now."));
        } else {
            (fq_lock=C.fqname(C.field(C.gl,"instance_globals_l","lock").address,1,0));
            if(Number(((fd=C.variadic(6,fq_lock,0)))==C.i32((-1)))) {
                if(Number((C.cell(C.__errno_location(),"int").value)==(44))) break gotlock; /* original goto gotlock */
                /* no such file */
                C.perror(fq_lock);
                C.unlock_file(C.literal("perm"));
                C.variadic(7,C.literal("Cannot open %s"),fq_lock);
            }
            /* veryold() no longer conditionally closes fd */
            (too_old=veryold(fd));
            C.close(fd);
            if(Number(!!(too_old&&eraseoldlocks()))) break gotlock; /* original goto gotlock */
            /* drop the "perm" lock while the user decides */
            C.unlock_file(C.literal("perm"));
            if(C.field(C.iflags,"instance_flags","window_inited").value) {
                /* this is a candidate for paranoid_confirmation */
                (c=C.i32(C.yn_function(C.staticAddress("getlock.destroy_old_game_prompt"),C.ynchars,C.i8(110),(C.i8(1)))));
            } else {
                C.variadic(8,C.literal("\n%s [yn] "),C.staticAddress("getlock.destroy_old_game_prompt"));
                C.fflush((C.global("stdout").value));
                if(Number(((c=C.getchar()))!=(C.i32((-1))))) {
                    let tmp;
                    C.putchar(c);
                    C.fflush((C.global("stdout").value));
                    while(Number(!!(Number(((tmp=C.getchar()))!=10)&&Number(tmp!=(C.i32((-1))))))) ;

                    /* eat rest of line and newline */
                }
            }
            if(Number(!!(Number(c==121)||Number(c==89)))) {
                if(eraseoldlocks()) {
                    break gotlock; /* original goto gotlock */
                } else {
                    C.unlock_file(C.literal("perm"));
                    C.variadic(9,C.literal("Couldn't destroy old game."));
                }
            } else {
                C.unlock_file(C.literal("perm"));
                C.variadic(10,C.literal("%s"),C.literal(""));
            }
        }
    }
    /* original label gotlock */
    (fd=C.creat(fq_lock,C.u32(432)));
    C.unlock_file(C.literal("perm"));
    if(Number(fd==C.i32((-1)))) {
        C.variadic(11,C.literal("cannot creat lock file (%s)."),fq_lock);
        /*NOTREACHED*/
    } else {
        if(Number(C.u64(C.write(fd,C.field(C.svh,"instance_globals_saved_h","hackpid").address,BigInt(4)))!=BigInt(4))) {
            C.variadic(12,C.literal("cannot write lock (%s)"),fq_lock);
            /*NOTREACHED*/
        }
        if(Number(C.close(fd)==C.i32((-1)))) {
            C.variadic(13,C.literal("cannot close lock (%s)"),fq_lock);
            /*NOTREACHED*/
        }
    }
}

/* caller couldn't find a regular save file but did find a panic one */
export function ask_about_panic_save()
{
    
    let c=0;
    C.variadic(14,C.literal("There is no regular save file but there is a panic one."));
    C.variadic(15,C.literal("It might be recoverable with demi-divine intervention."));
    if(C.field(C.iflags,"instance_flags","window_inited").value) {
        (c=C.i32(C.yn_function(C.staticAddress("ask_about_panic_save.Instead_prompt"),C.literal("yn\u001bq"),C.i8(110),(C.i8(0)))));
    } else {
        C.variadic(16,C.literal("%s [yn] (n) "),C.staticAddress("ask_about_panic_save.Instead_prompt"));
        C.fflush((C.global("stdout").value));
        do {
            (c=C.getchar());
            if(Number(!!(Number(!!(Number(c==(C.i32((-1))))||Number(c==27)))||Number(c==0)))) break;
            (c=C.i32(C.lowc(C.i8(c))));
        } while(Number(!(C.strchr(C.literal("ynq\n"),c))));
    }
    if(Number(c!=121)) {
        /* caller successfully called getlock() and made <levelfile>.0 */
        C.delete_levelfile(0);
        C.unlock_file(C.literal("perm"));
        /* just in case, release 'perm' */
        if(C.field(C.iflags,"instance_flags","window_inited").value) C.indirect(1,(C.field(C.windowprocs,"window_procs","win_exit_nhwindows").value),0);
        C.nh_terminate(0);
    }
    return;
    /* proceed with new game */
}

/* normalize file name - we don't like .'s, /'s, spaces */
export function regularize(s)
{
    s=C.ptr(s);
    let lp;
    while(Number(!!(Number(!!(Number(((lp=C.strchr(s,46)))!=0)||Number(((lp=C.strchr(s,47)))!=0)))||Number(((lp=C.strchr(s,32)))!=0)))) (C.cell(lp,"char").value=C.i8(95));

    /* avoid problems with 14 character file name limit */
    /* leave room for .e from error and .Z from compress appended to
     * save files */
    /* should never happen... */
    /* leave room for .nn appended to level files */
}

/* milliseconds */
/* poll API is signed */
/* avoid infinite sleep */
/* TIMED_DELAY for SYSV */
export function dosh()
{
    let str;
    if(Number(!!(Number(!!(Number(!(C.field(C.sysopt,"sysopt_s","shellers").value))||Number(!(C.cell((C.field(C.sysopt,"sysopt_s","shellers").value+Number(0)*1),"char").value))))||Number(!(C.check_user_string(C.field(C.sysopt,"sysopt_s","shellers").value)))))) {
        /* FIXME: should no longer assume a particular command keystroke */
        C.variadic(17,C.literal("Unavailable command '!'."));
        return 0;
    }
    if(child(0)) {
        if(Number(((str=C.getenv(C.literal("SHELL"))))!=0)) C.variadic(18,str,str,0);
 else C.variadic(19,C.literal("/bin/sh"),C.literal("sh"),0);
        C.indirect(2,(C.field(C.windowprocs,"window_procs","win_raw_print").value),C.literal("sh: cannot execute."));
        C.exit(1);
    }
    return 0;
}

/* SHELL */
export function child(wt)
{
    wt=C.i32(wt);
    let f;
    C.indirect(3,(C.field(C.windowprocs,"window_procs","win_suspend_nhwindows").value),0);
    /* also calls end_screen() */
    if(Number(((f=C.fork()))==0)) {
        /* child */
        C.setgid(C.getgid());
        C.setuid(C.getuid());
        C.chdir(C.getenv(C.literal("HOME")));
        return 1;
    }
    if(Number(f==C.i32((-1)))) {
        /* cannot fork */
        C.variadic(20,C.literal("Fork failed.  Try again."));
        return 0;
    }
    /* fork succeeded; wait for child to exit */
    C.teleport_native_signal(2,(C.ptr(1)));
    C.teleport_native_signal(3,(C.ptr(1)));
    C.wait(0);
    C.teleport_native_signal(2,C.nativeFunctionPointer("done1"));
    if(C.field(C.flags,"flag","debug").value) C.teleport_native_signal(3,(0));
    if(wt) {
        C.indirect(4,(C.field(C.windowprocs,"window_procs","win_raw_print").value),C.literal(""));
        C.indirect(5,(C.field(C.windowprocs,"window_procs","win_wait_synch").value));
    }
    C.indirect(6,(C.field(C.windowprocs,"window_procs","win_resume_nhwindows").value));
    return 0;
}

/* SHELL || DEF_PAGER || DEF_MAILREADER */
/* the following several functions assume __STDC__ where parentheses
   around the name of a function-like macro prevent macro expansion */
/* GETRES_SUPPORT */
/* XXX should be ifdef PANICTRACE_GDB, but there's no such symbol yet */
export function file_exists(path)
{
    path=C.ptr(path);
    const stackFrame=C.stackSave();
    try {
    let sb=C.stackAlloc(C.sizes["struct stat"]);
    /* Just see if it's there - trying to figure out if we can actually
     * execute it in all cases is too hard - we really just want to
     * catch typos in SYSCF.
     */
    if(C.stat(path,sb)) {
        return (C.i8(0));
    }
    return (C.i8(1));
    } finally {C.stackRestore(stackFrame); }
}

/*unixunix.c*/
export const unixunixStaticInitializers = C => [
    {name:"buf",type:"struct stat",size:C.sizes["struct stat"],values:0},
    {name:"getlock.destroy_old_game_prompt",type:"char[72]",size:(1*72),values:C.literal("There is already a game in progress under your name.  Destroy old game?")},
    {name:"ask_about_panic_save.Instead_prompt",type:"char[26]",size:(1*26),values:C.literal("Start a new game instead?")},
];
