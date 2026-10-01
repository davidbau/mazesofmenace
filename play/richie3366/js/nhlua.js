// Shared Lua numeric conversions for unpacked des/dungeon tables.
// Plain ESM: independent of game state and module initialization order.

/**
 * Lua 5.4.8 lobject.c luaO_str2num/l_str2int and C99 strtod syntax.
 * Preserve integer strings as signed-64 BigInts until the C destination
 * cast; converting "9223372036854775807" to a JS Number loses its low bits.
 * Decimal integer overflow falls back to a float; hex integers wrap u64.
 */
export function lua_number_unpacked(v) {
    if (typeof v === 'number') return v;
    if (typeof v === 'bigint') return BigInt.asIntN(64, v);
    if (typeof v !== 'string') return null;
    const text = v.replace(/^[ \t\n\v\f\r]+|[ \t\n\v\f\r]+$/g, '');
    if (/^[+-]?\d+$/.test(text)) {
        const integer = BigInt(text);
        if (integer >= -(1n << 63n) && integer < (1n << 63n)) return integer;
        return Number(text);
    }
    if (/^[+-]?0[xX][0-9a-fA-F]+$/.test(text)) {
        const negative = text[0] === '-';
        const integer = BigInt(text.replace(/^[+-]/, ''));
        return BigInt.asIntN(64, negative ? -integer : integer);
    }
    if (/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(text))
        return Number(text);
    const hex = /^([+-]?)0[xX]([0-9a-fA-F]*)(?:\.([0-9a-fA-F]*))?(?:[pP]([+-]?\d+))?$/.exec(text);
    if (!hex || !(hex[2] + (hex[3] ?? '')).length) return null;
    // Convert the exact hexadecimal significand, rounding once to double
    // (nearest, ties to even), including the subnormal/underflow boundary.
    const fraction = hex[3] ?? '';
    let mantissa = BigInt('0x' + hex[2] + fraction);
    if (!mantissa) return 0;
    let exponent = Number(hex[4] ?? 0) - 4 * fraction.length;
    const bits = mantissa.toString(2).length;
    const discard = Math.max(0, bits - 53, -1074 - exponent);
    if (discard > bits) return 0;
    if (discard) {
        const shift = BigInt(discard);
        const remainder = mantissa & ((1n << shift) - 1n);
        mantissa >>= shift;
        const half = 1n << (shift - 1n);
        if (remainder > half || (remainder === half && (mantissa & 1n))) mantissa++;
        exponent += discard;
    }
    const number = Number(mantissa) * (2 ** exponent);
    return hex[1] === '-' ? -number : number;
}

// Lua 5.4.8 lvm.c luaV_flttointeger(F2Ieq), luaconf.h
// lua_numbertointeger: integral floats in [-2^63, 2^63) only.
export function lua_integer_unpacked(number) {
    if (typeof number === 'bigint') return number;
    if (typeof number === 'number' && Number.isInteger(number)
        && number >= -(2 ** 63) && number < 2 ** 63) return BigInt(number);
    return null;
}

/**
 * Lua 5.4.8 lauxlib.c luaL_checkinteger/interror: no truncation.
 * The optional width applies a C destination cast before returning a JS
 * Number, so coordinate/table input retains exact low bits of Lua integers.
 */
export function luaL_checkinteger_unpacked(v, width = null) {
    const number = lua_number_unpacked(v);
    const integer = lua_integer_unpacked(number);
    if (integer !== null)
        return Number(width === null ? integer : BigInt.asIntN(width, integer));
    if (number !== null) throw new Error('bad argument (number has no integer representation)');
    const got = (v == null) ? 'nil'
        : (typeof v === 'object' ? 'table' : typeof v);
    throw new Error(`bad argument (number expected, got ${got})`);
}

// Lua 5.4.8 lapi.c lua_tointegerx: a failed conversion returns integer 0.
export function lua_tointeger_unpacked(v) {
    return lua_integer_unpacked(lua_number_unpacked(v)) ?? 0n;
}
