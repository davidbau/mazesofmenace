// Assemble the common C semantics once per instance. Application declarations
// are data; the runtime owns no game symbols or platform defaults.
import {createMemoryServices} from './memory.js';
import {createFunctions} from './functions.js';
import {createBitfields} from './bitfields.js';
import {createCTypes} from './types.js';
export function createRuntime({memory,metadata,typeAliases={},conversionAliases={},inheritedServices={},initialServices={}}) {
    const transport=createMemoryServices(memory),functions=createFunctions();
    for(const [name,target]of Object.entries(conversionAliases))transport[name]=transport[target];
    const bitfields=createBitfields(memory,metadata);
    const ctypes=createCTypes(memory,metadata,bitfields,typeAliases);
    const services=Object.assign(Object.create(inheritedServices),initialServices);
    Object.defineProperties(services,Object.getOwnPropertyDescriptors(transport));
    Object.assign(services,functions);
    return {memory,transport,functions,bitfields,ctypes,services};
}
