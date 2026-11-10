/* Demand-driven Lua 5.4.8 ZIO/lexer port. A reader is called only when the
 * current chunk is exhausted. Reference lzio.c/llex.c; Lua notice lobject.js.
 * Character access, token lookahead and real lexer buffer changes are explicit.
 */
import { LuaError, byteString, isLuaString, luaStringBytes, numericString, utf8Bytes } from './lua/lobject.js';
import { luaChunkId } from './lua-debug.js';

const reserved = new Set('and break do else elseif end false for function goto if in local nil not or repeat return then true until while'.split(' '));
const digit = c => c !== null && c >= '0' && c <= '9';
const hex = c => c !== null && /^[0-9a-fA-F]$/.test(c);
const alpha = c => c !== null && /^[A-Za-z_]$/.test(c);
const alnum = c => alpha(c) || digit(c);
const space = c => c !== null && /^[ \t\v\f\n\r]$/.test(c);

export class LuaChunkReader {
  constructor(reader) {
    if (typeof reader !== 'function') { let once = false, input = reader; reader = () => once ? null : (once = true, input); }
    this.reader = reader; this.chunk = ''; this.offset = 0; this.eof = false; this.bytesRead = 0; this.calls = 0;
  }
  fill() {
    if (this.eof) return false;
    this.calls++;
    const value = this.reader(this);
    if (value === null || value === undefined) { this.eof = true; return false; }
    if (!(value instanceof Uint8Array) && !isLuaString(value)) throw new TypeError('Lua reader must return bytes, a byte string, or null');
    const chunk = value instanceof Uint8Array ? byteString(value) : luaStringBytes(value);
    if (!chunk.length) { this.eof = true; return false; }
    this.chunk = chunk; this.offset = 0; return true;
  }
  peek() { return this.offset < this.chunk.length || this.fill() ? this.chunk[this.offset] : null; }
  get() { const value = this.peek(); if (value !== null) { this.offset++; this.bytesRead++; } return value; }
  readByte() { const value = this.get(); return value === null ? null : value.charCodeAt(0); }
  readBytes(length) {
    const result = new Uint8Array(length); let at = 0;
    while (at < length) {
      if (this.offset === this.chunk.length && !this.fill()) return null;
      const count = Math.min(length - at, this.chunk.length - this.offset);
      for (let n = 0; n < count; n++) result[at + n] = this.chunk.charCodeAt(this.offset + n);
      this.offset += count; this.bytesRead += count; at += count;
    }
    return result;
  }
}

export class LuaIncrementalLexer {
  constructor(input, name = 'chunk', { onResize = null, onString = null, error = null, capacity = 32 } = {}) {
    this.input = input instanceof LuaChunkReader ? input : new LuaChunkReader(input);
    this.character=this.input.get();this.name = name; this.line = 1; this.buffer = []; this.capacity = capacity;
    this.onResize = onResize; this.onString = onString; this.errorHandler = error; this.tokens = 0;
  }
  get current() { return this.character; }
  next() { const value=this.character;this.character=this.input.get();return value; }
  save(c) {
    if (this.buffer.length + 1 > this.capacity) { const old = this.capacity; this.capacity *= 2; this.onResize?.(this.capacity, old); }
    this.buffer.push(c);
  }
  saveNext() { const c = this.current; this.save(c); this.next(); return c; }
  newline() {
    const first = this.next();
    if ((this.current === '\r' || this.current === '\n') && this.current !== first) this.next();
    this.line++;
    if (this.line >= 0x7fffffff) this.error('chunk has too many lines');
  }
  error(message, near = null) {
    if (this.errorHandler) return this.errorHandler(message, near, this.line, this);
    if(message?.format){let n=0;message=message.format.replace(/%[sd]/g,()=>String(message.args[n++]));}
    const error = new LuaError(`${luaChunkId(this.name)}:${this.line}: ${message}${near === null ? '' : ` near ${near}`}`);
    error.status = 3; throw error;
  }
  textNear() { return "'" + this.buffer.join('') + "'"; }
  stringToken(value, line, kind = 'string') { const allocationString = this.onString?.(value, kind); return { type: kind === 'name' ? reserved.has(value) ? value : 'name' : 'string', value, line, endline: this.line, allocationString }; }
  separator() {
    const delimiter = this.current; this.saveNext(); let count = 0;
    while (this.current === '=') { this.saveNext(); count++; }
    return this.current === delimiter ? count + 2 : count === 0 ? 1 : 0;
  }
  longString(sep, comment, line) {
    this.saveNext();
    if (this.current === '\r' || this.current === '\n') this.newline();
    while (true) {
      const c = this.current;
      if (c === null) this.error({format:'unfinished long %s (starting at line %d)',args:[comment?'comment':'string',line]}, '<eof>');
      if (c === ']') { if (this.separator() === sep) { this.saveNext(); break; } }
      else if (c === '\r' || c === '\n') { this.save('\n'); this.newline(); if (comment) this.buffer.length = 0; }
      else if (comment) this.next(); else this.saveNext();
    }
    if (comment) return null;
    return this.stringToken(this.buffer.slice(sep, -sep).join(''), line);
  }
  escapeCheck(valid, message) { if (!valid) { if (this.current !== null) this.saveNext(); this.error(message, this.textNear()); } }
  getHex() { this.saveNext(); this.escapeCheck(hex(this.current), 'hexadecimal digit expected'); return Number.parseInt(this.current, 16); }
  quoted(line) {
    const delimiter = this.saveNext();
    while (this.current !== delimiter) {
      let c = this.current;
      if (c === null) this.error('unfinished string', '<eof>');
      if (c === '\r' || c === '\n') this.error('unfinished string', this.textNear());
      if (c !== '\\') { this.saveNext(); continue; }
      this.saveNext(); c = this.current;
      const escapes = { a: '\x07', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t', v: '\v', '\\': '\\', '"': '"', "'": "'" };
      if (Object.hasOwn(escapes, c)) { this.next(); this.buffer.pop(); this.save(escapes[c]); }
      else if (c === 'x') { const value = this.getHex() * 16 + this.getHex(); this.buffer.length -= 2; this.next(); this.buffer.pop(); this.save(String.fromCharCode(value)); }
      else if (c === 'u') {
        this.saveNext(); this.escapeCheck(this.current === '{', "missing '{'");
        let value = this.getHex(), count = 4;
        while (true) { this.saveNext(); if (!hex(this.current)) break; count++; this.escapeCheck(value <= 0x7ffffff, 'UTF-8 value too large'); value = value * 16 + Number.parseInt(this.current, 16); }
        this.escapeCheck(this.current === '}', "missing '}'"); this.next(); this.buffer.length -= count;
        for (const byte of utf8Bytes(value)) this.save(byte);
      } else if (c === '\n' || c === '\r') { this.newline(); this.buffer.pop(); this.save('\n'); }
      else if (c === 'z') { this.buffer.pop(); this.next(); while (space(this.current)) { if (this.current === '\r' || this.current === '\n') this.newline(); else this.next(); } }
      else if (digit(c)) {
        let value = 0, count = 0; while (count < 3 && digit(this.current)) { value = value * 10 + Number(this.current); this.saveNext(); count++; }
        this.escapeCheck(value <= 255, 'decimal escape too large'); this.buffer.length -= count; this.buffer.pop(); this.save(String.fromCharCode(value));
      } else this.escapeCheck(false, 'invalid escape sequence');
    }
    this.saveNext(); return this.stringToken(this.buffer.slice(1, -1).join(''), line);
  }
  numeral(line) {
    let exponent = 'Ee'; const first = this.current; this.saveNext();
    if (first === '0' && (this.current === 'x' || this.current === 'X')) { this.saveNext(); exponent = 'Pp'; }
    while (true) {
      const c = this.current;
      if (c !== null && exponent.includes(c)) { this.saveNext(); if (this.current === '+' || this.current === '-') this.saveNext(); }
      else if (hex(c) || c === '.') this.saveNext(); else break;
    }
    if (alpha(this.current)) this.saveNext();
    this.save('\0'); const text = this.buffer.slice(0, -1).join(''), value = numericString(text);
    if (value === null) this.error('malformed number', "'" + text + "'");
    return { type: 'number', value, line, endline: this.line };
  }
  nextToken() {
    this.buffer.length = 0;
    while (true) {
      const c = this.current, line = this.line;
      if (c === null) return { type: 'eof', value: 'eof', line, endline: line };
      if (c === '\r' || c === '\n') { this.newline(); continue; }
      if (space(c)) { this.next(); continue; }
      if (c === '-') {
        this.next(); if (this.current !== '-') return { type: '-', value: '-', line, endline: line };
        this.next();
        if (this.current === '[') { const sep = this.separator(); this.buffer.length = 0; if (sep >= 2) { this.longString(sep, true, line); this.buffer.length = 0; continue; } }
        while (this.current !== null && this.current !== '\r' && this.current !== '\n') this.next();
        continue;
      }
      if (c === '[') { const sep = this.separator(); if (sep >= 2) return this.longString(sep, false, line); if (sep === 0) this.error('invalid long string delimiter', this.textNear()); return { type: '[', value: '[', line, endline: line }; }
      if (c === '"' || c === "'") return this.quoted(line);
      if (digit(c)) return this.numeral(line);
      if (alpha(c)) { do this.saveNext(); while (alnum(this.current)); return this.stringToken(this.buffer.join(''), line, 'name'); }
      if (c === '.') {
        this.saveNext(); if (this.current === '.') { this.saveNext(); if (this.current === '.') { this.saveNext(); return { type: '...', value: '...', line, endline: line }; } return { type: '..', value: '..', line, endline: line }; }
        if (digit(this.current)) return this.numeralAfterDot(line);
        return { type: '.', value: '.', line, endline: line };
      }
      this.next(); let type = c;
      if (['=', '<', '>', '~'].includes(c) && this.current === '=') type += this.next();
      else if (['<', '>', '/', ':'].includes(c) && this.current === c) type += this.next();
      return { type, value: type, line, endline: line };
    }
  }
  numeralAfterDot(line) {
    // read_numeral normally saves its first character itself; '.' is already
    // in the buffer, so preserve it while consuming the remaining digits.
    const token = this.numeral(line); return token;
  }
}

export function createLuaTokenStream(lexer, onToken = null) {
  const values = []; let eof = false;
  const ensure = index => { while (!eof && values.length <= index) { const token = lexer.nextToken(); values.push(token); onToken?.(token, values.length - 1); eof = token.type === 'eof'; } return values[Math.min(index, values.length - 1)]; };
  return new Proxy(values, { get(target, key, receiver) {
    if (typeof key === 'string' && /^(0|[1-9][0-9]*)$/.test(key)) return ensure(Number(key));
    if (key === 'findIndex') return predicate => { for (let n = 0; ; n++) { const token = ensure(n); if (predicate(token, n)) return n; if (token.type === 'eof') return -1; } };
    return Reflect.get(target, key, receiver);
  } });
}
