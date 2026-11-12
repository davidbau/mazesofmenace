// One original DOKICK context on shared DECL; native transport only.
import abi from './dokick-abi.json' with {type:'json'};
import * as source from '../ported/dokick.js';
import {createDokickEnvironment} from '../nethack/bindings/dokick.js';
import {withCEnvironment} from '../c-runtime/context.js';
const owners=new WeakMap(),deliveryNames=['obj_delivery','ship_object','down_gate'];
export function enableDokick(environment,layouts){
 if(owners.has(environment))return owners.get(environment);
 const {services,memory,ctypes,transport,functions}=environment,L=layouts.dokick,address=environment.address;
 for(const[k,v]of Object.entries(abi.layout))if(L[k]!==v)throw new Error('Review DOKICK native ABI '+k);
 const text=v=>typeof v==='string'?services.literal(v):address(v);
 const resolve=n=>environment.hasFunction(n)?environment.resolve(n):typeof services[n]==='function'?services[n]:environment.resolve(n);
 const scalar=(type,v)=>{type=ctypes.canonical(type);if(type==='void')return undefined;if(type.includes('*'))return text(v);if(type==='char'||type==='signed char')return transport.char(v);if(type==='unsigned char')return transport.uchar(v);if(type==='short')return transport.short(v);if(type==='unsigned short')return transport.ushort(v);if(type==='unsigned int')return transport.uint(v);if(ctypes.size(type)===8)return type.startsWith('unsigned')?transport.ulong(v):transport.long(v);return transport.int(v);};
 const coerce={pointer:address,text,integer:transport.int,byte:transport.char,coord:transport.short,long:transport.long,size:transport.ulong};
 const local=Object.create(services);
 for(const[name,row]of Object.entries(abi.calls)){const ret=row.prototype.slice(0,row.prototype.indexOf('(')).trim();local[name]=(...args)=>scalar(ret,resolve(row.target)(...args.map((v,i)=>{if(!row.coercions[i])throw new Error('Unknown DOKICK argument '+name+':'+i);return coerce[row.coercions[i]](v);})));}
 const packed=(kind,p,i,value)=>{const row=abi.bits[kind],field=row?.fields[i];if(!field)throw new Error('Unknown DOKICK packed field '+kind+':'+i);const f=ctypes.record(row.type).fields[field],type=f.ctype.replace(new RegExp('\\s+'+field+'$'),'');return value===undefined?ctypes.getField(row.type,address(p),field,type):ctypes.setField(row.type,address(p),field,type,value);};
 let context;
 const getContext=()=>context??=createDokickEnvironment(local,L);
 const call=(name,...args)=>transport.scoped(()=>{const c=getContext();
  if(['kickdmg','maybe_kick_monster','kick_monster','ghitm','watchman_thief_arrest','watchman_door_damage','deliver_obj_to_mon'].includes(name))args[0]=c.monster(args[0]);
  if(name==='ghitm')args[1]=c.object(args[1]);
  if(['container_impact_dmg','impact_drop','ship_object','otransit_msg'].includes(name))args[0]=c.object(args[0]);
  if(name==='drop_to')args[0]=c.coord(args[0]);
  return withCEnvironment(c,()=>{const value=source[name](...args);return typeof value==='string'?text(value):value?.address??value;});
 });
 const callback=(name,sig)=>environment.functionPointer('dokick::'+name,sig,(...args)=>call(name,...args));
 Object.assign(local,{moduleKey:environment,heap:()=>memory.HEAPU8,literal:services.literal,stackAlloc:transport.stackAlloc,stackSave:transport.stackSave,stackRestore:transport.stackRestore,
  global:i=>{if(!abi.globals[i])throw new Error('Unknown DOKICK global '+i);return environment.requireGlobal(abi.globals[i]);},equipment:i=>{const name=['uarm','uarmf','uball','uchain'][i];if(!name)throw new Error('Unknown DOKICK equipment '+i);return ctypes.load('void *',environment.requireGlobal(name));},
  monsterBit:(p,i)=>packed('monster',p,i),setMonsterBit:(p,i,v)=>packed('monster',p,i,v),objectBit:(p,i)=>packed('object',p,i),setObjectBit:(p,i,v)=>packed('object',p,i,v),terrainBit:(p,i)=>packed('terrain',p,i),setTerrainBit:(p,i,v)=>packed('terrain',p,i,v),trapBit:(p,i)=>packed('trap',p,i),setTrapBit:(p,i,v)=>packed('trap',p,i,v),classBit:(p,i)=>packed('class',p,i),
  heroBit:i=>{const u=environment.requireGlobal('u');if(i===0||i===1)return ctypes.getField('struct you',u,['uinwater','uswallow'][i],'unsigned int');if(i===2)return ctypes.getField('struct u_roleplay',ctypes.locate('struct you',u,'uroleplay').at,'deaf','signed char');throw new Error('Unknown DOKICK hero bit');},
  commonString:i=>{if(i===4)return environment.requireGlobal('ynchars');const field=['c_black','c_Something','c_something','c_nothing_happens'][i];if(!field)throw new Error('Unknown DOKICK common string '+i);return ctypes.getField(i?'struct c_common_strings':'struct c_color_names',environment.requireGlobal(i?'c_common_strings':'c_color_names'),field,'const char *');},winMessage:()=>ctypes.load('int',environment.requireGlobal('WIN_MESSAGE')),
  singular:o=>resolve('singular')(address(o),environment.functionPointer('doname','pp')),distant_name:o=>resolve('distant_name')(address(o),environment.functionPointer('xname','pp')),
  get_iter_mons:()=>resolve('get_iter_mons')(callback('watchman_thief_arrest','ip')),get_iter_mons_xy:(x,y)=>resolve('get_iter_mons_xy')(callback('watchman_door_damage','ipii'),transport.short(x),transport.short(y)),
  bhit:(dx,dy,range,type,a,b,cell)=>{if(a||b)throw new Error('Unexpected original DOKICK bhit callback');return resolve('bhit')(transport.int(dx),transport.int(dy),transport.int(range),transport.int(type),0,0,address(cell));},
  display_nhwindow:(win,blocking)=>{const f=ctypes.locate('struct window_procs',environment.requireGlobal('windowprocs'),'win_display_nhwindow');return functions.indirect(memory.view.getBigUint64(f.at,true),'vii',transport.int(win),transport.char(blocking));},
 });
 for(const name of ['rn2','rnd','rnl'])local[name]=(n,line,fn)=>{if(services.rng_log_enabled())services.rng_log_set_caller(text('dokick.c'),transport.int(line),text(fn));return resolve(name)(transport.int(n));};
 local.rn1=(n,b,line,fn)=>transport.int(local.rn2(n,line,fn)+transport.int(b));
 for(const[name,rows]of Object.entries(abi.formats))local[name]=(...args)=>{const prefix=name==='Sprintf'||name==='mon_yells'?2:1,fmt=args[prefix-1];if(typeof fmt!=='string')throw new Error('Review DOKICK native format pointer '+name);const shape=(fmt.match(/%(?:l)?[sdiuc]/g)||[]).map(v=>v.endsWith('s')?'p':v.startsWith('%l')?'l':'i').join(''),row=rows[shape];if(!row||args.length!==row.types.length)throw new Error('Review DOKICK native format '+name+':'+fmt);return resolve(row.target)(...args.map((v,i)=>scalar(row.types[i],v)));};
 // Prevent inherited DECL setters from swallowing the factory's native views.
 for(const name of abi.globals)Object.defineProperty(local,name,{value:undefined,writable:true,configurable:true});
 const names=Object.keys(abi.public).filter(name=>!deliveryNames.includes(name)&&!environment.hasFunction(name));
 environment.register('dokick',Object.fromEntries(names.map(name=>[name,(...args)=>call(name,...args)])),local);
 const owner={services:local,get context(){return getContext();},call,deliveryNames,exports:names,limitation:'Unchanged DOKICK source context and shared DECL connected. Ordinary locked-door kicks and broader objects/monster/terrain effects require actual C comparison; missing foreign owners fail explicitly.'};
 owners.set(environment,owner);return owner;
}
