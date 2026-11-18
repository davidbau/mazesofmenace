/* Copyright 2024 The Emscripten Authors. SPDX-License-Identifier: MIT
 * Adapted from pinned Emscripten 4.0.10 src/lib/libtime.js, replacing C struct
 * writes with JavaScript fields. Date-local timezone/DST policy intentionally
 * follows that existing runtime, including explicit tm_isdst adjustment.
 * Ordinary play uses the host timezone. Replay can supply an IANA timezone
 * so local calendar operations use the environment of the original recording.
 * Date-range failures are explicit. The caller supplies the game clock.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
import {lookupTimezone} from '../platform/timezone/info.js';

const cumulative = [0,31,59,90,120,151,181,212,243,273,304,334];
function yday(date) {
    const year = date.getFullYear(), month = date.getMonth();
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    return cumulative[month] + date.getDate() - 1 + Number(leap && month > 1);
}
function fields(date) {
    return { tm_sec: date.getSeconds(), tm_min: date.getMinutes(), tm_hour: date.getHours(),
        tm_mday: date.getDate(), tm_mon: date.getMonth(), tm_year: date.getFullYear() - 1900,
        tm_wday: date.getDay(), tm_yday: yday(date) };
}
function utcFields(date) {
    const year = date.getUTCFullYear(), month = date.getUTCMonth();
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    return { tm_sec: date.getUTCSeconds(), tm_min: date.getUTCMinutes(),
        tm_hour: date.getUTCHours(), tm_mday: date.getUTCDate(), tm_mon: month,
        tm_year: year - 1900, tm_wday: date.getUTCDay(),
        tm_yday: cumulative[month] + date.getUTCDate() - 1 + Number(leap && month > 1) };
}

function utcDate(year, month, day, hour, minute = 0, second = 0) {
    const date = new Date(0);
    date.setUTCFullYear(year, month, day);
    date.setUTCHours(hour, minute, second, 0);
    return date;
}

function zonedCalendar(timeZone) {
    const offset = date => -lookupTimezone(timeZone, Math.floor(date.getTime() / 1000)).offset;
    const localWallTime = date => new Date(date.getTime() - offset(date) * 1000);
    return {
        fields: date => utcFields(localWallTime(date)),
        offset,
        // Try the offsets on both sides of the wall-clock time. In a repeated
        // hour take the earlier instant, and in a missing hour advance by the gap.
        fromWallTime(wall) {
            const at = wall.getTime(), day = 86400000;
            const before = offset(new Date(at - day)), after = offset(new Date(at + day));
            const first = new Date(at + Math.min(before, after) * 1000);
            return localWallTime(first).getTime() === at
                ? first : new Date(at + Math.max(before, after) * 1000);
        },
        season: (year, month) => offset(utcDate(year, month, 1, 12)),
    };
}

export function createCTime({ now = () => Date.now() / 1000, native = false, timeZone } = {}) {
    const zone = timeZone === undefined ? undefined : zonedCalendar(timeZone);
    const localFields = zone?.fields ?? fields;
    const offsetSeconds = zone?.offset ?? (date => date.getTimezoneOffset() * 60);
    const season = zone?.season ?? ((year, month) => {
        const date = new Date(0);
        date.setFullYear(year, month, 1);
        date.setHours(12, 0, 0, 0);
        return (date.getTime() - utcDate(year, month, 1, 12).getTime()) / 1000;
    });
    const local = {};
    const utc = {};
    return {
        time() {
            const value = now();
            return typeof value === 'bigint' ? value : BigInt(Math.floor(value));
        },
        localtime(seconds) {
            const date = new Date(Number(seconds) * 1000);
            if (!Number.isFinite(date.getTime())) return null;
            const localTime = localFields(date);
            const year = localTime.tm_year + 1900;
            const winter = zone ? season(year, 0) : new Date(year, 0, 1).getTimezoneOffset() * 60;
            const summer = zone ? season(year, 6) : new Date(year, 6, 1).getTimezoneOffset() * 60;
            const offset = offsetSeconds(date);
            Object.assign(local, localTime, {
                tm_isdst: Number(summer !== winter && offset === Math.min(winter, summer)),
                tm_gmtoff: BigInt(-offset),
            });
            return local;
        },
        gmtime(seconds) {
            const date = new Date(Number(seconds) * 1000);
            if (!Number.isFinite(date.getTime())) return null;
            return Object.assign(utc, utcFields(date), {tm_isdst: 0, tm_gmtoff: 0n});
        },
        mktime(value) {
            if (native || zone) {
                // The host reference rejects pre-1900 broken-down years.
                // Construct the wall clock in UTC so JS's 0..99 constructor
                // shorthand and gap normalization cannot alter the input.
                if (value.tm_year < 0) return -1n;
                const wall = utcDate(value.tm_year + 1900, value.tm_mon, value.tm_mday,
                    value.tm_hour, value.tm_min, value.tm_sec);
                if (!Number.isFinite(wall.getTime())) return -1n;
                const year = wall.getUTCFullYear();
                const winter = season(year, 0), summer = season(year, 6);
                let date;
                if (value.tm_isdst >= 0) {
                    let daylight = Math.min(winter,summer);
                    if (winter === summer && value.tm_isdst > 0) {
                        const clockYear = zone
                            ? localFields(new Date(Number(now()) * 1000)).tm_year + 1900
                            : new Date().getFullYear();
                        daylight -= Math.abs(season(clockYear, 0) - season(clockYear, 6));
                    }
                    const offset = value.tm_isdst ? daylight : Math.max(winter,summer);
                    date = new Date(wall.getTime() + offset * 1000);
                } else if (zone) {
                    date = zone.fromWallTime(wall);
                } else {
                    date = new Date(0); date.setFullYear(year,wall.getUTCMonth(),wall.getUTCDate());
                    date.setHours(wall.getUTCHours(),wall.getUTCMinutes(),wall.getUTCSeconds(),0);
                }
                if (!Number.isFinite(date.getTime())) return -1n;
                Object.assign(value, localFields(date), {tm_isdst:Number(winter!==summer &&
                    offsetSeconds(date)===Math.min(winter,summer))});
                return BigInt(Math.trunc(date.getTime()/1000));
            }
            const date = new Date(value.tm_year + 1900, value.tm_mon, value.tm_mday,
                value.tm_hour, value.tm_min, value.tm_sec, 0);
            if (!Number.isFinite(date.getTime())) return -1n;
            const dst = value.tm_isdst;
            const guessed = date.getTimezoneOffset();
            const winter = new Date(date.getFullYear(), 0, 1).getTimezoneOffset();
            const summer = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
            const dstOffset = Math.min(winter, summer);
            if (dst < 0) value.tm_isdst = Number(winter !== summer && dstOffset === guessed);
            else if ((dst > 0) !== (dstOffset === guessed)) {
                const actual = dst > 0 ? dstOffset : Math.max(winter, summer);
                date.setTime(date.getTime() + (actual - guessed) * 60000);
            }
            Object.assign(value, fields(date));
            return BigInt(Math.trunc(date.getTime() / 1000));
        },
        tmCopy: value => ({ ...value }),
    };
}
