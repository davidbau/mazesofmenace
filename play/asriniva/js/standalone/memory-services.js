// Compatibility entry for standalone callers. Generic mechanics live in the
// shared C runtime; these two typedef conversions belong to NetHack.
import {createMemoryServices as createCMemoryServices} from '../c-runtime/memory.js';
export {address} from '../c-runtime/memory.js';

export function createMemoryServices(memory) {
    const services=createCMemoryServices(memory);
    services.boolean=services.char;
    services.coordxy=services.short;
    return services;
}
