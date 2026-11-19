// js/crt/time.js: time(), localtime(), mktime() as the recorder sees them
// (transpiler-design.md 5; CLAUDE.md 2.4 "Time"). Hand-written runtime.
//
// Recorder environment (docs/recording-environment.md, transpiler/out/stage1-findings.md):
//   - TZ=America/New_York, Darwin libc (tzcode) semantics.
//   - The official recordings were made while US daylight time was in effect,
//     and patch 001's time_from_yyyymmddhhmmss() copies the real clock's
//     tm_isdst before mktime(). The reference recorder reproduces that by
//     pinning time() to REAL_NOW (tools/recorder-env/realnow.c); so does this
//     module. The effect: a pinned winter time comes out one hour earlier.
//
// New York rules are coded explicitly (no Intl/tzdata dependency), from 1955 on
// (verified against Darwin's tzdata in tests/crt/time.test.mjs):
//   1955-1973  last Sunday of April .. last Sunday of October
//   1974       January 6 .. last Sunday of October;  1975  February 23 .. last Sunday of October
//   1976-1986  last Sunday of April .. last Sunday of October
//   1987-2006  first Sunday of April .. last Sunday of October
//   2007-      second Sunday of March .. first Sunday of November
// Transitions at 02:00 local (standard time at the start, daylight time at the end).
// Earlier dates throw (not modeled).
import { CTrap } from './int.js';
import { cstrLiteral } from './mem.js';

/** time() in the recorder: 2026-05-02 12:00:00 UTC (US daylight time). */
export const REAL_NOW = 1777723200;
const EST = -18000, EDT = -14400;
const ZONE_EST = cstrLiteral('EST'), ZONE_EDT = cstrLiteral('EDT');

// days since 1970-01-01 of a proleptic Gregorian date (month 1..12)
export function daysFromCivil(y, m, d) {
    y -= m <= 2 ? 1 : 0;
    const era = Math.floor(y / 400);
    const yoe = y - era * 400;
    const doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
    const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
    return era * 146097 + doe - 719468;
}
function civilFromDays(z) {
    z += 719468;
    const era = Math.floor(z / 146097);
    const doe = z - era * 146097;
    const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
    const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
    const mp = Math.floor((5 * doy + 2) / 153);
    const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
    const m = mp + (mp < 10 ? 3 : -9);
    return { y: era * 400 + yoe + (m <= 2 ? 1 : 0), m, d };
}
const weekday = (days) => ((days % 7) + 11) % 7;   // 1970-01-01 was a Thursday (4)
const nthSunday = (y, m, n) => { const d1 = daysFromCivil(y, m, 1); return d1 + ((7 - weekday(d1)) % 7) + 7 * (n - 1); };
const lastSunday = (y, m) => { const dl = daysFromCivil(y, m + 1, 1) - 1; return dl - weekday(dl); };

/** [start, end) of daylight time in year y, as UTC seconds. */
function dstRange(y) {
    if (y < 1955) throw new CTrap(`local time before 1955 is not modeled (year ${y})`);
    let s, e;
    if (y >= 2007) { s = nthSunday(y, 3, 2); e = nthSunday(y, 11, 1); }
    else if (y >= 1987) { s = nthSunday(y, 4, 1); e = lastSunday(y, 10); }
    else if (y === 1974) { s = daysFromCivil(1974, 1, 6); e = lastSunday(y, 10); }
    else if (y === 1975) { s = daysFromCivil(1975, 2, 23); e = lastSunday(y, 10); }
    else { s = lastSunday(y, 4); e = lastSunday(y, 10); }
    return [s * 86400 + 7200 - EST, e * 86400 + 7200 - EDT];
}
/** Is UTC time t in daylight time? */
export function isDst(t) {
    const y = civilFromDays(Math.floor((t + EST) / 86400)).y;
    const [s, e] = dstRange(y);
    return t >= s && t < e;
}

/** struct tm (the fields NetHack and Lua use, plus Darwin's tm_gmtoff/tm_zone). */
export class Tm {
    constructor() {
        this.tm_sec = 0; this.tm_min = 0; this.tm_hour = 0; this.tm_mday = 0; this.tm_mon = 0;
        this.tm_year = 0; this.tm_wday = 0; this.tm_yday = 0; this.tm_isdst = 0;
        this.tm_gmtoff = 0; this.tm_zone = null;
    }
}

/** Fill tm with the local (New York) time of UTC time t. */
export function localtimeInto(t, tm) {
    const dst = isDst(t);
    const off = dst ? EDT : EST;
    const local = t + off;
    const days = Math.floor(local / 86400);
    const secs = local - days * 86400;
    const { y, m, d } = civilFromDays(days);
    tm.tm_sec = secs % 60; tm.tm_min = Math.floor(secs / 60) % 60; tm.tm_hour = Math.floor(secs / 3600);
    tm.tm_mday = d; tm.tm_mon = m - 1; tm.tm_year = y - 1900;
    tm.tm_wday = weekday(days); tm.tm_yday = days - daysFromCivil(y, 1, 1);
    tm.tm_isdst = dst ? 1 : 0; tm.tm_gmtoff = off; tm.tm_zone = dst ? ZONE_EDT : ZONE_EST;
    return tm;
}

const staticTm = new Tm();   // localtime()'s static result, overwritten by every call
/** localtime(&t): pointer to a static struct tm (as in C). */
export const localtime = (tp) => localtimeInto(Number(tp.get(0)), staticTm);
export const localtime_r = (tp, tm) => localtimeInto(Number(tp.get(0)), tm);

// ---------- mktime: port of Darwin Libc stdtime/FreeBSD/localtime.c ----------
// (Libc-1669.60.4: time1 / time2 / time2sub / tmcomp). The binary search over
// the whole 64-bit time_t range is reproduced exactly, because when a local
// time occurs twice (the fall-back overlap) and tm_isdst < 0, the instant it
// returns depends on the search path. Probes far from the target only need the
// right comparison sign; they use standard time before 1955 and report an
// extreme year beyond 2^53 seconds (as localsub's NULL does).
const TYPES = [{ off: EST, isdst: 0 }, { off: EDT, isdst: 1 }];   // most recent first (time1's "seen" order)
const WRONG = -1;

function probe(tb) {   // localsub for a BigInt time: fields, or null when out of range
    if (tb > 9007199254740991n || tb < -9007199254740991n) return null;
    const t = Number(tb);
    const days0 = Math.floor((t + EST) / 86400);
    const y0 = civilFromDays(days0).y;
    if (y0 - 1900 > 2147483647 || y0 - 1900 < -2147483648) return null;
    const tm = new Tm();
    if (y0 < 1955) {   // only the year matters this far from any modeled target
        const days = Math.floor((t + EST) / 86400), secs = t + EST - days * 86400;
        const { y, m, d } = civilFromDays(days);
        Object.assign(tm, { tm_year: y - 1900, tm_mon: m - 1, tm_mday: d, tm_hour: Math.floor(secs / 3600),
            tm_min: Math.floor(secs / 60) % 60, tm_sec: secs % 60, tm_isdst: 0 });
        return tm;
    }
    return localtimeInto(t, tm);
}
function tmcomp(a, b) {
    if (a.tm_year !== b.tm_year) return a.tm_year > b.tm_year ? 1 : -1;
    let r;
    if ((r = a.tm_mon - b.tm_mon) === 0 && (r = a.tm_mday - b.tm_mday) === 0
        && (r = a.tm_hour - b.tm_hour) === 0 && (r = a.tm_min - b.tm_min) === 0) r = a.tm_sec - b.tm_sec;
    return r;
}
// normalize_overflow: tens += floor(units / base), units = units mod base
function normalize(o, tens, units, base) {
    const d = o[units] >= 0 ? Math.trunc(o[units] / base) : -1 - Math.trunc((-1 - o[units]) / base);
    o[units] -= d * base;
    o[tens] += d;
}
const isleap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
const MON_LEN = [[31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31], [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]];

function time2sub(tmp, doNormSecs) {
    const your = { ...tmp };
    if (doNormSecs) normalize(your, 'tm_min', 'tm_sec', 60);
    normalize(your, 'tm_hour', 'tm_min', 60);
    normalize(your, 'tm_mday', 'tm_hour', 24);
    const yo = { y: your.tm_year, mon: your.tm_mon };
    normalize(yo, 'y', 'mon', 12);
    let y = yo.y + 1900;
    your.tm_mon = yo.mon;
    while (your.tm_mday <= 0) { y -= 1; your.tm_mday += isleap(y + (1 < your.tm_mon ? 1 : 0)) ? 366 : 365; }
    while (your.tm_mday > 366) { your.tm_mday -= isleap(y + (1 < your.tm_mon ? 1 : 0)) ? 366 : 365; y += 1; }
    for (;;) {
        const i = MON_LEN[isleap(y) ? 1 : 0][your.tm_mon];
        if (your.tm_mday <= i) break;
        your.tm_mday -= i;
        if (++your.tm_mon >= 12) { your.tm_mon = 0; y += 1; }
    }
    your.tm_year = y - 1900;
    if (your.tm_year < 0) return { t: WRONG, ok: false };   // "Don't go below 1900 for POLA"
    let saved;
    if (your.tm_sec >= 0 && your.tm_sec < 60) saved = 0;
    else if (y < 1970) { your.tm_sec += 1 - 60; saved = your.tm_sec; your.tm_sec = 59; }
    else { saved = your.tm_sec; your.tm_sec = 0; }

    let lo = -(2n ** 63n), hi = 2n ** 63n - 1n, t, my;
    for (;;) {
        t = lo / 2n + hi / 2n;
        if (t < lo) t = lo; else if (t > hi) t = hi;
        my = probe(t);
        const dir = my === null ? (t > 0n ? 1 : -1) : tmcomp(my, your);
        if (dir !== 0) {
            if (t === lo) { ++t; ++lo; } else if (t === hi) { --t; --hi; }
            if (lo > hi) return { t: WRONG, ok: false };
            if (dir > 0) hi = t; else lo = t;
            continue;
        }
        if (your.tm_isdst < 0 || my.tm_isdst === your.tm_isdst) break;
        // right time, wrong type: hunt for right time, right type
        let found = false;
        for (const ti of [...TYPES].reverse()) {
            if (ti.isdst !== your.tm_isdst) continue;
            for (const tj of [...TYPES].reverse()) {
                if (tj.isdst === your.tm_isdst) continue;
                const newt = t + BigInt(tj.off - ti.off);
                const m2 = probe(newt);
                if (m2 === null || tmcomp(m2, your) !== 0 || m2.tm_isdst !== your.tm_isdst) continue;
                t = newt; found = true; break;
            }
            if (found) break;
        }
        if (!found) return { t: WRONG, ok: false };
        break;
    }
    const tn = Number(t) + saved;
    localtimeInto(tn, tmp);
    return { t: tn, ok: true };
}
function time2(tmp) {
    const r = time2sub(tmp, false);
    return r.ok ? r : time2sub(tmp, true);
}

/**
 * mktime(tm), Darwin semantics (see above). In practice: tm_isdst > 0 reads
 * the fields as daylight time and 0 as standard time, whether or not that is
 * in effect then (time1's retry with the other offset); < 0 uses the offset in
 * effect. That is what makes patch 001's pinned winter time come out an hour
 * early. A nonexistent spring-gap time with tm_isdst < 0 is read as standard
 * time. On success the fields are rewritten from the result; on failure -1.
 */
export function mktime(tm) {
    if (tm.tm_isdst > 1) tm.tm_isdst = 1;
    let r = time2(tm);
    // Apple builds time1 with PCTS defined (measured: a spring-gap time with
    // tm_isdst < 0 succeeds): on failure, reset to standard time and retry.
    if (r.ok) return r.t;
    if (tm.tm_isdst < 0) tm.tm_isdst = 0;
    for (const same of TYPES) {
        if (same.isdst !== tm.tm_isdst) continue;
        for (const other of TYPES) {
            if (other.isdst === tm.tm_isdst) continue;
            tm.tm_sec += other.off - same.off;
            tm.tm_isdst = tm.tm_isdst ? 0 : 1;
            r = time2(tm);
            if (r.ok) return r.t;
            tm.tm_sec -= other.off - same.off;
            tm.tm_isdst = tm.tm_isdst ? 0 : 1;
        }
    }
    return WRONG;
}

/** time(tloc): REAL_NOW; stores through tloc when it is not NULL. */
export function time(tloc) {
    if (tloc) tloc.set(0, REAL_NOW);
    return REAL_NOW;
}
export const difftime = (a, b) => Number(a) - Number(b);
