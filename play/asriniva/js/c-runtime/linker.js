// Synchronous symbols, globals, initialization and calls for translated C.
// Application declarations and dependency scope are supplied by the provider.
import {address} from './memory.js';
export function createLinker({memory,transport,functions,services,ctypes,prototypes={},withEnvironment,resolveFunction}) {
    const modules=new Map(),owners=new Map(),globals=new Map();
    const deferredFunctions=new Map(),symbolPointers=new Map();
    function functionPointer(name,signature,invoke) {
        const previous=symbolPointers.get(name);
        if(previous){if(previous.signature!==signature)throw new Error('Conflicting C function prototype '+name);return previous.id;}
        const callback=invoke??((...args)=>(resolveFunction??resolve)(name)(...args));
        // A named callback can expose its initialized native implementation at
        // the boundary where a game model adopts its stable function identity.
        // Explicit callback overrides keep their own normalization/semantics.
        if(!invoke){
            const nativeEntry=prepare=>{const module=owners.get(name),entry=prepare&&module?start(module):modules.get(module),fn=entry?.namespace[name];return entry?.status==='ready'&&fn?.nativeDirect&&(!entry.prepareArgs||fn.nativePrepared)?fn:undefined;};
            Object.defineProperties(callback,{nativeEntry:{get:()=>nativeEntry(false)},prepareNativeEntry:{value:()=>nativeEntry(true)}});
        }
        const id=functions.functionPointer(callback,signature);
        symbolPointers.set(name,{id,signature});return id;
    }
    function publishFunction(module,name){
        if(name in services)return;
        const entry=modules.get(module),invoke=(...args)=>invokeEntry(entry,module,name,args),prototype=prototypes[name];
        Object.defineProperty(invoke,'nativeEntry',{get(){const fn=entry.namespace[name];return fn?.nativeDirect?fn:undefined;}});
        if(prototype)Object.defineProperty(invoke,'address',{get(){
            const match=prototype.match(/^(.+?)\s*\((.*)\)$/);if(!match)throw new Error('Unknown C function address prototype '+name);
            const args=[];let depth=0,start=0;for(let i=0;i<match[2].length;i++){const ch=match[2][i];if(ch==='('||ch==='[')depth++;else if(ch===')'||ch===']')depth--;else if(ch===','&&!depth){args.push(match[2].slice(start,i).trim());start=i+1;}}args.push(match[2].slice(start).trim());
            const code=t=>{t=ctypes.canonical(t);if(t.includes('*')||t.includes('['))return'p';if(t==='void')return'v';if(t==='...')throw new Error('Variadic C callback address requires an explicit ABI '+name);if(t==='double')return'd';if(t==='float')return'f';if(t.startsWith('struct ')||t.startsWith('union '))throw new Error('C aggregate callback address requires an explicit ABI '+name);return ctypes.size(t)===8?'j':'i';};
            return functionPointer(name,[match[1],...args.filter(t=>t&&t!=='void')].map(code).join(''));
        }});
        services[name]=invoke;
    }
    function deferFunctions(module,namespace){for(const [name,callback]of Object.entries(namespace)){const candidates=deferredFunctions.get(name)??new Map();candidates.set(module,callback);deferredFunctions.set(name,candidates);}}
    function resolve(name){
        if(!owners.has(name)){
            const candidates=deferredFunctions.get(name);
            if(candidates?.size>1)throw new Error('Ambiguous standalone public symbol '+name);
            if(candidates?.size===1){const [module,callback]=candidates.entries().next().value;extend(module,{[name]:callback});}
        }
        const owner=owners.get(name);if(!owner)throw new Error('Unresolved standalone function '+name);const entry=modules.get(owner);return (...args)=>invokeEntry(entry,owner,name,args);
    }
    function extend(name,namespace) {
        const entry=modules.get(name);if(!entry)throw new Error('Unknown standalone module '+name);
        const exports=Object.entries(namespace);
        for(const [fn,value]of exports)if(typeof value!=='function'||owners.has(fn))throw new Error('Duplicate or invalid standalone export '+fn);
        for(const [fn,value]of exports){entry.namespace[fn]=value;owners.set(fn,name);publishFunction(name,fn);}
    }
    function register(name,namespace,environment=services,{initialize,dependencies=[],prepareArgs}={}) {
        if(modules.has(name))throw new Error('Duplicate standalone module '+name);
        const exports=Object.entries(namespace).filter(([,v])=>typeof v==='function');
        for(const [fn] of exports)if(owners.has(fn))throw new Error('Ambiguous standalone symbol '+fn);
        const entry={namespace,environment,initialize,dependencies,prepareArgs,status:'registered'};modules.set(name,entry);
        for(const [fn] of exports){owners.set(fn,name);publishFunction(name,fn);}
        return entry;
    }
    function start(name) {
        const entry=modules.get(name);if(!entry)throw new Error('Unresolved standalone module '+name);
        if(entry.status==='ready'||entry.status==='initializing')return entry;
        entry.status='initializing';
        try{for(const dep of entry.dependencies)start(dep);if(entry.initialize)transport.scoped(()=>withEnvironment(entry.environment,entry.initialize));entry.status='ready';return entry;}
        catch(error){entry.status='failed';throw error;}
    }
    function invokeEntry(entry,name,fn,args) {
        if(entry.status!=='ready')start(name);
        const callback=entry.namespace[fn];
        if(typeof callback!=='function')throw new Error('Unknown standalone function '+name+'.'+fn);
        if(callback.nativeDirect&&(!entry.prepareArgs||callback.nativePrepared)){
            const result=callback(...args);
            if(result&&typeof result.then==='function')throw new TypeError('C calls must be synchronous');
            return result;
        }
        return transport.scoped(()=>withEnvironment(entry.environment,callback,...(entry.prepareArgs?entry.prepareArgs(fn,args):args)));
    }
    function call(name,fn,...args) {return invokeEntry(start(name),name,fn,args);}
    function allocateGlobal(name,size,initial) {
        if(globals.has(name))throw new Error('Duplicate standalone global '+name);
        const at=memory.calloc(1,size);if(!at)throw new RangeError('Global allocation failed');
        if(initial) {if(initial.length>size){memory.free(at);throw new RangeError('Global initializer too large');}memory.HEAPU8.set(initial,at);}
        globals.set(name,at);return at;
    }
    const requireGlobal=name=>{if(!globals.has(name))throw new Error('Unresolved standalone global '+name);return globals.get(name);};
    function linkGlobal(name,pointer) {
        if(globals.has(name))throw new Error('Duplicate standalone global alias '+name);
        globals.set(name,address(pointer));
    }
    return {functionPointer,deferFunctions,resolve,extend,register,start,call,
        allocateGlobal,requireGlobal,linkGlobal,
        hasFunction:name=>owners.has(name),
        status:()=>Object.fromEntries([...modules].map(([k,v])=>[k,v.status])),
    };
}
