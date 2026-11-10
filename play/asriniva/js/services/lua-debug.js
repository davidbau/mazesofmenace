/* Lua 5.4.8 debug/event and allocator contracts. Derived from ldebug.c,
 * lauxlib.c, ldo.c, lmem.c and NetHack nhlua.c; Lua notice: lua/lobject.js.
 * opcode() is a REAL fetched Lua instruction boundary. AST statement visits
 * may update frameLine() but must never call opcode(). This module does not
 * estimate JS heap usage: allocator accounting requires actual requested
 * block sizes, including the VM's object headers and auxiliary arrays.
 */
import { LuaError } from './lua/lobject.js';

export const LUA_HOOKCALL = 0, LUA_HOOKRET = 1, LUA_HOOKLINE = 2, LUA_HOOKCOUNT = 3, LUA_HOOKTAILCALL = 4;
export const LUA_MASKCALL = 1, LUA_MASKRET = 2, LUA_MASKLINE = 4, LUA_MASKCOUNT = 8;
export const LUA_ERRMEM = 4;
const cstring = text => String(text).split('\0', 1)[0];

export function luaChunkId(source = '?', size = 60) {
  source = String(source);
  if (!Number.isInteger(size) || size < 16) throw new RangeError('Lua source ID buffer too small');
  if (source[0] === '=') return cstring(source.slice(1, size));
  if (source[0] === '@') return source.length <= size ? cstring(source.slice(1)) : '...' + cstring(source.slice(-(size - 4)));
  const first = cstring(source).split('\n', 1)[0], available = size - 15;
  return '[string "' + (source.length < available && !source.includes('\n') ? first : first.slice(0, available) + '...') + '"]';
}

/* Resolve Lua's delta/absolute compressed line info, or an explicitly decoded
 * line table supplied by a bytecode loader. No line is inferred from AST ticks. */
export function luaFunctionLine(proto, pc) {
  if (!proto || pc < 0) return -1;
  if (proto.lines) return proto.lines[pc] ?? -1;
  if (!proto.lineinfo || proto.lineinfo.length === 0) return -1;
  let line = proto.linedefined ?? 0, start = -1;
  for (const absolute of proto.abslineinfo ?? []) {
    if (absolute.pc > pc) break;
    start = absolute.pc; line = absolute.line;
  }
  for (let i = start + 1; i <= pc; i++) {
    let delta = proto.lineinfo[i];
    if (delta === undefined || delta === -128 || delta === 128) return -1;
    if (delta > 127) delta -= 256;
    line += delta;
  }
  return line;
}

export class LuaDebugState {
  constructor({ mainThread = {}, resolveGlobalName = null } = {}) {
    this.mainThread = mainThread; this.threads = new WeakMap(); this.resolveGlobalName = resolveGlobalName;
  }
  thread(thread = this.mainThread) {
    if (!thread || !['object', 'function'].includes(typeof thread)) throw new TypeError('Lua thread must be an object');
    let state = this.threads.get(thread);
    if (!state) { state = { frames: [], hook: null, mask: 0, count: 0, remaining: 0, allowhook: true, oldpc: 0, instructions: 0 }; this.threads.set(thread, state); }
    return state;
  }
  inheritThread(thread, parent = this.mainThread) {
    const source = this.thread(parent), target = this.thread(thread);
    target.hook = source.hook; target.mask = source.mask; target.count = source.count; target.remaining = source.count;
  }
  sethook(thread, hook, mask, count) {
    const state = this.thread(thread);
    if (hook !== null && typeof hook !== 'function') throw new TypeError('Lua hook must be a function or null');
    state.hook = hook && mask ? hook : null; state.mask = state.hook ? mask & 255 : 0;
    state.count = count | 0; state.remaining = state.count;
  }
  gethook(thread) { return this.thread(thread).hook; }
  gethookmask(thread) { return this.thread(thread).mask; }
  gethookcount(thread) { return this.thread(thread).count; }
  emit(thread, event, line = -1, transfer = null) {
    const state = this.thread(thread);
    if (!state.hook || !state.allowhook) return;
    const hook = state.hook, frame = state.frames.at(-1);
    const ar = { event, currentline: line, i_ci: frame, ftransfer: transfer?.first ?? 0, ntransfer: transfer?.count ?? 0 };
    state.allowhook = false;
    try { hook(thread, ar); } finally { state.allowhook = true; }
  }
  frameEnter(thread, details = {}) {
    const state = this.thread(thread), proto = details.prototype ?? details.fn?.prototype ?? null;
    const frame = { ...details, prototype: proto, thread, pc: -1, currentline: -1, istailcall: false,
      what: details.what ?? (proto ? (proto.linedefined === 0 ? 'main' : 'Lua') : 'C'),
      source: details.source ?? proto?.source ?? proto?.name ?? '=[C]', name: details.name ?? null, namewhat: details.namewhat ?? '' };
    state.frames.push(frame);
    if (frame.what !== 'C') state.oldpc = 0;
    // Vararg bytecode calls defer the call event to VARARGPREP.
    if (!details.deferCallHook && (state.mask & LUA_MASKCALL)) this.emit(thread, LUA_HOOKCALL, -1, { first: 1, count: proto?.numparams ?? proto?.params?.length ?? details.args?.length ?? 0 });
    return frame;
  }
  callHook(thread, tail = false) {
    const state = this.thread(thread), frame = state.frames.at(-1);
    if (frame.what !== 'C') state.oldpc = 0;
    if (state.mask & LUA_MASKCALL) this.emit(thread, tail ? LUA_HOOKTAILCALL : LUA_HOOKCALL, -1, { first: 1, count: frame.prototype?.numparams ?? frame.prototype?.params?.length ?? 0 });
  }
  frameTailcall(thread, frame, details) {
    const state = this.thread(thread);
    if (state.frames.at(-1) !== frame) throw new Error('Lua tail call frame mismatch');
    state.frames.pop();
    const next = this.frameEnter(thread, { ...details, deferCallHook: true }); next.istailcall = true;
    if (!details.deferCallHook) this.callHook(thread, true);
    return next;
  }
  frameLeave(thread, frame, results = 0, { error = false, firstResult = 1 } = {}) {
    const state = this.thread(thread);
    if (state.frames.at(-1) !== frame) throw new Error('Lua debug frame mismatch');
    try { if (!error && (state.mask & LUA_MASKRET)) this.emit(thread, LUA_HOOKRET, -1, { first: firstResult, count: results }); }
    finally {
      state.frames.pop(); const caller = state.frames.at(-1);
      if (caller && caller.what !== 'C') state.oldpc = caller.pc;
    }
  }
  frameLine(frame, line) { frame.currentline = line; }
  opcode(thread, pc, line = undefined) {
    const state = this.thread(thread), frame = state.frames.at(-1);
    if (!frame || frame.what === 'C') throw new Error('Lua opcode outside Lua frame');
    frame.pc = pc; frame.currentline = line ?? luaFunctionLine(frame.prototype, pc); state.instructions++;
    if (!(state.mask & (LUA_MASKLINE | LUA_MASKCOUNT))) return;
    const count = Boolean(state.mask & LUA_MASKCOUNT) && --state.remaining === 0;
    if (count) state.remaining = state.count;
    if (count) this.emit(thread, LUA_HOOKCOUNT);
    if (state.mask & LUA_MASKLINE) {
      const size = frame.prototype?.code?.length ?? Infinity;
      const oldpc = state.oldpc < size ? state.oldpc : 0;
      if (pc <= oldpc || luaFunctionLine(frame.prototype, oldpc) !== frame.currentline) this.emit(thread, LUA_HOOKLINE, frame.currentline);
      state.oldpc = pc;
    }
  }
  getstack(thread, level, ar = {}) {
    if (!Number.isInteger(level) || level < 0) return 0;
    const frame = this.thread(thread).frames.at(-1 - level);
    if (!frame) return 0;
    ar.i_ci = frame; return 1;
  }
  getinfo(thread, what, ar = {}, fn = null) {
    let frame = ar.i_ci;
    if (what[0] === '>') { frame = { fn, prototype: fn?.prototype, what: fn?.prototype ? (fn.prototype.linedefined === 0 ? 'main' : 'Lua') : 'C' }; what = what.slice(1); }
    if (!frame) throw new LuaError('invalid debug activation');
    const proto = frame.prototype, isC = frame.what === 'C'; let status = 1;
    for (const option of what) {
      if (option === 'S') {
        ar.what = frame.what; ar.source = isC ? '=[C]' : (frame.source ?? proto?.source ?? proto?.name ?? '=?');
        ar.srclen = ar.source.length; ar.short_src = luaChunkId(ar.source);
        ar.linedefined = isC ? -1 : proto?.linedefined ?? 0; ar.lastlinedefined = isC ? -1 : proto?.lastlinedefined ?? 0;
      } else if (option === 'l') ar.currentline = isC ? -1 : frame.currentline ?? -1;
      else if (option === 'u') { ar.nups = frame.fn?.upvalues?.length ?? proto?.upvalues?.length ?? 0; ar.nparams = isC ? 0 : proto?.numparams ?? proto?.params?.length ?? 0; ar.isvararg = Number(isC || Boolean(proto?.is_vararg ?? proto?.vararg)); }
      else if (option === 't') ar.istailcall = frame.istailcall ? 32 : 0;
      else if (option === 'n') { ar.name = frame.istailcall ? null : frame.name ?? null; ar.namewhat = frame.istailcall ? '' : frame.namewhat ?? ''; }
      else if (option === 'r') { ar.ftransfer ??= 0; ar.ntransfer ??= 0; }
      else if (option === 'f') ar.func = frame.fn;
      else if (option === 'L') {
        ar.activelines = isC ? null : new Set();
        if (!isC) for (let pc = (proto?.is_vararg ?? proto?.vararg) ? 1 : 0; pc < (proto?.code?.length ?? proto?.lines?.length ?? proto?.lineinfo?.length ?? 0); pc++) { const line = luaFunctionLine(proto, pc); if (line >= 0) ar.activelines.add(line); }
      } else status = 0;
    }
    return status;
  }
  captureError(thread, error) {
    if (error && typeof error === 'object' && !error.luaDebugFrames) error.luaDebugFrames = this.thread(thread).frames.map(frame => ({ ...frame }));
    return error;
  }
  traceback(thread, message = null, level = 0, frames = null) {
    frames = frames ?? this.thread(thread).frames;
    const view = frames.slice().reverse(), last = view.length - 1;
    let text = message === null ? '' : cstring(message) + '\n'; text += 'stack traceback:';
    let limit = last - level > 21 ? 10 : -1;
    while (level <= last) {
      const frame = view[level++];
      if (limit-- === 0) { const skip = last - level - 11 + 1; text += `\n\t...\t(skipping ${skip} levels)`; level += skip; continue; }
      const ar = { i_ci: frame }; this.getinfo(thread, 'Slnt', ar);
      text += `\n\t${ar.short_src}${ar.currentline > 0 ? ':' + ar.currentline : ''}: in `;
      const global = this.resolveGlobalName?.(frame.fn);
      text += global ? `function '${global}'` : ar.namewhat ? `${ar.namewhat} '${ar.name}'` : ar.what === 'main' ? 'main chunk' : ar.what !== 'C' ? `function <${ar.short_src}:${ar.linedefined}>` : '?';
      if (ar.istailcall) text += '\n\t(...tail calls...)';
    }
    return text;
  }
  where(thread, level = 1) { const ar = {}; if (!this.getstack(thread, level, ar)) return ''; this.getinfo(thread, 'Sl', ar); return ar.currentline > 0 ? `${ar.short_src}:${ar.currentline}: ` : ''; }
}

export class LuaMemoryError extends LuaError {
  constructor() { super('not enough memory'); this.status = LUA_ERRMEM; }
}
export class LuaTimeLimitError extends Error {
  constructor(sid, name) { super(`Lua time exceeded ${sid}:${name ?? '(unknown)'}`); this.name = 'LuaTimeLimitError'; }
}
export class NethackLuaBudget {
  constructor({ steps = 0, perpcall = 0, stepSize = 1000, sid = 0, name = null } = {}) {
    for (const value of [steps, perpcall, stepSize]) if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) throw new RangeError('invalid Lua instruction budget');
    if (!stepSize) throw new RangeError('zero Lua step size');
    this.steps = perpcall ? 0 : steps; this.osteps = perpcall ? 0 : steps; this.perpcall = perpcall; this.stepSize = stepSize; this.sid = sid; this.name = name; this.statctr = 0;
  }
  beginPcall(name = null) { if (name !== null) this.name = name; if (this.perpcall) { this.steps = this.perpcall; this.statctr = 0; } }
  hook() { if (this.steps <= this.stepSize) throw new LuaTimeLimitError(this.sid, this.name); this.steps -= this.stepSize; this.statctr++; }
  install(debug, thread) { if (this.steps || this.perpcall) debug.sethook(thread, () => this.hook(), LUA_MASKCOUNT, this.stepSize); }
}

/* The callback is a real Lua lua_Alloc: (ud,ptr,osize,nsize)->ptr|null.
 * Callback failure leaves the old block/total intact. No hidden JS heap
 * estimates or synthetic native headers are included in `bytes`.
 */
export class LuaAllocationTracker {
  constructor({ allocator, userdata = null, memlimit = 0, collect = null, onAllocated = null } = {}) {
    if (typeof allocator !== 'function') throw new TypeError('Lua allocator required');
    this.allocator = allocator; this.userdata = userdata; this.memlimit = memlimit; this.collect = collect; this.onAllocated = onAllocated;
    this.blocks = new Map(); this.bytes = 0; this.ready = false; this.collecting = false;
  }
  getallocf(output = null) { if (output) output.value = this.userdata; return this.allocator; }
  setallocf(allocator, userdata) { if (typeof allocator !== 'function') throw new TypeError('Lua allocator required'); this.allocator = allocator; this.userdata = userdata; }
  realloc(ptr, osize, nsize, { safe = true, retry = true } = {}) {
    ptr ??= null;
    for (const size of [osize, nsize]) if (!Number.isSafeInteger(size) || size < 0) throw new RangeError('invalid Lua allocation size');
    const previous = ptr === null ? 0 : this.blocks.get(ptr);
    if (previous === undefined || ptr !== null && previous !== osize) throw new Error('Lua allocator block/size mismatch');
    const attempt = () => {
      // NetHack checks current memory, NOT projected memory. Equality and one
      // allocation beyond the limit are intentionally allowed; even shrinking
      // can fail once already above the limit. Freeing never checks the limit.
      if (nsize && this.ready && this.memlimit && this.bytes > this.memlimit) return null;
      return this.allocator(this.userdata, ptr, osize, nsize) ?? null;
    };
    let result = attempt();
    if (nsize && result === null && retry && this.ready && !this.collecting && this.collect) {
      this.collecting = true; try { this.collect(); } finally { this.collecting = false; }
      result = attempt();
    }
    if (nsize && result === null) { if (safe) throw new LuaMemoryError(); return null; }
    if (nsize && this.blocks.has(result) && result !== ptr) throw new Error('Lua allocator returned an already live block');
    if (ptr !== null) this.blocks.delete(ptr);
    if (nsize) this.blocks.set(result, nsize);
    this.bytes += nsize - previous;
    this.onAllocated?.(nsize - previous);
    return nsize ? result : null;
  }
  count() { return Math.floor(this.bytes / 1024); }
  countb() { return this.bytes % 1024; }
}

export class LuaDiagnostics {
  constructor() { this.panic = null; this.warn = null; this.warnData = null; }
  atpanic(callback) { const previous = this.panic; this.panic = callback; return previous; }
  setwarnf(callback, userdata) { this.warn = callback; this.warnData = userdata; }
  warning(message, continued = false) { this.warn?.(this.warnData, cstring(message), Number(Boolean(continued))); }
  unprotected(state, error) { this.panic?.(state, error); throw error; }
}
export function createNethackWarningHandler(log, size = 256) {
  if (typeof log !== 'function' || !Number.isInteger(size) || size < 1) throw new TypeError('invalid warning log/buffer');
  let buffer = '';
  return (_userdata, fragment, continued) => { if (fragment !== null) buffer += cstring(fragment).slice(0, size - 1 - buffer.length); if (!continued) { log('[lua]', buffer); buffer = ''; } };
}
