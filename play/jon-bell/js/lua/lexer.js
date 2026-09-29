// Lua 5.4 lexer — tokenizer for the NetHack .lua subset.
// Exports: tokenize(source, filename) -> Token[]
//          LuaSyntaxError — thrown on invalid input with line/column info.

const KEYWORDS = new Set([
  'and', 'break', 'do', 'else', 'elseif', 'end', 'false', 'for',
  'function', 'if', 'in', 'local', 'nil', 'not', 'or', 'repeat',
  'return', 'then', 'true', 'until', 'while', 'goto',
]);

export class LuaSyntaxError extends Error {
  constructor(message, line, column, filename) {
    const where = filename ? `${filename}:` : '';
    super(`${where}${line}:${column}: ${message}`);
    this.name = 'LuaSyntaxError';
    this.line = line;
    this.column = column;
    this.filename = filename;
  }
}

// Lua 5.4 llex.c read_string(): the one-character escapes, verbatim.
const SIMPLE_ESCAPES = {
  a: '\x07', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t', v: '\v',
  '\\': '\\', '"': '"', "'": "'",
};

export function tokenize(source, filename) {
  const tokens = [];
  let pos = 0;
  let line = 1;
  let col = 1;

  function syntaxError(msg) {
    throw new LuaSyntaxError(msg, line, col, filename);
  }

  function peek(offset = 0) {
    if (pos + offset >= source.length) return null;
    return source[pos + offset];
  }

  function advance() {
    const ch = source[pos];
    pos++;
    if (ch === '\n') { line++; col = 1; }
    else { col++; }
    return ch;
  }

  function skipWhitespace() {
    while (pos < source.length) {
      const ch = peek();
      if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' ||
          ch === '\v' || ch === '\f') {
        advance();
      } else {
        break;
      }
    }
  }

  // Peek ahead to determine if we're at a long bracket opening.
  // Must be called when peek(0) === '['.
  // Returns eqCount (0 for [[, 1 for [=[, 2 for [==[, etc.) or -1 if not a long bracket.
  // Does NOT consume any characters.
  function peekLongBracketLevel() {
    let i = 1; // start after the first '['
    let eq = 0;
    while (pos + i < source.length && source[pos + i] === '=') {
      eq++;
      i++;
    }
    if (pos + i < source.length && source[pos + i] === '[') {
      return eq;
    }
    return -1;
  }

  // Consume opening long bracket: '[' + eqCount '=' + '['
  // Caller must have verified eqLevel >= 0 via peekLongBracketLevel.
  function consumeLongBracketOpen(eqLevel) {
    advance(); // first '['
    for (let i = 0; i < eqLevel; i++) advance(); // '='s
    advance(); // second '['
  }

  // Read content until matching close bracket: ']' + eqLevel '=' + ']'
  // Returns raw content string.
  function readLongBracketContent(eqLevel) {
    const openLine = line;
    let content = '';
    // Lua 5.4 manual §3.1: "When the opening long bracket is immediately
    // followed by a newline, the newline is not included in the string."
    // (lstring.c's read_long_string: inclinenumber() on the first char if
    // it's \n or \r, consuming a \r\n / \n\r pair as a single newline).
    // des.map's map literal (nethack-c/dat/tut-1.lua/tut-2.lua) opens with
    // `[[` immediately followed by '\n' — without this, mf->hei picks up a
    // spurious leading blank row (keystone-spec-lspo-map.md's tut-1 frontier
    // depends on mf->hei being exactly 18, not 19).
    if (peek() === '\n' || peek() === '\r') {
      const first = advance();
      if ((first === '\n' && peek() === '\r') || (first === '\r' && peek() === '\n'))
        advance();
    }
    while (pos < source.length) {
      const ch = peek();
      if (ch === ']') {
        // Check if this is the matching close
        let closeEq = 0;
        let look = 1;
        while (pos + look < source.length && source[pos + look] === '=' && closeEq < eqLevel) {
          closeEq++;
          look++;
        }
        if (closeEq === eqLevel && pos + look < source.length && source[pos + look] === ']') {
          // Matching close found
          advance(); // ']'
          for (let i = 0; i < eqLevel; i++) advance(); // '='s
          advance(); // final ']'
          return content;
        }
        // Not a match — include ']' in content
        content += advance();
        continue;
      }
      content += advance();
    }
    syntaxError(`unterminated long bracket (opened at line ${openLine})`);
  }

  // Same as readLongBracketContent but discards (for long comments).
  function skipLongBracketContent(eqLevel) {
    const openLine = line;
    while (pos < source.length) {
      const ch = peek();
      if (ch === ']') {
        let closeEq = 0;
        let look = 1;
        while (pos + look < source.length && source[pos + look] === '=' && closeEq < eqLevel) {
          closeEq++;
          look++;
        }
        if (closeEq === eqLevel && pos + look < source.length && source[pos + look] === ']') {
          advance();
          for (let i = 0; i < eqLevel; i++) advance();
          advance();
          return;
        }
        advance();
        continue;
      }
      advance();
    }
    syntaxError(`unterminated long comment (opened at line ${openLine})`);
  }

  function readString(quote) {
    let value = '';
    while (pos < source.length) {
      const ch = peek();
      if (ch === '\n' || ch === '\r') {
        syntaxError('unfinished string');
      }
      if (ch === quote) {
        advance();
        return value;
      }
      if (ch === '\\') {
        // Lua 5.4 llex.c read_string() — decode the escape. This used to be
        // `value += '\\' + advance()`, i.e. the backslash was kept verbatim
        // and every escape reached the interpreter as its own two characters
        // of SOURCE TEXT. hellfill.lua:385
        //     local sel = selection.match("LLL\nLLL\nLLL");
        // therefore built a 13x1 mapfragment spelling `L L L \ n L L L \ n L
        // L L` instead of the 3x3 block of lava it names; nothing matched, so
        // sel:percentage() drew none of C's 715 rn2(100) calls and the
        // level's "Z" (lavawall) terrain was never placed.
        advance();
        const next = peek();
        if (next === null) {
          syntaxError('unfinished string escape');
        }
        if (Object.prototype.hasOwnProperty.call(SIMPLE_ESCAPES, next)) {
          advance();
          value += SIMPLE_ESCAPES[next];
        } else if (next === '\n' || next === '\r') {
          // C: case '\n': case '\r': inclinenumber(ls); c = '\n';
          // A \r\n or \n\r pair counts as one newline.
          const first = advance();
          if ((first === '\n' && peek() === '\r') || (first === '\r' && peek() === '\n'))
            advance();
          value += '\n';
        } else if (next === 'x') {
          // C: readhexaesc() — exactly two hexadecimal digits.
          advance();
          let hex = '';
          for (let i = 0; i < 2; i++) {
            if (!isHexDigit(peek())) syntaxError('hexadecimal digit expected');
            hex += advance();
          }
          value += String.fromCharCode(parseInt(hex, 16));
        } else if (next === 'u') {
          // C: utf8esc() — \u{XXX}, one or more hex digits in braces.
          advance();
          if (peek() !== '{') syntaxError("missing '{' in \\u{xxxx}");
          advance();
          let hex = '';
          while (isHexDigit(peek())) hex += advance();
          if (hex === '') syntaxError('hexadecimal digit expected');
          if (peek() !== '}') syntaxError("missing '}' in \\u{xxxx}");
          advance();
          value += String.fromCodePoint(parseInt(hex, 16));
        } else if (next === 'z') {
          // C: case 'z': skip the following span of whitespace entirely.
          advance();
          while (pos < source.length) {
            const w = peek();
            if (w === ' ' || w === '\t' || w === '\n' || w === '\r' ||
                w === '\v' || w === '\f') advance();
            else break;
          }
        } else if (isDigit(next)) {
          // C: readdecesc() — up to three decimal digits, value <= 255.
          let dec = '';
          while (dec.length < 3 && isDigit(peek())) dec += advance();
          const code = parseInt(dec, 10);
          if (code > 255) syntaxError('decimal escape too large');
          value += String.fromCharCode(code);
        } else {
          syntaxError(`invalid escape sequence '\\${next}'`);
        }
      } else {
        value += advance();
      }
    }
    syntaxError('unfinished string');
  }

  function readNumber(startChar) {
    let num = startChar;

    // Hex: 0x / 0X
    if (startChar === '0' && (peek() === 'x' || peek() === 'X')) {
      num += advance();
      if (!isHexDigit(peek())) {
        syntaxError('malformed hex number');
      }
      while (isHexDigit(peek())) {
        num += advance();
      }
      return num;
    }

    // Integer digits
    while (isDigit(peek())) {
      num += advance();
    }

    // Fractional part: . followed by digit
    if (peek() === '.' && isDigit(peek(1))) {
      num += advance();
      while (isDigit(peek())) {
        num += advance();
      }
    }

    // Exponent
    if (peek() === 'e' || peek() === 'E') {
      num += advance();
      if (peek() === '+' || peek() === '-') {
        num += advance();
      }
      if (!isDigit(peek())) {
        syntaxError('malformed number exponent');
      }
      while (isDigit(peek())) {
        num += advance();
      }
    }

    return num;
  }

  function readIdentifier(startChar) {
    let id = startChar;
    while (pos < source.length && isIdentChar(peek())) {
      id += advance();
    }
    return id;
  }

  // ---------- main loop ----------
  while (pos < source.length) {
    skipWhitespace();
    if (pos >= source.length) break;

    const startLine = line;
    const ch = peek();

    // ---- comments ----
    if (ch === '-' && peek(1) === '-') {
      advance(); advance(); // consume --

      // Check for long comment: -- immediately followed by long bracket
      if (peek() === '[') {
        const eqLevel = peekLongBracketLevel();
        if (eqLevel >= 0) {
          consumeLongBracketOpen(eqLevel);
          skipLongBracketContent(eqLevel);
          continue;
        }
        // Not a long bracket — line comment (--[foo or --=foo)
        // consume rest of line
        while (pos < source.length && peek() !== '\n' && peek() !== '\r') {
          advance();
        }
        continue;
      }

      // Line comment: consume until EOL
      while (pos < source.length && peek() !== '\n' && peek() !== '\r') {
        advance();
      }
      continue;
    }

    // ---- long bracket string, or '[' punctuation ----
    if (ch === '[') {
      const eqLevel = peekLongBracketLevel();
      if (eqLevel >= 0) {
        consumeLongBracketOpen(eqLevel);
        const content = readLongBracketContent(eqLevel);
        tokens.push({ type: 'string', value: content, line: startLine });
        continue;
      }
      // Plain '['
      advance();
      tokens.push({ type: 'punctuation', value: '[', line: startLine });
      continue;
    }

    // ---- strings ----
    if (ch === '"' || ch === "'") {
      advance();
      const value = readString(ch);
      tokens.push({ type: 'string', value, line: startLine });
      continue;
    }

    // ---- numbers ----
    if (isDigit(ch) || (ch === '.' && isDigit(peek(1)))) {
      const num = readNumber(advance());
      tokens.push({ type: 'number', value: num, line: startLine });
      continue;
    }

    // ---- identifiers / keywords ----
    if (isIdentStart(ch)) {
      const id = readIdentifier(advance());
      const type = KEYWORDS.has(id) ? 'keyword' : 'identifier';
      tokens.push({ type, value: id, line: startLine });
      continue;
    }

    // ---- operators / punctuation ----
    switch (ch) {
      case '~':
        advance();
        if (peek() === '=') { advance(); tokens.push({ type: 'punctuation', value: '~=', line: startLine }); }
        else { tokens.push({ type: 'punctuation', value: '~', line: startLine }); }
        break;
      case '=':
        advance();
        if (peek() === '=') { advance(); tokens.push({ type: 'punctuation', value: '==', line: startLine }); }
        else { tokens.push({ type: 'punctuation', value: '=', line: startLine }); }
        break;
      case '<':
        advance();
        if (peek() === '=') { advance(); tokens.push({ type: 'punctuation', value: '<=', line: startLine }); }
        else if (peek() === '<') { advance(); tokens.push({ type: 'punctuation', value: '<<', line: startLine }); }
        else { tokens.push({ type: 'punctuation', value: '<', line: startLine }); }
        break;
      case '>':
        advance();
        if (peek() === '=') { advance(); tokens.push({ type: 'punctuation', value: '>=', line: startLine }); }
        else if (peek() === '>') { advance(); tokens.push({ type: 'punctuation', value: '>>', line: startLine }); }
        else { tokens.push({ type: 'punctuation', value: '>', line: startLine }); }
        break;
      case ':':
        advance();
        if (peek() === ':') { advance(); tokens.push({ type: 'punctuation', value: '::', line: startLine }); }
        else { tokens.push({ type: 'punctuation', value: ':', line: startLine }); }
        break;
      case '.':
        advance();
        if (peek() === '.') {
          advance();
          if (peek() === '.') { advance(); tokens.push({ type: 'punctuation', value: '...', line: startLine }); }
          else { tokens.push({ type: 'punctuation', value: '..', line: startLine }); }
        } else {
          tokens.push({ type: 'punctuation', value: '.', line: startLine });
        }
        break;
      case '/':
        advance();
        if (peek() === '/') { advance(); tokens.push({ type: 'punctuation', value: '//', line: startLine }); }
        else { tokens.push({ type: 'punctuation', value: '/', line: startLine }); }
        break;
      case '|':
        advance();
        tokens.push({ type: 'punctuation', value: '|', line: startLine });
        break;
      case '&':
        advance();
        tokens.push({ type: 'punctuation', value: '&', line: startLine });
        break;
      default:
        if ('+-*%^#(){}];,'.includes(ch)) {
          advance();
          tokens.push({ type: 'punctuation', value: ch, line: startLine });
        } else {
          const bad = advance();
          syntaxError(`unexpected character '${bad}'`);
        }
        break;
    }
  }

  tokens.push({ type: 'eof', value: null, line });
  return tokens;
}

// ---- helpers ----

function isDigit(ch) {
  return ch !== null && ch >= '0' && ch <= '9';
}

function isHexDigit(ch) {
  return ch !== null && ((ch >= '0' && ch <= '9') ||
         (ch >= 'a' && ch <= 'f') || (ch >= 'A' && ch <= 'F'));
}

function isIdentStart(ch) {
  return ch !== null && ((ch >= 'a' && ch <= 'z') ||
         (ch >= 'A' && ch <= 'Z') || ch === '_');
}

function isIdentChar(ch) {
  return ch !== null && ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') ||
         (ch >= '0' && ch <= '9') || ch === '_');
}
