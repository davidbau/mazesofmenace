/* Native macOS Gregorian timesub/time1/time2sub algorithms, public-domain
 * tzcode, Arthur David Olson (1996-06-05), Apple Libc localtime.c rev8.14:
 * https://github.com/apple-oss-distributions/Libc/blob/main/stdtime/FreeBSD/localtime.c
 * SHA256 05caf174fe2bd123a84a054554dfe2abf8386f4823bda1fa603c804d4ec58b8d.
 * PCTS=1 and UNIX03 behavior are preserved. Integral calendar arithmetic,
 * exact signed64 time search; no Date/Intl/native/files/Wasm dependencies.
 * This POSIX-timescale database has no leap-second records. Fields use native
 * tm conventions: year since1900, month0..11, day1..31, wdaySunday0, yday0.
 */
import {lookupTimezone,parsePosixTimezone,TimezoneError} from './timezone-info.js';
import {NATIVE_TIMEZONE_ENTRIES,NATIVE_TIMEZONE_NAMES} from './native-timezone-data.js';
const MIN_INT=-2147483648,MAX_INT=2147483647,MIN_TIME=-(1n<<63n),MAX_TIME=(1n<<63n)-1n;
const floorDiv=(a,b)=>{const q=a/b;return a%b<0n?q-1n:q;},mod=(a,b)=>((a%b)+b)%b;
const leap=year=>year%4n===0n&&(year%100n!==0n||year%400n===0n);
const int32=value=>Number(BigInt.asIntN(32,BigInt(value)));
function integer(value){if(typeof value==='bigint')return value;if(!Number.isSafeInteger(value))throw new RangeError('calendar requires lossless integral seconds');return BigInt(value);}
function daysFromCivil(year,month,day){year-=BigInt(month<=2);const era=floorDiv(year,400n),yoe=year-era*400n;return era*146097n+yoe*365n+yoe/4n-yoe/100n+BigInt(Math.floor((153*(month+(month>2?-3:9))+2)/5)+day-1)-719468n;}
function civilFromDays(days){const shifted=days+719468n,era=floorDiv(shifted,146097n),doe=shifted-era*146097n,yoe=(doe-doe/1460n+doe/36524n-doe/146096n)/365n;let year=yoe+era*400n;const doy=doe-(365n*yoe+yoe/4n-yoe/100n),mp=(5n*doy+2n)/153n,day=Number(doy-(153n*mp+2n)/5n+1n),month=Number(mp+(mp<10n?3n:-9n));year+=BigInt(month<=2);return {year,month,day};}
export function epochToCalendar(seconds,offset=0){
  const value=integer(seconds)+integer(offset),days=floorDiv(value,86400n),remain=mod(value,86400n),date=civilFromDays(days),year=date.year-1900n;
  if(year<BigInt(MIN_INT)||year>BigInt(MAX_INT))return null;
  return {year:Number(year),month:date.month-1,day:date.day,hour:Number(remain/3600n),min:Number(remain/60n%60n),sec:Number(remain%60n),wday:Number(mod(days+4n,7n)),yday:Number(days-daysFromCivil(date.year,1,1)),isdst:0};
}
function localCalendar(zone,time){const rough=epochToCalendar(time);if(!rough){const year=civilFromDays(floorDiv(time,86400n)).year-1900n;if(year<BigInt(MIN_INT)-1n||year>BigInt(MAX_INT)+1n)return null;}const info=lookupTimezone(zone,time),value=epochToCalendar(time,info.offset);if(value)value.isdst=info.isdst;return value;}
function ruleDay(year,entry){if(entry.kind==='J')return daysFromCivil(year,1,1)+BigInt(entry.parts[0]-1+Number(leap(year)&&entry.parts[0]>=60));if(entry.kind==='N')return daysFromCivil(year,1,1)+BigInt(entry.parts[0]);const[month,week,weekday]=entry.parts,first=daysFromCivil(year,month,1);let day=1+(weekday-Number(mod(first+4n,7n))+7)%7+7*(week-1);const count=[31,leap(year)?29:28,31,30,31,30,31,31,30,31,30,31][month-1];if(day>count)day-=7;return first+BigInt(day-1);}
function posixEvents(info){const out=[];for(let year=1970n;year<=2569n;year++){const start=ruleDay(year,info.start)*86400n+BigInt(info.start.time-info.standardOffset),end=ruleDay(year,info.end)*86400n+BigInt(info.end.time-info.daylightOffset);if(start>end)out.push([end,1],[start,0]);else out.push([start,0],[end,1]);}return out;}
const states=new Map();
function timezoneState(zone){
  if(states.has(zone))return states.get(zone);const original=zone;if(zone.startsWith(':'))zone=zone.slice(1);if(zone.startsWith('/usr/share/zoneinfo/'))zone=zone.slice('/usr/share/zoneinfo/'.length);
  let types,indexes;const index=Object.hasOwn(NATIVE_TIMEZONE_NAMES,zone)?NATIVE_TIMEZONE_NAMES[zone]:undefined;
  if(index!==undefined){let[times,sourceIndexes,sourceTypes,footer]=NATIVE_TIMEZONE_ENTRIES[index];types=sourceTypes.map(type=>type.slice());indexes=sourceIndexes.slice();let info;try{if(footer)info=parsePosixTimezone(footer);}catch(error){if(!(error instanceof TimezoneError))throw error;}
    if(info?.daylight){const base=types.length;types.push([info.daylightOffset,1,info.daylight],[info.standardOffset,0,info.standard]);for(const[at,type]of posixEvents(info))if(indexes.length<1200&&at>BigInt(times.at(-1)??MIN_TIME))indexes.push(base+type);}
  }else{if(zone==='')zone='UTC0';const info=parsePosixTimezone(zone);if(info.daylight){types=[[info.daylightOffset,1,info.daylight],[info.standardOffset,0,info.standard]];indexes=posixEvents(info).map(([,type])=>type);}else{types=[[info.standardOffset,0,info.standard]];indexes=[];}}
  const seen=new Set(),recent=[];for(let at=indexes.length-1;at>=0;at--)if(!seen.has(indexes[at])){seen.add(indexes[at]);recent.push(indexes[at]);}
  const state={types,recent};if(states.size>=128)states.delete(states.keys().next().value);states.set(original,state);return state;
}
const keys=['year','month','day','hour','min','sec'];
function compare(a,b){for(const key of keys)if(a[key]!==b[key])return a[key]<b[key]?-1:1;return 0;}
// Native Apple builds expose int32 wrap in increment_overflow arithmetic:
// its signed-overflow checks are optimized away. Keep observed machine
// semantics (covered at INT_MIN cross-field/DST retries), not a hardened API.
function normalize(input,normalizeSeconds){
  const value={...input};
  const carry=(tens,units,base)=>{const delta=Math.floor(value[units]/base);value[units]-=delta*base;value[tens]=int32(BigInt(value[tens])+BigInt(delta));return true;};
  if(normalizeSeconds&&!carry('min','sec',60)||!carry('hour','min',60)||!carry('day','hour',24))return null;
  let year=BigInt(value.year)+1900n+floorDiv(BigInt(value.month),12n);const month=Number(mod(BigInt(value.month),12n))+1,date=civilFromDays(daysFromCivil(year,month,1)+BigInt(value.day-1));year=date.year-1900n;
  if(year<0n||year>BigInt(MAX_INT))return null;value.year=Number(year);value.month=date.month-1;value.day=date.day;
  let saved=0;if(value.sec<0||value.sec>=60){if(value.year<70){saved=int32(BigInt(value.sec)-59n);value.sec=59;}else{saved=value.sec;value.sec=0;}}
  return {value,saved};
}
function time2sub(zone,input,state,normalizeSeconds){
  const normalized=normalize(input,normalizeSeconds);if(!normalized)return null;const{value:desired,saved}=normalized;let low=MIN_TIME,high=MAX_TIME,time,found;
  for(;;){time=low/2n+high/2n;if(time<low)time=low;else if(time>high)time=high;const actual=localCalendar(zone,time),direction=actual?compare(actual,desired):time>0n?1:-1;
    if(direction!==0){if(time===low){if(time===MAX_TIME)return null;time++;low++;}else if(time===high){if(time===MIN_TIME)return null;time--;high--;}if(low>high)return null;if(direction>0)high=time;else low=time;continue;}
    if(state.types.length===1&&desired.isdst>0)desired.isdst=0;
    if(desired.isdst<0||actual.isdst===desired.isdst){found=true;break;}
    for(let i=state.types.length-1;i>=0&&!found;i--)if(state.types[i][1]===desired.isdst)for(let j=state.types.length-1;j>=0;j--)if(state.types[j][1]!==desired.isdst){const candidate=time+BigInt(state.types[j][0]-state.types[i][0]),other=localCalendar(zone,candidate);if(other&&compare(other,desired)===0&&other.isdst===desired.isdst){time=candidate;found=true;break;}}
    if(!found)return null;break;
  }
  const result=time+BigInt(saved);if(result<MIN_TIME||result>MAX_TIME)return null;const fields=localCalendar(zone,result);return fields?{time:result,fields}:null;
}
function time2(zone,input,state){return time2sub(zone,input,state,false)??time2sub(zone,input,state,true);}
export function makeCalendarTime(zone,fields){
  const input={...fields};for(const key of [...keys,'isdst']){if(input[key]===undefined)input[key]=key==='isdst'?-1:0;if(!Number.isInteger(input[key])||input[key]<MIN_INT||input[key]>MAX_INT)throw new RangeError('native calendar field outside int32: '+key);}
  const state=timezoneState(zone);if(input.isdst>1)input.isdst=1;let result=time2(zone,input,state);if(result)return result;
  if(input.isdst<0)input.isdst=0; // PCTS=1: retry guessing from standard time.
  for(const same of state.recent){if(state.types[same][1]!==input.isdst)continue;for(const other of state.recent){if(state.types[other][1]===input.isdst)continue;const delta=state.types[other][0]-state.types[same][0];input.sec=int32(BigInt(input.sec)+BigInt(delta));input.isdst=Number(!input.isdst);result=time2(zone,input,state);if(result)return result;input.sec=int32(BigInt(input.sec)-BigInt(delta));input.isdst=Number(!input.isdst);}}
  return {time:-1n,fields:input};
}
