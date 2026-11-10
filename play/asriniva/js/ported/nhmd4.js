/* NetHack 5.0	nhmd4.c	$NHDT-Date: 1708811387 2024/02/24 21:49:47 $	$NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.0 $ */

/*-Copyright (c) Kenneth Lorber, Kensington, Maryland, 2024 */

/* NetHack may be freely redistributed.  See license for details. */

/*
 * Usage is to try to match traceback data with the instance of the
 * program which produced that, not for security related purposes.
 *
 * Derived from:
 */

/*
 * MD4 (RFC-1320) message digest.
 * Modified from MD5 code by Andrey Panin <pazke@donpac.ru>
 *
 * Written by Solar Designer <solar@openwall.com> in 2001, and placed in
 * the public domain.  There's absolutely no warranty.
 *
 * This differs from Colin Plumb's older public domain implementation in
 * that no 32-bit integer data type is required, there's no compile-time
 * endianness configuration, and the function prototypes match OpenSSL's.
 * The primary goals are portability and ease of use.
 *
 * This implementation is meant to be fast, but not as fast as possible.
 * Some known optimizations are not included to reduce source code size
 * and avoid compile-time configuration.
 */

/* Avoid a conflict from a Lua header */

/*
 * The basic MD4 functions.
 */

/*
 * STEP: the MD4 transformation used for all four rounds.
 * (Joining two expressions with the comma operator provides a sequence
 * point.  C89/C90 and later guarantee that the first will be fully complete
 * before the second starts, making both assignments to 'a' be well defined.)
 */

/*
 * SET reads 4 input bytes in little-endian byte order and stores them
 * in a properly aligned word in host byte order.
 *
 * The check for little-endian architectures which tolerate unaligned
 * memory accesses is just an optimization.  Nothing will break if it
 * doesn't work.
 */

/*
 * This processes one or more 64-byte data blocks, but does NOT update
 * the bit counters.  There're no alignment requirements.
 */

/* JavaScript translation of src/nhmd4.c: the four C function boundaries
 * are unchanged. JavaScript has no C preprocessor macros, so F/G/H, STEP
 * and SET/GET are expanded inline at each original STEP call. Comments mark
 * those calls. SET follows the Wasm (non-x86) branch, updating ctx.block.
 * Unsigned local assignments and rotations use >>> 0 and >>> respectively.
 * C pointers become Uint8Array views; memcpy/memset use set/fill. The final
 * whole-context memset uses the binding's ctx.clear(), defined outside this
 * translation unit. Size calculations avoid JS's signed 32-bit shifts for
 * C's wasm64 size_t. Includes and preprocessor directives have no JS runtime.
 */

function nhmd4_body(
    ctx,
    data,
    size)
{
    let ptr;
    let a, b, c, d;
    let saved_a, saved_b, saved_c, saved_d;

    ptr = data;

    a = ctx.a;
    b = ctx.b;
    c = ctx.c;
    d = ctx.d;

    do {
        saved_a = a;
        saved_b = b;
        saved_c = c;
        saved_d = d;

/* Round 1 */
        // STEP(F, a, b, c, d, SET( 0),  3);
        a = (a + (d ^ (b & (c ^ d))) + (ctx.block[0] = (ptr[0] | (ptr[1] << 8) | (ptr[2] << 16) | (ptr[3] << 24)) >>> 0)) >>> 0;
        a = ((a << 3) | (a >>> 29)) >>> 0;
        // STEP(F, d, a, b, c, SET( 1),  7);
        d = (d + (c ^ (a & (b ^ c))) + (ctx.block[1] = (ptr[4] | (ptr[5] << 8) | (ptr[6] << 16) | (ptr[7] << 24)) >>> 0)) >>> 0;
        d = ((d << 7) | (d >>> 25)) >>> 0;
        // STEP(F, c, d, a, b, SET( 2), 11);
        c = (c + (b ^ (d & (a ^ b))) + (ctx.block[2] = (ptr[8] | (ptr[9] << 8) | (ptr[10] << 16) | (ptr[11] << 24)) >>> 0)) >>> 0;
        c = ((c << 11) | (c >>> 21)) >>> 0;
        // STEP(F, b, c, d, a, SET( 3), 19);
        b = (b + (a ^ (c & (d ^ a))) + (ctx.block[3] = (ptr[12] | (ptr[13] << 8) | (ptr[14] << 16) | (ptr[15] << 24)) >>> 0)) >>> 0;
        b = ((b << 19) | (b >>> 13)) >>> 0;

        // STEP(F, a, b, c, d, SET( 4),  3);
        a = (a + (d ^ (b & (c ^ d))) + (ctx.block[4] = (ptr[16] | (ptr[17] << 8) | (ptr[18] << 16) | (ptr[19] << 24)) >>> 0)) >>> 0;
        a = ((a << 3) | (a >>> 29)) >>> 0;
        // STEP(F, d, a, b, c, SET( 5),  7);
        d = (d + (c ^ (a & (b ^ c))) + (ctx.block[5] = (ptr[20] | (ptr[21] << 8) | (ptr[22] << 16) | (ptr[23] << 24)) >>> 0)) >>> 0;
        d = ((d << 7) | (d >>> 25)) >>> 0;
        // STEP(F, c, d, a, b, SET( 6), 11);
        c = (c + (b ^ (d & (a ^ b))) + (ctx.block[6] = (ptr[24] | (ptr[25] << 8) | (ptr[26] << 16) | (ptr[27] << 24)) >>> 0)) >>> 0;
        c = ((c << 11) | (c >>> 21)) >>> 0;
        // STEP(F, b, c, d, a, SET( 7), 19);
        b = (b + (a ^ (c & (d ^ a))) + (ctx.block[7] = (ptr[28] | (ptr[29] << 8) | (ptr[30] << 16) | (ptr[31] << 24)) >>> 0)) >>> 0;
        b = ((b << 19) | (b >>> 13)) >>> 0;

        // STEP(F, a, b, c, d, SET( 8),  3);
        a = (a + (d ^ (b & (c ^ d))) + (ctx.block[8] = (ptr[32] | (ptr[33] << 8) | (ptr[34] << 16) | (ptr[35] << 24)) >>> 0)) >>> 0;
        a = ((a << 3) | (a >>> 29)) >>> 0;
        // STEP(F, d, a, b, c, SET( 9),  7);
        d = (d + (c ^ (a & (b ^ c))) + (ctx.block[9] = (ptr[36] | (ptr[37] << 8) | (ptr[38] << 16) | (ptr[39] << 24)) >>> 0)) >>> 0;
        d = ((d << 7) | (d >>> 25)) >>> 0;
        // STEP(F, c, d, a, b, SET(10), 11);
        c = (c + (b ^ (d & (a ^ b))) + (ctx.block[10] = (ptr[40] | (ptr[41] << 8) | (ptr[42] << 16) | (ptr[43] << 24)) >>> 0)) >>> 0;
        c = ((c << 11) | (c >>> 21)) >>> 0;
        // STEP(F, b, c, d, a, SET(11), 19);
        b = (b + (a ^ (c & (d ^ a))) + (ctx.block[11] = (ptr[44] | (ptr[45] << 8) | (ptr[46] << 16) | (ptr[47] << 24)) >>> 0)) >>> 0;
        b = ((b << 19) | (b >>> 13)) >>> 0;

        // STEP(F, a, b, c, d, SET(12),  3);
        a = (a + (d ^ (b & (c ^ d))) + (ctx.block[12] = (ptr[48] | (ptr[49] << 8) | (ptr[50] << 16) | (ptr[51] << 24)) >>> 0)) >>> 0;
        a = ((a << 3) | (a >>> 29)) >>> 0;
        // STEP(F, d, a, b, c, SET(13),  7);
        d = (d + (c ^ (a & (b ^ c))) + (ctx.block[13] = (ptr[52] | (ptr[53] << 8) | (ptr[54] << 16) | (ptr[55] << 24)) >>> 0)) >>> 0;
        d = ((d << 7) | (d >>> 25)) >>> 0;
        // STEP(F, c, d, a, b, SET(14), 11);
        c = (c + (b ^ (d & (a ^ b))) + (ctx.block[14] = (ptr[56] | (ptr[57] << 8) | (ptr[58] << 16) | (ptr[59] << 24)) >>> 0)) >>> 0;
        c = ((c << 11) | (c >>> 21)) >>> 0;
        // STEP(F, b, c, d, a, SET(15), 19);
        b = (b + (a ^ (c & (d ^ a))) + (ctx.block[15] = (ptr[60] | (ptr[61] << 8) | (ptr[62] << 16) | (ptr[63] << 24)) >>> 0)) >>> 0;
        b = ((b << 19) | (b >>> 13)) >>> 0;
/* Round 2 */
        // STEP(G, a, b, c, d, GET( 0) + 0x5A827999,  3);
        a = (a + ((b & c) | (b & d) | (c & d)) + ctx.block[0] + 0x5A827999) >>> 0;
        a = ((a << 3) | (a >>> 29)) >>> 0;
        // STEP(G, d, a, b, c, GET( 4) + 0x5A827999,  5);
        d = (d + ((a & b) | (a & c) | (b & c)) + ctx.block[4] + 0x5A827999) >>> 0;
        d = ((d << 5) | (d >>> 27)) >>> 0;
        // STEP(G, c, d, a, b, GET( 8) + 0x5A827999,  9);
        c = (c + ((d & a) | (d & b) | (a & b)) + ctx.block[8] + 0x5A827999) >>> 0;
        c = ((c << 9) | (c >>> 23)) >>> 0;
        // STEP(G, b, c, d, a, GET(12) + 0x5A827999, 13);
        b = (b + ((c & d) | (c & a) | (d & a)) + ctx.block[12] + 0x5A827999) >>> 0;
        b = ((b << 13) | (b >>> 19)) >>> 0;

        // STEP(G, a, b, c, d, GET( 1) + 0x5A827999,  3);
        a = (a + ((b & c) | (b & d) | (c & d)) + ctx.block[1] + 0x5A827999) >>> 0;
        a = ((a << 3) | (a >>> 29)) >>> 0;
        // STEP(G, d, a, b, c, GET( 5) + 0x5A827999,  5);
        d = (d + ((a & b) | (a & c) | (b & c)) + ctx.block[5] + 0x5A827999) >>> 0;
        d = ((d << 5) | (d >>> 27)) >>> 0;
        // STEP(G, c, d, a, b, GET( 9) + 0x5A827999,  9);
        c = (c + ((d & a) | (d & b) | (a & b)) + ctx.block[9] + 0x5A827999) >>> 0;
        c = ((c << 9) | (c >>> 23)) >>> 0;
        // STEP(G, b, c, d, a, GET(13) + 0x5A827999, 13);
        b = (b + ((c & d) | (c & a) | (d & a)) + ctx.block[13] + 0x5A827999) >>> 0;
        b = ((b << 13) | (b >>> 19)) >>> 0;

        // STEP(G, a, b, c, d, GET( 2) + 0x5A827999,  3);
        a = (a + ((b & c) | (b & d) | (c & d)) + ctx.block[2] + 0x5A827999) >>> 0;
        a = ((a << 3) | (a >>> 29)) >>> 0;
        // STEP(G, d, a, b, c, GET( 6) + 0x5A827999,  5);
        d = (d + ((a & b) | (a & c) | (b & c)) + ctx.block[6] + 0x5A827999) >>> 0;
        d = ((d << 5) | (d >>> 27)) >>> 0;
        // STEP(G, c, d, a, b, GET(10) + 0x5A827999,  9);
        c = (c + ((d & a) | (d & b) | (a & b)) + ctx.block[10] + 0x5A827999) >>> 0;
        c = ((c << 9) | (c >>> 23)) >>> 0;
        // STEP(G, b, c, d, a, GET(14) + 0x5A827999, 13);
        b = (b + ((c & d) | (c & a) | (d & a)) + ctx.block[14] + 0x5A827999) >>> 0;
        b = ((b << 13) | (b >>> 19)) >>> 0;

        // STEP(G, a, b, c, d, GET( 3) + 0x5A827999,  3);
        a = (a + ((b & c) | (b & d) | (c & d)) + ctx.block[3] + 0x5A827999) >>> 0;
        a = ((a << 3) | (a >>> 29)) >>> 0;
        // STEP(G, d, a, b, c, GET( 7) + 0x5A827999,  5);
        d = (d + ((a & b) | (a & c) | (b & c)) + ctx.block[7] + 0x5A827999) >>> 0;
        d = ((d << 5) | (d >>> 27)) >>> 0;
        // STEP(G, c, d, a, b, GET(11) + 0x5A827999,  9);
        c = (c + ((d & a) | (d & b) | (a & b)) + ctx.block[11] + 0x5A827999) >>> 0;
        c = ((c << 9) | (c >>> 23)) >>> 0;
        // STEP(G, b, c, d, a, GET(15) + 0x5A827999, 13);
        b = (b + ((c & d) | (c & a) | (d & a)) + ctx.block[15] + 0x5A827999) >>> 0;
        b = ((b << 13) | (b >>> 19)) >>> 0;
/* Round 3 */
        // STEP(H, a, b, c, d, GET( 0) + 0x6ED9EBA1,  3);
        a = (a + (b ^ c ^ d) + ctx.block[0] + 0x6ED9EBA1) >>> 0;
        a = ((a << 3) | (a >>> 29)) >>> 0;
        // STEP(H, d, a, b, c, GET( 8) + 0x6ED9EBA1,  9);
        d = (d + (a ^ b ^ c) + ctx.block[8] + 0x6ED9EBA1) >>> 0;
        d = ((d << 9) | (d >>> 23)) >>> 0;
        // STEP(H, c, d, a, b, GET( 4) + 0x6ED9EBA1, 11);
        c = (c + (d ^ a ^ b) + ctx.block[4] + 0x6ED9EBA1) >>> 0;
        c = ((c << 11) | (c >>> 21)) >>> 0;
        // STEP(H, b, c, d, a, GET(12) + 0x6ED9EBA1, 15);
        b = (b + (c ^ d ^ a) + ctx.block[12] + 0x6ED9EBA1) >>> 0;
        b = ((b << 15) | (b >>> 17)) >>> 0;

        // STEP(H, a, b, c, d, GET( 2) + 0x6ED9EBA1,  3);
        a = (a + (b ^ c ^ d) + ctx.block[2] + 0x6ED9EBA1) >>> 0;
        a = ((a << 3) | (a >>> 29)) >>> 0;
        // STEP(H, d, a, b, c, GET(10) + 0x6ED9EBA1,  9);
        d = (d + (a ^ b ^ c) + ctx.block[10] + 0x6ED9EBA1) >>> 0;
        d = ((d << 9) | (d >>> 23)) >>> 0;
        // STEP(H, c, d, a, b, GET( 6) + 0x6ED9EBA1, 11);
        c = (c + (d ^ a ^ b) + ctx.block[6] + 0x6ED9EBA1) >>> 0;
        c = ((c << 11) | (c >>> 21)) >>> 0;
        // STEP(H, b, c, d, a, GET(14) + 0x6ED9EBA1, 15);
        b = (b + (c ^ d ^ a) + ctx.block[14] + 0x6ED9EBA1) >>> 0;
        b = ((b << 15) | (b >>> 17)) >>> 0;

        // STEP(H, a, b, c, d, GET( 1) + 0x6ED9EBA1,  3);
        a = (a + (b ^ c ^ d) + ctx.block[1] + 0x6ED9EBA1) >>> 0;
        a = ((a << 3) | (a >>> 29)) >>> 0;
        // STEP(H, d, a, b, c, GET( 9) + 0x6ED9EBA1,  9);
        d = (d + (a ^ b ^ c) + ctx.block[9] + 0x6ED9EBA1) >>> 0;
        d = ((d << 9) | (d >>> 23)) >>> 0;
        // STEP(H, c, d, a, b, GET( 5) + 0x6ED9EBA1, 11);
        c = (c + (d ^ a ^ b) + ctx.block[5] + 0x6ED9EBA1) >>> 0;
        c = ((c << 11) | (c >>> 21)) >>> 0;
        // STEP(H, b, c, d, a, GET(13) + 0x6ED9EBA1, 15);
        b = (b + (c ^ d ^ a) + ctx.block[13] + 0x6ED9EBA1) >>> 0;
        b = ((b << 15) | (b >>> 17)) >>> 0;

        // STEP(H, a, b, c, d, GET( 3) + 0x6ED9EBA1,  3);
        a = (a + (b ^ c ^ d) + ctx.block[3] + 0x6ED9EBA1) >>> 0;
        a = ((a << 3) | (a >>> 29)) >>> 0;
        // STEP(H, d, a, b, c, GET(11) + 0x6ED9EBA1,  9);
        d = (d + (a ^ b ^ c) + ctx.block[11] + 0x6ED9EBA1) >>> 0;
        d = ((d << 9) | (d >>> 23)) >>> 0;
        // STEP(H, c, d, a, b, GET( 7) + 0x6ED9EBA1, 11);
        c = (c + (d ^ a ^ b) + ctx.block[7] + 0x6ED9EBA1) >>> 0;
        c = ((c << 11) | (c >>> 21)) >>> 0;
        // STEP(H, b, c, d, a, GET(15) + 0x6ED9EBA1, 15);
        b = (b + (c ^ d ^ a) + ctx.block[15] + 0x6ED9EBA1) >>> 0;
        b = ((b << 15) | (b >>> 17)) >>> 0;

        a = (a + saved_a) >>> 0;
        b = (b + saved_b) >>> 0;
        c = (c + saved_c) >>> 0;
        d = (d + saved_d) >>> 0;

        ptr = ptr.subarray(64);
    } while (size -= 64);

    ctx.a = a;
    ctx.b = b;
    ctx.c = c;
    ctx.d = d;

    return ptr;
}

export function nhmd4_init(
    ctx)
{
    ctx.a = 0x67452301;
    ctx.b = 0xefcdab89;
    ctx.c = 0x98badcfe;
    ctx.d = 0x10325476;

    ctx.lo = 0;
    ctx.hi = 0;
}

export function nhmd4_update(
    ctx,
    data,
    size)
{
    /* @UNSAFE */
    let saved_lo;
    let used, free;

    saved_lo = ctx.lo;
    if ((ctx.lo = (saved_lo + size) & 0x1fffffff) < saved_lo)
        ctx.hi = (ctx.hi + 1) >>> 0;
    ctx.hi = (ctx.hi + Math.floor(size / 0x20000000)) >>> 0;

    used = saved_lo & 0x3f;

    if (used) {
        free = 64 - used;

        if (size < free) {
            ctx.buffer.set(data.subarray(0, size), used);
            return;
        }

        ctx.buffer.set(data.subarray(0, free), used);
        data = data.subarray(free);
        size -= free;
        nhmd4_body(ctx, ctx.buffer, 64);
    }

    if (size >= 64) {
        data = nhmd4_body(ctx, data, size - size % 64);
        size %= 64;
    }

    ctx.buffer.set(data.subarray(0, size));
}

export function nhmd4_final(
    ctx,
    result)
{
    /* @UNSAFE */
    let used, free;

    used = ctx.lo & 0x3f;

    ctx.buffer[used++] = 0x80;

    free = 64 - used;

    if (free < 8) {
        ctx.buffer.fill(0, used, used + free);
        nhmd4_body(ctx, ctx.buffer, 64);
        used = 0;
        free = 64;
    }

    ctx.buffer.fill(0, used, used + free - 8);

    ctx.lo = (ctx.lo << 3) >>> 0;
    ctx.buffer[56] = ctx.lo;
    ctx.buffer[57] = ctx.lo >>> 8;
    ctx.buffer[58] = ctx.lo >>> 16;
    ctx.buffer[59] = ctx.lo >>> 24;
    ctx.buffer[60] = ctx.hi;
    ctx.buffer[61] = ctx.hi >>> 8;
    ctx.buffer[62] = ctx.hi >>> 16;
    ctx.buffer[63] = ctx.hi >>> 24;

    nhmd4_body(ctx, ctx.buffer, 64);

    result[0] = ctx.a;
    result[1] = ctx.a >>> 8;
    result[2] = ctx.a >>> 16;
    result[3] = ctx.a >>> 24;
    result[4] = ctx.b;
    result[5] = ctx.b >>> 8;
    result[6] = ctx.b >>> 16;
    result[7] = ctx.b >>> 24;
    result[8] = ctx.c;
    result[9] = ctx.c >>> 8;
    result[10] = ctx.c >>> 16;
    result[11] = ctx.c >>> 24;
    result[12] = ctx.d;
    result[13] = ctx.d >>> 8;
    result[14] = ctx.d >>> 16;
    result[15] = ctx.d >>> 24;

    ctx.clear();
}

/* CRASHREPORT */

/*nhmd4.c*/
