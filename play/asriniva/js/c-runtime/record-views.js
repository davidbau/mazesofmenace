import {createRecordStore,createArrayView} from './records.js';
// Lazy measured record/array projections for existing property-style adapters.
// Only C memory transport lives here; no game initialization or policy.
export function createRecordViews(environment,fieldAliases={}) {
    const {ctypes,memory}=environment;
    function value(type,p) {
        type=ctypes.canonical(type);p=environment.address(p);
        const array=type.match(/^(.*?)\[(\d+)\](.*)$/);
        if(array){const child=array[1]+array[3],length=Number(array[2]),stride=ctypes.size(child);return createArrayView({address:p,length},{
            allowLeadingZeroes:true,
            read:i=>value(child,p+i*stride),
            write:(i,v)=>ctypes.store(child,p+i*stride,v),
            onePast:i=>{try{ctypes.record(child);}catch{throw new RangeError('C array bounds');}return Object.freeze({address:p+i*stride});},
        });}
        if(type.endsWith('*')){
            const target=type.slice(0,-1).trim(),ptr=ctypes.load(type,p);
            try{ctypes.record(target);}catch{return ptr<=BigInt(Number.MAX_SAFE_INTEGER)?Number(ptr):ptr;}
            return record(target,ptr);
        }
        try{ctypes.record(type);}catch{return ctypes.load(type,p);}
        return record(type,p);
    }
    const records=createRecordStore({memory,address:environment.address,
        describe:type=>ctypes.record(type),
        createView:(definition,p)=>{
            const view={address:p};
            Object.defineProperty(view,Symbol.toPrimitive,{value:()=>p});
            return view;
        },
        fieldDescriptor(type,p,name,field) {
            const scalar=field.ctype.replace(new RegExp('\\s+'+name+'$'),'');
            return {enumerable:true,
                get:()=>field.bits!==undefined?ctypes.getField(type,p,name,scalar):value(field.record??scalar,p+field.offset),
                set:v=>{if(typeof v==='string'&&scalar.includes('*'))v=environment.services.literal(v);if(field.record)memory.memmove(p+field.offset,environment.address(v),ctypes.record(field.record).size);else ctypes.setField(type,p,name,scalar,v);},
            };
        },
        decorate(view,definition) {
        const aliases=fieldAliases[definition.type]??{};
        for(const [alias,name]of Object.entries(aliases))if(name in view&&!(alias in view))Object.defineProperty(view,alias,{get:()=>view[name],set:v=>{view[name]=v;}});
        },
    });
    const {record}=records;
    return {record,value,array:(type,p,length)=>value(type+'['+length+']',p),advance:records.advance};
}
