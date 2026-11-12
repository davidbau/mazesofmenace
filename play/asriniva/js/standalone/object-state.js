// Object startup and name persistence, using unchanged O_INIT policy and its
// existing measured adapter. Discovery/menu functions are deliberately absent.
import * as policy from '../ported/o_init.js';
import {createOInitEnvironment} from '../ported/o_init-runtime.js';
import {CPanic} from '../nethack/runtime.js';
export function enableObjectState(environment,layouts) {
    const {services,memory,bitfields,libc}=environment;
    const globals=['objects','obj_descr','svb','svd','go','iflags','flags','program_state','u','cg','gu','svc','def_oc_syms'];
    const pointers=globals.map(name=>environment.requireGlobal(name));
    for(const name of ['rn2','rng_log_enabled','rng_log_set_caller','sfo_objclass','sfi_objclass','ledger_no','maxledgerno'])
        if(typeof services[name]!=='function')throw new Error('Object state requires '+name);
    const classBits=['oc_name_known','oc_encountered','oc_tough','oc_material','oc_unique','oc_magic','oc_uses_known','oc_dir'];
    const objectBits=['dknown','known'];
    function key(keys,i){if(!keys[i])throw new Error('Unknown O_INIT bit '+i);return keys[i];}
    const local=Object.create(services);
    // This adapter builds its own views with Object.assign. Shadow DECL's
    // accessors so constructing those views cannot assign back into live
    // globals (or trip a const global's inherited setter).
    for(const name of globals)Object.defineProperty(local,name,{value:services[name],writable:true,configurable:true});
    Object.assign(local,{
        global:i=>{if(!pointers[i])throw new Error('Unknown O_INIT global '+i);return pointers[i];},
        classBit:(p,i)=>bitfields.get('objclass',key(classBits,i),p),
        setClassBit:(p,i,v)=>bitfields.set('objclass',key(classBits,i),p,v),
        objectBit:(p,i)=>bitfields.get('obj',key(objectBits,i),p),
        setObjectBit:(p,i,v)=>bitfields.set('obj',key(objectBits,i),p,v),
        rn2:(n,line,caller)=>{
            if(!['randomize_gem_colors','shuffle','init_objects'].includes(caller))throw new Error('Unknown O_INIT RNG caller');
            if(services.rng_log_enabled())services.rng_log_set_caller(services.literal('o_init.c'),line,services.literal(caller));
            return services.rn2(n);
        },
        ledger_no:lev=>environment.resolve('ledger_no')(environment.address(lev)),
        maxledgerno:()=>environment.resolve('maxledgerno')(),
        // Error paths retain diagnostics and termination; no success stubs.
        panic:(format,...args)=>{throw new CPanic(libc.format(format,...args));},
        impossible:(format,...args)=>environment.diagnostics.push(libc.format(format,...args)),
        raw_printf:(...args)=>environment.resolve('raw_printf')(...args),
        wait_synch:()=>environment.resolve('wait_synch')(),
        Strlen:p=>memory.strlen(environment.address(p)),
    });
    for(const direction of ['sfo','sfi'])for(const kind of ['int','short','objclass','unsigned','char'])
        local[(direction==='sfo'?'Sfo_':'Sfi_')+kind]=(...args)=>services[direction+'_'+kind](...args);
    const adapter=createOInitEnvironment(local,layouts.o_init,policy);
    const names=['setgemprobs','randomize_gem_colors','shuffle','init_objects','init_oclass_probs','obj_shuffle_range','shuffle_all','objdescr_is','oinit','savenames','restnames','discover_object','observe_object'];
    const namespace=Object.fromEntries(names.map(name=>[name,policy[name]]));
    namespace.objdescr_is=(...args)=>Number(policy.objdescr_is(...args));
    environment.register('object-state',namespace,adapter,{prepareArgs:(name,args)=>{
        if(name==='setgemprobs')args[0]=adapter.level(args[0]);
        if(name==='observe_object')args[0]=adapter.object(args[0]);
        if(name==='objdescr_is')args[0]=adapter.object(args[0]);
        if(['savenames','restnames'].includes(name))args[0]=adapter.nhfile(args[0]);
        if(name==='obj_shuffle_range'){args[1]=adapter.intPointer(args[1]);args[2]=adapter.intPointer(args[2]);}
        return args;
    }});
    return {exports:names,adapter,limitation:'Object startup and name state only; discovery menus and inventory UI remain unlinked.'};
}
