// host/regex.js - regcomp()/regexec() of the recorder's C library.
//
// NetHack compiles the patterns of MENUCOLOR, MSGTYPE and AUTOPICKUP_EXCEPTION options with
// regcomp(REG_EXTENDED | REG_NOSUB) and only asks regexec() whether a string matches
// (sys/share/posixregex.c).  The recorder ran on macOS, whose regex is Apple's build of TRE
// (Libc regex/TRE: BSD_COMPATIBILITY, no REG_ENHANCED by default), in the "C" locale (the game
// never calls setlocale), where every byte is one character.  musl's regex is also TRE-based
// but another dialect: it reads \w \d \s \b \< \> and \1 as GNU extensions, accepts "a**",
// "^*", "a||b" and an empty pattern, rejects "[[:<:]]", "[[.a.]]", "a{,2}" and a literal "{".
// Users see the difference in which menu lines get colours, which messages are hidden and
// which objects are picked up, and in the error text of a pattern that does not compile.
//
// This module is that dialect, for those flags: parse() follows Apple's tre_parse(),
// tre_parse_bracket() and tre_parse_bound() step for step (same explicit parse stack, so the
// same error code for every malformed pattern), and the automaton is built and run the way
// tre_compile() and tre_tnfa_run_parallel() do it (see "TNFA" below: TRE's handling of
// assertions on empty paths is its own, and decides some matches).
//
//   compile(bytes)          -> { err } (a Darwin <regex.h> error code) or { nsub, nfa }
//   matches(nfa, bytes)     -> boolean (regexec(..., 0, NULL, 0) == 0)

// Darwin <regex.h> error codes (1-13 have the same values as musl's)
export const REG_NOMATCH = 1, REG_ECOLLATE = 3, REG_ECTYPE = 4, REG_EESCAPE = 5, REG_EBRACK = 7,
  REG_EPAREN = 8, REG_EBRACE = 9, REG_BADBR = 10, REG_ERANGE = 11, REG_ESPACE = 12, REG_BADRPT = 13,
  REG_EMPTY = 14, REG_BADMAX = 18;

const RE_DUP_MAX = 255;
const INT_MAX = 2147483647;
const SUBMATCH_ID_INVISIBLE_START = 0x40000000;

// "C" locale character classes of Darwin's wctype()/iswctype() (bytes 0-255; nothing above
// 127 is in any class but "rune" covers 0-127)
const range = (lo, hi) => { const s = []; for (let c = lo; c <= hi; c++) s.push(c); return s; };
const chars = (t) => Array.from(t, (ch) => ch.charCodeAt(0));
const DIGIT = range(48, 57), UPPER = range(65, 90), LOWER = range(97, 122);
const PUNCT = [...range(33, 47), ...range(58, 64), ...range(91, 96), ...range(123, 126)];
const CLASSES = new Map(Object.entries({
  alnum: [...DIGIT, ...UPPER, ...LOWER],
  alpha: [...UPPER, ...LOWER],
  blank: [9, 32],
  cntrl: [...range(0, 31), 127],
  digit: DIGIT,
  graph: range(33, 126),
  ideogram: [],
  lower: LOWER,
  phonogram: [],
  print: range(32, 126),
  punct: PUNCT,
  rune: range(0, 127),
  space: [...range(9, 13), 32],
  special: [],
  upper: UPPER,
  xdigit: [...DIGIT, ...chars("ABCDEFabcdef")],
}));
const WORD = new Uint8Array(256); // IS_WORD_CHAR: '_' or iswalnum
for (const c of [...CLASSES.get("alnum"), 95]) WORD[c] = 1;

// Character names of [[.name.]] / [[=name=]] (FreeBSD regex/cname.h, which TRE searches
// first under BSD_COMPATIBILITY), in the table's order: tre_search_cnames() is a binary
// search over it, entry 0 being an empty sentinel.
const CNAMES = [
  ["", -1], ["ACK", 6], ["BEL", 7], ["BS", 8], ["CAN", 24], ["CR", 13], ["DC1", 17], ["DC2", 18], ["DC3", 19],
  ["DC4", 20], ["DEL", 127], ["DLE", 16], ["EM", 25], ["ENQ", 5], ["EOT", 4], ["ESC", 27], ["ETB", 23], ["ETX", 3],
  ["FF", 12], ["FS", 28], ["GS", 29], ["HT", 9], ["IS1", 31], ["IS2", 30], ["IS3", 29], ["IS4", 28], ["LF", 10],
  ["NAK", 21], ["NUL", 0], ["RS", 30], ["SI", 15], ["SO", 14], ["SOH", 1], ["STX", 2], ["SUB", 26], ["SYN", 22],
  ["US", 31], ["VT", 11], ["alert", 7], ["ampersand", 38], ["apostrophe", 39], ["asterisk", 42], ["backslash", 92],
  ["backspace", 8], ["carriage-return", 13], ["circumflex", 94], ["circumflex-accent", 94], ["colon", 58],
  ["comma", 44], ["commercial-at", 64], ["dollar-sign", 36], ["eight", 56], ["equals-sign", 61],
  ["exclamation-mark", 33], ["five", 53], ["form-feed", 12], ["four", 52], ["full-stop", 46], ["grave-accent", 96],
  ["greater-than-sign", 62], ["hyphen", 45], ["hyphen-minus", 45], ["left-brace", 123], ["left-curly-bracket", 123],
  ["left-parenthesis", 40], ["left-square-bracket", 91], ["less-than-sign", 60], ["low-line", 95], ["newline", 10],
  ["nine", 57], ["number-sign", 35], ["one", 49], ["percent-sign", 37], ["period", 46], ["plus-sign", 43],
  ["question-mark", 63], ["quotation-mark", 34], ["reverse-solidus", 92], ["right-brace", 125],
  ["right-curly-bracket", 125], ["right-parenthesis", 41], ["right-square-bracket", 93], ["semicolon", 59],
  ["seven", 55], ["six", 54], ["slash", 47], ["solidus", 47], ["space", 32], ["tab", 9], ["three", 51], ["tilde", 126],
  ["two", 50], ["underscore", 95], ["vertical-line", 124], ["zero", 48],
].map(([n, c]) => [chars(n), c]);

function searchCnames(re, start, len) {
  let low = 0, high = CNAMES.length - 1;
  while (low <= high) {
    const cur = (low + high) >>> 1;
    const name = CNAMES[cur][0];
    let cmp = 0;
    for (let i = 0; i < len; i++) { // wcsncmp(name, cnames[cur].name, len)
      const a = re[start + i], b = name[i] ?? 0;
      if (a !== b) { cmp = a - b; break; }
      if (!b) break;
    }
    if (cmp === 0 && name.length === len) return CNAMES[cur][1];
    if (cmp > 0) low = cur + 1;
    else high = cur - 1;
  }
  return -1;
}

// ---- AST ---------------------------------------------------------------------------------
// { t: "set", set: Uint8Array(256) } one character of a set; { t: "assert", a } BOL EOL BOW EOW;
// { t: "empty" }; { t: "cat" | "union", l, r }; { t: "iter", x, min, max (-1: unbounded) }.
// sub: TRE's submatch_id (-1 for a plain literal; needed for the "raw assertion" checks).
const lit = (set) => ({ t: "set", set, sub: -1 });
function single(c) { const s = new Uint8Array(256); s[c] = 1; return lit(s); }
const isRawAssertion = (n) => n.t === "assert" && n.sub < 0;

class ParseError { constructor(code) { this.code = code; } }
const fail = (code) => { throw new ParseError(code); };

/** tre_parse_bound(): `re[ctx.i]` follows the '{'. Returns REG_NOMATCH (the '{' is a
 *  literal), or { min, max, end } (end: index after the bound), or throws. */
function parseBound(re, ctx) {
  let r = ctx.i;
  const end = re.length;
  const parseInt = () => {
    let num = 0, overflow = false;
    const s = r;
    while (r < end && re[r] >= 48 && re[r] <= 57) {
      if (!overflow) { num = num * 10 + re[r] - 48; if (num > INT_MAX) overflow = true; }
      r++;
    }
    if (r === s) return -1;
    return overflow ? INT_MAX : num;
  };
  if (r >= end) return REG_NOMATCH;
  let min;
  if (re[r] >= 48 && re[r] <= 57) min = parseInt();
  else return REG_NOMATCH;
  let max = min;
  if (r < end && re[r] === 44 /* , */) {
    if (min < 0) min = 0;
    r++;
    max = parseInt();
  }
  if (max >= 0 && min > max) fail(REG_BADBR);
  if (min > RE_DUP_MAX || max > RE_DUP_MAX) fail(REG_BADMAX);
  if (r >= end) fail(REG_EBRACE);
  if (r === ctx.i) fail(REG_BADBR);
  if (re[r] !== 125 /* } */) fail(REG_BADBR);
  r++;
  if (r < end && (re[r] === 63 /* ? */ || re[r] === 42 /* * */ || re[r] === 43 /* + */)) fail(REG_BADRPT);
  return { min, max, end: r };
}

/** tre_parse_bracket(): `re[ctx.i]` follows the '['. */
function parseBracket(re, ctx) {
  const end = re.length;
  let p = ctx.i;
  // [[:<:]] and [[:>:]]
  if (end - p >= 6 && re[p] === 91 && re[p + 1] === 58 && (re[p + 2] === 60 || re[p + 2] === 62) &&
      re[p + 3] === 58 && re[p + 4] === 93 && re[p + 5] === 93) {
    ctx.i = p + 6;
    return { t: "assert", a: re[p + 2] === 60 ? "BOW" : "EOW", sub: -1 };
  }
  let negate = false;
  if (re[p] === 94 /* ^ */) { negate = true; p++; }
  const first = p;
  const items = []; // [kind, a, b]: "c" char, "r" range, "k" class (array of chars)
  const add = (item) => { if (items.length >= 1024) fail(REG_ESPACE); items.push(item); };
  let range = -1; // -1 unset, 0 begin range set, +1 end range expected
  let min = 0;
  const single = (c) => { // process_single_character
    if (range > 0) {
      if (min > c) fail(REG_ERANGE); // __collate_range_cmp in the C locale
      add(["r", min, c]);
      range = -1;
    } else {
      if (range === 0) add(["c", min]);
      min = c;
      range = 0;
    }
  };
  for (; p < end; p++) {
    const ch = re[p];
    if (ch === 45 /* - */) {
      if (p === first) { min = 45; range = 0; continue; }
      if (range > 0) { single(45); continue; }
      if (p + 1 >= end) fail(REG_EBRACK);
      if (re[p + 1] === 93) { single(45); continue; }
      if (range < 0) fail(REG_ERANGE);
      range = 1;
      continue;
    }
    if (ch === 91 /* [ */) {
      if (p + 1 >= end) fail(REG_EBRACK);
      const kind = re[p + 1];
      if (kind === 46 /* . */) {
        p += 2;
        const start = p;
        for (;; p++) {
          if (p >= end) fail(REG_ECOLLATE);
          if (re[p] === 46) {
            if (p + 1 >= end) fail(REG_ECOLLATE);
            if (re[p + 1] === 93) {
              if (p === start) fail(REG_ECOLLATE);
              let c = searchCnames(re, start, p - start);
              if (c === -1) {
                // __collate_equiv_value() of the C locale: only single characters exist
                if (p - start !== 1) fail(REG_ECOLLATE);
                c = re[start];
              }
              p++;
              single(c);
              break;
            }
          }
        }
        continue;
      }
      if (kind === 61 /* = */ || kind === 58 /* : */) {
        if (range > 0) fail(REG_ERANGE);
        if (range === 0) add(["c", min]);
        range = -1;
        p += 2;
        const start = p;
        const err = kind === 61 ? REG_ECOLLATE : REG_ECTYPE;
        for (;; p++) {
          if (p >= end) fail(err);
          if (re[p] === kind) {
            if (p + 1 >= end) fail(err);
            if (re[p + 1] === 93) {
              if (p === start) fail(err);
              if (kind === 61) {
                if (p - start === 1) add(["c", re[start]]); // its own equivalence class
                else {
                  const c = searchCnames(re, start, p - start);
                  if (c === -1) fail(REG_ECOLLATE);
                  p++;
                  single(c);
                  break;
                }
              } else {
                const name = String.fromCharCode(...re.subarray(start, start + Math.min(p - start, 63)));
                const cls = CLASSES.get(name);
                if (!cls) fail(REG_ECTYPE);
                add(["k", cls]);
              }
              p++;
              break;
            }
          }
        }
        continue;
      }
      single(91);
      continue;
    }
    if (ch === 93 /* ] */) {
      if (p === first) { min = 93; range = 0; continue; }
      if (range === 0) add(["c", min]);
      ctx.i = p + 1;
      const set = new Uint8Array(256);
      for (const [k, a, b] of items) {
        if (k === "c") set[a] = 1;
        else if (k === "r") set.fill(1, a, b + 1);
        else for (const c of a) set[c] = 1;
      }
      if (negate) for (let c = 0; c < 256; c++) set[c] ^= 1;
      return lit(set);
    }
    single(ch);
  }
  fail(REG_EBRACK);
}

// tre_parse() stack symbols
const PARSE_RE = 0, PARSE_ATOM = 1, PARSE_MARK_FOR_SUBMATCH = 2, PARSE_BRANCH = 3, PARSE_PIECE = 4,
  PARSE_CATENATION = 5, PARSE_POST_CATENATION = 6, PARSE_UNION = 7, PARSE_POST_UNION = 8, PARSE_POSTFIX = 9;

/** tre_parse() for cflags REG_EXTENDED: AST, or throws ParseError. */
function parse(re) {
  const end = re.length;
  if (end <= 0) fail(REG_EMPTY);
  const ctx = { i: 0 };
  let submatchId = 0, invisible = SUBMATCH_ID_INVISIBLE_START;
  const stack = [];
  let result = null, depth = 0;
  stack.push(submatchId, PARSE_MARK_FOR_SUBMATCH);
  submatchId++;
  stack.push(PARSE_RE);
  const parseLiteral = () => {
    if (ctx.i >= end) fail(depth > 0 ? REG_EPAREN : REG_EMPTY);
    const c = re[ctx.i];
    if (c === 124 /* | */) fail(REG_EMPTY);
    if (c === 123 /* { */) {
      ctx.i++;
      const b = parseBound(re, ctx);
      if (b !== REG_NOMATCH) fail(REG_BADRPT);
      ctx.i--;
    } else if (c === 42 || c === 43 || c === 63) fail(REG_BADRPT);
    result = single(re[ctx.i]);
    ctx.i++;
  };
  while (stack.length) {
    const symbol = stack.pop();
    switch (symbol) {
      case PARSE_RE:
        stack.push(PARSE_UNION, PARSE_BRANCH);
        break;
      case PARSE_BRANCH:
        stack.push(PARSE_CATENATION, PARSE_PIECE);
        break;
      case PARSE_PIECE:
        stack.push(PARSE_POSTFIX, PARSE_ATOM);
        break;
      case PARSE_CATENATION: {
        if (ctx.i >= end) break;
        const c = re[ctx.i];
        if (c === 124) break;
        if (c === 41 /* ) */ && depth > 0) { depth--; break; }
        stack.push(result, PARSE_POST_CATENATION, PARSE_CATENATION, PARSE_PIECE);
        break;
      }
      case PARSE_POST_CATENATION: {
        const tree = stack.pop();
        result = { t: "cat", l: tree, r: result, sub: -1 };
        break;
      }
      case PARSE_UNION:
        if (ctx.i >= end) break;
        if (re[ctx.i] === 124) {
          stack.push(PARSE_UNION, ctx.i, result, PARSE_POST_UNION, PARSE_BRANCH);
          ctx.i++;
        } else if (re[ctx.i] === 41) ctx.i++;
        break;
      case PARSE_POST_UNION: {
        const tree = stack.pop();
        const pipe = stack.pop();
        if (pipe === ctx.i - 1) fail(REG_EMPTY);
        result = { t: "union", l: tree, r: result, sub: -1 };
        break;
      }
      case PARSE_POSTFIX: {
        if (ctx.i >= end) break;
        const c = re[ctx.i];
        if (c === 43 || c === 63 || c === 42) {
          if (isRawAssertion(result)) fail(REG_BADRPT);
          const min = c === 43 ? 1 : 0, max = c === 63 ? 1 : -1;
          if (ctx.i + 1 < end) {
            const n = re[ctx.i + 1];
            if (n === 63 || n === 42 || n === 43) fail(REG_BADRPT);
          }
          ctx.i++;
          result = { t: "iter", x: result, min, max, sub: invisible++ };
        } else if (c === 123) {
          const raw = isRawAssertion(result);
          ctx.i++;
          const b = parseBound(re, ctx);
          if (b === REG_NOMATCH) { ctx.i--; break; }
          result = { t: "iter", x: result, min: b.min, max: b.max, sub: invisible++ };
          ctx.i = b.end;
          if (raw) fail(REG_BADRPT);
        }
        break;
      }
      case PARSE_ATOM: {
        if (ctx.i >= end) { parseLiteral(); break; }
        const c = re[ctx.i];
        if (c === 40 /* ( */) {
          ctx.i++;
          stack.push(submatchId, PARSE_MARK_FOR_SUBMATCH, PARSE_RE);
          submatchId++;
          depth++;
        } else if (c === 41 && depth > 0) {
          result = { t: "empty", sub: -1 };
        } else if (c === 91 /* [ */) {
          ctx.i++;
          result = parseBracket(re, ctx);
        } else if (c === 92 /* \ */) {
          if (ctx.i + 1 >= end) fail(REG_EESCAPE);
          // not REG_ENHANCED: a backslash makes any character literal (no \w, \1, ...)
          ctx.i++;
          result = single(re[ctx.i]);
          ctx.i++;
        } else if (c === 46 /* . */) {
          const s = new Uint8Array(256).fill(1);
          s[0] = 0;
          result = lit(s);
          ctx.i++;
        } else if (c === 94 /* ^ */ || c === 36 /* $ */) {
          result = { t: "assert", a: c === 94 ? "BOL" : "EOL", sub: -1 };
          ctx.i++;
        } else parseLiteral();
        break;
      }
      case PARSE_MARK_FOR_SUBMATCH: {
        const id = stack.pop();
        if (result.sub >= 0 && result.sub < SUBMATCH_ID_INVISIBLE_START) {
          result = { t: "cat", l: { t: "empty", sub: -1 }, r: result, sub: -1 };
        }
        result.sub = id;
        break;
      }
    }
  }
  if (depth > 0) fail(REG_EPAREN);
  return { ast: result, nsub: submatchId - 1 };
}

// ---- TNFA ----------------------------------------------------------------------------------
// tre_compile() after the parse, without tags (REG_NOSUB, no minimal repetition, no
// backreferences): bounded repetitions are expanded into copies (tre_expand_ast), a final
// dummy literal is appended, and nullable/firstpos/lastpos are computed with TRE's rules
// (tre_compute_npfl, tre_match_empty, tre_set_union), assertions riding on the positions.
// Two of those rules are not textbook and decide some matches: the assertions of an empty
// path are those of ONE path (a union takes its left branch when it is nullable, an
// iteration goes through its argument), and tre_set_union() adds them to the entries of its
// first set only.  So "x([[:<:]])?" cannot match "x" at the end of the string on macOS.
// The states of the automaton are the positions; a transition reads the character of its
// source position and checks the assertions of both ends after it (tre_make_trans).
const A_BOL = 1, A_EOL = 2, A_BOW = 4, A_EOW = 8;
const ASSERT_BIT = { BOL: A_BOL, EOL: A_EOL, BOW: A_BOW, EOW: A_EOW };
const MAX_POSITIONS = 1 << 22;

function expand(n, budget) {
  switch (n.t) {
    case "set": if (++budget.n > MAX_POSITIONS) fail(REG_ESPACE); return { t: "set", set: n.set };
    case "assert": return { t: "assert", a: n.a };
    case "empty": return { t: "empty" };
    case "cat": case "union": return { t: n.t, l: expand(n.l, budget), r: expand(n.r, budget) };
    case "iter": {
      const { x, min, max } = n;
      if (min === 0 && max === 0) return { t: "empty" };
      if (!(min > 1 || max > 1)) return { t: "iter", x: expand(x, budget), min, max };
      let seq1 = null, seq2 = null;
      for (let j = 0; j < min; j++) { const copy = expand(x, budget); seq1 = seq1 ? { t: "cat", l: seq1, r: copy } : copy; }
      if (max === -1) seq2 = { t: "iter", x: expand(x, budget), min: 0, max: -1 };
      else for (let j = min; j < max; j++) {
        const copy = expand(x, budget);
        seq2 = seq2 ? { t: "cat", l: copy, r: seq2 } : copy;
        seq2 = { t: "union", l: { t: "empty" }, r: seq2 };
      }
      return seq1 === null ? seq2 : seq2 === null ? seq1 : { t: "cat", l: seq1, r: seq2 };
    }
  }
  throw new Error("regex: bad node " + n.t);
}

// assertions on the empty path through a nullable node (tre_match_empty)
function matchEmpty(n) {
  switch (n.t) {
    case "assert": return ASSERT_BIT[n.a];
    case "empty": case "set": return 0;
    case "union": return n.l.nullable ? matchEmpty(n.l) : n.r.nullable ? matchEmpty(n.r) : 0;
    case "cat": return matchEmpty(n.l) | matchEmpty(n.r);
    case "iter": return n.x.nullable ? matchEmpty(n.x) : 0;
  }
  return 0;
}

// set entries: { p: position, a: assertions }; tre_set_union(set1, set2, assertions)
const setUnion = (s1, s2, a) => [...(a ? s1.map((e) => ({ p: e.p, a: e.a | a })) : s1), ...s2];

function makeTnfa(ast) {
  const tree = { t: "cat", l: expand(ast, { n: 0 }), r: { t: "set", set: null } }; // + final dummy
  const sets = []; // position -> character set (null: the final position)
  const trans = []; // position -> [target, assertions, ...]
  const makeTrans = (p1s, p2s) => {
    for (const e1 of p1s) {
      let prev = -1;
      for (const e2 of p2s) {
        if (e2.p === prev) continue;
        prev = e2.p;
        trans[e1.p].push(e2.p, e1.a | e2.a);
      }
    }
  };
  // tre_compute_npfl (children first), then the transitions of tre_ast_to_tnfa
  const npfl = (n) => {
    switch (n.t) {
      case "set": {
        const p = sets.length;
        sets.push(n.set); trans.push([]);
        n.nullable = false; n.first = [{ p, a: 0 }]; n.last = n.first;
        return;
      }
      case "assert": case "empty": n.nullable = true; n.first = []; n.last = []; return;
      case "union":
        npfl(n.l); npfl(n.r);
        n.nullable = n.l.nullable || n.r.nullable;
        n.first = setUnion(n.l.first, n.r.first, 0);
        n.last = setUnion(n.l.last, n.r.last, 0);
        return;
      case "cat":
        npfl(n.l); npfl(n.r);
        n.nullable = n.l.nullable && n.r.nullable;
        n.first = n.l.nullable ? setUnion(n.r.first, n.l.first, matchEmpty(n.l)) : n.l.first;
        n.last = n.r.nullable ? setUnion(n.l.last, n.r.last, matchEmpty(n.r)) : n.r.last;
        makeTrans(n.l.last, n.r.first);
        return;
      case "iter":
        npfl(n.x);
        if (n.min === 0 || n.x.nullable) {
          n.nullable = true;
          n.last = n.x.nullable ? setUnion(n.x.last, n.x.last, matchEmpty(n.x)) : n.x.last;
        } else {
          n.nullable = false;
          n.last = n.x.last;
        }
        n.first = n.x.first;
        if (n.max === -1) makeTrans(n.x.last, n.x.first);
        return;
    }
  };
  npfl(tree);
  return {
    sets,
    trans: trans.map((t) => Int32Array.from(t)),
    initial: Int32Array.from(tree.first.flatMap((e) => [e.p, e.a])),
    final: tree.last[0].p,
  };
}

/** regcomp(REG_EXTENDED | REG_NOSUB) of the pattern bytes: { err } or { nsub, nfa }. */
export function compile(bytes) {
  try {
    const { ast, nsub } = parse(bytes);
    return { err: 0, nsub, nfa: makeTnfa(ast) };
  } catch (e) {
    if (e instanceof ParseError) return { err: e.code };
    throw e;
  }
}

/** regexec(nfa, s, 0, NULL, 0) == 0: tre_tnfa_run_parallel() without tags (s: bytes, no NUL). */
export function matches(nfa, s) {
  const { sets, trans, initial, final } = nfa;
  const n = sets.length, len = s.length;
  const work = (nfa.work ??= { reach: new Int32Array(n), next: new Int32Array(n), seen: new Int32Array(n) });
  const seen = work.seen.fill(-1);
  let reach = work.reach, next = work.next, nr = 0;
  // CHECK_ASSERTIONS() is true when an assertion fails; here: do they all hold at pos?
  const holds = (a, pos, prev, nxt) =>
    !((a & A_BOL && pos > 0) || (a & A_EOL && nxt !== 0) ||
      (a & A_BOW && (WORD[prev] || !WORD[nxt])) || (a & A_EOW && (!WORD[prev] || WORD[nxt])));
  for (let pos = 0; ; ) {
    const prev = pos > 0 ? s[pos - 1] : 0, nxt = pos < len ? s[pos] : 0;
    for (let i = 0; i < initial.length; i += 2) {
      const q = initial[i];
      if (seen[q] === pos || (initial[i + 1] && !holds(initial[i + 1], pos, prev, nxt))) continue;
      if (q === final) return true;
      seen[q] = pos;
      reach[nr++] = q;
    }
    if (pos >= len) return false;
    const c = s[pos++];
    const nxt2 = pos < len ? s[pos] : 0;
    let nn = 0;
    for (let i = 0; i < nr; i++) {
      const q = reach[i];
      if (!sets[q][c]) continue;
      const t = trans[q];
      for (let k = 0; k < t.length; k += 2) {
        const to = t[k];
        if (seen[to] === pos || (t[k + 1] && !holds(t[k + 1], pos, c, nxt2))) continue;
        if (to === final) return true;
        seen[to] = pos;
        next[nn++] = to;
      }
    }
    [reach, next] = [next, reach];
    nr = nn;
  }
}
