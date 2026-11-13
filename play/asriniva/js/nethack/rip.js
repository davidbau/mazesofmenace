// Original tombstone policy through the unchanged native RIP bridge.
import abi from './rip-abi.json' with {type:'json'};
import {createPortedRuntime} from '../backends/emscripten/runtime.js';
const owners=new WeakMap();
export function enableRip(environment,layouts){
 if(owners.has(environment))return owners.get(environment);
 const {services,memory,ctypes,transport,functions}=environment,L=layouts.rip,address=environment.address;
 for(const[k,v]of Object.entries(abi.layout))if(L[k]!==v)throw new Error('Review RIP native layout '+k);
 const locate=name=>{const row=abi.fields[name],field=ctypes.record(row.type).fields[row.field];if(field.offset!==row.offset||field.ctype!==row.ctype)throw new Error('Review RIP native field '+name);return environment.requireGlobal(row.global)+row.offset;};
 const head=locate('head'),name=locate('name'),money=locate('money');
 const resolve=n=>environment.hasFunction(n)?environment.resolve(n):typeof services[n]==='function'?services[n]:environment.resolve(n);
 const text=v=>typeof v==='string'?services.literal(v):address(v);
 const putstr=(win,attr,value)=>{const row=ctypes.locate('struct window_procs',environment.requireGlobal('windowprocs'),'win_putstr');return functions.indirect(memory.view.getBigUint64(row.at,true),'viip',transport.int(win),transport.int(attr),text(value));};
 const local=Object.create(services);
 Object.assign(local,{heap:()=>memory.HEAPU8,signedHeap:()=>memory.HEAP8,stackAlloc:transport.stackAlloc,
  head:()=>head,name:()=>name,money:()=>ctypes.load('long',money),
  alloc:n=>environment.alloc('alloc',transport.uint(n)),dupstr:value=>address(resolve('dupstr')(text(value))),free:p=>resolve('free')(address(p)),strlen:p=>Number(resolve('strlen')(address(p))),
  Sprintf:(out,format,...args)=>{const row=abi.formats[format];if(!row||args.length!==row.length)throw new Error('Review RIP formatter '+format);return resolve('sprintf')(address(out),text(format),...args.map((v,i)=>row[i]==='pointer'?text(v):row[i]==='long'?transport.long(v):transport.int(v)));},
  formatkiller:(out,size,how,flag)=>resolve('formatkiller')(address(out),transport.uint(size),transport.int(how),transport.char(flag)),
  yyyymmdd:when=>transport.long(resolve('yyyymmdd')(transport.long(when))),putstr,
  dump_forward_putstr:(win,attr,value,forward)=>resolve('dump_forward_putstr')(transport.int(win),transport.int(attr),text(value),transport.char(forward)),
 });
 const bridge=createPortedRuntime(layouts).rip;
 const call=(win,how,when)=>transport.scoped(()=>bridge(local,'genl_outrip',transport.int(win),transport.int(how),transport.long(when)));
 if(!environment.hasFunction('genl_outrip'))environment.register('rip',{genl_outrip:call},local);
 const owner={services:local,head,name,money,call,limitation:'Original RIP normal-profile tombstone transport; focused and connected original-C rendering/cleanup comparison required. Alternate compile-time dedication/dumplog profiles are not accepted.'};
 owners.set(environment,owner);return owner;
}
