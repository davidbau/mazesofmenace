// Compatibility entry supplies the configured single-process platform value.
import {createStandaloneLibc as createLibc} from '../c-runtime/libc.js';
export function createStandaloneLibc(...args) {
    return Object.defineProperties({getpid:()=>42},Object.getOwnPropertyDescriptors(createLibc(...args)));
}
