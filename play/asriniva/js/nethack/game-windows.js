// Original pre-game window/sound startup, in the order used by Unix main.
import {init_sound_disp_gamewindows} from '../ported/allmain.js';
import {callSounds} from './bindings/sounds.js';
import * as sounds from '../ported/sounds.js';
import {createRecordViews} from './record-views.js';
export function enableGameWindows(environment,layouts){
 const {services,memory,ctypes,functions}=environment;
 const local=new Proxy(Object.create(services),{get:(o,k,r)=>{const value=Reflect.get(o,k,r);if(Object.hasOwn(o,k)||typeof k!=='string')return value;if(typeof value!=='function'&&Reflect.has(o,k))return value;return(...args)=>(typeof value==='function'?value:environment.resolve(k))(...args.map(v=>v?.address??v));}});
 const roots=['u','svl','svr','svc','svq','gu','gy','gi','ga','gc','gn','gm','flags','iflags','mons','objects','genders','svd','svm','gv','soundprocs','sysopt'];
 const procs=environment.allocateGlobal('soundprocs',layouts.sounds.soundSize),nosound=environment.allocateGlobal('sounds.nosound_procs',layouts.sounds.soundSize);
 Object.assign(local,{moduleKey:environment,heap:()=>memory.HEAPU8,global:i=>environment.requireGlobal(roots[i]),storage:i=>{if(i!==0)throw new Error('Unknown sound storage');return nosound;}});
 const views=createRecordViews(environment),address=environment.address,field=(type,root,path)=>({type,at:environment.requireGlobal(root),path});
 const packed={hero:[field('struct you','u','uswallow'),field('struct you','u','uinwater'),field('struct you','u','uroleplay.deaf')],
  level:['nfountains','nsinks','has_court','has_swamp','has_vault','has_beehive','has_morgue','has_barracks','has_zoo','has_shop','has_temple'].map(k=>field('struct instance_globals_saved_l','svl','level.flags.'+k)),
  context:[field('struct instance_globals_saved_c','svc','context.tribute.Deathnotice')]};
 const bits=(type,names)=>names.map(path=>({type,path}));
 const dynamic={monster:bits('struct monst',['female','isminion','ispriest','isshk','mcan','mcansee','mcanmove','mconf','mflee','mpeaceful','msleeping','mstun','mtrapped','mundetected']),object:bits('struct obj',['cursed','bknown']),trap:bits('struct trap',['tseen'])};
 for(const[k,rows]of Object.entries({...packed,...dynamic})){
  const get=(p,i)=>{const row=rows[i];if(!row)throw new Error('Unknown SOUNDS '+k+' bit '+i);let value=views.record(row.type,p??row.at);for(const part of row.path.split('.'))value=value[part];return value;};
  const set=(p,i,value)=>{const row=rows[i];if(!row)throw new Error('Unknown SOUNDS '+k+' bit '+i);const parts=row.path.split('.');let record=views.record(row.type,p??row.at);for(const part of parts.slice(0,-1))record=record[part];return record[parts.at(-1)]=value;};
  local[k+'Bit']=dynamic[k]?(p,i)=>get(address(p),i):i=>get(null,i);
  local['set'+k[0].toUpperCase()+k.slice(1)+'Bit']=dynamic[k]?(p,i,v)=>set(address(p),i,v):(i,v)=>set(null,i,v);
 }
 local.terrainBit=(x,y,i)=>{if(i!==0)throw new Error('Unknown SOUNDS terrain bit');return views.record('struct instance_globals_saved_l',environment.requireGlobal('svl')).level.locations[x][y].roomno;};
 local.equipment=i=>ctypes.load('struct obj *',environment.requireGlobal(['uwep','uarm','uarmc','uarmh','uarms','uarmg','uarmf','uarmu'][i]));
 local.commonString=i=>{if(i!==0)throw new Error('Unknown SOUNDS common string');return ctypes.getField('struct c_common_strings',environment.requireGlobal('c_common_strings'),'c_nothing_happens','char *');};
 local.rn2=(n,line,caller)=>{if(services.rng_log_enabled())services.rng_log_set_caller(services.literal('sounds.c'),line,services.literal(caller));return environment.resolve('rn2')(n);};
 // The binding passes a source-predicate index, not a native callback address.
 const predicates=['throne_mon_sound','beehive_mon_sound','morgue_mon_sound','zoo_mon_sound','temple_priest_sound','oracle_sound'];
 local.get_iter_mons=i=>{const name=predicates[environment.transport.int(i)];if(!name)throw new Error('Unknown SOUNDS predicate '+i);return environment.resolve('get_iter_mons')(environment.functionPointer('sounds::'+name,'ip',m=>callSounds(local,layouts.sounds,name,m)));};
 callSounds(local,layouts.sounds,'nosoundAddress');
 environment.register('sounds',Object.fromEntries(Object.entries(sounds).filter(([name,v])=>typeof v==='function'&&!environment.hasFunction(name)).map(([name])=>[name,(...args)=>callSounds(local,layouts.sounds,name,...args)])));
 const context=environment.state('game-startup-context');if(!context)throw new Error('Enable game startup before windows');
 context.VIA_WINDOWPORT=()=>{const caps=ctypes.getField('struct window_procs',environment.requireGlobal('windowprocs'),'wincap2','unsigned long');return (caps&(BigInt(layouts.botl.WC2_HILITE_STATUS)|BigInt(layouts.botl.WC2_FLUSH_STATUS)))!==0n;};
 context.SoundAchievement=(a,b,flags)=>{
  // Effective sndprocs.h macro; retain the source guard and indirect call.
  const enabled=ctypes.getField('struct instance_flags',environment.requireGlobal('iflags'),'sounds','boolean'),record=ctypes.record('struct sound_procs'),callback=memory.view.getBigUint64(procs+record.fields.sound_achievement.offset,true),triggers=ctypes.getField('struct sound_procs',procs,'sound_triggers','unsigned long');
  if(enabled&&callback&&(triggers&BigInt(layouts.sounds.SOUND_TRIGGER_ACHIEVEMENTS)))functions.indirect(callback,'viii',a,b,flags);
 };
 Object.defineProperty(context,'menuHeadingsAddress',{get:()=>ctypes.locate('struct instance_flags',environment.requireGlobal('iflags'),'menu_headings').at});
 for(const [name,field,signature]of [['create_nhwindow','win_create_nhwindow','ii'],['start_menu','win_start_menu','vij'],['end_menu','win_end_menu','vip'],['display_nhwindow','win_display_nhwindow','vii']])context[name]=(...args)=>{if(environment.nativeWindowCallbacks)return environment.nativeWindowCallbacks.invoke(field,signature,...args.map(v=>typeof v==='string'?services.literal(v):v));const f=ctypes.record('struct window_procs').fields[field],fn=memory.view.getBigUint64(environment.requireGlobal('windowprocs')+f.offset,true);return functions.indirect(fn,signature,...args.map(v=>typeof v==='string'?services.literal(v):v));};
 environment.extend('game-startup',{init_sound_disp_gamewindows});
 return {sound:local,context,procs,nosound,limitation:'Pre-game window/sound startup integration in progress; full sound and game lifecycle require verification.'};
}
