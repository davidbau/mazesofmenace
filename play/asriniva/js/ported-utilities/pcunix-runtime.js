import { regularize } from './pcunix.js';
import { withEnvironment } from './pcunix-scope.js';
export function callRegularize(Module, pointer) {
    const env = {
        char(p) { return Module.HEAP8[Number(p)]; },
        storeChar(p, value) { Module.HEAP8[Number(p)] = value; }
    };
    return withEnvironment(env, regularize, Number(pointer));
}
