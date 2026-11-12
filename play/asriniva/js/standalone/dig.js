// Original DIG policies, occupation identity and timer callbacks on one cached owner.
import abi from './dig-abi.json' with{type:'json'};
import * as source from '../ported/dig.js';
import {callDig} from '../ported/dig-runtime.js';
const owners=new WeakMap();
export function enableDig(environment,layouts){
 if(owners.has(environment))return owners.get(environment);
 const{services,memory,ctypes,transport,functions}=environment,L=layouts.dig,address=environment.address,text=v=>typeof v==='string'?services.literal(v):address(v),resolve=n=>environment.hasFunction(n)?environment.resolve(n):typeof services[n]==='function'?services[n]:environment.resolve(n);
 for(const[k,v]of Object.entries(abi.layout))if(L[k]!==v)throw new Error('Review DIG ABI '+k);
 const local=Object.create(services);for(const n of abi.globals)Object.defineProperty(local,n,{value:undefined,writable:true,configurable:true});
 const split=s=>{let depth=0,start=0,out=[];for(let i=0;i<s.length;i++){if(s[i]==='(')depth++;else if(s[i]===')')depth--;else if(s[i]===','&&!depth){out.push(s.slice(start,i).trim());start=i+1;}}out.push(s.slice(start).trim());return out.filter(t=>t&&t!=='void');},prototype=p=>{const m=p.match(/^(.+?)\s*\((.*)\)$/);if(!m)throw new Error('Unknown DIG prototype '+p);return{result:m[1].trim(),params:split(m[2])};};
 const scalar=(t,v)=>{t=ctypes.canonical(t);if(t==='void')return undefined;if(t.includes('*'))return text(v);if(t==='char'||t==='signed char')return transport.char(v);if(t==='unsigned char')return transport.uchar(v);if(t==='short')return transport.short(v);if(t==='unsigned short')return transport.ushort(v);if(t==='unsigned int')return transport.uint(v);if(ctypes.size(t)===8)return t.startsWith('unsigned')?transport.ulong(v):transport.long(v);return transport.int(v);};
 const invoke=(row,args)=>{const p=prototype(row.prototype);if(args.length!==p.params.length)throw new Error('DIG foreign arity '+row.target);return scalar(p.result,resolve(row.target)(...args.map((v,i)=>scalar(p.params[i],v))));};for(const[n,row]of Object.entries(abi.calls))local[n]=(...args)=>invoke(row,args);
 const callback=i=>{const index=transport.int(i),name=['dig','watchman_canseeu'][index];if(!name)throw new Error('Unknown DIG callback '+i);return environment.functionPointer('dig::'+name,index===0?'i':'ip',(...args)=>call(name,...args));};
 const bit=(type,p,name,v)=>{if(!name)throw new Error('Unknown DIG native bit');return v===undefined?ctypes.getField(type,address(p),name,'unsigned int'):ctypes.setField(type,address(p),name,'unsigned int',v);};
 for(const[k,type]of Object.entries({mon:'struct monst',obj:'struct obj',cls:'struct objclass',trap:'struct trap'})){local[k+'Bit']=(p,i)=>bit(type,p,abi.bits[k][i]);local['set'+k[0].toUpperCase()+k.slice(1)+'Bit']=(p,i,v)=>bit(type,p,abi.bits[k][i],v);}
 const level=()=>ctypes.locate('struct instance_globals_saved_l',environment.requireGlobal('svl'),'level').at+ctypes.record('dlevel_t').fields.flags.offset,terrain=(x,y)=>environment.requireGlobal('svl')+L.locations+(transport.short(x)*L.ROWNO+transport.short(y))*L.rmSize;
 Object.assign(local,{moduleKey:environment,heap:()=>memory.HEAPU8,literal:services.literal,stackAlloc:transport.stackAlloc,stackSave:transport.stackSave,stackRestore:transport.stackRestore,
  global:i=>{const n=abi.globals[i];if(!n)throw new Error('Unknown DIG global '+i);return environment.requireGlobal(n);},
  equipment:i=>ctypes.load('struct obj *',environment.requireGlobal(['uwep','uarmf','uarmh','uball','uchain'][i])),
  heroBit:i=>bit('struct you',environment.requireGlobal('u'),abi.heroBits[i]),setHeroBit:(i,v)=>bit('struct you',environment.requireGlobal('u'),abi.heroBits[i],v),
  levelBit:i=>bit('struct levelflags',level(),abi.levelBits[i]),setLevelBit:(i,v)=>bit('struct levelflags',level(),abi.levelBits[i],v),
  terrainBit:(x,y,i)=>bit('struct rm',terrain(x,y),abi.terrainBits[i]),setTerrainBit:(x,y,i,v)=>bit('struct rm',terrain(x,y),abi.terrainBits[i],v),
  roleplayDeaf:()=>memory.view.getInt8(environment.requireGlobal('u')+abi.roleplayDeafOffset),winMessage:()=>ctypes.load('int',environment.requireGlobal('WIN_MESSAGE')),
  callbackPointer:callback,commandPointer:()=>environment.functionPointer('doapply','i'),
 });
 const origin=(line,caller)=>{if(!abi.callers.includes(caller))throw new Error('Unknown DIG RNG caller '+caller);if(services.rng_log_enabled())services.rng_log_set_caller(text('dig.c'),transport.int(line),text(caller));};for(const n of ['rn2','rnd','rnl'])local[n]=(bound,line,caller)=>{origin(line,caller);return resolve(n)(transport.int(bound));};local.d=(n,z,line,caller)=>{origin(line,caller);return resolve('d')(transport.int(n),transport.int(z));};
 function message(name,out,fmt,args){const f=memory.readString(text(fmt)),shape=[...f.matchAll(/%(?:[-+ #0]*\d*(?:\.\d+)?)?(l?[sdiuc%])/g)].filter(m=>m[1]!=='%').map(m=>m[1]==='s'?'p':m[1]==='ld'||m[1]==='lu'?'l':m[1]==='c'?'c':'i').join('');if(!abi.shapes.includes(shape)||args.length!==shape.length)throw new Error('Unknown DIG format '+shape);const values=args.map((v,i)=>shape[i]==='p'?text(v):shape[i]==='l'?transport.long(v):transport.int(shape[i]==='c'&&typeof v==='string'?v.charCodeAt(0):v));return name==='Sprintf'?services.sprintf(address(out),text(fmt),...values):resolve(name)(text(fmt),...values);}
 for(const n of ['pline','pline_The','You','Your','You_hear','You_feel','You_cant','There','verbalize','impossible'])local[n]=(fmt,...args)=>message(n,0,fmt,args);local.Sprintf=(out,fmt,...args)=>message('Sprintf',out,fmt,args);
 const window=(name,sig,...args)=>functions.indirect(memory.view.getBigUint64(environment.requireGlobal('windowprocs')+ctypes.record('struct window_procs').fields[name].offset,true),sig,...args);local.display_nhwindow=(w,b)=>window('win_display_nhwindow','vii',transport.int(w),transport.char(b));local.nh_delay_output=()=>window('win_delay_output','v');
 function call(name,...args){if(typeof source[name]!=='function')throw new Error('Unknown DIG source '+name);const p=prototype(abi.public[name]??abi.callbacks[name]);if(args.length!==p.params.length)throw new Error('DIG source arity '+name);return scalar(p.result,callDig(local,L,name,...args.map((v,i)=>scalar(p.params[i],v))));}
 const initial=['unearth_objs','rot_corpse'];if(initial.some(n=>environment.hasFunction(n)))throw new Error('DIG must own unearthing callbacks from construction');environment.register('level-unearthing',Object.fromEntries(initial.map(n=>[n,(...args)=>call(n,...args)])));
 const names=Object.keys(abi.public).filter(n=>!environment.hasFunction(n));environment.register('dig',Object.fromEntries(names.map(n=>[n,(...args)=>call(n,...args)])));
 const owner={call,services:local,callback,exports:[...initial,...names],limitation:'Original cached DIG owner/job/timer state connected; ordinary digging and hole-time acceptance is focused. Special excavation, liquids and buried-ball variants require separate source-C proof.'};owners.set(environment,owner);return owner;
}
