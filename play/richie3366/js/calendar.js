// calendar.js — Time / moon / weekday helpers.
// C ref: calendar.c (contest patch 001 — fixed datetime via getnow).

import { game } from './gstate.js';
import { NEW_MOON, FULL_MOON } from './const.js';

/**
 * Parse contest YYYYMMDDHHMMSS into civil components.
 * @returns {{y:number,mo:number,d:number,h:number,mi:number,s:number}|null}
 */
function parseFixedDatetime(str) {
    const d = String(str || '');
    if (d.length !== 14) return null;
    return {
        y: parseInt(d.slice(0, 4), 10) || 1970,
        mo: (parseInt(d.slice(4, 6), 10) || 1) - 1,
        d: parseInt(d.slice(6, 8), 10) || 1,
        h: parseInt(d.slice(8, 10), 10) || 0,
        mi: parseInt(d.slice(10, 12), 10) || 0,
        s: parseInt(d.slice(12, 14), 10) || 0,
    };
}

/**
 * C ref: calendar.c time_from_yyyymmddhhmmss + contest getnow path.
 * Public sessions were recorded under TZ=America/New_York with patched
 * getnow copying wall-clock tm_isdst (summer → 1) into mktime, so winter
 * civil stamps are treated as EDT (UTC-4). Match that recorded quirk with
 * a fixed UTC-4 interpretation (stable across host TZ).
 */
export function time_from_yyyymmddhhmmss(buf) {
    const p = parseFixedDatetime(buf);
    if (!p) return 0;
    // Civil time as UTC-4 → unix seconds
    return Math.floor(Date.UTC(p.y, p.mo, p.d, p.h, p.mi, p.s) / 1000) + 4 * 3600;
}

/**
 * C ref: calendar.c getnow — NETHACK_FIXED_DATETIME via time_from_*.
 */
export function getnow() {
    const fixed = game.datetime;
    if (fixed) {
        const parsed = time_from_yyyymmddhhmmss(fixed);
        if (parsed) return parsed;
    }
    return Math.floor(Date.now() / 1000);
}

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

/**
 * C ref: calendar.c yyyymmdd — contest fixed datetime via getlt when date==0.
 * @param {number} [date] unused (contest always uses getlt)
 */
export function yyyymmdd(date = 0) {
    void date;
    const lt = getlt();
    let year = lt.tm_year < 70 ? lt.tm_year + 2000 : lt.tm_year + 1900;
    return year * 10000 + (lt.tm_mon + 1) * 100 + lt.tm_mday;
}

export { NEW_MOON, FULL_MOON };
