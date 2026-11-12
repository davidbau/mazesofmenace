import {address} from './memory.js';
// Measured C field access used by adapters which previously called generated
// read/write helpers. The adapter supplies canonical scalar types.
export function createCTypes(memory,metadata,bitfields,aliases={}) {
    const scalars={'char':'Int8','signed char':'Int8','unsigned char':'Uint8','short':'Int16','unsigned short':'Uint16','int':'Int32','unsigned int':'Uint32','unsigned':'Uint32','long':'BigInt64','unsigned long':'BigUint64','long long':'BigInt64','unsigned long long':'BigUint64','float':'Float32','double':'Float64'};
    // Declarations are fixed for this type environment; no memory views are cached.
    const canonicalTypes=new Map(),typeSizes=new Map();
    function canonical(type){
        const input=type,cached=canonicalTypes.get(input);if(cached!==undefined)return cached;
        type=type.replace(/\b(const|volatile|restrict)\b/g,'').trim().replace(/\s+/g,' ');
        const seen=new Set();
        while(!seen.has(type)){seen.add(type);const next=metadata.aliases?.[type]??aliases[type];if(!next)break;type=next;}
        const nested=type.replace(/\s+/g,'').match(/^(?:__typeof__|typeof)\(\(\((\w+)\*\)0\)->(\w+)\)$/);
        if(nested){const field=record(nested[1]).fields[nested[2]];if(!field?.record)throw new Error('Unmeasured nested C record '+type);canonicalTypes.set(input,field.record);return field.record;}
        const anonymous=type.match(/^(?:struct|union) (?:\w+::)?\(unnamed(?: struct| union)? at .*\/([^/]+):(\d+):(\d+)\)$/);
        if(anonymous)type='@'+anonymous[1]+':'+anonymous[2]+':'+anonymous[3];
        canonicalTypes.set(input,type);return type;
    }
    function record(type){type=canonical(type).replace(/^(struct|union) /,'');const result=metadata.records[type];if(!result)throw new Error('Unmeasured C record '+type);return{type,...result};}
    function isRecord(type){return Boolean(metadata.records[canonical(type).replace(/^(struct|union) /,'')]);}
    function size(type){type=canonical(type);const cached=typeSizes.get(type);if(cached!==undefined)return cached;const bytes=measureSize(type);typeSizes.set(type,bytes);return bytes;}
    function measureSize(type) {
        const array=type.match(/^(.*?)\[(\d+)\](.*)$/);
        if(array)return Number(array[2])*size(array[1]+array[3]);
        if(type.includes('*'))return 8;
        if(type.startsWith('enum ')){if(!metadata.enums[type])throw new Error('Unmeasured C enum '+type);return metadata.enums[type].size;}
        if(scalars[type])return Number(scalars[type].match(/\d+/)[0])/8;
        return record(type).size;
    }
    function load(type,at) {
        type=canonical(type);at=address(at);memory.bounds(at,size(type));
        if(type.includes('['))return BigInt(at);
        if(type.includes('*'))return memory.view.getBigUint64(at,true);
        if(type.startsWith('enum ')){const item=metadata.enums[type];return memory.view['get'+(item.signed?'Int':'Uint')+item.size*8](at,true);}
        if(!scalars[type])return BigInt(at);
        return memory.view['get'+scalars[type]](at,true);
    }
    function store(type,at,value) {
        type=canonical(type);at=address(at);memory.bounds(at,size(type));
        if(type.includes('[')){memory.memmove(at,address(value),size(type));return;}
        if(type.includes('*')){memory.view.setBigUint64(at,BigInt.asUintN(64,BigInt(value?.address??value??0)),true);return;}
        if(type.startsWith('enum ')){const item=metadata.enums[type];memory.view['set'+(item.signed?'Int':'Uint')+item.size*8](at,Number(BigInt.asUintN(item.size*8,BigInt(value))),true);return;}
        const scalar=scalars[type];
        if(!scalar){memory.memmove(at,address(value),size(type));return;}
        const bits=Number(scalar.match(/\d+/)[0]);
        memory.view['set'+scalar](at,scalar.startsWith('Big')?BigInt.asUintN(64,BigInt(value))
            :scalar.startsWith('Float')?Number(value):Number(BigInt[scalar.startsWith('Uint')?'asUintN':'asIntN'](bits,BigInt(value))),true);
    }
    function locate(type,at,key) {
        const definition=record(type),field=definition.fields[key];if(!field)throw new Error('Unmeasured C field '+type+'.'+key);
        return{definition,field,at:address(at)+field.offset};
    }
    function getField(type,at,key,scalar) {
        const entry=locate(type,at,key);
        if(entry.field.record)return BigInt(entry.at);
        return entry.field.bits!==undefined?bitfields.get(entry.definition.type,key,at):load(scalar,entry.at);
    }
    function setField(type,at,key,scalar,value) {
        const entry=locate(type,at,key);
        if(entry.field.record)return memory.memmove(entry.at,address(value),record(entry.field.record).size);
        return entry.field.bits!==undefined?bitfields.set(entry.definition.type,key,at,value):store(scalar,entry.at,value);
    }
    return{canonical,record,isRecord,size,load,store,locate,getField,setField};
}
