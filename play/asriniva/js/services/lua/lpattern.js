/* Lua5.4 byte-pattern matching port of lstrlib.c; lobject.js notice.
 * Preserves captures, balanced/frontier matching, greedy/minimal expansion and
 * replacement callback ordering. Uses no JavaScript RegExp for Lua patterns.
 */
import { LuaError, isLuaString, luaStringBytes, LuaTable, LuaUserdata, luaType, numberToString, truth } from './lobject.js';
import { LuaBuffer } from '../lua-buffer.js';
import {luaCheckInteger,luaTypeError} from '../lua-aux-error.js';
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
    if (pattern[p] === '%') { if (p + 1 === pattern.length) this.vm.auxError("malformed pattern (ends with '%')"); return p + 2; }
    if (pattern[p] !== '[') return p + 1;
    let at = p + 1; if (pattern[at] === '^') at++;
    do {
      if (at >= pattern.length) this.vm.auxError("malformed pattern (missing ']')");
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
    if (depth >= 200) this.vm.auxError('pattern too complex');
    const pattern = this.pattern, source = this.source;
    while (p < pattern.length) {
      this.vm.tick();
      if (pattern[p] === '(') {
        if (captures.length >= 32) this.vm.auxError('too many captures');
        const position = pattern[p + 1] === ')';
        return this.match(s, p + (position ? 2 : 1), [...captures, { start: s, length: position ? -2 : -1 }], depth + 1);
      }
      if (pattern[p] === ')') {
        let i = captures.length - 1; while (i >= 0 && captures[i].length !== -1) i--;
        if (i < 0) this.vm.auxError('invalid pattern capture');
        const closed = captures.slice(); closed[i] = { start: captures[i].start, length: s - captures[i].start };
        return this.match(s, p + 1, closed, depth + 1);
      }
      if (pattern[p] === '$' && p + 1 === pattern.length) return s === source.length ? { end: s, captures } : null;
      if (pattern[p] === '%' && pattern[p + 1] === 'b') {
        if (p + 3 >= pattern.length) this.vm.auxError("malformed pattern (missing arguments to '%b')");
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
        p += 2; if (pattern[p] !== '[') this.vm.auxError("missing '[' after '%f' in pattern");
        const end = this.classend(p), previous = s === 0 ? 0 : source.charCodeAt(s - 1), current = s === source.length ? 0 : source.charCodeAt(s);
        if (this.bracket(previous, p, end - 1) || !this.bracket(current, p, end - 1)) return null;
        p = end; continue;
      }
      if (pattern[p] === '%' && /\d/.test(pattern[p + 1] ?? '')) {
        const i = Number(pattern[p + 1]) - 1, capture = captures[i];
        if (!capture || capture.length === -1) this.vm.auxError(`invalid capture index %${i + 1}`);
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
    if (index >= found.captures.length) { if (index === 0) return this.source.slice(start, found.end); this.vm.auxError(`invalid capture index %${index + 1}`); }
    const capture = found.captures[index];
    if (capture.length === -1) this.vm.auxError('unfinished capture');
    return capture.length === -2 ? BigInt(capture.start + 1) : this.source.slice(capture.start, capture.start + capture.length);
  }
  values(found, start, whole = true) {
    if (!found.captures.length) return whole ? [this.source.slice(start, found.end)] : [];
    return found.captures.map((_, i) => this.capture(found, start, i));
  }
}
export function openPatterns(vm, lib, { string, integer }) {
  const initial = (index, length) => { index = luaCheckInteger(vm,index,3); return index < 0n ? Math.max(0, length + Number(index)) : Math.max(0, Number(index) - 1); };
  const find = (subject, pattern, init = 1n, plain = false, positions = true) => {
    init ??= 1n; const roots=[subject,pattern];
    subject = vm.checkString(subject,0); pattern = vm.checkString(pattern,1); const start = initial(init, subject.length);
    if (start > subject.length) return [null];
    if (positions && (truth(plain) || !/[\^$*+?.([%\-]/.test(pattern))) {
      const at = subject.indexOf(pattern, start); return at < 0 ? [null] : [BigInt(at + 1), BigInt(at + pattern.length)];
    }
    const anchor = pattern[0] === '^'; if (anchor) pattern = pattern.slice(1);
    const matcher = new MatchState(vm, subject, pattern);
    for (let at = start; at <= subject.length; at++) {
      const found = matcher.match(at);
      if (found) return positions ? [BigInt(at + 1), BigInt(found.end), ...captureValues(matcher,found,at,top()+2,false)] : captureValues(matcher,found,at,top());
      if (anchor) break;
    }
    return [null];
  };
  lib.rawset('find', (subject, pattern, init = 1n, plain = false) => find(subject, pattern, init, plain, true));
  lib.rawset('match', (subject, pattern, init = 1n) => find(subject, pattern, init, false, false));
  const top = () => {const m=vm.heap.frameMetadata(vm.currentThread);return m?.argumentTop??m?.checkTop??vm.heap.getStackTop(vm.currentThread);};
  const captureValues = (matcher, found, start, stackTop, whole=true) => {
    const values=[],release=vm.heap.addRoots(()=>values);
    try {
      const count=found.captures.length||(whole?1:0);
      if(!vm.heap.checkStack(vm.currentThread,stackTop,count,{safe:false,gc:false}))vm.auxError('too many captures');
      for(let i=0;i<count;i++) {
        const value=matcher.capture(found,start,i);values.push(vm.heap.adopt(value));
        if(isLuaString(value))vm.heap.withStackTop(stackTop+values.length,()=>vm.heap.checkpoint());
      }
      return values;
    } finally {release();}
  };
  lib.rawset('gmatch', (subject, pattern, init = 1n) => {
    init ??= 1n;
    const args=vm.debug.thread(vm.currentThread).frames.at(-1)?.args;
    const source=vm.checkString(subject,0),expression=vm.checkString(pattern,1);
    const offset=Math.min(initial(init,source.length),source.length+1),roots=[args?.[0]??subject,args?.[1]??pattern],release=vm.heap.addRoots(()=>roots);
    if(args)vm.setHostStackTop(2);
    try {
      // Original LP64 GMatchState: three pointers + MatchState (552 bytes).
      const state=vm.heap.with(()=>new LuaUserdata({matcher:new MatchState(vm,source,expression),at:offset,lastEnd:null},null,[],576));
      roots.push(state);const metadata=vm.heap.frameMetadata(vm.currentThread),base=(metadata?.func??0)+1;
      vm.heap.withStackTop(base+3,()=>vm.heap.checkpoint());
      const iterator=()=>{
        const current=state.value,matcher=current.matcher;
        for(let at=current.at;at<=source.length;at++) {
          const found=matcher.match(at);
          if(found&&found.end!==current.lastEnd) {
            current.at=current.lastEnd=found.end;
            return captureValues(matcher,found,at,top());
          }
        }
        return [];
      };
      iterator.luaGcRoots=roots.slice();vm.heap.adopt(iterator);roots.push(iterator);
      vm.heap.withStackTop(base+1,()=>vm.heap.checkpoint());return [iterator];
    }finally{release();}
  });
  lib.rawset('gsub', (subject, pattern, replacement, maximum = null) => {
    const source=vm.checkString(subject,0),expression=vm.checkString(pattern,1),args=vm.debug.thread(vm.currentThread).frames.at(-1)?.args;
    const original=args?.[0]??subject;
    maximum=maximum===null?BigInt(source.length+1):luaCheckInteger(vm,maximum,4);
    const type=luaType(replacement);if(!['string','number','function','table'].includes(type))luaTypeError(vm,3,'string/function/table',replacement);
    const anchor=expression[0]==='^',matcher=new MatchState(vm,source,anchor?expression.slice(1):expression),buffer=new LuaBuffer(vm);
    const roots=[original,replacement],release=vm.heap.addRoots(()=>roots);let at=0,lastEnd=null,count=0n,changed=false;
    try {
      while(count<maximum) {
        const found=matcher.match(at);
        if(found&&found.end!==lastEnd) {
          count++;
          if(type==='string'||type==='number') {
            const text=vm.checkString(replacement,2);let segment=0;
            for(let i=0;i<text.length;i++)if(text[i]==='%') {
              buffer.add(text.slice(segment,i));const next=text[++i];
              if(next==='%')buffer.add('%');
              else if(next==='0')buffer.add(source.slice(at,found.end));
              else if(next>='1'&&next<='9') {
                const value=matcher.capture(found,at,Number(next)-1);
                if(typeof value==='bigint')buffer.addValue(value);else buffer.add(value);
              }else vm.auxError("invalid use of '%' in replacement string");
              segment=i+1;
            }
            buffer.add(text.slice(segment));changed=true;
          }else {
            const stackTop=buffer.stackBase+1;let value;
            if(type==='function') {
              const values=captureValues(matcher,found,at,stackTop+1);roots.push(values);
              try {value=vm.call(replacement,values,{func:stackTop,checkTop:stackTop+1+values.length})[0]??null;}
              finally{roots.pop();}
            }else {
              const values=captureValues(matcher,{...found,captures:found.captures.slice(0,1)},at,stackTop);roots.push(values);
              try{value=vm.heap.withStackTop(stackTop+1,()=>vm.get(replacement,values[0]));}finally{roots.pop();}
            }
            roots.push(value);
            try {
              if(!truth(value))buffer.add(source.slice(at,found.end));
              else if(isLuaString(value)||luaType(value)==='number'){buffer.addValue(value);changed=true;}
              else vm.auxError(`invalid replacement value (a ${luaType(value)})`);
            }finally{roots.pop();}
          }
          at=lastEnd=found.end;
        }else if(at<source.length)buffer.add(source[at++]);
        else break;
        if(anchor)break;
      }
      if(!changed){buffer.close();return [original,count];}
      buffer.add(source.slice(at));return [buffer.finish(),count];
    }catch(error){buffer.close(error);throw error;}finally{release();}
  });
}
