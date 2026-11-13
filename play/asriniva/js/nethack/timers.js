// Original timeout queue policy on shared CMemory. Event callbacks resolve to
// their translated owners; unconnected game events are explicit link errors.
import * as timeout from '../ported/timeout.js';
import {obj_to_any} from '../ported/hack.js';
import {createRecordViews} from './record-views.js';
import {extendTimeoutTransport} from './timeout-transport.js';
export function enableTimers(environment,layouts) {
    const {services,transport,ctypes,memory,functions}=environment,views=createRecordViews(environment),L=layouts.timeout;
    if(ctypes.size('struct fe')!==L.timerSize)throw new Error('Timer record profile mismatch');
    const forwards=new Map(),boundary=args=>args.map(v=>typeof v==='string'?services.literal(v):v?.address??v);
    const env=new Proxy(Object.create(services),{get(target,key,receiver){
        if(Object.hasOwn(target,key))return Reflect.get(target,key,receiver);
        const value=Reflect.has(target,key)?Reflect.get(target,key,receiver):undefined;
        if(value!==undefined&&typeof value!=='function')return value;
        if(typeof key!=='string')return value;
        if(!forwards.has(key))forwards.set(key,(...args)=>(environment.hasFunction(key)?environment.resolve(key):typeof services[key]==='function'?services[key]:environment.resolve(key))(...boundary(args)));
        return forwards.get(key);
    }});
    Object.defineProperties(env,Object.getOwnPropertyDescriptors(transport));
    // TIMEOUT's native header aliases traverse the obj.v union. Keep this
    // projection local and wrap recursive record fields on the same backing heap.
    const projected=new Map();
    function record(type,p){
        const base=views.record(type,p);if(!base)return base;type=ctypes.canonical(type);
        const key=type+':'+environment.address(base);if(projected.has(key))return projected.get(key);
        const definition=ctypes.record(type),aliases=type==='struct obj'||type==='obj'?{ocontainer:['struct obj *',L.obj_ocontainer],ocarry:['struct monst *',L.obj_ocarry]}:{};
        const value=new Proxy(base,{get(target,name,receiver){
            const alias=aliases[name];if(alias)return record(alias[0].slice(0,-1).trim(),ctypes.load(alias[0],environment.address(base)+alias[1]));
            const result=Reflect.get(target,name,receiver),field=definition.fields[name];
            if(!field||!result||typeof result!=='object'||!('address'in result))return result;
            const child=(field.record??field.ctype.replace(new RegExp('\\s+'+name+'$'),'')).replace(/\s*\*$/,'');
            try{ctypes.record(child);}catch{return result;}return record(child,result);
        },set(target,name,value,receiver){const alias=aliases[name];if(alias){ctypes.store(alias[0],environment.address(base)+alias[1],environment.address(value));return true;}return Reflect.set(target,name,value,receiver);}});
        projected.set(key,value);return value;
    }
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
    const extension=extendTimeoutTransport(environment,layouts,env,views);
    const names=[...Object.keys(extension.abi.public),'cleanup_burn'].filter(name=>!environment.hasFunction(name));
    environment.register('timers',Object.fromEntries(names.map(name=>[name,timeout[name]])),env,{prepareArgs:(name,args)=>{
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
    }});
    environment.register('object-anything',{obj_to_any},env,{prepareArgs:(_fn,args)=>[record('struct obj',args[0])]});
    return {views,environment:env,events:timeout.timeout_funcs.map(({f,cleanup})=>({event:f,cleanup})),exports:names,limitation:'Original TIMEOUT entry transport on the established queue and callback IDs; unowned foreign event/death/weather branches require their actual owners and separate acceptance.'};
}
