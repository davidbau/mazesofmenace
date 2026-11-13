// Source color capability and glyph-map startup on the shared heap.
import {has_color} from '../ported/windows.js';
import {createSignals} from './signals.js';
export function enableDisplayStartup(environment,layouts,creation){
 const startup=environment.state('game-startup-context');if(!startup)throw new Error('Enable game startup before display startup');
 const {services,ctypes,functions}=environment,{context,views}=creation,env=context(layouts.windows);
 Object.defineProperty(env,'iflags',{value:{get use_color(){return ctypes.getField('struct instance_flags',environment.requireGlobal('iflags'),'wc_color','signed char');}}});
 Object.defineProperty(env,'windowprocs',{value:views.record('struct window_procs',environment.requireGlobal('windowprocs'))});env.WC_COLOR=BigInt(layouts.windows.WC_COLOR);
 environment.register('window-color',{has_color},env);
 // The original read-only predicate also installs DISPLAY source statics.
 environment.call('display','suppress_map_output');
 environment.linkGlobal('glyphmap',environment.requireGlobal('display.glyphmap'));
 environment.linkGlobal('seenv_matrix',environment.requireGlobal('display.seenv_matrix'));
 const signals=createSignals(environment);environment.register('signals',signals.api);
 // Keep a source function's dynamic C environment when it is installed directly.
 Object.assign(services,signals.api);
 const done1=environment.functionPointer('done1','vi');
 // ALLMAIN owns this header callback identity; the real END body resolves when
 // delivered. Registering the callback never supplies a replacement END policy.
 Object.defineProperty(startup,'done1Pointer',{value:done1});
 return {environment:env,signals,done1,limitation:'Configured color/glyph-map initialization and shared SDK signal registration, default/masked delivery and native callbacks. External timer delivery is outside this single-thread virtual profile.'};
}
