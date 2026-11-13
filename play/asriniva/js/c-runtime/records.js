// Common live-record identity and indexed-view machinery. Declarations supply
// field semantics; callers choose explicit array and publication profiles.
export function createRecordStore({memory,address,describe,createView,fieldDescriptor,decorate,
    cache=new Map(),cacheKey,initialize,finalize,publish='early',checked=true,trackDefinitions=true,reuseArguments=false}) {
    const definitions=trackDefinitions?new WeakMap():null;
    const argumentViews=reuseArguments?new WeakMap():null;
    function record(type,pointer) {
        const at=address(pointer);if(!at)return 0;
        let definition,key;
        if(cacheKey){key=cacheKey(type,at);if(cache?.has(key))return cache.get(key);}
        definition=describe(type);
        if(!cacheKey){key=definition.type+':'+at;if(cache?.has(key))return cache.get(key);}
        if(checked)memory.bounds(at,definition.size);
        const view=createView(definition,at);
        if(cache&&publish==='early')cache.set(key,view);
        if(definitions)definitions.set(view,definition);
        if(argumentViews)argumentViews.set(view,{type:definition.type,at});
        if(initialize)initialize(view,definition,at);
        else for(const [name,field]of Object.entries(definition.fields))
            Object.defineProperty(view,name,fieldDescriptor(type,at,name,field));
        if(decorate)decorate(view,definition);
        const result=finalize?finalize(view,definition,at):view;
        if(cache&&publish!=='early')cache.set(key,result);
        return result;
    }
    return {record,argument(type,pointer) {
        const entry=argumentViews?.get(pointer);
        if(entry&&entry.type===type){
            const at=address(pointer);
            if(at===entry.at)return pointer;
            return record(type,at);
        }
        return record(type,pointer);
    },advance(view,n) {
        const definition=definitions?.get(view);
        if(!definition)throw new TypeError('Unrecognized measured record view');
        return record(definition.type,view.address+Number(n)*definition.size);
    }};
}

export function createArrayView(target,{read,write,allowLeadingZeroes=false,onePast,
    checked=true,length:declaredLength,exposeLength=false,reflectMissingWriter=false,fallbackRead,fallbackWrite,
    propertyCount,cacheReads=false}) {
    const length=declaredLength!==undefined?declaredLength:checked?target.length:undefined;
    const pattern=allowLeadingZeroes?/^\d+$/:/^(0|[1-9]\d*)$/;
    const index=key=>typeof key==='string'&&pattern.test(key)?Number(key):null;
    const handler={
        get(object,key) {
            if(exposeLength&&key==='length')return length;
            const i=index(key);if(i===null)return fallbackRead?fallbackRead(object,key):Reflect.get(object,key);
            if(checked&&i>=length){if(i===length&&onePast)return onePast(i);throw new RangeError('C array bounds');}
            return read(i);
        },
        set(object,key,value) {
            const i=index(key);if(i===null)return fallbackWrite?fallbackWrite(object,key,value):Reflect.set(object,key,value);
            if(!write&&reflectMissingWriter)return Reflect.set(object,key,value);
            if(checked&&i>=length)throw new RangeError('C array bounds');
            write(i,value);return true;
        },
    };
    if(propertyCount===undefined)return new Proxy(target,handler);
    if(!Number.isSafeInteger(propertyCount)||propertyCount<0||fallbackRead||fallbackWrite||reflectMissingWriter)
        throw new TypeError('Unsupported fixed C array projection');
    // Fixed inline storage can expose ordinary indexed accessors. Unusual keys
    // still use the original pointer-index semantics through the prototype.
    // cacheReads is only for address projections of inline records/arrays;
    // scalar and pointer values must always be reloaded.
    const inherited=Object.getPrototypeOf(target);
    Object.setPrototypeOf(target,new Proxy(inherited??Object.create(null),{
        get(object,key,receiver){
            if(exposeLength&&key==='length')return length;
            const i=index(key);
            return i===null?Reflect.get(object,key,receiver):handler.get(target,key);
        },
        set(object,key,value,receiver){
            const i=index(key);
            return i===null?Reflect.set(object,key,value,receiver):handler.set(target,key,value);
        },
    }));
    for(let i=0;i<propertyCount;i++){
        let ready=false,cached;
        Object.defineProperty(target,String(i),{configurable:true,
            get:checked&&i>=length?()=>handler.get(target,String(i)):cacheReads?()=>{
                if(!ready){cached=read(i);ready=true;}return cached;
            }:()=>read(i),
            set:value=>{if(checked&&i>=length)throw new RangeError('C array bounds');write(i,value);},
        });
    }
    return target;
}
