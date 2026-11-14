import {connectNativeDungeonWindows} from './native/dungeon-window-callbacks.js';
import {connectNativeDisplayWindows} from './native/display-window-callbacks.js';
import {nativeStateFor} from './native/state-bridge.js';
import {compileNativeFieldPlans} from './native/address-fields.js';
import {createAddressBindings} from '../c-runtime/address-bindings.js';
// Existing address-based adapters on standalone storage, with real JS symbol
// resolution. Missing game functions remain explicit link errors, never stubs.
import publicFunctions from './public-functions.json' with {type:'json'};
import metadata from './address-ports.json' with {type:'json'};
import callbackAbi from './callback-address-abi.json' with {type:'json'};
import * as mklev from '../ported/mklev.js';
import {callMklev} from './bindings/mklev.js';
import * as mkmaze from '../ported/mkmaze.js';
import {callMkmaze} from './bindings/mkmaze.js';
import * as pickup from '../ported/pickup.js';
import {callPickup} from './bindings/pickup.js';
import * as shk from '../ported/shk.js';
import {callShk} from './bindings/shk.js';
import * as invent from '../ported/invent.js';
import {callInvent} from './bindings/invent.js';
import * as dothrow from '../ported/dothrow.js';
import {callDothrow} from './bindings/dothrow.js';
import * as display from '../ported/display.js';
import {callDisplay} from './bindings/display.js';
import * as dungeon from '../ported/dungeon.js';
import {callDungeon} from './bindings/dungeon.js';
import * as mkobj from '../ported/mkobj.js';
import {createMkobjEnvironment} from './bindings/mkobj.js';
import * as muse from '../ported/muse.js';
import {createMuseEnvironment} from './bindings/muse.js';
import * as pray from '../ported/pray.js';
import {createPrayEnvironment} from './bindings/pray.js';
import * as detect from '../ported/detect.js';
import {createDetectEnvironment} from './bindings/detect.js';
import * as spLev from '../ported/sp_lev.js';
import {callSpLev} from './bindings/sp_lev.js';
import {withCEnvironment} from '../c-runtime/context.js';
const ports={mklev:[mklev,callMklev],mkmaze:[mkmaze,callMkmaze],pickup:[pickup,callPickup],shk:[shk,callShk],invent:[invent,callInvent],dothrow:[dothrow,callDothrow],display:[display,callDisplay],dungeon:[dungeon,callDungeon],
    mkobj:[mkobj,createMkobjEnvironment,'factory'],muse:[muse,createMuseEnvironment,'factory'],pray:[pray,createPrayEnvironment,'factory'],detect:[detect,createDetectEnvironment,'factory'],sp_lev:[spLev,(s,l,n,...a)=>callSpLev(s,l,spLev,n,...a),'layout']};
export function enableAddressPort(environment,name,{only,definition:providedDefinition,adapter:providedAdapter,ctypes:providedTypes,backingAddresses={},nativeRuntime=false}={}) {
    const definition=providedDefinition??metadata.ports[name],pair=providedAdapter??ports[name];if(!definition||!pair)throw new Error('Unsupported address adapter '+name);
    const {schema,layout}=definition,{services,transport}=environment,ctypes=providedTypes??environment.ctypes;
    const nativeState=nativeStateFor(environment),namespace=pair[0],bridge=pair[1];
    const nativeMode=nativeRuntime||(!providedDefinition&&!providedAdapter&&!providedTypes&&pair===ports[name]);
    const backings=(schema.statics??schema.backings??[]).map(row=>Object.hasOwn(backingAddresses,row.name)?environment.address(backingAddresses[row.name]):environment.allocateGlobal(name+'.'+row.name,ctypes.size(row.type)));
    if(['muse','pray'].includes(name))backings.push(environment.allocateGlobal(name+'.localStrings',Math.max(1,...schema.localStatics.map(r=>r.offset+r.bytes))));
    if(name==='detect')backings.push(environment.allocateGlobal('detect.dummytrap',ctypes.size('struct trap')));
    const binding=createAddressBindings({environment,name,schema,layout,namespace,backings,ctypes,
        publicFunctions,callbackTypes:callbackAbi.ports[name]?.functionTypes,
        fallbackSignatures:{mkroom_cmp:'ipp',rn2_on_display_rng:'ii'},
        indirectCalls:{callObject:'ipp',callMonster:'ipp',callBuzz:'viiiiii',callCursor:'vii',callWindow:'vii',callRng:'ii'},
        resolveFunction:fn=>nativeState.functions.get(fn),
        nativeOwner:nativeMode?nativeState:undefined,
        bind:key=>bind(key),
    });
    const local=binding.services,keys=binding.layout,resolve=binding.resolve;
    if(nativeMode&&name==='display')local.nativeEnvironment=environment;
    if(nativeMode&&name==='display')connectNativeDisplayWindows(environment,local,schema);
    if(nativeMode&&name==='dungeon')connectNativeDungeonWindows(environment,local,schema);
    local.nativeFieldPlans=compileNativeFieldPlans(environment,schema,ctypes);
    if(nativeMode){local.nativeOwner=nativeState;local.nativeModuleName=name;local.stackSave=()=>nativeState.depth?undefined:transport.stackSave();local.stackRestore=saved=>{if(saved!==undefined)transport.stackRestore(saved);};}
    let nativeInitialized=false;
    let factoryEnvironment;
    if(only)for(const key of only)if(typeof namespace[key]!=='function')throw new Error('Unknown address adapter export '+name+'.'+key);
    const calls=new Map();
    const bind=key=>{if(calls.has(key))return calls.get(key);const rawCall=(...args)=>{
        for(let i=0;i<args.length;i++)if(args[i]&&args[i].address!==undefined)args[i]=args[i].address;
        // The native MKOBJ public entries receive addresses, not record carriers.
        if(name==='mkobj'){const prototype=schema.functionTypes?.[key];if(!prototype)throw new Error('Missing MKOBJ native prototype '+key);const match=prototype.match(/\((.*)\)$/);if(!match)throw new Error('Unknown MKOBJ native prototype '+key);const params=match[1].split(',').map(type=>ctypes.canonical(type.trim()));args=args.map((value,i)=>params[i]?.includes('*')?(typeof value==='string'&&/char\s*\*/.test(params[i])?services.literal(value):environment.address(value)):value);}
        if(pair[2]==='layout')return bridge(local,layout,key,...args);
        if(pair[2]==='factory'){factoryEnvironment??=bridge(local,layout,namespace);return factoryEnvironment.nativeNamespace?factoryEnvironment.nativeNamespace[key](...args):withCEnvironment(factoryEnvironment,namespace[key],...args);}
        return bridge(local,key,...args);
    };let started=false;const call=(...args)=>{if(!started){environment.startModule(name);started=true;}if(!nativeMode){const saved=transport.stackSave();try{return nativeState.boundary(rawCall,...args);}finally{transport.stackRestore(saved);}}const saved=nativeState.depth?undefined:transport.stackSave();nativeState.enter();try{if(!nativeInitialized){const value=nativeState.boundary(rawCall,...args);nativeInitialized=true;return value;}return rawCall(...args);}finally{try{nativeState.leave();}finally{if(saved!==undefined)transport.stackRestore(saved);}}};call.nativeState=nativeState;call.nativeDirect=true;calls.set(key,call);return call;};
    const wrappers=Object.fromEntries(Object.entries(namespace).filter(([key,fn])=>typeof fn==='function'&&(!only||only.includes(key))&&!/StaticInitializers$/.test(key)&&(!schema.functionTypes||Object.hasOwn(schema.functionTypes,key))).map(([key])=>[key,bind(key)]));
    environment.register(name,wrappers,local);
    for(const[key,call]of Object.entries(wrappers))nativeState.functions.set(key,call);
    environment.deferFunctions(name,Object.fromEntries(Object.keys(publicFunctions.functions).filter(fn=>typeof namespace[fn]==='function'&&!Object.hasOwn(wrappers,fn)).map(fn=>[fn,bind(fn)])));
    return{
        services:local,layout:keys,
        expose:names=>{for(const key of names)if(typeof namespace[key]!=='function')throw new Error('Unknown '+name+' export '+key);const extra=Object.fromEntries(names.map(key=>[key,bind(key)]));environment.extend(name,extra);for(const[key,call]of Object.entries(extra))nativeState.functions.set(key,call);},
        unresolved:()=>Object.keys(schema.dependencies??{}).filter(fn=>{try{resolve(fn);return false;}catch{return true;}}),
        limitation:'Adapter transport only until the complete game dependency closure and original component tests pass.',
    };
}
