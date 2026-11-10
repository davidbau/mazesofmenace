/* Lua5.4.8 lauxlib.c LuaL_Buffer/UBox. Lua notice: lua/lobject.js.
 * The LP64 inline buffer is1024 bytes. Grown backing storage uses the raw
 * lua_Alloc callback, exactly as resizebox: it is not part of Lua GCCOUNT.
 * The managed box owns __close/__gc cleanup, including NULL/zero frees.
 */
import {LuaError,LuaTable,LuaUserdata,isLuaString,luaStringBytes,numberToString} from './lua/lobject.js';
import {LuaMemoryError} from './lua-debug.js';
const BOX_NAME='_UBOX*';
function resizeBox(vm,box,size,failureCheckpoint){
  const state=box.value,tracker=vm.heap.memoryTracker;
  const pointer=tracker.allocator(tracker.userdata,state.pointer,state.size,size)??null;
  if(pointer===null&&size>0){failureCheckpoint?.();throw new LuaMemoryError();}
  state.pointer=pointer;state.size=size;
}
function boxMetatable(vm,checkpoint){
  vm.heap.adopt(BOX_NAME);
  let table=vm.registry.rawget(BOX_NAME);
  if(table!==null)return table;
  table=vm.heap.with(()=>new LuaTable([],{hashSize:2}));
  const release=vm.heap.addRoots(()=>table);
  try{
    checkpoint(2);checkpoint(3);
    table.rawset('__name',BOX_NAME);vm.registry.rawset(BOX_NAME,table);
    const gc=box=>{resizeBox(vm,box,0);return[];};
    table.rawset('__gc',gc);table.rawset('__close',gc);
    return table;
  }finally{release();}
}
export class LuaBuffer{
  constructor(vm,{initialSize=1024,stackExtra=0}={}){
    this.vm=vm;this.capacity=initialSize;this.length=0;this.pieces=[];this.box=null;this.closed=false;this.toClose=false;
    this.stackBase=(vm.heap.frameMetadata(vm.currentThread)?.checkTop??vm.currentThread.apiTop??1)+stackExtra;
    this.valueDepth=0;
    this.release=vm.heap.addRoots(()=>this.box);
  }
  prepare(extra){
    if(this.closed)throw new Error('Lua buffer is closed');
    if(!Number.isSafeInteger(extra)||extra<0||!Number.isSafeInteger(this.length+extra))throw new LuaError('buffer too large');
    if(this.capacity-this.length>=extra)return;
    const size=Math.max(Math.floor(this.capacity/2)*3,this.length+extra),vm=this.vm;
    if(!this.box){
      this.box=vm.heap.with(()=>new LuaUserdata({pointer:null,size:0},null,[],16));
      this.checkpoint(1+this.valueDepth);this.box.metatable=boxMetatable(vm,extra=>this.checkpoint(extra+this.valueDepth));this.toClose=true;
    }
    resizeBox(vm,this.box,size,()=>this.checkpoint(2+this.valueDepth));this.capacity=size;
  }
  add(bytes){
    bytes=luaStringBytes(bytes);if(bytes.length){this.prepare(bytes.length);this.pieces.push(bytes);this.length+=bytes.length;}return this;
  }
  addValue(value){
    const vm=this.vm;
    const release=vm.heap.addRoots(()=>value);
    this.valueDepth++;
    try{
      if(typeof value==='number'||typeof value==='bigint'){value=vm.heap.adopt(numberToString(value));this.checkpoint(1+this.valueDepth);}
      if(!isLuaString(value))throw new LuaError('string expected');
      return this.add(value);
    }finally{this.valueDepth--;release();}
  }
  checkpoint(extra){return this.vm.heap.withStackTop(this.stackBase+extra,()=>this.vm.heap.checkpoint());}
  finish(){
    let value,release;
    try{value=this.vm.heap.adopt(this.pieces.join(''));release=this.vm.heap.addRoots(()=>value);this.checkpoint(2);this.close();return value;}
    catch(error){this.close(error);throw error;}
    finally{release?.();}
  }
  close(error=null){
    if(this.closed)return;this.closed=true;
    try{if(this.toClose){
      const box=this.box,vm=this.vm;
      if(error instanceof LuaError){const func=this.stackBase+2;vm.deferClose(error,pending=>vm.call(box.metatable.rawget('__close'),[box,pending instanceof LuaError?pending.value:pending],{func,checkTop:func+3}),[box]);}
      else{const func=this.stackBase+2;vm.call(box.metatable.rawget('__close'),[box,null],{func,checkTop:func+3});}
    }}
    finally{this.release();this.pieces=[];}
  }
}
