// Shared memory and typed callbacks for the unchanged BOTL adapter.
import abi from './status-abi.json' with {type:'json'};
import records from './records.json' with {type:'json'};
import {createCTypes} from './c-types.js';
import * as botl from '../ported/botl.js';
import {initializeBotl,callBotl} from '../ported/botl-runtime.js';
import windowAbi from './window-abi.json' with {type:'json'};
export function enableStatus(environment,layouts){
 const {services,memory,transport,functions}=environment,L=layouts.botl;
 const ctypes=createCTypes(memory,{...records,records:{...records.records,...abi.records}},environment.bitfields);
 const width=d=>d.t?Number(d.t.slice(1))/8:d.p!==undefined||d.q||d.f?8:d.s?L[d.s+'Size']:d.a.reduce((n,v)=>n*v,1)*width(d.e);
 for(const name of ['enc_stat','conditions','condtests','cond_idx','terrain_descr']){const row=abi.globals.find(g=>g.name===name);environment.allocateGlobal(name,width(row.d));}
 const local=new Proxy(Object.create(services),{get:(o,k,r)=>{
  if(Reflect.has(o,k)){const value=Reflect.get(o,k,r);return typeof value==='function'&&!Object.hasOwn(o,k)?(...args)=>value(...args.map(v=>v?.address??v)):value;}
  return typeof k==='string'?(...args)=>environment.resolve(k)(...args.map(v=>v?.address??v)):undefined;
 }});
 const kinds=Object.keys(abi.schemas),scalar=d=>d.t?{i8:'signed char',u8:'unsigned char',i16:'short',u16:'unsigned short',i32:'int',u32:'unsigned int',i64:'long',u64:'unsigned long'}[d.t]:'void *';
 const field=(kind,index)=>{const row=abi.schemas[kinds[kind]],f=row?.fields[index];if(!f)throw new Error('Unknown status field');return {type:row.ctype,f};};
 const cptr=v=>typeof v==='string'?services.literal(v):environment.address(v);
 Object.assign(local,{dataInitialized:false,moduleKey:environment,heap:()=>memory.HEAPU8,signedHeap:()=>memory.HEAP8,literalLength:v=>v.length,
  global:i=>environment.requireGlobal(abi.globals[i].name),
  read:(kind,p,index)=>{const e=field(kind,index);return e.f.d.a||e.f.d.s?BigInt(ctypes.locate(e.type,environment.address(p),e.f.name).at):ctypes.getField(e.type,environment.address(p),e.f.name,scalar(e.f.d));},
  write:(kind,p,index,value)=>{const e=field(kind,index);if(e.f.d.a||e.f.d.s)return memory.memmove(ctypes.locate(e.type,environment.address(p),e.f.name).at,environment.address(value),width(e.f.d));return ctypes.setField(e.type,environment.address(p),e.f.name,scalar(e.f.d),value);},
  address:(kind,p,index)=>{const e=field(kind,index);return ctypes.locate(e.type,environment.address(p),e.f.name).at;},
  callbackPointer:i=>{const name=['cond_cmp','menualpha_cmp'][i];if(!name)throw new Error('Unknown status callback');return environment.functionPointer('botl::'+name,'ipp',(...args)=>callBotl(local,L,name,...args));},
  alloc:n=>environment.alloc('alloc',Number(n)),free:p=>services.free(environment.address(p)),memset:(p,v,n)=>services.memset(environment.address(p),v,n),
  Sprintf:(out,format,...args)=>services.sprintf(cptr(out),cptr(format),...args.filter(v=>v?.varargSite===undefined).map(v=>v?.address??v)),
 });
 for(const name of ['on_level','In_quest','depth'])local[name]=(...args)=>environment.resolve(name)(...args.map(v=>v?.address??v));
 for(const name of ['strlen','strcpy','strcat','strcmp','strchr','strrchr','strstr'])local[name]=(...args)=>services[name](cptr(args[0]),...args.slice(1).map(v=>typeof v==='string'?cptr(v):v?.address??v));
 const code=type=>{type=ctypes.canonical(type);return type.includes('*')?'p':type==='void'?'v':ctypes.size(type)===8?'j':'i';};
 for(const name of ['status_init','status_finish','status_enablefield','status_update']){const key='win_'+name,type=windowAbi.windows.callbacks[key],match=type.match(/^(.+?)\s*\(\*\)\s*\((.*)\)$/);if(!match)throw new Error('Unknown status window ABI '+key);const signature=[match[1],...match[2].split(',').map(v=>v.trim()).filter(v=>v&&v!=='void')].map(code).join('');local[name]=(...args)=>{const f=ctypes.record('struct window_procs').fields[key],fn=memory.view.getBigUint64(environment.requireGlobal('windowprocs')+f.offset,true);return functions.indirect(fn,signature,...args.map(v=>typeof v==='string'?cptr(v):v?.address??v));};}
 initializeBotl(local,L);
 const names=Object.keys(botl).filter(name=>typeof botl[name]==='function'&&!environment.hasFunction(name));
 environment.register('status',Object.fromEntries(names.map(name=>[name,(...args)=>callBotl(local,L,name,...args)])));
 return {services:local,context:callBotl(local,L,'environment'),ctypes,limitation:'Status initialization integration in progress; source state, callbacks and full-game output require C verification.'};
}
