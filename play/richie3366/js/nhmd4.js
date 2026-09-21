// nhmd4.js — MD4 (RFC-1320) message digest for crash-report binary IDs.
//
// C ref: nethack-c/upstream/src/nhmd4.c (whole file, behind `#ifdef CRASHREPORT`)
// and nethack-c/upstream/include/nhmd4.h (struct + externs).
// Derived from Solar Designer's public-domain MD4 (see nhmd4.c:11-26).
//
// Plain ESM, Node + Chrome safe: no imports, no fs, no network. All state
// lives in the caller-owned context object (C `struct nhmd4_context`);
// allocation is GC (C callers hold the struct on the stack / inline).
//
// Context shape (C field order, nhmd4.h:22-27):
//   { lo, hi, a, b, c, d, buffer: Uint8Array(64), block: Uint32Array(16) }
// All scalars are held as unsigned 32-bit JS numbers (>>> 0 after every op).

/** C ref: nhmd4.h:22-27 `struct nhmd4_context` (caller-allocated in C). */
export function new_nhmd4_context() {
    return {
        lo: 0,
        hi: 0,
        a: 0,
        b: 0,
        c: 0,
        d: 0,
        buffer: new Uint8Array(64),
        block: new Uint32Array(16),
    };
}

// C ref: nhmd4.c:43-45 — the basic MD4 functions.
// (C `#undef G` at :291 exists only to dodge a Lua header clash; no Lua here.)
// Inputs are uint32-range numbers; >>> 0 restores the word after ToInt32.
function md4F(x, y, z) {
    return (z ^ (x & (y ^ z))) >>> 0;
}

function md4G(x, y, z) {
    return ((x & y) | (x & z) | (y & z)) >>> 0;
}

function md4H(x, y, z) {
    return (x ^ y ^ z) >>> 0;
}

function rotl32(v, s) {
    return ((v << s) | (v >>> (32 - s))) >>> 0;
}

// C ref: nhmd4.c:53-55 STEP(f, a, b, c, d, x, s).
// All three addends are words; the sum stays far below 2^53 so >>> 0 is exact.
function md4Step(f, acc, b, c, d, x, s) {
    return rotl32(((acc + f(b, c, d) + x) >>> 0), s);
}

// C ref: nhmd4.c:65-76 SET/GET — portable (#else) arm: SET stores the
// little-endian word into ctx->block[n]; GET re-reads it. Values equal the
// x86_64 direct-read arm for every input; block is unread after the body.
function md4Set(ctx, data, off, n) {
    const w = (data[off + n * 4]
        | (data[off + n * 4 + 1] << 8)
        | (data[off + n * 4 + 2] << 16)
        | (data[off + n * 4 + 3] << 24)) >>> 0;
    ctx.block[n] = w;
    return w;
}

function md4Get(ctx, n) {
    return ctx.block[n] >>> 0;
}

// C ref: nhmd4.c:82-180. Processes one or more 64-byte blocks but does NOT
// update the bit counters (C :79-81). `data` is a Uint8Array, `size` a
// nonzero multiple of 64. Returns data.subarray(size): the C `return ptr`
// pointer-advance idiom (lets update write `data = nhmd4_body(...)`).
// Exported although C marks it staticfn: coverage + testability.
export function nhmd4_body(ctx, data, size) {
    let a = ctx.a >>> 0; // C :94-97
    let b = ctx.b >>> 0;
    let c = ctx.c >>> 0;
    let d = ctx.d >>> 0;

    let off = 0; // C `ptr = data`
    let left = size >>> 0;
    do {
        const saved_a = a; // C :100-103
        const saved_b = b;
        const saved_c = c;
        const saved_d = d;

        // Round 1 — C :106-124
        a = md4Step(md4F, a, b, c, d, md4Set(ctx, data, off, 0), 3);
        d = md4Step(md4F, d, a, b, c, md4Set(ctx, data, off, 1), 7);
        c = md4Step(md4F, c, d, a, b, md4Set(ctx, data, off, 2), 11);
        b = md4Step(md4F, b, c, d, a, md4Set(ctx, data, off, 3), 19);

        a = md4Step(md4F, a, b, c, d, md4Set(ctx, data, off, 4), 3);
        d = md4Step(md4F, d, a, b, c, md4Set(ctx, data, off, 5), 7);
        c = md4Step(md4F, c, d, a, b, md4Set(ctx, data, off, 6), 11);
        b = md4Step(md4F, b, c, d, a, md4Set(ctx, data, off, 7), 19);

        a = md4Step(md4F, a, b, c, d, md4Set(ctx, data, off, 8), 3);
        d = md4Step(md4F, d, a, b, c, md4Set(ctx, data, off, 9), 7);
        c = md4Step(md4F, c, d, a, b, md4Set(ctx, data, off, 10), 11);
        b = md4Step(md4F, b, c, d, a, md4Set(ctx, data, off, 11), 19);

        a = md4Step(md4F, a, b, c, d, md4Set(ctx, data, off, 12), 3);
        d = md4Step(md4F, d, a, b, c, md4Set(ctx, data, off, 13), 7);
        c = md4Step(md4F, c, d, a, b, md4Set(ctx, data, off, 14), 11);
        b = md4Step(md4F, b, c, d, a, md4Set(ctx, data, off, 15), 19);

        // Round 2 — C :126-144
        a = md4Step(md4G, a, b, c, d, (md4Get(ctx, 0) + 0x5a827999) >>> 0, 3);
        d = md4Step(md4G, d, a, b, c, (md4Get(ctx, 4) + 0x5a827999) >>> 0, 5);
        c = md4Step(md4G, c, d, a, b, (md4Get(ctx, 8) + 0x5a827999) >>> 0, 9);
        b = md4Step(md4G, b, c, d, a, (md4Get(ctx, 12) + 0x5a827999) >>> 0, 13);

        a = md4Step(md4G, a, b, c, d, (md4Get(ctx, 1) + 0x5a827999) >>> 0, 3);
        d = md4Step(md4G, d, a, b, c, (md4Get(ctx, 5) + 0x5a827999) >>> 0, 5);
        c = md4Step(md4G, c, d, a, b, (md4Get(ctx, 9) + 0x5a827999) >>> 0, 9);
        b = md4Step(md4G, b, c, d, a, (md4Get(ctx, 13) + 0x5a827999) >>> 0, 13);

        a = md4Step(md4G, a, b, c, d, (md4Get(ctx, 2) + 0x5a827999) >>> 0, 3);
        d = md4Step(md4G, d, a, b, c, (md4Get(ctx, 6) + 0x5a827999) >>> 0, 5);
        c = md4Step(md4G, c, d, a, b, (md4Get(ctx, 10) + 0x5a827999) >>> 0, 9);
        b = md4Step(md4G, b, c, d, a, (md4Get(ctx, 14) + 0x5a827999) >>> 0, 13);

        a = md4Step(md4G, a, b, c, d, (md4Get(ctx, 3) + 0x5a827999) >>> 0, 3);
        d = md4Step(md4G, d, a, b, c, (md4Get(ctx, 7) + 0x5a827999) >>> 0, 5);
        c = md4Step(md4G, c, d, a, b, (md4Get(ctx, 11) + 0x5a827999) >>> 0, 9);
        b = md4Step(md4G, b, c, d, a, (md4Get(ctx, 15) + 0x5a827999) >>> 0, 13);

        // Round 3 — C :146-164
        a = md4Step(md4H, a, b, c, d, (md4Get(ctx, 0) + 0x6ed9eba1) >>> 0, 3);
        d = md4Step(md4H, d, a, b, c, (md4Get(ctx, 8) + 0x6ed9eba1) >>> 0, 9);
        c = md4Step(md4H, c, d, a, b, (md4Get(ctx, 4) + 0x6ed9eba1) >>> 0, 11);
        b = md4Step(md4H, b, c, d, a, (md4Get(ctx, 12) + 0x6ed9eba1) >>> 0, 15);

        a = md4Step(md4H, a, b, c, d, (md4Get(ctx, 2) + 0x6ed9eba1) >>> 0, 3);
        d = md4Step(md4H, d, a, b, c, (md4Get(ctx, 10) + 0x6ed9eba1) >>> 0, 9);
        c = md4Step(md4H, c, d, a, b, (md4Get(ctx, 6) + 0x6ed9eba1) >>> 0, 11);
        b = md4Step(md4H, b, c, d, a, (md4Get(ctx, 14) + 0x6ed9eba1) >>> 0, 15);

        a = md4Step(md4H, a, b, c, d, (md4Get(ctx, 1) + 0x6ed9eba1) >>> 0, 3);
        d = md4Step(md4H, d, a, b, c, (md4Get(ctx, 9) + 0x6ed9eba1) >>> 0, 9);
        c = md4Step(md4H, c, d, a, b, (md4Get(ctx, 5) + 0x6ed9eba1) >>> 0, 11);
        b = md4Step(md4H, b, c, d, a, (md4Get(ctx, 13) + 0x6ed9eba1) >>> 0, 15);

        a = md4Step(md4H, a, b, c, d, (md4Get(ctx, 3) + 0x6ed9eba1) >>> 0, 3);
        d = md4Step(md4H, d, a, b, c, (md4Get(ctx, 11) + 0x6ed9eba1) >>> 0, 9);
        c = md4Step(md4H, c, d, a, b, (md4Get(ctx, 7) + 0x6ed9eba1) >>> 0, 11);
        b = md4Step(md4H, b, c, d, a, (md4Get(ctx, 15) + 0x6ed9eba1) >>> 0, 15);

        a = (a + saved_a) >>> 0; // C :166-169
        b = (b + saved_b) >>> 0;
        c = (c + saved_c) >>> 0;
        d = (d + saved_d) >>> 0;

        off += 64; // C :171 `ptr += 64`
    } while ((left -= 64) !== 0); // C :172 `while (size -= 64)`

    ctx.a = a; // C :174-177
    ctx.b = b;
    ctx.c = c;
    ctx.d = d;

    return data.subarray(size);
}

// C ref: nhmd4.c:182-193.
export function nhmd4_init(ctx) {
    ctx.a = 0x67452301;
    ctx.b = 0xefcdab89;
    ctx.c = 0x98badcfe;
    ctx.d = 0x10325476;

    ctx.lo = 0;
    ctx.hi = 0;
    // C leaves buffer/block uninitialized; zero them: unobservable (update
    // overwrites before reading; body SETs before GETs) and deterministic.
    ctx.buffer.fill(0);
    ctx.block.fill(0);
}

// C ref: nhmd4.c:195-232. `data` is a Uint8Array, `size` its consumed length.
// Pointer arithmetic becomes subarray views; memcpy becomes TypedArray.set.
export function nhmd4_update(ctx, data, size) {
    // C :201 `/* @UNSAFE */`
    const saved_lo = ctx.lo >>> 0; // C :205
    ctx.lo = ((saved_lo + size) & 0x1fffffff) >>> 0; // C :206
    if (ctx.lo < saved_lo) ctx.hi = (ctx.hi + 1) >>> 0; // C :206-207
    ctx.hi = (ctx.hi + Math.floor(size / 0x20000000)) >>> 0; // C :208 `(size >> 29)`

    let used = saved_lo & 0x3f; // C :210

    if (used !== 0) { // C :212
        const free = 64 - used; // C :213

        if (size < free) { // C :215-218
            ctx.buffer.set(data.subarray(0, size), used);
            return;
        }

        ctx.buffer.set(data.subarray(0, free), used); // C :220
        data = data.subarray(free); // C :221 `data + free`
        size -= free; // C :222
        nhmd4_body(ctx, ctx.buffer, 64); // C :223 (intra-file caller 1/4)
    }

    if (size >= 64) { // C :226
        data = nhmd4_body(ctx, data, (size & ~0x3f) >>> 0); // C :227 (caller 2/4)
        size &= 0x3f; // C :228
    }

    ctx.buffer.set(data.subarray(0, size), 0); // C :231
}

// C ref: nhmd4.c:234-287. `result` is a Uint8Array(16); C writes the four
// words little-endian, then memsets the context (C :286).
export function nhmd4_final(ctx, result) {
    // C :239 `/* @UNSAFE */`
    let used = ctx.lo & 0x3f; // C :242 (0x3fUL)

    ctx.buffer[used++] = 0x80; // C :244

    let free = 64 - used; // C :246

    if (free < 8) { // C :248-253
        ctx.buffer.fill(0, used, used + free);
        nhmd4_body(ctx, ctx.buffer, 64); // C :250 (caller 3/4)
        used = 0;
        free = 64;
    }

    ctx.buffer.fill(0, used, used + (free - 8)); // C :255

    ctx.lo = (ctx.lo << 3) >>> 0; // C :257 (quint32 shift)
    ctx.buffer[56] = ctx.lo & 0xff; // C :258-261
    ctx.buffer[57] = (ctx.lo >>> 8) & 0xff;
    ctx.buffer[58] = (ctx.lo >>> 16) & 0xff;
    ctx.buffer[59] = (ctx.lo >>> 24) & 0xff;
    ctx.buffer[60] = ctx.hi & 0xff; // C :262-265
    ctx.buffer[61] = (ctx.hi >>> 8) & 0xff;
    ctx.buffer[62] = (ctx.hi >>> 16) & 0xff;
    ctx.buffer[63] = (ctx.hi >>> 24) & 0xff;

    nhmd4_body(ctx, ctx.buffer, 64); // C :267 (caller 4/4)

    result[0] = ctx.a & 0xff; // C :269-272
    result[1] = (ctx.a >>> 8) & 0xff;
    result[2] = (ctx.a >>> 16) & 0xff;
    result[3] = (ctx.a >>> 24) & 0xff;
    result[4] = ctx.b & 0xff; // C :273-276
    result[5] = (ctx.b >>> 8) & 0xff;
    result[6] = (ctx.b >>> 16) & 0xff;
    result[7] = (ctx.b >>> 24) & 0xff;
    result[8] = ctx.c & 0xff; // C :277-280
    result[9] = (ctx.c >>> 8) & 0xff;
    result[10] = (ctx.c >>> 16) & 0xff;
    result[11] = (ctx.c >>> 24) & 0xff;
    result[12] = ctx.d & 0xff; // C :281-284
    result[13] = (ctx.d >>> 8) & 0xff;
    result[14] = (ctx.d >>> 16) & 0xff;
    result[15] = (ctx.d >>> 24) & 0xff;

    ctx.lo = 0; // C :286 `memset(ctx, 0, sizeof *ctx)`
    ctx.hi = 0;
    ctx.a = 0;
    ctx.b = 0;
    ctx.c = 0;
    ctx.d = 0;
    ctx.buffer.fill(0);
    ctx.block.fill(0);
}
