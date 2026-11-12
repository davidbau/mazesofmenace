/*
 * Copyright (c) 1989 The Regents of the University of California.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms are permitted
 * provided that the above copyright notice and this paragraph are
 * duplicated in all such forms and that any documentation,
 * advertising materials, and other materials related to such
 * distribution and use acknowledge that the software was developed
 * by the University of California, Berkeley. The name of the
 * University may not be used to endorse or promote products derived
 * from this software without specific prior written permission.
 * THIS SOFTWARE IS PROVIDED ``AS IS'' AND WITHOUT ANY EXPRESS OR
 * IMPLIED WARRANTIES, INCLUDING, WITHOUT LIMITATION, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.
 */
/* C-locale table provenance: Apple Libc timelocal.c, originally
 * Copyright (c) 2001 Alexey Zelkin <phantom@FreeBSD.org>
 * Copyright (c) 1997 FreeBSD Inc. All rights reserved.
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
/* Apple Libc strftime.c rev1.44 C-locale _fmt/_conv/_yconv port:
 * https://github.com/apple-oss-distributions/Libc/blob/main/stdtime/FreeBSD/strftime.c
 * Source SHA256 4154547b250a84e98f535d6fc31316c154572ab52c1c4c9f68c2d028d968db8f.
 * C-locale patterns/names follow Apple timelocal.c. Fields use native tm
 * conventions (year since1900, month0..11). Byte strings; format/abbreviation
 * terminate at NUL like C strftime. Capacity includes the required NUL byte.
 * No Date/Intl, native printf, filesystem, host locale, or Wasm dependency.
 */
import {formatTimezoneOffset,parsePosixTimezone,lookupTimezone,TimezoneError} from '../timezone/info.js';
import {makeCalendarTime} from './calendar.js';
import {NATIVE_TIMEZONE_ENTRIES,NATIVE_TIMEZONE_NAMES} from '../timezone/tzdb.js';
const shortDays=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const longDays=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const shortMonths=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const longMonths=['January','February','March','April','May','June','July','August','September','October','November','December'];
const patterns={c:'%a %b %e %H:%M:%S %Y',D:'%m/%d/%y',F:'%Y-%m-%d',R:'%H:%M',r:'%I:%M:%S %p',T:'%H:%M:%S',v:'%e-%b-%Y',X:'%H:%M:%S',x:'%m/%d/%y','+':'%a %b %e %H:%M:%S %Z %Y'};
const add32=(a,b)=>(a+b)|0,sub32=(a,b)=>(a-b)|0;
function byteString(value){if(typeof value!=='string')throw new TypeError('strftime requires byte strings');for(let i=0;i<value.length;i++)if(value.charCodeAt(i)>255)throw new RangeError('strftime requires byte-valued characters');return value.split('\0',1)[0];}
function numeric(value,width=0,space=false,padding=''){
  const text=String(value);if(padding==='-')return text;
  if(padding==='_')space=true;else if(padding==='0')space=false;
  const count=Math.max(0,width-text.length);if(space)return ' '.repeat(count)+text;
  return value<0?'-'+'0'.repeat(count)+text.slice(1):'0'.repeat(count)+text;
}
function yearText(a,b,top,yy){
  let trail=a%100+b%100,lead=Math.trunc(a/100)+Math.trunc(b/100)+Math.trunc(trail/100);trail%=100;
  if(trail<0&&lead>0){trail+=100;lead--;}else if(lead<0&&trail>0){trail-=100;lead++;}
  return (top?(lead===0&&trail<0?'-0':numeric(lead,2)):'')+(yy?numeric(Math.abs(trail),2):'');
}
function isoYear(fields){
  const year=fields.year;let base=1900,yday=fields.yday,w;
  // The native loop subtracts years until yday lies in an ISO year. Skip
  // complete Gregorian400-year cycles for arbitrary int32 negative yday.
  if(yday< -146097){const cycles=Math.trunc((-yday-146097)/146097);yday+=cycles*146097;base-=cycles*400;}
  for(;;){const sum=year%400+base%400,len=sum%4===0&&(sum%100!==0||sum%400===0)?366:365;
    const bot=(sub32(add32(yday,11),fields.wday)%7)-3;let top=bot-len%7;if(top< -3)top+=7;top+=len;
    if(yday>=top){base++;w=1;break;}
    if(yday>=bot){w=1+Math.trunc(sub32(yday,bot)/7);break;}
    base--;const previous=year%400+base%400;yday+=previous%4===0&&(previous%100!==0||previous%400===0)?366:365;
  }
  return {year,base,week:w};
}
function timezoneNames(zone){
  if(zone.startsWith(':'))zone=zone.slice(1);if(zone.startsWith('/usr/share/zoneinfo/'))zone=zone.slice('/usr/share/zoneinfo/'.length);
  const result=['   ','   '],index=Object.hasOwn(NATIVE_TIMEZONE_NAMES,zone)?NATIVE_TIMEZONE_NAMES[zone]:undefined;
  if(index===undefined){if(zone==='')return result;const info=parsePosixTimezone(zone);result[0]=info.standard;if(info.daylight)result[1]=info.daylight;return result;}
  const[times,indexes,types,footer]=NATIVE_TIMEZONE_ENTRIES[index];let info;
  if(footer)try{info=parsePosixTimezone(footer);}catch(error){if(!(error instanceof TimezoneError))throw error;}
  if(info?.daylight)return [info.standard,info.daylight];
  if(times.length===0&&types.length===1){result[0]=types[0][2];return result;}
  const seen=new Set();for(let at=indexes.length-1;at>=0&&seen.size<2;at--){const type=types[indexes[at]];if(!seen.has(type[1])){seen.add(type[1]);result[type[1]]=type[2];}}
  return result;
}
export function formatDarwinTime(format,fields,{zone='UTC',abbreviation=undefined,capacity=250}={}){
  if(!Number.isSafeInteger(capacity)||capacity<0)throw new RangeError('invalid strftime capacity');
  format=byteString(format??'%c');if(abbreviation!==undefined&&abbreviation!==null)abbreviation=byteString(abbreviation);
  for(const key of ['year','month','day','hour','min','sec','wday','yday','isdst'])if(!Number.isInteger(fields[key])||fields[key]< -2147483648||fields[key]>2147483647)throw new RangeError('invalid native strftime field '+key);
  let names;
  function expand(pattern){
    let output='';
    for(let at=0;at<pattern.length;){
      let piece=pattern[at++];
      if(piece==='%'){
        let alternative='',padding='',code;
        for(;;){if(at>=pattern.length){code=null;piece=pattern.at(-1);break;}code=pattern[at++];
          if(code==='E'||code==='O'){if(alternative){piece=code;code=null;break;}alternative=code;continue;}
          if('-_0'.includes(code)){if(padding){piece=code;code=null;break;}padding=code;continue;}
          break;
        }
        if(code!==null){
          if(Object.hasOwn(patterns,code))piece=expand(patterns[code]);
          else switch(code){
            case 'A':piece=longDays[fields.wday]??'?';break;
            case 'a':piece=shortDays[fields.wday]??'?';break;
            case 'B':piece=longMonths[fields.month]??'?';break;
            case 'b':case 'h':piece=shortMonths[fields.month]??'?';break;
            case 'C':piece=yearText(fields.year,1900,true,false);break;
            case 'd':piece=numeric(fields.day,2,false,padding);break;
            case 'e':piece=numeric(fields.day,2,true,padding);break;
            case 'H':piece=numeric(fields.hour,2,false,padding);break;
            case 'I':piece=numeric(fields.hour%12||12,2,false,padding);break;
            case 'j':piece=numeric(add32(fields.yday,1),3,false,padding);break;
            case 'k':piece=numeric(fields.hour,2,true,padding);break;
            case 'l':piece=numeric(fields.hour%12||12,2,true,padding);break;
            case 'M':piece=numeric(fields.min,2,false,padding);break;
            case 'm':piece=numeric(add32(fields.month,1),2,false,padding);break;
            case 'n':piece='\n';break;
            case 'p':piece=fields.hour>=12?'PM':'AM';break;
            case 'S':piece=numeric(fields.sec,2,false,padding);break;
            case 's':{const result=makeCalendarTime(zone,fields);piece=String(result.time);if(result.time!==-1n){const info=lookupTimezone(zone,result.time);(names??=timezoneNames(zone))[info.isdst]=info.abbreviation;}break;}
            case 't':piece='\t';break;
            case 'U':piece=numeric(Math.trunc(sub32(add32(fields.yday,7),fields.wday)/7),2,false,padding);break;
            case 'u':piece=String(fields.wday===0?7:fields.wday);break;
            case 'V':case 'G':case 'g':{const iso=isoYear(fields);piece=code==='V'?numeric(iso.week,2,false,padding):yearText(iso.year,iso.base,code==='G',true);break;}
            case 'W':piece=numeric(Math.trunc(sub32(add32(fields.yday,7),fields.wday?sub32(fields.wday,1):6)/7),2,false,padding);break;
            case 'w':piece=String(fields.wday);break;
            case 'Y':piece=yearText(fields.year,1900,true,true);break;
            case 'y':piece=yearText(fields.year,1900,false,true);break;
            case 'Z':piece=abbreviation!==undefined&&abbreviation!==null?abbreviation:fields.isdst<0?'':(names??=timezoneNames(zone))[Number(fields.isdst!==0)];break;
            case 'z':{const text=formatTimezoneOffset(zone,fields.isdst);piece=text?text[0]+numeric(Number(text.slice(1)),4,false,padding):'';break;}
            default:piece=code;
          }
        }
      }
      output+=piece;
      if(output.length>=capacity)return output; // strftime returns0 if NUL cannot fit.
    }
    return output;
  }
  const output=expand(format);return output.length>=capacity?'':output;
}
