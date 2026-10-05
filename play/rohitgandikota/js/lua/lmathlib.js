// lmathlib.js — Lua 5.4's math.random.
// C ref: nethack-c/recorder/lib/lua-5.4.8/src/lmathlib.c
//
// This is NOT NetHack's PRNG and it is NOT in the RNG log. Lua's math.random
// uses its own xoshiro256** generator regardless of what the rest of the game
// uses (see the upstream comment at src/nhlua.c:2946), so its draws appear
// nowhere in the recordings. Recorder patch 001 pins them by calling
// math.randomseed(NETHACK_SEED) at state setup.
//
// That invisibility is the danger: dat/nhlib.lua uses math.random 11 times and
// dat/themerms.lua 6 times, both during ordinary level generation. A port can
// reach 100% RNG-log parity and still build the wrong level, with no diagnostic
// anywhere pointing at why.
//
// Verify any change against the real interpreter:
//
//   ./nethack-c/recorder/lib/lua-5.4.8/src/lua -e 'math.randomseed(8000)
//   for i=1,10 do io.write(math.random(100)," ") end print()'
//   -> 53 18 65 22 97 86 12 57 83 60
//
// BigInt is used throughout because the algorithm needs exact 64-bit wrapping
// multiply and rotate, which Number cannot represent.

const MASK64 = (1n << 64n) - 1n;
const trim64 = (x) => x & MASK64;

// lmathlib.c:313 rotl()
function rotl(x, n) {
    const b = BigInt(n);
    return trim64((x << b) | (trim64(x) >> (64n - b)));
}

// lmathlib.c:318 nextrand() — xoshiro256**
function nextrand(s) {
    const state0 = s[0];
    const state1 = s[1];
    const state2 = s[2] ^ state0;
    const state3 = s[3] ^ state1;
    const res = trim64(rotl(trim64(state1 * 5n), 7) * 9n);
    s[0] = state0 ^ state3;
    s[1] = state1 ^ state2;
    s[2] = state2 ^ trim64(state1 << 17n);
    s[3] = rotl(state3, 45);
    return res;
}

// lmathlib.c:549 project() — reject-and-retry so the interval is unbiased.
// The retry draws again, so the number of nextrand() calls per math.random()
// is not fixed.
function project(ran, n, s) {
    if ((n & (n + 1n)) === 0n)
        return ran & n;                 /* n + 1 is a power of 2, no bias */

    let lim = n;
    lim |= (lim >> 1n);
    lim |= (lim >> 2n);
    lim |= (lim >> 4n);
    lim |= (lim >> 8n);
    lim |= (lim >> 16n);
    lim |= (lim >> 32n);
    while ((ran &= lim) > n)
        ran = nextrand(s);
    return ran;
}

export class LuaRandom {
    constructor(seed = 0) {
        this.s = [0n, 0n, 0n, 0n];
        this.randomseed(seed, 0);
    }

    // lmathlib.c:609 setseed()
    randomseed(n1, n2 = 0) {
        this.s[0] = trim64(BigInt(n1));
        this.s[1] = 0xffn;              /* avoid a zero state */
        this.s[2] = trim64(BigInt(n2));
        this.s[3] = 0n;
        for (let i = 0; i < 16; i++)
            nextrand(this.s);           /* discard, to "spread" the seed */
    }

    // lmathlib.c:574 math_random()
    //
    // random()        -> float in [0,1)
    // random(m)       -> integer in [1,m]; m == 0 gives the raw 64-bit value
    // random(m, n)    -> integer in [m,n]
    random(m, n) {
        const rv = nextrand(this.s);

        if (m === undefined)
            return this.#toFloat(rv);

        let low, up;
        if (n === undefined) {
            low = 1n;
            up = BigInt(m);
            if (up === 0n)
                return BigInt.asIntN(64, rv);  /* full random integer */
        } else {
            low = BigInt(m);
            up = BigInt(n);
        }
        if (low > up)
            throw new Error('bad argument #1 to random (interval is empty)');

        const p = project(rv, trim64(up - low), this.s);
        return Number(BigInt.asIntN(64, p + low));
    }

    // lmathlib.c:340 I2d() — take the top FIG (53) bits as a double in [0,1).
    #toFloat(rv) {
        return Number(rv >> 11n) * (1.0 / 9007199254740992.0);   /* 2^-53 */
    }

    // The raw signed 64-bit value, for cross-checking against the real
    // interpreter's math.random(0).
    rawNext() {
        return BigInt.asIntN(64, nextrand(this.s));
    }
}
