// version.js — Build version info
export const VERSION = '0.1.0';
export const BUILD_DATE = '2026-04-18';
export const COMMIT = 'contest-skeleton';
export const COMMIT_NUMBER = '0';
export const TELEPORT_BUILD_DATE = '2026-04-18';

// The pinned LP64 libc implements atoi as (int) strtol(..., 10). Preserve
// strtol saturation and int narrowing before FEATURE_NOTICE_VER's ulong cast.
function version_atoi(str) {
    const digits = str.match(/^[\t\n\v\f\r ]*([+-]?[0-9]+)/);
    if (!digits) return 0n;
    let value = BigInt(digits[1]);
    const max = (1n << 63n) - 1n, min = -(1n << 63n);
    if (value > max) value = max;
    if (value < min) value = min;
    return BigInt.asIntN(32, value);
}

export function get_feature_notice_ver(str) {
    if (str == null) return 0n;
    const istr = [];
    let start = 0, j = 0;
    for (let i = 0; i < str.length; ++i) {
        if (str[i] === '.') {
            istr.push(str.slice(start, i));
            start = i + 1;
            if (++j === 2) break;
        } else if (str[i] < '0' || str[i] > '9') {
            return 0n;
        }
    }
    if (j !== 2) return 0n;
    istr.push(str.slice(start));
    const [ver_maj, ver_min, patch] = istr.map(version_atoi);
    // hack.h:FEATURE_NOTICE_VER does NOT mask individual components to bytes.
    return BigInt.asUintN(64, (ver_maj << 24n) | (ver_min << 16n) | (patch << 8n));
}

export function get_current_feature_ver() {
    return 5n << 24n; // pinned NetHack 5.0.0_Release, patchlevel.h
}
