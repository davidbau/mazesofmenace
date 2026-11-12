// Temporary memory/filesystem adapter for the experimental mixed game build.
// Algorithms are in the standalone byte/string services, which know no Wasm.
import { createTerminfo } from './terminfo.js';
import { compressUnixZ, decompressUnixZ } from './unix-compress.js';
import { compilePosixRegex, execPosixRegex, nativeRegexError, posixRegexError, freePosixRegex } from './posix-regex.js';

export function createWasmDependencyRuntime({ regex = false, regexDialect = 'native' } = {}) {
    if (!['native', 'sdk'].includes(regexDialect)) throw new TypeError('Unknown regex dialect');
    const terminfo = createTerminfo();
    const capabilityPointers = new Map();
    const calls = { tgetent: 0, tgetflag: 0, tgetnum: 0, tgetstr: 0, tparm: 0, tgoto: 0, tputs: 0, compress: 0, decompress: 0 };
    const regexHandles = new Map();
    if (regex) Object.assign(calls, { regcomp: 0, regexec: 0, regerror: 0, regfree: 0 });
    const requireRegex = () => { if (!regex) throw new Error('JS regex dependency is disabled in this build'); };
    let expansion = 0, expansionSize = 0;
    let output = 0, outputSize = 0;
    const string = (services, pointer) => {
        pointer = Number(pointer);
        if (!pointer) return null;
        const heap = services.heap();
        let value = '';
        for (; pointer < heap.length && heap[pointer]; ++pointer) value += String.fromCharCode(heap[pointer]);
        return value;
    };
    const writeString = (services, pointer, value) => {
        const heap = services.heap();
        for (let i = 0; i < value.length; ++i) heap[pointer + i] = value.charCodeAt(i) & 255;
        heap[pointer + value.length] = 0;
    };
    const result = (services, value) => {
        if (value === null) return 0;
        if (value.length + 1 > expansionSize) {
            if (expansion) services.free(expansion);
            expansionSize = Math.max(256, value.length + 1);
            expansion = services.malloc(expansionSize);
            if (!expansion) throw new Error('JS terminfo expansion allocation failed');
        }
        writeString(services, expansion, value);
        return expansion;
    };
    return {
        calls,
        tgetent(services, name) {
            ++calls.tgetent;
            const lines = Number(services.ENV.LINES), columns = Number(services.ENV.COLUMNS);
            terminfo.lines = Number.isFinite(lines) && lines > 0 ? lines : 24;
            terminfo.columns = Number.isFinite(columns) && columns > 0 ? columns : 80;
            return terminfo.tgetent(null, string(services, name));
        },
        tgetflag(services, id) { ++calls.tgetflag; return terminfo.tgetflag(string(services, id)); },
        tgetnum(services, id) { ++calls.tgetnum; return terminfo.tgetnum(string(services, id)); },
        tgetstr(services, id, area) {
            ++calls.tgetstr;
            const value = terminfo.tgetstr(string(services, id));
            if (value === null) return 0;
            if (Number(area)) {
                let view = new DataView(services.heap().buffer);
                const pointer = Number(view.getBigUint64(Number(area), true));
                if (pointer) {
                    writeString(services, pointer, value);
                    view = new DataView(services.heap().buffer);
                    view.setBigUint64(Number(area), BigInt(pointer + value.length + 1), true);
                    return pointer;
                }
            }
            if (!capabilityPointers.has(value)) {
                const pointer = services.malloc(value.length + 1);
                if (!pointer) throw new Error('JS terminfo capability allocation failed');
                writeString(services, pointer, value);
                capabilityPointers.set(value, pointer);
            }
            return capabilityPointers.get(value);
        },
        tparm(services, format, parameters) {
            ++calls.tparm;
            const view = new DataView(services.heap().buffer);
            const args = Array.from({ length: 9 }, (_, i) => Number(BigInt.asIntN(32,
                view.getBigInt64(Number(parameters) + i * 8, true))));
            return result(services, terminfo.tparm(string(services, format), ...args));
        },
        tgoto(services, format, column, row) {
            ++calls.tgoto;
            return result(services, terminfo.tgoto(string(services, format), column, row));
        },
        tputs(services, value, lines, callback) {
            ++calls.tputs;
            return terminfo.tputs(string(services, value), lines, services.callback
                ? services.callback(callback) : byte => services.emit(callback, byte));
        },
        tputsPrepare(services, pointer, lines) {
            ++calls.tputs;
            const value = string(services, pointer);
            if (value === null) return 0;
            let prepared = '';
            terminfo.tputs(value, lines, byte => { prepared += String.fromCharCode(byte); });
            if (prepared.length + 1 > outputSize) {
                if (output) services.free(output);
                outputSize = Math.max(256, prepared.length + 1);
                output = services.malloc(outputSize);
                if (!output) throw new Error('JS terminfo output allocation failed');
            }
            writeString(services, output, prepared);
            return output;
        },
        regcomp(services, re, pattern, flags) {
            requireRegex(); ++calls.regcomp;
            re = Number(re);
            if (regexHandles.has(re)) freePosixRegex(regexHandles.get(re));
            regexHandles.delete(re);
            const compiled = compilePosixRegex(string(services, pattern), flags, regexDialect === 'native');
            if (!compiled.status) regexHandles.set(re, compiled.handle);
            return compiled.status;
        },
        regexec(services, re, text, count, matches, flags) {
            requireRegex(); ++calls.regexec;
            if (Number(count) !== 0 || Number(matches) !== 0)
                throw new RangeError('Configured JS regex supports REG_NOSUB boolean matching only');
            return execPosixRegex(regexHandles.get(Number(re)), string(services, text), flags);
        },
        regerror(services, code, re, destination, size) {
            requireRegex(); ++calls.regerror;
            const message = (regexDialect === 'native' ? nativeRegexError : posixRegexError)(code), required = message.length + 1;
            size = Number(size); destination = Number(destination);
            if (size > 0) writeString(services, destination, message.slice(0, size - 1));
            return required;
        },
        regfree(services, re) {
            requireRegex(); ++calls.regfree;
            re = Number(re);
            if (regexHandles.has(re)) freePosixRegex(regexHandles.get(re));
            regexHandles.delete(re);
        },
        compressFile(services, filename, compressed, unpack) {
            ++calls[unpack ? 'decompress' : 'compress'];
            const plain = string(services, filename), packed = string(services, compressed);
            const source = unpack ? packed : plain, destination = unpack ? plain : packed;
            let input, output, status = 1;
            try {
                // Preserve the existing service's open/read source before
                // destination creation; file cleanup/prompts remain in files.c.
                input = services.FS.open(source, 'r');
                output = services.FS.open(destination, 'w', 0o666);
                const size = services.FS.fstat(input.fd).size;
                const bytes = new Uint8Array(size);
                let position = 0;
                while (position < size) {
                    const count = services.FS.read(input, bytes, position, size - position, position);
                    if (!count) throw new Error('unexpected end of input');
                    position += count;
                }
                const encoded = unpack ? decompressUnixZ(bytes) : compressUnixZ(bytes);
                if (encoded.bytes.length && services.FS.write(output, encoded.bytes, 0, encoded.bytes.length, 0) !== encoded.bytes.length)
                    throw new Error('incomplete output write');
                status = encoded.status;
                if (encoded.error) services.printErr(`${source}: ${encoded.error}`);
            } catch (error) {
                services.printErr(`${source}: ${error.message || error}`);
                status = 1;
            } finally {
                for (const stream of [output, input]) {
                    if (!stream) continue;
                    try { services.FS.close(stream); }
                    catch (error) { services.printErr(`${source}: ${error.message || error}`); status = 1; }
                }
            }
            return status;
        },
    };
}
