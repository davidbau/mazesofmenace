/* Darwin-compatible IEEE binary64 decimal/hex formatting.
 * Explicit policy "musl" preserves the former configured Emscripten variant.
 * Darwin hex rounding follows Apple Libc gdtoa/FreeBSD/_hdtoa.c, rev1.5;
 * https://github.com/apple-oss-distributions/Libc/blob/main/gdtoa/FreeBSD/_hdtoa.c
 * Source SHA256: 7c50ad95d6754d54ebc272de2fb904082bfd9b2ee80f762ed123fa2cc633ebfd.
 * It intentionally tests the NEXT discarded digit parity at halfway.
 * Darwin vfprintf.c also discards every sign/plus/space flag on NaN.
 * Exact rational decimal arithmetic implements round-to-nearest, ties-to-even.
 * No host printf, Wasm, Node or locale dependency; precisions are caller-bounded.
 * The caller supplies sign, field width and case.
 */
const floatBits = new DataView(new ArrayBuffer(8));
const power10 = exponent => 10n ** BigInt(exponent);
function rational(value) {
  floatBits.setFloat64(0, value, false);
  const bits = floatBits.getBigUint64(0, false), exponent = Number(bits >> 52n & 2047n);
  let numerator = bits & 0xfffffffffffffn;
  if (exponent) numerator |= 1n << 52n;
  const shift = exponent ? exponent - 1075 : -1074;
  return shift >= 0 ? [numerator << BigInt(shift), 1n] : [numerator, 1n << BigInt(-shift)];
}
function rounded(value, places) {
  let [numerator, denominator] = rational(value);
  if (places >= 0) numerator *= power10(places); else denominator *= power10(-places);
  const result = numerator / denominator, remainder = numerator % denominator;
  return result + BigInt(remainder * 2n > denominator || remainder * 2n === denominator && (result & 1n) !== 0n);
}
function decimalExponent(value) {
  if (!value) return 0;
  let exponent = Math.floor(Math.log10(value));
  const [numerator, denominator] = rational(value);
  const compare = n => n >= 0 ? numerator - denominator * power10(n) : numerator * power10(-n) - denominator;
  while (compare(exponent) < 0n) exponent--;
  while (compare(exponent + 1) >= 0n) exponent++;
  return exponent;
}
function fixed(value, precision, alternate) {
  let digits = rounded(value, precision).toString().padStart(precision + 1, '0');
  if (precision) digits = digits.slice(0, -precision) + '.' + digits.slice(-precision);
  else if (alternate) digits += '.';
  return digits;
}
function exponential(value, precision, alternate) {
  let exponent = decimalExponent(value), digits = rounded(value, precision - exponent);
  if (digits >= power10(precision + 1)) { digits /= 10n; exponent++; }
  let text = digits.toString().padStart(precision + 1, '0');
  text = text[0] + (precision || alternate ? '.' + text.slice(1) : '');
  return text + 'e' + (exponent < 0 ? '-' : '+') + String(Math.abs(exponent)).padStart(2, '0');
}
function hexadecimalMusl(value, precision, alternate) {
  floatBits.setFloat64(0, value, false);
  const bits = floatBits.getBigUint64(0, false), storedExponent = Number(bits >> 52n & 2047n);
  let fraction = bits & 0xfffffffffffffn;
  let exponent = storedExponent ? storedExponent - 1023 : value ? -1022 : 0;
  let mantissa = fraction | (storedExponent ? 1n << 52n : 0n);
  if (!storedExponent && value) {
    // Configured musl normalizes subnormals before %a; host libc may instead
    // keep a zero leading digit with exponent-1022.
    const shift = 53 - fraction.toString(2).length;
    mantissa <<= BigInt(shift); exponent -= shift;
    fraction = mantissa & 0xfffffffffffffn;
  }
  if (precision === null || precision === 12) {
    // Pinned Emscripten musl disables hex rounding at p>=53/4-1 (=12),
    // then emits all nonzero fraction digits. At12 a 13th digit survives;
    // precision is only a minimum padding width. Preserve that C quirk.
    const text = fraction.toString(16).padStart(13, '0').replace(/0+$/, '').padEnd(precision === 12 ? 12 : 0, '0');
    return (value ? '1' : '0') + (text || alternate ? '.' + text : '') + 'p' + (exponent < 0 ? '-' : '+') + Math.abs(exponent);
  }
  if (precision < 13) {
    const shift = BigInt(52 - precision * 4), divisor = 1n << shift;
    const result = mantissa / divisor, remainder = mantissa % divisor;
    mantissa = result + BigInt(remainder * 2n > divisor || remainder * 2n === divisor && (result & 1n) !== 0n);
  } else mantissa <<= BigInt((precision - 13) * 4);
  const text = mantissa.toString(16).padStart(precision + 1, '0');
  return text.slice(0, text.length - precision || undefined) + (precision || alternate ? '.' + (precision ? text.slice(-precision) : '') : '')
    + 'p' + (exponent < 0 ? '-' : '+') + Math.abs(exponent);
}
/* Hex digit rounding follows Apple's retained FreeBSD implementation.
 * Copyright (c) 2004, 2005 David Schultz <das@FreeBSD.ORG>.
 * All rights reserved.
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 * 1. Redistributions of source code must retain the above copyright notice,
 *    this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 * THIS SOFTWARE IS PROVIDED BY THE AUTHOR AND CONTRIBUTORS ``AS IS'' AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE AUTHOR OR CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
 * ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
function hexadecimalDarwin(value, precision, alternate) {
  floatBits.setFloat64(0,value,false);
  const bits=floatBits.getBigUint64(0,false),storedExponent=Number(bits>>52n&2047n);
  let fraction=bits&0xfffffffffffffn,exponent=storedExponent?storedExponent-1023:0;
  if(!storedExponent&&value){const shift=53-fraction.toString(2).length;fraction=(fraction<<BigInt(shift))&0xfffffffffffffn;exponent=-1022-shift;}
  const digits=[value?1:0,...fraction.toString(16).padStart(13,'0').split('').map(n=>parseInt(n,16))];
  if(precision===null){while(digits.length>1&&digits.at(-1)===0)digits.pop();}
  else{
    const count=precision+1;
    // Apple dorounding: this is deliberately not conventional ties-to-even.
    if(value&&count<14&&digits[count]!==0&&(digits[count]>8||digits[count]===8&&(digits[count+1]&1))){
      let at=count-1;while(digits[at]===15){digits[at--]=0;}if(at<0){digits[0]=1;exponent+=4;}else digits[at]++;
    }
    digits.length=Math.min(digits.length,count);while(digits.length<count)digits.push(0);
  }
  return digits[0].toString(16)+(digits.length>1||alternate?'.'+digits.slice(1).map(n=>n.toString(16)).join(''):'')+'p'+(exponent<0?'-':'+')+Math.abs(exponent);
}
export function formatFloatMagnitude(value, code, precision, alternate, policy = 'darwin') {
  if(policy!=='darwin'&&policy!=='musl')throw new RangeError('unknown C float policy');
  if (Number.isNaN(value)) return 'nan';
  if (!Number.isFinite(value)) return 'inf';
  value = Math.abs(value);
  const lower = code.toLowerCase();
  if (lower === 'a') return (policy==='musl'?hexadecimalMusl:hexadecimalDarwin)(value, precision, alternate);
  precision ??= 6;
  if (lower === 'f') return fixed(value, precision, alternate);
  if (lower === 'e') return exponential(value, precision, alternate);
  if (precision === 0) precision = 1;
  let exponent = decimalExponent(value);
  if (rounded(value, precision - 1 - exponent) >= power10(precision)) exponent++;
  let text = exponent < -4 || exponent >= precision ? exponential(value, precision - 1, alternate)
    : fixed(value, Math.max(0, precision - 1 - exponent), alternate);
  if (!alternate) {
    const [mantissa, exp] = text.split('e');
    text = (mantissa.includes('.') ? mantissa.replace(/0+$/, '').replace(/\.$/, '') : mantissa) + (exp === undefined ? '' : 'e' + exp);
  }
  return text;
}
export function floatNegative(value, policy = 'darwin') {
  if(policy==='darwin'&&Number.isNaN(value))return false;
  floatBits.setFloat64(0, value, false);
  return (floatBits.getBigUint64(0, false) >> 63n) !== 0n;
}
