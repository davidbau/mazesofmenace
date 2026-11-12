import { C } from '../c-runtime/context.js';

/* JavaScript translation of the effective POSIX unixtty.c. Native termios
 * storage, terminal operations and window callbacks are supplied by the ABI.
 * Struct assignments copy all bytes; inittyb2/curttyb2 retain their original
 * aliases. Compile-time optional control characters use generated metadata.
 * error's existing va_list is represented by its rest parameter and an opaque
 * native va-list packet; its cleanup and output decisions remain here.
 * Inactive V7, SCO and Linux branches below remain unported C comments.
 */

/* NetHack 5.0	unixtty.c	$NHDT-Date: 1596498288 2020/08/03 23:44:48 $  $NHDT-Branch: NetHack-5.0 $:$NHDT-Revision: 1.27 $ */

/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */

/*-Copyright (c) Michael Allison, 2006. */

/* NetHack may be freely redistributed.  See license for details. */


/* tty.c - (Unix) version */


/* With thanks to the people who sent code for SYSV - hpscdi!jon,
 * arnold@ucsf-cgl, wcs@bo95b, cbcephus!pds and others.
 */


// #define NEED_VARARGS
// #include "hack.h"
// #if defined(TTY_GRAPHICS) && !defined(NOTTYGRAPHICS)
// #include "wintty.h"
// #endif

/*
 * The distinctions here are not BSD - rest but rather USG - rest, as
 * BSD still has the old sgttyb structure, but SYSV has termio. Thus:
 */

// #if (defined(BSD) || defined(ULTRIX)) && !defined(POSIX_TYPES)
// #define V7
// #else
// #define USG
// #endif

// #ifdef USG

// #ifdef POSIX_TYPES
// #include <termios.h>
// #include <unistd.h>
// #define termstruct termios
// #else
// #include <termio.h>
// #if defined(TCSETS) && !defined(AIX_31)
// #define termstruct termios
// #else
// #define termstruct termio
// #endif
// #endif 
/* POSIX_TYPES */

// #ifdef LINUX
// #include <sys/ioctl.h>
// #include <curses.h>
// #endif
// #define kill_sym c_cc[VKILL]
// #define erase_sym c_cc[VERASE]
// #define intr_sym c_cc[VINTR]
// #ifdef TAB3 
/* not a POSIX flag, but some have it anyway */

// #define EXTABS TAB3
// #else
// #define EXTABS 0
// #endif
// #define tabflgs c_oflag
// #define echoflgs c_lflag
// #define cbrkflgs c_lflag
// #define CBRKMASK ICANON
// #define CBRKON !
/* reverse condition */

// #ifdef POSIX_TYPES
// #define OSPEED(x) (speednum(cfgetospeed(&x)))
// #else
// #ifndef CBAUD
// #define CBAUD _CBAUD 
/* for POSIX nitpickers (like RS/6000 cc) */

// #endif
// #define OSPEED(x) ((x).c_cflag & CBAUD)
// #endif
// #define IS_7BIT(x) ((x).c_cflag & CS7)
// #define inputflags c_iflag
// #define STRIPHI ISTRIP
// #ifdef POSIX_TYPES
// #define GTTY(x) (tcgetattr(0, x))
// #define STTY(x) (tcsetattr(0, TCSADRAIN, x))
// #else
// #if defined(TCSETS) && !defined(AIX_31)
// #define GTTY(x) (ioctl(0, TCGETS, x))
// #define STTY(x) (ioctl(0, TCSETSW, x))
// #else
// #define GTTY(x) (ioctl(0, TCGETA, x))
// #define STTY(x) (ioctl(0, TCSETAW, x))
// #endif
// #endif 
/* POSIX_TYPES */

// #define GTTY2(x) 1
// #define STTY2(x) 1
// #ifdef POSIX_TYPES
// #if defined(BSD) && !defined(__DGUX__)
// #define nonesuch _POSIX_VDISABLE
// #else
// #define nonesuch (fpathconf(0, _PC_VDISABLE))
// #endif
// #else
// #define nonesuch 0
// #endif
// #define inittyb2 inittyb
// #define curttyb2 curttyb

// #else 
/* V7 */


// #include <sgtty.h>
// #define termstruct sgttyb
// #define kill_sym sg_kill
// #define erase_sym sg_erase
// #define intr_sym t_intrc
// #define EXTABS XTABS
// #define tabflgs sg_flags
// #define echoflgs sg_flags
// #define cbrkflgs sg_flags
// #define CBRKMASK CBREAK
// #define CBRKON              
/* empty */

// #define inputflags sg_flags 
/* don't know how enabling meta bits */

// #define IS_7BIT(x) (FALSE)
// #define STRIPHI 0 
/* should actually be done on BSD */

// #define OSPEED(x) (x).sg_ospeed
// #if defined(bsdi) || defined(__386BSD) || defined(SUNOS4)
// #define GTTY(x) (ioctl(0, TIOCGETP, (char *) x))
// #define STTY(x) (ioctl(0, TIOCSETP, (char *) x))
// #else
// #define GTTY(x) (gtty(0, x))
// #define STTY(x) (stty(0, x))
// #endif
// #define GTTY2(x) (ioctl(0, TIOCGETC, (char *) x))
// #define STTY2(x) (ioctl(0, TIOCSETC, (char *) x))
// #define nonesuch -1
// struct tchars inittyb2, curttyb2;

// #endif 
/* V7 */


/*
 * Old curses.h relied on implicit declaration of has_colors().
 * Modern compilers tend to warn about implicit declarations and
 * modern curses.h declares has_colors() explicitly.  However, the
 * declaration it uses is not one we can simply clone (requires
 * <stdbool.h>).  This simpler declaration suffices but can't be
 * used unconditionally because it conflicts with the 'bool' one.
 */

// #ifdef NEED_HAS_COLORS_DECL
// int has_colors(void);
// #endif

// #if defined(TTY_GRAPHICS) && ((!defined(SYSV) && !defined(HPUX)) \
//                               || defined(UNIXPC) || defined(SVR4))
// extern 
/* it is defined in libtermlib (libtermcap) */

//     short ospeed; 
/* terminal baudrate; set by gettty */

// #else
// short ospeed = 0; 
/* gets around "not defined" error message */

// #endif

// #if defined(POSIX_TYPES) && defined(BSD)
// unsigned
// #endif
//     char erase_char,
//     intr_char, kill_char;
// static boolean settty_needed = FALSE;
// struct termstruct inittyb, curttyb;

// #ifdef POSIX_TYPES
function speednum(speed)
{
    switch (speed) {
    case C.B0:
        return 0;
    case C.B50:
        return 1;
    case C.B75:
        return 2;
    case C.B110:
        return 3;
    case C.B134:
        return 4;
    case C.B150:
        return 5;
    case C.B200:
        return 6;
    case C.B300:
        return 7;
    case C.B600:
        return 8;
    case C.B1200:
        return 9;
    case C.B1800:
        return 10;
    case C.B2400:
        return 11;
    case C.B4800:
        return 12;
    case C.B9600:
        return 13;
    case C.B19200:
        return 14;
    case C.B38400:
        return 15;
    }

    return 0;
}

// #endif

function setctty()
{
    if (C.STTY(C.curttyb) < 0 || C.STTY2(C.curttyb2) < 0) {
        /* Silent when running under NOMUX_MARKERS (no controlling tty). */
        if (!C.getenv("NOMUX_MARKERS"))
        C.perror("NetHack (setctty)");
    }
}


/*
 * Get initial state of terminal, set ospeed (for termcap routines)
 * and switch off tab expansion if necessary.
 * Called by startup() in termcap.c and after returning from ! or ^Z
 */

export function gettty()
{
    if (C.GTTY(C.inittyb) < 0 || C.GTTY2(C.inittyb2) < 0) {
        if (!C.getenv("NOMUX_MARKERS"))
        C.perror("NetHack (gettty)");
    }
    if (C.getenv("NOMUX_MARKERS")) {
        /* Without a real tty the GTTY ioctls leave inittyb zeroed.
         * Synthesize the conventional terminal control characters so
         * getline.c sees the same erase_char/kill_char as a recording
         * captured under tmux: \177 (DEL) for erase, ^U for kill. */
        C.inittyb.erase_sym = 127;
        C.inittyb.kill_sym  = 21;
        C.inittyb2.intr_sym = 3;
    }
    C.copyTerm(C.curttyb, C.inittyb);
    C.copyTerm(C.curttyb2, C.inittyb2);
    C.ospeed = speednum(C.cfgetospeed(C.inittyb.address));
    C.erase_char = C.inittyb.erase_sym;
    C.kill_char = C.inittyb.kill_sym;
    C.intr_char = C.inittyb2.intr_sym;
    C.getioctls();

    /* do not expand tabs - they might be needed inside a cm sequence */
    if (C.curttyb.tabflgs & C.EXTABS) {
        C.curttyb.tabflgs &= ~C.EXTABS;
        setctty();
    }
    C.unixttyState.settty_needed = 1;
}


/* reset terminal to original state */

export function settty(s)
{
// #ifdef TTY_GRAPHICS
    if (C.TTY_GRAPHICS) {
    if ((C.windowprocs.wp_id == C.wp_tty))
        C.term_end_screen();
    }
// #endif
    if (s)
        C.raw_print(s);
    if (C.STTY(C.inittyb) < 0 || C.STTY2(C.inittyb2) < 0) {
        if (!C.getenv("NOMUX_MARKERS"))
        C.perror("NetHack (settty)");
    }
    C.iflags.echo = (C.inittyb.echoflgs & C.ECHO) ? 1 : 0;
    C.iflags.cbreak = (C.CBRKON(C.inittyb.cbrkflgs & C.CBRKMASK)) ? 1 : 0;
    C.curttyb.inputflags |= C.STRIPHI;
    C.setioctls();
    C.unixttyState.settty_needed = 0;
}


export function setftty()
{
    let ef, cf;
    let change = 0;

    ef = 0;                /* desired value of flags & ECHO */
    cf = Number(C.CBRKON(C.CBRKMASK)); /* desired value of flags & CBREAK */
    C.iflags.cbreak = 1;
    C.iflags.echo = 0;
    /* Should use (ECHO|CRMOD) here instead of ECHO */
    if (((C.curttyb.echoflgs & C.ECHO) >>> 0) != ef) {
        C.curttyb.echoflgs &= ~C.ECHO;
        /* curttyb.echoflgs |= ef; */
        change++;
    }
    if (((C.curttyb.cbrkflgs & C.CBRKMASK) >>> 0) != cf) {
        C.curttyb.cbrkflgs &= ~C.CBRKMASK;
        C.curttyb.cbrkflgs |= cf;
// #ifdef USG
        /* be satisfied with one character; no timeout */
        C.curttyb.c_cc[C.VMIN] = 1;  /* was VEOF */
        C.curttyb.c_cc[C.VTIME] = 0; /* was VEOL */
// #ifdef POSIX_JOB_CONTROL
    if (C.POSIX_JOB_CONTROL) {
/* turn off system suspend character
 * due to differences in structure layout, this has to be
 * here instead of in ioctl.c:getioctls() with the BSD
 * equivalent
 */
// #ifdef VSUSP
    if (C.HAS_VSUSP) {
/* real POSIX */
        C.curttyb.c_cc[C.VSUSP] = C.nonesuch;
// #else
    } else {
/* other later SYSV */
        C.curttyb.c_cc[C.VSWTCH] = C.nonesuch;
    }
// #endif
    }
// #endif
// #ifdef VDSUSP
    if (C.HAS_VDSUSP) {
/* SunOS Posix extensions */
        C.curttyb.c_cc[C.VDSUSP] = C.nonesuch;
    }
// #endif
// #ifdef VREPRINT
    if (C.HAS_VREPRINT) {
        C.curttyb.c_cc[C.VREPRINT] = C.nonesuch;
    }
// #endif
// #ifdef VDISCARD
    if (C.HAS_VDISCARD) {
        C.curttyb.c_cc[C.VDISCARD] = C.nonesuch;
    }
// #endif
// #ifdef VWERASE
    if (C.HAS_VWERASE) {
        C.curttyb.c_cc[C.VWERASE] = C.nonesuch;
    }
// #endif
// #ifdef VLNEXT
    if (C.HAS_VLNEXT) {
        C.curttyb.c_cc[C.VLNEXT] = C.nonesuch;
    }
// #endif
// #endif
        change++;
    }
    if (!C.IS_7BIT(C.inittyb))
        C.curttyb.inputflags &= ~C.STRIPHI;
    /* If an interrupt character is used, it will be overridden and
     * set to ^C.
     */
    if (C.intr_char != C.nonesuch && C.curttyb2.intr_sym != 3) {
        C.curttyb2.intr_sym = 3;
        change++;
    }

    if (change)
        setctty();

// #ifdef TTY_GRAPHICS
    if (C.TTY_GRAPHICS) {
    if ((C.windowprocs.wp_id == C.wp_tty))
        C.term_start_screen();
    }
// #endif
}


export function intron() /* enable kbd interrupts if enabled when game started */
{
// #ifdef TTY_GRAPHICS
    if (C.TTY_GRAPHICS) {
    /* Ugly hack to keep from changing tty modes for non-tty games -dlc */
    if ((C.windowprocs.wp_id == C.wp_tty) && C.intr_char != C.nonesuch
        && C.curttyb2.intr_sym != 3) {
        C.curttyb2.intr_sym = 3;
        setctty();
    }
    }
// #endif
}


export function introff() /* disable kbd interrupts if required*/
{
// #ifdef TTY_GRAPHICS
    if (C.TTY_GRAPHICS) {
    /* Ugly hack to keep from changing tty modes for non-tty games -dlc */
    if ((C.windowprocs.wp_id == C.wp_tty) && C.curttyb2.intr_sym != C.nonesuch) {
        C.curttyb2.intr_sym = C.nonesuch;
        setctty();
    }
    }
// #endif
}


// #ifdef _M_UNIX 
/* SCO UNIX (3.2.4), from Andreas Arens */

// #include <sys/console.h>

// #define BSIZE (E_TABSZ * 2)
// #define LDIOC ('D' << 8) 
/* POSIX prevents definition */


// #include <sys/emap.h>

// int sco_flag_console = 0;
// int sco_map_valid = -1;
// unsigned char sco_chanmap_buf[BSIZE];

// void sco_mapon(void);
// void sco_mapoff(void);
// void check_sco_console(void);
// void init_sco_cons(void);

// void
// sco_mapon(void)
// {
// #ifdef TTY_GRAPHICS
//     if (WINDOWPORT(tty) && sco_flag_console) {
//         if (sco_map_valid != -1) {
//             ioctl(0, LDSMAP, sco_chanmap_buf);
//         }
//         sco_map_valid = -1;
//     }
// #endif
// }

// void
// sco_mapoff(void)
// {
// #ifdef TTY_GRAPHICS
//     if (WINDOWPORT(tty) && sco_flag_console) {
//         sco_map_valid = ioctl(0, LDGMAP, sco_chanmap_buf);
//         if (sco_map_valid != -1) {
//             ioctl(0, LDNMAP, (char *) 0);
//         }
//     }
// #endif
// }

// void
// check_sco_console(void)
// {
//     if (isatty(0) && ioctl(0, CONS_GET, 0) != -1) {
//         sco_flag_console = 1;
//     }
// }

// void
// init_sco_cons(void)
// {
// #ifdef TTY_GRAPHICS
//     if (WINDOWPORT(tty) && sco_flag_console) {
//         atexit(sco_mapon);
//         sco_mapoff();
//         load_symset("IBMGraphics", PRIMARYSET);
//         load_symset("RogueIBM", ROGUESET);
//         switch_symbols(TRUE);
//         if (has_colors())
//             iflags.use_color = TRUE;
//     }
// #endif
// }
// #endif 
/* _M_UNIX */


// #ifdef __linux__ 
/* via Jesse Thilo and Ben Gertzfield */

// #include <sys/vt.h>
// #include <sys/ioctl.h>

// int linux_flag_console = 0;

// void linux_mapon(void);
// void linux_mapoff(void);
// void check_linux_console(void);
// void init_linux_cons(void);

// void
// linux_mapon(void)
// {
// #ifdef TTY_GRAPHICS
//     if (WINDOWPORT(tty) && linux_flag_console) {
//         write(1, "\033(B", 3);
//     }
// #endif
// }

// void
// linux_mapoff(void)
// {
// #ifdef TTY_GRAPHICS
//     if (WINDOWPORT(tty) && linux_flag_console) {
//         write(1, "\033(U", 3);
//     }
// #endif
// }

// void
// check_linux_console(void)
// {
//     struct vt_mode vtm;

//     if (isatty(0) && ioctl(0, VT_GETMODE, &vtm) >= 0) {
//         linux_flag_console = 1;
//     }
// }

// void
// init_linux_cons(void)
// {
// #ifdef TTY_GRAPHICS
//     if (WINDOWPORT(tty) && linux_flag_console) {
//         atexit(linux_mapon);
//         linux_mapoff();
//         if (has_colors())
//             iflags.use_color = TRUE;
//     }
// #endif
// }
// #endif 
/* __linux__ */


// DISABLE_WARNING_FORMAT_NONLITERAL

// #ifndef __begui__ 
/* the Be GUI will define its own error proc */

/* fatal error */

export function error(s, ...the_args)
{
    // va_list the_args is the existing variadic parameter packet.

    C.va_start(the_args, s);
    if (C.iflags.window_inited)
        C.exit_nhwindows(0); /* for tty, will call settty() */
    if (C.unixttyState.settty_needed)
        settty(0);
    C.Vprintf(s, the_args);
    C.putchar(10);
    C.va_end(the_args);
    C.exit(C.EXIT_FAILURE);
}

// #endif 
/* !__begui__ */


// RESTORE_WARNING_FORMAT_NONLITERAL

// #ifdef ENHANCED_SYMBOLS
/*
 * set in term_start_screen() and allows
 * OS-specific changes that may be
 * required for support of utf8.
 */

export function tty_utf8graphics_fixup()
{
}

// #endif

