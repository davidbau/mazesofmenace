/* Lua5.4.8 loslib.c: facilities retained by NetHack's configured DROPIF tables.
 * Lua notice: lua/lobject.js. Platform clock/calendar/strftime/files are
 * injected; no host import, process execution or compiled Lua algorithm. */
import {LuaTable,LuaError,isLuaString,luaStringBytes,luaType,numberToString,toInteger,truth} from './lua/lobject.js';
const fields=[['year',1900],['month',1],['day',0],['hour',0],['min',0],['sec',0],['yday',1],['wday',1]];
function integer(value){const n=toInteger(value);if(n===null)throw new LuaError('integer expected');return n;}
function string(value){if(isLuaString(value))return luaStringBytes(value);if(luaType(value)==='number')return numberToString(value);throw new LuaError('string expected');}
export function openLuaOS(vm,host){
  const lib=new LuaTable();
  const setFields=(table,values)=>{for(const[name,delta]of fields)vm.set(table,name,BigInt(values[name])+BigInt(delta));if(values.isdst>=0)vm.set(table,'isdst',Boolean(values.isdst));};
  lib.rawset('clock',()=>[Number(host.clock())]);
  lib.rawset('difftime',(a,b)=>[host.difftime(integer(a),integer(b))]);
  lib.rawset('date',(format='%c',time=null)=>{
    format=string(format??'%c');time=time===null?host.now():integer(time);
    const utc=format[0]==='!';if(utc)format=format.slice(1);
    const date=host.date(time,utc);if(!date)throw new LuaError('date result cannot be represented in this installation');
    try{
      if(format.split('\0',1)[0]==='*t'){const table=new LuaTable();setFields(table,date.fields);return[table];}
      let output='';
      for(let at=0;at<format.length;){
        if(format[at]!=='%'){output+=format[at++];continue;}
        at++;let spec=format[at]??'';
        if(spec&&'aAbBcCdDeFgGhHIjmMnprRStTuUVwWxXyYzZ%'.includes(spec))at++;
        else if(['Ec','EC','Ex','EX','Ey','EY','Od','Oe','OH','OI','Om','OM','OS','Ou','OU','OV','Ow','OW','Oy'].includes(format.slice(at,at+2))){spec=format.slice(at,at+2);at+=2;}
        else throw new LuaError(`invalid conversion specifier '%${format.slice(at).split('\0',1)[0]}'`);
        output+=date.format('%'+spec);
        if(output.length>10000000)throw new LuaError('resulting string too large');
      }
      return[output];
    }finally{date.release?.();}
  });
  lib.rawset('time',(table=null)=>{
    if(table===null){const time=host.now();if(time===-1n)throw new LuaError('time result cannot be represented in this installation');return[time];}
    if(!(table instanceof LuaTable))throw new LuaError('table expected');
    const values={wday:0,yday:0};
    for(const[name,delta]of fields.slice(0,6)){
      const value=vm.get(table,name);let n=toInteger(value);
      if(n===null){if(value!==null)throw new LuaError(`field '${name}' is not an integer`);if(['year','month','day'].includes(name))throw new LuaError(`field '${name}' missing in date table`);n=name==='hour'?12n:0n;}
      else{if(n>=0n?n-BigInt(delta)>2147483647n:n< -2147483648n+BigInt(delta))throw new LuaError(`field '${name}' is out-of-bound`);n-=BigInt(delta);}
      values[name]=Number(n);
    }
    const dst=vm.get(table,'isdst');values.isdst=dst===null?-1:Number(truth(dst));
    const result=host.makeTime(values);setFields(table,result.fields);
    if(result.time===-1n)throw new LuaError('time result cannot be represented in this installation');return[result.time];
  });
  const fileResult=(operation,from,to=null)=>{
    from=string(from).split('\0',1)[0];if(to!==null)to=string(to).split('\0',1)[0];
    const result=host.file(operation,from,to);
    return result.status===0?[true]:[null,(operation==='remove'?from+': ':'')+result.message,BigInt(result.errno)];
  };
  lib.rawset('remove',name=>fileResult('remove',name));
  lib.rawset('rename',(from,to)=>fileResult('rename',from,to));
  vm.setGlobal('os',lib);return lib;
}
