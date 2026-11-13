import {nativeStateFor} from './native/state-bridge.js';
// Existing vision adapter, original policy, shared measured storage.
import abi from './vision-abi.json' with {type:'json'};
import * as source from '../ported/vision.js';
import {initializeVision,callVision} from './bindings/vision.js';
export function enableVision(environment,layouts){
 const {services,ctypes,memory,functions}=environment,L=layouts.vision;
 const nativeState=nativeStateFor(environment),calls=new Map();
 const local=new Proxy(Object.create(services),{get(o,k,r){if(Object.hasOwn(o,k)||typeof k!=='string')return Reflect.get(o,k,r);const native=nativeState.functions.get(k);if(native)return native;const value=Reflect.get(o,k,r);if(Reflect.has(o,k))return typeof value==='function'?value.nativeEntry??value:value;const old=calls.get(k);if(old&&old.source===value)return old.call;const call=(...args)=>environment.resolve(k)(...args);calls.set(k,{source:value,call});return call;}});
 const width=d=>d.t?Number(d.t.slice(1))/8:d.p!==undefined||d.q||d.f?8:d.s?L[d.s+'Size']:d.a.reduce((n,k)=>n*k,1)*width(d.e);
 const rows=[...abi.privateStorage,...['circle_data','circle_start'].map(name=>({name,d:{a:[source[name].length],e:{t:'i16'}}}))];
 const storage=rows.map(row=>environment.allocateGlobal('vision.'+row.name,width(row.d))),names=Object.keys(abi.schemas);
 function field(kind,p,i){const schema=abi.schemas[names[kind]],f=schema?.fields[i];if(!f)throw new Error('Unknown VISION field '+kind+':'+i);return{schema,f,at:ctypes.locate(schema.ctype,environment.address(p),f.name).at};}
 Object.assign(local,{moduleKey:environment,nativeGlobalBindings:true,global:i=>{const row=abi.globals[i];if(!row)throw new Error('Unknown VISION global '+i);return environment.requireGlobal(row.name);},storage:i=>{if(storage[i]===undefined)throw new Error('Unknown VISION storage '+i);return storage[i];},
  read:(k,p,i)=>{const {schema,f,at}=field(k,p,i);return f.d.a||f.d.s?at:ctypes.getField(schema.ctype,environment.address(p),f.name,f.ctype);},
  write:(k,p,i,value)=>{const {schema,f,at}=field(k,p,i);return f.d.a||f.d.s?memory.memmove(at,environment.address(value),width(f.d)):ctypes.setField(schema.ctype,environment.address(p),f.name,f.ctype,value);},
  address:(k,p,i)=>field(k,p,i).at,
  memset:(p,v,n)=>services.memset(environment.address(p),v,n),
  on_level:(a,b)=>environment.resolve('on_level')(environment.address(a),environment.address(b)),
  invoke:(cb,x,y,arg)=>functions.indirect(cb,'viip',x,y,environment.address(arg)),
  explicitdebug:text=>environment.resolve('debugcore')(typeof text==='string'?services.literal(text):environment.address(text),0),
  assert:(ok,expression,fn,line)=>{if(!ok)environment.resolve('__assert_fail')(services.literal(expression),services.literal('vision.c'),line,services.literal(fn));},
  panic:(format,n)=>environment.resolve('panic')(typeof format==='string'?services.literal(format):format,n),
 });
 for(const name of ['canseemon','detecting','mon_visible','see_with_infrared','tp_sensemon','worm_known'])local[name]=p=>environment.resolve(name)(environment.address(p));
 const context=initializeVision(local,L),only=['vision_init','vision_recalc','vision_reset','block_point','unblock_point','recalc_block_point','clear_path','do_clear_area','does_block','get_viz_clear','howmonseen'];
 environment.register('vision',Object.fromEntries(only.map(name=>{const call=(...args)=>callVision(local,L,name,...args);call.nativeState=nativeState;call.nativeDirect=true;nativeState.functions.set(name,call);return [name,call];})));
 return {context,storage,rows};
}
