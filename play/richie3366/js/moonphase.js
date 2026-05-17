// moonphase.js — Calendar bits for flags (moon phase, Friday 13th).
// C ref: hacklib.c phase_of_the_moon(), friday_13th(), getlt().

/**
 * Parse NETHACK_FIXED_DATETIME style string (YYYYMMDDHHMMSS, optional tail).
 * Uses local wall time like C localtime().
 * @param {string} s
 * @returns {Date|null}
 */
export function parseFixedDatetime(s) {
    if (typeof s !== 'string' || s.length < 8) return null;
    const Y = Number(s.slice(0, 4));
    const M = Number(s.slice(4, 6)) - 1;
    const D = Number(s.slice(6, 8));
    const h = s.length >= 10 ? Number(s.slice(8, 10)) : 0;
    const mi = s.length >= 12 ? Number(s.slice(10, 12)) : 0;
    const sec = s.length >= 14 ? Number(s.slice(12, 14)) : 0;
    if ([Y, M, D, h, mi, sec].some((n) => Number.isNaN(n))) return null;
    const d = new Date(Y, M, D, h, mi, sec);
    return Number.isNaN(d.getTime()) ? null : d;
}

/** C: struct tm tm_yday — day-of-year 0..365, Jan 1 = 0. */
function tmYdayLocal(d) {
    const y = d.getFullYear();
    const t0 = new Date(y, 0, 1);
    const t1 = new Date(y, d.getMonth(), d.getDate());
    return Math.round((t1 - t0) / 86400000);
}

/**
 * C: phase_of_the_moon() — 0–7, 0 new, 4 full.
 * @param {Date} d
 * @returns {number}
 */
export function phaseOfTheMoonFromDate(d) {
    const diy = tmYdayLocal(d);
    const tmYear = d.getFullYear() - 1900;
    let goldn = (tmYear % 19) + 1;
    let epact = (11 * goldn + 18) % 30;
    if ((epact === 25 && goldn > 11) || epact === 24) epact++;
    return Math.floor(((((diy + epact) * 6) + 11) % 177) / 22) & 7;
}

/**
 * C: friday_13th() — local calendar is Friday the 13th.
 * @param {Date} d
 * @returns {boolean}
 */
export function isFriday13thFromDate(d) {
    return d.getDay() === 5 && d.getDate() === 13;
}
