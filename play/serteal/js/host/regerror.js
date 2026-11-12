// host/regerror.js - regerror() with the messages of the recorder's C library.
//
// NetHack shows regerror() text when a menucolor or message-type pattern
// in the options does not compile.  The recorder ran on macOS, whose regex
// comes from FreeBSD; the texts below are those of FreeBSD's
// lib/libc/regex/regerror.c (BSD licence, Henry Spencer's regex package).
// The error codes are those of the C library the port links (musl, TRE).

// <regex.h> error codes of the linked C library (musl)
export const REG_NOMATCH = 1;
export const REG_BADPAT = 2;
export const REG_ECOLLATE = 3;
export const REG_ECTYPE = 4;
export const REG_EESCAPE = 5;
export const REG_ESUBREG = 6;
export const REG_EBRACK = 7;
export const REG_EPAREN = 8;
export const REG_EBRACE = 9;
export const REG_BADBR = 10;
export const REG_ERANGE = 11;
export const REG_ESPACE = 12;
export const REG_BADRPT = 13;

const MESSAGES = new Map([
  [REG_NOMATCH, "regexec() failed to match"],
  [REG_BADPAT, "invalid regular expression"],
  [REG_ECOLLATE, "invalid collating element"],
  [REG_ECTYPE, "invalid character class"],
  [REG_EESCAPE, "trailing backslash (\\)"],
  [REG_ESUBREG, "invalid backreference number"],
  [REG_EBRACK, "brackets ([ ]) not balanced"],
  [REG_EPAREN, "parentheses not balanced"],
  [REG_EBRACE, "braces not balanced"],
  [REG_BADBR, "invalid repetition count(s)"],
  [REG_ERANGE, "invalid character range"],
  [REG_ESPACE, "out of memory"],
  [REG_BADRPT, "repetition-operator operand invalid"],
]);

/** The message for an error code. */
export function regerrorText(errcode) {
  return MESSAGES.get(errcode) ?? "*** unknown regexp error code ***";
}

/**
 * regerror(errcode, preg, errbuf, errbuf_size) on the heap mem.HEAPU8: copies
 * the message (truncated, NUL-terminated) and returns its length + 1.
 */
export function regerror(mem, errcode, preg, errbuf, errbufSize) {
  const s = regerrorText(errcode);
  const len = s.length + 1;
  if (errbufSize > 0) {
    const H = mem.HEAPU8;
    const n = Math.min(s.length, errbufSize - 1);
    for (let i = 0; i < n; i++) H[errbuf + i] = s.charCodeAt(i);
    H[errbuf + n] = 0;
  }
  return len;
}
