/* Bounded Lua5.4 C-API migration, references lapi.c/lauxlib.c; lobject.js notice.
 * JavaScript state/indices/values replace C pointers. Native callbacks accept
 * this LuaState and return a result count, with values pushed on its stack.
 * Logical GC/counts/finalizers/close are explicit, allocator-owned lifecycle.
 * Native allocation cadence and C continuation/debug convenience APIs remain.
 */
import { LuaVM } from './lvm.js';
import { createLua } from './lua.js';
import { parse } from './lparser.js';
import { LuaTable, LuaUserdata, LuaLightUserdata, LuaThread, LuaError, isLuaString, luaStringBytes, appendLuaValues, luaValues, rawEqual, luaType, truth, toInteger, toNumber, numberToString, byteString } from './lobject.js';
import { LUA_GCCOLLECT } from './lgc.js';
export const LUA_OK = 0, LUA_ERRRUN = 2, LUA_ERRSYNTAX = 3, LUA_MULTRET = -1;
export const LUA_REGISTRYINDEX = -1001000;
export const LUA_TNONE = -1, LUA_TNIL = 0, LUA_TBOOLEAN = 1, LUA_TLIGHTUSERDATA = 2, LUA_TNUMBER = 3, LUA_TSTRING = 4, LUA_TTABLE = 5, LUA_TFUNCTION = 6, LUA_TUSERDATA = 7, LUA_TTHREAD = 8;
const tags = { nil: 0, boolean: 1, number: 3, string: 4, table: 5, function: 6, userdata: 7, thread: 8 };
const MAXSTACK = 1000000; // Lua5.4.8's configured LUAI_MAXSTACK, excluding reserves.
export const lua_upvalueindex = i => LUA_REGISTRYINDEX - i;
export class LuaState {
  constructor({ libraries = false, userdataFactory = null, vmFactory = null, ...options } = {}) {
    this.vm = vmFactory ? vmFactory({...options,libraries,memoryReady:false}):libraries?createLua({...options,memoryReady:false}):new LuaVM({...options,memoryReady:false});
    this.stack=luaValues(); this.upvalues = []; this.closed = false;
    this.userdataFactory = userdataFactory; this.callbackRoots = [];
    try { this.registry = new LuaTable([[1n, this.vm.mainThread], [2n, this.vm.globals], ['_LOADED', new LuaTable()]]);
    this.vm.heap.adopt(this.registry); this.vm.heap.memoryTracker.ready = true; this.releaseRoots = this.vm.heap.addRoots(() => [this.registry, this.stack, this.upvalues, this.callbackRoots]); } catch (error) { this.vm.heap.close(); throw error; }
  }
  ensure() { if (this.closed) throw new LuaError('Lua state is closed'); }
  lua_gettop() { this.ensure(); return this.stack.length; }
  lua_absindex(index) { return index > 0 || index <= LUA_REGISTRYINDEX ? index : this.stack.length + index + 1; }
  has(index) { index = this.lua_absindex(index); return index === LUA_REGISTRYINDEX || index < LUA_REGISTRYINDEX ? index === LUA_REGISTRYINDEX || LUA_REGISTRYINDEX - index <= this.upvalues.length : index > 0 && index <= this.stack.length; }
  value(index) {
    this.ensure(); index = this.lua_absindex(index);
    if (index === LUA_REGISTRYINDEX) return this.registry;
    if (index < LUA_REGISTRYINDEX) return this.upvalues[LUA_REGISTRYINDEX - index - 1] ?? null;
    return this.stack[index - 1] ?? null;
  }
  replace(index, value) {
    index = this.lua_absindex(index);
    if (!this.has(index) || index === LUA_REGISTRYINDEX) throw new LuaError('invalid stack index');
    if (index < LUA_REGISTRYINDEX) this.upvalues[LUA_REGISTRYINDEX - index - 1] = value;
    else this.stack[index - 1] = value;
  }
  push(value) { this.ensure(); if (this.stack.length >= MAXSTACK) throw new LuaError('stack overflow'); value = this.vm.heap.adopt(value); this.stack.push(value ?? null); this.vm.heap.resizeThread(this.vm.currentThread, this.stack.length); }
  popOne() { if (!this.stack.length) throw new LuaError('stack underflow'); return this.stack.pop(); }
  lua_settop(index) {
    this.ensure(); const top = index >= 0 ? index : this.stack.length + index + 1;
    if (top < 0 || top > MAXSTACK) throw new LuaError('invalid stack top');
    while (this.stack.length < top) this.push(null); this.stack.length = top;
  }
  lua_checkstack(extra) { return Number.isInteger(extra) && extra >= 0 && this.stack.length + extra <= MAXSTACK ? 1 : 0; }
  lua_pop(n) { this.lua_settop(-n - 1); }
  lua_pushvalue(index) { this.push(this.value(index)); }
  lua_copy(from, to) { this.replace(to, this.value(from)); }
  lua_rotate(index, count) {
    index = this.lua_absindex(index) - 1;
    if (index < 0 || index >= this.stack.length) throw new LuaError('invalid stack index');
    const size = this.stack.length - index;
    if (Math.abs(count) > size) throw new LuaError('invalid rotation count');
    const normalized = (count % size + size) % size;
    if (normalized) this.stack.splice(index, 0, ...this.stack.splice(this.stack.length - normalized));
  }
  lua_insert(index) { this.lua_rotate(index, 1); }
  lua_remove(index) { index = this.lua_absindex(index); if (index <= 0 || index > this.stack.length) throw new LuaError('invalid stack index'); this.stack.splice(index - 1, 1); }
  lua_replace(index) { this.lua_copy(-1, index); this.lua_pop(1); }
  lua_pushnil() { this.push(null); }
  lua_pushboolean(value) { this.push(Boolean(value)); }
  lua_pushinteger(value) { this.push(BigInt.asIntN(64, BigInt(value))); }
  lua_pushnumber(value) { this.push(Number(value)); }
  lua_pushlstring(value, length) { value = value instanceof Uint8Array ? byteString(value) : value; value = value.slice(0, length); this.push(value);this.vm.heap.checkpoint(); return this.value(-1); }
  lua_pushstring(value) { value = value === null ? null : luaStringBytes(value).split('\0')[0]; this.push(value);this.vm.heap.checkpoint(); return this.value(-1); }
  lua_pushliteral(value) { return this.lua_pushlstring(value, value.length); }
  lua_pushlightuserdata(value){this.push(new LuaLightUserdata(value));}
  lua_type(index) {if(this.value(index) instanceof LuaLightUserdata)return LUA_TLIGHTUSERDATA; return this.has(index) ? tags[luaType(this.value(index))] ?? LUA_TTHREAD : LUA_TNONE; }
  lua_typename(tag) { return tag === -1 ? 'no value' : Object.keys(tags).find(key => tags[key] === tag) ?? 'userdata'; }
  luaL_typename(index) { return this.lua_typename(this.lua_type(index)); }
  lua_rawequal(a,b) { return Number(this.has(a) && this.has(b) && rawEqual(this.value(a),this.value(b))); }
  lua_isnil(index) { return this.lua_type(index) === LUA_TNIL; }
  lua_isnoneornil(index) { return this.lua_type(index) <= LUA_TNIL; }
  lua_istable(index) { return this.lua_type(index) === LUA_TTABLE; }
  lua_isinteger(index) { return typeof this.value(index) === 'bigint'; }
  lua_isnumber(index) { return toNumber(this.value(index)) !== null; }
  lua_isstring(index) { return [LUA_TSTRING, LUA_TNUMBER].includes(this.lua_type(index)); }
  lua_iscfunction(index) { return typeof this.value(index) === 'function'; }
  lua_toboolean(index) { return truth(this.value(index)); }
  lua_tointegerx(index, valid = null) { const value = toInteger(this.value(index)); if (valid) valid.value = Number(value !== null); return value ?? 0n; }
  lua_tointeger(index) { return this.lua_tointegerx(index); }
  lua_tonumberx(index, valid = null) { const value = toNumber(this.value(index)); if (valid) valid.value = Number(value !== null); return value === null ? 0 : Number(value); }
  lua_tonumber(index) { return this.lua_tonumberx(index); }
  lua_tolstring(index, length = null) {
    let value = this.value(index);
    if (luaType(value) === 'number') { value = numberToString(value); this.replace(index, value); }
    if (!isLuaString(value)) { if (length) length.value = 0; return null; }
    if (length) length.value = value.length; return luaStringBytes(value);
  }
  lua_tostring(index) { return this.lua_tolstring(index); }
  lua_touserdata(index) { const value = this.value(index); return value instanceof LuaUserdata||value instanceof LuaLightUserdata ? value.value : null; }
  lua_topointer(index) { const value=this.value(index);if(value instanceof LuaLightUserdata)return value.value; return typeof value === 'function' || value?.luaClosure || value instanceof LuaTable || value instanceof LuaUserdata || value instanceof LuaThread || isLuaString(value) ? value : null; }
  lua_createtable(arraySize = 0, hashSize = 0) { this.push(new LuaTable([], { arraySize, hashSize }));this.vm.heap.checkpoint(); }
  lua_newtable() { this.lua_createtable(); }
  lua_pushglobaltable() { this.push(this.vm.globals); }
  lua_getglobal(name) { const value = this.vm.get(this.vm.globals, name); this.push(value); return this.lua_type(-1); }
  lua_setglobal(name) { this.vm.set(this.vm.globals, name, this.popOne()); }
  lua_getfield(index, key) { const value = this.vm.get(this.value(index), key); this.push(value); return this.lua_type(-1); }
  lua_setfield(index, key) { const table = this.value(index); this.vm.set(table, key, this.popOne()); }
  lua_geti(index, key) { const value = this.vm.get(this.value(index), BigInt(key)); this.push(value); return this.lua_type(-1); }
  lua_seti(index, key) { const table = this.value(index); this.vm.set(table, BigInt(key), this.popOne()); }
  lua_gettable(index) { const table = this.value(index); const value = this.vm.get(table, this.popOne()); this.push(value); return this.lua_type(-1); }
  lua_settable(index) { const table = this.value(index); const value = this.popOne(), key = this.popOne(); this.vm.set(table, key, value); }
  lua_rawget(index) { const table = this.value(index); if (!(table instanceof LuaTable)) throw new LuaError('table expected'); const value = table.rawget(this.popOne()); this.push(value); return this.lua_type(-1); }
  lua_rawset(index) { const table = this.value(index); if (!(table instanceof LuaTable)) throw new LuaError('table expected'); const value = this.popOne(), key = this.popOne(); table.rawset(key, value); }
  lua_rawgeti(index, key) { const table = this.value(index); if (!(table instanceof LuaTable)) throw new LuaError('table expected'); this.push(table.rawget(BigInt(key))); return this.lua_type(-1); }
  lua_rawseti(index, key) { const table = this.value(index); if (!(table instanceof LuaTable)) throw new LuaError('table expected'); table.rawset(BigInt(key), this.popOne()); }
  lua_next(index) { const table = this.value(index); if (!(table instanceof LuaTable)) throw new LuaError('table expected'); const values = table.next(this.popOne()); if (values[0] === null) return 0; this.stack.push(...values); return 1; }
  lua_len(index) { this.push(this.vm.length(this.value(index))); }
  lua_rawlen(index) { const value = this.value(index); return isLuaString(value) ? value.length : value instanceof LuaTable ? Number(value.length()) : value instanceof LuaUserdata ? value.size : 0; }
  lua_getmetatable(index) { const value = this.value(index); const mt=this.vm.metatableOf(value); if (!mt) return 0; this.push(mt); return 1; }
  lua_setmetatable(index){const value=this.value(index),mt=this.popOne();this.vm.setMetatableOf(value,mt);return 1;}
  lua_newuserdatauv(size, uservalueCount = 1) {
    if (!Number.isInteger(size) || size < 0 || size > 10000000) throw new LuaError('invalid userdata size');
    const allocation = this.userdataFactory ? this.userdataFactory(size, uservalueCount, this) : { value: new Uint8Array(size), release: null };
    if (!allocation || !('value' in allocation)) throw new LuaError('userdata allocator failed');
    const data = allocation.value;
    this.push(this.vm.heap.with(() => new LuaUserdata(data, null, Array(uservalueCount).fill(null), size, allocation.release ?? null)));
    this.vm.heap.checkpoint();return data;
  }
  lua_newuserdata(size) { return this.lua_newuserdatauv(size, 1); }
  lua_pushcclosure(callback, count = 0) {
    if (count < 0 || count > 255 || count > this.stack.length) throw new LuaError('invalid upvalue count');
    const state = this, upvalues = this.stack.splice(this.stack.length - count, count);
    const invoke = function (args) {
      const previous = [state.stack, state.upvalues]; state.stack = args.slice(); state.upvalues = upvalues;
      state.callbackRoots.push(previous);
      try {
        const count = callback(state);
        if (!Number.isInteger(count) || count < 0 || count > state.stack.length) throw new LuaError('invalid native callback result count');
        return count ? state.stack.slice(-count) : [];
      } finally { [state.stack, state.upvalues] = previous; state.callbackRoots.pop(); }
    };
    const wrapped = function(...args){return invoke(args)}; wrapped.luaInvoke=invoke;
    wrapped.luaNativeCallback = callback; wrapped.upvalues = upvalues;
    if (count) wrapped.luaGcRoots = upvalues;
    this.push(wrapped);if(count)this.vm.heap.checkpoint();
  }
  lua_pushcfunction(callback) { this.lua_pushcclosure(callback, 0); }
  invoke(nargs, nresults, protectedCall, handlerIndex = 0) {
    if (nargs < 0 || this.stack.length < nargs + 1) throw new LuaError('invalid call arguments');
    const handler = handlerIndex === 0 ? null : this.value(handlerIndex);
    const start = this.stack.length - nargs - 1;
    const [fn, ...args] = this.stack.splice(start);
    try {
      const values = protectedCall ? this.vm.run(this.vm.protectedCallG(fn,args,handler),{boundary:false}) : this.vm.call(fn,args);
      if (nresults === LUA_MULTRET) for(const value of values)this.push(value);
      else for (let i = 0; i < nresults; i++) this.push(values[i] ?? null);
      return LUA_OK;
    } catch (error) {
      if (!protectedCall || !(error instanceof LuaError)) throw error;
      error = this.vm.closeError(error); this.vm.lastError=error;let value=error.value; this.push(value); return error.status ?? LUA_ERRRUN;
    }
  }
  lua_call(nargs, nresults) { this.invoke(nargs, nresults, false); }
  lua_pcall(nargs, nresults, handler = 0) { return this.invoke(nargs, nresults, true, handler); }
  lua_error() { const error=new LuaError(this.value(-1));error.luaExplicit=true;throw error; }
  luaL_loadbuffer(source, size, name = 'chunk', mode = null) {
    source = source instanceof Uint8Array ? source.subarray(0,size) : luaStringBytes(source).slice(0,size);
    try {
      const binary = source instanceof Uint8Array ? source[0] === 27 : source.charCodeAt(0) === 27;
      if (mode !== null && !luaStringBytes(mode).includes(binary ? 'b' : 't')) throw new LuaError(`attempt to load a ${binary?'binary':'text'} chunk (mode is '${mode}')`);
      if (binary) {
        if (typeof this.vm.loadBinary !== 'function') throw new LuaError('binary chunks require the Lua bytecode backend');
        this.push(this.vm.loadBinary(typeof source === 'string' ? Uint8Array.from(source,c=>c.charCodeAt(0)) : source,name));
      } else this.push(this.vm.compile(source,name));
      return LUA_OK;
    } catch(error) { if(!(error instanceof LuaError))throw error; this.push(error.value);return error.status??LUA_ERRSYNTAX; }
  }
  luaL_loadstring(source) { return this.luaL_loadbuffer(source.split('\0')[0], source.split('\0')[0].length, source); }
  luaL_checktype(index, tag) { if (this.lua_type(index) !== tag) throw new LuaError(`${this.lua_typename(tag)} expected, got ${this.luaL_typename(index)}`); }
  luaL_checkinteger(index) { const n = toInteger(this.value(index)); if (n === null) throw new LuaError('integer expected'); return n; }
  luaL_optinteger(index, fallback) { return this.lua_isnoneornil(index) ? fallback : this.luaL_checkinteger(index); }
  luaL_checkstring(index) { const value = this.lua_tostring(index); if (value === null) throw new LuaError('string expected'); return value; }
  luaL_optstring(index, fallback) { return this.lua_isnoneornil(index) ? fallback : this.luaL_checkstring(index); }
  luaL_checkoption(index, fallback, options) { const value = this.luaL_optstring(index, fallback); const at = options.indexOf(value); if (at < 0) throw new LuaError('invalid option'); return at; }
  luaL_newmetatable(name) {
    const current = this.registry.rawget(name); if (current !== null) { this.push(current); return 0; }
    const mt = new LuaTable([['__name', name]]); this.registry.rawset(name, mt); this.push(mt); return 1;
  }
  luaL_getmetatable(name) { this.push(this.registry.rawget(name)); return this.lua_type(-1); }
  luaL_checkudata(index, name) {
    const value = this.value(index), expected = this.registry.rawget(name);
    if (!(value instanceof LuaUserdata) || expected === null || value.metatable === null || value.metatable !== expected) throw new LuaError(`${name} expected`);
    return value.value;
  }
  luaL_setfuncs(functions, count = 0) {
    const table = this.value(-(count + 1));
    if (!(table instanceof LuaTable) || count < 0 || count > this.stack.length - 1) throw new LuaError('invalid function table/upvalues');
    const captures = count ? this.stack.slice(-count) : [];
    for (const [name, callback] of Object.entries(functions)) {
      appendLuaValues(this.stack,captures); this.lua_pushcclosure(callback, count); table.rawset(name, this.popOne());
    }
    this.lua_pop(count);
  }
  luaL_newlib(functions) { this.lua_newtable(); this.luaL_setfuncs(functions); }
  luaL_requiref(name, opener, global) {
    const loaded = this.registry.rawget('_LOADED'); let module = loaded.rawget(name);
    if (!truth(module)) { this.lua_pushcfunction(opener); this.lua_pushstring(name); this.lua_call(1, 1); module = this.value(-1); loaded.rawset(name, module); }
    else this.push(module);
    if (global) this.vm.setGlobal(name, module);
  }
  unsupported(name) { throw new LuaError(`${name} requires unfinished Lua GC/coroutine/debug/allocator migration`); }
  lua_gc(operation=LUA_GCCOLLECT,...args){return this.vm.heap.control(operation,...args);}
  lua_close() { this.ensure(); this.vm.heap.close(); this.releaseRoots(); this.stack.length = 0; this.closed = true; }
  lua_resetthread() { const result = this.vm.closeThread(this.vm.currentThread, true); this.stack.length = 0; this.vm.currentThread.status = this.vm.currentThread.main ? 'running' : 'dead'; if (!result[0]) this.push(result[1]); return result[0] ? LUA_OK : LUA_ERRRUN; }
  lua_sethook() { return this.unsupported('lua_sethook/opcode hooks'); }
  lua_getstack() { return this.unsupported('lua_getstack'); }
  lua_getinfo() { return this.unsupported('lua_getinfo'); }
  lua_getallocf() { return this.unsupported('lua_getallocf'); }
  lua_atpanic() { return this.unsupported('lua_atpanic'); }
  lua_setwarnf() { return this.unsupported('lua_setwarnf'); }
  luaL_traceback() { return this.unsupported('luaL_traceback'); }
  luaL_openlibs() { throw new LuaError('complete Lua standard libraries are not implemented; use explicit bounded libraries option'); }
}
export const createLuaCState = options => new LuaState(options);
