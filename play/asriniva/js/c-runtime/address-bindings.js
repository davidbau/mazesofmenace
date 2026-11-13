// Generic measured-schema transport for address-based translated functions.
// Application types, function declarations and module invocation are injected.
export function createAddressBindings({environment,name,schema,layout,namespace,backings,
    ctypes=environment.ctypes,publicFunctions,callbackTypes,fallbackSignatures={},indirectCalls={},resolveFunction,nativeOwner,bind}) {
    const {services,transport}=environment,local=Object.create(services),records=Object.keys(schema.schema);
    const keys=schema.layoutKeys?Object.fromEntries(schema.layoutKeys.map((key,i)=>[key,BigInt(layout[i])])):layout;
    const resolve=fn=>{
        const native=resolveFunction?.(fn);if(native)return native;
        if(typeof services[fn]==='function')return services[fn].nativeEntry??services[fn];
        const selected=environment.resolve(fn);return services[fn]?.nativeEntry??selected;
    };
    const invoke=(fn,args)=>{const selected=resolve(fn);return nativeOwner&&selected.nativeState!==nativeOwner&&!selected.nativeStateIndependent?nativeOwner.boundary(selected,...args):selected(...args);};
    const fieldDeclarations=new WeakMap();
    function field(kind,at,index) {
        const key=records[kind],record=schema.schema[key],f=record?.fields[index];
        if(!f)throw new Error('Unknown '+name+' C field '+kind+':'+index);
        let declaration=fieldDeclarations.get(f);
        if(!declaration||declaration.type!==record.ctype){declaration={type:record.ctype,f};fieldDeclarations.set(f,declaration);}
        return declaration;
    }
    const globals=schema.globals.map(g=>g.name);
    Object.assign(local,{
        layout:i=>{if(layout[i]===undefined)throw new Error('Unknown '+name+' layout index '+i);return BigInt(layout[i]);},
        global:i=>{if(i>=globals.length){const p=backings[i-globals.length];if(!p)throw new Error('Unknown '+name+' backing index '+i);return p;}const key=globals[i];if(!key)throw new Error('Unknown '+name+' global index '+i);return environment.requireGlobal(key);},
        storage:i=>{if(!backings[i])throw new Error('Unknown '+name+' static index '+i);return backings[i];},
        address:(kind,at,i)=>{const f=field(kind,at,i);if(f.f.bit)throw new Error('C bitfields have no address');return typeof ctypes.fieldAddress==='function'?ctypes.fieldAddress(f.type,at,f.f.name):ctypes.locate(f.type,at,f.f.name).at;},
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
        const prototype=schema.functionPointers?.[fn]??callbackTypes?.[fn]??publicFunctions.functions[fn],info=schema.dependencies?.[fn],sig=prototype?prototypeSignature(prototype):info?signature(info.ret,info.params.map(p=>p.canonical??p.type)):fallbackSignatures[fn];
        // Owned comparator signatures are checked by the indirect-call adapter;
        // non-comparator owned callback types need an explicit schema entry.
        if(!sig)throw new Error('Missing callback signature '+name+'.'+fn);
        const owned=schema.ownedFunctionPointers?.includes(fn)||typeof namespace[fn]==='function',canonical=Object.hasOwn(publicFunctions.functions,fn)&&environment.hasFunction(fn),id=environment.functionPointer(owned&&!Object.hasOwn(publicFunctions.functions,fn)?name+'::'+fn:fn,sig,owned&&!canonical?((...args)=>bind(fn)(...args)):undefined);pointerIds.set(fn,id);return id;
    };
    local.functionAddress=i=>{const fn=schema.functionAddresses?.[i];if(!fn)throw new Error('Unknown '+name+' function-address index '+i);return pointer(fn);};
    local.ownedFunctionPointer=i=>pointer(schema.ownedFunctionPointers[i]);
    local.nativeFunctionPointer=i=>pointer(schema.nativeFunctionPointers[i]);
    local.functionPointers=Object.fromEntries(Object.keys(schema.functionPointers??{}).map(fn=>[fn,()=>pointer(fn)]));
    for(const [method,sig]of Object.entries(indirectCalls))local[method]=(fn,...args)=>environment.functions.indirect(fn,sig,...args);
    for(const [i,prototype]of (schema.callbackTypes??[]).entries())local['call'+i]=(fn,...args)=>environment.functions.indirect(fn,prototypeSignature(prototype),...args);
    for(const row of schema.variadics??[])local['var'+row.site]=(...args)=>resolve(row.function)(...args);
    for(const row of schema.dynamicVariadics??[])for(const target of row.targets)local['dynamic'+row.site+'_'+target]=(...args)=>resolve(target)(...args);
    for(const row of schema.callbackCalls??[])local['indirect'+row.site]=(fn,...args)=>environment.functions.indirect(fn,signature(row.ret,row.types),...args);
    for(const row of schema.callbacks??[])local['cb'+row.site]=(fn,...args)=>environment.functions.indirect(fn,signature(ctypes.canonical(row.ret),row.types.map(ctypes.canonical)),...args);
    for(const [fn,info]of Object.entries(schema.dependencies??{})){
        const nativeRet=nativeOwner?ctypes.canonical(info.ret):undefined;
        const call=(...args)=>{const value=invoke(fn,args),ret=nativeRet??ctypes.canonical(info.ret);if(ret.includes('*'))return typeof value==='string'?services.literal(value):environment.address(value);if(['long','unsigned long','long long','unsigned long long'].includes(ret))return BigInt[ret.startsWith('unsigned')?'asUintN':'asIntN'](64,BigInt(value));return value;};
        if(nativeOwner){call.nativeState=nativeOwner;const direct=!nativeRet.includes('*')&&!['long','unsigned long','long long','unsigned long long'].includes(nativeRet);Object.defineProperty(local,fn,{configurable:true,enumerable:true,get(){const selected=direct?(resolveFunction?.(fn)??(typeof services[fn]==='function'?services[fn].nativeEntry??services[fn]:undefined)):undefined;return selected?.nativeState===nativeOwner?selected:call;},set(value){Object.defineProperty(local,fn,{value,writable:true,configurable:true,enumerable:true});}});}else local[fn]=call;
    }
    return {services:local,layout:keys,resolve};
}
