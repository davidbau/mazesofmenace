// Original INSIGHT information/disclosure policies, one native private state.
import abi from './insight-abi.json' with {type:'json'};
import * as source from '../ported/insight.js';
import {initializeInsight,callInsight} from '../nethack/bindings/insight.js';
const owners=new WeakMap();
export function enableInsight(environment,layouts){
 if(owners.has(environment))return owners.get(environment);
 const {services,memory,ctypes,transport,functions}=environment,L=layouts.insight,address=environment.address;
 for(const[key,value]of Object.entries(abi.layout))if(L[key]!==value)throw new Error('Review INSIGHT configured ABI '+key);
 const text=value=>typeof value==='string'?services.literal(value):address(value),boundary=args=>args.map(v=>typeof v==='string'?services.literal(v):v?.address??v),resolve=name=>environment.hasFunction(name)?environment.resolve(name):typeof services[name]==='function'?services[name]:environment.resolve(name),forwards=new Map();
 const local=new Proxy(Object.create(services),{get:(o,key,r)=>{if(Object.hasOwn(o,key))return Reflect.get(o,key,r);const value=Reflect.has(o,key)?Reflect.get(o,key,r):undefined;if(value!==undefined&&typeof value!=='function')return value;if(typeof key!=='string')return value;if(!forwards.has(key))forwards.set(key,(...args)=>resolve(key)(...boundary(args)));return forwards.get(key);}});
 const storage=abi.storageSizes.map((n,i)=>environment.allocateGlobal('insight.'+['vanqorders','sizebuf','piousbuf','punctclasses'][i],n));
 const code=type=>{type=ctypes.canonical(type);return type.includes('*')?'p':type==='void'?'v':/\b(float|double)\b/.test(type)?'d':ctypes.size(type)===8?'j':'i';};
 const windowCall=(name,...args)=>{const declaration=abi.windows[name],type=declaration?.replace(new RegExp('\\s+'+name+'$'),'').replace(new RegExp('\\(\\s*\\*\\s*'+name+'\\s*\\)'),'(*)'),match=type?.match(/^(.+?)\s*\(\*\)\s*\((.*)\)$/);if(!match)throw new Error('Unknown INSIGHT window callback '+name);const signature=[match[1],...match[2].split(',').map(v=>v.trim()).filter(v=>v&&v!=='void')].map(code).join(''),at=ctypes.locate('struct window_procs',environment.requireGlobal('windowprocs'),name).at;return functions.indirect(memory.view.getBigUint64(at,true),signature,...boundary(args));};
 Object.assign(local,{moduleKey:environment,heap:()=>memory.HEAPU8,literal:services.literal,stackAlloc:transport.stackAlloc,stackSave:transport.stackSave,stackRestore:transport.stackRestore,
  global:index=>{const name=Object.keys(abi.schema.globals)[index];if(!name)throw new Error('Unknown INSIGHT global '+index);return environment.requireGlobal(name);},
  storage:index=>{const p=storage[index];if(p===undefined)throw new Error('Unknown INSIGHT storage '+index);return p;},
  getBit:(p,index)=>{const[type,field]=abi.bits[index]??[];if(!field)throw new Error('Unknown INSIGHT packed field '+index);return ctypes.getField(type,address(p),field,'unsigned int');},
  setBit:(p,index,value)=>{const[type,field]=abi.bits[index]??[];if(!field)throw new Error('Unknown INSIGHT packed field '+index);return ctypes.setField(type,address(p),field,'unsigned int',value);},
  alloc:n=>environment.alloc('alloc',transport.uint(n)),free:p=>services.free(address(p)),
  Strcpy:(a,b)=>services.strcpy(text(a),text(b)),Strcat:(a,b)=>services.strcat(text(a),text(b)),
  Sprintf:(out,format,...args)=>services.sprintf(address(out),text(format),...boundary(args)),
  Snprintf:(out,n,format,...args)=>{const index=args.pop(),site=abi.formats[index];if(!site)throw new Error('Unknown INSIGHT formatter site '+index);return resolve('nh_snprintf')(text(site.function),site.line,address(out),transport.ulong(n),text(format),...boundary(args));},
  assert:(ok,index)=>{if(ok)return;if(index!==0)throw new Error('Unknown INSIGHT assertion '+index);const row=abi.assertion;return resolve('__assert_fail')(text(row.expression),text('insight.c'),row.line,text(row.function));},
  qsort:(p,n,z)=>resolve(abi.qsort.target)(address(p),transport.ulong(n),transport.ulong(z),environment.functionPointer('insight::vanqsort_cmp','ipp',(a,b)=>callInsight(local,L,'vanqsort_cmp',address(a),address(b)))),
 });
 const callbacks={create_nhwindow:'win_create_nhwindow',destroy_nhwindow:'win_destroy_nhwindow',display_nhwindow:'win_display_nhwindow',start_menu:'win_start_menu',end_menu:'win_end_menu',putstr:'win_putstr',putmixed:'win_putmixed',raw_print:'win_raw_print'};
 for(const[name,target]of Object.entries(callbacks))local[name]=(...args)=>windowCall(target,...args);
 for(const name of ['pline','pline_The','You','Your','You_feel','You_hear','You_see','urgent_pline','verbalize','impossible','panic','livelog_printf'])local[name]=(...args)=>resolve(name)(...boundary(args));
 initializeInsight(local,L);
 // Original exported table aliases the initialized native backing; no second copy.
 environment.linkGlobal('vanqorders',storage[abi.publicStorage.vanqorders]);
 const names=Object.keys(abi.public).filter(name=>!environment.hasFunction(name)),parameters=name=>abi.public[name].match(/\(([^)]*)\)/)[1].split(',').map(v=>v.trim()).filter(v=>v&&v!=='void');
 const convert=(type,value)=>type.includes('*')?text(value):['char','schar','boolean','aligntyp'].includes(type)?transport.char(value):type==='unsigned int'?transport.uint(value):type==='long'?transport.long(value):type==='coordxy'?transport.short(value):transport.int(value);
 environment.register('insight',Object.fromEntries(names.map(name=>[name,(...args)=>{const types=parameters(name),value=callInsight(local,L,name,...args.map((arg,i)=>{if(!types[i])throw new Error('Extra INSIGHT argument '+name);return convert(types[i],arg);}));const type=abi.public[name].split(' (')[0];return type==='boolean'?Number(Boolean(value)):type.includes('*')?text(value):value;}] )));
 const owner={services:local,storage,exports:names,limitation:'Original whole INSIGHT public dispatch, static table/buffer state and native transport connected. Existing align_str source owner preserved. Default disclosure and broad information/menu/achievement/monster branches require strict original-C acceptance; missing foreign owners fail explicitly.'};owners.set(environment,owner);return owner;
}
