/* Lua5.4 liolib-style regular files and standard streams on injected stdio.
 * No host I/O or process access. Lua notice: lobject.js. */
import {LuaTable,LuaUserdata,numberToString,isLuaString,luaStringBytes} from './lobject.js';
import {luaAuxError,luaTypeError,luaArgErrorFormat,luaCheckString,luaCheckInteger} from './aux-error.js';
export function openLuaIO(state,host){
 const vm=state.vm,files=new WeakMap(),methods=new LuaTable(),meta=new LuaTable([['__name','FILE*'],['__index',methods]]),lib=new LuaTable();
 state.registry.rawset('FILE*',meta);
 const add=(table,name,fn)=>{const call=(...args)=>fn(args);call.luaInvoke=fn;table.rawset(name,call);};
 const file=(value,arg=1,closed=false)=>{if(!(value instanceof LuaUserdata)||value.metatable!==meta)return luaTypeError(vm,arg,'FILE*',value);const record=files.get(value);if(!closed&&!record.pointer)return luaAuxError(vm,'attempt to use a closed file');return record;};
 const result=(success,path)=>success?[true]:[null,(path?path+': ':'')+host.error(),BigInt(host.errno())];
 const create=(pointer,standard=false)=>{state.lua_newuserdatauv(16,0);const value=state.popOne();value.metatable=meta;files.set(value,{pointer,standard});host.store(value.value.pointer,pointer);return value;};
 const close=(value,garbage=false)=>{const record=file(value,1,true);if(!record.pointer)return garbage?[]:luaAuxError(vm,'attempt to use a closed file');if(record.standard)return garbage?[]:[null,'cannot close standard file'];const pointer=record.pointer;record.pointer=0;host.store(value.value.pointer,0);return result(host.close(pointer)===0);};
 const write=(value,args,start)=>{const record=file(value);for(let i=start;i<args.length;i++){let bytes;if(typeof args[i]==='number'||typeof args[i]==='bigint')bytes=numberToString(args[i]);else bytes=luaCheckString(vm,args[i],i+1);if(!host.write(record.pointer,bytes))return result(false);}return[value];};
 const read=(value,formats)=>{const record=file(value),values=[];if(!formats.length)formats=['l'];host.clearerr(record.pointer);for(let format of formats){let output='';if(typeof format==='number'||typeof format==='bigint'){const count=luaCheckInteger(vm,format,1);if(count<0n)return luaArgErrorFormat(vm,1,'invalid format');if(!count){const ch=host.get(record.pointer);if(ch>=0)host.unget(record.pointer,ch);values.push(ch<0?null:'');continue;}for(let i=0n;i<count;i++){const ch=host.get(record.pointer);if(ch<0)break;output+=String.fromCharCode(ch);}values.push(output||null);}
 else {format=luaCheckString(vm,format,1).replace(/^\*/,'');if(format==='n'){let token='',ch;do{ch=host.get(record.pointer);}while(ch>=0&&/\s/.test(String.fromCharCode(ch)));while(ch>=0&&/[\da-fA-FxXpPeE+.-]/.test(String.fromCharCode(ch))){token+=String.fromCharCode(ch);ch=host.get(record.pointer);}if(ch>=0)host.unget(record.pointer,ch);const number=Number(token);values.push(token&&!Number.isNaN(number)?number:null);}
 else if(['a','l','L'].includes(format)){for(;;){const ch=host.get(record.pointer);if(ch<0)break;if(ch===10&&format!=='a'){if(format==='L')output+='\n';break;}output+=String.fromCharCode(ch);}values.push(format==='a'?output:output||(!host.eof(record.pointer)?'':null));}
 else return luaArgErrorFormat(vm,1,'invalid format');}
 if(values.at(-1)===null)break;}return host.failed(record.pointer)?result(false):values;};
 const standards=[host.stdin,host.stdout,host.stderr].map(pointer=>create(pointer,true));let input=standards[0],output=standards[1];
 const open=(path,mode='r')=>{path=luaCheckString(vm,path,1);mode=luaCheckString(vm,mode,2);if(!/^[rwa]\+?b?$/.test(mode))return luaArgErrorFormat(vm,2,'invalid mode');const pointer=host.open(path,mode);return pointer?[create(pointer)]:[null,path+': '+host.error(),BigInt(host.errno())];};
 const lines=(value,formats,owned=false)=>{let finished=false;const iterator=()=>{if(finished)return[null];const values=read(value,formats);if(values[0]===null){finished=true;if(owned)close(value);return[null];}return values;};iterator.luaInvoke=()=>iterator();return iterator;};
 add(methods,'close',a=>close(a[0]));add(methods,'flush',a=>result(host.flush(file(a[0]).pointer)===0));add(methods,'write',a=>write(a[0],a,1));add(methods,'read',a=>read(a[0],a.slice(1)));
 add(methods,'lines',a=>[lines(a[0],a.slice(1))]);
 add(methods,'seek',a=>{const modes=['set','cur','end'],mode=a[1]===undefined?'cur':luaCheckString(vm,a[1],2),index=modes.indexOf(mode);if(index<0)return luaArgErrorFormat(vm,2,"invalid option '%s'",mode);const offset=a[2]===undefined?0n:luaCheckInteger(vm,a[2],3),pointer=file(a[0]).pointer;return host.seek(pointer,offset,index)===0?[host.tell(pointer)]:result(false);});
 add(methods,'setvbuf',a=>{const modes=['full','line','no'],mode=luaCheckString(vm,a[1],2),index=modes.indexOf(mode);if(index<0)return luaArgErrorFormat(vm,2,"invalid option '%s'",mode);return result(host.setvbuf(file(a[0]).pointer,index,a[2]===undefined?8192:luaCheckInteger(vm,a[2],3))===0);});
 add(meta,'__gc',a=>close(a[0],true));add(meta,'__close',a=>close(a[0]));add(meta,'__tostring',a=>{const record=file(a[0],1,true);return[record.pointer?'file (0x'+BigInt(record.pointer).toString(16)+')':'file (closed)'];});
 add(lib,'open',a=>open(...a));add(lib,'tmpfile',()=>{const pointer=host.tmpfile();return pointer?[create(pointer)]:result(false);});add(lib,'close',a=>close(a[0]??output));add(lib,'flush',()=>result(host.flush(file(output).pointer)===0));add(lib,'write',a=>write(output,a,0));add(lib,'read',a=>read(input,a));
 for(const name of ['input','output'])add(lib,name,a=>{if(a[0]!==undefined&&a[0]!==null){let value=a[0];if(isLuaString(value)){const opened=open(luaStringBytes(value),name==='input'?'r':'w');if(opened[0]===null)return luaAuxError(vm,'%s',opened[1]);value=opened[0];}file(value);if(name==='input')input=value;else output=value;}return[name==='input'?input:output];});
 add(lib,'lines',a=>{if(a[0]===undefined||a[0]===null)return[lines(input,a.slice(1))];const opened=open(a[0]);if(opened[0]===null)return luaAuxError(vm,'%s',opened[1]);const value=opened[0];return[lines(value,a.slice(1),true),null,null,value];});
 add(lib,'type',a=>{if(!(a[0] instanceof LuaUserdata)||a[0].metatable!==meta)return[null];return[files.get(a[0]).pointer?'file':'closed file'];});
 add(lib,'popen',()=>luaAuxError(vm,"'popen' not supported"));
 ['stdin','stdout','stderr'].forEach((name,i)=>lib.rawset(name,standards[i]));return lib;
}
