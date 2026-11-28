// @ts-nocheck
// script stores it.
//
// This port composes every frame as a BYTE string: one JS char per byte the C
// those bytes: MarkerParser._drain() takes each marker's LEN payload bytes and
// bytes >= 0x80 -- the raw screens (top-ten list, tombstone-less end grid, the
// rc error page: patch 006 nomux_raw_putch keeps them), where normal tty
// "crèmepiñ" is 8 chars, not the 10 bytes C painted, and a byte sequence that
// is not UTF-8 is U+FFFD.  Mac arm orgrec t24-h-nonasciib-v055 step 188
// (top ten "crèmepiñ-Sam-Hum-Mal-Law"), t25-a-namechain (a name cut inside a
// sequence: "Søren gr�-Pri-Elf...").
//
// The decode is Node's Buffer#toString('utf8'), i.e. the WHATWG UTF-8 decoder
// with replacement (one U+FFFD per maximal subpart of an ill-formed sequence;
// no BOM stripping; a sequence cannot span two markers, so it is per frame).
// It is spelled out here so the result does not depend on the host.

/* WHATWG Encoding "UTF-8 decoder", error mode replacement, over a byte array
 * (values 0..255).  Returns a JS string. */
function utf8DecodeBytes(bytes) {
    let out = '';
    let need = 0, seen = 0, cp = 0, lower = 0x80, upper = 0xbf;
    for (let i = 0; i < bytes.length; i++) {
        const b = bytes[i];
        if (need === 0) {
            if (b <= 0x7f) out += String.fromCharCode(b);
            else if (b >= 0xc2 && b <= 0xdf) { need = 1; cp = b & 0x1f; }
            else if (b >= 0xe0 && b <= 0xef) {
                if (b === 0xe0) lower = 0xa0;
                if (b === 0xed) upper = 0x9f;
                need = 2; cp = b & 0x0f;
            } else if (b >= 0xf0 && b <= 0xf4) {
                if (b === 0xf0) lower = 0x90;
                if (b === 0xf4) upper = 0x8f;
                need = 3; cp = b & 0x07;
            } else out += '�';
            continue;
        }
        if (b < lower || b > upper) {
            /* ill-formed: one U+FFFD for the subpart so far, and the byte is
             * processed again from the start state */
            need = 0; seen = 0; cp = 0; lower = 0x80; upper = 0xbf;
            out += '�';
            i--;
            continue;
        }
        lower = 0x80; upper = 0xbf;
        cp = (cp << 6) | (b & 0x3f);
        if (++seen === need) {
            out += String.fromCodePoint(cp);
            need = 0; seen = 0; cp = 0;
        }
    }
    if (need !== 0) out += '�';
    return out;
}

const HIGH = /[\x80-\xff]/;

export function frameTextUtf8(s) {
    if (typeof s !== 'string' || !HIGH.test(s)) return s;
    let out = '';
    let run = [];
    for (let i = 0; i < s.length; i++) {
        const c = s.charCodeAt(i);
        if (c <= 0xff) { run.push(c); continue; }
        if (run.length) { out += utf8DecodeBytes(run); run = []; }
        out += s[i];
    }
    if (run.length) out += utf8DecodeBytes(run);
    return out;
}

export { utf8DecodeBytes };
