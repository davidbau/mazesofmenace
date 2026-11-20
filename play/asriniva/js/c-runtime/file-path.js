import {address} from './memory.js';

const filePathDecoder = new TextDecoder('utf-8', {ignoreBOM: true, fatal: true});

export function decodeFilePath(bytes) {
    const input = bytes.buffer.resizable ? bytes.slice() : bytes;
    try {
        return filePathDecoder.decode(input);
    } catch (error) {
        if (!(error instanceof TypeError)) throw error;
    }

    // Preserve directory boundaries. An invalid component cannot match an
    // existing macOS name, even one containing a real replacement character.
    const components = [];
    for (let start = 0; start <= input.length;) {
        const slash = input.indexOf(0x2f, start);
        const end = slash < 0 ? input.length : slash;
        const component = input.subarray(start, end);
        try {
            components.push(filePathDecoder.decode(component));
        } catch (error) {
            if (!(error instanceof TypeError)) throw error;
            components.push(Array.from(component, byte => String.fromCharCode(0xdc00 + byte)).join(''));
        }
        start = end + 1;
    }
    return components.join('/');
}
export function readFilePath(memory,p) {
    if(typeof p==='string')return p;
    p=address(p);
    return p?decodeFilePath(memory.readBytes(p,memory.strlen(p))):'';
}
