// Compatibility entry supplies NetHack declarations to the generic type engine.
import {createCTypes as createTypes} from '../c-runtime/types.js';
import {typeAliases} from '../nethack/declarations.js';
export function createCTypes(memory,metadata,bitfields) {
    return createTypes(memory,metadata,bitfields,typeAliases);
}
