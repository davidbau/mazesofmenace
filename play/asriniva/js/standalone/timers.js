// Original timeout queue policy on shared CMemory. Event callbacks resolve to
// their translated owners; unconnected game events are explicit link errors.
import * as timeout from '../ported/timeout.js';
import {obj_to_any} from '../ported/hack.js';
import {createRecordViews} from './record-views.js';
export function enableTimers(environment,layouts) {
    const {services,transport,ctypes,memory,functions}=environment,views=createRecordViews(environment),L=layouts.timeout;
    if(ctypes.size('struct fe')!==L.timerSize)throw new Error('Timer record profile mismatch');
    const env=new Proxy(Object.create(services),{get(target,key,receiver){
        if(Reflect.has(target,key))return Reflect.get(target,key,receiver);
        if(typeof key!=='string')return undefined;
        return (...args)=>environment.resolve(key)(...args);
    }});
    Object.defineProperties(env,Object.getOwnPropertyDescriptors(transport));
    const record=(type,p)=>views.record(type,p),bits=v=>BigInt.asUintN(64,BigInt(v?.address??v??0));
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
    const names=['run_timers','start_timer','stop_timer','peek_timer','obj_move_timers','obj_split_timers','obj_stop_timers','obj_has_timer','attach_egg_hatch_timeout','attach_fig_transform_timeout','kill_egg','hatch_egg','save_timers','restore_timers','relink_timers','obj_is_local'];
    environment.register('timers',Object.fromEntries(names.map(name=>[name,timeout[name]])),env,{prepareArgs:(name,args)=>{
        if(name==='start_timer')args[3]=record('union any',args[3]);
        if(['stop_timer','peek_timer'].includes(name))args[1]=record('union any',args[1]);
        if(name==='hatch_egg')args[0]=record('union any',args[0]);
        if(['obj_move_timers','obj_split_timers'].includes(name)){args[0]=record('struct obj',args[0]);args[1]=record('struct obj',args[1]);}
        if(['obj_stop_timers','obj_has_timer','attach_egg_hatch_timeout','attach_fig_transform_timeout','kill_egg','obj_is_local'].includes(name))args[0]=record('struct obj',args[0]);
        if(['save_timers','restore_timers'].includes(name))args[0]=record('struct nh_file',args[0]);
        return args;
    }});
    environment.register('object-anything',{obj_to_any},env,{prepareArgs:(_fn,args)=>[record('struct obj',args[0])]});
    return {views,environment:env,events:timeout.timeout_funcs.map(({f,cleanup})=>({event:f,cleanup})),limitation:'Timer queue and attach operations; each elapsed event must have its real translated owner linked.'};
}
