// Boundary transport only; original WORM owns algorithms and private chains.
import * as worm from '../ported/worm.js';
import {createWormState,withWormEnvironment} from '../nethack/bindings/worm.js';
import {withCEnvironment} from '../c-runtime/context.js';
import abi from './worm-abi.json' with {type:'json'};

export function enableWorms(environment,layouts){
 const {transport,services,ctypes,memory}=environment,L=Object.freeze({...layouts.worm});
 for(const [key,value]of Object.entries(abi.layout))if(L[key]!==value)throw new Error('Review changed WORM layout '+key);
 const ptr=environment.address,text=value=>typeof value==='string'?services.literal(value):ptr(value);
 const actual=(name,...args)=>environment.resolve(name)(...args);
 const globals=['svl','svm','svc','u','gv','mons'].map(name=>environment.requireGlobal(name));
 const bits=['wormno','mcloned','female'];
 const bridge={
  heap:()=>memory.HEAPU8,literal:services.literal,stackAlloc:transport.stackAlloc,
  global:index=>{if(!Number.isInteger(index)||!globals[index])throw new Error('Unknown WORM global');return globals[index];},
  monsterBit:(mon,index)=>ctypes.getField('struct monst',ptr(mon),bits[index],'unsigned int'),
  setMonsterBit:(mon,index,value)=>ctypes.setField('struct monst',ptr(mon),bits[index],'unsigned int',transport.uint(value)),
  alloc:size=>environment.alloc('alloc',transport.uint(size)),free:value=>services.free(ptr(value)),
 };
 for(const direction of ['sfo','sfi'])for(const [alias,type]of [['int','int'],['coordxy','int16'],['long','long']])
  bridge[(direction==='sfo'?'Sfo_':'Sfi_')+alias]=(file,value,tag)=>actual(direction+'_'+type,ptr(file),ptr(value),text(tag));
 const caller=(line,name)=>{
  if(!abi.rngCallers.includes(name))throw new Error('Unexpected original WORM RNG caller');
  if(services.rng_log_enabled())services.rng_log_set_caller(text('worm.c'),transport.int(line),text(name));
 };
 for(const kind of ['rn2','rnd'])bridge[kind]=(bound,line,name)=>{caller(line,name);return services[kind](transport.int(bound));};
 bridge.d=(dice,sides,line,name)=>{caller(line,name);return services.d(transport.int(dice),transport.int(sides));};
 // Native WORM's variadic boundary has integer/string packets only. Resolve
 // original PLINE owners and pass actual C addresses, never capture messages.
 bridge.impossible=(format,...args)=>actual('impossible',text(format),...args.map(v=>typeof v==='string'?text(v):v?.address??v));
 for(const name of ['pline','You'])bridge[name]=(format,value)=>actual(name,text(format),text(value));
 const typed=(type,value)=>type==='p'?ptr(value):type==='c'?transport.coordxy(value):type==='b'?transport.boolean(value):transport.int(value);
 for(const [name,types]of Object.entries(abi.dependencies))bridge[name]=(...args)=>actual(name,...types.map((type,i)=>typed(type,args[i])));
 const state=createWormState(bridge,L),namespace={};
 const monsterFunctions=new Set(abi.monsterArguments);
 for(const name of abi.publicFunctions)namespace[name]=(...args)=>withWormEnvironment(bridge,L,state,local=>{
  if(monsterFunctions.has(name))args[0]=local.monster(args[0]);
  if(name==='place_wsegs')args[1]=local.monster(args[1]);
  if(name==='save_worm'||name==='rest_worm')args[0]=local.nhfile(args[0]);
  const result=withCEnvironment(local,worm[name],...args);
  return result?.address??result;
 });
 environment.register('worms',namespace);
 return {state,layout:L,limitation:'Original WORM connected; full save/restore, combat and level-transition lifecycle require integration evidence.'};
}
