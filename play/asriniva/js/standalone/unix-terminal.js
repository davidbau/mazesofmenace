// Original Unix terminal policies on shared storage and the configured SDK's
// virtual TTY. Device layout is the SDK syscall ABI, not the game's termios ABI.
import terminalAbi from '../services/native-terminal-abi.json' with {type:'json'};
import {createNativeTerminal} from '../services/native-terminal.js';
import * as unixtty from '../ported/unixtty.js';
import * as ioctl from '../ported/ioctl.js';
import {createUnixttyState,createUnixttyEnvironment} from '../ported/unixtty-runtime.js';
import {createIoctlEnvironment} from '../ported/ioctl-runtime.js';
import {VFSError} from '../services/c-vfs.js';
import platformAbi from './unix-platform-abi.json' with {type:'json'};
export function createTerminalDevices(environment,layouts){
 const {memory,filesystem,libc}=environment,at=environment.address;
 const error=name=>{const errno=platformAbi.errno[name];if(!Number.isInteger(errno))throw new Error('Unmeasured SDK terminal errno '+name);libc.errno=errno;return -1;};
 function tty(fd){fd=Number(fd);if(fd>=0&&fd<=2)return fd;try{filesystem.fstat(fd);}catch(e){if(!(e instanceof VFSError))throw e;libc.errno=e.errno;return -1;}return error('ENOTTY');}
 return {
  tcgetattr(fd,p){fd=tty(fd);if(fd<0)return -1;p=at(p);if(fd===2)return 0;memory.bounds(p,49);
   // libtty default_tty_ops + libsyscall TCGETS: c_line, padding and
   // speeds are not written. stderr's tty1 has no attribute callback.
   for(const [i,v]of [0x6500,5,0xbf,0x8a3b].entries())memory.view.setUint32(p+i*4,v,true);
   memory.HEAPU8.set([3,28,127,21,4,0,1,0,17,19,26,0,18,15,23,22,...Array(16).fill(0)],p+17);return 0;
  },
  tcsetattr(fd,action,p){action=Number(action);if(action<0||action>2)return error('EINVAL');return tty(fd)<0?-1:0;},
  ioctl(fd,request,p){fd=tty(fd);if(fd<0)return -1;request=Number(request);p=at(p);
   if(request!==0x5413&&request!==layouts.ioctl.TIOCGWINSZ)throw new Error('Unconnected terminal ioctl '+request);
   if(fd!==2){memory.bounds(p,4);memory.view.setUint16(p,24,true);memory.view.setUint16(p+2,80,true);}return 0;
  },
  cfgetospeed:p=>memory.view.getUint32(at(p)+8,true)&0x100f,
  fpathconf(fd,name){name=Number(name);const values=[8,255,255,255,4096,4096,1,1,0,1,-1,-1,-1,64,4096,4096,4096,4096,4096,255,1];if(name<0||name>=values.length)return BigInt(error('EINVAL'));return BigInt(values[name]);},
 };
}
export function enableUnixTerminal(environment,layouts){
 const {services,memory,ctypes,transport}=environment;
 const devices=createTerminalDevices(environment,layouts),nativeCall=createNativeTerminal();
 const wire={moduleKey:environment,heap:()=>memory.HEAPU8,stackSave:services.stackSave,stackRestore:services.stackRestore,stackAlloc:transport.stackAlloc,signal:services.signal,kill:(...args)=>environment.resolve('kill')(...args),invokeSignal:(handler,sig)=>environment.functions.indirect(handler,'vi',sig),...devices};
 const native=Object.fromEntries(['tcgetattr','tcsetattr','cfgetospeed','fpathconf','ioctl'].map(name=>[name,(...args)=>nativeCall(wire,name,...args)]));
 environment.register('terminal-devices',native);
 const initial=environment.allocateGlobal('inittyb',layouts.unixtty.termioSize),current=environment.allocateGlobal('curttyb',layouts.unixtty.termioSize),termio=environment.allocateGlobal('termio',layouts.ioctl.termioSize);
 const scalarNames=['ospeed','erase_char','kill_char','intr_char'],scalarTypes=['short','char','char','char'];
 const scalars=scalarNames.map((name,i)=>{try{return environment.requireGlobal(name);}catch(e){if(!e.message.startsWith('Unresolved standalone global '))throw e;return environment.allocateGlobal(name,i===0?2:1);}});
 const local=()=>new Proxy(Object.create(services),{get:(o,k,r)=>Reflect.has(o,k)?Reflect.get(o,k,r):typeof k==='string'?(...args)=>environment.resolve(k)(...args):undefined});
 const flags=['echo','cbreak','window_inited'];
 const u=local();Object.assign(u,{
  heap:()=>memory.HEAPU8,signedHeap:()=>memory.HEAP8,initial:()=>initial,current:()=>current,
  scalar:i=>ctypes.load(scalarTypes[i],scalars[i]),setScalar:(i,v)=>ctypes.store(scalarTypes[i],scalars[i],v),
  iflag:i=>ctypes.getField('struct instance_flags',environment.requireGlobal('iflags'),flags[i],'boolean'),setIflag:(i,v)=>ctypes.setField('struct instance_flags',environment.requireGlobal('iflags'),flags[i],'boolean',v),
  raw_print:line=>{const at=ctypes.locate('struct window_procs',environment.requireGlobal('windowprocs'),'win_raw_print').at;return environment.functions.indirect(memory.view.getBigUint64(at,true),'vp',typeof line==='string'?services.literal(line):environment.address(line));},
  wpId:()=>ctypes.getField('struct window_procs',environment.requireGlobal('windowprocs'),'wp_id','enum wp_ids'),
  ...native,
 });
 const state=createUnixttyState(),context=createUnixttyEnvironment(u,layouts.unixtty,state);Object.setPrototypeOf(context,u);environment.register('unixtty',unixtty,context);
 const nativeSignal=(sig,handler)=>nativeCall(wire,'signal',sig,handler);
 const i=local();Object.assign(i,{signal:nativeSignal,kill:(pid,sig)=>nativeCall(wire,'kill',pid,sig),heap:()=>memory.HEAPU8,signedHeap:()=>memory.HEAP8,termio:()=>termio,stdin:()=>services.stdin,
  shellers:()=>ctypes.getField('struct sysopt_s',environment.requireGlobal('sysopt'),'shellers','char *'),
  dimension:column=>ctypes.locate('struct instance_globals_t',environment.requireGlobal('gt'),'tc_gbl_data').at+ctypes.record('struct tc_gbl_data').fields[column?'tc_CO':'tc_LI'].offset,
  stackAlloc:n=>transport.stackAlloc(n),...native,
 });
 const ioContext=createIoctlEnvironment(i,layouts.ioctl);Object.setPrototypeOf(ioContext,i);environment.register('ioctl',ioctl,ioContext);
 // ncurses tgetent calls baudrate(), updating its shared short ospeed.
 // The existing capability provider supplies the entry; the configured virtual
 // device supplies the baud code, independently of native-layout conversions.
 const terminal=environment.start('termcap').environment,tgetent=terminal.tgetent;
 terminal.tgetent=(...args)=>{const result=tgetent(...args);if(result>=1)transport.scoped(()=>{const p=transport.stackAlloc(terminalAbi.wire.termioSize);if(devices.tcgetattr(1,p)===0)ctypes.store('short',scalars[0],devices.cfgetospeed(p));});return result;};
 return {state,context,ioContext,initial,current,termio,scalars,devices,wire,signal:nativeSignal};
}
