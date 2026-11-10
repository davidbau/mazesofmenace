/* Pure JavaScript Unix .Z service, derived from the public-domain ncompress
 * 5.0 compress()/decompress() in nethack-c/wasm/vendor/ncompress/compress.c.
 * Original authors: Spencer W. Thomas, Jim McKie, Steve Davies, Ken Turkowski,
 * James A. Woods, Joe Orost, Dave Mack, Peter Jannesen and Mike Frysinger.
 * See that directory's UNLICENSE and LICENSE.txt. No generic LZW framing is
 * used: .Z width transitions and CLEAR codes align to groups of eight codes.
 *
 * This is a byte service, not the file/prompt adapter. Every call owns its
 * state. Results are { status, bytes, error? }: 0 success, 2 compression did
 * not shrink, 1 failure. Failure bytes must not be persisted as a valid file.
 * Like compress-service.c, decode rejects headers lacking a full first code
 * (including the three-byte output from encoding an empty input). .Z has no
 * checksum/length; some corruption and truncation is inherently undetectable.
 */

const FIRST = 257;
const CLEAR = 256;
const INIT_BITS = 9;
const BITS = 16;
// Match the pinned Emscripten libc BUFSIZ used by compress-service.c. The
// input/output batching affects adaptive compression-ratio checkpoints.
const IBUFSIZ = 1024;
const OBUFSIZ = 1024;
const CHECK_GAP = 10000;

class ByteOutput {
    constructor() { this.bytes = new Uint8Array(4096); this.length = 0; }
    reserve(length) {
        if (length <= this.bytes.length) return;
        const bytes = new Uint8Array(Math.max(length, this.bytes.length * 2));
        bytes.set(this.bytes); this.bytes = bytes;
    }
    push(byte) { this.reserve(this.length + 1); this.bytes[this.length++] = byte; }
    finish(length = this.length) { return this.bytes.slice(0, length); }
}

function failure(error) { return { status: 1, bytes: new Uint8Array(0), error }; }
function align(posbits, boff, n_bits) {
    const group = n_bits * 8;
    return posbits + (group - (posbits - boff) % group) % group;
}

/** Encode block-mode, 16-bit Unix .Z bytes; preserve non-shrinking output. */
export function compressUnixZ(input) {
    if (!(input instanceof Uint8Array)) return failure('Expected Uint8Array input');
    const out = new ByteOutput();
    out.bytes.set([0x1f, 0x9d, 0x80 | BITS]);
    let outbits = 24, boff = 24, flushed = 0;
    let n_bits = INIT_BITS, extcode = (1 << n_bits) + 1;
    let free_ent = FIRST, stcode = true, ratio = 0;
    let checkpoint = CHECK_GAP, bytes_in = 0, ent = 0;
    const dictionary = new Map();
    function output(code) {
        const offset = Math.floor(outbits / 8), shift = outbits % 8;
        out.reserve(offset + 3);
        const value = code << shift;
        out.bytes[offset] |= value;
        out.bytes[offset + 1] |= value >>> 8;
        out.bytes[offset + 2] |= value >>> 16;
        outbits += n_bits;
    }
    for (let start = 0; start < input.length; start += IBUFSIZ) {
        const rsize = Math.min(IBUFSIZ, input.length - start);
        let rpos = bytes_in === 0 ? 1 : 0;
        if (bytes_in === 0) ent = input[start];
        let rlop = 0;
        do {
            if (free_ent >= extcode && ent < FIRST) {
                if (n_bits < BITS) {
                    boff = outbits = align(outbits, boff, n_bits);
                    ++n_bits;
                    extcode = (1 << n_bits) + (n_bits < BITS ? 1 : 0);
                } else {
                    extcode = (1 << BITS) + OBUFSIZ;
                    stcode = false;
                }
            }
            if (!stcode && bytes_in >= checkpoint && ent < FIRST) {
                checkpoint = bytes_in + CHECK_GAP;
                const bytes_out = Math.floor(outbits / 8);
                const denominator = Math.floor(bytes_out / 256);
                const rat = bytes_in > 0x007fffff
                    ? (denominator === 0 ? 0x7fffffff : Math.floor(bytes_in / denominator))
                    : Math.floor(bytes_in * 256 / bytes_out);
                if (rat >= ratio) ratio = rat;
                else {
                    ratio = 0;
                    dictionary.clear();
                    output(CLEAR);
                    boff = outbits = align(outbits, boff, n_bits);
                    extcode = (1 << (n_bits = INIT_BITS)) + 1;
                    free_ent = FIRST;
                    stcode = true;
                }
            }
            // Preserve ncompress's batching without copying its output buffer.
            if (outbits - flushed * 8 >= OBUFSIZ * 8) flushed += OBUFSIZ;
            let i = Math.min(rsize - rlop, extcode - free_ent,
                Math.floor(((OBUFSIZ + 2048 - 32) * 8 - (outbits - flushed * 8)) / n_bits));
            if (!stcode) i = Math.min(i, checkpoint - bytes_in);
            rlop += i;
            bytes_in += i;
            do {
                if (rpos >= rlop && !(ent >= FIRST && rpos < rsize)) break;
                const c = input[start + rpos++];
                const key = ent * 256 + c;
                const found = dictionary.get(key);
                if (found !== undefined) ent = found;
                else {
                    output(ent);
                    ent = c;
                    if (stcode) dictionary.set(key, free_ent++);
                }
            } while (true);
            if (rpos > rlop) { bytes_in += rpos - rlop; rlop = rpos; }
        } while (rlop < rsize);
    }
    if (bytes_in > 0) output(ent);
    const length = Math.ceil(outbits / 8);
    out.reserve(length);
    return { status: length >= input.length ? 2 : 0, bytes: out.finish(length) };
}

/** Decode .Z block/non-block streams with declared widths from 9 through 16. */
export function decompressUnixZ(input) {
    if (!(input instanceof Uint8Array)) return failure('Expected Uint8Array input');
    if (input.length < 5 || input[0] !== 0x1f || input[1] !== 0x9d
        || (input[2] & 0x1f) < INIT_BITS || (input[2] & 0x1f) > BITS) {
        return failure('Invalid or incomplete .Z header');
    }
    const maxbits = input[2] & 0x1f, block_mode = input[2] & 0x80;
    const maxmaxcode = 1 << maxbits;
    const prefix = new Uint16Array(1 << BITS);
    const suffix = new Uint8Array(1 << BITS);
    const stack = new Uint8Array((1 << BITS) + 1);
    for (let code = 0; code < 256; ++code) suffix[code] = code;
    let n_bits = INIT_BITS, maxcode = (1 << INIT_BITS) - 1;
    let free_ent = block_mode ? FIRST : 256;
    let posbits = 24, boff = 24, oldcode = -1, finchar = 0;
    const out = new ByteOutput();
    while (true) {
        if (free_ent > maxcode) {
            posbits = align(posbits, boff, n_bits);
            boff = posbits;
            // Preserve ncompress's historical 9-bit saturation behavior too:
            // maxbits=9 advances to a 10-bit packing width at free_ent=512.
            // Both the pinned C and macOS compress streams exercise this.
            ++n_bits;
            maxcode = n_bits === maxbits ? maxmaxcode : (1 << n_bits) - 1;
        }
        if (posbits + n_bits > input.length * 8) break;
        const offset = Math.floor(posbits / 8), shift = posbits % 8;
        let code = ((input[offset] | (input[offset + 1] << 8)
            | ((input[offset + 2] || 0) << 16)) >>> shift) & ((1 << n_bits) - 1);
        posbits += n_bits;
        if (oldcode === -1) {
            if (code >= 256) return failure('Corrupt .Z initial code');
            out.push(finchar = oldcode = code);
            continue;
        }
        if (code === CLEAR && block_mode) {
            free_ent = FIRST - 1;
            posbits = align(posbits, boff, n_bits);
            boff = posbits;
            maxcode = (1 << (n_bits = INIT_BITS)) - 1;
            // ncompress retains oldcode/finchar here and creates a dummy code
            // 256 from the first code after CLEAR before returning to FIRST.
            continue;
        }
        const incode = code;
        let stackp = stack.length;
        if (code >= free_ent) {
            if (code > free_ent) return failure('Corrupt .Z dictionary code');
            stack[--stackp] = finchar;
            code = oldcode;
        }
        while (code >= 256) {
            if (stackp === 0 || code >= free_ent) return failure('Corrupt .Z dictionary chain');
            stack[--stackp] = suffix[code];
            code = prefix[code];
        }
        stack[--stackp] = finchar = suffix[code];
        out.reserve(out.length + stack.length - stackp);
        while (stackp < stack.length) out.bytes[out.length++] = stack[stackp++];
        if (free_ent < maxmaxcode) {
            prefix[free_ent] = oldcode;
            suffix[free_ent++] = finchar;
        }
        oldcode = incode;
    }
    return { status: 0, bytes: out.finish() };
}
