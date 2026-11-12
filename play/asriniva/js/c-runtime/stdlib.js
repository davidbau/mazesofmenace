/* Bounded C byte-string/integer/format services for the JS-owned runtime.
 * The active ABI is LP64 and the configured C locale uses ASCII character
 * classification. This is not an implementation of all libc. Unsupported
 * printf conversions (including long double/wide characters/positional
 * arguments) throw explicitly; no host libc, locale, FS or Wasm is consulted.
 */
import { formatFloatMagnitude, floatNegative } from './float-format.js';
// Numeric errno ABI of the currently configured Emscripten/WASI libc. Tests
// compare named errors across native platforms rather than assuming host IDs.
export const C_ERRNO = Object.freeze({ EINVAL: 28, ERANGE: 68 });

export function createCStdlib(memory, {floatPolicy='darwin'} = {}) {
    const api = {
        errno: 0,
        malloc: n => memory.malloc(n), calloc: (n, size) => memory.calloc(n, size),
        realloc: (p, n) => memory.realloc(p, n), free: p => memory.free(p),
        memcpy: (...args) => memory.memcpy(...args), memmove: (...args) => memory.memmove(...args),
        memset: (...args) => memory.memset(...args), memcmp: (...args) => memory.memcmp(...args),
        memchr(p, byte, n) {
            p = Number(p); n = Number(n);
            if (n === 0) return 0;
            memory.bounds(p, n);
            const i = memory.HEAPU8.subarray(p, p + n).indexOf(Number(byte) & 255);
            return i < 0 ? 0 : p + i;
        },
        strlen: p => memory.strlen(p),
        strnlen(p, n) {
            let length = 0;
            while (length < n) {
                memory.bounds(p + length);
                if (!memory.HEAPU8[p + length]) break;
                length++;
            }
            return length;
        },
        strcpy(destination, source) {
            return memory.memcpy(destination, source, memory.strlen(source) + 1);
        },
        strncpy(destination, source, n) {
            n = Number(n);
            memory.bounds(destination, n);
            const count = api.strnlen(source, n);
            memory.memcpy(destination, source, count);
            if (count < n) memory.memset(destination + count, 0, n - count);
            return destination;
        },
        strcat(destination, source) {
            api.strcpy(destination + memory.strlen(destination), source); return destination;
        },
        strncat(destination, source, n) {
            const end = destination + memory.strlen(destination);
            const length = api.strnlen(source, n);
            memory.bounds(end, length + 1);
            memory.memcpy(end, source, length); memory.HEAPU8[end + length] = 0;
            return destination;
        },
        strcmp: (a, b) => api.strncmp(a, b, Number.MAX_SAFE_INTEGER),
        strncmp(a, b, n) {
            for (let i = 0; i < n; i++) {
                memory.bounds(a + i); memory.bounds(b + i);
                const x = memory.HEAPU8[a + i], y = memory.HEAPU8[b + i];
                if (x !== y || !x) return x - y;
            }
            return 0;
        },
        strchr(p, byte) {
            byte &= 255;
            const length = memory.strlen(p);
            for (let i = 0; i <= length; i++) if (memory.HEAPU8[p + i] === byte) return p + i;
            return 0;
        },
        strrchr(p, byte) {
            byte &= 255;
            for (let i = memory.strlen(p); i >= 0; i--) if (memory.HEAPU8[p + i] === byte) return p + i;
            return 0;
        },
        strstr(p, needle) {
            const offset = memory.readString(p).indexOf(memory.readString(needle));
            return offset < 0 ? 0 : p + offset;
        },
        strdup(p) {
            const destination = memory.malloc(memory.strlen(p) + 1);
            return destination ? api.strcpy(destination, p) : 0;
        },
        isupper: c => Number(c >= 65 && c <= 90),
        islower: c => Number(c >= 97 && c <= 122),
        isalpha: c => Number(api.isupper(c) || api.islower(c)),
        isdigit: c => Number(c >= 48 && c <= 57),
        isalnum: c => Number(api.isalpha(c) || api.isdigit(c)),
        isspace: c => Number(c === 32 || c >= 9 && c <= 13),
        isprint: c => Number(c >= 32 && c <= 126),
        tolower: c => api.isupper(c) ? c + 32 : c,
        toupper: c => api.islower(c) ? c - 32 : c,
        abs: n => n < 0 ? -n : n,
    };
    api.lowc = api.tolower;
    api.highc = api.toupper;
    const text = value => typeof value === 'string' ? value.split('\0')[0] : memory.readString(value);
    api.Strcpy = (destination, source) => typeof source === 'string'
        ? memory.writeString(destination, source.split('\0')[0]) : api.strcpy(destination, source);
    api.Strcat = (destination, source) => {
        const end = destination + memory.strlen(destination);
        api.Strcpy(end, source); return destination;
    };

    function integer(pointer, endPointer, base, unsigned) {
        const source = memory.readString(pointer);
        let at = 0;
        while (at < source.length && api.isspace(source.charCodeAt(at))) at++;
        let negative = false;
        if (source[at] === '+' || source[at] === '-') negative = source[at++] === '-';
        if (base && (base < 2 || base > 36)) {
            api.errno = C_ERRNO.EINVAL;
            if (endPointer) memory.view.setBigUint64(memory.bounds(endPointer, 8), BigInt(pointer), true);
            return 0n;
        }
        const digit = c => {
            const n = c === undefined ? -1 : c.charCodeAt(0);
            return n >= 48 && n <= 57 ? n - 48 : n >= 65 && n <= 90 ? n - 55
                : n >= 97 && n <= 122 ? n - 87 : -1;
        };
        if ((!base || base === 16) && source[at] === '0'
            && /[xX]/.test(source[at + 1] ?? '') && digit(source[at + 2]) >= 0 && digit(source[at + 2]) < 16) {
            base = 16; at += 2;
        }
        if (!base) base = source[at] === '0' ? 8 : 10;
        const start = at;
        let value = 0n;
        while (at < source.length) {
            const n = digit(source[at]);
            if (n < 0 || n >= base) break;
            value = value * BigInt(base) + BigInt(n); at++;
        }
        const end = at === start ? 0 : at;
        if (at === start) api.errno = C_ERRNO.EINVAL;
        if (endPointer) memory.view.setBigUint64(memory.bounds(endPointer, 8), BigInt(pointer + end), true);
        const limit = unsigned ? 0xffffffffffffffffn : negative ? 0x8000000000000000n : 0x7fffffffffffffffn;
        if (value > limit) {
            api.errno = C_ERRNO.ERANGE;
            return unsigned ? limit : negative ? -limit : limit;
        }
        if (negative) value = -value;
        return unsigned ? BigInt.asUintN(64, value) : value;
    }
    api.strtoll = (p, end = 0, base = 10) => integer(p, end, base, false);
    api.strtol = api.strtoll;
    api.strtoull = (p, end = 0, base = 10) => integer(p, end, base, true);
    api.strtoul = api.strtoull;
    const uncheckedDecimal = p => {
        const source = memory.readString(p);
        let at = 0, negative = false, value = 0n;
        while (at < source.length && api.isspace(source.charCodeAt(at))) at++;
        if (source[at] === '+' || source[at] === '-') negative = source[at++] === '-';
        while (at < source.length && api.isdigit(source.charCodeAt(at)))
            value = value * 10n + BigInt(source.charCodeAt(at++) - 48);
        return negative ? -value : value;
    };
    // atoi/atol have no error-reporting channel; outside-range signed overflow
    // is undefined in their C implementations and is not a compatibility claim.
    api.atoi = p => Number(BigInt.asIntN(32, uncheckedDecimal(p)));
    api.atol = p => BigInt.asIntN(64, uncheckedDecimal(p));

    api.format = (format, ...args) => {
        format = text(format);
        let output = '', argument = 0;
        for (let at = 0; at < format.length;) {
            if (format[at] !== '%') { output += format[at++]; continue; }
            if (format[at + 1] === '%') { output += '%'; at += 2; continue; }
            const match = /^%([-+ #0]*)(\*|\d*)(?:\.(\*|\d*))?(hh|ll|[hljztL])?([diuoxXcspnaAeEfFgG])/.exec(format.slice(at));
            if (!match) throw new RangeError('Unsupported C printf conversion');
            let [, flags, width, precision, length = '', conversion] = match;
            at += match[0].length;
            width = width === '*' ? Number(args[argument++]) : Number(width);
            if (width < 0) { flags += '-'; width = -width; }
            precision = precision === undefined ? undefined : precision === '*' ? Number(args[argument++]) : Number(precision);
            if (precision < 0) precision = undefined;
            if (!Number.isSafeInteger(width) || width > 1048576
                || precision !== undefined && (!Number.isSafeInteger(precision) || precision > 1048576))
                throw new RangeError('C printf field too large');
            if (argument >= args.length) throw new RangeError('Missing C printf argument');
            const value = args[argument++];
            const bits = length === 'hh' ? 8 : length === 'h' ? 16 : length ? 64 : 32;
            let body, prefix = '', floating = false, finite = true;
            if (conversion === 'n') {
                const pointer = Number(value);
                const view = memory.view;
                memory.bounds(pointer, bits / 8);
                if (bits === 64) view.setBigInt64(pointer, BigInt(output.length), true);
                else view['setInt' + bits](pointer, output.length, true);
                continue;
            }
            if (conversion === 's') {
                if (length) throw new RangeError('Wide strings are not supported');
                if (value !== 0 && typeof value !== 'string' && precision !== undefined) {
                    body = '';
                    const count = api.strnlen(value, precision);
                    for (const byte of memory.readBytes(value, count)) body += String.fromCharCode(byte);
                } else body = value === 0 ? '(null)' : text(value);
                if (precision !== undefined) body = body.slice(0, precision);
            } else if (conversion === 'c') {
                if (length) throw new RangeError('Wide characters are not supported');
                body = String.fromCharCode(Number(value) & 255);
            } else if (/[aAeEfFgG]/.test(conversion)) {
                if (length && length !== 'l') throw new RangeError('Long-double formatting is not supported');
                const number = Number(value);
                floating = true; finite = Number.isFinite(number);
                prefix = floatPolicy==='darwin'&&Number.isNaN(number)?'':floatNegative(number,floatPolicy) ? '-' : flags.includes('+') ? '+' : flags.includes(' ') ? ' ' : '';
                body = formatFloatMagnitude(number, conversion, precision ?? null, flags.includes('#'),floatPolicy);
                if (conversion.toLowerCase() === 'a' && finite) prefix += '0x';
                if (/[AEFG]/.test(conversion)) { body = body.toUpperCase(); prefix = prefix.toUpperCase(); }
            } else {
                const signed = conversion === 'd' || conversion === 'i';
                const number = signed ? BigInt.asIntN(bits, BigInt(value))
                    : BigInt.asUintN(conversion === 'p' ? 64 : bits, BigInt(value));
                const magnitude = number < 0 ? -number : number;
                const radix = conversion === 'o' ? 8 : /[xXp]/.test(conversion) ? 16 : 10;
                if (conversion === 'p') flags += '#';
                body = precision === 0 && magnitude === 0n ? '' : magnitude.toString(radix);
                if (precision !== undefined) body = body.padStart(precision, '0');
                if (conversion === 'X') body = body.toUpperCase();
                if (signed) prefix = number < 0 ? '-' : flags.includes('+') ? '+' : flags.includes(' ') ? ' ' : '';
                if (flags.includes('#')) {
                    if (conversion === 'o' && !body.startsWith('0')) prefix += '0';
                    if (/[xXp]/.test(conversion) && (magnitude !== 0n || conversion === 'p' && floatPolicy==='darwin')) prefix += conversion === 'X' ? '0X' : '0x';
                }
            }
            const padding = Math.max(0, width - prefix.length - body.length);
            output += flags.includes('-') ? prefix + body + ' '.repeat(padding)
                : flags.includes('0') && (floating ? finite : precision === undefined) && !/[sc]/.test(conversion)
                    ? prefix + '0'.repeat(padding) + body : ' '.repeat(padding) + prefix + body;
        }
        return output;
    };
    api.snprintf = (destination, size, format, ...args) => {
        if(typeof size!=='bigint'&&(!Number.isSafeInteger(size)||size<0))throw new RangeError('Invalid snprintf capacity');
        const capacity=BigInt(size);if(capacity<0n||capacity>0xffffffffffffffffn)throw new RangeError('Invalid snprintf capacity');
        const output=api.format(format,...args),count=capacity>BigInt(output.length+1)?output.length+1:Number(capacity);
        if(count)memory.writeString(destination,output.slice(0,count-1));
        return output.length;
    };
    api.sprintf = (destination, format, ...args) => {
        const output = api.format(format, ...args); memory.writeString(destination, output); return output.length;
    };
    api.Sprintf = api.sprintf;
    api.Snprintf = api.snprintf;
    return api;
}
