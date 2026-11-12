/* Standalone POSIX ERE boolean-matching service for NetHack's configured
 * REG_EXTENDED|REG_NOSUB, C-locale Emscripten musl regex interface.
 *
 * Parser/compatibility rules are adapted from musl's TRE regcomp.c/regexec.c:
 * Copyright (c) 2001-2009 Ville Laurikari <vl@iki.fi>. All rights reserved.
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 * 1. Redistributions of source code must retain the above copyright notice,
 *    this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDER AND CONTRIBUTORS ``AS IS''
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 *
 * Uses its own parser and position NFA, not JavaScript RegExp matching.
 * Inputs are Uint8Array or byte strings (each JS code unit must be <=255);
 * embedded NUL terminates a C string. TextEncoder is the caller's choice for
 * converting Unicode to UTF-8. In musl's C locale, bytes 128..255 map to
 * surrogate code units 0xdf80..0xdfff, not Unicode scalars.
 *
 * Scope: exactly compile flags 9; no BRE, capture offsets, UTF-8 locale,
 * REG_ICASE or REG_NEWLINE. Unsupported flags throw, rather than silently
 * changing semantics. ERE \1 is literal '1' in the reference (BRE alone has
 * backreferences). NFA expansion is bounded at one million states or
 * transitions and parser nesting is capped at ten thousand groups. Resource
 * exhaustion returns REG_ESPACE, without claiming identical native allocation
 * thresholds. No host, Node, Wasm, filesystem or network dependency.
 */

export const REG_EXTENDED = 1, REG_ICASE = 2, REG_NEWLINE = 4, REG_NOSUB = 8;
export const REG_NOTBOL = 1, REG_NOTEOL = 2;
export const REG_OK = 0, REG_NOMATCH = 1, REG_BADPAT = 2, REG_ECOLLATE = 3;
export const REG_ECTYPE = 4, REG_EESCAPE = 5, REG_ESUBREG = 6, REG_EBRACK = 7;
export const REG_EPAREN = 8, REG_EBRACE = 9, REG_BADBR = 10, REG_ERANGE = 11;
export const REG_ESPACE = 12, REG_BADRPT = 13;

const messages = ['No error', 'No match', 'Invalid regexp',
  'Unknown collating element', 'Unknown character class name',
  'Trailing backslash', 'Invalid back reference', "Missing ']'", "Missing ')'",
  "Missing '}'", 'Invalid contents of {}', 'Invalid character range',
  'Out of memory', 'Repetition not preceded by valid expression'];
export function posixRegexError(code) { return messages[code] ?? 'Unknown error'; }
const nativeMessages = ['no explanation','regexec() failed to match','invalid regular expression',
  'invalid collating element','invalid character class','trailing backslash (\\)',
  'invalid backreference number','brackets ([ ]) not balanced','parentheses not balanced',
  'braces not balanced','invalid repetition count(s)','invalid character range','out of memory',
  'repetition-operator operand invalid','empty (sub)expression','"can\'t happen" -- you found a bug',
  'invalid argument to regex routine','illegal byte sequence','maximum repetition exceeds 255'];
export function nativeRegexError(code) {
  if (code & 256) return 'REG_0x' + ((code & ~256) >>> 0).toString(16);
  return nativeMessages[code] ?? '*** unknown regexp error code ***';
}

const handles = new WeakMap();
const EMPTY = Object.freeze({ kind: 'empty' });
const MAX_STATES = 1000000;
const CLASS_NAMES = new Set(['alnum', 'alpha', 'blank', 'cntrl', 'digit',
  'graph', 'lower', 'print', 'punct', 'space', 'upper', 'xdigit']);
const codeUnit = byte => byte < 128 ? byte : 0xdf00 | byte;
const alpha = c => c >= 65 && c <= 90 || c >= 97 && c <= 122;
const digit = c => c >= 48 && c <= 57;
const word = c => c === 95 || alpha(c) || digit(c);
function inClass(c, name) {
  switch (name) {
    case 'alnum': return alpha(c) || digit(c);
    case 'alpha': return alpha(c);
    case 'blank': return c === 32 || c === 9;
    case 'cntrl': return c < 32 || c === 127;
    case 'digit': return digit(c);
    case 'graph': return c >= 33 && c <= 126;
    case 'lower': return c >= 97 && c <= 122;
    case 'print': return c >= 32 && c <= 126;
    case 'punct': return c >= 33 && c <= 126 && !alpha(c) && !digit(c);
    case 'space': return c === 32 || c >= 9 && c <= 13;
    case 'upper': return c >= 65 && c <= 90;
    case 'xdigit': return digit(c) || c >= 65 && c <= 70 || c >= 97 && c <= 102;
    default: return false;
  }
}

function cBytes(input) {
  if (typeof input === 'string') {
    const bytes = [];
    for (let i = 0; i < input.length; ++i) {
      const c = input.charCodeAt(i);
      if (c > 255) throw new TypeError('Expected a byte string; encode Unicode explicitly');
      if (!c) break;
      bytes.push(c);
    }
    return Uint8Array.from(bytes);
  }
  if (!(input instanceof Uint8Array)) throw new TypeError('Expected Uint8Array or byte string');
  const end = input.indexOf(0);
  return input.subarray(0, end < 0 ? input.length : end);
}

class CompileError extends Error {
  constructor(code) { super(posixRegexError(code)); this.code = code; }
}
const fail = code => { throw new CompileError(code); };
const character = (ranges, classes = [], negate = false) => ({ kind: 'char', ranges, classes, negate });
const literal = c => character([[c, c]]);
function branch(parts) { return parts.length ? parts.length === 1 ? parts[0] : { kind: 'concat', parts } : EMPTY; }
function alternative(parts) { return parts.length === 1 ? parts[0] : { kind: 'alt', parts }; }

class Parser {
  constructor(bytes, native = false) { this.bytes = bytes; this.at = 0; this.groups = 0; this.native = native; }
  peek(n = 0) { return this.bytes[this.at + n] || 0; }
  bracket() {
    let negate = false;
    if (this.peek() === 94) { negate = true; ++this.at; }
    const start = this.at, ranges = [], classes = [];
    while (true) {
      const b = this.peek();
      if (!b) fail(REG_EBRACK);
      if (b === 93 && this.at !== start) { ++this.at; return character(ranges, classes, negate); }
      if (b === 45 && this.at !== start && this.peek(1) !== 93
          && (this.peek(1) !== 45 || this.peek(2) === 93)) fail(REG_ERANGE);
      if (b === 91 && (this.peek(1) === 46 || this.peek(1) === 61)) fail(REG_ECOLLATE);
      if (b === 91 && this.peek(1) === 58) {
        this.at += 2;
        let name = '';
        while (this.peek() && this.peek() !== 58 && name.length < 14)
          name += String.fromCharCode(this.bytes[this.at++]);
        if (!CLASS_NAMES.has(name) || this.peek() !== 58 || this.peek(1) !== 93) fail(REG_ECTYPE);
        this.at += 2; classes.push(name);
        if (negate && classes.length > 64) fail(REG_ESPACE);
      } else {
        const min = codeUnit(this.bytes[this.at++]);
        let max = min;
        if (this.peek() === 45 && this.peek(1) !== 93) {
          ++this.at;
          if (!this.peek()) fail(REG_ERANGE);
          max = codeUnit(this.bytes[this.at++]);
          if (min > max) fail(REG_ERANGE);
        }
        ranges.push([min, max]);
      }
      if (ranges.length + classes.length > 32768) fail(REG_ESPACE);
    }
  }
  atom() {
    const b = this.bytes[this.at++];
    if (b === 91) return this.bracket();
    if (b === 46) return character([[0, 0x10ffff]]);
    if (b === 94 || b === 36) return { kind: 'assert', assertion: b === 94 ? 'bol' : 'eol' };
    if (b === 42 || b === 43 || b === 63 || b === 123 && (!this.native || digit(this.peek()))) fail(REG_BADRPT);
    if (b !== 92) return literal(codeUnit(b));
    const escaped = this.bytes[this.at++];
    if (!escaped) fail(REG_EESCAPE);
    if (this.native) return literal(codeUnit(escaped));
    const macros = { 116: 9, 110: 10, 114: 13, 102: 12, 97: 7, 101: 27 };
    if (macros[escaped] !== undefined) return literal(macros[escaped]);
    if (escaped === 119 || escaped === 87) return character([[95, 95]], ['alnum'], escaped === 87);
    if (escaped === 115 || escaped === 83) return character([], ['space'], escaped === 83);
    if (escaped === 100 || escaped === 68) return character([], ['digit'], escaped === 68);
    const assertions = { 98: 'wb', 66: 'nwb', 60: 'bow', 62: 'eow' };
    if (assertions[escaped]) return { kind: 'assert', assertion: assertions[escaped] };
    if (escaped === 120) {
      const braces = this.peek() === 123;
      if (braces) ++this.at;
      let v = 0;
      for (let i = 0; i < (braces ? 8 : 2) && v < 0x110000; ++i) {
        const c = this.peek();
        const hex = c >= 48 && c <= 57 ? c - 48 : c >= 65 && c <= 70 ? c - 55 : c >= 97 && c <= 102 ? c - 87 : -1;
        if (hex < 0) break;
        v = 16 * v + hex; ++this.at;
      }
      if (braces && this.bytes[this.at++] !== 125) fail(REG_EBRACE);
      return literal(v);
    }
    return literal(codeUnit(escaped));
  }
  repetitions(node) {
    while ([42, 43, 63, 123].includes(this.peek())) {
      if (this.native && this.peek() === 123 && !digit(this.peek(1))) break;
      const b = this.bytes[this.at++];
      let min = b === 43 ? 1 : 0, max = b === 63 ? 1 : -1;
      if (b === 123) {
        const count = () => {
          if (!digit(this.peek())) return -1;
          let value = 0;
          while (digit(this.peek())) {
            value = 10 * value + this.bytes[this.at++] - 48;
            if (value > 255) break;
          }
          return value;
        };
        min = count(); max = this.peek() === 44 ? (++this.at, count()) : min;
        if (this.native && (min > 255 || max > 255)) fail(18);
        if (min < 0 || min > 255 || max > 255 || max >= 0 && max < min || this.bytes[this.at++] !== 125)
          fail(REG_BADBR);
      }
      node = max === 0 ? EMPTY : { kind: 'repeat', child: node, min, max };
      if (this.native && [42,43,63,123].includes(this.peek())) fail(REG_BADRPT);
    }
    return node;
  }
  parse() {
    const stack = [];
    let parts = [], choices = [];
    while (true) {
      const b = this.peek();
      if (b === 40) {
        ++this.at; ++this.groups;
        stack.push({ parts, choices }); parts = []; choices = [];
        if (stack.length > 10000) fail(REG_ESPACE);
      } else if (!b || b === 124 || b === 41 && stack.length) {
        if (this.native && !parts.length && !(b===41 && stack.length && !choices.length)) {
          if (!b && stack.length) fail(REG_EPAREN);
          fail(14);
        }
        choices.push(branch(parts)); parts = [];
        if (b === 124) { ++this.at; continue; }
        const result = alternative(choices);
        if (!b) {
          if (stack.length) fail(REG_EPAREN);
          return result;
        }
        ++this.at;
        ({ parts, choices } = stack.pop());
        parts.push(this.repetitions(result));
      } else parts.push(this.repetitions(this.atom()));
    }
  }
}

// Follow musl's nullable/first/last-position construction. A generic Thompson
// NFA has different behavior when nullable alternatives contain assertions:
// TRE selects the first nullable branch for an empty path, and collects the
// assertions even when a nullable iteration could instead be skipped.
function compileNfa(root) {
  const states = [];
  let transitions = 0;
  const add = state => {
    if (states.length >= MAX_STATES) fail(REG_ESPACE);
    states.push(state); return states.length - 1;
  };
  const empty = () => ({ nullable: true, empty: 0, first: [], last: [] });
  function connect(left, right) {
    for (const from of left) for (const to of right) {
      if (++transitions > MAX_STATES) fail(REG_ESPACE);
      states[from.id].out.push({ id: to.id, assertions: from.assertions | to.assertions });
    }
  }
  const withAssertions = (positions, assertions) => positions.map(p => ({ id: p.id, assertions: p.assertions | assertions }));
  function concat(left, right) {
    connect(left.last, right.first);
    return { nullable: left.nullable && right.nullable, empty: left.empty | right.empty,
      first: left.nullable ? [...withAssertions(right.first, left.empty), ...left.first] : left.first,
      last: right.nullable ? [...withAssertions(left.last, right.empty), ...right.last] : right.last };
  }
  function union(left, right) {
    return { nullable: left.nullable || right.nullable, empty: left.nullable ? left.empty : right.empty,
      first: [...left.first, ...right.first], last: [...left.last, ...right.last] };
  }
  function iteration(child, min, max) {
    if (max < 0) connect(child.last, child.first);
    return { ...child, nullable: min === 0 || child.nullable, empty: child.nullable ? child.empty : 0 };
  }
  function emit(node) {
    switch (node.kind) {
      case 'empty': return empty();
      case 'assert': return { ...empty(), empty: ASSERTIONS[node.assertion] };
      case 'char': {
        const id = add({ ...node, out: [] }), position = { id, assertions: 0 };
        return { nullable: false, empty: 0, first: [position], last: [position] };
      }
      case 'concat': return node.parts.map(emit).reduce(concat);
      case 'alt': return node.parts.map(emit).reduce(union);
      case 'repeat': {
        if (node.min <= 1 && node.max <= 1) return iteration(emit(node.child), node.min, node.max);
        let required = null, optional = null;
        for (let i = 0; i < node.min; ++i) {
          const copy = emit(node.child);
          required = required ? concat(required, copy) : copy;
        }
        if (node.max < 0) optional = iteration(emit(node.child), 0, -1);
        else for (let i = node.min; i < node.max; ++i) {
          const copy = emit(node.child);
          optional = union(empty(), optional ? concat(copy, optional) : copy);
        }
        return required ? optional ? concat(required, optional) : required : optional;
      }
      default: throw new Error('Invalid regex AST node');
    }
  }
  const body = emit(root), final = add({ kind: 'match', out: [] });
  const finalPosition = { id: final, assertions: 0 };
  const result = concat(body, { nullable: false, empty: 0, first: [finalPosition], last: [finalPosition] });
  return { states, initial: result.first, final };
}

const ASSERTIONS = { bol: 1, eol: 2, bow: 16, eow: 32, wb: 64, nwb: 128 };

/** Compile configured ERE bytes. Returns {status, handle, error}; handle is
 * opaque and null on failure. Compilation never retains caller byte storage. */
export function compilePosixRegex(pattern, flags = REG_EXTENDED | REG_NOSUB, native = false) {
  if (flags !== (REG_EXTENDED | REG_NOSUB))
    throw new RangeError('Only configured REG_EXTENDED|REG_NOSUB (9) is supported');
  const bytes = cBytes(pattern);
  try {
    const parser = new Parser(bytes, native), root = parser.parse();
    const compiled = compileNfa(root), handle = Object.freeze({});
    handles.set(handle, { ...compiled, groups: parser.groups });
    return { status: REG_OK, handle, error: posixRegexError(REG_OK) };
  } catch (error) {
    if (error instanceof CompileError || error instanceof RangeError)
      return { status: error.code ?? REG_ESPACE, handle: null,
        error: posixRegexError(error.code ?? REG_ESPACE) };
    throw error;
  }
}

function assertionMatches(name, pos, bytes, flags) {
  const before = pos ? codeUnit(bytes[pos - 1]) : 0;
  const after = pos < bytes.length ? codeUnit(bytes[pos]) : 0;
  switch (name) {
    case 'bol': return pos === 0 && !(flags & REG_NOTBOL);
    case 'eol': return pos === bytes.length && !(flags & REG_NOTEOL);
    case 'bow': return !word(before) && word(after);
    case 'eow': return word(before) && !word(after);
    // musl's extension treats start/end as boundaries independently of word
    // character classification. This differs from JS's built-in \b/\B.
    case 'wb': return pos === 0 || pos === bytes.length || word(before) !== word(after);
    case 'nwb': return pos !== 0 && pos !== bytes.length && word(before) === word(after);
    default: return false;
  }
}
function assertionsMatch(mask, pos, bytes, flags) {
  for (const name in ASSERTIONS)
    if ((mask & ASSERTIONS[name]) && !assertionMatches(name, pos, bytes, flags)) return false;
  return true;
}
function characterMatches(state, c) {
  let result = state.ranges.some(([lo, hi]) => c >= lo && c <= hi)
    || state.classes.some(name => inClass(c, name));
  return state.negate ? !result : result;
}

/** Return REG_OK or REG_NOMATCH; no offsets are produced in REG_NOSUB mode.
 * Freed/foreign handles return REG_BADPAT; native use-after-free is undefined. */
export function execPosixRegex(handle, text, flags = 0) {
  if (!Number.isInteger(flags) || flags < 0 || flags & ~(REG_NOTBOL | REG_NOTEOL))
    throw new RangeError('Unsupported regex execution flags');
  const compiled = handles.get(handle);
  if (!compiled) return REG_BADPAT;
  const bytes = cBytes(text), { states, initial, final } = compiled;
  let active = new Set();
  for (let pos = 0; pos <= bytes.length; ++pos) {
    for (const position of initial)
      if (assertionsMatch(position.assertions, pos, bytes, flags)) active.add(position.id);
    if (active.has(final)) return REG_OK;
    const next = new Set();
    if (pos < bytes.length) for (const id of active) {
      const state = states[id];
      if (characterMatches(state, codeUnit(bytes[pos]))) for (const transition of state.out)
        if (assertionsMatch(transition.assertions, pos + 1, bytes, flags)) next.add(transition.id);
    }
    active = next;
  }
  return REG_NOMATCH;
}

export function matchPosixRegex(handle, text, flags = 0) { return execPosixRegex(handle, text, flags) === REG_OK; }
export function freePosixRegex(handle) { return handles.delete(handle); }
