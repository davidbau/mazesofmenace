import {address} from './memory.js';
// Measured C field access used by adapters which previously called generated
// read/write helpers. The adapter supplies canonical scalar types.
export function createCTypes(memory,metadata,bitfields,aliases={}) {
    const scalars={'char':'Int8','signed char':'Int8','unsigned char':'Uint8','short':'Int16','unsigned short':'Uint16','int':'Int32','unsigned int':'Uint32','unsigned':'Uint32','long':'BigInt64','unsigned long':'BigUint64','long long':'BigInt64','unsigned long long':'BigUint64','float':'Float32','double':'Float64'};
    // Declarations are fixed for this type environment; no memory views are cached.
    const canonicalTypes=new Map(),typeSizes=new Map(),recordNames=new Map();
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
    // C enum names retain their identity for fields; call boundaries use the
    // compiler-measured integer representation, including unsigned enums.
    function abiType(type){
        type=canonical(type);
        if(!type.startsWith('enum ')||type.includes('*')||type.includes('['))return type;
        const layout=metadata.enums[type];if(!layout)throw new Error('Unmeasured C enum '+type);
        const scalar={1:'char',2:'short',4:'int',8:'long'}[layout.size];
        if(!scalar)throw new Error('Unsupported C enum width '+type+': '+layout.size);
        return (layout.signed?(layout.size===1?'signed ':''):'unsigned ')+scalar;
    }
    function recordName(type){let name=recordNames.get(type);if(name===undefined){name=canonical(type).replace(/^(struct|union) /,'');recordNames.set(type,name);}return name;}
    function recordDefinition(name){const result=metadata.records[name];if(!result)throw new Error('Unmeasured C record '+name);return result;}
    function record(type){const name=recordName(type);return{type:name,...recordDefinition(name)};}
    function isRecord(type){return Boolean(metadata.records[recordName(type)]);}
    function size(type){type=canonical(type);const cached=typeSizes.get(type);if(cached!==undefined)return cached;const bytes=measureSize(type);typeSizes.set(type,bytes);return bytes;}
    function measureSize(type) {
        const array=type.match(/^(.*?)\[(\d+)\](.*)$/);
        if(array)return Number(array[2])*size(array[1]+array[3]);
        if(type.includes('*'))return 8;
        if(type.startsWith('enum ')){if(!metadata.enums[type])throw new Error('Unmeasured C enum '+type);return metadata.enums[type].size;}
        if(scalars[type])return Number(scalars[type].match(/\d+/)[0])/8;
        return record(type).size;
    }
    const scalarLoads=new Map(Object.entries(scalars).map(([name,scalar])=>[name,'get'+scalar]));
    const loadPlans=new Map();
    function rememberLoad(input,bytes,method,enumType){if(typeof input==='string'&&Number.isSafeInteger(bytes)&&bytes>=0)loadPlans.set(input,{bytes,method,enumType});}
    function load(type,at) {
        const plan=typeof type==='string'?loadPlans.get(type):undefined;
        if(!plan)return loadUncached(type,at);
        at=address(at);memory.bounds(at,plan.bytes);if(plan.method)return memory.view[plan.method](at,true);if(plan.enumType){const item=metadata.enums[plan.enumType];return memory.view['get'+(item.signed?'Int':'Uint')+item.size*8](at,true);}return BigInt(at);
    }
    function loadUncached(type,at) {
        const input=type;
        type=canonical(type);at=address(at);const bytes=size(type);memory.bounds(at,bytes);
        if(type.includes('[')){rememberLoad(input,bytes);return BigInt(at);}
        if(type.includes('*')){rememberLoad(input,bytes,'getBigUint64');return memory.view.getBigUint64(at,true);}
        if(type.startsWith('enum ')){rememberLoad(input,bytes,undefined,type);const item=metadata.enums[type];return memory.view['get'+(item.signed?'Int':'Uint')+item.size*8](at,true);}
        const scalarLoad=scalarLoads.get(type);if(!scalarLoad){if(!scalars[type]){rememberLoad(input,bytes);return BigInt(at);}return memory.view['get'+scalars[type]](at,true);}
        rememberLoad(input,bytes,scalarLoad);return memory.view[scalarLoad](at,true);
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
    function fieldAddress(type,at,key) {
        const definition=recordDefinition(recordName(type)),field=definition.fields[key];
        if(!field)throw new Error('Unmeasured C field '+type+'.'+key);
        return address(at)+field.offset;
    }
    function getField(type,at,key,scalar) {
        const name=recordName(type),definition=recordDefinition(name),field=definition.fields[key];
        if(!field)throw new Error('Unmeasured C field '+type+'.'+key);
        const pos=address(at)+field.offset;
        if(field.record)return BigInt(pos);
        if(field.bits!==undefined)return bitfields.get(Object.prototype.propertyIsEnumerable.call(definition,'type')?definition.type:name,key,at);
        return load(scalar,pos);
    }
    function setField(type,at,key,scalar,value) {
        const name=recordName(type),definition=recordDefinition(name),field=definition.fields[key];
        if(!field)throw new Error('Unmeasured C field '+type+'.'+key);
        const pos=address(at)+field.offset;
        if(field.record)return memory.memmove(pos,address(value),record(field.record).size);
        if(field.bits!==undefined)return bitfields.set(Object.prototype.propertyIsEnumerable.call(definition,'type')?definition.type:name,key,at,value);
        return store(scalar,pos,value);
    }
    return{canonical,abiType,record,isRecord,size,load,store,locate,fieldAddress,getField,setField};
}
