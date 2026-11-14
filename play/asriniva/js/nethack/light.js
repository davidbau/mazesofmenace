// Complete original LIGHT policies on canonical per-game native state.
import abi from './light-abi.json' with {type:'json'};
import {createNativeLight} from './native/light.js';
import {createNativeLightState} from './native/light-state.js';
import {nativeStateFor} from './native/state-bridge.js';
import {createNativeAbiCaster} from './native/execution.js';
const owners=new WeakMap();
export function enableLight(environment,layouts){
 if(owners.has(environment))return owners.get(environment);
 const {services:S,memory,ctypes,transport}=environment,L=layouts.light,address=environment.address,native=nativeStateFor(environment);
 for(const[k,v]of Object.entries(abi.layout))if(L[k]!==v)throw Error('Review LIGHT native ABI '+k);
 if(!native.nativeRecords||!native.nativeArena)throw Error('LIGHT requires the canonical native state owner');
 const text=v=>typeof v==='string'?S.literal(v):address(v),cast=createNativeAbiCaster(ctypes,transport,text);
 const resolve=n=>native.functions.get(n)??(environment.hasFunction(n)?environment.resolve(n):typeof S[n]==='function'?S[n]:environment.resolve(n));
 const prototype=p=>{const m=p.match(/^(.+?)\s*\((.*)\)$/);if(!m)throw Error('Invalid LIGHT prototype '+p);return{result:cast(m[1]),args:m[2].split(',').map(t=>t.trim()).filter(t=>t&&t!=='void').map(cast)};};
 const local={heap:()=>memory.HEAPU8,literal:S.literal,stackAlloc:transport.stackAlloc,stackSave:transport.stackSave,stackRestore:transport.stackRestore,free:p=>S.free(address(p))};
 for(const[n,proto]of Object.entries(abi.dependencies)){
  const p=prototype(proto);local[n]=(...args)=>{const fn=resolve(n);if(fn.nativeState===native&&fn.nativeDirect)return fn(...args);return p.result(native.boundary(fn,...args.map((v,i)=>p.args[i](v))));};
 }
 local.fmt_ptr=p=>address(resolve('fmt_ptr')(p?.address??p??0));
 const windowCall=(field,signature,...args)=>environment.nativeWindowCallbacks?environment.nativeWindowCallbacks.invoke(field,signature,...args):environment.functions.indirect(native.nativeArena.pointer(environment.requireGlobal('windowprocs')+ctypes.record('struct window_procs').fields[field].offset),signature,...args);
 Object.assign(local,{
  create_nhwindow:type=>windowCall('win_create_nhwindow','ii',transport.int(type)),
  putstr:(win,attr,s)=>windowCall('win_putstr','viip',transport.int(win),transport.int(attr),text(s)),
  display_nhwindow:(win,b)=>windowCall('win_display_nhwindow','vii',transport.int(win),transport.char(b)),
  destroy_nhwindow:win=>windowCall('win_destroy_nhwindow','vi',transport.int(win)),
  nh_delay_output:()=>resolve('nh_delay_output')(),
  assert:(ok,i)=>{if(!ok){const a=abi.assertions[i];if(!a)throw Error('Unknown LIGHT assertion '+i);return resolve('__assert_fail')(text(a.condition),text('light.c'),a.line,text(a.function));}},
  memset:(p,value,n)=>memory.memset(address(p),Number(value),Number(n)),
 });
 local.alloc=n=>resolve('alloc')(transport.uint(n));
 for(const n of ['panic','impossible'])local[n]=(f,...a)=>resolve(n)(text(f),...a.map(v=>typeof v==='string'?text(v):v?.address??v));
 local.Sprintf=(p,f,...a)=>S.sprintf(address(p),text(f),...a.map(v=>typeof v==='string'?text(v):v?.address??v));
 for(const dir of ['sfo','sfi'])for(const t of ['int','ls_t'])local[(dir==='sfo'?'Sfo_':'Sfi_')+t]=(f,p,tag)=>resolve(dir+'_'+t)(address(f),address(p),text(tag));
 const context=createNativeLightState(environment,L,native);Object.setPrototypeOf(context,local);
 for(const[name,type]of Object.entries({int:'int',uint:'unsigned int',coordxy:'short',long:'long',boolean:'signed char',bool:'bool'}))context[name]=cast(type);
 context.canspotmon=mon=>Boolean(local.canseemon(mon)||local.sensemon(mon));
 context.find_oid=id=>context.object(local.find_oid(id));
 const policies=createNativeLight(context),plans=Object.fromEntries(Object.entries(abi.public).map(([n,p])=>[n,prototype(p)]));
 function invoke(name,args){const p=plans[name];if(!p)throw Error('Unknown LIGHT public function '+name);
  if(['show_transient_light','obj_sheds_light','obj_is_burning','obj_adjust_light_radius','candle_light_range','arti_light_radius','arti_light_description'].includes(name))args[0]=context.object(args[0]);
  if(['obj_move_light_source','obj_split_light_source','obj_merge_light_sources'].includes(name))args=args.map(context.object);
  if(['save_light_sources','restore_light_sources'].includes(name))args[0]=context.nhfile(args[0]);
  if(['new_light_source','del_light_source'].includes(name)){const i=name==='new_light_source'?4:1;args[i]=context.anything(args[i]);}
  if(name==='do_light_sources')args[0]=context.seenRows(args[0]);
  if(name==='light_stats'){args[0]=text(args[0]);args[1]=text(args[1]);args[2]=context.longPointer(args[2]);args[3]=context.longPointer(args[3]);}
  const result=policies[name](...args);return result===undefined?undefined:p.result(result);
 }
 const exports={},registered={};for(const name of Object.keys(abi.public)){
  const fn=(...args)=>{const saved=native.depth?undefined:transport.stackSave();native.enter();try{return invoke(name,args);}finally{native.leave();if(saved!==undefined)transport.stackRestore(saved);}};
  fn.nativeState=native;fn.nativeDirect=true;fn.nativePrepared=true;native.functions.set(name,fn);exports[name]=fn;
  if(environment.hasFunction(name)){if(name!=='obj_sheds_light')throw Error('Review existing LIGHT owner '+name);environment.start('inventory-context').namespace[name]=fn;}else registered[name]=fn;
 }
 environment.register('monster-lights',registered);
 const owner={context,services:local,call:(name,...args)=>exports[name](...args),exports:Object.keys(exports),policies,limitation:'Native LIGHT policies share canonical actors, typed visibility rows and stable light identities; opaque union IDs retain all bits. Real allocation/byte serialization and remaining foreign owners retain boundaries. Full recording and advanced light/save verification are required.'};owners.set(environment,owner);return owner;
}
