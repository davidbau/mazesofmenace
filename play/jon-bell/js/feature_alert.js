// C version.c:get_feature_notice_ver/get_current_feature_ver and
// options.c:feature_alert_opts/optfn_suppress_alert. This is the game's
// feature version, not the JS build version in version.js.
import { get_current_feature_ver, get_feature_notice_ver } from './version.js'; // relocate-fns




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
