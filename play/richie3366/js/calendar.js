// calendar.js — Time / moon / weekday helpers.
// C ref: calendar.c (contest patch 001 — fixed datetime via getnow).

import { game } from './gstate.js';
import { NEW_MOON, FULL_MOON } from './const.js';

/**
 * C ref: calendar.c getlt() via getnow() + localtime.
 * Contest: game.datetime is YYYYMMDDHHMMSS (NETHACK_FIXED_DATETIME).
 * Components are treated as civil local date (no TZ shift).
 */
export function getlt() {
    const d = String(game.datetime || '19700101000000');
    const year = parseInt(d.slice(0, 4), 10) || 1970;
    const mon = (parseInt(d.slice(4, 6), 10) || 1) - 1;
    const mday = parseInt(d.slice(6, 8), 10) || 1;
    const hour = parseInt(d.slice(8, 10), 10) || 0;
    const min = parseInt(d.slice(10, 12), 10) || 0;
    const sec = parseInt(d.slice(12, 14), 10) || 0;
    const utc = Date.UTC(year, mon, mday, hour, min, sec);
    const yday = Math.floor((utc - Date.UTC(year, 0, 1)) / 86400000);
    const wday = new Date(utc).getUTCDay();
    return {
        tm_year: year - 1900,
        tm_mon: mon,
        tm_mday: mday,
        tm_hour: hour,
        tm_min: min,
        tm_sec: sec,
        tm_yday: yday,
        tm_wday: wday,
    };
}

// C ref: calendar.c phase_of_the_moon() — 0-7, 0 new, 4 full
export function phase_of_the_moon() {
    const lt = getlt();
    const diy = lt.tm_yday;
    const goldn = (lt.tm_year % 19) + 1;
    let epact = (11 * goldn + 18) % 30;
    if ((epact === 25 && goldn > 11) || epact === 24) epact++;
    return ((((((diy + epact) * 6) + 11) % 177) / 22) | 0) & 7;
}

// C ref: calendar.c friday_13th()
export function friday_13th() {
    const lt = getlt();
    return lt.tm_wday === 5 && lt.tm_mday === 13;
}

export { NEW_MOON, FULL_MOON };
