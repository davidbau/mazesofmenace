/* Retained Lua5.4.8 ldblib.c facilities. NetHack's original C DROPIF removes
 * debug/gethook/sethook. Unpublished registration includes those names with
 * throwing guards; the configured C filter removes them before exposure.
 * Lua notice: lua/lobject.js. Stack slots and closure cells remain live VM
 * objects: writes are immediately visible to executing bytecode. */
import { LuaTable, LuaUserdata, LuaLightUserdata, LuaThread, LuaError, luaType, isLuaString, luaStringBytes, numberToString, toInteger, toNumber } from './lua/lobject.js';
import { prepareLibrary } from './lua/llib.js';
export const LUA_DEBUG_REGISTRATION = Object.freeze(['debug','getuservalue','gethook','getinfo','getlocal','getregistry','getmetatable','getupvalue','upvaluejoin','upvalueid','setuservalue','sethook','setlocal','setmetatable','setupvalue','traceback','setcstacklimit']);
const isFunction = fn => typeof fn === 'function' || fn?.luaClosure || fn?.luaYieldable;
const check = (valid, name, index, detail) => { if (!valid) throw new LuaError(`bad argument #${index} to '${name}' (${detail})`); };
const integer = (value, name, index) => { const result = toInteger(value); check(result !== null, name, index, toNumber(value)!==null?'number has no integer representation':`number expected, got ${value===undefined?'no value':luaType(value)}`); return Number(BigInt.asIntN(32, result)); };
const string = (value, fallback, name, index) => {
  if (value === null || value === undefined) return fallback;
  if (isLuaString(value)) return luaStringBytes(value).split('\0')[0];
  if (typeof value === 'number' || typeof value === 'bigint') return numberToString(value);
  check(false, name, index, `string expected, got ${luaType(value)}`);
};
export function installLuaDebugNames(vm, registry) {
  if(vm.debug.nameRegistry===registry)return;
  const findName=(table,fn,depth)=>{if(!(table instanceof LuaTable)||!depth)return null;for(const[key,value]of table.values){if(!isLuaString(key))continue;const name=luaStringBytes(key);if(value===fn)return name;const child=findName(value,fn,depth-1);if(child!==null)return name+'.'+child;}return null;};
  const previousResolver=vm.debug.resolveGlobalName;
  vm.debug.resolveGlobalName=fn=>previousResolver?.(fn)??findName(registry.rawget('_LOADED'),fn,2)?.replace(/^_G\./,'')??findName(vm.globals,fn,2);
  vm.debug.nameRegistry=registry;
}
export function createDebugFunctions(vm, { registry = null } = {}) {
  registry ??= vm.debugRegistry ?? vm.registry;
  if (!(registry instanceof LuaTable)) throw new TypeError('Lua debug functions require the VM registry');
  vm.debugRegistry = registry;
  const functions = Object.create(null), cUpvalueIds = new WeakMap();
  installLuaDebugNames(vm, registry);
  const add = (name, invoke) => { const call=args=>{try{return invoke(args);}catch(error){if(error instanceof LuaError&&isLuaString(error.value)&&luaStringBytes(error.value).startsWith('bad argument #')){const frame=vm.debug.thread(vm.currentThread).frames.at(-1),resolved=frame?.name??vm.debug.resolveGlobalName?.(frame?.fn)??name;const value=vm.debug.where(vm.currentThread,1)+luaStringBytes(error.value).replace("to '"+name+"'","to '"+resolved+"'");const wrapped=new LuaError(value);wrapped.luaExplicit=true;throw wrapped;}throw error;}};const fn=(...args)=>call(args);fn.luaInvoke=call;functions[name]=fn; };
  const threadArgs = args => args[0] instanceof LuaThread ? { thread: args[0], offset: 1 } : { thread: vm.currentThread, offset: 0 };
  const activation = (args, name) => {
    const { thread, offset } = threadArgs(args), ar = {}, level = integer(args[offset], name, offset + 1);
    check(vm.debug.getstack(thread, level, ar), name, offset + 1, 'level out of range');
    return { thread, offset, frame: ar.i_ci };
  };
  const local = (thread, frame, index) => {
    if (frame.what === 'C') return index > 0 && index <= (frame.args?.length ?? 0) ? { name: '(C temporary)', values: frame.args, index: index - 1 } : null;
    if (index < 0) return -index <= (frame.state?.varargs.length ?? 0) ? { name: '(vararg)', values: frame.state.varargs, index: -index - 1 } : null;
    if (index === 0) return null;
    const proto = frame.prototype, live = (proto.locvars ?? []).filter(v => v.startpc <= frame.pc && frame.pc < v.endpc);
    if (index <= live.length) return { name: live[index - 1].varname, values: frame.registers, index: index - 1 };
    const limit = frame.callBase ?? frame.state?.top ?? frame.registers?.length ?? 0;
    return index <= limit ? { name: '(temporary)', values: frame.registers, index: index - 1 } : null;
  };
  const upvalue = (fn, index, name, argf = 1, argn = 2) => {
    check(isFunction(fn), name, argf, `function expected, got ${luaType(fn)}`);
    index = integer(index, name, argn) - 1;
    const values = fn.upvalues ?? [];
    if (index < 0 || index >= values.length) return null;
    if (fn.luaClosure) return { name: fn.prototype?.upvalues?.[index]?.name ?? '(no name)', cell: values[index], get: () => values[index].value, set: value => { values[index].value = vm.heap.adopt(value); vm.heap.barrierForward?.(values[index], value); } };
    let ids = cUpvalueIds.get(fn); if (!ids) { ids = []; cUpvalueIds.set(fn, ids); } ids[index] ??= {};
    return { name: '', cell: ids[index], get: () => values[index], set: value => { values[index] = vm.heap.adopt(value); vm.heap.barrierForward?.(fn, value); } };
  };
  add('getregistry', () => [registry]);
  add('getmetatable', args => { check(args.length > 0, 'getmetatable', 1, 'value expected'); return [vm.metatableOf(args[0])]; });
  add('setmetatable', args => { const value = args[0] ?? null, mt = args[1] ?? null; check(args.length>1&&(mt === null || mt instanceof LuaTable), 'setmetatable', 2, `nil or table expected, got ${args.length>1?luaType(mt):'no value'}`); vm.setMetatableOf(value, mt); return [value]; });
  add('getuservalue', args => { const n = args[1] == null ? 1 : integer(args[1], 'getuservalue', 2), value = args[0]; return value instanceof LuaUserdata && n > 0 && n <= value.uservalues.length ? [value.uservalues[n - 1] ?? null, true] : [null]; });
  add('setuservalue', args => {
    const value = args[0], n = args[2] == null ? 1 : integer(args[2], 'setuservalue', 3);
    check(value instanceof LuaUserdata, 'setuservalue', 1, `userdata expected, got ${luaType(value)}`); check(args.length > 1, 'setuservalue', 2, 'value expected');
    if (n < 1 || n > value.uservalues.length) return [null];
    value.uservalues[n - 1] = vm.heap.adopt(args[1]); vm.heap.barrierForward?.(value, args[1]); return [value];
  });
  add('getinfo', args => {
    const { thread, offset } = threadArgs(args), target = args[offset], options = string(args[offset + 1], 'flnSrtu', 'getinfo', offset + 2), ar = {};
    check(!options.startsWith('>'), 'getinfo', offset + 2, "invalid option '>'");
    const fn = isFunction(target);
    if (!fn && !vm.debug.getstack(thread, integer(target, 'getinfo', offset + 1), ar)) return [null];
    check(vm.debug.getinfo(thread, (fn ? '>' : '') + options, ar, fn ? target : null), 'getinfo', offset + 2, 'invalid option');
    const result = new LuaTable(), put = (name, value) => result.rawset(name, value ?? null);
    if (options.includes('S')) for (const key of ['source', 'short_src', 'linedefined', 'lastlinedefined', 'what']) put(key, typeof ar[key] === 'number' ? BigInt(ar[key]) : ar[key]);
    if (options.includes('l')) put('currentline', BigInt(ar.currentline));
    if (options.includes('u')) { put('nups', BigInt(ar.nups)); put('nparams', BigInt(ar.nparams)); put('isvararg', Boolean(ar.isvararg)); }
    if (options.includes('n')) { put('name', ar.name); put('namewhat', ar.namewhat); }
    if (options.includes('r')) { put('ftransfer', BigInt(ar.ftransfer)); put('ntransfer', BigInt(ar.ntransfer)); }
    if (options.includes('t')) put('istailcall', Boolean(ar.istailcall));
    if (options.includes('f')) put('func', ar.func);
    if (options.includes('L')) put('activelines', ar.activelines === null ? null : new LuaTable([...ar.activelines].map(line => [BigInt(line), true])));
    return [result];
  });
  add('getlocal', args => {
    const { thread, offset } = threadArgs(args), target = args[offset], index = integer(args[offset + 1], 'getlocal', offset + 2);
    if (isFunction(target)) { const names = (target.prototype?.locvars ?? []).filter(v => v.startpc <= 0 && 0 < v.endpc); return [index > 0 ? names[index - 1]?.varname ?? null : null]; }
    const { frame } = activation(args, 'getlocal'), slot = local(thread, frame, index);
    return slot ? [slot.name, slot.values[slot.index] ?? null] : [null];
  });
  add('setlocal', args => {
    const { thread, offset, frame } = activation(args, 'setlocal'), index = integer(args[offset + 1], 'setlocal', offset + 2);
    check(args.length > offset + 2, 'setlocal', offset + 3, 'value expected');
    const slot = local(thread, frame, index); if (!slot) return [null]; slot.values[slot.index] = vm.heap.adopt(args[offset + 2]); return [slot.name];
  });
  add('getupvalue', args => { const slot = upvalue(args[0], args[1], 'getupvalue'); return slot ? [slot.name, slot.get() ?? null] : []; });
  add('setupvalue', args => { check(args.length > 2, 'setupvalue', 3, 'value expected'); const slot = upvalue(args[0], args[1], 'setupvalue'); if (!slot) return []; slot.set(args[2]); return [slot.name]; });
  add('upvalueid', args => { const slot = upvalue(args[0], args[1], 'upvalueid'); return [slot ? new LuaLightUserdata(slot.cell) : null]; });
  add('upvaluejoin', args => {
    const a = upvalue(args[0], args[1], 'upvaluejoin'), b = upvalue(args[2], args[3], 'upvaluejoin', 3, 4);
    check(a, 'upvaluejoin', 2, 'invalid upvalue index'); check(b, 'upvaluejoin', 4, 'invalid upvalue index');
    check(args[0]?.luaClosure, 'upvaluejoin', 1, 'Lua function expected'); check(args[2]?.luaClosure, 'upvaluejoin', 3, 'Lua function expected');
    args[0].upvalues[integer(args[1], 'upvaluejoin', 2) - 1] = b.cell; vm.heap.barrierForward?.(args[0], b.cell); return [];
  });
  // Lua5.4.8 lstate.c deliberately ignores the requested limit and returns its
  // configured LUAI_MAXCCALLS. This is the real upstream implementation.
  add('setcstacklimit', args => { integer(args[0], 'setcstacklimit', 1); return [200n]; });
  add('traceback', args => {
    const { thread, offset } = threadArgs(args); let message = args[offset] ?? null;
    if (typeof message === 'number' || typeof message === 'bigint') message = numberToString(message);
    if (message !== null && !isLuaString(message)) return [message];
    const level = args[offset + 1] == null ? thread === vm.currentThread ? 1 : 0 : integer(args[offset + 1], 'traceback', offset + 2);
    return [vm.debug.traceback(thread, message === null ? null : luaStringBytes(message), level)];
  });
  return functions;
}

export function openDebugLibrary(vm, { registry = null, publish = true, filtered = true } = {}) {
  const library = prepareLibrary(vm, LUA_DEBUG_REGISTRATION);
  try {
    const functions = createDebugFunctions(vm, { registry });
    for (const name of LUA_DEBUG_REGISTRATION) library.rawset(name, functions[name] ?? (() => { throw new LuaError(`debug.${name} is excluded by NetHack's configured sandbox`); }));
    const table = library.finish();
    if (filtered) for (const name of ['debug', 'gethook', 'sethook']) table.rawset(name, null);
    if (publish) vm.setGlobal('debug', table);
    return table;
  } finally { library.release(); }
}
