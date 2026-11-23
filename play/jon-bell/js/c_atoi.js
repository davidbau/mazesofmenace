/* c_atoi.js -- C atoi(): optional leading isspace(), optional sign, digits.
 * glibc/BSD atoi() is (int) strtol(s, NULL, 10): strtol saturates at the
 * long limits and the conversion to int keeps the low 32 bits. */
export function c_atoi(s) {
    const m = /^[ \t\n\v\f\r]*([+-]?[0-9]+)/.exec(String(s ?? ''));
    if (!m) return 0;
    const n = BigInt(m[1]);
    return Number(BigInt.asIntN(32, n > 9223372036854775807n ? 9223372036854775807n
        : n < -9223372036854775808n ? -9223372036854775808n : n));
}

/* C atol()/strtol(): 64-bit long, saturating (LP64). */
export function c_atol(s) {
    const m = /^[ \t\n\v\f\r]*([+-]?[0-9]+)/.exec(String(s ?? ''));
    if (!m) return 0;
    const n = BigInt(m[1]);
    return Number(n > 9223372036854775807n ? 9223372036854775807n
        : n < -9223372036854775808n ? -9223372036854775808n : n);
}
