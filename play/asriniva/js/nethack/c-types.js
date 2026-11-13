// Compatibility entry supplies NetHack declarations to the generic type engine.
import {createCTypes as createTypes} from '../c-runtime/types.js';
import {typeAliases} from './declarations.js';
import windowAbi from './window-abi.json' with {type:'json'};
import optionsAbi from './options-abi.json' with {type:'json'};

// Record harvesting alone omits enums used only in function parameters. Both
// inventories are compiler measured; never infer an enum's width or sign.
const enriched=new WeakMap();
export function withNetHackEnums(metadata) {
    if(enriched.has(metadata))return enriched.get(metadata);
    const enums={...metadata.enums};
    for(const source of [windowAbi.enums,optionsAbi.enums])for(const [name,layout] of Object.entries(source)){
        const previous=enums[name];
        if(previous&&(previous.size!==layout.size||previous.signed!==layout.signed))throw new Error('Conflicting measured C enum '+name);
        enums[name]=layout;
    }
    const result={...metadata,enums};enriched.set(metadata,result);return result;
}
export function createCTypes(memory,metadata,bitfields) {
    return createTypes(memory,withNetHackEnums(metadata),bitfields,typeAliases);
}
