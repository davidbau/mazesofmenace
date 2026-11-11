// Lazy measured record/array projections for existing property-style adapters.
// Only C memory transport lives here; no game initialization or policy.
export function createRecordViews(environment) {
    const {ctypes,memory}=environment,cache=new Map();
    function value(type,p) {
        type=ctypes.canonical(type);p=environment.address(p);
        const array=type.match(/^(.*?)\[(\d+)\](.*)$/);
        if(array){const child=array[1]+array[3],length=Number(array[2]),stride=ctypes.size(child);return new Proxy({address:p,length},{
            get(o,k){if(typeof k!=='string'||!/^\d+$/.test(k))return Reflect.get(o,k);const i=Number(k);if(i>=length)throw new RangeError('C array bounds');return value(child,p+i*stride);},
            set(o,k,v){if(typeof k!=='string'||!/^\d+$/.test(k))return Reflect.set(o,k,v);const i=Number(k);if(i>=length)throw new RangeError('C array bounds');ctypes.store(child,p+i*stride,v);return true;},
        });}
        if(type.endsWith('*')){
            const target=type.slice(0,-1).trim(),ptr=ctypes.load(type,p);
            try{ctypes.record(target);}catch{return Number(ptr);}
            return record(target,ptr);
        }
        try{ctypes.record(type);}catch{return ctypes.load(type,p);}
        return record(type,p);
    }
    function record(type,p) {
        p=environment.address(p);if(!p)return 0;
        const definition=ctypes.record(type),key=definition.type+':'+p;
        if(cache.has(key))return cache.get(key);
        memory.bounds(p,definition.size);const view={address:p};cache.set(key,view);
        for(const [name,field]of Object.entries(definition.fields)){
            const scalar=field.ctype.replace(new RegExp('\\s+'+name+'$'),'');
            Object.defineProperty(view,name,{enumerable:true,
                get:()=>field.bits!==undefined?ctypes.getField(type,p,name,scalar):value(field.record??scalar,p+field.offset),
                set:v=>{if(typeof v==='string'&&scalar.includes('*'))v=environment.services.literal(v);if(field.record)memory.memmove(p+field.offset,environment.address(v),ctypes.record(field.record).size);else ctypes.setField(type,p,name,scalar,v);},
            });
        }
        return view;
    }
    return {record,value,array:(type,p,length)=>value(type+'['+length+']',p)};
}
