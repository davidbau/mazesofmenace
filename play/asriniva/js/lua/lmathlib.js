/* Lua 5.4.8 math migration, lmathlib.c algorithms; lobject.js notice. */
import {luaArgError,luaCheckInteger,luaCheckNumber,luaTypeError} from './aux-error.js';
import {prepareLibrary} from './llib.js';
import { LuaTable,LuaUserdata, LuaError, canonicalNaN, luaValues, toNumber, toInteger, luaInteger, MININTEGER, MAXINTEGER } from './lobject.js';
const u64 = value => BigInt.asUintN(64, value);
export class RanState {
  constructor(first = 0n, second = 0n) { this.seed(first, second); }
  next() {
    const [a, b, oldc, oldd] = this.state;
    const c = oldc ^ a, d = oldd ^ b;
    const rotl = (x, n) => u64((u64(x) << n) | (u64(x) >> (64n - n)));
    const result = u64(rotl(b * 5n, 7n) * 9n);
    this.state = [u64(a ^ d), u64(b ^ c), u64(c ^ (b << 17n)), rotl(d, 45n)];
    return result;
  }
  seed(first, second) {
    this.state = [u64(first), 255n, u64(second), 0n];
    for (let i = 0; i < 16; i++) this.next();
    return [luaInteger(first), luaInteger(second)];
  }
  random(args) {
    let random = this.next();
    if (!args.length) return Number(random >> 11n) * 2 ** -53;
    if (args.length > 2) throw new LuaError('wrong number of arguments');
    const integer = value => { const n = toInteger(value); if (n === null) throw new LuaError('number has no integer representation'); return n; };
    const lower = args.length === 1 ? 1n : integer(args[0]);
    const upper = integer(args.at(-1));
    if (args.length === 1 && upper === 0n) return luaInteger(random);
    if (lower > upper) throw new LuaError('interval is empty');
    const span = u64(upper - lower);
    let mask = span;
    for (const shift of [1n, 2n, 4n, 8n, 16n, 32n]) mask |= mask >> shift;
    while ((random & mask) > span) random = this.next();
    return luaInteger((random & mask) + lower);
  }
}
export function openMath(vm, seed = 0n,{publish=true}={}) {
  const lib=prepareLibrary(vm,['abs','acos','asin','atan','ceil','cos','deg','exp','tointeger','floor','fmod','ult','log','max','min','modf','rad','sin','sqrt','tan','type','random','randomseed','pi','huge','maxinteger','mininteger']);try{const random = new RanState(seed, 0n);
  const number = value => { const n = toNumber(value); if (n === null) throw new LuaError('number expected'); return Number(n); };
  const rounded = (value, round) => { if (typeof value === 'bigint') return value; const result = round(number(value)); return toInteger(result) ?? result; };
  const domain=(result,...inputs)=>Number.isNaN(result)&&!inputs.some(Number.isNaN)?canonicalNaN():result;
  const add=(name,fn)=>{const wrapped=(...args)=>luaValues(fn(...args));wrapped.luaInvoke=args=>luaValues(fn(...args));lib.rawset(name,wrapped);};
  add('type', value => typeof value === 'bigint' ? 'integer' : typeof value === 'number' ? 'float' : null);
  add('tointeger', toInteger);
  add('abs', value => typeof value === 'bigint' ? luaInteger(value < 0n ? -value : value) : Math.abs(number(value)));
  add('floor', value => rounded(value, Math.floor)); add('ceil', value => rounded(value, Math.ceil));
  for(const name of ['min','max']){const select=(...args)=>select.luaInvoke(args);select.luaInvoke=args=>{if(!args.length)throw new LuaError('value expected');return [args.reduce((a,b)=>vm.binary('<',name==='min'?b:a,name==='min'?a:b)?b:a)];};lib.rawset(name,select);}
  for (const [name, fn] of Object.entries({ sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, sqrt: Math.sqrt, exp: Math.exp })) add(name, value => {const n=number(value);return domain(fn(n),n);});
  add('atan', (y, x = 1n) => Math.atan2(number(y), number(x ?? 1n)));
  add('log', (value, base = null) => base === null ? domain(Math.log(number(value)),number(value)) : domain(Math.log(number(value)) / Math.log(number(base)),number(value),number(base)));
  add('deg', value => number(value) * (180 / Math.PI)); add('rad', value => number(value) * (Math.PI / 180));
  add('fmod', (a, b) => {
    if (typeof a === 'bigint' && typeof b === 'bigint') { if (!b) throw new LuaError("attempt to perform 'n%0'"); return a % b; }
    return number(a) % number(b);
  });
  add('ult', (a, b) => { a = toInteger(a); b = toInteger(b); if (a === null || b === null) throw new LuaError('integer expected'); return u64(a) < u64(b); });
  lib.rawset('modf', value => {
    if (typeof value === 'bigint') return luaValues(value,0);
    const n = number(value), integer = Math.trunc(n); return luaValues(toInteger(integer)??integer,n===integer?0:n-integer);
  });
  add('random', (...args) => random.random(args));
  const seedFunction=(...args)=>seedFunction.luaInvoke(args);
  seedFunction.luaInvoke=args=>{
    if(!args.length){const [first,second]=vm.randomSeed?.()??[BigInt(Math.floor(Date.now()/1000)),vm.pointerOf(vm.currentThread)];return random.seed(BigInt(first),BigInt(second));}
    return random.seed(luaCheckInteger(vm,args[0],1),luaCheckInteger(vm,args[1]??0n,2));
  };
  lib.rawset('randomseed',seedFunction);
  for (const [name, value] of Object.entries({ pi: Math.PI, huge: Infinity, maxinteger: MAXINTEGER, mininteger: MININTEGER })) lib.rawset(name, value);
  const table=lib.finish(['random','randomseed','pi','huge','maxinteger','mininteger']);
  for(const name of ['pi','huge','maxinteger','mininteger'])table.rawset(name,lib.rawget(name));
  const state=vm.heap.with(()=>new LuaUserdata(random,null,[],32));const unroot=vm.heap.addRoots(()=>state);try{vm.heap.checkpoint();for(const name of ['random','randomseed']){const fn=lib.rawget(name);fn.luaGcRoots=[state];table.rawset(name,fn);vm.heap.checkpoint();}}finally{unroot();}
  if(publish)vm.setGlobal('math',table);return table;}finally{lib.release();}
}
