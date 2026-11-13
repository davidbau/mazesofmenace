// Source END killer list and persistence, sharing the original embedded head.
import {delayed_killer,find_delayed_killer,dealloc_killer,save_killers,restore_killers} from '../ported/end.js';
import {createRecordViews} from './record-views.js';
const owners=new WeakMap();
export function enableKillerState(environment,layouts){
 if(owners.has(environment))return owners.get(environment);
 const {services,ctypes,memory,transport}=environment,address=environment.address,L=layouts.end,views=createRecordViews(environment);
 if(ctypes.size('struct kinfo')!==L.kinfoSize)throw new Error('Review changed END killer ABI');
 const text=v=>typeof v==='string'?services.literal(v):address(v),cache=new Map();
 const kinfo=p=>{p=address(p);if(!p)return 0;if(cache.has(p))return cache.get(p);const view={address:p};cache.set(p,view);Object.defineProperties(view,{next:{get:()=>kinfo(ctypes.getField('struct kinfo',p,'next','void *')),set:v=>ctypes.setField('struct kinfo',p,'next','void *',address(v))},name:{get:()=>ctypes.locate('struct kinfo',p,'name').at}});for(const key of ['id','format'])Object.defineProperty(view,key,{get:()=>ctypes.getField('struct kinfo',p,key,'int'),set:v=>ctypes.setField('struct kinfo',p,key,'int',v)});return view;};
 const local=Object.create(services);for(const name of ['svk','iflags'])Object.defineProperty(local,name,{value:undefined,writable:true,configurable:true});
 const head=kinfo(ctypes.locate('struct instance_globals_saved_k',environment.requireGlobal('svk'),'killer').at);
 Object.assign(local,{kinfo,kinfoSize:L.kinfoSize,svk:{killer:head},config_DEBUG:L.config_DEBUG,iflags:views.record('struct instance_flags',environment.requireGlobal('iflags')),
  alloc:n=>environment.alloc('alloc',n),free:p=>services.free(address(p)),memset:(p,v,n)=>memory.memset(address(p),v,n),samePtr:(a,b)=>address(a)===address(b),
  Strcpy:(out,input)=>services.strcpy(address(out),text(input)),byte:p=>Object.defineProperty({address:address(p)},'value',{get:()=>transport.read('Int8',address(p)),set:v=>transport.write('Int8',address(p),v)}),
  impossible:(format,id)=>environment.resolve('impossible')(text(format),transport.int(id)),debugcore:(file,flag)=>environment.resolve('debugcore')(text(file),transport.int(flag)),pline:(format,id)=>environment.resolve('pline')(text(format),transport.int(id)),
  update_file:file=>file.mode&(L.COUNTING|L.WRITING),release_data:file=>file.mode&L.FREEING,
 });
 for(const direction of ['sfo','sfi'])local[(direction==='sfo'?'Sfo_':'Sfi_')+'kinfo']=(file,data,tag)=>environment.resolve(direction+'_kinfo')(address(file),address(data),text(tag));
 const namespace={delayed_killer,find_delayed_killer,dealloc_killer,save_killers,restore_killers};
 environment.register('end-killer-state',Object.fromEntries(Object.entries(namespace).map(([name,fn])=>[name,(...args)=>{const result=fn(...args);return result?.address??result;}])),local,{prepareArgs:(name,args)=>name==='delayed_killer'?[transport.int(args[0]),transport.int(args[1]),text(args[2])]:name==='find_delayed_killer'?[transport.int(args[0])]:name==='dealloc_killer'?[kinfo(args[0])]:[views.record('struct nh_file',address(args[0]))]});
 const owner={environment:local,head,limitation:'Original shared END killer-state policies; fatal/score/exit lifecycle and C persistence acceptance remain separate.'};owners.set(environment,owner);return owner;
}
