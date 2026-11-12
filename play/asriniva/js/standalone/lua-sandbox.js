// Unchanged NHLUA policy on shared JavaScript storage and the existing Lua VM.
import {nh_getenv} from '../ported/options.js';
import callbackABI from './lua-callbacks-abi.json' with {type:'json'};
import * as nhlua from '../ported/nhlua.js';
import * as nhlsel from '../ported/nhlsel.js';
import {createNhlselEnvironment} from '../ported/nhlsel-runtime.js';
import * as nhlobj from '../ported/nhlobj.js';
import {createNhlobjEnvironment} from '../ported/nhlobj-runtime.js';
import {withCEnvironment} from '../ported/c-runtime.js';
import {createNhluaEnvironment} from '../ported/nhlua-runtime.js';
export function enableLuaSandbox(environment,layouts){
 const {services,functions}=environment,schema=nhlua.nhluaSchema,lua=environment.enableLua();
 const layout=layouts.nhlua;
 const globals=Object.keys(schema.foreignGlobals),names=Object.keys(schema.data),local=Object.create(services),pointers=new Map(),jumps=new Map();
 function size(t){return typeof t==='string'?Number(t.slice(1))/8:t.pointer?8:t.record?schema.records[t.record].size:t.array.reduce((a,b)=>a*b,size(t.of));}
 const storage=names.map(n=>environment.allocateGlobal('nhlua.'+n,size(schema.data[n].type)));
 const signature=(result,args)=>[result,...args].map(t=>typeof t==='object'?'p':t==='void'?'v':t[0]==='f'?'d':t.endsWith('64')?'j':'i').join('');
 const getenvContext=Object.assign(Object.create(services),{ptr:v=>typeof v==='string'?services.literal(v):environment.address(v),i32:v=>Number(BigInt.asIntN(32,BigInt(v))),u64:v=>BigInt.asUintN(64,BigInt(v))});
 environment.register('environment-options',{nh_getenv},getenvContext);
 services.nh_getenv=(...args)=>environment.call('environment-options','nh_getenv',...args);
 const resolve=name=>lua.api[name]??(name==='nh_getenv'?environment.resolve(name):name==='Strlen_'?((...args)=>environment.strutil('Strlen_',...args)):['alloc','re_alloc','FITSuint_','FITSint_'].includes(name)?((...args)=>environment.alloc(name,...args)):typeof services[name]==='function'?services[name]:environment.resolve(name));

 function pointer(name){
  if(pointers.has(name))return pointers.get(name);
  const owned=schema.functions.find(f=>f.name===name),foreign=schema.callSites.find(c=>c.name===name),external=callbackABI.callbacks[name];
  // Lua library openers are lua_CFunction values even when only addressed.
  const result=owned?(owned.returnType==='void'?'void':owned.returnType.includes('*')?{pointer:'void'}:'i32'):foreign?.return??external?.return??((name.startsWith('luaopen_')||['nhl_abs_coord','l_get_config_errors'].includes(name))?'i32':null);
  const args=owned?owned.parameters.map(p=>p.type):foreign?.args??external?.args??((name.startsWith('luaopen_')||['nhl_abs_coord','l_get_config_errors'].includes(name))?[{pointer:'lua_State'}]:null);
  if(!result||!args)throw new Error('Missing NHLUA callback signature '+name);
  const sig=signature(result,args);if(external&&sig!==external.signature)throw Error('Review native NHLUA callback '+name);
  const id=functions.functionPointer((...args)=>resolve(name)(...args),sig);pointers.set(name,id);return id;
 }
 Object.assign(local,{
  layout,global:i=>environment.requireGlobal(globals[i]),storage:i=>{if(!storage[i])throw new Error('Unknown NHLUA storage '+i);return storage[i];},functionPointer:pointer,
  api:(site,...args)=>{const call=schema.callSites[site];if(!call?.name)throw new Error('Unknown NHLUA call '+site);return env.cast(call.return,resolve(call.name)(...args));},
  indirect:(site,p,...args)=>{const call=schema.callSites[site];if(!call?.indirect)throw new Error('Unknown NHLUA indirect call '+site);return functions.indirect(p,signature(call.return,call.args),...args);},
  setjmpBooleanScope:(buffer,continuation)=>{const result=functions.withJumpScope(scope=>{const at=environment.address(buffer),previous=jumps.get(at);jumps.set(at,scope);try{return {value:continuation(0)};}finally{if(previous)jumps.set(at,previous);else jumps.delete(at);}});return typeof result==='object'?result.value:continuation(1);},
  longjmp:(buffer,status)=>{const scope=jumps.get(environment.address(buffer));if(!scope)throw new Error('Expired NHLUA jump target');return functions.longjmp(scope,status);},
 });
 const env=createNhluaEnvironment(local,{initialized:false});
 environment.register('nhlua',Object.fromEntries(schema.functions.map(f=>[f.name,nhlua[f.name]])),env);
 environment.register('lua-api',lua.api);
 enableLuaRegistrations(environment,layouts,lua);
 return {environment:env,lua,storage};
}

// Reuse source table packing; registration alone does not accept callbacks.
function enableLuaRegistrations(environment,layouts,lua){
 const {services,ctypes,functions}=environment;
 const loc=(g,type,f)=>ctypes.locate(type,environment.requireGlobal(g),f).at;
 const shadow=(names)=>{const local=new Proxy(Object.create(services),{get:(o,k,r)=>Reflect.has(o,k)?Reflect.get(o,k,r):typeof k==='string'?(...args)=>environment.resolve(k)(...args):undefined});for(const n of names)Object.defineProperty(local,n,{value:undefined,writable:true,configurable:true});return local;};
 const select=shadow(['cg','gc','gx','gy','svn','svr','levl']);Object.assign(select,lua.api);
 const globals=[loc('cg','struct const_globals','zeroNhRect'),loc('gc','struct instance_globals_c','coder'),loc('gx','struct instance_globals_x','xstart'),loc('gy','struct instance_globals_y','ystart'),loc('svn','struct instance_globals_saved_n','nroom'),loc('svr','struct instance_globals_saved_r','rooms'),ctypes.locate('dlevel_t',loc('svl','struct instance_globals_saved_l','level'),'locations').at];
 const L=layouts.nhlsel,storage=[nhlsel.l_selection_methods.length*L.luaRegSize,nhlsel.l_selection_meta.length*L.luaRegSize,7*8,3*8].map((n,i)=>environment.allocateGlobal('nhlsel.table'+i,n));
 Object.assign(select,{global:i=>globals[i],tableStorage:i=>storage[i],callbackToken:i=>functions.functionPointer((...args)=>environment.resolve(nhlsel.callbackNames[i])(...args),'ip'),lua_newuserdata:(state,n)=>lua.api.lua_newuserdatauv(state,BigInt(n),1)});
 const text=p=>typeof p==='string'?services.literal(p):environment.address(p);
 Object.assign(select,{dupstr:p=>environment.libc.strdup(text(p)),rectBounds:(...args)=>environment.call('rect','rect_bounds',...args),
  nhl_pcall_handle:(L,n,r,name,flags)=>environment.resolve('nhl_pcall_handle')(L,n,r,text(name),flags),
  nhl_error:(L,message)=>environment.resolve('nhl_error')(L,text(message)),
  check_mapchr:p=>environment.resolve('check_mapchr')(text(p)),
  mapfrag_fromstr:p=>environment.resolve('mapfrag_fromstr')(text(p)),
  get_table_int:(L,key)=>environment.resolve('get_table_int')(L,text(key)),
  get_table_int_opt:(L,key,def)=>environment.resolve('get_table_int_opt')(L,text(key),def),
  get_table_option:(L,key,def,array)=>environment.resolve('get_table_option')(L,text(key),text(def),array),
  nhl_add_table_entry_int:(L,key,value)=>environment.resolve('nhl_add_table_entry_int')(L,text(key),BigInt(value)),
 });
 // Original Lua 5.4 lauxlib.h macro; the checked string remains VM-owned.
 select.luaL_checkstring=(state,index)=>lua.api.luaL_checklstring(state,index,0);
 const selection=createNhlselEnvironment(select,L,nhlsel);
 environment.register('nhlsel',Object.fromEntries(Object.entries(nhlsel).filter(([,v])=>typeof v==='function').map(([name,fn])=>[name,(...args)=>{if(name==='l_selection_push_copy')args[1]=selection.selection(args[1]);const result=withCEnvironment(selection,fn,...args);return result?.address??result??0;}])));
 const object=shadow(['objects','mons','materialnm','def_oc_syms','hands_obj','fobj','svl']);Object.assign(object,lua.api);
 const objectGlobals=['objects','obj_descr','mons','materialnm','def_oc_syms','svl','hands_obj'].map(n=>environment.requireGlobal(n)),O=layouts.nhlobj;
 const objectStorage=[nhlobj.l_obj_methods.length,nhlobj.l_obj_meta.length].map((n,i)=>environment.allocateGlobal('nhlobj.table'+i,n*O.regSize));
 const callbacks=['l_obj_new_readobjnam','l_obj_isnull','l_obj_at','l_obj_nextobj','l_obj_to_table','l_obj_objects_to_table','l_obj_placeobj','l_obj_container','l_obj_getcontents','l_obj_add_to_container','l_obj_timer_has','l_obj_timer_peek','l_obj_timer_stop','l_obj_timer_start','l_obj_bury','l_obj_gc'];
 Object.assign(object,{global:i=>objectGlobals[i],storage:i=>objectStorage[i],callbackPointer:i=>functions.functionPointer((...args)=>environment.resolve(callbacks[i])(...args),'ip')});
 const objects=createNhlobjEnvironment(object,O,{initialized:false});
 environment.register('nhlobj',Object.fromEntries(Object.entries(nhlobj).filter(([,v])=>typeof v==='function').map(([name,fn])=>[name,(...args)=>{if(['l_obj_push','nhl_push_obj'].includes(name))args[1]=objects.object(args[1]);const result=withCEnvironment(objects,fn,...args);return result?.address??result??0;}])));
 environment.enableAddressPort('sp_lev',{only:['l_register_des']});
}
