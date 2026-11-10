/* Managed storage reservations. LP64 defaults verified against the pinned
 * Lua5.4.8 headers. Every entry is an actual allocator-owned block, freed by
 * deterministic GC. JS AST metadata uses the explicitly different layout
 * below; these totals are not native Lua's allocation cadence/heap parity.
 * Host transport mirrors and the JavaScript engine's own heap are excluded.
 */
import { LuaAllocationTracker } from '../lua-debug.js';
export const LUA_MANAGED_LAYOUT = Object.freeze({ table:56,node:24,value:16,string:24,proto:128,lclosure:32,cclosure:32,upvalue:40,thread:200,global:1416,callinfo:64,userdata0:32,userdata:40,astNode:32 });
export function createMemoryTracker({ memoryTracker = null, memoryAllocator = null, memoryUserdata = null } = {}) {
  if (memoryTracker) return memoryTracker;
  return new LuaAllocationTracker({ allocator: memoryAllocator ?? ((_ud,_pointer,_old,size) => size ? new Uint8Array(size) : null), userdata: memoryUserdata });
}
