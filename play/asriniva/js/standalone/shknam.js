// Original SHKNAM policy with one shared, initialized shop/name catalogue.
import abi from './shknam-abi.json' with {type:'json'};
import * as source from '../ported/shknam.js';
import {createShknamState,createShknamEnvironment} from '../nethack/bindings/shknam.js';
const catalogues=new WeakMap(),owners=new WeakMap();
export function getShknamCatalogue(environment,layouts){
 if(catalogues.has(environment))return catalogues.get(environment);
 const L=layouts.shknam,shopBase=environment.allocateGlobal('shtypes',L.shopCount*L.shopSize),nameCount=Object.entries(source).filter(([n,v])=>/^shk/.test(n)&&Array.isArray(v)).reduce((n,[,v])=>n+v.length,0),namesBase=environment.allocateGlobal('shknam.names',nameCount*8);
 const state=createShknamState({heap:()=>environment.memory.HEAPU8,literal:environment.services.literal,storage:i=>[shopBase,namesBase][i]},L,source);
 catalogues.set(environment,state);return state;
}
export function enableShknam(environment,layouts){
 if(owners.has(environment))return owners.get(environment);
 const {services,memory,ctypes,transport}=environment,L=layouts.shknam,address=environment.address,state=getShknamCatalogue(environment,layouts);
 for(const[key,value]of Object.entries(abi.layout))if(L[key]!==value)throw new Error('Review SHKNAM configured ABI '+key);
 const text=v=>typeof v==='string'?services.literal(v):address(v),resolve=n=>environment.hasFunction(n)?environment.resolve(n):typeof services[n]==='function'?services[n]:environment.resolve(n);
 function value(type,v){type=ctypes.canonical(type);if(type==='void')return undefined;if(type.includes('*'))return text(v);if(type==='unsigned long')return transport.ulong(v);if(type==='long')return transport.long(v);if(type==='unsigned int')return transport.uint(v);if(type==='char'||type==='signed char')return transport.char(v);if(type==='unsigned char')return transport.uchar(v);if(type==='short')return transport.short(v);return transport.int(v);}
 const local={moduleKey:environment,heap:()=>memory.HEAPU8,literal:services.literal,stackAlloc:transport.stackAlloc,stackSave:transport.stackSave,stackRestore:transport.stackRestore,
  global:i=>{const name=abi.globals[i];if(!name)throw new Error('Unknown SHKNAM global '+i);return environment.requireGlobal(name);},
  birthday:()=>ctypes.load('time_t',environment.requireGlobal('ubirthday')),winMessage:()=>ctypes.load('int',environment.requireGlobal('WIN_MESSAGE')),
  alloc:n=>environment.alloc('alloc',transport.uint(n)),free:p=>services.free(address(p)),
  objectClassBit:(p,i)=>{if(i!==0)throw new Error('Unknown SHKNAM object class bit');return ctypes.getField('struct objclass',address(p),'oc_material','unsigned int');},
  monsterBit:(p,i)=>ctypes.getField('struct monst',address(p),abi.monsterBits[i],'unsigned int'),setMonsterBit:(p,i,v)=>ctypes.setField('struct monst',address(p),abi.monsterBits[i],'unsigned int',v),
  levelBit:()=>ctypes.getField('struct levelflags',ctypes.locate('struct instance_globals_saved_l',environment.requireGlobal('svl'),'level').at+ctypes.record('dlevel_t').fields.flags.offset,'has_shop','unsigned int'),
  setLevelBit:(i,v)=>ctypes.setField('struct levelflags',ctypes.locate('struct instance_globals_saved_l',environment.requireGlobal('svl'),'level').at+ctypes.record('dlevel_t').fields.flags.offset,'has_shop','unsigned int',v),
  specialTown:p=>ctypes.getField('struct d_flags',address(p)+ctypes.record('s_level').fields.flags.offset,'town','unsigned int'),
 };
 const terrain=(x,y)=>environment.requireGlobal('svl')+L.terrain+(transport.short(x)*L.ROWNO+transport.short(y))*L.terrainSize;
 local.terrainBit=(x,y,i)=>ctypes.getField('struct rm',terrain(x,y),abi.terrainBits[i],'unsigned int');local.setTerrainBit=(x,y,i,v)=>ctypes.setField('struct rm',terrain(x,y),abi.terrainBits[i],'unsigned int',v);
 const tribute=()=>ctypes.locate('struct instance_globals_saved_c',environment.requireGlobal('svc'),'context').at+ctypes.record('struct context_info').fields.tribute.offset;
 local.contextBit=()=>ctypes.getField('struct tribute_info',tribute(),'bookstock','unsigned int');local.setContextBit=(i,v)=>ctypes.setField('struct tribute_info',tribute(),'bookstock','unsigned int',v);
 for(const[name,prototype]of Object.entries(abi.dependencies)){const match=prototype.match(/^(.+?)\s*\((.*)\)$/),types=match[2].split(',').map(v=>v.trim()).filter(v=>v&&v!=='void');local[name]=(...args)=>value(match[1],resolve(name)(...args.map((v,i)=>value(types[i],v))));}
 local.Strcpy=(out,input)=>services.strcpy(address(out),text(input));local.Sprintf=(out,format)=>services.sprintf(address(out),text(format));
 for(const name of ['panic','impossible','pline'])local[name]=(format,...args)=>resolve(name)(text(format),...args.map(v=>typeof v==='string'?text(v):v?.address??v));
 local.display_nhwindow=(win,blocking)=>resolve('win_display_nhwindow')(transport.int(win),transport.char(blocking));
 local.assert=(ok,i)=>{if(!ok){const row=abi.assertions[i];if(!row)throw new Error('Unknown SHKNAM assertion '+i);return resolve('__assert_fail')(text(row.expression),text('shknam.c'),row.line,text('nameshk'));}};
 for(const name of ['rn2','rnd'])local[name]=(n,line,caller)=>{const fn=abi.rngCallers[caller];if(!fn)throw new Error('Unknown SHKNAM RNG caller '+caller);if(services.rng_log_enabled())services.rng_log_set_caller(text('shknam.c'),transport.int(line),text(fn));return resolve(name)(transport.int(n));};
 const context=createShknamEnvironment(local,L,state),names=Object.keys(abi.public).filter(n=>!environment.hasFunction(n));
 const parse=n=>{const m=abi.public[n].match(/^(.+?)\s*\((.*)\)$/);return{result:m[1],args:m[2].split(',').map(t=>t.trim()).filter(t=>t&&t!=='void')};};
 environment.register('shknam',Object.fromEntries(names.map(n=>[n,(...args)=>value(parse(n).result,source[n](...args))])),context,{prepareArgs:(n,args)=>args.map((v,i)=>{const t=parse(n).args[i],p=value(t,v);return t==='struct monst *'?context.monster(p):t==='struct obj *'?context.object(p):t==='struct mkroom *'?context.room(p):p;})});
 const owner={context,services:local,catalogue:state,exports:names,limitation:'Shared original SHKNAM catalogue and source policy; ordinary shop generation requires source-C comparison. Billing and special variants are separately unverified.'};owners.set(environment,owner);return owner;
}
