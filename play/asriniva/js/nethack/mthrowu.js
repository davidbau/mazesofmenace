// One original projectile/line-check context and private state on shared bytes.
import abi from './mthrowu-abi.json' with {type:'json'};
import {callMthrowu} from './bindings/mthrowu.js';
import {createRecordViews} from './record-views.js';
const owners=new WeakMap();
export function enableMthrowu(environment,layouts){
 if(owners.has(environment))return owners.get(environment);
 const {services,ctypes,memory,transport,functions}=environment,L=layouts.mthrowu,address=environment.address,text=v=>typeof v==='string'?services.literal(v):address(v),views=createRecordViews(environment);
 for(const[k,v]of Object.entries(abi.layout))if(L[k]!==v)throw new Error('Review MTHROWU ABI '+k);
 const resolve=n=>environment.hasFunction(n)?environment.resolve(n):typeof services[n]==='function'?services[n]:environment.resolve(n);
 const scalar=(t,v)=>{t=ctypes.canonical(t);if(t.includes('*'))return text(v);if(t==='void')return undefined;if(t==='char'||t==='signed char')return transport.char(v);if(t==='unsigned char')return transport.uchar(v);if(t==='short')return transport.short(v);if(t==='unsigned short')return transport.ushort(v);if(t==='unsigned int')return transport.uint(v);if(ctypes.size(t)===8)return t.startsWith('unsigned')?transport.ulong(v):transport.long(v);return transport.int(v);};
 // MTHROWU delegates projectile durability to the original DOTHROW owner.
 if(!environment.hasFunction('should_mulch_missile')){
  if(Object.hasOwn(environment.status(),'dothrow'))environment.exposeAddressPort('dothrow',['should_mulch_missile']);
  else environment.enableAddressPort('dothrow',{only:['should_mulch_missile']});
 }
 const local=Object.create(services);
 for(const[name,{target,prototype}]of Object.entries(abi.calls)){const m=prototype.match(/^(.+?)\s*\((.*)\)$/),args=m[2].split(',').map(t=>t.trim()).filter(t=>t&&t!=='void');local[name]=(...values)=>scalar(m[1],resolve(target)(...values.map((v,i)=>scalar(args[i],v))));}
 const bits={object:['struct obj',['cursed','greased','known','otrapped','otrapped','dknown']],monster:['struct monst',['isminion','mblinded','mcan','mcansee','mconf','mflee','msleeping','mstun']]};
 for(const[k,[type,names]]of Object.entries(bits)){local[k+'Bit']=(p,i)=>{if(!names[i])throw new Error('Unknown MTHROWU '+k+' bit');return ctypes.getField(type,address(p),names[i],'unsigned int');};local['set'+k[0].toUpperCase()+k.slice(1)+'Bit']=(p,i,v)=>{if(!names[i])throw new Error('Unknown MTHROWU '+k+' bit');return ctypes.setField(type,address(p),names[i],'unsigned int',v);};}
 Object.assign(local,{moduleKey:environment,heap:()=>memory.HEAPU8,literal:services.literal,stackAlloc:transport.stackAlloc,stackSave:transport.stackSave,stackRestore:transport.stackRestore,
  global:i=>{const name=abi.globals[i];if(!name)throw new Error('Unknown MTHROWU global '+i);return environment.requireGlobal(name);},
  heroBit:i=>{const u=views.record('struct you',environment.requireGlobal('u'));if(i===0)return u.uundetected;if(i===1)return u.uroleplay.deaf;if(i===2)return u.uinwater;throw new Error('Unknown MTHROWU hero bit');},
  terrainBit:p=>ctypes.getField('struct rm',address(p),'flags','unsigned int'),
  classBit:(p,i)=>{if(i!==0)throw new Error('Unknown MTHROWU class bit');return ctypes.getField('struct objclass',address(p),'oc_material','unsigned int');},
  returnBit:p=>ctypes.getField('struct throw_and_return_weapon',address(p),'tethered','unsigned int'),
  common:i=>{const name=['c_something','c_Something','c_vision_clears'][i];if(!name)throw new Error('Unknown MTHROWU common string');return ctypes.getField('struct c_common_strings',environment.requireGlobal('c_common_strings'),name,'const char *');},
  invokeLineCallback:(fn,x,y)=>functions.indirect(fn,'iii',transport.short(x),transport.short(y)),nh_delay_output:()=>resolve('nh_delay_output')(),
  singular:(o,fn)=>{if(fn!==local.xname)throw new Error('Review MTHROWU singular callback');return resolve('singular')(address(o),environment.functionPointer('xname','pp'));},
  distant_name:(o,fn)=>{if(fn!==local.mshot_xname)throw new Error('Review MTHROWU distant callback');return resolve('distant_name')(address(o),environment.functionPointer('mshot_xname','pp'));},
  Sprintf:(out,fmt,...a)=>{if(a.length!==1&&a.length!==2)throw new Error('Unknown MTHROWU sprintf ABI');return resolve('sprintf')(address(out),text(fmt),...a.map((v,i)=>a.length===2&&i===0?transport.int(v):text(v)));},
  Snprintf:(out,n,fmt,s)=>resolve('nh_snprintf')(text('u_catch_thrown_obj'),544,address(out),transport.ulong(n),text(fmt),text(s)),Strcpy:(out,s)=>resolve('strcpy')(address(out),text(s)),
  impossible:(fmt,n=0)=>resolve('impossible')(text(fmt),transport.int(n)),panic:s=>resolve('panic')(text('%s'),text(s)),Your1:s=>resolve('Your')(text('%s'),text(s)),
 });
 for(const name of ['rn2','rnd'])local[name]=(n,caller,line)=>{if(services.rng_log_enabled())services.rng_log_set_caller(text('mthrowu.c'),transport.int(line),text(caller));return resolve(name)(transport.int(n));};
 for(const name of ['pline','pline_The','You','Your','You_hear'])local[name]=(fmt,...args)=>resolve(name)(text(fmt),...args.map(text));
 local.pline_mon=(m,fmt,...args)=>resolve('pline_mon')(address(m),text(fmt),...args.map(text));
 for(const name of abi.globals)Object.defineProperty(local,name,{value:undefined,writable:true,configurable:true});
 const context=callMthrowu(local,L,'environment');
 // The original header's role mnum is short; this projection uses its measured field.
 context.Role_if=n=>ctypes.getField('struct Role',ctypes.locate('struct instance_globals_u',environment.requireGlobal('gu'),'urole').at,'mnum','short')===n;
 const owner={services:local,context,call:(name,...args)=>{const value=callMthrowu(local,L,name,...args.map(v=>v?.address??v));return value?.address??value;},limitation:'Original MTHROWU transport; line checks, thrown objects, callbacks and combat/fatal effects require connected original-C acceptance.'};
 environment.register('mthrowu',Object.fromEntries(abi.public.filter(n=>!environment.hasFunction(n)).map(n=>[n,(...args)=>owner.call(n,...args)])),local);owners.set(environment,owner);return owner;
}
