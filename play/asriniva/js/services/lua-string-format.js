/* Lua5.4.8 lstrlib.c formatting rules; Lua notice in lua/lobject.js.
 * Integer/rational arithmetic rounds IEEE doubles to decimal, ties to even,
 * without relying on JS toFixed/toPrecision or a native printf dependency.
 * Pointer formatting uses an injected address service when available; ordinary
 * JS objects otherwise have stable logical identities, not native addresses.
 */
import { LuaError, toNumber, LuaTable, LuaUserdata, LuaLightUserdata, LuaThread, isLuaString, luaStringBytes } from './lua/lobject.js';
const fail = message => { throw new LuaError(message); };
import { formatFloatMagnitude, floatNegative } from './c-float-format.js';
function quote(value) {
  if (isLuaString(value)) {
    value = luaStringBytes(value);
    let text = '"';
    for (let i = 0; i < value.length; i++) {
      const c = value[i], byte = value.charCodeAt(i);
      if (c === '"' || c === '\\' || c === '\n') text += '\\' + c;
      else if (byte < 32 || byte === 127) text += '\\' + String(byte).padStart(/[0-9]/.test(value[i + 1] ?? '') ? 3 : 1, '0');
      else text += c;
    }
    return text + '"';
  }
  if (typeof value === 'bigint') return value === -9223372036854775808n ? '0x8000000000000000' : String(value);
  if (typeof value === 'number') {
    if (value === Infinity) return '1e9999';
    if (value === -Infinity) return '-1e9999';
    if (Number.isNaN(value)) return '(0/0)';
    return (value < 0 || Object.is(value, -0) ? '-' : '') + '0x' + formatFloatMagnitude(Math.abs(value), 'a', null, false);
  }
  if (value === null || typeof value === 'boolean') return value === null ? 'nil' : String(value);
  return fail('value has no literal form');
}
const acceptedFlags = { c: '-', s: '-', p: '-', d: '-+0 ', i: '-+0 ', u: '-0', o: '-#0', x: '-#0', X: '-#0' };
export function openStringFormatting(vm, lib, { string, integer }) {
  const pointers = new Map(); let nextPointer = 16n;
  const pointerText = value => {
    const isPointer = isLuaString(value) || typeof value === 'function' || value?.luaClosure || value instanceof LuaTable || value instanceof LuaUserdata || value instanceof LuaLightUserdata || value instanceof LuaThread;
    if (!isPointer) return '(null)';
    if (vm.pointerOf) { const pointer = BigInt(vm.pointerOf(value)); return pointer ? '0x' + pointer.toString(16) : '(null)'; }
    if (!pointers.has(value)) { pointers.set(value, nextPointer); nextPointer += 16n; }
    return '0x' + pointers.get(value).toString(16);
  };
  const formatArray = args => {
    const format = string(args[0]); let output = '', argument = 1;
    for (let at = 0; at < format.length;) {
      if (format[at] !== '%') { output += format[at++]; continue; }
      at++; if (format[at] === '%') { output += '%'; at++; continue; }
      if (argument >= args.length) fail('no value');
      const start = at;
      while (at < format.length && '-+#0 123456789.'.includes(format[at])) at++;
      if (at - start + 1 >= 22) fail('invalid format (too long)');
      const code = format[at++] ?? '\0', form = '%' + format.slice(start, at);
      const value = args[argument++];
      if (code === 'q') {
        if (form !== '%q') fail("specifier '%q' cannot have modifiers");
        output += quote(value); continue;
      }
      if (!'cdiouxXaAfeEgGps'.includes(code)) fail(`invalid conversion '${form}' to 'format'`);
      const validFlags = acceptedFlags[code] ?? '-+#0 ';
      const valid = new RegExp('^([' + validFlags.replace(/[-\\\]]/g, '\\$&') + ']*)([1-9][0-9]?)?(?:\\.([0-9]{0,2}))?' + code + '$').exec(format.slice(start, at));
      if (!valid || (['c','p'].includes(code) && valid[3] !== undefined)) fail(`invalid conversion specification: '${form}'`);
      const [, flags, widthText, precisionText] = valid;
      const width = Number(widthText ?? 0), precision = precisionText === undefined ? null : Number(precisionText || 0);
      let body, prefix = '', hexPrefix = '', zeroPadding = flags.includes('0');
      if (code === 's') {
        body = luaStringBytes(vm.toLuaString(value));
        if (form !== '%s' && body.includes('\0')) fail('string contains zeros');
        if (precision !== null) body = body.slice(0, precision);
      } else if (code === 'c') { body = String.fromCharCode(Number(integer(value) & 255n)); zeroPadding = false; }
      else if (code === 'p') { body = pointerText(value); zeroPadding = false; }
      else if ('diouxX'.includes(code)) {
        const number = integer(value), signed = code === 'd' || code === 'i';
        const magnitude = signed ? number < 0n ? -number : number : BigInt.asUintN(64, number);
        const base = code === 'o' ? 8 : code.toLowerCase() === 'x' ? 16 : 10;
        body = magnitude === 0n && precision === 0 ? '' : magnitude.toString(base);
        if (precision !== null) { body = body.padStart(precision, '0'); zeroPadding = false; }
        if (signed) prefix = number < 0n ? '-' : flags.includes('+') ? '+' : flags.includes(' ') ? ' ' : '';
        if (flags.includes('#') && code === 'o' && !body.startsWith('0')) prefix += '0';
        if (flags.includes('#') && code.toLowerCase() === 'x' && magnitude !== 0n) prefix += '0x';
      } else {
        const number = toNumber(value); if (number === null) fail('number expected');
        const n = Number(number);
        const negative = floatNegative(n);
        prefix = negative ? '-' : flags.includes('+') ? '+' : flags.includes(' ') ? ' ' : '';
        body = formatFloatMagnitude(n, code, precision, flags.includes('#'));
        if (code.toLowerCase() === 'a' && Number.isFinite(n)) hexPrefix = '0x';
        if (!Number.isFinite(n)) zeroPadding = false;
      }
      if ('XAEG'.includes(code)) { body = body.toUpperCase(); prefix = prefix.toUpperCase(); hexPrefix = hexPrefix.toUpperCase(); }
      prefix += hexPrefix;
      const padding = Math.max(0, width - prefix.length - body.length);
      output += flags.includes('-') ? prefix + body + ' '.repeat(padding) : zeroPadding ? prefix + '0'.repeat(padding) + body : ' '.repeat(padding) + prefix + body;
      if (output.length > 10000000) fail('resulting string too large');
    }
    if (output.length > 10000000) fail('resulting string too large');
    return [output];
  };
  const formatter = (...args) => formatArray(args);
  formatter.luaInvoke = formatArray;
  lib.rawset('format', formatter);
}
