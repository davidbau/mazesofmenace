// hacklib.js — String and character utility functions
// Faithful port of hacklib.c from NetHack 3.7.
//
// Note on JS semantics: C functions that modify strings in-place (lcase, ucase,
// upstart, upwords, mungspaces, trimspaces, strip_newline, strkitten, copynchars,
// strcasecpy, tabexpand) return new strings in JS because JS strings are immutable.

// ============================================================================
// Character predicates and case conversion
// C ref: hacklib.c:125-150
// ============================================================================

// hacklib.c:125 — is 'c' a digit?
export function digit(c) {
    return c >= '0' && c <= '9';
}

// hacklib.c:132 — is 'c' a letter? note: '@' classed as letter
export function letter(c) {
    return ('@' <= c && c <= 'Z') || ('a' <= c && c <= 'z');
}

// hacklib.c:139 — force 'c' into uppercase
export function highc(c) {
    return (c >= 'a' && c <= 'z')
        ? String.fromCharCode(c.charCodeAt(0) & ~0x20)
        : c;
}

// hacklib.c:146 — force 'c' into lowercase
export function lowc(c) {
    return (c >= 'A' && c <= 'Z')
        ? String.fromCharCode(c.charCodeAt(0) | 0x20)
        : c;
}

// ============================================================================
// String case conversion
// C ref: hacklib.c:153-203
// Note: JS versions return new strings (C modifies in-place).
// ============================================================================

// hacklib.c:153 — convert a string into all lowercase
export function lcase(s) {
    return s.toLowerCase();
}

// hacklib.c:166 — convert a string into all uppercase
export function ucase(s) {
    return s.toUpperCase();
}

// hacklib.c:177 — convert first character of a string to uppercase
export function upstart(s) {
    if (!s) return s;
    return highc(s[0]) + s.slice(1);
}

// hacklib.c:186 — capitalize first letter of every word in a string
export function upwords(s) {
    let result = '';
    let space = true;
    for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (c === ' ') {
            space = true;
            result += c;
        } else if (space && letter(c)) {
            result += highc(c);
            space = false;
        } else {
            result += c;
            space = false;
        }
    }
    return result;
}

// ============================================================================
// String whitespace and newline handling
// C ref: hacklib.c:205-255
// Note: JS versions return new strings (C modifies in-place).
// ============================================================================

// hacklib.c:205 — remove excess whitespace (collapse runs, trim ends, stop at \n)
export function mungspaces(bp) {
    let result = '';
    let was_space = true;
    for (let i = 0; i < bp.length; i++) {
        let c = bp[i];
        if (c === '\n') break;
        if (c === '\t') c = ' ';
        if (c !== ' ' || !was_space) result += c;
        was_space = (c === ' ');
    }
    if (was_space && result.length > 0)
        result = result.slice(0, -1);
    return result;
}

// hacklib.c:227 — skip leading whitespace; remove trailing whitespace
export function trimspaces(txt) {
    return txt.replace(/^[ \t]+/, '').replace(/[ \t]+$/, '');
}

// hacklib.c:243 — remove \n from end of line (and \r if present)
export function strip_newline(str) {
    return str.replace(/\r?\n$/, '');
}

// ============================================================================
// String end/length utilities
// C ref: hacklib.c:257-274
// Note: C eos() returns a char* pointer to '\0'. JS returns the string length
// (the index where '\0' would be), which is the natural JS equivalent.
// ============================================================================

// hacklib.c:257 — return the index of the end of a string (= length)
export function eos(s) {
    return s.length;
}

// hacklib.c:266 — const version of eos()
export function c_eos(s) {
    return s.length;
}

// ============================================================================
// String comparison utilities
// C ref: hacklib.c:277-337
// ============================================================================

// hacklib.c:277 — determine whether 'str' starts with 'chkstr', optionally case-blind
export function str_start_is(str, chkstr, caseblind) {
    if (caseblind)
        return str.toLowerCase().startsWith(chkstr.toLowerCase());
    return str.startsWith(chkstr);
}

// hacklib.c:305 — determine whether 'str' ends with 'chkstr'
export function str_end_is(str, chkstr) {
    return str.endsWith(chkstr);
}

// hacklib.c:316 — return max line length from newline-separated string
export function str_lines_maxlen(str) {
    let max_len = 0;
    const lines = str.split('\n');
    for (const line of lines) {
        if (line.length > max_len) max_len = line.length;
    }
    return max_len;
}

// ============================================================================
// String building utilities
// C ref: hacklib.c:340-408
// Note: strkitten/copynchars/strcasecpy return new strings in JS.
// ============================================================================

// hacklib.c:340 — append a character to a string: strcat(s, {c,'\0'})
export function strkitten(s, c) {
    return s + c;
}

// hacklib.c:350 — truncating string copy (stops at n chars or '\n')
// Returns the copied string (JS: no separate dst buffer needed).
export function copynchars(src, n) {
    let result = '';
    for (let i = 0; i < n && i < src.length && src[i] !== '\n'; i++) {
        result += src[i];
    }
    return result;
}

// hacklib.c:365 — convert char nc into oc's case
export function chrcasecpy(oc, nc) {
    if ('a' <= oc && oc <= 'z') {
        if ('A' <= nc && nc <= 'Z') nc = String.fromCharCode(nc.charCodeAt(0) + ('a'.charCodeAt(0) - 'A'.charCodeAt(0)));
    } else if ('A' <= oc && oc <= 'Z') {
        if ('a' <= nc && nc <= 'z') nc = String.fromCharCode(nc.charCodeAt(0) + ('A'.charCodeAt(0) - 'a'.charCodeAt(0)));
    }
    return nc;
}

// hacklib.c:387 — overwrite string, preserving old chars' case
// In JS: applies old string's case pattern to new string src.
export function strcasecpy(dst, src) {
    let result = '';
    let dst_exhausted = false;
    let dstIdx = 0;
    for (let i = 0; i < src.length; i++) {
        if (!dst_exhausted && dstIdx >= dst.length) dst_exhausted = true;
        const oc = dst_exhausted ? dst[dst.length - 1] : dst[dstIdx++];
        result += chrcasecpy(oc || '', src[i]);
    }
    return result;
}

// ============================================================================
// English suffix helpers (used by message formatting)
// C ref: hacklib.c:409-494
// ============================================================================

// hacklib.c:409 — return a name converted to possessive
export function s_suffix(s) {
    const lower = s.toLowerCase();
    if (lower === 'it') return s + 's';       // it -> its
    if (lower === 'you') return s + 'r';      // you -> your
    if (s[s.length - 1] === 's') return s + "'";  // Xs -> Xs'
    return s + "'s";                           // X -> X's
}

// hacklib.c:427 — construct a gerund (verb + "ing")
export function ing_suffix(s) {
    const vowel = 'aeiouwy';
    let buf = s;
    let onoff = '';

    // Extract trailing " on", " off", " with"
    if (buf.length >= 3 && buf.slice(-3).toLowerCase() === ' on') {
        onoff = ' on'; buf = buf.slice(0, -3);
    } else if (buf.length >= 4 && buf.slice(-4).toLowerCase() === ' off') {
        onoff = ' off'; buf = buf.slice(0, -4);
    } else if (buf.length >= 5 && buf.slice(-5).toLowerCase() === ' with') {
        onoff = ' with'; buf = buf.slice(0, -5);
    }

    const p = buf.length;
    if (p >= 2 && buf.slice(-2).toLowerCase() === 'er') {
        // slither + ing — nothing
    } else if (p >= 3
        && !vowel.includes(buf[p - 1].toLowerCase())
        && vowel.includes(buf[p - 2].toLowerCase())
        && !vowel.includes(buf[p - 3].toLowerCase())) {
        // tip -> tipp + ing
        buf = buf + buf[p - 1];
    } else if (p >= 2 && buf.slice(-2).toLowerCase() === 'ie') {
        // vie -> vy + ing
        buf = buf.slice(0, -2) + 'y';
    } else if (p >= 1 && buf[p - 1] === 'e') {
        // grease -> greas + ing
        buf = buf.slice(0, -1);
    }

    return buf + 'ing' + onoff;
}

// ============================================================================
// Miscellaneous utilities
// C ref: hacklib.c:482-575
// ============================================================================

// hacklib.c:483 — is a string entirely whitespace?
export function onlyspace(s) {
    for (let i = 0; i < s.length; i++) {
        if (s[i] !== ' ' && s[i] !== '\t') return false;
    }
    return true;
}

// hacklib.c:493 — expand tabs into proper number of spaces (8-column tabs)
// JS returns a new string (C modifies in-place).
export function tabexpand(sbuf) {
    let result = '';
    let idx = 0;
    for (let i = 0; i < sbuf.length; i++) {
        if (sbuf[i] === '\t') {
            do { result += ' '; } while (++idx % 8);
        } else {
            result += sbuf[i];
            idx++;
        }
        if (idx >= 512) break; // BUFSZ safety limit
    }
    return result;
}

// hacklib.c:533 — make a displayable string from a character
// In C this returns one of 5 rotating static buffers; in JS just returns a string.
export function visctrl(c) {
    const code = typeof c === 'string' ? c.charCodeAt(0) : c;
    let result = '';
    let ch = code;
    if (ch & 0x80) {
        result += 'M-';
        ch &= 0x7f;
    }
    if (ch < 0x20) {
        result += '^' + String.fromCharCode(ch | 0x40); // letter
    } else if (ch === 0x7f) {
        result += '^?';
    } else {
        result += String.fromCharCode(ch);
    }
    return result;
}

// ============================================================================
// Deterministic sort (stable, index-tiebreaking)
// C ref: hacklib.c:36-122 nh_deterministic_qsort()
//
// JS version: sorts array in place using comparator, with original-index
// tiebreaking to ensure deterministic order across platforms.
// Unlike C which operates on raw bytes, this takes a JS array directly.
// ============================================================================

// hacklib.c:36 — deterministic replacement for qsort(), stable across platforms
export function nh_deterministic_qsort(arr, comparator) {
    if (!arr || arr.length < 2) return;
    const indexed = arr.map((item, i) => ({ item, i }));
    indexed.sort((a, b) => {
        const c = comparator(a.item, b.item);
        return c !== 0 ? c : a.i - b.i;
    });
    for (let i = 0; i < arr.length; i++) arr[i] = indexed[i].item;
}

// ============================================================================
// Data file utilities (JS-only, no C counterpart)
// ============================================================================

// xcrypt: XOR each char that has bit 5 or 6 set with a rotating bitmask
// (1,2,4,8,16). C ref: hacklib.c:464 xcrypt().
// JS version: takes str only (no output buffer needed), returns new string.
export function xcrypt(str) {
    let result = '';
    let bitmask = 1;
    for (let i = 0; i < str.length; i++) {
        let ch = str.charCodeAt(i);
        if (ch & (32 | 64)) ch ^= bitmask;
        if ((bitmask <<= 1) >= 32) bitmask = 1;
        result += String.fromCharCode(ch);
    }
    return result;
}

// Strip trailing underscores added by makedefs padding.
// C ref: rumors.c unpadline() — strips trailing '_' characters.
export function unpadline(str) {
    return str.replace(/_+$/, '');
}

// Parse a makedefs-compiled encrypted data file (epitaph, engrave, etc.).
// Format: 1 header line (skipped) + N encrypted+padded data lines.
// Returns { texts: string[], lineBytes: number[], chunksize: number }
export function parseEncryptedDataFile(fileText) {
    const allLines = fileText.split('\n');
    // Skip header line ("# This data file is generated by makedefs...")
    // and trailing empty string from final newline
    const dataLines = allLines.slice(1).filter(l => l.length > 0);
    const texts = [];
    const lineBytes = [];
    for (const line of dataLines) {
        const decrypted = unpadline(xcrypt(line));
        texts.push(decrypted);
        lineBytes.push(line.length + 1); // +1 for newline byte in file
    }
    const chunksize = lineBytes.reduce((a, b) => a + b, 0);
    return { texts, lineBytes, chunksize };
}

// Parse the makedefs-compiled rumors file which has two sections (true + false).
// Format: header line, index line, then true rumors followed by false rumors.
// Index line: "%04d,%06ld,%06lx;%04d,%06ld,%06lx;0,0,%06lx"
//   = trueCount(dec), trueSize(dec), trueOffset(hex);
//     falseCount(dec), falseSize(dec), falseOffset(hex); 0,0,eofOffset(hex)
// Returns { trueTexts, trueLineBytes, trueSize, falseTexts, falseLineBytes, falseSize }
export function parseRumorsFile(fileText) {
    const allLines = fileText.split('\n');
    // Line 0: "# This data file..." header (skipped)
    // Line 1: index line with section sizes and offsets
    const indexLine = allLines[1];
    const [truePart, falsePart] = indexLine.split(';');
    const trueParts = truePart.split(',');
    const falseParts = falsePart.split(',');
    const trueSize = parseInt(trueParts[1], 10);
    const falseSize = parseInt(falseParts[1], 10);

    // Data lines start at line 2
    const dataLines = allLines.slice(2).filter(l => l.length > 0);

    const trueTexts = [];
    const trueLineBytes = [];
    const falseTexts = [];
    const falseLineBytes = [];
    let cumBytes = 0;

    for (const line of dataLines) {
        const bytes = line.length + 1; // +1 for newline
        const decrypted = unpadline(xcrypt(line));
        if (cumBytes < trueSize) {
            trueTexts.push(decrypted);
            trueLineBytes.push(bytes);
        } else {
            falseTexts.push(decrypted);
            falseLineBytes.push(bytes);
        }
        cumBytes += bytes;
    }

    return { trueTexts, trueLineBytes, trueSize, falseTexts, falseLineBytes, falseSize };
}
