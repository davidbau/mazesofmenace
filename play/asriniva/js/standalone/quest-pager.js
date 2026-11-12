// Original QUESTPGR policies on shared globals, Lua states and window callbacks.
import abi from './quest-pager-abi.json' with {type:'json'};
import publicFunctions from './public-functions.json' with {type:'json'};
import * as questpgr from '../ported/questpgr.js';
import {callQuestpgr} from '../nethack/bindings/questpgr.js';

export function enableQuestPager(environment,layouts){
 const {services,memory,ctypes,functions,transport}=environment,L=layouts.questpgr;
 const address=environment.address,text=v=>typeof v==='string'?services.literal(v):address(v);
 const resolve=name=>typeof services[name]==='function'?services[name]:environment.resolve(name);
 const local=new Proxy(Object.create(services),{get:(o,key,receiver)=>Reflect.has(o,key)?Reflect.get(o,key,receiver):typeof key==='string'?(...args)=>environment.resolve(key)(...args.map(v=>v?.address??v)):undefined});
 // Constructor-owned projections must not write through DECL's global getters.
 for(const name of abi.globals)Object.defineProperty(local,name,{value:undefined,writable:true,configurable:true});
 const quest=ctypes.locate('struct instance_globals_saved_q',environment.requireGlobal('svq'),'quest_status').at;
 Object.assign(local,{
  moduleKey:environment,heap:()=>memory.HEAPU8,literal:services.literal,rectState:undefined,trackState:undefined,
  global:i=>{if(!abi.globals[i])throw new Error('Unknown QUESTPGR global '+i);return environment.requireGlobal(abi.globals[i]);},
  questBit:i=>{if(!abi.questBits[i])throw new Error('Unknown QUESTPGR packed field '+i);return ctypes.getField('struct q_score',quest,abi.questBits[i],'unsigned int');},
  rn2:(n,line,caller)=>{if(services.rng_log_enabled())services.rng_log_set_caller(services.literal('questpgr.c'),line,text(caller));return services.rn2(transport.int(n));},
  Sprintf:(out,format,...args)=>services.sprintf(address(out),text(format),...args.map(v=>typeof v==='string'?text(v):v?.address??v)),
  impossible:(format,...args)=>resolve('impossible')(text(format),...args.map(v=>typeof v==='string'?text(v):v?.address??v)),
  pline:(format,message)=>resolve('pline')(text(format),text(message)),panic:format=>resolve('panic')(text(format)),
  strcmpi:(a,b)=>resolve('strncmpi')(text(a),text(b),-1),
  nhl_init:p=>address(resolve('nhl_init')(address(p))),
  nhl_loadlua:(state,name)=>resolve('nhl_loadlua')(address(state),text(name)),
  nhl_done:state=>resolve('nhl_done')(address(state)),
  get_table_str_opt:(state,name,def)=>address(resolve('get_table_str_opt')(address(state),text(name),text(def))),
  get_table_option:(state,name,def,options)=>resolve('get_table_option')(address(state),text(name),text(def),address(options)),
  lua_getglobal:(state,name)=>resolve('lua_getglobal')(address(state),text(name)),
  lua_getfield:(state,index,name)=>resolve('lua_getfield')(address(state),transport.int(index),text(name)),
  lua_tointeger:(state,index)=>resolve('lua_tointegerx')(address(state),transport.int(index),0),
  lua_pushinteger:(state,value)=>resolve('lua_pushinteger')(address(state),transport.long(value)),
  luaL_checkstring:(state,index)=>address(resolve('luaL_checklstring')(address(state),transport.int(index),0)),
  free:p=>services.free(address(p)),dupstr:p=>address(resolve('dupstr')(text(p))),
  Strcpy:(out,value)=>services.strcpy(address(out),text(value)),Strcat:(out,value)=>services.strcat(address(out),text(value)),
 });
 for(const name of ['lua_settop','lua_type','lua_len','lua_gettable'])local[name]=(state,index)=>resolve(name)(address(state),transport.int(index));
 for(const name of ['strlen','eos'])local[name]=p=>Number(resolve(name)(text(p)));
 for(const name of ['strchr','strncmpi','strstri'])local[name]=(a,b,...rest)=>resolve(name)(text(a),typeof b==='string'?text(b):b,...rest);
 local.strNsubst=(out,from,to,count)=>resolve('strNsubst')(address(out),text(from),text(to),transport.int(count));
 local.copynchars=(out,from,count)=>address(resolve('copynchars')(address(out),text(from),transport.int(count)));
 for(const name of ['lowc','highc'])local[name]=value=>resolve(name)(transport.char(value));
 for(const name of ['artiname'])local[name]=value=>address(resolve(name)(transport.int(value)));
 local.rank_of=(level,role,gender)=>address(resolve('rank_of')(transport.int(level),transport.short(role),transport.char(gender)));
 for(const name of ['align_str','align_gname','align_gtitle'])local[name]=value=>address(resolve(name)(transport.char(value)));
 for(const name of ['An','an','the','makeplural','makesingular','s_suffix'])local[name]=value=>address(resolve(name)(text(value)));
 local.mkclass=(kind,flags)=>address(resolve('mkclass')(transport.char(kind),transport.int(flags)));
 const window=(field,signature,...args)=>{
  const entry=ctypes.record('struct window_procs').fields[field];if(!entry)throw new Error('Unknown QUESTPGR window callback '+field);
  const fn=memory.view.getBigUint64(environment.requireGlobal('windowprocs')+entry.offset,true);
  return functions.indirect(fn,signature,...args);
 };
 Object.assign(local,{
  create_nhwindow:type=>window('win_create_nhwindow','ii',transport.int(type)),
  putstr:(win,attr,value)=>window('win_putstr','viip',transport.int(win),transport.int(attr),text(value)),
  display_nhwindow:(win,block)=>window('win_display_nhwindow','vii',transport.int(win),transport.char(block)),
  destroy_nhwindow:win=>window('win_destroy_nhwindow','vi',transport.int(win)),
  putmsghistory:(value,restoring)=>window('win_putmsghistory','vpi',text(value),transport.char(restoring)),
 });
 const names=Object.keys(questpgr).filter(name=>typeof questpgr[name]==='function'&&Object.hasOwn(publicFunctions.functions,name)&&!environment.hasFunction(name));
 environment.register('quest-pager',Object.fromEntries(names.map(name=>[name,(...args)=>callQuestpgr(local,L,name,...args)])));
 return {services:local,call:(name,...args)=>transport.scoped(()=>callQuestpgr(local,L,name,...args)),limitation:'Quest pager transport connected; legacy intro, quest messages and failure/window-input paths require original-C verification.'};
}
