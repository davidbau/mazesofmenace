/* Lua5.4.8 lstrlib.c binary packing, translated for the configured LP64,
 * little-endian target. Lua copyright/permission: lua/lobject.js.
 * The common native LuaL_Buffer model owns temporary storage; DataView
 * encodes IEEE float32/float64. Native integer/packsize limits are retained.
 */
import {luaValues,LuaLightUserdata} from './lua/lobject.js';
import {LuaBuffer} from './lua-buffer.js';
import {luaAuxError,luaArgError,luaCheckInteger,luaCheckNumber,luaCheckString,luaWithAuxTop,luaAuxTop} from './lua-aux-error.js';
const MAX_SIZE = 2147483647;
class Format {
  constructor(vm,text) { this.vm=vm;this.text = text.split('\0')[0]; this.at = 0; this.little = true; this.maxalign = 1; }
  number(fallback) {
    if (!/[0-9]/.test(this.text[this.at] ?? '')) return fallback;
    let value = 0;
    do { value = value * 10 + Number(this.text[this.at++]); }
    while (/[0-9]/.test(this.text[this.at] ?? '') && value <= Math.floor((MAX_SIZE - 9) / 10));
    return value;
  }
  limited(fallback) {
    const size = this.number(fallback);
    if (size < 1 || size > 16) luaAuxError(this.vm,'integral size (%d) out of limits [1,%d]',size,16);
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
      if (size === -1) luaAuxError(this.vm,"missing size for format option 'c'");
      return { kind: 'char', size };
    }
    if (code === 'z') return { kind: 'zstr', size: 0 };
    if (code === 'x') return { kind: 'padding', size: 1 };
    if (code === 'X') return { kind: 'align', size: 0 };
    if (code === '<') this.little = true;
    else if (code === '>') this.little = false;
    else if (code === '=') this.little = true;
    else if (code === '!') this.maxalign = this.limited(8);
    else if (code !== ' ') luaAuxError(this.vm,"invalid format option '%c'",code.charCodeAt(0));
    return { kind: 'nop', size: 0 };
  }
  next(total) {
    const option = this.option();
    let alignment = option.size;
    if (option.kind === 'align') {
      if (this.at >= this.text.length) luaArgError(this.vm,1,"invalid next option for option 'X'");
      const next = this.option();
      alignment = next.size;
      if (next.kind === 'char' || alignment === 0) luaArgError(this.vm,1,"invalid next option for option 'X'");
    }
    option.padding = 0;
    if (alignment > 1 && option.kind !== 'char') {
      alignment = Math.min(alignment, this.maxalign);
      if (alignment & (alignment - 1)) luaArgError(this.vm,1,'format asks for alignment not power of 2');
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
function unpackInteger(vm,data, position, size, little, signed) {
  let result = 0n;
  const limit = Math.min(size, 8);
  for (let i = limit - 1; i >= 0; i--) result = (result << 8n) | BigInt(data.charCodeAt(position + (little ? i : size - 1 - i)));
  if (size < 8 && signed) result = BigInt.asIntN(size * 8, result);
  if (size > 8) {
    const extension = signed && BigInt.asIntN(64, result) < 0n ? 255 : 0;
    for (let i = limit; i < size; i++) if (data.charCodeAt(position + (little ? i : size - 1 - i)) !== extension)
      luaAuxError(vm,'%d-byte integer does not fit into Lua Integer',size);
  }
  return BigInt.asIntN(64, result);
}
export function openStringPacking(lib, { string, integer,vm }) {
  const packArray = values => {
    let buffer;
    const header = new Format(vm,luaCheckString(vm,values[0],1));
    buffer=new LuaBuffer(vm,{stackExtra:1});
    const placeholder=new LuaLightUserdata(buffer);
    try{return luaWithAuxTop(vm,2,()=>{
    let total = 0, argument = 1;
    const append = text => {
      buffer.add(text);total+=text.length;
    };
    while (header.at < header.text.length) {
      const option = header.next(total), { kind, size, padding } = option;
      for(let i=0;i<padding;i++)append('\0');
      if (kind === 'nop' || kind === 'align') continue;
      if (kind === 'padding') { append('\0'); continue; }
      const value=argument<values.length?values[argument]:argument===values.length?null:argument===values.length+1?buffer.box??placeholder:undefined;argument++;
      if (kind === 'int' || kind === 'uint') {
        const number = luaCheckInteger(vm,value,argument);
        if (size < 8) {
          if (kind === 'int') { const limit = 1n << BigInt(size * 8 - 1); if (number < -limit || number >= limit) luaArgError(vm,argument,'integer overflow'); }
          else if (BigInt.asUintN(64, number) >= 1n << BigInt(size * 8)) luaArgError(vm,argument,'unsigned overflow');
        }
        append(byteString(integerBytes(number, size, header.little, kind === 'int')));
      } else if (kind === 'float') {
        const number = luaCheckNumber(vm,value,argument);
        const bytes = new Uint8Array(size), view = new DataView(bytes.buffer);
        if (size === 4) view.setFloat32(0, Number(number), header.little); else view.setFloat64(0, Number(number), header.little);
        append(byteString(bytes));
      } else {
        const text = luaCheckString(vm,value,argument);
        if (kind === 'char') {
          if (text.length > size) luaArgError(vm,argument,'string longer than given size');
          append(text); for(let i=text.length;i<size;i++)append('\0');
        } else if (kind === 'string') {
          if (size < 8 && BigInt(text.length) >= 1n << BigInt(size * 8)) luaArgError(vm,argument,'string length does not fit in given size');
          append(byteString(integerBytes(BigInt(text.length), size, header.little, false))); append(text);
        } else {
          if (text.includes('\0')) luaArgError(vm,argument,'string contains zeros');
          append(text); append('\0');
        }
      }
    }
    return [buffer.finish()];
    });
    }catch(error){buffer?.close(error);throw error;}finally{buffer?.close();}
  };
  const packer = (...args) => packArray(args);
  packer.luaInvoke = packArray;
  lib.rawset('pack', packer);
  lib.rawset('packsize', format => {
    const header = new Format(vm,luaCheckString(vm,format,1)); let total = 0;
    while (header.at < header.text.length) {
      const { kind, size, padding } = header.next(total);
      if (kind === 'string' || kind === 'zstr') luaArgError(vm,1,'variable-length format');
      if (total > MAX_SIZE - size - padding) luaArgError(vm,1,'format result too large');
      total += size + padding;
    }
    return [BigInt(total)];
  });
  lib.rawset('unpack', (format, input, initial = 1n) => {
    const header = new Format(vm,luaCheckString(vm,format,1)), data = luaCheckString(vm,input,2), output = luaValues();
    const start = luaCheckInteger(vm,initial??1n,3),release=vm.heap.addRoots(()=>output);
    try{
    let position = Number(start > 0n ? start - 1n : start === 0n ? 0n
      : -start > BigInt(data.length) ? 0n : BigInt(data.length) + start);
    if (position > data.length) luaArgError(vm,3,'initial position out of string');
    while (header.at < header.text.length) {
      const { kind, size, padding } = luaWithAuxTop(vm,output.length,()=>header.next(position));
      if (size + padding > data.length - position) luaWithAuxTop(vm,output.length,()=>luaArgError(vm,2,'data string too short'));
      position += padding;
      const top=luaAuxTop(vm)+output.length;
      if(!vm.heap.checkStack(vm.currentThread,top,2,{safe:false,gc:false}))luaWithAuxTop(vm,output.length,()=>luaAuxError(vm,'stack overflow (%s)','too many results'));
      const pushString=bytes=>{const value=vm.heap.withStackTop(top,()=>vm.heap.adopt(bytes));output.push(value);vm.heap.withStackTop(top+1,()=>vm.heap.checkpoint());};
      if (kind === 'int' || kind === 'uint') output.push(luaWithAuxTop(vm,output.length,()=>unpackInteger(vm,data,position,size,header.little,kind==='int')));
      else if (kind === 'float') {
        const bytes = Uint8Array.from(data.slice(position, position + size), character => character.charCodeAt(0));
        const view = new DataView(bytes.buffer);
        output.push(size === 4 ? view.getFloat32(0, header.little) : view.getFloat64(0, header.little));
      } else if (kind === 'char') pushString(data.slice(position, position + size));
      else if (kind === 'string') {
        const length = BigInt.asUintN(64,luaWithAuxTop(vm,output.length,()=>unpackInteger(vm,data,position,size,header.little,false)));
        if(length>BigInt(data.length-position-size))luaWithAuxTop(vm,output.length,()=>luaArgError(vm,2,'data string too short'));
        pushString(data.slice(position+size,position+size+Number(length)));position+=Number(length);
      } else if (kind === 'zstr') {
        const end = data.indexOf('\0', position);
        if(end<0)luaWithAuxTop(vm,output.length,()=>luaArgError(vm,2,"unfinished string for format 'z'"));
        pushString(data.slice(position,end));position=end+1;
      }
      position += size;
    }
    output.push(BigInt(position + 1)); return output;
    }finally{release();}
  });
}
