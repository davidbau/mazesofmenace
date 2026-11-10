/* Lua5.4.8 lstrlib.c binary packing, translated for the configured LP64,
 * little-endian target. Lua copyright/permission: lua/lobject.js.
 * Byte strings replace luaL_Buffer; DataView encodes IEEE float32/float64.
 * Resource bounds are explicit and do not claim identical allocator limits.
 */
import { LuaError, toNumber, luaValues } from './lua/lobject.js';
const MAX_SIZE = 2147483647;
const MAX_OUTPUT = 10000000;
const fail = message => { throw new LuaError(message); };
class Format {
  constructor(text) { this.text = text.split('\0')[0]; this.at = 0; this.little = true; this.maxalign = 1; }
  number(fallback) {
    if (!/[0-9]/.test(this.text[this.at] ?? '')) return fallback;
    let value = 0;
    do { value = value * 10 + Number(this.text[this.at++]); }
    while (/[0-9]/.test(this.text[this.at] ?? '') && value <= Math.floor((MAX_SIZE - 9) / 10));
    return value;
  }
  limited(fallback) {
    const size = this.number(fallback);
    if (size < 1 || size > 16) fail(`integral size (${size}) out of limits [1,16]`);
    return size;
  }
  option() {
    const code = this.text[this.at++];
    if ('bhlj'.includes(code)) return { kind: 'int', size: { b: 1, h: 2, l: 8, j: 8 }[code] };
    if ('BHLJT'.includes(code)) return { kind: 'uint', size: { B: 1, H: 2, L: 8, J: 8, T: 8 }[code] };
    if ('fnd'.includes(code)) return { kind: 'float', size: code === 'f' ? 4 : 8 };
    if (code === 'i' || code === 'I') return { kind: code === 'i' ? 'int' : 'uint', size: this.limited(4) };
    if (code === 's') return { kind: 'string', size: this.limited(8) };
    if (code === 'c') {
      const size = this.number(-1);
      if (size === -1) fail("missing size for format option 'c'");
      return { kind: 'char', size };
    }
    if (code === 'z') return { kind: 'zstr', size: 0 };
    if (code === 'x') return { kind: 'padding', size: 1 };
    if (code === 'X') return { kind: 'align', size: 0 };
    if (code === '<') this.little = true;
    else if (code === '>') this.little = false;
    else if (code === '=') this.little = true;
    else if (code === '!') this.maxalign = this.limited(8);
    else if (code !== ' ') fail(`invalid format option '${code}'`);
    return { kind: 'nop', size: 0 };
  }
  next(total) {
    const option = this.option();
    let alignment = option.size;
    if (option.kind === 'align') {
      if (this.at >= this.text.length) fail("invalid next option for option 'X'");
      const next = this.option();
      alignment = next.size;
      if (next.kind === 'char' || alignment === 0) fail("invalid next option for option 'X'");
    }
    option.padding = 0;
    if (alignment > 1 && option.kind !== 'char') {
      alignment = Math.min(alignment, this.maxalign);
      if (alignment & (alignment - 1)) fail('format asks for alignment not power of 2');
      option.padding = (alignment - (total & (alignment - 1))) & (alignment - 1);
    }
    return option;
  }
}
function byteString(bytes) {
  let result = '';
  for (let i = 0; i < bytes.length; i += 8192) result += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return result;
}
function integerBytes(number, size, little, signed) {
  let value = signed ? BigInt.asIntN(size * 8, number) : BigInt.asUintN(64, number);
  const bytes = new Uint8Array(size);
  for (let i = 0; i < size; i++) { bytes[little ? i : size - i - 1] = Number(value & 255n); value >>= 8n; }
  return bytes;
}
function unpackInteger(data, position, size, little, signed) {
  let result = 0n;
  const limit = Math.min(size, 8);
  for (let i = limit - 1; i >= 0; i--) result = (result << 8n) | BigInt(data.charCodeAt(position + (little ? i : size - 1 - i)));
  if (size < 8 && signed) result = BigInt.asIntN(size * 8, result);
  if (size > 8) {
    const extension = signed && BigInt.asIntN(64, result) < 0n ? 255 : 0;
    for (let i = limit; i < size; i++) if (data.charCodeAt(position + (little ? i : size - 1 - i)) !== extension)
      fail(`${size}-byte integer does not fit into Lua Integer`);
  }
  return BigInt.asIntN(64, result);
}
export function openStringPacking(lib, { string, integer }) {
  const packArray = values => {
    const header = new Format(string(values[0])), parts = [];
    let total = 0, argument = 1;
    const append = text => {
      if (total + text.length > MAX_OUTPUT) fail('resulting string too large');
      parts.push(text); total += text.length;
    };
    while (header.at < header.text.length) {
      const option = header.next(total), { kind, size, padding } = option;
      if (size > MAX_OUTPUT || padding > MAX_OUTPUT) fail('resulting string too large');
      append('\0'.repeat(padding));
      if (kind === 'nop' || kind === 'align') continue;
      if (kind === 'padding') { append('\0'); continue; }
      const value = values[argument++];
      if (kind === 'int' || kind === 'uint') {
        const number = integer(value);
        if (size < 8) {
          if (kind === 'int') { const limit = 1n << BigInt(size * 8 - 1); if (number < -limit || number >= limit) fail('integer overflow'); }
          else if (BigInt.asUintN(64, number) >= 1n << BigInt(size * 8)) fail('unsigned overflow');
        }
        append(byteString(integerBytes(number, size, header.little, kind === 'int')));
      } else if (kind === 'float') {
        const number = toNumber(value); if (number === null) fail('number expected');
        const bytes = new Uint8Array(size), view = new DataView(bytes.buffer);
        if (size === 4) view.setFloat32(0, Number(number), header.little); else view.setFloat64(0, Number(number), header.little);
        append(byteString(bytes));
      } else {
        const text = string(value);
        if (kind === 'char') {
          if (text.length > size) fail('string longer than given size');
          append(text); append('\0'.repeat(size - text.length));
        } else if (kind === 'string') {
          if (size < 8 && BigInt(text.length) >= 1n << BigInt(size * 8)) fail('string length does not fit in given size');
          append(byteString(integerBytes(BigInt(text.length), size, header.little, false))); append(text);
        } else {
          if (text.includes('\0')) fail('string contains zeros');
          append(text); append('\0');
        }
      }
    }
    return [parts.join('')];
  };
  const packer = (...args) => packArray(args);
  packer.luaInvoke = packArray;
  lib.rawset('pack', packer);
  lib.rawset('packsize', format => {
    const header = new Format(string(format)); let total = 0;
    while (header.at < header.text.length) {
      const { kind, size, padding } = header.next(total);
      if (kind === 'string' || kind === 'zstr') fail('variable-length format');
      if (total > MAX_SIZE - size - padding) fail('format result too large');
      total += size + padding;
    }
    return [BigInt(total)];
  });
  lib.rawset('unpack', (format, input, initial = 1n) => {
    const header = new Format(string(format)), data = string(input), output = luaValues();
    const start = integer(initial ?? 1n);
    let position = Number(start > 0n ? start - 1n : start === 0n ? 0n
      : -start > BigInt(data.length) ? 0n : BigInt(data.length) + start);
    if (position > data.length) fail('initial position out of string');
    while (header.at < header.text.length) {
      const { kind, size, padding } = header.next(position);
      if (size + padding > data.length - position) fail('data string too short');
      position += padding;
      if (kind === 'int' || kind === 'uint') output.push(unpackInteger(data, position, size, header.little, kind === 'int'));
      else if (kind === 'float') {
        const bytes = Uint8Array.from(data.slice(position, position + size), character => character.charCodeAt(0));
        const view = new DataView(bytes.buffer);
        output.push(size === 4 ? view.getFloat32(0, header.little) : view.getFloat64(0, header.little));
      } else if (kind === 'char') output.push(data.slice(position, position + size));
      else if (kind === 'string') {
        const length = BigInt.asUintN(64, unpackInteger(data, position, size, header.little, false));
        if (length > BigInt(data.length - position - size)) fail('data string too short');
        output.push(data.slice(position + size, position + size + Number(length))); position += Number(length);
      } else if (kind === 'zstr') {
        const end = data.indexOf('\0', position);
        if (end < 0) fail("unfinished string for format 'z'");
        output.push(data.slice(position, end)); position = end + 1;
      }
      position += size;
    }
    output.push(BigInt(position + 1)); return output;
  });
}
