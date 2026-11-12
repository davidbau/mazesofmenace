/* NetHack 5.0	ioctl.c	$NHDT-Date: 1596498280 2020/08/03 23:44:40 $  $NHDT-Branch: NetHack-5.0 $:$NHDT-Revision: 1.15 $ */

/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */

/*-Copyright (c) Kenneth Lorber, Kensington, Maryland, 2015. */

/* NetHack may be freely redistributed.  See license for details. */


/* This cannot be part of hack.tty.c (as it was earlier) since on some
   systems (e.g. MUNIX) the include files <termio.h> and <sgtty.h>
   define the same constants, and the C preprocessor complains. */


import { C } from '../c-runtime/context.js';

/* JavaScript translation of ioctl.c for the effective POSIX game build.
 * All four active function boundaries remain unchanged. The original
 * native getwindowsz body queries the terminal and retains each old dimension
 * when the returned dimension is zero. C retains shared terminal storage;
 * the JS transport converts the native ABI to the SDK ABI at actual I/O calls.
 * Signal-handler sentinels remain generated uint64 BigInt values, preserving
 * SIG_IGN's actual bits. Other OS branches and catch_stp remain explicitly
 * inactive/unported C comments below, not replacement terminal support.
 */

// #include "hack.h"

// #if defined(BSD_JOB_CONTROL) || defined(_BULL_SOURCE)
// #ifdef HPUX
// #include <bsdtty.h>
// #else
// #if defined(AIX_31) && !defined(_ALL_SOURCE)
// #define _ALL_SOURCE 
/* causes struct winsize to be present */

// #ifdef _AIX32
// #include <sys/ioctl.h>
// #endif
// #endif
// #if defined(_BULL_SOURCE)
// #include <termios.h>
// struct termios termio;
// #undef TIMEOUT            
/* defined in you.h and sys/tty.h */

// #include <sys/tty.h>      
/* define winsize */

// #include <sys/ttold.h>    
/* define struct ltchars */

// #include <sys/bsdioctl.h> 
/* define TIOGWINSZ */

// #else
// #ifdef LINUX
// #include <bsd/sgtty.h>
// #else
// #include <sgtty.h>
// #endif
// #endif
// #endif
// struct ltchars ltchars;
// struct ltchars ltchars0 = { -1, -1, -1, -1, -1, -1 }; 
/* turn all off */

// #else

// #ifdef POSIX_TYPES
// #include <termios.h>
// struct termios termio;
// #if defined(BSD) || defined(_AIX32) || defined(__linux__)
// #if defined(_AIX32) && !defined(_ALL_SOURCE)
// #define _ALL_SOURCE
// #endif
// #include <sys/ioctl.h>
// #endif
// #else
// #include <termio.h> 
/* also includes part of <sgtty.h> */

// #if defined(TCSETS) && !defined(AIX_31)
// struct termios termio;
// #else
// struct termio termio;
// #endif
// #endif
// #if defined(AMIX) || defined(__APPLE__)
// #include <sys/ioctl.h>
// #endif 
/* AMIX */

// #endif

// #ifdef SUSPEND 
/* BSD isn't alone anymore... */

// #include <signal.h>
// #endif

/* AVOID_WIN_IOCTL can be uncommented in unixconf.h
 * to force USE_WIN_IOTCL to remain undefined,
 * instead of the restricted explicit opt-in
 * logic that used to be here.
 */

// #if defined(TIOCGWINSZ) && !defined(AVOID_WIN_IOCTL)
// #define USE_WIN_IOCTL
// #include "tcap.h" 
/* for LI and CO */

// #endif

// #ifdef _M_UNIX
// extern void sco_mapon(void);
// extern void sco_mapoff(void);
// #endif
// #ifdef __linux__
// extern void linux_mapon(void);
// extern void linux_mapoff(void);
// #endif

// #ifdef AUX
// void
// catch_stp(void)
// {
//     signal(SIGTSTP, SIG_DFL);
//     dosuspend();
// }
// #endif 
/* AUX */


export function getwindowsz()
{
// #ifdef USE_WIN_IOCTL
    
/*
     * ttysize is found on Suns and BSD
     * winsize is found on Suns, BSD, and Ultrix
     */

    const ttsz=C.winsizeLocal();

    if (C.ioctl(C.fileno(C.stdin),C.TIOCGWINSZ,ttsz) != -1) {
        
/*
         * Use the kernel's values for lines and columns if it has
         * any idea.
         */

        if(C.windowRow(ttsz))C.LI=C.windowRow(ttsz);
        if(C.windowColumn(ttsz))C.CO=C.windowColumn(ttsz);
    }
// #endif
}

export function getioctls()
{
// #ifdef BSD_JOB_CONTROL
//     (void) ioctl(fileno(stdin), (int) TIOCGLTC, (char *) &ltchars);
//     (void) ioctl(fileno(stdin), (int) TIOCSLTC, (char *) &ltchars0);
// #else
// #ifdef POSIX_TYPES
    C.tcgetattr(C.fileno(C.stdin), C.termio);
// #else
// #if defined(TCSETS) && !defined(AIX_31)
//     (void) ioctl(fileno(stdin), (int) TCGETS, &termio);
// #else
//     (void) ioctl(fileno(stdin), (int) TCGETA, &termio);
// #endif
// #endif
// #endif
    getwindowsz();
// #ifdef AUX
//     (void) signal(SIGTSTP, catch_stp);
// #endif
}

export function setioctls()
{
// #ifdef BSD_JOB_CONTROL
//     (void) ioctl(fileno(stdin), (int) TIOCSLTC, (char *) &ltchars);
// #else
// #ifdef POSIX_TYPES
    C.tcsetattr(C.fileno(C.stdin), C.TCSADRAIN, C.termio);
// #else
// #if defined(TCSETS) && !defined(AIX_31)
//     (void) ioctl(fileno(stdin), (int) TCSETSW, &termio);
// #else
//     (void) ioctl(fileno(stdin), (int) TCSETAW, &termio);
// #endif
// #endif
// #endif
}

// #ifdef SUSPEND 
/* No longer implies BSD */

export function dosuspend()
{
// #ifdef SYSCF
    
/* NB: check_user_string() is port-specific. */

    if (!C.sysopt.shellers || !C.HEAP8[C.sysopt.shellers]
        || !C.check_user_string(C.sysopt.shellers)) {
        C.Norep("Suspend command not available.");
        return 0;
    }
// #endif
// #if defined(SIGTSTP) && !defined(NO_SIGNAL)
    if (C.signal(C.SIGTSTP, C.SIG_IGN) == C.SIG_DFL) {
        C.suspend_nhwindows(0);
// #ifdef _M_UNIX
//         sco_mapon();
// #endif
// #ifdef __linux__
//         linux_mapon();
// #endif
        C.signal(C.SIGTSTP, C.SIG_DFL);
// #ifdef AUX
//         (void) kill(0, SIGSTOP);
// #else
        C.kill(0, C.SIGTSTP);
// #endif
// #ifdef _M_UNIX
//         sco_mapoff();
// #endif
// #ifdef __linux__
//         linux_mapoff();
// #endif
        C.resume_nhwindows();
    } else {
        C.pline("I don't think your shell has job control.");
    }
// #else
//     pline("Sorry, it seems we have no SIGTSTP here.  Try ! or S.");
// #endif
    return (0);
}
// #endif 
/* SUSPEND */

