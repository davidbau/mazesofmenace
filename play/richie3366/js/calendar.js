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

function isLeapYear(y) {
    return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

function daysInMonth(y, mo0) {
    switch (mo0) {
        case 1: return isLeapYear(y) ? 29 : 28;
        case 3: case 5: case 8: case 10: return 30;
        default: return 31;
    }
}

// Weekday (0=Sun) of a civil date via UTC decomposition (host-TZ independent).
function weekdayOf(y, mo0, d) {
    return new Date(Date.UTC(y, mo0, d)).getUTCDay();
}

/**
 * C ref: US DST transitions for America/New_York as UTC epoch seconds.
 * Pre-2007 (covers 2000): first Sun Apr 02:00 EST (07:00 UTC) → last Sun
 * Oct 02:00 EDT (06:00 UTC). 2007+: second Sun Mar 02:00 EST → first Sun
 * Nov 02:00 EDT. Plain arithmetic (Rule #2: no Intl / node TZ APIs).
 */
function nyTransitionsUTC(year) {
    let springDay, fallDay, springMon, fallMon;
    if (year >= 2007) {
        springMon = 2; // March
        springDay = 1 + ((7 - weekdayOf(year, 2, 1)) % 7) + 7; // second Sunday
        fallMon = 10; // November
        fallDay = 1 + ((7 - weekdayOf(year, 10, 1)) % 7); // first Sunday
    } else {
        springMon = 3; // April
        springDay = 1 + ((7 - weekdayOf(year, 3, 1)) % 7); // first Sunday
        fallMon = 9; // October
        const last = daysInMonth(year, 9);
        fallDay = last - (weekdayOf(year, 9, last) % 7); // last Sunday
    }
    return {
        springUTC: Math.floor(Date.UTC(year, springMon, springDay, 7, 0, 0) / 1000),
        fallUTC: Math.floor(Date.UTC(year, fallMon, fallDay, 6, 0, 0) / 1000),
    };
}

// C ref: localtime() offset under America/New_York — EST (UTC-5) / EDT (UTC-4).
function nyOffsetSecs(epoch) {
    const utcYear = new Date(epoch * 1000).getUTCFullYear();
    const { springUTC, fallUTC } = nyTransitionsUTC(utcYear);
    return epoch >= springUTC && epoch < fallUTC ? -4 * 3600 : -5 * 3600;
}

// C ref: struct tm from an epoch under America/New_York.
function nyLocaltime(epoch) {
    const off = nyOffsetSecs(epoch);
    const d = new Date((epoch + off) * 1000);
    const year = d.getUTCFullYear();
    const mon = d.getUTCMonth();
    const mday = d.getUTCDate();
    let yday = mday - 1;
    for (let m = 0; m < mon; m++) yday += daysInMonth(year, m);
    return {
        tm_year: year - 1900,
        tm_mon: mon,
        tm_mday: mday,
        tm_hour: d.getUTCHours(),
        tm_min: d.getUTCMinutes(),
        tm_sec: d.getUTCSeconds(),
        tm_yday: yday,
        tm_wday: d.getUTCDay(),
        tm_isdst: off === -4 * 3600 ? 1 : 0,
    };
}

/**
 * C ref: calendar.c getlt() `:40–46` — `localtime(getnow())`.
 * Contest patch 001 `time_from_yyyymmddhhmmss` fills `struct tm` from the
 * recording machine's current `localtime` (tm_isdst = 1, EDT at record
 * time) then `mktime`, so `getnow()` for a winter civil stamp is the
 * stamp-as-EDT epoch (`time_from_yyyymmddhhmmss` above, UTC-4); `getlt`
 * re-reads it under America/New_York, landing one hour earlier in EST
 * (e.g. `2000-02-06 00:00` → Feb 5 23:00, tm_yday −1 → moon phase 0).
 */
export function getlt() {
    return nyLocaltime(getnow());
}

/**
 * C ref: calendar.c getyear `:48–52`.
 * Always `1900 + getlt()->tm_year` (void; current civil stamp). Unlike
 * yyyymmdd / yyyymmddhhmmss, there is no `tm_year < 70` → +2000
 * fallback. Caller: mhitu.c `ld()` (`doseduce` leap-day 0xe5).
 * @returns {number}
 */
export function getyear() {
    return 1900 + getlt().tm_year;
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
 * C ref: calendar.c yyyymmdd / hhmmss / yyyymmddhhmmss — date==0 →
 * getlt(); else localtime(&date) under America/New_York (same DST
 * rules as getlt above, not a fixed offset).
 * @param {number} [date]
 */
function lt_for_date(date) {
    if (!date) return getlt();
    return nyLocaltime(Number(date));
}

/** C ref: calendar.c yyyymmdd / yyyymmddhhmmss tm_year < 70 → +2000. */
function yyyy_from_tm(lt) {
    return lt.tm_year < 70 ? lt.tm_year + 2000 : lt.tm_year + 1900;
}

function pad2(n) {
    return String(n | 0).padStart(2, '0');
}

/**
 * C ref: calendar.c yyyymmdd `:55–77`.
 * @param {number} [date]
 * @returns {number}
 */
export function yyyymmdd(date = 0) {
    const lt = lt_for_date(date);
    const year = yyyy_from_tm(lt);
    return year * 10000 + (lt.tm_mon + 1) * 100 + lt.tm_mday;
}

/**
 * C ref: calendar.c hhmmss `:79–92` — hour*10000 + min*100 + sec.
 * Callers: files.c paniclog; windows.c dump_fmtstr %d/%D
 * ("%08ld%06ld" pads this long). Not yyyymmddhhmmss.
 * @param {number} [date]
 * @returns {number}
 */
export function hhmmss(date = 0) {
    const lt = lt_for_date(date);
    return lt.tm_hour * 10000 + lt.tm_min * 100 + lt.tm_sec;
}

/**
 * C ref: calendar.c yyyymmddhhmmss `:94–117` — static datestr[15]
 * "%04ld%02d%02d%02d%02d%02d". Caller: bones.c savebones when[].
 * @param {number} [date]
 * @returns {string}
 */
export function yyyymmddhhmmss(date = 0) {
    const lt = lt_for_date(date);
    const year = yyyy_from_tm(lt);
    return (
        String(year).padStart(4, '0')
        + pad2(lt.tm_mon + 1)
        + pad2(lt.tm_mday)
        + pad2(lt.tm_hour)
        + pad2(lt.tm_min)
        + pad2(lt.tm_sec)
    );
}

/** C ref: calendar.c night — hour < 6 || hour > 21. */
export function night() {
    const hour = getlt().tm_hour;
    return hour < 6 || hour > 21;
}

/** C ref: calendar.c midnight — hour == 0. */
export function midnight() {
    return getlt().tm_hour === 0;
}

export { NEW_MOON, FULL_MOON };
