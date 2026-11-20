// js/crt/va.js: C variadic arguments (method/design.md 4.4). Hand-written runtime.
// A variadic call passes its extra arguments, already converted to their C
// promoted types by the emitter, as a VaList. va_arg reads the next one.
import { CTrap } from './int.js';

export class VaList {
    constructor(args) { this.args = args; this.i = 0; }
    /** va_arg: the next argument. Reading past the end is a C bug: trap. */
    next() {
        if (this.i >= this.args.length) throw new CTrap('va_arg past the last argument');
        return this.args[this.i++];
    }
    /** va_copy */
    copy() { const v = new VaList(this.args); v.i = this.i; return v; }
}
export const vaList = (...args) => new VaList(args);
