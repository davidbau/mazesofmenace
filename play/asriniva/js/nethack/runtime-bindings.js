// NetHack declarations for the common runtime. Game policies stay in the ports.
import {createRuntime} from '../c-runtime/runtime.js';
import {typeAliases} from './declarations.js';
export function createNetHackRuntime(base,metadata,getenv) {
    return createRuntime({memory:base.memory,metadata,typeAliases,
        conversionAliases:{boolean:'char',coordxy:'short'},
        inheritedServices:base.services,initialServices:{getenv}});
}
