// js/crt/int.js: exact C integer semantics for the recorder's ABI
// (LP64, arm64 Darwin: the reference recorder is an arm64 binary on Apple
// Silicon; transpiler-design.md 3.1). Hand-written runtime.
//
// Representation:
//   char, short, int and their unsigned forms: a Number holding the exact value.
//   long, unsigned long, long long, size_t (64-bit): a Number while the value is
//   a safe integer (|v| <= 2^53 - 1), otherwise a BigInt. Every 64-bit helper
//   accepts both forms and returns the normalized form, so `==`, `<` etc. work
//   on any mix (JS compares Number and BigInt exactly).
// Operations are the C operations on promoted types (int, unsigned int, long,
// unsigned long); narrower types are reached through the conversions.
// Cases C leaves undefined behave as the arm64 instructions clang emits at -O0
// (measured natively, tests/c-diff/int/int-vectors.c), because the recorder
// keeps running through them:
//   signed overflow wraps; shift counts are masked to the operand width;
//   x / 0 == 0 and x % 0 == x (sdiv/udiv, msub); INT_MIN / -1 == INT_MIN and
//   INT_MIN % -1 == 0; float -> integer saturates and NaN gives 0 (fcvtzs/fcvtzu).

export class CTrap extends Error {
    constructor(what) { super(`C trap: ${what}`); this.name = 'CTrap'; }
}

const MAX_SAFE_N = 2n ** 53n - 1n;
const TWO64 = 2n ** 64n;

/** Normalize a BigInt result: Number when it is a safe integer. */
export function norm(b) {
    return (b >= -MAX_SAFE_N && b <= MAX_SAFE_N) ? Number(b) : b;
}
const big = (x) => (typeof x === 'bigint' ? x : BigInt(x));
const isNum = (x) => typeof x === 'number';

// ---------- conversions (C casts and implicit conversions) ----------
// From any exact integer (Number of any size, or BigInt): the low bits,
// reinterpreted. ToInt32 on an integer-valued double is exact modulo 2^32.
const low32 = (x) => (isNum(x) ? x | 0 : Number(BigInt.asIntN(32, x)));
export const i8 = (x) => (low32(x) << 24) >> 24;
export const u8 = (x) => low32(x) & 0xff;
export const i16 = (x) => (low32(x) << 16) >> 16;
export const u16 = (x) => low32(x) & 0xffff;
export const i32 = (x) => low32(x);
export const u32 = (x) => low32(x) >>> 0;
export function i64(x) {
    if (isNum(x) && Number.isSafeInteger(x)) return x;
    return norm(BigInt.asIntN(64, big(x)));
}
export function u64(x) {
    if (isNum(x) && x >= 0 && Number.isSafeInteger(x)) return x;
    return norm(BigInt.asUintN(64, big(x)));
}
export const bool = (x) => (x == 0 ? 0 : 1);   // _Bool; == so that 0n counts

// floating point -> integer: truncation, saturating at the type's limits, NaN -> 0
// (arm64 fcvtzs / fcvtzu).
export function dtoi32(d) {
    if (Number.isNaN(d)) return 0;
    const t = Math.trunc(d) + 0;   // + 0: trunc(-0.5) is -0
    return t > 2147483647 ? 2147483647 : t < -2147483648 ? -2147483648 : t;
}
export function dtou32(d) {
    if (Number.isNaN(d)) return 0;
    const t = Math.trunc(d) + 0;
    return t > 4294967295 ? 4294967295 : t < 0 ? 0 : t;
}
export function dtoi64(d) {
    if (Number.isNaN(d)) return 0;
    const t = Math.trunc(d) + 0;
    if (t >= 2 ** 63) return 2n ** 63n - 1n;
    if (t < -(2 ** 63)) return -(2n ** 63n);
    return Number.isSafeInteger(t) ? t : BigInt(t);
}
export function dtou64(d) {
    if (Number.isNaN(d)) return 0;
    const t = Math.trunc(d) + 0;
    if (t >= 2 ** 64) return 2n ** 64n - 1n;
    if (t < 0) return 0;
    return Number.isSafeInteger(t) ? t : BigInt(t);
}
/** Integer (either form) -> double, rounded to nearest as C does. */
export const itod = (x) => Number(x);
export const fround = Math.fround;   // float storage

// ---------- int (32-bit signed) ----------
export const add32 = (a, b) => (a + b) | 0;
export const sub32 = (a, b) => (a - b) | 0;
export const mul32 = (a, b) => Math.imul(a, b);
export function div32(a, b) {
    if (b === 0) return 0;                               // arm64 sdiv
    return ((a - a % b) / b) | 0;   // exact: dividend minus remainder is a multiple of b; |0 wraps INT_MIN/-1, drops -0
}
export function rem32(a, b) {
    if (b === 0) return a;                               // arm64: a - (a / 0) * 0
    return (a % b) | 0;       // JS % has the dividend's sign, like C; |0 turns -0 into 0
}
export const neg32 = (a) => (-a) | 0;
export const not32 = (a) => ~a;
export const and32 = (a, b) => a & b;
export const or32 = (a, b) => a | b;
export const xor32 = (a, b) => a ^ b;
export const shl32 = (a, n) => a << n;          // JS masks n & 31, like arm64 LSL (w)
export const shr32 = (a, n) => a >> n;          // arithmetic (ASR), like clang on arm64

// ---------- unsigned int ----------
export const addu32 = (a, b) => (a + b) >>> 0;
export const subu32 = (a, b) => (a - b) >>> 0;
export const mulu32 = (a, b) => Math.imul(a, b) >>> 0;
export function divu32(a, b) {
    if (b === 0) return 0;
    return (a - a % b) / b;
}
export function remu32(a, b) {
    if (b === 0) return a;
    return a % b;
}
export const negu32 = (a) => (-a) >>> 0;
export const notu32 = (a) => (~a) >>> 0;
export const andu32 = (a, b) => (a & b) >>> 0;
export const oru32 = (a, b) => (a | b) >>> 0;
export const xoru32 = (a, b) => (a ^ b) >>> 0;
export const shlu32 = (a, n) => (a << n) >>> 0;
export const shru32 = (a, n) => a >>> n;

// ---------- long (64-bit signed) ----------
export function add64(a, b) {
    if (isNum(a) && isNum(b)) { const r = a + b; if (Number.isSafeInteger(r)) return r; }
    return norm(BigInt.asIntN(64, big(a) + big(b)));
}
export function sub64(a, b) {
    if (isNum(a) && isNum(b)) { const r = a - b; if (Number.isSafeInteger(r)) return r; }
    return norm(BigInt.asIntN(64, big(a) - big(b)));
}
export function mul64(a, b) {
    // a rounded product that is a safe integer was exact
    if (isNum(a) && isNum(b)) { const r = a * b; if (Number.isSafeInteger(r)) return r + 0; }
    return norm(BigInt.asIntN(64, big(a) * big(b)));
}
export function div64(a, b) {
    if (b == 0) return 0;                                  // arm64 sdiv
    if (isNum(a) && isNum(b)) return (a - a % b) / b + 0;   // exact for safe integers; +0 drops -0
    return norm(BigInt.asIntN(64, big(a) / big(b)));        // truncates like C; LONG_MIN / -1 wraps
}
export function rem64(a, b) {
    if (b == 0) return a;
    if (isNum(a) && isNum(b)) return (a % b) + 0;          // fmod is exact
    return norm(big(a) % big(b));                          // LONG_MIN % -1 == 0
}
export const neg64 = (a) => (isNum(a) ? -a + 0 : norm(BigInt.asIntN(64, -a)));
export function not64(a) {
    if (isNum(a)) { const r = -a - 1; if (Number.isSafeInteger(r)) return r; }
    return norm(BigInt.asIntN(64, ~big(a)));
}
const int32ish = (x) => isNum(x) && (x | 0) === x;
export const and64 = (a, b) => (int32ish(a) && int32ish(b) ? a & b : norm(BigInt.asIntN(64, big(a) & big(b))));
export const or64 = (a, b) => (int32ish(a) && int32ish(b) ? a | b : norm(BigInt.asIntN(64, big(a) | big(b))));
export const xor64 = (a, b) => (int32ish(a) && int32ish(b) ? a ^ b : norm(BigInt.asIntN(64, big(a) ^ big(b))));
export function shl64(a, n) {
    n = Number(n) & 63;
    return norm(BigInt.asIntN(64, big(a) << BigInt(n)));
}
export function shr64(a, n) {
    n = Number(n) & 63;
    if (isNum(a)) return Math.floor(a / 2 ** n);        // exact: power-of-two division, then floor
    return norm(a >> BigInt(n));
}

// ---------- unsigned long (64-bit) ----------
const wrapU = (b) => norm(BigInt.asUintN(64, b));
export function addu64(a, b) {
    if (isNum(a) && isNum(b)) { const r = a + b; if (r >= 0 && Number.isSafeInteger(r)) return r; }
    return wrapU(big(a) + big(b));
}
export function subu64(a, b) {
    if (isNum(a) && isNum(b)) { const r = a - b; if (r >= 0 && Number.isSafeInteger(r)) return r; }
    return wrapU(big(a) - big(b));
}
export function mulu64(a, b) {
    if (isNum(a) && isNum(b)) { const r = a * b; if (Number.isSafeInteger(r)) return r + 0; }
    return wrapU(big(a) * big(b));
}
export function divu64(a, b) {
    if (b == 0) return 0;
    if (isNum(a) && isNum(b)) return (a - a % b) / b;
    return norm(big(a) / big(b));
}
export function remu64(a, b) {
    if (b == 0) return a;
    if (isNum(a) && isNum(b)) return a % b;
    return norm(big(a) % big(b));
}
export const negu64 = (a) => wrapU(-big(a));
export const notu64 = (a) => wrapU(~big(a));
export const andu64 = (a, b) => wrapU(big(a) & big(b));
export const oru64 = (a, b) => wrapU(big(a) | big(b));
export const xoru64 = (a, b) => wrapU(big(a) ^ big(b));
export const shlu64 = (a, n) => wrapU(big(a) << BigInt(Number(n) & 63));
export function shru64(a, n) {
    n = Number(n) & 63;
    if (isNum(a)) return Math.floor(a / 2 ** n);
    return norm(a >> BigInt(n));
}

export { TWO64 };
