// C version.c:get_feature_notice_ver/get_current_feature_ver and
// options.c:feature_alert_opts/optfn_suppress_alert. This is the game's
// feature version, not the JS build version in version.js.

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

export function feature_notice_version(value) {
    const ver = BigInt(value || 0);
    return `${ver >> 24n}.${(ver & 0xff0000n) >> 16n}.${(ver & 0xff00n) >> 8n}`;
}

// Message/error text is returned to the synchronous config parser or async
// interactive caller. Startup config-error presentation remains a shared gap.
export function optfn_suppress_alert_set(flags, op, negated = false, initial = true) {
    if (negated)
        return { ok: false, message: null, error: 'The suppress_alert option may not be negated.' };
    if (!op) return { ok: true, message: null, error: null };
    const fnv = get_feature_notice_ver(op);
    if (fnv === 0n) return { ok: true, message: null, error: null };
    if (fnv > get_current_feature_ver())
        return { ok: true,
            message: initial ? null : "You can't disable new feature alerts for future versions.",
            error: initial ? `suppress_alert=${op} Invalid reference to a future version ignored` : null };
    // Accepted values are bounded by 5.0.0, so this ulong is exactly representable
    // as a Number in the serializable game state. Parsing above still needs 64 bits.
    flags.suppress_alert = Number(fnv);
    return { ok: true, error: null, message: initial ? null
        : `Feature change alerts disabled for NetHack ${feature_notice_version(fnv)} features and prior.` };
}
