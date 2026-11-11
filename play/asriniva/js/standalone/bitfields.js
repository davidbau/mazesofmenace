import {address} from './memory-services.js';
export function createBitfields(memory,metadata) {
    function field(type,key,ptr) {
        const record=metadata.records[type],item=record?.fields[key];
        if(!item||item.bits===undefined)throw new Error('Missing measured bitfield '+type+'.'+key);
        const at=address(ptr)+item.offset,n=Math.ceil((item.shift+item.bits)/8);
        memory.bounds(at,n);return {item,at,n};
    }
    function get(type,key,ptr) {
        const {item,at,n}=field(type,key,ptr);let raw=0n;
        for(let i=0;i<n;i++)raw|=BigInt(memory.HEAPU8[at+i])<<BigInt(i*8);
        return Number(raw>>BigInt(item.shift)&((1n<<BigInt(item.bits))-1n));
    }
    function set(type,key,ptr,value) {
        const {item,at,n}=field(type,key,ptr),mask=((1n<<BigInt(item.bits))-1n)<<BigInt(item.shift);let raw=0n;
        for(let i=0;i<n;i++)raw|=BigInt(memory.HEAPU8[at+i])<<BigInt(i*8);
        raw=(raw&~mask)|((BigInt(value)<<BigInt(item.shift))&mask);
        for(let i=0;i<n;i++)memory.HEAPU8[at+i]=Number(raw>>BigInt(i*8)&255n);
        return get(type,key,ptr);
    }
    return {get,set};
}
