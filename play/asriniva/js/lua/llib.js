/* luaL_newlibtable/luaL_setfuncs registration and rooting; Lua notice lobject.js.
 * Definitions are prepared without Lua allocations, then inserted in the
 * original luaL_Reg order into the original preallocated hash capacity.
 */
import {LuaTable} from './lobject.js';
export function prepareLibrary(vm,names){
  const table=vm.heap.with(()=>new LuaTable([],{hashSize:names.length})),definitions=new Map(),release=vm.heap.addRoots(()=>table);
  try{vm.heap.checkpoint();}catch(error){release();throw error;}
  return {table,definitions,release,rawset(name,value){definitions.set(name,value);},rawget(name){return definitions.get(name)??null;},
    finish(placeholders=[]){const empty=new Set(placeholders);for(const name of names){vm.heap.adopt(name);table.rawset(name,empty.has(name)?false:definitions.get(name)??null);}return table;}};
}
