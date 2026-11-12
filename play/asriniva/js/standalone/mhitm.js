// Whole original MHITM owner on one live native-view context.
import abi from './mhitm-abi.json' with{type:'json'};
import * as source from '../ported/mhitm.js';
import{createMhitmEnvironment}from'../ported/mhitm-runtime.js';
import{withCEnvironment}from'../ported/c-runtime.js';
export function enableMhitm(environment,layouts){
 const{services,memory,ctypes,transport}=environment,L=layouts.mhitm,address=environment.address,text=v=>typeof v==='string'?services.literal(v):address(v);
 for(const[k,v]of Object.entries(abi.layout))if(L[k]!==v)throw new Error('Review MHITM ABI '+k);
 const resolve=n=>environment.hasFunction(n)?environment.resolve(n):typeof services[n]==='function'?services[n]:environment.resolve(n),local=Object.create(services);
 const scalar=(t,v)=>{t=ctypes.canonical(t);if(t==='void')return undefined;if(t.includes('*'))return text(v);if(t==='signed char'||t==='char')return transport.char(v);if(t==='unsigned char')return transport.uchar(v);if(t==='short')return transport.short(v);if(t==='unsigned short')return transport.ushort(v);if(t==='unsigned int')return transport.uint(v);if(ctypes.size(t)===8)return t.startsWith('unsigned')?transport.ulong(v):transport.long(v);return transport.int(v);};
 for(const[name,{target,prototype}]of Object.entries(abi.calls)){
  const m=prototype.match(/^(.+?)\s*\((.*)\)$/),types=m[2].split(',').map(t=>t.trim()).filter(t=>t&&t!=='void');
  local[name]=(...args)=>scalar(m[1],resolve(target)(...args.map((v,i)=>scalar(types[i],v))));
 }
 const nested=(type,p,name)=>ctypes.locate(type,p,name).at;
 const bit=(p,i,v)=>{const n=abi.bits[i];if(!n)throw new Error('Unknown MHITM monster bit '+i);return v===undefined?ctypes.getField('struct monst',address(p),n,'unsigned int'):ctypes.setField('struct monst',address(p),n,'unsigned int',transport.uint(v));};
 Object.assign(local,{moduleKey:environment,heap:()=>memory.HEAPU8,literal:services.literal,stackSave:transport.stackSave,stackRestore:transport.stackRestore,stackAlloc:transport.stackAlloc,
  global:i=>{const n=abi.globals[i];if(!n)throw new Error('Unknown MHITM global '+i);return environment.requireGlobal(n);},monsterBit:(p,i)=>bit(p,i),setMonsterBit:(p,i,v)=>bit(p,i,v),
  heroBit:i=>{if(i===0)return ctypes.getField('struct you',environment.requireGlobal('u'),'uswallow','unsigned int');if(i===1)return ctypes.getField('struct u_roleplay',nested('struct you',environment.requireGlobal('u'),'uroleplay'),'deaf','boolean');throw new Error('Unknown MHITM hero bit '+i);},
  classMaterial:p=>ctypes.getField('struct objclass',address(p),'oc_material','unsigned int'),
  arboreal:()=>ctypes.getField('struct levelflags',nested('dlevel_t',nested('struct instance_globals_saved_l',environment.requireGlobal('svl'),'level'),'flags'),'arboreal','unsigned int'),
  commonString:i=>{const n=['c_something','c_nothing_happens'][i];if(!n)throw new Error('Unknown MHITM common string '+i);return ctypes.getField('struct c_common_strings',environment.requireGlobal('c_common_strings'),n,'const char *');},
  Sprintf:(out,fmt,...args)=>{if(args.length>2)throw new Error('Review MHITM sprintf arity');return resolve('sprintf')(address(out),text(fmt),...args.map(text));},
  Snprintf:(out,n,fmt,...args)=>{const i=args.pop(),site=abi.formats[i];if(!site||args.length>2)throw new Error('Unknown MHITM snprintf site '+i);return resolve('nh_snprintf')(text(site.function),site.line,address(out),transport.ulong(n),text(fmt),...args.map(text));},
 });
 for(const[name,max]of[['pline',6],['pline_mon',2],['You',2],['You_hear',2],['You_feel',1],['Your',0]])local[name]=(...args)=>{const mon=name==='pline_mon'?args.shift():undefined,fmt=args.shift();if(args.length>max)throw new Error('Review MHITM '+name+' arity');return resolve(name)(...(mon===undefined?[]:[address(mon)]),text(fmt),...args.map(text));};
 for(const name of['rn2','rnd','d'])local[name]=(...args)=>{const caller=args.pop(),line=args.pop();if(services.rng_log_enabled())services.rng_log_set_caller(text('mhitm.c'),transport.int(line),text(caller));return resolve(name)(...args.map(transport.int));};
 for(const n of abi.globals)Object.defineProperty(local,n,{value:undefined,writable:true,configurable:true});
 const context=createMhitmEnvironment(local,L);
 const prepare=(name,args)=>{
  if(name!=='attk_protection')args[0]=context.monster(address(args[0]));
  if(['pre_mm_attack','missmm','mdisplacem','mattackm','failed_grab','hitmm','gazemm','engulf_target','gulpmm','explmm','mdamagem','mon_poly','mswingsm','passivemm'].includes(name))args[1]=context.monster(address(args[1]));
  if(name==='noises')args[1]=context.attack(address(args[1]));
  if(['missmm','failed_grab','hitmm','gazemm','gulpmm','explmm','mdamagem'].includes(name))args[2]=context.attack(address(args[2]));
  if(['hitmm','mdamagem'].includes(name))args[3]=context.object(address(args[3]));
  if(name==='rustm')args[1]=context.object(address(args[1]));if(name==='mswingsm')args[2]=context.object(address(args[2]));if(name==='passivemm')args[4]=context.object(address(args[4]));
  const proto=abi.public[name];if(proto){const types=proto.match(/\((.*)\)$/)[1].split(',').map(t=>t.trim()).filter(t=>t&&t!=='void');args=args.map((v,i)=>ctypes.canonical(types[i]).includes('*')?v:scalar(types[i],v));}
  return args;
 };
 const call=(name,...args)=>{if(typeof source[name]!=='function')throw new Error('Unknown MHITM source function '+name);return transport.scoped(()=>withCEnvironment(context,source[name],...prepare(name,args)));};
 environment.register('mhitm',Object.fromEntries(Object.keys(abi.public).map(n=>[n,(...args)=>call(n,...args)])),local);
 return{context,services:local,exports:Object.keys(abi.public),call,limitation:'Whole original MHITM source owner connected; actual combat, status, equipment, special and death branches require real foreign owners and focused C acceptance.'};
}
