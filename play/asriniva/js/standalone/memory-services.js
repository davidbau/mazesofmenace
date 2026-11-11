// Standalone C ABI transport. No game policy or WebAssembly dependency.
const types = Object.freeze({Int8:1, Uint8:1, Int16:2, Uint16:2, Int32:4, Uint32:4,
    BigInt64:8, BigUint64:8, Float32:4, Float64:8, ptr:8});
export const address = value => {
    const result = Number(value?.address ?? value ?? 0);
    if (!Number.isSafeInteger(result) || result < 0) throw new RangeError('Unrepresentable C address');
    return result;
};
export function createMemoryServices(memory) {
    const stack = [], marks = new Set(), literals = new Map(), schemas = new Map(), views = new Map();
    let markSequence=0;
    const read = (kind, at) => {
        if (!(kind in types)) throw new TypeError('Unknown C scalar '+kind);
        at = address(at); memory.bounds(at,types[kind]);
        const value = memory.view['get'+(kind==='ptr'?'BigUint64':kind)](at,true);
        return kind==='ptr' ? address(value) : value;
    };
    const write = (kind, at, value) => {
        if (!(kind in types)) throw new TypeError('Unknown C scalar '+kind);
        at = address(at); memory.bounds(at,types[kind]);
        const raw = kind==='ptr' ? BigInt(address(value)) : kind.startsWith('Big') ? BigInt(value)
            : typeof value==='bigint'&&!kind.startsWith('Float')?Number(BigInt[kind.startsWith('Uint')?'asUintN':'asIntN'](types[kind]*8,value)):Number(value);
        memory.view['set'+(kind==='ptr'?'BigUint64':kind)](at,raw,true);
        return read(kind,at);
    };
    function schema(name) {
        const result = schemas.get(name);
        if (!result) throw new Error('Missing measured C schema '+name);
        return result;
    }
    function defineRecord(name, definition) {
        if(schemas.has(name)) throw new Error('Duplicate C schema '+name);
        if(!Number.isSafeInteger(definition.size)||definition.size<=0)throw new TypeError('Invalid C record size');
        const fields = structuredClone(definition.fields);
        for(const [key,field] of Object.entries(fields)) {
            const bytes = field.type in types ? types[field.type] : field.size;
            if(!Number.isSafeInteger(field.offset)||field.offset<0||!Number.isSafeInteger(bytes)||bytes<=0||field.offset+bytes>definition.size)
                throw new RangeError('Invalid measured field '+name+'.'+key);
            if(field.bits!==undefined && (!Number.isInteger(field.bits)||field.bits<=0||!Number.isInteger(field.shift)||field.shift<0||field.bits+field.shift>bytes*8))
                throw new RangeError('Invalid measured bitfield '+name+'.'+key);
        }
        schemas.set(name,{size:definition.size,fields});
    }
    function record(name, value) {
        const at=address(value);if(!at)return 0;
        const definition=schema(name);memory.bounds(at,definition.size);
        const key=name+':'+at;
        if(views.has(key))return views.get(key);
        const out={address:at,byteLength:definition.size};views.set(key,out);
        for(const [key,field] of Object.entries(definition.fields)) {
            const pos=at+field.offset;
            Object.defineProperty(out,key,{enumerable:true,
                get() {
                    if(field.record)return record(field.record,pos);
                    if(field.array)return array(field.array,pos,field.length);
                    if(field.bits!==undefined) {
                        const raw=BigInt.asUintN(types[field.type]*8,BigInt(read(field.type,pos)));
                        const bits=(raw>>BigInt(field.shift))&((1n<<BigInt(field.bits))-1n);
                        return Number(field.signed?BigInt.asIntN(field.bits,bits):bits);
                    }
                    return read(field.type,pos);
                },
                set(v) {
                    if(field.readonly)throw new TypeError('Read-only C field '+key);
                    if(field.record||field.array) {memory.memmove(pos,address(v),field.size);return;}
                    if(field.bits!==undefined) {
                        const shift=BigInt(field.shift),mask=((1n<<BigInt(field.bits))-1n)<<shift;
                        const raw=(BigInt(read(field.type,pos))&~mask)|((BigInt(v)<<shift)&mask);
                        write(field.type,pos,field.type.startsWith('Big')?raw:Number(raw));return;
                    }
                    write(field.type,pos,v);
                }});
        }
        return out;
    }
    function array(kind,value,length) {
        const at=address(value),stride=types[kind]??schema(kind).size;
        if(!Number.isSafeInteger(length)||length<0)throw new RangeError('Invalid C array length');
        memory.bounds(at,length*stride);
        const index=key=>typeof key==='string'&&/^(0|[1-9]\d*)$/.test(key)?Number(key):null;
        return new Proxy({address:at,length,byteLength:length*stride},{
            get(o,k) {const i=index(k);if(i===null)return Reflect.get(o,k);if(i>=length)throw new RangeError('C array bounds');return kind in types?read(kind,at+i*stride):record(kind,at+i*stride);},
            set(o,k,v) {const i=index(k);if(i===null)return Reflect.set(o,k,v);if(i>=length)throw new RangeError('C array bounds');if(kind in types)write(kind,at+i*stride,v);else memory.memmove(at+i*stride,address(v),stride);return true;}});
    }
    const api={
        moduleKey:Object.freeze({}),heap:()=>memory.HEAPU8,signedHeap:()=>memory.HEAP8,
        malloc:n=>memory.malloc(Number(n)),calloc:(n,s)=>memory.calloc(Number(n),Number(s)),
        realloc:(p,n)=>memory.realloc(address(p),Number(n)),free:p=>memory.free(address(p)),
        literal(text) {if(!literals.has(text))literals.set(text,memory.cstring(text));return literals.get(text);},
        address,read,write,load:read,store:write,
        pointer:p=>read('ptr',p),storePointer:(p,v)=>write('ptr',p,v),
        loadChar:p=>read('Int8',p),loadByte:p=>read('Uint8',p),
        storeChar:(p,v)=>write('Int8',p,v),storeByte:(p,v)=>write('Uint8',p,v),
        storeInt:(p,v)=>write('Int32',p,v),
        int:v=>Number(BigInt.asIntN(32,BigInt(v))),uint:v=>Number(BigInt.asUintN(32,BigInt(v))),
        short:v=>Number(BigInt.asIntN(16,BigInt(v))),ushort:v=>Number(BigInt.asUintN(16,BigInt(v))),
        char:v=>Number(BigInt.asIntN(8,BigInt(v))),uchar:v=>Number(BigInt.asUintN(8,BigInt(v))),
        long:v=>BigInt.asIntN(64,BigInt(v)),ulong:v=>BigInt.asUintN(64,BigInt(v)),
        stackSave(){const mark={index:stack.length,sequence:markSequence++};marks.add(mark);return mark;},
        stackAlloc(n){const at=memory.malloc(Number(n));if(!at)throw new RangeError('C stack allocation failed');stack.push({at,allocation:memory.live.get(at)});return at;},
        stackRestore(mark) {
            if(!marks.has(mark))throw new Error('Invalid C stack mark');
            while(stack.length>mark.index){const {at,allocation}=stack.pop();if(memory.live.get(at)===allocation)memory.free(at);}
            for(const item of marks)if(item.sequence>=mark.sequence)marks.delete(item);
        },
        scoped(fn,...args){const mark=api.stackSave();try{const result=fn(...args);if(result&&typeof result.then==='function')throw new TypeError('C calls must be synchronous');return result;}finally{api.stackRestore(mark);}},
        defineRecord,record,array,
        copy:(out,src,n)=>memory.memmove(address(out),address(src),Number(n)),
    };
    api.boolean=api.char;api.coordxy=api.short;api.size_t=api.ulong;
    Object.defineProperties(api,{HEAPU8:{get:()=>memory.HEAPU8},HEAP8:{get:()=>memory.HEAP8}});
    return api;
}
