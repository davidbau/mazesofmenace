// Source naming and artifact bookkeeping on the existing inventory heap.
import languageAbi from './object-language-abi.json' with {type:'json'};
import {callObjnam} from '../ported/objnam-runtime.js';
import * as artifact from '../ported/artifact.js';
import {oname,noveltitle,sir_Terry_novels} from '../ported/do_name.js';
export function enableItemNaming(environment,layouts,{legacy,views}) {
    const {services,transport,ctypes,memory}=environment,object=p=>views.record('struct obj',p);
    Object.assign(legacy,{
        advanceRecord:views.advance,shortArray:(p,n)=>views.array('short',p,n),
        pointerDifference:(a,b,type)=>BigInt((environment.address(a)-environment.address(b))/ctypes.size(type)),
        copyRecord:(to,from,n)=>memory.memmove(environment.address(to),environment.address(from),Number(n)),
        Role_if:n=>Number(legacy.gu.urole.mnum===n),
        rngCaller:(line,caller)=>{if(services.rng_log_enabled())services.rng_log_set_caller(services.literal('artifact.c'),line,services.literal(caller));},
        mksobj:(...args)=>object(environment.resolve('mksobj')(...args)),
        oname:(...args)=>object(environment.resolve('oname')(...args)),
    });
    Object.assign(legacy.sizes,{short:ctypes.size('short'),arti_info:ctypes.size('struct arti_info')});
    legacy.zero_artiexist=views.record('struct arti_info',environment.allocateGlobal('zero_artiexist',ctypes.size('struct arti_info')));
    environment.extend('artifact-properties',Object.fromEntries(['mk_artifact','exist_artifact','artifact_exists','artifact_origin','artifact_light'].map(name=>[name,artifact[name]])));
    const name=Object.create(legacy);
    Object.assign(name,layouts.do_name,{
        charPointer:p=>typeof p==='string'?services.literal(p):environment.address(p),
        strlen:p=>BigInt(services.strlen(p)),Strcpy:(...args)=>services.strcpy(...args),
        carried:o=>Number(o.where===layouts.do_name.OBJ_INVENT),
        sir_Terry_novels:sir_Terry_novels.map(s=>services.literal(s)),
        rn2:(n,line,caller)=>{if(services.rng_log_enabled())services.rng_log_set_caller(services.literal('do_name.c'),line,services.literal(caller));return services.rn2(n);},
    });
    for(const key of ['uwep','uswapwep'])Object.defineProperty(name,key,{get:()=>object(ctypes.load('struct obj *',environment.requireGlobal(key)))});
    environment.register('item-naming',{oname,noveltitle},name,{prepareArgs:(fn,args)=>{
        if(fn==='oname')args[0]=object(args[0]);
        else if(args[0]){const p=environment.address(args[0]);args[0]=Object.defineProperty({address:p},'value',{get:()=>transport.read('Int32',p),set:v=>transport.write('Int32',p,v)});}
        return args;
    }});
    const naming=new Proxy(Object.create(services),{get:(o,k,r)=>Reflect.has(o,k)?Reflect.get(o,k,r):typeof k==='string'?(...args)=>environment.resolve(k)(...args.map(v=>v?.address??v)):undefined}),buffers=environment.allocateGlobal('objnam.obufs',layouts.objnam.NUMOBUF*layouts.objnam.BUFSZ);
    const statics=Object.fromEntries(Object.entries(languageAbi.staticBuffers).map(([key,n])=>[key,environment.allocateGlobal('objnam.'+key,n)]));
    Object.assign(naming,{Strlen_:(...args)=>environment.strutil('Strlen_',...args),staticStorage:name=>{if(!Object.hasOwn(statics,name))throw new Error('Unknown OBJNAM static '+name);return statics[name];},moduleKey:environment,global:i=>environment.requireGlobal(languageAbi.globals[i]),getBit:(p,i)=>{const[t,k]=languageAbi.bits[i];return ctypes.getField(t,environment.address(p),k,'unsigned int');},setBit:(p,i,v)=>{const[t,k]=languageAbi.bits[i];return ctypes.setField(t,environment.address(p),k,'unsigned int',v);},alloc:n=>environment.alloc('alloc',n),dupstr:p=>environment.alloc('dupstr',typeof p==='string'?services.literal(p):environment.address(p)),heap:()=>memory.HEAPU8,storage:i=>{if(i!==0)throw new Error('Unknown OBJNAM storage '+i);return buffers;}});
    environment.register('japanese-item-names',Object.fromEntries(['Japanese_item_name','makesingular','fruit_from_name','fruit_from_indx'].map(name=>[name,(...args)=>{const result=callObjnam(naming,layouts.objnam,name,...args);return result?.address??result;}])));
    return {limitation:'Construction-time naming and random artifact bookkeeping; role/race-specific gifts, wielded artifact effects and naming UI require their actual owners.'};
}
