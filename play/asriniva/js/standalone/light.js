// One original LIGHT environment over the existing source-owned light chain.
import abi from './light-abi.json' with {type:'json'};
import * as source from '../ported/light.js';
import {createLightEnvironment} from '../nethack/bindings/light.js';
import {withCEnvironment} from '../c-runtime/context.js';
const owners=new WeakMap();
export function enableLight(environment,layouts){
 if(owners.has(environment))return owners.get(environment);
 const {services:S,memory,ctypes,transport}=environment,L=layouts.light,address=environment.address;
 for(const[k,v]of Object.entries(abi.layout))if(L[k]!==v)throw new Error('Review LIGHT native ABI '+k);
 const text=v=>typeof v==='string'?S.literal(v):address(v),resolve=n=>environment.hasFunction(n)?environment.resolve(n):typeof S[n]==='function'?S[n]:environment.resolve(n);
 const value=(t,v)=>{t=ctypes.canonical(t);if(t==='void')return undefined;if(t.includes('*'))return text(v);if(t==='unsigned long')return transport.ulong(v);if(t==='long')return transport.long(v);if(t==='unsigned int')return transport.uint(v);if(t==='unsigned short')return transport.ushort(v);if(t==='short')return transport.short(v);if(t==='char'||t==='signed char')return transport.char(v);if(t==='unsigned char')return transport.uchar(v);return transport.int(v);};
 const local={heap:()=>memory.HEAPU8,literal:S.literal,stackAlloc:transport.stackAlloc,stackSave:transport.stackSave,stackRestore:transport.stackRestore,
  global:i=>{const n=abi.globals[i];if(!n)throw new Error('Unknown LIGHT global '+i);return environment.requireGlobal(n);},
  uskin:()=>ctypes.load('struct obj *',environment.requireGlobal('uskin')),
  objectBit:(p,i)=>ctypes.getField('struct obj',address(p),abi.objectBits[i],'unsigned int'),setObjectBit:(p,i,v)=>ctypes.setField('struct obj',address(p),abi.objectBits[i],'unsigned int',v),
  monsterBit:(p,i)=>ctypes.getField('struct monst',address(p),abi.monsterBits[i],'unsigned int'),setMonsterBit:(p,i,v)=>ctypes.setField('struct monst',address(p),abi.monsterBits[i],'unsigned int',v),
  terrainBit:(x,y)=>ctypes.getField('struct rm',environment.requireGlobal('svl')+L.terrain+(transport.short(x)*L.ROWNO+transport.short(y))*L.terrainSize,'lit','unsigned int'),
  assert:(ok,i)=>{if(!ok){const a=abi.assertions[i];if(!a)throw new Error('Unknown LIGHT assertion '+i);return resolve('__assert_fail')(text(a.condition),text('light.c'),a.line,text(a.function));}},
  free:p=>S.free(address(p)),nh_delay_output:()=>resolve('nh_delay_output')(),
 };
 for(const[n,proto]of Object.entries(abi.dependencies)){const m=proto.match(/^(.+?)\s*\((.*)\)$/),types=m[2].split(',').map(t=>t.trim()).filter(t=>t&&t!=='void');local[n]=(...args)=>value(m[1],resolve(n)(...args.map((v,i)=>value(types[i],v))));}
 local.alloc=n=>environment.alloc('alloc',transport.uint(n));
 for(const n of ['panic','impossible'])local[n]=(f,...a)=>resolve(n)(text(f),...a.map(v=>typeof v==='string'?text(v):v?.address??v));
 local.Sprintf=(p,f,...a)=>S.sprintf(address(p),text(f),...a.map(v=>typeof v==='string'?text(v):v?.address??v));
 for(const dir of ['sfo','sfi'])for(const t of ['int','ls_t'])local[(dir==='sfo'?'Sfo_':'Sfi_')+t]=(f,p,tag)=>resolve(dir+'_'+t)(address(f),address(p),text(tag));
 const context=createLightEnvironment(local,L);
 function call(name,...args){const proto=abi.public[name];if(!proto)throw new Error('Unknown LIGHT public function '+name);const m=proto.match(/^(.+?)\s*\((.*)\)$/),types=m[2].split(',').map(t=>t.trim()).filter(t=>t&&t!=='void');args=args.map((v,i)=>value(types[i],v));
  if(['show_transient_light','obj_sheds_light','obj_is_burning','obj_adjust_light_radius','candle_light_range','arti_light_radius','arti_light_description'].includes(name))args[0]=context.object(args[0]);
  if(['obj_move_light_source','obj_split_light_source','obj_merge_light_sources'].includes(name))args=args.map(p=>context.object(p));
  if(['save_light_sources','restore_light_sources'].includes(name))args[0]=context.nhfile(args[0]);
  if(['new_light_source','del_light_source'].includes(name)){const i=name==='new_light_source'?4:1;args[i]=context.anything(args[i]);}
  if(name==='do_light_sources')args[0]=context.seenRows(args[0]);
  if(name==='light_stats'){args[2]=context.longPointer(args[2]);args[3]=context.longPointer(args[3]);}
  return transport.scoped(()=>value(m[1],withCEnvironment(context,()=>source[name](...args))));
 }
 const names=Object.keys(abi.public).filter(n=>!environment.hasFunction(n));environment.register('monster-lights',Object.fromEntries(names.map(n=>[n,(...a)=>call(n,...a)])));
 const owner={context,services:local,call,exports:names,limitation:'Unchanged LIGHT policies and shared native light chain; only individually C-compared paths accepted. Optional light variants remain unverified.'};owners.set(environment,owner);return owner;
}
