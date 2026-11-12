// Original random-text policy on shared stdio, canonical RNG and C strings.
import {get_rnd_text,get_rnd_line,unpadline,getrumor,save_oracles,restore_oracles,free_CapMons} from '../ported/rumors.js';
import {createRumorsState,createRumorsEnvironment} from '../ported/rumors-runtime.js';
export function enableRandomText(environment,layouts){
 const {services,functions}=environment,text=p=>typeof p==='string'?services.literal(p):environment.address(p);
 const local=new Proxy(Object.create(services),{get:(o,k,r)=>Reflect.has(o,k)?Reflect.get(o,k,r):typeof k==='string'?(...args)=>environment.resolve(k)(...args):undefined});
 const globals=['u','gi','gt','gf','svo','go','gm','disp','program_state','iflags','mons','flags'];
 Object.assign(local,{global:i=>{if(!globals[i])throw new Error('Unknown RUMORS global '+i);return environment.requireGlobal(globals[i]);},
  rngPointer:()=>environment.functionPointer('rn2','ii'),callRng:(fn,n)=>functions.indirect(fn,'ii',n),
  dlb_fopen:(name,mode)=>services.fopen(text(name),text(mode)),dlb_fclose:services.fclose,dlb_fseek:services.fseek,dlb_ftell:services.ftell,dlb_fgets:services.fgets,
  Strcpy:(out,input)=>services.strcpy(environment.address(out),text(input)),strlen:p=>BigInt(environment.memory.strlen(text(p))),
  strcpy:(out,input)=>services.strcpy(environment.address(out),text(input)),strcmp:(a,b)=>services.strcmp(text(a),text(b)),strncmp:(a,b,n)=>services.strncmp(text(a),text(b),n),strchr:(p,ch)=>services.strchr(text(p),ch),
  alloc:n=>environment.alloc('alloc',n),xcrypt:(input,out)=>environment.resolve('xcrypt')(text(input),environment.address(out)),
  nhassert:ok=>{if(!ok)environment.resolve('__assert_fail')(services.literal('filechunksize <= INT_MAX'),services.literal('rumors.c'),0,services.literal('get_rnd_line'));},
  bogonCodes:()=>environment.requireGlobal('bogon_codes'),winMessage:()=>environment.ctypes.load('int',environment.requireGlobal('WIN_MESSAGE')),
 });
 const callers=['getrumor','outrumor','outoracle'];
 for(const kind of ['rn2','rnd'])local[kind]=(n,line,caller)=>{const name=callers[caller];if(!name)throw new Error('Unknown RUMORS RNG caller '+caller);if(services.rng_log_enabled())services.rng_log_set_caller(services.literal('rumors.c'),line,services.literal(name));return services[kind](n);};
 for(const direction of ['sfo','sfi'])for(const type of ['unsigned','ulong'])local[(direction==='sfo'?'Sfo_':'Sfi_')+type]=(file,data,tag)=>environment.resolve(direction+'_'+type)(environment.address(file),environment.address(data),text(tag));
 const state=createRumorsState(),context=createRumorsEnvironment(local,layouts.rumors,state);Object.setPrototypeOf(context,local);
 environment.register('random-text',{get_rnd_text,get_rnd_line,unpadline,getrumor,save_oracles,restore_oracles,free_CapMons},context);
 return {context,state};
}
