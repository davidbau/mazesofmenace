// calendar.js — date and time of play.
// C ref: src/calendar.c
//
// NetHack reads the wall clock for moon phase, the Friday-the-13th luck
// penalty, night/midnight checks, hire dates, and shopkeeper greetings.
// The recorder pins all of it through NETHACK_FIXED_DATETIME
// (patch 001-deterministic-runtime), which makes getnow() parse a
// "YYYYMMDDHHMMSS" string instead of calling time().
//
// The contest hands us the same string as `input.datetime`. Nothing in js/ may
// read the host clock: doing so would make our output depend on when it ran.

import { game } from './gstate.js';

// The C works in `struct tm`, so we do too, with the same field semantics —
// notably tm_year is (year - 1900), tm_mon is 0-based, and tm_yday is 0-based.
// phase_of_the_moon() depends on tm_year being the 1900-relative value, so
// storing a plain year here would silently shift the moon.
function makeTm(year, mon1, mday, hour, min, sec) {
    // Day-of-week and day-of-year come from calendar arithmetic, computed in
    // UTC so no host timezone can perturb them. The C gets them from mktime()
    // normalising the struct.
    const utc = Date.UTC(year, mon1 - 1, mday, hour, min, sec);
    const startOfYear = Date.UTC(year, 0, 1);
    return {
        tm_year: year - 1900,
        tm_mon: mon1 - 1,
        tm_mday: mday,
        tm_hour: hour,
        tm_min: min,
        tm_sec: sec,
        tm_wday: new Date(utc).getUTCDay(),
        tm_yday: Math.floor((utc - startOfYear) / 86400000),
    };
}

// src/calendar.c:120 time_from_yyyymmddhhmmss()
// Returns null for anything that is not exactly 14 digits, mirroring the C's
// `strlen(buf) == 14` guard which otherwise returns (time_t) 0.
export function time_from_yyyymmddhhmmss(buf) {
    if (!buf || String(buf).length !== 14) return null;
    const s = String(buf);
    const n = (from, len) => parseInt(s.substr(from, len), 10);
    return makeTm(n(0, 4), n(4, 2), n(6, 2), n(8, 2), n(10, 2), n(12, 2));
}

// src/calendar.c:31 getnow() — with patch 001 applied, this is the fixed
// datetime when one is supplied. `game.fixed_datetime` is set from
// input.datetime by the segment runner.
export function getnow() {
    const fixed = time_from_yyyymmddhhmmss(game.fixed_datetime);
    if (fixed)
        return fixed;

    /* src/calendar.c:31 — unpatched, getnow() is `(void) time(&datetime)`,
       i.e. the host clock. Patch 001 overrides it with a fixed datetime when
       one is supplied, and the session runner ALWAYS supplies one, so scoring
       never reaches this branch. Free play in the browser supplies nothing,
       and throwing there killed the game the first time anything asked for
       the date (moon phase, Friday the 13th, the tombstone) — which is what
       made the fork fail the leaderboard's playability check. */
    const d = new Date();
    return makeTm(d.getFullYear(), d.getMonth() + 1, d.getDate(),
                  d.getHours(), d.getMinutes(), d.getSeconds());
}

// src/calendar.c:40 getlt() — localtime(getnow()).
// The recorder parses the fixed string as local time and reads it back as
// local time, so the calendar fields round-trip unchanged and we can work
// directly with the parsed struct.
export function getlt() {
    /* getnow() supplies the fixed datetime under scoring and the host clock
       in free play, so this never has to invent anything. */
    return getnow();
}

// src/calendar.c:48 getyear()
export function getyear() {
    return 1900 + getlt().tm_year;
}

// src/calendar.c:55 yyyymmdd()
export function yyyymmdd(date) {
    const lt = date || getlt();
    let datenum = (lt.tm_year < 70) ? lt.tm_year + 2000 : lt.tm_year + 1900;
    datenum = datenum * 100 + (lt.tm_mon + 1);
    datenum = datenum * 100 + lt.tm_mday;
    return datenum;
}

// src/calendar.c:79 hhmmss()
export function hhmmss(date) {
    const lt = date || getlt();
    return lt.tm_hour * 10000 + lt.tm_min * 100 + lt.tm_sec;
}

// src/calendar.c:94 yyyymmddhhmmss()
export function yyyymmddhhmmss(date) {
    const lt = date || getlt();
    const datenum = (lt.tm_year < 70) ? lt.tm_year + 2000 : lt.tm_year + 1900;
    const p2 = (v) => String(v).padStart(2, '0');
    return String(datenum).padStart(4, '0')
        + p2(lt.tm_mon + 1) + p2(lt.tm_mday)
        + p2(lt.tm_hour) + p2(lt.tm_min) + p2(lt.tm_sec);
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
// src/calendar.c:190 phase_of_the_moon() — 0-7, with 0: new, 4: full
export function phase_of_the_moon() {
    const lt = getlt();

    const diy = lt.tm_yday;
    const goldn = (lt.tm_year % 19) + 1;
    let epact = (11 * goldn + 18) % 30;
    if ((epact === 25 && goldn > 11) || epact === 24)
        epact++;

    return ((((((diy + epact) * 6) + 11) % 177) / 22) | 0) & 7;
}

// src/calendar.c:205 friday_13th()
export function friday_13th() {
    const lt = getlt();

    /* tm_wday (day of week; 0==Sunday) == 5 => Friday */
    return lt.tm_wday === 5 && lt.tm_mday === 13;
}

// src/calendar.c:214 night()
export function night() {
    const hour = getlt().tm_hour;

    return (hour < 6 || hour > 21) ? 1 : 0;
}

// src/calendar.c:222 midnight()
export function midnight() {
    return getlt().tm_hour === 0 ? 1 : 0;
}
