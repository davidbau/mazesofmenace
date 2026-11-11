// Source game-startup policies and role tables on the standalone shared heap.
import * as role from '../ported/role.js';
import {createRoleEnvironment} from '../ported/role-runtime.js';
import {newgame} from '../ported/allmain.js';
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
 Object.assign(local,{
  global:i=>{if(!globals[i])throw new Error('Unknown ROLE global '+i);return globals[i];},storage:i=>{if(!tables[i])throw new Error('Unknown ROLE table '+i);return tables[i];},
  questBit:i=>ctypes.getField('struct q_score',quest,genderFields[i],'unsigned int'),
  setQuestBit:(i,v)=>ctypes.setField('struct q_score',quest,genderFields[i],'unsigned int',v),
  rn2:(n,line,caller)=>{if(services.rng_log_enabled())services.rng_log_set_caller(services.literal('role.c'),line,services.literal(caller));return services.rn2(n);},
  Strcpy:(d,s)=>services.strcpy(environment.address(d),ptr(s)),Strlen:p=>memory.strlen(ptr(p)),
  strcmpi:(a,b)=>services.strncmpi(ptr(a),ptr(b),-1),
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
 environment.register('game-startup',{newgame},env);
 return {environment:env,role:roleEnv,tables,limitation:'Startup dependency integration in progress. newgame remains an explicit unresolved edge until its complete owner graph is connected.'};
}
