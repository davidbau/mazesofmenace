// hacklib.js — Utility functions.
// C ref: hacklib.c, dungeon.c helpers

import { game } from './gstate.js';

export function isok(x, y) {
    const { COLNO, ROWNO } = await_const();
    return x >= 1 && x <= COLNO - 1 && y >= 0 && y <= ROWNO - 1;
}

// Lazy import to avoid circular deps
let _const = null;
function await_const() {
    if (!_const) _const = { COLNO: 80, ROWNO: 21 };
    return _const;
}

export function distmin(x1, y1, x2, y2) {
    return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
}

export function dist2(x1, y1, x2, y2) {
    return (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
}

export function depth(uz) {
    const dnum = uz?.dnum ?? 0;
    const dlevel = uz?.dlevel ?? 1;
    const dungeon = game?.dungeons?.[dnum];
    if (!dungeon) return dlevel;
    return (dungeon.depth_start || 1) + dlevel - 1;
}

// C ref: calendar.c.  The harness passes fixed datetimes as
// YYYYMMDDHHMMSS; keep this independent from the host timezone.
export function parseDatetime(datetime) {
    if (typeof datetime !== 'string' || !/^\d{14}$/.test(datetime)) return null;
    const year = Number(datetime.slice(0, 4));
    const month = Number(datetime.slice(4, 6));
    const day = Number(datetime.slice(6, 8));
    const hour = Number(datetime.slice(8, 10));
    const minute = Number(datetime.slice(10, 12));
    const second = Number(datetime.slice(12, 14));
    if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)
        || hour > 23 || minute > 59 || second > 59) return null;

    return {
        year,
        month,
        day,
        hour,
        minute,
        second,
        tm_year: year - 1900,
        tm_mon: month - 1,
        tm_mday: day,
        tm_hour: hour,
        tm_min: minute,
        tm_sec: second,
        tm_yday: dayOfYear(year, month, day) - 1,
        tm_wday: weekday(year, month, day),
    };
}

export function phaseOfMoon(time = game?._lt) {
    if (!time) return 0;
    const diy = time.tm_yday;
    const goldn = (time.tm_year % 19) + 1;
    let epact = (11 * goldn + 18) % 30;
    if ((epact === 25 && goldn > 11) || epact === 24) epact++;
    return (Math.trunc(((((diy + epact) * 6) + 11) % 177) / 22)) & 7;
}

export function friday13(time = game?._lt) {
    return !!time && time.tm_wday === 5 && time.tm_mday === 13;
}

export function night(time = game?._lt) {
    const hour = time?.tm_hour ?? 12;
    return hour < 6 || hour > 21;
}

export function midnight(time = game?._lt) {
    return (time?.tm_hour ?? 12) === 0;
}

function isLeapYear(year) {
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year, month) {
    const days = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return days[month - 1] || 0;
}

function dayOfYear(year, month, day) {
    let total = day;
    for (let m = 1; m < month; m++) total += daysInMonth(year, m);
    return total;
}

function weekday(year, month, day) {
    // Sakamoto's algorithm; returns 0 == Sunday like C tm_wday.
    const offsets = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
    let y = year;
    if (month < 3) y--;
    return (y + Math.trunc(y / 4) - Math.trunc(y / 100)
        + Math.trunc(y / 400) + offsets[month - 1] + day) % 7;
}

// C ref: rn2(x) already in rng.js — re-export not needed
