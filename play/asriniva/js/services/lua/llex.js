/* Lua 5.4.8 lexical migration. Reference llex.c; notice in lobject.js. */
import { LuaError, numericString, utf8Bytes, byteString } from './lobject.js';

const keywords = new Set('and break do else elseif end false for function goto if in local nil not or repeat return then true until while'.split(' '));
export class LexState {
  constructor(source, name = 'chunk') {
    this.source = source instanceof Uint8Array ? byteString(source) : source;
    if (typeof this.source !== 'string') throw new TypeError('Lua source must be byte string or Uint8Array');
    this.at = 0; this.line = 1; this.name = name; this.tokens = [];
  }
  error(message) { throw new LuaError(`${this.name}:${this.line}: ${message}`); }
  newline() {
    const first = this.source[this.at++];
    if (/[\r\n]/.test(this.source[this.at] ?? '') && this.source[this.at] !== first) this.at++;
    this.line++;
  }
  longDelimiter(at) { return /^\[(=*)\[/.exec(this.source.slice(at)); }
  longString() {
    const open = this.longDelimiter(this.at); this.at += open[0].length;
    if (/[\r\n]/.test(this.source[this.at] ?? '')) this.newline();
    const close = ']' + open[1] + ']'; let text = '';
    while (this.at < this.source.length && !this.source.startsWith(close, this.at)) {
      if (/[\r\n]/.test(this.source[this.at])) { this.newline(); text += '\n'; }
      else text += this.source[this.at++];
    }
    if (this.at === this.source.length) this.error('unfinished long string/comment');
    this.at += close.length; return text;
  }
  quoted() {
    const quote = this.source[this.at++]; let text = '';
    const escapes = { a: '\x07', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t', v: '\v', '\\': '\\', '"': '"', "'": "'" };
    while (this.at < this.source.length && this.source[this.at] !== quote) {
      let c = this.source[this.at++];
      if (c === '\n' || c === '\r') this.error('unfinished string');
      if (c !== '\\') { text += c; continue; }
      c = this.source[this.at++];
      if (c in escapes) text += escapes[c];
      else if (c === 'z') {
        while (/[ \t\n\r\v\f]/.test(this.source[this.at] ?? '')) {
          if (/[\r\n]/.test(this.source[this.at])) this.newline(); else this.at++;
        }
      } else if (c === '\n' || c === '\r') { this.at--; this.newline(); text += '\n'; }
      else if (c === 'x') {
        const hex = this.source.slice(this.at, this.at + 2);
        if (!/^[\da-fA-F]{2}$/.test(hex)) this.error('hexadecimal digit expected');
        this.at += 2; text += String.fromCharCode(parseInt(hex, 16));
      } else if (c === 'u') {
        const unicode = /^\{([\da-fA-F]+)}/.exec(this.source.slice(this.at));
        if (!unicode) this.error('invalid UTF-8 escape');
        this.at += unicode[0].length; text += utf8Bytes(parseInt(unicode[1], 16));
      } else if (/\d/.test(c ?? '')) {
        const rest = /^\d{0,2}/.exec(this.source.slice(this.at))[0]; this.at += rest.length;
        const byte = Number(c + rest); if (byte > 255) this.error('decimal escape too large');
        text += String.fromCharCode(byte);
      } else this.error('invalid escape sequence');
    }
    if (this.source[this.at++] !== quote) this.error('unfinished string');
    return text;
  }
  scan() {
    const s = this.source;
    while (this.at < s.length) {
      const c = s[this.at];
      if (c === '\n' || c === '\r') { this.newline(); continue; }
      if (/[ \t\n\r\v\f]/.test(c)) { this.at++; continue; }
      if (s.startsWith('--', this.at)) {
        this.at += 2;
        if (this.longDelimiter(this.at)) this.longString();
        else while (this.at < s.length && !/[\r\n]/.test(s[this.at])) this.at++;
        continue;
      }
      const line = this.line;
      if (c === '"' || c === "'") { this.tokens.push({ type: 'string', value: this.quoted(), line }); continue; }
      if (c === '[' && this.longDelimiter(this.at)) { this.tokens.push({ type: 'string', value: this.longString(), line }); continue; }
      if (/\d/.test(c) || (c === '.' && /\d/.test(s[this.at + 1] ?? ''))) {
        const literal = /^(?:0[xX][\da-fA-F]*(?:\.[\da-fA-F]*)?(?:[pP][+-]?\d+)?|(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)/.exec(s.slice(this.at))[0];
        const value = numericString(literal);
        if (value === null || /[\w.]/.test(s[this.at + literal.length] ?? '')) this.error('malformed number');
        this.at += literal.length; this.tokens.push({ type: 'number', value, line }); continue;
      }
      if (/[A-Za-z_]/.test(c)) {
        const name = /^[A-Za-z_]\w*/.exec(s.slice(this.at))[0]; this.at += name.length;
        this.tokens.push({ type: keywords.has(name) ? name : 'name', value: name, line }); continue;
      }
      const punctuation = /^(?:\.\.\.|\.\.|\/\/|==|~=|<=|>=|<<|>>|::)/.exec(s.slice(this.at))?.[0] ?? c;
      this.at += punctuation.length;
      this.tokens.push({ type: punctuation, value: punctuation, line });
    }
    this.tokens.push({ type: 'eof', value: 'eof', line: this.line });
    return this.tokens;
  }
}
