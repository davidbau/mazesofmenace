/* Scoped libc ABI bindings for Lua's JS OS library. No Lua algorithms here.
 * Struct offsets, byte strings and raw int64 times follow the current C ABI. */
import {LuaMemoryError} from './debug.js';
import {lookupTimezone} from '../platform/timezone/info.js';
import {epochToCalendar,makeCalendarTime} from '../platform/darwin/calendar.js';
import {formatDarwinTime} from '../platform/darwin/strftime.js';
const names=['sec','min','hour','day','month','year','wday','yday','isdst'];
// WASI errno numbers transported by the configured libc -> Darwin errno ABI.
const darwinErrno={2:13,8:9,10:16,20:17,22:27,28:22,29:5,31:21,32:62,33:24,37:63,44:2,48:12,51:28,52:78,54:20,55:66,58:45,63:1,69:30,70:29,75:18};
export function createLuaOSServices(services,{platform='darwin'}={}){
  const zone=()=>services.osTimezone?services.osTimezone():Intl.DateTimeFormat().resolvedOptions().timeZone;
  const layout=Array.from({length:10},(_,i)=>services.osTMLayout(i));
  const view=()=>new DataView(services.heap().buffer);
  const allocate=size=>{const p=Number(services.malloc(size));if(!p)throw new LuaMemoryError();services.heap().fill(0,p,p+size);return p;};
  const read=pointer=>{const result={};for(let i=0;i<names.length;i++)result[names[i]]=view().getInt32(pointer+layout[i+1],true);return result;};
  const write=(pointer,fields)=>{for(let i=0;i<names.length;i++)view().setInt32(pointer+layout[i+1],fields[names[i]]??0,true);};
  const bytes=pointer=>{let result='';const heap=services.heap();for(let at=Number(pointer);heap[at];at++)result+=String.fromCharCode(heap[at]);return result;};
  const cstring=text=>{const p=allocate(text.length+1);for(let i=0;i<text.length;i++)services.heap()[p+i]=text.charCodeAt(i);return p;};
  return{
    clock:()=>Number(services.sortClock())/Number(services.osClockRate()),now:()=>BigInt(services.sortTime()),
    difftime:(a,b)=>platform==='darwin'?Number(a-b):services.osDifftime(a,b),
    date:(time,utc)=>{
      const timezone=zone(),info=platform==='darwin'?(utc?{offset:0,isdst:0,abbreviation:'UTC'}:lookupTimezone(timezone,time)):null;
      if(info){
        const fields=epochToCalendar(time,info.offset);if(!fields)return null;fields.isdst=info.isdst;
        return{fields,release:()=>{},format:format=>formatDarwinTime(format,fields,{zone:timezone,abbreviation:info.abbreviation,capacity:250})};
      }
      const pointer=allocate(layout[0]);
      if(!services.osCalendar(time,Number(utc),pointer)){services.free(pointer);return null;}const fields=read(pointer);
      return{fields,release:()=>services.free(pointer),format:format=>{
        const fmt=cstring(format);let output=0;
        try{output=allocate(250);const length=Number(services.osStrftime(output,250,fmt,pointer));return bytes(output).slice(0,length);}
        finally{if(output)services.free(output);services.free(fmt);}
      }};
    },
    makeTime:fields=>{
      if(platform==='darwin')return makeCalendarTime(zone(),fields);
      const pointer=allocate(layout[0]);try{write(pointer,fields);const time=BigInt(services.osMakeTime(pointer));return{time,fields:read(pointer)};}finally{services.free(pointer);}
    },
    file:(operation,from,to)=>{const first=cstring(from);let second=0;try{
      if(to!==null)second=cstring(to);
      const status=operation==='remove'?services.osRemove(first):services.osRename(first,second);
      const errno=services.osErrno();return{status,errno:platform==='darwin'?(darwinErrno[errno]??errno):errno,message:status===0?'':bytes(services.osErrorMessage(errno))};
    }finally{if(second)services.free(second);services.free(first);}},
  };
}
