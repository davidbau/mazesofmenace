/* Lua 5.4.8 restricted-base/table migration. lobject.js copyright notice. */
import {LuaBuffer} from '../lua-buffer.js';
import {LuaMemoryError} from '../lua-debug.js';
import {luaArgError,luaTypeError,luaCheckInteger,luaAuxError,luaWithAuxTop} from '../lua-aux-error.js';
import { prepareLibrary } from './llib.js';
import { sortLuaTable } from '../lua-table-sort.js';
import { LuaTable, LuaError, LuaUserdata, isLuaString, luaStringBytes, luaValues, luaType, toInteger, numericString, rawEqual, numberToString, truth } from './lobject.js';
export function openBase(vm, { baseError = false, baseMeta = false, baseGC = false, baseFunctions = {}, nativeRegistration = false } = {}) {
  const definitions=new Map();const add=(name,fn)=>definitions.set(name,fn);
  add('type',value=>{if(value===undefined)luaArgError(vm,1,'value expected');return[luaType(value)];});
  const identities = new Map(); let identity = 0;
  const tostring = value => {
    const mm = vm.metamethod(value, '__tostring'); if (mm !== null) {
      let result=vm.call(mm,[value])[0];if(luaType(result)==='number')result=numberToString(result);if (!isLuaString(result)) vm.auxError("'__tostring' must return a string"); return result;
    }
    if (luaType(value) === 'number') return numberToString(value);
    if (isLuaString(value)) return value;
    if (value === null || value === undefined) return 'nil';
    if (typeof value === 'boolean') return String(value);
    if (!identities.has(value)) identities.set(value, ++identity);
    const custom=vm.metamethod(value,'__name'),kind=isLuaString(custom)?luaStringBytes(custom):luaType(value);
    const pointer=vm.pointerOf?BigInt(vm.pointerOf(value)):BigInt(identities.get(value));return `${kind}: ${pointer?'0x'+pointer.toString(16):'(null)'}`;
  };
  add('tostring', value => {
    if(value===undefined)luaArgError(vm,1,'value expected');
    const metadata=vm.heap.frameMetadata(vm.currentThread),top=metadata?.argumentTop??metadata?.checkTop??vm.heap.getStackTop(vm.currentThread),roots=[value],release=vm.heap.addRoots(()=>roots);
    const push=(bytes,extra=1)=>{const result=vm.heap.adopt(bytes);roots.push(result);vm.heap.withStackTop(top+extra,()=>vm.heap.checkpoint());return[result];};
    const field=name=>{const mt=vm.metatableOf(value);if(mt===null)return null;const n=roots.length;try{roots.push(mt);const event=vm.heap.adopt(name);roots.push(event);vm.heap.withStackTop(top+2,()=>vm.heap.checkpoint());return mt.rawget(name);}finally{roots.length=n;}};
    try{
      const mm=field('__tostring');
      if(mm!==null){let result=vm.call(mm,[value],{func:top,checkTop:top+2})[0]??null;roots.push(result);if(luaType(result)==='number')return push(numberToString(result));if(!isLuaString(result))vm.auxError("'__tostring' must return a string");return[result];}
      if(isLuaString(value))return[value];
      if(value===null||value===undefined||typeof value==='boolean'||luaType(value)==='number')return push(tostring(value));
      const custom=field('__name');return push(tostring(value),custom!==null?2:1);
    }finally{release();}
  });
  vm.toLuaString = tostring; // LuaL_tolstring-style internal conversion, not _G.tostring.
  add('tonumber', (value, base = null) => {
    if(base===null){if(value===undefined)luaArgError(vm,1,'value expected');return luaValues(luaType(value)==='number'?value:numericString(value));}
    base=luaCheckInteger(vm,base,2);
    if(!isLuaString(value))luaTypeError(vm,1,'string',value);if(base<2n||base>36n)luaArgError(vm,2,'base out of range');
    const text = luaStringBytes(value).replace(/^[ \t\n\r\v\f]+|[ \t\n\r\v\f]+$/g, ''); const match = /^([+-]?)([\da-zA-Z]+)$/.exec(text); if (!match) return [null];
    let n = 0n;
    for (const c of match[2].toLowerCase()) { const digit = BigInt(parseInt(c, 36)); if (digit >= base) return [null]; n = BigInt.asIntN(64, n * base + digit); }
    return [BigInt.asIntN(64, match[1] === '-' ? -n : n)];
  });
  const select = (index,...values)=>select.luaInvoke([index,...values]);
  select.luaInvoke = args => {
    let index=args[0],values=args.slice(1);
    if (isLuaString(index) && luaStringBytes(index).startsWith('#')) return [BigInt(values.length)];
    index=luaCheckInteger(vm,index,1);
    let n=Number(index);if(n<0)n=values.length+n+1;if(n<1)luaArgError(vm,1,'index out of range');return values.slice(n-1);
  };
  add('select',select);
  add('next', (table, key = null) => { if(!(table instanceof LuaTable))luaTypeError(vm,1,'table',table); return table.next(key); });
  add('pairs',table=>{
    if(table===undefined)luaArgError(vm,1,'value expected');const mm=vm.metamethod(table,'__pairs');
    if(mm!==null){const metadata=vm.heap.frameMetadata(vm.currentThread),top=metadata?.argumentTop??metadata?.checkTop??vm.heap.getStackTop(vm.currentThread);return vm.call(mm,[table],{func:top,checkTop:top+2});}
    return[vm.getGlobal('next'),table,null];
  });
  const inext = (table, n) => { n=BigInt.asIntN(64,luaCheckInteger(vm,n,2)+1n); const value = vm.get(table, n); return value === null ? [null] : [n, value]; };
  add('ipairs',table=>{if(table===undefined)luaArgError(vm,1,'value expected');return[inext,table,0n];});
  const protectedResult = function*(args,handler=null,start=1) {
    if(start===1&&!args.length)luaArgError(vm,1,'value expected');if(start===2&&luaType(handler)!=='function')luaTypeError(vm,2,'function',handler);
    const metadata=vm.heap.frameMetadata(vm.currentThread),func=metadata?(metadata.func+(start===1?2:4)):null,values=args.slice(start),stack=metadata?{func,checkTop:func+1+values.length}:null;
    if(metadata)metadata.values=start===1?[true,...args]:[args[0],handler,true,args[0],...values];
    const replaceResults=results=>{if(metadata){metadata.values.length=start===1?1:3;for(const value of results)metadata.values.push(value);}};
    try{const result=yield*vm.protectedCallG(args[0],values,handler,stack);replaceResults(result);return[true,...result];}
    catch(error){if(!(error instanceof LuaError))throw error;replaceResults([error.value]);error=vm.closeError(error);vm.heap.shrinkThread(vm.currentThread);if(metadata){metadata.values[metadata.values.length-1]=error.value;metadata.values.push(false,error.value);}return [false,error.value];}
  };
  const pcall=(fn,...args)=>vm.run(protectedResult([fn,...args]),{boundary:false});
  pcall.luaYieldableArray=args=>protectedResult(args);pcall.luaYieldable=function*(...args){return yield* protectedResult(args);};add('pcall',pcall);
  const xpcall=(fn,handler,...args)=>vm.run(protectedResult([fn,handler,...args],handler,2),{boundary:false});
  xpcall.luaYieldableArray=args=>protectedResult(args,args[1]??null,2);xpcall.luaYieldable=function*(...args){return yield* protectedResult(args,args[1]??null,2);};add('xpcall',xpcall);
  if (baseGC) {
    const controls={stop:0,restart:1,collect:2,count:3,step:5,setpause:6,setstepmul:7,isrunning:9,generational:10,incremental:11};
    const collect=(option='collect',...args)=>collect.luaInvoke([option,...args]);
    collect.luaInvoke=args=>{
      const option=args[0]??'collect';if(!isLuaString(option))throw new LuaError('string expected');const name=luaStringBytes(option);if(!(name in controls))throw new LuaError('invalid option');
      if(name==='count')return[(vm.heap.control(3)*1024+vm.heap.control(4))/1024];
      const integers=[];for(const value of args.slice(1)){const integer=toInteger(value??0n);if(integer===null)throw new LuaError('integer expected');integers.push(Number(BigInt.asIntN(32,integer)));}
      const result=vm.heap.control(controls[name],...integers);
      return[result===-1?null:name==='isrunning'||name==='step'?Boolean(result):name==='generational'||name==='incremental'?(result===10?'generational':'incremental'):BigInt(result)];
    };add('collectgarbage',collect);
  }
  if (baseError) {
    const errorFunction=(value=null,level=1n)=>errorFunction.luaInvoke([value,level]);
    errorFunction.luaInvoke=args=>{let value=args[0]??null;const level=luaCheckInteger(vm,args[1]??1n,2);const lev=Number(BigInt.asIntN(32,level));args.length=1;args[0]=value;vm.setHostStackTop(1);if(lev>0&&isLuaString(value)){
      const roots=[value],release=vm.heap.addRoots(()=>roots),metadata=vm.heap.frameMetadata(vm.currentThread),base=(metadata?.func??0)+1;
      try{const prefix=vm.heap.adopt(vm.debug.where(vm.currentThread,lev));roots.push(prefix);vm.heap.withStackTop(base+2,()=>vm.heap.checkpoint());value=vm.heap.adopt(luaStringBytes(prefix)+luaStringBytes(value));roots.push(value);vm.heap.withStackTop(base+2,()=>vm.heap.checkpoint());}finally{release();}
    }const error=isLuaString(value)&&luaStringBytes(value)==='not enough memory'?new LuaMemoryError():new LuaError(value);error.luaExplicit=true;throw error;};
    add('error',errorFunction);
    const assertFunction=(...args)=>assertFunction.luaInvoke(args);assertFunction.luaInvoke=args=>{if(!truth(args[0]??null)){
      if(!args.length)luaArgError(vm,1,'value expected');const message=args.length>1?args[1]:'assertion failed!',defaultValue=vm.heap.adopt('assertion failed!'),unroot=vm.heap.addRoots(()=>defaultValue),metadata=vm.heap.frameMetadata(vm.currentThread),base=(metadata?.func??0)+1;
      try{vm.heap.withStackTop(base+args.length,()=>vm.heap.checkpoint());}finally{unroot();}args.length=1;args[0]=message;vm.setHostStackTop(1);errorFunction.luaInvoke(args);
    }return args;};add('assert',assertFunction);
  }
  if (baseMeta) {
    add('rawequal',(a,b)=>{if(a===undefined)luaArgError(vm,1,'value expected');if(b===undefined)luaArgError(vm,2,'value expected');return[rawEqual(a,b)];});
    add('rawget', (table, key) => { if(!(table instanceof LuaTable))luaTypeError(vm,1,'table',table); if(key===undefined)luaArgError(vm,2,'value expected');return[table.rawget(key)]; });
    add('rawset', (table, key, value) => { if(!(table instanceof LuaTable))luaTypeError(vm,1,'table',table); if(key===undefined)luaArgError(vm,2,'value expected');if(value===undefined)luaArgError(vm,3,'value expected');table.rawset(key,value);return[table]; });
    add('rawlen', value => { if (!isLuaString(value) && !(value instanceof LuaTable)) luaTypeError(vm,1,'table or string',value); return [isLuaString(value) ? BigInt(value.length) : value.length()]; });
    add('getmetatable', value => {
      if(value===undefined)luaArgError(vm,1,'value expected');
      const mt=vm.metatableOf(value);if(mt===null)return[null];
      const metadata=vm.heap.frameMetadata(vm.currentThread),top=metadata?.argumentTop??metadata?.checkTop??vm.heap.getStackTop(vm.currentThread),event=vm.heap.adopt('__metatable'),release=vm.heap.addRoots(()=>[mt,event]);
      try{vm.heap.withStackTop(top+3,()=>vm.heap.checkpoint());return[mt.rawget('__metatable')??mt];}finally{release();}
    });
    add('setmetatable', (table, mt) => {
      if(!(table instanceof LuaTable))luaTypeError(vm,1,'table',table);if(!(mt===null||mt instanceof LuaTable))luaTypeError(vm,2,'nil or table',mt);
      if(table.metatable!==null){const metadata=vm.heap.frameMetadata(vm.currentThread),top=metadata?.argumentTop??metadata?.checkTop??vm.heap.getStackTop(vm.currentThread),event=vm.heap.adopt('__metatable'),release=vm.heap.addRoots(()=>event);try{vm.heap.withStackTop(top+2,()=>vm.heap.checkpoint());if(table.metatable.rawget('__metatable')!==null)luaWithAuxTop(vm,1,()=>vm.auxError('cannot change a protected metatable'));}finally{release();}}
      const args=vm.debug.thread(vm.currentThread).frames.at(-1)?.args;if(args)vm.setHostStackTop(2);table.metatable=mt;return[table];
    });
  }
  for(const[name,fn]of Object.entries(baseFunctions))add(name,fn);
  if(nativeRegistration)for(const name of ['print','warn'])if(!definitions.has(name))add(name,()=>{throw new LuaError(`${name} is unavailable in the configured NetHack sandbox`);});
  const order=['assert','collectgarbage','dofile','error','getmetatable','ipairs','loadfile','load','next','pairs','pcall','print','warn','rawequal','rawlen','rawget','rawset','select','setmetatable','tonumber','tostring','type','xpcall','_G','_VERSION'];
  for(const name of order){if(name==='_G'||name==='_VERSION')vm.setGlobal(name,false);else if(definitions.has(name))vm.setGlobal(name,definitions.get(name));}
  vm.setGlobal('_G',vm.globals);const version=vm.heap.adopt('Lua 5.4'),unrootVersion=vm.heap.addRoots(()=>version);try{vm.heap.checkpoint();vm.setGlobal('_VERSION',version);}finally{unrootVersion();}
  return { tostring };
}

export function openTable(vm,{publish=true}={}) {
  const lib=prepareLibrary(vm,['concat','insert','pack','unpack','remove','move','sort']);try{ const integer=(value,arg=2)=>luaCheckInteger(vm,value,arg);
  const top=()=>{const metadata=vm.heap.frameMetadata(vm.currentThread);return metadata?.argumentTop??metadata?.checkTop??vm.heap.getStackTop(vm.currentThread);};
  const checkTable=(value,fields,arg=1)=>{if(value instanceof LuaTable)return;const mt=vm.metatableOf(value);if(mt!==null&&fields.every(name=>mt.rawget(name)!==null))return;luaTypeError(vm,arg,'table',value);};
  const length=table=>{const value=vm.heap.withStackTop(top(),()=>vm.length(table)),n=toInteger(value);if(n===null)vm.auxError('object length is not an integer');return n;};
  const pack=(...values)=>pack.luaInvoke(values);pack.luaInvoke=values=>{
    const table=new LuaTable([],{arraySize:values.length,hashSize:1}),release=vm.heap.addRoots(()=>table);
    try{vm.heap.withStackTop(top()+1,()=>vm.heap.checkpoint());for(let i=values.length;i>=1;i--)table.rawset(BigInt(i),values[i-1]);table.rawset('n',BigInt(values.length));return[table];}finally{release();}
  };lib.rawset('pack',pack);
  const unpack=(table, first=1n,last=null)=>{
    first=integer(first??1n,2);last=last===null?length(table):integer(last,3); if (last - first >= 2147483647n) vm.auxError('too many results to unpack');
    const count=Math.max(0,Number(last-first+1n)),meta=vm.heap.frameMetadata(vm.currentThread),top=meta?.argumentTop??meta?.checkTop??vm.heap.getStackTop(vm.currentThread);if(!vm.heap.checkStack(vm.currentThread,top,count,{safe:false,gc:false}))vm.auxError('too many results to unpack');if(meta)meta.top=Math.max(meta.top,top+count);
    const values=luaValues(),release=vm.heap.addRoots(()=>values);try{for(let i=first;i<=last;i++)values.push(vm.heap.withStackTop(top+values.length,()=>vm.get(table,i)));return values;}finally{release();}
  };unpack.luaResultStackManaged=true;lib.rawset('unpack',unpack);
  lib.rawset('insert',(table,...args)=>{
    checkTable(table,['__index','__newindex','__len']);const end=BigInt.asIntN(64,length(table)+1n),base=top();let position=end;
    if(args.length===2){position=integer(args[0],2);if(BigInt.asUintN(64,position-1n)>=BigInt.asUintN(64,end))luaArgError(vm,2,'position out of bounds');for(let i=end;i>position;i--){const value=vm.heap.withStackTop(base,()=>vm.get(table,i-1n));vm.heap.withStackTop(base+1,()=>vm.set(table,i,value));}}
    else if(args.length!==1)vm.auxError("wrong number of arguments to 'insert'");
    vm.heap.withStackTop(base,()=>vm.set(table,position,args.at(-1)));return[];
  });
  lib.rawset('remove',(table,position=null)=>{
    checkTable(table,['__index','__newindex','__len']);const size=length(table),base=top();position=position===null?size:integer(position,2);
    if(position!==size&&BigInt.asUintN(64,position-1n)>BigInt.asUintN(64,size))luaArgError(vm,2,'position out of bounds');
    const value=vm.heap.withStackTop(base,()=>vm.get(table,position)),release=vm.heap.addRoots(()=>value);
    try{for(;position<size;position++){const next=vm.heap.withStackTop(base+1,()=>vm.get(table,position+1n));vm.heap.withStackTop(base+2,()=>vm.set(table,position,next));}vm.heap.withStackTop(base+2,()=>vm.set(table,position,null));return[value];}finally{release();}
  });
  lib.rawset('concat',(table,separator='',first=1n,last=null)=>{
    checkTable(table,['__index','__len']);const size=length(table);separator=vm.checkString(separator??'',1);first=integer(first??1n,3);last=last===null?size:integer(last,4);
    const buffer=new LuaBuffer(vm),roots=[],release=vm.heap.addRoots(()=>roots);
    try{for(let i=first;i<=last;i++){const value=vm.heap.withStackTop(buffer.stackBase+1,()=>vm.get(table,i));roots.push(value);try{if(!isLuaString(value)&&luaType(value)!=='number')luaWithAuxTop(vm,2,()=>luaAuxError(vm,"invalid value (%s) at index %I in table for 'concat'",luaType(value),i));buffer.addValue(value);}finally{roots.pop();}if(i<last)buffer.add(separator);}return[buffer.finish()];}
    catch(error){buffer.close(error);throw error;}finally{release();}
  });
  lib.rawset('move',(from,first,last,target,to=from)=>{
    first=integer(first,2);last=integer(last,3);target=integer(target,4);to??=from;checkTable(from,['__index']);checkTable(to,['__newindex'],to===from?1:5);
    if(last>=first){
      const maximum=9223372036854775807n;
      if(!(first>0n||last<maximum+first))luaArgError(vm,3,'too many elements to move');
      const count=last-first+1n;if(target>maximum-count+1n)luaArgError(vm,4,'destination wrap around');
      const base=top(),forward=target>last||target<=first||(to!==from&&!vm.heap.withStackTop(base,()=>vm.binary('==',from,to)));
      const copy=i=>{const value=vm.heap.withStackTop(base,()=>vm.get(from,first+i));vm.heap.withStackTop(base+1,()=>vm.set(to,target+i,value));};
      if(forward)for(let i=0n;i<count;i++)copy(i);else for(let i=count-1n;i>=0n;i--)copy(i);
    }
    return[to];
  });
  lib.rawset('sort',(table,comparator=null)=>{checkTable(table,['__index','__newindex','__len']);return vm.heap.withStackTop(top(),()=>sortLuaTable(vm,table,comparator));});
  const table=lib.finish();if(publish)vm.setGlobal('table',table);return table;}finally{lib.release();}
}
