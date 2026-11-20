import {address} from './memory.js';

const filePathDecoder=new TextDecoder('utf-8',{ignoreBOM:true});
export function decodeFilePath(bytes) {
    return filePathDecoder.decode(bytes.buffer.resizable ? bytes.slice() : bytes);
}
export function readFilePath(memory,p) {
    if(typeof p==='string')return p;
    p=address(p);
    return p?decodeFilePath(memory.readBytes(p,memory.strlen(p))):'';
}
