// Shared storage transport for unchanged WEAPON, WORN, WIELD and DO_WEAR.
import abi from './equipment-abi.json' with {type:'json'};
import armorAbi from './armor-abi.json' with {type:'json'};
import publicFunctions from './public-functions.json' with {type:'json'};
import * as weapon from '../ported/weapon.js';
import {callWeapon} from '../ported/weapon-runtime.js';
import * as worn from '../ported/worn.js';
import {createWornEnvironment} from '../ported/worn-runtime.js';
import * as wield from '../ported/wield.js';
import {createWieldEnvironment} from '../ported/wield-runtime.js';
import * as armor from '../ported/do_wear.js';
import {callDoWear} from '../ported/do_wear-runtime.js';
import {attachEquipmentFormatting} from './equipment-format.js';
export function enableHeroEquipment(environment,layouts,hero){
 const {services,ctypes,memory,transport}=environment,address=environment.address;
 const forward=()=>new Proxy(Object.create(services),{get:(o,k,r)=>{
  if(Object.hasOwn(o,k))return Reflect.get(o,k,r);
  const fn=Reflect.has(o,k)?Reflect.get(o,k,r):typeof k==='string'?(...args)=>environment.resolve(k)(...args):undefined;
  return typeof fn==='function'?(...args)=>fn(...args.map(v=>v?.address??v)):fn;
 }});
 const bit=(type,p,key)=>ctypes.getField(type,address(p),key,'unsigned int');
 const setBit=(type,p,key,v)=>ctypes.setField(type,address(p),key,'unsigned int',v);
 const locals={};
 for(const name of ['weapon','worn','wield']){
  const local=forward();locals[name]=local;
  for(const key of abi[name].globals)Object.defineProperty(local,key,{value:undefined,writable:true,configurable:true});
  Object.assign(local,{moduleKey:environment,heap:()=>memory.HEAPU8,literal:services.literal,
   global:i=>environment.requireGlobal(abi[name].globals[i]),
   equipmentCell:i=>environment.requireGlobal(abi[name].equipment[i]),
  });
 }
 const W=layouts.weapon,ws=locals.weapon,arw=environment.allocateGlobal('weapon.arwep',W.arwSize*weapon.arwep.length),kebab=environment.allocateGlobal('weapon.kebabable',weapon.kebabable.length);
 Object.assign(ws,{storage:i=>[arw,kebab][i],storageCount:i=>[weapon.arwep.length,weapon.kebabable.length][i],
  equipment:i=>address(ctypes.load('struct obj *',environment.requireGlobal(['uleft','uright','uwep','uswapwep'][i]))),
  hands:()=>environment.requireGlobal('hands_obj'),nulGlyphInfo:()=>environment.requireGlobal('nul_glyphinfo'),
  objectBit:(p,i)=>bit('struct obj',p,['globby','blessed','lamplit','dknown','cursed','bknown','oeroded','oeroded2'][i]),
  setObjectBit:(p,i,v)=>setBit('struct obj',p,['globby','blessed','lamplit','dknown','cursed','bknown','oeroded','oeroded2'][i],v),
  classBit:(p,i)=>bit('struct objclass',p,['oc_material','oc_big'][i]),
  tethered:p=>bit('struct throw_and_return_weapon',p,'tethered'),setTethered:(p,v)=>setBit('struct throw_and_return_weapon',p,'tethered',v),
 });
 for(const kind of ['rn2','rnd'])ws[kind]=(n,line,caller)=>{if(services.rng_log_enabled())services.rng_log_set_caller(services.literal('weapon.c'),line,services.literal(caller));return services[kind](n);};
 ws.d=(dice,n,line,caller)=>{if(services.rng_log_enabled())services.rng_log_set_caller(services.literal('weapon.c'),line,services.literal(caller));return services.d(dice,n);};
 const wn=locals.worn,wd=locals.wield;
 for(const [local,fields]of [[wn,['cursed','bypass','lamplit','oeroded','oeroded2']],[wd,['cursed','bknown','lamplit','unpaid','oerodeproof','known']]])Object.assign(local,{objectBit:(p,i)=>bit('struct obj',p,fields[i]),setObjectBit:(p,i,v)=>setBit('struct obj',p,fields[i],v)});
 wn.classBit=(p,i)=>bit('struct objclass',p,['oc_merge','oc_material','oc_big'][i]);wd.classBit=p=>bit('struct objclass',p,'oc_big');
 const monBits=['perminvis','invis_blkd','minvis','wormno','permspeed','mspeed','msleeping','mcanmove','ispriest','isminion','mfrozen'];
 wn.monsterBit=(p,i)=>bit('struct monst',p,monBits[i]);wn.setMonsterBit=(p,i,v)=>setBit('struct monst',p,monBits[i],v);
 wd.heroBit=()=>bit('struct you',environment.requireGlobal('u'),'uhandedness');wd.hands=ws.hands;
 const logged=(file,kind)=>(n,line,caller)=>{if(services.rng_log_enabled())services.rng_log_set_caller(services.literal(file),line,services.literal(caller));return services[kind](transport.int(n));};
 wn.rnl=logged('worn.c','rnl');for(const kind of ['rn2','rnd'])wd[kind]=logged('wield.c',kind);
 const owned=(namespace)=>Object.fromEntries(Object.entries(namespace).filter(([name,fn])=>typeof fn==='function'&&Object.hasOwn(publicFunctions.functions,name)&&!environment.hasFunction(name)));
 environment.register('hero-weapons',Object.fromEntries(Object.keys(owned(weapon)).map(name=>[name,(...args)=>callWeapon(ws,W,name,...args)])));
 const wornEnv=createWornEnvironment(wn,layouts.worn,worn),wieldEnv=createWieldEnvironment(wd,layouts.wield,wield);
 const signatures=new Map();
 function signature(name){if(!signatures.has(name)){const match=publicFunctions.functions[name].match(/^(.*?)\((.*)\)$/);if(!match)throw new Error('Unknown equipment prototype '+name);signatures.set(name,{result:match[1].trim(),parameters:match[2].split(',').map(t=>t.trim()).filter(t=>t&&t!=='void')});}return signatures.get(name);}
 function boundaryValue(type,value){const canonical=ctypes.canonical(type);if(canonical==='void')return undefined;if(canonical.includes('*'))return typeof value==='string'?services.literal(value):address(value);return canonical==='long'?transport.long(value):canonical==='unsigned long'?transport.ulong(value):canonical==='signed char'||canonical==='char'?transport.char(value):canonical==='unsigned char'?transport.uchar(value):canonical==='unsigned int'?transport.uint(value):transport.int(value);}
 function registerTyped(owner,namespace,context){
  const wrappers=Object.fromEntries(Object.entries(owned(namespace)).map(([name,body])=>[name,(...args)=>boundaryValue(signature(name).result,body(...args))]));
  environment.register(owner,wrappers,context,{prepareArgs:(name,args)=>args.map((v,i)=>{
   const type=signature(name).parameters[i],wrap={'struct obj *':'object','struct monst *':'monster','struct permonst *':'permonst','Loot *':'loot'}[type?.replace(/^const /,'')];
   if(wrap)return context[wrap](v);
   return boundaryValue(type,v);
  })});
 }
 registerTyped('hero-worn',worn,wornEnv);registerTyped('hero-wield',wield,wieldEnv);
 const local=forward(),schemas=Object.keys(armorAbi.schemas),scalar=d=>d.t?{i8:'signed char',u8:'unsigned char',i16:'short',u16:'unsigned short',i32:'int',u32:'unsigned int',i64:'long',u64:'unsigned long'}[d.t]:'void *';
 const field=(k,i)=>{const row=armorAbi.schemas[schemas[k]],f=row?.fields[i];if(!f)throw new Error('Unknown DO_WEAR field');return{type:row.ctype,f};};
 const width=d=>d.t?Number(d.t.slice(1))/8:d.p!==undefined||d.q||d.f?8:d.s?layouts.do_wear[d.s+'Size']:d.a.reduce((a,b)=>a*b,1)*width(d.e);
 Object.assign(local,{moduleKey:environment,heap:()=>memory.HEAPU8,
  buffer:()=>offdelaybuf,
  callbackPointer:i=>{const name=armorAbi.callbacks[i],prototype=armorAbi.callbackTypes[name];if(!prototype)throw new Error('Unknown DO_WEAR callback '+i);const match=prototype.match(/^(.*?)\((.*)\)$/),types=[match[1],...match[2].split(',').filter(t=>t.trim()&&t.trim()!=='void')],signature=types.map(t=>{t=ctypes.canonical(t.trim());return t==='void'?'v':t.includes('*')?'p':t.includes('long')?'j':'i';}).join(''),privateName=typeof armor[name]==='function'&&!Object.hasOwn(publicFunctions.functions,name);return environment.functionPointer(privateName?'do_wear::'+name:name,signature,privateName?(...args)=>callDoWear(local,layouts.do_wear,name,...args):undefined);},
  rng:(kind,n,fn,line)=>{if(services.rng_log_enabled())services.rng_log_set_caller(services.literal('do_wear.c'),line,typeof fn==='string'?services.literal(fn):address(fn));return services[kind?'rnd':'rn2'](transport.int(n));},
  global:i=>environment.requireGlobal(armorAbi.globals[i].name),
  read:(k,p,i)=>{const {type,f}=field(k,i);return f.d.a||f.d.s?BigInt(ctypes.locate(type,address(p),f.name).at):ctypes.getField(type,address(p),f.name,scalar(f.d));},
  write:(k,p,i,v)=>{const {type,f}=field(k,i);if(f.d.a||f.d.s)return memory.memmove(ctypes.locate(type,address(p),f.name).at,address(v),width(f.d));return ctypes.setField(type,address(p),f.name,scalar(f.d),v);},
  address:(k,p,i)=>{const {type,f}=field(k,i);return ctypes.locate(type,address(p),f.name).at;},
 });
 const offdelaybuf=environment.allocateGlobal('do_wear.armoroff.offdelaybuf',armorAbi.bufferBytes);
 environment.register('hero-armor',Object.fromEntries(Object.keys(owned(armor)).map(name=>[name,(...args)=>callDoWear(local,layouts.do_wear,name,...args)])));
 attachEquipmentFormatting(environment,{weapon:ws,worn:wn,wield:wd,armor:local},layouts);
 hero.enableSkills();
 return {weapon:ws,worn:wornEnv,wield:wieldEnv,armor:local,limitation:'Shared equipment/skills transport connected; startup and later gear lifecycle require original-C verification.'};
}
