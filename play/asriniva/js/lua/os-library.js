/* Lua5.4.8 loslib.c: facilities retained by NetHack's configured DROPIF tables.
 * Lua notice: lua/lobject.js. Platform clock/calendar/strftime/files are
 * injected; no host import, process execution or compiled Lua algorithm. */
import {LuaTable,LuaError,toInteger,truth} from './lobject.js';
import {prepareLibrary} from './llib.js';
import {LuaBuffer} from './buffer.js';
import {luaAuxError,luaArgErrorFormat,luaTypeError,luaCheckInteger,luaCheckString,luaWithAuxTop,luaFormattedString,luaAuxTop} from './aux-error.js';
const fields=[['year',1900],['month',1],['day',0],['hour',0],['min',0],['sec',0],['yday',1],['wday',1]];
export function openLuaOS(vm,host,{publish=true,nativeRegistration=false}={}){
  const names=['clock','date','difftime','execute','exit','getenv','remove','rename','setlocale','time','tmpname'];
  const never=['execute','exit','getenv','setlocale','tmpname'];
  const lib=prepareLibrary(vm,names);
  try{
  const integer=(value,index)=>luaCheckInteger(vm,value,index);
  const string=(value,index)=>luaCheckString(vm,value,index);
  const add=(name,fn)=>{
    const invoke=args=>{try{return fn(...args.slice(0,3));}catch(error){
      if(error?.name==='TimezoneError')return luaAuxError(vm,'%s',error.message);
      throw error;
    }};
    const call=(...args)=>invoke(args);call.luaInvoke=invoke;lib.rawset(name,call);
  };
  const setFields=(table,values)=>{const put=(name,value)=>vm.heap.withStackTop(luaAuxTop(vm)+1,()=>{vm.heap.adopt(name);vm.set(table,name,value);});for(const[name,delta]of fields)put(name,BigInt(values[name])+BigInt(delta));if(values.isdst>=0)put('isdst',Boolean(values.isdst));};
  const getField=(table,name)=>vm.heap.withStackTop(luaAuxTop(vm),()=>{vm.heap.adopt(name);return vm.get(table,name);});
  add('clock',()=>[Number(host.clock())]);
  add('difftime',(a,b)=>[host.difftime(integer(a,1),integer(b,2))]);
  add('date',(format='%c',time=null)=>{
    format=string(format??'%c',1);time=time===null?host.now():integer(time,2);
    const utc=format[0]==='!';if(utc)format=format.slice(1);
    const date=host.date(time,utc);if(!date)return luaAuxError(vm,'date result cannot be represented in this installation');
    try{
      if(format.split('\0',1)[0]==='*t'){
        const table=new LuaTable(),release=vm.heap.addRoots(()=>table);
        try{return luaWithAuxTop(vm,1,()=>vm.heap.withStackTop(luaAuxTop(vm),()=>{table.resize(0,9);vm.heap.checkpoint();setFields(table,date.fields);return[table];}));}finally{release();}
      }
      const output=new LuaBuffer(vm);
      try{
      for(let at=0;at<format.length;){
        if(format[at]!=='%'){output.add(format[at++]);continue;}
        output.prepare(250);
        at++;let spec=format[at]??'';
        if(spec&&'aAbBcCdDeFgGhHIjmMnprRStTuUVwWxXyYzZ%'.includes(spec))at++;
        else if(['Ec','EC','Ex','EX','Ey','EY','Od','Oe','OH','OI','Om','OM','OS','Ou','OU','OV','Ow','OW','Oy'].includes(format.slice(at,at+2))){spec=format.slice(at,at+2);at+=2;}
        else luaWithAuxTop(vm,1,()=>luaArgErrorFormat(vm,1,"invalid conversion specifier '%%%s'",format.slice(at)));
        output.add(date.format('%'+spec));
      }
      return[output.finish()];
      }catch(error){output.close(error);throw error;}finally{output.close();}
    }finally{date.release?.();}
  });
  add('time',(table=null)=>{
    if(table===null){const time=host.now();if(time===-1n)return luaAuxError(vm,'time result cannot be represented in this installation');return[time];}
    if(!(table instanceof LuaTable))return luaTypeError(vm,1,'table',table);
    const metadata=vm.heap.frameMetadata(vm.currentThread),top=metadata?.kind==='C'?metadata.func+2:luaAuxTop(vm);
    // loslib.c discards ignored arguments with lua_settop(L, 1).
    vm.setHostStackTop(1);
    return luaWithAuxTop(vm,top-luaAuxTop(vm),()=>vm.heap.withStackTop(top,()=>{
    const values={wday:0,yday:0};
    for(const[name,delta]of fields.slice(0,6)){
      const value=getField(table,name),release=vm.heap.addRoots(()=>value);let n;
      try{n=toInteger(value);
      if(n===null){if(value!==null)return luaWithAuxTop(vm,1,()=>luaAuxError(vm,"field '%s' is not an integer",name));if(['year','month','day'].includes(name))return luaWithAuxTop(vm,1,()=>luaAuxError(vm,"field '%s' missing in date table",name));n=name==='hour'?12n:0n;}
      else{if(n>=0n?n-BigInt(delta)>2147483647n:n< -2147483648n+BigInt(delta))return luaWithAuxTop(vm,1,()=>luaAuxError(vm,"field '%s' is out-of-bound",name));n-=BigInt(delta);}
      values[name]=Number(n);
      }finally{release();}
    }
    const dst=getField(table,'isdst');values.isdst=dst===null?-1:Number(truth(dst));
    const result=host.makeTime(values);setFields(table,result.fields);
    if(result.time===-1n)return luaAuxError(vm,'time result cannot be represented in this installation');return[result.time];
    }));
  });
  const fileResult=(operation,from,to)=>{
    from=string(from,1).split('\0',1)[0];to=operation==='rename'?string(to,2).split('\0',1)[0]:null;
    const result=host.file(operation,from,to);
    return result.status===0?[true]:[null,luaFormattedString(vm,operation==='remove'?'%s: %s':'%s',operation==='remove'?[from,result.message]:[result.message],{extra:1}),BigInt(result.errno)];
  };
  add('remove',name=>fileResult('remove',name));
  add('rename',(from,to)=>fileResult('rename',from,to));
  // These native registration slots are always removed by NetHack's NEVER
  // filter before any configured script runs. They are not host services.
  for(const name of never)lib.rawset(name,()=>{throw new LuaError(`os.${name} is unavailable in the configured NetHack sandbox`);});
  const table=lib.finish();
  if(!nativeRegistration)for(const name of never)table.rawset(name,null);
  if(publish)vm.setGlobal('os',table);return table;
  }finally{lib.release();}
}
