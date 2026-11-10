// TRAP typed memory, scalar widths, native calls and callback transport.
// Source policy is in trap.js; each native instance owns its static storage.
import * as trap from './trap.js';
import {withCEnvironment} from './c-runtime.js';

const instances = new WeakMap();
const schema = trap.trapSchema;
const dataNames = Object.keys(schema.data);
const globalNames = Object.keys(schema.foreignGlobals);
const functionNames = schema.functions.map(f => f.name);
const address = v => Number(v ?? 0);
const integer = v => typeof v === 'bigint' ? v : BigInt(Math.trunc(v));

export function createTrapEnvironment(services, state) {
    const view = () => new DataView(services.heap().buffer);
    function cast(type, value) {
        if (typeof type === 'object') return address(value);
        if (type === 'void') return undefined;
        if (type[0] === 'f') return type === 'f32' ? Math.fround(Number(value)) : Number(value);
        const bits = Number(type.slice(1));
        if (bits === 64) return type[0] === 'i' ? BigInt.asIntN(bits, integer(value)) : BigInt.asUintN(bits, integer(value));
        const n = typeof value === 'bigint' ? Number(BigInt.asUintN(32,value)) : Number(value);
        if (type === 'i32') return n | 0;
        if (type === 'u32') return n >>> 0;
        if (type === 'i16') return n << 16 >> 16;
        if (type === 'u16') return n & 65535;
        if (type === 'i8') return n << 24 >> 24;
        if (type === 'u8') return n & 255;
        throw new Error('Unreviewed TRAP scalar ' + type);
    }
    function sizeof(type) {
        if (typeof type === 'string') return Number(type.slice(1)) / 8;
        if (type.pointer) return 8;
        if (type.record) return schema.records[type.record].size;
        return type.array.reduce((n, d) => n * d, sizeof(type.of));
    }
    function read(at, type) {
        at = address(at);
        if (typeof type === 'object') {
            if (type.pointer) return Number(view().getBigUint64(at, true));
            return at;
        }
        const method = ({i8:'getInt8',u8:'getUint8',i16:'getInt16',u16:'getUint16',i32:'getInt32',u32:'getUint32',i64:'getBigInt64',u64:'getBigUint64',f32:'getFloat32',f64:'getFloat64'})[type];
        if (!method) throw new Error('Unreviewed TRAP read ' + type);
        return view()[method](at, true);
    }
    function write(at, type, value) {
        at = address(at); value = cast(type, value);
        if (typeof type === 'object') {
            if (!type.pointer) throw new Error('TRAP aggregate needs copy');
            view().setBigUint64(at, BigInt(value), true);
        } else {
            const method = ({i8:'setInt8',u8:'setUint8',i16:'setInt16',u16:'setUint16',i32:'setInt32',u32:'setUint32',i64:'setBigInt64',u64:'setBigUint64',f32:'setFloat32',f64:'setFloat64'})[type];
            if (!method) throw new Error('Unreviewed TRAP write ' + type);
            view()[method](at, value, true);
        }
        return value;
    }
    function binary(type, op, a, b) {
        if (typeof type === 'object') {
            if (op === '+') return address(a) + Number(b);
            if (op === '-') return address(a) - Number(b);
            throw new Error('Unreviewed TRAP pointer operator ' + op);
        }
        const wide = type === 'i64' || type === 'u64';
        a = wide ? integer(a) : Number(a); b = wide ? integer(b) : Number(b);
        let value;
        switch (op) {
        case '+': value = a + b; break;
        case '-': value = a - b; break;
        case '*': value = !wide && (type === 'i32' || type === 'u32') ? Math.imul(a,b) : a * b; break;
        case '/': value = wide ? a / b : type[0] === 'f' ? a / b : Math.trunc(a / b); break;
        case '%': value = a % b; break;
        case '&': value = a & b; break;
        case '|': value = a | b; break;
        case '^': value = a ^ b; break;
        case '<<': value = a << b; break;
        case '>>': value = !wide && type[0] === 'u' ? a >>> b : a >> b; break;
        default: throw new Error('Unreviewed TRAP operator ' + op);
        }
        return cast(type, value);
    }
    const fieldInfo = (record, name) => {
        const f = schema.records[record].fields.find(f => f.name === name);
        if (!f) throw new Error('Unknown TRAP field ' + record + '.' + name);
        return f;
    };
    const global = name => address(services.global(globalNames.indexOf(name)));
    const data = name => address(services.storage(dataNames.indexOf(name)));
    function functionPointer(name) { return address(services.functionPointer(name)); }
    function initialValue(value) {
        if (!value || typeof value !== 'object') return value;
        if (value.function) return functionPointer(value.function);
        if (value.constant) return schema.constants[value.constant];
        if (value.binary) return binary(value.type, value.binary, initialValue(value.left), initialValue(value.right));
        if (value.address) {
            const location = a => a.global ? global(a.global) : location(a.base) + fieldInfo(a.record,a.field).offset;
            return location(value.address);
        }
        return value;
    }
    function initialize(at, type, value) {
        at = address(at);
        services.heap().fill(0, at, at + sizeof(type));
        function put(at, type, value) {
            if (value === null || value === undefined) return;
            if (type.array) {
                const element = type.array.length === 1 ? type.of : {array:type.array.slice(1),of:type.of};
                if (typeof value === 'string') {
                    for (let i=0;i<value.length;i++) write(at+i,type.of,value.charCodeAt(i));
                } else value.forEach((v,i) => put(at+i*sizeof(element),element,v));
            } else if (type.record) {
                for (const [name,v] of Object.entries(value)) {
                    const f = fieldInfo(type.record,name);
                    if (f.bits !== null) env.setBit(at+f.offset,f.bitOffset,f.bits,initialValue(v));
                    else put(at+f.offset,f.type,v);
                }
            } else write(at,type,typeof value === 'string' ? services.literal(value) : initialValue(value));
        }
        put(at,type,value);
        return at;
    }
    const env = {
        cast, read, write, binary, sizeof, initialize, data, global, functionPointer,
        truth:value => value !== 0 && value !== 0n && value !== null && value !== undefined && value !== false,
        unary(type,op,value) { return cast(type,op === '-' ? -value : op === '~' ? ~value : value); },
        constant:name => schema.constants[name], literal:services.literal,
        field:(base,record,name) => address(base) + fieldInfo(record,name).offset,
        offset:(base,index,stride) => address(base) + Number(index)*stride,
        pointerDifference:(a,b,stride) => BigInt((address(a)-address(b))/stride),
        local:bytes => address(services.stackAlloc(bytes)),
        parameter(type,value) { const at=env.local(sizeof(type)); write(at,type,value); return at; },
        aggregate(type,value) { return initialize(env.local(sizeof(type)),type,value); },
        copy(to,from,bytes) { services.heap().copyWithin(address(to),address(from),address(from)+bytes); return address(to); },
        post(get,assign) { const previous=get(); assign(); return previous; },
        bit(at,offset,bits) {
            let value=0n; for(let i=0;i<Math.ceil((offset+bits)/8);i++) value|=BigInt(services.heap()[address(at)+i])<<BigInt(i*8);
            return Number(value>>BigInt(offset)&((1n<<BigInt(bits))-1n));
        },
        setBit(at,offset,bits,value) {
            const count=Math.ceil((offset+bits)/8); let previous=0n;
            for(let i=0;i<count;i++) previous|=BigInt(services.heap()[address(at)+i])<<BigInt(i*8);
            const mask=((1n<<BigInt(bits))-1n)<<BigInt(offset);
            previous=previous&~mask|(integer(value)<<BigInt(offset)&mask);
            for(let i=0;i<count;i++) services.heap()[address(at)+i]=Number(previous>>BigInt(i*8)&255n);
            return Number(integer(value)&((1n<<BigInt(bits))-1n));
        },
        api:(site,...args) => services.api(site,...args),
        indirect:(site,pointer,...args) => services.indirect(site,pointer,...args),
        callLocal(fn,...args) { const saved=services.stackSave(); try { return fn(...args); } finally { services.stackRestore(saved); } },
    };
    if (!state.initialized) {
        for (const [name,expected] of Object.entries({pointerSize:8,longSize:8,intSize:4,charSigned:1}))
            if (services.layout[name] !== expected) throw new Error('TRAP ABI '+name);
        for (const [name,record] of Object.entries(schema.records)) {
            if (services.layout['size:'+name] !== undefined && services.layout['size:'+name] !== record.size)
                throw new Error('TRAP record size '+name);
            for (const field of record.fields) {
                const offset=services.layout['field:'+name+':'+field.name];
                if (offset !== undefined && offset !== field.offset) throw new Error('TRAP field offset '+name+'.'+field.name);
            }
        }
        for (const name of dataNames)
            if (services.layout['data:'+name] !== sizeof(schema.data[name].type)) throw new Error('TRAP data size '+name);
        for (const name of dataNames) initialize(data(name),schema.data[name].type,schema.data[name].initial);
        // Publish only the fully validated, initialized native metadata; never memory views.
        services.commitLayout?.();
        state.initialized=true;
    }
    return env;
}

export function callTrap(services,name,...args) {
    if (!functionNames.includes(name)) throw new Error('Unknown TRAP entry ' + name);
    let state=instances.get(services.moduleKey);
    if (!state) instances.set(services.moduleKey,state={initialized:false});
    const saved=services.stackSave();
    try { return withCEnvironment(createTrapEnvironment(services,state),trap[name],...args); }
    finally { services.stackRestore(saved); }
}
