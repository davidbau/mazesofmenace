/* NetHack 5.0	calendar.c	$NHDT-Date: 1706213796 2024/01/25 20:16:36 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.116 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Michael Allison, 2007. */
/* Copyright (c) Robert Patrick Rankin, 1991                      */
/* NetHack may be freely redistributed.  See license for details. */

import { C } from './c-runtime.js';

/*
 * Time routines
 *
 * The time is used for:
 *  - seed for rand()
 *  - year on tombstone and yyyymmdd in record file
 *  - phase of the moon (various monsters react to NEW_MOON or FULL_MOON)
 *  - night and midnight (the undead are dangerous at midnight)
 *  - determination of what files are "very old"
 */

/* TIME_type: type of the argument to time(); we actually use &(time_t);
   you might need to define either or both of these to 'long *' in *conf.h */

/* JavaScript translation of the prepared calendar.c, retaining the inherited
 * fixed-datetime patch and the recording-clock/DST adaptation. C supplies
 * time, localtime and mktime, preserving the C library's timezone behavior.
 * C time_t and long values use BigInt; tm fields and array indices use Number.
 * Character arrays use scoped C stack storage, and the whole tm assignment
 * copies every struct byte through C.tmCopy. Static datestr storage remains
 * per game. Includes, type macros and the disabled debug block have no runtime
 * counterpart; all eleven original function boundaries remain unchanged.
 */

export function getnow()
{
    const fixed_dt = C.nh_getenv("NETHACK_FIXED_DATETIME");
    let datetime = 0n;

    if (fixed_dt && C.HEAP8[fixed_dt]) {
        let parsed = time_from_yyyymmddhhmmss(fixed_dt);
        if (parsed != 0n)
            return parsed;
    }
    datetime = C.time();
    return datetime;
}

function getlt()
{
    let date = getnow();

    return C.localtime(date);
}

export function getyear()
{
    return (1900 + getlt().tm_year) | 0;
}


export function yyyymmdd(date)
{
    let datenum;
    let lt;

    if (date == 0n)
        lt = getlt();
    else
        lt = C.localtime(date);

    /* just in case somebody's localtime supplies (year % 100)
       rather than the expected (year - 1900) */
    if (lt.tm_year < 70)
        datenum = BigInt(lt.tm_year) + 2000n;
    else
        datenum = BigInt(lt.tm_year) + 1900n;
    /* yyyy --> yyyymm */
    datenum = datenum * 100n + BigInt(lt.tm_mon + 1);
    /* yyyymm --> yyyymmdd */
    datenum = datenum * 100n + BigInt(lt.tm_mday);
    return datenum;
}

export function hhmmss(date)
{
    let timenum;
    let lt;

    if (date == 0n)
        lt = getlt();
    else
        lt = C.localtime(date);

    timenum = BigInt(lt.tm_hour) * 10000n + BigInt(lt.tm_min) * 100n + BigInt(lt.tm_sec);
    return timenum;
}

export function yyyymmddhhmmss(date)
{
    let datenum;
    const datestr = C.datestr();
    let lt;

    if (date == 0n)
        lt = getlt();
    else
        lt = C.localtime(date);

    /* just in case somebody's localtime supplies (year % 100)
       rather than the expected (year - 1900) */
    if (lt.tm_year < 70)
        datenum = BigInt(lt.tm_year) + 2000n;
    else
        datenum = BigInt(lt.tm_year) + 1900n;
    C.Snprintf(datestr, 15, "%04ld%02d%02d%02d%02d%02d",
             datenum, lt.tm_mon + 1,
             lt.tm_mday, lt.tm_hour, lt.tm_min, lt.tm_sec);
    //debugpline1("yyyymmddhhmmss() produced date string %s", datestr);
    return datestr;
}

export function time_from_yyyymmddhhmmss(buf)
{
    let k;
    let timeresult = 0n;
    let t, lt;
    let now;
    let d, p, y = C.stackAlloc(5), mo = C.stackAlloc(3), md = C.stackAlloc(3),
        h = C.stackAlloc(3), mi = C.stackAlloc(3), s = C.stackAlloc(3);

    if (buf && C.strlen(buf) == 14) {
        d = buf;
        p = y; /* year */
        for (k = 0; k < 4; ++k)
            C.HEAPU8[p++] = C.HEAP8[d++];
        C.HEAPU8[p] = 0;
        p = mo; /* month */
        for (k = 0; k < 2; ++k)
            C.HEAPU8[p++] = C.HEAP8[d++];
        C.HEAPU8[p] = 0;
        p = md; /* day */
        for (k = 0; k < 2; ++k)
            C.HEAPU8[p++] = C.HEAP8[d++];
        C.HEAPU8[p] = 0;
        p = h; /* hour */
        for (k = 0; k < 2; ++k)
            C.HEAPU8[p++] = C.HEAP8[d++];
        C.HEAPU8[p] = 0;
        p = mi; /* minutes */
        for (k = 0; k < 2; ++k)
            C.HEAPU8[p++] = C.HEAP8[d++];
        C.HEAPU8[p] = 0;
        p = s; /* seconds */
        for (k = 0; k < 2; ++k)
            C.HEAPU8[p++] = C.HEAP8[d++];
        C.HEAPU8[p] = 0;
        /* Avoid recursion when getnow() itself is using fixed datetime. */
        now = C.time();
        /* Reproduce the recorder parser using a fixed recording clock,
         * retaining its inherited DST flag and the process timezone. */
        // The native reference does not compile the __EMSCRIPTEN__ override.
        lt = C.localtime(now);
        if (lt) {
            t = C.tmCopy(lt);
            t.tm_year = C.atoi(y) - 1900;
            t.tm_mon = C.atoi(mo) - 1;
            t.tm_mday = C.atoi(md);
            t.tm_hour = C.atoi(h);
            t.tm_min = C.atoi(mi);
            t.tm_sec = C.atoi(s);
            timeresult = C.mktime(t);
        }
        if (timeresult == -1n)
            ;
/*
TODO: set_debugpline1, debugpline1 -> function pointer
            debugpline1("time_from_yyyymmddhhmmss(%s) would have returned -1",
                        buf ? buf : "");
*/
        else
            return timeresult;
    }
    return 0n;
}

/*
 * moon period = 29.53058 days ~= 30, year = 365.2422 days
 * days moon phase advances on first day of year compared to preceding year
 *      = 365.2422 - 12*29.53058 ~= 11
 * years in Metonic cycle (time until same phases fall on the same days of
 *      the month) = 18.6 ~= 19
 * moon phase on first day of year (epact) ~= (11*(year%19) + 29) % 30
 *      (29 as initial condition)
 * current phase in days = first day phase + days elapsed in year
 * 6 moons ~= 177 days
 * 177 ~= 8 reported phases * 22
 * + 11/22 for rounding
 */
export function phase_of_the_moon() /* 0-7, with 0: new, 4: full */
{
    let lt = getlt();
    let epact, diy, goldn;

    diy = lt.tm_yday;
    goldn = (lt.tm_year % 19) + 1;
    epact = (11 * goldn + 18) % 30;
    if ((epact == 25 && goldn > 11) || epact == 24)
        epact++;

    return (Math.trunc(((((diy + epact) * 6) + 11) % 177) / 22) & 7);
}

export function friday_13th()
{
    let lt = getlt();

    /* tm_wday (day of week; 0==Sunday) == 5 => Friday */
    return Number(lt.tm_wday == 5 && lt.tm_mday == 13);
}

export function night()
{
    let hour = getlt().tm_hour;

    return Number(hour < 6 || hour > 21);
}

export function midnight()
{
    return Number(getlt().tm_hour == 0);
}

/* calendar.c */

