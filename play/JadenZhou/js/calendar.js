// calendar.js — time of day and phase of the moon.
// C ref: calendar.c
//
// The recorder's clock is frozen at the game's datetime ("YYYYMMDDHHMMSS",
// NETHACK_FIXED_DATETIME).  C's getnow() turns it into a time_t with
// mktime() in the recorder's time zone (America/New_York), and that mktime()
// takes its DST flag from localtime() of the real clock at recording time.
// The reference sessions were recorded on daylight time, so the datetime is
// read as EDT (UTC-4) whatever its season, and getlt() -- localtime() of
// that time_t -- reads a winter datetime an hour earlier.  Without a fixed
// datetime both use the host clock and time zone.

import { game } from './gstate.js';

/* the reference recorder's environment (see above) */
const RECORDER_TZ = 'America/New_York';
const RECORDER_UTC_OFFSET_S = 4 * 3600; /* daylight time: UTC-4 */

function fixed_datetime() {
    const dt = game.datetime;
    return (dt && /^\d{14}$/.test(dt)) ? dt : null;
}

/* struct tm fields of a time_t in an IANA time zone (host zone if none) */
function tm_of(date, tz) {
    const fmt = new Intl.DateTimeFormat('en-US', {
        timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric',
        day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric',
    });
    const p = {};
    for (const part of fmt.formatToParts(new Date(date * 1000)))
        p[part.type] = part.value;
    const Y = +p.year, M = +p.month, D = +p.day;
    const day = Date.UTC(Y, M - 1, D);
    return {
        tm_year: Y - 1900, tm_mon: M - 1, tm_mday: D,
        tm_hour: (+p.hour) % 24, tm_min: +p.minute, tm_sec: +p.second,
        tm_yday: Math.round((day - Date.UTC(Y, 0, 1)) / 86400000),
        tm_wday: new Date(day).getUTCDay(),
    };
}

// C ref: calendar.c getlt() -- localtime() of getnow()
function getlt() {
    const dt = fixed_datetime();
    if (!dt)
        return tm_of(getnow(), undefined);
    /* the clock is frozen, so the struct tm is the same all game */
    if (game.getlt_datetime !== dt) {
        game.getlt_datetime = dt;
        game.getlt_tm = tm_of(getnow(), RECORDER_TZ);
    }
    return { ...game.getlt_tm };
}

// C ref: calendar.c phase_of_the_moon()
export function phase_of_the_moon() /* 0-7, with 0: new, 4: full */ {
    const lt = getlt();
    let epact, diy, goldn;

    diy = lt.tm_yday;
    goldn = (lt.tm_year % 19) + 1;
    epact = (11 * goldn + 18) % 30;
    if ((epact === 25 && goldn > 11) || epact === 24)
        epact++;

    return (Math.trunc((((((diy + epact) * 6) + 11) % 177) / 22)) & 7);
}

// C ref: calendar.c friday_13th()
export function friday_13th() {
    const lt = getlt();

    /* tm_wday (day of week; 0==Sunday) == 5 => Friday */
    return (lt.tm_wday === 5 && lt.tm_mday === 13);
}

// C ref: calendar.c night()
export function night() {
    const hour = getlt().tm_hour;

    return (hour < 6 || hour > 21) ? 1 : 0;
}

// C ref: calendar.c midnight()
export function midnight() {
    return (getlt().tm_hour === 0) ? 1 : 0;
}

// C ref: calendar.c getnow() -- with a fixed datetime, mktime() of it in
// the recorder's time zone on daylight time (see the top of this file)
export function getnow() {
    const dt = fixed_datetime();
    if (dt)
        return Math.trunc(Date.UTC(+dt.slice(0, 4), +dt.slice(4, 6) - 1,
                                   +dt.slice(6, 8), +dt.slice(8, 10),
                                   +dt.slice(10, 12), +dt.slice(12, 14)) / 1000)
               + RECORDER_UTC_OFFSET_S;
    return Math.trunc(Date.now() / 1000);
}

/* localtime() of a time_t from getnow() */
function localtime_of(date) {
    return tm_of(date, fixed_datetime() ? RECORDER_TZ : undefined);
}

// C ref: calendar.c yyyymmddhhmmss()
export function yyyymmddhhmmss(date) {
    let datenum;
    const lt = (date === 0) ? getlt() : localtime_of(date);
    const p2 = (n) => String(n).padStart(2, '0');

    /* just in case somebody's localtime supplies (year % 100)
       rather than the expected (year - 1900) */
    if (lt.tm_year < 70)
        datenum = lt.tm_year + 2000;
    else
        datenum = lt.tm_year + 1900;
    return `${String(datenum).padStart(4, '0')}${p2(lt.tm_mon + 1)}${
            p2(lt.tm_mday)}${p2(lt.tm_hour)}${p2(lt.tm_min)}${p2(lt.tm_sec)}`;
}

// C ref: calendar.c yyyymmdd()
export function yyyymmdd(date) {
    let datenum;
    const lt = (date === 0) ? getlt() : localtime_of(date);

    /* just in case somebody's localtime supplies (year % 100)
       rather than the expected (year - 1900) */
    if (lt.tm_year < 70)
        datenum = lt.tm_year + 2000;
    else
        datenum = lt.tm_year + 1900;
    /* yyyy --> yyyymm */
    datenum = datenum * 100 + (lt.tm_mon + 1);
    /* yyyymm --> yyyymmdd */
    datenum = datenum * 100 + lt.tm_mday;
    return datenum;
}
