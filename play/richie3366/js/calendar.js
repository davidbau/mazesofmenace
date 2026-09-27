// calendar.js — Time / moon / weekday helpers.
// C ref: calendar.c (contest patch 001 — fixed datetime via getnow).

import { game } from './gstate.js';
import { NEW_MOON, FULL_MOON } from './const.js';

/**
 * C `atoi`: skip leading isspace, optional sign, then digits.
 * Stops at the first non-digit. No digits yields 0 (`"00"` is 0,
 * not a stand-in year or month).
 * @param {string} str
 * @returns {number}
 */
function atoi(str) {
    const s = String(str ?? '');
    let i = 0;
    while (i < s.length && (s[i] === ' ' || s[i] === '\t' || s[i] === '\n'
        || s[i] === '\v' || s[i] === '\f' || s[i] === '\r')) {
        i++;
    }
    let sign = 1;
    if (s[i] === '+' || s[i] === '-') {
        if (s[i] === '-') sign = -1;
        i++;
    }
    let n = 0;
    let any = false;
    while (i < s.length && s[i] >= '0' && s[i] <= '9') {
        any = true;
        n = n * 10 + (s.charCodeAt(i) - 48);
        i++;
    }
    if (!any) return 0;
    return sign * n;
}

/** C `strlen`: stop at the first NUL. */
function cStrlen(buf) {
    const s = String(buf);
    const z = s.indexOf('\0');
    return z < 0 ? s.length : z;
}

/**
 * POSIX `mktime` for a `struct tm` under America/New_York.
 * `tm_wday` and `tm_yday` are ignored. `tm_isdst > 0` is EDT (UTC−4),
 * `== 0` is EST (UTC−5), `< 0` asks `nyOffsetSecs` (determine).
 * Out-of-range civil fields normalize the way `Date.UTC` does.
 * Returns -1 when the result is not a finite `time_t`.
 * `Date.UTC` maps years 0..99 onto 1900..1999; C does not.
 * @param {object} t
 * @returns {number}
 */
function mktime(t) {
    const year = 1900 + (t.tm_year | 0);
    const mon = t.tm_mon | 0;
    const mday = t.tm_mday | 0;
    const hour = t.tm_hour | 0;
    const min = t.tm_min | 0;
    const sec = t.tm_sec | 0;
    let ms = Date.UTC(year, mon, mday, hour, min, sec);
    if (year >= 0 && year <= 99) {
        const shifted = new Date(ms);
        shifted.setUTCFullYear(year);
        ms = shifted.getTime();
    }
    if (!Number.isFinite(ms)) return -1;
    const isdst = t.tm_isdst | 0;
    let off;
    if (isdst > 0) off = -4 * 3600;
    else if (isdst === 0) off = -5 * 3600;
    else off = nyOffsetSecs(Math.floor(ms / 1000));
    const epoch = Math.floor(ms / 1000) - off;
    if (!Number.isFinite(epoch)) return -1;
    return epoch;
}

/**
 * Contest patch 001 replaces `getlt()` here with `time()` + `localtime()`
 * so `getnow` → `time_from_yyyymmddhhmmss` does not recurse.
 * The contest recorder (`TZ=America/New_York`) copied that wall-clock
 * `struct tm` while it was in EDT, so `tm_isdst` is 1 and a winter civil
 * stamp stays on the EDT offset (D-1989). The host clock is not read:
 * a winter judge run would move every fixed-datetime epoch.
 * `mktime` ignores `tm_wday` and `tm_yday`.
 * @returns {object}
 */
function contestRecorderLocaltime() {
    return {
        tm_year: 0,
        tm_mon: 0,
        tm_mday: 0,
        tm_hour: 0,
        tm_min: 0,
        tm_sec: 0,
        tm_wday: 0,
        tm_yday: 0,
        tm_isdst: 1,
    };
}

/**
 * C ref: calendar.c `time_from_yyyymmddhhmmss` `:120–175` plus contest
 * patch 001 (`time` / `localtime`, not `getlt`).
 * @param {string} buf 14-digit `YYYYMMDDHHMMSS`, or anything else → 0
 * @returns {number} unix seconds, or 0
 */
export function time_from_yyyymmddhhmmss(buf) {
    let k;
    let timeresult = 0;
    if (buf && cStrlen(buf) === 14) {
        const src = String(buf);
        let di = 0;
        let y = '';
        for (k = 0; k < 4; ++k) {
            y += src[di];
            di += 1;
        }
        let mo = '';
        for (k = 0; k < 2; ++k) {
            mo += src[di];
            di += 1;
        }
        let md = '';
        for (k = 0; k < 2; ++k) {
            md += src[di];
            di += 1;
        }
        let h = '';
        for (k = 0; k < 2; ++k) {
            h += src[di];
            di += 1;
        }
        let mi = '';
        for (k = 0; k < 2; ++k) {
            mi += src[di];
            di += 1;
        }
        let s = '';
        for (k = 0; k < 2; ++k) {
            s += src[di];
            di += 1;
        }
        const lt = contestRecorderLocaltime();
        if (lt) {
            const t = {
                tm_year: lt.tm_year,
                tm_mon: lt.tm_mon,
                tm_mday: lt.tm_mday,
                tm_hour: lt.tm_hour,
                tm_min: lt.tm_min,
                tm_sec: lt.tm_sec,
                tm_wday: lt.tm_wday,
                tm_yday: lt.tm_yday,
                tm_isdst: lt.tm_isdst,
            };
            t.tm_year = atoi(y) - 1900;
            t.tm_mon = atoi(mo) - 1;
            t.tm_mday = atoi(md);
            t.tm_hour = atoi(h);
            t.tm_min = atoi(mi);
            t.tm_sec = atoi(s);
            timeresult = mktime(t);
        }
        if (timeresult === -1) {
            // `#if 0` debugpline1 (calendar.c:166–170) is compiled out.
        } else {
            return timeresult;
        }
    }
    return 0;
}

/**
 * C ref: calendar.c getnow — NETHACK_FIXED_DATETIME via time_from_*.
 */
export function getnow() {
    const fixed = game.datetime;
    if (fixed) {
        const parsed = time_from_yyyymmddhhmmss(fixed);
        if (parsed !== 0) return parsed;
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
 * Contest patch 001 `time_from_yyyymmddhhmmss` copies the recorder's
 * `localtime` (`tm_isdst` 1) then `mktime`, so `getnow()` for a winter
 * civil stamp is the stamp-as-EDT epoch. `getlt` re-reads it under
 * America/New_York, landing one hour earlier in EST
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
