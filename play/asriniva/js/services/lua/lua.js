/* Entry point for the bounded Lua5.4 migration core. NOT a complete interpreter.
 * lobject.js carries the Lua source copyright/permission notice.
 * Libraries: restricted base, table/math/string subsets, byte patterns, UTF8;
 * parser/runtime support normal
 * functions/closures, varargs, multiresults, loops, 64-bit integer operations,
 * byte strings, host callbacks and common metamethods.
 * Missing: C continuations,
 * full C stack API (bounded layer in lapi.js), native GC scheduling/allocation cadence, hooks matching AST VM opcodes,
 * native table hash-seed/pointer-layout matching (logical object hashes remain
 * module-scoped), tail calls, goto, bytecode in the AST backend,
 * randomized sort pivots and complete diagnostics. Managed allocation counts
 * include declared AST reservations. Long byte strings retain object identity;
 * short strings are interned. Exact native heap-size/cadence remains unfinished. No host I/O,
 * module loading, Wasm or fetching.
 */
import { LuaVM } from './lvm.js';
import { openBase, openTable } from './lbaselib.js';
import { openMath } from './lmathlib.js';
import { openString } from './lstrlib.js';
import { openUtf8 } from './lutf8lib.js';
import { openCoroutine } from './lcorolib.js';
export { LuaTable, LuaUserdata, LuaLightUserdata, LuaThread, LuaString, isLuaString, luaStringBytes, LuaError, luaInteger, luaType, byteString } from './lobject.js';
export { parse } from './lparser.js';
export { LuaVM } from './lvm.js';
export function createLua(options = {}) {
  const vm=new LuaVM({...options,memoryReady:false});
  vm.heap.with(() => { openBase(vm, options); openTable(vm); openMath(vm, options.seed ?? 0n); openString(vm); openUtf8(vm); openCoroutine(vm); });
  vm.heap.memoryTracker.ready=options.memoryReady!==false;return vm;
}
