// @ts-nocheck
// sha1.js — SHA-1 over a UTF-8 string, in plain JS.
//
// WHY THIS IS HERE RATHER THAN `node:crypto`
// ------------------------------------------
// digest is SCORED TEXT.  It used `import { createHash } from 'node:crypto'`,
// which a browser cannot resolve — and that one specifier, reached from
// js/jsmain.js:13, is what killed the whole module graph at
// https://mazesofmenace.ai/play/jon-bell/.
//
// The obvious alternative — route it through the host shim like the dat-file
// reads — would leave a BROWSER with no digest and therefore a different
// rendered path.  WebCrypto's `subtle.digest` is the browser's answer and it
// is asynchronous, which this call site is not.  Forty lines of SHA-1 makes
// the value HOST-INDEPENDENT instead: one code path, identical bytes in Node
// and in a browser, and nothing to degrade.
//
// differentially checks this against `node:crypto` over the RFC 3174 vectors,
// every length from 0 to 200 (the block-boundary and length-encoding edges),
// and 2,000 pseudo-random inputs including non-ASCII — plus the exact
// JSON.stringify([seed, datetime, nethackrc, moves]) shape cfgfiles uses.
// built from this digest.

/** UTF-8 encode a string to bytes, without depending on TextEncoder. */
function utf8Bytes(str) {
    const out = [];
    for (let i = 0; i < str.length; i++) {
        let c = str.charCodeAt(i);
        if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length) {
            const lo = str.charCodeAt(i + 1);
            if (lo >= 0xdc00 && lo <= 0xdfff) {
                c = 0x10000 + ((c - 0xd800) << 10) + (lo - 0xdc00);
                i++;
            }
        }
        if (c < 0x80) {
            out.push(c);
        } else if (c < 0x800) {
            out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
        } else if (c < 0x10000) {
            out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
        } else {
            out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 0x3f),
                     0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
        }
    }
    return out;
}

const rotl = (n, b) => ((n << b) | (n >>> (32 - b))) >>> 0;

/**
 * SHA-1 of a string's UTF-8 bytes, as lowercase hex — the same value
 * `createHash('sha1').update(str).digest('hex')` returns.
 */
export function sha1Hex(str) {
    const msg = utf8Bytes(str);
    const bitLenHi = Math.floor((msg.length / 0x20000000));  // len*8 >>> 32
    const bitLenLo = (msg.length << 3) >>> 0;

    /* Pad: 0x80, then zeros to 56 mod 64, then the 64-bit big-endian length. */
    msg.push(0x80);
    while (msg.length % 64 !== 56) msg.push(0);
    msg.push((bitLenHi >>> 24) & 0xff, (bitLenHi >>> 16) & 0xff,
             (bitLenHi >>> 8) & 0xff, bitLenHi & 0xff,
             (bitLenLo >>> 24) & 0xff, (bitLenLo >>> 16) & 0xff,
             (bitLenLo >>> 8) & 0xff, bitLenLo & 0xff);

    let h0 = 0x67452301, h1 = 0xefcdab89, h2 = 0x98badcfe,
        h3 = 0x10325476, h4 = 0xc3d2e1f0;
    const w = new Array(80);

    for (let off = 0; off < msg.length; off += 64) {
        for (let i = 0; i < 16; i++) {
            w[i] = ((msg[off + i * 4] << 24) | (msg[off + i * 4 + 1] << 16)
                    | (msg[off + i * 4 + 2] << 8) | msg[off + i * 4 + 3]) >>> 0;
        }
        for (let i = 16; i < 80; i++)
            w[i] = rotl(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);

        let a = h0, b = h1, c = h2, d = h3, e = h4;
        for (let i = 0; i < 80; i++) {
            let f, k;
            if (i < 20)      { f = (b & c) | (~b & d);            k = 0x5a827999; }
            else if (i < 40) { f = b ^ c ^ d;                     k = 0x6ed9eba1; }
            else if (i < 60) { f = (b & c) | (b & d) | (c & d);   k = 0x8f1bbcdc; }
            else             { f = b ^ c ^ d;                     k = 0xca62c1d6; }
            const t = (rotl(a, 5) + (f >>> 0) + e + k + w[i]) >>> 0;
            e = d; d = c; c = rotl(b, 30); b = a; a = t;
        }
        h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0;
        h3 = (h3 + d) >>> 0; h4 = (h4 + e) >>> 0;
    }

    const hex = (n) => n.toString(16).padStart(8, '0');
    return hex(h0) + hex(h1) + hex(h2) + hex(h3) + hex(h4);
}
