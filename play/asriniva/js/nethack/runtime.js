/* Second service provider for existing translations. All state and byte memory
 * are owned by this JS instance; there is no Module, C helper or Wasm loader.
 * Initial scope: alloc.c, strutil.c, ISAAC64, MD4, calendar.c and posixregex.c, plus an
 * independent regular-file filesystem; not a full game runtime.
 * Layouts are the configured LP64 layouts, independently checked by the native
 * runtime test. Existing translated function bodies are imported unchanged.
 */
import { CMemory } from '../c-runtime/heap.js';
import { createCStdlib } from '../c-runtime/stdlib.js';
import { createCTime } from '../c-runtime/time.js';
import { CVFS } from '../c-runtime/vfs.js';
import { compilePosixRegex, execPosixRegex, freePosixRegex, posixRegexError,
    REG_EXTENDED, REG_NOSUB, REG_NOMATCH, nativeRegexError } from '../libraries/regex/posix.js';
import { withCEnvironment } from '../c-runtime/context.js';
import {createNativeAllocation} from './native/alloc.js';
import * as strings from '../ported/strutil.js';
import * as isaac from '../isaac64.js';
import * as md4 from '../ported/nhmd4.js';
import * as calendar from '../ported/calendar.js';
import * as regex from '../ported/posixregex.js';

export const JS_RUNTIME_LAYOUTS = Object.freeze({
    strutil: Object.freeze({ size: 272, len: 0, str: 8, buf: 16, bufSize: 256, largestInt: 32767 }),
    isaac64: Object.freeze({ size: 4128, n: 0, r: 8, m: 2056, a: 4104, b: 4112, c: 4120 }),
    nhmd4: Object.freeze({ size: 152, lo: 0, hi: 4, a: 8, b: 12, c: 16, d: 20, buffer: 24, block: 88 }),
    posixregex: Object.freeze({ size: 40, re: 0, err: 32, regexSize: 32, bufferSize: 256 }),
});

export class CPanic extends Error {
    constructor(message) { super(message); this.name = 'CPanic'; }
}

export function createJsRuntime(options = {}) {
    const memory = new CMemory(options);
    const libc = createCStdlib(memory,options.libc);
    const clock = createCTime({ now: options.now, native: true });
    const filesystem = new CVFS(options.filesystem);
    const environment = new Map();
    const expressions = new Map();
    const dateBuffer = memory.malloc(15);
    const services = Object.assign({}, libc, clock, {
        LONG_SIZE: 8, PTRBUFCNT: 4, PTRBUFSIZ: 32, PTR_FMT: '%p',
        LARGEST_INT: JS_RUNTIME_LAYOUTS.strutil.largestInt,
        allocState: { ptrbufidx: 0 },
        panic: (format, ...args) => { throw new CPanic(libc.format(format, ...args)); },
        panicAlloc: n => { throw new CPanic(`Memory allocation failure; cannot get ${n} bytes`); },
        panicRealloc: n => { throw new CPanic(`Memory allocation failure; cannot extend to ${n} bytes`); },
        panicDupstr: () => { throw new CPanic('dupstr: string length overflow'); },
        panicOverflow: (file, line) => { throw new CPanic(libc.format('Overflow at %s:%d', file, line)); },
    });
    Object.defineProperties(services, {
        HEAPU8: { get: () => memory.HEAPU8 },
        HEAP8: { get: () => memory.HEAP8 },
        errno: { get: () => libc.errno, set: value => { libc.errno = value; } },
    });
    services.ptrbuf = Array.from({ length: 4 }, () => memory.malloc(32));
    if (!dateBuffer || services.ptrbuf.some(pointer => !pointer)) throw new RangeError('Insufficient runtime memory');
    const allocation=createNativeAllocation(services);
    services.alloc=allocation.alloc;
    Object.assign(services, {
        NhregexSize: JS_RUNTIME_LAYOUTS.posixregex.size,
        BUFSZ: JS_RUNTIME_LAYOUTS.posixregex.bufferSize,
        REG_EXTENDED, REG_NOSUB:4, REG_NOMATCH,
        regcomp(address, pattern, flags) {
            memory.bounds(address, JS_RUNTIME_LAYOUTS.posixregex.regexSize);
            const old = expressions.get(address);
            if (old) freePosixRegex(old);
            expressions.delete(address);
            if(flags!==5)throw new Error('Unsupported native ERE flags');
            const result = compilePosixRegex(memory.readString(pattern), 9, true);
            if (result.status === 0) expressions.set(address, result.handle);
            return result.status;
        },
        regexec(address, text, count, matches, flags) {
            if (count !== 0 || matches !== 0) throw new RangeError('Only REG_NOSUB execution is supported');
            if (!expressions.has(address)) throw new RangeError('Regex must be successfully compiled before execution');
            return execPosixRegex(expressions.get(address), memory.readString(text), flags);
        },
        regerror(status, address, destination, size) {
            const message = nativeRegexError(status);
            if (size > 0) memory.writeString(destination, message.slice(0, size - 1));
            return message.length + 1;
        },
        regfree(address) {
            const handle = expressions.get(address);
            if (handle) freePosixRegex(handle);
            expressions.delete(address);
        },
    });
    services.nh_getenv = name => name === 'NETHACK_RECORDING_EPOCH' ? 0 : environment.get(name) || 0;
    services.datestr = () => dateBuffer;
    function setEnvironment(name, value) {
        const previous = environment.get(name);
        if (value === null || value === undefined) environment.delete(name);
        else environment.set(name, memory.cstring(String(value)));
        if (previous) memory.free(previous);
    }
    for (const [name, value] of Object.entries(options.environment || {})) setEnvironment(name, value);
    const call = (functions, name, args) => {
        if (typeof functions[name] !== 'function') throw new RangeError(`Unknown translated function ${name}`);
        return withCEnvironment(services, functions[name], ...args);
    };
    const scalar = (pointer, name, get, set) => ({
        enumerable: true,
        get: () => memory.view[get](pointer + name, true),
        set: value => memory.view[set](pointer + name, value, true),
    });
    function strbuf(pointer) {
        const layout = JS_RUNTIME_LAYOUTS.strutil;
        memory.bounds(pointer, layout.size);
        const value = { address: pointer, buf: pointer + layout.buf, bufSize: layout.bufSize };
        Object.defineProperties(value, {
            len: scalar(pointer, layout.len, 'getInt32', 'setInt32'),
            str: {
                enumerable: true,
                get: () => Number(memory.view.getBigUint64(pointer + layout.str, true)),
                set: address => memory.view.setBigUint64(pointer + layout.str, BigInt(address), true),
            },
        });
        return value;
    }
    function isaacContext(pointer) {
        const layout = JS_RUNTIME_LAYOUTS.isaac64;
        memory.bounds(pointer, layout.size);
        const value = {};
        Object.defineProperties(value, {
            n: scalar(pointer, layout.n, 'getUint32', 'setUint32'),
            r: { get: () => new BigUint64Array(memory.buffer, pointer + layout.r, 256) },
            m: { get: () => new BigUint64Array(memory.buffer, pointer + layout.m, 256) },
        });
        for (const field of ['a', 'b', 'c']) Object.defineProperty(value, field,
            scalar(pointer, layout[field], 'getBigUint64', 'setBigUint64'));
        return value;
    }
    function md4Context(pointer) {
        const layout = JS_RUNTIME_LAYOUTS.nhmd4;
        memory.bounds(pointer, layout.size);
        const value = {
            clear: () => memory.memset(pointer, 0, layout.size),
        };
        Object.defineProperties(value, {
            buffer: { get: () => memory.HEAPU8.subarray(pointer + layout.buffer, pointer + layout.buffer + 64) },
            block: { get: () => new Uint32Array(memory.buffer, pointer + layout.block, 16) },
        });
        for (const field of ['lo', 'hi', 'a', 'b', 'c', 'd']) Object.defineProperty(value, field,
            scalar(pointer, layout[field], 'getUint32', 'setUint32'));
        return value;
    }
    function regexContext(pointer) {
        const layout = JS_RUNTIME_LAYOUTS.posixregex;
        memory.bounds(pointer, layout.size);
        const value = { address: pointer, re: pointer + layout.re };
        Object.defineProperty(value, 'err', scalar(pointer, layout.err, 'getInt32', 'setInt32'));
        return value;
    }
    return {
        memory, libc, services, clock, filesystem, FS: filesystem.FS, setEnvironment,
        alloc: (name, ...args) => allocation[name](...args),
        strutil: (name, ...args) => call(strings, name, args),
        posixregex: (name, ...args) => call(regex, name, args),
        regexContext,
        calendar: (name, ...args) => memory.withScope(scope => {
            const previous = services.stackAlloc;
            services.stackAlloc = scope.alloc;
            try { return call(calendar, name, args); }
            finally { services.stackAlloc = previous; }
        }),
        createStrbuf() {
            const pointer = memory.calloc(1, JS_RUNTIME_LAYOUTS.strutil.size);
            if (!pointer) throw new RangeError('strbuf allocation failed');
            const value = strbuf(pointer);
            call(strings, 'strbuf_init', [value]);
            return value;
        },
        strbuf,
        createIsaac(seed = new Uint8Array(0)) {
            const pointer = memory.calloc(1, JS_RUNTIME_LAYOUTS.isaac64.size);
            if (!pointer) throw new RangeError('ISAAC allocation failed');
            const value = isaacContext(pointer);
            const initialized = isaac.isaac64_init(seed);
            value.r.set(initialized.r);
            value.m.set(initialized.m);
            for (const field of ['n','a','b','c']) value[field] = initialized[field];
            return {
                address: pointer,
                next: () => isaac.isaac64_next_uint64(isaacContext(pointer)),
                bounded(n) {
                    n=BigInt.asUintN(64,BigInt(n));
                    if(!n)throw new RangeError('Zero ISAAC bound');
                    let r,v,d;
                    do {r=isaac.isaac64_next_uint64(isaacContext(pointer));v=r%n;d=r-v;}
                    while(BigInt.asUintN(64,d+n-1n)<d);
                    return v;
                },
                reseed: bytes => isaac.isaac64_reseed(isaacContext(pointer), bytes),
            };
        },
        createMD4() {
            const pointer = memory.calloc(1, JS_RUNTIME_LAYOUTS.nhmd4.size);
            if (!pointer) throw new RangeError('MD4 allocation failed');
            md4.nhmd4_init(md4Context(pointer));
            return {
                address: pointer,
                update: bytes => md4.nhmd4_update(md4Context(pointer), bytes, bytes.length),
                final() {
                    const digest = new Uint8Array(16);
                    md4.nhmd4_final(md4Context(pointer), digest);
                    return digest;
                },
            };
        },
    };
}
