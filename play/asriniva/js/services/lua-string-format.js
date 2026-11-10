/* Lua5.4.8 lstrlib.c formatting rules; Lua notice in lua/lobject.js.
 * Integer/rational arithmetic rounds IEEE doubles to decimal, ties to even,
 * without relying on JS toFixed/toPrecision or a native printf dependency.
 * Pointer formatting uses an injected address service when available; ordinary
 * JS objects otherwise have stable logical identities, not native addresses.
 */
import { numberToString, LuaTable, LuaUserdata, LuaLightUserdata, LuaThread, isLuaString, luaStringBytes } from './lua/lobject.js';
import { luaAuxError, luaArgError, luaCheckInteger, luaCheckNumber, luaCheckString, luaWithAuxTop } from './lua-aux-error.js';
import { formatFloatMagnitude, floatNegative } from './c-float-format.js';
import { LuaBuffer } from './lua-buffer.js';
function quote(value, policy, buffer, vm, arg) {
  if (isLuaString(value)) {
    value = luaStringBytes(value);
    buffer.add('"');
    for (let i = 0; i < value.length; i++) {
      const c = value[i], byte = value.charCodeAt(i);
      if (c === '"' || c === '\\' || c === '\n') { buffer.add('\\'); buffer.add(c); }
      else if (byte < 32 || byte === 127) buffer.add('\\' + String(byte).padStart(/[0-9]/.test(value[i + 1] ?? '') ? 3 : 1, '0'));
      else buffer.add(c);
    }
    buffer.add('"'); return;
  }
  buffer.prepare(120); // addliteral's numeric luaL_prepbuffsize(MAX_ITEM).
  if (typeof value === 'bigint') return value === -9223372036854775808n ? '0x8000000000000000' : String(value);
  if (typeof value === 'number') {
    if (value === Infinity) return '1e9999';
    if (value === -Infinity) return '-1e9999';
    if (Number.isNaN(value)) return '(0/0)';
    return (value < 0 || Object.is(value, -0) ? '-' : '') + '0x' + formatFloatMagnitude(Math.abs(value), 'a', null, false, policy);
  }
  if (value === null || typeof value === 'boolean') return value === null ? 'nil' : String(value);
  return luaArgError(vm,arg,'value has no literal form');
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
    const policy=vm.floatPolicy??'darwin';
    const format = luaCheckString(vm,args[0],1); let argument = 1;
    const buffer = new LuaBuffer(vm);
    // luaL_tolstring pushes an existing string without allocating, but other
    // primitive conversions push a newly interned/managed string and check GC.
    const withString = (value, use) => {
      // luaL_callmeta first pushes the metatable and event name. Even a
      // missing __tostring interns its name when this value has a metatable.
      const metatable = vm.metatableOf(value);
      const metafield = name => {
        if (metatable === null) return null;
        const event = vm.heap.adopt(name), unroot = vm.heap.addRoots(() => [metatable,event]);
        try { buffer.checkpoint(3); return metatable.rawget(name); } finally { unroot(); }
      };
      const method = metafield('__tostring');
      let converted, pushesString = false;
      if (method !== null) {
        converted = vm.call(method,[value],{func:buffer.stackBase+1,checkTop:buffer.stackBase+3})[0] ?? null;
        if (typeof converted === 'number' || typeof converted === 'bigint') { converted = numberToString(converted); pushesString = true; }
        if (!isLuaString(converted)) { const release=vm.heap.addRoots(()=>converted);try{return luaWithAuxTop(vm,1,()=>luaAuxError(vm,"'__tostring' must return a string"));}finally{release();} }
      } else if (isLuaString(value)) converted = value;
      else {
        if (value !== null && typeof value !== 'boolean' && typeof value !== 'number' && typeof value !== 'bigint') metafield('__name');
        converted = value === null ? 'nil' : typeof value === 'boolean' ? String(value)
          : typeof value === 'number' || typeof value === 'bigint' ? numberToString(value) : vm.toLuaString(value);
        pushesString = true;
      }
      const managed = vm.heap.adopt(converted);
      const release = vm.heap.addRoots(() => managed);
      try { if (pushesString) buffer.checkpoint(2); return luaWithAuxTop(vm,1,()=>use(managed)); }
      finally { release(); }
    };
    return luaWithAuxTop(vm,1,()=>{try {
    for (let at = 0; at < format.length;) {
      if (format[at] !== '%') { buffer.add(format[at++]); continue; }
      at++; if (format[at] === '%') { buffer.add('%'); at++; continue; }
      buffer.prepare(120); // str_format prepares before checking the argument.
      if (argument >= args.length) luaArgError(vm,argument+1,'no value');
      const start = at;
      while (at < format.length && '-+#0 123456789.'.includes(format[at])) at++;
      if (at - start + 1 >= 22) luaAuxError(vm,'invalid format (too long)');
      const code = format[at++] ?? '\0', form = '%' + format.slice(start, at);
      const value = args[argument++];
      if (code === 'q') {
        if (form !== '%q') luaAuxError(vm,"specifier '%%q' cannot have modifiers");
        if (value === null || typeof value === 'boolean') withString(value, managed => buffer.addValue(managed));
        else { const literal = quote(value,policy,buffer,vm,argument); if (literal !== undefined) buffer.add(literal); }
        continue;
      }
      if (!'cdiouxXaAfeEgGps'.includes(code)) luaAuxError(vm,"invalid conversion '%s' to 'format'",form);
      if (code === 'f') buffer.prepare(418); // MAX_ITEMF precedes number/format checks.
      const validFlags = acceptedFlags[code] ?? '-+#0 ';
      const valid = new RegExp('^([' + validFlags.replace(/[-\\\]]/g, '\\$&') + ']*)([1-9][0-9]?)?(?:\\.([0-9]{0,2}))?' + code + '$').exec(format.slice(start, at));
      const checkFormat=()=>{if (!valid || (['c','p'].includes(code) && valid[3] !== undefined)) luaAuxError(vm,"invalid conversion specification: '%s'",form);};
      const [, flags, widthText, precisionText] = valid ?? ['', '',undefined,undefined];
      const width = Number(widthText ?? 0), precision = precisionText === undefined ? null : Number(precisionText || 0);
      let body, prefix = '', hexPrefix = '', zeroPadding = flags.includes('0');
      if (code === 's') {
        let direct = false;
        withString(value, managed => {
          body = luaStringBytes(managed);
          if(form!=='%s'){if(body.includes('\0'))luaArgError(vm,argument,'string contains zeros');checkFormat();}
          if (form === '%s' || (precision === null && body.length >= 100)) { buffer.addValue(managed); direct = true; }
        });
        if (direct) continue;
        if (precision !== null) body = body.slice(0, precision);
      } else if (code === 'c') { checkFormat();body = String.fromCharCode(Number(luaCheckInteger(vm,value,argument) & 255n)); zeroPadding = false; }
      else if (code === 'p') { body = pointerText(value);checkFormat(); zeroPadding = false; }
      else if ('diouxX'.includes(code)) {
        const number = luaCheckInteger(vm,value,argument), signed = code === 'd' || code === 'i';checkFormat();
        const magnitude = signed ? number < 0n ? -number : number : BigInt.asUintN(64, number);
        const base = code === 'o' ? 8 : code.toLowerCase() === 'x' ? 16 : 10;
        body = magnitude === 0n && precision === 0 ? '' : magnitude.toString(base);
        if (precision !== null) { body = body.padStart(precision, '0'); zeroPadding = false; }
        if (signed) prefix = number < 0n ? '-' : flags.includes('+') ? '+' : flags.includes(' ') ? ' ' : '';
        if (flags.includes('#') && code === 'o' && !body.startsWith('0')) prefix += '0';
        if (flags.includes('#') && code.toLowerCase() === 'x' && magnitude !== 0n) prefix += '0x';
      } else {
        if(code==='a'||code==='A')checkFormat();
        const number = luaCheckNumber(vm,value,argument);if(code!=='a'&&code!=='A')checkFormat();
        const n = Number(number);
        const negative = floatNegative(n,policy);
        prefix = policy==='darwin'&&Number.isNaN(n)?'':negative ? '-' : flags.includes('+') ? '+' : flags.includes(' ') ? ' ' : '';
        body = formatFloatMagnitude(n, code, precision, flags.includes('#'),policy);
        if (code.toLowerCase() === 'a' && Number.isFinite(n)) hexPrefix = '0x';
        if (!Number.isFinite(n)) zeroPadding = false;
      }
      if ('XAEG'.includes(code)) { body = body.toUpperCase(); prefix = prefix.toUpperCase(); hexPrefix = hexPrefix.toUpperCase(); }
      prefix += hexPrefix;
      const padding = Math.max(0, width - prefix.length - body.length);
      buffer.add(flags.includes('-') ? prefix + body + ' '.repeat(padding) : zeroPadding ? prefix + '0'.repeat(padding) + body : ' '.repeat(padding) + prefix + body);
    }
    return [buffer.finish()];
    } catch (error) { buffer.close(error); throw error; }});
  };
  const formatter = (...args) => formatArray(args);
  formatter.luaInvoke = formatArray;
  lib.rawset('format', formatter);
}
