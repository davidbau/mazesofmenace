// NetHack's scored LP64 ABI: int is 32 bits and long is 64 bits.
// Keep long arithmetic exact. Legacy save/input Numbers are accepted only
// while exact; converting an already-rounded Number cannot recover C state.
export const LONG_MAX = (1n << 63n) - 1n;
export const LONG_MIN = -(1n << 63n);

export function clong(value = 0n) {
    if (typeof value === 'number' && !Number.isSafeInteger(value))
        throw new RangeError('inexact Number used as C long');
    return BigInt.asIntN(64, BigInt(value ?? 0));
}

// include/integer.h: nowrap_add. Preserve the actual compiled subtraction,
// including its wrap when a caller violates the nonnegative precondition.
export function nowrap_add(a, b) {
    a = clong(a);
    b = clong(b);
    return a <= clong(LONG_MAX - b) ? clong(a + b) : LONG_MAX;
}
