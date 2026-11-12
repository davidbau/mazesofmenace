/* Lua5.4 C ABI adapter. Interpreter/collector/library semantics live in lua/.
 * Only the supplied linear-memory/function-table services touch the host VM.
 * Instances own state handles, callback errors and C string storage. Native
 * strings are byte strings, never implicit UTF-8 conversions. */
import {luaAuxError} from './aux-error.js';
import {openLuaIO} from './io-library.js';
import { createLuaCState } from './lapi.js';
import { LuaError, LuaTable, LuaUserdata, LuaLightUserdata, LuaThread, byteString, isLuaString, luaStringBytes, toInteger, numberToString } from './lobject.js';
import { openBase, openTable } from './lbaselib.js';
import { openMath } from './lmathlib.js';
import { openString } from './lstrlib.js';
import { openUtf8 } from './lutf8lib.js';
import { openCoroutine } from './lcorolib.js';
import { LuaMemoryError } from './debug.js';
import { openDebugLibrary, installLuaDebugNames } from './debug-library.js';
import { createBaseIOFunctions } from './base-io.js';
import { luaSortEntropy } from './table-sort.js';
import { openLuaOS } from './os-library.js';
import { createLuaOSServices } from './os-abi.js';

const i32 = value => Number(BigInt.asIntN(32, BigInt(value)));
const i64 = value => BigInt.asIntN(64, BigInt(value));
const address = value => {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 0) throw new LuaError('invalid Lua ABI address');
  return n;
};
const bits = new DataView(new ArrayBuffer(8));
const decodeNumber = value => { bits.setBigUint64(0, BigInt.asUintN(64, value), true); return bits.getFloat64(0, true); };
const encodeNumber = value => { bits.setFloat64(0, value, true); return bits.getBigUint64(0, true); };

export function createLuaAbi(options = {}) {
  const states = new Map(), pending = new Map(), counters = Object.create(null);
  const transportLimit = options.transportLimit ?? 16 * 1024 * 1024;
  if (!Number.isSafeInteger(transportLimit) || transportLimit < 0) throw new RangeError('invalid Lua ABI transport budget');
  // Type-name pointers have static lifetime in the C Lua API.
  const constants = { strings: new Map(), owned: [], transportBytes: 0 };
  let services;
  function view() { return new DataView(services.heap().buffer); }
  function range(pointer, length = 1) {
    pointer = address(pointer); length = address(length);
    if (pointer + length > services.heap().length) throw new LuaError('Lua ABI address outside linear memory');
    return pointer;
  }
  function cstring(pointer) {
    pointer = address(pointer); if (!pointer) return null;
    const heap = services.heap(); range(pointer);
    const end = heap.indexOf(0, pointer);
    if (end < 0) throw new LuaError('unterminated Lua ABI byte string');
    return byteString(heap.subarray(pointer, end));
  }
  function pointerAt(pointer) { return address(view().getBigUint64(range(pointer, 8), true)); }
  function writePointer(pointer, value) { if (pointer) view().setBigUint64(range(pointer, 8), BigInt(value), true); }
  function writeInt(pointer, value) { if (pointer) view().setInt32(range(pointer, 4), value, true); }
  function get(handle) {
    const record = states.get(address(handle));
    if (!record) throw new LuaError('unknown or closed Lua state');
    return record;
  }
  function allocate(record, size) {
    const pointer = record?.allocator
      ? address(services.callback(record.allocator)(BigInt(record.allocatorData), 0n, 0n, BigInt(size)))
      : address(services.malloc(size));
    if (!pointer) throw new LuaMemoryError();
    range(pointer, size); return pointer;
  }
  function release(record, pointer, size) {
    if (record.allocator) services.callback(record.allocator)(BigInt(record.allocatorData), BigInt(pointer), BigInt(size), 0n);
    else services.free(pointer);
  }
  function transport(record, size) {
    // These are ABI mirrors, not additional interpreted-Lua objects. Calling
    // nhl_alloc for them would recursively charge storage a second time.
    // Retain pointers until close, with an explicit bounded transport budget;
    // this is separate from (and never a substitute for) Lua heap accounting.
    if (record.transportBytes + size > transportLimit) throw new LuaMemoryError();
    const pointer = address(services.malloc(size)); if (!pointer) throw new LuaMemoryError();
    range(pointer, size); record.transportBytes += size; record.owned.push([pointer,size]); return pointer;
  }
  function stringPointer(record, value) {
    if (value === null) return 0;
    if (record.strings.has(value)) return record.strings.get(value);
    const bytes = luaStringBytes(value);
    for (let i = 0; i < bytes.length; i++) if (bytes.charCodeAt(i) > 255) throw new LuaError('non-byte Lua ABI string');
    const pointer = transport(record, services.stringHeader() + bytes.length + 1) + services.stringHeader(), heap = services.heap();
    for (let i = 0; i < bytes.length; i++) {
      const byte = bytes.charCodeAt(i);
      heap[pointer + i] = byte;
    }
    heap[pointer + bytes.length] = 0; record.strings.set(value, pointer);
    return pointer;
  }
  function userdataPointer(value) {
    if (value === null) return 0;
    if (!value || !Number.isSafeInteger(value.pointer)) throw new LuaError('userdata is not backed by native Lua ABI storage');
    return value.pointer;
  }
  function threadHandle(record, thread) {
    if (thread === record.state.vm.mainThread) return record.handle;
    if (!record.threadHandles.has(thread)) {
      const handle = transport(record, 8);
      record.threadHandles.set(thread, handle); record.handles.add(handle); states.set(handle, record);
    }
    return record.threadHandles.get(thread);
  }
  function valuePointer(record, value) {
    if (value === null || value === undefined || typeof value === 'number' || typeof value === 'bigint' || typeof value === 'boolean') return 0;
    if (value instanceof LuaLightUserdata) {
      if (typeof value.value === 'bigint' || typeof value.value === 'number') return BigInt.asUintN(64, BigInt(value.value));
      value = value.value;
    }
    if (isLuaString(value)) return stringPointer(record, value) - services.stringHeader();
    if (value instanceof LuaThread) return threadHandle(record, value);
    if (value instanceof LuaUserdata) return userdataPointer(value.value);
    if (value.luaAbiCFunctionPointer) return value.luaAbiCFunctionPointer;
    if (!record.identities.has(value)) record.identities.set(value, transport(record, 1));
    return record.identities.get(value);
  }
  function native(record, pointer) {
    pointer = address(pointer);
    if (!pointer) throw new LuaError('null Lua C function');
    const callback = state => {
      const handle = threadHandle(record, state.vm.currentThread), result = services.call(pointer, handle);
      if (result < 0) {
        const error = pending.get(handle); pending.delete(handle);
        if (!error) throw new Error('native Lua callback failed without a Lua error');
        throw error;
      }
      return result;
    };
    callback.luaCFunctionPointer = pointer;
    return callback;
  }
  function pushNativeClosure(record, pointer, count) {
    const state = record.state; pointer = address(pointer);
    // Lua represents a zero-upvalue C function directly by its function
    // pointer. Repeated pushes compare equal; allocated C closures do not.
    if (!count && record.nativeFunctions.has(pointer)) state.push(record.nativeFunctions.get(pointer));
    else {
      state.lua_pushcclosure(native(record, pointer), count);
      if (!count) {
        const fn = state.value(-1); fn.luaAbiCFunctionPointer = pointer;
        record.nativeFunctions.set(pointer, fn);
      }
    }
  }
  function debugDescriptor(record, pointer) {
    const layout = services.debugLayout;
    const token = pointerAt(address(pointer) + layout(17));
    return { i_ci: record.debugTokens.get(token), event: view().getInt32(address(pointer) + layout(1), true),
      ftransfer: view().getUint16(address(pointer) + layout(14), true), ntransfer: view().getUint16(address(pointer) + layout(15), true) };
  }
  function writeDebug(record, pointer, info) {
    pointer = range(pointer, services.debugLayout(0));
    const layout = services.debugLayout;
    for (const [name, field] of [['event',1],['currentline',7],['linedefined',8],['lastlinedefined',9]])
      if (info[name] !== undefined) view().setInt32(pointer + layout(field), info[name], true);
    for (const [name, field] of [['name',2],['namewhat',3],['what',4],['source',5]])
      if (info[name] !== undefined) writePointer(pointer + layout(field), stringPointer(record, info[name]));
    if (info.srclen !== undefined) writePointer(pointer + layout(6), info.srclen);
    for (const [name, field] of [['nups',10],['nparams',11],['isvararg',12],['istailcall',13]])
      if (info[name] !== undefined) services.heap()[pointer + layout(field)] = Number(info[name]);
    for (const [name, field] of [['ftransfer',14],['ntransfer',15]])
      if (info[name] !== undefined) view().setUint16(pointer + layout(field), info[name], true);
    if (info.short_src !== undefined) {
      const start = pointer + layout(16), size = layout(18), heap = services.heap(); heap.fill(0, start, start + size);
      for (let i = 0; i < Math.min(size - 1, info.short_src.length); i++) heap[start + i] = info.short_src.charCodeAt(i);
    }
    if (info.i_ci !== undefined) {
      if (!record.debugAddresses.has(info.i_ci)) {
        const token = transport(record, 1);
        record.debugAddresses.set(info.i_ci, token); record.debugTokens.set(token, info.i_ci);
      }
      writePointer(pointer + layout(17), record.debugAddresses.get(info.i_ci));
    }
  }
  function debugOperation(record, operation, a, b, c) {
    const state = record.state, vm = state.vm, debug = vm.debug, thread = vm.currentThread;
    if (!debug) throw new LuaError(`${operation} requires the Lua debug frame provider`);
    if (operation === 'lua_sethook') {
      const pointer = address(a);
      debug.sethook(thread, pointer ? (_thread, info) => {
        const memory = address(services.malloc(services.debugLayout(0)));
        if (!memory) throw new LuaError('not enough memory');
        try {
          writeDebug(record, memory, info);
          const handle = threadHandle(record, _thread);
          if (services.hook(pointer, handle, memory) < 0) {
            const error = pending.get(handle); pending.delete(handle); throw error ?? new LuaError('Lua hook failed');
          }
        } finally { services.free(memory); }
      } : null, i32(b), i32(c));
      return 0;
    }
    if (operation === 'lua_getstack') {
      const info = {}, result = debug.getstack(thread, i32(a), info); if (result) writeDebug(record, b, info); return result;
    }
    if (operation === 'lua_getinfo') {
      const what = cstring(a), info = what.startsWith('>') ? {} : debugDescriptor(record, b), fn = what.startsWith('>') ? state.popOne() : null;
      const result = debug.getinfo(thread, what, info, fn);
      if (result) {
        writeDebug(record, b, info);
        if (what.includes('f')) state.push(info.func);
        if (what.includes('L')) state.push(info.activelines === null || info.activelines instanceof LuaTable ? info.activelines
          : new LuaTable(Array.from(info.activelines ?? [], line => [BigInt(line), true])));
      }
      return result;
    }
    if (operation === 'luaL_traceback') {
      const from = get(a); state.push(from.state.vm.debug.traceback(from.state.vm.currentThread, cstring(b), i32(c), from.state.vm.lastError?.luaDebugFrames)); return 0;
    }
    throw new LuaError(`unknown debug ABI operation ${operation}`);
  }
  function create(allocator, allocatorData) {
    const handle = address(services.malloc(8)); if (!handle) return 0;
    const record = { handle, handles: new Set([handle]), threadHandles: new WeakMap(), allocator, allocatorData, strings: new Map(), owned: [], transportBytes: 0, allocations: new Map(), identities: new WeakMap(), nativeFunctions: new Map(), debugAddresses: new Map(), debugTokens: new Map(), panic: 0, warn: 0, warnData: 0 };
    const memoryAllocator = (ud, pointer, oldSize, newSize) => {
      const result = record.allocator
        ? address(services.callback(record.allocator)(BigInt(record.allocatorData ?? 0), BigInt(pointer ?? 0), BigInt(oldSize), BigInt(newSize))) || null
        : address(services.realloc(pointer ?? 0, newSize)) || null;
      if (!newSize || result !== null) {
        if (pointer !== null) record.allocations.delete(pointer);
        if (newSize) record.allocations.set(result, newSize);
      }
      return result;
    };
    record.memoryAllocator=memoryAllocator;
    const userdataFactory = (size, count, state) => {
      const offset = services.userdataHeader(count), total = offset + size, tracker = state.vm.heap.memoryTracker;
      const block = tracker ? address(tracker.realloc(null, 0, total)) : allocate(record, total);
      const pointer = block + offset;
      const value = { pointer, size, allocation: { pointer: block, size: total, external: true },
        get bytes() { return services.heap().subarray(pointer, pointer + size); } };
      return { value, release: () => tracker ? tracker.realloc(block, total, 0) : release(record, block, total) };
    };
    try {
      record.state = createLuaCState({ ...options, libraries: false, userdataFactory,
        memoryAllocator, memoryUserdata: allocatorData, memoryLayout: { ...services.memoryLayout(), ...options.memoryLayout },
        warning: (message, continued = 0) => {
          if (record.warn) services.callback(record.warn)(BigInt(record.warnData), BigInt(stringPointer(record, message)), Number(continued));
        } });
      installLuaDebugNames(record.state.vm,record.state.registry);
      record.state.vm.pointerOf = value => valuePointer(record, value);
      record.state.vm.randomSeed=()=>[BigInt(services.sortTime()),BigInt(record.state.vm.pointerOf(record.state.vm.currentThread))];
      record.state.vm.sortRandomize = options.sortRandomize ?? (() => luaSortEntropy(services.sortClock(), services.sortTime()));
      states.set(handle, record);
      return handle;
    } catch (error) {
      // lua_newstate is the allocation-failure boundary even before a LuaState
      // object exists. Free every successful partial construction reservation.
      for (const [pointer, size] of [...record.allocations]) memoryAllocator(allocatorData, pointer, size, 0);
      services.free(handle);
      if (error instanceof LuaMemoryError) return 0;
      throw error;
    }
  }
  function openLibrary(record, name) {
    const state = record.state, vm = state.vm;
    switch (name) {
      case 'base': {
        const input = reader => path => { try { return reader(path); } catch (error) { if (Number.isInteger(error.errno) && services.osErrorMessage) error.strerror = cstring(services.osErrorMessage(error.errno)); throw error; } };
        const baseFunctions=createBaseIOFunctions(vm, { readFile: options.readFile ?? input(services.readFile), readStdin: options.readStdin ?? input(services.readStdin) });
        openBase(vm, { baseError: true, baseMeta: true, baseGC: true, baseFunctions,nativeRegistration:true });
        state.push(vm.globals); break;
      }
      case 'table': state.push(openTable(vm,{publish:false})); break;
      case 'math': state.push(openMath(vm, options.seed ?? 0n,{publish:false})); break;
      case 'string': state.push(openString(vm,{publish:false})); break;
      case 'utf8': state.push(openUtf8(vm,{publish:false})); break;
      case 'coroutine': state.push(openCoroutine(vm,{publish:false})); break;
      case 'os': state.push(openLuaOS(vm, options.os ?? createLuaOSServices(services),{publish:false,nativeRegistration:true})); break;
      case 'io': state.push(openLuaIO(state,services.ioServices()));break;
      case 'debug': state.push(openDebugLibrary(vm, { registry: state.registry,publish:false,filtered:false })); break;
      default: throw new LuaError(`luaopen_${name} is not implemented for this Lua configuration`);
    }
    return 1;
  }
  function operate(handle, operation, a, b, c, d, e) {
    if (operation === 'lua_newstate') return create(address(a), address(b));
    if (operation === 'luaL_newstate') return create(0, 0);
    const record = get(handle), state = record.state, index = i32(a);
    switch (operation) {
      case 'luaL_error_text':return luaAuxError(record.state.vm,'%s',cstring(a));
      case 'lua_pushinteger': state.lua_pushinteger(i64(a)); return 0;
      case 'lua_pushnumber': state.lua_pushnumber(decodeNumber(a)); return 0;
      case 'lua_pushboolean': state.lua_pushboolean(index !== 0); return 0;
      case 'lua_pushstring': return stringPointer(record, state.lua_pushstring(cstring(a)));
      case 'lua_pushlstring': {
        const size = address(b), pointer = range(a, size);
        return stringPointer(record, state.lua_pushlstring(services.heap().subarray(pointer, pointer + size), size));
      }
      case 'lua_tolstring': case 'luaL_checklstring': {
        const length = {}, value = operation === 'lua_tolstring' ? state.lua_tolstring(index, length) : state.luaL_checkstring(index);
        writePointer(address(b), value === null ? 0 : value.length);
        return value === null ? 0 : stringPointer(record, state.value(index));
      }
      case 'luaL_optlstring': {
        const value = state.luaL_optstring(index, cstring(b));
        writePointer(address(c), value === null ? 0 : value.length);
        // Lua returns the caller's default pointer for an omitted/nil value.
        return state.lua_isnoneornil(index) ? address(b) : stringPointer(record, state.value(index));
      }
      case 'lua_typename': return stringPointer(constants, state.lua_typename(index));
      case 'lua_tointegerx': case 'lua_tonumberx': {
        const valid = {}, value = state[operation](index, valid); writeInt(address(b), valid.value);
        return operation === 'lua_tointegerx' ? value : encodeNumber(value);
      }
      case 'lua_getglobal': case 'lua_setglobal': return state[operation](cstring(a));
      case 'lua_getfield': case 'lua_setfield': return state[operation](index, cstring(b));
      case 'lua_geti': case 'lua_seti': case 'lua_rawgeti': case 'lua_rawseti': return state[operation](index, i64(b));
      case 'lua_rawequal': case 'lua_copy': case 'lua_rotate': case 'lua_createtable': case 'luaL_checktype': return state[operation](index, i32(b));
      case 'luaL_optinteger': return state.luaL_optinteger(index, i64(b));
      case 'luaL_checkoption': {
        const list = []; let cursor = address(c), pointer;
        while ((pointer = pointerAt(cursor))) { list.push(cstring(pointer)); cursor += 8; }
        return state.luaL_checkoption(index, cstring(b), list);
      }
      case 'luaL_newmetatable': return state.luaL_newmetatable(cstring(a));
      case 'luaL_testudata': {const value=state.value(index),metatable=state.registry.rawget(cstring(b));return value instanceof LuaUserdata&&metatable!==null&&value.metatable===metatable?userdataPointer(value.value):0;}
      case 'luaL_checkudata': return userdataPointer(state.luaL_checkudata(index, cstring(b)));
      case 'lua_pushlightuserdata': state.lua_pushlightuserdata(BigInt.asUintN(64,a)); return 0;
      case 'lua_touserdata': return state.value(index) instanceof LuaLightUserdata ? valuePointer(record,state.value(index)) : userdataPointer(state.lua_touserdata(index));
      case 'lua_topointer': {
        return valuePointer(record, state.value(index));
      }
      case 'lua_newuserdatauv': return userdataPointer(state.lua_newuserdatauv(address(a), i32(b)));
      case 'lua_pushcclosure': pushNativeClosure(record, a, i32(b)); return 0;
      case 'luaL_setfuncs': {
        // Keep the array order (not JS property enumeration order) and original
        // lua_setfield metamethod behavior from lauxlib.c.
        const count = i32(b), tableIndex = state.lua_absindex(-(count + 1));
        if (count < 0 || count > state.lua_gettop() - 1) throw new LuaError('invalid function table/upvalues');
        let cursor = address(a), name;
        while ((name = pointerAt(cursor))) {
          const fn = pointerAt(cursor + 8);
          for (let j = 0; j < count; j++) state.lua_pushvalue(-count);
          if (fn) pushNativeClosure(record, fn, count);
          else { state.lua_pop(count); state.lua_pushboolean(false); }
          state.lua_setfield(tableIndex, cstring(name)); cursor += 16;
        }
        state.lua_pop(count); return 0;
      }
      case 'luaL_requiref': state.luaL_requiref(cstring(a), native(record, b), i32(c)); return 0;
      case 'lua_callk':
        if (d !== 0n) throw new LuaError('Lua C continuation is not implemented');
        return state.lua_call(index, i32(b));
      case 'lua_pcallk':
        if (e !== 0n) throw new LuaError('Lua C continuation is not implemented');
        return state.lua_pcall(index, i32(b), i32(c));
      case 'luaL_loadbufferx': {
        const pointer = range(a, address(b));
        return state.luaL_loadbuffer(services.heap().subarray(pointer, pointer + address(b)), address(b), cstring(c) ?? '?', cstring(d));
      }
      case 'luaL_loadstring': return state.luaL_loadstring(cstring(a));
      case 'luaL_checkversion_':
        if (decodeNumber(a) !== 504 || address(b) !== 136) throw new LuaError('Lua version/number size mismatch');
        return 0;
      case 'lua_tocfunction': {const value=state.value(index);if(!state.lua_iscfunction(index))return 0;const pointer=value?.luaAbiCFunctionPointer??value?.luaNativeCallback?.luaCFunctionPointer;if(!pointer)throw new LuaError('Lua C function has no registered ABI address');return pointer;}
      case 'lua_setallocf': record.allocator=address(a);record.allocatorData=address(b);record.state.vm.heap.memoryTracker.setallocf(record.memoryAllocator,record.allocatorData);return 0;
      case 'lua_getallocf': writePointer(address(a), record.allocatorData); return record.allocator;
      case 'lua_atpanic': {
        const previous = record.panic; record.panic = address(a); return previous;
      }
      case 'lua_setwarnf': record.warn = address(a); record.warnData = address(b); return 0;
      case 'lua_warning':
        if (record.warn) services.callback(record.warn)(BigInt(record.warnData), a, i32(b));
        return 0;
      case 'lua_gc': return state.lua_gc(index, i32(b), i32(c), i32(d));
      case 'lua_sethook': case 'lua_getstack': case 'lua_getinfo': case 'luaL_traceback':
        return options.debugAbi ? options.debugAbi(operation, { services, record, a, b, c, d, e, cstring, stringPointer: value => stringPointer(record, value) })
          : debugOperation(record, operation, a, b, c);
      case 'lua_close': {
        state.lua_close();
        for (const [pointer] of record.owned) services.free(pointer);
        for (const handle of record.handles) { states.delete(handle); pending.delete(handle); }
        services.free(record.handle);
        return 0;
      }
      case 'luaopen_base': case 'luaopen_table': case 'luaopen_math': case 'luaopen_string': case 'luaopen_utf8': case 'luaopen_coroutine':
        return openLibrary(record, operation.slice(8));
      default:
        if (operation.startsWith('luaopen_')) return openLibrary(record, operation.slice(8));
        if (!/^(lua_|luaL_)/.test(operation) || typeof state[operation] !== 'function') throw new LuaError(`unimplemented Lua ABI operation ${operation}`);
        return state[operation](index);
    }
  }
  return {
    counters,
    dispatch(hostServices, handle, operationPointer, a = 0n, b = 0n, c = 0n, d = 0n, e = 0n) {
      if (services && services !== hostServices) throw new Error('Lua ABI runtime cannot be shared by Wasm instances');
      services = hostServices; handle = address(handle);
      try {
        const operation = cstring(operationPointer); counters[operation] = (counters[operation] ?? 0) + 1;
        const result = operate(handle, operation, a, b, c, d, e);
        return BigInt.asUintN(64, BigInt(result ?? 0));
      } catch (error) {
        if (!(error instanceof LuaError)) throw error;
        pending.set(handle, error); return 0n;
      }
    },
    failed(handle) { return Number(pending.has(address(handle))); },
    unprotected(hostServices, handle) {
      const record = get(handle), error = pending.get(address(handle));
      pending.delete(address(handle)); record.state.push(error?.value ?? 'unprotected Lua error');
      if (record.panic) native(record, record.panic)(record.state);
      throw error ?? new LuaError('unprotected Lua error');
    },
  };
}
