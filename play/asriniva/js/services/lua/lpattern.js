/* Lua5.4 byte-pattern matching port of lstrlib.c; lobject.js notice.
 * Preserves captures, balanced/frontier matching, greedy/minimal expansion and
 * replacement callback ordering. Uses no JavaScript RegExp for Lua patterns.
 */
import { LuaError, isLuaString, luaStringBytes, LuaTable, luaType, numberToString, truth } from './lobject.js';
function matchClass(c, cls) {
  const lower = cls.toLowerCase(); let result;
  if (lower === 'a') result = c >= 65 && c <= 90 || c >= 97 && c <= 122;
  else if (lower === 'c') result = c < 32 || c === 127;
  else if (lower === 'd') result = c >= 48 && c <= 57;
  else if (lower === 'g') result = c >= 33 && c <= 126;
  else if (lower === 'l') result = c >= 97 && c <= 122;
  else if (lower === 'p') result = c >= 33 && c <= 126 && !(c >= 48 && c <= 57 || c >= 65 && c <= 90 || c >= 97 && c <= 122);
  else if (lower === 's') result = c === 32 || c >= 9 && c <= 13;
  else if (lower === 'u') result = c >= 65 && c <= 90;
  else if (lower === 'w') result = c >= 48 && c <= 57 || c >= 65 && c <= 90 || c >= 97 && c <= 122;
  else if (lower === 'x') result = c >= 48 && c <= 57 || c >= 65 && c <= 70 || c >= 97 && c <= 102;
  else if (lower === 'z') result = c === 0;
  else return c === cls.charCodeAt(0);
  return cls === lower ? result : !result;
}
class MatchState {
  constructor(vm, source, pattern) { this.vm = vm; this.source = source; this.pattern = pattern; }
  classend(p) {
    const pattern = this.pattern;
    if (pattern[p] === '%') { if (p + 1 === pattern.length) throw new LuaError("malformed pattern (ends with '%')"); return p + 2; }
    if (pattern[p] !== '[') return p + 1;
    let at = p + 1; if (pattern[at] === '^') at++;
    do {
      if (at >= pattern.length) throw new LuaError("malformed pattern (missing ']')");
      if (pattern[at++] === '%' && at < pattern.length) at++;
    } while (pattern[at] !== ']');
    return at + 1;
  }
  bracket(c, p, end) {
    const pattern = this.pattern; let positive = true;
    if (pattern[p + 1] === '^') { positive = false; p++; }
    while (++p < end) {
      if (pattern[p] === '%') { if (matchClass(c, pattern[++p])) return positive; }
      else if (pattern[p + 1] === '-' && p + 2 < end) { p += 2; if (pattern.charCodeAt(p - 2) <= c && c <= pattern.charCodeAt(p)) return positive; }
      else if (pattern.charCodeAt(p) === c) return positive;
    }
    return !positive;
  }
  single(s, p, end) {
    if (s >= this.source.length) return false;
    const c = this.source.charCodeAt(s), token = this.pattern[p];
    return token === '.' ? true : token === '%' ? matchClass(c, this.pattern[p + 1]) : token === '[' ? this.bracket(c, p, end - 1) : this.pattern.charCodeAt(p) === c;
  }
  match(s, p = 0, captures = [], depth = 0) {
    if (depth >= 200) throw new LuaError('pattern too complex');
    const pattern = this.pattern, source = this.source;
    while (p < pattern.length) {
      this.vm.tick();
      if (pattern[p] === '(') {
        if (captures.length >= 32) throw new LuaError('too many captures');
        const position = pattern[p + 1] === ')';
        return this.match(s, p + (position ? 2 : 1), [...captures, { start: s, length: position ? -2 : -1 }], depth + 1);
      }
      if (pattern[p] === ')') {
        let i = captures.length - 1; while (i >= 0 && captures[i].length !== -1) i--;
        if (i < 0) throw new LuaError('invalid pattern capture');
        const closed = captures.slice(); closed[i] = { start: captures[i].start, length: s - captures[i].start };
        return this.match(s, p + 1, closed, depth + 1);
      }
      if (pattern[p] === '$' && p + 1 === pattern.length) return s === source.length ? { end: s, captures } : null;
      if (pattern[p] === '%' && pattern[p + 1] === 'b') {
        if (p + 3 >= pattern.length) throw new LuaError("malformed pattern (missing arguments to '%b')");
        if (source[s] !== pattern[p + 2]) return null;
        let count = 1; while (++s < source.length) {
          this.vm.tick();
          if (source[s] === pattern[p + 3]) { if (--count === 0) break; }
          else if (source[s] === pattern[p + 2]) count++;
        }
        if (s === source.length) return null;
        s++; p += 4; continue;
      }
      if (pattern[p] === '%' && pattern[p + 1] === 'f') {
        p += 2; if (pattern[p] !== '[') throw new LuaError("missing '[' after '%f' in pattern");
        const end = this.classend(p), previous = s === 0 ? 0 : source.charCodeAt(s - 1), current = s === source.length ? 0 : source.charCodeAt(s);
        if (this.bracket(previous, p, end - 1) || !this.bracket(current, p, end - 1)) return null;
        p = end; continue;
      }
      if (pattern[p] === '%' && /\d/.test(pattern[p + 1] ?? '')) {
        const i = Number(pattern[p + 1]) - 1, capture = captures[i];
        if (!capture || capture.length === -1) throw new LuaError(`invalid capture index %${i + 1}`);
        if (capture.length < 0 || source.slice(capture.start, capture.start + capture.length) !== source.slice(s, s + capture.length)) return null;
        s += capture.length; p += 2; continue;
      }
      const end = this.classend(p), matched = this.single(s, p, end), suffix = pattern[end];
      if (!matched) { if (suffix === '*' || suffix === '?' || suffix === '-') { p = end + 1; continue; } return null; }
      if (suffix === '?') {
        const found = this.match(s + 1, end + 1, captures, depth + 1); if (found) return found;
        p = end + 1; continue;
      }
      if (suffix === '*' || suffix === '+' || suffix === '-') {
        const start = s + (suffix === '+' ? 1 : 0); let maximum = start;
        while (this.single(maximum, p, end)) { maximum++; this.vm.tick(); }
        if (suffix === '-') {
          for (let at = start; at <= maximum; at++) { const found = this.match(at, end + 1, captures, depth + 1); if (found) return found; }
        } else {
          for (let at = maximum; at >= start; at--) { const found = this.match(at, end + 1, captures, depth + 1); if (found) return found; }
        }
        return null;
      }
      s++; p = end;
    }
    return { end: s, captures };
  }
  capture(found, start, index) {
    if (index >= found.captures.length) { if (index === 0) return this.source.slice(start, found.end); throw new LuaError(`invalid capture index %${index + 1}`); }
    const capture = found.captures[index];
    if (capture.length === -1) throw new LuaError('unfinished capture');
    return capture.length === -2 ? BigInt(capture.start + 1) : this.source.slice(capture.start, capture.start + capture.length);
  }
  values(found, start, whole = true) {
    if (!found.captures.length) return whole ? [this.source.slice(start, found.end)] : [];
    return found.captures.map((_, i) => this.capture(found, start, i));
  }
}
export function openPatterns(vm, lib, { string, integer }) {
  const initial = (index, length) => { index = integer(index); return index < 0n ? Math.max(0, length + Number(index)) : Math.max(0, Number(index) - 1); };
  const find = (subject, pattern, init = 1n, plain = false, positions = true) => {
    init ??= 1n; const roots=[subject,pattern];
    subject = string(subject); pattern = string(pattern); const start = initial(init, subject.length);
    if (start > subject.length) return [null];
    if (positions && (truth(plain) || !/[\^$*+?.([%\-]/.test(pattern))) {
      const at = subject.indexOf(pattern, start); return at < 0 ? [null] : [BigInt(at + 1), BigInt(at + pattern.length)];
    }
    const anchor = pattern[0] === '^'; if (anchor) pattern = pattern.slice(1);
    const matcher = new MatchState(vm, subject, pattern);
    for (let at = start; at <= subject.length; at++) {
      const found = matcher.match(at);
      if (found) return positions ? [BigInt(at + 1), BigInt(found.end), ...matcher.values(found, at, false)] : matcher.values(found, at);
      if (anchor) break;
    }
    return [null];
  };
  lib.rawset('find', (subject, pattern, init = 1n, plain = false) => find(subject, pattern, init, plain, true));
  lib.rawset('match', (subject, pattern, init = 1n) => find(subject, pattern, init, false, false));
  lib.rawset('gmatch', (subject, pattern, init = 1n) => {
    init ??= 1n; const roots=[subject,pattern];
    subject = string(subject); pattern = string(pattern);
    const matcher = new MatchState(vm, subject, pattern); let at = initial(init, subject.length), lastEnd = null;
    const iterator = () => {
      for (; at <= subject.length; at++) {
        const found = matcher.match(at);
        if (found && found.end !== lastEnd) { const result = matcher.values(found, at); at = lastEnd = found.end; return result; }
      }
      return [];
    }; iterator.luaGcRoots=roots; return [iterator];
  });
  lib.rawset('gsub', (subject, pattern, replacement, maximum = null) => {
    subject = string(subject); pattern = string(pattern); maximum = maximum === null ? BigInt(subject.length + 1) : integer(maximum);
    const type = luaType(replacement); if (!['string', 'number', 'function', 'table'].includes(type)) throw new LuaError('string/function/table expected');
    if (type === 'number') replacement = numberToString(replacement); else if(type==='string')replacement=string(replacement);
    const anchor = pattern[0] === '^'; if (anchor) pattern = pattern.slice(1);
    const matcher = new MatchState(vm, subject, pattern); let at = 0, lastEnd = null, count = 0n, output = '';
    while (count < maximum) {
      const found = matcher.match(at);
      if (found && found.end !== lastEnd) {
        count++; let value;
        if (type === 'function') value = vm.call(replacement, matcher.values(found, at))[0] ?? null;
        else if (type === 'table') value = vm.get(replacement, matcher.capture(found, at, 0));
        else {
          value = '';
          for (let i = 0; i < replacement.length; i++) {
            if (replacement[i] !== '%') { value += replacement[i]; continue; }
            const next = replacement[++i];
            if (next === '%') value += '%';
            else if (next === '0') value += subject.slice(at, found.end);
            else if (/\d/.test(next ?? '')) { const capture = matcher.capture(found, at, Number(next) - 1); value += typeof capture === 'bigint' ? String(capture) : capture; }
            else throw new LuaError("invalid use of '%' in replacement string");
          }
        }
        if (!truth(value)) value = subject.slice(at, found.end);
        else if (luaType(value) === 'number') value = numberToString(value);
        else if (!isLuaString(value)) throw new LuaError('invalid replacement value');
        if (isLuaString(value)) value=luaStringBytes(value);
        output += value; at = lastEnd = found.end;
      } else if (at < subject.length) output += subject[at++];
      else break;
      if (anchor) break;
    }
    return [output + subject.slice(at), count];
  });
}
