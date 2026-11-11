// Original pre-game window/sound startup, in the order used by Unix main.
import {init_sound_disp_gamewindows} from '../ported/allmain.js';
import {callSounds} from '../ported/sounds-runtime.js';
import * as sounds from '../ported/sounds.js';
export function enableGameWindows(environment,layouts){
 const {services,memory,ctypes,functions}=environment;
 const local=new Proxy(Object.create(services),{get:(o,k,r)=>Reflect.has(o,k)?Reflect.get(o,k,r):typeof k==='string'?(...args)=>environment.resolve(k)(...args):undefined});
 const roots=['u','svl','svr','svc','svq','gu','gy','gi','ga','gc','gn','gm','flags','iflags','mons','objects','genders','svd','svm','gv','soundprocs','sysopt'];
 const procs=environment.allocateGlobal('soundprocs',layouts.sounds.soundSize),nosound=environment.allocateGlobal('sounds.nosound_procs',layouts.sounds.soundSize);
 Object.assign(local,{moduleKey:environment,heap:()=>memory.HEAPU8,global:i=>environment.requireGlobal(roots[i]),storage:i=>{if(i!==0)throw new Error('Unknown sound storage');return nosound;}});
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
 for(const [name,field,signature]of [['create_nhwindow','win_create_nhwindow','ii'],['start_menu','win_start_menu','vij'],['end_menu','win_end_menu','vip'],['display_nhwindow','win_display_nhwindow','vii']])context[name]=(...args)=>{const f=ctypes.record('struct window_procs').fields[field],fn=memory.view.getBigUint64(environment.requireGlobal('windowprocs')+f.offset,true);return functions.indirect(fn,signature,...args.map(v=>typeof v==='string'?services.literal(v):v));};
 environment.extend('game-startup',{init_sound_disp_gamewindows});
 return {sound:local,context,procs,nosound,limitation:'Pre-game window/sound startup integration in progress; full sound and game lifecycle require verification.'};
}
