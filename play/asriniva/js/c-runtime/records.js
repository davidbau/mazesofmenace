// Common live-record identity and indexed-view machinery. Declarations supply
// field semantics; callers choose explicit array policies for legacy contracts.
export function createRecordStore({memory,address,describe,createView,fieldDescriptor,decorate}) {
    const cache=new Map(),definitions=new WeakMap();
    function record(type,pointer) {
        const at=address(pointer);if(!at)return 0;
        const definition=describe(type),key=definition.type+':'+at;
        if(cache.has(key))return cache.get(key);
        memory.bounds(at,definition.size);
        const view=createView(definition,at);
        cache.set(key,view);definitions.set(view,definition);
        for(const [name,field]of Object.entries(definition.fields))
            Object.defineProperty(view,name,fieldDescriptor(type,at,name,field));
        if(decorate)decorate(view,definition);
        return view;
    }
    return {record,advance(view,n) {
        const definition=definitions.get(view);
        if(!definition)throw new TypeError('Unrecognized measured record view');
        return record(definition.type,view.address+Number(n)*definition.size);
    }};
}

export function createArrayView(target,{read,write,allowLeadingZeroes=false,onePast}) {
    const length=target.length;
    const pattern=allowLeadingZeroes?/^\d+$/:/^(0|[1-9]\d*)$/;
    const index=key=>typeof key==='string'&&pattern.test(key)?Number(key):null;
    return new Proxy(target,{
        get(object,key) {
            const i=index(key);if(i===null)return Reflect.get(object,key);
            if(i>=length){if(i===length&&onePast)return onePast(i);throw new RangeError('C array bounds');}
            return read(i);
        },
        set(object,key,value) {
            const i=index(key);if(i===null)return Reflect.set(object,key,value);
            if(i>=length)throw new RangeError('C array bounds');
            write(i,value);return true;
        },
    });
}
