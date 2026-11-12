/* Copyright 2024 The Emscripten Authors. SPDX-License-Identifier: MIT
 * Adapted from pinned Emscripten 4.0.10 src/lib/libtime.js, replacing C struct
 * writes with JavaScript fields. Date-local timezone/DST policy intentionally
 * follows that existing runtime, including explicit tm_isdst adjustment.
 * Host timezone is used, as in the current engine; this does not implement a
 * per-instance IANA/POSIX TZ database or strftime. Date-range failures are
 * explicit. The caller supplies the recording environment and clock.
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
export function createCTime({ now = () => Date.now() / 1000, native = false } = {}) {
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
            const winter = new Date(date.getFullYear(), 0, 1).getTimezoneOffset();
            const summer = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
            Object.assign(local, fields(date), {
                tm_isdst: Number(summer !== winter && date.getTimezoneOffset() === Math.min(winter, summer)),
                tm_gmtoff: BigInt(-date.getTimezoneOffset() * 60),
            });
            return local;
        },
        gmtime(seconds) {
            const date = new Date(Number(seconds) * 1000);
            if (!Number.isFinite(date.getTime())) return null;
            const year = date.getUTCFullYear(), month = date.getUTCMonth();
            const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
            Object.assign(utc, { tm_sec: date.getUTCSeconds(), tm_min: date.getUTCMinutes(),
                tm_hour: date.getUTCHours(), tm_mday: date.getUTCDate(), tm_mon: month,
                tm_year: year - 1900, tm_wday: date.getUTCDay(),
                tm_yday: cumulative[month] + date.getUTCDate() - 1 + Number(leap && month > 1),
                tm_isdst: 0, tm_gmtoff: 0n });
            return utc;
        },
        mktime(value) {
            if (native) {
                // The host reference rejects pre-1900 broken-down years.
                // Construct the wall clock in UTC so JS's 0..99 constructor
                // shorthand and gap normalization cannot alter the input.
                if (value.tm_year < 0) return -1n;
                const wall = new Date(0);
                wall.setUTCFullYear(value.tm_year + 1900, value.tm_mon, value.tm_mday);
                wall.setUTCHours(value.tm_hour, value.tm_min, value.tm_sec, 0);
                if (!Number.isFinite(wall.getTime())) return -1n;
                const year = wall.getUTCFullYear();
                const season = (month, atYear = year) => {
                    const date = new Date(0); date.setFullYear(atYear, month, 1); date.setHours(12,0,0,0);
                    // Milliseconds retain historical offsets including seconds.
                    return (date.getTime() - Date.UTC(atYear,month,1,12)) / 1000;
                };
                const winter = season(0), summer = season(6);
                let date;
                if (value.tm_isdst >= 0) {
                    let daylight = Math.min(winter,summer);
                    if (winter === summer && value.tm_isdst > 0) {
                        const clockYear = new Date().getFullYear();
                        daylight -= Math.abs(season(0,clockYear)-season(6,clockYear));
                    }
                    const offset = value.tm_isdst ? daylight : Math.max(winter,summer);
                    date = new Date(wall.getTime() + offset * 1000);
                } else {
                    date = new Date(0); date.setFullYear(year,wall.getUTCMonth(),wall.getUTCDate());
                    date.setHours(wall.getUTCHours(),wall.getUTCMinutes(),wall.getUTCSeconds(),0);
                }
                if (!Number.isFinite(date.getTime())) return -1n;
                Object.assign(value, fields(date), {tm_isdst:Number(winter!==summer &&
                    date.getTimezoneOffset()*60===Math.min(winter,summer))});
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
