// Complete native timer/status policies on shared actors, items and queue.
// Callback identities and serialization remain explicit byte boundaries.
import * as timeout from '../ported/timeout.js';
import {createNativeRecordViews} from './native/record-views.js';
import {nativeStateFor} from './native/state-bridge.js';
import {createNativeTimeout} from './native/timeout.js';
import {extendTimeoutTransport} from './timeout-transport.js';
export function enableTimers(environment,layouts) {
    const {services,transport,ctypes,memory,functions}=environment,views=createNativeRecordViews(environment),L=layouts.timeout;
    const native=nativeStateFor(environment);
    if(ctypes.size('struct fe')!==L.timerSize)throw new Error('Timer record profile mismatch');
    const forwards=new Map(),boundary=args=>args.map(v=>typeof v==='string'?services.literal(v):v?.address??v);
    const env=new Proxy(Object.create(services),{get(target,key,receiver){
        if(Object.hasOwn(target,key))return Reflect.get(target,key,receiver);
        const value=Reflect.has(target,key)?Reflect.get(target,key,receiver):undefined;
        if(value!==undefined&&typeof value!=='function')return value;
        if(typeof key!=='string')return value;
        const direct=native.functions.get(key);if(direct?.nativeState===native)return direct;
        if(!forwards.has(key))forwards.set(key,(...args)=>native.boundary(environment.hasFunction(key)?environment.resolve(key):typeof services[key]==='function'?services[key]:environment.resolve(key),...boundary(args)));
        return forwards.get(key);
    }});
    Object.defineProperties(env,Object.getOwnPropertyDescriptors(transport));
    const record=(type,p)=>views.record(type,p);
    const bits=v=>BigInt.asUintN(64,BigInt(v?.address??v??0));
    const scalarRef=(type,at,value)=>{const ref=Object.defineProperty({address:at},'value',{get:()=>ctypes.load(type,at),set:next=>ctypes.store(type,at,next)});if(value!==undefined)ref.value=value;return ref;};
    if(ctypes.size('int')!==4||ctypes.size('unsigned int')!==4||ctypes.size('unsigned long')!==8)throw new Error('Timer save scalar profile mismatch');
    Object.assign(env,L,{
        timer:p=>record('struct fe',p),sizes:{any:ctypes.size('union any')},
        anyLocal:()=>record('union any',transport.stackAlloc(ctypes.size('union any'))),
        intLocal:(value=0)=>scalarRef('int',transport.stackAlloc(4),value),
        uintLocal:(value=0)=>scalarRef('unsigned int',transport.stackAlloc(4),value),
        timerIdRef:()=>scalarRef('unsigned long',ctypes.locate('struct instance_globals_saved_t',environment.requireGlobal('svt'),'timer_id').at),
        update_file:nhfp=>nhfp.mode&(L.COUNTING|L.WRITING),release_data:nhfp=>nhfp.mode&L.FREEING,
        find_oid:id=>record('struct obj',environment.resolve('find_oid')(transport.uint(id))),
        lookup_id_mapping:(id,ref)=>environment.resolve('lookup_id_mapping')(transport.uint(id),environment.address(ref)),
        callLocal:(fn,...args)=>transport.scoped(fn,...args),samePtr:(a,b)=>bits(a)===bits(b),
        copyRecord:(to,from,n)=>memory.memmove(environment.address(to),environment.address(from),Number(n)),
        copyAnything:(to,from)=>memory.memmove(environment.address(to),environment.address(from),ctypes.size('union any')),
        Sprintf:(out,format,...args)=>environment.libc.sprintf(environment.address(out),format,...args),
        impossible:(format,...args)=>environment.diagnostics.push(environment.libc.format(format,...args)),
        rngCaller:(line,caller)=>{if(services.rng_log_enabled())services.rng_log_set_caller(services.literal('timeout.c'),line,services.literal(caller));},
        coordLocal:()=>record('coord',transport.stackAlloc(ctypes.size('coord'))),
        coordxyLocal:()=>Object.defineProperty({address:transport.stackAlloc(2)},'value',{
            get(){return transport.read('Int16',this.address);},set(value){transport.write('Int16',this.address,value);},
        }),
    });
    for(const [name,type]of Object.entries({gt:'instance_globals_t',svt:'instance_globals_saved_t',svm:'instance_globals_saved_m',cg:'const_globals',gm:'instance_globals_m'}))
        Object.defineProperty(env,name,{value:record('struct '+type,environment.requireGlobal(name))});
    for(const direction of ['sfo','sfi'])for(const type of ['int','ulong','fe'])env[(direction==='sfo'?'Sfo_':'Sfi_')+type]=(file,data,tag)=>environment.resolve(direction+'_'+type)(environment.address(file),environment.address(data),typeof tag==='string'?services.literal(tag):environment.address(tag));
    env.timerBaseRef=()=>Object.defineProperty({address:ctypes.locate('struct instance_globals_t',environment.requireGlobal('gt'),'timer_base').at},'value',{
        get:()=>env.gt.timer_base,set:value=>{env.gt.timer_base=value;},
    });
    const eventPointer=name=>functions.functionPointer((arg,time)=>environment.resolve(name)(arg,time),'vpj');
    env.timeout_funcs=timeout.timeout_funcs.map(row=>({f:eventPointer(row.f),cleanup:row.cleanup?eventPointer(row.cleanup):0n,name:services.literal(row.name)}));
    if(env.timeout_funcs.length!==L.NUM_TIME_FUNCS)throw new Error('Timer callback table profile mismatch');
    env.callTimeout=(fn,arg,time)=>functions.indirect(fn,'vpj',environment.address(arg),BigInt(time));
    const extension=extendTimeoutTransport(environment,layouts,env);
    const names=[...Object.keys(extension.abi.public),'cleanup_burn'].filter(name=>!environment.hasFunction(name));
    const prepare=(name,args)=>{
        if(name==='start_timer')args[3]=record('union any',args[3]);
        if(['stop_timer','peek_timer'].includes(name))args[1]=record('union any',args[1]);
        if(name==='hatch_egg')args[0]=record('union any',args[0]);
        if(['obj_move_timers','obj_split_timers'].includes(name)){args[0]=record('struct obj',args[0]);args[1]=record('struct obj',args[1]);}
        if(['obj_stop_timers','obj_has_timer','attach_egg_hatch_timeout','attach_fig_transform_timeout','kill_egg','obj_is_local'].includes(name))args[0]=record('struct obj',args[0]);
        if(['save_timers','restore_timers'].includes(name))args[0]=record('struct nh_file',args[0]);
        if(name==='property_by_index')args[1]=env.intPointer(args[1]);
        if(['begin_burn','end_burn'].includes(name)){args[0]=record('struct obj',args[0]);args[1]=transport.char(args[1]);}
        if(['burn_object','cleanup_burn'].includes(name)){args[0]=record('union any',args[0]);args[1]=transport.long(args[1]);}
        if(name==='fall_asleep'){args[0]=transport.int(args[0]);args[1]=transport.char(args[1]);}
        if(name==='timer_stats'){args[0]=typeof args[0]==='string'?services.literal(args[0]):environment.address(args[0]);args[1]=environment.address(args[1]);args[2]=env.longPointer(args[2]);args[3]=env.longPointer(args[3]);}
        if(['spot_stop_timers','spot_time_expires','spot_time_left'].includes(name))args=args.map(transport.short);
        return args;
    };
    const policies=createNativeTimeout(env);
    const bind=name=>{
        const invoke=(...args)=>{const saved=native.depth?undefined:transport.stackSave();native.enter();try{const value=policies[name](...prepare(name,args));return typeof value==='string'?services.literal(value):value?.address??value;}finally{native.leave();if(saved!==undefined)transport.stackRestore(saved);}};
        invoke.nativeState=native;invoke.nativeDirect=true;native.functions.set(name,invoke);return invoke;
    };
    environment.register('timers',Object.fromEntries(names.map(name=>[name,bind(name)])),env);
    // Preserve the already registered callback identities; only their known
    // TIMEOUT destinations skip pointer-table dispatch inside the native graph.
    const callbacks=new Map();
    timeout.timeout_funcs.forEach((row,i)=>{callbacks.set(String(env.timeout_funcs[i].f),row.f);if(row.cleanup)callbacks.set(String(env.timeout_funcs[i].cleanup),row.cleanup);});
    const legacyTimeout=env.callTimeout;
    env.callTimeout=(fn,arg,time)=>{
        const name=callbacks.get(String(fn));if(!name)return legacyTimeout(fn,arg,time);
        const direct=policies[name];if(direct)return direct(record('union any',arg),transport.long(time));
        const target=native.functions.get(name);if(target?.nativeState===native)return target(record('union any',arg),transport.long(time));
        return native.boundary(environment.resolve(name),environment.address(arg),transport.long(time));
    };
    const anything=obj=>{const out=env.gt.tmp_anything;env.copyRecord(out,env.cg.zeroany,ctypes.size('union any'));out.a_obj=record('struct obj',obj);return out;};
    anything.nativeState=native;anything.nativeDirect=true;native.functions.set('obj_to_any',anything);
    environment.register('object-anything',{obj_to_any:anything},env);
    return {views,environment:env,events:timeout.timeout_funcs.map(({f,cleanup})=>({event:f,cleanup})),exports:names,limitation:'Complete native TIMEOUT policies and shared state; byte-level locals/serialization and remaining foreign owners retain explicit boundaries. Requires full original-C event/world and recording acceptance.'};
}
