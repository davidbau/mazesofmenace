import { panic } from './panic.js';
import { withEnvironment } from './scope.mjs';
export function install(m) {
    const state = { panicking: 0 };
    const strings = new Map();
    const literal = text => {
        if (typeof text !== 'string') return Number(text);
        if (!strings.has(text)) {
            const length = m.lengthBytesUTF8(text) + 1;
            const pointer = m._malloc(BigInt(length));
            m.stringToUTF8(text, Number(pointer), length);
            strings.set(text, Number(pointer));
        }
        return strings.get(text);
    };
    const pointer = value => BigInt(value);
    m.panicPort = (str, ap) => {
        const environment = {
            get panicking() { return state.panicking; },
            set panicking(value) { state.panicking = value << 24 >> 24; },
            VA_START() {}, // Actual native entry has constructed the current va_list.
            VA_INIT() {}, // Configured USE_STDARG VA_INIT is empty.
            VA_ARGS: ap,
            VA_END: () => m._utility_panic_va_end(pointer(ap)),
            stderr: m._utility_panic_stderr(),
            fputs: (text, file) => m._utility_panic_fputs(pointer(literal(text)), pointer(file)),
            Vfprintf: (file, format, args) => m._utility_panic_vfprintf(pointer(file), pointer(format), pointer(args)),
            fflush: file => m._utility_panic_fflush(pointer(file)),
            abort: () => m._utility_panic_abort(),
            exit: code => m._utility_panic_exit(code),
            EXIT_FAILURE: 1,
        };
        return withEnvironment(environment, panic, Number(str));
    };
    return state;
}
