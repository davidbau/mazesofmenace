// Source game-startup policies and role tables on the standalone shared heap.
import * as role from '../ported/role.js';
import {createRoleEnvironment} from './bindings/role.js';
import {newgame,welcome} from '../ported/allmain.js';
import {align_str} from '../ported/insight.js';
import descriptions from './descriptions-abi.json' with {type:'json'};
import roleTransport from './role-transport-abi.json' with {type:'json'};
import {get_nhuuid} from '../ported/unixmain.js';
export function enableGameStartup(environment,layouts,creation){
 const {services,ctypes,memory,transport}=environment,{context,views}=creation;
 if(!Object.hasOwn(environment.status(),'hacklib'))environment.enableHacklib(layouts.hacklib);
 if(!Object.hasOwn(environment.status(),'sys'))environment.enableSys(layouts.sys);
 const L=layouts.role,names=['gu','gr','svp','gp','sysopt','program_state','flags','iflags','cg','mons','svq','objects'];
 const globals=names.map(n=>environment.requireGlobal(n)),local=Object.create(services);
 // Adapter construction must shadow DECL accessors, never assign through them.
 for(const name of names)Object.defineProperty(local,name,{value:services[name],writable:true,configurable:true});
 const tableNames=['roles','races','genders','aligns'],types=['Role','Race','Gender','Align'];
 const tables=tableNames.map((name,i)=>environment.allocateGlobal(name,ctypes.size('struct '+types[i])*role[name].length));
 const quest=ctypes.locate('struct instance_globals_saved_q',environment.requireGlobal('svq'),'quest_status').at,genderFields=['ldrgend','nemgend','godgend'];
 const ptr=v=>typeof v==='string'?services.literal(v):environment.address(v);
 const window=(field,signature,...args)=>{const f=ctypes.record('struct window_procs').fields[field];if(!f)throw new Error('Unknown ROLE window callback '+field);return environment.functions.indirect(memory.view.getBigUint64(environment.requireGlobal('windowprocs')+f.offset,true),signature,...args);};
 Object.assign(local,{
  global:i=>{if(!globals[i])throw new Error('Unknown ROLE global '+i);return globals[i];},storage:i=>{if(!tables[i])throw new Error('Unknown ROLE table '+i);return tables[i];},
  questBit:i=>ctypes.getField('struct q_score',quest,genderFields[i],'unsigned int'),
  setQuestBit:(i,v)=>ctypes.setField('struct q_score',quest,genderFields[i],'unsigned int',v),
  rn2:(n,line,caller)=>{if(services.rng_log_enabled())services.rng_log_set_caller(services.literal('role.c'),line,services.literal(caller));return services.rn2(n);},
  Strcpy:(d,s)=>services.strcpy(environment.address(d),ptr(s)),
  strlen:p=>BigInt(memory.strlen(ptr(p))),
  Strlen:(p,index)=>{const site=roleTransport.strlenSites[index];if(!site)throw new Error('Unknown ROLE Strlen site '+index);return environment.strutil('Strlen_',ptr(p),services.literal(site.function),site.line);},
  assert:(ok,index)=>{const site=roleTransport.assertSites[index];if(!site)throw new Error('Unknown ROLE assert site '+index);if(!ok)return environment.resolve('__assert_fail')(services.literal(site.expression),services.literal(site.file),site.line,services.literal(site.function));},
  strcmpi:(a,b)=>services.strncmpi(ptr(a),ptr(b),-1),
  Sprintf:(out,format,...args)=>services.sprintf(environment.address(out),ptr(format),...args.map(ptr)),
  create_nhwindow:type=>window('win_create_nhwindow','ii',transport.int(type)),
  start_menu:(win,flags)=>window('win_start_menu','vij',transport.int(win),transport.ulong(flags)),
  end_menu:(win,text)=>window('win_end_menu','vip',transport.int(win),ptr(text)),
  destroy_nhwindow:win=>window('win_destroy_nhwindow','vi',transport.int(win)),
  putstr:(win,attr,text)=>window('win_putstr','viip',transport.int(win),transport.int(attr),ptr(text)),
  askname:()=>window('win_askname','v'),nulGlyphInfo:()=>environment.requireGlobal('nul_glyphinfo'),
  add_menu_str:(win,text)=>environment.resolve('add_menu_str')(transport.int(win),ptr(text)),
  add_menu:(win,glyph,id,ch,gch,attr,color,text,flags)=>environment.resolve('add_menu')(transport.int(win),ptr(glyph),ptr(id),transport.char(ch),transport.char(gch),transport.int(attr),transport.int(color),ptr(text),transport.uint(flags)),
  select_menu:(win,how,list)=>environment.resolve('select_menu')(transport.int(win),transport.int(how),ptr(list)),
 });
 const roleEnv=createRoleEnvironment(local,L,{initialized:false});
 const namespace=Object.fromEntries(Object.entries(role).filter(([,v])=>typeof v==='function'));
 environment.register('role',namespace,roleEnv,{prepareArgs:(fn,a)=>{if(fn==='Hello')a[0]=roleEnv.monster(a[0]);return a;}});
 environment.enableAddressPort('pray',{only:['align_gtitle']});
 environment.exposeAddressPort('dungeon',['init_dungeons']);
 const env=context(layouts.allmain);
 for(const[name,type]of [['a11y','accessibility_data'],['disp','display_hints'],['program_state','sinfo']])Object.defineProperty(env,name,{value:views.record('struct '+type,environment.requireGlobal(name))});
 env.notice_mon_off=()=>{env.a11y.mon_notices_blocked++;};
 environment.register('startup-platform-id',{get_nhuuid},env);
 const alignment=Object.assign(Object.create(services),descriptions.constants,{schar:transport.char,int:transport.int});
 environment.register('alignment-description',{align_str:value=>services.literal(align_str(transport.char(value)))},alignment);
 Object.defineProperty(env,'genders',{value:roleEnv.genders});
 environment.register('game-startup',{newgame,welcome},env);
 return {environment:env,role:roleEnv,tables,limitation:'Startup dependency integration in progress. newgame remains an explicit unresolved edge until its complete owner graph is connected.'};
}
