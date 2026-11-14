// Original TOPL message/history policies on shared tty windows and source state.
import abi from './terminal-messages-abi.json' with {type:'json'};
import publicFunctions from './public-functions.json' with {type:'json'};
import * as topl from '../ported/topl.js';
import {callTopl} from './bindings/topl.js';

export function enableTerminalMessages(environment,layouts){
 const {services,memory,ctypes,functions,transport}=environment,L=layouts.topl;
 const address=environment.address,text=value=>typeof value==='string'?services.literal(value):address(value);
 const resolve=name=>typeof services[name]==='function'?services[name]:environment.resolve(name);
 const local=new Proxy(Object.create(services),{get:(o,key,receiver)=>Reflect.has(o,key)?Reflect.get(o,key,receiver):typeof key==='string'?(...args)=>environment.resolve(key)(...args.map(value=>value?.address??value)):undefined});
 for(const name of Object.keys(abi.globals))Object.defineProperty(local,name,{value:undefined,writable:true,configurable:true});
 const globals=Object.keys(abi.globals),persistent=abi.persistent.map(row=>environment.allocateGlobal('topl.'+row.name,ctypes.size(row.type)));
 Object.assign(local,{
  moduleKey:environment,heap:()=>memory.HEAPU8,literal:services.literal,
  global:index=>{if(!globals[index])throw new Error('Unknown TOPL global '+index);return environment.requireGlobal(globals[index]);},
  persistent:index=>{if(persistent[index]===undefined)throw new Error('Unknown TOPL persistent cell '+index);return persistent[index];},
  bit:kind=>{throw new Error('Unknown TOPL packed field '+kind);},setBit:kind=>{throw new Error('Unknown TOPL packed field '+kind);},callback:name=>{throw new Error('Unknown TOPL callback '+name);},
  alloc:size=>environment.alloc('alloc',transport.uint(size)),free:p=>services.free(address(p)),
  Strcpy:(destination,source)=>address(services.strcpy(text(destination),text(source))),
  Strcat:(destination,source)=>address(services.strcat(text(destination),text(source))),
  strlen:value=>transport.ulong(services.strlen(text(value))),
  strchr:(value,character)=>address(services.strchr(text(value),transport.int(character))),
  strcmp:(a,b)=>services.strcmp(text(a),text(b)),
  strncmp:(a,b,count)=>services.strncmp(text(a),text(b),transport.ulong(count)),
  strncpy:(a,b,count)=>address(services.strncpy(text(a),text(b),transport.ulong(count))),
  eos:value=>address(resolve('eos')(text(value))),
  digit:value=>resolve('digit')(transport.char(value)),lowc:value=>resolve('lowc')(transport.char(value)),
  key2txt:(key,out)=>address(resolve('key2txt')(transport.uchar(key),text(out))),
  nhassert_failed:(expression,file,line)=>resolve('nhassert_failed')(text(expression),text(file),transport.int(line)),
  Sprintf:(out,format,...args)=>services.sprintf(text(out),text(format),...args.map(value=>typeof value==='string'?text(value):value?.address??value)),
  panic:format=>resolve('panic')(text(format)),
  custompline:(flags,format,value)=>resolve('custompline')(transport.uint(flags),text(format),text(value)),
 });
 for(const name of ['backsp','cl_end','end_glyphout','home','readchar','standoutbeg','standoutend','tty_nhbell'])local[name]=()=>resolve(name)();
 for(const name of ['g_putch','nomux_putch','putchar'])local[name]=value=>resolve(name)(transport.int(value));
 local.docorner=(a,b,c)=>resolve('docorner')(transport.int(a),transport.int(b),transport.int(c));
 local.dumplogmsg=value=>resolve('dumplogmsg')(text(value));
 local.tty_clear_nhwindow=win=>resolve('tty_clear_nhwindow')(transport.int(win));
 local.tty_curs=(win,x,y)=>resolve('tty_curs')(transport.int(win),transport.int(x),transport.int(y));
 local.xwaitforspace=value=>resolve('xwaitforspace')(text(value));
 const window=(field,signature,...args)=>{
  if(environment.nativeWindowCallbacks)return environment.nativeWindowCallbacks.invoke(field,signature,...args);
  const entry=ctypes.record('struct window_procs').fields[field];if(!entry)throw new Error('Unknown TOPL window callback '+field);
  const callback=memory.view.getBigUint64(environment.requireGlobal('windowprocs')+entry.offset,true);
  return functions.indirect(callback,signature,...args);
 };
 Object.assign(local,{
  create_nhwindow:type=>window('win_create_nhwindow','ii',transport.int(type)),
  putstr:(win,attr,value)=>window('win_putstr','viip',transport.int(win),transport.int(attr),text(value)),
  display_nhwindow:(win,block)=>window('win_display_nhwindow','vii',transport.int(win),transport.char(block)),
  destroy_nhwindow:win=>window('win_destroy_nhwindow','vi',transport.int(win)),
 });
 const names=Object.keys(topl).filter(name=>typeof topl[name]==='function'&&Object.hasOwn(publicFunctions.functions,name)&&!environment.hasFunction(name));
 const call=(name,...args)=>callTopl(local,L,name,...args.map(value=>typeof value==='string'?text(value):value?.address??value));
 environment.register('terminal-messages',Object.fromEntries(names.map(name=>[name,(...args)=>call(name,...args)])));
 return {services:local,persistent,call:(name,...args)=>transport.scoped(()=>call(name,...args)),limitation:'TOPL shared history/window transport connected; history restoration, prompts and original-C output/input equivalence require verification.'};
}
