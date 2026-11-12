/* Native macOS TZDB2026c timezone lookup; TZif v2+ transition tables plus
 * POSIX TZ/footer rules. IANA data is public domain (native-timezone-data.js
 * includes source-file hashes). Calendar arithmetic uses integral seconds,
 * independent of Date/Intl, locale, host TZ, Node, files, network or Wasm.
 * Offsets are seconds EAST of UTC. Unknown names and unsupported TZ syntax
 * fail explicitly; an invented offset abbreviation is never substituted.
 * Apple localtime.c native limits are preserved: unsigned rule-times,
 * explicit POSIX transitions1970..2569, TZif footer400-year extrapolation.
 * Source https://github.com/apple-oss-distributions/Libc/blob/main/stdtime/FreeBSD/localtime.c
 * SHA256 05caf174fe2bd123a84a054554dfe2abf8386f4823bda1fa603c804d4ec58b8d.
 * Source tzcode algorithms/data are public domain.
 */
import {NATIVE_TIMEZONE_ENTRIES,NATIVE_TIMEZONE_NAMES,NATIVE_TIMEZONE_META} from './tzdb.js';
export const timezoneDataVersion=NATIVE_TIMEZONE_META.version;
export class TimezoneError extends Error {constructor(message){super(message);this.name='TimezoneError';}}
const parsed=new Map(),floorDiv=(a,b)=>{const q=a/b;return a%b<0n?q-1n:q;},mod=(a,b)=>((a%b)+b)%b;
const leap=year=>year%4n===0n&&(year%100n!==0n||year%400n===0n);
function daysFromCivil(year,month,day){
  year-=BigInt(month<=2);const era=floorDiv(year,400n),yoe=year-era*400n;
  const doy=BigInt(Math.floor((153*(month+(month>2?-3:9))+2)/5)+day-1);
  return era*146097n+yoe*365n+yoe/4n-yoe/100n+doy-719468n;
}
function civilYear(days){
  days+=719468n;const era=floorDiv(days,146097n),doe=days-era*146097n;
  const yoe=(doe-doe/1460n+doe/36524n-doe/146096n)/365n;
  const doy=doe-(365n*yoe+yoe/4n-yoe/100n),mp=(5n*doy+2n)/153n;
  return yoe+era*400n+BigInt(mp>=10n);
}
function seconds(value){if(typeof value==='bigint')return value;if(!Number.isSafeInteger(value))throw new TimezoneError('timezone lookup needs integral, lossless epoch seconds');return BigInt(value);}
function timeValue(text,maximum=167){
  const match=/^([+-]?)(\d{1,3})(?::(\d{1,2})(?::(\d{1,2}))?)?$/.exec(text);
  if(!match||Number(match[2])>maximum||Number(match[3]??0)>59||Number(match[4]??0)>60)throw new TimezoneError('invalid POSIX timezone time');
  return (match[1]==='-'?-1:1)*(Number(match[2])*3600+Number(match[3]??0)*60+Number(match[4]??0));
}
function rule(text){
  const match=/^(J\d{1,3}|M\d{1,2}\.\d\.\d|\d{1,3})(?:\/(\d{1,3}(?::\d{1,2}(?::\d{1,2})?)?))?$/.exec(text);
  if(!match)throw new TimezoneError('invalid POSIX timezone transition rule');
  const kind=match[1][0],parts=kind==='M'?match[1].slice(1).split('.').map(Number):[Number(kind==='J'?match[1].slice(1):match[1])];
  if(kind==='M'?(parts[0]<1||parts[0]>12||parts[1]<1||parts[1]>5||parts[2]>6):parts[0]<(kind==='J'?1:0)||parts[0]>(kind==='J'?365:365))throw new TimezoneError('out-of-range POSIX timezone transition rule');
  return {kind:kind==='M'||kind==='J'?kind:'N',parts,time:match[2]===undefined?7200:timeValue(match[2]),basis:match[3]??'w'};
}
export function parsePosixTimezone(text){
  if(typeof text!=='string'||!text||text.includes('\0'))throw new TimezoneError('invalid POSIX timezone string');
  let cursor=0;
  const name=()=>{const match=/^(?:<([A-Za-z0-9+\-]+)>|([A-Za-z]{3,}))/.exec(text.slice(cursor));if(!match)throw new TimezoneError('invalid POSIX timezone abbreviation');cursor+=match[0].length;return match[1]??match[2];};
  const offset=()=>{const match=/^[+-]?\d{1,3}(?::\d{1,2}(?::\d{1,2})?)?/.exec(text.slice(cursor));if(!match)throw new TimezoneError('missing POSIX timezone offset');cursor+=match[0].length;return -timeValue(match[0]);};
  const standard=name(),standardOffset=offset();
  if(cursor===text.length)return {standard,standardOffset,daylight:null};
  const daylight=name(),daylightOffset=cursor===text.length||text[cursor]===','?standardOffset+3600:offset();
  if(text[cursor++]!==',')throw new TimezoneError('DST timezone without explicit rules is unsupported unless present in pinned TZDB');
  const rules=text.slice(cursor).split(',');if(rules.length!==2)throw new TimezoneError('POSIX timezone needs two transition rules');
  return {standard,standardOffset,daylight,daylightOffset,start:rule(rules[0]),end:rule(rules[1])};
}
function ruleDay(year,entry){
  if(entry.kind==='J')return daysFromCivil(year,1,1)+BigInt(entry.parts[0]-1+Number(leap(year)&&entry.parts[0]>=60));
  if(entry.kind==='N')return daysFromCivil(year,1,1)+BigInt(entry.parts[0]);
  const [month,week,weekday]=entry.parts,first=daysFromCivil(year,month,1),firstWeekday=Number(mod(first+4n,7n));
  let day=1+(weekday-firstWeekday+7)%7+7*(week-1);
  const count=[31,leap(year)?29:28,31,30,31,30,31,31,30,31,30,31][month-1];if(day>count)day-=7;
  return first+BigInt(day-1);
}
function transition(year,entry,before,standardOffset){
  const offset=entry.basis==='s'?standardOffset:'ugz'.includes(entry.basis)?0:before;
  return ruleDay(year,entry)*86400n+BigInt(entry.time-offset);
}
function lookupPosix(info,epoch,extended=false){
  if(!info.daylight)return {abbreviation:info.standard,offset:info.standardOffset,isdst:0};
  let year=civilYear(floorDiv(epoch+BigInt(info.standardOffset),86400n));let last=null,daylight=false;
  if(!extended){if(epoch<0n)return {abbreviation:info.standard,offset:info.standardOffset,isdst:0};if(year>2569n)year=2569n;}
  for(let adjacent=year-1n;adjacent<=year+1n;adjacent++){if(!extended&&(adjacent<1970n||adjacent>2569n))continue;for(const[entry,next,before]of[[info.start,true,info.standardOffset],[info.end,false,info.daylightOffset]]){
    const at=transition(adjacent,entry,before,info.standardOffset);if(at<=epoch&&(last===null||at>last)){last=at;daylight=next;}
  }}
  return {abbreviation:daylight?info.daylight:info.standard,offset:daylight?info.daylightOffset:info.standardOffset,isdst:Number(daylight)};
}
function cached(text){if(!parsed.has(text)){if(parsed.size>=256)parsed.delete(parsed.keys().next().value);parsed.set(text,parsePosixTimezone(text));}return parsed.get(text);}
export function lookupTimezone(zone,epochSeconds){
  if(typeof zone!=='string'||zone.includes('\0'))throw new TimezoneError('timezone name must be a byte string');
  if(zone.startsWith(':'))zone=zone.slice(1);
  if(zone.startsWith('/usr/share/zoneinfo/'))zone=zone.slice('/usr/share/zoneinfo/'.length);
  const epoch=seconds(epochSeconds),index=Object.hasOwn(NATIVE_TIMEZONE_NAMES,zone)?NATIVE_TIMEZONE_NAMES[zone]:undefined;
  if(index===undefined){if(zone==='')return {abbreviation:'UTC',offset:0,isdst:0};try{return lookupPosix(cached(zone),epoch);}catch(error){throw new TimezoneError(`unsupported timezone ${JSON.stringify(zone)}: ${error.message}`);}}
  const [times,indexes,types,footer]=NATIVE_TIMEZONE_ENTRIES[index];
  if(footer&&(times.length===0||epoch>BigInt(times.at(-1)))){let info;try{info=cached(footer);}catch(error){if(!(error instanceof TimezoneError))throw error;}if(info)return lookupPosix(info,epoch,true);}
  let left=0,right=times.length;while(left<right){const mid=(left+right)>>1;if(BigInt(times[mid])<=epoch)left=mid+1;else right=mid;}
  const [offset,isdst,abbreviation]=types[left?indexes[left-1]:Math.max(0,types.findIndex(type=>type[1]===0))];return {abbreviation,offset,isdst};
}

// Native settzname walks the loaded transition types backwards; %z chooses
// these process-wide offsets solely from tm_isdst, even for a gmtime tm.
export function getTimezoneOffsets(zone){
  if(typeof zone!=='string'||zone.includes('\0'))throw new TimezoneError('invalid timezone name');
  if(zone.startsWith(':'))zone=zone.slice(1);if(zone.startsWith('/usr/share/zoneinfo/'))zone=zone.slice('/usr/share/zoneinfo/'.length);
  const index=Object.hasOwn(NATIVE_TIMEZONE_NAMES,zone)?NATIVE_TIMEZONE_NAMES[zone]:undefined;
  if(index===undefined){if(zone==='')return {standard:0,daylight:0};const info=cached(zone);return {standard:info.standardOffset,daylight:info.daylight?info.daylightOffset:info.standardOffset};}
  const [times,indexes,types,footer]=NATIVE_TIMEZONE_ENTRIES[index];
  if(footer){let info;try{info=cached(footer);}catch(error){if(!(error instanceof TimezoneError))throw error;}if(info?.daylight)return {standard:info.standardOffset,daylight:info.daylightOffset};}
  let standard,daylight;for(let at=indexes.length-1;at>=0&&(standard===undefined||daylight===undefined);at--){const [offset,dst]=types[indexes[at]];if(dst){daylight??=offset;}else standard??=offset;}
  const fallback=types[indexes[0]??0][0];return {standard:standard??fallback,daylight:daylight??fallback};
}
export function formatTimezoneOffset(zone,isdst){
  if(isdst<0)return '';const info=getTimezoneOffsets(zone),offset=isdst?info.daylight:info.standard,minutes=Math.floor(Math.abs(offset)/60);
  return (offset<0?'-':'+')+String(Math.floor(minutes/60)*100+minutes%60).padStart(4,'0');
}
