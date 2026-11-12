// One original POTION context/private state, projected onto the shared heap.
import abi from './potion-abi.json' with {type:'json'};
import * as source from '../ported/potion.js';
import {createPotionEnvironment} from '../ported/potion-runtime.js';
import {withCEnvironment} from '../ported/c-runtime.js';

export function enablePotion(environment,layouts){
 const {services,memory,ctypes,transport,functions}=environment,L=layouts.potion,address=environment.address;
 for(const [key,value]of Object.entries(abi.layout))if(L[key]!==value)throw new Error('Review POTION ABI '+key);
 const text=value=>typeof value==='string'?services.literal(value):address(value),boundary=args=>args.map(value=>typeof value==='string'?services.literal(value):value?.address??value);
 const resolve=name=>environment.hasFunction(name)?environment.resolve(name):typeof services[name]==='function'?services[name]:environment.resolve(name),forwards=new Map();
 const local=new Proxy(Object.create(services),{get:(o,key,r)=>{if(Object.hasOwn(o,key))return Reflect.get(o,key,r);const value=Reflect.has(o,key)?Reflect.get(o,key,r):undefined;if(value!==undefined&&typeof value!=='function')return value;if(typeof key!=='string')return value;if(!forwards.has(key))forwards.set(key,(...args)=>resolve(key)(...boundary(args)));return forwards.get(key);}});
 for(const name of abi.globals)Object.defineProperty(local,name,{value:undefined,writable:true,configurable:true});
 const bit=(type,p,i,value)=>{const row=abi.schema[type],field=abi.bits[type]?.[i];if(!row||!field)throw new Error('Unknown POTION packed field '+type+':'+i);return value===undefined?ctypes.getField(row[0],address(p),field,'unsigned int'):ctypes.setField(row[0],address(p),field,'unsigned int',value);};
 const common=(rows,i)=>{const row=rows[i];if(!row)throw new Error('Unknown POTION common string '+i);return address(services[row[0]][row[1]]);};
 let context;
 const callback=name=>environment.functionPointer('potion::'+name,'ip',pointer=>transport.scoped(()=>withCEnvironment(context,source[name],context.object(pointer))));
 Object.assign(local,{moduleKey:environment,heap:()=>memory.HEAPU8,literal:services.literal,stackAlloc:transport.stackAlloc,stackSave:transport.stackSave,stackRestore:transport.stackRestore,
  global:i=>{const name=abi.globals[i];if(!name)throw new Error('Unknown POTION global '+i);return environment.requireGlobal(name);},
  equipment:i=>ctypes.load('struct obj *',environment.requireGlobal(abi.equipment[i])),bit:(type,p,i)=>bit(type,p,i),setBit:(type,p,i,value)=>bit(type,p,i,value),
  commonString:i=>i===6?address(services.c_common_strings.c_the_your):common(abi.common,i),color:i=>common(abi.colors,i),hands:()=>environment.requireGlobal('hands_obj'),winMessage:()=>ctypes.load('int',environment.requireGlobal('WIN_MESSAGE')),
  y_n:query=>resolve('yn_function')(text(query),environment.requireGlobal('ynchars'),110,1),
  display_nhwindow:(win,block)=>{const field=ctypes.locate('struct window_procs',environment.requireGlobal('windowprocs'),'win_display_nhwindow');return functions.indirect(memory.view.getBigUint64(field.at,true),'vii',transport.int(win),transport.char(block));},
  getobj:(query,index,flags)=>{const name=['drink_ok','dip_ok','dip_hands_ok'][index];if(!name)throw new Error('Unknown POTION object filter');return resolve('getobj')(text(query),callback(name),transport.uint(flags));},
  short_oname:(obj,length)=>resolve('short_oname')(address(obj),environment.functionPointer('doname','pp'),environment.functionPointer('thesimpleoname','pp'),transport.uint(length)),
  assert:value=>{if(!value){const row=abi.assertion;return resolve('__assert_fail')(text(row.condition),text('potion.c'),row.line,text(row.function));}},
  Sprintf:(out,format,...args)=>services.sprintf(address(out),text(format),...boundary(args)),
  Snprintf:(out,n,format,...args)=>{const index=args.pop(),site=abi.formats[index];if(!site)throw new Error('Unknown POTION bounded-format site '+index);return resolve('nh_snprintf')(text(site.function),site.line,address(out),transport.ulong(n),text(format),...boundary(args));},
 });
 for(const name of ['rn2','rnd','rnl'])local[name]=(n,line,caller)=>{if(line!==undefined&&services.rng_log_enabled())services.rng_log_set_caller(text('potion.c'),line,text(caller));return resolve(name)(transport.int(n));};
 local.d=(n,x,line,caller)=>{if(line!==undefined&&services.rng_log_enabled())services.rng_log_set_caller(text('potion.c'),line,text(caller));return resolve('d')(transport.int(n),transport.int(x));};
 for(const name of ['pline','pline_The','You','You_feel','Your','verbalize','impossible','livelog_printf'])local[name]=(...args)=>resolve(name)(...boundary(args));
 context=createPotionEnvironment(local,L);
 const names=Object.keys(abi.public).filter(name=>!environment.hasFunction(name));
 const cell=pointer=>Object.defineProperty({address:address(pointer)},'value',{get:()=>ctypes.load('long',address(pointer)),set:value=>ctypes.store('long',address(pointer),value)});
 const convert={obj:context.object,mon:context.monster,pm:context.permonst,monp:context.monPointer,longp:cell};
 environment.register('potion',Object.fromEntries(names.map(name=>[name,(...args)=>{const value=source[name](...args);return typeof value==='string'?text(value):value?.address??value;}])),context,{prepareArgs:(name,args)=>args.map((value,i)=>{const kind=abi.types[name]?.[i];return convert[kind]?convert[kind](address(value)):value;})});
 return{context,services:local,exports:names,limitation:'Original POTION public entries and one private drink/filter context connected. Intrinsic scalar helpers and reached expiry effects need original-C acceptance; quaff/dip/effect/object/monster/death branches require their actual remaining owners and separate verification.'};
}
