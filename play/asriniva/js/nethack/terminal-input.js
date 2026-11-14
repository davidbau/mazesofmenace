import {nativeStateFor} from './native/state-bridge.js';
// Original GETLINE input/editing/prompt policies on shared tty and game state.
import abi from './terminal-input-abi.json' with {type:'json'};
import publicFunctions from './public-functions.json' with {type:'json'};
import * as getline from '../ported/getline.js';
import {createGetlineState,createGetlineEnvironment} from './bindings/getline.js';
import {withCEnvironment} from '../c-runtime/context.js';

export function enableTerminalInput(environment,layouts,{readKey}={}){
 const {services,memory,ctypes,functions,transport}=environment;
 const address=environment.address,text=value=>typeof value==='string'?services.literal(value):address(value);
 const resolve=name=>typeof services[name]==='function'?services[name]:environment.resolve(name);
 if(!environment.hasFunction('teleport_getch')){const owner=nativeStateFor(environment),read=()=>transport.int(readKey?readKey():services.getchar());read.nativeState=owner;read.nativeDirect=true;read.nativePrepared=true;owner.functions.set('teleport_getch',read);environment.register('terminal-key-input',{teleport_getch:read});}
 const local=new Proxy(Object.create(services),{get:(o,key,receiver)=>Reflect.has(o,key)?Reflect.get(o,key,receiver):typeof key==='string'?(...args)=>environment.resolve(key)(...args.map(value=>value?.address??value)):undefined});
 const scalarCells=abi.scalars.map(name=>{try{return environment.requireGlobal(name);}catch(error){if(name!=='morc'||!error.message.startsWith('Unresolved standalone global '))throw error;return environment.allocateGlobal(name,1);}});
 const scalar=index=>{if(scalarCells[index]===undefined)throw new Error('Unknown GETLINE scalar '+index);return scalarCells[index];};
 Object.assign(local,{
  heap:()=>memory.HEAPU8,rectState:undefined,trackState:undefined,
  global:index=>{const name=abi.globals[index];if(!name)throw new Error('Unknown GETLINE global '+index);return environment.requireGlobal(name);},
  scalar:index=>ctypes.load('char',scalar(index)),setScalar:(index,value)=>ctypes.store('char',scalar(index),transport.char(value)),
  windowMessage:()=>ctypes.load('int',environment.requireGlobal('WIN_MESSAGE')),
  stdout:()=>services.stdout,fflush:stream=>services.fflush(address(stream)),
  custompline:(flags,format,query)=>resolve('custompline')(transport.uint(flags),text(format),text(query)),
  pline:(format,prefix,command)=>resolve('pline')(text(format),text(prefix),text(command)),
  strcpy:(destination,source)=>address(services.strcpy(address(destination),text(source))),
  Strcpy:(destination,source)=>address(services.strcpy(address(destination),text(source))),
  strcat:(destination,source)=>address(services.strcat(address(destination),text(source))),
  Strcat:(destination,source)=>address(services.strcat(address(destination),text(source))),
  eos:value=>address(resolve('eos')(address(value))),
  strchr:(value,character)=>address(services.strchr(text(value),transport.int(character))),
  extcmds_match:(base,flags,matches)=>resolve('extcmds_match')(text(base),transport.int(flags),address(matches)),
  extcmds_getentry:index=>address(resolve('extcmds_getentry')(transport.int(index))),
  mungspaces:value=>address(resolve('mungspaces')(address(value))),
  visctrl:value=>address(resolve('visctrl')(transport.char(value))),
 });
 for(const name of ['more','pgetchar','tty_doprev_message','tty_nhbell','tty_nhgetch','extcmd_via_menu','extcmd_initiator'])local[name]=()=>resolve(name)();
 local.term_curs_set=value=>resolve('term_curs_set')(transport.int(value));
 local.tty_clear_nhwindow=win=>resolve('tty_clear_nhwindow')(transport.int(win));
 for(const name of ['addtopl','putsyms','dumplogmsg'])local[name]=value=>resolve(name)(text(value));
 local.clear_nhwindow=win=>{
  if(environment.nativeWindowCallbacks)return environment.nativeWindowCallbacks.invoke('win_clear_nhwindow','vi',transport.int(win));
  const field=ctypes.record('struct window_procs').fields.win_clear_nhwindow;
  const callback=memory.view.getBigUint64(environment.requireGlobal('windowprocs')+field.offset,true);
  return functions.indirect(callback,'vi',transport.int(win));
 };
 const state=createGetlineState(),context=createGetlineEnvironment(local,layouts.getline,state);
 // The unchanged factory spreads concrete services; keep missing function
 // dispatch lazy through the prototype, as the Unix tty provider does.
 Object.setPrototypeOf(context,local);
 const names=Object.keys(getline).filter(name=>typeof getline[name]==='function'&&Object.hasOwn(publicFunctions.functions,name)&&!environment.hasFunction(name));
 const prepareArgs=(name,args)=>{if(name==='tty_getlin'){args[0]=text(args[0]);args[1]=address(args[1]);}else if(name==='xwaitforspace')args[0]=text(args[0]);return args;};
 environment.register('terminal-input',Object.fromEntries(names.map(name=>[name,getline[name]])),context,{prepareArgs});
 return {state,context,services:local,scalars:scalarCells,call:(name,...args)=>transport.scoped(()=>withCEnvironment(context,getline[name],...prepareArgs(name,args))),limitation:'GETLINE shared tty/scalar transport connected; real input, editing/completion and interruption paths require original-C verification.'};
}
