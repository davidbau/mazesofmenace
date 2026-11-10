/* Lua 5.4.8 restricted-base/table migration. lobject.js copyright notice. */
import { sortLuaTable } from '../lua-table-sort.js';
import { LuaTable, LuaError, LuaUserdata, isLuaString, luaStringBytes, luaValues, luaType, toInteger, numericString, rawEqual, numberToString, truth } from './lobject.js';
export function openBase(vm, { baseError = false, baseMeta = false, baseGC = false } = {}) {
  const add = (name, fn) => vm.setGlobal(name, fn);
  add('type', value => [luaType(value)]);
  const identities = new Map(); let identity = 0;
  const tostring = value => {
    const mm = vm.metamethod(value, '__tostring'); if (mm !== null) {
      let result=vm.call(mm,[value])[0];if(luaType(result)==='number')result=numberToString(result);if (!isLuaString(result)) throw new LuaError("'__tostring' must return a string"); return result;
    }
    if (luaType(value) === 'number') return numberToString(value);
    if (isLuaString(value)) return value;
    if (value === null || value === undefined) return 'nil';
    if (typeof value === 'boolean') return String(value);
    if (!identities.has(value)) identities.set(value, ++identity);
    const custom=vm.metamethod(value,'__name'),kind=isLuaString(custom)?luaStringBytes(custom):luaType(value);
    const pointer=vm.pointerOf?BigInt(vm.pointerOf(value)):BigInt(identities.get(value));return `${kind}: ${pointer?'0x'+pointer.toString(16):'(null)'}`;
  };
  add('tostring', value => [tostring(value)]);
  vm.toLuaString = tostring; // LuaL_tolstring-style internal conversion, not _G.tostring.
  add('tonumber', (value, base = null) => {
    if (base === null) return luaValues(luaType(value)==='number'?value:numericString(value));
    base = toInteger(base);
    if (!isLuaString(value) || base === null || base < 2n || base > 36n) throw new LuaError('invalid tonumber arguments');
    const text = luaStringBytes(value).replace(/^[ \t\n\r\v\f]+|[ \t\n\r\v\f]+$/g, ''); const match = /^([+-]?)([\da-zA-Z]+)$/.exec(text); if (!match) return [null];
    let n = 0n;
    for (const c of match[2].toLowerCase()) { const digit = BigInt(parseInt(c, 36)); if (digit >= base) return [null]; n = BigInt.asIntN(64, n * base + digit); }
    return [BigInt.asIntN(64, match[1] === '-' ? -n : n)];
  });
  const select = (index,...values)=>select.luaInvoke([index,...values]);
  select.luaInvoke = args => {
    let index=args[0],values=args.slice(1);
    if (isLuaString(index) && luaStringBytes(index) === '#') return [BigInt(values.length)];
    index=toInteger(index);if(index===null)throw new LuaError('integer expected');
    let n=Number(index);if(n<0)n=values.length+n+1;if(n<1)throw new LuaError('index out of range');return values.slice(n-1);
  };
  add('select',select);
  add('next', (table, key = null) => { if (!(table instanceof LuaTable)) throw new LuaError('table expected'); return table.next(key); });
  add('pairs', table => {
    const mm = vm.metamethod(table, '__pairs'); if (mm !== null) return vm.call(mm, [table]);
    if (!(table instanceof LuaTable)) throw new LuaError('table expected');
    return [vm.getGlobal('next'), table, null];
  });
  const inext = (table, n) => { n = (toInteger(n) ?? 0n) + 1n; const value = vm.get(table, n); return value === null ? [null] : [n, value]; };
  add('ipairs', table => [inext, table, 0n]);
  const protectedResult = function*(args,handler=null,start=1) {
    try{return [true,...(yield*vm.protectedCallG(args[0],args.slice(start),handler))];}
    catch(error){if(!(error instanceof LuaError))throw error;error=vm.closeError(error);return [false,error.value];}
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
    errorFunction.luaInvoke=args=>{let value=args[0]??null;const level=toInteger(args[1]??1n);if(level===null)throw new LuaError('integer expected');const lev=Number(BigInt.asIntN(32,level));if(lev>0&&isLuaString(value))value=vm.debug.where(vm.currentThread,lev)+luaStringBytes(value);const error=new LuaError(value);error.luaExplicit=true;throw error;};
    add('error',errorFunction);
    const assertFunction=(...args)=>assertFunction.luaInvoke(args);assertFunction.luaInvoke=args=>{if(!truth(args[0]??null))errorFunction.luaInvoke([args[1]??'assertion failed!']);return args;};add('assert',assertFunction);
  }
  if (baseMeta) {
    add('rawequal', (a, b) => [rawEqual(a, b)]);
    add('rawget', (table, key) => { if (!(table instanceof LuaTable)) throw new LuaError('table expected'); return [table.rawget(key)]; });
    add('rawset', (table, key, value) => { if (!(table instanceof LuaTable)) throw new LuaError('table expected'); table.rawset(key, value); return [table]; });
    add('rawlen', value => { if (!isLuaString(value) && !(value instanceof LuaTable)) throw new LuaError('table or string expected'); return [isLuaString(value) ? BigInt(value.length) : value.length()]; });
    add('getmetatable', value => {
      const mt=vm.metatableOf(value);
      return [mt?.rawget('__metatable') ?? mt];
    });
    add('setmetatable', (table, mt) => {
      if (!(table instanceof LuaTable) || !(mt === null || mt instanceof LuaTable)) throw new LuaError('table/nil expected');
      if (table.metatable?.rawget('__metatable') != null) throw new LuaError('cannot change a protected metatable');
      table.metatable = mt; return [table];
    });
  }
  vm.setGlobal('_G', vm.globals); vm.setGlobal('_VERSION', 'Lua 5.4');
  return { tostring };
}

export function openTable(vm) {
  const lib = new LuaTable(); const integer = value => { const n = toInteger(value); if (n === null) throw new LuaError('integer expected'); return n; };
  const pack=(...values)=>pack.luaInvoke(values); pack.luaInvoke=values=>[new LuaTable([...values.map((value,i)=>[BigInt(i+1),value]),['n',BigInt(values.length)]],{arraySize:values.length,hashSize:1})]; lib.rawset('pack',pack);
  lib.rawset('unpack', (table, first = 1n, last = vm.length(table)) => {
    first ??= 1n; last ??= vm.length(table);
    first = integer(first); last = integer(last); if (last - first >= 1000000n) throw new LuaError('too many results to unpack');
    const values=luaValues(); for (let i = first; i <= last; i++) values.push(vm.get(table, i)); return values;
  });
  lib.rawset('insert', (table, ...args) => {
    let length = integer(vm.length(table)); const position = args.length === 1 ? length + 1n : integer(args[0]);
    if (args.length < 1 || args.length > 2 || position < 1n || position > length + 1n) throw new LuaError('position out of bounds');
    for (let i = length; i >= position; i--) vm.set(table, i + 1n, vm.get(table, i));
    vm.set(table, position, args.at(-1)); return [];
  });
  lib.rawset('remove', (table, position = vm.length(table)) => {
    position ??= vm.length(table);
    const length = integer(vm.length(table)); position = integer(position);
    if (position !== length && (position < 1n || position > length + 1n)) throw new LuaError('position out of bounds');
    const value = vm.get(table, position); for (let i = position; i < length; i++) vm.set(table, i, vm.get(table, i + 1n)); vm.set(table, length, null); return [value];
  });
  lib.rawset('concat', (table, separator = '', first = 1n, last = vm.length(table)) => {
    separator ??= ''; if (isLuaString(separator)) separator=luaStringBytes(separator); first ??= 1n; last ??= vm.length(table);
    const pieces = []; for (let i = integer(first); i <= integer(last); i++) {
      const value = vm.get(table, i); if (isLuaString(value)) pieces.push(luaStringBytes(value)); else if (luaType(value) === 'number') pieces.push(numberToString(value)); else throw new LuaError('invalid value in table.concat');
    }
    return [pieces.join(separator)];
  });
  lib.rawset('move', (from, first, last, target, to = from) => {
    first = integer(first); last = integer(last); target = integer(target); const copied = [];
    if (last - first >= 1000000n) throw new LuaError('table.move range too large');
    for (let i = first; i <= last; i++) copied.push(vm.get(from, i));
    copied.forEach((value, i) => vm.set(to, target + BigInt(i), value)); return [to];
  });
  lib.rawset('sort', (table, comparator = null) => sortLuaTable(vm, table, comparator));
  vm.setGlobal('table', lib); return lib;
}
