/*
 * Standalone terminfo services for NetHack's TERMINFO/TERMLIB interface.
 * This is a JavaScript implementation, not a wrapper for ncurses or Wasm.
 * Binary layout and compatibility behavior were checked against ncurses 6.5
 * read_entry.c, lib_termcap.c, lib_tparm.c, lib_tputs.c and trim_sgr0.c.
 * See terminfo-data.js for the ncurses permission notice and pinned-data source.
 *
 * Scope: compiled little-endian terminfo (16/32-bit numbers), standard/extended
 * capability lookup, terminfo stack expressions, and callback byte output.
 * There is no terminal discovery, host environment/TTY access, curses renderer,
 * source-text termcap parser, or baud-rate pad-byte generation. Delay requests
 * are exposed through an optional callback; the default replay sink is untimed.
 * tgetent compatibility fixups cover the pinned xterm entry; arbitrary entries
 * do not claim ncurses' complete setupterm/trim_sgr0/postprocessing behavior.
 */
import { BOOLEAN_CODES, NUMBER_CODES, STRING_CODES, pinnedXterm256color } from './data.js';

const indexes = codes => new Map(codes.map((code, index) => [code, index]));
const boolIndex = indexes(BOOLEAN_CODES);
const numIndex = indexes(NUMBER_CODES);
const strIndex = indexes(STRING_CODES);

/** Decode byte strings losslessly; TextDecoder's UTF-8 semantics are unsuitable. */
function byteString(bytes, begin, end) {
  let result = '';
  for (let i = begin; i < end; i++) result += String.fromCharCode(bytes[i]);
  return result;
}

/** Strict input validation is intentional: malformed entries throw RangeError. */
export function parseTerminfo(bytes) {
  if (!(bytes instanceof Uint8Array)) throw new TypeError('terminfo entry must be Uint8Array');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let at = 0;
  const requireBytes = n => {
    if (n < 0 || at + n > bytes.length) throw new RangeError(`truncated terminfo entry at ${at}`);
  };
  const short = () => { requireBytes(2); const n = view.getInt16(at, true); at += 2; return n; };
  const number = width => {
    requireBytes(width);
    const n = width === 4 ? view.getInt32(at, true) : view.getInt16(at, true);
    at += width;
    return n;
  };
  const block = n => { requireBytes(n); const start = at; at += n; return bytes.subarray(start, at); };
  const align = () => { if (at % 2) block(1); };
  const counts = n => Array.from({ length: n }, () => {
    const value = short();
    if (value < 0) throw new RangeError('negative terminfo section length');
    return value;
  });
  const readString = (table, offset, required = false) => {
    if (offset === -1 || offset === -2) {
      if (required) throw new RangeError('missing extended capability name');
      return null;
    }
    if (offset < 0 || offset >= table.length) throw new RangeError('invalid terminfo string offset');
    const end = table.indexOf(0, offset);
    if (end < 0 || (required && end === offset)) throw new RangeError('unterminated/empty terminfo string');
    return byteString(table, offset, end);
  };
  const magic = short();
  if (magic !== 0x11a && magic !== 0x21e) throw new RangeError('unsupported terminfo magic');
  const width = magic === 0x21e ? 4 : 2;
  const [nameSize, boolCount, numCount, strCount, strSize] = counts(5);
  if (boolCount > BOOLEAN_CODES.length || numCount > NUMBER_CODES.length || strCount > STRING_CODES.length)
    throw new RangeError('unsupported standard capability count');
  const rawNames = block(nameSize);
  if (!rawNames.length || rawNames.at(-1) !== 0) throw new RangeError('unterminated terminal names');
  const nameList = byteString(rawNames, 0, rawNames.length - 1).split('|');
  // The final pipe-separated item is the human-readable terminal description.
  const names = nameList.length > 1 ? nameList.slice(0, -1) : nameList;
  if (names.some(name => !name)) throw new RangeError('empty terminal name');
  const booleans = Array.from(block(boolCount), value => value === 1 ? 1 : 0);
  align();
  const numbers = Array.from({ length: numCount }, () => number(width));
  const offsets = Array.from({ length: strCount }, short);
  const table = block(strSize);
  const strings = offsets.map(offset => readString(table, offset));
  const extended = { booleans: new Map(), numbers: new Map(), strings: new Map() };
  if (at < bytes.length) {
    align();
    if (at < bytes.length) {
      const [bc, nc, sc, usage, size] = counts(5);
      const total = bc + nc + sc;
      if (usage < total || usage > total + sc) throw new RangeError('inconsistent extended offset count');
      const bs = Array.from(block(bc), value => value === 1 ? 1 : 0);
      align();
      const ns = Array.from({ length: nc }, () => number(width));
      const os = Array.from({ length: sc + total }, short);
      const extTable = block(size);
      const ss = os.slice(0, sc).map(offset => readString(extTable, offset));
      // Modern tic counts names plus present values. The pinned macOS writer
      // counted absent slots too. ncurses intentionally disables an equality
      // check here; accept both conventions while retaining all offset slots.
      // Extended name offsets are relative to the end of the value strings.
      const nameBase = ss.reduce((sum, value) => sum + (value === null ? 0 : value.length + 1), 0);
      const extNames = os.slice(sc).map(offset => readString(extTable.subarray(nameBase), offset, true));
      for (let i = 0; i < bc; i++) extended.booleans.set(extNames[i], bs[i]);
      for (let i = 0; i < nc; i++) extended.numbers.set(extNames[bc + i], ns[i]);
      for (let i = 0; i < sc; i++) extended.strings.set(extNames[bc + nc + i], ss[i]);
      if (at !== bytes.length) throw new RangeError('trailing terminfo data');
    }
  }
  return { names, description: nameList.at(-1), booleans, numbers, strings, extended, numberWidth: width };
}

function capCode(id) {
  // ncurses termcap calls match exactly the first two bytes, even for longer IDs.
  return typeof id === 'string' && id.length >= 2 && !id.slice(0, 2).includes('\0') ? id.slice(0, 2) : null;
}

function formatValue(value, flags, widthText, precisionText, conversion) {
  const width = Number(widthText || 0);
  const precision = precisionText === undefined ? undefined : Number(precisionText || 0);
  if (width > 10000 || (precision ?? 0) > 10000) throw new RangeError('terminfo format too wide');
  if (conversion === 'c') return String.fromCharCode((Number(value) === 0 ? 128 : Number(value)) & 255);
  let text;
  let prefix = '';
  if (conversion === 's') {
    text = typeof value === 'string' ? value.split('\0')[0] : '';
    if (precision !== undefined) text = text.slice(0, precision);
  } else {
    const number = Number(value) | 0;
    const radix = conversion === 'o' ? 8 : /[xX]/.test(conversion) ? 16 : 10;
    const magnitude = conversion === 'd' ? Math.abs(number) : number >>> 0;
    text = precision === 0 && magnitude === 0 ? '' : magnitude.toString(radix);
    if (precision !== undefined) text = text.padStart(precision, '0');
    if (conversion === 'X') text = text.toUpperCase();
    if (conversion === 'd') prefix = number < 0 ? '-' : flags.includes(' ') ? ' ' : '';
    if (flags.includes('#')) {
      if (conversion === 'o' && !text.startsWith('0')) prefix += '0';
      if (/[xX]/.test(conversion) && magnitude !== 0) prefix += conversion === 'X' ? '0X' : '0x';
    }
  }
  const padding = Math.max(0, width - text.length - prefix.length);
  if (flags.includes('-')) return prefix + text + ' '.repeat(padding);
  if (flags.includes('0') && precision === undefined && conversion !== 's') return prefix + '0'.repeat(padding) + text;
  return ' '.repeat(padding) + prefix + text;
}

export class Terminfo {
  constructor({ entries = [pinnedXterm256color()], lines = 24, columns = 80, delay = null } = {}) {
    this.entries = new Map();
    this.current = null;
    this.lines = lines;
    this.columns = columns;
    this.delay = delay;
    this.staticVariables = new Int32Array(26);
    for (const bytes of entries) this.addEntry(bytes);
  }

  addEntry(bytes) {
    const entry = parseTerminfo(bytes);
    for (const name of entry.names) this.entries.set(name, entry);
    return entry;
  }

  tgetent(bufferIgnored, name) {
    if (name === undefined) name = bufferIgnored;
    const entry = this.entries.get(name);
    // As with setupterm failure, do not replace an already selected terminal.
    if (!entry) return this.entries.size ? 0 : -1;
    this.current = {
      ...entry,
      booleans: entry.booleans.slice(), numbers: entry.numbers.slice(), strings: entry.strings.slice(),
    };
    this.staticVariables.fill(0);
    const get = id => this.current.strings[strIndex.get(id)] ?? null;
    if (get('le') !== null) {
      this.current.booleans[boolIndex.get('bs')] = Number(get('le') === '\b');
      if (get('le') !== '\b') this.current.strings[strIndex.get('bc')] = get('le');
    }
    // ncurses termcap's "me" must not also reset alternate character set mode.
    // The pinned entry's sgr0 equals sgr(all-off); remove its exact rmacs bytes.
    // More elaborate rewrite_sgr/similar_sgr heuristics for other entries are
    // deliberately not claimed here.
    const sgr = get('sa'), me = get('me'), ae = get('ae');
    const sameSgr = (a, b) => a.replace(/\x1b\[(?:0;)*0?m/g, '\x1b[m') === b.replace(/\x1b\[(?:0;)*0?m/g, '\x1b[m');
    if (sgr && me && ae) {
      const off = this.tparm(sgr, 0, 0, 0, 0, 0, 0, 0, 0, 0);
      const on = this.tparm(sgr, 0, 0, 0, 0, 0, 0, 0, 0, 1);
      if (sameSgr(off, me) && !sameSgr(off, on) && off.includes(ae))
        this.current.strings[strIndex.get('me')] = off.replace(ae, '');
    }
    return 1;
  }

  lookup(id, kind, index, absent) {
    const code = capCode(id);
    if (!this.current || !code) return absent;
    const i = index.get(code);
    const value = i === undefined ? this.current.extended[kind].get(code) : this.current[kind][i];
    return value ?? absent;
  }

  tgetflag(id) { return this.lookup(id, 'booleans', boolIndex, 0) === 1 ? 1 : 0; }
  tgetnum(id) {
    const code = capCode(id);
    if (this.current && code === 'co' && this.columns > 0) return this.columns;
    if (this.current && code === 'li' && this.lines > 0) return this.lines;
    const value = this.lookup(id, 'numbers', numIndex, -1);
    return value < 0 ? -1 : value;
  }
  tgetstr(id, area = null) {
    const value = this.lookup(id, 'strings', strIndex, null);
    if (value !== null && area !== null) {
      if (!(area.bytes instanceof Uint8Array) || !Number.isInteger(area.offset) || area.offset < 0
          || area.offset + value.length + 1 > area.bytes.length)
        throw new RangeError('tgetstr destination area too small or invalid');
      for (let i = 0; i < value.length; i++) area.bytes[area.offset + i] = value.charCodeAt(i);
      area.bytes[area.offset + value.length] = 0;
      area.offset += value.length + 1;
    }
    return value;
  }

  /** ncurses evaluates numeric stack cells as signed 32-bit int, even on LP64. */
  tparm(format, ...parameters) {
    if (format === null || format === undefined) return null;
    if (typeof format !== 'string') throw new TypeError('tparm format must be a byte string');
    format = format.split('\0')[0];
    const params = Array.from({ length: 9 }, (_, i) => typeof parameters[i] === 'string'
      ? parameters[i].split('\0')[0] : Number(parameters[i] ?? 0) | 0);
    const stack = [];
    const dynamic = new Int32Array(26);
    const pop = () => stack.length ? stack.pop() : 0;
    const numeric = () => { const v = pop(); return typeof v === 'number' ? v | 0 : 0; };
    const push = value => { if (stack.length >= 20) throw new RangeError('tparm stack overflow'); stack.push(value); };
    const variable = letter => {
      if (!/^[a-zA-Z]$/.test(letter)) throw new RangeError('invalid tparm variable');
      return [letter <= 'Z' ? this.staticVariables : dynamic, letter.toLowerCase().charCodeAt(0) - 97];
    };
    // The implicit-argument compatibility case is used for %d-style strings.
    let explicit = false;
    for (let i = 0; i < format.length; i++) {
      if (format[i] !== '%') continue;
      const token = format[++i];
      if (token === 'p' && /^[1-9]$/.test(format[i + 1] ?? '')) { explicit = true; break; }
      // Escaped %% is one token: its following literal "p1" is not a push.
      // Likewise, skip the character stored by %'x' rather than scanning it.
      if (token === "'") i += 2;
    }
    if (!explicit) for (let i = params.length - 1; i >= 0; i--) push(params[i]);
    let output = '';
    let incremented = false;
    const skip = (start, allowElse) => {
      let depth = 0;
      for (let i = start; i < format.length - 1; i++) {
        if (format[i] !== '%') continue;
        const token = format[++i];
        if (token === '?') depth++;
        else if (token === ';') { if (!depth) return i + 1; depth--; }
        else if (token === 'e' && !depth && allowElse) return i + 1;
      }
      throw new RangeError('unterminated tparm conditional');
    };
    for (let at = 0; at < format.length;) {
      if (format[at] !== '%') { output += format[at++]; continue; }
      at++;
      const formatted = /^(:?[- #0]*)(\d*)(?:\.(\d*))?([doxXsc])/.exec(format.slice(at));
      if (formatted && (!formatted[1].includes('-') || formatted[1].startsWith(':'))) {
        output += formatValue(pop(), formatted[1], formatted[2], formatted[3], formatted[4]);
        at += formatted[0].length;
        continue;
      }
      const op = format[at++];
      if (op === '%') output += '%';
      else if (op === 'p') {
        const n = Number(format[at++]) - 1;
        if (!Number.isInteger(n) || n < 0 || n > 8) throw new RangeError('invalid tparm parameter');
        push(params[n]);
      } else if (op === 'P' || op === 'g') {
        const [store, i] = variable(format[at++]);
        if (op === 'P') store[i] = numeric(); else push(store[i]);
      } else if (op === '{') {
        const constant = /^(\d+)}/.exec(format.slice(at));
        if (!constant) throw new RangeError('invalid tparm numeric constant');
        push(Number(constant[1]) | 0); at += constant[0].length;
      } else if (op === "'") {
        if (at + 1 >= format.length || format[at + 1] !== "'") throw new RangeError('invalid tparm character constant');
        push(format.charCodeAt(at) & 255); at += 2;
      } else if (op === 'l') {
        const v = pop(); push(typeof v === 'string' ? v.length : 0);
      } else if (op === 'i') {
        if (!incremented) {
          for (let i = 0; i < 2; i++) if (typeof params[i] === 'number') params[i] = (params[i] + 1) | 0;
          if (!explicit) { stack[stack.length - 1] = params[0]; stack[stack.length - 2] = params[1]; }
          incremented = true;
        }
      } else if ('+-*/m&|^=<>AO'.includes(op) && op !== undefined) {
        const y = numeric(), x = numeric();
        const operations = {
          '+': () => (x + y) | 0, '-': () => (x - y) | 0, '*': () => Math.imul(x, y),
          '/': () => y ? (x / y) | 0 : 0, m: () => y ? (x % y) | 0 : 0,
          '&': () => x & y, '|': () => x | y, '^': () => x ^ y,
          '=': () => Number(x === y), '<': () => Number(x < y), '>': () => Number(x > y),
          A: () => Number(Boolean(x && y)), O: () => Number(Boolean(x || y)),
        };
        push(operations[op]());
      } else if (op === '!') push(Number(!numeric()));
      else if (op === '~') push(~numeric());
      else if (op === 't') { if (!numeric()) at = skip(at, true); }
      else if (op === 'e') at = skip(at, false);
      else if (op !== '?' && op !== ';') throw new RangeError(`unsupported tparm operator %${op ?? ''}`);
    }
    return output;
  }

  // Current build has PURE_TERMINFO=1; old termcap %-coordinate formats aren't used.
  tgoto(format, column, row) { return this.tparm(format, row, column); }

  /** Output bytes synchronously. Optional delay(milliseconds, mandatory) handles padding. */
  tputs(value, affectedLines, emitByte) {
    if (value === null || value === undefined) return -1;
    if (typeof value !== 'string' || typeof emitByte !== 'function') throw new TypeError('invalid tputs arguments');
    value = value.split('\0')[0];
    for (let at = 0; at < value.length;) {
      if (value[at] === '$' && value[at + 1] === '<'
          && /[\d.]/.test(value[at + 2] ?? '') && value.indexOf('>', at + 2) >= 0) {
        at += 2;
        let tenths = 0;
        while (/\d/.test(value[at] ?? '')) tenths = tenths * 10 + Number(value[at++]);
        tenths *= 10;
        if (value[at] === '.') {
          at++;
          if (/\d/.test(value[at] ?? '')) tenths += Number(value[at++]);
          while (/\d/.test(value[at] ?? '')) at++;
        }
        let mandatory = false;
        while (value[at] === '*' || value[at] === '/') {
          if (value[at++] === '*') tenths *= affectedLines;
          else mandatory = true;
        }
        if (this.delay && tenths > 0) this.delay(Math.trunc(tenths / 10), mandatory);
        // ncurses also consumes the first unexpected delimiter for malformed
        // padding such as "$<1.2.3>"; retain that byte-level behavior.
        at++;
      } else if (value[at] === '$' && value[at + 1] !== '<') {
        emitByte(value.charCodeAt(at++) & 255);
        // ncurses consumes the following byte too. This matters for "$$<1>",
        // whose second dollar is literal rather than another padding opener.
        if (at < value.length) emitByte(value.charCodeAt(at++) & 255);
      } else emitByte(value.charCodeAt(at++) & 255);
    }
    return 0;
  }
}

export function createTerminfo(options) { return new Terminfo(options); }
