// Existing address-based adapters on standalone storage, with real JS symbol
// resolution. Missing game functions remain explicit link errors, never stubs.
import metadata from './address-ports.json' with {type:'json'};
import * as mklev from '../ported/mklev.js';
import {callMklev} from '../ported/mklev-runtime.js';
import * as mkmaze from '../ported/mkmaze.js';
import {callMkmaze} from '../ported/mkmaze-runtime.js';
import * as pickup from '../ported/pickup.js';
import {callPickup} from '../ported/pickup-runtime.js';
import * as shk from '../ported/shk.js';
import {callShk} from '../ported/shk-runtime.js';
import * as invent from '../ported/invent.js';
import {callInvent} from '../ported/invent-runtime.js';
import * as dothrow from '../ported/dothrow.js';
import {callDothrow} from '../ported/dothrow-runtime.js';
import * as display from '../ported/display.js';
import {callDisplay} from '../ported/display-runtime.js';
import * as dungeon from '../ported/dungeon.js';
import {callDungeon} from '../ported/dungeon-runtime.js';
import * as mkobj from '../ported/mkobj.js';
import {createMkobjEnvironment} from '../ported/mkobj-runtime.js';
import * as muse from '../ported/muse.js';
import {createMuseEnvironment} from '../ported/muse-runtime.js';
import * as pray from '../ported/pray.js';
import {createPrayEnvironment} from '../ported/pray-runtime.js';
import * as detect from '../ported/detect.js';
import {createDetectEnvironment} from '../ported/detect-runtime.js';
import * as spLev from '../ported/sp_lev.js';
import {callSpLev} from '../ported/sp_lev-runtime.js';
import {withCEnvironment} from '../ported/c-runtime.js';
const ports={mklev:[mklev,callMklev],mkmaze:[mkmaze,callMkmaze],pickup:[pickup,callPickup],shk:[shk,callShk],invent:[invent,callInvent],dothrow:[dothrow,callDothrow],display:[display,callDisplay],dungeon:[dungeon,callDungeon],
    mkobj:[mkobj,createMkobjEnvironment,'factory'],muse:[muse,createMuseEnvironment,'factory'],pray:[pray,createPrayEnvironment,'factory'],detect:[detect,createDetectEnvironment,'factory'],sp_lev:[spLev,(s,l,n,...a)=>callSpLev(s,l,spLev,n,...a),'layout']};
export function enableAddressPort(environment,name,{only}={}) {
    const definition=metadata.ports[name],pair=ports[name];if(!definition||!pair)throw new Error('Unsupported address adapter '+name);
    const {schema,layout}=definition,{services,ctypes,transport}=environment;
    const namespace=pair[0],bridge=pair[1],local=Object.create(services),records=Object.keys(schema.schema);
    const backings=(schema.statics??schema.backings??[]).map(row=>environment.allocateGlobal(name+'.'+row.name,ctypes.size(row.type)));
    if(['muse','pray'].includes(name))backings.push(environment.allocateGlobal(name+'.localStrings',Math.max(1,...schema.localStatics.map(r=>r.offset+r.bytes))));
    if(name==='detect')backings.push(environment.allocateGlobal('detect.dummytrap',ctypes.size('struct trap')));
    const keys=schema.layoutKeys?Object.fromEntries(schema.layoutKeys.map((key,i)=>[key,BigInt(layout[i])])):layout;
    const resolve=fn=>{
        if(typeof services[fn]==='function')return services[fn];
        return environment.resolve(fn);
    };
    function field(kind,at,index) {
        const key=records[kind],record=schema.schema[key],f=record?.fields[index];
        if(!f)throw new Error('Unknown '+name+' C field '+kind+':'+index);
        return{type:record.ctype,f,at};
    }
    const globals=schema.globals.map(g=>g.name);
    Object.assign(local,{
        layout:i=>{if(layout[i]===undefined)throw new Error('Unknown '+name+' layout index '+i);return BigInt(layout[i]);},
        global:i=>{if(i>=globals.length){const p=backings[i-globals.length];if(!p)throw new Error('Unknown '+name+' backing index '+i);return p;}const key=globals[i];if(!key)throw new Error('Unknown '+name+' global index '+i);return environment.requireGlobal(key);},
        storage:i=>{if(!backings[i])throw new Error('Unknown '+name+' static index '+i);return backings[i];},
        address:(kind,at,i)=>{const f=field(kind,at,i);if(f.f.bit)throw new Error('C bitfields have no address');return ctypes.locate(f.type,at,f.f.name).at;},
        read:(kind,at,i)=>{const f=field(kind,at,i);return ctypes.getField(f.type,at,f.f.name,f.f.canonical);},
        write:(kind,at,i,value)=>{const f=field(kind,at,i);return ctypes.setField(f.type,at,f.f.name,f.f.canonical,value);},
        copyRecord:(to,from,bytes)=>environment.memory.memmove(environment.address(to),environment.address(from),Number(bytes)),
        staticString:(at,text,bytes)=>{const data=Uint8Array.from(text,c=>c.charCodeAt(0));if(data.length>=bytes)throw new Error('Static string extent mismatch');environment.memory.memset(at,0,bytes);environment.memory.HEAPU8.set(data,at);},
    });
    const signature=(result,args)=>[result,...args].map(t=>t.includes('*')?'p':t==='void'?'v':/\b(double|float)\b/.test(t)?'d':/\blong\b/.test(t)?'j':'i').join('');
    function prototypeSignature(prototype) {
        prototype=prototype.replace(/\s*__attribute__.*$/,'');
        const match=prototype.match(/^(.+?)\s*(?:\(\s*\*\s*\))?\s*\((.*)\)$/);
        if(!match)throw new Error('Unrecognized C callback prototype '+prototype);
        const args=match[2].split(',').map(t=>t.trim()).filter(t=>t!=='void'&&t!==''&&t!=='...');
        return signature(ctypes.canonical(match[1].trim()),args.map(ctypes.canonical));
    }
    const pointerIds=new Map();
    const pointer=fn=>{
        if(pointerIds.has(fn))return pointerIds.get(fn);
        const prototype=schema.functionPointers?.[fn],info=schema.dependencies?.[fn],sig=prototype?prototypeSignature(prototype):info?signature(info.ret,info.params.map(p=>p.canonical??p.type)):({mkroom_cmp:'ipp'})[fn];
        // Owned comparator signatures are checked by the indirect-call adapter;
        // non-comparator owned callback types need an explicit schema entry.
        if(!sig)throw new Error('Missing callback signature '+name+'.'+fn);
        const id=environment.functions.functionPointer((...args)=>resolve(fn)(...args),sig);pointerIds.set(fn,id);return id;
    };
    local.ownedFunctionPointer=i=>pointer(schema.ownedFunctionPointers[i]);
    local.nativeFunctionPointer=i=>pointer(schema.nativeFunctionPointers[i]);
    local.functionPointers=Object.fromEntries(Object.keys(schema.functionPointers??{}).map(fn=>[fn,()=>pointer(fn)]));
    for(const [method,sig]of Object.entries({callObject:'ipp',callMonster:'ipp',callBuzz:'viiiiii',callCursor:'vii',callWindow:'vii',callRng:'ii'}))local[method]=(fn,...args)=>environment.functions.indirect(fn,sig,...args);
    for(const [i,prototype]of (schema.callbackTypes??[]).entries())local['call'+i]=(fn,...args)=>environment.functions.indirect(fn,prototypeSignature(prototype),...args);
    for(const row of schema.variadics??[])local['var'+row.site]=(...args)=>resolve(row.function)(...args);
    for(const row of schema.dynamicVariadics??[])for(const target of row.targets)local['dynamic'+row.site+'_'+target]=(...args)=>resolve(target)(...args);
    for(const row of schema.callbackCalls??[])local['indirect'+row.site]=(fn,...args)=>environment.functions.indirect(fn,signature(row.ret,row.types),...args);
    for(const [fn,info]of Object.entries(schema.dependencies??{}))local[fn]=(...args)=>{
        const value=resolve(fn)(...args);return info.ret.includes('*')?environment.address(value):value;
    };
    let factoryEnvironment;
    if(only)for(const key of only)if(typeof namespace[key]!=='function')throw new Error('Unknown address adapter export '+name+'.'+key);
    const wrappers=Object.fromEntries(Object.entries(namespace).filter(([key,fn])=>typeof fn==='function'&&(!only||only.includes(key))&&!/StaticInitializers$/.test(key)&&(!schema.functionTypes||Object.hasOwn(schema.functionTypes,key))).map(([key])=>[key,(...args)=>{
        if(pair[2]==='layout')return bridge(local,layout,key,...args);
        if(pair[2]==='factory'){factoryEnvironment??=bridge(local,layout,namespace);return withCEnvironment(factoryEnvironment,namespace[key],...args);}
        return bridge(local,key,...args);
    }]));
    environment.register(name,wrappers,local);
    return{
        services:local,layout:keys,
        unresolved:()=>Object.keys(schema.dependencies??{}).filter(fn=>{try{resolve(fn);return false;}catch{return true;}}),
        limitation:'Adapter transport only until the complete game dependency closure and original component tests pass.',
    };
}
