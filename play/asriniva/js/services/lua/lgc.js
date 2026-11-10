/* Deterministic logical Lua collector: lgc.c finalizer/weak-table algorithms.
 * See lobject.js for Lua copyright/permission. No host FinalizationRegistry.
 * Full collections and lifecycle are real; native incremental/generational
 * scheduling and native allocation cadence/heap-size parity are not claimed. Counts report actual
 * managed reservation blocks, including configured C-layout headers/storage.
 */
import { LuaTable, LuaUserdata, LuaThread, LuaString, isLuaString, luaStringBytes, LuaError } from './lobject.js';
import { withHeap } from './lgc-context.js';
import { createMemoryTracker, LUA_MANAGED_LAYOUT } from './lmem.js';
import { LuaGCScheduler,LuaGCGenerational,GC } from '../lua-gc-scheduler.js';
export const LUA_GCSTOP = 0, LUA_GCRESTART = 1, LUA_GCCOLLECT = 2, LUA_GCCOUNT = 3, LUA_GCCOUNTB = 4, LUA_GCSTEP = 5, LUA_GCSETPAUSE = 6, LUA_GCSETSTEPMUL = 7, LUA_GCISRUNNING = 9, LUA_GCGEN = 10, LUA_GCINC = 11;
export class LuaHeap {
  constructor(vm, options = {}) {
    this.vm=vm;this.records=new Map();this.lists={allgc:null,finobj:null,tobefnz:null};this.boundaries={};this.currentWhite=1;this.stringTableSize=128;this.grayLists={grayagain:null,weak:null,allweak:null,ephemeron:null};this.grayAgain=new Set();this.objects = new Map(); this.roots = new Set(); this.pins = new Set();
    this.registration = 0; this.cycle = 0; this.collecting = false; this.finalizing = false; this.closing = false; this.closed = false;
    this.stopped = false; this.warning = options.warning ?? null; this.memoryTracker = createMemoryTracker(options);
    this.layout = { ...LUA_MANAGED_LAYOUT, ...options.memoryLayout }; this.strings = new Map(); this.prototypeStrings = new Map(); this.prototypes = new Map(); this.upvalueBlocks = new Map(); this.transient = new Set(); this.fixed = new Map();
    this.memoryTracker.collect = () => this.collect(true);
    try { this.reserve(this.fixed,'global',this.layout.global);this.reserve(this.fixed,'stringtable',this.stringTableSize*8); this.string('not enough memory'); this.pins.add('not enough memory'); } catch (error) { this.releaseBlocks(this.fixed); throw error; }
  }
  attachScheduler(options={}) {
    if(this.scheduler)return this.scheduler;
    this.generational=new LuaGCGenerational(this);this.scheduler=new LuaGCScheduler({graph:this,getBytes:()=>this.memoryTracker.bytes,debt:BigInt(this.memoryTracker.bytes-this.layout.global-this.layout.thread),...options});
    const previous=this.memoryTracker.onAllocated;this.memoryTracker.onAllocated=delta=>{previous?.(delta);this.scheduler.allocated(delta);};
    return this.scheduler;
  }
  checkpoint() {if(this.finalizing&&this.scheduler)return this.scheduler.check();if(!this.scheduler||!this.memoryTracker.ready||this.collecting||this.finalizing||this.closed)return;this.collecting=true;try{return this.with(()=>this.scheduler.check());}finally{this.collecting=false;}}
  sweepToOld() {this.generational.sweepToOld();}
  youngCollection() {this.graphState.marks.weak.clear();return this.generational.youngCollection();}
  finishGeneration() {this.generational.correctGrayLists();this.grayAgain.clear();for(let record=this.grayLists.grayagain;record;record=record.grayNext)this.grayAgain.add(record);this.checkSizes();}
  newRecord(value,kind,blocks) {
    const record={value,kind,blocks,next:this.lists.allgc,list:'allgc',age:0,white:this.currentWhite,black:false};this.lists.allgc=record;this.records.set(value,record);return record;
  }
  unlinkRecord(record) {const name=record.list;let previous=null,current=this.lists[name];while(current&&current!==record){previous=current;current=current.next;}if(current){if(previous)previous.next=current.next;else this.lists[name]=current.next;}record.next=null;}
  moveRecord(record,name,append=false) {this.unlinkRecord(record);record.list=name;if(append&&this.lists[name]){let last=this.lists[name];while(last.next)last=last.next;last.next=record;}else{record.next=this.lists[name];this.lists[name]=record;}}
  removeRecord(value) {const record=this.records.get(value);if(record){this.unlinkGray(record);this.unlinkRecord(record);this.records.delete(value);}}
  freeRecord(record) {
    const value=record.value;
    if(this.objects.has(value))this.free(value);
    else {this.releaseBlocks(record.blocks);this.removeRecord(value);if(record.kind==='proto'){this.prototypes.delete(value);this.prototypeStrings.delete(value);}else if(record.kind==='upvalue')this.upvalueBlocks.delete(value);else this.strings.delete(value);}
  }
  reallyMark(record) {const marks=this.graphState?.marks;if(!marks)return;if(record.white===0)marks.regray(record);else marks.markRecord(record);}
  unlinkGray(record) {for(const name of ['grayagain','weak','allweak','ephemeron']){let previous=null,current=this.grayLists[name];while(current&&current!==record){previous=current;current=current.grayNext;}if(current){if(previous)previous.grayNext=current.grayNext;else this.grayLists[name]=current.grayNext;}}this.grayAgain.delete(record);record.grayNext=null;}
  linkGray(record,name) {this.unlinkGray(record);record.grayNext=this.grayLists[name];this.grayLists[name]=record;record.black=false;if(name==='grayagain')this.grayAgain.add(record);}
  linkGrayAgain(record) {this.linkGray(record,'grayagain');}
  barrierForward(parent,value){const record=this.records.get(parent),child=this.records.get(value);if(!record?.black||!child||child.white===0)return;if(this.scheduler&&this.scheduler.state>=3&&this.scheduler.state<=6&&this.scheduler.mode===0){record.white=this.currentWhite;record.black=false;return;}this.reallyMark(child);if(record.age>=2&&child.age<2)child.age=2;}
  barrier(parent,value) {const record=this.records.get(parent),child=this.records.get(value);if(!record||!child)return;if(record.black&&child.white!==0){if(record.age===6)record.black=false;else this.linkGrayAgain(record);if(record.age>=2)record.age=5;}}
  reserve(blocks, name, size) {
    const previous = blocks.get(name), oldSize = previous?.size ?? 0;
    if (oldSize === size) return;
    const pointer = this.memoryTracker.realloc(previous?.pointer ?? null, oldSize, size);
    if (size) blocks.set(name, { pointer, size }); else blocks.delete(name);
  }
  releaseBlocks(blocks) { for (const { pointer, size } of blocks.values()) this.memoryTracker.realloc(pointer, size, 0); blocks.clear(); }
  resizeTable(table, arraySize = table.arraySize, nodeCount = table.nodes.length) {
    const info = this.objects.get(table); if (!info) return;
    const pending = new Map(), names = [];
    this.transient.add(table);
    try {
      for (const [name,size] of [['array',arraySize * this.layout.value],['nodes',nodeCount * this.layout.node]]) {
        if ((info.blocks.get(name)?.size ?? 0) !== size) { names.push(name); this.reserve(pending, name, size); }
      }
      // Commit only after every new buffer exists: failed growth leaves the
      // previous table representation and block ownership intact.
      for (const name of names) { const old = info.blocks.get(name); if (old) this.memoryTracker.realloc(old.pointer,old.size,0); info.blocks.delete(name); if (pending.has(name)) info.blocks.set(name,pending.get(name)); pending.delete(name); }
    } finally { this.releaseBlocks(pending); this.transient.delete(table); }
  }
  string(value) {
    if (value instanceof LuaString) return this.register(value,'string');
    if (value.length > 40) return new LuaString(value,this);
    if (!this.strings.has(value)) {
      this.transient.add(value);
      try { if(this.strings.size>=this.stringTableSize){this.reserve(this.fixed,'stringtable',this.stringTableSize*16);this.stringTableSize*=2;}const blocks = new Map(); this.reserve(blocks, 'string', this.layout.string + value.length + 1); this.strings.set(value, blocks);this.newRecord(value,'shortstring',blocks); }
      finally { this.transient.delete(value); }
    }
    return value;
  }
  prototype(proto, literalPool = new Map()) {
    if (!proto || this.prototypes.has(proto)) return;
    const blocks = new Map(); this.prototypes.set(proto, blocks); const strings = new Set(); this.prototypeStrings.set(proto, strings);
    let nodes = 0; const seen = new Set();
    const walk = value => {
      if (isLuaString(value)) strings.add(this.adopt(value));
      else if (value && typeof value === 'object' && !seen.has(value)) {
        seen.add(value);
        if(value.kind==='literal' && isLuaString(value.value)){const key=luaStringBytes(value.value);if(key.length>40 && !(value.value instanceof LuaString)){if(!literalPool.has(key))literalPool.set(key,this.adopt(value.value));value.value=literalPool.get(key);}else value.value=this.adopt(value.value);}
        if (value !== proto && value.kind === 'function') { this.prototype(value,literalPool); return; }
        if (value.kind) nodes++;
        for (const [key,item] of Object.entries(value)) if (!['freeNames','lines'].includes(key)) walk(item);
      }
    };
    try {
      this.reserve(blocks, 'prototype', this.layout.proto);this.newRecord(proto,'proto',blocks); if(proto.constants)for(let i=0;i<proto.constants.length;i++)proto.constants[i]=this.adopt(proto.constants[i]); walk(proto);
      if (proto.code) {
        for (const [name,width] of [['code',4],['constants',this.layout.value],['upvalues',16],['protos',8],['lineinfo',1],['abslineinfo',8],['locvars',16]]) this.reserve(blocks, name, (proto[name]?.length ?? 0) * width);
        for (const child of proto.protos ?? []) this.prototype(child,literalPool);
      } else this.reserve(blocks, 'metadata', nodes * this.layout.astNode);
    } catch (error) { this.releaseBlocks(blocks); this.prototypes.delete(proto);this.removeRecord(proto); this.prototypeStrings.delete(proto); throw error; }
  }
  resizeThread(thread, count) {
    const info = this.objects.get(thread); if (!info) return;
    const slots = Math.max(45, count + 5); if (slots <= (info.stackSlots ?? 0)) return;
    this.transient.add(thread);
    try { this.reserve(info.blocks, 'stack', slots * this.layout.value); info.stackSlots = slots; }
    finally { this.transient.delete(thread); }
  }
  enterFrame(thread, token, slots = 0) {
    const info = this.objects.get(thread); if (!info) return;
    info.frames ??= new Map(); this.transient.add(thread);
    try { this.reserve(info.blocks, token, this.layout.callinfo); info.frames.set(token,slots); this.resizeThread(thread,[...info.frames.values()].reduce((a,b)=>a+b,0)); }
    catch (error) { info.frames.delete(token); this.reserve(info.blocks,token,0); throw error; }
    finally { this.transient.delete(thread); }
  }
  leaveFrame(thread, token) { const info = this.objects.get(thread); if (!info) return; info.frames?.delete(token); this.reserve(info.blocks,token,0); }
  with(callback) { return withHeap(this, callback); }
  collectable(value) {
    return value instanceof LuaString || value instanceof LuaTable || value instanceof LuaUserdata || value instanceof LuaThread || value?.luaClosure === true || typeof value === 'function' && Array.isArray(value.luaGcRoots);
  }
  register(value, kind = null) {
    if (!this.collectable(value) || this.objects.has(value)) return value;
    if (value.luaFreed) throw new LuaError('attempt to reuse a collected Lua value');
    if (this.closed) throw new LuaError('Lua state is closed');
    if (value.heap && value.heap !== this) throw new LuaError('cannot move managed values between independent Lua states');
    value.heap = this;
    const blocks=new Map(),inferred=value instanceof LuaString?'string':value instanceof LuaTable?'table':value instanceof LuaUserdata?'userdata':value instanceof LuaThread?'thread':value.luaClosure?'closure':'cclosure';const info=this.newRecord(value,kind??inferred,blocks);Object.assign(info,{finalizer:false,order:0,freed:false});
    this.objects.set(value, info); this.transient.add(value);
    try {
      const layout = this.layout;
      if (value instanceof LuaString) this.reserve(info.blocks,'string',layout.string + value.length + 1);
      else if (value instanceof LuaTable) { this.reserve(info.blocks, 'header', layout.table); this.resizeTable(value); }
      else if (value instanceof LuaUserdata) {
        if (!value.value?.allocation?.external) this.reserve(info.blocks, 'userdata', (value.uservalues.length ? layout.userdata + value.uservalues.length * layout.value : layout.userdata0) + value.size);
      } else if (value instanceof LuaThread) { this.reserve(info.blocks, 'header', layout.thread); this.resizeThread(value, 0); }
      else if (value.luaClosure) {
        this.reserve(info.blocks, 'header', layout.lclosure + (value.upvalues?.length ?? 0) * 8); this.prototype(value.prototype);
        for (const cell of value.upvalues ?? []) if (!this.upvalueBlocks.has(cell)) { const blocks = new Map(); this.reserve(blocks, 'upvalue', layout.upvalue); this.upvalueBlocks.set(cell,blocks);this.newRecord(cell,'upvalue',blocks); }
      } else if (typeof value === 'function') this.reserve(info.blocks, 'header', layout.cclosure + value.luaGcRoots.length * layout.value);
    } catch (error) { this.releaseBlocks(info.blocks); this.objects.delete(value);this.removeRecord(value); throw error; }
    finally { this.transient.delete(value); }
    return value;
  }
  adopt(value, seen = new Set()) {
    if (isLuaString(value)) return this.string(value);
    if (!this.collectable(value) || seen.has(value)) return value;
    seen.add(value); const exists = this.objects.has(value); this.register(value);
    if (exists) return value;
    this.transient.add(value); try {
    if (value instanceof LuaTable) { this.adopt(value.metatable, seen); for (const node of value.nodes) { node.key = this.adopt(node.key, seen); node.value = this.adopt(node.value, seen); } for (const [key,item] of [...value.values]) { value.values.delete(key); const at=value.nodeIndex(key);value.values.set(at>=0?value.nodes[at].key:this.adopt(key,seen),this.adopt(item,seen)); } }
    else if (value instanceof LuaUserdata) { this.adopt(value.metatable, seen); for (let i=0;i<value.uservalues.length;i++) value.uservalues[i]=this.adopt(value.uservalues[i],seen); }
    else if (typeof value === 'function') for(let i=0;i<value.luaGcRoots.length;i++) value.luaGcRoots[i]=this.adopt(value.luaGcRoots[i],seen);
    if (value.metatable) this.checkFinalizer(value);
    return value; } finally { this.transient.delete(value); }
  }
  addRoots(provider) { this.roots.add(provider); return () => this.roots.delete(provider); }
  pin(value) { value=this.adopt(value); this.pins.add(value); return () => this.pins.delete(value); }
  checkFinalizer(value) {
    const info = this.objects.get(value);
    if (info && !info.finalizer && !this.closing && value.metatable?.rawget('__gc') !== null && value.metatable?.rawget('__gc') !== undefined) {
      info.finalizer=true;info.order=++this.registration;this.moveRecord(info,'finobj');
    }
  }
  makeMarks() {
    const marked=new Set(),markedRecords=new Set(),queue=[],weak=new Set(),auxiliaries=new Set(),strings=new Set(),protos=new Set(),cells=new Set();
    let work=0;
    const markRecord=record=>{
      if(!record||record.white===0)return;
      markedRecords.add(record);record.white=0;record.black=false;
      const value=record.value;
      if(record.kind==='shortstring'){strings.add(value);record.black=true;return;}
      if(record.kind==='string'){marked.add(value);record.black=true;return;}
      if(record.kind==='upvalue'){cells.add(value);mark(value.value);record.black=!value.open;return;}
      if(record.kind==='proto')protos.add(value);else marked.add(value);
      queue.push(record);
    };
    const mark=value=>{
      if(typeof value==='string'){strings.add(value);markRecord(this.records.get(value));return;}
      if(this.collectable(value)){this.adopt(value);markRecord(this.records.get(value));return;}
      if(value?.luaLightUserdata)return;
      if(value===null||typeof value!=='object'||auxiliaries.has(value)||ArrayBuffer.isView(value)||value instanceof ArrayBuffer)return;
      auxiliaries.add(value);
      if(Array.isArray(value)||value instanceof Set){for(const item of value)mark(item);}
      else if(value instanceof Map){for(const[key,item]of value){mark(key);mark(item);}}
      else if(value.luaEnvironment){for(const cell of value.cells.values())mark(cell.value);mark(value.parent);}
      else for(const[name,item]of Object.entries(value))if(!['vm','heap','prototype','generator'].includes(name))mark(item);
    };
    const alive=value=>{if(isLuaString(value)){mark(value);return true;}return !this.collectable(value)||this.records.get(value)?.white===0;};
    const mode=table=>{const value=table.metatable?.rawget('__mode');return isLuaString(value)&&value.length<=40?luaStringBytes(value).split('\0')[0]:'';};
    const propagateOne=()=>{
      const record=queue.pop();if(!record)return 0;const value=record.value;record.black=true;let cost=1;
      if(record.kind==='proto'){
        mark(this.prototypeStrings.get(value));
        if(value.code){mark(value.constants);for(const descriptor of value.upvalues??[])mark(descriptor.name);for(const local of value.locvars??[])mark(local.varname);for(const child of value.protos??[])markRecord(this.records.get(child));cost+=value.constants.length+(value.upvalues?.length??0)+(value.protos?.length??0)+(value.locvars?.length??0);}
        else{const seen=new Set();const walk=node=>{if(isLuaString(node))mark(node);else if(node&&typeof node==='object'&&!seen.has(node)){seen.add(node);if(node!==value&&node.kind==='function'){markRecord(this.records.get(node));return;}for(const[name,item]of Object.entries(node))if(name!=='freeNames')walk(item);}};walk(value);cost+=(this.prototypes.get(value)?.get('metadata')?.size??0)/this.layout.astNode;}
      }else if(value instanceof LuaTable){
        mark(value.metatable);const flags=mode(value),keys=flags.includes('k'),values=flags.includes('v');if(keys||values){weak.add(value);this.linkGray(record,keys?(values?'allweak':'ephemeron'):'weak');}
        for(const[key,item]of value.values){if(!keys)mark(key);if(!values&&(!keys||alive(key)))mark(item);}
        cost+=value.alimit+2*value.nodes.length;if(!keys&&!values&&record.age===5)this.linkGrayAgain(record);
      }else if(value instanceof LuaUserdata){mark(value.metatable);mark(value.uservalues);cost+=value.uservalues.length;}
      else if(value instanceof LuaThread){if(value.status!=='dead')mark(value.fn);mark(value.gcRoots);mark(value.errorHandlers);mark(value.errorRoots);mark(value.error);mark(value.lastError?.luaPendingClose);if(this.vm.bytecodeRoots)mark(this.vm.bytecodeRoots(value));cost+=this.objects.get(value)?.stackSlots??0;if(!this.inAtomic||record.age>=2)this.linkGrayAgain(record);}
      else if(value.luaClosure){markRecord(this.records.get(value.prototype));for(const cell of value.upvalues??[])markRecord(this.records.get(cell));cost+=value.upvalues?.length??0;}
      else if(typeof value==='function'){mark(value.luaGcRoots);cost+=value.luaGcRoots.length;}
      work+=cost;return cost;
    };
    const propagate=()=>{let cost=0;while(queue.length)cost+=propagateOne();return cost;};
    const converge=()=>{let previous,cost=0;do{cost+=propagate();previous=markedRecords.size;for(const table of weak){const flags=mode(table);if(flags.includes('k')&&!flags.includes('v'))for(const[key,value]of table.values)if(alive(key))mark(value);}}while(queue.length||markedRecords.size!==previous);return cost;};
    const regray=record=>{if(record.white===0){record.black=false;markedRecords.add(record);queue.push(record);}else markRecord(record);};
    return {marked,markedRecords,queue,weak,mark,markRecord,resetAuxiliaries:()=>auxiliaries.clear(),alive,mode,converge,propagateOne,propagate,regray,strings,protos,cells,get work(){return work;}};
  }
  markRoots(marks) {
    marks.mark(this.vm.globals);marks.mark(this.vm.stringMetatable);marks.mark(this.vm.typeMetatables);marks.mark(this.vm.mainThread);marks.mark(this.vm.currentThread);
    for(const provider of this.roots)marks.mark(provider());for(const value of this.pins)marks.mark(value);for(const value of this.transient)marks.mark(value);
    for(let record=this.lists.tobefnz;record;record=record.next)marks.markRecord(record);
  }
  restartCollection() {this.graphState={marks:this.makeMarks(),sweeps:{}};this.clearGrayLists();this.markRoots(this.graphState.marks);this.cycle++;}
  hasGray() {return Boolean(this.graphState?.marks.queue.length);}
  propagateOne() {return this.graphState.marks.propagateOne();}
  clearWeakValues(marks) {for(const table of marks.weak)if(marks.mode(table).includes('v'))for(const[key,value]of [...table.values])if(!marks.alive(value))table.rawset(key,null);}
  atomic() {
    const marks=this.graphState.marks,before=marks.work;this.inAtomic=true;
    try {
      marks.resetAuxiliaries();this.markRoots(marks);const again=[...this.grayAgain];this.grayAgain.clear();this.grayLists.grayagain=null;for(const record of again)marks.regray(record);marks.converge();
      this.clearWeakValues(marks);
      for(let record=this.lists.finobj,next;record;record=next){next=record.next;if(record.white!==0){this.moveRecord(record,'tobefnz',true);marks.markRecord(record);}}
      marks.converge();
      for(const table of marks.weak)if(marks.mode(table).includes('k'))for(const[key]of [...table.values])if(!marks.alive(key))table.rawset(key,null);
      this.clearWeakValues(marks);marks.propagate();this.currentWhite=this.currentWhite===1?2:1;
      return marks.work-before;
    } finally {this.inAtomic=false;}
  }
  enterSweep() {
    this.graphState??={marks:this.makeMarks(),sweeps:{}};this.graphState.sweeps={};let record=this.lists.allgc;
    while(record){const next=record.next;if(record.white!==0&&record.white!==this.currentWhite){this.freeRecord(record);record=next;}else{record.white=this.currentWhite;record.black=false;record.age=0;record=next;break;}}
    this.graphState.sweeps.allgc=record;
  }
  beginSweepList(name) {this.graphState.sweeps[name]=this.lists[name];}
  sweep(name,limit=100) {
    let record=this.graphState.sweeps[name],count=0;const done=record===null;
    while(record&&count<limit){const next=record.next;if(record.white!==0&&record.white!==this.currentWhite)this.freeRecord(record);else{record.white=this.currentWhite;record.black=false;record.age=0;}record=next;count++;}
    this.graphState.sweeps[name]=record;return{count,done};
  }
  checkSizes() {
    if(this.scheduler?.emergency||this.stringTableSize<=128||this.strings.size>=this.stringTableSize/4)return;
    const old=this.fixed.get('stringtable'),size=Math.max(128,this.stringTableSize/2),pointer=this.memoryTracker.realloc(old.pointer,old.size,size*8,{safe:false,retry:false});
    if(pointer!==null){this.fixed.set('stringtable',{pointer,size:size*8});this.stringTableSize=size;}
  }
  setPhase(state) {if(this.scheduler)this.scheduler.phase(state);}
  clearGrayLists() {this.grayLists={grayagain:null,weak:null,allweak:null,ephemeron:null};this.grayAgain.clear();}
  hasFinalizers() {return this.lists.tobefnz!==null;}
  finalizeOne() {const record=this.lists.tobefnz;if(record)this.runFinalizer(record.value);}
  enterIncremental() {for(const record of this.records.values()){record.age=0;record.white=this.currentWhite;record.black=false;}this.clearGrayLists();this.boundaries={};}
  runFinalizer(value) {
    const info = this.objects.get(value); if (!info) return;
    if(info.list!=='allgc')this.moveRecord(info,'allgc');if(this.scheduler?.state>=3&&this.scheduler.state<=6){info.white=this.currentWhite;info.black=false;}else if(info.age===3)this.boundaries.firstold1=info;
    info.finalizer = false; // Lua permits re-registration from inside __gc.
    const callback = value.metatable?.rawget('__gc');
    if (callback !== null && callback !== undefined) {
      this.finalizing = true; const debug = this.vm.debug.thread(this.vm.currentThread), allowhook = debug.allowhook, legacyHook = this.vm.hook; debug.allowhook = false; this.vm.hook = null;
      try { this.vm.run(this.vm.protectedCallG(callback,[value],null),{boundary:false}); }
      catch (error) { if (!(error instanceof LuaError)) throw error; if (this.warning) this.warning(`error in __gc (${String(error.value)})`); }
      finally { this.finalizing = false; debug.allowhook = allowhook; this.vm.hook = legacyHook; }
    }
  }
  free(value) {
    const info = this.objects.get(value); if (!info || info.freed) return;
    info.freed=true;this.objects.delete(value);this.removeRecord(value);
    if (value instanceof LuaUserdata && value.onFree) value.onFree(value.value);
    this.releaseBlocks(info.blocks);
    value.luaFreed = true;
  }
  collect(emergency=false) {
    if(this.scheduler){if(this.finalizing)return -1;return this.with(()=>{this.scheduler.fullCollect(emergency);return 0;});}
    if (this.finalizing) return -1;
    if (this.collecting || this.closed) throw new LuaError('invalid recursive/closed collection');
    return this.with(() => {
      this.collecting = true; this.cycle++;this.clearGrayLists();
      try {
        for(const record of this.records.values()){record.white=this.currentWhite;record.black=false;}
        const marks = this.makeMarks();
        marks.mark(this.vm.globals);marks.mark(this.vm.typeMetatables); marks.mark(this.vm.stringMetatable); marks.mark(this.vm.mainThread); marks.mark(this.vm.currentThread);
        for (const provider of this.roots) marks.mark(provider());
        for (const value of this.pins) marks.mark(value);
        for (const value of this.transient) marks.mark(value);
        marks.converge();
        // Weak values disappear before objects selected for finalization are
        // resurrected; weak keys remain through the finalizer's collection.
        const clearValues = () => { for (const table of marks.weak) if (marks.mode(table).includes('v')) for (const [key, value] of [...table.values]) if (!marks.alive(value)) table.rawset(key, null); };
        clearValues();
        const pending = [...this.objects].filter(([value, info]) => info.finalizer && !marks.marked.has(value)).sort((a, b) => b[1].order - a[1].order).map(([value]) => value);
        for (const value of pending) marks.mark(value);
        marks.converge();
        for (const table of marks.weak) if (marks.mode(table).includes('k')) for (const [key] of [...table.values]) if (!marks.alive(key)) table.rawset(key, null);
        clearValues();
        for (const value of [...this.objects.keys()]) if (!marks.marked.has(value)) this.free(value);
        for (const [value, blocks] of this.strings) if (!marks.strings.has(value)) { this.releaseBlocks(blocks); this.strings.delete(value);this.removeRecord(value); }
        for (const [proto, blocks] of this.prototypes) if (!marks.protos.has(proto)) { this.releaseBlocks(blocks); this.prototypes.delete(proto);this.prototypeStrings.delete(proto);this.removeRecord(proto); }
        for (const [cell, blocks] of this.upvalueBlocks) if (!marks.cells.has(cell)) { this.releaseBlocks(blocks); this.upvalueBlocks.delete(cell);this.removeRecord(cell); }
        for (const value of pending) this.runFinalizer(value);
        for(const record of this.records.values()){record.white=this.currentWhite;record.black=false;}
        return 0;
      } finally { this.collecting = false; }
    });
  }
  close() {
    if (this.closed) return;
    return this.with(() => {
      this.scheduler?.beginClose();this.closing = true;
      try {
        const pending = [...this.objects].filter(([, info]) => info.finalizer).sort((a, b) => b[1].order - a[1].order).map(([value]) => value);
        for (const value of pending) this.runFinalizer(value);
        for (const value of [...this.objects.keys()]) this.free(value);
        for (const map of [this.strings, this.prototypes, this.upvalueBlocks]) { for (const blocks of map.values()) this.releaseBlocks(blocks); map.clear(); }
        this.prototypeStrings.clear();this.records.clear();this.lists={allgc:null,finobj:null,tobefnz:null}; this.releaseBlocks(this.fixed); this.closed = true;
      } finally { this.closing = false; }
    });
  }
  control(operation,...args) {
    if(this.finalizing)return -1;
    if(this.scheduler)return this.with(()=>this.scheduler.control(operation,...args));
    if (this.finalizing) return -1;
    if (operation === LUA_GCCOLLECT) return this.collect();
    if (operation === LUA_GCSTOP) { this.stopped = true; return 0; }
    if (operation === LUA_GCRESTART) { this.stopped = false; return 0; }
    if (operation === LUA_GCISRUNNING) return Number(!this.stopped);
    if (operation === LUA_GCCOUNT || operation === LUA_GCCOUNTB) {
      const bytes = this.memoryTracker.bytes;
      return operation === LUA_GCCOUNT ? Math.floor(bytes / 1024) : bytes % 1024;
    }
    throw new LuaError('native incremental/generational collector scheduling is not implemented');
  }
}
