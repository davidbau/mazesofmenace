// Shared native field/storage transport for unchanged SYMBOLS policies.
import * as symbols from '../ported/symbols.js';
import {callSymbols} from '../ported/symbols-runtime.js';
import publicFunctions from './public-functions.json' with {type:'json'};
export function enableSymbols(environment,layouts){
 const {services,ctypes,memory,functions}=environment,L=layouts.symbols;
 const local=new Proxy(Object.create(services),{get:(o,k,r)=>Reflect.has(o,k)?Reflect.get(o,k,r):typeof k==='string'?(...args)=>environment.resolve(k)(...args.map(v=>v?.address??v)):undefined});
 for(const name of ['gs','go','gp','gr','gc','cg','u'])Object.defineProperty(local,name,{value:undefined,writable:true,configurable:true});
 const globals=['gs','go','gp','gr','gc','cg','u','defsyms','def_oc_syms','def_monsyms','def_warnsyms','def_r_oc_syms'];
 const storage=[environment.allocateGlobal('loadsyms',L.loadsymsCount*L.symparseSize),environment.allocateGlobal('known_handling',L.knownHandlingCount*8),environment.allocateGlobal('known_restrictions',L.knownRestrictionCount*8),environment.allocateGlobal('saved_symbols',8)];
 const bit=(p,i,v)=>{const key=['nocolor','primary','rogue','explicitly'][i];if(!key)throw new Error('Unknown SYMBOLS packed field');return v===undefined?ctypes.getField('struct symsetentry',environment.address(p),key,'unsigned int'):ctypes.setField('struct symsetentry',environment.address(p),key,'unsigned int',v);};
 Object.assign(local,{moduleKey:environment,heap:()=>memory.HEAPU8,global:i=>environment.requireGlobal(globals[i]),storage:i=>{if(storage[i]===undefined)throw new Error('Unknown SYMBOLS storage');return storage[i];},bit:(p,i)=>bit(p,i),setBit:bit,callback:i=>ctypes.load('void *',environment.requireGlobal(i?'utf8graphics_mode_callback':'decgraphics_mode_callback')),invoke:fn=>functions.indirect(fn,'v'),fileName:()=>services.literal('symbols'),rogueLevel:()=>ctypes.locate('struct instance_globals_saved_d',environment.requireGlobal('svd'),'dungeon_topology').at+ctypes.record('struct dgn_topology').fields.d_rogue_level.offset,on_level:(a,b)=>environment.resolve('on_level')(environment.address(a),environment.address(b))});
 callSymbols(local,L,'initialize');
 const names=Object.keys(symbols).filter(name=>typeof symbols[name]==='function'&&Object.hasOwn(publicFunctions.functions,name)&&!environment.hasFunction(name));
 environment.register('symbols',Object.fromEntries(names.map(name=>[name,(...args)=>callSymbols(local,L,name,...args)])));
 return {services:local,storage,call:(name,...args)=>callSymbols(local,L,name,...args),limitation:'Symbol/header transport connected; parsing/options/configuration and full display remain under verification.'};
}
