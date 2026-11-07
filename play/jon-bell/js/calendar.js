// calendar.js — C ref: calendar.c.
import { recorder_localtime, recorder_time_from_yyyymmddhhmmss } from './display.js';
import { game } from './gstate.js';

// Parse NETHACK_FIXED_DATETIME → {tm_year (years since 1900), tm_mon (0-based),
// tm_yday (0-based), tm_wday (0=Sun), tm_hour, tm_min, tm_sec, tm_mday}
// or null when unset/invalid
// (C then uses wall-clock time(), which is non-deterministic and therefore never
function isoInstant(s) {
    if (typeof s !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(s))
        return null;
    const ms = Date.parse(s);
    return Number.isFinite(ms) ? Math.floor(ms / 1000) : null;
}

function fixedDatetimeTm() {
    const g = game;
    const s = g?.env?.NETHACK_FIXED_DATETIME;
    const iso = isoInstant(s);
    if (iso !== null)
        return recorder_localtime(iso);
    if (typeof s !== 'string' || s.length !== 14)
        return null;
    const year = parseInt(s.slice(0, 4), 10);
    const mon = parseInt(s.slice(4, 6), 10); /* 1..12 */
    const mday = parseInt(s.slice(6, 8), 10); /* 1..31 */
    const hour = parseInt(s.slice(8, 10), 10); /* 0..23 */
    const min = parseInt(s.slice(10, 12), 10); /* 0..59 */
    const sec = parseInt(s.slice(12, 14), 10); /* 0..59 */
    if (!Number.isFinite(year) || !Number.isFinite(mon) || !Number.isFinite(mday) ||
        !Number.isFinite(hour) || !Number.isFinite(min) || !Number.isFinite(sec))
        return null;
    // tm_year = years since 1900 (calendar.c uses tm_year directly in goldn).
    const tm_year = year - 1900;
    // tm_yday: 0-based day-of-year.  Use UTC Date arithmetic for determinism.
    const utc = Date.UTC(year, mon - 1, mday);
    const jan1 = Date.UTC(year, 0, 1);
    const tm_yday = Math.floor((utc - jan1) / 86400000);
    // tm_wday: 0=Sunday.  getUTCDay() returns 0..6 with 0=Sunday.
    const tm_wday = new Date(utc).getUTCDay();
    // tm_mon: C's struct tm.tm_mon is 0-based (0..11); the parse yields 1..12.
    return { tm_year, tm_mon: mon - 1, tm_yday, tm_wday, tm_mday: mday, tm_hour: hour, tm_min: min, tm_sec: sec };
}

// C ref: calendar.c:200 phase_of_the_moon() — 0..7 (0=new, 4=full).
export function phase_of_the_moon() {
    const lt = getlt();
    if (!lt)
        return -1; /* unknown — emit nothing (matches non-deterministic C path being unrecorded) */
    const diy = lt.tm_yday;
    const goldn = (lt.tm_year % 19) + 1;
    let epact = (11 * goldn + 18) % 30;
    if ((epact === 25 && goldn > 11) || epact === 24)
        epact++;
    return ((((((diy + epact) * 6) + 11) % 177) / 22) | 0) & 7;
}

// C ref: calendar.c:215 friday_13th() — Friday (wday 5) AND mday 13.
export function friday_13th() {
    const lt = getlt();
    if (!lt)
        return false;
    return lt.tm_wday === 5 && lt.tm_mday === 13;
}

// C ref: calendar.c:46 getlt() — returns struct tm *.
export function getlt() {
    return fixedDatetimeTm() ? recorder_localtime(getnow()) : null;
}

const RECORDER_UTC_OFFSET_SEC = -4 * 3600;

/* C calendar.c:120-175, patch 001: mktime retains the recording moment's
 * tm_isdst, including when restore.c:617 parses a saved winter birthday. */
export function time_from_yyyymmddhhmmss(buf) {
    return recorder_time_from_yyyymmddhhmmss(buf);
}

export function getnow() {
    const iso = isoInstant(game?.env?.NETHACK_FIXED_DATETIME);
    if (iso !== null)
        return iso;
    const lt = fixedDatetimeTm();
    if (!lt)
        return 0;
    return Math.floor(Date.UTC(lt.tm_year + 1900, lt.tm_mon, lt.tm_mday,
                               lt.tm_hour, lt.tm_min, lt.tm_sec) / 1000)
           - RECORDER_UTC_OFFSET_SEC;
}

// C ref: calendar.c:223 night() — returns 1 if hour < 6 || hour > 21, else 0.
export function night() {
    const lt = getlt();
    if (!lt)
        return 0;
    const hour = lt.tm_hour;
    return (hour < 6 || hour > 21) ? 1 : 0;
}

// C ref: calendar.c:231 midnight() — returns 1 if hour == 0, else 0.
export function midnight() {
    const lt = getlt();
    if (!lt)
        return 0;
    return (lt.tm_hour === 0) ? 1 : 0;
}

// Helper: convert time_t (Unix timestamp in seconds) to struct tm.
// C's localtime() converts UTC time_t to local broken-down time.
// In JavaScript, Date uses local timezone, so Date.constructor(ts*1000).get*() gives us local time.
function localtime(dateParam) {
    return recorder_localtime(dateParam);
}

// C ref: calendar.c:85 hhmmss(time_t date) — returns time as hhmmss (long).
export function hhmmss(date) {
    let lt;
    if (date === 0)
        lt = getlt();
    else
        lt = localtime(date);

    const timenum = lt.tm_hour * 10000 + lt.tm_min * 100 + lt.tm_sec;
    return timenum;
}

// C ref: calendar.c:61 yyyymmdd(time_t date) — returns date as yyyymmdd (long).
export function yyyymmdd(date) {
    let lt;
    if (date === 0)
        lt = getlt();
    else
        lt = localtime(date);

    // just in case somebody's localtime supplies (year % 100)
    // rather than the expected (year - 1900)
    let datenum;
    if (lt.tm_year < 70)
        datenum = lt.tm_year + 2000;
    else
        datenum = lt.tm_year + 1900;
    // yyyy --> yyyymm
    datenum = datenum * 100 + (lt.tm_mon + 1);
    // yyyymm --> yyyymmdd
    datenum = datenum * 100 + lt.tm_mday;
    return datenum;
}

/* C calendar.c:95-116: savegamestate writes birthdays as local date text,
 * rather than preserving the epoch value through the save/restore boundary.
 * Use localtime's date-specific offset, just as C does for a nonzero date. */
export function yyyymmddhhmmss(date) {
    const lt = recorder_localtime(date || getnow());
    const year = lt.tm_year + (lt.tm_year < 70 ? 2000 : 1900);
    return String(year).padStart(4, '0')
        + [lt.tm_mon + 1, lt.tm_mday, lt.tm_hour, lt.tm_min, lt.tm_sec]
            .map(n => String(n).padStart(2, '0')).join('');
}
