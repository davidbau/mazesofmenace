// js/crt/ctype.js: <ctype.h> in the "C" locale, Darwin (method/design.md 5).
// Hand-written runtime. The argument is an int: a byte value 0..255 or EOF (-1);
// on Darwin, bytes 128..255 have no class in the C locale (verified natively in
// tests/crt/string.test.mjs). Results are 0 or nonzero; we return 0/1 and the
// tests compare truth values (generated code only tests them for truth).
const T = new Uint16Array(256);
const UP = 1, LO = 2, DI = 4, SP = 8, PU = 16, CN = 32, XD = 64, BL = 128, PR = 256;
for (let c = 0; c < 128; c++) {
    let f = 0;
    if (c >= 65 && c <= 90) f |= UP;
    if (c >= 97 && c <= 122) f |= LO;
    if (c >= 48 && c <= 57) f |= DI;
    if (c === 32 || (c >= 9 && c <= 13)) f |= SP;
    if (c < 32 || c === 127) f |= CN;
    if ((c >= 48 && c <= 57) || (c >= 65 && c <= 70) || (c >= 97 && c <= 102)) f |= XD;
    if (c === 32 || c === 9) f |= BL;
    if (c >= 32 && c < 127) f |= PR;
    if (c > 32 && c < 127 && !(f & (UP | LO | DI))) f |= PU;
    T[c] = f;
}
const cls = (c, m) => (c >= 0 && c < 256 && (T[c] & m) ? 1 : 0);
export const isupper = (c) => cls(c, UP);
export const islower = (c) => cls(c, LO);
export const isalpha = (c) => cls(c, UP | LO);
export const isdigit = (c) => cls(c, DI);
export const isxdigit = (c) => cls(c, XD);
export const isalnum = (c) => cls(c, UP | LO | DI);
export const isspace = (c) => cls(c, SP);
export const ispunct = (c) => cls(c, PU);
export const iscntrl = (c) => cls(c, CN);
export const isprint = (c) => cls(c, PR);
export const isgraph = (c) => (cls(c, PR) && c !== 32 ? 1 : 0);
export const isblank = (c) => cls(c, BL);
export const isascii = (c) => (c >= 0 && c < 128 ? 1 : 0);
export const toupper = (c) => (c >= 97 && c <= 122 ? c - 32 : c);
export const tolower = (c) => (c >= 65 && c <= 90 ? c + 32 : c);
