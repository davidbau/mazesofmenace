/* Scoped libc ABI bindings for Lua's JS OS library. No Lua algorithms here.
 * Struct offsets, byte strings and raw int64 times follow the current C ABI. */
import {LuaMemoryError} from './lua-debug.js';
const names=['sec','min','hour','day','month','year','wday','yday','isdst'];
export function createLuaOSServices(services){
  const layout=Array.from({length:10},(_,i)=>services.osTMLayout(i));
  const view=()=>new DataView(services.heap().buffer);
  const allocate=size=>{const p=Number(services.malloc(size));if(!p)throw new LuaMemoryError();services.heap().fill(0,p,p+size);return p;};
  const read=pointer=>{const result={};for(let i=0;i<names.length;i++)result[names[i]]=view().getInt32(pointer+layout[i+1],true);return result;};
  const write=(pointer,fields)=>{for(let i=0;i<names.length;i++)view().setInt32(pointer+layout[i+1],fields[names[i]]??0,true);};
  const bytes=pointer=>{let result='';const heap=services.heap();for(let at=Number(pointer);heap[at];at++)result+=String.fromCharCode(heap[at]);return result;};
  const cstring=text=>{const p=allocate(text.length+1);for(let i=0;i<text.length;i++)services.heap()[p+i]=text.charCodeAt(i);return p;};
  return{
    clock:()=>Number(services.sortClock())/Number(services.osClockRate()),now:()=>BigInt(services.sortTime()),
    difftime:(a,b)=>services.osDifftime(a,b),
    date:(time,utc)=>{
      const pointer=allocate(layout[0]);
      if(!services.osCalendar(time,Number(utc),pointer)){services.free(pointer);return null;}
      return{fields:read(pointer),release:()=>services.free(pointer),format:format=>{
        const fmt=cstring(format);let output=0;
        try{output=allocate(250);const length=Number(services.osStrftime(output,250,fmt,pointer));return bytes(output).slice(0,length);}
        finally{if(output)services.free(output);services.free(fmt);}
      }};
    },
    makeTime:fields=>{const pointer=allocate(layout[0]);try{write(pointer,fields);const time=BigInt(services.osMakeTime(pointer));return{time,fields:read(pointer)};}finally{services.free(pointer);}},
    file:(operation,from,to)=>{const first=cstring(from);let second=0;try{
      if(to!==null)second=cstring(to);
      const status=operation==='remove'?services.osRemove(first):services.osRename(first,second);
      const errno=services.osErrno();return{status,errno,message:status===0?'':bytes(services.osErrorMessage(errno))};
    }finally{if(second)services.free(second);services.free(first);}},
  };
}
