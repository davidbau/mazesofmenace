// calendar.js — time of day and phase of the moon.
// C ref: calendar.c
//
// getlt() takes the local time from the game's fixed datetime
// ("YYYYMMDDHHMMSS", the recorder's frozen clock) when there is one.

import { game } from './gstate.js';

// C ref: calendar.c getlt() -- a struct tm for the current local time
function getlt() {
    let Y, M, D, h, m, s;
    const dt = game.datetime;
    if (dt && /^\d{14}$/.test(dt)) {
        Y = +dt.slice(0, 4); M = +dt.slice(4, 6); D = +dt.slice(6, 8);
        h = +dt.slice(8, 10); m = +dt.slice(10, 12); s = +dt.slice(12, 14);
    } else {
        const now = new Date();
        Y = now.getFullYear(); M = now.getMonth() + 1; D = now.getDate();
        h = now.getHours(); m = now.getMinutes(); s = now.getSeconds();
    }
    /* calendar arithmetic on the local fields (no time zone involved) */
    const day = Date.UTC(Y, M - 1, D);
    const yday = Math.round((day - Date.UTC(Y, 0, 1)) / 86400000);
    return {
        tm_year: Y - 1900, tm_mon: M - 1, tm_mday: D,
        tm_hour: h, tm_min: m, tm_sec: s,
        tm_yday: yday, tm_wday: new Date(day).getUTCDay(),
    };
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

// C ref: calendar.c getnow() -- the recorder's clock is frozen at the
// game's datetime (NETHACK_FIXED_DATETIME); a time_t here counts seconds
// of that local time (no time zone involved, like getlt())
export function getnow() {
    const dt = game.datetime;
    if (dt && /^\d{14}$/.test(dt))
        return Math.trunc(Date.UTC(+dt.slice(0, 4), +dt.slice(4, 6) - 1,
                                   +dt.slice(6, 8), +dt.slice(8, 10),
                                   +dt.slice(10, 12), +dt.slice(12, 14)) / 1000);
    return Math.trunc(Date.now() / 1000);
}

/* localtime() of a time_t from getnow() */
function localtime_of(date) {
    const t = new Date(date * 1000);
    return {
        tm_year: t.getUTCFullYear() - 1900, tm_mon: t.getUTCMonth(),
        tm_mday: t.getUTCDate(), tm_hour: t.getUTCHours(),
        tm_min: t.getUTCMinutes(), tm_sec: t.getUTCSeconds(),
    };
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
